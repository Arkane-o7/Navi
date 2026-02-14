import { NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Robust handling for env vars that might contain garbage (common copy-paste errors)
  let baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://navi-search.vercel.app').trim();
  // Strip "NEXT_PUBLIC_APP_URL=" if it was accidentally pasted into the value
  if (baseUrl.includes('NEXT_PUBLIC_APP_URL=')) {
    baseUrl = baseUrl.replace('NEXT_PUBLIC_APP_URL=', '').trim();
  }

  const redirectUri = searchParams.get('redirect_uri') || `${baseUrl}/api/auth/callback`;
  const state = searchParams.get('state') || undefined;

  try {
    const authUrl = getAuthorizationUrl(redirectUri, state);

    // Redirect to WorkOS auth page
    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error('Failed to generate auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}
