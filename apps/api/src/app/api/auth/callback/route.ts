import { NextResponse } from 'next/server';
import { authenticateWithCode } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    // Redirect to Electron app with error
    const errorUrl = `navi://auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`;
    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    return NextResponse.json(
      { error: 'Missing authorization code' },
      { status: 400 }
    );
  }

  try {
    console.log('[Auth Callback] Exchanging code for tokens...');
    const { user, accessToken, refreshToken } = await authenticateWithCode(code);
    console.log('[Auth Callback] Got user:', user.id, user.email);

    // Upsert user in database
    console.log('[Auth Callback] Upserting user in database...');
    await sql`
      INSERT INTO users (id, email, name, updated_at)
      VALUES (${user.id}, ${user.email}, ${user.firstName || null}, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        updated_at = CURRENT_TIMESTAMP
    `;
    console.log('[Auth Callback] User upserted successfully');

    // Redirect to Electron app with tokens
    // The Electron app registers a custom protocol handler (navi://)
    const successUrl = `navi://auth/callback?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&user_id=${encodeURIComponent(user.id)}&state=${encodeURIComponent(state || '')}`;

    return NextResponse.redirect(successUrl);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[Auth Callback] Authentication failed:', errorMessage);
    console.error('[Auth Callback] Full error:', err);

    // Include more detail in the error redirect
    const errorUrl = `navi://auth/error?error=authentication_failed&description=${encodeURIComponent(errorMessage)}`;
    return NextResponse.redirect(errorUrl);
  }
}
