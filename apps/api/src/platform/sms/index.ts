import type { FastifyBaseLogger } from 'fastify';
import type { Env } from '../../env.js';
import { consoleSmsDriver } from './console.js';

/**
 * The seam that lets auth be built and tested before DLT registration clears
 * (ADR 0007). Registration takes weeks; the login flow does not have to wait
 * for it, and neither do the tests.
 */
export interface SmsMessage {
  to: string;
  /** The OTP itself. Never logged — see lib/logging.ts. */
  code: string;
  templateId?: string;
}

export interface SmsDriver {
  readonly name: string;
  send(message: SmsMessage, log: FastifyBaseLogger): Promise<void>;
}

export function createSmsDriver(env: Env): SmsDriver {
  switch (env.SMS_PROVIDER) {
    case 'console':
      return consoleSmsDriver;
    default:
      // Reached only if SMS_PROVIDER gains a value before its driver exists.
      // Failing at construction beats discovering it on a user's first login.
      throw new Error(
        `SMS_PROVIDER="${env.SMS_PROVIDER}" has no driver yet. See docs/otp-sms.md.`,
      );
  }
}

export { consoleSmsDriver };
