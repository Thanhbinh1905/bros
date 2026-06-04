# BROS Harness

**Move slower than chaos. Ship faster than rework.**

BROS Harness is a package-first OpenCode plugin for engineering teams that want AI-assisted delivery without losing discipline. It packages a reviewed set of BROS agents, commands, skills, templates, and documentation, then exposes them through a narrow OpenCode plugin and a read-only helper CLI.

BROS is not an AI swarm that floods a codebase with unsupervised workers. It is a gated delivery harness: clarify the work, challenge weak assumptions, implement only approved scope, verify the result, and hand off remaining risk clearly.

The tone has bro spirit. The operating model is professional engineering.

## 30-second intro

**BE THE BRO** means bringing useful pressure to AI-assisted delivery: ask what is approved, pick the lightest safe lane, build only inside the packet, verify the result, and report the remaining risk. BROS keeps the fun names visible, but the gates stay in charge. No auto-merge, no auto-publish, no hidden production moves—just clearer plans, tighter builds, stronger reviews, and handoffs a team can trust.

## Why BROS?

AI coding can feel fast while quietly creating rework: vague plans, hidden scope expansion, optimistic reviews, skipped security checks, and changes nobody can explain later.

BROS exists to make AI-assisted work slower at the points where rushing is expensive:

- **Before implementation:** define the packet, scope, gates, evidence, and acceptance criteria.
- **During implementation:** make the smallest correct change and preserve existing conventions.
- **Before handoff:** run the approved checks, report what changed, and surface risks instead of burying them.

That discipline is what makes teams faster over the full delivery cycle.

## How BROS differs from AI swarms

| AI swarm pattern | BROS Harness pattern |
| --- | --- |
| Many agents run at once by default. | Roles are explicit and gated by task packets. |
| Speed is treated as the main measure. | Quality, security, and reviewability come first. |
| Agents may expand scope to “finish” the goal. | Builders implement only approved scope. |
| Failures are patched over until output looks plausible. | Blockers, uncertainty, and residual risk are reported. |
| Tooling may mutate broad config surfaces. | The package plugin uses a narrow in-memory OpenCode hook only. |

BROS is for teams that would rather challenge a bad request early than clean up a confident mess later.

## Meet the Bros

The “Bro” names are display aliases, not authority overrides. Technical IDs, OpenCode config, permissions, user instructions, security gates, and QA gates remain the source of truth.

- **Mighty Bro** — orchestrates gates, packets, and final review flow.
- **Bro Build** — implements approved task packets with the smallest correct change.
- **Bro Test** — verifies behavior and pushes back on weak test evidence.
- **Bro Shield** — reviews security-sensitive changes and blocks unsafe shortcuts.
- **Bro Explore** — gathers evidence before the team relies on assumptions.
- **Bro Docs** — turns verified implementation context into maintainable documentation.
- **Bro UI / Bro Design** — provide design direction when UI work requires it.

The spirit is collaborative. The rules are strict.

Chat sessions may use distinctive Bro tone and short signatures like **BE THE BRO**, but persona is style-only. It must not obscure findings, severity, gates, technical IDs, permissions, security/QA outcomes, or cited facts. Persisted project docs, reports, packets, templates, and session records should remain formal and professional unless they are explicitly documenting BROS control-plane behavior.

## Workflow

```text
Intake
  ↓
Clarify objective, risk, and scope
  ↓
Plan approved task packet
  ↓
Explore evidence when required
  ↓
Implement only approved scope
  ↓
Validate with approved checks
  ↓
Security / QA / review gates
  ↓
Handoff with changes, verification, and remaining risks
```

The point is not ceremony for ceremony’s sake. The point is to keep useful pressure on the work: What is approved? What evidence supports it? What changed? What still needs review?

## Workflow modes

Use the lightest lane that preserves the required gates:

| Mode | Dùng khi nào / when to use | Cách dùng / how to use | Gate reminder |
| --- | --- | --- | --- |
| **Normal prompt** | Quick questions, small clarifications, status checks, or narrow handoffs. | Ask `mighty-bro` directly. It will answer inline, route to a quick Explorer/specialist path, or recommend a heavier lane. | If scope is unclear or touches secrets, security, production, publish, destructive work, or broad mutation, quick mode stops. |
| **`/bros-plan`** | You need a real plan before anyone builds. | Run `/bros-plan` with the objective, constraints, evidence, and acceptance criteria. It covers Phases 0-4 only and produces task packets. | Planning does not auto-build. Continue with `/bros-build` only after the plan and packets are approved. |
| **`/bros-build`** | You have an approved task packet and want local implementation. | Run `/bros-build` with the approved packet reference and any required waivers/evidence. Builders implement the smallest correct scoped change, then route verification and handoff. | Missing packet, missing acceptance criteria, failed checks, or hard-gate gaps block the build. |
| **`/bros-review`** | You want an independent audit of a plan, PR, delivery claim, or local result. | Run `/bros-review` with the artifacts to inspect. It challenges gate, quality, security, packet, and role-boundary issues. | Review does not patch by default. Remediation needs separate approval. |
| **`/bros-assemble`** | You want one-prompt convenience for safe-scope work without skipping discipline. | Run `/bros-assemble` with a bounded objective. It coordinates classify → plan → build → QA/security/ops → docs/final report when each gate is satisfied. | Not a shortcut: no auto-publish, no auto-merge, no deploy, no dependency install, no credential handling, no destructive action, and no git mutation without approval. |

`/bros-assemble` is intended for “one prompt, one enter” convenience inside approved safe scope. It can continue through safe local planning, implementation, verification, review routing, and final reporting, but it is not a shortcut around security, QA, architecture, production, publish, dependency-install, credential, git mutation, or destructive-operation approvals. Blocked tail work is reported as manual next actions rather than silently performed.

## Principles

1. **No rubber stamps.** Risky or unclear requests should be challenged respectfully.
2. **Scope is a safety boundary.** A builder does not become the product owner, architect, QA approver, or security approver.
3. **Evidence beats vibes.** Required evidence packets, UI packets, and gate outcomes must exist before dependent work proceeds.
4. **Small changes win.** Prefer the narrowest implementation that satisfies the approved packet.
5. **Security is not a final garnish.** Secrets, permissions, providers, MCP servers, telemetry, and production mutations require explicit review paths.
6. **Readable handoff matters.** Future maintainers should know what changed, why, how it was verified, and what remains risky.

## Installation

BROS Harness is OpenCode-first. Use the full installation guide for complete safety, restart, verification, troubleshooting, and repair details:

[`docs/installation.md`](docs/installation.md)

### For LLM Agents

Fetch the full guide and follow it step by step:

```bash
curl -fsSL https://raw.githubusercontent.com/Thanhbinh1905/bros/main/docs/installation.md
```

Do not edit providers, MCP servers, permissions, telemetry, secrets, npm publishing, or npm dist-tags while installing BROS Harness. Use OpenCode's plugin installer from the guide, restart OpenCode, and verify the BROS agents after installation.

### For Manual

Paste this prompt into Claude Code, AmpCode, Cursor, or another coding agent:

```text
Install BROS Harness into OpenCode by fetching and following the full guide step by step:
https://raw.githubusercontent.com/Thanhbinh1905/bros/main/docs/installation.md

Use OpenCode's plugin installer from the guide. Do not only paste JSON into opencode.jsonc unless the guide's fallback applies.
Do not edit providers, MCP servers, permissions, telemetry, secrets, npm publishing, or npm dist-tags.
Restart OpenCode and verify BROS agents after installation.
```

### Quick reference

Project install:

```bash
opencode plugin bros-harness@latest
```

Project upgrade or repair:

```bash
opencode plugin bros-harness@latest --force
```

Published npm installs use the package version available from the registry. If BROS Harness is already installed and OpenCode does not pick up a newly published version, reinstall `@latest` with `--force` in the same scope. If `@latest` still loads an old package, clear only `~/.cache/opencode/packages/bros-harness@latest`, rerun the repair command, and restart OpenCode.

Restart OpenCode, then verify:

```bash
opencode agent list
opencode run --agent mighty-bro "hello"
```

Optional read-only CLI checks:

```bash
bros snippet
bros doctor
bros status
bros config-status
bros list-assets
```

These helpers are read-only. Most inspect package-local metadata and assets only. `bros config-status` additionally validates only BROS-specific config at `~/.config/bros-harness/bros.config.json` and `./bros.config.json`; it does not read `.opencode/`, environment variables, providers, MCP servers, telemetry settings, or credential values.

For AI-assisted setup from a local checkout, use a narrow prompt:

