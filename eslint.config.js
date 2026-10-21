import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src/api/generated/**',
      'src/mocks/mockServiceWorker.js',
      'src/mocks/generated.json',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'docs/**/*.mjs'],
    // Existing /* global */ comments may repeat these runtime globals;
    // duplicate source declarations are still checked.
    rules: { 'no-redeclare': ['error', { builtinGlobals: false }] },
    languageOptions: {
      globals: {
        console: 'readonly', process: 'readonly', Buffer: 'readonly', URL: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly', atob: 'readonly',
        FormData: 'readonly', File: 'readonly', AbortController: 'readonly',
        AbortSignal: 'readonly', fetch: 'readonly', crypto: 'readonly',
      },
    },
  },
  {
    // Playwright evaluate callbacks run in the page rather than in Node.
    files: ['scripts/*browser*.mjs', 'scripts/growth-*.mjs', 'scripts/render-*.mjs', 'docs/fitness-motion/verify*.mjs'],
    languageOptions: {
      globals: { document: 'readonly', window: 'readonly', sessionStorage: 'readonly', innerWidth: 'readonly' },
    },
  },
  {
    files: ['print-helper/**/*.js'],
    languageOptions: {
      globals: {
        chrome: 'readonly', window: 'readonly', document: 'readonly', location: 'readonly',
        URL: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
        atob: 'readonly', DataTransfer: 'readonly', File: 'readonly', Event: 'readonly',
        FormData: 'readonly', AbortController: 'readonly', fetch: 'readonly',
      },
    },
  },
);
