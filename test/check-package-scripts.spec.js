/**
 * Unit tests for scripts/check-package-scripts.mjs.
 * Exercises package.json critical-field validation via mocked package.json content.
 */
import { assert } from "chai";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePackageJson } from "../scripts/check-package-scripts.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

// Read the actual package.json for use in tests
const REAL_PKG = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const isValid = pkg => validatePackageJson(pkg).length === 0;

describe("check-package-scripts", function () {
  it("passes with the real package.json", function () {
    assert.isTrue(isValid(REAL_PKG));
  });

  it("allows version changes", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.version = "1.7.1";
    assert.isTrue(isValid(tampered));
  });

  it("allows devDependencies changes", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.devDependencies.mocha = "^99.0.0";
    assert.isTrue(isValid(tampered));
  });

  it("detects a tampered scripts.test", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.scripts.test = "mocha test/**/*.spec.js";
    assert.isFalse(isValid(tampered));
  });

  it("detects a tampered check:security script", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.scripts["check:security"] = "echo ok";
    assert.isFalse(isValid(tampered));
  });

  it("detects a tampered exports map", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.exports["."].import = "./lib/evil.js";
    assert.isFalse(isValid(tampered));
  });

  it("detects a tampered files list", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    tampered.files = ["lib", "src"];
    assert.isFalse(isValid(tampered));
  });

  it("allows a reordered files list", function () {
    const reordered = JSON.parse(JSON.stringify(REAL_PKG));
    reordered.files = [...reordered.files].reverse();
    assert.isTrue(isValid(reordered));
  });

  it("detects removal of scripts.build", function () {
    const tampered = JSON.parse(JSON.stringify(REAL_PKG));
    delete tampered.scripts.build;
    assert.isFalse(isValid(tampered));
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
