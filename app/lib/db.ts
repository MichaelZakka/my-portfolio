import { PrismaClient } from '@prisma/client';

/**
 * Server-only Prisma singleton. Never import this from client components —
 * it holds a live DB connection and, on serverless, must be reused across
 * hot-reloads in dev to avoid exhausting connections.
 */
declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Prisma's defaults (wait 2 s for a connection, 5 s per transaction) are too
    // tight when every query crosses a slow link: local dev talks to the Paris
    // database from far away, and multi-step transactions (sending a proposal,
    // accepting one) timed out halfway. Production next to the database is far
    // under these limits; they only stop a genuinely stuck transaction.
    transactionOptions: { maxWait: 10_000, timeout: 30_000 },
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
