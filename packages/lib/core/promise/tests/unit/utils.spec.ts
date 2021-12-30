import {
    wait,
    checkCanceled,
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

            fail('undexpected flow');
        } catch (e) {
            expect(e).toBe(error);
        }
    });
});
