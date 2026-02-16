'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '@/lib/types';

interface MessageRowProps {
    message: Message;
}

function CodeBlock({ className, children }: { className?: string; children: React.ReactNode }) {
    const [copied, setCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const code = String(children).replace(/\n$/, '');

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="code-block-wrapper">
            <div className="code-block-header">
                <span className="code-block-lang">{language || 'code'}</span>
                <button className="code-copy-btn" onClick={handleCopy}>
                    {copied ? (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Copied!
                        </>
                    ) : (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Copy code
                        </>
                    )}
                </button>
            </div>
            <pre className="code-block-pre">
                <code className={className}>{code}</code>
            </pre>
        </div>
    );
}

export default function MessageRow({ message }: MessageRowProps) {
    const [showActions, setShowActions] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyMessage = async () => {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (message.role === 'user') {
        return (
            <div className="message-row user-message">
                <div className="user-bubble">{message.content}</div>
            </div>
        );
    }

    return (
        <div
            className="message-row assistant-message"
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className="assistant-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22" />
                    <path d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22" />
                    <path d="M8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12" />
                </svg>
            </div>
            <div className="assistant-content">
                {message.content ? (
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            code({ className, children }) {
                                const isInline = !className;
                                if (isInline) {
                                    return <code className="inline-code">{children}</code>;
                                }
                                return <CodeBlock className={className}>{children}</CodeBlock>;
                            },
                            a({ href, children }) {
                                return (
                                    <a href={href} target="_blank" rel="noopener noreferrer" className="md-link">
                                        {children}
                                    </a>
                                );
                            },
                            table({ children }) {
                                return (
                                    <div className="md-table-wrapper">
                                        <table className="md-table">{children}</table>
                                    </div>
                                );
                            },
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>
                ) : (
                    <div className="typing-indicator">
                        <span /><span /><span />
                    </div>
                )}

                {showActions && message.content && (
                    <div className="message-actions">
                        <button className="message-action-btn" onClick={handleCopyMessage} title="Copy">
                            {copied ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                            )}
                        </button>
                        <button className="message-action-btn" title="Good response">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M7 10v12" />
                                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                            </svg>
                        </button>
                        <button className="message-action-btn" title="Bad response">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 14V2" />
                                <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
