/* eslint-disable
    @typescript-eslint/no-explicit-any
 */

import {
    SyncEvent,
    IStorageDataSync,
    createStorageDataSync,
    dataSyncSTORAGE,
} from '@cdp/data-sync';
import { EventBroker } from '@cdp/events';
import { CancelToken } from '@cdp/promise';
import { RESULT_CODE, toResult } from '@cdp/result';
import { memoryStorage } from '@cdp/core-storage';

describe('data-sync/storage spec', () => {
    const cancelSource = CancelToken.source();
    const { token } = cancelSource;
    cancelSource.cancel(new Error('aborted'));

    interface Schema {
        id: string;
        num: number;
        str: string;
        bool: boolean;
    }

    class TestA extends EventBroker<SyncEvent<Schema>> {
        toJSON(): Schema {
            return {
                id: '000A',
                num: 1000,
                str: 'hogehoge',
                bool: true,
            };
        }
        get url(): string {
            return 'aaa';
        }
    }

    class TestB extends EventBroker<SyncEvent<Schema>> {
        static idAttribute = 'id';
        toJSON(): Schema {
            return {
                id: '000A',
                num: 1000,
                str: 'hogehoge',
                bool: true,
            };
        }
        get id(): string {
            return '000A';
        }
        get url(): string {
            return 'aaa';
        }
    }

    class TestC extends EventBroker<SyncEvent<Schema>> {
        toJSON(): Schema {
            return {
                id: '000C',
                num: 3000,
                str: 'foobar',
                bool: true,
            };
        }
    }

    let count: number;

    beforeEach(() => {
        localStorage.clear();
        count = 0;
    });

    // eslint-disable-next-line
    const onCallback = (...args: any[]): void => {
        count++;
    };

    it('check instance', () => {
        expect(dataSyncSTORAGE).toBeDefined();
    });

    it('check createStorageDataSync', () => {
        const dataSyncStorage2 = createStorageDataSync(memoryStorage);
        expect(dataSyncStorage2).not.toBe(dataSyncSTORAGE);
    });

    it('check setStorage', () => {
        const storageSync = (dataSyncSTORAGE as IStorageDataSync); // eslint-disable-line
        const defaultStorage = storageSync.getStorage();
        storageSync.setStorage(memoryStorage);
        expect(storageSync.getStorage()).toBe(memoryStorage);
        storageSync.setStorage(defaultStorage);
    });

    it('check create', async done => {
        const context = new TestA();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        await dataSyncSTORAGE.sync('create', context);
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        const storage = (dataSyncSTORAGE as IStorageDataSync).getStorage(); // eslint-disable-line
        const json = await storage.getItem<object>('aaa');
        expect(json).toEqual({
            id: '000A',
            num: 1000,
            str: 'hogehoge',
            bool: true,
        });

        await storage.clear();

        done();
    });

    it('check create w/ data', async done => {
        const context = new TestA();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        await dataSyncSTORAGE.sync('create', context, { data: { str: 'fugafuga' } });
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        const storage = (dataSyncSTORAGE as IStorageDataSync).getStorage(); // eslint-disable-line
        const json = await storage.getItem<object>('aaa');
        expect(json).toEqual({
            id: '000A',
            num: 1000,
            str: 'fugafuga',
            bool: true,
        });

        await storage.clear();

        done();
    });

    it('check patch', async done => {
        const context = new TestB();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        localStorage.setItem('aaa-000A', JSON.stringify({
            id: '000A',
            num: 1000,
            str: 'fugafuga',
            bool: true,
        }));

        await dataSyncSTORAGE.sync('patch', context);
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        const value = JSON.parse(localStorage.getItem('aaa-000A') as string);
        expect(value).toEqual({
            id: '000A',
            num: 1000,
            str: 'hogehoge',
            bool: true,
        });

        localStorage.clear();

        done();
    });

    it('check patch w/ non-model', async done => {
        const context = new TestA();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        localStorage.setItem('aaa', JSON.stringify({
            id: '000A',
            num: 1000,
            str: 'fugafuga',
            bool: true,
        }));

        await dataSyncSTORAGE.sync('patch', context);
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        const value = JSON.parse(localStorage.getItem('aaa') as string);
        expect(value).toEqual({
            id: '000A',
            num: 1000,
            str: 'hogehoge',
            bool: true,
        });

        localStorage.clear();

        done();
    });

    it('check patch w/ other collection reserved', async done => {
        const context = new TestB();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        localStorage.setItem('aaa-000A', JSON.stringify({
            id: '000A',
            num: 1000,
            str: 'fugafuga',
            bool: true,
        }));

        localStorage.setItem('aaa', JSON.stringify([{ id: '000A' }]));

        await dataSyncSTORAGE.sync('patch', context);
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        const value = JSON.parse(localStorage.getItem('aaa-000A') as string);
        expect(value).toEqual({
            id: '000A',
            num: 1000,
            str: 'hogehoge',
            bool: true,
        });

        const value2 = JSON.parse(localStorage.getItem('aaa') as string);
        expect(value2).toEqual([{ id: '000A' }]);

        localStorage.clear();

        done();
    });

    it('check read', async done => {
        const context = new TestA();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        localStorage.setItem('aaa', JSON.stringify({
            id: '000A',
            num: 1000,
            str: 'hogehoge',
            bool: true,
        }));

        const response = await dataSyncSTORAGE.sync('read', context);
        expect(response).toEqual({
            id: '000A',
            num: 1000,
            str: 'hogehoge',
            bool: true,
        });
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        localStorage.clear();

        done();
    });

    it('check read as collection', async done => {
        const context = new TestA();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        localStorage.setItem('aaa-000A', JSON.stringify({
            id: '000A',
            num: 1000,
            str: 'hogehoge',
            bool: true,
        }));
        localStorage.setItem('aaa', JSON.stringify(['000A']));

        const response = await dataSyncSTORAGE.sync('read', context);
        expect(response).toEqual([{
            id: '000A',
            num: 1000,
            str: 'hogehoge',
            bool: true,
        }]);
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        localStorage.clear();

        done();
    });

    it('check read as collection w/ custom data', async done => {
        const context = new TestA();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        localStorage.setItem('aaa', JSON.stringify([{ id: '000A' }]));

        const response = await dataSyncSTORAGE.sync('read', context);
        expect(response).toEqual([{ id: '000A' }]);
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        localStorage.clear();

        done();
    });

    it('check read w/ error', async done => {
        const context = new TestB();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        context.on('@request', stub.onCallback);

        try {
            await dataSyncSTORAGE.sync('read', context);
        } catch (e) {
            const err = toResult(e);
            expect(err.code).toBe(RESULT_CODE.ERROR_MVC_INVALID_SYNC_STORAGE_DATA_NOT_FOUND);
        }

        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(count).toBe(0);

        localStorage.clear();

        done();
    });

    it('check delete', async done => {
        const context = new TestB();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        localStorage.setItem('aaa-000A', JSON.stringify({
            id: '000A',
            num: 1000,
            str: 'hogehoge',
            bool: true,
        }));
        localStorage.setItem('aaa', JSON.stringify(['000A']));

        await dataSyncSTORAGE.sync('delete', context);

        try {
            await dataSyncSTORAGE.sync('read', context);
        } catch (e) {
            const err = toResult(e);
            expect(err.code).toBe(RESULT_CODE.ERROR_MVC_INVALID_SYNC_STORAGE_DATA_NOT_FOUND);
        }

        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        const value = JSON.parse(localStorage.getItem('aaa') as string);
        expect(value).toEqual([]);

        localStorage.clear();

        done();
    });

    it('check delete w/ non-model', async done => {
        const context = new TestA();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        localStorage.setItem('aaa', JSON.stringify({
            id: '000A',
            num: 1000,
            str: 'hogehoge',
            bool: true,
        }));

        await dataSyncSTORAGE.sync('delete', context);
        const response = await dataSyncSTORAGE.sync('read', context);
        expect(response).toEqual([]); // !!注意!! TestA idAttribute が無いため, 空状態の読み込みは collection と判定
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(2);

        localStorage.clear();

        done();
    });

    it('check delete w/ other collection reserved', async done => {
        const context = new TestB();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        localStorage.setItem('aaa-000A', JSON.stringify({
            id: '000A',
            num: 1000,
            str: 'hogehoge',
            bool: true,
        }));
        localStorage.setItem('aaa', JSON.stringify([{ id: '000A' }]));

        await dataSyncSTORAGE.sync('delete', context);

        try {
            await dataSyncSTORAGE.sync('read', context);
        } catch (e) {
            const err = toResult(e);
            expect(err.code).toBe(RESULT_CODE.ERROR_MVC_INVALID_SYNC_STORAGE_DATA_NOT_FOUND);
        }

        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        const value = JSON.parse(localStorage.getItem('aaa') as string);
        expect(value).toEqual([{ id: '000A' }]);

        localStorage.clear();

        done();
    });

    it('check read w/ cancel', async done => {
        const context = new TestA();
        try {
            localStorage.setItem('aaa', JSON.stringify({
                id: '000A',
                num: 1000,
                str: 'hogehoge',
                bool: true,
            }));
            await dataSyncSTORAGE.sync('read', context, { cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }

        localStorage.clear();

        done();
    });

    it('check read invalid url', async done => {
        const context = new TestC();
        try {
            await dataSyncSTORAGE.sync('read', context);
        } catch (e) {
            expect(e.message).toBe('A "url" property or function must be specified.');
        }
        done();
    });

    it('check invalid operation', async done => {
        const context = new TestA();
        try {
            await dataSyncSTORAGE.sync('invalid' as any, context);
        } catch (e) {
            expect(e.message).toBe('unknown method: invalid');
        }
        done();
    });
});
