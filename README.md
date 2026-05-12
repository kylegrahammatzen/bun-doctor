# Bun Doctor

[![version](https://img.shields.io/npm/v/bun-doctor?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/bun-doctor)
[![downloads](https://img.shields.io/npm/dt/bun-doctor.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/bun-doctor)

Scan a Node.js project to see how ready it is to move to Bun.

Inspired by [React Doctor](https://github.com/millionco/react-doctor) by Million Software, Inc.

```bash
npx -y bun-doctor@latest .
```

You get a 0-100 readiness score and a grouped list of Blockers, Risks, Migration tasks, and Optional wins. The scanner inspects package manager state, lockfiles, `bunfig.toml`, `tsconfig.json`, GitHub Actions workflows, dependency compatibility, and Bun-specific code risks.

## CLI

```txt
Usage: bun-doctor [directory] [options]

Options:
  --json                  output a structured JSON report
  --score                 output only the numeric score
  --verbose               show every diagnostic
  --wins                  show all optional Bun-native wins
  --no-package            skip package/config/dependency checks
  --no-code               skip source code checks
  --fail-on <level>       exit non-zero on blocker, risk, migration, or none
  -v, --version           print version
  -h, --help              print help

Commands:
  bun-doctor install      install the bun-doctor agent skill
```

## Scoring

Each unique rule triggered subtracts from a starting score of 100:

| Level | Penalty |
| --- | ---: |
| Blocker | 12 |
| Risk | 5 |
| Migration | 2 |
| Win | 0 |

Wins are surfaced as optional Bun-native simplifications and never lower the score.

## GitHub Action

Drop this into `.github/workflows/bun-doctor.yml`:

```yaml
name: Bun Doctor
on:
  pull_request:
  push:
    branches: [main]
jobs:
  bun-doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: kylegrahammatzen/bun-doctor@main
```

## Sources

Every diagnostic and compatibility entry carries at least one verifiable source: Bun documentation, the Node compatibility table, or an issue/test link. No source, no rule.

## Roadmap

- MVP: CLI, JSON, score, package/config rules, code-risk scans, compatibility DB v0.
- v1.0: public eval harness that verifies compatibility entries across Bun versions and platforms ([docs/eval-harness.md](docs/eval-harness.md)).
- Later: editor/linter plugin once rules prove useful in real migrations.
