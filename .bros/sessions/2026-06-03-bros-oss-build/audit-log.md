# Audit Log

## 2026-06-03

- Validated task packet assignment, scope, gates, approvals, and acceptance criteria.
- Created sanitized repository scaffold under the target root.
- Planned asset import from approved directories only.
- Recorded that raw OpenCode config remains forbidden and was not copied.

## Repair Import Summary - BUILD-BROS-OSS-001R

- Updated at: 2026-06-03T02:01:23Z
- Scope: sanitized asset import from approved OpenCode asset directories only.
- Raw OpenCode config and secret-like values were not copied.
- Total source candidates: 156
- Imported files: 153
- Skipped files: 3

### Counts by Area
- agents: candidates=9, imported=9, skipped=0
- commands: candidates=5, imported=5, skipped=0
- skills: candidates=131, imported=128, skipped=3
- docs: candidates=2, imported=2, skipped=0
- templates: candidates=9, imported=9, skipped=0

### Notes
- Manifest files were regenerated from imported files.
- Import report was generated only if one or more approved candidates were skipped.

## Security Remediation Summary - BUILD-BROS-OSS-002

- Updated at: 2026-06-03.
- Hardened publishable agent permission frontmatter so dependency installation, arbitrary package scripts, and Docker runtime/mutation commands require approval by default.
- Replaced local absolute source paths in publishable manifests and import report with relative asset paths and sanitized source reference categories.
- Preserved the three skipped skills as skipped pending separate sanitized review/import follow-up.
- Raw OpenCode config, raw skipped skill files, and secret values were not copied.

## Evidence Packet Repair - DOCS-BROS-OSS-002

- Persisted sanitized EXP-BROS-OSS-001 evidence artifact for QA verification; raw config, secret values, and local absolute private paths were excluded.

## Plugin-First Restructuring - BUILD-BROS-PLUGIN-001

- Updated at: 2026-06-03.
- Scope: package metadata, root OpenCode plugin entrypoint, read-only CLI helper, package-first README/docs/examples, and session trace.
- Package snippet `plugin: ["bros-harness"]` is now the primary install guidance.
- Runtime plugin resolves package-relative assets, validates key asset directories, adds packaged skills and commands through conservative schema-compatible config hooks, and avoids provider, MCP, permission, telemetry, secret, and filesystem-write behavior.
- CLI helper commands are read-only: snippet, doctor, list-assets, and agent-install-prompt.
- The three skipped skills remain skipped pending separate sanitized review.

## Plugin QA and Security Remediation - BUILD-BROS-PLUGIN-002

- Updated at: 2026-06-03.
- Persisted the sanitized EXP-BROS-PLUGIN-001 evidence packet for QA verification.
- Clarified that runtime plugin changes are limited to OpenCode's in-memory config hook for package-relative skills paths and non-overwriting command entries.
- Clarified that live user config file writes remain disallowed by default and that the package plugin does not register providers, MCP servers, permissions, telemetry, or secrets.
- Hardened the package surface so maintainer-only mutating import tooling is env-gated and excluded while read-only validation scripts remain available.

## Release Cleanup Summary - BUILD-BROS-RELEASE-CLEANUP-001

- Updated at: 2026-06-03.
- Removed `packages/` from the package `files` allowlist and aligned `.npmignore` so TypeScript workspace source is excluded from the publish dry-run surface.
- Removed the consumer-visible `import:assets` package script while keeping maintainer-only import tooling repository-local, environment-gated, and excluded from the package surface.
- Rewrote the README around the professional BROS brand, the theme “Move slower than chaos. Ship faster than rework.”, workflow, safety constraints, installation, comparison, and contribution guidance.
- Preserved plugin safety claims: OpenCode-first package snippet, narrow in-memory config hook for skills path and command entries only, no live config file writes, no provider/MCP/permission/telemetry/secret behavior, packaged agents not auto-registered by default, and three skipped skills still excluded pending review.
- Real publish, dependency installation, live OpenCode config mutation, tag push, deploy, skipped skill import, and secret validation were not performed.

## Release Cleanup Repair - BUILD-BROS-RELEASE-CLEANUP-002

- Updated at: 2026-06-03.
- Removed stale consumer-facing documentation references that presented maintainer-only asset import tooling as an `npm run import:assets` package command.
- Preserved the package guidance that users should install through the plugin snippet and read-only CLI helpers, while asset import remains maintainer-only source maintenance outside the published package command surface.
