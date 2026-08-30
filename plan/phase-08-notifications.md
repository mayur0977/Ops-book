# Phase 8 — Tasks, notifications, end of day

**Size:** M
**Depends on:** Phase 7
**Goal:** a missed attendance entry produces the 20:30 reminder naming
attendance — and nothing else.

## Tasks

### Schema
- [ ] `tasks`, `future_purchases`, `reminders`, `notifications`
- [ ] Per-business EOD config: which categories are required
- [ ] Per-user notification preferences; device push tokens

### API
- [ ] Task and future-purchase CRUD; recurring reminders
- [ ] BullMQ schedulers: EOD sweep, maintenance due, warranty expiry,
      payment follow-up
- [ ] EOD evaluator — **one function** feeding both the push and the dashboard
      checklist, so they can never disagree
- [ ] Push registration and delivery (expo-notifications → FCM/APNs)
- [ ] Notification inbox and history
- [ ] Snooze; mark not-applicable with a reason

### Mobile
- [ ] Push permission request at a sensible moment (not on first launch)
- [ ] Notification inbox
- [ ] Dashboard EOD checklist
- [ ] Task list and detail; reminder settings
- [ ] Deep links from a notification to the relevant screen

### Tests
- [ ] EOD names only missing categories
- [ ] **Notification text contains no amounts** (BRD §12)
- [ ] Snooze and N/A behave correctly
- [ ] Timezone correctness — 20:30 in the business's timezone
- [ ] Maintenance reminder fires on the due date

## Exit criteria

- [ ] A day with no attendance produces a 20:30 push naming attendance only
- [ ] Push and dashboard checklist always agree
- [ ] No financial detail in any notification body
- [ ] Reminders fire correctly across timezone boundaries
