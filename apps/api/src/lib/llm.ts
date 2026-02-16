import { ChatCompletionMessage, streamChatCompletion as streamGroqChatCompletion } from '@/lib/groq';
import { GeminiRateLimitError, streamGeminiChatCompletion } from '@/lib/gemini';
import { logger } from '@/lib/logger';

export type LlmChatMessage = ChatCompletionMessage;

export async function* streamChatCompletion(
  messages: LlmChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): AsyncGenerator<string, void, unknown> {
  let geminiEmittedChunks = 0;

  try {
    for await (const chunk of streamGeminiChatCompletion(messages, options)) {
      geminiEmittedChunks += 1;
      yield chunk;
    }
    return;
  } catch (error) {
    const shouldFallbackToGroq = error instanceof GeminiRateLimitError && geminiEmittedChunks === 0;

    if (!shouldFallbackToGroq) {
      throw error;
    }

    logger.warn('[LLM] Gemini rate-limited. Falling back to Groq for this request.', {
      status: error.status,
    });
  }

  for await (const chunk of streamGroqChatCompletion(messages, options)) {
    yield chunk;
  }
}
