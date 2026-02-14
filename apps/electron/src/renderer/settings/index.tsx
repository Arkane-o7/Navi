import React from 'react';
import ReactDOM from 'react-dom/client';
import Settings from './Settings';
import './styles/settings.css';
import { logger } from '../../shared/logger';

// Error boundary for debugging
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('[Settings] React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: 'white', background: '#1c1c1e', height: '100vh', overflow: 'auto' }}>
          <h1 style={{ color: '#ff6b6b' }}>Something went wrong</h1>
          <p>Please restart the application.</p>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#ff6b6b', background: '#2c2c2e', padding: 20, borderRadius: 8 }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#888', fontSize: 12, marginTop: 20 }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

logger.debug('[Settings] Mounting Root...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  logger.error('[Settings] Root element not found!');
  document.body.innerHTML = '<div style="color:red">Root element missing!</div>';
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <Settings />
      </ErrorBoundary>
    </React.StrictMode>
  );
  logger.debug('[Settings] Root rendered.');
}

