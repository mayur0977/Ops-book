# apps/api

Fastify 5 + TypeScript + Drizzle + PostgreSQL. Read the root `CLAUDE.md` first.

## Layout

```
src/
  modules/<domain>/     routes.ts  service.ts  policy.ts  *.test.ts
  db/                   schema/  migrations/  client.ts  rls.ts
  platform/             sms/  push/  storage/  queue/    (swappable providers)
  lib/                  money.ts  audit.ts  idempotency.ts  errors.ts
```

One folder per domain, sliced vertically. A module owns its routes, its
business logic, its authorization policy and its tests. Cross-module reads go
through the other module's service, never straight into its tables.

## Rules specific to this app

- **Schemas come from `@daybook/contracts`.** Do not define a request or
  response shape locally — the mobile app imports the same object.
- **Every route declares its permission** in `policy.ts`. Authorization is never
  inline in a handler.
- **Every DB call runs inside `withTenant(businessId, fn)`** which opens the
  transaction and sets `app.business_id`. Bare `db.select()` in a request path
  is a bug — RLS will (correctly) return nothing.
- **Providers are abstractions.** `platform/sms` has a `console` driver so auth
  can be built and tested before DLT registration completes. Same pattern for
  push and storage. Never import a vendor SDK outside `platform/`.
- **Errors** use the shared envelope in `lib/errors.ts`. No raw throws to the
  client, no stack traces in responses.
- **Logs** are structured (pino). OTPs, tokens and full phone numbers are
  redacted by config — never by remembering to.

## Testing

Integration tests hit a real Postgres from `compose.yaml`. Every collection
endpoint needs the cross-tenant test: authenticate as business A, request a
known ID from business B, expect 404 (not 403 — 403 confirms the row exists).
