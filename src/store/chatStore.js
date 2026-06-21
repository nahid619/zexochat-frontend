// PATH: frontend/src/store/chatStore.js
import { create } from 'zustand';
import client from '../api/client';
import { ANONYMOUS_MODEL_ID, TOKEN_STORAGE_KEY } from '../constants';

const DARK_BG_DEFAULT  = { bg: '#07111C', bgs: '#0B1A28', bge: '#0F2234', bgh: '#152E46', bd: '#1D3C58' };
const LIGHT_BG_DEFAULT = { bg: '#F7F8FA', bgs: '#FFFFFF', bge: '#FFFFFF', bgh: '#EFEFEF', bd: '#E0E0E0' };

const DEFAULT_IDENTIFIED_MODEL = 'gemini-3-flash-preview';

// ─── DOM helpers (module-level, no Zustand dependency) ───────────────────────

function applyBgVars(vars) {
  const root = document.documentElement;
  root.style.setProperty('--bg',  vars.bg);
  root.style.setProperty('--bgs', vars.bgs);
  root.style.setProperty('--bge', vars.bge);
  root.style.setProperty('--bgh', vars.bgh);
  root.style.setProperty('--bd',  vars.bd);
}

// Reads the current --bg* values back from the live DOM so we always
// persist what's actually rendered, not a stale snapshot from state.
function readBgVars() {
  const s = document.documentElement.style;
  return {
    bg:  s.getPropertyValue('--bg')  || DARK_BG_DEFAULT.bg,
    bgs: s.getPropertyValue('--bgs') || DARK_BG_DEFAULT.bgs,
    bge: s.getPropertyValue('--bge') || DARK_BG_DEFAULT.bge,
    bgh: s.getPropertyValue('--bgh') || DARK_BG_DEFAULT.bgh,
    bd:  s.getPropertyValue('--bd')  || DARK_BG_DEFAULT.bd,
  };
}

// Applies a full saved appearance object to the DOM without touching
// Zustand state — used during session restore so state + DOM stay in sync.
function applyAppearanceToDom(appearance) {
  if (!appearance) return;
  const { theme, bgVars, accentColor } = appearance;

  if (theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }
  if (bgVars) {
    applyBgVars(bgVars);
  }
  if (accentColor) {
    const { ac, ach, r, g, b } = accentColor;
    const root = document.documentElement;
    const lin  = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const L    = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    root.style.setProperty('--ac',      ac);
    root.style.setProperty('--ach',     ach);
    root.style.setProperty('--ac-text', L > 0.28 ? '#0A1420' : '#FFFFFF');
    root.style.setProperty('--acm',     `rgba(${r},${g},${b},.11)`);
    root.style.setProperty('--acb',     `rgba(${r},${g},${b},.24)`);
  }
}

// ─── Debounced appearance save ────────────────────────────────────────────────
let _appearanceSaveTimer = null;

