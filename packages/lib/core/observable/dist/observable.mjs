/*!
 * @cdp/observable 0.9.15
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
        const oldValue = target[p];
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
        const oldValue = target[p];
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZS5tanMiLCJzb3VyY2VzIjpbImludGVybmFsLnRzIiwiY29tbW9uLnRzIiwib2JqZWN0LnRzIiwiYXJyYXkudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgICBpc1N0cmluZyxcbiAgICBpc1N5bWJvbCxcbiAgICBjbGFzc05hbWUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcblxuLyoqIEBpbnRlcm5hbCBFdmVudEJyb2tlclByb3h5ICovXG5leHBvcnQgY2xhc3MgRXZlbnRCcm9rZXJQcm94eTxFdmVudCBleHRlbmRzIG9iamVjdD4ge1xuICAgIHByaXZhdGUgX2Jyb2tlcj86IEV2ZW50QnJva2VyPEV2ZW50PjtcbiAgICBwdWJsaWMgZ2V0KCk6IEV2ZW50QnJva2VyPEV2ZW50PiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9icm9rZXIgfHwgKHRoaXMuX2Jyb2tlciA9IG5ldyBFdmVudEJyb2tlcigpKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IF9pbnRlcm5hbCAgICAgID0gU3ltYm9sKCdpbnRlcm5hbCcpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgX25vdGlmeSAgICAgICAgPSBTeW1ib2woJ25vdGlmeScpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgX3N0b2NrQ2hhbmdlICAgPSBTeW1ib2woJ3N0b2NrLWNoYW5nZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgX25vdGlmeUNoYW5nZXMgPSBTeW1ib2woJ25vdGlmeS1jaGFuZ2VzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiB2ZXJpZnlPYnNlcnZhYmxlKHg6IHVua25vd24pOiB2b2lkIHwgbmV2ZXIge1xuICAgIGlmICgheCB8fCAhKHggYXMgb2JqZWN0KVtfaW50ZXJuYWxdKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFRoZSBvYmplY3QgcGFzc2VkIGlzIG5vdCBhbiBJT2JzZXJ2YWJsZS5gKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiB2ZXJpZnlWYWxpZEtleShrZXk6IHVua25vd24pOiB2b2lkIHwgbmV2ZXIge1xuICAgIGlmIChpc1N0cmluZyhrZXkpIHx8IGlzU3ltYm9sKGtleSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBUeXBlIG9mICR7Y2xhc3NOYW1lKGtleSl9IGlzIG5vdCBhIHZhbGlkIGtleS5gKTtcbn1cbiIsImltcG9ydCB7IFN1YnNjcmlwdGlvbiwgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBfaW50ZXJuYWwgfSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gRXZlbnQgb2JzZXJ2YXRpb24gc3RhdGUgZGVmaW5pdGlvbi5cbiAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvlrprnvqlcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gT2JzZXJ2YWJsZVN0YXRlIHtcbiAgICAvKiogb2JzZXJ2YWJsZSByZWFkeSAqL1xuICAgIEFDVElWRSAgID0gJ2FjdGl2ZScsXG4gICAgLyoqIE5PVCBvYnNlcnZlZCwgYnV0IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkLiAqL1xuICAgIFNVU0VQTkRFRCA9ICdzdXNwZW5kZWQnLFxuICAgIC8qKiBOT1Qgb2JzZXJ2ZWQsIGFuZCBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMuICovXG4gICAgRElTQUJMRUQgPSAnZGlzYWJsZWQnLFxufVxuXG4vKipcbiAqIEBlbiBPYnNlcnZhYmxlIGNvbW1vbiBpbnRlcmZhY2UuXG4gKiBAamEgT2JzZXJ2YWJsZSDlhbHpgJrjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJT2JzZXJ2YWJsZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICovXG4gICAgb24oLi4uYXJnczogdW5rbm93bltdKTogU3Vic2NyaXB0aW9uO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKi9cbiAgICBvZmYoLi4uYXJnczogdW5rbm93bltdKTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdXNwZW5kIG9yIGRpc2FibGUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jgrXjgrnjg5rjg7Pjg4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub1JlY29yZFxuICAgICAqICAtIGBlbmAgYHRydWVgOiBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMgYW5kIGNsZWFyIGNoYW5nZXMuIC8gYGZhbHNlYDogcHJvcGVydHkgY2hhbmdlcyBhcmUgcmVjb3JkZWQgYW5kIGZpcmVkIHdoZW4gW1tyZXN1bWVdXSgpIGNhbGxkZWQuIChkZWZhdWx0KVxuICAgICAqICAtIGBqYWAgYHRydWVgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7TjgoLoqJjpjLLjgZvjgZosIOePvuWcqOOBruiomOmMsuOCguegtOajhCAvIGBmYWxzZWA6IOODl+ODreODkeODhuOCo+WkieabtOOBr+iomOmMsuOBleOCjCwgW1tyZXN1bWVdXSgpIOaZguOBq+eZuueBq+OBmeOCiyAo5pei5a6aKVxuICAgICAqL1xuICAgIHN1c3BlbmQobm9SZWNvcmQ/OiBib29sZWFuKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN1bWUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jg6rjgrjjg6Xjg7zjg6BcbiAgICAgKi9cbiAgICByZXN1bWUoKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBvYnNlcnZhdGlvbiBzdGF0ZVxuICAgICAqIEBqYSDos7zoqq3lj6/og73nirbmhYtcbiAgICAgKi9cbiAgICBnZXRPYnNlcnZhYmxlU3RhdGUoKTogT2JzZXJ2YWJsZVN0YXRlO1xufVxuXG4vKipcbiAqIEBlbiBJbnRlcmZhY2UgYWJsZSB0byBhY2Nlc3MgdG8gW1tFdmVudEJyb2tlcl1dIHdpdGggW1tJT2JzZXJ2YWJsZV1dLlxuICogQGphIFtbSU9ic2VydmFibGVdXSDjga7mjIHjgaTlhoXpg6ggW1tFdmVudEJyb2tlcl1dIOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIElPYnNlcnZhYmxlRXZlbnRCcm9rZXJBY2Nlc3M8VCBleHRlbmRzIG9iamVjdCA9IGFueT4gZXh0ZW5kcyBJT2JzZXJ2YWJsZSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgW1tFdmVudEJyb2tlcl1dIGluc3RhbmNlLlxuICAgICAqIEBqYSBbW0V2ZW50QnJva2VyXV0g44Kk44Oz44K544K/44Oz44K544Gu5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0QnJva2VyKCk6IEV2ZW50QnJva2VyPFQ+O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBbW0lPYnNlcnZhYmxlXV0uXG4gKiBAamEgW1tJT2JzZXJ2YWJsZV1dIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT2JzZXJ2YWJsZSh4OiB1bmtub3duKTogeCBpcyBJT2JzZXJ2YWJsZSB7XG4gICAgcmV0dXJuIEJvb2xlYW4oeCAmJiAoeCBhcyBvYmplY3QpW19pbnRlcm5hbF0pO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgTm9uRnVuY3Rpb25Qcm9wZXJ0aWVzLFxuICAgIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lcyxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIHZlcmlmeSxcbiAgICBwb3N0LFxuICAgIGRlZXBNZXJnZSxcbiAgICBkZWVwRXF1YWwsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24sIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBFdmVudEJyb2tlclByb3h5LFxuICAgIF9pbnRlcm5hbCxcbiAgICBfbm90aWZ5LFxuICAgIF9zdG9ja0NoYW5nZSxcbiAgICBfbm90aWZ5Q2hhbmdlcyxcbiAgICB2ZXJpZnlPYnNlcnZhYmxlLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IE9ic2VydmFibGVTdGF0ZSwgSU9ic2VydmFibGUgfSBmcm9tICcuL2NvbW1vbic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBJbnRlcm5hbFByb3BzIHtcbiAgICBzdGF0ZTogT2JzZXJ2YWJsZVN0YXRlO1xuICAgIGNoYW5nZWQ6IGJvb2xlYW47XG4gICAgcmVhZG9ubHkgY2hhbmdlTWFwOiBNYXA8UHJvcGVydHlLZXksIGFueT47XG4gICAgcmVhZG9ubHkgYnJva2VyOiBFdmVudEJyb2tlclByb3h5PGFueT47XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9wcm94eUhhbmRsZXI6IFByb3h5SGFuZGxlcjxPYnNlcnZhYmxlT2JqZWN0PiA9IHtcbiAgICBzZXQodGFyZ2V0LCBwLCB2YWx1ZSwgcmVjZWl2ZXIpIHtcbiAgICAgICAgaWYgKCFpc1N0cmluZyhwKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3Quc2V0KHRhcmdldCwgcCwgdmFsdWUsIHJlY2VpdmVyKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtwXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gdGFyZ2V0W19pbnRlcm5hbF0uc3RhdGUgJiYgdmFsdWUgIT09IG9sZFZhbHVlKSB7XG4gICAgICAgICAgICB0YXJnZXRbX3N0b2NrQ2hhbmdlXShwLCBvbGRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFJlZmxlY3Quc2V0KHRhcmdldCwgcCwgdmFsdWUsIHJlY2VpdmVyKTtcbiAgICB9LFxufTtcbk9iamVjdC5mcmVlemUoX3Byb3h5SGFuZGxlcik7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBPYnNlcnZhYmxlIGtleSB0eXBlIGRlZmluaXRpb24uXG4gKiBAamEg6LO86Kqt5Y+v6IO944Gq44Kt44O844Gu5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIE9ic2VydmFibGVLZXlzPFQgZXh0ZW5kcyBPYnNlcnZhYmxlT2JqZWN0PiA9IE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxUPjtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSBvYmplY3QgY2xhc3Mgd2hpY2ggY2hhbmdlIGNhbiBiZSBvYnNlcnZlZC5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7lpInmm7TjgpLnm6PoppbjgafjgY3jgovjgqrjg5bjgrjjgqfjgq/jg4jjgq/jg6njgrlcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogLSBCYXNpYyBVc2FnZVxuICpcbiAqIGBgYHRzXG4gKiBjbGFzcyBFeGFtcGxlIGV4dGVuZHMgT2JzZXJ2YWJsZU9iamVjdCB7XG4gKiAgIHB1YmxpYyBhOiBudW1iZXIgPSAwO1xuICogICBwdWJsaWMgYjogbnVtYmVyID0gMDtcbiAqICAgcHVibGljIGdldCBzdW0oKTogbnVtYmVyIHtcbiAqICAgICAgIHJldHVybiB0aGlzLmEgKyB0aGlzLmI7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBvYnNlcnZhYmxlID0gbmV3IEV4YW1wbGUoKTtcbiAqXG4gKiBmdW5jdGlvbiBvbk51bUNoYW5nZShuZXdWYWx1ZTogbnVtYmVyLCBvbGRWYWx1ZTogbnVtYmVyLCBrZXk6IHN0cmluZykge1xuICogICBjb25zb2xlLmxvZyhgJHtrZXl9IGNoYW5nZWQgZnJvbSAke29sZFZhbHVlfSB0byAke25ld1ZhbHVlfS5gKTtcbiAqIH1cbiAqIG9ic2VydmFibGUub24oWydhJywgJ2InXSwgb25OdW1DaGFuZ2UpO1xuICpcbiAqIC8vIHVwZGF0ZVxuICogb2JzZXJ2YWJsZS5hID0gMTAwO1xuICogb2JzZXJ2YWJsZS5iID0gMjAwO1xuICpcbiAqIC8vIGNvbnNvbGUgb3V0IGZyb20gYGFzeW5jYCBldmVudCBsb29wLlxuICogLy8gPT4gJ2EgY2hhbmdlZCBmcm9tIDAgdG8gMTAwLidcbiAqIC8vID0+ICdiIGNoYW5nZWQgZnJvbSAwIHRvIDIwMC4nXG4gKlxuICogOlxuICpcbiAqIGZ1bmN0aW9uIG9uU3VtQ2hhbmdlKG5ld1ZhbHVlOiBudW1iZXIsIG9sZFZhbHVlOiBudW1iZXIpIHtcbiAqICAgY29uc29sZS5sb2coYHN1bSBjaGFuZ2VkIGZyb20gJHtvbGRWYWx1ZX0gdG8gJHtuZXdWYXVlfS5gKTtcbiAqIH1cbiAqIG9ic2VydmFibGUub24oJ3N1bScsIG9uU3VtQ2hhbmdlKTtcbiAqXG4gKiAvLyB1cGRhdGVcbiAqIG9ic2VydmFibGUuYSA9IDEwMDsgLy8gbm90aGluZyByZWFjdGlvbiBiZWNhdXNlIG9mIG5vIGNoYW5nZSBwcm9wZXJ0aWVzLlxuICogb2JzZXJ2YWJsZS5hID0gMjAwO1xuICpcbiAqIC8vIGNvbnNvbGUgb3V0IGZyb20gYGFzeW5jYCBldmVudCBsb29wLlxuICogLy8gPT4gJ3N1bSBjaGFuZ2VkIGZyb20gMzAwIHRvIDQwMC4nXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIE9ic2VydmFibGVPYmplY3QgaW1wbGVtZW50cyBJT2JzZXJ2YWJsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19pbnRlcm5hbF0hOiBJbnRlcm5hbFByb3BzO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBzdGF0ZS4gZGVmYXVsdDogW1tPYnNlcnZhYmxlU3RhdGUuQUNUSVZFXV1cbiAgICAgKiAgLSBgamFgIOWIneacn+eKtuaFiyDml6Llrpo6IFtbT2JzZXJ2YWJsZVN0YXRlLkFDVElWRV1dXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3RhdGUgPSBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFKSB7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIE9ic2VydmFibGVPYmplY3QsIHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbDogSW50ZXJuYWxQcm9wcyA9IHtcbiAgICAgICAgICAgIHN0YXRlLFxuICAgICAgICAgICAgY2hhbmdlZDogZmFsc2UsXG4gICAgICAgICAgICBjaGFuZ2VNYXA6IG5ldyBNYXAoKSxcbiAgICAgICAgICAgIGJyb2tlcjogbmV3IEV2ZW50QnJva2VyUHJveHk8dGhpcz4oKSxcbiAgICAgICAgfTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIF9pbnRlcm5hbCwgeyB2YWx1ZTogT2JqZWN0LnNlYWwoaW50ZXJuYWwpIH0pO1xuICAgICAgICByZXR1cm4gbmV3IFByb3h5KHRoaXMsIF9wcm94eUhhbmRsZXIpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElPYnNlcnZhYmxlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIHByb3BlcnR5IGNoYW5nZXMuXG4gICAgICogQGphIOODl+ODreODkeODhuOCo+WkieabtOizvOiqreioreWumiAo5YWo44OX44Ot44OR44OG44Kj55uj6KaWKVxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnR5XG4gICAgICogIC0gYGVuYCB3aWxkIGNvcmQgc2lnbmF0dXJlLlxuICAgICAqICAtIGBqYWAg44Ov44Kk44Or44OJ44Kr44O844OJXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgcHJvcGVydHkgY2hhbmdlLlxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb24ocHJvcGVydHk6ICdAJywgbGlzdGVuZXI6IChjb250ZXh0OiBPYnNlcnZhYmxlT2JqZWN0KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBwcm9wZXJ0eSBjaGFuZ2UocykuXG4gICAgICogQGphIOODl+ODreODkeODhuOCo+WkieabtOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnR5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jg5fjg63jg5Hjg4bjgqNcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBwcm9wZXJ0eSBjaGFuZ2UuXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbjxLIGV4dGVuZHMgT2JzZXJ2YWJsZUtleXM8dGhpcz4+KHByb3BlcnR5OiBLIHwgS1tdLCBsaXN0ZW5lcjogKG5ld1ZhbHVlOiB0aGlzW0tdLCBvbGRWYWx1ZTogdGhpc1tLXSwga2V5OiBLKSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uO1xuXG4gICAgb248SyBleHRlbmRzIE9ic2VydmFibGVLZXlzPHRoaXM+Pihwcm9wZXJ0eTogSyB8IEtbXSwgbGlzdGVuZXI6IChuZXdWYWx1ZTogdGhpc1tLXSwgb2xkVmFsdWU6IHRoaXNbS10sIGtleTogSykgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IHsgY2hhbmdlTWFwLCBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYnJva2VyLmdldCgpLm9uKHByb3BlcnR5LCBsaXN0ZW5lcik7XG4gICAgICAgIGlmICgwIDwgY2hhbmdlTWFwLnNpemUpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0gaXNBcnJheShwcm9wZXJ0eSkgPyBwcm9wZXJ0eSA6IFtwcm9wZXJ0eV07XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcHMpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VNYXAuaGFzKHByb3ApIHx8IGNoYW5nZU1hcC5zZXQocHJvcCwgdGhpc1twcm9wXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgcHJvcGVydHkgY2hhbmdlcylcbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5aSJ5pu06LO86Kqt6Kej6ZmkICjlhajjg5fjg63jg5Hjg4bjgqPnm6PoppYpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydHlcbiAgICAgKiAgLSBgZW5gIHdpbGQgY29yZCBzaWduYXR1cmUuXG4gICAgICogIC0gYGphYCDjg6/jgqTjg6vjg4njgqvjg7zjg4lcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBwcm9wZXJ0eSBjaGFuZ2UuXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvZmYocHJvcGVydHk6ICdAJywgbGlzdGVuZXI/OiAoY29udGV4dDogT2JzZXJ2YWJsZU9iamVjdCkgPT4gYW55KTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBwcm9wZXJ0eSBjaGFuZ2UocykuXG4gICAgICogQGphIOODl+ODreODkeODhuOCo+WkieabtOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnR5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGV2ZXJ5dGhpbmcgaXMgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jg5fjg63jg5Hjg4bjgqNcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuino+mZpFxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIHByb3BlcnR5IGNoYW5nZS5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgYWxsIHNhbWUgYGNoYW5uZWxgIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WQjOS4gCBgY2hhbm5lbGAg44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk/OiBLIHwgS1tdLCBsaXN0ZW5lcj86IChuZXdWYWx1ZTogdGhpc1tLXSwgb2xkVmFsdWU6IHRoaXNbS10sIGtleTogSykgPT4gdW5rbm93bik6IHZvaWQ7XG5cbiAgICBvZmY8SyBleHRlbmRzIE9ic2VydmFibGVLZXlzPHRoaXM+Pihwcm9wZXJ0eT86IEsgfCBLW10sIGxpc3RlbmVyPzogKG5ld1ZhbHVlOiB0aGlzW0tdLCBvbGRWYWx1ZTogdGhpc1tLXSwga2V5OiBLKSA9PiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHRoaXNbX2ludGVybmFsXS5icm9rZXIuZ2V0KCkub2ZmKHByb3BlcnR5LCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1c3BlbmQgb3IgZGlzYWJsZSB0aGUgZXZlbnQgb2JzZXJ2YXRpb24gc3RhdGUuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreeKtuaFi+OBruOCteOCueODmuODs+ODiVxuICAgICAqXG4gICAgICogQHBhcmFtIG5vUmVjb3JkXG4gICAgICogIC0gYGVuYCBgdHJ1ZWA6IG5vdCByZWNvcmRpbmcgcHJvcGVydHkgY2hhbmdlcyBhbmQgY2xlYXIgY2hhbmdlcy4gLyBgZmFsc2VgOiBwcm9wZXJ0eSBjaGFuZ2VzIGFyZSByZWNvcmRlZCBhbmQgZmlyZWQgd2hlbiBbW3Jlc3VtZV1dKCkgY2FsbGRlZC4gKGRlZmF1bHQpXG4gICAgICogIC0gYGphYCBgdHJ1ZWA6IOODl+ODreODkeODhuOCo+WkieabtOOCguiomOmMsuOBm+OBmiwg54++5Zyo44Gu6KiY6Yyy44KC56C05qOEIC8gYGZhbHNlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044Gv6KiY6Yyy44GV44KMLCBbW3Jlc3VtZV1dKCkg5pmC44Gr55m654Gr44GZ44KLICjml6LlrpopXG4gICAgICovXG4gICAgc3VzcGVuZChub1JlY29yZCA9IGZhbHNlKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHRoaXNbX2ludGVybmFsXS5zdGF0ZSA9IG5vUmVjb3JkID8gT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEIDogT2JzZXJ2YWJsZVN0YXRlLlNVU0VQTkRFRDtcbiAgICAgICAgaWYgKG5vUmVjb3JkKSB7XG4gICAgICAgICAgICB0aGlzW19pbnRlcm5hbF0uY2hhbmdlTWFwLmNsZWFyKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc3VtZSB0aGUgZXZlbnQgb2JzZXJ2YXRpb24gc3RhdGUuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreeKtuaFi+OBruODquOCuOODpeODvOODoFxuICAgICAqL1xuICAgIHJlc3VtZSgpOiB0aGlzIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgaW50ZXJuYWwuc3RhdGUgPSBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHRoaXNbX25vdGlmeUNoYW5nZXNdKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBvYnNlcnZhdGlvbiBzdGF0ZVxuICAgICAqIEBqYSDos7zoqq3lj6/og73nirbmhYtcbiAgICAgKi9cbiAgICBnZXRPYnNlcnZhYmxlU3RhdGUoKTogT2JzZXJ2YWJsZVN0YXRlIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2ludGVybmFsXS5zdGF0ZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJT2JzZXJ2YWJsZUV2ZW50QnJva2VyQWNjZXNzXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgZ2V0QnJva2VyKCk6IEV2ZW50QnJva2VyPE5vbkZ1bmN0aW9uUHJvcGVydGllczx0aGlzPj4ge1xuICAgICAgICBjb25zdCB7IGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICByZXR1cm4gYnJva2VyLmdldCgpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHN0YXRpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBbW09ic2VydmFibGVPYmplY3RdXSBmcm9tIGFueSBvYmplY3QuXG4gICAgICogQGphIOS7u+aEj+OBruOCquODluOCuOOCp+OCr+ODiOOBi+OCiSBbW09ic2VydmFibGVPYmplY3RdXSDjgpLnlJ/miJBcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogY29uc3Qgb2JzZXJ2YWJsZSA9IE9ic2VydmFibGVPYmplY3QuZnJvbSh7IGE6IDEsIGI6IDEgfSk7XG4gICAgICogZnVuY3Rpb24gb25OdW1DaGFuZ2UobmV3VmFsdWU6IG51bWJlciwgb2xkVmFsdWU6IG51bWJlciwga2V5OiBzdHJpbmcpIHtcbiAgICAgKiAgIGNvbnNvbGUubG9nKGAke2tleX0gY2hhbmdlZCBmcm9tICR7b2xkVmFsdWV9IHRvICR7bmV3VmFsdWV9LmApO1xuICAgICAqIH1cbiAgICAgKiBvYnNlcnZhYmxlLm9uKFsnYScsICdiJ10sIG9uTnVtQ2hhbmdlKTtcbiAgICAgKlxuICAgICAqIC8vIHVwZGF0ZVxuICAgICAqIG9ic2VydmFibGUuYSA9IDEwMDtcbiAgICAgKiBvYnNlcnZhYmxlLmIgPSAyMDA7XG4gICAgICpcbiAgICAgKiAvLyBjb25zb2xlIG91dCBmcm9tIGBhc3luY2AgZXZlbnQgbG9vcC5cbiAgICAgKiAvLyA9PiAnYSBjaGFuZ2VkIGZyb20gMSB0byAxMDAuJ1xuICAgICAqIC8vID0+ICdiIGNoYW5nZWQgZnJvbSAxIHRvIDIwMC4nXG4gICAgICogYGBgXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyBvYmplY3Q+KHNyYzogVCk6IE9ic2VydmFibGVPYmplY3QgJiBUIHtcbiAgICAgICAgY29uc3Qgb2JzZXJ2YWJsZSA9IGRlZXBNZXJnZShuZXcgY2xhc3MgZXh0ZW5kcyBPYnNlcnZhYmxlT2JqZWN0IHsgfShPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQpLCBzcmMpO1xuICAgICAgICBvYnNlcnZhYmxlLnJlc3VtZSgpO1xuICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZSBhcyBhbnk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJvdGVjdGVkIG1laHRvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRm9yY2Ugbm90aWZ5IHByb3BlcnR5IGNoYW5nZShzKSBpbiBzcGl0ZSBvZiBhY3RpdmUgc3RhdGUuXG4gICAgICogQGphIOOCouOCr+ODhuOCo+ODlueKtuaFi+OBq+OBi+OBi+OCj+OCieOBmuW8t+WItueahOOBq+ODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCkueZuuihjFxuICAgICAqL1xuICAgIHByb3RlY3RlZCBub3RpZnkoLi4ucHJvcGVydGllczogc3RyaW5nW10pOiB2b2lkIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgaWYgKDAgPT09IHByb3BlcnRpZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgeyBjaGFuZ2VNYXAgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY29uc3Qga2V5VmFsdWUgPSBuZXcgTWFwPFByb3BlcnR5S2V5LCBbYW55LCBhbnldPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IHRoaXNba2V5XTtcbiAgICAgICAgICAgIGNvbnN0IG9sZFZhbHVlID0gY2hhbmdlTWFwLmhhcyhrZXkpID8gY2hhbmdlTWFwLmdldChrZXkpIDogbmV3VmFsdWU7XG4gICAgICAgICAgICBrZXlWYWx1ZS5zZXQoa2V5LCBbbmV3VmFsdWUsIG9sZFZhbHVlXSk7XG4gICAgICAgIH1cbiAgICAgICAgMCA8IGtleVZhbHVlLnNpemUgJiYgdGhpc1tfbm90aWZ5XShrZXlWYWx1ZSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZWh0b2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19zdG9ja0NoYW5nZV0ocDogc3RyaW5nLCBvbGRWYWx1ZTogYW55KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgc3RhdGUsIGNoYW5nZU1hcCwgYnJva2VyIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIHRoaXNbX2ludGVybmFsXS5jaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgaWYgKDAgPT09IGNoYW5nZU1hcC5zaXplKSB7XG4gICAgICAgICAgICBjaGFuZ2VNYXAuc2V0KHAsIG9sZFZhbHVlKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgayBvZiBicm9rZXIuZ2V0KCkuY2hhbm5lbHMoKSkge1xuICAgICAgICAgICAgICAgIGNoYW5nZU1hcC5oYXMoaykgfHwgY2hhbmdlTWFwLnNldChrLCB0aGlzW2tdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFID09PSBzdGF0ZSkge1xuICAgICAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB0aGlzW19ub3RpZnlDaGFuZ2VzXSgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNoYW5nZU1hcC5oYXMocCkgfHwgY2hhbmdlTWFwLnNldChwLCBvbGRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeUNoYW5nZXNdKCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCBjaGFuZ2VNYXAgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgIT09IHN0YXRlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qga2V5VmFsdWVQYWlycyA9IG5ldyBNYXA8UHJvcGVydHlLZXksIFthbnksIGFueV0+KCk7XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgb2xkVmFsdWVdIG9mIGNoYW5nZU1hcCkge1xuICAgICAgICAgICAgY29uc3QgY3VyVmFsdWUgPSB0aGlzW2tleV07XG4gICAgICAgICAgICBpZiAoIWRlZXBFcXVhbChvbGRWYWx1ZSwgY3VyVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAga2V5VmFsdWVQYWlycy5zZXQoa2V5LCBbY3VyVmFsdWUsIG9sZFZhbHVlXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpc1tfbm90aWZ5XShrZXlWYWx1ZVBhaXJzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeV0oa2V5VmFsdWU6IE1hcDxQcm9wZXJ0eUtleSwgW2FueSwgYW55XT4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBjaGFuZ2VkLCBjaGFuZ2VNYXAsIGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjaGFuZ2VNYXAuY2xlYXIoKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmNoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgZXZlbnRCcm9rZXIgPSBicm9rZXIuZ2V0KCk7XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVzXSBvZiBrZXlWYWx1ZSkge1xuICAgICAgICAgICAgKGV2ZW50QnJva2VyIGFzIGFueSkudHJpZ2dlcihrZXksIC4uLnZhbHVlcywga2V5KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hhbmdlZCkge1xuICAgICAgICAgICAgZXZlbnRCcm9rZXIudHJpZ2dlcignQCcsIHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBwcmVmZXItcmVzdC1wYXJhbXMsXG4gKi9cblxuaW1wb3J0IHtcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgV3JpdGFibGUsXG4gICAgaXNOdW1iZXIsXG4gICAgdmVyaWZ5LFxuICAgIHBvc3QsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24sIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBFdmVudEJyb2tlclByb3h5LFxuICAgIF9pbnRlcm5hbCxcbiAgICBfbm90aWZ5LFxuICAgIF9zdG9ja0NoYW5nZSxcbiAgICBfbm90aWZ5Q2hhbmdlcyxcbiAgICB2ZXJpZnlPYnNlcnZhYmxlLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IE9ic2VydmFibGVTdGF0ZSwgSU9ic2VydmFibGUgfSBmcm9tICcuL2NvbW1vbic7XG5cbi8qKlxuICogQGVuIEFycmF5IGNoYW5nZSB0eXBlIGluZm9ybWF0aW9uLiA8YnI+XG4gKiAgICAgVGhlIHZhbHVlIGlzIHN1aXRhYmxlIGZvciB0aGUgbnVtYmVyIG9mIGZsdWN0dWF0aW9uIG9mIHRoZSBlbGVtZW50LlxuICogQGphIOmFjeWIl+WkieabtOmAmuefpeOBruOCv+OCpOODlyA8YnI+XG4gKiAgICAg5YCk44Gv6KaB57Sg44Gu5aKX5rib5pWw44Gr55u45b2TXG4gKlxuICovXG5leHBvcnQgY29uc3QgZW51bSBBcnJheUNoYW5nZVR5cGUge1xuICAgIFJFTU9WRSA9IC0xLFxuICAgIFVQREFURSA9IDAsXG4gICAgSU5TRVJUID0gMSxcbn1cblxuLyoqXG4gKiBAZW4gQXJyYXkgY2hhbmdlIHJlY29yZCBpbmZvcm1hdGlvbi5cbiAqIEBqYSDphY3liJflpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcnJheUNoYW5nZVJlY29yZDxUPiB7XG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBjaGFuZ2UgdHlwZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAamEg6YWN5YiX5aSJ5pu05oOF5aCx44Gu6K2Y5Yil5a2QXG4gICAgICovXG4gICAgcmVhZG9ubHkgdHlwZTogQXJyYXlDaGFuZ2VUeXBlO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBjaGFuZ2UgdHlwZSBpbmZvcm1hdGlvbi4gPGJyPlxuICAgICAqICAgICDigLsgW0F0dGVudGlvbl0gVGhlIGluZGV4IHdpbGwgYmUgZGlmZmVyZW50IGZyb20gdGhlIGFjdHVhbCBsb2NhdGlvbiB3aGVuIGFycmF5IHNpemUgY2hhbmdlZCBiZWNhdXNlIHRoYXQgZGV0ZXJtaW5lcyBlbGVtZW50IG9wZXJhdGlvbiB1bml0LlxuICAgICAqIEBqYSDlpInmm7TjgYznmbrnlJ/jgZfjgZ/phY3liJflhoXjga7kvY3nva7jga4gaW5kZXggPGJyPlxuICAgICAqICAgICDigLsgW+azqOaEj10g44Kq44Oa44Os44O844K344On44Oz5Y2Y5L2N44GuIGluZGV4IOOBqOOBquOCiiwg6KaB57Sg44GM5aKX5rib44GZ44KL5aC05ZCI44Gv5a6f6Zqb44Gu5L2N572u44Go55Ww44Gq44KL44GT44Go44GM44GC44KLXG4gICAgICovXG4gICAgcmVhZG9ubHkgaW5kZXg6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBOZXcgZWxlbWVudCdzIHZhbHVlLlxuICAgICAqIEBqYSDopoHntKDjga7mlrDjgZfjgYTlgKRcbiAgICAgKi9cbiAgICByZWFkb25seSBuZXdWYWx1ZT86IFQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gT2xkIGVsZW1lbnQncyB2YWx1ZS5cbiAgICAgKiBAamEg6KaB57Sg44Gu5Y+k44GE5YCkXG4gICAgICovXG4gICAgcmVhZG9ubHkgb2xkVmFsdWU/OiBUO1xufVxudHlwZSBNdXRhYmxlQ2hhbmdlUmVjb3JkPFQ+ID0gV3JpdGFibGU8QXJyYXlDaGFuZ2VSZWNvcmQ8VD4+O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIElBcnJheUNoYW5nZUV2ZW50PFQ+IHtcbiAgICAnQCc6IFtBcnJheUNoYW5nZVJlY29yZDxUPltdXTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEludGVybmFsUHJvcHM8VCA9IHVua25vd24+IHtcbiAgICBzdGF0ZTogT2JzZXJ2YWJsZVN0YXRlO1xuICAgIGJ5TWV0aG9kOiBib29sZWFuO1xuICAgIHJlY29yZHM6IE11dGFibGVDaGFuZ2VSZWNvcmQ8VD5bXTtcbiAgICByZWFkb25seSBpbmRleGVzOiBTZXQ8bnVtYmVyPjtcbiAgICByZWFkb25seSBicm9rZXI6IEV2ZW50QnJva2VyUHJveHk8SUFycmF5Q2hhbmdlRXZlbnQ8VD4+O1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcHJveHlIYW5kbGVyOiBQcm94eUhhbmRsZXI8T2JzZXJ2YWJsZUFycmF5PiA9IHtcbiAgICBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHAsIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0YXJnZXRbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA9PT0gaW50ZXJuYWwuc3RhdGUgfHwgaW50ZXJuYWwuYnlNZXRob2QgfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhdHRyaWJ1dGVzLCAndmFsdWUnKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtwXTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBhdHRyaWJ1dGVzLnZhbHVlO1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZXFlcWVxXG4gICAgICAgIGlmICgnbGVuZ3RoJyA9PT0gcCAmJiBuZXdWYWx1ZSAhPSBvbGRWYWx1ZSkgeyAvLyBEbyBOT1QgdXNlIHN0cmljdCBpbmVxdWFsaXR5ICghPT0pXG4gICAgICAgICAgICBjb25zdCBvbGRMZW5ndGggPSBvbGRWYWx1ZSA+Pj4gMDtcbiAgICAgICAgICAgIGNvbnN0IG5ld0xlbmd0aCA9IG5ld1ZhbHVlID4+PiAwO1xuICAgICAgICAgICAgY29uc3Qgc3RvY2sgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyYXAgPSBuZXdMZW5ndGggPCBvbGRMZW5ndGggJiYgdGFyZ2V0LnNsaWNlKG5ld0xlbmd0aCk7XG4gICAgICAgICAgICAgICAgaWYgKHNjcmFwKSB7IC8vIG5ld0xlbmd0aCA8IG9sZExlbmd0aFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gb2xkTGVuZ3RoOyAtLWkgPj0gbmV3TGVuZ3RoOykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRSwgaSwgdW5kZWZpbmVkLCBzY3JhcFtpIC0gbmV3TGVuZ3RoXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgLy8gb2xkTGVuZ3RoIDwgbmV3TGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBvbGRMZW5ndGg7IGkgPCBuZXdMZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLklOU0VSVCwgaSAvKiwgdW5kZWZpbmVkLCB1bmRlZmluZWQgKi8pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIHJlc3VsdCAmJiBzdG9jaygpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSBlbHNlIGlmIChuZXdWYWx1ZSAhPT0gb2xkVmFsdWUgJiYgaXNWYWxpZEFycmF5SW5kZXgocCkpIHtcbiAgICAgICAgICAgIGNvbnN0IGkgPSBwIGFzIHVua25vd24gYXMgbnVtYmVyID4+PiAwO1xuICAgICAgICAgICAgY29uc3QgdHlwZTogQXJyYXlDaGFuZ2VUeXBlID0gTnVtYmVyKGkgPj0gdGFyZ2V0Lmxlbmd0aCk7IC8vIElOU0VSVCBvciBVUERBVEVcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIHJlc3VsdCAmJiB0YXJnZXRbX3N0b2NrQ2hhbmdlXSh0eXBlLCBpLCBuZXdWYWx1ZSwgb2xkVmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGRlbGV0ZVByb3BlcnR5KHRhcmdldCwgcCkge1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRhcmdldFtfaW50ZXJuYWxdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEID09PSBpbnRlcm5hbC5zdGF0ZSB8fCBpbnRlcm5hbC5ieU1ldGhvZCB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRhcmdldCwgcCkpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LmRlbGV0ZVByb3BlcnR5KHRhcmdldCwgcCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXRbcF07XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IFJlZmxlY3QuZGVsZXRlUHJvcGVydHkodGFyZ2V0LCBwKTtcbiAgICAgICAgcmVzdWx0ICYmIGlzVmFsaWRBcnJheUluZGV4KHApICYmIHRhcmdldFtfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5VUERBVEUsIHAgYXMgdW5rbm93biBhcyBudW1iZXIgPj4+IDAsIHVuZGVmaW5lZCwgb2xkVmFsdWUpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG59O1xuT2JqZWN0LmZyZWV6ZShfcHJveHlIYW5kbGVyKTtcblxuLyoqIEBpbnRlcm5hbCB2YWxpZCBhcnJheSBpbmRleCBoZWxwZXIgKi9cbmZ1bmN0aW9uIGlzVmFsaWRBcnJheUluZGV4PFQ+KGluZGV4OiBUKTogYm9vbGVhbiB7XG4gICAgY29uc3QgcyA9IFN0cmluZyhpbmRleCk7XG4gICAgY29uc3QgbiA9IE1hdGgudHJ1bmMocyBhcyB1bmtub3duIGFzIG51bWJlcik7XG4gICAgcmV0dXJuIFN0cmluZyhuKSA9PT0gcyAmJiAwIDw9IG4gJiYgbiA8IDB4RkZGRkZGRkY7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBpbmRleCBtYW5hZ2VtZW50ICovXG5mdW5jdGlvbiBmaW5kUmVsYXRlZENoYW5nZUluZGV4PFQ+KHJlY29yZHM6IE11dGFibGVDaGFuZ2VSZWNvcmQ8VD5bXSwgdHlwZTogQXJyYXlDaGFuZ2VUeXBlLCBpbmRleDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBjb25zdCBjaGVja1R5cGUgPSB0eXBlID09PSBBcnJheUNoYW5nZVR5cGUuSU5TRVJUXG4gICAgICAgID8gKHQ6IEFycmF5Q2hhbmdlVHlwZSkgPT4gdCA9PT0gQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRVxuICAgICAgICA6ICh0OiBBcnJheUNoYW5nZVR5cGUpID0+IHQgIT09IEFycmF5Q2hhbmdlVHlwZS5SRU1PVkVcbiAgICAgICAgO1xuXG4gICAgZm9yIChsZXQgaSA9IHJlY29yZHMubGVuZ3RoOyAtLWkgPj0gMDspIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSByZWNvcmRzW2ldO1xuICAgICAgICBpZiAodmFsdWUuaW5kZXggPT09IGluZGV4ICYmIGNoZWNrVHlwZSh2YWx1ZS50eXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWUuaW5kZXggPCBpbmRleCAmJiBCb29sZWFuKHZhbHVlLnR5cGUpKSB7IC8vIFJFTU9WRSBvciBJTlNFUlRcbiAgICAgICAgICAgIGluZGV4IC09IHZhbHVlLnR5cGU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIGFycmF5IGNsYXNzIHdoaWNoIGNoYW5nZSBjYW4gYmUgb2JzZXJ2ZWQuXG4gKiBAamEg5aSJ5pu055uj6KaW5Y+v6IO944Gq6YWN5YiX44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogY29uc3Qgb2JzQXJyYXkgPSBPYnNlcnZhYmxlQXJyYXkuZnJvbShbJ2EnLCAnYicsICdjJ10pO1xuICpcbiAqIGZ1bmN0aW9uIG9uQ2hhbmdlQXJyYXkocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmRbXSkge1xuICogICBjb25zb2xlLmxvZyhyZWNvcmRzKTtcbiAqICAgLy8gIFtcbiAqICAgLy8gICAgeyB0eXBlOiAxLCBpbmRleDogMywgbmV3VmFsdWU6ICd4Jywgb2xkVmFsdWU6IHVuZGVmaW5lZCB9LFxuICogICAvLyAgICB7IHR5cGU6IDEsIGluZGV4OiA0LCBuZXdWYWx1ZTogJ3knLCBvbGRWYWx1ZTogdW5kZWZpbmVkIH0sXG4gKiAgIC8vICAgIHsgdHlwZTogMSwgaW5kZXg6IDUsIG5ld1ZhbHVlOiAneicsIG9sZFZhbHVlOiB1bmRlZmluZWQgfVxuICogICAvLyAgXVxuICogfVxuICogb2JzQXJyYXkub24ob25DaGFuZ2VBcnJheSk7XG4gKlxuICogZnVuY3Rpb24gYWRkWFlaKCkge1xuICogICBvYnNBcnJheS5wdXNoKCd4JywgJ3knLCAneicpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBPYnNlcnZhYmxlQXJyYXk8VCA9IHVua25vd24+IGV4dGVuZHMgQXJyYXk8VD4gaW1wbGVtZW50cyBJT2JzZXJ2YWJsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19pbnRlcm5hbF0hOiBJbnRlcm5hbFByb3BzPFQ+O1xuXG4gICAgLyoqIEBmaW5hbCBjb25zdHJ1Y3RvciAqL1xuICAgIHByaXZhdGUgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKC4uLmFyZ3VtZW50cyk7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIE9ic2VydmFibGVBcnJheSwgdGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsOiBJbnRlcm5hbFByb3BzPFQ+ID0ge1xuICAgICAgICAgICAgc3RhdGU6IE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUsXG4gICAgICAgICAgICBieU1ldGhvZDogZmFsc2UsXG4gICAgICAgICAgICByZWNvcmRzOiBbXSxcbiAgICAgICAgICAgIGluZGV4ZXM6IG5ldyBTZXQoKSxcbiAgICAgICAgICAgIGJyb2tlcjogbmV3IEV2ZW50QnJva2VyUHJveHk8SUFycmF5Q2hhbmdlRXZlbnQ8VD4+KCksXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBfaW50ZXJuYWwsIHsgdmFsdWU6IE9iamVjdC5zZWFsKGludGVybmFsKSB9KTtcbiAgICAgICAgY29uc3QgYXJnTGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgaWYgKDEgPT09IGFyZ0xlbmd0aCAmJiBpc051bWJlcihhcmd1bWVudHNbMF0pKSB7XG4gICAgICAgICAgICBjb25zdCBsZW4gPSBhcmd1bWVudHNbMF0gPj4+IDA7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGkgLyosIHVuZGVmaW5lZCAqLyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoMCA8IGFyZ0xlbmd0aCkge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmdMZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuSU5TRVJULCBpLCBhcmd1bWVudHNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJveHkodGhpcywgX3Byb3h5SGFuZGxlcikgYXMgT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElPYnNlcnZhYmxlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGFycmF5IGNoYW5nZShzKS5cbiAgICAgKiBAamEg6YWN5YiX5aSJ5pu06LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBhcnJheSBjaGFuZ2UuXG4gICAgICogIC0gYGphYCDphY3liJflpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbihsaXN0ZW5lcjogKHJlY29yZHM6IEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpc1tfaW50ZXJuYWxdLmJyb2tlci5nZXQoKS5vbignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgYXJyYXkgY2hhbmdlKHMpLlxuICAgICAqIEBqYSDphY3liJflpInmm7Tos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGFycmF5IGNoYW5nZS5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgYWxsIHNhbWUgYGNoYW5uZWxgIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDphY3liJflpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WQjOS4gCBgY2hhbm5lbGAg44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmKGxpc3RlbmVyPzogKHJlY29yZHM6IEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10pID0+IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmJyb2tlci5nZXQoKS5vZmYoJ0AnLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1c3BlbmQgb3IgZGlzYWJsZSB0aGUgZXZlbnQgb2JzZXJ2YXRpb24gc3RhdGUuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreeKtuaFi+OBruOCteOCueODmuODs+ODiVxuICAgICAqXG4gICAgICogQHBhcmFtIG5vUmVjb3JkXG4gICAgICogIC0gYGVuYCBgdHJ1ZWA6IG5vdCByZWNvcmRpbmcgcHJvcGVydHkgY2hhbmdlcyBhbmQgY2xlYXIgY2hhbmdlcy4gLyBgZmFsc2VgOiBwcm9wZXJ0eSBjaGFuZ2VzIGFyZSByZWNvcmRlZCBhbmQgZmlyZWQgd2hlbiBbW3Jlc3VtZV1dKCkgY2FsbGRlZC4gKGRlZmF1bHQpXG4gICAgICogIC0gYGphYCBgdHJ1ZWA6IOODl+ODreODkeODhuOCo+WkieabtOOCguiomOmMsuOBm+OBmiwg54++5Zyo44Gu6KiY6Yyy44KC56C05qOEIC8gYGZhbHNlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044Gv6KiY6Yyy44GV44KMLCBbW3Jlc3VtZV1dKCkg5pmC44Gr55m654Gr44GZ44KLICjml6LlrpopXG4gICAgICovXG4gICAgc3VzcGVuZChub1JlY29yZCA9IGZhbHNlKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHRoaXNbX2ludGVybmFsXS5zdGF0ZSA9IG5vUmVjb3JkID8gT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEIDogT2JzZXJ2YWJsZVN0YXRlLlNVU0VQTkRFRDtcbiAgICAgICAgaWYgKG5vUmVjb3JkKSB7XG4gICAgICAgICAgICB0aGlzW19pbnRlcm5hbF0ucmVjb3JkcyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN1bWUgb2YgdGhlIGV2ZW50IHN1YnNjcmlwdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44Oq44K444Ol44O844OgXG4gICAgICovXG4gICAgcmVzdW1lKCk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgIT09IGludGVybmFsLnN0YXRlKSB7XG4gICAgICAgICAgICBpbnRlcm5hbC5zdGF0ZSA9IE9ic2VydmFibGVTdGF0ZS5BQ1RJVkU7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4gdGhpc1tfbm90aWZ5Q2hhbmdlc10oKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIG9ic2VydmF0aW9uIHN0YXRlXG4gICAgICogQGphIOizvOiqreWPr+iDveeKtuaFi1xuICAgICAqL1xuICAgIGdldE9ic2VydmFibGVTdGF0ZSgpOiBPYnNlcnZhYmxlU3RhdGUge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpc1tfaW50ZXJuYWxdLnN0YXRlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG92ZXJyaWRlOiBBcnJheSBtZXRob2RzXG5cbiAgICAvKipcbiAgICAgKiBTb3J0cyBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0gY29tcGFyZUZuIFRoZSBuYW1lIG9mIHRoZSBmdW5jdGlvbiB1c2VkIHRvIGRldGVybWluZSB0aGUgb3JkZXIgb2YgdGhlIGVsZW1lbnRzLiBJZiBvbWl0dGVkLCB0aGUgZWxlbWVudHMgYXJlIHNvcnRlZCBpbiBhc2NlbmRpbmcsIEFTQ0lJIGNoYXJhY3RlciBvcmRlci5cbiAgICAgKi9cbiAgICBzb3J0KGNvbXBhcmF0b3I/OiAobGhzOiBULCByaHM6IFQpID0+IG51bWJlcik6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY29uc3Qgb2xkID0gQXJyYXkuZnJvbSh0aGlzKTtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSB0cnVlO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzdXBlci5zb3J0KGNvbXBhcmF0b3IpO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IGZhbHNlO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgbGVuID0gb2xkLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IG9sZFtpXTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IHRoaXNbaV07XG4gICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlICE9PSBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlVQREFURSwgaSwgbmV3VmFsdWUsIG9sZFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGVsZW1lbnRzIGZyb20gYW4gYXJyYXkgYW5kLCBpZiBuZWNlc3NhcnksIGluc2VydHMgbmV3IGVsZW1lbnRzIGluIHRoZWlyIHBsYWNlLCByZXR1cm5pbmcgdGhlIGRlbGV0ZWQgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIHN0YXJ0IFRoZSB6ZXJvLWJhc2VkIGxvY2F0aW9uIGluIHRoZSBhcnJheSBmcm9tIHdoaWNoIHRvIHN0YXJ0IHJlbW92aW5nIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSBkZWxldGVDb3VudCBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHJlbW92ZS5cbiAgICAgKi9cbiAgICBzcGxpY2Uoc3RhcnQ6IG51bWJlciwgZGVsZXRlQ291bnQ/OiBudW1iZXIpOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBlbGVtZW50cyBmcm9tIGFuIGFycmF5IGFuZCwgaWYgbmVjZXNzYXJ5LCBpbnNlcnRzIG5ldyBlbGVtZW50cyBpbiB0aGVpciBwbGFjZSwgcmV0dXJuaW5nIHRoZSBkZWxldGVkIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSBzdGFydCBUaGUgemVyby1iYXNlZCBsb2NhdGlvbiBpbiB0aGUgYXJyYXkgZnJvbSB3aGljaCB0byBzdGFydCByZW1vdmluZyBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gZGVsZXRlQ291bnQgVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZW1vdmUuXG4gICAgICogQHBhcmFtIGl0ZW1zIEVsZW1lbnRzIHRvIGluc2VydCBpbnRvIHRoZSBhcnJheSBpbiBwbGFjZSBvZiB0aGUgZGVsZXRlZCBlbGVtZW50cy5cbiAgICAgKi9cbiAgICBzcGxpY2Uoc3RhcnQ6IG51bWJlciwgZGVsZXRlQ291bnQ6IG51bWJlciwgLi4uaXRlbXM6IFRbXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICBzcGxpY2Uoc3RhcnQ6IG51bWJlciwgZGVsZXRlQ291bnQ/OiBudW1iZXIsIC4uLml0ZW1zOiBUW10pOiBPYnNlcnZhYmxlQXJyYXk8VD4ge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY29uc3Qgb2xkTGVuID0gdGhpcy5sZW5ndGg7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gKHN1cGVyLnNwbGljZSBhcyBVbmtub3duRnVuY3Rpb24pKC4uLmFyZ3VtZW50cykgYXMgT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IGZhbHNlO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgc3RhcnQgPSBNYXRoLnRydW5jKHN0YXJ0KTtcbiAgICAgICAgICAgIGNvbnN0IGZyb20gPSBzdGFydCA8IDAgPyBNYXRoLm1heChvbGRMZW4gKyBzdGFydCwgMCkgOiBNYXRoLm1pbihzdGFydCwgb2xkTGVuKTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSByZXN1bHQubGVuZ3RoOyAtLWkgPj0gMDspIHtcbiAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRSwgZnJvbSArIGksIHVuZGVmaW5lZCwgcmVzdWx0W2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGxlbiA9IGl0ZW1zLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLklOU0VSVCwgZnJvbSArIGksIGl0ZW1zW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgdGhlIGZpcnN0IGVsZW1lbnQgZnJvbSBhbiBhcnJheSBhbmQgcmV0dXJucyBpdC5cbiAgICAgKi9cbiAgICBzaGlmdCgpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IG9sZExlbiA9IHRoaXMubGVuZ3RoO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLnNoaWZ0KCk7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gZmFsc2U7XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IGludGVybmFsLnN0YXRlICYmIHRoaXMubGVuZ3RoIDwgb2xkTGVuKSB7XG4gICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRSwgMCwgdW5kZWZpbmVkLCByZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5zZXJ0cyBuZXcgZWxlbWVudHMgYXQgdGhlIHN0YXJ0IG9mIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSBpdGVtcyAgRWxlbWVudHMgdG8gaW5zZXJ0IGF0IHRoZSBzdGFydCBvZiB0aGUgQXJyYXkuXG4gICAgICovXG4gICAgdW5zaGlmdCguLi5pdGVtczogVFtdKTogbnVtYmVyIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc3VwZXIudW5zaGlmdCguLi5pdGVtcyk7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gZmFsc2U7XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IGludGVybmFsLnN0YXRlKSB7XG4gICAgICAgICAgICBjb25zdCBsZW4gPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGksIGl0ZW1zW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxzIGEgZGVmaW5lZCBjYWxsYmFjayBmdW5jdGlvbiBvbiBlYWNoIGVsZW1lbnQgb2YgYW4gYXJyYXksIGFuZCByZXR1cm5zIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHJlc3VsdHMuXG4gICAgICogQHBhcmFtIGNhbGxiYWNrZm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdXAgdG8gdGhyZWUgYXJndW1lbnRzLiBUaGUgbWFwIG1ldGhvZCBjYWxscyB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbiBvbmUgdGltZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBBbiBvYmplY3QgdG8gd2hpY2ggdGhlIHRoaXMga2V5d29yZCBjYW4gcmVmZXIgaW4gdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24uIElmIHRoaXNBcmcgaXMgb21pdHRlZCwgdW5kZWZpbmVkIGlzIHVzZWQgYXMgdGhlIHRoaXMgdmFsdWUuXG4gICAgICovXG4gICAgbWFwPFU+KGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSwgdGhpc0FyZz86IHVua25vd24pOiBPYnNlcnZhYmxlQXJyYXk8VT4ge1xuICAgICAgICAvKlxuICAgICAgICAgKiBbTk9URV0gb3JpZ2luYWwgaW1wbGVtZW50IGlzIHZlcnkgdmVyeSBoaWdoLWNvc3QuXG4gICAgICAgICAqICAgICAgICBzbyBpdCdzIGNvbnZlcnRlZCBuYXRpdmUgQXJyYXkgb25jZSwgYW5kIHJlc3RvcmVkLlxuICAgICAgICAgKlxuICAgICAgICAgKiByZXR1cm4gKHN1cGVyLm1hcCBhcyBVbmtub3duRnVuY3Rpb24pKC4uLmFyZ3VtZW50cyk7XG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gT2JzZXJ2YWJsZUFycmF5LmZyb20oWy4uLnRoaXNdLm1hcChjYWxsYmFja2ZuLCB0aGlzQXJnKSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2Vzc1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIGdldEJyb2tlcigpOiBFdmVudEJyb2tlcjxJQXJyYXlDaGFuZ2VFdmVudDxUPj4ge1xuICAgICAgICBjb25zdCB7IGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICByZXR1cm4gYnJva2VyLmdldCgpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWVodG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfc3RvY2tDaGFuZ2VdKHR5cGU6IEFycmF5Q2hhbmdlVHlwZSwgaW5kZXg6IG51bWJlciwgbmV3VmFsdWU/OiBULCBvbGRWYWx1ZT86IFQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZSwgaW5kZXhlcywgcmVjb3JkcyB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCByY2kgPSBpbmRleGVzLmhhcyhpbmRleCkgPyBmaW5kUmVsYXRlZENoYW5nZUluZGV4KHJlY29yZHMsIHR5cGUsIGluZGV4KSA6IC0xO1xuICAgICAgICBjb25zdCBsZW4gPSByZWNvcmRzLmxlbmd0aDtcbiAgICAgICAgaWYgKHJjaSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCByY3QgPSByZWNvcmRzW3JjaV0udHlwZTtcbiAgICAgICAgICAgIGlmICghcmN0IC8qIFVQREFURSAqLykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZSZWNvcmQgPSByZWNvcmRzLnNwbGljZShyY2ksIDEpWzBdO1xuICAgICAgICAgICAgICAgIC8vIFVQREFURSA9PiBVUERBVEUgOiBVUERBVEVcbiAgICAgICAgICAgICAgICAvLyBVUERBVEUgPT4gUkVNT1ZFIDogSU5TRVJUXG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKHR5cGUsIGluZGV4LCBuZXdWYWx1ZSwgcHJldlJlY29yZC5vbGRWYWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IHIsIGkgPSBsZW47IC0taSA+IHJjaTspIHtcbiAgICAgICAgICAgICAgICAgICAgciA9IHJlY29yZHNbaV07XG4gICAgICAgICAgICAgICAgICAgIChyLmluZGV4ID49IGluZGV4KSAmJiAoci5pbmRleCAtPSByY3QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBwcmV2UmVjb3JkID0gcmVjb3Jkcy5zcGxpY2UocmNpLCAxKVswXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZSAhPT0gQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJTlNFUlQgPT4gVVBEQVRFIDogSU5TRVJUXG4gICAgICAgICAgICAgICAgICAgIC8vIFJFTU9WRSA9PiBJTlNFUlQgOiBVUERBVEVcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKE51bWJlcighdHlwZSksIGluZGV4LCBuZXdWYWx1ZSwgcHJldlJlY29yZC5vbGRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGluZGV4ZXMuYWRkKGluZGV4KTtcbiAgICAgICAgcmVjb3Jkc1tsZW5dID0geyB0eXBlLCBpbmRleCwgbmV3VmFsdWUsIG9sZFZhbHVlIH07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFID09PSBzdGF0ZSAmJiAwID09PSBsZW4pIHtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB0aGlzW19ub3RpZnlDaGFuZ2VzXSgpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfbm90aWZ5Q2hhbmdlc10oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgc3RhdGUsIHJlY29yZHMgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgIT09IHN0YXRlIHx8IDAgPT09IHJlY29yZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCByIG9mIHJlY29yZHMpIHtcbiAgICAgICAgICAgIE9iamVjdC5mcmVlemUocik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpc1tfbm90aWZ5XShPYmplY3QuZnJlZXplKHJlY29yZHMpIGFzIEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10pO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0ucmVjb3JkcyA9IFtdO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfbm90aWZ5XShyZWNvcmRzOiBBcnJheUNoYW5nZVJlY29yZDxUPltdKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpbnRlcm5hbC5pbmRleGVzLmNsZWFyKCk7XG4gICAgICAgIGludGVybmFsLmJyb2tlci5nZXQoKS50cmlnZ2VyKCdAJywgcmVjb3Jkcyk7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBPdmVycmlkZSByZXR1cm4gdHlwZSBvZiBwcm90b3R5cGUgbWV0aG9kc1xuICovXG5leHBvcnQgaW50ZXJmYWNlIE9ic2VydmFibGVBcnJheTxUPiB7XG4gICAgLyoqXG4gICAgICogQ29tYmluZXMgdHdvIG9yIG1vcmUgYXJyYXlzLlxuICAgICAqIEBwYXJhbSBpdGVtcyBBZGRpdGlvbmFsIGl0ZW1zIHRvIGFkZCB0byB0aGUgZW5kIG9mIGFycmF5MS5cbiAgICAgKi9cbiAgICBjb25jYXQoLi4uaXRlbXM6IFRbXVtdKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIC8qKlxuICAgICAqIENvbWJpbmVzIHR3byBvciBtb3JlIGFycmF5cy5cbiAgICAgKiBAcGFyYW0gaXRlbXMgQWRkaXRpb25hbCBpdGVtcyB0byBhZGQgdG8gdGhlIGVuZCBvZiBhcnJheTEuXG4gICAgICovXG4gICAgY29uY2F0KC4uLml0ZW1zOiAoVCB8IFRbXSlbXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBSZXZlcnNlcyB0aGUgZWxlbWVudHMgaW4gYW4gQXJyYXkuXG4gICAgICovXG4gICAgcmV2ZXJzZSgpOiB0aGlzO1xuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBzZWN0aW9uIG9mIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSBzdGFydCBUaGUgYmVnaW5uaW5nIG9mIHRoZSBzcGVjaWZpZWQgcG9ydGlvbiBvZiB0aGUgYXJyYXkuXG4gICAgICogQHBhcmFtIGVuZCBUaGUgZW5kIG9mIHRoZSBzcGVjaWZpZWQgcG9ydGlvbiBvZiB0aGUgYXJyYXkuXG4gICAgICovXG4gICAgc2xpY2Uoc3RhcnQ/OiBudW1iZXIsIGVuZD86IG51bWJlcik6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBlbGVtZW50cyBvZiBhbiBhcnJheSB0aGF0IG1lZXQgdGhlIGNvbmRpdGlvbiBzcGVjaWZpZWQgaW4gYSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tmbiBBIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyB1cCB0byB0aHJlZSBhcmd1bWVudHMuIFRoZSBmaWx0ZXIgbWV0aG9kIGNhbGxzIHRoZSBjYWxsYmFja2ZuIGZ1bmN0aW9uIG9uZSB0aW1lIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIGFycmF5LlxuICAgICAqIEBwYXJhbSB0aGlzQXJnIEFuIG9iamVjdCB0byB3aGljaCB0aGUgdGhpcyBrZXl3b3JkIGNhbiByZWZlciBpbiB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbi4gSWYgdGhpc0FyZyBpcyBvbWl0dGVkLCB1bmRlZmluZWQgaXMgdXNlZCBhcyB0aGUgdGhpcyB2YWx1ZS5cbiAgICAgKi9cbiAgICBmaWx0ZXI8UyBleHRlbmRzIFQ+KGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdmFsdWUgaXMgUywgdGhpc0FyZz86IHVua25vd24pOiBPYnNlcnZhYmxlQXJyYXk8Uz47XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZWxlbWVudHMgb2YgYW4gYXJyYXkgdGhhdCBtZWV0IHRoZSBjb25kaXRpb24gc3BlY2lmaWVkIGluIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIGNhbGxiYWNrZm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdXAgdG8gdGhyZWUgYXJndW1lbnRzLiBUaGUgZmlsdGVyIG1ldGhvZCBjYWxscyB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbiBvbmUgdGltZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBBbiBvYmplY3QgdG8gd2hpY2ggdGhlIHRoaXMga2V5d29yZCBjYW4gcmVmZXIgaW4gdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24uIElmIHRoaXNBcmcgaXMgb21pdHRlZCwgdW5kZWZpbmVkIGlzIHVzZWQgYXMgdGhlIHRoaXMgdmFsdWUuXG4gICAgICovXG4gICAgZmlsdGVyKGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdW5rbm93biwgdGhpc0FyZz86IHVua25vd24pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG59XG5cbi8qKlxuICogT3ZlcnJpZGUgcmV0dXJuIHR5cGUgb2Ygc3RhdGljIG1ldGhvZHNcbiAqL1xuZXhwb3J0IGRlY2xhcmUgbmFtZXNwYWNlIE9ic2VydmFibGVBcnJheSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZVxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXJyYXkgZnJvbSBhbiBhcnJheS1saWtlIG9iamVjdC5cbiAgICAgKiBAcGFyYW0gYXJyYXlMaWtlIEFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0IHRvIGNvbnZlcnQgdG8gYW4gYXJyYXkuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZnJvbTxUPihhcnJheUxpa2U6IEFycmF5TGlrZTxUPiB8IEl0ZXJhYmxlPFQ+KTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXJyYXkgZnJvbSBhbiBhcnJheS1saWtlIG9iamVjdC5cbiAgICAgKiBAcGFyYW0gYXJyYXlMaWtlIEFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0IHRvIGNvbnZlcnQgdG8gYW4gYXJyYXkuXG4gICAgICogQHBhcmFtIG1hcGZuIEEgbWFwcGluZyBmdW5jdGlvbiB0byBjYWxsIG9uIGV2ZXJ5IGVsZW1lbnQgb2YgdGhlIGFycmF5LlxuICAgICAqIEBwYXJhbSB0aGlzQXJnIFZhbHVlIG9mICd0aGlzJyB1c2VkIHRvIGludm9rZSB0aGUgbWFwZm4uXG4gICAgICovXG4gICAgZnVuY3Rpb24gZnJvbTxULCBVPihhcnJheUxpa2U6IEFycmF5TGlrZTxUPiB8IEl0ZXJhYmxlPFQ+LCBtYXBmbjogKHRoaXM6IHZvaWQsIHY6IFQsIGs6IG51bWJlcikgPT4gVSwgdGhpc0FyZz86IHVuZGVmaW5lZCk6IE9ic2VydmFibGVBcnJheTxVPjtcbiAgICBmdW5jdGlvbiBmcm9tPFgsIFQsIFU+KGFycmF5TGlrZTogQXJyYXlMaWtlPFQ+IHwgSXRlcmFibGU8VD4sIG1hcGZuOiAodGhpczogWCwgdjogVCwgazogbnVtYmVyKSA9PiBVLCB0aGlzQXJnOiBYKTogT2JzZXJ2YWJsZUFycmF5PFU+O1xuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBuZXcgYXJyYXkgZnJvbSBhIHNldCBvZiBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gaXRlbXMgQSBzZXQgb2YgZWxlbWVudHMgdG8gaW5jbHVkZSBpbiB0aGUgbmV3IGFycmF5IG9iamVjdC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBvZjxUPiguLi5pdGVtczogVFtdKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xufVxuIl0sIm5hbWVzIjpbIl9wcm94eUhhbmRsZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBT0E7TUFDYSxnQkFBZ0IsQ0FBQTtBQUNqQixJQUFBLE9BQU8sQ0FBc0I7SUFDOUIsR0FBRyxHQUFBO0FBQ04sUUFBQSxPQUFPLElBQUksQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7S0FDN0Q7QUFDSixDQUFBO0FBRUQsaUJBQXdCLE1BQU0sU0FBUyxHQUFRLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNsRSxpQkFBd0IsTUFB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