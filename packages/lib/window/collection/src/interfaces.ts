import { Keys } from '@cdp/core-utils';
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

//__________________________________________________________________________________________________//

/**
 * @en Dynamic query operator definitions.
 * @ja ダイナミッククエリの演算子定義
 */
export const enum DynamicOperator {
    /**
     * @en is equal
     * @ja である
     */
    EQUAL = 0,

    /**
     * @en is not equal
     * @ja でない
     */
    NOT_EQUAL,

    /**
     * @en is greater than
     * @ja より大きい/より長い
     */
    GREATER,

    /**
     * @en is less than
     * @ja より小さい/より短い
     */
    LESS,

    /**
     * @en is greater equal
     * @ja 以上
     */
    GREATER_EQUAL,

    /**
     * @en is less equal
     * @ja 以下
     */
    LESS_EQUAL,

    /**
     * @en is like (included)
     * @ja 含む
     */
    LIKE,

    /**
     * @en is not like (not included)
     * @ja 含まない
     */
    NOT_LIKE,

    /**
     * @en the past within ***. If the day is after the past basis date that calculated from `Date.now()`, it's hit condition.
     * @ja 過去 *** 以内. `Date.now()` を起点として n年過去の年月日を求め, それ以降の日付ならヒット対象
     */
    DATE_LESS_EQUAL,

    /**
     * @en not the past within ***. If the day is before the past basis date that calculated from `Date.now()`, it's hit condition.
     * @ja 過去 *** 以内でない: `Date.now()` を起点として n年過去の年月日を求め, それより前の日付ならヒット対象
     */
    DATE_LESS_NOT_EQUAL,

    /**
     * @en between more than *** to within ***
     * @ja *** 以上 ～ *** 以内
     */
    RANGE,
}

/**
 * @en Combination condtion definitions for dynamic query.
 * @ja ダイナミッククエリの複合条件
 */
export const enum DynamicCombination {
    /** `en` logical AND <br> `ja` かつ */
    AND = 0,
    /** `en` logical OR <br> `ja` または */
    OR,
}

/**
 * @en Dynamic query limit definitions.
 * @ja ダイナミッククエリの上限
 */
export const enum DynamicLimit {
    /** `en` item count <br> `ja` アイテム数 */
    COUNT = 0,
    /** `en` prop value sum <br> `ja` プロパティ値の合計値 */
    SUM,
    /** `en` second <br> `ja` 秒 */
    SECOND,
    /** `en` minute <br> `ja` 分 */
    MINUTE,
    /** `en` hour <br> `ja` 時間 */
    HOUR,
    /** `en` day <br> `ja` 日 */
    DAY,
    /** flle size kB */
    KB,
    /** flle size MB */
    MB,
    /** flle size GB */
    GB,
    /** flle size TB */
    TB,
}

/**
 * @en Property definitions of dynamic query context.
 * @ja ダイナミッククエリの条件コンテキスト
 */
export interface DynamicOperatorContext<T extends {}> {
    operator: DynamicOperator;
    prop: Keys<T>;
    value: T[Keys<T>] | number;
    range?: T[Keys<T>];         // DynamicPackageOperator.RANGEの上限値
    unit?: 'year' | 'month' | 'day';
}

/**
 * @en Limit condition definitions for dynamic query.
 * @ja ダイナミッククエリの上限設定
 */
export interface DynamicLimitCondition<T extends {}> {
    unit: DynamicLimit;
    /** when DynamicLimit.COUNT, set `undefined`. */
    prop: Keys<T> | undefined;
    value: number;
    /** loose limit */
    excess?: boolean;
}

/**
 * @en Dynamic query condition seed interface.
 * @ja ダイナミッククエリの条件
 */
export interface DynamicConditionSeed<TItem extends {}, TKey extends Keys<TItem> = Keys<TItem>> {
    /**
     * @en filter condition
     * @ja フィルタ条件
     */
    operators: DynamicOperatorContext<TItem>[];

    /**
     * @en combination condition
     * @ja 複合条件
     */
    combination?: DynamicCombination;

    /**
     * @en keys of using SUM
     * @ja SUM に使用する Key
     */
    sumKeys?: Keys<TItem>[];

    /**
     * @en limitation
     * @ja 上限
     */
    limit?: DynamicLimitCondition<TItem>;

    /**
     * @en random or not
     * @ja ランダム検索
     */
    random?: boolean;

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
}

//__________________________________________________________________________________________________//

/**
 * @en [[Collection]] sort options.
 * @ja [[Collection]] の sort に使用するオプション
 */
export interface CollectionSortOptions<TItem extends {}, TKey extends Keys<TItem> = Keys<TItem>> {
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
export interface CollectionFetchOptions<TItem extends {}> extends Cancelable {
    /**
     * @en Query start index. default: 0
     * @ja 取得開始 Index を指定 default: 0
     */
    index?: number;

    /**
     * @en The limit number of acquisition items per one query.
     * @ja 1回の query で制限する 取得コンテンツ数
     */
    limit?: number;

    /**
     * @en If given `true`, the system calls `fetch()` continuously until all items. default: false
     * @ja 自動全取得する場合は true default: false
     */
    auto?: boolean;

    /**
     * @en Progress callback function.
     * @ja 進捗コールバック
     */
    progress?: CollectionFetchProgress<TItem>;
}

/**
 * @en Return value type for [[Collection]]`#fetch()`.
 * @ja [[Collection]]`#fetch()` の戻り値
 */
export type CollectionFetchResult<TItem extends {}, TSumKey extends Keys<TItem> = never> = {
    total: number;
    items: TItem[];
    options?: CollectionQueryOptions<TItem>;
} & Pick<TItem, TSumKey>;

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
export interface CollectionQueryOptions<TItem extends {}, TKey extends Keys<TItem> = Keys<TItem>>
    extends CollectionSortOptions<TItem, TKey>, CollectionFilterOptions<TItem>, CollectionFetchOptions<TItem> {
    /**
     * @en Dynamic query condition.
     * @ja ダイナミッククエリの条件
     */
    condition?: DynamicConditionSeed<TItem, TKey>;

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
export interface CollectionQueryInfo<TItem extends {}, TKey extends Keys<TItem> = Keys<TItem>> {
    sortKeys: SortKey<TKey>[];
    comparators: SortCallback<TItem>[];
    filter?: FilterCallback<TItem>;
    cache?: CollectionFetchResult<TItem>;
}

/**
 * @en [[Collection]] items provider function type.
 * @ja [[Collection]] の Item を供給する関数の型
 */
export type CollectionItemProvider<TItem extends {}, TKey extends Keys<TItem> = Keys<TItem>>
    = (options?: CollectionQueryOptions<TItem, TKey>) => Promise<CollectionFetchResult<TItem>>;
