/* eslint-disable
    no-new-wrappers,
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/no-unused-vars,
 */

import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { deepEqual } from '@cdp/core-utils';
import { CancelToken } from '@cdp/promise';
import { IStorage } from '@cdp/core-storage';
import { FsStorage } from '@cdp/fs-storage';

describe('storage/attributes spec', () => {
    const location = resolve('.temp/test-storage.json');

    const cancelSource = CancelToken.source();
    const { token } = cancelSource;
    cancelSource.cancel(new Error('aborted'));

    let _storage!: IStorage;
    let _count: number;

    const onCallback = (key: string | null, newVal?: any, oldVal?: any): void => {
        _count++;
    };

    beforeEach(async () => {
        _storage = new FsStorage(location);
        await _storage.setItem('str', 'hoge');
        await _storage.setItem('num', 100);
        await _storage.setItem('bool', false);
        await _storage.setItem('obj', { hoge: 'fuga' });
        await _storage.setItem('nil', null);
        _count = 0;
    });

    afterEach(() => {
        (_storage as FsStorage).destroy();
    });

    it('check FsStorage#kind()', () => {
        expect(_storage.kind).toBe('node-fs');
    });

    it('check FsStorage#keys()', async () => {
        const keys = await _storage.keys();
        expect(keys.length).toBe(5);
        expect(keys.includes('str')).toBe(true);
        expect(keys.includes('num')).toBe(true);
        expect(keys.includes('bool')).toBe(true);
        expect(keys.includes('obj')).toBe(true);
        expect(keys.includes('nil')).toBe(true);
    });

    it('check FsStorage#keys() w/ cancel', async () => {
        try {
            await _storage.keys({ cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
    });

    it('check FsStorage#getItem()', async () => {
        expect(await _storage.getItem('str')).toBe('hoge');
        expect(await _storage.getItem('num')).toBe(100);
        expect(await _storage.getItem('bool')).toBe(false);
        expect(await _storage.getItem('obj')).toEqual({ hoge: 'fuga' });
        expect(await _storage.getItem('nil')).toBe(null);
    });

    it('check FsStorage#getItem<cast>()', async () => {
        // check
        expect(await _storage.getItem<string>('str')).toBe('hoge');
        expect(await _storage.getItem<number>('num')).toBe(100);
        expect(await _storage.getItem<boolean>('bool')).toBe(false);
        expect(await _storage.getItem<object>('obj')).toEqual({ hoge: 'fuga' });
    });

    it('check FsStorage#getItem() w/ dataType', async () => {
        expect(await _storage.getItem('str', { dataType: 'string' })).toBe('hoge');
        expect(await _storage.getItem('num', { dataType: 'number' })).toBe(100);
        expect(await _storage.getItem('bool', { dataType: 'boolean' })).toBe(false);
        expect(await _storage.getItem('obj', { dataType: 'object' })).toEqual({ hoge: 'fuga' });
        expect(await _storage.getItem('nil', { dataType: 'string' })).toBe('null');
//      expect(await _storage.getItem<number>('str', { dataType: 'string' })).toBe('hoge'); // compile error "cast" と "dataType" は同時使用不可
    });

    it('check FsStorage#getItem() w/ dataType convert string', async () => {
        expect(await _storage.getItem('str', { dataType: 'string' })).toBe('hoge');
        expect(await _storage.getItem('num', { dataType: 'string' })).toBe('100');
        expect(await _storage.getItem('bool', { dataType: 'string' })).toBe('false');
        expect(await _storage.getItem('obj', { dataType: 'string' })).toBe('{"hoge":"fuga"}');
        expect(await _storage.getItem('nil', { dataType: 'string' })).toBe('null');
    });

    it('check FsStorage#getItem() w/ dataType convert number', async () => {
        expect(await _storage.getItem('str', { dataType: 'number' })).toBeNaN();
        expect(await _storage.getItem('num', { dataType: 'number' })).toBe(100);
        expect(await _storage.getItem('bool', { dataType: 'number' })).toBe(0);
        expect(await _storage.getItem('obj', { dataType: 'number' })).toBeNaN();
        expect(await _storage.getItem('nil', { dataType: 'number' })).toBe(0);
    });

    it('check FsStorage#getItem() w/ dataType convert boolean', async () => {
        expect(await _storage.getItem('str', { dataType: 'boolean' })).toBe(true);
        expect(await _storage.getItem('num', { dataType: 'boolean' })).toBe(true);
        expect(await _storage.getItem('bool', { dataType: 'boolean' })).toBe(false);
        expect(await _storage.getItem('obj', { dataType: 'boolean' })).toBe(true);
        expect(await _storage.getItem('nil', { dataType: 'boolean' })).toBe(false);
    });

    it('check FsStorage#getItem() w/ dataType convert object', async () => {
        expect(deepEqual(await _storage.getItem('str', { dataType: 'object' }), new String('hoge'))).toBe(true);
        expect(deepEqual(await _storage.getItem('num', { dataType: 'object' }), new Number(100))).toBe(true);
        expect(deepEqual(await _storage.getItem('bool', { dataType: 'object' }), new Boolean(false))).toBe(true);
        expect(deepEqual(await _storage.getItem('obj', { dataType: 'object' }), { hoge: 'fuga' })).toBe(true);
        expect(deepEqual(await _storage.getItem('nil', { dataType: 'object' }), {})).toBe(true);
    });

    it('check FsStorage#getItem() w/ cancel', async () => {
        try {
            await _storage.getItem('num', { cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
    });

    it('check FsStorage#setItem() w/ callback', async () => {
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

    it('check FsStorage#setItem(silent) w/ callback', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        // on
        _storage.on(stub.onCallback);

        await _storage.setItem('num', 200, { silent: true });
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(await _storage.getItem<number>('num')).toBe(200);

        expect(_count).toBe(0);
    });

    it('check FsStorage#setItem() w/ cancel', async () => {
        try {
            await _storage.setItem('bool', true, { cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
        expect(await _storage.getItem<boolean>('bool')).toBe(false);
    });

    it('check FsStorage#removeItem() w/ options', async () => {
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

    it('check FsStorage#clear() w/ callback', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        // on
        _storage.on(stub.onCallback);

        await _storage.clear();
        expect(stub.onCallback).toHaveBeenCalledWith(null, null, null);
        expect((await _storage.keys()).length).toBe(0);
    });

    it('check FsStorage#clear() w/ options', async () => {
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

    it('check FsStorage features', async () => {
        const storage = new FsStorage(location);
        expect(await storage.getItem('str')).toBe('hoge' as any);
        expect(await storage.getItem('num')).toBe(100 as any);
        expect(await storage.getItem('bool')).toBe(false as any);
        expect(await storage.getItem('obj')).toEqual({ hoge: 'fuga' } as any);
        expect(await storage.getItem('nil')).toBe(null as any);

        storage.destroy();
        expect(existsSync(location)).toBe(false);
    });

    it('check FsStorage format', async () => {
        await _storage.setItem('str', 'new', { jsonSpace: 4 });
        const json = readFileSync(location).toString();
        expect(json).toBe(`{
    "str": "new",
    "num": 100,
    "bool": false,
    "obj": {
        "hoge": "fuga"
    },
    "nil": "null"
}
`);
    });
});
