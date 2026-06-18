/**
 * CI gate: fail when a PR touches paths listed in .github/PROTECTED_FILES.json.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

function globToRegExp(pattern) {
  const normalized = pattern.replace(/\\/g, "/");
  const escaped = normalized
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{DOUBLESTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{DOUBLESTAR}}/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function loadPatterns() {
  const configPath = resolve(root, ".github/PROTECTED_FILES.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  if (!Array.isArray(config.patterns) || config.patterns.length === 0) {
    throw new Error(".github/PROTECTED_FILES.json must define a non-empty patterns array");
  }
  return config.patterns.map(globToRegExp);
}

function resolveBaseRef() {
  if (process.env.GITHUB_BASE_REF) {
    return process.env.GITHUB_BASE_REF;
  }
  if (process.env.PROTECTED_FILES_BASE_REF) {
    return process.env.PROTECTED_FILES_BASE_REF;
  }
  return "chore/v1.7-repo-org";
}

function getChangedFiles(baseRef) {
  const remoteRef = `origin/${baseRef}`;
  const commands = [
    `git diff ${remoteRef}...HEAD --name-only`,
    "git diff HEAD~1...HEAD --name-only",
  ];

  for (const command of commands) {
    try {
      const output = execSync(command, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
      if (output) {
        return output.split(/\r?\n/).filter(Boolean);
      }
    } catch {
      // Try the next diff strategy.
    }
  }

  return [];
}

function findViolations(changedFiles, patterns) {
  const violations = [];
  for (const file of changedFiles) {
    const normalized = file.replace(/\\/g, "/");
    if (patterns.some(pattern => pattern.test(normalized))) {
      violations.push(normalized);
    }
  }
  return [...new Set(violations)].sort();
}

const patterns = loadPatterns();
const baseRef = resolveBaseRef();
const changedFiles = getChangedFiles(baseRef);
const violations = findViolations(changedFiles, patterns);

if (violations.length === 0) {
  console.log(`${GREEN}[lock-files] OK${RESET}`);
  process.exit(0);
}

console.error(`${RED}[lock-files] VIOLATION${RESET}`);
console.error(`Base ref: ${baseRef}`);
console.error("Protected files changed:");
for (const file of violations) {
  console.error(`  - ${file}`);
}
console.error("See CONTRIBUTING.md § Protected Files for the override process.");
process.exit(1);