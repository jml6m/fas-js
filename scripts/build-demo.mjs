/**
 * Fills the demo site's vendor folders. No file in a vendor folder is tracked: each one is
 * copied from the build output, so the pages run exactly what the package ships.
 * Runs after `tsup` through the `postbuild` npm script.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __file = fileURLToPath(import.meta.url);
const defaultRoot = path.resolve(path.dirname(__file), "..");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function copyInto(from, to) {
  if (!fs.existsSync(from)) {
    throw new Error(`[build-demo] missing ${from}. Run "npm run build" so it exists.`);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

/** A classic script that tells a page which library version its vendor folder holds. */
export function buildInfoSource(version) {
  return `globalThis.fasJsDemoBuild = Object.freeze({ version: ${JSON.stringify(version)} });\n`;
}

/**
 * @param {{ rootDir?: string, log?: (message: string) => void }} [options]
 * @returns {string[]} the files written, relative to rootDir
 */
export function buildDemo({ rootDir = defaultRoot, log = () => {} } = {}) {
  const written = [];
  const out = relative => {
    written.push(relative);
    return path.join(rootDir, relative);
  };

  // The current simulator runs the browser bundle that is published to npm.
  copyInto(path.join(rootDir, "lib/bundle.js"), out("demo/vendor/fas-js.bundle.js"));
  const { version } = readJson(path.join(rootDir, "package.json"));
  fs.writeFileSync(out("demo/vendor/build-info.js"), buildInfoSource(version));

  log(`[build-demo] wrote ${written.length} files: ${written.join(", ")}`);
  return written;
}

if (path.resolve(process.argv[1] ?? "") === __file) {
  buildDemo({ log: console.log });
}
