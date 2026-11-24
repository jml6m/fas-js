/**
 * The demo build script: what it writes into the demo's vendor folders, and how it fails.
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runInNewContext } from "node:vm";

import { assert } from "chai";

import { buildDemo, buildInfoSource, currentNoticeText, noticeText, withoutSourceMapComment } from "../scripts/build-demo.mjs";

describe("demo build script", function() {
  let dir;

  function put(relative, content) {
    mkdirSync(dirname(join(dir, relative)), { recursive: true });
    writeFileSync(join(dir, relative), content);
  }

  const get = relative => readFileSync(join(dir, relative), "utf8");

  function version(relative) {
    const sandbox = {};
    runInNewContext(get(relative), sandbox);
    assert.isTrue(Object.isFrozen(sandbox.fasJsDemoBuild));
    return sandbox.fasJsDemoBuild.version;
  }

  /** A tree with the build output and the development dependency the script copies from. */
  function putEverything() {
    put("lib/bundle.js", "var fasJs = {};\n");
    put("node_modules/@hpcc-js/wasm-graphviz/package.json", JSON.stringify({ version: "1.30.0" }));
    put("node_modules/@hpcc-js/wasm-graphviz/dist/index.js", "export const Graphviz = {};\n//# sourceMappingURL=index.js.map\n");
    put("node_modules/@hpcc-js/wasm-graphviz/LICENSE", "Apache License\n");
  }

  beforeEach(function() {
    dir = mkdtempSync(join(tmpdir(), "fas-js-build-demo-"));
    put("package.json", JSON.stringify({ name: "fas-js", version: "9.8.0" }));
  });

  afterEach(function() {
    rmSync(dir, { recursive: true, force: true });
  });

  it("gives the current simulator the published bundle, the package version and the Graphviz build", function() {
    putEverything();

    const written = buildDemo({ rootDir: dir });

    assert.includeMembers(written, ["demo/vendor/fas-js.bundle.js", "demo/vendor/build-info.js"]);
    assert.equal(get("demo/vendor/fas-js.bundle.js"), "var fasJs = {};\n");
    assert.equal(version("demo/vendor/build-info.js"), "9.8.0");
    assert.equal(get("demo/vendor/graphviz.js"), "export const Graphviz = {};\n");
    assert.equal(get("demo/vendor/graphviz.LICENSE.txt"), "Apache License\n");
    assert.include(get("demo/vendor/NOTICE.txt"), "fas-js 9.8.0");
    assert.include(get("demo/vendor/NOTICE.txt"), "@hpcc-js/wasm-graphviz 1.30.0");
    assert.notInclude(get("demo/vendor/NOTICE.txt"), "1.3.1");
  });

  it("gives the original simulator its release's version and the Graphviz build", function() {
    putEverything();

    const written = buildDemo({ rootDir: dir });

    assert.deepEqual(written, [
      "demo/vendor/fas-js.bundle.js",
      "demo/vendor/build-info.js",
      "demo/vendor/graphviz.js",
      "demo/vendor/graphviz.LICENSE.txt",
      "demo/vendor/NOTICE.txt",
      "demo/v1/vendor/build-info.js",
      "demo/v1/vendor/graphviz.js",
      "demo/v1/vendor/graphviz.LICENSE.txt",
      "demo/v1/vendor/NOTICE.txt",
    ]);
    assert.equal(version("demo/v1/vendor/build-info.js"), "1.3.1");
    assert.equal(get("demo/v1/vendor/graphviz.js"), "export const Graphviz = {};\n");
    assert.equal(get("demo/v1/vendor/graphviz.LICENSE.txt"), "Apache License\n");
    assert.include(get("demo/v1/vendor/NOTICE.txt"), "fas-js 1.3.1");
    assert.include(get("demo/v1/vendor/NOTICE.txt"), "@hpcc-js/wasm-graphviz 1.30.0");
  });

  it("replaces an earlier copy", function() {
    putEverything();
    put("demo/vendor/fas-js.bundle.js", "stale");

    buildDemo({ rootDir: dir });

    assert.equal(get("demo/vendor/fas-js.bundle.js"), "var fasJs = {};\n");
  });

  it("names what is missing when the library is not built", function() {
    assert.throws(() => buildDemo({ rootDir: dir }), /missing .*lib[\\/]bundle\.js.*npm run build/);
  });

  it("names what is missing when a dependency is not installed", function() {
    put("lib/bundle.js", "var fasJs = {};\n");
    assert.throws(() => buildDemo({ rootDir: dir }), /missing .*wasm-graphviz[\\/]package\.json.*npm ci/);
  });

  it("reports what it wrote", function() {
    putEverything();
    const lines = [];
    buildDemo({ rootDir: dir, log: line => lines.push(line) });
    assert.lengthOf(lines, 1);
    assert.include(lines[0], "wrote 9 files");
    assert.include(lines[0], "demo/v1/vendor/graphviz.js");
  });

  it("writes the version as a string literal", function() {
    const sandbox = {};
    runInNewContext(buildInfoSource('1.0.0"; globalThis.injected = true; "'), sandbox);
    assert.equal(sandbox.fasJsDemoBuild.version, '1.0.0"; globalThis.injected = true; "');
    assert.isUndefined(sandbox.injected);
  });

  it("drops only a trailing source map comment", function() {
    assert.equal(withoutSourceMapComment("a();\n//# sourceMappingURL=a.js.map\n"), "a();\n");
    assert.equal(withoutSourceMapComment("a();\n//# sourceMappingURL=a.js.map"), "a();\n");
    assert.equal(withoutSourceMapComment("a();\n"), "a();\n");
    const inside = 'const s = "//# sourceMappingURL=x";\nb();\n';
    assert.equal(withoutSourceMapComment(inside), inside);
  });

  it("names both packages and their licences in each notice", function() {
    for (const notice of [
      noticeText({ libraryVersion: "1.3.1", graphvizVersion: "1.30.0" }),
      currentNoticeText({ libraryVersion: "9.8.0", graphvizVersion: "1.30.0" }),
    ]) {
      assert.include(notice, "GPL-3.0-or-later");
      assert.include(notice, "Apache License 2.0");
      assert.include(notice, "Eclipse Public License");
      assert.include(notice, "@hpcc-js/wasm-graphviz 1.30.0");
    }
    assert.include(currentNoticeText({ libraryVersion: "9.8.0", graphvizVersion: "1.30.0" }), "fas-js.bundle.js: fas-js 9.8.0");
  });
});
