/**
 * Unit tests for scripts/check-pr-hygiene.mjs.
 * The last group runs the script as a process, the way the workflow does; one of its cases reads
 * the real repository through git.
 */
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assert } from "chai";
import {
  EXCEPTION_LABEL,
  findProblems,
  isDependabotActionsBranch,
  isReleaseBranch,
  resolveBranches,
  resolveLabels,
  runCheck,
} from "../scripts/check-pr-hygiene.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = resolve(ROOT, "scripts/check-pr-hygiene.mjs");

const RELEASE = "chore/v9.9-prep";
const TOPIC = "topic/some-change";

// A pull request into the integration branch from a topic branch of this repository
const pr = (overrides = {}) => ({
  labels: [],
  baseRef: RELEASE,
  headRef: TOPIC,
  defaultBranch: "master",
  fromThisRepository: true,
  protectedChangesFn: () => {
    throw new Error("the changed files must not be read for this case");
  },
  ...overrides,
});

// --- isReleaseBranch --------------------------------------------------------

describe("isReleaseBranch", function () {
  it("accepts the release branch names", function () {
    for (const name of [
      "chore/v1.12-prep",
      "chore/v1.12-release",
      "chore/v1.11-fix",
      "chore/v2-prep",
      "v2.0-prep",
      "v3-next",
      "chore/v10.0-prep-2",
    ]) {
      assert.isTrue(isReleaseBranch(name), name);
    }
  });

  it("rejects everything else, including names that only start like one", function () {
    for (const name of [
      "master",
      "topic/v1.12-prep",
      "chore/v1.12",
      "chore/v1.12.1-fix",
      "v1.12.0",
      "v",
      "vendor-update",
      "validate-inputs",
      "chore/vitest-upgrade",
      "chore/v1.12-prep/extra",
      "release/chore/v1.12-prep",
      "dependabot/github_actions/actions/checkout-7",
      "",
      undefined,
      null,
    ]) {
      assert.isFalse(isReleaseBranch(name), String(name));
    }
  });
});

// --- isDependabotActionsBranch -----------------------------------------------

describe("isDependabotActionsBranch", function () {
  it("accepts the branches of Dependabot's GitHub Actions updates, in both spellings", function () {
    assert.isTrue(isDependabotActionsBranch("dependabot/github_actions/actions/checkout-7.0.1"));
    assert.isTrue(isDependabotActionsBranch("dependabot/github-actions/all-1a2b3c"));
  });

  it("rejects Dependabot's other updates and everything else", function () {
    for (const name of ["dependabot/npm_and_yarn/mocha-12.0.3", "dependabot/github_actions/", "chore/v1.12-release", "", undefined]) {
      assert.isFalse(isDependabotActionsBranch(name), String(name));
    }
  });
});

// --- findProblems: the label ------------------------------------------------

describe("findProblems (pr-hygiene): the exception label", function () {
  it("accepts a pull request without the label and does not read its changed files", function () {
    assert.isEmpty(findProblems(pr()));
    assert.isEmpty(findProblems(pr({ labels: ["chore", "release"] })));
  });

  it("rejects the label on a pull request into another branch, without reading its changed files", function () {
    const problems = findProblems(pr({ labels: ["release", EXCEPTION_LABEL] }));
    assert.lengthOf(problems, 1);
    assert.include(problems[0], `"${EXCEPTION_LABEL}" is only for pull requests into master`);
    assert.include(problems[0], RELEASE);
  });

  it("accepts the label on a pull request into the default branch that changes a protected file", function () {
    const problems = findProblems(
      pr({ labels: [EXCEPTION_LABEL], baseRef: "master", headRef: RELEASE, protectedChangesFn: () => ["LICENSE"] })
    );
    assert.isEmpty(problems);
  });

  it("rejects the label on a pull request into the default branch that changes no protected file", function () {
    const problems = findProblems(
      pr({ labels: [EXCEPTION_LABEL], baseRef: "master", headRef: RELEASE, protectedChangesFn: () => [] })
    );
    assert.lengthOf(problems, 1);
    assert.include(problems[0], "changes no protected file");
  });

  it("matches the label name exactly", function () {
    const near = [`${EXCEPTION_LABEL}-2`, EXCEPTION_LABEL.toUpperCase(), "lock-files-changed"];
    assert.isEmpty(findProblems(pr({ labels: near })));
  });

  it("compares with the default branch it is given, not with a fixed name", function () {
    const onMain = { labels: [EXCEPTION_LABEL], defaultBranch: "main", headRef: RELEASE, protectedChangesFn: () => ["LICENSE"] };
    assert.isEmpty(findProblems(pr({ ...onMain, baseRef: "main" })));
    assert.lengthOf(findProblems(pr({ ...onMain, baseRef: "master" })), 1);
  });
});

