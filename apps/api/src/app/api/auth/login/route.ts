import { NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUri = searchParams.get('redirect_uri') || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
  const state = searchParams.get('state') || undefined;

  try {
    const authUrl = getAuthorizationUrl(redirectUri, state);

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error('Failed to generate auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}
