import {
  app,
  BrowserWindow,
  globalShortcut,
  screen,
  ipcMain,
  shell,
  nativeTheme,
} from 'electron';
import path from 'path';

// Note: electron-squirrel-startup is only needed for Windows Squirrel installer
// It's not bundled in production builds, so we skip it on non-Windows platforms

// ─────────────────────────────────────────────────────────────
// Deep Link Protocol (navi://)
// ─────────────────────────────────────────────────────────────
const PROTOCOL = 'navi';
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// ─────────────────────────────────────────────────────────────
// Constants - Platform-specific shortcuts
// ─────────────────────────────────────────────────────────────
const isMac = process.platform === 'darwin';
const SHORTCUT = isMac ? 'Command+`' : 'Alt+Space';
const SETTINGS_SHORTCUT = isMac ? 'Command+.' : 'Alt+.';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;
declare const SETTINGS_WINDOW_VITE_DEV_SERVER_URL: string;
declare const SETTINGS_WINDOW_VITE_NAME: string;

let flowWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

// ─────────────────────────────────────────────────────────────
// Window Creation - Full Screen Overlay Approach
// ─────────────────────────────────────────────────────────────
function createFlowWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width: width,
    height: height,
    x: primaryDisplay.workArea.x,
    y: primaryDisplay.workArea.y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    show: false,
    focusable: true,
    vibrancy: undefined,
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
  });

  win.setIgnoreMouseEvents(true, { forward: true });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  win.on('blur', () => {
    setTimeout(() => {
      if (flowWindow && !flowWindow.isFocused()) {
        hideFlow();
      }
    }, 100);
  });

  return win;
}

// ─────────────────────────────────────────────────────────────
// Settings Window Creation - Normal Window
// ─────────────────────────────────────────────────────────────
function createSettingsWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    resizable: false,
    minimizable: true,
    maximizable: false,
    title: 'Navi Settings',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#00000000',
    show: false,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
  });

  console.log('[Settings] Dev URL:', SETTINGS_WINDOW_VITE_DEV_SERVER_URL);
  console.log('[Settings] Vite Name:', SETTINGS_WINDOW_VITE_NAME);

  if (SETTINGS_WINDOW_VITE_DEV_SERVER_URL) {
    // Load settings.html explicitly for the settings window
    win.loadURL(`${SETTINGS_WINDOW_VITE_DEV_SERVER_URL}/settings.html`);
  } else {
    win.loadFile(path.join(__dirname, `../renderer/${SETTINGS_WINDOW_VITE_NAME}/settings.html`));
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    settingsWindow = null;
  });

  return win;
}

function toggleSettings(): void {
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

// ─────────────────────────────────────────────────────────────
// Show / Hide / Toggle
// ─────────────────────────────────────────────────────────────
function showFlow(): void {
  if (!flowWindow) return;

  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);

  flowWindow.setBounds({
    x: display.workArea.x,
    y: display.workArea.y,
    width: display.workArea.width,
    height: display.workArea.height,
  });

  flowWindow.show();
  flowWindow.focus();
  flowWindow.webContents.send('flow:show');
}

function hideFlow(): void {
  if (!flowWindow?.isVisible()) return;
  flowWindow.hide();
  flowWindow.webContents.send('flow:hide');
}

function toggleFlow(): void {
  if (!flowWindow) {
    flowWindow = createFlowWindow();
    flowWindow.once('ready-to-show', showFlow);
    return;
  }
  flowWindow.isVisible() ? hideFlow() : showFlow();
}

// ─────────────────────────────────────────────────────────────
// IPC Handlers
// ─────────────────────────────────────────────────────────────
ipcMain.on('flow:hide', hideFlow);

ipcMain.on('flow:mouseEnter', () => {
  if (!flowWindow) return;
  flowWindow.setIgnoreMouseEvents(false);
});

ipcMain.on('flow:mouseLeave', () => {
  if (!flowWindow) return;
  flowWindow.setIgnoreMouseEvents(true, { forward: true });
});

ipcMain.on('shell:openExternal', (_e, url: string) => {
  shell.openExternal(url);
});

ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors);

// Settings sync - broadcast theme changes to all windows
ipcMain.on('settings:setTheme', (_e, theme: string) => {
  // Broadcast to all windows
  if (flowWindow) {
    flowWindow.webContents.send('settings:themeChanged', theme);
  }
  if (settingsWindow) {
    settingsWindow.webContents.send('settings:themeChanged', theme);
  }
});

ipcMain.on('settings:open', toggleSettings);

// ─────────────────────────────────────────────────────────────
// Auth - Deep Link Handling
// ─────────────────────────────────────────────────────────────
function handleDeepLink(url: string) {
  console.log('[DeepLink] Received:', url);

  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\/+/, ''); // Remove leading slashes

    if (parsed.host === 'auth' || path.startsWith('auth')) {
      const route = path.replace(/^auth\/?/, '');

      if (route === 'callback' || route === '') {
        // Successful auth callback
        const accessToken = parsed.searchParams.get('access_token');
        const refreshToken = parsed.searchParams.get('refresh_token');
        const userId = parsed.searchParams.get('user_id');

        if (accessToken && refreshToken && userId) {
          // Send to all windows
          const authData = { accessToken, refreshToken, userId };
          if (flowWindow) {
            flowWindow.webContents.send('auth:callback', authData);
          }
          if (settingsWindow) {
            settingsWindow.webContents.send('auth:callback', authData);
            settingsWindow.show();
            settingsWindow.focus();
          }
          console.log('[DeepLink] Auth successful for user:', userId);
        }
      } else if (route === 'error') {
        // Auth error
        const error = parsed.searchParams.get('error');
        const description = parsed.searchParams.get('description');

        if (settingsWindow) {
          settingsWindow.webContents.send('auth:error', { error, description });
          settingsWindow.show();
          settingsWindow.focus();
        }
        console.error('[DeepLink] Auth error:', error, description);
      }
    }
  } catch (err) {
    console.error('[DeepLink] Failed to parse URL:', err);
  }
}

// Handle deep links on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// Handle deep links on Windows/Linux (single instance)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    // Find the deep link URL in command line args
    const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (url) {
      handleDeepLink(url);
    }

    // Focus the main window
    if (settingsWindow) {
      if (settingsWindow.isMinimized()) settingsWindow.restore();
      settingsWindow.focus();
    }
  });
}

// IPC for initiating auth
ipcMain.on('auth:login', () => {
  // Open browser to auth URL - the API will redirect to WorkOS
  const apiUrl = process.env.NAVI_API_URL || 'https://navi-search.vercel.app';
  shell.openExternal(`${apiUrl}/api/auth/login`);
});

ipcMain.on('auth:logout', () => {
  // Broadcast logout to all windows
  if (flowWindow) {
    flowWindow.webContents.send('auth:logout');
  }
  if (settingsWindow) {
    settingsWindow.webContents.send('auth:logout');
  }
});

// ─────────────────────────────────────────────────────────────
// App Lifecycle
// ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  globalShortcut.register(SHORTCUT, toggleFlow);
  globalShortcut.register(SETTINGS_SHORTCUT, toggleSettings);
  flowWindow = createFlowWindow();
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
