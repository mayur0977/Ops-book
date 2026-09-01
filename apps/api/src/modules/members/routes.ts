import { z } from 'zod';
import {
  changeMemberRoleSchema,
  errorEnvelopeSchema,
  memberSchema,
  permissionKeySchema,
} from '@daybook/contracts';
import {
  changeMemberRole,
  listMembers,
  revokeMember,
  setMemberPermission,
} from './service.js';
import { BUSINESS_HEADER } from '../../plugins/authenticate.js';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyRequest } from 'fastify';
import type { MemberActor, MemberDeps } from './service.js';

const errorResponses = {
  401: errorEnvelopeSchema,
  403: errorEnvelopeSchema,
  404: errorEnvelopeSchema,
  409: errorEnvelopeSchema,
  422: errorEnvelopeSchema,
};

const tenantHeaders = z.object({ [BUSINESS_HEADER]: z.uuid() }).loose();

/** The preHandler has already resolved and authorized this; it cannot be absent. */
const actorFrom = (request: FastifyRequest): MemberActor => ({
  userId: request.auth!.userId,
  businessId: request.business!.id,
  memberId: request.business!.memberId,
  permissions: request.business!.permissions,
  requestId: String(request.id),
  ip: request.ip,
});

export function memberRoutes(deps: MemberDeps): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/members',
      {
        config: { access: 'members.manage' },
        schema: {
          headers: tenantHeaders,
          response: {
            200: z.object({ members: z.array(memberSchema) }),
            ...errorResponses,
          },
        },
      },
      async (request) => {
        const rows = await listMembers(deps, actorFrom(request));
        return {
          members: rows.map((row) => ({
            id: row.id,
            userId: row.userId,
            name: row.name,
            roleKey: row.roleKey as 'owner' | 'partner' | 'manager' | 'staff',
            status: row.status as 'pending' | 'active' | 'revoked',
            joinedAt: row.joinedAt?.toISOString() ?? null,
          })),
        };
      },
    );

    app.patch(
      '/members/:memberId/role',
      {
        // Owner-only and not delegable (invariant 4). The service checks it
        // again against the role itself, because an override could otherwise
        // hand out the key that manufactures every other permission.
        config: { access: 'members.role.change' },
        schema: {
          headers: tenantHeaders,
          params: z.object({ memberId: z.uuid() }),
          body: changeMemberRoleSchema,
          response: {
            200: z.object({ id: z.uuid(), roleKey: z.string() }),
            ...errorResponses,
          },
        },
      },
      async (request) => {
        const updated = await changeMemberRole(
          deps,
          actorFrom(request),
          request.params.memberId,
          request.body.roleKey,
        );
        return { id: updated.id, roleKey: updated.roleKey };
      },
    );

    app.put(
      '/members/:memberId/permissions/:permissionKey',
      {
        config: { access: 'members.manage' },
        schema: {
          headers: tenantHeaders,
          params: z.object({ memberId: z.uuid(), permissionKey: permissionKeySchema }),
          // null clears the override and restores inheritance from the role,
          // which is a distinct state from an explicit false.
          body: z.object({ granted: z.boolean().nullable() }),
          response: {
            200: z.object({ permissionKey: z.string(), granted: z.boolean().nullable() }),
            ...errorResponses,
          },
        },
      },
      async (request) =>
        setMemberPermission(
          deps,
          actorFrom(request),
          request.params.memberId,
          request.params.permissionKey,
          request.body.granted,
        ),
    );

    app.post(
      '/members/:memberId/revoke',
      {
        config: { access: 'members.manage' },
        schema: {
          headers: tenantHeaders,
          params: z.object({ memberId: z.uuid() }),
          response: {
            200: z.object({ id: z.uuid(), status: z.string() }),
            ...errorResponses,
          },
        },
      },
      async (request) => {
        const updated = await revokeMember(
          deps,
          actorFrom(request),
          request.params.memberId,
        );
        return { id: updated.id, status: updated.status };
      },
    );
  };
}
