# Deployment Guide

This guide covers deploying Navi to production, including the API server on Vercel and releasing desktop builds.

## Table of Contents

- [Overview](#overview)
- [API Deployment (Vercel)](#api-deployment-vercel)
- [Desktop App Releases](#desktop-app-releases)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Overview

Navi has two deployment targets:

| Component | Platform | Method |
|-----------|----------|--------|
| API Server | Vercel | Git push to main |
| Desktop App | GitHub Releases | Git tag push |

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Repository                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  Vercel  │    │  GitHub  │    │  GitHub  │
    │  Deploy  │    │ Actions  │    │ Releases │
    │  (API)   │    │  (CI/CD) │    │ (Desktop)│
    └────┬─────┘    └────┬─────┘    └────┬─────┘
         │               │               │
         │               ▼               │
         │         ┌──────────┐          │
         │         │  Build   │          │
         │         │  Matrix  │──────────┤
         │         │ (3 OS)   │          │
         │         └──────────┘          │
         │                               │
         ▼                               ▼
    ┌──────────┐                   ┌──────────┐
    │   API    │                   │ Desktop  │
    │ Endpoint │                   │ Binaries │
    └──────────┘                   └──────────┘
```

---

## API Deployment (Vercel)

### Initial Setup

1. **Install Vercel CLI**

   ```bash
   npm install -g vercel
   ```

2. **Link Project**

   ```bash
   cd apps/api
   vercel link
   ```

3. **Configure Environment Variables**

   In the Vercel dashboard or via CLI:

   ```bash
   vercel env add DATABASE_URL production
   vercel env add UPSTASH_REDIS_REST_URL production
   vercel env add UPSTASH_REDIS_REST_TOKEN production
   vercel env add GROQ_API_KEY production
   vercel env add WORKOS_API_KEY production
   vercel env add WORKOS_CLIENT_ID production
   vercel env add TAVILY_API_KEY production
   vercel env add NEXT_PUBLIC_APP_URL production
   ```

4. **Deploy**

   ```bash
   # Deploy to preview
   vercel

   # Deploy to production
   vercel --prod
   ```

### Automatic Deployments

Connect your GitHub repository to Vercel for automatic deployments:

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Set the root directory to `apps/api`
4. Configure build settings:
   - **Build Command**: Leave default (auto-detected)
   - **Output Directory**: Leave default
   - **Install Command**: `pnpm install`
5. Add environment variables
6. Deploy

### Vercel Configuration

The `apps/api/vercel.json` configures the deployment:

```json
{
  "version": 2,
  "buildCommand": "cd ../.. && pnpm build:api",
  "installCommand": "cd ../.. && pnpm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### Custom Domain

1. Go to your Vercel project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS records as instructed
5. Update `NEXT_PUBLIC_APP_URL` environment variable

---

## Desktop App Releases

### Automated Releases via GitHub Actions

The `.github/workflows/release.yml` automates building for all platforms.

#### Triggering a Release

1. **Update version** in `apps/electron/package.json`:

   ```json
   {
     "version": "0.1.9"
   }
   ```

2. **Commit the change**:

   ```bash
   git add apps/electron/package.json
   git commit -m "Bump version to 0.1.9"
   ```

3. **Create and push a tag**:

   ```bash
   git tag v0.1.9
   git push origin main
   git push origin v0.1.9
   ```

4. **Monitor the build** at `github.com/your-repo/actions`

5. **Review and publish** the draft release at `github.com/your-repo/releases`

### GitHub Actions Workflow

```yaml
# .github/workflows/release.yml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - run: pnpm install
      - run: cd apps/electron && pnpm run make
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - run: cd apps/electron && npx electron-forge publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  build-windows:
    runs-on: windows-latest
    # ... similar steps

  build-linux:
    runs-on: ubuntu-latest
    # ... similar steps
```

### Build Artifacts

| Platform | Artifact | Location |
|----------|----------|----------|
| macOS | `Navi-x.x.x-arm64.dmg` | GitHub Releases |
| macOS | `Navi-darwin-arm64-x.x.x.zip` | GitHub Releases |
| Windows | `Navi-x.x.x Setup.exe` | GitHub Releases |
| Linux | `Navi-linux-x64-x.x.x.zip` | GitHub Releases |

### Manual Builds

For local testing or custom builds:

```bash
cd apps/electron

# Build for current platform
pnpm run make

# Package without installer
pnpm run package
```

Built artifacts are in `apps/electron/out/`.

### Code Signing

#### macOS (Ad-hoc)

Currently using ad-hoc signing (free, no Apple Developer account):

```javascript
// forge.config.js
osxSign: {
  identity: '-',  // Ad-hoc signing
}
```

Users need to right-click → Open to bypass Gatekeeper.

#### macOS (Apple Developer)

For proper code signing and notarization:

1. Get an Apple Developer account ($99/year)
2. Create certificates and provisioning profiles
3. Update `forge.config.js`:

   ```javascript
   osxSign: {
     identity: 'Developer ID Application: Your Name (TEAM_ID)',
     hardenedRuntime: true,
     entitlements: 'entitlements.plist',
     'entitlements-inherit': 'entitlements.plist',
   },
   osxNotarize: {
     appleId: process.env.APPLE_ID,
     appleIdPassword: process.env.APPLE_PASSWORD,
     teamId: process.env.APPLE_TEAM_ID,
   }
   ```

#### Windows

Windows builds are signed using Authenticode:

```javascript
// forge.config.js
makers: [
  {
    name: '@electron-forge/maker-squirrel',
    config: {
      certificateFile: './cert.pfx',
      certificatePassword: process.env.CERT_PASSWORD,
    },
  },
]
```

---

## Environment Variables

### Production Checklist

#### Vercel (API)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `UPSTASH_REDIS_REST_URL` | ✅ | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Upstash Redis REST token |
| `GROQ_API_KEY` | ✅ | Groq API key |
| `WORKOS_API_KEY` | ✅ | WorkOS API key |
| `WORKOS_CLIENT_ID` | ✅ | WorkOS Client ID |
| `TAVILY_API_KEY` | ⚪ | Tavily search API key |
| `STRIPE_SECRET_KEY` | ⚪ | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | ⚪ | Stripe webhook secret |
| `STRIPE_PRO_PRICE_ID` | ⚪ | Stripe Pro plan price ID |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public URL of the API |
| `NODE_ENV` | ✅ | Set to `production` |

#### GitHub Secrets (Desktop Builds)

| Secret | Required | Description |
|--------|----------|-------------|
| `GITHUB_TOKEN` | ✅ | Auto-provided by GitHub Actions |
| `APPLE_ID` | ⚪ | For macOS notarization |
| `APPLE_PASSWORD` | ⚪ | App-specific password |
| `APPLE_TEAM_ID` | ⚪ | Apple Developer Team ID |
| `CERT_PASSWORD` | ⚪ | Windows code signing |

---

## Database Setup

### Neon PostgreSQL

1. **Create Project**
   - Go to [console.neon.tech](https://console.neon.tech/)
   - Create a new project
   - Choose a region close to your users

2. **Get Connection String**
   - Copy the connection string from the dashboard
   - It should look like: `postgresql://user:pass@host.neon.tech/neondb?sslmode=require`

3. **Initialize Schema**
   
   The schema is auto-initialized on first request via `initializeDatabase()`:

   ```sql
   -- Tables created automatically:
   -- users, conversations, messages, subscriptions
   ```

4. **Connection Pooling**
   
   Neon provides built-in connection pooling. The driver is configured:

   ```typescript
   neonConfig.fetchConnectionCache = true;
   ```

### Upstash Redis

1. **Create Database**
   - Go to [console.upstash.com](https://console.upstash.com/)
   - Create a new Redis database
   - Choose a region close to your Vercel deployment

2. **Get Credentials**
   - Copy REST URL and token
   - Both `UPSTASH_REDIS_REST_*` and `UPSTASH_REDIS_*` prefixes are supported

3. **Usage**
   - Rate limiting: 10K requests/day (free tier)
   - Message counting: Daily limits for free users
   - Caching: Session and temporary data

---

## Monitoring

### Vercel Analytics

1. Enable Analytics in Vercel dashboard
2. View request metrics, errors, and performance

### Error Tracking

Consider adding error tracking:

```typescript
// Example with Sentry
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

### Health Checks

Monitor the health endpoint:

```bash
curl https://your-app.vercel.app/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Logging

- **Vercel**: Logs available in dashboard → Deployments → Logs
- **Electron**: Logs stored locally:
  - macOS: `~/Library/Logs/Navi/`
  - Windows: `%APPDATA%/Navi/logs/`
  - Linux: `~/.config/Navi/logs/`

---

## Troubleshooting

### Vercel Deployment Issues

#### Build Failing

1. Check build logs in Vercel dashboard
2. Verify all environment variables are set
3. Test build locally: `pnpm build:api`

#### 500 Errors in Production

1. Check function logs in Vercel
2. Verify database connection string
3. Test individual endpoints

#### Timeout Errors

Increase function timeout in `vercel.json`:

```json
{
  "functions": {
    "src/app/api/chat/route.ts": {
      "maxDuration": 60
    }
  }
}
```

### Desktop Build Issues

#### macOS Build Failures

```bash
# Clear Electron cache
rm -rf ~/Library/Caches/electron
rm -rf ~/Library/Caches/electron-builder

# Reinstall native dependencies
cd apps/electron
rm -rf node_modules
pnpm install
```

#### Windows Build Failures

- Ensure Visual Studio Build Tools are installed
- Try running as Administrator
- Check Windows Defender isn't blocking

#### Linux Build Failures

```bash
# Install required dependencies
sudo apt-get install dpkg fakeroot rpm
```

### Auto-Update Issues

1. **Updates not detected**
   - Check GitHub Releases for proper assets
   - Verify version in package.json is newer

2. **Download fails**
   - Check network connectivity
   - Verify release is not draft

3. **Installation fails**
   - Check file permissions
   - Try manual download and installation

---

## Security Checklist

Before going to production:

- [ ] All API keys are stored as environment variables
- [ ] Production environment variables are set in Vercel
- [ ] GitHub repository secrets are configured
- [ ] WorkOS redirect URIs include production domain
- [ ] Stripe webhooks point to production endpoint
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] SSL/TLS is enforced (Vercel handles this)
- [ ] Sensitive logs are not exposed
- [ ] Error messages don't leak sensitive info

---

## Rollback Procedures

### API Rollback

1. Go to Vercel dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

### Desktop Rollback

1. Users can manually download previous version from Releases
2. No automatic downgrade (by design)

---

## Performance Optimization

### API

- Enable Vercel Edge Functions for lower latency
- Use connection pooling (enabled by default)
- Implement caching for repeated queries

### Desktop

- Minimize bundle size with tree shaking
- Lazy load heavy components
- Use production React build

---

## Scaling Considerations

### Current Limits (Free Tiers)

| Service | Limit | Upgrade Path |
|---------|-------|--------------|
| Vercel | 100 GB bandwidth | Pro plan |
| Neon | 0.5 GB storage | Pro plan |
| Upstash | 10K requests/day | Pay-as-you-go |
| Groq | 14K requests/day | Contact sales |
| Tavily | 1K searches/month | Paid plan |

### When to Scale

- Bandwidth exceeds 80% of limit
- Database approaching storage limit
- Redis requests consistently near limit
- User complaints about rate limiting
