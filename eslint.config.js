import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

export default tseslint.config(
  includeIgnoreFile(fileURLToPath(new URL(".gitignore", import.meta.url))),
  {
    ignores: ["demo/**/vendor/**", "dist/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // Cap source file size (ESLint docs default 300; 400 fits this focused lib).
      "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
    },
  }
);
