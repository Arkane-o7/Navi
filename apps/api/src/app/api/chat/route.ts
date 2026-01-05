import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createChatCompletion, streamChatCompletion, type ChatCompletionMessage } from '@/lib/groq';
import { sql } from '@/lib/db';
import { checkRateLimit } from '@/lib/redis';

// CORS headers for Electron app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

const chatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().optional(),
  stream: z.boolean().optional().default(true),
});

// Helper to get user ID from auth header
function getUserIdFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    // Decode JWT payload (basic validation)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.sub || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user from auth (optional for guest mode)
    let userId = getUserIdFromHeader(request);

    // Allow guest access for development/testing
    const isGuestMode = !userId;
    if (isGuestMode) {
      userId = 'guest-' + (request.headers.get('x-forwarded-for') || 'anonymous').split(',')[0].trim();
    }

    // Rate limiting (skip for now to debug)
    // TODO: Re-enable rate limiting after debugging
    // Rate limiting temporarily disabled

    // Parse request
    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { message, conversationId, stream } = parsed.data;

    // For guest mode, skip database operations and just chat with Groq
    if (isGuestMode) {
      const messages: ChatCompletionMessage[] = [
        { role: 'user' as const, content: message },
      ];

      if (stream) {
        const encoder = new TextEncoder();

        const readable = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of streamChatCompletion(messages)) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
                );
              }
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
            } catch (error) {
              console.error('Stream error:', error);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`)
              );
              controller.close();
            }
          },
        });

        return new Response(readable, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      } else {
        const response = await createChatCompletion(messages);
        return NextResponse.json({
          success: true,
          data: {
            message: {
              role: 'assistant',
              content: response,
            },
          },
        });
      }
    }

    // Authenticated user flow with database
    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      convId = crypto.randomUUID();
      await sql`
        INSERT INTO conversations (id, user_id, title)
        VALUES (${convId}, ${userId}, ${message.slice(0, 100)})
      `;
    }

    // Get conversation history
    const history = await sql`
      SELECT role, content FROM messages
      WHERE conversation_id = ${convId}
      ORDER BY created_at ASC
      LIMIT 20
    ` as Array<{ role: string; content: string }>;

    const messages: ChatCompletionMessage[] = [
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ];

    // Save user message
    const userMessageId = crypto.randomUUID();
    await sql`
      INSERT INTO messages (id, conversation_id, role, content)
      VALUES (${userMessageId}, ${convId}, 'user', ${message})
    `;

    // Generate response
    if (stream) {
      // Streaming response
      const encoder = new TextEncoder();
      const assistantMessageId = crypto.randomUUID();
      let fullResponse = '';

      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamChatCompletion(messages)) {
              fullResponse += chunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ chunk, conversationId: convId })}\n\n`)
              );
            }

            // Save assistant message
            await sql`
              INSERT INTO messages (id, conversation_id, role, content)
              VALUES (${assistantMessageId}, ${convId}, 'assistant', ${fullResponse})
            `;

            // Update conversation timestamp
            await sql`
              UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ${convId}
            `;

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ done: true, messageId: assistantMessageId, conversationId: convId })}\n\n`
              )
            );
            controller.close();
          } catch (error) {
            console.error('Stream error:', error);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } else {
      // Non-streaming response
      const response = await createChatCompletion(messages);

      const assistantMessageId = crypto.randomUUID();
      await sql`
        INSERT INTO messages (id, conversation_id, role, content)
        VALUES (${assistantMessageId}, ${convId}, 'assistant', ${response})
      `;

      await sql`
        UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ${convId}
      `;

      return NextResponse.json({
        success: true,
        data: {
          id: assistantMessageId,
          conversationId: convId,
          message: {
            id: assistantMessageId,
            role: 'assistant',
            content: response,
            createdAt: new Date(),
          },
        },
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to process chat' } },
      { status: 500 }
    );
  }
}
