import { isFunction, sort } from '@cdp/core-utils';
import {
    SortOrder,
    CollatorProvider,
    defaultCollatorProvider,
    getStringComparator,
    getDateComparator,
    getBooleanComparator,
    getNumberComparator,
} from '@cdp/collection';

describe('utils/comparator spec', () => {
    const defaultProvider = defaultCollatorProvider();
    const jaCollatorProvider: CollatorProvider = (): Intl.Collator => {
        return new Intl.Collator('ja', { sensitivity: 'base', numeric: true });
    };

    afterEach(() => {
        defaultCollatorProvider(defaultProvider);
    });

    it('check defaultCollatorProvider()', (): void => {
        expect(defaultCollatorProvider).toBeDefined();
        expect(isFunction(defaultProvider)).toBe(true);
        const newProvider: CollatorProvider = () => { return new Intl.Collator(); };
        let retvalProvider = defaultCollatorProvider(newProvider);
        expect(retvalProvider).toBe(defaultProvider);
        retvalProvider = defaultCollatorProvider(defaultProvider);
        expect(retvalProvider).toBe(newProvider);
        expect(defaultProvider() instanceof Intl.Collator).toBe(true);
    });

    it('check getStringComparator()', (): void => {
        defaultCollatorProvider(jaCollatorProvider);
        const items = [
            { id: '00', prop: '1.txt' },
            { id: '01', prop: '8.txt' },
            { id: '02', prop: '20.txt' },
            { id: '03', prop: '2.txt' },
            { id: '04', prop: '10.txt' },
            { id: '05', prop: undefined },
            { id: '06', prop: '80.txt' },
            { id: '07', prop: '40.txt' },
        ];

        let comparator = getStringComparator<{ id: string; prop: string; }>('prop', SortOrder.ASC);
        let results = items.slice().sort(comparator);

        expect(results[0].prop).toBeUndefined();
        expect(results[1].prop).toBe('1.txt');
        expect(results[2].prop).toBe('2.txt');
        expect(results[3].prop).toBe('8.txt');
        expect(results[4].prop).toBe('10.txt');
        expect(results[5].prop).toBe('20.txt');
        expect(results[6].prop).toBe('40.txt');
        expect(results[7].prop).toBe('80.txt');

        comparator = getStringComparator<{ id: string; prop: string; }>('prop', SortOrder.DESC);
        results = items.slice().sort(comparator);

        expect(results[0].prop).toBe('80.txt');
        expect(results[1].prop).toBe('40.txt');
        expect(results[2].prop).toBe('20.txt');
        expect(results[3].prop).toBe('10.txt');
        expect(results[4].prop).toBe('8.txt');
        expect(results[5].prop).toBe('2.txt');
        expect(results[6].prop).toBe('1.txt');
        expect(results[7].prop).toBeUndefined();

        comparator = getStringComparator<{ id: string; prop: string; }>('prop', SortOrder.NO);
        results = items.slice().sort(comparator);

        expect(results[0].prop).toBe('1.txt');
        expect(results[1].prop).toBe('8.txt');
        expect(results[2].prop).toBe('20.txt');
        expect(results[3].prop).toBe('2.txt');
        expect(results[4].prop).toBe('10.txt');
        expect(results[5].prop).toBeUndefined();
        expect(results[6].prop).toBe('80.txt');
        expect(results[7].prop).toBe('40.txt');
    });

    it('check getDateComparator()', (): void => {
        const sameInstance = new Date('1977-02-16');
        const items = [
            { id: '00', prop: new Date('2002-04-01') },
            { id: '01', prop: sameInstance },
            { id: '02', prop: new Date('2020-02-04') },
            { id: '03', prop: undefined },
            { id: '04', prop: sameInstance },
            { id: '05', prop: new Date('2002-04-01') },
        ];

        let comparator = getDateComparator<{ id: string; prop: Date; }>('prop', SortOrder.ASC);
        let results = sort(items, comparator);

        expect(results[0].id).toBe('03');
        expect(results[1].id).toBe('01');
        expect(results[2].id).toBe('04');
        expect(results[3].id).toBe('00');
        expect(results[4].id).toBe('05');
        expect(results[5].id).toBe('02');

        comparator = getDateComparator<{ id: string; prop: Date; }>('prop', SortOrder.DESC);
        results = sort(items, comparator);

        expect(results[0].id).toBe('02');
        expect(results[1].id).toBe('00');
        expect(results[2].id).toBe('05');
        expect(results[3].id).toBe('01');
        expect(results[4].id).toBe('04');
        expect(results[5].id).toBe('03');

        comparator = getDateComparator<{ id: string; prop: Date; }>('prop', SortOrder.NO);
        results = sort(items, comparator);

        expect(results[0].id).toBe('00');
        expect(results[1].id).toBe('01');
        expect(results[2].id).toBe('02');
        expect(results[3].id).toBe('03');
        expect(results[4].id).toBe('04');
        expect(results[5].id).toBe('05');
    });

    it('check getBooleanComparator()', (): void => {
        const items = [
            { id: '00', prop: false },
            { id: '01', prop: true },
            { id: '02', prop: undefined },
            { id: '03', prop: true },
            { id: '04', prop: false },
            { id: '05', prop: undefined },
        ];

        let comparator = getBooleanComparator<{ id: string; prop: boolean; }>('prop', SortOrder.ASC);
        let results = sort(items, comparator);

        expect(results[0].id).toBe('02');
        expect(results[1].id).toBe('05');
        expect(results[2].id).toBe('00');
        expect(results[3].id).toBe('04');
        expect(results[4].id).toBe('01');
        expect(results[5].id).toBe('03');

        comparator = getBooleanComparator<{ id: string; prop: boolean; }>('prop', SortOrder.DESC);
        results = sort(items, comparator);

        expect(results[0].id).toBe('01');
        expect(results[1].id).toBe('03');
        expect(results[2].id).toBe('00');
        expect(results[3].id).toBe('04');
        expect(results[4].id).toBe('02');
        expect(results[5].id).toBe('05');

        comparator = getBooleanComparator<{ id: string; prop: boolean; }>('prop', SortOrder.NO);
        results = sort(items, comparator);

        expect(results[0].id).toBe('00');
        expect(results[1].id).toBe('01');
        expect(results[2].id).toBe('02');
        expect(results[3].id).toBe('03');
        expect(results[4].id).toBe('04');
        expect(results[5].id).toBe('05');
    });

    it('check getNumberComparator()', (): void => {
        const items = [
            { id: '00', prop: 1 },
            { id: '01', prop: 0 },
            { id: '02', prop: undefined },
            { id: '03', prop: 300 },
            { id: '04', prop: -10 },
            { id: '05', prop: Infinity },
        ];

        let comparator = getNumberComparator<{ id: string; prop: number; }>('prop', SortOrder.ASC);
        let results = sort(items, comparator);

        expect(results[0].id).toBe('02');
        expect(results[1].id).toBe('04');
        expect(results[2].id).toBe('01');
        expect(results[3].id).toBe('00');
        expect(results[4].id).toBe('03');
        expect(results[5].id).toBe('05');

        comparator = getNumberComparator<{ id: string; prop: number; }>('prop', SortOrder.DESC);
        results = sort(items, comparator);

        expect(results[0].id).toBe('05');
        expect(results[1].id).toBe('03');
        expect(results[2].id).toBe('00');
        expect(results[3].id).toBe('01');
        expect(results[4].id).toBe('04');
        expect(results[5].id).toBe('02');

        comparator = getNumberComparator<{ id: string; prop: number; }>('prop', SortOrder.NO);
        results = sort(items, comparator);

        expect(results[0].id).toBe('00');
        expect(results[1].id).toBe('01');
        expect(results[2].id).toBe('02');
        expect(results[3].id).toBe('03');
        expect(results[4].id).toBe('04');
        expect(results[5].id).toBe('05');
    });
});
