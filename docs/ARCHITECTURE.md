# Navi Architecture Documentation

This document provides a detailed overview of Navi's architecture, design decisions, and how the different components interact.

## Table of Contents

- [Overview](#overview)
- [Monorepo Structure](#monorepo-structure)
- [Electron App](#electron-app)
- [API Server](#api-server)
- [Data Flow](#data-flow)
- [Authentication Flow](#authentication-flow)
- [State Management](#state-management)
- [Deployment Architecture](#deployment-architecture)

---

## Overview

Navi is designed as a lightweight, always-available AI assistant that lives in your system tray. The architecture emphasizes:

- **Low latency**: Streaming responses for instant feedback
- **Cross-platform**: Single codebase for macOS, Windows, and Linux
- **Offline-first**: Works without authentication (with rate limits)
- **Privacy-conscious**: Minimal data collection, user control over data

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Desktop App                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Main Process│  │  Preload    │  │    Renderer Process      │  │
│  │  (Node.js)  │◄─┤  (Bridge)   │◄─┤   (React + Zustand)      │  │
│  │  - Tray     │  │             │  │   - Chat UI              │  │
│  │  - Shortcuts│  │  IPC        │  │   - Settings             │  │
│  │  - Updates  │  │  Handlers   │  │   - Auth State           │  │
│  └──────┬──────┘  └─────────────┘  └───────────┬─────────────┘  │
│         │                                       │                 │
└─────────┼───────────────────────────────────────┼─────────────────┘
          │                                       │
          │ Deep Links (navi://)                  │ HTTPS
          │                                       ▼
          │                          ┌─────────────────────────┐
          │                          │    API Server (Vercel)   │
          │                          │      Next.js 16          │
          │                          │   ┌─────────────────┐   │
          │                          │   │   /api/chat     │◄──┼─── Groq API
          │                          │   │   /api/auth     │◄──┼─── WorkOS
          │                          │   │   /api/user     │   │
          │                          │   │   /api/messages │   │
          │                          │   └────────┬────────┘   │
          │                          │            │            │
          │                          └────────────┼────────────┘
          │                                       │
          ▼                          ┌────────────┼────────────┐
     ┌─────────┐                     │            │            │
     │ WorkOS  │                     ▼            ▼            ▼
     │ AuthKit │              ┌──────────┐ ┌──────────┐ ┌───────────┐
     └─────────┘              │  Neon    │ │ Upstash  │ │  Tavily   │
                              │ Postgres │ │  Redis   │ │  Search   │
                              └──────────┘ └──────────┘ └───────────┘
```

---

## Monorepo Structure

Navi uses **Turborepo** for monorepo management with **pnpm workspaces**.

### Why Turborepo?

- **Incremental builds**: Only rebuilds what changed
- **Parallel execution**: Runs tasks across packages simultaneously
- **Remote caching**: Shares build artifacts across machines
- **Simplified scripts**: Single commands to operate on all packages

### Package Dependencies

```
@navi/electron ─────► @navi/shared
                         ▲
@navi/api ───────────────┘
```

### Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

---

## Electron App

### Process Architecture

Electron apps have two types of processes:

#### Main Process (`apps/electron/src/main/index.ts`)

The main process runs in Node.js and handles:

- **Window Management**: Creates and manages the overlay and settings windows
- **Global Shortcuts**: Registers `Cmd+\`` / `Alt+\`` for toggling the panel
- **System Tray**: Creates the menu bar/system tray icon
- **Deep Links**: Handles `navi://` protocol for OAuth callbacks
- **Auto-Updates**: Checks for and installs updates via `electron-updater`
- **IPC Communication**: Bridges between main and renderer processes

```typescript
// Key features in main process
- createFlowWindow()     // Transparent overlay window
- createSettingsWindow() // Normal settings window
- setupAutoUpdater()     // GitHub Releases integration
- handleDeepLink()       // OAuth callback handling
```

#### Renderer Process (`apps/electron/src/renderer/`)

The renderer runs in a Chromium context and handles the UI:

- **React Application**: Modern React 18 with hooks
- **State Management**: Zustand for lightweight state
- **Styling**: CSS with CSS variables for theming
- **Markdown Rendering**: `react-markdown` with syntax highlighting

### Window Types

1. **Flow Window** (Main Chat)
   - Full-screen transparent overlay
   - Click-through when not hovering on panel
   - Always on top, frameless
   - Draggable panel

2. **Settings Window**
   - Standard window with traffic lights (macOS)
   - Theme settings, authentication, account info

### IPC Communication

```typescript
// Preload API exposed to renderer
window.navi = {
  hide: () => void,
  mouseEnter: () => void,
  mouseLeave: () => void,
  openExternal: (url: string) => void,
  login: () => void,
  logout: () => void,
  onShow: (callback) => unsubscribe,
  onAuthCallback: (callback) => unsubscribe,
  onThemeChange: (callback) => unsubscribe,
}
```

---

## API Server

### Tech Stack

- **Next.js 16**: App Router with API routes
- **Serverless**: Designed for Vercel edge functions
- **Streaming**: SSE for real-time chat responses

### Route Structure

```
apps/api/src/app/api/
├── auth/
│   ├── login/route.ts      # Initiate OAuth flow
│   └── callback/route.ts   # Handle OAuth callback
├── chat/route.ts           # Main chat endpoint (streaming)
├── conversations/route.ts  # CRUD for conversations
├── messages/route.ts       # CRUD for messages
├── subscription/
│   ├── route.ts           # Get subscription status
│   ├── checkout/route.ts  # Create Stripe checkout
│   ├── portal/route.ts    # Stripe customer portal
│   └── webhook/route.ts   # Stripe webhooks
├── user/route.ts          # Get/update user info
├── health/route.ts        # Health check
└── debug/route.ts         # Debug endpoints (dev only)
```

### Library Modules

```
apps/api/src/lib/
├── auth.ts     # WorkOS client wrapper
├── db.ts       # Neon PostgreSQL client
├── groq.ts     # Groq API client (streaming)
├── redis.ts    # Upstash Redis client
└── tavily.ts   # Web search integration
```

### Chat Flow

```
User Message
     │
     ▼
┌────────────────┐
│ Check Auth     │ Optional (free tier allows anonymous)
│ (JWT decode)   │
└───────┬────────┘
        ▼
┌────────────────┐
│ Check Rate     │ Daily limit for free tier (20/day)
│ Limit (Redis)  │
└───────┬────────┘
        ▼
┌────────────────┐
│ Needs Search?  │ Pattern matching for news/facts
│ (Tavily)       │
└───────┬────────┘
        ▼
┌────────────────┐
│ Stream LLM     │ Groq API with SSE
│ Response       │
└───────┬────────┘
        ▼
  SSE Stream to Client
```

---

## Data Flow

### Message Streaming

```typescript
// Client initiates request
fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ message, history }),
  headers: { 'Content-Type': 'application/json' }
});

// Server streams SSE
for await (const chunk of streamChatCompletion(messages)) {
  controller.enqueue(`data: ${JSON.stringify({ content: chunk })}\n\n`);
}
controller.enqueue('data: [DONE]\n\n');
```

### Data Persistence

```
┌─────────────────┐     ┌─────────────────┐
│    Zustand      │     │  Local Storage  │
│    (Memory)     │────►│   (Persist)     │
└────────┬────────┘     └─────────────────┘
         │
         │ Sync (authenticated users)
         ▼
┌─────────────────┐
│  Neon Postgres  │
│  (Cloud Sync)   │
└─────────────────┘
```

---

## Authentication Flow

### WorkOS AuthKit Integration

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Electron  │     │   API       │     │   WorkOS    │
│   App       │     │   Server    │     │   AuthKit   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Click Login    │                   │
       ├──────────────────►│                   │
       │                   │                   │
       │   2. Redirect     │                   │
       │◄──────────────────┤                   │
       │                   │                   │
       │ 3. Open Browser   │                   │
       ├───────────────────┼──────────────────►│
       │                   │                   │
       │                   │ 4. User Signs In  │
       │                   │◄──────────────────┤
       │                   │                   │
       │ 5. Callback       │                   │
       │   (navi://auth/callback)              │
       │◄──────────────────┤                   │
       │                   │                   │
       │ 6. Store Tokens   │                   │
       ├──────────────────►│                   │
       │                   │                   │
```

### Deep Link Protocol

```
navi://auth/callback?access_token=...&refresh_token=...&user_id=...
navi://auth/error?error=...&description=...
```

### Token Management

- **Access Token**: Short-lived JWT for API requests
- **Refresh Token**: Long-lived token for obtaining new access tokens
- **Storage**: In-memory (Zustand) + persist middleware

---

## State Management

### Zustand Stores

```typescript
// apps/electron/src/renderer/stores/

// chatStore.ts - Conversation and message state
interface ChatStore {
  conversations: Map<string, Conversation>;
  activeConversationId: string | null;
  // ... methods
}

// authStore.ts - Authentication state
interface AuthStore {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  // ... methods
}

// settingsStore.ts - User preferences
interface SettingsStore {
  theme: 'system' | 'dark' | 'light';
  // ... methods
}
```

### Cross-Window Sync

Settings are synchronized between the main flow window and settings window via IPC:

```typescript
// Main process broadcasts theme changes
ipcMain.on('settings:setTheme', (_e, theme) => {
  flowWindow?.webContents.send('settings:themeChanged', theme);
  settingsWindow?.webContents.send('settings:themeChanged', theme);
});
```

---

## Deployment Architecture

### Production Setup

```
                    ┌─────────────────────────────────┐
                    │        GitHub Repository        │
                    └────────────┬────────────────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
           ▼                     ▼                     ▼
    ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
    │   Vercel    │       │   GitHub    │       │   GitHub    │
    │   (API)     │       │  Releases   │       │  Actions    │
    │             │       │  (Desktop)  │       │  (CI/CD)    │
    └─────────────┘       └─────────────┘       └─────────────┘
```

### CI/CD Pipeline

1. **Push tag** (`v*`) triggers GitHub Actions
2. **Build matrix**: macOS, Windows, Linux
3. **Electron Forge** creates installers
4. **Publish** to GitHub Releases as draft
5. **Auto-update** checks GitHub Releases

### Infrastructure Costs (Typical)

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | ✅ Hobby | ~$20/mo Pro |
| Neon | ✅ 0.5 GB | ~$19/mo |
| Upstash | ✅ 10K/day | ~$0.2/10K |
| Groq | ✅ 14K RPD | Pay-as-go |
| WorkOS | ✅ 1M MAU | Enterprise |
| Tavily | ✅ 1K/mo | ~$100/mo |

---

## Security Considerations

### Electron Security

- **Context Isolation**: Enabled by default
- **Node Integration**: Disabled in renderer
- **Preload Scripts**: Minimal API surface
- **Web Security**: Enabled in production

### API Security

- **CORS**: Configured for allowed origins
- **Rate Limiting**: Per-user and per-IP limits
- **JWT Validation**: Token verification on protected routes
- **Input Validation**: Zod schemas for request validation

### Data Privacy

- **Minimal Collection**: Only store what's necessary
- **User Control**: Users can delete their data
- **No Telemetry**: No analytics or tracking (by default)

---

## Future Architecture Considerations

### Planned Improvements

1. **Local LLM Support**: Ollama integration for offline mode
2. **Plugin System**: Extensible tool/function calling
3. **Voice Input**: Speech-to-text integration
4. **Screen Context**: Screenshot analysis for contextual help
5. **Team Features**: Shared prompts and knowledge bases

### Scalability

- **Edge Functions**: Migrate to edge runtime for lower latency
- **Connection Pooling**: Use connection pooler for database
- **CDN**: Cache static assets at the edge
- **Regional Deployment**: Multi-region for global users
