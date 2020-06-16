/* eslint-disable
    @typescript-eslint/ban-types
 */

import { SyncEvent, dataSyncNULL } from '@cdp/data-sync';
import { EventBroker } from '@cdp/events';
import { CancelToken } from '@cdp/promise';

describe('data-sync/null spec', () => {
    const cancelSource = CancelToken.source();
    const { token } = cancelSource;
    cancelSource.cancel(new Error('aborted'));

    class Context extends EventBroker<SyncEvent<{}>> {
        toJSON(): {} {
            return {};
        }
    }

    const _context = new Context();

    let count: number;

    beforeEach(() => {
        count = 0;
        _context.off();
    });

    // eslint-disable-next-line
    const onCallback = (...args: any[]): void => {
        count++;
    };

    it('check instance', () => {
        expect(dataSyncNULL).toBeDefined();
    });

    it('check read', async done => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        _context.on('@request', stub.onCallback);

        const response = dataSyncNULL.sync('read', _context);
        expect(await response).toEqual({});
        expect(stub.onCallback).toHaveBeenCalledWith(_context, jasmine.any(Promise));
        expect(count).toBe(1);

        done();
    });

    it('check create', async done => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        _context.on('@request', stub.onCallback);

        const response = dataSyncNULL.sync('create', _context);
        expect(await response).toBeUndefined();
        expect(stub.onCallback).toHaveBeenCalledWith(_context, jasmine.any(Promise));
        expect(count).toBe(1);

        done();
    });

    it('check update', async done => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        _context.on('@request', stub.onCallback);

        const response = dataSyncNULL.sync('update', _context);
        expect(await response).toBeUndefined();
        expect(stub.onCallback).toHaveBeenCalledWith(_context, jasmine.any(Promise));
        expect(count).toBe(1);

        done();
    });

    it('check patch', async done => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        _context.on('@request', stub.onCallback);

        const response = dataSyncNULL.sync('patch', _context);
        expect(await response).toBeUndefined();
        expect(stub.onCallback).toHaveBeenCalledWith(_context, jasmine.any(Promise));
        expect(count).toBe(1);

        done();
    });

    it('check delete', async done => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        _context.on('@request', stub.onCallback);

        const response = dataSyncNULL.sync('delete', _context);
        expect(await response).toBeUndefined();
        expect(stub.onCallback).toHaveBeenCalledWith(_context, jasmine.any(Promise));
        expect(count).toBe(1);

        done();
    });

    it('check read w/ cancel', async done => {
        try {
            await dataSyncNULL.sync('read', _context, { cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
        done();
    });
});
