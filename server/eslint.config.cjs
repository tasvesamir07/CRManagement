const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['dist/', 'node_modules/', '.wwebjs_auth/', 'uploads/', 'db.json'],
  },
  {
    files: ['**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-console': 'off',
      'prefer-const': 'warn',
      'no-var': 'warn',
      'eqeqeq': ['warn', 'smart'],
    },
  },
];
