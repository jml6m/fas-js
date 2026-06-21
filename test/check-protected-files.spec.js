/**
 * Unit tests for scripts/check-protected-files.mjs.
 * Some tests invoke real git commands; the check logic is otherwise exercised via injected functions.
 */
import { execFileSync } from "node:child_process";
import { assert } from "chai";
import {
  globToRegExp,
  findViolations,
  loadPatterns,
  resolveBaseSha,
  runCheck,
} from "../scripts/check-protected-files.mjs";

const FAKE_SHA = "a".repeat(40);

// --- globToRegExp ----------------------------------------------------------

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

  it("normalizes Windows backslashes in the pattern", function () {
    const re = globToRegExp("src\\modules.ts");
    assert.isTrue(re.test("src/modules.ts"));
  });
});

// --- findViolations ---------------------------------------------------------

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

  it("normalizes Windows backslashes in file paths", function () {
    const violations = findViolations(["src\\modules.ts"], patterns);
    assert.deepEqual(violations, ["src/modules.ts"]);
  });

  it("returns empty array when changedFiles is empty", function () {
    assert.deepEqual(findViolations([], patterns), []);
  });
});

// --- loadPatterns ----------------------------------------------------------

describe("loadPatterns", function () {
  it("throws when PROTECTED_FILES.json does not exist at the base SHA (fail-closed)", function () {
    const missingSha = "0".repeat(40);
    assert.throws(() => loadPatterns(missingSha), /failed to read .github\/PROTECTED_FILES\.json from base SHA/);
  });

  it("returns compiled patterns when PROTECTED_FILES.json exists at the base SHA", function () {
    // HEAD on this branch has the file; use HEAD SHA as base
    const headSha = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const patterns = loadPatterns(headSha);
    assert.isArray(patterns);
    assert.isAbove(patterns.length, 0);
    assert.ok(patterns.every((p) => p instanceof RegExp));
  });
});

// --- resolveBaseSha ---------------------------------------------------------

describe("resolveBaseSha", function () {
  const VALID_SHA = "a".repeat(40);

  afterEach(function () {
    delete process.env.BASE_SHA;
    delete process.env.PROTECTED_FILES_BASE_SHA;
  });

  it("returns BASE_SHA when set to a valid 40-char hex string", function () {
    process.env.BASE_SHA = VALID_SHA;
    assert.equal(resolveBaseSha(), VALID_SHA);
  });

  it("falls back to PROTECTED_FILES_BASE_SHA when BASE_SHA is absent", function () {
    const fallback = "b".repeat(40);
    process.env.PROTECTED_FILES_BASE_SHA = fallback;
    assert.equal(resolveBaseSha(), fallback);
  });

  it("throws when neither env var is set", function () {
    assert.throws(() => resolveBaseSha(), /BASE_SHA is required/);
  });

  it("throws when the SHA is not a 40-char hex string", function () {
    process.env.BASE_SHA = "not-a-sha";
    assert.throws(() => resolveBaseSha(), /Invalid base SHA/);
  });

  it("throws when the SHA is shorter than 40 hex chars", function () {
    process.env.BASE_SHA = "a".repeat(39);
    assert.throws(() => resolveBaseSha(), /Invalid base SHA/);
  });
});

// --- runCheck (main orchestration) -----------------------------------------

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

  it("passes baseSha to loadPatternsFn", function () {
    const cap = makeCapture();
    const sha = "c".repeat(40);
    let receivedSha;
    runCheck({
      resolveBaseShaFn: () => sha,
      loadPatternsFn: (s) => { receivedSha = s; return []; },
      getChangedFilesFn: () => [],
      findViolationsFn: () => [],
      log: cap.log,
      error: cap.error,
      exit: cap.exit,
    });
    assert.equal(receivedSha, sha);
  });

  it("exits 0 and logs OK when there are no violations", function () {
    const cap = makeCapture();
    runCheck({
      loadPatternsFn: () => [globToRegExp("package.json")],
      resolveBaseShaFn: () => FAKE_SHA,
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
    const sha = "b".repeat(40);
    runCheck({
      loadPatternsFn: () => [globToRegExp("package.json")],
      resolveBaseShaFn: () => sha,
      getChangedFilesFn: () => ["package.json", "src/foo.ts"],
      findViolationsFn: () => ["package.json"],
      log: cap.log,
      error: cap.error,
      exit: cap.exit,
    });

    assert.equal(cap.exitCode, 1);
    assert.isTrue(cap.errors.some((e) => e.includes("[lock-files] VIOLATION")));
    assert.isTrue(cap.errors.some((e) => e.includes(`Base SHA: ${sha}`)));
    assert.isTrue(cap.errors.some((e) => e.includes("package.json")));
    assert.isTrue(cap.errors.some((e) => e.includes("CONTRIBUTING.md")));
  });

  it("lists every violation file individually", function () {
    const cap = makeCapture();
    runCheck({
      loadPatternsFn: () => [],
      resolveBaseShaFn: () => FAKE_SHA,
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
          resolveBaseShaFn: () => FAKE_SHA,
          loadPatternsFn: () => {
            throw new Error("bad config file");
          },
          exit: () => {},
        }),
      /bad config file/
    );
  });

  it("propagates errors thrown by resolveBaseSha", function () {
    assert.throws(
      () =>
        runCheck({
          loadPatternsFn: () => [],
          resolveBaseShaFn: () => {
            throw new Error("missing SHA");
          },
          exit: () => {},
        }),
      /missing SHA/
    );
  });

  it("propagates errors thrown by getChangedFiles (fail closed)", function () {
    assert.throws(
      () =>
        runCheck({
          loadPatternsFn: () => [],
          resolveBaseShaFn: () => FAKE_SHA,
          getChangedFilesFn: () => {
            throw new Error("git diff failed");
          },
          exit: () => {},
        }),
      /git diff failed/
    );
  });
});
