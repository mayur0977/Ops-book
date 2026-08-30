# @opsbook/config

Shared `tsconfig`, ESLint and Prettier configuration for every app and package.

Built in Phase 1. The one rule that must land here first:

```js
// Restricted imports — packages/contracts and packages/core are bundled into
// the mobile app, and anything in that bundle is public.
'no-restricted-imports': ['error', {
  paths: ['node:fs', 'node:child_process', 'pg', 'drizzle-orm/node-postgres'],
  patterns: ['**/db/**', '**/platform/**'],
}]
```

Applied to `packages/contracts` and `packages/core` only.
