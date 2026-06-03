# Security

This repository intentionally avoids raw provider configuration and secret validation. The scaffold includes only curated asset directories and placeholder examples.

## Guardrails

- No raw OpenCode config import.
- No dependency install, publish, deploy, or production access in the initial build.
- No examples with live credentials.
- Runtime plugin config changes are limited to OpenCode's in-memory `config(cfg)` hook for package-relative `skills.paths` and non-overwriting command prompt entries.
- No live user config file mutation: the package plugin does not write `opencode.json`, `.opencode/`, global config files, or other filesystem config.
- No provider, MCP, permission, telemetry, or secret registration by the package plugin.
- Mutating contributor import tooling is maintainer-only and excluded from the published package surface.
- Final publishing requires a fresh security review.

## Validation

`scripts/verify-no-secrets.mjs` provides dependency-free checks for common secret-like patterns. It is not a replacement for human security review.
