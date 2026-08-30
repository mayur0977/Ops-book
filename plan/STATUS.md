# Status

**Updated:** 2026-08-30
**Current phase:** 0 — Prerequisites. All repo work done; nothing paid is
required to continue.
**Next task:** Install Node 24.20.0, run `eas login` (free), submit DLT
registration. Then start Phase 1 — none of it is blocked.

## Shipped

**Repository** — monorepo scaffolded and pushed to `mayur0977/Ops-book`.
Seven commits so far, starting at `337af72`.

**Rules** — `CLAUDE.md` at root plus one per app and package. Twelve
non-negotiables covering tenant isolation, decimal money, vertical-agnostic
core, client-safe shared packages, and design tokens. Working agreement:
nothing reaches git without approval; `/commit` is that approval.

**Requirements** — PRD and BRD generalised from the furniture-specific v2 to a
multi-vertical baseline, regenerated as `Documents/DayBook_*_v3.docx` and
committed as Markdown in `docs/`.

**Product named DayBook** — the bookkeeping term for the book of original entry.
Applied across the repo, both requirement documents and all package names.

**Design decided** — "Ledger" (ADR 0006). Ruled hairlines, a coloured margin
rail per row, tabular figures, indigo ink accent. Full system, Apple HIG
behaviour guide and motion spec in `docs/design/`.

**Delivery approach decided (ADR 0007)** — Android is free end to end, so no
paid developer account is needed until Phase 11. Auth is built against
`SMS_PROVIDER=console`; DLT registration runs in the background.

**Plan** — 12 phase files with testable exit criteria, and `/status`, `/next`,
`/phase-check`, `/wrap`, `/design-check`, `/commit`.

**CI** — three workflows, with tenant isolation as its own job. Vertical-leak
check green.

**ADRs 0001–0007** — monorepo, Drizzle over Prisma, web deferred, config-as-data,
money representation, design direction, OTP delivery.

## Tested

`check:vertical-leak` passes. Nothing else — no application code exists yet.

## Broken / open

**Blocking Phase 0, all free:**
- Node is 20.10.0 locally; the project needs 24.20.0
- No Expo account yet (`eas login`)
- Repo visibility unconfirmed; branch protection not set

**Slow, so start it, but not blocking:**
- DLT registration not submitted — weeks of waiting, blocks launch not work

**Minor:**
- `.claude/settings.json` denies `Read(./.env.*)`, which also catches the
  committed, safe `.env.example`. Narrow to `Read(./.env)` when convenient.
- In `.env.example` the OTP rate-limit block sits between `SMS_PROVIDER` and its
  credentials. Regroup next time that file is touched.

**Outside this project, but a real hazard:**
- `/Users/mayurpatel/.git` exists — the home directory is a git repository with
  zero tracked files. Any `git add -A` from there would stage `.ssh/`, `.aws/`
  and shell history. `rm -rf ~/.git` unless it is deliberate.

## Git

- `main` and `origin/main` are level; working tree clean
- Branch protection is not yet enabled, so `main` currently takes direct pushes

## Next

Phase 0 needs only the three free items above. Phase 1 (Foundation) can start in
parallel and is the largest phase in the project — tenancy, auth, RBAC, audit and
the idempotency groundwork that makes Phase 9 tractable.

Read `plan/phase-01-foundation.md` first. Its opening tasks are deliberately
design-first: freeze the ERD, the permission matrix and the sync contract before
any code. That is the PRD's own first instruction and the one most often skipped.

---

### How to update this file

Rewrite the sections above at the end of each session. Keep it short — it is a
handover note, not a changelog. Git history is the changelog.
