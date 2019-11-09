/* eslint-disable no-new-wrappers, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { CancelToken } from '@cdp/promise';
import { IStorage, MemoryStorage } from '@cdp/core-storage';

describe('storage/memory-storage spec', () => {

    const cancelSource = CancelToken.source();
    const { token } = cancelSource;
    cancelSource.cancel(new Error('aborted'));

    let _storage!: IStorage;
//  let _storage!: MemoryStorage;
    let _count: number;

    const onCallback = (key: string | undefined, newVal?: any, oldVal?: any): void => {
        _count++;
    };

    beforeEach(async (done) => {
        _storage = new MemoryStorage();
        await _storage.setItem('str', 'hoge');
        await _storage.setItem('num', 100);
        await _storage.setItem('bool', false);
        await _storage.setItem('obj', { hoge: 'fuga' });
        await _storage.setItem('nil', null);
        _count = 0;
        done();
    });

    it('check MemoryStorage#kind()', () => {
        expect(_storage.kind).toBe('memory');
    });

    it('check MemoryStorage#keys()', async (done) => {
        const keys = await _storage.keys();
        expect(keys.length).toBe(5);
        expect(keys.includes('str')).toBe(true);
        expect(keys.includes('num')).toBe(true);
        expect(keys.includes('bool')).toBe(true);
        expect(keys.includes('obj')).toBe(true);
        expect(keys.includes('nil')).toBe(true);
        done();
    });

    it('check MemoryStorage#keys() /w cancel', async (done) => {
        try {
            await _storage.keys({ cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
        done();
    });

    it('check MemoryStorage#getItem()', async (done) => {
        expect(await _storage.getItem('str')).toBe('hoge' as any);
        expect(await _storage.getItem('num')).toBe(100 as any);
        expect(await _storage.getItem('bool')).toBe(false as any);
        expect(await _storage.getItem('obj')).toEqual({ hoge: 'fuga' } as any);
        expect(await _storage.getItem('nil')).toBe(null as any);
        done();
    });

    it('check MemoryStorage#getItem<cast>()', async (done) => {
        expect(await _storage.getItem<string>('str')).toBe('hoge');
        expect(await _storage.getItem<number>('num')).toBe(100);
        expect(await _storage.getItem<boolean>('bool')).toBe(false);
        expect(await _storage.getItem<object>('obj')).toEqual({ hoge: 'fuga' });
        expect(await _storage.getItem<null>('nil')).toBe(null);
        done();
    });

    it('check MemoryStorage#getItem() /w dataType', async (done) => {
        expect(await _storage.getItem('str', { dataType: 'string' })).toBe('hoge');
        expect(await _storage.getItem('num', { dataType: 'number' })).toBe(100);
        expect(await _storage.getItem('bool', { dataType: 'boolean' })).toBe(false);
        expect(await _storage.getItem('obj', { dataType: 'object' })).toEqual({ hoge: 'fuga' });
        expect(await _storage.getItem('nil', { dataType: 'null' })).toBe(null);
//      expect(await _storage.getItem<number>('str', { dataType: 'string' })).toBe('hoge'); // compile error "cast" と "dataType" は同時使用不可
        done();
    });

    it('check MemoryStorage#getItem() /w dataType convert string', async (done) => {
        expect(await _storage.getItem('str', { dataType: 'string' })).toBe('hoge');
        expect(await _storage.getItem('num', { dataType: 'string' })).toBe('100');
        expect(await _storage.getItem('bool', { dataType: 'string' })).toBe('false');
        expect(await _storage.getItem('obj', { dataType: 'string' })).toBe('{"hoge":"fuga"}');
        expect(await _storage.getItem('nil', { dataType: 'string' })).toBe('null');
        done();
    });

    it('check MemoryStorage#getItem() /w dataType convert number', async (done) => {
        expect(await _storage.getItem('str', { dataType: 'number' })).toBeNaN();
        expect(await _storage.getItem('num', { dataType: 'number' })).toBe(100);
        expect(await _storage.getItem('bool', { dataType: 'number' })).toBe(0);
        expect(await _storage.getItem('obj', { dataType: 'number' })).toBeNaN();
        expect(await _storage.getItem('nil', { dataType: 'number' })).toBe(0);
        done();
    });

    it('check MemoryStorage#getItem() /w dataType convert boolean', async (done) => {
        expect(await _storage.getItem('str', { dataType: 'boolean' })).toBe(true);
        expect(await _storage.getItem('num', { dataType: 'boolean' })).toBe(true);
        expect(await _storage.getItem('bool', { dataType: 'boolean' })).toBe(false);
        expect(await _storage.getItem('obj', { dataType: 'boolean' })).toBe(true);
        expect(await _storage.getItem('nil', { dataType: 'boolean' })).toBe(false);
        done();
    });

    it('check MemoryStorage#getItem() /w dataType convert object', async (done) => {
        expect(await _storage.getItem('str', { dataType: 'object' })).toEqual(new String('hoge'));
        expect(await _storage.getItem('num', { dataType: 'object' })).toEqual(new Number(100));
        expect(await _storage.getItem('bool', { dataType: 'object' })).toEqual(new Boolean(false));
        expect(await _storage.getItem('obj', { dataType: 'object' })).toEqual({ hoge: 'fuga' });
        expect(await _storage.getItem('nil', { dataType: 'object' })).toEqual({});
        done();
    });

    it('check MemoryStorage#getItem() /w dataType convert null (no effect)', async (done) => {
        expect(await _storage.getItem('str', { dataType: 'null' })).not.toBeNull();
        expect(await _storage.getItem('num', { dataType: 'null' })).not.toBeNull();
        expect(await _storage.getItem('bool', { dataType: 'null' })).not.toBeNull();
        expect(await _storage.getItem('obj', { dataType: 'null' })).not.toBeNull();
        expect(await _storage.getItem('nil', { dataType: 'null' })).toBeNull();
        done();
    });

    it('check MemoryStorage#getItem() /w cancel', async (done) => {
        try {
            await _storage.getItem('num', { cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
        done();
    });

    it('check MemoryStorage#setItem() /w callback', async (done) => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        // on
        _storage.on(stub.onCallback);

        await _storage.setItem('str', 'new');
        expect(stub.onCallback).toHaveBeenCalledWith('str', 'new', 'hoge');
        expect(await _storage.getItem<string>('str')).toBe('new');

        // no change
        await _storage.setItem('str', 'new');
        expect(_count).toBe(1);

        // off
        _storage.off(stub.onCallback);
        await _storage.setItem('str', 'fuga');
        expect(await _storage.getItem<string>('str')).toBe('fuga');
        expect(_count).toBe(1);

        done();
    });

    it('check MemoryStorage#setItem(silent) /w callback', async (done) => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        // on
        _storage.on(stub.onCallback);

        await _storage.setItem('num', 200, { silent: true });
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(await _storage.getItem<number>('num')).toBe(200);

        expect(_count).toBe(0);
        done();
    });

    it('check MemoryStorage#setItem() /w cancel', async (done) => {
        try {
            await _storage.setItem('bool', true, { cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
        expect(await _storage.getItem<boolean>('bool')).toBe(false);
        done();
    });

    it('check MemoryStorage#removeItem() /w options', async (done) => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        // on
        _storage.on(stub.onCallback);

        await _storage.removeItem('num');
        expect(stub.onCallback).toHaveBeenCalledWith('num', undefined, 100);
        expect(await _storage.getItem('num')).toBeUndefined();

        // no change
        await _storage.removeItem('num');
        expect(_count).toBe(1);

        // with silent
        await _storage.removeItem('str', { silent: true });
        expect(_count).toBe(1);
        expect(await _storage.getItem('str')).toBeUndefined();

        // off
        _storage.off(stub.onCallback);
        await _storage.removeItem('bool');
        expect(_count).toBe(1);
        expect(await _storage.getItem('bool')).toBeUndefined();

        try {
            await _storage.removeItem('obj', { cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
        expect(await _storage.getItem('obj')).toBeDefined();

        done();
    });

    it('check MemoryStorage#clear() /w callback', async (done) => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        // on
        _storage.on(stub.onCallback);

        await _storage.clear();
        expect(stub.onCallback).toHaveBeenCalledWith(undefined);
        expect((await _storage.keys()).length).toBe(0);

        done();
    });

    it('check MemoryStorage#clear() /w options', async (done) => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        // on
        _storage.on(stub.onCallback);

        // cancel
        try {
            await _storage.clear({ cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }

        expect((await _storage.keys()).length).toBe(5);

        // silent
        await _storage.clear({ silent: true });
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect((await _storage.keys()).length).toBe(0);

        // no effect
        await _storage.clear();
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect((await _storage.keys()).length).toBe(0);

        done();
    });
});
