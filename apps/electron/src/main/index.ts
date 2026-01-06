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
const WINDOW_WIDTH = 640;
const MIN_HEIGHT = 54;
const MAX_HEIGHT = 480;
const SHORTCUT = process.platform === 'darwin' ? 'Command+`' : 'Alt+Space';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let flowWindow: BrowserWindow | null = null;

// ─────────────────────────────────────────────────────────────
// Window Creation
// ─────────────────────────────────────────────────────────────
function createFlowWindow(): BrowserWindow {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: MIN_HEIGHT,
    x: Math.round((screenWidth - WINDOW_WIDTH) / 2),
    y: 120,
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
    // Open DevTools in dev mode
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Hide on blur
  win.on('blur', hideFlow);

  return win;
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

  flowWindow.setPosition(x, 120);
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
// Search / Launcher Handlers (Mage-inspired)
// ─────────────────────────────────────────────────────────────

// Simple search result interface
interface SearchResult {
  id: string;
  type: 'app' | 'action' | 'chat';
  title: string;
  subtitle?: string;
  icon?: string;
  action?: string;
}

// Search handler - returns results based on query
ipcMain.handle('search:query', async (_e, query: string): Promise<SearchResult[]> => {
  const results: SearchResult[] = [];
  
  if (!query || query.trim() === '') {
    return results;
  }

  const lowerQuery = query.toLowerCase();

  // Always show chat option for any query
  results.push({
    id: 'chat',
    type: 'chat',
    title: `Ask Navi: "${query}"`,
    subtitle: 'Chat with AI assistant',
    icon: '💬',
    action: 'open-chat',
  });

  // Add common app shortcuts (can be extended with actual app detection)
  const commonApps = [
    { name: 'Calculator', command: 'calc', icon: '🔢' },
    { name: 'Notepad', command: 'notepad', icon: '📝' },
    { name: 'Terminal', command: process.platform === 'win32' ? 'cmd' : 'terminal', icon: '💻' },
  ];

  commonApps.forEach(app => {
    if (app.name.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: `app-${app.command}`,
        type: 'app',
        title: app.name,
        subtitle: 'Launch application',
        icon: app.icon,
        action: `launch:${app.command}`,
      });
    }
  });

  return results.slice(0, 5); // Limit to 5 results
});

// Launch handler - executes actions
ipcMain.handle('search:execute', async (_e, action: string) => {
  try {
    if (action === 'open-chat') {
      // Signal renderer to switch to chat mode
      return { success: true, type: 'chat' };
    } else if (action.startsWith('launch:')) {
      const command = action.replace('launch:', '');
      const { exec } = require('child_process');
      exec(command, (error: Error | null) => {
        if (error) {
          console.error('Launch error:', error);
        }
      });
      return { success: true, type: 'launch' };
    }
    return { success: false, error: 'Unknown action' };
  } catch (error) {
    console.error('Execute error:', error);
    return { success: false, error: String(error) };
  }
});

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
