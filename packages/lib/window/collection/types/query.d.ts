import { SortCallback, FilterCallback, CollectionQueryOptions, CollectionQueryInfo, CollectionItemProvider } from './interfaces';
/**
 * @en Apply `filter` and `sort key` to the `items` from [[queryItems]]`()` result.
 * @ja [[queryItems]]`()` した `items` に対して `filter` と `sort key` を適用
 */
export declare function searchItems<TItem>(items: TItem[], filter?: FilterCallback<TItem> | null, ...comparators: SortCallback<TItem>[]): TItem[];
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
export declare function queryItems<TItem extends {}, TKey extends string>(queryInfo: CollectionQueryInfo<TItem, TKey>, provider: CollectionItemProvider<TItem, TKey>, options?: CollectionQueryOptions<TItem, TKey>): Promise<TItem[]>;
