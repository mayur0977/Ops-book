> Converted from `Documents/DayBook_PRD_v3.docx`. **The Word file is the formatted deliverable; this Markdown copy is the version-controlled source of truth for day-to-day work.** If they disagree, regenerate this file.

# DayBook Operations Platform — PRD

Product Requirements Document | iOS + Android (Web deferred) | Multi-vertical, multi-tenant

Version 3.0 — Generic Multi-Vertical Baseline | 30 August 2026 | Supersedes v2.0 (Atharv Furniture Operations)

## 1. Executive Summary

DayBook is a mobile-first operations application for small production and service businesses. It records the day as it happens: orders, customers, payments, transport, materials and landed costs, labour attendance and wages, machinery, expenses, tasks, reminders and photographic evidence.

The platform is deliberately industry-agnostic. A furniture workshop, a fabrication unit, a tailoring business or a general trade service each configure the same core through a vertical configuration layer rather than through separate code. The furniture business that originated these requirements is tenant number one, not the product.

It supports multiple businesses per user with strict tenant isolation, role and permission based access, immutable audit history, camera/gallery/document capture, offline entry with safe synchronisation, and push notifications. It is not a statutory accounting, taxation or payroll system.

Change from v2.  v2 described a single furniture business with furniture concepts modelled as fixed database columns. v3 keeps every requirement and moves the industry-specific parts into per-business configuration. Section 5 defines that mechanism; Section 26 lists every change.

## 2. Product Vision & Goals

- Make every important business event quick to record at the moment it happens.
- Track the complete order lifecycle from received date through delivery to final payment.
- Know exactly what was bought, what it cost, who paid for it and by which method.
- Track material landed costs including transport, loading, unloading and processing.
- Track labour attendance, wages, advances, deductions, partial payments and period settlement.
- Track machinery purchase, maintenance and warranty across its lifecycle.
- Attach designs, measurements, work-in-progress, finished-product photos, receipts and invoices.
- Prevent forgotten daily entries using a configurable end-of-day reminder and checklist.
- Work during poor or absent connectivity and synchronise safely afterwards.
- Support multiple businesses with strict tenant isolation and per-business configuration.
- Allow a business in any trade to adopt the product without code changes.
- Provide management summaries without claiming to be a statutory accounting, tax or payroll system.

## 3. Repository & Delivery Topology

The platform ships as a single repository containing two independently deployable applications and the packages they share.

| Path | Contents | Responsibility |
| --- | --- | --- |
| apps/api | Node.js, TypeScript, Fastify, PostgreSQL | Database schema, all authorisation, all monetary and wage arithmetic, media signing, background jobs, notifications, synchronisation endpoints. Deployed as a container. |
| apps/mobile | Expo and React Native for iOS and Android | Offline-first daily entry surface: quick add, camera, muster roll, outbox synchronisation. Distributed through EAS Build and EAS Update. |
| packages/contracts | Request and response schemas in Zod, and the types inferred from them | The single definition of the API contract, imported directly by both applications. |
| packages/core | Monetary arithmetic, wage calculation, permission evaluation, order status rules | Behaviour that must be identical on the device and on the server. |
| packages/verticals | Vertical seed packs | The only vertical-aware code in the workspace (Section 5). |
| packages/config | Shared TypeScript, lint and formatting configuration | Consistency across every application and package. |

### 3.1 Why a single repository

The principal risk in separating the backend and the application into two repositories is contract drift: the application continues to compile against an API shape that no longer exists, and the failure surfaces at runtime in front of a user. Detecting that drift requires machinery — code generation, a published contract artefact, and a build check that compares the generated client against the committed one.

A single repository removes the problem rather than detecting it. Both applications import the same schema module from packages/contracts, so a change that breaks the application cannot be merged in a passing state. The code generation step, the published contract artefact and the drift check are all deleted.

The shared calculation package carries a second benefit specific to this product: the muster roll can display a payable wage figure while offline using the same function the server executes at settlement. Two independent implementations of wage arithmetic that drift apart become a dispute with a worker.

### 3.2 Rules for shared packages

- Neither contracts nor core may import server-only code — no database client, no environment access, no secrets, no Node built-in modules. Both are bundled into the mobile application, and anything in that bundle is public. This is enforced by a lint rule in packages/config, not by convention.
- Internal packages are consumed as TypeScript source rather than pre-built artefacts, so no build step sits between a package and the applications that use it.
- The server remains the sole authority for every stored value. Shared calculation on the device exists for immediate display and offline confidence; the server recomputes authoritatively when the record arrives.

