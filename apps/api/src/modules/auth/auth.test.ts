import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { buildApp } from '../../app.js';
import { loadEnv } from '../../env.js';
import { db, pool, schema } from '../../../test/helpers.js';
import { hashRefreshToken } from '../../lib/tokens.js';
import type { App } from '../../app.js';
import type { SmsDriver } from '../../platform/sms/index.js';

/**
 * Auth is exercised end to end through the HTTP surface against real Postgres.
 * The OTP is read from a capturing driver rather than the database, because
 * that is what a real client has to work with too.
 */

const sent: { to: string; code: string }[] = [];
const capturingSms: SmsDriver = {
  name: 'capture',
  async send(message) {
    sent.push({ to: message.to, code: message.code });
  },
};

const BASE_ENV = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  JWT_REFRESH_SECRET: 'b'.repeat(48),
  OTP_RESEND_COOLDOWN_SECONDS: '1',
  // app.inject sends every request from 127.0.0.1, so the per-IP and global
  // guards would throttle the suite itself. They are raised here and asserted
  // individually below, each by an app built with the guard turned down.
  OTP_MAX_PER_IP_PER_HOUR: '10000',
  OTP_GLOBAL_DAILY_CEILING: '10000',
} as NodeJS.ProcessEnv;

let app: App;
let phoneCounter = 0;
// Unique per run: a fixed sequence would collide with users created by an
// earlier run and quietly turn "first login" assertions into false negatives.
const runPrefix = String(Date.now() % 100_000).padStart(5, '0');
const nextPhone = () => `+9198${runPrefix}${String(phoneCounter++).padStart(3, '0')}`;

async function build(overrides: NodeJS.ProcessEnv = {}) {
  const instance = await buildApp(loadEnv({ ...BASE_ENV, ...overrides }), {
    db,
    sms: capturingSms,
  });
  await instance.ready();
  return instance;
}

const lastCode = () => sent.at(-1)!.code;

async function requestCode(instance: App, phone: string, remoteAddress?: string) {
  return instance.inject({
    method: 'POST',
    url: '/auth/otp/request',
    payload: { phone },
    ...(remoteAddress ? { remoteAddress } : {}),
  });
}

async function verifyCode(instance: App, phone: string, code: string) {
  return instance.inject({
    method: 'POST',
    url: '/auth/otp/verify',
    payload: { phone, code },
  });
}

