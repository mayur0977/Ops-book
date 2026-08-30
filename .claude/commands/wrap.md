---
description: End the session — update STATUS.md and summarise
---

1. Review what changed this session (`git status`, `git diff --stat`).
2. Tick any completed tasks in the current phase file.
3. Rewrite `plan/STATUS.md`:
   - **Shipped** — what landed
   - **Tested** — what is actually covered, honestly
   - **Broken / open** — anything left half-done or newly discovered
   - **Next** — the single next task
4. If every exit criterion in the phase passes, mark the phase ☑ in
   `plan/ROADMAP.md` and set STATUS to the next phase.
5. Report in three lines what a person picking this up tomorrow needs to know.

Be honest about what is not tested. A STATUS file that overstates progress is
worse than none.
