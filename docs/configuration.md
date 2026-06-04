# BROS Harness Configuration

## Purpose and Locations

`bros.config.json` is an optional package-specific configuration file for BROS Harness. It supports category routing, exact agent routing, ordered fallback models, and scoped permission profiles for packaged BROS agents.

Supported locations are loaded in this order:

- Repository configuration: `./bros.config.json`, resolved from the OpenCode working directory.
- Global configuration: `~/.config/bros-harness/bros.config.json`.

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
  }
}
```

Agents and editors can fetch the published schema from `https://raw.githubusercontent.com/Thanhbinh1905/bros/main/examples/bros.config.schema.json`.

## Top-Level Keys

| Key | Type | Purpose |
| --- | --- | --- |
| `fallback_models` | array | Ordered global fallback list. The first entry is applied to non-restricted categories when no more specific route exists. Entries may be model id strings or objects with `model` and optional `variant`. |
| `categories` | object | Category-level routing map for canonical categories and accepted non-ambiguous aliases. |
| `agents` | object | Exact agent-specific routing map with the highest routing precedence. |
| `permission_profiles` | object | Optional repo-scoped permission profiles for packaged BROS agents. |

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

Canonical categories are:

- `planner`
- `explorer_search`
- `coder_build`
- `security`
- `qa_review`
- `docs`
- `architecture`
- `ui`
- `ops`

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
2. Global config at `~/.config/bros-harness/bros.config.json`.
3. Repository config at `./bros.config.json`.
4. OpenCode plugin input.

Model routing precedence after sources are merged is:

1. `agents`
2. `categories`
3. `fallback_models`
4. Packaged/default model routing

More specific routes override less specific routes. Agent routes override category routes for the same packaged agent.

## Restricted Fallback Rules

The restricted categories are:

- `coder_build`
- `security`
- `qa_review`
- `ops`

Restricted categories reject `fallback_models` in model entry objects. This applies whether the category is addressed through a canonical category name, an alias, or an agent whose category is restricted.

Top-level `fallback_models` is not applied to restricted categories. To change a restricted category, set an explicit route through `categories` or `agents` without nested `fallback_models`.

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

## Validation Commands

Use these commands from the repository root while developing or reviewing configuration behavior:

```bash
node bin/bros.mjs config-status
node scripts/verify-plugin-smoke.mjs
node --test tests/config.test.mjs
```

`config-status` reports resolved routing status. The smoke and test commands are repository development checks for plugin and configuration behavior.

## Common Errors and Troubleshooting

| Error class | Cause | Resolution |
| --- | --- | --- |
| Unknown key | A top-level key, model entry key, category key, agent key, or permission profile key is not on the allowlist. | Remove the unsupported key or replace it with a documented key. |
| Duplicate alias conflict | Two aliases normalize to the same category in one routing map. | Keep only one key for each normalized category. |
| Secret-like value rejection | A model identifier, variant, or reason contains material that matches sensitive-value patterns. | Remove credentials and use only model or variant identifiers and a non-sensitive reason. |
| Restricted fallback rejection | `fallback_models` is set for `coder_build`, `security`, `qa_review`, `ops`, or an agent in one of those categories. | Use an explicit `model` without `fallback_models` for restricted categories. |
| Removed `fallback_model` key | A config still uses the removed top-level `fallback_model` entry. | Replace it with an ordered top-level `fallback_models` array. |
| Removed `model_routing` key | A config still uses the removed top-level `model_routing` map. | Move supported entries into `categories` and use `architecture` or `ui` instead of legacy design names. |
| Stale install prompt | OpenCode is using an older cached package or a session that started before the config change. | Reinstall or refresh the plugin through the installation guide, then fully restart OpenCode. |

Do not assume a configuration change is active until OpenCode has been restarted and routing status has been checked.

## Security Notes

`bros.config.json` must not include tokens, secrets, provider credentials, private keys, authorization headers, cookies, or environment values. Store provider configuration in the appropriate OpenCode or provider-specific mechanism instead.

BROS Harness configuration does not mutate providers, MCP servers, telemetry, top-level OpenCode permissions, package installation state, npm publishing state, or credential stores. Optional permission profiles only tune packaged BROS agent permissions in memory after validation and preserve hard denials for destructive, publish, force-push, credential-read, and production/cloud mutation command classes.
