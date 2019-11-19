/*!
 * @cdp/observable 0.9.0
 *   observable utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/event-publisher')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/event-publisher'], factory) :
    (global = global || self, factory(global.CDP = global.CDP || {}, global.CDP.Utils, global.CDP));
}(this, (function (exports, coreUtils, eventPublisher) { 'use strict';

    /* eslint-disable @typescript-eslint/no-explicit-any */
    /** @internal EventBrokerProxy */
    class EventBrokerProxy {
        get() {
            return this._broker || (this._broker = new eventPublisher.EventBroker());
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
            if (!coreUtils.isString(p)) {
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
            coreUtils.verify('instanceOf', ObservableObject, this);
            const internal = {
                state,
                changeMap: new Map(),
                broker: new EventBrokerProxy(),
            };
            Object.defineProperty(this, _internal, { value: Object.seal(internal) });
            return new Proxy(this, _proxyHandler);
        }
        ///////////////////////////////////////////////////////////////////////
        // implements: IObservable
        /**
         * @en Subscrive property change(s).
         * @ja プロパティ変更購読設定
         *
         * @param property
         *  - `en` target property.
         *  - `ja` 対象のプロパティ
         * @param listener
         *  - `en` callback function of the property change.
         *  - `ja` プロパティ変更通知コールバック関数
         */
        on(property, listener) {
            verifyObservable(this);
            const { changeMap, broker } = this[_internal];
            const result = broker.get().on(property, listener);
            if (0 < changeMap.size) {
                const props = coreUtils.isArray(property) ? property : [property];
                for (const prop of props) {
                    changeMap.has(prop) || changeMap.set(prop, this[prop]);
                }
            }
            return result;
        }
        /**
         * @en Unsubscribe property change(s).
         * @ja プロパティ変更購読解除
         *
         * @param property
         *  - `en` target property.
         *         When not set this parameter, everything is released.
         *  - `ja` 対象のプロパティ
         *         指定しない場合はすべて解除
         * @param listener
         *  - `en` callback function of the property change.
         *         When not set this parameter, all same `channel` listeners are released.
         *  - `ja` プロパティ変更通知コールバック関数
         *         指定しない場合は同一 `channel` すべてを解除
         */
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
                coreUtils.post(() => this[_notifyChanges]());
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
            const observable = coreUtils.deepMerge(new class extends ObservableObject {
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
            if (0 === changeMap.size) {
                changeMap.set(p, oldValue);
                for (const k of broker.get().channels()) {
                    changeMap.has(k) || changeMap.set(k, this[k]);
                }
                if ("active" /* ACTIVE */ === state) {
                    coreUtils.post(() => this[_notifyChanges]());
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
            const { changeMap, broker } = this[_internal];
            changeMap.clear();
            for (const [key, values] of keyValue) {
                broker.get().publish(key, ...values, key);
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
            coreUtils.verify('instanceOf', ObservableArray, this);
            const internal = {
                state: "active" /* ACTIVE */,
                byMethod: false,
                records: [],
                indexes: new Set(),
                broker: new EventBrokerProxy(),
            };
            Object.defineProperty(this, _internal, { value: Object.seal(internal) });
            const argLength = arguments.length;
            if (1 === argLength && coreUtils.isNumber(arguments[0])) {
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
                coreUtils.post(() => this[_notifyChanges]());
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
                coreUtils.post(() => this[_notifyChanges]());
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
            internal.broker.get().publish('@', records);
        }
    }

    exports.ObservableArray = ObservableArray;
    exports.ObservableObject = ObservableObject;
    exports.isObservable = isObservable;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZS5qcyIsInNvdXJjZXMiOlsiaW50ZXJuYWwudHMiLCJjb21tb24udHMiLCJvYmplY3QudHMiLCJhcnJheS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7XG4gICAgaXNTdHJpbmcsXG4gICAgaXNTeW1ib2wsXG4gICAgY2xhc3NOYW1lLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50LXB1Ymxpc2hlcic7XG5cbi8qKiBAaW50ZXJuYWwgRXZlbnRCcm9rZXJQcm94eSAqL1xuZXhwb3J0IGNsYXNzIEV2ZW50QnJva2VyUHJveHk8RXZlbnQgZXh0ZW5kcyB7fT4ge1xuICAgIHByaXZhdGUgX2Jyb2tlcj86IEV2ZW50QnJva2VyPEV2ZW50PjtcbiAgICBwdWJsaWMgZ2V0KCk6IEV2ZW50QnJva2VyPEV2ZW50PiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9icm9rZXIgfHwgKHRoaXMuX2Jyb2tlciA9IG5ldyBFdmVudEJyb2tlcigpKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBfaW50ZXJuYWwgPSBTeW1ib2woJ2ludGVybmFsJyk7XG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgX25vdGlmeSA9IFN5bWJvbCgnbm90aWZ5Jyk7XG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgX3N0b2NrQ2hhbmdlID0gU3ltYm9sKCdzdG9jay1jaGFuZ2UnKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBfbm90aWZ5Q2hhbmdlcyA9IFN5bWJvbCgnbm90aWZ5LWNoYW5nZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZlcmlmeU9ic2VydmFibGUoeDogYW55KTogdm9pZCB8IG5ldmVyIHtcbiAgICBpZiAoIXggfHwgIXhbX2ludGVybmFsXSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBUaGUgb2JqZWN0IHBhc3NlZCBpcyBub3QgYW4gSU9ic2VydmFibGUuYCk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgZnVuY3Rpb24gdmVyaWZ5VmFsaWRLZXkoa2V5OiB1bmtub3duKTogdm9pZCB8IG5ldmVyIHtcbiAgICBpZiAoaXNTdHJpbmcoa2V5KSB8fCBpc1N5bWJvbChrZXkpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVHlwZSBvZiAke2NsYXNzTmFtZShrZXkpfSBpcyBub3QgYSB2YWxpZCBrZXkuYCk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7IFN1YnNjcmlwdGlvbiB9IGZyb20gJ0BjZHAvZXZlbnQtcHVibGlzaGVyJztcbmltcG9ydCB7IF9pbnRlcm5hbCB9IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKipcbiAqIEBlbiBFdmVudCBvYnNlcnZhdGlvbiBzdGF0ZSBkZWZpbml0aW9uLlxuICogQGphIOOCpOODmeODs+ODiOizvOiqreeKtuaFi+Wumue+qVxuICovXG5leHBvcnQgY29uc3QgZW51bSBPYnNlcnZhYmxlU3RhdGUge1xuICAgIC8qKiBvYnNlcnZhYmxlIHJlYWR5ICovXG4gICAgQUNUSVZFICAgPSAnYWN0aXZlJyxcbiAgICAvKiogTk9UIG9ic2VydmVkLCBidXQgcHJvcGVydHkgY2hhbmdlcyBhcmUgcmVjb3JkZWQuICovXG4gICAgU1VTRVBOREVEID0gJ3N1c3BlbmRlZCcsXG4gICAgLyoqIE5PVCBvYnNlcnZlZCwgYW5kIG5vdCByZWNvcmRpbmcgcHJvcGVydHkgY2hhbmdlcy4gKi9cbiAgICBESVNBQkxFRCA9ICdkaXNhYmxlZCcsXG59XG5cbi8qKlxuICogQGVuIE9ic2VydmFibGUgY29tbW9uIGludGVyZmFjZS5cbiAqIEBqYSBPYnNlcnZhYmxlIOWFsemAmuOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIElPYnNlcnZhYmxlIHtcbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKi9cbiAgICBvbiguLi5hcmdzOiBhbnlbXSk6IFN1YnNjcmlwdGlvbjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmKC4uLmFyZ3M6IGFueVtdKTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdXNwZW5kIG9yIGRpc2FibGUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jgrXjgrnjg5rjg7Pjg4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub1JlY29yZFxuICAgICAqICAtIGBlbmAgYHRydWVgOiBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMgYW5kIGNsZWFyIGNoYW5nZXMuIC8gYGZhbHNlYDogcHJvcGVydHkgY2hhbmdlcyBhcmUgcmVjb3JkZWQgYW5kIGZpcmVkIHdoZW4gW1tyZXN1bWVdXSgpIGNhbGxkZWQuIChkZWZhdWx0KVxuICAgICAqICAtIGBqYWAgYHRydWVgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7TjgoLoqJjpjLLjgZvjgZosIOePvuWcqOOBruiomOmMsuOCguegtOajhCAvIGBmYWxzZWA6IOODl+ODreODkeODhuOCo+WkieabtOOBr+iomOmMsuOBleOCjCwgW1tyZXN1bWVdXSgpIOaZguOBq+eZuueBq+OBmeOCiyAo5pei5a6aKVxuICAgICAqL1xuICAgIHN1c3BlbmQobm9SZWNvcmQ/OiBib29sZWFuKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN1bWUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jg6rjgrjjg6Xjg7zjg6BcbiAgICAgKi9cbiAgICByZXN1bWUoKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBvYnNlcnZhdGlvbiBzdGF0ZVxuICAgICAqIEBqYSDos7zoqq3lj6/og73nirbmhYtcbiAgICAgKi9cbiAgICBnZXRPYnNlcnZhYmxlU3RhdGUoKTogT2JzZXJ2YWJsZVN0YXRlO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBbW0lPYnNlcnZhYmxlXV0uXG4gKiBAamEgW1tJT2JzZXJ2YWJsZV1dIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT2JzZXJ2YWJsZSh4OiBhbnkpOiB4IGlzIElPYnNlcnZhYmxlIHtcbiAgICByZXR1cm4gQm9vbGVhbih4ICYmIHhbX2ludGVybmFsXSk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7XG4gICAgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgdmVyaWZ5LFxuICAgIHBvc3QsXG4gICAgZGVlcE1lcmdlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uIH0gZnJvbSAnQGNkcC9ldmVudC1wdWJsaXNoZXInO1xuaW1wb3J0IHtcbiAgICBFdmVudEJyb2tlclByb3h5LFxuICAgIF9pbnRlcm5hbCxcbiAgICBfbm90aWZ5LFxuICAgIF9zdG9ja0NoYW5nZSxcbiAgICBfbm90aWZ5Q2hhbmdlcyxcbiAgICB2ZXJpZnlPYnNlcnZhYmxlLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IE9ic2VydmFibGVTdGF0ZSwgSU9ic2VydmFibGUgfSBmcm9tICcuL2NvbW1vbic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBJbnRlcm5hbFByb3BzIHtcbiAgICBzdGF0ZTogT2JzZXJ2YWJsZVN0YXRlO1xuICAgIHJlYWRvbmx5IGNoYW5nZU1hcDogTWFwPFByb3BlcnR5S2V5LCBhbnk+O1xuICAgIHJlYWRvbmx5IGJyb2tlcjogRXZlbnRCcm9rZXJQcm94eTxhbnk+O1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcHJveHlIYW5kbGVyOiBQcm94eUhhbmRsZXI8T2JzZXJ2YWJsZU9iamVjdD4gPSB7XG4gICAgc2V0KHRhcmdldCwgcCwgdmFsdWUsIHJlY2VpdmVyKSB7XG4gICAgICAgIGlmICghaXNTdHJpbmcocCkpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LnNldCh0YXJnZXQsIHAsIHZhbHVlLCByZWNlaXZlcik7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXRbcF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IHRhcmdldFtfaW50ZXJuYWxdLnN0YXRlICYmIHZhbHVlICE9PSBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgdGFyZ2V0W19zdG9ja0NoYW5nZV0ocCwgb2xkVmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBSZWZsZWN0LnNldCh0YXJnZXQsIHAsIHZhbHVlLCByZWNlaXZlcik7XG4gICAgfSxcbn07XG5PYmplY3QuZnJlZXplKF9wcm94eUhhbmRsZXIpO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gT2JzZXJ2YWJsZSBrZXkgdHlwZSBkZWZpbml0aW9uLlxuICogQGphIOizvOiqreWPr+iDveOBquOCreODvOOBruWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBPYnNlcnZhYmxlS2V5czxUIGV4dGVuZHMgT2JzZXJ2YWJsZU9iamVjdD4gPSBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VD47XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgb2JqZWN0IGNsYXNzIHdoaWNoIGNoYW5nZSBjYW4gYmUgb2JzZXJ2ZWQuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu5aSJ5pu044KS55uj6KaW44Gn44GN44KL44Kq44OW44K444Kn44Kv44OI44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogY2xhc3MgRXhhbXBsZSBleHRlbmRzIE9ic2VydmFibGVPYmplY3Qge1xuICogICBwdWJsaWMgYTogbnVtYmVyID0gMDtcbiAqICAgcHVibGljIGI6IG51bWJlciA9IDA7XG4gKiAgIHB1YmxpYyBnZXQgc3VtKCk6IG51bWJlciB7XG4gKiAgICAgICByZXR1cm4gdGhpcy5hICsgdGhpcy5iO1xuICogICB9XG4gKiB9XG4gKlxuICogY29uc3Qgb2JzZXJ2YWJsZSA9IG5ldyBFeGFtcGxlKCk7XG4gKlxuICogZnVuY3Rpb24gb25OdW1DaGFuZ2UobmV3VmFsdWU6IG51bWJlciwgb2xkVmFsdWU6IG51bWJlciwga2V5OiBzdHJpbmcpIHtcbiAqICAgY29uc29sZS5sb2coYCR7a2V5fSBjaGFuZ2VkIGZyb20gJHtvbGRWYWx1ZX0gdG8gJHtuZXdWYWx1ZX0uYCk7XG4gKiB9XG4gKiBvYnNlcnZhYmxlLm9uKFsnYScsICdiJ10sIG9uTnVtQ2hhbmdlKTtcbiAqXG4gKiAvLyB1cGRhdGVcbiAqIG9ic2VydmFibGUuYSA9IDEwMDtcbiAqIG9ic2VydmFibGUuYiA9IDIwMDtcbiAqXG4gKiAvLyBjb25zb2xlIG91dCBmcm9tIGBhc3luY2AgZXZlbnQgbG9vcC5cbiAqIC8vID0+ICdhIGNoYW5nZWQgZnJvbSAwIHRvIDEwMC4nXG4gKiAvLyA9PiAnYiBjaGFuZ2VkIGZyb20gMCB0byAyMDAuJ1xuICpcbiAqIDpcbiAqXG4gKiBmdW5jdGlvbiBvblN1bUNoYW5nZShuZXdWYWx1ZTogbnVtYmVyLCBvbGRWYWx1ZTogbnVtYmVyKSB7XG4gKiAgIGNvbnNvbGUubG9nKGBzdW0gY2hhbmdlZCBmcm9tICR7b2xkVmFsdWV9IHRvICR7bmV3VmF1ZX0uYCk7XG4gKiB9XG4gKiBvYnNlcnZhYmxlLm9uKCdzdW0nLCBvblN1bUNoYW5nZSk7XG4gKlxuICogLy8gdXBkYXRlXG4gKiBvYnNlcnZhYmxlLmEgPSAxMDA7IC8vIG5vdGhpbmcgcmVhY3Rpb24gYmVjYXVzZSBvZiBubyBjaGFuZ2UgcHJvcGVydGllcy5cbiAqIG9ic2VydmFibGUuYSA9IDIwMDtcbiAqXG4gKiAvLyBjb25zb2xlIG91dCBmcm9tIGBhc3luY2AgZXZlbnQgbG9vcC5cbiAqIC8vID0+ICdzdW0gY2hhbmdlZCBmcm9tIDMwMCB0byA0MDAuJ1xuICogYGBgXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBPYnNlcnZhYmxlT2JqZWN0IGltcGxlbWVudHMgSU9ic2VydmFibGUge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfaW50ZXJuYWxdOiBJbnRlcm5hbFByb3BzO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBzdGF0ZS4gZGVmYXVsdDogW1tPYnNlcnZhYmxlU3RhdGUuQUNUSVZFXV1cbiAgICAgKiAgLSBgamFgIOWIneacn+eKtuaFiyDml6Llrpo6IFtbT2JzZXJ2YWJsZVN0YXRlLkFDVElWRV1dXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3RhdGUgPSBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFKSB7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIE9ic2VydmFibGVPYmplY3QsIHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbDogSW50ZXJuYWxQcm9wcyA9IHtcbiAgICAgICAgICAgIHN0YXRlLFxuICAgICAgICAgICAgY2hhbmdlTWFwOiBuZXcgTWFwKCksXG4gICAgICAgICAgICBicm9rZXI6IG5ldyBFdmVudEJyb2tlclByb3h5PHRoaXM+KCksXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBfaW50ZXJuYWwsIHsgdmFsdWU6IE9iamVjdC5zZWFsKGludGVybmFsKSB9KTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eSh0aGlzLCBfcHJveHlIYW5kbGVyKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJT2JzZXJ2YWJsZVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBwcm9wZXJ0eSBjaGFuZ2UocykuXG4gICAgICogQGphIOODl+ODreODkeODhuOCo+WkieabtOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnR5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jg5fjg63jg5Hjg4bjgqNcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBwcm9wZXJ0eSBjaGFuZ2UuXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbjxLIGV4dGVuZHMgT2JzZXJ2YWJsZUtleXM8dGhpcz4+KHByb3BlcnR5OiBLIHwgS1tdLCBsaXN0ZW5lcjogKG5ld1ZhbHVlOiB0aGlzW0tdLCBvbGRWYWx1ZTogdGhpc1tLXSwga2V5OiBLKSA9PiBhbnkpOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCB7IGNoYW5nZU1hcCwgYnJva2VyIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGJyb2tlci5nZXQoKS5vbihwcm9wZXJ0eSwgbGlzdGVuZXIpO1xuICAgICAgICBpZiAoMCA8IGNoYW5nZU1hcC5zaXplKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wcyA9IGlzQXJyYXkocHJvcGVydHkpID8gcHJvcGVydHkgOiBbcHJvcGVydHldO1xuICAgICAgICAgICAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BzKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlTWFwLmhhcyhwcm9wKSB8fCBjaGFuZ2VNYXAuc2V0KHByb3AsIHRoaXNbcHJvcF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIHByb3BlcnR5IGNoYW5nZShzKS5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5aSJ5pu06LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydHlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eS5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm6Kej6ZmkXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgcHJvcGVydHkgY2hhbmdlLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvZmY8SyBleHRlbmRzIE9ic2VydmFibGVLZXlzPHRoaXM+Pihwcm9wZXJ0eT86IEsgfCBLW10sIGxpc3RlbmVyPzogKG5ld1ZhbHVlOiB0aGlzW0tdLCBvbGRWYWx1ZTogdGhpc1tLXSwga2V5OiBLKSA9PiBhbnkpOiB2b2lkIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmJyb2tlci5nZXQoKS5vZmYocHJvcGVydHksIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3VzcGVuZCBvciBkaXNhYmxlIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44K144K544Oa44Oz44OJXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm9SZWNvcmRcbiAgICAgKiAgLSBgZW5gIGB0cnVlYDogbm90IHJlY29yZGluZyBwcm9wZXJ0eSBjaGFuZ2VzIGFuZCBjbGVhciBjaGFuZ2VzLiAvIGBmYWxzZWA6IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkIGFuZCBmaXJlZCB3aGVuIFtbcmVzdW1lXV0oKSBjYWxsZGVkLiAoZGVmYXVsdClcbiAgICAgKiAgLSBgamFgIGB0cnVlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044KC6KiY6Yyy44Gb44GaLCDnj77lnKjjga7oqJjpjLLjgoLnoLTmo4QgLyBgZmFsc2VgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7Tjga/oqJjpjLLjgZXjgowsIFtbcmVzdW1lXV0oKSDmmYLjgavnmbrngavjgZnjgosgKOaXouWumilcbiAgICAgKi9cbiAgICBzdXNwZW5kKG5vUmVjb3JkID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLnN0YXRlID0gbm9SZWNvcmQgPyBPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgOiBPYnNlcnZhYmxlU3RhdGUuU1VTRVBOREVEO1xuICAgICAgICBpZiAobm9SZWNvcmQpIHtcbiAgICAgICAgICAgIHRoaXNbX2ludGVybmFsXS5jaGFuZ2VNYXAuY2xlYXIoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzdW1lIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44Oq44K444Ol44O844OgXG4gICAgICovXG4gICAgcmVzdW1lKCk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgIT09IGludGVybmFsLnN0YXRlKSB7XG4gICAgICAgICAgICBpbnRlcm5hbC5zdGF0ZSA9IE9ic2VydmFibGVTdGF0ZS5BQ1RJVkU7XG4gICAgICAgICAgICBwb3N0KCgpID0+IHRoaXNbX25vdGlmeUNoYW5nZXNdKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBvYnNlcnZhdGlvbiBzdGF0ZVxuICAgICAqIEBqYSDos7zoqq3lj6/og73nirbmhYtcbiAgICAgKi9cbiAgICBnZXRPYnNlcnZhYmxlU3RhdGUoKTogT2JzZXJ2YWJsZVN0YXRlIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2ludGVybmFsXS5zdGF0ZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBzdGF0aWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgW1tPYnNlcnZhYmxlT2JqZWN0XV0gZnJvbSBhbnkgb2JqZWN0LlxuICAgICAqIEBqYSDku7vmhI/jga7jgqrjg5bjgrjjgqfjgq/jg4jjgYvjgokgW1tPYnNlcnZhYmxlT2JqZWN0XV0g44KS55Sf5oiQXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNvbnN0IG9ic2VydmFibGUgPSBPYnNlcnZhYmxlT2JqZWN0LmZyb20oeyBhOiAxLCBiOiAxIH0pO1xuICAgICAqIGZ1bmN0aW9uIG9uTnVtQ2hhbmdlKG5ld1ZhbHVlOiBudW1iZXIsIG9sZFZhbHVlOiBudW1iZXIsIGtleTogc3RyaW5nKSB7XG4gICAgICogICBjb25zb2xlLmxvZyhgJHtrZXl9IGNoYW5nZWQgZnJvbSAke29sZFZhbHVlfSB0byAke25ld1ZhbHVlfS5gKTtcbiAgICAgKiB9XG4gICAgICogb2JzZXJ2YWJsZS5vbihbJ2EnLCAnYiddLCBvbk51bUNoYW5nZSk7XG4gICAgICpcbiAgICAgKiAvLyB1cGRhdGVcbiAgICAgKiBvYnNlcnZhYmxlLmEgPSAxMDA7XG4gICAgICogb2JzZXJ2YWJsZS5iID0gMjAwO1xuICAgICAqXG4gICAgICogLy8gY29uc29sZSBvdXQgZnJvbSBgYXN5bmNgIGV2ZW50IGxvb3AuXG4gICAgICogLy8gPT4gJ2EgY2hhbmdlZCBmcm9tIDEgdG8gMTAwLidcbiAgICAgKiAvLyA9PiAnYiBjaGFuZ2VkIGZyb20gMSB0byAyMDAuJ1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMge30+KHNyYzogVCk6IE9ic2VydmFibGVPYmplY3QgJiBUIHtcbiAgICAgICAgY29uc3Qgb2JzZXJ2YWJsZSA9IGRlZXBNZXJnZShuZXcgY2xhc3MgZXh0ZW5kcyBPYnNlcnZhYmxlT2JqZWN0IHsgfShPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQpLCBzcmMpO1xuICAgICAgICBvYnNlcnZhYmxlLnJlc3VtZSgpO1xuICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcm90ZWN0ZWQgbWVodG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBGb3JjZSBub3RpZnkgcHJvcGVydHkgY2hhbmdlKHMpIGluIHNwaXRlIG9mIGFjdGl2ZSBzdGF0ZS5cbiAgICAgKiBAamEg44Ki44Kv44OG44Kj44OW54q25oWL44Gr44GL44GL44KP44KJ44Ga5by35Yi255qE44Gr44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44KS55m66KGMXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG5vdGlmeSguLi5wcm9wZXJ0aWVzOiBzdHJpbmdbXSk6IHZvaWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBpZiAoMCA9PT0gcHJvcGVydGllcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB7IGNoYW5nZU1hcCB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCBrZXlWYWx1ZSA9IG5ldyBNYXA8UHJvcGVydHlLZXksIFthbnksIGFueV0+KCk7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gdGhpc1trZXldO1xuICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBjaGFuZ2VNYXAuaGFzKGtleSkgPyBjaGFuZ2VNYXAuZ2V0KGtleSkgOiBuZXdWYWx1ZTtcbiAgICAgICAgICAgIGtleVZhbHVlLnNldChrZXksIFtuZXdWYWx1ZSwgb2xkVmFsdWVdKTtcbiAgICAgICAgfVxuICAgICAgICAwIDwga2V5VmFsdWUuc2l6ZSAmJiB0aGlzW19ub3RpZnldKGtleVZhbHVlKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1laHRvZHM6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX3N0b2NrQ2hhbmdlXShwOiBzdHJpbmcsIG9sZFZhbHVlOiBhbnkpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZSwgY2hhbmdlTWFwLCBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKDAgPT09IGNoYW5nZU1hcC5zaXplKSB7XG4gICAgICAgICAgICBjaGFuZ2VNYXAuc2V0KHAsIG9sZFZhbHVlKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgayBvZiBicm9rZXIuZ2V0KCkuY2hhbm5lbHMoKSkge1xuICAgICAgICAgICAgICAgIGNoYW5nZU1hcC5oYXMoaykgfHwgY2hhbmdlTWFwLnNldChrLCB0aGlzW2tdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFID09PSBzdGF0ZSkge1xuICAgICAgICAgICAgICAgIHBvc3QoKCkgPT4gdGhpc1tfbm90aWZ5Q2hhbmdlc10oKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjaGFuZ2VNYXAuaGFzKHApIHx8IGNoYW5nZU1hcC5zZXQocCwgb2xkVmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19ub3RpZnlDaGFuZ2VzXSgpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZSwgY2hhbmdlTWFwIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFICE9PSBzdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGtleVZhbHVlUGFpcnMgPSBuZXcgTWFwPFByb3BlcnR5S2V5LCBbYW55LCBhbnldPigpO1xuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIG9sZFZhbHVlXSBvZiBjaGFuZ2VNYXApIHtcbiAgICAgICAgICAgIGNvbnN0IGN1clZhbHVlID0gdGhpc1trZXldO1xuICAgICAgICAgICAgaWYgKG9sZFZhbHVlICE9PSBjdXJWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGtleVZhbHVlUGFpcnMuc2V0KGtleSwgW2N1clZhbHVlLCBvbGRWYWx1ZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXNbX25vdGlmeV0oa2V5VmFsdWVQYWlycyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19ub3RpZnldKGtleVZhbHVlOiBNYXA8UHJvcGVydHlLZXksIFthbnksIGFueV0+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgY2hhbmdlTWFwLCBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY2hhbmdlTWFwLmNsZWFyKCk7XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVzXSBvZiBrZXlWYWx1ZSkge1xuICAgICAgICAgICAgKGJyb2tlci5nZXQoKSBhcyBhbnkpLnB1Ymxpc2goa2V5LCAuLi52YWx1ZXMsIGtleSk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBwcmVmZXItcmVzdC1wYXJhbXMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuaW1wb3J0IHtcbiAgICBXcml0YWJsZSxcbiAgICBpc051bWJlcixcbiAgICB2ZXJpZnksXG4gICAgcG9zdCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiB9IGZyb20gJ0BjZHAvZXZlbnQtcHVibGlzaGVyJztcbmltcG9ydCB7XG4gICAgRXZlbnRCcm9rZXJQcm94eSxcbiAgICBfaW50ZXJuYWwsXG4gICAgX25vdGlmeSxcbiAgICBfc3RvY2tDaGFuZ2UsXG4gICAgX25vdGlmeUNoYW5nZXMsXG4gICAgdmVyaWZ5T2JzZXJ2YWJsZSxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlU3RhdGUsIElPYnNlcnZhYmxlIH0gZnJvbSAnLi9jb21tb24nO1xuXG4vKipcbiAqIEBlbiBBcnJheSBjaGFuZ2UgdHlwZSBpbmZvcm1hdGlvbi4gPGJyPlxuICogICAgIFRoZSB2YWx1ZSBpcyBzdWl0YWJsZSBmb3IgdGhlIG51bWJlciBvZiBmbHVjdHVhdGlvbiBvZiB0aGUgZWxlbWVudC5cbiAqIEBqYSDphY3liJflpInmm7TpgJrnn6Xjga7jgr/jgqTjg5cgPGJyPlxuICogICAgIOWApOOBr+imgee0oOOBruWil+a4m+aVsOOBq+ebuOW9k1xuICpcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQXJyYXlDaGFuZ2VUeXBlIHtcbiAgICBSRU1PVkUgPSAtMSxcbiAgICBVUERBVEUgPSAwLFxuICAgIElOU0VSVCA9IDEsXG59XG5cbi8qKlxuICogQGVuIEFycmF5IGNoYW5nZSByZWNvcmQgaW5mb3JtYXRpb24uXG4gKiBAamEg6YWN5YiX5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXJyYXlDaGFuZ2VSZWNvcmQ8VD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgY2hhbmdlIHR5cGUgaW5mb3JtYXRpb24uXG4gICAgICogQGphIOmFjeWIl+WkieabtOaDheWgseOBruitmOWIpeWtkFxuICAgICAqL1xuICAgIHJlYWRvbmx5IHR5cGU6IEFycmF5Q2hhbmdlVHlwZTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgY2hhbmdlIHR5cGUgaW5mb3JtYXRpb24uIDxicj5cbiAgICAgKiAgICAg4oC7IFtBdHRlbnRpb25dIFRoZSBpbmRleCB3aWxsIGJlIGRpZmZlcmVudCBmcm9tIHRoZSBhY3R1YWwgbG9jYXRpb24gd2hlbiBhcnJheSBzaXplIGNoYW5nZWQgYmVjYXVzZSB0aGF0IGRldGVybWluZXMgZWxlbWVudCBvcGVyYXRpb24gdW5pdC5cbiAgICAgKiBAamEg5aSJ5pu044GM55m655Sf44GX44Gf6YWN5YiX5YaF44Gu5L2N572u44GuIGluZGV4IDxicj5cbiAgICAgKiAgICAg4oC7IFvms6jmhI9dIOOCquODmuODrOODvOOCt+ODp+ODs+WNmOS9jeOBriBpbmRleCDjgajjgarjgoosIOimgee0oOOBjOWil+a4m+OBmeOCi+WgtOWQiOOBr+Wun+mam+OBruS9jee9ruOBqOeVsOOBquOCi+OBk+OBqOOBjOOBguOCi1xuICAgICAqL1xuICAgIHJlYWRvbmx5IGluZGV4OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTmV3IGVsZW1lbnQncyB2YWx1ZS5cbiAgICAgKiBAamEg6KaB57Sg44Gu5paw44GX44GE5YCkXG4gICAgICovXG4gICAgcmVhZG9ubHkgbmV3VmFsdWU/OiBUO1xuXG4gICAgLyoqXG4gICAgICogQGVuIE9sZCBlbGVtZW50J3MgdmFsdWUuXG4gICAgICogQGphIOimgee0oOOBruWPpOOBhOWApFxuICAgICAqL1xuICAgIHJlYWRvbmx5IG9sZFZhbHVlPzogVDtcbn1cbnR5cGUgTXV0YWJsZUNoYW5nZVJlY29yZDxUPiA9IFdyaXRhYmxlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+PjtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBJQXJyYXlDaGFuZ2VFdmVudDxUPiB7XG4gICAgJ0AnOiBbQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXV07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBJbnRlcm5hbFByb3BzPFQgPSBhbnk+IHtcbiAgICBzdGF0ZTogT2JzZXJ2YWJsZVN0YXRlO1xuICAgIGJ5TWV0aG9kOiBib29sZWFuO1xuICAgIHJlY29yZHM6IE11dGFibGVDaGFuZ2VSZWNvcmQ8VD5bXTtcbiAgICByZWFkb25seSBpbmRleGVzOiBTZXQ8bnVtYmVyPjtcbiAgICByZWFkb25seSBicm9rZXI6IEV2ZW50QnJva2VyUHJveHk8SUFycmF5Q2hhbmdlRXZlbnQ8VD4+O1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcHJveHlIYW5kbGVyOiBQcm94eUhhbmRsZXI8T2JzZXJ2YWJsZUFycmF5PiA9IHtcbiAgICBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHAsIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0YXJnZXRbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA9PT0gaW50ZXJuYWwuc3RhdGUgfHwgaW50ZXJuYWwuYnlNZXRob2QgfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhdHRyaWJ1dGVzLCAndmFsdWUnKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtwXTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBhdHRyaWJ1dGVzLnZhbHVlO1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZXFlcWVxXG4gICAgICAgIGlmICgnbGVuZ3RoJyA9PT0gcCAmJiBuZXdWYWx1ZSAhPSBvbGRWYWx1ZSkgeyAvLyBEbyBOT1QgdXNlIHN0cmljdCBpbmVxdWFsaXR5ICghPT0pXG4gICAgICAgICAgICBjb25zdCBvbGRMZW5ndGggPSBvbGRWYWx1ZSA+Pj4gMDtcbiAgICAgICAgICAgIGNvbnN0IG5ld0xlbmd0aCA9IG5ld1ZhbHVlID4+PiAwO1xuICAgICAgICAgICAgY29uc3Qgc3RvY2sgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyYXAgPSBuZXdMZW5ndGggPCBvbGRMZW5ndGggJiYgdGFyZ2V0LnNsaWNlKG5ld0xlbmd0aCk7XG4gICAgICAgICAgICAgICAgaWYgKHNjcmFwKSB7IC8vIG5ld0xlbmd0aCA8IG9sZExlbmd0aFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gb2xkTGVuZ3RoOyAtLWkgPj0gbmV3TGVuZ3RoOykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRSwgaSwgdW5kZWZpbmVkLCBzY3JhcFtpIC0gbmV3TGVuZ3RoXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgIC8vIG9sZExlbmd0aCA8IG5ld0xlbmd0aFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gb2xkTGVuZ3RoOyBpIDwgbmV3TGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFtfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGkgLyosIHVuZGVmaW5lZCwgdW5kZWZpbmVkICovKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcyk7XG4gICAgICAgICAgICByZXN1bHQgJiYgc3RvY2soKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSBpZiAobmV3VmFsdWUgIT09IG9sZFZhbHVlICYmIGlzVmFsaWRBcnJheUluZGV4KHApKSB7XG4gICAgICAgICAgICBjb25zdCBpID0gcCBhcyBhbnkgPj4+IDA7XG4gICAgICAgICAgICBjb25zdCB0eXBlOiBBcnJheUNoYW5nZVR5cGUgPSBOdW1iZXIoaSA+PSB0YXJnZXQubGVuZ3RoKTsgLy8gSU5TRVJUIG9yIFVQREFURVxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHAsIGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgcmVzdWx0ICYmIHRhcmdldFtfc3RvY2tDaGFuZ2VdKHR5cGUsIGksIG5ld1ZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZGVsZXRlUHJvcGVydHkodGFyZ2V0LCBwKSB7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGFyZ2V0W19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgPT09IGludGVybmFsLnN0YXRlIHx8IGludGVybmFsLmJ5TWV0aG9kIHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGFyZ2V0LCBwKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVsZXRlUHJvcGVydHkodGFyZ2V0LCBwKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtwXTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gUmVmbGVjdC5kZWxldGVQcm9wZXJ0eSh0YXJnZXQsIHApO1xuICAgICAgICByZXN1bHQgJiYgaXNWYWxpZEFycmF5SW5kZXgocCkgJiYgdGFyZ2V0W19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlVQREFURSwgcCBhcyBhbnkgPj4+IDAsIHVuZGVmaW5lZCwgb2xkVmFsdWUpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG59O1xuT2JqZWN0LmZyZWV6ZShfcHJveHlIYW5kbGVyKTtcblxuLyoqIEBpbnRlcm5hbCB2YWxpZCBhcnJheSBpbmRleCBoZWxwZXIgKi9cbmZ1bmN0aW9uIGlzVmFsaWRBcnJheUluZGV4PFQ+KGluZGV4OiBhbnkpOiBib29sZWFuIHtcbiAgICBjb25zdCBzID0gU3RyaW5nKGluZGV4KTtcbiAgICBjb25zdCBuID0gTWF0aC50cnVuYyhzIGFzIGFueSk7XG4gICAgcmV0dXJuIFN0cmluZyhuKSA9PT0gcyAmJiAwIDw9IG4gJiYgbiA8IDB4RkZGRkZGRkY7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBpbmRleCBtYW5hZ2VtZW50ICovXG5mdW5jdGlvbiBmaW5kUmVsYXRlZENoYW5nZUluZGV4PFQ+KHJlY29yZHM6IE11dGFibGVDaGFuZ2VSZWNvcmQ8VD5bXSwgdHlwZTogQXJyYXlDaGFuZ2VUeXBlLCBpbmRleDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBjb25zdCBjaGVja1R5cGUgPSB0eXBlID09PSBBcnJheUNoYW5nZVR5cGUuSU5TRVJUXG4gICAgICAgID8gKHQ6IEFycmF5Q2hhbmdlVHlwZSkgPT4gdCA9PT0gQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRVxuICAgICAgICA6ICh0OiBBcnJheUNoYW5nZVR5cGUpID0+IHQgIT09IEFycmF5Q2hhbmdlVHlwZS5SRU1PVkVcbiAgICAgICAgO1xuXG4gICAgZm9yIChsZXQgaSA9IHJlY29yZHMubGVuZ3RoOyAtLWkgPj0gMDspIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSByZWNvcmRzW2ldO1xuICAgICAgICBpZiAodmFsdWUuaW5kZXggPT09IGluZGV4ICYmIGNoZWNrVHlwZSh2YWx1ZS50eXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWUuaW5kZXggPCBpbmRleCAmJiBCb29sZWFuKHZhbHVlLnR5cGUpKSB7IC8vIFJFTU9WRSBvciBJTlNFUlRcbiAgICAgICAgICAgIGluZGV4IC09IHZhbHVlLnR5cGU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIGFycmF5IGNsYXNzIHdoaWNoIGNoYW5nZSBjYW4gYmUgb2JzZXJ2ZWQuXG4gKiBAamEg5aSJ5pu055uj6KaW5Y+v6IO944Gq6YWN5YiX44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogY29uc3Qgb2JzQXJyYXkgPSBPYnNlcnZhYmxlQXJyYXkuZnJvbShbJ2EnLCAnYicsICdjJ10pO1xuICpcbiAqIGZ1bmN0aW9uIG9uQ2hhbmdlQXJyYXkocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmRbXSkge1xuICogICBjb25zb2xlLmxvZyhyZWNvcmRzKTtcbiAqICAgLy8gIFtcbiAqICAgLy8gICAgeyB0eXBlOiAxLCBpbmRleDogMywgbmV3VmFsdWU6ICd4Jywgb2xkVmFsdWU6IHVuZGVmaW5lZCB9LFxuICogICAvLyAgICB7IHR5cGU6IDEsIGluZGV4OiA0LCBuZXdWYWx1ZTogJ3knLCBvbGRWYWx1ZTogdW5kZWZpbmVkIH0sXG4gKiAgIC8vICAgIHsgdHlwZTogMSwgaW5kZXg6IDUsIG5ld1ZhbHVlOiAneicsIG9sZFZhbHVlOiB1bmRlZmluZWQgfVxuICogICAvLyAgXVxuICogfVxuICogb2JzQXJyYXkub24ob25DaGFuZ2VBcnJheSk7XG4gKlxuICogZnVuY3Rpb24gYWRkWFlaKCkge1xuICogICBvYnNBcnJheS5wdXNoKCd4JywgJ3knLCAneicpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBPYnNlcnZhYmxlQXJyYXk8VCA9IGFueT4gZXh0ZW5kcyBBcnJheTxUPiBpbXBsZW1lbnRzIElPYnNlcnZhYmxlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX2ludGVybmFsXTogSW50ZXJuYWxQcm9wczxUPjtcblxuICAgIC8qKiBAZmluYWwgY29uc3RydWN0b3IgKi9cbiAgICBwcml2YXRlIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlciguLi5hcmd1bWVudHMpO1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBPYnNlcnZhYmxlQXJyYXksIHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbDogSW50ZXJuYWxQcm9wczxUPiA9IHtcbiAgICAgICAgICAgIHN0YXRlOiBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFLFxuICAgICAgICAgICAgYnlNZXRob2Q6IGZhbHNlLFxuICAgICAgICAgICAgcmVjb3JkczogW10sXG4gICAgICAgICAgICBpbmRleGVzOiBuZXcgU2V0KCksXG4gICAgICAgICAgICBicm9rZXI6IG5ldyBFdmVudEJyb2tlclByb3h5PElBcnJheUNoYW5nZUV2ZW50PFQ+PigpLFxuICAgICAgICB9O1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgX2ludGVybmFsLCB7IHZhbHVlOiBPYmplY3Quc2VhbChpbnRlcm5hbCkgfSk7XG4gICAgICAgIGNvbnN0IGFyZ0xlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGlmICgxID09PSBhcmdMZW5ndGggJiYgaXNOdW1iZXIoYXJndW1lbnRzWzBdKSkge1xuICAgICAgICAgICAgY29uc3QgbGVuID0gYXJndW1lbnRzWzBdID4+PiAwO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuSU5TRVJULCBpIC8qLCB1bmRlZmluZWQgKi8pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKDAgPCBhcmdMZW5ndGgpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJnTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLklOU0VSVCwgaSwgYXJndW1lbnRzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFByb3h5KHRoaXMsIF9wcm94eUhhbmRsZXIpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElPYnNlcnZhYmxlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGFycmF5IGNoYW5nZShzKS5cbiAgICAgKiBAamEg6YWN5YiX5aSJ5pu06LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBhcnJheSBjaGFuZ2UuXG4gICAgICogIC0gYGphYCDphY3liJflpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbihsaXN0ZW5lcjogKHJlY29yZHM6IEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10pID0+IGFueSk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzW19pbnRlcm5hbF0uYnJva2VyLmdldCgpLm9uKCdAJywgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBhcnJheSBjaGFuZ2UocykuXG4gICAgICogQGphIOmFjeWIl+WkieabtOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYXJyYXkgY2hhbmdlLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOmFjeWIl+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvZmYobGlzdGVuZXI/OiAocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSkgPT4gYW55KTogdm9pZCB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHRoaXNbX2ludGVybmFsXS5icm9rZXIuZ2V0KCkub2ZmKCdAJywgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdXNwZW5kIG9yIGRpc2FibGUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jgrXjgrnjg5rjg7Pjg4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub1JlY29yZFxuICAgICAqICAtIGBlbmAgYHRydWVgOiBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMgYW5kIGNsZWFyIGNoYW5nZXMuIC8gYGZhbHNlYDogcHJvcGVydHkgY2hhbmdlcyBhcmUgcmVjb3JkZWQgYW5kIGZpcmVkIHdoZW4gW1tyZXN1bWVdXSgpIGNhbGxkZWQuIChkZWZhdWx0KVxuICAgICAqICAtIGBqYWAgYHRydWVgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7TjgoLoqJjpjLLjgZvjgZosIOePvuWcqOOBruiomOmMsuOCguegtOajhCAvIGBmYWxzZWA6IOODl+ODreODkeODhuOCo+WkieabtOOBr+iomOmMsuOBleOCjCwgW1tyZXN1bWVdXSgpIOaZguOBq+eZuueBq+OBmeOCiyAo5pei5a6aKVxuICAgICAqL1xuICAgIHN1c3BlbmQobm9SZWNvcmQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uc3RhdGUgPSBub1JlY29yZCA/IE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA6IE9ic2VydmFibGVTdGF0ZS5TVVNFUE5ERUQ7XG4gICAgICAgIGlmIChub1JlY29yZCkge1xuICAgICAgICAgICAgdGhpc1tfaW50ZXJuYWxdLnJlY29yZHMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzdW1lIG9mIHRoZSBldmVudCBzdWJzY3JpcHRpb24gc3RhdGUuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreeKtuaFi+OBruODquOCuOODpeODvOODoFxuICAgICAqL1xuICAgIHJlc3VtZSgpOiB0aGlzIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgaW50ZXJuYWwuc3RhdGUgPSBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFO1xuICAgICAgICAgICAgcG9zdCgoKSA9PiB0aGlzW19ub3RpZnlDaGFuZ2VzXSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gb2JzZXJ2YXRpb24gc3RhdGVcbiAgICAgKiBAamEg6LO86Kqt5Y+v6IO954q25oWLXG4gICAgICovXG4gICAgZ2V0T2JzZXJ2YWJsZVN0YXRlKCk6IE9ic2VydmFibGVTdGF0ZSB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzW19pbnRlcm5hbF0uc3RhdGU7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3ZlcnJpZGU6IEFycmF5IG1ldGhvZHNcblxuICAgIC8qKlxuICAgICAqIFNvcnRzIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSBjb21wYXJlRm4gVGhlIG5hbWUgb2YgdGhlIGZ1bmN0aW9uIHVzZWQgdG8gZGV0ZXJtaW5lIHRoZSBvcmRlciBvZiB0aGUgZWxlbWVudHMuIElmIG9taXR0ZWQsIHRoZSBlbGVtZW50cyBhcmUgc29ydGVkIGluIGFzY2VuZGluZywgQVNDSUkgY2hhcmFjdGVyIG9yZGVyLlxuICAgICAqL1xuICAgIHNvcnQoY29tcGFyYXRvcj86IChsaHM6IFQsIHJoczogVCkgPT4gbnVtYmVyKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCBvbGQgPSBBcnJheS5mcm9tKHRoaXMpO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLnNvcnQoY29tcGFyYXRvcik7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gZmFsc2U7XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IGludGVybmFsLnN0YXRlKSB7XG4gICAgICAgICAgICBjb25zdCBsZW4gPSBvbGQubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZhbHVlID0gb2xkW2ldO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gdGhpc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUgIT09IG9sZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuVVBEQVRFLCBpLCBuZXdWYWx1ZSwgb2xkVmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgZWxlbWVudHMgZnJvbSBhbiBhcnJheSBhbmQsIGlmIG5lY2Vzc2FyeSwgaW5zZXJ0cyBuZXcgZWxlbWVudHMgaW4gdGhlaXIgcGxhY2UsIHJldHVybmluZyB0aGUgZGVsZXRlZCBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gc3RhcnQgVGhlIHplcm8tYmFzZWQgbG9jYXRpb24gaW4gdGhlIGFycmF5IGZyb20gd2hpY2ggdG8gc3RhcnQgcmVtb3ZpbmcgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIGRlbGV0ZUNvdW50IFRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmVtb3ZlLlxuICAgICAqL1xuICAgIHNwbGljZShzdGFydDogbnVtYmVyLCBkZWxldGVDb3VudD86IG51bWJlcik6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGVsZW1lbnRzIGZyb20gYW4gYXJyYXkgYW5kLCBpZiBuZWNlc3NhcnksIGluc2VydHMgbmV3IGVsZW1lbnRzIGluIHRoZWlyIHBsYWNlLCByZXR1cm5pbmcgdGhlIGRlbGV0ZWQgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIHN0YXJ0IFRoZSB6ZXJvLWJhc2VkIGxvY2F0aW9uIGluIHRoZSBhcnJheSBmcm9tIHdoaWNoIHRvIHN0YXJ0IHJlbW92aW5nIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSBkZWxldGVDb3VudCBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHJlbW92ZS5cbiAgICAgKiBAcGFyYW0gaXRlbXMgRWxlbWVudHMgdG8gaW5zZXJ0IGludG8gdGhlIGFycmF5IGluIHBsYWNlIG9mIHRoZSBkZWxldGVkIGVsZW1lbnRzLlxuICAgICAqL1xuICAgIHNwbGljZShzdGFydDogbnVtYmVyLCBkZWxldGVDb3VudDogbnVtYmVyLCAuLi5pdGVtczogVFtdKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIHNwbGljZShzdGFydDogbnVtYmVyLCBkZWxldGVDb3VudD86IG51bWJlciwgLi4uaXRlbXM6IFRbXSk6IE9ic2VydmFibGVBcnJheTxUPiB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCBvbGRMZW4gPSB0aGlzLmxlbmd0aDtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSB0cnVlO1xuICAgICAgICBjb25zdCByZXN1bHQgPSAoc3VwZXIuc3BsaWNlIGFzIGFueSkoLi4uYXJndW1lbnRzKSBhcyBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gZmFsc2U7XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IGludGVybmFsLnN0YXRlKSB7XG4gICAgICAgICAgICBzdGFydCA9IE1hdGgudHJ1bmMoc3RhcnQpO1xuICAgICAgICAgICAgY29uc3QgZnJvbSA9IHN0YXJ0IDwgMCA/IE1hdGgubWF4KG9sZExlbiArIHN0YXJ0LCAwKSA6IE1hdGgubWluKHN0YXJ0LCBvbGRMZW4pO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHJlc3VsdC5sZW5ndGg7IC0taSA+PSAwOykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuUkVNT1ZFLCBmcm9tICsgaSwgdW5kZWZpbmVkLCByZXN1bHRbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbGVuID0gaXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuSU5TRVJULCBmcm9tICsgaSwgaXRlbXNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyB0aGUgZmlyc3QgZWxlbWVudCBmcm9tIGFuIGFycmF5IGFuZCByZXR1cm5zIGl0LlxuICAgICAqL1xuICAgIHNoaWZ0KCk6IFQgfCB1bmRlZmluZWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY29uc3Qgb2xkTGVuID0gdGhpcy5sZW5ndGg7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc3VwZXIuc2hpZnQoKTtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSBmYWxzZTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gaW50ZXJuYWwuc3RhdGUgJiYgdGhpcy5sZW5ndGggPCBvbGRMZW4pIHtcbiAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuUkVNT1ZFLCAwLCB1bmRlZmluZWQsIHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbnNlcnRzIG5ldyBlbGVtZW50cyBhdCB0aGUgc3RhcnQgb2YgYW4gYXJyYXkuXG4gICAgICogQHBhcmFtIGl0ZW1zICBFbGVtZW50cyB0byBpbnNlcnQgYXQgdGhlIHN0YXJ0IG9mIHRoZSBBcnJheS5cbiAgICAgKi9cbiAgICB1bnNoaWZ0KC4uLml0ZW1zOiBUW10pOiBudW1iZXIge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSB0cnVlO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzdXBlci51bnNoaWZ0KC4uLml0ZW1zKTtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSBmYWxzZTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGxlbiA9IGl0ZW1zLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLklOU0VSVCwgaSwgaXRlbXNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbHMgYSBkZWZpbmVkIGNhbGxiYWNrIGZ1bmN0aW9uIG9uIGVhY2ggZWxlbWVudCBvZiBhbiBhcnJheSwgYW5kIHJldHVybnMgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgcmVzdWx0cy5cbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tmbiBBIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyB1cCB0byB0aHJlZSBhcmd1bWVudHMuIFRoZSBtYXAgbWV0aG9kIGNhbGxzIHRoZSBjYWxsYmFja2ZuIGZ1bmN0aW9uIG9uZSB0aW1lIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIGFycmF5LlxuICAgICAqIEBwYXJhbSB0aGlzQXJnIEFuIG9iamVjdCB0byB3aGljaCB0aGUgdGhpcyBrZXl3b3JkIGNhbiByZWZlciBpbiB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbi4gSWYgdGhpc0FyZyBpcyBvbWl0dGVkLCB1bmRlZmluZWQgaXMgdXNlZCBhcyB0aGUgdGhpcyB2YWx1ZS5cbiAgICAgKi9cbiAgICBtYXA8VT4oY2FsbGJhY2tmbjogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVLCB0aGlzQXJnPzogYW55KTogT2JzZXJ2YWJsZUFycmF5PFU+IHtcbiAgICAgICAgLypcbiAgICAgICAgICogW05PVEVdIG9yaWdpbmFsIGltcGxlbWVudCBpcyB2ZXJ5IHZlcnkgaGlnaC1jb3N0LlxuICAgICAgICAgKiAgICAgICAgc28gaXQncyBjb252ZXJ0ZWQgbmF0aXZlIEFycmF5IG9uY2UsIGFuZCByZXN0b3JlZC5cbiAgICAgICAgICpcbiAgICAgICAgICogcmV0dXJuIChzdXBlci5tYXAgYXMgYW55KSguLi5hcmd1bWVudHMpO1xuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIE9ic2VydmFibGVBcnJheS5mcm9tKFsuLi50aGlzXS5tYXAoY2FsbGJhY2tmbiwgdGhpc0FyZykpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWVodG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfc3RvY2tDaGFuZ2VdKHR5cGU6IEFycmF5Q2hhbmdlVHlwZSwgaW5kZXg6IG51bWJlciwgbmV3VmFsdWU/OiBULCBvbGRWYWx1ZT86IFQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZSwgaW5kZXhlcywgcmVjb3JkcyB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCByY2kgPSBpbmRleGVzLmhhcyhpbmRleCkgPyBmaW5kUmVsYXRlZENoYW5nZUluZGV4KHJlY29yZHMsIHR5cGUsIGluZGV4KSA6IC0xO1xuICAgICAgICBjb25zdCBsZW4gPSByZWNvcmRzLmxlbmd0aDtcbiAgICAgICAgaWYgKHJjaSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCByY3QgPSByZWNvcmRzW3JjaV0udHlwZTtcbiAgICAgICAgICAgIGlmICghcmN0IC8qIFVQREFURSAqLykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZSZWNvcmQgPSByZWNvcmRzLnNwbGljZShyY2ksIDEpWzBdO1xuICAgICAgICAgICAgICAgIC8vIFVQREFURSA9PiBVUERBVEUgOiBVUERBVEVcbiAgICAgICAgICAgICAgICAvLyBVUERBVEUgPT4gUkVNT1ZFIDogSU5TRVJUXG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKHR5cGUsIGluZGV4LCBuZXdWYWx1ZSwgcHJldlJlY29yZC5vbGRWYWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IHIsIGkgPSBsZW47IC0taSA+IHJjaTspIHtcbiAgICAgICAgICAgICAgICAgICAgciA9IHJlY29yZHNbaV07XG4gICAgICAgICAgICAgICAgICAgIChyLmluZGV4ID49IGluZGV4KSAmJiAoci5pbmRleCAtPSByY3QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBwcmV2UmVjb3JkID0gcmVjb3Jkcy5zcGxpY2UocmNpLCAxKVswXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZSAhPT0gQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJTlNFUlQgPT4gVVBEQVRFIDogSU5TRVJUXG4gICAgICAgICAgICAgICAgICAgIC8vIFJFTU9WRSA9PiBJTlNFUlQgOiBVUERBVEVcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKE51bWJlcighdHlwZSksIGluZGV4LCBuZXdWYWx1ZSwgcHJldlJlY29yZC5vbGRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGluZGV4ZXMuYWRkKGluZGV4KTtcbiAgICAgICAgcmVjb3Jkc1tsZW5dID0geyB0eXBlLCBpbmRleCwgbmV3VmFsdWUsIG9sZFZhbHVlIH07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFID09PSBzdGF0ZSAmJiAwID09PSBsZW4pIHtcbiAgICAgICAgICAgIHBvc3QoKCkgPT4gdGhpc1tfbm90aWZ5Q2hhbmdlc10oKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeUNoYW5nZXNdKCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCByZWNvcmRzIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFICE9PSBzdGF0ZSB8fCAwID09PSByZWNvcmRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgciBvZiByZWNvcmRzKSB7XG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKHIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXNbX25vdGlmeV0oT2JqZWN0LmZyZWV6ZShyZWNvcmRzKSBhcyBBcnJheUNoYW5nZVJlY29yZDxUPltdKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLnJlY29yZHMgPSBbXTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeV0ocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSk6IHZvaWQge1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaW50ZXJuYWwuaW5kZXhlcy5jbGVhcigpO1xuICAgICAgICBpbnRlcm5hbC5icm9rZXIuZ2V0KCkucHVibGlzaCgnQCcsIHJlY29yZHMpO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogT3ZlcnJpZGUgcmV0dXJuIHR5cGUgb2YgcHJvdG90eXBlIG1ldGhvZHNcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBPYnNlcnZhYmxlQXJyYXk8VD4ge1xuICAgIC8qKlxuICAgICAqIENvbWJpbmVzIHR3byBvciBtb3JlIGFycmF5cy5cbiAgICAgKiBAcGFyYW0gaXRlbXMgQWRkaXRpb25hbCBpdGVtcyB0byBhZGQgdG8gdGhlIGVuZCBvZiBhcnJheTEuXG4gICAgICovXG4gICAgY29uY2F0KC4uLml0ZW1zOiBUW11bXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBDb21iaW5lcyB0d28gb3IgbW9yZSBhcnJheXMuXG4gICAgICogQHBhcmFtIGl0ZW1zIEFkZGl0aW9uYWwgaXRlbXMgdG8gYWRkIHRvIHRoZSBlbmQgb2YgYXJyYXkxLlxuICAgICAqL1xuICAgIGNvbmNhdCguLi5pdGVtczogKFQgfCBUW10pW10pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogUmV2ZXJzZXMgdGhlIGVsZW1lbnRzIGluIGFuIEFycmF5LlxuICAgICAqL1xuICAgIHJldmVyc2UoKTogdGhpcztcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgc2VjdGlvbiBvZiBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0gc3RhcnQgVGhlIGJlZ2lubmluZyBvZiB0aGUgc3BlY2lmaWVkIHBvcnRpb24gb2YgdGhlIGFycmF5LlxuICAgICAqIEBwYXJhbSBlbmQgVGhlIGVuZCBvZiB0aGUgc3BlY2lmaWVkIHBvcnRpb24gb2YgdGhlIGFycmF5LlxuICAgICAqL1xuICAgIHNsaWNlKHN0YXJ0PzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZWxlbWVudHMgb2YgYW4gYXJyYXkgdGhhdCBtZWV0IHRoZSBjb25kaXRpb24gc3BlY2lmaWVkIGluIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIGNhbGxiYWNrZm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdXAgdG8gdGhyZWUgYXJndW1lbnRzLiBUaGUgZmlsdGVyIG1ldGhvZCBjYWxscyB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbiBvbmUgdGltZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBBbiBvYmplY3QgdG8gd2hpY2ggdGhlIHRoaXMga2V5d29yZCBjYW4gcmVmZXIgaW4gdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24uIElmIHRoaXNBcmcgaXMgb21pdHRlZCwgdW5kZWZpbmVkIGlzIHVzZWQgYXMgdGhlIHRoaXMgdmFsdWUuXG4gICAgICovXG4gICAgZmlsdGVyPFMgZXh0ZW5kcyBUPihjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHZhbHVlIGlzIFMsIHRoaXNBcmc/OiBhbnkpOiBPYnNlcnZhYmxlQXJyYXk8Uz47XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZWxlbWVudHMgb2YgYW4gYXJyYXkgdGhhdCBtZWV0IHRoZSBjb25kaXRpb24gc3BlY2lmaWVkIGluIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIGNhbGxiYWNrZm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdXAgdG8gdGhyZWUgYXJndW1lbnRzLiBUaGUgZmlsdGVyIG1ldGhvZCBjYWxscyB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbiBvbmUgdGltZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBBbiBvYmplY3QgdG8gd2hpY2ggdGhlIHRoaXMga2V5d29yZCBjYW4gcmVmZXIgaW4gdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24uIElmIHRoaXNBcmcgaXMgb21pdHRlZCwgdW5kZWZpbmVkIGlzIHVzZWQgYXMgdGhlIHRoaXMgdmFsdWUuXG4gICAgICovXG4gICAgZmlsdGVyKGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYW55LCB0aGlzQXJnPzogYW55KTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xufVxuXG4vKipcbiAqIE92ZXJyaWRlIHJldHVybiB0eXBlIG9mIHN0YXRpYyBtZXRob2RzXG4gKi9cbmV4cG9ydCBkZWNsYXJlIG5hbWVzcGFjZSBPYnNlcnZhYmxlQXJyYXkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvYmplY3QuXG4gICAgICogQHBhcmFtIGFycmF5TGlrZSBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZyb208VD4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4gfCBJdGVyYWJsZTxUPik6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvYmplY3QuXG4gICAgICogQHBhcmFtIGFycmF5TGlrZSBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSBtYXBmbiBBIG1hcHBpbmcgZnVuY3Rpb24gdG8gY2FsbCBvbiBldmVyeSBlbGVtZW50IG9mIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBWYWx1ZSBvZiAndGhpcycgdXNlZCB0byBpbnZva2UgdGhlIG1hcGZuLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZyb208VCwgVT4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4gfCBJdGVyYWJsZTxUPiwgbWFwZm46ICh0aGlzOiB2b2lkLCB2OiBULCBrOiBudW1iZXIpID0+IFUsIHRoaXNBcmc/OiB1bmRlZmluZWQpOiBPYnNlcnZhYmxlQXJyYXk8VT47XG4gICAgZnVuY3Rpb24gZnJvbTxYLCBULCBVPihhcnJheUxpa2U6IEFycmF5TGlrZTxUPiB8IEl0ZXJhYmxlPFQ+LCBtYXBmbjogKHRoaXM6IFgsIHY6IFQsIGs6IG51bWJlcikgPT4gVSwgdGhpc0FyZzogWCk6IE9ic2VydmFibGVBcnJheTxVPjtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgbmV3IGFycmF5IGZyb20gYSBzZXQgb2YgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIGl0ZW1zIEEgc2V0IG9mIGVsZW1lbnRzIHRvIGluY2x1ZGUgaW4gdGhlIG5ldyBhcnJheSBvYmplY3QuXG4gICAgICovXG4gICAgZnVuY3Rpb24gb2Y8VD4oLi4uaXRlbXM6IFRbXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbn1cbiJdLCJuYW1lcyI6WyJFdmVudEJyb2tlciIsImlzU3RyaW5nIiwidmVyaWZ5IiwiaXNBcnJheSIsInBvc3QiLCJkZWVwTWVyZ2UiLCJfcHJveHlIYW5kbGVyIiwiaXNOdW1iZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7QUFFQSxJQU9BO0FBQ0EsVUFBYSxnQkFBZ0I7UUFFbEIsR0FBRztZQUNOLE9BQU8sSUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUlBLDBCQUFXLEVBQUUsQ0FBQyxDQUFDO1NBQzdEO0tBQ0o7SUFFRDtBQUNBLElBQU8sTUFBTSxTQUFT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
