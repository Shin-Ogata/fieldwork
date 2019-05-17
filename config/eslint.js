'use strict';

module.exports = {
    extends: [
        'eslint:recommended',
    ],
    env: {
        es6: true,
        browser: true,
        node: true,
        commonjs: true,
        amd: true,
        jasmine: true,
    },
    parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2018,
    },
    globals: {
        CDP: true,
    },
    rules: {
        'max-len': [
            'error',
            {
                code: 180,
                ignoreComments: true,
            },
        ],
        'prefer-const': 'error',
        'semi': [
            'error',
            'always',
        ],
        'semi-spacing': 'error',
        'eqeqeq': [
            'error',
            'always',
            {
                null: 'ignore',
            },
        ],
        'quotes': [
            'error',
            'single',
            {
                avoidEscape: true,
                allowTemplateLiterals: true,
            },
        ],
        'curly': 'error',
        'radix': 'error',
        'default-case': [
            'error',
            {
                commentPattern: '^skip\\sdefault',
            },
        ],
        'object-curly-spacing': [
            'error',
            'always',
        ],
        'array-bracket-spacing': [
            'error',
            'never',
        ],
        'block-spacing': 'error',
        'brace-style': [
            'error',
            '1tbs',
            {
                allowSingleLine: true,
            },
        ],
        'keyword-spacing': 'error',
        'space-in-parens': 'error',
        'space-infix-ops': 'error',
        'space-unary-ops': 'error',
        'arrow-spacing': 'error',
        'camelcase': [
            'error',
            {
                allow: [
                    '^_',
                ],
            },
        ],
        'comma-spacing': 'error',
        'computed-property-spacing': 'error',
        'func-call-spacing': 'error',
        'no-unused-vars': [
            'error',
            {
                args: 'none',
                varsIgnorePattern: '^TAG|^__',
            },
        ],
        'no-unused-expressions': [
            'error',
            {
                allowShortCircuit: true,
                allowTernary: true,
                allowTaggedTemplates: true,
            }
        ],
        'no-var': 'error',
        'no-alert': 'error',
        'no-caller': 'error',
        'no-div-regex': 'error',
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-with': 'error',
        'no-proto': 'error',
        'no-iterator': 'error',
        'no-new-func': 'error',
        'no-new-wrappers': 'error',
        'no-new-object': 'error',
        'no-octal-escape': 'error',
        'no-script-url': 'error',
        'no-self-compare': 'error',
        'no-multiple-empty-lines': [
            'error',
            {
                max: 2,
                maxEOF: 1,
            },
        ],
        'no-trailing-spaces': 'error',
        'yoda': [
            'warn',
            'always',
            {
                onlyEquality: true,
            },
        ],
        'eol-last': 'warn',
        'object-shorthand': [
            'warn',
            'always',
            {
                avoidQuotes: true,
            },
        ],
        'prefer-arrow-callback': 'warn',
        'prefer-spread': 'warn',
        'prefer-template': 'warn',
        'no-extra-bind': 'warn',
        'no-invalid-this': 'warn',
        'no-loop-func': 'warn',
        'no-new': 'warn',
        'no-useless-call': 'warn',
        'no-useless-concat': 'warn',
        'no-lonely-if': 'warn',
        'no-unneeded-ternary': 'warn',
        'no-extra-boolean-cast': 'off',
        'no-bitwise': 'off',
        'no-console': 'off',
    }
};
