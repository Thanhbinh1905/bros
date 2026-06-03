# OpenCode Integration

OpenCode is the primary integration target for BROS Harness.

## Package Installer

Use the complete installation guide as the source of truth:

[`../installation.md`](../installation.md)

OpenCode's plugin installer makes the npm package available to OpenCode and updates config in the selected scope.

Project scope:

```bash
opencode plugin bros-harness
```

Global scope:

```bash
opencode plugin bros-harness --global
```

The resulting config entry is:

```json
{
  "plugin": ["bros-harness"]
}
```

This is the preferred path for users and agents. Adding the JSON entry manually is only enough when the package is already resolvable by OpenCode. Local path examples are contributor-only.

## Packaged assets

- Agents: `assets/opencode/agents/`
- Commands: `assets/opencode/commands/`
- Skills: `assets/opencode/skills/`
- Templates: `assets/opencode/templates/`
- Docs: `assets/opencode/docs/`

## Runtime behavior

The package plugin resolves assets relative to its own package root. It validates key asset directories, then uses OpenCode's in-memory `config(cfg)` hook to add the package-relative skills directory to `skills.paths` when safe, register packaged agent entries without overwriting existing agents, and add packaged command prompt entries without overwriting existing commands.

This runtime hook changes only the merged config object OpenCode passes to the plugin at startup. It is distinct from live user config file mutation: the plugin does not write `opencode.json`, `.opencode/`, global OpenCode config files, or other filesystem config. The plugin does not register providers, MCP servers, top-level permissions, telemetry, or secrets.

## Safe agent workflow

For end-to-end native OpenCode detection, npm version selection, plugin installation, verification, troubleshooting, and restart guidance, see [`../installation.md`](../installation.md).

Agents should use:

```bash
bros agent-install-prompt
```

The prompt instructs agents to follow the installation guide, run OpenCode's plugin installer after approval, restart OpenCode, and verify that BROS agents are visible.
