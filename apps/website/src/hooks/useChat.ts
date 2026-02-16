'use client';

import { useState, useRef, useCallback } from 'react';
import { apiFetch, API_BASE, authHeaders } from '@/lib/api';
import type { Message, Preferences } from '@/lib/types';

interface UseChatOptions {
    accessToken: string | null;
    prefs: Preferences;
    activeConversation: { messages: Message[] } | null;
    ensureConversation: () => Promise<string>;
    updateConversationMessages: (id: string, msgs: Message[]) => void;
}

export function useChat({
    accessToken,
    prefs,
    activeConversation,
    ensureConversation,
    updateConversationMessages,
}: UseChatOptions) {
    const [isLoading, setIsLoading] = useState(false);
    const [streamError, setStreamError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const pendingWritesRef = useRef<Array<{ conversationId: string; message: Message; attempts: number }>>([]);
    const isFlushingWritesRef = useRef(false);

    const flushWriteQueue = useCallback(async () => {
        if (isFlushingWritesRef.current) return;
        if (!accessToken) return;

        isFlushingWritesRef.current = true;
        try {
            while (pendingWritesRef.current.length > 0) {
                const next = pendingWritesRef.current[0];
                try {
                    const res = await apiFetch('/api/messages', accessToken, {
                        method: 'POST',
                        body: JSON.stringify({
                            conversationId: next.conversationId,
                            id: next.message.id,
                            role: next.message.role,
                            content: next.message.content,
                        }),
                    });

                    if (!res.ok) {
                        throw new Error(`Persist failed with status ${res.status}`);
                    }

                    pendingWritesRef.current.shift();
                } catch {
                    next.attempts += 1;
                    if (next.attempts >= 5) {
                        // Drop after bounded retries; keep chat UX non-blocking.
                        pendingWritesRef.current.shift();
                    } else {
                        const backoffMs = Math.min(5000, 250 * (2 ** (next.attempts - 1)));
                        await new Promise((resolve) => setTimeout(resolve, backoffMs));
                    }
                }
            }
        } finally {
            isFlushingWritesRef.current = false;
        }
    }, [accessToken]);

    const enqueuePersistMessage = useCallback(
        (conversationId: string, message: Message) => {
            if (!accessToken) return;
            pendingWritesRef.current.push({ conversationId, message, attempts: 0 });
            void flushWriteQueue();
        },
        [accessToken, flushWriteQueue]
    );

    const sendMessage = useCallback(
        async (trimmed: string) => {
            if (!trimmed || isLoading) return;

            const conversationId = await ensureConversation();
            if (!conversationId) return;

            setIsLoading(true);
            setStreamError(null);

            const userMsg: Message = {
                id: crypto.randomUUID(),
                role: 'user',
                content: trimmed,
                timestamp: Date.now(),
            };

            const baseMessages = [...(activeConversation?.messages || []), userMsg];
            updateConversationMessages(conversationId, baseMessages);
            enqueuePersistMessage(conversationId, userMsg);

            const assistantMsg: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
            };

            updateConversationMessages(conversationId, [...baseMessages, assistantMsg]);

            abortRef.current = new AbortController();

            try {
                const history = baseMessages
                    .slice(-prefs.historyWindowSize)
                    .map((m) => ({ role: m.role, content: m.content }));

                const response = await fetch(`${API_BASE}/api/chat`, {
                    method: 'POST',
                    headers: authHeaders(accessToken) as Record<string, string>,
                    body: JSON.stringify({ message: trimmed, history }),
                    signal: abortRef.current.signal,
                });

                if (!response.ok || !response.body) throw new Error('Failed to send message');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let full = '';
                let frameId: number | null = null;
                let latestAssistantContent = '';

                const flushAssistantUpdate = () => {
                    frameId = null;
                    updateConversationMessages(conversationId, [
                        ...baseMessages,
                        { ...assistantMsg, content: latestAssistantContent },
                    ]);
                };

                const scheduleAssistantUpdate = () => {
                    if (frameId !== null) return;
                    frameId = window.requestAnimationFrame(flushAssistantUpdate);
                };

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.content) {
                                full += parsed.content;
                                latestAssistantContent = full;
                                scheduleAssistantUpdate();
                            }
                        } catch {
                            // skip malformed JSON chunks
                        }
                    }
                }

                if (frameId !== null) {
                    window.cancelAnimationFrame(frameId);
                    frameId = null;
                }

                updateConversationMessages(conversationId, [
                    ...baseMessages,
                    { ...assistantMsg, content: full },
                ]);

                enqueuePersistMessage(conversationId, { ...assistantMsg, content: full });
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    setStreamError((error as Error).message || 'Something went wrong');
                }
            } finally {
                setIsLoading(false);
                abortRef.current = null;
            }
        },
        [
            isLoading,
            accessToken,
            prefs.historyWindowSize,
            activeConversation,
            ensureConversation,
            updateConversationMessages,
            enqueuePersistMessage,
        ]
    );

    const stopGenerating = useCallback(() => {
        abortRef.current?.abort();
    }, []);

    return { isLoading, streamError, setStreamError, sendMessage, stopGenerating };
}
