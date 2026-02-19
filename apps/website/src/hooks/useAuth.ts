'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiFetch, apiJson, API_ENDPOINTS, loginUrl } from '@/lib/api';
import type { Preferences } from '@/lib/types';
import { DEFAULT_PREFS } from '@/lib/types';

export function useAuth() {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const refreshAuth = useCallback(async (): Promise<string | null> => {
        const currentRefresh = localStorage.getItem('navi-web-refresh-token');
        if (!currentRefresh) return null;

        const res = await apiFetch(API_ENDPOINTS.auth.refresh, null, {
            method: 'POST',
            body: JSON.stringify({ refreshToken: currentRefresh }),
        });

        if (!res.ok) return null;

        const tokens = await res.json();
        localStorage.setItem('navi-web-access-token', tokens.accessToken);
        localStorage.setItem('navi-web-refresh-token', tokens.refreshToken);
        setAccessToken(tokens.accessToken);
        return tokens.accessToken;
    }, []);

    const loadUserInfo = useCallback(async (token: string) => {
        const payload = await apiJson<{ data: { user: { email: string; firstName?: string; lastName?: string } } }>(
            API_ENDPOINTS.user,
            token
        );
        if (payload?.data?.user) {
            setUserEmail(payload.data.user.email);
            const name = [payload.data.user.firstName, payload.data.user.lastName]
                .filter(Boolean)
                .join(' ');
            setUserName(name || null);
        }
    }, []);

    useEffect(() => {
        const error = localStorage.getItem('navi-web-auth-error');
        if (error) {
            localStorage.removeItem('navi-web-auth-error');
        }

        const access = localStorage.getItem('navi-web-access-token');
        const refresh = localStorage.getItem('navi-web-refresh-token');
        setAccessToken(access);

        (async () => {
            let token = access;
            if (!token && refresh) token = await refreshAuth();
            if (token) await loadUserInfo(token);
            setIsInitialized(true);
        })();
    }, [refreshAuth, loadUserInfo]);

    const login = useCallback(() => {
        window.location.href = loginUrl();
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('navi-web-access-token');
        localStorage.removeItem('navi-web-refresh-token');
        setAccessToken(null);
        setUserEmail(null);
        setUserName(null);
    }, []);

    return { accessToken, userEmail, userName, isInitialized, login, logout };
}
