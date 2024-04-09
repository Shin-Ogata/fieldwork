import globals from 'globals';
import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin-js';

export default [
    eslint.configs.recommended,
    {
        plugins: {
            '@stylistic:js': stylistic,
        },
        languageOptions: {
            globals: {
                CDP: true,
                globalThis: true,
                ...globals.browser,
                ...globals.es2021,
                ...globals.node,
                ...globals.commonjs,
                ...globals.amd,
                ...globals.jasmine,
            },
            parserOptions: {
                sourceType: 'module',
                ecmaVersion: 2022,
            },
        },
        linterOptions: {
            reportUnusedDisableDirectives: 'warn',
        },
        rules: {
            'prefer-const': 'error',
            'eqeqeq': [
                'error',
                'always',
                {
                    null: 'ignore',
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
            'camelcase': [
                'error',
                {
                    allow: [
                        '^_',
                    ],
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
            'no-constant-condition': [
                'error',
                {
                    checkLoops: false,
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
            'no-duplicate-imports': [
                'error',
                {
                    includeExports: false,
                }
            ],
            'yoda': [
                'warn',
                'always',
                {
                    onlyEquality: true,
                },
            ],
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
            'no-unused-vars': [
                'warn',
                {
                    args: 'none',
                    varsIgnorePattern: '^TAG|^__',
                },
            ],
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
            // @stylistic/js
            '@stylistic:js/array-bracket-spacing': [
                'error',
                'never',
            ],
            '@stylistic:js/arrow-spacing': 'error',
            '@stylistic:js/block-spacing': 'error',
            '@stylistic:js/brace-style': [
                'error',
                '1tbs',
                {
                    allowSingleLine: true,
                },
            ],
            '@stylistic:js/comma-spacing': 'error',
            '@stylistic:js/computed-property-spacing': 'error',
            '@stylistic:js/eol-last': 'warn',
            '@stylistic:js/func-call-spacing': 'error',
            '@stylistic:js/keyword-spacing': 'error',
            '@stylistic:js/max-len': [
                'error',
                {
                    code: 180,
                    ignoreComments: true,
                },
            ],
            '@stylistic:js/no-multiple-empty-lines': [
                'error',
                {
                    max: 2,
                    maxEOF: 1,
                },
            ],
            '@stylistic:js/no-trailing-spaces': [
                'error',
                {
                    ignoreComments: true,
                },
            ],
            '@stylistic:js/object-curly-spacing': [
                'error',
                'always',
            ],
            '@stylistic:js/quotes': [
                'error',
                'single',
                {
                    avoidEscape: true,
                    allowTemplateLiterals: true,
                },
            ],
            '@stylistic:js/semi': [
                'error',
                'always',
            ],
            '@stylistic:js/semi-spacing': 'error',
            '@stylistic:js/space-in-parens': 'error',
            '@stylistic:js/space-infix-ops': 'error',
            '@stylistic:js/space-unary-ops': 'error',
        },
    },
];