beforeAll(async () => {
  // Rate limits are time-windowed, so rows left by an earlier run would leak
  // into this one and make failures depend on how recently the suite ran.
  await db.delete(schema.otpRequests);
  app = await build();
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

beforeEach(() => {
  sent.length = 0;
});

describe('requesting a code', () => {
  it('issues one and never returns it in the response', async () => {
    const phone = nextPhone();
    const response = await requestCode(app, phone);

    expect(response.statusCode).toBe(200);
    expect(sent).toHaveLength(1);
    expect(response.body).not.toContain(sent[0]!.code);
    expect(response.json()).toMatchObject({ resendAfterSeconds: expect.any(Number) });
  });

  it('stores the code only as a hash', async () => {
    const phone = nextPhone();
    await requestCode(app, phone);
    const code = lastCode();

    const [row] = await db
      .select()
      .from(schema.otpRequests)
      .where(eq(schema.otpRequests.phone, phone));

    expect(row!.codeHash).not.toContain(code);
    expect(row!.codeHash.startsWith('$argon2')).toBe(true);
  });

  it('answers identically for a known and an unknown number', async () => {
    // Otherwise the endpoint enumerates which numbers hold accounts.
    const known = nextPhone();
    await requestCode(app, known);
    await verifyCode(app, known, lastCode());

    const first = await requestCode(app, nextPhone());
    await new Promise((r) => setTimeout(r, 1100));
    const second = await requestCode(app, known);

    expect(first.statusCode).toBe(second.statusCode);
    expect(Object.keys(first.json()).toSorted()).toEqual(
      Object.keys(second.json()).toSorted(),
    );
  });

  it('rejects a non-E.164 number before any SMS is sent', async () => {
    const response = await requestCode(app, '9876543210');
    expect(response.statusCode).toBe(422);
    expect(sent).toHaveLength(0);
  });
});

describe('rate limits', () => {
  it('enforces the resend cooldown and says how long to wait', async () => {
    const phone = nextPhone();
    expect((await requestCode(app, phone)).statusCode).toBe(200);

    const second = await requestCode(app, phone);
    expect(second.statusCode).toBe(429);
    expect(second.json().error.code).toBe('rate_limited');
    expect(second.json().error.retryAfter).toBeGreaterThan(0);
    expect(second.headers['retry-after']).toBeDefined();
    expect(sent).toHaveLength(1); // the blocked request cost nothing
  });

  it('caps the number of codes per number per day', async () => {
    const limited = await build({
      OTP_MAX_PER_NUMBER_PER_DAY: '3',
      OTP_RESEND_COOLDOWN_SECONDS: '1',
    });
    const phone = nextPhone();

    // Sequential by design: each request must observe the rows the previous

    // one wrote, which is exactly what a rate limit is.

    /* eslint-disable no-await-in-loop */

    for (let i = 0; i < 3; i++) {
      expect((await requestCode(limited, phone)).statusCode).toBe(200);
      await new Promise((r) => setTimeout(r, 1100));
    }

    const blocked = await requestCode(limited, phone);
    expect(blocked.statusCode).toBe(429);
    expect(sent).toHaveLength(3);
    await limited.close();
  });

  it('caps requests from one network per hour', async () => {
    const limited = await build({
      OTP_MAX_PER_IP_PER_HOUR: '2',
      OTP_RESEND_COOLDOWN_SECONDS: '1',
      OTP_GLOBAL_DAILY_CEILING: '10000',
    });
    // A source of its own: every other test injects from 127.0.0.1, and their
    // rows would spend this limit before the assertion begins.
    const ip = '203.0.113.7';
    // Different numbers, same source: the per-number limit cannot catch this.
    // Sequential by design: each request must observe the rows the previous
    // one wrote, which is exactly what a rate limit is.
    /* eslint-disable no-await-in-loop */
    for (let i = 0; i < 2; i++) {
      expect((await requestCode(limited, nextPhone(), ip)).statusCode).toBe(200);
    }
    expect((await requestCode(limited, nextPhone(), ip)).statusCode).toBe(429);
    await limited.close();
  });

  it('has a global ceiling that bounds the bill regardless of number or IP', async () => {
    const capped = await build({
      OTP_GLOBAL_DAILY_CEILING: '1',
      OTP_RESEND_COOLDOWN_SECONDS: '1',
    });
    const blocked = await requestCode(capped, nextPhone());

    expect(blocked.statusCode).toBe(429);
    // The message must not reveal that the ceiling is what stopped it.
    expect(blocked.json().error.message).not.toMatch(/ceiling|quota|global/i);
    await capped.close();
  });
});

describe('verifying a code', () => {
  it('issues a session and creates the user on first success', async () => {
    const phone = nextPhone();
    await requestCode(app, phone);
    const response = await verifyCode(app, phone, lastCode());

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.isNewUser).toBe(true);
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, phone));
    expect(user!.phoneVerifiedAt).not.toBeNull();
  });

  it('reports an existing user as not new', async () => {
    const phone = nextPhone();
    await requestCode(app, phone);
    await verifyCode(app, phone, lastCode());

    await new Promise((r) => setTimeout(r, 1100));
    await requestCode(app, phone);
    const again = await verifyCode(app, phone, lastCode());

    expect(again.json().isNewUser).toBe(false);
  });

  it('rejects a wrong code and counts the attempt', async () => {
    const phone = nextPhone();
    await requestCode(app, phone);

    const response = await verifyCode(app, phone, '000000');
    expect(response.statusCode).toBe(401);

    const [row] = await db
      .select()
      .from(schema.otpRequests)
      .where(eq(schema.otpRequests.phone, phone));
    expect(row!.attempts).toBe(1);
  });

  it('stops accepting guesses after the attempt limit', async () => {
    const strict = await build({
      OTP_MAX_ATTEMPTS: '3',
      OTP_RESEND_COOLDOWN_SECONDS: '1',
    });
    const phone = nextPhone();
    await requestCode(strict, phone);
    const correct = lastCode();

    // Sequential by design: each request must observe the rows the previous

    // one wrote, which is exactly what a rate limit is.

    /* eslint-disable no-await-in-loop */

    for (let i = 0; i < 3; i++) {
      expect((await verifyCode(strict, phone, '000000')).statusCode).toBe(401);
    }
    // Even the right code is refused once the budget is spent.
    expect((await verifyCode(strict, phone, correct)).statusCode).toBe(401);
    await strict.close();
  });

  it('refuses an expired code', async () => {
    const shortLived = await build({
      OTP_TTL_SECONDS: '1',
      OTP_RESEND_COOLDOWN_SECONDS: '1',
    });
    const phone = nextPhone();
    await requestCode(shortLived, phone);
    const code = lastCode();

    await new Promise((r) => setTimeout(r, 1200));
    expect((await verifyCode(shortLived, phone, code)).statusCode).toBe(401);
    await shortLived.close();
  });

  it('cannot reuse a code that already produced a session', async () => {
    const phone = nextPhone();
    await requestCode(app, phone);
    const code = lastCode();

    expect((await verifyCode(app, phone, code)).statusCode).toBe(200);
    expect((await verifyCode(app, phone, code)).statusCode).toBe(401);
  });

  it('gives the same error for wrong, expired and never-requested', async () => {
    // Distinguishing them tells an attacker which numbers are in use.
    const unknown = await verifyCode(app, nextPhone(), '123456');
    const phone = nextPhone();
    await requestCode(app, phone);
    const wrong = await verifyCode(app, phone, '000000');

    expect(unknown.statusCode).toBe(wrong.statusCode);
    expect(unknown.json().error.message).toBe(wrong.json().error.message);
  });
});

