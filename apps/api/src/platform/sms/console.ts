import type { FastifyBaseLogger } from 'fastify';
import type { SmsDriver, SmsMessage } from './index.js';

/**
 * Prints the code so a developer can log in without a live SMS provider.
 *
 * This is an authentication bypass for anyone who can read the logs, which is
 * exactly why `loadEnv` refuses SMS_PROVIDER=console when NODE_ENV=production.
 * The bypass is the point in development and unacceptable anywhere else.
 *
 * It writes with `console.warn` rather than the request logger on purpose: the
 * logger redacts `code`, which is correct everywhere except here.
 */
export const consoleSmsDriver: SmsDriver = {
  name: 'console',
  async send(message: SmsMessage, log: FastifyBaseLogger): Promise<void> {
    log.info({ to: message.to, driver: 'console' }, 'OTP dispatched');
    // eslint-disable-next-line no-console
    console.warn(
      `\n  ┌─ DEV OTP ────────────────\n  │  ${message.to}  →  ${message.code}\n  └──────────────────────────\n`,
    );
  },
};
