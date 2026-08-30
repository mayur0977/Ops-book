# Phase 10 — Reports & KPIs

**Size:** L
**Depends on:** Phase 9
**Goal:** every report reconciles to the underlying transactions on a seeded month.

## Tasks

### API
- [ ] Daily activity; monthly receipts and payments
- [ ] Expenses by category, and by payer (partner settlement)
- [ ] Outstanding customer balances
- [ ] Orders by status and completion
- [ ] Material spend incl. landed costs; transport spend
- [ ] Muster register, wage register, outstanding wages, advances outstanding
- [ ] Attendance percentage; labour cost per order
- [ ] Machinery purchase and maintenance
- [ ] Missing daily entries
- [ ] KPI endpoints (BRD §15 — all 13)
- [ ] CSV and PDF export, **permission-gated**
- [ ] All reports derive from stored transactions, never a maintained total

### Mobile
- [ ] Report list with date-range control
- [ ] Report detail with tabular figures
- [ ] Share/export sheet
- [ ] Dashboard KPI tiles, role-aware

### Tests
- [ ] Seeded month: every report reconciles to the transactions
- [ ] Exports respect the exporting user's permissions
- [ ] Date-range boundaries correct in the business's timezone

## Exit criteria

- [ ] All 15 reports reconcile exactly on a seeded month
- [ ] A Manager without `reports.view` cannot export
- [ ] Money in reports is decimal-exact, never a float