describe('refresh rotation', () => {
  async function login() {
    const phone = nextPhone();
    await requestCode(app, phone);
    return (await verifyCode(app, phone, lastCode())).json();
  }

  const refresh = (token: string) =>
    app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: token },
    });

  it('rotates to a new pair', async () => {
    const session = await login();
    const response = await refresh(session.refreshToken);

    expect(response.statusCode).toBe(200);
    expect(response.json().refreshToken).not.toBe(session.refreshToken);
  });

  it('detects reuse and revokes the entire family', async () => {
    // The single most valuable property in the auth design, and the reason
    // family_id and parent_id exist (docs/ERD.md).
    const session = await login();
    const rotated = await refresh(session.refreshToken);
    const current = rotated.json().refreshToken;

    const replay = await refresh(session.refreshToken);
    expect(replay.statusCode).toBe(401);
    expect(replay.json().error.code).toBe('token_reused');

    // The token the honest client holds is revoked too — the family is burnt.
    const afterBreach = await refresh(current);
    expect(afterBreach.statusCode).toBe(401);
  });

  it('persists the revocation instead of rolling it back with the error', async () => {
    // Revoking and throwing in one transaction undoes the revocation: the
    // caller gets 401 while every token stays live. This asserts the rows.
    const session = await login();
    await refresh(session.refreshToken);
    await refresh(session.refreshToken); // the replay

    const [replayed] = await db
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.tokenHash, hashRefreshToken(session.refreshToken)))
      .limit(1);
    expect(replayed).toBeDefined();

    const family = await db
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.familyId, replayed!.familyId));

    expect(family.length).toBeGreaterThan(1);
    expect(family.every((t) => t.revokedAt !== null)).toBe(true);

    const [revokedSession] = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, replayed!.sessionId))
      .limit(1);
    expect(revokedSession!.revokedAt).not.toBeNull();
  });

  it('rejects an unknown token without saying why', async () => {
    const response = await refresh('not-a-real-token-at-all');
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('unauthenticated');
  });
});
