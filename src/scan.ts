import { loadConfig, filterIgnoredDiagnostics } from "./config.js";
import { discoverProject } from "./project.js";
import { runCodeRules, runPackageRules } from "./rules.js";
import { calculateScore, summarizeDiagnostics } from "./score.js";
import type { Diagnostic, ScanOptions, ScanResult } from "./types.js";

const collapseDuplicateRules = (diagnostics: Diagnostic[]): Diagnostic[] => {
  const seenByRuleId = new Map<string, Diagnostic>();
  for (const diagnostic of diagnostics) {
    const existing = seenByRuleId.get(diagnostic.ruleId);
    if (!existing) {
      seenByRuleId.set(diagnostic.ruleId, diagnostic);
      continue;
    }
    seenByRuleId.set(diagnostic.ruleId, {
      ...existing,
      alsoIn: [...(existing.alsoIn ?? []), { filePath: diagnostic.filePath, line: diagnostic.line }],
    });
  }
  return [...seenByRuleId.values()];
};

export const scan = async (directory: string, options: ScanOptions = {}): Promise<ScanResult> => {
  const project = discoverProject(directory);
  const loadedConfig = options.configOverride ?? loadConfig(project.rootDirectory, project.packageJson);
  const shouldRunPackageChecks = options.packageChecks ?? loadedConfig.package ?? true;
  const shouldRunCodeChecks = options.codeChecks ?? loadedConfig.code ?? true;

  const rawDiagnostics = [
    ...(shouldRunPackageChecks ? runPackageRules(project) : []),
    ...(shouldRunCodeChecks ? runCodeRules(project) : []),
  ];
  const collapsedDiagnostics = collapseDuplicateRules(rawDiagnostics);
  const filteredDiagnostics = filterIgnoredDiagnostics(
    collapsedDiagnostics,
    loadedConfig,
    project.rootDirectory,
  );

  return {
    project,
    diagnostics: filteredDiagnostics,
    score: calculateScore(filteredDiagnostics),
    summary: summarizeDiagnostics(filteredDiagnostics),
  };
};
