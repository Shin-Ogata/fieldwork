/* eslint-disable
   @typescript-eslint/no-explicit-any
 */

import { computeDate } from '@cdp/core-utils';
import {
    SortOrder,
    DynamicCondition,
    DynamicCombination,
    DynamicOperator,
    DynamicLimit,
} from '@cdp/collection';

interface Track {
    id: string;
    title: string;
    trackArtist: string;
    albumTitle: string;
    size: number;
    duration: number;
    releaseDate: Date;
    compilation: boolean;
}

const tracks = [
    { title: '001', trackArtist: 'aaa', albumTitle: 'AAA', duration: 6000, size: 512000, releaseDate: new Date('2009/01/01'),               compilation: false, },
    { title: '002', trackArtist: 'aaa', albumTitle: 'BBB', duration: 6000, size: 512000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: true,  },
    { title: '003', trackArtist: 'aaa', albumTitle: 'CCC', duration: 7000, size: 512000, releaseDate: new Date(),                           compilation: false, },
    { title: '004', trackArtist: 'aaa', albumTitle: 'AAA', duration: 4000, size: 128000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: false, },
    { title: '005', trackArtist: 'aaa', albumTitle: 'BBB', duration: 4000, size: 128000, releaseDate: new Date('2010/01/01'),               compilation: true,  },
    { title: '006', trackArtist: 'aaa', albumTitle: 'CCC', duration: 4000, size: 128000, releaseDate: new Date(),                           compilation: false, },
    { title: '007', trackArtist: 'bbb', albumTitle: 'AAA', duration: 6000, size: 512000, releaseDate: new Date('2009/01/01'),               compilation: false, },
    { title: '008', trackArtist: 'bbb', albumTitle: 'BBB', duration: 6000, size: 512000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: true,  },
    { title: '009', trackArtist: 'bbb', albumTitle: 'CCC', duration: 6000, size: 512000, releaseDate: new Date(),                           compilation: false, },
    { title: '010', trackArtist: 'bbb', albumTitle: 'AAA', duration: 4000, size: 128000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: false, },
    { title: '011', trackArtist: 'bbb', albumTitle: 'BBB', duration: 4000, size: 128000, releaseDate: new Date('2010/01/01'),               compilation: true,  },
    { title: '012', trackArtist: 'bbb', albumTitle: 'CCC', duration: 4000, size: 128000, releaseDate: new Date(),                           compilation: false, },
    { title: '013', trackArtist: 'ccc', albumTitle: 'AAA', duration: 6000, size: 512000, releaseDate: new Date('2009/01/01'),               compilation: false, },
    { title: '014', trackArtist: 'ccc', albumTitle: 'BBB', duration: 8500, size: 512000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: true,  },
    { title: '015', trackArtist: 'ccc', albumTitle: 'CCC', duration: 6000, size: 512000, releaseDate: new Date(),                           compilation: false, },
    { title: '016', trackArtist: 'ccc', albumTitle: 'AAA', duration: 4000, size: 128000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: false, },
    { title: '017', trackArtist: 'ccc', albumTitle: 'BBB', duration: 4000, size: 128000, releaseDate: new Date('2010/01/01'),               compilation: true,  },
    { title: '018', trackArtist: 'ccc', albumTitle: 'CCC', duration: 4000, size: 128000, releaseDate: new Date(),                           compilation: false, },
] as Track[];

