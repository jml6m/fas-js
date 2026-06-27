// Reserved-name guard for the pre-push hook.
//
// The next-version-prep-branch ruleset targets these globs:
//   refs/heads/v*.*-*  refs/heads/v*-*  refs/heads/chore/v*.*-*  refs/heads/chore/v*-*
// They are reserved for the single per-release version-integration branch. Pushing any
// OTHER branch whose name matches one of them silently subjects it to that ruleset
// (PR-required, linear history, strict checks), breaking normal push/merge flow — so
// this blocks it before it leaves the machine.
//
// The designated integration branch is determined dynamically by querying the remote for
// any already-existing branches with reserved names. A reserved-named branch is allowed
// when it is already established on the remote (it IS the integration branch) or when no
// reserved-named branch exists on the remote yet (creating a new release line).
//
// Reads git's pre-push payload on stdin: "<localRef> <localSha> <remoteRef> <remoteSha>"
// per line. Exits non-zero (with an explanation) if a reserved-named, non-integration
// branch is being pushed.

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ZERO = "0000000000000000000000000000000000000000";

// Mirrors the ruleset globs: a single path segment (optionally under `chore/`) that
// starts with `v` and contains `-`. Deeper nesting (chore/v1.8/foo) and other prefixes
// (topic/...) never match — matching GitHub's `*` which does not cross `/`.
export function isReservedName(name) {
  let seg = name;
  if (seg.startsWith("chore/")) seg = seg.slice("chore/".length);
  if (seg.includes("/")) return false;
  return seg.startsWith("v") && seg.includes("-");
}

// Query the remote for branches that already use a reserved integration-branch name.
// Returns an array of branch names (without refs/heads/ prefix).
// Fails open (returns []) if the remote is unreachable — hooks are a local convenience.
export function getRemoteIntegrationBranches(remote = "origin") {
  try {
    const out = execSync(`git ls-remote --heads ${remote}`, { encoding: "utf8" });
    return out
      .split("\n")
      .map((l) => {
        const m = l.match(/\trefs\/heads\/(.+)/);
        return m ? m[1].trim() : null;
      })
      .filter((n) => n && isReservedName(n));
  } catch {
    return []; // fail open
  }
}

// Determine whether pushing a reserved-named branch is permitted.
//   - Allowed: the branch is already established on the remote (it IS the integration branch).
//   - Allowed: no reserved-named branch exists on the remote yet (opening a new release line).
//   - Blocked: a different reserved-named branch already exists on the remote.
export function isAllowedReservedPush(name, remoteReserved) {
  if (remoteReserved.includes(name)) return true; // established integration branch
  if (remoteReserved.length === 0) return true;   // no integration branch yet — creating one
  return false;
}

// Core check with dependency injection — suitable for unit testing.
export function runCheck({
  payload,
  getRemoteIntegrationBranchesFn = getRemoteIntegrationBranches,
  error = console.error,
}) {
  let remoteReserved;
  try {
    remoteReserved = getRemoteIntegrationBranchesFn();
  } catch {
    remoteReserved = []; // fail open — remote unreachable
  }
  const offenders = [];

  for (const line of payload.split("\n")) {
    if (!line.trim()) continue;
    const [, localSha, remoteRef] = line.split(" ");
    if (!remoteRef || !remoteRef.startsWith("refs/heads/")) continue;
    if (localSha === ZERO) continue; // branch deletion — nothing to gate
    const name = remoteRef.slice("refs/heads/".length);
    if (isReservedName(name) && !isAllowedReservedPush(name, remoteReserved)) offenders.push(name);
  }

  if (offenders.length === 0) return 0;

  error("\n✖ pre-push blocked — reserved version-integration branch name(s):");
  for (const b of offenders) error("    " + b);
  error("\nThe patterns v*.*-*, v*-*, chore/v*.*-*, chore/v*-* are RESERVED for the single");
  error("per-release integration branch (next-version-prep-branch ruleset).");
  error(
    remoteReserved.length > 0
      ? `Current integration branch on remote: ${remoteReserved.join(", ")}`
      : "No integration branch is currently on the remote.",
  );
  error("Rename this work to the topic/<name> convention (see AGENTS.md §4), or push with");
  error("--no-verify if this really is the new integration branch.\n");
  return 1;
}

function main() {
  let payload = "";
  try {
    payload = readFileSync(0, "utf8");
  } catch {
    payload = "";
  }
  return runCheck({ payload });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main());
