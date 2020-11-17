'use strict';

const { resolve } = require('path');

module.exports = {
    extends: [
        './eslint.js',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ],
    plugins: [
        '@typescript-eslint',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: resolve(process.cwd(), 'tsconfig.json'),
        createDefaultProgram: true,
    },
    rules: {
        '@typescript-eslint/indent': [
            'error',
            4,
            {
                SwitchCase: 1,
                ignoreComments: true,
            },
        ],
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/func-call-spacing': 'error',
        '@typescript-eslint/member-naming': [
            'off',
            {
                private: '^_|^Symbol',
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
        '@typescript-eslint/consistent-type-assertions': 'error',
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
                singleline: {
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
        '@typescript-eslint/no-use-before-define': [
            'error',
            {
                functions: false,
                classes: false,
            },
        ],
        '@typescript-eslint/unbound-method': [
            'error',
            {
                ignoreStatic: true,
            },
        ],
        /*
         * continue consideration
         * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/ban-types.md#default-options
         * https://github.com/typescript-eslint/typescript-eslint/issues/2063#issuecomment-634318313
         */
        '@typescript-eslint/ban-types': [
            'error',
            {
                extendDefaults: true,
                types: {
                    'object': false,
                }
            },

        ],
        '@typescript-eslint/restrict-template-expressions': [
            'error',
            {
                allowNumber: true,
                allowBoolean: true,
                allowAny: true,
                allowNullish: true,
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
        // related `@typescript-eslint/no-explicit-any`. continue consideration to validate the following props.
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
    },
};
