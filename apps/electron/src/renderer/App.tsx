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

interface SearchResult {
  id: string;
  type: 'app' | 'action' | 'chat';
  title: string;
  subtitle?: string;
  icon?: string;
  action?: string;
}

declare global {
  interface Window {
    navi: {
      hide: () => void;
      resize: (height: number) => void;
      openExternal: (url: string) => void;
      getTheme: () => Promise<boolean>;
      search: (query: string) => Promise<SearchResult[]>;
      execute: (action: string) => Promise<any>;
      onShow: (fn: () => void) => () => void;
      onHide: (fn: () => void) => () => void;
    };
  }
}

export default function App() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'search' | 'chat'>('search');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

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
  const calculateHeight = useCallback((messageCount: number, resultCount: number, currentMode: 'search' | 'chat'): number => {
    if (currentMode === 'search') {
      // Search mode: input + results
      const RESULT_HEIGHT = 50;
      if (resultCount === 0) {
        return INPUT_HEIGHT + BORDER_HEIGHT;
      }
      const resultsHeight = Math.min(resultCount, 5) * RESULT_HEIGHT;
      return INPUT_HEIGHT + resultsHeight + BORDER_HEIGHT;
    } else {
      // Chat mode: input + messages + footer
      if (messageCount === 0) {
        return INPUT_HEIGHT + BORDER_HEIGHT;
      }
      
      // Calculate messages height (capped at max visible)
      const visibleMessages = Math.min(messageCount, MAX_VISIBLE_MESSAGES);
      const messagesHeight = visibleMessages * MESSAGE_HEIGHT;
      
      return INPUT_HEIGHT + messagesHeight + FOOTER_HEIGHT + BORDER_HEIGHT;
    }
  }, []);

  const updateHeight = useCallback(() => {
    if (!window.navi) return;
    const height = calculateHeight(messages.length, searchResults.length, mode);
    console.log(`[Renderer] Resizing to ${height}px (mode: ${mode})`);
    window.navi.resize(height);
  }, [messages.length, searchResults.length, mode, calculateHeight]);

  // Update height when message count changes
  useEffect(() => {
    console.log(`[Renderer] Content changed (mode: ${mode}, messages: ${messages.length}, results: ${searchResults.length})`);
    updateHeight();
  }, [messages.length, searchResults.length, mode, updateHeight]);

  // ─────────────────────────────────────────────────────────────
  // Search Handler (Mage-inspired)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'search' && input.trim()) {
      const searchDebounce = setTimeout(async () => {
        try {
          const results = await window.navi.search(input);
          setSearchResults(results);
          setSelectedIndex(0);
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        }
      }, 150);

      return () => clearTimeout(searchDebounce);
    } else if (mode === 'search') {
      setSearchResults([]);
    }
  }, [input, mode]);

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
      // Reset to search mode on show
      setMode('search');
      setSearchResults([]);
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
        if (mode === 'chat' && messages.length > 0) {
          // In chat mode with messages, go back to search
          setMode('search');
          setInput('');
        } else {
          // Otherwise, hide the window
          window.navi?.hide();
        }
      }
      
      // Navigation in search mode
      if (mode === 'search' && searchResults.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % searchResults.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
        }
      }

      // Chat mode shortcuts
      if (mode === 'chat') {
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, searchResults, conversation, clearConversation, createConversation, messages]);

  // ─────────────────────────────────────────────────────────────
  // Submit Handler
  // ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Submit] Input:', input, 'Mode:', mode);
    if (!input.trim() || isLoading) return;

    if (mode === 'search') {
      // Execute selected search result
      if (searchResults.length > 0) {
        const selected = searchResults[selectedIndex];
        console.log('[Search] Executing:', selected);
        
        if (selected.type === 'chat') {
          // Switch to chat mode with the query
          setMode('chat');
          setSearchResults([]);
          // Continue to chat logic below
        } else {
          // Execute other actions
          try {
            const result = await window.navi.execute(selected.action || '');
            if (result.success) {
              window.navi.hide();
            }
          } catch (error) {
            console.error('Execute error:', error);
          }
          return;
        }
      }
    }

    // Chat mode logic
    if (mode === 'chat') {
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
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  const hasContent = mode === 'chat' ? messages.length > 0 : searchResults.length > 0;

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
            placeholder={mode === 'search' ? "Search apps or ask Navi..." : "Ask Navi anything..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
        </form>

        {isLoading && <div className="input-loading" />}
      </div>

      {/* Search Results (Mage-inspired) */}
      {mode === 'search' && searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map((result, index) => (
            <div
              key={result.id}
              className={`search-result ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => {
                setSelectedIndex(index);
                // Create a proper form submit event
                const form = containerRef.current?.querySelector('form');
                if (form) {
                  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
              }}
            >
              <div className="result-icon">{result.icon}</div>
              <div className="result-content">
                <div className="result-title">{result.title}</div>
                {result.subtitle && <div className="result-subtitle">{result.subtitle}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      {mode === 'chat' && messages.length > 0 && (
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
      {mode === 'chat' && messages.length > 0 && (
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
            <span>Back</span>
          </div>
        </div>
      )}
    </div>
  );
}
