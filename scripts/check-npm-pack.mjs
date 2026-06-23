/**
 * CI / pre-publish gate: the npm tarball ships EXACTLY the minimal published
 * surface — no more, no less.
 *
 * This is the manifest lock. The published file set is enumerated below and the
 * tarball must match it exactly: an extra file (e.g. a demo bundle, sourcemap,
 * or stray artifact) fails, and a missing entry point fails. Because this script
 * is listed in .github/PROTECTED_FILES.json, widening the published surface
 * requires the owner-approved override process (see CONTRIBUTING.md) — mirroring
 * how source files are locked. Keep this list in sync with package.json "files".
 */
import { execSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

// npm always includes these regardless of "files"; accept the common casings.
const ALLOWED_ROOT_FILES = new Set([
  "package.json",
  "README.md",
  "readme.md",
  "LICENSE",
  "license",
  "LICENSE.md",
  "license.md",
]);

// The exact set of lib/ artifacts permitted in the tarball. Mirror of the
// package.json "files" allowlist. No sourcemaps, no demo bundle, no .gitkeep.
const EXPECTED_LIB_FILES = new Set([
  "lib/index.js",
  "lib/index.cjs",
  "lib/index.d.ts",
  "lib/index.d.cts",
  "lib/bundle.js",
]);

const FORBIDDEN_PREFIXES = ["package/src/", "package/test/", "package/demo/"];

let tarball = "";

try {
  const output = execSync("npm pack --pack-destination .", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const match = output.match(/fas-js-[\d.]+\.tgz/);
  if (!match) {
    throw new Error(`npm pack did not report tarball name: ${output}`);
  }
  const tarballName = match[0];
  tarball = resolve(root, tarballName);

  // Run tar from root with the bare filename: a Windows absolute path
  // ("C:\...") is misread by GNU tar as a remote host spec.
  const listing = execSync(`tar -tzf "${tarballName}"`, { cwd: root, encoding: "utf8" });
  const entries = listing
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .filter(entry => !entry.endsWith("/")); // drop directory entries

  for (const forbidden of FORBIDDEN_PREFIXES) {
    if (entries.some(entry => entry.startsWith(forbidden))) {
      throw new Error(`npm pack tarball must not include ${forbidden}`);
    }
  }

  const libFiles = new Set();
  for (const entry of entries) {
    if (!entry.startsWith("package/")) {
      throw new Error(`unexpected tarball root entry: ${entry}`);
    }
    const rel = entry.slice("package/".length);
    if (!rel) continue;

    if (rel.startsWith("lib/")) {
      if (!EXPECTED_LIB_FILES.has(rel)) {
        throw new Error(
          `forbidden lib path in npm pack tarball: ${entry}\n` +
            `  Published surface is locked to: ${[...EXPECTED_LIB_FILES].join(", ")}\n` +
            `  To change it, follow the protected-file override process (CONTRIBUTING.md).`
        );
      }
      libFiles.add(rel);
      continue;
    }

    if (ALLOWED_ROOT_FILES.has(rel)) continue;

    throw new Error(`forbidden path in npm pack tarball: ${entry}`);
  }

  const missing = [...EXPECTED_LIB_FILES].filter(f => !libFiles.has(f));
  if (missing.length > 0) {
    throw new Error(`npm pack tarball missing required lib files: ${missing.join(", ")}`);
  }

  console.log(
    `[check-npm-pack] OK — ${entries.length} paths, lib/ matches the locked manifest exactly`
  );
} finally {
  if (tarball) {
    rmSync(tarball, { force: true });
  }
  for (const name of readdirSync(root)) {
    if (/^fas-js-.*\.tgz$/.test(name)) {
      rmSync(resolve(root, name), { force: true });
    }
  }
}
