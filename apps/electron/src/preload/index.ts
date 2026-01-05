import { contextBridge, ipcRenderer } from 'electron';

const api = {
  hide: () => ipcRenderer.send('spotlight:hide'),
  resize: (height: number) => ipcRenderer.send('spotlight:resize', height),
  openExternal: (url: string) => ipcRenderer.send('shell:open', url),
  
  onShow: (fn: () => void) => {
    const handler = () => fn();
    ipcRenderer.on('spotlight:show', handler);
    return () => ipcRenderer.removeListener('spotlight:show', handler);
  },
  
  onHide: (fn: () => void) => {
    const handler = () => fn();
    ipcRenderer.on('spotlight:hide', handler);
    return () => ipcRenderer.removeListener('spotlight:hide', handler);
  },
};

contextBridge.exposeInMainWorld('navi', api);

export type NaviAPI = typeof api;
