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
const LOCAL_FALLBACK = 'postgresql://daybook:local_dev_only@localhost:5432/daybook_test';

/**
 * Under CI the fallback is refused. It has already hidden this bug twice: once
 * because the variable was read under the wrong name, and once because turbo
 * stripped it for not being declared in turbo.json. Both times the suite
 * quietly used a localhost default and failed with an authentication error a
 * long way from the cause. A convenience default belongs on a developer's
 * machine and nowhere else.
 */
export const OWNER_DATABASE_URL = (() => {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv) return fromEnv;
  if (process.env.CI) {
    throw new Error(
      'DATABASE_URL is not set. In CI this must come from the workflow — check ' +
        "that turbo.json declares it under the task's `env`, or turbo will " +
        'strip it before the task runs.',
    );
  }
  return LOCAL_FALLBACK;
})();

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
