import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      "coverage/**",
      "**/dist/**",
      "**/build/**",
      "**/out/**",
      "**/public/**",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "**/node_modules/**",
      "**/.pnpm-store/**",
      "**/*.min.js",
      "**/*.min.css",
      "**/.next/**",
      "**/.nuxt/**",
      "**/.venv/**",
      "**/venv/**",
      "**/__pycache__/**",
      "**/*.pyc",
      "**/lib/**",
      "**/tsconfig.tsbuildinfo",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
      "prefer-const": "error",
      "no-var": "error",
      "no-undef": "warn",
      "prettier/prettier": [
        "error",
        {
          singleQuote: false,
          trailingComma: "es5",
        },
      ],
    },
  },
  eslintPluginPrettierRecommended,
];