### 3.3 Workspace tooling

| Tool | Version | Role |
| --- | --- | --- |
| pnpm workspaces | 11.24.0 | Dependency management across applications and packages. |
| Turborepo | 2.10.12 | Task graph, caching, and filtering so a change to one application does not run the other's test suite. |

### 3.4 Known monorepo pitfalls and their mitigations

| Pitfall | Mitigation |
| --- | --- |
| The React Native bundler resolves modules in ways a strict pnpm layout confuses. | Set node-linker=hoisted in .npmrc and add the workspace root to the bundler's watch folders. Configured at project start, before any feature work. |
| Continuous integration runs every test on every change. | Filter task execution to packages affected since the base branch. A change to the shared contract package correctly affects both applications and runs everything. |
| The container image cannot see the shared packages. | The API image builds from the repository root as its context, with the mobile application excluded through .dockerignore. |
| Two deployables sharing one commit history. | Prefixed release tags — api-v* and app-v* — each triggering its own pipeline. The two do not release in lockstep and are not required to. |
| Server-only code reaching the mobile bundle through a shared package. | Restricted-import lint rule, failing the build. |

### 3.5 Requirement documents

This PRD and the companion BRD are converted to Markdown and committed to docs/ at the repository root. Requirements held only as attachments diverge from the implementation within weeks; changes to them must be reviewable diffs.

### 3.6 When to separate

Separate repositories become justified when a second team owns one application and the two release cadences genuinely conflict, or when one half must be shared or published externally. Neither condition applies. Splitting a clean workspace later is a mechanical operation; reconciling two repositories that have already drifted is not.

## 4. Platform & Technology

Versions below were read from the npm registry on 30 August 2026 and are the baseline to pin at project start. Re-verify before pinning if work begins materially later.

### 4.1 Backend — apps/api

| Layer | Choice | Version | Notes |
| --- | --- | --- | --- |
| Runtime | Node.js LTS | 24.20.0 | Pinned with a single .nvmrc at the workspace root. |
| Language | TypeScript | 7.0.2 | Native compiler. Fall back to the 6.0.x line if a required plugin lags. |
| HTTP framework | Fastify | 5.12.1 | Schema-first with a first-class Zod type provider. |
| Validation | Zod | 4.5.4 | One schema drives validation, types and OpenAPI. |
| ORM | Drizzle ORM / Drizzle Kit | 0.45.2 / 0.31.10 | SQL-first; chosen over Prisma for row-level security and aggregate reporting. See 4.3. |
| Database | PostgreSQL | 17 or 18 | Row-level security, JSONB with GIN indexes, NUMERIC money. |
| Background jobs | BullMQ + ioredis | 6.3.2 / 6.0.0 | End-of-day reminders, maintenance due, push fan-out, media processing. |
| Object storage | @aws-sdk/client-s3 | 3.1121.0 | Private bucket with presigned URLs; also targets Cloudflare R2. |
| Logging | pino | 10.3.1 | Structured, with tokens and one-time passwords redacted by configuration. |
| Error tracking | @sentry/node | 10.72.0 | With release tracking. |
| Testing | Vitest + supertest | 4.1.11 / 7.2.2 | Integration tests run against a real PostgreSQL instance, never a mock. |
| API documentation | @fastify/swagger + fastify-type-provider-zod | 9.8.1 / 7.0.0 | Generates the contract consumed by the application. |
| Decimal arithmetic | decimal.js | 10.6.0 | No monetary value is ever a JavaScript floating point number. |

### 4.2 Mobile — apps/mobile

| Layer | Choice | Version | Notes |
| --- | --- | --- | --- |
| Framework | Expo SDK | 57.0.18 | Brings React Native 0.87.1 and React 19.2.8. |
| Navigation | expo-router | 57.0.17 | File-based routing with typed routes. |
| Styling | NativeWind | 4.2.6 | Tailwind tokens; one theme definition for light and dark. |
| Server state | TanStack Query | 5.102.8 | With @tanstack/react-query-persist-client for cold-start reads while offline. |
| Local state | Zustand | 5.0.15 | Active business, session, synchronisation status. |
| Forms | React Hook Form + Zod | 7.87.0 / 4.5.4 | Reuses the shared contract schemas directly, so a form and its endpoint cannot disagree. |
| Offline database | expo-sqlite | 57.0.2 | Outbox and local cache. op-sqlite 18.1.4 only if performance limits are reached. |
| Key-value store | react-native-mmkv | 4.3.2 | Session, preferences, synchronisation cursors. |
| Camera and media | expo-camera / expo-image-picker / expo-image-manipulator | 57.0.4 / 57.0.14 / 57.0.14 | Capture, selection and compression before upload. |
| Push notifications | expo-notifications | 57.0.15 | Delivered through FCM and APNs. |
| Error tracking | @sentry/react-native | 8.24.0 | With EAS Update release tracking. |
| Build and release | eas-cli | 23.0.0 | Cloud builds for both platforms. |
| End-to-end tests | Maestro (alternative: Detox 20.51.4) | — | Maestro flows are materially cheaper to maintain for a small team. |

