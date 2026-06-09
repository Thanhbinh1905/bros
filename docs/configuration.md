# BROS Harness Configuration

## Purpose and Locations

`bros.config.json` is an optional package-specific configuration file for BROS Harness. It supports category routing, validated depth-aware routing profiles for explicit-depth resolver callers, exact agent routing, ordered fallback models, scoped permission profiles, and expiry-bound approval packages for packaged BROS agents.

Supported locations are loaded in this order:

- Repository configuration: `./bros.config.json`, resolved from the OpenCode working directory.
- Global configuration: `~/.config/opencode/bros.config.json`.

The configuration is read by the BROS Harness plugin at runtime. It does not install packages, write OpenCode configuration, or create provider credentials.

## Quick-Start Example

For repository-local authoring, use the published raw schema URL as the recommended agent-friendly default:

```json
{
  "$schema": "https://raw.githubusercontent.com/Thanhbinh1905/bros/main/examples/bros.config.schema.json",
  "fallback_models": [
    { "model": "openai/gpt-5.4", "variant": "medium" },
    "openai/gpt-5.4-mini-fast"
  ],
  "categories": {
    "planner": { "model": "openai/gpt-5.5", "variant": "medium" },
    "explorer_search": "openai/gpt-5.4-mini-fast",
    "architecture": { "model": "openai/gpt-5.5", "variant": "high" },
    "ui": { "model": "openai/gpt-5.4", "variant": "high" },
    "docs": "openai/gpt-5.4-mini-fast",
    "coder_build": "openai/gpt-5.5",
    "qa_review": "openai/gpt-5.5",
    "security": "openai/gpt-5.5",
    "ops": "openai/gpt-5.5"
  },
  "routing_profiles": {
    "quick": {
      "planner": "openai/gpt-5.4-mini-fast",
      "docs": "openai/gpt-5.4-mini-fast"
    },
    "deep": {
      "architecture": { "model": "openai/gpt-5.5", "variant": "high" },
      "security": "openai/gpt-5.5"
    }
  },
  "agents": {
    "mighty-bro": { "model": "openai/gpt-5.5", "variant": "medium" },
    "bro-explore": { "model": "openai/gpt-5.4-mini-fast" },
    "bro-design": { "model": "openai/gpt-5.5", "variant": "high" },
    "bro-ui": { "model": "openai/gpt-5.4", "variant": "high" }
  },
  "permission_profiles": {
    "enabled": ["review_safe", "build_limited"],
    "scope": "repo",
    "expires_at": "2099-01-01T00:00:00.000Z",
    "reason": "approved local repo validation only",
    "hard_review": false
  },
  "approval_packages": [
    {
      "package_id": "git_read",
      "trace_id": "BROS-EXAMPLE-001",
      "scope": "repo",
      "expires": "session",
      "agents": ["bro-build", "bro-test"],
      "files": ["src/**", "assets/opencode/**", "docs/**"],
      "reason": "approved read-only git inspection"
    }
  ]
}
```

Agents and editors can fetch the published schema from `https://raw.githubusercontent.com/Thanhbinh1905/bros/main/examples/bros.config.schema.json`.

## Top-Level Keys

| Key | Type | Purpose |
| --- | --- | --- |
| `fallback_models` | array | Ordered global fallback list. The first entry is applied to non-restricted categories when no more specific route exists. Entries may be model id strings or objects with `model` and optional `variant`. |
| `categories` | object | Category-level routing map for canonical categories and accepted non-ambiguous aliases. |
| `routing_profiles` | object | Optional depth-specific category overrides for `quick`, `standard`, `deep`, and `critical` resolver calls. OpenCode plugin startup does not infer per-message workflow depth by itself. |
| `agents` | object | Exact agent-specific routing map with the highest routing precedence. |
| `permission_profiles` | object | Optional repo-scoped permission profiles for packaged BROS agents. |
| `approval_packages` | array | Optional expiry-bound package approval presets for named local command classes. |

The optional `$schema` key is also accepted and must be a string when present. Unknown top-level keys fail validation. `fallback_model`, `model_routing`, singular `category`, and singular `agent` are not supported top-level keys.

