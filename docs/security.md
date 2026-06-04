# Security

This repository intentionally avoids raw provider configuration and secret validation. The scaffold includes only curated asset directories and placeholder examples.

## Guardrails

- No raw OpenCode config import.
- No dependency install, publish, deploy, or production access in the initial build.
- No examples with live credentials.
- Runtime plugin config changes are limited to OpenCode's in-memory `config(cfg)` hook for package-relative `skills.paths`, non-overwriting BROS agent entries, and non-overwriting command prompt entries.
- Optional BROS model routing config is fail-closed: unknown keys and invalid model route values reject plugin startup, removed `fallback_model` and `model_routing` keys are not accepted, top-level `fallback_models` is the only global fallback surface, and restricted categories (`coder_build`, `security`, `qa_review`, `ops`) reject per-entry `fallback_models` and ignore global fallback routing instead of silently falling back.
- Optional BROS permission profiles are fail-closed and scoped: only `readonly`, `review_safe`, `build_limited`, and `trusted_ops` are accepted; each opt-in requires repo scope, expiry, and reason logging, while `trusted_ops` also requires `hard_review: true`.
- `bro-build` allows routine local Bash by default for implementation efficiency, but keeps explicit ask/deny gates for git mutation, dependency installs, Docker mutation, secret reads, provider credential mutation, npm publish/dist-tags, destructive delete/reset/clean operations, force push, and production/cloud mutation.
- Permission profiles only tune packaged BROS agent permissions at config time. They do not introduce top-level OpenCode `permission` and append hard denies for secret reads, provider credential mutation, npm publish/dist-tags, destructive delete/reset/clean operations, force push, and production/cloud mutation.
- No live user config file mutation: the package plugin does not write `opencode.json`, `.opencode/`, global config files, or other filesystem config.
- No provider, MCP, top-level permission, telemetry, or secret registration by the package plugin.
- Mutating contributor import tooling is maintainer-only and excluded from the published package surface.
- Final publishing requires a fresh security review.

## Validation

`scripts/verify-no-secrets.mjs` provides dependency-free checks for common secret-like patterns. BROS config values are also validated for secret-like patterns and must not include provider credentials, API keys, tokens, or other secret material. This validation is not a replacement for human security review.

`scripts/verify-package-contents.mjs` performs an npm package dry-run check and fails if publishable contents include local session traces, raw OpenCode config, maintainer import tooling, logs, package workspace sources, or secret-like file paths.

`scripts/verify-plugin-smoke.mjs` includes permission-profile regression checks for valid profile activation, scoped local validation allow rules, rejection of unsafe profile combinations, and hard denial of publish/force-push classes after profile merge.

## Trace Hygiene

Repository docs, package docs, release notes, support tickets, and `.bros/` session artifacts must be redacted before sharing or packaging. `.bros/` session traces are private working records and are excluded from package contents by default; only sanitized copies intentionally moved into approved public docs paths may be shared. Do not include:

- raw secrets, tokens, API keys, provider keys, credentials, passwords, cookies, or private keys;
- environment variable values or `.env*` contents;
- raw OpenCode config from a user's machine;
- provider, MCP, permission, telemetry, or auth headers with values;
- unredacted sensitive logs, stack traces containing credentials, or private local paths when not needed;
- private `.bros` traces or local review artifacts in published package contents.

Safe diagnostics should report only package-local metadata, counts, paths, statuses, and redacted classifications. If a secret-like file is encountered during approved inspection, record only the path, line number when needed, variable name or classification, and `[REDACTED]` for values.

Historical claims from prior sessions, imported notes, missing session IDs, or cached review artifacts must be labeled `historical/non-authoritative` or `stale/unverified` unless fresh cited inspection confirms them. Sanitized public copies must preserve that label so reviewers do not confuse old working notes with current source truth.
