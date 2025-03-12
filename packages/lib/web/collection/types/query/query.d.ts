import { type Keys } from '@cdp/core-utils';
import { type SortCallback, type FilterCallback, type CollectionItemQueryOptions, type CollectionItemQueryResult, type CollectionQueryInfo, type CollectionItemProvider } from '../interfaces';
import { DynamicCondition } from './dynamic-condition';
/**
 * @en Apply `filter` and `sort key` to the `items` from {@link queryItems}() result.
 * @ja {@link queryItems}() した `items` に対して `filter` と `sort key` を適用
 */
export declare function searchItems<TItem>(items: TItem[], filter?: FilterCallback<TItem> | null, ...comparators: SortCallback<TItem>[]): TItem[];
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
export declare function conditionalFix<TItem extends object, TKey extends Keys<TItem> = Keys<TItem>>(items: TItem[], condition: DynamicCondition<TItem, TKey>): CollectionItemQueryResult<TItem>;
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
export declare function queryItems<TItem extends object, TKey extends Keys<TItem>>(queryInfo: CollectionQueryInfo<TItem, TKey>, provider: CollectionItemProvider<TItem, TKey>, options?: CollectionItemQueryOptions<TItem, TKey>): Promise<TItem[]>;
