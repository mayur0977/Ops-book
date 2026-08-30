> Converted from `Documents/DayBook_BRD_v3.docx`. **The Word file is the formatted deliverable; this Markdown copy is the version-controlled source of truth for day-to-day work.** If they disagree, regenerate this file.

# DayBook Operations Platform — BRD

Business Requirements Document | Business case, workflows, controls and KPIs

Version 3.0 — Generic Multi-Vertical Baseline | 30 August 2026 | Supersedes v2.0 (Atharv Furniture Operations)

## 1. Business Background

Small production and service businesses run their day through a series of loosely recorded events: orders taken, materials purchased, transport paid, labour attended, machinery serviced, expenses met by whoever happened to have cash. The record of those events is fragmented across memory, paper registers, message threads and photographs on several phones.

DayBook is a shared, date-driven operations system for exactly that situation. It is built to be adopted by any trade rather than a single industry: a furniture workshop, a fabrication unit, a tailoring business, a printing press or a general service operation configure the same platform to their own vocabulary, categories and item attributes.

The originating business — a teakwood and custom furniture operation building both to customer requirement and to internally researched designs — is the pilot tenant and the first production user. Its requirements shaped the platform; they no longer define its boundaries.

Change from v2.  v2 was written for one named business. v3 keeps every requirement and separates what is universal from what is that business's configuration. Section 27 records every change.

## 2. Business Problems

- Order information, measurements and specifications become fragmented across people and devices.
- Accountability for who paid an expense, and by which method, is difficult to reconstruct.
- Material landed costs — transport, loading, unloading, processing — are routinely missed, so the true cost of goods is unknown.
- Labour attendance, advances and wage settlement need a defensible history, and disputes arise without one.
- Attendance is recorded on paper registers that are lost, and wages are computed from memory.
- Machinery purchase, maintenance and warranty have no lifecycle record.
- Bills, receipts and photographs need durable evidence storage tied to the transaction.
- Daily entries are forgotten, and a missing day is rarely reconstructed accurately.
- Multiple users need controlled collaboration with an audit trail.
- Off-the-shelf products are built for a single trade and force the business to adopt vocabulary and fields that do not fit its work.

## 3. Objectives

- Improve visibility of the day while it is still happening.
- Reduce missing entries through reminders and a visible checklist.
- Improve order and payment discipline.
- Track personal business contributions by payer so partners can settle fairly.
- Improve material, labour and transport cost visibility.
- Replace the paper attendance register with a system of equal speed and greater accuracy.
- Preserve photographic and documentary evidence against the record it supports.
- Enable safe multi-user collaboration with an immutable audit history.
- Serve several trades from one platform so the product is adoptable beyond the pilot business.
- Create a foundation for later customer, accounting and analytics capability.

## 4. Stakeholders

| Stakeholder | Need |
| --- | --- |
| Owner | Control, finance, membership management, reports |
| Partner | Shared operations and demonstrable accountability |
| Manager | Daily operations and attendance marking |
| Staff | Simple assigned work |
| Worker / labourer | Accurate attendance, advances and wage settlement |
| Labour contractor | Correct crew attendance and group settlement |
| Customer | Accurate order handling, indirectly |
| Supplier | Purchase and bill records |
| Technical administrator | Security, availability, backups |
| Prospective businesses in other trades | Adoption without bespoke development |

## 5. Target Operating Process

1. Receive a customer requirement.
1. Create the order with measurements, specifications and design photographs.
1. Record the token or advance payment.
1. Record materials purchased and their landed costs.
1. Mark labour attendance daily and record advances as they are taken.
1. Record additional items, transport and other costs as separate dated events.
1. Update the order status as work progresses.
1. Record delivery proof and the final payment.
1. Complete the order with a timestamp and either a zero balance or an authorised exception.
1. Settle the wage period and record the payments made.
1. Review the dashboard and reports.
1. Complete the end-of-day checklist.

## 6. Business Requirements Register

