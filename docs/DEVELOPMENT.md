# Development Guide

This guide provides detailed instructions for setting up and developing Navi locally.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Workflow](#development-workflow)
- [Project Structure Deep Dive](#project-structure-deep-dive)
- [Environment Configuration](#environment-configuration)
- [Working with the Electron App](#working-with-the-electron-app)
- [Working with the API](#working-with-the-api)
- [Testing](#testing)
- [Debugging](#debugging)
- [Common Issues](#common-issues)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | ≥ 20.x | Runtime |
| pnpm | 9.x | Package manager |
| Git | Latest | Version control |

### Optional Software

| Software | Purpose |
|----------|---------|
| VS Code | Recommended IDE |
| Xcode CLI (macOS) | Signing/notarization |
| Visual Studio Build Tools (Windows) | Native modules |

### Installing pnpm

```bash
# Via npm
npm install -g pnpm@9

# Via corepack (Node.js 16+)
corepack enable
corepack prepare pnpm@9 --activate

# Verify installation
pnpm --version
```

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Arkane-o7/Navi.git
cd Navi
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs dependencies for all packages in the monorepo.

### 3. Configure Environment Variables

#### API Server

```bash
cd apps/api
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Minimum required for local development
DATABASE_URL="postgresql://..."
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
GROQ_API_KEY="gsk_..."
WORKOS_API_KEY="sk_..."
WORKOS_CLIENT_ID="client_..."

# Optional
TAVILY_API_KEY="tvly-..."

# Local development
NEXT_PUBLIC_APP_URL="http://localhost:3001"
PORT=3001
NODE_ENV=development
```

#### Electron App

```bash
cd apps/electron
cp .env.example .env
```

Edit `.env`:

```bash
VITE_API_URL=http://localhost:3001
```

### 4. Start Development Servers

```bash
# From the root directory
pnpm dev
```

This starts both the API server (port 3001) and Electron app concurrently.

---

## Development Workflow

### Starting Individual Apps

```bash
# Start only the API
pnpm dev:api

# Start only the Electron app
pnpm dev:electron
```

### Building

```bash
# Build all packages
pnpm build

# Build specific apps
pnpm build:api
pnpm build:electron
```

### Linting

```bash
pnpm lint
```

### Hot Reload

- **API**: Next.js hot reloads on file changes
- **Electron Renderer**: Vite HMR for instant updates
- **Electron Main**: Requires restart (Ctrl+R or relaunch)

---

## Project Structure Deep Dive

### Root Configuration Files

```
navi/
├── package.json          # Root package with workspace scripts
├── pnpm-workspace.yaml   # Workspace configuration
├── turbo.json            # Turborepo task configuration
├── .nvmrc                # Node version (20)
├── .npmrc                # npm/pnpm configuration
└── .gitignore            # Git ignore rules
```

### API Server Structure

```
apps/api/
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── auth/         # Authentication
│   │   │   │   ├── login/route.ts
│   │   │   │   └── callback/route.ts
│   │   │   ├── chat/route.ts # Main chat endpoint
│   │   │   ├── conversations/route.ts
│   │   │   ├── messages/route.ts
│   │   │   ├── subscription/
│   │   │   │   ├── route.ts
│   │   │   │   ├── checkout/route.ts
│   │   │   │   ├── portal/route.ts
│   │   │   │   └── webhook/route.ts
│   │   │   ├── user/route.ts
│   │   │   ├── health/route.ts
│   │   │   └── debug/route.ts
│   │   ├── globals.css       # Global styles
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   ├── lib/                  # Shared utilities
│   │   ├── auth.ts           # WorkOS client
│   │   ├── db.ts             # Neon PostgreSQL
│   │   ├── groq.ts           # Groq API
│   │   ├── redis.ts          # Upstash Redis
│   │   └── tavily.ts         # Web search
│   ├── middleware.ts         # Next.js middleware
│   └── types/                # TypeScript types
├── next.config.mjs           # Next.js config
├── tsconfig.json             # TypeScript config
├── vercel.json               # Vercel deployment
└── package.json              # Package config
```

### Electron App Structure

```
apps/electron/
├── src/
│   ├── main/                 # Main process
│   │   └── index.ts          # Entry point
│   ├── preload/              # Preload scripts
│   │   └── index.ts          # IPC bridge
│   └── renderer/             # React UI
│       ├── App.tsx           # Main chat UI
│       ├── index.tsx         # React entry
│       ├── components/       # Shared components
│       │   └── Markdown.tsx  # Markdown renderer
│       ├── hooks/            # React hooks
│       │   └── useChat.ts    # Chat API hook
│       ├── stores/           # Zustand stores
│       │   ├── chatStore.ts  # Chat state
│       │   ├── authStore.ts  # Auth state
│       │   └── settingsStore.ts
│       ├── settings/         # Settings window
│       │   ├── Settings.tsx  # Settings UI
│       │   ├── index.tsx     # Entry point
│       │   └── styles/       # Settings CSS
│       ├── styles/           # Main window CSS
│       └── config.ts         # API configuration
├── assets/                   # App icons
│   ├── icon.png              # App icon (1024x1024)
│   ├── icon.icns             # macOS icon
│   ├── icon.ico              # Windows icon
│   ├── logo-dark.png         # Dark theme logo
│   ├── logo-light.png        # Light theme logo
│   └── trayIcon*.png         # System tray icons
├── index.html                # Main window HTML
├── settings.html             # Settings window HTML
├── forge.config.js           # Electron Forge config
├── vite.main.config.ts       # Main process Vite config
├── vite.preload.config.ts    # Preload Vite config
├── vite.renderer.config.ts   # Renderer Vite config
├── vite.settings.config.ts   # Settings Vite config
└── package.json              # Package config
```

---

## Environment Configuration

### Getting API Keys

#### Groq (Required)

1. Sign up at [console.groq.com](https://console.groq.com/)
2. Create an API key
3. Free tier: 14,000 requests/day

#### Neon PostgreSQL (Required)

1. Sign up at [neon.tech](https://neon.tech/)
2. Create a new project
3. Copy the connection string
4. Free tier: 0.5 GB storage

#### Upstash Redis (Required)

1. Sign up at [upstash.com](https://upstash.com/)
2. Create a Redis database
3. Copy REST URL and token
4. Free tier: 10,000 requests/day

#### WorkOS (Required for Auth)

1. Sign up at [workos.com](https://workos.com/)
2. Create an organization
3. Enable AuthKit
4. Configure redirect URIs:
   - Development: `http://localhost:3001/api/auth/callback`
   - Production: `https://your-app.vercel.app/api/auth/callback`
5. Get API key and Client ID

#### Tavily (Optional - Web Search)

1. Sign up at [tavily.com](https://tavily.com/)
2. Get an API key
3. Free tier: 1,000 searches/month

---

## Working with the Electron App

### Understanding the Main Process

The main process (`src/main/index.ts`) handles:

```typescript
// Window creation
createFlowWindow()    // Transparent overlay
createSettingsWindow() // Settings window

// Global shortcuts
globalShortcut.register('Command+`', toggleFlow)
globalShortcut.register('Command+.', toggleSettings)

// System tray
new Tray(getTrayIconPath())

// Auto-updates
autoUpdater.checkForUpdates()

// Deep links
app.on('open-url', handleDeepLink)
```

### Adding New IPC Handlers

1. **Main Process** (`src/main/index.ts`):

```typescript
ipcMain.handle('my:action', async (_event, arg) => {
  // Handle the action
  return result;
});
```

2. **Preload Script** (`src/preload/index.ts`):

```typescript
contextBridge.exposeInMainWorld('navi', {
  myAction: (arg: string) => ipcRenderer.invoke('my:action', arg),
});
```

3. **Type Definition** (`src/renderer/vite-env.d.ts`):

```typescript
interface NaviAPI {
  myAction: (arg: string) => Promise<Result>;
}
```

4. **Renderer Usage**:

```typescript
const result = await window.navi.myAction('hello');
```

### Adding New Windows

1. Create the HTML entry point
2. Create a Vite config for the window
3. Add to `forge.config.js` renderer array
4. Create the `createWindow` function in main

### Styling Guidelines

- Use CSS variables for theming
- Support both `data-theme="dark"` and `data-theme="light"`
- Test on all platforms (font rendering differs)

---

## Working with the API

### Adding New Routes

Create a new route handler:

```typescript
// apps/api/src/app/api/my-route/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ data: 'hello' });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Process request
  return NextResponse.json({ success: true });
}
```

### Database Migrations

Currently, schema changes are handled via `initializeDatabase()` in `lib/db.ts`:

```typescript
export async function initializeDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS my_table (
      id TEXT PRIMARY KEY,
      ...
    )
  `;
}
```

### Adding New Library Modules

```typescript
// apps/api/src/lib/my-service.ts
let _client: MyClient | null = null;

function getClient(): MyClient {
  if (!_client) {
    if (!process.env.MY_API_KEY) {
      throw new Error('MY_API_KEY is not set');
    }
    _client = new MyClient(process.env.MY_API_KEY);
  }
  return _client;
}

export const myService = new Proxy({} as MyClient, {
  get: (_target, prop) => {
    const instance = getClient();
    const value = instance[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
```

---

## Testing

### Manual Testing

```bash
# Run API tests
cd apps/api
pnpm test

# Run Electron in dev mode for testing
pnpm dev:electron
```

### API Testing with cURL

```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test chat (streaming)
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

### Desktop App Testing

1. **Main Window**: Press `Cmd+\`` to toggle
2. **Settings**: Press `Cmd+.` or click tray icon
3. **Auth Flow**: Click "Sign In" in settings
4. **Theme**: Toggle dark/light mode

---

## Debugging

### Electron Developer Tools

```typescript
// Main process (already in dev mode)
win.webContents.openDevTools({ mode: 'detach' });
```

### Debug Logging

```typescript
// Use console for main process
console.log('[Main] Something happened');

// Check Electron logs
// macOS: ~/Library/Logs/Navi/
// Windows: %APPDATA%/Navi/logs/
```

### API Debugging

```bash
# Enable verbose logging
NODE_ENV=development pnpm dev:api
```

### VS Code Debug Configurations

```json
// .vscode/launch.json
{
  "configurations": [
    {
      "name": "Debug Electron Main",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/apps/electron",
      "runtimeExecutable": "${workspaceFolder}/apps/electron/node_modules/.bin/electron-forge",
      "args": ["start"],
      "env": { "NODE_ENV": "development" }
    },
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/apps/api",
      "runtimeExecutable": "pnpm",
      "args": ["dev"]
    }
  ]
}
```

---

## Common Issues

### "Cannot find module" Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

### Electron Build Failures on macOS

```bash
# Install Xcode CLI tools
xcode-select --install

# Clear Electron cache
rm -rf ~/Library/Caches/electron
```

### Port Already in Use

```bash
# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Hot Reload Not Working

1. Check for saving issues (auto-save)
2. Restart the dev server
3. Clear Vite cache: `rm -rf apps/electron/.vite`

### WorkOS Auth Not Redirecting

1. Verify redirect URI in WorkOS dashboard
2. Check `WORKOS_CLIENT_ID` is correct
3. Ensure app protocol is registered (`navi://`)

### Database Connection Issues

```bash
# Test connection string
psql "your_connection_string"

# Verify SSL mode
?sslmode=require  # Should be in URL
```

---

## Next Steps

- Read the [Architecture Documentation](./ARCHITECTURE.md)
- Check the [API Reference](./API.md)
- Review the [Deployment Guide](./DEPLOYMENT.md)
