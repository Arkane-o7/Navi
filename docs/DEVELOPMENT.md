# Navi Development Guide

This guide covers local setup and daily development workflows for Navi.

## Prerequisites

- Node.js `>= 20`
- pnpm `9.x`

## Repository setup

From repo root:

1. Install dependencies: `pnpm install`
2. Start all dev tasks: `pnpm dev`

Useful targeted commands:

- `pnpm dev:api`
- `pnpm dev:electron`
- `pnpm build`
- `pnpm lint`

---

## Monorepo layout

- `apps/api` — Next.js API service
- `apps/electron` — desktop app
- `packages/shared` — shared package namespace

Workspace and task orchestration:

- `pnpm-workspace.yaml`
- `turbo.json`

---

## Environment configuration

### API (`apps/api/.env`)

Start from `.env.example` and set at least:

- `DATABASE_URL`
- `UPSTASH_REDIS_REST_URL` (or `UPSTASH_REDIS_URL`)
- `UPSTASH_REDIS_REST_TOKEN` (or `UPSTASH_REDIS_TOKEN`)
- `GROQ_API_KEY`
- `WORKOS_API_KEY`
- `WORKOS_CLIENT_ID`

Optional:

- `TAVILY_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`

### Electron (`apps/electron/.env`)

Used variables in code:

- `NAVI_API_URL` (main process auth login URL base)
- `NODE_ENV`

> Note: `VITE_API_URL` exists in `.env.example` but renderer currently uses hardcoded `API_CONFIG.baseUrl` in `src/renderer/config.ts`.

---

## Running and debugging

### API dev

- Dev server script: `next dev --port 3001`
- Health check endpoint: `GET /api/health`

Helpful debug routes:
- `GET /api/debug`
- `POST /api/debug`
- `GET /api/debug/message-count`
- `POST /api/debug/message-count`

### Electron dev

- Launch with `electron-forge start`
- Main process behavior is in `src/main/index.ts`
- IPC bridge is in `src/preload/index.ts`
- UI entry points:
  - `src/renderer/index.tsx` (main flow)
  - `src/renderer/settings/index.tsx` (settings)

---

## State management

Zustand stores:

- `authStore.ts` (`navi-auth`)
- `chatStore.ts` (`navi-chat-storage`)
- `settingsStore.ts` (`navi-settings`)

Key behavior:

- local-first chat persistence
- background cloud sync when authenticated
- periodic token refresh and user sync

---

## Keyboard shortcuts

Global (registered in main process):

- Toggle overlay: `Cmd+\`` (macOS) / `Alt+\``
- Settings: `Cmd+.` / `Alt+.`

Renderer-level:

- New chat: `Cmd/Alt + N`
- Close undocked overlay: `Esc`

---

## Common gotchas

- If API port `3001` is busy, kill the process and restart.
- If auth seems broken, verify WorkOS redirect/callback URLs and deep-link handling.
- If cloud sync appears stale, inspect auth token validity and `/api/user` response.
- Legacy docs may reference files/routes that no longer exist; prefer source code under `apps/**`.

---

## Contribution flow

1. Create a branch
2. Make changes
3. Run lint/build for touched apps
4. Open PR

See `CONTRIBUTING.md` for project contribution policy.
