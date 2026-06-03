# Build Packet Artifact: BUILD-BROS-RELEASE-CLEANUP-001

## Summary

Implemented release cleanup for the package surface and README rewrite under the approved release cleanup scope.

## Scope

- Removed `packages/` from the package `files` allowlist.
- Added `packages/` to `.npmignore` for alignment with the package allowlist.
- Removed the consumer-visible `import:assets` script from `package.json`.
- Rewrote `README.md` with professional BROS positioning, workflow, principles, installation, safety details, comparison, contribution guidance, and the required release theme.
- Updated session audit and handoff records with a neutral cleanup summary.

## Constraints Observed

- No publish, deploy, registry login, tag push, dependency install, live OpenCode config mutation, skipped skill import, provider/MCP/permission change, telemetry change, or secret validation was performed.
- Maintainer-only import tooling remains repository-local, environment-gated, and excluded from the package surface.
- Runtime plugin behavior remains limited to the narrow in-memory OpenCode config hook for package-relative skills path and non-overwriting command entries.

## Validation Results

- `npm run validate` passed: 153 manifest entries validated and no secret-like content detected by scaffold patterns.
- Safe CLI smoke passed: `node bin/bros.mjs doctor`, `node bin/bros.mjs snippet`, and `node bin/bros.mjs list-assets`.
- `npm pack --dry-run` passed and produced a 187-file dry-run surface.
- Additional dry-run JSON check confirmed blocked entries were absent: `packages/` and `scripts/import-assets.mjs` were not present.

## Handoff Notes

- Release tree state still requires maintainer review and commit before any release process continues.
- Real publish remains blocked until separately approved.
