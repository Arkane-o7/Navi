import { NextRequest, NextResponse } from 'next/server';
import { streamChatCompletion, LlmChatMessage } from '@/lib/llm';
import { getSubscription } from '@/lib/db';
import { consumeDailyMessageSlot, rollbackDailyMessageSlot } from '@/lib/redis';
import { needsSearch, searchWeb, formatSearchContext } from '@/lib/tavily';
import { logger } from '@/lib/logger';
import { getUserIdFromHeader } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
    const requestStartedAt = Date.now();

    let isFreeTier = false;
    let freeTierIdentifier: string | null = null;
    let consumedFreeTierSlot = false;

    try {
        let body: { message?: string; history?: Array<{ role: string; content: string }> };
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
                { status: 400 }
            );
        }
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

        const subscription = userId
            ? await getSubscription(userId)
            : { tier: 'free' as const, status: 'active' as const, periodEnd: null };

        // For users with past due subscriptions, warn them
        if (subscription.status === 'past_due') {
            logger.warn(`[Chat][${requestId}] User ${userId} has past_due subscription`);
        }

        // Atomically consume a free-tier daily message slot.
        isFreeTier = subscription.tier === 'free';
        if (isFreeTier) {
            const countIdentifier = userId || identifier;
            freeTierIdentifier = countIdentifier;
            const limit = await consumeDailyMessageSlot(countIdentifier);
            consumedFreeTierSlot = true;

            if (!limit.allowed) {
                return NextResponse.json(
                    {
                        success: false,
                        error: {
                            code: 'DAILY_LIMIT_REACHED',
                            message: 'You\'ve used all 20 messages for today. Come back tomorrow!',
                            remaining: 0,
                            resetAt: limit.resetAt,
                        }
                    },
                    { status: 429 }
                );
            }
        }

        logger.info(`[Chat][${requestId}] accepted`, {
            authenticated: Boolean(userId),
            tier: subscription.tier,
            historyCount: history.length,
        });

        // Check if message needs web search for real-time information
        let enhancedMessage = message;
        if (needsSearch(message)) {
            try {
                const searchResults = await searchWeb(message, { maxResults: 5 });
                const searchContext = formatSearchContext(searchResults);
                if (searchContext) {
                    enhancedMessage = message + searchContext;
                }
            } catch (error) {
                logger.error(`[Chat][${requestId}] Web search failed, continuing without:`, error);
                // Continue without search results - graceful degradation
            }
        }

        // Build messages array for Groq
        const messages: LlmChatMessage[] = [
            ...history.map((msg: { role: string; content: string }) => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
            })),
            { role: 'user' as const, content: enhancedMessage },
        ];

        // Create streaming response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const streamStartedAt = Date.now();
                let firstTokenAt: number | null = null;
                let emittedChunks = 0;
                try {
                    for await (const chunk of streamChatCompletion(messages)) {
                        emittedChunks += 1;
                        if (firstTokenAt === null) {
                            firstTokenAt = Date.now();
                        }

                        const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
                        controller.enqueue(encoder.encode(data));
                    }
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();

                    logger.info(`[Chat][${requestId}] completed`, {
                        durationMs: Date.now() - streamStartedAt,
                        totalDurationMs: Date.now() - requestStartedAt,
                        firstTokenMs: firstTokenAt ? firstTokenAt - streamStartedAt : null,
                        emittedChunks,
                    });
                } catch (error) {
                    logger.error(`[Chat][${requestId}] Stream error:`, error);

                    if (consumedFreeTierSlot && freeTierIdentifier && emittedChunks === 0) {
                        rollbackDailyMessageSlot(freeTierIdentifier).catch((rollbackError) => {
                            logger.error(`[Chat][${requestId}] Failed to rollback free-tier slot:`, rollbackError);
                        });
                    }

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
                'X-Navi-Request-Id': requestId,
            },
        });
    } catch (error) {
        if (consumedFreeTierSlot && freeTierIdentifier) {
            rollbackDailyMessageSlot(freeTierIdentifier).catch((rollbackError) => {
                logger.error(`[Chat][${requestId}] Failed to rollback free-tier slot after handler error:`, rollbackError);
            });
        }

        logger.error(`[Chat][${requestId}] Handler error after ${Date.now() - requestStartedAt}ms:`, error);
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to process chat' } },
            { status: 500 }
        );
    }
}
