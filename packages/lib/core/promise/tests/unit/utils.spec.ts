import { noop } from '@cdp/core-utils';
import {
    wait,
    checkCanceled,
    checkStatus,
    CancelToken,
} from '@cdp/promise';
import {
    resolve100,
    resolve50,
    resolve0,
    reject100,
    reject50,
    reject0,
} from './tools';

describe('promise/utils spec', () => {
    it('check wait', async () => {
        try {
            const results = await wait([
                resolve100(),
                resolve50(),
                resolve0(),
                reject100(),
                reject50(),
                reject0(),
            ]);
            expect(results.length).toBe(6);
            expect(results[0]).toBe('resolve:100');
            expect(results[1]).toBe('resolve:50');
            expect(results[2]).toBe('resolve:0');
            expect(results[3]).toBe('reject:100');
            expect(results[4]).toBe('reject:50');
            expect(results[5]).toBe('reject:0');
        } catch (e) {
            fail(e);
        }
    });

    it('check checkCanceled', async () => {
        const error = new Error('abort');
        try {
            const source = CancelToken.source();
            const { token } = source;

            source.cancel(error);
            await checkCanceled(token);

            fail('UNEXPECTED FLOW');
        } catch (e) {
            expect(e).toBe(error);
        }
    });

    it('check checkStatus', async () => {
        const p1 = Promise.resolve();
        const s1 = await checkStatus(p1);
        expect(s1).toBe('fulfilled');

        const p2 = Promise.reject();
        const s2 = await checkStatus(p2);
        expect(s2).toBe('rejected');

        const p3 = new Promise(noop);
        const s3 = await checkStatus(p3);
        expect(s3).toBe('pending');
    });

    it('check checkStatus2', async () => {
        const p1 = new Promise(resolve => setTimeout(resolve));
        await p1;
        const s1 = await checkStatus(p1);
        expect(s1).toBe('fulfilled');

        const p2 = new Promise((_, reject) => setTimeout(reject));
        try {
            await p2;
        } catch {
            // noop
        }
        const s2 = await checkStatus(p2);
        expect(s2).toBe('rejected');

        const p3 = new Promise(noop);
        const s3 = await checkStatus(p3);
        expect(s3).toBe('pending');
    });

    it('checkStatus core technology deep drive', async () => {
        const t = {};

        const pN = new Promise(resolve => resolve('Promise:fulfilled'));
        await pN;

        const retN = await Promise.race([pN, t]);
        expect(retN).toBe('Promise:fulfilled'); // ok

        class PromiseEx<T> extends Promise<T> {
        }

        const pE = new PromiseEx(resolve => resolve('PromiseEx:fulfilled'));
        await pE;

        const retE1 = await Promise.race([pE, t]);
        expect(retE1).toBe(t); // ★ t が返される

        const retE2 = await PromiseEx.race([pE, t]);
        expect(retE2).toBe('PromiseEx:fulfilled'); // ok

        const retE3 = await (pE.constructor as PromiseConstructor).race([pE, t]);
        expect(retE3).toBe('PromiseEx:fulfilled'); // ok

        const retE4 = await Promise.race([new Promise(noop), pE, new PromiseEx(noop)]);
        expect(retE4).toBe('PromiseEx:fulfilled'); // ok

        const retE5 = await Promise.race([pE, pN]);
        expect(retE5).toBe('Promise:fulfilled'); // ★ 第2項目 の pN が返される

        const retE6 = await PromiseEx.race([pE, pN]);
        expect(retE6).toBe('PromiseEx:fulfilled'); // ok

        class PromiseExSymbol<T> extends Promise<T> {
            // Symbol.species を提供しても挙動は同じ
            static get [Symbol.species](): PromiseConstructor { return Promise; }
        }

        const pS = new PromiseExSymbol(resolve => resolve('PromiseExSymbol:fulfilled'));
        await pS;

        const retS1 = await Promise.race([pS, t]);
        expect(retS1).toBe(t); // t が返される

        const retS2 = await PromiseExSymbol.race([pS, t]);
        expect(retS2).toBe('PromiseExSymbol:fulfilled'); // ok

        const retS3 = await (pS.constructor as PromiseConstructor).race([pS, t]);
        expect(retS3).toBe('PromiseExSymbol:fulfilled'); // ok

        const retS4 = await Promise.race([new Promise(noop), pS, new PromiseExSymbol(noop)]);
        expect(retS4).toBe('PromiseExSymbol:fulfilled'); // ok

        const retS5 = await Promise.race([pS, pN]);
        expect(retS5).toBe('Promise:fulfilled'); // ★ 第2項目 の pN が返される

        const retS6 = await PromiseExSymbol.race([pS, pN]);
        expect(retS6).toBe('PromiseExSymbol:fulfilled'); // ok
    });

    it("Summary of Promise.race()'s strange behaviour", async () => {
        class PromiseEx<T> extends Promise<T> {}
        const pending = 'pending';

        const pN = new Promise(resolve => resolve('Normal:done'));
        const pE = new PromiseEx(resolve => resolve('Ex:done'));

        await pN;
        await pE;

        const result0 = await Promise.race([pN, pending]);
        const result1 = await Promise.race([pE, pending]);
        const result2 = await PromiseEx.race([pN, pending]);
        const result3 = await PromiseEx.race([pE, pending]);

        expect(result0).toBe('Normal:done');
        expect(result1).toBe('pending');
        expect(result2).toBe('pending');
        expect(result3).toBe('Ex:done');
    });
});
