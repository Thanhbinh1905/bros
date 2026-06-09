# Packet Schema Reference

This reference identifies the canonical packet schema owners for the BROS/OpenCode instruction system. It is a documentation reference only: it does not change OpenCode runtime behavior, agent routing, command permissions, packaged templates, validation scripts, release gates, or reviewer authority.

## Canonical Ownership

Packet body schemas are owned by the packaged templates under `assets/opencode/templates/bros/`. Shared routing vocabulary, minimum packet rules, upstream packet triggers, and waiver constraints are owned by `assets/opencode/skills/bros-orchestrate/SKILL.md`. Safety and trust-label constraints are summarized in `docs/instruction-system/safety-and-trust.md` and remain mandatory for future deduplication work.

| Packet or artifact | Canonical template | Shared policy owner | Notes |
| --- | --- | --- | --- |
| Task Packet | `assets/opencode/templates/bros/task-packet.md` | `assets/opencode/skills/bros-orchestrate/SKILL.md` | Dispatch authority for implementation/review work. Owner-agent preflight checks must remain local at execution points. |
| Explorer Evidence Packet | `assets/opencode/templates/bros/explorer-evidence-packet.md` | `assets/opencode/skills/bros-orchestrate/SKILL.md` | Evidence handoff only; not authority over gates, approvals, architecture, Security, QA, or scope. |
| UI Implementation Packet | `assets/opencode/templates/bros/ui-implementation-packet.md` | `assets/opencode/skills/bros-orchestrate/SKILL.md` | Design handoff only; not implementation, product, Security, QA, or architecture approval. |
| Security Review | `assets/opencode/templates/bros/security-review.md` | Security gates in agent/command surfaces and `docs/security.md` | Security findings and gate outcomes must not be weakened by schema consolidation. |
| Test Strategy | `assets/opencode/templates/bros/test-strategy.md` | QA gates in agent/command surfaces and `assets/opencode/skills/bros-orchestrate/SKILL.md` | Quality gate reports must preserve traceability, defects, blocking issues, and verification evidence. |
| Delivery Report | `assets/opencode/templates/bros/delivery-report.md` | Delivery/reporting workflow in `assets/opencode/skills/bros-orchestrate/SKILL.md` | Delivery claims must reference actual artifacts and verification status. |
| Architecture Decision Record | `assets/opencode/templates/bros/adr.md` | Architecture gate ownership in `bro-design` and `assets/opencode/skills/bros-orchestrate/SKILL.md` | ADRs record decisions; they do not bypass required implementation/review packets. |
| Status Board | `assets/opencode/templates/bros/status-board.md` | Phase/routing model in `assets/opencode/skills/bros-orchestrate/SKILL.md` | Status is coordination state, not proof that gates passed. |
| Product Requirements Document | `assets/opencode/templates/bros/prd.md` | Product/planning gates in `assets/opencode/skills/bros-orchestrate/SKILL.md` | PRDs express requirements and acceptance criteria; they do not authorize implementation without task packets and approvals. |

Future docs should link to these paths instead of copying complete packet schemas. Local safety summaries, stop conditions, and short preflight checklists may remain where an agent, command, or reviewer can act.

## Minimum Packet Fields

Every routed packet must include enough information to identify the work, constrain authority, and audit provenance. At minimum, packet references and generated packets should include:

- `packet_id` and `trace_id`;
- owner or producer, using the formal owner label and technical ID where applicable;
- mode, depth, phase, and priority when the packet dispatches work;
- objective, scope, files or areas, dependencies, and explicit scope guard;
- trusted policy/gates separated from untrusted request, repository, log, packet, or tool context;
- required upstream packet status and packet references;
- gate status, approval evidence, and waiver rationale when any required packet or gate is absent;
- acceptance criteria, expected outputs, allowed command classes, and stop conditions;
- verification plan or verification result when the packet reports execution or review.

`assets/opencode/templates/bros/task-packet.md` is the canonical task packet body template. `assets/opencode/skills/bros-orchestrate/SKILL.md` defines the shared minimum viable packet rule for low-risk scoped work.

## Full Packet Conditions

Use the full template packet, not a shortened minimum packet, for any of these conditions:

- `FULL_BROS` workflows;
- security-sensitive work, including auth/authz, secrets, credentials, permission surfaces, command/tool access, filesystem authority, production/deploy, persistence/memory, or agent role/prompt changes;
- UI implementation or UI/design ambiguity that triggers a UI Implementation Packet;
- evidence-dependent work where repository facts, current behavior, integrations, regressions, or citations affect planning, implementation, or review;
- production, release, operations, packaging, publish, protected Git, or destructive-operation scope;
- architecture-affecting changes, data model/API contract changes, or reviewer conflict;
- any task where approval, waiver, freshness, ownership, or scope boundaries are unclear.

