import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { buildApp } from '../../app.js';
import { loadEnv } from '../../env.js';
import { db, pool, schema, withTenant } from '../../../test/helpers.js';
import { BUSINESS_HEADER } from '../../plugins/authenticate.js';
import type { App } from '../../app.js';
import type { RoleKey } from '@daybook/contracts';
import type { SmsDriver } from '../../platform/sms/index.js';

/**
 * The six enforced invariants from docs/permissions.md, and the
 * privilege-escalation sweep across all four roles.
 *
 * These run over HTTP against real Postgres, because an invariant that holds in
 * @daybook/core but is not wired to a route protects nothing.
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
const nextPhone = () => `+9196${runPrefix}${String(counter++).padStart(3, '0')}`;

interface Actor {
  userId: string;
  accessToken: string;
}

async function signUp(): Promise<Actor> {
  const phone = nextPhone();
  await app.inject({ method: 'POST', url: '/auth/otp/request', payload: { phone } });
  const body = await app
    .inject({
      method: 'POST',
      url: '/auth/otp/verify',
      payload: { phone, code: sent.at(-1)!.code },
    })
    .then((r) => r.json());
  return { userId: body.userId, accessToken: body.accessToken };
}

const auth = (actor: Actor, businessId?: string) => ({
  authorization: `Bearer ${actor.accessToken}`,
  ...(businessId ? { [BUSINESS_HEADER]: businessId } : {}),
});

/** A business with an owner plus one member at each requested role. */
async function fixture(roles: RoleKey[] = []) {
  const owner = await signUp();
  const created = await app.inject({
    method: 'POST',
    url: '/businesses',
    headers: auth(owner),
    payload: { clientUuid: crypto.randomUUID(), name: 'Members Co', vertical: 'general' },
  });
  const businessId = created.json().business.id as string;

  const { joinCode } = await app
    .inject({
      method: 'GET',
      url: '/businesses/join-code',
      headers: auth(owner, businessId),
    })
    .then((r) => r.json());

  const members: Record<string, { actor: Actor; memberId: string }> = {};
  // Sequential on purpose: each sign-up requests an OTP, and the capturing
  // driver exposes only the most recent code. Running these in parallel would
  // race for it and hand the wrong code to the wrong actor.
  /* eslint-disable no-await-in-loop */
  for (const roleKey of roles) {
    const actor = await signUp();
    await app.inject({
      method: 'POST',
      url: '/businesses/join',
      headers: auth(actor),
      payload: { joinCode },
    });
    const [row] = await withTenant(db, businessId, (tx) =>
      tx
        .select()
        .from(schema.businessMembers)
        .where(eq(schema.businessMembers.userId, actor.userId)),
    );
    if (roleKey !== 'staff') {
      // Promote via the database: the API path is what the tests below assert,
      // so using it to build fixtures would make them circular.
      const [role] = await withTenant(db, businessId, (tx) =>
        tx
          .select()
          .from(schema.roles)
          .where(
            and(eq(schema.roles.businessId, businessId), eq(schema.roles.key, roleKey)),
          ),
      );
      await withTenant(db, businessId, (tx) =>
        tx
          .update(schema.businessMembers)
          .set({ roleId: role!.id })
          .where(eq(schema.businessMembers.id, row!.id)),
      );
    }
    members[roleKey] = { actor, memberId: row!.id };
  }

  const [ownerRow] = await withTenant(db, businessId, (tx) =>
    tx
      .select()
      .from(schema.businessMembers)
      .where(eq(schema.businessMembers.userId, owner.userId)),
  );

  return { owner, ownerMemberId: ownerRow!.id, businessId, members };
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
      OTP_MAX_PER_IP_PER_HOUR: '100000',
      OTP_MAX_PER_NUMBER_PER_DAY: '1000',
      OTP_GLOBAL_DAILY_CEILING: '1000000',
    } as NodeJS.ProcessEnv),
    { db, sms: capturingSms },
  );
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('invariant 2 — a business always keeps an owner', () => {
  it('refuses to demote the last owner', async () => {
    const { owner, ownerMemberId, businessId } = await fixture();
    const response = await app.inject({
      method: 'PATCH',
      url: `/members/${ownerMemberId}/role`,
      headers: auth(owner, businessId),
      payload: { roleKey: 'manager' },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('conflict');
  });

  it('refuses to revoke the last owner', async () => {
    const { owner, ownerMemberId, businessId } = await fixture();
    const response = await app.inject({
      method: 'POST',
      url: `/members/${ownerMemberId}/revoke`,
      headers: auth(owner, businessId),
    });
    expect(response.statusCode).toBe(409);
  });

  it('allows it once a second owner exists', async () => {
    const { owner, ownerMemberId, businessId, members } = await fixture(['manager']);
    const promoted = await app.inject({
      method: 'PATCH',
      url: `/members/${members.manager!.memberId}/role`,
      headers: auth(owner, businessId),
      payload: { roleKey: 'owner' },
    });
    expect(promoted.statusCode).toBe(200);

    const demoted = await app.inject({
      method: 'PATCH',
      url: `/members/${ownerMemberId}/role`,
      headers: auth(owner, businessId),
      payload: { roleKey: 'manager' },
    });
    expect(demoted.statusCode).toBe(200);
  });
});

describe('invariant 3 — no self-escalation', () => {
  it('refuses to grant a capability the actor does not hold', async () => {
    // A partner with members.manage still cannot hand out payments.void,
    // because they do not hold it themselves.
    const { owner, businessId, members } = await fixture(['partner', 'staff']);
    const partner = members.partner!;

    await app.inject({
      method: 'PUT',
      url: `/members/${partner.memberId}/permissions/members.manage`,
      headers: auth(owner, businessId),
      payload: { granted: true },
    });

    const response = await app.inject({
      method: 'PUT',
      url: `/members/${members.staff!.memberId}/permissions/payments.void`,
      headers: auth(partner.actor, businessId),
      payload: { granted: true },
    });
    expect(response.statusCode).toBe(403);
  });

  it('allows granting a capability the actor does hold', async () => {
    const { owner, businessId, members } = await fixture(['partner', 'staff']);
    const partner = members.partner!;
    await app.inject({
      method: 'PUT',
      url: `/members/${partner.memberId}/permissions/members.manage`,
      headers: auth(owner, businessId),
      payload: { granted: true },
    });

    const response = await app.inject({
      method: 'PUT',
      url: `/members/${members.staff!.memberId}/permissions/orders.write`,
      headers: auth(partner.actor, businessId),
      payload: { granted: true },
    });
    expect(response.statusCode).toBe(200);
  });

  it('lets revoking proceed, since taking away is not escalation', async () => {
    const { owner, businessId, members } = await fixture(['partner', 'staff']);
    const partner = members.partner!;
    await app.inject({
      method: 'PUT',
      url: `/members/${partner.memberId}/permissions/members.manage`,
      headers: auth(owner, businessId),
      payload: { granted: true },
    });

    const response = await app.inject({
      method: 'PUT',
      url: `/members/${members.staff!.memberId}/permissions/payments.void`,
      headers: auth(partner.actor, businessId),
      payload: { granted: false },
    });
    expect(response.statusCode).toBe(200);
  });
});

describe('invariant 4 — members.role.change is owner-only and not delegable', () => {
  it('refuses a partner even when the permission is explicitly granted', async () => {
    const { owner, businessId, members } = await fixture(['partner', 'staff']);
    const partner = members.partner!;

    // Grant the key itself. It must still not work: this is the key that could
    // manufacture every other permission.
    await app.inject({
      method: 'PUT',
      url: `/members/${partner.memberId}/permissions/members.role.change`,
      headers: auth(owner, businessId),
      payload: { granted: true },
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/members/${members.staff!.memberId}/role`,
      headers: auth(partner.actor, businessId),
      payload: { roleKey: 'manager' },
    });
    expect(response.statusCode).toBe(403);
  });

  it('allows an owner', async () => {
    const { owner, businessId, members } = await fixture(['staff']);
    const response = await app.inject({
      method: 'PATCH',
      url: `/members/${members.staff!.memberId}/role`,
      headers: auth(owner, businessId),
      payload: { roleKey: 'manager' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().roleKey).toBe('manager');
  });
});

describe('invariant 5 — permission changes are audited with before and after', () => {
  it('records both sides of a role change', async () => {
    const { owner, businessId, members } = await fixture(['staff']);
    await app.inject({
      method: 'PATCH',
      url: `/members/${members.staff!.memberId}/role`,
      headers: auth(owner, businessId),
      payload: { roleKey: 'manager' },
    });

    const rows = await withTenant(db, businessId, (tx) =>
      tx
        .select()
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.action, 'member.role_change')),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.before).toEqual({ roleKey: 'staff' });
    expect(rows[0]!.after).toEqual({ roleKey: 'manager' });
    expect(rows[0]!.actorId).toBe(owner.userId);
  });

  it('records an override, including the null that means "inherit"', async () => {
    const { owner, businessId, members } = await fixture(['staff']);
    const target = members.staff!.memberId;

    await app.inject({
      method: 'PUT',
      url: `/members/${target}/permissions/orders.write`,
      headers: auth(owner, businessId),
      payload: { granted: true },
    });
    await app.inject({
      method: 'PUT',
      url: `/members/${target}/permissions/orders.write`,
      headers: auth(owner, businessId),
      payload: { granted: null },
    });

    const rows = await withTenant(db, businessId, (tx) =>
      tx
        .select()
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.action, 'member.permission_change')),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]!.before).toEqual({ permissionKey: 'orders.write', granted: null });
    expect(rows[0]!.after).toEqual({ permissionKey: 'orders.write', granted: true });
    expect(rows[1]!.after).toEqual({ permissionKey: 'orders.write', granted: null });
  });
});

describe('invariant 6 — revocation is immediate', () => {
  it('locks the member out on their very next request, not when the token expires', async () => {
    const { owner, businessId, members } = await fixture(['manager']);
    const manager = members.manager!;

    // The access token stays valid for 15 minutes; membership is re-read on
    // every request, which is what makes this immediate.
    const before = await app.inject({
      method: 'GET',
      url: '/businesses/current',
      headers: auth(manager.actor, businessId),
    });
    expect(before.statusCode).toBe(200);

    await app.inject({
      method: 'POST',
      url: `/members/${manager.memberId}/revoke`,
      headers: auth(owner, businessId),
    });

    const after = await app.inject({
      method: 'GET',
      url: '/businesses/join-code',
      headers: auth(manager.actor, businessId),
    });
    expect(after.statusCode).toBe(404);
  });

  it('revokes rather than deletes, so the audit trail survives', async () => {
    const { owner, businessId, members } = await fixture(['staff']);
    await app.inject({
      method: 'POST',
      url: `/members/${members.staff!.memberId}/revoke`,
      headers: auth(owner, businessId),
    });

    const [row] = await withTenant(db, businessId, (tx) =>
      tx
        .select()
        .from(schema.businessMembers)
        .where(eq(schema.businessMembers.id, members.staff!.memberId)),
    );
    expect(row).toBeDefined();
    expect(row!.status).toBe('revoked');
    expect(row!.revokedAt).not.toBeNull();
  });
});

describe('privilege escalation across all four roles', () => {
  it.each([
    ['owner', 200],
    ['partner', 403],
    ['manager', 403],
    ['staff', 403],
  ] as const)('%s listing members expects %i', async (roleKey, expected) => {
    if (roleKey === 'owner') {
      const { owner, businessId } = await fixture();
      const response = await app.inject({
        method: 'GET',
        url: '/members',
        headers: auth(owner, businessId),
      });
      expect(response.statusCode).toBe(expected);
      return;
    }
    const { businessId, members } = await fixture([roleKey]);
    const response = await app.inject({
      method: 'GET',
      url: '/members',
      headers: auth(members[roleKey]!.actor, businessId),
    });
    expect(response.statusCode).toBe(expected);
  });

  it.each(['partner', 'manager', 'staff'] as const)(
    '%s cannot change a role',
    async (roleKey) => {
      const { businessId, members } = await fixture([roleKey, 'staff']);
      const response = await app.inject({
        method: 'PATCH',
        url: `/members/${members.staff!.memberId}/role`,
        headers: auth(members[roleKey]!.actor, businessId),
        payload: { roleKey: 'owner' },
      });
      expect(response.statusCode).toBe(403);
    },
  );

  it('a manager cannot revoke anyone', async () => {
    const { businessId, members } = await fixture(['manager', 'staff']);
    const response = await app.inject({
      method: 'POST',
      url: `/members/${members.staff!.memberId}/revoke`,
      headers: auth(members.manager!.actor, businessId),
    });
    expect(response.statusCode).toBe(403);
  });
});

describe('idempotency', () => {
  const withKey = (actor: Actor, businessId: string, key: string) => ({
    ...auth(actor, businessId),
    'idempotency-key': key,
  });

  it('replays the original response and creates nothing new', async () => {
    const { owner, businessId, members } = await fixture(['staff', 'manager']);
    const key = `test-${crypto.randomUUID()}`;
    const url = `/members/${members.staff!.memberId}/role`;

    const first = await app.inject({
      method: 'PATCH',
      url,
      headers: withKey(owner, businessId, key),
      payload: { roleKey: 'manager' },
    });
    expect(first.statusCode).toBe(200);

    const audits = async () =>
      withTenant(db, businessId, (tx) =>
        tx
          .select()
          .from(schema.auditLogs)
          .where(eq(schema.auditLogs.action, 'member.role_change')),
      );
    const afterFirst = await audits();

    // The retry a flaky network produces: same key, same body.
    const replay = await app.inject({
      method: 'PATCH',
      url,
      headers: withKey(owner, businessId, key),
      payload: { roleKey: 'manager' },
    });

    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toEqual(first.json());
    // Nothing new: the work did not run a second time.
    expect(await audits()).toHaveLength(afterFirst.length);
  });

  it('rejects the same key with a different body', async () => {
    // Not a retry — a client bug. Replaying a response that does not describe
    // what was asked for would be worse than refusing.
    const { owner, businessId, members } = await fixture(['staff']);
    const key = `test-${crypto.randomUUID()}`;
    const url = `/members/${members.staff!.memberId}/role`;

    await app.inject({
      method: 'PATCH',
      url,
      headers: withKey(owner, businessId, key),
      payload: { roleKey: 'manager' },
    });

    const conflicting = await app.inject({
      method: 'PATCH',
      url,
      headers: withKey(owner, businessId, key),
      payload: { roleKey: 'partner' },
    });

    expect(conflicting.statusCode).toBe(422);
    expect(conflicting.json().error.code).toBe('idempotency_key_reused');
  });

  it('runs normally when no key is sent', async () => {
    const { owner, businessId, members } = await fixture(['staff']);
    const response = await app.inject({
      method: 'PATCH',
      url: `/members/${members.staff!.memberId}/role`,
      headers: auth(owner, businessId),
      payload: { roleKey: 'manager' },
    });
    expect(response.statusCode).toBe(200);
  });

  it('scopes keys per business, so two tenants cannot collide', async () => {
    const a = await fixture(['staff']);
    const b = await fixture(['staff']);
    const key = 'shared-key-value';

    const first = await app.inject({
      method: 'PATCH',
      url: `/members/${a.members.staff!.memberId}/role`,
      headers: withKey(a.owner, a.businessId, key),
      payload: { roleKey: 'manager' },
    });
    const second = await app.inject({
      method: 'PATCH',
      url: `/members/${b.members.staff!.memberId}/role`,
      headers: withKey(b.owner, b.businessId, key),
      payload: { roleKey: 'manager' },
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(first.json().id).not.toBe(second.json().id);
  });

  it('replays a revoke without revoking twice', async () => {
    const { owner, businessId, members } = await fixture(['staff']);
    const key = `test-${crypto.randomUUID()}`;
    const url = `/members/${members.staff!.memberId}/revoke`;

    const first = await app.inject({
      method: 'POST',
      url,
      headers: withKey(owner, businessId, key),
    });
    const replay = await app.inject({
      method: 'POST',
      url,
      headers: withKey(owner, businessId, key),
    });

    expect(first.statusCode).toBe(200);
    expect(replay.json()).toEqual(first.json());

    const rows = await withTenant(db, businessId, (tx) =>
      tx
        .select()
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.action, 'member.revoke')),
    );
    expect(rows).toHaveLength(1);
  });
});

describe('cross-tenant', () => {
  it('returns 404 for a member id belonging to another business', async () => {
    const a = await fixture(['staff']);
    const b = await fixture();

    const response = await app.inject({
      method: 'PATCH',
      url: `/members/${a.members.staff!.memberId}/role`,
      headers: auth(b.owner, b.businessId),
      payload: { roleKey: 'manager' },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('not_found');
  });

  it('lists only its own members', async () => {
    const a = await fixture(['staff']);
    await fixture(['staff', 'manager']);

    const response = await app.inject({
      method: 'GET',
      url: '/members',
      headers: auth(a.owner, a.businessId),
    });
    expect(response.json().members).toHaveLength(2); // owner + staff
  });
});
