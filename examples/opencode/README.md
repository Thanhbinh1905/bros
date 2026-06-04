# OpenCode Example

Use the complete installation guide as the source of truth: [`../../docs/installation.md`](../../docs/installation.md).

Quick project install:

```bash
bunx bros-harness@latest install
```

Update or repair an existing project install:

```bash
bunx bros-harness@latest update
```

Use global scope when requested:

```bash
bunx bros-harness@latest install --scope global
```

Update or repair an existing global install:

```bash
bunx bros-harness@latest update --scope global
```

Fallback package-runner forms when direct `bunx` is unavailable:

```bash
bunx --package bros-harness@latest bros install
bunx --package bros-harness@latest bros update
npx --package bros-harness@latest bros install
npx --package bros-harness@latest bros update
```

Older OpenCode plugin installer commands such as `opencode plugin bros-harness@latest --force` are fallback/troubleshooting only after the package-runner path is unavailable or insufficient.

The package-runner installer writes a config entry like this:

```json
{
  "plugin": ["bros-harness@0.5.1"]
}
```

The exact version is the current package version. Use `--channel latest` only when intentionally keeping the `@latest` selector. If OpenCode keeps loading a stale cached package after update and restart, preview `--refresh-cache --dry-run` before any explicit scoped refresh.

This example does not include provider keys, private endpoints, MCP servers, permissions, telemetry, credentials, or local absolute paths. Restart OpenCode after installation, upgrade, or any approved config change.

Optional BROS model routing belongs in `bros.config.json`; see `../bros.config.example.json` and validate with `bros config-status`.
