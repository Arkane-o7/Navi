import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore, Message } from './stores/chatStore';
import { useSettingsStore } from './stores/settingsStore';
import { useAuthStore } from './stores/authStore';
import { streamChat, ChatMessage } from './hooks/useChat';
import { Markdown } from './components/Markdown';

// ─────────────────────────────────────────────────────────────
// Panel Constants (CSS-based sizing)
// ─────────────────────────────────────────────────────────────
const PANEL_WIDTH = 640;
const PANEL_MIN_HEIGHT = 54; // Input only
const PANEL_MAX_HEIGHT = 480; // Max expanded height
const PANEL_TOP_OFFSET = 120; // Distance from top of screen

export default function App() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
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

  // Get theme from settings
  const { theme } = useSettingsStore();
  const { refreshAuth, syncUser } = useAuthStore();

  // Initialize auth and listen for auth callback from main process
  useEffect(() => {
    const { setTokens } = useAuthStore.getState();

    const initAuth = async () => {
      await refreshAuth();
      await syncUser();
    };
    initAuth();

    // Listen for auth callback from main process (when user signs in via Settings)
    if (window.navi?.onAuthCallback) {
      const unsubAuth = window.navi.onAuthCallback(async (data) => {
        console.log('[App] Received auth callback:', data.userId);
        setTokens(data.accessToken, data.refreshToken);
        await syncUser();
      });

      // Refresh every 5 minutes
      const interval = setInterval(() => {
        refreshAuth();
      }, 5 * 60 * 1000);

      return () => {
        unsubAuth();
        clearInterval(interval);
      };
    }

    // Refresh every 5 minutes (fallback if no IPC)
    const interval = setInterval(() => {
      refreshAuth();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshAuth, syncUser]);

  // ─────────────────────────────────────────────────────────────
  // Apply Theme + Cross-Window Sync via IPC
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const getEffectiveTheme = (t: string) => {
      if (t === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return t;
    };

    document.documentElement.setAttribute('data-theme', getEffectiveTheme(theme));

    // Listen for system theme changes if using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        document.documentElement.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  // Listen for theme changes from settings window via IPC
  useEffect(() => {
    if (!window.navi?.onThemeChange) return;

    const { setTheme } = useSettingsStore.getState();

    const unsubscribe = window.navi.onThemeChange((newTheme: string) => {
      console.log('[App] Theme changed via IPC:', newTheme);
      setTheme(newTheme as 'system' | 'dark' | 'light');
    });

    return unsubscribe;
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Mouse Event Handlers for Click-Through Behavior
  // ─────────────────────────────────────────────────────────────
  const handleMouseEnter = useCallback(() => {
    window.navi?.mouseEnter();
  }, []);

  const handleMouseLeave = useCallback(() => {
    window.navi?.mouseLeave();
  }, []);

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
    });

    return unsubShow;
  }, []);

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

    // Prepare message history for context (exclude the placeholder we just added)
    // Note: messages is the snapshot BEFORE we added the user message, which is correct
    const historyForApi: ChatMessage[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    console.log('[Submit] History being sent:', JSON.stringify(historyForApi, null, 2));
    console.log('[Submit] Current message:', userInput);

    await streamChat({
      message: userInput,
      history: historyForApi,
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
        // Handle specific error codes
        const errorCode = (error as Error & { code?: string }).code;

        if (errorCode === 'DAILY_LIMIT_REACHED') {
          // Remove the placeholder message and show upgrade prompt
          updateMessage(convId!, assistantId, '');
          setShowUpgradePrompt(true);
        } else if (errorCode === 'UNAUTHORIZED') {
          // Show auth prompt
          updateMessage(convId!, assistantId, '');
          setShowAuthPrompt(true);
        } else {
          updateMessage(convId!, assistantId, `Error: ${error.message}`);
        }

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
    <div className="overlay-container">
      {/* The actual command palette panel */}
      <div
        className={`flow-panel ${hasContent ? 'expanded' : ''}`}
        ref={panelRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          width: PANEL_WIDTH,
          maxHeight: PANEL_MAX_HEIGHT,
          marginTop: PANEL_TOP_OFFSET,
        }}
      >
        {/* Messages */}
        {hasContent && (
          <div className="messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="message-avatar assistant">N</div>
                )}
                <div className="message-content">
                  <Markdown content={getMessageContent(msg)} />
                  {msg.id === streamingMessageId && <span className="typing-cursor" />}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

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

        {/* Daily Limit Reached Modal */}
        {showUpgradePrompt && (
          <div className="prompt-overlay">
            <div className="prompt-card">
              <div className="prompt-icon">⏰</div>
              <h3>You've reached today's limit</h3>
              <p>You've used all 20 free messages for today. Come back tomorrow for more!</p>
              <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px' }}>Pro plan with unlimited messages coming soon.</p>
              <div className="prompt-actions">
                <button
                  className="prompt-button primary"
                  onClick={() => setShowUpgradePrompt(false)}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Auth Prompt Modal (optional sign-in) */}
        {showAuthPrompt && (
          <div className="prompt-overlay">
            <div className="prompt-card">
              <div className="prompt-icon">👋</div>
              <h3>Sign in for more features</h3>
              <p>Create a free account to sync your conversations across devices.</p>
              <div className="prompt-actions">
                <button
                  className="prompt-button primary"
                  onClick={() => {
                    window.navi?.login();
                    setShowAuthPrompt(false);
                  }}
                >
                  Sign In
                </button>
                <button
                  className="prompt-button secondary"
                  onClick={() => setShowAuthPrompt(false)}
                >
                  Continue without signing in
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
