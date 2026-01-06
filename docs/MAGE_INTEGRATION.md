# Mage Integration Guide

This document explains how Mage's architecture was integrated into Navi to create a hybrid search/launcher + AI chat application.

## Overview

Mage is a Raycast-like app launcher for Windows built with Electron, Vite, and Vue 3. We've integrated its core concepts into Navi while maintaining our React frontend and API backend.

## What We Integrated

### 1. Spotlight-Style Window Management

**From Mage**:
```typescript
// Frameless, transparent window that stays on top
const win = new BrowserWindow({
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  skipTaskbar: true,
  // ...
});
```

**In Navi**: Already implemented in `src/main/index.ts`

### 2. Search System

**In Navi**:
```typescript
ipcMain.handle('search:query', async (_e, query: string) => {
  const results: SearchResult[] = [];
  // Search apps, actions, and always include chat option
  return results;
});
```

### 3. Dual Mode Interface

- **Search Mode**: Default state, shows search results
- **Chat Mode**: Activated when selecting "Ask Navi"
- Seamless switching with ESC key

### 4. Keyboard Navigation

- Arrow keys navigate search results
- Enter key executes selected result

## Testing the Integration

1. **Start the app**:
   ```bash
   pnpm run dev:electron
   ```

2. **Test search**:
   - Press `Alt+Space` to open
   - Type "calc" → Should show Calculator app
   - Type "time" → Should show current time action
   - Type anything → Should show "Ask Navi: {query}" option

3. **Test chat**:
   - Select "Ask Navi" result
   - Should switch to chat mode
   - Type message and press Enter
   - Should stream response from API

## Resources

- [Mage Repository](https://github.com/Ellicode/mage)
- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/api/ipc-main)
