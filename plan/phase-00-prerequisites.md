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
- [ ] **Decide the product name.** Replace "OpsBook" everywhere. Bundle
      identifiers are permanent once published.
- [ ] Reserve bundle identifiers: `com.<you>.<name>` for iOS and Android.

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
- [x] `CLAUDE.md` rule files
- [x] `docs/` — PRD, BRD, security, verticals, sync contract, HIG, ADRs
- [x] `plan/` — roadmap and phase files
- [x] CI workflow + vertical-leak check
- [ ] Create the private GitHub repository and push
- [ ] Branch protection on `main`

## Exit criteria

- [ ] Product name decided and applied throughout the repo
- [ ] Apple and Google accounts approved
- [ ] DLT registration submitted (approval may still be pending)
- [ ] `node -v` reports 24.20.0
- [ ] `pnpm db:up` brings up all three services healthy
- [ ] One CI run is green on a clean checkout

## Out of scope

Any application code. Resist starting Phase 1 in parallel — the account
registrations need chasing, not company.

## Notes

`SMS_PROVIDER=console` means all of authentication can be built and tested in
Phase 1 before DLT approval lands. The registration blocks *launch*, not *work*.
