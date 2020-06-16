/* eslint-disable
    @typescript-eslint/no-explicit-any
 ,  @typescript-eslint/ban-types
 */

import {
    SyncEvent,
    IStorageDataSync,
    dataSyncSTORAGE,
} from '@cdp/data-sync';
import { EventBroker } from '@cdp/events';
import { CancelToken } from '@cdp/promise';
import { memoryStorage } from '@cdp/core-storage';

describe('data-sync/rest spec', () => {
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

    it('check delete', async done => {
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
        expect(response).toBeNull();
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(2);

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
