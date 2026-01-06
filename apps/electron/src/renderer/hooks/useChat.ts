// Use local backend API in development, fallback to production
const API_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3001'
  : 'https://navi-chat-api.vercel.app';

interface ChatStreamOptions {
  message: string;
  onChunk: (content: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export async function streamChat({ message, onChunk, onDone, onError }: ChatStreamOptions) {
  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
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
            if (parsed.chunk) {
              onChunk(parsed.chunk);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    onDone();
  } catch (error) {
    console.error('[Chat Error]', error);
    onError(error instanceof Error ? error : new Error('Unknown error'));
  }
}
