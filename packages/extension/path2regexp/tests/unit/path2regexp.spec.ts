/* eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/restrict-template-expressions,
 */

import { path2regexp } from '@cdp/extension-path2regexp';
import { PARSER_TESTS, STRINGIFY_TESTS, COMPILE_TESTS, MATCH_TESTS } from './test-cases';

const { parse, compile, match, stringify } = path2regexp;

/**
 * Dynamically generate the entire test suite.
 */
describe('path-to-regexp', () => {
    describe('parse errors', () => {
        it('should throw on unbalanced group', () => {
            expect(() => parse('/{:foo,')).toThrow(
                new TypeError(
                    'Unexpected END at 7, expected }: https://git.new/pathToRegexpError',
                ),
            );
        });
        it('should throw on nested unbalanced group', () => {
            expect(() => parse('/{:foo/{x,y}')).toThrow(
                new TypeError(
                    'Unexpected END at 12, expected }: https://git.new/pathToRegexpError',
                ),
            );
        });

        it('should throw on missing param name', () => {
            expect(() => parse('/:/')).toThrow(
                new TypeError(
                    'Missing parameter name at 2: https://git.new/pathToRegexpError',
                ),
            );
        });

        it('should throw on missing wildcard name', () => {
            expect(() => parse('/*/')).toThrow(
                new TypeError(
                    'Missing parameter name at 2: https://git.new/pathToRegexpError',
                ),
            );
        });

        it('should throw on unterminated quote', () => {
            expect(() => parse('/:"foo')).toThrow(
                new TypeError(
                    'Unterminated quote at 2: https://git.new/pathToRegexpError',
                ),
            );
        });
    });

    describe('compile errors', () => {
        it('should throw when a param is missing', () => {
            const toPath = compile('/a/:b/c');

            expect(() => {
                toPath();
            }).toThrow(new TypeError('Missing parameters: b'));
        });

        it('should throw when expecting a repeated value', () => {
            const toPath = compile('/*foo');

            expect(() => {
                toPath({ foo: [] });
            }).toThrow(new TypeError('Expected "foo" to be a non-empty array'));
        });

        it('should throw when param gets an array', () => {
            const toPath = compile('/:foo');

            expect(() => {
                toPath({ foo: [] });
            }).toThrow(new TypeError('Expected "foo" to be a string'));
        });

        it('should throw when a wildcard is not an array', () => {
            const toPath = compile('/*foo');

            expect(() => {
                toPath({ foo: 'a' });
            }).toThrow(new TypeError('Expected "foo" to be a non-empty array'));
        });

        it('should throw when a wildcard array value is not a string', () => {
            const toPath = compile('/*foo');

            expect(() => {
                toPath({ foo: [1, 'a'] as any });
            }).toThrow(new TypeError('Expected "foo/0" to be a string'));
        });
    });

    describe('parse $path with $options', () => {
        for (const { path, options, expected } of PARSER_TESTS) {
            it('should parse the path', () => {
                const data = parse(path, options);
                expect(data).toEqual(expected);
            });
        }
    });

    describe('stringify $tokens with $options', () => {
        for (const { data, expected } of STRINGIFY_TESTS) {
            it('should stringify the path', () => {
                const path = stringify(data);
                expect(path).toEqual(expected);
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
        function removeUndefined(src: Record<string, any> | boolean): object | boolean {
            if ('boolean' === typeof src) {
                return src;
            }
            for (const key of Object.keys(src)) {
                if (null == src[key]) {
                    delete src[key];
                } else if ('object' === typeof src[key]) {
                    removeUndefined(src[key]);
                }
            }
            return src;
        }

        for (const { path, options, tests } of MATCH_TESTS) {
            for (const { input, expected } of tests) {
                it(`should match $input: ${input}`, () => {
                    const fn = match(path, options);
                    expect(removeUndefined(fn(input))).toEqual(removeUndefined(expected));
                });
            }
        }
    });
});
