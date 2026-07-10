// LEARN: ESLint "flat config" (the modern format) is just an array of config
// objects applied in order — no more hidden merging of .eslintrc files up the
// directory tree. What you see here is the entire lint policy.
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';

export default [
  { ignores: ['**/dist/**', '**/node_modules/**'] },

  // LEARN: js.configs.recommended catches real bugs (unused vars, unreachable
  // code, accidental globals) — not style. Style belongs to Prettier; keeping
  // the two concerns separate means lint failures are always worth reading.
  js.configs.recommended,

  {
    files: ['apps/api/**/*.js', 'apps/worker/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['apps/web/**/*.{js,jsx}'],
    plugins: { react },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // LEARN: core ESLint doesn't know JSX — `<Foo />` doesn't count as
      // "using" Foo, so every component import looked unused. These two
      // rules teach it. Found the honest way: a red CI run on this PR.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
    },
  },
  {
    files: ['packages/**/*.js', '*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  // LEARN: build/CI scripts are Node too. `.mjs` under scripts/ (the ratchet)
  // needs `process`/`console` as known globals — otherwise no-undef fires. The
  // `*.js` glob above only matches the repo root, not subdirectories.
  {
    files: ['scripts/**/*.{js,mjs}'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node } },
  },
  // LEARN: Playwright E2E specs run under Node (fs, process) and import their
  // own `test`/`expect`, so no test-runner globals are needed here — just Node.
  {
    files: ['e2e/**/*.js', 'playwright.config.js'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node } },
  },
];
