# Native OpenCode Agent Installation Guide

This page is retained for older links.

Use the complete installation guide as the source of truth:

[`installation.md`](installation.md)

Agent prompt reference:

```text
Install BROS Harness into OpenCode by fetching and following the full guide step by step:
https://raw.githubusercontent.com/Thanhbinh1905/bros/main/docs/installation.md

Use the package-runner commands from the guide first: bunx bros-harness@latest install or bunx bros-harness@latest update. They pin the OpenCode plugin entry to the current package version by default; `--channel latest` is opt-in.
Use bunx --package bros-harness@latest bros install|update or npx --package bros-harness@latest bros install|update when the direct bunx form is unavailable.
Use OpenCode's older plugin installer, including --force, only as the guide's fallback/troubleshooting path. Do not only paste JSON into opencode.jsonc unless the guide's fallback applies.
Do not edit providers, MCP, permissions, telemetry, secrets, npm publishing, or npm dist-tags.
Restart OpenCode and verify BROS agents after installation.
```
