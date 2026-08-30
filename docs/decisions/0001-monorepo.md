# ADR 0001 — One repository, two applications

**Status:** Accepted · 2026-08-30

## Context

The backend and the mobile app could live in two repositories or one. The
original plan proposed two, with contract drift handled by generating an
OpenAPI document from the API's Zod schemas, generating a typed client in the
app, and failing the app build when the committed client differed.

## Decision

A single repository containing `apps/api`, `apps/mobile`, and shared packages
`contracts`, `core`, `verticals`, `config`.

## Consequences

**Good.** Contract drift becomes structurally impossible rather than detected
after the fact — both apps import the same Zod schemas, so a breaking change
fails to compile in the same commit. The codegen step, the published contract
artefact and the drift check are all deleted.

`@daybook/core` lets the muster roll compute a payable wage offline using the
*same function* the server runs at settlement. Two implementations of wage
arithmetic that drift apart is a dispute with a worker.

**Costs, and their mitigations.**

| Cost | Mitigation |
|---|---|
| Metro does not resolve pnpm's symlinked layout reliably | `node-linker=hoisted` in `.npmrc` + workspace root in Metro `watchFolders`, set at project start |
| CI would run everything on every push | `turbo run test --filter=...[origin/main]` |
| Docker build context | API image builds from repo root; `.dockerignore` excludes `apps/mobile` |
| Two deployables, one history | Prefixed tags `api-v*` / `app-v*`, separate pipelines |
| Server code could reach the app bundle via a shared package | Restricted-import lint rule in `packages/config` |

**Reversal.** Split when a second team owns one side and release cadences
genuinely conflict, or when one half must be shared externally. Splitting a
clean workspace is mechanical; reconciling two drifted repos is not — which is
why this order is the right one.
