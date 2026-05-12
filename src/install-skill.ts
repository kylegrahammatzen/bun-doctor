import fs from "node:fs";
import path from "node:path";

interface InstallSkillOptions {
  directory: string;
  dryRun?: boolean;
}

const SKILL_CONTENT = `---
name: bun-doctor
description: Use after making dependency, CI, package manager, test runner, or Node runtime changes in a project that uses or is migrating to Bun. Checks Bun readiness and migration risk.
version: "1.0.0"
---

# Bun Doctor

Run \`npx -y bun-doctor@latest . --verbose\` after Bun migration changes and fix blockers before switching CI or runtime.
`;

export const installSkill = (options: InstallSkillOptions): string => {
  const skillDirectory = path.join(options.directory, ".agents", "skills", "bun-doctor");
  const skillPath = path.join(skillDirectory, "SKILL.md");

  if (options.dryRun) return skillPath;

  fs.mkdirSync(skillDirectory, { recursive: true });
  fs.writeFileSync(skillPath, SKILL_CONTENT, "utf8");
  return skillPath;
};
