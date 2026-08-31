import { z } from 'zod';

/**
 * One error envelope for every non-2xx response. The mobile app switches on
 * `code`, shows `message`, and renders `details` under the offending field.
 * Nothing else is ever returned from an error path.
 */
export const errorCodes = [
  'validation_failed',
  'unauthenticated',
  'token_expired',
  'token_reused',
  'forbidden',
  'not_found',
  'conflict',
  'version_conflict',
  'idempotency_key_reused',
  'rate_limited',
  'module_disabled',
  'internal_error',
] as const;

export const errorCodeSchema = z.enum(errorCodes);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const fieldErrorSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    /** Per-field detail. Present for `validation_failed`, absent otherwise. */
    details: z.array(fieldErrorSchema).optional(),
    /** Echoed back so a user can quote it in a support message. */
    requestId: z.string(),
    /** Seconds to wait. Present for `rate_limited`. */
    retryAfter: z.number().int().nonnegative().optional(),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
export type FieldError = z.infer<typeof fieldErrorSchema>;

/**
 * Cross-tenant reads are `not_found`, never `forbidden` — telling a caller that
 * an ID exists in a business they cannot see is itself a leak.
 */
export const httpStatusByErrorCode: Record<ErrorCode, number> = {
  validation_failed: 422,
  unauthenticated: 401,
  token_expired: 401,
  token_reused: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  version_conflict: 409,
  idempotency_key_reused: 422,
  rate_limited: 429,
  module_disabled: 404,
  internal_error: 500,
};
