import { errorEnvelopeSchema, type ErrorCode } from '@daybook/contracts';
import type { z } from 'zod';

/**
 * The typed client. Every response is parsed with the same Zod schema the
 * server validated against, so a contract drift is a caught error here rather
 * than an undefined three screens later.
 */

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly requestId: string | undefined;
  readonly details: { path: string; message: string }[] | undefined;
  readonly retryAfter: number | undefined;

  constructor(init: {
    code: ErrorCode;
    message: string;
    status: number;
    requestId?: string;
    details?: { path: string; message: string }[];
    retryAfter?: number;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.code = init.code;
    this.status = init.status;
    this.requestId = init.requestId;
    this.details = init.details;
    this.retryAfter = init.retryAfter;
  }
}

/** No network at all, which is a different problem from a rejected request. */
export class OfflineError extends Error {
  constructor() {
    super('No connection');
    this.name = 'OfflineError';
  }
}

export interface ClientOptions {
  baseUrl: string;
  getTokens: () => { accessToken: string; refreshToken: string } | null;
  getBusinessId: () => string | null;
  /** Called after a silent refresh so the session store can persist the pair. */
  onTokensRefreshed: (tokens: {
    accessToken: string;
    refreshToken: string;
  }) => Promise<void>;
  /** Called when the session is beyond saving and the user must sign in again. */
  onSessionLost: () => Promise<void>;
}

export interface RequestOptions<TResponse extends z.ZodType> {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Required on every mutating call — see docs/sync-contract.md. */
  idempotencyKey?: string;
  schema: TResponse;
  /** Skips the auth header and the refresh dance. Login endpoints only. */
  anonymous?: boolean;
}

export function createClient(options: ClientOptions) {
  /**
   * A single in-flight refresh, shared.
   *
   * Without this, a screen that fires four requests on mount gets four 401s and
   * four parallel refreshes — and since rotation is single-use with reuse
   * detection, three of them would present an already-used token and the server
   * would correctly revoke the whole family. The user would be signed out for
   * loading a screen.
   */
  let refreshInFlight: Promise<boolean> | null = null;

  async function refreshTokens(): Promise<boolean> {
    refreshInFlight ??= (async () => {
      try {
        const tokens = options.getTokens();
        if (!tokens) return false;

        const response = await fetch(`${options.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
        if (!response.ok) return false;

        const next = (await response.json()) as {
          accessToken: string;
          refreshToken: string;
        };
        await options.onTokensRefreshed(next);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();

    return refreshInFlight;
  }

  async function send(path: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(`${options.baseUrl}${path}`, init);
    } catch {
      // fetch rejects only on a transport failure. A 500 is a Response.
      throw new OfflineError();
    }
  }

  async function request<TResponse extends z.ZodType>(
    path: string,
    opts: RequestOptions<TResponse>,
  ): Promise<z.infer<TResponse>> {
    const build = (): RequestInit => {
      const headers: Record<string, string> = { 'content-type': 'application/json' };

      if (!opts.anonymous) {
        const tokens = options.getTokens();
        if (tokens) headers.authorization = `Bearer ${tokens.accessToken}`;
        const businessId = options.getBusinessId();
        if (businessId) headers['x-business-id'] = businessId;
      }
      if (opts.idempotencyKey) headers['idempotency-key'] = opts.idempotencyKey;

      return {
        method: opts.method ?? 'GET',
        headers,
        ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }),
      };
    };

    let response = await send(path, build());

    // One retry, and only for an expired access token. `token_reused` and
    // `unauthenticated` are not retryable — retrying the first would compound
    // a security event.
    if (response.status === 401 && !opts.anonymous) {
      const envelope = await peekEnvelope(response);
      if (envelope?.error.code === 'token_expired') {
        const refreshed = await refreshTokens();
        if (refreshed) {
          response = await send(path, build());
        } else {
          await options.onSessionLost();
        }
      } else if (envelope?.error.code === 'token_reused') {
        await options.onSessionLost();
      }
    }

    if (!response.ok) throw await toApiError(response);

    const payload: unknown = await response.json();
    const parsed = opts.schema.safeParse(payload);
    if (!parsed.success) {
      // The server sent something the shared contract does not describe. That
      // is a deployment mismatch, and guessing at it would corrupt the screen.
      throw new ApiError({
        code: 'internal_error',
        message: 'The server sent an unexpected response',
        status: response.status,
      });
    }
    return parsed.data;
  }

  return { request };
}

async function peekEnvelope(response: Response) {
  try {
    const parsed = errorEnvelopeSchema.safeParse(await response.clone().json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const envelope = await peekEnvelope(response);
  if (envelope) {
    return new ApiError({
      code: envelope.error.code,
      message: envelope.error.message,
      status: response.status,
      ...(envelope.error.requestId ? { requestId: envelope.error.requestId } : {}),
      ...(envelope.error.details ? { details: envelope.error.details } : {}),
      ...(envelope.error.retryAfter === undefined
        ? {}
        : { retryAfter: envelope.error.retryAfter }),
    });
  }
  return new ApiError({
    code: 'internal_error',
    message: 'Something went wrong',
    status: response.status,
  });
}

export type ApiClient = ReturnType<typeof createClient>;

/**
 * Turns a thrown error into a sentence for a person.
 *
 * Lives here rather than in each screen so that "no connection" and "the server
 * said no" stay distinguishable everywhere — an empty list and a failed request
 * must never look the same, and neither must their messages.
 */
export function describeError(caught: unknown): string {
  if (caught instanceof OfflineError) {
    return 'No connection. Check your network and try again.';
  }
  if (caught instanceof ApiError) return caught.message;
  return 'Something went wrong. Please try again.';
}
