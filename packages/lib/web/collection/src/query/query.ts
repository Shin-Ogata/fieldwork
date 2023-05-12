import {
    Keys,
    isFunction,
    sort,
    shuffle,
} from '@cdp/core-utils';
import { checkCanceled as cc } from '@cdp/promise';
import { RESULT_CODE, makeResult } from '@cdp/result';
import {
    SortKey,
    SortCallback,
    FilterCallback,
    CollectionItemQueryOptions,
    CollectionItemQueryResult,
    CollectionQueryInfo,
    CollectionItemProvider,
    DynamicLimit,
} from '../interfaces';
import { convertSortKeys } from '../utils/comparator';
import { DynamicCondition } from './dynamic-condition';

const {
    /** @internal */ trunc
} = Math;

/** @internal 使用するプロパティが保証された CollectionItemQueryOptions */
interface SafeCollectionQueryOptions<TItem extends object, TKey extends Keys<TItem>> extends CollectionItemQueryOptions<TItem, TKey> {
    sortKeys: SortKey<TKey>[];
    comparators: SortCallback<TItem>[];
}

//__________________________________________________________________________________________________//

/**
 * @en Apply `filter` and `sort key` to the `items` from {@link queryItems}() result.
 * @ja {@link queryItems}() した `items` に対して `filter` と `sort key` を適用
 */
export function searchItems<TItem>(items: TItem[], filter?: FilterCallback<TItem> | null, ...comparators: SortCallback<TItem>[]): TItem[] {
    let result = isFunction(filter) ? items.filter(filter) : items.slice();
    for (const comparator of comparators) {
        if (isFunction(comparator)) {
            result = sort(result, comparator);
        }
    }
    return result;
}

//__________________________________________________________________________________________________//

/** @internal conditinalFix に使用する Criteria Map */
const _limitCriteria = {
    [DynamicLimit.COUNT]: null,
    [DynamicLimit.SUM]: { coeff: 1 },
    [DynamicLimit.SECOND]: { coeff: 1000 },
    [DynamicLimit.MINUTE]: { coeff: 60 * 1000 },
    [DynamicLimit.HOUR]: { coeff: 60 * 60 * 1000 },
    [DynamicLimit.DAY]: { coeff: 24 * 60 * 60 * 1000 },
    [DynamicLimit.KB]: { coeff: 1024 },
    [DynamicLimit.MB]: { coeff: 1024 * 1024 },
    [DynamicLimit.GB]: { coeff: 1024 * 1024 * 1024 },
    [DynamicLimit.TB]: { coeff: 1024 * 1024 * 1024 * 1024 },
};

/**
 * @en Fix the target items by {@link DynamicCondition}.
 * @ja {@link DynamicCondition} に従い対象を整形
 *
 * @param items
 *  - `en` target items (destructive)
 *  - `ja` 対象のアイテム (破壊的)
 * @param condition
 *  - `en` condition object
 *  - `ja` 条件オブジェクト
 */
export function conditionalFix<TItem extends object, TKey extends Keys<TItem> = Keys<TItem>>(
    items: TItem[],
    condition: DynamicCondition<TItem, TKey>
): CollectionItemQueryResult<TItem> {
    const { random, limit, sumKeys } = condition;

    if (random) {
        shuffle(items, true);
    }

    if (limit) {
        const { unit, value, prop } = limit;
        const reset: TItem[] = [];
        const criteria = _limitCriteria[unit];
        const limitCount = value;
        const excess = !!limit.excess;
        let count = 0;
        for (const item of items) {
            if (!criteria) {
                count++;
            } else if (null != item[prop as Keys<TItem>]) {
                count += (Number(item[prop as Keys<TItem>]) / criteria.coeff);
            } else {
                console.warn(`cannot access property: ${prop}`);
                continue;
            }

            if (limitCount < count) {
                if (excess) {
                    reset.push(item);
                }
                break;
            } else {
                reset.push(item);
            }
        }
        items = reset;
    }

    const result = {
        total: items.length,
        items,
    } as CollectionItemQueryResult<TItem, Keys<TItem>>;

    if (0 < sumKeys.length) {
        for (const item of items) {
            for (const key of sumKeys) {
                if (!(key in result)) {
                    (result[key] as unknown as number) = 0;
                }
                (result[key] as unknown as number) += Number(item[key]);
            }
        }
    }

    return result;
}

//__________________________________________________________________________________________________//

/** @internal すでにキャッシュされている対象に対して CollectionItemQueryOptions に指定された振る舞いを行う内部 query 関数 */
async function queryFromCache<TItem extends object, TKey extends Keys<TItem>>(
    cached: TItem[],
    options: SafeCollectionQueryOptions<TItem, TKey>
): Promise<CollectionItemQueryResult<TItem>> {
    const {
        filter,
        comparators,
        index: baseIndex,
        limit,
        cancel: token,
        progress,
        auto,
        noSearch,
    } = options;

    // 対象なし
    if (!cached.length) {
        return {
            total: 0,
            items: [],
            options,
        } as CollectionItemQueryResult<TItem>;
    }

    // キャッシュに対してフィルタリング, ソートを実行
    const targets = noSearch ? cached.slice() : searchItems(cached, filter, ...comparators);

    const results: TItem[] = [];
    let index: number = (null != baseIndex) ? baseIndex : 0;

    while (true) {
        await cc(token);
        if (index < 0 || targets.length <= index || trunc(index) !== index) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid index: ${index}`);
        } else if (null != limit && (limit <= 0 || trunc(limit) !== limit)) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid limit: ${ limit }`);
        }

        const opts = Object.assign(options, { index });
        const items = targets.slice(index, (null != limit) ? index + limit : undefined);

        results.push(...items);

        const retval = {
            total: targets.length,
            items,
            options: { ...opts } as CollectionItemQueryOptions<TItem>,
        } as CollectionItemQueryResult<TItem>;

        // 進捗通知
        if (isFunction(progress)) {
            progress({ ...retval });
        }

        if (auto && null != limit) {
            if (targets.length <= index + limit) {
                // 自動継続指定時には最後にすべての item を返却
                retval.items = results;
            } else {
                index += items.length;
                continue;
            }
        }

        return retval;
    }
}

