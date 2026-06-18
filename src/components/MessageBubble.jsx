import { useState } from 'react';
import { GUEST_NAME } from '../constants';

// ── Inline markdown: bold, italic, bold+italic, inline code, links ──────────
function parseInline(text, baseKey) {
  const pattern = /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*[\s\S]+?\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = [];
  let last = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    parts.push(match[0]);
    last = pattern.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));

  return parts.map((part, i) => {
    const key = `${baseKey}-${i}`;
    if (part.startsWith('***') && part.endsWith('***')) {
      return <strong key={key}><em>{part.slice(3, -3)}</em></strong>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <span key={key} className="ic">{part.slice(1, -1)}</span>;
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a key={key} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ac)' }}>
          {linkMatch[1]}
        </a>
      );
    }
    return <span key={key}>{part}</span>;
  });
}

// ── Code block with functional Copy button ────────────────────────────────
function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="cb">
      <div className="cb-hdr">
        <span className="cb-lang">{language || 'code'}</span>
        <button className="cb-copy" onClick={handleCopy} style={copied ? { color: 'var(--ac)' } : undefined}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

// ── Full block-level markdown renderer ────────────────────────────────────
function parseMessageContent(content) {
  if (!content) return null;

  // Split out fenced code blocks first
  const segments = content.split(/(```[\s\S]*?```)/g);

  return segments.map((seg, segIdx) => {
    // ── Fenced code block
    if (seg.startsWith('```') && seg.endsWith('```')) {
      const inner = seg.slice(3, -3);
      const firstNewline = inner.indexOf('\n');
      let language = '';
      let code = inner;
      if (firstNewline !== -1) {
        const firstLine = inner.slice(0, firstNewline).trim();
        if (firstLine && !firstLine.includes(' ')) {
          language = firstLine;
          code = inner.slice(firstNewline + 1);
        }
      }
      return <CodeBlock key={segIdx} language={language} code={code} />;
    }

    // ── Block-level parsing (headers, lists, paragraphs)
    const lines = seg.split('\n');
    const blocks = [];
    let listItems = [];
    let listType = null; // 'ul' | 'ol'

    const flushList = () => {
      if (listItems.length === 0) return;
      if (listType === 'ul') {
        blocks.push(<ul key={`ul-${blocks.length}`}>{listItems}</ul>);
      } else {
        blocks.push(<ol key={`ol-${blocks.length}`}>{listItems}</ol>);
      }
      listItems = [];
      listType = null;
    };

    lines.forEach((line, lineIdx) => {
      const key = `${segIdx}-${lineIdx}`;

      // ── ATX Headers
      const h3 = line.match(/^### (.+)/);
      const h2 = line.match(/^## (.+)/);
      const h1 = line.match(/^# (.+)/);
      if (h1 || h2 || h3) {
        flushList();
        const text = (h1 || h2 || h3)[1];
        if (h1) blocks.push(<h1 key={key} style={{ fontSize: '15px', fontWeight: 700, marginTop: '10px' }}>{parseInline(text, key)}</h1>);
        else if (h2) blocks.push(<h2 key={key} style={{ fontSize: '14px', fontWeight: 700, marginTop: '8px' }}>{parseInline(text, key)}</h2>);
        else blocks.push(<h3 key={key} style={{ fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{parseInline(text, key)}</h3>);
        return;
      }

      // ── Unordered list item
      const ulMatch = line.match(/^[\-\*\+] (.+)/);
      if (ulMatch) {
        if (listType === 'ol') flushList();
        listType = 'ul';
        listItems.push(<li key={key}>{parseInline(ulMatch[1], key)}</li>);
        return;
      }

      // ── Ordered list item
      const olMatch = line.match(/^\d+\. (.+)/);
      if (olMatch) {
        if (listType === 'ul') flushList();
        listType = 'ol';
        listItems.push(<li key={key}>{parseInline(olMatch[1], key)}</li>);
        return;
      }

      // ── Horizontal rule
      if (/^[-*_]{3,}$/.test(line.trim())) {
        flushList();
        blocks.push(<hr key={key} style={{ border: 'none', borderTop: '1px solid var(--bd)', margin: '10px 0' }} />);
        return;
      }

      // ── Empty line — flush list and add spacing
      if (line.trim() === '') {
        flushList();
        return;
      }

      // ── Normal text paragraph
      flushList();
      blocks.push(<p key={key}>{parseInline(line, key)}</p>);
    });

    flushList(); // flush any trailing list
    return <div key={segIdx}>{blocks}</div>;
  });
}

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ── MessageBubble component ───────────────────────────────────────────────
function MessageBubble({ message, displayName }) {
  const isUser = message.role === 'user';
  const name = displayName || GUEST_NAME;

  return (
    <div className={`msg ${isUser ? 'user' : 'ai'}`}>
      <div className="mhd">
        <div className={`mav ${isUser ? 'u' : 'a'}`}>{isUser ? name.charAt(0).toUpperCase() : 'AI'}</div>
        <span className="mwho">{isUser ? name : 'ZexoChat'}</span>
        <span className="mts">{formatTime(message.createdAt)}</span>
        {!isUser && message.modelUsed && <span className="mtag">{message.modelUsed}</span>}
      </div>
      <div className="mbody">
        {parseMessageContent(message.content)}
      </div>
    </div>
  );
}

export default MessageBubble;