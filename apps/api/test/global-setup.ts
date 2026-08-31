import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDatabase, createPool } from '../src/db/client.js';
import { seedPermissions } from '../src/db/seed.js';

const HOST = 'localhost:5432/daybook_test';

/** Owner. Runs migrations and seeds; never used by a test assertion. */
export const OWNER_DATABASE_URL =
  process.env.OWNER_DATABASE_URL ?? `postgresql://daybook:local_dev_only@${HOST}`;

/**
 * The unprivileged role the API actually uses. Tests connect as this and only
 * this — asserting isolation while connected as a superuser proves nothing,
 * which is a mistake this suite made once already.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? `postgresql://daybook_app:local_dev_only@${HOST}`;

/** Real Postgres, always. There is no mock persistence path (CLAUDE.md rule 8). */
export default async function setup() {
  const pool = createPool(OWNER_DATABASE_URL);
  const db = createDatabase(pool);
  const here = dirname(fileURLToPath(import.meta.url));
  try {
    await migrate(db, { migrationsFolder: join(here, '../src/db/migrations') });
    await seedPermissions(db);
  } finally {
    await pool.end();
  }
}
