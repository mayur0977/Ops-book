# Design System — "Ledger"

The visual identity for the mobile app. Read with `apple-hig.md` (platform
behaviour) and `motion.md` (animation). This file owns **what it looks like**.

## 1. The idea

Every business this app serves already keeps a **register** — a ruled ledger
book where the day is written down by hand. That book is the thing we are
replacing, and it is a genuinely good piece of information design: date-led,
column-aligned, one row per event, a margin for marks, ruled lines that guide
the eye across a wide row.

So the app borrows the register's **structure**, not its texture. No paper
photographs, no leather, no fake stitching, no drop shadows pretending to be
depth. Skeuomorphism would read as costume. Instead:

- **Ruled hairlines** separate every row, everywhere. They are the strongest
  recurring element in the interface.
- **A margin rail** — a 3pt colour bar on the left edge of a row — carries
  status, exactly like a mark in a ledger's margin.
- **Columns align.** Amounts are right-aligned with tabular figures so they
  stack into a readable column, as they do on paper.
- **The date leads.** Screens are organised by day first, entity second.

The result should feel *quiet, precise and legible* — closer to a well-set
form than to a consumer app. That is the unique part: almost every competitor
in this space looks like a fintech dashboard.

**Three words:** ruled · quiet · exact.

## 2. Colour

Chosen against a hard constraint: the muster roll needs five distinct status
colours, so the brand accent cannot be green, amber, sky or red. It is indigo —
fountain-pen ink.

### Light

| Token | Hex | Use |
|---|---|---|
| `ground` | `#F7F6F3` | App background. Warm grey, deliberately not cream. |
| `surface` | `#FFFFFF` | Rows, cards, sheets |
| `surface-sunk` | `#EFEEEA` | Input fields, table headers |
| `rule` | `#E4E2DC` | The hairline. Everywhere. |
| `rule-strong` | `#C8C5BD` | Section dividers, table header underline |
| `ink` | `#17171A` | Primary text |
| `ink-2` | `#55555E` | Secondary text |
| `ink-3` | `#86868F` | Tertiary, placeholders, disabled |
| `accent` | `#2E3A8C` | Brand. Primary actions, links, focus. |
| `accent-wash` | `#E7E9F5` | Selected row, accent chip background |

### Dark

| Token | Hex | Use |
|---|---|---|
| `ground` | `#121214` | |
| `surface` | `#1B1B20` | |
| `surface-sunk` | `#25252B` | |
| `rule` | `#2C2C33` | |
| `rule-strong` | `#3D3D46` | |
| `ink` | `#EDEDF0` | |
| `ink-2` | `#A6A6B0` | |
| `ink-3` | `#74747E` | |
| `accent` | `#8F9EFF` | Lifted for contrast on a dark ground |
| `accent-wash` | `#1E2140` | |

### Semantic — status

These are **not** decorative. Each has a fixed meaning across the whole app.

| Meaning | Light | Dark | Used for |
|---|---|---|---|
| `success` | `#147A4A` | `#4ECB8B` | Present · Paid · Completed · Synced |
| `warning` | `#A2680A` | `#E0A93F` | Half day · Partially paid · Due soon |
| `info` | `#0D6E9E` | `#5CB8E8` | Leave · Pending sync · Informational |
| `neutral` | `#6E6E78` | `#8A8A94` | **Absent** · Draft · Not applicable |
| `danger` | `#B3261E` | `#F2857D` | Overdue · Destructive · Conflict |

> **Absent is grey, never red.** A worker being absent is a normal fact, not an
> error. Colouring it red makes the most-used screen in the app feel like a
> list of problems. This is a deliberate decision — do not "fix" it.

### Rules

- **Never a raw hex in a component.** Tokens only.
- **Colour is never the only signal.** Every status is a colour *and* a letter
  or label. Roughly 1 in 12 men has a colour vision deficiency and this user
  base skews heavily male.
- Contrast: **4.5:1 text**, 3:1 UI. Verify in both themes. These screens are
  used in direct sunlight — when in doubt, increase contrast.
- Dark mode is not an afterthought; workshops are dim and many phones sit in
  dark mode permanently.

## 3. Type

System fonts — SF Pro on iOS, Roboto on Android. They come with Dynamic Type,
optical sizing and every accessibility feature for free, and no bundled face
survives a user at 200% text size as gracefully.

