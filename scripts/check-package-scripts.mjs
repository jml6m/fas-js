import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, '..');

const raw = readFileSync(resolve(root, 'package.json'), 'utf8');
const pkg = JSON.parse(raw);
const lockConfigRaw = readFileSync(resolve(root, 'scripts/check-package-scripts.lock.json'), 'utf8');
const lockConfig = JSON.parse(lockConfigRaw);

function omitUnlockedTopLevel(pkgJson, unlockedTopLevelKeys) {
  return Object.fromEntries(
    Object.entries(pkgJson).filter(([key]) => !unlockedTopLevelKeys.includes(key)),
  );
}

function normalize(value, path = []) {
  if (Array.isArray(value)) {
    if (path.join('.') === 'files') {
      return [...new Set(value)].sort();
    }
    return value.map(item => normalize(item, path));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, normalize(child, [...path, key])]),
    );
  }
  return value;
}

const actualLocked = normalize(omitUnlockedTopLevel(pkg, lockConfig.unlockedTopLevelKeys ?? []));
const expectedLocked = normalize(lockConfig.expectedLockedPackage);

const actualStr = JSON.stringify(actualLocked);
const expectedStr = JSON.stringify(expectedLocked);

if (actualStr !== expectedStr) {
  console.error('[check-package-scripts] FAIL — locked package.json content changed');
  console.error('Update scripts/check-package-scripts.lock.json if this change is intentional.');
  process.exit(1);
}

console.log('[check-package-scripts] OK — locked package.json content matches expected snapshot');
