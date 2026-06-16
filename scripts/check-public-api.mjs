/**
 * CI gate: npm entry is src/modules.ts only; built lib exports match contract.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const require = createRequire(import.meta.url);

const PUBLIC_EXPORTS = ["createFSA", "simulateFSA", "stepOnceFSA"];
const DTS_EXPORT_PATTERN =
  /export\s*\{\s*type\s+TransitionInput\s*,\s*createFSA\s*,\s*simulateFSA\s*,\s*stepOnceFSA\s*\}\s*;/;

function assertKeys(mod, label) {
  const keys = Object.keys(mod).sort();
  const expected = [...PUBLIC_EXPORTS].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected [${expected}], got [${keys}]`);
  }
}

const tsup = readFileSync(resolve(root, "tsup.config.ts"), "utf8");
if (!tsup.includes('entry: { index: "src/modules.ts" }')) {
  throw new Error('tsup index entry must be src/modules.ts');
}
if (!tsup.includes('entry: { bundle: "src/modules.ts" }')) {
  throw new Error('tsup bundle entry must be src/modules.ts');
}

const dts = readFileSync(resolve(root, "lib/index.d.ts"), "utf8");
if (!DTS_EXPORT_PATTERN.test(dts)) {
  throw new Error("lib/index.d.ts exports do not match public API contract");
}

const esm = await import(pathToFileURL(resolve(root, "lib/index.js")).href);
assertKeys(esm, "lib/index.js");

const cjs = require(resolve(root, "lib/index.cjs"));
assertKeys(cjs, "lib/index.cjs");

console.log("[check-public-api] OK — three-function public API on ESM, CJS, and index.d.ts");