# Retrieval Style Guide

This guide defines documentation patterns that keep BROS instruction retrieval concise, source-aware, and safe. It is documentation-only and does not change OpenCode runtime behavior, permissions, routing, validation scripts, package contents, release gates, or executable agent/command/skill behavior.

## Open When

- You are creating or editing a reference doc, routing doc, migration note, or sanitized task-local note.
- You need to make a doc easier for humans or agents to retrieve without opening high-context executable files first.
- You need conventions for headings, metadata sections, cross-links, or summaries that point to canonical sources.

## Do Not Open When

- You need to change executable behavior, OpenCode frontmatter, command permissions, agent role boundaries, templates, scripts, package manifests, install/update behavior, or release behavior.
- You need a full packet schema body. Use `packet-schemas.md` to find the owner template, then inspect the template only if the approved task requires it.
- You need secret values, private traces, credentials, provider state, live runtime proof, or production/deployment evidence.

## Heading Conventions

- Start with a single `#` title that states the document's routing purpose.
- Use predictable `##` sections such as `Open When`, `Do Not Open When`, `Route by Need`, `Canonical Sources`, `Scope`, `Non-Goals`, `Risks`, and `Follow-Ups`.
- Prefer short tables for routing decisions and owner maps. Avoid long repeated policy prose when a path reference is enough.
- Mark documentation-only references clearly near the top when the file does not authorize behavior changes.
- Keep safety-critical local summaries visible in executable assets. Do not move a local stop condition into a central heading and remove it from the point of action.

## Metadata and Body Sections

Use metadata-like context when a document depends on a task, evidence packet, or trace:

| Field | Use |
| --- | --- |
| `Scope` | Identify the files, concepts, or task slice covered by the document. |
| `Source basis` | Name the current evidence packet, direct inspection, or canonical source used. |
| `Authority status` | State whether the document is authority, reference, verified evidence, task-local, or historical/non-authoritative. |
| `Freshness boundary` | State what would make the guidance stale, such as edits to docs, agents, commands, templates, manifests, package metadata, or validation behavior. |
| `Non-goals` | List behavior changes and adjacent refactors that are not authorized by the current document. |

Keep the body focused on routing, ownership, and safe retrieval. Put detailed task execution, raw logs, raw diffs, and review transcripts in approved task-local records only when sanitized and explicitly in scope.

## Cross-Link Rules

- Use relative links for repository docs, for example `[packet-schemas.md](packet-schemas.md)`.
- Include file paths for canonical executable or machine-readable owners, for example `assets/opencode/skills/bros-orchestrate/SKILL.md`.
- Link to the narrowest useful owner instead of a broad directory when possible.
- Use links as routing aids, not as substitutes for local safety summaries where an agent or command can act.
- Do not use vague pointers such as “the docs,” “the template,” or “the config” when a specific path is known.
- Do not copy full schemas, long command lists, or long permission policies unless a future approved packet explicitly requires it.

## High-Load File Guidance

Some instruction files are intentionally high-context because they are executable or package-critical. Open them only when the approved task requires owner-level inspection.

| File area | Retrieval approach |
| --- | --- |
| Large skill files such as `assets/opencode/skills/frontend-patterns/SKILL.md`, `assets/opencode/skills/backend-patterns/SKILL.md`, `assets/opencode/skills/bros-orchestrate/SKILL.md`, and `assets/opencode/skills/tdd-workflow/SKILL.md` | Start with `canonical-sources.md` or `packet-schemas.md`; inspect the large file only for the specific owner section needed. |
| Agent files such as `assets/opencode/agents/bro-build.md` and `assets/opencode/agents/mighty-bro.md` | Treat local role boundaries and stop rules as safety-critical. Do not consolidate them away from the execution point. |
| Manifests and lifecycle metadata such as `assets/skills.lifecycle.json` and `assets/*.manifest.json` | Treat as machine-readable owners for package-visible metadata. Validate with approved package checks before claiming consistency. |
| Command docs and packet templates | Use them for lane-specific routing and schema bodies. Prefer references from summary docs instead of duplicating full packet bodies. |

When a high-load file is not in scope, record the needed follow-up in the approved task packet or in a sanitized package-excluded session note when explicitly authorized, rather than opening or editing it opportunistically.

## Summary Rules

- Route first, inspect narrowly, and edit only the approved owner file.
- Preserve technical IDs, command names, OpenCode-native frontmatter, role boundaries, hard stops, freshness labels, trace IDs, and redaction rules.
- Treat packets and generated notes as evidence, not authority.
- Label stale or historical claims instead of presenting them as current truth.
- Keep public docs free of raw secrets, `.env*` contents, private traces, raw sensitive logs, and large unredacted command transcripts.

## Follow-Up Boundary

This guide supports future Markdown instruction refactors. It does not approve changes to executable assets, package metadata, scripts, validation behavior, install/update behavior, or release process.
