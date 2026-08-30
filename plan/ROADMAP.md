# Roadmap

Legend: ☐ not started · ◐ in progress · ☑ done

| # | Phase | Size | State |
|---|---|---|---|
| 0 | [Prerequisites](phase-00-prerequisites.md) | S | ◐ code done · blocked on accounts |
| 1 | [Foundation](phase-01-foundation.md) — tenancy, auth, RBAC, audit | **XL** | ☐ |
| 2 | [Vertical configuration](phase-02-vertical-config.md) | L | ☐ |
| 3 | [Contacts & orders](phase-03-orders.md) | L | ☐ |
| 4 | [Money](phase-04-money.md) — payments & expenses | M | ☐ |
| 5 | [**Labour attendance & wages**](phase-05-labour.md) | **XL** | ☐ |
| 6 | [Attachments](phase-06-attachments.md) | M | ☐ |
| 7 | [Stock & machinery](phase-07-stock-machinery.md) | L | ☐ |
| 8 | [Tasks, notifications, EOD](phase-08-notifications.md) | M | ☐ |
| 9 | [Offline sync engine](phase-09-offline-sync.md) | **XL** | ☐ |
| 10 | [Reports & KPIs](phase-10-reports.md) | L | ☐ |
| 11 | [Hardening & launch](phase-11-launch.md) | L | ☐ |

## Dependencies

```
0 ──▶ 1 ──▶ 2 ──▶ 3 ──▶ 4 ──▶ 5 ──▶ 6 ──▶ 7 ──▶ 8 ──▶ 9 ──▶ 10 ──▶ 11
      │                                                │
      └── idempotency + client_uuid designed here ─────┘
          (Phase 9 is only tractable because of this)
```

Phase 1 is the largest and least glamorous. Resist the urge to shorten it —
tenancy, permissions and audit cannot be retrofitted, and neither can the
idempotency groundwork Phase 9 depends on.

## Why labour is Phase 5

It is the sponsor's priority, it is the highest-frequency screen in the product,
and it depends only on Phase 4's payment primitives. The pilot business gets
real daily value the moment it lands.

## Notes

- Phases 0–5 are the pilot-usable milestone. Run the furniture business as
  tenant #1 from there.
- Phase 9 implements the sync engine, but its **contract is fixed in Phase 1**.
- Onboard a second business on a different vertical after Phase 5 — that is the
  real test of BR-016.
