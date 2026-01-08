"use strict";
const electron = require("electron");
const api = {
  // Window controls
  hide: () => electron.ipcRenderer.send("flow:hide"),
  // Mouse event forwarding for click-through behavior
  mouseEnter: () => electron.ipcRenderer.send("flow:mouseEnter"),
  mouseLeave: () => electron.ipcRenderer.send("flow:mouseLeave"),
  // Shell
  openExternal: (url) => electron.ipcRenderer.send("shell:openExternal", url),
  // Theme
  getTheme: () => electron.ipcRenderer.invoke("theme:get"),
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
