#!/usr/bin/env node
import { parseArgs } from "node:util";
import path from "node:path";
import { VERSION } from "./constants.js";
import { installSkill } from "./install-skill.js";
import { formatTextReport, toJsonReport } from "./report.js";
import { scan } from "./scan.js";
import type { FailOnLevel, ScanOptions } from "./types.js";

interface CliFlags {
  json: boolean;
  score: boolean;
  verbose: boolean;
  wins: boolean;
  packageChecks: boolean;
  codeChecks: boolean;
  failOn: FailOnLevel;
}

const VALID_FAIL_ON_LEVELS = new Set<FailOnLevel>(["blocker", "risk", "migration", "none"]);

const HELP_TEXT = `Usage: bun-doctor [directory] [options]

Options:
  --json                  output a structured JSON report
  --score                 output only the numeric score
  --verbose               show every diagnostic
  --wins                  show all optional Bun-native wins
  --no-package            skip package/config/dependency checks
  --no-code               skip source code checks
  --fail-on <level>       exit non-zero on blocker, risk, migration, or none
  -v, --version           print version
  -h, --help              print help

Commands:
  bun-doctor install [directory] [--dry-run]
`;

const shouldFail = (levels: Set<string>, failOn: FailOnLevel): boolean => {
  if (failOn === "none") return false;
  if (failOn === "migration") return levels.has("blocker") || levels.has("risk") || levels.has("migration");
  if (failOn === "risk") return levels.has("blocker") || levels.has("risk");
  return levels.has("blocker");
};

const parseFailOn = (value: string | undefined): FailOnLevel => {
  if (!value) return "blocker";
  if (VALID_FAIL_ON_LEVELS.has(value as FailOnLevel)) return value as FailOnLevel;
  throw new Error(`Invalid --fail-on value: ${value}. Expected blocker, risk, migration, or none.`);
};

const validateModeFlags = (flags: CliFlags): void => {
  if (flags.json && flags.score) {
    throw new Error("--json and --score cannot be used together.");
  }
};

const parseCli = (argv: string[]): { directory: string; flags: CliFlags } => {
  const parsed = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      json: { type: "boolean", default: false },
      score: { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      wins: { type: "boolean", default: false },
      "no-package": { type: "boolean", default: false },
      "no-code": { type: "boolean", default: false },
      "fail-on": { type: "string", default: "blocker" },
      version: { type: "boolean", short: "v", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (parsed.values.help) {
    process.stdout.write(`${HELP_TEXT}\n`);
    process.exit(0);
  }

  if (parsed.values.version) {
    process.stdout.write(`${VERSION}\n`);
    process.exit(0);
  }

  const flags: CliFlags = {
    json: Boolean(parsed.values.json),
    score: Boolean(parsed.values.score),
    verbose: Boolean(parsed.values.verbose),
    wins: Boolean(parsed.values.wins),
    packageChecks: !parsed.values["no-package"],
    codeChecks: !parsed.values["no-code"],
    failOn: parseFailOn(parsed.values["fail-on"]),
  };
  validateModeFlags(flags);

  return {
    directory: path.resolve(parsed.positionals[0] ?? "."),
    flags,
  };
};

const runInstallCommand = (argv: string[]): void => {
  const parsed = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (parsed.values.help) {
    process.stdout.write("Usage: bun-doctor install [directory] [--dry-run]\n");
    return;
  }

  const directory = path.resolve(parsed.positionals[0] ?? ".");
  const skillPath = installSkill({ directory, dryRun: Boolean(parsed.values["dry-run"]) });
  const action = parsed.values["dry-run"] ? "Would install" : "Installed";
  process.stdout.write(`${action} bun-doctor skill at ${skillPath}\n`);
};

const main = async (): Promise<void> => {
  const argv = process.argv.slice(2);
  if (argv[0] === "install") {
    runInstallCommand(argv.slice(1));
    return;
  }

  const { directory, flags } = parseCli(argv);
  const options: ScanOptions = {
    packageChecks: flags.packageChecks,
    codeChecks: flags.codeChecks,
  };
  const result = await scan(directory, options);

  if (flags.score) {
    process.stdout.write(`${result.score.score}\n`);
  } else if (flags.json) {
    process.stdout.write(`${JSON.stringify(toJsonReport(result), null, 2)}\n`);
  } else {
    process.stdout.write(`${formatTextReport(result, { verbose: flags.verbose, showWins: flags.wins })}\n`);
  }

  const levels = new Set(result.diagnostics.map((diagnostic) => diagnostic.level));
  if (shouldFail(levels, flags.failOn)) {
    process.exitCode = 1;
  }
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`bun-doctor: ${message}\n`);
  process.exitCode = 1;
});
