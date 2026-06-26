/**
 * Unit tests for scripts/check-branch-name.mjs.
 * Tests isReservedName() directly and the full script via subprocess with piped stdin.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assert } from "chai";
import { isReservedName } from "../scripts/check-branch-name.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

const ZERO = "0000000000000000000000000000000000000000";
const SHA = "a".repeat(40);

/** Read the designated integration branch from .github/INTEGRATION_BRANCH. */
const integrationBranch = readFileSync(
  resolve(root, ".github/INTEGRATION_BRANCH"),
  "utf8",
).trim();

/** Format a single pre-push payload line: <localRef> <localSha> <remoteRef> <remoteSha> */
function pushLine(localRef, localSha, remoteRef, remoteSha) {
  return `${localRef} ${localSha} ${remoteRef} ${remoteSha}\n`;
}

/** Run check-branch-name.mjs with the given stdin payload. Returns { status, stderr }. */
function runScript(stdinPayload) {
  try {
    execFileSync("node", ["scripts/check-branch-name.mjs"], {
      cwd: root,
      input: stdinPayload,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { status: 0, stderr: "" };
  } catch (err) {
    return { status: err.status ?? 1, stderr: err.stderr ?? "" };
  }
}

// ---------------------------------------------------------------------------
// isReservedName
// ---------------------------------------------------------------------------

describe("isReservedName", function () {
  describe("reserved names (return true)", function () {
    const reserved = [
      "v1.8-hygiene",
      "v1-feature",
      "v2.0-prep",
      "v1.0-release",
      "chore/v1.8-hygiene",
      "chore/v1-release",
      "chore/v2.0-prep",
      "chore/v99.99-something",
    ];
    for (const name of reserved) {
      it(`returns true for "${name}"`, function () {
        assert.isTrue(isReservedName(name));
      });
    }
  });

  describe("allowed names (return false)", function () {
    const allowed = [
      "topic/my-feature",
      "topic/v1.8-foo",     // v-prefixed segment but under topic/, not chore/
      "master",
      "main",
      "feature/add-stuff",
      "chore/v1.8/foo",     // deeper nesting — slash in segment after stripping chore/
      "chore/update-deps",  // no v-prefix
      "v1.8",               // no dash
      "v1",                 // no dash
      "hotfix/v1.8-patch",  // non-chore prefix with slash → fails slash check
      "fix/v2-something",   // non-chore prefix with slash
    ];
    for (const name of allowed) {
      it(`returns false for "${name}"`, function () {
        assert.isFalse(isReservedName(name));
      });
    }
  });
});

// ---------------------------------------------------------------------------
// check-branch-name script — stdin payload parsing (subprocess)
// ---------------------------------------------------------------------------

describe("check-branch-name script (subprocess)", function () {
  it("exits 0 for an empty stdin payload", function () {
    assert.equal(runScript("").status, 0);
  });

  it("exits 0 for a whitespace-only stdin payload", function () {
    assert.equal(runScript("   \n\n  \n").status, 0);
  });

  it("exits 0 for a topic/* branch push", function () {
    const line = pushLine(
      "refs/heads/topic/my-feature",
      SHA,
      "refs/heads/topic/my-feature",
      ZERO,
    );
    assert.equal(runScript(line).status, 0);
  });

  it("exits 0 for a branch deletion (zero local SHA)", function () {
    // Deletions should never be blocked regardless of branch name
    const line = pushLine(
      "refs/heads/chore/v1.8-unauthorized",
      ZERO,
      "refs/heads/chore/v1.8-unauthorized",
      SHA,
    );
    assert.equal(runScript(line).status, 0);
  });

  it("exits 0 for a non-refs/heads/ ref (e.g. a tag)", function () {
    const line = pushLine("refs/tags/v1.8.0", SHA, "refs/tags/v1.8.0", ZERO);
    assert.equal(runScript(line).status, 0);
  });

  it("exits 0 when pushing the designated integration branch", function () {
    const line = pushLine(
      `refs/heads/${integrationBranch}`,
      SHA,
      `refs/heads/${integrationBranch}`,
      ZERO,
    );
    assert.equal(runScript(line).status, 0);
  });

  it("exits 0 for master push", function () {
    const line = pushLine("refs/heads/master", SHA, "refs/heads/master", ZERO);
    assert.equal(runScript(line).status, 0);
  });

  it("exits 1 when pushing a reserved-named non-integration branch (chore/ prefix)", function () {
    const { status, stderr } = runScript(
      pushLine(
        "refs/heads/chore/v1.8-unauthorized",
        SHA,
        "refs/heads/chore/v1.8-unauthorized",
        ZERO,
      ),
    );
    assert.equal(status, 1);
    assert.include(stderr, "chore/v1.8-unauthorized");
  });

  it("exits 1 when pushing a reserved-named non-integration branch (bare v* prefix)", function () {
    const { status, stderr } = runScript(
      pushLine("refs/heads/v2.0-release", SHA, "refs/heads/v2.0-release", ZERO),
    );
    assert.equal(status, 1);
    assert.include(stderr, "v2.0-release");
  });

  it("error message includes the --no-verify bypass hint", function () {
    const { stderr } = runScript(
      pushLine("refs/heads/v1.9-oops", SHA, "refs/heads/v1.9-oops", ZERO),
    );
    assert.include(stderr, "--no-verify");
  });

  it("error message includes the AGENTS.md reference", function () {
    const { stderr } = runScript(
      pushLine("refs/heads/v1.9-oops", SHA, "refs/heads/v1.9-oops", ZERO),
    );
    assert.include(stderr, "AGENTS.md");
  });

  it("exits 1 and names all offenders when multiple reserved branches are pushed", function () {
    const payload = [
      pushLine("refs/heads/v1.9-alpha", SHA, "refs/heads/v1.9-alpha", ZERO),
      pushLine("refs/heads/chore/v2.0-prep", SHA, "refs/heads/chore/v2.0-prep", ZERO),
    ].join("");
    const { status, stderr } = runScript(payload);
    assert.equal(status, 1);
    assert.include(stderr, "v1.9-alpha");
    assert.include(stderr, "chore/v2.0-prep");
  });

  it("exits 0 when a mixed payload contains only allowed branches", function () {
    const payload = [
      pushLine("refs/heads/topic/feat-a", SHA, "refs/heads/topic/feat-a", ZERO),
      "\n",
      pushLine("refs/heads/master", SHA, "refs/heads/master", ZERO),
    ].join("");
    assert.equal(runScript(payload).status, 0);
  });

  it("exits 1 for a mixed payload that contains one reserved branch", function () {
    const payload = [
      pushLine("refs/heads/topic/ok", SHA, "refs/heads/topic/ok", ZERO),
      pushLine("refs/heads/v1.9-blocked", SHA, "refs/heads/v1.9-blocked", ZERO),
    ].join("");
    const { status, stderr } = runScript(payload);
    assert.equal(status, 1);
    assert.include(stderr, "v1.9-blocked");
    assert.notInclude(stderr, "topic/ok");
  });
});
