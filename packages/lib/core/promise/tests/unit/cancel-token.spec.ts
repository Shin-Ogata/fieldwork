import { noop, post } from '@cdp/core-utils';
import { CancelToken, Deferred } from '@cdp/promise';

describe('promise/cancel-token spec', () => {

    function defereed(): Deferred<void> {
        return new Deferred();
    }

    const error = new Error('abort');

    it('check basic', () => {
        expect(CancelToken).toBeDefined();
        const token = new CancelToken(noop);
        expect(token).toBeDefined();
        expect(token.toString()).toBe('[object CancelToken]');
    });

    it('check CancelToken#close', async () => {
        const df = defereed();
        const token = new CancelToken((cancel, close) => {
            void post(() => {
                close();
                df.resolve();
            });
        });

        expect(token.cancelable).toBeTruthy();
        expect(token.requested).toBeFalsy();
        expect(token.closed).toBeFalsy();

        await df;

        expect(token.cancelable).toBeFalsy();
        expect(token.requested).toBeFalsy();
        expect(token.closed).toBeTruthy();
        expect(token.reason).toBe(undefined);
    });

    it('check CancelToken#cancel', async () => {
        const df = defereed();
        const token = new CancelToken((cancel) => {
            void post(() => {
                cancel(error);
                df.resolve();
            });
        });

        expect(token.cancelable).toBeTruthy();
        expect(token.requested).toBeFalsy();
        expect(token.closed).toBeFalsy();

        await df;

        expect(token.cancelable).toBeFalsy();
        expect(token.requested).toBeTruthy();
        expect(token.closed).toBeTruthy();
        expect(token.reason).toBe(error);
    });

    it('check CancelTokenSource#close', async () => {
        const { close, token } = CancelToken.source();

        expect(token.cancelable).toBeTruthy();
        expect(token.requested).toBeFalsy();
        expect(token.closed).toBeFalsy();

        await post(close);

        expect(token.cancelable).toBeFalsy();
        expect(token.requested).toBeFalsy();
        expect(token.closed).toBeTruthy();
        expect(token.reason).toBe(undefined);
    });

    it('check CancelTokenSource#cancel', async () => {
        const { cancel, token } = CancelToken.source();

        expect(token.cancelable).toBeTruthy();
        expect(token.requested).toBeFalsy();
        expect(token.closed).toBeFalsy();

        await post(() => cancel(error));

        expect(token.cancelable).toBeFalsy();
        expect(token.requested).toBeTruthy();
        expect(token.closed).toBeTruthy();
        expect(token.reason).toBe(error);
    });

    it('check LinkedToken#[[close]] 1', async () => {
        const s1 = CancelToken.source();
        const s2 = CancelToken.source(s1.token);

        await post(s1.close);

        expect(s1.token.closed).toBeTruthy();
        expect(s2.token.cancelable).toBeTruthy();
    });

    it('check LinkedToken#[[close]] 2', async () => {
        const s1 = CancelToken.source();
        const s2 = CancelToken.source(s1.token);

        await post(s2.close);

        expect(s1.token.cancelable).toBeTruthy();
        expect(s2.token.closed).toBeTruthy();
    });

    it('check LinkedToken#[[cancel]] 1', async () => {
        const s1 = CancelToken.source();
        const s2 = CancelToken.source(s1.token);

        await post(() => s1.cancel(error));

        expect(s1.token.reason).toBe(error);
        expect(s2.token.reason).toBe(error);
        expect(s1.token.requested).toBeTruthy();
        expect(s2.token.requested).toBeTruthy();
    });

    it('check LinkedToken#[[cancel]] 2', async () => {
        const s1 = CancelToken.source();
        const s2 = CancelToken.source(s1.token);

        await post(() => s2.cancel(error));

        expect(s1.token.reason).toBe(error);
        expect(s2.token.reason).toBe(error);
        expect(s1.token.requested).toBeTruthy();
        expect(s2.token.requested).toBeTruthy();
    });

    it('check CancelToken#register', done => {
        const { cancel, token } = CancelToken.source();
        token.register(reason => {
            expect(reason).toBe(error);
            done();
        });
        void post(() => cancel(error));
    });

    it('check Subscription#unsbuscribe', async () => {
        const { cancel, token } = CancelToken.source();
        const s = token.register(reason => { throw new Error(`test fail: ${reason} received.`); });

        s.unsubscribe();
        await post(() => cancel(error));
        expect(token.cancelable).toBeFalsy();
        expect(token.requested).toBeTruthy();
        expect(token.closed).toBeTruthy();
    });

    it('check advanced', async () => {
        const { close, token } = CancelToken.source();

        await post(close);
        expect(() => close()).not.toThrow();

        const s = token.register(reason => { throw new Error(`test fail: ${reason} received.`); });
        expect(s.enable).toBeFalsy();
        expect(() => s.unsubscribe()).not.toThrow();

        const { token: linkedToken } = CancelToken.source(token);
        expect(linkedToken.cancelable).toBeFalsy();
        expect(linkedToken.requested).toBeFalsy();
        expect(linkedToken.closed).toBeTruthy();

        const { token: invalid } = CancelToken.source();
        const { register } = invalid;
        expect(() => register(noop)).toThrow(new TypeError('The object is not a valid CancelToken.'));
    });
});
