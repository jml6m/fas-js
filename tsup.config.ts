import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/modules.ts" },
    format: ["esm", "cjs"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    outDir: "lib",
    outExtension({ format }) {
      return { js: format === "cjs" ? ".cjs" : ".js" };
    },
  },
  {
    entry: { bundle: "src/modules.ts" },
    format: ["iife"],
    globalName: "fasJs",
    minify: true,
    sourcemap: true,
    clean: false,
    outDir: "lib",
  },
  {
    entry: { "demo-bundle": "src/demo-bundle.ts" },
    format: ["iife"],
    globalName: "fasJs",
    minify: true,
    sourcemap: true,
    clean: false,
    outDir: "lib",
  },
]);