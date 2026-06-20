// PATH: frontend/src/components/AdminPanel.jsx

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LogOut, UserPlus, RefreshCw, Trash2,
  Copy, Check, ShieldCheck, MessageSquare,
  ChevronRight, X, ExternalLink, Users, Search,
  History, Eye, EyeOff
} from 'lucide-react';
import useChatStore from '../store/chatStore';
import useAdminStore from '../store/adminStore';
import client from '../api/client';
import { TOKEN_STORAGE_KEY } from '../constants';

// ─── ZexoChat SVG Logo ────────────────────────────────────────────────────────
function ZexoLogo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 5C4 3.34 5.34 2 7 2H17C18.66 2 20 3.34 20 5V15C20 16.66 18.66 18 17 18H13.5L11 21.5L8.5 18H7C5.34 18 4 16.66 4 15V5Z"
        fill="var(--ac)" fillOpacity="0.15"
        stroke="var(--ac)" strokeWidth="1.5"
      />
      <path
        d="M8.5 8H15L8.5 14H15.5"
        stroke="var(--ac)" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Admin login — 50/50 split, form and branding pulled toward center ────────
function AdminLoginPage() {
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const { restoreSession }        = useChatStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await client.post('/api/admin/login', { username, password });
      localStorage.setItem(TOKEN_STORAGE_KEY, res.data.token);
      await restoreSession();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      {/* ── Left: form pulled toward center line ── */}
      <div className="admin-login-left">
        <div className="admin-login-card">
          <div className="admin-login-icon"><ShieldCheck size={30} /></div>
          <h1 className="admin-login-title">Admin Panel</h1>
          <p className="admin-login-sub">Sign in with your admin credentials</p>

          <form onSubmit={handleSubmit} className="admin-login-form">
            <input
              type="text"
              placeholder="Username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {/* Password with visibility toggle */}
            <div className="admin-pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="admin-pw-toggle"
                onClick={() => setShowPw(v => !v)}
                tabIndex={-1}
                title={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button type="submit" disabled={!username.trim() || !password.trim() || loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {error && <div className="login-error" style={{ marginTop: 10 }}>{error}</div>}
        </div>
      </div>

      {/* ── Right: branding pulled toward center line ── */}
      <div className="admin-login-right">
        <div className="admin-brand-orb orb-1" />
        <div className="admin-brand-orb orb-2" />
        <div className="admin-brand-orb orb-3" />
        <div className="admin-brand-content">
          <div className="admin-brand-logo"><ZexoLogo size={40} /></div>
          <h2 className="admin-brand-name">ZexoChat</h2>
          <p className="admin-brand-tag">Personal AI · Your models · Your data</p>
          <div className="admin-brand-pills">
            <span>🔒 Invite-only access</span>
            <span>🤖 13 AI models</span>
            <span>⚡ Auto-fallback routing</span>
            <span>🗄️ MongoDB persistence</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── One-time access-code reveal ─────────────────────────────────────────────
function CodeRevealBanner({ reveal, onDismiss }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(reveal.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <div className="admin-card reveal-card" style={{ margin: '16px 20px 0' }}>
      <div className="reveal-title">Access code for {reveal.name}</div>
      <div className="reveal-sub">
        Copy and send this now — only the bcrypt hash is stored, so this plaintext is gone once you dismiss.
        If you lose it, use ↻ Regenerate to issue a new one.
      </div>
      <div className="reveal-code-row">
        <code className="reveal-code">{reveal.code}</code>
        <button onClick={copy} className="btn-secondary">
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <button onClick={onDismiss} className="btn-text">I've saved this — dismiss</button>
    </div>
  );
}

// ─── Inline-editable name cell ────────────────────────────────────────────────
function EditableNameCell({ value, userId }) {
  const { updateUser } = useAdminStore();
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(value);
  const [saving, setSaving]   = useState(false);

  const save = async () => {
    const trimmed = val.trim();
    if (!trimmed || trimmed === value) { setEditing(false); setVal(value); return; }
    setSaving(true);
    await updateUser(userId, trimmed);
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        className="admin-inline-input"
        value={val}
        autoFocus
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') { setEditing(false); setVal(value); }
        }}
      />
    );
  }

  return (
    <span className="admin-editable" onClick={() => setEditing(true)} title="Click to edit name">
      {saving ? '…' : value}
    </span>
  );
}

// ─── Create user form ─────────────────────────────────────────────────────────
function CreateUserForm() {
  const { createUser, error } = useAdminStore();
  const [name, setName]             = useState('');
  const [username, setUsername]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || submitting) return;
    setSubmitting(true);
    const ok = await createUser(name.trim(), username.trim());
    setSubmitting(false);
    if (ok) { setName(''); setUsername(''); }
  };

  return (
    <div className="admin-card">
      <div className="admin-card-title"><UserPlus size={15} /> Create user</div>
      <form onSubmit={handleSubmit} className="admin-form">
        <input
          type="text"
          placeholder="Display name (e.g. Nahid)"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Username (e.g. nahid)"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <button type="submit" disabled={!name.trim() || !username.trim() || submitting}>
          {submitting ? 'Creating…' : 'Create & get code'}
        </button>
      </form>
      {error && <div className="login-error">{error}</div>}
    </div>
  );
}

