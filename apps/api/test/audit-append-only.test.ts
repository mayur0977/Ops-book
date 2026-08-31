import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createBusiness, db, pool, schema, sql, withTenant } from './helpers.js';
import type { Fixture } from './helpers.js';

/**
 * Audit rows are evidence. They are written in the same transaction as the
 * change they describe, and they never change afterwards.
 *
 * Guarded twice on purpose: the application role is not granted UPDATE or
 * DELETE, and a trigger refuses both regardless of grants. A lost audit trail
 * cannot be reconstructed, so one guard is not enough.
 */

let business: Fixture;

function pgCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let i = 0; i < 5 && current instanceof Error; i++) {
    const c = current as Error & { code?: string };
    if (typeof c.code === 'string') return c.code;
    current = c.cause;
  }
  return undefined;
}

beforeAll(async () => {
  business = await createBusiness('Audit Test Co');
});

afterAll(async () => {
  await pool.end();
});

async function writeAuditRow() {
  return withTenant(db, business.businessId, async (tx) => {
    const [row] = await tx
      .insert(schema.auditLogs)
      .values({
        businessId: business.businessId,
        actorId: business.userId,
        action: 'member.role_change',
        entityType: 'business_member',
        entityId: business.memberId,
        before: { roleKey: 'manager' },
        after: { roleKey: 'partner' },
      })
      .returning();
    return row!;
  });
}

describe('writing', () => {
  it('records before and after', async () => {
    const row = await writeAuditRow();
    expect(row.before).toEqual({ roleKey: 'manager' });
    expect(row.after).toEqual({ roleKey: 'partner' });
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  it('is rolled back with the change it describes', async () => {
    // The property that makes an audit trail trustworthy: no audit row can
    // survive a transaction whose change did not.
    const before = await withTenant(db, business.businessId, (tx) =>
      tx.select().from(schema.auditLogs),
    );

    await expect(
      withTenant(db, business.businessId, async (tx) => {
        await tx.insert(schema.auditLogs).values({
          businessId: business.businessId,
          action: 'orders.delete',
          entityType: 'order',
        });
        throw new Error('the change failed after the audit write');
      }),
    ).rejects.toThrow('the change failed');

    const after = await withTenant(db, business.businessId, (tx) =>
      tx.select().from(schema.auditLogs),
    );
    expect(after).toHaveLength(before.length);
  });
});

describe('immutability', () => {
  it('refuses UPDATE', async () => {
    const row = await writeAuditRow();
    const error = await withTenant(db, business.businessId, (tx) =>
      tx
        .update(schema.auditLogs)
        .set({ action: 'something.harmless' })
        .where(eq(schema.auditLogs.id, row.id)),
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(pgCode(error)).toBe('42501'); // insufficient_privilege

    const [unchanged] = await withTenant(db, business.businessId, (tx) =>
      tx.select().from(schema.auditLogs).where(eq(schema.auditLogs.id, row.id)),
    );
    expect(unchanged?.action).toBe('member.role_change');
  });

  it('refuses DELETE', async () => {
    const row = await writeAuditRow();
    const error = await withTenant(db, business.businessId, (tx) =>
      tx.delete(schema.auditLogs).where(eq(schema.auditLogs.id, row.id)),
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(pgCode(error)).toBe('42501');

    const [survivor] = await withTenant(db, business.businessId, (tx) =>
      tx.select().from(schema.auditLogs).where(eq(schema.auditLogs.id, row.id)),
    );
    expect(survivor).toBeDefined();
  });

  it('withholds the UPDATE and DELETE grants as well as trapping them', async () => {
    // The trigger is the backstop. The grant is the first line, and this
    // asserts it independently so removing one guard cannot pass unnoticed.
    const result = await db.execute<{ privilege_type: string }>(sql`
      SELECT privilege_type FROM information_schema.role_table_grants
      WHERE grantee = 'daybook_app' AND table_name = 'audit_logs'
      ORDER BY privilege_type
    `);
    const granted = result.rows.map((r) => r.privilege_type);
    expect(granted).toContain('SELECT');
    expect(granted).toContain('INSERT');
    expect(granted).not.toContain('UPDATE');
    expect(granted).not.toContain('DELETE');
  });
});

describe('tenant scoping', () => {
  it('hides another business’s audit rows', async () => {
    const other = await createBusiness('Other Audit Co');
    await writeAuditRow();

    const rows = await withTenant(db, other.businessId, (tx) =>
      tx.select().from(schema.auditLogs),
    );
    expect(rows).toHaveLength(0);
  });
});