Character comes from **how type is set**, not from an unusual typeface.

| Role | Size / Weight | Notes |
|---|---|---|
| `display` | 32 / Bold | Screen title, dashboard totals |
| `title` | 22 / Semibold | Section headers |
| `heading` | 17 / Semibold | Row primary text, worker names |
| `body` | 17 / Regular | Default |
| `secondary` | 15 / Regular | Row supporting text |
| `caption` | 13 / Regular | Timestamps, helper text |
| `label` | 11 / Semibold · **0.08em tracking · UPPERCASE** | Column headers, chips |

### The two type details that carry the identity

1. **`label` is the ledger's column header.** Small, uppercase, letterspaced,
   `ink-3`. It appears above every column and every field group. Used
   consistently it is more recognisable than a logo.
2. **Every number is tabular.** `fontVariant: ['tabular-nums']` on all amounts,
   quantities, dates and counts. Columns of money must align to the decimal.
   Without this, a ledger reads as a mess and a changing figure jitters.

Amounts also get a slightly heavier weight than their label and are always
right-aligned in a column.

Never below 15pt for body text. Never a light weight on a light ground.
`allowFontScaling={false}` is banned.

## 4. Space & shape

- **8pt grid.** Screen margin 16. Within a group 12. Between groups 24.
- **Row height 56 minimum**, 64 for rows with two lines of text.
- **Radius: 8** for cards and sheets, **6** for inputs and buttons, **full** for
  chips and avatars. Nothing larger — heavy rounding fights the ruled-line idea.
- **Borders over shadows.** Elevation is expressed with a `rule` hairline, not a
  drop shadow. Shadow only on genuinely floating things: the Quick Add button
  and a bottom sheet.
- Touch targets: **44pt iOS / 48dp Android minimum**. The muster status control
  is 56.

## 5. Components

### Row — the primary unit
The app is mostly lists. One row = one event.

```
│▌  Ramesh Kumar                     ₹ 1,240.00
│▌  Present · 8:15 AM                    P
└─────────────────────────────────────────────  ← rule hairline
 ↑ margin rail (3pt, semantic colour)
```

- Left **margin rail**, 3pt, full row height, semantic colour. This is the
  signature element — it appears in every list in the app.
- Primary text `heading`, supporting text `secondary` `ink-2`.
- Right column right-aligned, tabular.
- Bottom hairline `rule`. **No card, no shadow, no gap between rows.**

### Chip
Status as pill: `label` type, semantic colour text on a 12%-opacity wash of the
same colour. Always carries a word, never colour alone.

### Amount
Tabular, right-aligned. Currency symbol at `ink-3`, figure at `ink`. Negative
and outstanding values take `danger`; never render a minus sign alone as the
only indicator.

### Field
Label above (`label` type), input on `surface-sunk` with a `rule` border,
6pt radius, 48pt tall. Error text below in `danger` — inline on blur, never on
every keystroke.

### Section header
`label` type, `ink-3`, with a `rule-strong` line beneath running the full width.
Straight from the ledger's column header.

### Quick Add
The only floating element. Circular, `accent`, centred in the tab bar, with the
one real drop shadow in the app. Opens a sheet, is not a destination.

### Empty state
A single ruled line, one sentence in `ink-2`, and one action. No illustration,
no mascot. An empty list and a failed request must never look the same.

## 6. Iconography

SF Symbols on iOS, Material Symbols on Android, both at **Regular weight,
outlined** — filled icons fight the hairline aesthetic. 24pt standard, 28pt in
the tab bar. Every icon-only control carries an accessibility label.

## 7. What this system is not

- Not a fintech dashboard. No gradient cards, no glassmorphism, no neon.
- Not playful. No mascots, no illustrations, no emoji in the interface.
- Not skeuomorphic. No paper textures or book bindings.
- Not dense for its own sake. Whitespace is what makes a ruled layout readable.

## 8. Implementation

Tokens land in Phase 1 as `apps/mobile/src/ui/theme/` — one file, both themes,
consumed through NativeWind. A component that hardcodes a colour, a radius or a
font size is a review-blocking error.

Build order for `src/ui/`: `Row`, `Chip`, `Amount`, `Field`, `SectionHeader`,
`Sheet`, `EmptyState`, `Button`. Everything else composes from these eight.
