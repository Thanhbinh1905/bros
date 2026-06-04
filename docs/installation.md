# Installation Guide

This is the source of truth for installing BROS Harness into OpenCode.

BROS Harness is a package-first OpenCode plugin. The primary installation path is OpenCode's own plugin installer. Do not rely on only pasting `{"plugin":["bros-harness"]}` into `opencode.jsonc`: that config entry does not guarantee OpenCode has installed or cached the npm package it must load.

## For LLM Agents

Fetch this guide from the raw GitHub URL and follow it step by step:

```bash
curl -fsSL https://raw.githubusercontent.com/Thanhbinh1905/bros/main/docs/installation.md
```

Do not edit providers, MCP servers, permissions, telemetry, secrets, npm publishing, or npm dist-tags while installing BROS Harness. Use OpenCode's plugin installer below, restart OpenCode, and verify the BROS agents after installation.

## For Manual

Paste this prompt into Claude Code, AmpCode, Cursor, or another coding agent:

```text
Install BROS Harness into OpenCode by fetching and following the full guide step by step:
https://raw.githubusercontent.com/Thanhbinh1905/bros/main/docs/installation.md

Use OpenCode's plugin installer from the guide. Do not only paste JSON into opencode.jsonc unless the guide's fallback applies.
Do not edit providers, MCP servers, permissions, telemetry, secrets, npm publishing, or npm dist-tags.
Restart OpenCode and verify BROS agents after installation.
```

## 30-second orientation

**BE THE BRO** is the memory hook: use AI help with discipline. BROS gives OpenCode a gated delivery crew for planning, building, reviewing, and documenting work, but the display tone never overrides technical rules. Start with the lightest safe mode, require approved packets for implementation, verify before handoff, and treat publish, merge, deploy, credential, dependency-install, destructive, and production actions as separate gates.

After installation, the common modes are:

| Mode | Dùng khi nào / when to use | Cách dùng / how to use |
| --- | --- | --- |
| **Normal prompt** | Quick questions, status, small clarifications, or narrow handoffs. | Ask `mighty-bro` directly; it will answer, route, or recommend `/bros-plan` or `/bros-assemble`. |
| **`/bros-plan`** | You need an approved plan and task packets before implementation. | Provide the objective, constraints, evidence, and acceptance criteria; it stops before build. |
| **`/bros-build`** | You have an approved packet for local implementation. | Provide the packet reference and required evidence; it builds only inside approved scope. |
| **`/bros-review`** | You need an independent audit of a plan, change, or delivery claim. | Provide artifacts to inspect; it reports issues and does not remediate unless separately approved. |
| **`/bros-assemble`** | You want one-prompt convenience for bounded safe-scope work. | Provide a bounded objective; it preserves gates and stops rather than auto-publishing, merging, deploying, installing dependencies, handling credentials, or doing destructive work. |

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

The current fix version documented here is `bros-harness@0.2.1`. Before installing, confirm npm `latest` has advanced to `0.2.1`; if it still reports `0.1.7`, the registry is still serving the known-broken OpenCode startup build.

## Install

For the current project config, run:

```bash
opencode plugin bros-harness@latest
```

If BROS Harness is already installed and OpenCode is not picking up the new npm release, replace the existing plugin version explicitly:

```bash
opencode plugin bros-harness@latest --force
```

For global OpenCode config, run this only when you want BROS Harness in every OpenCode workspace:

```bash
opencode plugin bros-harness@latest --global
```

For an existing global install, replace the global plugin version explicitly:

```bash
opencode plugin bros-harness@latest --force --global
```

If OpenCode has a stale cached package, or if npm metadata shows a stale `latest` dist-tag, pin the validated package and replace the existing plugin entry:

```bash
opencode plugin bros-harness@0.2.1 --force
```

For global scope with the pinned package, add `--global`:

```bash
opencode plugin bros-harness@0.2.1 --force --global
```

The installer makes the package available to OpenCode and writes a config entry like this:

```json
{
  "plugin": ["bros-harness@latest"]
}
```

This guide uses `bros-harness@latest` so rerunning OpenCode's installer can pick up the current npm release. If `@latest` still loads an old package after `--force`, clear only OpenCode's stale BROS cache at `~/.cache/opencode/packages/bros-harness@latest`, rerun the installer, and restart OpenCode.

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

Useful command lanes after verification:

| Command or mode | Use |
| --- | --- |
| Normal prompt to `mighty-bro` | Quick classification: inline answer, quick Explorer, direct specialist, suggest `/bros-plan`, or suggest `/bros-assemble`. |
| `/bros-plan` | Planning-only Phases 0-4; no auto-build. |
| `/bros-build` | Approved implementation from complete task packets. |
| `/bros-review` | Audit plan or delivery artifacts without automatic remediation. |
| `/bros-assemble` | One-prompt safe-scope classify → plan → build → QA/security/ops → docs/final report; stops on security, destructive, production, publish, secret, dependency-install, git mutation, QA, architecture, or missing-packet gates. |

The package CLI also provides read-only diagnostics for local package inspection:

```bash
bros doctor
bros status
```

These commands inspect package-local metadata and packaged assets only. They do not read user config files, `.opencode/`, environment variables, providers, MCP servers, telemetry settings, or credential values.

## Troubleshooting

