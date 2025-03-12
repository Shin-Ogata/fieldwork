/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import {
    isFunction,
    isEmptyObject,
    computeDate,
} from '@cdp/core-utils';
import { checkCanceled as cc } from '@cdp/promise';
import { RESULT_CODE } from '@cdp/result';
import {
    SortOrder,
    type FilterCallback,
    type SortCallback,
    type CollectionItemQueryOptions,
    type CollectionQueryInfo,
    type CollectionItemQueryResult,
    DynamicCondition,
    DynamicOperator,
    DynamicLimit,
    getStringComparator,
    queryItems,
    searchItems,
    conditionalFix,
} from '@cdp/collection';

interface Item {
    name: string;
}

type ItemSortKeys = keyof Pick<Item, 'name'>;
type ItemQueryOptions = CollectionItemQueryOptions<Item, ItemSortKeys>;
type ItemQueryInfo = CollectionQueryInfo<Item, ItemSortKeys>;

const items: Item[] = [
    { name: 'a' },
    { name: 's' },
    { name: 'd' },
    { name: 'f' },
    { name: 'g' },
    { name: 'h' },
    { name: 'j' },
];

const provider = async (options?: ItemQueryOptions): Promise<CollectionItemQueryResult<Item>> => {
    const opts = Object.assign({ comparators: [] }, options);
    const {
        filter,
        comparators,
        index,
        limit,
        cancel: token,
        condition,
    } = opts;

    await cc(token);

    const targets = ((filter?: FilterCallback<Item> | null, ...comparators: SortCallback<Item>[]) => {
        const result = isFunction(filter) ? [...items].filter(filter) : [...items];
        for (const comparator of comparators) {
            isFunction(comparator) && result.sort(comparator);
        }
        return result;
    })(filter, ...comparators);

    const nextOptions = (() => {
        const no = { noSearch: !!filter, condition };
        !no.noSearch && delete (no as { noSearch?: boolean; }).noSearch;
        !no.condition && delete no.condition;
        return isEmptyObject(no) ? undefined : no;
    })();

    if (null == index && null == limit) {
        return {
            total: targets.length,
            items: targets,
            options: nextOptions,
        };
    } else {
        const idx = index ?? 0;
        const result = targets.slice(idx, (null != limit) ? idx + limit : undefined);
        return {
            total: targets.length,
            items: result,
            options: nextOptions,
        };
    }
};

