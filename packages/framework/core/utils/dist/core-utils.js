/*!
 * @cdp/core-utils 0.9.0
 *   core framework utilities
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory((global.CDP = global.CDP || {}, global.CDP.Utils = global.CDP.Utils || {})));
}(this, function (exports) { 'use strict';

    /* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any */
    function exists(x) {
        return null != x;
    }
    /**
     * @es Check the value-type is [[Nil]].
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
     * @es Check the value-type is String.
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
     * @es Check the value-type is Number.
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
     * @es Check the value-type is Boolean.
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
     * @es Check the value-type is Symble.
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
     * @es Check the value-type is primitive type.
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
     * @es Check the value-type is Object.
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
     * @es Check the value-type is Function.
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
     * @es Check the value-type is input.
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
     * @es Check the value instance of input.
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
     * @es Check the value instance of input constructor (except sub class).
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
     * @es Get the value's class name.
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
     * @es Check input values are same value-type.
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
     * @es Check input values are same class.
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
     * @es Get shallow copy of `target` which has only `pickupKeys`.
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
        }, {}); // eslint-disable-line @typescript-eslint/no-object-literal-type-assertion
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    /**
     * @internal
     * @es Concrete type verifier object.
     * @ja 型検証実装オブジェクト
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
     * @es Verify method.
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
        _verifier[method](...args);
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
     * @es Setup [Symbol.hasInstance] property. <br>
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
        const behaviour = method || (null === method ? undefined : ((i) => target.prototype.isPrototypeOf(i)));
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
     * @es Mixin function for multiple inheritance. <br>
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
     *         // calling Mixin classes' constructor
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
                    return orgInstanceOf.call(srcClass, inst) || (inst[_isInherited] && inst[_isInherited](srcClass));
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
                return _MixinBase.prototype.isPrototypeOf(instance);
            }
            [_isInherited](srcClass) {
                const ctors = this[_constructors];
                if (ctors.has(srcClass)) {
                    return true;
                }
                for (const ctor of ctors.keys()) {
                    if (srcClass.isPrototypeOf(ctor)) {
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

    exports.className = className;
    exports.exists = exists;
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
    exports.ownInstanceOf = ownInstanceOf;
    exports.partialize = partialize;
    exports.sameClass = sameClass;
    exports.sameType = sameType;
    exports.setInstanceOf = setInstanceOf;
    exports.typeOf = typeOf;
    exports.verify = verify;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS11dGlscy5qcyIsInNvdXJjZXMiOlsidHlwZXMudHMiLCJ2ZXJpZnkudHMiLCJtaXhpbnMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L2Jhbi10eXBlcywgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG4vKipcbiAqIEBlcyBUaGUgZ2VuZXJhbCBudWxsIHR5cGUuXG4gKiBAamEg56m644KS56S644GZ5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIE5pbCA9IHZvaWQgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlcyBUaGUgdHlwZSBvZiBvYmplY3Qgb3IgW1tOaWxdXS5cbiAqIEBqYSBbW05pbF1dIOOBq+OBquOCiuOBiOOCi+OCquODluOCuOOCp+OCr+ODiOWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBOaWxsYWJsZTxUIGV4dGVuZHMgT2JqZWN0PiA9IFQgfCBOaWw7XG5cbi8qKlxuICogQGVzIFByaW1pdGl2ZSB0eXBlIG9mIEphdmFTY3JpcHQuXG4gKiBAamEgSmF2YVNjcmlwdCDjga7jg5fjg6rjg5/jg4bjgqPjg5blnotcbiAqL1xuZXhwb3J0IHR5cGUgUHJpbWl0aXZlID0gc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IHN5bWJvbCB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVzIEphdmFTY3JpcHQgdHlwZSBzZXQgaW50ZXJmYWNlLlxuICogQGphIEphdmFTY3JpcHQg44Gu5Z6L44Gu6ZuG5ZCIXG4gKi9cbmludGVyZmFjZSBUeXBlTGlzdCB7XG4gICAgc3RyaW5nOiBzdHJpbmc7XG4gICAgbnVtYmVyOiBudW1iZXI7XG4gICAgYm9vbGVhbjogYm9vbGVhbjtcbiAgICBzeW1ib2w6IHN5bWJvbDtcbiAgICB1bmRlZmluZWQ6IHZvaWQgfCB1bmRlZmluZWQ7XG4gICAgb2JqZWN0OiBvYmplY3QgfCBudWxsO1xuICAgIGZ1bmN0aW9uKC4uLmFyZ3M6IGFueVtdKTogYW55O1xufVxuXG4vKipcbiAqIEBlcyBUaGUga2V5IGxpc3Qgb2YgW1tUeXBlTGlzdF1dLlxuICogQGphIFtbVHlwZUxpc3RdXSDjgq3jg7zkuIDopqdcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZUtleXMgPSBrZXlvZiBUeXBlTGlzdDtcblxuLyoqXG4gKiBAZXMgVHlwZSBiYXNlIGRlZmluaXRpb24uXG4gKiBAamEg5Z6L44Gu6KaP5a6a5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZTxUIGV4dGVuZHMgT2JqZWN0PiBleHRlbmRzIEZ1bmN0aW9uIHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IFQ7XG59XG5cbi8qKlxuICogQGVzIFR5cGUgb2YgY29uc3RydWN0b3IuXG4gKiBAamEg44Kz44Oz44K544OI44Op44Kv44K/5Z6LXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29uc3RydWN0b3I8VD4gZXh0ZW5kcyBUeXBlPFQ+IHtcbiAgICBuZXcoLi4uYXJnczogYW55W10pOiBUO1xufVxuXG4vKipcbiAqIEBlcyBUeXBlIG9mIGNsYXNzLlxuICogQGphIOOCr+ODqeOCueWei1xuICovXG5leHBvcnQgdHlwZSBDbGFzczxUID0gYW55PiA9IENvbnN0cnVjdG9yPFQ+O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZXMgRW5zdXJlIGZvciBmdW5jdGlvbiBwYXJhbWV0ZXJzIHRvIHR1cGxlLlxuICogQGphIOmWouaVsOODkeODqeODoeODvOOCv+OBqOOBl+OBpiB0dXBsZSDjgpLkv53oqLxcbiAqL1xuZXhwb3J0IHR5cGUgQXJndW1lbnRzPFQ+ID0gVCBleHRlbmRzIGFueVtdID8gVCA6IFtUXTtcblxuLyoqXG4gKiBAZXMgQ2hlY2sgdGhlIHZhbHVlIGV4aXN0cy5cbiAqIEBqYSDlgKTjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleGlzdHM8TyBleHRlbmRzIE9iamVjdD4oeDogTmlsbGFibGU8Tz4pOiB4IGlzIE87XG5leHBvcnQgZnVuY3Rpb24gZXhpc3RzKHg6IGFueSk6IHggaXMgT2JqZWN0O1xuZXhwb3J0IGZ1bmN0aW9uIGV4aXN0cyh4OiBhbnkpOiBhbnkge1xuICAgIHJldHVybiBudWxsICE9IHg7XG59XG5cbi8qKlxuICogQGVzIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFtbTmlsXV0uXG4gKiBAamEgW1tOaWxdXSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05pbCh4OiBhbnkpOiB4IGlzIE5pbCB7XG4gICAgcmV0dXJuIG51bGwgPT0geDtcbn1cblxuLyoqXG4gKiBAZXMgQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgU3RyaW5nLlxuICogQGphIFN0cmluZyDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0cmluZyh4OiBhbnkpOiB4IGlzIHN0cmluZyB7XG4gICAgcmV0dXJuICdzdHJpbmcnID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZXMgQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgTnVtYmVyLlxuICogQGphIE51bWJlciDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc051bWJlcih4OiBhbnkpOiB4IGlzIG51bWJlciB7XG4gICAgcmV0dXJuICdudW1iZXInID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZXMgQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgQm9vbGVhbi5cbiAqIEBqYSBCb29sZWFuIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQm9vbGVhbih4OiBhbnkpOiB4IGlzIGJvb2xlYW4ge1xuICAgIHJldHVybiAnYm9vbGVhbicgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlcyBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBTeW1ibGUuXG4gKiBAamEgU3ltYm9sIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3ltYm9sKHg6IGFueSk6IHggaXMgc3ltYm9sIHtcbiAgICByZXR1cm4gJ3N5bWJvbCcgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlcyBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBwcmltaXRpdmUgdHlwZS5cbiAqIEBqYSDjg5fjg6rjg5/jg4bjgqPjg5blnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1ByaW1pdGl2ZSh4OiBhbnkpOiB4IGlzIFByaW1pdGl2ZSB7XG4gICAgcmV0dXJuICF4IHx8ICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgeCkgJiYgKCdvYmplY3QnICE9PSB0eXBlb2YgeCk7XG59XG5cbi8qKlxuICogQGVzIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIE9iamVjdC5cbiAqIEBqYSBPYmplY3Qg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNPYmplY3QoeDogYW55KTogeCBpcyBvYmplY3Qge1xuICAgIHJldHVybiBCb29sZWFuKHgpICYmICdvYmplY3QnID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZXMgQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgRnVuY3Rpb24uXG4gKiBAamEgRnVuY3Rpb24g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNGdW5jdGlvbih4OiBhbnkpOiB4IGlzIFR5cGVMaXN0WydmdW5jdGlvbiddIHtcbiAgICByZXR1cm4gJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVzIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIGlucHV0LlxuICogQGphIOaMh+WumuOBl+OBn+Wei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB0eXBlXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB0eXBlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+Wei1xuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZU9mPEsgZXh0ZW5kcyBUeXBlS2V5cz4odHlwZTogSywgeDogYW55KTogeCBpcyBUeXBlTGlzdFtLXSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSB0eXBlO1xufVxuXG4vKipcbiAqIEBlcyBDaGVjayB0aGUgdmFsdWUgaGFzIGl0ZXJhdG9yLlxuICogQGphIGl0ZXJhdG9yIOOCkuaJgOacieOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGU8VD4oeDogTmlsbGFibGU8SXRlcmFibGU8VD4+KTogeCBpcyBJdGVyYWJsZTxUPjtcbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlKHg6IGFueSk6IHggaXMgSXRlcmFibGU8YW55PjtcbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlKHg6IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoeCk7XG59XG5cbi8qKlxuICogQGVzIENoZWNrIHRoZSB2YWx1ZSBpbnN0YW5jZSBvZiBpbnB1dC5cbiAqIEBqYSDmjIflrprjgZfjgZ/jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL44Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnN0YW5jZU9mPFQgZXh0ZW5kcyBPYmplY3Q+KGN0b3I6IE5pbGxhYmxlPFR5cGU8VD4+LCB4OiBhbnkpOiB4IGlzIFQge1xuICAgIHJldHVybiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGN0b3IpICYmICh4IGluc3RhbmNlb2YgY3Rvcik7XG59XG5cbi8qKlxuICogQGVzIENoZWNrIHRoZSB2YWx1ZSBpbnN0YW5jZSBvZiBpbnB1dCBjb25zdHJ1Y3RvciAoZXhjZXB0IHN1YiBjbGFzcykuXG4gKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44Gu44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5Yik5a6aICjmtL7nlJ/jgq/jg6njgrnjga/lkKvjgoHjgarjgYQpXG4gKlxuICogQHBhcmFtIGN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIGNvbnN0cnVjdG9yXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+OCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gb3duSW5zdGFuY2VPZjxUIGV4dGVuZHMgT2JqZWN0PihjdG9yOiBOaWxsYWJsZTxUeXBlPFQ+PiwgeDogYW55KTogeCBpcyBUIHtcbiAgICByZXR1cm4gKG51bGwgIT0geCkgJiYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBjdG9yKSAmJiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpID09PSBPYmplY3QoY3Rvci5wcm90b3R5cGUpKTtcbn1cblxuLyoqXG4gKiBAZXMgR2V0IHRoZSB2YWx1ZSdzIGNsYXNzIG5hbWUuXG4gKiBAamEg44Kv44Op44K55ZCN44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xhc3NOYW1lKHg6IGFueSk6IHN0cmluZyB7XG4gICAgaWYgKHggIT0gbnVsbCkge1xuICAgICAgICBjb25zdCB0b1N0cmluZ1RhZ05hbWUgPSB4W1N5bWJvbC50b1N0cmluZ1RhZ107XG4gICAgICAgIGlmIChpc1N0cmluZyh0b1N0cmluZ1RhZ05hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9TdHJpbmdUYWdOYW1lO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb24oeCkgJiYgeC5wcm90b3R5cGUgJiYgbnVsbCAhPSB4Lm5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB4Lm5hbWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBjdG9yID0geC5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGN0b3IpICYmIGN0b3IgPT09IChPYmplY3QoY3Rvci5wcm90b3R5cGUpIGFzIE9iamVjdCkuY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY3Rvci5uYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpIGFzIHN0cmluZykuc2xpY2UoOCwgLTEpO1xufVxuXG4vKipcbiAqIEBlcyBDaGVjayBpbnB1dCB2YWx1ZXMgYXJlIHNhbWUgdmFsdWUtdHlwZS5cbiAqIEBqYSDlhaXlipvjgYzlkIzkuIDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gbGhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqIEBwYXJhbSByaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FtZVR5cGUobGhzOiBhbnksIHJoczogYW55KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHR5cGVvZiBsaHMgPT09IHR5cGVvZiByaHM7XG59XG5cbi8qKlxuICogQGVzIENoZWNrIGlucHV0IHZhbHVlcyBhcmUgc2FtZSBjbGFzcy5cbiAqIEBqYSDlhaXlipvjgYzlkIzkuIDjgq/jg6njgrnjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gbGhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqIEBwYXJhbSByaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FtZUNsYXNzKGxoczogYW55LCByaHM6IGFueSk6IGJvb2xlYW4ge1xuICAgIGlmIChudWxsID09IGxocyAmJiBudWxsID09IHJocykge1xuICAgICAgICByZXR1cm4gY2xhc3NOYW1lKGxocykgPT09IGNsYXNzTmFtZShyaHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAobnVsbCAhPSBsaHMpICYmIChudWxsICE9IHJocykgJiYgKE9iamVjdC5nZXRQcm90b3R5cGVPZihsaHMpID09PSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocmhzKSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlcyBHZXQgc2hhbGxvdyBjb3B5IG9mIGB0YXJnZXRgIHdoaWNoIGhhcyBvbmx5IGBwaWNrdXBLZXlzYC5cbiAqIEBqYSBgcGlja3VwS2V5c2Ag44Gn5oyH5a6a44GV44KM44Gf44OX44Ot44OR44OG44Kj44Gu44G/44KS5oyB44GkIGB0YXJnZXRgIOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBjb3B5IHNvdXJjZSBvYmplY3RcbiAqICAtIGBqYWAg44Kz44OU44O85YWD44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gcGlja3VwS2V5c1xuICogIC0gYGVuYCBjb3B5IHRhcmdldCBrZXlzXG4gKiAgLSBgamFgIOOCs+ODlOODvOWvvuixoeOBruOCreODvOS4gOimp1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFydGlhbGl6ZTxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMga2V5b2YgVD4odGFyZ2V0OiBULCAuLi5waWNrdXBLZXlzOiBLW10pOiB7IC1yZWFkb25seSBbUCBpbiBLXTogVFtQXTsgfSB7XG4gICAgaWYgKCF0YXJnZXQgfHwgIWlzT2JqZWN0KHRhcmdldCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHtjbGFzc05hbWUodGFyZ2V0KX0gaXMgbm90IGFuIG9iamVjdC5gKTtcbiAgICB9XG4gICAgcmV0dXJuIHBpY2t1cEtleXMucmVkdWNlKChvYmosIGtleSkgPT4ge1xuICAgICAgICBrZXkgaW4gdGFyZ2V0ICYmIChvYmpba2V5XSA9IHRhcmdldFtrZXldKTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9LCB7fSBhcyB7IC1yZWFkb25seSBbUCBpbiBLXTogVFtQXTsgfSk7ICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW9iamVjdC1saXRlcmFsLXR5cGUtYXNzZXJ0aW9uXG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7IFR5cGVLZXlzLCBleGlzdHMsIGNsYXNzTmFtZSB9IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIEBlcyBUeXBlIHZlcmlmaWVyIGludGVyZmFjZSBkZWZpbml0aW9uLiA8YnI+XG4gKiAgICAgSWYgaW52YWxpZCB2YWx1ZSByZWNlaXZlZCwgdGhlIG1ldGhvZCB0aHJvd3MgYFR5cGVFcnJvcmAuXG4gKiBAamEg5Z6L5qSc6Ki844Gu44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pIDxicj5cbiAqICAgICDpgZXlj43jgZfjgZ/loLTlkIjjga8gYFR5cGVFcnJvcmAg44KS55m655SfXG4gKlxuICpcbiAqL1xuaW50ZXJmYWNlIFZlcmlmaWVyIHtcbiAgICAvKipcbiAgICAgKiBAZXMgVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaXMgbm90IFtbTmlsXV0uXG4gICAgICogQGphIFtbTmlsXV0g44Gn44Gq44GE44GT44Go44KS5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm90TmlsLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIG5vdE5pbC5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgbm90TmlsOiAoeDogYW55LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVzIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGlzIFtbVHlwZUtleXNdXS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIFtbVHlwZUtleXNdXSDjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlT2YudHlwZVxuICAgICAqICAtIGBlbmAgb25lIG9mIFtbVHlwZUtleXNdXVxuICAgICAqICAtIGBqYWAgW1tUeXBlS2V5c11dIOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSB0eXBlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gdHlwZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICB0eXBlT2Y6ICh0eXBlOiBUeXBlS2V5cywgeDogYW55LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVzIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGlzIGBBcnJheWAuXG4gICAgICogQGphIGBBcnJheWAg44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXkueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gYXJyYXkubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGFycmF5OiAoeDogYW55LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVzIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGlzIGBJdGVyYWJsZWAuXG4gICAgICogQGphIGBJdGVyYWJsZWAg44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlcmFibGUueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaXRlcmFibGUubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGl0ZXJhYmxlOiAoeDogYW55LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVzIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGluc3RhbmNlIGlzIGVxdWFsIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44Gu44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5zdGFuY2VPZi5jdG9yXG4gICAgICogIC0gYGVuYCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOavlOi8g+WvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBpbnN0YW5jZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGluc3RhbmNlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogYW55LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVzIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGluc3RhbmNlIGhhcyBgc3RyaWN0bHlgIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44Gu5Y6z5a+G5LiA6Ie044GX44Gf44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3duSW5zdGFuY2VPZi5jdG9yXG4gICAgICogIC0gYGVuYCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOavlOi8g+WvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBvd25JbnN0YW5jZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIG93bkluc3RhbmNlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIG93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogYW55LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVzIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGluc3RhbmNlIGhhcyBub3QgYHN0cmljdGx5YCBlcXVhbCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3IuXG4gICAgICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OCkuaMgeOBpOOCpOODs+OCueOCv+ODs+OCueOBp+OBquOBhOOBk+OBqOOCkuaknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIG5vdE93bkluc3RhbmNlT2YuY3RvclxuICAgICAqICAtIGBlbmAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDmr5TovIPlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gbm90T3duSW5zdGFuY2VPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBub3RPd25JbnN0YW5jZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBub3RPd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IGFueSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlcyBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBoYXMgc3BlY2lmaWVkIHByb3BlcnR5LlxuICAgICAqIEBqYSDmjIflrprjg5fjg63jg5Hjg4bjgqPjgpLmjIHjgaPjgabjgYTjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYXNQcm9wZXJ0eS5wcm9wXG4gICAgICogIC0gYGVuYCBzcGVjaWZpZWQgcHJvcGVydHlcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqIEBwYXJhbSBoYXNQcm9wZXJ0eS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBoYXNQcm9wZXJ0eS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaGFzUHJvcGVydHk6ICh4OiBhbnksIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVzIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGhhcyBvd24gc3BlY2lmaWVkIHByb3BlcnR5LlxuICAgICAqIEBqYSDmjIflrprjg5fjg63jg5Hjg4bjgqPjgpLlhaXlipvlgKToh6rouqvmjIHjgaPjgabjgYTjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS5wcm9wXG4gICAgICogIC0gYGVuYCBzcGVjaWZpZWQgcHJvcGVydHlcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaGFzT3duUHJvcGVydHk6ICh4OiBhbnksIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xufVxuXG4vKipcbiAqIEBlcyBMaXN0IG9mIG1ldGhvZCBmb3IgdHlwZSB2ZXJpZnkuXG4gKiBAamEg5Z6L5qSc6Ki844GM5o+Q5L6b44GZ44KL44Oh44K944OD44OJ5LiA6KanXG4gKi9cbnR5cGUgVmVyaWZ5TWV0aG9kID0ga2V5b2YgVmVyaWZpZXI7XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBAZXMgQ29uY3JldGUgdHlwZSB2ZXJpZmllciBvYmplY3QuXG4gKiBAamEg5Z6L5qSc6Ki85a6f6KOF44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmNvbnN0IF92ZXJpZmllcjogVmVyaWZpZXIgPSB7XG4gICAgbm90TmlsOiAoeDogYW55LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHgpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGEgdmFsaWQgdmFsdWUuYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHR5cGVPZjogKHR5cGU6IFR5cGVLZXlzLCB4OiBhbnksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiB4ICE9PSB0eXBlKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVHlwZSBvZiAke2NsYXNzTmFtZSh4KX0gaXMgbm90ICR7dHlwZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGFycmF5OiAoeDogYW55LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYW4gQXJyYXkuYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGl0ZXJhYmxlOiAoeDogYW55LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICghKFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoeCkpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhbiBpdGVyYWJsZSBvYmplY3QuYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogYW55LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICghKHggaW5zdGFuY2VvZiBjdG9yKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYW4gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBvd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IGFueSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCA9PSB4IHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSAhPT0gT2JqZWN0KGN0b3IucHJvdG90eXBlKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFRoZSBvYmplY3QgaXMgbm90IG93biBpbnN0YW5jZSBvZiAke2N0b3IubmFtZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIG5vdE93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogYW55LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsICE9IHggJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpID09PSBPYmplY3QoY3Rvci5wcm90b3R5cGUpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBpcyBvd24gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBoYXNQcm9wZXJ0eTogKHg6IGFueSwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCB8fCAhKHByb3AgaW4geCkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGRvZXMgbm90IGhhdmUgcHJvcGVydHkgJHtTdHJpbmcocHJvcCl9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBoYXNPd25Qcm9wZXJ0eTogKHg6IGFueSwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHgsIHByb3ApKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBkb2VzIG5vdCBoYXZlIG93biBwcm9wZXJ0eSAke1N0cmluZyhwcm9wKX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogQGVzIFZlcmlmeSBtZXRob2QuXG4gKiBAamEg5qSc6Ki844Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIG1ldGhvZFxuICogIC0gYGVuYCBtZXRob2QgbmFtZSB3aGljaCB1c2luZ1xuICogIC0gYGphYCDkvb/nlKjjgZnjgovjg6Hjgr3jg4Pjg4nlkI1cbiAqIEBwYXJhbSBhcmdzXG4gKiAgLSBgZW5gIGFyZ3VtZW50cyB3aGljaCBjb3JyZXNwb25kcyB0byB0aGUgbWV0aG9kIG5hbWVcbiAqICAtIGBqYWAg44Oh44K944OD44OJ5ZCN44Gr5a++5b+c44GZ44KL5byV5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2ZXJpZnk8VE1ldGhvZCBleHRlbmRzIFZlcmlmeU1ldGhvZD4obWV0aG9kOiBUTWV0aG9kLCAuLi5hcmdzOiBQYXJhbWV0ZXJzPFZlcmlmaWVyW1RNZXRob2RdPik6IHZvaWQgfCBuZXZlciB7XG4gICAgKF92ZXJpZmllclttZXRob2RdIGFzIGFueSkoLi4uYXJncyk7XG59XG5cbmV4cG9ydCB7IHZlcmlmeSBhcyBkZWZhdWx0IH07XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7IFR5cGUsIENsYXNzLCBDb25zdHJ1Y3RvciB9IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIEBlcyBNaXhpbiBjbGFzcydzIGJhc2UgaW50ZXJmYWNlLlxuICogQGphIE1peGluIOOCr+ODqeOCueOBruWfuuW6leOCpOODs+OCv+ODvOODleOCp+OCpOOCueWumue+qVxuICovXG5leHBvcnQgZGVjbGFyZSBjbGFzcyBNaXhpbkNsYXNzIHtcbiAgICAvKipcbiAgICAgKiBAZXMgY2FsbCBtaXhpbiBzb3VyY2UgY2xhc3MncyBgc3VwZXIoKWAuIDxicj5cbiAgICAgKiAgICAgVGhpcyBtZXRob2Qgc2hvdWxkIGJlIGNhbGxlZCBmcm9tIGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSBNaXhpbiDjgq/jg6njgrnjga7ln7rlupXjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqkgPGJyPlxuICAgICAqICAgICDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jgYvjgonlkbzjgbbjgZPjgajjgpLmg7PlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzcmNDbGFzc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIHRhcmdldCBjbGFzcyBuYW1lLiBleCkgZnJvbSBTMSBhdmFpbGFibGVcbiAgICAgKiAgLSBgamFgIOOCs+ODs+OCueODiOODqeOCr+ODiOOBmeOCi+OCr+ODqeOCueWQjeOCkuaMh+WumiBleCkgUzEg44GL44KJ5oyH5a6a5Y+v6IO9XG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBwYXJhbWV0ZXJzXG4gICAgICogIC0gYGphYCDjgrPjg7Pjgrnjg4jjg6njgq/jg4jjgavkvb/nlKjjgZnjgovlvJXmlbBcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgc3VwZXI8VCBleHRlbmRzIENsYXNzPihzcmNDbGFzczogVCwgLi4uYXJnczogQ29uc3RydWN0b3JQYXJhbWV0ZXJzPFQ+KTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlcyBDaGVjayB0aGUgaW5wdXQgY2xhc3MgaXMgbWl4aW5lZCAoZXhjbHVkaW5nIG93biBjbGFzcykuXG4gICAgICogQGphIOaMh+WumuOCr+ODqeOCueOBjCBNaXhpbiDjgZXjgozjgabjgYTjgovjgYvnorroqo0gKOiHqui6q+OBruOCr+ODqeOCueOBr+WQq+OBvuOCjOOBquOBhClcbiAgICAgKlxuICAgICAqIEBwYXJhbSBtaXhlZENsYXNzXG4gICAgICogIC0gYGVuYCBzZXQgdGFyZ2V0IGNsYXNzIGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDlr77osaHjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/jgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgaXNNaXhlZFdpdGg8VD4obWl4ZWRDbGFzczogQ29uc3RydWN0b3I8VD4pOiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBlcyBNaXhlZCBzdWIgY2xhc3MgY29uc3RydWN0b3IgZGVmaW5pdGlvbnMuXG4gKiBAamEg5ZCI5oiQ44GX44Gf44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWl4aW5Db25zdHJ1Y3RvcjxCIGV4dGVuZHMgQ2xhc3MsIFU+IGV4dGVuZHMgVHlwZTxVPiB7XG4gICAgLyoqXG4gICAgICogQGVzIGNvbnN0cnVjdG9yXG4gICAgICogQGphIOOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGJhc2UgY2xhc3MgYXJndW1lbnRzXG4gICAgICogIC0gYGphYCDln7rlupXjgq/jg6njgrnjgavmjIflrprjgZfjgZ/lvJXmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdW5pb24gdHlwZSBvZiBjbGFzc2VzIHdoZW4gY2FsbGluZyBbW21peGluc11dKClcbiAgICAgKiAgLSBgamFgIFtbbWl4aW5zXV0oKSDjgavmuKHjgZfjgZ/jgq/jg6njgrnjga7pm4blkIhcbiAgICAgKi9cbiAgICBuZXcoLi4uYXJnczogQ29uc3RydWN0b3JQYXJhbWV0ZXJzPEI+KTogVTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbmNvbnN0IF9vYmpQcm90b3R5cGUgPSBPYmplY3QucHJvdG90eXBlO1xuY29uc3QgX2luc3RhbmNlT2YgICA9IEZ1bmN0aW9uLnByb3RvdHlwZVtTeW1ib2wuaGFzSW5zdGFuY2VdO1xuY29uc3QgX292ZXJyaWRlICAgICA9IFN5bWJvbCgnb3ZlcnJpZGUnKTtcbmNvbnN0IF9pc0luaGVyaXRlZCAgPSBTeW1ib2woJ2lzSW5oZXJpdGVkJyk7XG5jb25zdCBfY29uc3RydWN0b3JzID0gU3ltYm9sKCdjb25zdHJ1Y3RvcnMnKTtcbmNvbnN0IF9jbGFzc0Jhc2UgICAgPSBTeW1ib2woJ2NsYXNzQmFzZScpO1xuY29uc3QgX2NsYXNzU291cmNlcyA9IFN5bWJvbCgnY2xhc3NTb3VyY2VzJyk7XG5cbi8vIG9iamVjdCBwcm9wZXJ0aWVzIGNvcHkgbWV0aG9kXG5mdW5jdGlvbiBjb3B5UHJvcGVydGllcyh0YXJnZXQ6IG9iamVjdCwgc291cmNlPzogb2JqZWN0KTogdm9pZCB7XG4gICAgc291cmNlICYmIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHNvdXJjZSlcbiAgICAgICAgLmZpbHRlcihrZXkgPT4gIS8ocHJvdG90eXBlfG5hbWV8Y29uc3RydWN0b3IpLy50ZXN0KGtleSkpXG4gICAgICAgIC5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSB0YXJnZXRba2V5XSkge1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzb3VyY2UsIGtleSkgYXMgUHJvcGVydHlEZWNvcmF0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cblxuLyoqXG4gKiBAZXMgU2V0dXAgW1N5bWJvbC5oYXNJbnN0YW5jZV0gcHJvcGVydHkuIDxicj5cbiAqICAgICBUaGUgY2xhc3MgZGVzaWduYXRlZCBhcyBhIHNvdXJjZSBvZiBbW21peGluc11dKCkgaGFzIFtTeW1ib2wuaGFzSW5zdGFuY2VdIHByb3BlcnR5IGltcGxpY2l0bHkuIDxicj5cbiAqICAgICBJdCdzIHVzZWQgdG8gYXZvaWQgYmVjb21pbmcgdGhlIGJlaGF2aW9yIGBpbnN0YW5jZW9mYCBkb2Vzbid0IGludGVuZCB3aGVuIHRoZSBjbGFzcyBpcyBleHRlbmRlZCBmcm9tIHRoZSBtaXhpbmVkIGNsYXNzIHRoZSBvdGhlciBwbGFjZS5cbiAqIEBqYSBbU3ltYm9sLmhhc0luc3RhbmNlXSDjg5fjg63jg5Hjg4bjgqPoqK3lrprplqLmlbAgPGJyPlxuICogICAgIFtbbWl4aW5zXV0oKSDjga7jgr3jg7zjgrnjgavmjIflrprjgZXjgozjgZ/jgq/jg6njgrnjga8gW1N5bWJvbC5oYXNJbnN0YW5jZV0g44KS5pqX6buZ55qE44Gr5YKZ44GI44KL44Gf44KBPGJyPlxuICogICAgIOOBneOBruOCr+ODqeOCueOBjOS7luOBp+e2meaJv+OBleOCjOOBpuOBhOOCi+WgtOWQiCBgaW5zdGFuY2VvZmAg44GM5oSP5Zuz44GX44Gq44GE5oyv44KL6Iie44GE44Go44Gq44KL44Gu44KS6YG/44GR44KL44Gf44KB44Gr5L2/55So44GZ44KLLlxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2xhc3MgQmFzZSB7fTtcbiAqIGNsYXNzIFNvdXJjZSB7fTtcbiAqIGNsYXNzIE1peGluQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoQmFzZSwgU291cmNlKSB7fTtcbiAqIFxuICogY2xhc3MgT3RoZXIgZXh0ZW5kcyBTb3VyY2Uge307XG4gKlxuICogY29uc3QgbWl4ZWQgPSBuZXcgTWl4aW5DbGFzcygpO1xuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBNaXhpbkNsYXNzKTsgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBCYXNlKTsgICAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBTb3VyY2UpOyAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBPdGhlcik7ICAgICAgICAgLy8gdHJ1ZSA/Pz9cbiAqXG4gKiBzZXRJbnN0YW5jZU9mKE90aGVyKTsgLy8gb3Igc2V0SW5zdGFuY2VPZihPdGhlciwgbnVsbCk7XG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyBmYWxzZSAhXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHNldCB0YXJnZXQgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg6Kit5a6a5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcGFyYW0gbWV0aG9kXG4gKiAgLSBgZW5gIGZ1bmN0aW9uIGJ5IHVzaW5nIFtTeW1ib2wuaGFzSW5zdGFuY2VdIDxicj5cbiAqICAgICAgICAgRGVmYXVsdCBiZWhhdmlvdXIgaXMgYHsgcmV0dXJuIHRhcmdldC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnN0YW5jZSkgfWBcbiAqICAgICAgICAgSWYgc2V0IGBudWxsYCwgZGVsZXRlIFtTeW1ib2wuaGFzSW5zdGFuY2VdIHByb3BlcnR5LlxuICogIC0gYGphYCBbU3ltYm9sLmhhc0luc3RhbmNlXSDjgYzkvb/nlKjjgZnjgovplqLmlbDjgpLmjIflrpogPGJyPlxuICogICAgICAgICDml6Llrprjgafjga8gYHsgcmV0dXJuIHRhcmdldC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnN0YW5jZSkgfWAg44GM5L2/55So44GV44KM44KLXG4gKiAgICAgICAgIGBudWxsYCDmjIflrprjgpLjgZnjgovjgaggW1N5bWJvbC5oYXNJbnN0YW5jZV0g44OX44Ot44OR44OG44Kj44KS5YmK6Zmk44GZ44KLXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRJbnN0YW5jZU9mPFQgZXh0ZW5kcyB7fT4odGFyZ2V0OiBDb25zdHJ1Y3RvcjxUPiwgbWV0aG9kPzogKChpbnN0OiBvYmplY3QpID0+IGJvb2xlYW4pIHwgbnVsbCk6IHZvaWQge1xuICAgIGNvbnN0IGJlaGF2aW91ciA9IG1ldGhvZCB8fCAobnVsbCA9PT0gbWV0aG9kID8gdW5kZWZpbmVkIDogKChpOiBvYmplY3QpID0+IHRhcmdldC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpKSkpO1xuICAgIGNvbnN0IGFwcGxpZWQgPSBiZWhhdmlvdXIgJiYgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIF9vdmVycmlkZSk7XG4gICAgaWYgKCFhcHBsaWVkKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwge1xuICAgICAgICAgICAgW1N5bWJvbC5oYXNJbnN0YW5jZV06IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogYmVoYXZpb3VyLFxuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFtfb3ZlcnJpZGVdOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGJlaGF2aW91ciA/IHRydWUgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVzIE1peGluIGZ1bmN0aW9uIGZvciBtdWx0aXBsZSBpbmhlcml0YW5jZS4gPGJyPlxuICogICAgIFJlc29sdmluZyB0eXBlIHN1cHBvcnQgZm9yIG1heGltdW0gMTAgY2xhc3Nlcy5cbiAqIEBqYSDlpJrph43ntpnmib/jga7jgZ/jgoHjga4gTWl4aW4gPGJyPlxuICogICAgIOacgOWkpyAxMCDjgq/jg6njgrnjga7lnovop6PmsbrjgpLjgrXjg53jg7zjg4hcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNsYXNzIEJhc2UgeyBjb25zdHJ1Y3RvcihhLCBiKSB7fSB9O1xuICogY2xhc3MgTWl4QSB7IGNvbnN0cnVjdG9yKGEsIGIpIHt9IH07XG4gKiBjbGFzcyBNaXhCIHsgY29uc3RydWN0b3IoYywgZCkge30gfTtcbiAqXG4gKiBjbGFzcyBNaXhpbkNsYXNzIGV4dGVuZHMgbWl4aW5zKEJhc2UsIE1peEEsIE1peEIpIHtcbiAqICAgICBjb25zdHJ1Y3RvcihhLCBiLCBjLCBkKXtcbiAqICAgICAgICAgLy8gY2FsbGluZyBgQmFzZWAgY29uc3RydWN0b3JcbiAqICAgICAgICAgc3VwZXIoYSwgYik7XG4gKlxuICogICAgICAgICAvLyBjYWxsaW5nIE1peGluIGNsYXNzZXMnIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QSwgYSwgYik7XG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QiwgYywgZCk7XG4gKiAgICAgfVxuICogfVxuICogYGBgXG4gKlxuICogQHBhcmFtIGJhc2VcbiAqICAtIGBlbmAgcHJpbWFyeSBiYXNlIGNsYXNzLiBzdXBlcihhcmdzKSBpcyB0aGlzIGNsYXNzJ3Mgb25lLlxuICogIC0gYGphYCDln7rlupXjgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr8uIOWQjOWQjeODl+ODreODkeODhuOCoywg44Oh44K944OD44OJ44Gv5pyA5YSq5YWI44GV44KM44KLLiBzdXBlcihhcmdzKSDjga/jgZPjga7jgq/jg6njgrnjga7jgoLjga7jgYzmjIflrprlj6/og70uXG4gKiBAcGFyYW0gc291cmNlc1xuICogIC0gYGVuYCBtdWx0aXBsZSBleHRlbmRzIGNsYXNzXG4gKiAgLSBgamFgIOaLoeW8teOCr+ODqeOCueOCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHJldHVybnNcbiAqICAtIGBlbmAgbWl4aW5lZCBjbGFzcyBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDlkIjmiJDjgZXjgozjgZ/jgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1peGluczxCIGV4dGVuZHMgQ2xhc3MsIFMxLCBTMiwgUzMsIFM0LCBTNSwgUzYsIFM3LCBTOCwgUzk+KFxuICAgIGJhc2U6IEIsXG4gICAgLi4uc291cmNlczogW1xuICAgICAgICBDb25zdHJ1Y3RvcjxTMT4sXG4gICAgICAgIENvbnN0cnVjdG9yPFMyPj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFMzPj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM0Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM1Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM2Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM3Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM4Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM5Pj8sXG4gICAgICAgIC4uLmFueVtdXG4gICAgXSk6IE1peGluQ29uc3RydWN0b3I8QiwgTWl4aW5DbGFzcyAmIEluc3RhbmNlVHlwZTxCPiAmIFMxICYgUzIgJiBTMyAmIFM0ICYgUzUgJiBTNiAmIFM3ICYgUzggJiBTOT4ge1xuXG4gICAgLy8gcHJvdmlkZSBjdXN0b20gaW5zdGFuY2VvZlxuICAgIGZvciAoY29uc3Qgc3JjQ2xhc3Mgb2Ygc291cmNlcykge1xuICAgICAgICBjb25zdCBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzcmNDbGFzcywgU3ltYm9sLmhhc0luc3RhbmNlKTtcbiAgICAgICAgaWYgKCFkZXNjIHx8IGRlc2Mud3JpdGFibGUpIHtcbiAgICAgICAgICAgIGNvbnN0IG9yZ0luc3RhbmNlT2YgPSBkZXNjID8gc3JjQ2xhc3NbU3ltYm9sLmhhc0luc3RhbmNlXSA6IF9pbnN0YW5jZU9mO1xuICAgICAgICAgICAgc2V0SW5zdGFuY2VPZihzcmNDbGFzcywgKGluc3Q6IG9iamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBvcmdJbnN0YW5jZU9mLmNhbGwoc3JjQ2xhc3MsIGluc3QpIHx8IChpbnN0W19pc0luaGVyaXRlZF0gJiYgaW5zdFtfaXNJbmhlcml0ZWRdKHNyY0NsYXNzKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvY2xhc3MtbmFtZS1jYXNpbmdcbiAgICByZXR1cm4gY2xhc3MgX01peGluQmFzZSBleHRlbmRzIChiYXNlIGFzIGFueSBhcyBDb25zdHJ1Y3RvcjxNaXhpbkNsYXNzPikge1xuXG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgW19jb25zdHJ1Y3RvcnNdOiBNYXA8Q29uc3RydWN0b3I8YW55PiwgRnVuY3Rpb24gfCBudWxsPjtcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBbX2NsYXNzQmFzZV06IENvbnN0cnVjdG9yPGFueT47XG5cbiAgICAgICAgY29uc3RydWN0b3IoLi4uYXJnczogYW55W10pIHtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjb25zdHJ1Y3Rvci1zdXBlclxuICAgICAgICAgICAgc3VwZXIoLi4uYXJncyk7XG5cbiAgICAgICAgICAgIGNvbnN0IGNvbnN0cnVjdG9ycyA9IG5ldyBNYXA8Q29uc3RydWN0b3I8YW55PiwgRnVuY3Rpb24+KCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHNyY0NsYXNzIG9mIHNvdXJjZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoYW5kbGVyID0ge1xuICAgICAgICAgICAgICAgICAgICBhcHBseTogKHRhcmdldDogYW55LCB0aGlzb2JqOiBhbnksIGFyZ2xpc3Q6IGFueVtdKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb3B5UHJvcGVydGllcyhfTWl4aW5CYXNlLnByb3RvdHlwZSwgc3JjQ2xhc3MucHJvdG90eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYXJlbnQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yoc3JjQ2xhc3MucHJvdG90eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChfb2JqUHJvdG90eXBlICE9PSBwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3B5UHJvcGVydGllcyhfTWl4aW5CYXNlLnByb3RvdHlwZSwgcGFyZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocGFyZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9iaiA9IG5ldyBzcmNDbGFzcyguLi5hcmdsaXN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvcHlQcm9wZXJ0aWVzKHRoaXMsIG9iaik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgLy8gcHJveHkgZm9yICdjb25zdHJ1Y3QnIGFuZCBjYWNoZSBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9ycy5zZXQoc3JjQ2xhc3MsIG5ldyBQcm94eShzcmNDbGFzcywgaGFuZGxlcikpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzW19jb25zdHJ1Y3RvcnNdID0gY29uc3RydWN0b3JzO1xuICAgICAgICAgICAgdGhpc1tfY2xhc3NCYXNlXSAgICA9IGJhc2U7XG4gICAgICAgIH1cblxuICAgICAgICBwcm90ZWN0ZWQgc3VwZXI8VCBleHRlbmRzIENsYXNzPihzcmNDbGFzczogVCwgLi4uYXJnczogQ29uc3RydWN0b3JQYXJhbWV0ZXJzPFQ+KTogdGhpcyB7XG4gICAgICAgICAgICBjb25zdCBtYXAgPSB0aGlzW19jb25zdHJ1Y3RvcnNdO1xuICAgICAgICAgICAgY29uc3QgY3RvciA9IG1hcC5nZXQoc3JjQ2xhc3MpO1xuICAgICAgICAgICAgaWYgKGN0b3IpIHtcbiAgICAgICAgICAgICAgICBjdG9yKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICAgIG1hcC5zZXQoc3JjQ2xhc3MsIG51bGwpOyAgICAvLyBwcmV2ZW50IGNhbGxpbmcgdHdpY2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIGlzTWl4ZWRXaXRoPFQ+KHNyY0NsYXNzOiBDb25zdHJ1Y3RvcjxUPik6IGJvb2xlYW4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uc3RydWN0b3IgPT09IHNyY0NsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzW19jbGFzc0Jhc2VdID09PSBzcmNDbGFzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1tfY2xhc3NTb3VyY2VzXS5yZWR1Y2UoKHAsIGMpID0+IHAgfHwgKHNyY0NsYXNzID09PSBjKSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIHN0YXRpYyBbU3ltYm9sLmhhc0luc3RhbmNlXShpbnN0YW5jZTogYW55KTogYm9vbGVhbiB7XG4gICAgICAgICAgICByZXR1cm4gX01peGluQmFzZS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgW19pc0luaGVyaXRlZF08VD4oc3JjQ2xhc3M6IENvbnN0cnVjdG9yPFQ+KTogYm9vbGVhbiB7XG4gICAgICAgICAgICBjb25zdCBjdG9ycyA9IHRoaXNbX2NvbnN0cnVjdG9yc107XG4gICAgICAgICAgICBpZiAoY3RvcnMuaGFzKHNyY0NsYXNzKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCBjdG9yIG9mIGN0b3JzLmtleXMoKSkge1xuICAgICAgICAgICAgICAgIGlmIChzcmNDbGFzcy5pc1Byb3RvdHlwZU9mKGN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByaXZhdGUgZ2V0IFtfY2xhc3NTb3VyY2VzXSgpOiBDb25zdHJ1Y3Rvcjxhbnk+W10ge1xuICAgICAgICAgICAgcmV0dXJuIFsuLi50aGlzW19jb25zdHJ1Y3RvcnNdLmtleXMoKV07XG4gICAgICAgIH1cblxuICAgIH0gYXMgYW55O1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7QUFnRkEsYUFBZ0IsTUFBTSxDQUFDLENBQU07UUFDekIsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFFRDs7Ozs7Ozs7QUFRQSxhQUFnQixLQUFLLENBQUMsQ0FBTTtRQUN4QixPQUFPLElBQUksSUFBSSxDQUFDLENBQUM7SUFDckIsQ0FBQztJQUVEOzs7Ozs7OztBQVFBLGFBQWdCLFFBQVEsQ0FBQyxDQUFNO1FBQzNCLE9BQU8sUUFBUSxLQUFLLE9BQU8sQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRDs7Ozs7Ozs7QUFRQSxhQUFnQixRQUFRLENBQUMsQ0FBTTtRQUMzQixPQUFPLFFBQVEsS0FBSyxPQUFPLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQ7Ozs7Ozs7O0FBUUEsYUFBZ0IsU0FBUyxDQUFDLENBQU07UUFDNUIsT0FBTyxTQUFTLEtBQUssT0FBTyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVEOzs7Ozs7OztBQVFBLGFBQWdCLFFBQVEsQ0FBQyxDQUFNO1FBQzNCLE9BQU8sUUFB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QUFDLENBQUM7aUJBQzVEO2dCQUVELElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxZQUFZLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBTSxJQUFJLENBQUM7YUFDOUI7WUFFUyxLQUFLLENBQWtCLFFBQVcsRUFBRSxHQUFHLElBQThCO2dCQUMzRSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ2hDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQy9CLElBQUksSUFBSSxFQUFFO29CQUNOLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO29CQUNkLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUMzQjtnQkFDRCxPQUFPLElBQUksQ0FBQzthQUNmO1lBRU0sV0FBVyxDQUFJLFFBQXdCO2dCQUMxQyxJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssUUFBUSxFQUFFO29CQUMvQixPQUFPLEtBQUssQ0FBQztpQkFDaEI7cUJBQU0sSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssUUFBUSxFQUFFO29CQUN0QyxPQUFPLElBQUksQ0FBQztpQkFDZjtxQkFBTTtvQkFDSCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7aUJBQzdFO2FBQ0o7WUFFTSxRQUFRLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFhO2dCQUM1QyxPQUFPLFVBQVUsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQ3ZEO1lBRU0sQ0FBQyxZQUFZLENBQUMsQ0FBSSxRQUF3QjtnQkFDN0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUNsQyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQ3JCLE9BQU8sSUFBSSxDQUFDO2lCQUNmO2dCQUNELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFO29CQUM3QixJQUFJLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQzlCLE9BQU8sSUFBSSxDQUFDO3FCQUNmO2lCQUNKO2dCQUNELE9BQU8sS0FBSyxDQUFDO2FBQ2hCO1lBRUQsS0FBYSxhQUFhLENBQUM7Z0JBQ3ZCLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2FBQzFDO1NBRUcsQ0FBQztJQUNiLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2NvcmUtdXRpbHMvIn0=
