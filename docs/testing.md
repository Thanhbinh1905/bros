# Testing

Current checks are dependency-free:

```bash
npm run validate
```

This runs asset manifest validation, workflow regression validation, plugin smoke verification, secret-pattern scanning, and package dry-run content checks. Workflow regression validation also checks that evidence packets require trace/freshness/confidence/limitations metadata and that stale session claims are labeled historical/non-authoritative.

`npm run validate` currently runs:

- `scripts/validate-assets.mjs`
- `scripts/validate-workflow-regressions.mjs`
- `scripts/verify-plugin-smoke.mjs`
- `scripts/verify-no-secrets.mjs`
- `scripts/verify-package-contents.mjs`

The plugin smoke check verifies that permission deny-list command keys containing words such as token or credential do not get mistaken for secret values, while explicit secret-like agent config is still rejected. It also verifies permission-profile activation and regression-denies for unsafe profile combinations, publish commands, and force-push commands. The secret-pattern scanner skips private/session/config/credential surfaces such as `.bros/`, `.opencode/`, `.env*`, private-key files, and credential-like path names rather than reading them. The package-content check uses `npm pack --dry-run --json` and fails if package contents include local `.bros` session traces, raw OpenCode config, maintainer import tooling, logs, package workspace sources, blocked skipped skill roots, or secret-like file paths. Sanitized session-derived material must be copied into an approved docs path and reviewed as public documentation rather than packaged from `.bros/` directly.

Useful focused checks:

```bash
node bin/bros.mjs doctor
node bin/bros.mjs status
npm run verify:package
npm pack --dry-run
```

These checks are local and read-only. They do not publish, deploy, install dependencies, read credentials, or perform telemetry.
