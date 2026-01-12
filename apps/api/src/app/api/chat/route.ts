import { NextRequest, NextResponse } from 'next/server';
import { streamChatCompletion, ChatCompletionMessage } from '@/lib/groq';
import { getSubscription, sql } from '@/lib/db';
import { checkDailyMessageLimit, incrementDailyMessageCount } from '@/lib/redis';

// Helper to get user ID from auth header
function getUserIdFromHeader(request: NextRequest): string | null {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7);
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return payload.sub || null;
    } catch {
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, history = [] } = body;

        if (!message) {
            return NextResponse.json(
                { success: false, error: { code: 'BAD_REQUEST', message: 'Message is required' } },
                { status: 400 }
            );
        }

        // Check if user is authenticated (optional for now - free tier allows anonymous)
        const userId = getUserIdFromHeader(request);

        // For anonymous users, use IP-based rate limiting
        const identifier = userId || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous';

        // Run subscription and rate limit checks in PARALLEL for better performance
        const [subscription, limitCheck] = await Promise.all([
            userId ? getSubscription(userId) : Promise.resolve({ tier: 'free' as const, status: 'active' as const, periodEnd: null }),
            checkDailyMessageLimit(identifier),
        ]);

        // For free tier users, check daily message limit
        if (subscription.tier === 'free' && !limitCheck.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'DAILY_LIMIT_REACHED',
                        message: 'You\'ve used all 20 messages for today. Come back tomorrow!',
                        remaining: 0,
                        resetAt: limitCheck.resetAt,
                    }
                },
                { status: 429 }
            );
        }

        // For users with past due subscriptions, warn them
        if (subscription.status === 'past_due') {
            console.warn(`[Chat] User ${userId} has past_due subscription`);
        }

        // Increment daily message count for free tier users
        // IMPORTANT: Use userId (not IP-based identifier) for authenticated users
        // This ensures the count matches what /api/user returns
        if (subscription.tier === 'free') {
            const countIdentifier = userId || identifier;
            await incrementDailyMessageCount(countIdentifier);
        }

        // Build messages array for Groq
        const messages: ChatCompletionMessage[] = [
            ...history.map((msg: { role: string; content: string }) => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
            })),
            { role: 'user' as const, content: message },
        ];

        // Create streaming response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of streamChatCompletion(messages)) {
                        const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
                        controller.enqueue(encoder.encode(data));
                    }
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                } catch (error) {
                    console.error('Stream error:', error);
                    const errorData = `data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`;
                    controller.enqueue(encoder.encode(errorData));
                    controller.close();
                }
            },
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to process chat' } },
            { status: 500 }
        );
    }
}
