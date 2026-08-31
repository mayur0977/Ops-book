---
description: Review, stage and commit the current changes (optionally push)
argument-hint: "[push]"
---

**Invoking this command IS the approval** that `CLAUDE.md`'s working agreement
requires. Do not ask again for permission to stage or commit. Still show the
summary — but show it as part of doing the work, not as a request to proceed.

Push only if `$ARGUMENTS` contains `push`. Otherwise commit and stop, and say
the branch is ahead by N.

## 1. Look before staging

```bash
git status --short
git diff --stat
git diff            # and the staged diff if anything is already staged
```

Read what actually changed. Do not commit a diff you have not looked at.

## 2. Check the branch first

```bash
git branch --show-current
```

Work belongs on a `feature/phase-NN-*` branch. If HEAD is `main` or `develop`,
**stop before staging anything** and say so — offer to move the changes onto a
feature branch instead. See `docs/git-workflow.md`.

## 3. Safety gates — all must pass before staging

- **Secrets.** Scan the diff for private keys, `AKIA…`, `ghp_…`, `xox…`,
  certificates, and any real `.env` file. If anything matches, **stop**, report
  it, and do not stage.
- **Junk.** No `.DS_Store`, `node_modules/`, build output, `*.log`, `.expo/`,
  keystores or provisioning profiles. If one appears, add it to `.gitignore`
  rather than committing it.
- **Vertical leak.** `bash scripts/check-vertical-leak.sh`
- **Code checks**, if application code exists yet:
  `pnpm typecheck && pnpm test:affected`

If a gate fails, fix it or stop. Never commit around a failing gate.

## 4. Decide the shape of the commit

Group the changes by intent. **If they span unrelated concerns, propose
splitting into two or more commits** and say why — one commit per idea is worth
more than one commit per session.

Do not split mechanically by folder. A schema change, its API handler, its test
and its screen are *one* vertical slice and belong in *one* commit.

## 5. Write the message

Repo convention — `type(scope): summary`

- **types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`
- **scopes:** `api`, `mobile`, `contracts`, `core`, `verticals`, `ci`, `docs`,
  `labour`, `orders`, `money`, or the phase (`phase-01`)

Rules for the body:
- Subject imperative, under ~72 chars, no trailing period
- Explain **why**, not what — the diff already says what
- Bullet the notable changes when there is more than one
- Note anything intentionally left out, or a known follow-up
- Reference the phase file when the work came from one
- End with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## 6. Commit

```bash
git add -A                     # or specific paths if splitting
git commit -F - <<'MSG'
…
MSG
```

Never `git commit -m` for a multi-line message; never `-i`; never `--amend` a
commit that has been pushed.

## 7. Push, only if asked

If `$ARGUMENTS` contains `push`: `git push origin <current-branch>`, then
confirm the remote head matches local.

If a push is rejected, **stop and report** — do not force, do not rebase
unasked.

## 8. Update the plan

If this work completed a task in the current `plan/phase-NN-*.md`, tick it. If
it ended a working session, refresh `plan/STATUS.md`. These belong in the same
commit as the work they describe.

## 9. Report

Point-wise, per `CLAUDE.md`:

- **Added** — new files and what each does
- **Changed** — modified files and what changed in each
- The commit hash and subject
- Gate results (secret scan, checks)
- Branch state — clean, and ahead by N if not pushed
