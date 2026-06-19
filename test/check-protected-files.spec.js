/**
 * Unit tests for scripts/check-protected-files.mjs.
 * All runs are mocked — no real git commands or file I/O.
 */
import { assert } from "chai";
import {
  globToRegExp,
  findViolations,
  runCheck,
} from "../scripts/check-protected-files.mjs";

// ─── globToRegExp ────────────────────────────────────────────────────────────

describe("globToRegExp", function () {
  it("matches an exact path", function () {
    const re = globToRegExp("package.json");
    assert.isTrue(re.test("package.json"));
    assert.isFalse(re.test("src/package.json"));
    assert.isFalse(re.test("package.json.bak"));
  });

  it("matches ** wildcard across path segments", function () {
    const re = globToRegExp("test/helpers/**");
    assert.isTrue(re.test("test/helpers/foo.js"));
    assert.isTrue(re.test("test/helpers/sub/bar.js"));
    assert.isFalse(re.test("test/foo.js"));
    assert.isFalse(re.test("test/helpersfoo.js"));
  });

  it("matches * wildcard within a single path segment", function () {
    const re = globToRegExp("scripts/*.mjs");
    assert.isTrue(re.test("scripts/check-public-api.mjs"));
    assert.isFalse(re.test("scripts/sub/check.mjs"));
    assert.isFalse(re.test("scripts/check.js"));
  });

  it("escapes regex special characters in literal parts", function () {
    const re = globToRegExp(".github/PROTECTED_FILES.json");
    assert.isTrue(re.test(".github/PROTECTED_FILES.json"));
    assert.isFalse(re.test("XgithubYPROTECTED_FILESZjson"));
  });

  it("normalises Windows backslashes in the pattern", function () {
    const re = globToRegExp("src\\modules.ts");
    assert.isTrue(re.test("src/modules.ts"));
  });
});

// ─── findViolations ──────────────────────────────────────────────────────────

describe("findViolations", function () {
  const patterns = [
    globToRegExp("package.json"),
    globToRegExp("test/helpers/**"),
    globToRegExp("src/modules.ts"),
  ];

  it("returns an empty array when no changed file matches", function () {
    assert.deepEqual(findViolations(["src/other.ts", "README.md"], patterns), []);
  });

  it("returns only the matching files", function () {
    const violations = findViolations(
      ["src/modules.ts", "src/other.ts", "README.md"],
      patterns
    );
    assert.deepEqual(violations, ["src/modules.ts"]);
  });

  it("returns multiple violations sorted", function () {
    const violations = findViolations(
      ["src/modules.ts", "package.json", "test/helpers/foo.js"],
      patterns
    );
    assert.deepEqual(violations, [
      "package.json",
      "src/modules.ts",
      "test/helpers/foo.js",
    ]);
  });

  it("deduplicates repeated file paths", function () {
    const violations = findViolations(
      ["package.json", "package.json", "package.json"],
      patterns
    );
    assert.deepEqual(violations, ["package.json"]);
  });

  it("normalises Windows backslashes in file paths", function () {
    const violations = findViolations(["src\\modules.ts"], patterns);
    assert.deepEqual(violations, ["src/modules.ts"]);
  });

  it("returns empty array when changedFiles is empty", function () {
    assert.deepEqual(findViolations([], patterns), []);
  });
});

// ─── runCheck (main orchestration) ──────────────────────────────────────────

describe("runCheck", function () {
  function makeCapture() {
    const logs = [];
    const errors = [];
    let exitCode = null;
    return {
      log: (msg) => logs.push(msg),
      error: (msg) => errors.push(msg),
      exit: (code) => { exitCode = code; },
      get logs() { return logs; },
      get errors() { return errors; },
      get exitCode() { return exitCode; },
    };
  }

  it("exits 0 and logs OK when there are no violations", function () {
    const cap = makeCapture();
    runCheck({
      loadPatternsFn: () => [globToRegExp("package.json")],
      resolveBaseRefFn: () => "master",
      getChangedFilesFn: () => ["src/foo.ts", "README.md"],
      findViolationsFn: () => [],
      log: cap.log,
      error: cap.error,
      exit: cap.exit,
    });

    assert.equal(cap.exitCode, 0);
    assert.isTrue(cap.logs.some((l) => l.includes("[lock-files] OK")));
    assert.isEmpty(cap.errors);
  });

  it("exits 1 and reports violations when protected files are changed", function () {
    const cap = makeCapture();
    runCheck({
      loadPatternsFn: () => [globToRegExp("package.json")],
      resolveBaseRefFn: () => "chore/v1.7-repo-org",
      getChangedFilesFn: () => ["package.json", "src/foo.ts"],
      findViolationsFn: () => ["package.json"],
      log: cap.log,
      error: cap.error,
      exit: cap.exit,
    });

    assert.equal(cap.exitCode, 1);
    assert.isTrue(cap.errors.some((e) => e.includes("[lock-files] VIOLATION")));
    assert.isTrue(cap.errors.some((e) => e.includes("Base ref: chore/v1.7-repo-org")));
    assert.isTrue(cap.errors.some((e) => e.includes("package.json")));
    assert.isTrue(cap.errors.some((e) => e.includes("CONTRIBUTING.md")));
  });

  it("lists every violation file individually", function () {
    const cap = makeCapture();
    runCheck({
      loadPatternsFn: () => [],
      resolveBaseRefFn: () => "master",
      getChangedFilesFn: () => [],
      findViolationsFn: () => ["package.json", "src/modules.ts"],
      log: cap.log,
      error: cap.error,
      exit: cap.exit,
    });

    assert.isTrue(cap.errors.some((e) => e.includes("package.json")));
    assert.isTrue(cap.errors.some((e) => e.includes("src/modules.ts")));
  });

  it("propagates errors thrown by loadPatterns", function () {
    assert.throws(
      () =>
        runCheck({
          loadPatternsFn: () => {
            throw new Error("bad config file");
          },
          exit: () => {},
        }),
      /bad config file/
    );
  });

  it("propagates errors thrown by resolveBaseRef", function () {
    assert.throws(
      () =>
        runCheck({
          loadPatternsFn: () => [],
          resolveBaseRefFn: () => {
            throw new Error("invalid ref");
          },
          exit: () => {},
        }),
      /invalid ref/
    );
  });

  it("propagates errors thrown by getChangedFiles (fail closed)", function () {
    assert.throws(
      () =>
        runCheck({
          loadPatternsFn: () => [],
          resolveBaseRefFn: () => "master",
          getChangedFilesFn: () => {
            throw new Error("git diff failed");
          },
          exit: () => {},
        }),
      /git diff failed/
    );
  });
});
