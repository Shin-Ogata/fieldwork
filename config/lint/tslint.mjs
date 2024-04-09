import { resolve } from 'node:path';
import eslint from './eslint.mjs';
import tslint from 'typescript-eslint';

export default [
    ...eslint,
    ...tslint.configs.recommendedTypeChecked,
    ...tslint.configs.stylisticTypeChecked,
    {
        plugins: {
            '@typescript-eslint': tslint.plugin,
        },
        languageOptions: {
            parser: tslint.parser,
            parserOptions: {
                project: [
                    resolve('tsconfig.json'),
                    resolve('./tests/tsconfig.json'),
                    resolve('./tests/dev/tsconfig.json'),
                ],
                createDefaultProgram: true,
            },
        },
        rules: {
            ////////////////////////////////////////////////////////
            // added rules
            ////////////////////////////////////////////////////////
    
            '@typescript-eslint/indent': [
                'error',
                4,
                {
                    SwitchCase: 1,
                    ignoreComments: true,
                },
            ],
            '@typescript-eslint/func-call-spacing': 'error',
            '@typescript-eslint/member-naming': [
                'off',
                {
                    private: '^_|^Symbol',
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
        },
    },
];
