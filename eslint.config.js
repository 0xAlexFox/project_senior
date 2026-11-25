import { builtinModules } from 'node:module'
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

const nodeModules = [
  ...new Set(
    builtinModules.flatMap((name) =>
      name.startsWith('node:') ? [name] : [name, `node:${name}`],
    ),
  ),
]

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '.local/**',
      'var/**',
      'storage/**',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,vue}'],
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          reportUsedIgnorePattern: true,
        },
      ],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',
    },
  },
  ...vue.configs['flat/essential'],
  {
    files: ['apps/web/src/**/*.{js,mjs,cjs,vue}'],
    languageOptions: { globals: globals.browser },
    rules: {
      'vue/no-v-html': 'error',
      // Static imports only; runtime loading and transitive dependencies need review.
      'no-restricted-imports': [
        'error',
        {
          paths: nodeModules.map((name) => ({
            name,
            message: 'Node.js modules must not be imported into browser code.',
          })),
          patterns: [
            {
              group: [
                '@converter/backend',
                '@converter/backend/**',
                '@converter/conversion',
                '@converter/conversion/**',
                '@converter/api',
                '@converter/api/**',
                '@converter/worker',
                '@converter/worker/**',
              ],
              message:
                'Browser code may use contracts, but not server workspaces.',
            },
            {
              regex:
                '(^|/)(packages/(backend|conversion)|apps/(api|worker))(/|$)',
              message: 'Do not bypass workspace boundaries using file paths.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '*.{js,mjs,cjs}',
      'apps/*/*.{js,mjs,cjs}',
      'apps/{api,worker}/**/*.{js,mjs,cjs}',
      'packages/**/*.{js,mjs,cjs}',
      'scripts/**/*.{js,mjs,cjs}',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    // Playwright test bodies run in Node; page.evaluate callbacks run in the browser.
    files: ['tests/**/*.{js,mjs,cjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['apps/**/src/**/*.{js,mjs,cjs,vue}', 'packages/**/*.{js,mjs,cjs}'],
    rules: { 'no-console': 'error' },
  },
  prettier,
]
