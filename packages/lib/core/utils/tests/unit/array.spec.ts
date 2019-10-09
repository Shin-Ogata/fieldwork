/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/require-await */

import {
    shuffle,
    sort,
    map,
    filter,
    find,
    findIndex,
    some,
    every,
    reduce,
} from '@cdp/core-utils';

describe('utils/array spec', () => {
    it('check shuffle()', () => {
        const array = [1, 2, 3, 4, 5];
        const shuffled = shuffle(array);
        expect(array === shuffled).toBe(false);
        expect(shuffled.length).toBe(5);
        const destructive = shuffle(array, true);
        expect(array === destructive).toBe(true);
        expect(destructive.length).toBe(5);
        expect(() => shuffle([])).not.toThrow();
    });

    it('check stable sort()', () => {
        const array = [
            { count: 0, id: '00', },
            { count: 0, id: '01', },
            { count: 1, id: '02', },
            { count: 1, id: '03', },
            { count: 3, id: '04', },
        ];
        const sorted = sort(array, (lhs, rhs) => {
            return lhs.count < rhs.count ? 1 : -1;
        });
        expect(array === sorted).toBe(false);
        expect(sorted.length).toBe(5);
        expect(sorted[0].id).toBe('04');
        expect(sorted[1].id).toBe('02');
        expect(sorted[2].id).toBe('03');
        expect(sorted[3].id).toBe('00');
        expect(sorted[4].id).toBe('01');
    });

    it('check async map()', async (done) => {
        const array = [1, 2, 3, 4, 5];
        let results = await map(array, async (value) => value * 2);
        expect(results[0]).toBe(2);
        expect(results[1]).toBe(4);
        expect(results[2]).toBe(6);
        expect(results[3]).toBe(8);
        expect(results[4]).toBe(10);

        // sync callback
        results = await map(array, (value) => value * 3);
        expect(results[0]).toBe(3);
        expect(results[1]).toBe(6);
        expect(results[2]).toBe(9);
        expect(results[3]).toBe(12);
        expect(results[4]).toBe(15);

        done();
    });

    it('check async filter()', async (done) => {
        const array = [
            { count: 0, id: '00', },
            { count: 0, id: '01', },
            { count: 1, id: '02', },
            { count: 1, id: '03', },
            { count: 3, id: '04', },
        ];

        let results = await filter(array, async (value) => 1 === value.count);
        expect(results.length).toBe(2);
        expect(results[0]).toEqual({ count: 1, id: '02' });
        expect(results[1]).toEqual({ count: 1, id: '03' });

        // sync callback
        results = await filter(array, (value) => 3 === value.count);
        expect(results.length).toBe(1);
        expect(results[0]).toEqual({ count: 3, id: '04' });

        done();
    });

    it('check async find()', async (done) => {
        const array = [
            { count: 0, id: '00', },
            { count: 0, id: '01', },
            { count: 1, id: '02', },
            { count: 1, id: '03', },
            { count: 3, id: '04', },
        ];

        let result = await find(array, async (value) => 1 === value.count);
        expect(result).toEqual({ count: 1, id: '02' });

        // undefined
        result = await find(array, async (value) => 4 === value.count);
        expect(result).toBeUndefined();

        // sync callback
        result = await find(array, (value) => 3 === value.count);
        expect(result).toEqual({ count: 3, id: '04' });

        done();
    });

    it('check async findIndex()', async (done) => {
        const array = [
            { count: 0, id: '00', },
            { count: 0, id: '01', },
            { count: 1, id: '02', },
            { count: 1, id: '03', },
            { count: 3, id: '04', },
        ];

        let result = await findIndex(array, async (value) => 1 === value.count);
        expect(result).toBe(2);

        // undefined
        result = await findIndex(array, async (value) => 4 === value.count);
        expect(result).toBe(-1);

        // sync callback
        result = await findIndex(array, (value) => 3 === value.count);
        expect(result).toBe(4);

        done();
    });

    it('check async some()', async (done) => {
        const array = [1, 2, 3, 4, 5];
        let result = await some(array, async (value) => value % 2);
        expect(result).toBe(true);
        result = await some(array, async (value) => 6 < value);
        expect(result).toBe(false);

        // sync callback
        result = await some(array, (value) => value % 3);
        expect(result).toBe(true);

        done();
    });

    it('check async every()', async (done) => {
        const array = [1, 2, 3, 4, 5];
        let result = await every(array, async (value) => value % 2);
        expect(result).toBe(false);
        result = await every(array, async (value) => value < 6);
        expect(result).toBe(true);

        // sync callback
        result = await every(array, (value) => value % 3);
        expect(result).toBe(false);

        done();
    });

    it('check async reduce()', async (done) => {
        const array = [1, 2, 3, 4, 5];
        let result = await reduce(array, async (a: number, v: number) => a + v);
        expect(result).toBe(15);

        // sync callback
        result = await reduce(array, (a, v) => a + v, 2); // eslint-disable-line
        expect(result).toBe(17);

        // error
        await expectAsync(reduce([], async (a: number, v: number) => a + v)).toBeRejected();

        done();
    });
});
