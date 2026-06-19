/**
 * CI gate: fail when a PR touches paths listed in .github/PROTECTED_FILES.json.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __file = fileURLToPath(import.meta.url);
const __dir = dirname(__file);
const root = resolve(__dir, "..");

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

export function globToRegExp(pattern) {
  const normalized = pattern.replace(/\\/g, "/");
  const escaped = normalized
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{DOUBLESTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{DOUBLESTAR}}/g, ".*");
  return new RegExp(`^${escaped}$`);
}

export function loadPatterns() {
  const configPath = resolve(root, ".github/PROTECTED_FILES.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  if (!Array.isArray(config.patterns) || config.patterns.length === 0) {
    throw new Error(".github/PROTECTED_FILES.json must define a non-empty patterns array");
  }
  return config.patterns.map(globToRegExp);
}

export function resolveBaseRef() {
  const baseRef =
    process.env.GITHUB_BASE_REF ??
    process.env.PROTECTED_FILES_BASE_REF ??
    "master";

  if (!/^[0-9A-Za-z._/-]+$/.test(baseRef)) {
    throw new Error(`Invalid base ref: ${baseRef}`);
  }

  return baseRef;
}

export function getChangedFiles(baseRef) {
  const remoteRef = `origin/${baseRef}`;
  try {
    const output = execSync(`git diff ${remoteRef}...HEAD --name-only`, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return output ? output.split(/\r?\n/).filter(Boolean) : [];
  } catch (err) {
    throw new Error(
      `[lock-files] git diff failed for base ref "${baseRef}": ${err.message}`
    );
  }
}

export function findViolations(changedFiles, patterns) {
  const violations = [];
  for (const file of changedFiles) {
    const normalized = file.replace(/\\/g, "/");
    if (patterns.some(pattern => pattern.test(normalized))) {
      violations.push(normalized);
    }
  }
  return [...new Set(violations)].sort();
}

export function runCheck({
  loadPatternsFn = loadPatterns,
  resolveBaseRefFn = resolveBaseRef,
  getChangedFilesFn = getChangedFiles,
  findViolationsFn = findViolations,
  log = (msg) => console.log(msg),
  error = (msg) => console.error(msg),
  exit = (code) => process.exit(code),
} = {}) {
  const patterns = loadPatternsFn();
  const baseRef = resolveBaseRefFn();
  const changedFiles = getChangedFilesFn(baseRef);
  const violations = findViolationsFn(changedFiles, patterns);

  if (violations.length === 0) {
    log(`${GREEN}[lock-files] OK${RESET}`);
    exit(0);
    return;
  }

  error(`${RED}[lock-files] VIOLATION${RESET}`);
  error(`Base ref: ${baseRef}`);
  error("Protected files changed:");
  for (const file of violations) {
    error(`  - ${file}`);
  }
  error("See CONTRIBUTING.md § Protected Files for the override process.");
  exit(1);
}

if (resolve(process.argv[1] ?? "") === __file) {
  runCheck();
}