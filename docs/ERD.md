# Entity Relationship Model

> **Status: to be finalised in Phase 1, before feature code.** This is the
> agreed shape; the authoritative version becomes the Drizzle schema in
> `apps/api/src/db/schema/`.

## Conventions on every tenant-owned table

| Column | Type | Why |
|---|---|---|
| `id` | `uuid` PK | Client-generatable, non-enumerable |
| `business_id` | `uuid` NOT NULL | Tenancy. RLS policy key. |
| `client_uuid` | `uuid` UNIQUE per business | Offline idempotency |
| `created_at` / `updated_at` | `timestamptz` | |
| `created_by` / `updated_by` | `uuid` | Accountability |
| `deleted_at` | `timestamptz` NULL | Soft delete |
| `version` | `integer` | Optimistic concurrency for sync |

Money is `NUMERIC(14,2)`. Indexes are **compound** on `(business_id, <filter>)`,
never on the filter column alone.

## Groups

| Group | Tables |
|---|---|
| Identity | `users`, `sessions`, `refresh_tokens`, `otp_requests` |
| Tenancy | `businesses`, `business_members`, `roles`, `permissions`, `role_permissions`, `member_permissions` |
| Configuration | `field_definitions`, `order_statuses`, `expense_categories`, `material_categories`, `units`, `holiday_calendar` |
| Contacts | `customers`, `suppliers` |
| Orders | `orders`, `order_items`, `order_events` |
| Money | `payments`, `expenses` |
| Stock | `materials`, `stock_entries`, `landed_cost_lines`, `stock_movements` |
| **Labour** | `workers`, `labour_groups`, `wage_profiles`, `muster_days`, `attendance_entries`, `piece_work_entries`, `wage_advances`, `wage_deductions`, `wage_payments`, `wage_periods`, `wage_settlements`, `labour_ledger_entries` |
| Machinery | `machines`, `machine_purchases`, `maintenance_logs` |
| Work | `tasks`, `future_purchases`, `reminders`, `notifications` |
| Media | `attachments` |
| Audit | `audit_logs` (append-only) |
| Sync | `idempotency_keys`, `sync_cursors` |

## Key constraints to get right

- `orders`: `UNIQUE (business_id, order_number)`
- `attendance_entries`: `UNIQUE (business_id, work_date, worker_id)` — this is
  what makes the offline muster roll safe to retry
- `wage_periods`: a `locked_at` timestamp; settled periods are immutable
- `audit_logs`: no UPDATE/DELETE grant
- `field_definitions`: `UNIQUE (business_id, entity_type, key)`
