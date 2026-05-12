import fs from "node:fs";
import path from "node:path";
import { IGNORED_DIRECTORIES, SOURCE_FILE_EXTENSIONS } from "./constants.js";

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const fileExists = (filePath: string): boolean => {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
};

export const directoryExists = (directoryPath: string): boolean => {
  try {
    return fs.statSync(directoryPath).isDirectory();
  } catch {
    return false;
  }
};

export const readJsonFile = <T>(filePath: string): T | null => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
};

export const collectFiles = (rootDirectory: string, predicate: (filePath: string) => boolean): string[] => {
  const files: string[] = [];
  const stack = [rootDirectory];

  while (stack.length > 0) {
    const currentDirectory = stack.pop();
    if (!currentDirectory) continue;

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(currentDirectory, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && !IGNORED_DIRECTORIES.has(entry.name)) {
          stack.push(entryPath);
        }
        continue;
      }
      if (entry.isFile() && predicate(entryPath)) {
        files.push(entryPath);
      }
    }
  }

  return files.sort();
};

export const isSourceFilePath = (filePath: string): boolean => {
  if (filePath.endsWith(".d.ts")) return false;
  return SOURCE_FILE_EXTENSIONS.has(path.extname(filePath));
};

export const toRelativePath = (filePath: string, rootDirectory: string): string =>
  path.relative(rootDirectory, filePath).replaceAll(path.sep, "/") || ".";

export const findLineNumber = (content: string, pattern: RegExp): number => {
  const lines = content.split(/\r?\n/);
  const flags = pattern.flags.replace("g", "");
  const linePattern = new RegExp(pattern.source, flags);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    if (linePattern.test(lines[lineIndex] ?? "")) return lineIndex + 1;
  }

  return 1;
};

export const wildcardToRegExp = (pattern: string): RegExp => {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replaceAll("**", "__DOUBLE_STAR__")
    .replaceAll("*", "[^/]*")
    .replaceAll("__DOUBLE_STAR__", ".*");
  return new RegExp(`^${escaped}$`);
};
