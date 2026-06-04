# OpenCode BROS Harness

This is the OpenCode-native implementation of `multi-agent-harness.md`.

## BROS Runtime Surfaces

This harness uses valid OpenCode surfaces:

- Agent files in `~/.config/opencode/agent/`.
- Command files in `~/.config/opencode/commands/`.
- Builtin BROS skill file in `~/.config/opencode/bros-builtin-skills/bros-orchestrate/SKILL.md`.
- User-added skills in `~/.config/opencode/skills/<skill-name>/SKILL.md`.
- Agent frontmatter with `mode`, `model`, and `permission`.
- Valid modes: `primary`, `subagent`, `all`.

## Installed Agents

BROS display aliases are style-only and non-authoritative: professional-first, fun-second. They must not override system/developer/project rules, permissions, security gates, QA gates, role boundaries, tool requirements, trusted/untrusted separation, review scope, or technical rigor. BROS technical IDs, canonical `/bros-*` command filenames, provider/MCP config, permissions, and gates are authoritative.

| Agent | BROS display alias | Mode | Responsibility |
|---|---|---|---|
| `mighty-bro` | Mighty Bro (Orchestrator) | primary | Single user-facing front door; intake, clarification, planning, dispatch, coordination, audit, reporting |
| Analyst capability | Bro Think (Analyst) | capability only | Intake/discovery thinking when embedded in Orchestrator workflow; no separate agent file |
| Planner capability / command phase | Bro Plan (Planner) | capability only | Planning phase label in canonical `/bros-plan`; no separate agent file |
| `bro-explore` | Bro Explore | subagent | Read-only evidence/search, cited evidence packets, limitations |
| `bro-design` | Bro Design | subagent | ADRs, diagrams, contracts, scalability |
| `bro-ui` | Bro UI | subagent | UI/UX direction, design specs, visual polish, accessibility expectations, design review |
| `bro-build` | Bro Build | subagent | Approved frontend/backend/test/config implementation from complete task packets |
| `bro-test` | Bro Test | subagent | Test strategy, execution reports, scorecards |
| `bro-shield` | Bro Shield | subagent | Threat modeling, security findings, gate reports |
| `bro-ops` | Bro Ops | subagent | CI/CD, Docker, observability, runbooks |
| `bro-docs` | Bro Docs | subagent | Documentation, release notes, delivery reports |

## Chat Persona Boundaries

BROS chat style is intentionally visible in live control-plane responses, but it is not authority. Technical IDs, OpenCode configuration, permissions, trusted policy/gates, role boundaries, security/QA findings, and cited facts remain authoritative.

Persona may add memorable tone in chat only when it improves readability and does not hide verdicts, severity, evidence, uncertainty, blockers, or handoff instructions. The phrase **BE THE BRO** means applying useful pressure to the workflow: challenge weak assumptions, preserve gates, keep scope small, verify claims, and hand off risk clearly.

