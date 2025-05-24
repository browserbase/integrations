import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      'coverage/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/public/**',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      '**/node_modules/**',
      '**/.pnpm-store/**',
      '**/*.min.js',
      '**/*.min.css',
      '**/.next/**',
      '**/.nuxt/**',
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
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  eslintPluginPrettierRecommended,
]; 