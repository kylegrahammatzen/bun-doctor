export const VERSION = process.env.VERSION ?? "0.0.0";

export const PERFECT_SCORE = 100;
export const BLOCKER_RULE_PENALTY = 12;
export const RISK_RULE_PENALTY = 5;
export const MIGRATION_RULE_PENALTY = 2;

export const SCORE_READY_THRESHOLD = 90;
export const SCORE_CLOSE_THRESHOLD = 75;
export const SCORE_RISKY_THRESHOLD = 50;

export const BUN_DOCS = {
  autoInstall: "https://bun.com/docs/runtime/auto-install",
  bunfig: "https://bun.com/docs/runtime/bunfig",
  ci: "https://bun.com/docs/guides/install/cicd",
  catalogs: "https://bun.com/docs/pm/catalogs",
  environmentVariables: "https://bun.com/docs/runtime/environment-variables",
  hashing: "https://bun.com/docs/runtime/hashing",
  lifecycle: "https://bun.com/docs/pm/lifecycle",
  lockfile: "https://bun.com/docs/pm/lockfile",
  nodeCompatibility: "https://bun.com/docs/runtime/nodejs-compat",
  securityScanner: "https://bun.com/docs/pm/security-scanner-api",
  sqlite: "https://bun.com/docs/runtime/sqlite",
  testConfiguration: "https://bun.com/docs/test/configuration",
  testRunner: "https://bun.com/docs/test",
  typescript: "https://bun.com/docs/typescript",
  workspaces: "https://bun.com/docs/pm/workspaces",
};

export const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "vendor",
]);

export const SOURCE_FILE_EXTENSIONS = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]);
