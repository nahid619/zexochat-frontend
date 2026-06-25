// PATH: frontend/src/components/Sidebar.jsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useChatStore from '../store/chatStore';
import { Plus, Trash2, Search, Settings, X, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import AppearancePanel from './AppearancePanel';
import LoginPanel from './LoginPanel';
import { GUEST_NAME } from '../constants';

function ZexoLogo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 5C4 3.34 5.34 2 7 2H17C18.66 2 20 3.34 20 5V15C20 16.66 18.66 18 17 18H13.5L11 21.5L8.5 18H7C5.34 18 4 16.66 4 15V5Z"
        fill="var(--ac)" fillOpacity="0.15" stroke="var(--ac)" strokeWidth="1.5"
      />
      <path d="M8.5 8H15L8.5 14H15.5"
        stroke="var(--ac)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function groupByDate(conversations) {
  const now            = new Date();
  const startOfToday   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek    = new Date(startOfToday);   startOfWeek.setDate(startOfWeek.getDate() - 7);
  const groups = { Today: [], Yesterday: [], 'This Week': [], Older: [] };
  conversations.forEach(conv => {
    const ts = new Date(conv.updatedAt || conv.createdAt || Date.now());
    if (ts >= startOfToday)     groups.Today.push(conv);
    else if (ts >= startOfYesterday) groups.Yesterday.push(conv);
    else if (ts >= startOfWeek) groups['This Week'].push(conv);
    else                         groups.Older.push(conv);
  });
  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

function Sidebar() {
  const {
    conversations, activeConversationId,
    selectConversation, goHome, deleteConversation,
    isLoading, toggleAppearance, appearanceOpen,
    sidebarOpen, toggleSidebar,
    convSearchQuery, setConvSearchQuery,
    user, logout, authReady,
  } = useChatStore();

  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);

  const filteredConversations = useMemo(() => {
    const q = convSearchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(c => (c.title || '').toLowerCase().includes(q));
  }, [conversations, convSearchQuery]);

  const grouped = useMemo(() => groupByDate(filteredConversations), [filteredConversations]);

  return (
    <>
      {/* ── Mobile backdrop — tap anywhere outside sidebar to close it ── */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? '' : 'closed'}`}>
        {/* Brand Header */}
        <div className="s-top">
          <div className="logo">
            <ZexoLogo size={22} />
            ZexoChat
          </div>
          <button onClick={toggleSidebar} className="ibtn" title="Close sidebar">
            <X size={14} />
          </button>
        </div>

        <div className="s-body">
          {/* New Chat */}
          <button onClick={() => { if (!isLoading) { goHome(); toggleSidebar(); } }}
            id="btn-new-chat" disabled={isLoading} className="btn-new">
            <Plus size={14} /><span>New Chat</span>
          </button>

          {/* Search */}
          <div className="s-srch">
            <Search size={11} className="si" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={convSearchQuery}
              onChange={e => setConvSearchQuery(e.target.value)}
            />
          </div>

          {/* Conversation list */}
          <div className="conv-list">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 px-4 text-xs" style={{ color: 'var(--t3)' }}>
                {convSearchQuery
                  ? 'No matching conversations.'
                  : <><span>No conversations yet.</span><br /><span>Start one above!</span></>}
              </div>
            ) : (
              grouped.map(([label, convs]) => (
                <div key={label}>
                  <div className="glbl">{label}</div>
                  {convs.map(conv => {
                    const convId   = conv._id || conv.id;
                    const isActive = activeConversationId === convId;
                    return (
                      <div
                        key={convId}
                        className={`ci ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          selectConversation(convId);
                          // Close sidebar on mobile after selecting a conversation
                          if (window.innerWidth <= 520) toggleSidebar();
                        }}
                      >
                        <span className="ci-ico">💬</span>
                        <span className="ci-name">{conv.title || 'Untitled Chat'}</span>
                        <button
                          id={`btn-delete-conv-${convId}`}
                          onClick={e => {
                            e.stopPropagation();
                            if (confirm('Delete this conversation?')) deleteConversation(convId);
                          }}
                          className="ci-del"
                          title="Delete chat"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        <AppearancePanel />

        {/* Footer */}
        <div className="s-foot">
          {!authReady ? (
            <div className="s-foot-skeleton">
              <div className="sk-av" />
              <div className="sk-lines">
                <div className="sk-line" />
                <div className="sk-line sk-short" />
              </div>
            </div>
          ) : (
            <>
              <div className="av">{(user?.name || GUEST_NAME).charAt(0).toUpperCase()}</div>
              <div className="fi">
                <div className="sfn">
                  {user?.name || GUEST_NAME}
                  {user?.role === 'admin' && <span className="role-badge">Admin</span>}
                </div>
                <div className="fs">
                  {user ? `${conversations.length} chats` : 'Guest · 1 model · not saved'}
                </div>
              </div>
              <div className="s-foot-actions">
                {user?.role === 'admin' && (
                  <button onClick={() => navigate('/admin')} className="ibtn" title="Admin panel">
                    <ShieldCheck size={14} />
                  </button>
                )}
                <button
                  onClick={() => { setLoginOpen(false); toggleAppearance(); }}
                  className="ibtn" title="Appearance" id="settingsBtn"
                >
                  <Settings size={14} />
                </button>
                {user ? (
                  <button onClick={logout} className="ibtn" title="Log out">
                    <LogOut size={14} />
                  </button>
                ) : (
                  <button
                    onClick={() => { if (appearanceOpen) toggleAppearance(); setLoginOpen(v => !v); }}
                    className="ibtn" title="Enter access code"
                  >
                    <KeyRound size={14} />
                  </button>
                )}
              </div>
              {!user && loginOpen && <LoginPanel onClose={() => setLoginOpen(false)} />}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;