### 4.3 Deliberate departures from v2

Drizzle instead of Prisma. Tenant isolation is a critical requirement and its strongest form is PostgreSQL row-level security driven by a per-transaction session variable. Drizzle sits close enough to SQL for that to be natural, and the reporting layer is aggregate SQL in any case. Prisma remains a defensible alternative provided row-level security is implemented identically.

Web deferred. v2 targeted iOS, Android and web together. v3 ships mobile first and revisits web after mobile user acceptance testing, most likely as apps/web within the same repository — a Next.js application importing the same contracts and calculation packages, which is the direct payoff of the workspace structure. The web surface is reporting and administration and is a genuinely different interface from the mobile one.

## 5. Multi-Vertical Configuration Model

This section replaces the industry assumptions embedded throughout v2. It is the mechanism by which one codebase serves many trades.

### 5.1 Principle

Industry-specific concepts are data, not code. A business selects a vertical at creation; that selection runs a seed pack once. Afterwards the vertical is never consulted at runtime, and every seeded value is editable by the business.

### 5.2 The configuration tables

| Table | Key fields | Purpose |
| --- | --- | --- |
| businesses | vertical, currency, timezone, modules_enabled (jsonb), label_overrides (jsonb), join_code | One row per tenant. Holds which modules are active and what the business calls things. |
| field_definitions | entity_type, key, label, data_type, unit, required, options (jsonb), sort_order, archived_at | Defines the additional fields an entity presents. A furniture business seeds length, width, height, material and finish; an automotive workshop seeds vehicle number, model and odometer reading. |
| order_statuses | code, label, sort_order, is_initial, is_terminal, requires_zero_balance | Workflow expressed as data. The eight v2 statuses become the default seed; requires_zero_balance encodes the completion rule. |
| expense_categories | name, parent_id, is_system, sort_order | Editable taxonomy seeded per vertical. |
| material_categories, units | name, code, precision | Editable taxonomies seeded per vertical. |

Entities that accept additional fields carry a custom_fields JSONB column defaulting to an empty object, with a GIN index. Writes are validated against the business's field definitions at the API boundary; the database guarantees only that the value is valid JSON.

### 5.3 Terminology

The label_overrides map allows a business to rename core nouns — an Order may present as a Job, a Project, a Booking or a Repair; a Laborer may present as a Worker, a Karigar or a Technician. The application renders labels from this map with the seeded default as fallback.

### 5.4 Module toggles

modules_enabled controls which modules appear: orders, stock, labour, machinery, transport, tasks. A service business with no inventory turns stock off and never sees it. Toggling a module off hides it and blocks its endpoints; it never deletes data.

### 5.5 Verticals seeded at launch

| Vertical | Purpose | Distinctive configuration |
| --- | --- | --- |
| Furniture / carpentry | The pilot tenant. | Dimensional item fields, material and finish, daily-wage labour, wood processing cost categories. |
| Fabrication / welding | Proves the abstraction cheaply against a similar shape. | Weight and grade item fields, different units, hourly labour with overtime. |
| General trade services | Neutral fallback, adoptable by anyone. | No exotic fields. Orders, payments, expenses and labour only. |

Further verticals — construction and interiors, tailoring, printing, automotive workshop, catering — are added as seed files without changes to core code.

Enforcement.  No string in either codebase may contain the words furniture, teakwood, polish or wood outside the vertical seed directory. A continuous integration check fails the build if it does. This is the single most effective guard against the pilot vertical leaking back into the core.

## 6. Users, Roles & Multi-Business

| Role | Purpose | Default access |
| --- | --- | --- |
| Owner | Business control | Full |
| Partner | Shared operations and finance | Broad |
| Manager | Daily operations | Configurable |
| Staff | Assigned work | Limited |

- Registration and login by mobile number with a one-time password.
- Business creation requires a business name, owner identity, vertical selection and a unique business code.
- The business code is a joining mechanism only and is never a substitute for owner authorisation.
- The owner may revoke or regenerate the code and may require approval of new members.
- One user may belong to several businesses and switches the active business in the application.
- Every tenant-owned record carries business_id and is authorised server-side.

