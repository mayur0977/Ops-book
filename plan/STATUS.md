# Status

**Updated:** 2026-08-31
**Current phase:** 1 — Foundation. Design, Workspace, Database, API bootstrap,
auth and tenancy over HTTP are done (28/51). Members and roles are next.
**Next task:** Member management — list, role change, permission overrides —
which also completes the privilege-escalation tests for partner and manager.
Then the mobile app.

## Shipped

**Phase 1 Workspace block — complete, and this is the first application code in
the repo.** Everything before this commit was documentation.

**`@daybook/config`** — the shared toolchain. `tsconfig.base.json` lives here
and the root file extends it, not the reverse: a `../../` inside the package
resolves against the `node_modules` symlink and breaks the moment a package
consumes it. That was found and fixed, not theorised.

**`@daybook/contracts`** — Zod 4 schemas: money as a validated decimal string,
the error envelope with its status map, E.164 phone, `client_uuid`,
`Idempotency-Key`, the 39-key permission catalogue, and the auth and business
request/response shapes. 34 tests.

**`@daybook/core`** — `money.ts` on decimal.js (add, subtract, sum, multiply,
compare, and a `splitMoney` that always reconciles to the paisa) and permission
evaluation implementing the tri-state resolution order plus invariants 2, 3
and 4 from `docs/permissions.md`. Default role grants transcribed from the
matrix. 42 tests.

**Client-safety is enforced twice.** `scripts/check-client-safe.mjs` checks the
source *and* the declared dependencies — which no linter can see — and runs as
its own CI step next to the vertical-leak check. Both guards were verified with
a deliberate violation, not assumed.

**ADR 0008 — oxlint instead of ESLint.** `typescript-eslint` throws at module
load against TypeScript 7 (`does not support TS 7.0`), in its latest release and
its canary alike. The choice was TypeScript 6 or a different linter; oxlint won
because it never loads the TypeScript API, so the coupling cannot break again.

**Tenancy works over HTTP.** Create a business (seeded with all four system
roles and their grants), join by code, list your memberships, rotate the code.
A `preHandler` resolves the business, verifies membership and loads effective
permissions before any handler runs, and each route declares the permission it
needs.

**404, never 403, across the tenant boundary** — and a test asserts that a
business you are not in and a business that does not exist give byte-identical
answers. Within a business the answer is 403, because there the resource is
yours to know about and only the capability is missing.

