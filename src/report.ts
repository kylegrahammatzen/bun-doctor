import path from "node:path";
import pc from "picocolors";
import type { Diagnostic, FindingCategory, ScanResult } from "./types.js";
import { toRelativePath } from "./utils.js";

const CATEGORY_ORDER: FindingCategory[] = ["Blockers", "Risks", "Migration work", "Bun wins"];

const LEVEL_SYMBOL: Record<Diagnostic["level"], string> = {
  blocker: "x",
  risk: "!",
  migration: "~",
  win: "+",
};

const LEVEL_COLOR: Record<Diagnostic["level"], (input: string) => string> = {
  blocker: pc.red,
  risk: pc.yellow,
  migration: pc.cyan,
  win: pc.green,
};

const SCORE_COLOR: Record<ScanResult["score"]["label"], (input: string) => string> = {
  Ready: pc.green,
  Close: pc.yellow,
  Risky: pc.magenta,
  Blocked: pc.red,
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
  return diagnostic.line > 1 ? `${relativePath}:${diagnostic.line}` : relativePath;
};

export const formatTextReport = (result: ScanResult, verbose: boolean): string => {
  const lines: string[] = [];
  const scoreColor = SCORE_COLOR[result.score.label];
  lines.push(pc.bold("bun-doctor"));
  lines.push(`${pc.dim("Project:")} ${result.project.packageName}`);
  lines.push(
    `${pc.dim("Bun Readiness:")} ${scoreColor(pc.bold(`${result.score.score}/100`))} ${pc.dim(`(${result.score.label})`)}`,
  );
  const colorCount = (count: number, color: (input: string) => string, label: string): string =>
    count === 0 ? pc.dim(`${count} ${label}`) : color(`${count} ${label}`);
  lines.push(
    `${pc.dim("Findings:")} ${colorCount(result.summary.blockers, pc.red, "blockers")}, ${colorCount(result.summary.risks, pc.yellow, "risks")}, ${colorCount(result.summary.migrations, pc.cyan, "migration")}, ${colorCount(result.summary.wins, pc.green, "wins")}`,
  );
  lines.push("");

  if (result.diagnostics.length === 0) {
    lines.push(pc.green("No Bun migration findings."));
    return lines.join("\n");
  }

  const groups = groupByCategory(result.diagnostics);
  for (const category of CATEGORY_ORDER) {
    const diagnostics = groups.get(category) ?? [];
    if (diagnostics.length === 0) continue;
    const firstLevel = diagnostics[0]?.level;
    const categoryColor = firstLevel ? LEVEL_COLOR[firstLevel] : pc.white;
    lines.push(pc.bold(categoryColor(`${category} (${diagnostics.length})`)));
    const shownDiagnostics = verbose ? diagnostics : diagnostics.slice(0, 3);
    for (const diagnostic of shownDiagnostics) {
      const symbol = LEVEL_COLOR[diagnostic.level](LEVEL_SYMBOL[diagnostic.level]);
      lines.push(`  ${symbol} ${pc.bold(diagnostic.title)} ${pc.dim(`[${diagnostic.ruleId}]`)}`);
      lines.push(`    ${diagnostic.message}`);
      if (diagnostic.replacement) lines.push(`    ${pc.dim("Use")} ${pc.green(diagnostic.replacement)}`);
      if (diagnostic.help) lines.push(`    ${pc.dim(diagnostic.help)}`);
      lines.push(`    ${pc.cyan(formatLocation(diagnostic, result.project.rootDirectory))}`);
      if (diagnostic.alsoIn && diagnostic.alsoIn.length > 0) {
        const aggregated = diagnostic.alsoIn
          .map((alsoLocation) => {
            const relative = toRelativePath(path.resolve(alsoLocation.filePath), result.project.rootDirectory);
            return alsoLocation.line && alsoLocation.line > 1 ? `${relative}:${alsoLocation.line}` : relative;
          })
          .join(", ");
        lines.push(`    ${pc.dim(`Also in: ${aggregated}`)}`);
      }
      lines.push(`    ${pc.dim(`Source: ${diagnostic.sources[0]}`)}`);
    }
    if (!verbose && diagnostics.length > shownDiagnostics.length) {
      const hidden = diagnostics.length - shownDiagnostics.length;
      lines.push(`  ${pc.dim(`... ${hidden} more — re-run with --verbose`)}`);
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