### 6.1 Permissions are data, not an enumeration

The responsibility matrix in the BRD contains several configurable cells, so roles cannot be a fixed enumeration. Permissions are string keys — for example orders.write, payments.record, labour.attendance.mark, labour.wages.settle, reports.view, audit.view. A role_permissions table holds the default grant per role and per-member overrides refine it. Owner, Partner, Manager and Staff are seeded roles, not hard-coded branches in application logic.

## 7. Dashboard

- Today's orders and their statuses.
- Payments received and expenses recorded.
- Outstanding customer balances.
- Attendance marked today, and outstanding wages.
- Stock, transport and machinery activity.
- End-of-day missing-entry checklist.
- Tasks and reminders due.
- Quick Add for the most frequent entries.
- Historical date selector.
- Metrics filtered by the viewer's permissions.
- Only modules enabled for the business appear.

## 8. Orders

Rendered under the business's own term for an order.

- Customer: name, mobile number, address, notes.
- Order number unique within the business; received date and time; expected delivery; type; status.
- Order types are a seeded, editable taxonomy — for the pilot vertical: customer requirement, own design, ready product.
- Items: product, description, quantity, unit, notes, plus every additional field defined for the business.
- Additional items may be added later as separate timestamped events.
- Order amount, token or advance, multiple partial payments, final payment and outstanding balance.
- Each payment records amount, date and time, payer, payee, method, reference and an optional attachment.
- Transport records amount, date, payer, method and optional linkage to an order.
- Other order-linked costs are supported, including allocated labour.
- Statuses come from the business's configured workflow; the seeded default is Draft, Received, In Progress, Ready, Delivered, Payment Pending, Completed, Cancelled.
- Completion stores date and time and requires a zero balance, or an authorised exception with a recorded reason.
- The timeline includes creation, status changes, payments, materials, transport, labour allocation, additional items, delivery and completion.
- Search and filter by order number, customer, mobile, status and date range.
- Duplicate or template an order for repeat work.
- Photographs and documents by category: design, measurement, work in progress, finished, delivery proof, invoice.

## 9. Finance & Expenses

- Payment methods: cash, UPI, bank transfer, card, cheque, other.
- Payer: owner, partner, manager, business cash or account, or a configured member.
- Expense categories are a per-business editable taxonomy seeded from the vertical.
- Expenses may link to an order, a stock entry, a machine or a labour settlement.
- Partial payments and settlements are supported wherever an amount can be paid over time.
- Monetary values are stored as NUMERIC(14,2), transmitted as strings in JSON, and computed with a decimal library on both client and server.
- Currency and locale derive from the business record, defaulting to INR.
- Soft delete is preferred; material edits and deletions are audited with before and after values.

Why strings on the wire.  A rounding error of one paisa in a partner settlement is precisely the dispute this system exists to prevent. Monetary values are never serialised as JSON numbers.

## 10. Stock & Materials

- Material master: name, category, unit, and any additional fields defined for the business.
- Stock entry: date and time, supplier, material, quantity, unit, rate and base amount.
- Landed cost lines: transport, loading, unloading, processing, handling and other, each an editable category.
- Payer and payment method recorded on every entry.
- Supplier bill and material photographs attachable.
- Stock movements: purchase, consumption, adjustment, return, wastage and optional transfer.
- Available quantity is derived from movements; adjustments require a reason.
- Advanced valuation is out of scope for the first release.

## 11. Labour Attendance & Wages

This module is expanded substantially from v2. Attendance is the highest-frequency screen in the product: it is used every working day, often by the least patient user, and often where connectivity is worst. It receives more design attention than any other module.

### 11.1 Worker profile

- Name, role, optional mobile number, joining date, status, photograph.
- Optional identification reference and emergency contact.
- Membership of a labour group where applicable.
- Additional fields as defined for the business.

### 11.2 The muster roll is the primary screen

Attendance is not marked through a per-worker form. One screen shows a date and every active worker; a single tap cycles a worker through Present, Absent, Half Day and Leave; a Mark all present action handles the common case; one save commits the day. Twelve workers are marked in a few seconds.

The batch is idempotent on the combination of business, work date and worker, so a retry after a failed network call cannot double-mark anyone.

### 11.3 Attendance modes, configurable per business

