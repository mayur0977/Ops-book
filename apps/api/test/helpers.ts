import { sql } from 'drizzle-orm';
import { defaultRolePermissions, systemRoleNames } from '@daybook/core';
import type { RoleKey } from '@daybook/contracts';
import { createDatabase, createPool, withTenant } from '../src/db/client.js';
import * as schema from '../src/db/schema/index.js';
import { TEST_DATABASE_URL } from './global-setup.js';

export const pool = createPool(TEST_DATABASE_URL);
export const db = createDatabase(pool);

export interface Fixture {
  businessId: string;
  userId: string;
  memberId: string;
  roleId: string;
}

let counter = 0;
const unique = () => `${Date.now()}-${++counter}-${Math.floor(Math.random() * 1e6)}`;

/**
 * Creates a business with an owner. Runs OUTSIDE withTenant deliberately: at
 * creation time there is no tenant context yet, so this is the one path that
 * legitimately inserts a business row. RLS still applies — hence the explicit
 * set_config below.
 */
export async function createBusiness(
  name: string,
  roleKey: RoleKey = 'owner',
): Promise<Fixture> {
  const suffix = unique();
  const [user] = await db
    .insert(schema.users)
    .values({
      phone: `+9199${suffix.replace(/\D/g, '').slice(-8).padStart(8, '0')}`,
      name: `${name} owner`,
    })
    .returning();

  const businessId = crypto.randomUUID();

  return db.transaction(async (tx) => {
    // A business is created before its own tenant context can exist, so the id
    // is generated here and the context set to it for the inserts that follow.
    await tx.execute(sql`select set_config('app.business_id', ${businessId}, true)`);

    const [business] = await tx
      .insert(schema.businesses)
      .values({
        id: businessId,
        name,
        vertical: 'general',
        joinCode: `JC${suffix.slice(-8)}`,
        createdBy: user!.id,
      })
      .returning();

    const [role] = await tx
      .insert(schema.roles)
      .values({ businessId: business!.id, key: roleKey, name: systemRoleNames[roleKey] })
      .returning();

    await tx.insert(schema.rolePermissions).values(
      defaultRolePermissions[roleKey].map((permissionKey) => ({
        roleId: role!.id,
        permissionKey,
      })),
    );

    const [member] = await tx
      .insert(schema.businessMembers)
      .values({
        businessId: business!.id,
        userId: user!.id,
        roleId: role!.id,
        joinedAt: new Date(),
      })
      .returning();

    return {
      businessId: business!.id,
      userId: user!.id,
      memberId: member!.id,
      roleId: role!.id,
    };
  });
}

export { withTenant, schema, sql };
