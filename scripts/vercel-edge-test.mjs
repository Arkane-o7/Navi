const base = 'https://navi-search.vercel.app';

async function test(name, path, opts = {}, expect = []) {
  const url = `${base}${path}`;
  const started = Date.now();
  try {
    const { followRedirect = true, ...fetchOpts } = opts;
    const res = await fetch(url, {
      redirect: followRedirect ? 'follow' : 'manual',
      ...fetchOpts,
    });
    const ms = Date.now() - started;
    const text = await res.text();
    const pass = expect.length === 0 ? true : expect.includes(res.status);

    return {
      name,
      method: opts.method || 'GET',
      path,
      status: res.status,
      expected: expect,
      pass,
      ms,
      location: res.headers.get('location') || undefined,
      cors: res.headers.get('access-control-allow-origin') || undefined,
      contentType: res.headers.get('content-type') || undefined,
      body: text.slice(0, 220).replace(/\s+/g, ' ').trim(),
    };
  } catch (error) {
    return {
      name,
      method: opts.method || 'GET',
      path,
      expected: expect,
      pass: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const tests = [
  ['health ok', '/api/health', {}, [200]],
  ['health options cors', '/api/health', { method: 'OPTIONS' }, [200]],
  ['health invalid method', '/api/health', { method: 'PUT' }, [405]],

  ['user no auth', '/api/user', {}, [401]],
  ['conversations no auth', '/api/conversations', {}, [401]],
  ['conversations create no auth', '/api/conversations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }, [401]],
  ['messages no auth', '/api/messages?conversationId=x', {}, [401]],
  ['messages create no auth', '/api/messages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }, [401]],

  ['chat missing message', '/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }, [400]],
  ['chat invalid json', '/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' }, [400, 500]],

  ['auth login redirect', '/api/auth/login', { followRedirect: false }, [302, 307, 308]],
  ['auth callback missing code', '/api/auth/callback', {}, [400]],
  ['auth refresh missing token', '/api/auth/refresh', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }, [400]],
  ['auth refresh invalid token', '/api/auth/refresh', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: 'invalid.token' }) }, [401]],

  ['sub checkout GET missing userId', '/api/subscription/checkout', { followRedirect: false }, [302, 307, 308]],
  ['sub checkout POST no auth', '/api/subscription/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }, [401]],
  ['sub webhook no signature', '/api/subscription/webhook', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }, [400]],

  ['sub success page', '/api/subscription/success?session_id=fake', {}, [200]],
  ['sub canceled page', '/api/subscription/canceled', {}, [200]],

  ['debug route', '/api/debug', {}, [200]],
  ['debug message-count', '/api/debug/message-count', {}, [200, 503]],
];

const results = [];
for (const [name, path, opts, expected] of tests) {
  // eslint-disable-next-line no-await-in-loop
  results.push(await test(name, path, opts, expected));
}

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({
  base,
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  failedCases: failed,
  results,
}, null, 2));
