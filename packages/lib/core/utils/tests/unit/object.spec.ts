/* eslint-disable
    @typescript-eslint/no-explicit-any
 ,  @typescript-eslint/unbound-method
 */

import {
    has,
    pick,
    omit,
    invert,
    diff,
    drop,
    result,
} from '@cdp/core-utils';

describe('utils/object spec', () => {
    it('check hasProperty()', (): void => {
        const src = {
            hoge: 1,
            fuga: 2,
        };
        expect(has(src, 'hoge')).toBe(true);
        expect(has(src, 'fuga')).toBe(true);
        expect(has(src, 'foo')).toBe(false);
    });

    it('check pick()', (): void => {
        expect(() => pick(null as any, '')).toThrow();
        expect(() => pick(false as any, '')).toThrow();
        const src = {
            hoge: 1,
            fuga: 2,
            foo: 'hello',
            bar: 'world',
        };
        const dst = pick(src, 'hoge', 'foo');
        expect(dst.hoge).toBe(1);
        expect((dst as any).fuga).toBeUndefined();
        expect(dst.foo).toBe('hello');
        expect((dst as any).bar).toBeUndefined();
    });

    it('check omit()', (): void => {
        expect(() => omit(null as any, '')).toThrow();
        expect(() => omit(false as any, '')).toThrow();
        const src = {
            hoge: 1,
            fuga: 2,
            foo: 'hello',
            bar: 'world',
        };
        const dst = omit(src, 'hoge', 'foo');
        expect((dst as any).hoge).toBeUndefined();
        expect(dst.fuga).toBe(2);
        expect((dst as any).foo).toBeUndefined();
        expect(dst.bar).toBe('world');
    });

    it('check invert()', (): void => {
        expect(invert({
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&#39;',
            '`': '&#x60;'
        })).toEqual({
            '&lt;': '<',
            '&gt;': '>',
            '&amp;': '&',
            '&quot;': '"',
            '&#39;': "'",
            '&#x60;': '`'
        });
    });

    it('check diff()', (): void => {
        const base = {
            hoge: 1,
            foo: 'hello',
            bar: {
                p1: 100,
                p2: 'bar'
            },
            fuga: {
                p1: 100,
                p2: 'fuga',
            },
        };

        const src = {
            hoge: 1,
            foo: 'good morning',
            bar: {
                p1: 100,
                p2: 'bar2'
            },
            fuga: {
                p1: 100,
                p2: 'fuga',
            },
        };

        expect(() => diff(null as any, src)).toThrow();
        expect(() => diff(base, false as any)).toThrow();

        const dst = diff(base, src);
        expect((dst as any).hoge).toBeUndefined();
        expect(dst.foo).toBe('good morning');
        expect(dst.bar).toEqual(src.bar);
        expect((dst as any).fuga).toBeUndefined();
    });

    it('check drop()', (): void => {
        const base = {
            hoge: 1,
            foo: 'hello',
            bar: undefined,
            fuga: {
                p1: 100,
                p2: 'fuga',
            },
        };

        expect(drop(base)).toEqual({
            hoge: 1,
            foo: 'hello',
            fuga: {
                p1: 100,
                p2: 'fuga',
            },
        });
        expect(drop(base, 1)).toEqual({
            foo: 'hello',
            bar: undefined,
            fuga: {
                p1: 100,
                p2: 'fuga',
            },
        });
        expect(drop(base, 'hello')).toEqual({
            hoge: 1,
            bar: undefined,
            fuga: {
                p1: 100,
                p2: 'fuga',
            },
        });
        expect(drop(base, { p1: 100, p2: 'fuga' })).toEqual({
            hoge: 1,
            foo: 'hello',
            bar: undefined,
        });
        expect(drop(base, true)).toEqual({
            hoge: 1,
            foo: 'hello',
            bar: undefined,
            fuga: {
                p1: 100,
                p2: 'fuga',
            },
        });

        expect(drop(base, 1, 'hello', undefined, { p1: 100, p2: 'fuga' })).toEqual({});

        expect(() => drop(null as any, '')).toThrow();
        expect(() => drop(false as any, '')).toThrow();
    });

    it('check result()', (): void => {
        {
            const obj = { w: '', x: 'x', y: function () { return this.x; } }; // eslint-disable-line
            expect(result(obj, 'w')).toBe('');
            expect(result(obj, 'x')).toBe('x');
            expect(result(obj, 'y')).toBe('x');
            expect(result(obj, 'z')).toBe(void 0);
            expect(result(null, 'x')).toBe(void 0);

            expect(result(null, 'b', 'default')).toBe('default');
            expect(result(void 0, 'c', 'default')).toBe('default');
            expect(result(''.match('missing'), 1 as any, 'default')).toBe('default'); // eslint-disable-line

            expect(result({ d: null }, 'd')).toBe(null);
            expect(result({ e: false }, 'e')).toBe(false);

            expect(result({}, 'b', 'default')).toBe('default');
            expect(result({ d: void 0 }, 'd', 'default')).toBe('default');
        }

        {
            const Foo: new () => any = function () { } as any; // eslint-disable-line
            Foo.prototype.bar = 1;
            expect(result(new Foo(), 'bar', 2)).toBe(1);
        }

        {
            const obj = { a: function () { } }; // eslint-disable-line
            expect(result<any>(obj, 'a', 'failed')).toBe(void 0);
        }

        {
            /* eslint-disable object-shorthand,  no-invalid-this, @typescript-eslint/no-empty-function, @typescript-eslint/explicit-function-return-type */
            const func = function () { return 'f'; };
            const context = function (this: any) { return this; };

            expect(result({ a: 1 }, 'a')).toBe(1);
            expect(result({ a: { b: 2 } }, ['a', 'b'])).toBe(2);
            expect(result({ a: 1 }, 'b', 2)).toBe(2);
            expect(result({ a: 1 }, ['b', 'c'], 2)).toBe(2);
            expect(result({ a: void 0 }, ['a'], 1)).toBe(1);
            expect(result<any>({ a: false }, ['a'], 'foo')).toBe(false);

            expect(result({ a: func }, 'a')).toBe('f');
            expect(result({ a: { b: func } }, ['a', 'b'])).toBe('f');
            expect(result(void 1, 'a', 2)).toBe(2);
            expect(result(void 1, 'a', func)).toBe('f');
            expect(result({}, void 0 as any, 2)).toBe(2);
            expect(result({}, void 0 as any, func)).toBe('f');

            const childObj = { c: context };
            const obj = { a: context, b: childObj };

            expect(result(obj, 'a')).toEqual(obj);
            expect(result(obj, 'e', context)).toEqual(obj);
            expect(result(obj, ['a', 'x'], context)).toEqual(obj);
            expect(result(obj, ['b', 'c'])).toEqual(childObj);

            expect(result({}, [], 'a')).toBe('a');
            expect(result(obj, [], context)).toEqual(obj);

            const nested = {
                d: function () {
                    return {
                        e: function () {
                            return obj;
                        },
                        f: context
                    };
                }
            };
            expect(result(nested, ['d', 'e'])).toEqual(obj);
            expect(result(nested, ['d', 'f']).e()).toEqual(obj);
            expect(result<any>(nested, ['d', 'x'], context).e()).toEqual(obj);
            /* eslint-enable object-shorthand,  no-invalid-this, @typescript-eslint/no-empty-function, @typescript-eslint/explicit-function-return-type */
        }
    });
});
