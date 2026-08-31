# Permission Matrix

**Status: finalised for Phase 1** (2026-08-30).

Permissions are **data**, not code. The BRD's responsibility matrix has nine
"Configurable" cells, so roles cannot be an enum and authorization cannot be an
`if (role === 'owner')` branch.

## Model

```
permissions        the global catalogue of keys (seeded, not per-business)
roles              per-business, seeded from a template at creation
role_permissions   the default grant for a role
member_permissions per-member override, tri-state
```

**Resolution order** for "may this member do X?":

1. `member_permissions` has a row for X → use `granted` (true or **false**)
2. otherwise → does the member's role grant X?
3. otherwise → deny

An explicit `granted = false` beats the role. That is what lets an Owner remove
one capability from one Manager without inventing a new role.

## Naming

`<resource>.<action>` — lowercase, dot-separated. Destructive or sensitive
actions get their own key rather than being folded into `write`.

## The catalogue

### Orders
```
orders.read                 orders.write               orders.delete
orders.status.change        orders.complete.override
```
`complete.override` is separate because completing an order with a non-zero
balance is an authorised exception (BRD §8), not ordinary editing.

### Contacts
```
customers.read              customers.write
suppliers.read              suppliers.write
```

### Money
```
payments.read               payments.record            payments.void
expenses.read               expenses.write             expenses.delete
```
`payments.void` is separate from `record`. Reversing money is a different act
from taking it, and most Managers should do one but not the other.

### Stock
```
stock.read                  stock.write                stock.adjust
```
`adjust` is separate — it is the key that lets someone silently change quantity
without a purchase or consumption, so it always requires a reason and is audited.

### Labour
```
labour.read                 labour.workers.write
labour.attendance.mark      labour.attendance.amend
labour.wages.advance        labour.wages.pay           labour.wages.settle
```
Four separate wage keys because they carry very different trust:
- `attendance.mark` — daily, delegated widely
- `attendance.amend` — changes a **settled** period. Owner-level.
- `wages.pay` — hands money over
- `wages.settle` — closes and **locks** a period. Owner-level.

### Machinery, tasks, media
```
machinery.read              machinery.write
tasks.read                  tasks.write                tasks.assign
attachments.upload          attachments.delete
```
`attachments.delete` is permission-gated because deleting a supplier bill or a
delivery photo destroys financial evidence (BRD §13).

### Reports and administration
```
reports.view                reports.export
members.manage              members.role.change
business.settings           business.configure
audit.view
```
`business.configure` (field definitions, statuses, taxonomies, terminology) is
separate from `business.settings` (name, timezone, currency) — configuration
changes reshape what everyone else sees.

## Default grants

`✓` granted · `—` denied · `◐` off by default, Owner may grant per member

| Capability | Owner | Partner | Manager | Staff |
|---|:---:|:---:|:---:|:---:|
| `orders.read` / `write` | ✓ | ✓ | ✓ | ◐ |
| `orders.delete` | ✓ | ✓ | — | — |
| `orders.status.change` | ✓ | ✓ | ✓ | ◐ |
| `orders.complete.override` | ✓ | ◐ | — | — |
| `customers.*` / `suppliers.*` | ✓ | ✓ | ✓ | ◐ |
| `payments.read` | ✓ | ✓ | ✓ | — |
| `payments.record` | ✓ | ✓ | ◐ | — |
| `payments.void` | ✓ | ◐ | — | — |
| `expenses.read` / `write` | ✓ | ✓ | ✓ | ◐ |
| `expenses.delete` | ✓ | ✓ | — | — |
| `stock.read` / `write` | ✓ | ✓ | ✓ | ◐ |
| `stock.adjust` | ✓ | ✓ | ◐ | — |
| `labour.read` | ✓ | ✓ | ✓ | — |
| `labour.workers.write` | ✓ | ✓ | ✓ | — |
| **`labour.attendance.mark`** | ✓ | ✓ | ✓ | ◐ |
| **`labour.attendance.amend`** | ✓ | ◐ | — | — |
| `labour.wages.advance` | ✓ | ✓ | ◐ | — |
| `labour.wages.pay` | ✓ | ✓ | ◐ | — |
| **`labour.wages.settle`** | ✓ | ◐ | — | — |
| `machinery.read` / `write` | ✓ | ✓ | ✓ | — |
| `tasks.read` / `write` | ✓ | ✓ | ✓ | ◐ |
| `tasks.assign` | ✓ | ✓ | ✓ | — |
| `attachments.upload` | ✓ | ✓ | ✓ | ✓ |
| `attachments.delete` | ✓ | ✓ | ◐ | — |
| `reports.view` | ✓ | ✓ | ◐ | — |
| `reports.export` | ✓ | ✓ | ◐ | — |
| `members.manage` | ✓ | ◐ | — | — |
| `members.role.change` | ✓ | — | — | — |
| `business.settings` | ✓ | ◐ | — | — |
| `business.configure` | ✓ | ◐ | — | — |
| `audit.view` | ✓ | ✓ | ◐ | — |

Staff gets `attachments.upload` unconditionally — photographing work in progress
is the one thing every role should be able to do without asking.

## Invariants — enforced, not merely intended

1. **Every route declares a permission.** A route registered without one fails a
   **startup assertion**. You cannot forget one silently.
2. **A business always has at least one Owner.** Removing or demoting the last
   Owner is rejected.
3. **No self-escalation.** A member cannot grant themselves a permission they do
   not hold, regardless of `members.manage`.
4. **`members.role.change` is Owner-only and not delegable** — it is the key that
   could manufacture any other permission.
5. **Permission changes are audited** with before/after.
6. **Revocation is immediate** — sessions are revoked, not left to expire.

## Testing

Every role gets a privilege-escalation test:

- Manager cannot `labour.wages.settle`
- Manager cannot `labour.attendance.amend` a locked period
- Staff cannot `audit.view`
- Partner cannot `members.role.change`
- A member with `granted = false` on a key their role grants is **denied**
- The last Owner cannot be demoted

These run alongside the cross-tenant 404 sweep. Both are Phase 1 exit criteria.
