import { relations, sql } from 'drizzle-orm';
import {
  index,
  inet,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { globalTimestamps } from './_shared.js';

/**
 * Auth tables are deliberately NOT tenant-scoped: one human, one row, many
 * businesses (docs/ERD.md). RLS does not apply here, and must not — a user has
 * to be resolvable before any business context exists.
 */

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    /** E.164. Phone is the identity — no email, no password (ADR 0007). */
    phone: text('phone').notNull(),
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
    name: text('name'),
    avatarKey: text('avatar_key'),
    status: text('status').notNull().default('active'), // active | suspended
    ...globalTimestamps,
  },
  (t) => [uniqueIndex('users_phone_key').on(t.phone)],
);

export const otpRequests = pgTable(
  'otp_requests',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    phone: text('phone').notNull(),
    /** argon2id. NEVER the plaintext code. */
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    ip: inet('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // Drives the per-number rate limit; a job prunes rows older than 24h.
  (t) => [index('otp_requests_phone_created_idx').on(t.phone, t.createdAt.desc())],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceName: text('device_name'),
    platform: text('platform'), // ios | android
    appVersion: text('app_version'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

/**
 * `familyId` + `parentId` implement reuse detection: presenting an
 * already-used refresh token revokes the whole family. Two columns, and the
 * single most valuable thing in the auth design.
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    familyId: uuid('family_id').notNull(),
    parentId: uuid('parent_id'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('refresh_tokens_hash_key').on(t.tokenHash),
    index('refresh_tokens_family_idx').on(t.familyId),
    index('refresh_tokens_session_idx').on(t.sessionId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  session: one(sessions, {
    fields: [refreshTokens.sessionId],
    references: [sessions.id],
  }),
}));
