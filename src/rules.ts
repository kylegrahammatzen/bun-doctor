import path from "node:path";
import { BUN_DOCS } from "./constants.js";
import { COMPAT_DB } from "./compat-db.js";
import type {
  Diagnostic,
  FindingCategory,
  FindingLevel,
  PackageManifest,
  ProjectInfo,
} from "./types.js";
import { findLineNumber, isPlainObject } from "./utils.js";

const CATEGORY_BY_LEVEL: Record<FindingLevel, FindingCategory> = {
  blocker: "Blockers",
  risk: "Risks",
  migration: "Migration work",
  win: "Bun wins",
};

interface DiagnosticInput {
  ruleId: string;
  title: string;
  level: FindingLevel;
  message: string;
  filePath: string;
  sources: string[];
  line?: number;
  help?: string;
  packageName?: string;
}

interface CodeRule {
  ruleId: string;
  title: string;
  level: FindingLevel;
  pattern: RegExp;
  message: string;
  sources: string[];
  help?: string;
}

const createDiagnostic = (input: DiagnosticInput): Diagnostic => {
  if (input.sources.length === 0) {
    throw new Error(`Rule ${input.ruleId} is missing a source`);
  }
  return {
    ruleId: input.ruleId,
    title: input.title,
    level: input.level,
    category: CATEGORY_BY_LEVEL[input.level],
    message: input.message,
    filePath: input.filePath,
    line: input.line ?? 1,
    sources: input.sources,
    help: input.help,
    packageName: input.packageName,
  };
};

const getCompilerOptions = (project: ProjectInfo): Record<string, unknown> => {
  const compilerOptions = project.tsconfig?.compilerOptions;
  return isPlainObject(compilerOptions) ? compilerOptions : {};
};

