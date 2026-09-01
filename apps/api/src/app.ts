import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import {
  serializerCompiler,
  validatorCompiler,
  hasZodFastifySchemaValidationErrors,
} from 'fastify-type-provider-zod';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { AppError, toEnvelope } from './lib/errors.js';
import { loggerOptions } from './lib/logging.js';
import { routePermissions } from './plugins/route-permissions.js';
import { healthRoutes } from './modules/health/routes.js';
import { authRoutes } from './modules/auth/routes.js';
import { businessRoutes } from './modules/business/routes.js';
import { memberRoutes } from './modules/members/routes.js';
import { authenticate } from './plugins/authenticate.js';
import { createSmsDriver } from './platform/sms/index.js';
import { createDatabase, createPool } from './db/client.js';
import type { Env } from './env.js';
import type { Database } from './db/client.js';
import type { SmsDriver } from './platform/sms/index.js';

export type App = FastifyInstance<
  Server,
  IncomingMessage,
  ServerResponse,
  FastifyBaseLogger,
  ZodTypeProvider
>;

export interface BuildOptions {
  /** Supplied by tests so the suite reuses one pool instead of opening many. */
  db?: Database;
  sms?: SmsDriver;
}

export async function buildApp(env: Env, options: BuildOptions = {}): Promise<App> {
  const app = Fastify({
    logger: loggerOptions(env),
    // Trusting the proxy is required for the OTP rate limits to see the real
    // client IP rather than the load balancer's.
    trustProxy: true,
    genReqId: () => crypto.randomUUID(),
  }).withTypeProvider<ZodTypeProvider>();

  // Zod schemas from @daybook/contracts validate and serialise every route, so
  // the contract the mobile app imports is the contract the server enforces.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, { contentSecurityPolicy: false });
  // No cross-origin browser client exists yet, and the mobile app is not one.
  // Production stays closed until a real origin needs allowing.
  await app.register(cors, { origin: env.NODE_ENV !== 'production' });
  await app.register(rateLimit, {
    global: false, // opt in per route; the OTP endpoints set their own
    max: 100,
    timeWindow: '1 minute',
  });
  await app.register(routePermissions);

  app.setErrorHandler((error, request, reply) => {
    const requestId = String(request.id);

    if (hasZodFastifySchemaValidationErrors(error)) {
      const appError = new AppError(
        'validation_failed',
        'The request did not pass validation',
        {
          // fastify-type-provider-zod v7 flattens each Zod issue onto the entry
          // itself: `instancePath` is "/name", and `params` holds the issue's
          // own fields rather than the issue. Reaching for `params.issue` throws
          // inside the error handler, which surfaces as a 500 on what is really
          // a 422 — the shape is worth pinning down rather than assuming.
          details: error.validation.map((entry) => ({
            path: entry.instancePath.replace(/^\//, '').replaceAll('/', '.'),
            message: entry.message ?? 'Invalid value',
          })),
        },
      );
      return reply.status(appError.statusCode).send(toEnvelope(appError, requestId));
    }

    if (error instanceof AppError) {
      // Client errors are expected traffic, not incidents. Logging them at
      // error level trains everyone to ignore the error log.
      request.log.info({ code: error.code, err: error }, 'request failed');
      if (error.retryAfter !== undefined) reply.header('retry-after', error.retryAfter);
      return reply.status(error.statusCode).send(toEnvelope(error, requestId));
    }

    if ((error as { statusCode?: number }).statusCode === 429) {
      const limited = new AppError('rate_limited', 'Too many requests', {
        retryAfter: 60,
      });
      return reply.status(429).send(toEnvelope(limited, requestId));
    }

    // Anything unrecognised is a bug. Log it in full; tell the caller nothing
    // beyond the request id, which is enough to find this line.
    request.log.error({ err: error }, 'unhandled error');
    const internal = new AppError('internal_error', 'Something went wrong');
    return reply.status(500).send(toEnvelope(internal, requestId));
  });

  app.setNotFoundHandler((request, reply) => {
    const error = new AppError('not_found', 'Route not found');
    return reply.status(404).send(toEnvelope(error, String(request.id)));
  });

  await app.register(healthRoutes);

  // The pool is created here when one is not supplied so that the server owns
  // its lifetime and closes it on shutdown, rather than leaking on restart.
  const ownsPool = options.db === undefined;
  const pool = ownsPool ? createPool(env.DATABASE_URL) : undefined;
  const db = options.db ?? createDatabase(pool!);
  if (pool) app.addHook('onClose', async () => pool.end());

  // Registered after route-permissions so its `dependencies` check is met, and
  // before any tenant-scoped route so the preHandler is in place for them all.
  await app.register(authenticate, { db, env });

  await app.register(authRoutes({ db, env, sms: options.sms ?? createSmsDriver(env) }));
  await app.register(businessRoutes({ db }));
  await app.register(memberRoutes({ db }));

  return app;
}
