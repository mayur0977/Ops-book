import { sql } from 'drizzle-orm';
import { index, inet, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Append-only. No `updated_at`, no `deleted_at` — the row never changes. The
 * application role is granted INSERT and SELECT only; UPDATE and DELETE are
 * not granted at all, and a trigger refuses them even to a role that has them
 * (see the migration). Written inside the same transaction as the change it
 * describes, which is what makes it trustworthy.
 *
 * `businessId` is nullable: login and user creation are global events with no
 * business context yet.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    businessId: uuid('business_id'),
    actorId: uuid('actor_id'),
    action: text('action').notNull(), // e.g. 'payment.record'
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    requestId: text('request_id'),
    ip: inet('ip'),
    appVersion: text('app_version'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_business_created_idx').on(t.businessId, t.createdAt.desc()),
    index('audit_logs_entity_idx').on(t.businessId, t.entityType, t.entityId),
  ],
);
