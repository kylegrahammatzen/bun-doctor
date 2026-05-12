import { BUN_DOCS } from "./constants.js";
import type { CompatEntry } from "./types.js";

const LAST_VERIFIED = "2026-05-12";

export const COMPAT_DB: CompatEntry[] = [
  {
    packageName: "@napi-rs/canvas",
    severity: "win",
    confidence: "medium",
    reason:
      "@napi-rs/canvas ships prebuilt N-API binaries that generally work on Bun without lifecycle script gymnastics, unlike node-canvas.",
    sources: [BUN_DOCS.lifecycle, BUN_DOCS.nodeCompatibility],
    lastVerified: LAST_VERIFIED,
    migrationHint:
      "Prefer @napi-rs/canvas over node-canvas when migrating to Bun for a cleaner install path.",
  },
  {
    packageName: "@prisma/client",
    severity: "risk",
    confidence: "high",
    reason:
      "Prisma Client generates code via a postinstall script that Bun skips for dependencies by default.",
    sources: [BUN_DOCS.lifecycle],
    lastVerified: LAST_VERIFIED,
    workaround:
      "Add @prisma/client to trustedDependencies, or run prisma generate explicitly in the build step.",
    requiresTrustedDependency: true,
  },
  {
    packageName: "@swc-node/register",
    severity: "win",
    confidence: "high",
    reason:
      "Bun runs TypeScript directly, making @swc-node/register redundant when Bun is the target runtime.",
    sources: [BUN_DOCS.typescript],
    lastVerified: LAST_VERIFIED,
    replacement: "bun run file.ts",
    migrationHint: "Remove @swc-node/register loader flags from Bun-targeted scripts.",
  },
  {
    packageName: "argon2",
    severity: "win",
    confidence: "medium",
    reason:
      "Bun.password supports argon2 natively, and the argon2 npm package's native install depends on lifecycle scripts Bun skips by default.",
    sources: [BUN_DOCS.hashing, BUN_DOCS.lifecycle],
    lastVerified: LAST_VERIFIED,
    replacement: "Bun.password",
    migrationHint:
      "Consider Bun.password with algorithm 'argon2id' for new Bun-only password hashing code.",
    requiresTrustedDependency: true,
  },
  {
    packageName: "ava",
    severity: "win",
    confidence: "low",
    reason:
      "AVA runs on Bun, but its test paradigm differs from bun:test enough that migration is real work rather than a script swap.",
    sources: [BUN_DOCS.testRunner],
    lastVerified: LAST_VERIFIED,
    replacement: "bun:test",
    workaround:
      "Keep AVA if its assertion model or concurrency behavior matters; otherwise bun:test is the Bun-native alternative.",
  },
  {
    packageName: "axios",
    severity: "win",
    confidence: "high",
    reason:
      "Bun ships native fetch and Web HTTP APIs that cover most axios use cases, though axios continues to work on Bun.",
    sources: [BUN_DOCS.fetch, BUN_DOCS.nodeCompatibility],
    lastVerified: LAST_VERIFIED,
    replacement: "global fetch",
    migrationHint:
      "Evaluate global fetch for simple JSON flows; keep axios where you rely on its interceptors, defaults, or error model.",
  },
  {
    packageName: "bcrypt",
    severity: "win",
    confidence: "medium",
    reason:
      "Bun.password provides native bcrypt hashing, and the bcrypt npm package's native install requires lifecycle scripts Bun skips by default.",
    sources: [BUN_DOCS.hashing, BUN_DOCS.lifecycle],
    lastVerified: LAST_VERIFIED,
    replacement: "Bun.password",
    migrationHint:
      "Bun.password is a drop-in replacement for most bcrypt.hash/compare flows when Bun is the target runtime.",
    requiresTrustedDependency: true,
  },
  {
    packageName: "bcryptjs",
    severity: "win",
    confidence: "high",
    reason:
      "bcryptjs runs fine on Bun, but Bun.password offers a native bcrypt implementation that is typically much faster.",
    sources: [BUN_DOCS.hashing],
    lastVerified: LAST_VERIFIED,
    replacement: "Bun.password",
    migrationHint:
      "Bun.password covers most bcryptjs use cases with better performance when targeting Bun.",
  },
  {
    packageName: "better-sqlite3",
    severity: "risk",
    confidence: "high",
    reason:
      "better-sqlite3 uses native bindings and lifecycle scripts that Bun skips for dependencies by default, and Bun ships a native SQLite driver.",
    sources: [BUN_DOCS.sqlite, BUN_DOCS.lifecycle, BUN_DOCS.nodeCompatibility],
    lastVerified: LAST_VERIFIED,
    replacement: "bun:sqlite",
    workaround:
      "If you keep better-sqlite3, add it to trustedDependencies and verify install on every target platform.",
    migrationHint:
      "Database from bun:sqlite covers the synchronous-driver use case better-sqlite3 is usually chosen for.",
    requiresTrustedDependency: true,
  },
  {
    packageName: "chokidar",
    severity: "win",
    confidence: "low",
    reason:
      "chokidar runs on Bun via fs.watch fallbacks, but Bun's --watch mode and fs.watch cover most file-watcher use cases natively.",
    sources: [BUN_DOCS.watchMode, BUN_DOCS.nodeCompatibility],
    lastVerified: LAST_VERIFIED,
    workaround:
      "Keep chokidar if you rely on its cross-platform glob semantics or stability heuristics; otherwise evaluate native fs.watch.",
  },
  {
    packageName: "canvas",
    severity: "risk",
    confidence: "medium",
    reason:
      "node-canvas relies on native bindings and platform-specific install steps that depend on Bun's lifecycle-script handling.",
    sources: [BUN_DOCS.lifecycle, BUN_DOCS.nodeCompatibility],
    lastVerified: LAST_VERIFIED,
    workaround:
      "Add canvas to trustedDependencies and verify installs on each target OS, or evaluate @napi-rs/canvas if its API fits.",
    requiresTrustedDependency: true,
  },
  {
    packageName: "cross-fetch",
    severity: "win",
    confidence: "high",
    reason:
      "Bun provides native Request, Response, Headers, and fetch, making cross-fetch redundant as a polyfill.",
    sources: [BUN_DOCS.fetch, BUN_DOCS.nodeCompatibility],
    lastVerified: LAST_VERIFIED,
    replacement: "global fetch",
    migrationHint:
      "Remove cross-fetch when all target runtimes (including Bun) provide global fetch.",
  },
  {
    packageName: "cypress",
    severity: "risk",
    confidence: "high",
    reason:
      "Cypress installs its desktop binary via a postinstall script that Bun skips for dependencies unless trusted.",
    sources: [BUN_DOCS.lifecycle],
    lastVerified: LAST_VERIFIED,
    workaround:
      "Add cypress to trustedDependencies, or run npx cypress install explicitly after bun install.",
    requiresTrustedDependency: true,
  },
  {
    packageName: "dotenv",
    severity: "win",
    confidence: "high",
    reason:
      "Bun loads .env, .env.local, and environment-specific .env files automatically, making dotenv redundant for the files Bun already reads.",
    sources: [BUN_DOCS.environmentVariables],
    lastVerified: LAST_VERIFIED,
    replacement: "Bun built-in .env loading",
    migrationHint:
      "Remove dotenv/config bootstraps when Bun's automatic .env loading already covers the same files.",
  },
  {
    packageName: "esbuild",
    severity: "win",
    confidence: "medium",
    reason:
      "Bun ships a native bundler with an esbuild migration guide for projects that only need basic bundling.",
    sources: [BUN_DOCS.bundler, BUN_DOCS.bundlerEsbuild],
    lastVerified: LAST_VERIFIED,
    replacement: "bun build",
    migrationHint:
      "Evaluate bun build for build scripts whose esbuild config is straightforward (entry + format + outdir).",
  },
  {
    packageName: "got",
    severity: "win",
    confidence: "high",
    reason:
      "Bun ships native fetch and Web HTTP APIs that cover most got use cases, though got continues to work on Bun.",
    sources: [BUN_DOCS.fetch, BUN_DOCS.nodeCompatibility],
    lastVerified: LAST_VERIFIED,
    replacement: "global fetch",
    migrationHint:
      "Evaluate global fetch for simple HTTP flows; keep got where you rely on its retry or hooks model.",
  },
  {
    packageName: "ioredis",
    severity: "win",
    confidence: "medium",
    reason:
      "ioredis works on Bun, but Bun ships a native Redis client that avoids the parser/IO overhead of a pure-JS client.",
    sources: [BUN_DOCS.redis],
    lastVerified: LAST_VERIFIED,
    replacement: "Bun.RedisClient",
    workaround:
      "Keep ioredis if you rely on its cluster, sentinel, or scripting helpers; otherwise evaluate the native Bun Redis client.",
  },
  {
    packageName: "jest",
    severity: "win",
    confidence: "medium",
    reason:
      "Jest works on Bun, and bun:test ships natively with Jest-compatible expect/describe/test for most suites.",
    sources: [BUN_DOCS.testRunner, BUN_DOCS.testConfiguration],
    lastVerified: LAST_VERIFIED,
    replacement: "bun:test",
    workaround:
      "Keep Jest if you rely on jest.config transforms, custom resolvers, or jest-specific reporter behavior.",
    migrationHint:
      "Audit jest.config and setup files before switching test scripts to bun test.",
  },
  {
    packageName: "mocha",
    severity: "win",
    confidence: "medium",
    reason:
      "Mocha runs on Bun, but bun:test is the Jest-compatible native alternative that requires rewriting BDD-style suites to adopt.",
    sources: [BUN_DOCS.testRunner],
    lastVerified: LAST_VERIFIED,
    replacement: "bun:test",
    workaround:
      "Keep Mocha if its BDD style or reporter ecosystem matters to the project.",
  },
  {
    packageName: "nan",
    severity: "risk",
    confidence: "medium",
    reason:
      "nan is the legacy Node Abstractions header used by older native modules; modules depending on it require lifecycle scripts Bun skips unless trusted.",
    sources: [BUN_DOCS.lifecycle, BUN_DOCS.nodeCompatibility],
    lastVerified: LAST_VERIFIED,
    workaround:
      "Audit which dependencies pull in nan and add them to trustedDependencies after verifying installs on each target platform.",
    requiresTrustedDependency: true,
  },
  {
    packageName: "node-fetch",
    severity: "win",
    confidence: "high",
    reason:
      "Bun provides global fetch, making node-fetch redundant as a polyfill.",
    sources: [BUN_DOCS.fetch, BUN_DOCS.nodeCompatibility],
    lastVerified: LAST_VERIFIED,
    replacement: "global fetch",
    migrationHint:
      "Remove node-fetch imports when all target runtimes provide global fetch.",
  },
  {
    packageName: "node-gyp",
    severity: "risk",
    confidence: "medium",
    reason:
      "node-gyp drives native module builds via lifecycle scripts that Bun skips for dependencies unless trusted.",
    sources: [BUN_DOCS.lifecycle],
    lastVerified: LAST_VERIFIED,
    workaround:
      "Audit which dependencies need node-gyp at install time and add them to trustedDependencies after verifying on each target platform.",
    requiresTrustedDependency: true,
  },
  {
    packageName: "node-pty",
    severity: "risk",
    confidence: "medium",
    reason:
      "node-pty wraps native pseudo-terminal bindings via node-gyp and depends on lifecycle scripts Bun skips for dependencies unless trusted.",
    sources: [BUN_DOCS.lifecycle, BUN_DOCS.nodeCompatibility],
    lastVerified: LAST_VERIFIED,
    workaround:
      "Add node-pty to trustedDependencies and verify installs on each target OS, especially Windows.",
    requiresTrustedDependency: true,
  },
  {
    packageName: "node-pre-gyp",
    severity: "risk",
    confidence: "medium",
    reason:
      "node-pre-gyp resolves prebuilt native binaries via lifecycle scripts that Bun skips for dependencies unless trusted.",
    sources: [BUN_DOCS.lifecycle],
    lastVerified: LAST_VERIFIED,
    workaround:
      "Add affected packages to trustedDependencies, or verify that prebuilt binaries resolve without an install step.",
    requiresTrustedDependency: true,
  },
  {
    packageName: "node-sass",
    severity: "risk",
    confidence: "high",
    reason:
      "node-sass depends on native install steps Bun skips by default and is upstream-deprecated in favor of sass.",
    sources: [BUN_DOCS.lifecycle],
    lastVerified: LAST_VERIFIED,
    replacement: "sass",
    workaround:
      "Prefer Dart Sass (sass); if you keep node-sass, add it to trustedDependencies and verify platform installs.",
    migrationHint: "Replace node-sass with sass where possible.",
    requiresTrustedDependency: true,
  },
  {
    packageName: "nodemon",
    severity: "win",
    confidence: "high",
    reason:
      "Bun has built-in --watch and --hot modes that cover most nodemon dev-script use cases.",
    sources: [BUN_DOCS.watchMode],
    lastVerified: LAST_VERIFIED,
    replacement: "bun --watch or bun --hot",
    migrationHint:
      "Replace nodemon dev scripts with bun --watch or bun --hot when their behavior matches.",
  },
  {
    packageName: "pm2",
    severity: "win",
    confidence: "low",
    reason:
      "pm2 runs on Bun but is heavier than Bun's --watch/--hot modes for dev loops; production process management remains pm2's strength.",
    sources: [BUN_DOCS.watchMode],
    lastVerified: LAST_VERIFIED,
    workaround:
      "Keep pm2 for cluster mode, log rotation, or zero-downtime restarts; replace its dev-watch usage with bun --watch.",
  },
  {
    packageName: "pg-native",
    severity: "risk",
    confidence: "medium",
    reason:
      "pg-native links to libpq and requires native install steps Bun skips by default, while the pure-JS pg client has no such constraint.",
    sources: [BUN_DOCS.lifecycle, BUN_DOCS.nodeCompatibility],
    lastVerified: LAST_VERIFIED,
    replacement: "pg",
    workaround:
      "If pg-native is required for performance, add it to trustedDependencies and verify install on every target platform.",
    requiresTrustedDependency: true,
  },
  {
    packageName: "playwright",
    severity: "risk",
    confidence: "high",
    reason:
      "Playwright downloads browser binaries via a postinstall script that Bun skips for dependencies unless trusted.",
    sources: [BUN_DOCS.lifecycle],
    lastVerified: LAST_VERIFIED,
    workaround:
      "Add playwright (and browser packages) to trustedDependencies, or run npx playwright install explicitly in CI.",
    requiresTrustedDependency: true,
  },
  {
    packageName: "prisma",
    severity: "risk",
    confidence: "high",
    reason:
      "The Prisma CLI runs schema generation via lifecycle scripts that Bun skips for dependencies by default.",
    sources: [BUN_DOCS.lifecycle],
    lastVerified: LAST_VERIFIED,
    workaround:
      "Add prisma to trustedDependencies, or run prisma generate explicitly in the build step.",
    requiresTrustedDependency: true,
  },
  {
    packageName: "puppeteer",
    severity: "risk",
    confidence: "high",
    reason:
      "puppeteer downloads Chromium via a postinstall script that Bun skips for dependencies unless trusted.",
    sources: [BUN_DOCS.lifecycle],
    lastVerified: LAST_VERIFIED,
    workaround:
      "Add puppeteer to trustedDependencies, install Chromium manually, or use puppeteer-core with an existing browser binary.",
    requiresTrustedDependency: true,
  },
  {
    packageName: "redis",
    severity: "win",
    confidence: "medium",
    reason:
      "node-redis (the redis package) works on Bun, but Bun ships a native Redis client that avoids the parser overhead of a pure-JS client.",
    sources: [BUN_DOCS.redis],
    lastVerified: LAST_VERIFIED,
    replacement: "Bun.RedisClient",
    workaround:
      "Keep node-redis if you rely on its v4 command/feature surface; otherwise evaluate the native Bun Redis client.",
  },
  {
    packageName: "serialport",
    severity: "risk",
    confidence: "medium",
    reason:
      "serialport ships native bindings whose install paths depend on lifecycle scripts Bun skips for dependencies unless trusted.",
    sources: [BUN_DOCS.lifecycle, BUN_DOCS.nodeCompatibility],
    lastVerified: LAST_VERIFIED,
    workaround:
      "Add serialport to trustedDependencies and verify installs on each target OS and Node-API ABI.",
    requiresTrustedDependency: true,
  },
  {
    packageName: "sharp",
    severity: "risk",
    confidence: "medium",
    reason:
      "sharp uses native bindings and prebuilds whose install behavior depends on Bun's lifecycle-script handling.",
    sources: [BUN_DOCS.lifecycle, BUN_DOCS.nodeCompatibility],
    lastVerified: LAST_VERIFIED,
    workaround:
      "Add sharp to trustedDependencies and verify installs on each target OS and arch (especially Alpine/musl).",
    requiresTrustedDependency: true,
  },
  {
    packageName: "sqlite3",
    severity: "risk",
    confidence: "high",
    reason:
      "sqlite3 uses native bindings and lifecycle scripts Bun skips by default, while Bun ships a native SQLite driver.",
    sources: [BUN_DOCS.sqlite, BUN_DOCS.lifecycle],
    lastVerified: LAST_VERIFIED,
    replacement: "bun:sqlite",
    migrationHint:
      "Database from bun:sqlite covers most sqlite3 use cases for new Bun-only code.",
    requiresTrustedDependency: true,
  },
  {
    packageName: "ts-node",
    severity: "win",
    confidence: "high",
    reason:
      "Bun executes TypeScript files directly, making ts-node redundant when Bun is the runtime.",
    sources: [BUN_DOCS.typescript],
    lastVerified: LAST_VERIFIED,
    replacement: "bun run file.ts",
    migrationHint:
      "Replace ts-node scripts with bun run and drop --loader ts-node/esm flags from Bun-targeted scripts.",
  },
  {
    packageName: "tsup",
    severity: "win",
    confidence: "low",
    reason:
      "tsup wraps esbuild and works on Bun; Bun's native bundler covers many tsup use cases for libraries with simple build configs.",
    sources: [BUN_DOCS.bundler, BUN_DOCS.bundlerEsbuild],
    lastVerified: LAST_VERIFIED,
    replacement: "bun build",
    workaround:
      "Keep tsup where you rely on its dts generation, watch mode, or specific build target presets.",
  },
  {
    packageName: "tsx",
    severity: "win",
    confidence: "high",
    reason:
      "Bun runs TypeScript files directly with --watch and --hot modes that duplicate tsx's functionality.",
    sources: [BUN_DOCS.typescript, BUN_DOCS.watchMode],
    lastVerified: LAST_VERIFIED,
    replacement: "bun run file.ts",
    migrationHint: "Replace tsx scripts with bun run when Bun is the target runtime.",
  },
  {
    packageName: "vitest",
    severity: "win",
    confidence: "medium",
    reason:
      "Vitest runs on Bun, but bun:test is the Jest-compatible native alternative whose suitability depends on which Vitest features the suite uses.",
    sources: [BUN_DOCS.testRunner],
    lastVerified: LAST_VERIFIED,
    replacement: "bun:test",
    workaround:
      "Keep Vitest if you rely on its Vite plugin pipeline, browser mode, or specific snapshot/coverage behavior.",
  },
  {
    packageName: "webpack",
    severity: "win",
    confidence: "medium",
    reason:
      "Bun includes a native bundler that covers many application and library workflows webpack handles.",
    sources: [BUN_DOCS.bundler],
    lastVerified: LAST_VERIFIED,
    replacement: "bun build",
    migrationHint:
      "Evaluate bun build for simple library/app bundles; keep webpack where you rely on loaders or plugins bun build doesn't cover.",
  },
];
