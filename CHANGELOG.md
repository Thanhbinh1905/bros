# Changelog

## 0.4.2 - 2026-06-04

- Fixed runtime BROS model routing so explicit `agents`, `categories`, or `model_routing` entries can update the `model` field for preexisting known BROS agents while preserving their prompt, permission, mode, and tool fields.

## 0.4.1 - 2026-06-04

- Updated the primary global BROS configuration path to `~/.config/opencode/bros.config.json` while preserving repository config loading from `./bros.config.json`.
- Stopped primary-loading the old global config path `~/.config/bros-harness/bros.config.json`; users should migrate BROS-specific config to the OpenCode config directory.
- Updated docs and config tests for the OpenCode global config path behavior.
- Last known-good package before this pending release: `0.3.0`; repair by pinning `opencode plugin bros-harness@0.3.0 --force` if maintainers withdraw `0.4.1` after publication.

## 0.3.0 - 2026-06-04

- Added rich `bros.config.json` support for `model_routing`, `categories`, `agents`, and rich model entries with `variant` and `fallback_models`.
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
