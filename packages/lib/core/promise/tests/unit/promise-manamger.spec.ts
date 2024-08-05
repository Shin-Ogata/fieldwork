import {
    CancelToken,
    PromiseManager,
    Promise,
} from '@cdp/promise';
import {
    resolve100,
    resolve50,
    resolve0,
    reject100,
    reject50,
    reject0,
} from './tools';

describe('promise/promise-manager spec', () => {
    it('check basic', () => {
        expect(PromiseManager).toBeDefined();
        const manager = new PromiseManager();
        expect(manager).toBeDefined();
    });

    it('check PromiseManager#promises', () => {
        const manager = new PromiseManager();
        void manager.add(resolve100());
        void manager.add(resolve50());
        void manager.add(resolve0());

        expect(manager.promises().length).toBe(3);
        manager.release();
        expect(manager.promises().length).toBe(0);
    });

    it('check PromiseManager#all', async () => {
        const manager = new PromiseManager();

        try {
            void manager.add(resolve100());
            void manager.add(resolve50());
            void manager.add(resolve0());

            const results = await manager.all();

            expect(results[0]).toBe('resolve:100');
            expect(results[1]).toBe('resolve:50');
            expect(results[2]).toBe('resolve:0');
        } catch {
            fail('UNEXPECTED FLOW');
        }

        manager.release();

        try {
            void manager.add(resolve100());
            void manager.add(resolve50());
            void manager.add(reject0());

            await manager.all();

            fail('UNEXPECTED FLOW');
        } catch (e) {
            expect(e).toBe('reject:0');
        }
    });

    it('check PromiseManager#add w/ cancelSource', async () => {
        const manager = new PromiseManager();
        const source = CancelToken.source();
        const { token } = source;
        const promise = new Promise(resolve => resolve('ok'), token);

        expect(token.closed).toBeFalsy();
        await manager.add(promise, source);
        expect(token.closed).toBeTruthy();
    });

    it('check PromiseManager#race', async () => {
        const manager = new PromiseManager();

        try {
            void manager.add(resolve100());
            void manager.add(resolve50());
            void manager.add(resolve0());

            const result = await manager.race();

            expect(result).toBe('resolve:0');
        } catch {
            fail('UNEXPECTED FLOW');
        }

        manager.release();

        try {
            void manager.add(resolve100());
            void manager.add(resolve50());
            void manager.add(reject0());

            await manager.race();

            fail('UNEXPECTED FLOW');
        } catch (e) {
            expect(e).toBe('reject:0');
        }
    });

    it('check PromiseManager#wait', async () => {
        const manager = new PromiseManager();

        try {
            void manager.add(resolve100());
            void manager.add(resolve50());
            void manager.add(resolve0());
            void manager.add(reject100());
            void manager.add(reject50());
            void manager.add(reject0());

            const results = await manager.wait();

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

    it('check PromiseManager#allSettled', async () => {
        const manager = new PromiseManager();

        try {
            void manager.add(resolve100());
            void manager.add(resolve50());
            void manager.add(resolve0());
            void manager.add(reject100());
            void manager.add(reject50());
            void manager.add(reject0());

            const results = await manager.allSettled();

            type S = PromiseFulfilledResult<string>;
            type F = PromiseRejectedResult;

            expect(results.length).toBe(6);
            expect((results[0] as S).status).toBe('fulfilled');
            expect((results[0] as S).value).toBe('resolve:100');
            expect((results[1] as S).status).toBe('fulfilled');
            expect((results[1] as S).value).toBe('resolve:50');
            expect((results[2] as S).status).toBe('fulfilled');
            expect((results[2] as S).value).toBe('resolve:0');
            expect((results[3] as F).status).toBe('rejected');
            expect((results[3] as F).reason).toBe('reject:100');
            expect((results[4] as F).status).toBe('rejected');
            expect((results[4] as F).reason).toBe('reject:50');
            expect((results[5] as F).status).toBe('rejected');
            expect((results[5] as F).reason).toBe('reject:0');
        } catch (e) {
            fail(e);
        }
    });

    it('check PromiseManager#any w/ succeeded', async () => {
        const manager = new PromiseManager();

        try {
            void manager.add(resolve100());
            void manager.add(resolve50());
            void manager.add(reject50());
            void manager.add(reject0());

            const result = await manager.any();
            expect(result).toBe('resolve:50');
        } catch (e) {
            fail(e);
        }
    });

    it('check PromiseManager#any w/ failed', async () => {
        const manager = new PromiseManager();

        try {
            void manager.add(reject50());
            void manager.add(reject0());

            await manager.any();
            fail('UNEXPECTED FLOW');
        } catch (e) {
            expect(e.name).toBe('AggregateError');
        }
    });

    it('check PromiseManager#abort', async () => {
        const manager = new PromiseManager();

        try {
            const s1 = CancelToken.source();
            const s2 = CancelToken.source();

            const promise1 = resolve100(s1.token);
            const promise2 = resolve50(s2.token);
            void manager.add(promise1, s1);
            void manager.add(promise2, s2);
            void manager.add(reject50());

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const results = await manager.abort() as any[];

            expect(results.length).toBe(3);
            expect(results[0].message).toBe('abort');
            expect(results[1].message).toBe('abort');
            expect(results[2]).toBe('reject:50');

            try {
                await promise1;
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e.message).toBe('abort');
            }

            try {
                await promise2;
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e.message).toBe('abort');
            }
        } catch (e) {
            fail(e);
        }

        manager.release();

        try {
            const source = CancelToken.source();
            const promise = resolve50(source.token);

            void manager.add(promise, source);

            const results = await manager.abort('cancel');

            expect(results.length).toBe(1);
            expect(results[0]).toBe('cancel');

            try {
                await promise;
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e).toBe('cancel');
            }
        } catch (e) {
            fail(e);
        }
    });
});
