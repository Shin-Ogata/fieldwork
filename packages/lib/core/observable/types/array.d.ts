import type { Subscription } from '@cdp/events';
import { ObservableState, type IObservable } from './common';
/**
 * @en Array change type information. <br>
 *     The value is suitable for the number of fluctuation of the element.
 * @ja 配列変更通知のタイプ <br>
 *     値は要素の増減数に相当
 *
 */
export declare const enum ArrayChangeType {
    REMOVE = -1,
    UPDATE = 0,
    INSERT = 1
}
/**
 * @en Array change record information.
 * @ja 配列変更情報
 */
export interface ArrayChangeRecord<T> {
    /**
     * @en The change type information.
     * @ja 配列変更情報の識別子
     */
    readonly type: ArrayChangeType;
    /**
     * @en The change type information. <br>
     *     ※ [Attention] The index will be different from the actual location when array size changed because that determines element operation unit.
     * @ja 変更が発生した配列内の位置の index <br>
     *     ※ [注意] オペレーション単位の index となり, 要素が増減する場合は実際の位置と異なることがある
     */
    readonly index: number;
    /**
     * @en New element's value.
     * @ja 要素の新しい値
     */
    readonly newValue?: T;
    /**
     * @en Old element's value.
     * @ja 要素の古い値
     */
    readonly oldValue?: T;
}
/**
 * @en The array class which change can be observed.
 * @ja 変更監視可能な配列クラス
 *
 * @example <br>
 *
 * - Basic Usage
 *
 * ```ts
 * const obsArray = ObservableArray.from(['a', 'b', 'c']);
 *
 * function onChangeArray(records: ArrayChangeRecord[]) {
 *   console.log(records);
 *   //  [
 *   //    { type: 1, index: 3, newValue: 'x', oldValue: undefined },
 *   //    { type: 1, index: 4, newValue: 'y', oldValue: undefined },
 *   //    { type: 1, index: 5, newValue: 'z', oldValue: undefined }
 *   //  ]
 * }
 * obsArray.on(onChangeArray);
 *
 * function addXYZ() {
 *   obsArray.push('x', 'y', 'z');
 * }
 * ```
 */
export declare class ObservableArray<T = unknown> extends Array<T> implements IObservable {
    /** @final constructor */
    private constructor();
    /**
     * @en Subscrive array change(s).
     * @ja 配列変更購読設定
     *
     * @param listener
     *  - `en` callback function of the array change.
     *  - `ja` 配列変更通知コールバック関数
     */
    on(listener: (records: ArrayChangeRecord<T>[]) => unknown): Subscription;
    /**
     * @en Unsubscribe array change(s).
     * @ja 配列変更購読解除
     *
     * @param listener
     *  - `en` callback function of the array change.
     *         When not set this parameter, all same `channel` listeners are released.
     *  - `ja` 配列変更通知コールバック関数
     *         指定しない場合は同一 `channel` すべてを解除
     */
    off(listener?: (records: ArrayChangeRecord<T>[]) => unknown): void;
    /**
     * @en Suspend or disable the event observation state.
     * @ja イベント購読状態のサスペンド
     *
     * @param noRecord
     *  - `en` `true`: not recording property changes and clear changes. / `false`: property changes are recorded and fired when {@link resume}() callded. (default)
     *  - `ja` `true`: プロパティ変更も記録せず, 現在の記録も破棄 / `false`: プロパティ変更は記録され, {@link resume}() 時に発火する (既定)
     */
    suspend(noRecord?: boolean): this;
    /**
     * @en Resume of the event subscription state.
     * @ja イベント購読状態のリジューム
     */
    resume(): this;
    /**
     * @en observation state
     * @ja 購読可能状態
     */
    getObservableState(): ObservableState;
    /**
     * Sorts an array.
     * @param compareFn The name of the function used to determine the order of the elements. If omitted, the elements are sorted in ascending, ASCII character order.
     */
    sort(comparator?: (lhs: T, rhs: T) => number): this;
    /**
     * Removes elements from an array and, if necessary, inserts new elements in their place, returning the deleted elements.
     * @param start The zero-based location in the array from which to start removing elements.
     * @param deleteCount The number of elements to remove.
     */
    splice(start: number, deleteCount?: number): ObservableArray<T>;
    /**
     * Removes elements from an array and, if necessary, inserts new elements in their place, returning the deleted elements.
     * @param start The zero-based location in the array from which to start removing elements.
     * @param deleteCount The number of elements to remove.
     * @param items Elements to insert into the array in place of the deleted elements.
     */
    splice(start: number, deleteCount: number, ...items: T[]): ObservableArray<T>;
    /**
     * Removes the first element from an array and returns it.
     */
    shift(): T | undefined;
    /**
     * Inserts new elements at the start of an array.
     * @param items  Elements to insert at the start of the Array.
     */
    unshift(...items: T[]): number;
    /**
     * Calls a defined callback function on each element of an array, and returns an array that contains the results.
     * @param callbackfn A function that accepts up to three arguments. The map method calls the callbackfn function one time for each element in the array.
     * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
     */
    map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: unknown): ObservableArray<U>;
}
/**
 * Override return type of prototype methods
 */
export interface ObservableArray<T> {
    /**
     * Combines two or more arrays.
     * @param items Additional items to add to the end of array1.
     */
    concat(...items: T[][]): ObservableArray<T>;
    /**
     * Combines two or more arrays.
     * @param items Additional items to add to the end of array1.
     */
    concat(...items: (T | T[])[]): ObservableArray<T>;
    /**
     * Reverses the elements in an Array.
     */
    reverse(): this;
    /**
     * Returns a section of an array.
     * @param start The beginning of the specified portion of the array.
     * @param end The end of the specified portion of the array.
     */
    slice(start?: number, end?: number): ObservableArray<T>;
    /**
     * Returns the elements of an array that meet the condition specified in a callback function.
     * @param callbackfn A function that accepts up to three arguments. The filter method calls the callbackfn function one time for each element in the array.
     * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
     */
    filter<S extends T>(callbackfn: (value: T, index: number, array: T[]) => value is S, thisArg?: unknown): ObservableArray<S>;
    /**
     * Returns the elements of an array that meet the condition specified in a callback function.
     * @param callbackfn A function that accepts up to three arguments. The filter method calls the callbackfn function one time for each element in the array.
     * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
     */
    filter(callbackfn: (value: T, index: number, array: T[]) => unknown, thisArg?: unknown): ObservableArray<T>;
}
/**
 * Override return type of static methods
 */
export declare namespace ObservableArray {
    /**
     * Creates an array from an array-like object.
     * @param arrayLike An array-like or iterable object to convert to an array.
     */
    function from<T>(arrayLike: ArrayLike<T> | Iterable<T>): ObservableArray<T>;
    /**
     * Creates an array from an array-like object.
     * @param arrayLike An array-like or iterable object to convert to an array.
     * @param mapfn A mapping function to call on every element of the array.
     * @param thisArg Value of 'this' used to invoke the mapfn.
     */
    function from<T, U>(arrayLike: ArrayLike<T> | Iterable<T>, mapfn: (this: void, v: T, k: number) => U, thisArg?: undefined): ObservableArray<U>;
    function from<X, T, U>(arrayLike: ArrayLike<T> | Iterable<T>, mapfn: (this: X, v: T, k: number) => U, thisArg: X): ObservableArray<U>;
    /**
     * Returns a new array from a set of elements.
     * @param items A set of elements to include in the new array object.
     */
    function of<T>(...items: T[]): ObservableArray<T>;
}
