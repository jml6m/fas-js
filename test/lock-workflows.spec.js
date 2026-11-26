/**
 * Names that have to agree across files for the lock to work. The Release workflow decides
 * whether the lock is on by looking for the check that lock-files.yml produces, by name; if one
 * side were renamed, a release would report the lock as off. These tests fail first.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assert } from "chai";
import { EXCEPTION_LABEL } from "../scripts/check-pr-hygiene.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

// The id of a workflow's only job, and the name its check is reported under
function onlyJob(workflow) {
  const jobs = workflow.split(/^jobs:[ \t]*$/m)[1];
  const ids = [...jobs.matchAll(/^ {2}([\w-]+):[ \t]*$/gm)].map((m) => m[1]);
  assert.lengthOf(ids, 1, "expected exactly one job");
  const displayName = /^ {4}name:[ \t]*(.+)$/m.exec(jobs);
  return { id: ids[0], checkName: displayName ? displayName[1].trim() : ids[0] };
}

describe("names the lock depends on", function () {
  it("the Release workflow looks for the check that lock-files.yml produces", function () {
    const { checkName } = onlyJob(read(".github/workflows/lock-files.yml"));
    const lockStep = /- name: The lock is on\n[\s\S]*?any\(\. == "([^"]+)"\)/.exec(read(".github/workflows/release.yml"));
    assert.isNotNull(lockStep, 'release.yml has no "The lock is on" step that looks for a check by name');
    assert.equal(lockStep[1], checkName);
  });

  it("the check that guards the label is called pr-hygiene, as the docs say", function () {
    const { checkName } = onlyJob(read(".github/workflows/pr-hygiene.yml"));
    assert.equal(checkName, "pr-hygiene");
    assert.include(read("AGENTS.md"), "`pr-hygiene`");
  });

  it("the docs name the exception label the check uses", function () {
    assert.include(read("AGENTS.md"), `\`${EXCEPTION_LABEL}\``);
    assert.include(read(".github/workflows/lock-files.yml"), `\`${EXCEPTION_LABEL}\``);
  });
});
