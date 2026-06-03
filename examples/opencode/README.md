# OpenCode Example

Use the complete installation guide as the source of truth: [`../../docs/installation.md`](../../docs/installation.md).

Quick project install:

```bash
opencode plugin bros-harness@latest
```

Repair or upgrade an existing project install:

```bash
opencode plugin bros-harness@latest --force
```

Use global scope when requested:

```bash
opencode plugin bros-harness@latest --global
```

Repair or upgrade an existing global install:

```bash
opencode plugin bros-harness@latest --force --global
```

The installer writes a config entry like this:

```json
{
  "plugin": ["bros-harness@latest"]
}
```

This example does not include provider keys, private endpoints, MCP servers, permissions, telemetry, credentials, or local absolute paths. Restart OpenCode after installation, upgrade, or any approved config change.

Optional BROS model routing belongs in `bros.config.json`; see `../bros.config.example.json` and validate with `bros config-status`.
