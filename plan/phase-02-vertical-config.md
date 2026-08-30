# Phase 2 — Vertical configuration

**Size:** L
**Depends on:** Phase 1
**Goal:** two businesses on different verticals present different fields,
categories and terminology — with no code branch anywhere.

## Why now

Every entity built after this (orders, materials, workers, machines) carries
custom fields. Building them first means retrofitting all of them.

## Tasks

### Schema
- [ ] `field_definitions` — UNIQUE (business_id, entity_type, key)
- [ ] `custom_fields JSONB` + GIN index on entities that accept them
- [ ] `order_statuses`, `expense_categories`, `material_categories`, `units`
- [ ] `businesses.modules_enabled`, `businesses.label_overrides`

### Packages
- [ ] `packages/verticals` — seed pack type + loader
- [ ] Seed: `furniture`, `fabrication`, `general`
- [ ] `@daybook/core` — custom-field validation against definitions

### API
- [ ] Run the seed pack once at business creation
- [ ] CRUD for field definitions, statuses, taxonomies (permission: `business.configure`)
- [ ] Validate `custom_fields` against definitions on every write
- [ ] Module toggle endpoint; disabled modules **block their endpoints**

### Mobile
- [ ] Dynamic form renderer driven by field definitions
      (text, number, decimal, date, select, multiselect, boolean)
- [ ] `useLabel()` terminology hook
- [ ] Tabs and quick actions respect `modules_enabled`
- [ ] Business settings screens for fields, statuses, categories, terminology

### Tests
- [ ] Two businesses, two verticals, different rendered forms — no code branch
- [ ] Writing an undefined custom field is rejected
- [ ] A disabled module's endpoints return 404
- [ ] `check:vertical-leak` passes with all three seeds present

## Exit criteria

- [ ] Creating a business as `furniture` and as `fabrication` yields different
      item forms, categories and statuses, from the same code path
- [ ] Renaming "Order" to "Job" changes every screen
- [ ] Turning off `stock` hides the module and blocks its API
- [ ] No vertical vocabulary outside `packages/verticals/`

## Out of scope

Actual orders — Phase 3. This phase builds the machinery they will use.
