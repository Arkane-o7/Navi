'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useChat } from '@/hooks/useChat';
import { apiFetch, apiJson, API_ENDPOINTS } from '@/lib/api';
import { DEFAULT_PREFS } from '@/lib/types';
import type { Preferences } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import EmptyState from '@/components/EmptyState';
import ChatThread from '@/components/ChatThread';
import MemoryPanel from '@/components/MemoryPanel';
import type { UserMemory } from '@/lib/types';

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
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [memories, setMemories] = useState<UserMemory[]>([]);

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
          API_ENDPOINTS.preferences,
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
    setMemoryPanelOpen(false);
    setMemories([]);
  }, [logout]);

  const loadMemories = useCallback(async () => {
    if (!accessToken) {
      setMemoryError('Please log in to use memory controls.');
      return;
    }

    setMemoryLoading(true);
    setMemoryError(null);

    try {
      const payload = await apiJson<{ data: { memories: UserMemory[] } }>(
        API_ENDPOINTS.memory.list(100),
        accessToken
      );

      setMemories(payload?.data?.memories ?? []);
    } catch {
      setMemoryError('Failed to load memories.');
    } finally {
      setMemoryLoading(false);
    }
  }, [accessToken]);

  const openMemoryPanel = useCallback(async () => {
    setMemoryPanelOpen(true);
    await loadMemories();
  }, [loadMemories]);

  const deleteMemory = useCallback(
    async (id: string) => {
      if (!accessToken) return;

      const response = await apiFetch(API_ENDPOINTS.memory.delete(id), accessToken, {
        method: 'DELETE',
      }).catch(() => null);

      if (!response?.ok) {
        setMemoryError('Could not delete memory right now.');
        return;
      }

      setMemories((current) => current.filter((memory) => memory.id !== id));
    },
    [accessToken]
  );

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
        onOpenMemory={openMemoryPanel}
      />

      <div className="main-panel">
        <TopBar
          prefs={prefs}
          sidebarOpen={sidebarOpen}
          accessToken={accessToken}
          onToggleSidebar={() => setSidebarOpen(true)}
          onNewChat={handleNewChat}
          onModelChange={handleModelChange}
          onLogin={login}
          onOpenMemory={openMemoryPanel}
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

      <MemoryPanel
        isOpen={memoryPanelOpen}
        isLoading={memoryLoading}
        error={memoryError}
        memories={memories}
        onClose={() => setMemoryPanelOpen(false)}
        onRefresh={loadMemories}
        onDelete={deleteMemory}
      />
    </div>
  );
}
