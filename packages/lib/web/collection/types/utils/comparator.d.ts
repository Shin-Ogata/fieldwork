import { SortOrder, SortCallback, SortKey } from '../interfaces';
/**
 * @en `Intl.Collator` factory function type definition.
 * @ja `Intl.Collator` を返却する関数型定義
 */
export type CollatorProvider = () => Intl.Collator;
/**
 * @ja 既定の Intl.Collator を設定
 *
 * @param newProvider
 *  - `en` new [[CollatorProvider]] object. if `undefined` passed, only returns the current object.
 *  - `ja` 新しい [[CollatorProvider]] オブジェクトを指定. `undefined` が渡される場合は現在設定されているオブジェクトの返却のみ行う
 * @returns
 *  - `en` old [[CollatorProvider]] object.
 *  - `ja` 設定されていた [[CollatorProvider]] オブジェクト
 */
export declare function defaultCollatorProvider(newProvider?: CollatorProvider): CollatorProvider;
/**
 * @en Get string comparator function.
 * @ja 文字列比較用関数を取得
 *
 * @param prop
 *  - `en` property name
 *  - `ja` プロパティ名を指定
 * @param order
 *  - `en` sort order code
 *  - `ja` ソート順を指定
 */
export declare function getStringComparator<T, K extends string = string>(prop: K, order: SortOrder): SortCallback<T>;
/**
 * @en Get date comparator function.
 * @ja 日時比較用関数を取得
 *
 * @param prop
 *  - `en` property name
 *  - `ja` プロパティ名を指定
 * @param order
 *  - `en` sort order code
 *  - `ja` ソート順を指定
 */
export declare function getDateComparator<T, K extends string = string>(prop: K, order: SortOrder): SortCallback<T>;
/**
 * @en Get generic comparator function by comparative operator.
 * @ja 比較演算子を用いた汎用比較関数の取得
 *
 * @param prop
 *  - `en` property name
 *  - `ja` プロパティ名を指定
 * @param order
 *  - `en` sort order code
 *  - `ja` ソート順を指定
 */
export declare function getGenericComparator<T, K extends string = string>(prop: K, order: SortOrder): SortCallback<T>;
/**
 * @en Get boolean comparator function.
 * @ja 真偽値比較用関数を取得
 */
export declare const getBooleanComparator: typeof getGenericComparator;
/**
 * @en Get numeric comparator function.
 * @ja 数値比較用関数を取得
 */
export declare const getNumberComparator: typeof getGenericComparator;
/**
 * @en Convert to comparator from [[SortKey]].
 * @ja [[SortKey]] を comparator に変換
 */
export declare function toComparator<T, K extends string = string>(sortKey: SortKey<K>): SortCallback<T>;
/**
 * @en Convert to comparator array from [[SortKey]] array.
 * @ja [[SortKey]] 配列を comparator 配列に変換
 */
export declare function convertSortKeys<T, K extends string = string>(sortKeys: SortKey<K>[]): SortCallback<T>[];
