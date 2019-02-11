import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import builtins from "rollup-plugin-node-builtins";
import globals from "rollup-plugin-node-globals";

export default {
  input: "lib/modules.js",
  output: [
    {
      file: "lib/modules.bundle.js",
      format: "esm"
    },
    {
      file: "lib/modules.umd.js",
      format: "umd",
      name: "fasJs"
    }
  ],
  plugins: [
    globals(),
    builtins(),
    resolve({
      preferBuiltins: false,
      browser: true,
      customResolveOptions: {
        moduleDirectory: "node_modules"
      }
    }),
    commonjs()
  ]
};
