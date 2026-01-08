"use strict";
const electron = require("electron");
const path = require("path");
if (require("electron-squirrel-startup")) electron.app.quit();
const SHORTCUT = process.platform === "darwin" ? "Command+`" : "Alt+Space";
let flowWindow = null;
function createFlowWindow() {
  const primaryDisplay = electron.screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const win = new electron.BrowserWindow({
    width,
    height,
    x: primaryDisplay.workArea.x,
    y: primaryDisplay.workArea.y,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    // No shadow on full-screen overlay
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    show: false,
    focusable: true,
    // macOS specific
    vibrancy: void 0,
    // Vibrancy will be on the CSS panel, not the window
    visualEffectState: "active",
    webPreferences: {
      preload: path.join(__dirname, "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Disable sandbox to allow webSecurity: false
      webSecurity: false
      // Allow cross-origin requests (safe for desktop app)
    }
  });
  win.setIgnoreMouseEvents(true, { forward: true });
  {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  }
  win.on("blur", () => {
    setTimeout(() => {
      if (flowWindow && !flowWindow.isFocused()) {
        hideFlow();
      }
    }, 100);
  });
  return win;
}
function showFlow() {
  if (!flowWindow) return;
  const cursor = electron.screen.getCursorScreenPoint();
  const display = electron.screen.getDisplayNearestPoint(cursor);
  flowWindow.setBounds({
    x: display.workArea.x,
    y: display.workArea.y,
    width: display.workArea.width,
    height: display.workArea.height
  });
  flowWindow.show();
  flowWindow.focus();
  flowWindow.webContents.send("flow:show");
}
function hideFlow() {
  if (!(flowWindow == null ? void 0 : flowWindow.isVisible())) return;
  flowWindow.hide();
  flowWindow.webContents.send("flow:hide");
}
function toggleFlow() {
  if (!flowWindow) {
    flowWindow = createFlowWindow();
    flowWindow.once("ready-to-show", showFlow);
    return;
  }
  flowWindow.isVisible() ? hideFlow() : showFlow();
}
electron.ipcMain.on("flow:hide", hideFlow);
electron.ipcMain.on("flow:mouseEnter", () => {
  if (!flowWindow) return;
  flowWindow.setIgnoreMouseEvents(false);
});
electron.ipcMain.on("flow:mouseLeave", () => {
  if (!flowWindow) return;
  flowWindow.setIgnoreMouseEvents(true, { forward: true });
});
electron.ipcMain.on("shell:openExternal", (_e, url) => {
  electron.shell.openExternal(url);
});
electron.ipcMain.handle("theme:get", () => electron.nativeTheme.shouldUseDarkColors);
electron.app.whenReady().then(() => {
  electron.globalShortcut.register(SHORTCUT, toggleFlow);
  flowWindow = createFlowWindow();
});
electron.app.on("will-quit", () => electron.globalShortcut.unregisterAll());
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
