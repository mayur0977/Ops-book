import { z } from 'zod';
import { clientUuid, isoDateTime, uuid } from './common.js';
import { effectivePermissionsSchema, roleKeySchema } from './permissions.js';

/**
 * `vertical` is read exactly once, at creation, to choose the seed pack. It is
 * never consulted at runtime (ADR 0004), which is why the value is a plain
 * string here rather than an enum the core would have to branch on. The set of
 * installed packs lives in @daybook/verticals.
 */
export const createBusinessSchema = z.object({
  clientUuid: clientUuid(),
  name: z.string().trim().min(2).max(120),
  vertical: z.string().trim().min(2).max(40),
  currency: z.string().length(3).default('INR'),
  timezone: z.string().min(3).max(64).default('Asia/Kolkata'),
});
export type CreateBusiness = z.infer<typeof createBusinessSchema>;

export const businessSchema = z.object({
  id: uuid(),
  name: z.string(),
  currency: z.string().length(3),
  timezone: z.string(),
  modulesEnabled: z.record(z.string(), z.boolean()),
  labelOverrides: z.record(z.string(), z.string()),
  logoKey: z.string().nullable(),
  createdAt: isoDateTime(),
  updatedAt: isoDateTime(),
  version: z.number().int().positive(),
});
export type Business = z.infer<typeof businessSchema>;

/** Only an owner ever sees the join code, so it is a separate response. */
export const joinCodeSchema = z.object({
  joinCode: z.string(),
  rotatedAt: isoDateTime().nullable(),
});

export const joinBusinessSchema = z.object({
  joinCode: z.string().trim().min(6).max(16),
});

export const memberSchema = z.object({
  id: uuid(),
  userId: uuid(),
  name: z.string().nullable(),
  roleKey: roleKeySchema,
  status: z.enum(['pending', 'active', 'revoked']),
  joinedAt: isoDateTime().nullable(),
});
export type Member = z.infer<typeof memberSchema>;

export const changeMemberRoleSchema = z.object({
  roleKey: roleKeySchema,
});

/** Session context after a business is selected — drives what the app renders. */
export const businessContextSchema = z.object({
  business: businessSchema,
  membership: memberSchema,
  effective: effectivePermissionsSchema,
});
export type BusinessContext = z.infer<typeof businessContextSchema>;
