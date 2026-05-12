import fs from "node:fs";
import path from "node:path";
import type {
  BunfigInfo,
  PackageJson,
  PackageManifest,
  ProjectInfo,
  SourceFile,
  WorkflowFile,
} from "./types.js";
import { collectFiles, fileExists, isSourceFilePath, readJsonFile } from "./utils.js";

const LOCKFILE_NAMES = ["bun.lock", "bun.lockb"];
const LEGACY_LOCKFILE_NAMES = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"];
const WORKFLOW_EXTENSIONS = new Set([".yml", ".yaml"]);

const collectDependencies = (packageJson: PackageJson): Record<string, string> => ({
  ...packageJson.optionalDependencies,
  ...packageJson.peerDependencies,
  ...packageJson.devDependencies,
  ...packageJson.dependencies,
});

const toPackageManifest = (packageJsonPath: string, packageJson: PackageJson): PackageManifest => ({
  packageJsonPath,
  packageJson,
  packageName: packageJson.name ?? path.basename(path.dirname(packageJsonPath)),
  dependencies: collectDependencies(packageJson),
  trustedDependencies: new Set(packageJson.trustedDependencies ?? []),
});

const collectPackageManifests = (
  rootDirectory: string,
  rootPackageJsonPath: string,
  rootPackageJson: PackageJson,
): PackageManifest[] => {
  const rootManifest = toPackageManifest(rootPackageJsonPath, rootPackageJson);
  const manifestPaths = collectFiles(
    rootDirectory,
    (filePath) => path.basename(filePath) === "package.json" && filePath !== rootPackageJsonPath,
  );
  const workspaceManifests = manifestPaths.flatMap((manifestPath) => {
    const packageJson = readJsonFile<PackageJson>(manifestPath);
    if (!packageJson || typeof packageJson !== "object" || Array.isArray(packageJson)) return [];
    return [toPackageManifest(manifestPath, packageJson)];
  });
  return [rootManifest, ...workspaceManifests];
};

const mergeDependencies = (manifests: PackageManifest[]): Record<string, string> => {
  const dependencies: Record<string, string> = {};
  for (const manifest of manifests) {
    Object.assign(dependencies, manifest.dependencies);
  }
  return dependencies;
};

const mergeTrustedDependencies = (manifests: PackageManifest[]): Set<string> => {
  const trustedDependencies = new Set<string>();
  for (const manifest of manifests) {
    for (const packageName of manifest.trustedDependencies) {
      trustedDependencies.add(packageName);
    }
  }
  return trustedDependencies;
};

const parseBooleanTomlValue = (content: string, key: string): boolean | undefined => {
  const match = content.match(new RegExp(`^\\s*${key}\\s*=\\s*(true|false)\\s*$`, "m"));
  if (!match?.[1]) return undefined;
  return match[1] === "true";
};

const parseStringTomlValue = (content: string, key: string): string | undefined => {
  const match = content.match(new RegExp(`^\\s*${key}\\s*=\\s*["']([^"']+)["']\\s*$`, "m"));
  return match?.[1];
};

const parseBunfig = (rootDirectory: string): BunfigInfo | null => {
  const filePath = path.join(rootDirectory, "bunfig.toml");
  if (!fileExists(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf8");
  return {
    filePath,
    content,
    installIgnoreScripts: parseBooleanTomlValue(content, "ignoreScripts"),
    installFrozenLockfile: parseBooleanTomlValue(content, "frozenLockfile"),
    installAuto: parseStringTomlValue(content, "auto"),
    installSecurityScanner: parseStringTomlValue(content, "scanner"),
  };
};

const readSourceFiles = (rootDirectory: string): SourceFile[] =>
  collectFiles(rootDirectory, isSourceFilePath).map((filePath) => ({
    filePath,
    content: fs.readFileSync(filePath, "utf8"),
  }));

const readWorkflowFiles = (rootDirectory: string): WorkflowFile[] => {
  const workflowDirectory = path.join(rootDirectory, ".github", "workflows");
  if (!fs.existsSync(workflowDirectory)) return [];
  return collectFiles(workflowDirectory, (filePath) => WORKFLOW_EXTENSIONS.has(path.extname(filePath))).map(
    (filePath) => ({ filePath, content: fs.readFileSync(filePath, "utf8") }),
  );
};

const readTsconfig = (rootDirectory: string): { path: string | null; config: Record<string, unknown> | null } => {
  const tsconfigPath = path.join(rootDirectory, "tsconfig.json");
  if (!fileExists(tsconfigPath)) return { path: null, config: null };
  const config = readJsonFile<Record<string, unknown>>(tsconfigPath);
  return { path: tsconfigPath, config };
};

const findPackageJsonPath = (startDirectory: string): string => {
  const packageJsonPath = path.join(startDirectory, "package.json");
  if (fileExists(packageJsonPath)) return packageJsonPath;
  throw new Error(`No package.json found in ${startDirectory}`);
};

export const discoverProject = (directory: string): ProjectInfo => {
  const rootDirectory = path.resolve(directory);
  const packageJsonPath = findPackageJsonPath(rootDirectory);
  const packageJson = readJsonFile<PackageJson>(packageJsonPath);
  if (!packageJson || typeof packageJson !== "object" || Array.isArray(packageJson)) {
    throw new Error(`Could not parse ${packageJsonPath}`);
  }

  const lockfiles = LOCKFILE_NAMES.filter((lockfileName) => fileExists(path.join(rootDirectory, lockfileName)));
  const legacyLockfiles = LEGACY_LOCKFILE_NAMES.filter((lockfileName) =>
    fileExists(path.join(rootDirectory, lockfileName)),
  );
  const packageManifests = collectPackageManifests(rootDirectory, packageJsonPath, packageJson);
  const tsconfig = readTsconfig(rootDirectory);
  const pnpmWorkspacePath = path.join(rootDirectory, "pnpm-workspace.yaml");

  return {
    rootDirectory,
    packageJsonPath,
    packageJson,
    packageName: packageJson.name ?? path.basename(rootDirectory),
    dependencies: mergeDependencies(packageManifests),
    trustedDependencies: mergeTrustedDependencies(packageManifests),
    packageManifests,
    lockfiles,
    legacyLockfiles,
    bunfig: parseBunfig(rootDirectory),
    tsconfigPath: tsconfig.path,
    tsconfig: tsconfig.config,
    workflows: readWorkflowFiles(rootDirectory),
    sourceFiles: readSourceFiles(rootDirectory),
    pnpmWorkspacePath: fileExists(pnpmWorkspacePath) ? pnpmWorkspacePath : null,
  };
};
