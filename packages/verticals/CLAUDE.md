# @opsbook/verticals

Per-industry seed packs. **This is the only place in the workspace where
industry-specific vocabulary is allowed.** CI enforces that.

Each vertical is one file exporting: item field definitions, expense and
material categories, units, order statuses, labour roles, default wage type,
attachment categories, and the terminology map.

Adding an industry must never require touching `apps/` or the other packages.
If it does, the abstraction has a hole — fix the abstraction, not the seed.

See `docs/verticals.md` for the model and the seed-pack shape.
