import pluginJs from '@eslint/js';
import perfectionist from 'eslint-plugin-perfectionist';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { perfectionist },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { ignoreRestSiblings: true }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'moment-timezone',
              message:
                "Import moment from '@app/utils/datetime/moment', which loads only the club's time zone.",
            },
            {
              name: 'lodash',
              message: "Import from 'lodash-es', which the build can tree-shake.",
            },
          ],
        },
      ],
      'perfectionist/sort-arrays': [
        'error',
        {
          useConfigurationIf: {
            matchesAstSelector:
              "Decorator > CallExpression[callee.name='Component'] > ObjectExpression > Property[key.name='imports'] > ArrayExpression",
          },
        },
      ],
    },
  },
];
