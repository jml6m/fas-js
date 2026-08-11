/**
 * Published npm / demo bundle API contract — shared by artifact and demo tests.
 * Runtime export list is the single source in scripts/check-public-api.mjs.
 */
import { PUBLIC_EXPORTS } from "../../scripts/check-public-api.mjs";

export const PUBLIC_API_EXPORTS = PUBLIC_EXPORTS;

export const INTERNAL_EXPORT_DENYLIST = [
  "RegularLanguage",
  "subsetConstruction",
  "LanguageOperations",
  "Language",
  "buildFromDefinition",
  "exportFSADefinition",
  "NFA",
  "DFA",
];

export function assertExactPublicExports(api, label) {
  const keys = Object.keys(api).sort();
  if (JSON.stringify(keys) !== JSON.stringify([...PUBLIC_API_EXPORTS].sort())) {
    throw new Error(
      `${label}: expected exports [${PUBLIC_API_EXPORTS.join(", ")}], got [${keys.join(", ")}]`
    );
  }
}

export function assertInternalExportsAbsent(api, label) {
  for (const name of INTERNAL_EXPORT_DENYLIST) {
    if (api[name] !== undefined) {
      throw new Error(`${label}: internal export "${name}" must not be exposed`);
    }
  }
}

export function assertPublicApiSurface(api, label) {
  assertExactPublicExports(api, label);
  assertInternalExportsAbsent(api, label);
  for (const name of PUBLIC_API_EXPORTS) {
    if (typeof api[name] !== "function") {
      throw new Error(`${label}: ${name} must be a function`);
    }
  }
}
