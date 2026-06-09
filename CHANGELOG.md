# Changelog

## 0.6.7 - 2026-06-09

- Added tiered governance, named fast path modes, depth-aware routing profiles, expanded capability categories, expiry-bound approval packages, and normalized packet/trace guidance.
- Added deterministic routing scenario validation and extended plugin smoke coverage for routing profile precedence and approval package hard-deny preservation.
- Updated configuration schema, examples, public docs, templates, and topology inventory for the enhanced BROS control-plane topology.
- Removed the release-blocking `bro-build` broad Bash wildcard allow by switching unmatched Bash to ask-gated fallback and explicit local validation/build/test allowlists.
- Fixed approval-package startup logging so approval-package events report package expiry metadata instead of undefined permission-profile fields.
- Updated package metadata for local `0.6.7` release preparation without running release commands, tagging, publishing, committing, or pushing.

## 0.5.2 - 2026-06-04

- Made package update behavior cache-aware while defaulting installed plugin references to a pinned package version.
- Added an explicit `--refresh-cache` update path and realpath containment checks for safer package-cache reuse.

## 0.5.1 - 2026-06-04

- Fixed OpenCode install/update behavior to preserve existing JSONC formatting and comments while avoiding duplicate `opencode.json` creation.

## 0.5.0 - 2026-06-04

- Added package-native install and update support so packaged BROS assets can be installed and refreshed through the npm-delivered helper flow.
- Hardened release and runtime safety checks around package contents, install/update behavior, and validation coverage.
- Migrated and simplified OpenCode installation documentation for package-first usage, compatibility notes, and repair guidance.

## 0.4.2 - 2026-06-04

- Fixed runtime BROS model routing so explicit `agents`, `categories`, or `model_routing` entries can update the `model` field for preexisting known BROS agents while preserving their prompt, permission, mode, and tool fields.

## 0.4.1 - 2026-06-04

- Updated the primary global BROS configuration path to `~/.config/opencode/bros.config.json` while preserving repository config loading from `./bros.config.json`.
- Stopped primary-loading the old global config path `~/.config/bros-harness/bros.config.json`; users should migrate BROS-specific config to the OpenCode config directory.
- Updated docs and config tests for the OpenCode global config path behavior.
- Last known-good package before this pending release: `0.3.0`; repair by pinning `opencode plugin bros-harness@0.3.0 --force` if maintainers withdraw `0.4.1` after publication.
## 0.4.0 - 2026-06-04

- Added BROS rendering guidance that prevents shell prompt markers in generated command examples and transcripts.

## 0.3.0 - 2026-06-04

- Updated rich `bros.config.json` support to use `categories`, `agents`, and ordered top-level `fallback_models`; BREAKING: removed the former top-level `fallback_model` and `model_routing` keys.
- Rejected restricted fallback routing for `coder_build`, `security`, `qa_review`, and `ops` to preserve role-specific safety boundaries.
- Added a dedicated `docs/configuration.md` guide with raw GitHub schema URL examples.
- Added and extended configuration validation tests for the richer config format.
- Updated CLI `config-status` and `agent-install-prompt` output for the expanded configuration model.

## 0.2.1 - 2026-06-04

- Simplified OpenCode installation guidance for agents and manual setup while preserving safety boundaries around providers, permissions, secrets, publishing, and dist-tags.
- Removed hardcoded packaged BROS agent models so agents inherit OpenCode defaults unless explicit BROS model routing is configured.
- Updated plugin smoke coverage for model inheritance, fallback routing, and explicit coder/build routing behavior.

## 0.2.0 - 2026-06-04

- Fixed OpenCode plugin startup by ignoring OpenCode runtime context fields when resolving optional BROS config input.
- Updated OpenCode install and repair guidance to prefer `bros-harness@latest`, including explicit `--force` upgrade commands for existing plugin installs and source-checkout shadowing notes.
- Relaxed default `bro-build` Bash permissions for routine local development commands while preserving ask/deny gates for git mutation, dependency installs, Docker mutation, publish, secret reads, destructive commands, force push, and production/cloud operations.
- Pruned stack-specific bundled skills from the public builtin pack so BROS ships only core orchestration, planning, implementation, QA, security, ops, docs, and UI skills; stack-specific skills should live in the user-added skill root when project evidence requires them.

## 0.1.7 - 2026-06-04

- Reconciled local import/lifecycle accounting for three skipped raw skills and five skill-associated artifacts removed after approved cleanup.
- Clarified release-state caveats around local remediation versus published npm package contents.
- Added release handoff caveats for private `.bros/` session traces and future Git Approval Packet requirements before committing or publishing remediation work.

## 0.1.6 - 2026-06-03

- Corrected OpenCode installation guidance to use `opencode plugin bros-harness` as the primary package installer flow before manual config snippets.

## 0.1.5 - 2026-06-03

- Added flexible feature-branch Git permission patterns for BROS executor agents with explicit approval-packet requirements.
- Hardened dangerous Git, GitHub, and npm release command denials for packaged OpenCode agent assets.
- Documented packaged OpenCode plugin installation and native agent installation guidance.

## 0.1.4 - 2026-06-03

- Fixed packaged command config to use OpenCode's `template` field.
- Fixed frontmatter parsing for quoted permission keys containing `:`.

## 0.1.3 - 2026-06-03

- Fixed OpenCode 1.15 plugin loading by exporting the V1 plugin module shape with `id` and `server`.

## 0.1.2 - 2026-06-03

- Added package plugin agent registration so raw OpenCode installs can load BROS agents from `plugin: ["bros-harness"]`.

## 0.1.1 - 2026-06-03

- Fixed npm CLI bin packaging posture for `bros` by ensuring the packaged `bin/bros.mjs` entry is executable with a valid Node shebang.

## 0.1.0 - 2026-06-03

- Initial sanitized repository scaffold.
- Added curated OpenCode asset tree placeholders and validation scripts.
- Added package, CLI, plugin, manifest, adapter, documentation, and examples skeletons.
