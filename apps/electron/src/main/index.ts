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
import { exec } from 'child_process';

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
    { name: 'Calculator', command: process.platform === 'win32' ? 'calc' : 'calculator', icon: '🔢', keywords: ['calc', 'calculator', 'math'] },
    { name: 'Notepad', command: process.platform === 'win32' ? 'notepad' : 'TextEdit', icon: '📝', keywords: ['notepad', 'text', 'editor', 'note'] },
    { name: 'Terminal', command: process.platform === 'win32' ? 'cmd' : 'terminal', icon: '💻', keywords: ['terminal', 'cmd', 'command', 'shell', 'bash'] },
    { name: 'File Manager', command: process.platform === 'win32' ? 'explorer' : 'finder', icon: '📁', keywords: ['files', 'explorer', 'finder', 'folder'] },
    { name: 'Settings', command: process.platform === 'win32' ? 'ms-settings:' : 'System Preferences', icon: '⚙️', keywords: ['settings', 'preferences', 'config'] },
  ];

  // Check for app matches
  commonApps.forEach(app => {
    const nameMatch = app.name.toLowerCase().includes(lowerQuery);
    const keywordMatch = app.keywords.some(keyword => keyword.includes(lowerQuery));
    
    if (nameMatch || keywordMatch) {
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

  // Add quick actions
  const quickActions = [
    { 
      keywords: ['time', 'clock', 'date'], 
      title: 'Current Time',
      subtitle: new Date().toLocaleString(),
      icon: '🕐',
      action: 'show-time'
    },
    {
      keywords: ['calc', 'calculate', 'math'],
      title: 'Quick Calculator',
      subtitle: 'Try: 2+2, 10*5, etc.',
      icon: '🧮',
      action: 'calculator'
    },
  ];

  quickActions.forEach(action => {
    if (action.keywords.some(keyword => lowerQuery.includes(keyword))) {
      results.push({
        id: `action-${action.action}`,
        type: 'action',
        title: action.title,
        subtitle: action.subtitle,
        icon: action.icon,
        action: action.action,
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
    } else if (action === 'show-time') {
      // Quick action: show current time
      return { success: true, type: 'info', message: new Date().toLocaleString() };
    } else if (action === 'calculator') {
      // Open calculator app
      const calcCommand = process.platform === 'win32' ? 'calc' : 'calculator';
      exec(calcCommand, (error: Error | null) => {
        if (error) {
          console.error('Failed to launch calculator:', error);
        }
      });
      return { success: true, type: 'launch' };
    } else if (action.startsWith('launch:')) {
      // Whitelist of allowed commands for security
      const allowedCommands: Record<string, string> = {
        'calc': process.platform === 'win32' ? 'calc' : 'calculator',
        'calculator': process.platform === 'win32' ? 'calc' : 'calculator',
        'notepad': process.platform === 'win32' ? 'notepad' : 'TextEdit',
        'TextEdit': process.platform === 'darwin' ? 'open -a TextEdit' : 'notepad',
        'cmd': process.platform === 'win32' ? 'cmd' : 'terminal',
        'terminal': process.platform === 'darwin' ? 'open -a Terminal' : 'gnome-terminal',
        'explorer': process.platform === 'win32' ? 'explorer' : 'open .',
        'finder': process.platform === 'darwin' ? 'open .' : 'explorer',
        'ms-settings:': process.platform === 'win32' ? 'start ms-settings:' : 'open "x-apple.systempreferences:"',
        'System Preferences': process.platform === 'darwin' ? 'open "x-apple.systempreferences:"' : 'start ms-settings:',
      };

      const requestedCommand = action.replace('launch:', '');
      const safeCommand = allowedCommands[requestedCommand];

      if (!safeCommand) {
        console.warn(`Attempted to launch non-whitelisted command: ${requestedCommand}`);
        return { success: false, error: 'Command not allowed' };
      }

      exec(safeCommand, (error: Error | null) => {
        if (error) {
          console.error(`Failed to launch ${requestedCommand}:`, error);
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
