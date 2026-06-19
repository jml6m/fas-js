/**
 * CI gate: fail when a PR touches paths listed in .github/PROTECTED_FILES.json.
 */
import { execFileSync } from "node:child_process";
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

export function loadPatterns(baseSha) {
  let content;
  try {
    content = execFileSync(
      "git",
      ["show", `${baseSha}:.github/PROTECTED_FILES.json`],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
  } catch {
    // File does not exist at the base SHA ΓÇö no protected paths defined yet
    return [];
  }
  const config = JSON.parse(content);
  if (!Array.isArray(config.patterns) || config.patterns.length === 0) {
    throw new Error(".github/PROTECTED_FILES.json must define a non-empty patterns array");
  }
  return config.patterns.map(globToRegExp);
}

export function resolveBaseSha() {
  const baseSha = process.env.BASE_SHA ?? process.env.PROTECTED_FILES_BASE_SHA;
  if (!baseSha) {
    throw new Error(
      "BASE_SHA is required (set automatically in CI; for local runs set PROTECTED_FILES_BASE_SHA to a full commit SHA)"
    );
  }
  if (!/^[0-9a-f]{40}$/i.test(baseSha)) {
    throw new Error(`Invalid base SHA: ${baseSha}`);
  }
  return baseSha;
}

export function getChangedFiles(baseSha) {
  try {
    const output = execFileSync("git", ["diff", baseSha, "HEAD", "--name-only"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return output ? output.split(/\r?\n/).filter(Boolean) : [];
  } catch (err) {
    throw new Error(
      `[lock-files] git diff failed for base SHA "${baseSha}": ${err.message}`
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
  resolveBaseShaFn = resolveBaseSha,
  getChangedFilesFn = getChangedFiles,
  findViolationsFn = findViolations,
  log = (msg) => console.log(msg),
  error = (msg) => console.error(msg),
  exit = (code) => process.exit(code),
} = {}) {
  const baseSha = resolveBaseShaFn();
  const patterns = loadPatternsFn(baseSha);
  const changedFiles = getChangedFilesFn(baseSha);
  const violations = findViolationsFn(changedFiles, patterns);

  if (violations.length === 0) {
    log(`${GREEN}[lock-files] OK${RESET}`);
    exit(0);
    return;
  }

  error(`${RED}[lock-files] VIOLATION${RESET}`);
  error(`Base SHA: ${baseSha}`);
  error("Protected files changed:");
  for (const file of violations) {
    error(`  - ${file}`);
  }
  error("See CONTRIBUTING.md ┬º Protected Files for the override process.");
  exit(1);
}

if (resolve(process.argv[1] ?? "") === __file) {
  runCheck();
}
