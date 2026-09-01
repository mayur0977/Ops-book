import fp from 'fastify-plugin';
import type { FastifyInstance, RouteOptions } from 'fastify';
import type { PermissionKey } from '@daybook/contracts';

/**
 * Invariant 1 of docs/permissions.md: every route declares a permission, and a
 * route registered without one fails a startup assertion.
 *
 * The point is that forgetting is impossible rather than merely discouraged.
 * A route that silently defaults to "allowed" is the failure this prevents; a
 * route that silently defaults to "denied" is a bug found in production by a
 * user who cannot work. So neither default exists — the server refuses to boot.
 *
 * `access: 'public'` is a deliberate declaration too. It reads as a decision in
 * the route file, which a missing key never would.
 */
declare module 'fastify' {
  interface FastifyContextConfig {
    /** A permission key, or an explicit exemption. Required on every route. */
    access?: PermissionKey | 'public' | 'authenticated';
  }
}

export class MissingRoutePermissionError extends Error {
  readonly routes: string[];
  constructor(routes: string[]) {
    super(
      `${routes.length} route(s) declare no permission. Add \`config: { access: … }\`:\n` +
        routes.map((r) => `  ${r}`).join('\n'),
    );
    this.name = 'MissingRoutePermissionError';
    this.routes = routes;
  }
}

/** Fastify registers HEAD alongside GET; only the declared route is checked. */
const isGenerated = (route: RouteOptions) =>
  route.method === 'HEAD' ||
  (Array.isArray(route.method) && route.method.includes('HEAD'));

export const routePermissions = fp(
  function routePermissionsPlugin(
    app: FastifyInstance,
    _opts: unknown,
    done: () => void,
  ) {
    const undeclared: string[] = [];

    app.addHook('onRoute', (route) => {
      if (isGenerated(route)) return;
      if (route.config?.access === undefined) {
        undeclared.push(`${String(route.method)} ${route.url}`);
      }
    });

    // onReady runs after every route is registered and before the server
    // listens, so this fails the boot rather than the first request.
    app.addHook('onReady', (ready) => {
      ready(
        undeclared.length > 0 ? new MissingRoutePermissionError(undeclared) : undefined,
      );
    });

    done();
  },
  { name: 'route-permissions' },
);
