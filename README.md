# Navi

**Spotlight-style LLM desktop app with integrated search and launcher**

Navi is a desktop application that combines the power of AI chat with a fast app launcher, inspired by [Raycast](https://raycast.com) and [Mage](https://github.com/Ellicode/mage).

## Features

### 🔍 Smart Search & Launcher
- **Quick App Launch**: Find and launch applications instantly
- **Keyword Search**: Search apps by name or keywords
- **Quick Actions**: Built-in actions like time, calculator, etc.
- **Fast Performance**: Spotlight-style interface with instant results

### 💬 AI Chat Assistant
- **Powered by Groq**: Fast LLM responses
- **Streaming Responses**: Real-time AI interaction
- **Conversation History**: Persistent chat sessions
- **Markdown Support**: Rich text formatting in responses

### ⌨️ Keyboard-First Design
- **Global Shortcut**: `Alt+Space` (Windows/Linux) or `Cmd+`` (macOS)
- **Navigation**: Arrow keys to navigate search results
- **Quick Escape**: Press `Esc` to hide or go back
- **Modal Workflow**: `Cmd+K` to clear, `Cmd+N` for new chat

## Architecture

This is a monorepo project with the following structure:

```
apps/
  ├── electron/       # Desktop application (Electron + React)
  │   ├── src/
  │   │   ├── main/        # Electron main process
  │   │   ├── preload/     # Preload scripts
  │   │   └── renderer/    # React UI
  │   └── package.json
  │
  └── api/            # Backend API (Next.js)
      ├── src/
      │   ├── app/api/     # API routes
      │   └── lib/         # Utilities (Groq, DB, Redis)
      └── package.json

packages/
  └── shared/         # Shared types and utilities
```

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** 9.15.0 (automatically installed via packageManager)

### Installation

```bash
# Install dependencies
pnpm install

# Start development
pnpm run dev        # Start all services
pnpm run dev:electron  # Start Electron app only
pnpm run dev:api       # Start API server only
```

### Building

```bash
# Build all packages
pnpm run build

# Build specific package
pnpm run build:electron
pnpm run build:api
```

## Key Technologies

- **Frontend**: React, TypeScript, Zustand (state management)
- **Desktop**: Electron, Electron Forge
- **Backend**: Next.js 15, TypeScript
- **AI**: Groq SDK (LLaMA models)
- **Database**: Neon (PostgreSQL)
- **Cache**: Upstash Redis
- **Auth**: WorkOS
- **Build**: Vite, Turbo (monorepo)

## Mage Integration

This project integrates concepts from [Mage](https://github.com/Ellicode/mage), a Raycast-like launcher:

### What We Adopted
- **Spotlight-style Window**: Frameless, transparent, always-on-top
- **Search-First Interface**: Start with search, then switch to chat
- **Keyboard Navigation**: Arrow key navigation in search results
- **Quick Actions**: Built-in shortcuts and utilities

### What We Kept from Navi
- **React Frontend**: Instead of Vue (Mage uses Vue 3)
- **Electron Forge**: Instead of vite-plugin-electron
- **API Backend**: Separate Next.js API with LLM integration
- **Chat Focus**: AI assistant is a core feature, not a plugin

## Development

### Running Tests

```bash
pnpm run lint       # Type-check all packages
```

### Project Structure

**Electron App**:
- `src/main/index.ts` - Main process with window management and IPC handlers
- `src/preload/index.ts` - Secure bridge between main and renderer
- `src/renderer/App.tsx` - React UI with dual mode (search/chat)
- `src/renderer/stores/` - Zustand stores for state management

**API Server**:
- `src/app/api/chat/route.ts` - Streaming chat endpoint
- `src/lib/groq.ts` - Groq LLM client
- `src/lib/db.ts` - Database connection
- `src/lib/redis.ts` - Rate limiting

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [Mage](https://github.com/Ellicode/mage) - Inspiration for the launcher functionality
- [Raycast](https://raycast.com) - UI/UX inspiration
- [Cerebro](https://cerebroapp.com) - Spotlight-style search inspiration

---

Made with ❤️ by developers who love productivity