```text
Install BROS Harness into OpenCode by following docs/installation.md as the source of truth.
Do not only paste JSON into opencode.jsonc; use OpenCode's plugin installer unless the guide's fallback applies.
Use opencode plugin bros-harness@latest for first install. For existing installs, use opencode plugin bros-harness@latest --force and restart OpenCode. If latest remains stale, clear only ~/.cache/opencode/packages/bros-harness@latest and rerun the installer.
Do not edit providers, MCP, permissions, telemetry, secrets, npm publishing, or npm dist-tags.
Restart OpenCode and verify BROS agents after installation.
```

The CLI can print similar guidance:

```bash
bros agent-install-prompt
```

## Safety by design

The package plugin is intentionally narrow.

On load, it verifies packaged asset directories and uses OpenCode’s in-memory `config(cfg)` hook to add only:

- the package-relative BROS skills directory to `skills.paths`, when the existing field has the expected safe shape; and
- packaged BROS agent entries to `agent`, without overwriting existing agent keys; and
- packaged command prompt entries to `command`, without overwriting existing command keys.

Optional BROS-specific model routing and permission profiles can be supplied in `bros.config.json` files. Config precedence is packaged defaults, global BROS config, repo BROS config, then OpenCode plugin input. `fallback_model` is never silently applied to restricted code, security, QA/review, or ops/release categories. Permission profiles are opt-in, repo-scoped, expiry-bound, reason-logged, and keep hard denies for secret reads, publish, destructive actions, force push, and production/cloud mutation.

`bro-build` defaults to flexible local Bash for routine development and inspection, closer to OpenCode build mode. Git mutation, dependency installs, Docker mutation, deploy/publish, secret-reading, destructive, force-push, and production/cloud command classes remain ask-gated or denied.

It does **not**:

- write `opencode.json`, `.opencode/`, global OpenCode config files, or other live config files;
- install dependencies;
- publish packages;
- register providers;
- add MCP servers;
- change top-level permissions;
- configure telemetry;
- read, validate, or write secrets.

Packaged agent files are registered from reviewed assets so a package-only OpenCode install can expose BROS agents without copying local files.

Three skipped raw skills remain excluded pending separate sanitized review. They are not imported by this package.

## What is included

- `assets/opencode/` — packaged agents, commands, skills, templates, and docs.
- `assets/manifest.json` — package asset manifest. `sourceRef` is the canonical sanitized source field; the deprecated `source` alias is rejected by validation.
- `assets/skills.lifecycle.json` — skill lifecycle metadata for active, deprecated, skipped, redacted, and blocked states; `npm run validate` checks it against the manifest and skipped import report.
- `src/plugin.mjs` — the OpenCode plugin entrypoint exposed by `main` and `exports`.
- `bin/bros.mjs` — a read-only helper CLI for snippets, package checks, asset summaries, and safe setup prompts.
- `examples/bros.config.example.json` and `examples/bros.config.schema.json` — optional BROS config template and schema for model routing and scoped permission profiles.
- `scripts/validate-assets.mjs` and `scripts/verify-no-secrets.mjs` — dependency-free validation scripts retained in the package surface.

Maintainer-only asset import tooling remains repository-local, environment-gated, and excluded from the published package surface. It is not a user installation command.

## Local validation

For repository maintainers working from source:

```bash
npm run validate
node bin/bros.mjs doctor
node bin/bros.mjs status
node bin/bros.mjs config-status
node bin/bros.mjs snippet
npm pack --dry-run
```

Do not publish from this repository unless a separate release approval explicitly authorizes publishing. Dry runs are useful; real registry mutation is a different gate.

## Contribution

Contributions are welcome.

Contributions should strengthen the harness without weakening the safety model.

Before proposing changes, check:

- Does this preserve OpenCode-first installation accuracy?
- Does it avoid unsupported claims about automatic registration, providers, MCPs, permissions, telemetry, and secrets?
- Does it keep skipped or unreviewed assets out of the package?
- Does it include validation or explain why validation is not applicable?
- Does it improve maintainability without turning BROS into a broad, uncontrolled swarm?

Useful references:

- [`docs/installation.md`](docs/installation.md)
- [`docs/integrations/opencode.md`](docs/integrations/opencode.md)
- [`docs/security.md`](docs/security.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)

## The memorable part

BROS is a reminder that the best AI engineering workflows are not the loudest or fastest-looking ones. They are the ones that keep promises small, evidence visible, and risk owned.

Challenge the plan. Respect the gates. Build the thing. Verify the thing.

**Move slower than chaos. Ship faster than rework.**
