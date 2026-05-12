import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { parse as parseToml } from "smol-toml";
import type {
  BunfigInfo,
  PackageJson,
  PackageManifest,
  ProjectInfo,
  SourceFile,
  WorkflowFile,
} from "./types.js";
import { collectFiles, fileExists, isPlainObject, isSourceFilePath, readJsonFile, wildcardToRegExp } from "./utils.js";

const LOCKFILE_NAMES = ["bun.lock", "bun.lockb"];
const LEGACY_LOCKFILE_NAMES = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"];
const WORKFLOW_EXTENSIONS = new Set([".yml", ".yaml"]);

const collectDependencies = (packageJson: PackageJson): Record<string, string> => ({
  ...packageJson.optionalDependencies,
  ...packageJson.peerDependencies,
  ...packageJson.devDependencies,
  ...packageJson.dependencies,
});

const readManifestContent = (packageJsonPath: string): string => {
  try {
    return fs.readFileSync(packageJsonPath, "utf8");
  } catch {
    return "";
  }
};

const toPackageManifest = (packageJsonPath: string, packageJson: PackageJson): PackageManifest => ({
  packageJsonPath,
  packageJson,
  packageName: packageJson.name ?? path.basename(path.dirname(packageJsonPath)),
  dependencies: collectDependencies(packageJson),
  trustedDependencies: new Set(packageJson.trustedDependencies ?? []),
  manifestContent: readManifestContent(packageJsonPath),
});

const extractPackageJsonWorkspaceGlobs = (packageJson: PackageJson): string[] => {
  const workspaces = packageJson.workspaces;
  if (Array.isArray(workspaces)) return workspaces;
  if (isPlainObject(workspaces) && Array.isArray(workspaces.packages)) return workspaces.packages as string[];
  return [];
};

