---
description: Do the next task in the current phase
---

1. Read `plan/STATUS.md` and the current phase file.
2. Pick the next unchecked task — or the one named in `$ARGUMENTS` if given.
3. Confirm in one line what you are about to build, then build it as a
   **vertical slice**: schema → API → tests → screens. Not a layer.
4. Follow the non-negotiable rules in `CLAUDE.md`. If the task touches tenant
   data, money, wages or attendance, re-read the relevant rule before starting.
5. Run `pnpm typecheck && pnpm test && pnpm check:vertical-leak`.
6. Tick the task in the phase file.
7. Update `plan/STATUS.md`.
8. **Stop before git.** Show the changed files and a point-wise summary of what
   was added and changed, then wait for approval to commit.

If the task belongs to a later phase, say so and stop. Do not build ahead.
