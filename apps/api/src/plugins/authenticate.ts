import fp from 'fastify-plugin';
import { and, eq } from 'drizzle-orm';
import { can } from '@daybook/core';
import type { MemberAuthorization, PermissionOverrides } from '@daybook/core';
import type { PermissionKey, RoleKey } from '@daybook/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { AppError, forbidden, notFound, unauthenticated } from '../lib/errors.js';
import { verifyAccessToken } from '../lib/tokens.js';
import { withUser } from '../db/client.js';
import * as schema from '../db/schema/index.js';
import type { Database } from '../db/client.js';
import type { Env } from '../env.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Present on every route except `access: 'public'`. */
    auth?: { userId: string; sessionId: string };
    /** Present only once a business has been resolved. */
    business?: {
      id: string;
      memberId: string;
      roleKey: RoleKey;
      permissions: MemberAuthorization;
    };
  }
}

export const BUSINESS_HEADER = 'x-business-id';

export interface AuthenticateOptions {
  db: Database;
  env: Env;
}

/**
 * Resolves identity, then business context, then authorization — in that order,
 * because each depends on the last.
 *
 * A member of one business asking about another gets 404, never 403. Saying
 * "forbidden" would confirm the id exists, which is the leak RLS prevents at
 * the row level; it would be careless to give it back at the HTTP level.
 */
export const authenticate = fp(
  async function authenticatePlugin(app: FastifyInstance, options: AuthenticateOptions) {
    const { db, env } = options;

    app.addHook('preHandler', async (request: FastifyRequest) => {
      // No route matched: leave it to the not-found handler. Without this the
      // hook demands a token for a URL that does not exist, so every typo
      // answers 401 instead of 404.
      if (request.routeOptions.url === undefined) return;

      const access = request.routeOptions.config.access;
      // A matched route always has one — the startup assertion refuses to boot
      // otherwise — so this is defensive, not a fallback.
      if (access === undefined || access === 'public') return;

      request.auth = await identify(request, env);

      // A route declaring only `authenticated` needs no business context —
      // listing your own memberships, for instance.
      if (access === 'authenticated') return;

      const businessId = request.headers[BUSINESS_HEADER];
      if (typeof businessId !== 'string' || businessId.length === 0) {
        throw new AppError('validation_failed', `Missing ${BUSINESS_HEADER} header`);
      }

      request.business = await resolveBusiness(db, request.auth.userId, businessId);

      if (!can(request.business.permissions, access as PermissionKey)) {
        throw forbidden(`This action requires ${access}`);
      }
    });
  },
  { name: 'authenticate', dependencies: ['route-permissions'] },
);

async function identify(request: FastifyRequest, env: Env) {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw unauthenticated();

  try {
    const claims = await verifyAccessToken(env, header.slice('Bearer '.length));
    return { userId: claims.sub, sessionId: claims.sid };
  } catch (error) {
    // Distinguished so the app knows to refresh rather than to sign in again.
    const expired = error instanceof Error && error.name === 'JWTExpired';
    throw expired
      ? new AppError('token_expired', 'Your session has expired')
      : unauthenticated();
  }
}

async function resolveBusiness(db: Database, userId: string, businessId: string) {
  // Deliberately does NOT join `roles`. Migration 0003 widened only
  // business_members and businesses to be readable by their own user without a
  // tenant; `roles` stays strictly tenant-scoped, so joining it here would
  // return nothing and every request would 404. The role is read below, once
  // the tenant is set.
  const row = await withUser(db, userId, async (tx) => {
    const [membership] = await tx
      .select({
        memberId: schema.businessMembers.id,
        status: schema.businessMembers.status,
        roleId: schema.businessMembers.roleId,
      })
      .from(schema.businessMembers)
      .where(
        and(
          eq(schema.businessMembers.businessId, businessId),
          eq(schema.businessMembers.userId, userId),
        ),
      )
      .limit(1);
    return membership;
  });

  // Not a member, or the business does not exist: indistinguishable on purpose.
  if (!row || row.status !== 'active') throw notFound('Business');

  const { roleKey, rolePermissions, overrides } = await loadPermissions(
    db,
    businessId,
    userId,
    row,
  );

  return {
    id: businessId,
    memberId: row.memberId,
    roleKey,
    permissions: { roleKey, rolePermissions, overrides } satisfies MemberAuthorization,
  };
}

async function loadPermissions(
  db: Database,
  businessId: string,
  userId: string,
  row: { memberId: string; roleId: string },
) {
  const { withTenant } = await import('../db/client.js');
  return withTenant(
    db,
    businessId,
    async (tx) => {
      const [role] = await tx
        .select({ key: schema.roles.key })
        .from(schema.roles)
        .where(eq(schema.roles.id, row.roleId))
        .limit(1);
      if (!role) throw notFound('Business');

      const granted = await tx
        .select({ key: schema.rolePermissions.permissionKey })
        .from(schema.rolePermissions)
        .where(eq(schema.rolePermissions.roleId, row.roleId));

      const overrideRows = await tx
        .select({
          key: schema.memberPermissions.permissionKey,
          granted: schema.memberPermissions.granted,
        })
        .from(schema.memberPermissions)
        .where(eq(schema.memberPermissions.memberId, row.memberId));

      const overrides: PermissionOverrides = {};
      for (const o of overrideRows) overrides[o.key as PermissionKey] = o.granted;

      return {
        roleKey: role.key as RoleKey,
        rolePermissions: granted.map((g) => g.key as PermissionKey),
        overrides,
      };
    },
    userId,
  );
}
