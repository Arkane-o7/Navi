"use strict";
const electron = require("electron");
const api = {
  // Window controls
  hide: () => electron.ipcRenderer.send("flow:hide"),
  dock: (payload) => electron.ipcRenderer.invoke("flow:dock", payload),
  // Mouse event forwarding for click-through behavior
  mouseEnter: () => electron.ipcRenderer.send("flow:mouseEnter"),
  mouseLeave: () => electron.ipcRenderer.send("flow:mouseLeave"),
  // Shell
  openExternal: (url) => electron.ipcRenderer.send("shell:openExternal", url),
  // Theme
  getTheme: () => electron.ipcRenderer.invoke("theme:get"),
  // Settings sync - broadcast theme changes to all windows
  setTheme: (theme) => electron.ipcRenderer.send("settings:setTheme", theme),
  onThemeChange: (callback) => {
    const handler = (_event, theme) => callback(theme);
    electron.ipcRenderer.on("settings:themeChanged", handler);
    return () => electron.ipcRenderer.removeListener("settings:themeChanged", handler);
  },
  // Dock behavior sync
  setDockBehavior: (behavior) => electron.ipcRenderer.send("settings:setDockBehavior", behavior),
  onDockBehaviorChange: (callback) => {
    const handler = (_event, behavior) => callback(behavior);
    electron.ipcRenderer.on("settings:dockBehaviorChanged", handler);
    return () => electron.ipcRenderer.removeListener("settings:dockBehaviorChanged", handler);
  },
  // Auth
  login: () => electron.ipcRenderer.send("auth:login"),
  logout: () => electron.ipcRenderer.send("auth:logout"),
  onAuthCallback: (callback) => {
    const handler = (_event, data) => callback(data);
    electron.ipcRenderer.on("auth:callback", handler);
    return () => electron.ipcRenderer.removeListener("auth:callback", handler);
  },
  onAuthError: (callback) => {
    const handler = (_event, data) => callback(data);
    electron.ipcRenderer.on("auth:error", handler);
    return () => electron.ipcRenderer.removeListener("auth:error", handler);
  },
  onLogout: (callback) => {
    const handler = () => callback();
    electron.ipcRenderer.on("auth:logout", handler);
    return () => electron.ipcRenderer.removeListener("auth:logout", handler);
  },
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
