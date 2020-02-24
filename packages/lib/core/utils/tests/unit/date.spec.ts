/* eslint-disable
   @typescript-eslint/no-explicit-any
 */

/* eslint-disable
   @typescript-eslint/no-explicit-any
 */

import { computeDate } from '@cdp/core-utils';

describe('utils/date spec', () => {
    it('check computeDate()', () => {
        const base = new Date('2020-02-04T17:15:40+09:00');
        let computed = computeDate(base, 12);
        expect(computed.toISOString()).toBe('2020-02-16T08:15:40.000Z');
        computed = computeDate(base, 12, 'year');
        expect(computed.toISOString()).toBe('2032-02-04T08:15:40.000Z');
        computed = computeDate(base, 12, 'month');
        expect(computed.toISOString()).toBe('2021-02-04T08:15:40.000Z');
        computed = computeDate(base, 12, 'hour');
        expect(computed.toISOString()).toBe('2020-02-04T20:15:40.000Z');
        computed = computeDate(base, 12, 'min');
        expect(computed.toISOString()).toBe('2020-02-04T08:27:40.000Z');
        computed = computeDate(base, 12, 'sec');
        expect(computed.toISOString()).toBe('2020-02-04T08:15:52.000Z');
        computed = computeDate(base, 12, 'msec');
        expect(computed.toISOString()).toBe('2020-02-04T08:15:40.012Z');
    });

    it('check computeDate() w/ invalid unit', () => {
        const base = new Date('2020-02-04T17:15:40+09:00');
        expect(() => computeDate(base, 12, 'hoge' as any)).toThrow(new TypeError('invalid unit: hoge'));
    });
});
