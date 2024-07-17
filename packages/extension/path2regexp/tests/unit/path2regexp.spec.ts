/* eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/restrict-template-expressions,
 */

import { path2regexp } from '@cdp/extension-path2regexp';
import { PARSER_TESTS, COMPILE_TESTS, MATCH_TESTS } from './test-cases';

const { pathToRegexp, parse, compile, match } = path2regexp;

/**
 * Dynamically generate the entire test suite.
 */
describe('path-to-regexp', () => {

    /**
     * Execute a regular expression and return a flat array for comparison.
     */
    function exec(re: RegExp, str: string): string[] | void {
        const match = re.exec(str);
        return match && Array.prototype.slice.call(match);
    }

    function removeUndefined(src: Record<string, any>): object {
        for (const key of Object.keys(src)) {
            if (null == src[key]) {
                delete src[key];
            } else if ('object' === typeof src[key]) {
                removeUndefined(src[key]);
            }
        }
        return src;
    }

    describe('arguments', () => {
        it('should accept an array of keys as the second argument', () => {
            const re = pathToRegexp('/user/:id', { end: false });

            const expectedKeys = [
                {
                    name: 'id',
                    pattern: undefined,
                },
            ];

            expect(re.keys).toEqual(expectedKeys);
            expect(exec(re, '/user/123/show')).toEqual(['/user/123', '123']);
        });

        it('should accept parse result as input', () => {
            const tokens = parse('/user/:id');
            const re = pathToRegexp(tokens);
            expect(exec(re, '/user/123')).toEqual(['/user/123', '123']);
        });

        it('should throw on non-capturing pattern', () => {
            expect(() => {
                pathToRegexp('/:foo(?:\\d+(\\.\\d+)?)');
            }).toThrow(new TypeError(`Pattern cannot start with "?" at 6`));
        });

        it('should throw on nested capturing group', () => {
            expect(() => {
                pathToRegexp('/:foo(\\d+(\\.\\d+)?)');
            }).toThrow(new TypeError('Capturing groups are not allowed at 9'));
        });

        it('should throw on unbalanced pattern', () => {
            expect(() => {
                pathToRegexp('/:foo(abc');
            }).toThrow(new TypeError('Unbalanced pattern at 5'));
        });

        it('should throw on missing pattern', () => {
            expect(() => {
                pathToRegexp('/:foo()');
            }).toThrow(new TypeError('Missing pattern at 5'));
        });

        it('should throw on missing name', () => {
            expect(() => {
                pathToRegexp('/:(test)');
            }).toThrow(new TypeError('Missing parameter name at 2'));
        });

        it('should throw on nested groups', () => {
            expect(() => {
                pathToRegexp('/{a{b:foo}}');
            }).toThrow(
                new TypeError(
                    'Unexpected { at 3, expected }: https://git.new/pathToRegexpError',
                ),
            );
        });

        it('should throw on repeat parameters without a separator', () => {
            expect(() => {
                pathToRegexp('{:x}*');
            }).toThrow(
                new TypeError(
                    `Missing separator for "x": https://git.new/pathToRegexpError`,
                ),
            );
        });
    });

    describe('parse $path with $options', () => {
        function normalizeTokens(src: path2regexp.Token[]): path2regexp.Token[] {
            for (const token of src) {
                if ('object' === typeof token) {
                    removeUndefined(token);
                }
            }
            return src;
        }

        for (const { path, options, expected } of PARSER_TESTS) {
            it(`should parse the path: ${path}`, () => {
                const data = parse(path, options);
                expect(normalizeTokens(data.tokens)).toEqual(expected);
            });
        }
    });

    describe('compile $path with $options', () => {
        for (const { path, options, tests } of COMPILE_TESTS) {
            for (const { input, expected } of tests) {
                it(`should compile $input: ${input}`, () => {
                    const toPath = compile(path, options);
                    if (null === expected) {
                        expect(() => toPath(input)).toThrow();
                    } else {
                        expect(toPath(input)).toEqual(expected);
                    }
                });
            }
        }
    });

    describe('match $path with $options', () => {
        function normalizeResult(src: path2regexp.Match<path2regexp.ParamData>): path2regexp.Match<path2regexp.ParamData> {
            if ('object' === typeof src) {
                removeUndefined(src);
            }
            return src;
        }

        for (const { path, options, tests } of MATCH_TESTS) {
            for (const { input, matches, expected } of tests) {
                it(`should match $input: ${input}`, () => {
                    const re = pathToRegexp(path, options);
                    const matched = match(path, options);

                    expect(exec(re, input)).toEqual(matches as string[]);
                    expect(normalizeResult(matched(input))).toEqual(normalizeResult(expected));
                });
            }
        }
    });

    describe('compile errors', () => {
        it('should throw when a required param is undefined', () => {
            const toPath = compile('/a/:b/c');

            expect(() => {
                toPath();
            }).toThrow(new TypeError(`Expected "b" to be a string`));
        });

        it('should throw when it does not match the pattern', () => {
            const toPath = compile('/:foo(\\d+)');

            expect(() => {
                toPath({ foo: 'abc' });
            }).toThrow(new TypeError(`Invalid value for "foo": "abc"`));
        });

        it('should throw when expecting a repeated value', () => {
            const toPath = compile('{/:foo}+');

            expect(() => {
                toPath({ foo: [] });
            }).toThrow(new TypeError(`Invalid value for "foo": ""`));
        });

        it('should throw when not expecting a repeated value', () => {
            const toPath = compile('/:foo');

            expect(() => {
                toPath({ foo: [] });
            }).toThrow(new TypeError(`Expected "foo" to be a string`));
        });

        it('should throw when a repeated param is not an array', () => {
            const toPath = compile('{/:foo}+');

            expect(() => {
                toPath({ foo: 'a' });
            }).toThrow(new TypeError(`Expected "foo" to be an array`));
        });

        it('should throw when an array value is not a string', () => {
            const toPath = compile('{/:foo}+');

            expect(() => {
                toPath({ foo: [1, 'a'] as any });
            }).toThrow(new TypeError(`Expected "foo/0" to be a string`));
        });

        it('should throw when repeated value does not match', () => {
            const toPath = compile('{/:foo(\\d+)}+');

            expect(() => {
                toPath({ foo: ['1', '2', '3', 'a'] });
            }).toThrow(new TypeError(`Invalid value for "foo": "/1/2/3/a"`));
        });
    });
});
