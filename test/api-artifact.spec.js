/**
 * Build artifact fidelity — exercises published lib/ outputs, not src/ via tsx.
 * Closes #235.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";

import { assert } from "chai";

const __dir = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const require = createRequire(import.meta.url);

const STATES = ["q1", "q2"];
const ALPHABET = "01";
const TRANSITIONS = [
  { from: "q1", to: "q2", input: "1" },
  { from: "q2", to: "q1", input: "0" },
  { from: "q2", to: "q2", input: "1" },
  { from: "q1", to: "q1", input: "0" },
];
const START = "q1";
const ACCEPTS = ["q2"];

function exercisePublicApi(api) {
  const fsa = api.createFSA(STATES, ALPHABET, TRANSITIONS, START, ACCEPTS);

  assert.equal(fsa.getType(), "DFA");
  assert.isTrue(api.simulateFSA("1", fsa));
  assert.isFalse(api.simulateFSA("0", fsa));
  assert.equal(api.simulateFSA("1", fsa, false, true), "q2");
  assert.equal(api.stepOnceFSA("1", START, fsa), "q2");

  const dot = fsa.generateDigraph();
  assert.isString(dot);
  assert.include(dot, "digraph");
}

describe("lib artifacts (#235)", function() {
  it("ESM entry (lib/index.js) matches public API contract", async function() {
    const mod = await import(pathToFileURL(resolve(root, "lib/index.js")).href);
    assert.isFunction(mod.createFSA);
    assert.isFunction(mod.simulateFSA);
    assert.isFunction(mod.stepOnceFSA);
    exercisePublicApi(mod);
  });

  it("CJS entry (lib/index.cjs) matches public API contract", function() {
    const mod = require(resolve(root, "lib/index.cjs"));
    assert.isFunction(mod.createFSA);
    assert.isFunction(mod.simulateFSA);
    assert.isFunction(mod.stepOnceFSA);
    exercisePublicApi(mod);
  });

  it("IIFE bundle (lib/bundle.js) exposes fasJs global", function() {
    const code = readFileSync(resolve(root, "lib/bundle.js"), "utf8");
    const sandbox = { fasJs: undefined, console };
    runInNewContext(code, sandbox, { filename: "lib/bundle.js" });

    assert.isObject(sandbox.fasJs);
    exercisePublicApi(sandbox.fasJs);
  });
});