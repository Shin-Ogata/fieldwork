/*!
 * @cdp/observable 0.9.17
 *   observable utility module
 */

import { verify, isArray, post, deepMerge, deepEqual, isString, isNumber } from '@cdp/core-utils';
import { EventBroker } from '@cdp/events';

/** @internal EventBrokerProxy */
class EventBrokerProxy {
    _broker;
    get() {
        return this._broker || (this._broker = new EventBroker());
    }
}
/** @internal */ const _internal = Symbol('internal');
/** @internal */ const _notify = Symbol('notify');
/** @internal */ const _stockChange = Symbol('stock-change');
/** @internal */ const _notifyChanges = Symbol('notify-changes');
/** @internal */
function verifyObservable(x) {
    if (!x || !x[_internal]) {
        throw new TypeError(`The object passed is not an IObservable.`);
    }
}

/**
 * @en Check the value-type is [[IObservable]].
 * @ja [[IObservable]] 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
function isObservable(x) {
    return Boolean(x && x[_internal]);
}

/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */
/** @internal */
const _proxyHandler$1 = {
    set(target, p, value, receiver) {
        if (!isString(p)) {
            return Reflect.set(target, p, value, receiver);
        }
        const oldValue = target[p];
        if ("disabled" /* ObservableState.DISABLED */ !== target[_internal].state && value !== oldValue) {
            target[_stockChange](p, oldValue);
        }
        return Reflect.set(target, p, value, receiver);
    },
};
Object.freeze(_proxyHandler$1);
//__________________________________________________________________________________________________//
/**
 * @en The object class which change can be observed.
 * @ja オブジェクトの変更を監視できるオブジェクトクラス
 *
 * @example <br>
 *
 * - Basic Usage
 *
 * ```ts
 * class Example extends ObservableObject {
 *   public a: number = 0;
 *   public b: number = 0;
 *   public get sum(): number {
 *       return this.a + this.b;
 *   }
 * }
 *
 * const observable = new Example();
 *
 * function onNumChange(newValue: number, oldValue: number, key: string) {
 *   console.log(`${key} changed from ${oldValue} to ${newValue}.`);
 * }
 * observable.on(['a', 'b'], onNumChange);
 *
 * // update
 * observable.a = 100;
 * observable.b = 200;
 *
 * // console out from `async` event loop.
 * // => 'a changed from 0 to 100.'
 * // => 'b changed from 0 to 200.'
 *
 * :
 *
 * function onSumChange(newValue: number, oldValue: number) {
 *   console.log(`sum changed from ${oldValue} to ${newVaue}.`);
 * }
 * observable.on('sum', onSumChange);
 *
 * // update
 * observable.a = 100; // nothing reaction because of no change properties.
 * observable.a = 200;
 *
 * // console out from `async` event loop.
 * // => 'sum changed from 300 to 400.'
 * ```
 */
