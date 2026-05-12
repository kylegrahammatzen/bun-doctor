import { describe, expect, test } from "bun:test";
import path from "node:path";
import { scan } from "../src/scan.ts";

const fixturePath = (name: string): string => path.join(import.meta.dir, "fixtures", name);

describe("scan", () => {
  test("reports a clean Bun project as ready", async () => {
    const result = await scan(fixturePath("clean-bun"));
    expect(result.score.score).toBe(100);
    expect(result.diagnostics).toHaveLength(0);
  });

  test("detects package and code migration findings", async () => {
    const result = await scan(fixturePath("node-risk"));
    const ruleIds = result.diagnostics.map((diagnostic) => diagnostic.ruleId);
    expect(ruleIds).toContain("bun/lockfile-missing");
    expect(ruleIds).toContain("bun/ci-missing-setup-bun");
    expect(ruleIds).toContain("compat/sqlite3");
    expect(ruleIds).toContain("code/node-repl");
    expect(result.score.score).toBeLessThan(100);
  });

  test("scans nested workspace package manifests", async () => {
    const result = await scan(fixturePath("workspace-risk"));
    const sqliteDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.ruleId === "compat/sqlite3",
    );
    expect(sqliteDiagnostic?.filePath.replaceAll("\\", "/")).toContain("apps/api/package.json");
  });

  test("parses nested bunfig.toml sections via real TOML", async () => {
    const result = await scan(fixturePath("bunfig-auto-install"));
    const ruleIds = result.diagnostics.map((diagnostic) => diagnostic.ruleId);
    expect(ruleIds).toContain("bun/auto-install-enabled");
    expect(result.project.bunfig?.installAuto).toBe("fallback");
    expect(result.project.bunfig?.installFrozenLockfile).toBe(false);
    expect(result.project.bunfig?.installSecurityScanner).toBe("@example/scanner");
  });

  test("respects workspace negation globs and ignores out-of-workspace manifests", async () => {
    const result = await scan(fixturePath("workspace-negation"));
    const ruleIds = result.diagnostics.map((diagnostic) => diagnostic.ruleId);

    expect(ruleIds).toContain("compat/sqlite3");
    expect(ruleIds).not.toContain("compat/better-sqlite3");
    expect(ruleIds).not.toContain("compat/node-sass");
  });
});
