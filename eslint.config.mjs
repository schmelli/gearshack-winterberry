import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Custom rules
  {
    rules: {
      // Allow underscore-prefixed unused variables (common convention for intentionally unused params)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Downgrade any type errors to warnings - many are from Supabase tables not yet in generated types
      // TODO: Regenerate Supabase types and fix these properly, then change back to "error"
      "@typescript-eslint/no-explicit-any": "warn",
      // Downgrade React Compiler rules to warnings - these require significant refactoring
      // TODO: Gradually refactor these patterns to be React 19 Compiler compliant
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
