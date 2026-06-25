/**
 * CI gate: critical package.json fields must not silently change.
 *
 * package.json itself is intentionally mutable (version/dependency churn).
 * This script only enforces publish/security-critical fields.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, '..');

export function normalizeStringSet(value) {
  if (!Array.isArray(value)) return value;
  return [...new Set(value)].sort();
}

const EXPECTED_FILES = normalizeStringSet([
  'lib/index.js',
  'lib/index.cjs',
  'lib/index.d.ts',
  'lib/index.d.cts',
  'lib/bundle.js',
]);

export function validatePackageJson(pkg) {
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
      actual: pkg?.scripts?.['check:package-scripts'],
      expected: 'node scripts/check-package-scripts.mjs',
    },
    {
      field: 'scripts["check:security"]',
      actual: pkg?.scripts?.['check:security'],
      expected: 'node scripts/check-public-api.mjs && node scripts/check-npm-pack.mjs',
    },
    {
      field: 'scripts.prepublishOnly',
      actual: pkg?.scripts?.prepublishOnly,
      expected: 'npm run build && npm test',
    },
    {
      field: 'exports["."].types',
      actual: pkg?.exports?.['.']?.types,
      expected: './lib/index.d.ts',
    },
    {
      field: 'exports["."].import',
      actual: pkg?.exports?.['.']?.import,
      expected: './lib/index.js',
    },
    {
      field: 'exports["."].require',
      actual: pkg?.exports?.['.']?.require,
      expected: './lib/index.cjs',
    },
    {
      field: 'exports["./bundle"].default',
      actual: pkg?.exports?.['./bundle']?.default,
      expected: './lib/bundle.js',
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
      actual: normalizeStringSet(pkg?.files),
      expected: EXPECTED_FILES,
    },
  ];

  return checks.filter(({ actual, expected }) => {
    const actualStr = typeof actual === 'string' ? actual : JSON.stringify(actual);
    const expectedStr = typeof expected === 'string' ? expected : JSON.stringify(expected);
    return actualStr !== expectedStr;
  });
}

export function runCheck({ log = console.log, error = console.error, exit = process.exit } = {}) {
  const raw = readFileSync(resolve(root, 'package.json'), 'utf8');
  const pkg = JSON.parse(raw);
  const failures = validatePackageJson(pkg);

  for (const { field, actual, expected } of failures) {
    const actualStr = typeof actual === 'string' ? actual : JSON.stringify(actual);
    const expectedStr = typeof expected === 'string' ? expected : JSON.stringify(expected);
    error(`[check-package-scripts] MISMATCH in ${field}`);
    error(`  expected: ${expectedStr}`);
    error(`  actual:   ${actualStr}`);
  }

  if (failures.length > 0) {
    error('\n[check-package-scripts] FAIL — update scripts/check-package-scripts.mjs together with package.json');
    exit(1);
    return;
  }

  log('[check-package-scripts] OK — critical package.json fields match expected values');
  exit(0);
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  runCheck();
}
