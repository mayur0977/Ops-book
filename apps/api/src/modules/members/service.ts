import { and, eq } from 'drizzle-orm';
import { canChangeRole, canGrantPermission, checkOwnerRemains } from '@daybook/core';
import type { MemberAuthorization } from '@daybook/core';
import type { PermissionKey, RoleKey } from '@daybook/contracts';
import { AppError, conflict, forbidden, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { withTenant } from '../../db/client.js';
import * as schema from '../../db/schema/index.js';
import type { Database, TenantDatabase } from '../../db/client.js';

export interface MemberDeps {
  db: Database;
  now?: () => Date;
}

export interface MemberActor {
  userId: string;
  businessId: string;
  memberId: string;
  permissions: MemberAuthorization;
  requestId?: string | undefined;
  ip?: string | undefined;
}

export async function listMembers(deps: MemberDeps, actor: MemberActor) {
  return withTenant(
    deps.db,
    actor.businessId,
    async (tx) =>
      tx
        .select({
          id: schema.businessMembers.id,
          userId: schema.businessMembers.userId,
          name: schema.users.name,
          roleKey: schema.roles.key,
          status: schema.businessMembers.status,
          joinedAt: schema.businessMembers.joinedAt,
        })
        .from(schema.businessMembers)
        .innerJoin(schema.roles, eq(schema.roles.id, schema.businessMembers.roleId))
        .innerJoin(schema.users, eq(schema.users.id, schema.businessMembers.userId))
        .where(eq(schema.businessMembers.businessId, actor.businessId)),
    actor.userId,
  );
}

/**
 * The membership rows as the invariants need to see them: role and status only.
 *
 * `roles.key` is `text` in the database, so the cast is where an unrecognised
 * role would surface. Only the four system roles are ever seeded, and a custom
 * role would need its own handling in the matrix before it could get here.
 */
async function membersForInvariant(
  tx: TenantDatabase,
  businessId: string,
): Promise<{ id: string; roleKey: RoleKey; status: string }[]> {
  const rows = await tx
    .select({
      id: schema.businessMembers.id,
      roleKey: schema.roles.key,
      status: schema.businessMembers.status,
    })
    .from(schema.businessMembers)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.businessMembers.roleId))
    .where(eq(schema.businessMembers.businessId, businessId));

  return rows.map((row) => ({ ...row, roleKey: row.roleKey as RoleKey }));
}

/**
 * Changes a member's role.
 *
 * Invariant 4: owner-only and not delegable. `members.role.change` is the key
 * that could manufacture every other permission, so an override granting it to
 * a non-owner is refused rather than honoured — checked in @daybook/core so the
 * app and the server agree on the answer.
 *
 * Invariant 2: a business always keeps at least one active owner.
 */
export async function changeMemberRole(
  deps: MemberDeps,
  actor: MemberActor,
  memberId: string,
  nextRoleKey: RoleKey,
) {
  if (!canChangeRole(actor.permissions)) {
    throw forbidden('Only an owner may change roles');
  }

  return withTenant(
    deps.db,
    actor.businessId,
    async (tx) => {
      const before = await loadMember(tx, actor.businessId, memberId);

      const violation = checkOwnerRemains(
        await membersForInvariant(tx, actor.businessId),
        {
          memberId,
          nextRoleKey,
        },
      );
      if (violation === 'demote_last_owner') {
        throw conflict('A business must always have at least one owner');
      }

      const [role] = await tx
        .select({ id: schema.roles.id })
        .from(schema.roles)
        .where(
          and(
            eq(schema.roles.businessId, actor.businessId),
            eq(schema.roles.key, nextRoleKey),
          ),
        )
        .limit(1);
      if (!role) throw notFound('Role');

      const [updated] = await tx
        .update(schema.businessMembers)
        .set({ roleId: role.id })
        .where(eq(schema.businessMembers.id, memberId))
        .returning();

      await writeAudit(tx, {
        businessId: actor.businessId,
        actorId: actor.userId,
        action: 'member.role_change',
        entityType: 'business_member',
        entityId: memberId,
        before: { roleKey: before.roleKey },
        after: { roleKey: nextRoleKey },
        requestId: actor.requestId ?? null,
        ip: actor.ip ?? null,
      });

      return { ...updated!, roleKey: nextRoleKey };
    },
    actor.userId,
  );
}

/**
 * Sets or clears a per-member permission override.
 *
 * Invariant 3: no self-escalation. A member may only grant a capability they
 * themselves hold, whatever `members.manage` says — otherwise `members.manage`
 * quietly becomes every other permission. Revoking is not escalation, so it
 * needs only `members.manage`.
 */
