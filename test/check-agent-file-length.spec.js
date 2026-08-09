/**
 * Unit tests for scripts/check-agent-file-length.mjs (pure helpers only).
 * End-to-end "real repo files" coverage is the script's job when docs-lint runs it.
 */
import { assert } from "chai";
import {
  MAX_CHARS,
  AGENT_FILENAMES,
  exceedsCap,
  findAgentFiles,
  checkFiles,
  runCheck,
} from "../scripts/check-agent-file-length.mjs";

describe("check-agent-file-length", function () {
  describe("exceedsCap", function () {
    it("is false at and under the cap", function () {
      assert.isFalse(exceedsCap("x".repeat(MAX_CHARS)));
      assert.isFalse(exceedsCap("short"));
    });

    it("is true over the cap", function () {
      assert.isTrue(exceedsCap("x".repeat(MAX_CHARS + 1)));
    });
  });

  describe("findAgentFiles", function () {
    it("returns only root basenames that exist (no recursion)", function () {
      const exists = p => p.endsWith("AGENTS.md") || p.endsWith("CLAUDE.md");
      assert.deepEqual(findAgentFiles("/repo", { exists }), ["AGENTS.md", "CLAUDE.md"]);
    });

    it("returns empty when none exist", function () {
      assert.deepEqual(findAgentFiles("/repo", { exists: () => false }), []);
    });

    it("only considers the known root filename set", function () {
      assert.includeMembers([...AGENT_FILENAMES], ["AGENTS.md", "CLAUDE.md"]);
    });
  });

  describe("checkFiles", function () {
    it("passes when all files are under the cap", function () {
      const { ok, results } = checkFiles(["AGENTS.md"], {
        readFile: () => "ok",
      });
      assert.isTrue(ok);
      assert.equal(results[0].chars, 2);
      assert.isTrue(results[0].ok);
    });

    it("fails when any file is over the cap", function () {
      const { ok, results } = checkFiles(["AGENTS.md"], {
        readFile: () => "x".repeat(MAX_CHARS + 10),
      });
      assert.isFalse(ok);
      assert.isFalse(results[0].ok);
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
        exit: c => {
          exitCode = c;
        },
        get logs() {
          return logs;
        },
        get errors() {
          return errors;
        },
        get exitCode() {
          return exitCode;
        },
      };
    }

    it("exits 0 when injected files are under cap", function () {
      const cap = makeCapture();
      runCheck({
        find: () => ["AGENTS.md"],
        check: () => ({ ok: true, results: [{ file: "AGENTS.md", chars: 100, ok: true }] }),
        log: cap.log,
        error: cap.error,
        exit: cap.exit,
      });
      assert.equal(cap.exitCode, 0);
      assert.isTrue(cap.logs.some(l => l.includes("AGENTS.md")));
    });

    it("exits 1 when a file is over cap", function () {
      const cap = makeCapture();
      runCheck({
        find: () => ["AGENTS.md"],
        check: () => ({
          ok: false,
          results: [{ file: "AGENTS.md", chars: MAX_CHARS + 1, ok: false }],
        }),
        log: cap.log,
        error: cap.error,
        exit: cap.exit,
      });
      assert.equal(cap.exitCode, 1);
      assert.isTrue(cap.errors.some(e => e.includes("over the")));
    });
  });
});
