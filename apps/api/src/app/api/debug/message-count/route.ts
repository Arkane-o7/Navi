import { NextRequest, NextResponse } from 'next/server';
import { getDailyMessageCount, incrementDailyMessageCount } from '@/lib/redis';
import { logger } from '@/lib/logger';

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Unknown error';
}

function isRedisDependencyError(message: string): boolean {
    return message.toLowerCase().includes('upstash redis environment variables are not set')
        || message.toLowerCase().includes('fetch failed');
}

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
        const errorMessage = toErrorMessage(error);
        const dependencyUnavailable = isRedisDependencyError(errorMessage);
        logger.error('[Debug Message Count] GET failed:', error);

        return NextResponse.json({
            success: false,
            error: errorMessage,
            code: dependencyUnavailable ? 'DEPENDENCY_UNAVAILABLE' : 'INTERNAL_ERROR',
            hint: dependencyUnavailable
                ? 'Check Upstash Redis credentials/network. Required: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'
                : undefined,
        }, { status: dependencyUnavailable ? 503 : 500 });
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
        const errorMessage = toErrorMessage(error);
        const dependencyUnavailable = isRedisDependencyError(errorMessage);
        logger.error('[Debug Message Count] POST failed:', error);

        return NextResponse.json({
            success: false,
            error: errorMessage,
            code: dependencyUnavailable ? 'DEPENDENCY_UNAVAILABLE' : 'INTERNAL_ERROR',
            hint: dependencyUnavailable
                ? 'Check Upstash Redis credentials/network. Required: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'
                : undefined,
        }, { status: dependencyUnavailable ? 503 : 500 });
    }
}
