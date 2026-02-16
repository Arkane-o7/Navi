'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useChat } from '@/hooks/useChat';
import { apiJson } from '@/lib/api';
import { DEFAULT_PREFS } from '@/lib/types';
import type { Preferences } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import EmptyState from '@/components/EmptyState';
import ChatThread from '@/components/ChatThread';

export default function HomePage() {
  const { accessToken, userEmail, userName, isInitialized, login, logout } = useAuth();
  const {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    loadConversations,
    createNewConversation,
    updateConversationMessages,
    deleteConversation,
    ensureConversation,
  } = useConversations(accessToken);

  const [input, setInput] = useState('');
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { isLoading, streamError, sendMessage, stopGenerating } = useChat({
    accessToken,
    prefs,
    activeConversation,
    ensureConversation,
    updateConversationMessages,
  });

  // Load preferences and conversations on auth
  useEffect(() => {
    if (!accessToken || !isInitialized) return;
    (async () => {
      const [prefPayload] = await Promise.all([
        apiJson<{ data: { preferences: Preferences } }>(
          '/api/preferences',
          accessToken
        ),
        loadConversations(accessToken),
      ]);

      if (prefPayload?.data?.preferences) {
        setPrefs(prefPayload.data.preferences);
      }
    })();
  }, [accessToken, isInitialized, loadConversations]);

  // Apply theme
  useEffect(() => {
    const effective =
      prefs.theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : prefs.theme;
    document.documentElement.setAttribute('data-theme', effective);
  }, [prefs.theme]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput('');
    sendMessage(trimmed);
  }, [input, sendMessage]);

  const handleNewChat = useCallback(async () => {
    await createNewConversation();
    setInput('');
  }, [createNewConversation]);

  const handleSuggestionClick = useCallback(
    (text: string) => {
      setInput(text);
    },
    []
  );

  const handleModelChange = useCallback(
    (model: string) => {
      setPrefs((p) => ({ ...p, model }));
    },
    []
  );

  const handleLogout = useCallback(() => {
    logout();
    setSidebarOpen(true);
  }, [logout]);

  const hasMessages = !!activeConversation?.messages?.length;

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        isOpen={sidebarOpen}
        accessToken={accessToken}
        userEmail={userEmail}
        userName={userName}
        onToggle={() => setSidebarOpen(false)}
        onSelectConversation={setActiveConversationId}
        onNewChat={handleNewChat}
        onDeleteConversation={deleteConversation}
        onLogin={login}
        onLogout={handleLogout}
      />

      <div className="main-panel">
        <TopBar
          prefs={prefs}
          sidebarOpen={sidebarOpen}
          accessToken={accessToken}
          onToggleSidebar={() => setSidebarOpen(true)}
          onModelChange={handleModelChange}
          onLogin={login}
        />

        <div className="main-content">
          {hasMessages ? (
            <ChatThread
              messages={activeConversation!.messages}
              streamError={streamError}
              input={input}
              isLoading={isLoading}
              onInputChange={setInput}
              onSend={handleSend}
              onStop={stopGenerating}
              onNewChat={handleNewChat}
            />
          ) : (
            <EmptyState
              input={input}
              isLoading={isLoading}
              onInputChange={setInput}
              onSend={handleSend}
              onStop={stopGenerating}
              onNewChat={handleNewChat}
              onSuggestionClick={handleSuggestionClick}
            />
          )}
        </div>
      </div>
    </div>
  );
}
