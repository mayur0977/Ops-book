import type { PermissionKey, RoleKey } from '@daybook/contracts';

/**
 * Default grants per system role — the `✓` column of the matrix in
 * docs/permissions.md, transcribed. A `◐` cell (off by default, an owner may
 * grant it per member) is deliberately absent here: it is expressed as a
 * `member_permissions` override, not as a role default.
 *
 * These seed `role_permissions` when a business is created. Editing this table
 * changes new businesses only — existing grants are data and stay as they are.
 */

const OWNER: readonly PermissionKey[] = [
  'orders.read',
  'orders.write',
  'orders.delete',
  'orders.status.change',
  'orders.complete.override',
  'customers.read',
  'customers.write',
  'suppliers.read',
  'suppliers.write',
  'payments.read',
  'payments.record',
  'payments.void',
  'expenses.read',
  'expenses.write',
  'expenses.delete',
  'stock.read',
  'stock.write',
  'stock.adjust',
  'labour.read',
  'labour.workers.write',
  'labour.attendance.mark',
  'labour.attendance.amend',
  'labour.wages.advance',
  'labour.wages.pay',
  'labour.wages.settle',
  'machinery.read',
  'machinery.write',
  'tasks.read',
  'tasks.write',
  'tasks.assign',
  'attachments.upload',
  'attachments.delete',
  'reports.view',
  'reports.export',
  'members.manage',
  'members.role.change',
  'business.settings',
  'business.configure',
  'audit.view',
];

// Partner runs the business day to day but does not reshape it: the four
// owner-level keys, member administration and configuration are `◐` or denied.
const PARTNER: readonly PermissionKey[] = [
  'orders.read',
  'orders.write',
  'orders.delete',
  'orders.status.change',
  'customers.read',
  'customers.write',
  'suppliers.read',
  'suppliers.write',
  'payments.read',
  'payments.record',
  'expenses.read',
  'expenses.write',
  'expenses.delete',
  'stock.read',
  'stock.write',
  'stock.adjust',
  'labour.read',
  'labour.workers.write',
  'labour.attendance.mark',
  'labour.wages.advance',
  'labour.wages.pay',
  'machinery.read',
  'machinery.write',
  'tasks.read',
  'tasks.write',
  'tasks.assign',
  'attachments.upload',
  'attachments.delete',
  'reports.view',
  'reports.export',
  'audit.view',
];

// Manager records work but does not move money out or reverse it.
const MANAGER: readonly PermissionKey[] = [
  'orders.read',
  'orders.write',
  'orders.status.change',
  'customers.read',
  'customers.write',
  'suppliers.read',
  'suppliers.write',
  'payments.read',
  'expenses.read',
  'expenses.write',
  'stock.read',
  'stock.write',
  'labour.read',
  'labour.workers.write',
  'labour.attendance.mark',
  'machinery.read',
  'machinery.write',
  'tasks.read',
  'tasks.write',
  'tasks.assign',
  'attachments.upload',
];

// Photographing work in progress is the one thing every role may do without
// asking. Everything else Staff needs is granted per member.
const STAFF: readonly PermissionKey[] = ['attachments.upload'];

export const defaultRolePermissions: Record<RoleKey, readonly PermissionKey[]> = {
  owner: OWNER,
  partner: PARTNER,
  manager: MANAGER,
  staff: STAFF,
};

export const systemRoleNames: Record<RoleKey, string> = {
  owner: 'Owner',
  partner: 'Partner',
  manager: 'Manager',
  staff: 'Staff',
};