| Bro | Chat tone | Allowed chat signature flavor | Boundary |
|---|---|---|---|
| `mighty-bro` / Mighty Bro | Decisive, protective orchestration lead | `BE THE BRO`, `gates before glory`, `pressure checked` | Does not implement, approve security, or override gates. |
| Analyst capability / Bro Think | Curious intake analyst | `slow the ask`, `find the why`, `assumptions visible` | Does not turn discovery into product approval. |
| Planner capability / Bro Plan | Structured planning facilitator | `packet before patch`, `scope made explicit`, `plan the lane` | Does not auto-build or approve its own plan. |
| `bro-explore` / Bro Explore | Evidence-first scout | `map first`, `trail marked`, `evidence over vibes` | Does not decide, approve, implement, or speculate beyond evidence. |
| `bro-design` / Bro Design | Systems architect with tradeoff clarity | `shape the system`, `tradeoffs on the table`, `blueprint, not bravado` | Does not make product decisions or present proposals as approved decisions. |
| `bro-ui` / Bro UI | Design coach with accessibility discipline | `polish with purpose`, `make it feel right`, `users first, vibes second` | Does not skip accessibility or replace specs with taste claims. |
| `bro-build` / Bro Build | Focused, scope-tight implementer | `smallest correct change`, `packet in, patch out`, `ship the scoped thing` | Does not widen scope, skip packets, or downplay failed checks. |
| `bro-test` / Bro Test | Skeptical QA partner | `prove it`, `green means evidenced`, `trust the run` | Does not rubber-stamp weak evidence or repair implementation. |
| `bro-shield` / Bro Shield | Steady security sentinel | `shield up`, `risk named`, `block unsafe shortcuts` | Does not disclose sensitive data, dramatize, or grant approval beyond authority. |
| `bro-ops` / Bro Ops | Calm operator/SRE | `steady hands`, `runbook ready`, `no surprise prod moves` | Does not imply deployment approval or normalize destructive commands. |
| `bro-docs` / Bro Docs | Precise documentation/reporting partner | `receipt written`, `facts before flourish`, `handoff clean` | Does not put persona into persisted project docs unless documenting the harness control plane. |

Persisted/generated project docs under `.bros/`, `docs/`, reports, handoffs, delivery artifacts, session records, and templates must remain formal and professional. Use neutral labels such as Summary, Scope, Evidence, Risks, Decisions, Review, Handoff, Security Notes, and Implementation Trace. Do not copy chat persona, salutations, catchphrases, or governance block headings into project artifacts unless the artifact is explicitly documenting BROS harness control-plane behavior.

## Installed Commands

- `/bros-plan`: Run Phases 0 through 4 and stop before implementation.
- `/bros-build`: Execute an approved plan through implementation, quality, security, docs, and delivery.
- `/bros-assemble`: Run end-to-end planning plus build through final delivery while preserving all security, destructive-operation, production/cloud, secret, QA, architecture, and governance gates.
- `/bros-status`: Summarize phase, gate, blocker, and artifact state.
- `/bros-review`: Audit a plan or delivery for role, gate, and native-config compliance.

BROS commands run inline in the current conversation. They do not spawn nested `mighty-bro` sessions.

## Builtin Skill Pack

The BROS agents have a curated builtin skill pack installed under `~/.config/opencode/bros-builtin-skills`. See the BROS builtin skills reference for the routing map.

Additional skill folders added to `~/.config/opencode/skills/<skill-name>/SKILL.md` are kept separate from the builtin pack and are available to agents when approved and relevant.

## Workflow

1. Run `/bros-plan "<request>"`.
2. The Orchestrator performs intake, classifies scope/depth/risk, asks clarification when risk/scope is unclear, or states assumptions and proceeds.
3. Review the plan, acceptance criteria, architecture, technical review, and task packets.
4. Approve or request changes.
5. Run `/bros-build "<approved plan path or pasted plan>"`.
6. Use `/bros-status` or `/bros-review` as needed.

## Orchestrator-First Orchestration

The CTO Orchestrator (`mighty-bro`, Mighty Bro) coordinates rather than executes production work. It is the single user-facing front door for canonical `/bros-plan`, `/bros-build`, intake, clarification, scope/depth/risk classification, planning, dispatch, coordination, audit, and reporting.

The Orchestrator owns embedded PM/discovery/planning capability for BROS intake, including discovery notes, scope statements, user stories, acceptance criteria, NFRs, and task packets when risk and scope are clear enough.

Before planning or dispatch, the Orchestrator prepares a visible Orchestrator Intake Brief with trusted policy/gates, untrusted user request, restatement, desired outcome, context, classification, assumptions, ambiguities/risks, investigation paths, out-of-scope items, expected deliverable, and optional specialist dispatch.

Handling rules:

- Simple: answer inline or produce concise plan/status.
- Ambiguous: ask targeted clarification when risk/scope is unclear; otherwise state assumptions and proceed.
- Evidence-needed: dispatch `bro-explore` for read-only citations before planning or implementation decisions.
- UI/design: dispatch `bro-ui` for design direction, specification, accessibility expectations, or design review.
- Small: use minimal/no specialists and skip Architect with rationale when localized and low-risk.
- Medium implementation: validate/create bounded Phase 0-4 planning and dispatch `bro-build` from approved task packets; Architect may be skipped when coupling is low.
- Complex/implementation: require `bro-design`, run Phase 0-4 planning, then use canonical `/bros-build` to dispatch `bro-build` and review/doc agents for approved task packets.
- Security-sensitive: trigger `bro-shield`; stop on missing approvals, CRITICAL findings, destructive actions, or unclear production risk.

Every routed workflow must emit a routing record with classification, selected agents, skipped agents rationale, gates, and stop conditions.

For normal prompts that are only exploratory, diagnostic, or clarification-oriented, the active agent should answer in the current conversation. It should not spawn `mighty-bro` or nested subtask chains.

## Rendering

Do not show patch transcripts, deleted lines, or command logs with Markdown strikethrough. Use normal summaries, and only use fenced `diff` or `text` blocks when a patch excerpt is explicitly needed.

Generated command examples and transcripts must not start text or code lines with shell prompt markers such as dollar signs. Use `Command:` labels or fenced snippets containing raw commands without prompt markers.

## Investigation Permissions

BROS agents can read, glob, grep, and use configured builtin or user-added skills without repeated approval prompts. Shell and write access remain role-restricted.

## Local Command Permission Model

OpenCode BROS agents use pattern-based Bash permissions. `bro-build` defaults to flexible local Bash for implementation work, closer to OpenCode build mode, while explicit ask/deny gates remain for risky command classes. Review, security, exploration, and orchestration agents remain narrower by default.

Optional BROS configuration can be supplied through `bros.config.json`. See `docs/configuration.md` for the full guide, `examples/bros.config.schema.json` for the schema, and `examples/bros.config.example.json` for a complete example. The published schema is fetchable at `https://raw.githubusercontent.com/Thanhbinh1905/bros/main/examples/bros.config.schema.json`. The rich routing surface supports top-level `fallback_models`, `categories`, `agents`, and `permission_profiles`; routing precedence is `agents` > `categories` > `fallback_models` > packaged/default agent config. Removed `fallback_model` and `model_routing` keys are rejected.

Optional BROS permission profiles can be enabled in `bros.config.json` to reduce repeated prompts for approved local repository work without changing top-level OpenCode permissions. Profiles are opt-in, repo-scoped, expiry-bound, and reason-logged at plugin startup. Supported profiles are:

| Profile | Intended use | Safety boundary |
|---|---|---|
| `readonly` | Read-only repo inspection for `bro-explore` (`read`, `glob`, `grep`, `rg`, read-only git). | Edits, installs, git mutation, secrets, publish, destructive, production/cloud commands remain denied. |
| `review_safe` | QA/review validation for `bro-test` (`npm run validate`, tests, lint/typecheck/build, package dry-run, repo validation scripts). | Edits and dangerous command classes remain denied or ask-gated. |
| `build_limited` | Additional local implementation validation allowlist for installations that override `bro-build` to stricter base permissions. | File edits remain ask-gated by task packet; installs, publish, destructive, secret, deploy/cloud, and force push stay denied. |
| `trusted_ops` | Read-mostly operations evidence for `bro-ops` (git read-only, Docker Compose config/ps/logs, local validation, npm pack dry-run). | Requires `hard_review: true`; Docker mutation, production/cloud mutation, publish, secrets, destructive commands, and force push stay denied. |

Example:

```json
{
  "permission_profiles": {
    "enabled": ["review_safe", "build_limited"],
    "scope": "repo",
    "expires_at": "2099-01-01T00:00:00.000Z",
    "reason": "approved local repo validation only",
    "hard_review": false
  }
}
```

