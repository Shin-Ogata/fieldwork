/*!
 * @cdp/core-utils 0.9.0
 *   core framework utilities
 */

/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any */
function exists(x) {
    return null != x;
}
/**
 * @es Check the value-type is [[Nil]]
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
 * @es Check the value-type is String
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
 * @es Check the value-type is Number
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
 * @es Check the value-type is Boolean
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
 * @es Check the value-type is Symble
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
 * @es Check the value-type is primitive type
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
 * @es Check the value-type is Object
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
 * @es Check the value-type is Function
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
 * @es Check the value-type is input
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
 * @es Check the value instance of input
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
 * @es Check the value instance of input constructor (except sub class)
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
 * @es Get the value's class name
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
 * @es Check input values are same value-type
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
 * @es Check input values are same class
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
 * @es Get shallow copy of `target` which has only `pickupKeys`
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
 * @es Concrete type verifier object
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
 * @es Verify method
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
 * @es Setup [Symbol.hasInstance] property
 *     The class designated as a source of [[mixins]]() has [Symbol.hasInstance] property implicitly.
 *     It's used to avoid becoming the behavior `instanceof` doesn't intend when the class is extended from the mixined class the other place.
 * @ja [Symbol.hasInstance] プロパティ設定関数
 *     [[mixins]]() のソースに指定されたクラスは [Symbol.hasInstance] を暗黙的に備えるため,
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
 *  - `en` function by using [Symbol.hasInstance]
 *         Default behaviour is `{ return target.prototype.isPrototypeOf(instance) }`
 *         If set `null`, delete [Symbol.hasInstance] property.
 *  - `ja` [Symbol.hasInstance] が使用する関数を指定
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
 * @es Mixin function for multiple inheritance
 *     Resolving type support for maximum 10 classes.
 * @ja 多重継承のための Mixin 関数
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
 *  - `en` primary base class
 *  - `ja` 基底クラスコンストラクタ. 同名プロパティ, メソッドは最優先される
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

export { className, exists, instanceOf, isBoolean, isFunction, isIterable, isNil, isNumber, isObject, isPrimitive, isString, isSymbol, mixins, ownInstanceOf, partialize, sameClass, sameType, setInstanceOf, typeOf, verify };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS11dGlscy5tanMiLCJzb3VyY2VzIjpbInR5cGVzLnRzIiwidmVyaWZ5LnRzIiwibWl4aW5zLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9iYW4tdHlwZXMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuLyoqXG4gKiBAZXMgVGhlIGdlbmVyYWwgbnVsbCB0eXBlXG4gKiBAamEg56m644KS56S644GZ5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIE5pbCA9IHZvaWQgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlcyBUaGUgdHlwZSBvZiBvYmplY3Qgb3IgW1tOaWxdXVxuICogQGphIFtbTmlsXV0g44Gr44Gq44KK44GI44KL44Kq44OW44K444Kn44Kv44OI5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIE5pbGxhYmxlPFQgZXh0ZW5kcyBPYmplY3Q+ID0gVCB8IE5pbDtcblxuLyoqXG4gKiBAZXMgUHJpbWl0aXZlIHR5cGUgb2YgSmF2YVNjcmlwdFxuICogQGphIEphdmFTY3JpcHQg44Gu44OX44Oq44Of44OG44Kj44OW5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFByaW1pdGl2ZSA9IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBzeW1ib2wgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlcyBKYXZhU2NyaXB0IHR5cGUgc2V0IGludGVyZmFjZVxuICogQGphIEphdmFTY3JpcHQg44Gu5Z6L44Gu6ZuG5ZCIXG4gKi9cbmludGVyZmFjZSBUeXBlTGlzdCB7XG4gICAgc3RyaW5nOiBzdHJpbmc7XG4gICAgbnVtYmVyOiBudW1iZXI7XG4gICAgYm9vbGVhbjogYm9vbGVhbjtcbiAgICBzeW1ib2w6IHN5bWJvbDtcbiAgICB1bmRlZmluZWQ6IHZvaWQgfCB1bmRlZmluZWQ7XG4gICAgb2JqZWN0OiBvYmplY3QgfCBudWxsO1xuICAgIGZ1bmN0aW9uKC4uLmFyZ3M6IGFueVtdKTogYW55O1xufVxuXG4vKipcbiAqIEBlcyBUaGUga2V5IGxpc3Qgb2YgW1tUeXBlTGlzdF1dXG4gKiBAamEgW1tUeXBlTGlzdF1dIOOCreODvOS4gOimp1xuICovXG5leHBvcnQgdHlwZSBUeXBlS2V5cyA9IGtleW9mIFR5cGVMaXN0O1xuXG4vKipcbiAqIEBlcyBUeXBlIGJhc2UgZGVmaW5pdGlvblxuICogQGphIOWei+OBruimj+WumuWumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFR5cGU8VCBleHRlbmRzIE9iamVjdD4gZXh0ZW5kcyBGdW5jdGlvbiB7XG4gICAgcmVhZG9ubHkgcHJvdG90eXBlOiBUO1xufVxuXG4vKipcbiAqIEBlcyBUeXBlIG9mIGNvbnN0cnVjdG9yXG4gKiBAamEg44Kz44Oz44K544OI44Op44Kv44K/5Z6LXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29uc3RydWN0b3I8VD4gZXh0ZW5kcyBUeXBlPFQ+IHtcbiAgICBuZXcoLi4uYXJnczogYW55W10pOiBUO1xufVxuXG4vKipcbiAqIEBlcyBDaGVjayB0aGUgdmFsdWUgZXhpc3RzXG4gKiBAamEg5YCk44GM5a2Y5Zyo44GZ44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXhpc3RzPE8gZXh0ZW5kcyBPYmplY3Q+KHg6IE5pbGxhYmxlPE8+KTogeCBpcyBPO1xuZXhwb3J0IGZ1bmN0aW9uIGV4aXN0cyh4OiBhbnkpOiB4IGlzIE9iamVjdDtcbmV4cG9ydCBmdW5jdGlvbiBleGlzdHMoeDogYW55KTogYW55IHtcbiAgICByZXR1cm4gbnVsbCAhPSB4O1xufVxuXG4vKipcbiAqIEBlcyBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBbW05pbF1dXG4gKiBAamEgW1tOaWxdXSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05pbCh4OiBhbnkpOiB4IGlzIE5pbCB7XG4gICAgcmV0dXJuIG51bGwgPT0geDtcbn1cblxuLyoqXG4gKiBAZXMgQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgU3RyaW5nXG4gKiBAamEgU3RyaW5nIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3RyaW5nKHg6IGFueSk6IHggaXMgc3RyaW5nIHtcbiAgICByZXR1cm4gJ3N0cmluZycgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlcyBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBOdW1iZXJcbiAqIEBqYSBOdW1iZXIg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOdW1iZXIoeDogYW55KTogeCBpcyBudW1iZXIge1xuICAgIHJldHVybiAnbnVtYmVyJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVzIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIEJvb2xlYW5cbiAqIEBqYSBCb29sZWFuIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQm9vbGVhbih4OiBhbnkpOiB4IGlzIGJvb2xlYW4ge1xuICAgIHJldHVybiAnYm9vbGVhbicgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlcyBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBTeW1ibGVcbiAqIEBqYSBTeW1ib2wg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTeW1ib2woeDogYW55KTogeCBpcyBzeW1ib2wge1xuICAgIHJldHVybiAnc3ltYm9sJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVzIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIHByaW1pdGl2ZSB0eXBlXG4gKiBAamEg44OX44Oq44Of44OG44Kj44OW5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQcmltaXRpdmUoeDogYW55KTogeCBpcyBQcmltaXRpdmUge1xuICAgIHJldHVybiAheCB8fCAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHgpICYmICgnb2JqZWN0JyAhPT0gdHlwZW9mIHgpO1xufVxuXG4vKipcbiAqIEBlcyBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBPYmplY3RcbiAqIEBqYSBPYmplY3Qg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNPYmplY3QoeDogYW55KTogeCBpcyBvYmplY3Qge1xuICAgIHJldHVybiBCb29sZWFuKHgpICYmICdvYmplY3QnID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZXMgQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgRnVuY3Rpb25cbiAqIEBqYSBGdW5jdGlvbiDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Z1bmN0aW9uKHg6IGFueSk6IHggaXMgVHlwZUxpc3RbJ2Z1bmN0aW9uJ10ge1xuICAgIHJldHVybiAnZnVuY3Rpb24nID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZXMgQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgaW5wdXRcbiAqIEBqYSDmjIflrprjgZfjgZ/lnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gdHlwZVxuICogIC0gYGVuYCBldmFsdWF0ZWQgdHlwZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlnotcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHR5cGVPZjxLIGV4dGVuZHMgVHlwZUtleXM+KHR5cGU6IEssIHg6IGFueSk6IHggaXMgVHlwZUxpc3RbS10ge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gdHlwZTtcbn1cblxuLyoqXG4gKiBAZXMgQ2hlY2sgdGhlIHZhbHVlIGhhcyBpdGVyYXRvclxuICogQGphIGl0ZXJhdG9yIOOCkuaJgOacieOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGU8VD4oeDogTmlsbGFibGU8SXRlcmFibGU8VD4+KTogeCBpcyBJdGVyYWJsZTxUPjtcbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlKHg6IGFueSk6IHggaXMgSXRlcmFibGU8YW55PjtcbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlKHg6IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoeCk7XG59XG5cbi8qKlxuICogQGVzIENoZWNrIHRoZSB2YWx1ZSBpbnN0YW5jZSBvZiBpbnB1dFxuICogQGphIOaMh+WumuOBl+OBn+OCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDoqZXkvqHjgZnjgovjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluc3RhbmNlT2Y8VCBleHRlbmRzIE9iamVjdD4oY3RvcjogTmlsbGFibGU8VHlwZTxUPj4sIHg6IGFueSk6IHggaXMgVCB7XG4gICAgcmV0dXJuICgnZnVuY3Rpb24nID09PSB0eXBlb2YgY3RvcikgJiYgKHggaW5zdGFuY2VvZiBjdG9yKTtcbn1cblxuLyoqXG4gKiBAZXMgQ2hlY2sgdGhlIHZhbHVlIGluc3RhbmNlIG9mIGlucHV0IGNvbnN0cnVjdG9yIChleGNlcHQgc3ViIGNsYXNzKVxuICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OBruOCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+WIpOWumiAo5rS+55Sf44Kv44Op44K544Gv5ZCr44KB44Gq44GEKVxuICpcbiAqIEBwYXJhbSBjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDoqZXkvqHjgZnjgovjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG93bkluc3RhbmNlT2Y8VCBleHRlbmRzIE9iamVjdD4oY3RvcjogTmlsbGFibGU8VHlwZTxUPj4sIHg6IGFueSk6IHggaXMgVCB7XG4gICAgcmV0dXJuIChudWxsICE9IHgpICYmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgY3RvcikgJiYgKE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSA9PT0gT2JqZWN0KGN0b3IucHJvdG90eXBlKSk7XG59XG5cbi8qKlxuICogQGVzIEdldCB0aGUgdmFsdWUncyBjbGFzcyBuYW1lXG4gKiBAamEg44Kv44Op44K55ZCN44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xhc3NOYW1lKHg6IGFueSk6IHN0cmluZyB7XG4gICAgaWYgKHggIT0gbnVsbCkge1xuICAgICAgICBjb25zdCB0b1N0cmluZ1RhZ05hbWUgPSB4W1N5bWJvbC50b1N0cmluZ1RhZ107XG4gICAgICAgIGlmIChpc1N0cmluZyh0b1N0cmluZ1RhZ05hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9TdHJpbmdUYWdOYW1lO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb24oeCkgJiYgeC5wcm90b3R5cGUgJiYgbnVsbCAhPSB4Lm5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB4Lm5hbWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBjdG9yID0geC5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGN0b3IpICYmIGN0b3IgPT09IChPYmplY3QoY3Rvci5wcm90b3R5cGUpIGFzIE9iamVjdCkuY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY3Rvci5uYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpIGFzIHN0cmluZykuc2xpY2UoOCwgLTEpO1xufVxuXG4vKipcbiAqIEBlcyBDaGVjayBpbnB1dCB2YWx1ZXMgYXJlIHNhbWUgdmFsdWUtdHlwZVxuICogQGphIOWFpeWKm+OBjOWQjOS4gOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBsaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICogQHBhcmFtIHJoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1lVHlwZShsaHM6IGFueSwgcmhzOiBhbnkpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHlwZW9mIGxocyA9PT0gdHlwZW9mIHJocztcbn1cblxuLyoqXG4gKiBAZXMgQ2hlY2sgaW5wdXQgdmFsdWVzIGFyZSBzYW1lIGNsYXNzXG4gKiBAamEg5YWl5Yqb44GM5ZCM5LiA44Kv44Op44K544Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGxoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKiBAcGFyYW0gcmhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhbWVDbGFzcyhsaHM6IGFueSwgcmhzOiBhbnkpOiBib29sZWFuIHtcbiAgICBpZiAobnVsbCA9PSBsaHMgJiYgbnVsbCA9PSByaHMpIHtcbiAgICAgICAgcmV0dXJuIGNsYXNzTmFtZShsaHMpID09PSBjbGFzc05hbWUocmhzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKG51bGwgIT0gbGhzKSAmJiAobnVsbCAhPSByaHMpICYmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YobGhzKSA9PT0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHJocykpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZXMgR2V0IHNoYWxsb3cgY29weSBvZiBgdGFyZ2V0YCB3aGljaCBoYXMgb25seSBgcGlja3VwS2V5c2BcbiAqIEBqYSBgcGlja3VwS2V5c2Ag44Gn5oyH5a6a44GV44KM44Gf44OX44Ot44OR44OG44Kj44Gu44G/44KS5oyB44GkIGB0YXJnZXRgIOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBjb3B5IHNvdXJjZSBvYmplY3RcbiAqICAtIGBqYWAg44Kz44OU44O85YWD44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gcGlja3VwS2V5c1xuICogIC0gYGVuYCBjb3B5IHRhcmdldCBrZXlzXG4gKiAgLSBgamFgIOOCs+ODlOODvOWvvuixoeOBruOCreODvOS4gOimp1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFydGlhbGl6ZTxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMga2V5b2YgVD4odGFyZ2V0OiBULCAuLi5waWNrdXBLZXlzOiBLW10pOiB7IC1yZWFkb25seSBbUCBpbiBLXTogVFtQXTsgfSB7XG4gICAgaWYgKCF0YXJnZXQgfHwgIWlzT2JqZWN0KHRhcmdldCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHtjbGFzc05hbWUodGFyZ2V0KX0gaXMgbm90IGFuIG9iamVjdC5gKTtcbiAgICB9XG4gICAgcmV0dXJuIHBpY2t1cEtleXMucmVkdWNlKChvYmosIGtleSkgPT4ge1xuICAgICAgICBrZXkgaW4gdGFyZ2V0ICYmIChvYmpba2V5XSA9IHRhcmdldFtrZXldKTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9LCB7fSBhcyB7IC1yZWFkb25seSBbUCBpbiBLXTogVFtQXTsgfSk7ICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW9iamVjdC1saXRlcmFsLXR5cGUtYXNzZXJ0aW9uXG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7IFR5cGVLZXlzLCBleGlzdHMsIGNsYXNzTmFtZSB9IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIEBlcyBUeXBlIHZlcmlmaWVyIGludGVyZmFjZSBkZWZpbml0aW9uPGJyPlxuICogICAgIElmIGludmFsaWQgdmFsdWUgcmVjZWl2ZWQsIHRoZSBtZXRob2QgdGhyb3dzIGBUeXBlRXJyb3JgLlxuICogQGphIOWei+aknOiovOOBruOCpOODs+OCv+ODvOODleOCp+OCpOOCueWumue+qTxicj5cbiAqICAgICDpgZXlj43jgZfjgZ/loLTlkIjjga8gYFR5cGVFcnJvcmAg44KS55m655SfXG4gKlxuICpcbiAqL1xuaW50ZXJmYWNlIFZlcmlmaWVyIHtcbiAgICAvKipcbiAgICAgKiBAZXMgVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaXMgbm90IFtbTmlsXV1cbiAgICAgKiBAamEgW1tOaWxdXSDjgafjgarjgYTjgZPjgajjgpLmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub3ROaWwueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gbm90TmlsLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBub3ROaWw6ICh4OiBhbnksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZXMgVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaXMgW1tUeXBlS2V5c11dXG4gICAgICogQGphIOaMh+WumuOBl+OBnyBbW1R5cGVLZXlzXV0g44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZU9mLnR5cGVcbiAgICAgKiAgLSBgZW5gIG9uZSBvZiBbW1R5cGVLZXlzXV1cbiAgICAgKiAgLSBgamFgIFtbVHlwZUtleXNdXSDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdHlwZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIHR5cGVPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgdHlwZU9mOiAodHlwZTogVHlwZUtleXMsIHg6IGFueSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlcyBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBpcyBgQXJyYXlgXG4gICAgICogQGphIGBBcnJheWAg44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXkueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gYXJyYXkubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGFycmF5OiAoeDogYW55LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVzIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGlzIGBJdGVyYWJsZWBcbiAgICAgKiBAamEgYEl0ZXJhYmxlYCDjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpdGVyYWJsZS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBpdGVyYWJsZS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaXRlcmFibGU6ICh4OiBhbnksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZXMgVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaW5zdGFuY2UgaXMgZXF1YWwgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gICAgICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OBruOCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGluc3RhbmNlT2YuY3RvclxuICAgICAqICAtIGBlbmAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDmr5TovIPlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gaW5zdGFuY2VPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBpbnN0YW5jZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBpbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IGFueSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlcyBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpbnN0YW5jZSBoYXMgYHN0cmljdGx5YCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44Gu5Y6z5a+G5LiA6Ie044GX44Gf44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3duSW5zdGFuY2VPZi5jdG9yXG4gICAgICogIC0gYGVuYCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOavlOi8g+WvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBvd25JbnN0YW5jZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIG93bkluc3RhbmNlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIG93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogYW55LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVzIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGluc3RhbmNlIGhhcyBub3QgYHN0cmljdGx5YCBlcXVhbCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44KS5oyB44Gk44Kk44Oz44K544K/44Oz44K544Gn44Gq44GE44GT44Go44KS5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm90T3duSW5zdGFuY2VPZi5jdG9yXG4gICAgICogIC0gYGVuYCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOavlOi8g+WvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBub3RPd25JbnN0YW5jZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIG5vdE93bkluc3RhbmNlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIG5vdE93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogYW55LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVzIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGhhcyBzcGVjaWZpZWQgcHJvcGVydHlcbiAgICAgKiBAamEg5oyH5a6a44OX44Ot44OR44OG44Kj44KS5oyB44Gj44Gm44GE44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkucHJvcFxuICAgICAqICAtIGBlbmAgc3BlY2lmaWVkIHByb3BlcnR5XG4gICAgICogIC0gYGphYCDlr77osaHjga7jg5fjg63jg5Hjg4bjgqNcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGhhc1Byb3BlcnR5OiAoeDogYW55LCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlcyBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBoYXMgb3duIHNwZWNpZmllZCBwcm9wZXJ0eVxuICAgICAqIEBqYSDmjIflrprjg5fjg63jg5Hjg4bjgqPjgpLlhaXlipvlgKToh6rouqvmjIHjgaPjgabjgYTjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS5wcm9wXG4gICAgICogIC0gYGVuYCBzcGVjaWZpZWQgcHJvcGVydHlcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaGFzT3duUHJvcGVydHk6ICh4OiBhbnksIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xufVxuXG4vKipcbiAqIEBlcyBMaXN0IG9mIG1ldGhvZCBmb3IgdHlwZSB2ZXJpZnlcbiAqIEBqYSDlnovmpJzoqLzjgYzmj5DkvpvjgZnjgovjg6Hjgr3jg4Pjg4nkuIDopqdcbiAqL1xudHlwZSBWZXJpZnlNZXRob2QgPSBrZXlvZiBWZXJpZmllcjtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBlcyBDb25jcmV0ZSB0eXBlIHZlcmlmaWVyIG9iamVjdFxuICogQGphIOWei+aknOiovOWun+ijheOCquODluOCuOOCp+OCr+ODiFxuICovXG5jb25zdCBfdmVyaWZpZXI6IFZlcmlmaWVyID0ge1xuICAgIG5vdE5pbDogKHg6IGFueSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCA9PSB4KSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhIHZhbGlkIHZhbHVlLmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB0eXBlT2Y6ICh0eXBlOiBUeXBlS2V5cywgeDogYW55LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgeCAhPT0gdHlwZSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFR5cGUgb2YgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCAke3R5cGV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBhcnJheTogKHg6IGFueSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGFuIEFycmF5LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBpdGVyYWJsZTogKHg6IGFueSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAoIShTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KHgpKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYW4gaXRlcmFibGUgb2JqZWN0LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBpbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IGFueSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAoISh4IGluc3RhbmNlb2YgY3RvcikpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGFuIGluc3RhbmNlIG9mICR7Y3Rvci5uYW1lfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgb3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiBhbnksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgIT09IE9iamVjdChjdG9yLnByb3RvdHlwZSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGlzIG5vdCBvd24gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBub3RPd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IGFueSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCAhPSB4ICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSA9PT0gT2JqZWN0KGN0b3IucHJvdG90eXBlKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFRoZSBvYmplY3QgaXMgb3duIGluc3RhbmNlIG9mICR7Y3Rvci5uYW1lfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaGFzUHJvcGVydHk6ICh4OiBhbnksIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHggfHwgIShwcm9wIGluIHgpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBkb2VzIG5vdCBoYXZlIHByb3BlcnR5ICR7U3RyaW5nKHByb3ApfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaGFzT3duUHJvcGVydHk6ICh4OiBhbnksIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHggfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh4LCBwcm9wKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFRoZSBvYmplY3QgZG9lcyBub3QgaGF2ZSBvd24gcHJvcGVydHkgJHtTdHJpbmcocHJvcCl9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vKipcbiAqIEBlcyBWZXJpZnkgbWV0aG9kXG4gKiBAamEg5qSc6Ki844Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIG1ldGhvZFxuICogIC0gYGVuYCBtZXRob2QgbmFtZSB3aGljaCB1c2luZ1xuICogIC0gYGphYCDkvb/nlKjjgZnjgovjg6Hjgr3jg4Pjg4nlkI1cbiAqIEBwYXJhbSBhcmdzXG4gKiAgLSBgZW5gIGFyZ3VtZW50cyB3aGljaCBjb3JyZXNwb25kcyB0byB0aGUgbWV0aG9kIG5hbWVcbiAqICAtIGBqYWAg44Oh44K944OD44OJ5ZCN44Gr5a++5b+c44GZ44KL5byV5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2ZXJpZnk8VE1ldGhvZCBleHRlbmRzIFZlcmlmeU1ldGhvZD4obWV0aG9kOiBUTWV0aG9kLCAuLi5hcmdzOiBQYXJhbWV0ZXJzPFZlcmlmaWVyW1RNZXRob2RdPik6IHZvaWQgfCBuZXZlciB7XG4gICAgKF92ZXJpZmllclttZXRob2RdIGFzIGFueSkoLi4uYXJncyk7XG59XG5cbmV4cG9ydCB7IHZlcmlmeSBhcyBkZWZhdWx0IH07XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7IENvbnN0cnVjdG9yIH0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogQGVzIE1peGluIGNsYXNzJ3MgYmFzZSBpbnRlcmZhY2VcbiAqIEBqYSBNaXhpbiDjgq/jg6njgrnjga7ln7rlupXjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqlcbiAqL1xuZXhwb3J0IGRlY2xhcmUgY2xhc3MgTWl4aW5DbGFzcyB7XG4gICAgLyoqXG4gICAgICogQGVzIGNhbGwgbWl4aW4gc291cmNlIGNsYXNzJ3MgYHN1cGVyKClgICBcbiAgICAgKiAgICAgVGhpcyBtZXRob2Qgc2hvdWxkIGJlIGNhbGxlZCBmcm9tIGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSBNaXhpbiDjgq/jg6njgrnjga7ln7rlupXjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqkgIFxuICAgICAqICAgICDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jgYvjgonlkbzjgbbjgZPjgajjgpLmg7PlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzcmNDbGFzc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIHRhcmdldCBjbGFzcyBuYW1lLiBleCkgZnJvbSBTMSBhdmFpbGFibGVcbiAgICAgKiAgLSBgamFgIOOCs+ODs+OCueODiOODqeOCr+ODiOOBmeOCi+OCr+ODqeOCueWQjeOCkuaMh+WumiBleCkgUzEg44GL44KJ5oyH5a6a5Y+v6IO9XG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBwYXJhbWV0ZXJzXG4gICAgICogIC0gYGphYCDjgrPjg7Pjgrnjg4jjg6njgq/jg4jjgavkvb/nlKjjgZnjgovlvJXmlbBcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgc3VwZXI8VD4oc3JjQ2xhc3M6IENvbnN0cnVjdG9yPFQ+LCAuLi5hcmdzOiBDb25zdHJ1Y3RvclBhcmFtZXRlcnM8Q29uc3RydWN0b3I8VD4+KTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlcyBDaGVjayB0aGUgaW5wdXQgY2xhc3MgaXMgbWl4aW5lZCAoZXhjbHVkaW5nIG93biBjbGFzcylcbiAgICAgKiBAamEg5oyH5a6a44Kv44Op44K544GMIE1peGluIOOBleOCjOOBpuOBhOOCi+OBi+eiuuiqjSAo6Ieq6Lqr44Gu44Kv44Op44K544Gv5ZCr44G+44KM44Gq44GEKVxuICAgICAqXG4gICAgICogQHBhcmFtIG1peGVkQ2xhc3NcbiAgICAgKiAgLSBgZW5gIHNldCB0YXJnZXQgY2xhc3MgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOWvvuixoeOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBpc01peGVkV2l0aDxUPihtaXhlZENsYXNzOiBDb25zdHJ1Y3RvcjxUPik6IGJvb2xlYW47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG5jb25zdCBfb2JqUHJvdG90eXBlID0gT2JqZWN0LnByb3RvdHlwZTtcbmNvbnN0IF9pbnN0YW5jZU9mICAgPSBGdW5jdGlvbi5wcm90b3R5cGVbU3ltYm9sLmhhc0luc3RhbmNlXTtcbmNvbnN0IF9vdmVycmlkZSAgICAgPSBTeW1ib2woJ292ZXJyaWRlJyk7XG5jb25zdCBfaXNJbmhlcml0ZWQgID0gU3ltYm9sKCdpc0luaGVyaXRlZCcpO1xuY29uc3QgX2NvbnN0cnVjdG9ycyA9IFN5bWJvbCgnY29uc3RydWN0b3JzJyk7XG5jb25zdCBfY2xhc3NCYXNlICAgID0gU3ltYm9sKCdjbGFzc0Jhc2UnKTtcbmNvbnN0IF9jbGFzc1NvdXJjZXMgPSBTeW1ib2woJ2NsYXNzU291cmNlcycpO1xuXG4vLyBvYmplY3QgcHJvcGVydGllcyBjb3B5IG1ldGhvZFxuZnVuY3Rpb24gY29weVByb3BlcnRpZXModGFyZ2V0OiBvYmplY3QsIHNvdXJjZT86IG9iamVjdCk6IHZvaWQge1xuICAgIHNvdXJjZSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhzb3VyY2UpXG4gICAgICAgIC5maWx0ZXIoa2V5ID0+ICEvKHByb3RvdHlwZXxuYW1lfGNvbnN0cnVjdG9yKS8udGVzdChrZXkpKVxuICAgICAgICAuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gdGFyZ2V0W2tleV0pIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc291cmNlLCBrZXkpIGFzIFByb3BlcnR5RGVjb3JhdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG5cbi8qKlxuICogQGVzIFNldHVwIFtTeW1ib2wuaGFzSW5zdGFuY2VdIHByb3BlcnR5XG4gKiAgICAgVGhlIGNsYXNzIGRlc2lnbmF0ZWQgYXMgYSBzb3VyY2Ugb2YgW1ttaXhpbnNdXSgpIGhhcyBbU3ltYm9sLmhhc0luc3RhbmNlXSBwcm9wZXJ0eSBpbXBsaWNpdGx5LiAgXG4gKiAgICAgSXQncyB1c2VkIHRvIGF2b2lkIGJlY29taW5nIHRoZSBiZWhhdmlvciBgaW5zdGFuY2VvZmAgZG9lc24ndCBpbnRlbmQgd2hlbiB0aGUgY2xhc3MgaXMgZXh0ZW5kZWQgZnJvbSB0aGUgbWl4aW5lZCBjbGFzcyB0aGUgb3RoZXIgcGxhY2UuICBcbiAqIEBqYSBbU3ltYm9sLmhhc0luc3RhbmNlXSDjg5fjg63jg5Hjg4bjgqPoqK3lrprplqLmlbAgIFxuICogICAgIFtbbWl4aW5zXV0oKSDjga7jgr3jg7zjgrnjgavmjIflrprjgZXjgozjgZ/jgq/jg6njgrnjga8gW1N5bWJvbC5oYXNJbnN0YW5jZV0g44KS5pqX6buZ55qE44Gr5YKZ44GI44KL44Gf44KBLCAgXG4gKiAgICAg44Gd44Gu44Kv44Op44K544GM5LuW44Gn57aZ5om/44GV44KM44Gm44GE44KL5aC05ZCIIGBpbnN0YW5jZW9mYCDjgYzmhI/lm7PjgZfjgarjgYTmjK/jgovoiJ7jgYTjgajjgarjgovjga7jgpLpgb/jgZHjgovjgZ/jgoHjgavkvb/nlKjjgZnjgosuXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjbGFzcyBCYXNlIHt9O1xuICogY2xhc3MgU291cmNlIHt9O1xuICogY2xhc3MgTWl4aW5DbGFzcyBleHRlbmRzIG1peGlucyhCYXNlLCBTb3VyY2UpIHt9O1xuICogXG4gKiBjbGFzcyBPdGhlciBleHRlbmRzIFNvdXJjZSB7fTtcbiAqXG4gKiBjb25zdCBtaXhlZCA9IG5ldyBNaXhpbkNsYXNzKCk7XG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE1peGluQ2xhc3MpOyAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIEJhc2UpOyAgICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIFNvdXJjZSk7ICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyB0cnVlID8/P1xuICpcbiAqIHNldEluc3RhbmNlT2YoT3RoZXIpOyAvLyBvciBzZXRJbnN0YW5jZU9mKE90aGVyLCBudWxsKTtcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgT3RoZXIpOyAgICAgICAgIC8vIGZhbHNlICFcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgc2V0IHRhcmdldCBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDoqK3lrprlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEBwYXJhbSBtZXRob2RcbiAqICAtIGBlbmAgZnVuY3Rpb24gYnkgdXNpbmcgW1N5bWJvbC5oYXNJbnN0YW5jZV0gIFxuICogICAgICAgICBEZWZhdWx0IGJlaGF2aW91ciBpcyBgeyByZXR1cm4gdGFyZ2V0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGluc3RhbmNlKSB9YCAgXG4gKiAgICAgICAgIElmIHNldCBgbnVsbGAsIGRlbGV0ZSBbU3ltYm9sLmhhc0luc3RhbmNlXSBwcm9wZXJ0eS5cbiAqICAtIGBqYWAgW1N5bWJvbC5oYXNJbnN0YW5jZV0g44GM5L2/55So44GZ44KL6Zai5pWw44KS5oyH5a6aICBcbiAqICAgICAgICAg5pei5a6a44Gn44GvIGB7IHJldHVybiB0YXJnZXQucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5zdGFuY2UpIH1gIOOBjOS9v+eUqOOBleOCjOOCiyAgXG4gKiAgICAgICAgIGBudWxsYCDmjIflrprjgpLjgZnjgovjgaggW1N5bWJvbC5oYXNJbnN0YW5jZV0g44OX44Ot44OR44OG44Kj44KS5YmK6Zmk44GZ44KLXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRJbnN0YW5jZU9mPFQ+KHRhcmdldDogQ29uc3RydWN0b3I8VD4sIG1ldGhvZD86ICgoaW5zdDogb2JqZWN0KSA9PiBib29sZWFuKSB8IG51bGwpOiB2b2lkIHtcbiAgICBjb25zdCBiZWhhdmlvdXIgPSBtZXRob2QgfHwgKG51bGwgPT09IG1ldGhvZCA/IHVuZGVmaW5lZCA6ICgoaTogb2JqZWN0KSA9PiB0YXJnZXQucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaSkpKTtcbiAgICBjb25zdCBhcHBsaWVkID0gYmVoYXZpb3VyICYmIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBfb3ZlcnJpZGUpO1xuICAgIGlmICghYXBwbGllZCkge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHtcbiAgICAgICAgICAgIFtTeW1ib2wuaGFzSW5zdGFuY2VdOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGJlaGF2aW91cixcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBbX292ZXJyaWRlXToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBiZWhhdmlvdXIgPyB0cnVlIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlcyBNaXhpbiBmdW5jdGlvbiBmb3IgbXVsdGlwbGUgaW5oZXJpdGFuY2UgIFxuICogICAgIFJlc29sdmluZyB0eXBlIHN1cHBvcnQgZm9yIG1heGltdW0gMTAgY2xhc3Nlcy5cbiAqIEBqYSDlpJrph43ntpnmib/jga7jgZ/jgoHjga4gTWl4aW4g6Zai5pWwICBcbiAqICAgICDmnIDlpKcgMTAg44Kv44Op44K544Gu5Z6L6Kej5rG644KS44K144Od44O844OIXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjbGFzcyBCYXNlIHsgY29uc3RydWN0b3IoYSwgYikge30gfTtcbiAqIGNsYXNzIE1peEEgeyBjb25zdHJ1Y3RvcihhLCBiKSB7fSB9O1xuICogY2xhc3MgTWl4QiB7IGNvbnN0cnVjdG9yKGMsIGQpIHt9IH07XG4gKlxuICogY2xhc3MgTWl4aW5DbGFzcyBleHRlbmRzIG1peGlucyhCYXNlLCBNaXhBLCBNaXhCKSB7XG4gKiAgICAgY29uc3RydWN0b3IoYSwgYiwgYywgZCl7XG4gKiAgICAgICAgIC8vIGNhbGxpbmcgYEJhc2VgIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHN1cGVyKGEsIGIpO1xuICpcbiAqICAgICAgICAgLy8gY2FsbGluZyBNaXhpbiBjbGFzc2VzJyBjb25zdHJ1Y3RvclxuICogICAgICAgICB0aGlzLnN1cGVyKE1peEEsIGEsIGIpO1xuICogICAgICAgICB0aGlzLnN1cGVyKE1peEIsIGMsIGQpO1xuICogICAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBiYXNlXG4gKiAgLSBgZW5gIHByaW1hcnkgYmFzZSBjbGFzc1xuICogIC0gYGphYCDln7rlupXjgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr8uIOWQjOWQjeODl+ODreODkeODhuOCoywg44Oh44K944OD44OJ44Gv5pyA5YSq5YWI44GV44KM44KLXG4gKiBAcGFyYW0gc291cmNlc1xuICogIC0gYGVuYCBtdWx0aXBsZSBleHRlbmRzIGNsYXNzXG4gKiAgLSBgamFgIOaLoeW8teOCr+ODqeOCueOCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHJldHVybnNcbiAqICAtIGBlbmAgbWl4aW5lZCBjbGFzcyBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDlkIjmiJDjgZXjgozjgZ/jgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1peGluczxCLCBTMSwgUzIsIFMzLCBTNCwgUzUsIFM2LCBTNywgUzgsIFM5PihcbiAgICBiYXNlOiBDb25zdHJ1Y3RvcjxCPixcbiAgICAuLi5zb3VyY2VzOiBbXG4gICAgICAgIENvbnN0cnVjdG9yPFMxPixcbiAgICAgICAgQ29uc3RydWN0b3I8UzI+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8UzM+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8UzQ+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8UzU+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8UzY+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8Uzc+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8Uzg+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8Uzk+PyxcbiAgICAgICAgLi4uYW55W11cbiAgICBdKTogQ29uc3RydWN0b3I8TWl4aW5DbGFzcyAmIEIgJiBTMSAmIFMyICYgUzMgJiBTNCAmIFM1ICYgUzYgJiBTNyAmIFM4ICYgUzk+IHtcblxuICAgIC8vIHByb3ZpZGUgY3VzdG9tIGluc3RhbmNlb2ZcbiAgICBmb3IgKGNvbnN0IHNyY0NsYXNzIG9mIHNvdXJjZXMpIHtcbiAgICAgICAgY29uc3QgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc3JjQ2xhc3MsIFN5bWJvbC5oYXNJbnN0YW5jZSk7XG4gICAgICAgIGlmICghZGVzYyB8fCBkZXNjLndyaXRhYmxlKSB7XG4gICAgICAgICAgICBjb25zdCBvcmdJbnN0YW5jZU9mID0gZGVzYyA/IHNyY0NsYXNzW1N5bWJvbC5oYXNJbnN0YW5jZV0gOiBfaW5zdGFuY2VPZjtcbiAgICAgICAgICAgIHNldEluc3RhbmNlT2Yoc3JjQ2xhc3MsIChpbnN0OiBvYmplY3QpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3JnSW5zdGFuY2VPZi5jYWxsKHNyY0NsYXNzLCBpbnN0KSB8fCAoaW5zdFtfaXNJbmhlcml0ZWRdICYmIGluc3RbX2lzSW5oZXJpdGVkXShzcmNDbGFzcykpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L2NsYXNzLW5hbWUtY2FzaW5nXG4gICAgcmV0dXJuIGNsYXNzIF9NaXhpbkJhc2UgZXh0ZW5kcyAoYmFzZSBhcyBhbnkgYXMgQ29uc3RydWN0b3I8TWl4aW5DbGFzcz4pIHtcblxuICAgICAgICBwcml2YXRlIHJlYWRvbmx5IFtfY29uc3RydWN0b3JzXTogTWFwPENvbnN0cnVjdG9yPGFueT4sIEZ1bmN0aW9uIHwgbnVsbD47XG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgW19jbGFzc0Jhc2VdOiBDb25zdHJ1Y3Rvcjxhbnk+O1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKC4uLmFyZ3M6IGFueVtdKSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29uc3RydWN0b3Itc3VwZXJcbiAgICAgICAgICAgIHN1cGVyKC4uLmFyZ3MpO1xuXG4gICAgICAgICAgICBjb25zdCBjb25zdHJ1Y3RvcnMgPSBuZXcgTWFwPENvbnN0cnVjdG9yPGFueT4sIEZ1bmN0aW9uPigpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBzcmNDbGFzcyBvZiBzb3VyY2VzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGFuZGxlciA9IHtcbiAgICAgICAgICAgICAgICAgICAgYXBwbHk6ICh0YXJnZXQ6IGFueSwgdGhpc29iajogYW55LCBhcmdsaXN0OiBhbnlbXSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29weVByb3BlcnRpZXMoX01peGluQmFzZS5wcm90b3R5cGUsIHNyY0NsYXNzLnByb3RvdHlwZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHNyY0NsYXNzLnByb3RvdHlwZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoX29ialByb3RvdHlwZSAhPT0gcGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29weVByb3BlcnRpZXMoX01peGluQmFzZS5wcm90b3R5cGUsIHBhcmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHBhcmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvYmogPSBuZXcgc3JjQ2xhc3MoLi4uYXJnbGlzdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb3B5UHJvcGVydGllcyh0aGlzLCBvYmopO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIC8vIHByb3h5IGZvciAnY29uc3RydWN0JyBhbmQgY2FjaGUgY29uc3RydWN0b3JcbiAgICAgICAgICAgICAgICBjb25zdHJ1Y3RvcnMuc2V0KHNyY0NsYXNzLCBuZXcgUHJveHkoc3JjQ2xhc3MsIGhhbmRsZXIpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpc1tfY29uc3RydWN0b3JzXSA9IGNvbnN0cnVjdG9ycztcbiAgICAgICAgICAgIHRoaXNbX2NsYXNzQmFzZV0gICAgPSBiYXNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJvdGVjdGVkIHN1cGVyPFQ+KHNyY0NsYXNzOiBDb25zdHJ1Y3RvcjxUPiwgLi4uYXJnczogQ29uc3RydWN0b3JQYXJhbWV0ZXJzPENvbnN0cnVjdG9yPFQ+Pik6IHRoaXMge1xuICAgICAgICAgICAgY29uc3QgbWFwID0gdGhpc1tfY29uc3RydWN0b3JzXTtcbiAgICAgICAgICAgIGNvbnN0IGN0b3IgPSBtYXAuZ2V0KHNyY0NsYXNzKTtcbiAgICAgICAgICAgIGlmIChjdG9yKSB7XG4gICAgICAgICAgICAgICAgY3RvciguLi5hcmdzKTtcbiAgICAgICAgICAgICAgICBtYXAuc2V0KHNyY0NsYXNzLCBudWxsKTsgICAgLy8gcHJldmVudCBjYWxsaW5nIHR3aWNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBpc01peGVkV2l0aDxUPihzcmNDbGFzczogQ29uc3RydWN0b3I8VD4pOiBib29sZWFuIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbnN0cnVjdG9yID09PSBzcmNDbGFzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpc1tfY2xhc3NCYXNlXSA9PT0gc3JjQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXNbX2NsYXNzU291cmNlc10ucmVkdWNlKChwLCBjKSA9PiBwIHx8IChzcmNDbGFzcyA9PT0gYyksIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgW1N5bWJvbC5oYXNJbnN0YW5jZV0oaW5zdGFuY2U6IGFueSk6IGJvb2xlYW4ge1xuICAgICAgICAgICAgcmV0dXJuIF9NaXhpbkJhc2UucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5zdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIFtfaXNJbmhlcml0ZWRdPFQ+KHNyY0NsYXNzOiBDb25zdHJ1Y3RvcjxUPik6IGJvb2xlYW4ge1xuICAgICAgICAgICAgY29uc3QgY3RvcnMgPSB0aGlzW19jb25zdHJ1Y3RvcnNdO1xuICAgICAgICAgICAgaWYgKGN0b3JzLmhhcyhzcmNDbGFzcykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgY3RvciBvZiBjdG9ycy5rZXlzKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoc3JjQ2xhc3MuaXNQcm90b3R5cGVPZihjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBwcml2YXRlIGdldCBbX2NsYXNzU291cmNlc10oKTogQ29uc3RydWN0b3I8YW55PltdIHtcbiAgICAgICAgICAgIHJldHVybiBbLi4udGhpc1tfY29uc3RydWN0b3JzXS5rZXlzKCldO1xuICAgICAgICB9XG5cbiAgICB9IGFzIGFueTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBO0FBa0VBLFNBQWdCLE1BQU0sQ0FBQyxDQUFNO0lBQ3pCLE9BQU8sSUFBSSxJQUFJLENBQUMsQ0FBQztDQUNwQjs7Ozs7Ozs7O0FBVUQsU0FBZ0IsS0FBSyxDQUFDLENBQU07SUFDeEIsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDO0NBQ3BCOzs7Ozs7Ozs7QUFVRCxTQUFnQixRQUFRLENBQUMsQ0FBTTtJQUMzQixPQUFPLFFBQVEsS0FBSyxPQUFPLENBQUMsQ0FBQztDQUNoQzs7Ozs7Ozs7O0FBVUQsU0FBZ0IsUUFBUSxDQUFDLENBQU07SUFDM0IsT0FBTyxRQUFRLEtBQUssT0FBTyxDQUFDLENBQUM7Q0FDaEM7Ozs7Ozs7OztBQVVELFNBQWdCLFNBQVMsQ0FBQyxDQUFNO0lBQzVCLE9BQU8sU0FBUyxLQUFLLE9BQU8sQ0FBQyxDQUFDO0NBQ2pDOzs7Ozs7Ozs7QUFVRCxTQUFnQixRQUFRLENBQUMsQ0FBTTtJQUMzQixPQUFPLFFBQVEsS0FBSyxPQUFPLENBQUMsQ0FBQztDQUNoQzs7Ozs7Ozs7O0FBVUQsU0FBZ0IsV0FBVyxDQUFDLENBQU07SUFDOUIsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsS0FBSyxPQUFPLENBQUMsTUFBTSxRQUFRLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQztDQUNyRTs7Ozs7Ozs7O0FBVUQsU0FBZ0IsUUFBUSxDQUFDLENBQU07SUFDM0IsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksUUFBUSxLQUFLLE9BQU8sQ0FBQyxDQUFDO0NBQzlDOzs7Ozs7Ozs7QUFVRCxTQUFnQixVQUFVLENBQUMsQ0FBTTtJ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
