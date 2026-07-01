/**
 * CI gate: guard-test completeness.
 *
 * Every guard script (scripts/check-*.mjs) must have a matching unit-test spec
 * (test/check-*.spec.js). This is a STRUCTURAL guarantee independent of line
 * coverage: incidental execution of a guard during check:security can make it
 * "covered" without a dedicated test proving its behavior. Fail-closed — an
 * untested guard blocks CI.
 *
 * This guard is itself a check-*.mjs, so it is subject to its own rule and ships
 * with test/check-guard-tests.spec.js.
 */
import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __file = fileURLToPath(import.meta.url);
const __dir = dirname(__file);
const root = resolve(__dir, "..");

const GUARD_PREFIX = "check-";
const GUARD_SUFFIX = ".mjs";
const SPEC_SUFFIX = ".spec.js";

/**
 * The stem of a guard script filename (e.g. "check-public-api.mjs" -> "check-public-api").
 * Returns null for non-guard filenames.
 */
export function guardStem(filename) {
  if (!filename.startsWith(GUARD_PREFIX) || !filename.endsWith(GUARD_SUFFIX)) {
    return null;
  }
  return filename.slice(0, -GUARD_SUFFIX.length);
}

/**
 * Given the list of files in scripts/ and test/, return the guard stems that
 * lack a matching test/<stem>.spec.js. Pure — no filesystem access.
 */
export function findUntestedGuards(scriptFiles, testFiles) {
  const specs = new Set(
    testFiles.filter(f => f.endsWith(SPEC_SUFFIX)).map(f => f.slice(0, -SPEC_SUFFIX.length))
  );
  const missing = [];
  for (const file of scriptFiles) {
    const stem = guardStem(file);
    if (stem === null) continue;
    if (!specs.has(stem)) missing.push(stem);
  }
  return missing.sort();
}

export function runCheck({
  scriptsDir = resolve(root, "scripts"),
  testDir = resolve(root, "test"),
  readDir = readdirSync,
  log = msg => console.log(msg),
  error = msg => console.error(msg),
  exit = code => process.exit(code),
} = {}) {
  const scriptFiles = readDir(scriptsDir);
  const testFiles = readDir(testDir);
  const missing = findUntestedGuards(scriptFiles, testFiles);

  if (missing.length === 0) {
    const guardCount = scriptFiles.filter(f => guardStem(f) !== null).length;
    log(`[check-guard-tests] OK — all ${guardCount} guard scripts have a matching spec`);
    exit(0);
    return;
  }

  error("[check-guard-tests] FAIL — guard scripts without a matching test/<name>.spec.js:");
  for (const stem of missing) {
    error(`  - scripts/${stem}.mjs  (add test/${stem}.spec.js)`);
  }
  exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === __file) {
  runCheck();
}
