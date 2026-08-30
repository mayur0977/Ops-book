## What & why

Phase: `plan/phase-NN-*.md` · Task:

## Checklist

- [ ] Vertical slice, not a half-built layer
- [ ] Task ticked in the phase file
- [ ] `plan/STATUS.md` updated if this ends a session

**If it touches tenant data**
- [ ] `business_id` on every new table, RLS enabled **and forced**
- [ ] Cross-tenant 404 test added for every new collection endpoint
- [ ] All queries go through `withTenant()`

**If it touches money, wages or attendance**
- [ ] `NUMERIC(14,2)` / string in JSON / `decimal.js` — no floats, no `z.number()`
- [ ] Audit row written in the same transaction
- [ ] Append-only respected; corrections are reversing entries

**If it adds a mutation**
- [ ] Validation, authorization, audit, idempotency — all four present
- [ ] Route declares its permission in `policy.ts`

**If it adds a screen**
- [ ] Loading / empty / error / offline / content states
- [ ] Works with the network off, if it writes
- [ ] No hardcoded user-facing nouns; no hardcoded entity fields
- [ ] 44pt/48dp targets, dark mode, 200% text size

**Always**
- [ ] `pnpm typecheck && pnpm test && pnpm check:vertical-leak` green
- [ ] No secret added to the repo or the app bundle