class ObservableObject {
    /** @internal */
    [_internal];
    /**
     * constructor
     *
     * @param state
     *  - `en` initial state. default: [[ObservableState.ACTIVE]]
     *  - `ja` 初期状態 既定: [[ObservableState.ACTIVE]]
     */
    constructor(state = "active" /* ObservableState.ACTIVE */) {
        verify('instanceOf', ObservableObject, this);
        const internal = {
            state,
            changed: false,
            changeMap: new Map(),
            broker: new EventBrokerProxy(),
        };
        Object.defineProperty(this, _internal, { value: Object.seal(internal) });
        return new Proxy(this, _proxyHandler$1);
    }
    on(property, listener) {
        verifyObservable(this);
        const { changeMap, broker } = this[_internal];
        const result = broker.get().on(property, listener);
        if (0 < changeMap.size) {
            const props = isArray(property) ? property : [property];
            for (const prop of props) {
                changeMap.has(prop) || changeMap.set(prop, this[prop]);
            }
        }
        return result;
    }
    off(property, listener) {
        verifyObservable(this);
        this[_internal].broker.get().off(property, listener);
    }
    /**
     * @en Suspend or disable the event observation state.
     * @ja イベント購読状態のサスペンド
     *
     * @param noRecord
     *  - `en` `true`: not recording property changes and clear changes. / `false`: property changes are recorded and fired when [[resume]]() callded. (default)
     *  - `ja` `true`: プロパティ変更も記録せず, 現在の記録も破棄 / `false`: プロパティ変更は記録され, [[resume]]() 時に発火する (既定)
     */
    suspend(noRecord = false) {
        verifyObservable(this);
        this[_internal].state = noRecord ? "disabled" /* ObservableState.DISABLED */ : "suspended" /* ObservableState.SUSEPNDED */;
        if (noRecord) {
            this[_internal].changeMap.clear();
        }
        return this;
    }
    /**
     * @en Resume the event observation state.
     * @ja イベント購読状態のリジューム
     */
    resume() {
        verifyObservable(this);
        const internal = this[_internal];
        if ("active" /* ObservableState.ACTIVE */ !== internal.state) {
            internal.state = "active" /* ObservableState.ACTIVE */;
            void post(() => this[_notifyChanges]());
        }
        return this;
    }
    /**
     * @en observation state
     * @ja 購読可能状態
     */
    getObservableState() {
        verifyObservable(this);
        return this[_internal].state;
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IObservableEventBrokerAccess
    /** @internal */
    getBroker() {
        const { broker } = this[_internal];
        return broker.get();
    }
    ///////////////////////////////////////////////////////////////////////
    // static methods:
    /**
     * @en Create [[ObservableObject]] from any object.
     * @ja 任意のオブジェクトから [[ObservableObject]] を生成
     *
     * @example <br>
     *
     * ```ts
     * const observable = ObservableObject.from({ a: 1, b: 1 });
     * function onNumChange(newValue: number, oldValue: number, key: string) {
     *   console.log(`${key} changed from ${oldValue} to ${newValue}.`);
     * }
     * observable.on(['a', 'b'], onNumChange);
     *
     * // update
     * observable.a = 100;
     * observable.b = 200;
     *
     * // console out from `async` event loop.
     * // => 'a changed from 1 to 100.'
     * // => 'b changed from 1 to 200.'
     * ```
     */
    static from(src) {
        const observable = deepMerge(new class extends ObservableObject {
        }("disabled" /* ObservableState.DISABLED */), src);
        observable.resume();
        return observable;
    }
    ///////////////////////////////////////////////////////////////////////
    // protected mehtods:
    /**
     * @en Force notify property change(s) in spite of active state.
     * @ja アクティブ状態にかかわらず強制的にプロパティ変更通知を発行
     */
    notify(...properties) {
        verifyObservable(this);
        if (0 === properties.length) {
            return;
        }
        const { changeMap } = this[_internal];
        const keyValue = new Map();
        for (const key of properties) {
            const newValue = this[key];
            const oldValue = changeMap.has(key) ? changeMap.get(key) : newValue;
            keyValue.set(key, [newValue, oldValue]);
        }
        0 < keyValue.size && this[_notify](keyValue);
    }
    ///////////////////////////////////////////////////////////////////////
    // private mehtods:
    /** @internal */
    [_stockChange](p, oldValue) {
        const { state, changeMap, broker } = this[_internal];
        this[_internal].changed = true;
        if (0 === changeMap.size) {
            changeMap.set(p, oldValue);
            for (const k of broker.get().channels()) {
                changeMap.has(k) || changeMap.set(k, this[k]);
            }
            if ("active" /* ObservableState.ACTIVE */ === state) {
                void post(() => this[_notifyChanges]());
            }
        }
        else {
            changeMap.has(p) || changeMap.set(p, oldValue);
        }
    }
    /** @internal */
    [_notifyChanges]() {
        const { state, changeMap } = this[_internal];
        if ("active" /* ObservableState.ACTIVE */ !== state) {
            return;
        }
        const keyValuePairs = new Map();
        for (const [key, oldValue] of changeMap) {
            const curValue = this[key];
            if (!deepEqual(oldValue, curValue)) {
                keyValuePairs.set(key, [curValue, oldValue]);
            }
        }
        this[_notify](keyValuePairs);
    }
    /** @internal */
    [_notify](keyValue) {
        const { changed, changeMap, broker } = this[_internal];
        changeMap.clear();
        this[_internal].changed = false;
        const eventBroker = broker.get();
        for (const [key, values] of keyValue) {
            eventBroker.trigger(key, ...values, key);
        }
        if (changed) {
            eventBroker.trigger('@', this);
        }
    }
}

/* eslint-disable
    prefer-rest-params,
 */
/** @internal */
const _proxyHandler = {
    defineProperty(target, p, attributes) {
        const internal = target[_internal];
        if ("disabled" /* ObservableState.DISABLED */ === internal.state || internal.byMethod || !Object.prototype.hasOwnProperty.call(attributes, 'value')) {
            return Reflect.defineProperty(target, p, attributes);
        }
        const oldValue = target[p]; // eslint-disable-line @typescript-eslint/no-explicit-any
        const newValue = attributes.value;
        // eslint-disable-next-line eqeqeq
        if ('length' === p && newValue != oldValue) { // Do NOT use strict inequality (!==)
            const oldLength = oldValue >>> 0;
            const newLength = newValue >>> 0;
            const stock = () => {
                const scrap = newLength < oldLength && target.slice(newLength);
                if (scrap) { // newLength < oldLength
                    for (let i = oldLength; --i >= newLength;) {
                        target[_stockChange](-1 /* ArrayChangeType.REMOVE */, i, undefined, scrap[i - newLength]);
                    }
                }
                else { // oldLength < newLength
                    for (let i = oldLength; i < newLength; i++) {
                        target[_stockChange](1 /* ArrayChangeType.INSERT */, i /*, undefined, undefined */);
                    }
                }
            };
            const result = Reflect.defineProperty(target, p, attributes);
            result && stock();
            return result;
        }
        else if (newValue !== oldValue && isValidArrayIndex(p)) {
            const i = p >>> 0;
            const type = Number(i >= target.length); // INSERT or UPDATE
            const result = Reflect.defineProperty(target, p, attributes);
            result && target[_stockChange](type, i, newValue, oldValue);
            return result;
        }
        else {
            return Reflect.defineProperty(target, p, attributes);
        }
    },
    deleteProperty(target, p) {
        const internal = target[_internal];
        if ("disabled" /* ObservableState.DISABLED */ === internal.state || internal.byMethod || !Object.prototype.hasOwnProperty.call(target, p)) {
            return Reflect.deleteProperty(target, p);
        }
        const oldValue = target[p]; // eslint-disable-line @typescript-eslint/no-explicit-any
        const result = Reflect.deleteProperty(target, p);
        result && isValidArrayIndex(p) && target[_stockChange](0 /* ArrayChangeType.UPDATE */, p >>> 0, undefined, oldValue);
        return result;
    },
};
Object.freeze(_proxyHandler);
/** @internal valid array index helper */
function isValidArrayIndex(index) {
    const s = String(index);
    const n = Math.trunc(s);
    return String(n) === s && 0 <= n && n < 0xFFFFFFFF;
}
/** @internal helper for index management */
function findRelatedChangeIndex(records, type, index) {
    const checkType = type === 1 /* ArrayChangeType.INSERT */
        ? (t) => t === -1 /* ArrayChangeType.REMOVE */
        : (t) => t !== -1 /* ArrayChangeType.REMOVE */;
    for (let i = records.length; --i >= 0;) {
        const value = records[i];
        if (value.index === index && checkType(value.type)) {
            return i;
        }
        else if (value.index < index && Boolean(value.type)) { // REMOVE or INSERT
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
class ObservableArray extends Array {
    /** @internal */
    [_internal];
    /** @final constructor */
    constructor() {
        super(...arguments);
        verify('instanceOf', ObservableArray, this);
        const internal = {
            state: "active" /* ObservableState.ACTIVE */,
            byMethod: false,
            records: [],
            indexes: new Set(),
            broker: new EventBrokerProxy(),
        };
        Object.defineProperty(this, _internal, { value: Object.seal(internal) });
        const argLength = arguments.length;
        if (1 === argLength && isNumber(arguments[0])) {
            const len = arguments[0] >>> 0;
            for (let i = 0; i < len; i++) {
                this[_stockChange](1 /* ArrayChangeType.INSERT */, i /*, undefined */);
            }
        }
        else if (0 < argLength) {
            for (let i = 0; i < argLength; i++) {
                this[_stockChange](1 /* ArrayChangeType.INSERT */, i, arguments[i]);
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
    on(listener) {
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
    off(listener) {
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
    suspend(noRecord = false) {
        verifyObservable(this);
        this[_internal].state = noRecord ? "disabled" /* ObservableState.DISABLED */ : "suspended" /* ObservableState.SUSEPNDED */;
        if (noRecord) {
            this[_internal].records = [];
        }
        return this;
    }
    /**
     * @en Resume of the event subscription state.
     * @ja イベント購読状態のリジューム
     */
    resume() {
        verifyObservable(this);
        const internal = this[_internal];
        if ("active" /* ObservableState.ACTIVE */ !== internal.state) {
            internal.state = "active" /* ObservableState.ACTIVE */;
            void post(() => this[_notifyChanges]());
        }
        return this;
    }
    /**
     * @en observation state
     * @ja 購読可能状態
     */
    getObservableState() {
        verifyObservable(this);
        return this[_internal].state;
    }
    ///////////////////////////////////////////////////////////////////////
    // override: Array methods
    /**
     * Sorts an array.
     * @param compareFn The name of the function used to determine the order of the elements. If omitted, the elements are sorted in ascending, ASCII character order.
     */
    sort(comparator) {
        verifyObservable(this);
        const internal = this[_internal];
        const old = Array.from(this);
        internal.byMethod = true;
        const result = super.sort(comparator);
        internal.byMethod = false;
        if ("disabled" /* ObservableState.DISABLED */ !== internal.state) {
            const len = old.length;
            for (let i = 0; i < len; i++) {
                const oldValue = old[i];
                const newValue = this[i];
                if (newValue !== oldValue) {
                    this[_stockChange](0 /* ArrayChangeType.UPDATE */, i, newValue, oldValue);
                }
            }
        }
        return result;
    }
    splice(start, deleteCount, ...items) {
        verifyObservable(this);
        const internal = this[_internal];
        const oldLen = this.length;
        internal.byMethod = true;
        const result = super.splice(...arguments);
        internal.byMethod = false;
        if ("disabled" /* ObservableState.DISABLED */ !== internal.state) {
            start = Math.trunc(start);
            const from = start < 0 ? Math.max(oldLen + start, 0) : Math.min(start, oldLen);
            for (let i = result.length; --i >= 0;) {
                this[_stockChange](-1 /* ArrayChangeType.REMOVE */, from + i, undefined, result[i]);
            }
            const len = items.length;
            for (let i = 0; i < len; i++) {
                this[_stockChange](1 /* ArrayChangeType.INSERT */, from + i, items[i]);
            }
        }
        return result;
    }
    /**
     * Removes the first element from an array and returns it.
     */
    shift() {
        verifyObservable(this);
        const internal = this[_internal];
        const oldLen = this.length;
        internal.byMethod = true;
        const result = super.shift();
        internal.byMethod = false;
        if ("disabled" /* ObservableState.DISABLED */ !== internal.state && this.length < oldLen) {
            this[_stockChange](-1 /* ArrayChangeType.REMOVE */, 0, undefined, result);
        }
        return result;
    }
    /**
     * Inserts new elements at the start of an array.
     * @param items  Elements to insert at the start of the Array.
     */
    unshift(...items) {
        verifyObservable(this);
        const internal = this[_internal];
        internal.byMethod = true;
        const result = super.unshift(...items);
        internal.byMethod = false;
        if ("disabled" /* ObservableState.DISABLED */ !== internal.state) {
            const len = items.length;
            for (let i = 0; i < len; i++) {
                this[_stockChange](1 /* ArrayChangeType.INSERT */, i, items[i]);
            }
        }
        return result;
    }
    /**
     * Calls a defined callback function on each element of an array, and returns an array that contains the results.
     * @param callbackfn A function that accepts up to three arguments. The map method calls the callbackfn function one time for each element in the array.
     * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
     */
    map(callbackfn, thisArg) {
        /*
         * [NOTE] original implement is very very high-cost.
         *        so it's converted native Array once, and restored.
         *
         * return (super.map as UnknownFunction)(...arguments);
         */
        return ObservableArray.from([...this].map(callbackfn, thisArg));
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IObservableEventBrokerAccess
    /** @internal */
    getBroker() {
        const { broker } = this[_internal];
        return broker.get();
    }
    ///////////////////////////////////////////////////////////////////////
    // private mehtods:
    /** @internal */
    [_stockChange](type, index, newValue, oldValue) {
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
            }
            else {
                for (let r, i = len; --i > rci;) {
                    r = records[i];
                    (r.index >= index) && (r.index -= rct);
                }
                const prevRecord = records.splice(rci, 1)[0];
                if (type !== -1 /* ArrayChangeType.REMOVE */) {
                    // INSERT => UPDATE : INSERT
                    // REMOVE => INSERT : UPDATE
                    this[_stockChange](Number(!type), index, newValue, prevRecord.oldValue);
                }
            }
            return;
        }
        indexes.add(index);
        records[len] = { type, index, newValue, oldValue };
        if ("active" /* ObservableState.ACTIVE */ === state && 0 === len) {
            void post(() => this[_notifyChanges]());
        }
    }
    /** @internal */
    [_notifyChanges]() {
        const { state, records } = this[_internal];
        if ("active" /* ObservableState.ACTIVE */ !== state || 0 === records.length) {
            return;
        }
        for (const r of records) {
            Object.freeze(r);
        }
        this[_notify](Object.freeze(records));
        this[_internal].records = [];
    }
    /** @internal */
    [_notify](records) {
        const internal = this[_internal];
        internal.indexes.clear();
        internal.broker.get().trigger('@', records);
    }
}

export { ObservableArray, ObservableObject, isObservable };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZS5tanMiLCJzb3VyY2VzIjpbImludGVybmFsLnRzIiwiY29tbW9uLnRzIiwib2JqZWN0LnRzIiwiYXJyYXkudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgICBVbmtub3duT2JqZWN0LFxuICAgIGlzU3RyaW5nLFxuICAgIGlzU3ltYm9sLFxuICAgIGNsYXNzTmFtZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuXG4vKiogQGludGVybmFsIEV2ZW50QnJva2VyUHJveHkgKi9cbmV4cG9ydCBjbGFzcyBFdmVudEJyb2tlclByb3h5PEV2ZW50IGV4dGVuZHMgb2JqZWN0PiB7XG4gICAgcHJpdmF0ZSBfYnJva2VyPzogRXZlbnRCcm9rZXI8RXZlbnQ+O1xuICAgIHB1YmxpYyBnZXQoKTogRXZlbnRCcm9rZXI8RXZlbnQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Jyb2tlciB8fCAodGhpcy5fYnJva2VyID0gbmV3IEV2ZW50QnJva2VyKCkpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgX2ludGVybmFsICAgICAgPSBTeW1ib2woJ2ludGVybmFsJyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBfbm90aWZ5ICAgICAgICA9IFN5bWJvbCgnbm90aWZ5Jyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBfc3RvY2tDaGFuZ2UgICA9IFN5bWJvbCgnc3RvY2stY2hhbmdlJyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBfbm90aWZ5Q2hhbmdlcyA9IFN5bWJvbCgnbm90aWZ5LWNoYW5nZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZlcmlmeU9ic2VydmFibGUoeDogdW5rbm93bik6IHZvaWQgfCBuZXZlciB7XG4gICAgaWYgKCF4IHx8ICEoeCBhcyBVbmtub3duT2JqZWN0KVtfaW50ZXJuYWxdKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFRoZSBvYmplY3QgcGFzc2VkIGlzIG5vdCBhbiBJT2JzZXJ2YWJsZS5gKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiB2ZXJpZnlWYWxpZEtleShrZXk6IHVua25vd24pOiB2b2lkIHwgbmV2ZXIge1xuICAgIGlmIChpc1N0cmluZyhrZXkpIHx8IGlzU3ltYm9sKGtleSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBUeXBlIG9mICR7Y2xhc3NOYW1lKGtleSl9IGlzIG5vdCBhIHZhbGlkIGtleS5gKTtcbn1cbiIsImltcG9ydCB0eXBlIHsgVW5rbm93bk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24sIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgX2ludGVybmFsIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKlxuICogQGVuIEV2ZW50IG9ic2VydmF0aW9uIHN0YXRlIGRlZmluaXRpb24uXG4gKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL5a6a576pXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIE9ic2VydmFibGVTdGF0ZSB7XG4gICAgLyoqIG9ic2VydmFibGUgcmVhZHkgKi9cbiAgICBBQ1RJVkUgICA9ICdhY3RpdmUnLFxuICAgIC8qKiBOT1Qgb2JzZXJ2ZWQsIGJ1dCBwcm9wZXJ0eSBjaGFuZ2VzIGFyZSByZWNvcmRlZC4gKi9cbiAgICBTVVNFUE5ERUQgPSAnc3VzcGVuZGVkJyxcbiAgICAvKiogTk9UIG9ic2VydmVkLCBhbmQgbm90IHJlY29yZGluZyBwcm9wZXJ0eSBjaGFuZ2VzLiAqL1xuICAgIERJU0FCTEVEID0gJ2Rpc2FibGVkJyxcbn1cblxuLyoqXG4gKiBAZW4gT2JzZXJ2YWJsZSBjb21tb24gaW50ZXJmYWNlLlxuICogQGphIE9ic2VydmFibGUg5YWx6YCa44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSU9ic2VydmFibGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqL1xuICAgIG9uKC4uLmFyZ3M6IHVua25vd25bXSk6IFN1YnNjcmlwdGlvbjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmKC4uLmFyZ3M6IHVua25vd25bXSk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3VzcGVuZCBvciBkaXNhYmxlIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44K144K544Oa44Oz44OJXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm9SZWNvcmRcbiAgICAgKiAgLSBgZW5gIGB0cnVlYDogbm90IHJlY29yZGluZyBwcm9wZXJ0eSBjaGFuZ2VzIGFuZCBjbGVhciBjaGFuZ2VzLiAvIGBmYWxzZWA6IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkIGFuZCBmaXJlZCB3aGVuIFtbcmVzdW1lXV0oKSBjYWxsZGVkLiAoZGVmYXVsdClcbiAgICAgKiAgLSBgamFgIGB0cnVlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044KC6KiY6Yyy44Gb44GaLCDnj77lnKjjga7oqJjpjLLjgoLnoLTmo4QgLyBgZmFsc2VgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7Tjga/oqJjpjLLjgZXjgowsIFtbcmVzdW1lXV0oKSDmmYLjgavnmbrngavjgZnjgosgKOaXouWumilcbiAgICAgKi9cbiAgICBzdXNwZW5kKG5vUmVjb3JkPzogYm9vbGVhbik6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzdW1lIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44Oq44K444Ol44O844OgXG4gICAgICovXG4gICAgcmVzdW1lKCk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gb2JzZXJ2YXRpb24gc3RhdGVcbiAgICAgKiBAamEg6LO86Kqt5Y+v6IO954q25oWLXG4gICAgICovXG4gICAgZ2V0T2JzZXJ2YWJsZVN0YXRlKCk6IE9ic2VydmFibGVTdGF0ZTtcbn1cblxuLyoqXG4gKiBAZW4gSW50ZXJmYWNlIGFibGUgdG8gYWNjZXNzIHRvIFtbRXZlbnRCcm9rZXJdXSB3aXRoIFtbSU9ic2VydmFibGVdXS5cbiAqIEBqYSBbW0lPYnNlcnZhYmxlXV0g44Gu5oyB44Gk5YaF6YOoIFtbRXZlbnRCcm9rZXJdXSDjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJT2JzZXJ2YWJsZUV2ZW50QnJva2VyQWNjZXNzPFQgZXh0ZW5kcyBvYmplY3QgPSBhbnk+IGV4dGVuZHMgSU9ic2VydmFibGUgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IFtbRXZlbnRCcm9rZXJdXSBpbnN0YW5jZS5cbiAgICAgKiBAamEgW1tFdmVudEJyb2tlcl1dIOOCpOODs+OCueOCv+ODs+OCueOBruWPluW+l1xuICAgICAqL1xuICAgIGdldEJyb2tlcigpOiBFdmVudEJyb2tlcjxUPjtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgW1tJT2JzZXJ2YWJsZV1dLlxuICogQGphIFtbSU9ic2VydmFibGVdXSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09ic2VydmFibGUoeDogdW5rbm93bik6IHggaXMgSU9ic2VydmFibGUge1xuICAgIHJldHVybiBCb29sZWFuKHggJiYgKHggYXMgVW5rbm93bk9iamVjdClbX2ludGVybmFsXSk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBVbmtub3duT2JqZWN0LFxuICAgIE5vbkZ1bmN0aW9uUHJvcGVydGllcyxcbiAgICBOb25GdW5jdGlvblByb3BlcnR5TmFtZXMsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICB2ZXJpZnksXG4gICAgcG9zdCxcbiAgICBkZWVwTWVyZ2UsXG4gICAgZGVlcEVxdWFsLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uLCBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgRXZlbnRCcm9rZXJQcm94eSxcbiAgICBfaW50ZXJuYWwsXG4gICAgX25vdGlmeSxcbiAgICBfc3RvY2tDaGFuZ2UsXG4gICAgX25vdGlmeUNoYW5nZXMsXG4gICAgdmVyaWZ5T2JzZXJ2YWJsZSxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlU3RhdGUsIElPYnNlcnZhYmxlIH0gZnJvbSAnLi9jb21tb24nO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgSW50ZXJuYWxQcm9wcyB7XG4gICAgc3RhdGU6IE9ic2VydmFibGVTdGF0ZTtcbiAgICBjaGFuZ2VkOiBib29sZWFuO1xuICAgIHJlYWRvbmx5IGNoYW5nZU1hcDogTWFwPFByb3BlcnR5S2V5LCBhbnk+O1xuICAgIHJlYWRvbmx5IGJyb2tlcjogRXZlbnRCcm9rZXJQcm94eTxhbnk+O1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcHJveHlIYW5kbGVyOiBQcm94eUhhbmRsZXI8T2JzZXJ2YWJsZU9iamVjdD4gPSB7XG4gICAgc2V0KHRhcmdldCwgcCwgdmFsdWUsIHJlY2VpdmVyKSB7XG4gICAgICAgIGlmICghaXNTdHJpbmcocCkpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LnNldCh0YXJnZXQsIHAsIHZhbHVlLCByZWNlaXZlcik7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSAodGFyZ2V0IGFzIGFueSlbcF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IHRhcmdldFtfaW50ZXJuYWxdLnN0YXRlICYmIHZhbHVlICE9PSBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgdGFyZ2V0W19zdG9ja0NoYW5nZV0ocCwgb2xkVmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBSZWZsZWN0LnNldCh0YXJnZXQsIHAsIHZhbHVlLCByZWNlaXZlcik7XG4gICAgfSxcbn07XG5PYmplY3QuZnJlZXplKF9wcm94eUhhbmRsZXIpO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gT2JzZXJ2YWJsZSBrZXkgdHlwZSBkZWZpbml0aW9uLlxuICogQGphIOizvOiqreWPr+iDveOBquOCreODvOOBruWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBPYnNlcnZhYmxlS2V5czxUIGV4dGVuZHMgT2JzZXJ2YWJsZU9iamVjdD4gPSBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VD47XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgb2JqZWN0IGNsYXNzIHdoaWNoIGNoYW5nZSBjYW4gYmUgb2JzZXJ2ZWQuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu5aSJ5pu044KS55uj6KaW44Gn44GN44KL44Kq44OW44K444Kn44Kv44OI44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogY2xhc3MgRXhhbXBsZSBleHRlbmRzIE9ic2VydmFibGVPYmplY3Qge1xuICogICBwdWJsaWMgYTogbnVtYmVyID0gMDtcbiAqICAgcHVibGljIGI6IG51bWJlciA9IDA7XG4gKiAgIHB1YmxpYyBnZXQgc3VtKCk6IG51bWJlciB7XG4gKiAgICAgICByZXR1cm4gdGhpcy5hICsgdGhpcy5iO1xuICogICB9XG4gKiB9XG4gKlxuICogY29uc3Qgb2JzZXJ2YWJsZSA9IG5ldyBFeGFtcGxlKCk7XG4gKlxuICogZnVuY3Rpb24gb25OdW1DaGFuZ2UobmV3VmFsdWU6IG51bWJlciwgb2xkVmFsdWU6IG51bWJlciwga2V5OiBzdHJpbmcpIHtcbiAqICAgY29uc29sZS5sb2coYCR7a2V5fSBjaGFuZ2VkIGZyb20gJHtvbGRWYWx1ZX0gdG8gJHtuZXdWYWx1ZX0uYCk7XG4gKiB9XG4gKiBvYnNlcnZhYmxlLm9uKFsnYScsICdiJ10sIG9uTnVtQ2hhbmdlKTtcbiAqXG4gKiAvLyB1cGRhdGVcbiAqIG9ic2VydmFibGUuYSA9IDEwMDtcbiAqIG9ic2VydmFibGUuYiA9IDIwMDtcbiAqXG4gKiAvLyBjb25zb2xlIG91dCBmcm9tIGBhc3luY2AgZXZlbnQgbG9vcC5cbiAqIC8vID0+ICdhIGNoYW5nZWQgZnJvbSAwIHRvIDEwMC4nXG4gKiAvLyA9PiAnYiBjaGFuZ2VkIGZyb20gMCB0byAyMDAuJ1xuICpcbiAqIDpcbiAqXG4gKiBmdW5jdGlvbiBvblN1bUNoYW5nZShuZXdWYWx1ZTogbnVtYmVyLCBvbGRWYWx1ZTogbnVtYmVyKSB7XG4gKiAgIGNvbnNvbGUubG9nKGBzdW0gY2hhbmdlZCBmcm9tICR7b2xkVmFsdWV9IHRvICR7bmV3VmF1ZX0uYCk7XG4gKiB9XG4gKiBvYnNlcnZhYmxlLm9uKCdzdW0nLCBvblN1bUNoYW5nZSk7XG4gKlxuICogLy8gdXBkYXRlXG4gKiBvYnNlcnZhYmxlLmEgPSAxMDA7IC8vIG5vdGhpbmcgcmVhY3Rpb24gYmVjYXVzZSBvZiBubyBjaGFuZ2UgcHJvcGVydGllcy5cbiAqIG9ic2VydmFibGUuYSA9IDIwMDtcbiAqXG4gKiAvLyBjb25zb2xlIG91dCBmcm9tIGBhc3luY2AgZXZlbnQgbG9vcC5cbiAqIC8vID0+ICdzdW0gY2hhbmdlZCBmcm9tIDMwMCB0byA0MDAuJ1xuICogYGBgXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBPYnNlcnZhYmxlT2JqZWN0IGltcGxlbWVudHMgSU9ic2VydmFibGUge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfaW50ZXJuYWxdITogSW50ZXJuYWxQcm9wcztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdGVcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgc3RhdGUuIGRlZmF1bHQ6IFtbT2JzZXJ2YWJsZVN0YXRlLkFDVElWRV1dXG4gICAgICogIC0gYGphYCDliJ3mnJ/nirbmhYsg5pei5a6aOiBbW09ic2VydmFibGVTdGF0ZS5BQ1RJVkVdXVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHN0YXRlID0gT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBPYnNlcnZhYmxlT2JqZWN0LCB0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWw6IEludGVybmFsUHJvcHMgPSB7XG4gICAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICAgIGNoYW5nZWQ6IGZhbHNlLFxuICAgICAgICAgICAgY2hhbmdlTWFwOiBuZXcgTWFwKCksXG4gICAgICAgICAgICBicm9rZXI6IG5ldyBFdmVudEJyb2tlclByb3h5PHRoaXM+KCksXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBfaW50ZXJuYWwsIHsgdmFsdWU6IE9iamVjdC5zZWFsKGludGVybmFsKSB9KTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eSh0aGlzLCBfcHJveHlIYW5kbGVyKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJT2JzZXJ2YWJsZVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBwcm9wZXJ0eSBjaGFuZ2VzLlxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlpInmm7Tos7zoqq3oqK3lrpogKOWFqOODl+ODreODkeODhuOCo+ebo+imlilcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0eVxuICAgICAqICAtIGBlbmAgd2lsZCBjb3JkIHNpZ25hdHVyZS5cbiAgICAgKiAgLSBgamFgIOODr+OCpOODq+ODieOCq+ODvOODiVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIHByb3BlcnR5IGNoYW5nZS5cbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uKHByb3BlcnR5OiAnQCcsIGxpc3RlbmVyOiAoY29udGV4dDogT2JzZXJ2YWJsZU9iamVjdCkgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgcHJvcGVydHkgY2hhbmdlKHMpLlxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlpInmm7Tos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0eVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44OX44Ot44OR44OG44KjXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgcHJvcGVydHkgY2hhbmdlLlxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb248SyBleHRlbmRzIE9ic2VydmFibGVLZXlzPHRoaXM+Pihwcm9wZXJ0eTogSyB8IEtbXSwgbGlzdGVuZXI6IChuZXdWYWx1ZTogdGhpc1tLXSwgb2xkVmFsdWU6IHRoaXNbS10sIGtleTogSykgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbjtcblxuICAgIG9uPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk6IEsgfCBLW10sIGxpc3RlbmVyOiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCB7IGNoYW5nZU1hcCwgYnJva2VyIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGJyb2tlci5nZXQoKS5vbihwcm9wZXJ0eSwgbGlzdGVuZXIpO1xuICAgICAgICBpZiAoMCA8IGNoYW5nZU1hcC5zaXplKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wcyA9IGlzQXJyYXkocHJvcGVydHkpID8gcHJvcGVydHkgOiBbcHJvcGVydHldO1xuICAgICAgICAgICAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BzKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlTWFwLmhhcyhwcm9wKSB8fCBjaGFuZ2VNYXAuc2V0KHByb3AsIHRoaXNbcHJvcF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIHByb3BlcnR5IGNoYW5nZXMpXG4gICAgICogQGphIOODl+ODreODkeODhuOCo+WkieabtOizvOiqreino+mZpCAo5YWo44OX44Ot44OR44OG44Kj55uj6KaWKVxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnR5XG4gICAgICogIC0gYGVuYCB3aWxkIGNvcmQgc2lnbmF0dXJlLlxuICAgICAqICAtIGBqYWAg44Ov44Kk44Or44OJ44Kr44O844OJXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgcHJvcGVydHkgY2hhbmdlLlxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb2ZmKHByb3BlcnR5OiAnQCcsIGxpc3RlbmVyPzogKGNvbnRleHQ6IE9ic2VydmFibGVPYmplY3QpID0+IGFueSk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgcHJvcGVydHkgY2hhbmdlKHMpLlxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlpInmm7Tos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0eVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5LlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBldmVyeXRoaW5nIGlzIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44OX44Ot44OR44OG44KjXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/jgZnjgbnjgabop6PpmaRcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBwcm9wZXJ0eSBjaGFuZ2UuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lkIzkuIAgYGNoYW5uZWxgIOOBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIG9mZjxLIGV4dGVuZHMgT2JzZXJ2YWJsZUtleXM8dGhpcz4+KHByb3BlcnR5PzogSyB8IEtbXSwgbGlzdGVuZXI/OiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IHVua25vd24pOiB2b2lkO1xuXG4gICAgb2ZmPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk/OiBLIHwgS1tdLCBsaXN0ZW5lcj86IChuZXdWYWx1ZTogdGhpc1tLXSwgb2xkVmFsdWU6IHRoaXNbS10sIGtleTogSykgPT4gdW5rbm93bik6IHZvaWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uYnJva2VyLmdldCgpLm9mZihwcm9wZXJ0eSwgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdXNwZW5kIG9yIGRpc2FibGUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jgrXjgrnjg5rjg7Pjg4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub1JlY29yZFxuICAgICAqICAtIGBlbmAgYHRydWVgOiBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMgYW5kIGNsZWFyIGNoYW5nZXMuIC8gYGZhbHNlYDogcHJvcGVydHkgY2hhbmdlcyBhcmUgcmVjb3JkZWQgYW5kIGZpcmVkIHdoZW4gW1tyZXN1bWVdXSgpIGNhbGxkZWQuIChkZWZhdWx0KVxuICAgICAqICAtIGBqYWAgYHRydWVgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7TjgoLoqJjpjLLjgZvjgZosIOePvuWcqOOBruiomOmMsuOCguegtOajhCAvIGBmYWxzZWA6IOODl+ODreODkeODhuOCo+WkieabtOOBr+iomOmMsuOBleOCjCwgW1tyZXN1bWVdXSgpIOaZguOBq+eZuueBq+OBmeOCiyAo5pei5a6aKVxuICAgICAqL1xuICAgIHN1c3BlbmQobm9SZWNvcmQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uc3RhdGUgPSBub1JlY29yZCA/IE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA6IE9ic2VydmFibGVTdGF0ZS5TVVNFUE5ERUQ7XG4gICAgICAgIGlmIChub1JlY29yZCkge1xuICAgICAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmNoYW5nZU1hcC5jbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN1bWUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jg6rjgrjjg6Xjg7zjg6BcbiAgICAgKi9cbiAgICByZXN1bWUoKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIGludGVybmFsLnN0YXRlID0gT2JzZXJ2YWJsZVN0YXRlLkFDVElWRTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB0aGlzW19ub3RpZnlDaGFuZ2VzXSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gb2JzZXJ2YXRpb24gc3RhdGVcbiAgICAgKiBAamEg6LO86Kqt5Y+v6IO954q25oWLXG4gICAgICovXG4gICAgZ2V0T2JzZXJ2YWJsZVN0YXRlKCk6IE9ic2VydmFibGVTdGF0ZSB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzW19pbnRlcm5hbF0uc3RhdGU7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2Vzc1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIGdldEJyb2tlcigpOiBFdmVudEJyb2tlcjxOb25GdW5jdGlvblByb3BlcnRpZXM8dGhpcz4+IHtcbiAgICAgICAgY29uc3QgeyBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgcmV0dXJuIGJyb2tlci5nZXQoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBzdGF0aWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgW1tPYnNlcnZhYmxlT2JqZWN0XV0gZnJvbSBhbnkgb2JqZWN0LlxuICAgICAqIEBqYSDku7vmhI/jga7jgqrjg5bjgrjjgqfjgq/jg4jjgYvjgokgW1tPYnNlcnZhYmxlT2JqZWN0XV0g44KS55Sf5oiQXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNvbnN0IG9ic2VydmFibGUgPSBPYnNlcnZhYmxlT2JqZWN0LmZyb20oeyBhOiAxLCBiOiAxIH0pO1xuICAgICAqIGZ1bmN0aW9uIG9uTnVtQ2hhbmdlKG5ld1ZhbHVlOiBudW1iZXIsIG9sZFZhbHVlOiBudW1iZXIsIGtleTogc3RyaW5nKSB7XG4gICAgICogICBjb25zb2xlLmxvZyhgJHtrZXl9IGNoYW5nZWQgZnJvbSAke29sZFZhbHVlfSB0byAke25ld1ZhbHVlfS5gKTtcbiAgICAgKiB9XG4gICAgICogb2JzZXJ2YWJsZS5vbihbJ2EnLCAnYiddLCBvbk51bUNoYW5nZSk7XG4gICAgICpcbiAgICAgKiAvLyB1cGRhdGVcbiAgICAgKiBvYnNlcnZhYmxlLmEgPSAxMDA7XG4gICAgICogb2JzZXJ2YWJsZS5iID0gMjAwO1xuICAgICAqXG4gICAgICogLy8gY29uc29sZSBvdXQgZnJvbSBgYXN5bmNgIGV2ZW50IGxvb3AuXG4gICAgICogLy8gPT4gJ2EgY2hhbmdlZCBmcm9tIDEgdG8gMTAwLidcbiAgICAgKiAvLyA9PiAnYiBjaGFuZ2VkIGZyb20gMSB0byAyMDAuJ1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgb2JqZWN0PihzcmM6IFQpOiBPYnNlcnZhYmxlT2JqZWN0ICYgVCB7XG4gICAgICAgIGNvbnN0IG9ic2VydmFibGUgPSBkZWVwTWVyZ2UobmV3IGNsYXNzIGV4dGVuZHMgT2JzZXJ2YWJsZU9iamVjdCB7IH0oT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEKSwgc3JjKTtcbiAgICAgICAgb2JzZXJ2YWJsZS5yZXN1bWUoKTtcbiAgICAgICAgcmV0dXJuIG9ic2VydmFibGUgYXMgYW55O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByb3RlY3RlZCBtZWh0b2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEZvcmNlIG5vdGlmeSBwcm9wZXJ0eSBjaGFuZ2UocykgaW4gc3BpdGUgb2YgYWN0aXZlIHN0YXRlLlxuICAgICAqIEBqYSDjgqLjgq/jg4bjgqPjg5bnirbmhYvjgavjgYvjgYvjgo/jgonjgZrlvLfliLbnmoTjgavjg5fjg63jg5Hjg4bjgqPlpInmm7TpgJrnn6XjgpLnmbrooYxcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgbm90aWZ5KC4uLnByb3BlcnRpZXM6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGlmICgwID09PSBwcm9wZXJ0aWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHsgY2hhbmdlTWFwIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IGtleVZhbHVlID0gbmV3IE1hcDxQcm9wZXJ0eUtleSwgW2FueSwgYW55XT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgcHJvcGVydGllcykge1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSAodGhpcyBhcyBVbmtub3duT2JqZWN0KVtrZXldO1xuICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBjaGFuZ2VNYXAuaGFzKGtleSkgPyBjaGFuZ2VNYXAuZ2V0KGtleSkgOiBuZXdWYWx1ZTtcbiAgICAgICAgICAgIGtleVZhbHVlLnNldChrZXksIFtuZXdWYWx1ZSwgb2xkVmFsdWVdKTtcbiAgICAgICAgfVxuICAgICAgICAwIDwga2V5VmFsdWUuc2l6ZSAmJiB0aGlzW19ub3RpZnldKGtleVZhbHVlKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1laHRvZHM6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX3N0b2NrQ2hhbmdlXShwOiBzdHJpbmcsIG9sZFZhbHVlOiBhbnkpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZSwgY2hhbmdlTWFwLCBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmNoYW5nZWQgPSB0cnVlO1xuICAgICAgICBpZiAoMCA9PT0gY2hhbmdlTWFwLnNpemUpIHtcbiAgICAgICAgICAgIGNoYW5nZU1hcC5zZXQocCwgb2xkVmFsdWUpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBrIG9mIGJyb2tlci5nZXQoKS5jaGFubmVscygpKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlTWFwLmhhcyhrKSB8fCBjaGFuZ2VNYXAuc2V0KGssICh0aGlzIGFzIFVua25vd25PYmplY3QpW2tdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFID09PSBzdGF0ZSkge1xuICAgICAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB0aGlzW19ub3RpZnlDaGFuZ2VzXSgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNoYW5nZU1hcC5oYXMocCkgfHwgY2hhbmdlTWFwLnNldChwLCBvbGRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeUNoYW5nZXNdKCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCBjaGFuZ2VNYXAgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgIT09IHN0YXRlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qga2V5VmFsdWVQYWlycyA9IG5ldyBNYXA8UHJvcGVydHlLZXksIFthbnksIGFueV0+KCk7XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgb2xkVmFsdWVdIG9mIGNoYW5nZU1hcCkge1xuICAgICAgICAgICAgY29uc3QgY3VyVmFsdWUgPSAodGhpcyBhcyBVbmtub3duT2JqZWN0KVtrZXldO1xuICAgICAgICAgICAgaWYgKCFkZWVwRXF1YWwob2xkVmFsdWUsIGN1clZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGtleVZhbHVlUGFpcnMuc2V0KGtleSwgW2N1clZhbHVlLCBvbGRWYWx1ZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXNbX25vdGlmeV0oa2V5VmFsdWVQYWlycyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19ub3RpZnldKGtleVZhbHVlOiBNYXA8UHJvcGVydHlLZXksIFthbnksIGFueV0+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgY2hhbmdlZCwgY2hhbmdlTWFwLCBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY2hhbmdlTWFwLmNsZWFyKCk7XG4gICAgICAgIHRoaXNbX2ludGVybmFsXS5jaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGV2ZW50QnJva2VyID0gYnJva2VyLmdldCgpO1xuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlc10gb2Yga2V5VmFsdWUpIHtcbiAgICAgICAgICAgIChldmVudEJyb2tlciBhcyBhbnkpLnRyaWdnZXIoa2V5LCAuLi52YWx1ZXMsIGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoYW5nZWQpIHtcbiAgICAgICAgICAgIGV2ZW50QnJva2VyLnRyaWdnZXIoJ0AnLCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgcHJlZmVyLXJlc3QtcGFyYW1zLFxuICovXG5cbmltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIFdyaXRhYmxlLFxuICAgIGlzTnVtYmVyLFxuICAgIHZlcmlmeSxcbiAgICBwb3N0LFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uLCBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgRXZlbnRCcm9rZXJQcm94eSxcbiAgICBfaW50ZXJuYWwsXG4gICAgX25vdGlmeSxcbiAgICBfc3RvY2tDaGFuZ2UsXG4gICAgX25vdGlmeUNoYW5nZXMsXG4gICAgdmVyaWZ5T2JzZXJ2YWJsZSxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlU3RhdGUsIElPYnNlcnZhYmxlIH0gZnJvbSAnLi9jb21tb24nO1xuXG4vKipcbiAqIEBlbiBBcnJheSBjaGFuZ2UgdHlwZSBpbmZvcm1hdGlvbi4gPGJyPlxuICogICAgIFRoZSB2YWx1ZSBpcyBzdWl0YWJsZSBmb3IgdGhlIG51bWJlciBvZiBmbHVjdHVhdGlvbiBvZiB0aGUgZWxlbWVudC5cbiAqIEBqYSDphY3liJflpInmm7TpgJrnn6Xjga7jgr/jgqTjg5cgPGJyPlxuICogICAgIOWApOOBr+imgee0oOOBruWil+a4m+aVsOOBq+ebuOW9k1xuICpcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQXJyYXlDaGFuZ2VUeXBlIHtcbiAgICBSRU1PVkUgPSAtMSxcbiAgICBVUERBVEUgPSAwLFxuICAgIElOU0VSVCA9IDEsXG59XG5cbi8qKlxuICogQGVuIEFycmF5IGNoYW5nZSByZWNvcmQgaW5mb3JtYXRpb24uXG4gKiBAamEg6YWN5YiX5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXJyYXlDaGFuZ2VSZWNvcmQ8VD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgY2hhbmdlIHR5cGUgaW5mb3JtYXRpb24uXG4gICAgICogQGphIOmFjeWIl+WkieabtOaDheWgseOBruitmOWIpeWtkFxuICAgICAqL1xuICAgIHJlYWRvbmx5IHR5cGU6IEFycmF5Q2hhbmdlVHlwZTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgY2hhbmdlIHR5cGUgaW5mb3JtYXRpb24uIDxicj5cbiAgICAgKiAgICAg4oC7IFtBdHRlbnRpb25dIFRoZSBpbmRleCB3aWxsIGJlIGRpZmZlcmVudCBmcm9tIHRoZSBhY3R1YWwgbG9jYXRpb24gd2hlbiBhcnJheSBzaXplIGNoYW5nZWQgYmVjYXVzZSB0aGF0IGRldGVybWluZXMgZWxlbWVudCBvcGVyYXRpb24gdW5pdC5cbiAgICAgKiBAamEg5aSJ5pu044GM55m655Sf44GX44Gf6YWN5YiX5YaF44Gu5L2N572u44GuIGluZGV4IDxicj5cbiAgICAgKiAgICAg4oC7IFvms6jmhI9dIOOCquODmuODrOODvOOCt+ODp+ODs+WNmOS9jeOBriBpbmRleCDjgajjgarjgoosIOimgee0oOOBjOWil+a4m+OBmeOCi+WgtOWQiOOBr+Wun+mam+OBruS9jee9ruOBqOeVsOOBquOCi+OBk+OBqOOBjOOBguOCi1xuICAgICAqL1xuICAgIHJlYWRvbmx5IGluZGV4OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTmV3IGVsZW1lbnQncyB2YWx1ZS5cbiAgICAgKiBAamEg6KaB57Sg44Gu5paw44GX44GE5YCkXG4gICAgICovXG4gICAgcmVhZG9ubHkgbmV3VmFsdWU/OiBUO1xuXG4gICAgLyoqXG4gICAgICogQGVuIE9sZCBlbGVtZW50J3MgdmFsdWUuXG4gICAgICogQGphIOimgee0oOOBruWPpOOBhOWApFxuICAgICAqL1xuICAgIHJlYWRvbmx5IG9sZFZhbHVlPzogVDtcbn1cbnR5cGUgTXV0YWJsZUNoYW5nZVJlY29yZDxUPiA9IFdyaXRhYmxlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+PjtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBJQXJyYXlDaGFuZ2VFdmVudDxUPiB7XG4gICAgJ0AnOiBbQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXV07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBJbnRlcm5hbFByb3BzPFQgPSB1bmtub3duPiB7XG4gICAgc3RhdGU6IE9ic2VydmFibGVTdGF0ZTtcbiAgICBieU1ldGhvZDogYm9vbGVhbjtcbiAgICByZWNvcmRzOiBNdXRhYmxlQ2hhbmdlUmVjb3JkPFQ+W107XG4gICAgcmVhZG9ubHkgaW5kZXhlczogU2V0PG51bWJlcj47XG4gICAgcmVhZG9ubHkgYnJva2VyOiBFdmVudEJyb2tlclByb3h5PElBcnJheUNoYW5nZUV2ZW50PFQ+Pjtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3Byb3h5SGFuZGxlcjogUHJveHlIYW5kbGVyPE9ic2VydmFibGVBcnJheT4gPSB7XG4gICAgZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKSB7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGFyZ2V0W19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgPT09IGludGVybmFsLnN0YXRlIHx8IGludGVybmFsLmJ5TWV0aG9kIHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYXR0cmlidXRlcywgJ3ZhbHVlJykpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSAodGFyZ2V0IGFzIGFueSlbcF07IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGF0dHJpYnV0ZXMudmFsdWU7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBlcWVxZXFcbiAgICAgICAgaWYgKCdsZW5ndGgnID09PSBwICYmIG5ld1ZhbHVlICE9IG9sZFZhbHVlKSB7IC8vIERvIE5PVCB1c2Ugc3RyaWN0IGluZXF1YWxpdHkgKCE9PSlcbiAgICAgICAgICAgIGNvbnN0IG9sZExlbmd0aCA9IG9sZFZhbHVlID4+PiAwO1xuICAgICAgICAgICAgY29uc3QgbmV3TGVuZ3RoID0gbmV3VmFsdWUgPj4+IDA7XG4gICAgICAgICAgICBjb25zdCBzdG9jayA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzY3JhcCA9IG5ld0xlbmd0aCA8IG9sZExlbmd0aCAmJiB0YXJnZXQuc2xpY2UobmV3TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBpZiAoc2NyYXApIHsgLy8gbmV3TGVuZ3RoIDwgb2xkTGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBvbGRMZW5ndGg7IC0taSA+PSBuZXdMZW5ndGg7KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuUkVNT1ZFLCBpLCB1bmRlZmluZWQsIHNjcmFwW2kgLSBuZXdMZW5ndGhdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgICAvLyBvbGRMZW5ndGggPCBuZXdMZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IG9sZExlbmd0aDsgaSA8IG5ld0xlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuSU5TRVJULCBpIC8qLCB1bmRlZmluZWQsIHVuZGVmaW5lZCAqLyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHAsIGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgcmVzdWx0ICYmIHN0b2NrKCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGVsc2UgaWYgKG5ld1ZhbHVlICE9PSBvbGRWYWx1ZSAmJiBpc1ZhbGlkQXJyYXlJbmRleChwKSkge1xuICAgICAgICAgICAgY29uc3QgaSA9IHAgYXMgdW5rbm93biBhcyBudW1iZXIgPj4+IDA7XG4gICAgICAgICAgICBjb25zdCB0eXBlOiBBcnJheUNoYW5nZVR5cGUgPSBOdW1iZXIoaSA+PSB0YXJnZXQubGVuZ3RoKTsgLy8gSU5TRVJUIG9yIFVQREFURVxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHAsIGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgcmVzdWx0ICYmIHRhcmdldFtfc3RvY2tDaGFuZ2VdKHR5cGUsIGksIG5ld1ZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZGVsZXRlUHJvcGVydHkodGFyZ2V0LCBwKSB7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGFyZ2V0W19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgPT09IGludGVybmFsLnN0YXRlIHx8IGludGVybmFsLmJ5TWV0aG9kIHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGFyZ2V0LCBwKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVsZXRlUHJvcGVydHkodGFyZ2V0LCBwKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9ICh0YXJnZXQgYXMgYW55KVtwXTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IFJlZmxlY3QuZGVsZXRlUHJvcGVydHkodGFyZ2V0LCBwKTtcbiAgICAgICAgcmVzdWx0ICYmIGlzVmFsaWRBcnJheUluZGV4KHApICYmIHRhcmdldFtfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5VUERBVEUsIHAgYXMgdW5rbm93biBhcyBudW1iZXIgPj4+IDAsIHVuZGVmaW5lZCwgb2xkVmFsdWUpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG59O1xuT2JqZWN0LmZyZWV6ZShfcHJveHlIYW5kbGVyKTtcblxuLyoqIEBpbnRlcm5hbCB2YWxpZCBhcnJheSBpbmRleCBoZWxwZXIgKi9cbmZ1bmN0aW9uIGlzVmFsaWRBcnJheUluZGV4PFQ+KGluZGV4OiBUKTogYm9vbGVhbiB7XG4gICAgY29uc3QgcyA9IFN0cmluZyhpbmRleCk7XG4gICAgY29uc3QgbiA9IE1hdGgudHJ1bmMocyBhcyB1bmtub3duIGFzIG51bWJlcik7XG4gICAgcmV0dXJuIFN0cmluZyhuKSA9PT0gcyAmJiAwIDw9IG4gJiYgbiA8IDB4RkZGRkZGRkY7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBpbmRleCBtYW5hZ2VtZW50ICovXG5mdW5jdGlvbiBmaW5kUmVsYXRlZENoYW5nZUluZGV4PFQ+KHJlY29yZHM6IE11dGFibGVDaGFuZ2VSZWNvcmQ8VD5bXSwgdHlwZTogQXJyYXlDaGFuZ2VUeXBlLCBpbmRleDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBjb25zdCBjaGVja1R5cGUgPSB0eXBlID09PSBBcnJheUNoYW5nZVR5cGUuSU5TRVJUXG4gICAgICAgID8gKHQ6IEFycmF5Q2hhbmdlVHlwZSkgPT4gdCA9PT0gQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRVxuICAgICAgICA6ICh0OiBBcnJheUNoYW5nZVR5cGUpID0+IHQgIT09IEFycmF5Q2hhbmdlVHlwZS5SRU1PVkVcbiAgICAgICAgO1xuXG4gICAgZm9yIChsZXQgaSA9IHJlY29yZHMubGVuZ3RoOyAtLWkgPj0gMDspIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSByZWNvcmRzW2ldO1xuICAgICAgICBpZiAodmFsdWUuaW5kZXggPT09IGluZGV4ICYmIGNoZWNrVHlwZSh2YWx1ZS50eXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWUuaW5kZXggPCBpbmRleCAmJiBCb29sZWFuKHZhbHVlLnR5cGUpKSB7IC8vIFJFTU9WRSBvciBJTlNFUlRcbiAgICAgICAgICAgIGluZGV4IC09IHZhbHVlLnR5cGU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIGFycmF5IGNsYXNzIHdoaWNoIGNoYW5nZSBjYW4gYmUgb2JzZXJ2ZWQuXG4gKiBAamEg5aSJ5pu055uj6KaW5Y+v6IO944Gq6YWN5YiX44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogY29uc3Qgb2JzQXJyYXkgPSBPYnNlcnZhYmxlQXJyYXkuZnJvbShbJ2EnLCAnYicsICdjJ10pO1xuICpcbiAqIGZ1bmN0aW9uIG9uQ2hhbmdlQXJyYXkocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmRbXSkge1xuICogICBjb25zb2xlLmxvZyhyZWNvcmRzKTtcbiAqICAgLy8gIFtcbiAqICAgLy8gICAgeyB0eXBlOiAxLCBpbmRleDogMywgbmV3VmFsdWU6ICd4Jywgb2xkVmFsdWU6IHVuZGVmaW5lZCB9LFxuICogICAvLyAgICB7IHR5cGU6IDEsIGluZGV4OiA0LCBuZXdWYWx1ZTogJ3knLCBvbGRWYWx1ZTogdW5kZWZpbmVkIH0sXG4gKiAgIC8vICAgIHsgdHlwZTogMSwgaW5kZXg6IDUsIG5ld1ZhbHVlOiAneicsIG9sZFZhbHVlOiB1bmRlZmluZWQgfVxuICogICAvLyAgXVxuICogfVxuICogb2JzQXJyYXkub24ob25DaGFuZ2VBcnJheSk7XG4gKlxuICogZnVuY3Rpb24gYWRkWFlaKCkge1xuICogICBvYnNBcnJheS5wdXNoKCd4JywgJ3knLCAneicpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBPYnNlcnZhYmxlQXJyYXk8VCA9IHVua25vd24+IGV4dGVuZHMgQXJyYXk8VD4gaW1wbGVtZW50cyBJT2JzZXJ2YWJsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19pbnRlcm5hbF0hOiBJbnRlcm5hbFByb3BzPFQ+O1xuXG4gICAgLyoqIEBmaW5hbCBjb25zdHJ1Y3RvciAqL1xuICAgIHByaXZhdGUgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKC4uLmFyZ3VtZW50cyk7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIE9ic2VydmFibGVBcnJheSwgdGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsOiBJbnRlcm5hbFByb3BzPFQ+ID0ge1xuICAgICAgICAgICAgc3RhdGU6IE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUsXG4gICAgICAgICAgICBieU1ldGhvZDogZmFsc2UsXG4gICAgICAgICAgICByZWNvcmRzOiBbXSxcbiAgICAgICAgICAgIGluZGV4ZXM6IG5ldyBTZXQoKSxcbiAgICAgICAgICAgIGJyb2tlcjogbmV3IEV2ZW50QnJva2VyUHJveHk8SUFycmF5Q2hhbmdlRXZlbnQ8VD4+KCksXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBfaW50ZXJuYWwsIHsgdmFsdWU6IE9iamVjdC5zZWFsKGludGVybmFsKSB9KTtcbiAgICAgICAgY29uc3QgYXJnTGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgaWYgKDEgPT09IGFyZ0xlbmd0aCAmJiBpc051bWJlcihhcmd1bWVudHNbMF0pKSB7XG4gICAgICAgICAgICBjb25zdCBsZW4gPSBhcmd1bWVudHNbMF0gPj4+IDA7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGkgLyosIHVuZGVmaW5lZCAqLyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoMCA8IGFyZ0xlbmd0aCkge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmdMZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuSU5TRVJULCBpLCBhcmd1bWVudHNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJveHkodGhpcywgX3Byb3h5SGFuZGxlcikgYXMgT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElPYnNlcnZhYmxlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGFycmF5IGNoYW5nZShzKS5cbiAgICAgKiBAamEg6YWN5YiX5aSJ5pu06LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBhcnJheSBjaGFuZ2UuXG4gICAgICogIC0gYGphYCDphY3liJflpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbihsaXN0ZW5lcjogKHJlY29yZHM6IEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpc1tfaW50ZXJuYWxdLmJyb2tlci5nZXQoKS5vbignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgYXJyYXkgY2hhbmdlKHMpLlxuICAgICAqIEBqYSDphY3liJflpInmm7Tos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGFycmF5IGNoYW5nZS5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgYWxsIHNhbWUgYGNoYW5uZWxgIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDphY3liJflpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WQjOS4gCBgY2hhbm5lbGAg44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmKGxpc3RlbmVyPzogKHJlY29yZHM6IEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10pID0+IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmJyb2tlci5nZXQoKS5vZmYoJ0AnLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1c3BlbmQgb3IgZGlzYWJsZSB0aGUgZXZlbnQgb2JzZXJ2YXRpb24gc3RhdGUuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreeKtuaFi+OBruOCteOCueODmuODs+ODiVxuICAgICAqXG4gICAgICogQHBhcmFtIG5vUmVjb3JkXG4gICAgICogIC0gYGVuYCBgdHJ1ZWA6IG5vdCByZWNvcmRpbmcgcHJvcGVydHkgY2hhbmdlcyBhbmQgY2xlYXIgY2hhbmdlcy4gLyBgZmFsc2VgOiBwcm9wZXJ0eSBjaGFuZ2VzIGFyZSByZWNvcmRlZCBhbmQgZmlyZWQgd2hlbiBbW3Jlc3VtZV1dKCkgY2FsbGRlZC4gKGRlZmF1bHQpXG4gICAgICogIC0gYGphYCBgdHJ1ZWA6IOODl+ODreODkeODhuOCo+WkieabtOOCguiomOmMsuOBm+OBmiwg54++5Zyo44Gu6KiY6Yyy44KC56C05qOEIC8gYGZhbHNlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044Gv6KiY6Yyy44GV44KMLCBbW3Jlc3VtZV1dKCkg5pmC44Gr55m654Gr44GZ44KLICjml6LlrpopXG4gICAgICovXG4gICAgc3VzcGVuZChub1JlY29yZCA9IGZhbHNlKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHRoaXNbX2ludGVybmFsXS5zdGF0ZSA9IG5vUmVjb3JkID8gT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEIDogT2JzZXJ2YWJsZVN0YXRlLlNVU0VQTkRFRDtcbiAgICAgICAgaWYgKG5vUmVjb3JkKSB7XG4gICAgICAgICAgICB0aGlzW19pbnRlcm5hbF0ucmVjb3JkcyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN1bWUgb2YgdGhlIGV2ZW50IHN1YnNjcmlwdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44Oq44K444Ol44O844OgXG4gICAgICovXG4gICAgcmVzdW1lKCk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgIT09IGludGVybmFsLnN0YXRlKSB7XG4gICAgICAgICAgICBpbnRlcm5hbC5zdGF0ZSA9IE9ic2VydmFibGVTdGF0ZS5BQ1RJVkU7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4gdGhpc1tfbm90aWZ5Q2hhbmdlc10oKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIG9ic2VydmF0aW9uIHN0YXRlXG4gICAgICogQGphIOizvOiqreWPr+iDveeKtuaFi1xuICAgICAqL1xuICAgIGdldE9ic2VydmFibGVTdGF0ZSgpOiBPYnNlcnZhYmxlU3RhdGUge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpc1tfaW50ZXJuYWxdLnN0YXRlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG92ZXJyaWRlOiBBcnJheSBtZXRob2RzXG5cbiAgICAvKipcbiAgICAgKiBTb3J0cyBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0gY29tcGFyZUZuIFRoZSBuYW1lIG9mIHRoZSBmdW5jdGlvbiB1c2VkIHRvIGRldGVybWluZSB0aGUgb3JkZXIgb2YgdGhlIGVsZW1lbnRzLiBJZiBvbWl0dGVkLCB0aGUgZWxlbWVudHMgYXJlIHNvcnRlZCBpbiBhc2NlbmRpbmcsIEFTQ0lJIGNoYXJhY3RlciBvcmRlci5cbiAgICAgKi9cbiAgICBzb3J0KGNvbXBhcmF0b3I/OiAobGhzOiBULCByaHM6IFQpID0+IG51bWJlcik6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY29uc3Qgb2xkID0gQXJyYXkuZnJvbSh0aGlzKTtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSB0cnVlO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzdXBlci5zb3J0KGNvbXBhcmF0b3IpO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IGZhbHNlO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgbGVuID0gb2xkLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IG9sZFtpXTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IHRoaXNbaV07XG4gICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlICE9PSBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlVQREFURSwgaSwgbmV3VmFsdWUsIG9sZFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGVsZW1lbnRzIGZyb20gYW4gYXJyYXkgYW5kLCBpZiBuZWNlc3NhcnksIGluc2VydHMgbmV3IGVsZW1lbnRzIGluIHRoZWlyIHBsYWNlLCByZXR1cm5pbmcgdGhlIGRlbGV0ZWQgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIHN0YXJ0IFRoZSB6ZXJvLWJhc2VkIGxvY2F0aW9uIGluIHRoZSBhcnJheSBmcm9tIHdoaWNoIHRvIHN0YXJ0IHJlbW92aW5nIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSBkZWxldGVDb3VudCBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHJlbW92ZS5cbiAgICAgKi9cbiAgICBzcGxpY2Uoc3RhcnQ6IG51bWJlciwgZGVsZXRlQ291bnQ/OiBudW1iZXIpOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBlbGVtZW50cyBmcm9tIGFuIGFycmF5IGFuZCwgaWYgbmVjZXNzYXJ5LCBpbnNlcnRzIG5ldyBlbGVtZW50cyBpbiB0aGVpciBwbGFjZSwgcmV0dXJuaW5nIHRoZSBkZWxldGVkIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSBzdGFydCBUaGUgemVyby1iYXNlZCBsb2NhdGlvbiBpbiB0aGUgYXJyYXkgZnJvbSB3aGljaCB0byBzdGFydCByZW1vdmluZyBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gZGVsZXRlQ291bnQgVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZW1vdmUuXG4gICAgICogQHBhcmFtIGl0ZW1zIEVsZW1lbnRzIHRvIGluc2VydCBpbnRvIHRoZSBhcnJheSBpbiBwbGFjZSBvZiB0aGUgZGVsZXRlZCBlbGVtZW50cy5cbiAgICAgKi9cbiAgICBzcGxpY2Uoc3RhcnQ6IG51bWJlciwgZGVsZXRlQ291bnQ6IG51bWJlciwgLi4uaXRlbXM6IFRbXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICBzcGxpY2Uoc3RhcnQ6IG51bWJlciwgZGVsZXRlQ291bnQ/OiBudW1iZXIsIC4uLml0ZW1zOiBUW10pOiBPYnNlcnZhYmxlQXJyYXk8VD4ge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY29uc3Qgb2xkTGVuID0gdGhpcy5sZW5ndGg7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gKHN1cGVyLnNwbGljZSBhcyBVbmtub3duRnVuY3Rpb24pKC4uLmFyZ3VtZW50cykgYXMgT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IGZhbHNlO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgc3RhcnQgPSBNYXRoLnRydW5jKHN0YXJ0KTtcbiAgICAgICAgICAgIGNvbnN0IGZyb20gPSBzdGFydCA8IDAgPyBNYXRoLm1heChvbGRMZW4gKyBzdGFydCwgMCkgOiBNYXRoLm1pbihzdGFydCwgb2xkTGVuKTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSByZXN1bHQubGVuZ3RoOyAtLWkgPj0gMDspIHtcbiAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRSwgZnJvbSArIGksIHVuZGVmaW5lZCwgcmVzdWx0W2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGxlbiA9IGl0ZW1zLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLklOU0VSVCwgZnJvbSArIGksIGl0ZW1zW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgdGhlIGZpcnN0IGVsZW1lbnQgZnJvbSBhbiBhcnJheSBhbmQgcmV0dXJucyBpdC5cbiAgICAgKi9cbiAgICBzaGlmdCgpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IG9sZExlbiA9IHRoaXMubGVuZ3RoO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLnNoaWZ0KCk7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gZmFsc2U7XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IGludGVybmFsLnN0YXRlICYmIHRoaXMubGVuZ3RoIDwgb2xkTGVuKSB7XG4gICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRSwgMCwgdW5kZWZpbmVkLCByZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5zZXJ0cyBuZXcgZWxlbWVudHMgYXQgdGhlIHN0YXJ0IG9mIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSBpdGVtcyAgRWxlbWVudHMgdG8gaW5zZXJ0IGF0IHRoZSBzdGFydCBvZiB0aGUgQXJyYXkuXG4gICAgICovXG4gICAgdW5zaGlmdCguLi5pdGVtczogVFtdKTogbnVtYmVyIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc3VwZXIudW5zaGlmdCguLi5pdGVtcyk7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gZmFsc2U7XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IGludGVybmFsLnN0YXRlKSB7XG4gICAgICAgICAgICBjb25zdCBsZW4gPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGksIGl0ZW1zW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxzIGEgZGVmaW5lZCBjYWxsYmFjayBmdW5jdGlvbiBvbiBlYWNoIGVsZW1lbnQgb2YgYW4gYXJyYXksIGFuZCByZXR1cm5zIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHJlc3VsdHMuXG4gICAgICogQHBhcmFtIGNhbGxiYWNrZm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdXAgdG8gdGhyZWUgYXJndW1lbnRzLiBUaGUgbWFwIG1ldGhvZCBjYWxscyB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbiBvbmUgdGltZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBBbiBvYmplY3QgdG8gd2hpY2ggdGhlIHRoaXMga2V5d29yZCBjYW4gcmVmZXIgaW4gdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24uIElmIHRoaXNBcmcgaXMgb21pdHRlZCwgdW5kZWZpbmVkIGlzIHVzZWQgYXMgdGhlIHRoaXMgdmFsdWUuXG4gICAgICovXG4gICAgbWFwPFU+KGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSwgdGhpc0FyZz86IHVua25vd24pOiBPYnNlcnZhYmxlQXJyYXk8VT4ge1xuICAgICAgICAvKlxuICAgICAgICAgKiBbTk9URV0gb3JpZ2luYWwgaW1wbGVtZW50IGlzIHZlcnkgdmVyeSBoaWdoLWNvc3QuXG4gICAgICAgICAqICAgICAgICBzbyBpdCdzIGNvbnZlcnRlZCBuYXRpdmUgQXJyYXkgb25jZSwgYW5kIHJlc3RvcmVkLlxuICAgICAgICAgKlxuICAgICAgICAgKiByZXR1cm4gKHN1cGVyLm1hcCBhcyBVbmtub3duRnVuY3Rpb24pKC4uLmFyZ3VtZW50cyk7XG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gT2JzZXJ2YWJsZUFycmF5LmZyb20oWy4uLnRoaXNdLm1hcChjYWxsYmFja2ZuLCB0aGlzQXJnKSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2Vzc1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIGdldEJyb2tlcigpOiBFdmVudEJyb2tlcjxJQXJyYXlDaGFuZ2VFdmVudDxUPj4ge1xuICAgICAgICBjb25zdCB7IGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICByZXR1cm4gYnJva2VyLmdldCgpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWVodG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfc3RvY2tDaGFuZ2VdKHR5cGU6IEFycmF5Q2hhbmdlVHlwZSwgaW5kZXg6IG51bWJlciwgbmV3VmFsdWU/OiBULCBvbGRWYWx1ZT86IFQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZSwgaW5kZXhlcywgcmVjb3JkcyB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCByY2kgPSBpbmRleGVzLmhhcyhpbmRleCkgPyBmaW5kUmVsYXRlZENoYW5nZUluZGV4KHJlY29yZHMsIHR5cGUsIGluZGV4KSA6IC0xO1xuICAgICAgICBjb25zdCBsZW4gPSByZWNvcmRzLmxlbmd0aDtcbiAgICAgICAgaWYgKHJjaSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCByY3QgPSByZWNvcmRzW3JjaV0udHlwZTtcbiAgICAgICAgICAgIGlmICghcmN0IC8qIFVQREFURSAqLykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZSZWNvcmQgPSByZWNvcmRzLnNwbGljZShyY2ksIDEpWzBdO1xuICAgICAgICAgICAgICAgIC8vIFVQREFURSA9PiBVUERBVEUgOiBVUERBVEVcbiAgICAgICAgICAgICAgICAvLyBVUERBVEUgPT4gUkVNT1ZFIDogSU5TRVJUXG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKHR5cGUsIGluZGV4LCBuZXdWYWx1ZSwgcHJldlJlY29yZC5vbGRWYWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IHIsIGkgPSBsZW47IC0taSA+IHJjaTspIHtcbiAgICAgICAgICAgICAgICAgICAgciA9IHJlY29yZHNbaV07XG4gICAgICAgICAgICAgICAgICAgIChyLmluZGV4ID49IGluZGV4KSAmJiAoci5pbmRleCAtPSByY3QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBwcmV2UmVjb3JkID0gcmVjb3Jkcy5zcGxpY2UocmNpLCAxKVswXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZSAhPT0gQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJTlNFUlQgPT4gVVBEQVRFIDogSU5TRVJUXG4gICAgICAgICAgICAgICAgICAgIC8vIFJFTU9WRSA9PiBJTlNFUlQgOiBVUERBVEVcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKE51bWJlcighdHlwZSksIGluZGV4LCBuZXdWYWx1ZSwgcHJldlJlY29yZC5vbGRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGluZGV4ZXMuYWRkKGluZGV4KTtcbiAgICAgICAgcmVjb3Jkc1tsZW5dID0geyB0eXBlLCBpbmRleCwgbmV3VmFsdWUsIG9sZFZhbHVlIH07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFID09PSBzdGF0ZSAmJiAwID09PSBsZW4pIHtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB0aGlzW19ub3RpZnlDaGFuZ2VzXSgpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfbm90aWZ5Q2hhbmdlc10oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgc3RhdGUsIHJlY29yZHMgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgIT09IHN0YXRlIHx8IDAgPT09IHJlY29yZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCByIG9mIHJlY29yZHMpIHtcbiAgICAgICAgICAgIE9iamVjdC5mcmVlemUocik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpc1tfbm90aWZ5XShPYmplY3QuZnJlZXplKHJlY29yZHMpIGFzIEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10pO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0ucmVjb3JkcyA9IFtdO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfbm90aWZ5XShyZWNvcmRzOiBBcnJheUNoYW5nZVJlY29yZDxUPltdKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpbnRlcm5hbC5pbmRleGVzLmNsZWFyKCk7XG4gICAgICAgIGludGVybmFsLmJyb2tlci5nZXQoKS50cmlnZ2VyKCdAJywgcmVjb3Jkcyk7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBPdmVycmlkZSByZXR1cm4gdHlwZSBvZiBwcm90b3R5cGUgbWV0aG9kc1xuICovXG5leHBvcnQgaW50ZXJmYWNlIE9ic2VydmFibGVBcnJheTxUPiB7XG4gICAgLyoqXG4gICAgICogQ29tYmluZXMgdHdvIG9yIG1vcmUgYXJyYXlzLlxuICAgICAqIEBwYXJhbSBpdGVtcyBBZGRpdGlvbmFsIGl0ZW1zIHRvIGFkZCB0byB0aGUgZW5kIG9mIGFycmF5MS5cbiAgICAgKi9cbiAgICBjb25jYXQoLi4uaXRlbXM6IFRbXVtdKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIC8qKlxuICAgICAqIENvbWJpbmVzIHR3byBvciBtb3JlIGFycmF5cy5cbiAgICAgKiBAcGFyYW0gaXRlbXMgQWRkaXRpb25hbCBpdGVtcyB0byBhZGQgdG8gdGhlIGVuZCBvZiBhcnJheTEuXG4gICAgICovXG4gICAgY29uY2F0KC4uLml0ZW1zOiAoVCB8IFRbXSlbXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBSZXZlcnNlcyB0aGUgZWxlbWVudHMgaW4gYW4gQXJyYXkuXG4gICAgICovXG4gICAgcmV2ZXJzZSgpOiB0aGlzO1xuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBzZWN0aW9uIG9mIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSBzdGFydCBUaGUgYmVnaW5uaW5nIG9mIHRoZSBzcGVjaWZpZWQgcG9ydGlvbiBvZiB0aGUgYXJyYXkuXG4gICAgICogQHBhcmFtIGVuZCBUaGUgZW5kIG9mIHRoZSBzcGVjaWZpZWQgcG9ydGlvbiBvZiB0aGUgYXJyYXkuXG4gICAgICovXG4gICAgc2xpY2Uoc3RhcnQ/OiBudW1iZXIsIGVuZD86IG51bWJlcik6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBlbGVtZW50cyBvZiBhbiBhcnJheSB0aGF0IG1lZXQgdGhlIGNvbmRpdGlvbiBzcGVjaWZpZWQgaW4gYSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tmbiBBIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyB1cCB0byB0aHJlZSBhcmd1bWVudHMuIFRoZSBmaWx0ZXIgbWV0aG9kIGNhbGxzIHRoZSBjYWxsYmFja2ZuIGZ1bmN0aW9uIG9uZSB0aW1lIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIGFycmF5LlxuICAgICAqIEBwYXJhbSB0aGlzQXJnIEFuIG9iamVjdCB0byB3aGljaCB0aGUgdGhpcyBrZXl3b3JkIGNhbiByZWZlciBpbiB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbi4gSWYgdGhpc0FyZyBpcyBvbWl0dGVkLCB1bmRlZmluZWQgaXMgdXNlZCBhcyB0aGUgdGhpcyB2YWx1ZS5cbiAgICAgKi9cbiAgICBmaWx0ZXI8UyBleHRlbmRzIFQ+KGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdmFsdWUgaXMgUywgdGhpc0FyZz86IHVua25vd24pOiBPYnNlcnZhYmxlQXJyYXk8Uz47XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZWxlbWVudHMgb2YgYW4gYXJyYXkgdGhhdCBtZWV0IHRoZSBjb25kaXRpb24gc3BlY2lmaWVkIGluIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIGNhbGxiYWNrZm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdXAgdG8gdGhyZWUgYXJndW1lbnRzLiBUaGUgZmlsdGVyIG1ldGhvZCBjYWxscyB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbiBvbmUgdGltZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBBbiBvYmplY3QgdG8gd2hpY2ggdGhlIHRoaXMga2V5d29yZCBjYW4gcmVmZXIgaW4gdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24uIElmIHRoaXNBcmcgaXMgb21pdHRlZCwgdW5kZWZpbmVkIGlzIHVzZWQgYXMgdGhlIHRoaXMgdmFsdWUuXG4gICAgICovXG4gICAgZmlsdGVyKGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdW5rbm93biwgdGhpc0FyZz86IHVua25vd24pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG59XG5cbi8qKlxuICogT3ZlcnJpZGUgcmV0dXJuIHR5cGUgb2Ygc3RhdGljIG1ldGhvZHNcbiAqL1xuZXhwb3J0IGRlY2xhcmUgbmFtZXNwYWNlIE9ic2VydmFibGVBcnJheSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZVxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXJyYXkgZnJvbSBhbiBhcnJheS1saWtlIG9iamVjdC5cbiAgICAgKiBAcGFyYW0gYXJyYXlMaWtlIEFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0IHRvIGNvbnZlcnQgdG8gYW4gYXJyYXkuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZnJvbTxUPihhcnJheUxpa2U6IEFycmF5TGlrZTxUPiB8IEl0ZXJhYmxlPFQ+KTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXJyYXkgZnJvbSBhbiBhcnJheS1saWtlIG9iamVjdC5cbiAgICAgKiBAcGFyYW0gYXJyYXlMaWtlIEFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0IHRvIGNvbnZlcnQgdG8gYW4gYXJyYXkuXG4gICAgICogQHBhcmFtIG1hcGZuIEEgbWFwcGluZyBmdW5jdGlvbiB0byBjYWxsIG9uIGV2ZXJ5IGVsZW1lbnQgb2YgdGhlIGFycmF5LlxuICAgICAqIEBwYXJhbSB0aGlzQXJnIFZhbHVlIG9mICd0aGlzJyB1c2VkIHRvIGludm9rZSB0aGUgbWFwZm4uXG4gICAgICovXG4gICAgZnVuY3Rpb24gZnJvbTxULCBVPihhcnJheUxpa2U6IEFycmF5TGlrZTxUPiB8IEl0ZXJhYmxlPFQ+LCBtYXBmbjogKHRoaXM6IHZvaWQsIHY6IFQsIGs6IG51bWJlcikgPT4gVSwgdGhpc0FyZz86IHVuZGVmaW5lZCk6IE9ic2VydmFibGVBcnJheTxVPjtcbiAgICBmdW5jdGlvbiBmcm9tPFgsIFQsIFU+KGFycmF5TGlrZTogQXJyYXlMaWtlPFQ+IHwgSXRlcmFibGU8VD4sIG1hcGZuOiAodGhpczogWCwgdjogVCwgazogbnVtYmVyKSA9PiBVLCB0aGlzQXJnOiBYKTogT2JzZXJ2YWJsZUFycmF5PFU+O1xuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBuZXcgYXJyYXkgZnJvbSBhIHNldCBvZiBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gaXRlbXMgQSBzZXQgb2YgZWxlbWVudHMgdG8gaW5jbHVkZSBpbiB0aGUgbmV3IGFycmF5IG9iamVjdC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBvZjxUPiguLi5pdGVtczogVFtdKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xufVxuIl0sIm5hbWVzIjpbIl9wcm94eUhhbmRsZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBUUE7TUFDYSxnQkFBZ0IsQ0FBQTtBQUNqQixJQUFBLE9BQU8sQ0FBc0I7SUFDOUIsR0FBRyxHQUFBO0FBQ04sUUFBQSxPQUFPLElBQUksQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7S0FDN0Q7QUFDSixDQUFBO0FBRUQsaUJBQXdCLE1BQU0sU0FBUyxHQUFRLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNsRSxpQkFBd0IsTUFBTSxPQUFPLEdBQVUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hFLGlCQUF3QixNQUFNLFlBQVksR0FBSyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDdEUsaUJBQXdCLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBRXhFO0FBQ00sU0FBVSxnQkFBZ0IsQ0FBQyxDQUFVLEVBQUE7SUFDdkMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFFLENBQW1CLENBQUMsU0FBUyxDQUFDLEVBQUU7QUFDeEMsUUFBQSxNQUFNLElBQUksU0FBUyxDQUFDLENBQUEsd0NBQUEsQ0FBMEMsQ0FBQyxDQUFDO0FBQ25FLEtBQUE7QUFDTDs7QUMyQ0E7Ozs7Ozs7QUFPRztBQUNHLFNBQVUsWUFBWSxDQUFDLENBQVUsRUFBQTtJQUNuQyxPQUFPLE9BQU8sQ0FBQyxDQUFDLElBQUssQ0FBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0FBQ3pEOztBQy9FQTs7QUFFRztBQWdDSDtBQUNBLE1BQU1BLGVBQWEsR0FBbUM7QUFDbEQsSUFBQSxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFBO0FBQzFCLFFBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNkLFlBQUEsT0FB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RyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDN0MsSUFBSSxJQUFJLHNDQUE2Qjs7O0FBR2pDLG9CQUFBLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMzRSxpQkFBQTtBQUNKLGFBQUE7WUFDRCxPQUFPO0FBQ1YsU0FBQTtBQUNELFFBQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNuQixRQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDO0FBQ25ELFFBQUEsSUFBSSwwQ0FBMkIsS0FBSyxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUU7WUFDL0MsS0FBSyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzNDLFNBQUE7S0FDSjs7QUFHTyxJQUFBLENBQUMsY0FBYyxDQUFDLEdBQUE7UUFDcEIsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDM0MsSUFBSSxRQUFBLGtDQUEyQixLQUFLLElBQUksQ0FBQyxLQUFLLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDMUQsT0FBTztBQUNWLFNBQUE7QUFDRCxRQUFBLEtBQUssTUFBTSxDQUFDLElBQUksT0FBTyxFQUFFO0FBQ3JCLFlBQUEsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQixTQUFBO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUEyQixDQUFDLENBQUM7QUFDaEUsUUFBQSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztLQUNoQzs7SUFHTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQStCLEVBQUE7QUFDN0MsUUFBQSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDakMsUUFBQSxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ3pCLFFBQUEsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQy9DO0FBQ0o7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL29ic2VydmFibGUvIn0=