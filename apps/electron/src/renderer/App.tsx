import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore, Message } from './stores/chatStore';
import { useSettingsStore } from './stores/settingsStore';
import { useAuthStore } from './stores/authStore';
import { streamChat, ChatMessage } from './hooks/useChat';
import { Markdown } from './components/Markdown';
import { logger } from '../shared/logger';

// Logo images for light/dark modes
import logoDark from '../../assets/logo-dark.png';
import logoLight from '../../assets/logo-light.png';

// ─────────────────────────────────────────────────────────────
// Panel Constants (CSS-based sizing)
// ─────────────────────────────────────────────────────────────
const PANEL_WIDTH = 640;
const PANEL_MIN_HEIGHT = 54; // Input only
const PANEL_MAX_HEIGHT = 480; // Max expanded height
const PANEL_TOP_OFFSET = 120; // Distance from top of screen
const DOCK_WIDTH = 420;
const DOCK_PADDING = 12;

// Platform detection for keyboard shortcuts
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const MOD_KEY = isMac ? '⌘' : 'Alt';
const MOD_SYMBOL = isMac ? '⌘' : 'Alt+';

// Detect if launched in docked mode via URL query param
const IS_DOCKED = new URLSearchParams(window.location.search).get('docked') === 'true';

export default function App() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [isDocked, setIsDocked] = useState(IS_DOCKED);

  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // Drag state for panel positioning
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: PANEL_TOP_OFFSET });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panelX: 0, panelY: 0 });

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

  // Get theme + dock behavior from settings
  const { theme, dockBehavior } = useSettingsStore();
  const { refreshAuth, syncUser } = useAuthStore();

  // Initialize auth and listen for auth callback from main process
  useEffect(() => {
    const { setTokens } = useAuthStore.getState();
    const { fetchFromCloud } = useChatStore.getState();

    const initAuth = async () => {
      await refreshAuth();
      await syncUser();
      // Fetch conversations from cloud if authenticated
      if (useAuthStore.getState().isAuthenticated) {
        fetchFromCloud();
      }
    };
    initAuth();

    // Listen for auth callback from main process (when user signs in via Settings)
    if (window.navi?.onAuthCallback) {
      const unsubAuth = window.navi.onAuthCallback(async (data) => {
        logger.debug('[App] Received auth callback:', data.userId);
        setTokens(data.accessToken, data.refreshToken);
        await syncUser();
        // Fetch conversations after sign in
        fetchFromCloud();
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
      logger.debug('[App] Theme changed via IPC:', newTheme);
      setTheme(newTheme as 'system' | 'dark' | 'light');
    });

    return unsubscribe;
  }, []);

  // Listen for dock behavior changes from settings window via IPC
  useEffect(() => {
    if (!window.navi?.onDockBehaviorChange) return;

    const { setDockBehavior } = useSettingsStore.getState();

    const unsubscribe = window.navi.onDockBehaviorChange((behavior) => {
      logger.debug('[App] Dock behavior changed via IPC:', behavior);
      setDockBehavior(behavior);
    });

    return unsubscribe;
  }, []);


  // ─────────────────────────────────────────────────────────────
  // Mouse Event Handlers for Click-Through Behavior
  // ─────────────────────────────────────────────────────────────
  const handleMouseEnter = useCallback(() => {
    if (!isDocked) {
      window.navi?.mouseEnter();
    }
  }, [isDocked]);

  const handleMouseLeave = useCallback(() => {
    if (!isDocked) {
      window.navi?.mouseLeave();
    }
  }, [isDocked]);

  // ─────────────────────────────────────────────────────────────
  // Drag Handlers for Panel Positioning
  // ─────────────────────────────────────────────────────────────
  const DRAG_EDGE_SIZE = 12; // pixels from edge where dragging is allowed

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (isDocked) return;

    // Only drag if clicking on the panel edge (not content)
    const target = e.target as HTMLElement;

    // Never drag from interactive elements or message content
    if (target.closest('input, button, .messages, .message-content, .prompt-overlay, a, code, pre')) return;

    // Check if click is near the edge of the panel
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const isNearLeftEdge = x < DRAG_EDGE_SIZE;
      const isNearRightEdge = x > rect.width - DRAG_EDGE_SIZE;
      const isNearTopEdge = y < DRAG_EDGE_SIZE;
      const isNearBottomEdge = y > rect.height - DRAG_EDGE_SIZE;

      // Also allow drag from the input bar area (bottom 54px) and footer
      const isInInputBar = target.closest('.input-bar');
      const isInFooter = target.closest('.footer');

      if (!isNearLeftEdge && !isNearRightEdge && !isNearTopEdge && !isNearBottomEdge && !isInInputBar && !isInFooter) {
        return; // Not near edge or drag zone, don't start drag
      }
    }

    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panelX: panelPosition.x,
      panelY: panelPosition.y,
    };
  }, [panelPosition, isDocked]);

  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (isDocked) return;
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    setPanelPosition({
      x: dragStartRef.current.panelX + deltaX,
      y: dragStartRef.current.panelY + deltaY,
    });
  }, [isDragging, isDocked]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDockToggle = useCallback(() => {
    if (isDocked) {
      // Undock: tell main process, which will close this window and restore overlay
      logger.debug('[App] Undock requested with side:', dockBehavior);
      window.navi?.dock({ docked: false, side: dockBehavior, width: DOCK_WIDTH });
    } else {
      // Dock: tell main process, which will hide this overlay and create a new docked window
      logger.debug('[App] Dock requested with side:', dockBehavior);
      window.navi?.dock({ docked: true, side: dockBehavior, width: DOCK_WIDTH });
    }
  }, [isDocked, dockBehavior]);

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
      // Platform-specific modifier key
      const modPressed = isMac ? e.metaKey : e.altKey;

      if (e.key === 'Escape' && !isDocked) {
        window.navi?.hide();
      }
      if (modPressed && e.key === 'n') {
        e.preventDefault();
        createConversation();
        setInput('');
        setStreamingContent('');
        setStreamingMessageId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createConversation]);

  // ─────────────────────────────────────────────────────────────
  // Submit Handler
  // ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.debug('[Submit] Input:', input);
    if (!input.trim() || isLoading) return;

    // Create conversation if none exists
    let convId = conversation?.id;
    if (!convId) {
      convId = createConversation();
      logger.debug('[Submit] Created conversation:', convId);
    }

    // Add user message
    logger.debug('[Submit] Adding user message');
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

    logger.debug('[Submit] History length being sent:', historyForApi.length);
    logger.debug('[Submit] Current message:', userInput);

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
          // Show inline message in chat instead of popup
          const limitMessage = `**You've reached today's limit**\n\nYou've used all 20 free messages for today. Come back tomorrow for more!\n\n_Pro plan with unlimited messages coming soon._`;
          updateMessage(convId!, assistantId, limitMessage);
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
    <div
      className={`overlay-container ${isDocked ? 'docked' : ''}`}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
    >
      {/* The actual command palette panel */}
      <div
        className={`flow-panel ${hasContent ? 'expanded' : ''} ${isDragging ? 'dragging' : ''}`}
        ref={panelRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleDragStart}
        style={{
          width: isDocked ? '100%' : PANEL_WIDTH,
          maxHeight: isDocked ? '100%' : PANEL_MAX_HEIGHT,
          height: isDocked ? '100%' : undefined,
          transform: isDocked ? 'none' : `translate(${panelPosition.x}px, ${panelPosition.y}px)`,
          cursor: !isDocked && isDragging ? 'grabbing' : undefined,
        }}
      >
        {/* Messages */}
        {hasContent && (
          <div className="messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="message-avatar assistant">
                    <img
                      src={theme === 'light' ? logoDark : logoLight}
                      alt="Navi"
                      style={{ width: 32, height: 32 }}
                    />
                  </div>
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
                <span className="key">{MOD_SYMBOL}N</span>
                <span>New</span>
              </div>
              <div className="shortcut">
                <span className="key">{MOD_SYMBOL}.</span>
                <span>Settings</span>
              </div>
            </div>
            <div className="footer-actions">
              <button
                className={`dock-toggle ${isDocked ? 'active' : ''}`}
                onClick={handleDockToggle}
                type="button"
                title={isDocked ? 'Undock window' : 'Dock window'}
              >
                <span className="dock-icon" aria-hidden="true">
                  {isDocked ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16v16H4z" />
                      <path d="M9 9h6v6H9z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16v16H4z" />
                      <path d="M15 4v16" />
                    </svg>
                  )}
                </span>
                <span className="dock-label">{isDocked ? 'Undock' : 'Dock'}</span>
              </button>
              <div className="shortcut">
                <span className="key">esc</span>
                <span>Close</span>
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
