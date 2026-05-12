---
name: bun-doctor
description: Use after making dependency, CI, package manager, test runner, or Node runtime changes in a project that uses or is migrating to Bun. Checks Bun readiness and migration risk.
version: "0.0.5"
---

# Bun Doctor

Scans JavaScript and TypeScript projects for Bun migration readiness. Outputs a 0-100 Bun Readiness score.

## After migration-related changes

Run `npx -y bun-doctor@latest . --verbose` and check for blockers first, then risks.

## Before switching CI to Bun

Run `npx -y bun-doctor@latest . --verbose --fail-on blocker`.

## Command

```bash
npx -y bun-doctor@latest . --verbose
```

| Flag | Purpose |
| --- | --- |
| `.` | Scan current directory |
| `--verbose` | Show every diagnostic |
| `--score` | Output only the numeric score |
| `--json` | Output structured JSON |
