/**
 * The demo build script: what it writes into the demo's vendor folders, and how it fails.
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

import { assert } from "chai";

import { buildDemo, buildInfoSource } from "../scripts/build-demo.mjs";

describe("demo build script", function() {
  let dir;

  beforeEach(function() {
    dir = mkdtempSync(join(tmpdir(), "fas-js-build-demo-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fas-js", version: "9.8.0" }));
  });

  afterEach(function() {
    rmSync(dir, { recursive: true, force: true });
  });

  it("copies the published bundle and records the package version", function() {
    mkdirSync(join(dir, "lib"));
    writeFileSync(join(dir, "lib/bundle.js"), "var fasJs = {};\n");

    const written = buildDemo({ rootDir: dir });

    assert.deepEqual(written, ["demo/vendor/fas-js.bundle.js", "demo/vendor/build-info.js"]);
    assert.equal(readFileSync(join(dir, "demo/vendor/fas-js.bundle.js"), "utf8"), "var fasJs = {};\n");

    const sandbox = {};
    runInNewContext(readFileSync(join(dir, "demo/vendor/build-info.js"), "utf8"), sandbox);
    assert.deepEqual({ ...sandbox.fasJsDemoBuild }, { version: "9.8.0" });
    assert.isTrue(Object.isFrozen(sandbox.fasJsDemoBuild));
  });

  it("replaces an earlier copy", function() {
    mkdirSync(join(dir, "lib"));
    mkdirSync(join(dir, "demo/vendor"), { recursive: true });
    writeFileSync(join(dir, "demo/vendor/fas-js.bundle.js"), "stale");
    writeFileSync(join(dir, "lib/bundle.js"), "fresh");

    buildDemo({ rootDir: dir });

    assert.equal(readFileSync(join(dir, "demo/vendor/fas-js.bundle.js"), "utf8"), "fresh");
  });

  it("fails with the missing path when the library is not built", function() {
    assert.throws(() => buildDemo({ rootDir: dir }), /missing .*lib[\\/]bundle\.js/);
  });

  it("writes the version as a string literal", function() {
    const sandbox = {};
    runInNewContext(buildInfoSource('1.0.0"; globalThis.injected = true; "'), sandbox);
    assert.equal(sandbox.fasJsDemoBuild.version, '1.0.0"; globalThis.injected = true; "');
    assert.isUndefined(sandbox.injected);
  });
});
