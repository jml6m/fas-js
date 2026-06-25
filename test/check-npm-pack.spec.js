import { assert } from "chai";
import {
  parseTarballNameFromPackOutput,
  validatePackEntries,
} from "../scripts/check-npm-pack.mjs";

describe("check-npm-pack", function () {
  describe("parseTarballNameFromPackOutput", function () {
    it("parses standard npm pack output", function () {
      assert.equal(parseTarballNameFromPackOutput("fas-js-0.0.0-test.tgz\n"), "fas-js-0.0.0-test.tgz");
    });

    it("parses output with extra lines and path prefixes", function () {
      const output = "npm notice prep\n/tmp/fas-js-1.8.0+meta.tgz\n";
      assert.equal(parseTarballNameFromPackOutput(output), "fas-js-1.8.0+meta.tgz");
    });

    it("parses Windows-style path prefixes", function () {
      const output = "npm notice prep\nC:\\temp\\fas-js-1.8.0-rc.1.tgz\n";
      assert.equal(parseTarballNameFromPackOutput(output), "fas-js-1.8.0-rc.1.tgz");
    });

    it("throws when no tarball filename is present", function () {
      assert.throws(
        () => parseTarballNameFromPackOutput("npm notice done\n"),
        /did not report tarball name/
      );
    });
  });

  describe("validatePackEntries", function () {
    const validEntries = [
      "package/package.json",
      "package/README.md",
      "package/LICENSE",
      "package/lib/index.js",
      "package/lib/index.cjs",
      "package/lib/index.d.ts",
      "package/lib/index.d.cts",
      "package/lib/bundle.js",
    ];

    it("accepts the locked manifest entries", function () {
      assert.doesNotThrow(() => validatePackEntries(validEntries));
    });

    it("rejects forbidden lib files", function () {
      assert.throws(
        () => validatePackEntries([...validEntries, "package/lib/demo-bundle.js"]),
        /forbidden lib path/
      );
    });

    it("rejects missing required lib files", function () {
      const entriesWithMissingFile = validEntries.filter((entry) => entry !== "package/lib/index.d.cts");
      assert.throws(() => validatePackEntries(entriesWithMissingFile), /missing required lib files/);
    });
  });
});
