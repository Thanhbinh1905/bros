# Import Report

## Summary

- Total source candidates: 156
- Imported: 112
- Skipped: 3
- Removed after approved deletion: 41

## Counts by Area

- agents: candidates=9, imported=9, skipped=0
- commands: candidates=5, imported=5, skipped=0
- skills: candidates=131, imported=87, skipped=3, removed-after-approved-deletion=41
- docs: candidates=2, imported=2, skipped=0
- templates: candidates=9, imported=9, skipped=0

## Skipped Items

- area: skills; source: `skills/api-design/SKILL.md`; reason: secret-like-pattern-detected
- area: skills; source: `skills/frontend-a11y/SKILL.md`; reason: secret-like-pattern-detected
- area: skills; source: `skills/security-review/SKILL.md`; reason: secret-like-pattern-detected

## Removed Items

These 41 skill-associated candidates were intentionally removed by user-approved cleanup and are not packaged. They are counted separately from `skipped` because they are deleted package-side artifacts, not raw source skills awaiting sanitized review.

- removed area: skills; path: `assets/opencode/skills/api-design/.openskills.json`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/api-design/agents/openai.yaml`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/security-review/.openskills.json`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/security-review/agents/openai.yaml`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/security-review/cloud-infrastructure-security.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/vite-patterns/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/springboot-verification/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/springboot-verification/.openskills.json`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/springboot-tdd/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/springboot-tdd/.openskills.json`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/springboot-patterns/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/springboot-patterns/.openskills.json`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/rust-testing/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/rust-testing/.openskills.json`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/rust-patterns/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/rust-patterns/.openskills.json`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/python-patterns/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/python-patterns/.openskills.json`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/python-testing/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/python-testing/.openskills.json`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/redis-patterns/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/postgres-patterns/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/postgres-patterns/.openskills.json`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/prisma-patterns/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/nextjs-turbopack/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/nextjs-turbopack/.openskills.json`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/nextjs-turbopack/agents/openai.yaml`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/nestjs-patterns/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/nestjs-patterns/.openskills.json`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/mysql-patterns/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/jpa-patterns/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/jpa-patterns/.openskills.json`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/java-coding-standards/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/java-coding-standards/.openskills.json`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/golang-testing/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/golang-testing/.openskills.json`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/golang-patterns/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/golang-patterns/.openskills.json`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/coding-standards/SKILL.md`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/coding-standards/.openskills.json`; disposition: removed-after-approved-deletion
- removed area: skills; path: `assets/opencode/skills/coding-standards/agents/openai.yaml`; disposition: removed-after-approved-deletion

## Follow-up

The three skipped raw skill files remain intentionally excluded until a separate sanitized review/import follow-up approves safe public content. The 41 removed skill-associated package artifacts remain intentionally absent after user-approved deletion. Imported, skipped, and removed-after-approved-deletion counts reconcile the 156 source candidates as of the manifest generated timestamp.

## Lifecycle Governance

- Packaged skills are treated as `active` by default unless explicitly listed in `assets/skills.lifecycle.json` overrides.
- The three skipped skill sources are listed in `assets/skills.lifecycle.json` as `blocked` with `reviewStatus=required` and must not enter packaged assets without sanitized review, redaction/replacement/removal decision, and updated lifecycle metadata.
- The five removed skill-associated candidates are listed in `assets/skills.lifecycle.json` under `removedSources` with `importDisposition=removed-after-approved-deletion`; they are not active, skipped, blocked, or packaged lifecycle entries.
- `npm run validate` release-gates consistency between `assets/manifest.json`, this import report, and `assets/skills.lifecycle.json`.
- Future governance lane: add overlap and maintenance-burden scoring for active skills so duplicative or stale skills can be deprecated through a reviewed lifecycle change.