| ID | Requirement | Priority |
| --- | --- | --- |
| BR-001 | Multi-business membership with strict tenant isolation | Critical |
| BR-002 | Mobile one-time password authentication with a business join code | Critical |
| BR-003 | Role and permission control, configurable per member | Critical |
| BR-004 | End-to-end order tracking with a reconstructable timeline | Critical |
| BR-005 | Payer and payment-method accountability on every transaction | Critical |
| BR-006 | Date-based history and search across all records | Critical |
| BR-007 | Stock entries with landed costs | High |
| BR-008 | Labour attendance, wages, advances and settlement | Critical |
| BR-009 | Machinery lifecycle from purchase to retirement | High |
| BR-010 | Camera, gallery and document evidence against records | High |
| BR-011 | End-of-day reminders and a missing-entry checklist | High |
| BR-012 | Offline entry with safe synchronisation | High |
| BR-013 | Immutable audit history for financial, attendance and wage changes | Critical |
| BR-014 | Management reporting and KPI set | High |
| BR-015 | iOS and Android; web deferred to a later release | High |
| BR-016 | Industry-agnostic core: a business in any trade adopts the platform through configuration, without code changes | Critical |
| BR-017 | Per-business terminology, categories, item attributes, order workflow and module selection | Critical |
| BR-018 | Multiple wage bases — daily, hourly, piece-rate and monthly | High |
| BR-019 | Wage period settlement that locks the period and makes it immutable | Critical |
| BR-020 | Labour groups and contractor settlement | High |
| BR-021 | Muster roll usable and savable with no network connectivity | Critical |
| BR-022 | Labour cost attributable to an order where allocation is used | Medium |

## 7. Financial Accountability

- Every expense records who paid it and by which method.
- Personal payments made by an owner or partner remain distinguishable from business cash and business accounts.
- Customer payments link to an order wherever possible.
- Transport may be linked to an order or recorded as general expenditure.
- Financial changes are never silently overwritten, including when they arrive from an offline device.
- The audit record holds the actor, the timestamp and the values before and after.
- All reports derive from stored transactions, never from a separately maintained figure.
- Monetary values are held and transmitted with decimal precision, since a rounding difference in a partner settlement is exactly the dispute this system exists to prevent.

## 8. Order Business Rules

- The order number is unique within the business.
- Order balance equals the order total less successful customer payments, subject to authorised adjustments.
- Additional items and costs remain separate historical events and never overwrite the original order.
- Transport identifies the payer and the method.
- Completion stores the date and time.
- Completion requires a zero balance, or an authorised exception with a recorded reason.
- The order workflow, its statuses and which status requires a zero balance are configured per business.
- Reference, design, work-in-progress, finished and delivery photographs may be attached.

## 9. Stock Rules

- Record supplier, material, quantity, rate and date.
- Record transport, loading, unloading, processing and other landed costs against the entry.
- Landed cost categories are configured per business.
- Stock movements are dated and available quantity derives from them.
- Adjustments require a reason.
- Supplier bills are attachable.

## 10. Labour Rules

Expanded substantially from v2. Attendance is the most frequently used function in the platform and carries the highest dispute risk.

### 10.1 Attendance

- Attendance is date-based and marked against a business calendar of weekly offs and declared holidays.
- The muster roll — all active workers on one screen for one date — is the primary means of marking, not a per-worker form.
- The business selects its attendance mode: supervisor-marked status only, or check-in and check-out with time, optionally with a photograph or a location point.
- An out-of-radius location is flagged for review and never automatically rejects an attendance record.
- Attendance must be markable and savable without connectivity, and must not duplicate when a failed submission is retried.
- Attendance may optionally be allocated to one or more orders to support labour costing.

### 10.2 Wages

- The wage basis is configurable per worker: daily wage, hourly rate with overtime, piece rate, or monthly salary.
- Rate changes carry an effective-from date and never rewrite settled history.
- Overtime threshold and multiplier are configured per business and may be overridden per worker.
- Advances reduce the amount payable at the next settlement.
- Deductions are recorded with a category and a reason.
- Partial payments remain visible in the ledger.
- Every advance, deduction and payment records the payer and the payment method.

### 10.3 Settlement

- The wage period is weekly, fortnightly or monthly, configured per business.
- Settlement computes earned less advances less amounts already paid, records the payment, and locks the period.
- A locked period is immutable. A later attendance correction requires permission and a written reason, and posts an adjustment into the following period rather than altering a settled one.
- Settlement is permission-gated and fully audited.
- Where a contractor supplies a crew, attendance is recorded per worker while settlement is made to the group.

Scope boundary.  This is an operational wage ledger, not statutory payroll. It does not compute provident fund, employees' state insurance, professional tax or tax deducted at source, and it produces no statutory register. The limitation is stated in the application so that nobody files from it.

## 11. Machinery Rules

