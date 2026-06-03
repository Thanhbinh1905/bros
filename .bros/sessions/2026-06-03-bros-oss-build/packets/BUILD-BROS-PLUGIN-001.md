# Build Packet Artifact

## Summary

- Task ID: BUILD-BROS-PLUGIN-001
- Owner: bro-build
- Phase: 5
- Priority: P0
- Date: 2026-06-03

## Scope

Package-first OpenCode plugin restructuring for BROS Harness, including package metadata, root plugin entrypoint, read-only CLI helper, README/docs/examples, and session trace.

## Trusted Gates

- Architecture direction accepted for package-first plugin model.
- Security approval SHIELD-BROS-PLUGIN-001 applied with strict conditions.
- Writes limited to the repository root.
- Publishing, dependency installation, live OpenCode config mutation, provider/MCP/permission/telemetry/secret behavior, and skipped raw skill imports remained out of scope.

## Implementation Trace

- Exposed `src/plugin.mjs` through package `main` and `exports`.
- Added conservative plugin config hook for package-relative skills and commands.
- Updated CLI commands for snippet, doctor, list-assets, and agent-install-prompt.
- Updated package-first installation and OpenCode docs.
- Preserved skipped skill count at three.

## Security Notes

No raw secrets, credential values, provider configuration, MCP server configuration, telemetry, permission registration, or live config writes were added.

## Handoff

QA and security should verify package metadata, plugin behavior, CLI read-only behavior, docs clarity, and no-install validation results.