describe('query/query spec', () => {
    let count: number;

    beforeEach(() => {
        count = 0;
    });

    // eslint-disable-next-line
    const onProgress = (progress: CollectionItemQueryResult<any>): void => {
        count++;
    };

    interface Track {
        title: string;
        trackArtist: string;
        albumTitle: string;
        size: number;
        duration: number;
        releaseDate: Date;
        compilation: boolean;
    }

    const tracks: Track[] = [
        { title: '001', trackArtist: 'aaa', albumTitle: 'AAA', duration: 6000, size: 512000, releaseDate: new Date('2009/01/01'), compilation: false, },
        { title: '002', trackArtist: 'aaa', albumTitle: 'BBB', duration: 6000, size: 512000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: true, },
        { title: '003', trackArtist: 'aaa', albumTitle: 'CCC', duration: 7000, size: 512000, releaseDate: new Date(), compilation: false, },
        { title: '004', trackArtist: 'aaa', albumTitle: 'AAA', duration: 4000, size: 128000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: false, },
        { title: '005', trackArtist: 'aaa', albumTitle: 'BBB', duration: 4000, size: 128000, releaseDate: new Date('2010/01/01'), compilation: true, },
        { title: '006', trackArtist: 'aaa', albumTitle: 'CCC', duration: 4000, size: 128000, releaseDate: new Date(), compilation: false, },
    ];

    type TrackQueryOptions = CollectionItemQueryOptions<Track, keyof Track>;
    type TrackQueryInfo = CollectionQueryInfo<Track, keyof Track>;

    describe('searchItems()', () => {
        it('check searchItems() w/ no filter, no comparators', (): void => {
            const searched = searchItems(items);
            expect(searched).not.toBe(items);
            expect(searched.length).toBe(7);
            expect(searched[0].name).toBe('a');
            expect(searched[1].name).toBe('s');
            expect(searched[2].name).toBe('d');
            expect(searched[3].name).toBe('f');
            expect(searched[4].name).toBe('g');
            expect(searched[5].name).toBe('h');
            expect(searched[6].name).toBe('j');
        });

        it('check searchItems() w/ filter', (): void => {
            const searched = searchItems(items, item => 'd' === item.name || 'f' === item.name);
            expect(searched.length).toBe(2);
            expect(searched[0].name).toBe('d');
            expect(searched[1].name).toBe('f');
        });

        it('check searchItems() w/ comparators', (): void => {
            const searched = searchItems(items, undefined, getStringComparator<Item>('name', SortOrder.DESC), true as any);
            expect(searched.length).toBe(7);
            expect(searched[0].name).toBe('s');
            expect(searched[1].name).toBe('j');
            expect(searched[2].name).toBe('h');
            expect(searched[3].name).toBe('g');
            expect(searched[4].name).toBe('f');
            expect(searched[5].name).toBe('d');
            expect(searched[6].name).toBe('a');
        });
    });

    describe('queryItem() w/ provider', () => {
        let info!: ItemQueryInfo;

        beforeEach(() => {
            info = {
                sortKeys: [],
                comparators: [],
            };
        });

        it('check w/ filter', async () => {
            const options: ItemQueryOptions = {
                comparators: [],
                filter: (item) => {
                    if ('d' === item.name || 'g' === item.name || 'f' === item.name) {
                        return false;
                    } else {
                        return true;
                    }
                },
            };

            const ret = await queryItems(info, provider, options);

            expect(ret.length).toBe(4);
            expect(ret[0].name).toBe('a');
            expect(ret[1].name).toBe('s');
            expect(ret[2].name).toBe('h');
            expect(ret[3].name).toBe('j');

            expect(info.cache).toBeFalsy();
            expect(info.filter).toBe(options.filter);
            expect(info.comparators).toEqual([]);
        });

        it('check w/ sort', async () => {
            const options: ItemQueryOptions = {
                comparators: [
                    getStringComparator<Item>('name', SortOrder.DESC),
                ],
            };

            const ret = await queryItems(info, provider, options);

            expect(ret.length).toBe(7);
            expect(ret[0].name).toBe('s');
            expect(ret[1].name).toBe('j');
            expect(ret[2].name).toBe('h');
            expect(ret[3].name).toBe('g');
            expect(ret[4].name).toBe('f');
            expect(ret[5].name).toBe('d');
            expect(ret[6].name).toBe('a');
        });

        it('check w/ sortKeys', async () => {
            const options: ItemQueryOptions = {
                sortKeys: [{ name: 'name', order: SortOrder.DESC, type: 'string' }],
            };

            const ret = await queryItems(info, provider, options);

            expect(ret.length).toBe(7);
            expect(ret[0].name).toBe('s');
            expect(ret[1].name).toBe('j');
            expect(ret[2].name).toBe('h');
            expect(ret[3].name).toBe('g');
            expect(ret[4].name).toBe('f');
            expect(ret[5].name).toBe('d');
            expect(ret[6].name).toBe('a');
        });

        it('check w/ limit', async () => {
            const ret = await queryItems(info, provider, { limit: 3 });

            expect(ret.length).toBe(3);
            expect(ret[0].name).toBe('a');
            expect(ret[1].name).toBe('s');
            expect(ret[2].name).toBe('d');
            expect(info.cache).toBeUndefined();
        });

        it('check w/ limit & index', async () => {
            const stub = { onProgress };
            spyOn(stub, 'onProgress').and.callThrough();

            const options: ItemQueryOptions = {
                index: 3,
                limit: 3,
                progress: stub.onProgress,
            };

            const ret = await queryItems(info, provider, options);

            expect(ret.length).toBe(3);
            expect(ret[0].name).toBe('f');
            expect(ret[1].name).toBe('g');
            expect(ret[2].name).toBe('h');
            expect(info.cache).toBeFalsy();

            expect(count).toBe(1);
            expect(stub.onProgress).toHaveBeenCalledWith({
                total: 7,
                items: ret,
                options: {
                    index: 3,
                    limit: 3,
                    progress: stub.onProgress,
                    sortKeys: [],
                    comparators: [],
                } as any,
            });
        });

        it('check w/ limit & auto', async () => {
            const stub = { onProgress };
            spyOn(stub, 'onProgress').and.callThrough();

            const options: ItemQueryOptions = {
                auto: true,
                limit: 3,
                progress: stub.onProgress,
            };

            const ret = await queryItems(info, provider, options);

            expect(ret.length).toBe(7);
            expect(ret[0].name).toBe('a');
            expect(ret[1].name).toBe('s');
            expect(ret[2].name).toBe('d');
            expect(ret[3].name).toBe('f');
            expect(ret[4].name).toBe('g');
            expect(ret[5].name).toBe('h');
            expect(ret[6].name).toBe('j');
            expect(info.cache).toBeTruthy();

            expect(count).toBe(3);
            expect(stub.onProgress).toHaveBeenCalledWith({
                total: 7,
                items: [
                    { name: 'a' },
                    { name: 's' },
                    { name: 'd' },
                ],
                options: {
                    auto: true,
                    limit: 3,
                    progress: stub.onProgress,
                    index: 0,
                    sortKeys: [],
                    comparators: [],
                } as any,
            });
            expect(stub.onProgress).toHaveBeenCalledWith({
                total: 7,
                items: [
                    { name: 'f' },
                    { name: 'g' },
                    { name: 'h' },
                ],
                options: {
                    auto: true,
                    limit: 3,
                    progress: stub.onProgress,
                    index: 3,
                    sortKeys: [],
                    comparators: [],
                } as any,
            });
            expect(stub.onProgress).toHaveBeenCalledWith({
                total: 7,
                items: [
                    { name: 'j' },
                ],
                options: {
                    auto: true,
                    limit: 3,
                    progress: stub.onProgress,
                    index: 6,
                    sortKeys: [],
                    comparators: [],
                } as any,
            });
        });

        it('check w/ no items', async () => {
            const emptyProvider = async (options?: ItemQueryOptions): Promise<CollectionItemQueryResult<Item>> => { // eslint-disable-line
                return {
                    total: 0,
                    items: [],
                    options,
                };
            };

            const ret = await queryItems(info, emptyProvider);
            expect(ret.length).toBe(0);
            expect(info.cache).toBeUndefined();
        });

        it('check w/ invalid input', async () => {
            try {
                const options: ItemQueryOptions = {
                    index: 3.1,
                };
                await queryItems(info, provider, options);
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e.code).toBe(RESULT_CODE.ERROR_MVC_INVALID_ACCESS);
                expect(e.message).toBe('invalid index: 3.1');
            }

            try {
                const options: ItemQueryOptions = {
                    limit: 3.1,
                };
                await queryItems(info, provider, options);
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e.code).toBe(RESULT_CODE.ERROR_MVC_INVALID_ACCESS);
                expect(e.message).toBe('invalid limit: 3.1');
            }
        });
    });

    describe('queryItem() w/ cache', () => {
        let info!: ItemQueryInfo;

        beforeEach(() => {
            info = {
                sortKeys: [],
                comparators: [],
                cache: {
                    total: 7,
                    items: items.slice(),
                    options: {
                        index: 0,
                    },
                },
            };
        });

        it('check w/ filter', async () => {
            const options: ItemQueryOptions = {
                comparators: [],
                filter: (item) => {
                    if ('d' === item.name || 'g' === item.name || 'f' === item.name) {
                        return false;
                    } else {
                        return true;
                    }
                },
            };

            const ret = await queryItems(info, provider, options);
            expect(ret.length).toBe(4);
            expect(ret[0].name).toBe('a');
            expect(ret[1].name).toBe('s');
            expect(ret[2].name).toBe('h');
            expect(ret[3].name).toBe('j');
        });

        it('check w/ sort', async () => {
            const options: ItemQueryOptions = {
                comparators: [
                    getStringComparator<Item>('name', SortOrder.DESC),
                ],
            };

            const ret = await queryItems(info, provider, options);

            expect(ret.length).toBe(7);
            expect(ret[0].name).toBe('s');
            expect(ret[1].name).toBe('j');
            expect(ret[2].name).toBe('h');
            expect(ret[3].name).toBe('g');
            expect(ret[4].name).toBe('f');
            expect(ret[5].name).toBe('d');
            expect(ret[6].name).toBe('a');
        });

        it('check w/ sortKeys', async () => {
            const options: ItemQueryOptions = {
                sortKeys: [{ name: 'name', order: SortOrder.DESC, type: 'string' }],
            };

            const ret = await queryItems(info, provider, options);

            expect(ret.length).toBe(7);
            expect(ret[0].name).toBe('s');
            expect(ret[1].name).toBe('j');
            expect(ret[2].name).toBe('h');
            expect(ret[3].name).toBe('g');
            expect(ret[4].name).toBe('f');
            expect(ret[5].name).toBe('d');
            expect(ret[6].name).toBe('a');
        });

        it('check w/ limit', async () => {
            const ret = await queryItems(info, provider, { limit: 3 });

            expect(ret.length).toBe(3);
            expect(ret[0].name).toBe('a');
            expect(ret[1].name).toBe('s');
            expect(ret[2].name).toBe('d');
            expect(info.cache).toBeDefined();
        });

        it('check w/ limit & index', async () => {
            const stub = { onProgress };
            spyOn(stub, 'onProgress').and.callThrough();

            const options: ItemQueryOptions = {
                index: 3,
                limit: 3,
                progress: stub.onProgress,
            };

            const ret = await queryItems(info, provider, options);

            expect(ret.length).toBe(3);
            expect(ret[0].name).toBe('f');
            expect(ret[1].name).toBe('g');
            expect(ret[2].name).toBe('h');

            expect(count).toBe(1);
            expect(stub.onProgress).toHaveBeenCalledWith({
                total: 7,
                items: ret,
                options: {
                    index: 3,
                    limit: 3,
                    progress: stub.onProgress,
                    sortKeys: [],
                    comparators: [],
                } as any,
            });
        });

        it('check w/ limit & auto', async () => {
            const stub = { onProgress };
            spyOn(stub, 'onProgress').and.callThrough();

            const options: ItemQueryOptions = {
                auto: true,
                limit: 3,
                progress: stub.onProgress,
            };

            const ret = await queryItems(info, provider, options);

            expect(ret.length).toBe(7);
            expect(ret[0].name).toBe('a');
            expect(ret[1].name).toBe('s');
            expect(ret[2].name).toBe('d');
            expect(ret[3].name).toBe('f');
            expect(ret[4].name).toBe('g');
            expect(ret[5].name).toBe('h');
            expect(ret[6].name).toBe('j');

            expect(count).toBe(3);
            expect(stub.onProgress).toHaveBeenCalledWith({
                total: 7,
                items: [
                    { name: 'a' },
                    { name: 's' },
                    { name: 'd' },
                ],
                options: {
                    auto: true,
                    limit: 3,
                    progress: stub.onProgress,
                    index: 0,
                    sortKeys: [],
                    comparators: [],
                } as any,
            });
            expect(stub.onProgress).toHaveBeenCalledWith({
                total: 7,
                items: [
                    { name: 'f' },
                    { name: 'g' },
                    { name: 'h' },
                ],
                options: {
                    auto: true,
                    limit: 3,
                    progress: stub.onProgress,
                    index: 3,
                    sortKeys: [],
                    comparators: [],
                } as any,
            });
            expect(stub.onProgress).toHaveBeenCalledWith({
                total: 7,
                items: [
                    { name: 'j' },
                ],
                options: {
                    auto: true,
                    limit: 3,
                    progress: stub.onProgress,
                    index: 6,
                    sortKeys: [],
                    comparators: [],
                } as any,
            });
        });

        it('check w/ noSearch', async () => {
            info.sortKeys = [{ name: 'name', order: SortOrder.DESC, type: 'string' }];
            info.filter = (item) => {
                if ('d' === item.name || 'g' === item.name || 'f' === item.name) {
                    return false;
                } else {
                    return true;
                }
            };

            const options: ItemQueryOptions = {
                noSearch: true,
            };

            const ret = await queryItems(info, provider, options);

            expect(ret.length).toBe(7);
            expect(ret[0].name).toBe('a');
            expect(ret[1].name).toBe('s');
            expect(ret[2].name).toBe('d');
            expect(ret[3].name).toBe('f');
            expect(ret[4].name).toBe('g');
            expect(ret[5].name).toBe('h');
            expect(ret[6].name).toBe('j');
        });

        it('check w/ invalid input', async () => {
            try {
                const options: ItemQueryOptions = {
                    index: 3.1,
                };
                await queryItems(info, provider, options);
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e.code).toBe(RESULT_CODE.ERROR_MVC_INVALID_ACCESS);
                expect(e.message).toBe('invalid index: 3.1');
            }

            try {
                const options: ItemQueryOptions = {
                    limit: 3.1,
                };
                await queryItems(info, provider, options);
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e.code).toBe(RESULT_CODE.ERROR_MVC_INVALID_ACCESS);
                expect(e.message).toBe('invalid limit: 3.1');
            }
        });
    });

    describe('conditionalFix()', () => {
        it('check random', (): void => {
            const cond = new DynamicCondition<Track>({
                operators: [],
                random: true,
            });

            const result = conditionalFix(tracks.slice(), cond);

            expect(result.total).toBe(6);
            expect(result.items).not.toEqual(tracks);
        });

        it('check limit', (): void => {
            // count
            let cond = new DynamicCondition<Track>({
                operators: [],
                limit: {
                    unit: DynamicLimit.COUNT,
                    prop: undefined,
                    value: 3,
                },
            });

            let result = conditionalFix(tracks.slice(), cond);

            expect(result.total).toBe(3);
            expect(result.items[0].title).toBe('001');
            expect(result.items[1].title).toBe('002');
            expect(result.items[2].title).toBe('003');

            // KB criteria
            cond = new DynamicCondition<Track>({
                operators: [],
                limit: {
                    unit: DynamicLimit.KB,
                    prop: 'size',
                    value: 1000,
                },
            });

            result = conditionalFix(tracks.slice(), cond);
            expect(result.total).toBe(2);

            // excess
            cond = new DynamicCondition<Track>({
                operators: [],
                limit: {
                    unit: DynamicLimit.SECOND,
                    prop: 'duration',
                    value: 14,
                    excess: true,
                },
            });

            result = conditionalFix(tracks.slice(), cond);
            expect(result.total).toBe(3);

            // missing prop
            cond = new DynamicCondition<Track>({
                operators: [],
                limit: {
                    unit: DynamicLimit.SECOND,
                    prop: 'n/a' as any,
                    value: 10,
                },
            });

            result = conditionalFix(tracks.slice(), cond);
            expect(result.total).toBe(0);
        });

        it('check sumKey', (): void => {
            const cond = new DynamicCondition<Track>({
                operators: [],
                sumKeys: [
                    'duration',
                ],
            });

            const result = conditionalFix(tracks.slice(), cond) as CollectionItemQueryResult<Track, 'duration'>;

            expect(result.total).toBe(6);
            expect(result.duration).toBe(31000);
        });

        describe('queryItems() w/ condition', () => {
            let info!: TrackQueryInfo;

            beforeEach(() => {
                info = {
                    sortKeys: [],
                    comparators: [],
                };
            });

            const provider2 = async (options?: TrackQueryOptions): Promise<CollectionItemQueryResult<Track>> => {
                const opts = Object.assign({ comparators: [] }, options);
                const {
                    index,
                    limit,
                    cancel: token,
                    condition,
                } = opts;

                await cc(token);

                const targets = tracks.slice();

                const nextOptions = (() => {
                    const no = { condition };
                    return isEmptyObject(no) ? undefined : no;
                })();

                if (null == index && null == limit) {
                    return {
                        total: targets.length,
                        items: targets,
                        options: nextOptions,
                    };
                } else {
                    const idx = index ?? 0;
                    const result = targets.slice(idx, (null != limit) ? idx + limit : undefined);
                    return {
                        total: targets.length,
                        items: result,
                        options: nextOptions,
                    };
                }
            };

            it('check w/ condition', async () => {
                const options: TrackQueryOptions = {
                    sortKeys: [
                        { name: 'duration', order: SortOrder.ASC, type: 'number' }
                    ],
                    condition: {
                        operators: [{
                            operator: DynamicOperator.EQUAL,
                            prop: 'compilation',
                            value: true,
                        }],
                    },
                };

                let ret = await queryItems(info, provider2, options);

                expect(ret.length).toBe(2);
                expect(ret[0].title).toBe('005');
                expect(ret[1].title).toBe('002');

                // cache
                ret = await queryItems(info, provider2, options);
                expect(ret.length).toBe(2);
                expect(ret[0].title).toBe('005');
                expect(ret[1].title).toBe('002');
            });

            it('check w/ noCache', async () => {
                const options: TrackQueryOptions = {
                    sortKeys: [
                        { name: 'duration', order: SortOrder.ASC, type: 'number' }
                    ],
                    condition: {
                        operators: [{
                            operator: DynamicOperator.EQUAL,
                            prop: 'compilation',
                            value: true,
                        }],
                    },
                    noCache: true,
                };

                const ret = await queryItems(info, provider2, options);

                expect(ret.length).toBe(2);
                expect(ret[0].title).toBe('005');
                expect(ret[1].title).toBe('002');
                expect(info.cache).toBeUndefined();
            });
        });
    });
});