const usesBunGlobal = (project: ProjectInfo): boolean =>
  project.sourceFiles.some((sourceFile) => /\bBun\.|from\s+["']bun["']|require\(["']bun["']\)/.test(sourceFile.content));

const hasDependency = (project: ProjectInfo, packageName: string): boolean =>
  Boolean(project.dependencies[packageName]);

const findDependencyManifests = (project: ProjectInfo, packageName: string): PackageManifest[] =>
  project.packageManifests.filter((manifest) => Boolean(manifest.dependencies[packageName]));

const hasPackageJsonWorkspaces = (project: ProjectInfo): boolean => Boolean(project.packageJson.workspaces);

const hasCatalogReference = (project: ProjectInfo): boolean =>
  Object.values(project.dependencies).some((version) => version.startsWith("catalog:"));

const hasPackageJsonCatalog = (project: ProjectInfo): boolean =>
  Boolean(project.packageJson.catalog) ||
  Boolean(project.packageJson.catalogs) ||
  (isPlainObject(project.packageJson.workspaces) &&
    (Boolean(project.packageJson.workspaces.catalog) || Boolean(project.packageJson.workspaces.catalogs)));

const workflowUsesBun = (content: string): boolean => /\bbun\s+(install|run|test|build|x)\b/.test(content);
const workflowUsesSetupBun = (content: string): boolean => /oven-sh\/setup-bun@/.test(content);
const workflowUsesLegacyInstall = (content: string): boolean =>
  /\b(npm ci|npm install|pnpm install|yarn install|yarn --frozen-lockfile)\b/.test(content);
const workflowUsesUnfrozenBunInstall = (content: string): boolean =>
  /^\s*(-\s*)?run:\s*bun install\s*$/m.test(content) || /\bbun install\b(?![^\n]*--frozen-lockfile)/.test(content);

export const runPackageRules = (project: ProjectInfo): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const packageJsonPath = project.packageJsonPath;
  const hasBunLock = project.lockfiles.includes("bun.lock");
  const hasBunLockb = project.lockfiles.includes("bun.lockb");
  const hasAnyBunLock = hasBunLock || hasBunLockb;

  if (!hasAnyBunLock) {
    diagnostics.push(
      createDiagnostic({
        ruleId: "bun/lockfile-missing",
        title: "Missing Bun lockfile",
        level: "migration",
        message: "This project has no bun.lock. Commit Bun's lockfile before treating installs or CI as reproducible under Bun.",
        filePath: packageJsonPath,
        sources: [BUN_DOCS.lockfile],
        help: "Run bun install and commit bun.lock.",
      }),
    );
  }

  if (hasBunLockb) {
    diagnostics.push(
      createDiagnostic({
        ruleId: "bun/legacy-lockb",
        title: "Legacy binary Bun lockfile",
        level: "migration",
        message: "bun.lockb is the legacy binary lockfile format. Bun v1.2 defaults to the text-based bun.lock.",
        filePath: path.join(project.rootDirectory, "bun.lockb"),
        sources: [BUN_DOCS.lockfile],
        help: "Migrate with bun install --save-text-lockfile --frozen-lockfile --lockfile-only, then remove bun.lockb after verification.",
      }),
    );
  }

  if (hasAnyBunLock && project.legacyLockfiles.length > 0) {
    diagnostics.push(
      createDiagnostic({
        ruleId: "bun/mixed-lockfiles",
        title: "Mixed package-manager lockfiles",
        level: "risk",
        message: `Bun lockfile exists alongside ${project.legacyLockfiles.join(", ")}. Mixed lockfiles make it unclear which package manager owns dependency resolution.`,
        filePath: packageJsonPath,
        sources: [BUN_DOCS.lockfile],
        help: "Keep legacy lockfiles only if another supported workflow still owns them; otherwise remove them after validating bun.lock.",
      }),
    );
  }

  if (!project.packageJson.packageManager?.startsWith("bun@")) {
    diagnostics.push(
      createDiagnostic({
        ruleId: "bun/package-manager-field",
        title: "packageManager does not pin Bun",
        level: "migration",
        message: "package.json does not pin Bun in packageManager, so contributors and CI may use different package managers.",
        filePath: packageJsonPath,
        sources: [BUN_DOCS.lockfile],
        help: "Set packageManager to the Bun version used by the project, for example bun@1.3.11.",
      }),
    );
  }

  if (project.pnpmWorkspacePath && !hasPackageJsonWorkspaces(project)) {
    diagnostics.push(
      createDiagnostic({
        ruleId: "bun/pnpm-workspace-only",
        title: "Workspaces only declared for pnpm",
        level: "blocker",
        message: "Bun reads workspaces from package.json. A pnpm-workspace.yaml without package.json workspaces will not define Bun workspaces.",
        filePath: project.pnpmWorkspacePath,
        sources: [BUN_DOCS.workspaces],
        help: "Move workspace globs into package.json workspaces before relying on bun install at the repo root.",
      }),
    );
  }

  if (hasCatalogReference(project) && !hasPackageJsonCatalog(project)) {
    diagnostics.push(
      createDiagnostic({
        ruleId: "bun/catalog-without-package-json-catalog",
        title: "Catalog references need Bun catalog definitions",
        level: "blocker",
        message: "This project uses catalog: dependency references, but no Bun catalog or catalogs definition was found in package.json.",
        filePath: packageJsonPath,
        sources: [BUN_DOCS.catalogs],
        help: "Define catalog or catalogs in package.json, preferably under workspaces for monorepos.",
      }),
    );
  }

  for (const workflow of project.workflows) {
    if (workflowUsesBun(workflow.content) && !workflowUsesSetupBun(workflow.content)) {
      diagnostics.push(
        createDiagnostic({
          ruleId: "bun/ci-missing-setup-bun",
          title: "CI uses Bun without setup-bun",
          level: "blocker",
          message: "This workflow runs bun commands but does not install Bun with oven-sh/setup-bun.",
          filePath: workflow.filePath,
          line: findLineNumber(workflow.content, /\bbun\s+(install|run|test|build|x)\b/),
          sources: [BUN_DOCS.ci],
          help: "Add oven-sh/setup-bun before bun commands in GitHub Actions.",
        }),
      );
    }

    if (hasAnyBunLock && workflowUsesLegacyInstall(workflow.content)) {
      diagnostics.push(
        createDiagnostic({
          ruleId: "bun/ci-uses-legacy-package-manager",
          title: "CI still installs with another package manager",
          level: "migration",
          message: "This workflow uses npm, pnpm, or yarn install even though the project has a Bun lockfile.",
          filePath: workflow.filePath,
          line: findLineNumber(workflow.content, /\b(npm ci|npm install|pnpm install|yarn install|yarn --frozen-lockfile)\b/),
          sources: [BUN_DOCS.ci],
          help: "Switch Bun-owned CI jobs to bun install --frozen-lockfile.",
        }),
      );
    }

    if (workflowUsesUnfrozenBunInstall(workflow.content)) {
      diagnostics.push(
        createDiagnostic({
          ruleId: "bun/ci-install-not-frozen",
          title: "CI Bun install is not frozen",
          level: "risk",
          message: "This workflow runs bun install without --frozen-lockfile, so CI can update bun.lock instead of verifying it.",
          filePath: workflow.filePath,
          line: findLineNumber(workflow.content, /\bbun install\b/),
          sources: [BUN_DOCS.bunfig, BUN_DOCS.ci],
          help: "Use bun install --frozen-lockfile in CI.",
        }),
      );
    }
  }

  if (usesBunGlobal(project) && !hasDependency(project, "@types/bun")) {
    diagnostics.push(
      createDiagnostic({
        ruleId: "bun/types-package-missing",
        title: "Bun types are missing",
        level: "migration",
        message: "Source files reference Bun APIs, but @types/bun is not installed.",
        filePath: packageJsonPath,
        sources: [BUN_DOCS.typescript],
        help: "Install @types/bun as a dev dependency.",
      }),
    );
  }

  const compilerOptions = getCompilerOptions(project);
  const compilerTypes = compilerOptions.types;
  if (hasDependency(project, "@types/bun") && Array.isArray(compilerTypes) && !compilerTypes.includes("bun")) {
    diagnostics.push(
      createDiagnostic({
        ruleId: "bun/tsconfig-types-missing-bun",
        title: "tsconfig types excludes Bun",
        level: "risk",
        message: "@types/bun is installed, but compilerOptions.types does not include bun. TypeScript 6+ requires explicit Bun types in this mode.",
        filePath: project.tsconfigPath ?? packageJsonPath,
        sources: [BUN_DOCS.typescript],
        help: "Add \"bun\" to compilerOptions.types or remove types if you do not need to restrict global type packages.",
      }),
    );
  }

  if (project.bunfig?.installAuto && project.bunfig.installAuto !== "disable") {
    diagnostics.push(
      createDiagnostic({
        ruleId: "bun/auto-install-enabled",
        title: "Bun auto-install is enabled",
        level: "risk",
        message: `bunfig.toml sets install.auto to ${project.bunfig.installAuto}. Auto-install can fetch packages during execution when node_modules is absent.`,
        filePath: project.bunfig.filePath,
        line: findLineNumber(project.bunfig.content, /auto\s*=/),
        sources: [BUN_DOCS.autoInstall, BUN_DOCS.bunfig],
        help: "For application repos and CI, consider install.auto = \"disable\" for more predictable execution.",
      }),
    );
  }

  for (const entry of COMPAT_DB) {
    for (const manifest of findDependencyManifests(project, entry.packageName)) {
      diagnostics.push(
        createDiagnostic({
          ruleId: `compat/${entry.packageName}`,
          title: `${entry.packageName} compatibility note`,
          level: entry.severity,
          message: entry.reason,
          filePath: manifest.packageJsonPath,
          sources: entry.sources,
          packageName: entry.packageName,
          help: [entry.replacement ? `Replacement: ${entry.replacement}.` : "", entry.workaround, entry.migrationHint]
            .filter(Boolean)
            .join(" "),
        }),
      );

      if (entry.requiresTrustedDependency && !manifest.trustedDependencies.has(entry.packageName)) {
        diagnostics.push(
          createDiagnostic({
            ruleId: `bun/trusted-dependency/${entry.packageName}`,
            title: `${entry.packageName} may need trustedDependencies`,
            level: "risk",
            message: `${entry.packageName} can require lifecycle scripts, but it is not listed in trustedDependencies. Bun does not run arbitrary lifecycle scripts by default.`,
            filePath: manifest.packageJsonPath,
            sources: [BUN_DOCS.lifecycle],
            packageName: entry.packageName,
            help: `If you keep ${entry.packageName}, verify whether it needs install scripts and add it to trustedDependencies only after review.`,
          }),
        );
      }
    }
  }

  return diagnostics;
};

const CODE_RULES: CodeRule[] = [
  {
    ruleId: "code/node-repl",
    title: "node:repl is not implemented in Bun",
    level: "blocker",
    pattern: /(?:from\s+["']node:repl["']|require\(["']node:repl["']\))/,
    message: "Bun's Node compatibility table marks node:repl as not implemented.",
    sources: [BUN_DOCS.nodeCompatibility],
  },
  {
    ruleId: "code/node-trace-events",
    title: "node:trace_events is not implemented in Bun",
    level: "blocker",
    pattern: /(?:from\s+["']node:trace_events["']|require\(["']node:trace_events["']\))/,
    message: "Bun's Node compatibility table marks node:trace_events as not implemented.",
    sources: [BUN_DOCS.nodeCompatibility],
  },
  {
    ruleId: "code/node-sqlite",
    title: "node:sqlite is not implemented in Bun",
    level: "blocker",
    pattern: /(?:from\s+["']node:sqlite["']|require\(["']node:sqlite["']\))/,
    message: "Bun does not implement node:sqlite. Bun provides bun:sqlite instead.",
    sources: [BUN_DOCS.nodeCompatibility, BUN_DOCS.sqlite],
    help: "Use bun:sqlite for Bun-targeted SQLite code.",
  },
  {
    ruleId: "code/process-binding",
    title: "process.binding usage is compatibility-sensitive",
    level: "risk",
    pattern: /\bprocess\.binding\s*\(/,
    message: "process.binding is an internal Node API and only partially implemented by Bun.",
    sources: [BUN_DOCS.nodeCompatibility],
    help: "Replace internal Node binding access with public APIs before migrating.",
  },
  {
    ruleId: "code/process-missing-api",
    title: "Node process API is not implemented in Bun",
    level: "blocker",
    pattern: /\bprocess\.(loadEnvFile|getBuiltinModule)\s*\(/,
    message: "Bun's compatibility docs list process.loadEnvFile and process.getBuiltinModule as not implemented.",
    sources: [BUN_DOCS.nodeCompatibility],
  },
  {
    ruleId: "code/module-register",
    title: "module.register is not implemented in Bun",
    level: "blocker",
    pattern: /\bmodule\.register\s*\(/,
    message: "Bun's compatibility docs list module.register as not implemented and recommend Bun.plugin in the meantime.",
    sources: [BUN_DOCS.nodeCompatibility, "https://bun.com/docs/runtime/plugins"],
    help: "Evaluate Bun.plugin or avoid runtime module loader hooks in Bun-targeted code.",
  },
  {
    ruleId: "code/node-test",
    title: "node:test is only partly implemented in Bun",
    level: "migration",
    pattern: /(?:from\s+["']node:test["']|require\(["']node:test["']\))/,
    message: "Bun's compatibility docs mark node:test as partly implemented. Bun has its own bun:test runner.",
    sources: [BUN_DOCS.nodeCompatibility, BUN_DOCS.testRunner],
    help: "Prefer bun:test when migrating the test runner to Bun.",
  },
  {
    ruleId: "code/v8-specific-api",
    title: "V8-specific APIs are compatibility-sensitive",
    level: "risk",
    pattern: /(?:from\s+["']node:v8["']|require\(["']node:v8["']\)|\bv8\.(serialize|deserialize|setFlagsFromString|cachedDataVersionTag)\s*\()/,
    message: "Bun runs on JavaScriptCore, and its Node v8 compatibility is partial.",
    sources: [BUN_DOCS.nodeCompatibility],
    help: "Avoid V8-specific runtime assumptions in Bun-targeted code.",
  },
  {
    ruleId: "code/worker-resource-limits",
    title: "worker_threads resource limits are unsupported",
    level: "risk",
    pattern: /\bresourceLimits\s*:/,
    message: "Bun's worker_threads compatibility notes list resourceLimits as unsupported.",
    sources: [BUN_DOCS.nodeCompatibility],
    help: "Verify worker behavior under Bun or avoid Node-specific Worker options.",
  },
];

export const runCodeRules = (project: ProjectInfo): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];

  for (const sourceFile of project.sourceFiles) {
    for (const rule of CODE_RULES) {
      if (!rule.pattern.test(sourceFile.content)) continue;
      diagnostics.push(
        createDiagnostic({
          ruleId: rule.ruleId,
          title: rule.title,
          level: rule.level,
          message: rule.message,
          filePath: sourceFile.filePath,
          line: findLineNumber(sourceFile.content, rule.pattern),
          sources: rule.sources,
          help: rule.help,
        }),
      );
    }
  }

  return diagnostics;
};
