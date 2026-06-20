/**
 * CI gate: critical package.json fields must not silently change.
 *
 * Rationale: package.json cannot be split into sub-files, so we cannot lock the
 * whole file (version bumps, new devDependencies, etc. must flow freely). Instead
 * this script locks only the fields whose mutation would break the CI security
 * model — specifically the test pipeline command, the security-check command,
 * the build command, the publish-time entry-points, and the npm-pack include list.
 *
 * If any of these fields need to change intentionally, update both package.json
 * AND the expected values below in the same PR. This script is itself locked in
 * .github/PROTECTED_FILES.json so the expected values cannot be silently altered.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

const raw = readFileSync(resolve(root, "package.json"), "utf8");
const pkg = JSON.parse(raw);

// ---------------------------------------------------------------------------
// Expected values — update these together with package.json when intentional
// ---------------------------------------------------------------------------
const checks = [
  {
    field: 'scripts.test',
    actual: pkg?.scripts?.test,
    expected:
      'npm run typecheck && npm run lint && npm run build && npm run check:security && cross-env NODE_OPTIONS=--import=tsx c8 mocha "test/**/*.spec.js"',
  },
  {
    field: 'scripts.build',
    actual: pkg?.scripts?.build,
    expected: 'tsup',
  },
  {
    field: 'scripts["check:package-scripts"]',
    actual: pkg?.scripts?.["check:package-scripts"],
    expected: 'node scripts/check-package-scripts.mjs',
  },
  {
    field: 'scripts["check:security"]',
    actual: pkg?.scripts?.["check:security"],
    expected:
      'node scripts/check-public-api.mjs && node scripts/check-npm-pack.mjs && node scripts/check-package-scripts.mjs',
  },
  {
    field: 'exports["."].types',
    actual: pkg?.exports?.["."]?.types,
    expected: './lib/index.d.ts',
  },
  {
    field: 'exports["."].import',
    actual: pkg?.exports?.["."]?.import,
    expected: './lib/index.js',
  },
  {
    field: 'exports["."].require',
    actual: pkg?.exports?.["."]?.require,
    expected: './lib/index.cjs',
  },
  {
    field: 'main',
    actual: pkg?.main,
    expected: './lib/index.cjs',
  },
  {
    field: 'module',
    actual: pkg?.module,
    expected: './lib/index.js',
  },
  {
    field: 'types',
    actual: pkg?.types,
    expected: './lib/index.d.ts',
  },
  {
    field: 'files',
    actual: JSON.stringify(pkg?.files),
    expected: JSON.stringify(['lib']),
  },
];
// ---------------------------------------------------------------------------

let failures = 0;
for (const { field, actual, expected } of checks) {
  const actualStr = typeof actual === 'string' ? actual : JSON.stringify(actual);
  const expectedStr = typeof expected === 'string' ? expected : JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    console.error(`[check-package-scripts] MISMATCH in ${field}`);
    console.error(`  expected: ${expectedStr}`);
    console.error(`  actual:   ${actualStr}`);
    failures++;
  }
}

if (failures > 0) {
  console.error(
    '\n[check-package-scripts] FAIL — update scripts/check-package-scripts.mjs together with package.json'
  );
  process.exit(1);
}

console.log('[check-package-scripts] OK — critical package.json fields match expected values');
