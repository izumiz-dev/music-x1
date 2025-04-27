import js from '@eslint/js';
import * as tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';

export default [
  // JavaScript の基本設定
  js.configs.recommended,

  // TypeScript の設定
  ...tseslint.configs.recommended,

  // 共通設定
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        chrome: 'readonly',
        browser: 'readonly',
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },

  // TypeScript ファイル用の設定
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      react: reactPlugin,
    },
    settings: {
      react: {
        version: 'detect',
        pragma: 'h', // Preact uses 'h' instead of React.createElement
      },
    },
    rules: {
      // TypeScript 固有のルール
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // React/Preact 関連のルール
      'react/prop-types': 'off', // TypeScript を使用しているため不要
      'react/react-in-jsx-scope': 'off', // Preact では不要
      'react/no-unknown-property': ['error', { ignore: ['class'] }], // Preact では 'class' を使用

      // 一般的なルール
      'no-console': 'off', // すべてのconsoleメソッドを許可
      'no-debugger': 'warn',
      'no-alert': 'warn',
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'curly': ['error', 'all'],
      'brace-style': ['error', '1tbs'],
      'indent': ['error', 2, { SwitchCase: 1 }],
      'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
    },
  },

  // 無視するファイル
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      '*.config.js',
      'esbuild.*.js',
      '*.d.ts',
      'scripts/**/*.js',
      '.eslintrc.js',
    ],
  },
];
