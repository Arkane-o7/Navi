import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserIdFromHeader } from '@/lib/auth';
import { logger } from '@/lib/logger';

// POST /api/messages - Save a message to a conversation
export async function POST(request: NextRequest) {
    const userId = getUserIdFromHeader(request);

    if (!userId) {
        return NextResponse.json(
            { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();
        const { conversationId, id, role, content } = body;

        if (!conversationId || !role || !content) {
            return NextResponse.json(
                { success: false, error: { code: 'INVALID_REQUEST', message: 'Missing required fields' } },
                { status: 400 }
            );
        }

        // Use provided ID or generate new one
        const messageId = id || crypto.randomUUID();

        const result = await sql`
            WITH owned AS (
                SELECT id
                FROM conversations
                WHERE id = ${conversationId} AND user_id = ${userId}
            ),
            upserted_message AS (
                INSERT INTO messages (id, conversation_id, role, content, created_at)
                SELECT ${messageId}, owned.id, ${role}, ${content}, NOW()
                FROM owned
                ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content
                RETURNING id
            ),
            touched_conversation AS (
                UPDATE conversations
                SET updated_at = NOW()
                WHERE id IN (SELECT id FROM owned)
                RETURNING id
            )
            SELECT
                EXISTS(SELECT 1 FROM owned) AS conversation_exists,
                (SELECT id FROM upserted_message LIMIT 1) AS persisted_message_id,
                (SELECT COUNT(*) FROM touched_conversation) AS touched_count
        ` as Array<{
            conversation_exists: boolean;
            persisted_message_id: string | null;
            touched_count: number;
        }>;

        const conversationExists = result[0]?.conversation_exists ?? false;
        if (!conversationExists) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } },
                { status: 404 }
            );
        }

        const persistedMessageId = result[0]?.persisted_message_id || messageId;

        return NextResponse.json({
            success: true,
            data: {
                message: {
                    id: persistedMessageId,
                    conversationId,
                    role,
                    content,
                }
            },
        });
    } catch (error) {
        logger.error('[Messages API] POST error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to save message' } },
            { status: 500 }
        );
    }
}

// GET /api/messages - Get messages for a conversation
export async function GET(request: NextRequest) {
    const userId = getUserIdFromHeader(request);

    if (!userId) {
        return NextResponse.json(
            { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
            { status: 401 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('conversationId');

        if (!conversationId) {
            return NextResponse.json(
                { success: false, error: { code: 'INVALID_REQUEST', message: 'Missing conversationId' } },
                { status: 400 }
            );
        }

        const result = await sql`
            WITH owned AS (
                SELECT id
                FROM conversations
                WHERE id = ${conversationId} AND user_id = ${userId}
            ),
            aggregated_messages AS (
                SELECT COALESCE(
                    json_agg(
                        json_build_object(
                            'id', m.id,
                            'role', m.role,
                            'content', m.content,
                            'timestamp', EXTRACT(EPOCH FROM m.created_at) * 1000
                        )
                        ORDER BY m.created_at ASC
                    ),
                    '[]'::json
                ) AS messages
                FROM messages m
                WHERE m.conversation_id IN (SELECT id FROM owned)
            )
            SELECT
                EXISTS(SELECT 1 FROM owned) AS conversation_exists,
                (SELECT messages FROM aggregated_messages) AS messages
        ` as Array<{
            conversation_exists: boolean;
            messages: Array<{ id: string; role: string; content: string; timestamp: number }> | null;
        }>;

        const conversationExists = result[0]?.conversation_exists ?? false;
        if (!conversationExists) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } },
                { status: 404 }
            );
        }

        const messages = Array.isArray(result[0]?.messages) ? result[0].messages : [];

        return NextResponse.json({
            success: true,
            data: {
                messages: messages.map((m) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp,
                })),
            },
        });
    } catch (error) {
        logger.error('[Messages API] GET error:', error);
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch messages' } },
            { status: 500 }
        );
    }
}
