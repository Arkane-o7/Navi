import {
  app,
  BrowserWindow,
  globalShortcut,
  screen,
  ipcMain,
  shell,
  nativeTheme,
  nativeImage,
  Tray,
  Menu,
  dialog,
} from 'electron';
import path from 'path';
import { updateElectronApp, UpdateSourceType } from 'update-electron-app';
import { execFile } from 'child_process';
import { logger } from '../shared/logger';

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

// Set app name (overrides "Electron" in dev mode)
app.setName('Navi');

/** Resolve the Navi icon path (works in both dev and packaged mode). */
function getNaviIconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'icon.png')
    : path.join(__dirname, '../../assets/icon.png');
}

/** Show the macOS dock and override its icon with Navi's icon. */
async function showDockWithNaviIcon(): Promise<void> {
  if (!isMac) return;
  // Show dock first, THEN override the icon — setIcon before show is ignored.
  await app.dock.show();
  try {
    const icon = nativeImage.createFromPath(getNaviIconPath());
    if (!icon.isEmpty()) {
      app.dock.setIcon(icon);
      logger.debug('[Navi] Dock icon set successfully');
    } else {
      logger.error('[Navi] Dock icon image is empty');
    }
  } catch (err) {
    logger.error('[Navi] Failed to set dock icon:', err);
  }
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;
declare const SETTINGS_WINDOW_VITE_DEV_SERVER_URL: string;
declare const SETTINGS_WINDOW_VITE_NAME: string;

let flowWindow: BrowserWindow | null = null;
let dockedWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isDocked = false;
let dockSide: 'left' | 'right' | 'top' | 'bottom' = 'right';
let dockedSize = { width: 420, height: 0 };
// Guard: suppress blur-hide during dock/undock transitions
let dockTransitionUntil = 0;

// ─────────────────────────────────────────────────────────────
// macOS Window Tiling via AppleScript
// ─────────────────────────────────────────────────────────────
function tileOtherWindows(remainingBounds: { x: number; y: number; width: number; height: number }): void {
  if (!isMac) return;

  const { x, y, width, height } = remainingBounds;

  // AppleScript to move/resize all visible windows of other apps into the remaining space
  const script = `
    tell application "System Events"
      set allProcs to every process whose visible is true and name is not "Navi" and name is not "Electron"
      repeat with proc in allProcs
        try
          set procName to name of proc
          -- Skip menu bar apps and system processes
          if (count of windows of proc) > 0 then
            tell application procName
              repeat with win in every window
                try
                  set bounds of win to {${x}, ${y}, ${x + width}, ${y + height}}
                end try
              end repeat
            end tell
          end if
        end try
      end repeat
    end tell
  `;

  execFile('osascript', ['-e', script], (err) => {
    if (err) {
      logger.error('[Navi] Failed to tile other windows:', err.message);
    } else {
      logger.debug('[Navi] Tiled other windows to remaining space');
    }
  });
}

function restoreOtherWindows(fullBounds: { x: number; y: number; width: number; height: number }): void {
  if (!isMac) return;
  tileOtherWindows(fullBounds);
}

// ─────────────────────────────────────────────────────────────
// Auto-Update Setup
// ─────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  // update-electron-app is the recommended auto-update path for Electron Forge.
  // This updater currently supports macOS and Windows.
  if (process.platform !== 'darwin' && process.platform !== 'win32') {
    return;
  }

  try {
    updateElectronApp({
      updateSource: {
        type: UpdateSourceType.ElectronPublicUpdateService,
        repo: 'Arkane-o7/Navi',
      },
      updateInterval: '10 minutes',
      notifyUser: true,
    });

    logger.info('[Navi] Auto-updater initialized');
  } catch (error) {
    logger.error('[Navi] Auto-updater initialization failed:', error);
  }
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
      if (!flowWindow || flowWindow.isDestroyed()) return;
      // Don't hide if: window refocused, docked, just shown (<300ms ago), or in dock transition
      if (flowWindow.isFocused()) return;
      if (isDocked) return;
      if (Date.now() - showTimestamp < 300) return;
      if (Date.now() < dockTransitionUntil) return;
      logger.debug('[Navi] Blur handler: hiding flow');
      hideFlow();
    }, 100);
  });

  win.on('show', () => {
    isFlowVisible = true;
  });

  win.on('hide', () => {
    isFlowVisible = false;
  });

  return win;
}

