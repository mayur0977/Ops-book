/**
 * Local development only. Gives the application role LOGIN and a password so
 * `pnpm dev` and the test suite can connect as it.
 *
 * Deliberately not a migration: a migration must never carry a credential. In
 * staging and production this role's password is set by whatever provisions the
 * database, and this script is not run.
 */
import { sql } from 'drizzle-orm';
import { createDatabase, createPool } from './client.js';

const LOCAL_PASSWORD = 'local_dev_only'; // matches compose.yaml; never leaves a dev machine

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production') {
  console.error('refusing to run bootstrap-local with NODE_ENV=production');
  process.exit(1);
}

const pool = createPool(url);
const db = createDatabase(pool);
try {
  await db.execute(sql.raw(`ALTER ROLE daybook_app LOGIN PASSWORD '${LOCAL_PASSWORD}'`));
  console.warn('daybook_app can now log in locally');
} finally {
  await pool.end();
}
