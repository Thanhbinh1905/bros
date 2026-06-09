# Security Review

packet_id: [SEC-PACKET-ID]
trace_id: [BROS-*]

## Scope

[System, feature, config, or release under review.]

## Threat Model

| Asset | Threat | Control | Residual Risk |
|---|---|---|---|
| [Asset] | [Threat] | [Control] | [Risk] |

## Findings

| Severity | File/Area | Finding | Evidence | Remediation | Status |
|---|---|---|---|---|---|
| CRITICAL | [Area] | [Finding] | [Evidence] | [Fix] | open |

## Checks

- [ ] No hardcoded secrets.
- [ ] User inputs validated.
- [ ] Injection risks mitigated.
- [ ] Authn/authz reviewed.
- [ ] Error messages do not leak sensitive data.
- [ ] Dependencies reviewed.
- [ ] Sensitive operations gated.
- [ ] No raw secrets, tokens, env values, provider keys, or credentials reproduced.

## Gate Outcome

- Security gate: pending
- CRITICAL open: [count]
- HIGH open: [count]
- Reviewer: Security Reviewer (`bro-shield`)

## Review

- Evidence reviewed: [security scope, evidence, gates, and findings reviewed]
- Objections checked: [specific security objections checked]
- Risk challenge: [unsafe/secret-exposing/permission-broadening/gate-bypassing ideas challenged]
- Audit status: [pending orchestrator audit before advancement]

## Handoff

- Next security gate: [gate]
- Owner: [owner]
- Stop condition: [condition]
