# ADR 0006 — "Ledger" design direction

**Status:** Accepted · 2026-08-30

## Context

No design direction existed. The brief was: nice, unique, simple, easy to use,
with animation. The users are workshop owners, supervisors and managers — not
comfortable with dense software, working outdoors, one-handed, with dusty hands.

The default for this product category is a fintech dashboard: gradient cards,
rounded everything, a purple or teal accent, illustrations for empty states.
It photographs well and works badly in sunlight, and every competitor looks
like it.

## Decision

**"Ledger"** — borrow the *structure* of the paper register the app replaces,
never its texture.

- Ruled hairlines separate every row, the strongest recurring element
- A 3pt coloured margin rail on each row's left edge carries status
- Right-aligned tabular figures in aligned columns
- 11pt uppercase letterspaced column labels
- Borders, not shadows. One drop shadow in the whole app (Quick Add).
- Indigo ink accent (`#2E3A8C`), chosen because the muster roll needs five
  distinct status colours and the brand cannot be green, amber, sky or red
- System fonts — character comes from how type is set, not an unusual face,
  and nothing bundled survives 200% text size as well

Motion is feedback, concentrated in four signature moments: the attendance
mark (an ink-stroke wipe), ruling off on save, the Quick Add stagger, and
figures that count rather than snap.

## Consequences

**Good.** The ledger's structure is genuinely good information design for this
data — date-led, column-aligned, one row per event. It is familiar to users who
already keep the paper version. High contrast and hairlines survive sunlight
better than soft cards. It is distinctive without being decorative.

**Costs.** Less immediately "modern" than a card-based dashboard, and the
discipline only holds if it is enforced — one shadowed gradient card breaks the
system. Hence the tokens-only rule (root `CLAUDE.md` #11) and `/design-check`.

**Two decisions that will look like bugs and are not:**
- **Absent is grey, not red.** Absence is a normal fact. Red makes the most-used
  screen in the app read as a list of problems.
- **No illustrations or mascots in empty states.** A ruled line, a sentence, one
  action.

## Alternatives rejected

- *Fintech dashboard* — generic, poor in sunlight, fights the data shape
- *Skeuomorphic ledger* (paper texture, leather, stitching) — reads as costume,
  ages badly, hurts legibility
- *Material You / dynamic colour* — Android-only, and user-chosen colour would
  collide with our fixed semantic status colours
