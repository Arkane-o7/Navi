import { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/api';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    userId: null,
  });

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authState = await window.electronAPI.auth.getState();
        if (authState.accessToken) {
          apiClient.setAccessToken(authState.accessToken);
        }
        setState({
          isAuthenticated: authState.isAuthenticated,
          isLoading: false,
          userId: authState.userId,
        });
      } catch {
        setState({ isAuthenticated: false, isLoading: false, userId: null });
      }
    };

    checkAuth();

    // Listen for auth changes
    const unsubscribe = window.electronAPI.auth.onAuthChanged(async (newState) => {
      if (newState.isAuthenticated) {
        // Refresh the full state to get the access token
        const fullState = await window.electronAPI.auth.getState();
        if (fullState.accessToken) {
          apiClient.setAccessToken(fullState.accessToken);
        }
        setState({
          isAuthenticated: true,
          isLoading: false,
          userId: fullState.userId,
        });
      } else {
        apiClient.setAccessToken(null);
        setState({ isAuthenticated: false, isLoading: false, userId: null });
      }
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async () => {
    await window.electronAPI.auth.login();
  }, []);

  const logout = useCallback(async () => {
    await window.electronAPI.auth.logout();
    apiClient.setAccessToken(null);
    setState({ isAuthenticated: false, isLoading: false, userId: null });
  }, []);

  const refreshToken = useCallback(async () => {
    const result = await window.electronAPI.auth.refresh();
    if (result.success && result.accessToken) {
      apiClient.setAccessToken(result.accessToken);
    }
    return result.success;
  }, []);

  return {
    ...state,
    login,
    logout,
    refreshToken,
  };
}
