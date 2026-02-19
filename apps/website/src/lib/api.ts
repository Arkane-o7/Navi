const rawApiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const API_BASE = rawApiBase.replace(/\/+$/, '');

export const API_ENDPOINTS = {
    auth: {
        login: '/api/auth/login',
        callback: '/api/auth/callback',
        refresh: '/api/auth/refresh',
    },
    chat: '/api/chat',
    user: '/api/user',
    messages: '/api/messages',
    preferences: '/api/preferences',
    conversations: {
        list: '/api/conversations?includeMessages=true',
        create: '/api/conversations',
        delete: (conversationId: string) =>
            `/api/conversations?id=${encodeURIComponent(conversationId)}`,
    },
    memory: {
        list: (limit = 100) => `/api/memory?limit=${limit}`,
        delete: (id: string) => `/api/memory?id=${encodeURIComponent(id)}`,
    },
} as const;

export function authHeaders(accessToken: string | null): HeadersInit {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return headers;
}

export async function apiFetch(
    path: string,
    accessToken: string | null,
    options: RequestInit = {}
) {
    const res = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
        ...options,
        headers: {
            ...authHeaders(accessToken),
            ...(options.headers as Record<string, string>),
        },
    });
    return res;
}

export async function apiJson<T = unknown>(
    path: string,
    accessToken: string | null,
    options: RequestInit = {}
): Promise<T | null> {
    const res = await apiFetch(path, accessToken, options);
    if (!res.ok) return null;
    return res.json();
}

export function loginUrl(): string {
    const redirectUri = `${API_BASE}${API_ENDPOINTS.auth.callback}?platform=web&return_to=${encodeURIComponent(
        typeof window !== 'undefined' ? window.location.origin : ''
    )}`;
    return `${API_BASE}${API_ENDPOINTS.auth.login}?redirect_uri=${encodeURIComponent(redirectUri)}&state=web`;
}

export { API_BASE };
