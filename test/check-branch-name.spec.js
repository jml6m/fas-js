/**
 * Unit tests for scripts/check-branch-name.mjs.
 *
 * Most tests use dependency injection (fast, no subprocess, no network).
 * A small number of subprocess smoke tests validate the CLI end-to-end.
 */
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assert } from "chai";
import {
  isReservedName,
  isAllowedReservedPush,
  runCheck,
} from "../scripts/check-branch-name.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

const ZERO = "0000000000000000000000000000000000000000";
const SHA = "a".repeat(40);

/** Format a single pre-push payload line. */
function pushLine(localRef, localSha, remoteRef, remoteSha) {
  return `${localRef} ${localSha} ${remoteRef} ${remoteSha}\n`;
}

/** Build a payload with a single branch push (shorthand). */
function singlePush(branch) {
  return pushLine(`refs/heads/${branch}`, SHA, `refs/heads/${branch}`, ZERO);
}

/** Capture errors emitted by runCheck. */
function captureErrors(payloadStr, remoteReserved) {
  const errors = [];
  const code = runCheck({
    payload: payloadStr,
    getRemoteIntegrationBranchesFn: () => remoteReserved,
    error: (m) => errors.push(m),
  });
  return { code, errors };
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
      "topic/v1.8-foo",     // v-prefixed with dash but allowed: topic/ is not chore/, so slash check stops it
      "master",
      "main",
      "feature/add-stuff",
      "chore/v1.8/foo",     // deeper nesting — slash in segment after stripping chore/
      "chore/update-deps",  // no v-prefix
      "v1.8",               // no dash
      "v1",                 // no dash
      "hotfix/v1.8-patch",  // non-chore prefix: slash present in full name → allowed (not a chore/ segment)
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
// isAllowedReservedPush
// ---------------------------------------------------------------------------

describe("isAllowedReservedPush", function () {
  it("allows when the branch already exists on the remote (established integration branch)", function () {
    assert.isTrue(isAllowedReservedPush("chore/v1.8-hygiene", ["chore/v1.8-hygiene"]));
  });

  it("allows when no reserved branches exist on the remote (opening a new release line)", function () {
    assert.isTrue(isAllowedReservedPush("chore/v1.9-next", []));
  });

  it("blocks when a different reserved branch already exists on the remote", function () {
    assert.isFalse(isAllowedReservedPush("chore/v1.8-oops", ["chore/v1.8-hygiene"]));
  });

  it("blocks when multiple different reserved branches exist on the remote", function () {
    assert.isFalse(
      isAllowedReservedPush("v2.0-bad", ["chore/v1.8-hygiene", "chore/v1.9-next"]),
    );
  });

  it("allows one of several existing remote reserved branches when it matches exactly", function () {
    // Edge case: if somehow two integration branches exist, the one being pushed is the known one
    assert.isTrue(
      isAllowedReservedPush("chore/v1.8-hygiene", ["chore/v1.8-hygiene", "chore/v1.9-next"]),
    );
  });
});

// ---------------------------------------------------------------------------
// runCheck — core logic via DI (fast, no subprocess, no network)
// ---------------------------------------------------------------------------

describe("runCheck", function () {
  // Simulate remote with one integration branch
  const ONE_INTEGRATION = ["chore/v1.8-hygiene"];

  it("returns 0 for empty payload", function () {
    assert.equal(captureErrors("", ONE_INTEGRATION).code, 0);
  });

  it("returns 0 for whitespace-only payload", function () {
    assert.equal(captureErrors("   \n\n  \n", ONE_INTEGRATION).code, 0);
  });

  it("returns 0 for a topic/* branch push", function () {
    assert.equal(captureErrors(singlePush("topic/my-feature"), ONE_INTEGRATION).code, 0);
  });

  it("returns 0 for a master push", function () {
    assert.equal(captureErrors(singlePush("master"), ONE_INTEGRATION).code, 0);
  });

  it("returns 0 for a branch deletion (zero local SHA)", function () {
    // Deletions must never be blocked regardless of branch name
    const line = pushLine(
      "refs/heads/chore/v1.8-unauthorized",
      ZERO,
      "refs/heads/chore/v1.8-unauthorized",
      SHA,
    );
    assert.equal(captureErrors(line, ONE_INTEGRATION).code, 0);
  });

  it("returns 0 for a non-refs/heads/ ref (e.g. a tag)", function () {
    const line = pushLine("refs/tags/v1.8.0", SHA, "refs/tags/v1.8.0", ZERO);
    assert.equal(captureErrors(line, ONE_INTEGRATION).code, 0);
  });

  it("returns 0 when pushing the established integration branch (already on remote)", function () {
    assert.equal(captureErrors(singlePush("chore/v1.8-hygiene"), ONE_INTEGRATION).code, 0);
  });

  it("returns 0 when no reserved branches exist on the remote (opening a new release line)", function () {
    assert.equal(captureErrors(singlePush("chore/v1.9-next"), []).code, 0);
  });

  it("returns 1 when pushing a reserved name that conflicts with an existing integration branch (chore/ prefix)", function () {
    const { code, errors } = captureErrors(singlePush("chore/v1.8-oops"), ONE_INTEGRATION);
    assert.equal(code, 1);
    assert.isTrue(errors.some((e) => e.includes("chore/v1.8-oops")));
  });

  it("returns 1 when pushing a reserved name that conflicts (bare v* prefix)", function () {
    const { code, errors } = captureErrors(singlePush("v2.0-release"), ONE_INTEGRATION);
    assert.equal(code, 1);
    assert.isTrue(errors.some((e) => e.includes("v2.0-release")));
  });

  it("error message includes the --no-verify bypass hint", function () {
    const { errors } = captureErrors(singlePush("v1.9-oops"), ONE_INTEGRATION);
    assert.isTrue(errors.some((e) => e.includes("--no-verify")));
  });

  it("error message includes the AGENTS.md reference", function () {
    const { errors } = captureErrors(singlePush("v1.9-oops"), ONE_INTEGRATION);
    assert.isTrue(errors.some((e) => e.includes("AGENTS.md")));
  });

  it("error message names the current remote integration branch", function () {
    const { errors } = captureErrors(singlePush("v1.9-oops"), ONE_INTEGRATION);
    assert.isTrue(errors.some((e) => e.includes("chore/v1.8-hygiene")));
  });

  it("reports all offenders when multiple reserved branches are pushed", function () {
    const payload = [
      singlePush("v1.9-alpha"),
      singlePush("chore/v2.0-prep"),
    ].join("");
    const { code, errors } = captureErrors(payload, ONE_INTEGRATION);
    assert.equal(code, 1);
    assert.isTrue(errors.some((e) => e.includes("v1.9-alpha")));
    assert.isTrue(errors.some((e) => e.includes("chore/v2.0-prep")));
  });

  it("returns 0 for a mixed payload with only allowed branches", function () {
    const payload = [
      singlePush("topic/feat-a"),
      "\n",
      singlePush("master"),
    ].join("");
    assert.equal(captureErrors(payload, ONE_INTEGRATION).code, 0);
  });

  it("returns 1 for a mixed payload containing one blocked reserved branch", function () {
    const payload = [singlePush("topic/ok"), singlePush("v1.9-blocked")].join("");
    const { code, errors } = captureErrors(payload, ONE_INTEGRATION);
    assert.equal(code, 1);
    assert.isTrue(errors.some((e) => e.includes("v1.9-blocked")));
    assert.isFalse(errors.some((e) => e.includes("topic/ok")));
  });

  it("fails open (returns 0) when getRemoteIntegrationBranchesFn throws", function () {
    // Remote unreachable → hook does not block
    const code = runCheck({
      payload: singlePush("chore/v1.8-anything"),
      getRemoteIntegrationBranchesFn: () => { throw new Error(); },
      error: () => {},
    });
    assert.equal(code, 0);
  });
});

// ---------------------------------------------------------------------------
// CLI smoke tests (subprocess) — validate the executable end-to-end
// ---------------------------------------------------------------------------

describe("check-branch-name CLI (subprocess)", function () {
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

  it("exits 0 for empty stdin", function () {
    assert.equal(runScript("").status, 0);
  });

  it("exits 0 for a topic/* branch push", function () {
    assert.equal(runScript(singlePush("topic/my-feature")).status, 0);
  });

  it("exits 1 for a reserved-named branch that is not the current integration branch", function () {
    // chore/v1.8-unauthorized is not on the remote; chore/v1.8-hygiene is → blocked
    const { status, stderr } = runScript(singlePush("chore/v1.8-unauthorized"));
    assert.equal(status, 1);
    assert.include(stderr, "chore/v1.8-unauthorized");
  });
});
