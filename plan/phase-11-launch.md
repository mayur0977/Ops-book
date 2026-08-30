# Phase 11 — Hardening & launch

**Size:** L
**Depends on:** Phase 10
**Goal:** a restore drill succeeds and every UAT criterion passes on real devices.

## Tasks

### Security sweep
- [ ] Run the full checklist in `docs/security.md`
- [ ] Cross-tenant tests green on **every** endpoint
- [ ] Privilege escalation tests green for all four roles
- [ ] RLS enabled and **forced** on every tenant table; role lacks BYPASSRLS
- [ ] Secret scan across repo history and the app bundle
- [ ] `pnpm audit` clean; dependency scan in CI
- [ ] Rate limits verified under load

### Operations
- [ ] Load test at 10× expected pilot volume
- [ ] **Backup restore drill** — record elapsed time in `docs/runbook.md`
- [ ] Sentry releases wired for both apps
- [ ] Alerting on error rate, p95 latency, queue depth
- [ ] Runbook completed: deploy, rollback, incident procedures

### Store readiness
- [ ] Privacy policy hosted; account deletion route (in-app **and** web)
- [ ] Data safety form (Google) and privacy nutrition labels (Apple)
- [ ] Screenshots, descriptions, store listings
- [ ] TestFlight build distributed
- [ ] Play closed testing started (note the sustained-test requirement)

### UAT
- [ ] All 21 acceptance criteria from BRD §22, on real devices
- [ ] Attendance pilot: muster roll run alongside the paper register for two
      wage periods, and reconciled
- [ ] Owner and partner sign-off

## Exit criteria

- [ ] Backup restore drill succeeds, timed and documented
- [ ] Every BRD §22 criterion passes on a real iOS and a real Android device
- [ ] Security checklist fully green
- [ ] Release process documented and repeated once end-to-end
- [ ] The furniture business runs a full week entirely in the app

## Next, after launch

Second vertical onboarding (validates BR-016), then `apps/web`, then the
future-scope list in the PRD: quotations, GST invoices, WhatsApp, customer
portal, inventory valuation, barcode, voice entry.
