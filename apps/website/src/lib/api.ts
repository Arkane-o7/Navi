const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

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
    const res = await fetch(`${API_BASE}${path}`, {
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
    const redirectUri = `${API_BASE}/api/auth/callback?platform=web&return_to=${encodeURIComponent(
        typeof window !== 'undefined' ? window.location.origin : ''
    )}`;
    return `${API_BASE}/api/auth/login?redirect_uri=${encodeURIComponent(redirectUri)}&state=web`;
}

export { API_BASE };
