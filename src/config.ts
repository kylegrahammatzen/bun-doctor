import fs from "node:fs";
import path from "node:path";
import type { BunDoctorConfig, Diagnostic, PackageJson } from "./types.js";
import { readJsonFile, toRelativePath, wildcardToRegExp } from "./utils.js";

const CONFIG_FILE_NAME = "bun-doctor.config.json";

export const loadConfig = (rootDirectory: string, packageJson: PackageJson): BunDoctorConfig => {
  const configPath = path.join(rootDirectory, CONFIG_FILE_NAME);
  if (fs.existsSync(configPath)) {
    return readJsonFile<BunDoctorConfig>(configPath) ?? {};
  }
  return packageJson.bunDoctor ?? {};
};

export const filterIgnoredDiagnostics = (
  diagnostics: Diagnostic[],
  config: BunDoctorConfig,
  rootDirectory: string,
): Diagnostic[] => {
  const ignoredRules = new Set(config.ignore?.rules ?? []);
  const ignoredFilePatterns = (config.ignore?.files ?? []).map(wildcardToRegExp);

  return diagnostics.filter((diagnostic) => {
    if (ignoredRules.has(diagnostic.ruleId)) return false;
    const relativePath = toRelativePath(diagnostic.filePath, rootDirectory);
    return !ignoredFilePatterns.some((pattern) => pattern.test(relativePath));
  });
};
