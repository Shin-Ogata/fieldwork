/* eslint-disable
   @typescript-eslint/no-explicit-any
 */

import { noop } from '@cdp/core-utils';
import {
    CancelToken,
    CancelablePromise,
    extendPromise,
} from '@cdp/promise';

describe('promise/cancelable-promise spec', () => {

    function sleep(n: number, token: CancelToken): Promise<void> {
        let timer: any;
        n = n >= 0 ? n | 0 : 0;
        token.register(() => clearTimeout(timer));
        return new Promise<void>(resolve => {
            timer = setTimeout(resolve, n);
        }, token);
    }

    function never(token: CancelToken): Promise<never> {
        return new Promise<never>(() => { /* noop */ }, token);
    }

    const error = new Error('cancel');

    it('check basic', () => {
        expect(CancelablePromise).toBeDefined();
        const cancelable = Promise.resolve();
        expect(cancelable instanceof Promise).toBeTruthy();
        expect(cancelable instanceof CancelablePromise).toBeTruthy();
        extendPromise(false);
        const normal = Promise.resolve();
        expect(normal instanceof Promise).toBeTruthy();
        expect(normal instanceof CancelablePromise).toBeFalsy();
        extendPromise(true);
    });

    it('check CancelablePromise#then & #catch & #finally', (done) => {
        const { cancel, token } = CancelToken.source();
        setTimeout(() => cancel(error), 3);

        const promise = Promise.resolve()
            .then(() => sleep(1, token))
            .then(() => sleep(1, token))
            .then(() => sleep(1, token))
            .then(() => never(token))
            .catch(reason => expect(reason).toBe(error))
            .finally(() => done());

        expect(promise instanceof CancelablePromise).toBeTruthy();
    });

    it('CancelablePromise w/ async & await', async () => {
        const { cancel, token } = CancelToken.source();
        setTimeout(() => cancel(error), 3);
        try {
            await sleep(1, token);
            await sleep(1, token);
            await sleep(1, token);
            await never(token);
        } catch (e) {
            expect(e).toBe(error);
        }
    });

    it('check advanced', async () => {
        {
            const { cancel, token } = CancelToken.source();
            cancel(error);
            const cancelable = Promise.resolve(50, token);
            try {
                await cancelable;
            } catch (e) {
                expect(e).toBe(error);
            }
        }
        {
            const { close, token } = CancelToken.source();
            close();
            const cancelable = Promise.resolve(50, token);
            const value = await cancelable;
            expect(value).toBe(50);
        }
        {
            class InvalidToken extends CancelToken {
                constructor() {
                    super(noop);
                }
                get cancelable(): boolean {
                    return false;
                }
                get requested(): boolean {
                    return false;
                }
                get closed(): boolean {
                    return false;
                }
            }
            const invalid = new InvalidToken();
            expect(() => Promise.resolve(50, invalid)).toThrow(new Error('Unexpected Exception'));
        }
    });
});
