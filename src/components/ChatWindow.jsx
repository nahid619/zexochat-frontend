// PATH: frontend/src/components/ChatWindow.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import useChatStore from '../store/chatStore';
import MessageBubble from './MessageBubble';
import ModelPicker from './ModelPicker';
import SearchToggle from './SearchToggle';
import { GUEST_NAME } from '../constants';
import {
  Menu, Sun, Moon, Download, ArrowUp,
  Lightbulb, PenLine, Bug, Search, BarChart3, Languages,
  Paperclip, Mic, MicOff, X, FileText
} from 'lucide-react';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Working late,';
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  if (h < 21) return 'Good evening,';
  return 'Late night session,';
}

const QUICK_ACTIONS = [
  { Icon: Lightbulb, label: 'Explain',   prefill: 'Explain how ' },
  { Icon: PenLine,   label: 'Write',     prefill: 'Write a ' },
  { Icon: Bug,       label: 'Debug',     prefill: 'Debug this code:\n' },
  { Icon: Search,    label: 'Research',  prefill: 'Research ' },
  { Icon: BarChart3, label: 'Analyze',   prefill: 'Analyze ' },
  { Icon: Languages, label: 'Translate', prefill: 'Translate to Bengali: ' },
];

// File types the attachment picker accepts and can read as plain text
const TEXT_EXTENSIONS = [
  '.txt', '.md', '.markdown', '.csv', '.json', '.xml',
  '.html', '.htm', '.js', '.ts', '.jsx', '.tsx',
  '.py', '.java', '.c', '.cpp', '.css', '.yaml', '.yml',
  '.sql', '.sh', '.bash', '.env', '.log', '.ini', '.toml',
];
const EXCEL_EXTENSIONS = ['.xlsx', '.xls'];
const ACCEPT_ATTR = [...TEXT_EXTENSIONS, ...EXCEL_EXTENSIONS].join(',');

// Cap injected file content so we don't blow up the context window
const MAX_FILE_CHARS = 80_000;

