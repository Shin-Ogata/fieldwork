/* eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/restrict-template-expressions,
 */

import {
    SyncEvent,
    IStorageDataSync,
    createStorageDataSync,
    dataSyncSTORAGE,
} from '@cdp/data-sync';
import { PlainObject } from '@cdp/core-utils';
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

    type StorageDataSchema = { id: string; num: number; str: string; bool: boolean; };

    class Model extends EventBroker<SyncEvent<Schema>> {
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
        has(attr: string): boolean {
            return 'id' === attr;
        }
    }

    class Collection extends EventBroker<SyncEvent<Schema>> {
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

    class ModelLackId extends EventBroker<SyncEvent<Schema>> {
        static idAttribute = 'id';
        toJSON(): Partial<Schema> {
            return {
                num: 1000,
                str: 'hogehoge',
                bool: true,
            };
        }
        get id(): string {
            return 'cid';
        }
        get url(): string {
            return 'aaa';
        }
        has(): boolean {
            return false;
        }
    }

    class ModelLackHas extends EventBroker<SyncEvent<Schema>> {
        static idAttribute = 'id';
        toJSON(): Partial<Schema> {
            return {
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

    class LackURL extends EventBroker<SyncEvent<Schema>> {
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
        const storageSync = dataSyncSTORAGE as IStorageDataSync;
        const defaultStorage = storageSync.getStorage();
        storageSync.setStorage(memoryStorage);
        expect(storageSync.getStorage()).toBe(memoryStorage);
        storageSync.setStorage(defaultStorage);
    });

    it('check create', async () => {
        const context = new Model();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        await dataSyncSTORAGE.sync('create', context);
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        const storage = (dataSyncSTORAGE as IStorageDataSync).getStorage();
        const json = await storage.getItem<object>('aaa::000A');
        expect(json).toEqual({
            id: '000A',
            num: 1000,
            str: 'hogehoge',
            bool: true,
        });

        await storage.clear();
    });

    it('check create w/ data', async () => {
        const context = new Model();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        await dataSyncSTORAGE.sync('create', context, { data: { str: 'fugafuga' } });
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        const storage = (dataSyncSTORAGE as IStorageDataSync).getStorage();
        const json = await storage.getItem<object>('aaa::000A');
        expect(json).toEqual({
            id: '000A',
            num: 1000,
            str: 'fugafuga',
            bool: true,
        });

        await storage.clear();
    });

    it('check create w/ server id', async () => {
        const context = new ModelLackId();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        await dataSyncSTORAGE.sync('create', context);
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        const storage = (dataSyncSTORAGE as IStorageDataSync).getStorage();
        const entries = await storage.getItem<object>('aaa') as PlainObject;
        const json = await storage.getItem<object>(`aaa::${entries[0]}`) as StorageDataSchema;

        expect(json.id.startsWith('aaa:')).toBe(true);
        expect(json.num).toBe(1000);
        expect(json.str).toBe('hogehoge');
        expect(json.bool).toBe(true);

        await storage.clear();
    });

    it('check create w/ server id invalid Model', async () => {
        const context = new ModelLackHas();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        await dataSyncSTORAGE.sync('create', context);
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        const storage = (dataSyncSTORAGE as IStorageDataSync).getStorage();
        const entries = await storage.getItem<object>('aaa') as PlainObject;
        const json = await storage.getItem<object>(`aaa::${entries[0]}`) as StorageDataSchema;

        expect(json.id.startsWith('aaa:')).toBe(true);
        expect(json.num).toBe(1000);
        expect(json.str).toBe('hogehoge');
        expect(json.bool).toBe(true);

        await storage.clear();
    });

    it('check update w/ custom separator', async () => {
        const context = new Model();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        localStorage.setItem('aaa$$000A', JSON.stringify({
            id: '000A',
            num: 1000,
            str: 'fugafuga',
            bool: true,
        }));

        const orgSeparator = dataSyncSTORAGE.setIdSeparator('$$');
        expect(orgSeparator).toBe('::');

        await dataSyncSTORAGE.sync('update', context);
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        const value = JSON.parse(localStorage.getItem('aaa$$000A') as string);
        expect(value).toEqual({
            id: '000A',
            num: 1000,
            str: 'hogehoge',
            bool: true,
        });

        dataSyncSTORAGE.setIdSeparator(orgSeparator);

        localStorage.clear();
    });

    it('check patch', async () => {
        const context = new Model();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        localStorage.setItem('aaa::000A', JSON.stringify({
            id: '000A',
            num: 1000,
            str: 'fugafuga',
            bool: true,
        }));

        await dataSyncSTORAGE.sync('patch', context);
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        const value = JSON.parse(localStorage.getItem('aaa::000A') as string);
        expect(value).toEqual({
            id: '000A',
            num: 1000,
            str: 'hogehoge',
            bool: true,
        });

        localStorage.clear();
    });

    it('check patch w/ non-model', async () => {
        const context = new Collection();
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
    });

    it('check patch w/ other collection reserved', async () => {
        const context = new Model();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        localStorage.setItem('aaa::000A', JSON.stringify({
            id: '000A',
            num: 1000,
            str: 'fugafuga',
            bool: true,
        }));

        localStorage.setItem('aaa', JSON.stringify([{ id: '000A' }]));

        await dataSyncSTORAGE.sync('patch', context);
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        const value = JSON.parse(localStorage.getItem('aaa::000A') as string);
        expect(value).toEqual({
            id: '000A',
            num: 1000,
            str: 'hogehoge',
            bool: true,
        });

        const value2 = JSON.parse(localStorage.getItem('aaa') as string);
        expect(value2).toEqual([{ id: '000A' }]);

        localStorage.clear();
    });

    it('check read', async () => {
        const context = new Model();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        localStorage.setItem('aaa::000A', JSON.stringify({
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
    });

    it('check read as collection', async () => {
        const context = new Collection();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        localStorage.setItem('aaa::000A', JSON.stringify({
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
    });

    it('check read as collection w/ custom data', async () => {
        const context = new Collection();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        localStorage.setItem('aaa', JSON.stringify([{ id: '000A' }]));

        const response = await dataSyncSTORAGE.sync('read', context);
        expect(response).toEqual([{ id: '000A' }]);
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        localStorage.clear();
    });

    it('check read as collection w/ custom data simple case', async () => {
        const context = new Collection();
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
    });

    it('check read w/ error data not found', async () => {
        const context = new Model();
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
    });

    it('check delete', async () => {
        const context = new Model();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        localStorage.setItem('aaa::000A', JSON.stringify({
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
    });

    it('check delete w/ non-model', async () => {
        const context = new Collection();
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
    });

    it('check delete w/ other collection reserved', async () => {
        const context = new Model();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        localStorage.setItem('aaa::000A', JSON.stringify({
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
    });

    it('check read w/ cancel', async () => {
        const context = new Model();
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
    });

    it('check read w/ cancel as collection', async () => {
        const context = new Collection();
        try {
            localStorage.setItem('aaa', JSON.stringify([{ id: '000A' }]));
            await dataSyncSTORAGE.sync('read', context, { cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }

        localStorage.clear();
    });

    it('check read invalid url', async () => {
        const context = new LackURL();
        try {
            await dataSyncSTORAGE.sync('read', context);
        } catch (e) {
            expect(e.message).toBe('A "url" property or function must be specified.');
        }
    });

    it('check invalid operation', async () => {
        const context = new Model();
        try {
            await dataSyncSTORAGE.sync('invalid' as any, context);
        } catch (e) {
            expect(e.message).toBe('unknown method: invalid');
        }
    });
});
