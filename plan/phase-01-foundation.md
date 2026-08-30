# Phase 1 — Foundation

**Size:** XL — the largest phase, and the one that cannot be retrofitted
**Depends on:** Phase 0
**Goal:** multi-tenant identity, membership, permissions and audit work
end-to-end, and a member of one business provably cannot reach another's data.

## Why now

Tenancy, permissions, audit and idempotency are load-bearing. Every later phase
sits on them. Retrofitting any one of them means rewriting everything above it.

## Tasks

### Design first — before any feature code
- [ ] Finalise `docs/ERD.md` for the Phase 1–4 tables
- [ ] Finalise `docs/permissions.md` — the full key list
- [ ] Confirm the sync contract in `docs/sync-contract.md`

### Workspace
- [ ] `packages/config` — tsconfig, eslint (incl. restricted-imports rule), prettier
- [ ] `packages/contracts` — Zod setup, money refinement, error envelope
- [ ] `packages/core` — `money.ts` (decimal.js), permission evaluation

### Database
- [ ] Drizzle + migration setup, seed script
- [ ] `users`, `sessions`, `refresh_tokens`, `otp_requests`
- [ ] `businesses`, `business_members`, `roles`, `permissions`,
      `role_permissions`, `member_permissions`
- [ ] `audit_logs` (append-only: no UPDATE/DELETE grant)
- [ ] `idempotency_keys`
- [ ] **RLS enabled AND forced** on every tenant table
- [ ] `withTenant(businessId, fn)` helper setting `app.business_id`
- [ ] Verify the app DB role lacks `BYPASSRLS`

### API
- [ ] Fastify bootstrap, Zod type provider, OpenAPI generation
- [ ] Env validation at boot (fail fast on a missing secret)
- [ ] Structured error envelope; pino with OTP/token redaction
- [ ] `platform/sms` abstraction + `console` driver
- [ ] `POST /auth/otp/request`, `/auth/otp/verify` with rate limits
- [ ] Refresh rotation **with reuse detection**
- [ ] Businesses: create (with vertical), join by code, switch, regenerate code
- [ ] Members, roles, permission overrides
- [ ] `preHandler`: resolve business, verify membership, load permissions
- [ ] Startup assertion: **every route declares a permission**
- [ ] Idempotency middleware (`Idempotency-Key`)
- [ ] Audit writer — same transaction as the change
- [ ] `/health`

### Mobile
- [ ] Expo scaffold, expo-router, NativeWind
- [ ] **`src/ui/theme/`** — implement the "Ledger" tokens from
      `docs/design/design-system.md`: colour (light + dark), type scale, space,
      radius, motion durations. One file. Everything else reads from it.
- [ ] **`src/ui/` primitives** — `Row` (with margin rail), `Chip`, `Amount`
      (tabular), `Field`, `SectionHeader`, `Sheet`, `EmptyState`, `Button`
- [ ] Reanimated + gesture-handler + expo-haptics wired; `useReducedMotion()`
      helper in place before the first animated component
- [ ] **Prove a `@opsbook/contracts` import resolves on a physical device**
      before writing features — Metro + pnpm is the classic trap
- [ ] Secure token storage (Keychain/Keystore, not MMKV)
- [ ] OTP login flow
- [ ] Business create / join / switch
- [ ] Tab shell: Home, Orders, Add, Labour, More
- [ ] Typed API client on `@opsbook/contracts`

### Tests
- [ ] **Cross-tenant 404 test** on every collection endpoint (the one that matters)
- [ ] Privilege-escalation tests for all four roles
- [ ] OTP rate limit and expiry tests
- [ ] Refresh reuse-detection test
- [ ] Idempotency replay test
- [ ] Audit-written-in-transaction test

## Exit criteria

- [ ] Two businesses exist; a member of A gets **404** for a known ID in B —
      as an automated test, on every collection endpoint
- [ ] Every route declares a permission (startup assertion green)
- [ ] Login works on a real iOS and a real Android device
- [ ] A user belongs to two businesses and can switch between them
- [ ] A repeated request with the same `Idempotency-Key` returns the original
      response and creates nothing new
- [ ] Audit rows appear for auth, membership and permission changes
- [ ] `pnpm typecheck && pnpm test && pnpm check:vertical-leak` green in CI

## Out of scope

Orders, money, labour, media, sync engine. Phase 1 ships an app you can log into
that has almost nothing in it — that is correct.

## Notes

The idempotency middleware and `client_uuid` columns land **here**, not in
Phase 9. Phase 9 is only tractable because of it.
