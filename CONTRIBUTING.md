# Contributing

Thanks for helping improve BROS Harness.

## Development principles

- Keep OpenCode support working before adding other adapters.
- Avoid copying private local configuration into the repository.
- Prefer dependency-free validation where practical.
- Document security-sensitive changes and request review before release.

## Local checks

```bash
npm run validate
```

The scaffold currently does not require dependency installation.

## Maintainer-only asset import

Asset import refreshes curated repository assets and can write under the repository asset tree. It is maintainer-only source maintenance, not a package install command, and is excluded from the published package surface. Use import tooling only under an approved asset import task with the required maintainer opt-in, then follow with validation and security review.
