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
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  SMS_PROVIDER: z.enum(['console', 'msg91', 'gupshup', 'firebase']).default('console'),

  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900), // 15m
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(2_592_000), // 30d

  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

  /**
   * Denial-of-wallet guards. An unprotected OTP endpoint bills you for every
   * request someone scripts, so these are required before any live provider is
   * enabled — not tuning knobs to add later.
   */
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),
  OTP_MAX_PER_NUMBER_PER_DAY: z.coerce.number().int().positive().default(10),
  OTP_MAX_PER_IP_PER_HOUR: z.coerce.number().int().positive().default(20),
  OTP_GLOBAL_DAILY_CEILING: z.coerce.number().int().positive().default(2000),
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
