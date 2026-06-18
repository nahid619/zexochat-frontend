import { useState } from 'react';
import { X } from 'lucide-react';
import useChatStore from '../store/chatStore';

function LoginPanel({ onClose }) {
  const { login, authError } = useChatStore();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    const ok = await login(code.trim());
    setSubmitting(false);
    if (ok) {
      setCode('');
      onClose();
    }
  };

  return (
    <div className="login-panel">
      <div className="cp-hdr">
        <span className="cp-title">Enter access code</span>
        <button onClick={onClose} className="cp-close" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="password"
          autoFocus
          placeholder="Paste your access code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="submit" disabled={!code.trim() || submitting}>
          {submitting ? 'Checking…' : 'Log in'}
        </button>
      </form>

      {authError && <div className="login-error">{authError}</div>}

      <div className="login-hint">
        No code? You can still chat — anonymous use is limited to one model and isn't saved.
      </div>
    </div>
  );
}

export default LoginPanel;