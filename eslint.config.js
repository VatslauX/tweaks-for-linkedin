// Lint for mistakes only (unused code, undefined names); style is free.
const js = require('@eslint/js');
const globals = require('globals');

// globals that flags.js and promoted.js define for the other scripts
const flags = Object.fromEntries(['LIO_TABS', 'LIO_TWEAKS', 'LIO_DEFAULTS', 'lioSettings', 'lioListeners', 'lioOnSettings',
  'lioSanitize', 'lioBlocked', 'lioOff', 'lioTabFor', 'lioAlive', 'LIO_COUNT_MESSAGE', 'lioWatchPromoted', 'lioPromotedCount', 'lioWatchDegree', 'LIO_DEGREE_SWITCHES', 'lioWatchCompany', 'LIO_COMPANIES_KEY', 'lioCleanCompanies'].map(k => [k, 'readonly']));

module.exports = [
  { ignores: ['node_modules/', 'test-results/', 'playwright-report/', '.claude/', '.venv/', '.harness-profile/', '.idea/'] },
  js.configs.recommended,
  {
    files: ['extension/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser, ...flags, chrome: 'readonly' } },
    rules: {
      'no-unused-vars': ['error', { caughtErrors: 'none', vars: 'local' }], // top-level = shared with other scripts
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-redeclare': ['error', { builtinGlobals: false }] // flags.js declares the shared globals
    }
  },
  {
    // Node, plus browser code inside page.evaluate()
    files: ['tests/**/*.js', 'scripts/**/*.js', '*.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } },
    rules: {
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-empty-pattern': 'off' // Playwright fixtures take ({}, use)
    }
  }
];
