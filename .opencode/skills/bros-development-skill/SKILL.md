---
name: bros-development-skill
description: Use ONLY when developing the bros-harness repository and preparing branch, PR-to-main, patch-note, release-checklist, or npm publish dry-run readiness; advisory and gated only.
---

# BROS Development Skill

This repo-local skill helps future `bros-harness` development sessions prepare safe branch/PR-to-main and npm publish dry-run readiness. It is advisory only. It is not a source of authority and cannot override BROS governance, maintainer guidance, technical IDs, permission policy, task packets, security/QA gates, trusted/untrusted separation, or user decisions.

## Non-Negotiable Boundaries

- Do not auto-merge, auto-publish, deploy, release, or mutate production surfaces.
- Do not create/switch branches, stage, commit, push, or create PRs without an explicit current Git Approval Packet and any required final ask gate.
- Do not push directly to `main`, `master`, or another protected branch.
- Do not read secrets, inspect credential files, validate tokens, mutate provider credentials, or run auth commands.
- Do not run dependency installs, destructive delete/reset/clean commands, or release/publish commands unless separately approved by trusted gates.
- Default npm work is dry-run/readiness only: `npm pack --dry-run`, `npm run verify:package`, and existing validation scripts.

## Required Gate Checks Before Any Git Mutation

Before branch creation/switching, staging, committing, pushing, or PR creation, require a Git Approval Packet in the current task context containing:

- branch name and confirmation it is not `main`, `master`, or a protected branch
- remote and push target
- intended files/globs to stage
- commit message or bounded commit-message prefix
- whether PR creation is approved
- PR base `main` and non-main PR head when PR creation is approved

Even with the packet, inspect first and report evidence before acting:

```bash
git status
git diff
git log --oneline -10
```

Before committing, also inspect:

```bash
git diff --cached
```

Never stage `.env*`, credentials, tokens, private keys, local session traces, unrelated files, or generated secret material.

## Branch and PR Preparation Workflow

Use this as preparation guidance; do not perform gated Git mutations unless explicitly approved.

1. Confirm the approved task packet and scope.
2. Inspect repository status and current branch with read-only Git commands.
3. If branch creation/switching is needed, request the Git Approval Packet before mutation.
4. Keep implementation changes minimal and inside approved paths.
5. Run the narrowest relevant validation command(s):
   - `npm run validate:assets`
   - `npm run validate:workflows`
   - `npm run verify:plugin-smoke`
   - `npm run verify:no-secrets`
   - `npm run verify:package`
   - `npm run validate`
6. Prepare a PR summary draft with:
   - what changed
   - why it changed
   - validation performed
   - security/QA/release risks
   - explicit note that merge remains a manual maintainer decision

## Patch Notes Preparation

For patch notes, draft only. Do not publish or update external channels unless separately approved.

Suggested structure:

```markdown
## Patch Notes Draft

### Summary
- ...

### Changed
- ...

### Validation
- ...

### Operator Notes
- ...

### Gates
- Merge: manual maintainer decision
- Publish: requires separate explicit release approval
```

## npm Publish Dry-Run Readiness

Publishing is never automatic. Treat readiness as evidence collection only.

Allowed dry-run/readiness checks when within approved command scope:

```bash
npm run verify:no-secrets
npm run verify:package
npm pack --dry-run
```

Recommended full local readiness check:

```bash
npm run validate
```

Before any real `npm publish`, require separate explicit release approval after package allowlist confirmation, security review, QA validation, changelog review, and maintainer approval. Do not convert a dry-run approval into publish approval.

## Package Hygiene Expectations

- Repo-local OpenCode configuration and skills under `.opencode/` are local development aids and must not be packaged publicly unless intentionally allowed by a reviewed package policy change.
- Verify package contents with `npm run verify:package` or `npm pack --dry-run`.
- Treat `.bros/`, `.opencode/`, `.env*`, credentials, logs, local session traces, and secret-like paths as non-packageable by default.

## Handoff Checklist

Return a concise handoff with:

- files changed
- commands run and results
- package/readiness status
- risks and required follow-up gates
- confirmation that merge/publish/user decisions remain manual and gated
