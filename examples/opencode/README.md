# OpenCode Example

Use the complete installation guide as the source of truth: [`../../docs/installation.md`](../../docs/installation.md).

Quick project install:

```bash
opencode plugin bros-harness
```

Use global scope when requested:

```bash
opencode plugin bros-harness --global
```

The installer writes a config entry like this:

```json
{
  "plugin": ["bros-harness"]
}
```

This example does not include provider keys, private endpoints, MCP servers, permissions, telemetry, credentials, or local absolute paths. Restart OpenCode after installation or any approved config change.

Optional BROS model routing belongs in `bros.config.json`; see `../bros.config.example.json` and validate with `bros config-status`.