**Three RLS design faults surfaced by writing the API on top of it**, each
fixed with a narrow policy rather than an escape hatch: `roles` stayed
tenant-scoped while queries joined it without a tenant (silently returning "you
belong to nothing"); the switcher needed a user's own memberships before any
business was chosen (migration 0003); and joining by code is by definition a
read by a non-member (migration 0004, where knowing the code is the credential).

**Audit writer takes a `tx`, never a `db`** — so writing an audit row outside
the transaction it describes is not expressible, rather than merely discouraged.

**Auth works end to end**, verified against a running server rather than only
through `app.inject`: request a code, read it from the console driver, verify,
rotate, and see a replay refused. Phone is the identity; there is no password.

**Refresh reuse detection revokes the whole family**, and a test asserts the
rows rather than the status code — which caught a serious bug. The revocation
had been running inside the transaction that then threw, so the rollback undid
it: callers saw a correct 401 while every token in the family stayed live. It
looked handled and was not. Revocation now commits in its own transaction.

**The OTP endpoints cannot enumerate users.** A registered and an unregistered
number get identical responses, and wrong, expired and never-requested codes
all return one error. Codes are argon2id hashes, never stored or logged in the
clear — the only place a code appears is the dev console driver, which
`loadEnv` refuses when NODE_ENV=production.

**Denial-of-wallet guards are in place before any live provider**: resend
cooldown, per-number per day, per-IP per hour, and a global daily ceiling whose
rejection message deliberately does not reveal that a ceiling exists.

**API bootstrap done.** Fastify 5 with the Zod type provider, so the schemas the
mobile app imports are the ones the server enforces. Env validated at boot —
a missing secret is a startup failure, not a 500 found by the first user to log
in. Structured error envelope on every path, including 404 and unhandled
throws, which never leak an internal message. `/health` deliberately does not
touch Postgres: restarting a working process because a dependency blipped turns
a short outage into a longer one.

**Every route declares a permission, enforced at boot.** A route registered
without `config: { access: … }` fails an `onReady` assertion and the server
refuses to start. Neither allow-by-default nor deny-by-default exists — the
first is a security bug, the second is a bug a user finds in production.

**Log redaction is tested against real pino output**, not against the config: a
redaction path that matches nothing looks exactly like one that works. OTP
codes, token hashes and the authorization header are scrubbed, while the
surrounding context survives so the line stays useful.

**Database block complete.** 12 tables per `docs/ERD.md`, three migrations, a
seed script for the permission catalogue, and `withTenant()`.

**Two real bugs found by writing the tests rather than by reading the code:**

1. **The app was connecting as a superuser**, so every RLS policy was present
   and silently ignored. Postgres makes `POSTGRES_USER` a superuser and a
   superuser bypasses RLS whether or not it is FORCEd. Migration 0002 adds the
   unprivileged `daybook_app` role the API now uses. This is exactly the failure
   `docs/ERD.md` called "silently catastrophic", and it is why that line said to
   make it a test rather than a habit.
2. **`current_setting` returns an empty string, not NULL**, on a pooled
   connection whose earlier transaction set the tenant. `''::uuid` raises 22P02,
   so the policies would have thrown intermittent 500s under load. All policies
   now route through a `current_business_id()` function that collapses both
   cases to NULL.

**Audit is append-only twice over** — the grant is withheld *and* a trigger
refuses UPDATE/DELETE. The grant alone is not enough, because the migration role
owns the table and an owner bypasses its own grants.

**Postgres 18 mount fix** — `compose.yaml` mounted `/var/lib/postgresql/data`,
which makes the postgres:18 container exit on start. It wants a single mount at
`/var/lib/postgresql`. `pnpm db:up` now brings all three services up healthy.

## Tested

`pnpm typecheck`, `pnpm lint` and `pnpm test` green across three packages —
**158 tests**: 34 contracts, 42 core, 82 API against real Postgres 18.6. The API
suite includes 14 cross-tenant isolation tests and 6 audit-immutability tests,
all connecting as the unprivileged role. `pnpm check:vertical-leak` and
`pnpm check:client-safe` green; no unmet peer dependency.

Not yet tested: anything touching a database, an HTTP handler or a device. None
of it exists.

## Broken / open

**Phase 0 leftovers:**
- Node is now 24.20.0 and matches `.nvmrc` — that blocker is cleared
- No Expo account yet (`eas login`)
- Repo visibility unconfirmed; branch protection not set
- DLT registration not submitted — weeks of waiting, blocks launch not work

**Repository is PUBLIC** (changed 2026-08-31, was to be private per Phase 0).
History was scanned: no key, token, private key or real `.env` has ever been
committed, and `.env.example` holds only placeholders plus the `local_dev_only`
credentials that match `compose.yaml`. The consequence to keep in mind is that
any secret committed from here is public the instant it is pushed and must be
treated as compromised, not merely removed.

**Still open:**
- **Branch protection on `main` is not enabled** — the one item from this round
  that could not be done from a session. It needs the GitHub web UI or `gh`,
  and `gh` is not installed on this machine. A public repo with an unprotected
  default branch takes direct pushes from anyone with write access.
- oxlint has no type-aware rules. Nothing enforced needs them today. Revisit
  ESLint when typescript-eslint supports TS 7 (their issue #10940).

**Closed this round:**
- CI now also runs on pushes to `develop`, not just `main`
- `.claude/settings.json` deny list narrowed to real secret files, so the
  committed `.env.example` is readable again
- `.env.example` SMS block regrouped: provider, then its credentials, then the
  denial-of-wallet guards

**Outside this project, but a real hazard:**
- `/Users/mayurpatel/.git` exists — the home directory is a git repository with
  zero tracked files. Any `git add -A` from there would stage `.ssh/`, `.aws/`
  and shell history. `rm -rf ~/.git` unless it is deliberate.

## Git

- On `feature/phase-01-foundation`, branched from `develop`
- `1857219` (Workspace block) is committed **and pushed** to origin
- Later repo-hygiene changes are uncommitted in the working tree

## Next

The Database block, in this order, because each step is testable before the
next one is worth writing:

1. Drizzle + drizzle-kit setup and the first migration
2. `users`, `sessions`, `refresh_tokens`, `otp_requests` — no tenancy yet
3. `businesses`, `business_members`, roles and permissions; seed the catalogue
   from `@daybook/contracts` and the grants from `@daybook/core`
4. `audit_logs` and `idempotency_keys`
5. RLS **enabled and forced** on every tenant table, `USING` *and* `WITH CHECK`
6. `withTenant(businessId, fn)`, then the test that the app role lacks
   `BYPASSRLS` — silently catastrophic if wrong, so it is a test, not a habit

Read `docs/ERD.md` first; it is the design this block implements.

---

### How to update this file

Rewrite the sections above at the end of each session. Keep it short — it is a
handover note, not a changelog. Git history is the changelog.
