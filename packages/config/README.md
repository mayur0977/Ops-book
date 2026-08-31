# @daybook/config

Shared TypeScript, lint and Prettier configuration for every app and package.

| Export | File | Used by |
|---|---|---|
| `@daybook/config/tsconfig/base` | `tsconfig.base.json` | the root `tsconfig.base.json` |
| `@daybook/config/tsconfig/library` | `tsconfig.library.json` | `contracts`, `core`, `verticals` |
| `@daybook/config/tsconfig/node` | `tsconfig.node.json` | `apps/api` |
| `@daybook/config/oxlint` | `oxlintrc.base.json` | everything |
| `@daybook/config/oxlint/client-safe` | `oxlintrc.client-safe.json` | `contracts`, `core` |
| `@daybook/config/prettier` | `prettier.config.js` | everything |

The tsconfig base is defined **here**, and the root `tsconfig.base.json` extends
it — not the other way round. A relative `../../` in this package would resolve
against the `node_modules` symlink rather than the repo, which fails only once a
package consumes it.

## The rule that must not be lost

`packages/contracts` and `packages/core` are bundled into the mobile app, and
anything in that bundle is public (root `CLAUDE.md` rule 4). `oxlintrc.client-safe.json`
adds a `no-restricted-imports` rule banning Node built-ins, database clients and
`process.env` from those two packages.

A lint rule can be silenced with an inline comment, so it is not the only guard:
`scripts/check-client-safe.mjs` re-checks the same invariant against the source
**and** the declared dependencies, and runs as its own CI step. Lint catches it
early; the script is the one that must not be bypassed.

## Why oxlint and not ESLint

The workspace is on TypeScript 7, the native compiler. `typescript-eslint`
refuses to load against it — it throws `typescript-eslint does not support TS 7.0`
at startup, and that is true of its latest release and its canary alike
([typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)).
The choice was to drop to TypeScript 6 or to change linter.

oxlint parses TypeScript in Rust and never loads the TypeScript API, so it has no
version coupling to break again. It lints the whole workspace in about 30ms.

The cost is type-aware rules, which oxlint does not have. Nothing currently
enforced needs them. **Revisit when typescript-eslint supports TS 7** — the rule
set above is written in ESLint's own vocabulary and would port back directly.
