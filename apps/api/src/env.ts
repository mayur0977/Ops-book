/**
 * Environment is validated once, at boot, and the process exits if anything
 * required is missing. A missing JWT secret must be a startup failure, never a
 * 500 discovered by the first user to log in.
 *
 * This file is the ONLY place in the API that reads process.env.
 */
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  SMS_PROVIDER: z.enum(['console', 'msg91', 'gupshup', 'firebase']).default('console'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment:\n${details}`);
  }

  // Refusing this in production is worth more than the convenience it costs:
  // "console" prints OTP codes to the log, which is a full auth bypass.
  if (parsed.data.NODE_ENV === 'production' && parsed.data.SMS_PROVIDER === 'console') {
    throw new Error('SMS_PROVIDER=console is not permitted when NODE_ENV=production');
  }

  return parsed.data;
}
