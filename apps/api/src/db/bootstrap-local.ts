/**
 * Local development only. Gives the application role a login so `pnpm dev` can
 * connect as it. CI does the same thing from the test global setup, so the two
 * environments cannot drift.
 */
import { createDatabase, createPool } from './client.js';
import { APP_ROLE, grantLocalLogin } from './app-role.js';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = createPool(url);
try {
  await grantLocalLogin(createDatabase(pool));
  console.warn(`${APP_ROLE} can now log in locally`);
} finally {
  await pool.end();
}
