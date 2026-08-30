# Permission Matrix

> **Status: to be finalised in Phase 1, before feature code.**

Permissions are string keys held as data. Roles are seeded grants; per-member
overrides refine them. Roles are **never** hard-coded branches in application logic.

## Keys

```
orders.read  orders.write  orders.delete  orders.status.change  orders.complete.override
customers.read  customers.write
payments.read  payments.record  payments.void
expenses.read  expenses.write  expenses.delete
stock.read  stock.write  stock.adjust
labour.read  labour.workers.write
labour.attendance.mark  labour.attendance.amend
labour.wages.advance  labour.wages.pay  labour.wages.settle
machinery.read  machinery.write
tasks.read  tasks.write
attachments.upload  attachments.delete
reports.view  reports.export
members.manage  business.settings  business.configure
audit.view
```

## Default grants

| Activity | Owner | Partner | Manager | Staff |
|---|---|---|---|---|
| Orders | ✓ | ✓ | ✓ | Assigned |
| Customer payments | ✓ | ✓ | Configurable | — |
| Expenses | ✓ | ✓ | ✓ | Configurable |
| Stock | ✓ | ✓ | ✓ | Configurable |
| Mark attendance | ✓ | ✓ | ✓ | Configurable |
| **Amend locked attendance** | ✓ | Configurable | — | — |
| Wage advances & payments | ✓ | ✓ | Configurable | — |
| **Settle wage period** | ✓ | Configurable | — | — |
| Machinery | ✓ | ✓ | ✓ | — |
| Members | ✓ | Limited | — | — |
| Business settings & configuration | ✓ | Limited | — | — |
| Reports | ✓ | ✓ | Configurable | — |
| Audit | ✓ | ✓ | Configurable | — |

## Enforcement

Each route declares its permission in its module's `policy.ts`. A route with no
declared permission **fails a startup assertion** — you cannot forget one silently.

Privilege-escalation tests are mandatory: a Manager cannot settle wages, Staff
cannot view audit, a Partner cannot remove the Owner.
