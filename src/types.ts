export type FindingLevel = "blocker" | "risk" | "migration" | "win";

export type FindingCategory = "Blockers" | "Risks" | "Migration work" | "Bun wins";

export type FailOnLevel = FindingLevel | "none";

export interface PackageJson {
  name?: string;
  version?: string;
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  trustedDependencies?: string[];
  workspaces?: string[] | { packages?: string[]; catalog?: unknown; catalogs?: unknown };
  catalog?: unknown;
  catalogs?: unknown;
  bunDoctor?: BunDoctorConfig;
}

export interface BunDoctorConfig {
  ignore?: {
    rules?: string[];
    files?: string[];
  };
  package?: boolean;
  code?: boolean;
}

export interface CompatEntry {
  packageName: string;
  severity: FindingLevel;
  affectedRanges: string[];
  bunVersions: string[];
  platforms: Array<"darwin" | "linux" | "win32" | "all">;
  confidence: "high" | "medium" | "low";
  reason: string;
  sources: string[];
  lastVerified: string;
  replacement?: string;
  workaround?: string;
  migrationHint?: string;
  requiresTrustedDependency?: boolean;
}

export interface SourceFile {
  filePath: string;
  content: string;
}

export interface WorkflowFile {
  filePath: string;
  content: string;
}

export interface BunfigInfo {
  filePath: string;
  content: string;
  installIgnoreScripts?: boolean;
  installFrozenLockfile?: boolean;
  installAuto?: string;
  installSecurityScanner?: string;
}

export interface ProjectInfo {
  rootDirectory: string;
  packageJsonPath: string;
  packageJson: PackageJson;
  packageName: string;
  dependencies: Record<string, string>;
  trustedDependencies: Set<string>;
  packageManifests: PackageManifest[];
  lockfiles: string[];
  legacyLockfiles: string[];
  bunfig: BunfigInfo | null;
  tsconfigPath: string | null;
  tsconfig: Record<string, unknown> | null;
  workflows: WorkflowFile[];
  sourceFiles: SourceFile[];
  pnpmWorkspacePath: string | null;
}

export interface PackageManifest {
  packageJsonPath: string;
  packageJson: PackageJson;
  packageName: string;
  dependencies: Record<string, string>;
  trustedDependencies: Set<string>;
}

export interface Diagnostic {
  ruleId: string;
  title: string;
  level: FindingLevel;
  category: FindingCategory;
  message: string;
  filePath: string;
  line: number;
  sources: string[];
  help?: string;
  packageName?: string;
}

export interface ScoreResult {
  score: number;
  label: "Ready" | "Close" | "Risky" | "Blocked";
}

export interface ScanSummary {
  blockers: number;
  risks: number;
  migrations: number;
  wins: number;
}

export interface ScanOptions {
  packageChecks?: boolean;
  codeChecks?: boolean;
  configOverride?: BunDoctorConfig | null;
}

export interface ScanResult {
  project: ProjectInfo;
  diagnostics: Diagnostic[];
  score: ScoreResult;
  summary: ScanSummary;
}
