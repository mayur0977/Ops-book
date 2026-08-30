# Phase 0 — Prerequisites

**Size:** S (but the longest lead times in the project)
**Depends on:** nothing
**Goal:** every external dependency that blocks launch is in motion, and one CI
run builds the workspace from a clean checkout.

## Why now

DLT registration and store account approval take weeks and involve no code.
Starting them late is the most common way a project like this slips at the end.

## Tasks

### Decisions
- [x] **Product name decided: DayBook** — the bookkeeping term for the *book of
      original entry*, the first place a transaction is written down. Applied
      throughout the repo, the requirement documents and the package names.
- [ ] Reserve bundle identifiers — proposed `com.mayurpatel.daybook` for both
      platforms. Confirm, then register. **Permanent once published.**
- [ ] Check name availability: App Store, Play Store, domain, trademark
- [x] **Design direction agreed** — "Ledger" (ADR 0006). Identity, colour, type
      and motion specified in `docs/design/`.

### Accounts & registrations (start today — long lead times)
- [ ] Apple Developer Program ($99/yr) — needed for TestFlight, not just release
- [ ] Google Play Console ($25 once) — new personal accounts must run a
      sustained closed test before production access
- [ ] DLT registration (TRAI): entity, sender header, OTP template. **Without
      this, OTP SMS does not deliver in India.**
- [ ] Choose an SMS provider (MSG91 / Twilio / AWS SNS) and open the account

### Local toolchain
- [ ] Node 24.20.0 (`nvm install 24.20.0 && nvm use`) — currently 20.10.0
- [ ] `corepack enable && corepack prepare pnpm@11.24.0 --activate`
- [ ] Docker Desktop running; `pnpm db:up` brings up Postgres, Redis, MinIO

### Repository
- [x] Workspace scaffolded (`pnpm-workspace.yaml`, `turbo.json`, `.npmrc`)
- [x] `CLAUDE.md` rule files (root + per app/package)
- [x] `docs/` — PRD, BRD, security, verticals, sync contract, ADRs
- [x] `docs/design/` — design system, HIG, motion
- [x] `plan/` — roadmap and 12 phase files
- [x] CI workflow + vertical-leak check
- [x] `.claude/commands` — /status, /next, /phase-check, /wrap, /design-check
- [x] GitHub repository created and pushed (`mayur0977/Ops-book`)
- [ ] Confirm repository visibility is private
- [ ] Branch protection on `main`

## Exit criteria

- [x] Design direction agreed and documented
- [x] Repository scaffolded, pushed, and rules in place
- [x] Product name decided and applied throughout the repo
- [ ] Apple and Google accounts approved
- [ ] DLT registration submitted (approval may still be pending)
- [ ] `node -v` reports 24.20.0
- [ ] `pnpm db:up` brings up all three services healthy
- [ ] One CI run is green on a clean checkout

## Blocked on you (not on code)

These are the long poles and none of them are things I can do:

1. **Confirm the bundle identifier** (`com.mayurpatel.daybook`?) and check
   "DayBook" is free on both stores before the first build. Permanent once published.
2. **Apple Developer Program** — $99/yr, identity verification takes days
3. **Google Play Console** — $25 once, then a sustained closed test before
   production access
4. **DLT registration** — weeks, and OTP SMS does not deliver in India without it
5. **Node 24.20.0** locally — `nvm install 24.20.0`
6. **Repo visibility + branch protection** — two minutes in GitHub settings

## Out of scope

Any application code. Resist starting Phase 1 in parallel — the account
registrations need chasing, not company.

## Notes

`SMS_PROVIDER=console` means all of authentication can be built and tested in
Phase 1 before DLT approval lands. The registration blocks *launch*, not *work*.
