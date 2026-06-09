# Instruction System Map

This directory is the routing layer for BROS Harness Markdown instruction surfaces. It helps maintainers and agents decide which document to open first, which source owns a rule, and which duplicated areas are intentional safety stops versus future refactor targets.

This directory is documentation-only. It does not change OpenCode runtime behavior, agent routing, permissions, command execution, package contents, validation scripts, release gates, or executable agent/command/skill behavior.

## Open When

- You need to find the owner of a BROS instruction, packet rule, safety rule, validation statement, or package metadata claim.
- You are planning or reviewing a Markdown instruction refactor and need to avoid broad context loading.
- You need to distinguish entry-point docs, reference docs, executable asset instructions, machine-readable metadata, and task-local evidence.
- You need to preserve local safety summaries while reducing duplicate long-form schemas or routing prose.

## Do Not Open When

- You need live OpenCode runtime proof, current registry state, provider status, credentials, or production/deployment state.
- You are implementing executable agent, command, skill, permission, plugin, package, script, install/update, validation, release, or schema behavior. Use a separate approved packet and inspect the owner files directly.
- You are trying to bypass required Explorer, UI, Security, QA, Ops, Architect, Orchestrator, release, or Git approval gates.
- You need raw private `.bros/` session traces, `.env*` files, credentials, provider keys, or secret values. Those are out of scope for this map.

## Route by Need

| Need | Start here | Then open | Avoid |
| --- | --- | --- | --- |
| Identify who owns an instruction concept | [`canonical-sources.md`](canonical-sources.md) | The listed canonical source file | Copying long policy text into a new location |
| Preserve safety while deduplicating | [`safety-and-trust.md`](safety-and-trust.md) | The local executable asset or reference doc being edited | Removing local hard stops because a central reference exists |
| Plan validation and regression gates | [`validation-gates.md`](validation-gates.md) | `docs/testing.md`, `package.json` scripts, and the relevant validation owner scripts | Editing validation scripts, package scripts, package metadata, or claiming live runtime/registry validation |
| Reference packet ownership and freshness rules | [`packet-schemas.md`](packet-schemas.md) | `assets/opencode/templates/bros/*.md` only when a full schema body is needed | Duplicating complete packet templates in many docs |
| Write or review retrieval-friendly docs | [`retrieval-style-guide.md`](retrieval-style-guide.md) | The current doc and its canonical owner | Adding large context dumps, raw diffs, or vague cross-links |
| Record future local planning without changing behavior now | Approved task packets or sanitized package-excluded session notes when explicitly in scope | `safety-and-trust.md`, `canonical-sources.md`, and the current task packet | Placing task-local migration plans in package-visible public docs or implementing drift fixes/executable asset edits in this routing layer |

## Layer Map

| Layer | Purpose | Typical sources | Retrieval rule |
| --- | --- | --- | --- |
| Entry point | Tell users and agents which lane to start from. | `README.md`, `docs/installation.md`, `docs/integrations/opencode.md`, command docs | Keep concise. Route to the canonical command, package guide, or this directory instead of restating full schemas or permission policy. |
| Reference | Explain package behavior, install/update, validation, security posture, repository layout, and instruction ownership. | `docs/`, `examples/`, `assets/opencode/*/README.md`, `assets/opencode/docs/*.md` | Summarize with links and file paths. Do not claim authority over executable behavior unless the canonical owner says so. |
| Task-local | Carry approved scope, evidence, limitations, waivers, and verification for one task. | Task packets, Explorer Evidence Packets, UI Implementation Packets, sanitized `.bros/sessions/<date-slug>/` notes | Preserve packet ID, trace ID, freshness, confidence, reuse scope, limitations, and redaction status. Do not promote local assumptions to global policy. |
| Executable instruction | Define role behavior, command routing, local stop conditions, packet preflight, and permission posture at the point an asset can act. | `assets/opencode/agents/*.md`, `assets/opencode/commands/*.md`, `assets/opencode/skills/**/SKILL.md`, `assets/opencode/templates/bros/*.md` | Inspect only when the approved task scope requires it. Preserve technical IDs, command names, OpenCode-native frontmatter, role boundaries, and local safety summaries. |
| Machine-readable | Define package-visible metadata, config schemas, manifests, versions, lifecycle state, and validation commands. | `package.json`, `assets/*.manifest.json`, `assets/skills.lifecycle.json`, `examples/bros.config.schema.json`, `scripts/*.mjs` | Treat as canonical for package version, scripts, manifests, lifecycle metadata, schema constraints, and validation mechanics. Do not edit without a behavior-specific packet. |

## Trust Labels

- **Authority:** source files that define current package behavior, validation, or required local safety posture.
- **Verified evidence:** inspected files and complete evidence packets with provenance, freshness, confidence, reuse scope, limitations, and redaction status.
- **Reference:** explanatory docs that help humans and agents find the authoritative source.
- **Task-local:** approved task packets, current-build traces, and private sanitized session notes. These constrain one task only.
- **Historical/non-authoritative or stale/unverified:** prior-session notes, cached claims, stale docs, or claims without current provenance.

`TASK-MD-001` is current high-confidence evidence for the Markdown instruction refactor within its stated reuse scope. It is not authority over role boundaries, permissions, security gates, package behavior, or executable behavior.

## Non-Goals

- No agent, command, skill, template, permission, provider, MCP, telemetry, auth, package release, install/update, validation-script, or runtime routing changes are made by this documentation map.
- Version-pin drift is recorded as a follow-up. Validation-doc drift is addressed through `docs/testing.md` and `validation-gates.md` when an approved validation-doc packet authorizes it.
- This map does not replace approved task packets, reviewer gates, or fresh Explorer evidence when a later task requires them.
