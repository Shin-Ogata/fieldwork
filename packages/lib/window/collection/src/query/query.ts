/* eslint-disable
    @typescript-eslint/restrict-template-expressions
 */

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
    CollectionQueryOptions,
    CollectionFetchResult,
    CollectionQueryInfo,
    CollectionItemProvider,
    DynamicLimit,
} from '../interfaces';
import { convertSortKeys } from '../utils/comparator';
import { DynamicCondition } from './dynamic-condition';

const { trunc } = Math;

/** @internal 使用するプロパティが保証された CollectionQueryOptions */
interface SafeCollectionQueryOptions<TItem extends object, TKey extends Keys<TItem>> extends CollectionQueryOptions<TItem, TKey> {
    sortKeys: SortKey<TKey>[];
    comparators: SortCallback<TItem>[];
}

//__________________________________________________________________________________________________//

/**
 * @en Apply `filter` and `sort key` to the `items` from [[queryItems]]`()` result.
 * @ja [[queryItems]]`()` した `items` に対して `filter` と `sort key` を適用
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

/** @internal すでにキャッシュされている対象に対して CollectionQueryOptions に指定された振る舞いを行う内部 query 関数 */
async function queryFromCache<TItem extends object, TKey extends Keys<TItem>>(
    cached: TItem[],
    options: SafeCollectionQueryOptions<TItem, TKey>
): Promise<CollectionFetchResult<TItem>> {
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

    // キャッシュに対してフィルタリング, ソートを実行
    const targets = noSearch ? cached.slice() : searchItems(cached, filter, ...comparators);

    let index: number = (null != baseIndex) ? baseIndex : 0;

    while (true) {
        await cc(token);
        if (index < 0 || targets.length <= index || trunc(index) !== index) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid index: ${index}`);
        } else if (null != limit && (limit <= 0 || trunc(limit) !== limit)) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid limit: ${ options.limit }`);
        }

        const opts = Object.assign(options, { index });
        const result = targets.slice(index, (null != limit) ? index + limit : undefined);

        const retval = {
            total: targets.length,
            items: result,
            options: { ...opts } as CollectionQueryOptions<TItem>,
        } as CollectionFetchResult<TItem>;

        // 進捗通知
        if (isFunction(progress)) {
            progress({ ...retval });
        }

        if (auto && null != limit) {
            if (targets.length <= index + limit) {
                // 自動継続指定時には最後にすべての item を返却
                retval.items = targets;
            } else {
                index += result.length;
                continue;
            }
        }

        return retval;
    }
}

/** @internal `provider` 関数を使用して CollectionQueryOptions に指定された振る舞いを行う内部 `query` 関数 */
async function queryFromProvider<TItem extends object, TKey extends Keys<TItem>>(
    provider: CollectionItemProvider<TItem, TKey>,
    options: CollectionQueryOptions<TItem, TKey>
): Promise<CollectionFetchResult<TItem>> {
    const {
        index: baseIndex,
        limit,
        cancel: token,
        progress,
        auto,
    } = options;

    const targets: TItem[] = [];

    let index: number = (null != baseIndex) ? baseIndex : 0;

    while (true) {
        await cc(token);
        if (index < 0 || trunc(index) !== index) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid index: ${index}`);
        } else if (null != limit && (limit <= 0 || trunc(limit) !== limit)) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid limit: ${options.limit}`);
        }

        const opts = Object.assign(options, { index });
        const result = await provider(opts);

        targets.push(...result.items);

        const retval = {
            total: result.total,
            items: result.items,
            options: Object.assign({}, opts, result.options) as CollectionQueryOptions<TItem>,
        } as CollectionFetchResult<TItem>;

        // 進捗通知
        if (isFunction(progress)) {
            progress({ ...retval });
        }

        if (auto && null != limit) {
            if (result.total <= index + limit) {
                // 自動継続指定時には最後にすべての item を返却
                retval.items = targets;
            } else {
                index += result.items.length;
                continue;
            }
        }

        return retval;
    }
}

//__________________________________________________________________________________________________//

/** @internal conditinalFix に使用する Criteria Map */
const _limitCriteria = {
    [DynamicLimit.COUNT]: null,
    [DynamicLimit.SUM]:     { coeff: 1 },
    [DynamicLimit.SECOND]:  { coeff: 1000 },
    [DynamicLimit.MINUTE]:  { coeff: 60 * 1000 },
    [DynamicLimit.HOUR]:    { coeff: 60 * 60 * 1000 },
    [DynamicLimit.DAY]:     { coeff: 24 * 60 * 60 * 1000 },
    [DynamicLimit.KB]:      { coeff: 1024 },
    [DynamicLimit.MB]:      { coeff: 1024 * 1024 },
    [DynamicLimit.GB]:      { coeff: 1024 * 1024 * 1024 },
    [DynamicLimit.TB]:      { coeff: 1024 * 1024 * 1024 * 1024 },
};

/**
 * @en Fix the target items by [[DynamicCondition]].
 * @ja [[DynamicCondition]] に従い対象を整形
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
): CollectionFetchResult<TItem> {
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
    } as CollectionFetchResult<TItem, Keys<TItem>>;

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

/** @internal SafeCollectionQueryOptions に変換 */
function ensureOptions<TItem extends object, TKey extends Keys<TItem>>(
    options: CollectionQueryOptions<TItem, TKey> | undefined
): SafeCollectionQueryOptions<TItem, TKey> {
    const opts = Object.assign({ sortKeys: [] }, options);
    const { noSearch, sortKeys } = opts;

    if (!noSearch && (!opts.comparators || opts.comparators.length <= 0)) {
        opts.comparators = convertSortKeys(sortKeys);
    }

    return opts as SafeCollectionQueryOptions<TItem, TKey>;
}

/** @internal キャッシュ可能か判定 */
function canCache<TItem extends object>(result: CollectionFetchResult<TItem>, options: CollectionQueryOptions<TItem>): boolean {
    const { noCache, noSearch } = options;
    return !noCache && !noSearch && result.total === result.items.length;
}

/**
 * @en Low level function for [[Collection]] query items.
 * @ja [[Collection]] Item をクエリする低レベル関数
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
    options?: CollectionQueryOptions<TItem, TKey>
): Promise<TItem[]> {
    const opts = ensureOptions(options);
    const { sortKeys, comparators, filter } = opts;

    // query に使用した sort, filter 情報をキャッシュ
    queryInfo.sortKeys    = sortKeys;
    queryInfo.comparators = comparators;
    queryInfo.filter      = filter;

    if (queryInfo.cache) {
        return (await queryFromCache(queryInfo.cache.items, opts)).items;
    } else {
        let result = await queryFromProvider(provider, opts);
        const nextOpts = result.options as CollectionQueryOptions<TItem>;
        if (canCache(result, nextOpts)) {
            queryInfo.cache = { ...result };
            delete queryInfo.cache.options;
        }

        const { noSearch, condition: seed } = nextOpts;
        if (seed) {
            const condition = new DynamicCondition(seed);
            result = conditionalFix(searchItems(
                result.items,
                condition.filter,
                ...condition.comparators
            ), condition);

            if (queryInfo.cache) {
                Object.assign(queryInfo.cache, result);
                delete queryInfo.cache.options;
            }
        }

        return noSearch ? result.items : searchItems(result.items, filter, ...comparators);
    }
}
