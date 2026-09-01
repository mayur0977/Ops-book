import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { Env } from '../env.js';

/**
 * Access tokens are short-lived JWTs; refresh tokens are opaque random strings
 * stored as hashes. The asymmetry is deliberate — an access token is verified
 * on every request and must not need a database round trip, while a refresh
 * token must be revocable, which a self-contained token cannot be.
 */

export interface AccessTokenClaims {
  sub: string; // user id
  sid: string; // session id
}

const encoder = new TextEncoder();

export async function signAccessToken(
  env: Env,
  claims: AccessTokenClaims,
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(now.getTime() + env.ACCESS_TOKEN_TTL_SECONDS * 1000);
  const token = await new SignJWT({ sid: claims.sid })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt(Math.floor(now.getTime() / 1000))
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .setIssuer('daybook')
    .setAudience('daybook-app')
    .sign(encoder.encode(env.JWT_ACCESS_SECRET));
  return { token, expiresAt };
}

export async function verifyAccessToken(
  env: Env,
  token: string,
): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, encoder.encode(env.JWT_ACCESS_SECRET), {
    issuer: 'daybook',
    audience: 'daybook-app',
  });
  if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
    throw new Error('access token is missing sub or sid');
  }
  return { sub: payload.sub, sid: payload.sid };
}

/**
 * 256 bits of entropy, opaque to the client. Stored only as a SHA-256 hash so
 * a database leak does not hand over live sessions.
 *
 * SHA-256 rather than argon2 here: the input is already high-entropy random,
 * so there is nothing to brute-force, and refresh happens often enough that a
 * deliberately slow hash would be felt.
 */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Compares hex digests without leaking their contents through timing. */
export function refreshTokenMatches(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}
