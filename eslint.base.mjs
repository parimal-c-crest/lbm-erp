// Shared ESLint base — workspace-wide rules per `6-development/3-coding-standards.md` §6
// (ADR-019). Backend and frontend eslint.config.mjs each import and spread this in.
import importPlugin from 'eslint-plugin-import';

export default [
  {
    plugins: { import: importPlugin },
    rules: {
      curly: ['error', 'all'],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
];
