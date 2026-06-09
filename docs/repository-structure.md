# Repository Structure

```text
assets/opencode/        Curated OpenCode assets
bin/                    Executable CLI shim
docs/                   User and maintainer documentation
docs/instruction-system/ Instruction routing, canonical-source, packet-schema, safety, retrieval, and migration references
examples/opencode/      Placeholder-only OpenCode examples
packages/adapter-sdk/   Future adapter interfaces
packages/cli/           CLI TypeScript source skeleton
packages/manifest/      Manifest schema and validation helpers
packages/opencode-plugin/ OpenCode plugin skeleton
scripts/                Dependency-free validation scripts
```

Session records are stored under `.bros/` as private working records and are not included in the npm package allowlist. If a session-derived artifact must become public, create a sanitized copy in an approved docs path, redact sensitive material, and label historical claims as non-authoritative unless fresh cited inspection confirms them.
