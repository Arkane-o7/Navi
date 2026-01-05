import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore, Message } from './stores/chatStore';
import { streamChat } from './hooks/useChat';
import { Markdown } from './components/Markdown';

// ─────────────────────────────────────────────────────────────
// Height Constants (Cerebro-style calculation)
// ─────────────────────────────────────────────────────────────
const INPUT_HEIGHT = 54;
const MESSAGE_HEIGHT = 72; // Approximate height per message
const FOOTER_HEIGHT = 40;
const MAX_VISIBLE_MESSAGES = 5;
const BORDER_HEIGHT = 2; // 1px top + 1px bottom

declare global {
  interface Window {
    navi: {
      hide: () => void;
      resize: (height: number) => void;
      openExternal: (url: string) => void;
      getTheme: () => Promise<boolean>;
      onShow: (fn: () => void) => () => void;
      onHide: (fn: () => void) => () => void;
    };
  }
}

export default function App() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    getActiveConversation,
    createConversation,
    addMessage,
    updateMessage,
    setActiveConversation,
    clearConversation,
  } = useChatStore();

  const conversation = getActiveConversation();
  const messages = conversation?.messages ?? [];

  // ─────────────────────────────────────────────────────────────
  // Window Resize (Cerebro-style calculation)
  // ─────────────────────────────────────────────────────────────
  const calculateHeight = useCallback((messageCount: number): number => {
    if (messageCount === 0) {
      return INPUT_HEIGHT + BORDER_HEIGHT;
    }
    
    // Calculate messages height (capped at max visible)
    const visibleMessages = Math.min(messageCount, MAX_VISIBLE_MESSAGES);
    const messagesHeight = visibleMessages * MESSAGE_HEIGHT;
    
    return INPUT_HEIGHT + messagesHeight + FOOTER_HEIGHT + BORDER_HEIGHT;
  }, []);

  const updateHeight = useCallback(() => {
    if (!window.navi) return;
    const height = calculateHeight(messages.length);
    console.log(`[Renderer] Resizing to ${height}px for ${messages.length} messages`);
    window.navi.resize(height);
  }, [messages.length, calculateHeight]);

  // Update height when message count changes
  useEffect(() => {
    console.log(`[Renderer] Messages changed: ${messages.length}`);
    updateHeight();
  }, [messages.length, updateHeight]);

  // ─────────────────────────────────────────────────────────────
  // Auto-scroll
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // ─────────────────────────────────────────────────────────────
  // Window Events
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!window.navi) return;

    const unsubShow = window.navi.onShow(() => {
      inputRef.current?.focus();
      updateHeight();
    });

    return unsubShow;
  }, [updateHeight]);

  // ─────────────────────────────────────────────────────────────
  // Keyboard Shortcuts
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.navi?.hide();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (conversation) {
          clearConversation(conversation.id);
        }
        setInput('');
        setStreamingContent('');
        setStreamingMessageId(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        createConversation();
        setInput('');
        setStreamingContent('');
        setStreamingMessageId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [conversation, clearConversation, createConversation]);

  // ─────────────────────────────────────────────────────────────
  // Submit Handler
  // ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Submit] Input:', input);
    if (!input.trim() || isLoading) return;

    // Create conversation if none exists
    let convId = conversation?.id;
    if (!convId) {
      convId = createConversation();
      console.log('[Submit] Created conversation:', convId);
    }

    // Add user message
    console.log('[Submit] Adding user message');
    addMessage(convId, { role: 'user', content: input.trim() });
    const userInput = input.trim();
    setInput('');
    setIsLoading(true);

    // Create placeholder for assistant message
    const assistantId = addMessage(convId, { role: 'assistant', content: '' });
    setStreamingMessageId(assistantId);
    setStreamingContent('');

    // Stream response
    let fullContent = '';

    await streamChat({
      message: userInput,
      onChunk: (chunk) => {
        fullContent += chunk;
        setStreamingContent(fullContent);
      },
      onDone: () => {
        updateMessage(convId!, assistantId, fullContent);
        setStreamingContent('');
        setStreamingMessageId(null);
        setIsLoading(false);
        inputRef.current?.focus();
      },
      onError: (error) => {
        updateMessage(convId!, assistantId, `Error: ${error.message}`);
        setStreamingContent('');
        setStreamingMessageId(null);
        setIsLoading(false);
        inputRef.current?.focus();
      },
    });
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  const hasContent = messages.length > 0;

  const getMessageContent = (msg: Message): string => {
    if (msg.id === streamingMessageId) {
      return streamingContent;
    }
    return msg.content;
  };

  return (
    <div className="flow-container" ref={containerRef}>
      {/* Input Bar */}
      <div className={`input-bar ${hasContent ? 'has-content' : ''}`}>
        <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex' }}>
          <input
            ref={inputRef}
            className="input-field"
            type="text"
            placeholder="Ask Navi anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
        </form>

        {isLoading && <div className="input-loading" />}
      </div>

      {/* Messages */}
      {hasContent && (
        <div className="messages">
          {messages.map((msg) => (
            <div key={msg.id} className="message">
              <div className={`message-avatar ${msg.role}`}>
                {msg.role === 'user' ? 'U' : 'N'}
              </div>
              <div className="message-content">
                <Markdown content={getMessageContent(msg)} />
                {msg.id === streamingMessageId && <span className="typing-cursor" />}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Footer */}
      {hasContent && (
        <div className="footer">
          <div className="shortcuts">
            <div className="shortcut">
              <span className="key">⌘K</span>
              <span>Clear</span>
            </div>
            <div className="shortcut">
              <span className="key">⌘N</span>
              <span>New</span>
            </div>
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
