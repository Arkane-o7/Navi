# 🦋 Navi: A Complete Overview

## What is Navi?

**Navi** is a **Spotlight-style AI assistant for your desktop** — a sleek, always-available command palette that lives in your system tray and can be summoned instantly with a global keyboard shortcut (`Cmd+`` on macOS, `Alt+`` on Windows/Linux). Think of it as having a powerful AI assistant that's just one keystroke away, no matter what you're doing on your computer.

---

## 🎯 The Pitch (Elevator Style)

> *"Imagine having a genius assistant who's always one keystroke away, ready to answer any question, search the web for current info, or help you think through problems — without ever leaving what you're working on. That's Navi.*
>
> *It's a beautiful, native desktop app that appears as a floating command palette over everything else. Ask it anything — from code questions to research to brainstorming — and it responds with lightning-fast AI powered by Groq's LLaMA 3.3 70B model. It even searches the web in real-time when you need current information.*
>
> *No more context-switching. No more browser tabs. Just hit a shortcut, ask your question, and get back to work."*

---

## ✨ Core Features

- **⚡ Instant Access** — Summon Navi anywhere with a global keyboard shortcut
- **🤖 Powered by LLMs** — Leverages Groq's ultra-fast LLaMA 3.3 70B model for intelligent responses
- **🔍 Real-time Web Search** — Automatically searches the web for current information when needed (via Tavily)
- **💬 Conversation History** — Maintains context across messages with cloud sync support
- **🌓 Dark/Light Mode** — Follows your system theme or set your preference
- **🔐 Secure Authentication** — Enterprise-grade auth via WorkOS with Google SSO support
- **📦 Cross-Platform** — Native builds for macOS, Windows, and Linux
- **🔄 Auto-Updates** — Seamless updates delivered via GitHub Releases

---

## 🎨 UI/UX Deep Dive

### 1. The Invocation Model: Spotlight-Like Overlay

The core UX philosophy is **minimal friction**:

- **Global Keyboard Shortcut**: Press `Cmd+`` (Mac) or `Alt+`` (Windows/Linux) from *anywhere* — any app, any screen — and Navi appears
- **Full-Screen Transparent Overlay**: The window covers your entire screen but is completely transparent and **click-through**
- **Floating Command Palette**: A beautifully styled 640px-wide panel floats centered near the top of the screen (120px from top)
- **Follows Your Cursor**: If you have multiple displays, Navi appears on whichever screen your cursor is on
- **Escape to Dismiss**: Press `Esc` or click away, and it disappears — no UI chrome to close

### 2. The Command Palette Panel

The main interface is a sophisticated **glassmorphic floating panel**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Messages Area - Scrollable]                              │
│                                                             │
│  🦋 AI Response with rich Markdown...                       │
│     - Code blocks                                          │
│     - Lists                                                │
│     - Links                                                │
│                                                             │
│              Your message appears in a bubble →  [User Msg]│
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🔍  Ask Navi anything...                                 ⏳│
├─────────────────────────────────────────────────────────────┤
│  ⌘N New     ⌘. Settings                           esc Close │
└─────────────────────────────────────────────────────────────┘
```

**Key Visual Elements:**

| Element | Description |
|---------|-------------|
| **Backdrop Blur** | 40px blur with 180% saturation — creates a beautiful frosted glass effect |
| **Rounded Corners** | 20px border radius for a modern, soft appearance |
| **Subtle Border** | 8% white border with layered box shadows for depth |
| **Dark/Light Themes** | Automatically follows system preference or user choice |
| **Smooth Transitions** | Height and opacity animate smoothly at 150ms |

### 3. Input Experience

The input bar is designed for **instant interaction**:

- **Auto-Focus**: Input immediately focused when panel appears
- **Search Icon**: Familiar magnifying glass icon indicates search/query intent
- **Large Text**: 16px font for easy readability
- **Accent Caret**: Blue cursor matching the accent color
- **Loading Spinner**: Appears while waiting for AI response

### 4. Conversation Display

Messages are styled for **clarity and hierarchy**:

| Message Type | Style |
|--------------|-------|
| **User Messages** | Right-aligned, subtle bubble with border, rounded corners (16px top, 4px bottom-right) |
| **AI Responses** | Left-aligned with Navi butterfly logo avatar, full markdown rendering |
| **Streaming** | Live typing with a blinking cursor indicator |

**Markdown Support:**
- Code blocks with monospace font (SF Mono, Fira Code)
- Syntax highlighting in secondary background
- Copy button that appears on hover
- Lists, links, blockquotes all styled
- Proper link styling with accent color

### 5. Keyboard-First Navigation

Navi is designed for **power users who prefer keyboards**:

| Shortcut | macOS | Windows/Linux | Action |
|----------|-------|---------------|--------|
| Toggle | `⌘`` | `Alt+`` | Show/hide Navi |
| Settings | `⌘.` | `Alt+.` | Open settings |
| New Chat | `⌘N` | `Alt+N` | Start fresh conversation |
| Close | `Esc` | `Esc` | Hide the panel |

The footer always shows available shortcuts in a subtle, non-intrusive way.

### 6. Draggable Panel

For ergonomics, users can **reposition the panel**:

- Drag from the edges or footer
- Smooth drag with enhanced shadow while moving
- Position persists until toggled again
- Never interferes with text selection or buttons

### 7. Settings Window

A separate, polished settings window with **sidebar navigation**:

```
┌────────────────────────────────────────────────────────────────┐
│ Settings                                               [● ● ●] │
├──────────────┬─────────────────────────────────────────────────┤
│              │                                                 │
│  ⚙ General   │  General                                        │
│  ☁ Cloud Sync│                                                 │
│  ⚡ Advanced  │  Account                                       │
│              │  ┌────────────────────────────────────────────┐ │
│              │  │ User Name                    [Sign Out]    │ │
│              │  │ email@example.com                          │ │
│              │  │                                            │ │
│              │  │ Free Plan              [Pro Coming Soon]   │ │
│              │  │ ████████░░░░░░ 15/20 messages today        │ │
│              │  └────────────────────────────────────────────┘ │
│              │                                                 │
│              │  Appearance                                     │
│              │  Theme: [System Default ▼]                      │
│              │                                                 │
└──────────────┴─────────────────────────────────────────────────┘
```

**Settings Features:**
- **Account Management**: Sign in with Google SSO via WorkOS
- **Subscription Status**: Usage progress bar showing daily limit
- **Theme Selection**: System/Dark/Light options
- **AI Model Selection**: Choose from multiple Groq models
- **Conversation Memory**: Configurable history window

### 8. Authentication Flow

Elegant **modal-based auth prompts**:

- Appear inline when needed (not blocking the whole app)
- Beautiful frosted backdrop blur
- Primary/secondary button styling
- "Continue without signing in" option respects user choice

### 9. System Tray Integration

Navi lives as a **tray/menu bar app**:

- **macOS**: Hides from dock, appears in menu bar
- **Windows**: System tray icon with balloon notifications
- **Right-click menu**: Quick access to Toggle, Settings, Launch at Startup, Quit
- **Auto-start**: Launches at login by default

### 10. Visual Polish Details

| Feature | Implementation |
|---------|----------------|
| **Logo** | Elegant butterfly design, light/dark variants |
| **Typography** | SF Pro system font, proper font smoothing |
| **Colors** | Dark theme: `#1c1c1e` base, Blue accent `#0a84ff` |
| **Animations** | Smooth height transitions, opacity fades |
| **Scrollbar** | Minimal 6px thumb, only visible on hover |
| **Responsive** | Panel never exceeds 480px height, scrolls internally |

