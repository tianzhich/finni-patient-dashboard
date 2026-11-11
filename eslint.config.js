import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig(
  globalIgnores(['dist/**', 'node_modules/**', 'data/**']),
  {
    files: ['**/*.{js,ts,tsx}'],
    extends: [js.configs.recommended],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
    rules: {
      // Express middleware must keep positional parameters, even when unused.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/tests/**'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: [
      'server/**/*.ts',
      'scripts/**/*.ts',
      'src/tests/**/*.{ts,tsx}',
      'shared/tests/**/*.ts',
      'tests/**/*.ts',
      '*.{js,ts}',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    // Component tests run in Node with a jsdom browser environment.
    files: ['src/tests/**/*.tsx'],
    languageOptions: { globals: globals.browser },
  },
  prettier,
);
