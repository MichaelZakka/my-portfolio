#!/usr/bin/env node
/**
 * Generates an ADMIN_PASSWORD_HASH value for .env.local.
 *
 * Usage:
 *   node scripts/hash-password.mjs "your-strong-password"
 */
import { randomBytes, scryptSync } from 'crypto';

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/hash-password.mjs "your-strong-password"');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const hash = scryptSync(password, salt, 64).toString('hex');

console.log('\nAdd this to your .env.local:\n');
console.log(`ADMIN_PASSWORD_HASH=${salt}:${hash}\n`);
