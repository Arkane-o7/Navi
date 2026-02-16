import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getUserIdFromHeader } from '@/lib/auth';

// GET - List conversations
export async function GET(request: NextRequest) {
  const userId = getUserIdFromHeader(request);

  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } },
      { status: 401 }
    );
  }

  try {
    const includeMessages = new URL(request.url).searchParams.get('includeMessages') === 'true';

    if (includeMessages) {
      const conversations = await sql`
        WITH recent_conversations AS (
          SELECT id, title, created_at, updated_at
          FROM conversations
          WHERE user_id = ${userId}
          ORDER BY updated_at DESC
          LIMIT 50
        )
        SELECT
          c.id,
          c.title,
          c.created_at,
          c.updated_at,
          COALESCE(
            json_agg(
              json_build_object(
                'id', m.id,
                'role', m.role,
                'content', m.content,
                'timestamp', EXTRACT(EPOCH FROM m.created_at) * 1000
              )
              ORDER BY m.created_at ASC
            ) FILTER (WHERE m.id IS NOT NULL),
            '[]'::json
          ) AS messages
        FROM recent_conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id
        GROUP BY c.id, c.title, c.created_at, c.updated_at
        ORDER BY c.updated_at DESC
      ` as Array<{
        id: string;
        title: string | null;
        created_at: string;
        updated_at: string;
        messages: Array<{ id: string; role: string; content: string; timestamp: number }> | null;
      }>;

      return NextResponse.json({
        success: true,
        data: conversations.map((c) => ({
          id: c.id,
          title: c.title,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          messages: Array.isArray(c.messages)
            ? c.messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.timestamp,
            }))
            : [],
        })),
      });
    }

    const conversations = await sql`
      SELECT id, title, created_at, updated_at
      FROM conversations
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
      LIMIT 50
    ` as Array<{ id: string; title: string | null; created_at: string; updated_at: string }>;

    return NextResponse.json({
      success: true,
      data: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch conversations:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch conversations' } },
      { status: 500 }
    );
  }
}

// DELETE - Delete a conversation
export async function DELETE(request: NextRequest) {
  const userId = getUserIdFromHeader(request);

  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'Missing conversation ID' } },
        { status: 400 }
      );
    }

    // Verify ownership and delete
    const result = await sql`
      DELETE FROM conversations
      WHERE id = ${conversationId} AND user_id = ${userId}
      RETURNING id
    ` as Array<{ id: string }>;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete conversation:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete conversation' } },
      { status: 500 }
    );
  }
}

// POST - Create a new conversation
export async function POST(request: NextRequest) {
  const userId = getUserIdFromHeader(request);

  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { id, title } = body;

    // Use provided ID or generate new one
    const conversationId = id || crypto.randomUUID();
    const conversationTitle = title || null;

    await sql`
      INSERT INTO conversations (id, user_id, title, created_at, updated_at)
      VALUES (${conversationId}, ${userId}, ${conversationTitle}, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
    `;

    return NextResponse.json({
      success: true,
      data: {
        conversation: {
          id: conversationId,
          title: conversationTitle,
        }
      },
    });
  } catch (error) {
    logger.error('Failed to create conversation:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create conversation' } },
      { status: 500 }
    );
  }
}
