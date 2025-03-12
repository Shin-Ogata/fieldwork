import eslint from './eslint.mjs';
import tslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default [
    ...eslint,
    ...tslint.configs.recommendedTypeChecked,
    ...tslint.configs.stylisticTypeChecked,
    {
        plugins: {
            '@typescript-eslint': tslint.plugin,
            '@stylistic': stylistic,
        },
        languageOptions: {
            parser: tslint.parser,
            parserOptions: {
                project: true,
                sourceType: 'module',
            },
        },
        rules: {
            ////////////////////////////////////////////////////////
            // added rules
            ////////////////////////////////////////////////////////

            '@typescript-eslint/member-naming': [
                'off',
                {
                    private: '^_|^Symbol',
                },
            ],
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    fixStyle: 'inline-type-imports',
                },
            ],
            '@typescript-eslint/no-require-imports': 'error',
            '@typescript-eslint/unified-signatures': 'error',
            '@typescript-eslint/explicit-function-return-type': [
                'error',
                {
                    allowExpressions: true,
                    allowTypedFunctionExpressions: true,
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
            '@typescript-eslint/require-array-sort-compare': [
                'warn',
                {
                    ignoreStringArrays: true,
                },
            ],
            '@typescript-eslint/no-unnecessary-qualifier': 'warn',
            '@typescript-eslint/no-useless-constructor': 'warn',
            '@typescript-eslint/prefer-includes': 'warn',
            '@typescript-eslint/prefer-regexp-exec': 'warn',

            ////////////////////////////////////////////////////////
            // patch: @typescript-eslint/recommended-type-checked
            ////////////////////////////////////////////////////////

            '@typescript-eslint/no-this-alias': [
                'error',
                {
                    allowDestructuring: true,
                    allowedNames: [
                        'self',
                    ],
                },
            ],
            '@typescript-eslint/unbound-method': [
                'error',
                {
                    ignoreStatic: true,
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
            '@typescript-eslint/no-unused-expressions': [
                'error',
                {
                    allowShortCircuit: true,
                    allowTernary: true,
                },
            ],
            '@typescript-eslint/no-for-in-array': 'warn',
            '@typescript-eslint/restrict-plus-operands': 'warn',
            // v3.0+: related `@typescript-eslint/no-explicit-any`. continue consideration to validate the following props.
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            // v5.0+
            '@typescript-eslint/no-unsafe-argument': 'off',
            // v6.0+
            '@typescript-eslint/no-base-to-string': 'off',
            '@typescript-eslint/no-unsafe-enum-comparison': 'off',
            // v8.0+
            '@typescript-eslint/prefer-promise-reject-errors': 'off',

            ////////////////////////////////////////////////////////
            // patch: @typescript-eslint/stylistic-type-checked
            ////////////////////////////////////////////////////////

            '@typescript-eslint/dot-notation': [
                'error',
                {
                    allowPrivateClassPropertyAccess: true,
                    allowProtectedClassPropertyAccess: true,
                    allowIndexSignaturePropertyAccess: true,
                },
            ],
            '@typescript-eslint/prefer-for-of': 'warn',
            '@typescript-eslint/prefer-string-starts-ends-with': 'warn',
            '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
            '@typescript-eslint/prefer-optional-chain': 'warn',
            // prefer true read-only
            '@typescript-eslint/class-literal-property-style': 'off',
            // @stylistic/ts
            '@stylistic/member-delimiter-style': [
                'error',
                {
                    singleline: {
                        delimiter: 'semi',
                        requireLast: true,
                    },
                },
            ],
        },
    },
];