| Mode | Captures | Intended for |
| --- | --- | --- |
| muster | Status only, marked by a supervisor. | Default. Small workshops where everyone is visible. |
| punch | Check-in and check-out timestamps, yielding hours worked. | Hourly wages and provable overtime. |
| punch_photo | Check-in and check-out with a photograph stored as an attachment. | Several sites, supervisor not physically present. |
| punch_geo | Check-in and check-out with a GPS point, flagged when outside a site radius. | Site work. Out-of-radius is flagged for review, never automatically rejected. |

### 11.4 Attendance statuses

Present, Absent, Half Day, Paid Leave, Unpaid Leave, Weekly Off, Holiday, and Other with a reason. Weekly off and holiday are populated from the business calendar so an absence on a declared holiday is never counted against a worker.

### 11.5 Wage types

Wage type is the principal generalisation in this module. A furniture workshop pays a daily wage; a tailoring unit pays per piece; a fabricator pays hourly with overtime; a supervisor is on a monthly salary. Each worker has a wage profile with an effective-from date, so a rate change never rewrites settled history.

| Wage type | Earned in a period |
| --- | --- |
| daily | (full days + half days x half-day factor) x daily rate, plus overtime |
| hourly | normal hours x rate, plus overtime hours x rate x overtime multiplier |
| piece_rate | sum of (units completed x rate per unit), from piece work entries |
| monthly | salary x (payable days / period days), with unpaid leave deducted |

The wage profile also holds the overtime threshold, the overtime multiplier and the half-day factor, all configurable per business and overridable per worker.

### 11.6 The wage ledger

One append-only ledger per worker holds four entry kinds: earned, advance, deduction and payment. The running balance is the outstanding wage. No entry is ever edited; a correction posts a reversing entry with a stated reason and an audit record.

- Advances are recorded against future wages and reduce the payable amount at settlement.
- Deductions are recorded with a category and a reason.
- Partial payments remain in the ledger and are visible in the balance.
- Every advance, deduction and payment records the payer and the payment method.

### 11.7 Wage periods and settlement

- The wage period is weekly, fortnightly or monthly, configured per business.
- Settling a period computes earned less advances less amounts already paid, records the resulting payment, and locks the period.
- A locked period is immutable. Attendance amendments affecting it require the labour.attendance.amend permission and a written reason, and post an adjustment into the following period rather than silently altering a settled one.
- Settlement is a permission-gated action and is fully audited.

### 11.8 Labour groups and contractors

Where a contractor supplies a crew and receives a single payment, a labour group holds member workers. Attendance is marked per worker for the record while settlement is made to the group. Without this, users are forced into fabricated single-worker records and the attendance history becomes worthless.

### 11.9 Order allocation and job costing

An attendance entry may optionally be allocated to one or more orders, with a split where a worker's day spans several jobs. This allocation is the only route to a true labour cost per order and feeds the optional profitability snapshot in the reporting set.

### 11.10 Reports

- Muster register — the month grid with workers down the page and dates across, showing the status in each cell. This mirrors the paper register the business already keeps, which is what makes the module trusted.
- Wage register — per period: days worked, earned, advances, deductions, paid, closing balance.
- Outstanding wages across all workers, and advances outstanding.
- Attendance percentage per worker over a date range.
- Labour cost per order, where allocation is used.
- All exportable to CSV and PDF, gated by permission.

### 11.11 Offline behaviour

The muster roll must open, list workers and save with the device in aircraft mode, then synchronise silently when connectivity returns. This screen is designed against the offline path first and the online path second.

Scope boundary.  This is an operational wage ledger, not statutory payroll. It does not compute provident fund, employees' state insurance, professional tax or tax deducted at source, and it does not produce statutory registers. This limitation is stated in the application where an owner can see it.

## 12. Machinery & Assets

- Name, brand, model, serial number, location, status.
- Purchase date, supplier, cost, payer, method, invoice and warranty period.
- Maintenance record: date, service type, vendor, cost, payer, notes, attachment and next service date.
- Warranty expiry and service due reminders.
- Photographs for the machine, its serial plate, invoice and warranty document.
- Statuses: active, under maintenance, idle, sold, retired.
- Planned purchases may precede an actual purchase and convert into one.

## 13. Tasks & Future Purchases

- Task: title, notes, assignee, priority, due date and time, status, reminder.
- Future purchase: item, estimated cost, priority, target date, supplier or notes, purchased flag.
- One-time and recurring reminders.
- Snooze and complete actions.

## 14. Camera, Photos & Documents

