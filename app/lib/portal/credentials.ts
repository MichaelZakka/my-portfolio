import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from './constants';

/**
 * Node-only credential helpers for the client portal. Admin credentials keep
 * using app/lib/password.ts (scrypt, env-based); client passwords use bcrypt.
 */

const BCRYPT_COST = 12;

/** A precomputed hash so unknown emails still pay the bcrypt cost (no timing oracle). */
const DUMMY_HASH = '$2b$12$d.tDsrXAWZiWpySfHPT4N.k7oDvJaygrtgb5Cipd3k3mIuHKBHuIG';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(password, DUMMY_HASH);
    return false;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/** Returns an error key (see messages portal.errors.*) or null when the password is acceptable. */
export function checkPasswordPolicy(password: string): 'passwordTooShort' | 'passwordTooLong' | null {
  if ([...password].length < PASSWORD_MIN_LENGTH) return 'passwordTooShort';
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) return 'passwordTooLong';
  return null;
}

/**
 * Invite and reset tokens: 256 random bits, base64url (43 chars). Only the
 * SHA-256 hex digest is stored, so a database leak does not leak usable links.
 * A fast hash is fine here because the input is high-entropy, unlike passwords.
 */
export function generateToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
