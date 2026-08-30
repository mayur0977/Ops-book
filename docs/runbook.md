# Runbook

> Filled in as phases land. Every operational procedure lives here, not in
> someone's memory.

## Local setup

```bash
nvm use                 # Node 24.20.0
corepack enable && corepack prepare pnpm@11.24.0 --activate
pnpm install
cp .env.example .env    # fill in secrets
pnpm db:up              # postgres + redis + minio
pnpm dev
```

## Deploy — API

_To be written in Phase 1._ Tag `api-vX.Y.Z`; migrations run as a separate
reviewed step; verify `/health` before switching traffic.

## Deploy — Mobile

_To be written in Phase 1._ Tag `app-vX.Y.Z`. JS-only change → EAS Update.
Native module change → full EAS build and store submission.

## Backup & restore drill

**Must be rehearsed before launch (Phase 11 exit criterion).**

1. Take a fresh snapshot.
2. Restore into a scratch database.
3. Run the API against it.
4. Verify: business count, order count, a known wage settlement total.
5. Record the elapsed time here. An untested backup is a hope, not a backup.

Last drill: _never — outstanding._

## Incident: suspected cross-tenant data exposure

1. Capture the request id and the audit rows.
2. Verify RLS is enabled **and forced** on the table involved.
3. Confirm the app DB role lacks `BYPASSRLS`.
4. Add the failing case to the cross-tenant test suite **before** fixing.

## Incident: OTP delivery failure

1. Check the SMS provider dashboard and DLT template status.
2. Check the rate limiter — a spike may be a denial-of-wallet attempt.
3. `SMS_PROVIDER=console` is development only. Never set it in production.

## Rotating JWT secrets

Keys carry a key id in the token header. Add the new key, accept both for the
refresh TTL window, then remove the old one.
