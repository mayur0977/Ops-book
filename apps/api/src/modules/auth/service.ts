import { and, count, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { AppError } from '../../lib/errors.js';
import { generateOtpCode, hashOtpCode, verifyOtpCode } from '../../lib/otp.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from '../../lib/tokens.js';
import * as schema from '../../db/schema/index.js';
import type { Database } from '../../db/client.js';
import type { Env } from '../../env.js';
import type { SmsDriver } from '../../platform/sms/index.js';
import type { FastifyBaseLogger } from 'fastify';

export interface AuthDeps {
  db: Database;
  env: Env;
  sms: SmsDriver;
  log: FastifyBaseLogger;
  now?: () => Date;
}

/**
 * One error for every OTP failure path. Distinguishing "no code requested"
 * from "wrong code" from "expired" tells an attacker which numbers are in use
 * and how close they are, so the cases must be indistinguishable.
 */
const rejected = () => new AppError('unauthenticated', 'That code is not valid');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Requests an OTP.
 *
 * Says nothing about whether the number is registered: an unregistered and a
 * registered number produce identical responses, so the endpoint cannot be used
 * to enumerate users. The account is created on first successful verify, not
 * here — otherwise anyone could fill the users table by typing numbers.
 */
export async function requestOtp(
  deps: AuthDeps,
  input: { phone: string; ip?: string },
): Promise<{ expiresAt: Date; resendAfterSeconds: number }> {
  const { db, env } = deps;
  const now = deps.now?.() ?? new Date();

  await assertOtpQuotas(deps, input, now);

  const code = generateOtpCode();
  const codeHash = await hashOtpCode(code);
  const expiresAt = new Date(now.getTime() + env.OTP_TTL_SECONDS * 1000);

  await db.insert(schema.otpRequests).values({
    phone: input.phone,
    codeHash,
    expiresAt,
    ...(input.ip ? { ip: input.ip } : {}),
  });

  await deps.sms.send({ to: input.phone, code }, deps.log);

  return { expiresAt, resendAfterSeconds: env.OTP_RESEND_COOLDOWN_SECONDS };
}

/**
 * The denial-of-wallet guards. Every live SMS costs money, so an unprotected
 * endpoint is someone else's billing decision. Checked in cheapest-first order.
 */
async function assertOtpQuotas(
  deps: AuthDeps,
  input: { phone: string; ip?: string },
  now: Date,
): Promise<void> {
  const { db, env } = deps;

  const [latest] = await db
    .select({ createdAt: schema.otpRequests.createdAt })
    .from(schema.otpRequests)
    .where(eq(schema.otpRequests.phone, input.phone))
    .orderBy(desc(schema.otpRequests.createdAt))
    .limit(1);

  if (latest) {
    const elapsed = (now.getTime() - latest.createdAt.getTime()) / 1000;
    if (elapsed < env.OTP_RESEND_COOLDOWN_SECONDS) {
      const retryAfter = Math.ceil(env.OTP_RESEND_COOLDOWN_SECONDS - elapsed);
      throw new AppError('rate_limited', 'An code was sent recently. Please wait.', {
        retryAfter,
      });
    }
  }

  const since = (ms: number) => new Date(now.getTime() - ms);

  const [perNumber] = await db
    .select({ n: count() })
    .from(schema.otpRequests)
    .where(
      and(
        eq(schema.otpRequests.phone, input.phone),
        gt(schema.otpRequests.createdAt, since(DAY)),
      ),
    );
  if ((perNumber?.n ?? 0) >= env.OTP_MAX_PER_NUMBER_PER_DAY) {
    throw new AppError('rate_limited', 'Too many codes requested for this number today', {
      retryAfter: 3600,
    });
  }

  if (input.ip) {
    const [perIp] = await db
      .select({ n: count() })
      .from(schema.otpRequests)
      .where(
        and(
          sql`${schema.otpRequests.ip} = ${input.ip}::inet`,
          gt(schema.otpRequests.createdAt, since(HOUR)),
        ),
      );
    if ((perIp?.n ?? 0) >= env.OTP_MAX_PER_IP_PER_HOUR) {
      throw new AppError('rate_limited', 'Too many codes requested from this network', {
        retryAfter: 3600,
      });
    }
  }

  // The backstop. Per-number and per-IP limits are evadable with enough
  // numbers and enough addresses; this one bounds the total bill.
  const [global] = await db
    .select({ n: count() })
    .from(schema.otpRequests)
    .where(gt(schema.otpRequests.createdAt, since(DAY)));
  if ((global?.n ?? 0) >= env.OTP_GLOBAL_DAILY_CEILING) {
    deps.log.error(
      { ceiling: env.OTP_GLOBAL_DAILY_CEILING },
      'global OTP ceiling reached',
    );
    throw new AppError('rate_limited', 'Service is temporarily unavailable', {
      retryAfter: 3600,
    });
  }
}

export interface VerifiedSession {
  userId: string;
  sessionId: string;
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  isNewUser: boolean;
}

/**
 * Verifies a code and issues a session, creating the user on first success.
 *
 * Every failure path returns the same error. Distinguishing "no code was
 * requested" from "wrong code" from "expired" would tell an attacker which
 * numbers are in use and how close they are.
 */
export async function verifyOtp(
  deps: AuthDeps,
  input: {
    phone: string;
    code: string;
    device?: {
      name?: string | undefined;
      platform: 'ios' | 'android';
      appVersion: string;
    };
  },
): Promise<VerifiedSession> {
  const { db, env } = deps;
  const now = deps.now?.() ?? new Date();
  const [pending] = await db
    .select()
    .from(schema.otpRequests)
    .where(
      and(
        eq(schema.otpRequests.phone, input.phone),
        isNull(schema.otpRequests.consumedAt),
      ),
    )
    .orderBy(desc(schema.otpRequests.createdAt))
    .limit(1);

  if (!pending) throw rejected();
  if (pending.expiresAt.getTime() <= now.getTime()) throw rejected();
  if (pending.attempts >= env.OTP_MAX_ATTEMPTS) throw rejected();

  const ok = await verifyOtpCode(pending.codeHash, input.code);
  if (!ok) {
    // Counted before the response is sent, so a burst of parallel guesses
    // cannot outrun the increment.
    await db
      .update(schema.otpRequests)
      .set({ attempts: pending.attempts + 1 })
      .where(eq(schema.otpRequests.id, pending.id));
    throw rejected();
  }

  return db.transaction(async (tx) => {
    // Consumed inside the same transaction that issues the session, so a code
    // cannot mint two sessions if two requests arrive together.
    const consumed = await tx
      .update(schema.otpRequests)
      .set({ consumedAt: now })
      .where(
        and(eq(schema.otpRequests.id, pending.id), isNull(schema.otpRequests.consumedAt)),
      )
      .returning();
    if (consumed.length === 0) throw rejected();

    const [existing] = await tx
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, input.phone))
      .limit(1);

    const user =
      existing ??
      (
        await tx
          .insert(schema.users)
          .values({ phone: input.phone, phoneVerifiedAt: now })
          .returning()
      )[0]!;

    if (existing && !existing.phoneVerifiedAt) {
      await tx
        .update(schema.users)
        .set({ phoneVerifiedAt: now })
        .where(eq(schema.users.id, user.id));
    }

    const [session] = await tx
      .insert(schema.sessions)
      .values({
        userId: user.id,
        ...(input.device?.name ? { deviceName: input.device.name } : {}),
        ...(input.device
          ? { platform: input.device.platform, appVersion: input.device.appVersion }
          : {}),
        lastSeenAt: now,
      })
      .returning();

    const issued = await issueRefreshToken(tx, env, session!.id, null, now);
    const access = await signAccessToken(env, { sub: user.id, sid: session!.id }, now);

    return {
      userId: user.id,
      sessionId: session!.id,
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken: issued.token,
      refreshTokenExpiresAt: issued.expiresAt,
      isNewUser: !existing,
    };
  });
}

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

