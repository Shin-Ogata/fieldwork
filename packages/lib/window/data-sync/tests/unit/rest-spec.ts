import {
    SyncEvent,
    RestDataSyncOptions,
    dataSyncREST,
} from '@cdp/data-sync';
import { EventBroker } from '@cdp/events';
import { CancelToken } from '@cdp/promise';

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
            return '/api';
        }
    }

    class TestB extends EventBroker<SyncEvent<Schema>> {
        toJSON(): Schema {
            return {
                id: '000B',
                num: 2000,
                str: 'fugafuga',
                bool: false,
            };
        }
        url(): string {
            return '/api';
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
        count = 0;
    });

    // eslint-disable-next-line
    const onCallback = (...args: any[]): void => {
        count++;
    };

    it('check instance', () => {
        expect(dataSyncREST).toBeDefined();
    });

    it('check read /w url property', async done => {
        const context = new TestA();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        const response = await dataSyncREST.sync('read', context);
        expect(response).toEqual({ id: '0001', num: 100, str: 'string', bool: true });
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        done();
    });

    it('check read /w url function', async done => {
        const context = new TestB();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        const response = await dataSyncREST.sync('read', context);
        expect(response).toEqual({ id: '0001', num: 100, str: 'string', bool: true });
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        done();
    });

    it('check create', async done => {
        const context = new TestA();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        const response = await dataSyncREST.sync('create', context);
        expect(response).toEqual({
            API: 'POST',
            data: {
                id: '000A',
                num: '1000',
                str: 'hogehoge',
                bool: 'true',
            }
        });
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        done();
    });

    it('check update', async done => {
        const context = new TestB();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        const response = await dataSyncREST.sync('update', context);
        expect(response).toEqual({
            API: 'PUT',
            data: {
                id: '000B',
                num: '2000',
                str: 'fugafuga',
                bool: 'false',
            }
        });
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        done();
    });

    it('check patch', async done => {
        const context = new TestC();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        const options: RestDataSyncOptions = {
            url: '/api',
            data: {
                id: 'CCCC',
                num: 3333,
                str: 'fffff',
                bool: true,
            },
        };
        const response = await dataSyncREST.sync('patch', context, options);
        expect(response).toEqual({
            API: 'PATCH',
            data: {
                id: 'CCCC',
                num: '3333',
                str: 'fffff',
                bool: 'true',
            }
        });
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        done();
    });

    it('check delete', async done => {
        const context = new TestA();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        context.on('@request', stub.onCallback);

        const response = await dataSyncREST.sync('delete', context);
        expect(response).toEqual({
            API: 'DELETE',
            data: {}
        });
        expect(stub.onCallback).toHaveBeenCalledWith(context, jasmine.anything());
        expect(count).toBe(1);

        done();
    });

    it('check read /w cancel', async done => {
        const context = new TestA();
        try {
            await dataSyncREST.sync('read', context, { cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
        done();
    });

    it('check read invalid url', async done => {
        const context = new TestC();
        try {
            await dataSyncREST.sync('read', context);
        } catch (e) {
            expect(e.message).toBe('A "url" property or function must be specified.');
        }
        done();
    });
});
