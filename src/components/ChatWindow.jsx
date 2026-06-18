import { useEffect, useRef, useState } from 'react';
import useChatStore from '../store/chatStore';
import MessageBubble from './MessageBubble';
import ModelPicker from './ModelPicker';
import SearchToggle from './SearchToggle';
import { GUEST_NAME } from '../constants';
import { Menu, Sun, Moon, Download, ArrowUp, Lightbulb, PenLine, Bug, Search, BarChart3, Languages } from 'lucide-react';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Working late,';
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  if (h < 21) return 'Good evening,';
  return 'Late night session,';
}

const QUICK_ACTIONS = [
  { Icon: Lightbulb, label: 'Explain', prefill: 'Explain how ' },
  { Icon: PenLine, label: 'Write', prefill: 'Write a ' },
  { Icon: Bug, label: 'Debug', prefill: 'Debug this code:\n' },
  { Icon: Search, label: 'Research', prefill: 'Research ' },
  { Icon: BarChart3, label: 'Analyze', prefill: 'Analyze ' },
  { Icon: Languages, label: 'Translate', prefill: 'Translate to Bengali: ' }
];

function autoResize(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

function ChatWindow() {
  const {
    messages,
    isLoading,
    activeConversationId,
    conversations,
    models,
    selectedModel,
    sendMessage,
    toast,
    clearToast,
    toggleSidebar,
    goHome,
    theme,
    cycleTheme,
    tokensToday,
    searchEnabled,
    toggleSearch,
    user
  } = useChatStore();

  const displayName = user?.name || GUEST_NAME;

  const [input, setInput] = useState('');
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const isHome = !activeConversationId;
  const activeConv = conversations.find((c) => (c._id || c.id) === activeConversationId);
  const activeModel = models.find((m) => m.id === selectedModel);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Ctrl/Cmd+K — jump back to the home/welcome screen, matching the design.
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        goHome();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [goHome]);

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
      setInput('');
      requestAnimationFrame(() => autoResize(textareaRef.current));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSend(e);
    }
  };

  const prefill = (text) => {
    setInput(text);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      autoResize(textareaRef.current);
      textareaRef.current?.setSelectionRange(text.length, text.length);
    });
  };

  const handleExport = () => {
    if (!activeConv) return;
    const body = messages
      .map((m) => `### ${m.role === 'user' ? displayName : 'ZexoChat'}${m.modelUsed ? ` (${m.modelUsed})` : ''}\n\n${m.content}\n`)
      .join('\n');
    const blob = new Blob([`# ${activeConv.title || 'Conversation'}\n\n${body}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeConv.title || 'conversation').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <main className={`main ${isHome ? 'home-mode' : ''}`}>
      {/* Switch / error notification */}
      {toast && (
        <div className="toast-wrap" onClick={clearToast} style={{ cursor: 'pointer' }}>
          <div className={`toast-inner ${toast.type === 'error' ? 'error' : 'info'}`}>
            {toast.type === 'error' ? '⚠️' : '⚡'} {toast.text}
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="hdr">
        <button className="ibtn" onClick={toggleSidebar} title="Toggle sidebar">
          <Menu size={15} />
        </button>

        <div className="hdr-chat">
          <span className="chat-ttl">{activeConv?.title || 'New Chat'}</span>
          <div className="hsep"></div>
        </div>

        <ModelPicker />

        <div className="hdr-chat-right">
          <SearchToggle />
          <div className="hsep"></div>
          <button className="ibtn" onClick={handleExport} title="Export conversation">
            <Download size={14} />
          </button>
        </div>

        <div className="hdr-spacer"></div>
        <div className="hdr-right">
          <button className="ibtn" onClick={cycleTheme} title="Toggle light/dark">
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>
      </header>

      {isHome ? (
        /* HOME / WELCOME SCREEN */
        <div className="home-screen">
          <div className="home-inner">
            <div className="home-greeting">
              {getGreeting()} <span className="home-name">{displayName}</span>.
            </div>
            <div className="home-sub">What are you building today?</div>

            <div className="home-inp-wrap">
              <form onSubmit={handleSend} className="inp-box">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); autoResize(e.target); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything… (Enter to send)"
                />
                <div className="inp-btns">
                  <button
                    type="button"
                    className={`ibtn-sm ${searchEnabled ? 'on' : ''}`}
                    onClick={toggleSearch}
                    title={searchEnabled ? 'Web search is ON' : 'Web search is OFF'}
                  >
                    🌐
                  </button>
                  <button type="submit" className="send-btn" disabled={!input.trim() || isLoading} title="Send">
                    <ArrowUp size={14} />
                  </button>
                </div>
              </form>
            </div>

            <div className="qa-chips">
              {QUICK_ACTIONS.map(({ Icon, label, prefill: text }) => (
                <button key={label} className="qa-chip" onClick={() => prefill(text)}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            <div className="home-stats">
              <div className="home-stat">
                <div className="home-stat-val">{conversations.length}</div>
                <div className="home-stat-lbl">Chats</div>
              </div>
              <div className="home-stat">
                <div className="home-stat-val" style={{ color: 'var(--ok)' }}>{models.length || '—'}</div>
                <div className="home-stat-lbl">Models Available</div>
              </div>
              <div className="home-stat">
                <div className="home-stat-val">{tokensToday.toLocaleString()}</div>
                <div className="home-stat-lbl">Tokens Today</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CHAT CONTENT */
        <div className="chat-content">
          <div className="msgs">
            <div className="mwrap">
              {messages.map((msg) => (
                <MessageBubble key={msg._id || msg.id} message={msg} displayName={displayName} />
              ))}

              {isLoading && (
                <div className="msg ai">
                  <div className="mhd">
                    <div className="mav a">AI</div>
                    <span className="mwho">ZexoChat</span>
                  </div>
                  <div className="loading-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* INPUT */}
          <div className="inp-area">
            <div className="inp-inner">
              <form onSubmit={handleSend} className="inp-box">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); autoResize(e.target); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
                />
                <div className="inp-btns">
                  <button
                    type="button"
                    className={`ibtn-sm ${searchEnabled ? 'on' : ''}`}
                    onClick={toggleSearch}
                    title={searchEnabled ? 'Web search is ON' : 'Web search is OFF'}
                  >
                    🌐
                  </button>
                  <button type="submit" className="send-btn" disabled={!input.trim() || isLoading} title="Send (Enter)">
                    <ArrowUp size={14} />
                  </button>
                </div>
              </form>
              <div className="inp-hint">
                <span>{activeModel?.name || selectedModel}</span>
                &nbsp;·&nbsp;Web search {searchEnabled ? 'ON' : 'OFF'}
                &nbsp;·&nbsp;Ctrl+K new chat
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default ChatWindow;