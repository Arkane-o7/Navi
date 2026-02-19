import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromHeader } from '@/lib/auth';
import { invalidateUserMemoryById, listUserMemories } from '@/lib/memory';
import { logger } from '@/lib/logger';

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
    const limitParam = Number(searchParams.get('limit') || 50);
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(200, Math.trunc(limitParam)))
      : 50;

    const memories = await listUserMemories(userId, limit);

    return NextResponse.json({
      success: true,
      data: {
        memories,
      },
    });
  } catch (error) {
    logger.error('[Memory API] GET failed:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch memories' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const userId = getUserIdFromHeader(request);

  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Memory id is required' } },
        { status: 400 }
      );
    }

    const deleted = await invalidateUserMemoryById({ userId, memoryId: id });
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Memory not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Memory API] DELETE failed:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete memory' } },
      { status: 500 }
    );
  }
}
