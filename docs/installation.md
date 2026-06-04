# Installation Guide

This is the canonical guide for installing and updating BROS Harness in OpenCode.

BROS Harness is a package-first OpenCode plugin. The supported package-native commands update OpenCode config safely, create a minimal `bros.config.json` when absent, preserve unrelated config fields, and require a full OpenCode restart before verification.

## Primary commands

Project scope is the default.

Install:

```bash
bunx bros-harness@latest install
```

Update:

```bash
bunx bros-harness@latest update
```

Fallbacks when the direct `bunx` form is unavailable:

```bash
bunx --package bros-harness@latest bros install
bunx --package bros-harness@latest bros update
npx --package bros-harness@latest bros install
npx --package bros-harness@latest bros update
```

Global package installation is secondary and should be used only when you intentionally want the CLI available outside one command invocation:

```bash
npm install -g bros-harness@latest
bros install
bros update
```

Global OpenCode config scope is separate from globally installing the npm package. To write the global OpenCode config, pass `--scope global`:

```bash
bunx bros-harness@latest install --scope global
bunx bros-harness@latest update --scope global
```

Preview without writing files:

```bash
bunx bros-harness@latest install --dry-run
bunx bros-harness@latest update --dry-run --json
```

Machine-readable output:

```bash
bunx bros-harness@latest install --json
```

By default, both `install` and `update` write the concrete current package version into OpenCode config. Use `--channel latest` only when you intentionally want the config entry to stay on `@latest`.

## What install/update changes

For project scope, the CLI targets the existing OpenCode config in this order:

- `./opencode.jsonc`, when present
- `./opencode.json`, when `opencode.jsonc` is absent
- `./opencode.jsonc`, when no OpenCode config exists yet
- `./bros.config.json`

For global OpenCode scope, the CLI uses the same OpenCode config selection under `~/.config/opencode`:

- `~/.config/opencode/opencode.jsonc`, when present or when no OpenCode config exists yet
- `~/.config/opencode/opencode.json`, when `opencode.jsonc` is absent and `opencode.json` exists
- `~/.config/opencode/bros.config.json`

The command ensures the OpenCode plugin entry is present as:

```json
{
  "plugin": ["bros-harness@0.5.1"]
}
```

The exact version is the current `bros-harness` package version being executed by the package runner. A concrete pinned version is the default because OpenCode can otherwise keep resolving a stale cached `@latest` package. Existing non-BROS plugin entries are preserved. Existing BROS plugin specs such as `bros-harness`, `bros-harness@latest`, or pinned `bros-harness@...` are normalized to the current package version so rerunning `update` remains idempotent.

If you intentionally prefer the convenience selector instead of a concrete version, opt in explicitly:

```bash
bunx bros-harness@latest install --channel latest
bunx bros-harness@latest update --channel latest
```

That writes:

```json
{
  "plugin": ["bros-harness@latest"]
}
```

Existing `opencode.jsonc` files are preserved as the update target so the CLI does not create a duplicate sibling `opencode.json`. The CLI accepts standard JSONC comments and trailing commas, then writes normalized JSON-compatible content back to the selected file with a backup when changes are made.

If `bros.config.json` is absent, the command creates the minimal valid config:

```json
{
  "$schema": "https://raw.githubusercontent.com/Thanhbinh1905/bros/main/examples/bros.config.schema.json"
}
```

If `bros.config.json` already exists, user-managed fields are preserved. Unknown or invalid BROS config shapes fail closed; the CLI does not attempt risky migrations.

## Safety guarantees

The package-native install/update path:

- writes only the selected OpenCode config and BROS config files;
- backs up existing files before mutation;
- uses dry-run mode without writes or backups;
- writes atomically with a temporary file in the same directory where practical;
- refuses malformed JSON/JSONC and unsafe symlink targets;
- preserves existing `opencode.jsonc` target files instead of creating duplicate `opencode.json` files;
- preserves unrelated OpenCode config fields;
- redacts sensitive-looking terms from command output;
- does not execute package-manager install/update commands internally;
- does not delete caches by default;
- deletes no cache data unless `--refresh-cache` is explicitly passed;
- does not collect provider API keys, prompt for provider auth, write `.env` files, add MCP servers, edit telemetry, publish packages, or mutate production/cloud resources.