- Capture by camera or selection from the gallery.
- Multiple images and PDF documents per record.
- Upload path: the application requests a presigned upload, uploads directly to object storage, then confirms to the API which writes the attachment record.
- Compression to approximately 1600 pixels on the long edge at about 80 percent quality, with an original-quality option, because an unreadable invoice or measurement sheet is worse than no photograph.
- Thumbnails generated by a background worker.
- Full-screen viewer with zoom and swipe.
- Optional caption and category: design, measurement, work in progress, finished, delivery, invoice, receipt, warranty, attendance, other.
- Upload progress, retry, and a visible failed queue.
- Offline capture with delayed upload; photographs queue separately from records so a record synchronises immediately while a large image waits for a better connection.
- Objects are private; access is by short-lived presigned URL issued only after the permission check.
- Metadata: business, entity type and identifier, uploader, timestamp, MIME type, size, storage key.
- Deletion of financial evidence is permission-controlled and audited.

## 15. Notifications & End of Day

- Push reminders for the end-of-day checklist, tasks, payment follow-up and machinery maintenance.
- Default end-of-day reminder at 20:30, configurable per business and per user.
- The daily checklist is configurable: which categories count as required entries for this business. Labour attendance, transport, cash expenses, stock and customer payments are the seeded defaults.
- The notification names only the missing categories and never contains amounts.
- The same evaluation renders the dashboard checklist, so the notification and the screen can never disagree.
- Snooze, and mark not-applicable with a reason, are both permitted.
- Notification inbox with history and per-user preferences.
- SMS is used for one-time passwords; optional critical alerts are rate-limited and never carry financial detail.

## 16. Offline & Sync

The contract is designed in the first phase and implemented later; retrofitting it is a rewrite.

- Every mutating endpoint accepts an Idempotency-Key header, and every offline-creatable row carries the client-generated UUID. Processed keys are retained for thirty days and the original response is replayed on a repeat.
- Local storage is SQLite holding a mirror of recent tenant data plus an outbox of identifier, entity, operation, payload, base version, state, attempt count and last error.
- Push: a batch endpoint returns a per-operation result of applied, duplicate, conflict or rejected. Partial success is the normal case.
- Pull: per-entity, using an updated-at cursor with tombstones for deletions.
- Conflict policy: last write wins for notes and descriptions only. Never for money, attendance or status — those surface in a conflict inbox the user resolves explicitly.
- Retry with exponential backoff and jitter; a permanently failing item moves to a visible failed queue rather than an endless retry loop.
- Synchronisation state is always visible: synced, pending count, needs attention.
- States: pending, syncing, synced, failed, conflict.

## 17. Web Experience (Deferred)

Web is not part of the first release. When it is built it shares the same backend, database, role model and tenant isolation, and is optimised for owner and partner review, reporting, administration and bulk inspection with a desktop sidebar, tables and multi-column dashboards. The recommended form is a third application, apps/web, inside the same repository — a Next.js application importing the same contracts and calculation packages — rather than a shared React Native web target, because the interface requirements genuinely differ while the contract does not.

## 18. Database Model

Every tenant-owned table carries business_id, a UUID primary key, created_at, updated_at, created_by, deleted_at for soft delete, and client_uuid for offline idempotency. Indexes are compound on business_id together with the filtered column, never on the filtered column alone.

| Entity group | Purpose |
| --- | --- |
| users | Identity |
| businesses | Tenant, vertical, enabled modules, terminology, currency |
| business_members, roles, permissions, role_permissions | Access control |
| field_definitions, order_statuses, expense_categories, material_categories, units | Vertical configuration |
| customers, suppliers | Business contacts |
| orders, order_items, order_events | Order, specification and timeline |
| payments | Payment transactions |
| expenses | Business spending |
| materials, stock_entries, stock_movements, landed_cost_lines | Inventory and landed cost |
| workers, labour_groups, wage_profiles, muster_days, attendance_entries, piece_work_entries, wage_advances, wage_deductions, wage_payments, wage_periods, wage_settlements, holiday_calendar | Labour attendance and wage ledger |
| machines, machine_purchases, maintenance_logs | Assets |
| tasks, future_purchases, reminders, notifications | Work and reminders |
| attachments | Object storage metadata |
| audit_logs | Immutable change history |
| outbox, sync_cursors, idempotency_keys | Offline synchronisation |

## 19. API Requirements

