/* eslint-disable no-new-wrappers, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs-extra';
import { deepEqual } from '@cdp/core-utils';
import { CancelToken, extendPromise } from '@cdp/promise';
import { IStorage } from '@cdp/core-storage';
import { FsStorage } from '@cdp/fs-storage';

describe('storage/attributes spec', () => {
    /*
     * [jasmine-node] 特別対応
     * - jasmine-node は Native ではなく 独自で Promise オブジェクトの構築を行っているため,
     *   CancelablePromise を再度有効化する必要がある
     */
    extendPromise(true);

    const location = resolve(process.cwd(), '.temp/test-storage.json');

    const cancelSource = CancelToken.source();
    const { token } = cancelSource;
    cancelSource.cancel(new Error('aborted'));

    let _storage!: IStorage;
    let _count: number;

    const onCallback = (key: string | null, newVal?: any, oldVal?: any): void => {
        _count++;
    };

    beforeEach(async done => {
        _storage = new FsStorage(location);
        await _storage.setItem('str', 'hoge');
        await _storage.setItem('num', 100);
        await _storage.setItem('bool', false);
        await _storage.setItem('obj', { hoge: 'fuga' });
        await _storage.setItem('nil', null);
        _count = 0;
        done();
    });

    afterEach(() => {
        (_storage as FsStorage).destroy();
    });

    it('check FsStorage#kind()', () => {
        expect(_storage.kind).toBe('node-fs');
    });

    it('check FsStorage#keys()', async done => {
        const keys = await _storage.keys();
        expect(keys.length).toBe(5);
        expect(keys.includes('str')).toBe(true);
        expect(keys.includes('num')).toBe(true);
        expect(keys.includes('bool')).toBe(true);
        expect(keys.includes('obj')).toBe(true);
        expect(keys.includes('nil')).toBe(true);
        done();
    });

    it('check FsStorage#keys() /w cancel', async done => {
        try {
            await _storage.keys({ cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
        done();
    });

    it('check FsStorage#getItem()', async done => {
        expect(await _storage.getItem('str')).toBe('hoge' as any);
        expect(await _storage.getItem('num')).toBe(100 as any);
        expect(await _storage.getItem('bool')).toBe(false as any);
        expect(await _storage.getItem('obj')).toEqual({ hoge: 'fuga' } as any);
        expect(await _storage.getItem('nil')).toBe(null as any);
        done();
    });

    it('check FsStorage#getItem<cast>()', async done => {
        // check
        expect(await _storage.getItem<string>('str')).toBe('hoge');
        expect(await _storage.getItem<number>('num')).toBe(100);
        expect(await _storage.getItem<boolean>('bool')).toBe(false);
        expect(await _storage.getItem<object>('obj')).toEqual({ hoge: 'fuga' });
        done();
    });

    it('check FsStorage#getItem() /w dataType', async done => {
        expect(await _storage.getItem('str', { dataType: 'string' })).toBe('hoge');
        expect(await _storage.getItem('num', { dataType: 'number' })).toBe(100);
        expect(await _storage.getItem('bool', { dataType: 'boolean' })).toBe(false);
        expect(await _storage.getItem('obj', { dataType: 'object' })).toEqual({ hoge: 'fuga' });
        expect(await _storage.getItem('nil', { dataType: 'string' })).toBe('null');
        //      expect(await _storage.getItem<number>('str', { dataType: 'string' })).toBe('hoge'); // compile error "cast" と "dataType" は同時使用不可
        done();
    });

    it('check FsStorage#getItem() /w dataType convert string', async done => {
        expect(await _storage.getItem('str', { dataType: 'string' })).toBe('hoge');
        expect(await _storage.getItem('num', { dataType: 'string' })).toBe('100');
        expect(await _storage.getItem('bool', { dataType: 'string' })).toBe('false');
        expect(await _storage.getItem('obj', { dataType: 'string' })).toBe('{"hoge":"fuga"}');
        expect(await _storage.getItem('nil', { dataType: 'string' })).toBe('null');
        done();
    });

    it('check FsStorage#getItem() /w dataType convert number', async done => {
        expect(await _storage.getItem('str', { dataType: 'number' })).toBeNaN();
        expect(await _storage.getItem('num', { dataType: 'number' })).toBe(100);
        expect(await _storage.getItem('bool', { dataType: 'number' })).toBe(0);
        expect(await _storage.getItem('obj', { dataType: 'number' })).toBeNaN();
        expect(await _storage.getItem('nil', { dataType: 'number' })).toBe(0);
        done();
    });

    it('check FsStorage#getItem() /w dataType convert boolean', async done => {
        expect(await _storage.getItem('str', { dataType: 'boolean' })).toBe(true);
        expect(await _storage.getItem('num', { dataType: 'boolean' })).toBe(true);
        expect(await _storage.getItem('bool', { dataType: 'boolean' })).toBe(false);
        expect(await _storage.getItem('obj', { dataType: 'boolean' })).toBe(true);
        expect(await _storage.getItem('nil', { dataType: 'boolean' })).toBe(false);
        done();
    });

    it('check FsStorage#getItem() /w dataType convert object', async done => {
        expect(deepEqual(await _storage.getItem('str', { dataType: 'object' }), new String('hoge'))).toBe(true);
        expect(deepEqual(await _storage.getItem('num', { dataType: 'object' }), new Number(100))).toBe(true);
        expect(deepEqual(await _storage.getItem('bool', { dataType: 'object' }), new Boolean(false))).toBe(true);
        expect(deepEqual(await _storage.getItem('obj', { dataType: 'object' }), { hoge: 'fuga' })).toBe(true);
        expect(deepEqual(await _storage.getItem('nil', { dataType: 'object' }), {})).toBe(true);
        done();
    });

    it('check FsStorage#getItem() /w cancel', async done => {
        try {
            await _storage.getItem('num', { cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
        done();
    });

    it('check FsStorage#setItem() /w callback', async done => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').andCallThrough();

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

    it('check FsStorage#setItem(silent) /w callback', async done => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').andCallThrough();

        // on
        _storage.on(stub.onCallback);

        await _storage.setItem('num', 200, { silent: true });
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(await _storage.getItem<number>('num')).toBe(200);

        expect(_count).toBe(0);
        done();
    });

    it('check FsStorage#setItem() /w cancel', async done => {
        try {
            await _storage.setItem('bool', true, { cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
        expect(await _storage.getItem<boolean>('bool')).toBe(false);
        done();
    });

    it('check FsStorage#removeItem() /w options', async done => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').andCallThrough();

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

        done();
    });

    it('check FsStorage#clear() /w callback', async done => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').andCallThrough();

        // on
        _storage.on(stub.onCallback);

        await _storage.clear();
        expect(stub.onCallback).toHaveBeenCalledWith(null, null, null);
        expect((await _storage.keys()).length).toBe(0);

        done();
    });

    it('check FsStorage#clear() /w options', async done => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').andCallThrough();

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

    it('check FsStorage features', async done => {
        const storage = new FsStorage(location);
        expect(await storage.getItem('str')).toBe('hoge' as any);
        expect(await storage.getItem('num')).toBe(100 as any);
        expect(await storage.getItem('bool')).toBe(false as any);
        expect(await storage.getItem('obj')).toEqual({ hoge: 'fuga' } as any);
        expect(await storage.getItem('nil')).toBe(null as any);

        storage.destroy();
        expect(existsSync(location)).toBe(false);

        done();
    });

    it('check FsStorage format', async done => {
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

        done();
    });
});
