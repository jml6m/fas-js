/**
 * CI gate: rules about a pull request itself, its labels and its branches. The workflow runs it
 * for every pull request, whatever branch it targets.
 *
 * 1. The `locked-files-changed` label is only for a pull request into the default branch that
 *    changes a protected file. It records that the pull request went through the exception
 *    process ("Locked files" in AGENTS.md). Whether a protected file may change is decided by
 *    scripts/check-protected-files.mjs, not here.
 * 2. A pull request into the default branch comes from a release branch of this repository, or
 *    from Dependabot's GitHub Actions updates.
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findViolations, getChangedFiles, loadPatterns, resolveBaseSha } from "./check-protected-files.mjs";

const __file = fileURLToPath(import.meta.url);

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

export const EXCEPTION_LABEL = "locked-files-changed";

// chore/vX.Y-name, chore/vX-name, vX.Y-name or vX-name
const RELEASE_BRANCH = /^(?:chore\/)?v\d+(?:\.\d+)?-[^/]+$/;
const DEPENDABOT_ACTIONS_BRANCH = /^dependabot\/github[_-]actions\/.+$/;

/** The one definition of a release branch name. */
export function isReleaseBranch(name) {
  return typeof name === "string" && RELEASE_BRANCH.test(name);
}

/** A branch of Dependabot's GitHub Actions updates. The version check for release pull requests uses it too. */
export function isDependabotActionsBranch(name) {
  return typeof name === "string" && DEPENDABOT_ACTIONS_BRANCH.test(name);
}

/** Label names on the pull request, from PR_LABELS (a JSON array). None for a local run. */
export function resolveLabels() {
  const raw = process.env.PR_LABELS ?? "";
  if (raw.trim() === "") return [];
  let labels;
  try {
    labels = JSON.parse(raw);
  } catch (err) {
    throw new Error(`PR_LABELS is not valid JSON: ${err.message}`);
  }
  if (!Array.isArray(labels) || labels.some((label) => typeof label !== "string")) {
    throw new Error("PR_LABELS must be a JSON array of label names");
  }
  return labels;
}

/**
 * The pull request's branches, from the environment. BASE_REF is the target branch as it is now;
 * EVENT_BASE_REF is what it was when the run started. They differ when the pull request was
 * retargeted afterwards, and then this run is out of date.
 */
export function resolveBranches() {
  const read = (name) => (process.env[name] ?? "").trim();
  const branches = {
    baseRef: read("BASE_REF"),
    headRef: read("HEAD_REF"),
    defaultBranch: read("DEFAULT_BRANCH"),
    eventBaseRef: read("EVENT_BASE_REF") || read("BASE_REF"),
    // Empty when the head repository is gone; such a pull request is not from this repository.
    fromThisRepository: read("HEAD_REPO") !== "" && read("HEAD_REPO") === read("GITHUB_REPOSITORY"),
  };
  if (branches.baseRef === "" || branches.headRef === "" || branches.defaultBranch === "") {
    throw new Error(
      "BASE_REF, HEAD_REF and DEFAULT_BRANCH are required (set automatically in CI; for a local run set them to branch names)"
    );
  }
  return branches;
}

/** Protected files the pull request changes: the same answer check-protected-files.mjs gives. */
export function protectedChanges() {
  const baseSha = resolveBaseSha();
  return findViolations(getChangedFiles(baseSha), loadPatterns(baseSha));
}

/** One message per broken rule; empty when the pull request breaks none. */
export function findProblems({
  labels,
  baseRef,
  headRef,
  defaultBranch,
  fromThisRepository,
  protectedChangesFn = protectedChanges,
}) {
  const problems = [];
  const intoDefault = baseRef === defaultBranch;

  if (labels.includes(EXCEPTION_LABEL)) {
    if (!intoDefault) {
      problems.push(
        `"${EXCEPTION_LABEL}" is only for pull requests into ${defaultBranch}. This one targets ${baseRef}: remove the label.`
      );
    } else if (protectedChangesFn().length === 0) {
      problems.push(`"${EXCEPTION_LABEL}" is on a pull request that changes no protected file: remove the label.`);
    }
  }

  if (intoDefault) {
    const releaseBranch = fromThisRepository && isReleaseBranch(headRef);
    const dependabotActions = fromThisRepository && isDependabotActionsBranch(headRef);
    if (!releaseBranch && !dependabotActions) {
      problems.push(
        `Pull requests into ${defaultBranch} come from a release branch of this repository (chore/vX.Y-name or vX.Y-name). ` +
          `This one comes from ${fromThisRepository ? headRef : `${headRef} in another repository`}: target the current release integration branch instead.`
      );
    }
  }

  return problems;
}

export function runCheck({
  resolveLabelsFn = resolveLabels,
  resolveBranchesFn = resolveBranches,
  protectedChangesFn = protectedChanges,
  log = (msg) => console.log(msg),
  error = (msg) => console.error(msg),
  exit = (code) => process.exit(code),
} = {}) {
  const labels = resolveLabelsFn();
  const { eventBaseRef, ...branches } = resolveBranchesFn();

  if (eventBaseRef !== branches.baseRef) {
    error(`${RED}[pr-hygiene] OUT OF DATE${RESET}`);
    error(`This run started when the pull request targeted ${eventBaseRef}; it now targets ${branches.baseRef}.`);
    error("The run that started when the target changed decides. Re-run that one, not this one.");
    exit(1);
    return;
  }

  const problems = findProblems({ labels, ...branches, protectedChangesFn });
  if (problems.length === 0) {
    log(`${GREEN}[pr-hygiene] OK${RESET}`);
    exit(0);
    return;
  }

  error(`${RED}[pr-hygiene] FAIL${RESET}`);
  for (const problem of problems) {
    error(`  - ${problem}`);
  }
  exit(1);
}

if (resolve(process.argv[1] ?? "") === __file) {
  runCheck();
}
