# Compatibility DB Schema

The compatibility database powers dependency-level findings. Entries must be conservative, sourced, and reviewable.

```ts
interface CompatEntry {
  packageName: string;
  severity: "blocker" | "risk" | "migration" | "win";
  affectedRanges: string[];
  bunVersions: string[];
  platforms: Array<"darwin" | "linux" | "win32" | "all">;
  confidence: "high" | "medium" | "low";
  reason: string;
  sources: string[];
  lastVerified: string;
  replacement?: string;
  workaround?: string;
  migrationHint?: string;
  requiresTrustedDependency?: boolean;
}
```

## Field Notes

- `sources` is mandatory and must not be empty.
- `severity` should be the lowest severity that remains truthful.
- `win` entries are allowed for optional Bun-native replacements and never reduce the score.
- `workaround` is free text for mitigation when no replacement exists.
- `migrationHint` is structured enough to power future codemods or autofixes.
- `lastVerified` must be refreshed by the v1.0 eval harness.
