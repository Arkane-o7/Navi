/**
 * Configuration for the Navi Electron app
 */

// Backend API URL configuration - always use Vercel in production build
export const API_CONFIG = {
  baseUrl: 'https://navi-search.vercel.app',

  // API endpoints
  endpoints: {
    chat: '/api/chat',
    health: '/api/health',
    user: '/api/user',
    conversations: '/api/conversations',
  },
};

// App configuration
export const APP_CONFIG = {
  // Maximum number of messages to display
  maxMessages: 50,

  // Window configuration
  window: {
    minHeight: 54,
    maxHeight: 600,
    width: 640,
  },

  // Feature flags
  features: {
    // Enable launcher mode (coming soon)
    launcher: false,
    // Enable multi-window support
    multiWindow: false,
  },
};

export default { API_CONFIG, APP_CONFIG };
