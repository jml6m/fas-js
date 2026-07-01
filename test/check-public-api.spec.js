/**
 * Unit tests for scripts/check-public-api.mjs.
 * Exercises the pure contract-assertion helpers plus the real script end-to-end.
 */
import { assert } from "chai";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PUBLIC_EXPORTS,
  DTS_EXPORT_PATTERN,
  assertKeys,
  assertTsupEntries,
  assertDtsExports,
  runCheck,
} from "../scripts/check-public-api.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

const VALID_DTS =
  "export { type TransitionInput, createFSA, simulateFSA, stepOnceFSA };";
const VALID_TSUP =
  'export default defineConfig([\n  { entry: { index: "src/modules.ts" } },\n  { entry: { bundle: "src/modules.ts" } },\n]);';

describe("check-public-api", function () {
  describe("assertKeys", function () {
    it("passes when the module exports exactly the public API", function () {
      const mod = { createFSA: 1, simulateFSA: 2, stepOnceFSA: 3 };
      assert.doesNotThrow(() => assertKeys(mod, "test-mod"));
    });

    it("passes regardless of key order", function () {
      const mod = { stepOnceFSA: 1, createFSA: 2, simulateFSA: 3 };
      assert.doesNotThrow(() => assertKeys(mod, "test-mod"));
    });

    it("throws when an extra export leaks", function () {
      const mod = { createFSA: 1, simulateFSA: 2, stepOnceFSA: 3, internalThing: 4 };
      assert.throws(() => assertKeys(mod, "leaky"), /leaky: expected/);
    });

    it("throws when a public export is missing", function () {
      const mod = { createFSA: 1, simulateFSA: 2 };
      assert.throws(() => assertKeys(mod, "partial"), /partial: expected/);
    });

    it("names the offending module in the error", function () {
      assert.throws(() => assertKeys({}, "lib/index.cjs"), /lib\/index\.cjs/);
    });
  });

  describe("assertTsupEntries", function () {
    it("passes for a config building both entries from src/modules.ts", function () {
      assert.doesNotThrow(() => assertTsupEntries(VALID_TSUP));
    });

    it("throws when the index entry is not src/modules.ts", function () {
      const bad = VALID_TSUP.replace('index: "src/modules.ts"', 'index: "src/evil.ts"');
      assert.throws(() => assertTsupEntries(bad), /index entry must be src\/modules\.ts/);
    });

    it("throws when the bundle entry is not src/modules.ts", function () {
      const bad = VALID_TSUP.replace('bundle: "src/modules.ts"', 'bundle: "src/evil.ts"');
      assert.throws(() => assertTsupEntries(bad), /bundle entry must be src\/modules\.ts/);
    });
  });

  describe("assertDtsExports", function () {
    it("passes for the contract export line", function () {
      assert.doesNotThrow(() => assertDtsExports(VALID_DTS));
    });

    it("tolerates surrounding declarations", function () {
      const dts = `declare function createFSA(): void;\n${VALID_DTS}\n`;
      assert.doesNotThrow(() => assertDtsExports(dts));
    });

    it("throws when the export line is absent", function () {
      assert.throws(
        () => assertDtsExports("export { createFSA };"),
        /do not match public API contract/
      );
    });

    it("throws when an internal symbol is added to the export line", function () {
      const bad = VALID_DTS.replace("stepOnceFSA }", "stepOnceFSA, NFA }");
      assert.throws(() => assertDtsExports(bad), /do not match public API contract/);
    });
  });

  describe("contract constants", function () {
    it("PUBLIC_EXPORTS is exactly the three public functions", function () {
      assert.deepEqual([...PUBLIC_EXPORTS].sort(), [
        "createFSA",
        "simulateFSA",
        "stepOnceFSA",
      ]);
    });

    it("DTS_EXPORT_PATTERN is a RegExp", function () {
      assert.instanceOf(DTS_EXPORT_PATTERN, RegExp);
    });
  });

  describe("runCheck (end-to-end)", function () {
    it("passes against the real built lib artifacts", async function () {
      // npm test builds lib/ before running mocha, so the artifacts exist here.
      await runCheck({ rootDir: root });
    });
  });
});
