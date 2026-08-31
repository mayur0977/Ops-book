import { z } from 'zod';

/**
 * The global permission catalogue. Seeded into `permissions`; the source of
 * truth for the reasoning is docs/permissions.md.
 *
 * Permissions are data, not code — the BRD's responsibility matrix has nine
 * "Configurable" cells, so authorization can never be `if (role === 'owner')`.
 * This array exists so that both apps share one spelling of every key and a
 * typo is a compile error rather than a silent denial.
 */
export const permissionKeys = [
  // Orders
  'orders.read',
  'orders.write',
  'orders.delete',
  'orders.status.change',
  'orders.complete.override',
  // Contacts
  'customers.read',
  'customers.write',
  'suppliers.read',
  'suppliers.write',
  // Money
  'payments.read',
  'payments.record',
  'payments.void',
  'expenses.read',
  'expenses.write',
  'expenses.delete',
  // Stock
  'stock.read',
  'stock.write',
  'stock.adjust',
  // Labour
  'labour.read',
  'labour.workers.write',
  'labour.attendance.mark',
  'labour.attendance.amend',
  'labour.wages.advance',
  'labour.wages.pay',
  'labour.wages.settle',
  // Machinery, tasks, media
  'machinery.read',
  'machinery.write',
  'tasks.read',
  'tasks.write',
  'tasks.assign',
  'attachments.upload',
  'attachments.delete',
  // Reports and administration
  'reports.view',
  'reports.export',
  'members.manage',
  'members.role.change',
  'business.settings',
  'business.configure',
  'audit.view',
] as const;

export const permissionKeySchema = z.enum(permissionKeys);
export type PermissionKey = z.infer<typeof permissionKeySchema>;

/** System role keys seeded into every business at creation. */
export const systemRoleKeys = ['owner', 'partner', 'manager', 'staff'] as const;
export const roleKeySchema = z.enum(systemRoleKeys);
export type RoleKey = z.infer<typeof roleKeySchema>;

/**
 * Tri-state member override. Absent from the map = inherit from the role;
 * `false` = explicitly revoked and beats the role grant.
 */
export const memberPermissionOverrideSchema = z.object({
  permissionKey: permissionKeySchema,
  granted: z.boolean(),
});
export type MemberPermissionOverride = z.infer<typeof memberPermissionOverrideSchema>;

/** What the client is told about its own capabilities after resolving a business. */
export const effectivePermissionsSchema = z.object({
  roleKey: roleKeySchema,
  permissions: z.array(permissionKeySchema),
});
export type EffectivePermissions = z.infer<typeof effectivePermissionsSchema>;
