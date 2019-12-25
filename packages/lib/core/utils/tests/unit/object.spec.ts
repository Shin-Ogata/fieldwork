/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/unbound-method */

import {
    has,
    pick,
    omit,
    invert,
    diff,
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
});
