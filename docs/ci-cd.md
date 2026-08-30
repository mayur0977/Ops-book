# CI/CD

One repository, one workflow set, two deployables.

## Pipelines

| Trigger | Runs |
|---|---|
| **Pull request** | Typecheck + lint the whole workspace (cheap, catches cross-package breakage). Vertical-leak check. Then `turbo run test --filter=...[origin/main]` — only affected packages. API changes additionally run integration tests against a real Postgres service and a migration dry-run. Mobile changes additionally produce an EAS preview build. |
| **Merge to `main`** | Build and push the API image, deploy to staging, run migrations. Publish the generated `openapi.json` as documentation. EAS Update to the preview channel. |
| **Tag `api-v*`** | Deploy production, run migrations as a separate reviewed step, create the Sentry release. |
| **Tag `app-v*`** | EAS production build → TestFlight / Play internal testing, with the matching Sentry release. |

A change touching `packages/contracts` correctly affects both applications and
runs everything. That is the point of the monorepo.

## Environments

| Env | Where | Notes |
|---|---|---|
| `dev` | Local Docker Compose | Postgres, Redis, MinIO, `SMS_PROVIDER=console` |
| `staging` | Auto-deployed from `main` | Where EAS preview builds point |
| `production` | Deployed on an `api-v*` tag | Migrations are a separate, reviewed step |

## Hosting (start small, stay portable)

Managed platform first — Fly.io or Railway for the API, Neon or RDS for
Postgres, S3 or Cloudflare R2 for media, managed Redis for BullMQ. Everything
containerised, so a later move to a larger cloud footprint is a deployment
change rather than a rewrite. R2 is worth evaluating specifically because media
egress is the one unbounded cost in this product.

Building an ECS estate before the pilot has daily usage is deferred deliberately.

## Non-negotiables

- Branch protection on `main`. Migrations reviewed as their own commit.
- Every migration reversible, or shipped with a written backout plan.
- Daily automated Postgres backups with PITR, and **a restore rehearsed before
  launch** — see `docs/runbook.md`.
- Secrets only in the platform secret store, injected at deploy. Never in the
  repo, never in an EAS build profile.
- EAS Update ships JS-only fixes without a store review. Native module changes
  still need a full build — plan releases around that.
- The API image builds from the **repo root** (it needs `packages/*`).

## Required secrets

| Secret | Used by |
|---|---|
| `DATABASE_URL` | api deploy, migrations |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | api |
| `S3_*` | api |
| `SMS_API_KEY`, `SMS_SENDER_ID`, `SMS_TEMPLATE_ID_OTP` | api |
| `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | api, mobile |
| `EXPO_TOKEN` | mobile builds |
| `FLY_API_TOKEN` (or platform equivalent) | api deploy |
