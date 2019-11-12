import { dropUndefined, restoreNil } from '@cdp/core-storage';

describe('storage/utils spec', () => {
    it('check dropUndefined()', () => {
        expect(dropUndefined('str')).toBe('str');
        expect(dropUndefined(100)).toBe(100);
        expect(dropUndefined(true)).toBe(true);
        expect(dropUndefined({ hoge: 'hoge' })).toEqual({ hoge: 'hoge' });
        expect(dropUndefined(null)).toBe(null);
        expect(dropUndefined(undefined)).toBe(null);
    });

    it('check dropUndefined() /w nilSelialize', () => {
        expect(dropUndefined('str', true)).toBe('str');
        expect(dropUndefined(100, true)).toBe(100);
        expect(dropUndefined(true, true)).toBe(true);
        expect(dropUndefined({ hoge: 'hoge' }, true)).toEqual({ hoge: 'hoge' });
        expect(dropUndefined(null, true)).toBe('null');
        expect(dropUndefined(undefined, true)).toBe('undefined');
    });

    it('check restoreNil()', () => {
        expect(restoreNil('str')).toBe('str');
        expect(restoreNil(100)).toBe(100);
        expect(restoreNil(true)).toBe(true);
        expect(restoreNil({ hoge: 'hoge' })).toEqual({ hoge: 'hoge' });
        expect(restoreNil(null)).toBe(null);
        expect(restoreNil(undefined)).toBe(undefined);
        expect(restoreNil('null')).toBe(null);
        expect(restoreNil('undefined')).toBe(undefined);
    });
});
