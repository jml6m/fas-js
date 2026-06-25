// Point git at the committed hooks dir so every dev clone gets the pre-push gate.
// Runs from `prepare` on `npm install`. No-ops outside a working git checkout (e.g.
// during publish from an extracted tarball) so it never breaks install/publish.

import { existsSync, chmodSync } from "node:fs";
import { execSync } from "node:child_process";

if (!existsSync(".git")) process.exit(0);

try {
  execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
  // Best-effort exec bit for POSIX; harmless/no-op on Windows.
  try {
    chmodSync(".githooks/pre-push", 0o755);
  } catch {
    /* ignore */
  }
} catch {
  /* not fatal — hooks are a local convenience, not a build requirement */
}
