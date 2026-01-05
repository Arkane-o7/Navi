"use strict";
const electron = require("electron");
const path = require("path");
if (require("electron-squirrel-startup")) {
  electron.app.quit();
}
let spotlightWindow = null;
const WINDOW_WIDTH = 680;
const MIN_HEIGHT = 60;
const MAX_HEIGHT = 520;
function createSpotlightWindow() {
  const primaryDisplay = electron.screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  const win = new electron.BrowserWindow({
    width: WINDOW_WIDTH,
    height: MIN_HEIGHT,
    x: Math.round((screenWidth - WINDOW_WIDTH) / 2),
    y: 140,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    show: false,
    roundedCorners: true,
    vibrancy: "popover",
    visualEffectState: "active",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  {
    win.loadURL("http://localhost:5173");
  }
  win.on("blur", () => {
    hideSpotlight();
  });
  win.once("ready-to-show", () => {
    console.log("Window ready");
  });
  return win;
}
function showSpotlight() {
  if (!spotlightWindow) return;
  const cursor = electron.screen.getCursorScreenPoint();
  const display = electron.screen.getDisplayNearestPoint(cursor);
  const { x: displayX, width: displayWidth } = display.workArea;
  spotlightWindow.setPosition(
    Math.round(displayX + (displayWidth - WINDOW_WIDTH) / 2),
    140
  );
  spotlightWindow.setSize(WINDOW_WIDTH, MIN_HEIGHT, false);
  spotlightWindow.show();
  spotlightWindow.focus();
  spotlightWindow.webContents.send("spotlight:show");
}
function hideSpotlight() {
  if (!spotlightWindow || !spotlightWindow.isVisible()) return;
  spotlightWindow.hide();
  spotlightWindow.webContents.send("spotlight:hide");
}
function toggleSpotlight() {
  if (!spotlightWindow) {
    spotlightWindow = createSpotlightWindow();
    spotlightWindow.once("ready-to-show", showSpotlight);
    return;
  }
  if (spotlightWindow.isVisible()) {
    hideSpotlight();
  } else {
    showSpotlight();
  }
}
electron.ipcMain.on("spotlight:hide", () => hideSpotlight());
electron.ipcMain.on("spotlight:resize", (_event, contentHeight) => {
  if (!spotlightWindow) {
    console.log("No window to resize");
    return;
  }
  const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.ceil(contentHeight)));
  console.log("Resize requested:", contentHeight, "-> clamped:", newHeight);
  const [, currentHeight] = spotlightWindow.getSize();
  if (currentHeight !== newHeight) {
    console.log("Applying resize from", currentHeight, "to", newHeight);
    spotlightWindow.setSize(WINDOW_WIDTH, newHeight, false);
  }
});
electron.ipcMain.on("shell:open", (_event, url) => {
  electron.shell.openExternal(url);
});
electron.app.whenReady().then(() => {
  const shortcut = process.platform === "darwin" ? "Command+`" : "Alt+Space";
  if (electron.globalShortcut.register(shortcut, toggleSpotlight)) {
    console.log("Shortcut registered:", shortcut);
  } else {
    console.error("Failed to register shortcut");
  }
  spotlightWindow = createSpotlightWindow();
});
electron.app.on("will-quit", () => {
  electron.globalShortcut.unregisterAll();
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
