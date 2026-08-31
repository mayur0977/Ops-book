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

### Accounts — free only, for now
- [ ] Free **Expo account** (`eas login`) — no payment details, gets you real
      Android builds
- [ ] Free **Apple ID** — for the iOS Simulator on your Mac. Not the $99 one.

See `docs/device-testing.md`. Android costs nothing until you want a Play Store
listing, so **neither paid account is bought in Phase 0.**

### Deferred deliberately — do NOT buy yet
- [ ] ~~Apple Developer Program ($99/yr)~~ → buy at Phase 11, or whenever you
      first need the app on someone else's iPhone
- [ ] ~~Google Play Console ($25)~~ → buy when you want a public listing.
      Sideloaded APKs need no account.

### DLT registration — start now, then forget it
- [ ] Submit DLT registration (TRAI): entity, sender header (`DAYBOK`), OTP
      template. Weeks of waiting, so start it early — but it blocks **launch,
      not development**.
- [ ] Choose a production SMS provider — MSG91 recommended. Not needed yet.

Auth is built entirely against `SMS_PROVIDER=console`, which prints the OTP to
the server log. See `docs/otp-sms.md` and ADR 0007.

### Local toolchain
- [x] Node 24.20.0 — installed via `brew install node@24`. Note an older
      v20.10.0 still sits at `/usr/local/bin/node`, shadowed because
      `/opt/homebrew/bin` precedes it on PATH.
- [x] pnpm 11.24.0 via `corepack prepare pnpm@11.24.0 --activate`
- [ ] Docker Desktop running; `pnpm db:up` brings up Postgres, Redis, MinIO

### Repository
- [x] Workspace scaffolded (`pnpm-workspace.yaml`, `turbo.json`, `.npmrc`)
- [x] `CLAUDE.md` rule files (root + per app/package)
- [x] `docs/` — PRD, BRD, security, verticals, sync contract, ADRs
- [x] `docs/design/` — design system, HIG, motion
- [x] `plan/` — roadmap and 12 phase files
- [x] CI workflow + vertical-leak check
- [x] `.claude/commands` — /status, /next, /phase-check, /wrap, /design-check, /commit
- [x] GitHub repository created and pushed (`mayur0977/Ops-book`)
- [ ] Confirm repository visibility is private
- [ ] Branch protection on `main`

## Exit criteria

- [x] Design direction agreed and documented
- [x] Repository scaffolded, pushed, and rules in place
- [x] Product name decided and applied throughout the repo
- [x] Device-testing and OTP strategies decided (no paid accounts required)
- [ ] DLT registration submitted (approval may still be pending)
- [x] `node -v` reports 24.20.0 and `pnpm -v` reports 11.24.0
- [ ] `pnpm db:up` brings up all three services healthy
- [ ] Expo Go runs a hello-world on your Android phone
- [ ] One CI run is green on a clean checkout

Paid developer accounts are **not** a Phase 0 exit criterion. They are needed at
Phase 11.

## Blocked on you (not on code)

Only three things, and none of them cost money:

1. ~~Node 24.20.0~~ — done, via Homebrew.
2. **Free Expo account** — `eas login`. No card required. Needed at Phase 3,
   not yet.
3. **Repo visibility + branch protection** — two minutes in GitHub settings.
   Protect `main` and `develop` now that git-flow is in use.

Worth starting because it is slow, but not blocking:

4. **DLT registration** — weeks of waiting, and it blocks launch rather than
   development. Submit it and move on.

Deferred until Phase 11, deliberately:

5. Apple $99/yr and Google $25. Confirm the bundle identifier
   (`com.mayurpatel.daybook`?) and check "DayBook" is free on both stores
   *before* you register either — the identifier is permanent once published.

## Out of scope

Any application code. Resist starting Phase 1 in parallel — the account
registrations need chasing, not company.

## Notes

`SMS_PROVIDER=console` means all of authentication can be built and tested in
Phase 1 before DLT approval lands. The registration blocks *launch*, not *work*.

Android is the development and pilot platform. It is free end to end: Expo Go
early, then sideloaded APKs from EAS free-tier builds, then FCM push through a
free Firebase project. iOS joins when there is a reason to pay for it.
