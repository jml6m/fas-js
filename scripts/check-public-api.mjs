/**
 * CI gate: npm entry is src/modules.ts only; built lib exports match contract.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __file = fileURLToPath(import.meta.url);
const __dir = dirname(__file);
const root = resolve(__dir, "..");
const require = createRequire(import.meta.url);

/** Runtime enumerable exports (type-only exports do not appear on Object.keys). */
export const PUBLIC_EXPORTS = ["createFSA", "simulateFSA", "stepOnceFSA"];
/**
 * Published `.d.ts` contract: three functions + type `TransitionInput` (intentional —
 * consumers type `createFSA` transition arrays). Do not drop the type without a major.
 */
export const DTS_EXPORT_PATTERN =
  /export\s*\{\s*type\s+TransitionInput\s*,\s*createFSA\s*,\s*simulateFSA\s*,\s*stepOnceFSA\s*\}\s*;/;

/**
 * Throws unless `mod`'s own enumerable keys are exactly PUBLIC_EXPORTS.
 */
export function assertKeys(mod, label) {
  const keys = Object.keys(mod).sort();
  const expected = [...PUBLIC_EXPORTS].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected [${expected}], got [${keys}]`);
  }
}

/**
 * Throws unless tsup is configured to build both entries from src/modules.ts.
 */
export function assertTsupEntries(tsupSource) {
  if (!tsupSource.includes('entry: { index: "src/modules.ts" }')) {
    throw new Error('tsup index entry must be src/modules.ts');
  }
  if (!tsupSource.includes('entry: { bundle: "src/modules.ts" }')) {
    throw new Error('tsup bundle entry must be src/modules.ts');
  }
}

/**
 * Throws unless the emitted lib/index.d.ts export line matches the contract.
 */
export function assertDtsExports(dtsSource) {
  if (!DTS_EXPORT_PATTERN.test(dtsSource)) {
    throw new Error("lib/index.d.ts exports do not match public API contract");
  }
}

export async function runCheck({ rootDir = root } = {}) {
  assertTsupEntries(readFileSync(resolve(rootDir, "tsup.config.ts"), "utf8"));
  assertDtsExports(readFileSync(resolve(rootDir, "lib/index.d.ts"), "utf8"));

  const esm = await import(pathToFileURL(resolve(rootDir, "lib/index.js")).href);
  assertKeys(esm, "lib/index.js");

  const cjs = require(resolve(rootDir, "lib/index.cjs"));
  assertKeys(cjs, "lib/index.cjs");

  console.log("[check-public-api] OK — three-function public API on ESM, CJS, and index.d.ts");
}

if (process.argv[1] && resolve(process.argv[1]) === __file) {
  await runCheck();
}