- Planned purchases may be recorded before an actual purchase and converted into one.
- The purchase record holds cost, payer, method and evidence.
- Maintenance carries an independent history from the purchase.
- Warranty expiry and service due reminders are date-based.

## 12. Reminder Policy

- Which daily activities are required is configured per business.
- The default end-of-day reminder is 20:30 and is configurable per business and per user.
- The checklist identifies missing categories without exposing amounts in the notification text.
- Labour attendance is a default required category, because it is the entry most often forgotten and the hardest to reconstruct.
- Users may snooze, or mark a category not applicable with a reason.
- Maintenance, tasks and payment follow-ups run on their own schedules.

## 13. Media Policy

- Photographs are encouraged for designs, measurements, work in progress, finished goods, delivery, supplier bills, receipts, machinery and attendance where the mode requires it.
- Uploader and time metadata are stored with every item.
- Media is private to the business and served only through short-lived authorised links.
- Deletion of financial evidence is permission-controlled and audited.
- Compression balances storage cost against readability; an unreadable invoice is worse than no photograph.

## 14. Management Reporting

- Daily activity summary.
- Monthly receipts and payments.
- Expenses by category and by payer.
- Outstanding customer balances.
- Orders by status and by completion.
- Material spend including landed costs.
- Transport spend.
- Muster register — the month grid of workers against dates.
- Wage register — days, earned, advances, deductions, paid and balance per period.
- Outstanding wages and outstanding advances.
- Attendance percentage per worker.
- Labour cost per order, where attendance allocation is used.
- Machinery purchase and maintenance.
- Missing daily entries.
- Optional order cost and profitability snapshot.

## 15. KPI Framework

| KPI | Definition | Purpose |
| --- | --- | --- |
| Daily entry completion | Completed required entries divided by required entries | Discipline |
| Order completion rate | Completed orders divided by orders due | Delivery |
| Outstanding balance | Unpaid customer amount | Collections |
| Expense by category | Spend grouped by category | Cost control |
| Partner contribution | Personal business costs by member | Settlement |
| Material spend | Material cost plus landed costs | Production cost |
| Labour cost | Wages earned plus adjustments, by period | Workforce cost |
| Attendance completion | Days with a saved muster divided by working days | Attendance discipline |
| Wage settlement timeliness | Periods settled within the configured window | Worker trust |
| Advances outstanding | Advances not yet recovered through settlement | Cash exposure |
| Transport cost | Transport spend | Logistics |
| Maintenance due | Upcoming and overdue service | Asset reliability |
| Evidence rate | Relevant records carrying media | Documentation |

## 16. Responsibility Matrix

Cells marked configurable are permission-driven and set per member, not fixed in code.

| Activity | Owner | Partner | Manager | Staff |
| --- | --- | --- | --- | --- |
| Orders | Yes | Yes | Yes | Assigned |
| Customer payments | Yes | Yes | Configurable | No |
| Expenses | Yes | Yes | Yes | Configurable |
| Stock | Yes | Yes | Yes | Configurable |
| Mark attendance | Yes | Yes | Yes | Configurable |
| Amend locked attendance | Yes | Configurable | No | No |
| Wage advances and payments | Yes | Yes | Configurable | No |
| Settle wage period | Yes | Configurable | No | No |
| Machinery | Yes | Yes | Yes | No |
| Members | Yes | Limited | No | No |
| Business settings and configuration | Yes | Limited | No | No |
| Reports | Yes | Yes | Configurable | No |
| Audit | Yes | Yes | Configurable | No |

## 17. Technology & Operating Model

One repository holding two independently deployable applications: a Node.js and TypeScript API over PostgreSQL, and an Expo application for iOS and Android. Private object storage for media, push notifications through FCM and APNs, and one-time passwords through an approved Indian transactional SMS provider. Mobile is the daily-entry surface. Web is deferred and, when built, joins the same repository as a third application.

The single-repository decision is a business control, not only a technical preference. Both applications share one definition of the API contract and one implementation of the wage and money calculations, so the backend and the application cannot drift apart between releases, and a wage figure shown on a worker's attendance screen is produced by the same code the server uses to settle the period.

Infrastructure begins on a managed platform — managed PostgreSQL, a managed container host, S3-compatible object storage and managed Redis — with everything containerised so a later move to a larger cloud footprint is a deployment change rather than a rewrite. Building an extensive cloud estate before the pilot has real daily usage is deferred deliberately.

