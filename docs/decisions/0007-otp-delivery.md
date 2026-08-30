# ADR 0007 — OTP delivery: console first, DLT in parallel

**Status:** Accepted · 2026-08-30

## Context

Authentication is mobile number + OTP. In India, transactional SMS requires DLT
registration with a telecom operator — entity, sender header and message
template — which takes days to weeks and blocks delivery entirely until
approved.

The naive reading is that DLT blocks the project. It does not. It blocks
*launch*. The first several months have exactly one user: the developer.

There is also a cost hazard specific to OTP: an unprotected send endpoint is a
denial-of-wallet attack, not merely a spam problem.

## Decision

**Three stages, not one choice.**

1. **Development through pilot build** — `SMS_PROVIDER=console`. The OTP prints
   to the server log. All of auth is built and tested against this driver.
2. **In parallel from day one** — submit DLT registration. Cheap, slow, and the
   waiting overlaps development rather than delaying launch.
3. **Production** — MSG91 (or Gupshup) behind the `platform/sms` interface,
   chosen for per-message cost at Indian volumes. If DLT is still pending when
   real users arrive, **Firebase Phone Auth** is the escape hatch: Google's
   sender IDs are already DLT-registered, so it needs no paperwork from us.

The provider stays behind an interface in `apps/api/src/platform/sms/`.
Swapping it is a config change, never a code change.

## Consequences

Development is never blocked on a telecom regulator. The provider decision is
deferred until there is real volume data to decide on, and reversible when made.

The cost: the console driver is not a real integration, so the first switch to
a live provider will surface template-formatting issues (DLT templates are
matched exactly, and a mismatched variable silently fails delivery). Mitigate by
testing against the real provider in staging before the pilot, not on the day.

**Required before any live provider is enabled** — these are not optional:

- Per-number cooldown, per-IP cap, and a global daily ceiling that hard-fails
- Alerting on send-rate spikes
- A provider-side spend cap where available

Without them, the first script that finds the endpoint spends real money.

## Alternatives rejected

- **Twilio** — excellent, poor value for India, and still needs DLT
- **Firebase Phone Auth as the primary** — attractive for zero paperwork, but
  couples authentication to Google and costs more per verification at volume.
  Kept as the contingency, not the plan.
- **WhatsApp OTP as v1** — likely better delivery and similar cost, and worth
  evaluating later, but it is a second integration surface for no v1 benefit.
- **Waiting for DLT before building auth** — the failure mode this ADR exists
  to prevent.