- REST under /api/v1, described by a generated OpenAPI 3.1 document.
- Auth: request and verify one-time password, refresh with rotation, logout, session list and revocation.
- Businesses: create, join, switch, code management, members, roles, permission overrides, module toggles, terminology.
- Configuration: field definitions, order statuses, taxonomies, holiday calendar.
- Orders: create, read, update, status transition, payments, events, attachments, search.
- Finance: payments, expenses, categories, summaries.
- Stock: materials, suppliers, entries, landed costs, movements.
- Labour: workers, groups, wage profiles, muster batch upsert, attendance queries, piece work, advances, deductions, payments, period settlement, registers.
- Machinery: machines, purchases, maintenance.
- Tasks, reminders and notifications.
- Attachments: presigned upload and download URLs.
- Sync: batch push and cursor pull with idempotency and conflict reporting.
- Every endpoint validates business scope and the caller's permissions server-side. No handler reads business_id from a request body.

## 20. Security

- TLS everywhere; tokens stored in the device secure store.
- Two layers of tenant isolation: an application guard that resolves the active business and verifies membership, and PostgreSQL row-level security so a missing WHERE clause returns nothing rather than another tenant's data.
- A negative isolation test — authenticate as one business, request a known identifier from another, expect not found — runs automatically against every collection endpoint.
- Private object storage; presigned URLs only, issued after the permission check.
- One-time password rate limiting per number and per address, capped verification attempts, five-minute expiry, and codes never written to logs.
- Input validation with structured error responses.
- Secrets held only in the platform secret store; never in the repository, the application configuration or a build profile, since anything bundled into the application is public.
- Audit records for authentication, membership, permission changes, and every change to money, attendance or wages, written in the same transaction as the change itself.
- Audit tables are append-only with no update or delete grant.
- Encrypted and backed-up PostgreSQL with a restore rehearsed before launch.

## 21. UI/UX

- Clean, workshop-appropriate design that stays neutral across trades.
- Dark and light themes from a single token set.
- Large touch targets suitable for dusty hands and bright sunlight.
- Bottom navigation with a floating Quick Add.
- Status chips and timelines.
- Progressive disclosure: the common case first, detail behind an expansion.
- Search, filter and date range controls on every list.
- Accessible contrast in both themes.
- Explicit loading, empty, offline, error and retry states.
- All labels rendered through the business's terminology map.

## 22. Testing & Quality

- Unit tests for monetary calculation, wage computation, validation, permission resolution and synchronisation logic.
- API integration tests against a real PostgreSQL instance.
- Tenant isolation and privilege escalation tests on every collection endpoint.
- Wage settlement reconciliation tests against hand-computed fixtures.
- Component tests and critical-flow tests in the application.
- End-to-end tests for authentication, orders, payments, expenses, stock, labour attendance and settlement, machinery, media and offline synchronisation.
- Offline duplication tests under forced retry.
- Real device testing on iOS and Android.
- Photo upload failure and poor-network tests.
- Backup and restore verification.

## 23. Delivery Phases

Each phase is a vertical slice: schema, API, tests, then screens. Labour is brought forward relative to v2 at the sponsor's instruction.

| Phase | Scope | Exit criterion |
| --- | --- | --- |
| 0 — Prerequisites | Developer accounts, DLT registration, product name and identifiers, the workspace created with pnpm and Turborepo and a CI skeleton, requirement documents in Markdown under docs/. | Accounts approved, and one CI run builds both applications and the shared packages from a clean checkout. |
| 1 — Foundation | PostgreSQL with row-level security, OTP authentication with refresh rotation, businesses, join codes, members, roles, permissions, audit writer, idempotency middleware. Shared contract and calculation packages established. Application shell with business switcher and a typed client built on the shared contracts. | A member of one business receives not-found for another's data, as an automated test. |
| 2 — Vertical configuration | Seed packs, field definitions, dynamic form rendering, configurable statuses, module toggles, terminology. | Two businesses on different verticals present different forms with no code branch. |
| 3 — Contacts and orders | Customers, suppliers, orders, items with custom fields, status transitions, timeline, additional items, search, templates. | An order traverses the full workflow and its timeline reconstructs every change. |
| 4 — Money | Payments with payer and method, expense categories, linked expenses, order balance, decimal-safe arithmetic, financial audit. | Order balance and per-payer contribution reconcile to hand-computed fixtures. |
| 5 — Labour attendance and wages | Workers, wage profiles, offline-first muster roll, attendance modes, holiday calendar, advances, deductions, periods and settlement locking, labour groups, registers. | A month of attendance settles to a payable figure matching a manual calculation, and attendance can be marked in aircraft mode. |
| 6 — Attachments | Presigned upload, camera and gallery, compression, thumbnails, categories, viewer, upload queue. | A photograph taken offline uploads on reconnection and signed URLs expire as configured. |
| 7 — Stock and machinery | Material master, stock entries with landed costs, movements, adjustments with reason. Machines, purchase, maintenance, warranty. | Available quantity derives purely from movements and landed cost per unit is correct. |
| 8 — Tasks, notifications, end of day | Tasks, future purchases, recurring reminders, schedulers, push registration and delivery, inbox, preferences, checklist. | A missed attendance entry produces the 20:30 reminder naming attendance and nothing else. |
| 9 — Offline sync engine | Outbox, batch push and pull, conflict inbox, synchronisation status, cached reads. | A day of offline entry across every module synchronises with zero duplicates under forced retries. |
| 10 — Reports and KPIs | The reporting set and KPI framework, date-range driven, permission-gated, CSV and PDF export. | Every report reconciles to the underlying transactions on a seeded month. |
| 11 — Hardening and launch | Isolation and privilege test sweep, load test, backup and rehearsed restore, release tracking, store listings, privacy policy and account deletion, TestFlight and Play internal testing, user acceptance testing. | A restore drill succeeds and every acceptance criterion passes on real devices. |

