"use strict";
const electron = require("electron");
const path = require("path");
if (require("electron-squirrel-startup")) electron.app.quit();
const PROTOCOL = "navi";
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    electron.app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  electron.app.setAsDefaultProtocolClient(PROTOCOL);
}
const SHORTCUT = process.platform === "darwin" ? "Command+`" : "Alt+Space";
const SETTINGS_SHORTCUT = "CommandOrControl+.";
let flowWindow = null;
let settingsWindow = null;
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
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    show: false,
    focusable: true,
    vibrancy: void 0,
    visualEffectState: "active",
    webPreferences: {
      preload: path.join(__dirname, "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
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
function createSettingsWindow() {
  const win = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    resizable: false,
    minimizable: true,
    maximizable: false,
    title: "Navi Settings",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#00000000",
    show: false,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
    }
  });
  console.log("[Settings] Dev URL:", "http://localhost:5174");
  console.log("[Settings] Vite Name:", "settings_window");
  {
    win.loadURL(`${"http://localhost:5174"}/settings.html`);
  }
  win.once("ready-to-show", () => {
    win.show();
  });
  win.on("closed", () => {
    settingsWindow = null;
  });
  return win;
}
function toggleSettings() {
  if (settingsWindow) {
    if (settingsWindow.isVisible()) {
      settingsWindow.hide();
    } else {
      settingsWindow.show();
      settingsWindow.focus();
    }
  } else {
    settingsWindow = createSettingsWindow();
  }
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
electron.ipcMain.on("settings:setTheme", (_e, theme) => {
  if (flowWindow) {
    flowWindow.webContents.send("settings:themeChanged", theme);
  }
  if (settingsWindow) {
    settingsWindow.webContents.send("settings:themeChanged", theme);
  }
});
electron.ipcMain.on("settings:open", toggleSettings);
function handleDeepLink(url) {
  console.log("[DeepLink] Received:", url);
  try {
    const parsed = new URL(url);
    const path2 = parsed.pathname.replace(/^\/+/, "");
    if (parsed.host === "auth" || path2.startsWith("auth")) {
      const route = path2.replace(/^auth\/?/, "");
      if (route === "callback" || route === "") {
        const accessToken = parsed.searchParams.get("access_token");
        const refreshToken = parsed.searchParams.get("refresh_token");
        const userId = parsed.searchParams.get("user_id");
        if (accessToken && refreshToken && userId) {
          const authData = { accessToken, refreshToken, userId };
          if (flowWindow) {
            flowWindow.webContents.send("auth:callback", authData);
          }
          if (settingsWindow) {
            settingsWindow.webContents.send("auth:callback", authData);
            settingsWindow.show();
            settingsWindow.focus();
          }
          console.log("[DeepLink] Auth successful for user:", userId);
        }
      } else if (route === "error") {
        const error = parsed.searchParams.get("error");
        const description = parsed.searchParams.get("description");
        if (settingsWindow) {
          settingsWindow.webContents.send("auth:error", { error, description });
          settingsWindow.show();
          settingsWindow.focus();
        }
        console.error("[DeepLink] Auth error:", error, description);
      }
    }
  } catch (err) {
    console.error("[DeepLink] Failed to parse URL:", err);
  }
}
electron.app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});
const gotTheLock = electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  electron.app.quit();
} else {
  electron.app.on("second-instance", (_event, commandLine) => {
    const url = commandLine.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (url) {
      handleDeepLink(url);
    }
    if (settingsWindow) {
      if (settingsWindow.isMinimized()) settingsWindow.restore();
      settingsWindow.focus();
    }
  });
}
electron.ipcMain.on("auth:login", () => {
  const apiUrl = process.env.NAVI_API_URL || "https://api-ten-xi-m8hwzstxh2.vercel.app";
  electron.shell.openExternal(`${apiUrl}/api/auth/login`);
});
electron.ipcMain.on("auth:logout", () => {
  if (flowWindow) {
    flowWindow.webContents.send("auth:logout");
  }
  if (settingsWindow) {
    settingsWindow.webContents.send("auth:logout");
  }
});
electron.app.whenReady().then(() => {
  electron.globalShortcut.register(SHORTCUT, toggleFlow);
  electron.globalShortcut.register(SETTINGS_SHORTCUT, toggleSettings);
  flowWindow = createFlowWindow();
});
electron.app.on("will-quit", () => electron.globalShortcut.unregisterAll());
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
