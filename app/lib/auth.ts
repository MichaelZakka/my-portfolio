/**
 * Lightweight, dependency-free session handling for the admin dashboard and
 * the client portal.
 *
 * Sessions are a signed (HMAC-SHA256) token stored in an httpOnly cookie —
 * no session table needed. Uses Web Crypto (`crypto.subtle`) so this file is
 * safe to import from `proxy.ts` as well as regular Node API routes.
 */

export const ADMIN_SESSION_COOKIE = 'admin_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const PORTAL_SESSION_COOKIE = 'portal_session';
export const PORTAL_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

type SessionPayload = {
  sub: string;
  iat: number;
  exp: number;
};

export type PortalSessionPayload = SessionPayload & {
  aud: 'portal';
  /** User.sessionVersion at sign-in; a mismatch means the session was revoked. */
  ver: number;
};

/**
 * Portal tokens are signed over `portal.<payload>` while admin tokens sign the
 * bare payload. Both use AUTH_SECRET, so this domain separation is what stops a
 * client's cookie from ever verifying as an admin session (and vice versa).
 */
const PORTAL_SIGNING_PREFIX = 'portal.';

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'AUTH_SECRET is not configured. Set a random string of 32+ characters in your environment.'
    );
  }
  return secret;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    '='
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function signToken(payload: object, signingPrefix: string): Promise<string> {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const payloadPart = base64UrlEncode(payloadBytes);

  const key = await getHmacKey(getSecret());
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingPrefix + payloadPart)
  );
  const signaturePart = base64UrlEncode(new Uint8Array(signature));

  return `${payloadPart}.${signaturePart}`;
}

/** Returns the decoded payload if the signature is valid and the token has not expired. */
async function verifyToken(
  token: string | undefined | null,
  signingPrefix: string
): Promise<Record<string, unknown> | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadPart, signaturePart] = parts;

  try {
    const key = await getHmacKey(getSecret());
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(signaturePart) as BufferSource,
      new TextEncoder().encode(signingPrefix + payloadPart)
    );
    if (!isValid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadPart)));
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    if (typeof payload.sub !== 'string') return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function createSessionToken(subject: string): Promise<string> {
  const now = Date.now();
  const payload: SessionPayload = {
    sub: subject,
    iat: now,
    exp: now + SESSION_TTL_SECONDS * 1000,
  };
  return signToken(payload, '');
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  return (await verifyToken(token, '')) as SessionPayload | null;
}

export async function createPortalSessionToken(
  userId: string,
  sessionVersion: number
): Promise<string> {
  const now = Date.now();
  const payload: PortalSessionPayload = {
    sub: userId,
    aud: 'portal',
    ver: sessionVersion,
    iat: now,
    exp: now + PORTAL_SESSION_TTL_SECONDS * 1000,
  };
  return signToken(payload, PORTAL_SIGNING_PREFIX);
}

/**
 * Checks signature, expiry and audience only — enough for the proxy gate.
 * Server code must still load the user (see app/lib/portal/session.ts) so a
 * reset password or removed account takes effect immediately.
 */
export async function verifyPortalSessionToken(
  token: string | undefined | null
): Promise<PortalSessionPayload | null> {
  const payload = await verifyToken(token, PORTAL_SIGNING_PREFIX);
  if (!payload || payload.aud !== 'portal' || typeof payload.ver !== 'number') return null;
  return payload as PortalSessionPayload;
}
