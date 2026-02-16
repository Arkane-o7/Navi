# Navi Deployment Guide

Navi deploys as two artifacts:

- API service (`apps/api`) on Vercel
- Desktop binaries (`apps/electron`) through GitHub Releases

## API deployment (Vercel)

Source of truth config: `apps/api/vercel.json`

Current config includes:

- `framework: nextjs`
- install command from repo root: `cd ../.. && pnpm install`
- build command via Turbo filter: `cd ../.. && npx turbo run build --filter=@navi/api`
- output directory: `.next`
- CORS headers for `/api/(.*)`

## Required production env vars (API)

- `DATABASE_URL`
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_URL`
- `UPSTASH_REDIS_REST_TOKEN` / `UPSTASH_REDIS_TOKEN`
- `GROQ_API_KEY`
- `WORKOS_API_KEY`
- `WORKOS_CLIENT_ID`

Optional (feature-dependent):

- `TAVILY_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`

## Post-deploy checks

- `GET /api/health`
- auth redirect flow (`/api/auth/login` -> callback)
- chat streaming (`/api/chat`)
- authenticated reads (`/api/user`, `/api/conversations`, `/api/messages`)

---

## Desktop release pipeline

Source of truth:

- Forge config: `apps/electron/forge.config.js`
- CI workflow: `.github/workflows/release.yml`

## Packaging

Makers configured:

- `@electron-forge/maker-squirrel` (Windows)
- `@electron-forge/maker-zip` (darwin + linux)
- `@electron-forge/maker-dmg` (macOS)

Packager highlights:

- `asar: true`
- app bundle id: `com.navi.app`
- deep-link protocol: `navi://`
- ad-hoc macOS signing (`osxSign.identity = '-'`)
- GitHub publisher: `Arkane-o7/Navi`

## Release trigger

`release.yml` runs on tag pushes matching `v*`.

Each OS job:

1. validates tag version equals `apps/electron/package.json` version
2. installs dependencies with pnpm
3. runs `pnpm run make` in `apps/electron`
4. runs `npx electron-forge publish`

---

## Operational notes

- Auto-updates in app are initialized via `update-electron-app` for macOS/Windows.
- API CORS is handled by both Next proxy (`src/proxy.ts`) and Vercel headers.
- For Stripe billing support, webhook endpoint must be reachable at `/api/subscription/webhook` with valid signing secret.

---

## Rollback strategy

### API

Use Vercel deployment history to promote a previous healthy deployment.

### Desktop

Users can install a prior GitHub Release artifact manually.
(There is no automatic downgrade path.)