OpenCode loads config at startup. Fully quit and restart OpenCode after any install/update command before checking agents or commands.

## Verify after restart

After restarting OpenCode, verify that BROS agents are visible:

```bash
opencode agent list
```

Expected BROS agents include:

- `mighty-bro`
- `bro-build`
- `bro-test`
- `bro-shield`
- `bro-docs`
- `bro-ops`
- `bro-design`
- `bro-ui`
- `bro-explore`

Run a minimal smoke test:

```bash
opencode run --agent mighty-bro "hello"
```

Local package diagnostics:

```bash
bros doctor
bros status
bros config-status
bros list-assets
```

`bros config-status` validates only BROS-specific config at the supported BROS config paths. It does not read provider credentials, MCP secrets, telemetry values, or environment values.

## LLM-agent assisted guide

Use this prompt for Claude Code, AmpCode, Cursor, OpenCode, or another coding agent:

```text
Install or update BROS Harness by following docs/installation.md as the source of truth.

Ask whether project scope or global OpenCode scope is intended. Prefer project scope unless the human explicitly chooses global scope.

Use these commands:
- Install: bunx bros-harness@latest install
- Update: bunx bros-harness@latest update
- Fallback install: bunx --package bros-harness@latest bros install, or npx --package bros-harness@latest bros install
- Fallback update: bunx --package bros-harness@latest bros update, or npx --package bros-harness@latest bros update
- Global npm package path is secondary: npm install -g bros-harness@latest, then bros install or bros update

Before any config edit, show the selected scope and files. Use --dry-run first when possible. Do not edit providers, MCP servers, top-level permissions, telemetry, secrets, credentials, .env files, npm publishing, npm dist-tags, production resources, or cloud resources.

Do not delete caches by default. If OpenCode Desktop still appears stale after restart and normal update, use `--refresh-cache --dry-run` first, then ask for explicit approval before running a non-dry-run refresh. The refresh must be scoped to the BROS package cache, never the full cache or node_modules directory.

After install/update, tell the human to fully restart OpenCode, then verify with opencode agent list and opencode run --agent mighty-bro "hello".
```

The CLI can print a similar prompt:

```bash
bros agent-install-prompt
```

## Scoped OpenCode package cache refresh

Use cache refresh only after normal install/update, restart, and verification still indicate stale BROS package loading. Default install/update never deletes caches.

Preview first:

```bash
bunx bros-harness@latest update --refresh-cache --dry-run --json
```

After explicit approval, run the scoped refresh:

```bash
bunx bros-harness@latest update --refresh-cache
```

Likely OpenCode Desktop package cache roots:

- Windows: `%userprofile%\.cache\opencode\node_modules`
- macOS/Linux: `~/.cache/opencode/node_modules`

Rules:

1. Dry-run before deletion.
2. Delete only `node_modules/bros-harness` under the OpenCode cache root.
3. If text `bun.lock` exists, remove only the BROS package lock entry while preserving dependency declarations.
4. If binary `bun.lockb` exists, delete only that lock file, and only during explicit non-dry-run refresh.
5. Do not delete the full cache directory.
6. Do not delete the full `node_modules` directory.
7. Restart OpenCode Desktop after the scoped refresh.
8. Rerun the package-native update command and verify agents again.

Do not inspect or print credentials while troubleshooting cache state.

## Manual config fallback

Manual config editing is a fallback when the package-native command cannot run but OpenCode can already resolve the package. Merge only the plugin entry and preserve unrelated config:

```json
{
  "plugin": ["bros-harness@0.5.1"]
}
```

If editing manually, back up the existing config first, avoid provider/MCP/telemetry/permission/secret fields, and restart OpenCode before verification.

## Contributor checks

For repository development only:

```bash
npm run validate
node bin/bros.mjs doctor
node bin/bros.mjs status
node bin/bros.mjs config-status
node bin/bros.mjs install --dry-run --json
node bin/bros.mjs update --dry-run --json
npm pack --dry-run
```

Publishing, dependency installation, release tagging, and npm dist-tag mutation remain separate maintainer-gated actions.
