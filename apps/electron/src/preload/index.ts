import { contextBridge, ipcRenderer } from 'electron';

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
};

contextBridge.exposeInMainWorld('navi', api);

export type NaviAPI = typeof api;
