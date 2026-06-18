import { create } from 'zustand';
import client from '../api/client';
import { ANONYMOUS_MODEL_ID, TOKEN_STORAGE_KEY } from '../constants';

// Default background palettes, mirroring the design mockup's "Background" swatches.
const DARK_BG_DEFAULT = { bg: '#07111C', bgs: '#0B1A28', bge: '#0F2234', bgh: '#152E46', bd: '#1D3C58' };
const LIGHT_BG_DEFAULT = { bg: '#F7F8FA', bgs: '#FFFFFF', bge: '#FFFFFF', bgh: '#EFEFEF', bd: '#E0E0E0' };

// Default model offered to identified (logged-in) users for a fresh chat —
// distinct from ANONYMOUS_MODEL_ID, which is the one-and-only model
// anonymous callers are locked to.
const DEFAULT_IDENTIFIED_MODEL = 'gemini-3-flash-preview';

function applyBgVars(vars) {
  const root = document.documentElement;
  root.style.setProperty('--bg', vars.bg);
  root.style.setProperty('--bgs', vars.bgs);
  root.style.setProperty('--bge', vars.bge);
  root.style.setProperty('--bgh', vars.bgh);
  root.style.setProperty('--bd', vars.bd);
}

const useChatStore = create((set, get) => ({
  // --- Auth / identity. `user` is null for anonymous callers — see the
  // access plan: anonymous gets exactly one model and no saved history,
  // identified users (access code) get everything.
  user: null,
  authReady: false, // becomes true once restoreSession() has resolved on boot
  authError: null,

  // --- Core chat state
  conversations: [],
  activeConversationId: null,
  messages: [],
  selectedModel: ANONYMOUS_MODEL_ID,
  isLoading: false,
  searchEnabled: true,
  error: null,
  toast: null,

  // --- View: 'home' (welcome screen) | 'chat' (an open conversation)
  view: 'home',

  // --- Models (fetched from /api/models, used by ModelPicker + home stats)
  models: [],
  modelsLoaded: false,

  // --- Lightweight client-side estimate of tokens used this session.
  // The backend doesn't track token usage, so this is a rough character/4
  // approximation rather than real provider-reported usage.
  tokensToday: 0,

  // --- Sidebar conversation search
  convSearchQuery: '',

  // --- UI state
  sidebarOpen: true,
  theme: 'dark',
  appearanceOpen: false,
  bgPaletteId: 'bgOceanic',
  accentColor: {
    ac: '#00C9A7',
    ach: '#1DDBB9',
    r: 0,
    g: 201,
    b: 167,
    acText: '#07111C'
  },

  // --- UI actions
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

  setTheme: (mode) => {
    document.documentElement.setAttribute('data-theme', mode);
    // Reset background palette to the new theme's default, same as the mockup's
    // resetBgForTheme() — keeps an accidental "light text on light bg" combo
    // from persisting after a theme switch.
    const defaults = mode === 'dark' ? DARK_BG_DEFAULT : LIGHT_BG_DEFAULT;
    applyBgVars(defaults);
    set({ theme: mode, bgPaletteId: mode === 'dark' ? 'bgOceanic' : 'bgClean' });
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
  },

  toggleAppearance: () => set(state => ({ appearanceOpen: !state.appearanceOpen })),

  // Returns dark or white text depending on accent luminance, so a picked
  // color always stays readable on buttons/avatars that use --ac-text
  // (e.g. a medium blue needs white text, not dark).
  setAccentColor: (ac, ach, r, g, b) => {
    const root = document.documentElement;
    const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const acText = L > 0.28 ? '#0A1420' : '#FFFFFF';

    root.style.setProperty('--ac', ac);
    root.style.setProperty('--ach', ach);
    root.style.setProperty('--ac-text', acText);
    root.style.setProperty('--acm', `rgba(${r},${g},${b},.11)`);
    root.style.setProperty('--acb', `rgba(${r},${g},${b},.24)`);
    set({ accentColor: { ac, ach, r, g, b, acText } });
  },

  // For the custom color-picker swatch: derive a lighter "hover" shade from
  // the picked hex, then reuse the same logic as the preset swatches.
  setCustomAccentColor: (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lighten = (c) => Math.min(255, Math.round(c + (255 - c) * 0.15)).toString(16).padStart(2, '0');
    const ach = `#${lighten(r)}${lighten(g)}${lighten(b)}`;
    get().setAccentColor(hex, ach, r, g, b);
  },

  // --- Toast
  setToast: (toast) => {
    set({ toast });
    setTimeout(() => {
      const current = get().toast;
      if (current && current.text === toast.text) {
        set({ toast: null });
      }
    }, 4000);
  },
  clearToast: () => set({ toast: null }),

  // --- Model
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

  // --- Search
  toggleSearch: () => set(state => ({ searchEnabled: !state.searchEnabled })),

  // --- Sidebar search
  setConvSearchQuery: (convSearchQuery) => set({ convSearchQuery }),

  // --- Navigation
  // Returns to the welcome/home screen without creating a conversation yet —
  // a real conversation row is only persisted once the user actually sends
  // a message (see sendMessage below). Mirrors the mockup's showHome(). This
  // is also how an in-progress anonymous chat gets discarded, matching the
  // access plan ("refreshing the page clears the conversation") — "New
  // Chat" has the same effect even without a refresh.
  goHome: () => set({ activeConversationId: null, messages: [], view: 'home' }),

  // --- Auth actions
  // Checks for a previously-saved session token on boot and verifies it's
  // still valid (it may have been revoked since — logout elsewhere, an
  // admin regenerating the code, or the account being deleted). Always
  // resolves (never throws) so App.jsx can safely await it before loading
  // anything that depends on who's logged in.
  restoreSession: async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      set({ authReady: true });
      return;
    }
    try {
      const res = await client.get('/api/auth/me');
      set({ user: res.data.user, authReady: true, selectedModel: DEFAULT_IDENTIFIED_MODEL });
    } catch (err) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      set({ user: null, authReady: true });
    }
  },

  login: async (code) => {
    set({ authError: null });
    try {
      const res = await client.post('/api/auth/login', { code });
      const { token, user } = res.data;
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      // Crossing the anonymous → identified boundary mid-chat: any
      // in-progress anonymous session was never persisted (and its
      // placeholder ID isn't a real conversation the backend knows about),
      // so start clean rather than carrying over a session that the next
      // send would just 404 on.
      set({
        user,
        authError: null,
        selectedModel: DEFAULT_IDENTIFIED_MODEL,
        activeConversationId: null,
        messages: [],
        view: 'home'
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
      // Best-effort — the local session is cleared below regardless, so an
      // unreachable backend doesn't trap the user in a "logged in" state.
      console.warn('Logout request failed (clearing local session anyway):', err.message);
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    set({
      user: null,
      conversations: [],
      activeConversationId: null,
      messages: [],
      view: 'home',
      selectedModel: ANONYMOUS_MODEL_ID
    });
  },

  // --- API actions
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
      if (conv && conv.model) {
        set({ selectedModel: conv.model });
      }
    } catch (err) {
      console.error('Fetch messages failed:', err);
      set({ error: 'Failed to load messages.' });
    }
  },

  createConversation: async (title = 'New Chat', preferredModel = null) => {
    const model = preferredModel || get().selectedModel;
    try {
      const res = await client.post('/api/history/new', { title, model });
      const newConv = res.data;
      set(state => ({
        conversations: [newConv, ...state.conversations],
        activeConversationId: newConv._id || newConv.id,
        messages: [],
        view: 'chat',
        error: null
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

      // FIX: was `set(state => { conversations: ... })` — curly braces make a JS block,
      // not an object literal, so state never updated. Parentheses around {} are required.
      set(state => {
        const remaining = state.conversations.filter(c => (c._id || c.id) !== id);
        const wasActive = state.activeConversationId === id;
        const newActiveId = wasActive
          ? (remaining[0]?._id || remaining[0]?.id || null)
          : state.activeConversationId;
        return {
          conversations: remaining,
          activeConversationId: newActiveId,
          messages: wasActive ? [] : state.messages,
          view: wasActive && !newActiveId ? 'home' : state.view
        };
      });

      // If a new conversation is now active, load its messages
      const newActiveId = get().activeConversationId;
      if (newActiveId) {
        get().selectConversation(newActiveId);
      }
    } catch (err) {
      console.error('Delete conversation failed:', err);
      set({ error: 'Failed to delete conversation.' });
    }
  },

  sendMessage: async (content) => {
    if (!content || content.trim().length === 0) return;
    const { user, searchEnabled: search } = get();
    const model = get().selectedModel;

    set({ isLoading: true, error: null, view: 'chat' });

    const tempUserMsg = {
      _id: 'temp_user_' + Date.now(),
      role: 'user',
      content,
      createdAt: new Date()
    };

    // ── ANONYMOUS PATH ──────────────────────────────────────────────────
    // Access plan §1: anonymous chats are never written to the database.
    // There's no conversationId from the backend to anchor this on, so we
    // track it with a local-only placeholder ID just to flip the UI out of
    // the home screen, and resend the running history with every request
    // since the server remembers nothing between calls.
    if (!user) {
      if (!get().activeConversationId) {
        set({ activeConversationId: 'anonymous-session', messages: [] });
      }
      set(state => ({ messages: [...state.messages, tempUserMsg] }));

      try {
        const priorHistory = get().messages
          .filter(m => m._id !== tempUserMsg._id)
          .map(m => ({ role: m.role, content: m.content }));

        const res = await client.post('/api/chat', {
          userMessage: content,
          messages: priorHistory,
          searchEnabled: search
        });
        const { reply, modelUsed } = res.data;

        set(state => {
          const clean = state.messages.filter(m => m._id !== tempUserMsg._id);
          const estTokens = Math.ceil((content.length + (reply?.length || 0)) / 4);
          return {
            messages: [
              ...clean,
              { _id: 'user_' + Date.now(), role: 'user', content, createdAt: new Date() },
              { _id: 'ai_' + Date.now(), role: 'assistant', content: reply, modelUsed, createdAt: new Date() }
            ],
            isLoading: false,
            tokensToday: state.tokensToday + estTokens
          };
        });
      } catch (err) {
        console.error('Send message failed:', err);
        const errMsg = err.response?.data?.error || 'Failed to send message. Please try again.';
        set({ isLoading: false, error: errMsg });
        get().setToast({ text: errMsg, type: 'error' });
      }
      return;
    }

    // ── IDENTIFIED PATH ─────────────────────────────────────────────────
    // Full DB-backed persistence, scoped to the logged-in user's account.
    let convId = get().activeConversationId;

    if (!convId) {
      const title = content.length > 40 ? content.substring(0, 40) + '…' : content;
      const newConv = await get().createConversation(title, model);
      if (!newConv) return;
      convId = newConv._id || newConv.id;
    }

    set(state => ({ messages: [...state.messages, tempUserMsg] }));

    try {
      const res = await client.post('/api/chat', {
        conversationId: convId,
        userMessage: content,
        preferredModel: model,
        searchEnabled: search
      });
      const { reply, modelUsed, message } = res.data;

      set(state => {
        const clean = state.messages.filter(m => !m._id.startsWith('temp_user_'));
        // Rough client-side token estimate (chars / 4) since the backend
        // doesn't report real usage — purely a display approximation.
        const estTokens = Math.ceil((content.length + (reply?.length || 0)) / 4);
        return {
          messages: [
            ...clean,
            { _id: 'real_user_' + Date.now(), role: 'user', content, createdAt: new Date() },
            message
          ],
          isLoading: false,
          tokensToday: state.tokensToday + estTokens
        };
      });

      if (modelUsed !== model) {
        get().setToast({
          text: `Auto-switched: ${model} → ${modelUsed} (rate limit) — continuing seamlessly.`,
          type: 'info'
        });
        set({ selectedModel: modelUsed });
      }

      await get().fetchConversations();
    } catch (err) {
      console.error('Send message failed:', err);
      const errMsg = err.response?.data?.error || 'Failed to send message. Please try again.';
      set({ isLoading: false, error: errMsg });
      get().setToast({ text: errMsg, type: 'error' });
    }
  }
}));

export default useChatStore;