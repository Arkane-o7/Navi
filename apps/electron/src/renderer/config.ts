/**
 * Configuration for the Navi Electron app
 */

// Detect if we're running in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Backend API URL configuration
export const API_CONFIG = {
  // Use local backend in development, production deployment otherwise
  baseUrl: isDevelopment 
    ? 'http://localhost:3001'
    : 'https://navi-chat-api.vercel.app',
  
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
