import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDatabase, createPool } from './client.js';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = createPool(url);
const db = createDatabase(pool);
const here = dirname(fileURLToPath(import.meta.url));

try {
  await migrate(db, { migrationsFolder: join(here, 'migrations') });
  console.warn('migrations applied');
} finally {
  await pool.end();
}
