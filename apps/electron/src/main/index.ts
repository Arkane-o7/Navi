import {
  app,
  BrowserWindow,
  globalShortcut,
  screen,
  ipcMain,
  shell,
} from 'electron';
import path from 'path';

if (require('electron-squirrel-startup')) {
  app.quit();
}

let spotlightWindow: BrowserWindow | null = null;

const WINDOW_WIDTH = 680;
const MIN_HEIGHT = 60; // Match CSS --input-height
const MAX_HEIGHT = 520;

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

function createSpotlightWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: MIN_HEIGHT,
    x: Math.round((screenWidth - WINDOW_WIDTH) / 2),
    y: 140,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    show: false,
    roundedCorners: true,
    vibrancy: 'popover',
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  win.on('blur', () => {
    hideSpotlight();
  });

  win.once('ready-to-show', () => {
    console.log('Window ready');
  });

  return win;
}

function showSpotlight(): void {
  if (!spotlightWindow) return;

  // Center on current display
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const { x: displayX, width: displayWidth } = display.workArea;

  spotlightWindow.setPosition(
    Math.round(displayX + (displayWidth - WINDOW_WIDTH) / 2),
    140
  );
  
  // Reset to input-only height
  spotlightWindow.setSize(WINDOW_WIDTH, MIN_HEIGHT, false);
  spotlightWindow.show();
  spotlightWindow.focus();
  spotlightWindow.webContents.send('spotlight:show');
}

function hideSpotlight(): void {
  if (!spotlightWindow || !spotlightWindow.isVisible()) return;
  spotlightWindow.hide();
  spotlightWindow.webContents.send('spotlight:hide');
}

function toggleSpotlight(): void {
  if (!spotlightWindow) {
    spotlightWindow = createSpotlightWindow();
    spotlightWindow.once('ready-to-show', showSpotlight);
    return;
  }

  if (spotlightWindow.isVisible()) {
    hideSpotlight();
  } else {
    showSpotlight();
  }
}

// IPC: Hide window
ipcMain.on('spotlight:hide', () => hideSpotlight());

// IPC: Resize window
ipcMain.on('spotlight:resize', (_event, contentHeight: number) => {
  if (!spotlightWindow) {
    console.log('No window to resize');
    return;
  }
  
  // Clamp height between min and max
  const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.ceil(contentHeight)));
  
  console.log('Resize requested:', contentHeight, '-> clamped:', newHeight);
  
  // Get current size
  const [, currentHeight] = spotlightWindow.getSize();
  
  // Only resize if height actually changed
  if (currentHeight !== newHeight) {
    console.log('Applying resize from', currentHeight, 'to', newHeight);
    spotlightWindow.setSize(WINDOW_WIDTH, newHeight, false);
  }
});

// IPC: Open external link
ipcMain.on('shell:open', (_event, url: string) => {
  shell.openExternal(url);
});

// App ready
app.whenReady().then(() => {
  const shortcut = process.platform === 'darwin' ? 'Command+`' : 'Alt+Space';
  
  if (globalShortcut.register(shortcut, toggleSpotlight)) {
    console.log('Shortcut registered:', shortcut);
  } else {
    console.error('Failed to register shortcut');
  }

  // Pre-create window for faster first show
  spotlightWindow = createSpotlightWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
