import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDatabase, createPool } from '../src/db/client.js';
import { appUrlFrom, grantLocalLogin } from '../src/db/app-role.js';
import { seedPermissions } from '../src/db/seed.js';

/**
 * `DATABASE_URL` is the owner connection, and is the variable CI already sets —
 * the suite must read the same name the workflow provides, or it silently falls
 * back to a local default and fails to authenticate.
 */
export const OWNER_DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://daybook:local_dev_only@localhost:5432/daybook_test';

/**
 * The unprivileged role the API uses, derived from the owner URL so the two
 * always point at the same database. Tests connect as this and only this:
 * asserting isolation while connected as a superuser proves nothing, which this
 * suite already learned once.
 */
export const TEST_DATABASE_URL = appUrlFrom(OWNER_DATABASE_URL);

/**
 * Real Postgres, always (CLAUDE.md rule 8). Self-contained on purpose: it
 * migrates, gives the app role a login, and seeds, so a fresh CI database and a
 * developer's machine follow exactly the same path.
 */
export default async function setup() {
  const pool = createPool(OWNER_DATABASE_URL);
  const db = createDatabase(pool);
  const here = dirname(fileURLToPath(import.meta.url));
  try {
    await migrate(db, { migrationsFolder: join(here, '../src/db/migrations') });
    await grantLocalLogin(db);
    await seedPermissions(db);
  } finally {
    await pool.end();
  }
}
