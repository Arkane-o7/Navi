"use strict";
const electron = require("electron");
const api = {
  // Window controls
  hide: () => electron.ipcRenderer.send("flow:hide"),
  resize: (height) => electron.ipcRenderer.send("flow:resize", height),
  // Shell
  openExternal: (url) => electron.ipcRenderer.send("shell:openExternal", url),
  // Theme
  getTheme: () => electron.ipcRenderer.invoke("theme:get"),
  // Search / Launcher (Mage-inspired)
  search: (query) => electron.ipcRenderer.invoke("search:query", query),
  execute: (action) => electron.ipcRenderer.invoke("search:execute", action),
  // Events
  onShow: (callback) => {
    const handler = () => callback();
    electron.ipcRenderer.on("flow:show", handler);
    return () => electron.ipcRenderer.removeListener("flow:show", handler);
  },
  onHide: (callback) => {
    const handler = () => callback();
    electron.ipcRenderer.on("flow:hide", handler);
    return () => electron.ipcRenderer.removeListener("flow:hide", handler);
  }
};
electron.contextBridge.exposeInMainWorld("navi", api);
