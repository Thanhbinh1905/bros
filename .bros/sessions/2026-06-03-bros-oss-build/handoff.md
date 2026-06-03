# Handoff

## Review Focus

- Confirm imported assets are public-safe.
- Confirm examples remain placeholder-only.
- Confirm package allowlist excludes private session data and raw configuration.
- Run final QA and security review before publishing.

## Repair Import Summary - BUILD-BROS-OSS-001R

- Updated at: 2026-06-03T02:01:23Z
- Scope: sanitized asset import from approved OpenCode asset directories only.
- Raw OpenCode config and secret-like values were not copied.
- Total source candidates: 156
- Imported files: 153
- Skipped files: 3

### Counts by Area
- agents: candidates=9, imported=9, skipped=0
- commands: candidates=5, imported=5, skipped=0
- skills: candidates=131, imported=128, skipped=3
- docs: candidates=2, imported=2, skipped=0
- templates: candidates=9, imported=9, skipped=0

### Notes
- Manifest files were regenerated from imported files.
- Import report was generated only if one or more approved candidates were skipped.

## Security Remediation Summary - BUILD-BROS-OSS-002

- Updated at: 2026-06-03.
- Hardened publishable agent permission frontmatter so dependency installation, arbitrary package scripts, and Docker runtime/mutation commands require approval by default.
- Replaced local absolute source paths in publishable manifests and import report with relative asset paths and sanitized source reference categories.
- Preserved the three skipped skills as skipped pending separate sanitized review/import follow-up.
- Raw OpenCode config, raw skipped skill files, and secret values were not copied.

## Evidence Packet Repair - DOCS-BROS-OSS-002

- QA may re-run the evidence gate against the sanitized EXP-BROS-OSS-001 packet; raw config, secret values, and local absolute private paths were excluded.

## Plugin-First Restructuring - BUILD-BROS-PLUGIN-001

- Review the package entrypoint exposed through `package.json` `main` and `exports`.
- Confirm the plugin performs only package-relative asset validation plus conservative `skills.paths` and `command` additions.
- Confirm CLI commands remain read-only and do not mutate live OpenCode configuration.
- Confirm README, installation docs, OpenCode integration docs, and examples present `plugin: ["bros-harness"]` as the primary user path.
- Confirm the three skipped skills remain excluded and no raw secrets, provider config, MCP config, permission changes, telemetry, or private absolute paths were introduced.

## Plugin QA and Security Remediation - BUILD-BROS-PLUGIN-002

- Confirm `.bros/sessions/2026-06-03-bros-oss-build/packets/EXP-BROS-PLUGIN-001.md` exists and contains only sanitized evidence with neutral headings.
- Confirm docs distinguish narrow runtime in-memory hook additions from disallowed live user config file mutation.
- Confirm the plugin still only adds package-relative skills and non-overwriting command entries, and does not register provider, MCP, permission, telemetry, or secret settings.
- Confirm the published package surface excludes maintainer-only mutating import tooling while retaining safe validation scripts, and confirm repository import tooling is gated by explicit maintainer opt-in.

## Release Cleanup Summary - BUILD-BROS-RELEASE-CLEANUP-001

- Confirm `packages/` and `scripts/import-assets.mjs` are absent from `npm pack --dry-run` output.
- Confirm `package.json` no longer exposes a consumer-visible `import:assets` script, while validation scripts remain available.
- Review the rewritten README for professional BROS positioning, accurate OpenCode-first install guidance, safety caveats, comparison against uncontrolled AI swarms, contribution guidance, and the theme “Move slower than chaos. Ship faster than rework.”
- Confirm the three skipped skills remain excluded pending separate sanitized review.
- Maintainer action remains required before release: review the uncommitted/untracked working tree, commit intended changes, run final QA/security release gates, and obtain separate publish approval before any real publish/tag/deploy.

## Release Cleanup Repair - BUILD-BROS-RELEASE-CLEANUP-002

- Confirm packaged documentation no longer instructs consumers to run missing `npm run import:assets` package commands.
- Confirm package dry-run output still excludes maintainer-only import tooling and workspace source directories.
- Maintainer action remains required before release: review the working tree, run final QA/security release gates, and obtain separate publish approval before any real publish/tag/deploy.
