import { PrismaClient } from '@prisma/client';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

/**
 * In test and development environments we use the DIRECT_URL (port 5432)
 * rather than the pgBouncer pooler (port 6543) because:
 *  - pgBouncer in transaction mode can time out under sequential test load
 *  - Prisma migrations and constraint tests require a stable session connection
 *
 * In production the pooled DATABASE_URL is used automatically via the schema.
 */
function createPrismaClient(): PrismaClient {
  const datasourceUrl =
    (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') && env.DIRECT_URL
      ? env.DIRECT_URL
      : undefined; // undefined = fall back to schema env(DATABASE_URL)

  return new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
  });
}

export const prisma = globalThis.prismaGlobal ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export interface DatabaseHealthStatus {
  connected: boolean;
  error?: string;
  latencyMs?: number;
}

/**
 * Performs a lightweight health check against the PostgreSQL database.
 * Internal error details and credentials are safe and suppressed from API clients.
 */
export async function checkDatabaseConnection(): Promise<DatabaseHealthStatus> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return { connected: true, latencyMs };
  } catch (_error) {
    // Never expose database credentials, host, or query errors to clients
    return {
      connected: false,
      error: 'Database connection failed or unreachable',
    };
  }
}