/** @internal レスポンスのキャッシュを試行 */
function tryCache<TItem extends object, TKey extends Keys<TItem>>(
    queryInfo: CollectionQueryInfo<TItem, TKey>,
    result: CollectionItemQueryResult<TItem>,
    options: CollectionItemQueryOptions<TItem>
): void {
    const { noCache, noSearch } = options;
    const canCache = !noCache && !noSearch && result.total && result.total === result.items.length;
    if (canCache) {
        queryInfo.cache = { ...result };
        delete queryInfo.cache.options;
    }
}

/** @internal `provider` 関数を使用して CollectionItemQueryOptions に指定された振る舞いを行う内部 `query` 関数 */
async function queryFromProvider<TItem extends object, TKey extends Keys<TItem>>(
    queryInfo: CollectionQueryInfo<TItem, TKey>,
    provider: CollectionItemProvider<TItem, TKey>,
    options: SafeCollectionQueryOptions<TItem, TKey>
): Promise<CollectionItemQueryResult<TItem>> {
    const {
        index: baseIndex,
        limit,
        cancel: token,
        progress,
        auto,
    } = options;

    const results: TItem[] = [];

    const receivedAll = (resp: CollectionItemQueryResult<TItem>): boolean => {
        const hasCond = !!resp.options?.condition;
        return hasCond || resp.total === resp.items.length;
    };

    let index: number = (null != baseIndex) ? baseIndex : 0;

    while (true) {
        await cc(token);
        if (index < 0 || trunc(index) !== index) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid index: ${index}`);
        } else if (null != limit && (limit <= 0 || trunc(limit) !== limit)) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid limit: ${limit}`);
        }

        const opts = Object.assign(options, { index });
        let resp = await provider(opts);
        const nextOpts = Object.assign({}, opts, resp.options);

        if (receivedAll(resp)) {
            tryCache(queryInfo, resp, nextOpts);

            const { noSearch, condition: seed } = nextOpts;
            if (seed) {
                const condition = new DynamicCondition(seed);
                resp = conditionalFix(searchItems(
                    resp.items,
                    condition.filter,
                    ...condition.comparators
                ), condition);

                if (queryInfo.cache) {
                    Object.assign(queryInfo.cache, resp);
                    delete queryInfo.cache.options;
                }
            }

            return queryFromCache(resp.items, Object.assign(opts, { noSearch }));
        }// eslint-disable-line brace-style

        else {
            results.push(...resp.items);

            const retval = {
                total: resp.total,
                items: resp.items,
                options: nextOpts,
            } as CollectionItemQueryResult<TItem>;

            // 進捗通知
            if (isFunction(progress)) {
                progress({ ...retval });
            }

            if (auto && null != limit) {
                if (resp.total <= index + limit) {
                    // 自動継続指定時には最後にすべての item を返却
                    retval.items = results;
                } else {
                    index += resp.items.length;
                    continue;
                }
            }

            tryCache(queryInfo, retval, nextOpts);
            return retval;
        }
    }
}

//__________________________________________________________________________________________________//

/** @internal SafeCollectionQueryOptions に変換 */
function ensureOptions<TItem extends object, TKey extends Keys<TItem>>(
    options: CollectionItemQueryOptions<TItem, TKey> | undefined
): SafeCollectionQueryOptions<TItem, TKey> {
    const opts = Object.assign({ sortKeys: [] }, options);
    const { noSearch, sortKeys } = opts;

    if (!noSearch && (!opts.comparators || opts.comparators.length <= 0)) {
        opts.comparators = convertSortKeys(sortKeys);
    }

    return opts as SafeCollectionQueryOptions<TItem, TKey>;
}

/**
 * @en Low level function for {@link Collection} query items.
 * @ja {@link Collection} Item をクエリする低レベル関数
 *
 * @param queryInfo
 *  - `en` query information
 *  - `ja` クエリ情報
 * @param provider
 *  - `en` provider function
 *  - `ja` プロバイダ関数
 * @param options
 *  - `en` query options
 *  - `ja` クエリオプション
 */
export async function queryItems<TItem extends object, TKey extends Keys<TItem>>(
    queryInfo: CollectionQueryInfo<TItem, TKey>,
    provider: CollectionItemProvider<TItem, TKey>,
    options?: CollectionItemQueryOptions<TItem, TKey>
): Promise<TItem[]> {
    const opts = ensureOptions(options);
    const { sortKeys, comparators, filter } = opts;

    // query に使用した sort, filter 情報をキャッシュ
    Object.assign(queryInfo, { sortKeys, comparators, filter });

    if (queryInfo.cache) {
        return (await queryFromCache(queryInfo.cache.items, opts)).items;
    } else {
        return (await queryFromProvider(queryInfo, provider, opts)).items;
    }
}