// ─────────────────────────────────────────────────────────────
// Docked Window Creation - Solid, Non-Transparent Window
// ─────────────────────────────────────────────────────────────
function createDockedWindow(bounds: { x: number; y: number; width: number; height: number }): BrowserWindow {
  const win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    transparent: false,
    backgroundColor: '#1c1c1e',
    hasShadow: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    movable: false,
    show: false,
    focusable: true,
    title: 'Navi',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load the same renderer but with a query param so it knows it's docked
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?docked=true`);
  } else {
    win.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { query: { docked: 'true' } }
    );
  }

  win.on('closed', () => {
    dockedWindow = null;
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

  logger.debug('[Settings] Dev URL:', SETTINGS_WINDOW_VITE_DEV_SERVER_URL);
  logger.debug('[Settings] Vite Name:', SETTINGS_WINDOW_VITE_NAME);

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
// Guard against blur firing right after show
let showTimestamp = 0;
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
  if (!flowWindow || flowWindow.isDestroyed()) return;

  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);

  if (!isDocked) {
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
  }

  isFlowVisible = true;
  showTimestamp = Date.now();

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
    // Re-assert alwaysOnTop level (macOS can reset it during dock mode changes)
    flowWindow.setAlwaysOnTop(true, 'floating');
    flowWindow.show();
  }

  flowWindow.focus();
  flowWindow.webContents.send('flow:show');
}

function hideFlow(): void {
  if (!flowWindow || flowWindow.isDestroyed()) return;
  // Never hide while docked or during dock transition
  if (isDocked) return;
  if (Date.now() < dockTransitionUntil) return;

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
  // When docked, just focus the docked window
  if (isDocked && dockedWindow && !dockedWindow.isDestroyed()) {
    if (dockedWindow.isVisible()) {
      dockedWindow.focus();
    } else {
      dockedWindow.show();
      dockedWindow.focus();
    }
    return;
  }

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

async function dockFlowWindow(payload: { docked: boolean; side?: 'left' | 'right' | 'top' | 'bottom'; width?: number; height?: number }): Promise<void> {
  const docked = payload.docked;
  const side = payload.side ?? dockSide;
  const width = payload.width ?? dockedSize.width;
  const height = payload.height ?? dockedSize.height;

  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const { x, y, width: displayWidth, height: displayHeight } = display.workArea;

  dockSide = side;
  dockedSize = { width, height };

  logger.debug('[Navi] Dock request:', {
    docked,
    payloadSide: payload.side,
    effectiveSide: side,
    storedDockSide: dockSide,
  });

  if (!docked) {
    // ── Undock: close docked window, restore overlay ──
    logger.debug('[Navi] Undocking...');
    isDocked = false;

    // Suppress blur-hide for the entire transition
    dockTransitionUntil = Date.now() + 3000;

    // 1. Close the docked window first
    if (dockedWindow && !dockedWindow.isDestroyed()) {
      dockedWindow.close();
      dockedWindow = null;
    }

    // 2. Restore other windows to full screen
    restoreOtherWindows({ x, y, width: displayWidth, height: displayHeight });

    // 3. Hide dock icon BEFORE showing overlay (synchronous).
    //    This puts the app back into agent mode while no windows are visible,
    //    avoiding the race where dock.hide() defocuses a visible window.
    if (isMac) {
      app.dock.hide();
      logger.debug('[Navi] Dock icon hidden (before showing overlay)');
    }

    // 4. Small delay for macOS to settle into agent mode, then show overlay
    setTimeout(() => {
      if (!flowWindow || flowWindow.isDestroyed()) {
        // Recreate if destroyed
        flowWindow = createFlowWindow();
        flowWindow.once('ready-to-show', () => {
          showFlow();
          logger.debug('[Navi] Flow recreated and shown after undock');
        });
        return;
      }

      // Reset click-through to initial overlay state
      flowWindow.setIgnoreMouseEvents(true, { forward: true });
      flowWindow.setBounds({ x, y, width: displayWidth, height: displayHeight });
      // Re-assert alwaysOnTop with explicit level after dock mode change
      flowWindow.setAlwaysOnTop(true, 'floating');
      showFlow();
      logger.debug('[Navi] Flow shown after undock');
    }, 250);

    return;
  }

  // ── Dock: hide overlay, create solid docked window ──
  isDocked = true;
  const dockWidth = Math.min(Math.max(width, 320), displayWidth);
  const dockHeight = Math.min(Math.max(height || displayHeight, 200), displayHeight);

  let bounds = { x, y, width: dockWidth, height: dockHeight };

  if (side === 'right') {
    bounds.x = x + displayWidth - dockWidth;
  } else if (side === 'left') {
    bounds.x = x;
  } else if (side === 'top') {
    bounds.y = y;
    bounds.width = displayWidth;
  } else if (side === 'bottom') {
    bounds.y = y + displayHeight - dockHeight;
    bounds.width = displayWidth;
  }

  // Hide the transparent overlay
  if (flowWindow && !flowWindow.isDestroyed()) {
    flowWindow.hide();
    isFlowVisible = false;
  }

  // Show dock icon so macOS treats this as a real app
  await showDockWithNaviIcon();

  // Create or reposition docked window
  if (dockedWindow && !dockedWindow.isDestroyed()) {
    dockedWindow.setBounds(bounds);
  } else {
    dockedWindow = createDockedWindow(bounds);
  }

  dockedWindow.once('ready-to-show', () => {
    if (dockedWindow) {
      dockedWindow.show();
      dockedWindow.focus();
    }

    // Tile other windows to fill remaining space
    if (side === 'right') {
      tileOtherWindows({ x, y, width: displayWidth - dockWidth, height: displayHeight });
    } else if (side === 'left') {
      tileOtherWindows({ x: x + dockWidth, y, width: displayWidth - dockWidth, height: displayHeight });
    } else if (side === 'top') {
      tileOtherWindows({ x, y: y + dockHeight, width: displayWidth, height: displayHeight - dockHeight });
    } else if (side === 'bottom') {
      tileOtherWindows({ x, y, width: displayWidth, height: displayHeight - dockHeight });
    }
  });

  // If already ready, show immediately
  if (dockedWindow.isVisible()) {
    dockedWindow.focus();
  }
}

// ─────────────────────────────────────────────────────────────
// IPC Handlers
// ─────────────────────────────────────────────────────────────
ipcMain.on('flow:hide', hideFlow);

ipcMain.on('flow:mouseEnter', () => {
  if (!flowWindow || flowWindow.isDestroyed()) return;
  if (!isDocked) {
    flowWindow.setIgnoreMouseEvents(false);
  }
});

ipcMain.on('flow:mouseLeave', () => {
  if (!flowWindow || flowWindow.isDestroyed()) return;
  if (!isDocked) {
    flowWindow.setIgnoreMouseEvents(true, { forward: true });
  }
});

ipcMain.handle('flow:dock', async (_event, payload: { docked: boolean; side?: 'left' | 'right' | 'top' | 'bottom'; width?: number; height?: number }) => {
  try {
    await dockFlowWindow(payload);
  } catch (err) {
    logger.error('[Navi] Dock handler error:', err);
  }
  return { docked: isDocked, side: dockSide };
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
  if (dockedWindow) {
    dockedWindow.webContents.send('settings:themeChanged', theme);
  }
  if (settingsWindow) {
    settingsWindow.webContents.send('settings:themeChanged', theme);
  }
});

// Settings sync - broadcast dock behavior changes to all windows
ipcMain.on('settings:setDockBehavior', (_e, behavior: 'right' | 'left') => {
  dockSide = behavior;
  if (flowWindow) {
    flowWindow.webContents.send('settings:dockBehaviorChanged', behavior);
  }
  if (dockedWindow) {
    dockedWindow.webContents.send('settings:dockBehaviorChanged', behavior);
  }
  if (settingsWindow) {
    settingsWindow.webContents.send('settings:dockBehaviorChanged', behavior);
  }
});

ipcMain.on('settings:open', toggleSettings);

// ─────────────────────────────────────────────────────────────
// Auth - Deep Link Handling
// ─────────────────────────────────────────────────────────────
function handleDeepLink(url: string) {
  logger.debug('[DeepLink] Received:', url);

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
          if (dockedWindow) {
            dockedWindow.webContents.send('auth:callback', authData);
          }
          if (settingsWindow) {
            settingsWindow.webContents.send('auth:callback', authData);
            settingsWindow.show();
            settingsWindow.focus();
          }
          logger.debug('[DeepLink] Auth successful for user:', userId);
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
        logger.error('[DeepLink] Auth error:', error, description);
      }
    }
  } catch (err) {
    logger.error('[DeepLink] Failed to parse URL:', err);
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
  if (dockedWindow) {
    dockedWindow.webContents.send('auth:logout');
  }
  if (settingsWindow) {
    settingsWindow.webContents.send('auth:logout');
  }
});

// ─────────────────────────────────────────────────────────────
// App Lifecycle
// ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  logger.debug('[Navi] App ready, initializing...');

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

    logger.debug('[Navi] Assets path:', assetsPath);

    if (isMac) {
      // macOS: Template icons auto-adapt to light/dark menu bar
      return path.join(assetsPath, 'trayIconTemplate.png');
    } else {
      // Windows/Linux: Use light icon on dark theme, dark icon on light theme
      const iconName = nativeTheme.shouldUseDarkColors ? 'trayIcon-light.png' : 'trayIcon-dark.png';
      const iconPath = path.join(assetsPath, iconName);
      logger.debug('[Navi] Tray icon path:', iconPath);
      return iconPath;
    }
  }

  // Create tray icon with error handling
  try {
    const trayIconPath = getTrayIconPath();
    logger.debug('[Navi] Creating tray with icon:', trayIconPath);
    tray = new Tray(trayIconPath);
    tray.setToolTip('Navi - Press Alt+` to show');
    logger.debug('[Navi] Tray created successfully');

    // Show a balloon notification on first launch (Windows only)
    if (process.platform === 'win32' && app.isPackaged) {
      tray.displayBalloon({
        iconType: 'info',
        title: 'Navi is running!',
        content: 'Press Alt+` to open Navi. Right-click this icon for options.',
      });
    }
  } catch (error) {
    logger.error('[Navi] Failed to create tray:', error);
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
          logger.error('[Navi] Failed to update tray icon:', error);
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
  logger.debug('[Navi] Flow window created');

  // Setup auto-updater (only in production builds)
  if (!MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    setupAutoUpdater();
  }

  logger.debug('[Navi] Initialization complete. Press Alt+` to show.');
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => {
  // Keep app running in background (it's a tray app)
  // Only quit explicitly via tray menu
});