// --- findProblems: the branches ---------------------------------------------

describe("findProblems (pr-hygiene): where a pull request into the default branch comes from", function () {
  const intoDefault = (overrides) => pr({ baseRef: "master", ...overrides });

  it("accepts a release branch of this repository", function () {
    assert.isEmpty(findProblems(intoDefault({ headRef: "chore/v9.9-release" })));
  });

  it("accepts Dependabot's GitHub Actions updates", function () {
    assert.isEmpty(findProblems(intoDefault({ headRef: "dependabot/github_actions/actions/checkout-7.0.1" })));
    assert.isEmpty(findProblems(intoDefault({ headRef: "dependabot/github-actions/all-1a2b3c" })));
  });

  it("rejects a topic branch", function () {
    const problems = findProblems(intoDefault({ headRef: TOPIC }));
    assert.lengthOf(problems, 1);
    assert.include(problems[0], "come from a release branch of this repository");
    assert.include(problems[0], TOPIC);
  });

  it("rejects Dependabot's other updates", function () {
    assert.lengthOf(findProblems(intoDefault({ headRef: "dependabot/npm_and_yarn/mocha-12.0.3" })), 1);
  });

  it("rejects a branch of another repository, even one named like a release branch", function () {
    const problems = findProblems(intoDefault({ headRef: "chore/v9.9-release", fromThisRepository: false }));
    assert.lengthOf(problems, 1);
    assert.include(problems[0], "in another repository");
    assert.lengthOf(
      findProblems(intoDefault({ headRef: "dependabot/github_actions/x-1", fromThisRepository: false })),
      1
    );
  });

  it("does not restrict where a pull request into another branch comes from", function () {
    assert.isEmpty(findProblems(pr({ headRef: "anything/at-all", fromThisRepository: false })));
  });

  it("reports both problems when both rules are broken", function () {
    const problems = findProblems(
      intoDefault({ labels: [EXCEPTION_LABEL], headRef: TOPIC, protectedChangesFn: () => [] })
    );
    assert.lengthOf(problems, 2);
  });
});

// --- resolveLabels ----------------------------------------------------------

describe("resolveLabels", function () {
  afterEach(function () {
    delete process.env.PR_LABELS;
  });

  it("returns no labels when PR_LABELS is absent (a local run)", function () {
    assert.deepEqual(resolveLabels(), []);
  });

  it("returns no labels when PR_LABELS is empty", function () {
    process.env.PR_LABELS = "  ";
    assert.deepEqual(resolveLabels(), []);
  });

  it("parses a JSON array of label names", function () {
    process.env.PR_LABELS = JSON.stringify(["release", EXCEPTION_LABEL]);
    assert.deepEqual(resolveLabels(), ["release", EXCEPTION_LABEL]);
  });

  it("throws when PR_LABELS is not valid JSON (fail closed)", function () {
    process.env.PR_LABELS = "[release";
    assert.throws(() => resolveLabels(), /PR_LABELS is not valid JSON/);
  });

  it("throws when PR_LABELS is not an array of strings", function () {
    process.env.PR_LABELS = JSON.stringify({ name: EXCEPTION_LABEL });
    assert.throws(() => resolveLabels(), /must be a JSON array of label names/);
    process.env.PR_LABELS = JSON.stringify([{ name: EXCEPTION_LABEL }]);
    assert.throws(() => resolveLabels(), /must be a JSON array of label names/);
  });
});

