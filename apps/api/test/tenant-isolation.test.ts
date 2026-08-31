import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createBusiness, db, pool, schema, sql, withTenant } from './helpers.js';
import type { Fixture } from './helpers.js';

/**
 * BR-001, Critical. A member of business A must not reach business B's data by
 * any route — not by listing, not by fetching a known id, not by writing.
 *
 * These assertions run against real Postgres with RLS forced. They would all
 * pass against a mock, which is exactly why rule 8 forbids one.
 */

/** Drizzle wraps driver errors; the SQLSTATE lives on the cause. */
function pgCause(error: unknown): { code?: string; message?: string } {
  let current: unknown = error;
  for (let i = 0; i < 5 && current instanceof Error; i++) {
    const candidate = current as Error & { code?: string };
    if (typeof candidate.code === 'string') return candidate;
    current = candidate.cause;
  }
  return {};
}
const pgErrorCode = (e: unknown) => pgCause(e).code;
const pgErrorMessage = (e: unknown) => pgCause(e).message ?? String(e);

let alpha: Fixture;
let beta: Fixture;

beforeAll(async () => {
  alpha = await createBusiness('Alpha Works');
  beta = await createBusiness('Beta Fabricators');
});

afterAll(async () => {
  await pool.end();
});

describe('the database role itself', () => {
  it('is not a superuser and does not have BYPASSRLS', async () => {
    // Silently catastrophic if wrong: every policy below would still be
    // present and every one of them would be ignored.
    const result = await db.execute<{ rolsuper: boolean; rolbypassrls: boolean }>(
      sql`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
    );
    expect(result.rows[0]?.rolsuper).toBe(false);
    expect(result.rows[0]?.rolbypassrls).toBe(false);
  });

  it('has RLS enabled AND forced on every tenant table', async () => {
    const result = await db.execute<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(sql`
      SELECT relname, relrowsecurity, relforcerowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
        AND relname IN ('businesses','business_members','roles','role_permissions',
                        'member_permissions','audit_logs','idempotency_keys')
    `);
    expect(result.rows).toHaveLength(7);
    for (const row of result.rows) {
      expect(row.relrowsecurity, `${row.relname} ENABLE`).toBe(true);
      expect(row.relforcerowsecurity, `${row.relname} FORCE`).toBe(true);
    }
  });
});

describe('reads', () => {
  it('sees only its own business', async () => {
    const rows = await withTenant(db, alpha.businessId, (tx) =>
      tx.select().from(schema.businesses),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(alpha.businessId);
  });

  it('returns nothing for a known id belonging to another business', async () => {
    // The 404 the API returns is built on this returning zero rows. If this
    // ever returns a row, every "not found" above it becomes a data leak.
    const rows = await withTenant(db, alpha.businessId, (tx) =>
      tx
        .select()
        .from(schema.businesses)
        .where(eq(schema.businesses.id, beta.businessId)),
    );
    expect(rows).toHaveLength(0);
  });

  it.each([
    ['business_members', () => schema.businessMembers],
    ['roles', () => schema.roles],
  ])('leaks no %s rows across the boundary', async (_name, table) => {
    const rows = await withTenant(db, alpha.businessId, (tx) =>
      tx.select().from(table()),
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect((row as { businessId: string }).businessId).toBe(alpha.businessId);
    }
  });

  it('isolates join-table rows through their parent', async () => {
    const rows = await withTenant(db, alpha.businessId, (tx) =>
      tx.select().from(schema.rolePermissions),
    );
    const roleIds = new Set(rows.map((r) => r.roleId));
    expect(roleIds.has(alpha.roleId)).toBe(true);
    expect(roleIds.has(beta.roleId)).toBe(false);
  });
});

describe('writes', () => {
  it('refuses to insert a row belonging to another business', async () => {
    // This is what WITH CHECK buys. Without it the insert succeeds and the row
    // is simply invisible to its author — corruption that surfaces much later.
    //
    // Asserted on the SQLSTATE rather than the message: drizzle wraps the
    // driver error, so the RLS text is on the cause and a message match here
    // would pass for any failed insert.
    const error = await withTenant(db, alpha.businessId, (tx) =>
      tx.insert(schema.roles).values({
        businessId: beta.businessId,
        key: 'manager',
        name: 'Smuggled',
      }),
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(pgErrorCode(error)).toBe('42501'); // insufficient_privilege
    expect(pgErrorMessage(error)).toMatch(/row-level security/i);

    // and nothing was written
    const rows = await withTenant(db, beta.businessId, (tx) =>
      tx.select().from(schema.roles),
    );
    expect(rows.map((r) => r.name)).not.toContain('Smuggled');
  });

  it('cannot update another business’s row', async () => {
    const result = await withTenant(db, alpha.businessId, (tx) =>
      tx
        .update(schema.businesses)
        .set({ name: 'Renamed by Alpha' })
        .where(eq(schema.businesses.id, beta.businessId))
        .returning(),
    );
    expect(result).toHaveLength(0);

    const [beta_] = await withTenant(db, beta.businessId, (tx) =>
      tx
        .select()
        .from(schema.businesses)
        .where(eq(schema.businesses.id, beta.businessId)),
    );
    expect(beta_?.name).toBe('Beta Fabricators');
  });

  it('cannot delete another business’s row', async () => {
    const result = await withTenant(db, alpha.businessId, (tx) =>
      tx.delete(schema.roles).where(eq(schema.roles.id, beta.roleId)).returning(),
    );
    expect(result).toHaveLength(0);
  });
});

describe('the tenant context itself', () => {
  it('sees nothing when no business id is set', async () => {
    const rows = await db.select().from(schema.businesses);
    expect(rows).toHaveLength(0);
  });

  it('does not leak the setting into the next use of a pooled connection', async () => {
    // SET LOCAL is transaction-scoped. If this ever regresses to a plain SET,
    // one request would inherit the previous request's tenant.
    await withTenant(db, alpha.businessId, async (tx) => {
      const rows = await tx.select().from(schema.businesses);
      expect(rows).toHaveLength(1);
    });

    for (let i = 0; i < 12; i++) {
      // Sequential on purpose: the point is to reuse connections one after
      // another and see whether any inherits the previous tenant. Promise.all
      // would open parallel connections and test nothing.
      // eslint-disable-next-line no-await-in-loop
      const rows = await db.select().from(schema.businesses);
      expect(rows, `pooled connection ${i} inherited a tenant`).toHaveLength(0);
    }
  });

  it('rejects a non-uuid business id before it reaches a policy', async () => {
    await expect(withTenant(db, 'not-a-uuid', async () => 'unreachable')).rejects.toThrow(
      /not a UUID/,
    );
  });

  it('rolls the tenant setting back when the transaction fails', async () => {
    await expect(
      withTenant(db, alpha.businessId, async (tx) => {
        await tx.select().from(schema.businesses);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    const rows = await db.select().from(schema.businesses);
    expect(rows).toHaveLength(0);
  });
});
