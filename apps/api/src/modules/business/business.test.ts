import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { buildApp } from '../../app.js';
import { loadEnv } from '../../env.js';
import { db, pool, schema, withTenant } from '../../../test/helpers.js';
import { BUSINESS_HEADER } from '../../plugins/authenticate.js';
import type { App } from '../../app.js';
import type { SmsDriver } from '../../platform/sms/index.js';

/**
 * The HTTP surface of tenancy. The database-level guarantees are proven in
 * tenant-isolation.test.ts; these assert that the API above them does not give
 * back what RLS withholds — and that it says 404, never 403.
 */

const sent: { to: string; code: string }[] = [];
const capturingSms: SmsDriver = {
  name: 'capture',
  async send(message) {
    sent.push({ to: message.to, code: message.code });
  },
};

let app: App;
let counter = 0;
const runPrefix = String(Date.now() % 100_000).padStart(5, '0');
const nextPhone = () => `+9197${runPrefix}${String(counter++).padStart(3, '0')}`;

interface Actor {
  phone: string;
  userId: string;
  accessToken: string;
}

async function signUp(): Promise<Actor> {
  const phone = nextPhone();
  await app.inject({ method: 'POST', url: '/auth/otp/request', payload: { phone } });
  const code = sent.at(-1)!.code;
  const body = await app
    .inject({ method: 'POST', url: '/auth/otp/verify', payload: { phone, code } })
    .then((r) => r.json());
  return { phone, userId: body.userId, accessToken: body.accessToken };
}

const auth = (actor: Actor, businessId?: string) => ({
  authorization: `Bearer ${actor.accessToken}`,
  ...(businessId ? { [BUSINESS_HEADER]: businessId } : {}),
});

async function newBusiness(actor: Actor, name: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/businesses',
    headers: auth(actor),
    payload: { clientUuid: crypto.randomUUID(), name, vertical: 'general' },
  });
  expect(response.statusCode).toBe(201);
  return response.json().business.id as string;
}

