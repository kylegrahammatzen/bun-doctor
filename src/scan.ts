import { loadConfig, filterIgnoredDiagnostics } from "./config.js";
import { discoverProject } from "./project.js";
import { runCodeRules, runPackageRules } from "./rules.js";
import { calculateScore, summarizeDiagnostics } from "./score.js";
import type { ScanOptions, ScanResult } from "./types.js";

export const scan = async (directory: string, options: ScanOptions = {}): Promise<ScanResult> => {
  const project = discoverProject(directory);
  const loadedConfig = options.configOverride ?? loadConfig(project.rootDirectory, project.packageJson);
  const shouldRunPackageChecks = options.packageChecks ?? loadedConfig.package ?? true;
  const shouldRunCodeChecks = options.codeChecks ?? loadedConfig.code ?? true;

  const diagnostics = [
    ...(shouldRunPackageChecks ? runPackageRules(project) : []),
    ...(shouldRunCodeChecks ? runCodeRules(project) : []),
  ];
  const filteredDiagnostics = filterIgnoredDiagnostics(
    diagnostics,
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
