'use client';

import React, { useRef, useEffect } from 'react';

interface ComposerProps {
    input: string;
    isLoading: boolean;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onStop: () => void;
    onNewChat: () => void;
    autoFocus?: boolean;
    className?: string;
}

export default function Composer({
    input,
    isLoading,
    onInputChange,
    onSend,
    onStop,
    onNewChat,
    autoFocus = true,
    className = '',
}: ComposerProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (autoFocus && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [autoFocus]);

    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className={`composer ${className}`}>
            <div className="composer-box">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything"
                    rows={1}
                    className="composer-textarea"
                />
                <div className="composer-actions">
                    <div className="composer-actions-left">
                        {/* Pill-shaped action buttons matching ChatGPT */}
                        <button className="composer-pill-btn" title="Attach file" type="button">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                            </svg>
                            <span>Attach</span>
                        </button>
                        <button className="composer-pill-btn" title="Search the web" type="button">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                <path d="M2 12h20" />
                            </svg>
                            <span>Search</span>
                        </button>
                        <button className="composer-pill-btn" title="Create an image" type="button">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                <circle cx="9" cy="9" r="2" />
                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                            </svg>
                            <span>Create image</span>
                        </button>
                    </div>
                    <div className="composer-actions-right">
                        {isLoading ? (
                            <button className="composer-stop-btn" onClick={onStop} title="Stop generating" type="button">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="6" y="6" width="12" height="12" rx="2" />
                                </svg>
                            </button>
                        ) : (
                            <button
                                className={`composer-send-btn ${input.trim() ? 'active' : ''}`}
                                onClick={onSend}
                                disabled={!input.trim()}
                                title="Send message"
                                type="button"
                            >
                                <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor">
                                    <path d="M16 3a1 1 0 0 1 .707.293l8 8a1 1 0 0 1-1.414 1.414L17 6.414V28a1 1 0 1 1-2 0V6.414l-6.293 6.293a1 1 0 0 1-1.414-1.414l8-8A1 1 0 0 1 16 3z" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <p className="composer-disclaimer">
                Navi can make mistakes. Consider checking important information.
            </p>
        </div>
    );
}
