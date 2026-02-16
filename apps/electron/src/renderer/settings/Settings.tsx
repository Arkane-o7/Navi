import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';
import { logger } from '../../shared/logger';

type Tab = 'general' | 'cloud-sync' | 'advanced';

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Recommended)' },
  { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Faster)' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
];

const THEMES = [
  { id: 'system', name: 'System Default' },
  { id: 'dark', name: 'Dark' },
  { id: 'light', name: 'Light' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [authError, setAuthError] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>('Loading...');

  const {
    theme,
    dockBehavior,
    model,
    historyWindowSize,
    setTheme,
    setDockBehavior,
    setModel,
    setHistoryWindowSize,
    syncFromCloud,
    syncToCloud,
  } = useSettingsStore();
  const { user, subscription, isAuthenticated, setTokens, logout, syncUser } = useAuthStore();

  // Apply theme to settings window
  useEffect(() => {
    const getEffectiveTheme = () => {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return theme;
    };

    document.documentElement.setAttribute('data-theme', getEffectiveTheme());

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        document.documentElement.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  // Sync user data on mount and when window becomes visible/focused
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        logger.debug('[Settings] Window visible, syncing user data');
        syncUser();
      }
    };

    const handleFocus = () => {
      if (isAuthenticated) {
        logger.debug('[Settings] Window focused, syncing user data');
        syncUser();
      }
    };

    // Initial sync on mount
    if (isAuthenticated) {
      syncUser();
    }

    // Listen for visibility changes and focus events
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, syncUser]);

  // Pull preferences from cloud when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    syncFromCloud();
  }, [isAuthenticated, syncFromCloud]);

  // Listen for auth events
  useEffect(() => {
    if (!window.navi) return;

    const unsubCallback = window.navi.onAuthCallback(async (data) => {
      logger.debug('[Settings] Auth callback received:', data.userId);
      setTokens(data.accessToken, data.refreshToken);

      // Fetch user info via store action
      await syncUser();

      setAuthError(null);
    });

    const unsubError = window.navi.onAuthError((data) => {
      logger.error('[Settings] Auth error:', data);
      setAuthError(data.description || data.error);
    });

    const unsubLogout = window.navi.onLogout(() => {
      logout();
    });

    return () => {
      unsubCallback();
      unsubError();
      unsubLogout();
    };
  }, [setTokens, logout]);

  // Listen for dock behavior changes from other windows
  useEffect(() => {
    if (!window.navi?.onDockBehaviorChange) return;

    const { setDockBehavior } = useSettingsStore.getState();

    const unsubscribe = window.navi.onDockBehaviorChange((behavior) => {
      logger.debug('[Settings] Dock behavior changed via IPC:', behavior);
      setDockBehavior(behavior);
    });

    return unsubscribe;
  }, []);

  // Sync current dock behavior to main process on mount
  useEffect(() => {
    if (!window.navi?.setDockBehavior) return;
    logger.debug('[Settings] Syncing dock behavior to main:', dockBehavior);
    window.navi.setDockBehavior(dockBehavior);
  }, []);

  // Load app version for About section
  useEffect(() => {
    let isMounted = true;

    if (!window.navi?.getAppVersion) {
      setAppVersion('Unknown');
      return;
    }

    window.navi.getAppVersion()
      .then((version) => {
        if (isMounted) {
          setAppVersion(version || 'Unknown');
        }
      })
      .catch((error) => {
        logger.error('[Settings] Failed to load app version:', error);
        if (isMounted) {
          setAppVersion('Unknown');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = () => {
    setAuthError(null);
    window.navi?.login();
  };

  const handleLogout = () => {
    window.navi?.logout();
    logout();
  };

  return (
    <div className="settings-container">
      {/* Title bar drag region */}
      <div className="settings-titlebar">
        <span className="settings-title">Settings</span>
      </div>

      <div className="settings-content">
        {/* Sidebar */}
        <nav className="settings-sidebar">
          <button
            className={`sidebar-item ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            General
          </button>
          <button
            className={`sidebar-item ${activeTab === 'cloud-sync' ? 'active' : ''}`}
            onClick={() => setActiveTab('cloud-sync')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            </svg>
            Cloud Sync
          </button>
          <button
            className={`sidebar-item ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            Advanced
          </button>
        </nav>

        {/* Main content */}
        <main className="settings-main">
          {activeTab === 'general' && (
            <div className="settings-panel">
              <h2>General</h2>
              <p className="settings-panel-description">Manage your account, appearance, and app behavior.</p>

              {/* Account Section */}
              <section className="settings-section">
                <h3>Account</h3>
                {authError && (
                  <div className="settings-error">
                    <span>⚠️ {authError}</span>
                  </div>
                )}
                {isAuthenticated && user ? (
                  <>
                    <div className="settings-item">
                      <div className="settings-item-info">
                        <span className="settings-item-label">{user.name || user.email}</span>
                        <span className="settings-item-description">{user.email}</span>
                      </div>
                      <button className="settings-button secondary" onClick={handleLogout}>
                        Sign Out
                      </button>
                    </div>

                    {/* Subscription Status */}
                    <div className="settings-item settings-item-stack">
                      <div className="settings-item-top">
                        <span className="settings-item-label">
                          {subscription.tier === 'pro' ? 'Pro Plan' : 'Free Plan'}
                        </span>
                        {subscription.tier === 'pro' ? (
                          <span className="settings-badge settings-badge-active">Active</span>
                        ) : (
                          <span className="settings-badge">Pro Coming Soon</span>
                        )}
                      </div>
                      {subscription.tier === 'free' && (
                        <>
                          <div className="progress-bar-container">
                            <div
                              className={`progress-bar-fill ${subscription.dailyMessagesUsed >= subscription.dailyMessagesLimit ? 'limit-reached' : ''}`}
                              style={{
                                width: `${Math.min(100, (subscription.dailyMessagesUsed / subscription.dailyMessagesLimit) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="settings-item-description compact">
                            {subscription.dailyMessagesUsed} / {subscription.dailyMessagesLimit} messages used today
                          </span>
                        </>
                      )}
                      {subscription.tier === 'pro' && (
                        <span className="settings-item-description compact">Unlimited messages</span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="settings-item">
                    <div className="settings-item-info">
                      <span className="settings-item-label">Sign In</span>
                      <span className="settings-item-description">
                        Sign in to sync your conversations and unlock more features
                      </span>
                    </div>
                    <button className="settings-button primary" onClick={handleLogin}>
                      Sign In
                    </button>
                  </div>
                )}
              </section>

              {/* Appearance Section */}
              <section className="settings-section">
                <h3>Appearance</h3>
                <div className="settings-item">
                  <div className="settings-item-info">
                    <span className="settings-item-label">Theme</span>
                    <span className="settings-item-description">
                      Choose your preferred color theme
                    </span>
                  </div>
                  <select
                    className="settings-select"
                    value={theme}
                    onChange={(e) => {
                      const newTheme = e.target.value as 'system' | 'dark' | 'light';
                      setTheme(newTheme);
                      window.navi?.setTheme(newTheme);
                      syncToCloud({ theme: newTheme });
                    }}
                  >
                    {THEMES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              {/* Docking Section */}
              <section className="settings-section">
                <h3>Docking</h3>
                <div className="settings-item">
                  <div className="settings-item-info">
                    <span className="settings-item-label">Dock behavior</span>
                    <span className="settings-item-description">
                      Choose which side Navi docks to by default
                    </span>
                  </div>
                  <select
                    className="settings-select"
                    value={dockBehavior}
                    onChange={(e) => {
                      const behavior = e.target.value as 'right' | 'left';
                      setDockBehavior(behavior);
                      logger.debug('[Settings] Dock behavior changed (UI):', behavior);
                      window.navi?.setDockBehavior(behavior);
                      syncToCloud({ dockBehavior: behavior });
                    }}
                  >
                    <option value="right">Dock right (default)</option>
                    <option value="left">Dock left</option>
                  </select>
                </div>
              </section>

              {/* About Section */}
              <section className="settings-section">
                <h3>About</h3>
                <div className="settings-item">
                  <div className="settings-item-info">
                    <span className="settings-item-label">Current version</span>
                    <span className="settings-item-description">Navi v{appVersion}</span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'cloud-sync' && (
            <div className="settings-panel">
              <h2>Cloud Sync</h2>
              <p className="settings-panel-description">Keep your chats and preferences available across devices.</p>

              <section className="settings-section">
                {isAuthenticated ? (
                  <div className="settings-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
                      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                    </svg>
                    <h3>Coming Soon</h3>
                    <p>Cloud sync will allow you to sync your conversations and settings across all your devices.</p>
                  </div>
                ) : (
                  <div className="settings-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
                      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                    </svg>
                    <h3>Sign In Required</h3>
                    <p>Sign in to enable cloud sync for your conversations and settings.</p>
                    <button className="settings-button primary settings-button-spaced" onClick={handleLogin}>
                      Sign In
                    </button>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="settings-panel">
              <h2>Advanced</h2>
              <p className="settings-panel-description">Tune model and memory settings for your workflow.</p>

              {/* Model Selection */}
              <section className="settings-section">
                <h3>AI Model</h3>
                <div className="settings-item">
                  <div className="settings-item-info">
                    <span className="settings-item-label">Groq Model</span>
                    <span className="settings-item-description">
                      Select the AI model to use for conversations
                    </span>
                  </div>
                  <select
                    className="settings-select"
                    value={model}
                    onChange={(e) => {
                      const nextModel = e.target.value;
                      setModel(nextModel);
                      syncToCloud({ model: nextModel });
                    }}
                  >
                    {GROQ_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              {/* Context Window */}
              <section className="settings-section">
                <h3>Conversation Memory</h3>
                <div className="settings-item">
                  <div className="settings-item-info">
                    <span className="settings-item-label">History Window</span>
                    <span className="settings-item-description">
                      Number of recent messages to include for context (older messages are summarized)
                    </span>
                  </div>
                  <select
                    className="settings-select"
                    value={String(historyWindowSize)}
                    onChange={(e) => {
                      const size = Number(e.target.value);
                      setHistoryWindowSize(size);
                      syncToCloud({ historyWindowSize: size });
                    }}
                  >
                    <option value="10">10 messages</option>
                    <option value="20">20 messages (Recommended)</option>
                    <option value="30">30 messages</option>
                    <option value="50">50 messages</option>
                  </select>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
