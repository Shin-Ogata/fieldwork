/* eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/restrict-template-expressions,
 */

import { path2regexp } from '@cdp/extension-path2regexp';
import { PARSER_TESTS, STRINGIFY_TESTS, COMPILE_TESTS, MATCH_TESTS } from './test-cases';

const { parse, compile, match, stringify, pathToRegexp, TokenData, PathError } = path2regexp;

/**
 * Dynamically generate the entire test suite.
 */
describe('path-to-regexp', () => {
    describe('ParseError', () => {
        it('should contain original path and debug url', () => {
            const error = new PathError(
                'Unexpected end at index 7, expected }',
                '/{:foo,',
            );

            expect(error).toBeInstanceOf(TypeError);
            expect(error.message).toBe(
                'Unexpected end at index 7, expected }: /{:foo,; visit https://git.new/pathToRegexpError for info',
            );
            expect(error.originalPath).toBe('/{:foo,');
        });

        it('should omit original url when undefined', () => {
            const error = new PathError(
                'Unexpected end at index 7, expected }',
                undefined,
            );

            expect(error).toBeInstanceOf(TypeError);
            expect(error.message).toBe(
                'Unexpected end at index 7, expected }; visit https://git.new/pathToRegexpError for info',
            );
            expect(error.originalPath).toBeUndefined();
        });
    });

    describe('parse errors', () => {
        it('should throw on unbalanced group', () => {
            expect(() => parse('/{:foo,')).toThrow(
                new PathError('Unexpected end at index 7, expected }', '/{:foo,'),
            );
        });
        it('should throw on nested unbalanced group', () => {
            expect(() => parse('/{:foo/{x,y}')).toThrow(
                new PathError('Unexpected end at index 12, expected }', '/{:foo/{x,y}'),
            );
        });

        it('should throw on missing param name', () => {
            expect(() => parse('/:/')).toThrow(
                new PathError('Missing parameter name at index 2', '/:/'),
            );
        });

        it('should throw on missing wildcard name', () => {
            expect(() => parse('/*/')).toThrow(
                new PathError('Missing parameter name at index 2', '/*/'),
            );
        });

        it('should throw on unterminated quote', () => {
            expect(() => parse('/:"foo')).toThrow(
                new PathError('Unterminated quote at index 2', '/:"foo'),
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

    describe('pathToRegexp errors', () => {
        it('should throw when missing text between params', () => {
            expect(() => pathToRegexp('/:foo:bar')).toThrow(
                new PathError('Missing text before "bar" param', '/:foo:bar'),
            );
        });

        it('should throw when missing text between params using TokenData', () => {
            expect(() =>
                pathToRegexp(
                    new TokenData([
                        { type: 'param', name: 'a' },
                        { type: 'param', name: 'b' },
                    ]),
                ),
            ).toThrow(new PathError('Missing text before "b" param', undefined));
        });

        it('should throw with `originalPath` when missing text between params using TokenData', () => {
            expect(() =>
                pathToRegexp(
                    new TokenData(
                        [
                            { type: 'param', name: 'a' },
                            { type: 'param', name: 'b' },
                        ],
                        '/[a][b]',
                    ),
                ),
            ).toThrow(new PathError('Missing text before "b" param', '/[a][b]'));
        });

        xit('should contain the error line', () => {
            try {
                pathToRegexp('/:');
            } catch (error) {
                const stack = (error as Error).stack
                    ?.split('\n')
                    .slice(0, 5)
                    .join('\n');
                expect(stack).toContain('index.spec.ts');
            }
        });
    });

    describe('stringify errors', () => {
        it('should error on unknown token', () => {
            expect(() =>
                stringify({ tokens: [{ type: 'unknown', value: 'test' } as any] }),
            ).toThrow(new TypeError('Unknown token type: unknown'));
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
