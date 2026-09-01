import * as schema from '../db/schema/index.js';
import type { TenantDatabase } from '../db/client.js';

/**
 * Writes an audit row **inside the caller's transaction** (root CLAUDE.md
 * rule 6). It takes a `tx`, never a `db`, and that is the whole design: there
 * is no way to call it outside the transaction it is describing, so an audit
 * row cannot survive a change that rolled back, and a change cannot commit
 * without its audit row.
 *
 * The rows are append-only — no UPDATE, no DELETE, enforced by both a withheld
 * grant and a trigger (migration 0001).
 */
export interface AuditEntry {
  businessId: string | null;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  requestId?: string | null;
  ip?: string | null;
  appVersion?: string | null;
}

export async function writeAudit(tx: TenantDatabase, entry: AuditEntry): Promise<void> {
  await tx.insert(schema.auditLogs).values({
    businessId: entry.businessId,
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    requestId: entry.requestId ?? null,
    ip: entry.ip ?? null,
    appVersion: entry.appVersion ?? null,
  });
}

/**
 * Strips values that must not be copied into an audit row. The audit trail is
 * read by more people than the tables it describes, so a secret recorded here
 * is a secret spread wider than where it started.
 */
const NEVER_AUDITED = new Set([
  'codeHash',
  'tokenHash',
  'code',
  'token',
  'accessToken',
  'refreshToken',
  'password',
  'joinCode',
]);

export function auditable<T extends Record<string, unknown>>(
  row: T,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => !NEVER_AUDITED.has(key)),
  );
}
