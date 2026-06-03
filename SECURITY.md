# Security Policy

## Supported status

This repository is in an initial scaffold stage. OpenCode assets are included for review and follow-up hardening. Publishing requires final security approval.

## Reporting vulnerabilities

Please open a private security advisory or contact the maintainers through the project security channel. Do not include live credentials, API keys, tokens, cookies, or private endpoints in reports.

## Import safety rules

- Raw local `opencode.json` or `opencode.jsonc` files are not part of this package.
- Examples must use placeholders only.
- Validation scripts search for common secret patterns before packaging.
- Release automation must not publish without an explicit final security review.
