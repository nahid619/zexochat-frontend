// PATH: frontend/src/components/AdminPanel.jsx

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, LogOut, UserPlus, RefreshCw, Trash2,
  Copy, Check, ShieldCheck, MessageSquare, ChevronRight,
  ChevronDown, X
} from 'lucide-react';
import useChatStore from '../store/chatStore';
import useAdminStore from '../store/adminStore';
import client from '../api/client';
import { TOKEN_STORAGE_KEY } from '../constants';

// ─── Admin password login — 50/50 split ──────────────────────────────────────
function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword]   = useState('');
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
      {/* ── Left: form ── */}
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
            <input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" disabled={!username.trim() || !password.trim() || loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {error && <div className="login-error" style={{ marginTop: 10 }}>{error}</div>}
          <Link to="/" className="admin-login-back">← Back to chat</Link>
        </div>
      </div>

      {/* ── Right: branding ── */}
      <div className="admin-login-right">
        <div className="admin-brand-orb orb-1" />
        <div className="admin-brand-orb orb-2" />
        <div className="admin-brand-orb orb-3" />
        <div className="admin-brand-content">
          <div className="admin-brand-logo">Z</div>
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
    <div className="admin-card reveal-card">
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

// ─── User chat history modal ──────────────────────────────────────────────────
function UserChatsModal({ user: targetUser, onClose }) {
  const [convs, setConvs]       = useState(null);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  useEffect(() => {
    client.get(`/api/admin/users/${targetUser.id}/conversations`)
      .then(r => setConvs(r.data))
      .catch(() => setConvs([]));
  }, [targetUser.id]);

  const openConv = async (conv) => {
    setActiveConv(conv);
    setMessages(null);
    setLoadingMsgs(true);
    try {
      const r = await client.get(`/api/admin/conversations/${conv._id || conv.id}/messages`);
      setMessages(r.data);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const formatDate = (d) => {
    try { return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          {activeConv ? (
            <button className="modal-back" onClick={() => { setActiveConv(null); setMessages(null); }}>
              <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Conversations
            </button>
          ) : (
            <span className="modal-title">
              <MessageSquare size={14} /> {targetUser.name}'s chats
            </span>
          )}
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="modal-body">
          {/* Conversation list */}
          {!activeConv && (
            convs === null ? (
              <div className="modal-empty">Loading…</div>
            ) : convs.length === 0 ? (
              <div className="modal-empty">No conversations yet.</div>
            ) : (
              <div className="conv-list">
                {convs.map(c => (
                  <button key={c._id || c.id} className="conv-row" onClick={() => openConv(c)}>
                    <div className="conv-row-info">
                      <span className="conv-row-title">{c.title || 'Untitled'}</span>
                      <span className="conv-row-meta">{c.model} · {formatDate(c.updatedAt)}</span>
                    </div>
                    <ChevronRight size={14} className="conv-row-arrow" />
                  </button>
                ))}
              </div>
            )
          )}

          {/* Message view */}
          {activeConv && (
            <div className="msg-list">
              <div className="msg-list-title">{activeConv.title || 'Untitled'}</div>
              {loadingMsgs && <div className="modal-empty">Loading messages…</div>}
              {messages && messages.length === 0 && <div className="modal-empty">No messages.</div>}
              {messages && messages.map(m => (
                <div key={m._id || m.id} className={`admin-msg ${m.role}`}>
                  <span className="admin-msg-role">{m.role === 'user' ? targetUser.name : 'AI'}</span>
                  <p className="admin-msg-content">{m.content}</p>
                  {m.modelUsed && <span className="admin-msg-model">{m.modelUsed}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Inline-editable name cell ────────────────────────────────────────────────
function EditableNameCell({ value, userId }) {
  const { updateUser } = useAdminStore();
  const [editing, setEditing]   = useState(false);
  const [val, setVal]           = useState(value);
  const [saving, setSaving]     = useState(false);

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
    <span
      className="admin-editable"
      onClick={() => setEditing(true)}
      title="Click to edit name"
    >
      {saving ? '…' : value}
    </span>
  );
}

// ─── Create user form ─────────────────────────────────────────────────────────
function CreateUserForm() {
  const { createUser, error } = useAdminStore();
  const [name, setName]           = useState('');
  const [username, setUsername]   = useState('');
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
        <input type="text" placeholder="Display name (e.g. Nahid)" value={name} onChange={e => setName(e.target.value)} />
        <input type="text" placeholder="Username (e.g. nahid)" value={username} onChange={e => setUsername(e.target.value)} />
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
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return ''; }
}

function UsersTable() {
  const { users, loading, regenerateCode, deleteUser } = useAdminStore();
  const { user: currentUser } = useChatStore();
  const [viewingUser, setViewingUser] = useState(null);

  const handleDelete = (u) => {
    if (confirm(`Delete ${u.name} (@${u.username})?\n\nAll their saved conversations will also be deleted.`)) {
      deleteUser(u.id);
    }
  };

  if (loading) return <div className="admin-card"><div className="admin-empty">Loading users…</div></div>;

  return (
    <>
      <div className="admin-card admin-card-full">
        <div className="admin-card-title">Users ({users.length})</div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Access code</th>
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
                  <td>{u.role === 'admin' ? <span className="role-badge">Admin</span> : 'User'}</td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td className="admin-actions">
                    <button onClick={() => setViewingUser(u)} className="ibtn" title="View chat history">
                      <MessageSquare size={13} />
                    </button>
                    <button onClick={() => regenerateCode(u.id, u.name)} className="ibtn" title="Regenerate access code">
                      <RefreshCw size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      className="ibtn"
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

      {viewingUser && <UserChatsModal user={viewingUser} onClose={() => setViewingUser(null)} />}
    </>
  );
}

// ─── Admin dashboard ──────────────────────────────────────────────────────────
function AdminDashboard() {
  const { user, logout } = useChatStore();
  const { fetchUsers, revealedCode, dismissRevealedCode } = useAdminStore();
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <div className="admin-page">
      <header className="admin-hdr">
        <Link to="/" className="admin-back"><ArrowLeft size={15} /> Back to chat</Link>
        <div className="admin-hdr-title"><ShieldCheck size={15} /> Admin panel</div>
        <div className="admin-hdr-right">
          <span className="admin-hdr-name">{user?.name}</span>
          <button onClick={logout} className="ibtn" title="Log out"><LogOut size={14} /></button>
        </div>
      </header>
      <main className="admin-main">
        {revealedCode && <CodeRevealBanner reveal={revealedCode} onDismiss={dismissRevealedCode} />}
        <CreateUserForm />
        <UsersTable />
      </main>
    </div>
  );
}

// ─── Root — flash fix: show nothing while session is restoring ────────────────
function AdminPanel() {
  const { user, authReady } = useChatStore();

  // authReady is false until restoreSession() resolves on boot.
  // Without this guard, the login form briefly flashes on every page
  // refresh even when the admin is already logged in, because user=null
  // for the ~200ms before the /api/auth/me call comes back.
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