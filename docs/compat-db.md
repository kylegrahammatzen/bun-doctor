# Compatibility DB Schema

The compatibility database powers dependency-level findings. Entries must be conservative, sourced, and reviewable.

```ts
interface CompatEntry {
  packageName: string;
  severity: "blocker" | "risk" | "migration" | "win";
  confidence: "high" | "medium" | "low";
  reason: string;
  sources: string[];
  lastVerified: string;
  affectedRanges?: string[];
  bunVersions?: string[];
  platforms?: Array<"darwin" | "linux" | "win32" | "all">;
  replacement?: string;
  workaround?: string;
  migrationHint?: string;
  requiresTrustedDependency?: boolean;
}
```

## Required fields

- `packageName` — the npm package name as it appears in dependencies.
- `severity` — the lowest severity that remains truthful. Wins must never reduce the score.
- `confidence` — how sure we are of the claim, independent of how recently it was verified.
- `reason` — one sentence. Explains the compatibility claim without prescribing action.
- `sources` — at least one verifiable URL. Bun docs, GitHub issues, or test fixtures only. No source, no entry.
- `lastVerified` — ISO date the claim was last checked against current Bun. Refreshed by the v1.0 eval harness.

## Optional fields (omitted = applies everywhere)

- `affectedRanges` — semver ranges the entry applies to. Omit when the entry applies to all published versions.
- `bunVersions` — Bun version ranges the entry applies to. Omit when the entry applies to all current Bun versions.
- `platforms` — OS/arch list the entry applies to. Omit when the entry applies to all supported platforms.

These three fields are reserved for when the eval harness produces version- and platform-specific data. The MVP rule pack omits them and matches on package name alone. Adding a value implies the eval harness has data narrower than "everywhere."

## Style fields

- `replacement` — the Bun-native alternative. One short noun phrase (`bun:sqlite`, `global fetch`, `Bun.password`).
- `workaround` — one sentence. Used when the package must stay; describes the mitigation.
- `migrationHint` — one sentence. Used when migration is straightforward; describes the change.
- `requiresTrustedDependency` — true when the package's install steps depend on lifecycle scripts Bun skips by default.

## Severity decision rules

- `blocker` — the package will fail under Bun or in Bun CI without a workaround.
- `risk` — the package generally works but has lifecycle, platform, or compatibility caveats.
- `migration` — the package itself is fine, but repo/config drift means migration work is needed (e.g. `pnpm-workspace.yaml` without a `package.json` workspaces entry). Most package-level entries are not `migration`.
- `win` — the package is fine and a Bun-native alternative exists. Wins never penalize the score.

Default to `win` for "Bun has a native equivalent." Default to `risk` for "lifecycle scripts matter." Reserve `blocker` for documented incompatibility.
