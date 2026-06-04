# OpenCode Integration

OpenCode is the primary integration target for BROS Harness.

## Package-native install/update

Use the complete installation guide as the source of truth:

[`../installation.md`](../installation.md)

The BROS package CLI writes the selected OpenCode config safely, preserves unrelated plugin entries, creates minimal BROS config when absent, and requires an OpenCode restart.

Project install:

```bash
bunx bros-harness@latest install
```

Project update:

```bash
bunx bros-harness@latest update
```

Fallback package-native commands:

```bash
bunx --package bros-harness@latest bros install
bunx --package bros-harness@latest bros update
npx --package bros-harness@latest bros install
npx --package bros-harness@latest bros update
```

Global OpenCode config scope:

```bash
bunx bros-harness@latest install --scope global
bunx bros-harness@latest update --scope global
```

The resulting config entry is:

```json
{
  "plugin": ["bros-harness@0.5.1"]
}
```

This is the preferred path for users and agents. Adding the JSON entry manually is only a fallback when the package is already resolvable by OpenCode. The CLI pins to the current package version by default because `@latest` can be stale in OpenCode's package cache. Use `--channel latest` only when intentionally keeping the convenience selector; rerun `bros update` after releases and restart OpenCode. Avoid bare `bros-harness` in the source checkout because local package resolution can shadow the package cache. Local path examples are contributor-only.

Older OpenCode plugin installer commands such as `opencode plugin bros-harness@latest` or `opencode plugin bros-harness@latest --force` are fallback/troubleshooting paths only. Prefer the package-runner install/update commands above because they exercise the BROS config writer, backups, dry-run support, and package-runner-first update flow.

OpenCode Desktop cache refresh is not automatic. If stale package loading persists after update and restart, run `bros update --refresh-cache --dry-run --json` first. After explicit approval, `--refresh-cache` targets only `~/.cache/opencode/node_modules/bros-harness` plus BROS lock entries. Do not delete the full cache or `node_modules` directory.

## Packaged assets

- Agents: `assets/opencode/agents/`
- Commands: `assets/opencode/commands/`
- Skills: `assets/opencode/skills/`
- Templates: `assets/opencode/templates/`
- Docs: `assets/opencode/docs/`

## Runtime behavior

The package plugin resolves assets relative to its own package root. It validates key asset directories, then uses OpenCode's in-memory `config(cfg)` hook to add the package-relative skills directory to `skills.paths` when safe, register packaged agent entries without overwriting existing agents, and add packaged command prompt entries without overwriting existing commands.

This runtime hook changes only the merged config object OpenCode passes to the plugin at startup. It is distinct from `bros install` and `bros update`, which are explicit scoped config writers with backups and dry-run support. The runtime plugin does not register providers, MCP servers, top-level permissions, telemetry, or secrets.

## Safe agent workflow

For end-to-end native OpenCode detection, npm version selection, plugin installation, verification, troubleshooting, and restart guidance, see [`../installation.md`](../installation.md).

Agents should use:

```bash
bros agent-install-prompt
```

The prompt instructs agents to follow the installation guide, run the package-runner install/update commands after approval, restart OpenCode, and verify that BROS agents are visible. Older `opencode plugin ... --force` commands are fallback/troubleshooting only.
