import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const PACKAGE_JSON_PATH = path.join(import.meta.dir, "..", "package.json");
const SKILL_MD_PATH = path.join(import.meta.dir, "..", "skills", "bun-doctor", "SKILL.md");

const main = (): void => {
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")) as { version: string };
  const targetVersion = packageJson.version;
  if (!targetVersion) {
    throw new Error("package.json is missing a version field");
  }

  const skillContent = readFileSync(SKILL_MD_PATH, "utf8");
  const updatedContent = skillContent.replace(
    /^version:\s*["']?[^"'\n]+["']?\s*$/m,
    `version: "${targetVersion}"`,
  );

  if (updatedContent === skillContent) {
    console.log(`SKILL.md already at ${targetVersion}`);
    return;
  }

  writeFileSync(SKILL_MD_PATH, updatedContent);
  console.log(`Synced SKILL.md to ${targetVersion}`);
};

main();
