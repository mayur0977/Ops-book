import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { globalTimestamps } from './_shared.js';
import { users } from './auth.js';

export const businesses = pgTable(
  'businesses',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    /**
     * Read exactly once, at creation, to choose the seed pack. Never consulted
     * at runtime (ADR 0004) — hence text, not an enum the core would branch on.
     */
    vertical: text('vertical').notNull(),
    currency: text('currency').notNull().default('INR'),
    timezone: text('timezone').notNull().default('Asia/Kolkata'),
    joinCode: text('join_code').notNull(),
    joinCodeRotatedAt: timestamp('join_code_rotated_at', { withTimezone: true }),
    requiresApproval: boolean('requires_approval').notNull().default(false),
    modulesEnabled: jsonb('modules_enabled').notNull().default({}),
    labelOverrides: jsonb('label_overrides').notNull().default({}),
    logoKey: text('logo_key'),
    createdBy: uuid('created_by').references(() => users.id),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...globalTimestamps,
  },
  (t) => [uniqueIndex('businesses_join_code_key').on(t.joinCode)],
);

/** Per-business, seeded from a template at creation. */
export const roles = pgTable(
  'roles',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    key: text('key').notNull(), // owner | partner | manager | staff
    name: text('name').notNull(),
    isSystem: boolean('is_system').notNull().default(true),
    ...globalTimestamps,
  },
  (t) => [uniqueIndex('roles_business_key_key').on(t.businessId, t.key)],
);

/**
 * The global catalogue, seeded from @daybook/contracts. Not tenant-scoped —
 * the set of things that CAN be permitted is the same everywhere; only the
 * grants differ per business.
 */
export const permissions = pgTable('permissions', {
  key: text('key').primaryKey(),
  description: text('description'),
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionKey: text('permission_key')
      .notNull()
      .references(() => permissions.key, { onDelete: 'cascade' }),
  },
  (t) => [
    uniqueIndex('role_permissions_pk').on(t.roleId, t.permissionKey),
    index('role_permissions_role_idx').on(t.roleId),
  ],
);

export const businessMembers = pgTable(
  'business_members',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    /** Revocation is a status change, never a delete — the audit trail survives. */
    status: text('status').notNull().default('active'), // pending | active | revoked
    invitedBy: uuid('invited_by').references(() => users.id),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...globalTimestamps,
  },
  (t) => [
    uniqueIndex('business_members_business_user_key').on(t.businessId, t.userId),
    index('business_members_user_idx').on(t.userId),
  ],
);

/**
 * Tri-state override. A row's absence means "inherit from the role"; `granted`
 * false explicitly beats the role grant. This is what makes the BRD's nine
 * "Configurable" cells expressible without a code branch.
 */
export const memberPermissions = pgTable(
  'member_permissions',
  {
    memberId: uuid('member_id')
      .notNull()
      .references(() => businessMembers.id, { onDelete: 'cascade' }),
    permissionKey: text('permission_key')
      .notNull()
      .references(() => permissions.key, { onDelete: 'cascade' }),
    granted: boolean('granted').notNull(),
  },
  (t) => [uniqueIndex('member_permissions_pk').on(t.memberId, t.permissionKey)],
);

export const businessesRelations = relations(businesses, ({ many }) => ({
  members: many(businessMembers),
  roles: many(roles),
}));

export const businessMembersRelations = relations(businessMembers, ({ one, many }) => ({
  business: one(businesses, {
    fields: [businessMembers.businessId],
    references: [businesses.id],
  }),
  user: one(users, { fields: [businessMembers.userId], references: [users.id] }),
  role: one(roles, { fields: [businessMembers.roleId], references: [roles.id] }),
  overrides: many(memberPermissions),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  business: one(businesses, { fields: [roles.businessId], references: [businesses.id] }),
  permissions: many(rolePermissions),
}));
