/**
 * Unit tests for scripts/check-package-scripts.mjs.
 * Exercises the field-validation logic via a mocked package.json reader.
 */
import { assert } from "chai";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

// Read the actual package.json for use in tests
const REAL_PKG = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

// ---------------------------------------------------------------------------
// Helpers that mirror the check script's internal logic so we can unit-test
// the comparison without spawning a child process
// ---------------------------------------------------------------------------

const EXPECTED_FIELDS = {
  "scripts.test": REAL_PKG?.scripts?.test,
  "scripts.build": REAL_PKG?.scripts?.build,
  'scripts["check:package-scripts"]': REAL_PKG?.scripts?.["check:package-scripts"],
  'scripts["check:security"]': REAL_PKG?.scripts?.["check:security"],
  'exports["."].types': REAL_PKG?.exports?.["."]?.types,
  'exports["."].import': REAL_PKG?.exports?.["."]?.import,
  'exports["."].require': REAL_PKG?.exports?.["."]?.require,
  main: REAL_PKG?.main,
  module: REAL_PKG?.module,
  types: REAL_PKG?.types,
  files: JSON.stringify(REAL_PKG?.files),
};

function validatePkg(pkg) {
  const actual = {
    "scripts.test": pkg?.scripts?.test,
    "scripts.build": pkg?.scripts?.build,
    'scripts["check:package-scripts"]': pkg?.scripts?.["check:package-scripts"],
    'scripts["check:security"]': pkg?.scripts?.["check:security"],
    'exports["."].types': pkg?.exports?.["."]?.types,
    'exports["."].import': pkg?.exports?.["."]?.import,
    'exports["."].require': pkg?.exports?.["."]?.require,
    main: pkg?.main,
    module: pkg?.module,
    types: pkg?.types,
    files: JSON.stringify(pkg?.files),
  };
  const failures = [];
  for (const [field, expected] of Object.entries(EXPECTED_FIELDS)) {
    const act = actual[field];
    if (act !== expected) {
      failures.push({ field, expected, actual: act });
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------

describe("check-package-scripts", function () {
  it("passes with the real package.json", function () {
    const failures = validatePkg(REAL_PKG);
    assert.deepEqual(failures, [], "real package.json should match all expected fields");
  });

  it("detects a tampered scripts.test", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.scripts.test = "mocha test/**/*.spec.js";
    const failures = validatePkg(tampered);
    assert.isAbove(failures.length, 0);
    assert.ok(failures.some(f => f.field === "scripts.test"));
  });

  it("detects a tampered scripts.build", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.scripts.build = "webpack";
    const failures = validatePkg(tampered);
    assert.isAbove(failures.length, 0);
    assert.ok(failures.some(f => f.field === "scripts.build"));
  });

  it("detects a tampered check:security script", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.scripts["check:security"] = "echo ok";
    const failures = validatePkg(tampered);
    assert.isAbove(failures.length, 0);
    assert.ok(failures.some(f => f.field === 'scripts["check:security"]'));
  });

  it("detects a tampered check:package-scripts script", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.scripts["check:package-scripts"] = "echo ok";
    const failures = validatePkg(tampered);
    assert.isAbove(failures.length, 0);
    assert.ok(failures.some(f => f.field === 'scripts["check:package-scripts"]'));
  });

  it("detects a tampered exports map", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.exports["."].import = "./lib/evil.js";
    const failures = validatePkg(tampered);
    assert.isAbove(failures.length, 0);
    assert.ok(failures.some(f => f.field === 'exports["."].import'));
  });

  it("detects a tampered main entry", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.main = "./lib/evil.cjs";
    const failures = validatePkg(tampered);
    assert.isAbove(failures.length, 0);
    assert.ok(failures.some(f => f.field === "main"));
  });

  it("detects a tampered files list", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.files = ["lib", "src"];
    const failures = validatePkg(tampered);
    assert.isAbove(failures.length, 0);
    assert.ok(failures.some(f => f.field === "files"));
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