## Model Entry Formats

A model entry can be a string model identifier:

```json
"openai/gpt-5.5"
```

A model entry can also be a rich object:

```json
{
  "model": "openai/gpt-5.5",
  "variant": "high",
  "fallback_models": ["openai/gpt-5.4"]
}
```

Rich object fields are:

- `model`: required non-empty model identifier.
- `variant`: optional non-empty variant identifier.
- `fallback_models`: optional non-empty array of fallback model identifiers, allowed only where runtime restrictions permit it.

Top-level `fallback_models` entries are either strings or objects with `model` and optional `variant`; nested `fallback_models` inside those list entries are not supported.

## Categories and Aliases

Categories are the semantic routing registry for BROS workflow lanes. They describe what kind of work is being routed, which capabilities are relevant, and which workflow owner agents are typical defaults. Category descriptions are operator guidance only: they do not grant OpenCode permissions, approve gates, bypass Security/QA/Ops review, or override task-packet authority.

Canonical categories are:

| Category | Workflow responsibility | Core capabilities | Default owner agents | Restricted fallback |
| --- | --- | --- | --- | --- |
| `planner` | Intake, routing records, packet completeness, phase gates, and stop-condition handoff. | intake, classification, packet governance | `mighty-bro` | no |
| `explorer_search` | Evidence packets with freshness, provenance, citations, limitations, and redaction posture. | repo evidence, documentation lookup, source citation | `bro-explore` | no |
| `coder_build` | Approved implementation, local validation, and sanitized change traces without QA/security approval authority. | implementation, refactor, local validation | `bro-build` | yes |
| `security` | Security-sensitive review of permission boundaries, secret hygiene, and authorization-risk surfaces. | security review, secret hygiene, permission-boundary review | `bro-shield` | yes |
| `qa_review` | Tests, acceptance criteria, regressions, and implementation-completeness review. | test review, acceptance validation, regression checking | `bro-test` | yes |
| `docs` | Public, operator, migration, and handoff documentation. | public docs, operator docs, migration notes | `bro-docs` | no |
| `architecture` | Architecture boundaries, invariants, data/control flow, and cross-cutting tradeoffs. | architecture review, invariant design, boundary definition | `bro-design` | no |
| `ui` | UI implementation context, frontend behavior, accessibility, and visual state. | UI implementation, frontend behavior, accessibility | `bro-ui` | no |
| `ops` | Operational readiness, release/deploy gating, package/runtime safety, and production-adjacent handoff. | ops readiness, release gating, runtime safety | `bro-ops` | yes |
| `vision_engineering` | Image, video, visual inspection, and media-generation engineering work. | vision, media, visual inspection | `bro-explore`, `bro-build` | no |
| `agent_harness` | Agent, tool, prompt, command, skill, plugin, and harness-control-plane changes. | agent design, tool contracts, plugin config | `bro-explore`, `bro-design`, `bro-build`, `bro-test` | no |
| `git_ops` | Branch, staging, commit, push, PR, and repository-history operations. | git inspection, branch work, commit/PR gates | `bro-ops`, `bro-build` | yes |
| `package_ops` | Package validation, dependency, dry-run, and publish-adjacent workflows. | package validation, dependency review, publish gating | `bro-ops`, `bro-shield`, `bro-test` | yes |
| `local_runtime` | Local server, smoke, CLI, and developer-machine runtime checks. | local smoke, CLI validation, runtime diagnostics | `bro-build`, `bro-test` | no |
| `release_ops` | Release, changelog, version, artifact, and deployment-readiness work. | release review, artifact checks, publish gating | `bro-ops`, `bro-shield`, `bro-test` | yes |
| `deep_review` | High-risk, conflict, production, or critical-depth adversarial review. | adversarial review, critical depth, conflict resolution | `mighty-bro`, `bro-test`, `bro-shield` | yes |
| `quick_patch` | Narrow local changes that fit bounded implementation and verification. | small patch, bounded validation, escalation triggering | `bro-build`, `bro-test` | no |

Accepted aliases are:

