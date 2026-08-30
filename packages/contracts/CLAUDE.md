# @opsbook/contracts

Zod 4 schemas for every API request and response, plus the types inferred from
them. This package **is** the API contract.

## Rules

- **Client-safe.** No database client, no `process.env`, no secrets, no Node
  built-ins, no server-only dependency. This is bundled into the mobile app and
  anything in that bundle is public. A lint rule enforces it; do not disable it.
- **Zod is the single definition.** Types are inferred (`z.infer`), never
  declared alongside a schema and kept in sync by hand.
- Consumed as TypeScript source (`"main": "./src/index.ts"`). No build step.
- Money fields are `z.string()` with a decimal refinement — never `z.number()`.
- A breaking change here breaks both apps in the same commit. That is the point.
  Fix both sides in the same PR.