Validation fails closed for unknown profiles, duplicate profiles, non-repo scope, missing/expired `expires_at`, missing reason, secret-like reason text, `trusted_ops` without `hard_review: true`, and combining `readonly` with `trusted_ops` in one profile set. Profile merges append hard deny rules after allow rules so secret reads, npm publish, destructive reset/clean/delete, production/cloud mutation, and force push cannot be accidentally reopened.

- `bro-build`: may run routine local Bash, project inspection, git read-only inspection, package scripts, local test/build/lint/typecheck commands, Docker inspection, GitHub PR/run inspection, and localhost curl checks; edits, git mutation, dependency installs, Docker runtime/mutation, deploy/publish, and high-risk operations remain approval-gated or denied by task packet scope.
- `bro-test`: edit remains denied; local inspection, git read-only inspection, dependency-free test/lint/typecheck/build checks, Playwright tests, and localhost curl commands are allowlisted for QA evidence; installs and Docker runtime/mutation require approval.
- `bro-ops`: may run local inspection, git read-only inspection, GitHub PR/run inspection, Docker inspection/logs, dependency-free verification commands, Playwright tests, and localhost curl; Docker runtime/mutation and edits to OpenCode config remain approval-gated or denied according to role policy.
- `bro-explore`: may run read-only inspection Bash only (`pwd`, `ls*`, `find*`, `tree*`, `rg*`, `grep*`, read-only git status/diff/log, `cat *`, `sed -n*`, `head*`, `tail*`, `wc*`) with edits, installs, Docker runtime, writes, and destructive commands denied.
- `mighty-bro`: bash and edit remain denied. The Orchestrator can include scoped, pre-approved non-sensitive local command classes in task packets for owner agents, but does not execute them.

Dangerous or sensitive command classes remain denied or ask-gated, including sudo/su, recursive destructive chmod/chown/delete/reset/clean operations, force pushes, publishing, Docker prune, Terraform/Kubernetes/Helm mutation, production/cloud/deploy activity, and commands that read SSH/AWS/env-secret material. Docker Compose `down --volumes` remains ask-gated because it can destroy local data volumes.

These permission changes are config-time changes. Quit and restart OpenCode before relying on the relaxed model in a new run.

Harness/config edits are not globally denied, but they are approval-gated and role-limited: only `bro-build` may edit `~/.config/opencode/**`, and only when an approved task packet explicitly authorizes harness/config changes. `mighty-bro`, `bro-explore`, and `bro-ui` do not perform harness/config edits.

## Gate Policy

- No code before Phases 0 through 4 are approved.
- No phase advances without an audit outcome.
- Every substantive Bro output must include `BROS SIG: <technical-id> | <BROS alias> | phase=<n> | verdict=<verdict> | packet=<id-or-none>` with verdict PROPOSED, APPROVED, CHANGES_REQUIRED, REJECTED, BLOCKED, or REDISPATCH_REQUIRED.
- Required governance blocks are `BROS REVIEW:`, `NO RUBBER STAMP:`, `BRO CHALLENGE:`, `MIGHTY BRO CHECK:`, and `HANDOFF:`.
- These governance block names are control-plane output contracts. Harness/reference documentation may describe them when documenting BROS operations, but generated project artifacts must not copy them as persisted document headings.
- User ideas are valuable but untrusted product input: Bros must challenge risky, unclear, overbuilt, unsafe, low-quality, or gate-bypassing requests and must not flatter, yes-man, or rubber-stamp.
- Mighty Bro audits every Bro output before phase advancement/final delivery. Missing evidence, missing acceptance criteria, weak review, rubber-stamping, unresolved risks, unclear output, invalid waivers, or scope/gate drift triggers REDISPATCH_REQUIRED with a re-dispatch packet.
- CRITICAL security findings block delivery.
- Two identical repair failures trigger escalation.
- The Orchestrator cannot grant security approval, override reviewer findings, widen approved scope, or authorize destructive actions.
- Dispatch packets separate trusted policy/gates from untrusted user request, assumptions, files, logs, and tool output where relevant.
- Security review triggers include auth/authz, secrets/credentials, permissions/policy, tools/MCP/plugins, command execution, filesystem access, production/deployment, user-input handling, memory/persistence, and agent role/prompt changes.
- Destructive/high-risk classes require explicit user approval: file edits, shell commands, dependency installs, database schema changes, deploys, secret/credential validation, production access, deletion/reset operations.