// ─── Store ────────────────────────────────────────────────────────────────────
const useChatStore = create((set, get) => ({
  // --- Auth / identity
  user:      null,
  authReady: false,
  authError: null,

  // --- Core chat state
  conversations:       [],
  activeConversationId: null,
  messages:            [],
  selectedModel:       ANONYMOUS_MODEL_ID,
  isLoading:           false,
  searchEnabled:       true,
  error:               null,
  toast:               null,

  // --- View
  view: 'home',

  // --- Models
  models:       [],
  modelsLoaded: false,

  // --- Token estimate
  tokensToday: 0,

  // --- Sidebar search
  convSearchQuery: '',

  // --- UI / appearance state
  sidebarOpen:   true,
  theme:         'dark',
  appearanceOpen: false,
  bgPaletteId:   'bgOceanic',
  accentColor: {
    ac: '#00C9A7', ach: '#1DDBB9',
    r: 0, g: 201, b: 167,
    acText: '#07111C'
  },

  // --- UI actions
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

  // ── Appearance ──────────────────────────────────────────────────────────────

  // Persists the current appearance to the server (debounced, 800 ms).
  // No-op for guests — they have no user record to write to.
  saveAppearance: () => {
    if (!get().user) return;
    clearTimeout(_appearanceSaveTimer);
    _appearanceSaveTimer = setTimeout(async () => {
      const { theme, bgPaletteId, accentColor } = get();
      const appearance = {
        theme,
        bgPaletteId,
        bgVars:      readBgVars(),   // live values from DOM
        accentColor,
      };
      try {
        await client.patch('/api/auth/appearance', { appearance });
      } catch (err) {
        // Silent — a missed appearance save should never interrupt the user.
        console.warn('[appearance] Save failed:', err.message);
      }
    }, 800);
  },

  setTheme: (mode) => {
    document.documentElement.setAttribute('data-theme', mode);
    const defaults = mode === 'dark' ? DARK_BG_DEFAULT : LIGHT_BG_DEFAULT;
    applyBgVars(defaults);
    set({ theme: mode, bgPaletteId: mode === 'dark' ? 'bgOceanic' : 'bgClean' });
    get().saveAppearance();
  },

  cycleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setBgPalette: (paletteId, vars, themeMode) => {
    applyBgVars(vars);
    if (themeMode) {
      document.documentElement.setAttribute('data-theme', themeMode);
      set({ bgPaletteId: paletteId, theme: themeMode });
    } else {
      set({ bgPaletteId: paletteId });
    }
    get().saveAppearance();
  },

  toggleAppearance: () => set(state => ({ appearanceOpen: !state.appearanceOpen })),

  setAccentColor: (ac, ach, r, g, b) => {
    const root = document.documentElement;
    const lin  = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const L    = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const acText = L > 0.28 ? '#0A1420' : '#FFFFFF';

    root.style.setProperty('--ac',      ac);
    root.style.setProperty('--ach',     ach);
    root.style.setProperty('--ac-text', acText);
    root.style.setProperty('--acm',     `rgba(${r},${g},${b},.11)`);
    root.style.setProperty('--acb',     `rgba(${r},${g},${b},.24)`);
    set({ accentColor: { ac, ach, r, g, b, acText } });
    get().saveAppearance();
  },

  setCustomAccentColor: (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lighten = (c) => Math.min(255, Math.round(c + (255 - c) * 0.15)).toString(16).padStart(2, '0');
    const ach = `#${lighten(r)}${lighten(g)}${lighten(b)}`;
    get().setAccentColor(hex, ach, r, g, b);
  },

  // ── Toast ───────────────────────────────────────────────────────────────────
  setToast: (toast) => {
    set({ toast });
    setTimeout(() => {
      const current = get().toast;
      if (current && current.text === toast.text) set({ toast: null });
    }, 4000);
  },
  clearToast: () => set({ toast: null }),

  // ── Model ───────────────────────────────────────────────────────────────────
  setSelectedModel: (selectedModel) => set({ selectedModel }),

  fetchModels: async () => {
    try {
      const res = await client.get('/api/models');
      if (Array.isArray(res.data) && res.data.length > 0) {
        const sorted = [...res.data].sort((a, b) => b.score - a.score);
        set({ models: sorted, modelsLoaded: true });
      }
    } catch (err) {
      console.warn('Failed to load models list from server:', err.message);
      set({ modelsLoaded: true });
    }
  },

  // ── Search ──────────────────────────────────────────────────────────────────
  toggleSearch: () => set(state => ({ searchEnabled: !state.searchEnabled })),

  // ── Sidebar search ──────────────────────────────────────────────────────────
  setConvSearchQuery: (convSearchQuery) => set({ convSearchQuery }),

  // ── Navigation ──────────────────────────────────────────────────────────────
  goHome: () => set({ activeConversationId: null, messages: [], view: 'home' }),

  // ── Auth ────────────────────────────────────────────────────────────────────

  // Validates a stored token on boot and restores appearance.
  // Always resolves so App.jsx can safely await it.
  restoreSession: async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      set({ authReady: true });
      return;
    }
    try {
      const res  = await client.get('/api/auth/me');
      const user = res.data.user;

      // Re-apply the user's saved appearance before React renders anything,
      // so there's no flash of the default theme.
      if (user.appearance && Object.keys(user.appearance).length > 0) {
        applyAppearanceToDom(user.appearance);
        set({
          user,
          authReady:     true,
          selectedModel: DEFAULT_IDENTIFIED_MODEL,
          theme:         user.appearance.theme       || 'dark',
          bgPaletteId:   user.appearance.bgPaletteId || 'bgOceanic',
          accentColor:   user.appearance.accentColor || get().accentColor,
        });
      } else {
        set({ user, authReady: true, selectedModel: DEFAULT_IDENTIFIED_MODEL });
      }
    } catch (err) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      set({ user: null, authReady: true });
    }
  },

  login: async (code) => {
    set({ authError: null });
    try {
      const res          = await client.post('/api/auth/login', { code });
      const { token, user } = res.data;
      localStorage.setItem(TOKEN_STORAGE_KEY, token);

      // Apply the user's saved appearance immediately on login.
      if (user.appearance && Object.keys(user.appearance).length > 0) {
        applyAppearanceToDom(user.appearance);
      }

      set({
        user,
        authError:            null,
        selectedModel:        DEFAULT_IDENTIFIED_MODEL,
        activeConversationId: null,
        messages:             [],
        view:                 'home',
        // Sync appearance state so the panel reflects the restored values.
        ...(user.appearance && Object.keys(user.appearance).length > 0 ? {
          theme:       user.appearance.theme       || 'dark',
          bgPaletteId: user.appearance.bgPaletteId || 'bgOceanic',
          accentColor: user.appearance.accentColor || get().accentColor,
        } : {})
      });

      await get().fetchConversations();
      return true;
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.';
      set({ authError: msg });
      return false;
    }
  },

  logout: async () => {
    try {
      await client.post('/api/auth/logout');
    } catch (err) {
      console.warn('Logout request failed (clearing local session anyway):', err.message);
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    set({
      user:                 null,
      conversations:        [],
      activeConversationId: null,
      messages:             [],
      view:                 'home',
      selectedModel:        ANONYMOUS_MODEL_ID,
    });
  },

  // ── Conversation API ─────────────────────────────────────────────────────────
  fetchConversations: async () => {
    try {
      const res = await client.get('/api/history');
      set({ conversations: res.data, error: null });
      return res.data;
    } catch (err) {
      console.error('Fetch conversations failed:', err);
      set({ error: 'Failed to load chat history.' });
    }
  },

  selectConversation: async (id) => {
    if (!id) {
      set({ activeConversationId: null, messages: [], view: 'home' });
      return;
    }
    set({ activeConversationId: id, isLoading: false, error: null, view: 'chat' });
    try {
      const res = await client.get(`/api/history/${id}`);
      set({ messages: res.data });
      const conv = get().conversations.find(c => (c._id || c.id) === id);
      if (conv?.model) set({ selectedModel: conv.model });
    } catch (err) {
      console.error('Fetch messages failed:', err);
      set({ error: 'Failed to load messages.' });
    }
  },

  createConversation: async (title = 'New Chat', preferredModel = null) => {
    const model = preferredModel || get().selectedModel;
    try {
      const res    = await client.post('/api/history/new', { title, model });
      const newConv = res.data;
      set(state => ({
        conversations:        [newConv, ...state.conversations],
        activeConversationId: newConv._id || newConv.id,
        messages:             [],
        view:                 'chat',
        error:                null,
      }));
      return newConv;
    } catch (err) {
      console.error('Create conversation failed:', err);
      set({ error: 'Failed to create a new chat.' });
    }
  },

  deleteConversation: async (id) => {
    try {
      await client.delete(`/api/history/${id}`);
      set(state => {
        const remaining  = state.conversations.filter(c => (c._id || c.id) !== id);
        const wasActive  = state.activeConversationId === id;
        const newActiveId = wasActive
          ? (remaining[0]?._id || remaining[0]?.id || null)
          : state.activeConversationId;
        return {
          conversations:        remaining,
          activeConversationId: newActiveId,
          messages:             wasActive ? [] : state.messages,
          view:                 wasActive && !newActiveId ? 'home' : state.view,
        };
      });
      const newActiveId = get().activeConversationId;
      if (newActiveId) get().selectConversation(newActiveId);
    } catch (err) {
      console.error('Delete conversation failed:', err);
      set({ error: 'Failed to delete conversation.' });
    }
  },

  // ── Send message ─────────────────────────────────────────────────────────────
  sendMessage: async (content) => {
    if (!content || content.trim().length === 0) return;
    const { user, searchEnabled: search } = get();
    const model = get().selectedModel;

    set({ isLoading: true, error: null, view: 'chat' });

    const tempUserMsg = {
      _id:       'temp_user_' + Date.now(),
      role:      'user',
      content,
      createdAt: new Date(),
    };

    // ── ANONYMOUS PATH ────────────────────────────────────────────────────────
    if (!user) {
      if (!get().activeConversationId) {
        set({ activeConversationId: 'anonymous-session', messages: [] });
      }
      set(state => ({ messages: [...state.messages, tempUserMsg] }));

      try {
        const priorHistory = get().messages
          .filter(m => m._id !== tempUserMsg._id)
          .map(m => ({ role: m.role, content: m.content }));

        const tz  = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const ldt = new Date().toLocaleString('en-US', {
          timeZone: tz, weekday: 'long', year: 'numeric',
          month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
        });

        const res = await client.post('/api/chat', {
          userMessage:   content,
          messages:      priorHistory,
          searchEnabled: search,
          timezone:      tz,
          localDateTime: ldt,
        });
        const { reply, modelUsed } = res.data;

        set(state => {
          const clean     = state.messages.filter(m => m._id !== tempUserMsg._id);
          const estTokens = Math.ceil((content.length + (reply?.length || 0)) / 4);
          return {
            messages: [
              ...clean,
              { _id: 'user_' + Date.now(), role: 'user', content, createdAt: new Date() },
              { _id: 'ai_'  + Date.now(), role: 'assistant', content: reply, modelUsed, createdAt: new Date() },
            ],
            isLoading:   false,
            tokensToday: state.tokensToday + estTokens,
          };
        });
      } catch (err) {
        console.error('Send message failed:', err);
        const errData = err.response?.data;
        const errMsg  = errData?.suspended
          ? 'Your access has been temporarily suspended. Please contact the admin.'
          : errData?.error || 'Failed to send message. Please try again.';
        set({ isLoading: false, error: errMsg });
        get().setToast({ text: errMsg, type: 'error' });
      }
      return;
    }

    // ── IDENTIFIED PATH ───────────────────────────────────────────────────────
    let convId = get().activeConversationId;

    if (!convId) {
      const title  = content.length > 40 ? content.substring(0, 40) + '…' : content;
      const newConv = await get().createConversation(title, model);
      if (!newConv) return;
      convId = newConv._id || newConv.id;
    }

    set(state => ({ messages: [...state.messages, tempUserMsg] }));

    try {
      const tz  = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const ldt = new Date().toLocaleString('en-US', {
        timeZone: tz, weekday: 'long', year: 'numeric',
        month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
      });
      const res = await client.post('/api/chat', {
        conversationId: convId,
        userMessage:    content,
        preferredModel: model,
        searchEnabled:  search,
        timezone:       tz,
        localDateTime:  ldt,
      });

      const { reply, modelUsed, message } = res.data;

      set(state => {
        const clean     = state.messages.filter(m => !m._id.startsWith('temp_user_'));
        const estTokens = Math.ceil((content.length + (reply?.length || 0)) / 4);
        return {
          messages: [
            ...clean,
            { _id: 'real_user_' + Date.now(), role: 'user', content, createdAt: new Date() },
            message,
          ],
          isLoading:   false,
          tokensToday: state.tokensToday + estTokens,
        };
      });

      if (modelUsed !== model) {
        get().setToast({
          text: `Auto-switched: ${model} → ${modelUsed} (rate limit) — continuing seamlessly.`,
          type: 'info',
        });
        set({ selectedModel: modelUsed });
      }

      await get().fetchConversations();
    } catch (err) {
      console.error('Send message failed:', err);
      const errData = err.response?.data;
      const errMsg  = errData?.suspended
        ? 'Your access has been temporarily suspended. Please contact the admin.'
        : errData?.error || 'Failed to send message. Please try again.';
      set({ isLoading: false, error: errMsg });
      get().setToast({ text: errMsg, type: 'error' });
    }
  },
}));

export default useChatStore;