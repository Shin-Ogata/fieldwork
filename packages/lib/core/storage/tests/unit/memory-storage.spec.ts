/* eslint-disable
    no-new-wrappers,
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/no-unused-vars,
 */

import { CancelToken } from '@cdp/promise';
import { type IStorage, MemoryStorage } from '@cdp/core-storage';

describe('storage/memory-storage spec', () => {

    const cancelSource = CancelToken.source();
    const { token } = cancelSource;
    cancelSource.cancel(new Error('aborted'));

    let _storage!: IStorage;
//  let _storage!: MemoryStorage;
    let _count: number;

    const onCallback = (key: string | null, newVal?: any, oldVal?: any): void => {
        _count++;
    };

    beforeEach(async () => {
        _storage = new MemoryStorage();
        await _storage.setItem('str', 'hoge');
        await _storage.setItem('num', 100);
        await _storage.setItem('bool', false);
        await _storage.setItem('obj', { hoge: 'fuga' });
        await _storage.setItem('nil', null);
        _count = 0;
    });

    it('check MemoryStorage#kind()', () => {
        expect(_storage.kind).toBe('memory');
    });

    it('check MemoryStorage#keys()', async () => {
        const keys = await _storage.keys();
        expect(keys.length).toBe(5);
        expect(keys.includes('str')).toBe(true);
        expect(keys.includes('num')).toBe(true);
        expect(keys.includes('bool')).toBe(true);
        expect(keys.includes('obj')).toBe(true);
        expect(keys.includes('nil')).toBe(true);
    });

    it('check MemoryStorage#keys() w/ cancel', async () => {
        try {
            await _storage.keys({ cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
    });

    it('check MemoryStorage#getItem()', async () => {
        expect(await _storage.getItem('str')).toBe('hoge');
        expect(await _storage.getItem('num')).toBe(100);
        expect(await _storage.getItem('bool')).toBe(false);
        expect(await _storage.getItem('obj')).toEqual({ hoge: 'fuga' });
        expect(await _storage.getItem('nil')).toBe(null);
    });

    it('check MemoryStorage#getItem<cast>()', async () => {
        // check
        expect(await _storage.getItem<string>('str')).toBe('hoge');
        expect(await _storage.getItem<number>('num')).toBe(100);
        expect(await _storage.getItem<boolean>('bool')).toBe(false);
        expect(await _storage.getItem<object>('obj')).toEqual({ hoge: 'fuga' });
    });

    it('check MemoryStorage#getItem() w/ dataType', async () => {
        expect(await _storage.getItem('str', { dataType: 'string' })).toBe('hoge');
        expect(await _storage.getItem('num', { dataType: 'number' })).toBe(100);
        expect(await _storage.getItem('bool', { dataType: 'boolean' })).toBe(false);
        expect(await _storage.getItem('obj', { dataType: 'object' })).toEqual({ hoge: 'fuga' });
        expect(await _storage.getItem('nil', { dataType: 'string' })).toBe('null');
//      expect(await _storage.getItem<number>('str', { dataType: 'string' })).toBe('hoge'); // compile error "cast" と "dataType" は同時使用不可
    });

    it('check MemoryStorage#getItem() w/ dataType convert string', async () => {
        expect(await _storage.getItem('str', { dataType: 'string' })).toBe('hoge');
        expect(await _storage.getItem('num', { dataType: 'string' })).toBe('100');
        expect(await _storage.getItem('bool', { dataType: 'string' })).toBe('false');
        expect(await _storage.getItem('obj', { dataType: 'string' })).toBe('{"hoge":"fuga"}');
        expect(await _storage.getItem('nil', { dataType: 'string' })).toBe('null');
    });

    it('check MemoryStorage#getItem() w/ dataType convert number', async () => {
        expect(await _storage.getItem('str', { dataType: 'number' })).toBeNaN();
        expect(await _storage.getItem('num', { dataType: 'number' })).toBe(100);
        expect(await _storage.getItem('bool', { dataType: 'number' })).toBe(0);
        expect(await _storage.getItem('obj', { dataType: 'number' })).toBeNaN();
        expect(await _storage.getItem('nil', { dataType: 'number' })).toBe(0);
    });

    it('check MemoryStorage#getItem() w/ dataType convert boolean', async () => {
        expect(await _storage.getItem('str', { dataType: 'boolean' })).toBe(true);
        expect(await _storage.getItem('num', { dataType: 'boolean' })).toBe(true);
        expect(await _storage.getItem('bool', { dataType: 'boolean' })).toBe(false);
        expect(await _storage.getItem('obj', { dataType: 'boolean' })).toBe(true);
        expect(await _storage.getItem('nil', { dataType: 'boolean' })).toBe(false);
    });

    it('check MemoryStorage#getItem() w/ dataType convert object', async () => {
        expect(await _storage.getItem('str', { dataType: 'object' })).toEqual(new String('hoge'));
        expect(await _storage.getItem('num', { dataType: 'object' })).toEqual(new Number(100));
        expect(await _storage.getItem('bool', { dataType: 'object' })).toEqual(new Boolean(false));
        expect(await _storage.getItem('obj', { dataType: 'object' })).toEqual({ hoge: 'fuga' });
        expect(await _storage.getItem('nil', { dataType: 'object' })).toEqual({});
    });

    it('check MemoryStorage#getItem() w/ cancel', async () => {
        try {
            await _storage.getItem('num', { cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
    });

    it('check MemoryStorage#setItem() w/ callback', async () => {
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
    });

    it('check MemoryStorage#setItem(silent) w/ callback', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        // on
        _storage.on(stub.onCallback);

        await _storage.setItem('num', 200, { silent: true });
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(await _storage.getItem<number>('num')).toBe(200);

        expect(_count).toBe(0);
    });

    it('check MemoryStorage#setItem() w/ cancel', async () => {
        try {
            await _storage.setItem('bool', true, { cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
        expect(await _storage.getItem<boolean>('bool')).toBe(false);
    });

    it('check MemoryStorage#removeItem() w/ options', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        // on
        _storage.on(stub.onCallback);

        await _storage.removeItem('num');
        expect(stub.onCallback).toHaveBeenCalledWith('num', null, 100);
        expect(await _storage.getItem('num')).toBeNull();

        // no change
        await _storage.removeItem('num');
        expect(_count).toBe(1);

        // with silent
        await _storage.removeItem('str', { silent: true });
        expect(_count).toBe(1);
        expect(await _storage.getItem('str')).toBeNull();

        // off
        _storage.off(stub.onCallback);
        await _storage.removeItem('bool');
        expect(_count).toBe(1);
        expect(await _storage.getItem('bool')).toBeNull();

        try {
            await _storage.removeItem('obj', { cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
        expect(await _storage.getItem('obj')).toBeDefined();
    });

    it('check MemoryStorage#clear() w/ callback', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        // on
        _storage.on(stub.onCallback);

        await _storage.clear();
        expect(stub.onCallback).toHaveBeenCalledWith(null, null, null);
        expect((await _storage.keys()).length).toBe(0);
    });

    it('check MemoryStorage#clear() w/ options', async () => {
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
    });

    it('check MemoryStorage#context', () => {
        const obj = (_storage as MemoryStorage).context;
        expect(obj.str).toBe('hoge');
        expect(obj.num).toBe(100);
        expect(obj.bool).toBe(false);
        expect(obj.obj).toEqual({ hoge: 'fuga' });
        expect(obj.nil).toBe('null');
    });
});