// ─── Users table ─────────────────────────────────────────────────────────────
function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch { return ''; }
}

function UsersTable({ onViewChats }) {
  const { users, loading, regenerateCode, deleteUser, toggleActive } = useAdminStore();
  const { user: currentUser } = useChatStore();

  const handleDelete = (u) => {
    if (confirm(`Delete ${u.name} (@${u.username})?\n\nAll their saved conversations will also be deleted.`)) {
      deleteUser(u.id);
    }
  };

  if (loading) return <div className="admin-card"><div className="admin-empty">Loading users…</div></div>;

  return (
    <div className="admin-card admin-card-full">
      <div className="admin-card-title">
        Users
        <span className="admin-count-badge">{users.length}</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Access code</th>
              <th>Uses</th>
              <th>Active</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const isSelf = currentUser && String(currentUser.id) === String(u.id);
              return (
                <tr key={u.id}>
                  <td><EditableNameCell value={u.name} userId={u.id} /></td>
                  <td className="admin-mono">@{u.username}</td>
                  <td className="admin-mono admin-masked" title="Codes are stored as hashes only. Use ↻ to issue a new one.">
                    ••••••••••••
                  </td>
                  <td className="admin-uses">{u.messageCount || 0}</td>
                  <td>
                    <label
                      className={`toggle-switch ${isSelf ? 'toggle-disabled' : ''}`}
                      title={isSelf ? "Can't suspend your own account" : u.isActive ? 'Active — click to suspend' : 'Suspended — click to activate'}
                    >
                      <input
                        type="checkbox"
                        checked={u.isActive !== false}
                        disabled={isSelf}
                        onChange={() => !isSelf && toggleActive(u.id, !u.isActive)}
                      />
                      <span className="toggle-thumb" />
                    </label>
                  </td>
                  <td>{u.role === 'admin' ? <span className="role-badge">Admin</span> : 'User'}</td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td className="admin-actions">
                    <button onClick={() => onViewChats(u)} className="admin-action-btn" title="View chat history">
                      <MessageSquare size={13} />
                    </button>
                    <button onClick={() => regenerateCode(u.id, u.name)} className="admin-action-btn" title="Regenerate access code">
                      <RefreshCw size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      className="admin-action-btn danger"
                      disabled={isSelf}
                      title={isSelf ? "Can't delete your own account" : 'Delete user'}
                      style={isSelf ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && <div className="admin-empty">No users yet — create one above.</div>}
      </div>
    </div>
  );
}

// ─── Chat History section — 20/60 split (inside 80% content area = 20/20/60 total) ──
function formatDateTime(d) {
  try {
    return new Date(d).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return ''; }
}

function ChatsSection({ users, initialUser }) {
  const [selectedUser, setSelectedUser] = useState(initialUser || null);
  const [convs, setConvs]       = useState(null);
  const [search, setSearch]     = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [messages, setMessages] = useState({});
  const { deleteConversation }  = useAdminStore();

  useEffect(() => {
    if (!selectedUser) { setConvs(null); return; }
    setConvs(null);
    setSearch('');
    setExpandedId(null);
    client.get(`/api/admin/users/${selectedUser.id}/conversations`)
      .then(r => setConvs(r.data))
      .catch(() => setConvs([]));
  }, [selectedUser?.id]);

  const toggleExpand = async (conv) => {
    const id = conv._id || conv.id;
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!messages[id]) {
      try {
        const r = await client.get(`/api/admin/conversations/${id}/messages`);
        setMessages(prev => ({ ...prev, [id]: r.data }));
      } catch {
        setMessages(prev => ({ ...prev, [id]: [] }));
      }
    }
  };

  const handleDeleteConv = async (e, conv) => {
    e.stopPropagation();
    const id = conv._id || conv.id;
    if (!confirm(`Delete "${conv.title || 'this conversation'}"? This cannot be undone.`)) return;
    const ok = await deleteConversation(id);
    if (ok) {
      setConvs(prev => prev.filter(c => (c._id || c.id) !== id));
      if (expandedId === id) setExpandedId(null);
    }
  };

  const filtered = (convs || []).filter(c =>
    !search || (c.title || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="chats-layout">
      {/* ── Left: user list ── */}
      <div className="chats-user-list">
        <div className="chats-panel-hdr">Users</div>
        {users.length === 0 && <div className="chats-empty-msg">No users yet.</div>}
        {users.map(u => (
          <button
            key={u.id}
            className={`chats-user-item ${selectedUser?.id === u.id ? 'active' : ''}`}
            onClick={() => setSelectedUser(u)}
          >
            <div className="chats-user-av">{u.name?.[0]?.toUpperCase()}</div>
            <div className="chats-user-info">
              <div className="chats-user-name">{u.name}</div>
              <div className="chats-user-handle">@{u.username}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Right: conversations ── */}
      <div className="chats-conv-area">
        {!selectedUser ? (
          <div className="chats-empty-state">
            <MessageSquare size={30} strokeWidth={1.5} />
            <p>Select a user to view their chat history</p>
          </div>
        ) : (
          <>
            <div className="chats-search-bar">
              <Search size={13} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${selectedUser.name}'s conversations…`}
              />
              {search && (
                <button onClick={() => setSearch('')} className="chats-search-clear">
                  <X size={12} />
                </button>
              )}
            </div>

            {convs === null ? (
              <div className="chats-empty-state">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="chats-empty-state">
                {search ? 'No matching conversations.' : `${selectedUser.name} has no conversations yet.`}
              </div>
            ) : (
              <div className="chats-conv-list">
                {filtered.map(conv => {
                  const id = conv._id || conv.id;
                  const isExpanded = expandedId === id;
                  return (
                    <div key={id} className={`chats-conv-item ${isExpanded ? 'expanded' : ''}`}>
                      <div className="chats-conv-hdr" onClick={() => toggleExpand(conv)}>
                        <ChevronRight
                          size={14}
                          className="chats-expand-ico"
                          style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s ease' }}
                        />
                        <div className="chats-conv-meta">
                          <span className="chats-conv-title">{conv.title || 'Untitled'}</span>
                          <span className="chats-conv-sub">{conv.model} · {formatDateTime(conv.updatedAt)}</span>
                        </div>
                        <button
                          className="admin-del-btn"
                          onClick={e => handleDeleteConv(e, conv)}
                          title="Delete conversation"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="chats-msg-list">
                          {!messages[id] ? (
                            <div className="chats-msg-loading">Loading messages…</div>
                          ) : messages[id].length === 0 ? (
                            <div className="chats-msg-loading">No messages in this conversation.</div>
                          ) : (
                            messages[id].map(m => (
                              <div key={m._id || m.id} className={`chats-msg ${m.role}`}>
                                <span className="chats-msg-role">
                                  {m.role === 'user' ? selectedUser.name : 'AI'}
                                </span>
                                <p className="chats-msg-content">{m.content}</p>
                                {m.modelUsed && <span className="chats-msg-model">{m.modelUsed}</span>}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Admin dashboard — full left-sidebar layout ────────────────────────────────
function AdminDashboard() {
  const { user, logout }                                         = useChatStore();
  const { fetchUsers, revealedCode, dismissRevealedCode, users } = useAdminStore();
  const [activeTab, setActiveTab] = useState('users');
  const [chatsUser, setChatsUser] = useState(null);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleViewChats = (u) => {
    setChatsUser(u);
    setActiveTab('chats');
  };

  const tabLabel = activeTab === 'users'
    ? { icon: <Users size={15} />, text: 'Users' }
    : { icon: <History size={15} />, text: 'Chat History' };

  return (
    <div className="admin-layout">

      {/* ── Left sidebar nav ── */}
      <div className="admin-sidenav">
        <div className="admin-sidenav-top">
          <div className="admin-sidenav-logo">
            <ZexoLogo size={20} />
            <span>ZexoChat</span>
          </div>
          <div className="admin-sidenav-label">Admin Panel</div>
          <nav className="admin-sidenav-nav">
            <button
              className={`admin-sidenav-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={15} /> <span>Users</span>
            </button>
            <button
              className={`admin-sidenav-btn ${activeTab === 'chats' ? 'active' : ''}`}
              onClick={() => { setChatsUser(null); setActiveTab('chats'); }}
            >
              <History size={15} /> <span>Chat History</span>
            </button>
          </nav>
        </div>

        <div className="admin-sidenav-footer">
          <div className="admin-sidenav-user">
            <div className="admin-sidenav-av">{user?.name?.[0]?.toUpperCase()}</div>
            <span className="admin-sidenav-username">{user?.name}</span>
          </div>
          <div className="admin-sidenav-actions">
            <button
              onClick={() => window.open('/', '_blank')}
              className="admin-nav-ibtn"
              title="Open main app in new tab"
            >
              <ExternalLink size={14} />
            </button>
            <button onClick={logout} className="admin-nav-ibtn" title="Log out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="admin-content">
        {/* Sticky content header */}
        <div className="admin-content-hdr">
          <span className="admin-content-hdr-icon">{tabLabel.icon}</span>
          <h2 className="admin-content-hdr-title">{tabLabel.text}</h2>
          {activeTab === 'users' && (
            <span className="admin-content-hdr-badge">{users.length}</span>
          )}
        </div>

        {revealedCode && (
          <CodeRevealBanner reveal={revealedCode} onDismiss={dismissRevealedCode} />
        )}

        {activeTab === 'users' && (
          <div className="admin-content-body">
            <CreateUserForm />
            <UsersTable onViewChats={handleViewChats} />
          </div>
        )}

        {activeTab === 'chats' && (
          <ChatsSection users={users} initialUser={chatsUser} />
        )}
      </div>
    </div>
  );
}

// ─── Root — flash guard while session restores ────────────────────────────────
function AdminPanel() {
  const { user, authReady } = useChatStore();

  if (!authReady) {
    return (
      <div className="admin-loading-page">
        <div className="admin-loading-spinner" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') return <AdminLoginPage />;
  return <AdminDashboard />;
}

export default AdminPanel;