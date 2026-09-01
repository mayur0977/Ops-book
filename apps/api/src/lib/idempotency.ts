import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { AppError } from './errors.js';
import * as schema from '../db/schema/index.js';
import type { TenantDatabase } from '../db/client.js';

/**
 * Replays the stored response for a repeated `Idempotency-Key`
 * (docs/sync-contract.md).
 *
 * This lands in Phase 1, not Phase 9. The duplicate-payment class of bug is
 * killed before any sync code exists, and Phase 9 becomes a sync engine rather
 * than a rewrite.
 *
 * A repeat with the same key but a different body is a client bug, not a
 * retry — it returns 422 rather than silently replaying a response that does
 * not describe what was asked for.
 */
export function hashRequest(endpoint: string, body: unknown): string {
  return createHash('sha256')
    .update(endpoint)
    .update(' ')
    .update(JSON.stringify(body ?? null))
    .digest('hex');
}

export type IdempotencyOutcome =
  { kind: 'proceed' } | { kind: 'replay'; status: number; body: unknown };

/**
 * Claims the key, or reports that it is already spoken for. Runs inside the
 * caller's transaction so the claim and the work commit or roll back together —
 * a key marked used by an operation that failed would block the honest retry.
 */
export async function claimIdempotencyKey(
  tx: TenantDatabase,
  input: {
    businessId: string;
    userId: string | null;
    key: string;
    endpoint: string;
    body: unknown;
  },
): Promise<IdempotencyOutcome> {
  const requestHash = hashRequest(input.endpoint, input.body);

  const [existing] = await tx
    .select()
    .from(schema.idempotencyKeys)
    .where(
      and(
        eq(schema.idempotencyKeys.businessId, input.businessId),
        eq(schema.idempotencyKeys.key, input.key),
      ),
    )
    .limit(1);

  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new AppError(
        'idempotency_key_reused',
        'This Idempotency-Key was already used with a different request body',
      );
    }
    if (existing.status === 'completed' && existing.responseCode !== null) {
      return {
        kind: 'replay',
        status: existing.responseCode,
        body: existing.responseBody,
      };
    }
    // Still in flight. Telling the client to retry is safer than running the
    // operation a second time concurrently.
    throw new AppError(
      'conflict',
      'That request is still being processed. Try again shortly.',
    );
  }

  await tx.insert(schema.idempotencyKeys).values({
    businessId: input.businessId,
    key: input.key,
    userId: input.userId,
    endpoint: input.endpoint,
    requestHash,
    status: 'in_progress',
  });

  return { kind: 'proceed' };
}

export async function completeIdempotencyKey(
  tx: TenantDatabase,
  input: { businessId: string; key: string; status: number; body: unknown },
): Promise<void> {
  await tx
    .update(schema.idempotencyKeys)
    .set({
      status: 'completed',
      responseCode: input.status,
      responseBody: input.body as never,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(schema.idempotencyKeys.businessId, input.businessId),
        eq(schema.idempotencyKeys.key, input.key),
      ),
    );
}
