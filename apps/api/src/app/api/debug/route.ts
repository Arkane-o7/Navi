import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET() {
  const envCheck = {
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
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

    // Test Gemini directly with fetch
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: message || 'Say hello' }],
          }
        ],
        generationConfig: {
          maxOutputTokens: 100,
        },
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
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';

    return NextResponse.json({
      success: true,
      response: text,
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
