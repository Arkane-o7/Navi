import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '../../shared/logger';

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Subscription {
  tier: 'free' | 'pro';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  periodEnd?: string;
  dailyMessagesUsed: number;
  dailyMessagesLimit: number;
}

interface AuthState {
  // User data
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Subscription data
  subscription: Subscription;

  // Loading states
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setSubscription: (subscription: Partial<Subscription>) => void;
  updateDailyUsage: (used: number, limit: number) => void;
  logout: () => void;

  // Async Actions
  refreshAuth: () => Promise<boolean>;
  syncUser: () => Promise<void>;

  // Computed
  canSendMessage: () => boolean;
  getRemainingMessages: () => number;
}

const DEFAULT_SUBSCRIPTION: Subscription = {
  tier: 'free',
  status: 'active',
  dailyMessagesUsed: 0,
  dailyMessagesLimit: 20,
};

import { API_CONFIG } from '../config';

// Simple JWT decoder to avoid adding dependencies
function decodeJwt(token: string): { exp: number } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      subscription: DEFAULT_SUBSCRIPTION,
      isLoading: false,
      isAuthenticated: false,

      // Actions
      setUser: (user) => set({
        user,
        isAuthenticated: !!user
      }),

      setTokens: (accessToken, refreshToken) => set({
        accessToken,
        refreshToken,
        isAuthenticated: true,
      }),

      setSubscription: (subscription) => set((state) => ({
        subscription: { ...state.subscription, ...subscription }
      })),

      updateDailyUsage: (used, limit) => set((state) => ({
        subscription: {
          ...state.subscription,
          dailyMessagesUsed: used,
          dailyMessagesLimit: limit,
        }
      })),

      logout: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        subscription: DEFAULT_SUBSCRIPTION,
        isAuthenticated: false,
      }),

      // Async Actions
      refreshAuth: async () => {
        const { refreshToken: token, accessToken } = get();

        // If we have an access token, check if it's expired
        if (accessToken) {
          const decoded = decodeJwt(accessToken);
          // If token is valid for at least another minute, no need to refresh
          if (decoded && decoded.exp * 1000 > Date.now() + 60000) {
            return true;
          }
        }

        if (!token) return false;

        try {
          // Use fetch directly to avoid circular dependency if we used an API client wrapper
          const response = await fetch(`${API_CONFIG.baseUrl}/api/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken: token }),
          });

          if (!response.ok) {
            throw new Error('Failed to refresh token');
          }

          const data = await response.json();
          set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
          });
          return true;
        } catch (error) {
          logger.error('[AuthStore] Refresh failed:', error);
          // If refresh fails, we should logout
          get().logout();
          return false;
        }
      },

      syncUser: async () => {
        const { accessToken, refreshAuth } = get();

        // Ensure we have a valid token
        const refreshed = await refreshAuth();
        if (!refreshed) {
          // We might be just an anonymous user, that's fine.
          return;
        }

        try {
          const currentToken = get().accessToken; // Get fresh token
          const response = await fetch(`${API_CONFIG.baseUrl}/api/user`, {
            headers: {
              'Authorization': `Bearer ${currentToken}`
            }
          });

          if (response.ok) {
            const responseData = await response.json();
            // API returns { success: true, data: { user, subscription } }
            const userData = responseData.data || responseData;
            logger.debug('[AuthStore] syncUser response received');

            if (userData.user) {
              // Update subscription and user data
              logger.debug('[AuthStore] Updating user and subscription');
              set((state) => ({
                user: { ...state.user, ...userData.user },
                subscription: { ...state.subscription, ...userData.subscription }
              }));
            }
          } else {
            logger.error('[AuthStore] syncUser failed with status:', response.status);
          }
        } catch (error) {
          logger.error('[AuthStore] Sync user failed:', error);
        }
      },

      // Computed
      canSendMessage: () => {
        const { subscription } = get();
        if (subscription.tier === 'pro') return true;
        return subscription.dailyMessagesUsed < subscription.dailyMessagesLimit;
      },

      getRemainingMessages: () => {
        const { subscription } = get();
        if (subscription.tier === 'pro') return Infinity;
        return Math.max(0, subscription.dailyMessagesLimit - subscription.dailyMessagesUsed);
      },
    }),
    {
      name: 'navi-auth',
      // Only persist these fields
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        subscription: state.subscription,
        isAuthenticated: state.isAuthenticated,
      }),
      // Add error handling for corrupted storage
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          logger.error('[AuthStore] Failed to rehydrate:', error);
        }
      },
    }
  )
);
