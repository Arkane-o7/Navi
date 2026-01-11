import { WorkOS } from '@workos-inc/node';

// Lazy initialization to avoid build-time errors
let _workos: WorkOS | null = null;

function getWorkOS(): WorkOS {
  if (!_workos) {
    if (!process.env.WORKOS_API_KEY) {
      throw new Error('WORKOS_API_KEY is not set');
    }
    // Clean key in case of accidental whitespace/newlines
    _workos = new WorkOS(process.env.WORKOS_API_KEY.trim());
  }
  return _workos;
}

export const workos = new Proxy({} as WorkOS, {
  get: (_target, prop) => {
    const instance = getWorkOS();
    const value = (instance as unknown as Record<string, unknown>)[prop as string];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export function getWorkOSClientId(): string {
  if (!process.env.WORKOS_CLIENT_ID) {
    throw new Error('WORKOS_CLIENT_ID is not set');
  }
  // Clean client ID in case of accidental whitespace/newlines
  return process.env.WORKOS_CLIENT_ID.trim();
}

export const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID?.trim() || '';

// Get authorization URL for email/password auth
export function getAuthorizationUrl(redirectUri: string, state?: string) {
  return workos.userManagement.getAuthorizationUrl({
    clientId: getWorkOSClientId(),
    redirectUri,
    provider: 'authkit',
    state,
  });
}

// Exchange code for user and tokens
export async function authenticateWithCode(code: string) {
  const response = await workos.userManagement.authenticateWithCode({
    clientId: getWorkOSClientId(),
    code,
  });

  return {
    user: response.user,
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  };
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string) {
  const response = await workos.userManagement.authenticateWithRefreshToken({
    clientId: getWorkOSClientId(),
    refreshToken,
  });

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  };
}

// Verify JWT token (basic decode - in production use proper JWKS verification)
export async function verifyToken(accessToken: string) {
  try {
    // Decode the JWT payload without full verification
    // In production, you'd verify with JWKS from workos.userManagement.getJwksUrl()
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64').toString()
    );
    const userId = payload.sub;

    return { userId, valid: true };
  } catch {
    return { userId: null, valid: false };
  }
}

// Get user by ID
export async function getUser(userId: string) {
  return workos.userManagement.getUser(userId);
}

// Extract user ID from Authorization header
export function getUserIdFromHeader(request: Request): string | null {
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
