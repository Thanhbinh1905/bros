# Installation

BROS Harness is structured as a package-first OpenCode plugin. The primary configuration path is the package snippet, not copying local development folders.

## For humans

Add the plugin package to OpenCode config:

```json
{
  "plugin": ["bros-harness"]
}
```

Restart OpenCode after editing config. The running session keeps the config it loaded at startup.

Optional read-only checks after the package is available:

```bash
bros snippet
bros doctor
bros list-assets
```

## For AI agents

For a complete native OpenCode setup flow, use the self-contained agent guide: [`native-opencode-agent-installation.md`](native-opencode-agent-installation.md).

Use a bounded instruction:

```text
Configure BROS Harness with { "plugin": ["bros-harness"] }. Do not install dependencies, publish, mutate provider/MCP/permission/telemetry/secret settings, or overwrite existing config files. Merge only the plugin entry if approved, show the proposed diff, and remind the human to restart OpenCode.
```

The package helper can print this prompt:

```bash
bros agent-install-prompt
```

## What the plugin changes

- Uses OpenCode's in-memory `config(cfg)` hook at startup.
- Adds package-relative BROS skills to `skills.paths` only when the existing field shape is schema-compatible.
- Adds packaged BROS command prompt entries to `command` without replacing existing command keys.

## What the plugin does not change

- No providers.
- No MCP servers.
- No permission changes.
- No telemetry.
- No secrets or credential validation.
- No provider, MCP, permission, telemetry, or secret registration.
- No filesystem writes.
- No live user config file mutation; `opencode.json`, `.opencode/`, and global config files are not written by the package plugin.

## Local contributor checks

For repository development only:

```bash
npm run validate
node bin/bros.mjs doctor
```

Publishing and dependency installation remain separate gated actions.
Asset import is maintainer-only source maintenance for repository asset refreshes, not part of package installation. Package users should rely on the plugin snippet and read-only CLI helpers above; import tooling is not exposed as an installed package command.
