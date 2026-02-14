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

        // Verify user owns the conversation
        const conv = await sql`
      SELECT id FROM conversations WHERE id = ${conversationId} AND user_id = ${userId}
    ` as Array<{ id: string }>;

        if (conv.length === 0) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } },
                { status: 404 }
            );
        }

        // Use provided ID or generate new one
        const messageId = id || crypto.randomUUID();

        await sql`
      INSERT INTO messages (id, conversation_id, role, content, created_at)
      VALUES (${messageId}, ${conversationId}, ${role}, ${content}, NOW())
      ON CONFLICT (id) DO UPDATE SET content = ${content}
    `;

        // Update conversation's updated_at
        await sql`
      UPDATE conversations SET updated_at = NOW() WHERE id = ${conversationId}
    `;

        return NextResponse.json({
            success: true,
            data: {
                message: {
                    id: messageId,
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

        // Verify user owns the conversation
        const conv = await sql`
      SELECT id FROM conversations WHERE id = ${conversationId} AND user_id = ${userId}
    ` as Array<{ id: string }>;

        if (conv.length === 0) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } },
                { status: 404 }
            );
        }

        const messages = await sql`
      SELECT id, role, content, created_at
      FROM messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at ASC
    ` as Array<{ id: string; role: string; content: string; created_at: string }>;

        return NextResponse.json({
            success: true,
            data: {
                messages: messages.map(m => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    timestamp: new Date(m.created_at).getTime(),
                }))
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
