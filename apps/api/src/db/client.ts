import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from './schema/index.js';

export type Database = ReturnType<typeof createDatabase>;
export type TenantDatabase = Parameters<Parameters<Database['transaction']>[0]>[0];

export function createPool(connectionString: string): Pool {
  return new Pool({ connectionString, max: 10 });
}

export function createDatabase(pool: Pool) {
  return drizzle(pool, { schema });
}

/**
 * Every tenant-scoped request runs inside this. It opens a transaction and
 * issues `SET LOCAL app.business_id`, which the RLS policies read.
 *
 * `SET LOCAL` is transaction-scoped, so a pooled connection cannot leak the
 * setting into the next request — that is the whole reason the tenant id is set
 * this way rather than with a plain `SET`.
 *
 * Nothing outside this function may set `app.business_id`, and no handler ever
 * takes the id from a request body (root CLAUDE.md rule 1).
 */
export async function withTenant<T>(
  db: Database,
  businessId: string,
  fn: (tx: TenantDatabase) => Promise<T>,
): Promise<T> {
  if (!UUID_PATTERN.test(businessId)) {
    // set_config takes a string; a non-UUID here would become a confusing
    // cast error deep inside a policy rather than an obvious rejection.
    throw new Error(
      `withTenant: businessId is not a UUID: ${JSON.stringify(businessId)}`,
    );
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.business_id', ${businessId}, true)`);
    return fn(tx);
  });
}

/**
 * For the few operations that legitimately precede business context: OTP
 * request, token refresh, listing which businesses a user belongs to. It sets
 * no tenant id, so any tenant table read inside it returns zero rows — RLS is
 * still on, and that is deliberate rather than a limitation to work around.
 */
export async function withoutTenant<T>(
  db: Database,
  fn: (tx: TenantDatabase) => Promise<T>,
): Promise<T> {
  return db.transaction(fn);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export { schema };
