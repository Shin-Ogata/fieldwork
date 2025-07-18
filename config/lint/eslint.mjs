import globals from 'globals';
import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';

export default [
    eslint.configs.recommended,
    {
        plugins: {
            '@stylistic': stylistic,
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
            // @stylistic
            '@stylistic/array-bracket-spacing': [
                'error',
                'never',
            ],
            '@stylistic/arrow-spacing': 'error',
            '@stylistic/block-spacing': 'error',
            '@stylistic/brace-style': [
                'error',
                '1tbs',
                {
                    allowSingleLine: true,
                },
            ],
            '@stylistic/comma-spacing': 'error',
            '@stylistic/computed-property-spacing': 'error',
            '@stylistic/eol-last': 'warn',
            '@stylistic/keyword-spacing': 'error',
            '@stylistic/max-len': [
                'error',
                {
                    code: 180,
                    ignoreComments: true,
                },
            ],
            '@stylistic/no-multiple-empty-lines': [
                'error',
                {
                    max: 2,
                    maxEOF: 1,
                },
            ],
            '@stylistic/no-trailing-spaces': [
                'error',
                {
                    ignoreComments: true,
                },
            ],
            '@stylistic/object-curly-spacing': [
                'error',
                'always',
            ],
            '@stylistic/quotes': [
                'error',
                'single',
                {
                    avoidEscape: true,
                    allowTemplateLiterals: 'always',
                },
            ],
            '@stylistic/semi': [
                'error',
                'always',
            ],
            '@stylistic/indent': [
                'error',
                4,
                {
                    SwitchCase: 1,
                    ignoreComments: true,
                },
            ],
            '@stylistic/function-call-spacing': 'error',
            '@stylistic/semi-spacing': 'error',
            '@stylistic/space-in-parens': 'error',
            '@stylistic/space-infix-ops': 'error',
            '@stylistic/space-unary-ops': 'error',
        },
    },
];
