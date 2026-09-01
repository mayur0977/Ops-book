# apps/mobile

Expo SDK 57 (RN 0.86.3, React 19.2) + expo-router + NativeWind.

Versions come from `expo install --check`, never from memory — SDK 57 pins
RN 0.86.3, not 0.87. NativeWind 4 also requires Tailwind **3.x**: Tailwind 4
moved to a CSS-first config that NativeWind does not read.

Read the root `CLAUDE.md` first, then **all three** design files:

| File | Owns |
|---|---|
| `docs/design/design-system.md` | What it looks like — the "Ledger" identity |
| `docs/design/apple-hig.md` | How it behaves — platform, accessibility, forms |
| `docs/design/motion.md` | How it moves — animation, haptics, performance |

## Layout

```
app/                  expo-router file routes
  (auth)/  (tabs)/{index,orders,add,labour,more}
  orders/[id]/  labour/{muster,[workerId],wages}
src/
  api/                typed client built on @daybook/contracts
  offline/            db.ts  outbox.ts  sync.ts  conflicts.ts
  features/<domain>/  screens + components for one domain
  ui/                 design-system primitives + theme tokens
  labels/             terminology resolution
  stores/             zustand: session, active business, sync status
```

## The design identity, in one paragraph

The app borrows the structure of the paper register it replaces. **Ruled
hairlines** separate every row. A **3pt coloured margin rail** on each row's left
edge carries status. Amounts are **right-aligned tabular figures** in aligned
columns. Column headers are **11pt uppercase letterspaced labels**. Borders, not
shadows. Quiet, precise, legible — deliberately not a fintech dashboard.

## Rules specific to this app

### Design
- **Tokens only.** A hardcoded colour, radius, font size or duration is a
  review-blocking error. Everything comes from `src/ui/theme/`.
- **Absent is grey, never red.** A worker being absent is a normal fact, not an
  error. This is deliberate — do not "fix" it.
- **Every number is tabular** (`fontVariant: ['tabular-nums']`). Amounts,
  quantities, dates, counts. Without it, columns read as a mess and changing
  figures jitter.
- **Colour is never the only signal.** Every status is a colour *and* a letter
  or word.
- Compose from the eight primitives in `src/ui/` — `Row`, `Chip`, `Amount`,
  `Field`, `SectionHeader`, `Sheet`, `EmptyState`, `Button`. Add a ninth only
  when two screens genuinely need it.

### Motion
- **Reanimated worklets only.** Core `Animated` is banned — it runs on the JS
  thread and stutters on the mid-range Android phones our users own.
- **Nothing over 240ms on a data-entry path.** By the hundredth repetition,
  300ms feels broken.
- **`useReducedMotion()` in every animated component.** Replace movement with a
  cross-fade — never remove the feedback entirely.
- Pair a haptic with every meaningful state change. iOS full set, **Android
  Light only**.
- One animation owns a moment. Scattered effects read as generated.
- Test at 60fps on **real** mid-range Android hardware. The simulator lies.

### Behaviour
- **Never hardcode a user-facing noun.** "Order", "Worker", "Job" come from the
  terminology map via `useLabel('order')`. See `docs/verticals.md`.
- **Never hardcode an entity's fields.** Extra fields render from the business's
  `field_definitions`. Furniture shows length/width/height; a garage shows
  vehicle number. Same screen, same code.
- **Only render enabled modules.** Check `modules_enabled` before showing a tab
  or quick action.
- **Offline-first, not offline-tolerant.** A screen that writes must work with
  the network off. Build the offline path first, treat online as the fast case.
  Non-negotiable for the muster roll.
- **Money arrives as a string.** Parse with `decimal.js` from `@daybook/core`.
  Never `parseFloat` an amount.
- **Wage figures use shared `@daybook/core` functions** — the same ones the
  server runs at settlement. Never reimplement the maths here; two
  implementations that drift is an argument with a worker about their pay.
- Every list needs loading, empty, error, offline and content states. An empty
  list and a failed fetch must never look identical.

## Before a screen is done

- [ ] Tokens only — no hardcoded colour, radius, size or duration
- [ ] All five states implemented
- [ ] Works one-handed; primary controls in the bottom third
- [ ] 44pt iOS / 48dp Android minimum targets
- [ ] Readable at 200% text size, correct in dark mode, 4.5:1 contrast
- [ ] Android system back does the right thing
- [ ] Writes work with the network off
- [ ] VoiceOver order matches visual order
- [ ] No hardcoded nouns; no hardcoded entity fields
- [ ] Tabular figures on every number
- [ ] Reduce Motion handled
- [ ] 60fps on real Android hardware
