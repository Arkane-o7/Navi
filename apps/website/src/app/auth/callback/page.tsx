'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const description = params.get('description');

    if (error) {
      localStorage.setItem('navi-web-auth-error', description || error);
      router.replace('/');
      return;
    }

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      localStorage.setItem('navi-web-access-token', accessToken);
      localStorage.setItem('navi-web-refresh-token', refreshToken);
    }

    router.replace('/');
  }, [router]);

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#0b1020', color: '#dbe7ff' }}>
      <p>Completing sign in…</p>
    </main>
  );
}
