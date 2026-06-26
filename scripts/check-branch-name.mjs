// Reserved-name guard for the pre-push hook.
//
// The next-version-prep-branch ruleset targets these globs:
//   refs/heads/v*.*-*  refs/heads/v*-*  refs/heads/chore/v*.*-*  refs/heads/chore/v*-*
// They are reserved for the single per-release version-integration branch (recorded in
// .github/INTEGRATION_BRANCH). Pushing any OTHER branch whose name matches one of them
// silently subjects it to that ruleset (PR-required, linear history, strict checks),
// breaking normal push/merge flow — so this blocks it before it leaves the machine.
//
// Reads git's pre-push payload on stdin: "<localRef> <localSha> <remoteRef> <remoteSha>"
// per line. Exits non-zero (with an explanation) if a reserved-named, non-integration
// branch is being pushed.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ZERO = "0000000000000000000000000000000000000000";

function integrationBranch() {
  try {
    return readFileSync(".github/INTEGRATION_BRANCH", "utf8").trim();
  } catch {
    return "";
  }
}

// Mirrors the ruleset globs: a single path segment (optionally under `chore/`) that
// starts with `v` and contains `-`. Deeper nesting (chore/v1.8/foo) and other prefixes
// (topic/...) never match — matching GitHub's `*` which does not cross `/`.
export function isReservedName(name) {
  let seg = name;
  if (seg.startsWith("chore/")) seg = seg.slice("chore/".length);
  if (seg.includes("/")) return false;
  return seg.startsWith("v") && seg.includes("-");
}

function main() {
  const integration = integrationBranch();
  let payload = "";
  try {
    payload = readFileSync(0, "utf8");
  } catch {
    payload = "";
  }

  const offenders = [];
  for (const line of payload.split("\n")) {
    if (!line.trim()) continue;
    const [, localSha, remoteRef] = line.split(" ");
    if (!remoteRef || !remoteRef.startsWith("refs/heads/")) continue;
    if (localSha === ZERO) continue; // branch deletion — nothing to gate
    const name = remoteRef.slice("refs/heads/".length);
    if (isReservedName(name) && name !== integration) offenders.push(name);
  }

  if (offenders.length === 0) return 0;

  console.error("\n✖ pre-push blocked — reserved version-integration branch name(s):");
  for (const b of offenders) console.error("    " + b);
  console.error(
    "\nThe patterns v*.*-*, v*-*, chore/v*.*-*, chore/v*-* are RESERVED for the single",
  );
  console.error("per-release integration branch (next-version-prep-branch ruleset).");
  console.error(
    integration
      ? `Designated integration branch: ${integration}`
      : "No integration branch is designated (.github/INTEGRATION_BRANCH is empty/missing).",
  );
  console.error(
    "Rename this work to the topic/<name> convention (see AGENTS.md §4), or push with",
  );
  console.error("--no-verify if this really is the integration branch and the pointer is stale.\n");
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main());
