import fs from "node:fs";
import path from "node:path";

const bundleGlobal = "lib/bundle.global.js";
const bundle = "lib/bundle.js";
const bundleGlobalMap = "lib/bundle.global.js.map";
const bundleMap = "lib/bundle.js.map";
const vendorBundle = "demo/v1.1/vendor/fas-js.bundle.js";

if (fs.existsSync(bundleGlobal)) {
  if (fs.existsSync(bundle)) fs.rmSync(bundle);
  fs.renameSync(bundleGlobal, bundle);
}

if (fs.existsSync(bundleGlobalMap)) {
  if (fs.existsSync(bundleMap)) fs.rmSync(bundleMap);
  fs.renameSync(bundleGlobalMap, bundleMap);
}

if (fs.existsSync(bundle)) {
  fs.mkdirSync(path.dirname(vendorBundle), { recursive: true });
  fs.copyFileSync(bundle, vendorBundle);
}

const demoBundleGlobal = "lib/demo-bundle.global.js";
const demoBundle = "lib/demo-bundle.js";
const demoVendorBundle = "demo/v1.1/vendor/fas-js.bundle.js";

if (fs.existsSync(demoBundleGlobal)) {
  if (fs.existsSync(demoBundle)) fs.rmSync(demoBundle);
  fs.renameSync(demoBundleGlobal, demoBundle);
}

if (fs.existsSync(demoBundle)) {
  fs.mkdirSync(path.dirname(demoVendorBundle), { recursive: true });
  fs.copyFileSync(demoBundle, demoVendorBundle);
}