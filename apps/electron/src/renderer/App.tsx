import React, { useEffect, useCallback } from 'react';
import { useChatStore } from './stores/chatStore';
import { CommandPalette } from './components/CommandPalette';

// ─────────────────────────────────────────────────────────────
// Height Constants (Mage-style calculation)
// ─────────────────────────────────────────────────────────────
const BASE_HEIGHT = 120; // Input + footer
const RESULT_HEIGHT = 56; // Height per search result
const MESSAGE_HEIGHT = 72; // Approximate height per message
const MAX_RESULTS = 5;
const MAX_MESSAGES = 5;

declare global {
  interface Window {
    navi: {
      hide: () => void;
      resize: (height: number) => void;
      openExternal: (url: string) => void;
      getTheme: () => Promise<boolean>;
      onShow: (fn: () => void) => () => void;
      onHide: (fn: () => void) => () => void;
    };
  }
}

export default function App() {
  const { getActiveConversation, clearConversation, createConversation } = useChatStore();
  const conversation = getActiveConversation();
  const messages = conversation?.messages ?? [];

  // ─────────────────────────────────────────────────────────────
  // Window Resize
  // ─────────────────────────────────────────────────────────────
  const calculateHeight = useCallback((resultCount: number, messageCount: number): number => {
    let height = BASE_HEIGHT;
    
    // Add height for search results
    const visibleResults = Math.min(resultCount, MAX_RESULTS);
    height += visibleResults * RESULT_HEIGHT;
    
    // Add height for messages
    const visibleMessages = Math.min(messageCount, MAX_MESSAGES);
    height += visibleMessages * MESSAGE_HEIGHT;
    
    return height;
  }, []);

  const updateHeight = useCallback(() => {
    if (!window.navi) return;
    // Default to showing 3 results in search mode
    const height = calculateHeight(3, messages.length);
    window.navi.resize(height);
  }, [messages.length, calculateHeight]);

  // Update height on mount and message changes
  useEffect(() => {
    updateHeight();
  }, [updateHeight]);

  // ─────────────────────────────────────────────────────────────
  // Window Events
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!window.navi) return;

    const unsubShow = window.navi.onShow(() => {
      updateHeight();
    });

    return unsubShow;
  }, [updateHeight]);

  // ─────────────────────────────────────────────────────────────
  // Global Keyboard Shortcuts
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (conversation) {
          clearConversation(conversation.id);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        createConversation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [conversation, clearConversation, createConversation]);

  // ─────────────────────────────────────────────────────────────
  // Close Handler
  // ─────────────────────────────────────────────────────────────
  const handleClose = () => {
    window.navi?.hide();
  };

  return <CommandPalette onClose={handleClose} />;
}
