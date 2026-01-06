# Navi

A Spotlight-style AI desktop assistant with backend API, inspired by [Mage](https://github.com/Ellicode/mage).

## Project Structure

This is a monorepo containing:

- **`apps/electron`** - Desktop Electron application
- **`apps/api`** - Next.js backend API server
- **`packages/shared`** - Shared TypeScript types and utilities

## Quick Start

```bash
# Install dependencies
pnpm install

# Run everything in development mode
pnpm dev

# Or run individually
pnpm dev:electron    # Electron app
pnpm dev:api         # Backend API
```

## Features

### Electron Desktop App
- ⚡ Global keyboard shortcut (Alt+Space / Cmd+`)
- 🪟 Overlay window with blur effects
- 💬 Streaming AI chat with markdown
- 🔌 Auto-connects to local or remote API
- ⌨️ Keyboard-first navigation

### Backend API
- 🤖 AI chat powered by Groq
- 🔐 Authentication with WorkOS
- 💾 Conversation persistence with Neon
- ⚡ Redis rate limiting
- 🌐 CORS enabled for Electron

## Development

### Prerequisites
- Node.js >= 20
- pnpm 9.15.0

### Environment Setup

#### Backend API (`apps/api/.env`)
```env
# Database (Neon)
DATABASE_URL=postgresql://...

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# AI (Groq)
GROQ_API_KEY=...

# Auth (WorkOS)
WORKOS_API_KEY=workos_sk_...
WORKOS_CLIENT_ID=client_...
WORKOS_REDIRECT_URI=http://localhost:3001/api/auth/callback
```

See `apps/api/.env.example` for all variables.

### Running Locally

1. **Start the Backend API**
   ```bash
   pnpm dev:api
   # API runs on http://localhost:3001
   ```

2. **Start the Electron App**
   ```bash
   pnpm dev:electron
   # Opens development window with hot reload
   ```

3. **Use the App**
   - Press `Alt+Space` (or `Cmd+\`` on Mac) to open
   - Type your question and press Enter
   - Responses stream in real-time

## Architecture

### Communication Flow
```
Electron App (Renderer)
    ↓ HTTP/Streaming
Backend API (Next.js)
    ↓
AI Service (Groq)
    ↓
Database (Neon PostgreSQL)
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Stream AI chat responses |
| `/api/health` | GET | Check API status |
| `/api/auth/login` | GET | Initiate OAuth login |
| `/api/auth/callback` | GET | OAuth callback |
| `/api/conversations` | GET | List user conversations |
| `/api/user` | GET | Get current user info |

## Building for Production

```bash
# Build everything
pnpm build

# Build individually
pnpm build:electron
pnpm build:api
```

### Electron Distribution
```bash
cd apps/electron
pnpm build
# Creates distributable in .vite/build/
```

### API Deployment
The API is designed for Vercel deployment:

```bash
cd apps/api
vercel deploy
```

## Mage Integration

This project integrates key concepts from [Mage](https://github.com/Ellicode/mage):

### From Mage
- 🪟 Fullscreen overlay window architecture
- ⌨️ Global shortcut system
- 🎨 Transparent window with blur effects
- 🔄 Window state management
- 🔗 IPC communication patterns

### Navi Additions
- 🤖 AI chat backend integration
- 💾 Conversation persistence
- 🔐 User authentication
- 📊 API health monitoring
- 🎯 Streaming response handling

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all apps in development |
| `pnpm build` | Build all apps for production |
| `pnpm lint` | Lint all packages |
| `pnpm dev:electron` | Run Electron app only |
| `pnpm dev:api` | Run API server only |
| `pnpm build:electron` | Build Electron app |
| `pnpm build:api` | Build API for deployment |

## Tech Stack

### Electron App
- **Framework**: Electron 33 + React 18
- **Build**: Vite 6 + Electron Forge
- **Language**: TypeScript 5
- **State**: Zustand
- **Styling**: CSS with CSS Variables

### Backend API
- **Framework**: Next.js 15
- **Database**: Neon PostgreSQL
- **Cache**: Upstash Redis
- **AI**: Groq SDK
- **Auth**: WorkOS
- **Language**: TypeScript 5
- **Validation**: Zod

## Troubleshooting

### Electron App Won't Start
```bash
# Rebuild native modules
cd apps/electron
rm -rf node_modules .vite
pnpm install
```

### API Connection Failed
1. Check if API is running: `curl http://localhost:3001/api/health`
2. Verify environment variables in `apps/api/.env`
3. Check console for detailed errors

### Type Errors
```bash
# Regenerate TypeScript declarations
pnpm --filter @navi/electron lint
pnpm --filter @navi/api lint
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and test locally
4. Ensure linting passes: `pnpm lint`
5. Commit with clear messages
6. Open a pull request

## Roadmap

- [ ] App launcher mode (search/open apps)
- [ ] Plugin system for extensibility
- [ ] Context menu actions
- [ ] System tray with quick actions
- [ ] Multi-window support
- [ ] Themes and customization
- [ ] Cross-platform installers

## License

[Add your license here]

## Acknowledgments

- Inspired by [Mage](https://github.com/Ellicode/mage) by [@Ellicode](https://github.com/Ellicode)
- UI inspired by macOS Spotlight and Raycast
- Built with [Electron Forge](https://www.electronforge.io/)
