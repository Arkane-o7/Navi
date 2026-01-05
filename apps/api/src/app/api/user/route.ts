import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

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

export async function GET(request: NextRequest) {
  const userId = getUserIdFromHeader(request);

  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } },
      { status: 401 }
    );
  }

  try {
    const user = await sql`
      SELECT id, email, name, created_at, updated_at
      FROM users WHERE id = ${userId}
    ` as Array<{ id: string; email: string; name: string | null; created_at: string; updated_at: string }>;

    if (user.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user[0].id,
        email: user[0].email,
        name: user[0].name,
        createdAt: user[0].created_at,
        updatedAt: user[0].updated_at,
      },
    });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user' } },
      { status: 500 }
    );
  }
}