const parsePnpmWorkspaceGlobs = (content: string): string[] => {
  const globs: string[] = [];
  let inPackagesBlock = false;
  let packagesIndent = -1;
  for (const rawLine of content.split(/\r?\n/)) {
    if (/^\s*#/.test(rawLine)) continue;
    if (rawLine.trim() === "") continue;
    const leadingWhitespace = rawLine.length - rawLine.trimStart().length;
    if (/^packages\s*:\s*$/.test(rawLine.trimEnd())) {
      inPackagesBlock = true;
      packagesIndent = leadingWhitespace;
      continue;
    }
    if (!inPackagesBlock) continue;
    if (leadingWhitespace <= packagesIndent) {
      inPackagesBlock = false;
      continue;
    }
    const itemMatch = rawLine.match(/^\s*-\s*["']?([^"']+?)["']?\s*$/);
    if (itemMatch?.[1]) globs.push(itemMatch[1]);
  }
  return globs;
};

interface SplitGlobs {
  positive: string[];
  negative: string[];
}

const splitGlobs = (globs: string[]): SplitGlobs => {
  const positive: string[] = [];
  const negative: string[] = [];
  for (const glob of globs) {
    if (glob.startsWith("!")) negative.push(glob.slice(1));
    else positive.push(glob);
  }
  return { positive, negative };
};

const pathMatchesAnyGlob = (relativePath: string, globs: string[]): boolean => {
  for (const glob of globs) {
    if (wildcardToRegExp(glob).test(relativePath)) return true;
  }
  return false;
};

const isWorkspacePath = (relativePath: string, splitWorkspaceGlobs: SplitGlobs): boolean =>
  pathMatchesAnyGlob(relativePath, splitWorkspaceGlobs.positive) &&
  !pathMatchesAnyGlob(relativePath, splitWorkspaceGlobs.negative);

const collectPackageManifests = (
  rootDirectory: string,
  rootPackageJsonPath: string,
  rootPackageJson: PackageJson,
  workspaceGlobs: string[],
): PackageManifest[] => {
  const rootManifest = toPackageManifest(rootPackageJsonPath, rootPackageJson);
  if (workspaceGlobs.length === 0) return [rootManifest];

  const splitWorkspaceGlobs = splitGlobs(workspaceGlobs);
  if (splitWorkspaceGlobs.positive.length === 0) return [rootManifest];

  const manifestPaths = collectFiles(
    rootDirectory,
    (filePath) => path.basename(filePath) === "package.json" && filePath !== rootPackageJsonPath,
  );
  const workspaceManifests = manifestPaths.flatMap((manifestPath) => {
    const relativeDirectory = path
      .relative(rootDirectory, path.dirname(manifestPath))
      .replaceAll(path.sep, "/");
    if (!isWorkspacePath(relativeDirectory, splitWorkspaceGlobs)) return [];
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

const getTomlSection = (parsed: Record<string, unknown>, sectionPath: string[]): Record<string, unknown> | null => {
  let current: unknown = parsed;
  for (const segment of sectionPath) {
    if (!isPlainObject(current)) return null;
    current = (current as Record<string, unknown>)[segment];
  }
  return isPlainObject(current) ? (current as Record<string, unknown>) : null;
};

const readBooleanField = (section: Record<string, unknown> | null, key: string): boolean | undefined => {
  const value = section?.[key];
  return typeof value === "boolean" ? value : undefined;
};

const readStringField = (section: Record<string, unknown> | null, key: string): string | undefined => {
  const value = section?.[key];
  return typeof value === "string" ? value : undefined;
};

const parseBunfig = (rootDirectory: string): BunfigInfo | null => {
  const filePath = path.join(rootDirectory, "bunfig.toml");
  if (!fileExists(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf8");

  let parsed: Record<string, unknown>;
  try {
    parsed = parseToml(content) as Record<string, unknown>;
  } catch {
    return { filePath, content };
  }

  const installSection = getTomlSection(parsed, ["install"]);
  const securitySection = getTomlSection(parsed, ["install", "security"]);

  return {
    filePath,
    content,
    installIgnoreScripts: readBooleanField(installSection, "ignoreScripts"),
    installFrozenLockfile: readBooleanField(installSection, "frozenLockfile"),
    installAuto: readStringField(installSection, "auto"),
    installSecurityScanner: readStringField(securitySection, "scanner"),
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

const readTsconfig = (
  rootDirectory: string,
): { path: string | null; config: Record<string, unknown> | null; content: string | null } => {
  const tsconfigPath = path.join(rootDirectory, "tsconfig.json");
  if (!fileExists(tsconfigPath)) return { path: null, config: null, content: null };
  const config = readJsonFile<Record<string, unknown>>(tsconfigPath);
  let content: string | null = null;
  try {
    content = fs.readFileSync(tsconfigPath, "utf8");
  } catch {
    content = null;
  }
  return { path: tsconfigPath, config, content };
};

const findPackageJsonPath = (startDirectory: string): string => {
  const packageJsonPath = path.join(startDirectory, "package.json");
  if (fileExists(packageJsonPath)) return packageJsonPath;
  throw new Error(`No package.json found in ${startDirectory}`);
};

const normalizeGitRemoteUrl = (remoteUrl: string): string => {
  const trimmedRemoteUrl = remoteUrl.trim();
  const sshMatch = trimmedRemoteUrl.match(/^git@([^:]+):(.+)$/);
  if (sshMatch?.[1] && sshMatch[2]) {
    return `https://${sshMatch[1]}/${sshMatch[2].replace(/\.git$/, "")}`;
  }
  return trimmedRemoteUrl.replace(/^git\+/, "").replace(/\.git$/, "");
};

const resolveGitRemoteUrl = (rootDirectory: string, remoteName: string): string | null => {
  const result = spawnSync("git", ["remote", "get-url", remoteName], {
    cwd: rootDirectory,
    encoding: "utf8",
  });
  if (result.error || result.status !== 0) return null;
  const remoteUrl = result.stdout.trim();
  return remoteUrl.length > 0 ? normalizeGitRemoteUrl(remoteUrl) : null;
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
  const pnpmWorkspacePath = path.join(rootDirectory, "pnpm-workspace.yaml");
  const pnpmWorkspaceContent = fileExists(pnpmWorkspacePath) ? fs.readFileSync(pnpmWorkspacePath, "utf8") : null;
  const workspaceGlobs = [
    ...extractPackageJsonWorkspaceGlobs(packageJson),
    ...(pnpmWorkspaceContent ? parsePnpmWorkspaceGlobs(pnpmWorkspaceContent) : []),
  ];
  const packageManifests = collectPackageManifests(rootDirectory, packageJsonPath, packageJson, workspaceGlobs);
  const tsconfig = readTsconfig(rootDirectory);

  return {
    rootDirectory,
    gitRepositoryUrl: resolveGitRemoteUrl(rootDirectory, "origin"),
    gitUpstreamUrl: resolveGitRemoteUrl(rootDirectory, "upstream"),
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
    tsconfigContent: tsconfig.content,
    workflows: readWorkflowFiles(rootDirectory),
    sourceFiles: readSourceFiles(rootDirectory),
    pnpmWorkspacePath: pnpmWorkspaceContent ? pnpmWorkspacePath : null,
    pnpmWorkspaceContent,
  };
};
