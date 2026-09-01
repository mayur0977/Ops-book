import { httpStatusByErrorCode } from '@daybook/contracts';
import type { ErrorCode, ErrorEnvelope, FieldError } from '@daybook/contracts';

/**
 * Every failure leaves the API as the one envelope defined in
 * @daybook/contracts. The mobile app switches on `code`, so a handler that
 * throws a bare Error would be a contract break, not merely untidy.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details: FieldError[] | undefined;
  readonly retryAfter: number | undefined;

  constructor(
    code: ErrorCode,
    message: string,
    options: { details?: FieldError[]; retryAfter?: number; cause?: unknown } = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.details = options.details;
    this.retryAfter = options.retryAfter;
  }

  get statusCode(): number {
    return httpStatusByErrorCode[this.code];
  }
}

/**
 * Cross-tenant misses are `not_found`, never `forbidden`. Telling a caller that
 * an id exists in a business they cannot see is itself the leak RLS prevents,
 * so the two cases must be indistinguishable from outside.
 */
export const notFound = (what = 'Resource') =>
  new AppError('not_found', `${what} not found`);

export const forbidden = (message = 'You do not have permission to do this') =>
  new AppError('forbidden', message);

export const unauthenticated = (message = 'Authentication required') =>
  new AppError('unauthenticated', message);

export const conflict = (message: string) => new AppError('conflict', message);

export const validationFailed = (details: FieldError[]) =>
  new AppError('validation_failed', 'The request did not pass validation', { details });

export function toEnvelope(error: AppError, requestId: string): ErrorEnvelope {
  return {
    error: {
      code: error.code,
      message: error.message,
      requestId,
      ...(error.details ? { details: error.details } : {}),
      ...(error.retryAfter !== undefined ? { retryAfter: error.retryAfter } : {}),
    },
  };
}
