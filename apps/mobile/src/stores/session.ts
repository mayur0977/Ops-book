import { create } from 'zustand';
import Constants from 'expo-constants';
import {
  membershipSummarySchema,
  tokenPairSchema,
  businessSchema,
  otpRequestResponseSchema,
} from '@daybook/contracts';
import { z } from 'zod';
import { createClient } from '../api/client';
import {
  clearTokens,
  loadActiveBusinessId,
  loadTokens,
  saveActiveBusinessId,
  saveTokens,
} from '../api/storage';

export type Membership = z.infer<typeof membershipSummarySchema>;

interface SessionState {
  status: 'loading' | 'signed-out' | 'signed-in';
  userId: string | null;
  tokens: { accessToken: string; refreshToken: string } | null;
  memberships: Membership[];
  activeBusinessId: string | null;

  restore: () => Promise<void>;
  requestOtp: (phone: string) => Promise<{ resendAfterSeconds: number }>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  refreshMemberships: () => Promise<void>;
  createBusiness: (name: string, vertical: string) => Promise<string>;
  joinBusiness: (joinCode: string) => Promise<string>;
  switchBusiness: (businessId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * `EXPO_PUBLIC_*` is baked into the bundle and is public — which is fine for an
 * API URL and would not be for anything else. Root CLAUDE.md, "things that
 * will bite".
 */
const baseUrl =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3000';

export const useSession = create<SessionState>((set, get) => {
  const client = createClient({
    baseUrl,
    getTokens: () => get().tokens,
    getBusinessId: () => get().activeBusinessId,
    onTokensRefreshed: async (tokens) => {
      set({ tokens });
      await saveTokens(tokens);
    },
    onSessionLost: async () => {
      await clearTokens();
      set({ status: 'signed-out', userId: null, tokens: null, memberships: [] });
    },
  });

  const applySession = async (
    tokens: { accessToken: string; refreshToken: string },
    userId: string,
  ) => {
    await saveTokens(tokens);
    set({ tokens, userId, status: 'signed-in' });
    await get().refreshMemberships();
  };

  return {
    status: 'loading',
    userId: null,
    tokens: null,
    memberships: [],
    activeBusinessId: null,

    /**
     * Run once at launch. A stored token pair is not proof of a live session —
     * it may have been revoked — so the memberships call is what actually
     * confirms it, and a failure there signs the user out cleanly.
     */
    restore: async () => {
      const [tokens, activeBusinessId] = await Promise.all([
        loadTokens(),
        loadActiveBusinessId(),
      ]);
      if (!tokens) {
        set({ status: 'signed-out' });
        return;
      }
      set({ tokens, activeBusinessId });
      try {
        await get().refreshMemberships();
        set({ status: 'signed-in' });
      } catch {
        await clearTokens();
        set({ status: 'signed-out', tokens: null, memberships: [] });
      }
    },

    requestOtp: async (phone) => {
      const result = await client.request('/auth/otp/request', {
        method: 'POST',
        body: { phone },
        schema: otpRequestResponseSchema,
        anonymous: true,
      });
      return { resendAfterSeconds: result.resendAfterSeconds };
    },

    verifyOtp: async (phone, code) => {
      const result = await client.request('/auth/otp/verify', {
        method: 'POST',
        body: { phone, code },
        schema: tokenPairSchema.extend({ userId: z.uuid(), isNewUser: z.boolean() }),
        anonymous: true,
      });
      await applySession(
        { accessToken: result.accessToken, refreshToken: result.refreshToken },
        result.userId,
      );
    },

    refreshMemberships: async () => {
      const result = await client.request('/businesses', {
        schema: z.object({ memberships: z.array(membershipSummarySchema) }),
      });
      const active = result.memberships.filter((m) => m.status === 'active');
      const current = get().activeBusinessId;

      // Keep the current selection if it is still valid; otherwise fall back to
      // the first business rather than leaving the app in a stateless limbo.
      const next =
        current && active.some((m) => m.businessId === current)
          ? current
          : (active[0]?.businessId ?? null);

      set({ memberships: result.memberships, activeBusinessId: next });
      await saveActiveBusinessId(next);
    },

    createBusiness: async (name, vertical) => {
      const result = await client.request('/businesses', {
        method: 'POST',
        // The device generates the id, so a retry after a dead network finds
        // the first business instead of creating a rival.
        body: { clientUuid: crypto.randomUUID(), name, vertical },
        schema: z.object({ business: businessSchema, roleKey: z.string() }),
      });
      await get().switchBusiness(result.business.id);
      await get().refreshMemberships();
      return result.business.id;
    },

    joinBusiness: async (joinCode) => {
      const result = await client.request('/businesses/join', {
        method: 'POST',
        body: { joinCode },
        schema: z.object({ businessId: z.uuid(), status: z.string() }),
      });
      await get().refreshMemberships();
      await get().switchBusiness(result.businessId);
      return result.businessId;
    },

    /** Switching is just which id the client sends; nothing is re-fetched here. */
    switchBusiness: async (businessId) => {
      set({ activeBusinessId: businessId });
      await saveActiveBusinessId(businessId);
    },

    signOut: async () => {
      await Promise.all([clearTokens(), saveActiveBusinessId(null)]);
      set({
        status: 'signed-out',
        userId: null,
        tokens: null,
        memberships: [],
        activeBusinessId: null,
      });
    },
  };
});

export const useActiveMembership = (): Membership | null => {
  const { memberships, activeBusinessId } = useSession();
  return memberships.find((m) => m.businessId === activeBusinessId) ?? null;
};
