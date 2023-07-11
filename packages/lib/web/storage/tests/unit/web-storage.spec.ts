/* eslint-disable
    no-new-wrappers,
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/no-unused-vars,
 */

import { deepEqual } from '@cdp/core-utils';
import { CancelToken } from '@cdp/promise';
import {
    base64ToBlob,
    base64ToBuffer,
    base64ToBinary,
    blobToBase64,
} from '@cdp/binary';
import { WebStorage, webStorage } from '@cdp/web-storage';

describe('storage/attributes spec', () => {
    const cancelSource = CancelToken.source();
    const { token } = cancelSource;
    cancelSource.cancel(new Error('aborted'));

    let _storage!: WebStorage;
    let _count: number;

    const onCallback = (key: string | null, newVal?: any, oldVal?: any): void => {
        _count++;
    };

    beforeEach(async () => {
        localStorage.clear();
        _storage = webStorage;
        _storage.off();
        await _storage.setItem('str', 'hoge');
        await _storage.setItem('num', 100);
        await _storage.setItem('bool', false);
        await _storage.setItem('obj', { hoge: 'fuga' });
        await _storage.setItem('nil', null);
        _count = 0;
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('check WebStorage#kind()', () => {
        expect(_storage.kind).toBe('web:local-storage');
    });

    it('check WebStorage#keys()', async () => {
        const keys = await _storage.keys();
        expect(keys.length).toBe(5);
        expect(keys.includes('str')).toBe(true);
        expect(keys.includes('num')).toBe(true);
        expect(keys.includes('bool')).toBe(true);
        expect(keys.includes('obj')).toBe(true);
        expect(keys.includes('nil')).toBe(true);
    });

    it('check WebStorage#keys() w/ cancel', async () => {
        try {
            await _storage.keys({ cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
    });

    it('check WebStorage#getItem()', async () => {
        expect(await _storage.getItem('str')).toBe('hoge');
        expect(await _storage.getItem('num')).toBe(100);
        expect(await _storage.getItem('bool')).toBe(false);
        expect(await _storage.getItem('obj')).toEqual({ hoge: 'fuga' });
        expect(await _storage.getItem('nil')).toBe(null);
    });

    it('check WebStorage#getItem<cast>()', async () => {
        expect(await _storage.getItem<string>('str')).toBe('hoge');
        expect(await _storage.getItem<number>('num')).toBe(100);
        expect(await _storage.getItem<boolean>('bool')).toBe(false);
        expect(await _storage.getItem<object>('obj')).toEqual({ hoge: 'fuga' });
    });

    it('check WebStorage#getItem() w/ dataType', async () => {
        expect(await _storage.getItem('str', { dataType: 'string' })).toBe('hoge');
        expect(await _storage.getItem('num', { dataType: 'number' })).toBe(100);
        expect(await _storage.getItem('bool', { dataType: 'boolean' })).toBe(false);
        expect(await _storage.getItem('obj', { dataType: 'object' })).toEqual({ hoge: 'fuga' });
        expect(await _storage.getItem('nil', { dataType: 'string' })).toBe('null');
//      expect(await _storage.getItem<number>('str', { dataType: 'string' })).toBe('hoge'); // compile error "cast" と "dataType" は同時使用不可
    });

    it('check WebStorage#getItem() w/ dataType convert string', async () => {
        expect(await _storage.getItem('str', { dataType: 'string' })).toBe('hoge');
        expect(await _storage.getItem('num', { dataType: 'string' })).toBe('100');
        expect(await _storage.getItem('bool', { dataType: 'string' })).toBe('false');
        expect(await _storage.getItem('obj', { dataType: 'string' })).toBe('{"hoge":"fuga"}');
        expect(await _storage.getItem('nil', { dataType: 'string' })).toBe('null');
    });

    it('check WebStorage#getItem() w/ dataType convert number', async () => {
        expect(await _storage.getItem('str', { dataType: 'number' })).toBeNaN();
        expect(await _storage.getItem('num', { dataType: 'number' })).toBe(100);
        expect(await _storage.getItem('bool', { dataType: 'number' })).toBe(0);
        expect(await _storage.getItem('obj', { dataType: 'number' })).toBeNaN();
        expect(await _storage.getItem('nil', { dataType: 'number' })).toBe(0);
    });

    it('check WebStorage#getItem() w/ dataType convert boolean', async () => {
        expect(await _storage.getItem('str', { dataType: 'boolean' })).toBe(true);
        expect(await _storage.getItem('num', { dataType: 'boolean' })).toBe(true);
        expect(await _storage.getItem('bool', { dataType: 'boolean' })).toBe(false);
        expect(await _storage.getItem('obj', { dataType: 'boolean' })).toBe(true);
        expect(await _storage.getItem('nil', { dataType: 'boolean' })).toBe(false);
    });

    it('check WebStorage#getItem() w/ dataType convert object', async () => {
        expect(await _storage.getItem('str', { dataType: 'object' })).toEqual(new String('hoge'));
        expect(await _storage.getItem('num', { dataType: 'object' })).toEqual(new Number(100));
        expect(await _storage.getItem('bool', { dataType: 'object' })).toEqual(new Boolean(false));
        expect(await _storage.getItem('obj', { dataType: 'object' })).toEqual({ hoge: 'fuga' });
        expect(await _storage.getItem('nil', { dataType: 'object' })).toEqual({});
    });

    it('check WebStorage#getItem() w/ cancel', async () => {
        try {
            await _storage.getItem('num', { cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
    });

    it('check WebStorage#setItem() w/ callback', async () => {
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

    it('check WebStorage#setItem(silent) w/ callback', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        // on
        _storage.on(stub.onCallback);

        await _storage.setItem('num', 200, { silent: true });
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(await _storage.getItem<number>('num')).toBe(200);

        expect(_count).toBe(0);
    });

    it('check WebStorage#setItem() w/ cancel', async () => {
        try {
            await _storage.setItem('bool', true, { cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
        expect(await _storage.getItem<boolean>('bool')).toBe(false);
    });

    it('check WebStorage#removeItem() w/ options', async () => {
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

    it('check WebStorage#clear() w/ callback', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        // on
        _storage.on(stub.onCallback);

        await _storage.clear();
        expect(stub.onCallback).toHaveBeenCalledWith(null, null, null);
        expect((await _storage.keys()).length).toBe(0);
    });

    it('check WebStorage#clear() w/ options', async () => {
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

    it('check WebStorage#kind() w/ sessionStorage', () => {
        const storage = new WebStorage(sessionStorage);
        expect(storage.kind).toBe('web:session-storage');
    });

    it('check binary support', async () => {
        const base64 = 'YmluYXJ5L2NvbnZlcnRlciDjg4bjgrnjg4g=';
        const binary = base64ToBlob(base64);

        await _storage.setItem('bin', binary);

        // 内部では data-URL で保存される
        expect(await _storage.getItem('bin')).toBe(`data:application/octet-stream;base64,${base64}`);

        // 変換して取り出す
        const blob = await _storage.getItem('bin', { dataType: 'blob' });
        expect(await blobToBase64(blob!)).toBe(base64);
        const buff = await _storage.getItem('bin', { dataType: 'buffer' });
        expect(deepEqual(buff, base64ToBuffer(base64))).toBe(true);
        const bin = await _storage.getItem('bin', { dataType: 'binary' });
        expect(deepEqual(bin, base64ToBinary(base64))).toBe(true);

        // cast は非サポート (never を返却). compile は通るので注意
        const noBlob = await _storage.getItem<Blob>('bin');
        expect(noBlob).toBe(`data:application/octet-stream;base64,${base64}`);
        const noBuff = await _storage.getItem<ArrayBuffer>('bin');
        expect(noBuff).toBe(`data:application/octet-stream;base64,${base64}`);
        const noBin = await _storage.getItem<Uint8Array>('bin');
        expect(noBin).toBe(`data:application/octet-stream;base64,${base64}`);

        // 非 binary に対する変換はエラー
        await expectAsync(_storage.getItem('str', { dataType: 'blob' })).toBeRejectedWith(new Error('Invalid data-URL: hoge'));
        await expectAsync(_storage.getItem('num', { dataType: 'blob' })).toBeRejectedWith(new Error('Invalid data-URL: 100'));
        await expectAsync(_storage.getItem('bool', { dataType: 'blob' })).toBeRejectedWith(new Error('Invalid data-URL: false'));
        await expectAsync(_storage.getItem('obj', { dataType: 'blob' })).toBeRejectedWith(new Error('Invalid data-URL: {"hoge":"fuga"}'));
        await expectAsync(_storage.getItem('nil', { dataType: 'blob' })).toBeRejectedWith(new Error('Invalid data-URL: null'));
    });
});
