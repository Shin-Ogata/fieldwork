import { type SyncEvent, dataSyncNULL } from '@cdp/data-sync';
import { EventBroker } from '@cdp/events';
import { CancelToken } from '@cdp/promise';

describe('data-sync/null spec', () => {
    const cancelSource = CancelToken.source();
    const { token } = cancelSource;
    cancelSource.cancel(new Error('aborted'));

    class Context extends EventBroker<SyncEvent<object>> {
        toJSON(): object {
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

    it('check read', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        _context.on('@request', stub.onCallback);

        const response = dataSyncNULL.sync('read', _context);
        expect(await response).toEqual({});
        expect(stub.onCallback).toHaveBeenCalledWith(_context, jasmine.any(Promise));
        expect(count).toBe(1);
    });

    it('check create', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        _context.on('@request', stub.onCallback);

        const response = dataSyncNULL.sync('create', _context);
        expect(await response).toBeUndefined();
        expect(stub.onCallback).toHaveBeenCalledWith(_context, jasmine.any(Promise));
        expect(count).toBe(1);
    });

    it('check update', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        _context.on('@request', stub.onCallback);

        const response = dataSyncNULL.sync('update', _context);
        expect(await response).toBeUndefined();
        expect(stub.onCallback).toHaveBeenCalledWith(_context, jasmine.any(Promise));
        expect(count).toBe(1);
    });

    it('check patch', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        _context.on('@request', stub.onCallback);

        const response = dataSyncNULL.sync('patch', _context);
        expect(await response).toBeUndefined();
        expect(stub.onCallback).toHaveBeenCalledWith(_context, jasmine.any(Promise));
        expect(count).toBe(1);
    });

    it('check delete', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        _context.on('@request', stub.onCallback);

        const response = dataSyncNULL.sync('delete', _context);
        expect(await response).toBeUndefined();
        expect(stub.onCallback).toHaveBeenCalledWith(_context, jasmine.any(Promise));
        expect(count).toBe(1);
    });

    it('check read w/ cancel', async () => {
        try {
            await dataSyncNULL.sync('read', _context, { cancel: token });
        } catch (e) {
            expect(e.message).toBe('aborted');
        }
    });
});
