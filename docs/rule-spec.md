# Bun Doctor Rule Spec

## Product Frame

`bun-doctor` is a Bun-readiness scanner for Node-to-Bun migrations. It is not a generic code-style linter.

The primary output is a 0-100 Bun Readiness score with findings grouped by user intent:

- Blockers: likely to fail under Bun or in Bun-based CI.
- Risks: likely to work in common cases, but affected by unsupported Node APIs, platform differences, native packages, or lifecycle behavior.
- Migration work: repo/config/tooling changes needed for a clean Bun migration.
- Bun wins: optional simplifications or performance improvements. These never reduce the score.

## Severity Model

| Level | Score penalty | Use when |
| --- | ---: | --- |
| `blocker` | 12 | The repo is likely to break under Bun or Bun CI. |
| `risk` | 5 | The repo may work, but uses unsupported or compatibility-sensitive behavior. |
| `migration` | 2 | The repo has incomplete Bun migration state or avoidable toolchain drift. |
| `win` | 0 | Bun has a native replacement or simplification, but current code can still be valid. |

The score counts unique triggered rules, not every occurrence. Fixing 49 of 50 occurrences of one rule should not change the score until the rule is fully resolved.

## Source Requirement

Every rule and compatibility DB entry must include at least one verifiable source:

- Bun documentation page.
- Bun compatibility documentation.
- Public GitHub issue or upstream issue.
- A repository test fixture or eval harness result.

No source, no diagnostic. This keeps false positives under control and makes each finding auditable.

## MVP Rule Split

The first rule pack should stay around 20 high-confidence rules:

- Around 12 package/config/dependency/CI rules.
- Around 8 source-code risk rules.

Package/config rules carry most early migration value. Code rules exist to prove the scanner sees real runtime risk, but should stay conservative until the eval harness exists.

## v1.0 Eval Harness

The compatibility database is the project moat. It must be backed by a public eval harness for v1.0.

The harness should:

- Install packages across Bun versions.
- Run package-specific smoke tests.
- Test relevant OS/platform combinations.
- Emit machine-readable results used to update `lastVerified` and `confidence`.
- Link findings back to test cases from the compatibility DB.

MVP can ship before the harness, but schema and docs should assume it from day one.
