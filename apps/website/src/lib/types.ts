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

export interface UserMemory {
    id: string;
    userId: string;
    memoryType: 'preference' | 'profile_fact' | 'project_context' | 'task_state';
    memoryKey: string;
    content: string;
    confidence: number;
    sourceConversationId: string | null;
    createdAt: string;
    updatedAt: string;
}

export const DEFAULT_PREFS: Preferences = {
    theme: 'dark',
    model: 'gemini-1.5-pro-latest',
    historyWindowSize: 20,
    dockBehavior: 'right',
};

export const MODEL_OPTIONS = [
    { id: 'gemini-1.5-pro-latest', label: 'Navi Pro (Best quality)' },
    { id: 'gemini-2.0-flash', label: 'Navi Balanced' },
    { id: 'gemini-1.5-flash-latest', label: 'Navi Fast' },
];
