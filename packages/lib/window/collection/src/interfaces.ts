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