If `opencode agent list` does not show `mighty-bro` or the `bro-*` agents, do not keep editing JSON. Check these causes first:

- OpenCode was not restarted after the plugin install.
- An older BROS plugin version was already installed and the installer was run without `--force`.
- `bros-harness@0.1.7` is installed; that version rejects OpenCode runtime context during startup and does not register BROS agents.
- The active config contains bare `bros-harness`; use `bros-harness@latest` so OpenCode uses its package installer/cache path.
- The plugin was installed in project scope but OpenCode was started from another project.
- The plugin was installed globally only in a different user or config home.
- OpenCode cached a stale package version.
- The config contains a manual plugin entry but OpenCode never installed the package.

Use the installer to repair stale package resolution:

```bash
opencode plugin bros-harness@latest --force
```

If OpenCode still reports `Plugin export is not a function` for `bros-harness@latest`, inspect the cached package version. If `~/.cache/opencode/packages/bros-harness@latest/node_modules/bros-harness/package.json` is older than npm `latest`, remove only `~/.cache/opencode/packages/bros-harness@latest`, rerun the installer command above, and restart OpenCode.

Then restart OpenCode and run verification again.

## Rollback

Rollback should be explicit and scoped. Do not use broad reset, deletion, or automatic config-rewrite commands.

1. Identify where the plugin was installed: project scope or global scope.
2. Open the relevant OpenCode config file in an editor.
3. Remove only the `bros-harness` entry from the `plugin` array, preserving unrelated plugins and config keys.
4. Save the file and fully restart OpenCode.
5. Verify that the BROS agents are no longer listed with `opencode agent list`.

If the plugin was pinned to a bad version, prefer rolling forward to a known-good pinned version with OpenCode's plugin installer rather than deleting unrelated config. Example:

```bash
opencode plugin bros-harness@0.2.1 --force
```

For global rollback, apply the same scoped edit or pinned repair to global scope only after confirming the user intended a global change. Do not edit providers, MCP servers, permissions, telemetry, secrets, or credentials as part of rollback.

## Manual Config Fallback

Manual config editing is a fallback, not the recommended installation path. Use it only when the package is already resolvable by OpenCode or when using a local development path.

For package config, merge only the plugin entry:

```json
{
  "plugin": ["bros-harness@latest"]
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
After approval, use opencode plugin bros-harness@latest for project scope or
opencode plugin bros-harness@latest --global for global scope.
If updating an existing install, use bros-harness@latest --force in the same approved scope.
If latest resolution or cache state is suspect after 0.2.1 is published, pin bros-harness@0.2.1 --force.
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

The runtime plugin does not write user config files, install dependencies, publish packages, register providers, add MCP servers, change top-level OpenCode permissions, configure telemetry, or read, validate, or write secrets. Optional BROS permission profiles only tune packaged BROS agent permissions in memory after fail-closed validation.

`bro-build` is intentionally more flexible than planning and review agents: routine local Bash and inspection commands are allowed by default so implementation work does not repeatedly prompt for harmless commands. Git mutation, dependency installs, Docker mutation, deploy/publish, secret-reading, destructive, force-push, and production/cloud command classes remain ask-gated or denied.

## BROS Harness Config

BROS Harness supports optional package-specific JSON config for model routing and scoped permission profiles. Precedence is:

1. packaged defaults;
2. global BROS config at `~/.config/bros-harness/bros.config.json`;
3. repo BROS config at `./bros.config.json` from the OpenCode working directory;
4. OpenCode plugin input, when supplied by OpenCode.

Only BROS-specific keys are accepted: `fallback_model`, `model_routing`, and `permission_profiles`. Unknown keys fail closed with an actionable error. The plugin never mutates OpenCode provider, credential, MCP, telemetry, or top-level permission settings.

Supported `model_routing` categories are `planner`, `explorer_search`, `coder_build`, `security`, `qa_review`, `docs`, `design`, and `ops`. `fallback_model` applies only to non-restricted categories. It is not silently applied to `coder_build`, `security`, `qa_review`, or `ops`/release-sensitive work; set those routes explicitly if they must change.

Supported `permission_profiles` are `readonly`, `review_safe`, `build_limited`, and `trusted_ops`. Profiles are opt-in and must include `enabled`, `scope: "repo"`, a future `expires_at`, and a non-secret reason. `trusted_ops` requires `hard_review: true`. Profiles do not introduce top-level OpenCode permissions; publish, destructive, force-push, secret-read, provider-credential, and production/cloud command classes remain denied.

Start from the template and schema in `examples/bros.config.example.json` and `examples/bros.config.schema.json`. Validate local routing visibility with:

```bash
bros config-status
```

## Contributor Checks

For repository development only:

```bash
npm run validate
node bin/bros.mjs doctor
node bin/bros.mjs status
node bin/bros.mjs config-status
npm pack --dry-run
```

Publishing, dependency installation, and asset import remain separate maintainer-gated actions. Package users should rely on OpenCode's plugin installer and the read-only CLI helpers above.

## Release State Caveat

This source checkout may contain unreleased remediation work beyond the currently published npm package. Local validation and package dry-runs can prove the checkout is internally consistent, but they do not publish a new package or mutate npm dist-tags. Committing, pushing, or publishing any remediation requires a future explicit Git Approval Packet and release approval.
