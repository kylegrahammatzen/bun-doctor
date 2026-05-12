import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const PACKAGE_JSON_PATH = path.join(import.meta.dir, "..", "package.json");
const SKILL_MD_PATH = path.join(import.meta.dir, "..", "skills", "bun-doctor", "SKILL.md");

interface PackageJsonFile {
  version: string;
  [key: string]: unknown;
}

const parseVersion = (version: string): [number, number, number] => {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match?.[1] || !match[2] || !match[3]) {
    throw new Error(`Expected semver version like 0.0.5, got ${version}`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

const nextPatchVersion = (version: string): string => {
  const [major, minor, patch] = parseVersion(version);
  return `${major}.${minor}.${patch + 1}`;
};

const main = (): void => {
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")) as PackageJsonFile;
  const targetVersion = process.argv[2] ?? nextPatchVersion(packageJson.version);
  parseVersion(targetVersion);

  packageJson.version = targetVersion;
  writeFileSync(PACKAGE_JSON_PATH, `${JSON.stringify(packageJson, null, 2)}\n`);

  const skillContent = readFileSync(SKILL_MD_PATH, "utf8");
  const updatedSkillContent = skillContent.replace(
    /^version:\s*["']?[^"'\n]+["']?\s*$/m,
    `version: "${targetVersion}"`,
  );
  writeFileSync(SKILL_MD_PATH, updatedSkillContent);

  console.log(`Bumped bun-doctor to ${targetVersion}`);
};

main();
