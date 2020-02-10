/* eslint-disable
   @typescript-eslint/no-explicit-any
 */

import { isFunction } from '@cdp/core-utils';
import { checkCanceled as cc } from '@cdp/promise';
import { RESULT_CODE } from '@cdp/result';
import {
    SortOrder,
    FilterCallback,
    SortCallback,
    CollectionQueryOptions,
    CollectionQueryInfo,
    CollectionFetchResult,
    getStringComparator,
    queryItems,
    searchItems,
} from '@cdp/collection';

interface Item {
    name: string;
}

type ItemSortKeys = keyof Pick<Item, 'name'>;
type ItemQueryOptions = CollectionQueryOptions<Item, ItemSortKeys>;
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

const provider = async (options?: ItemQueryOptions): Promise<CollectionFetchResult<Item>> => {
    const opts = Object.assign({ comparators: [] }, options);
    const {
        filter,
        comparators,
        index,
        limit,
        cancel: token,
    } = opts;

    await cc(token);

    const targets = ((filter?: FilterCallback<Item> | null, ...comparators: SortCallback<Item>[]) => {
        const result = isFunction(filter) ? [...items].filter(filter) : [...items];
        for (const comparator of comparators) {
            isFunction(comparator) && result.sort(comparator);
        }
        return result;
    })(filter, ...comparators);

    if (null == index && null == limit) {
        return {
            total: targets.length,
            items: targets,
        };
    } else {
        const idx = (null == index) ? 0 : index;
        const result = targets.slice(idx, (null != limit) ? idx + limit : undefined); // eslint-disable-line
        return {
            total: targets.length,
            items: result,
        };
    }
};

describe('query spec', () => {
    let count: number;

    beforeEach(() => {
        count = 0;
    });

    // eslint-disable-next-line
    const onProgress = (progress: CollectionFetchResult<any>): void => {
        count++;
    };

    describe('searchItems()', () => {
        it('check searchItems() /w no filter, no comparators', (): void => {
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

        it('check searchItems() /w filter', (): void => {
            const searched = searchItems(items, item => 'd' === item.name || 'f' === item.name);
            expect(searched.length).toBe(2);
            expect(searched[0].name).toBe('d');
            expect(searched[1].name).toBe('f');
        });

        it('check searchItems() /w comparators', (): void => {
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

    describe('queryItem() /w provider', () => {
        let info!: ItemQueryInfo;

        beforeEach(() => {
            info = {
                sortKeys: [],
                comparators: [],
            };
        });

        it('check /w filter', async done => {
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
            expect(info.comparators).toBe(options.comparators as any);

            done();
        });

        it('check /w sort', async done => {
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

            done();
        });

        it('check /w sortKeys', async done => {
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

            done();
        });

        it('check /w limit & index', async done => {
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

            done();
        });

        it('check /w limit & auto', async done => {
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

            done();
        });

        it('check /w invalid input', async done => {
            try {
                const options: ItemQueryOptions = {
                    index: 3.1,
                };
                await queryItems(info, provider, options);
                expect('UNEXPECTED FLOW').toBeNull();
            } catch (e) {
                expect(e.code).toBe(RESULT_CODE.ERROR_MVC_INVALID_ACCESS);
                expect(e.message).toBe('invalid index: 3.1');
            }

            try {
                const options: ItemQueryOptions = {
                    limit: 3.1,
                };
                await queryItems(info, provider, options);
                expect('UNEXPECTED FLOW').toBeNull();
            } catch (e) {
                expect(e.code).toBe(RESULT_CODE.ERROR_MVC_INVALID_ACCESS);
                expect(e.message).toBe('invalid limit: 3.1');
            }

            done();
        });
    });

    describe('queryItem() /w cache', () => {
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

        it('check /w filter', async done => {
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

            done();
        });

        it('check /w sort', async done => {
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

            done();
        });

        it('check /w sortKeys', async done => {
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

            done();
        });

        it('check /w limit & index', async done => {
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

            done();
        });

        it('check /w limit & auto', async done => {
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

            done();
        });

        it('check /w noSearch', async done => {
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

            done();
        });

        it('check /w invalid input', async done => {
            try {
                const options: ItemQueryOptions = {
                    index: 3.1,
                };
                await queryItems(info, provider, options);
                expect('UNEXPECTED FLOW').toBeNull();
            } catch (e) {
                expect(e.code).toBe(RESULT_CODE.ERROR_MVC_INVALID_ACCESS);
                expect(e.message).toBe('invalid index: 3.1');
            }

            try {
                const options: ItemQueryOptions = {
                    limit: 3.1,
                };
                await queryItems(info, provider, options);
                expect('UNEXPECTED FLOW').toBeNull();
            } catch (e) {
                expect(e.code).toBe(RESULT_CODE.ERROR_MVC_INVALID_ACCESS);
                expect(e.message).toBe('invalid limit: 3.1');
            }

            done();
        });
    });
});
