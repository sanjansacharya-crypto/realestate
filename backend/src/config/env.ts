import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from backend directory or current working directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed <= 0 || parsed > 65535) {
      throw new Error(`Invalid PORT: ${val}`);
    }
    return parsed;
  }),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine((url) => url.startsWith('postgresql://') || url.startsWith('postgres://'), {
      message: 'DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://',
    })
    .default('postgresql://postgres:postgres@localhost:5432/real_estate_platform?schema=public'),
  DIRECT_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, 'JWT_ACCESS_SECRET must be at least 16 characters long')
    .default('development-super-secret-jwt-access-key-32chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN_DAYS: z
    .string()
    .default('7')
    .transform((val) => {
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw new Error(`Invalid JWT_REFRESH_EXPIRES_IN_DAYS: ${val}`);
      }
      return parsed;
    }),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

// Ensure process.env has the parsed values for Prisma engine
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = parsedEnv.data.DATABASE_URL;
}
if (!process.env.DIRECT_URL && parsedEnv.data.DIRECT_URL) {
  process.env.DIRECT_URL = parsedEnv.data.DIRECT_URL;
} else if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = parsedEnv.data.DATABASE_URL;
}

export const env = parsedEnv.data;
