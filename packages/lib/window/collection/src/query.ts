import { isFunction, sort } from '@cdp/core-utils';
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
} from './interfaces';
import { toComparator } from './utils/comparator';

const { trunc } = Math;

/** @internal 使用するプロパティが保証された CollectionQueryOptions */
interface SafeCollectionQueryOptions<TItem extends {}, TKey extends string> extends CollectionQueryOptions<TItem, TKey> {
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
async function queryFromCache<TItem extends {}, TKey extends string>(
    cached: TItem[],
    options: SafeCollectionQueryOptions<TItem, TKey>
): Promise<TItem[]> {
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

        // 進捗通知
        if (isFunction(progress)) {
            progress({
                total: targets.length,
                items: result,
                options: { ...opts },
            });
        }

        if (auto && null != limit) {
            if (targets.length <= index + limit) {
                // 自動継続指定時には最後にすべての item を返却
                return targets;
            } else {
                index += result.length;
            }
        } else {
            return result;
        }
    }
}

/** @internal `provider` 関数を使用して CollectionQueryOptions に指定された振る舞いを行う内部 `query` 関数 */
async function queryFromProvider<TItem extends {}, TKey extends string>(
    queryInfo: CollectionQueryInfo<TItem, TKey>,
    provider: CollectionItemProvider<TItem, TKey>,
    options: CollectionQueryOptions<TItem, TKey>
): Promise<TItem[]> {
    const {
        filter,
        index: baseIndex,
        limit,
        cancel: token,
        progress,
        auto,
        noCache,
    } = options;

    const targets: TItem[] = [];

    const canCache = (result: CollectionFetchResult<TItem>): boolean => {
        return !noCache && (!isFunction(filter) && result.total <= targets.length);
    };

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
        if (canCache(result)) {
            queryInfo.cache = {
                total: result.total,
                items: targets,
            };
        }

        // 進捗通知
        if (isFunction(progress)) {
            progress({
                total: result.total,
                items: result.items,
                options: { ...opts },
            });
        }

        if (auto && null != limit) {
            if (result.total <= index + limit) {
                // 自動継続指定時には最後にすべての item を返却
                return targets;
            } else {
                index += result.items.length;
            }
        } else {
            return result.items;
        }
    }
}

/** @internal SafeCollectionQueryOptions に変換 */
function ensureOptions<TItem extends {}, TKey extends string>(
    options: CollectionQueryOptions<TItem, TKey> | undefined
): SafeCollectionQueryOptions<TItem, TKey> {
    const opts = Object.assign({ sortKeys: [] }, options);
    const { noSearch, sortKeys } = opts;

    if (!noSearch && !opts.comparators) {
        const comparators = [];
        for (const sortKey of sortKeys) {
            comparators.push(toComparator(sortKey));
        }
        opts.comparators = comparators;
    }

    return opts as SafeCollectionQueryOptions<TItem, TKey>;
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
export async function queryItems<TItem extends {}, TKey extends string>(
    queryInfo: CollectionQueryInfo<TItem, TKey>,
    provider: CollectionItemProvider<TItem, TKey>,
    options?: CollectionQueryOptions<TItem, TKey>
): Promise<TItem[]> {
    const opts = ensureOptions(options);

    // query に使用した sort, filter 情報をキャッシュ
    queryInfo.sortKeys    = opts.sortKeys;
    queryInfo.comparators = opts.comparators;
    queryInfo.filter      = opts.filter;

    if (queryInfo.cache) {
        return queryFromCache(queryInfo.cache.items, opts);
    } else {
        return queryFromProvider(queryInfo, provider, opts);
    }
}