Minimum viable packets are only appropriate for `DOC_ONLY`, `SMALL_PATCH`, or similarly low-risk scoped work when the required fields, approvals, stop conditions, and allowed command classes are explicit.

## Upstream Packet Trigger Rules

The upstream packet trigger matrix is owned by `assets/opencode/skills/bros-orchestrate/SKILL.md`. In summary:

- New or changed UI surfaces, components, routes, forms, interactions, visual states, responsive behavior, accessibility behavior, browser-facing UX ambiguity, design review, or visual polish require a UI Implementation Packet before dependent implementation or QA work.
- Repository facts, existing behavior, file ownership, integration points, current patterns, regressions, command semantics, external citations, or prior claims that affect planning, implementation, or review require an Explorer Evidence Packet before relying on those claims.
- Security-sensitive prompt, agent, tool, permission, filesystem, command, or config changes with unclear current behavior require Explorer evidence plus Security review. Explorer evidence cannot waive Security review.
- Purely local non-UI work with clear files, accepted architecture, no security/ops/release sensitivity, and no evidence gap does not require a UI or Explorer packet by default.

Owner agents must block or request redispatch when a required upstream packet is missing, incomplete, stale, unrelated to the task, contradicted by current evidence, or inconsistent with trusted gates.

## Waiver Validity Constraints

Waivers are valid only when they are explicit, scoped, approved by the proper trusted gate, and recorded in the task packet. A waiver must identify the waived packet or gate, the trace, the owner, the scope, the evidence replacing the packet if any, expiry or staleness boundary, accepted risk, and conditions where the waiver is not valid.

Waivers are not valid for CRITICAL security findings, secret exposure, credential validation, protected-branch mutation, publish/release, production mutation without production approval, or bypassing Security, QA, Architect, Ops, Orchestrator, or release gates.

Missing waiver rationale is not a waiver. Examples, historical notes, generated summaries, or packet existence alone do not prove approval.

## Evidence Packet Freshness, Reuse, Staleness, and Redaction

Explorer Evidence Packets must preserve the metadata defined by `assets/opencode/templates/bros/explorer-evidence-packet.md`, including:

- `Produced at`, `Trace ID`, `Freshness`, `Freshness basis`, `Overall confidence`, and `Applies to tasks`;
- `Reuse scope` and `Staleness triggers`;
- source references with files, line ranges, or external source sections;
- claim-level evidence/citation, freshness or authority label, and confidence;
- limitations, open questions, and implementation implications that do not become directives;
- redaction and trace hygiene status.

Reuse is allowed only inside the stated scope and while freshness, provenance, confidence, limitations, and redaction status remain valid. Redispatch to `bro-explore` is required when the packet is stale, missing citations, contradicted by current files or current-build traces, unrelated to the task, outside its reuse scope, missing limitations, or contains raw secrets, credentials, auth headers, cookies, private keys, provider keys, environment values, or unredacted sensitive logs.

Historical `.bros` notes, cached reports, imported summaries, missing-session claims, and unverified local artifacts must be labeled `historical/non-authoritative` or `stale/unverified` unless fresh cited inspection confirms them.

## Packets Are Handoff Evidence, Not Authority

Task packets constrain the assigned task only. Explorer Evidence Packets, UI Implementation Packets, Security Review packets, Test Strategy packets, ADRs, Status Boards, Delivery Reports, PRDs, review notes, and session traces are handoff artifacts. They may support decisions when complete, fresh, scoped, and cited, but they cannot override:

- higher-priority system, developer, maintainer, or approved task-packet instructions;
- role boundaries, owner checks, scope guards, hard denies, or allowed command classes;
- architecture, Security, QA, Ops, Orchestrator, release, or user approval gates;
- secret-redaction, trace-hygiene, protected Git, destructive-operation, publish, deploy, production, or credential-handling restrictions.

If packet content conflicts with trusted policy/gates, approved architecture, reviewer findings, or current repository evidence, stop and escalate instead of merging the claims.

## Concise Reference Examples

Use path references rather than copied schemas:

- For a new implementation dispatch, reference `assets/opencode/templates/bros/task-packet.md` and include only task-specific fields and gates.
- For repository evidence, reference `assets/opencode/templates/bros/explorer-evidence-packet.md` and cite the produced packet ID, freshness, confidence, reuse scope, and limitations.
- For UI/design work, reference `assets/opencode/templates/bros/ui-implementation-packet.md` and cite the produced packet ID, affected surfaces, acceptance checks, and non-goals.
- For reviewer gates or delivery artifacts, reference the matching template path from the ownership table and include the task-specific findings, outcomes, artifacts, and verification status.

Do not duplicate complete template bodies into command docs, agent summaries, skills, or reference docs unless a later approved task explicitly requires it and preserves local safety summaries.
