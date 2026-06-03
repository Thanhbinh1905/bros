# Native OpenCode Agent Installation Guide

## Purpose

This guide gives LLMs and automation agents a bounded, end-to-end path for installing BROS Harness into a native OpenCode environment. It is intended for agents that need to detect OpenCode, choose a safe npm package version, guide the plugin configuration, verify the result, and tell the user when a restart is required.

Use this guide only for OpenCode installation support. Do not use it to publish packages, mutate npm dist-tags, edit provider settings, add MCP servers, inspect secrets, or broaden OpenCode permissions.

## Target audience

- LLMs and coding agents helping a user install BROS Harness into OpenCode.
- Maintainers validating installation instructions without changing global user configuration.
- Users who want a safe checklist for native OpenCode setup.

## Safety boundaries

Agents must follow these limits:

- Do not read `.env` files, tokens, credentials, provider keys, or secret stores.
- Do not print secret values if encountered. Report only the path, line number, variable name, or redacted value.
- Do not edit provider, MCP, permission, telemetry, credential, or secret settings.
- Do not publish npm packages.
- Do not change npm dist-tags unless the maintainer explicitly approves that registry mutation.
- Do not mutate global OpenCode config automatically. If a config edit is needed, show the proposed diff and ask the user before writing.
- Do not overwrite an existing OpenCode config. Merge only the BROS Harness plugin entry.

## Detect OpenCode and local tooling

Run only safe read-only detection commands unless the user approves a write.

```bash
opencode --version
npm --version
node --version
npm view bros-harness dist-tags version --json
```

If `opencode --version` fails, stop and ask the user to install or expose OpenCode on `PATH` before proceeding. If `npm --version` fails, ask the user which package manager they want to use and avoid guessing.

Be aware of likely OpenCode config locations, but do not edit them without user approval:

- Repository-local `opencode.json` or `opencode.jsonc`.
- Repository-local `.opencode/` configuration files.
- User-level OpenCode config under the platform's normal config directory, such as `~/.config/opencode/` on Linux.

When inspecting config, avoid files that may contain secrets. If the user asks for edits, propose the smallest plugin-only change.

## Choose the package version

The normal package plugin reference is:

```json
{
  "plugin": ["bros-harness"]
}
```

However, OpenCode or npm may resolve `bros-harness@latest`, and the `latest` dist-tag can be stale. The known-good version from prior validation is `bros-harness@0.1.4`.

Use this version-selection rule:

1. Check npm metadata first:

   ```bash
   npm view bros-harness dist-tags version --json
   ```

2. If `latest` points to the expected current known-good version, use `bros-harness@latest` or the bare plugin package name.
3. If `latest` is stale, ambiguous, or OpenCode appears to cache an older package, prefer the pinned known-good package reference: `bros-harness@0.1.4`.
4. If a newer known-good version is explicitly approved, replace `0.1.4` with `<known-good-version>` and document why it is trusted.

## Recommended install flow

1. Confirm OpenCode is available:

   ```bash
   opencode --version
   ```

2. Confirm npm can resolve the package metadata:

   ```bash
   npm view bros-harness dist-tags version --json
   ```

3. Ask the user which OpenCode config scope they want to update if more than one config path is possible.

4. Propose one of these plugin entries.

   Use the normal latest-resolving entry only when npm metadata is healthy:

   ```json
   {
     "plugin": ["bros-harness"]
   }
   ```

   Use a pinned package when `latest` is stale or cache behavior is suspect:

   ```json
   {
     "plugin": ["bros-harness@0.1.4"]
   }
   ```

   For future maintained releases, the pinned form may become:

   ```json
   {
     "plugin": ["bros-harness@<known-good-version>"]
   }
   ```

5. Show the proposed config diff. The only intended change is adding or merging the BROS Harness plugin entry.

6. Ask the user before writing the config.

7. After the approved edit, tell the user to restart OpenCode. The plugin is loaded at OpenCode startup, so the running session may not see the new package until restart.

## Commands agents may run

Read-only detection and verification commands are safe when the user permits local command execution:

```bash
opencode --version
npm --version
node --version
npm view bros-harness dist-tags version --json
opencode agent list
opencode run --agent mighty-bro "hello"
```

If BROS commands are available after restart, this may also be used:

```text
/bros-status
```

Do not run install, publish, or registry mutation commands unless the user explicitly approves the exact action.

## Verification

After the config edit and OpenCode restart, verify that BROS agents are visible:

```bash
opencode agent list
```

Then run a minimal smoke test:

```bash
opencode run --agent mighty-bro "hello"
```

If the OpenCode command interface supports slash commands in the active session, check BROS status:

```text
/bros-status
```

Expected result: packaged BROS agents and commands are available after restart. If the agent list does not include BROS agents, troubleshoot package version resolution and restart state first.

## Troubleshooting stale `latest` resolution

Check package metadata:

```bash
npm view bros-harness dist-tags version --json
```

If `latest` is stale or OpenCode appears to cache an older package:

1. Switch the plugin entry from the bare package name to a pinned package reference:

   ```json
   {
     "plugin": ["bros-harness@0.1.4"]
   }
   ```

2. Restart OpenCode.
3. Re-run verification:

   ```bash
   opencode agent list
   opencode run --agent mighty-bro "hello"
   ```

Maintainers may repair a stale npm `latest` dist-tag only with explicit release approval:

```bash
npm dist-tag add bros-harness@<version> latest
```

That command mutates the public npm registry. Agents must not run it unless the maintainer explicitly authorizes the exact package version and registry action.

## Restart requirement

OpenCode loads package plugins during startup. After adding or changing the BROS Harness plugin entry, restart OpenCode before verification. If verification fails immediately after editing config, restart first before changing anything else.

## Minimal prompt for an agent

```text
Install BROS Harness into native OpenCode using docs/native-opencode-agent-installation.md. Detect OpenCode with opencode --version, check npm metadata with npm view bros-harness dist-tags version --json, use bros-harness@latest only when the latest dist-tag is healthy, otherwise use pinned bros-harness@0.1.4 or an explicitly approved <known-good-version>. Merge only the plugin entry, do not edit providers/MCP/permissions/telemetry/secrets, do not publish or mutate npm dist-tags, show the diff before writing, verify with opencode agent list and opencode run --agent mighty-bro "hello", and tell the user to restart OpenCode.
```
