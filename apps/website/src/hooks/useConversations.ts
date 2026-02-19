'use client';

import { useState, useCallback } from 'react';
import { apiFetch, apiJson, API_ENDPOINTS } from '@/lib/api';
import type { Conversation, Message } from '@/lib/types';

function titleFromMessages(messages: Message[]) {
    const firstUser = messages.find((m) => m.role === 'user')?.content?.trim() || 'New chat';
    return firstUser.length > 40 ? `${firstUser.slice(0, 40)}…` : firstUser;
}

export function useConversations(accessToken: string | null) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

    const activeConversation =
        conversations.find((c) => c.id === activeConversationId) || null;

    const loadConversations = useCallback(
        async (token: string) => {
            const convPayload = await apiJson<{ data: Array<{ id: string; title?: string; createdAt: string; updatedAt: string; messages?: Message[] }> }>(
                API_ENDPOINTS.conversations.list,
                token
            );
            if (!convPayload?.data) return;

            const full: Conversation[] = convPayload.data.map((conv) => ({
                id: conv.id,
                title: conv.title,
                messages: (conv.messages || []).map((m) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp,
                })),
                createdAt: new Date(conv.createdAt).getTime(),
                updatedAt: new Date(conv.updatedAt).getTime(),
            }));

            const sorted = full.sort((a, b) => b.updatedAt - a.updatedAt);
            setConversations(sorted);
            if (sorted[0] && !activeConversationId) setActiveConversationId(sorted[0].id);
        },
        [activeConversationId]
    );

    const createNewConversation = useCallback(async () => {
        const id = crypto.randomUUID();
        const localConv: Conversation = {
            id,
            title: 'New chat',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        setConversations((prev) => [localConv, ...prev]);
        setActiveConversationId(id);

        if (accessToken) {
            await apiFetch(API_ENDPOINTS.conversations.create, accessToken, {
                method: 'POST',
                body: JSON.stringify({ id, title: localConv.title }),
            }).catch(() => undefined);
        }

        return id;
    }, [accessToken]);

    const updateConversationMessages = useCallback(
        (conversationId: string, messages: Message[]) => {
            const title = titleFromMessages(messages);
            setConversations((prev) =>
                prev
                    .map((c) =>
                        c.id === conversationId
                            ? { ...c, title, messages, updatedAt: Date.now() }
                            : c
                    )
                    .sort((a, b) => b.updatedAt - a.updatedAt)
            );
        },
        []
    );

    const deleteConversation = useCallback(
        async (conversationId: string) => {
            setConversations((prev) => prev.filter((c) => c.id !== conversationId));
            if (activeConversationId === conversationId) {
                setActiveConversationId(null);
            }
            if (accessToken) {
                await apiFetch(API_ENDPOINTS.conversations.delete(conversationId), accessToken, {
                    method: 'DELETE',
                }).catch(() => undefined);
            }
        },
        [accessToken, activeConversationId]
    );

    const ensureConversation = useCallback(async () => {
        if (activeConversationId) return activeConversationId;
        return createNewConversation();
    }, [activeConversationId, createNewConversation]);

    return {
        conversations,
        activeConversation,
        activeConversationId,
        setActiveConversationId,
        loadConversations,
        createNewConversation,
        updateConversationMessages,
        deleteConversation,
        ensureConversation,
        setConversations,
    };
}
