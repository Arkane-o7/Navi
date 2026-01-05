import React, { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = 'https://navi-chat-api.vercel.app';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

declare global {
  interface Window {
    navi: {
      hide: () => void;
      resize: (height: number) => void;
      openExternal: (url: string) => void;
      onShow: (fn: () => void) => () => void;
      onHide: (fn: () => void) => () => void;
    };
  }
}

export default function App() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Resizing Logic ---
  const updateHeight = useCallback(() => {
    if (!containerRef.current || !window.navi) return;
    const height = containerRef.current.offsetHeight;
    window.navi.resize(height);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateHeight]);

  // Also force update on message changes
  useEffect(() => {
    updateHeight();
    // Double check after render
    requestAnimationFrame(updateHeight);
  }, [messages, updateHeight]);

  // --- Scroll Logic ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Event Listeners ---
  useEffect(() => {
    if (!window.navi) return;
    
    const unsubShow = window.navi.onShow(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
      updateHeight();
    });

    return () => {
      unsubShow();
    };
  }, [updateHeight]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.navi?.hide();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setMessages([]);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Chat Logic ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: query.trim() };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setIsLoading(true);

    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      });

      if (!res.ok) throw new Error('API Error');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setMessages(prev => 
                    prev.map(m => m.id === assistantId ? { ...m, content: fullContent } : m)
                  );
                }
              } catch {}
            }
          }
        }
      }
    } catch (err) {
      setMessages(prev => 
        prev.map(m => m.id === assistantId ? { ...m, content: 'Error: Could not connect to Navi.' } : m)
      );
    } finally {
      setIsLoading(false);
      // Focus back on input
      inputRef.current?.focus();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="app-container" ref={containerRef}>
      <div className={`search-section ${hasMessages ? 'has-content' : ''}`}>
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21L16.65 16.65" />
        </svg>
        <form onSubmit={handleSubmit} style={{ flex: 1 }}>
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Ask Navi..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </form>
      </div>

      {hasMessages && (
        <div className="messages-container">
          {messages.map(msg => (
            <div key={msg.id} className="message-item">
              <div className={`role-icon ${msg.role}`}>
                {msg.role === 'user' ? 'U' : 'N'}
              </div>
              <div className="message-content">
                {msg.content || (isLoading && msg.role === 'assistant' ? 'Thinking...' : '')}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {hasMessages && (
        <div className="footer">
          <div className="shortcut">
            <span className="key">⌘</span>
            <span className="key">K</span>
            <span>Clear</span>
          </div>
          <div className="shortcut">
            <span className="key">esc</span>
            <span>Close</span>
          </div>
        </div>
      )}
    </div>
  );
}
