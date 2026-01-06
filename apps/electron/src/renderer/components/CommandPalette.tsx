import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SearchResult, SearchResultItem } from './SearchResult';
import { Markdown } from './Markdown';
import { useChatStore, Message } from '../stores/chatStore';
import { streamChat } from '../hooks/useChat';

// Helper to open external links
const openExternal = (url: string) => {
  window.navi?.openExternal(url);
};

// Default commands available in the palette
const defaultCommands: SearchResultItem[] = [
  {
    id: 'chat',
    name: 'Ask Navi',
    description: 'Start a conversation with AI assistant',
    icon: { type: 'emoji', value: '✨' },
    type: 'command',
  },
  {
    id: 'clear',
    name: 'Clear Conversation',
    description: 'Clear the current chat history',
    icon: { type: 'emoji', value: '🗑️' },
    type: 'command',
  },
  {
    id: 'new',
    name: 'New Conversation',
    description: 'Start a fresh conversation',
    icon: { type: 'emoji', value: '➕' },
    type: 'command',
  },
  {
    id: 'google',
    name: 'Search Google',
    description: 'Search the web with Google',
    icon: { type: 'emoji', value: '🔍' },
    type: 'link',
  },
  {
    id: 'github',
    name: 'Search GitHub',
    description: 'Search repositories on GitHub',
    icon: { type: 'emoji', value: '🐙' },
    type: 'link',
  },
  {
    id: 'youtube',
    name: 'Search YouTube',
    description: 'Search videos on YouTube',
    icon: { type: 'emoji', value: '▶️' },
    type: 'link',
  },
];

// Safe math expression evaluator using recursive descent parsing
function evaluateMath(expr: string): string | null {
  try {
    const sanitized = expr.replace(/\s/g, '');
    if (!/^[0-9+\-*/.()]+$/.test(sanitized)) return null;
    if (sanitized.length === 0) return null;
    
    let pos = 0;
    
    const parseNumber = (): number => {
      let numStr = '';
      while (pos < sanitized.length && /[0-9.]/.test(sanitized[pos])) {
        numStr += sanitized[pos++];
      }
      return parseFloat(numStr);
    };
    
    const parseFactor = (): number => {
      if (sanitized[pos] === '(') {
        pos++; // skip '('
        const result = parseExpression();
        pos++; // skip ')'
        return result;
      }
      if (sanitized[pos] === '-') {
        pos++;
        return -parseFactor();
      }
      return parseNumber();
    };
    
    const parseTerm = (): number => {
      let result = parseFactor();
      while (pos < sanitized.length && (sanitized[pos] === '*' || sanitized[pos] === '/')) {
        const op = sanitized[pos++];
        const right = parseFactor();
        result = op === '*' ? result * right : result / right;
      }
      return result;
    };
    
    const parseExpression = (): number => {
      let result = parseTerm();
      while (pos < sanitized.length && (sanitized[pos] === '+' || sanitized[pos] === '-')) {
        const op = sanitized[pos++];
        const right = parseTerm();
        result = op === '+' ? result + right : result - right;
      }
      return result;
    };
    
    const result = parseExpression();
    
    if (pos !== sanitized.length || !isFinite(result) || isNaN(result)) {
      return null;
    }
    
    if (Number.isInteger(result)) {
      return result.toLocaleString();
    }
    return result.toLocaleString(undefined, { maximumFractionDigits: 6 });
  } catch {
    return null;
  }
}

// Chat trigger words for detecting conversational queries
const CHAT_TRIGGERS = [
  'ask', 'what', 'how', 'why', 'when', 'where', 'who', 
  'can', 'could', 'would', 'should', 'is', 'are', 'do', 
  'does', 'tell', 'explain'
] as const;

