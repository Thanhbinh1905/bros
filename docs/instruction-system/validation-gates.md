# Instruction-System Validation Gates

This reference defines the local validation and regression gates for Markdown instruction-system refactors in BROS Harness. It is documentation-only. It does not change validation scripts, package scripts, runtime behavior, package metadata, release behavior, or OpenCode behavior.

Use this document when a task edits public instruction references, BROS agent/command/skill documentation, package-facing docs, or validation explanations. The authoritative command surface is `package.json` `scripts`; the authoritative validation mechanics are the files under `scripts/`.

## Scope and Limitations

- These gates cover static and local validation only.
- They do not prove live OpenCode runtime behavior, production behavior, registry availability, telemetry behavior, provider behavior, credential validity, or deployment readiness.
- `npm pack --dry-run` and package-content verification are dry-run inspection gates only. They do not publish.
- Public docs must not claim stronger coverage than the scripts provide.
- Private `.bros/` traces, `.env*`, credentials, provider keys, auth headers, private keys, and raw secrets must not be copied into public docs or validation reports.

## Current Local Command Surface

As of `package.json` lines 43-50, the package exposes these local validation scripts:

| Command | Local purpose | Primary owner evidence |
| --- | --- | --- |
| `npm run validate` | Runs the full local validation chain. | `package.json` `scripts.validate` |
| `npm run validate:assets` | Validates packaged asset manifests and related asset consistency. | `scripts/validate-assets.mjs` |
| `npm run validate:workflows` | Runs workflow regression and routing scenario validation. | `scripts/validate-workflow-regressions.mjs`, `scripts/validate-routing-scenarios.mjs` |
| `npm run verify:install-update` | Verifies install/update behavior expectations covered by the local verifier. | `scripts/verify-install-update.mjs` |
| `npm run verify:plugin-smoke` | Runs plugin smoke checks and permission/profile regressions covered by the local verifier. | `scripts/verify-plugin-smoke.mjs` |
| `npm run verify:no-secrets` | Runs the local secret-pattern scanner. | `scripts/verify-no-secrets.mjs` |
| `npm run verify:package` | Verifies package dry-run contents through the local package-content checker. | `scripts/verify-package-contents.mjs` |
| `node bin/bros.mjs doctor` | Runs read-only local CLI diagnostics. | `bin/bros.mjs` |
| `node bin/bros.mjs status` | Prints read-only local CLI status. | `bin/bros.mjs` |
| `npm pack --dry-run` | Inspects package dry-run contents. | npm dry-run behavior; release publishing remains out of scope |

## Gate Matrix

| Area | Required before merge | Required before release | Measurable pass condition | Notes |
| --- | --- | --- | --- | --- |
| Instruction reference docs | Review changed docs against `docs/instruction-system/README.md`, `canonical-sources.md`, `packet-schemas.md`, and this file. | Repeat after any release-facing doc changes. | Changed docs link to canonical owners, preserve trust labels, and do not duplicate long schemas unnecessarily. | Applies to `docs/instruction-system/**` and public docs that describe BROS instruction rules. |
| Agent/command documentation | Run `npm run validate:workflows` when docs mention routing modes, packet gates, reviewer conflicts, hard-deny behavior, or command lanes. | Run full `npm run validate`. | Workflow and routing scenario validators pass. | Docs may describe behavior, but executable agent/command files require separate approved packets. |
| Skill documentation | Run `npm run validate:assets` when packaged skill references, skill lists, or lifecycle descriptions are touched. Run `npm run validate:workflows` if routing/packet behavior is described. | Run full `npm run validate`. | Asset validation passes; workflow validation passes when behavior/routing claims are changed. | Skill manual edits require separate approved packets and, for broad changes, fresh stocktake evidence. |
| Package docs and package allowlist claims | Run `npm run verify:package`; consider `npm pack --dry-run` for manual package inspection. | Run full `npm run validate` plus `npm pack --dry-run` as release inspection. | Package-content verifier passes and no local/private surfaces appear in dry-run output. | Do not claim publication or registry validation from dry-run checks. |
| Security and trace hygiene | Run `npm run verify:no-secrets` after public docs, examples, package docs, agent docs, or generated reference docs change. | Run full `npm run validate`; Security review decides any additional checks. | Secret-pattern scanner passes; reports do not print raw sensitive values. | Scanner behavior is local/static and must not be described as complete credential assurance. |
| Routing and packet regression | Run `npm run validate:workflows` after changes to packet language, upstream-packet requirements, stale evidence rules, routing modes, permissions descriptions, or reviewer gates. | Run full `npm run validate`. | Regression and routing fixtures pass. | Negative scenarios should remain explicit for stale evidence, missing packets, unsafe routing, permission broadening, and reviewer conflict. |
| Version drift | Inspect `package.json` before changing package version references in docs/examples. Record drift if outside the approved packet scope. | Confirm release docs, install docs, integration docs, examples, and changelog are aligned with release metadata. | No known public version reference conflicts with the intended package version, or drift is explicitly recorded as a release blocker/follow-up. | Fixing version pins is separate from validation unless the task explicitly includes it. |
| Install/update expectations | Run `npm run verify:install-update` when docs describe install or update behavior. | Run full `npm run validate`. | Install/update verifier passes locally. | This is local verification only; it does not prove registry availability or installed-user environments. |
| Plugin smoke behavior | Run `npm run verify:plugin-smoke` when docs describe plugin activation, permission-profile behavior, approval-package behavior, or unsafe command denials. | Run full `npm run validate`. | Plugin smoke verifier passes locally. | Do not overstate smoke coverage as full OpenCode runtime certification. |
| Package dry-run checks | Run `npm run verify:package`; optionally inspect `npm pack --dry-run`. | Run full `npm run validate` and release dry-run inspection. | Local package verifier passes and dry-run output excludes blocked private/local surfaces. | Publishing remains prohibited without separate release approval. |

