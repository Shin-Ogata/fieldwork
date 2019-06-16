'use strict';

const { resolve } = require('path');

module.exports = {
    extends: [
        './eslint.js',
        'plugin:@typescript-eslint/recommended',
    ],
    plugins: [
        '@typescript-eslint',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: resolve(process.cwd(), 'tsconfig.json'),
    },
    rules: {
        '@typescript-eslint/indent': [
            'error',
            4,
            {
                ignoreComments: true,
            },
        ],
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/func-call-spacing': 'error',
        '@typescript-eslint/member-naming': [
            'error',
            {
                private: '^_',
            },
        ],
        '@typescript-eslint/no-require-imports': 'error',
        '@typescript-eslint/no-this-alias': [
            'error',
            {
                allowDestructuring: true,
                allowedNames: [
                    'self',
                ],
            },
        ],
        '@typescript-eslint/no-object-literal-type-assertion': [
            'error',
            {
                allowAsParameter: true,
            },
        ],
        '@typescript-eslint/unified-signatures': 'error',
        '@typescript-eslint/explicit-function-return-type': [
            'error',
            {
                allowExpressions: true,
                allowTypedFunctionExpressions: true,
            },
        ],
        '@typescript-eslint/member-delimiter-style': [
            'error',
            {
                'singleline': {
                    delimiter: 'semi',
                    requireLast: true,
                },
            },
        ],
        '@typescript-eslint/explicit-member-accessibility': [
            'warn',
            {
                accessibility: 'explicit',
                overrides: {
                    accessors: 'no-public',
                    constructors: 'no-public',
                    properties: 'no-public',
                    methods: 'off',
                    parameterProperties: 'explicit',
                }
            },
        ],
        '@typescript-eslint/no-for-in-array': 'warn',
        '@typescript-eslint/no-unnecessary-qualifier': 'warn',
        '@typescript-eslint/no-useless-constructor': 'warn',
        '@typescript-eslint/prefer-for-of': 'warn',
        '@typescript-eslint/prefer-includes': 'warn',
        '@typescript-eslint/prefer-string-starts-ends-with': 'warn',
        '@typescript-eslint/prefer-regexp-exec': 'warn',
        '@typescript-eslint/require-array-sort-compare': 'warn',
        '@typescript-eslint/restrict-plus-operands': 'warn',
        '@typescript-eslint/interface-name-prefix': 'off',
    },
};
