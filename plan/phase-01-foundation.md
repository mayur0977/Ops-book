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
- [x] Finalise `docs/ERD.md` for the Phase 1–4 tables — conventions, auth tables
      with refresh reuse detection, tenancy, append-only audit, idempotency,
      and the RLS policy shape (`USING` **and** `WITH CHECK`)
- [x] Finalise `docs/permissions.md` — full key catalogue, tri-state member
      overrides, default grants per role, and six enforced invariants
- [x] Confirm the sync contract in `docs/sync-contract.md` — reviewed, unchanged;
      `Idempotency-Key` + `client_uuid` land in this phase as designed

### Workspace
- [x] `packages/config` — tsconfig, lint (incl. restricted-imports rule), prettier.
      Linter is **oxlint**, not ESLint — typescript-eslint cannot load against
      TypeScript 7. See ADR 0008.
- [x] `packages/contracts` — Zod setup, money refinement, error envelope
- [x] `packages/core` — `money.ts` (decimal.js), permission evaluation

### Database
- [x] Drizzle + migration setup, seed script
- [x] `users`, `sessions`, `refresh_tokens`, `otp_requests`
- [x] `businesses`, `business_members`, `roles`, `permissions`,
      `role_permissions`, `member_permissions`
- [x] `audit_logs` (append-only: no UPDATE/DELETE grant, **and** a trigger —
      the migration owner bypasses grants, so the grant alone was not enough)
- [x] `idempotency_keys`
- [x] **RLS enabled AND forced** on every tenant table (7 tables, verified by test)
- [x] `withTenant(businessId, fn)` helper setting `app.business_id`
- [x] Verify the app DB role lacks `BYPASSRLS` — it did have it. Postgres makes
      `POSTGRES_USER` a superuser, so every policy was silently ignored until
      migration 0002 introduced the unprivileged `daybook_app` role.

### API
- [x] Fastify bootstrap, Zod type provider. OpenAPI generation deferred until
      routes exist to describe — an empty spec is not worth wiring
- [x] Env validation at boot (fail fast on a missing secret)
- [x] Structured error envelope; pino with OTP/token redaction (12 tests
      against real pino output, not against the config)
- [x] `platform/sms` abstraction + `console` driver
- [x] `POST /auth/otp/request`, `/auth/otp/verify` with rate limits — resend
      cooldown, per-number/day, per-IP/hour and a global denial-of-wallet ceiling
- [x] Refresh rotation **with reuse detection** — replay revokes the whole
      family and its session
- [ ] Businesses: create (with vertical), join by code, switch, regenerate code
- [ ] Members, roles, permission overrides
- [ ] `preHandler`: resolve business, verify membership, load permissions
- [x] Startup assertion: **every route declares a permission** — the server
      refuses to boot, so neither allow-by-default nor deny-by-default exists
- [ ] Idempotency middleware (`Idempotency-Key`)
- [ ] Audit writer — same transaction as the change
- [x] `/health`

### Mobile
- [ ] Expo scaffold, expo-router, NativeWind
- [ ] **`src/ui/theme/`** — implement the "Ledger" tokens from
      `docs/design/design-system.md`: colour (light + dark), type scale, space,
      radius, motion durations. One file. Everything else reads from it.
- [ ] **`src/ui/` primitives** — `Row` (with margin rail), `Chip`, `Amount`
      (tabular), `Field`, `SectionHeader`, `Sheet`, `EmptyState`, `Button`
- [ ] Reanimated + gesture-handler + expo-haptics wired; `useReducedMotion()`
      helper in place before the first animated component
- [ ] **Prove a `@daybook/contracts` import resolves on a physical device**
      before writing features — Metro + pnpm is the classic trap
- [ ] Secure token storage via `expo-secure-store` (Keychain/Keystore)
- [ ] **Avoid `react-native-mmkv` until Phase 3** — it is not in Expo Go and
      would force development builds before the fast loop has earned it.
      Use AsyncStorage for cursors and preferences until then.
      See `docs/device-testing.md`.
- [ ] OTP login flow
- [ ] Business create / join / switch
- [ ] Tab shell: Home, Orders, Add, Labour, More
- [ ] Typed API client on `@daybook/contracts`

### Tests
- [ ] **Cross-tenant 404 test** on every collection endpoint (the one that
      matters) — database layer done (14 tests); the per-endpoint sweep waits
      on the endpoints existing
- [ ] Privilege-escalation tests for all four roles
- [x] OTP rate limit and expiry tests
- [x] Refresh reuse-detection test
- [ ] Idempotency replay test
- [x] Audit-written-in-transaction test (6 tests, incl. UPDATE/DELETE refusal)

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