- `explorer`, `explorer/search`, `search` → `explorer_search`
- `coder`, `build`, `coder/build` → `coder_build`
- `qa`, `review`, `qa/review`, `reviewer` → `qa_review`
- `release` → `ops`

`design` and `designer` are not canonical category names and are rejected to avoid ambiguity. Use `architecture` for `bro-design` and `ui` for `bro-ui`.

Do not define the same normalized category more than once in the same map. For example, defining both `qa` and `qa_review` in one object is treated as a duplicate alias conflict.

## Agents

Supported agent-specific routing keys are:

- `mighty-bro`
- `bro-explore`
- `bro-build`
- `bro-design`
- `bro-ui`
- `bro-test`
- `bro-shield`
- `bro-ops`
- `bro-docs`

Agent routes are not alias-normalized. The key must match one of the supported agent names exactly. Exact agent overrides win over category and fallback routes.

## Precedence

Configuration source precedence is:

1. Packaged defaults.
2. Global config at `~/.config/opencode/bros.config.json`.
3. Repository config at `./bros.config.json`.
4. OpenCode plugin input.

Model routing precedence after sources are merged is:

1. `agents`
2. selected `routing_profiles.<depth>` category override, only when a caller supplies an explicit depth to the routing resolver
3. `categories`
4. `fallback_models`
5. Packaged/default model routing

More specific routes override less specific routes. Agent routes override selected depth profiles and category routes for the same packaged agent. Expanded workflow categories such as `git_ops`, `package_ops`, `quick_patch`, and `deep_review` are classification and validation metadata unless an explicit workflow-aware resolver call selects them; they are not automatic default startup model bindings.

## Runtime Model Propagation

When BROS Harness is loaded by OpenCode, explicit model routes from `agents` or directly bound `categories` can update the `model` field for preexisting known BROS agents. This lets a user keep installed or already-registered BROS agent definitions while changing their startup model through BROS configuration. `routing_profiles` are validated and used by explicit-depth resolver calls, but default OpenCode plugin startup does not infer per-message workflow depth and therefore does not apply a depth profile unless the caller supplies one.

Runtime model propagation is limited to the `model` field. BROS Harness does not use model routing to replace an existing agent's prompt, permission, mode, tool configuration, or other non-model fields.

Top-level `fallback_models` keeps restricted fallback behavior: it is not silently applied to restricted categories. To change a directly bound restricted category at default startup, set an explicit route through `categories` or `agents` without nested `fallback_models`; use `routing_profiles` only for explicit-depth resolver calls.

## Routing Profiles

Supported depth profiles are:

- `quick`
- `standard`
- `deep`
- `critical`

Each depth profile is a category map using the same category allowlist as `categories`. Unknown depth names or unknown categories fail validation. A depth profile applies only when an explicit-depth routing resolver call selects that depth; exact `agents` routes remain the highest precedence. For default OpenCode plugin startup model propagation, use `agents` or directly bound base categories instead of relying on an implicit workflow depth.

Restart OpenCode after changing BROS configuration or plugin installation state. Do not assume a new model route is active until OpenCode has restarted and routing status has been checked.

## Restricted Fallback Rules

The restricted categories are:

- `coder_build`
- `security`
- `qa_review`
- `ops`
- `git_ops`
- `package_ops`
- `release_ops`
- `deep_review`

Restricted categories reject `fallback_models` in model entry objects. This applies whether the category is addressed through a canonical category name, an alias, or an agent whose category is restricted.

Top-level `fallback_models` is not applied to restricted categories. To change a directly bound restricted category at default startup, set an explicit route through `categories` or `agents` without nested `fallback_models`; selected `routing_profiles.<depth>` entries apply only in explicit-depth resolver calls.

## Permission Profiles

Supported profile names are:

- `readonly`
- `review_safe`
- `build_limited`
- `trusted_ops`

`permission_profiles` must include these fields:

| Field | Requirement |
| --- | --- |
| `enabled` | Array of supported profile names with no duplicates. |
| `scope` | Must be `"repo"`. |
| `expires_at` | Future ISO timestamp string. |
| `reason` | Single-line approval reason of at least eight characters. |
| `hard_review` | Boolean when provided; must be `true` when `trusted_ops` is enabled. |

