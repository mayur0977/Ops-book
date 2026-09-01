import { z } from 'zod';
import {
  errorEnvelopeSchema,
  otpRequestResponseSchema,
  otpRequestSchema,
  otpVerifySchema,
  refreshSchema,
  tokenPairSchema,
} from '@daybook/contracts';
import { requestOtp, rotateRefreshToken, verifyOtp } from './service.js';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { AuthDeps } from './service.js';

type AuthContext = Omit<AuthDeps, 'log'>;

const errorResponses = {
  401: errorEnvelopeSchema,
  422: errorEnvelopeSchema,
  429: errorEnvelopeSchema,
};

export function authRoutes(context: AuthContext): FastifyPluginAsyncZod {
  return async (app) => {
    const deps = (log: AuthDeps['log']): AuthDeps => ({ ...context, log });

    app.post(
      '/auth/otp/request',
      {
        // Public by necessity: there is no identity to check before login. The
        // quota checks in the service are what stand in for authorization here.
        config: { access: 'public' },
        schema: {
          body: otpRequestSchema,
          response: { 200: otpRequestResponseSchema, ...errorResponses },
        },
      },
      async (request) => {
        const result = await requestOtp(deps(request.log), {
          phone: request.body.phone,
          ...(request.ip ? { ip: request.ip } : {}),
        });
        return {
          expiresAt: result.expiresAt.toISOString(),
          resendAfterSeconds: result.resendAfterSeconds,
        };
      },
    );

    app.post(
      '/auth/otp/verify',
      {
        config: { access: 'public' },
        schema: {
          body: otpVerifySchema,
          response: {
            200: tokenPairSchema.extend({ userId: z.uuid(), isNewUser: z.boolean() }),
            ...errorResponses,
          },
        },
      },
      async (request) => {
        const session = await verifyOtp(deps(request.log), {
          phone: request.body.phone,
          code: request.body.code,
          ...(request.body.device ? { device: request.body.device } : {}),
        });
        return {
          userId: session.userId,
          isNewUser: session.isNewUser,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          accessTokenExpiresAt: session.accessTokenExpiresAt.toISOString(),
          refreshTokenExpiresAt: session.refreshTokenExpiresAt.toISOString(),
        };
      },
    );

    app.post(
      '/auth/refresh',
      {
        config: { access: 'public' },
        schema: {
          body: refreshSchema,
          response: { 200: tokenPairSchema, ...errorResponses },
        },
      },
      async (request) => {
        const tokens = await rotateRefreshToken(
          deps(request.log),
          request.body.refreshToken,
        );
        return {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          accessTokenExpiresAt: tokens.accessTokenExpiresAt.toISOString(),
          refreshTokenExpiresAt: tokens.refreshTokenExpiresAt.toISOString(),
        };
      },
    );
  };
}
