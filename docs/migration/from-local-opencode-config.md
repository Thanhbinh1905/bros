# Migrating From Local OpenCode Configuration

Do not copy raw local OpenCode configuration into this repository. Local config files can include provider keys, private endpoints, MCP credentials, or other sensitive values.

Recommended migration approach:

1. Inventory local agents, commands, skills, templates, and docs only.
2. Exclude `opencode.json`, `opencode.jsonc`, `.env*`, logs, caches, package artifacts, and shell history.
3. Replace any local-only values with placeholders before committing examples.
4. Run `npm run validate` before review.
