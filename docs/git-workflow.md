# Git workflow — git-flow

Initialised with `git flow init`. Production branch is **`main`** (not `master`),
integration branch is **`develop`**, feature prefix is **`feature/`**.

```
main                 production. Tagged releases only. Never commit directly.
  └── develop        integration. Everything merges here first.
        └── feature/phase-NN-name    one branch per phase
```

## The loop, per phase

```bash
git flow feature start phase-01-foundation      # branches off develop
# …work, committing with /commit as you go…
git flow feature finish phase-01-foundation     # merges to develop, deletes branch
git push origin develop
```

`git flow feature finish` merges into `develop` and deletes the local branch. It
does **not** push — do that yourself, so the merge is reviewable first.

To share a feature branch before it is finished:

```bash
git flow feature publish phase-01-foundation
```

## One branch per phase

A phase is the unit of work, so it is the unit of branching. `feature/phase-05-labour`
holds every commit for the labour module — schema, API, tests and screens.

Within the branch, commits stay small and vertical: one slice at a time, never
one layer at a time. Use `/commit` for each.

A phase branch may live for weeks. Rebase or merge `develop` into it periodically
so the eventual finish is not a merge conflict marathon:

```bash
git fetch origin && git merge origin/develop
```

## Releases

A phase reaching its exit criteria is **not** a release. Releases happen when
something is worth deploying, which will be several phases apart.

```bash
git flow release start 0.1.0
# bump versions, update changelog
git flow release finish 0.1.0
git push origin main develop --tags
```

**Tag prefixes.** This project ships two deployables that do not release in
lockstep, so tags are `api-v*` and `app-v*` rather than a single version. git-flow's
release command assumes one version per repo — for now, tag manually:

```bash
git tag api-v0.1.0 && git push origin api-v0.1.0
```

## Hotfixes

Branches off `main`, merges to both `main` and `develop`:

```bash
git flow hotfix start 0.1.1
git flow hotfix finish 0.1.1
```

## Rules

- **Never commit directly to `main` or `develop`.** Work happens on a feature
  branch and arrives by merge.
- **`main` only ever receives merges from `release/` or `hotfix/`.**
- Enable branch protection on `main` and `develop` in GitHub settings.
- `/commit` still applies on feature branches — nothing is staged or committed
  without approval.
- Migrations are reviewed as their own commit, inside the phase branch.

## Current state

| Branch | Purpose |
|---|---|
| `main` | production, level with origin |
| `develop` | integration, level with origin |
| `feature/phase-01-foundation` | active work — Phase 1 |
