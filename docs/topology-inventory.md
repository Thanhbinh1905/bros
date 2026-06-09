# BROS Topology Inventory

## Summary

This inventory records the current BROS Harness control-plane topology for maintainers. It is source-derived and should be refreshed when agents, commands, config, permissions, templates, or validation scripts change.

## Source Surfaces

| Area | Source references | Current role |
| --- | --- | --- |
| Plugin runtime | `src/plugin.mjs`; `src/config.mjs` | Registers packaged skills, agents, commands, docs, templates, and applies validated BROS config. |
| Category and config registry | `src/config.mjs`; `examples/bros.config.schema.json`; `examples/category-routing.md` | Defines semantic category descriptions, workflow responsibilities, capabilities, model routing, depth routing profiles, permission profiles, approval packages, removed keys, aliases, and restricted fallback rules. |
| Permission hard-denies | `src/config.mjs:56-119`; agent frontmatter in `assets/opencode/agents/*.md` | Keeps destructive, publish, credential, secret-read, force-push, and production-like operations denied or gated. |
| Orchestration contract | `assets/opencode/skills/bros-orchestrate/SKILL.md` | Central workflow contract for governance tiers, fast path routing, packet/trace schema, approval packages, and conflict resolution. |
| Agents | `assets/opencode/agents/*.md` | Defines `mighty-bro` and role agents: Explore, Design, UI, Build, Test, Shield, Ops, Docs. |
| Commands | `assets/opencode/commands/*.md` | Defines canonical `/bros-plan`, `/bros-build`, `/bros-review`, `/bros-assemble`, and `/bros-status` lanes. |
| Templates | `assets/opencode/templates/bros/*.md` | Provides task, evidence, UI, security, QA, status, PRD, ADR, and delivery artifacts with packet/trace fields. |
| Lifecycle metadata | `assets/skills.lifecycle.json`; `assets/*.manifest.json` | Describes packaged assets and skill lifecycle state validated before package release. |
| Workflow validation | `scripts/validate-workflow-regressions.mjs`; `scripts/fixtures/workflow-regression-scenarios.json` | Checks prompt/config text for gate regressions, governance contracts, trace hygiene, QA role boundaries, and assemble hard stops. |
| Routing validation | `src/routing-policy.mjs`; `scripts/validate-routing-scenarios.mjs`; `scripts/fixtures/routing-scenarios.json` | Deterministically checks named modes, depth, agent selection, hard-deny blockers, persona leakage, conflict, and assemble tail gates. |
| Plugin smoke validation | `scripts/verify-plugin-smoke.mjs` | Checks model routing precedence, restricted fallbacks, permission merge order, approval packages, and hard-deny preservation. |
| Public docs/examples | `README.md`; `docs/configuration.md`; `examples/bros.config.example.json`; `examples/bros.config.schema.json`; `examples/category-routing.md` | Documents supported config keys, category responsibilities, safe usage, migration notes, and validation expectations. |

## Current Topology

Mighty Bro remains the single front door. It classifies each request by named mode and depth, then chooses the lightest safe route:

| Mode | Default route | Escalation triggers |
| --- | --- | --- |
| `INFO_ONLY` | Orchestrator inline; optional Explore for cited evidence. | Security, production, credentials, mutation, or missing current repo facts. |
| `DOC_ONLY` | Docs owner; optional QA for docs validation. | Security/release/config claims or public package behavior. |
| `READ_ONLY_REVIEW` | Test reviewer; Shield when security-sensitive. | Remediation request, secrets, production, destructive validation, or missing evidence. |
| `SMALL_PATCH` | Build owner with minimal QA. | UI, security, architecture, ops, dependency install, git mutation, production, permissions, or ambiguity. |
| `FULL_BROS` | Explore, Design/UI as needed, Build, QA, Shield, Ops, Docs. | Required for hard gates, reviewer conflict, release, production, permissions, credentials, destructive, or complex delivery. |

## Config Behavior

Supported top-level keys are `$schema`, `fallback_models`, `categories`, `routing_profiles`, `agents`, `permission_profiles`, and `approval_packages`.

Removed active keys remain rejected: `fallback_model` and `model_routing`. They may appear only in migration or troubleshooting documentation.

Routing precedence inside the resolver is exact `agents`, explicitly selected `routing_profiles.<depth>`, base `categories`, top-level `fallback_models`, then packaged/default model routing. Default OpenCode plugin startup does not infer per-message workflow depth, so startup model propagation should use exact `agents` or directly bound base agent categories. Restricted categories keep fallback protection.

Category metadata is descriptive and non-authoritative. Permission profiles, approval packages, task packets, and reviewer gates remain separate trusted surfaces and cannot be bypassed by category text.

## Caveats and Unknowns

- OpenCode permission changes are config-time; active sessions may need restart after config or installed asset changes.
- Routing scenario validation is deterministic simulation, not a full OpenCode runtime permission-engine replacement.
- Expanded workflow categories such as `git_ops`, `package_ops`, `quick_patch`, and `deep_review` are classification/validation metadata unless an explicit workflow-aware resolver call selects them; they are not automatic default startup model bindings.
- `ssh_readonly_known_host` exists as a scoped package preset but should remain conservative until stronger host/command simulation is added.
- `vision_engineering` currently routes as a category only; there is no dedicated `bro-vision` agent in this package.
- `.bros/` session records are private working artifacts and remain excluded from package contents.

## Validation Baseline

Use the narrowest relevant command for a change:

```bash
npm run validate
npm run validate:assets
npm run validate:workflows
npm run verify:plugin-smoke
npm run verify:no-secrets
npm run verify:package
node bin/bros.mjs doctor
node bin/bros.mjs status
node bin/bros.mjs config-status
npm pack --dry-run
```

Do not publish, deploy, push, create PRs, install dependencies, read credentials, or mutate production unless a separate explicit approval packet authorizes that exact operation.