async function issueRefreshToken(
  tx: Tx,
  env: Env,
  sessionId: string,
  parent: { id: string; familyId: string } | null,
  now: Date,
): Promise<{ token: string; expiresAt: Date }> {
  const { token, hash } = generateRefreshToken();
  const expiresAt = new Date(now.getTime() + env.REFRESH_TOKEN_TTL_SECONDS * 1000);

  await tx.insert(schema.refreshTokens).values({
    sessionId,
    tokenHash: hash,
    familyId: parent?.familyId ?? crypto.randomUUID(),
    ...(parent ? { parentId: parent.id } : {}),
    expiresAt,
  });

  return { token, expiresAt };
}

/**
 * Rotates a refresh token, with reuse detection.
 *
 * Presenting an already-used token means either a replay or a stolen token that
 * the real client has since rotated past. Either way the family is compromised,
 * so the whole family and its session are revoked rather than just refusing
 * this one request. Two columns — family_id and parent_id — buy that.
 */
export async function rotateRefreshToken(
  deps: AuthDeps,
  presented: string,
): Promise<{
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}> {
  const { db, env } = deps;
  const now = deps.now?.() ?? new Date();
  const hash = hashRefreshToken(presented);

  /**
   * Reuse is detected inside the transaction but revoked outside it.
   *
   * Revoking and then throwing in the same transaction rolls the revocation
   * back with the error: the caller sees 401 while every token in the family
   * stays live, which is the worst of both — it looks handled and is not. The
   * revocation therefore gets a transaction of its own that commits.
   */
  const reuse = await db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.tokenHash, hash))
      .limit(1);

    if (!record) return null;
    if (record.usedAt !== null || record.revokedAt !== null) {
      return { familyId: record.familyId, sessionId: record.sessionId };
    }
    return undefined;
  });

  if (reuse === null)
    throw new AppError('unauthenticated', 'That session is no longer valid');
  if (reuse !== undefined) {
    await db.transaction((tx) => revokeFamily(tx, reuse.familyId, reuse.sessionId, now));
    deps.log.warn(
      { familyId: reuse.familyId },
      'refresh token reuse detected; family revoked',
    );
    throw new AppError('token_reused', 'This session has been ended for your security');
  }

  return db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.tokenHash, hash))
      .limit(1);

    if (!record) throw new AppError('unauthenticated', 'That session is no longer valid');

    if (record.expiresAt.getTime() <= now.getTime()) {
      throw new AppError('token_expired', 'That session has expired');
    }

    const [session] = await tx
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, record.sessionId))
      .limit(1);
    if (!session || session.revokedAt !== null) {
      throw new AppError('unauthenticated', 'That session is no longer valid');
    }

    await tx
      .update(schema.refreshTokens)
      .set({ usedAt: now })
      .where(eq(schema.refreshTokens.id, record.id));

    await tx
      .update(schema.sessions)
      .set({ lastSeenAt: now })
      .where(eq(schema.sessions.id, session.id));

    const issued = await issueRefreshToken(
      tx,
      env,
      session.id,
      { id: record.id, familyId: record.familyId },
      now,
    );
    const access = await signAccessToken(
      env,
      { sub: session.userId, sid: session.id },
      now,
    );

    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken: issued.token,
      refreshTokenExpiresAt: issued.expiresAt,
    };
  });
}

async function revokeFamily(
  tx: Tx,
  familyId: string,
  sessionId: string,
  now: Date,
): Promise<void> {
  await tx
    .update(schema.refreshTokens)
    .set({ revokedAt: now })
    .where(
      and(
        eq(schema.refreshTokens.familyId, familyId),
        isNull(schema.refreshTokens.revokedAt),
      ),
    );
  await tx
    .update(schema.sessions)
    .set({ revokedAt: now })
    .where(eq(schema.sessions.id, sessionId));
}

/** Sign-out. Revoking the session invalidates every token in every family. */
export async function revokeSession(deps: AuthDeps, sessionId: string): Promise<void> {
  const now = deps.now?.() ?? new Date();
  await deps.db.transaction(async (tx) => {
    await tx
      .update(schema.sessions)
      .set({ revokedAt: now })
      .where(eq(schema.sessions.id, sessionId));
    await tx
      .update(schema.refreshTokens)
      .set({ revokedAt: now })
      .where(
        and(
          eq(schema.refreshTokens.sessionId, sessionId),
          isNull(schema.refreshTokens.revokedAt),
        ),
      );
  });
}
