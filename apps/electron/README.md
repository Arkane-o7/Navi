# Navi Electron App

A Spotlight-style desktop application for AI chat, inspired by [Mage](https://github.com/Ellicode/mage) and built with Electron, React, and TypeScript.

## Overview

Navi is a lightweight, always-accessible AI assistant that appears with a keyboard shortcut. It features:

- **Global Shortcut**: Press `Alt+Space` (Windows/Linux) or `Cmd+\`` (macOS) to instantly open Navi
- **Overlay Interface**: Transparent, vibrancy-enabled window that appears on top of all applications
- **Streaming Chat**: Real-time AI responses with markdown support
- **Auto-resize**: Window dynamically resizes based on content
- **Connection Monitoring**: Visual indicator when backend API is offline
- **Keyboard-first**: Navigate and control everything with keyboard shortcuts

## Architecture

The Electron app is structured with three main processes:

### Main Process (`src/main/index.ts`)
- Window management and global shortcuts
- IPC handlers for inter-process communication
- System integration (tray, notifications, etc.)

### Preload Script (`src/preload/index.ts`)
- Secure bridge between main and renderer processes
- Exposes safe API via `window.navi`

### Renderer Process (`src/renderer/`)
- React-based UI with TypeScript
- Chat interface with markdown rendering
- State management with Zustand
- API integration with streaming support

## Backend Integration

Navi connects to the backend API server for AI chat functionality:

### Development Mode
```bash
# Start the backend API (in another terminal)
pnpm dev:api

# Start the Electron app
pnpm dev:electron
```

The app automatically connects to `http://localhost:3001` in development mode.

### Production Mode
In production builds, the app connects to the deployed API at `https://navi-chat-api.vercel.app`.

### API Configuration
Configure API endpoints in `src/renderer/config.ts`:

```typescript
export const API_CONFIG = {
  baseUrl: isDevelopment ? 'http://localhost:3001' : 'https://navi-chat-api.vercel.app',
  endpoints: {
    chat: '/api/chat',
    health: '/api/health',
    // ... more endpoints
  },
};
```

## Key Features from Mage Integration

Based on the [Mage](https://github.com/Ellicode/mage) electron app, we've integrated:

1. **Overlay Window Management**
   - Fullscreen transparent window
   - Always-on-top behavior
   - Auto-hide on blur (with optional pinning)

2. **Global Shortcut System**
   - Configurable keyboard shortcuts
   - Menu state tracking to prevent unwanted closes

3. **Enhanced IPC Communication**
   - Window control (show/hide/resize/pin)
   - Shell integration (open external links)
   - Theme detection

4. **Improved Error Handling**
   - Connection status monitoring
   - Graceful API error handling
   - User-friendly error messages

## Window API

The renderer process can control the window via `window.navi`:

```typescript
// Hide the window
window.navi.hide();

// Resize the window
window.navi.resize(height);

// Pin the window (prevent auto-hide)
window.navi.pin(true);

// Open external links
window.navi.openExternal('https://example.com');

// Get system theme
const isDark = await window.navi.getTheme();

// Listen for show/hide events
const unsubscribe = window.navi.onShow(() => {
  console.log('Window shown');
});
```

## Keyboard Shortcuts

### Global
- `Alt+Space` / `Cmd+\`` - Toggle Navi window

### In-App
- `Escape` - Close window
- `Cmd/Ctrl+K` - Clear conversation
- `Cmd/Ctrl+N` - New conversation

## Development

### Prerequisites
- Node.js >= 20
- pnpm 9.15.0

### Setup
```bash
# Install dependencies
pnpm install

# Start development mode
pnpm dev:electron

# Or use the root script
pnpm dev
```

### Building
```bash
# Build the Electron app
pnpm build:electron

# This creates distributables in apps/electron/.vite/build
```

### Project Structure
```
apps/electron/
├── src/
│   ├── main/          # Main process (Electron)
│   │   └── index.ts   # Window management, IPC handlers
│   ├── preload/       # Preload scripts
│   │   └── index.ts   # Context bridge API
│   └── renderer/      # Renderer process (React)
│       ├── App.tsx    # Main app component
│       ├── config.ts  # Configuration
│       ├── hooks/     # React hooks
│       ├── stores/    # State management
│       ├── components/# React components
│       └── styles/    # CSS styles
├── forge.config.js    # Electron Forge configuration
├── vite.*.config.ts   # Vite build configs
└── package.json
```

## Future Enhancements

Planned features inspired by Mage:

- [ ] **App Launcher Mode**: Search and launch applications
- [ ] **Plugin System**: Extensible actions and integrations
- [ ] **Quick Actions**: Common tasks accessible via keyboard
- [ ] **Multi-mode Interface**: Switch between chat and launcher
- [ ] **Background Processes**: Live activities and notifications
- [ ] **Custom Widgets**: Dynamic content cards

## Troubleshooting

### API Connection Issues
If you see "⚠️ API Offline" in the top-right corner:

1. Ensure the backend API is running:
   ```bash
   pnpm dev:api
   ```

2. Check the API URL in console logs
3. Verify environment variables are set correctly

### Window Not Appearing
1. Check if the global shortcut conflicts with other apps
2. Try manually showing the window from the tray icon (if available)
3. Check console logs for errors

### Build Errors
```bash
# Clean and rebuild
rm -rf node_modules .vite apps/electron/node_modules
pnpm install
pnpm build:electron
```

## Contributing

When adding features:

1. Follow the existing code structure
2. Maintain TypeScript type safety
3. Test with both development and production API
4. Update this README with new features
5. Run linting before committing:
   ```bash
   pnpm --filter @navi/electron lint
   ```

## License

[Add your license here]

## Acknowledgments

- Inspired by [Mage](https://github.com/Ellicode/mage) by Ellicode
- Built with [Electron Forge](https://www.electronforge.io/)
- UI inspired by macOS Spotlight and Raycast
