import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function appendParam(url: string, key: string, value: string): string {
  if (url.includes(`${key}=`)) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${key}=${value}`;
}

/**
 * Normalise Supabase Postgres URLs for Prisma.
 *
 * - Session pooler (port 5432): preferred for Next.js / Prisma
 * - Transaction pooler (port 6543): only for serverless with PRISMA_USE_TRANSACTION_POOLER=1
 *
 * Override pool size with PRISMA_CONNECTION_LIMIT (default 10 on session pooler).
 */
function resolveDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;

  let resolved = url;
  const isSupabasePooler = resolved.includes('pooler.supabase.com');
  const forceTransactionPooler = process.env.PRISMA_USE_TRANSACTION_POOLER === '1';
  const isTransactionPooler = isSupabasePooler && resolved.includes(':6543');

  // Prisma + Next.js need concurrent connections. Auto-rewrite transaction → session
  // unless the caller explicitly opts into transaction mode.
  if (isTransactionPooler && !forceTransactionPooler) {
    resolved = resolved.replace(':6543/', ':5432/');
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[@eveider/data-access] Rewrote DATABASE_URL :6543 → :5432 (session pooler). ' +
          'Set PRISMA_USE_TRANSACTION_POOLER=1 to keep transaction mode.',
      );
    }
  }

  const stillTransactionPooler = isSupabasePooler && resolved.includes(':6543');

  if (stillTransactionPooler) {
    resolved = appendParam(resolved, 'pgbouncer', 'true');
    resolved = appendParam(resolved, 'connection_limit', '1');
  } else if (isSupabasePooler) {
    const limit = process.env.PRISMA_CONNECTION_LIMIT ?? '10';
    resolved = appendParam(resolved, 'connection_limit', limit);
  }

  resolved = appendParam(resolved, 'pool_timeout', '20');
  resolved = appendParam(resolved, 'connect_timeout', '10');

  return resolved;
}

const databaseUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
