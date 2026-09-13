// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * DOM query APIs are only allowed inside the Google Maps adapter folder.
 * Everything else must go through the adapter's typed API. This keeps all
 * Google-layout-dependent code in a single place (see docs/DECISIONS.md).
 */
const DOM_QUERY_SELECTOR =
  'CallExpression[callee.property.name=/^(querySelector|querySelectorAll|getElementsByClassName|getElementsByTagName|getElementsByName|closest|evaluate)$/]';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.output/**',
      '**/.wxt/**',
      '**/.astro/**',
      '**/.venv/**',
      'apps/api/**',
      '**/fixtures/**',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js', '*.mjs', 'scripts/*.mjs'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser, ...globals.node, ...globals.es2022 },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // With noUncheckedIndexedAccess, a `!` after a bounds-checked index is the
      // explicit acknowledgement; the stylistic rule below would otherwise fight
      // no-non-null-assertion on every such site.
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: DOM_QUERY_SELECTOR,
          message:
            'DOM queries are only allowed in apps/extension/src/adapters/google-maps/. Use the adapter API.',
        },
      ],
    },
  },
  {
    files: ['apps/extension/src/adapters/google-maps/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  prettier,
);