describe('query/dynamic-condition spec', () => {
    it('check property access', (): void => {
        const condition = new DynamicCondition<Track, 'title'>();
        expect(condition).toBeDefined();
        expect(condition.operators).toEqual([]);
        expect(condition.sumKeys).toEqual([]);
        expect(condition.combination).toBe(DynamicCombination.AND);
        expect(condition.limit).toBeUndefined();
        expect(condition.random).toBe(false);
        expect(condition.sortKeys).toEqual([]);
        expect(condition.comparators).toEqual([]);
        expect(condition.filter).toBeDefined();
        expect(typeof condition.filter).toBe('function');
        expect(condition.filter({} as any)).toBe(true);

        condition.operators = [{
            operator: DynamicOperator.EQUAL,
            prop: 'title',
            value: 'test',
        }];
        condition.sumKeys = ['size', 'duration'];
        condition.combination = DynamicCombination.OR;
        condition.limit = { unit: DynamicLimit.COUNT, value: 10, prop: '@count' };
        condition.random = true;
        condition.sortKeys = [{ name: 'title', order: SortOrder.ASC, type: 'string' }];

        expect(condition.operators).toEqual([{
            operator: DynamicOperator.EQUAL,
            prop: 'title',
            value: 'test',
        }]);
        expect(condition.sumKeys).toEqual(['size', 'duration']);
        expect(condition.combination).toBe(DynamicCombination.OR);
        expect(condition.limit).toEqual({ unit: DynamicLimit.COUNT, value: 10, prop: '@count' });
        expect(condition.random).toBe(true);
        expect(condition.sortKeys).toEqual([{ name: 'title', order: SortOrder.ASC, type: 'string' }]);
    });

    it('check equal w/ less', (): void => {
        const cond = new DynamicCondition<Track>({
            operators: [
                {
                    operator: DynamicOperator.EQUAL,
                    prop: 'albumTitle',
                    value: 'AAA',
                },
                {
                    operator: DynamicOperator.LESS,
                    prop: 'duration',
                    value: 6000,
                },
            ],
        });

        const query = tracks.filter(cond.filter);

        expect(query.length).toBe(3);
        expect(query[0].title).toBe('004');
        expect(query[0].trackArtist).toBe('aaa');
        expect(query[0].albumTitle).toBe('AAA');
        expect(query[0].duration).toBe(4000);
        expect(query[1].title).toBe('010');
        expect(query[1].trackArtist).toBe('bbb');
        expect(query[1].albumTitle).toBe('AAA');
        expect(query[1].duration).toBe(4000);
        expect(query[2].title).toBe('016');
        expect(query[2].trackArtist).toBe('ccc');
        expect(query[2].albumTitle).toBe('AAA');
        expect(query[2].duration).toBe(4000);
    });

    it('check not equal w/ greater', (): void => {
        const cond = new DynamicCondition<Track>({
            operators: [
                {
                    operator: DynamicOperator.NOT_EQUAL,
                    prop: 'compilation',
                    value: false,
                },
                {
                    operator: DynamicOperator.GREATER,
                    prop: 'size',
                    value: 128000,
                },
            ],
        });

        const query = tracks.filter(cond.filter);

        expect(query.length).toBe(3);
        expect(query[0].title).toBe('002');
        expect(query[1].title).toBe('008');
        expect(query[2].title).toBe('014');
    });

    it('check greater equal w/ less equal', (): void => {
        const cond = new DynamicCondition<Track>({
            operators: [
                {
                    operator: DynamicOperator.GREATER_EQUAL,
                    prop: 'duration',
                    value: 6000,
                },
                {
                    operator: DynamicOperator.LESS_EQUAL,
                    prop: 'size',
                    value: 128000,
                },
            ],
        });

        const query = tracks.filter(cond.filter);
        expect(query.length).toBe(0);
    });

    it('check like w/ OR', (): void => {
        const cond = new DynamicCondition<Track>({
            operators: [
                {
                    operator: DynamicOperator.LIKE,
                    prop: 'title',
                    value: '01',
                },
                {
                    operator: DynamicOperator.LIKE,
                    prop: 'albumTitle',
                    value: 'aA',
                },
            ],
            combination: DynamicCombination.OR,
        });

        const query = tracks.filter(cond.filter);

        expect(query.length).toBe(12);
        expect(query[0].title).toBe('001');
        expect(query[0].albumTitle).toBe('AAA');
        expect(query[1].title).toBe('004');
        expect(query[1].albumTitle).toBe('AAA');
        expect(query[2].title).toBe('007');
        expect(query[2].albumTitle).toBe('AAA');
        expect(query[3].title).toBe('010');
        expect(query[3].albumTitle).toBe('AAA');
        expect(query[4].title).toBe('011');
        expect(query[4].albumTitle).toBe('BBB');
        expect(query[5].title).toBe('012');
        expect(query[5].albumTitle).toBe('CCC');
        expect(query[6].title).toBe('013');
        expect(query[6].albumTitle).toBe('AAA');
        expect(query[7].title).toBe('014');
        expect(query[7].albumTitle).toBe('BBB');
        expect(query[8].title).toBe('015');
        expect(query[8].albumTitle).toBe('CCC');
        expect(query[9].title).toBe('016');
        expect(query[9].albumTitle).toBe('AAA');
        expect(query[10].title).toBe('017');
        expect(query[10].albumTitle).toBe('BBB');
        expect(query[11].title).toBe('018');
        expect(query[11].albumTitle).toBe('CCC');
    });

    it('check not like', (): void => {
        const cond = new DynamicCondition<Track>({
            operators: [
                {
                    operator: DynamicOperator.NOT_LIKE,
                    prop: 'title',
                    value: '01',
                },
            ],
        });

        const query = tracks.filter(cond.filter);

        expect(query.length).toBe(8);
        expect(query[0].title).toBe('002');
        expect(query[1].title).toBe('003');
        expect(query[2].title).toBe('004');
        expect(query[3].title).toBe('005');
        expect(query[4].title).toBe('006');
        expect(query[5].title).toBe('007');
        expect(query[6].title).toBe('008');
        expect(query[7].title).toBe('009');
    });

    it('check date lesser equal', (): void => {
        const cond = new DynamicCondition<Track>({
            operators: [
                {
                    operator: DynamicOperator.DATE_LESS_EQUAL,
                    prop: 'releaseDate',
                    value: 3,
                    unit: 'month',
                },
            ],
        });

        const query = tracks.filter(cond.filter);

        expect(query.length).toBe(12);
        expect(query[0].title).toBe('002');
        expect(query[1].title).toBe('003');
        expect(query[2].title).toBe('004');
        expect(query[3].title).toBe('006');
        expect(query[4].title).toBe('008');
        expect(query[5].title).toBe('009');
        expect(query[6].title).toBe('010');
        expect(query[7].title).toBe('012');
        expect(query[8].title).toBe('014');
        expect(query[9].title).toBe('015');
        expect(query[10].title).toBe('016');
        expect(query[11].title).toBe('018');
    });

    it('check date lesser not equal', (): void => {
        const cond = new DynamicCondition<Track>({
            operators: [
                {
                    operator: DynamicOperator.DATE_LESS_NOT_EQUAL,
                    prop: 'releaseDate',
                    value: 3,
                    unit: 'year',
                },
            ],
        });

        const query = tracks.filter(cond.filter);

        expect(query.length).toBe(6);
        expect(query[0].title).toBe('001');
        expect(query[1].title).toBe('005');
        expect(query[2].title).toBe('007');
        expect(query[3].title).toBe('011');
        expect(query[4].title).toBe('013');
        expect(query[5].title).toBe('017');
    });

    it('check range', (): void => {
        const cond = new DynamicCondition<Track>({
            operators: [
                {
                    operator: DynamicOperator.RANGE,
                    prop: 'duration',
                    value: 6500,
                    range: 8500,
                },
            ],
        });

        const query = tracks.filter(cond.filter);

        expect(query.length).toBe(2);
        expect(query[0].title).toBe('003');
        expect(query[1].title).toBe('014');
    });

    it('check cached property', (): void => {
        const cond = new DynamicCondition<Track>({
            operators: [],
            sumKeys: ['size', 'duration'],
            sortKeys: [
                { name: 'title', order: SortOrder.ASC, type: 'string' },
                { name: 'releaseDate', order: SortOrder.DESC, type: 'date' },
            ],
            random: true,
            limit: {
                unit: DynamicLimit.TB,
                value: 10,
                prop: 'size',
            }
        });

        expect(cond.sumKeys).toEqual(['size', 'duration']);
        expect(cond.limit).toEqual({ unit: DynamicLimit.TB, value: 10, prop: 'size' });
        expect(cond.random).toBe(true);
        expect(cond.sortKeys).toEqual([
            { name: 'title', order: SortOrder.ASC, type: 'string' },
            { name: 'releaseDate', order: SortOrder.DESC, type: 'date' },
        ]);
    });

    it('check illegal', (): void => {
        const cond = new DynamicCondition<Track>({
            operators: [
                {
                    operator: DynamicOperator.EQUAL,
                    prop: 'title',
                    value: '018',
                },
                {
                    operator: DynamicOperator.LESS,
                    prop: 'duration',
                    value: 6000,
                },
                {
                    operator: -1,
                    prop: 'duration',
                    value: 6000,
                },
            ],
            combination: -1,
        } as any);

        const query = tracks.slice(16).filter(cond.filter);

        expect(query.length).toBe(1);
        expect(query[0].title).toBe('018');
    });
});
