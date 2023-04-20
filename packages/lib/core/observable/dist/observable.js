/*!
 * @cdp/observable 0.9.17
 *   observable utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/events')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/events'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP));
})(this, (function (exports, coreUtils, events) { 'use strict';

    /** @internal EventBrokerProxy */
    class EventBrokerProxy {
        _broker;
        get() {
            return this._broker || (this._broker = new events.EventBroker());
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
            if (!coreUtils.isString(p)) {
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
            coreUtils.verify('instanceOf', ObservableObject, this);
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
                const props = coreUtils.isArray(property) ? property : [property];
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
                void coreUtils.post(() => this[_notifyChanges]());
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
            const observable = coreUtils.deepMerge(new class extends ObservableObject {
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
                if (Object.prototype.hasOwnProperty.call(this, key)) {
                    this[_internal].changed = true;
                }
            }
            this[_notify](keyValue);
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
                    void coreUtils.post(() => this[_notifyChanges]());
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
                if (!coreUtils.deepEqual(oldValue, curValue)) {
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
            coreUtils.verify('instanceOf', ObservableArray, this);
            const internal = {
                state: "active" /* ObservableState.ACTIVE */,
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
                void coreUtils.post(() => this[_notifyChanges]());
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
                void coreUtils.post(() => this[_notifyChanges]());
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

    exports.ObservableArray = ObservableArray;
    exports.ObservableObject = ObservableObject;
    exports.isObservable = isObservable;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZS5qcyIsInNvdXJjZXMiOlsiaW50ZXJuYWwudHMiLCJjb21tb24udHMiLCJvYmplY3QudHMiLCJhcnJheS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICAgIFVua25vd25PYmplY3QsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNTeW1ib2wsXG4gICAgY2xhc3NOYW1lLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5cbi8qKiBAaW50ZXJuYWwgRXZlbnRCcm9rZXJQcm94eSAqL1xuZXhwb3J0IGNsYXNzIEV2ZW50QnJva2VyUHJveHk8RXZlbnQgZXh0ZW5kcyBvYmplY3Q+IHtcbiAgICBwcml2YXRlIF9icm9rZXI/OiBFdmVudEJyb2tlcjxFdmVudD47XG4gICAgcHVibGljIGdldCgpOiBFdmVudEJyb2tlcjxFdmVudD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYnJva2VyIHx8ICh0aGlzLl9icm9rZXIgPSBuZXcgRXZlbnRCcm9rZXIoKSk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBfaW50ZXJuYWwgICAgICA9IFN5bWJvbCgnaW50ZXJuYWwnKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IF9ub3RpZnkgICAgICAgID0gU3ltYm9sKCdub3RpZnknKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IF9zdG9ja0NoYW5nZSAgID0gU3ltYm9sKCdzdG9jay1jaGFuZ2UnKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IF9ub3RpZnlDaGFuZ2VzID0gU3ltYm9sKCdub3RpZnktY2hhbmdlcycpO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgZnVuY3Rpb24gdmVyaWZ5T2JzZXJ2YWJsZSh4OiB1bmtub3duKTogdm9pZCB8IG5ldmVyIHtcbiAgICBpZiAoIXggfHwgISh4IGFzIFVua25vd25PYmplY3QpW19pbnRlcm5hbF0pIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVGhlIG9iamVjdCBwYXNzZWQgaXMgbm90IGFuIElPYnNlcnZhYmxlLmApO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZlcmlmeVZhbGlkS2V5KGtleTogdW5rbm93bik6IHZvaWQgfCBuZXZlciB7XG4gICAgaWYgKGlzU3RyaW5nKGtleSkgfHwgaXNTeW1ib2woa2V5KSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFR5cGUgb2YgJHtjbGFzc05hbWUoa2V5KX0gaXMgbm90IGEgdmFsaWQga2V5LmApO1xufVxuIiwiaW1wb3J0IHR5cGUgeyBVbmtub3duT2JqZWN0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiwgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBfaW50ZXJuYWwgfSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gRXZlbnQgb2JzZXJ2YXRpb24gc3RhdGUgZGVmaW5pdGlvbi5cbiAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvlrprnvqlcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gT2JzZXJ2YWJsZVN0YXRlIHtcbiAgICAvKiogb2JzZXJ2YWJsZSByZWFkeSAqL1xuICAgIEFDVElWRSAgID0gJ2FjdGl2ZScsXG4gICAgLyoqIE5PVCBvYnNlcnZlZCwgYnV0IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkLiAqL1xuICAgIFNVU0VQTkRFRCA9ICdzdXNwZW5kZWQnLFxuICAgIC8qKiBOT1Qgb2JzZXJ2ZWQsIGFuZCBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMuICovXG4gICAgRElTQUJMRUQgPSAnZGlzYWJsZWQnLFxufVxuXG4vKipcbiAqIEBlbiBPYnNlcnZhYmxlIGNvbW1vbiBpbnRlcmZhY2UuXG4gKiBAamEgT2JzZXJ2YWJsZSDlhbHpgJrjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJT2JzZXJ2YWJsZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICovXG4gICAgb24oLi4uYXJnczogdW5rbm93bltdKTogU3Vic2NyaXB0aW9uO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKi9cbiAgICBvZmYoLi4uYXJnczogdW5rbm93bltdKTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdXNwZW5kIG9yIGRpc2FibGUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jgrXjgrnjg5rjg7Pjg4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub1JlY29yZFxuICAgICAqICAtIGBlbmAgYHRydWVgOiBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMgYW5kIGNsZWFyIGNoYW5nZXMuIC8gYGZhbHNlYDogcHJvcGVydHkgY2hhbmdlcyBhcmUgcmVjb3JkZWQgYW5kIGZpcmVkIHdoZW4gW1tyZXN1bWVdXSgpIGNhbGxkZWQuIChkZWZhdWx0KVxuICAgICAqICAtIGBqYWAgYHRydWVgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7TjgoLoqJjpjLLjgZvjgZosIOePvuWcqOOBruiomOmMsuOCguegtOajhCAvIGBmYWxzZWA6IOODl+ODreODkeODhuOCo+WkieabtOOBr+iomOmMsuOBleOCjCwgW1tyZXN1bWVdXSgpIOaZguOBq+eZuueBq+OBmeOCiyAo5pei5a6aKVxuICAgICAqL1xuICAgIHN1c3BlbmQobm9SZWNvcmQ/OiBib29sZWFuKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN1bWUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jg6rjgrjjg6Xjg7zjg6BcbiAgICAgKi9cbiAgICByZXN1bWUoKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBvYnNlcnZhdGlvbiBzdGF0ZVxuICAgICAqIEBqYSDos7zoqq3lj6/og73nirbmhYtcbiAgICAgKi9cbiAgICBnZXRPYnNlcnZhYmxlU3RhdGUoKTogT2JzZXJ2YWJsZVN0YXRlO1xufVxuXG4vKipcbiAqIEBlbiBJbnRlcmZhY2UgYWJsZSB0byBhY2Nlc3MgdG8gW1tFdmVudEJyb2tlcl1dIHdpdGggW1tJT2JzZXJ2YWJsZV1dLlxuICogQGphIFtbSU9ic2VydmFibGVdXSDjga7mjIHjgaTlhoXpg6ggW1tFdmVudEJyb2tlcl1dIOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIElPYnNlcnZhYmxlRXZlbnRCcm9rZXJBY2Nlc3M8VCBleHRlbmRzIG9iamVjdCA9IGFueT4gZXh0ZW5kcyBJT2JzZXJ2YWJsZSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgW1tFdmVudEJyb2tlcl1dIGluc3RhbmNlLlxuICAgICAqIEBqYSBbW0V2ZW50QnJva2VyXV0g44Kk44Oz44K544K/44Oz44K544Gu5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0QnJva2VyKCk6IEV2ZW50QnJva2VyPFQ+O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBbW0lPYnNlcnZhYmxlXV0uXG4gKiBAamEgW1tJT2JzZXJ2YWJsZV1dIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT2JzZXJ2YWJsZSh4OiB1bmtub3duKTogeCBpcyBJT2JzZXJ2YWJsZSB7XG4gICAgcmV0dXJuIEJvb2xlYW4oeCAmJiAoeCBhcyBVbmtub3duT2JqZWN0KVtfaW50ZXJuYWxdKTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIFVua25vd25PYmplY3QsXG4gICAgQWNjZXNzaWJsZSxcbiAgICBOb25GdW5jdGlvblByb3BlcnRpZXMsXG4gICAgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgdmVyaWZ5LFxuICAgIHBvc3QsXG4gICAgZGVlcE1lcmdlLFxuICAgIGRlZXBFcXVhbCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiwgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQge1xuICAgIEV2ZW50QnJva2VyUHJveHksXG4gICAgX2ludGVybmFsLFxuICAgIF9ub3RpZnksXG4gICAgX3N0b2NrQ2hhbmdlLFxuICAgIF9ub3RpZnlDaGFuZ2VzLFxuICAgIHZlcmlmeU9ic2VydmFibGUsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZVN0YXRlLCBJT2JzZXJ2YWJsZSB9IGZyb20gJy4vY29tbW9uJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEludGVybmFsUHJvcHMge1xuICAgIHN0YXRlOiBPYnNlcnZhYmxlU3RhdGU7XG4gICAgY2hhbmdlZDogYm9vbGVhbjtcbiAgICByZWFkb25seSBjaGFuZ2VNYXA6IE1hcDxQcm9wZXJ0eUtleSwgYW55PjtcbiAgICByZWFkb25seSBicm9rZXI6IEV2ZW50QnJva2VyUHJveHk8YW55Pjtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3Byb3h5SGFuZGxlcjogUHJveHlIYW5kbGVyPE9ic2VydmFibGVPYmplY3Q+ID0ge1xuICAgIHNldCh0YXJnZXQ6IEFjY2Vzc2libGU8T2JzZXJ2YWJsZU9iamVjdD4sIHAsIHZhbHVlLCByZWNlaXZlcikge1xuICAgICAgICBpZiAoIWlzU3RyaW5nKHApKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5zZXQodGFyZ2V0LCBwLCB2YWx1ZSwgcmVjZWl2ZXIpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0W3BdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSB0YXJnZXRbX2ludGVybmFsXS5zdGF0ZSAmJiB2YWx1ZSAhPT0gb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIHRhcmdldFtfc3RvY2tDaGFuZ2VdKHAsIG9sZFZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUmVmbGVjdC5zZXQodGFyZ2V0LCBwLCB2YWx1ZSwgcmVjZWl2ZXIpO1xuICAgIH0sXG59O1xuT2JqZWN0LmZyZWV6ZShfcHJveHlIYW5kbGVyKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE9ic2VydmFibGUga2V5IHR5cGUgZGVmaW5pdGlvbi5cbiAqIEBqYSDos7zoqq3lj6/og73jgarjgq3jg7zjga7lnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgT2JzZXJ2YWJsZUtleXM8VCBleHRlbmRzIE9ic2VydmFibGVPYmplY3Q+ID0gTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIG9iamVjdCBjbGFzcyB3aGljaCBjaGFuZ2UgY2FuIGJlIG9ic2VydmVkLlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBruWkieabtOOCkuebo+imluOBp+OBjeOCi+OCquODluOCuOOCp+OCr+ODiOOCr+ODqeOCuVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiAtIEJhc2ljIFVzYWdlXG4gKlxuICogYGBgdHNcbiAqIGNsYXNzIEV4YW1wbGUgZXh0ZW5kcyBPYnNlcnZhYmxlT2JqZWN0IHtcbiAqICAgcHVibGljIGE6IG51bWJlciA9IDA7XG4gKiAgIHB1YmxpYyBiOiBudW1iZXIgPSAwO1xuICogICBwdWJsaWMgZ2V0IHN1bSgpOiBudW1iZXIge1xuICogICAgICAgcmV0dXJuIHRoaXMuYSArIHRoaXMuYjtcbiAqICAgfVxuICogfVxuICpcbiAqIGNvbnN0IG9ic2VydmFibGUgPSBuZXcgRXhhbXBsZSgpO1xuICpcbiAqIGZ1bmN0aW9uIG9uTnVtQ2hhbmdlKG5ld1ZhbHVlOiBudW1iZXIsIG9sZFZhbHVlOiBudW1iZXIsIGtleTogc3RyaW5nKSB7XG4gKiAgIGNvbnNvbGUubG9nKGAke2tleX0gY2hhbmdlZCBmcm9tICR7b2xkVmFsdWV9IHRvICR7bmV3VmFsdWV9LmApO1xuICogfVxuICogb2JzZXJ2YWJsZS5vbihbJ2EnLCAnYiddLCBvbk51bUNoYW5nZSk7XG4gKlxuICogLy8gdXBkYXRlXG4gKiBvYnNlcnZhYmxlLmEgPSAxMDA7XG4gKiBvYnNlcnZhYmxlLmIgPSAyMDA7XG4gKlxuICogLy8gY29uc29sZSBvdXQgZnJvbSBgYXN5bmNgIGV2ZW50IGxvb3AuXG4gKiAvLyA9PiAnYSBjaGFuZ2VkIGZyb20gMCB0byAxMDAuJ1xuICogLy8gPT4gJ2IgY2hhbmdlZCBmcm9tIDAgdG8gMjAwLidcbiAqXG4gKiA6XG4gKlxuICogZnVuY3Rpb24gb25TdW1DaGFuZ2UobmV3VmFsdWU6IG51bWJlciwgb2xkVmFsdWU6IG51bWJlcikge1xuICogICBjb25zb2xlLmxvZyhgc3VtIGNoYW5nZWQgZnJvbSAke29sZFZhbHVlfSB0byAke25ld1ZhdWV9LmApO1xuICogfVxuICogb2JzZXJ2YWJsZS5vbignc3VtJywgb25TdW1DaGFuZ2UpO1xuICpcbiAqIC8vIHVwZGF0ZVxuICogb2JzZXJ2YWJsZS5hID0gMTAwOyAvLyBub3RoaW5nIHJlYWN0aW9uIGJlY2F1c2Ugb2Ygbm8gY2hhbmdlIHByb3BlcnRpZXMuXG4gKiBvYnNlcnZhYmxlLmEgPSAyMDA7XG4gKlxuICogLy8gY29uc29sZSBvdXQgZnJvbSBgYXN5bmNgIGV2ZW50IGxvb3AuXG4gKiAvLyA9PiAnc3VtIGNoYW5nZWQgZnJvbSAzMDAgdG8gNDAwLidcbiAqIGBgYFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgT2JzZXJ2YWJsZU9iamVjdCBpbXBsZW1lbnRzIElPYnNlcnZhYmxlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX2ludGVybmFsXSE6IEludGVybmFsUHJvcHM7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBpbml0aWFsIHN0YXRlLiBkZWZhdWx0OiBbW09ic2VydmFibGVTdGF0ZS5BQ1RJVkVdXVxuICAgICAqICAtIGBqYWAg5Yid5pyf54q25oWLIOaXouWumjogW1tPYnNlcnZhYmxlU3RhdGUuQUNUSVZFXV1cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzdGF0ZSA9IE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUpIHtcbiAgICAgICAgdmVyaWZ5KCdpbnN0YW5jZU9mJywgT2JzZXJ2YWJsZU9iamVjdCwgdGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsOiBJbnRlcm5hbFByb3BzID0ge1xuICAgICAgICAgICAgc3RhdGUsXG4gICAgICAgICAgICBjaGFuZ2VkOiBmYWxzZSxcbiAgICAgICAgICAgIGNoYW5nZU1hcDogbmV3IE1hcCgpLFxuICAgICAgICAgICAgYnJva2VyOiBuZXcgRXZlbnRCcm9rZXJQcm94eTx0aGlzPigpLFxuICAgICAgICB9O1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgX2ludGVybmFsLCB7IHZhbHVlOiBPYmplY3Quc2VhbChpbnRlcm5hbCkgfSk7XG4gICAgICAgIHJldHVybiBuZXcgUHJveHkodGhpcywgX3Byb3h5SGFuZGxlcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSU9ic2VydmFibGVcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgcHJvcGVydHkgY2hhbmdlcy5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5aSJ5pu06LO86Kqt6Kit5a6aICjlhajjg5fjg63jg5Hjg4bjgqPnm6PoppYpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydHlcbiAgICAgKiAgLSBgZW5gIHdpbGQgY29yZCBzaWduYXR1cmUuXG4gICAgICogIC0gYGphYCDjg6/jgqTjg6vjg4njgqvjg7zjg4lcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBwcm9wZXJ0eSBjaGFuZ2UuXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbihwcm9wZXJ0eTogJ0AnLCBsaXN0ZW5lcjogKGNvbnRleHQ6IE9ic2VydmFibGVPYmplY3QpID0+IHVua25vd24pOiBTdWJzY3JpcHRpb247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIHByb3BlcnR5IGNoYW5nZShzKS5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5aSJ5pu06LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydHlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eS5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIHByb3BlcnR5IGNoYW5nZS5cbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk6IEsgfCBLW10sIGxpc3RlbmVyOiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IHVua25vd24pOiBTdWJzY3JpcHRpb247XG5cbiAgICBvbjxLIGV4dGVuZHMgT2JzZXJ2YWJsZUtleXM8dGhpcz4+KHByb3BlcnR5OiBLIHwgS1tdLCBsaXN0ZW5lcjogKG5ld1ZhbHVlOiB0aGlzW0tdLCBvbGRWYWx1ZTogdGhpc1tLXSwga2V5OiBLKSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgeyBjaGFuZ2VNYXAsIGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBicm9rZXIuZ2V0KCkub24ocHJvcGVydHksIGxpc3RlbmVyKTtcbiAgICAgICAgaWYgKDAgPCBjaGFuZ2VNYXAuc2l6ZSkge1xuICAgICAgICAgICAgY29uc3QgcHJvcHMgPSBpc0FycmF5KHByb3BlcnR5KSA/IHByb3BlcnR5IDogW3Byb3BlcnR5XTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wcykge1xuICAgICAgICAgICAgICAgIGNoYW5nZU1hcC5oYXMocHJvcCkgfHwgY2hhbmdlTWFwLnNldChwcm9wLCB0aGlzW3Byb3BdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBwcm9wZXJ0eSBjaGFuZ2VzKVxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlpInmm7Tos7zoqq3op6PpmaQgKOWFqOODl+ODreODkeODhuOCo+ebo+imlilcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0eVxuICAgICAqICAtIGBlbmAgd2lsZCBjb3JkIHNpZ25hdHVyZS5cbiAgICAgKiAgLSBgamFgIOODr+OCpOODq+ODieOCq+ODvOODiVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIHByb3BlcnR5IGNoYW5nZS5cbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9mZihwcm9wZXJ0eTogJ0AnLCBsaXN0ZW5lcj86IChjb250ZXh0OiBPYnNlcnZhYmxlT2JqZWN0KSA9PiBhbnkpOiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIHByb3BlcnR5IGNoYW5nZShzKS5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5aSJ5pu06LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydHlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eS5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm6Kej6ZmkXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgcHJvcGVydHkgY2hhbmdlLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvZmY8SyBleHRlbmRzIE9ic2VydmFibGVLZXlzPHRoaXM+Pihwcm9wZXJ0eT86IEsgfCBLW10sIGxpc3RlbmVyPzogKG5ld1ZhbHVlOiB0aGlzW0tdLCBvbGRWYWx1ZTogdGhpc1tLXSwga2V5OiBLKSA9PiB1bmtub3duKTogdm9pZDtcblxuICAgIG9mZjxLIGV4dGVuZHMgT2JzZXJ2YWJsZUtleXM8dGhpcz4+KHByb3BlcnR5PzogSyB8IEtbXSwgbGlzdGVuZXI/OiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmJyb2tlci5nZXQoKS5vZmYocHJvcGVydHksIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3VzcGVuZCBvciBkaXNhYmxlIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44K144K544Oa44Oz44OJXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm9SZWNvcmRcbiAgICAgKiAgLSBgZW5gIGB0cnVlYDogbm90IHJlY29yZGluZyBwcm9wZXJ0eSBjaGFuZ2VzIGFuZCBjbGVhciBjaGFuZ2VzLiAvIGBmYWxzZWA6IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkIGFuZCBmaXJlZCB3aGVuIFtbcmVzdW1lXV0oKSBjYWxsZGVkLiAoZGVmYXVsdClcbiAgICAgKiAgLSBgamFgIGB0cnVlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044KC6KiY6Yyy44Gb44GaLCDnj77lnKjjga7oqJjpjLLjgoLnoLTmo4QgLyBgZmFsc2VgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7Tjga/oqJjpjLLjgZXjgowsIFtbcmVzdW1lXV0oKSDmmYLjgavnmbrngavjgZnjgosgKOaXouWumilcbiAgICAgKi9cbiAgICBzdXNwZW5kKG5vUmVjb3JkID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLnN0YXRlID0gbm9SZWNvcmQgPyBPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgOiBPYnNlcnZhYmxlU3RhdGUuU1VTRVBOREVEO1xuICAgICAgICBpZiAobm9SZWNvcmQpIHtcbiAgICAgICAgICAgIHRoaXNbX2ludGVybmFsXS5jaGFuZ2VNYXAuY2xlYXIoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzdW1lIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44Oq44K444Ol44O844OgXG4gICAgICovXG4gICAgcmVzdW1lKCk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgIT09IGludGVybmFsLnN0YXRlKSB7XG4gICAgICAgICAgICBpbnRlcm5hbC5zdGF0ZSA9IE9ic2VydmFibGVTdGF0ZS5BQ1RJVkU7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4gdGhpc1tfbm90aWZ5Q2hhbmdlc10oKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIG9ic2VydmF0aW9uIHN0YXRlXG4gICAgICogQGphIOizvOiqreWPr+iDveeKtuaFi1xuICAgICAqL1xuICAgIGdldE9ic2VydmFibGVTdGF0ZSgpOiBPYnNlcnZhYmxlU3RhdGUge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpc1tfaW50ZXJuYWxdLnN0YXRlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElPYnNlcnZhYmxlRXZlbnRCcm9rZXJBY2Nlc3NcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBnZXRCcm9rZXIoKTogRXZlbnRCcm9rZXI8Tm9uRnVuY3Rpb25Qcm9wZXJ0aWVzPHRoaXM+PiB7XG4gICAgICAgIGNvbnN0IHsgYnJva2VyIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIHJldHVybiBicm9rZXIuZ2V0KCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIFtbT2JzZXJ2YWJsZU9iamVjdF1dIGZyb20gYW55IG9iamVjdC5cbiAgICAgKiBAamEg5Lu75oSP44Gu44Kq44OW44K444Kn44Kv44OI44GL44KJIFtbT2JzZXJ2YWJsZU9iamVjdF1dIOOCkueUn+aIkFxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBjb25zdCBvYnNlcnZhYmxlID0gT2JzZXJ2YWJsZU9iamVjdC5mcm9tKHsgYTogMSwgYjogMSB9KTtcbiAgICAgKiBmdW5jdGlvbiBvbk51bUNoYW5nZShuZXdWYWx1ZTogbnVtYmVyLCBvbGRWYWx1ZTogbnVtYmVyLCBrZXk6IHN0cmluZykge1xuICAgICAqICAgY29uc29sZS5sb2coYCR7a2V5fSBjaGFuZ2VkIGZyb20gJHtvbGRWYWx1ZX0gdG8gJHtuZXdWYWx1ZX0uYCk7XG4gICAgICogfVxuICAgICAqIG9ic2VydmFibGUub24oWydhJywgJ2InXSwgb25OdW1DaGFuZ2UpO1xuICAgICAqXG4gICAgICogLy8gdXBkYXRlXG4gICAgICogb2JzZXJ2YWJsZS5hID0gMTAwO1xuICAgICAqIG9ic2VydmFibGUuYiA9IDIwMDtcbiAgICAgKlxuICAgICAqIC8vIGNvbnNvbGUgb3V0IGZyb20gYGFzeW5jYCBldmVudCBsb29wLlxuICAgICAqIC8vID0+ICdhIGNoYW5nZWQgZnJvbSAxIHRvIDEwMC4nXG4gICAgICogLy8gPT4gJ2IgY2hhbmdlZCBmcm9tIDEgdG8gMjAwLidcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIG9iamVjdD4oc3JjOiBUKTogT2JzZXJ2YWJsZU9iamVjdCAmIFQge1xuICAgICAgICBjb25zdCBvYnNlcnZhYmxlID0gZGVlcE1lcmdlKG5ldyBjbGFzcyBleHRlbmRzIE9ic2VydmFibGVPYmplY3QgeyB9KE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCksIHNyYyk7XG4gICAgICAgIG9ic2VydmFibGUucmVzdW1lKCk7XG4gICAgICAgIHJldHVybiBvYnNlcnZhYmxlIGFzIGFueTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcm90ZWN0ZWQgbWVodG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBGb3JjZSBub3RpZnkgcHJvcGVydHkgY2hhbmdlKHMpIGluIHNwaXRlIG9mIGFjdGl2ZSBzdGF0ZS5cbiAgICAgKiBAamEg44Ki44Kv44OG44Kj44OW54q25oWL44Gr44GL44GL44KP44KJ44Ga5by35Yi255qE44Gr44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44KS55m66KGMXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG5vdGlmeSguLi5wcm9wZXJ0aWVzOiBzdHJpbmdbXSk6IHZvaWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBpZiAoMCA9PT0gcHJvcGVydGllcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgY2hhbmdlTWFwIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IGtleVZhbHVlID0gbmV3IE1hcDxQcm9wZXJ0eUtleSwgW2FueSwgYW55XT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgcHJvcGVydGllcykge1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSAodGhpcyBhcyBVbmtub3duT2JqZWN0KVtrZXldO1xuICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBjaGFuZ2VNYXAuaGFzKGtleSkgPyBjaGFuZ2VNYXAuZ2V0KGtleSkgOiBuZXdWYWx1ZTtcbiAgICAgICAgICAgIGtleVZhbHVlLnNldChrZXksIFtuZXdWYWx1ZSwgb2xkVmFsdWVdKTtcbiAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGhpcywga2V5KSkge1xuICAgICAgICAgICAgICAgIHRoaXNbX2ludGVybmFsXS5jaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXNbX25vdGlmeV0oa2V5VmFsdWUpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWVodG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfc3RvY2tDaGFuZ2VdKHA6IHN0cmluZywgb2xkVmFsdWU6IGFueSk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCBjaGFuZ2VNYXAsIGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uY2hhbmdlZCA9IHRydWU7XG4gICAgICAgIGlmICgwID09PSBjaGFuZ2VNYXAuc2l6ZSkge1xuICAgICAgICAgICAgY2hhbmdlTWFwLnNldChwLCBvbGRWYWx1ZSk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGsgb2YgYnJva2VyLmdldCgpLmNoYW5uZWxzKCkpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VNYXAuaGFzKGspIHx8IGNoYW5nZU1hcC5zZXQoaywgKHRoaXMgYXMgVW5rbm93bk9iamVjdClba10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgPT09IHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHRoaXNbX25vdGlmeUNoYW5nZXNdKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2hhbmdlTWFwLmhhcyhwKSB8fCBjaGFuZ2VNYXAuc2V0KHAsIG9sZFZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfbm90aWZ5Q2hhbmdlc10oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgc3RhdGUsIGNoYW5nZU1hcCB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSAhPT0gc3RhdGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBrZXlWYWx1ZVBhaXJzID0gbmV3IE1hcDxQcm9wZXJ0eUtleSwgW2FueSwgYW55XT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCBvbGRWYWx1ZV0gb2YgY2hhbmdlTWFwKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJWYWx1ZSA9ICh0aGlzIGFzIFVua25vd25PYmplY3QpW2tleV07XG4gICAgICAgICAgICBpZiAoIWRlZXBFcXVhbChvbGRWYWx1ZSwgY3VyVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAga2V5VmFsdWVQYWlycy5zZXQoa2V5LCBbY3VyVmFsdWUsIG9sZFZhbHVlXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpc1tfbm90aWZ5XShrZXlWYWx1ZVBhaXJzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeV0oa2V5VmFsdWU6IE1hcDxQcm9wZXJ0eUtleSwgW2FueSwgYW55XT4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBjaGFuZ2VkLCBjaGFuZ2VNYXAsIGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjaGFuZ2VNYXAuY2xlYXIoKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmNoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgZXZlbnRCcm9rZXIgPSBicm9rZXIuZ2V0KCk7XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVzXSBvZiBrZXlWYWx1ZSkge1xuICAgICAgICAgICAgKGV2ZW50QnJva2VyIGFzIGFueSkudHJpZ2dlcihrZXksIC4uLnZhbHVlcywga2V5KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hhbmdlZCkge1xuICAgICAgICAgICAgZXZlbnRCcm9rZXIudHJpZ2dlcignQCcsIHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBwcmVmZXItcmVzdC1wYXJhbXMsXG4gKi9cblxuaW1wb3J0IHtcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgQWNjZXNzaWJsZSxcbiAgICBXcml0YWJsZSxcbiAgICBpc051bWJlcixcbiAgICB2ZXJpZnksXG4gICAgcG9zdCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiwgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQge1xuICAgIEV2ZW50QnJva2VyUHJveHksXG4gICAgX2ludGVybmFsLFxuICAgIF9ub3RpZnksXG4gICAgX3N0b2NrQ2hhbmdlLFxuICAgIF9ub3RpZnlDaGFuZ2VzLFxuICAgIHZlcmlmeU9ic2VydmFibGUsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZVN0YXRlLCBJT2JzZXJ2YWJsZSB9IGZyb20gJy4vY29tbW9uJztcblxuLyoqXG4gKiBAZW4gQXJyYXkgY2hhbmdlIHR5cGUgaW5mb3JtYXRpb24uIDxicj5cbiAqICAgICBUaGUgdmFsdWUgaXMgc3VpdGFibGUgZm9yIHRoZSBudW1iZXIgb2YgZmx1Y3R1YXRpb24gb2YgdGhlIGVsZW1lbnQuXG4gKiBAamEg6YWN5YiX5aSJ5pu06YCa55+l44Gu44K/44Kk44OXIDxicj5cbiAqICAgICDlgKTjga/opoHntKDjga7lopfmuJvmlbDjgavnm7jlvZNcbiAqXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIEFycmF5Q2hhbmdlVHlwZSB7XG4gICAgUkVNT1ZFID0gLTEsXG4gICAgVVBEQVRFID0gMCxcbiAgICBJTlNFUlQgPSAxLFxufVxuXG4vKipcbiAqIEBlbiBBcnJheSBjaGFuZ2UgcmVjb3JkIGluZm9ybWF0aW9uLlxuICogQGphIOmFjeWIl+WkieabtOaDheWgsVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFycmF5Q2hhbmdlUmVjb3JkPFQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIGNoYW5nZSB0eXBlIGluZm9ybWF0aW9uLlxuICAgICAqIEBqYSDphY3liJflpInmm7Tmg4XloLHjga7orZjliKXlrZBcbiAgICAgKi9cbiAgICByZWFkb25seSB0eXBlOiBBcnJheUNoYW5nZVR5cGU7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIGNoYW5nZSB0eXBlIGluZm9ybWF0aW9uLiA8YnI+XG4gICAgICogICAgIOKAuyBbQXR0ZW50aW9uXSBUaGUgaW5kZXggd2lsbCBiZSBkaWZmZXJlbnQgZnJvbSB0aGUgYWN0dWFsIGxvY2F0aW9uIHdoZW4gYXJyYXkgc2l6ZSBjaGFuZ2VkIGJlY2F1c2UgdGhhdCBkZXRlcm1pbmVzIGVsZW1lbnQgb3BlcmF0aW9uIHVuaXQuXG4gICAgICogQGphIOWkieabtOOBjOeZuueUn+OBl+OBn+mFjeWIl+WGheOBruS9jee9ruOBriBpbmRleCA8YnI+XG4gICAgICogICAgIOKAuyBb5rOo5oSPXSDjgqrjg5rjg6zjg7zjgrfjg6fjg7PljZjkvY3jga4gaW5kZXgg44Go44Gq44KKLCDopoHntKDjgYzlopfmuJvjgZnjgovloLTlkIjjga/lrp/pmpvjga7kvY3nva7jgajnlbDjgarjgovjgZPjgajjgYzjgYLjgotcbiAgICAgKi9cbiAgICByZWFkb25seSBpbmRleDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIE5ldyBlbGVtZW50J3MgdmFsdWUuXG4gICAgICogQGphIOimgee0oOOBruaWsOOBl+OBhOWApFxuICAgICAqL1xuICAgIHJlYWRvbmx5IG5ld1ZhbHVlPzogVDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBPbGQgZWxlbWVudCdzIHZhbHVlLlxuICAgICAqIEBqYSDopoHntKDjga7lj6TjgYTlgKRcbiAgICAgKi9cbiAgICByZWFkb25seSBvbGRWYWx1ZT86IFQ7XG59XG50eXBlIE11dGFibGVDaGFuZ2VSZWNvcmQ8VD4gPSBXcml0YWJsZTxBcnJheUNoYW5nZVJlY29yZDxUPj47XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgSUFycmF5Q2hhbmdlRXZlbnQ8VD4ge1xuICAgICdAJzogW0FycmF5Q2hhbmdlUmVjb3JkPFQ+W11dO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgSW50ZXJuYWxQcm9wczxUID0gdW5rbm93bj4ge1xuICAgIHN0YXRlOiBPYnNlcnZhYmxlU3RhdGU7XG4gICAgYnlNZXRob2Q6IGJvb2xlYW47XG4gICAgcmVjb3JkczogTXV0YWJsZUNoYW5nZVJlY29yZDxUPltdO1xuICAgIHJlYWRvbmx5IGluZGV4ZXM6IFNldDxudW1iZXI+O1xuICAgIHJlYWRvbmx5IGJyb2tlcjogRXZlbnRCcm9rZXJQcm94eTxJQXJyYXlDaGFuZ2VFdmVudDxUPj47XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9wcm94eUhhbmRsZXI6IFByb3h5SGFuZGxlcjxPYnNlcnZhYmxlQXJyYXk+ID0ge1xuICAgIGRlZmluZVByb3BlcnR5KHRhcmdldDogQWNjZXNzaWJsZTxPYnNlcnZhYmxlQXJyYXksIG51bWJlcj4sIHAsIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0YXJnZXRbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA9PT0gaW50ZXJuYWwuc3RhdGUgfHwgaW50ZXJuYWwuYnlNZXRob2QgfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhdHRyaWJ1dGVzLCAndmFsdWUnKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtwXTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBhdHRyaWJ1dGVzLnZhbHVlO1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZXFlcWVxXG4gICAgICAgIGlmICgnbGVuZ3RoJyA9PT0gcCAmJiBuZXdWYWx1ZSAhPSBvbGRWYWx1ZSkgeyAvLyBEbyBOT1QgdXNlIHN0cmljdCBpbmVxdWFsaXR5ICghPT0pXG4gICAgICAgICAgICBjb25zdCBvbGRMZW5ndGggPSBvbGRWYWx1ZSA+Pj4gMDtcbiAgICAgICAgICAgIGNvbnN0IG5ld0xlbmd0aCA9IG5ld1ZhbHVlID4+PiAwO1xuICAgICAgICAgICAgY29uc3Qgc3RvY2sgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyYXAgPSBuZXdMZW5ndGggPCBvbGRMZW5ndGggJiYgdGFyZ2V0LnNsaWNlKG5ld0xlbmd0aCk7XG4gICAgICAgICAgICAgICAgaWYgKHNjcmFwKSB7IC8vIG5ld0xlbmd0aCA8IG9sZExlbmd0aFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gb2xkTGVuZ3RoOyAtLWkgPj0gbmV3TGVuZ3RoOykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRSwgaSwgdW5kZWZpbmVkLCBzY3JhcFtpIC0gbmV3TGVuZ3RoXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgLy8gb2xkTGVuZ3RoIDwgbmV3TGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBvbGRMZW5ndGg7IGkgPCBuZXdMZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLklOU0VSVCwgaSAvKiwgdW5kZWZpbmVkLCB1bmRlZmluZWQgKi8pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIHJlc3VsdCAmJiBzdG9jaygpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSBlbHNlIGlmIChuZXdWYWx1ZSAhPT0gb2xkVmFsdWUgJiYgaXNWYWxpZEFycmF5SW5kZXgocCkpIHtcbiAgICAgICAgICAgIGNvbnN0IGkgPSBwIGFzIHVua25vd24gYXMgbnVtYmVyID4+PiAwO1xuICAgICAgICAgICAgY29uc3QgdHlwZTogQXJyYXlDaGFuZ2VUeXBlID0gTnVtYmVyKGkgPj0gdGFyZ2V0Lmxlbmd0aCk7IC8vIElOU0VSVCBvciBVUERBVEVcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIHJlc3VsdCAmJiB0YXJnZXRbX3N0b2NrQ2hhbmdlXSh0eXBlLCBpLCBuZXdWYWx1ZSwgb2xkVmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGRlbGV0ZVByb3BlcnR5KHRhcmdldDogQWNjZXNzaWJsZTxPYnNlcnZhYmxlQXJyYXksIG51bWJlcj4sIHApIHtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0YXJnZXRbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA9PT0gaW50ZXJuYWwuc3RhdGUgfHwgaW50ZXJuYWwuYnlNZXRob2QgfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0YXJnZXQsIHApKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWxldGVQcm9wZXJ0eSh0YXJnZXQsIHApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0W3BdO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBSZWZsZWN0LmRlbGV0ZVByb3BlcnR5KHRhcmdldCwgcCk7XG4gICAgICAgIHJlc3VsdCAmJiBpc1ZhbGlkQXJyYXlJbmRleChwKSAmJiB0YXJnZXRbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuVVBEQVRFLCBwIGFzIHVua25vd24gYXMgbnVtYmVyID4+PiAwLCB1bmRlZmluZWQsIG9sZFZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxufTtcbk9iamVjdC5mcmVlemUoX3Byb3h5SGFuZGxlcik7XG5cbi8qKiBAaW50ZXJuYWwgdmFsaWQgYXJyYXkgaW5kZXggaGVscGVyICovXG5mdW5jdGlvbiBpc1ZhbGlkQXJyYXlJbmRleDxUPihpbmRleDogVCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHMgPSBTdHJpbmcoaW5kZXgpO1xuICAgIGNvbnN0IG4gPSBNYXRoLnRydW5jKHMgYXMgdW5rbm93biBhcyBudW1iZXIpO1xuICAgIHJldHVybiBTdHJpbmcobikgPT09IHMgJiYgMCA8PSBuICYmIG4gPCAweEZGRkZGRkZGO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgaW5kZXggbWFuYWdlbWVudCAqL1xuZnVuY3Rpb24gZmluZFJlbGF0ZWRDaGFuZ2VJbmRleDxUPihyZWNvcmRzOiBNdXRhYmxlQ2hhbmdlUmVjb3JkPFQ+W10sIHR5cGU6IEFycmF5Q2hhbmdlVHlwZSwgaW5kZXg6IG51bWJlcik6IG51bWJlciB7XG4gICAgY29uc3QgY2hlY2tUeXBlID0gdHlwZSA9PT0gQXJyYXlDaGFuZ2VUeXBlLklOU0VSVFxuICAgICAgICA/ICh0OiBBcnJheUNoYW5nZVR5cGUpID0+IHQgPT09IEFycmF5Q2hhbmdlVHlwZS5SRU1PVkVcbiAgICAgICAgOiAodDogQXJyYXlDaGFuZ2VUeXBlKSA9PiB0ICE9PSBBcnJheUNoYW5nZVR5cGUuUkVNT1ZFXG4gICAgICAgIDtcblxuICAgIGZvciAobGV0IGkgPSByZWNvcmRzLmxlbmd0aDsgLS1pID49IDA7KSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gcmVjb3Jkc1tpXTtcbiAgICAgICAgaWYgKHZhbHVlLmluZGV4ID09PSBpbmRleCAmJiBjaGVja1R5cGUodmFsdWUudHlwZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9IGVsc2UgaWYgKHZhbHVlLmluZGV4IDwgaW5kZXggJiYgQm9vbGVhbih2YWx1ZS50eXBlKSkgeyAvLyBSRU1PVkUgb3IgSU5TRVJUXG4gICAgICAgICAgICBpbmRleCAtPSB2YWx1ZS50eXBlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSBhcnJheSBjbGFzcyB3aGljaCBjaGFuZ2UgY2FuIGJlIG9ic2VydmVkLlxuICogQGphIOWkieabtOebo+imluWPr+iDveOBqumFjeWIl+OCr+ODqeOCuVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiAtIEJhc2ljIFVzYWdlXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IG9ic0FycmF5ID0gT2JzZXJ2YWJsZUFycmF5LmZyb20oWydhJywgJ2InLCAnYyddKTtcbiAqXG4gKiBmdW5jdGlvbiBvbkNoYW5nZUFycmF5KHJlY29yZHM6IEFycmF5Q2hhbmdlUmVjb3JkW10pIHtcbiAqICAgY29uc29sZS5sb2cocmVjb3Jkcyk7XG4gKiAgIC8vICBbXG4gKiAgIC8vICAgIHsgdHlwZTogMSwgaW5kZXg6IDMsIG5ld1ZhbHVlOiAneCcsIG9sZFZhbHVlOiB1bmRlZmluZWQgfSxcbiAqICAgLy8gICAgeyB0eXBlOiAxLCBpbmRleDogNCwgbmV3VmFsdWU6ICd5Jywgb2xkVmFsdWU6IHVuZGVmaW5lZCB9LFxuICogICAvLyAgICB7IHR5cGU6IDEsIGluZGV4OiA1LCBuZXdWYWx1ZTogJ3onLCBvbGRWYWx1ZTogdW5kZWZpbmVkIH1cbiAqICAgLy8gIF1cbiAqIH1cbiAqIG9ic0FycmF5Lm9uKG9uQ2hhbmdlQXJyYXkpO1xuICpcbiAqIGZ1bmN0aW9uIGFkZFhZWigpIHtcbiAqICAgb2JzQXJyYXkucHVzaCgneCcsICd5JywgJ3onKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgT2JzZXJ2YWJsZUFycmF5PFQgPSB1bmtub3duPiBleHRlbmRzIEFycmF5PFQ+IGltcGxlbWVudHMgSU9ic2VydmFibGUge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfaW50ZXJuYWxdITogSW50ZXJuYWxQcm9wczxUPjtcblxuICAgIC8qKiBAZmluYWwgY29uc3RydWN0b3IgKi9cbiAgICBwcml2YXRlIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlciguLi5hcmd1bWVudHMpO1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBPYnNlcnZhYmxlQXJyYXksIHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbDogSW50ZXJuYWxQcm9wczxUPiA9IHtcbiAgICAgICAgICAgIHN0YXRlOiBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFLFxuICAgICAgICAgICAgYnlNZXRob2Q6IGZhbHNlLFxuICAgICAgICAgICAgcmVjb3JkczogW10sXG4gICAgICAgICAgICBpbmRleGVzOiBuZXcgU2V0KCksXG4gICAgICAgICAgICBicm9rZXI6IG5ldyBFdmVudEJyb2tlclByb3h5PElBcnJheUNoYW5nZUV2ZW50PFQ+PigpLFxuICAgICAgICB9O1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgX2ludGVybmFsLCB7IHZhbHVlOiBPYmplY3Quc2VhbChpbnRlcm5hbCkgfSk7XG4gICAgICAgIGNvbnN0IGFyZ0xlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGlmICgxID09PSBhcmdMZW5ndGggJiYgaXNOdW1iZXIoYXJndW1lbnRzWzBdKSkge1xuICAgICAgICAgICAgY29uc3QgbGVuID0gYXJndW1lbnRzWzBdID4+PiAwO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuSU5TRVJULCBpIC8qLCB1bmRlZmluZWQgKi8pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKDAgPCBhcmdMZW5ndGgpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJnTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLklOU0VSVCwgaSwgYXJndW1lbnRzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFByb3h5KHRoaXMsIF9wcm94eUhhbmRsZXIpIGFzIE9ic2VydmFibGVBcnJheTxUPjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJT2JzZXJ2YWJsZVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBhcnJheSBjaGFuZ2UocykuXG4gICAgICogQGphIOmFjeWIl+WkieabtOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYXJyYXkgY2hhbmdlLlxuICAgICAqICAtIGBqYWAg6YWN5YiX5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb24obGlzdGVuZXI6IChyZWNvcmRzOiBBcnJheUNoYW5nZVJlY29yZDxUPltdKSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2ludGVybmFsXS5icm9rZXIuZ2V0KCkub24oJ0AnLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGFycmF5IGNoYW5nZShzKS5cbiAgICAgKiBAamEg6YWN5YiX5aSJ5pu06LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBhcnJheSBjaGFuZ2UuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg6YWN5YiX5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lkIzkuIAgYGNoYW5uZWxgIOOBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIG9mZihsaXN0ZW5lcj86IChyZWNvcmRzOiBBcnJheUNoYW5nZVJlY29yZDxUPltdKSA9PiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHRoaXNbX2ludGVybmFsXS5icm9rZXIuZ2V0KCkub2ZmKCdAJywgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdXNwZW5kIG9yIGRpc2FibGUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jgrXjgrnjg5rjg7Pjg4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub1JlY29yZFxuICAgICAqICAtIGBlbmAgYHRydWVgOiBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMgYW5kIGNsZWFyIGNoYW5nZXMuIC8gYGZhbHNlYDogcHJvcGVydHkgY2hhbmdlcyBhcmUgcmVjb3JkZWQgYW5kIGZpcmVkIHdoZW4gW1tyZXN1bWVdXSgpIGNhbGxkZWQuIChkZWZhdWx0KVxuICAgICAqICAtIGBqYWAgYHRydWVgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7TjgoLoqJjpjLLjgZvjgZosIOePvuWcqOOBruiomOmMsuOCguegtOajhCAvIGBmYWxzZWA6IOODl+ODreODkeODhuOCo+WkieabtOOBr+iomOmMsuOBleOCjCwgW1tyZXN1bWVdXSgpIOaZguOBq+eZuueBq+OBmeOCiyAo5pei5a6aKVxuICAgICAqL1xuICAgIHN1c3BlbmQobm9SZWNvcmQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uc3RhdGUgPSBub1JlY29yZCA/IE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA6IE9ic2VydmFibGVTdGF0ZS5TVVNFUE5ERUQ7XG4gICAgICAgIGlmIChub1JlY29yZCkge1xuICAgICAgICAgICAgdGhpc1tfaW50ZXJuYWxdLnJlY29yZHMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzdW1lIG9mIHRoZSBldmVudCBzdWJzY3JpcHRpb24gc3RhdGUuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreeKtuaFi+OBruODquOCuOODpeODvOODoFxuICAgICAqL1xuICAgIHJlc3VtZSgpOiB0aGlzIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgaW50ZXJuYWwuc3RhdGUgPSBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHRoaXNbX25vdGlmeUNoYW5nZXNdKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBvYnNlcnZhdGlvbiBzdGF0ZVxuICAgICAqIEBqYSDos7zoqq3lj6/og73nirbmhYtcbiAgICAgKi9cbiAgICBnZXRPYnNlcnZhYmxlU3RhdGUoKTogT2JzZXJ2YWJsZVN0YXRlIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2ludGVybmFsXS5zdGF0ZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTogQXJyYXkgbWV0aG9kc1xuXG4gICAgLyoqXG4gICAgICogU29ydHMgYW4gYXJyYXkuXG4gICAgICogQHBhcmFtIGNvbXBhcmVGbiBUaGUgbmFtZSBvZiB0aGUgZnVuY3Rpb24gdXNlZCB0byBkZXRlcm1pbmUgdGhlIG9yZGVyIG9mIHRoZSBlbGVtZW50cy4gSWYgb21pdHRlZCwgdGhlIGVsZW1lbnRzIGFyZSBzb3J0ZWQgaW4gYXNjZW5kaW5nLCBBU0NJSSBjaGFyYWN0ZXIgb3JkZXIuXG4gICAgICovXG4gICAgc29ydChjb21wYXJhdG9yPzogKGxoczogVCwgcmhzOiBUKSA9PiBudW1iZXIpOiB0aGlzIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IG9sZCA9IEFycmF5LmZyb20odGhpcyk7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc3VwZXIuc29ydChjb21wYXJhdG9yKTtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSBmYWxzZTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGxlbiA9IG9sZC5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBvbGRbaV07XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSB0aGlzW2ldO1xuICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZSAhPT0gb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5VUERBVEUsIGksIG5ld1ZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBlbGVtZW50cyBmcm9tIGFuIGFycmF5IGFuZCwgaWYgbmVjZXNzYXJ5LCBpbnNlcnRzIG5ldyBlbGVtZW50cyBpbiB0aGVpciBwbGFjZSwgcmV0dXJuaW5nIHRoZSBkZWxldGVkIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSBzdGFydCBUaGUgemVyby1iYXNlZCBsb2NhdGlvbiBpbiB0aGUgYXJyYXkgZnJvbSB3aGljaCB0byBzdGFydCByZW1vdmluZyBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gZGVsZXRlQ291bnQgVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZW1vdmUuXG4gICAgICovXG4gICAgc3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50PzogbnVtYmVyKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgZWxlbWVudHMgZnJvbSBhbiBhcnJheSBhbmQsIGlmIG5lY2Vzc2FyeSwgaW5zZXJ0cyBuZXcgZWxlbWVudHMgaW4gdGhlaXIgcGxhY2UsIHJldHVybmluZyB0aGUgZGVsZXRlZCBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gc3RhcnQgVGhlIHplcm8tYmFzZWQgbG9jYXRpb24gaW4gdGhlIGFycmF5IGZyb20gd2hpY2ggdG8gc3RhcnQgcmVtb3ZpbmcgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIGRlbGV0ZUNvdW50IFRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmVtb3ZlLlxuICAgICAqIEBwYXJhbSBpdGVtcyBFbGVtZW50cyB0byBpbnNlcnQgaW50byB0aGUgYXJyYXkgaW4gcGxhY2Ugb2YgdGhlIGRlbGV0ZWQgZWxlbWVudHMuXG4gICAgICovXG4gICAgc3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50OiBudW1iZXIsIC4uLml0ZW1zOiBUW10pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgc3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50PzogbnVtYmVyLCAuLi5pdGVtczogVFtdKTogT2JzZXJ2YWJsZUFycmF5PFQ+IHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IG9sZExlbiA9IHRoaXMubGVuZ3RoO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IChzdXBlci5zcGxpY2UgYXMgVW5rbm93bkZ1bmN0aW9uKSguLi5hcmd1bWVudHMpIGFzIE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSBmYWxzZTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIHN0YXJ0ID0gTWF0aC50cnVuYyhzdGFydCk7XG4gICAgICAgICAgICBjb25zdCBmcm9tID0gc3RhcnQgPCAwID8gTWF0aC5tYXgob2xkTGVuICsgc3RhcnQsIDApIDogTWF0aC5taW4oc3RhcnQsIG9sZExlbik7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gcmVzdWx0Lmxlbmd0aDsgLS1pID49IDA7KSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5SRU1PVkUsIGZyb20gKyBpLCB1bmRlZmluZWQsIHJlc3VsdFtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBsZW4gPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGZyb20gKyBpLCBpdGVtc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIHRoZSBmaXJzdCBlbGVtZW50IGZyb20gYW4gYXJyYXkgYW5kIHJldHVybnMgaXQuXG4gICAgICovXG4gICAgc2hpZnQoKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCBvbGRMZW4gPSB0aGlzLmxlbmd0aDtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSB0cnVlO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzdXBlci5zaGlmdCgpO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IGZhbHNlO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSBpbnRlcm5hbC5zdGF0ZSAmJiB0aGlzLmxlbmd0aCA8IG9sZExlbikge1xuICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5SRU1PVkUsIDAsIHVuZGVmaW5lZCwgcmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluc2VydHMgbmV3IGVsZW1lbnRzIGF0IHRoZSBzdGFydCBvZiBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0gaXRlbXMgIEVsZW1lbnRzIHRvIGluc2VydCBhdCB0aGUgc3RhcnQgb2YgdGhlIEFycmF5LlxuICAgICAqL1xuICAgIHVuc2hpZnQoLi4uaXRlbXM6IFRbXSk6IG51bWJlciB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLnVuc2hpZnQoLi4uaXRlbXMpO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IGZhbHNlO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgbGVuID0gaXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuSU5TRVJULCBpLCBpdGVtc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxscyBhIGRlZmluZWQgY2FsbGJhY2sgZnVuY3Rpb24gb24gZWFjaCBlbGVtZW50IG9mIGFuIGFycmF5LCBhbmQgcmV0dXJucyBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIHRoZSByZXN1bHRzLlxuICAgICAqIEBwYXJhbSBjYWxsYmFja2ZuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIHVwIHRvIHRocmVlIGFyZ3VtZW50cy4gVGhlIG1hcCBtZXRob2QgY2FsbHMgdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24gb25lIHRpbWUgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgYXJyYXkuXG4gICAgICogQHBhcmFtIHRoaXNBcmcgQW4gb2JqZWN0IHRvIHdoaWNoIHRoZSB0aGlzIGtleXdvcmQgY2FuIHJlZmVyIGluIHRoZSBjYWxsYmFja2ZuIGZ1bmN0aW9uLiBJZiB0aGlzQXJnIGlzIG9taXR0ZWQsIHVuZGVmaW5lZCBpcyB1c2VkIGFzIHRoZSB0aGlzIHZhbHVlLlxuICAgICAqL1xuICAgIG1hcDxVPihjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUsIHRoaXNBcmc/OiB1bmtub3duKTogT2JzZXJ2YWJsZUFycmF5PFU+IHtcbiAgICAgICAgLypcbiAgICAgICAgICogW05PVEVdIG9yaWdpbmFsIGltcGxlbWVudCBpcyB2ZXJ5IHZlcnkgaGlnaC1jb3N0LlxuICAgICAgICAgKiAgICAgICAgc28gaXQncyBjb252ZXJ0ZWQgbmF0aXZlIEFycmF5IG9uY2UsIGFuZCByZXN0b3JlZC5cbiAgICAgICAgICpcbiAgICAgICAgICogcmV0dXJuIChzdXBlci5tYXAgYXMgVW5rbm93bkZ1bmN0aW9uKSguLi5hcmd1bWVudHMpO1xuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIE9ic2VydmFibGVBcnJheS5mcm9tKFsuLi50aGlzXS5tYXAoY2FsbGJhY2tmbiwgdGhpc0FyZykpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElPYnNlcnZhYmxlRXZlbnRCcm9rZXJBY2Nlc3NcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBnZXRCcm9rZXIoKTogRXZlbnRCcm9rZXI8SUFycmF5Q2hhbmdlRXZlbnQ8VD4+IHtcbiAgICAgICAgY29uc3QgeyBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgcmV0dXJuIGJyb2tlci5nZXQoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1laHRvZHM6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX3N0b2NrQ2hhbmdlXSh0eXBlOiBBcnJheUNoYW5nZVR5cGUsIGluZGV4OiBudW1iZXIsIG5ld1ZhbHVlPzogVCwgb2xkVmFsdWU/OiBUKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgc3RhdGUsIGluZGV4ZXMsIHJlY29yZHMgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY29uc3QgcmNpID0gaW5kZXhlcy5oYXMoaW5kZXgpID8gZmluZFJlbGF0ZWRDaGFuZ2VJbmRleChyZWNvcmRzLCB0eXBlLCBpbmRleCkgOiAtMTtcbiAgICAgICAgY29uc3QgbGVuID0gcmVjb3Jkcy5sZW5ndGg7XG4gICAgICAgIGlmIChyY2kgPj0gMCkge1xuICAgICAgICAgICAgY29uc3QgcmN0ID0gcmVjb3Jkc1tyY2ldLnR5cGU7XG4gICAgICAgICAgICBpZiAoIXJjdCAvKiBVUERBVEUgKi8pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcmV2UmVjb3JkID0gcmVjb3Jkcy5zcGxpY2UocmNpLCAxKVswXTtcbiAgICAgICAgICAgICAgICAvLyBVUERBVEUgPT4gVVBEQVRFIDogVVBEQVRFXG4gICAgICAgICAgICAgICAgLy8gVVBEQVRFID0+IFJFTU9WRSA6IElOU0VSVFxuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXSh0eXBlLCBpbmRleCwgbmV3VmFsdWUsIHByZXZSZWNvcmQub2xkVmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCByLCBpID0gbGVuOyAtLWkgPiByY2k7KSB7XG4gICAgICAgICAgICAgICAgICAgIHIgPSByZWNvcmRzW2ldO1xuICAgICAgICAgICAgICAgICAgICAoci5pbmRleCA+PSBpbmRleCkgJiYgKHIuaW5kZXggLT0gcmN0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgcHJldlJlY29yZCA9IHJlY29yZHMuc3BsaWNlKHJjaSwgMSlbMF07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGUgIT09IEFycmF5Q2hhbmdlVHlwZS5SRU1PVkUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSU5TRVJUID0+IFVQREFURSA6IElOU0VSVFxuICAgICAgICAgICAgICAgICAgICAvLyBSRU1PVkUgPT4gSU5TRVJUIDogVVBEQVRFXG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShOdW1iZXIoIXR5cGUpLCBpbmRleCwgbmV3VmFsdWUsIHByZXZSZWNvcmQub2xkVmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpbmRleGVzLmFkZChpbmRleCk7XG4gICAgICAgIHJlY29yZHNbbGVuXSA9IHsgdHlwZSwgaW5kZXgsIG5ld1ZhbHVlLCBvbGRWYWx1ZSB9O1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSA9PT0gc3RhdGUgJiYgMCA9PT0gbGVuKSB7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4gdGhpc1tfbm90aWZ5Q2hhbmdlc10oKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeUNoYW5nZXNdKCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCByZWNvcmRzIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFICE9PSBzdGF0ZSB8fCAwID09PSByZWNvcmRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgciBvZiByZWNvcmRzKSB7XG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKHIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXNbX25vdGlmeV0oT2JqZWN0LmZyZWV6ZShyZWNvcmRzKSBhcyBBcnJheUNoYW5nZVJlY29yZDxUPltdKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLnJlY29yZHMgPSBbXTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeV0ocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSk6IHZvaWQge1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaW50ZXJuYWwuaW5kZXhlcy5jbGVhcigpO1xuICAgICAgICBpbnRlcm5hbC5icm9rZXIuZ2V0KCkudHJpZ2dlcignQCcsIHJlY29yZHMpO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogT3ZlcnJpZGUgcmV0dXJuIHR5cGUgb2YgcHJvdG90eXBlIG1ldGhvZHNcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBPYnNlcnZhYmxlQXJyYXk8VD4ge1xuICAgIC8qKlxuICAgICAqIENvbWJpbmVzIHR3byBvciBtb3JlIGFycmF5cy5cbiAgICAgKiBAcGFyYW0gaXRlbXMgQWRkaXRpb25hbCBpdGVtcyB0byBhZGQgdG8gdGhlIGVuZCBvZiBhcnJheTEuXG4gICAgICovXG4gICAgY29uY2F0KC4uLml0ZW1zOiBUW11bXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBDb21iaW5lcyB0d28gb3IgbW9yZSBhcnJheXMuXG4gICAgICogQHBhcmFtIGl0ZW1zIEFkZGl0aW9uYWwgaXRlbXMgdG8gYWRkIHRvIHRoZSBlbmQgb2YgYXJyYXkxLlxuICAgICAqL1xuICAgIGNvbmNhdCguLi5pdGVtczogKFQgfCBUW10pW10pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogUmV2ZXJzZXMgdGhlIGVsZW1lbnRzIGluIGFuIEFycmF5LlxuICAgICAqL1xuICAgIHJldmVyc2UoKTogdGhpcztcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgc2VjdGlvbiBvZiBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0gc3RhcnQgVGhlIGJlZ2lubmluZyBvZiB0aGUgc3BlY2lmaWVkIHBvcnRpb24gb2YgdGhlIGFycmF5LlxuICAgICAqIEBwYXJhbSBlbmQgVGhlIGVuZCBvZiB0aGUgc3BlY2lmaWVkIHBvcnRpb24gb2YgdGhlIGFycmF5LlxuICAgICAqL1xuICAgIHNsaWNlKHN0YXJ0PzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZWxlbWVudHMgb2YgYW4gYXJyYXkgdGhhdCBtZWV0IHRoZSBjb25kaXRpb24gc3BlY2lmaWVkIGluIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIGNhbGxiYWNrZm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdXAgdG8gdGhyZWUgYXJndW1lbnRzLiBUaGUgZmlsdGVyIG1ldGhvZCBjYWxscyB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbiBvbmUgdGltZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBBbiBvYmplY3QgdG8gd2hpY2ggdGhlIHRoaXMga2V5d29yZCBjYW4gcmVmZXIgaW4gdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24uIElmIHRoaXNBcmcgaXMgb21pdHRlZCwgdW5kZWZpbmVkIGlzIHVzZWQgYXMgdGhlIHRoaXMgdmFsdWUuXG4gICAgICovXG4gICAgZmlsdGVyPFMgZXh0ZW5kcyBUPihjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHZhbHVlIGlzIFMsIHRoaXNBcmc/OiB1bmtub3duKTogT2JzZXJ2YWJsZUFycmF5PFM+O1xuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGVsZW1lbnRzIG9mIGFuIGFycmF5IHRoYXQgbWVldCB0aGUgY29uZGl0aW9uIHNwZWNpZmllZCBpbiBhIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqIEBwYXJhbSBjYWxsYmFja2ZuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIHVwIHRvIHRocmVlIGFyZ3VtZW50cy4gVGhlIGZpbHRlciBtZXRob2QgY2FsbHMgdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24gb25lIHRpbWUgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgYXJyYXkuXG4gICAgICogQHBhcmFtIHRoaXNBcmcgQW4gb2JqZWN0IHRvIHdoaWNoIHRoZSB0aGlzIGtleXdvcmQgY2FuIHJlZmVyIGluIHRoZSBjYWxsYmFja2ZuIGZ1bmN0aW9uLiBJZiB0aGlzQXJnIGlzIG9taXR0ZWQsIHVuZGVmaW5lZCBpcyB1c2VkIGFzIHRoZSB0aGlzIHZhbHVlLlxuICAgICAqL1xuICAgIGZpbHRlcihjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHVua25vd24sIHRoaXNBcmc/OiB1bmtub3duKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xufVxuXG4vKipcbiAqIE92ZXJyaWRlIHJldHVybiB0eXBlIG9mIHN0YXRpYyBtZXRob2RzXG4gKi9cbmV4cG9ydCBkZWNsYXJlIG5hbWVzcGFjZSBPYnNlcnZhYmxlQXJyYXkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvYmplY3QuXG4gICAgICogQHBhcmFtIGFycmF5TGlrZSBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZyb208VD4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4gfCBJdGVyYWJsZTxUPik6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvYmplY3QuXG4gICAgICogQHBhcmFtIGFycmF5TGlrZSBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSBtYXBmbiBBIG1hcHBpbmcgZnVuY3Rpb24gdG8gY2FsbCBvbiBldmVyeSBlbGVtZW50IG9mIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBWYWx1ZSBvZiAndGhpcycgdXNlZCB0byBpbnZva2UgdGhlIG1hcGZuLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZyb208VCwgVT4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4gfCBJdGVyYWJsZTxUPiwgbWFwZm46ICh0aGlzOiB2b2lkLCB2OiBULCBrOiBudW1iZXIpID0+IFUsIHRoaXNBcmc/OiB1bmRlZmluZWQpOiBPYnNlcnZhYmxlQXJyYXk8VT47XG4gICAgZnVuY3Rpb24gZnJvbTxYLCBULCBVPihhcnJheUxpa2U6IEFycmF5TGlrZTxUPiB8IEl0ZXJhYmxlPFQ+LCBtYXBmbjogKHRoaXM6IFgsIHY6IFQsIGs6IG51bWJlcikgPT4gVSwgdGhpc0FyZzogWCk6IE9ic2VydmFibGVBcnJheTxVPjtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgbmV3IGFycmF5IGZyb20gYSBzZXQgb2YgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIGl0ZW1zIEEgc2V0IG9mIGVsZW1lbnRzIHRvIGluY2x1ZGUgaW4gdGhlIG5ldyBhcnJheSBvYmplY3QuXG4gICAgICovXG4gICAgZnVuY3Rpb24gb2Y8VD4oLi4uaXRlbXM6IFRbXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbn1cbiJdLCJuYW1lcyI6WyJFdmVudEJyb2tlciIsIl9wcm94eUhhbmRsZXIiLCJpc1N0cmluZyIsInZlcmlmeSIsImlzQXJyYXkiLCJwb3N0IiwiZGVlcE1lcmdlIiwiZGVlcEVxdWFsIiwiaXNOdW1iZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBUUE7VUFDYSxnQkFBZ0IsQ0FBQTtJQUNqQixJQUFBLE9BQU8sQ0FBc0I7UUFDOUIsR0FBRyxHQUFBO0lBQ04sUUFBQSxPQUFPLElBQUksQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJQSxrQkFBVyxFQUFFLENBQUMsQ0FBQztTQUM3RDtJQUNKLENBQUE7SUFFRCxpQkFBd0IsTUFBTSxTQUFTLEdBQVEsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2xFLGlCQUF3QixNQUFNLE9BQU8sR0FBVSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDaEUsaUJBQXdCLE1BQU0sWUFBWSxHQUFLLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUN0RSxpQkFBd0IsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFFeEU7SUFDTSxTQUFVLGdCQUFnQixDQUFDLENBQVUsRUFBQTtRQUN2QyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUUsQ0FBbUIsQ0FBQyxTQUFTLENBQUMsRUFBRTtJQUN4QyxRQUFBLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQSx3Q0FBQSxDQUEwQyxDQUFDLENBQUM7SUFDbkUsS0FBQTtJQUNMOztJQzJDQTs7Ozs7OztJQU9HO0lBQ0csU0FBVSxZQUFZLENBQUMsQ0FBVSxFQUFBO1FBQ25DLE9BQU8sT0FBTyxDQUFDLENBQUMsSUFB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