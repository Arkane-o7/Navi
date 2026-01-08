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

// Quit when opened by Squirrel installer
if (require('electron-squirrel-startup')) app.quit();

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const SHORTCUT = process.platform === 'darwin' ? 'Command+`' : 'Alt+Space';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let flowWindow: BrowserWindow | null = null;

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
    hasShadow: false, // No shadow on full-screen overlay
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    show: false,
    focusable: true,
    // macOS specific
    vibrancy: undefined, // Vibrancy will be on the CSS panel, not the window
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Disable sandbox to allow webSecurity: false
      webSecurity: false, // Allow cross-origin requests (safe for desktop app)
    },
  });

  // Enable click-through by default (clicks pass to apps behind)
  // forward: true allows us to receive mouse events to detect when
  // the cursor enters our UI panel
  win.setIgnoreMouseEvents(true, { forward: true });

  // Load renderer
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    // Open DevTools in dev mode
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Hide on blur - but only if we're not clicking within our UI
  win.on('blur', () => {
    // Small delay to prevent hiding when clicking within the panel
    setTimeout(() => {
      if (flowWindow && !flowWindow.isFocused()) {
        hideFlow();
      }
    }, 100);
  });

  return win;
}

// ─────────────────────────────────────────────────────────────
// Show / Hide / Toggle
// ─────────────────────────────────────────────────────────────
function showFlow(): void {
  if (!flowWindow) return;

  // Position window to cover the display where the cursor is
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  
  // Make window cover the entire display
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

// Toggle click-through based on mouse position over UI panel
ipcMain.on('flow:mouseEnter', () => {
  if (!flowWindow) return;
  // Disable click-through when mouse is over the UI panel
  flowWindow.setIgnoreMouseEvents(false);
});

ipcMain.on('flow:mouseLeave', () => {
  if (!flowWindow) return;
  // Re-enable click-through when mouse leaves the UI panel
  flowWindow.setIgnoreMouseEvents(true, { forward: true });
});

ipcMain.on('shell:openExternal', (_e, url: string) => {
  shell.openExternal(url);
});

ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors);

// ─────────────────────────────────────────────────────────────
// App Lifecycle
// ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  globalShortcut.register(SHORTCUT, toggleFlow);
  flowWindow = createFlowWindow(); // Pre-create for instant open
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
