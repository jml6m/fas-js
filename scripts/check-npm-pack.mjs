/**
 * CI gate: npm publish tarball contains only distributable artifacts.
 */
import { execSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

const ALLOWED_PACKAGE_FILES = new Set([
  "package.json",
  "README.md",
  "readme.md",
  "LICENSE",
  "license",
  "LICENSE.md",
  "license.md",
]);

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
  tarball = resolve(root, match[0]);

  const listing = execSync(`tar -tzf "${tarball}"`, { encoding: "utf8" });
  const entries = listing
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  if (!entries.some(entry => entry === "package/lib/index.js")) {
    throw new Error("npm pack tarball missing package/lib/index.js");
  }

  for (const entry of entries) {
    if (!entry.startsWith("package/")) {
      throw new Error(`unexpected tarball root entry: ${entry}`);
    }
    const rel = entry.slice("package/".length);
    if (!rel) continue;

    if (rel.startsWith("lib/")) continue;
    if (ALLOWED_PACKAGE_FILES.has(rel)) continue;

    throw new Error(`forbidden path in npm pack tarball: ${entry}`);
  }

  for (const forbidden of ["package/src/", "package/test/", "package/demo/"]) {
    if (entries.some(entry => entry.startsWith(forbidden))) {
      throw new Error(`npm pack tarball must not include ${forbidden}`);
    }
  }

  console.log(`[check-npm-pack] OK — ${entries.length} paths, package/lib/ only`);
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