/**
 * CI gate: rules about a pull request itself (its labels and target branch), not about the
 * files it changes. The workflow runs it for every pull request, whatever branch it targets.
 *
 * Rule: the `locked-files-changed` label is only for pull requests into the default branch.
 * What the label means on those is decided by scripts/check-protected-files.mjs, which needs
 * the changed files and so runs for pull requests into the default branch only.
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EXCEPTION_LABEL, resolveLabels } from "./check-protected-files.mjs";

const __file = fileURLToPath(import.meta.url);

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

/** The pull request's target branch and the repository's default branch, from the environment. */
export function resolveBranches() {
  const baseRef = (process.env.BASE_REF ?? "").trim();
  const defaultBranch = (process.env.DEFAULT_BRANCH ?? "").trim();
  if (baseRef === "" || defaultBranch === "") {
    throw new Error(
      "BASE_REF and DEFAULT_BRANCH are required (set automatically in CI; for a local run set both to branch names)"
    );
  }
  return { baseRef, defaultBranch };
}

/** One message per broken rule; empty when the pull request breaks none. Pure. */
export function findProblems({ labels, baseRef, defaultBranch }) {
  const problems = [];
  if (labels.includes(EXCEPTION_LABEL) && baseRef !== defaultBranch) {
    problems.push(
      `"${EXCEPTION_LABEL}" is only for pull requests into ${defaultBranch}. This one targets ${baseRef}: remove the label.`
    );
  }
  return problems;
}

export function runCheck({
  resolveLabelsFn = resolveLabels,
  resolveBranchesFn = resolveBranches,
  log = (msg) => console.log(msg),
  error = (msg) => console.error(msg),
  exit = (code) => process.exit(code),
} = {}) {
  const labels = resolveLabelsFn();
  const { baseRef, defaultBranch } = resolveBranchesFn();
  const problems = findProblems({ labels, baseRef, defaultBranch });

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
