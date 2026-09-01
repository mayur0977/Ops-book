import type { PermissionKey, RoleKey } from '@daybook/contracts';
import { permissionKeys } from '@daybook/contracts';

/**
 * Permission evaluation. Pure, so the app can grey out a control offline using
 * the same rules the server enforces on receipt. The server is still the
 * authority — an on-device `true` is a hint, never a grant.
 *
 * Resolution order (docs/permissions.md):
 *   1. a member override for the key   → use it, including an explicit `false`
 *   2. otherwise the role's default grant
 *   3. otherwise deny
 */

/** Absent = inherit from role. `false` beats the role grant. */
export type PermissionOverrides = Partial<Record<PermissionKey, boolean>>;

export interface MemberAuthorization {
  roleKey: RoleKey;
  rolePermissions: readonly PermissionKey[];
  overrides?: PermissionOverrides;
}

export function can(member: MemberAuthorization, key: PermissionKey): boolean {
  const override = member.overrides?.[key];
  if (override !== undefined) return override;
  return member.rolePermissions.includes(key);
}

export function canAll(
  member: MemberAuthorization,
  keys: readonly PermissionKey[],
): boolean {
  return keys.every((key) => can(member, key));
}

export function canAny(
  member: MemberAuthorization,
  keys: readonly PermissionKey[],
): boolean {
  return keys.some((key) => can(member, key));
}

/** The flattened set the client is sent, so it never re-implements the order. */
export function effectivePermissions(member: MemberAuthorization): PermissionKey[] {
  return permissionKeys.filter((key) => can(member, key));
}

/**
 * Invariant 3: no self-escalation. A member may only grant a permission they
 * themselves hold, whatever `members.manage` says — otherwise `members.manage`
 * silently becomes every other permission.
 *
 * Revoking is not escalation, so it is checked against `members.manage` alone.
 */
export function canGrantPermission(
  actor: MemberAuthorization,
  key: PermissionKey,
  granted: boolean,
): boolean {
  if (!can(actor, 'members.manage')) return false;
  return granted ? can(actor, key) : true;
}

/**
 * Invariant 4: `members.role.change` is owner-only and not delegable. It is the
 * key that could manufacture any other permission, so an override granting it
 * to a non-owner is refused rather than honoured.
 */
export function canChangeRole(actor: MemberAuthorization): boolean {
  return actor.roleKey === 'owner' && can(actor, 'members.role.change');
}

export type LastOwnerViolation = 'demote_last_owner' | 'revoke_last_owner';

/**
 * Invariant 2: a business always has at least one active owner. Returns the
 * violation rather than throwing, so the caller maps it to its own error shape.
 */
export function checkOwnerRemains(
  members: readonly { id: string; roleKey: RoleKey; status: string }[],
  change: { memberId: string; nextRoleKey?: RoleKey; nextStatus?: string },
): LastOwnerViolation | null {
  const activeOwnersAfter = members.filter((m) => {
    const isTarget = m.id === change.memberId;
    const roleKey = isTarget ? (change.nextRoleKey ?? m.roleKey) : m.roleKey;
    const status = isTarget ? (change.nextStatus ?? m.status) : m.status;
    return roleKey === 'owner' && status === 'active';
  });

  if (activeOwnersAfter.length > 0) return null;
  return change.nextRoleKey !== undefined ? 'demote_last_owner' : 'revoke_last_owner';
}
