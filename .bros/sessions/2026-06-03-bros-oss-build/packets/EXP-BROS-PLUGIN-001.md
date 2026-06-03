# Explorer Evidence Packet

## Summary

This packet records sanitized exploration evidence for the package-first OpenCode plugin remediation. It summarizes public plugin and installer patterns, the relevant BROS repository gaps, and the implementation constraints for a safe package surface. No secrets, credentials, raw provider settings, or local absolute private paths are included.

## Scope

- Compare a reference OpenCode package plugin pattern with the BROS package-first implementation needs.
- Identify which behaviors are safe for runtime plugin loading and which behaviors require explicit user approval or separate gates.
- Confirm the BROS gap that required remediation: missing persisted evidence, ambiguous hook policy wording, and mutating contributor tooling exposed through the package allowlist.

## Evidence Summary

### Reference Package Plugin Pattern

- A package plugin can expose a root package entrypoint and be enabled with an OpenCode config plugin entry such as `plugin: ["package-name"]`.
- OpenCode plugins can return a `config(cfg)` hook that receives the merged runtime config object during startup.
- The hook can augment runtime config in memory, but this must be narrowly documented when used by an installable package.

### Installer and Config Write Pattern

- Some reference installers guide users or scripts to write OpenCode config entries during setup.
- For BROS, live user config file mutation remains disallowed by default. Adding the package plugin snippet to a user config is a separate explicit user-approved action, not a runtime plugin side effect.
- The BROS runtime plugin must not write `opencode.json`, `.opencode/`, global OpenCode config, or other filesystem config files.

### Package-Carried Assets

- A package-first plugin can carry reviewed assets such as commands, skills, docs, templates, and agent files under package-relative asset directories.
- BROS assets are expected to be resolved relative to the package root rather than copied from private local configuration.
- Skipped raw skills remain excluded unless a later approved task reviews and imports sanitized versions.

### Agent-Friendly Documentation

- Package install guidance should give agents a narrow instruction: add only the package plugin snippet, avoid provider/MCP/permission/telemetry/secret surfaces, show proposed config diffs, and ask before writing user config.
- Documentation should distinguish repository maintainer tooling from package install or runtime behavior.

### BROS Inert Plugin Gap

- Before plugin-first restructuring, BROS assets were present as inert repository/package content without a root package plugin entrypoint that OpenCode could load directly through the package snippet.
- The remediation path keeps the plugin active only for reviewed low-risk additions: package-relative `skills.paths` and non-overwriting command prompt entries.

## Key Findings

1. A package plugin entrypoint and runtime config hook are appropriate for making package-carried skills and commands discoverable without copying local development folders.
2. The allowed hook behavior must be explicit: in-memory `config(cfg)` additions only, package-relative skills path only, command entries only when not already defined.
3. Runtime plugin behavior must not register providers, MCP servers, permissions, telemetry, secrets, or write live user config files.
4. Mutating contributor import tooling should remain repository-only and should not be included in the published package tarball.
5. Read-only validation tooling may remain available for repository development and package verification if it does not mutate files.

## Security Notes

- No secret values, credential checks, provider settings, MCP configuration, permission grants, telemetry configuration, or raw local OpenCode config are recorded here.
- No local absolute private paths are recorded here.
- The evidence supports a narrow package plugin policy and does not approve broader runtime mutation.

## Handoff

- QA should verify this packet exists under the session packet directory and uses neutral headings only.
- Security should verify docs and package metadata enforce the narrow in-memory hook policy and exclude mutating import tooling from the publish surface.
