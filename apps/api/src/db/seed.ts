/**
 * Seeds the global permission catalogue. Idempotent — safe to run on every
 * deploy, which is the point: a permission key added in code must exist in the
 * database before any route can declare it.
 *
 * The catalogue itself lives in @daybook/contracts so both apps share one
 * spelling of every key.
 */
import { permissionKeys } from '@daybook/contracts';
import { sql } from 'drizzle-orm';
import { createDatabase, createPool } from './client.js';
import { permissions } from './schema/index.js';

export async function seedPermissions(db: ReturnType<typeof createDatabase>) {
  await db
    .insert(permissions)
    .values(permissionKeys.map((key) => ({ key, description: null })))
    .onConflictDoNothing({ target: permissions.key });

  // A key removed from the catalogue but still granted somewhere would be a
  // silent, permanent grant. Report rather than delete — removing a permission
  // is a migration decision, not a seed one.
  const orphans = await db.execute<{ key: string }>(sql`
    SELECT key FROM permissions
    WHERE key NOT IN (${sql.join(
      permissionKeys.map((k) => sql`${k}`),
      sql`, `,
    )})
  `);
  return { seeded: permissionKeys.length, orphaned: orphans.rows.map((r) => r.key) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const pool = createPool(url);
  try {
    const result = await seedPermissions(createDatabase(pool));
    console.warn(`seeded ${result.seeded} permissions`);
    if (result.orphaned.length > 0) {
      console.warn(
        `WARNING: ${result.orphaned.length} orphaned key(s): ${result.orphaned.join(', ')}`,
      );
    }
  } finally {
    await pool.end();
  }
}
