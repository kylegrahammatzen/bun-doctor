import path from "node:path";
import pc from "picocolors";
import type { Diagnostic, FindingCategory, ScanResult } from "./types.js";
import { toRelativePath } from "./utils.js";

const CATEGORY_ORDER: FindingCategory[] = ["Blockers", "Risks", "Migration work", "Bun wins"];

const CATEGORY_TITLE: Record<FindingCategory, string> = {
  "Blockers": "Blockers",
  "Risks": "Risks",
  "Migration work": "Migration tasks",
  "Bun wins": "Optional wins",
};

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

interface LocationLike {
  filePath: string;
  line?: number;
}

interface TextReportOptions {
  verbose: boolean;
  showWins: boolean;
}

const groupByCategory = (diagnostics: Diagnostic[]): Map<FindingCategory, Diagnostic[]> => {
  const groups = new Map<FindingCategory, Diagnostic[]>();
  for (const diagnostic of diagnostics) {
    const existing = groups.get(diagnostic.category) ?? [];
    existing.push(diagnostic);
    groups.set(diagnostic.category, existing);
  }
  return groups;
};

const formatLocation = (location: LocationLike, rootDirectory: string): string => {
  const relative = toRelativePath(path.resolve(location.filePath), rootDirectory);
  return location.line && location.line > 1 ? `${relative}:${location.line}` : relative;
};

const formatWinSummary = (diagnostics: Diagnostic[]): string => {
  const names = diagnostics
    .map((diagnostic) => diagnostic.packageName ?? diagnostic.title.replace(/ compatibility note$/, ""))
    .slice(0, 5);
  const suffix = diagnostics.length > names.length ? ", ..." : "";
  return `${diagnostics.length} optional Bun-native simplifications found: ${names.join(", ")}${suffix}`;
};

export const formatTextReport = (result: ScanResult, options: TextReportOptions): string => {
  const lines: string[] = [];
  const scoreColor = SCORE_COLOR[result.score.label];
  lines.push(pc.bold("bun-doctor"));
  const projectLine = [`${pc.dim("Project:")} ${result.project.packageName}`];
  if (result.project.gitRepositoryUrl) projectLine.push(`${pc.dim("Repo:")} ${result.project.gitRepositoryUrl}`);
  lines.push(projectLine.join("  "));
  if (result.project.gitUpstreamUrl && result.project.gitUpstreamUrl !== result.project.gitRepositoryUrl) {
    lines.push(`${pc.dim("Upstream:")} ${result.project.gitUpstreamUrl}`);
  }
  lines.push(`${pc.dim("Status:")} ${scoreColor(pc.bold(result.score.label))}`);
  lines.push(`${pc.dim("Score:")} ${scoreColor(pc.bold(`${result.score.score}/100`))}`);
  const colorCount = (count: number, color: (input: string) => string, label: string): string =>
    count === 0 ? pc.dim(`${count} ${label}`) : color(`${count} ${label}`);
  lines.push(
    `${pc.dim("Summary:")} ${colorCount(result.summary.blockers, pc.red, "blockers")}, ${colorCount(result.summary.risks, pc.yellow, "risks")}, ${colorCount(result.summary.migrations, pc.cyan, "tasks")}, ${colorCount(result.summary.wins, pc.green, "optional wins")}`,
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
    lines.push(pc.bold(categoryColor(`${CATEGORY_TITLE[category]} (${diagnostics.length})`)));
    if (category === "Bun wins" && !options.verbose && !options.showWins) {
      lines.push(`  ${pc.dim(formatWinSummary(diagnostics))}`);
      lines.push(`  ${pc.dim("Run with --wins to review optional wins.")}`);
      lines.push("");
      continue;
    }
    const shownDiagnostics = options.verbose ? diagnostics : diagnostics.slice(0, 3);
    for (const diagnostic of shownDiagnostics) {
      const symbol = LEVEL_COLOR[diagnostic.level](LEVEL_SYMBOL[diagnostic.level]);
      lines.push(`  ${symbol} ${pc.bold(diagnostic.title)} ${pc.dim(`[${diagnostic.ruleId}]`)}`);
      lines.push(`    ${diagnostic.message}`);
      if (diagnostic.replacement) lines.push(`    ${pc.dim("Use")} ${pc.green(diagnostic.replacement)}`);
      if (diagnostic.help) lines.push(`    ${pc.dim(diagnostic.help)}`);
      lines.push(`    ${pc.cyan(formatLocation(diagnostic, result.project.rootDirectory))}`);
      if (diagnostic.alsoIn && diagnostic.alsoIn.length > 0) {
        if (options.verbose) {
          const aggregated = diagnostic.alsoIn
            .map((alsoLocation) => formatLocation(alsoLocation, result.project.rootDirectory))
            .join(", ");
          lines.push(`    ${pc.dim(`Repeated in: ${aggregated}`)}`);
        } else {
          const locationLabel = diagnostic.alsoIn.length === 1 ? "location" : "locations";
          lines.push(`    ${pc.dim(`Repeated in ${diagnostic.alsoIn.length} more ${locationLabel}`)}`);
        }
      }
      if (options.verbose || diagnostic.level === "blocker" || diagnostic.level === "risk") {
        lines.push(`    ${pc.dim(`Docs: ${diagnostic.sources[0]}`)}`);
      }
    }
    if (!options.verbose && diagnostics.length > shownDiagnostics.length) {
      const hidden = diagnostics.length - shownDiagnostics.length;
      lines.push(`  ${pc.dim(`${hidden} more hidden. Run with --verbose to show all findings.`)}`);
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
    gitRepositoryUrl: result.project.gitRepositoryUrl,
    gitUpstreamUrl: result.project.gitUpstreamUrl,
    lockfiles: result.project.lockfiles,
    legacyLockfiles: result.project.legacyLockfiles,
  },
  diagnostics: result.diagnostics,
});
