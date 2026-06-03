# Compatibility

## Support Matrix

| Surface | Status | Notes |
| --- | --- | --- |
| OpenCode plugin runtime | Supported first target | Package exposes an OpenCode plugin entrypoint through `src/plugin.mjs`; assets are organized under `assets/opencode/`. |
| OpenCode install path | Supported through OpenCode plugin installer | Use `opencode plugin bros-harness@latest` for first install, or `opencode plugin bros-harness@latest --force` when updating or repairing an existing install. Manual JSON edits are fallback only. |
| OpenCode config mutation | Not supported by package runtime | Runtime uses an in-memory `config(cfg)` hook only; it does not write `opencode.json`, `.opencode/`, global config, providers, MCP, top-level permissions, telemetry, or secrets. Optional BROS permission profiles only adjust packaged BROS agent permissions after fail-closed validation. |
| Node.js | Supported on Node `>=20` | The package `engines.node` field requires Node 20 or newer. CLI helpers use only built-in Node modules. |
| Package managers | npm-compatible package publication | Release checks use `npm pack --dry-run`; package consumers should install through OpenCode's plugin installer rather than running repository dependency installs. |
| Operating systems | Linux and macOS expected; Windows unverified | The runtime uses package-relative paths and Node APIs. Windows is not claimed as validated until a maintainer runs the same validation and OpenCode smoke checks there. |
| Git workspaces | Git repository not required for package use | Package users can install from npm without a git checkout. Contributor validation assumes a source checkout rooted at this repository. |
| Non-git workspaces | Supported for package use with caveats | OpenCode must be launched from the workspace whose project config receives the plugin entry, or the plugin should be installed globally. |
| Claude integration | Roadmap / adapter-only | Documentation exists for integration direction; there is no production installer. |
| Codex integration | Roadmap / adapter-only | Documentation exists for integration direction; there is no production installer. |
| IDE integration | Roadmap / adapter-only | The adapter SDK defines interfaces only. |

## Read-Only Diagnostics

The `bros doctor`, `bros status`, `bros snippet`, `bros list-assets`, and `bros agent-install-prompt` commands are intended to be local-only and copy-paste safe. They must not inspect or print user config files, environment variables, provider settings, MCP settings, telemetry settings, or credential values.

`bros doctor` verifies package-local assets and manifest shape. `bros status` prints package metadata and manifest counts only.

## Version Guidance

Use `@latest --force` for normal updates, or the pinned version documented in `docs/installation.md` when cache, `latest` resolution, or an existing installed plugin version is suspect. Restart OpenCode after installation, upgrade, or plugin config changes because OpenCode loads plugin configuration at startup.
