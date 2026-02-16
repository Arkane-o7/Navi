'use client';

import React from 'react';
import type { Preferences } from '@/lib/types';
import { MODEL_OPTIONS } from '@/lib/types';

interface TopBarProps {
    prefs: Preferences;
    sidebarOpen: boolean;
    accessToken: string | null;
    onToggleSidebar: () => void;
    onModelChange: (model: string) => void;
    onLogin: () => void;
}

export default function TopBar({
    prefs,
    sidebarOpen,
    accessToken,
    onToggleSidebar,
    onModelChange,
    onLogin,
}: TopBarProps) {
    return (
        <header className="topbar">
            <div className="topbar-left">
                {!sidebarOpen && (
                    <button className="sidebar-toggle-btn" onClick={onToggleSidebar} title="Open sidebar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <line x1="9" y1="3" x2="9" y2="21" />
                        </svg>
                    </button>
                )}
                {!sidebarOpen && (
                    <button className="topbar-new-chat" onClick={() => { }} title="New chat">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                        </svg>
                    </button>
                )}
                <div className="model-selector">
                    <select
                        value={prefs.model}
                        onChange={(e) => onModelChange(e.target.value)}
                    >
                        {MODEL_OPTIONS.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                    <svg className="model-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </div>
            </div>

            <div className="topbar-right">
                {!accessToken && (
                    <>
                        <button className="topbar-login-btn" onClick={onLogin}>
                            Log in
                        </button>
                        <button className="topbar-signup-btn" onClick={onLogin}>
                            Sign up for free
                        </button>
                        <button className="topbar-help-btn" title="Help">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                <path d="M12 17h.01" />
                            </svg>
                        </button>
                    </>
                )}
            </div>
        </header>
    );
}