---

## 🎨 Design System

### Color Palette

#### Dark Theme (Default)
```css
--bg: rgba(28, 28, 30, 0.92);
--bg-secondary: rgba(44, 44, 46, 0.8);
--border: rgba(255, 255, 255, 0.08);
--text: #f5f5f7;
--text-secondary: rgba(255, 255, 255, 0.55);
--accent: #0a84ff;
```

#### Light Theme
```css
--bg: rgba(255, 255, 255, 0.88);
--bg-secondary: rgba(245, 245, 247, 0.85);
--border: rgba(0, 0, 0, 0.1);
--text: #1c1c1e;
--text-secondary: rgba(0, 0, 0, 0.55);
--accent: #007aff;
```

### Typography
- **Primary Font**: SF Pro Text, system fonts fallback
- **Monospace**: SF Mono, Fira Code, Menlo
- **Base Size**: 14px body, 16px input
- **Font Smoothing**: Antialiased rendering

### Spacing & Sizing
- **Panel Width**: 640px
- **Panel Max Height**: 480px
- **Input Height**: 54px
- **Border Radius**: 20px (large), 10px (small)
- **Panel Top Offset**: 120px from screen top

---

## ⚡ Technical Architecture

### Stack Overview

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

### Project Structure

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
│   │   └── vercel.json
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
│       └── assets/            # App icons and images
│
├── packages/
│   └── shared/        # Shared types and utilities
│
└── turbo.json         # Turborepo configuration
```

### State Management

Three Zustand stores manage application state:

1. **chatStore**: Conversations, messages, active conversation
2. **settingsStore**: Theme, AI model, preferences
3. **authStore**: User info, tokens, subscription status

---

## 🔒 Security Features

- **Context Isolation**: Electron's context isolation is enabled
- **No Node Integration**: Renderer processes don't have direct Node.js access
- **Secure Token Storage**: Auth tokens stored securely in the renderer
- **HTTPS Only**: All API communications use HTTPS in production
- **Rate Limiting**: Built-in rate limiting via Upstash Redis

---

## 💰 Pricing Model

### Free Tier
- **20 messages per day**
- Limits reset at midnight UTC
- Full feature access

### Pro Plan (Coming Soon)
- Unlimited messages
- Priority support
- Cloud sync across devices

---

## 🌟 Key UX Principles

1. **Zero Friction**: One shortcut to summon, Escape to dismiss
2. **Context Preservation**: Overlay design means you never leave your work
3. **Keyboard-First**: Every action has a shortcut
4. **Beautiful Defaults**: Dark theme, blur effects, smooth animations out of the box
5. **Progressive Disclosure**: Simple by default, power features in Settings
6. **Cross-Platform Consistency**: Same experience on macOS, Windows, and Linux

---

## 🚀 Getting Started

### Download

Download the latest release for your platform:

| Platform | Download |
|----------|----------|
| macOS    | `Navi-x.x.x.dmg` or `Navi-darwin-x64-x.x.x.zip` |
| Windows  | `Navi-x.x.x Setup.exe` |
| Linux    | `Navi-linux-x64-x.x.x.zip` |

### First Launch

1. Install the app for your platform
2. Navi will start and appear in your system tray/menu bar
3. Press `Cmd+`` (Mac) or `Alt+`` (Windows/Linux) to summon Navi
4. Start asking questions!

### macOS Notes

Since the app is ad-hoc signed (not Apple notarized), you'll need to:
1. Right-click the app and select "Open"
2. Click "Open" in the confirmation dialog

---

## 🎯 Summary

Navi transforms the way you interact with AI — it's not just another chatbot, it's an **ambient intelligence layer for your desktop** that's always there when you need it, and invisible when you don't. ✨

---

*Made with ❤️ by [Arkane-o7](https://github.com/Arkane-o7)*
