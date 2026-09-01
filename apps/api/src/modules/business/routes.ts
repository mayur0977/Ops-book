import { z } from 'zod';
import {
  businessSchema,
  createBusinessSchema,
  errorEnvelopeSchema,
  joinBusinessSchema,
  joinCodeSchema,
  membershipSummarySchema,
} from '@daybook/contracts';
import { effectivePermissions } from '@daybook/core';
import {
  createBusiness,
  getBusiness,
  joinByCode,
  listMemberships,
  regenerateJoinCode,
} from './service.js';
import { BUSINESS_HEADER } from '../../plugins/authenticate.js';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyRequest } from 'fastify';
import type { BusinessDeps } from './service.js';

const errorResponses = {
  401: errorEnvelopeSchema,
  403: errorEnvelopeSchema,
  404: errorEnvelopeSchema,
  422: errorEnvelopeSchema,
};

const actorFrom = (request: FastifyRequest) => ({
  userId: request.auth!.userId,
  requestId: String(request.id),
  ip: request.ip,
});

const serialise = (row: {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  modulesEnabled: unknown;
  labelOverrides: unknown;
  logoKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: row.id,
  name: row.name,
  currency: row.currency,
  timezone: row.timezone,
  modulesEnabled: (row.modulesEnabled ?? {}) as Record<string, boolean>,
  labelOverrides: (row.labelOverrides ?? {}) as Record<string, string>,
  logoKey: row.logoKey,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  // Optimistic concurrency arrives with the sync engine; businesses do not yet
  // carry a version column of their own.
  version: 1,
});

export function businessRoutes(deps: BusinessDeps): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      '/businesses',
      {
        // No business context can exist before the first business does, so this
        // route is authenticated but not tenant-scoped.
        config: { access: 'authenticated' },
        schema: {
          body: createBusinessSchema,
          response: {
            201: z.object({ business: businessSchema, roleKey: z.string() }),
            ...errorResponses,
          },
        },
      },
      async (request, reply) => {
        const result = await createBusiness(deps, actorFrom(request), request.body);
        return reply.status(201).send({
          business: serialise(result.business),
          roleKey: result.roleKey,
        });
      },
    );

    app.get(
      '/businesses',
      {
        config: { access: 'authenticated' },
        schema: {
          response: {
            200: z.object({ memberships: z.array(membershipSummarySchema) }),
            ...errorResponses,
          },
        },
      },
      async (request) => {
        const rows = await listMemberships(deps, request.auth!.userId);
        return {
          memberships: rows.map((row) => ({
            businessId: row.businessId,
            businessName: row.businessName,
            roleKey: row.roleKey,
            status: row.status as 'pending' | 'active' | 'revoked',
          })),
        };
      },
    );

    app.post(
      '/businesses/join',
      {
        config: { access: 'authenticated' },
        schema: {
          body: joinBusinessSchema,
          response: {
            200: z.object({ businessId: z.uuid(), status: z.string() }),
            ...errorResponses,
          },
        },
      },
      async (request) => joinByCode(deps, actorFrom(request), request.body.joinCode),
    );

    /**
     * "Switching" is a client concern: the app sends a different
     * X-Business-Id. This endpoint exists so the app can fetch the context that
     * goes with the switch — the business, and what this member may do in it.
     */
    app.get(
      '/businesses/current',
      {
        config: { access: 'authenticated' },
        schema: {
          headers: z.object({ [BUSINESS_HEADER]: z.uuid() }).loose(),
          response: {
            200: z.object({
              business: businessSchema,
              roleKey: z.string(),
              permissions: z.array(z.string()),
            }),
            ...errorResponses,
          },
        },
      },
      async (request) => {
        const businessId = request.headers[BUSINESS_HEADER] as string;
        const actor = actorFrom(request);
        const business = await getBusiness(deps, actor, businessId);
        // Resolving membership is the preHandler's job for tenant-scoped
        // routes; this one is 'authenticated', so it asks explicitly.
        const memberships = await listMemberships(deps, actor.userId);
        const membership = memberships.find((m) => m.businessId === businessId);
        return {
          business: serialise(business),
          roleKey: membership?.roleKey ?? 'staff',
          permissions: request.business
            ? effectivePermissions(request.business.permissions)
            : [],
        };
      },
    );

    app.get(
      '/businesses/join-code',
      {
        // Only someone who may change settings may see the code that grants
        // entry. Reading it is equivalent to being able to hand out access.
        config: { access: 'business.settings' },
        schema: {
          headers: z.object({ [BUSINESS_HEADER]: z.uuid() }).loose(),
          response: { 200: joinCodeSchema, ...errorResponses },
        },
      },
      async (request) => {
        const business = await getBusiness(
          deps,
          actorFrom(request),
          request.business!.id,
        );
        return {
          joinCode: business.joinCode,
          rotatedAt: business.joinCodeRotatedAt?.toISOString() ?? null,
        };
      },
    );

    app.post(
      '/businesses/join-code/rotate',
      {
        config: { access: 'business.settings' },
        schema: {
          headers: z.object({ [BUSINESS_HEADER]: z.uuid() }).loose(),
          response: { 200: joinCodeSchema, ...errorResponses },
        },
      },
      async (request) => {
        const result = await regenerateJoinCode(
          deps,
          actorFrom(request),
          request.business!.id,
        );
        return { joinCode: result.joinCode, rotatedAt: result.rotatedAt.toISOString() };
      },
    );
  };
}
