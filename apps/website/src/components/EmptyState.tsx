'use client';

import React from 'react';
import Composer from './Composer';

interface EmptyStateProps {
    input: string;
    isLoading: boolean;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onStop: () => void;
    onNewChat: () => void;
    onSuggestionClick: (text: string) => void;
}

export default function EmptyState({
    input,
    isLoading,
    onInputChange,
    onSend,
    onStop,
    onNewChat,
}: EmptyStateProps) {
    return (
        <div className="empty-state">
            <h1 className="empty-state-title">Where should we begin?</h1>

            <Composer
                input={input}
                isLoading={isLoading}
                onInputChange={onInputChange}
                onSend={onSend}
                onStop={onStop}
                onNewChat={onNewChat}
                className="empty-state-composer"
            />
        </div>
    );
}
