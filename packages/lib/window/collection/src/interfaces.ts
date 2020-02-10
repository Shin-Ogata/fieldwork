import { Cancelable } from '@cdp/promise';

/**
 * @en Sort order const definitions.
 * @ja ソート順
 */
export const enum SortOrder {
    /** `en` no sort <br> `ja` ソートしない */
    NO = 0,
    /** `en` ascending <br> `ja` 昇順 */
    ASC = 1,
    /** `en` descending <br> `ja` 降順 */
    DESC = -1,
}

/**
 * @en Callback type for using `sort()` function.
 * @ja `sort()` に指定されるコールバック関数
 */
export type SortCallback<T> = (lhs: T, rhs: T) => number;

/**
 * @en Callback type for using `filter()` function.
 * @ja `filter()` に指定されるコールバック関数
 */
export type FilterCallback<T> = (target: T) => boolean;

/**
 * @en Sort key type definition.
 * @ja ソートキーの型定義
 */
export type SortKeyType = 'string' | 'number' | 'date' | 'boolean';

/**
 * @en Generic sort key interface definition.
 * @ja 汎用のソートキー定義
 */
export interface SortKey<TKey extends string> {
    /**
     * @en Key name.
     * @ja Key 名
     */
    name: TKey;

    /**
     * @en Sort order. (NO / ASC / DESC)
     * @ja 昇順 / 降順
     */
    order: SortOrder;

    /**
     * @en Type of sort target property.
     * @ja ソート対象プロパティの型
     */
    type: SortKeyType;
}

/**
 * @en [[Collection]] sort options.
 * @ja [[Collection]] の sort に使用するオプション
 */
export interface CollectionSortOptions<TItem extends {}, TKey extends string> {
    /**
     * @en Sort key properties. <br>
     *     An end of element is given priority to.
     * @ja ソートキー指定 <br>
     *     配列の末尾ほど優先される
     *
     * @example <br>
     *  valid value: keys[0], keys[1], keys[2]
     *      first sort key : keys[2]
     *      second sort key: keys[1]
     *      third sort key : keys[0]
     */
    sortKeys?: SortKey<TKey>[];

    /**
     * @en Sort comparator functions <br>
     *     When sorting more in control, it's designated. <br>
     *     When this property given, [[sortKeys]] is ignored.
     * @ja 比較関数指定 <br>
     *     より自由度の高いソートを行うときに指定 <br>
     *     このプロパティが指定されるとき, [[sortKeys]] は無視される
     */
    comparators?: SortCallback<TItem>[];
}

/**
 * @en [[Collection]] filter options.
 * @ja [[Collection]] の filter に使用するオプション
 */
export interface CollectionFilterOptions<TItem extends {}> {
    /**
     * @en filter function.
     * @ja フィルタ関数を指定
     */
    filter?: FilterCallback<TItem>;
}

/**
 * @en Base option interface for [[Collection]]`#fetch()`.
 * @ja [[Collection]]`#fetch()` に使用する基底オプション
 */
export interface CollectionFetchLimitOptions extends Cancelable {
    /**
     * @en query start index. default: 0
     * @ja 取得開始 Index を指定 default: 0
     */
    index?: number;

    /**
     * @en The limit number of acquisition items per one query.
     * @ja 1回の query で制限する 取得コンテンツ数
     */
    limit?: number;
}

/**
 * @en Progress option interface for [[Collection]]`#fetch()`.
 * @ja [[Collection]]`#fetch()` に指定可能な進捗オプション
 */
export interface CollectionFetchProgressOptions<TItem extends {}> {
    /** 自動全取得する場合は true default: true */
    auto?: boolean;
    /** 進捗コールバック */
    progress?: CollectionFetchProgress<TItem>;
}

/**
 * @en [[Collection]]`#fetch()` options.
 * @ja [[Collection]]`#fetch()` に使用するオプション
 */
export type CollectionFetchOptions<TItem extends {}> = CollectionFetchProgressOptions<TItem> & CollectionFetchLimitOptions;

/**
 * @en Return value type for [[Collection]]`#fetch()`.
 * @ja [[Collection]]`#fetch()` の戻り値
 */
export interface CollectionFetchResult<TItem extends {}> {
    total: number;
    items: TItem[];
    options?: CollectionFetchOptions<TItem>;
}

/**
 * @en Progress callback function type by using [[CollectionFetchOptions]]`.auto`. <br>
 *     最終進捗 の items は Promise.resolve() に渡るものと同等
 * @ja [[CollectionFetchOptions]]`.auto` が指定された場合に使用する進捗取得用コールバック関数 <br>
 *     最終進捗 の items は Promise.resolve() に渡るものと同等
 */
export type CollectionFetchProgress<TItem extends {}> = (progress: CollectionFetchResult<TItem>) => void;

/**
 * @en [[Collection]] standard query options.
 * @ja [[Collection]] 標準のクエリオプション
 */
export interface CollectionQueryOptions<TItem extends {}, TKey extends string>
    extends CollectionSortOptions<TItem, TKey>, CollectionFilterOptions<TItem>, CollectionFetchOptions<TItem> {
    /**
     * @en If given `true`, [[Collection]]`#fetch()` doesn't use sorting and filtering from [[CollectionQueryInfo]] cached.
     * @ja [[CollectionQueryInfo]] にキャッシュされたソート/フィルターが不要な時に指定
     */
    noSearch?: boolean;
    /**
     * @en If given `true`, [[Collection]]`#fetch()` doesn't cache result.
     * @ja 明示的に cache しない場合に true
     */
    noCache?: boolean;
}

/**
 * @en Query information interface.
 * @ja クエリ情報を格納するインターフェイス
 */
export interface CollectionQueryInfo<TItem extends {}, TKey extends string = string> {
    sortKeys: SortKey<TKey>[];
    comparators: SortCallback<TItem>[];
    filter?: FilterCallback<TItem>;
    cache?: CollectionFetchResult<TItem>;
}

/**
 * @en [[Collection]] items provider function type.
 * @ja [[Collection]] の Item を供給する関数の型
 */
export type CollectionItemProvider<TItem extends {}, TKey extends string>
    = (options?: CollectionQueryOptions<TItem, TKey>) => Promise<CollectionFetchResult<TItem>>;
