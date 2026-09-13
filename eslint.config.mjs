// ESLint flat config — E8 / FLAG-006.
//
// Why this file did not exist: `package.json` carried a `lint` script wired to
// `next lint`, and both eslint and eslint-config-next were installed — but no
// config was ever created. `next lint` answers that by dropping into an
// INTERACTIVE prompt ("How would you like to configure ESLint?"). So FLAG-006's
// "lint has never run" understates it: in CI the job would HANG until the
// timeout rather than fail, which is a worse failure than a red check.
//
// `next lint` is deprecated in Next 15 and REMOVED in Next 16, so the `lint`
// script now calls the ESLint CLI directly and this file is what it reads.
//
// eslint-config-next@15.5.19 ships eslintrc-style configs only — its package
// `exports` is null and there is no flat entry point — so FlatCompat is required
// to load them under ESLint 9 flat config. This is the same shape create-next-app
// generates for Next 15 + ESLint 9, not something invented here.
//
// The rule set is stated explicitly rather than inherited silently. Same reasoning
// as the backend's ruff.toml: "a decision that lives in a tool's defaults changes
// silently underneath you on the next upgrade" — which matters now that Lint gates.
//
// eslint, eslint-config-next and @eslint/eslintrc are PINNED to exact versions in
// package.json. Keep them pinned: on a gating job an unpinned linter means the next
// release can turn `develop` red with no code change. Upgrades are a deliberate PR.

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  {
    ignores: [
      // Build output. Generated, never ours to fix.
      '.next/**',
      'out/**',
      'build/**',
      'node_modules/**',
      'next-env.d.ts',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',

      // 🎨 Design-handoff exports. These are Claude Design canvas artefacts
      // (`.dc.html` + their bundled `designs/*.js`) committed as REFERENCE
      // MATERIAL for the DASH-1..6 work — third-party generated bundles, not
      // application code.
      //
      // Verified before ignoring rather than assumed: `grep -rn design_handoff src/`
      // returns five hits and every one is a COMMENT citing the design a component
      // was built from. Nothing under src/ imports them, and nothing here reaches
      // a bundle.
      //
      // This is where ALL 4 of the repo's lint errors live (2x
      // no-assign-module-variable, 2x react/no-deprecated) plus 16 warnings. Stating
      // that plainly because ignoring a directory that holds every error looks like
      // hiding debt: the point is that fixing a vendored design export would mean
      // editing a generated artefact we do not own and that ships nowhere.
      'design_handoff_*/**',
    ],
  },

  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  {
    rules: {
      // The repo already uses a leading underscore to mean "deliberately unused"
      // — `_slug` appears in five dashboards as a destructured route param kept
      // for signature symmetry. Encoding that existing convention in the rule is
      // the honest fix; editing five components to satisfy a linter that does not
      // know the convention is not.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];

export default config;
