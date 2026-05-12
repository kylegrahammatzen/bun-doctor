# Bun Doctor

Diagnose Node-to-Bun migration readiness for JavaScript and TypeScript projects.

`bun-doctor` answers one question:

> Can this repo safely move to Bun, and what exact changes get it there?

It scans package manager state, lockfiles, Bun config, TypeScript config, CI workflows, dependency risk, and a first pass of Bun-specific code risks. The output is a 0-100 Bun Readiness score grouped into Blockers, Risks, Migration work, and Bun wins.

## Usage

```bash
npx -y bun-doctor@latest .
```

Local development from this repo:

```bash
bun install
bun run build
node dist/cli.mjs . --verbose
```

## CLI

```txt
Usage: bun-doctor [directory] [options]

Options:
  --json                  output a structured JSON report
  --score                 output only the numeric score
  --verbose               show every diagnostic
  --no-package            skip package/config/dependency checks
  --no-code               skip source code checks
  --fail-on <level>       exit non-zero on blocker, risk, migration, or none
  -v, --version           print version
  -h, --help              print help

Commands:
  bun-doctor install      install the bun-doctor agent skill
```

## Scoring

The score starts at 100 and subtracts for unique triggered rules:

- Blocker: 12 points
- Risk: 5 points
- Migration work: 2 points
- Bun win: 0 points

Bun wins are shown as opportunities but do not lower readiness.

## Rule Sources

Every diagnostic has at least one verifiable source: Bun docs, compatibility docs, or an issue/test link in the compatibility database. No source means no rule.

## Roadmap

- MVP: CLI, JSON, score, config/package rules, code-risk scans, compatibility DB v0.
- v1.0: public eval harness that verifies compatibility DB entries across Bun versions and platforms.
- Later: editor/linter plugin once rules prove useful in real migrations.
