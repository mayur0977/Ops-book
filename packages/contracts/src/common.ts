import { z } from 'zod';

export const uuid = () => z.uuid();

/**
 * E.164. India is the launch market but the pattern is not India-specific —
 * see ADR 0007. Stored exactly as validated; the app never displays a
 * differently formatted string than the one it sent.
 */
export const phone = () =>
  z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'Must be an E.164 phone number, e.g. +919876543210');

/**
 * Every offline-creatable row carries the UUID the device generated
 * (docs/sync-contract.md). It is unique per business, so a retry after a dead
 * network cannot create a second row.
 */
export const clientUuid = () => z.uuid();

export const isoDateTime = () => z.iso.datetime({ offset: true });

/** A calendar day in the business's timezone — attendance, not an instant. */
export const isoDate = () => z.iso.date();

export const softDeletableFields = {
  id: uuid(),
  createdAt: isoDateTime(),
  updatedAt: isoDateTime(),
  version: z.number().int().positive(),
};

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });

/**
 * `Idempotency-Key` is accepted by every mutating endpoint, from Phase 1, so
 * that Phase 9 is a sync engine and not a rewrite.
 */
export const idempotencyKey = () => z.string().min(8).max(255);

export const idempotencyHeaderSchema = z.object({
  'idempotency-key': idempotencyKey().optional(),
});
