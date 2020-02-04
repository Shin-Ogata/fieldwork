/**
 * @en Sort order const definitions.
 * @ja ソート順
 */
export declare const enum SortOrder {
    /** `en` no sort <br> `ja` ソートしない */
    NO = 0,
    /** `en` ascending <br> `ja` 昇順 */
    ASC = 1,
    /** `en` descending <br> `ja` 降順 */
    DESC = -1
}
/**
 * @en Callback type for using `sort()` function.
 * @ja `sort()` に指定されるコールバック関数
 */
export declare type SortCallback<T> = (lhs: T, rhs: T) => number;
/**
 * @en Callback type for using `filter()` function.
 * @ja `filter()` に指定されるコールバック関数
 */
export declare type FilterCallback<T> = (target: T) => boolean;
