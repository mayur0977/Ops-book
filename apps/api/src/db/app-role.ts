/**
 * The unprivileged role the API connects as, and how a non-production
 * environment gives it a login.
 *
 * Migration 0002 creates the role NOLOGIN and grants it what the API needs. It
 * deliberately sets no password, because a credential must never live in a
 * migration. Development and CI call `grantLocalLogin` to finish the job;
 * staging and production have their password set by whatever provisions the
 * database, and never run this.
 */
import { sql } from 'drizzle-orm';
import type { createDatabase } from './client.js';

export const APP_ROLE = 'daybook_app';

/**
 * Not a secret. It exists only on throwaway local and CI databases, matches the
 * `local_dev_only` convention already in compose.yaml, and `grantLocalLogin`
 * refuses to run when NODE_ENV is production.
 */
export const LOCAL_APP_PASSWORD = 'local_dev_only';

export async function grantLocalLogin(
  db: ReturnType<typeof createDatabase>,
  password: string = LOCAL_APP_PASSWORD,
): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('grantLocalLogin must never run against production');
  }
  if (!/^[A-Za-z0-9_-]+$/.test(password)) {
    throw new Error('local app password must be alphanumeric');
  }
  await db.execute(sql.raw(`ALTER ROLE ${APP_ROLE} LOGIN PASSWORD '${password}'`));
}

/**
 * Derives the application's connection string from the owner's, swapping only
 * the credentials so host, port and database always agree.
 *
 * Computed rather than configured because the two must not drift: pointing the
 * app URL at a different database than the one just migrated produces a
 * confusing failure a long way from its cause.
 */
export function appUrlFrom(
  ownerUrl: string,
  password: string = LOCAL_APP_PASSWORD,
): string {
  const url = new URL(ownerUrl);
  url.username = APP_ROLE;
  url.password = password;
  return url.toString();
}
