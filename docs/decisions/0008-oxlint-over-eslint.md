# ADR 0008 — oxlint instead of ESLint, because of TypeScript 7

**Status:** Accepted · 2026-08-31

## Context

The workspace is pinned to TypeScript 7.0.2 — the Go-native compiler, and the
current stable release.

`typescript-eslint` does not run on it. It is not a peer-range warning that can
be waived: both the meta package and `@typescript-eslint/parser` throw at module
load.

```
Error: typescript-eslint does not support TS 7.0.
```

This is true of 8.68.0 (latest) and of the `canary` tag. Support is tracked in
[typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)
and is not released. Without a TypeScript-aware parser, ESLint cannot read a
`.ts` file at all, so `pnpm lint` — a required CI job — cannot pass.

The options were to drop the workspace to TypeScript 6.0.3, which
`typescript-eslint` supports, or to change linter.

## Decision

**oxlint 1.80.0**, configured in `packages/config/oxlintrc.*.json`. TypeScript
stays at 7.0.2.

## Consequences

oxlint parses TypeScript in Rust and never loads the TypeScript compiler API, so
this class of breakage cannot recur — the linter and the compiler are no longer
version-coupled. It lints the workspace in roughly 30ms, and it removed the only
unmet peer dependency in the tree.

The rule that had to survive the move is the client-safe `no-restricted-imports`
guard for `packages/contracts` and `packages/core` (root `CLAUDE.md` rule 4).
oxlint implements it, including the `patterns` form, and it is verified by a
negative test rather than assumed.

The cost is type-aware rules, which oxlint does not have. Nothing currently
enforced needs them; if one is ever needed, `tsc --noEmit` still runs in the
same CI job.

Lint is not the only guard on client-safety, and deliberately so — an oxlint
rule can be silenced with an inline comment. `scripts/check-client-safe.mjs`
re-checks the same invariant against both the source and the **declared
dependencies**, which no linter can see, and runs as its own CI step.

Revisit when `typescript-eslint` supports TypeScript 7. The rule set is written
in ESLint's own vocabulary and would port back directly. That reversal would be
a new ADR, not an edit to this one.
