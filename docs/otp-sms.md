# OTP delivery in India — cheap, secure, and not urgent

Login is mobile number + OTP, so SMS delivery is on the critical path to
launch. It is **not** on the critical path to building, and treating it as
though it is will cost you weeks of waiting for nothing.

## The India-specific problem

TRAI requires **DLT registration** (Distributed Ledger Technology) for all
transactional SMS to Indian numbers. You register three things on a telecom
operator's DLT portal — Jio, Airtel, Vi, BSNL all run one:

1. **Entity** — your business, with PAN/GST and documentation
2. **Header** — the 6-character sender ID (e.g. `DAYBOK`)
3. **Template** — the exact OTP message text, with variables marked

Unregistered SMS is blocked outright, not merely deprioritised. Registration is
a one-time fee (check the current amount on the operator portal — it varies)
and approval typically takes **days to weeks**, mostly waiting on document
verification.

**This is why you start it early and then forget about it.** It blocks launch,
not development.

## Build without it — the console driver

`platform/sms` is an abstraction with a `console` driver that prints the OTP to
the server log:

```
SMS_PROVIDER=console
```

```
[sms] to=+919876543210 template=otp body="Your DayBook code is 483920"
```

Every part of authentication — request, verify, expiry, rate limiting, refresh
rotation, reuse detection — is built and tested against this. **You are the only
user for the first several months.** It costs nothing and needs no registration.

This is already wired into `.env.example` and Phase 1.

## When you need real SMS: the options

| Option | Cost per OTP | You do DLT? | Verdict |
|---|---|---|---|
| **MSG91** | ~₹0.12–0.20 | Yes | Cheapest at volume. Indian company, good OTP API, helps with DLT paperwork. **Recommended for production.** |
| **Gupshup** | ~₹0.12–0.20 | Yes | Comparable. Also strong on WhatsApp. |
| **Firebase Phone Auth** | Free tier, then per verification | **No** | Google's senders are already DLT-registered. Fastest route to working OTP with zero paperwork. Pricier per message at volume, and couples your auth to Google. |
| **AWS SNS** | Higher | Yes | Only worth it if you are already deep in AWS. |
| **Twilio** | ~₹0.50+ | Yes | Excellent product, poor value for India. |

*(Prices move — treat these as an ordering, not a quote.)*

### Recommendation

- **Now → pilot:** `console` driver. Zero cost, zero paperwork.
- **In parallel, starting now:** submit DLT registration. It is cheap and slow,
  so the waiting overlaps with development instead of delaying launch.
- **Pilot with real users:** MSG91 once DLT clears. If DLT is still pending and
  you need to move, Firebase Phone Auth is the escape hatch — it sidesteps your
  DLT entirely because Google's sender IDs are already registered.
- **Later, worth evaluating:** **WhatsApp OTP** via MSG91 or Gupshup.
  Authentication-template messages often land better than SMS in India, cost
  similar or less, and your users are all on WhatsApp anyway. Not for v1.

## Security — provider-independent

These matter more than which vendor you pick. All are specified in
`docs/security.md` and built in Phase 1:

- 6 digits from a **CSPRNG**, never `Math.random()`
- **Hashed at rest**, single-use, invalidated on success
- **5-minute expiry**, maximum 5 verification attempts
- **Rate limited** per phone number, per IP, and globally
- **Never logged** — pino redaction is configured, not remembered
- Identical response whether or not the number is registered, so the endpoint
  cannot be used to enumerate users

### The cost risk nobody warns you about

An unprotected OTP endpoint is a **denial-of-wallet** attack: someone loops it
and every request bills you for an SMS. At ₹0.15 each, a script can spend
thousands of rupees overnight.

Mitigations, all required before real SMS is switched on:

- Per-number cooldown (60s between sends, escalating on repeats)
- Per-IP hourly cap
- **A global daily send ceiling that hard-fails** rather than billing further
- Alert on an unusual send-rate spike
- Provider-side spend cap, where the provider supports one

## Decision

Recorded in [ADR 0007](decisions/0007-otp-delivery.md).
