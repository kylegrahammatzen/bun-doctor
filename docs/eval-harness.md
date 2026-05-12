# Compatibility Eval Harness (v1.0)

The compatibility database is the project moat. Without a freshness story it rots in six months. The eval harness is what keeps it honest.

This document describes the v1.0 design. The MVP ships before the harness exists; the schema is built to accept harness output from day one.

## Goal

Given the current compat DB, produce a machine-readable report that answers, for each entry:

- Does the claim still hold against the current Bun release?
- Does it hold across the platforms the entry covers?
- When was it last verified?

The report updates `lastVerified`, may adjust `confidence`, and surfaces drift as PRs.

## Test matrix

Three axes:

- **Bun version** — the latest stable Bun release plus the previous minor. Two versions, run as separate jobs.
- **Platform** — linux/x64, linux/arm64, darwin/arm64, win32/x64. Four platforms via GitHub Actions matrix.
- **Package** — every entry in the compat DB. Each entry declares one or more smoke tests under `harness/packages/<name>/`.

Total jobs: 2 × 4 × |compat-db|. For a 31-entry DB that is 248 jobs at full coverage. Most entries only run a subset of platforms (e.g. Cypress on linux/x64 only); the entry declares its own platform list.

## Smoke test shape

Each package directory contains:

- `package.json` with a single dependency on the target package at a representative version.
- `test.ts` that imports the package and asserts the minimum behavior the entry claims.
- `expected.json` describing the expected outcome (`install: ok | fail`, `runtime: ok | fail | skip`, optional notes).

The harness runs:

1. `bun install --frozen-lockfile=false` (clean install)
2. `bun run test.ts`
3. Compares actual outcome to `expected.json`.

Entries with `requiresTrustedDependency: true` get two runs — one without trustedDependencies (expected to flag the install gap), one with (expected to succeed).

## Output

A single `eval-report.json` per CI run:

```ts
interface EvalReport {
  bunVersion: string;
  ranAt: string;
  results: Array<{
    packageName: string;
    platform: string;
    install: "ok" | "fail";
    runtime: "ok" | "fail" | "skip";
    notes?: string;
    claimHolds: boolean;
  }>;
}
```

A `bun-doctor` script (`scripts/apply-eval-report.ts`) consumes the report:

- Refreshes `lastVerified` for every entry whose claim still holds.
- Downgrades `confidence` for entries with drift on one platform.
- Opens a PR with a generated description listing drift and the failing test outputs.
- Fails the workflow if any entry's claim flips severity.

## Contribution flow

The same harness directory is the contribution surface for new entries:

1. PR adds `harness/packages/<name>/{package.json,test.ts,expected.json}`.
2. PR adds the matching `CompatEntry` to `src/compat-db.ts`.
3. CI runs the new package across the matrix; the PR cannot merge until results are green.

This means a new compat entry cannot land without a real, runnable test. That is the trust signal — every claim is backed by code that ran.

## What ships first

- v0 (MVP, today): DB entries written from Bun docs + community knowledge. `confidence: "high"` is allowed when the upstream behavior is documented and stable; `medium`/`low` when the claim is judgment-call territory.
- v0.5: Harness scaffolding in `harness/` + a handful of seed tests for the highest-risk entries (Prisma, Puppeteer, Playwright, sharp, sqlite3). No CI yet.
- v1.0: Full matrix CI, drift detection, automated PRs. `confidence` and `lastVerified` are no longer hand-maintained.

## Non-goals

- Replacing per-project testing. The harness verifies that the compat claim holds in isolation; project-specific interactions are out of scope.
- Continuous benchmarks. Performance comparisons are useful but live in a separate workflow with separate stability requirements.
- A web-scrapable dashboard. The output is JSON; rendering is somebody else's problem until there is real demand for it.
