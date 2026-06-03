# Release Process

Publishing is not approved in the initial scaffold.

Required release gates:

1. Asset review confirms no private data or local-only assumptions.
2. Security review approves package contents and examples.
3. QA validates CLI, manifests, and documentation.
4. Maintainers confirm package allowlist and changelog.
5. Release automation is enabled only after explicit approval.

## Package Integrity Dry Run

Before any release review, run the local validation bundle:

```bash
npm run validate
npm pack --dry-run
```

The validation bundle includes `scripts/verify-package-contents.mjs`, which runs `npm pack --dry-run --json` and fails if the package would include local session traces, raw OpenCode config, `.opencode` config, maintainer import tooling, package workspace sources, logs, or secret-like path names.

The dry run is read-only package inspection. It does not publish, mutate dist-tags, install dependencies, read credentials, or contact production systems.

## Local Versus Published State

Local source remediation can update documentation, manifests, lifecycle metadata, scripts, or package dry-run contents before a registry release exists. Treat those changes as unreleased until a separately approved publish gate completes. Release notes must distinguish the last published npm package from local pending-release fixes and must not imply that local remediation is available from npm before publication.

Repository `.bros/` session traces are private working records and must remain excluded from package contents. If `.bros/` files are deleted, untracked, or otherwise changed in a working tree, do not silently fold that state into a release. Record it as a local handoff caveat and require a future explicit Git Approval Packet before any commit, push, tag, or PR action.

## Rollback Readiness

Every release note should name the last known-good package version and the pinned install command for repair. Rollback instructions must be scoped to the `bros-harness` plugin entry only and must not recommend broad config rewrites, deletion of user config directories, provider/MCP edits, permission changes, telemetry changes, credential checks, git resets, npm dist-tag mutation, or publishing.

If a release is withdrawn, maintainers should publish separate user-facing guidance that tells users to restart OpenCode after changing plugin config. Do not ask users to paste or share raw config, environment variables, traces, or logs without redaction.
