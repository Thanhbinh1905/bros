# BROS Harness Configuration

## Purpose and Locations

`bros.config.json` is an optional package-specific configuration file for BROS Harness. It supports rich model routing and scoped permission profiles for packaged BROS agents.

Supported locations are loaded in this order:

- Repository configuration: `./bros.config.json`, resolved from the OpenCode working directory.
- Global configuration: `~/.config/opencode/bros.config.json`.

The configuration is read by the BROS Harness plugin at runtime. It does not install packages, write OpenCode configuration, or create provider credentials.

## Quick-Start Example

For repository-local authoring, use the published raw schema URL as the recommended agent-friendly default:

```json
{
  "$schema": "https://raw.githubusercontent.com/Thanhbinh1905/bros/main/examples/bros.config.schema.json",
  "fallback_model": "anthropic/claude-sonnet-4-5",
  "model_routing": {
    "explorer": "anthropic/claude-sonnet-4-5",
    "coder_build": {
      "model": "anthropic/claude-sonnet-4-5",
      "variant": "high"
    },
    "designer": "anthropic/claude-sonnet-4-5",
    "reviewer": "anthropic/claude-sonnet-4-5",
    "qa_review": "anthropic/claude-sonnet-4-5",
    "security": "anthropic/claude-sonnet-4-5",
    "docs": "anthropic/claude-sonnet-4-5",
    "ops": "anthropic/claude-sonnet-4-5"
  },
  "categories": {
    "explorer": {
      "model": "anthropic/claude-sonnet-4-5",
      "fallback_models": ["openai/gpt-5.5"]
    },
    "docs": {
      "model": "anthropic/claude-sonnet-4-5",
      "fallback_models": ["openai/gpt-5.5"]
    }
  },
  "agents": {
    "mighty-bro": {
      "model": "anthropic/claude-sonnet-4-5",
      "variant": "high",
      "fallback_models": ["openai/gpt-5.5"]
    }
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

Agents and editors can fetch the published schema from `https://raw.githubusercontent.com/Thanhbinh1905/bros/main/examples/bros.config.schema.json`. A local `./bros.config.schema.json` reference can still be used when the schema file is copied into the repository, but the raw URL is the recommended default for user-facing examples.

## Top-Level Keys

| Key | Type | Purpose |
| --- | --- | --- |
| `fallback_model` | model entry | Default model for non-restricted categories when no more specific route applies. |
| `model_routing` | object | Category-level routing map using canonical category names or accepted aliases. |
| `categories` | object | Category-level routing map that takes precedence over `model_routing`. |
| `agents` | object | Agent-specific routing map with the highest routing precedence. |
| `permission_profiles` | object | Optional repo-scoped permission profiles for packaged BROS agents. |

The optional `$schema` key is also accepted and must be a string when present. Unknown top-level keys fail validation.

## Model Entry Formats

A model entry can be a string model identifier:

```json
"anthropic/claude-sonnet-4-5"
```

A model entry can also be a rich object:

```json
{
  "model": "anthropic/claude-sonnet-4-5",
  "variant": "high",
  "fallback_models": ["openai/gpt-5.5"]
}
```

Rich object fields are:

- `model`: required non-empty model identifier.
- `variant`: optional non-empty variant identifier.
- `fallback_models`: optional non-empty array of fallback model identifiers, allowed only where runtime restrictions permit it.

## Categories and Aliases

Canonical categories are:

- `planner`
- `explorer_search`
- `coder_build`
- `security`
- `qa_review`
- `docs`
- `design`
- `ops`

Accepted aliases are:

- `explorer`, `explorer/search`, `search` → `explorer_search`
- `coder`, `build`, `coder/build` → `coder_build`
- `qa`, `review`, `qa/review`, `reviewer` → `qa_review`
- `release` → `ops`
- `designer` → `design`

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

Agent routes are not alias-normalized. The key must match one of the supported agent names exactly.

## Precedence

Configuration source precedence is:

1. Packaged defaults.
2. Global config at `~/.config/opencode/bros.config.json`.
3. Repository config at `./bros.config.json`.
4. OpenCode plugin input.

Model routing precedence after sources are merged is:

1. `agents`
2. `categories`
3. `model_routing`
4. `fallback_model`
5. Packaged/default model routing

More specific routes override less specific routes. Agent routes override category routes for the same packaged agent.

## Runtime Model Propagation

When BROS Harness is loaded by OpenCode, explicit model routes from `agents`, `categories`, or `model_routing` can update the `model` field for preexisting known BROS agents. This lets a user keep installed or already-registered BROS agent definitions while changing their runtime model through BROS configuration.

Runtime model propagation is limited to the `model` field. BROS Harness does not use model routing to replace an existing agent's prompt, permission, mode, tool configuration, or other non-model fields.

The global `fallback_model` retains its restricted fallback behavior: it is not silently applied to restricted categories. To change a restricted category, set an explicit route through `model_routing`, `categories`, or `agents` without `fallback_models`.

Restart OpenCode after changing BROS configuration or plugin installation state. Do not assume a new model route is active until OpenCode has restarted and routing status has been checked.

## Restricted Fallback Rules

The restricted categories are:

- `coder_build`
- `security`
- `qa_review`
- `ops`

Restricted categories reject `fallback_models` in model entry objects. This applies whether the category is addressed through a canonical category name, an alias, or an agent whose category is restricted.

The global `fallback_model` is not applied to restricted categories unless an explicit route exists through `model_routing`, `categories`, or `agents`. To change a restricted category, set an explicit route without `fallback_models`.

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
| Stale install prompt | OpenCode is using an older cached package or a session that started before the config change. | Reinstall or refresh the plugin through the installation guide, then fully restart OpenCode. |

Do not assume a configuration change is active until OpenCode has been restarted and routing status has been checked.

## Security Notes

`bros.config.json` must not include tokens, secrets, provider credentials, private keys, authorization headers, cookies, or environment values. Store provider configuration in the appropriate OpenCode or provider-specific mechanism instead.

BROS Harness configuration does not mutate providers, MCP servers, telemetry, top-level OpenCode permissions, package installation state, npm publishing state, or credential stores. Optional permission profiles only tune packaged BROS agent permissions in memory after validation and preserve hard denials for destructive, publish, force-push, credential-read, and production/cloud mutation command classes.
