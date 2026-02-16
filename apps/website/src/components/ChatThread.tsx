'use client';

import React, { useRef, useEffect } from 'react';
import type { Message } from '@/lib/types';
import MessageRow from './MessageRow';
import Composer from './Composer';

interface ChatThreadProps {
    messages: Message[];
    streamError: string | null;
    input: string;
    isLoading: boolean;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onStop: () => void;
    onNewChat: () => void;
}

export default function ChatThread({
    messages,
    streamError,
    input,
    isLoading,
    onInputChange,
    onSend,
    onStop,
    onNewChat,
}: ChatThreadProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }, [messages]);

    return (
        <div className="chat-thread-wrapper">
            <div className="chat-thread" ref={scrollRef}>
                <div className="chat-thread-inner">
                    {messages.map((m) => (
                        <MessageRow key={m.id} message={m} />
                    ))}
                    {streamError && (
                        <div className="stream-error">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {streamError}
                        </div>
                    )}
                </div>
            </div>
            <div className="chat-thread-composer">
                <Composer
                    input={input}
                    isLoading={isLoading}
                    onInputChange={onInputChange}
                    onSend={onSend}
                    onStop={onStop}
                    onNewChat={onNewChat}
                />
            </div>
        </div>
    );
}
