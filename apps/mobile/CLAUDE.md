# apps/mobile

Expo SDK 57 (RN 0.87, React 19.2) + expo-router + NativeWind.
Read the root `CLAUDE.md` and `docs/design/apple-hig.md` first.

## Layout

```
app/                  expo-router file routes
  (auth)/  (tabs)/{index,orders,add,labour,more}
  orders/[id]/  labour/{muster,[workerId],wages}
src/
  api/                typed client built on @opsbook/contracts
  offline/            db.ts  outbox.ts  sync.ts  conflicts.ts
  features/<domain>/  screens + components for one domain
  ui/                 design-system primitives
  labels/             terminology resolution (see below)
  stores/             zustand: session, active business, sync status
```

## Rules specific to this app

- **Never hardcode a user-facing noun.** "Order", "Worker", "Job" come from the
  business's terminology map via `useLabel('order')`. See `docs/verticals.md`.
- **Never hardcode an entity's fields.** Extra fields are rendered from the
  business's `field_definitions`. A furniture business shows length/width/height;
  a garage shows vehicle number. Same screen, same code.
- **Only render enabled modules.** Check `modules_enabled` before showing a tab
  or a quick-add action.
- **Offline-first, not offline-tolerant.** A screen that writes must work with
  the network off. Build the offline path first; treat online as the fast case.
  This is non-negotiable for the muster roll.
- **Money arrives as a string.** Parse with `decimal.js` from `@opsbook/core`.
  Never `parseFloat` an amount.
- **Wage figures shown on-device** use the shared `@opsbook/core` functions —
  the same ones the server runs at settlement. Never reimplement the maths here.
- Every list needs explicit loading, empty, offline, error and retry states.
  An empty list and a failed fetch must never look the same.

## Design

Apple HIG is the baseline (see `docs/design/apple-hig.md`), adapted per platform
rather than cloned to Android. Minimum touch target 44pt iOS / 48dp Android —
these screens get used with dusty hands in bright sunlight.
