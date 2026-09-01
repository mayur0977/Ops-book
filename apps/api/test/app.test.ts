import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { errorCodeSchema } from '@daybook/contracts';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/env.js';
import { AppError } from '../src/lib/errors.js';
import { MissingRoutePermissionError } from '../src/plugins/route-permissions.js';
import type { App } from '../src/app.js';

const TEST_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  JWT_REFRESH_SECRET: 'b'.repeat(48),
  LOG_LEVEL: 'silent' as const,
};

let app: App;

beforeAll(async () => {
  app = await buildApp(loadEnv({ ...TEST_ENV, LOG_LEVEL: 'fatal' } as NodeJS.ProcessEnv));

  // Fastify locks its route table at ready(), so every fixture route is
  // registered here rather than inside the test that exercises it.
  app.post(
    '/echo',
    {
      config: { access: 'public' },
      schema: { body: z.object({ amount: z.string(), name: z.string().min(2) }) },
    },
    async () => ({ ok: true }),
  );
  app.get('/boom', { config: { access: 'public' } }, async () => {
    throw new Error('connection string postgres://user:hunter2@db/prod');
  });
  app.get('/denied', { config: { access: 'public' } }, async () => {
    throw new AppError('forbidden', 'Nope');
  });

  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('env validation', () => {
  it('fails fast when a secret is missing', () => {
    const { JWT_ACCESS_SECRET: _omitted, ...withoutSecret } = TEST_ENV;
    expect(() => loadEnv(withoutSecret as NodeJS.ProcessEnv)).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it('rejects a secret that is too short to be one', () => {
    expect(() =>
      loadEnv({ ...TEST_ENV, JWT_ACCESS_SECRET: 'short' } as NodeJS.ProcessEnv),
    ).toThrow(/at least 32 characters/);
  });

  it('refuses SMS_PROVIDER=console in production', () => {
    // console prints OTP codes to the log, which is a full auth bypass.
    expect(() =>
      loadEnv({
        ...TEST_ENV,
        NODE_ENV: 'production',
        SMS_PROVIDER: 'console',
      } as NodeJS.ProcessEnv),
    ).toThrow(/not permitted when NODE_ENV=production/);
  });

  it('applies defaults for the optional settings', () => {
    const env = loadEnv(TEST_ENV as NodeJS.ProcessEnv);
    expect(env.PORT).toBe(3000);
    expect(env.SMS_PROVIDER).toBe('console');
  });
});

describe('every route declares a permission', () => {
  it('refuses to boot when one does not', async () => {
    // Invariant 1 of docs/permissions.md. This is the assertion that makes
    // forgetting impossible rather than merely discouraged.
    const rogue = await buildApp(
      loadEnv({ ...TEST_ENV, LOG_LEVEL: 'fatal' } as NodeJS.ProcessEnv),
    );
    rogue.get('/forgot-to-declare', async () => ({ ok: true }));

    await expect(rogue.ready()).rejects.toThrow(MissingRoutePermissionError);
    await expect(rogue.ready()).rejects.toThrow(/GET \/forgot-to-declare/);
    await rogue.close();
  });

  it('boots when the route declares one, including an explicit public', async () => {
    const fine = await buildApp(
      loadEnv({ ...TEST_ENV, LOG_LEVEL: 'fatal' } as NodeJS.ProcessEnv),
    );
    fine.get('/declared', { config: { access: 'public' } }, async () => ({ ok: true }));
    fine.get('/guarded', { config: { access: 'orders.read' } }, async () => ({
      ok: true,
    }));

    await expect(fine.ready()).resolves.toBeDefined();
    await fine.close();
  });
});

describe('/health', () => {
  it('reports ok without touching the database', async () => {
    // Deliberately independent of Postgres: restarting a working process
    // because a dependency blipped turns a brief outage into a longer one.
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });
});

describe('the error envelope', () => {
  const envelope = z.object({
    error: z.object({
      code: errorCodeSchema,
      message: z.string(),
      requestId: z.string().min(1),
      details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
      retryAfter: z.number().optional(),
    }),
  });

  it('shapes an unknown route as the contract envelope', async () => {
    const response = await app.inject({ method: 'GET', url: '/nope' });
    expect(response.statusCode).toBe(404);
    expect(envelope.safeParse(response.json()).success).toBe(true);
    expect(response.json().error.code).toBe('not_found');
  });

  it('reports validation failures per field', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/echo',
      payload: { name: 'x' },
    });
    expect(response.statusCode).toBe(422);
    const body = response.json();
    expect(envelope.safeParse(body).success).toBe(true);
    expect(body.error.code).toBe('validation_failed');
    expect(body.error.details.length).toBeGreaterThan(0);
  });

  it('never leaks an internal error’s message to the caller', async () => {
    const response = await app.inject({ method: 'GET', url: '/boom' });
    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('hunter2');
    expect(response.json().error.message).toBe('Something went wrong');
    expect(response.json().error.requestId).toBeTruthy();
  });

  it('maps an AppError to its declared status', async () => {
    const response = await app.inject({ method: 'GET', url: '/denied' });
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('forbidden');
  });
});
