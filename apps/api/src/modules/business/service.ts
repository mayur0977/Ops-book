import { randomInt } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { defaultRolePermissions, systemRoleNames } from '@daybook/core';
import { systemRoleKeys } from '@daybook/contracts';
import type { RoleKey } from '@daybook/contracts';
import { AppError, conflict, notFound } from '../../lib/errors.js';
import { auditable, writeAudit } from '../../lib/audit.js';
import { withJoinCode, withTenant, withUser } from '../../db/client.js';
import * as schema from '../../db/schema/index.js';
import type { Database, TenantDatabase } from '../../db/client.js';

export interface BusinessDeps {
  db: Database;
  now?: () => Date;
}

export interface ActorContext {
  userId: string;
  requestId?: string | undefined;
  ip?: string | undefined;
}

/**
 * Join codes are shown to people and typed by them, so the alphabet omits the
 * characters that get misread aloud or on a scuffed screen: O/0, I/1/L.
 */
const JOIN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const JOIN_LENGTH = 8;

export function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < JOIN_LENGTH; i++) {
    code += JOIN_ALPHABET[randomInt(0, JOIN_ALPHABET.length)];
  }
  return code;
}

/**
 * Creates a business, seeds its system roles from the permission matrix, and
 * makes the caller its owner — all in one transaction.
 *
 * The seeding is not optional or deferred: a business whose roles failed to
 * seed would be one where nobody can do anything, and it would be created
 * looking fine.
 */
export async function createBusiness(
  deps: BusinessDeps,
  actor: ActorContext,
  input: {
    clientUuid: string;
    name: string;
    vertical: string;
    currency: string;
    timezone: string;
  },
) {
  const now = deps.now?.() ?? new Date();
  // The device's client_uuid IS the business id. A business is its own tenant,
  // so there is no second key to reconcile, and a retry after a dead network
  // collides on the primary key instead of creating a rival business.
  const businessId = input.clientUuid;

  return withTenant(
    deps.db,
    businessId,
    async (tx) => {
      // client_uuid makes an offline retry idempotent: a second attempt with
      // the same value finds the first business instead of creating a rival.
      const existing = await findByClientUuid(tx, actor.userId, input.clientUuid);
      if (existing) return existing;

      const [business] = await tx
        .insert(schema.businesses)
        .values({
          id: businessId,
          name: input.name,
          vertical: input.vertical,
          currency: input.currency,
          timezone: input.timezone,
          joinCode: generateJoinCode(),
          createdBy: actor.userId,
        })
        .returning();

      const roles = await seedSystemRoles(tx, business!.id);
      const ownerRole = roles.owner;

      const [member] = await tx
        .insert(schema.businessMembers)
        .values({
          businessId: business!.id,
          userId: actor.userId,
          roleId: ownerRole,
          status: 'active',
          joinedAt: now,
        })
        .returning();

      await writeAudit(tx, {
        businessId: business!.id,
        actorId: actor.userId,
        action: 'business.create',
        entityType: 'business',
        entityId: business!.id,
        after: auditable(business!),
        requestId: actor.requestId ?? null,
        ip: actor.ip ?? null,
      });

      return { business: business!, memberId: member!.id, roleKey: 'owner' as RoleKey };
    },
    actor.userId,
  );
}

async function findByClientUuid(tx: TenantDatabase, userId: string, clientUuid: string) {
  const [row] = await tx
    .select()
    .from(schema.businesses)
    .where(eq(schema.businesses.id, clientUuid))
    .limit(1);
  if (!row) return null;

  const [member] = await tx
    .select({ id: schema.businessMembers.id, roleId: schema.businessMembers.roleId })
    .from(schema.businessMembers)
    .where(
      and(
        eq(schema.businessMembers.businessId, row.id),
        eq(schema.businessMembers.userId, userId),
      ),
    )
    .limit(1);
  if (!member) return null;

  const [role] = await tx
    .select({ key: schema.roles.key })
    .from(schema.roles)
    .where(eq(schema.roles.id, member.roleId))
    .limit(1);

  return {
    business: row,
    memberId: member.id,
    roleKey: (role?.key ?? 'owner') as RoleKey,
  };
}

/**
 * Seeds the four system roles and their default grants, from the matrix in
 * @daybook/core. One source of truth for what a Manager may do.
 */
async function seedSystemRoles(
  tx: TenantDatabase,
  businessId: string,
): Promise<Record<RoleKey, string>> {
  const inserted = await tx
    .insert(schema.roles)
    .values(
      systemRoleKeys.map((key) => ({
        businessId,
        key,
        name: systemRoleNames[key],
        isSystem: true,
      })),
    )
    .returning();

  const byKey = Object.fromEntries(inserted.map((r) => [r.key, r.id])) as Record<
    RoleKey,
    string
  >;

  const grants = systemRoleKeys.flatMap((key) =>
    defaultRolePermissions[key].map((permissionKey) => ({
      roleId: byKey[key],
      permissionKey,
    })),
  );
  if (grants.length > 0) await tx.insert(schema.rolePermissions).values(grants);

  return byKey;
}

/**
 * The businesses a user belongs to — the switcher's list.
 *
 * Two steps rather than one join, because `roles` is strictly tenant-scoped
 * (migration 0003 widened only business_members and businesses). Joining roles
 * without a tenant set returns nothing, which reads as "you belong to no
 * businesses" — a silent, total failure. The role key is fetched per business,
 * inside that business's own tenant context.
 */
