# Status

**Updated:** 2026-08-30
**Current phase:** 0 — Prerequisites
**Next task:** Start DLT registration and both store accounts (they have
multi-week lead times and block launch), then decide the product name.

## Shipped

- Repository scaffolded: workspace config, CLAUDE.md rule files, docs, phase plan
- Requirements converted to `docs/PRD.md` and `docs/BRD.md`
- ADRs 0001–0005 recorded
- CI workflow and vertical-leak check in place

## Tested

- Nothing yet — no application code exists.

## Broken / open

- **Product name undecided.** "OpsBook" is a placeholder throughout. Decide
  before the first EAS build; bundle identifiers are permanent.
- Node is 20.10.0 locally; the project needs 24.20.0.
- `/Users/mayurpatel/.git` exists — the home directory is a git repo. Unrelated
  to this project but worth removing.

## Next

Work through `plan/phase-00-prerequisites.md`. It is mostly accounts and
registrations, not code — start it today because the lead times are the
long pole.

---

### How to update this file

Rewrite the four sections above at the end of each session. Keep it short —
it is a handover note, not a changelog. Git history is the changelog.
