export type Role = 'user' | 'assistant';
export type Theme = 'system' | 'dark' | 'light';

export interface Message {
    id: string;
    role: Role;
    content: string;
    timestamp: number;
}

export interface Conversation {
    id: string;
    title?: string;
    createdAt: number;
    updatedAt: number;
    messages: Message[];
}

export interface Preferences {
    theme: Theme;
    model: string;
    historyWindowSize: number;
    dockBehavior: 'left' | 'right';
}

export const DEFAULT_PREFS: Preferences = {
    theme: 'dark',
    model: 'llama-3.3-70b-versatile',
    historyWindowSize: 20,
    dockBehavior: 'right',
};

export const MODEL_OPTIONS = [
    { id: 'llama-3.3-70b-versatile', label: 'Navi' },
    { id: 'llama-3.1-70b-versatile', label: 'Navi Fast' },
    { id: 'llama-3.1-8b-instant', label: 'Navi Mini' },
];