Specific technology selections and pinned versions are recorded in the PRD, Section 4.

## 18. Offline Business Requirement

Workshop and site users must be able to save critical entries without continuous internet. Entries and photographs queue locally and synchronise when connectivity returns, protected against duplicate writes by client-generated identifiers and idempotent endpoints.

The muster roll carries the strongest form of this requirement: attendance is marked early in the day, in the part of the premises with the weakest signal, by a user who will not wait. It must open, list workers and save with no connection at all.

Conflicting changes to money, attendance or order status are never resolved silently; they are surfaced for a person to decide.

## 19. Security & Governance

- Tenant isolation enforced in the application and again in the database, so a coding error cannot expose another business's data.
- Server-side role and permission checks on every request.
- Immutable audit trail for financial, attendance, wage, membership and permission changes.
- Media private and served only through short-lived authorised links.
- Secure authentication and session handling, with the ability to revoke a lost device.
- Automated backups with a restore rehearsed before launch.
- Membership revocation takes effect immediately.
- Exports respect the exporting user's permissions.

## 20. Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Forgotten daily entries | High | End-of-day reminders and a visible checklist |
| Poor internet in the workshop | High | Offline local storage and synchronisation |
| Duplicate writes on retry | High | Client-generated identifiers and idempotent endpoints |
| Partner disputes over contributions | High | Payer fields on every transaction plus audit |
| Wage disputes with workers | High | Append-only wage ledger, locked settled periods, adjustments rather than edits |
| Unauthorised access to another tenant | Critical | Application guard plus database row-level security, with automated negative tests |
| Lost or stolen phone | High | Secure sessions and immediate revocation |
| Storage growth from photographs | Medium | Compression, thumbnails and a storage-cost review at pilot scale |
| Incorrect edits | High | Validation, audit, soft delete |
| Complex data entry driving abandonment | High | Quick Add, muster roll, progressive forms |
| Pilot vertical leaking into the core product | High | Configuration layer plus an automated check that fails the build on vertical-specific vocabulary in core code |
| Over-configuration making onboarding slow | Medium | Vertical seed packs so a new business is usable immediately with sensible defaults |
| SMS provider registration delay blocking launch | High | Begin DLT registration in week one; a console driver keeps development unblocked |
| App store approval delay | Medium | Developer accounts opened in week one; closed testing scheduled early |
| Backend and application drifting apart between releases | High | One repository with a single shared definition of the API contract; a breaking change fails to build in the same commit rather than reaching a user |
| Provider dependency | Medium | Provider abstraction for SMS, push and storage, with monitoring |

## 21. Rollout Plan

| Stage | Outcome |
| --- | --- |
| Technical pilot | Validate the application shell, camera, notifications, offline behaviour and API against real devices |
| Internal pilot | Owner and partner test realistic workflows on the pilot business |
| Attendance pilot | Run the muster roll alongside the paper register for two wage periods and reconcile both |
| User acceptance testing | Orders, payments, stock, labour, machinery and media against the criteria in Section 22 |
| Soft launch | Production use with monitoring and verified backups |
| Full adoption | Daily entries move into the system and the paper register is retired |
| Second vertical | Onboard a business in a different trade using configuration alone, validating BR-016 |
| Optimisation | Reports, automation and integrations |

## 22. UAT Acceptance Criteria

- One-time password login works on both platforms.
- An owner can create and manage a business, including its vertical configuration.
- A partner can join by code and cannot see any other tenant's data.
- A business created on a different vertical presents different item fields and categories with no code change.
- A business can rename its core terms and the application reflects them throughout.
- An order can be created with specifications and photographs and take a partial payment.
- Transport and expenses identify the payer and the method.
- Stock entries capture landed costs and available quantity derives from movements.
- A full workshop's attendance can be marked for one date in under fifteen seconds.
- The muster roll opens, marks and saves with the device in aircraft mode, and synchronises without duplication on reconnection.
- A month of attendance settles to a payable figure that matches a manual calculation.
- A settled wage period cannot be altered, and a later correction appears as an adjustment in the following period.
- A contractor group settles as one payment while attendance remains recorded per worker.
- The muster register and wage register reconcile to the ledger.
- Machinery warranty and service reminders fire on their due dates.
- Camera, gallery and document uploads work, including delayed upload after offline capture.
- Offline entries across every module synchronise without duplication.
- The end-of-day reminder identifies missing entries by category and exposes no amounts.
- All reports reconcile to the underlying transactions.
- Financial, attendance and wage changes are auditable with before and after values.
- A backup restores successfully in a rehearsed drill.