// --- resolveBranches --------------------------------------------------------

describe("resolveBranches", function () {
  const NAMES = ["BASE_REF", "HEAD_REF", "DEFAULT_BRANCH", "EVENT_BASE_REF", "HEAD_REPO", "GITHUB_REPOSITORY"];
  let saved;

  beforeEach(function () {
    saved = Object.fromEntries(NAMES.map((name) => [name, process.env[name]]));
    for (const name of NAMES) delete process.env[name];
  });

  afterEach(function () {
    for (const name of NAMES) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  });

  it("reads the branches and whether the head is in this repository", function () {
    Object.assign(process.env, {
      BASE_REF: " master ",
      HEAD_REF: RELEASE,
      DEFAULT_BRANCH: "master",
      EVENT_BASE_REF: RELEASE,
      HEAD_REPO: "owner/repo",
      GITHUB_REPOSITORY: "owner/repo",
    });
    assert.deepEqual(resolveBranches(), {
      baseRef: "master",
      headRef: RELEASE,
      defaultBranch: "master",
      eventBaseRef: RELEASE,
      fromThisRepository: true,
    });
  });

  it("treats a head in another repository, or a missing one, as not from this repository", function () {
    Object.assign(process.env, { BASE_REF: "master", HEAD_REF: TOPIC, DEFAULT_BRANCH: "master", GITHUB_REPOSITORY: "owner/repo" });
    assert.isFalse(resolveBranches().fromThisRepository);
    process.env.HEAD_REPO = "someone/repo";
    assert.isFalse(resolveBranches().fromThisRepository);
  });

  it("takes the target branch at the start of the run from BASE_REF when EVENT_BASE_REF is absent", function () {
    Object.assign(process.env, { BASE_REF: RELEASE, HEAD_REF: TOPIC, DEFAULT_BRANCH: "master" });
    assert.equal(resolveBranches().eventBaseRef, RELEASE);
  });

  it("throws when a branch name is missing or empty (fail closed)", function () {
    assert.throws(() => resolveBranches(), /BASE_REF, HEAD_REF and DEFAULT_BRANCH are required/);
    Object.assign(process.env, { BASE_REF: "master", HEAD_REF: "  ", DEFAULT_BRANCH: "master" });
    assert.throws(() => resolveBranches(), /BASE_REF, HEAD_REF and DEFAULT_BRANCH are required/);
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

  const branches = (overrides = {}) => ({
    baseRef: RELEASE,
    headRef: TOPIC,
    defaultBranch: "master",
    eventBaseRef: RELEASE,
    fromThisRepository: true,
    ...overrides,
  });

  it("exits 0 and logs OK when no rule is broken", function () {
    const cap = makeCapture();
    runCheck({
      resolveLabelsFn: () => ["release"],
      resolveBranchesFn: () => branches(),
      log: cap.log,
      error: cap.error,
      exit: cap.exit,
    });
    assert.equal(cap.exitCode, 0);
    assert.isTrue(cap.logs.some((l) => l.includes("[pr-hygiene] OK")));
    assert.isEmpty(cap.errors);
  });

  it("exits 1 and names every broken rule", function () {
    const cap = makeCapture();
    runCheck({
      resolveLabelsFn: () => [EXCEPTION_LABEL],
      resolveBranchesFn: () => branches({ baseRef: "master", eventBaseRef: "master" }),
      protectedChangesFn: () => [],
      log: cap.log,
      error: cap.error,
      exit: cap.exit,
    });
    assert.equal(cap.exitCode, 1);
    assert.isTrue(cap.errors.some((e) => e.includes("[pr-hygiene] FAIL")));
    assert.isTrue(cap.errors.some((e) => e.includes("changes no protected file")));
    assert.isTrue(cap.errors.some((e) => e.includes("come from a release branch")));
    assert.isEmpty(cap.logs);
  });

  it("exits 1 without judging when the pull request was retargeted after the run started", function () {
    const cap = makeCapture();
    runCheck({
      resolveLabelsFn: () => [],
      resolveBranchesFn: () => branches({ baseRef: "master", eventBaseRef: RELEASE }),
      protectedChangesFn: () => {
        throw new Error("must not be read");
      },
      log: cap.log,
      error: cap.error,
      exit: cap.exit,
    });
    assert.equal(cap.exitCode, 1);
    assert.isTrue(cap.errors.some((e) => e.includes("[pr-hygiene] OUT OF DATE")));
    assert.isFalse(cap.errors.some((e) => e.includes("[pr-hygiene] FAIL")));
  });

  it("propagates errors from reading the labels, the branches or the changed files (fail closed)", function () {
    const exit = () => {};
    assert.throws(() => runCheck({ resolveLabelsFn: () => { throw new Error("bad labels"); }, exit }), /bad labels/);
    assert.throws(
      () => runCheck({ resolveLabelsFn: () => [], resolveBranchesFn: () => { throw new Error("no branches"); }, exit }),
      /no branches/
    );
    assert.throws(
      () =>
        runCheck({
          resolveLabelsFn: () => [EXCEPTION_LABEL],
          resolveBranchesFn: () => branches({ baseRef: "master", eventBaseRef: "master", headRef: RELEASE }),
          protectedChangesFn: () => { throw new Error("git failed"); },
          exit,
        }),
      /git failed/
    );
  });
});

// --- the script as the workflow runs it --------------------------------------

describe("check-pr-hygiene.mjs (as a process)", function () {
  function run(env) {
    try {
      const stdout = execFileSync(process.execPath, [SCRIPT], {
        cwd: ROOT,
        env: { PATH: process.env.PATH, GITHUB_REPOSITORY: "owner/repo", HEAD_REPO: "owner/repo", ...env },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return { status: 0, output: stdout };
    } catch (err) {
      return { status: err.status, output: `${err.stdout}${err.stderr}` };
    }
  }

  const head = () => execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();

  it("passes for an unlabelled pull request into another branch", function () {
    const result = run({ PR_LABELS: "[]", BASE_REF: RELEASE, HEAD_REF: TOPIC, DEFAULT_BRANCH: "master" });
    assert.equal(result.status, 0, result.output);
    assert.include(result.output, "[pr-hygiene] OK");
  });

  it("fails for a labelled pull request into another branch", function () {
    const result = run({
      PR_LABELS: JSON.stringify(["chore", EXCEPTION_LABEL]),
      BASE_REF: RELEASE,
      HEAD_REF: TOPIC,
      DEFAULT_BRANCH: "master",
    });
    assert.equal(result.status, 1, result.output);
    assert.include(result.output, "[pr-hygiene] FAIL");
    assert.include(result.output, "remove the label");
  });

  it("fails for a pull request into the default branch from a topic branch", function () {
    const result = run({ PR_LABELS: "[]", BASE_REF: "master", HEAD_REF: TOPIC, DEFAULT_BRANCH: "master" });
    assert.equal(result.status, 1, result.output);
    assert.include(result.output, "come from a release branch");
  });

  it("reads the changed files through git for a labelled pull request into the default branch", function () {
    // Compared with itself, HEAD changes nothing, so the label is on a pull request that needs none.
    const result = run({
      PR_LABELS: JSON.stringify([EXCEPTION_LABEL]),
      BASE_REF: "master",
      HEAD_REF: RELEASE,
      DEFAULT_BRANCH: "master",
      BASE_SHA: head(),
    });
    assert.equal(result.status, 1, result.output);
    assert.include(result.output, "changes no protected file");
  });

  it("fails when the run is out of date", function () {
    const result = run({ PR_LABELS: "[]", BASE_REF: "master", EVENT_BASE_REF: RELEASE, HEAD_REF: RELEASE, DEFAULT_BRANCH: "master" });
    assert.equal(result.status, 1, result.output);
    assert.include(result.output, "[pr-hygiene] OUT OF DATE");
  });

  it("fails when the environment is incomplete", function () {
    const result = run({ PR_LABELS: "[]" });
    assert.notEqual(result.status, 0);
    assert.include(result.output, "BASE_REF, HEAD_REF and DEFAULT_BRANCH are required");
  });
});