function autoResize(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function ChatWindow() {
  const {
    messages, isLoading, activeConversationId, conversations,
    models, selectedModel, sendMessage, toast, clearToast,
    toggleSidebar, goHome, theme, cycleTheme,
    tokensToday, searchEnabled, toggleSearch, user, authReady,
  } = useChatStore();

  const displayName = authReady ? (user?.name || GUEST_NAME) : null;

  const [input, setInput]             = useState('');
  const [attachedFile, setAttachedFile] = useState(null); // { name, size, content }
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError]   = useState('');

  const textareaRef    = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef   = useRef(null);
  const recognitionRef = useRef(null);
  const voiceBaseRef   = useRef(''); // input text captured before voice started

  const isHome    = !activeConversationId;
  const activeConv  = conversations.find(c => (c._id || c.id) === activeConversationId);
  const activeModel = models.find(m => m.id === selectedModel);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); goHome(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [goHome]);

  // Stop recognition when component unmounts
  useEffect(() => () => recognitionRef.current?.stop(), []);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = (e) => {
    e?.preventDefault();
    const text = input.trim();
    if ((!text && !attachedFile) || isLoading) return;

    // Stop listening if the user hits send while mic is still on
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    let fullMessage = text;
    if (attachedFile) {
      const fence = attachedFile.name.endsWith('.csv') ? 'csv'
        : attachedFile.name.endsWith('.json') ? 'json'
        : attachedFile.name.match(/\.(js|jsx|ts|tsx)$/) ? 'javascript'
        : attachedFile.name.match(/\.(py)$/) ? 'python'
        : 'text';
      const fileBlock =
        `[Attached file: **${attachedFile.name}** (${formatBytes(attachedFile.size)})]` +
        `\n\`\`\`${fence}\n${attachedFile.content}\n\`\`\``;
      fullMessage = fileBlock + (text ? `\n\n${text}` : '\n\nPlease review this file.');
    }

    sendMessage(fullMessage);
    setInput('');
    setAttachedFile(null);
    requestAnimationFrame(() => autoResize(textareaRef.current));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) handleSend(e);
  };

  const prefill = (text) => {
    setInput(text);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      autoResize(textareaRef.current);
      textareaRef.current?.setSelectionRange(text.length, text.length);
    });
  };

  // ── File attachment ───────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow same file re-selection

    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (TEXT_EXTENSIONS.includes(ext)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        let content = ev.target.result;
        const truncated = content.length > MAX_FILE_CHARS;
        if (truncated) content = content.slice(0, MAX_FILE_CHARS) + '\n\n[… file truncated at 80 000 characters]';
        setAttachedFile({ name: file.name, size: file.size, content });
        textareaRef.current?.focus();
      };
      reader.readAsText(file);

    } else if (EXCEL_EXTENSIONS.includes(ext)) {
      // xlsx is a dynamic import so the bundle stays lean for non-Excel users.
      // The user must run: npm install xlsx
      try {
        const XLSX   = await import('xlsx');
        const reader = new FileReader();
        reader.onload = (ev) => {
          const wb   = XLSX.read(ev.target.result, { type: 'array' });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          let csv    = XLSX.utils.sheet_to_csv(ws);
          if (csv.length > MAX_FILE_CHARS) csv = csv.slice(0, MAX_FILE_CHARS) + '\n[… truncated]';
          setAttachedFile({ name: file.name, size: file.size, content: csv });
          textareaRef.current?.focus();
        };
        reader.readAsArrayBuffer(file);
      } catch {
        alert('Excel file support requires the xlsx package.\nRun: npm install xlsx  then restart the dev server.');
      }
    } else {
      alert(`Unsupported file type "${ext}".\n\nSupported: ${[...TEXT_EXTENSIONS, ...EXCEL_EXTENSIONS].join('  ')}`);
    }
  };

  // ── Voice input ───────────────────────────────────────────────────────────
  const toggleVoice = useCallback(() => {
    setVoiceError('');

    // Stop if already listening
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setVoiceError('Voice input requires Chrome or Edge.');
      return;
    }

    const recognition       = new SR();
    recognition.continuous    = true;   // keep listening until user stops
    recognition.interimResults = true;  // show words as they're spoken
    recognition.lang          = 'en-US';

    // Save whatever text was already in the input so we can append to it
    voiceBaseRef.current = input;

    recognition.onresult = (event) => {
      let final = '', interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      const base  = voiceBaseRef.current;
      const sep   = base && !base.endsWith(' ') && (final || interim) ? ' ' : '';
      setInput(base + sep + final + interim);
      requestAnimationFrame(() => autoResize(textareaRef.current));
    };

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') setVoiceError(`Mic error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    textareaRef.current?.focus();
  }, [isListening, input]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!activeConv) return;
    const body = messages
      .map(m => `### ${m.role === 'user' ? displayName : 'ZexoChat'}${m.modelUsed ? ` (${m.modelUsed})` : ''}\n\n${m.content}\n`)
      .join('\n');
    const blob = new Blob([`# ${activeConv.title || 'Conversation'}\n\n${body}`], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${(activeConv.title || 'conversation').toLowerCase().replace(/[^a-z0-9]+/g,'-')}.md`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  // ── Shared input controls ─────────────────────────────────────────────────
  // Rendered in both the home-screen box and the chat input area
  const InputControls = (
    <div className="inp-btns">
      {/* Hidden file picker */}
      <input ref={fileInputRef} type="file" accept={ACCEPT_ATTR}
        style={{ display:'none' }} onChange={handleFileSelect}/>

      {/* Attach file */}
      <button type="button" className="ibtn-sm" title="Attach a text file"
        onClick={() => fileInputRef.current?.click()}>
        <Paperclip size={14}/>
      </button>

      {/* Voice input */}
      <button type="button"
        className={`ibtn-sm voice-btn ${isListening ? 'listening' : ''}`}
        onClick={toggleVoice}
        title={isListening ? 'Stop recording (click to finish)' : 'Voice input (Chrome/Edge)'}>
        {isListening ? <MicOff size={14}/> : <Mic size={14}/>}
      </button>

      {/* Web search toggle */}
      <button type="button" className={`ibtn-sm ${searchEnabled ? 'on' : ''}`}
        onClick={toggleSearch}
        title={searchEnabled ? 'Web search ON — click to disable' : 'Web search OFF — click to enable'}>
        🌐
      </button>

      {/* Send */}
      <button type="submit" className="send-btn"
        disabled={(!input.trim() && !attachedFile) || isLoading}
        title="Send (Enter)">
        <ArrowUp size={14}/>
      </button>
    </div>
  );

  // ── File preview pill ─────────────────────────────────────────────────────
  const FilePill = attachedFile && (
    <div className="file-pill">
      <FileText size={13}/>
      <span className="file-pill-name">{attachedFile.name}</span>
      <span className="file-pill-size">{formatBytes(attachedFile.size)}</span>
      <button className="file-pill-remove" onClick={() => setAttachedFile(null)} title="Remove file">
        <X size={12}/>
      </button>
    </div>
  );

  // ── Voice status hint ─────────────────────────────────────────────────────
  const VoiceHint = (isListening || voiceError) && (
    <div className={`voice-hint ${voiceError ? 'error' : ''}`}>
      {voiceError
        ? `⚠️ ${voiceError}`
        : '🎙 Listening… speak now. Click the mic button again or press Enter to send.'}
    </div>
  );

  return (
    <main className={`main ${isHome ? 'home-mode' : ''}`}>
      {toast && (
        <div className="toast-wrap" onClick={clearToast} style={{cursor:'pointer'}}>
          <div className={`toast-inner ${toast.type === 'error' ? 'error' : 'info'}`}>
            {toast.type === 'error' ? '⚠️' : '⚡'} {toast.text}
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="hdr">
        <button className="ibtn" onClick={toggleSidebar} title="Toggle sidebar"><Menu size={15}/></button>
        <div className="hdr-chat">
          <span className="chat-ttl">{activeConv?.title || 'New Chat'}</span>
          <div className="hsep"/>
        </div>
        <ModelPicker/>
        <div className="hdr-chat-right">
          <SearchToggle/>
          <div className="hsep"/>
          <button className="ibtn" onClick={handleExport} title="Export conversation"><Download size={14}/></button>
        </div>
        <div className="hdr-spacer"/>
        <div className="hdr-right">
          <button className="ibtn" onClick={cycleTheme} title="Toggle light/dark">
            {theme === 'light' ? <Moon size={14}/> : <Sun size={14}/>}
          </button>
        </div>
      </header>

      {isHome ? (
        /* HOME SCREEN */
        <div key="home" className="home-screen">
          <div className="home-inner">
            <div className="home-greeting">
              {getGreeting()}{' '}
              {displayName
                ? <span className="home-name">{displayName}</span>
                : <span className="home-name-sk"/>}.
            </div>
            <div className="home-sub">What are you building today?</div>

            <div className="home-inp-wrap">
              {FilePill}
              {VoiceHint}
              <form onSubmit={handleSend} className="inp-box">
                <textarea ref={textareaRef} rows={1} value={input}
                  onChange={e => { setInput(e.target.value); autoResize(e.target); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything… (Enter to send)"/>
                {InputControls}
              </form>
            </div>

            <div className="qa-chips">
              {QUICK_ACTIONS.map(({ Icon, label, prefill: text }) => (
                <button key={label} className="qa-chip" onClick={() => prefill(text)}>
                  <Icon size={13}/> {label}
                </button>
              ))}
            </div>

            <div className="home-stats">
              <div className="home-stat">
                <div className="home-stat-val">{conversations.length}</div>
                <div className="home-stat-lbl">Chats</div>
              </div>
              <div className="home-stat">
                <div className="home-stat-val" style={{color:'var(--ok)'}}>{models.length || '—'}</div>
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
        /* CHAT SCREEN */
        <div key={activeConversationId} className="chat-content">
          <div className="msgs">
            <div className="mwrap">
              {messages.map(msg => (
                <MessageBubble key={msg._id || msg.id} message={msg} displayName={displayName}/>
              ))}
              {isLoading && (
                <div className="msg ai">
                  <div className="mhd">
                    <div className="mav a">AI</div>
                    <span className="mwho">ZexoChat</span>
                  </div>
                  <div className="loading-dots"><span/><span/><span/></div>
                </div>
              )}
              <div ref={messagesEndRef}/>
            </div>
          </div>

          {/* INPUT AREA */}
          <div className="inp-area">
            <div className="inp-inner">
              {FilePill}
              {VoiceHint}
              <form onSubmit={handleSend} className="inp-box">
                <textarea ref={textareaRef} rows={1} value={input}
                  onChange={e => { setInput(e.target.value); autoResize(e.target); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"/>
                {InputControls}
              </form>
              <div className="inp-hint">
                <span>{activeModel?.name || selectedModel}</span>
                &nbsp;·&nbsp;Web search {searchEnabled ? 'ON' : 'OFF'}
                {attachedFile && <>&nbsp;·&nbsp;<span style={{color:'var(--ac)'}}>📎 {attachedFile.name}</span></>}
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