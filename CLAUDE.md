# CLAUDE.md

Bun-readiness scanner for Node-to-Bun migrations. CLI + JSON + 0-100 score.

## Commands

- `bun run check` — typecheck + test + build (run before commits)
- `bun test` — tests
- `bun run build` — tsdown to `dist/`
- `bun run docs:refresh` — regenerate `src/bun-docs.ts` from `https://bun.sh/llms.txt`
- `bun run version:sync` — copy `package.json#version` into `skills/bun-doctor/SKILL.md`

## Layout

- `src/scan.ts` — orchestrates `discoverProject` → rules → score → dedup
- `src/project.ts` — discovery: manifests (workspace-aware globs with `!` negation), lockfiles, workflows, bunfig (real TOML via `smol-toml`), tsconfig, pnpm-workspace.yaml
- `src/rules.ts` — `runPackageRules` + `runCodeRules`; compat loop with rule-level win dedup
- `src/compat-db.ts` — hand-curated npm package compat entries
- `src/bun-docs.ts` — **generated; never hand-edit**
- `src/report.ts` — colored text (picocolors) + JSON formatters
- `src/score.ts` — penalty math
- `src/types.ts` — all interfaces (no per-feature type files)
- `scripts/refresh-bun-docs.ts`, `scripts/sync-skill-version.ts` — maintenance
- `tests/scan.test.ts` + `tests/fixtures/<name>/` — bun:test

## Code style

- Arrow functions over `function`; kebab-case filenames; interfaces over types
- Descriptive variable names — `shouldRunPackageChecks` not `run`, `splitWorkspaceGlobs` not `globs`
- Comments only when the *why* is non-obvious; never for *what*
- Constants `SCREAMING_SNAKE_CASE` (`BUN_DOCS`, `COMPAT_DB`, `LAST_VERIFIED`)
- `reason`, `message`, `migrationHint`, `workaround`, `help` are **one sentence each**
- Every rule and compat entry MUST have at least one source URL — `createDiagnostic` throws otherwise

## Severity model

- `blocker` (12 pts) — will fail under Bun
- `risk` (5 pts) — may fail; lifecycle, native, or platform-sensitive
- `migration` (2 pts) — repo/config drift needed for a clean migration
- `win` (0 pts) — Bun has a native alternative; the package still works

Win entries collapse across manifests at the rule level (one finding with `Also in:`). Non-win rules fire per location and scan-level dedup (`collapseDuplicateRules` in `scan.ts`) merges any same-ruleId duplicates.

## Adding a compat entry

Schema in [docs/compat-db.md](docs/compat-db.md). Lead with `reason` (one sentence). At least one URL in `sources` from `BUN_DOCS.<key>`. Default to `win` when Bun has a native equivalent, `risk` for lifecycle/native concerns. Set `requiresTrustedDependency: true` if installs depend on lifecycle scripts — the compat loop auto-merges the trust-gap message into `help` when the package is not in `trustedDependencies`.

## Adding a Bun docs URL

Edit `DOC_SLUGS` in `scripts/refresh-bun-docs.ts`, then `bun run docs:refresh`. The script verifies the slug exists in Bun's llms.txt and regenerates `src/bun-docs.ts`.

## Versioning

`package.json#version` and `skills/bun-doctor/SKILL.md` frontmatter must match. Bump `package.json`, then `bun run version:sync`, then commit both. `prepack` runs the sync automatically as a safety net.

## Commits

Lowercase conventional (`feat:`, `chore:`, `docs:`, `test:`, `ci:`). Single line. No body. No bullets, lists, or emojis. No `Co-Authored-By`. Group similar files into one commit.
