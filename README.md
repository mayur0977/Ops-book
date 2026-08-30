# DayBook

A mobile-first operations tracker for small production and service businesses —
orders, payments, expenses, materials, **labour attendance and wages**,
machinery and photographic evidence. Offline-first, multi-tenant, and
industry-agnostic: a furniture workshop, a fabrication unit and a garage run
the same core with different configuration.

> **DayBook** — the bookkeeping term for the *book of original entry*: the
> first place a transaction is written down. Which is exactly what this is.

## Structure

```
apps/api              Fastify 5 + Drizzle + PostgreSQL
apps/mobile           Expo SDK 57 (iOS + Android)
packages/contracts    Zod schemas — THE API contract, shared by both apps
packages/core         Money, wage maths, permissions — shared, pure
packages/verticals    Per-industry seed packs (the only industry-aware code)
packages/config       Shared tsconfig / eslint / prettier
docs/                 Requirements, security, design, ADRs
plan/                 Phase-by-phase delivery plan  ← start here
```

One repository, two deployables. Both apps import the same schemas, so contract
drift is impossible rather than merely detected ([ADR 0001](docs/decisions/0001-monorepo.md)).

## Getting started

```bash
nvm use                                            # Node 24.20.0
corepack enable && corepack prepare pnpm@11.24.0 --activate
pnpm install
cp .env.example .env                               # fill in secrets
pnpm db:up                                         # postgres + redis + minio
pnpm dev
```

## Where to look

| | |
|---|---|
| **What we're doing right now** | [`plan/STATUS.md`](plan/STATUS.md) |
| All phases | [`plan/ROADMAP.md`](plan/ROADMAP.md) |
| How we work | [`plan/README.md`](plan/README.md) |
| Requirements | [`docs/PRD.md`](docs/PRD.md) · [`docs/BRD.md`](docs/BRD.md) |
| Why it's built this way | [`docs/decisions/`](docs/decisions/) |
| Generic / multi-industry model | [`docs/verticals.md`](docs/verticals.md) |
| Backend security | [`docs/security.md`](docs/security.md) |
| Mobile design (Apple HIG) | [`docs/design/apple-hig.md`](docs/design/apple-hig.md) |
| Offline sync contract | [`docs/sync-contract.md`](docs/sync-contract.md) |
| CI/CD | [`docs/ci-cd.md`](docs/ci-cd.md) |
| Testing on a real phone, free | [`docs/device-testing.md`](docs/device-testing.md) |
| OTP / SMS in India | [`docs/otp-sms.md`](docs/otp-sms.md) |
| Rules for Claude | [`CLAUDE.md`](CLAUDE.md) |

## Working with Claude Code

`CLAUDE.md` files load automatically — root plus one per app and package.
Slash commands:

| Command | Does |
|---|---|
| `/status` | Where are we, what's next |
| `/next` | Build the next task in the current phase |
| `/phase-check` | Verify exit criteria before closing a phase |
| `/wrap` | Update STATUS.md and hand off |
| `/commit` | Review, gate, stage and commit — add `push` to push too |

## Scope boundaries

Not a statutory accounting, taxation or payroll system. It maintains an
operational wage ledger — it does not compute PF, ESI, professional tax or TDS,
and produces no statutory registers.
