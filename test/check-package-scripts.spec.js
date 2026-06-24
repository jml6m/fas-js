/**
 * Unit tests for scripts/check-package-scripts.mjs.
 * Exercises package.json lockdown validation via mocked package.json content.
 */
import { assert } from "chai";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

// Read the actual package.json for use in tests
const REAL_PKG = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const LOCK_CONFIG = JSON.parse(
  readFileSync(resolve(root, "scripts/check-package-scripts.lock.json"), "utf8")
);

function omitUnlockedTopLevel(pkgJson, unlockedTopLevelKeys) {
  return Object.fromEntries(
    Object.entries(pkgJson).filter(([key]) => !unlockedTopLevelKeys.includes(key))
  );
}

function normalize(value, path = []) {
  if (Array.isArray(value)) {
    if (path.join(".") === "files") {
      return [...new Set(value)].sort();
    }
    return value.map(item => normalize(item, path));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, normalize(child, [...path, key])])
    );
  }
  return value;
}

function validatePkg(pkg) {
  const actualLocked = normalize(
    omitUnlockedTopLevel(pkg, LOCK_CONFIG.unlockedTopLevelKeys ?? [])
  );
  const expectedLocked = normalize(LOCK_CONFIG.expectedLockedPackage);
  return JSON.stringify(actualLocked) === JSON.stringify(expectedLocked);
}

describe("check-package-scripts", function () {
  it("passes with the real package.json", function () {
    assert.isTrue(validatePkg(REAL_PKG));
  });

  it("allows version changes", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.version = "1.7.1";
    assert.isTrue(validatePkg(tampered));
  });

  it("allows devDependencies changes", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.devDependencies.mocha = "^99.0.0";
    assert.isTrue(validatePkg(tampered));
  });

  it("detects a tampered scripts.test", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.scripts.test = "mocha test/**/*.spec.js";
    assert.isFalse(validatePkg(tampered));
  });

  it("detects a tampered check:security script", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.scripts["check:security"] = "echo ok";
    assert.isFalse(validatePkg(tampered));
  });

  it("detects a tampered exports map", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.exports["."].import = "./lib/evil.js";
    assert.isFalse(validatePkg(tampered));
  });

  it("detects a tampered files list", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.files = ["lib", "src"];
    assert.isFalse(validatePkg(tampered));
  });

  it("allows a reordered files list", function () {
    const reordered = JSON.parse(JSON.stringify(REAL_PKG));
    reordered.files = [...reordered.files].reverse();
    assert.isTrue(validatePkg(reordered));
  });

  it("check-package-scripts.mjs itself exits 0 against the real package.json", async function () {
    const { execFileSync } = await import("node:child_process");
    assert.doesNotThrow(() =>
      execFileSync("node", ["scripts/check-package-scripts.mjs"], {
        cwd: root,
        stdio: "pipe",
        encoding: "utf8",
      })
    );
  });
});
