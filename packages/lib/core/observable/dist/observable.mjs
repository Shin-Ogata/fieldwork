/*!
 * @cdp/observable 0.9.5
 *   observable utility module
 */

import { verify, isArray, post, deepMerge, deepEqual, isString, isNumber } from '@cdp/core-utils';
import { EventBroker } from '@cdp/events';

/** @internal EventBrokerProxy */
class EventBrokerProxy {
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
    @typescript-eslint/no-explicit-any
 */
/** @internal */
const _proxyHandler = {
    set(target, p, value, receiver) {
        if (!isString(p)) {
            return Reflect.set(target, p, value, receiver);
        }
        const oldValue = target[p];
        if ("disabled" /* DISABLED */ !== target[_internal].state && value !== oldValue) {
            target[_stockChange](p, oldValue);
        }
        return Reflect.set(target, p, value, receiver);
    },
};
Object.freeze(_proxyHandler);
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
    /**
     * constructor
     *
     * @param state
     *  - `en` initial state. default: [[ObservableState.ACTIVE]]
     *  - `ja` 初期状態 既定: [[ObservableState.ACTIVE]]
     */
    constructor(state = "active" /* ACTIVE */) {
        verify('instanceOf', ObservableObject, this);
        const internal = {
            state,
            changed: false,
            changeMap: new Map(),
            broker: new EventBrokerProxy(),
        };
        Object.defineProperty(this, _internal, { value: Object.seal(internal) });
        return new Proxy(this, _proxyHandler);
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
        this[_internal].state = noRecord ? "disabled" /* DISABLED */ : "suspended" /* SUSEPNDED */;
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
        if ("active" /* ACTIVE */ !== internal.state) {
            internal.state = "active" /* ACTIVE */;
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
        }("disabled" /* DISABLED */), src);
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
            if ("active" /* ACTIVE */ === state) {
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
        if ("active" /* ACTIVE */ !== state) {
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
    prefer-rest-params
 */
/** @internal */
const _proxyHandler$1 = {
    defineProperty(target, p, attributes) {
        const internal = target[_internal];
        if ("disabled" /* DISABLED */ === internal.state || internal.byMethod || !Object.prototype.hasOwnProperty.call(attributes, 'value')) {
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
                        target[_stockChange](-1 /* REMOVE */, i, undefined, scrap[i - newLength]);
                    }
                }
                else { // oldLength < newLength
                    for (let i = oldLength; i < newLength; i++) {
                        target[_stockChange](1 /* INSERT */, i /*, undefined, undefined */);
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
        if ("disabled" /* DISABLED */ === internal.state || internal.byMethod || !Object.prototype.hasOwnProperty.call(target, p)) {
            return Reflect.deleteProperty(target, p);
        }
        const oldValue = target[p];
        const result = Reflect.deleteProperty(target, p);
        result && isValidArrayIndex(p) && target[_stockChange](0 /* UPDATE */, p >>> 0, undefined, oldValue);
        return result;
    },
};
Object.freeze(_proxyHandler$1);
/** @internal valid array index helper */
function isValidArrayIndex(index) {
    const s = String(index);
    const n = Math.trunc(s);
    return String(n) === s && 0 <= n && n < 0xFFFFFFFF;
}
/** @internal helper for index management */
function findRelatedChangeIndex(records, type, index) {
    const checkType = type === 1 /* INSERT */
        ? (t) => t === -1 /* REMOVE */
        : (t) => t !== -1 /* REMOVE */;
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
    /** @final constructor */
    constructor() {
        super(...arguments);
        verify('instanceOf', ObservableArray, this);
        const internal = {
            state: "active" /* ACTIVE */,
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
                this[_stockChange](1 /* INSERT */, i /*, undefined */);
            }
        }
        else if (0 < argLength) {
            for (let i = 0; i < argLength; i++) {
                this[_stockChange](1 /* INSERT */, i, arguments[i]);
            }
        }
        return new Proxy(this, _proxyHandler$1);
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
        this[_internal].state = noRecord ? "disabled" /* DISABLED */ : "suspended" /* SUSEPNDED */;
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
        if ("active" /* ACTIVE */ !== internal.state) {
            internal.state = "active" /* ACTIVE */;
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
        if ("disabled" /* DISABLED */ !== internal.state) {
            const len = old.length;
            for (let i = 0; i < len; i++) {
                const oldValue = old[i];
                const newValue = this[i];
                if (newValue !== oldValue) {
                    this[_stockChange](0 /* UPDATE */, i, newValue, oldValue);
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
        if ("disabled" /* DISABLED */ !== internal.state) {
            start = Math.trunc(start);
            const from = start < 0 ? Math.max(oldLen + start, 0) : Math.min(start, oldLen);
            for (let i = result.length; --i >= 0;) {
                this[_stockChange](-1 /* REMOVE */, from + i, undefined, result[i]);
            }
            const len = items.length;
            for (let i = 0; i < len; i++) {
                this[_stockChange](1 /* INSERT */, from + i, items[i]);
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
        if ("disabled" /* DISABLED */ !== internal.state && this.length < oldLen) {
            this[_stockChange](-1 /* REMOVE */, 0, undefined, result);
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
        if ("disabled" /* DISABLED */ !== internal.state) {
            const len = items.length;
            for (let i = 0; i < len; i++) {
                this[_stockChange](1 /* INSERT */, i, items[i]);
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
                if (type !== -1 /* REMOVE */) {
                    // INSERT => UPDATE : INSERT
                    // REMOVE => INSERT : UPDATE
                    this[_stockChange](Number(!type), index, newValue, prevRecord.oldValue);
                }
            }
            return;
        }
        indexes.add(index);
        records[len] = { type, index, newValue, oldValue };
        if ("active" /* ACTIVE */ === state && 0 === len) {
            void post(() => this[_notifyChanges]());
        }
    }
    /** @internal */
    [_notifyChanges]() {
        const { state, records } = this[_internal];
        if ("active" /* ACTIVE */ !== state || 0 === records.length) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZS5tanMiLCJzb3VyY2VzIjpbImludGVybmFsLnRzIiwiY29tbW9uLnRzIiwib2JqZWN0LnRzIiwiYXJyYXkudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgICBpc1N0cmluZyxcbiAgICBpc1N5bWJvbCxcbiAgICBjbGFzc05hbWUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcblxuLyoqIEBpbnRlcm5hbCBFdmVudEJyb2tlclByb3h5ICovXG5leHBvcnQgY2xhc3MgRXZlbnRCcm9rZXJQcm94eTxFdmVudCBleHRlbmRzIG9iamVjdD4ge1xuICAgIHByaXZhdGUgX2Jyb2tlcj86IEV2ZW50QnJva2VyPEV2ZW50PjtcbiAgICBwdWJsaWMgZ2V0KCk6IEV2ZW50QnJva2VyPEV2ZW50PiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9icm9rZXIgfHwgKHRoaXMuX2Jyb2tlciA9IG5ldyBFdmVudEJyb2tlcigpKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IF9pbnRlcm5hbCAgICAgID0gU3ltYm9sKCdpbnRlcm5hbCcpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgX25vdGlmeSAgICAgICAgPSBTeW1ib2woJ25vdGlmeScpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgX3N0b2NrQ2hhbmdlICAgPSBTeW1ib2woJ3N0b2NrLWNoYW5nZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgX25vdGlmeUNoYW5nZXMgPSBTeW1ib2woJ25vdGlmeS1jaGFuZ2VzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiB2ZXJpZnlPYnNlcnZhYmxlKHg6IHVua25vd24pOiB2b2lkIHwgbmV2ZXIge1xuICAgIGlmICgheCB8fCAhKHggYXMgb2JqZWN0KVtfaW50ZXJuYWxdKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFRoZSBvYmplY3QgcGFzc2VkIGlzIG5vdCBhbiBJT2JzZXJ2YWJsZS5gKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiB2ZXJpZnlWYWxpZEtleShrZXk6IHVua25vd24pOiB2b2lkIHwgbmV2ZXIge1xuICAgIGlmIChpc1N0cmluZyhrZXkpIHx8IGlzU3ltYm9sKGtleSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBUeXBlIG9mICR7Y2xhc3NOYW1lKGtleSl9IGlzIG5vdCBhIHZhbGlkIGtleS5gKTtcbn1cbiIsImltcG9ydCB7IFN1YnNjcmlwdGlvbiwgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBfaW50ZXJuYWwgfSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gRXZlbnQgb2JzZXJ2YXRpb24gc3RhdGUgZGVmaW5pdGlvbi5cbiAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvlrprnvqlcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gT2JzZXJ2YWJsZVN0YXRlIHtcbiAgICAvKiogb2JzZXJ2YWJsZSByZWFkeSAqL1xuICAgIEFDVElWRSAgID0gJ2FjdGl2ZScsXG4gICAgLyoqIE5PVCBvYnNlcnZlZCwgYnV0IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkLiAqL1xuICAgIFNVU0VQTkRFRCA9ICdzdXNwZW5kZWQnLFxuICAgIC8qKiBOT1Qgb2JzZXJ2ZWQsIGFuZCBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMuICovXG4gICAgRElTQUJMRUQgPSAnZGlzYWJsZWQnLFxufVxuXG4vKipcbiAqIEBlbiBPYnNlcnZhYmxlIGNvbW1vbiBpbnRlcmZhY2UuXG4gKiBAamEgT2JzZXJ2YWJsZSDlhbHpgJrjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJT2JzZXJ2YWJsZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICovXG4gICAgb24oLi4uYXJnczogdW5rbm93bltdKTogU3Vic2NyaXB0aW9uO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKi9cbiAgICBvZmYoLi4uYXJnczogdW5rbm93bltdKTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdXNwZW5kIG9yIGRpc2FibGUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jgrXjgrnjg5rjg7Pjg4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub1JlY29yZFxuICAgICAqICAtIGBlbmAgYHRydWVgOiBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMgYW5kIGNsZWFyIGNoYW5nZXMuIC8gYGZhbHNlYDogcHJvcGVydHkgY2hhbmdlcyBhcmUgcmVjb3JkZWQgYW5kIGZpcmVkIHdoZW4gW1tyZXN1bWVdXSgpIGNhbGxkZWQuIChkZWZhdWx0KVxuICAgICAqICAtIGBqYWAgYHRydWVgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7TjgoLoqJjpjLLjgZvjgZosIOePvuWcqOOBruiomOmMsuOCguegtOajhCAvIGBmYWxzZWA6IOODl+ODreODkeODhuOCo+WkieabtOOBr+iomOmMsuOBleOCjCwgW1tyZXN1bWVdXSgpIOaZguOBq+eZuueBq+OBmeOCiyAo5pei5a6aKVxuICAgICAqL1xuICAgIHN1c3BlbmQobm9SZWNvcmQ/OiBib29sZWFuKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN1bWUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jg6rjgrjjg6Xjg7zjg6BcbiAgICAgKi9cbiAgICByZXN1bWUoKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBvYnNlcnZhdGlvbiBzdGF0ZVxuICAgICAqIEBqYSDos7zoqq3lj6/og73nirbmhYtcbiAgICAgKi9cbiAgICBnZXRPYnNlcnZhYmxlU3RhdGUoKTogT2JzZXJ2YWJsZVN0YXRlO1xufVxuXG4vKipcbiAqIEBlbiBJbnRlcmZhY2UgYWJsZSB0byBhY2Nlc3MgdG8gW1tFdmVudEJyb2tlcl1dIHdpdGggW1tJT2JzZXJ2YWJsZV1dLlxuICogQGphIFtbSU9ic2VydmFibGVdXSDjga7mjIHjgaTlhoXpg6ggW1tFdmVudEJyb2tlcl1dIOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIElPYnNlcnZhYmxlRXZlbnRCcm9rZXJBY2Nlc3M8VCBleHRlbmRzIG9iamVjdCA9IGFueT4gZXh0ZW5kcyBJT2JzZXJ2YWJsZSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgW1tFdmVudEJyb2tlcl1dIGluc3RhbmNlLlxuICAgICAqIEBqYSBbW0V2ZW50QnJva2VyXV0g44Kk44Oz44K544K/44Oz44K544Gu5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0QnJva2VyKCk6IEV2ZW50QnJva2VyPFQ+O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBbW0lPYnNlcnZhYmxlXV0uXG4gKiBAamEgW1tJT2JzZXJ2YWJsZV1dIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT2JzZXJ2YWJsZSh4OiB1bmtub3duKTogeCBpcyBJT2JzZXJ2YWJsZSB7XG4gICAgcmV0dXJuIEJvb2xlYW4oeCAmJiAoeCBhcyBvYmplY3QpW19pbnRlcm5hbF0pO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICBOb25GdW5jdGlvblByb3BlcnRpZXMsXG4gICAgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgdmVyaWZ5LFxuICAgIHBvc3QsXG4gICAgZGVlcE1lcmdlLFxuICAgIGRlZXBFcXVhbCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiwgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQge1xuICAgIEV2ZW50QnJva2VyUHJveHksXG4gICAgX2ludGVybmFsLFxuICAgIF9ub3RpZnksXG4gICAgX3N0b2NrQ2hhbmdlLFxuICAgIF9ub3RpZnlDaGFuZ2VzLFxuICAgIHZlcmlmeU9ic2VydmFibGUsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZVN0YXRlLCBJT2JzZXJ2YWJsZSB9IGZyb20gJy4vY29tbW9uJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEludGVybmFsUHJvcHMge1xuICAgIHN0YXRlOiBPYnNlcnZhYmxlU3RhdGU7XG4gICAgY2hhbmdlZDogYm9vbGVhbjtcbiAgICByZWFkb25seSBjaGFuZ2VNYXA6IE1hcDxQcm9wZXJ0eUtleSwgYW55PjtcbiAgICByZWFkb25seSBicm9rZXI6IEV2ZW50QnJva2VyUHJveHk8YW55Pjtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3Byb3h5SGFuZGxlcjogUHJveHlIYW5kbGVyPE9ic2VydmFibGVPYmplY3Q+ID0ge1xuICAgIHNldCh0YXJnZXQsIHAsIHZhbHVlLCByZWNlaXZlcikge1xuICAgICAgICBpZiAoIWlzU3RyaW5nKHApKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5zZXQodGFyZ2V0LCBwLCB2YWx1ZSwgcmVjZWl2ZXIpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0W3BdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSB0YXJnZXRbX2ludGVybmFsXS5zdGF0ZSAmJiB2YWx1ZSAhPT0gb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIHRhcmdldFtfc3RvY2tDaGFuZ2VdKHAsIG9sZFZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUmVmbGVjdC5zZXQodGFyZ2V0LCBwLCB2YWx1ZSwgcmVjZWl2ZXIpO1xuICAgIH0sXG59O1xuT2JqZWN0LmZyZWV6ZShfcHJveHlIYW5kbGVyKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE9ic2VydmFibGUga2V5IHR5cGUgZGVmaW5pdGlvbi5cbiAqIEBqYSDos7zoqq3lj6/og73jgarjgq3jg7zjga7lnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgT2JzZXJ2YWJsZUtleXM8VCBleHRlbmRzIE9ic2VydmFibGVPYmplY3Q+ID0gTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIG9iamVjdCBjbGFzcyB3aGljaCBjaGFuZ2UgY2FuIGJlIG9ic2VydmVkLlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBruWkieabtOOCkuebo+imluOBp+OBjeOCi+OCquODluOCuOOCp+OCr+ODiOOCr+ODqeOCuVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiAtIEJhc2ljIFVzYWdlXG4gKlxuICogYGBgdHNcbiAqIGNsYXNzIEV4YW1wbGUgZXh0ZW5kcyBPYnNlcnZhYmxlT2JqZWN0IHtcbiAqICAgcHVibGljIGE6IG51bWJlciA9IDA7XG4gKiAgIHB1YmxpYyBiOiBudW1iZXIgPSAwO1xuICogICBwdWJsaWMgZ2V0IHN1bSgpOiBudW1iZXIge1xuICogICAgICAgcmV0dXJuIHRoaXMuYSArIHRoaXMuYjtcbiAqICAgfVxuICogfVxuICpcbiAqIGNvbnN0IG9ic2VydmFibGUgPSBuZXcgRXhhbXBsZSgpO1xuICpcbiAqIGZ1bmN0aW9uIG9uTnVtQ2hhbmdlKG5ld1ZhbHVlOiBudW1iZXIsIG9sZFZhbHVlOiBudW1iZXIsIGtleTogc3RyaW5nKSB7XG4gKiAgIGNvbnNvbGUubG9nKGAke2tleX0gY2hhbmdlZCBmcm9tICR7b2xkVmFsdWV9IHRvICR7bmV3VmFsdWV9LmApO1xuICogfVxuICogb2JzZXJ2YWJsZS5vbihbJ2EnLCAnYiddLCBvbk51bUNoYW5nZSk7XG4gKlxuICogLy8gdXBkYXRlXG4gKiBvYnNlcnZhYmxlLmEgPSAxMDA7XG4gKiBvYnNlcnZhYmxlLmIgPSAyMDA7XG4gKlxuICogLy8gY29uc29sZSBvdXQgZnJvbSBgYXN5bmNgIGV2ZW50IGxvb3AuXG4gKiAvLyA9PiAnYSBjaGFuZ2VkIGZyb20gMCB0byAxMDAuJ1xuICogLy8gPT4gJ2IgY2hhbmdlZCBmcm9tIDAgdG8gMjAwLidcbiAqXG4gKiA6XG4gKlxuICogZnVuY3Rpb24gb25TdW1DaGFuZ2UobmV3VmFsdWU6IG51bWJlciwgb2xkVmFsdWU6IG51bWJlcikge1xuICogICBjb25zb2xlLmxvZyhgc3VtIGNoYW5nZWQgZnJvbSAke29sZFZhbHVlfSB0byAke25ld1ZhdWV9LmApO1xuICogfVxuICogb2JzZXJ2YWJsZS5vbignc3VtJywgb25TdW1DaGFuZ2UpO1xuICpcbiAqIC8vIHVwZGF0ZVxuICogb2JzZXJ2YWJsZS5hID0gMTAwOyAvLyBub3RoaW5nIHJlYWN0aW9uIGJlY2F1c2Ugb2Ygbm8gY2hhbmdlIHByb3BlcnRpZXMuXG4gKiBvYnNlcnZhYmxlLmEgPSAyMDA7XG4gKlxuICogLy8gY29uc29sZSBvdXQgZnJvbSBgYXN5bmNgIGV2ZW50IGxvb3AuXG4gKiAvLyA9PiAnc3VtIGNoYW5nZWQgZnJvbSAzMDAgdG8gNDAwLidcbiAqIGBgYFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgT2JzZXJ2YWJsZU9iamVjdCBpbXBsZW1lbnRzIElPYnNlcnZhYmxlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX2ludGVybmFsXTogSW50ZXJuYWxQcm9wcztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdGVcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgc3RhdGUuIGRlZmF1bHQ6IFtbT2JzZXJ2YWJsZVN0YXRlLkFDVElWRV1dXG4gICAgICogIC0gYGphYCDliJ3mnJ/nirbmhYsg5pei5a6aOiBbW09ic2VydmFibGVTdGF0ZS5BQ1RJVkVdXVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHN0YXRlID0gT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBPYnNlcnZhYmxlT2JqZWN0LCB0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWw6IEludGVybmFsUHJvcHMgPSB7XG4gICAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICAgIGNoYW5nZWQ6IGZhbHNlLFxuICAgICAgICAgICAgY2hhbmdlTWFwOiBuZXcgTWFwKCksXG4gICAgICAgICAgICBicm9rZXI6IG5ldyBFdmVudEJyb2tlclByb3h5PHRoaXM+KCksXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBfaW50ZXJuYWwsIHsgdmFsdWU6IE9iamVjdC5zZWFsKGludGVybmFsKSB9KTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eSh0aGlzLCBfcHJveHlIYW5kbGVyKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJT2JzZXJ2YWJsZVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBwcm9wZXJ0eSBjaGFuZ2VzLlxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlpInmm7Tos7zoqq3oqK3lrpogKOWFqOODl+ODreODkeODhuOCo+ebo+imlilcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0eVxuICAgICAqICAtIGBlbmAgd2lsZCBjb3JkIHNpZ25hdHVyZS5cbiAgICAgKiAgLSBgamFgIOODr+OCpOODq+ODieOCq+ODvOODiVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIHByb3BlcnR5IGNoYW5nZS5cbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uKHByb3BlcnR5OiAnQCcsIGxpc3RlbmVyOiAoY29udGV4dDogT2JzZXJ2YWJsZU9iamVjdCkgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgcHJvcGVydHkgY2hhbmdlKHMpLlxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlpInmm7Tos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0eVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44OX44Ot44OR44OG44KjXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgcHJvcGVydHkgY2hhbmdlLlxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb248SyBleHRlbmRzIE9ic2VydmFibGVLZXlzPHRoaXM+Pihwcm9wZXJ0eTogSyB8IEtbXSwgbGlzdGVuZXI6IChuZXdWYWx1ZTogdGhpc1tLXSwgb2xkVmFsdWU6IHRoaXNbS10sIGtleTogSykgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbjtcblxuICAgIG9uPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk6IEsgfCBLW10sIGxpc3RlbmVyOiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCB7IGNoYW5nZU1hcCwgYnJva2VyIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGJyb2tlci5nZXQoKS5vbihwcm9wZXJ0eSwgbGlzdGVuZXIpO1xuICAgICAgICBpZiAoMCA8IGNoYW5nZU1hcC5zaXplKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wcyA9IGlzQXJyYXkocHJvcGVydHkpID8gcHJvcGVydHkgOiBbcHJvcGVydHldO1xuICAgICAgICAgICAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BzKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlTWFwLmhhcyhwcm9wKSB8fCBjaGFuZ2VNYXAuc2V0KHByb3AsIHRoaXNbcHJvcF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIHByb3BlcnR5IGNoYW5nZXMpXG4gICAgICogQGphIOODl+ODreODkeODhuOCo+WkieabtOizvOiqreino+mZpCAo5YWo44OX44Ot44OR44OG44Kj55uj6KaWKVxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnR5XG4gICAgICogIC0gYGVuYCB3aWxkIGNvcmQgc2lnbmF0dXJlLlxuICAgICAqICAtIGBqYWAg44Ov44Kk44Or44OJ44Kr44O844OJXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgcHJvcGVydHkgY2hhbmdlLlxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb2ZmKHByb3BlcnR5OiAnQCcsIGxpc3RlbmVyPzogKGNvbnRleHQ6IE9ic2VydmFibGVPYmplY3QpID0+IGFueSk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgcHJvcGVydHkgY2hhbmdlKHMpLlxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlpInmm7Tos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0eVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5LlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBldmVyeXRoaW5nIGlzIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44OX44Ot44OR44OG44KjXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/jgZnjgbnjgabop6PpmaRcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBwcm9wZXJ0eSBjaGFuZ2UuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lkIzkuIAgYGNoYW5uZWxgIOOBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIG9mZjxLIGV4dGVuZHMgT2JzZXJ2YWJsZUtleXM8dGhpcz4+KHByb3BlcnR5PzogSyB8IEtbXSwgbGlzdGVuZXI/OiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IHVua25vd24pOiB2b2lkO1xuXG4gICAgb2ZmPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk/OiBLIHwgS1tdLCBsaXN0ZW5lcj86IChuZXdWYWx1ZTogdGhpc1tLXSwgb2xkVmFsdWU6IHRoaXNbS10sIGtleTogSykgPT4gdW5rbm93bik6IHZvaWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uYnJva2VyLmdldCgpLm9mZihwcm9wZXJ0eSwgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdXNwZW5kIG9yIGRpc2FibGUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jgrXjgrnjg5rjg7Pjg4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub1JlY29yZFxuICAgICAqICAtIGBlbmAgYHRydWVgOiBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMgYW5kIGNsZWFyIGNoYW5nZXMuIC8gYGZhbHNlYDogcHJvcGVydHkgY2hhbmdlcyBhcmUgcmVjb3JkZWQgYW5kIGZpcmVkIHdoZW4gW1tyZXN1bWVdXSgpIGNhbGxkZWQuIChkZWZhdWx0KVxuICAgICAqICAtIGBqYWAgYHRydWVgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7TjgoLoqJjpjLLjgZvjgZosIOePvuWcqOOBruiomOmMsuOCguegtOajhCAvIGBmYWxzZWA6IOODl+ODreODkeODhuOCo+WkieabtOOBr+iomOmMsuOBleOCjCwgW1tyZXN1bWVdXSgpIOaZguOBq+eZuueBq+OBmeOCiyAo5pei5a6aKVxuICAgICAqL1xuICAgIHN1c3BlbmQobm9SZWNvcmQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uc3RhdGUgPSBub1JlY29yZCA/IE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA6IE9ic2VydmFibGVTdGF0ZS5TVVNFUE5ERUQ7XG4gICAgICAgIGlmIChub1JlY29yZCkge1xuICAgICAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmNoYW5nZU1hcC5jbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN1bWUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jg6rjgrjjg6Xjg7zjg6BcbiAgICAgKi9cbiAgICByZXN1bWUoKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIGludGVybmFsLnN0YXRlID0gT2JzZXJ2YWJsZVN0YXRlLkFDVElWRTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB0aGlzW19ub3RpZnlDaGFuZ2VzXSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gb2JzZXJ2YXRpb24gc3RhdGVcbiAgICAgKiBAamEg6LO86Kqt5Y+v6IO954q25oWLXG4gICAgICovXG4gICAgZ2V0T2JzZXJ2YWJsZVN0YXRlKCk6IE9ic2VydmFibGVTdGF0ZSB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzW19pbnRlcm5hbF0uc3RhdGU7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2Vzc1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIGdldEJyb2tlcigpOiBFdmVudEJyb2tlcjxOb25GdW5jdGlvblByb3BlcnRpZXM8dGhpcz4+IHtcbiAgICAgICAgY29uc3QgeyBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgcmV0dXJuIGJyb2tlci5nZXQoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBzdGF0aWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgW1tPYnNlcnZhYmxlT2JqZWN0XV0gZnJvbSBhbnkgb2JqZWN0LlxuICAgICAqIEBqYSDku7vmhI/jga7jgqrjg5bjgrjjgqfjgq/jg4jjgYvjgokgW1tPYnNlcnZhYmxlT2JqZWN0XV0g44KS55Sf5oiQXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNvbnN0IG9ic2VydmFibGUgPSBPYnNlcnZhYmxlT2JqZWN0LmZyb20oeyBhOiAxLCBiOiAxIH0pO1xuICAgICAqIGZ1bmN0aW9uIG9uTnVtQ2hhbmdlKG5ld1ZhbHVlOiBudW1iZXIsIG9sZFZhbHVlOiBudW1iZXIsIGtleTogc3RyaW5nKSB7XG4gICAgICogICBjb25zb2xlLmxvZyhgJHtrZXl9IGNoYW5nZWQgZnJvbSAke29sZFZhbHVlfSB0byAke25ld1ZhbHVlfS5gKTtcbiAgICAgKiB9XG4gICAgICogb2JzZXJ2YWJsZS5vbihbJ2EnLCAnYiddLCBvbk51bUNoYW5nZSk7XG4gICAgICpcbiAgICAgKiAvLyB1cGRhdGVcbiAgICAgKiBvYnNlcnZhYmxlLmEgPSAxMDA7XG4gICAgICogb2JzZXJ2YWJsZS5iID0gMjAwO1xuICAgICAqXG4gICAgICogLy8gY29uc29sZSBvdXQgZnJvbSBgYXN5bmNgIGV2ZW50IGxvb3AuXG4gICAgICogLy8gPT4gJ2EgY2hhbmdlZCBmcm9tIDEgdG8gMTAwLidcbiAgICAgKiAvLyA9PiAnYiBjaGFuZ2VkIGZyb20gMSB0byAyMDAuJ1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgb2JqZWN0PihzcmM6IFQpOiBPYnNlcnZhYmxlT2JqZWN0ICYgVCB7XG4gICAgICAgIGNvbnN0IG9ic2VydmFibGUgPSBkZWVwTWVyZ2UobmV3IGNsYXNzIGV4dGVuZHMgT2JzZXJ2YWJsZU9iamVjdCB7IH0oT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEKSwgc3JjKTtcbiAgICAgICAgb2JzZXJ2YWJsZS5yZXN1bWUoKTtcbiAgICAgICAgcmV0dXJuIG9ic2VydmFibGUgYXMgYW55O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByb3RlY3RlZCBtZWh0b2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEZvcmNlIG5vdGlmeSBwcm9wZXJ0eSBjaGFuZ2UocykgaW4gc3BpdGUgb2YgYWN0aXZlIHN0YXRlLlxuICAgICAqIEBqYSDjgqLjgq/jg4bjgqPjg5bnirbmhYvjgavjgYvjgYvjgo/jgonjgZrlvLfliLbnmoTjgavjg5fjg63jg5Hjg4bjgqPlpInmm7TpgJrnn6XjgpLnmbrooYxcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgbm90aWZ5KC4uLnByb3BlcnRpZXM6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGlmICgwID09PSBwcm9wZXJ0aWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHsgY2hhbmdlTWFwIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IGtleVZhbHVlID0gbmV3IE1hcDxQcm9wZXJ0eUtleSwgW2FueSwgYW55XT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgcHJvcGVydGllcykge1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSB0aGlzW2tleV07XG4gICAgICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IGNoYW5nZU1hcC5oYXMoa2V5KSA/IGNoYW5nZU1hcC5nZXQoa2V5KSA6IG5ld1ZhbHVlO1xuICAgICAgICAgICAga2V5VmFsdWUuc2V0KGtleSwgW25ld1ZhbHVlLCBvbGRWYWx1ZV0pO1xuICAgICAgICB9XG4gICAgICAgIDAgPCBrZXlWYWx1ZS5zaXplICYmIHRoaXNbX25vdGlmeV0oa2V5VmFsdWUpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWVodG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfc3RvY2tDaGFuZ2VdKHA6IHN0cmluZywgb2xkVmFsdWU6IGFueSk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCBjaGFuZ2VNYXAsIGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uY2hhbmdlZCA9IHRydWU7XG4gICAgICAgIGlmICgwID09PSBjaGFuZ2VNYXAuc2l6ZSkge1xuICAgICAgICAgICAgY2hhbmdlTWFwLnNldChwLCBvbGRWYWx1ZSk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGsgb2YgYnJva2VyLmdldCgpLmNoYW5uZWxzKCkpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VNYXAuaGFzKGspIHx8IGNoYW5nZU1hcC5zZXQoaywgdGhpc1trXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSA9PT0gc3RhdGUpIHtcbiAgICAgICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4gdGhpc1tfbm90aWZ5Q2hhbmdlc10oKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjaGFuZ2VNYXAuaGFzKHApIHx8IGNoYW5nZU1hcC5zZXQocCwgb2xkVmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19ub3RpZnlDaGFuZ2VzXSgpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZSwgY2hhbmdlTWFwIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFICE9PSBzdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGtleVZhbHVlUGFpcnMgPSBuZXcgTWFwPFByb3BlcnR5S2V5LCBbYW55LCBhbnldPigpO1xuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIG9sZFZhbHVlXSBvZiBjaGFuZ2VNYXApIHtcbiAgICAgICAgICAgIGNvbnN0IGN1clZhbHVlID0gdGhpc1trZXldO1xuICAgICAgICAgICAgaWYgKCFkZWVwRXF1YWwob2xkVmFsdWUsIGN1clZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGtleVZhbHVlUGFpcnMuc2V0KGtleSwgW2N1clZhbHVlLCBvbGRWYWx1ZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXNbX25vdGlmeV0oa2V5VmFsdWVQYWlycyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19ub3RpZnldKGtleVZhbHVlOiBNYXA8UHJvcGVydHlLZXksIFthbnksIGFueV0+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgY2hhbmdlZCwgY2hhbmdlTWFwLCBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY2hhbmdlTWFwLmNsZWFyKCk7XG4gICAgICAgIHRoaXNbX2ludGVybmFsXS5jaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGV2ZW50QnJva2VyID0gYnJva2VyLmdldCgpO1xuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlc10gb2Yga2V5VmFsdWUpIHtcbiAgICAgICAgICAgIChldmVudEJyb2tlciBhcyBhbnkpLnRyaWdnZXIoa2V5LCAuLi52YWx1ZXMsIGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoYW5nZWQpIHtcbiAgICAgICAgICAgIGV2ZW50QnJva2VyLnRyaWdnZXIoJ0AnLCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgcHJlZmVyLXJlc3QtcGFyYW1zXG4gKi9cblxuaW1wb3J0IHtcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgV3JpdGFibGUsXG4gICAgaXNOdW1iZXIsXG4gICAgdmVyaWZ5LFxuICAgIHBvc3QsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24sIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBFdmVudEJyb2tlclByb3h5LFxuICAgIF9pbnRlcm5hbCxcbiAgICBfbm90aWZ5LFxuICAgIF9zdG9ja0NoYW5nZSxcbiAgICBfbm90aWZ5Q2hhbmdlcyxcbiAgICB2ZXJpZnlPYnNlcnZhYmxlLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IE9ic2VydmFibGVTdGF0ZSwgSU9ic2VydmFibGUgfSBmcm9tICcuL2NvbW1vbic7XG5cbi8qKlxuICogQGVuIEFycmF5IGNoYW5nZSB0eXBlIGluZm9ybWF0aW9uLiA8YnI+XG4gKiAgICAgVGhlIHZhbHVlIGlzIHN1aXRhYmxlIGZvciB0aGUgbnVtYmVyIG9mIGZsdWN0dWF0aW9uIG9mIHRoZSBlbGVtZW50LlxuICogQGphIOmFjeWIl+WkieabtOmAmuefpeOBruOCv+OCpOODlyA8YnI+XG4gKiAgICAg5YCk44Gv6KaB57Sg44Gu5aKX5rib5pWw44Gr55u45b2TXG4gKlxuICovXG5leHBvcnQgY29uc3QgZW51bSBBcnJheUNoYW5nZVR5cGUge1xuICAgIFJFTU9WRSA9IC0xLFxuICAgIFVQREFURSA9IDAsXG4gICAgSU5TRVJUID0gMSxcbn1cblxuLyoqXG4gKiBAZW4gQXJyYXkgY2hhbmdlIHJlY29yZCBpbmZvcm1hdGlvbi5cbiAqIEBqYSDphY3liJflpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcnJheUNoYW5nZVJlY29yZDxUPiB7XG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBjaGFuZ2UgdHlwZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAamEg6YWN5YiX5aSJ5pu05oOF5aCx44Gu6K2Y5Yil5a2QXG4gICAgICovXG4gICAgcmVhZG9ubHkgdHlwZTogQXJyYXlDaGFuZ2VUeXBlO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBjaGFuZ2UgdHlwZSBpbmZvcm1hdGlvbi4gPGJyPlxuICAgICAqICAgICDigLsgW0F0dGVudGlvbl0gVGhlIGluZGV4IHdpbGwgYmUgZGlmZmVyZW50IGZyb20gdGhlIGFjdHVhbCBsb2NhdGlvbiB3aGVuIGFycmF5IHNpemUgY2hhbmdlZCBiZWNhdXNlIHRoYXQgZGV0ZXJtaW5lcyBlbGVtZW50IG9wZXJhdGlvbiB1bml0LlxuICAgICAqIEBqYSDlpInmm7TjgYznmbrnlJ/jgZfjgZ/phY3liJflhoXjga7kvY3nva7jga4gaW5kZXggPGJyPlxuICAgICAqICAgICDigLsgW+azqOaEj10g44Kq44Oa44Os44O844K344On44Oz5Y2Y5L2N44GuIGluZGV4IOOBqOOBquOCiiwg6KaB57Sg44GM5aKX5rib44GZ44KL5aC05ZCI44Gv5a6f6Zqb44Gu5L2N572u44Go55Ww44Gq44KL44GT44Go44GM44GC44KLXG4gICAgICovXG4gICAgcmVhZG9ubHkgaW5kZXg6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBOZXcgZWxlbWVudCdzIHZhbHVlLlxuICAgICAqIEBqYSDopoHntKDjga7mlrDjgZfjgYTlgKRcbiAgICAgKi9cbiAgICByZWFkb25seSBuZXdWYWx1ZT86IFQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gT2xkIGVsZW1lbnQncyB2YWx1ZS5cbiAgICAgKiBAamEg6KaB57Sg44Gu5Y+k44GE5YCkXG4gICAgICovXG4gICAgcmVhZG9ubHkgb2xkVmFsdWU/OiBUO1xufVxudHlwZSBNdXRhYmxlQ2hhbmdlUmVjb3JkPFQ+ID0gV3JpdGFibGU8QXJyYXlDaGFuZ2VSZWNvcmQ8VD4+O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIElBcnJheUNoYW5nZUV2ZW50PFQ+IHtcbiAgICAnQCc6IFtBcnJheUNoYW5nZVJlY29yZDxUPltdXTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEludGVybmFsUHJvcHM8VCA9IHVua25vd24+IHtcbiAgICBzdGF0ZTogT2JzZXJ2YWJsZVN0YXRlO1xuICAgIGJ5TWV0aG9kOiBib29sZWFuO1xuICAgIHJlY29yZHM6IE11dGFibGVDaGFuZ2VSZWNvcmQ8VD5bXTtcbiAgICByZWFkb25seSBpbmRleGVzOiBTZXQ8bnVtYmVyPjtcbiAgICByZWFkb25seSBicm9rZXI6IEV2ZW50QnJva2VyUHJveHk8SUFycmF5Q2hhbmdlRXZlbnQ8VD4+O1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcHJveHlIYW5kbGVyOiBQcm94eUhhbmRsZXI8T2JzZXJ2YWJsZUFycmF5PiA9IHtcbiAgICBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHAsIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0YXJnZXRbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA9PT0gaW50ZXJuYWwuc3RhdGUgfHwgaW50ZXJuYWwuYnlNZXRob2QgfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhdHRyaWJ1dGVzLCAndmFsdWUnKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtwXTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBhdHRyaWJ1dGVzLnZhbHVlO1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZXFlcWVxXG4gICAgICAgIGlmICgnbGVuZ3RoJyA9PT0gcCAmJiBuZXdWYWx1ZSAhPSBvbGRWYWx1ZSkgeyAvLyBEbyBOT1QgdXNlIHN0cmljdCBpbmVxdWFsaXR5ICghPT0pXG4gICAgICAgICAgICBjb25zdCBvbGRMZW5ndGggPSBvbGRWYWx1ZSA+Pj4gMDtcbiAgICAgICAgICAgIGNvbnN0IG5ld0xlbmd0aCA9IG5ld1ZhbHVlID4+PiAwO1xuICAgICAgICAgICAgY29uc3Qgc3RvY2sgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyYXAgPSBuZXdMZW5ndGggPCBvbGRMZW5ndGggJiYgdGFyZ2V0LnNsaWNlKG5ld0xlbmd0aCk7XG4gICAgICAgICAgICAgICAgaWYgKHNjcmFwKSB7IC8vIG5ld0xlbmd0aCA8IG9sZExlbmd0aFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gb2xkTGVuZ3RoOyAtLWkgPj0gbmV3TGVuZ3RoOykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRSwgaSwgdW5kZWZpbmVkLCBzY3JhcFtpIC0gbmV3TGVuZ3RoXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgIC8vIG9sZExlbmd0aCA8IG5ld0xlbmd0aFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gb2xkTGVuZ3RoOyBpIDwgbmV3TGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFtfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGkgLyosIHVuZGVmaW5lZCwgdW5kZWZpbmVkICovKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcyk7XG4gICAgICAgICAgICByZXN1bHQgJiYgc3RvY2soKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSBpZiAobmV3VmFsdWUgIT09IG9sZFZhbHVlICYmIGlzVmFsaWRBcnJheUluZGV4KHApKSB7XG4gICAgICAgICAgICBjb25zdCBpID0gcCBhcyB1bmtub3duIGFzIG51bWJlciA+Pj4gMDtcbiAgICAgICAgICAgIGNvbnN0IHR5cGU6IEFycmF5Q2hhbmdlVHlwZSA9IE51bWJlcihpID49IHRhcmdldC5sZW5ndGgpOyAvLyBJTlNFUlQgb3IgVVBEQVRFXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcyk7XG4gICAgICAgICAgICByZXN1bHQgJiYgdGFyZ2V0W19zdG9ja0NoYW5nZV0odHlwZSwgaSwgbmV3VmFsdWUsIG9sZFZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHAsIGF0dHJpYnV0ZXMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBkZWxldGVQcm9wZXJ0eSh0YXJnZXQsIHApIHtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0YXJnZXRbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA9PT0gaW50ZXJuYWwuc3RhdGUgfHwgaW50ZXJuYWwuYnlNZXRob2QgfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0YXJnZXQsIHApKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWxldGVQcm9wZXJ0eSh0YXJnZXQsIHApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0W3BdO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBSZWZsZWN0LmRlbGV0ZVByb3BlcnR5KHRhcmdldCwgcCk7XG4gICAgICAgIHJlc3VsdCAmJiBpc1ZhbGlkQXJyYXlJbmRleChwKSAmJiB0YXJnZXRbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuVVBEQVRFLCBwIGFzIHVua25vd24gYXMgbnVtYmVyID4+PiAwLCB1bmRlZmluZWQsIG9sZFZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxufTtcbk9iamVjdC5mcmVlemUoX3Byb3h5SGFuZGxlcik7XG5cbi8qKiBAaW50ZXJuYWwgdmFsaWQgYXJyYXkgaW5kZXggaGVscGVyICovXG5mdW5jdGlvbiBpc1ZhbGlkQXJyYXlJbmRleDxUPihpbmRleDogVCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHMgPSBTdHJpbmcoaW5kZXgpO1xuICAgIGNvbnN0IG4gPSBNYXRoLnRydW5jKHMgYXMgdW5rbm93biBhcyBudW1iZXIpO1xuICAgIHJldHVybiBTdHJpbmcobikgPT09IHMgJiYgMCA8PSBuICYmIG4gPCAweEZGRkZGRkZGO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgaW5kZXggbWFuYWdlbWVudCAqL1xuZnVuY3Rpb24gZmluZFJlbGF0ZWRDaGFuZ2VJbmRleDxUPihyZWNvcmRzOiBNdXRhYmxlQ2hhbmdlUmVjb3JkPFQ+W10sIHR5cGU6IEFycmF5Q2hhbmdlVHlwZSwgaW5kZXg6IG51bWJlcik6IG51bWJlciB7XG4gICAgY29uc3QgY2hlY2tUeXBlID0gdHlwZSA9PT0gQXJyYXlDaGFuZ2VUeXBlLklOU0VSVFxuICAgICAgICA/ICh0OiBBcnJheUNoYW5nZVR5cGUpID0+IHQgPT09IEFycmF5Q2hhbmdlVHlwZS5SRU1PVkVcbiAgICAgICAgOiAodDogQXJyYXlDaGFuZ2VUeXBlKSA9PiB0ICE9PSBBcnJheUNoYW5nZVR5cGUuUkVNT1ZFXG4gICAgICAgIDtcblxuICAgIGZvciAobGV0IGkgPSByZWNvcmRzLmxlbmd0aDsgLS1pID49IDA7KSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gcmVjb3Jkc1tpXTtcbiAgICAgICAgaWYgKHZhbHVlLmluZGV4ID09PSBpbmRleCAmJiBjaGVja1R5cGUodmFsdWUudHlwZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9IGVsc2UgaWYgKHZhbHVlLmluZGV4IDwgaW5kZXggJiYgQm9vbGVhbih2YWx1ZS50eXBlKSkgeyAvLyBSRU1PVkUgb3IgSU5TRVJUXG4gICAgICAgICAgICBpbmRleCAtPSB2YWx1ZS50eXBlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSBhcnJheSBjbGFzcyB3aGljaCBjaGFuZ2UgY2FuIGJlIG9ic2VydmVkLlxuICogQGphIOWkieabtOebo+imluWPr+iDveOBqumFjeWIl+OCr+ODqeOCuVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiAtIEJhc2ljIFVzYWdlXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IG9ic0FycmF5ID0gT2JzZXJ2YWJsZUFycmF5LmZyb20oWydhJywgJ2InLCAnYyddKTtcbiAqXG4gKiBmdW5jdGlvbiBvbkNoYW5nZUFycmF5KHJlY29yZHM6IEFycmF5Q2hhbmdlUmVjb3JkW10pIHtcbiAqICAgY29uc29sZS5sb2cocmVjb3Jkcyk7XG4gKiAgIC8vICBbXG4gKiAgIC8vICAgIHsgdHlwZTogMSwgaW5kZXg6IDMsIG5ld1ZhbHVlOiAneCcsIG9sZFZhbHVlOiB1bmRlZmluZWQgfSxcbiAqICAgLy8gICAgeyB0eXBlOiAxLCBpbmRleDogNCwgbmV3VmFsdWU6ICd5Jywgb2xkVmFsdWU6IHVuZGVmaW5lZCB9LFxuICogICAvLyAgICB7IHR5cGU6IDEsIGluZGV4OiA1LCBuZXdWYWx1ZTogJ3onLCBvbGRWYWx1ZTogdW5kZWZpbmVkIH1cbiAqICAgLy8gIF1cbiAqIH1cbiAqIG9ic0FycmF5Lm9uKG9uQ2hhbmdlQXJyYXkpO1xuICpcbiAqIGZ1bmN0aW9uIGFkZFhZWigpIHtcbiAqICAgb2JzQXJyYXkucHVzaCgneCcsICd5JywgJ3onKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgT2JzZXJ2YWJsZUFycmF5PFQgPSB1bmtub3duPiBleHRlbmRzIEFycmF5PFQ+IGltcGxlbWVudHMgSU9ic2VydmFibGUge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfaW50ZXJuYWxdOiBJbnRlcm5hbFByb3BzPFQ+O1xuXG4gICAgLyoqIEBmaW5hbCBjb25zdHJ1Y3RvciAqL1xuICAgIHByaXZhdGUgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKC4uLmFyZ3VtZW50cyk7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIE9ic2VydmFibGVBcnJheSwgdGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsOiBJbnRlcm5hbFByb3BzPFQ+ID0ge1xuICAgICAgICAgICAgc3RhdGU6IE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUsXG4gICAgICAgICAgICBieU1ldGhvZDogZmFsc2UsXG4gICAgICAgICAgICByZWNvcmRzOiBbXSxcbiAgICAgICAgICAgIGluZGV4ZXM6IG5ldyBTZXQoKSxcbiAgICAgICAgICAgIGJyb2tlcjogbmV3IEV2ZW50QnJva2VyUHJveHk8SUFycmF5Q2hhbmdlRXZlbnQ8VD4+KCksXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBfaW50ZXJuYWwsIHsgdmFsdWU6IE9iamVjdC5zZWFsKGludGVybmFsKSB9KTtcbiAgICAgICAgY29uc3QgYXJnTGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgaWYgKDEgPT09IGFyZ0xlbmd0aCAmJiBpc051bWJlcihhcmd1bWVudHNbMF0pKSB7XG4gICAgICAgICAgICBjb25zdCBsZW4gPSBhcmd1bWVudHNbMF0gPj4+IDA7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGkgLyosIHVuZGVmaW5lZCAqLyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoMCA8IGFyZ0xlbmd0aCkge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmdMZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuSU5TRVJULCBpLCBhcmd1bWVudHNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJveHkodGhpcywgX3Byb3h5SGFuZGxlcikgYXMgT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElPYnNlcnZhYmxlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGFycmF5IGNoYW5nZShzKS5cbiAgICAgKiBAamEg6YWN5YiX5aSJ5pu06LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBhcnJheSBjaGFuZ2UuXG4gICAgICogIC0gYGphYCDphY3liJflpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbihsaXN0ZW5lcjogKHJlY29yZHM6IEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpc1tfaW50ZXJuYWxdLmJyb2tlci5nZXQoKS5vbignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgYXJyYXkgY2hhbmdlKHMpLlxuICAgICAqIEBqYSDphY3liJflpInmm7Tos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGFycmF5IGNoYW5nZS5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgYWxsIHNhbWUgYGNoYW5uZWxgIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDphY3liJflpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WQjOS4gCBgY2hhbm5lbGAg44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmKGxpc3RlbmVyPzogKHJlY29yZHM6IEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10pID0+IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmJyb2tlci5nZXQoKS5vZmYoJ0AnLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1c3BlbmQgb3IgZGlzYWJsZSB0aGUgZXZlbnQgb2JzZXJ2YXRpb24gc3RhdGUuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreeKtuaFi+OBruOCteOCueODmuODs+ODiVxuICAgICAqXG4gICAgICogQHBhcmFtIG5vUmVjb3JkXG4gICAgICogIC0gYGVuYCBgdHJ1ZWA6IG5vdCByZWNvcmRpbmcgcHJvcGVydHkgY2hhbmdlcyBhbmQgY2xlYXIgY2hhbmdlcy4gLyBgZmFsc2VgOiBwcm9wZXJ0eSBjaGFuZ2VzIGFyZSByZWNvcmRlZCBhbmQgZmlyZWQgd2hlbiBbW3Jlc3VtZV1dKCkgY2FsbGRlZC4gKGRlZmF1bHQpXG4gICAgICogIC0gYGphYCBgdHJ1ZWA6IOODl+ODreODkeODhuOCo+WkieabtOOCguiomOmMsuOBm+OBmiwg54++5Zyo44Gu6KiY6Yyy44KC56C05qOEIC8gYGZhbHNlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044Gv6KiY6Yyy44GV44KMLCBbW3Jlc3VtZV1dKCkg5pmC44Gr55m654Gr44GZ44KLICjml6LlrpopXG4gICAgICovXG4gICAgc3VzcGVuZChub1JlY29yZCA9IGZhbHNlKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHRoaXNbX2ludGVybmFsXS5zdGF0ZSA9IG5vUmVjb3JkID8gT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEIDogT2JzZXJ2YWJsZVN0YXRlLlNVU0VQTkRFRDtcbiAgICAgICAgaWYgKG5vUmVjb3JkKSB7XG4gICAgICAgICAgICB0aGlzW19pbnRlcm5hbF0ucmVjb3JkcyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN1bWUgb2YgdGhlIGV2ZW50IHN1YnNjcmlwdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44Oq44K444Ol44O844OgXG4gICAgICovXG4gICAgcmVzdW1lKCk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgIT09IGludGVybmFsLnN0YXRlKSB7XG4gICAgICAgICAgICBpbnRlcm5hbC5zdGF0ZSA9IE9ic2VydmFibGVTdGF0ZS5BQ1RJVkU7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4gdGhpc1tfbm90aWZ5Q2hhbmdlc10oKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIG9ic2VydmF0aW9uIHN0YXRlXG4gICAgICogQGphIOizvOiqreWPr+iDveeKtuaFi1xuICAgICAqL1xuICAgIGdldE9ic2VydmFibGVTdGF0ZSgpOiBPYnNlcnZhYmxlU3RhdGUge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpc1tfaW50ZXJuYWxdLnN0YXRlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG92ZXJyaWRlOiBBcnJheSBtZXRob2RzXG5cbiAgICAvKipcbiAgICAgKiBTb3J0cyBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0gY29tcGFyZUZuIFRoZSBuYW1lIG9mIHRoZSBmdW5jdGlvbiB1c2VkIHRvIGRldGVybWluZSB0aGUgb3JkZXIgb2YgdGhlIGVsZW1lbnRzLiBJZiBvbWl0dGVkLCB0aGUgZWxlbWVudHMgYXJlIHNvcnRlZCBpbiBhc2NlbmRpbmcsIEFTQ0lJIGNoYXJhY3RlciBvcmRlci5cbiAgICAgKi9cbiAgICBzb3J0KGNvbXBhcmF0b3I/OiAobGhzOiBULCByaHM6IFQpID0+IG51bWJlcik6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY29uc3Qgb2xkID0gQXJyYXkuZnJvbSh0aGlzKTtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSB0cnVlO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzdXBlci5zb3J0KGNvbXBhcmF0b3IpO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IGZhbHNlO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgbGVuID0gb2xkLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IG9sZFtpXTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IHRoaXNbaV07XG4gICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlICE9PSBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlVQREFURSwgaSwgbmV3VmFsdWUsIG9sZFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGVsZW1lbnRzIGZyb20gYW4gYXJyYXkgYW5kLCBpZiBuZWNlc3NhcnksIGluc2VydHMgbmV3IGVsZW1lbnRzIGluIHRoZWlyIHBsYWNlLCByZXR1cm5pbmcgdGhlIGRlbGV0ZWQgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIHN0YXJ0IFRoZSB6ZXJvLWJhc2VkIGxvY2F0aW9uIGluIHRoZSBhcnJheSBmcm9tIHdoaWNoIHRvIHN0YXJ0IHJlbW92aW5nIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSBkZWxldGVDb3VudCBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHJlbW92ZS5cbiAgICAgKi9cbiAgICBzcGxpY2Uoc3RhcnQ6IG51bWJlciwgZGVsZXRlQ291bnQ/OiBudW1iZXIpOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBlbGVtZW50cyBmcm9tIGFuIGFycmF5IGFuZCwgaWYgbmVjZXNzYXJ5LCBpbnNlcnRzIG5ldyBlbGVtZW50cyBpbiB0aGVpciBwbGFjZSwgcmV0dXJuaW5nIHRoZSBkZWxldGVkIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSBzdGFydCBUaGUgemVyby1iYXNlZCBsb2NhdGlvbiBpbiB0aGUgYXJyYXkgZnJvbSB3aGljaCB0byBzdGFydCByZW1vdmluZyBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gZGVsZXRlQ291bnQgVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZW1vdmUuXG4gICAgICogQHBhcmFtIGl0ZW1zIEVsZW1lbnRzIHRvIGluc2VydCBpbnRvIHRoZSBhcnJheSBpbiBwbGFjZSBvZiB0aGUgZGVsZXRlZCBlbGVtZW50cy5cbiAgICAgKi9cbiAgICBzcGxpY2Uoc3RhcnQ6IG51bWJlciwgZGVsZXRlQ291bnQ6IG51bWJlciwgLi4uaXRlbXM6IFRbXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICBzcGxpY2Uoc3RhcnQ6IG51bWJlciwgZGVsZXRlQ291bnQ/OiBudW1iZXIsIC4uLml0ZW1zOiBUW10pOiBPYnNlcnZhYmxlQXJyYXk8VD4ge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY29uc3Qgb2xkTGVuID0gdGhpcy5sZW5ndGg7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gKHN1cGVyLnNwbGljZSBhcyBVbmtub3duRnVuY3Rpb24pKC4uLmFyZ3VtZW50cykgYXMgT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IGZhbHNlO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgc3RhcnQgPSBNYXRoLnRydW5jKHN0YXJ0KTtcbiAgICAgICAgICAgIGNvbnN0IGZyb20gPSBzdGFydCA8IDAgPyBNYXRoLm1heChvbGRMZW4gKyBzdGFydCwgMCkgOiBNYXRoLm1pbihzdGFydCwgb2xkTGVuKTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSByZXN1bHQubGVuZ3RoOyAtLWkgPj0gMDspIHtcbiAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRSwgZnJvbSArIGksIHVuZGVmaW5lZCwgcmVzdWx0W2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGxlbiA9IGl0ZW1zLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLklOU0VSVCwgZnJvbSArIGksIGl0ZW1zW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgdGhlIGZpcnN0IGVsZW1lbnQgZnJvbSBhbiBhcnJheSBhbmQgcmV0dXJucyBpdC5cbiAgICAgKi9cbiAgICBzaGlmdCgpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IG9sZExlbiA9IHRoaXMubGVuZ3RoO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLnNoaWZ0KCk7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gZmFsc2U7XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IGludGVybmFsLnN0YXRlICYmIHRoaXMubGVuZ3RoIDwgb2xkTGVuKSB7XG4gICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRSwgMCwgdW5kZWZpbmVkLCByZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5zZXJ0cyBuZXcgZWxlbWVudHMgYXQgdGhlIHN0YXJ0IG9mIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSBpdGVtcyAgRWxlbWVudHMgdG8gaW5zZXJ0IGF0IHRoZSBzdGFydCBvZiB0aGUgQXJyYXkuXG4gICAgICovXG4gICAgdW5zaGlmdCguLi5pdGVtczogVFtdKTogbnVtYmVyIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc3VwZXIudW5zaGlmdCguLi5pdGVtcyk7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gZmFsc2U7XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IGludGVybmFsLnN0YXRlKSB7XG4gICAgICAgICAgICBjb25zdCBsZW4gPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGksIGl0ZW1zW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxzIGEgZGVmaW5lZCBjYWxsYmFjayBmdW5jdGlvbiBvbiBlYWNoIGVsZW1lbnQgb2YgYW4gYXJyYXksIGFuZCByZXR1cm5zIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHJlc3VsdHMuXG4gICAgICogQHBhcmFtIGNhbGxiYWNrZm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdXAgdG8gdGhyZWUgYXJndW1lbnRzLiBUaGUgbWFwIG1ldGhvZCBjYWxscyB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbiBvbmUgdGltZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBBbiBvYmplY3QgdG8gd2hpY2ggdGhlIHRoaXMga2V5d29yZCBjYW4gcmVmZXIgaW4gdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24uIElmIHRoaXNBcmcgaXMgb21pdHRlZCwgdW5kZWZpbmVkIGlzIHVzZWQgYXMgdGhlIHRoaXMgdmFsdWUuXG4gICAgICovXG4gICAgbWFwPFU+KGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSwgdGhpc0FyZz86IHVua25vd24pOiBPYnNlcnZhYmxlQXJyYXk8VT4ge1xuICAgICAgICAvKlxuICAgICAgICAgKiBbTk9URV0gb3JpZ2luYWwgaW1wbGVtZW50IGlzIHZlcnkgdmVyeSBoaWdoLWNvc3QuXG4gICAgICAgICAqICAgICAgICBzbyBpdCdzIGNvbnZlcnRlZCBuYXRpdmUgQXJyYXkgb25jZSwgYW5kIHJlc3RvcmVkLlxuICAgICAgICAgKlxuICAgICAgICAgKiByZXR1cm4gKHN1cGVyLm1hcCBhcyBVbmtub3duRnVuY3Rpb24pKC4uLmFyZ3VtZW50cyk7XG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gT2JzZXJ2YWJsZUFycmF5LmZyb20oWy4uLnRoaXNdLm1hcChjYWxsYmFja2ZuLCB0aGlzQXJnKSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2Vzc1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIGdldEJyb2tlcigpOiBFdmVudEJyb2tlcjxJQXJyYXlDaGFuZ2VFdmVudDxUPj4ge1xuICAgICAgICBjb25zdCB7IGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICByZXR1cm4gYnJva2VyLmdldCgpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWVodG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfc3RvY2tDaGFuZ2VdKHR5cGU6IEFycmF5Q2hhbmdlVHlwZSwgaW5kZXg6IG51bWJlciwgbmV3VmFsdWU/OiBULCBvbGRWYWx1ZT86IFQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZSwgaW5kZXhlcywgcmVjb3JkcyB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCByY2kgPSBpbmRleGVzLmhhcyhpbmRleCkgPyBmaW5kUmVsYXRlZENoYW5nZUluZGV4KHJlY29yZHMsIHR5cGUsIGluZGV4KSA6IC0xO1xuICAgICAgICBjb25zdCBsZW4gPSByZWNvcmRzLmxlbmd0aDtcbiAgICAgICAgaWYgKHJjaSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCByY3QgPSByZWNvcmRzW3JjaV0udHlwZTtcbiAgICAgICAgICAgIGlmICghcmN0IC8qIFVQREFURSAqLykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZSZWNvcmQgPSByZWNvcmRzLnNwbGljZShyY2ksIDEpWzBdO1xuICAgICAgICAgICAgICAgIC8vIFVQREFURSA9PiBVUERBVEUgOiBVUERBVEVcbiAgICAgICAgICAgICAgICAvLyBVUERBVEUgPT4gUkVNT1ZFIDogSU5TRVJUXG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKHR5cGUsIGluZGV4LCBuZXdWYWx1ZSwgcHJldlJlY29yZC5vbGRWYWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IHIsIGkgPSBsZW47IC0taSA+IHJjaTspIHtcbiAgICAgICAgICAgICAgICAgICAgciA9IHJlY29yZHNbaV07XG4gICAgICAgICAgICAgICAgICAgIChyLmluZGV4ID49IGluZGV4KSAmJiAoci5pbmRleCAtPSByY3QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBwcmV2UmVjb3JkID0gcmVjb3Jkcy5zcGxpY2UocmNpLCAxKVswXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZSAhPT0gQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJTlNFUlQgPT4gVVBEQVRFIDogSU5TRVJUXG4gICAgICAgICAgICAgICAgICAgIC8vIFJFTU9WRSA9PiBJTlNFUlQgOiBVUERBVEVcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKE51bWJlcighdHlwZSksIGluZGV4LCBuZXdWYWx1ZSwgcHJldlJlY29yZC5vbGRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGluZGV4ZXMuYWRkKGluZGV4KTtcbiAgICAgICAgcmVjb3Jkc1tsZW5dID0geyB0eXBlLCBpbmRleCwgbmV3VmFsdWUsIG9sZFZhbHVlIH07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFID09PSBzdGF0ZSAmJiAwID09PSBsZW4pIHtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB0aGlzW19ub3RpZnlDaGFuZ2VzXSgpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfbm90aWZ5Q2hhbmdlc10oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgc3RhdGUsIHJlY29yZHMgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgIT09IHN0YXRlIHx8IDAgPT09IHJlY29yZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCByIG9mIHJlY29yZHMpIHtcbiAgICAgICAgICAgIE9iamVjdC5mcmVlemUocik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpc1tfbm90aWZ5XShPYmplY3QuZnJlZXplKHJlY29yZHMpIGFzIEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10pO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0ucmVjb3JkcyA9IFtdO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfbm90aWZ5XShyZWNvcmRzOiBBcnJheUNoYW5nZVJlY29yZDxUPltdKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpbnRlcm5hbC5pbmRleGVzLmNsZWFyKCk7XG4gICAgICAgIGludGVybmFsLmJyb2tlci5nZXQoKS50cmlnZ2VyKCdAJywgcmVjb3Jkcyk7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBPdmVycmlkZSByZXR1cm4gdHlwZSBvZiBwcm90b3R5cGUgbWV0aG9kc1xuICovXG5leHBvcnQgaW50ZXJmYWNlIE9ic2VydmFibGVBcnJheTxUPiB7XG4gICAgLyoqXG4gICAgICogQ29tYmluZXMgdHdvIG9yIG1vcmUgYXJyYXlzLlxuICAgICAqIEBwYXJhbSBpdGVtcyBBZGRpdGlvbmFsIGl0ZW1zIHRvIGFkZCB0byB0aGUgZW5kIG9mIGFycmF5MS5cbiAgICAgKi9cbiAgICBjb25jYXQoLi4uaXRlbXM6IFRbXVtdKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIC8qKlxuICAgICAqIENvbWJpbmVzIHR3byBvciBtb3JlIGFycmF5cy5cbiAgICAgKiBAcGFyYW0gaXRlbXMgQWRkaXRpb25hbCBpdGVtcyB0byBhZGQgdG8gdGhlIGVuZCBvZiBhcnJheTEuXG4gICAgICovXG4gICAgY29uY2F0KC4uLml0ZW1zOiAoVCB8IFRbXSlbXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBSZXZlcnNlcyB0aGUgZWxlbWVudHMgaW4gYW4gQXJyYXkuXG4gICAgICovXG4gICAgcmV2ZXJzZSgpOiB0aGlzO1xuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBzZWN0aW9uIG9mIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSBzdGFydCBUaGUgYmVnaW5uaW5nIG9mIHRoZSBzcGVjaWZpZWQgcG9ydGlvbiBvZiB0aGUgYXJyYXkuXG4gICAgICogQHBhcmFtIGVuZCBUaGUgZW5kIG9mIHRoZSBzcGVjaWZpZWQgcG9ydGlvbiBvZiB0aGUgYXJyYXkuXG4gICAgICovXG4gICAgc2xpY2Uoc3RhcnQ/OiBudW1iZXIsIGVuZD86IG51bWJlcik6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBlbGVtZW50cyBvZiBhbiBhcnJheSB0aGF0IG1lZXQgdGhlIGNvbmRpdGlvbiBzcGVjaWZpZWQgaW4gYSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tmbiBBIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyB1cCB0byB0aHJlZSBhcmd1bWVudHMuIFRoZSBmaWx0ZXIgbWV0aG9kIGNhbGxzIHRoZSBjYWxsYmFja2ZuIGZ1bmN0aW9uIG9uZSB0aW1lIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIGFycmF5LlxuICAgICAqIEBwYXJhbSB0aGlzQXJnIEFuIG9iamVjdCB0byB3aGljaCB0aGUgdGhpcyBrZXl3b3JkIGNhbiByZWZlciBpbiB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbi4gSWYgdGhpc0FyZyBpcyBvbWl0dGVkLCB1bmRlZmluZWQgaXMgdXNlZCBhcyB0aGUgdGhpcyB2YWx1ZS5cbiAgICAgKi9cbiAgICBmaWx0ZXI8UyBleHRlbmRzIFQ+KGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdmFsdWUgaXMgUywgdGhpc0FyZz86IHVua25vd24pOiBPYnNlcnZhYmxlQXJyYXk8Uz47XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZWxlbWVudHMgb2YgYW4gYXJyYXkgdGhhdCBtZWV0IHRoZSBjb25kaXRpb24gc3BlY2lmaWVkIGluIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIGNhbGxiYWNrZm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdXAgdG8gdGhyZWUgYXJndW1lbnRzLiBUaGUgZmlsdGVyIG1ldGhvZCBjYWxscyB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbiBvbmUgdGltZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBBbiBvYmplY3QgdG8gd2hpY2ggdGhlIHRoaXMga2V5d29yZCBjYW4gcmVmZXIgaW4gdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24uIElmIHRoaXNBcmcgaXMgb21pdHRlZCwgdW5kZWZpbmVkIGlzIHVzZWQgYXMgdGhlIHRoaXMgdmFsdWUuXG4gICAgICovXG4gICAgZmlsdGVyKGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdW5rbm93biwgdGhpc0FyZz86IHVua25vd24pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG59XG5cbi8qKlxuICogT3ZlcnJpZGUgcmV0dXJuIHR5cGUgb2Ygc3RhdGljIG1ldGhvZHNcbiAqL1xuZXhwb3J0IGRlY2xhcmUgbmFtZXNwYWNlIE9ic2VydmFibGVBcnJheSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZVxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXJyYXkgZnJvbSBhbiBhcnJheS1saWtlIG9iamVjdC5cbiAgICAgKiBAcGFyYW0gYXJyYXlMaWtlIEFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0IHRvIGNvbnZlcnQgdG8gYW4gYXJyYXkuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZnJvbTxUPihhcnJheUxpa2U6IEFycmF5TGlrZTxUPiB8IEl0ZXJhYmxlPFQ+KTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXJyYXkgZnJvbSBhbiBhcnJheS1saWtlIG9iamVjdC5cbiAgICAgKiBAcGFyYW0gYXJyYXlMaWtlIEFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0IHRvIGNvbnZlcnQgdG8gYW4gYXJyYXkuXG4gICAgICogQHBhcmFtIG1hcGZuIEEgbWFwcGluZyBmdW5jdGlvbiB0byBjYWxsIG9uIGV2ZXJ5IGVsZW1lbnQgb2YgdGhlIGFycmF5LlxuICAgICAqIEBwYXJhbSB0aGlzQXJnIFZhbHVlIG9mICd0aGlzJyB1c2VkIHRvIGludm9rZSB0aGUgbWFwZm4uXG4gICAgICovXG4gICAgZnVuY3Rpb24gZnJvbTxULCBVPihhcnJheUxpa2U6IEFycmF5TGlrZTxUPiB8IEl0ZXJhYmxlPFQ+LCBtYXBmbjogKHRoaXM6IHZvaWQsIHY6IFQsIGs6IG51bWJlcikgPT4gVSwgdGhpc0FyZz86IHVuZGVmaW5lZCk6IE9ic2VydmFibGVBcnJheTxVPjtcbiAgICBmdW5jdGlvbiBmcm9tPFgsIFQsIFU+KGFycmF5TGlrZTogQXJyYXlMaWtlPFQ+IHwgSXRlcmFibGU8VD4sIG1hcGZuOiAodGhpczogWCwgdjogVCwgazogbnVtYmVyKSA9PiBVLCB0aGlzQXJnOiBYKTogT2JzZXJ2YWJsZUFycmF5PFU+O1xuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBuZXcgYXJyYXkgZnJvbSBhIHNldCBvZiBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gaXRlbXMgQSBzZXQgb2YgZWxlbWVudHMgdG8gaW5jbHVkZSBpbiB0aGUgbmV3IGFycmF5IG9iamVjdC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBvZjxUPiguLi5pdGVtczogVFtdKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xufVxuIl0sIm5hbWVzIjpbIl9wcm94eUhhbmRsZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBT0E7TUFDYSxnQkFBZ0I7SUFFbEIsR0FBRztRQUNOLE9BQU8sSUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUMsQ0FBQztLQUM3RDtDQUNKO0FBRUQsaUJBQXdCLE1BQU0sU0FBUyxHQUFRLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNsRSxpQkFBd0IsTUFBTSxPQUFPLEdBQVUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FB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
