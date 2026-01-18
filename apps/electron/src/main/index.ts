import {
  app,
  BrowserWindow,
  globalShortcut,
  screen,
  ipcMain,
  shell,
  nativeTheme,
  Tray,
  Menu,
  dialog,
} from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater';

// ─────────────────────────────────────────────────────────────
// Windows Squirrel Installer Handling
// MUST be at the very top before any other code runs
// ─────────────────────────────────────────────────────────────
if (process.platform === 'win32') {
  // Handle Squirrel events for Windows installer
  // This handles: --squirrel-install, --squirrel-updated, --squirrel-uninstall, --squirrel-obsolete
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const started = require('electron-squirrel-startup');
    if (started) {
      // Squirrel event handled, quit immediately
      app.quit();
    }
  } catch (e) {
    // electron-squirrel-startup not available (e.g., in dev mode)
    // This is expected and safe to ignore
  }
}

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
const SHORTCUT = isMac ? 'Command+`' : 'Alt+`';
const SETTINGS_SHORTCUT = isMac ? 'Command+.' : 'Alt+.';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;
declare const SETTINGS_WINDOW_VITE_DEV_SERVER_URL: string;
declare const SETTINGS_WINDOW_VITE_NAME: string;

let flowWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// ─────────────────────────────────────────────────────────────
// Auto-Update Setup
// ─────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  // Disable auto-download, we'll prompt the user first
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available. Would you like to download it now?`,
      buttons: ['Download', 'Later'],
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. The app will restart to install the update.',
      buttons: ['Restart Now', 'Later'],
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (error) => {
    console.error('Auto-update error:', error);
  });

  // Check for updates (silently, in background)
  autoUpdater.checkForUpdates().catch(console.error);
}

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
      // webSecurity enabled by default in production
    },
  });

  win.setIgnoreMouseEvents(true, { forward: true });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    // Only open DevTools in development
    if (process.env.NODE_ENV === 'development') {
      win.webContents.openDevTools({ mode: 'detach' });
    }
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
      // webSecurity enabled by default in production
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

// Track which display the window was last shown on
let lastDisplayId: number | null = null;
// Track visibility state (for opacity-based approach on Windows)
let isFlowVisible = false;
// Animation state
let opacityAnimationTimer: NodeJS.Timeout | null = null;

// Smooth opacity animation for Windows
function animateOpacity(targetOpacity: number, duration: number = 120): Promise<void> {
  return new Promise((resolve) => {
    if (!flowWindow) {
      resolve();
      return;
    }

    // Clear any existing animation
    if (opacityAnimationTimer) {
      clearInterval(opacityAnimationTimer);
      opacityAnimationTimer = null;
    }

    const startOpacity = flowWindow.getOpacity();
    const startTime = Date.now();
    const diff = targetOpacity - startOpacity;

    // If already at target, resolve immediately
    if (Math.abs(diff) < 0.01) {
      flowWindow.setOpacity(targetOpacity);
      resolve();
      return;
    }

    const step = () => {
      if (!flowWindow) {
        if (opacityAnimationTimer) clearInterval(opacityAnimationTimer);
        opacityAnimationTimer = null;
        resolve();
        return;
      }

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentOpacity = startOpacity + (diff * eased);

      flowWindow.setOpacity(currentOpacity);

      if (progress >= 1) {
        if (opacityAnimationTimer) clearInterval(opacityAnimationTimer);
        opacityAnimationTimer = null;
        flowWindow.setOpacity(targetOpacity); // Ensure exact final value
        resolve();
      }
    };

    // Run at ~60fps
    opacityAnimationTimer = setInterval(step, 16);
    step(); // Run immediately
  });
}

function showFlow(): void {
  if (!flowWindow) return;

  // Already visible, do nothing
  if (isFlowVisible) return;

  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);

  // Only reposition if we're on a different display than before
  const needsReposition = lastDisplayId !== display.id;

  if (needsReposition) {
    lastDisplayId = display.id;
    flowWindow.setBounds({
      x: display.workArea.x,
      y: display.workArea.y,
      width: display.workArea.width,
      height: display.workArea.height,
    });
  }

  isFlowVisible = true;

  // On Windows, use animated opacity to avoid transparent window show/hide stutter
  if (process.platform === 'win32') {
    // Ensure window is shown (it should be, but just in case)
    if (!flowWindow.isVisible()) {
      flowWindow.setOpacity(0);
      flowWindow.show();
    }
    // Animate opacity for smooth appearance
    animateOpacity(1, 120);
  } else {
    flowWindow.show();
  }

  flowWindow.focus();
  flowWindow.webContents.send('flow:show');
}

function hideFlow(): void {
  if (!flowWindow || !isFlowVisible) return;

  isFlowVisible = false;
  flowWindow.webContents.send('flow:hide');

  // On Windows, use animated opacity to avoid transparent window hide stutter
  if (process.platform === 'win32') {
    // Animate opacity for smooth disappearance
    animateOpacity(0, 100).then(() => {
      // Blur after animation completes
      if (flowWindow) {
        flowWindow.blur();
      }
    });
  } else {
    flowWindow.hide();
  }
}

function toggleFlow(): void {
  if (!flowWindow) {
    flowWindow = createFlowWindow();
    // On Windows, show the window initially with 0 opacity
    if (process.platform === 'win32') {
      flowWindow.setOpacity(0);
      flowWindow.showInactive();
    }
    flowWindow.once('ready-to-show', showFlow);
    return;
  }
  isFlowVisible ? hideFlow() : showFlow();
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
  console.log('[Navi] App ready, initializing...');

  // Hide from dock on macOS (show only in menu bar)
  if (isMac) {
    app.dock.hide();
  }

  // Helper to get the correct tray icon based on platform and theme
  function getTrayIconPath(): string {
    // In packaged app, assets are in resources/assets
    // In dev, they're relative to the compiled main.js
    const assetsPath = app.isPackaged
      ? path.join(process.resourcesPath, 'assets')
      : path.join(__dirname, '../../assets');

    console.log('[Navi] Assets path:', assetsPath);

    if (isMac) {
      // macOS: Template icons auto-adapt to light/dark menu bar
      return path.join(assetsPath, 'trayIconTemplate.png');
    } else {
      // Windows/Linux: Use light icon on dark theme, dark icon on light theme
      const iconName = nativeTheme.shouldUseDarkColors ? 'trayIcon-light.png' : 'trayIcon-dark.png';
      const iconPath = path.join(assetsPath, iconName);
      console.log('[Navi] Tray icon path:', iconPath);
      return iconPath;
    }
  }

  // Create tray icon with error handling
  try {
    const trayIconPath = getTrayIconPath();
    console.log('[Navi] Creating tray with icon:', trayIconPath);
    tray = new Tray(trayIconPath);
    tray.setToolTip('Navi - Press Alt+` to show');
    console.log('[Navi] Tray created successfully');

    // Show a balloon notification on first launch (Windows only)
    if (process.platform === 'win32' && app.isPackaged) {
      tray.displayBalloon({
        iconType: 'info',
        title: 'Navi is running!',
        content: 'Press Alt+` to open Navi. Right-click this icon for options.',
      });
    }
  } catch (error) {
    console.error('[Navi] Failed to create tray:', error);
    // If tray fails, show an error dialog
    dialog.showErrorBox('Navi Error', `Failed to create system tray icon: ${error}`);
  }

  // Update tray icon when system theme changes (Windows/Linux)
  if (!isMac && tray) {
    nativeTheme.on('updated', () => {
      if (tray) {
        try {
          tray.setImage(getTrayIconPath());
        } catch (error) {
          console.error('[Navi] Failed to update tray icon:', error);
        }
      }
    });
  }

  // Enable launch at startup by default (only in production)
  if (app.isPackaged) {
    const loginSettings = app.getLoginItemSettings();
    if (!loginSettings.wasOpenedAtLogin) {
      // First launch or fresh install - enable startup by default
      app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: true, // Start hidden (as tray app)
      });
    }
  }

  // Build tray context menu with launch at startup toggle
  function buildTrayMenu() {
    const loginSettings = app.getLoginItemSettings();
    return Menu.buildFromTemplate([
      {
        label: 'Toggle Navi',
        accelerator: isMac ? 'Cmd+`' : 'Alt+`',
        click: toggleFlow
      },
      {
        label: 'Settings',
        accelerator: isMac ? 'Cmd+.' : 'Alt+.',
        click: toggleSettings
      },
      { type: 'separator' },
      {
        label: 'Launch at Startup',
        type: 'checkbox',
        checked: loginSettings.openAtLogin,
        click: (menuItem) => {
          app.setLoginItemSettings({
            openAtLogin: menuItem.checked,
            openAsHidden: true,
          });
          // Rebuild menu to reflect updated state
          if (tray) {
            tray.setContextMenu(buildTrayMenu());
          }
        }
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]);
  }

  if (tray) {
    tray.setContextMenu(buildTrayMenu());
    // Click on tray icon to toggle Navi
    tray.on('click', toggleFlow);
  }

  globalShortcut.register(SHORTCUT, toggleFlow);
  globalShortcut.register(SETTINGS_SHORTCUT, toggleSettings);
  flowWindow = createFlowWindow();
  console.log('[Navi] Flow window created');

  // Setup auto-updater (only in production builds)
  if (!MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    setupAutoUpdater();
  }

  console.log('[Navi] Initialization complete. Press Alt+` to show.');
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => {
  // Keep app running in background (it's a tray app)
  // Only quit explicitly via tray menu
});