Future scope beyond the first release: quotations, invoices and GST, WhatsApp Business messaging, a customer portal, advanced inventory valuation, barcode and QR, voice entry, AI summaries, cash-flow and profitability analysis, accounting integrations, and the web client.

## 24. Engineering Rules

- Finalise the entity relationship diagram, the tenant model, the permission matrix and the synchronisation contract before feature code begins.
- Build in vertical slices: database, API, tests, then screens.
- No mock persistence in any production flow.
- Authorisation is centralised; request and response schemas are defined once in the shared contract package and imported by both applications.
- Shared packages contain no server-only code, no environment access and no secrets, enforced by a lint rule, because they are bundled into the mobile application.
- Monetary and wage calculations use decimal arithmetic exclusively.
- Every mutation defines its validation, authorisation, audit record and idempotency behaviour.
- No secrets in source control or in the application bundle; no public object storage.
- No vertical-specific vocabulary outside the seed directory, enforced in CI.
- Migrations are reversible or accompanied by a written backout plan, and are reviewed as their own commit.
- Setup, environment, migration and deployment documentation is kept current in the repository.
- Each phase closes with a short written note of what shipped, what is tested, what is broken and what comes next.

## 25. Definition of Done

- Critical flows work on both iOS and Android.
- Tenant isolation and role tests pass in CI.
- A second business on a different vertical operates correctly with no code change.
- Offline entry and synchronisation work for every critical record type, including the muster roll.
- Camera, gallery and document upload work, including delayed upload.
- End-of-day and maintenance reminders fire correctly and name only missing categories.
- Wage settlement reconciles and locked periods are immutable.
- Financial, attendance and wage edits are audited with before and after values.
- Backups restore successfully in a rehearsed drill.
- Production build and release process is documented and repeatable.

## 26. Change Log — v2.0 to v3.0

| Area | v2.0 | v3.0 |
| --- | --- | --- |
| Product identity | Atharv Furniture Operations, single business. | DayBook, multi-vertical product. The furniture business is tenant one and the pilot. |
| Domain model | Furniture attributes as fixed columns; fixed categories and statuses. | Vertical configuration layer: field definitions, configurable statuses, editable taxonomies, module toggles, terminology map (Section 5). |
| Delivery structure | Not specified. | One repository holding two deployable applications plus shared contract, calculation and configuration packages. Contract drift is prevented by construction rather than detected by a build check (Section 3). |
| Platform scope | iOS, Android and web together. | iOS and Android first; web deferred and re-scoped as a separate application (Section 17). |
| ORM | Prisma. | Drizzle, for row-level security and reporting; rationale recorded (Section 4.3). |
| Versions | Unpinned recommendations. | Baseline versions pinned and dated (Section 4). |
| Labour | Nine bullet points: profile, attendance, advances, payments. | Full module: muster roll as primary screen, four attendance modes, four wage types, wage ledger, periods and settlement locking, labour groups, order allocation, registers, offline-first requirement (Section 11). |
| Permissions | Roles with configurable access. | Permissions modelled as data with role defaults and per-member overrides (Section 6.1). |
| Tenant isolation | Server-side authorisation. | Two layers: application guard plus PostgreSQL row-level security, with an automated negative test (Section 20). |
| Money | Decimal-safe NUMERIC. | NUMERIC storage, string serialisation, decimal library on both sides (Section 9). |
| Delivery plan | Six unnumbered stages. | Twelve numbered phases, each with an exit criterion; labour brought forward to phase 5 (Section 23). |
| Scope boundaries | Not an accounting or tax system. | Also explicitly not statutory payroll; stated in the application (Section 11, closing note). |