export async function listMemberships(deps: BusinessDeps, userId: string) {
  const rows = await withUser(deps.db, userId, async (tx) =>
    tx
      .select({
        businessId: schema.businesses.id,
        businessName: schema.businesses.name,
        status: schema.businessMembers.status,
        roleId: schema.businessMembers.roleId,
      })
      .from(schema.businessMembers)
      .innerJoin(
        schema.businesses,
        eq(schema.businesses.id, schema.businessMembers.businessId),
      )
      .where(eq(schema.businessMembers.userId, userId)),
  );

  // A person belongs to a handful of businesses, not thousands, so a query per
  // membership is cheaper than widening the roles policy would be to reason about.
  return Promise.all(
    rows.map(async (row) => {
      const roleKey = await withTenant(
        deps.db,
        row.businessId,
        async (tx) => {
          const [role] = await tx
            .select({ key: schema.roles.key })
            .from(schema.roles)
            .where(eq(schema.roles.id, row.roleId))
            .limit(1);
          return role?.key ?? 'staff';
        },
        userId,
      );
      return {
        businessId: row.businessId,
        businessName: row.businessName,
        status: row.status,
        roleKey,
      };
    }),
  );
}

/**
 * Joins by code. The lookup runs without a tenant because the caller has no
 * business context yet — which is precisely why the code is the only thing that
 * grants entry, and why it must be rotatable.
 */
export async function joinByCode(
  deps: BusinessDeps,
  actor: ActorContext,
  joinCode: string,
): Promise<{ businessId: string; status: string }> {
  const now = deps.now?.() ?? new Date();

  // RLS still applies here — the earlier assumption that it did not was wrong,
  // and made every join a 404. withJoinCode sets `app.join_code` so migration
  // 0004's policy exposes exactly the row whose code matches.
  const found = await withJoinCode(deps.db, joinCode, async (tx) =>
    tx
      .select({
        id: schema.businesses.id,
        requiresApproval: schema.businesses.requiresApproval,
      })
      .from(schema.businesses)
      .where(eq(schema.businesses.joinCode, joinCode))
      .limit(1),
  );

  const business = found[0];
  if (!business) throw notFound('Join code');

  return withTenant(
    deps.db,
    business.id,
    async (tx) => {
      const [already] = await tx
        .select()
        .from(schema.businessMembers)
        .where(
          and(
            eq(schema.businessMembers.businessId, business.id),
            eq(schema.businessMembers.userId, actor.userId),
          ),
        )
        .limit(1);

      if (already) {
        if (already.status === 'revoked') throw notFound('Join code');
        return { businessId: business.id, status: already.status };
      }

      const [staffRole] = await tx
        .select({ id: schema.roles.id })
        .from(schema.roles)
        .where(
          and(eq(schema.roles.businessId, business.id), eq(schema.roles.key, 'staff')),
        )
        .limit(1);
      if (!staffRole) throw new AppError('internal_error', 'Business has no staff role');

      const status = business.requiresApproval ? 'pending' : 'active';
      const [member] = await tx
        .insert(schema.businessMembers)
        .values({
          businessId: business.id,
          userId: actor.userId,
          roleId: staffRole.id,
          status,
          ...(status === 'active' ? { joinedAt: now } : {}),
        })
        .returning();

      await writeAudit(tx, {
        businessId: business.id,
        actorId: actor.userId,
        action: 'member.join',
        entityType: 'business_member',
        entityId: member!.id,
        after: auditable(member!),
        requestId: actor.requestId ?? null,
        ip: actor.ip ?? null,
      });

      return { businessId: business.id, status };
    },
    actor.userId,
  );
}

/** Rotating the code is how a business revokes access it handed out. */
export async function regenerateJoinCode(
  deps: BusinessDeps,
  actor: ActorContext,
  businessId: string,
): Promise<{ joinCode: string; rotatedAt: Date }> {
  const now = deps.now?.() ?? new Date();

  return withTenant(
    deps.db,
    businessId,
    async (tx) => {
      const joinCode = generateJoinCode();
      const [updated] = await tx
        .update(schema.businesses)
        .set({ joinCode, joinCodeRotatedAt: now })
        .where(eq(schema.businesses.id, businessId))
        .returning();
      if (!updated) throw notFound('Business');

      await writeAudit(tx, {
        businessId,
        actorId: actor.userId,
        action: 'business.join_code.rotate',
        entityType: 'business',
        entityId: businessId,
        // The code itself is never audited — see auditable().
        after: { rotatedAt: now.toISOString() },
        requestId: actor.requestId ?? null,
        ip: actor.ip ?? null,
      });

      return { joinCode, rotatedAt: now };
    },
    actor.userId,
  );
}

export async function getBusiness(
  deps: BusinessDeps,
  actor: ActorContext,
  businessId: string,
) {
  return withTenant(
    deps.db,
    businessId,
    async (tx) => {
      const [row] = await tx
        .select()
        .from(schema.businesses)
        .where(eq(schema.businesses.id, businessId))
        .limit(1);
      if (!row) throw notFound('Business');
      return row;
    },
    actor.userId,
  );
}

export { conflict };
