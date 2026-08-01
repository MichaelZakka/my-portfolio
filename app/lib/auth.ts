/**
 * Lightweight, dependency-free admin session handling.
 *
 * Sessions are a signed (HMAC-SHA256) token stored in an httpOnly cookie —
 * no session table needed for a single-admin site. Uses Web Crypto
 * (`crypto.subtle`) so this file is safe to import from `middleware.ts`
 * (Edge runtime) as well as regular Node API routes.
 */

export const ADMIN_SESSION_COOKIE = 'admin_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

type SessionPayload = {
  sub: string;
  iat: number;
  exp: number;
};

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

export async function createSessionToken(subject: string): Promise<string> {
  const now = Date.now();
  const payload: SessionPayload = {
    sub: subject,
    iat: now,
    exp: now + SESSION_TTL_SECONDS * 1000,
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const payloadPart = base64UrlEncode(payloadBytes);

  const key = await getHmacKey(getSecret());
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadPart));
  const signaturePart = base64UrlEncode(new Uint8Array(signature));

  return `${payloadPart}.${signaturePart}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
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
      new TextEncoder().encode(payloadPart)
    );
    if (!isValid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadPart))
    ) as SessionPayload;

    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
