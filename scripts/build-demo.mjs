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

const graphvizNotice = graphvizVersion => [
  `graphviz.js: @hpcc-js/wasm-graphviz ${graphvizVersion}, a WebAssembly build of Graphviz.`,
  "  Apache License 2.0; the full text is in graphviz.LICENSE.txt.",
  "  https://github.com/hpcc-systems/hpcc-js-wasm",
  "  Graphviz itself is under the Eclipse Public License. https://graphviz.org/license/",
];

/** The notice beside the current simulator's vendor files. */
export function currentNoticeText({ libraryVersion, graphvizVersion }) {
  return [
    "Files in this folder",
    "",
    `fas-js.bundle.js: fas-js ${libraryVersion}, the browser bundle the package publishes to npm.`,
    "  GPL-3.0-or-later. https://github.com/jml6m/fas-js",
    "",
    ...graphvizNotice(graphvizVersion),
    "",
  ].join("\n");
}

/** The notice beside the original simulator's vendor files. */
export function noticeText({ libraryVersion, graphvizVersion }) {
  return [
    "Third-party and earlier-release files in this folder",
    "",
    `../fas-js-${libraryVersion}.bundle.js: fas-js ${libraryVersion}, the release this simulator was written for,`,
    "  as published to npm. GPL-3.0-or-later. https://github.com/jml6m/fas-js",
    "  It contains parts of core-js (MIT). https://github.com/zloirock/core-js",
    "",
    ...graphvizNotice(graphvizVersion),
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
  const bundle = fs.readFileSync(built("lib/bundle.js"));
  const currentVersion = readJson(at("package.json")).version;

  // Both simulators draw with the same Graphviz build, each from its own vendor folder.
  const graphvizVersion = readJson(installed(`${GRAPHVIZ}/package.json`)).version;
  const graphviz = withoutSourceMapComment(fs.readFileSync(installed(`${GRAPHVIZ}/dist/index.js`), "utf8"));
  const graphvizLicence = fs.readFileSync(installed(`${GRAPHVIZ}/LICENSE`));

  write("demo/vendor/fas-js.bundle.js", bundle);
  write("demo/vendor/build-info.js", buildInfoSource(currentVersion));
  write("demo/vendor/graphviz.js", graphviz);
  write("demo/vendor/graphviz.LICENSE.txt", graphvizLicence);
  write("demo/vendor/NOTICE.txt", currentNoticeText({ libraryVersion: currentVersion, graphvizVersion }));

  // The original simulator runs the release it was written for.
  write("demo/v1/vendor/build-info.js", buildInfoSource(ORIGINAL_VERSION));
  write("demo/v1/vendor/graphviz.js", graphviz);
  write("demo/v1/vendor/graphviz.LICENSE.txt", graphvizLicence);
  write("demo/v1/vendor/NOTICE.txt", noticeText({ libraryVersion: ORIGINAL_VERSION, graphvizVersion }));

  log(`[build-demo] wrote ${written.length} files:\n${written.map(file => `  ${file}`).join("\n")}`);
  return written;
}

if (path.resolve(process.argv[1] ?? "") === __file) {
  buildDemo({ log: console.log });
}