interface CommandPaletteProps {
  onClose: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<'search' | 'chat'>('search');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    getActiveConversation,
    createConversation,
    addMessage,
    updateMessage,
    clearConversation,
  } = useChatStore();

  const conversation = getActiveConversation();
  const messages = conversation?.messages ?? [];

  // Filter results based on query
  const searchResults = useCallback((): SearchResultItem[] => {
    if (mode === 'chat') return [];
    
    if (!query.trim()) {
      return defaultCommands.slice(0, 5); // Show first 5 commands by default
    }

    const lowerQuery = query.toLowerCase();
    const results: SearchResultItem[] = [];
    
    // Check for math expression
    const mathResult = evaluateMath(query);
    if (mathResult !== null) {
      results.push({
        id: 'math-result',
        name: `= ${mathResult}`,
        description: `Result of: ${query}`,
        icon: { type: 'emoji', value: '🔢' },
        type: 'command',
      });
    }
    
    // Check if user wants to chat (starts with common chat triggers)
    const firstWord = lowerQuery.split(' ')[0];
    
    // Filter commands that match
    const matchingCommands = defaultCommands.filter(cmd => 
      cmd.name.toLowerCase().includes(lowerQuery) ||
      cmd.description?.toLowerCase().includes(lowerQuery)
    );
    
    results.push(...matchingCommands);
    
    // Add web search options for queries
    if (query.length > 2) {
      // Add quick web search options
      if (!matchingCommands.some(c => c.id === 'google')) {
        results.push({
          id: 'google-search',
          name: `Search Google: "${query}"`,
          description: 'Open Google search results',
          icon: { type: 'emoji', value: '🔍' },
          type: 'link',
          action: () => openExternal(`https://www.google.com/search?q=${encodeURIComponent(query)}`),
        });
      }
      
      // Chat suggestion for conversational queries
      if (CHAT_TRIGGERS.includes(firstWord as typeof CHAT_TRIGGERS[number]) || query.length > 15) {
        results.unshift({
          id: 'chat-query',
          name: `Ask Navi: "${query.slice(0, 40)}${query.length > 40 ? '...' : ''}"`,
          description: 'Get an AI-powered answer',
          icon: { type: 'emoji', value: '✨' },
          type: 'chat',
        });
      }
    }

    // If no results and query is substantial, suggest chat
    if (results.length === 0 && query.length > 2) {
      results.push({
        id: 'chat-query',
        name: `Ask Navi: "${query}"`,
        description: 'Get an AI-powered answer',
        icon: { type: 'emoji', value: '✨' },
        type: 'chat',
      });
    }

    return results.slice(0, 6); // Limit to 6 results
  }, [query, mode]);

  const results = searchResults();

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle executing an action
  const executeAction = async (item: SearchResultItem) => {
    switch (item.id) {
      case 'chat':
      case 'chat-query':
        setMode('chat');
        if (item.id === 'chat-query') {
          // Execute the chat query immediately
          await handleChatSubmit(query);
        }
        setQuery('');
        break;
      case 'clear':
        if (conversation) {
          clearConversation(conversation.id);
        }
        setQuery('');
        break;
      case 'new':
        createConversation();
        setQuery('');
        break;
      case 'math-result':
        // Copy result to clipboard
        if (item.name.startsWith('= ')) {
          navigator.clipboard.writeText(item.name.slice(2));
        }
        setQuery('');
        break;
      case 'google':
        openExternal(`https://www.google.com/search?q=${encodeURIComponent(query || '')}`);
        onClose();
        break;
      case 'google-search':
        openExternal(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
        onClose();
        break;
      case 'github':
        openExternal(`https://github.com/search?q=${encodeURIComponent(query || '')}`);
        onClose();
        break;
      case 'youtube':
        openExternal(`https://www.youtube.com/results?search_query=${encodeURIComponent(query || '')}`);
        onClose();
        break;
      default:
        if (item.action) {
          item.action();
        } else if (item.type === 'link') {
          // Generic link handling
          onClose();
        }
    }
  };

  // Handle chat submission
  const handleChatSubmit = async (message: string) => {
    if (!message.trim() || isLoading) return;

    let convId = conversation?.id;
    if (!convId) {
      convId = createConversation();
    }

    addMessage(convId, { role: 'user', content: message.trim() });
    setIsLoading(true);

    const assistantId = addMessage(convId, { role: 'assistant', content: '' });
    setStreamingMessageId(assistantId);
    setStreamingContent('');

    let fullContent = '';

    await streamChat({
      message: message.trim(),
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

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode === 'search') {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            executeAction(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    } else {
      // Chat mode
      switch (e.key) {
        case 'Enter':
          if (!e.shiftKey) {
            e.preventDefault();
            handleChatSubmit(query);
            setQuery('');
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (messages.length === 0) {
            setMode('search');
          } else {
            onClose();
          }
          break;
      }
    }
  };

  // Handle back to search
  const handleBackToSearch = () => {
    setMode('search');
    setQuery('');
  };

  const getMessageContent = (msg: Message): string => {
    if (msg.id === streamingMessageId) {
      return streamingContent;
    }
    return msg.content;
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="command-palette">
      {/* Header with Back Button */}
      {mode === 'chat' && (
        <div className="palette-header">
          <button className="back-button" onClick={handleBackToSearch}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="header-title">Chat with Navi</span>
        </div>
      )}

      {/* Search Input */}
      <div className={`palette-input-container ${mode === 'chat' && hasMessages ? 'has-content' : ''}`}>
        <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {mode === 'search' ? (
            <>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </>
          ) : (
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          )}
        </svg>

        <input
          ref={inputRef}
          className="palette-input"
          type="text"
          placeholder={mode === 'search' ? 'Search commands or ask anything...' : 'Ask Navi anything...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />

        {isLoading && <div className="input-loading" />}
      </div>

      {/* Search Results */}
      {mode === 'search' && results.length > 0 && (
        <div className="palette-results">
          {results.map((result, index) => (
            <SearchResult
              key={result.id}
              item={result}
              isActive={index === selectedIndex}
              onClick={() => executeAction(result)}
              onMouseEnter={() => setSelectedIndex(index)}
            />
          ))}
        </div>
      )}

      {/* Chat Messages */}
      {mode === 'chat' && hasMessages && (
        <div className="palette-messages">
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
      <div className="palette-footer">
        <div className="shortcuts">
          {mode === 'search' ? (
            <>
              <div className="shortcut">
                <span className="key">↑↓</span>
                <span>Navigate</span>
              </div>
              <div className="shortcut">
                <span className="key">↵</span>
                <span>Select</span>
              </div>
            </>
          ) : (
            <>
              <div className="shortcut">
                <span className="key">⌘K</span>
                <span>Clear</span>
              </div>
              <div className="shortcut">
                <span className="key">⌘N</span>
                <span>New</span>
              </div>
            </>
          )}
        </div>
        <div className="shortcut">
          <span className="key">esc</span>
          <span>{mode === 'chat' && messages.length === 0 ? 'Back' : 'Close'}</span>
        </div>
      </div>
    </div>
  );
}
