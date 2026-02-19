'use client';

import React from 'react';
import type { Conversation } from '@/lib/types';

interface SidebarProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    isOpen: boolean;
    accessToken: string | null;
    userEmail: string | null;
    userName: string | null;
    onToggle: () => void;
    onSelectConversation: (id: string) => void;
    onNewChat: () => void;
    onDeleteConversation: (id: string) => void;
    onLogin: () => void;
    onLogout: () => void;
    onOpenMemory: () => void;
}

export default function Sidebar({
    conversations,
    activeConversationId,
    isOpen,
    accessToken,
    userEmail,
    userName,
    onToggle,
    onSelectConversation,
    onNewChat,
    onDeleteConversation,
    onLogin,
    onLogout,
    onOpenMemory,
}: SidebarProps) {
    if (!isOpen) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const groups: { label: string; items: Conversation[] }[] = [
        { label: 'Today', items: [] },
        { label: 'Yesterday', items: [] },
        { label: 'Previous 7 Days', items: [] },
        { label: 'Previous 30 Days', items: [] },
        { label: 'Older', items: [] },
    ];

    for (const conv of conversations) {
        const d = new Date(conv.updatedAt);
        if (d >= today) groups[0].items.push(conv);
        else if (d >= yesterday) groups[1].items.push(conv);
        else if (d >= sevenDaysAgo) groups[2].items.push(conv);
        else if (d >= thirtyDaysAgo) groups[3].items.push(conv);
        else groups[4].items.push(conv);
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                {/* Navi logo */}
                <div className="sidebar-logo">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
                    </svg>
                </div>
                <button className="sidebar-toggle-btn" onClick={onToggle} title="Close sidebar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                </button>
            </div>

            <nav className="sidebar-nav">
                <button className="sidebar-nav-item" onClick={onNewChat}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                    </svg>
                    <span>New chat</span>
                </button>
                <button className="sidebar-nav-item" onClick={onOpenMemory}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 8v8" />
                        <path d="M8 12h8" />
                        <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0" />
                    </svg>
                    <span>Memory</span>
                </button>
            </nav>

            <div className="sidebar-conversations">
                {conversations.length === 0 && (
                    <p className="sidebar-empty">No conversations yet</p>
                )}
                {groups.map(
                    (group) =>
                        group.items.length > 0 && (
                            <div key={group.label} className="conversation-group">
                                <div className="conversation-group-label">{group.label}</div>
                                {group.items.map((conv) => (
                                    <div
                                        key={conv.id}
                                        className={`conversation-item ${conv.id === activeConversationId ? 'active' : ''}`}
                                    >
                                        <button
                                            className="conversation-item-btn"
                                            onClick={() => onSelectConversation(conv.id)}
                                        >
                                            {conv.title || 'New chat'}
                                        </button>
                                        <button
                                            className="conversation-delete-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteConversation(conv.id);
                                            }}
                                            title="Delete"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M3 6h18" />
                                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                )}
            </div>

            <div className="sidebar-footer">
                {accessToken ? (
                    <div className="sidebar-user">
                        <div className="sidebar-user-avatar">
                            {(userName || userEmail || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{userName || userEmail || 'User'}</div>
                        </div>
                        <button className="sidebar-user-menu" onClick={onLogout} title="Sign out">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="19" cy="12" r="1" />
                                <circle cx="5" cy="12" r="1" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <div className="sidebar-login-prompt">
                        <div className="sidebar-login-heading">Get responses tailored to you</div>
                        <p>Log in to get answers based on saved chats, plus create images and upload files.</p>
                        <button className="sidebar-login-btn" onClick={onLogin}>
                            Log in
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
