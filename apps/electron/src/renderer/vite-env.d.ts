/// <reference types="vite/client" />

interface AuthCallbackData {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

interface AuthErrorData {
  error: string;
  description?: string;
}

declare global {
  interface Window {
    navi: {
      // Window controls
      hide: () => void;
      resize: (height: number) => void;
      dock: (payload: { docked: boolean; side?: 'left' | 'right' | 'top' | 'bottom'; width?: number; height?: number }) => Promise<{ docked: boolean; side: 'left' | 'right' | 'top' | 'bottom' }>;
      mouseEnter: () => void;
      mouseLeave: () => void;

      // Shell
      openExternal: (url: string) => void;

      // Theme
      getTheme: () => Promise<boolean>;
      setTheme: (theme: string) => void;
      onThemeChange: (callback: (theme: string) => void) => () => void;

      // Dock behavior
      setDockBehavior: (behavior: 'right' | 'left') => void;
      onDockBehaviorChange: (callback: (behavior: 'right' | 'left') => void) => () => void;

      // Auth
      login: () => void;
      logout: () => void;
      onAuthCallback: (callback: (data: AuthCallbackData) => void) => () => void;
      onAuthError: (callback: (data: AuthErrorData) => void) => () => void;
      onLogout: (callback: () => void) => () => void;

      // Events
      onShow: (fn: () => void) => () => void;
      onHide: (fn: () => void) => () => void;
    };
  }
}

export { };
