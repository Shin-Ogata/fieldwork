/* eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/array-type,
 */

import type { path2regexp } from '@cdp/extension-path2regexp';

type Path = path2regexp.Path;
type MatchOptions = path2regexp.MatchOptions;
type Match<P extends ParamData> = path2regexp.Match<P>;
type ParseOptions = path2regexp.ParseOptions;
type Token = path2regexp.Token;
type CompileOptions = path2regexp.CompileOptions;
type ParamData = path2regexp.ParamData;

export interface ParserTestSet {
    path: string;
    options?: ParseOptions;
    expected: Token[];
}

export interface CompileTestSet {
    path: string;
    options?: CompileOptions;
    tests: Array<{
        input: ParamData | undefined;
        expected: string | null;
    }>;
}

export interface MatchTestSet {
    path: Path;
    options?: MatchOptions;
    tests: Array<{
        input: string;
        matches: (string | undefined)[] | null;
        expected: Match<any>;
    }>;
}

export const PARSER_TESTS: ParserTestSet[] = [
    {
        path: '/',
        expected: ['/'],
    },
    {
        path: '/:test',
        expected: ['/', { name: 'test' }],
    },
    {
        path: '/:0',
        expected: ['/', { name: '0' }],
    },
    {
        path: '/:_',
        expected: ['/', { name: '_' }],
    },
    {
        path: '/:café',
        expected: ['/', { name: 'café' }],
    },
];

export const COMPILE_TESTS: CompileTestSet[] = [
    {
        path: '/',
        tests: [
            { input: undefined, expected: '/' },
            { input: {}, expected: '/' },
            { input: { id: '123' }, expected: '/' },
        ],
    },
    {
        path: '/test',
        tests: [
            { input: undefined, expected: '/test' },
            { input: {}, expected: '/test' },
            { input: { id: '123' }, expected: '/test' },
        ],
    },
    {
        path: '/test/',
        tests: [
            { input: undefined, expected: '/test/' },
            { input: {}, expected: '/test/' },
            { input: { id: '123' }, expected: '/test/' },
        ],
    },
    {
        path: '/:0',
        tests: [
            { input: undefined, expected: null },
            { input: {}, expected: null },
            { input: { 0: '123' }, expected: '/123' },
        ],
    },
    {
        path: '/:test',
        tests: [
            { input: undefined, expected: null },
            { input: {}, expected: null },
            { input: { test: '123' }, expected: '/123' },
            { input: { test: '123/xyz' }, expected: '/123%2Fxyz' },
        ],
    },
    {
        path: '/:test',
        options: { validate: false },
        tests: [
            { input: undefined, expected: null },
            { input: {}, expected: null },
            { input: { test: '123' }, expected: '/123' },
            { input: { test: '123/xyz' }, expected: '/123%2Fxyz' },
        ],
    },
    {
        path: '/:test',
        options: { validate: false, encode: false },
        tests: [
            { input: undefined, expected: null },
            { input: {}, expected: null },
            { input: { test: '123' }, expected: '/123' },
            { input: { test: '123/xyz' }, expected: '/123/xyz' },
        ],
    },
    {
        path: '/:test',
        options: { encode: encodeURIComponent },
        tests: [
            { input: undefined, expected: null },
            { input: {}, expected: null },
            { input: { test: '123' }, expected: '/123' },
            { input: { test: '123/xyz' }, expected: '/123%2Fxyz' },
        ],
    },
    {
        path: '/:test',
        options: { encode: () => 'static' },
        tests: [
            { input: undefined, expected: null },
            { input: {}, expected: null },
            { input: { test: '123' }, expected: '/static' },
            { input: { test: '123/xyz' }, expected: '/static' },
        ],
    },
    {
        path: '{/:test}?',
        options: { encode: false },
        tests: [
            { input: undefined, expected: '' },
            { input: {}, expected: '' },
            { input: { test: undefined }, expected: '' },
            { input: { test: '123' }, expected: '/123' },
            { input: { test: '123/xyz' }, expected: null },
        ],
    },
    {
        path: '/:test(.*)',
        options: { encode: false },
        tests: [
            { input: undefined, expected: null },
            { input: {}, expected: null },
            { input: { test: '' }, expected: '/' },
            { input: { test: '123' }, expected: '/123' },
            { input: { test: '123/xyz' }, expected: '/123/xyz' },
        ],
    },
    {
        path: '{/:test}*',
        tests: [
            { input: undefined, expected: '' },
            { input: {}, expected: '' },
            { input: { test: [] }, expected: '' },
            { input: { test: [''] }, expected: null },
            { input: { test: ['123'] }, expected: '/123' },
            { input: { test: '123/xyz' }, expected: null },
            { input: { test: ['123', 'xyz'] }, expected: '/123/xyz' },
        ],
    },
    {
        path: '{/:test}*',
        options: { encode: false },
        tests: [
            { input: undefined, expected: '' },
            { input: {}, expected: '' },
            { input: { test: '' }, expected: null },
            { input: { test: '123' }, expected: '/123' },
            { input: { test: '123/xyz' }, expected: '/123/xyz' },
            { input: { test: ['123', 'xyz'] }, expected: null },
        ],
    },
    {
        path: '/{<:foo>}+',
        tests: [
            { input: undefined, expected: null },
            { input: { foo: ['x', 'y', 'z'] }, expected: '/<x><y><z>' },
        ],
    },
];

/**
 * An array of test cases with expected inputs and outputs.
 */
