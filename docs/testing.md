# Testing

Current checks are dependency-free:

```bash
npm run validate
```

This runs asset manifest validation, workflow regression validation, deterministic routing scenario validation, Node configuration tests, install/update verification, plugin smoke verification, secret-pattern scanning, and package dry-run content checks. Workflow regression validation also checks that evidence packets require trace/freshness/confidence/limitations metadata and that stale session claims are labeled historical/non-authoritative.

`npm run validate` currently runs:

- `scripts/validate-assets.mjs`
- `scripts/validate-workflow-regressions.mjs`
- `scripts/validate-routing-scenarios.mjs`
- `node --test tests/config.test.mjs`
- `scripts/verify-install-update.mjs`
- `scripts/verify-plugin-smoke.mjs`
- `scripts/verify-no-secrets.mjs`
- `scripts/verify-package-contents.mjs`

The routing scenario validator checks named fast paths, depth selection, required agents, hard-deny blockers, persona leakage, reviewer conflict, and assemble tail-work gates. The install/update verifier checks the local install/update expectations encoded by `scripts/verify-install-update.mjs`. The plugin smoke check prints the loaded local package version once, suppresses routine fallback/routing warning chatter inside smoke-only harness scenarios, and verifies that permission deny-list command keys containing words such as token or credential do not get mistaken for secret values, while explicit secret-like agent config is still rejected. It also verifies routing profile precedence, approval-package activation, permission-profile activation, and regression-denies for unsafe profile combinations, publish commands, and force-push commands. The secret-pattern scanner skips private/session/config/credential surfaces such as `.bros/`, `.opencode/`, `.env*`, private-key files, and credential-like path names rather than reading them. The package-content check uses `npm pack --dry-run --json` and fails if package contents include local `.bros` session traces, raw OpenCode config, maintainer import tooling, logs, package workspace sources, blocked skipped skill roots, or secret-like file paths. Sanitized session-derived material must be copied into an approved docs path and reviewed as public documentation rather than packaged from `.bros/` directly.

Useful focused checks:

```bash
node bin/bros.mjs doctor
node bin/bros.mjs status
npm test
npm run verify:package
npm run verify:install-update
npm run verify:plugin-smoke
npm run verify:no-secrets
npm pack --dry-run
```

These checks are local and read-only. CLI update notices are offline/local only and do not query the npm registry. The checks do not publish, deploy, install dependencies, read credentials, perform telemetry, or prove live registry, production, credential, or OpenCode runtime behavior.
