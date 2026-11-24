import fs from "node:fs";

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

const dts = "lib/index.d.ts";
const dcts = "lib/index.d.cts";
if (fs.existsSync(dts)) fs.copyFileSync(dts, dcts);
