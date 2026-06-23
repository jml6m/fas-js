import fs from "node:fs";
import path from "node:path";

const bundleGlobal = "lib/bundle.global.js";
const bundle = "lib/bundle.js";
const bundleGlobalMap = "lib/bundle.global.js.map";
const bundleMap = "lib/bundle.js.map";

if (fs.existsSync(bundleGlobal)) {
  if (fs.existsSync(bundle)) fs.rmSync(bundle);
  fs.renameSync(bundleGlobal, bundle);
}

if (fs.existsSync(bundleGlobalMap)) {
  if (fs.existsSync(bundleMap)) fs.rmSync(bundleMap);
  fs.renameSync(bundleGlobalMap, bundleMap);
}

const demoBundleGlobal = "lib/demo-bundle.global.js";
const demoBundle = "lib/demo-bundle.js";
const demoVendorBundle = "demo/v1.5/vendor/fas-js.bundle.js";

if (fs.existsSync(demoBundleGlobal)) {
  if (fs.existsSync(demoBundle)) fs.rmSync(demoBundle);
  fs.renameSync(demoBundleGlobal, demoBundle);
}

if (fs.existsSync(demoBundle)) {
  fs.mkdirSync(path.dirname(demoVendorBundle), { recursive: true });
  fs.copyFileSync(demoBundle, demoVendorBundle);
}

// The demo bundle is consumed only via the demo vendor copy above; it is not a
// library entry point, so keep it out of lib/ (and therefore out of the npm
// tarball). Sweep any demo artifacts the build may have emitted.
for (const stale of fs.readdirSync("lib")) {
  if (stale.startsWith("demo-bundle")) {
    fs.rmSync(path.join("lib", stale), { force: true });
  }
}