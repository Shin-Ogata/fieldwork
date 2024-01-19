import { Deferred, CancelToken, /*checkStatus*/ } from '@cdp/promise';
// import { post, noop } from '@cdp/core-utils';

describe('promise/deferred spec', () => {
    it('check instance', () => {
        const df = new Deferred();
        expect(df).toBeDefined();
        expect(df.resolve).toBeDefined();
        expect(df.reject).toBeDefined();
    });

    it('check toStringTag', () => {
        expect(Deferred.prototype[Symbol.toStringTag]).toBe('Deferred');
    });

    it('check Deferred#resolve', async () => {
        const df = new Deferred<number>();
        df.resolve(100);
        const result = await df;
        expect(result).toBe(100);
    });

    it('check Deferred#reject', async () => {
        try {
            const df = new Deferred();
            df.reject('rejected');
            await df;
            fail('UNEXPECTED FLOW');
        } catch (e) {
            expect(e).toBe('rejected');
        }
    });

    it('check cancelToken', async () => {
        try {
            const { cancel, token } = CancelToken.source(); // eslint-disable-line @typescript-eslint/unbound-method
            cancel(new Error('cancel'));
            const df = new Deferred(token);
            await df;
            fail('UNEXPECTED FLOW');
        } catch (e) {
            expect(e.message).toBe('cancel');
        }
    });

    it('check status', async () => {
        const df = new Deferred();
        df.resolve();
        const status = await df.status();
        expect(status).toBe('fulfilled');
    });
});
