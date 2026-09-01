import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

/**
 * Liveness only. It deliberately does not touch the database: a health check
 * that fails when Postgres blips causes the orchestrator to restart a process
 * that was working, turning a brief dependency outage into an outage of its own.
 */
export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      config: { access: 'public' },
      schema: {
        response: {
          200: z.object({
            status: z.literal('ok'),
            uptimeSeconds: z.number(),
          }),
        },
      },
    },
    async () => ({ status: 'ok' as const, uptimeSeconds: Math.floor(process.uptime()) }),
  );
};
