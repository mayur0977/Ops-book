import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import { randomInt } from 'node:crypto';

/**
 * Six digits, argon2id, never stored or logged in the clear (docs/ERD.md).
 *
 * argon2 rather than SHA here — unlike a refresh token, a six-digit code has
 * only a million possibilities, so a fast hash would be trivially reversible
 * from a database leak. The cost is paid once per login attempt.
 */
const OTP_DIGITS = 6;

export function generateOtpCode(): string {
  // randomInt is uniform and CSPRNG-backed; Math.random is neither.
  return String(randomInt(0, 10 ** OTP_DIGITS)).padStart(OTP_DIGITS, '0');
}

export async function hashOtpCode(code: string): Promise<string> {
  return argon2Hash(code);
}

export async function verifyOtpCode(codeHash: string, code: string): Promise<boolean> {
  try {
    return await argon2Verify(codeHash, code);
  } catch {
    // A malformed stored hash must read as "wrong code", never as an error the
    // caller can distinguish — that difference is an oracle.
    return false;
  }
}