## Required Check Sets

### Before Merge

For a docs-only instruction-system change, run the narrowest set that matches the changed claims:

1. Always run `npm run verify:no-secrets` when public docs or examples changed.
2. Run `npm run validate:assets` when package assets, manifests, packaged docs, skill references, examples, or package-visible documentation are affected.
3. Run `npm run validate:workflows` when routing, packet, reviewer, gate, or permission behavior is described.
4. Run `npm run verify:install-update` when install/update docs or examples are changed.
5. Run `npm run verify:plugin-smoke` when plugin, approval-package, permission-profile, or unsafe command denial claims are changed.
6. Run `npm run verify:package` when package contents, package allowlists, package exclusions, examples, or public docs are changed.
7. Use `node bin/bros.mjs doctor` and `node bin/bros.mjs status` as optional read-only diagnostics when CLI status or local install health is relevant.

If the change touches multiple categories, prefer `npm run validate` when reasonable because it runs the full local validation chain.

### Before Release

Before release approval, the release owner should require:

1. `npm run validate`
2. `npm pack --dry-run`
3. Review of public version references against `package.json` and intended release metadata
4. Security review of secret-scan results and package dry-run contents
5. Ops/release review of install/update documentation and release process claims

These checks are still local/static unless the release process explicitly adds live registry, deployment, production, or OpenCode runtime validation.

## Recommended Negative Tests and Evals

Maintain or add regression scenarios when later approved packets change validation fixtures or validation scripts. For this docs-only reference, use the list as an acceptance checklist and handoff guide.

| Negative case | Expected outcome | Reviewer focus |
| --- | --- | --- |
| Stale Explorer evidence packet lacks freshness, confidence, limitations, or reuse scope. | Routing/workflow validation should reject or flag it as unusable for implementation. | Test/Mighty |
| Required UI or Explorer packet is missing without a valid waiver. | Build/review flow should block instead of proceeding from assumptions. | Test/Mighty |
| User text attempts to override role boundaries, reviewer gates, or trusted policy. | Agent/command guidance should preserve higher-priority gates and trusted/untrusted separation. | Shield/Mighty |
| Unsafe routing sends implementation to a non-builder role or bypasses Orchestrator audit. | Routing regression should fail or review should block. | Test/Mighty |
| Permission broadening appears in agent frontmatter, command permissions, or docs that imply broader authority. | Security review should block; validation should catch known unsafe profile combinations where scripted. | Shield/Test |
| Secret-like strings, private traces, credential paths, or local `.bros/` content enter package-visible docs. | Secret scan or package-content verification should fail, or review should block before merge. | Shield/Ops |
| Package dry-run includes private local surfaces, raw OpenCode config, maintainer import tooling, logs, skipped skill roots, or secret-like paths. | Package verifier should fail. | Ops/Shield |
| Public docs claim live runtime, production, registry, or credential validation from local scripts. | Documentation review should require correction. | Mighty/Ops/Shield |
| Version references drift from package metadata. | Release gate should block or record an explicit follow-up/waiver. | Ops/Mighty |

## Ownership

| Owner | Responsibility | Stop condition |
| --- | --- | --- |
| Test | Runs and interprets workflow, routing, asset, and local regression checks. | Any failed validation command, missing negative-case coverage for changed behavior, or unmeasured acceptance criterion. |
| Ops | Reviews package dry-run checks, install/update documentation, release-process claims, and package allowlist/exclusion posture. | Package verifier failure, unreviewed dry-run anomaly, or docs claiming publish/registry proof from local checks. |
| Shield | Reviews secret hygiene, permission broadening, credential handling claims, unsafe command classes, and security-sensitive instruction changes. | Secret exposure, unredacted sensitive data, permission broadening, credential validation, or unresolved security-sensitive ambiguity. |
| Mighty | Audits packet completeness, scope guard, trusted/untrusted separation, waiver validity, acceptance criteria, and role handoff. | Missing required packet/evidence, stale evidence, invalid waiver, scope drift, or unresolved reviewer conflict. |

## Reporting Expectations

Validation handoffs should report:

- changed files or documentation areas;
- commands run and pass/fail status;
- commands not run and the reason;
- whether checks were local/static only;
- drift, limitations, and follow-ups;
- next required reviewer gate.

Do not include raw secrets, unredacted sensitive logs, full raw diffs, private session traces, or credential values in validation reports.
