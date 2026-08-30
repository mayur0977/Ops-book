# What DayBook costs, and when

Phase by phase: what gets built, what you have to sign up for, and what it
bills you. The short version is that **nothing costs money until Phase 11**.

Prices move. Treat every figure here as an ordering and a rough size, not a
quote — check the current number on the provider's own page before you buy.

## What each phase covers

| # | Phase | What gets built | Size |
|---|---|---|---|
| 0 | Prerequisites | Repo, rules, docs, CI, design system. Free accounts only. DLT registration starts here because it is slow. | S |
| 1 | Foundation | Tenancy + RLS, OTP auth, refresh rotation, roles and permissions, audit log, idempotency and `client_uuid` groundwork. | XL |
| 2 | Vertical config | Custom fields, per-business statuses/categories/units, terminology overrides, module toggles. | L |
| 3 | Contacts & orders | Customers, suppliers, orders, items, order numbering, status workflow, timeline. | L |
| 4 | Money | Payments, expenses, order balance, per-payer contribution. Decimal-exact, audited, void-not-delete. | M |
| 5 | Labour & wages | Workers, crews, wage profiles, muster roll, OT, piece rate, advances, deductions, settlements, append-only ledger. | XL |
| 6 | Attachments | Photo capture, compression, presigned upload/download, thumbnail worker, offline photo queue. | M |
| 7 | Stock & machinery | Materials, stock movements, landed cost, machines, maintenance logs. | L |
| 8 | Tasks & notifications | Tasks, reminders, BullMQ schedulers, the 20:30 end-of-day push, notification inbox. | M |
| 9 | Offline sync | SQLite mirror, outbox state machine, push/pull cursors, conflict inbox, sync chip. | XL |
| 10 | Reports & KPIs | 15 reports, 13 KPIs, CSV/PDF export, dashboard tiles. | L |
| 11 | Hardening & launch | Security sweep, load test, restore drill, store listings, TestFlight/Play testing, UAT. | L |

Phases 0–5 are the pilot-usable milestone — the furniture business can run on
it from there. Phases 6–11 turn it into something other people can be handed.

## When money is actually spent

| Phase | What you set up | Cost |
|---|---|---|
| 0 — now | Free Expo account (`eas login`), free Apple ID for the Simulator, private GitHub repo, Docker Desktop | none |
| 0 — background | **DLT registration** (TRAI, via any operator portal): entity, header `DAYBOK`, OTP template | small one-time fee, weeks of waiting |
| 1–2 | Nothing. Expo Go on an Android phone, `SMS_PROVIDER=console` | none |
| 3 | EAS Android development builds, sideloaded as an APK. Free-tier build quota | none |
| 6 | MinIO locally stands in for S3 | none |
| 8 | Firebase project for FCM push on Android — free, and separate from Play Console. iOS push is the only part that needs the paid Apple account | none on Android |
| 11 | **Apple Developer Program** — TestFlight, non-expiring builds, iOS push, App Store | $99/yr |
| 11 | **Google Play Console** — only for a public listing | $25 once |
| 11 | Production hosting — API, Postgres, Redis, object storage, Sentry | see below |
| 11 | Real SMS via MSG91, once DLT clears | ~₹0.12–0.20 per OTP |
| 11 | Domain — the privacy policy and web account-deletion route are store requirements | ~₹1,000/yr |

Both developer accounts are deferred deliberately. Android sideloading needs no
account at all, which is how the pilot runs. Your own iPhone works with a free
Apple ID, though the app expires every 7 days. See `docs/device-testing.md`.

The bundle identifier `com.mayurpatel.daybook` is **permanent once published**.
Check name availability on both stores before registering either account.

## Where the database lives, and what changes

| Env | Where | Postgres | Redis | Storage | SMS |
|---|---|---|---|---|---|
| dev | Local Docker Compose (`pnpm db:up`) | container | container | MinIO container | `console` |
| staging | Auto-deploys from `main` | managed, small | managed | bucket | `console` or test credentials |
| production | Deploys on an `api-v*` tag | managed, with PITR | managed | S3 or R2 | MSG91 |

Going from local to hosted changes six things:

1. `DATABASE_URL` moves to the platform secret store, injected at deploy. Never
   in the repo, never in an EAS build profile.
2. **The app database role is recreated properly.** RLS enabled *and forced* on
   every tenant table, and the app role must not hold `BYPASSRLS`. Managed
   providers hand you a broadly-privileged role by default, so the restricted
   one is yours to create. This is the highest-risk step of the migration.
3. Migrations become a separate reviewed deploy step, not something that runs
   on boot.
4. Backups become real: daily automated, point-in-time recovery, and a restore
   drill rehearsed and timed before launch — a Phase 11 exit criterion, recorded
   in `docs/runbook.md`.
5. MinIO becomes S3 or R2. Phase 6 builds the `platform/storage` abstraction
   precisely so this is a configuration change rather than a rewrite.
6. Redis becomes managed, because BullMQ jobs — thumbnails, the EOD sweep,
   maintenance reminders — now have to survive a restart.

### Rough production bill

| Piece | Pick | Ballpark |
|---|---|---|
| API | Fly.io or Railway | $5–20/mo |
| Postgres | Neon or RDS | free tier, then ~$19–25/mo once PITR is needed |
| Redis | Managed (Upstash, or a platform add-on) | $0–10/mo |
| Object storage | Cloudflare R2 | ~$0.015/GB-month, no egress charge |
| Errors | Sentry | free tier is enough at pilot scale |
| SMS | MSG91 | ~₹0.15 per OTP sent |

Roughly **$10–40 a month** once production is live, and nothing before that.
Everything is containerised, so a later move to a larger cloud footprint is a
deployment change. See `docs/ci-cd.md`.

## Two costs that can run away

**Denial of wallet on the OTP endpoint.** An unprotected `/auth/otp/request` can
be looped by a script, and every hit bills an SMS. At ₹0.15 each that is
thousands of rupees overnight. Required before real SMS is switched on: a
per-number cooldown, a per-IP hourly cap, a global daily ceiling that hard-fails
rather than billing further, spike alerting, and a provider-side spend cap.
Built in Phase 1, verified in Phase 11. See `docs/otp-sms.md`.

**Media egress.** Every photo view is a download, and it is the one unbounded
cost in the product. That is why R2 is preferred over S3, and why Phase 6
compresses to roughly 1600px on the long edge by default.

## Related

- `docs/device-testing.md` — running on a real device without paying anyone
- `docs/otp-sms.md` — DLT, providers, and the console driver
- `docs/ci-cd.md` — environments, hosting, required secrets
- `docs/runbook.md` — backup and restore procedure
