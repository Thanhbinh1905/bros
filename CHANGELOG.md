# Changelog

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
