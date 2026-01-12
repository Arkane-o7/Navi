import { API_CONFIG } from '../config';
import { useAuthStore } from '../stores/authStore';

// Message format for API (simplified from store format)
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Error response from API
export interface APIError {
  code: string;
  message: string;
  remaining?: number;
  resetAt?: number;
  upgradeUrl?: string;
}

interface ChatStreamOptions {
  message: string;
  history?: ChatMessage[]; // Previous messages for context
  onChunk: (content: string) => void;
  onDone: () => void;
  onError: (error: Error & { code?: string; upgradeUrl?: string }) => void;
}

export async function streamChat({ message, history = [], onChunk, onDone, onError }: ChatStreamOptions) {
  try {
    // Get auth token from store
    const accessToken = useAuthStore.getState().accessToken;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.chat}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, history }),
    });

    if (!response.ok) {
      // Try to parse error response
      try {
        const errorData = await response.json();
        const apiError = errorData.error as APIError;

        // Create error with additional properties
        const error = new Error(apiError?.message || `API Error: ${response.status}`) as Error & {
          code?: string;
          upgradeUrl?: string;
          resetAt?: number;
        };
        error.code = apiError?.code;
        error.upgradeUrl = apiError?.upgradeUrl;
        error.resetAt = apiError?.resetAt;

        // Update auth store if we hit daily limit
        if (apiError?.code === 'DAILY_LIMIT_REACHED') {
          useAuthStore.getState().updateDailyUsage(20, 20); // Mark as fully used
        }

        throw error;
      } catch (parseError) {
        if (parseError instanceof Error && (parseError as Error & { code?: string }).code) {
          throw parseError; // Re-throw if it's our custom error
        }
        throw new Error(`API Error: ${response.status}`);
      }
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              onChunk(parsed.content);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    onDone();
  } catch (error) {
    onError(error instanceof Error ? error as Error & { code?: string; upgradeUrl?: string } : new Error('Unknown error'));
  }
}
