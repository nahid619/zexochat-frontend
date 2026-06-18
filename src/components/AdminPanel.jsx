import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, UserPlus, RefreshCw, Trash2, Copy, Check, ShieldCheck, Lock } from 'lucide-react';
import useChatStore from '../store/chatStore';
import useAdminStore from '../store/adminStore';
import client from '../api/client';
import { TOKEN_STORAGE_KEY } from '../constants';

// ─── Admin password login form ────────────────────────────────────────────────
// Shown at /admin when the user either isn't logged in at all or is logged in
// as a regular (non-admin) user. Completely separate from the main-app
// access-code login — the admin sets their credentials via env vars
// (ADMIN_USERNAME + ADMIN_PASSWORD), not the access-code flow.
function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { restoreSession }      = useChatStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await client.post('/api/admin/login', { username, password });
      const { token } = res.data;
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      // Restore the session so the chatStore's `user` updates and App.jsx
      // re-evaluates the /admin route guard — the admin panel then renders.
      await restoreSession();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-icon"><ShieldCheck size={28} /></div>
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

        {error && <div className="login-error">{error}</div>}

        <Link to="/" className="admin-login-back">← Back to chat</Link>
      </div>
    </div>
  );
}

// ─── One-time access-code reveal banner ──────────────────────────────────────
function CodeRevealBanner({ reveal, onDismiss }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(reveal.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="admin-card reveal-card">
      <div className="reveal-title">Access code for {reveal.name}</div>
      <div className="reveal-sub">
        Copy this now and send it out-of-band — it won't be shown again. Only a hash is kept after this.
      </div>
      <div className="reveal-code-row">
        <code className="reveal-code">{reveal.code}</code>
        <button onClick={handleCopy} className="btn-secondary">
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <button onClick={onDismiss} className="btn-text">I've saved this — dismiss</button>
    </div>
  );
}

// ─── Create user form ─────────────────────────────────────────────────────────
function CreateUserForm() {
  const { createUser, error } = useAdminStore();
  const [name, setName]         = useState('');
  const [username, setUsername] = useState('');
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
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Username (e.g. nahid)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return ''; }
}

function UsersTable() {
  const { users, loading, regenerateCode, deleteUser } = useAdminStore();
  const { user: currentUser } = useChatStore();

  const handleDelete = (u) => {
    if (confirm(`Delete ${u.name} (@${u.username})?\n\nTheir saved conversations will also be deleted.`)) {
      deleteUser(u.id);
    }
  };

  if (loading) return <div className="admin-card"><div className="admin-empty">Loading users…</div></div>;

  return (
    <div className="admin-card">
      <div className="admin-card-title">Users ({users.length})</div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Access code</th>
            <th>Role</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = currentUser && String(currentUser.id) === String(u.id);
            return (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td className="admin-mono">@{u.username}</td>
                <td className="admin-mono admin-masked">
                  <Lock size={10} style={{ marginRight: 4, opacity: 0.4 }} />
                  ••••••••••••
                </td>
                <td>{u.role === 'admin' ? <span className="role-badge">Admin</span> : 'User'}</td>
                <td>{formatDate(u.createdAt)}</td>
                <td className="admin-actions">
                  <button
                    onClick={() => regenerateCode(u.id, u.name)}
                    className="ibtn"
                    title="Regenerate access code — invalidates the old one immediately"
                  >
                    <RefreshCw size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(u)}
                    className="ibtn"
                    disabled={isSelf}
                    title={isSelf ? "You can't delete your own account" : 'Delete user'}
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
  );
}

// ─── Main admin panel (shown after admin is authenticated) ────────────────────
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

// ─── Root export — shows login form or dashboard depending on auth state ──────
function AdminPanel() {
  const { user } = useChatStore();
  // Show password login if not logged in OR logged in as a regular user.
  if (!user || user.role !== 'admin') return <AdminLoginPage />;
  return <AdminDashboard />;
}

export default AdminPanel;