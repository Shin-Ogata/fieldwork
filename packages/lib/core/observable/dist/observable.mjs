/*!
 * @cdp/observable 0.9.0
 *   observable utility module
 */

import { verify, isArray, post, deepMerge, isString, isNumber } from '@cdp/core-utils';
import { EventBroker } from '@cdp/events';

/* eslint-disable @typescript-eslint/no-explicit-any */
/** @internal EventBrokerProxy */
class EventBrokerProxy {
    get() {
        return this._broker || (this._broker = new EventBroker());
    }
}
/** @internal */
const _internal = Symbol('internal');
/** @internal */
const _notify = Symbol('notify');
/** @internal */
const _stockChange = Symbol('stock-change');
/** @internal */
const _notifyChanges = Symbol('notify-changes');
/** @internal */
function verifyObservable(x) {
    if (!x || !x[_internal]) {
        throw new TypeError(`The object passed is not an IObservable.`);
    }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
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

/* eslint-disable @typescript-eslint/no-explicit-any */
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
            post(() => this[_notifyChanges]());
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
                post(() => this[_notifyChanges]());
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
            if (oldValue !== curValue) {
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
            eventBroker.trigger('*', this);
        }
    }
}

/* eslint-disable prefer-rest-params, @typescript-eslint/no-explicit-any */
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
            post(() => this[_notifyChanges]());
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
         * return (super.map as any)(...arguments);
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
            post(() => this[_notifyChanges]());
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZS5tanMiLCJzb3VyY2VzIjpbImludGVybmFsLnRzIiwiY29tbW9uLnRzIiwib2JqZWN0LnRzIiwiYXJyYXkudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5pbXBvcnQge1xuICAgIGlzU3RyaW5nLFxuICAgIGlzU3ltYm9sLFxuICAgIGNsYXNzTmFtZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuXG4vKiogQGludGVybmFsIEV2ZW50QnJva2VyUHJveHkgKi9cbmV4cG9ydCBjbGFzcyBFdmVudEJyb2tlclByb3h5PEV2ZW50IGV4dGVuZHMge30+IHtcbiAgICBwcml2YXRlIF9icm9rZXI/OiBFdmVudEJyb2tlcjxFdmVudD47XG4gICAgcHVibGljIGdldCgpOiBFdmVudEJyb2tlcjxFdmVudD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYnJva2VyIHx8ICh0aGlzLl9icm9rZXIgPSBuZXcgRXZlbnRCcm9rZXIoKSk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgX2ludGVybmFsID0gU3ltYm9sKCdpbnRlcm5hbCcpO1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IF9ub3RpZnkgPSBTeW1ib2woJ25vdGlmeScpO1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IF9zdG9ja0NoYW5nZSA9IFN5bWJvbCgnc3RvY2stY2hhbmdlJyk7XG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgX25vdGlmeUNoYW5nZXMgPSBTeW1ib2woJ25vdGlmeS1jaGFuZ2VzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiB2ZXJpZnlPYnNlcnZhYmxlKHg6IGFueSk6IHZvaWQgfCBuZXZlciB7XG4gICAgaWYgKCF4IHx8ICF4W19pbnRlcm5hbF0pIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVGhlIG9iamVjdCBwYXNzZWQgaXMgbm90IGFuIElPYnNlcnZhYmxlLmApO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZlcmlmeVZhbGlkS2V5KGtleTogdW5rbm93bik6IHZvaWQgfCBuZXZlciB7XG4gICAgaWYgKGlzU3RyaW5nKGtleSkgfHwgaXNTeW1ib2woa2V5KSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFR5cGUgb2YgJHtjbGFzc05hbWUoa2V5KX0gaXMgbm90IGEgdmFsaWQga2V5LmApO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5pbXBvcnQgeyBTdWJzY3JpcHRpb24sIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgX2ludGVybmFsIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKlxuICogQGVuIEV2ZW50IG9ic2VydmF0aW9uIHN0YXRlIGRlZmluaXRpb24uXG4gKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL5a6a576pXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIE9ic2VydmFibGVTdGF0ZSB7XG4gICAgLyoqIG9ic2VydmFibGUgcmVhZHkgKi9cbiAgICBBQ1RJVkUgICA9ICdhY3RpdmUnLFxuICAgIC8qKiBOT1Qgb2JzZXJ2ZWQsIGJ1dCBwcm9wZXJ0eSBjaGFuZ2VzIGFyZSByZWNvcmRlZC4gKi9cbiAgICBTVVNFUE5ERUQgPSAnc3VzcGVuZGVkJyxcbiAgICAvKiogTk9UIG9ic2VydmVkLCBhbmQgbm90IHJlY29yZGluZyBwcm9wZXJ0eSBjaGFuZ2VzLiAqL1xuICAgIERJU0FCTEVEID0gJ2Rpc2FibGVkJyxcbn1cblxuLyoqXG4gKiBAZW4gT2JzZXJ2YWJsZSBjb21tb24gaW50ZXJmYWNlLlxuICogQGphIE9ic2VydmFibGUg5YWx6YCa44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSU9ic2VydmFibGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqL1xuICAgIG9uKC4uLmFyZ3M6IGFueVtdKTogU3Vic2NyaXB0aW9uO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKi9cbiAgICBvZmYoLi4uYXJnczogYW55W10pOiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFN1c3BlbmQgb3IgZGlzYWJsZSB0aGUgZXZlbnQgb2JzZXJ2YXRpb24gc3RhdGUuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreeKtuaFi+OBruOCteOCueODmuODs+ODiVxuICAgICAqXG4gICAgICogQHBhcmFtIG5vUmVjb3JkXG4gICAgICogIC0gYGVuYCBgdHJ1ZWA6IG5vdCByZWNvcmRpbmcgcHJvcGVydHkgY2hhbmdlcyBhbmQgY2xlYXIgY2hhbmdlcy4gLyBgZmFsc2VgOiBwcm9wZXJ0eSBjaGFuZ2VzIGFyZSByZWNvcmRlZCBhbmQgZmlyZWQgd2hlbiBbW3Jlc3VtZV1dKCkgY2FsbGRlZC4gKGRlZmF1bHQpXG4gICAgICogIC0gYGphYCBgdHJ1ZWA6IOODl+ODreODkeODhuOCo+WkieabtOOCguiomOmMsuOBm+OBmiwg54++5Zyo44Gu6KiY6Yyy44KC56C05qOEIC8gYGZhbHNlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044Gv6KiY6Yyy44GV44KMLCBbW3Jlc3VtZV1dKCkg5pmC44Gr55m654Gr44GZ44KLICjml6LlrpopXG4gICAgICovXG4gICAgc3VzcGVuZChub1JlY29yZD86IGJvb2xlYW4pOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc3VtZSB0aGUgZXZlbnQgb2JzZXJ2YXRpb24gc3RhdGUuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreeKtuaFi+OBruODquOCuOODpeODvOODoFxuICAgICAqL1xuICAgIHJlc3VtZSgpOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIG9ic2VydmF0aW9uIHN0YXRlXG4gICAgICogQGphIOizvOiqreWPr+iDveeKtuaFi1xuICAgICAqL1xuICAgIGdldE9ic2VydmFibGVTdGF0ZSgpOiBPYnNlcnZhYmxlU3RhdGU7XG59XG5cbi8qKlxuICogQGVuIEludGVyZmFjZSBhYmxlIHRvIGFjY2VzcyB0byBbW0V2ZW50QnJva2VyXV0gd2l0aCBbW0lPYnNlcnZhYmxlXV0uXG4gKiBAamEgW1tJT2JzZXJ2YWJsZV1dIOOBruaMgeOBpOWGhemDqCBbW0V2ZW50QnJva2VyXV0g44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2VzczxUIGV4dGVuZHMge30gPSBhbnk+IGV4dGVuZHMgSU9ic2VydmFibGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgW1tFdmVudEJyb2tlcl1dIGluc3RhbmNlLlxuICAgICAqIEBqYSBbW0V2ZW50QnJva2VyXV0g44Kk44Oz44K544K/44Oz44K544Gu5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0QnJva2VyKCk6IEV2ZW50QnJva2VyPFQ+O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBbW0lPYnNlcnZhYmxlXV0uXG4gKiBAamEgW1tJT2JzZXJ2YWJsZV1dIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT2JzZXJ2YWJsZSh4OiBhbnkpOiB4IGlzIElPYnNlcnZhYmxlIHtcbiAgICByZXR1cm4gQm9vbGVhbih4ICYmIHhbX2ludGVybmFsXSk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7XG4gICAgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgdmVyaWZ5LFxuICAgIHBvc3QsXG4gICAgZGVlcE1lcmdlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uLCBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgRXZlbnRCcm9rZXJQcm94eSxcbiAgICBfaW50ZXJuYWwsXG4gICAgX25vdGlmeSxcbiAgICBfc3RvY2tDaGFuZ2UsXG4gICAgX25vdGlmeUNoYW5nZXMsXG4gICAgdmVyaWZ5T2JzZXJ2YWJsZSxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlU3RhdGUsIElPYnNlcnZhYmxlIH0gZnJvbSAnLi9jb21tb24nO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgSW50ZXJuYWxQcm9wcyB7XG4gICAgc3RhdGU6IE9ic2VydmFibGVTdGF0ZTtcbiAgICBjaGFuZ2VkOiBib29sZWFuO1xuICAgIHJlYWRvbmx5IGNoYW5nZU1hcDogTWFwPFByb3BlcnR5S2V5LCBhbnk+O1xuICAgIHJlYWRvbmx5IGJyb2tlcjogRXZlbnRCcm9rZXJQcm94eTxhbnk+O1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcHJveHlIYW5kbGVyOiBQcm94eUhhbmRsZXI8T2JzZXJ2YWJsZU9iamVjdD4gPSB7XG4gICAgc2V0KHRhcmdldCwgcCwgdmFsdWUsIHJlY2VpdmVyKSB7XG4gICAgICAgIGlmICghaXNTdHJpbmcocCkpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LnNldCh0YXJnZXQsIHAsIHZhbHVlLCByZWNlaXZlcik7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXRbcF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IHRhcmdldFtfaW50ZXJuYWxdLnN0YXRlICYmIHZhbHVlICE9PSBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgdGFyZ2V0W19zdG9ja0NoYW5nZV0ocCwgb2xkVmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBSZWZsZWN0LnNldCh0YXJnZXQsIHAsIHZhbHVlLCByZWNlaXZlcik7XG4gICAgfSxcbn07XG5PYmplY3QuZnJlZXplKF9wcm94eUhhbmRsZXIpO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gT2JzZXJ2YWJsZSBrZXkgdHlwZSBkZWZpbml0aW9uLlxuICogQGphIOizvOiqreWPr+iDveOBquOCreODvOOBruWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBPYnNlcnZhYmxlS2V5czxUIGV4dGVuZHMgT2JzZXJ2YWJsZU9iamVjdD4gPSBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VD47XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgb2JqZWN0IGNsYXNzIHdoaWNoIGNoYW5nZSBjYW4gYmUgb2JzZXJ2ZWQuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu5aSJ5pu044KS55uj6KaW44Gn44GN44KL44Kq44OW44K444Kn44Kv44OI44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogY2xhc3MgRXhhbXBsZSBleHRlbmRzIE9ic2VydmFibGVPYmplY3Qge1xuICogICBwdWJsaWMgYTogbnVtYmVyID0gMDtcbiAqICAgcHVibGljIGI6IG51bWJlciA9IDA7XG4gKiAgIHB1YmxpYyBnZXQgc3VtKCk6IG51bWJlciB7XG4gKiAgICAgICByZXR1cm4gdGhpcy5hICsgdGhpcy5iO1xuICogICB9XG4gKiB9XG4gKlxuICogY29uc3Qgb2JzZXJ2YWJsZSA9IG5ldyBFeGFtcGxlKCk7XG4gKlxuICogZnVuY3Rpb24gb25OdW1DaGFuZ2UobmV3VmFsdWU6IG51bWJlciwgb2xkVmFsdWU6IG51bWJlciwga2V5OiBzdHJpbmcpIHtcbiAqICAgY29uc29sZS5sb2coYCR7a2V5fSBjaGFuZ2VkIGZyb20gJHtvbGRWYWx1ZX0gdG8gJHtuZXdWYWx1ZX0uYCk7XG4gKiB9XG4gKiBvYnNlcnZhYmxlLm9uKFsnYScsICdiJ10sIG9uTnVtQ2hhbmdlKTtcbiAqXG4gKiAvLyB1cGRhdGVcbiAqIG9ic2VydmFibGUuYSA9IDEwMDtcbiAqIG9ic2VydmFibGUuYiA9IDIwMDtcbiAqXG4gKiAvLyBjb25zb2xlIG91dCBmcm9tIGBhc3luY2AgZXZlbnQgbG9vcC5cbiAqIC8vID0+ICdhIGNoYW5nZWQgZnJvbSAwIHRvIDEwMC4nXG4gKiAvLyA9PiAnYiBjaGFuZ2VkIGZyb20gMCB0byAyMDAuJ1xuICpcbiAqIDpcbiAqXG4gKiBmdW5jdGlvbiBvblN1bUNoYW5nZShuZXdWYWx1ZTogbnVtYmVyLCBvbGRWYWx1ZTogbnVtYmVyKSB7XG4gKiAgIGNvbnNvbGUubG9nKGBzdW0gY2hhbmdlZCBmcm9tICR7b2xkVmFsdWV9IHRvICR7bmV3VmF1ZX0uYCk7XG4gKiB9XG4gKiBvYnNlcnZhYmxlLm9uKCdzdW0nLCBvblN1bUNoYW5nZSk7XG4gKlxuICogLy8gdXBkYXRlXG4gKiBvYnNlcnZhYmxlLmEgPSAxMDA7IC8vIG5vdGhpbmcgcmVhY3Rpb24gYmVjYXVzZSBvZiBubyBjaGFuZ2UgcHJvcGVydGllcy5cbiAqIG9ic2VydmFibGUuYSA9IDIwMDtcbiAqXG4gKiAvLyBjb25zb2xlIG91dCBmcm9tIGBhc3luY2AgZXZlbnQgbG9vcC5cbiAqIC8vID0+ICdzdW0gY2hhbmdlZCBmcm9tIDMwMCB0byA0MDAuJ1xuICogYGBgXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBPYnNlcnZhYmxlT2JqZWN0IGltcGxlbWVudHMgSU9ic2VydmFibGUge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfaW50ZXJuYWxdOiBJbnRlcm5hbFByb3BzO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBzdGF0ZS4gZGVmYXVsdDogW1tPYnNlcnZhYmxlU3RhdGUuQUNUSVZFXV1cbiAgICAgKiAgLSBgamFgIOWIneacn+eKtuaFiyDml6Llrpo6IFtbT2JzZXJ2YWJsZVN0YXRlLkFDVElWRV1dXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3RhdGUgPSBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFKSB7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIE9ic2VydmFibGVPYmplY3QsIHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbDogSW50ZXJuYWxQcm9wcyA9IHtcbiAgICAgICAgICAgIHN0YXRlLFxuICAgICAgICAgICAgY2hhbmdlZDogZmFsc2UsXG4gICAgICAgICAgICBjaGFuZ2VNYXA6IG5ldyBNYXAoKSxcbiAgICAgICAgICAgIGJyb2tlcjogbmV3IEV2ZW50QnJva2VyUHJveHk8dGhpcz4oKSxcbiAgICAgICAgfTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIF9pbnRlcm5hbCwgeyB2YWx1ZTogT2JqZWN0LnNlYWwoaW50ZXJuYWwpIH0pO1xuICAgICAgICByZXR1cm4gbmV3IFByb3h5KHRoaXMsIF9wcm94eUhhbmRsZXIpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElPYnNlcnZhYmxlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIHByb3BlcnR5IGNoYW5nZXMuXG4gICAgICogQGphIOODl+ODreODkeODhuOCo+WkieabtOizvOiqreioreWumiAo5YWo44OX44Ot44OR44OG44Kj55uj6KaWKVxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnR5XG4gICAgICogIC0gYGVuYCB3aWxkIGNvcmQgc2lnbmF0dXJlLlxuICAgICAqICAtIGBqYWAg44Ov44Kk44Or44OJ44Kr44O844OJXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgcHJvcGVydHkgY2hhbmdlLlxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb24ocHJvcGVydHk6ICcqJywgbGlzdGVuZXI6IChjb250ZXh0OiBPYnNlcnZhYmxlT2JqZWN0KSA9PiBhbnkpOiBTdWJzY3JpcHRpb247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIHByb3BlcnR5IGNoYW5nZShzKS5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5aSJ5pu06LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydHlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eS5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIHByb3BlcnR5IGNoYW5nZS5cbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk6IEsgfCBLW10sIGxpc3RlbmVyOiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IGFueSk6IFN1YnNjcmlwdGlvbjtcblxuICAgIG9uPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk6IEsgfCBLW10sIGxpc3RlbmVyOiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IGFueSk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IHsgY2hhbmdlTWFwLCBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYnJva2VyLmdldCgpLm9uKHByb3BlcnR5LCBsaXN0ZW5lcik7XG4gICAgICAgIGlmICgwIDwgY2hhbmdlTWFwLnNpemUpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0gaXNBcnJheShwcm9wZXJ0eSkgPyBwcm9wZXJ0eSA6IFtwcm9wZXJ0eV07XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcHMpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VNYXAuaGFzKHByb3ApIHx8IGNoYW5nZU1hcC5zZXQocHJvcCwgdGhpc1twcm9wXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgcHJvcGVydHkgY2hhbmdlcylcbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5aSJ5pu06LO86Kqt6Kej6ZmkICjlhajjg5fjg63jg5Hjg4bjgqPnm6PoppYpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydHlcbiAgICAgKiAgLSBgZW5gIHdpbGQgY29yZCBzaWduYXR1cmUuXG4gICAgICogIC0gYGphYCDjg6/jgqTjg6vjg4njgqvjg7zjg4lcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBwcm9wZXJ0eSBjaGFuZ2UuXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvZmYocHJvcGVydHk6ICcqJywgbGlzdGVuZXI/OiAoY29udGV4dDogT2JzZXJ2YWJsZU9iamVjdCkgPT4gYW55KTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBwcm9wZXJ0eSBjaGFuZ2UocykuXG4gICAgICogQGphIOODl+ODreODkeODhuOCo+WkieabtOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnR5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGV2ZXJ5dGhpbmcgaXMgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jg5fjg63jg5Hjg4bjgqNcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuino+mZpFxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIHByb3BlcnR5IGNoYW5nZS5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgYWxsIHNhbWUgYGNoYW5uZWxgIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WQjOS4gCBgY2hhbm5lbGAg44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk/OiBLIHwgS1tdLCBsaXN0ZW5lcj86IChuZXdWYWx1ZTogdGhpc1tLXSwgb2xkVmFsdWU6IHRoaXNbS10sIGtleTogSykgPT4gYW55KTogdm9pZDtcblxuICAgIG9mZjxLIGV4dGVuZHMgT2JzZXJ2YWJsZUtleXM8dGhpcz4+KHByb3BlcnR5PzogSyB8IEtbXSwgbGlzdGVuZXI/OiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IGFueSk6IHZvaWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uYnJva2VyLmdldCgpLm9mZihwcm9wZXJ0eSwgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdXNwZW5kIG9yIGRpc2FibGUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jgrXjgrnjg5rjg7Pjg4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub1JlY29yZFxuICAgICAqICAtIGBlbmAgYHRydWVgOiBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMgYW5kIGNsZWFyIGNoYW5nZXMuIC8gYGZhbHNlYDogcHJvcGVydHkgY2hhbmdlcyBhcmUgcmVjb3JkZWQgYW5kIGZpcmVkIHdoZW4gW1tyZXN1bWVdXSgpIGNhbGxkZWQuIChkZWZhdWx0KVxuICAgICAqICAtIGBqYWAgYHRydWVgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7TjgoLoqJjpjLLjgZvjgZosIOePvuWcqOOBruiomOmMsuOCguegtOajhCAvIGBmYWxzZWA6IOODl+ODreODkeODhuOCo+WkieabtOOBr+iomOmMsuOBleOCjCwgW1tyZXN1bWVdXSgpIOaZguOBq+eZuueBq+OBmeOCiyAo5pei5a6aKVxuICAgICAqL1xuICAgIHN1c3BlbmQobm9SZWNvcmQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uc3RhdGUgPSBub1JlY29yZCA/IE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA6IE9ic2VydmFibGVTdGF0ZS5TVVNFUE5ERUQ7XG4gICAgICAgIGlmIChub1JlY29yZCkge1xuICAgICAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmNoYW5nZU1hcC5jbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN1bWUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jg6rjgrjjg6Xjg7zjg6BcbiAgICAgKi9cbiAgICByZXN1bWUoKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIGludGVybmFsLnN0YXRlID0gT2JzZXJ2YWJsZVN0YXRlLkFDVElWRTtcbiAgICAgICAgICAgIHBvc3QoKCkgPT4gdGhpc1tfbm90aWZ5Q2hhbmdlc10oKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIG9ic2VydmF0aW9uIHN0YXRlXG4gICAgICogQGphIOizvOiqreWPr+iDveeKtuaFi1xuICAgICAqL1xuICAgIGdldE9ic2VydmFibGVTdGF0ZSgpOiBPYnNlcnZhYmxlU3RhdGUge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpc1tfaW50ZXJuYWxdLnN0YXRlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElPYnNlcnZhYmxlRXZlbnRCcm9rZXJBY2Nlc3NcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBnZXRCcm9rZXIoKTogRXZlbnRCcm9rZXI8T2JzZXJ2YWJsZUtleXM8dGhpcz4+IHtcbiAgICAgICAgY29uc3QgeyBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgcmV0dXJuIGJyb2tlci5nZXQoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBzdGF0aWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgW1tPYnNlcnZhYmxlT2JqZWN0XV0gZnJvbSBhbnkgb2JqZWN0LlxuICAgICAqIEBqYSDku7vmhI/jga7jgqrjg5bjgrjjgqfjgq/jg4jjgYvjgokgW1tPYnNlcnZhYmxlT2JqZWN0XV0g44KS55Sf5oiQXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNvbnN0IG9ic2VydmFibGUgPSBPYnNlcnZhYmxlT2JqZWN0LmZyb20oeyBhOiAxLCBiOiAxIH0pO1xuICAgICAqIGZ1bmN0aW9uIG9uTnVtQ2hhbmdlKG5ld1ZhbHVlOiBudW1iZXIsIG9sZFZhbHVlOiBudW1iZXIsIGtleTogc3RyaW5nKSB7XG4gICAgICogICBjb25zb2xlLmxvZyhgJHtrZXl9IGNoYW5nZWQgZnJvbSAke29sZFZhbHVlfSB0byAke25ld1ZhbHVlfS5gKTtcbiAgICAgKiB9XG4gICAgICogb2JzZXJ2YWJsZS5vbihbJ2EnLCAnYiddLCBvbk51bUNoYW5nZSk7XG4gICAgICpcbiAgICAgKiAvLyB1cGRhdGVcbiAgICAgKiBvYnNlcnZhYmxlLmEgPSAxMDA7XG4gICAgICogb2JzZXJ2YWJsZS5iID0gMjAwO1xuICAgICAqXG4gICAgICogLy8gY29uc29sZSBvdXQgZnJvbSBgYXN5bmNgIGV2ZW50IGxvb3AuXG4gICAgICogLy8gPT4gJ2EgY2hhbmdlZCBmcm9tIDEgdG8gMTAwLidcbiAgICAgKiAvLyA9PiAnYiBjaGFuZ2VkIGZyb20gMSB0byAyMDAuJ1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMge30+KHNyYzogVCk6IE9ic2VydmFibGVPYmplY3QgJiBUIHtcbiAgICAgICAgY29uc3Qgb2JzZXJ2YWJsZSA9IGRlZXBNZXJnZShuZXcgY2xhc3MgZXh0ZW5kcyBPYnNlcnZhYmxlT2JqZWN0IHsgfShPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQpLCBzcmMpO1xuICAgICAgICBvYnNlcnZhYmxlLnJlc3VtZSgpO1xuICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcm90ZWN0ZWQgbWVodG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBGb3JjZSBub3RpZnkgcHJvcGVydHkgY2hhbmdlKHMpIGluIHNwaXRlIG9mIGFjdGl2ZSBzdGF0ZS5cbiAgICAgKiBAamEg44Ki44Kv44OG44Kj44OW54q25oWL44Gr44GL44GL44KP44KJ44Ga5by35Yi255qE44Gr44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44KS55m66KGMXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG5vdGlmeSguLi5wcm9wZXJ0aWVzOiBzdHJpbmdbXSk6IHZvaWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBpZiAoMCA9PT0gcHJvcGVydGllcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB7IGNoYW5nZU1hcCB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCBrZXlWYWx1ZSA9IG5ldyBNYXA8UHJvcGVydHlLZXksIFthbnksIGFueV0+KCk7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gdGhpc1trZXldO1xuICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBjaGFuZ2VNYXAuaGFzKGtleSkgPyBjaGFuZ2VNYXAuZ2V0KGtleSkgOiBuZXdWYWx1ZTtcbiAgICAgICAgICAgIGtleVZhbHVlLnNldChrZXksIFtuZXdWYWx1ZSwgb2xkVmFsdWVdKTtcbiAgICAgICAgfVxuICAgICAgICAwIDwga2V5VmFsdWUuc2l6ZSAmJiB0aGlzW19ub3RpZnldKGtleVZhbHVlKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1laHRvZHM6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX3N0b2NrQ2hhbmdlXShwOiBzdHJpbmcsIG9sZFZhbHVlOiBhbnkpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZSwgY2hhbmdlTWFwLCBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmNoYW5nZWQgPSB0cnVlO1xuICAgICAgICBpZiAoMCA9PT0gY2hhbmdlTWFwLnNpemUpIHtcbiAgICAgICAgICAgIGNoYW5nZU1hcC5zZXQocCwgb2xkVmFsdWUpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBrIG9mIGJyb2tlci5nZXQoKS5jaGFubmVscygpKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlTWFwLmhhcyhrKSB8fCBjaGFuZ2VNYXAuc2V0KGssIHRoaXNba10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgPT09IHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgcG9zdCgoKSA9PiB0aGlzW19ub3RpZnlDaGFuZ2VzXSgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNoYW5nZU1hcC5oYXMocCkgfHwgY2hhbmdlTWFwLnNldChwLCBvbGRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeUNoYW5nZXNdKCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCBjaGFuZ2VNYXAgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgIT09IHN0YXRlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qga2V5VmFsdWVQYWlycyA9IG5ldyBNYXA8UHJvcGVydHlLZXksIFthbnksIGFueV0+KCk7XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgb2xkVmFsdWVdIG9mIGNoYW5nZU1hcCkge1xuICAgICAgICAgICAgY29uc3QgY3VyVmFsdWUgPSB0aGlzW2tleV07XG4gICAgICAgICAgICBpZiAob2xkVmFsdWUgIT09IGN1clZhbHVlKSB7XG4gICAgICAgICAgICAgICAga2V5VmFsdWVQYWlycy5zZXQoa2V5LCBbY3VyVmFsdWUsIG9sZFZhbHVlXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpc1tfbm90aWZ5XShrZXlWYWx1ZVBhaXJzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeV0oa2V5VmFsdWU6IE1hcDxQcm9wZXJ0eUtleSwgW2FueSwgYW55XT4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBjaGFuZ2VkLCBjaGFuZ2VNYXAsIGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjaGFuZ2VNYXAuY2xlYXIoKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmNoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgZXZlbnRCcm9rZXIgPSBicm9rZXIuZ2V0KCk7XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVzXSBvZiBrZXlWYWx1ZSkge1xuICAgICAgICAgICAgKGV2ZW50QnJva2VyIGFzIGFueSkudHJpZ2dlcihrZXksIC4uLnZhbHVlcywga2V5KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hhbmdlZCkge1xuICAgICAgICAgICAgZXZlbnRCcm9rZXIudHJpZ2dlcignKicsIHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGUgcHJlZmVyLXJlc3QtcGFyYW1zLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7XG4gICAgV3JpdGFibGUsXG4gICAgaXNOdW1iZXIsXG4gICAgdmVyaWZ5LFxuICAgIHBvc3QsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24sIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBFdmVudEJyb2tlclByb3h5LFxuICAgIF9pbnRlcm5hbCxcbiAgICBfbm90aWZ5LFxuICAgIF9zdG9ja0NoYW5nZSxcbiAgICBfbm90aWZ5Q2hhbmdlcyxcbiAgICB2ZXJpZnlPYnNlcnZhYmxlLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IE9ic2VydmFibGVTdGF0ZSwgSU9ic2VydmFibGUgfSBmcm9tICcuL2NvbW1vbic7XG5cbi8qKlxuICogQGVuIEFycmF5IGNoYW5nZSB0eXBlIGluZm9ybWF0aW9uLiA8YnI+XG4gKiAgICAgVGhlIHZhbHVlIGlzIHN1aXRhYmxlIGZvciB0aGUgbnVtYmVyIG9mIGZsdWN0dWF0aW9uIG9mIHRoZSBlbGVtZW50LlxuICogQGphIOmFjeWIl+WkieabtOmAmuefpeOBruOCv+OCpOODlyA8YnI+XG4gKiAgICAg5YCk44Gv6KaB57Sg44Gu5aKX5rib5pWw44Gr55u45b2TXG4gKlxuICovXG5leHBvcnQgY29uc3QgZW51bSBBcnJheUNoYW5nZVR5cGUge1xuICAgIFJFTU9WRSA9IC0xLFxuICAgIFVQREFURSA9IDAsXG4gICAgSU5TRVJUID0gMSxcbn1cblxuLyoqXG4gKiBAZW4gQXJyYXkgY2hhbmdlIHJlY29yZCBpbmZvcm1hdGlvbi5cbiAqIEBqYSDphY3liJflpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcnJheUNoYW5nZVJlY29yZDxUPiB7XG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBjaGFuZ2UgdHlwZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAamEg6YWN5YiX5aSJ5pu05oOF5aCx44Gu6K2Y5Yil5a2QXG4gICAgICovXG4gICAgcmVhZG9ubHkgdHlwZTogQXJyYXlDaGFuZ2VUeXBlO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBjaGFuZ2UgdHlwZSBpbmZvcm1hdGlvbi4gPGJyPlxuICAgICAqICAgICDigLsgW0F0dGVudGlvbl0gVGhlIGluZGV4IHdpbGwgYmUgZGlmZmVyZW50IGZyb20gdGhlIGFjdHVhbCBsb2NhdGlvbiB3aGVuIGFycmF5IHNpemUgY2hhbmdlZCBiZWNhdXNlIHRoYXQgZGV0ZXJtaW5lcyBlbGVtZW50IG9wZXJhdGlvbiB1bml0LlxuICAgICAqIEBqYSDlpInmm7TjgYznmbrnlJ/jgZfjgZ/phY3liJflhoXjga7kvY3nva7jga4gaW5kZXggPGJyPlxuICAgICAqICAgICDigLsgW+azqOaEj10g44Kq44Oa44Os44O844K344On44Oz5Y2Y5L2N44GuIGluZGV4IOOBqOOBquOCiiwg6KaB57Sg44GM5aKX5rib44GZ44KL5aC05ZCI44Gv5a6f6Zqb44Gu5L2N572u44Go55Ww44Gq44KL44GT44Go44GM44GC44KLXG4gICAgICovXG4gICAgcmVhZG9ubHkgaW5kZXg6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBOZXcgZWxlbWVudCdzIHZhbHVlLlxuICAgICAqIEBqYSDopoHntKDjga7mlrDjgZfjgYTlgKRcbiAgICAgKi9cbiAgICByZWFkb25seSBuZXdWYWx1ZT86IFQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gT2xkIGVsZW1lbnQncyB2YWx1ZS5cbiAgICAgKiBAamEg6KaB57Sg44Gu5Y+k44GE5YCkXG4gICAgICovXG4gICAgcmVhZG9ubHkgb2xkVmFsdWU/OiBUO1xufVxudHlwZSBNdXRhYmxlQ2hhbmdlUmVjb3JkPFQ+ID0gV3JpdGFibGU8QXJyYXlDaGFuZ2VSZWNvcmQ8VD4+O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIElBcnJheUNoYW5nZUV2ZW50PFQ+IHtcbiAgICAnQCc6IFtBcnJheUNoYW5nZVJlY29yZDxUPltdXTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEludGVybmFsUHJvcHM8VCA9IGFueT4ge1xuICAgIHN0YXRlOiBPYnNlcnZhYmxlU3RhdGU7XG4gICAgYnlNZXRob2Q6IGJvb2xlYW47XG4gICAgcmVjb3JkczogTXV0YWJsZUNoYW5nZVJlY29yZDxUPltdO1xuICAgIHJlYWRvbmx5IGluZGV4ZXM6IFNldDxudW1iZXI+O1xuICAgIHJlYWRvbmx5IGJyb2tlcjogRXZlbnRCcm9rZXJQcm94eTxJQXJyYXlDaGFuZ2VFdmVudDxUPj47XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9wcm94eUhhbmRsZXI6IFByb3h5SGFuZGxlcjxPYnNlcnZhYmxlQXJyYXk+ID0ge1xuICAgIGRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcykge1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRhcmdldFtfaW50ZXJuYWxdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEID09PSBpbnRlcm5hbC5zdGF0ZSB8fCBpbnRlcm5hbC5ieU1ldGhvZCB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGF0dHJpYnV0ZXMsICd2YWx1ZScpKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHAsIGF0dHJpYnV0ZXMpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0W3BdO1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGF0dHJpYnV0ZXMudmFsdWU7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBlcWVxZXFcbiAgICAgICAgaWYgKCdsZW5ndGgnID09PSBwICYmIG5ld1ZhbHVlICE9IG9sZFZhbHVlKSB7IC8vIERvIE5PVCB1c2Ugc3RyaWN0IGluZXF1YWxpdHkgKCE9PSlcbiAgICAgICAgICAgIGNvbnN0IG9sZExlbmd0aCA9IG9sZFZhbHVlID4+PiAwO1xuICAgICAgICAgICAgY29uc3QgbmV3TGVuZ3RoID0gbmV3VmFsdWUgPj4+IDA7XG4gICAgICAgICAgICBjb25zdCBzdG9jayA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzY3JhcCA9IG5ld0xlbmd0aCA8IG9sZExlbmd0aCAmJiB0YXJnZXQuc2xpY2UobmV3TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBpZiAoc2NyYXApIHsgLy8gbmV3TGVuZ3RoIDwgb2xkTGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBvbGRMZW5ndGg7IC0taSA+PSBuZXdMZW5ndGg7KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuUkVNT1ZFLCBpLCB1bmRlZmluZWQsIHNjcmFwW2kgLSBuZXdMZW5ndGhdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgLy8gb2xkTGVuZ3RoIDwgbmV3TGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBvbGRMZW5ndGg7IGkgPCBuZXdMZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLklOU0VSVCwgaSAvKiwgdW5kZWZpbmVkLCB1bmRlZmluZWQgKi8pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIHJlc3VsdCAmJiBzdG9jaygpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSBlbHNlIGlmIChuZXdWYWx1ZSAhPT0gb2xkVmFsdWUgJiYgaXNWYWxpZEFycmF5SW5kZXgocCkpIHtcbiAgICAgICAgICAgIGNvbnN0IGkgPSBwIGFzIGFueSA+Pj4gMDtcbiAgICAgICAgICAgIGNvbnN0IHR5cGU6IEFycmF5Q2hhbmdlVHlwZSA9IE51bWJlcihpID49IHRhcmdldC5sZW5ndGgpOyAvLyBJTlNFUlQgb3IgVVBEQVRFXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcyk7XG4gICAgICAgICAgICByZXN1bHQgJiYgdGFyZ2V0W19zdG9ja0NoYW5nZV0odHlwZSwgaSwgbmV3VmFsdWUsIG9sZFZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHAsIGF0dHJpYnV0ZXMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBkZWxldGVQcm9wZXJ0eSh0YXJnZXQsIHApIHtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0YXJnZXRbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA9PT0gaW50ZXJuYWwuc3RhdGUgfHwgaW50ZXJuYWwuYnlNZXRob2QgfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0YXJnZXQsIHApKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWxldGVQcm9wZXJ0eSh0YXJnZXQsIHApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0W3BdO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBSZWZsZWN0LmRlbGV0ZVByb3BlcnR5KHRhcmdldCwgcCk7XG4gICAgICAgIHJlc3VsdCAmJiBpc1ZhbGlkQXJyYXlJbmRleChwKSAmJiB0YXJnZXRbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuVVBEQVRFLCBwIGFzIGFueSA+Pj4gMCwgdW5kZWZpbmVkLCBvbGRWYWx1ZSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbn07XG5PYmplY3QuZnJlZXplKF9wcm94eUhhbmRsZXIpO1xuXG4vKiogQGludGVybmFsIHZhbGlkIGFycmF5IGluZGV4IGhlbHBlciAqL1xuZnVuY3Rpb24gaXNWYWxpZEFycmF5SW5kZXg8VD4oaW5kZXg6IGFueSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHMgPSBTdHJpbmcoaW5kZXgpO1xuICAgIGNvbnN0IG4gPSBNYXRoLnRydW5jKHMgYXMgYW55KTtcbiAgICByZXR1cm4gU3RyaW5nKG4pID09PSBzICYmIDAgPD0gbiAmJiBuIDwgMHhGRkZGRkZGRjtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGluZGV4IG1hbmFnZW1lbnQgKi9cbmZ1bmN0aW9uIGZpbmRSZWxhdGVkQ2hhbmdlSW5kZXg8VD4ocmVjb3JkczogTXV0YWJsZUNoYW5nZVJlY29yZDxUPltdLCB0eXBlOiBBcnJheUNoYW5nZVR5cGUsIGluZGV4OiBudW1iZXIpOiBudW1iZXIge1xuICAgIGNvbnN0IGNoZWNrVHlwZSA9IHR5cGUgPT09IEFycmF5Q2hhbmdlVHlwZS5JTlNFUlRcbiAgICAgICAgPyAodDogQXJyYXlDaGFuZ2VUeXBlKSA9PiB0ID09PSBBcnJheUNoYW5nZVR5cGUuUkVNT1ZFXG4gICAgICAgIDogKHQ6IEFycmF5Q2hhbmdlVHlwZSkgPT4gdCAhPT0gQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRVxuICAgICAgICA7XG5cbiAgICBmb3IgKGxldCBpID0gcmVjb3Jkcy5sZW5ndGg7IC0taSA+PSAwOykge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHJlY29yZHNbaV07XG4gICAgICAgIGlmICh2YWx1ZS5pbmRleCA9PT0gaW5kZXggJiYgY2hlY2tUeXBlKHZhbHVlLnR5cGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZS5pbmRleCA8IGluZGV4ICYmIEJvb2xlYW4odmFsdWUudHlwZSkpIHsgLy8gUkVNT1ZFIG9yIElOU0VSVFxuICAgICAgICAgICAgaW5kZXggLT0gdmFsdWUudHlwZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgYXJyYXkgY2xhc3Mgd2hpY2ggY2hhbmdlIGNhbiBiZSBvYnNlcnZlZC5cbiAqIEBqYSDlpInmm7Tnm6Poppblj6/og73jgarphY3liJfjgq/jg6njgrlcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogLSBCYXNpYyBVc2FnZVxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBvYnNBcnJheSA9IE9ic2VydmFibGVBcnJheS5mcm9tKFsnYScsICdiJywgJ2MnXSk7XG4gKlxuICogZnVuY3Rpb24gb25DaGFuZ2VBcnJheShyZWNvcmRzOiBBcnJheUNoYW5nZVJlY29yZFtdKSB7XG4gKiAgIGNvbnNvbGUubG9nKHJlY29yZHMpO1xuICogICAvLyAgW1xuICogICAvLyAgICB7IHR5cGU6IDEsIGluZGV4OiAzLCBuZXdWYWx1ZTogJ3gnLCBvbGRWYWx1ZTogdW5kZWZpbmVkIH0sXG4gKiAgIC8vICAgIHsgdHlwZTogMSwgaW5kZXg6IDQsIG5ld1ZhbHVlOiAneScsIG9sZFZhbHVlOiB1bmRlZmluZWQgfSxcbiAqICAgLy8gICAgeyB0eXBlOiAxLCBpbmRleDogNSwgbmV3VmFsdWU6ICd6Jywgb2xkVmFsdWU6IHVuZGVmaW5lZCB9XG4gKiAgIC8vICBdXG4gKiB9XG4gKiBvYnNBcnJheS5vbihvbkNoYW5nZUFycmF5KTtcbiAqXG4gKiBmdW5jdGlvbiBhZGRYWVooKSB7XG4gKiAgIG9ic0FycmF5LnB1c2goJ3gnLCAneScsICd6Jyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIE9ic2VydmFibGVBcnJheTxUID0gYW55PiBleHRlbmRzIEFycmF5PFQ+IGltcGxlbWVudHMgSU9ic2VydmFibGUge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfaW50ZXJuYWxdOiBJbnRlcm5hbFByb3BzPFQ+O1xuXG4gICAgLyoqIEBmaW5hbCBjb25zdHJ1Y3RvciAqL1xuICAgIHByaXZhdGUgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKC4uLmFyZ3VtZW50cyk7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIE9ic2VydmFibGVBcnJheSwgdGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsOiBJbnRlcm5hbFByb3BzPFQ+ID0ge1xuICAgICAgICAgICAgc3RhdGU6IE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUsXG4gICAgICAgICAgICBieU1ldGhvZDogZmFsc2UsXG4gICAgICAgICAgICByZWNvcmRzOiBbXSxcbiAgICAgICAgICAgIGluZGV4ZXM6IG5ldyBTZXQoKSxcbiAgICAgICAgICAgIGJyb2tlcjogbmV3IEV2ZW50QnJva2VyUHJveHk8SUFycmF5Q2hhbmdlRXZlbnQ8VD4+KCksXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBfaW50ZXJuYWwsIHsgdmFsdWU6IE9iamVjdC5zZWFsKGludGVybmFsKSB9KTtcbiAgICAgICAgY29uc3QgYXJnTGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgaWYgKDEgPT09IGFyZ0xlbmd0aCAmJiBpc051bWJlcihhcmd1bWVudHNbMF0pKSB7XG4gICAgICAgICAgICBjb25zdCBsZW4gPSBhcmd1bWVudHNbMF0gPj4+IDA7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGkgLyosIHVuZGVmaW5lZCAqLyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoMCA8IGFyZ0xlbmd0aCkge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmdMZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuSU5TRVJULCBpLCBhcmd1bWVudHNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJveHkodGhpcywgX3Byb3h5SGFuZGxlcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSU9ic2VydmFibGVcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgYXJyYXkgY2hhbmdlKHMpLlxuICAgICAqIEBqYSDphY3liJflpInmm7Tos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGFycmF5IGNoYW5nZS5cbiAgICAgKiAgLSBgamFgIOmFjeWIl+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uKGxpc3RlbmVyOiAocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSkgPT4gYW55KTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2ludGVybmFsXS5icm9rZXIuZ2V0KCkub24oJ0AnLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGFycmF5IGNoYW5nZShzKS5cbiAgICAgKiBAamEg6YWN5YiX5aSJ5pu06LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBhcnJheSBjaGFuZ2UuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg6YWN5YiX5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lkIzkuIAgYGNoYW5uZWxgIOOBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIG9mZihsaXN0ZW5lcj86IChyZWNvcmRzOiBBcnJheUNoYW5nZVJlY29yZDxUPltdKSA9PiBhbnkpOiB2b2lkIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmJyb2tlci5nZXQoKS5vZmYoJ0AnLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1c3BlbmQgb3IgZGlzYWJsZSB0aGUgZXZlbnQgb2JzZXJ2YXRpb24gc3RhdGUuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreeKtuaFi+OBruOCteOCueODmuODs+ODiVxuICAgICAqXG4gICAgICogQHBhcmFtIG5vUmVjb3JkXG4gICAgICogIC0gYGVuYCBgdHJ1ZWA6IG5vdCByZWNvcmRpbmcgcHJvcGVydHkgY2hhbmdlcyBhbmQgY2xlYXIgY2hhbmdlcy4gLyBgZmFsc2VgOiBwcm9wZXJ0eSBjaGFuZ2VzIGFyZSByZWNvcmRlZCBhbmQgZmlyZWQgd2hlbiBbW3Jlc3VtZV1dKCkgY2FsbGRlZC4gKGRlZmF1bHQpXG4gICAgICogIC0gYGphYCBgdHJ1ZWA6IOODl+ODreODkeODhuOCo+WkieabtOOCguiomOmMsuOBm+OBmiwg54++5Zyo44Gu6KiY6Yyy44KC56C05qOEIC8gYGZhbHNlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044Gv6KiY6Yyy44GV44KMLCBbW3Jlc3VtZV1dKCkg5pmC44Gr55m654Gr44GZ44KLICjml6LlrpopXG4gICAgICovXG4gICAgc3VzcGVuZChub1JlY29yZCA9IGZhbHNlKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHRoaXNbX2ludGVybmFsXS5zdGF0ZSA9IG5vUmVjb3JkID8gT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEIDogT2JzZXJ2YWJsZVN0YXRlLlNVU0VQTkRFRDtcbiAgICAgICAgaWYgKG5vUmVjb3JkKSB7XG4gICAgICAgICAgICB0aGlzW19pbnRlcm5hbF0ucmVjb3JkcyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN1bWUgb2YgdGhlIGV2ZW50IHN1YnNjcmlwdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44Oq44K444Ol44O844OgXG4gICAgICovXG4gICAgcmVzdW1lKCk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgIT09IGludGVybmFsLnN0YXRlKSB7XG4gICAgICAgICAgICBpbnRlcm5hbC5zdGF0ZSA9IE9ic2VydmFibGVTdGF0ZS5BQ1RJVkU7XG4gICAgICAgICAgICBwb3N0KCgpID0+IHRoaXNbX25vdGlmeUNoYW5nZXNdKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBvYnNlcnZhdGlvbiBzdGF0ZVxuICAgICAqIEBqYSDos7zoqq3lj6/og73nirbmhYtcbiAgICAgKi9cbiAgICBnZXRPYnNlcnZhYmxlU3RhdGUoKTogT2JzZXJ2YWJsZVN0YXRlIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2ludGVybmFsXS5zdGF0ZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTogQXJyYXkgbWV0aG9kc1xuXG4gICAgLyoqXG4gICAgICogU29ydHMgYW4gYXJyYXkuXG4gICAgICogQHBhcmFtIGNvbXBhcmVGbiBUaGUgbmFtZSBvZiB0aGUgZnVuY3Rpb24gdXNlZCB0byBkZXRlcm1pbmUgdGhlIG9yZGVyIG9mIHRoZSBlbGVtZW50cy4gSWYgb21pdHRlZCwgdGhlIGVsZW1lbnRzIGFyZSBzb3J0ZWQgaW4gYXNjZW5kaW5nLCBBU0NJSSBjaGFyYWN0ZXIgb3JkZXIuXG4gICAgICovXG4gICAgc29ydChjb21wYXJhdG9yPzogKGxoczogVCwgcmhzOiBUKSA9PiBudW1iZXIpOiB0aGlzIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IG9sZCA9IEFycmF5LmZyb20odGhpcyk7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc3VwZXIuc29ydChjb21wYXJhdG9yKTtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSBmYWxzZTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGxlbiA9IG9sZC5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBvbGRbaV07XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSB0aGlzW2ldO1xuICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZSAhPT0gb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5VUERBVEUsIGksIG5ld1ZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBlbGVtZW50cyBmcm9tIGFuIGFycmF5IGFuZCwgaWYgbmVjZXNzYXJ5LCBpbnNlcnRzIG5ldyBlbGVtZW50cyBpbiB0aGVpciBwbGFjZSwgcmV0dXJuaW5nIHRoZSBkZWxldGVkIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSBzdGFydCBUaGUgemVyby1iYXNlZCBsb2NhdGlvbiBpbiB0aGUgYXJyYXkgZnJvbSB3aGljaCB0byBzdGFydCByZW1vdmluZyBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gZGVsZXRlQ291bnQgVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZW1vdmUuXG4gICAgICovXG4gICAgc3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50PzogbnVtYmVyKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgZWxlbWVudHMgZnJvbSBhbiBhcnJheSBhbmQsIGlmIG5lY2Vzc2FyeSwgaW5zZXJ0cyBuZXcgZWxlbWVudHMgaW4gdGhlaXIgcGxhY2UsIHJldHVybmluZyB0aGUgZGVsZXRlZCBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gc3RhcnQgVGhlIHplcm8tYmFzZWQgbG9jYXRpb24gaW4gdGhlIGFycmF5IGZyb20gd2hpY2ggdG8gc3RhcnQgcmVtb3ZpbmcgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIGRlbGV0ZUNvdW50IFRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmVtb3ZlLlxuICAgICAqIEBwYXJhbSBpdGVtcyBFbGVtZW50cyB0byBpbnNlcnQgaW50byB0aGUgYXJyYXkgaW4gcGxhY2Ugb2YgdGhlIGRlbGV0ZWQgZWxlbWVudHMuXG4gICAgICovXG4gICAgc3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50OiBudW1iZXIsIC4uLml0ZW1zOiBUW10pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgc3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50PzogbnVtYmVyLCAuLi5pdGVtczogVFtdKTogT2JzZXJ2YWJsZUFycmF5PFQ+IHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IG9sZExlbiA9IHRoaXMubGVuZ3RoO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IChzdXBlci5zcGxpY2UgYXMgYW55KSguLi5hcmd1bWVudHMpIGFzIE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSBmYWxzZTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIHN0YXJ0ID0gTWF0aC50cnVuYyhzdGFydCk7XG4gICAgICAgICAgICBjb25zdCBmcm9tID0gc3RhcnQgPCAwID8gTWF0aC5tYXgob2xkTGVuICsgc3RhcnQsIDApIDogTWF0aC5taW4oc3RhcnQsIG9sZExlbik7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gcmVzdWx0Lmxlbmd0aDsgLS1pID49IDA7KSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5SRU1PVkUsIGZyb20gKyBpLCB1bmRlZmluZWQsIHJlc3VsdFtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBsZW4gPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGZyb20gKyBpLCBpdGVtc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIHRoZSBmaXJzdCBlbGVtZW50IGZyb20gYW4gYXJyYXkgYW5kIHJldHVybnMgaXQuXG4gICAgICovXG4gICAgc2hpZnQoKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCBvbGRMZW4gPSB0aGlzLmxlbmd0aDtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSB0cnVlO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzdXBlci5zaGlmdCgpO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IGZhbHNlO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSBpbnRlcm5hbC5zdGF0ZSAmJiB0aGlzLmxlbmd0aCA8IG9sZExlbikge1xuICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5SRU1PVkUsIDAsIHVuZGVmaW5lZCwgcmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluc2VydHMgbmV3IGVsZW1lbnRzIGF0IHRoZSBzdGFydCBvZiBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0gaXRlbXMgIEVsZW1lbnRzIHRvIGluc2VydCBhdCB0aGUgc3RhcnQgb2YgdGhlIEFycmF5LlxuICAgICAqL1xuICAgIHVuc2hpZnQoLi4uaXRlbXM6IFRbXSk6IG51bWJlciB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLnVuc2hpZnQoLi4uaXRlbXMpO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IGZhbHNlO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgbGVuID0gaXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuSU5TRVJULCBpLCBpdGVtc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxscyBhIGRlZmluZWQgY2FsbGJhY2sgZnVuY3Rpb24gb24gZWFjaCBlbGVtZW50IG9mIGFuIGFycmF5LCBhbmQgcmV0dXJucyBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIHRoZSByZXN1bHRzLlxuICAgICAqIEBwYXJhbSBjYWxsYmFja2ZuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIHVwIHRvIHRocmVlIGFyZ3VtZW50cy4gVGhlIG1hcCBtZXRob2QgY2FsbHMgdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24gb25lIHRpbWUgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgYXJyYXkuXG4gICAgICogQHBhcmFtIHRoaXNBcmcgQW4gb2JqZWN0IHRvIHdoaWNoIHRoZSB0aGlzIGtleXdvcmQgY2FuIHJlZmVyIGluIHRoZSBjYWxsYmFja2ZuIGZ1bmN0aW9uLiBJZiB0aGlzQXJnIGlzIG9taXR0ZWQsIHVuZGVmaW5lZCBpcyB1c2VkIGFzIHRoZSB0aGlzIHZhbHVlLlxuICAgICAqL1xuICAgIG1hcDxVPihjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUsIHRoaXNBcmc/OiBhbnkpOiBPYnNlcnZhYmxlQXJyYXk8VT4ge1xuICAgICAgICAvKlxuICAgICAgICAgKiBbTk9URV0gb3JpZ2luYWwgaW1wbGVtZW50IGlzIHZlcnkgdmVyeSBoaWdoLWNvc3QuXG4gICAgICAgICAqICAgICAgICBzbyBpdCdzIGNvbnZlcnRlZCBuYXRpdmUgQXJyYXkgb25jZSwgYW5kIHJlc3RvcmVkLlxuICAgICAgICAgKlxuICAgICAgICAgKiByZXR1cm4gKHN1cGVyLm1hcCBhcyBhbnkpKC4uLmFyZ3VtZW50cyk7XG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gT2JzZXJ2YWJsZUFycmF5LmZyb20oWy4uLnRoaXNdLm1hcChjYWxsYmFja2ZuLCB0aGlzQXJnKSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2Vzc1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIGdldEJyb2tlcigpOiBFdmVudEJyb2tlcjxJQXJyYXlDaGFuZ2VFdmVudDxUPj4ge1xuICAgICAgICBjb25zdCB7IGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICByZXR1cm4gYnJva2VyLmdldCgpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWVodG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfc3RvY2tDaGFuZ2VdKHR5cGU6IEFycmF5Q2hhbmdlVHlwZSwgaW5kZXg6IG51bWJlciwgbmV3VmFsdWU/OiBULCBvbGRWYWx1ZT86IFQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZSwgaW5kZXhlcywgcmVjb3JkcyB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCByY2kgPSBpbmRleGVzLmhhcyhpbmRleCkgPyBmaW5kUmVsYXRlZENoYW5nZUluZGV4KHJlY29yZHMsIHR5cGUsIGluZGV4KSA6IC0xO1xuICAgICAgICBjb25zdCBsZW4gPSByZWNvcmRzLmxlbmd0aDtcbiAgICAgICAgaWYgKHJjaSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCByY3QgPSByZWNvcmRzW3JjaV0udHlwZTtcbiAgICAgICAgICAgIGlmICghcmN0IC8qIFVQREFURSAqLykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZSZWNvcmQgPSByZWNvcmRzLnNwbGljZShyY2ksIDEpWzBdO1xuICAgICAgICAgICAgICAgIC8vIFVQREFURSA9PiBVUERBVEUgOiBVUERBVEVcbiAgICAgICAgICAgICAgICAvLyBVUERBVEUgPT4gUkVNT1ZFIDogSU5TRVJUXG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKHR5cGUsIGluZGV4LCBuZXdWYWx1ZSwgcHJldlJlY29yZC5vbGRWYWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IHIsIGkgPSBsZW47IC0taSA+IHJjaTspIHtcbiAgICAgICAgICAgICAgICAgICAgciA9IHJlY29yZHNbaV07XG4gICAgICAgICAgICAgICAgICAgIChyLmluZGV4ID49IGluZGV4KSAmJiAoci5pbmRleCAtPSByY3QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBwcmV2UmVjb3JkID0gcmVjb3Jkcy5zcGxpY2UocmNpLCAxKVswXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZSAhPT0gQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJTlNFUlQgPT4gVVBEQVRFIDogSU5TRVJUXG4gICAgICAgICAgICAgICAgICAgIC8vIFJFTU9WRSA9PiBJTlNFUlQgOiBVUERBVEVcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKE51bWJlcighdHlwZSksIGluZGV4LCBuZXdWYWx1ZSwgcHJldlJlY29yZC5vbGRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGluZGV4ZXMuYWRkKGluZGV4KTtcbiAgICAgICAgcmVjb3Jkc1tsZW5dID0geyB0eXBlLCBpbmRleCwgbmV3VmFsdWUsIG9sZFZhbHVlIH07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFID09PSBzdGF0ZSAmJiAwID09PSBsZW4pIHtcbiAgICAgICAgICAgIHBvc3QoKCkgPT4gdGhpc1tfbm90aWZ5Q2hhbmdlc10oKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeUNoYW5nZXNdKCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCByZWNvcmRzIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFICE9PSBzdGF0ZSB8fCAwID09PSByZWNvcmRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgciBvZiByZWNvcmRzKSB7XG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKHIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXNbX25vdGlmeV0oT2JqZWN0LmZyZWV6ZShyZWNvcmRzKSBhcyBBcnJheUNoYW5nZVJlY29yZDxUPltdKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLnJlY29yZHMgPSBbXTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeV0ocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSk6IHZvaWQge1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaW50ZXJuYWwuaW5kZXhlcy5jbGVhcigpO1xuICAgICAgICBpbnRlcm5hbC5icm9rZXIuZ2V0KCkudHJpZ2dlcignQCcsIHJlY29yZHMpO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogT3ZlcnJpZGUgcmV0dXJuIHR5cGUgb2YgcHJvdG90eXBlIG1ldGhvZHNcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBPYnNlcnZhYmxlQXJyYXk8VD4ge1xuICAgIC8qKlxuICAgICAqIENvbWJpbmVzIHR3byBvciBtb3JlIGFycmF5cy5cbiAgICAgKiBAcGFyYW0gaXRlbXMgQWRkaXRpb25hbCBpdGVtcyB0byBhZGQgdG8gdGhlIGVuZCBvZiBhcnJheTEuXG4gICAgICovXG4gICAgY29uY2F0KC4uLml0ZW1zOiBUW11bXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBDb21iaW5lcyB0d28gb3IgbW9yZSBhcnJheXMuXG4gICAgICogQHBhcmFtIGl0ZW1zIEFkZGl0aW9uYWwgaXRlbXMgdG8gYWRkIHRvIHRoZSBlbmQgb2YgYXJyYXkxLlxuICAgICAqL1xuICAgIGNvbmNhdCguLi5pdGVtczogKFQgfCBUW10pW10pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogUmV2ZXJzZXMgdGhlIGVsZW1lbnRzIGluIGFuIEFycmF5LlxuICAgICAqL1xuICAgIHJldmVyc2UoKTogdGhpcztcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgc2VjdGlvbiBvZiBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0gc3RhcnQgVGhlIGJlZ2lubmluZyBvZiB0aGUgc3BlY2lmaWVkIHBvcnRpb24gb2YgdGhlIGFycmF5LlxuICAgICAqIEBwYXJhbSBlbmQgVGhlIGVuZCBvZiB0aGUgc3BlY2lmaWVkIHBvcnRpb24gb2YgdGhlIGFycmF5LlxuICAgICAqL1xuICAgIHNsaWNlKHN0YXJ0PzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZWxlbWVudHMgb2YgYW4gYXJyYXkgdGhhdCBtZWV0IHRoZSBjb25kaXRpb24gc3BlY2lmaWVkIGluIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIGNhbGxiYWNrZm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdXAgdG8gdGhyZWUgYXJndW1lbnRzLiBUaGUgZmlsdGVyIG1ldGhvZCBjYWxscyB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbiBvbmUgdGltZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBBbiBvYmplY3QgdG8gd2hpY2ggdGhlIHRoaXMga2V5d29yZCBjYW4gcmVmZXIgaW4gdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24uIElmIHRoaXNBcmcgaXMgb21pdHRlZCwgdW5kZWZpbmVkIGlzIHVzZWQgYXMgdGhlIHRoaXMgdmFsdWUuXG4gICAgICovXG4gICAgZmlsdGVyPFMgZXh0ZW5kcyBUPihjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHZhbHVlIGlzIFMsIHRoaXNBcmc/OiBhbnkpOiBPYnNlcnZhYmxlQXJyYXk8Uz47XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZWxlbWVudHMgb2YgYW4gYXJyYXkgdGhhdCBtZWV0IHRoZSBjb25kaXRpb24gc3BlY2lmaWVkIGluIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIGNhbGxiYWNrZm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdXAgdG8gdGhyZWUgYXJndW1lbnRzLiBUaGUgZmlsdGVyIG1ldGhvZCBjYWxscyB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbiBvbmUgdGltZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBBbiBvYmplY3QgdG8gd2hpY2ggdGhlIHRoaXMga2V5d29yZCBjYW4gcmVmZXIgaW4gdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24uIElmIHRoaXNBcmcgaXMgb21pdHRlZCwgdW5kZWZpbmVkIGlzIHVzZWQgYXMgdGhlIHRoaXMgdmFsdWUuXG4gICAgICovXG4gICAgZmlsdGVyKGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYW55LCB0aGlzQXJnPzogYW55KTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xufVxuXG4vKipcbiAqIE92ZXJyaWRlIHJldHVybiB0eXBlIG9mIHN0YXRpYyBtZXRob2RzXG4gKi9cbmV4cG9ydCBkZWNsYXJlIG5hbWVzcGFjZSBPYnNlcnZhYmxlQXJyYXkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvYmplY3QuXG4gICAgICogQHBhcmFtIGFycmF5TGlrZSBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZyb208VD4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4gfCBJdGVyYWJsZTxUPik6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvYmplY3QuXG4gICAgICogQHBhcmFtIGFycmF5TGlrZSBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSBtYXBmbiBBIG1hcHBpbmcgZnVuY3Rpb24gdG8gY2FsbCBvbiBldmVyeSBlbGVtZW50IG9mIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBWYWx1ZSBvZiAndGhpcycgdXNlZCB0byBpbnZva2UgdGhlIG1hcGZuLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZyb208VCwgVT4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4gfCBJdGVyYWJsZTxUPiwgbWFwZm46ICh0aGlzOiB2b2lkLCB2OiBULCBrOiBudW1iZXIpID0+IFUsIHRoaXNBcmc/OiB1bmRlZmluZWQpOiBPYnNlcnZhYmxlQXJyYXk8VT47XG4gICAgZnVuY3Rpb24gZnJvbTxYLCBULCBVPihhcnJheUxpa2U6IEFycmF5TGlrZTxUPiB8IEl0ZXJhYmxlPFQ+LCBtYXBmbjogKHRoaXM6IFgsIHY6IFQsIGs6IG51bWJlcikgPT4gVSwgdGhpc0FyZzogWCk6IE9ic2VydmFibGVBcnJheTxVPjtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgbmV3IGFycmF5IGZyb20gYSBzZXQgb2YgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIGl0ZW1zIEEgc2V0IG9mIGVsZW1lbnRzIHRvIGluY2x1ZGUgaW4gdGhlIG5ldyBhcnJheSBvYmplY3QuXG4gICAgICovXG4gICAgZnVuY3Rpb24gb2Y8VD4oLi4uaXRlbXM6IFRbXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbn1cbiJdLCJuYW1lcyI6WyJfcHJveHlIYW5kbGVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBRUEsQUFPQTtBQUNBLE1BQWEsZ0JBQWdCO0lBRWxCLEdBQUc7UUFDTixPQUFPLElBQUksQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7S0FDN0Q7Q0FDSjs7QUFHRCxBQUFPLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQzs7QUFFNUMsQUFBTyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7O0FBRXhDLEFBQU8sTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDOztBQUVuRCxBQUFPLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDOztBQUd2RCxTQUFnQixnQkFBZ0IsQ0FBQyxDQUFNO0lBQ25DLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUU7UUFDckIsTUFBTSxJQUFJLFNBQVMsQ0FB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
