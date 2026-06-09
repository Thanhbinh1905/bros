# Category-Driven Routing Example

This example explains the semantic meaning behind `bros.config.json` category keys. The JSON example remains valid configuration; this companion file supplies human-readable routing context that JSON cannot express without unsupported comment fields.

| Category | Use when the workflow is about | Typical default owners |
| --- | --- | --- |
| `planner` | Intake, classification, packet completeness, and stop-condition handoff. | `mighty-bro` |
| `explorer_search` | Repository, documentation, or external evidence collection. | `bro-explore` |
| `coder_build` | Scoped approved implementation and local validation. | `bro-build` |
| `security` | Security-sensitive review, secrets, permissions, or authorization risk. | `bro-shield` |
| `qa_review` | Test strategy, regression checks, and acceptance validation. | `bro-test` |
| `docs` | Public, operator, migration, or handoff documentation. | `bro-docs` |
| `architecture` | Design boundaries, invariants, and cross-cutting tradeoffs. | `bro-design` |
| `ui` | UI implementation, frontend behavior, accessibility, or visual state. | `bro-ui` |
| `ops` | Operational readiness, release/deploy gating, or runtime safety. | `bro-ops` |

Category descriptions, capabilities, and workflow responsibilities are routing guidance only. They do not grant OpenCode permissions, approve Security/QA/Ops gates, authorize git mutation, or permit release/publish/deploy actions. Use `permission_profiles` and `approval_packages` for structured permission changes, and keep the hard-deny safeguards intact.

Restricted fallback categories currently include `coder_build`, `security`, `qa_review`, `ops`, `git_ops`, `package_ops`, `release_ops`, and `deep_review`. Top-level `fallback_models` is not applied to those categories; set explicit `categories`, selected `routing_profiles.<depth>`, or exact `agents` routes when a restricted lane needs a model override.
