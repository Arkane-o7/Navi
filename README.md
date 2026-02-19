# Navi

Spotlight-style AI desktop assistant built with **Electron + React** and backed by a **Next.js API**.

Navi runs as a tray app, opens instantly with a global shortcut, streams responses from Gemini, supports optional web search context, and syncs chats when authenticated.

---

## What’s in this repo

Navi is a pnpm workspace + Turborepo monorepo:

- `apps/electron` — Desktop app (main/preload/renderer)
- `apps/api` — Next.js API (chat, auth, messages, subscriptions, health)
- `apps/website` — Next.js web client with shared auth/chat/preferences sync
- `packages/shared` — shared package namespace (currently minimal)

---

## Tech stack

- **Desktop:** Electron, React 18, Zustand, Vite, Electron Forge
- **API:** Next.js 16 (App Router), TypeScript, Zod
- **LLM:** Gemini (primary), Groq (rate-limit fallback only)
- **Data:** Neon Postgres, Upstash Redis
- **Auth:** WorkOS AuthKit + deep-link callback (`navi://`)
- **Optional billing:** Stripe
- **Deploy:** Vercel (API), GitHub Releases (Electron artifacts + auto update)

---

## Prerequisites

- Node.js **>= 20**
- pnpm **9.x**

---

## Quick start

1. Install dependencies from repo root:
   - `pnpm install`
2. Start everything:
   - `pnpm dev`

Or run apps separately:
- `pnpm dev:api` (API on `http://localhost:3001`)
- `pnpm dev:electron`
- `pnpm dev:website` (Web app on `http://localhost:3000`)

---

## Scripts

### Root (`package.json`)

- `pnpm dev` — run workspace dev tasks via Turbo
- `pnpm build` — run workspace builds
- `pnpm lint` — run workspace lint tasks
- `pnpm dev:api` — run `@navi/api`
- `pnpm dev:electron` — run `@navi/electron`
- `pnpm build:api` — build `@navi/api`
- `pnpm build:electron` — build `@navi/electron`
- `pnpm test:vercel-edge` — run edge-compat script

### API (`apps/api/package.json`)

- `pnpm dev` — `next dev --port 3001`
- `pnpm build` — `next build`
- `pnpm start` — `next start`
- `pnpm lint` — currently runs `next build`

### Electron (`apps/electron/package.json`)

- `pnpm dev` — `electron-forge start`
- `pnpm build` / `pnpm make` — build distributables
- `pnpm package` — package app
- `pnpm publish` — publish via Forge GitHub publisher
- `pnpm lint` — `tsc --noEmit`

---

## Environment variables

### API (`apps/api`)

### Required for core flows

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `GROQ_API_KEY` (fallback only)
- `UPSTASH_REDIS_REST_URL` (or `UPSTASH_REDIS_URL`)
- `UPSTASH_REDIS_REST_TOKEN` (or `UPSTASH_REDIS_TOKEN`)
- `WORKOS_API_KEY`
- `WORKOS_CLIENT_ID`

### Optional / feature-scoped

- `TAVILY_API_KEY` (web search augmentation)
- `STRIPE_SECRET_KEY` (checkout/webhook)
- `STRIPE_PRO_PRICE_ID` (checkout)
- `STRIPE_WEBHOOK_SECRET` (webhook validation)
- `NEXT_PUBLIC_APP_URL` (auth + Stripe redirect base URL)
- `NODE_ENV`

### Electron (`apps/electron`)

- `NAVI_API_URL` (used by main process for opening auth/login URL; falls back to production API)
- `NODE_ENV`

> Note: renderer API base URL is currently hardcoded in `apps/electron/src/renderer/config.ts` to `https://navi-search.vercel.app`.

---

## API routes (current)

- `GET /api/health`
- `POST /api/chat`
- `GET /api/user`
- `GET /api/conversations`
- `POST /api/conversations`
- `DELETE /api/conversations?id=...`
- `GET /api/messages?conversationId=...`
- `POST /api/messages`
- `GET /api/auth/login`
- `GET /api/auth/callback`
- `POST /api/auth/refresh`
- `GET /api/debug`
- `POST /api/debug`
- `GET /api/debug/message-count`
- `POST /api/debug/message-count`
- `GET /api/subscription/checkout`
- `POST /api/subscription/checkout`
- `GET /api/subscription/success`
- `GET /api/subscription/canceled`
- `POST /api/subscription/webhook`

---

## Desktop behavior and shortcuts

Global shortcuts:
- Toggle Navi: `Cmd + \`` (macOS) / `Alt + \`` (Windows/Linux)
- Open settings: `Cmd + .` / `Alt + .`

In-app shortcuts:
- New chat: `Cmd/Alt + N`
- Close overlay: `Esc` (when undocked)

Navi supports:
- Tray-first app behavior
- Overlay mode + docked mode
- Cross-window settings sync via IPC
- Deep-link auth callbacks through `navi://`

---

## Chat flow summary

1. Renderer sends `message + history` to `/api/chat`.
2. API validates input and identifies user (token if present, anonymous fallback otherwise).
3. API checks subscription + free-tier daily limit in Redis (`20/day` for free).
4. If message looks search-sensitive, API may fetch Tavily context.
5. API streams Gemini output back as SSE chunks.
6. If Gemini returns a rate-limit/quota error, API falls back to Groq for that request.

---

## Data model (initialized by API)

Tables created in `apps/api/src/lib/db.ts`:
- `users`
- `conversations`
- `messages`
- `subscriptions`

Redis usage includes daily counters and rate-limit keys.

---

## Build and release

### Electron

Build installers/packages from `apps/electron` using Electron Forge makers:
- Squirrel (Windows)
- DMG + ZIP (macOS)
- ZIP (Linux)

For public macOS releases, configure Apple signing/notarization secrets in GitHub Actions.
Without notarization, users may see Gatekeeper warnings (for example, "app is damaged").

Release workflow (`.github/workflows/release.yml`) builds per OS on `v*` tags and publishes artifacts.

### API

`apps/api/vercel.json` is configured for Vercel deployment.

---

## Security notes

- `contextIsolation: true`
- `nodeIntegration: false`
- Renderer ↔ main communication goes through preload IPC bridge

---

## Current caveats to know

- Some legacy docs may mention routes/files no longer in code (e.g., `subscription/portal`, `middleware.ts`). Prefer source under `apps/**` for truth.

---

## Repo docs

- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT.md`
- `docs/API.md`
- `docs/DEPLOYMENT.md`

(These are helpful context, but code is the source of truth.)

---

## License

MIT — see `LICENSE`.
