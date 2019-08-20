/*!
 * @cdp/core-utils 0.9.0
 *   core framework utilities
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory((global.CDP = global.CDP || {}, global.CDP.Utils = global.CDP.Utils || {})));
}(this, function (exports) { 'use strict';

    /**
     * @en Safe `global` accessor.
     * @ja `global` アクセッサ
     *
     * @returns
     *  - `en` `global` object of the runtime environment
     *  - `ja` 環境に応じた `global` オブジェクト
     */
    function getGlobal() {
        // eslint-disable-next-line no-new-func
        return ('object' === typeof globalThis) ? globalThis : Function('return this')();
    }
    /**
     * @en Global config accessor.
     * @ja グローバルコンフィグアクセッサ
     */
    function getConfig() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const root = getGlobal();
        if (!root.CDP || !root.CDP.Config) {
            root.CDP = root.CDP || {};
            root.CDP.Config = root.Config || {};
        }
        return root.CDP.Config;
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    function exists(x) {
        return null != x;
    }
    /**
     * @en Check the value-type is [[Nil]].
     * @ja [[Nil]] 型であるか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isNil(x) {
        return null == x;
    }
    /**
     * @en Check the value-type is String.
     * @ja String 型であるか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isString(x) {
        return 'string' === typeof x;
    }
    /**
     * @en Check the value-type is Number.
     * @ja Number 型であるか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isNumber(x) {
        return 'number' === typeof x;
    }
    /**
     * @en Check the value-type is Boolean.
     * @ja Boolean 型であるか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isBoolean(x) {
        return 'boolean' === typeof x;
    }
    /**
     * @en Check the value-type is Symble.
     * @ja Symbol 型であるか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isSymbol(x) {
        return 'symbol' === typeof x;
    }
    /**
     * @en Check the value-type is primitive type.
     * @ja プリミティブ型であるか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isPrimitive(x) {
        return !x || ('function' !== typeof x) && ('object' !== typeof x);
    }
    /**
     * @en Check the value-type is Object.
     * @ja Object 型であるか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isObject(x) {
        return Boolean(x) && 'object' === typeof x;
    }
    /**
     * @en Check the value-type is Function.
     * @ja Function 型であるか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isFunction(x) {
        return 'function' === typeof x;
    }
    /**
     * @en Check the value-type is input.
     * @ja 指定した型であるか判定
     *
     * @param type
     *  - `en` evaluated type
     *  - `ja` 評価する型
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function typeOf(type, x) {
        return typeof x === type;
    }
    function isIterable(x) {
        return Symbol.iterator in Object(x);
    }
    /**
     * @en Check the value instance of input.
     * @ja 指定したインスタンスであるか判定
     *
     * @param ctor
     *  - `en` evaluated constructor
     *  - `ja` 評価するコンストラクタ
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function instanceOf(ctor, x) {
        return ('function' === typeof ctor) && (x instanceof ctor);
    }
    /**
     * @en Check the value instance of input constructor (except sub class).
     * @ja 指定コンストラクタのインスタンスであるか判定 (派生クラスは含めない)
     *
     * @param ctor
     *  - `en` evaluated constructor
     *  - `ja` 評価するコンストラクタ
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function ownInstanceOf(ctor, x) {
        return (null != x) && ('function' === typeof ctor) && (Object.getPrototypeOf(x) === Object(ctor.prototype));
    }
    /**
     * @en Get the value's class name.
     * @ja クラス名を取得
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function className(x) {
        if (x != null) {
            const toStringTagName = x[Symbol.toStringTag];
            if (isString(toStringTagName)) {
                return toStringTagName;
            }
            else if (isFunction(x) && x.prototype && null != x.name) {
                return x.name;
            }
            else {
                const ctor = x.constructor;
                if (isFunction(ctor) && ctor === Object(ctor.prototype).constructor) {
                    return ctor.name;
                }
            }
        }
        return Object.prototype.toString.call(x).slice(8, -1);
    }
    /**
     * @en Check input values are same value-type.
     * @ja 入力が同一型であるか判定
     *
     * @param lhs
     *  - `en` evaluated value
     *  - `ja` 評価する値
     * @param rhs
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function sameType(lhs, rhs) {
        return typeof lhs === typeof rhs;
    }
    /**
     * @en Check input values are same class.
     * @ja 入力が同一クラスであるか判定
     *
     * @param lhs
     *  - `en` evaluated value
     *  - `ja` 評価する値
     * @param rhs
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function sameClass(lhs, rhs) {
        if (null == lhs && null == rhs) {
            return className(lhs) === className(rhs);
        }
        else {
            return (null != lhs) && (null != rhs) && (Object.getPrototypeOf(lhs) === Object.getPrototypeOf(rhs));
        }
    }
    /**
     * @en Get shallow copy of `target` which has only `pickupKeys`.
     * @ja `pickupKeys` で指定されたプロパティのみを持つ `target` の Shallow Copy を取得
     *
     * @param target
     *  - `en` copy source object
     *  - `ja` コピー元オブジェクト
     * @param pickupKeys
     *  - `en` copy target keys
     *  - `ja` コピー対象のキー一覧
     */
    function partialize(target, ...pickupKeys) {
        if (!target || !isObject(target)) {
            throw new TypeError(`${className(target)} is not an object.`);
        }
        return pickupKeys.reduce((obj, key) => {
            key in target && (obj[key] = target[key]);
            return obj;
        }, {});
    }

    /**
     * @en Concrete type verifier object.
     * @ja 型検証実装オブジェクト
     *
     * @internal
     */
    const _verifier = {
        notNil: (x, message) => {
            if (null == x) {
                exists(message) || (message = `${className(x)} is not a valid value.`);
                throw new TypeError(message);
            }
        },
        typeOf: (type, x, message) => {
            if (typeof x !== type) {
                exists(message) || (message = `Type of ${className(x)} is not ${type}.`);
                throw new TypeError(message);
            }
        },
        array: (x, message) => {
            if (!Array.isArray(x)) {
                exists(message) || (message = `${className(x)} is not an Array.`);
                throw new TypeError(message);
            }
        },
        iterable: (x, message) => {
            if (!(Symbol.iterator in Object(x))) {
                exists(message) || (message = `${className(x)} is not an iterable object.`);
                throw new TypeError(message);
            }
        },
        instanceOf: (ctor, x, message) => {
            if (!(x instanceof ctor)) {
                exists(message) || (message = `${className(x)} is not an instance of ${ctor.name}.`);
                throw new TypeError(message);
            }
        },
        ownInstanceOf: (ctor, x, message) => {
            if (null == x || Object.getPrototypeOf(x) !== Object(ctor.prototype)) {
                exists(message) || (message = `The object is not own instance of ${ctor.name}.`);
                throw new TypeError(message);
            }
        },
        notOwnInstanceOf: (ctor, x, message) => {
            if (null != x && Object.getPrototypeOf(x) === Object(ctor.prototype)) {
                exists(message) || (message = `The object is own instance of ${ctor.name}.`);
                throw new TypeError(message);
            }
        },
        hasProperty: (x, prop, message) => {
            if (null == x || !(prop in x)) {
                exists(message) || (message = `The object does not have property ${String(prop)}.`);
                throw new TypeError(message);
            }
        },
        hasOwnProperty: (x, prop, message) => {
            if (null == x || !Object.prototype.hasOwnProperty.call(x, prop)) {
                exists(message) || (message = `The object does not have own property ${String(prop)}.`);
                throw new TypeError(message);
            }
        },
    };
    /**
     * @en Verify method.
     * @ja 検証メソッド
     *
     * @param method
     *  - `en` method name which using
     *  - `ja` 使用するメソッド名
     * @param args
     *  - `en` arguments which corresponds to the method name
     *  - `ja` メソッド名に対応する引数
     */
    function verify(method, ...args) {
        _verifier[method](...args); // eslint-disable-line @typescript-eslint/no-explicit-any
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    //__________________________________________________________________________________________________//
    const _objPrototype = Object.prototype;
    const _instanceOf = Function.prototype[Symbol.hasInstance];
    const _override = Symbol('override');
    const _isInherited = Symbol('isInherited');
    const _constructors = Symbol('constructors');
    const _classBase = Symbol('classBase');
    const _classSources = Symbol('classSources');
    // object properties copy method
    function copyProperties(target, source) {
        source && Object.getOwnPropertyNames(source)
            .filter(key => !/(prototype|name|constructor)/.test(key))
            .forEach(key => {
            if (null == target[key]) {
                Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
            }
        });
    }
    /**
     * @en Setup [Symbol.hasInstance] property. <br>
     *     The class designated as a source of [[mixins]]() has [Symbol.hasInstance] property implicitly. <br>
     *     It's used to avoid becoming the behavior `instanceof` doesn't intend when the class is extended from the mixined class the other place.
     * @ja [Symbol.hasInstance] プロパティ設定関数 <br>
     *     [[mixins]]() のソースに指定されたクラスは [Symbol.hasInstance] を暗黙的に備えるため<br>
     *     そのクラスが他で継承されている場合 `instanceof` が意図しない振る舞いとなるのを避けるために使用する.
     *
     * @example <br>
     *
     * ```ts
     * class Base {};
     * class Source {};
     * class MixinClass extends mixins(Base, Source) {};
     *
     * class Other extends Source {};
     *
     * const mixed = new MixinClass();
     * console.log(mixed instanceof MixinClass);    // true
     * console.log(mixed instanceof Base);          // true
     * console.log(mixed instanceof Source);        // true
     * console.log(mixed instanceof Other);         // true ???
     *
     * setInstanceOf(Other); // or setInstanceOf(Other, null);
     * console.log(mixed instanceof Other);         // false !
     * ```
     *
     * @param target
     *  - `en` set target constructor
     *  - `ja` 設定対象のコンストラクタ
     * @param method
     *  - `en` function by using [Symbol.hasInstance] <br>
     *         Default behaviour is `{ return target.prototype.isPrototypeOf(instance) }`
     *         If set `null`, delete [Symbol.hasInstance] property.
     *  - `ja` [Symbol.hasInstance] が使用する関数を指定 <br>
     *         既定では `{ return target.prototype.isPrototypeOf(instance) }` が使用される
     *         `null` 指定をすると [Symbol.hasInstance] プロパティを削除する
     */
    function setInstanceOf(target, method) {
        const behaviour = method || (null === method ? undefined : ((i) => Object.prototype.isPrototypeOf.call(target.prototype, i)));
        const applied = behaviour && Object.getOwnPropertyDescriptor(target, _override);
        if (!applied) {
            Object.defineProperties(target, {
                [Symbol.hasInstance]: {
                    value: behaviour,
                    writable: true,
                    enumerable: false,
                },
                [_override]: {
                    value: behaviour ? true : undefined,
                    writable: true,
                },
            });
        }
    }
    /**
     * @en Mixin function for multiple inheritance. <br>
     *     Resolving type support for maximum 10 classes.
     * @ja 多重継承のための Mixin <br>
     *     最大 10 クラスの型解決をサポート
     *
     * @example <br>
     *
     * ```ts
     * class Base { constructor(a, b) {} };
     * class MixA { constructor(a, b) {} };
     * class MixB { constructor(c, d) {} };
     *
     * class MixinClass extends mixins(Base, MixA, MixB) {
     *     constructor(a, b, c, d){
     *         // calling `Base` constructor
     *         super(a, b);
     *
     *         // calling Mixin class's constructor
     *         this.super(MixA, a, b);
     *         this.super(MixB, c, d);
     *     }
     * }
     * ```
     *
     * @param base
     *  - `en` primary base class. super(args) is this class's one.
     *  - `ja` 基底クラスコンストラクタ. 同名プロパティ, メソッドは最優先される. super(args) はこのクラスのものが指定可能.
     * @param sources
     *  - `en` multiple extends class
     *  - `ja` 拡張クラスコンストラクタ
     * @returns
     *  - `en` mixined class constructor
     *  - `ja` 合成されたクラスコンストラクタ
     */
    function mixins(base, ...sources) {
        // provide custom instanceof
        for (const srcClass of sources) {
            const desc = Object.getOwnPropertyDescriptor(srcClass, Symbol.hasInstance);
            if (!desc || desc.writable) {
                const orgInstanceOf = desc ? srcClass[Symbol.hasInstance] : _instanceOf;
                setInstanceOf(srcClass, (inst) => {
                    return orgInstanceOf.call(srcClass, inst) || ((null != inst && inst[_isInherited]) ? inst[_isInherited](srcClass) : false);
                });
            }
        }
        // eslint-disable-next-line @typescript-eslint/class-name-casing
        return class _MixinBase extends base {
            constructor(...args) {
                // eslint-disable-next-line constructor-super
                super(...args);
                const constructors = new Map();
                for (const srcClass of sources) {
                    const handler = {
                        apply: (target, thisobj, arglist) => {
                            copyProperties(_MixinBase.prototype, srcClass.prototype);
                            let parent = Object.getPrototypeOf(srcClass.prototype);
                            while (_objPrototype !== parent) {
                                copyProperties(_MixinBase.prototype, parent);
                                parent = Object.getPrototypeOf(parent);
                            }
                            const obj = new srcClass(...arglist);
                            copyProperties(this, obj);
                        }
                    };
                    // proxy for 'construct' and cache constructor
                    constructors.set(srcClass, new Proxy(srcClass, handler));
                }
                this[_constructors] = constructors;
                this[_classBase] = base;
            }
            super(srcClass, ...args) {
                const map = this[_constructors];
                const ctor = map.get(srcClass);
                if (ctor) {
                    ctor(...args);
                    map.set(srcClass, null); // prevent calling twice
                }
                return this;
            }
            isMixedWith(srcClass) {
                if (this.constructor === srcClass) {
                    return false;
                }
                else if (this[_classBase] === srcClass) {
                    return true;
                }
                else {
                    return this[_classSources].reduce((p, c) => p || (srcClass === c), false);
                }
            }
            static [Symbol.hasInstance](instance) {
                return Object.prototype.isPrototypeOf.call(_MixinBase.prototype, instance);
            }
            [_isInherited](srcClass) {
                const ctors = this[_constructors];
                if (ctors.has(srcClass)) {
                    return true;
                }
                for (const ctor of ctors.keys()) {
                    if (Object.prototype.isPrototypeOf.call(srcClass, ctor)) {
                        return true;
                    }
                }
                return false;
            }
            get [_classSources]() {
                return [...this[_constructors].keys()];
            }
        };
    }

    /**
     * @en Ensure asynchronous execution.
     * @ja 非同期実行を保証
     *
     * @example <br>
     *
     * ```ts
     * post(() => exec(arg));
     * ```
     *
     * @param executor
     *  - `en` implement as function scope.
     *  - `ja` 関数スコープとして実装
    */
    function post(executor) {
        return Promise.resolve().then(executor);
    }
    /**
     * @en Generic No-Operation.
     * @ja 汎用 No-Operation
     */
    function noop(...args) {
        // noop
    }

    exports.className = className;
    exports.exists = exists;
    exports.getConfig = getConfig;
    exports.getGlobal = getGlobal;
    exports.instanceOf = instanceOf;
    exports.isBoolean = isBoolean;
    exports.isFunction = isFunction;
    exports.isIterable = isIterable;
    exports.isNil = isNil;
    exports.isNumber = isNumber;
    exports.isObject = isObject;
    exports.isPrimitive = isPrimitive;
    exports.isString = isString;
    exports.isSymbol = isSymbol;
    exports.mixins = mixins;
    exports.noop = noop;
    exports.ownInstanceOf = ownInstanceOf;
    exports.partialize = partialize;
    exports.post = post;
    exports.sameClass = sameClass;
    exports.sameType = sameType;
    exports.setInstanceOf = setInstanceOf;
    exports.typeOf = typeOf;
    exports.verify = verify;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS11dGlscy5qcyIsInNvdXJjZXMiOlsiY29uZmlnLnRzIiwidHlwZXMudHMiLCJ2ZXJpZnkudHMiLCJtaXhpbnMudHMiLCJtaXNjLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGVuIFNhZmUgYGdsb2JhbGAgYWNjZXNzb3IuXG4gKiBAamEgYGdsb2JhbGAg44Ki44Kv44K744OD44K1XG4gKiBcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIGBnbG9iYWxgIG9iamVjdCBvZiB0aGUgcnVudGltZSBlbnZpcm9ubWVudFxuICogIC0gYGphYCDnkrDlooPjgavlv5zjgZjjgZ8gYGdsb2JhbGAg44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWwoKTogdHlwZW9mIGdsb2JhbFRoaXMge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1uZXctZnVuY1xuICAgIHJldHVybiAoJ29iamVjdCcgPT09IHR5cGVvZiBnbG9iYWxUaGlzKSA/IGdsb2JhbFRoaXMgOiBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xufVxuXG4vKipcbiAqIEBlbiBHbG9iYWwgY29uZmlnIGFjY2Vzc29yLlxuICogQGphIOOCsOODreODvOODkOODq+OCs+ODs+ODleOCo+OCsOOCouOCr+OCu+ODg+OCtVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnPFQgZXh0ZW5kcyB7fSA9IHt9PigpOiBUIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IHJvb3Q6IGFueSA9IGdldEdsb2JhbCgpO1xuICAgIGlmICghcm9vdC5DRFAgfHwgIXJvb3QuQ0RQLkNvbmZpZykge1xuICAgICAgICByb290LkNEUCA9IHJvb3QuQ0RQIHx8IHt9O1xuICAgICAgICByb290LkNEUC5Db25maWcgPSByb290LkNvbmZpZyB8fCB7fTtcbiAgICB9XG4gICAgcmV0dXJuIHJvb3QuQ0RQLkNvbmZpZztcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuLyoqXG4gKiBAZW4gVGhlIGdlbmVyYWwgbnVsbCB0eXBlLlxuICogQGphIOepuuOCkuekuuOBmeWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBOaWwgPSB2b2lkIHwgbnVsbCB8IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBAZW4gVGhlIHR5cGUgb2Ygb2JqZWN0IG9yIFtbTmlsXV0uXG4gKiBAamEgW1tOaWxdXSDjgavjgarjgorjgYjjgovjgqrjg5bjgrjjgqfjgq/jg4jlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgTmlsbGFibGU8VCBleHRlbmRzIHt9PiA9IFQgfCBOaWw7XG5cbi8qKlxuICogQGVuIFByaW1pdGl2ZSB0eXBlIG9mIEphdmFTY3JpcHQuXG4gKiBAamEgSmF2YVNjcmlwdCDjga7jg5fjg6rjg5/jg4bjgqPjg5blnotcbiAqL1xuZXhwb3J0IHR5cGUgUHJpbWl0aXZlID0gc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IHN5bWJvbCB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVuIEphdmFTY3JpcHQgdHlwZSBzZXQgaW50ZXJmYWNlLlxuICogQGphIEphdmFTY3JpcHQg44Gu5Z6L44Gu6ZuG5ZCIXG4gKi9cbmludGVyZmFjZSBUeXBlTGlzdCB7XG4gICAgc3RyaW5nOiBzdHJpbmc7XG4gICAgbnVtYmVyOiBudW1iZXI7XG4gICAgYm9vbGVhbjogYm9vbGVhbjtcbiAgICBzeW1ib2w6IHN5bWJvbDtcbiAgICB1bmRlZmluZWQ6IHZvaWQgfCB1bmRlZmluZWQ7XG4gICAgb2JqZWN0OiBvYmplY3QgfCBudWxsO1xuICAgIGZ1bmN0aW9uKC4uLmFyZ3M6IHVua25vd25bXSk6IHVua25vd247XG59XG5cbi8qKlxuICogQGVuIFRoZSBrZXkgbGlzdCBvZiBbW1R5cGVMaXN0XV0uXG4gKiBAamEgW1tUeXBlTGlzdF1dIOOCreODvOS4gOimp1xuICovXG5leHBvcnQgdHlwZSBUeXBlS2V5cyA9IGtleW9mIFR5cGVMaXN0O1xuXG4vKipcbiAqIEBlbiBUeXBlIGJhc2UgZGVmaW5pdGlvbi5cbiAqIEBqYSDlnovjga7opo/lrprlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUeXBlPFQgZXh0ZW5kcyB7fT4gZXh0ZW5kcyBGdW5jdGlvbiB7XG4gICAgcmVhZG9ubHkgcHJvdG90eXBlOiBUO1xufVxuXG4vKipcbiAqIEBlbiBUeXBlIG9mIGNvbnN0cnVjdG9yLlxuICogQGphIOOCs+ODs+OCueODiOODqeOCr+OCv+Wei1xuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbnN0cnVjdG9yPFQ+IGV4dGVuZHMgVHlwZTxUPiB7XG4gICAgbmV3KC4uLmFyZ3M6IHVua25vd25bXSk6IFQ7XG59XG5cbi8qKlxuICogQGVuIFR5cGUgb2YgY2xhc3MuXG4gKiBAamEg44Kv44Op44K55Z6LXG4gKi9cbmV4cG9ydCB0eXBlIENsYXNzPFQgPSBhbnk+ID0gQ29uc3RydWN0b3I8VD47XG5cbi8qKlxuICogQGVuIEVuc3VyZSBmb3IgZnVuY3Rpb24gcGFyYW1ldGVycyB0byB0dXBsZS5cbiAqIEBqYSDplqLmlbDjg5Hjg6njg6Hjg7zjgr/jgajjgZfjgaYgdHVwbGUg44KS5L+d6Ki8XG4gKi9cbmV4cG9ydCB0eXBlIEFyZ3VtZW50czxUPiA9IFQgZXh0ZW5kcyBhbnlbXSA/IFQgOiBbVF07XG5cbi8qKlxuICogQGVuIFJtb3ZlIGByZWFkb25seWAgYXR0cmlidXRlcyBmcm9tIGlucHV0IHR5cGUuXG4gKiBAamEgYHJlYWRvbmx5YCDlsZ7mgKfjgpLop6PpmaRcbiAqL1xuZXhwb3J0IHR5cGUgV3JpdGFibGU8VD4gPSB7IC1yZWFkb25seSBbSyBpbiBrZXlvZiBUXTogVFtLXSB9O1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IGZ1bmN0aW9uYWwgcHJvcGVydHkgbmFtZXMuXG4gKiBAamEg6Zai5pWw44OX44Ot44OR44OG44Kj5ZCN44Gu5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIEZ1bmN0aW9uUHJvcGVydHlOYW1lczxUPiA9IHsgW0sgaW4ga2V5b2YgVF06IFRbS10gZXh0ZW5kcyBGdW5jdGlvbiA/IEsgOiBuZXZlciB9W2tleW9mIFRdO1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IGZ1bmN0aW9uYWwgcHJvcGVydGllcy5cbiAqIEBqYSDplqLmlbDjg5fjg63jg5Hjg4bjgqPjga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgRnVuY3Rpb25Qcm9wZXJ0aWVzPFQ+ID0gUGljazxULCBGdW5jdGlvblByb3BlcnR5TmFtZXM8VD4+O1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG5vbi1mdW5jdGlvbmFsIHByb3BlcnR5IG5hbWVzLlxuICogQGphIOmdnumWouaVsOODl+ODreODkeODhuOCo+WQjeOBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VD4gPSB7IFtLIGluIGtleW9mIFRdOiBUW0tdIGV4dGVuZHMgRnVuY3Rpb24gPyBuZXZlciA6IEsgfVtrZXlvZiBUXTtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBub24tZnVuY3Rpb25hbCBwcm9wZXJ0aWVzLlxuICogQGphIOmdnumWouaVsOODl+ODreODkeODhuOCo+OBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBOb25GdW5jdGlvblByb3BlcnRpZXM8VD4gPSBQaWNrPFQsIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxUPj47XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgZXhpc3RzLlxuICogQGphIOWApOOBjOWtmOWcqOOBmeOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4aXN0czxPIGV4dGVuZHMge30+KHg6IE5pbGxhYmxlPE8+KTogeCBpcyBPO1xuZXhwb3J0IGZ1bmN0aW9uIGV4aXN0cyh4OiB1bmtub3duKTogeCBpcyB1bmtub3duO1xuZXhwb3J0IGZ1bmN0aW9uIGV4aXN0cyh4OiBhbnkpOiBhbnkge1xuICAgIHJldHVybiBudWxsICE9IHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFtbTmlsXV0uXG4gKiBAamEgW1tOaWxdXSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05pbCh4OiB1bmtub3duKTogeCBpcyBOaWwge1xuICAgIHJldHVybiBudWxsID09IHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFN0cmluZy5cbiAqIEBqYSBTdHJpbmcg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmcoeDogdW5rbm93bik6IHggaXMgc3RyaW5nIHtcbiAgICByZXR1cm4gJ3N0cmluZycgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBOdW1iZXIuXG4gKiBAamEgTnVtYmVyIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTnVtYmVyKHg6IHVua25vd24pOiB4IGlzIG51bWJlciB7XG4gICAgcmV0dXJuICdudW1iZXInID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgQm9vbGVhbi5cbiAqIEBqYSBCb29sZWFuIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQm9vbGVhbih4OiB1bmtub3duKTogeCBpcyBib29sZWFuIHtcbiAgICByZXR1cm4gJ2Jvb2xlYW4nID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgU3ltYmxlLlxuICogQGphIFN5bWJvbCDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N5bWJvbCh4OiB1bmtub3duKTogeCBpcyBzeW1ib2wge1xuICAgIHJldHVybiAnc3ltYm9sJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIHByaW1pdGl2ZSB0eXBlLlxuICogQGphIOODl+ODquODn+ODhuOCo+ODluWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUHJpbWl0aXZlKHg6IHVua25vd24pOiB4IGlzIFByaW1pdGl2ZSB7XG4gICAgcmV0dXJuICF4IHx8ICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgeCkgJiYgKCdvYmplY3QnICE9PSB0eXBlb2YgeCk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIE9iamVjdC5cbiAqIEBqYSBPYmplY3Qg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNPYmplY3QoeDogdW5rbm93bik6IHggaXMgb2JqZWN0IHtcbiAgICByZXR1cm4gQm9vbGVhbih4KSAmJiAnb2JqZWN0JyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIEZ1bmN0aW9uLlxuICogQGphIEZ1bmN0aW9uIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRnVuY3Rpb24oeDogdW5rbm93bik6IHggaXMgVHlwZUxpc3RbJ2Z1bmN0aW9uJ10ge1xuICAgIHJldHVybiAnZnVuY3Rpb24nID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgaW5wdXQuXG4gKiBAamEg5oyH5a6a44GX44Gf5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHR5cGVcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHR5cGVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5Z6LXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0eXBlT2Y8SyBleHRlbmRzIFR5cGVLZXlzPih0eXBlOiBLLCB4OiB1bmtub3duKTogeCBpcyBUeXBlTGlzdFtLXSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSB0eXBlO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgaGFzIGl0ZXJhdG9yLlxuICogQGphIGl0ZXJhdG9yIOOCkuaJgOacieOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGU8VD4oeDogTmlsbGFibGU8SXRlcmFibGU8VD4+KTogeCBpcyBJdGVyYWJsZTxUPjtcbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlKHg6IHVua25vd24pOiB4IGlzIEl0ZXJhYmxlPHVua25vd24+O1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGUoeDogYW55KTogYW55IHtcbiAgICByZXR1cm4gU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdCh4KTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGluc3RhbmNlIG9mIGlucHV0LlxuICogQGphIOaMh+WumuOBl+OBn+OCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDoqZXkvqHjgZnjgovjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluc3RhbmNlT2Y8VCBleHRlbmRzIHt9PihjdG9yOiBOaWxsYWJsZTxUeXBlPFQ+PiwgeDogdW5rbm93bik6IHggaXMgVCB7XG4gICAgcmV0dXJuICgnZnVuY3Rpb24nID09PSB0eXBlb2YgY3RvcikgJiYgKHggaW5zdGFuY2VvZiBjdG9yKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGluc3RhbmNlIG9mIGlucHV0IGNvbnN0cnVjdG9yIChleGNlcHQgc3ViIGNsYXNzKS5cbiAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvliKTlrpogKOa0vueUn+OCr+ODqeOCueOBr+WQq+OCgeOBquOBhClcbiAqXG4gKiBAcGFyYW0gY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL44Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvd25JbnN0YW5jZU9mPFQgZXh0ZW5kcyB7fT4oY3RvcjogTmlsbGFibGU8VHlwZTxUPj4sIHg6IHVua25vd24pOiB4IGlzIFQge1xuICAgIHJldHVybiAobnVsbCAhPSB4KSAmJiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGN0b3IpICYmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgPT09IE9iamVjdChjdG9yLnByb3RvdHlwZSkpO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIHZhbHVlJ3MgY2xhc3MgbmFtZS5cbiAqIEBqYSDjgq/jg6njgrnlkI3jgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGFzc05hbWUoeDogYW55KTogc3RyaW5nIHtcbiAgICBpZiAoeCAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHRvU3RyaW5nVGFnTmFtZSA9IHhbU3ltYm9sLnRvU3RyaW5nVGFnXTtcbiAgICAgICAgaWYgKGlzU3RyaW5nKHRvU3RyaW5nVGFnTmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0b1N0cmluZ1RhZ05hbWU7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbih4KSAmJiB4LnByb3RvdHlwZSAmJiBudWxsICE9IHgubmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHgubmFtZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGN0b3IgPSB4LmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oY3RvcikgJiYgY3RvciA9PT0gKE9iamVjdChjdG9yLnByb3RvdHlwZSkgYXMgb2JqZWN0KS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjdG9yLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgYXMgc3RyaW5nKS5zbGljZSg4LCAtMSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIGlucHV0IHZhbHVlcyBhcmUgc2FtZSB2YWx1ZS10eXBlLlxuICogQGphIOWFpeWKm+OBjOWQjOS4gOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBsaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICogQHBhcmFtIHJoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1lVHlwZShsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0eXBlb2YgbGhzID09PSB0eXBlb2YgcmhzO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBpbnB1dCB2YWx1ZXMgYXJlIHNhbWUgY2xhc3MuXG4gKiBAamEg5YWl5Yqb44GM5ZCM5LiA44Kv44Op44K544Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGxoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKiBAcGFyYW0gcmhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhbWVDbGFzcyhsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIGlmIChudWxsID09IGxocyAmJiBudWxsID09IHJocykge1xuICAgICAgICByZXR1cm4gY2xhc3NOYW1lKGxocykgPT09IGNsYXNzTmFtZShyaHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAobnVsbCAhPSBsaHMpICYmIChudWxsICE9IHJocykgJiYgKE9iamVjdC5nZXRQcm90b3R5cGVPZihsaHMpID09PSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocmhzKSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBHZXQgc2hhbGxvdyBjb3B5IG9mIGB0YXJnZXRgIHdoaWNoIGhhcyBvbmx5IGBwaWNrdXBLZXlzYC5cbiAqIEBqYSBgcGlja3VwS2V5c2Ag44Gn5oyH5a6a44GV44KM44Gf44OX44Ot44OR44OG44Kj44Gu44G/44KS5oyB44GkIGB0YXJnZXRgIOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBjb3B5IHNvdXJjZSBvYmplY3RcbiAqICAtIGBqYWAg44Kz44OU44O85YWD44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gcGlja3VwS2V5c1xuICogIC0gYGVuYCBjb3B5IHRhcmdldCBrZXlzXG4gKiAgLSBgamFgIOOCs+ODlOODvOWvvuixoeOBruOCreODvOS4gOimp1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFydGlhbGl6ZTxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMga2V5b2YgVD4odGFyZ2V0OiBULCAuLi5waWNrdXBLZXlzOiBLW10pOiBXcml0YWJsZTxQaWNrPFQsIEs+PiB7XG4gICAgaWYgKCF0YXJnZXQgfHwgIWlzT2JqZWN0KHRhcmdldCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHtjbGFzc05hbWUodGFyZ2V0KX0gaXMgbm90IGFuIG9iamVjdC5gKTtcbiAgICB9XG4gICAgcmV0dXJuIHBpY2t1cEtleXMucmVkdWNlKChvYmosIGtleSkgPT4ge1xuICAgICAgICBrZXkgaW4gdGFyZ2V0ICYmIChvYmpba2V5XSA9IHRhcmdldFtrZXldKTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9LCB7fSBhcyBXcml0YWJsZTxQaWNrPFQsIEs+Pik7XG59XG4iLCJpbXBvcnQgeyBUeXBlS2V5cywgZXhpc3RzLCBjbGFzc05hbWUgfSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBAZW4gVHlwZSB2ZXJpZmllciBpbnRlcmZhY2UgZGVmaW5pdGlvbi4gPGJyPlxuICogICAgIElmIGludmFsaWQgdmFsdWUgcmVjZWl2ZWQsIHRoZSBtZXRob2QgdGhyb3dzIGBUeXBlRXJyb3JgLlxuICogQGphIOWei+aknOiovOOBruOCpOODs+OCv+ODvOODleOCp+OCpOOCueWumue+qSA8YnI+XG4gKiAgICAg6YGV5Y+N44GX44Gf5aC05ZCI44GvIGBUeXBlRXJyb3JgIOOCkueZuueUn1xuICpcbiAqXG4gKi9cbmludGVyZmFjZSBWZXJpZmllciB7XG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGlzIG5vdCBbW05pbF1dLlxuICAgICAqIEBqYSBbW05pbF1dIOOBp+OBquOBhOOBk+OBqOOCkuaknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIG5vdE5pbC54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBub3ROaWwubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIG5vdE5pbDogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaXMgW1tUeXBlS2V5c11dLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ8gW1tUeXBlS2V5c11dIOOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVPZi50eXBlXG4gICAgICogIC0gYGVuYCBvbmUgb2YgW1tUeXBlS2V5c11dXG4gICAgICogIC0gYGphYCBbW1R5cGVLZXlzXV0g44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHR5cGVPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSB0eXBlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIHR5cGVPZjogKHR5cGU6IFR5cGVLZXlzLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGlzIGBBcnJheWAuXG4gICAgICogQGphIGBBcnJheWAg44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXkueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gYXJyYXkubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGFycmF5OiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBpcyBgSXRlcmFibGVgLlxuICAgICAqIEBqYSBgSXRlcmFibGVgIOOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGl0ZXJhYmxlLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGl0ZXJhYmxlLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBpdGVyYWJsZTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaW5zdGFuY2UgaXMgZXF1YWwgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbnN0YW5jZU9mLmN0b3JcbiAgICAgKiAgLSBgZW5gIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5q+U6LyD5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluc3RhbmNlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaW5zdGFuY2VPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGluc3RhbmNlIGhhcyBgc3RyaWN0bHlgIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44Gu5Y6z5a+G5LiA6Ie044GX44Gf44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3duSW5zdGFuY2VPZi5jdG9yXG4gICAgICogIC0gYGVuYCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOavlOi8g+WvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBvd25JbnN0YW5jZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIG93bkluc3RhbmNlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIG93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpbnN0YW5jZSBoYXMgbm90IGBzdHJpY3RseWAgZXF1YWwgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jgpLmjIHjgaTjgqTjg7Pjgrnjgr/jg7PjgrnjgafjgarjgYTjgZPjgajjgpLmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub3RPd25JbnN0YW5jZU9mLmN0b3JcbiAgICAgKiAgLSBgZW5gIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5q+U6LyD5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIG5vdE93bkluc3RhbmNlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gbm90T3duSW5zdGFuY2VPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgbm90T3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGhhcyBzcGVjaWZpZWQgcHJvcGVydHkuXG4gICAgICogQGphIOaMh+WumuODl+ODreODkeODhuOCo+OCkuaMgeOBo+OBpuOBhOOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGhhc1Byb3BlcnR5LnByb3BcbiAgICAgKiAgLSBgZW5gIHNwZWNpZmllZCBwcm9wZXJ0eVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44OX44Ot44OR44OG44KjXG4gICAgICogQHBhcmFtIGhhc1Byb3BlcnR5LnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGhhc1Byb3BlcnR5Lm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBoYXNQcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGhhcyBvd24gc3BlY2lmaWVkIHByb3BlcnR5LlxuICAgICAqIEBqYSDmjIflrprjg5fjg63jg5Hjg4bjgqPjgpLlhaXlipvlgKToh6rouqvmjIHjgaPjgabjgYTjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS5wcm9wXG4gICAgICogIC0gYGVuYCBzcGVjaWZpZWQgcHJvcGVydHlcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaGFzT3duUHJvcGVydHk6ICh4OiB1bmtub3duLCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcbn1cblxuLyoqXG4gKiBAZW4gTGlzdCBvZiBtZXRob2QgZm9yIHR5cGUgdmVyaWZ5LlxuICogQGphIOWei+aknOiovOOBjOaPkOS+m+OBmeOCi+ODoeOCveODg+ODieS4gOimp1xuICovXG50eXBlIFZlcmlmeU1ldGhvZCA9IGtleW9mIFZlcmlmaWVyO1xuXG4vKipcbiAqIEBlbiBDb25jcmV0ZSB0eXBlIHZlcmlmaWVyIG9iamVjdC5cbiAqIEBqYSDlnovmpJzoqLzlrp/oo4Xjgqrjg5bjgrjjgqfjgq/jg4hcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuY29uc3QgX3ZlcmlmaWVyOiBWZXJpZmllciA9IHtcbiAgICBub3ROaWw6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHgpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGEgdmFsaWQgdmFsdWUuYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHR5cGVPZjogKHR5cGU6IFR5cGVLZXlzLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgeCAhPT0gdHlwZSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFR5cGUgb2YgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCAke3R5cGV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBhcnJheTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHgpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhbiBBcnJheS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaXRlcmFibGU6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICghKFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoeCkpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhbiBpdGVyYWJsZSBvYmplY3QuYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAoISh4IGluc3RhbmNlb2YgY3RvcikpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGFuIGluc3RhbmNlIG9mICR7Y3Rvci5uYW1lfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgb3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHggfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpICE9PSBPYmplY3QoY3Rvci5wcm90b3R5cGUpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBpcyBub3Qgb3duIGluc3RhbmNlIG9mICR7Y3Rvci5uYW1lfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgbm90T3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsICE9IHggJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpID09PSBPYmplY3QoY3Rvci5wcm90b3R5cGUpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBpcyBvd24gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBoYXNQcm9wZXJ0eTogKHg6IGFueSwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHsgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICAgIGlmIChudWxsID09IHggfHwgIShwcm9wIGluIHgpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBkb2VzIG5vdCBoYXZlIHByb3BlcnR5ICR7U3RyaW5nKHByb3ApfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaGFzT3duUHJvcGVydHk6ICh4OiB1bmtub3duLCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCA9PSB4IHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoeCwgcHJvcCkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGRvZXMgbm90IGhhdmUgb3duIHByb3BlcnR5ICR7U3RyaW5nKHByb3ApfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBAZW4gVmVyaWZ5IG1ldGhvZC5cbiAqIEBqYSDmpJzoqLzjg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gbWV0aG9kXG4gKiAgLSBgZW5gIG1ldGhvZCBuYW1lIHdoaWNoIHVzaW5nXG4gKiAgLSBgamFgIOS9v+eUqOOBmeOCi+ODoeOCveODg+ODieWQjVxuICogQHBhcmFtIGFyZ3NcbiAqICAtIGBlbmAgYXJndW1lbnRzIHdoaWNoIGNvcnJlc3BvbmRzIHRvIHRoZSBtZXRob2QgbmFtZVxuICogIC0gYGphYCDjg6Hjgr3jg4Pjg4nlkI3jgavlr77lv5zjgZnjgovlvJXmlbBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZlcmlmeTxUTWV0aG9kIGV4dGVuZHMgVmVyaWZ5TWV0aG9kPihtZXRob2Q6IFRNZXRob2QsIC4uLmFyZ3M6IFBhcmFtZXRlcnM8VmVyaWZpZXJbVE1ldGhvZF0+KTogdm9pZCB8IG5ldmVyIHtcbiAgICAoX3ZlcmlmaWVyW21ldGhvZF0gYXMgYW55KSguLi5hcmdzKTsgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG59XG5cbmV4cG9ydCB7IHZlcmlmeSBhcyBkZWZhdWx0IH07XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7IFR5cGUsIENsYXNzLCBDb25zdHJ1Y3RvciB9IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIEBlbiBNaXhpbiBjbGFzcydzIGJhc2UgaW50ZXJmYWNlLlxuICogQGphIE1peGluIOOCr+ODqeOCueOBruWfuuW6leOCpOODs+OCv+ODvOODleOCp+OCpOOCueWumue+qVxuICovXG5leHBvcnQgZGVjbGFyZSBjbGFzcyBNaXhpbkNsYXNzIHtcbiAgICAvKipcbiAgICAgKiBAZW4gY2FsbCBtaXhpbiBzb3VyY2UgY2xhc3MncyBgc3VwZXIoKWAuIDxicj5cbiAgICAgKiAgICAgVGhpcyBtZXRob2Qgc2hvdWxkIGJlIGNhbGxlZCBmcm9tIGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSBNaXhpbiDjgq/jg6njgrnjga7ln7rlupXjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqkgPGJyPlxuICAgICAqICAgICDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jgYvjgonlkbzjgbbjgZPjgajjgpLmg7PlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzcmNDbGFzc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIHRhcmdldCBjbGFzcyBuYW1lLiBleCkgZnJvbSBTMSBhdmFpbGFibGVcbiAgICAgKiAgLSBgamFgIOOCs+ODs+OCueODiOODqeOCr+ODiOOBmeOCi+OCr+ODqeOCueWQjeOCkuaMh+WumiBleCkgUzEg44GL44KJ5oyH5a6a5Y+v6IO9XG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBwYXJhbWV0ZXJzXG4gICAgICogIC0gYGphYCDjgrPjg7Pjgrnjg4jjg6njgq/jg4jjgavkvb/nlKjjgZnjgovlvJXmlbBcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgc3VwZXI8VCBleHRlbmRzIENsYXNzPihzcmNDbGFzczogVCwgLi4uYXJnczogQ29uc3RydWN0b3JQYXJhbWV0ZXJzPFQ+KTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgaW5wdXQgY2xhc3MgaXMgbWl4aW5lZCAoZXhjbHVkaW5nIG93biBjbGFzcykuXG4gICAgICogQGphIOaMh+WumuOCr+ODqeOCueOBjCBNaXhpbiDjgZXjgozjgabjgYTjgovjgYvnorroqo0gKOiHqui6q+OBruOCr+ODqeOCueOBr+WQq+OBvuOCjOOBquOBhClcbiAgICAgKlxuICAgICAqIEBwYXJhbSBtaXhlZENsYXNzXG4gICAgICogIC0gYGVuYCBzZXQgdGFyZ2V0IGNsYXNzIGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDlr77osaHjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/jgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgaXNNaXhlZFdpdGg8VD4obWl4ZWRDbGFzczogQ29uc3RydWN0b3I8VD4pOiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBlbiBNaXhlZCBzdWIgY2xhc3MgY29uc3RydWN0b3IgZGVmaW5pdGlvbnMuXG4gKiBAamEg5ZCI5oiQ44GX44Gf44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWl4aW5Db25zdHJ1Y3RvcjxCIGV4dGVuZHMgQ2xhc3MsIFU+IGV4dGVuZHMgVHlwZTxVPiB7XG4gICAgLyoqXG4gICAgICogQGVuIGNvbnN0cnVjdG9yXG4gICAgICogQGphIOOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGJhc2UgY2xhc3MgYXJndW1lbnRzXG4gICAgICogIC0gYGphYCDln7rlupXjgq/jg6njgrnjgavmjIflrprjgZfjgZ/lvJXmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdW5pb24gdHlwZSBvZiBjbGFzc2VzIHdoZW4gY2FsbGluZyBbW21peGluc11dKClcbiAgICAgKiAgLSBgamFgIFtbbWl4aW5zXV0oKSDjgavmuKHjgZfjgZ/jgq/jg6njgrnjga7pm4blkIhcbiAgICAgKi9cbiAgICBuZXcoLi4uYXJnczogQ29uc3RydWN0b3JQYXJhbWV0ZXJzPEI+KTogVTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbmNvbnN0IF9vYmpQcm90b3R5cGUgPSBPYmplY3QucHJvdG90eXBlO1xuY29uc3QgX2luc3RhbmNlT2YgICA9IEZ1bmN0aW9uLnByb3RvdHlwZVtTeW1ib2wuaGFzSW5zdGFuY2VdO1xuY29uc3QgX292ZXJyaWRlICAgICA9IFN5bWJvbCgnb3ZlcnJpZGUnKTtcbmNvbnN0IF9pc0luaGVyaXRlZCAgPSBTeW1ib2woJ2lzSW5oZXJpdGVkJyk7XG5jb25zdCBfY29uc3RydWN0b3JzID0gU3ltYm9sKCdjb25zdHJ1Y3RvcnMnKTtcbmNvbnN0IF9jbGFzc0Jhc2UgICAgPSBTeW1ib2woJ2NsYXNzQmFzZScpO1xuY29uc3QgX2NsYXNzU291cmNlcyA9IFN5bWJvbCgnY2xhc3NTb3VyY2VzJyk7XG5cbi8vIG9iamVjdCBwcm9wZXJ0aWVzIGNvcHkgbWV0aG9kXG5mdW5jdGlvbiBjb3B5UHJvcGVydGllcyh0YXJnZXQ6IG9iamVjdCwgc291cmNlPzogb2JqZWN0KTogdm9pZCB7XG4gICAgc291cmNlICYmIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHNvdXJjZSlcbiAgICAgICAgLmZpbHRlcihrZXkgPT4gIS8ocHJvdG90eXBlfG5hbWV8Y29uc3RydWN0b3IpLy50ZXN0KGtleSkpXG4gICAgICAgIC5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSB0YXJnZXRba2V5XSkge1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzb3VyY2UsIGtleSkgYXMgUHJvcGVydHlEZWNvcmF0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cblxuLyoqXG4gKiBAZW4gU2V0dXAgW1N5bWJvbC5oYXNJbnN0YW5jZV0gcHJvcGVydHkuIDxicj5cbiAqICAgICBUaGUgY2xhc3MgZGVzaWduYXRlZCBhcyBhIHNvdXJjZSBvZiBbW21peGluc11dKCkgaGFzIFtTeW1ib2wuaGFzSW5zdGFuY2VdIHByb3BlcnR5IGltcGxpY2l0bHkuIDxicj5cbiAqICAgICBJdCdzIHVzZWQgdG8gYXZvaWQgYmVjb21pbmcgdGhlIGJlaGF2aW9yIGBpbnN0YW5jZW9mYCBkb2Vzbid0IGludGVuZCB3aGVuIHRoZSBjbGFzcyBpcyBleHRlbmRlZCBmcm9tIHRoZSBtaXhpbmVkIGNsYXNzIHRoZSBvdGhlciBwbGFjZS5cbiAqIEBqYSBbU3ltYm9sLmhhc0luc3RhbmNlXSDjg5fjg63jg5Hjg4bjgqPoqK3lrprplqLmlbAgPGJyPlxuICogICAgIFtbbWl4aW5zXV0oKSDjga7jgr3jg7zjgrnjgavmjIflrprjgZXjgozjgZ/jgq/jg6njgrnjga8gW1N5bWJvbC5oYXNJbnN0YW5jZV0g44KS5pqX6buZ55qE44Gr5YKZ44GI44KL44Gf44KBPGJyPlxuICogICAgIOOBneOBruOCr+ODqeOCueOBjOS7luOBp+e2meaJv+OBleOCjOOBpuOBhOOCi+WgtOWQiCBgaW5zdGFuY2VvZmAg44GM5oSP5Zuz44GX44Gq44GE5oyv44KL6Iie44GE44Go44Gq44KL44Gu44KS6YG/44GR44KL44Gf44KB44Gr5L2/55So44GZ44KLLlxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2xhc3MgQmFzZSB7fTtcbiAqIGNsYXNzIFNvdXJjZSB7fTtcbiAqIGNsYXNzIE1peGluQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoQmFzZSwgU291cmNlKSB7fTtcbiAqIFxuICogY2xhc3MgT3RoZXIgZXh0ZW5kcyBTb3VyY2Uge307XG4gKlxuICogY29uc3QgbWl4ZWQgPSBuZXcgTWl4aW5DbGFzcygpO1xuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBNaXhpbkNsYXNzKTsgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBCYXNlKTsgICAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBTb3VyY2UpOyAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBPdGhlcik7ICAgICAgICAgLy8gdHJ1ZSA/Pz9cbiAqXG4gKiBzZXRJbnN0YW5jZU9mKE90aGVyKTsgLy8gb3Igc2V0SW5zdGFuY2VPZihPdGhlciwgbnVsbCk7XG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyBmYWxzZSAhXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHNldCB0YXJnZXQgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg6Kit5a6a5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcGFyYW0gbWV0aG9kXG4gKiAgLSBgZW5gIGZ1bmN0aW9uIGJ5IHVzaW5nIFtTeW1ib2wuaGFzSW5zdGFuY2VdIDxicj5cbiAqICAgICAgICAgRGVmYXVsdCBiZWhhdmlvdXIgaXMgYHsgcmV0dXJuIHRhcmdldC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnN0YW5jZSkgfWBcbiAqICAgICAgICAgSWYgc2V0IGBudWxsYCwgZGVsZXRlIFtTeW1ib2wuaGFzSW5zdGFuY2VdIHByb3BlcnR5LlxuICogIC0gYGphYCBbU3ltYm9sLmhhc0luc3RhbmNlXSDjgYzkvb/nlKjjgZnjgovplqLmlbDjgpLmjIflrpogPGJyPlxuICogICAgICAgICDml6Llrprjgafjga8gYHsgcmV0dXJuIHRhcmdldC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnN0YW5jZSkgfWAg44GM5L2/55So44GV44KM44KLXG4gKiAgICAgICAgIGBudWxsYCDmjIflrprjgpLjgZnjgovjgaggW1N5bWJvbC5oYXNJbnN0YW5jZV0g44OX44Ot44OR44OG44Kj44KS5YmK6Zmk44GZ44KLXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRJbnN0YW5jZU9mPFQgZXh0ZW5kcyB7fT4odGFyZ2V0OiBDb25zdHJ1Y3RvcjxUPiwgbWV0aG9kPzogKChpbnN0OiBvYmplY3QpID0+IGJvb2xlYW4pIHwgbnVsbCk6IHZvaWQge1xuICAgIGNvbnN0IGJlaGF2aW91ciA9IG1ldGhvZCB8fCAobnVsbCA9PT0gbWV0aG9kID8gdW5kZWZpbmVkIDogKChpOiBvYmplY3QpID0+IE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZi5jYWxsKHRhcmdldC5wcm90b3R5cGUsIGkpKSk7XG4gICAgY29uc3QgYXBwbGllZCA9IGJlaGF2aW91ciAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgX292ZXJyaWRlKTtcbiAgICBpZiAoIWFwcGxpZWQpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGFyZ2V0LCB7XG4gICAgICAgICAgICBbU3ltYm9sLmhhc0luc3RhbmNlXToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBiZWhhdmlvdXIsXG4gICAgICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW19vdmVycmlkZV06IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogYmVoYXZpb3VyID8gdHJ1ZSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gTWl4aW4gZnVuY3Rpb24gZm9yIG11bHRpcGxlIGluaGVyaXRhbmNlLiA8YnI+XG4gKiAgICAgUmVzb2x2aW5nIHR5cGUgc3VwcG9ydCBmb3IgbWF4aW11bSAxMCBjbGFzc2VzLlxuICogQGphIOWkmumHjee2meaJv+OBruOBn+OCgeOBriBNaXhpbiA8YnI+XG4gKiAgICAg5pyA5aSnIDEwIOOCr+ODqeOCueOBruWei+ino+axuuOCkuOCteODneODvOODiFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2xhc3MgQmFzZSB7IGNvbnN0cnVjdG9yKGEsIGIpIHt9IH07XG4gKiBjbGFzcyBNaXhBIHsgY29uc3RydWN0b3IoYSwgYikge30gfTtcbiAqIGNsYXNzIE1peEIgeyBjb25zdHJ1Y3RvcihjLCBkKSB7fSB9O1xuICpcbiAqIGNsYXNzIE1peGluQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoQmFzZSwgTWl4QSwgTWl4Qikge1xuICogICAgIGNvbnN0cnVjdG9yKGEsIGIsIGMsIGQpe1xuICogICAgICAgICAvLyBjYWxsaW5nIGBCYXNlYCBjb25zdHJ1Y3RvclxuICogICAgICAgICBzdXBlcihhLCBiKTtcbiAqXG4gKiAgICAgICAgIC8vIGNhbGxpbmcgTWl4aW4gY2xhc3MncyBjb25zdHJ1Y3RvclxuICogICAgICAgICB0aGlzLnN1cGVyKE1peEEsIGEsIGIpO1xuICogICAgICAgICB0aGlzLnN1cGVyKE1peEIsIGMsIGQpO1xuICogICAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBiYXNlXG4gKiAgLSBgZW5gIHByaW1hcnkgYmFzZSBjbGFzcy4gc3VwZXIoYXJncykgaXMgdGhpcyBjbGFzcydzIG9uZS5cbiAqICAtIGBqYWAg5Z+65bqV44Kv44Op44K544Kz44Oz44K544OI44Op44Kv44K/LiDlkIzlkI3jg5fjg63jg5Hjg4bjgqMsIOODoeOCveODg+ODieOBr+acgOWEquWFiOOBleOCjOOCiy4gc3VwZXIoYXJncykg44Gv44GT44Gu44Kv44Op44K544Gu44KC44Gu44GM5oyH5a6a5Y+v6IO9LlxuICogQHBhcmFtIHNvdXJjZXNcbiAqICAtIGBlbmAgbXVsdGlwbGUgZXh0ZW5kcyBjbGFzc1xuICogIC0gYGphYCDmi6HlvLXjgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIG1peGluZWQgY2xhc3MgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg5ZCI5oiQ44GV44KM44Gf44Kv44Op44K544Kz44Oz44K544OI44Op44Kv44K/XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtaXhpbnM8QiBleHRlbmRzIENsYXNzLCBTMSwgUzIsIFMzLCBTNCwgUzUsIFM2LCBTNywgUzgsIFM5PihcbiAgICBiYXNlOiBCLFxuICAgIC4uLnNvdXJjZXM6IFtcbiAgICAgICAgQ29uc3RydWN0b3I8UzE+LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTMj4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTMz4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTND4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNT4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNj4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNz4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTOD4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTOT4/LFxuICAgICAgICAuLi5hbnlbXVxuICAgIF0pOiBNaXhpbkNvbnN0cnVjdG9yPEIsIE1peGluQ2xhc3MgJiBJbnN0YW5jZVR5cGU8Qj4gJiBTMSAmIFMyICYgUzMgJiBTNCAmIFM1ICYgUzYgJiBTNyAmIFM4ICYgUzk+IHtcblxuICAgIC8vIHByb3ZpZGUgY3VzdG9tIGluc3RhbmNlb2ZcbiAgICBmb3IgKGNvbnN0IHNyY0NsYXNzIG9mIHNvdXJjZXMpIHtcbiAgICAgICAgY29uc3QgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc3JjQ2xhc3MsIFN5bWJvbC5oYXNJbnN0YW5jZSk7XG4gICAgICAgIGlmICghZGVzYyB8fCBkZXNjLndyaXRhYmxlKSB7XG4gICAgICAgICAgICBjb25zdCBvcmdJbnN0YW5jZU9mID0gZGVzYyA/IHNyY0NsYXNzW1N5bWJvbC5oYXNJbnN0YW5jZV0gOiBfaW5zdGFuY2VPZjtcbiAgICAgICAgICAgIHNldEluc3RhbmNlT2Yoc3JjQ2xhc3MsIChpbnN0OiBvYmplY3QpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3JnSW5zdGFuY2VPZi5jYWxsKHNyY0NsYXNzLCBpbnN0KSB8fCAoKG51bGwgIT0gaW5zdCAmJiBpbnN0W19pc0luaGVyaXRlZF0pID8gaW5zdFtfaXNJbmhlcml0ZWRdKHNyY0NsYXNzKSA6IGZhbHNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9jbGFzcy1uYW1lLWNhc2luZ1xuICAgIHJldHVybiBjbGFzcyBfTWl4aW5CYXNlIGV4dGVuZHMgKGJhc2UgYXMgYW55IGFzIENvbnN0cnVjdG9yPE1peGluQ2xhc3M+KSB7XG5cbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBbX2NvbnN0cnVjdG9yc106IE1hcDxDb25zdHJ1Y3Rvcjxhbnk+LCBGdW5jdGlvbiB8IG51bGw+O1xuICAgICAgICBwcml2YXRlIHJlYWRvbmx5IFtfY2xhc3NCYXNlXTogQ29uc3RydWN0b3I8YW55PjtcblxuICAgICAgICBjb25zdHJ1Y3RvciguLi5hcmdzOiBhbnlbXSkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGNvbnN0cnVjdG9yLXN1cGVyXG4gICAgICAgICAgICBzdXBlciguLi5hcmdzKTtcblxuICAgICAgICAgICAgY29uc3QgY29uc3RydWN0b3JzID0gbmV3IE1hcDxDb25zdHJ1Y3Rvcjxhbnk+LCBGdW5jdGlvbj4oKTtcbiAgICAgICAgICAgIGZvciAoY29uc3Qgc3JjQ2xhc3Mgb2Ygc291cmNlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhbmRsZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcGx5OiAodGFyZ2V0OiBhbnksIHRoaXNvYmo6IGFueSwgYXJnbGlzdDogYW55W10pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvcHlQcm9wZXJ0aWVzKF9NaXhpbkJhc2UucHJvdG90eXBlLCBzcmNDbGFzcy5wcm90b3R5cGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBhcmVudCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihzcmNDbGFzcy5wcm90b3R5cGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKF9vYmpQcm90b3R5cGUgIT09IHBhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcHlQcm9wZXJ0aWVzKF9NaXhpbkJhc2UucHJvdG90eXBlLCBwYXJlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihwYXJlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb2JqID0gbmV3IHNyY0NsYXNzKC4uLmFyZ2xpc3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29weVByb3BlcnRpZXModGhpcywgb2JqKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAvLyBwcm94eSBmb3IgJ2NvbnN0cnVjdCcgYW5kIGNhY2hlIGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgICAgY29uc3RydWN0b3JzLnNldChzcmNDbGFzcywgbmV3IFByb3h5KHNyY0NsYXNzLCBoYW5kbGVyKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXNbX2NvbnN0cnVjdG9yc10gPSBjb25zdHJ1Y3RvcnM7XG4gICAgICAgICAgICB0aGlzW19jbGFzc0Jhc2VdICAgID0gYmFzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByb3RlY3RlZCBzdXBlcjxUIGV4dGVuZHMgQ2xhc3M+KHNyY0NsYXNzOiBULCAuLi5hcmdzOiBDb25zdHJ1Y3RvclBhcmFtZXRlcnM8VD4pOiB0aGlzIHtcbiAgICAgICAgICAgIGNvbnN0IG1hcCA9IHRoaXNbX2NvbnN0cnVjdG9yc107XG4gICAgICAgICAgICBjb25zdCBjdG9yID0gbWFwLmdldChzcmNDbGFzcyk7XG4gICAgICAgICAgICBpZiAoY3Rvcikge1xuICAgICAgICAgICAgICAgIGN0b3IoLi4uYXJncyk7XG4gICAgICAgICAgICAgICAgbWFwLnNldChzcmNDbGFzcywgbnVsbCk7ICAgIC8vIHByZXZlbnQgY2FsbGluZyB0d2ljZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgaXNNaXhlZFdpdGg8VD4oc3JjQ2xhc3M6IENvbnN0cnVjdG9yPFQ+KTogYm9vbGVhbiB7XG4gICAgICAgICAgICBpZiAodGhpcy5jb25zdHJ1Y3RvciA9PT0gc3JjQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXNbX2NsYXNzQmFzZV0gPT09IHNyY0NsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzW19jbGFzc1NvdXJjZXNdLnJlZHVjZSgocCwgYykgPT4gcCB8fCAoc3JjQ2xhc3MgPT09IGMpLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgc3RhdGljIFtTeW1ib2wuaGFzSW5zdGFuY2VdKGluc3RhbmNlOiBhbnkpOiBib29sZWFuIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YuY2FsbChfTWl4aW5CYXNlLnByb3RvdHlwZSwgaW5zdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIFtfaXNJbmhlcml0ZWRdPFQ+KHNyY0NsYXNzOiBDb25zdHJ1Y3RvcjxUPik6IGJvb2xlYW4ge1xuICAgICAgICAgICAgY29uc3QgY3RvcnMgPSB0aGlzW19jb25zdHJ1Y3RvcnNdO1xuICAgICAgICAgICAgaWYgKGN0b3JzLmhhcyhzcmNDbGFzcykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgY3RvciBvZiBjdG9ycy5rZXlzKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mLmNhbGwoc3JjQ2xhc3MsIGN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByaXZhdGUgZ2V0IFtfY2xhc3NTb3VyY2VzXSgpOiBDb25zdHJ1Y3Rvcjxhbnk+W10ge1xuICAgICAgICAgICAgcmV0dXJuIFsuLi50aGlzW19jb25zdHJ1Y3RvcnNdLmtleXMoKV07XG4gICAgICAgIH1cblxuICAgIH0gYXMgYW55O1xufVxuIiwiLyoqXG4gKiBAZW4gRW5zdXJlIGFzeW5jaHJvbm91cyBleGVjdXRpb24uXG4gKiBAamEg6Z2e5ZCM5pyf5a6f6KGM44KS5L+d6Ki8XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBwb3N0KCgpID0+IGV4ZWMoYXJnKSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgaW1wbGVtZW50IGFzIGZ1bmN0aW9uIHNjb3BlLlxuICogIC0gYGphYCDplqLmlbDjgrnjgrPjg7zjg5fjgajjgZfjgablrp/oo4VcbiovXG5leHBvcnQgZnVuY3Rpb24gcG9zdDxUPihleGVjdXRvcjogKCkgPT4gVCk6IFByb21pc2U8VD4ge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGV4ZWN1dG9yKTtcbn1cblxuLyoqXG4gKiBAZW4gR2VuZXJpYyBOby1PcGVyYXRpb24uXG4gKiBAamEg5rGO55SoIE5vLU9wZXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9vcCguLi5hcmdzOiBhbnlbXSk6IHZvaWQgeyAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgIC8vIG5vb3Bcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7OztBQVFBLGFBQWdCLFNBQVM7O1FBRXJCLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxVQUFVLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO0lBQ3JGLENBQUM7SUFFRDs7OztBQUlBLGFBQWdCLFNBQVM7O1FBRXJCLE1BQU0sSUFBSSxHQUFRLFNBQVMsRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUU7WUFDL0IsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQztTQUN2QztRQUNELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7SUFDM0IsQ0FBQzs7SUN6QkQ7QUE4R0EsYUFBZ0IsTUFBTSxDQUFDLENBQU07UUFDekIsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFFRDs7Ozs7Ozs7QUFRQSxhQUFnQixLQUFLLENBQUMsQ0FBVTtRQUM1QixPQUFPLElBQUksSUFBSSxDQUFDLENBQUM7SUFDckIsQ0FBQztJQUVEOzs7Ozs7OztBQVFBLGFBQWdCLFFBQVEsQ0FBQyxDQUFVO1FBQy9CLE9BQU8sUUFBUSxLQUFLLE9BQU8sQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRDs7Ozs7Ozs7QUFRQSxhQUFnQixRQUFRLENBQUMsQ0FBVTtRQUMvQixPQUFPLFFBQVEsS0FBSyxPQUFPLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQ7Ozs7Ozs7O0FBUUEsYUFBZ0IsU0FBUyxDQUFDLENBQVU7UUFDaEMsT0FBTyxTQUFTLEtBQUssT0FBTyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVEOzs7Ozs7OztBQVFBLGFBQWdCLFFBQVEsQ0FBQyxDQUFVO1FBQy9CLE9BQU8sUUFBUSxLQUFLLE9BQU8sQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRDs7Ozs7Ozs7QUFRQSxhQUFnQixXQUFXLENBQUMsQ0FBVTtRQUNsQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxLQUFLLE9BQU8sQ0FBQyxNQUFNLFFBQVEsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFFRDs7Ozs7Ozs7QUFRQSxhQUFnQixRQUFRLENBQUMsQ0FBVTtRQUMvQixPQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxRQUFRLEtBQUssT0FBTyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVEOzs7Ozs7OztBQVFBLGFBQWdCLFVBQVUsQ0FBQyxDQUFVO1FBQ2pDLE9BQU8sVUFBVSxLQUFLLE9BQU8sQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7QUFXQSxhQUFnQixNQUFNLENBQXFCLElBQU8sRUFBRSxDQUFVO1FBQzFELE9BQU8sT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDO0lBQzdCLENBQUM7QUFZRCxhQUFnQixVQUFVLENBQUMsQ0FBTTtRQUM3QixPQUFPLE1BQU0sQ0FBQyxRQUFRLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7QUFXQSxhQUFnQixVQUFVLENBQWUsSUFBdUIsRUFBRSxDQUFVO1FBQ3hFLE9BQU8sQ0FBQyxVQUFVLEtBQUssT0FBTyxJQUFJLE1BQU0sQ0FBQyxZQUFZLElBQUksQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFRDs7Ozs7Ozs7Ozs7QUFXQSxhQUFnQixhQUFhLENBQWUsSUFBdUIsRUFBRSxDQUFVO1FBQzNFLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLFVBQVUsS0FBSyxPQUFPLElBQUksQ0FBQyxLQUFLLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ2hILENBQUM7SUFFRDs7Ozs7Ozs7QUFRQSxhQUFnQixTQUFTLENBQUMsQ0FBTTtRQUM1QixJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUU7WUFDWCxNQUFNLGVBQWUsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzlDLElBQUksUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFO2dCQUMzQixPQUFPLGVBQWUsQ0FBQzthQUMxQjtpQkFBTSxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFO2dCQUN2RCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUM7YUFDakI7aUJBQU07Z0JBQ0gsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQztnQkFDM0IsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxLQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFZLENBQUMsV0FBVyxFQUFFO29CQUM3RSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7aUJBQ3BCO2FBQ0o7U0FDSjtRQUNELE9BQVEsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7O0FBV0EsYUFBZ0IsUUFBUSxDQUFDLEdBQVksRUFBRSxHQUFZO1FBQy9DLE9BQU8sT0FBTyxHQUFHLEtBQUssT0FBTyxHQUFHLENBQUM7SUFDckMsQ0FBQztJQUVEOzs7Ozs7Ozs7OztBQVdBLGFBQWdCLFNBQVMsQ0FBQyxHQUFZLEVBQUUsR0FBWTtRQUNoRCxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsRUFBRTtZQUM1QixPQUFPLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDNUM7YUFBTTtZQUNILE9BQU8sQ0FBQyxJQUFJLElBQUksR0FBRyxNQUFNLElBQUksSUFBSSxHQUFHLENBQUMsS0FBSyxNQUFNLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUN4RztJQUNMLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7QUFXQSxhQUFnQixVQUFVLENBQXNDLE1BQVMsRUFBRSxHQUFHLFVBQWU7UUFDekYsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUM5QixNQUFNLElBQUksU0FBUyxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1NBQ2pFO1FBQ0QsT0FBTyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUc7WUFDOUIsR0FBRyxJQUFJLE1BQU0sS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDMUMsT0FBTyxHQUFHLENBQUM7U0FDZCxFQUFFLEVBQTBCLENBQUMsQ0FBQztJQUNuQyxDQUFDOztJQ2xNRDs7Ozs7O0lBTUEsTUFBTSxTQUFTLEdBQWE7UUFDeEIsTUFBTSxFQUFFLENBQUMsQ0FBVSxFQUFFLE9BQXVCO1lBQ3hDLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRTtnQkFDWCxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssT0FBTyxHQUFHLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO2dCQUN2RSxNQUFNLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ2hDO1NBQ0o7UUFFRCxNQUFNLEVBQUUsQ0FBQyxJQUFjLEVBQUUsQ0FBVSxFQUFFLE9BQXVCO1lBQ3hELElBQUksT0FBTyxDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUNuQixNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssT0FBTyxHQUFHLFdBQVcsU0FBUyxDQUFDLENBQUMsQ0FBQyxXQUFXLElBQUksR0FBRyxDQUFDLENBQUM7Z0JBQ3pFLE1BQU0sSUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDaEM7U0FDSjtRQUVELEtBQUssRUFBRSxDQUFDLENBQVUsRUFBRSxPQUF1QjtZQUN2QyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDbkIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLE9BQU8sR0FBRyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQztnQkFDbEUsTUFBTSxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNoQztTQUNKO1FBRUQsUUFBUSxFQUFFLENBQUMsQ0FBVSxFQUFFLE9BQXVCO1lBQzFDLElBQUksRUFBRSxNQUFNLENBQUMsUUFBUSxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNqQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssT0FBTyxHQUFHLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO2dCQUM1RSxNQUFNLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ2hDO1NBQ0o7UUFFRCxVQUFVLEVBQUUsQ0FBQyxJQUFjLEVBQUUsQ0FBVSxFQUFFLE9BQXVCO1lBQzVELElBQUksRUFBRSxDQUFDLFlBQVksSUFBSSxDQUFDLEVBQUU7Z0JBQ3RCLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxPQUFPLEdBQUcsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLDBCQUEwQixJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztnQkFDckYsTUFBTSxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNoQztTQUNKO1FBRUQsYUFBYSxFQUFFLENBQUMsSUFBYyxFQUFFLENBQVUsRUFBRSxPQUF1QjtZQUMvRCxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFO2dCQUNsRSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssT0FBTyxHQUFHLHFDQUFxQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztnQkFDakYsTUFBTSxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNoQztTQUNKO1FBRUQsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFjLEVBQUUsQ0FBVSxFQUFFLE9BQXVCO1lBQ2xFLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ2xFLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxPQUFPLEdBQUcsaUNBQWlDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO2dCQUM3RSxNQUFNLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ2hDO1NBQ0o7UUFFRCxXQUFXLEVBQUUsQ0FBQyxDQUFNLEVBQUUsSUFBaUIsRUFBRSxPQUF1QjtZQUM1RCxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUU7Z0JBQzNCLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxPQUFPLEdBQUcscUNBQXFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BGLE1BQU0sSUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDaEM7U0FDSjtRQUVELGNBQWMsRUFBRSxDQUFDLENBQVUsRUFBRSxJQUFpQixFQUFFLE9BQXVCO1lBQ25FLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUU7Z0JBQzdELE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxPQUFPLEdBQUcseUNBQXlDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3hGLE1BQU0sSUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDaEM7U0FDSjtLQUNKLENBQUM7SUFFRjs7Ozs7Ozs7Ozs7QUFXQSxhQUFnQixNQUFNLENBQStCLE1BQWUsRUFBRSxHQUFHLElBQW1DO1FBQ3ZHLFNBQVMsQ0FBQyxNQUFNLENBQVMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3hDLENBQUM7O0lDN09EO0lBc0RBO0lBRUEsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztJQUN2QyxNQUFNLFdBQVcsR0FBSyxRQUFRLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM3RCxNQUFNLFNBQVMsR0FBTyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDekMsTUFBTSxZQUFZLEdBQUksTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzVDLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUM3QyxNQUFNLFVBQVUsR0FBTSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDMUMsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBRTdDO0lBQ0EsU0FBUyxjQUFjLENBQUMsTUFBYyxFQUFFLE1BQWU7UUFDbkQsTUFBTSxJQUFJLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUM7YUFDdkMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUN4RCxPQUFPLENBQUMsR0FBRztZQUNSLElBQUksSUFBSSxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDckIsTUFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFzQixDQUFDLENBQUM7YUFDekc7U0FDSixDQUFDLENBQUM7SUFDWCxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBc0NBLGFBQWdCLGFBQWEsQ0FBZSxNQUFzQixFQUFFLE1BQTJDO1FBQzNHLE1BQU0sU0FBUyxHQUFHLE1BQU0sS0FBSyxJQUFJLEtBQUssTUFBTSxHQUFHLFNBQVMsSUFBSSxDQUFDLENBQVMsS0FBSyxNQUFNLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEksTUFBTSxPQUFPLEdBQUcsU0FBUyxJQUFJLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDaEYsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNWLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUU7Z0JBQzVCLENBQUMsTUFBTSxDQUFDLFdBQVcsR0FBRztvQkFDbEIsS0FBSyxFQUFFLFNBQVM7b0JBQ2hCLFFBQVEsRUFBRSxJQUFJO29CQUNkLFVBQVUsRUFBRSxLQUFLO2lCQUNwQjtnQkFDRCxDQUFDLFNBQVMsR0FBRztvQkFDVCxLQUFLLEVBQUUsU0FBUyxHQUFHLElBQUksR0FBRyxTQUFTO29CQUNuQyxRQUFRLEVBQUUsSUFBSTtpQkFDakI7YUFDSixDQUFDLENBQUM7U0FDTjtJQUNMLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFtQ0EsYUFBZ0IsTUFBTSxDQUNsQixJQUFPLEVBQ1AsR0FBRyxPQVdGOztRQUdELEtBQUssTUFBTSxRQUFRLElBQUksT0FBTyxFQUFFO1lBQzVCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzNFLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDeEIsTUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsV0FBVyxDQUFDO2dCQUN4RSxhQUFhLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBWTtvQkFDakMsT0FBTyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQztpQkFDOUgsQ0FBQyxDQUFDO2FBQ047U0FDSjs7UUFHRCxPQUFPLE1BQU0sVUFBVyxTQUFTLElBQXVDO1lBS3BFLFlBQVksR0FBRyxJQUFXOztnQkFFdEIsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7Z0JBRWYsTUFBTSxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQThCLENBQUM7Z0JBQzNELEtBQUssTUFBTSxRQUFRLElBQUksT0FBTyxFQUFFO29CQUM1QixNQUFNLE9BQU8sR0FBRzt3QkFDWixLQUFLLEVBQUUsQ0FBQyxNQUFXLEVBQUUsT0FBWSxFQUFFLE9BQWM7NEJBQzdDLGNBQWMsQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDekQsSUFBSSxNQUFNLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7NEJBQ3ZELE9BQU8sYUFBYSxLQUFLLE1BQU0sRUFBRTtnQ0FDN0IsY0FBYyxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0NBQzdDLE1BQU0sR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDOzZCQUMxQzs0QkFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLFFBQVEsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDOzRCQUNyQyxjQUFjLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO3lCQUM3QjtxQkFDSixDQUFDOztvQkFHRixZQUFZLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztpQkFDNUQ7Z0JBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLFlBQVksQ0FBQztnQkFDbkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFNLElBQUksQ0FBQzthQUM5QjtZQUVTLEtBQUssQ0FBa0IsUUFBVyxFQUFFLEdBQUcsSUFBOEI7Z0JBQzNFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDaEMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDL0IsSUFBSSxJQUFJLEVBQUU7b0JBQ04sSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7b0JBQ2QsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7aUJBQzNCO2dCQUNELE9BQU8sSUFBSSxDQUFDO2FBQ2Y7WUFFTSxXQUFXLENBQUksUUFBd0I7Z0JBQzFDLElBQUksSUFBSSxDQUFDLFdBQVcsS0FBSyxRQUFRLEVBQUU7b0JBQy9CLE9BQU8sS0FBSyxDQUFDO2lCQUNoQjtxQkFBTSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxRQUFRLEVBQUU7b0JBQ3RDLE9BQU8sSUFBSSxDQUFDO2lCQUNmO3FCQUFNO29CQUNILE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztpQkFDN0U7YUFDSjtZQUVNLFFBQVEsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQWE7Z0JBQzVDLE9BQU8sTUFBTSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7YUFDOUU7WUFFTSxDQUFDLFlBQVksQ0FBQyxDQUFJLFFBQXdCO2dCQUM3QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ2xDLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtvQkFDckIsT0FBTyxJQUFJLENBQUM7aUJBQ2Y7Z0JBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUU7b0JBQzdCLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFBRTt3QkFDckQsT0FBTyxJQUFJLENBQUM7cUJBQ2Y7aUJBQ0o7Z0JBQ0QsT0FBTyxLQUFLLENBQUM7YUFDaEI7WUFFRCxLQUFhLGFBQWEsQ0FBQztnQkFDdkIsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7YUFDMUM7U0FFRyxDQUFDO0lBQ2IsQ0FBQzs7SUMzUUQ7Ozs7Ozs7Ozs7Ozs7O0FBY0EsYUFBZ0IsSUFBSSxDQUFJLFFBQWlCO1FBQ3JDLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQ7Ozs7QUFJQSxhQUFnQixJQUFJLENBQUMsR0FBRyxJQUFXOztJQUVuQyxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvY29yZS11dGlscy8ifQ==
