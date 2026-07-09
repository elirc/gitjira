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
    files: ['apps/api/**/*.js'],
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
];