beforeAll(async () => {
  app = await buildApp(
    loadEnv({
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      JWT_ACCESS_SECRET: 'a'.repeat(48),
      JWT_REFRESH_SECRET: 'b'.repeat(48),
      OTP_RESEND_COOLDOWN_SECONDS: '1',
      OTP_MAX_PER_IP_PER_HOUR: '10000',
      OTP_MAX_PER_NUMBER_PER_DAY: '1000',
      OTP_GLOBAL_DAILY_CEILING: '100000',
    } as NodeJS.ProcessEnv),
    { db, sms: capturingSms },
  );
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('authentication', () => {
  it('refuses a protected route without a token', async () => {
    const response = await app.inject({ method: 'GET', url: '/businesses' });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('unauthenticated');
  });

  it('refuses a garbage token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/businesses',
      headers: { authorization: 'Bearer not.a.jwt' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('reports an expired token distinctly, so the app refreshes instead of re-logging in', async () => {
    const shortLived = await buildApp(
      loadEnv({
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
        JWT_ACCESS_SECRET: 'a'.repeat(48),
        JWT_REFRESH_SECRET: 'b'.repeat(48),
        ACCESS_TOKEN_TTL_SECONDS: '1',
        OTP_RESEND_COOLDOWN_SECONDS: '1',
        OTP_MAX_PER_IP_PER_HOUR: '10000',
        OTP_GLOBAL_DAILY_CEILING: '100000',
      } as NodeJS.ProcessEnv),
      { db, sms: capturingSms },
    );
    await shortLived.ready();

    const phone = nextPhone();
    await shortLived.inject({
      method: 'POST',
      url: '/auth/otp/request',
      payload: { phone },
    });
    const verified = await shortLived
      .inject({
        method: 'POST',
        url: '/auth/otp/verify',
        payload: { phone, code: sent.at(-1)!.code },
      })
      .then((r) => r.json());

    await new Promise((r) => setTimeout(r, 1500));
    const response = await shortLived.inject({
      method: 'GET',
      url: '/businesses',
      headers: { authorization: `Bearer ${verified.accessToken}` },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('token_expired');
    await shortLived.close();
  });
});

describe('creating a business', () => {
  it('makes the creator its owner and seeds all four system roles', async () => {
    const actor = await signUp();
    const businessId = await newBusiness(actor, 'Alpha Works');

    // Tenant tables are invisible without a tenant set — that is RLS working,
    // so the assertion reads them the way the API does.
    const roles = await withTenant(db, businessId, (tx) =>
      tx.select().from(schema.roles).where(eq(schema.roles.businessId, businessId)),
    );
    expect(roles.map((r) => r.key).toSorted()).toEqual([
      'manager',
      'owner',
      'partner',
      'staff',
    ]);

    const list = await app
      .inject({ method: 'GET', url: '/businesses', headers: auth(actor) })
      .then((r) => r.json());
    expect(list.memberships).toHaveLength(1);
    expect(list.memberships[0]).toMatchObject({
      businessId,
      roleKey: 'owner',
      status: 'active',
    });
  });

  it('is idempotent on client_uuid — an offline retry creates one business', async () => {
    const actor = await signUp();
    const clientUuid = crypto.randomUUID();
    const payload = { clientUuid, name: 'Retry Co', vertical: 'general' };

    const first = await app.inject({
      method: 'POST',
      url: '/businesses',
      headers: auth(actor),
      payload,
    });
    const second = await app.inject({
      method: 'POST',
      url: '/businesses',
      headers: auth(actor),
      payload,
    });

    expect(first.json().business.id).toBe(second.json().business.id);
    const list = await app
      .inject({ method: 'GET', url: '/businesses', headers: auth(actor) })
      .then((r) => r.json());
    expect(list.memberships).toHaveLength(1);
  });

  it('writes an audit row in the same transaction', async () => {
    const actor = await signUp();
    const businessId = await newBusiness(actor, 'Audited Co');

    const rows = await withTenant(db, businessId, (tx) =>
      tx
        .select()
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.businessId, businessId)),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.action).toBe('business.create');
    expect(rows[0]!.actorId).toBe(actor.userId);
  });

  it('never records the join code in the audit trail', async () => {
    const actor = await signUp();
    const businessId = await newBusiness(actor, 'Secret Code Co');
    const [business] = await withTenant(db, businessId, (tx) =>
      tx.select().from(schema.businesses).where(eq(schema.businesses.id, businessId)),
    );

    const rows = await withTenant(db, businessId, (tx) =>
      tx
        .select()
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.businessId, businessId)),
    );
    expect(JSON.stringify(rows)).not.toContain(business!.joinCode);
  });
});

describe('cross-tenant isolation over HTTP', () => {
  it('returns 404 — not 403 — for a business the caller is not in', async () => {
    // 403 would confirm the id exists. That is the leak RLS prevents at the
    // row level, and it would be careless to hand it back at the HTTP level.
    const alice = await signUp();
    const bob = await signUp();
    const bobsBusiness = await newBusiness(bob, 'Bob Fabricators');

    const response = await app.inject({
      method: 'GET',
      url: '/businesses/join-code',
      headers: auth(alice, bobsBusiness),
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('not_found');
  });

  it('gives the same 404 for a business that does not exist at all', async () => {
    const alice = await signUp();
    const real = await signUp().then((bob) => newBusiness(bob, 'Real Co'));
    const imaginary = crypto.randomUUID();

    const [toReal, toImaginary] = await Promise.all([
      app.inject({
        method: 'GET',
        url: '/businesses/join-code',
        headers: auth(alice, real),
      }),
      app.inject({
        method: 'GET',
        url: '/businesses/join-code',
        headers: auth(alice, imaginary),
      }),
    ]);

    expect(toReal.statusCode).toBe(toImaginary.statusCode);
    expect(toReal.json().error.message).toBe(toImaginary.json().error.message);
  });

  it('lists only the caller’s own memberships', async () => {
    const alice = await signUp();
    const bob = await signUp();
    await newBusiness(alice, 'Alice Only');
    await newBusiness(bob, 'Bob Only');

    const list = await app
      .inject({ method: 'GET', url: '/businesses', headers: auth(alice) })
      .then((r) => r.json());
    expect(list.memberships).toHaveLength(1);
    expect(list.memberships[0].businessName).toBe('Alice Only');
  });

  it('rejects a tenant-scoped route with no business header', async () => {
    const actor = await signUp();
    await newBusiness(actor, 'Headerless Co');
    const response = await app.inject({
      method: 'GET',
      url: '/businesses/join-code',
      headers: auth(actor),
    });
    expect(response.statusCode).toBe(422);
  });
});

describe('joining by code', () => {
  async function ownerWithCode() {
    const owner = await signUp();
    const businessId = await newBusiness(owner, 'Joinable Co');
    const { joinCode } = await app
      .inject({
        method: 'GET',
        url: '/businesses/join-code',
        headers: auth(owner, businessId),
      })
      .then((r) => r.json());
    return { owner, businessId, joinCode };
  }

  it('adds the joiner as staff, not as an owner', async () => {
    const { businessId, joinCode } = await ownerWithCode();
    const joiner = await signUp();

    const response = await app.inject({
      method: 'POST',
      url: '/businesses/join',
      headers: auth(joiner),
      payload: { joinCode },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ businessId, status: 'active' });

    const list = await app
      .inject({ method: 'GET', url: '/businesses', headers: auth(joiner) })
      .then((r) => r.json());
    expect(list.memberships[0]).toMatchObject({ roleKey: 'staff' });
  });

  it('rejects an unknown code', async () => {
    const joiner = await signUp();
    const response = await app.inject({
      method: 'POST',
      url: '/businesses/join',
      headers: auth(joiner),
      payload: { joinCode: 'ZZZZZZZZ' },
    });
    expect(response.statusCode).toBe(404);
  });

  it('is idempotent — joining twice does not create a second membership', async () => {
    const { joinCode } = await ownerWithCode();
    const joiner = await signUp();

    await app.inject({
      method: 'POST',
      url: '/businesses/join',
      headers: auth(joiner),
      payload: { joinCode },
    });
    const again = await app.inject({
      method: 'POST',
      url: '/businesses/join',
      headers: auth(joiner),
      payload: { joinCode },
    });

    expect(again.statusCode).toBe(200);
    const list = await app
      .inject({ method: 'GET', url: '/businesses', headers: auth(joiner) })
      .then((r) => r.json());
    expect(list.memberships).toHaveLength(1);
  });

  it('stops working once the code is rotated', async () => {
    // Rotating is how a business revokes access it has already handed out.
    const { owner, businessId, joinCode } = await ownerWithCode();
    await app.inject({
      method: 'POST',
      url: '/businesses/join-code/rotate',
      headers: auth(owner, businessId),
    });

    const joiner = await signUp();
    const response = await app.inject({
      method: 'POST',
      url: '/businesses/join',
      headers: auth(joiner),
      payload: { joinCode },
    });
    expect(response.statusCode).toBe(404);
  });
});

describe('permission enforcement', () => {
  async function businessWithStaff() {
    const owner = await signUp();
    const businessId = await newBusiness(owner, 'Roles Co');
    const { joinCode } = await app
      .inject({
        method: 'GET',
        url: '/businesses/join-code',
        headers: auth(owner, businessId),
      })
      .then((r) => r.json());
    const staff = await signUp();
    await app.inject({
      method: 'POST',
      url: '/businesses/join',
      headers: auth(staff),
      payload: { joinCode },
    });
    return { owner, staff, businessId };
  }

  it('lets an owner read the join code', async () => {
    const { owner, businessId } = await businessWithStaff();
    const response = await app.inject({
      method: 'GET',
      url: '/businesses/join-code',
      headers: auth(owner, businessId),
    });
    expect(response.statusCode).toBe(200);
  });

  it('forbids staff from reading the join code', async () => {
    // Staff IS a member here, so 403 is correct: the resource is theirs to
    // know about, the capability is not. That is a different answer from the
    // cross-tenant case, and deliberately so.
    const { staff, businessId } = await businessWithStaff();
    const response = await app.inject({
      method: 'GET',
      url: '/businesses/join-code',
      headers: auth(staff, businessId),
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('forbidden');
  });

  it('forbids staff from rotating the join code', async () => {
    const { staff, businessId } = await businessWithStaff();
    const response = await app.inject({
      method: 'POST',
      url: '/businesses/join-code/rotate',
      headers: auth(staff, businessId),
    });
    expect(response.statusCode).toBe(403);
  });

  it('honours an explicit member override that grants a capability', async () => {
    const { staff, businessId } = await businessWithStaff();
    const [member] = await withTenant(db, businessId, (tx) =>
      tx
        .select()
        .from(schema.businessMembers)
        .where(eq(schema.businessMembers.userId, staff.userId)),
    );

    await withTenant(db, businessId, (tx) =>
      tx.insert(schema.memberPermissions).values({
        memberId: member!.id,
        permissionKey: 'business.settings',
        granted: true,
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/businesses/join-code',
      headers: auth(staff, businessId),
    });
    expect(response.statusCode).toBe(200);
  });

  it('honours an explicit override that revokes what the role grants', async () => {
    const { owner, businessId } = await businessWithStaff();
    const [member] = await withTenant(db, businessId, (tx) =>
      tx
        .select()
        .from(schema.businessMembers)
        .where(eq(schema.businessMembers.userId, owner.userId)),
    );

    await withTenant(db, businessId, (tx) =>
      tx.insert(schema.memberPermissions).values({
        memberId: member!.id,
        permissionKey: 'business.settings',
        granted: false,
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/businesses/join-code',
      headers: auth(owner, businessId),
    });
    expect(response.statusCode).toBe(403);
  });
});
