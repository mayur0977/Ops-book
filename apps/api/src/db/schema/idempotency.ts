import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * A repeat with the same key replays the stored response. A repeat with the
 * same key but a different `requestHash` is a client bug and returns 422 rather
 * than silently doing something unexpected (docs/sync-contract.md).
 *
 * Retained 30 days. This lands in Phase 1, not Phase 9 — the duplicate-payment
 * class of bug is killed before any sync code is written.
 */
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    businessId: uuid('business_id').notNull(),
    key: text('key').notNull(),
    userId: uuid('user_id'),
    endpoint: text('endpoint').notNull(),
    requestHash: text('request_hash').notNull(),
    status: text('status').notNull(), // in_progress | completed
    responseCode: integer('response_code'),
    responseBody: jsonb('response_body'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.businessId, t.key] }),
    index('idempotency_keys_created_idx').on(t.createdAt),
  ],
);
