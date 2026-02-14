import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET() {
  const envCheck = {
    hasGroqKey: !!process.env.GROQ_API_KEY,
    hasRedisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
    hasRedisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    hasDbUrl: !!process.env.DATABASE_URL,
    hasWorkosApiKey: !!process.env.WORKOS_API_KEY,
    hasWorkosClientId: !!process.env.WORKOS_CLIENT_ID,
    workosClientIdPrefix: process.env.WORKOS_CLIENT_ID?.substring(0, 10) || 'not_set',
  };

  return NextResponse.json({
    status: 'ok',
    env: envCheck,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    // Test Groq directly with fetch
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: message || 'Say hello' }
        ],
        model: 'llama-3.3-70b-versatile',
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        status: response.status,
        error: errorText,
      }, { status: 500 });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      response: data.choices?.[0]?.message?.content,
    });
  } catch (error) {
    logger.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
