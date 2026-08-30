# Backend Security

Tenant isolation (BR-001), role control (BR-003) and audit (BR-013) are the
three Critical requirements. They are built in Phase 1, not hardened later.

## 1. Tenant isolation — two independent layers

**Layer 1 — application.** A Fastify `preHandler` resolves the active business
from the authenticated session, verifies membership is active, and loads the
caller's effective permissions onto the request. No handler reads `business_id`
from a request body or query string, ever.

**Layer 2 — database (the one that saves you).** Every tenant table carries an
RLS policy:

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
  USING (business_id = current_setting('app.business_id', true)::uuid);
```

Every request runs inside a transaction that sets it:

```ts
await withTenant(businessId, async (tx) => { /* all queries here */ });
```

A forgotten `WHERE business_id = ...` then returns **nothing** instead of
another tenant's rows. Use `FORCE ROW LEVEL SECURITY` so the table owner is not
exempt, and make sure the application's DB role is not `SUPERUSER` or `BYPASSRLS`.

**The test that must exist from day one:** authenticate as business A, request a
known ID belonging to business B, assert **404**. Not 403 — a 403 confirms the
row exists, which is itself a leak. Run it against every collection endpoint,
automatically.

## 2. Authentication

- Mobile number + OTP. No passwords to leak.
- **OTP:** 6 digits from a CSPRNG, hashed at rest, 5-minute expiry, max 5
  verification attempts, single-use, invalidated on success.
- **Rate limits:** per phone number, per IP, and a global circuit breaker.
  Without these, OTP endpoints are an SMS-billing denial-of-wallet attack.
- **Never log an OTP.** Redaction is configured in pino, not remembered.
- **Tokens:** short-lived access JWT (15 min) + long-lived refresh token with
  **rotation and reuse detection** — if an already-used refresh token is
  presented, revoke the whole family and force re-authentication.
- Refresh tokens are stored hashed, are per-device, and are individually
  revocable so a lost phone can be cut off (BRD §19).
- Tokens live in the device secure store (Keychain / Keystore), never in
  AsyncStorage or MMKV.
- Enumeration: the OTP-request response is identical whether or not the number
  is registered.

## 3. Authorization

- Permissions are string keys (`orders.write`, `labour.wages.settle`,
  `labour.attendance.amend`, `audit.view`), not role checks scattered in code.
- Roles are seeded rows granting sets of permissions; per-member overrides refine.
- Each route declares its required permission in the module's `policy.ts`.
  A route with no declared permission fails a startup assertion — you cannot
  forget one silently.
- **Privilege escalation tests:** a Manager cannot settle wages, a Staff member
  cannot view audit, a Partner cannot remove the Owner.

## 4. Input & output

- Every request body, query and param is parsed by a Zod schema from
  `@daybook/contracts`. Unvalidated input never reaches a service.
- Reject unknown keys (`.strict()`) on write endpoints.
- Structured error envelope; no stack traces, no ORM errors, no SQL to clients.
- Body size limits, and a hard cap on batch sizes for the sync endpoint.
- Rate limit globally, and tightly on auth and file-signing endpoints.

## 5. Media

- **Private bucket. No public objects, ever.** Block Public Access on.
- Upload: client requests a presigned PUT (permission-checked, content-type and
  size constrained), uploads directly, then confirms so the API writes the
  `attachments` row. An object with no row is garbage-collected by a job.
- Download: short-lived presigned GET (default 300s), issued **only after** the
  permission check on the owning record.
- Storage keys include `business_id` and are random — never guessable, never
  derived from a filename.
- Validate real content type server-side; do not trust the client's header.
- Deleting financial evidence is permission-gated and audited.

## 6. Audit

- One append-only `audit_logs` table: actor, business, entity type and id,
  action, before/after JSONB, timestamp, request id, IP, app version.
- **Written in the same transaction as the change.** An audit row that can fail
  independently of the write it describes is not an audit trail.
- No UPDATE or DELETE grant on the table for the application role.
- Mandatory for: authentication events, membership and permission changes, and
  every change to money, attendance or wages.

## 7. Secrets & configuration

- Secrets only in the platform secret store. Never in the repo, never in
  `app.config.ts`, never in an EAS build profile.
- **`EXPO_PUBLIC_*` is public** — it is compiled into the app bundle. Anyone can
  read it. Nothing sensitive gets that prefix.
- Validate all env vars at boot with a Zod schema and fail fast on a missing one.
- Rotate JWT secrets without invalidating everything: keep a key id in the token
  header and accept the previous key during a rotation window.

## 8. Data protection

- TLS everywhere; HSTS; no plaintext listener.
- Encryption at rest on the database and the bucket.
- Automated daily backups with point-in-time recovery, and **a restore rehearsed
  before launch**. An untested backup is a hope, not a backup.
- Personal data: worker mobile numbers and photographs are personal data. They
  are visible only to the owning business, and an account deletion route must
  exist (also a Google Play requirement).
- Dependency scanning in CI; `pnpm audit` on a schedule.

## Release checklist

- [ ] RLS enabled **and forced** on every tenant table; app role lacks BYPASSRLS
- [ ] Cross-tenant 404 test passes on every collection endpoint
- [ ] Privilege-escalation tests pass for all four roles
- [ ] Every route declares a permission (startup assertion green)
- [ ] OTP rate limits verified under load
- [ ] Refresh rotation + reuse detection verified
- [ ] No public bucket objects; signed URLs expire as configured
- [ ] Audit rows written transactionally; table append-only
- [ ] No secret in the repo or the app bundle (scanned)
- [ ] Backup restore drill completed and documented in the runbook
