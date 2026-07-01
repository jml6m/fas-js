/**
 * Unit tests for scripts/check-guard-tests.mjs (the guard-test completeness gate).
 */
import { assert } from "chai";
import { guardStem, findUntestedGuards, runCheck } from "../scripts/check-guard-tests.mjs";

describe("check-guard-tests", function () {
  describe("guardStem", function () {
    it("returns the stem for a guard script", function () {
      assert.equal(guardStem("check-public-api.mjs"), "check-public-api");
    });

    it("returns null for a non-guard .mjs script", function () {
      assert.isNull(guardStem("postbuild.mjs"));
    });

    it("returns null for a spec file", function () {
      assert.isNull(guardStem("check-public-api.spec.js"));
    });

    it("returns null for a .js file that starts with check-", function () {
      assert.isNull(guardStem("check-thing.js"));
    });
  });

  describe("findUntestedGuards", function () {
    it("returns empty when every guard has a matching spec", function () {
      const scripts = ["check-a.mjs", "check-b.mjs", "postbuild.mjs"];
      const tests = ["check-a.spec.js", "check-b.spec.js", "other.spec.js"];
      assert.deepEqual(findUntestedGuards(scripts, tests), []);
    });

    it("flags a guard with no matching spec", function () {
      const scripts = ["check-a.mjs", "check-b.mjs"];
      const tests = ["check-a.spec.js"];
      assert.deepEqual(findUntestedGuards(scripts, tests), ["check-b"]);
    });

    it("ignores non-guard scripts", function () {
      const scripts = ["postbuild.mjs", "prebuild.mjs", "reinstall.js"];
      assert.deepEqual(findUntestedGuards(scripts, []), []);
    });

    it("does not accept a .mjs spec (must be .spec.js)", function () {
      const scripts = ["check-a.mjs"];
      const tests = ["check-a.mjs"];
      assert.deepEqual(findUntestedGuards(scripts, tests), ["check-a"]);
    });

    it("returns results sorted", function () {
      const scripts = ["check-z.mjs", "check-a.mjs"];
      assert.deepEqual(findUntestedGuards(scripts, []), ["check-a", "check-z"]);
    });
  });

  describe("runCheck", function () {
    function makeCapture() {
      const logs = [];
      const errors = [];
      let exitCode = null;
      return {
        log: m => logs.push(m),
        error: m => errors.push(m),
        exit: c => { exitCode = c; },
        get logs() { return logs; },
        get errors() { return errors; },
        get exitCode() { return exitCode; },
      };
    }

    it("exits 0 when all guards are tested (injected dirs)", function () {
      const cap = makeCapture();
      runCheck({
        readDir: dir =>
          dir.endsWith("scripts") ? ["check-a.mjs", "postbuild.mjs"] : ["check-a.spec.js"],
        log: cap.log,
        error: cap.error,
        exit: cap.exit,
      });
      assert.equal(cap.exitCode, 0);
      assert.isTrue(cap.logs.some(l => l.includes("[check-guard-tests] OK")));
    });

    it("exits 1 and names the untested guard", function () {
      const cap = makeCapture();
      runCheck({
        readDir: dir =>
          dir.endsWith("scripts") ? ["check-a.mjs", "check-b.mjs"] : ["check-a.spec.js"],
        log: cap.log,
        error: cap.error,
        exit: cap.exit,
      });
      assert.equal(cap.exitCode, 1);
      assert.isTrue(cap.errors.some(e => e.includes("check-b")));
    });

    it("passes against the real scripts/ and test/ directories", function () {
      const cap = makeCapture();
      runCheck({ log: cap.log, error: cap.error, exit: cap.exit });
      assert.equal(cap.exitCode, 0, cap.errors.join("\n"));
    });
  });
});