`readonly` and `trusted_ops` must not be enabled together in one profile set. Permission profiles are opt-in and apply only to packaged BROS agents at plugin configuration time.

## Approval Packages

Approval packages are optional, expiry-bound presets for reducing repeated prompts around safe local command classes during a named trace. They are config-time permission merges for packaged BROS agents only; they do not grant release, publish, production, credential, protected-branch, force-push, destructive, or broad shell authority.

Supported package IDs are:

- `git_read`
- `git_branch_work`
- `git_pr_work`
- `npm_local_dev`
- `npm_dependency_change`
- `ssh_readonly_known_host`
- `docker_local`
- `release_dry_run`

Each package entry must include `package_id`, `trace_id` beginning with `BROS-`, `scope: "repo"`, `expires` as `session` or a future ISO timestamp, owner `agents`, audit/reporting `files`, and a non-sensitive `reason`. The `files` globs are validated and surfaced for traceability only; runtime command permissions are derived from the selected package preset and are not constrained by those file globs. Hard denies are appended after package permissions, so secret reads, force push, protected branch push, publish, dist-tag mutation, destructive reset/clean/delete, credential validation, and production/cloud mutation remain blocked.

## Validation Commands

Use these commands from the repository root while developing or reviewing configuration behavior:

```bash
node bin/bros.mjs config-status
node scripts/verify-plugin-smoke.mjs
node --test tests/config.test.mjs
```

`config-status` reports the locally loaded package version, an offline-only update notice, resolved routing status, and notes when routing profiles are present but no default startup depth is inferred. Repeated restricted-fallback warnings are summarized for readability while remaining visible. The smoke and test commands are repository development checks for plugin and configuration behavior.

## Common Errors and Troubleshooting

| Error class | Cause | Resolution |
| --- | --- | --- |
| Unknown key | A top-level key, model entry key, category key, agent key, or permission profile key is not on the allowlist. | Remove the unsupported key or replace it with a documented key. |
| Duplicate alias conflict | Two aliases normalize to the same category in one routing map. | Keep only one key for each normalized category. |
| Secret-like value rejection | A model identifier, variant, or reason contains material that matches sensitive-value patterns. | Remove credentials and use only model or variant identifiers and a non-sensitive reason. |
| Restricted fallback rejection | `fallback_models` is set for `coder_build`, `security`, `qa_review`, `ops`, or an agent in one of those categories. | Use an explicit `model` without `fallback_models` for restricted categories. |
| Unknown routing profile | A depth name or category in `routing_profiles` is not allowlisted. | Use `quick`, `standard`, `deep`, or `critical`, and one documented category key. |
| Invalid approval package | A package entry omits scope, trace, files, agents, expiry, uses an expired timestamp, or uses an unsupported package ID. | Use a documented package preset and keep it repo-scoped, trace-scoped, future-expiring or session-expiring, and reason-logged. |
| Removed `fallback_model` key | A config still uses the removed top-level `fallback_model` entry. | Replace it with an ordered top-level `fallback_models` array. |
| Removed `model_routing` key | A config still uses the removed top-level `model_routing` map. | Move supported entries into `categories` and use `architecture` or `ui` instead of legacy design names. |
| Stale install prompt | OpenCode is using an older cached package or a session that started before the config change. | Reinstall or refresh the plugin through the installation guide, then fully restart OpenCode. |

Do not assume a configuration change is active until OpenCode has been restarted and routing status has been checked.

## Security Notes

`bros.config.json` must not include tokens, secrets, provider credentials, private keys, authorization headers, cookies, or environment values. Store provider configuration in the appropriate OpenCode or provider-specific mechanism instead.

BROS Harness configuration does not mutate providers, MCP servers, telemetry, top-level OpenCode permissions, package installation state, npm publishing state, or credential stores. Optional permission profiles and approval packages only tune packaged BROS agent permissions in memory after validation and preserve hard denials for destructive, publish, force-push, credential-read, and production/cloud mutation command classes. Approval package `files` are audit/reporting metadata only, not runtime file-scope enforcement.
