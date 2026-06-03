# Installation Guide

This is the source of truth for installing BROS Harness into OpenCode.

BROS Harness is a package-first OpenCode plugin. The primary installation path is OpenCode's own plugin installer. Do not rely on only pasting `{"plugin":["bros-harness"]}` into `opencode.jsonc`: that config entry does not guarantee OpenCode has installed or cached the npm package it must load.

## Prerequisites

Confirm the local tools are available:

```bash
opencode --version
opencode plugin --help
npm --version
node --version
```

Check the published package metadata:

```bash
npm view bros-harness dist-tags version --json
```

As of this release, the validated published package is `bros-harness@0.1.6` and the expected `latest` dist-tag is `0.1.6`.

## Install

For the current project config, run:

```bash
opencode plugin bros-harness
```

For global OpenCode config, run this only when you want BROS Harness in every OpenCode workspace:

```bash
opencode plugin bros-harness --global
```

If OpenCode has a stale cached package, or if npm metadata shows a stale `latest` dist-tag, pin the validated package and replace the existing plugin entry:

```bash
opencode plugin bros-harness@0.1.6 --force
```

For global scope with the pinned package, add `--global`:

```bash
opencode plugin bros-harness@0.1.6 --force --global
```

The installer makes the package available to OpenCode and writes a config entry like this:

```json
{
  "plugin": ["bros-harness"]
}
```

## Restart

Fully quit and restart OpenCode after installing or changing plugin config. OpenCode loads plugins at startup, so an already-running session can keep using stale config.

## Verify

After restart, verify that BROS agents are visible:

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

If BROS commands are available in the active session, `/bros-status` can also be used after restart.

## Troubleshooting

If `opencode agent list` does not show `mighty-bro` or the `bro-*` agents, do not keep editing JSON. Check these causes first:

- OpenCode was not restarted after the plugin install.
- The plugin was installed in project scope but OpenCode was started from another project.
- The plugin was installed globally only in a different user or config home.
- OpenCode cached a stale package version.
- The config contains a manual plugin entry but OpenCode never installed the package.

Use the pinned installer to repair stale package resolution:

```bash
opencode plugin bros-harness@0.1.6 --force
```

Then restart OpenCode and run verification again.

## Manual Config Fallback

Manual config editing is a fallback, not the recommended installation path. Use it only when the package is already resolvable by OpenCode or when using a local development path.

For package config, merge only the plugin entry:

```json
{
  "plugin": ["bros-harness"]
}
```

For local repository smoke tests, use an absolute file URL:

```json
{
  "plugin": ["file:///absolute/path/to/bros/src/plugin.mjs"]
}
```

After any manual config edit, fully restart OpenCode and verify with `opencode agent list`.

## AI Agent Prompt

Use this prompt when asking an AI coding agent to install BROS Harness:

```text
Install BROS Harness into OpenCode by following docs/installation.md as the source of truth.
First check opencode --version, opencode plugin --help, npm --version, node --version,
and npm view bros-harness dist-tags version --json.
Ask whether to use project scope or global scope.
After approval, use opencode plugin bros-harness for project scope or
opencode plugin bros-harness --global for global scope.
If latest resolution or cache state is suspect, use bros-harness@0.1.6 --force
in the same approved scope.
Do not run npm install, publish packages, mutate npm dist-tags, edit providers,
MCP servers, permissions, telemetry, secrets, or credentials.
If manual config editing is explicitly requested, merge only the plugin entry
and show the diff before writing.
Tell the human to fully restart OpenCode, then verify with opencode agent list
and opencode run --agent mighty-bro "hello".
```

The package helper prints a short reference prompt:

```bash
bros agent-install-prompt
```

## Runtime Behavior

On startup, the plugin uses OpenCode's in-memory `config(cfg)` hook only. It adds package-relative BROS skills, packaged BROS agents, and packaged BROS commands without replacing existing keys.

The runtime plugin does not write user config files, install dependencies, publish packages, register providers, add MCP servers, change permissions, configure telemetry, or read, validate, or write secrets.

## Contributor Checks

For repository development only:

```bash
npm run validate
node bin/bros.mjs doctor
```

Publishing, dependency installation, and asset import remain separate maintainer-gated actions. Package users should rely on OpenCode's plugin installer and the read-only CLI helpers above.
