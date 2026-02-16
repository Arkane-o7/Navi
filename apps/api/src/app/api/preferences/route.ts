import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromHeader } from '@/lib/auth';
import { getUserPreferences, upsertUserPreferences } from '@/lib/db';
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
    const preferences = await getUserPreferences(userId);
    return NextResponse.json({
      success: true,
      data: { preferences },
    });
  } catch (error) {
    logger.error('[Preferences API] GET failed:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch preferences' } },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const userId = getUserIdFromHeader(request);

  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { theme, dockBehavior, model, historyWindowSize } = body as {
      theme?: 'system' | 'dark' | 'light';
      dockBehavior?: 'left' | 'right';
      model?: string;
      historyWindowSize?: number;
    };

    if (theme && !['system', 'dark', 'light'].includes(theme)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid theme value' } },
        { status: 400 }
      );
    }

    if (dockBehavior && !['left', 'right'].includes(dockBehavior)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid dockBehavior value' } },
        { status: 400 }
      );
    }

    if (historyWindowSize !== undefined && (!Number.isFinite(historyWindowSize) || historyWindowSize < 1 || historyWindowSize > 100)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'historyWindowSize must be between 1 and 100' } },
        { status: 400 }
      );
    }

    const preferences = await upsertUserPreferences(userId, {
      theme,
      dockBehavior,
      model,
      historyWindowSize,
    });

    return NextResponse.json({
      success: true,
      data: { preferences },
    });
  } catch (error) {
    logger.error('[Preferences API] PUT failed:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update preferences' } },
      { status: 500 }
    );
  }
}
