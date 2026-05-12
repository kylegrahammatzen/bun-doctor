import path from "node:path";
import type { Diagnostic, FindingCategory, ScanResult } from "./types.js";
import { toRelativePath } from "./utils.js";

const CATEGORY_ORDER: FindingCategory[] = ["Blockers", "Risks", "Migration work", "Bun wins"];

const LEVEL_SYMBOL: Record<Diagnostic["level"], string> = {
  blocker: "x",
  risk: "!",
  migration: "~",
  win: "+",
};

const groupByCategory = (diagnostics: Diagnostic[]): Map<FindingCategory, Diagnostic[]> => {
  const groups = new Map<FindingCategory, Diagnostic[]>();
  for (const diagnostic of diagnostics) {
    const existing = groups.get(diagnostic.category) ?? [];
    existing.push(diagnostic);
    groups.set(diagnostic.category, existing);
  }
  return groups;
};

const formatLocation = (diagnostic: Diagnostic, rootDirectory: string): string => {
  const relativePath = toRelativePath(path.resolve(diagnostic.filePath), rootDirectory);
  return diagnostic.line > 0 ? `${relativePath}:${diagnostic.line}` : relativePath;
};

export const formatTextReport = (result: ScanResult, verbose: boolean): string => {
  const lines: string[] = [];
  lines.push(`bun-doctor`);
  lines.push(`Project: ${result.project.packageName}`);
  lines.push(`Bun Readiness: ${result.score.score}/100 (${result.score.label})`);
  lines.push(
    `Findings: ${result.summary.blockers} blockers, ${result.summary.risks} risks, ${result.summary.migrations} migration, ${result.summary.wins} wins`,
  );
  lines.push("");

  if (result.diagnostics.length === 0) {
    lines.push("No Bun migration findings.");
    return lines.join("\n");
  }

  const groups = groupByCategory(result.diagnostics);
  for (const category of CATEGORY_ORDER) {
    const diagnostics = groups.get(category) ?? [];
    if (diagnostics.length === 0) continue;
    lines.push(`${category} (${diagnostics.length})`);
    const shownDiagnostics = verbose ? diagnostics : diagnostics.slice(0, 3);
    for (const diagnostic of shownDiagnostics) {
      lines.push(`  ${LEVEL_SYMBOL[diagnostic.level]} ${diagnostic.title} [${diagnostic.ruleId}]`);
      lines.push(`    ${diagnostic.message}`);
      if (diagnostic.help) lines.push(`    ${diagnostic.help}`);
      lines.push(`    ${formatLocation(diagnostic, result.project.rootDirectory)}`);
      lines.push(`    Source: ${diagnostic.sources[0]}`);
    }
    if (!verbose && diagnostics.length > shownDiagnostics.length) {
      lines.push(`  ... ${diagnostics.length - shownDiagnostics.length} more. Re-run with --verbose.`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
};

export const toJsonReport = (result: ScanResult): object => ({
  schemaVersion: 1,
  ok: true,
  score: result.score,
  summary: result.summary,
  project: {
    name: result.project.packageName,
    rootDirectory: result.project.rootDirectory,
    packageJsonPath: result.project.packageJsonPath,
    lockfiles: result.project.lockfiles,
    legacyLockfiles: result.project.legacyLockfiles,
  },
  diagnostics: result.diagnostics,
});
