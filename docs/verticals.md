# Generic Business Model — how one app serves many industries

The product thesis: a furniture workshop, a fabrication unit, a tailoring
business and a garage run the **same core** and differ only in configuration.
"Atharv Furniture" is row #1 in `businesses`, not the product.

## The rule

> Industry-specific concepts are **data**, not code.

A business picks a vertical at creation. That selection runs a seed pack **once**.
After that the vertical is never consulted at runtime, and every seeded value is
editable by the business.

CI enforces the boundary: `pnpm check:vertical-leak` fails the build if words
like `furniture` or `teakwood` appear outside `packages/verticals/`.

## The four mechanisms

### 1. Custom fields — `field_definitions`

Instead of columns for `length`, `width`, `height`, `material`, `finish`:

```
field_definitions
  business_id, entity_type, key, label, data_type, unit,
  required, options jsonb, sort_order, archived_at
```

Values live in a `custom_fields JSONB` column (GIN indexed) on the entity.
Validation happens at the API boundary against the business's definitions —
the database only guarantees valid JSON.

| Business | `order_item` fields |
|---|---|
| Furniture | length, width, height (mm), material, finish, hardware |
| Fabrication | weight (kg), grade, thickness (mm), coating |
| Garage | vehicle number, model, odometer, complaint |
| Tailoring | chest, waist, length, fabric, style |

Same table. Same screen. Same code.

`data_type` ∈ `text | number | decimal | date | select | multiselect | boolean`.

### 2. Configurable workflow — `order_statuses`

```
order_statuses
  business_id, code, label, sort_order,
  is_initial, is_terminal, requires_zero_balance
```

The eight statuses from the PRD are the default seed. A garage might use
Received → Diagnosed → Approved → In Repair → Ready → Delivered. No code change.
`requires_zero_balance` encodes the completion rule from BRD §8.

### 3. Terminology — `businesses.label_overrides`

```json
{ "order": "Job", "orders": "Jobs", "customer": "Client", "worker": "Technician" }
```

The app resolves every user-facing noun through `useLabel('order')`. **No
user-facing noun is ever hardcoded in a screen.**

### 4. Module toggles — `businesses.modules_enabled`

```json
{ "orders": true, "stock": false, "labour": true,
  "machinery": false, "transport": true, "tasks": true }
```

A service business with no inventory turns stock off and never sees the tab.
Toggling off hides the module and blocks its endpoints — it never deletes data.

## Editable taxonomies

Seeded per vertical, owned by the business afterwards: expense categories,
material categories, units, labour roles, attachment categories, order types,
landed-cost categories, payment methods.

## A seed pack

One file per vertical in `packages/verticals/`:

```ts
export const furniture: VerticalSeed = {
  key: 'furniture',
  labels: { order: 'Order', worker: 'Karigar' },
  modules: { orders: true, stock: true, labour: true, machinery: true },
  itemFields: [
    { key: 'length', label: 'Length', dataType: 'number', unit: 'mm' },
    { key: 'material', label: 'Material', dataType: 'select',
      options: ['Teak', 'Plywood', 'MDF'] },
  ],
  expenseCategories: ['Transport', 'Polish', 'Hardware', 'Levelling', ...],
  orderStatuses: [...],
  defaultWageType: 'daily',
};
```

**Adding an industry must never require touching `apps/`.** If it does, the
abstraction has a hole — fix the abstraction, not the seed.

## Verticals at launch

| Vertical | Why |
|---|---|
| `furniture` | The pilot tenant, and the source of these requirements. |
| `fabrication` | Similar shape, different fields and units — proves the abstraction cheaply. |
| `general` | Neutral fallback with no exotic fields. Anyone can start here. |

Later, from the same file format: construction, tailoring, printing, automotive,
catering.

## Where it does NOT apply

Some things are universal and must stay in the core, un-configurable — money
arithmetic, tenant isolation, the audit trail, the wage ledger's append-only
discipline, the sync contract. Configurability there is a bug, not a feature.
