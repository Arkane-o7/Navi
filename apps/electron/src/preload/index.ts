import { contextBridge, ipcRenderer } from 'electron';

interface AuthCallbackData {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

interface AuthErrorData {
  error: string;
  description?: string;
}

const api = {
  // Window controls
  hide: () => ipcRenderer.send('flow:hide'),

  // Mouse event forwarding for click-through behavior
  mouseEnter: () => ipcRenderer.send('flow:mouseEnter'),
  mouseLeave: () => ipcRenderer.send('flow:mouseLeave'),

  // Shell
  openExternal: (url: string) => ipcRenderer.send('shell:openExternal', url),

  // Theme
  getTheme: (): Promise<boolean> => ipcRenderer.invoke('theme:get'),

  // Settings sync - broadcast theme changes to all windows
  setTheme: (theme: string) => ipcRenderer.send('settings:setTheme', theme),
  onThemeChange: (callback: (theme: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, theme: string) => callback(theme);
    ipcRenderer.on('settings:themeChanged', handler);
    return () => ipcRenderer.removeListener('settings:themeChanged', handler);
  },

  // Auth
  login: () => ipcRenderer.send('auth:login'),
  logout: () => ipcRenderer.send('auth:logout'),
  onAuthCallback: (callback: (data: AuthCallbackData) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: AuthCallbackData) => callback(data);
    ipcRenderer.on('auth:callback', handler);
    return () => ipcRenderer.removeListener('auth:callback', handler);
  },
  onAuthError: (callback: (data: AuthErrorData) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: AuthErrorData) => callback(data);
    ipcRenderer.on('auth:error', handler);
    return () => ipcRenderer.removeListener('auth:error', handler);
  },
  onLogout: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('auth:logout', handler);
    return () => ipcRenderer.removeListener('auth:logout', handler);
  },

  // Events
  onShow: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('flow:show', handler);
    return () => ipcRenderer.removeListener('flow:show', handler);
  },

  onHide: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('flow:hide', handler);
    return () => ipcRenderer.removeListener('flow:hide', handler);
  },

  // Message sync - notify other windows when a message is sent
  messageSent: () => ipcRenderer.send('chat:messageSent'),
  onMessageSent: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('chat:messageSent', handler);
    return () => ipcRenderer.removeListener('chat:messageSent', handler);
  },
};

contextBridge.exposeInMainWorld('navi', api);

export type NaviAPI = typeof api;
