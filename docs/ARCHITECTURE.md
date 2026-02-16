# Navi Architecture

This is the current architecture of Navi based on the implementation under `apps/api` and `apps/electron`.

## High-level layout

Navi uses a monorepo with Turborepo + pnpm workspaces:

- `apps/electron` — desktop app
- `apps/api` — backend/API service
- `packages/shared` — shared package namespace

## Runtime components

### Electron desktop app

Process model:

- **Main process** (`apps/electron/src/main/index.ts`)
  - tray app lifecycle
  - global shortcuts
  - flow window + settings window
  - dock/undock orchestration
  - deep-link handling (`navi://`)
  - auto-update bootstrap (`update-electron-app`)
- **Preload bridge** (`apps/electron/src/preload/index.ts`)
  - typed IPC surface exposed as `window.navi`
- **Renderer(s)** (`apps/electron/src/renderer/**`)
  - React UI for chat and settings
  - Zustand state stores
  - markdown rendering for assistant responses

### API service (Next.js)

- Next.js App Router API routes under `apps/api/src/app/api/**`
- Runs locally on `http://localhost:3001`
- Deployed with Vercel config in `apps/api/vercel.json`

---

## Key data flows

### 1) Auth flow (WorkOS + deep links)

1. Renderer invokes `window.navi.login()`
2. Main process opens browser to `${NAVI_API_URL || https://navi-search.vercel.app}/api/auth/login`
3. API redirects to WorkOS AuthKit
4. Callback arrives at `/api/auth/callback`
5. API exchanges code for tokens, upserts user, redirects to `navi://auth/callback?...`
6. Main process receives deep link and broadcasts `auth:callback` IPC event
7. Renderer persists tokens (`navi-auth`) and calls `/api/user`

### 2) Chat flow

1. Renderer sends `POST /api/chat` with `{ message, history }`
2. API optionally derives user from bearer token
3. API checks subscription + daily limit (Redis)
4. API optionally augments prompt via Tavily search
5. API streams Groq tokens as SSE chunks
6. Renderer appends stream progressively and syncs usage/user state

### 3) Cloud sync flow

Renderer local state is source-of-truth first (`navi-chat-storage`).
When authenticated, it syncs:

- conversation shell via `POST /api/conversations`
- messages via `POST /api/messages`
- reads via `GET /api/conversations` + `GET /api/messages`

Merge strategy favors newer/unsynced local conversations.

---

## Persistence layers

### Postgres (Neon)

`initializeDatabase()` creates:

- `users`
- `conversations`
- `messages`
- `subscriptions`

Indexes:
- `idx_conversations_user_id`
- `idx_messages_conversation_id`
- `idx_subscriptions_stripe_customer`

### Redis (Upstash)

Used for:
- per-day free-tier usage counters: `daily_messages:<id>:<date>`
- generic rate-limit helper keys: `rate_limit:<identifier>`

### Renderer persisted stores

- `navi-auth` (`authStore`)
- `navi-chat-storage` (`chatStore`)
- `navi-settings` (`settingsStore`)

---

## Desktop UX architecture

### Windows

- **Flow window**: transparent overlay chat surface
- **Docked window**: solid pane mode
- **Settings window**: separate fixed-size window (`settings.html`)

### Global shortcuts

- Toggle flow: `Cmd+\`` (macOS) / `Alt+\`` (others)
- Open settings: `Cmd+.` / `Alt+.`

### Security posture

Electron webPreferences use:
- `contextIsolation: true`
- `nodeIntegration: false`

IPC is constrained to preload-defined methods.

---

## Build + release architecture

### API

- Next.js build via Turbo filter (`@navi/api`)
- Vercel deployment configured in `apps/api/vercel.json`

### Desktop

- Electron Forge makers: Squirrel, ZIP, DMG
- GitHub publisher configured in `forge.config.js`
- CI release workflow: `.github/workflows/release.yml`
  - triggered by `v*` tags
  - validates tag matches `apps/electron/package.json` version
  - builds per-OS and publishes

---

## Known implementation caveats

- Renderer API base URL is currently hardcoded in `apps/electron/src/renderer/config.ts` (`https://navi-search.vercel.app`).
- Root scripts include website targets (`dev:website`, `build:website`) but no `apps/website` directory exists.
- Subscription retrieval in `src/lib/db.ts` selects `period_end` while schema defines `current_period_end`.
