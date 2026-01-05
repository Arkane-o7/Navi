const API_BASE_URL = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env?.VITE_API_URL || 'http://localhost:3001';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.accessToken) {
      requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
      throw new Error(error.error?.message || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async getLoginUrl(): Promise<{ url: string }> {
    return this.request('/api/auth/login');
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    return this.request('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
  }

  // User endpoints
  async getUser(): Promise<{ success: boolean; data: { id: string; email: string; name: string | null } }> {
    return this.request('/api/user');
  }

  // Chat endpoints
  async sendMessage(
    message: string,
    conversationId?: string,
    onChunk?: (chunk: string) => void
  ): Promise<{ conversationId: string; response: string }> {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
      },
      body: JSON.stringify({ message, conversationId, stream: !!onChunk }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    if (onChunk && response.body) {
      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let finalConversationId = conversationId || '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk) {
                fullResponse += data.chunk;
                onChunk(data.chunk);
              }
              if (data.conversationId) {
                finalConversationId = data.conversationId;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      return { conversationId: finalConversationId, response: fullResponse };
    } else {
      // Non-streaming response
      const data = await response.json();
      return {
        conversationId: data.data.conversationId,
        response: data.data.message.content,
      };
    }
  }

  // Conversations endpoints
  async getConversations(): Promise<{ success: boolean; data: Array<{ id: string; title: string | null }> }> {
    return this.request('/api/conversations');
  }

  async deleteConversation(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/conversations?id=${id}`, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
