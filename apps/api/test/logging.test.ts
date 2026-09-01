import { describe, expect, it } from 'vitest';
import { pino } from 'pino';
import { Writable } from 'node:stream';
import { loggerOptions, REDACTED_PATHS } from '../src/lib/logging.js';
import { loadEnv } from '../src/env.js';

/**
 * An OTP code in a log is a full authentication bypass for anyone who can read
 * logs, and logs are read by more people than the database is. Asserted against
 * real pino output rather than by inspecting the config, because a redaction
 * path that does not match anything looks identical to one that does.
 */
function capture(): { lines: string[]; stream: Writable } {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(String(chunk));
      cb();
    },
  });
  return { lines, stream };
}

const env = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/d',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  JWT_REFRESH_SECRET: 'b'.repeat(48),
} as NodeJS.ProcessEnv);

describe('log redaction', () => {
  it.each([
    ['code', '483920'],
    ['otp', '483920'],
    ['refreshToken', 'rt_secret_value'],
    ['accessToken', 'at_secret_value'],
    ['tokenHash', 'hash_secret_value'],
    ['codeHash', 'hash_secret_value'],
    ['password', 'hunter2'],
    ['secret', 'shhh'],
  ])('scrubs a top-level %s', (field, value) => {
    const { lines, stream } = capture();
    pino({ ...loggerOptions(env), level: 'info' }, stream).info(
      { [field]: value },
      'test',
    );
    expect(lines.join('')).not.toContain(value);
    expect(lines.join('')).toContain('[redacted]');
  });

  it('scrubs a nested code, not just a top-level one', () => {
    const { lines, stream } = capture();
    pino({ ...loggerOptions(env), level: 'info' }, stream).info(
      { otpRequest: { code: '483920', phone: '+919876543210' } },
      'test',
    );
    expect(lines.join('')).not.toContain('483920');
  });

  it('scrubs the authorization header', () => {
    const { lines, stream } = capture();
    pino({ ...loggerOptions(env), level: 'info' }, stream).info(
      { req: { headers: { authorization: 'Bearer super-secret-token' } } },
      'test',
    );
    expect(lines.join('')).not.toContain('super-secret-token');
  });

  it('still logs the surrounding context, so a scrubbed line stays useful', () => {
    const { lines, stream } = capture();
    pino({ ...loggerOptions(env), level: 'info' }, stream).info(
      { code: '483920', outcome: 'expired' },
      'otp verify failed',
    );
    const output = lines.join('');
    expect(output).toContain('otp verify failed');
    expect(output).toContain('expired');
    expect(output).not.toContain('483920');
  });

  it('covers every field the auth tables treat as sensitive', () => {
    for (const path of [
      'code',
      'codeHash',
      'token',
      'tokenHash',
      'accessToken',
      'refreshToken',
    ]) {
      expect(REDACTED_PATHS).toContain(path);
      expect(REDACTED_PATHS).toContain(`*.${path}`);
    }
  });
});
