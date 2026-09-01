import { describe, expect, it } from 'vitest';
import { permissionKeys } from '@daybook/contracts';
import type { RoleKey } from '@daybook/contracts';
import {
  can,
  canAll,
  canAny,
  canChangeRole,
  canGrantPermission,
  checkOwnerRemains,
  effectivePermissions,
} from './permissions.js';
import type { MemberAuthorization } from './permissions.js';
import { defaultRolePermissions } from './role-defaults.js';

const member = (
  roleKey: RoleKey,
  overrides?: MemberAuthorization['overrides'],
): MemberAuthorization => ({
  roleKey,
  rolePermissions: defaultRolePermissions[roleKey],
  ...(overrides ? { overrides } : {}),
});

describe('resolution order', () => {
  it('falls back to the role when there is no override', () => {
    expect(can(member('manager'), 'orders.write')).toBe(true);
    expect(can(member('manager'), 'orders.delete')).toBe(false);
  });

  it('an explicit false beats a role grant', () => {
    const restricted = member('manager', { 'orders.write': false });
    expect(can(restricted, 'orders.write')).toBe(false);
  });

  it('an explicit true beats a role denial', () => {
    const promoted = member('manager', { 'payments.record': true });
    expect(can(promoted, 'payments.record')).toBe(true);
  });

  it('denies anything neither role nor override mentions', () => {
    expect(can(member('staff'), 'audit.view')).toBe(false);
  });

  it('canAll and canAny agree with can', () => {
    const m = member('manager');
    expect(canAll(m, ['orders.read', 'orders.write'])).toBe(true);
    expect(canAll(m, ['orders.read', 'orders.delete'])).toBe(false);
    expect(canAny(m, ['orders.delete', 'orders.read'])).toBe(true);
    expect(canAny(m, ['orders.delete', 'payments.void'])).toBe(false);
  });

  it('effectivePermissions reflects overrides in both directions', () => {
    const m = member('manager', { 'orders.write': false, 'audit.view': true });
    const effective = effectivePermissions(m);
    expect(effective).not.toContain('orders.write');
    expect(effective).toContain('audit.view');
    expect(effective).toContain('orders.read');
  });
});

describe('default grants match docs/permissions.md', () => {
  it('owner holds every key in the catalogue', () => {
    expect(defaultRolePermissions.owner.toSorted()).toEqual(permissionKeys.toSorted());
  });

  it('staff gets attachments.upload and nothing else by default', () => {
    expect(defaultRolePermissions.staff).toEqual(['attachments.upload']);
  });

  it('grants shrink monotonically owner > partner > manager > staff', () => {
    const order: RoleKey[] = ['owner', 'partner', 'manager', 'staff'];
    for (let i = 1; i < order.length; i++) {
      const wider = new Set(defaultRolePermissions[order[i - 1]!]);
      for (const key of defaultRolePermissions[order[i]!]) {
        expect(wider.has(key)).toBe(true);
      }
    }
  });

  it('every default grant is a real catalogue key', () => {
    const catalogue = new Set<string>(permissionKeys);
    for (const keys of Object.values(defaultRolePermissions)) {
      for (const key of keys) expect(catalogue.has(key)).toBe(true);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe('privilege escalation — the cases docs/permissions.md names', () => {
  it('a manager cannot settle wages', () => {
    expect(can(member('manager'), 'labour.wages.settle')).toBe(false);
  });

  it('a manager cannot amend attendance', () => {
    expect(can(member('manager'), 'labour.attendance.amend')).toBe(false);
  });

  it('staff cannot view the audit log', () => {
    expect(can(member('staff'), 'audit.view')).toBe(false);
  });

  it('a partner cannot change roles, even with an override — invariant 4', () => {
    const partner = member('partner', { 'members.role.change': true });
    expect(can(partner, 'members.role.change')).toBe(true);
    expect(canChangeRole(partner)).toBe(false);
    expect(canChangeRole(member('owner'))).toBe(true);
  });

  it('a member cannot grant a permission they do not hold — invariant 3', () => {
    const manager = member('manager', { 'members.manage': true });
    expect(canGrantPermission(manager, 'payments.void', true)).toBe(false);
    expect(canGrantPermission(manager, 'orders.write', true)).toBe(true);
  });

  it('revoking is not escalation, so it needs only members.manage', () => {
    const manager = member('manager', { 'members.manage': true });
    expect(canGrantPermission(manager, 'payments.void', false)).toBe(true);
  });

  it('without members.manage nothing may be granted or revoked', () => {
    expect(canGrantPermission(member('manager'), 'orders.read', true)).toBe(false);
    expect(canGrantPermission(member('manager'), 'orders.read', false)).toBe(false);
  });
});

describe('the last owner — invariant 2', () => {
  const members = [
    { id: 'a', roleKey: 'owner' as RoleKey, status: 'active' },
    { id: 'b', roleKey: 'manager' as RoleKey, status: 'active' },
  ];

  it('rejects demoting the only owner', () => {
    expect(checkOwnerRemains(members, { memberId: 'a', nextRoleKey: 'manager' })).toBe(
      'demote_last_owner',
    );
  });

  it('rejects revoking the only owner', () => {
    expect(checkOwnerRemains(members, { memberId: 'a', nextStatus: 'revoked' })).toBe(
      'revoke_last_owner',
    );
  });

  it('allows it once a second owner exists', () => {
    const two = [...members, { id: 'c', roleKey: 'owner' as RoleKey, status: 'active' }];
    expect(checkOwnerRemains(two, { memberId: 'a', nextRoleKey: 'manager' })).toBeNull();
  });

  it('does not count a pending owner as cover', () => {
    const pending = [
      ...members,
      { id: 'c', roleKey: 'owner' as RoleKey, status: 'pending' },
    ];
    expect(checkOwnerRemains(pending, { memberId: 'a', nextStatus: 'revoked' })).toBe(
      'revoke_last_owner',
    );
  });

  it('leaves unrelated changes alone', () => {
    expect(
      checkOwnerRemains(members, { memberId: 'b', nextRoleKey: 'staff' }),
    ).toBeNull();
  });
});
