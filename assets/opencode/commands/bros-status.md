---
description: Summarize the current OpenCode BROS workflow state, BROS display owners, phase gates, artifacts, blockers, and next actions with canonical `/bros-status`
---

# Bros Status Command — Mighty Bro Status Lane

Summarize BROS workflow status with concise BROS display labels for: $ARGUMENTS

## Instructions

1. Activate and apply skill `bros-orchestrate`.
1a. Treat BROS persona as style-only and non-authoritative; preserve canonical `/bros-status`, technical IDs, gates, permissions, and stop conditions.
1b. Include `BROS SIG: mighty-bro | Mighty Bro (Orchestrator) | phase=<n> | verdict=<verdict> | packet=<id-or-none>` and keyword blocks `BROS REVIEW:`, `NO RUBBER STAMP:`, `BRO CHALLENGE:`, `MIGHTY BRO CHECK:`, and `HANDOFF:` when reporting routed workflow status. Allowed verdicts: PROPOSED, APPROVED, CHANGES_REQUIRED, REJECTED, BLOCKED, REDISPATCH_REQUIRED.
2. Current-session command: do not dispatch `mighty-bro` to run this command. Continue in the current conversation and only dispatch role agents for concrete role deliverables.
3. Inspect referenced plans, task packets, reports, or current conversation context.
4. Produce a concise Orchestrator-first status board with phase, owner, deliverable, gate, blockers, and next action.
5. Do not edit files or run shell commands.

## Required Output

- Status board.
- Current gate.
- Blockers and risks.
- Next recommended command or approval request.

Use the standard output contract from `bros-orchestrate`.
