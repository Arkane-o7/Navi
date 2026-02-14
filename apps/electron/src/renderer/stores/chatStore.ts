import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_CONFIG } from '../config';
import { useAuthStore } from './authStore';
import { logger } from '../../shared/logger';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  synced?: boolean;
}

export interface Conversation {
  id: string;
  title?: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  synced?: boolean;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isSyncing: boolean;

  // Actions
  createConversation: () => string;
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => string;
  updateMessage: (conversationId: string, messageId: string, content: string) => void;
  getActiveConversation: () => Conversation | null;
  setActiveConversation: (id: string | null) => void;
  clearConversation: (id: string) => void;
  deleteConversation: (id: string) => void;

  // Cloud sync actions
  syncToCloud: () => Promise<void>;
  fetchFromCloud: () => Promise<void>;
  syncConversationToCloud: (conversationId: string) => Promise<void>;
  syncMessageToCloud: (conversationId: string, message: Message) => Promise<void>;
}

// Helper to get auth headers
function getAuthHeaders(): Record<string, string> {
  const accessToken = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return headers;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      isSyncing: false,

      createConversation: () => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const conversation: Conversation = {
          id,
          messages: [],
          createdAt: now,
          updatedAt: now,
          synced: false,
        };
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: id,
        }));

        // Sync to cloud in background if authenticated
        if (useAuthStore.getState().isAuthenticated) {
          get().syncConversationToCloud(id);
        }

        return id;
      },

      addMessage: (conversationId, message) => {
        const id = crypto.randomUUID();
        const timestamp = Date.now();
        const newMessage: Message = {
          ...message,
          id,
          timestamp,
          synced: false,
        };
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                ...conv,
                messages: [...conv.messages, newMessage],
                updatedAt: timestamp,
              }
              : conv
          ),
        }));

        // Sync message to cloud in background if authenticated
        if (useAuthStore.getState().isAuthenticated) {
          get().syncMessageToCloud(conversationId, newMessage);
        }

        return id;
      },

      updateMessage: (conversationId, messageId, content) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                ...conv,
                messages: conv.messages.map((msg) =>
                  msg.id === messageId ? { ...msg, content, synced: false } : msg
                ),
                updatedAt: Date.now(),
              }
              : conv
          ),
        }));

        // Sync updated message to cloud
        if (useAuthStore.getState().isAuthenticated) {
          const conv = get().conversations.find(c => c.id === conversationId);
          const msg = conv?.messages.find(m => m.id === messageId);
          if (msg) {
            get().syncMessageToCloud(conversationId, msg);
          }
        }
      },

      getActiveConversation: () => {
        const { conversations, activeConversationId } = get();
        return conversations.find((c) => c.id === activeConversationId) ?? null;
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id });
      },

      clearConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, messages: [], updatedAt: Date.now() } : conv
          ),
        }));
      },

      deleteConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          activeConversationId:
            state.activeConversationId === id ? null : state.activeConversationId,
        }));

        // Delete from cloud if authenticated
        if (useAuthStore.getState().isAuthenticated) {
          fetch(`${API_CONFIG.baseUrl}/api/conversations?id=${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          }).catch((error) => logger.error('[ChatStore] Failed to delete conversation in cloud:', error));
        }
      },

      // Sync a single conversation to cloud
      syncConversationToCloud: async (conversationId: string) => {
        const conv = get().conversations.find(c => c.id === conversationId);
        if (!conv) return;

        try {
          await fetch(`${API_CONFIG.baseUrl}/api/conversations`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ id: conv.id, title: conv.title }),
          });

          set((state) => ({
            conversations: state.conversations.map(c =>
              c.id === conversationId ? { ...c, synced: true } : c
            ),
          }));
        } catch (error) {
          logger.error('[ChatStore] Failed to sync conversation:', error);
        }
      },

      // Sync a single message to cloud
      syncMessageToCloud: async (conversationId: string, message: Message) => {
        try {
          await fetch(`${API_CONFIG.baseUrl}/api/messages`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              conversationId,
              id: message.id,
              role: message.role,
              content: message.content,
            }),
          });

          set((state) => ({
            conversations: state.conversations.map(c =>
              c.id === conversationId
                ? {
                  ...c,
                  messages: c.messages.map(m =>
                    m.id === message.id ? { ...m, synced: true } : m
                  ),
                }
                : c
            ),
          }));
        } catch (error) {
          logger.error('[ChatStore] Failed to sync message:', error);
        }
      },

      // Full sync to cloud
      syncToCloud: async () => {
        if (!useAuthStore.getState().isAuthenticated) return;

        set({ isSyncing: true });
        const { conversations } = get();

        for (const conv of conversations) {
          if (!conv.synced) {
            await get().syncConversationToCloud(conv.id);
          }

          for (const msg of conv.messages) {
            if (!msg.synced) {
              await get().syncMessageToCloud(conv.id, msg);
            }
          }
        }

        set({ isSyncing: false });
      },

      // Fetch all conversations from cloud
      fetchFromCloud: async () => {
        if (!useAuthStore.getState().isAuthenticated) return;

        set({ isSyncing: true });

        try {
          const headers = getAuthHeaders();

          // Fetch conversations list
          const convRes = await fetch(`${API_CONFIG.baseUrl}/api/conversations`, { headers });
          if (!convRes.ok) throw new Error('Failed to fetch conversations');

          const convData = await convRes.json();
          const cloudConversations = convData.data || [];

          // Fetch messages for each conversation
          const fullConversations: Conversation[] = [];
          for (const conv of cloudConversations) {
            const msgRes = await fetch(
              `${API_CONFIG.baseUrl}/api/messages?conversationId=${conv.id}`,
              { headers }
            );

            let messages: Message[] = [];
            if (msgRes.ok) {
              const msgData = await msgRes.json();
              messages = (msgData.data?.messages || []).map((m: Message) => ({
                ...m,
                synced: true,
              }));
            }

            fullConversations.push({
              id: conv.id,
              title: conv.title,
              messages,
              createdAt: new Date(conv.createdAt).getTime(),
              updatedAt: new Date(conv.updatedAt).getTime(),
              synced: true,
            });
          }

          // Merge with local conversations (local takes precedence for unsynced)
          const { conversations: localConversations } = get();
          const mergedConversations = [...fullConversations];

          for (const local of localConversations) {
            const existing = mergedConversations.find(c => c.id === local.id);
            if (!existing) {
              // Local-only conversation, keep it
              mergedConversations.push(local);
            } else if (!local.synced || local.updatedAt > existing.updatedAt) {
              // Local has newer changes, prefer local
              const idx = mergedConversations.indexOf(existing);
              mergedConversations[idx] = local;
            }
          }

          // Sort by updatedAt
          mergedConversations.sort((a, b) => b.updatedAt - a.updatedAt);

          set({ conversations: mergedConversations, isSyncing: false });
        } catch (error) {
          logger.error('[ChatStore] Failed to fetch from cloud:', error);
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'navi-chat-storage',
      version: 2,
    }
  )
);
