import { sql } from 'drizzle-orm';
import { integer, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * The columns every tenant-owned table carries (docs/ERD.md). Spelled once so a
 * new table cannot quietly omit `business_id` or `deleted_at` — the two whose
 * absence is a security bug rather than an inconvenience.
 *
 * Not a Drizzle helper by accident: spreading a plain object keeps the inferred
 * types exact, which a wrapper function would blur.
 */
export const tenantColumns = {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: uuid('business_id').notNull(),
  /** Offline idempotency. UNIQUE (business_id, client_uuid) per table. */
  clientUuid: uuid('client_uuid'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  /** Soft delete. Every query filters it. */
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  /** Optimistic concurrency for sync. */
  version: integer('version').notNull().default(1),
};

/** Timestamps for the non-tenant tables, which have no business_id. */
export const globalTimestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};
