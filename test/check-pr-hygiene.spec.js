/**
 * Unit tests for scripts/check-pr-hygiene.mjs.
 */
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assert } from "chai";
import { EXCEPTION_LABEL } from "../scripts/check-protected-files.mjs";
import { findProblems, resolveBranches, runCheck } from "../scripts/check-pr-hygiene.mjs";

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "../scripts/check-pr-hygiene.mjs");

// --- findProblems -----------------------------------------------------------

describe("findProblems (pr-hygiene)", function () {
  it("accepts a pull request without the exception label, whatever it targets", function () {
    assert.isEmpty(findProblems({ labels: [], baseRef: "master", defaultBranch: "master" }));
    assert.isEmpty(findProblems({ labels: ["chore"], baseRef: "chore/v9.9-prep", defaultBranch: "master" }));
  });

  it("accepts the exception label on a pull request into the default branch", function () {
    assert.isEmpty(findProblems({ labels: [EXCEPTION_LABEL], baseRef: "master", defaultBranch: "master" }));
  });

  it("rejects the exception label on a pull request into another branch", function () {
    const problems = findProblems({
      labels: ["release", EXCEPTION_LABEL],
      baseRef: "chore/v9.9-prep",
      defaultBranch: "master",
    });
    assert.lengthOf(problems, 1);
    assert.include(problems[0], `"${EXCEPTION_LABEL}" is only for pull requests into master`);
    assert.include(problems[0], "chore/v9.9-prep");
  });

  it("compares with the default branch it is given, not with a fixed name", function () {
    assert.isEmpty(findProblems({ labels: [EXCEPTION_LABEL], baseRef: "main", defaultBranch: "main" }));
    assert.lengthOf(findProblems({ labels: [EXCEPTION_LABEL], baseRef: "master", defaultBranch: "main" }), 1);
  });

  it("matches the label name exactly", function () {
    const near = [`${EXCEPTION_LABEL}-2`, EXCEPTION_LABEL.toUpperCase(), "lock-files-changed"];
    assert.isEmpty(findProblems({ labels: near, baseRef: "chore/v9.9-prep", defaultBranch: "master" }));
  });
});

// --- resolveBranches --------------------------------------------------------

describe("resolveBranches (pr-hygiene)", function () {
  afterEach(function () {
    delete process.env.BASE_REF;
    delete process.env.DEFAULT_BRANCH;
  });

  it("reads both branch names from the environment", function () {
    process.env.BASE_REF = "chore/v9.9-prep";
    process.env.DEFAULT_BRANCH = " master ";
    assert.deepEqual(resolveBranches(), { baseRef: "chore/v9.9-prep", defaultBranch: "master" });
  });

  it("throws when either name is missing or empty (fail closed)", function () {
    assert.throws(() => resolveBranches(), /BASE_REF and DEFAULT_BRANCH are required/);
    process.env.BASE_REF = "master";
    assert.throws(() => resolveBranches(), /BASE_REF and DEFAULT_BRANCH are required/);
    delete process.env.BASE_REF;
    process.env.DEFAULT_BRANCH = "master";
    assert.throws(() => resolveBranches(), /BASE_REF and DEFAULT_BRANCH are required/);
    process.env.BASE_REF = "  ";
    assert.throws(() => resolveBranches(), /BASE_REF and DEFAULT_BRANCH are required/);
  });
});

// --- runCheck ---------------------------------------------------------------

describe("runCheck (pr-hygiene)", function () {
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

  it("exits 0 and logs OK when no rule is broken", function () {
    const cap = makeCapture();
    runCheck({
      resolveLabelsFn: () => ["release"],
      resolveBranchesFn: () => ({ baseRef: "chore/v9.9-prep", defaultBranch: "master" }),
      log: cap.log,
      error: cap.error,
      exit: cap.exit,
    });
    assert.equal(cap.exitCode, 0);
    assert.isTrue(cap.logs.some((l) => l.includes("[pr-hygiene] OK")));
    assert.isEmpty(cap.errors);
  });

  it("exits 1 and names the broken rule", function () {
    const cap = makeCapture();
    runCheck({
      resolveLabelsFn: () => [EXCEPTION_LABEL],
      resolveBranchesFn: () => ({ baseRef: "chore/v9.9-prep", defaultBranch: "master" }),
      log: cap.log,
      error: cap.error,
      exit: cap.exit,
    });
    assert.equal(cap.exitCode, 1);
    assert.isTrue(cap.errors.some((e) => e.includes("[pr-hygiene] FAIL")));
    assert.isTrue(cap.errors.some((e) => e.includes("remove the label")));
    assert.isEmpty(cap.logs);
  });

  it("propagates errors from reading the labels or the branches (fail closed)", function () {
    assert.throws(
      () => runCheck({ resolveLabelsFn: () => { throw new Error("bad labels"); }, exit: () => {} }),
      /bad labels/
    );
    assert.throws(
      () =>
        runCheck({
          resolveLabelsFn: () => [],
          resolveBranchesFn: () => { throw new Error("no branches"); },
          exit: () => {},
        }),
      /no branches/
    );
  });
});

// --- the script as the workflow runs it --------------------------------------

describe("check-pr-hygiene.mjs (as a process)", function () {
  function run(env) {
    try {
      const stdout = execFileSync(process.execPath, [SCRIPT], {
        env: { PATH: process.env.PATH, ...env },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return { status: 0, output: stdout };
    } catch (err) {
      return { status: err.status, output: `${err.stdout}${err.stderr}` };
    }
  }

  // The label list in the form the workflow passes it: toJSON() of the label names.
  const asWorkflowJson = (labels) => JSON.stringify(labels, null, 2);

  it("passes for a labelled pull request into the default branch", function () {
    const result = run({ PR_LABELS: asWorkflowJson([EXCEPTION_LABEL]), BASE_REF: "master", DEFAULT_BRANCH: "master" });
    assert.equal(result.status, 0);
    assert.include(result.output, "[pr-hygiene] OK");
  });

  it("passes for an unlabelled pull request into another branch", function () {
    const result = run({ PR_LABELS: asWorkflowJson([]), BASE_REF: "chore/v9.9-prep", DEFAULT_BRANCH: "master" });
    assert.equal(result.status, 0);
  });

  it("fails for a labelled pull request into another branch", function () {
    const result = run({
      PR_LABELS: asWorkflowJson(["chore", EXCEPTION_LABEL]),
      BASE_REF: "chore/v9.9-prep",
      DEFAULT_BRANCH: "master",
    });
    assert.equal(result.status, 1);
    assert.include(result.output, "[pr-hygiene] FAIL");
  });

  it("fails when the environment is incomplete", function () {
    const result = run({ PR_LABELS: asWorkflowJson([]) });
    assert.notEqual(result.status, 0);
    assert.include(result.output, "BASE_REF and DEFAULT_BRANCH are required");
  });
});
