import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'apps/*/dist', 'modules/*/dist', '.claude/', 'e2e/'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // Granice slojeva (CLAUDE.md, „Layer rules"). Testovi smeju da uvoze vitest
  // i testing-library, ali ne i druge slojeve.
  ...layerRules('modules/domain', ['@fe/*', 'react', 'react-*', 'react/*', 'axios', 'zustand', 'i18next']),
  ...layerRules('modules/application', [
    '@fe/infrastructure',
    '@fe/ui',
    '@fe/web',
    'react',
    'react-*',
    'react/*',
    'axios',
    'zustand',
    'i18next',
  ]),
  ...layerRules('modules/infrastructure', ['@fe/application', '@fe/ui', '@fe/web', 'react', 'react-*', 'react/*']),
  ...layerRules('modules/ui', ['@fe/infrastructure', '@fe/web', 'axios'], ['modules/ui/src/app/container/**']),
  // Demo partner je nezavisan sajt kao pravi partner: ne sme da uvozi nijedan `@fe/*` paket.
  ...layerRules('apps/demo-partner', ['@fe/*', '@fe/*/**']),
);

/**
 * `no-restricted-imports` za jedan paket: `forbidden` su paketi koje ne sme da
 * uvozi; `except` su fajlovi u tom paketu na koje zabrana ne važi (composition
 * root).
 */
function layerRules(dir, forbidden, except = []) {
  return [
    {
      files: [`${dir}/src/**/*.{ts,tsx}`],
      ignores: except,
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: forbidden,
                message: `${dir} ne sme da uvozi ovaj paket (granice slojeva, CLAUDE.md).`,
              },
            ],
          },
        ],
      },
    },
  ];
}
