/* eslint-disable prefer-rest-params, @typescript-eslint/no-explicit-any */

import {
    Writable,
    SortCallback,
    isNumber,
    verify,
    post,
} from '@cdp/core-utils';
import { Subscription } from '@cdp/event-publisher';
import {
    EventBrokerProxy,
    _internal,
    _notify,
    _stockChange,
    _notifyChanges,
    verifyObservable,
} from './internal';
import { ObservableState, IObservable } from './common';

/**
 * @en Array change type information. <br>
 *     The value is suitable for the number of fluctuation of the element.
 * @ja 配列変更通知のタイプ <br>
 *     値は要素の増減数に相当
 *
 */
export const enum ArrayChangeType {
    REMOVE = -1,
    UPDATE = 0,
    INSERT = 1,
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
type MutableChangeRecord<T> = Writable<ArrayChangeRecord<T>>;

//__________________________________________________________________________________________________//

/** @internal */
interface IArrayChangeEvent<T> {
    '@': [ArrayChangeRecord<T>[]];
}

/** @internal */
interface InternalProps<T = any> {
    state: ObservableState;
    byMethod: boolean;
    records: MutableChangeRecord<T>[];
    readonly indexes: Set<number>;
    readonly broker: EventBrokerProxy<IArrayChangeEvent<T>>;
}

/** @internal */
const _proxyHandler: ProxyHandler<ObservableArray> = {
    defineProperty(target, p, attributes) {
        const internal = target[_internal];
        if (ObservableState.DISABLED === internal.state || internal.byMethod || !Object.prototype.hasOwnProperty.call(attributes, 'value')) {
            return Reflect.defineProperty(target, p, attributes);
        }
        const oldValue = target[p];
        const newValue = attributes.value;
        // eslint-disable-next-line eqeqeq
        if ('length' === p && newValue != oldValue) { // Do NOT use strict inequality (!==)
            const oldLength = oldValue >>> 0;
            const newLength = newValue >>> 0;
            const stock = (): void => {
                const scrap = newLength < oldLength && target.slice(newLength);
                if (scrap) { // newLength < oldLength
                    for (let i = oldLength; --i >= newLength;) {
                        target[_stockChange](ArrayChangeType.REMOVE, i, undefined, scrap[i - newLength]);
                    }
                } else {            // oldLength < newLength
                    for (let i = oldLength; i < newLength; i++) {
                        target[_stockChange](ArrayChangeType.INSERT, i /*, undefined, undefined */);
                    }
                }
            };
            const result = Reflect.defineProperty(target, p, attributes);
            result && stock();
            return result;
        } else if (newValue !== oldValue && isValidArrayIndex(p)) {
            const i = p as any >>> 0;
            const type: ArrayChangeType = Number(i >= target.length); // INSERT or UPDATE
            const result = Reflect.defineProperty(target, p, attributes);
            result && target[_stockChange](type, i, newValue, oldValue);
            return result;
        } else {
            return Reflect.defineProperty(target, p, attributes);
        }
    },
    deleteProperty(target, p) {
        const internal = target[_internal];
        if (ObservableState.DISABLED === internal.state || internal.byMethod || !Object.prototype.hasOwnProperty.call(target, p)) {
            return Reflect.deleteProperty(target, p);
        }
        const oldValue = target[p];
        const result = Reflect.deleteProperty(target, p);
        result && isValidArrayIndex(p) && target[_stockChange](ArrayChangeType.UPDATE, p as any >>> 0, undefined, oldValue);
        return result;
    },
};
Object.freeze(_proxyHandler);

/** @internal valid array index helper */
function isValidArrayIndex<T>(index: any): boolean {
    const s = String(index);
    const n = Math.trunc(s as any);
    return String(n) === s && 0 <= n && n < 0xFFFFFFFF;
}

/** @internal helper for index management */
function findRelatedChangeIndex<T>(records: MutableChangeRecord<T>[], type: ArrayChangeType, index: number): number {
    const checkType = type === ArrayChangeType.INSERT
        ? (t: ArrayChangeType) => t === ArrayChangeType.REMOVE
        : (t: ArrayChangeType) => t !== ArrayChangeType.REMOVE
        ;

    for (let i = records.length; --i >= 0;) {
        const value = records[i];
        if (value.index === index && checkType(value.type)) {
            return i;
        } else if (value.index < index && Boolean(value.type)) { // REMOVE or INSERT
            index -= value.type;
        }
    }
    return -1;
}

//__________________________________________________________________________________________________//

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
export class ObservableArray<T = any> extends Array<T> implements IObservable {
    /** @internal */
    private readonly [_internal]: InternalProps<T>;

    /** @final constructor */
    private constructor() {
        super(...arguments);
        verify('instanceOf', ObservableArray, this);
        const internal: InternalProps<T> = {
            state: ObservableState.ACTIVE,
            byMethod: false,
            records: [],
            indexes: new Set(),
            broker: new EventBrokerProxy<IArrayChangeEvent<T>>(),
        };
        Object.defineProperty(this, _internal, { value: Object.seal(internal) });
        const argLength = arguments.length;
        if (1 === argLength && isNumber(arguments[0])) {
            const len = arguments[0] >>> 0;
            for (let i = 0; i < len; i++) {
                this[_stockChange](ArrayChangeType.INSERT, i /*, undefined */);
            }
        } else if (0 < argLength) {
            for (let i = 0; i < argLength; i++) {
                this[_stockChange](ArrayChangeType.INSERT, i, arguments[i]);
            }
        }
        return new Proxy(this, _proxyHandler);
    }

///////////////////////////////////////////////////////////////////////
// implements: IObservable

    /**
     * @en Subscrive array change(s).
     * @ja 配列変更購読設定
     *
     * @param listener
     *  - `en` callback function of the array change.
     *  - `ja` 配列変更通知コールバック関数
     */
    on(listener: (records: ArrayChangeRecord<T>[]) => any): Subscription {
        verifyObservable(this);
        return this[_internal].broker.get().on('@', listener);
    }

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
    off(listener?: (records: ArrayChangeRecord<T>[]) => any): void {
        verifyObservable(this);
        this[_internal].broker.get().off('@', listener);
    }

    /**
     * @en Suspend or disable the event observation state.
     * @ja イベント購読状態のサスペンド
     *
     * @param noRecord
     *  - `en` `true`: not recording property changes and clear changes. / `false`: property changes are recorded and fired when [[resume]]() callded. (default)
     *  - `ja` `true`: プロパティ変更も記録せず, 現在の記録も破棄 / `false`: プロパティ変更は記録され, [[resume]]() 時に発火する (既定)
     */
    suspend(noRecord = false): this {
        verifyObservable(this);
        this[_internal].state = noRecord ? ObservableState.DISABLED : ObservableState.SUSEPNDED;
        if (noRecord) {
            this[_internal].records = [];
        }
        return this;
    }

    /**
     * @en Resume of the event subscription state.
     * @ja イベント購読状態のリジューム
     */
    resume(): this {
        verifyObservable(this);
        const internal = this[_internal];
        if (ObservableState.ACTIVE !== internal.state) {
            internal.state = ObservableState.ACTIVE;
            post(() => this[_notifyChanges]());
        }
        return this;
    }

    /**
     * @en observation state
     * @ja 購読可能状態
     */
    getObservableState(): ObservableState {
        verifyObservable(this);
        return this[_internal].state;
    }

///////////////////////////////////////////////////////////////////////
// override: Array methods

    /**
     * Sorts an array.
     * @param compareFn The name of the function used to determine the order of the elements. If omitted, the elements are sorted in ascending, ASCII character order.
     */
    sort(comparator?: SortCallback<T>): this {
        verifyObservable(this);
        const internal = this[_internal];
        const old = Array.from(this);
        internal.byMethod = true;
        const result = super.sort(comparator);
        internal.byMethod = false;
        if (ObservableState.DISABLED !== internal.state) {
            const len = old.length;
            for (let i = 0; i < len; i++) {
                const oldValue = old[i];
                const newValue = this[i];
                if (newValue !== oldValue) {
                    this[_stockChange](ArrayChangeType.UPDATE, i, newValue, oldValue);
                }
            }
        }
        return result;
    }

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
    splice(start: number, deleteCount?: number, ...items: T[]): ObservableArray<T> {
        verifyObservable(this);
        const internal = this[_internal];
        const oldLen = this.length;
        internal.byMethod = true;
        const result = (super.splice as any)(...arguments) as ObservableArray<T>;
        internal.byMethod = false;
        if (ObservableState.DISABLED !== internal.state) {
            start = Math.trunc(start);
            const from = start < 0 ? Math.max(oldLen + start, 0) : Math.min(start, oldLen);
            for (let i = result.length; --i >= 0;) {
                this[_stockChange](ArrayChangeType.REMOVE, from + i, undefined, result[i]);
            }
            const len = items.length;
            for (let i = 0; i < len; i++) {
                this[_stockChange](ArrayChangeType.INSERT, from + i, items[i]);
            }
        }
        return result;
    }

    /**
     * Removes the first element from an array and returns it.
     */
    shift(): T | undefined {
        verifyObservable(this);
        const internal = this[_internal];
        const oldLen = this.length;
        internal.byMethod = true;
        const result = super.shift();
        internal.byMethod = false;
        if (ObservableState.DISABLED !== internal.state && this.length < oldLen) {
            this[_stockChange](ArrayChangeType.REMOVE, 0, undefined, result);
        }
        return result;
    }

    /**
     * Inserts new elements at the start of an array.
     * @param items  Elements to insert at the start of the Array.
     */
    unshift(...items: T[]): number {
        verifyObservable(this);
        const internal = this[_internal];
        internal.byMethod = true;
        const result = super.unshift(...items);
        internal.byMethod = false;
        if (ObservableState.DISABLED !== internal.state) {
            const len = items.length;
            for (let i = 0; i < len; i++) {
                this[_stockChange](ArrayChangeType.INSERT, i, items[i]);
            }
        }
        return result;
    }

    /**
     * Calls a defined callback function on each element of an array, and returns an array that contains the results.
     * @param callbackfn A function that accepts up to three arguments. The map method calls the callbackfn function one time for each element in the array.
     * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
     */
    map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): ObservableArray<U> {
        /*
         * [NOTE] original implement is very very high-cost.
         *        so it's converted native Array once, and restored.
         *
         * return (super.map as any)(...arguments);
         */
        return ObservableArray.from([...this].map(callbackfn, thisArg));
    }

///////////////////////////////////////////////////////////////////////
// private mehtods:

    /** @internal */
    private [_stockChange](type: ArrayChangeType, index: number, newValue?: T, oldValue?: T): void {
        const { state, indexes, records } = this[_internal];
        const rci = indexes.has(index) ? findRelatedChangeIndex(records, type, index) : -1;
        const len = records.length;
        if (rci >= 0) {
            const rct = records[rci].type;
            if (!rct /* UPDATE */) {
                const prevRecord = records.splice(rci, 1)[0];
                // UPDATE => UPDATE : UPDATE
                // UPDATE => REMOVE : INSERT
                this[_stockChange](type, index, newValue, prevRecord.oldValue);
            } else {
                for (let r, i = len; --i > rci;) {
                    r = records[i];
                    (r.index >= index) && (r.index -= rct);
                }
                const prevRecord = records.splice(rci, 1)[0];
                if (type !== ArrayChangeType.REMOVE) {
                    // INSERT => UPDATE : INSERT
                    // REMOVE => INSERT : UPDATE
                    this[_stockChange](Number(!type), index, newValue, prevRecord.oldValue);
                }
            }
            return;
        }
        indexes.add(index);
        records[len] = { type, index, newValue, oldValue };
        if (ObservableState.ACTIVE === state && 0 === len) {
            post(() => this[_notifyChanges]());
        }
    }

    /** @internal */
    private [_notifyChanges](): void {
        const { state, records } = this[_internal];
        if (ObservableState.ACTIVE !== state || 0 === records.length) {
            return;
        }
        for (const r of records) {
            Object.freeze(r);
        }
        this[_notify](Object.freeze(records) as ArrayChangeRecord<T>[]);
        this[_internal].records = [];
    }

    /** @internal */
    private [_notify](records: ArrayChangeRecord<T>[]): void {
        const internal = this[_internal];
        internal.indexes.clear();
        internal.broker.get().publish('@', records);
    }
}

//__________________________________________________________________________________________________//

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
    filter<S extends T>(callbackfn: (value: T, index: number, array: T[]) => value is S, thisArg?: any): ObservableArray<S>;
    /**
     * Returns the elements of an array that meet the condition specified in a callback function.
     * @param callbackfn A function that accepts up to three arguments. The filter method calls the callbackfn function one time for each element in the array.
     * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
     */
    filter(callbackfn: (value: T, index: number, array: T[]) => any, thisArg?: any): ObservableArray<T>;
}

/**
 * Override return type of static methods
 */
export declare namespace ObservableArray { // eslint-disable-line @typescript-eslint/no-namespace
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