## 23. Implementation Governance

- The PRD is the product source of truth; this BRD is the business source of truth. Both are version-controlled as Markdown under docs/ in the repository, so changes are reviewable.
- Scope changes record their reason, impact and priority.
- Architecture-breaking changes are reviewed before implementation.
- Every phase has a written exit criterion and closes with a short status note.
- Production changes consider migration and backout.
- Critical data never depends solely on client state.
- Any requirement that assumes a specific trade is challenged before it is accepted into the core.

## 24. Operational Prerequisites

These have external lead times, block launch, and involve no development work. They begin in week one.

| Item | Why it blocks | Start |
| --- | --- | --- |
| DLT registration for transactional SMS | Transactional SMS in India requires a registered entity, an approved sender header and pre-approved templates. Without it, one-time passwords do not deliver. Approval takes days to weeks. | Week 1 |
| Apple Developer Program | Required for TestFlight distribution, not only for release. Identity verification can take several days. | Week 1 |
| Google Play Console | New personal developer accounts must complete a sustained closed test before production access is granted. | Week 1 |
| Firebase project and APNs key | Credentials for Android and iOS push delivery. | Before phase 8 |
| Privacy policy and account deletion route | Both stores require a hosted privacy policy; account deletion must be available in-app and on the web. | Before phase 11 |
| Product name and package identifiers | Bundle identifiers are effectively permanent once published. | Immediately |

## 25. Scope Boundaries

Stated so that expectations are not set beyond what the platform claims.

- Not a statutory accounting or taxation system. It produces management summaries from recorded transactions, not filings.
- Not statutory payroll. It maintains an operational wage ledger and does not compute or file statutory labour deductions.
- Not an inventory valuation system in the first release. Available quantity is derived from movements; costing methods are future scope.
- Not a customer-facing application in the first release. Customers do not log in.
- Web access is deferred; the first release is iOS and Android.

## 26. Final Business Outcome

The finished platform is a dependable digital daily ledger and operations system. Every order, payment, expense, material purchase, attendance mark, wage settlement, machinery event, task and supporting photograph can be reconstructed by date, by person and by business.

For the pilot business it should reduce forgotten work, remove the paper attendance register, make partner contributions and worker wages defensible, and give the owner a reliable view of the day. For the product, it should be adoptable by a business in another trade through configuration alone — which is the difference between a tool built for one workshop and a platform worth continuing to invest in.

## 27. Change Log — v2.0 to v3.0

| Area | v2.0 | v3.0 |
| --- | --- | --- |
| Scope of the product | One named furniture business. | Industry-agnostic platform; the furniture business is the pilot tenant. BR-016 and BR-017 added. |
| Requirements register | Fifteen requirements. | Twenty-two: seven added covering generic adoption, configuration, wage bases, settlement locking, contractor groups and offline attendance. |
| Labour | Six rules covering wage, attendance, advances and settlement. | Three subsections covering attendance modes, wage bases, ledger discipline, period locking and contractor settlement; labour raised to Critical (BR-008). |
| Stakeholders | Eight. | Ten: labour contractor and prospective businesses in other trades added. |
| Reporting | Twelve reports. | Fifteen: muster register, wage register, attendance percentage and outstanding advances added. |
| KPIs | Ten. | Thirteen: attendance completion, settlement timeliness and advances outstanding added. |
| Responsibility matrix | Ten activities. | Thirteen: attendance marking, locked-attendance amendment and wage settlement separated out. |
| Risks | Ten. | Fifteen: wage disputes, vertical leakage, over-configuration, SMS registration delay and store approval delay added. |
| Rollout | Six stages. | Eight: an attendance pilot run against the paper register, and a second-vertical stage validating BR-016. |
| Acceptance criteria | Thirteen. | Twenty-one, including configuration, offline attendance and wage settlement criteria. |
| Platform scope | iOS, Android and web. | iOS and Android first; web deferred (BR-015). |
| Delivery structure | Not specified. | One repository containing the API and the mobile application as separate deployables, sharing one contract and one calculation package (Section 17). |
| New sections | — | Section 24 operational prerequisites with lead times; Section 25 explicit scope boundaries. |
