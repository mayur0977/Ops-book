import { z } from 'zod';
import { isoDateTime, phone, uuid } from './common.js';

export const otpRequestSchema = z.object({
  phone: phone(),
});
export type OtpRequest = z.infer<typeof otpRequestSchema>;

/**
 * Deliberately says nothing about whether the number is registered — an
 * unregistered number and a registered one return the same shape, so the
 * endpoint cannot be used to enumerate users.
 */
export const otpRequestResponseSchema = z.object({
  expiresAt: isoDateTime(),
  resendAfterSeconds: z.number().int().nonnegative(),
});

export const otpVerifySchema = z.object({
  phone: phone(),
  code: z.string().regex(/^\d{6}$/, 'Must be a 6-digit code'),
  device: z
    .object({
      name: z.string().max(120).optional(),
      platform: z.enum(['ios', 'android']),
      appVersion: z.string().max(40),
    })
    .optional(),
});
export type OtpVerify = z.infer<typeof otpVerifySchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresAt: isoDateTime(),
  refreshTokenExpiresAt: isoDateTime(),
});
export type TokenPair = z.infer<typeof tokenPairSchema>;

export const userSchema = z.object({
  id: uuid(),
  phone: phone(),
  name: z.string().nullable(),
  avatarKey: z.string().nullable(),
});
export type User = z.infer<typeof userSchema>;

/** A business the signed-in user belongs to, as shown in the switcher. */
export const membershipSummarySchema = z.object({
  businessId: uuid(),
  businessName: z.string(),
  roleKey: z.string(),
  status: z.enum(['pending', 'active', 'revoked']),
});

export const sessionResponseSchema = z.object({
  user: userSchema,
  tokens: tokenPairSchema,
  memberships: z.array(membershipSummarySchema),
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
