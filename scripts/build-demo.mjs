/**
 * Fills the demo site's vendor folders. No file in a vendor folder is tracked: each one is
 * copied from the build output or from a development dependency, so the pages run exactly what
 * the packages ship and ask no other site for anything.
 * Runs after `tsup` through the `postbuild` npm script.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __file = fileURLToPath(import.meta.url);
const defaultRoot = path.resolve(path.dirname(__file), "..");

// The release the original 2019 simulator was written for. Its browser bundle is tracked in
// demo/v1/, byte for byte as published to npm, so the page needs nothing installed for it.
const ORIGINAL_VERSION = "1.3.1";
const GRAPHVIZ = "node_modules/@hpcc-js/wasm-graphviz";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function requireFile(file, hint) {
  if (!fs.existsSync(file)) {
    throw new Error(`[build-demo] missing ${file}. ${hint}`);
  }
  return file;
}

/** A classic script that tells a page which library version its vendor folder holds. */
export function buildInfoSource(version) {
  return `globalThis.fasJsDemoBuild = Object.freeze({ version: ${JSON.stringify(version)} });\n`;
}

/** The bundle names a source map that is not copied; without the comment no browser asks for it. */
export function withoutSourceMapComment(source) {
  return source.replace(/\n\/\/# sourceMappingURL=\S+\s*$/, "\n");
}

export function noticeText({ libraryVersion, graphvizVersion }) {
  return [
    "Third-party and earlier-release files in this folder",
    "",
    `../fas-js-${libraryVersion}.bundle.js: fas-js ${libraryVersion}, the release this simulator was written for,`,
    "  as published to npm. GPL-3.0-or-later. https://github.com/jml6m/fas-js",
    "  It contains parts of core-js (MIT). https://github.com/zloirock/core-js",
    "",
    `graphviz.js: @hpcc-js/wasm-graphviz ${graphvizVersion}, a WebAssembly build of Graphviz.`,
    "  Apache License 2.0; the full text is in graphviz.LICENSE.txt.",
    "  https://github.com/hpcc-systems/hpcc-js-wasm",
    "  Graphviz itself is under the Eclipse Public License. https://graphviz.org/license/",
    "",
  ].join("\n");
}

/**
 * @param {{ rootDir?: string, log?: (message: string) => void }} [options]
 * @returns {string[]} the files written, relative to rootDir
 */
export function buildDemo({ rootDir = defaultRoot, log = () => {} } = {}) {
  const written = [];
  const at = relative => path.join(rootDir, relative);
  const write = (relative, content) => {
    fs.mkdirSync(path.dirname(at(relative)), { recursive: true });
    fs.writeFileSync(at(relative), content);
    written.push(relative);
  };
  const built = relative => requireFile(at(relative), 'Run "npm run build" so it exists.');
  const installed = relative => requireFile(at(relative), 'Run "npm ci" so it exists.');

  // The current simulator runs the browser bundle that is published to npm.
  write("demo/vendor/fas-js.bundle.js", fs.readFileSync(built("lib/bundle.js")));
  write("demo/vendor/build-info.js", buildInfoSource(readJson(at("package.json")).version));

  // The original simulator runs the release it was written for and draws with Graphviz.
  const libraryVersion = ORIGINAL_VERSION;
  const graphvizVersion = readJson(installed(`${GRAPHVIZ}/package.json`)).version;
  write("demo/v1/vendor/build-info.js", buildInfoSource(libraryVersion));
  write(
    "demo/v1/vendor/graphviz.js",
    withoutSourceMapComment(fs.readFileSync(installed(`${GRAPHVIZ}/dist/index.js`), "utf8"))
  );
  write("demo/v1/vendor/graphviz.LICENSE.txt", fs.readFileSync(installed(`${GRAPHVIZ}/LICENSE`)));
  write("demo/v1/vendor/NOTICE.txt", noticeText({ libraryVersion, graphvizVersion }));

  log(`[build-demo] wrote ${written.length} files:\n${written.map(file => `  ${file}`).join("\n")}`);
  return written;
}

if (path.resolve(process.argv[1] ?? "") === __file) {
  buildDemo({ log: console.log });
}
