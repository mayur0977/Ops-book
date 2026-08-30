# How we work

A large project built in small, complete slices. The goal of this folder is
that any session — days apart — can start with "read `STATUS.md`" and be
productive in two minutes.

## Files

| File | Role |
|---|---|
| `STATUS.md` | **Read first, every session.** Where we are right now. |
| `ROADMAP.md` | All 12 phases, their state, and dependencies. |
| `phase-NN-*.md` | One file per phase: goal, tasks, exit criteria. |
| `TEMPLATE.md` | Shape for a new phase file. |

## The daily loop

1. **Read `STATUS.md`.** It says the current phase and the next task.
2. **Open the current phase file.** Work only on unchecked tasks in it.
3. **Build a vertical slice**, not a layer: schema → API → tests → screens.
   A half-built layer across three phases is worse than one finished feature.
4. **Tick tasks** as they land. A task is ticked only when tested.
5. **Update `STATUS.md`** before finishing: what shipped, what is tested, what
   is broken, what is next. Five lines.
6. **Commit** with `type(scope): summary`.

## Rules

- **Do not build ahead.** If something belongs to a later phase, note it in that
  phase file and move on. Scope creep is the main risk to a project this size.
- **A phase is done only when every exit criterion passes.** Not "mostly".
- **Exit criteria are tests where possible**, not opinions.
- If a phase turns out to be wrong, change the phase file and say why in
  `STATUS.md`. The plan serves the work, not the reverse.

## Estimates

Phase sizes are **relative effort**, not calendar dates. Working an hour or two
a day, expect roughly 6–9 months to Phase 11. The pilot business gets real value
from Phase 5 onwards — orders, money and labour all work by then.
