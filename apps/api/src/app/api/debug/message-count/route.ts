import { NextRequest, NextResponse } from 'next/server';
import { getDailyMessageCount, incrementDailyMessageCount } from '@/lib/redis';

// Debug endpoint to test message count functionality
export async function GET(request: NextRequest) {
    const userId = request.nextUrl.searchParams.get('userId') || 'test_user';

    try {
        const currentCount = await getDailyMessageCount(userId);
        return NextResponse.json({
            success: true,
            userId,
            currentCount,
            date: new Date().toISOString().split('T')[0],
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => ({}));
    const userId = body.userId || 'test_user';

    try {
        const newCount = await incrementDailyMessageCount(userId);
        return NextResponse.json({
            success: true,
            userId,
            newCount,
            date: new Date().toISOString().split('T')[0],
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
