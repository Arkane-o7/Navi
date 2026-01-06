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
  nativeImage,
} from 'electron';
import path from 'path';

// Quit when opened by Squirrel installer
if (require('electron-squirrel-startup')) app.quit();

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const WINDOW_WIDTH = 680;
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 520;
const SHORTCUT = process.platform === 'darwin' ? 'Command+Space' : 'Alt+Space';
const FALLBACK_SHORTCUT = process.platform === 'darwin' ? 'Command+`' : 'Ctrl+Space';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let flowWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// ─────────────────────────────────────────────────────────────
// Window Creation
// ─────────────────────────────────────────────────────────────
function createFlowWindow(): BrowserWindow {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: MIN_HEIGHT,
    x: Math.round((screenWidth - WINDOW_WIDTH) / 2),
    y: 100,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    show: false,
    vibrancy: 'popover',
    visualEffectState: 'active',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Load renderer
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    // Open DevTools in dev mode (detached)
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Hide on blur
  win.on('blur', hideFlow);

  return win;
}

// ─────────────────────────────────────────────────────────────
// System Tray
// ─────────────────────────────────────────────────────────────
function createTray(): void {
  // Create a simple tray icon (16x16 for macOS, 32x32 for Windows)
  const iconSize = process.platform === 'darwin' ? 16 : 32;
  const icon = nativeImage.createEmpty();
  
  // Create a simple colored circle as the tray icon
  // In production, you would load an actual icon file
  try {
    tray = new Tray(icon);
    tray.setToolTip('Navi - AI Assistant');
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Navi',
        click: () => toggleFlow(),
      },
      { type: 'separator' },
      {
        label: 'About Navi',
        click: () => {
          shell.openExternal('https://github.com/Arkane-o7/Navi');
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit(),
      },
    ]);
    
    tray.setContextMenu(contextMenu);
    tray.on('click', () => toggleFlow());
  } catch (error) {
    console.log('Tray creation skipped (no icon available)');
  }
}

// ─────────────────────────────────────────────────────────────
// Show / Hide / Toggle
// ─────────────────────────────────────────────────────────────
function showFlow(): void {
  if (!flowWindow) return;

  // Position on the display where the cursor is
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const x = Math.round(display.workArea.x + (display.workArea.width - WINDOW_WIDTH) / 2);

  flowWindow.setPosition(x, 100);
  flowWindow.setSize(WINDOW_WIDTH, MIN_HEIGHT, false);
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

ipcMain.on('flow:resize', (_e, height: number) => {
  if (!flowWindow) return;
  
  const clamped = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.ceil(height)));
  const [currentWidth, currentHeight] = flowWindow.getSize();
  
  // Only resize if height actually changed
  if (currentHeight !== clamped) {
    console.log(`[Resize] ${currentHeight} -> ${clamped}`);
    flowWindow.setSize(currentWidth, clamped, false); // instant resize
  }
});

ipcMain.on('shell:openExternal', (_e, url: string) => {
  shell.openExternal(url);
});

ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors);

// ─────────────────────────────────────────────────────────────
// Register Global Shortcuts
// ─────────────────────────────────────────────────────────────
function registerShortcuts(): void {
  // Try primary shortcut first
  const primaryRegistered = globalShortcut.register(SHORTCUT, toggleFlow);
  
  if (!primaryRegistered) {
    console.log(`Primary shortcut (${SHORTCUT}) failed, trying fallback...`);
    // Try fallback shortcut
    const fallbackRegistered = globalShortcut.register(FALLBACK_SHORTCUT, toggleFlow);
    
    if (!fallbackRegistered) {
      console.error('Failed to register any global shortcuts');
    } else {
      console.log(`Using fallback shortcut: ${FALLBACK_SHORTCUT}`);
    }
  } else {
    console.log(`Registered primary shortcut: ${SHORTCUT}`);
  }
}

// ─────────────────────────────────────────────────────────────
// App Lifecycle
// ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  registerShortcuts();
  flowWindow = createFlowWindow(); // Pre-create for instant open
  createTray();
  
  // Keep app running in background on macOS
  if (process.platform === 'darwin') {
    app.dock?.hide();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (tray) {
    tray.destroy();
  }
});

app.on('window-all-closed', () => {
  // Don't quit on window close - keep running in tray
  if (process.platform !== 'darwin') {
    // On Windows/Linux, we still quit when all windows are closed
    // unless we have a tray icon
    if (!tray) {
      app.quit();
    }
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (!flowWindow) {
    flowWindow = createFlowWindow();
  }
  showFlow();
});
