"use strict";
const electron = require("electron");
const path = require("path");
if (require("electron-squirrel-startup")) electron.app.quit();
const WINDOW_WIDTH = 640;
const MIN_HEIGHT = 54;
const MAX_HEIGHT = 480;
const SHORTCUT = process.platform === "darwin" ? "Command+`" : "Alt+Space";
let flowWindow = null;
function createFlowWindow() {
  const { width: screenWidth } = electron.screen.getPrimaryDisplay().workAreaSize;
  const win = new electron.BrowserWindow({
    width: WINDOW_WIDTH,
    height: MIN_HEIGHT,
    x: Math.round((screenWidth - WINDOW_WIDTH) / 2),
    y: 120,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    show: false,
    vibrancy: "popover",
    visualEffectState: "active",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  {
    win.loadURL("http://localhost:5175");
    win.webContents.openDevTools({ mode: "detach" });
  }
  win.on("blur", hideFlow);
  return win;
}
function showFlow() {
  if (!flowWindow) return;
  const cursor = electron.screen.getCursorScreenPoint();
  const display = electron.screen.getDisplayNearestPoint(cursor);
  const x = Math.round(display.workArea.x + (display.workArea.width - WINDOW_WIDTH) / 2);
  flowWindow.setPosition(x, 120);
  flowWindow.setSize(WINDOW_WIDTH, MIN_HEIGHT, false);
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
electron.ipcMain.on("flow:resize", (_e, height) => {
  if (!flowWindow) return;
  const clamped = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.ceil(height)));
  const [currentWidth, currentHeight] = flowWindow.getSize();
  if (currentHeight !== clamped) {
    console.log(`[Resize] ${currentHeight} -> ${clamped}`);
    flowWindow.setSize(currentWidth, clamped, false);
  }
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
