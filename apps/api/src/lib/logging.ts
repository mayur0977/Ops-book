import type { LoggerOptions } from 'pino';
import type { Env } from '../env.js';

/**
 * Paths scrubbed from every log line.
 *
 * An OTP code in a log is a full authentication bypass for anyone who can read
 * logs, and log aggregators are read by more people than the database is. Same
 * for tokens: a leaked refresh token is a session someone else owns.
 *
 * Redaction is declared centrally rather than left to each call site, because
 * the one call site that forgets is the one that matters.
 */
export const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["idempotency-key"]',
  'req.body.code',
  'req.body.otp',
  'req.body.refreshToken',
  'req.body.password',
  'res.headers["set-cookie"]',
  'code',
  'otp',
  'codeHash',
  'token',
  'tokenHash',
  'accessToken',
  'refreshToken',
  'password',
  'secret',
  '*.code',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.codeHash',
  '*.tokenHash',
];

export function loggerOptions(env: Env): LoggerOptions {
  return {
    level: env.LOG_LEVEL,
    redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
    // The phone number is the user's identity here, so it is logged at most as
    // a fingerprint — enough to correlate a rate-limit decision, not enough to
    // reconstruct the number from logs alone.
    serializers: {
      req(request: { method: string; url: string; id: string }) {
        return { method: request.method, url: request.url, id: request.id };
      },
    },
    ...(env.NODE_ENV === 'development'
      ? {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
          },
        }
      : {}),
  };
}