export const MATCH_TESTS: MatchTestSet[] = [
    /**
     * Simple paths.
     */
    {
        path: '/',
        tests: [
            {
                input: '/',
                matches: ['/'],
                expected: { path: '/', index: 0, params: {} },
            },
            { input: '/route', matches: null, expected: false },
        ],
    },
    {
        path: '/test',
        tests: [
            {
                input: '/test',
                matches: ['/test'],
                expected: { path: '/test', index: 0, params: {} },
            },
            { input: '/route', matches: null, expected: false },
            { input: '/test/route', matches: null, expected: false },
            {
                input: '/test/',
                matches: ['/test/'],
                expected: { path: '/test/', index: 0, params: {} },
            },
        ],
    },
    {
        path: '/test/',
        tests: [
            {
                input: '/test/',
                matches: ['/test/'],
                expected: { path: '/test/', index: 0, params: {} },
            },
            { input: '/route', matches: null, expected: false },
            { input: '/test', matches: null, expected: false },
            {
                input: '/test//',
                matches: ['/test//'],
                expected: { path: '/test//', index: 0, params: {} },
            },
        ],
    },
    {
        path: '/:test',
        tests: [
            {
                input: '/route',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/',
                matches: ['/route/', 'route'],
                expected: { path: '/route/', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route.json',
                matches: ['/route.json', 'route.json'],
                expected: {
                    path: '/route.json',
                    index: 0,
                    params: { test: 'route.json' },
                },
            },
            {
                input: '/route.json/',
                matches: ['/route.json/', 'route.json'],
                expected: {
                    path: '/route.json/',
                    index: 0,
                    params: { test: 'route.json' },
                },
            },
            {
                input: '/route/test',
                matches: null,
                expected: false,
            },
            {
                input: '///route',
                matches: ['///route', 'route'],
                expected: { path: '///route', index: 0, params: { test: 'route' } },
            },
            {
                input: '/caf%C3%A9',
                matches: ['/caf%C3%A9', 'caf%C3%A9'],
                expected: {
                    path: '/caf%C3%A9',
                    index: 0,
                    params: { test: 'café' },
                },
            },
            {
                input: '/;,:@&=+$-_.!~*()',
                matches: ['/;,:@&=+$-_.!~*()', ';,:@&=+$-_.!~*()'],
                expected: {
                    path: '/;,:@&=+$-_.!~*()',
                    index: 0,
                    params: { test: ';,:@&=+$-_.!~*()' },
                },
            },
        ],
    },

    /**
     * Case-sensitive paths.
     */
    {
        path: '/test',
        options: {
            sensitive: true,
        },
        tests: [
            {
                input: '/test',
                matches: ['/test'],
                expected: { path: '/test', index: 0, params: {} },
            },
            { input: '/TEST', matches: null, expected: false },
        ],
    },
    {
        path: '/TEST',
        options: {
            sensitive: true,
        },
        tests: [
            {
                input: '/TEST',
                matches: ['/TEST'],
                expected: { path: '/TEST', index: 0, params: {} },
            },
            { input: '/test', matches: null, expected: false },
        ],
    },

    /**
     * Non-trailing mode.
     */
    {
        path: '/test',
        options: {
            trailing: false,
        },
        tests: [
            {
                input: '/test',
                matches: ['/test'],
                expected: { path: '/test', index: 0, params: {} },
            },
            {
                input: '/test/',
                matches: null,
                expected: false,
            },
            {
                input: '/test/route',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '/test/',
        options: {
            trailing: false,
        },
        tests: [
            {
                input: '/test/',
                matches: ['/test/'],
                expected: { path: '/test/', index: 0, params: {} },
            },
            {
                input: '/test',
                matches: null,
                expected: false,
            },
            {
                input: '/test//',
                matches: ['/test//'],
                expected: { path: '/test//', index: 0, params: {} },
            },
        ],
    },
    {
        path: '/:test',
        options: {
            trailing: false,
        },
        tests: [
            {
                input: '/route',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/',
                matches: null,
                expected: false,
            },
            {
                input: '/route/test',
                matches: null,
                expected: false,
            },
            {
                input: '/route/test/',
                matches: null,
                expected: false,
            },
            {
                input: '///route',
                matches: ['///route', 'route'],
                expected: { path: '///route', index: 0, params: { test: 'route' } },
            },
        ],
    },
    {
        path: '/:test/',
        options: {
            trailing: false,
        },
        tests: [
            {
                input: '/route',
                matches: null,
                expected: false,
            },
            {
                input: '/route/',
                matches: ['/route/', 'route'],
                expected: { path: '/route/', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/test',
                matches: null,
                expected: false,
            },
            {
                input: '/route/test/',
                matches: null,
                expected: false,
            },
            {
                input: '/route//',
                matches: ['/route//', 'route'],
                expected: { path: '/route//', index: 0, params: { test: 'route' } },
            },
        ],
    },

    /**
     * Non-ending mode.
     */
    {
        path: '/test',
        options: {
            end: false,
        },
        tests: [
            {
                input: '/test',
                matches: ['/test'],
                expected: { path: '/test', index: 0, params: {} },
            },
            {
                input: '/test/',
                matches: ['/test/'],
                expected: { path: '/test/', index: 0, params: {} },
            },
            {
                input: '/test////',
                matches: ['/test////'],
                expected: { path: '/test////', index: 0, params: {} },
            },
            {
                input: '/route/test',
                matches: null,
                expected: false,
            },
            {
                input: '/test/route',
                matches: ['/test'],
                expected: { path: '/test', index: 0, params: {} },
            },
            {
                input: '/route',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '/test/',
        options: {
            end: false,
        },
        tests: [
            {
                input: '/test',
                matches: null,
                expected: false,
            },
            {
                input: '/test/',
                matches: ['/test/'],
                expected: { path: '/test/', index: 0, params: {} },
            },
            {
                input: '/test//',
                matches: ['/test//'],
                expected: { path: '/test//', index: 0, params: {} },
            },
            {
                input: '/test/route',
                matches: null,
                expected: false,
            },
            {
                input: '/route/test/deep',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '/:test',
        options: {
            end: false,
        },
        tests: [
            {
                input: '/route',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/',
                matches: ['/route/', 'route'],
                expected: { path: '/route/', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route.json',
                matches: ['/route.json', 'route.json'],
                expected: {
                    path: '/route.json',
                    index: 0,
                    params: { test: 'route.json' },
                },
            },
            {
                input: '/route.json/',
                matches: ['/route.json/', 'route.json'],
                expected: {
                    path: '/route.json/',
                    index: 0,
                    params: { test: 'route.json' },
                },
            },
            {
                input: '/route/test',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route.json/test',
                matches: ['/route.json', 'route.json'],
                expected: {
                    path: '/route.json',
                    index: 0,
                    params: { test: 'route.json' },
                },
            },
            {
                input: '///route///test',
                matches: ['///route', 'route'],
                expected: { path: '///route', index: 0, params: { test: 'route' } },
            },
            {
                input: '/caf%C3%A9',
                matches: ['/caf%C3%A9', 'caf%C3%A9'],
                expected: {
                    path: '/caf%C3%A9',
                    index: 0,
                    params: { test: 'café' },
                },
            },
        ],
    },
    {
        path: '/:test/',
        options: {
            end: false,
        },
        tests: [
            {
                input: '/route',
                matches: null,
                expected: false,
            },
            {
                input: '/route/',
                matches: ['/route/', 'route'],
                expected: { path: '/route/', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/test',
                matches: null,
                expected: false,
            },
            {
                input: '/route/test/',
                matches: null,
                expected: false,
            },
            {
                input: '/route//test',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '',
        options: {
            end: false,
        },
        tests: [
            {
                input: '',
                matches: [''],
                expected: { path: '', index: 0, params: {} },
            },
            {
                input: '/',
                matches: ['/'],
                expected: { path: '/', index: 0, params: {} },
            },
            {
                input: 'route',
                matches: null,
                expected: false,
            },
            {
                input: '/route',
                matches: [''],
                expected: { path: '', index: 0, params: {} },
            },
            {
                input: '/route/',
                matches: [''],
                expected: { path: '', index: 0, params: {} },
            },
        ],
    },

    /**
     * Non-starting mode.
     */
    {
        path: '/test',
        options: {
            start: false,
        },
        tests: [
            {
                input: '/test',
                matches: ['/test'],
                expected: { path: '/test', index: 0, params: {} },
            },
            {
                input: '/test/',
                matches: ['/test/'],
                expected: { path: '/test/', index: 0, params: {} },
            },
            {
                input: '/route/test',
                matches: ['/test'],
                expected: { path: '/test', index: 6, params: {} },
            },
            {
                input: '/route/test/',
                matches: ['/test/'],
                expected: { path: '/test/', index: 6, params: {} },
            },
            {
                input: '/test/route',
                matches: null,
                expected: false,
            },
            {
                input: '/route/test/deep',
                matches: null,
                expected: false,
            },
            {
                input: '/route',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '/test/',
        options: {
            start: false,
        },
        tests: [
            {
                input: '/test',
                matches: null,
                expected: false,
            },
            {
                input: '/test/',
                matches: ['/test/'],
                expected: { path: '/test/', index: 0, params: {} },
            },
            {
                input: '/test//',
                matches: ['/test//'],
                expected: { path: '/test//', index: 0, params: {} },
            },
            {
                input: '/test/route',
                matches: null,
                expected: false,
            },
            {
                input: '/route/test',
                matches: null,
                expected: false,
            },
            {
                input: '/route/test/',
                matches: ['/test/'],
                expected: { path: '/test/', index: 6, params: {} },
            },
            {
                input: '/route/test//',
                matches: ['/test//'],
                expected: { path: '/test//', index: 6, params: {} },
            },
            {
                input: '/route/test/deep',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '/:test',
        options: {
            start: false,
        },
        tests: [
            {
                input: '/route',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/',
                matches: ['/route/', 'route'],
                expected: { path: '/route/', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/test',
                matches: ['/test', 'test'],
                expected: { path: '/test', index: 6, params: { test: 'test' } },
            },
            {
                input: '/route/test/',
                matches: ['/test/', 'test'],
                expected: { path: '/test/', index: 6, params: { test: 'test' } },
            },
        ],
    },
    {
        path: '/:test/',
        options: {
            start: false,
        },
        tests: [
            {
                input: '/route',
                matches: null,
                expected: false,
            },
            {
                input: '/route/',
                matches: ['/route/', 'route'],
                expected: { path: '/route/', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/test',
                matches: null,
                expected: false,
            },
            {
                input: '/route/test/',
                matches: ['/test/', 'test'],
                expected: { path: '/test/', index: 6, params: { test: 'test' } },
            },
            {
                input: '/route/test//',
                matches: ['/test//', 'test'],
                expected: { path: '/test//', index: 6, params: { test: 'test' } },
            },
        ],
    },
    {
        path: '',
        options: {
            start: false,
        },
        tests: [
            {
                input: '',
                matches: [''],
                expected: { path: '', index: 0, params: {} },
            },
            {
                input: '/',
                matches: ['/'],
                expected: { path: '/', index: 0, params: {} },
            },
            {
                input: 'route',
                matches: [''],
                expected: { path: '', index: 5, params: {} },
            },
            {
                input: '/route',
                matches: [''],
                expected: { path: '', index: 6, params: {} },
            },
            {
                input: '/route/',
                matches: ['/'],
                expected: { path: '/', index: 6, params: {} },
            },
        ],
    },

    /**
     * Non-ending and non-trailing modes.
     */
    {
        path: '/test',
        options: {
            end: false,
            trailing: false,
        },
        tests: [
            {
                input: '/test',
                matches: ['/test'],
                expected: { path: '/test', index: 0, params: {} },
            },
            {
                input: '/test',
                matches: ['/test'],
                expected: { path: '/test', index: 0, params: {} },
            },
            {
                input: '/test/route',
                matches: ['/test'],
                expected: { path: '/test', index: 0, params: {} },
            },
        ],
    },
    {
        path: '/test/',
        options: {
            end: false,
            trailing: false,
        },
        tests: [
            {
                input: '/test/',
                matches: ['/test/'],
                expected: { path: '/test/', index: 0, params: {} },
            },
            {
                input: '/test',
                matches: null,
                expected: false,
            },
            {
                input: '/test//',
                matches: ['/test//'],
                expected: { path: '/test//', index: 0, params: {} },
            },
            {
                input: '/test/route',
                matches: null,
                expected: false,
            },
            {
                input: '/route/test/deep',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '/:test',
        options: {
            end: false,
            trailing: false,
        },
        tests: [
            {
                input: '/route',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/test',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/test/',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: 'route' } },
            },
        ],
    },
    {
        path: '/:test/',
        options: {
            end: false,
            trailing: false,
        },
        tests: [
            {
                input: '/route',
                matches: null,
                expected: false,
            },
            {
                input: '/route/',
                matches: ['/route/', 'route'],
                expected: { path: '/route/', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/test',
                matches: null,
                expected: false,
            },
            {
                input: '/route/test/',
                matches: null,
                expected: false,
            },
            {
                input: '/route/test//',
                matches: null,
                expected: false,
            },
            {
                input: '/route//test',
                matches: null,
                expected: false,
            },
        ],
    },

    /**
     * Non-starting and non-ending modes.
     */
    {
        path: '/test',
        options: {
            start: false,
            end: false,
        },
        tests: [
            {
                input: '/test',
                matches: ['/test'],
                expected: { path: '/test', index: 0, params: {} },
            },
            {
                input: '/test/',
                matches: ['/test/'],
                expected: { path: '/test/', index: 0, params: {} },
            },
            {
                input: '/test/route',
                matches: ['/test'],
                expected: { path: '/test', index: 0, params: {} },
            },
            {
                input: '/route/test',
                matches: ['/test'],
                expected: { path: '/test', index: 6, params: {} },
            },
        ],
    },
    {
        path: '/test/',
        options: {
            start: false,
            end: false,
        },
        tests: [
            {
                input: '/test/',
                matches: ['/test/'],
                expected: { path: '/test/', index: 0, params: {} },
            },
            {
                input: '/test',
                matches: null,
                expected: false,
            },
            {
                input: '/test//',
                matches: ['/test//'],
                expected: { path: '/test//', index: 0, params: {} },
            },
            {
                input: '/test/route',
                matches: null,
                expected: false,
            },
            {
                input: '/route/test/deep',
                matches: null,
                expected: false,
            },
            {
                input: '/route/test//deep',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '/:test',
        options: {
            start: false,
            end: false,
        },
        tests: [
            {
                input: '/route',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/',
                matches: ['/route/', 'route'],
                expected: { path: '/route/', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/test',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/test/',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: 'route' } },
            },
        ],
    },
    {
        path: '/:test/',
        options: {
            start: false,
            end: false,
        },
        tests: [
            {
                input: '/route',
                matches: null,
                expected: false,
            },
            {
                input: '/route/',
                matches: ['/route/', 'route'],
                expected: { path: '/route/', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/test',
                matches: null,
                expected: false,
            },
            {
                input: '/route/test/',
                matches: ['/test/', 'test'],
                expected: { path: '/test/', index: 6, params: { test: 'test' } },
            },
            {
                input: '/route/test//',
                matches: ['/test//', 'test'],
                expected: { path: '/test//', index: 6, params: { test: 'test' } },
            },
        ],
    },

    /**
     * Optional.
     */
    {
        path: '{/:test}?',
        tests: [
            {
                input: '/route',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: 'route' } },
            },
            {
                input: '///route',
                matches: ['///route', 'route'],
                expected: { path: '///route', index: 0, params: { test: 'route' } },
            },
            {
                input: '///route///',
                matches: ['///route///', 'route'],
                expected: { path: '///route///', index: 0, params: { test: 'route' } },
            },
            {
                input: '/',
                matches: ['/', undefined],
                expected: { path: '/', index: 0, params: {} },
            },
            {
                input: '///',
                matches: ['///', undefined],
                expected: { path: '///', index: 0, params: {} },
            },
        ],
    },
    {
        path: '{/:test}?',
        options: {
            trailing: false,
        },
        tests: [
            {
                input: '/route',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/',
                matches: null,
                expected: false,
            },
            { input: '/', matches: null, expected: false },
            { input: '///', matches: null, expected: false },
        ],
    },
    {
        path: '{/:test}?/bar',
        tests: [
            {
                input: '/bar',
                matches: ['/bar', undefined],
                expected: { path: '/bar', index: 0, params: {} },
            },
            {
                input: '/foo/bar',
                matches: ['/foo/bar', 'foo'],
                expected: { path: '/foo/bar', index: 0, params: { test: 'foo' } },
            },
            {
                input: '///foo///bar',
                matches: ['///foo///bar', 'foo'],
                expected: { path: '///foo///bar', index: 0, params: { test: 'foo' } },
            },
            {
                input: '/foo/bar/',
                matches: ['/foo/bar/', 'foo'],
                expected: { path: '/foo/bar/', index: 0, params: { test: 'foo' } },
            },
        ],
    },
    {
        path: '{/:test}?-bar',
        tests: [
            {
                input: '-bar',
                matches: ['-bar', undefined],
                expected: { path: '-bar', index: 0, params: {} },
            },
            {
                input: '/foo-bar',
                matches: ['/foo-bar', 'foo'],
                expected: { path: '/foo-bar', index: 0, params: { test: 'foo' } },
            },
            {
                input: '/foo-bar/',
                matches: ['/foo-bar/', 'foo'],
                expected: { path: '/foo-bar/', index: 0, params: { test: 'foo' } },
            },
        ],
    },
    {
        path: '/{:test}?-bar',
        tests: [
            {
                input: '/-bar',
                matches: ['/-bar', undefined],
                expected: { path: '/-bar', index: 0, params: {} },
            },
            {
                input: '/foo-bar',
                matches: ['/foo-bar', 'foo'],
                expected: { path: '/foo-bar', index: 0, params: { test: 'foo' } },
            },
            {
                input: '/foo-bar/',
                matches: ['/foo-bar/', 'foo'],
                expected: { path: '/foo-bar/', index: 0, params: { test: 'foo' } },
            },
        ],
    },

    /**
     * Zero or more times.
     */
    {
        path: '{/:test}*',
        tests: [
            {
                input: '/',
                matches: ['/', undefined],
                expected: { path: '/', index: 0, params: {} },
            },
            {
                input: '//',
                matches: ['//', undefined],
                expected: { path: '//', index: 0, params: {} },
            },
            {
                input: '/route',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: ['route'] } },
            },
            {
                input: '/some/basic/route',
                matches: ['/some/basic/route', 'some/basic/route'],
                expected: {
                    path: '/some/basic/route',
                    index: 0,
                    params: { test: ['some', 'basic', 'route'] },
                },
            },
            {
                input: '///some///basic///route',
                matches: ['///some///basic///route', 'some///basic///route'],
                expected: {
                    path: '///some///basic///route',
                    index: 0,
                    params: { test: ['some', 'basic', 'route'] },
                },
            },
        ],
    },
    {
        path: '{/:test}*-bar',
        tests: [
            {
                input: '-bar',
                matches: ['-bar', undefined],
                expected: { path: '-bar', index: 0, params: {} },
            },
            {
                input: '/-bar',
                matches: null,
                expected: false,
            },
            {
                input: '/foo-bar',
                matches: ['/foo-bar', 'foo'],
                expected: { path: '/foo-bar', index: 0, params: { test: ['foo'] } },
            },
            {
                input: '/foo/baz-bar',
                matches: ['/foo/baz-bar', 'foo/baz'],
                expected: {
                    path: '/foo/baz-bar',
                    index: 0,
                    params: { test: ['foo', 'baz'] },
                },
            },
        ],
    },

    /**
     * One or more times.
     */
    {
        path: '{/:test}+',
        tests: [
            {
                input: '/',
                matches: null,
                expected: false,
            },
            {
                input: '//',
                matches: null,
                expected: false,
            },
            {
                input: '/route',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: ['route'] } },
            },
            {
                input: '/some/basic/route',
                matches: ['/some/basic/route', 'some/basic/route'],
                expected: {
                    path: '/some/basic/route',
                    index: 0,
                    params: { test: ['some', 'basic', 'route'] },
                },
            },
            {
                input: '///some///basic///route',
                matches: ['///some///basic///route', 'some///basic///route'],
                expected: {
                    path: '///some///basic///route',
                    index: 0,
                    params: { test: ['some', 'basic', 'route'] },
                },
            },
        ],
    },
    {
        path: '{/:test}+-bar',
        tests: [
            {
                input: '-bar',
                matches: null,
                expected: false,
            },
            {
                input: '/-bar',
                matches: null,
                expected: false,
            },
            {
                input: '/foo-bar',
                matches: ['/foo-bar', 'foo'],
                expected: { path: '/foo-bar', index: 0, params: { test: ['foo'] } },
            },
            {
                input: '/foo/baz-bar',
                matches: ['/foo/baz-bar', 'foo/baz'],
                expected: {
                    path: '/foo/baz-bar',
                    index: 0,
                    params: { test: ['foo', 'baz'] },
                },
            },
        ],
    },

    /**
     * Custom parameters.
     */
    {
        path: String.raw`/:test(\d+)`,
        tests: [
            {
                input: '/123',
                matches: ['/123', '123'],
                expected: { path: '/123', index: 0, params: { test: '123' } },
            },
            {
                input: '/abc',
                matches: null,
                expected: false,
            },
            {
                input: '/123/abc',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: String.raw`/:test(\d+)-bar`,
        tests: [
            {
                input: '-bar',
                matches: null,
                expected: false,
            },
            {
                input: '/-bar',
                matches: null,
                expected: false,
            },
            {
                input: '/abc-bar',
                matches: null,
                expected: false,
            },
            {
                input: '/123-bar',
                matches: ['/123-bar', '123'],
                expected: { path: '/123-bar', index: 0, params: { test: '123' } },
            },
            {
                input: '/123/456-bar',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '/:test(.*)',
        tests: [
            {
                input: '/',
                matches: ['/', ''],
                expected: { path: '/', index: 0, params: { test: '' } },
            },
            {
                input: '/route',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route/123',
                matches: ['/route/123', 'route/123'],
                expected: {
                    path: '/route/123',
                    index: 0,
                    params: { test: 'route/123' },
                },
            },
            {
                input: '/;,:@&=/+$-_.!/~*()',
                matches: ['/;,:@&=/+$-_.!/~*()', ';,:@&=/+$-_.!/~*()'],
                expected: {
                    path: '/;,:@&=/+$-_.!/~*()',
                    index: 0,
                    params: { test: ';,:@&=/+$-_.!/~*()' },
                },
            },
        ],
    },
    {
        path: '/:test([a-z]+)',
        tests: [
            {
                input: '/abc',
                matches: ['/abc', 'abc'],
                expected: { path: '/abc', index: 0, params: { test: 'abc' } },
            },
            {
                input: '/123',
                matches: null,
                expected: false,
            },
            {
                input: '/abc/123',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '/:test(this|that)',
        tests: [
            {
                input: '/this',
                matches: ['/this', 'this'],
                expected: { path: '/this', index: 0, params: { test: 'this' } },
            },
            {
                input: '/that',
                matches: ['/that', 'that'],
                expected: { path: '/that', index: 0, params: { test: 'that' } },
            },
            {
                input: '/foo',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '{/:test(abc|xyz)}*',
        tests: [
            {
                input: '/',
                matches: ['/', undefined],
                expected: { path: '/', index: 0, params: { test: undefined } },
            },
            {
                input: '/abc',
                matches: ['/abc', 'abc'],
                expected: { path: '/abc', index: 0, params: { test: ['abc'] } },
            },
            {
                input: '/abc/abc',
                matches: ['/abc/abc', 'abc/abc'],
                expected: {
                    path: '/abc/abc',
                    index: 0,
                    params: { test: ['abc', 'abc'] },
                },
            },
            {
                input: '/xyz/xyz',
                matches: ['/xyz/xyz', 'xyz/xyz'],
                expected: {
                    path: '/xyz/xyz',
                    index: 0,
                    params: { test: ['xyz', 'xyz'] },
                },
            },
            {
                input: '/abc/xyz',
                matches: ['/abc/xyz', 'abc/xyz'],
                expected: {
                    path: '/abc/xyz',
                    index: 0,
                    params: { test: ['abc', 'xyz'] },
                },
            },
            {
                input: '/abc/xyz/abc/xyz',
                matches: ['/abc/xyz/abc/xyz', 'abc/xyz/abc/xyz'],
                expected: {
                    path: '/abc/xyz/abc/xyz',
                    index: 0,
                    params: { test: ['abc', 'xyz', 'abc', 'xyz'] },
                },
            },
            {
                input: '/xyzxyz',
                matches: null,
                expected: false,
            },
        ],
    },

    /**
     * No prefix characters.
     */
    {
        path: 'test',
        tests: [
            {
                input: 'test',
                matches: ['test'],
                expected: { path: 'test', index: 0, params: {} },
            },
            {
                input: '/test',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: ':test',
        tests: [
            {
                input: 'route',
                matches: ['route', 'route'],
                expected: { path: 'route', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route',
                matches: null,
                expected: false,
            },
            {
                input: 'route/',
                matches: ['route/', 'route'],
                expected: { path: 'route/', index: 0, params: { test: 'route' } },
            },
        ],
    },
    {
        path: '{:test}?',
        tests: [
            {
                input: 'test',
                matches: ['test', 'test'],
                expected: { path: 'test', index: 0, params: { test: 'test' } },
            },
            {
                input: '',
                matches: ['', undefined],
                expected: { path: '', index: 0, params: {} },
            },
        ],
    },
    {
        path: '{:test/}+',
        tests: [
            {
                input: 'route/',
                matches: ['route/', 'route'],
                expected: { path: 'route/', index: 0, params: { test: ['route'] } },
            },
            {
                input: '/route',
                matches: null,
                expected: false,
            },
            {
                input: '',
                matches: null,
                expected: false,
            },
            {
                input: 'foo/bar/',
                matches: ['foo/bar/', 'foo/bar'],
                expected: {
                    path: 'foo/bar/',
                    index: 0,
                    params: { test: ['foo', 'bar'] },
                },
            },
        ],
    },

    /**
     * Formats.
     */
    {
        path: '/test.json',
        tests: [
            {
                input: '/test.json',
                matches: ['/test.json'],
                expected: { path: '/test.json', index: 0, params: {} },
            },
            {
                input: '/test',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '/:test.json',
        tests: [
            {
                input: '/.json',
                matches: null,
                expected: false,
            },
            {
                input: '/test.json',
                matches: ['/test.json', 'test'],
                expected: { path: '/test.json', index: 0, params: { test: 'test' } },
            },
            {
                input: '/route.json',
                matches: ['/route.json', 'route'],
                expected: { path: '/route.json', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route.json.json',
                matches: ['/route.json.json', 'route.json'],
                expected: {
                    path: '/route.json.json',
                    index: 0,
                    params: { test: 'route.json' },
                },
            },
        ],
    },

    /**
     * Format params.
     */
    {
        path: '/test.:format(\\w+)',
        tests: [
            {
                input: '/test.html',
                matches: ['/test.html', 'html'],
                expected: { path: '/test.html', index: 0, params: { format: 'html' } },
            },
            {
                input: '/test',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '/test.:format(\\w+).:format(\\w+)',
        tests: [
            {
                input: '/test.html.json',
                matches: ['/test.html.json', 'html', 'json'],
                expected: {
                    path: '/test.html.json',
                    index: 0,
                    params: { format: 'json' },
                },
            },
            {
                input: '/test.html',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '/test{.:format(\\w+)}?',
        tests: [
            {
                input: '/test',
                matches: ['/test', undefined],
                expected: { path: '/test', index: 0, params: { format: undefined } },
            },
            {
                input: '/test.html',
                matches: ['/test.html', 'html'],
                expected: { path: '/test.html', index: 0, params: { format: 'html' } },
            },
        ],
    },
    {
        path: '/test{.:format(\\w+)}+',
        tests: [
            {
                input: '/test',
                matches: null,
                expected: false,
            },
            {
                input: '/test.html',
                matches: ['/test.html', 'html'],
                expected: {
                    path: '/test.html',
                    index: 0,
                    params: { format: ['html'] },
                },
            },
            {
                input: '/test.html.json',
                matches: ['/test.html.json', 'html.json'],
                expected: {
                    path: '/test.html.json',
                    index: 0,
                    params: { format: ['html', 'json'] },
                },
            },
        ],
    },
    {
        path: '/test{.:format}+',
        tests: [
            {
                input: '/test',
                matches: null,
                expected: false,
            },
            {
                input: '/test.html',
                matches: ['/test.html', 'html'],
                expected: {
                    path: '/test.html',
                    index: 0,
                    params: { format: ['html'] },
                },
            },
            {
                input: '/test.hbs.html',
                matches: ['/test.hbs.html', 'hbs.html'],
                expected: {
                    path: '/test.hbs.html',
                    index: 0,
                    params: { format: ['hbs', 'html'] },
                },
            },
        ],
    },

    /**
     * Format and path params.
     */
    {
        path: '/:test.:format',
        tests: [
            {
                input: '/route.html',
                matches: ['/route.html', 'route', 'html'],
                expected: {
                    path: '/route.html',
                    index: 0,
                    params: { test: 'route', format: 'html' },
                },
            },
            {
                input: '/route',
                matches: null,
                expected: false,
            },
            {
                input: '/route.html.json',
                matches: ['/route.html.json', 'route', 'html.json'],
                expected: {
                    path: '/route.html.json',
                    index: 0,
                    params: { test: 'route', format: 'html.json' },
                },
            },
        ],
    },
    {
        path: '/:test{.:format}?',
        tests: [
            {
                input: '/route',
                matches: ['/route', 'route', undefined],
                expected: { path: '/route', index: 0, params: { test: 'route' } },
            },
            {
                input: '/route.json',
                matches: ['/route.json', 'route', 'json'],
                expected: {
                    path: '/route.json',
                    index: 0,
                    params: { test: 'route', format: 'json' },
                },
            },
            {
                input: '/route.json.html',
                matches: ['/route.json.html', 'route', 'json.html'],
                expected: {
                    path: '/route.json.html',
                    index: 0,
                    params: { test: 'route', format: 'json.html' },
                },
            },
        ],
    },
    {
        path: '/:test.:format\\z',
        tests: [
            {
                input: '/route.htmlz',
                matches: ['/route.htmlz', 'route', 'html'],
                expected: {
                    path: '/route.htmlz',
                    index: 0,
                    params: { test: 'route', format: 'html' },
                },
            },
            {
                input: '/route.html',
                matches: null,
                expected: false,
            },
        ],
    },

    /**
     * Unnamed params.
     */
    {
        path: '/(\\d+)',
        tests: [
            {
                input: '/123',
                matches: ['/123', '123'],
                expected: { path: '/123', index: 0, params: { '0': '123' } },
            },
            {
                input: '/abc',
                matches: null,
                expected: false,
            },
            {
                input: '/123/abc',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '{/(\\d+)}?',
        tests: [
            {
                input: '/',
                matches: ['/', undefined],
                expected: { path: '/', index: 0, params: { '0': undefined } },
            },
            {
                input: '/123',
                matches: ['/123', '123'],
                expected: { path: '/123', index: 0, params: { '0': '123' } },
            },
        ],
    },
    {
        path: '/route\\(\\\\(\\d+\\\\)\\)',
        tests: [
            {
                input: '/route(\\123\\)',
                matches: ['/route(\\123\\)', '123\\'],
                expected: {
                    path: '/route(\\123\\)',
                    index: 0,
                    params: { '0': '123\\' },
                },
            },
            {
                input: '/route(\\123)',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '{/route}?',
        tests: [
            {
                input: '',
                matches: [''],
                expected: { path: '', index: 0, params: {} },
            },
            {
                input: '/',
                matches: ['/'],
                expected: { path: '/', index: 0, params: {} },
            },
            {
                input: '/foo',
                matches: null,
                expected: false,
            },
            {
                input: '/route',
                matches: ['/route'],
                expected: { path: '/route', index: 0, params: {} },
            },
        ],
    },
    {
        path: '{/(.*)}',
        tests: [
            {
                input: '/',
                matches: ['/', ''],
                expected: { path: '/', index: 0, params: { '0': '' } },
            },
            {
                input: '/login',
                matches: ['/login', 'login'],
                expected: { path: '/login', index: 0, params: { '0': 'login' } },
            },
        ],
    },

    /**
     * Escaped characters.
     */
    {
        path: '/\\(testing\\)',
        tests: [
            {
                input: '/testing',
                matches: null,
                expected: false,
            },
            {
                input: '/(testing)',
                matches: ['/(testing)'],
                expected: { path: '/(testing)', index: 0, params: {} },
            },
        ],
    },
    {
        path: '/.\\+\\*\\?\\{\\}=^\\!\\:$[]\\|',
        tests: [
            {
                input: '/.+*?{}=^!:$[]|',
                matches: ['/.+*?{}=^!:$[]|'],
                expected: { path: '/.+*?{}=^!:$[]|', index: 0, params: {} },
            },
        ],
    },
    {
        path: '/test/{:uid(u\\d+)}?{:cid(c\\d+)}?',
        tests: [
            {
                input: '/test/u123',
                matches: ['/test/u123', 'u123', undefined],
                expected: { path: '/test/u123', index: 0, params: { uid: 'u123' } },
            },
            {
                input: '/test/c123',
                matches: ['/test/c123', undefined, 'c123'],
                expected: { path: '/test/c123', index: 0, params: { cid: 'c123' } },
            },
        ],
    },

    /**
     * Unnamed group prefix.
     */
    {
        path: '/{apple-}?icon-:res(\\d+).png',
        tests: [
            {
                input: '/icon-240.png',
                matches: ['/icon-240.png', '240'],
                expected: { path: '/icon-240.png', index: 0, params: { res: '240' } },
            },
            {
                input: '/apple-icon-240.png',
                matches: ['/apple-icon-240.png', '240'],
                expected: {
                    path: '/apple-icon-240.png',
                    index: 0,
                    params: { res: '240' },
                },
            },
        ],
    },

    /**
     * Random examples.
     */
    {
        path: '/:foo/:bar',
        tests: [
            {
                input: '/match/route',
                matches: ['/match/route', 'match', 'route'],
                expected: {
                    path: '/match/route',
                    index: 0,
                    params: { foo: 'match', bar: 'route' },
                },
            },
        ],
    },
    {
        path: '/:foo\\(test\\)/bar',
        tests: [
            {
                input: '/foo(test)/bar',
                matches: ['/foo(test)/bar', 'foo'],
                expected: { path: '/foo(test)/bar', index: 0, params: { foo: 'foo' } },
            },
            {
                input: '/foo/bar',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '/:remote([\\w\\-\\.]+)/:user([\\w-]+)',
        tests: [
            {
                input: '/endpoint/user',
                matches: ['/endpoint/user', 'endpoint', 'user'],
                expected: {
                    path: '/endpoint/user',
                    index: 0,
                    params: { remote: 'endpoint', user: 'user' },
                },
            },
            {
                input: '/endpoint/user-name',
                matches: ['/endpoint/user-name', 'endpoint', 'user-name'],
                expected: {
                    path: '/endpoint/user-name',
                    index: 0,
                    params: { remote: 'endpoint', user: 'user-name' },
                },
            },
            {
                input: '/foo.bar/user-name',
                matches: ['/foo.bar/user-name', 'foo.bar', 'user-name'],
                expected: {
                    path: '/foo.bar/user-name',
                    index: 0,
                    params: { remote: 'foo.bar', user: 'user-name' },
                },
            },
        ],
    },
    {
        path: '/:foo\\?',
        tests: [
            {
                input: '/route?',
                matches: ['/route?', 'route'],
                expected: { path: '/route?', index: 0, params: { foo: 'route' } },
            },
            {
                input: '/route',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '{/:foo}+bar',
        tests: [
            {
                input: '/foobar',
                matches: ['/foobar', 'foo'],
                expected: { path: '/foobar', index: 0, params: { foo: ['foo'] } },
            },
            {
                input: '/foo/bar',
                matches: null,
                expected: false,
            },
            {
                input: '/foo/barbar',
                matches: ['/foo/barbar', 'foo/bar'],
                expected: {
                    path: '/foo/barbar',
                    index: 0,
                    params: { foo: ['foo', 'bar'] },
                },
            },
        ],
    },
    {
        path: '/{:pre}?baz',
        tests: [
            {
                input: '/foobaz',
                matches: ['/foobaz', 'foo'],
                expected: { path: '/foobaz', index: 0, params: { pre: 'foo' } },
            },
            {
                input: '/baz',
                matches: ['/baz', undefined],
                expected: { path: '/baz', index: 0, params: { pre: undefined } },
            },
        ],
    },
    {
        path: '/:foo\\(:bar\\)',
        tests: [
            {
                input: '/hello(world)',
                matches: ['/hello(world)', 'hello', 'world'],
                expected: {
                    path: '/hello(world)',
                    index: 0,
                    params: { foo: 'hello', bar: 'world' },
                },
            },
            {
                input: '/hello()',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '/:foo\\({:bar}?\\)',
        tests: [
            {
                input: '/hello(world)',
                matches: ['/hello(world)', 'hello', 'world'],
                expected: {
                    path: '/hello(world)',
                    index: 0,
                    params: { foo: 'hello', bar: 'world' },
                },
            },
            {
                input: '/hello()',
                matches: ['/hello()', 'hello', undefined],
                expected: {
                    path: '/hello()',
                    index: 0,
                    params: { foo: 'hello', bar: undefined },
                },
            },
        ],
    },
    {
        path: '/:postType(video|audio|text){(\\+.+)}?',
        tests: [
            {
                input: '/video',
                matches: ['/video', 'video', undefined],
                expected: { path: '/video', index: 0, params: { postType: 'video' } },
            },
            {
                input: '/video+test',
                matches: ['/video+test', 'video', '+test'],
                expected: {
                    path: '/video+test',
                    index: 0,
                    params: { 0: '+test', postType: 'video' },
                },
            },
            {
                input: '/video+',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '{/:foo}?{/:bar}?-ext',
        tests: [
            {
                input: '/-ext',
                matches: null,
                expected: false,
            },
            {
                input: '-ext',
                matches: ['-ext', undefined, undefined],
                expected: {
                    path: '-ext',
                    index: 0,
                    params: { foo: undefined, bar: undefined },
                },
            },
            {
                input: '/foo-ext',
                matches: ['/foo-ext', 'foo', undefined],
                expected: { path: '/foo-ext', index: 0, params: { foo: 'foo' } },
            },
            {
                input: '/foo/bar-ext',
                matches: ['/foo/bar-ext', 'foo', 'bar'],
                expected: {
                    path: '/foo/bar-ext',
                    index: 0,
                    params: { foo: 'foo', bar: 'bar' },
                },
            },
            {
                input: '/foo/-ext',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '/:required{/:optional}?-ext',
        tests: [
            {
                input: '/foo-ext',
                matches: ['/foo-ext', 'foo', undefined],
                expected: { path: '/foo-ext', index: 0, params: { required: 'foo' } },
            },
            {
                input: '/foo/bar-ext',
                matches: ['/foo/bar-ext', 'foo', 'bar'],
                expected: {
                    path: '/foo/bar-ext',
                    index: 0,
                    params: { required: 'foo', optional: 'bar' },
                },
            },
            {
                input: '/foo/-ext',
                matches: null,
                expected: false,
            },
        ],
    },

    /**
     * Unicode matches.
     */
    {
        path: '/:foo',
        tests: [
            {
                input: '/café',
                matches: ['/café', 'café'],
                expected: { path: '/café', index: 0, params: { foo: 'café' } },
            },
        ],
    },
    {
        path: '/:foo',
        options: {
            decode: false,
        },
        tests: [
            {
                input: '/caf%C3%A9',
                matches: ['/caf%C3%A9', 'caf%C3%A9'],
                expected: {
                    path: '/caf%C3%A9',
                    index: 0,
                    params: { foo: 'caf%C3%A9' },
                },
            },
        ],
    },
    {
        path: '/café',
        tests: [
            {
                input: '/café',
                matches: ['/café'],
                expected: { path: '/café', index: 0, params: {} },
            },
        ],
    },
    {
        path: '/café',
        options: {
            encodePath: encodeURI,
        },
        tests: [
            {
                input: '/caf%C3%A9',
                matches: ['/caf%C3%A9'],
                expected: { path: '/caf%C3%A9', index: 0, params: {} },
            },
        ],
    },

    /**
     * Hostnames.
     */
    {
        path: ':domain.com',
        options: {
            delimiter: '.',
        },
        tests: [
            {
                input: 'example.com',
                matches: ['example.com', 'example'],
                expected: {
                    path: 'example.com',
                    index: 0,
                    params: { domain: 'example' },
                },
            },
            {
                input: 'github.com',
                matches: ['github.com', 'github'],
                expected: {
                    path: 'github.com',
                    index: 0,
                    params: { domain: 'github' },
                },
            },
        ],
    },
    {
        path: 'mail.:domain.com',
        options: {
            delimiter: '.',
        },
        tests: [
            {
                input: 'mail.example.com',
                matches: ['mail.example.com', 'example'],
                expected: {
                    path: 'mail.example.com',
                    index: 0,
                    params: { domain: 'example' },
                },
            },
            {
                input: 'mail.github.com',
                matches: ['mail.github.com', 'github'],
                expected: {
                    path: 'mail.github.com',
                    index: 0,
                    params: { domain: 'github' },
                },
            },
        ],
    },
    {
        path: 'mail{.:domain}?.com',
        options: {
            delimiter: '.',
        },
        tests: [
            {
                input: 'mail.com',
                matches: ['mail.com', undefined],
                expected: { path: 'mail.com', index: 0, params: { domain: undefined } },
            },
            {
                input: 'mail.example.com',
                matches: ['mail.example.com', 'example'],
                expected: {
                    path: 'mail.example.com',
                    index: 0,
                    params: { domain: 'example' },
                },
            },
            {
                input: 'mail.github.com',
                matches: ['mail.github.com', 'github'],
                expected: {
                    path: 'mail.github.com',
                    index: 0,
                    params: { domain: 'github' },
                },
            },
        ],
    },
    {
        path: 'example.:ext',
        options: {
            delimiter: '.',
        },
        tests: [
            {
                input: 'example.com',
                matches: ['example.com', 'com'],
                expected: { path: 'example.com', index: 0, params: { ext: 'com' } },
            },
            {
                input: 'example.org',
                matches: ['example.org', 'org'],
                expected: { path: 'example.org', index: 0, params: { ext: 'org' } },
            },
        ],
    },
    {
        path: 'this is',
        options: {
            delimiter: ' ',
            end: false,
        },
        tests: [
            {
                input: 'this is a test',
                matches: ['this is'],
                expected: { path: 'this is', index: 0, params: {} },
            },
            {
                input: `this isn't`,
                matches: null,
                expected: false,
            },
        ],
    },

    /**
     * Prefixes.
     */
    {
        path: '{$:foo}{$:bar}?',
        tests: [
            {
                input: '$x',
                matches: ['$x', 'x', undefined],
                expected: { path: '$x', index: 0, params: { foo: 'x' } },
            },
            {
                input: '$x$y',
                matches: ['$x$y', 'x', 'y'],
                expected: { path: '$x$y', index: 0, params: { foo: 'x', bar: 'y' } },
            },
        ],
    },
    {
        path: '{$:foo}+',
        tests: [
            {
                input: '$x',
                matches: ['$x', 'x'],
                expected: { path: '$x', index: 0, params: { foo: ['x'] } },
            },
            {
                input: '$x$y',
                matches: ['$x$y', 'x$y'],
                expected: { path: '$x$y', index: 0, params: { foo: ['x', 'y'] } },
            },
        ],
    },
    {
        path: 'name{/:attr1}?{-:attr2}?{-:attr3}?',
        tests: [
            {
                input: 'name',
                matches: ['name', undefined, undefined, undefined],
                expected: { path: 'name', index: 0, params: {} },
            },
            {
                input: 'name/test',
                matches: ['name/test', 'test', undefined, undefined],
                expected: {
                    path: 'name/test',
                    index: 0,
                    params: { attr1: 'test' },
                },
            },
            {
                input: 'name/1',
                matches: ['name/1', '1', undefined, undefined],
                expected: {
                    path: 'name/1',
                    index: 0,
                    params: { attr1: '1' },
                },
            },
            {
                input: 'name/1-2',
                matches: ['name/1-2', '1', '2', undefined],
                expected: {
                    path: 'name/1-2',
                    index: 0,
                    params: { attr1: '1', attr2: '2' },
                },
            },
            {
                input: 'name/1-2-3',
                matches: ['name/1-2-3', '1', '2', '3'],
                expected: {
                    path: 'name/1-2-3',
                    index: 0,
                    params: { attr1: '1', attr2: '2', attr3: '3' },
                },
            },
            {
                input: 'name/foo-bar/route',
                matches: null,
                expected: false,
            },
            {
                input: 'name/test/route',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: 'name{/:attrs;-}*',
        tests: [
            {
                input: 'name',
                matches: ['name', undefined],
                expected: { path: 'name', index: 0, params: {} },
            },
            {
                input: 'name/1',
                matches: ['name/1', '1'],
                expected: {
                    path: 'name/1',
                    index: 0,
                    params: { attrs: ['1'] },
                },
            },
            {
                input: 'name/1-2',
                matches: ['name/1-2', '1-2'],
                expected: {
                    path: 'name/1-2',
                    index: 0,
                    params: { attrs: ['1', '2'] },
                },
            },
            {
                input: 'name/1-2-3',
                matches: ['name/1-2-3', '1-2-3'],
                expected: {
                    path: 'name/1-2-3',
                    index: 0,
                    params: { attrs: ['1', '2', '3'] },
                },
            },
            {
                input: 'name/foo-bar/route',
                matches: null,
                expected: false,
            },
            {
                input: 'name/test/route',
                matches: null,
                expected: false,
            },
        ],
    },

    /**
     * Nested parentheses.
     */
    {
        path: '/:test(\\d+(?:\\.\\d+)?)',
        tests: [
            {
                input: '/123',
                matches: ['/123', '123'],
                expected: { path: '/123', index: 0, params: { test: '123' } },
            },
            {
                input: '/abc',
                matches: null,
                expected: false,
            },
            {
                input: '/123/abc',
                matches: null,
                expected: false,
            },
            {
                input: '/123.123',
                matches: ['/123.123', '123.123'],
                expected: { path: '/123.123', index: 0, params: { test: '123.123' } },
            },
            {
                input: '/123.abc',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '/:test((?!login)[^/]+)',
        tests: [
            {
                input: '/route',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { test: 'route' } },
            },
            {
                input: '/login',
                matches: null,
                expected: false,
            },
        ],
    },

    /**
     * https://github.com/pillarjs/path-to-regexp/issues/206
     */
    {
        path: '/user{(s)}?/:user',
        tests: [
            {
                input: '/user/123',
                matches: ['/user/123', undefined, '123'],
                expected: { path: '/user/123', index: 0, params: { user: '123' } },
            },
            {
                input: '/users/123',
                matches: ['/users/123', 's', '123'],
                expected: {
                    path: '/users/123',
                    index: 0,
                    params: { 0: 's', user: '123' },
                },
            },
        ],
    },
    {
        path: '/user{s}?/:user',
        tests: [
            {
                input: '/user/123',
                matches: ['/user/123', '123'],
                expected: { path: '/user/123', index: 0, params: { user: '123' } },
            },
            {
                input: '/users/123',
                matches: ['/users/123', '123'],
                expected: { path: '/users/123', index: 0, params: { user: '123' } },
            },
        ],
    },

    /**
     * https://github.com/pillarjs/path-to-regexp/pull/270
     */
    {
        path: '/files{/:path}*{.:ext}*',
        tests: [
            {
                input: '/files/hello/world.txt',
                matches: ['/files/hello/world.txt', 'hello/world', 'txt'],
                expected: {
                    path: '/files/hello/world.txt',
                    index: 0,
                    params: { path: ['hello', 'world'], ext: ['txt'] },
                },
            },
            {
                input: '/files/hello/world.txt.png',
                matches: ['/files/hello/world.txt.png', 'hello/world', 'txt.png'],
                expected: {
                    path: '/files/hello/world.txt.png',
                    index: 0,
                    params: { path: ['hello', 'world'], ext: ['txt', 'png'] },
                },
            },
            {
                input: '/files/my/photo.jpg/gif',
                matches: ['/files/my/photo.jpg/gif', 'my/photo.jpg/gif', undefined],
                expected: {
                    path: '/files/my/photo.jpg/gif',
                    index: 0,
                    params: { path: ['my', 'photo.jpg', 'gif'], ext: undefined },
                },
            },
        ],
    },
    {
        path: '/files{/:path}*{.:ext}?',
        tests: [
            {
                input: '/files/hello/world.txt',
                matches: ['/files/hello/world.txt', 'hello/world', 'txt'],
                expected: {
                    path: '/files/hello/world.txt',
                    index: 0,
                    params: { path: ['hello', 'world'], ext: 'txt' },
                },
            },
            {
                input: '/files/my/photo.jpg/gif',
                matches: ['/files/my/photo.jpg/gif', 'my/photo.jpg/gif', undefined],
                expected: {
                    path: '/files/my/photo.jpg/gif',
                    index: 0,
                    params: { path: ['my', 'photo.jpg', 'gif'], ext: undefined },
                },
            },
        ],
    },
    {
        path: '#/*',
        tests: [
            {
                input: '#/',
                matches: ['#/', undefined],
                expected: { path: '#/', index: 0, params: {} },
            },
        ],
    },
    {
        path: '/foo{/:bar}*',
        tests: [
            {
                input: '/foo/test1//test2',
                matches: ['/foo/test1//test2', 'test1//test2'],
                expected: {
                    path: '/foo/test1//test2',
                    index: 0,
                    params: { bar: ['test1', 'test2'] },
                },
            },
        ],
    },
    {
        path: '/entity/:id/*',
        tests: [
            {
                input: '/entity/foo',
                matches: null,
                expected: false,
            },
            {
                input: '/entity/foo/',
                matches: ['/entity/foo/', 'foo', undefined],
                expected: { path: '/entity/foo/', index: 0, params: { id: 'foo' } },
            },
        ],
    },
    {
        path: '/test/*',
        tests: [
            {
                input: '/test',
                matches: null,
                expected: false,
            },
            {
                input: '/test/',
                matches: ['/test/', undefined],
                expected: { path: '/test/', index: 0, params: {} },
            },
            {
                input: '/test/route',
                matches: ['/test/route', 'route'],
                expected: { path: '/test/route', index: 0, params: { '0': ['route'] } },
            },
            {
                input: '/test/route/nested',
                matches: ['/test/route/nested', 'route/nested'],
                expected: {
                    path: '/test/route/nested',
                    index: 0,
                    params: { '0': ['route', 'nested'] },
                },
            },
        ],
    },

    /**
     * Asterisk wildcard.
     */
    {
        path: '/*',
        tests: [
            {
                input: '/',
                matches: ['/', undefined],
                expected: { path: '/', index: 0, params: { '0': undefined } },
            },
            {
                input: '/route',
                matches: ['/route', 'route'],
                expected: { path: '/route', index: 0, params: { '0': ['route'] } },
            },
            {
                input: '/route/nested',
                matches: ['/route/nested', 'route/nested'],
                expected: {
                    path: '/route/nested',
                    index: 0,
                    params: { '0': ['route', 'nested'] },
                },
            },
        ],
    },
    {
        path: '*',
        tests: [
            {
                input: '/',
                matches: ['/', '/'],
                expected: { path: '/', index: 0, params: { '0': ['', ''] } },
            },
            {
                input: '/test',
                matches: ['/test', '/test'],
                expected: { path: '/test', index: 0, params: { '0': ['', 'test'] } },
            },
        ],
    },
    {
        path: '*',
        options: { decode: false },
        tests: [
            {
                input: '/',
                matches: ['/', '/'],
                expected: { path: '/', index: 0, params: { '0': '/' } },
            },
            {
                input: '/test',
                matches: ['/test', '/test'],
                expected: { path: '/test', index: 0, params: { '0': '/test' } },
            },
        ],
    },

    /**
     * No loose.
     */
    {
        path: '/test',
        options: { loose: false },
        tests: [
            {
                input: '/test',
                matches: ['/test'],
                expected: { path: '/test', index: 0, params: {} },
            },
            {
                input: '//test',
                matches: null,
                expected: false,
            },
        ],
    },

    /**
     * Longer prefix.
     */
    {
        path: '/:foo{/test/:bar}?',
        tests: [
            {
                input: '/route',
                matches: ['/route', 'route', undefined],
                expected: { path: '/route', index: 0, params: { foo: 'route' } },
            },
            {
                input: '/route/test/again',
                matches: ['/route/test/again', 'route', 'again'],
                expected: {
                    path: '/route/test/again',
                    index: 0,
                    params: { foo: 'route', bar: 'again' },
                },
            },
        ],
    },

    /**
     * Prefix and suffix as separator.
     */
    {
        path: '/{<:foo>}+',
        tests: [
            {
                input: '/<test>',
                matches: ['/<test>', 'test'],
                expected: { path: '/<test>', index: 0, params: { foo: ['test'] } },
            },
            {
                input: '/<test><again>',
                matches: ['/<test><again>', 'test><again'],
                expected: {
                    path: '/<test><again>',
                    index: 0,
                    params: { foo: ['test', 'again'] },
                },
            },
        ],
    },

    /**
     * Backtracking tests.
     */
    {
        path: '{:foo/}?{:bar.}?',
        tests: [
            {
                input: '',
                matches: ['', undefined, undefined],
                expected: { path: '', index: 0, params: {} },
            },
            {
                input: 'test/',
                matches: ['test/', 'test', undefined],
                expected: {
                    path: 'test/',
                    index: 0,
                    params: { foo: 'test' },
                },
            },
            {
                input: 'a/b.',
                matches: ['a/b.', 'a', 'b'],
                expected: { path: 'a/b.', index: 0, params: { foo: 'a', bar: 'b' } },
            },
        ],
    },
    {
        path: '/abc{abc:foo}?',
        tests: [
            {
                input: '/abc',
                matches: ['/abc', undefined],
                expected: { path: '/abc', index: 0, params: {} },
            },
            {
                input: '/abcabc',
                matches: null,
                expected: false,
            },
            {
                input: '/abcabc123',
                matches: ['/abcabc123', '123'],
                expected: { path: '/abcabc123', index: 0, params: { foo: '123' } },
            },
            {
                input: '/abcabcabc123',
                matches: ['/abcabcabc123', 'abc123'],
                expected: {
                    path: '/abcabcabc123',
                    index: 0,
                    params: { foo: 'abc123' },
                },
            },
            {
                input: '/abcabcabc',
                matches: ['/abcabcabc', 'abc'],
                expected: { path: '/abcabcabc', index: 0, params: { foo: 'abc' } },
            },
        ],
    },
    {
        path: '/:foo{abc:bar}?',
        tests: [
            {
                input: '/abc',
                matches: ['/abc', 'abc', undefined],
                expected: { path: '/abc', index: 0, params: { foo: 'abc' } },
            },
            {
                input: '/abcabc',
                matches: ['/abcabc', 'abcabc', undefined],
                expected: { path: '/abcabc', index: 0, params: { foo: 'abcabc' } },
            },
            {
                input: '/abcabc123',
                matches: ['/abcabc123', 'abc', '123'],
                expected: {
                    path: '/abcabc123',
                    index: 0,
                    params: { foo: 'abc', bar: '123' },
                },
            },
            {
                input: '/abcabcabc123',
                matches: ['/abcabcabc123', 'abc', 'abc123'],
                expected: {
                    path: '/abcabcabc123',
                    index: 0,
                    params: { foo: 'abc', bar: 'abc123' },
                },
            },
            {
                input: '/abcabcabc',
                matches: ['/abcabcabc', 'abc', 'abc'],
                expected: {
                    path: '/abcabcabc',
                    index: 0,
                    params: { foo: 'abc', bar: 'abc' },
                },
            },
        ],
    },
    {
        path: '/:foo\\abc:bar',
        tests: [
            {
                input: '/abc',
                matches: null,
                expected: false,
            },
            {
                input: '/abcabc',
                matches: null,
                expected: false,
            },
            {
                input: '/abcabc123',
                matches: ['/abcabc123', 'abc', '123'],
                expected: {
                    path: '/abcabc123',
                    index: 0,
                    params: { foo: 'abc', bar: '123' },
                },
            },
            {
                input: '/abcabcabc123',
                matches: ['/abcabcabc123', 'abc', 'abc123'],
                expected: {
                    path: '/abcabcabc123',
                    index: 0,
                    params: { foo: 'abc', bar: 'abc123' },
                },
            },
            {
                input: '/abcabcabc',
                matches: ['/abcabcabc', 'abc', 'abc'],
                expected: {
                    path: '/abcabcabc',
                    index: 0,
                    params: { foo: 'abc', bar: 'abc' },
                },
            },
        ],
    },
    {
        path: '/:foo(.*){.:ext}?',
        tests: [
            {
                input: '/abc',
                matches: ['/abc', 'abc', undefined],
                expected: { path: '/abc', index: 0, params: { foo: 'abc' } },
            },
            {
                input: '/abc.txt',
                matches: ['/abc.txt', 'abc.txt', undefined],
                expected: { path: '/abc.txt', index: 0, params: { foo: 'abc.txt' } },
            },
        ],
    },
    {
        path: '/route|:param|',
        tests: [
            {
                input: '/route|world|',
                matches: ['/route|world|', 'world'],
                expected: {
                    path: '/route|world|',
                    index: 0,
                    params: { param: 'world' },
                },
            },
            {
                input: '/route||',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: '/:foo|:bar|',
        tests: [
            {
                input: '/hello|world|',
                matches: ['/hello|world|', 'hello', 'world'],
                expected: {
                    path: '/hello|world|',
                    index: 0,
                    params: { foo: 'hello', bar: 'world' },
                },
            },
            {
                input: '/hello||',
                matches: null,
                expected: false,
            },
        ],
    },
    {
        path: ':foo\\@:bar',
        tests: [
            {
                input: 'x@y',
                matches: ['x@y', 'x', 'y'],
                expected: { path: 'x@y', index: 0, params: { foo: 'x', bar: 'y' } },
            },
            {
                input: 'x@',
                matches: null,
                expected: false,
            },
        ],
    },

    /**
     * Multi character delimiters.
     */
    {
        path: '%25:foo{%25:bar}?',
        options: {
            delimiter: '%25',
        },
        tests: [
            {
                input: '%25hello',
                matches: ['%25hello', 'hello', undefined],
                expected: { path: '%25hello', index: 0, params: { foo: 'hello' } },
            },
            {
                input: '%25hello%25world',
                matches: ['%25hello%25world', 'hello', 'world'],
                expected: {
                    path: '%25hello%25world',
                    index: 0,
                    params: { foo: 'hello', bar: 'world' },
                },
            },
            {
                input: '%25555%25222',
                matches: ['%25555%25222', '555', '222'],
                expected: {
                    path: '%25555%25222',
                    index: 0,
                    params: { foo: '555', bar: '222' },
                },
            },
        ],
    },
];
