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
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
