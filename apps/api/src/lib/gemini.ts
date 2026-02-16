import { SYSTEM_PROMPT } from '@/lib/groq';

export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

export interface GeminiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class GeminiRateLimitError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GeminiRateLimitError';
    this.status = status;
  }
}

function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  return apiKey;
}

function isGeminiRateLimitResponse(status: number, rawError: string): boolean {
  if (status === 429) return true;
  const normalized = rawError.toLowerCase();
  return normalized.includes('resource_exhausted')
    || normalized.includes('rate limit')
    || normalized.includes('quota exceeded')
    || normalized.includes('too many requests');
}

function mapMessagesToGeminiContents(messages: GeminiChatMessage[]) {
  return messages
    .filter((msg) => msg.role !== 'system')
    .map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
}

function extractTextFromGeminiChunk(parsed: any): string {
  const candidates = Array.isArray(parsed?.candidates) ? parsed.candidates : [];
  const firstCandidate = candidates[0];
  const parts = Array.isArray(firstCandidate?.content?.parts) ? firstCandidate.content.parts : [];

  let text = '';
  for (const part of parts) {
    if (typeof part?.text === 'string') {
      text += part.text;
    }
  }

  return text;
}

export async function* streamGeminiChatCompletion(
  messages: GeminiChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): AsyncGenerator<string, void, unknown> {
  const {
    model = DEFAULT_GEMINI_MODEL,
    temperature = 0.7,
    maxTokens = 2048,
  } = options ?? {};

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${getGeminiApiKey()}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: mapMessagesToGeminiContents(messages),
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (isGeminiRateLimitResponse(response.status, errorText)) {
      throw new GeminiRateLimitError(
        `Gemini rate limit: ${response.status} - ${errorText}`,
        response.status
      );
    }
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Gemini response has no body');
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
      if (!line.startsWith('data: ')) continue;

      const data = line.slice(6).trim();
      if (!data || data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const text = extractTextFromGeminiChunk(parsed);
        if (text) {
          yield text;
        }
      } catch {
        // Ignore malformed/incomplete chunks.
      }
    }
  }
}