export async function setMemberPermission(
  deps: MemberDeps,
  actor: MemberActor,
  memberId: string,
  permissionKey: PermissionKey,
  granted: boolean | null,
) {
  if (
    granted !== null &&
    !canGrantPermission(actor.permissions, permissionKey, granted)
  ) {
    throw forbidden(`You cannot grant a permission you do not hold: ${permissionKey}`);
  }
  if (granted === null && !canGrantPermission(actor.permissions, permissionKey, false)) {
    throw forbidden('You may not change permissions');
  }

  return withTenant(
    deps.db,
    actor.businessId,
    async (tx) => {
      await loadMember(tx, actor.businessId, memberId);

      const [before] = await tx
        .select()
        .from(schema.memberPermissions)
        .where(
          and(
            eq(schema.memberPermissions.memberId, memberId),
            eq(schema.memberPermissions.permissionKey, permissionKey),
          ),
        )
        .limit(1);

      if (granted === null) {
        // Clearing the override restores inheritance from the role, which is
        // a different state from an explicit `false`.
        await tx
          .delete(schema.memberPermissions)
          .where(
            and(
              eq(schema.memberPermissions.memberId, memberId),
              eq(schema.memberPermissions.permissionKey, permissionKey),
            ),
          );
      } else if (before) {
        await tx
          .update(schema.memberPermissions)
          .set({ granted })
          .where(
            and(
              eq(schema.memberPermissions.memberId, memberId),
              eq(schema.memberPermissions.permissionKey, permissionKey),
            ),
          );
      } else {
        await tx
          .insert(schema.memberPermissions)
          .values({ memberId, permissionKey, granted });
      }

      // Invariant 5: permission changes are audited with before and after.
      await writeAudit(tx, {
        businessId: actor.businessId,
        actorId: actor.userId,
        action: 'member.permission_change',
        entityType: 'member_permission',
        entityId: memberId,
        before: { permissionKey, granted: before ? before.granted : null },
        after: { permissionKey, granted },
        requestId: actor.requestId ?? null,
        ip: actor.ip ?? null,
      });

      return { permissionKey, granted };
    },
    actor.userId,
  );
}

/**
 * Revokes a membership.
 *
 * Never a delete — the audit trail has to survive the person leaving. The
 * effect is immediate rather than eventual because the request preHandler
 * re-reads membership status on every request, so a revoked member is locked
 * out on their very next call rather than when their access token expires.
 */
export async function revokeMember(
  deps: MemberDeps,
  actor: MemberActor,
  memberId: string,
) {
  const now = deps.now?.() ?? new Date();

  return withTenant(
    deps.db,
    actor.businessId,
    async (tx) => {
      const before = await loadMember(tx, actor.businessId, memberId);

      const violation = checkOwnerRemains(
        await membersForInvariant(tx, actor.businessId),
        {
          memberId,
          nextStatus: 'revoked',
        },
      );
      if (violation === 'revoke_last_owner') {
        throw conflict('A business must always have at least one owner');
      }

      const [updated] = await tx
        .update(schema.businessMembers)
        .set({ status: 'revoked', revokedAt: now })
        .where(eq(schema.businessMembers.id, memberId))
        .returning();
      if (!updated) throw notFound('Member');

      await writeAudit(tx, {
        businessId: actor.businessId,
        actorId: actor.userId,
        action: 'member.revoke',
        entityType: 'business_member',
        entityId: memberId,
        before: { status: before.status },
        after: { status: 'revoked' },
        requestId: actor.requestId ?? null,
        ip: actor.ip ?? null,
      });

      return updated;
    },
    actor.userId,
  );
}

async function loadMember(tx: TenantDatabase, businessId: string, memberId: string) {
  const [row] = await tx
    .select({
      id: schema.businessMembers.id,
      userId: schema.businessMembers.userId,
      status: schema.businessMembers.status,
      roleKey: schema.roles.key,
    })
    .from(schema.businessMembers)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.businessMembers.roleId))
    .where(
      and(
        eq(schema.businessMembers.id, memberId),
        eq(schema.businessMembers.businessId, businessId),
      ),
    )
    .limit(1);

  // RLS already scopes this to the tenant; the explicit 404 is what turns a
  // cross-tenant id into "not found" rather than an unhandled undefined.
  if (!row) throw notFound('Member');
  return row;
}

export { AppError };
