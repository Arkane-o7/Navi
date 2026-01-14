<p align="center">
  <img src="apps/electron/assets/logo-dark.png" alt="Navi Logo" width="120" height="120" />
</p>

<h1 align="center">Navi</h1>

<p align="center">
  <strong>A Spotlight-style AI assistant for your desktop</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#development">Development</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D20-green" alt="Node.js" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License" />
</p>

---

## ✨ Features

- **⚡ Instant Access** — Summon Navi anywhere with a global keyboard shortcut (`Cmd+\`` on macOS, `Alt+\`` on Windows/Linux)
- **🤖 Powered by LLMs** — Leverages Groq's ultra-fast LLaMA 3.3 70B model for intelligent responses
- **🔍 Real-time Web Search** — Automatically searches the web for current information when needed (via Tavily)
- **💬 Conversation History** — Maintains context across messages with cloud sync support
- **🌓 Dark/Light Mode** — Follows your system theme or set your preference
- **🔐 Secure Authentication** — Enterprise-grade auth via WorkOS with Google SSO support
- **📦 Cross-Platform** — Native builds for macOS, Windows, and Linux
- **🔄 Auto-Updates** — Seamless updates delivered via GitHub Releases

---

## 📥 Installation

### Download Pre-built Binaries

Download the latest release for your platform from the [Releases page](https://github.com/Arkane-o7/Navi/releases):

| Platform | Download |
|----------|----------|
| macOS    | `Navi-x.x.x.dmg` or `Navi-darwin-x64-x.x.x.zip` |
| Windows  | `Navi-x.x.x Setup.exe` |
| Linux    | `Navi-linux-x64-x.x.x.zip` |

### macOS Notes

Since the app is ad-hoc signed (not Apple notarized), you'll need to:
1. Right-click the app and select "Open"
2. Click "Open" in the confirmation dialog

---

## 🚀 Development

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** 9.x (recommended) — `npm install -g pnpm@9`

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Arkane-o7/Navi.git
cd Navi

# Install dependencies
pnpm install

# Start the development servers (both API and Electron)
pnpm dev

# Or start them separately:
pnpm dev:api       # Start the API server on http://localhost:3001
pnpm dev:electron  # Start the Electron app
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode (via Turborepo) |
| `pnpm dev:api` | Start the Next.js API server |
| `pnpm dev:electron` | Start the Electron app |
| `pnpm build` | Build all apps for production |
| `pnpm build:electron` | Build the Electron app |
| `pnpm build:api` | Build the API server |
| `pnpm lint` | Run linting across all packages |

---

## 🏗️ Architecture

Navi is built as a **monorepo** using [Turborepo](https://turbo.build/) and [pnpm workspaces](https://pnpm.io/workspaces):

```
navi/
├── apps/
│   ├── api/           # Next.js API server (deployed to Vercel)
│   │   ├── src/
│   │   │   ├── app/api/     # API routes
│   │   │   │   ├── auth/    # WorkOS authentication
│   │   │   │   ├── chat/    # LLM chat endpoint (streaming)
│   │   │   │   ├── conversations/
│   │   │   │   ├── messages/
│   │   │   │   ├── subscription/
│   │   │   │   └── user/
│   │   │   └── lib/         # Shared utilities
│   │   │       ├── auth.ts    # WorkOS integration
│   │   │       ├── db.ts      # Neon PostgreSQL
│   │   │       ├── groq.ts    # Groq LLM client
│   │   │       ├── redis.ts   # Upstash Redis
│   │   │       └── tavily.ts  # Web search
│   │   └── vercel.json        # Vercel deployment config
│   │
│   └── electron/      # Electron desktop app
│       ├── src/
│       │   ├── main/          # Main process
│       │   ├── preload/       # Preload scripts
│       │   └── renderer/      # React UI
│       │       ├── App.tsx    # Main chat interface
│       │       ├── settings/  # Settings window
│       │       ├── stores/    # Zustand state management
│       │       └── components/
│       ├── assets/            # App icons and images
│       └── forge.config.js    # Electron Forge config
│
├── packages/
│   └── shared/        # Shared types and utilities
│
├── turbo.json         # Turborepo configuration
├── pnpm-workspace.yaml
└── package.json
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| **Desktop App** | Electron + React + TypeScript |
| **Build System** | Vite + Electron Forge |
| **API Server** | Next.js 16 (App Router) |
| **LLM Provider** | Groq (LLaMA 3.3 70B) |
| **Database** | Neon PostgreSQL (serverless) |
| **Cache/Rate Limiting** | Upstash Redis |
| **Web Search** | Tavily API |
| **Authentication** | WorkOS (AuthKit) |
| **Payments** | Stripe (optional) |
| **Deployment** | Vercel (API) + GitHub Releases (Desktop) |
| **Monorepo** | Turborepo + pnpm |

---

## ⚙️ Configuration

### API Server (`.env` in `apps/api/`)

Copy `.env.example` to `.env` and configure:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host.neon.tech/neondb?sslmode=require"

# Cache & Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# LLM Provider (Groq)
GROQ_API_KEY="gsk_your_groq_api_key"

# Authentication (WorkOS)
WORKOS_API_KEY="sk_your_workos_api_key"
WORKOS_CLIENT_ID="client_your_client_id"

# Web Search (Tavily) - Optional
TAVILY_API_KEY="tvly-your-tavily-key"

# Stripe (Optional - for subscriptions)
# STRIPE_SECRET_KEY="sk_test_..."
# STRIPE_WEBHOOK_SECRET="whsec_..."
# STRIPE_PRO_PRICE_ID="price_..."

# App Configuration
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
PORT=3001
NODE_ENV=development
```

### Electron App (`.env` in `apps/electron/`)

```bash
# API URL (your Vercel deployment or localhost for dev)
VITE_API_URL=http://localhost:3001
```

---

## 🎹 Keyboard Shortcuts

| Shortcut | macOS | Windows/Linux | Action |
|----------|-------|---------------|--------|
| Toggle Navi | `Cmd + \`` | `Alt + \`` | Show/hide the command palette |
| Settings | `Cmd + .` | `Alt + .` | Open settings window |
| New Chat | `Cmd + N` | `Alt + N` | Start a new conversation |
| Close | `Esc` | `Esc` | Hide the panel |

---

## 📦 Building for Production

### Build Desktop App

```bash
cd apps/electron

# Build for current platform
pnpm run make

# Package without creating installer
pnpm run package
```

Built artifacts will be in `apps/electron/out/`.

### Release Process

The project uses GitHub Actions for automated releases:

1. Create and push a version tag:
   ```bash
   git tag v0.1.8
   git push origin v0.1.8
   ```

2. The workflow automatically builds for macOS, Windows, and Linux

3. Release drafts are created on GitHub Releases for review

---

## 🌐 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Stream chat completions |
| `/api/auth/login` | GET | Initiate WorkOS authentication |
| `/api/auth/callback` | GET | Handle OAuth callback |
| `/api/user` | GET | Get current user info |
| `/api/conversations` | GET/POST | Manage conversations |
| `/api/messages` | GET/POST | Manage messages |
| `/api/subscription/*` | Various | Stripe subscription management |
| `/api/health` | GET | Health check endpoint |

---

## 🔒 Security

- **Context Isolation**: Electron's context isolation is enabled for security
- **No Node Integration**: Renderer processes don't have direct Node.js access
- **Secure Token Storage**: Auth tokens stored securely in the renderer
- **HTTPS Only**: All API communications use HTTPS in production
- **Rate Limiting**: Built-in rate limiting via Upstash Redis

---

## 📝 Free Tier Limits

- **20 messages per day** for free tier users
- Limits reset at midnight UTC
- Pro plan (coming soon) for unlimited usage

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Groq](https://groq.com/) for ultra-fast LLM inference
- [Electron](https://www.electronjs.org/) for cross-platform desktop apps
- [WorkOS](https://workos.com/) for authentication
- [Neon](https://neon.tech/) for serverless PostgreSQL
- [Upstash](https://upstash.com/) for serverless Redis
- [Tavily](https://tavily.com/) for web search
- [Vercel](https://vercel.com/) for hosting

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Arkane-o7">Arkane-o7</a>
</p>