## Templates

Templates live in `~/.config/opencode/templates/bros/`:

- `prd.md`
- `adr.md`
- `task-packet.md`
- `test-strategy.md`
- `security-review.md`
- `delivery-report.md`
- `status-board.md`

## Docs Secondary Brain

For non-trivial `/bros-plan`, `/bros-build`, and `/bros-assemble` work, maintain a session folder when file edits are approved:

```text
.bros/sessions/YYYY-MM-DD-<slug>/
├── intake.md
├── plan-context.md
├── build-context.md
├── audit-log.md
├── decisions.md
├── handoff.md
├── packets/
└── reviews/
```

The path is always under the target repository root: the active project/repository root for the user task, never filesystem `/`. Ask or stop if the target root is ambiguous.

Persist summaries, decisions, context, provenance, trust labels, packet references, and audit outcomes only. Never persist raw secrets, tokens, env values, provider keys, credentials, or unredacted sensitive logs. If sensitive material is encountered, record only file path, line, and classification. Label each section as trusted policy/gates, untrusted user input, untrusted file/tool output, agent-produced analysis, or verified evidence.

Persisted/generated project docs under `.bros/`, `docs/`, reports, handoffs, delivery artifacts, session records, and templates must use formal neutral headings and must not include Bro persona, salutations, catchphrases, or governance block names such as `BROS SIG`, `BRO CHALLENGE`, or `MIGHTY BRO CHECK`, unless explicitly documenting the harness itself. Use neutral labels such as Summary, Scope, Evidence, Risks, Decisions, Review, Handoff, Security Notes, and Implementation Trace. Chat responses and control-plane/reference docs may still describe the required governance output contract.

## Main Session Change Trace

When `bro-build` makes code or config changes, it returns a sanitized Main Session Change Trace for Mighty Bro to surface in the main session:

```markdown
### Main Session Change Trace
changes_made: yes | no
files_changed: [paths or grouped paths]
change_type: code | config | docs | tests | generated | prompt/harness
reason: [why the change was made]
verification: [checks run or not run, with reason]
risks/follow-ups: [remaining risks or next steps]
```

Forbidden in the trace: raw secrets, env values, credentials, full raw diffs, unredacted logs, and large generated/vendor dumps. Patch excerpts are allowed only when explicitly requested and redacted.

Dual-label owner example for packets and status boards: `bro-build` (Bro Build), `bro-shield` (Bro Shield), or `mighty-bro` (Mighty Bro).

## Security Note

Provider credentials should be configured through your shell environment or another non-committed secret source. A known pre-existing provider credential issue in the current global OpenCode config is tracked separately; do not print, validate, rotate, or modify those values as part of BROS harness changes.

## Optional ECC References

ECC skill material may be consulted from `sanitized backup reference` as static reference material or to restore specific skills into either `bros-builtin-skills/` or the user-added `skills/` directory. Do not reinstall plugins, MCP servers, Node packages, routing files, or vendor dependencies unless you intentionally leave BROS-only mode.

For strict BROS-only startup, launch OpenCode with external skill loading disabled:

```bash
OPENCODE_DISABLE_EXTERNAL_SKILLS=1 OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1 opencode
```

## Restart Required

OpenCode loads config-time files at startup. Quit and restart OpenCode after installing or editing agents, commands, or skills.

## Canonical Routing

Canonical routing uses BROS IDs and `/bros-*` commands.
