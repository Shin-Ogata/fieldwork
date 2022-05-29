/*!
 * @cdp/lib-core 0.9.12
 *   core library collection
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}));
})(this, (function (exports) { 'use strict';

    /*!
     * @cdp/core-utils 0.9.12
     *   core domain utilities
     */

    /**
     * @en Safe `global` accessor.
     * @ja `global` アクセッサ
     *
     * @returns
     *  - `en` `global` object of the runtime environment
     *  - `ja` 環境に応じた `global` オブジェクト
     */
    function getGlobal() {
        // eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
        return ('object' === typeof globalThis) ? globalThis : Function('return this')();
    }
    /**
     * @en Ensure named object as parent's property.
     * @ja 親オブジェクトを指定して, 名前に指定したオブジェクトの存在を保証
     *
     * @param parent
     *  - `en` parent object. If null given, `globalThis` is assigned.
     *  - `ja` 親オブジェクト. null の場合は `globalThis` が使用される
     * @param names
     *  - `en` object name chain for ensure instance.
     *  - `ja` 保証するオブジェクトの名前
     */
    function ensureObject(parent, ...names) {
        let root = parent || getGlobal();
        for (const name of names) {
            root[name] = root[name] || {};
            root = root[name];
        }
        return root;
    }
    /**
     * @en Global namespace accessor.
     * @ja グローバルネームスペースアクセッサ
     */
    function getGlobalNamespace(namespace) {
        return ensureObject(null, namespace);
    }
    /**
     * @en Global config accessor.
     * @ja グローバルコンフィグアクセッサ
     *
     * @returns default: `CDP.Config`
     */
    function getConfig(namespace = 'CDP', configName = 'Config') {
        return ensureObject(getGlobalNamespace(namespace), configName);
    }

    /* eslint-disable
        @typescript-eslint/no-explicit-any,
        @typescript-eslint/ban-types,
     */
    //__________________________________________________________________________________________________//
    /**
     * @en Check the value exists.
     * @ja 値が存在するか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
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
    function isNumber$1(x) {
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
     * @en Check the value-type is BigInt.
     * @ja BigInt 型であるか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isBigInt(x) {
        return 'bigint' === typeof x;
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
     * @en Check the value-type is Array.
     * @ja Array 型であるか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    const isArray = Array.isArray; // eslint-disable-line @typescript-eslint/unbound-method
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
     * @en Check the value-type is [[PlainObject]].
     * @ja [[PlainObject]] 型であるか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isPlainObject(x) {
        if (!isObject(x)) {
            return false;
        }
        // create from `Object.create( null )` is plain
        if (!Object.getPrototypeOf(x)) {
            return true;
        }
        return ownInstanceOf(Object, x);
    }
    /**
     * @en Check the value-type is empty object.
     * @ja 空オブジェクトであるか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isEmptyObject(x) {
        if (!isPlainObject(x)) {
            return false;
        }
        for (const name in x) { // eslint-disable-line @typescript-eslint/no-unused-vars
            return false;
        }
        return true;
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
     * @en Check the value can be convert to a number.
     * @ja 数値に変換可能か判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isNumeric(x) {
        return !isNil(x) && !isBoolean(x) && !isArray(x) && !isSymbol(x) && ('' !== x) && !Number.isNaN(Number(x));
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
    /** @internal */
    const _typedArrayNames = {
        'Int8Array': true,
        'Uint8Array': true,
        'Uint8ClampedArray': true,
        'Int16Array': true,
        'Uint16Array': true,
        'Int32Array': true,
        'Uint32Array': true,
        'Float32Array': true,
        'Float64Array': true,
    };
    /**
     * @en Check the value is one of [[TypedArray]].
     * @ja 指定したインスタンスが [[TypedArray]] の一種であるか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isTypedArray(x) {
        return !!_typedArrayNames[className(x)];
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
     * @en Common Symble for framework.
     * @ja フレームワークが共通で使用する Symble
     */
    const $cdp = Symbol('@cdp');

    /* eslint-disable
        @typescript-eslint/ban-types,
     */
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
            if (!isArray(x)) {
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
        _verifier[method](...args);
    }

    /** @internal helper for deepEqual() */
    function arrayEqual(lhs, rhs) {
        const len = lhs.length;
        if (len !== rhs.length) {
            return false;
        }
        for (let i = 0; i < len; i++) {
            if (!deepEqual(lhs[i], rhs[i])) {
                return false;
            }
        }
        return true;
    }
    /** @internal helper for deepEqual() */
    function bufferEqual(lhs, rhs) {
        const size = lhs.byteLength;
        if (size !== rhs.byteLength) {
            return false;
        }
        let pos = 0;
        if (size - pos >= 8) {
            const len = size >>> 3;
            const f64L = new Float64Array(lhs, 0, len);
            const f64R = new Float64Array(rhs, 0, len);
            for (let i = 0; i < len; i++) {
                if (!Object.is(f64L[i], f64R[i])) {
                    return false;
                }
            }
            pos = len << 3;
        }
        if (pos === size) {
            return true;
        }
        const L = new DataView(lhs);
        const R = new DataView(rhs);
        if (size - pos >= 4) {
            if (!Object.is(L.getUint32(pos), R.getUint32(pos))) {
                return false;
            }
            pos += 4;
        }
        if (size - pos >= 2) {
            if (!Object.is(L.getUint16(pos), R.getUint16(pos))) {
                return false;
            }
            pos += 2;
        }
        if (size > pos) {
            if (!Object.is(L.getUint8(pos), R.getUint8(pos))) {
                return false;
            }
            pos += 1;
        }
        return pos === size;
    }
    /**
     * @en Performs a deep comparison between two values to determine if they are equivalent.
     * @ja 2値の詳細比較をし, 等しいかどうか判定
     */
    function deepEqual(lhs, rhs) {
        if (lhs === rhs) {
            return true;
        }
        if (isFunction(lhs) && isFunction(rhs)) {
            return lhs.length === rhs.length && lhs.name === rhs.name;
        }
        if (!isObject(lhs) || !isObject(rhs)) {
            return false;
        }
        { // Primitive Wrapper Objects / Date
            const valueL = lhs.valueOf();
            const valueR = rhs.valueOf();
            if (lhs !== valueL || rhs !== valueR) {
                return valueL === valueR;
            }
        }
        { // RegExp
            const isRegExpL = lhs instanceof RegExp;
            const isRegExpR = rhs instanceof RegExp;
            if (isRegExpL || isRegExpR) {
                return isRegExpL === isRegExpR && String(lhs) === String(rhs);
            }
        }
        { // Array
            const isArrayL = isArray(lhs);
            const isArrayR = isArray(rhs);
            if (isArrayL || isArrayR) {
                return isArrayL === isArrayR && arrayEqual(lhs, rhs);
            }
        }
        { // ArrayBuffer
            const isBufferL = lhs instanceof ArrayBuffer;
            const isBufferR = rhs instanceof ArrayBuffer;
            if (isBufferL || isBufferR) {
                return isBufferL === isBufferR && bufferEqual(lhs, rhs);
            }
        }
        { // ArrayBufferView
            const isBufferViewL = ArrayBuffer.isView(lhs);
            const isBufferViewR = ArrayBuffer.isView(rhs);
            if (isBufferViewL || isBufferViewR) {
                return isBufferViewL === isBufferViewR && sameClass(lhs, rhs)
                    && bufferEqual(lhs.buffer, rhs.buffer);
            }
        }
        { // other Iterable
            const isIterableL = isIterable(lhs);
            const isIterableR = isIterable(rhs);
            if (isIterableL || isIterableR) {
                return isIterableL === isIterableR && arrayEqual([...lhs], [...rhs]);
            }
        }
        if (sameClass(lhs, rhs)) {
            const keysL = new Set(Object.keys(lhs));
            const keysR = new Set(Object.keys(rhs));
            if (keysL.size !== keysR.size) {
                return false;
            }
            for (const key of keysL) {
                if (!keysR.has(key)) {
                    return false;
                }
            }
            for (const key of keysL) {
                if (!deepEqual(lhs[key], rhs[key])) {
                    return false;
                }
            }
        }
        else {
            for (const key in lhs) {
                if (!(key in rhs)) {
                    return false;
                }
            }
            const keys = new Set();
            for (const key in rhs) {
                if (!(key in lhs)) {
                    return false;
                }
                keys.add(key);
            }
            for (const key of keys) {
                if (!deepEqual(lhs[key], rhs[key])) {
                    return false;
                }
            }
        }
        return true;
    }
    //__________________________________________________________________________________________________//
    /** @internal clone RegExp */
    function cloneRegExp(regexp) {
        const result = new RegExp(regexp.source, regexp.flags);
        result.lastIndex = regexp.lastIndex;
        return result;
    }
    /** @internal clone ArrayBuffer */
    function cloneArrayBuffer(arrayBuffer) {
        const result = new ArrayBuffer(arrayBuffer.byteLength);
        new Uint8Array(result).set(new Uint8Array(arrayBuffer));
        return result;
    }
    /** @internal clone DataView */
    function cloneDataView(dataView) {
        const buffer = cloneArrayBuffer(dataView.buffer);
        return new DataView(buffer, dataView.byteOffset, dataView.byteLength);
    }
    /** @internal clone TypedArray */
    function cloneTypedArray(typedArray) {
        const buffer = cloneArrayBuffer(typedArray.buffer);
        return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
    }
    /** @internal check necessary to update */
    function needUpdate(oldValue, newValue, exceptUndefined) {
        if (oldValue !== newValue) {
            return true;
        }
        else {
            return (exceptUndefined && undefined === oldValue);
        }
    }
    /** @internal merge Array */
    function mergeArray(target, source) {
        for (let i = 0, len = source.length; i < len; i++) {
            const oldValue = target[i];
            const newValue = merge(oldValue, source[i]);
            !needUpdate(oldValue, newValue, false) || (target[i] = newValue);
        }
        return target;
    }
    /** @internal merge Set */
    function mergeSet(target, source) {
        for (const item of source) {
            target.has(item) || target.add(merge(undefined, item));
        }
        return target;
    }
    /** @internal merge Map */
    function mergeMap(target, source) {
        for (const [k, v] of source) {
            const oldValue = target.get(k);
            const newValue = merge(oldValue, v);
            !needUpdate(oldValue, newValue, false) || target.set(k, newValue);
        }
        return target;
    }
    /** @internal helper for deepMerge() */
    function merge(target, source) {
        if (undefined === source || target === source) {
            return target;
        }
        if (!isObject(source)) {
            return source;
        }
        // Primitive Wrapper Objects / Date
        if (source.valueOf() !== source) {
            return deepEqual(target, source) ? target : new source.constructor(source.valueOf());
        }
        // RegExp
        if (source instanceof RegExp) {
            return deepEqual(target, source) ? target : cloneRegExp(source);
        }
        // ArrayBuffer
        if (source instanceof ArrayBuffer) {
            return deepEqual(target, source) ? target : cloneArrayBuffer(source);
        }
        // ArrayBufferView
        if (ArrayBuffer.isView(source)) {
            return deepEqual(target, source) ? target : isTypedArray(source) ? cloneTypedArray(source) : cloneDataView(source);
        }
        // Array
        if (Array.isArray(source)) {
            return mergeArray(isArray(target) ? target : [], source);
        }
        // Set
        if (source instanceof Set) {
            return mergeSet(target instanceof Set ? target : new Set(), source);
        }
        // Map
        if (source instanceof Map) {
            return mergeMap(target instanceof Map ? target : new Map(), source);
        }
        const obj = isObject(target) ? target : {};
        if (sameClass(target, source)) {
            for (const key of Object.keys(source)) {
                if ('__proto__' !== key) {
                    const oldValue = obj[key];
                    const newValue = merge(oldValue, source[key]);
                    !needUpdate(oldValue, newValue, true) || (obj[key] = newValue);
                }
            }
        }
        else {
            for (const key in source) {
                if ('__proto__' !== key) {
                    const oldValue = obj[key];
                    const newValue = merge(oldValue, source[key]);
                    !needUpdate(oldValue, newValue, true) || (obj[key] = newValue);
                }
            }
        }
        return obj;
    }
    function deepMerge(target, ...sources) {
        let result = target;
        for (const source of sources) {
            result = merge(result, source);
        }
        return result;
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Create deep copy instance of source object.
     * @ja ディープコピーオブジェクトの生成
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/structuredClone
     */
    function deepCopy(src) {
        return deepMerge(undefined, src);
    }

    /* eslint-disable
        @typescript-eslint/no-explicit-any,
     */
    //__________________________________________________________________________________________________//
    /** @internal */ const _objPrototype = Object.prototype;
    /** @internal */ const _instanceOf = Function.prototype[Symbol.hasInstance];
    /** @internal */ const _override = Symbol('override');
    /** @internal */ const _isInherited = Symbol('is-inherited');
    /** @internal */ const _constructors = Symbol('constructors');
    /** @internal */ const _classBase = Symbol('class-base');
    /** @internal */ const _classSources = Symbol('class-sources');
    /** @internal */ const _protoExtendsOnly = Symbol('proto-extends-only');
    /** @internal copy properties core */
    function reflectProperties(target, source, key) {
        if (null == target[key]) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        }
    }
    /** @internal object properties copy method */
    function copyProperties(target, source) {
        source && Object.getOwnPropertyNames(source)
            .filter(key => !/(prototype|name|constructor)/.test(key))
            .forEach(key => {
            reflectProperties(target, source, key);
        });
        source && Object.getOwnPropertySymbols(source)
            .forEach(key => {
            reflectProperties(target, source, key);
        });
    }
    /** @internal helper for setMixClassAttribute(target, 'instanceOf') */
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
     * @en Set the Mixin class attribute.
     * @ja Mixin クラスに対して属性を設定
     *
     * @example <br>
     *
     * ```ts
     * // 'protoExtendOnly'
     * class Base { constructor(a, b) {} };
     * class MixA { };
     * setMixClassAttribute(MixA, 'protoExtendsOnly');  // for improving construction performance
     * class MixB { constructor(c, d) {} };
     *
     * class MixinClass extends mixins(Base, MixA, MixB) {
     *     constructor(a, b, c, d){
     *         // calling `Base` constructor
     *         super(a, b);
     *
     *         // calling Mixin class's constructor
     *         this.super(MixA);        // no affect
     *         this.super(MixB, c, d);
     *     }
     * }
     *
     * const mixed = new MixinClass();
     * console.log(mixed instanceof MixA);    // false
     * console.log(mixed.isMixedWith(MixA));  // false
     *
     * // 'instanceOf'
     * class Base {};
     * class Source {};
     * class MixinClass extends mixins(Base, Source) {};
     *
     * class Other extends Source {};
     *
     * const other = new Other();
     * const mixed = new MixinClass();
     * console.log(other instanceof Source);        // true
     * console.log(other instanceof Other);         // true
     * console.log(mixed instanceof MixinClass);    // true
     * console.log(mixed instanceof Base);          // true
     * console.log(mixed instanceof Source);        // true
     * console.log(mixed instanceof Other);         // true ???
     *
     * setMixClassAttribute(Other, 'instanceOf'); // or setMixClassAttribute(Other, 'instanceOf', null);
     * console.log(other instanceof Source);        // true
     * console.log(other instanceof Other);         // true
     * console.log(mixed instanceof Other);         // false !
     *
     * // [Best Practice] If you declare the derived-class from mixin, you should call the function for avoiding `instanceof` limitation.
     * class DerivedClass extends MixinClass {}
     * setMixClassAttribute(DerivedClass, 'instanceOf');
     * ```
     *
     * @param target
     *  - `en` set target constructor
     *  - `ja` 設定対象のコンストラクタ
     * @param attr
     *  - `en`:
     *    - `protoExtendsOnly`: Suppress providing constructor-trap for the mixin source class. (for improving performance)
     *    - `instanceOf`      : function by using [Symbol.hasInstance] <br>
     *                          Default behaviour is `{ return target.prototype.isPrototypeOf(instance) }`
     *                          If set `null`, delete [Symbol.hasInstance] property.
     *  - `ja`:
     *    - `protoExtendsOnly`: Mixin Source クラスに対して, コンストラクタトラップを抑止 (パフォーマンス改善)
     *    - `instanceOf`      : [Symbol.hasInstance] が使用する関数を指定 <br>
     *                          既定では `{ return target.prototype.isPrototypeOf(instance) }` が使用される
     *                         `null` 指定をすると [Symbol.hasInstance] プロパティを削除する
     */
    function setMixClassAttribute(target, attr, method) {
        switch (attr) {
            case 'protoExtendsOnly':
                target[_protoExtendsOnly] = true;
                break;
            case 'instanceOf':
                setInstanceOf(target, method);
                break;
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
        let _hasSourceConstructor = false;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        class _MixinBase extends base {
            constructor(...args) {
                // eslint-disable-next-line constructor-super
                super(...args);
                const constructors = new Map();
                this[_constructors] = constructors;
                this[_classBase] = base;
                if (_hasSourceConstructor) {
                    for (const srcClass of sources) {
                        if (!srcClass[_protoExtendsOnly]) {
                            const handler = {
                                apply: (target, thisobj, arglist) => {
                                    const obj = new srcClass(...arglist);
                                    copyProperties(this, obj);
                                }
                            };
                            // proxy for 'construct' and cache constructor
                            constructors.set(srcClass, new Proxy(srcClass, handler));
                        }
                    }
                }
            }
            super(srcClass, ...args) {
                const map = this[_constructors];
                const ctor = map.get(srcClass);
                if (ctor) {
                    ctor.call(this, ...args);
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
        }
        for (const srcClass of sources) {
            // provide custom instanceof
            const desc = Object.getOwnPropertyDescriptor(srcClass, Symbol.hasInstance);
            if (!desc || desc.writable) {
                const orgInstanceOf = desc ? srcClass[Symbol.hasInstance] : _instanceOf;
                setInstanceOf(srcClass, (inst) => {
                    return orgInstanceOf.call(srcClass, inst) || ((null != inst && inst[_isInherited]) ? inst[_isInherited](srcClass) : false);
                });
            }
            // provide prototype
            copyProperties(_MixinBase.prototype, srcClass.prototype);
            let parent = Object.getPrototypeOf(srcClass.prototype);
            while (_objPrototype !== parent) {
                copyProperties(_MixinBase.prototype, parent);
                parent = Object.getPrototypeOf(parent);
            }
            // check constructor
            if (!_hasSourceConstructor) {
                _hasSourceConstructor = !srcClass[_protoExtendsOnly];
            }
        }
        return _MixinBase;
    }

    /**
     * @en Check whether input source has a property.
     * @ja 入力元がプロパティを持っているか判定
     *
     * @param src
     */
    function has(src, propName) {
        return null != src && isObject(src) && (propName in src);
    }
    /**
     * @en Get shallow copy of `target` which has only `pickKeys`.
     * @ja `pickKeys` で指定されたプロパティのみを持つ `target` の Shallow Copy を取得
     *
     * @param target
     *  - `en` copy source object
     *  - `ja` コピー元オブジェクト
     * @param pickKeys
     *  - `en` copy target keys
     *  - `ja` コピー対象のキー一覧
     */
    function pick(target, ...pickKeys) {
        verify('typeOf', 'object', target);
        return pickKeys.reduce((obj, key) => {
            key in target && (obj[key] = target[key]);
            return obj;
        }, {});
    }
    /**
     * @en Get shallow copy of `target` without `omitKeys`.
     * @ja `omitKeys` で指定されたプロパティ以外のキーを持つ `target` の Shallow Copy を取得
     *
     * @param target
     *  - `en` copy source object
     *  - `ja` コピー元オブジェクト
     * @param omitKeys
     *  - `en` omit target keys
     *  - `ja` 削除対象のキー一覧
     */
    function omit(target, ...omitKeys) {
        verify('typeOf', 'object', target);
        const obj = {};
        for (const key of Object.keys(target)) {
            !omitKeys.includes(key) && (obj[key] = target[key]);
        }
        return obj;
    }
    /**
     * @en Invert the keys and values of an object. The values must be serializable.
     * @ja オブジェクトのキーと値を逆転する. すべての値がユニークであることが前提
     *
     * @param target
     *  - `en` target object
     *  - `ja` 対象オブジェクト
     */
    function invert(target) {
        const result = {};
        for (const key of Object.keys(target)) {
            result[target[key]] = key;
        }
        return result;
    }
    /**
     * @en Get shallow copy of difference between `base` and `src`.
     * @ja `base` と `src` の差分プロパティをもつオブジェクトの Shallow Copy を取得
     *
     * @param base
     *  - `en` base object
     *  - `ja` 基準となるオブジェクト
     * @param src
     *  - `en` source object
     *  - `ja` コピー元オブジェクト
     */
    function diff(base, src) {
        verify('typeOf', 'object', base);
        verify('typeOf', 'object', src);
        const retval = {};
        for (const key of Object.keys(src)) {
            if (!deepEqual(base[key], src[key])) {
                retval[key] = src[key];
            }
        }
        return retval;
    }
    /**
     * @en Get shallow copy of `base` without `dropValue`.
     * @ja `dropValue` で指定されたプロパティ値以外のキーを持つ `target` の Shallow Copy を取得
     *
     * @param base
     *  - `en` base object
     *  - `ja` 基準となるオブジェクト
     * @param dropValues
     *  - `en` target value. default: `undefined`.
     *  - `ja` 対象の値. 既定値: `undefined`
     */
    function drop(base, ...dropValues) {
        verify('typeOf', 'object', base);
        const values = [...dropValues];
        if (!values.length) {
            values.push(undefined);
        }
        const retval = { ...base };
        for (const key of Object.keys(base)) {
            for (const val of values) {
                if (deepEqual(val, retval[key])) {
                    delete retval[key];
                    break;
                }
            }
        }
        return retval;
    }
    /**
     * @en If the value of the named property is a function then invoke it; otherwise, return it.
     * @ja object の property がメソッドならその実行結果を, プロパティならその値を返却
     *
     * @param target
     * - `en` Object to maybe invoke function `property` on.
     * - `ja` 評価するオブジェクト
     * @param property
     * - `en` The function by name to invoke on `object`.
     * - `ja` 評価するプロパティ名
     * @param fallback
     * - `en` The value to be returned in case `property` doesn't exist or is undefined.
     * - `ja` 存在しなかった場合の fallback 値
     */
    function result(target, property, fallback) {
        const props = isArray(property) ? property : [property];
        if (!props.length) {
            return isFunction(fallback) ? fallback.call(target) : fallback;
        }
        const resolve = (o, p) => {
            return isFunction(p) ? p.call(o) : p;
        };
        let obj = target;
        for (const name of props) {
            const prop = null == obj ? undefined : obj[name];
            if (undefined === prop) {
                return resolve(obj, fallback);
            }
            obj = resolve(obj, prop);
        }
        return obj;
    }

    /** @internal */
    function callable() {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return accessible;
    }
    /** @internal */
    const accessible = new Proxy(callable, {
        get: (target, name) => {
            const prop = target[name];
            if (null != prop) {
                return prop;
            }
            else {
                return accessible;
            }
        },
    });
    /** @internal */
    function create() {
        const stub = new Proxy({}, {
            get: (target, name) => {
                const prop = target[name];
                if (null != prop) {
                    return prop;
                }
                else {
                    return accessible;
                }
            },
        });
        Object.defineProperty(stub, 'stub', {
            value: true,
            writable: false,
        });
        return stub;
    }
    /**
     * @en Get safe accessible object.
     * @ja 安全にアクセス可能なオブジェクトの取得
     *
     * @example <br>
     *
     * ```ts
     * const safeWindow = safe(globalThis.window);
     * console.log(null != safeWindow.document);    // true
     * const div = safeWindow.document.createElement('div');
     * console.log(null != div);    // true
     * ```
     *
     * @param target
     *  - `en` A reference of an object with a possibility which exists.
     *  - `ja` 存在しうるオブジェクトの参照
     * @returns
     *  - `en` Reality or stub instance.
     *  - `ja` 実体またはスタブインスタンス
     */
    function safe(target) {
        return target || create();
    }

    /** @internal */ const _root = getGlobal();
    const setTimeout = safe(_root.setTimeout);
    const clearTimeout = safe(_root.clearTimeout);
    const setInterval = safe(_root.setInterval);
    const clearInterval = safe(_root.clearInterval);

    /**
     * @en Ensure asynchronous execution.
     * @ja 非同期実行を保証
     *
     * @example <br>
     *
     * ```ts
     * void post(() => exec(arg));
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
    /**
     * @en Wait for the designation elapse.
     * @ja 指定時間処理を待機
     *
     * @param elapse
     *  - `en` wait elapse [msec].
     *  - `ja` 待機時間 [msec]
     */
    function sleep(elapse) {
        return new Promise(resolve => setTimeout(resolve, elapse));
    }
    /**
     * @en Returns a function, that, when invoked, will only be triggered at most once during a given time.
     * @ja 関数の実行を wait [msec] に1回に制限
     *
     * @example <br>
     *
     * ```ts
     * const throttled = throttle(upatePosition, 100);
     * $(window).scroll(throttled);
     * ```
     *
     * @param executor
     *  - `en` seed function.
     *  - `ja` 対象の関数
     * @param elapse
     *  - `en` wait elapse [msec].
     *  - `ja` 待機時間 [msec]
     * @param options
     */
    function throttle(executor, elapse, options) {
        const opts = options || {};
        let handle;
        let args;
        let context, result;
        let previous = 0;
        const later = function () {
            previous = false === opts.leading ? 0 : Date.now();
            handle = undefined;
            result = executor.apply(context, args);
            if (!handle) {
                context = args = undefined;
            }
        };
        const throttled = function (...arg) {
            const now = Date.now();
            if (!previous && false === opts.leading) {
                previous = now;
            }
            const remaining = elapse - (now - previous);
            // eslint-disable-next-line no-invalid-this, @typescript-eslint/no-this-alias
            context = this;
            args = [...arg];
            if (remaining <= 0 || remaining > elapse) {
                if (handle) {
                    clearTimeout(handle);
                    handle = undefined;
                }
                previous = now;
                result = executor.apply(context, args);
                if (!handle) {
                    context = args = undefined;
                }
            }
            else if (!handle && false !== opts.trailing) {
                handle = setTimeout(later, remaining);
            }
            return result;
        };
        throttled.cancel = function () {
            clearTimeout(handle);
            previous = 0;
            handle = context = args = undefined;
        };
        return throttled;
    }
    /**
     * @en Returns a function, that, as long as it continues to be invoked, will not be triggered.
     * @ja 呼び出されてから wait [msec] 経過するまで実行しない関数を返却
     *
     * @param executor
     *  - `en` seed function.
     *  - `ja` 対象の関数
     * @param wait
     *  - `en` wait elapse [msec].
     *  - `ja` 待機時間 [msec]
     * @param immediate
     *  - `en` If `true` is passed, trigger the function on the leading edge, instead of the trailing.
     *  - `ja` `true` の場合, 初回のコールは即時実行
     */
    function debounce(executor, wait, immediate) {
        /* eslint-disable no-invalid-this */
        let handle;
        let result;
        const later = function (context, args) {
            handle = undefined;
            if (args) {
                result = executor.apply(context, args);
            }
        };
        const debounced = function (...args) {
            if (handle) {
                clearTimeout(handle);
            }
            if (immediate) {
                const callNow = !handle;
                handle = setTimeout(later, wait);
                if (callNow) {
                    result = executor.apply(this, args);
                }
            }
            else {
                handle = setTimeout(later, wait, this, [...args]);
            }
            return result;
        };
        debounced.cancel = function () {
            clearTimeout(handle);
            handle = undefined;
        };
        return debounced;
        /* eslint-enable no-invalid-this */
    }
    /**
     * @en Returns a function that will be executed at most one time, no matter how often you call it.
     * @ja 1度しか実行されない関数を返却. 2回目以降は最初のコールのキャッシュを返却
     *
     * @param executor
     *  - `en` seed function.
     *  - `ja` 対象の関数
     */
    function once(executor) {
        /* eslint-disable no-invalid-this, @typescript-eslint/no-non-null-assertion */
        let memo;
        return function (...args) {
            if (executor) {
                memo = executor.call(this, ...args);
                executor = null;
            }
            return memo;
        };
        /* eslint-enable no-invalid-this, @typescript-eslint/no-non-null-assertion */
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Create escape function from map.
     * @ja 文字置換関数を作成
     *
     * @param map
     *  - `en` key: target char, value: replace char
     *  - `ja` key: 置換対象, value: 置換文字
     * @returns
     *  - `en` espace function
     *  - `ja` エスケープ関数
     */
    function createEscaper(map) {
        const escaper = (match) => {
            return map[match];
        };
        const source = `(?:${Object.keys(map).join('|')})`;
        const regexTest = RegExp(source);
        const regexReplace = RegExp(source, 'g');
        return (src) => {
            src = (null == src || 'symbol' === typeof src) ? '' : String(src);
            return regexTest.test(src) ? src.replace(regexReplace, escaper) : src;
        };
    }
    /** @internal */
    const mapHtmlEscape = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;',
        '`': '&#x60;'
    };
    /**
     * @en Escape HTML string.
     * @ja HTML で使用する文字を制御文字に置換
     *
     * @brief <br>
     *
     * ```ts
     * const mapHtmlEscape = {
     *     '<' : '&lt;',
     *     '>' : '&gt;',
     *     '&' : '&amp;',
     *     '″': '&quot;',
     *     `'` : '&#39;',
     *     '`' : '&#x60;'
     * };
     * ```
     */
    const escapeHTML = createEscaper(mapHtmlEscape);
    /**
     * @en Unescape HTML string.
     * @ja HTML で使用する制御文字を復元
     */
    const unescapeHTML = createEscaper(invert(mapHtmlEscape));
    //__________________________________________________________________________________________________//
    /**
     * @en Convert to the style compulsion value from input string.
     * @ja 入力文字列を型強制した値に変換
     *
     * @param data
     *  - `en` input string
     *  - `ja` 変換対象の文字列
     */
    function toTypedData(data) {
        if ('true' === data) {
            // boolean: true
            return true;
        }
        else if ('false' === data) {
            // boolean: false
            return false;
        }
        else if ('null' === data) {
            // null
            return null;
        }
        else if (data === String(Number(data))) {
            // number: 数値変換 → 文字列変換で元に戻るとき
            return Number(data);
        }
        else if (data && /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/.test(data)) {
            // object
            return JSON.parse(data);
        }
        else {
            // string / undefined
            return data;
        }
    }
    /**
     * @en Convert to string from [[TypedData]].
     * @ja [[TypedData]] を文字列に変換
     *
     * @param data
     *  - `en` input string
     *  - `ja` 変換対象の文字列
     */
    function fromTypedData(data) {
        if (undefined === data || isString(data)) {
            return data;
        }
        else if (isObject(data)) {
            return JSON.stringify(data);
        }
        else {
            return String(data);
        }
    }
    /**
     * @en Convert to `Web API` stocked type. <br>
     *     Ensure not to return `undefined` value.
     * @ja `Web API` 格納形式に変換 <br>
     *     `undefined` を返却しないことを保証
     */
    function dropUndefined(value, nilSerialize = false) {
        return null != value ? value : (nilSerialize ? String(value) : null);
    }
    /**
     * @en Deserialize from `Web API` stocked type. <br>
     *     Convert from 'null' or 'undefined' string to original type.
     * @ja 'null' or 'undefined' をもとの型に戻す
     */
    function restoreNil(value) {
        if ('null' === value) {
            return null;
        }
        else if ('undefined' === value) {
            return undefined;
        }
        else {
            return value;
        }
    }
    //__________________________________________________________________________________________________//
    /** @internal */ let _localId = 0;
    /**
     * @en Get local unique id. <br>
     *     "local unique" means guarantees unique during in script life cycle only.
     * @ja ローカルユニーク ID の取得 <br>
     *     スクリプトライフサイクル中の同一性を保証する.
     *
     * @param prefix
     *  - `en` ID prefix
     *  - `ja` ID に付与する Prefix
     * @param zeroPad
     *  - `en` 0 padding order
     *  - `ja` 0 詰めする桁数を指定
     */
    function luid(prefix = '', zeroPad) {
        const id = (++_localId).toString(16);
        return (null != zeroPad) ? `${prefix}${id.padStart(zeroPad, '0')}` : `${prefix}${id}`;
    }
    function randomInt(min, max) {
        if (null == max) {
            max = min;
            min = 0;
        }
        return min + Math.floor(Math.random() * (max - min + 1));
    }
    //__________________________________________________________________________________________________//
    /** @internal */ const _regexCancelLikeString = /(abort|cancel)/im;
    /**
     * @en Presume whether it's a canceled error.
     * @ja キャンセルされたエラーであるか推定
     *
     * @param error
     *  - `en` an error object handled in `catch` block.
     *  - `ja` `catch` 節などで補足したエラーを指定
     */
    function isChancelLikeError(error) {
        if (null == error) {
            return false;
        }
        else if (isString(error)) {
            return _regexCancelLikeString.test(error);
        }
        else if (isObject(error)) {
            return _regexCancelLikeString.test(error.message);
        }
        else {
            return false;
        }
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Converts first letter of the string to uppercase.
     * @ja 最初の文字を大文字に変換
     *
     *
     * @example <br>
     *
     * ```ts
     * capitalize("foo Bar");
     * // => "Foo Bar"
     *
     * capitalize("FOO Bar", true);
     * // => "Foo bar"
     * ```
     *
     * @param src
     *  - `en` source string
     *  - `ja` 変換元文字列
     * @param lowercaseRest
     *  - `en` If `true` is passed, the rest of the string will be converted to lower case
     *  - `ja` `true` を指定した場合, 2文字目以降も小文字化
     */
    function capitalize(src, lowercaseRest = false) {
        const remainingChars = !lowercaseRest ? src.slice(1) : src.slice(1).toLowerCase();
        return src.charAt(0).toUpperCase() + remainingChars;
    }
    /**
     * @en Converts first letter of the string to lowercase.
     * @ja 最初の文字を小文字化
     *
     * @example <br>
     *
     * ```ts
     * decapitalize("Foo Bar");
     * // => "foo Bar"
     * ```
     *
     * @param src
     *  - `en` source string
     *  - `ja` 変換元文字列
     */
    function decapitalize(src) {
        return src.charAt(0).toLowerCase() + src.slice(1);
    }
    /**
     * @en Converts underscored or dasherized string to a camelized one. <br>
     *     Begins with a lower case letter unless it starts with an underscore, dash or an upper case letter.
     * @ja `_`, `-` 区切り文字列をキャメルケース化 <br>
     *     `-` または大文字スタートであれば, 大文字スタートが既定値
     *
     * @example <br>
     *
     * ```ts
     * camelize("moz-transform");
     * // => "mozTransform"
     *
     * camelize("-moz-transform");
     * // => "MozTransform"
     *
     * camelize("_moz_transform");
     * // => "MozTransform"
     *
     * camelize("Moz-transform");
     * // => "MozTransform"
     *
     * camelize("-moz-transform", true);
     * // => "mozTransform"
     * ```
     *
     * @param src
     *  - `en` source string
     *  - `ja` 変換元文字列
     * @param lower
     *  - `en` If `true` is passed, force converts to lower camel case in starts with the special case.
     *  - `ja` 強制的に小文字スタートする場合には `true` を指定
     */
    function camelize(src, lower = false) {
        src = src.trim().replace(/[-_\s]+(.)?/g, (match, c) => {
            return c ? c.toUpperCase() : '';
        });
        if (true === lower) {
            return decapitalize(src);
        }
        else {
            return src;
        }
    }
    /**
     * @en Converts string to camelized class name. First letter is always upper case.
     * @ja 先頭大文字のキャメルケースに変換
     *
     * @example <br>
     *
     * ```ts
     * classify("some_class_name");
     * // => "SomeClassName"
     * ```
     *
     * @param src
     *  - `en` source string
     *  - `ja` 変換元文字列
     */
    function classify(src) {
        return capitalize(camelize(src.replace(/[\W_]/g, ' ')).replace(/\s/g, ''));
    }
    /**
     * @en Converts a camelized or dasherized string into an underscored one.
     * @ja キャメルケース or `-` つなぎ文字列を `_` つなぎに変換
     *
     * @example <br>
     *
     * ```ts
     * underscored("MozTransform");
     * // => "moz_transform"
     * ```
     *
     * @param src
     *  - `en` source string
     *  - `ja` 変換元文字列
     */
    function underscored(src) {
        return src.trim().replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase();
    }
    /**
     * @en Converts a underscored or camelized string into an dasherized one.
     * @ja キャメルケース or `_` つなぎ文字列を `-` つなぎに変換
     *
     * @example <br>
     *
     * ```ts
     * dasherize("MozTransform");
     * // => "-moz-transform"
     * ```
     *
     * @param src
     *  - `en` source string
     *  - `ja` 変換元文字列
     */
    function dasherize(src) {
        return src.trim().replace(/([A-Z])/g, '-$1').replace(/[_\s]+/g, '-').toLowerCase();
    }

    /* eslint-disable
        no-invalid-this,
     */
    /**
     * @en Execute shuffle of an array elements.
     * @ja 配列要素のシャッフル
     *
     * @param array
     *  - `en` source array
     *  - `ja` 入力配列
     * @param destructive
     *  - `en` true: destructive / false: non-destructive (default)
     *  - `ja` true: 破壊的 / false: 非破壊的 (既定)
     */
    function shuffle(array, destructive = false) {
        const source = destructive ? array : array.slice();
        const len = source.length;
        for (let i = len > 0 ? len >>> 0 : 0; i > 1;) {
            const j = i * Math.random() >>> 0;
            const swap = source[--i];
            source[i] = source[j];
            source[j] = swap;
        }
        return source;
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Execute stable sort by merge-sort algorithm.
     * @ja `merge-sort` による安定ソート
     *
     * @param array
     *  - `en` source array
     *  - `ja` 入力配列
     * @param comparator
     *  - `en` sort comparator function
     *  - `ja` ソート関数を指定
     * @param destructive
     *  - `en` true: destructive / false: non-destructive (default)
     *  - `ja` true: 破壊的 / false: 非破壊的 (既定)
     */
    function sort(array, comparator, destructive = false) {
        const source = destructive ? array : array.slice();
        if (source.length < 2) {
            return source;
        }
        const lhs = sort(source.splice(0, source.length >>> 1), comparator, true);
        const rhs = sort(source.splice(0), comparator, true);
        while (lhs.length && rhs.length) {
            source.push(comparator(lhs[0], rhs[0]) <= 0 ? lhs.shift() : rhs.shift());
        }
        return source.concat(lhs, rhs);
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Make unique array.
     * @ja 重複要素のない配列の作成
     *
     * @param array
     *  - `en` source array
     *  - `ja` 入力配列
     */
    function unique(array) {
        return [...new Set(array)];
    }
    /**
     * @en Make union array.
     * @ja 配列の和集合を返却
     *
     * @param arrays
     *  - `en` source arrays
     *  - `ja` 入力配列群
     */
    function union(...arrays) {
        return unique(arrays.flat());
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Get the model at the given index. If negative value is given, the target will be found from the last index.
     * @ja インデックス指定によるモデルへのアクセス. 負値の場合は末尾検索を実行
     *
     * @param array
     *  - `en` source array
     *  - `ja` 入力配列
     * @param index
     *  - `en` A zero-based integer indicating which element to retrieve. <br> If negative index is counted from the end of the matched set.
     *  - `ja` 0 base のインデックスを指定 <br> 負値が指定された場合, 末尾からのインデックスとして解釈される
     */
    function at(array, index) {
        const idx = Math.trunc(index);
        const el = idx < 0 ? array[idx + array.length] : array[idx];
        if (null == el) {
            throw new RangeError(`invalid array index. [length: ${array.length}, given: ${index}]`);
        }
        return el;
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Make index array.
     * @ja インデックス配列の作成
     *
     * @param array
     *  - `en` source array
     *  - `ja` 入力配列
     * @param excludes
     *  - `en` exclude index in return value.
     *  - `ja` 戻り値配列に含めないインデックスを指定
     */
    function indices(array, ...excludes) {
        const retval = [...array.keys()];
        const len = array.length;
        const exList = [...new Set(excludes)].sort((lhs, rhs) => lhs < rhs ? 1 : -1);
        for (const ex of exList) {
            if (0 <= ex && ex < len) {
                retval.splice(ex, 1);
            }
        }
        return retval;
    }
    /**
     * @en Execute `GROUP BY` for array elements.
     * @ja 配列の要素の `GROUP BY` 集合を抽出
     *
     * @param array
     *  - `en` source array
     *  - `ja` 入力配列
     * @param options
     *  - `en` `GROUP BY` options
     *  - `ja` `GROUP BY` オプション
     */
    function groupBy(array, options) {
        const { keys, sumKeys, groupKey } = options;
        const _groupKey = groupKey || 'items';
        const _sumKeys = sumKeys || [];
        _sumKeys.push(_groupKey);
        const hash = array.reduce((res, data) => {
            // create groupBy internal key
            const _key = keys.reduce((s, k) => s + String(data[k]), '');
            // init keys
            if (!(_key in res)) {
                const keyList = keys.reduce((h, k) => {
                    h[k] = data[k];
                    return h;
                }, {});
                res[_key] = _sumKeys.reduce((h, k) => {
                    h[k] = 0;
                    return h;
                }, keyList);
            }
            const resKey = res[_key];
            // sum properties
            for (const k of _sumKeys) {
                if (_groupKey === k) {
                    resKey[k] = resKey[k] || [];
                    resKey[k].push(data);
                }
                else {
                    resKey[k] += data[k];
                }
            }
            return res;
        }, {});
        return Object.values(hash);
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Computes the list of values that are the intersection of all the arrays. Each value in the result is present in each of the arrays.
     * @ja 配列の積集合を返却. 返却された配列の要素はすべての入力された配列に含まれる
     *
     * @example <br>
     *
     * ```ts
     * console.log(intersection([1, 2, 3], [101, 2, 1, 10], [2, 1]));
     * // => [1, 2]
     * ```
     *
     * @param arrays
     *  - `en` source array
     *  - `ja` 入力配列
     */
    function intersection(...arrays) {
        return arrays.reduce((acc, ary) => acc.filter(el => ary.includes(el)));
    }
    /**
     * @en Returns the values from array that are not present in the other arrays.
     * @ja 配列からほかの配列に含まれないものを返却
     *
     * @example <br>
     *
     * ```ts
     * console.log(difference([1, 2, 3, 4, 5], [5, 2, 10]));
     * // => [1, 3, 4]
     * ```
     *
     * @param array
     *  - `en` source array
     *  - `ja` 入力配列
     * @param others
     *  - `en` exclude element in return value.
     *  - `ja` 戻り値配列に含めない要素を指定
     */
    function difference(array, ...others) {
        const arrays = [array, ...others];
        return arrays.reduce((acc, ary) => acc.filter(el => !ary.includes(el)));
    }
    /**
     * @en Returns a copy of the array with all instances of the values removed.
     * @ja 配列から指定要素を取り除いたものを返却
     *
     * @example <br>
     *
     * ```ts
     * console.log(without([1, 2, 1, 0, 3, 1, 4], 0, 1));
     * // => [2, 3, 4]
     * ```
     *
     * @param array
     *  - `en` source array
     *  - `ja` 入力配列
     * @param values
     *  - `en` exclude element in return value.
     *  - `ja` 戻り値配列に含めない要素を指定
     */
    function without(array, ...values) {
        return difference(array, values);
    }
    function sample(array, count) {
        if (null == count) {
            return array[randomInt(array.length - 1)];
        }
        const sample = array.slice();
        const length = sample.length;
        count = Math.max(Math.min(count, length), 0);
        const last = length - 1;
        for (let index = 0; index < count; index++) {
            const rand = randomInt(index, last);
            const temp = sample[index];
            sample[index] = sample[rand];
            sample[rand] = temp;
        }
        return sample.slice(0, count);
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Returns a result of permutation from the list.
     * @ja 配列から順列結果を返却
     *
     * @example <br>
     *
     * ```ts
     * const arr = permutation(['a', 'b', 'c'], 2);
     * console.log(JSON.stringify(arr));
     * // => [['a','b'],['a','c'],['b','a'],['b','c'],['c','a'],['c','b']]
     * ```
     *
     * @param array
     *  - `en` source array
     *  - `ja` 入力配列
     * @param count
     *  - `en` number of pick up.
     *  - `ja` 選択数
     */
    function permutation(array, count) {
        const retval = [];
        if (array.length < count) {
            return [];
        }
        if (1 === count) {
            for (const [i, val] of array.entries()) {
                retval[i] = [val];
            }
        }
        else {
            for (let i = 0, n1 = array.length; i < n1; i++) {
                const parts = array.slice(0);
                parts.splice(i, 1);
                const row = permutation(parts, count - 1);
                for (let j = 0, n2 = row.length; j < n2; j++) {
                    retval.push([array[i]].concat(row[j]));
                }
            }
        }
        return retval;
    }
    /**
     * @en Returns a result of combination from the list.
     * @ja 配列から組み合わせ結果を返却
     *
     * @example <br>
     *
     * ```ts
     * const arr = combination(['a', 'b', 'c'], 2);
     * console.log(JSON.stringify(arr));
     * // => [['a','b'],['a','c'],['b','c']]
     * ```
     *
     * @param array
     *  - `en` source array
     *  - `ja` 入力配列
     * @param count
     *  - `en` number of pick up.
     *  - `ja` 選択数
     */
    function combination(array, count) {
        const retval = [];
        if (array.length < count) {
            return [];
        }
        if (1 === count) {
            for (const [i, val] of array.entries()) {
                retval[i] = [val];
            }
        }
        else {
            for (let i = 0, n1 = array.length; i < n1 - count + 1; i++) {
                const row = combination(array.slice(i + 1), count - 1);
                for (let j = 0, n2 = row.length; j < n2; j++) {
                    retval.push([array[i]].concat(row[j]));
                }
            }
        }
        return retval;
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Substitution method of `Array.prototype.map()` which also accepts asynchronous callback.
     * @ja 非同期コールバックを指定可能な `Array.prototype.map()` の代替メソッド
     *
     * @param array
     *  - `en` Array to iterate over.
     *  - `ja` 入力配列
     * @param callback
     *  - `en` Function to apply each item in `array`.
     *  - `ja` イテレーション適用関数
     * @param thisArg
     *  - `en` Value to use as *this* when executing the `callback`.
     *  - `ja` `callback` 実行コンテキスト
     * @returns
     *  - `en` Returns a Promise with the resultant *Array* as value.
     *  - `ja` イテレーション結果配列を格納した Promise オブジェクト
     */
    async function map(array, callback, thisArg) {
        return Promise.all(array.map(async (v, i, a) => {
            return await callback.call(thisArg || this, v, i, a);
        }));
    }
    /**
     * @en Substitution method of `Array.prototype.filter()` which also accepts asynchronous callback.
     * @ja 非同期コールバックを指定可能な `Array.prototype.filter()` の代替メソッド
     *
     * @param array
     *  - `en` Array to iterate over.
     *  - `ja` 入力配列
     * @param callback
     *  - `en` Function to apply each item in `array`.
     *  - `ja` イテレーション適用関数
     * @param thisArg
     *  - `en` Value to use as *this* when executing the `callback`.
     *  - `ja` `callback` 実行コンテキスト
     * @returns
     *  - `en` Returns a Promise with the resultant *Array* as value.
     *  - `ja` イテレーション結果配列を格納した Promise オブジェクト
     */
    async function filter(array, callback, thisArg) {
        const bits = await map(array, (v, i, a) => callback.call(thisArg || this, v, i, a));
        return array.filter(() => bits.shift());
    }
    /**
     * @en Substitution method of `Array.prototype.find()` which also accepts asynchronous callback.
     * @ja 非同期コールバックを指定可能な `Array.prototype.find()` の代替メソッド
     *
     * @param array
     *  - `en` Array to iterate over.
     *  - `ja` 入力配列
     * @param callback
     *  - `en` Function to apply each item in `array`.
     *  - `ja` イテレーション適用関数
     * @param thisArg
     *  - `en` Value to use as *this* when executing the `callback`.
     *  - `ja` `callback` 実行コンテキスト
     * @returns
     *  - `en` Returns a Promise with the resultant value.
     *  - `ja` イテレーション結果を格納した Promise オブジェクト
     */
    async function find(array, callback, thisArg) {
        for (const [i, v] of array.entries()) {
            if (await callback.call(thisArg || this, v, i, array)) {
                return v;
            }
        }
        return undefined;
    }
    /**
     * @en Substitution method of `Array.prototype.findIndex()` which also accepts asynchronous callback.
     * @ja 非同期コールバックを指定可能な `Array.prototype.findIndex()` の代替メソッド
     *
     * @param array
     *  - `en` Array to iterate over.
     *  - `ja` 入力配列
     * @param callback
     *  - `en` Function to apply each item in `array`.
     *  - `ja` イテレーション適用関数
     * @param thisArg
     *  - `en` Value to use as *this* when executing the `callback`.
     *  - `ja` `callback` 実行コンテキスト
     * @returns
     *  - `en` Returns a Promise with the resultant index value.
     *  - `ja` インデックスを格納した Promise オブジェクト
     */
    async function findIndex(array, callback, thisArg) {
        for (const [i, v] of array.entries()) {
            if (await callback.call(thisArg || this, v, i, array)) {
                return i;
            }
        }
        return -1;
    }
    /**
     * @en Substitution method of `Array.prototype.some()` which also accepts asynchronous callback.
     * @ja 非同期コールバックを指定可能な `Array.prototype.some()` の代替メソッド
     *
     * @param array
     *  - `en` Array to iterate over.
     *  - `ja` 入力配列
     * @param callback
     *  - `en` Function to apply each item in `array`.
     *  - `ja` イテレーション適用関数
     * @param thisArg
     *  - `en` Value to use as *this* when executing the `callback`.
     *  - `ja` `callback` 実行コンテキスト
     * @returns
     *  - `en` Returns a Promise with the resultant boolean value.
     *  - `ja` 真偽値を格納した Promise オブジェクト
     */
    async function some(array, callback, thisArg) {
        for (const [i, v] of array.entries()) {
            if (await callback.call(thisArg || this, v, i, array)) {
                return true;
            }
        }
        return false;
    }
    /**
     * @en Substitution method of `Array.prototype.every()` which also accepts asynchronous callback.
     * @ja 非同期コールバックを指定可能な `Array.prototype.every()` の代替メソッド
     *
     * @param array
     *  - `en` Array to iterate over.
     *  - `ja` 入力配列
     * @param callback
     *  - `en` Function to apply each item in `array`.
     *  - `ja` イテレーション適用関数
     * @param thisArg
     *  - `en` Value to use as *this* when executing the `callback`.
     *  - `ja` `callback` 実行コンテキスト
     * @returns
     *  - `en` Returns a Promise with the resultant boolean value.
     *  - `ja` 真偽値を格納した Promise オブジェクト
     */
    async function every(array, callback, thisArg) {
        for (const [i, v] of array.entries()) {
            if (!await callback.call(thisArg || this, v, i, array)) {
                return false;
            }
        }
        return true;
    }
    /**
     * @en Substitution method of `Array.prototype.reduce()` which also accepts asynchronous callback.
     * @ja 非同期コールバックを指定可能な `Array.prototype.reduce()` の代替メソッド
     *
     * @param array
     *  - `en` Array to iterate over.
     *  - `ja` 入力配列
     * @param callback
     *  - `en` Function to apply each item in `array`.
     *  - `ja` イテレーション適用関数
     * @param initialValue
     *  - `en` Used as first argument to the first call of `callback`.
     *  - `ja` `callback` に渡される初期値
     * @returns
     *  - `en` Returns a Promise with the resultant *Array* as value.
     *  - `ja` イテレーション結果配列を格納した Promise オブジェクト
     */
    async function reduce(array, callback, initialValue) {
        if (array.length <= 0 && undefined === initialValue) {
            throw TypeError('Reduce of empty array with no initial value');
        }
        const hasInit = (undefined !== initialValue);
        let acc = (hasInit ? initialValue : array[0]);
        for (const [i, v] of array.entries()) {
            if (!(!hasInit && 0 === i)) {
                acc = await callback(acc, v, i, array);
            }
        }
        return acc;
    }

    /** @internal */
    const _computeDateFuncMap = {
        year: (date, base, add) => {
            date.setUTCFullYear(base.getUTCFullYear() + add);
            return date;
        },
        month: (date, base, add) => {
            date.setUTCMonth(base.getUTCMonth() + add);
            return date;
        },
        day: (date, base, add) => {
            date.setUTCDate(base.getUTCDate() + add);
            return date;
        },
        hour: (date, base, add) => {
            date.setUTCHours(base.getUTCHours() + add);
            return date;
        },
        min: (date, base, add) => {
            date.setUTCMinutes(base.getUTCMinutes() + add);
            return date;
        },
        sec: (date, base, add) => {
            date.setUTCSeconds(base.getUTCSeconds() + add);
            return date;
        },
        msec: (date, base, add) => {
            date.setUTCMilliseconds(base.getUTCMilliseconds() + add);
            return date;
        },
    };
    /**
     * @en Calculate from the date which becomes a cardinal point before a N date time or after a N date time (by [[DateUnit]]).
     * @ja 基点となる日付から、N日後、N日前を算出
     *
     * @param base
     *  - `en` base date time.
     *  - `ja` 基準日
     * @param add
     *  - `en` relative date time.
     *  - `ja` 加算日. マイナス指定でn日前も設定可能
     * @param unit [[DateUnit]]
     */
    function computeDate(base, add, unit = 'day') {
        const date = new Date(base.getTime());
        const func = _computeDateFuncMap[unit];
        if (func) {
            return func(date, base, add);
        }
        else {
            throw new TypeError(`invalid unit: ${unit}`);
        }
    }

    /*!
     * @cdp/events 0.9.12
     *   pub/sub framework
     */

    /* eslint-disable
        @typescript-eslint/no-explicit-any,
     */
    /** @internal Lisner の弱参照 */
    const _mapListeners = new WeakMap();
    /** @internal LisnerMap の取得 */
    function listeners(instance) {
        if (!_mapListeners.has(instance)) {
            throw new TypeError('This is not a valid EventPublisher.');
        }
        return _mapListeners.get(instance);
    }
    /** @internal Channel の型検証 */
    function validChannel(channel) {
        if (isString(channel) || isSymbol(channel)) {
            return;
        }
        throw new TypeError(`Type of ${className(channel)} is not a valid channel.`);
    }
    /** @internal Listener の型検証 */
    function validListener(listener) {
        if (null != listener) {
            verify('typeOf', 'function', listener);
        }
        return listener;
    }
    /** @internal event 発行 */
    function triggerEvent(map, channel, original, ...args) {
        const list = map.get(channel);
        if (!list) {
            return;
        }
        for (const listener of list) {
            try {
                const eventArgs = original ? [original, ...args] : args;
                const handled = listener(...eventArgs);
                // if received 'true', stop delegation.
                if (true === handled) {
                    break;
                }
            }
            catch (e) {
                void Promise.reject(e);
            }
        }
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Eventing framework class with ensuring type-safe for TypeScript. <br>
     *     The client of this class can implement original Pub-Sub (Observer) design pattern.
     * @ja 型安全を保障するイベント登録・発行クラス <br>
     *     クライアントは本クラスを派生して独自の Pub-Sub (Observer) パターンを実装可能
     *
     * @example <br>
     *
     * ```ts
     * import { EventPublisher } from '@cdp/events';
     *
     * // declare event interface
     * interface SampleEvent {
     *   hoge: [number, string];        // callback function's args type tuple
     *   foo: [void];                   // no args
     *   hoo: void;                     // no args (same the upon)
     *   bar: [Error];                  // any class is available.
     *   baz: Error | Number;           // if only one argument, `[]` is not required.
     * }
     *
     * // declare client class
     * class SamplePublisher extends EventPublisher<SampleEvent> {
     *   :
     *   someMethod(): void {
     *     this.publish('hoge', 100, 'test');       // OK. standard usage.
     *     this.publish('hoge', 100, true);         // NG. argument of type 'true' is not assignable
     *                                              //     to parameter of type 'string | undefined'.
     *     this.publish('hoge', 100);               // OK. all args to be optional automatically.
     *     this.publish('foo');                     // OK. standard usage.
     *     this.publish('foo', 100);                // NG. argument of type '100' is not assignable
     *                                              //     to parameter of type 'void | undefined'.
     *   }
     * }
     *
     * const sample = new SamplePublisher();
     *
     * sample.on('hoge', (a: number, b: string) => { ... });    // OK. standard usage.
     * sample.on('hoge', (a: number, b: boolean) => { ... });   // NG. types of parameters 'b'
     *                                                          //     and 'args_1' are incompatible.
     * sample.on('hoge', (a) => { ... });                       // OK. all args
     *                                                          //     to be optional automatically.
     * sample.on('hoge', (a, b, c) => { ... });                 // NG. expected 1-2 arguments,
     *                                                          //     but got 3.
     * ```
     */
    class EventPublisher {
        /** constructor */
        constructor() {
            verify('instanceOf', EventPublisher, this);
            _mapListeners.set(this, new Map());
        }
        /**
         * @en Notify event to clients.
         * @ja event 発行
         *
         * @param channel
         *  - `en` event channel key. (string | symbol)
         *  - `ja` イベントチャネルキー (string | symbol)
         * @param args
         *  - `en` arguments for callback function of the `channel` corresponding.
         *  - `ja` `channel` に対応したコールバック関数に渡す引数
         */
        publish(channel, ...args) {
            const map = listeners(this);
            validChannel(channel);
            triggerEvent(map, channel, undefined, ...args);
            // trigger for all handler
            if ('*' !== channel) {
                triggerEvent(map, '*', channel, ...args);
            }
        }
        ///////////////////////////////////////////////////////////////////////
        // implements: Subscribable<Event>
        /**
         * @en Check whether this object has clients.
         * @ja クライアントが存在するか判定
         *
         * @param channel
         *  - `en` event channel key. (string | symbol)
         *  - `ja` イベントチャネルキー (string | symbol)
         * @param listener
         *  - `en` callback function of the `channel` corresponding.
         *  - `ja` `channel` に対応したコールバック関数
         */
        hasListener(channel, listener) {
            const map = listeners(this);
            if (null == channel) {
                return map.size > 0;
            }
            validChannel(channel);
            if (null == listener) {
                return map.has(channel);
            }
            validListener(listener);
            const list = map.get(channel);
            return list ? list.has(listener) : false;
        }
        /**
         * @en Returns registered channel keys.
         * @ja 登録されているチャネルキーを返却
         */
        channels() {
            return [...listeners(this).keys()];
        }
        /**
         * @en Subscrive event(s).
         * @ja イベント購読設定
         *
         * @param channel
         *  - `en` target event channel key. (string | symbol)
         *  - `ja` 対象のイベントチャネルキー (string | symbol)
         * @param listener
         *  - `en` callback function of the `channel` corresponding.
         *  - `ja` `channel` に対応したコールバック関数
         */
        on(channel, listener) {
            const map = listeners(this);
            validListener(listener);
            const channels = isArray(channel) ? channel : [channel];
            for (const ch of channels) {
                validChannel(ch);
                map.has(ch) ? map.get(ch).add(listener) : map.set(ch, new Set([listener])); // eslint-disable-line @typescript-eslint/no-non-null-assertion
            }
            return Object.freeze({
                get enable() {
                    for (const ch of channels) {
                        const list = map.get(ch);
                        if (!list || !list.has(listener)) {
                            this.unsubscribe();
                            return false;
                        }
                    }
                    return true;
                },
                unsubscribe() {
                    for (const ch of channels) {
                        const list = map.get(ch);
                        if (list) {
                            list.delete(listener);
                            list.size > 0 || map.delete(ch);
                        }
                    }
                },
            });
        }
        /**
         * @en Subscrive event(s) but it causes the bound callback to only fire once before being removed.
         * @ja 一度だけハンドリング可能なイベント購読設定
         *
         * @param channel
         *  - `en` target event channel key. (string | symbol)
         *  - `ja` 対象のイベントチャネルキー (string | symbol)
         * @param listener
         *  - `en` callback function of the `channel` corresponding.
         *  - `ja` `channel` に対応したコールバック関数
         */
        once(channel, listener) {
            const context = this.on(channel, listener);
            const managed = this.on(channel, () => {
                context.unsubscribe();
                managed.unsubscribe();
            });
            return context;
        }
        /**
         * @en Unsubscribe event(s).
         * @ja イベント購読解除
         *
         * @param channel
         *  - `en` target event channel key. (string | symbol)
         *         When not set this parameter, everything is released.
         *  - `ja` 対象のイベントチャネルキー (string | symbol)
         *         指定しない場合はすべて解除
         * @param listener
         *  - `en` callback function of the `channel` corresponding.
         *         When not set this parameter, all same `channel` listeners are released.
         *  - `ja` `channel` に対応したコールバック関数
         *         指定しない場合は同一 `channel` すべてを解除
         */
        off(channel, listener) {
            const map = listeners(this);
            if (null == channel) {
                map.clear();
                return this;
            }
            const channels = isArray(channel) ? channel : [channel];
            const callback = validListener(listener);
            for (const ch of channels) {
                validChannel(ch);
                if (null == callback) {
                    map.delete(ch);
                    continue;
                }
                else {
                    const list = map.get(ch);
                    if (list) {
                        list.delete(callback);
                        list.size > 0 || map.delete(ch);
                    }
                }
            }
            return this;
        }
    }

    /* eslint-disable
        @typescript-eslint/no-explicit-any,
     */
    /**
     * @en Constructor of [[EventBroker]]
     * @ja [[EventBroker]] のコンストラクタ実体
     */
    const EventBroker = EventPublisher;
    EventBroker.prototype.trigger = EventPublisher.prototype.publish;

    /** @internal */ const _context = Symbol('context');
    /** @internal register listener context */
    function register(context, target, channel, listener) {
        const subscriptions = [];
        const channels = isArray(channel) ? channel : [channel];
        for (const ch of channels) {
            const s = target.on(ch, listener);
            context.set.add(s);
            subscriptions.push(s);
            const listenerMap = context.map.get(target) || new Map();
            const map = listenerMap.get(ch) || new Map();
            map.set(listener, s);
            if (!listenerMap.has(ch)) {
                listenerMap.set(ch, map);
            }
            if (!context.map.has(target)) {
                context.map.set(target, listenerMap);
            }
        }
        return Object.freeze({
            get enable() {
                for (const s of subscriptions) {
                    if (s.enable) {
                        return true;
                    }
                }
                return false;
            },
            unsubscribe() {
                for (const s of subscriptions) {
                    s.unsubscribe();
                }
            },
        });
    }
    /** @internal unregister listener context */
    function unregister(context, target, channel, listener) {
        if (null != target) {
            target.off(channel, listener);
            const listenerMap = context.map.get(target);
            if (!listenerMap) {
                return;
            }
            if (null != channel) {
                const channels = isArray(channel) ? channel : [channel];
                for (const ch of channels) {
                    const map = listenerMap.get(ch);
                    if (!map) {
                        return;
                    }
                    else if (listener) {
                        const s = map.get(listener);
                        if (s) {
                            s.unsubscribe();
                            context.set.delete(s);
                        }
                        map.delete(listener);
                    }
                    else {
                        for (const s of map.values()) {
                            s.unsubscribe();
                            context.set.delete(s);
                        }
                    }
                }
            }
            else {
                for (const map of listenerMap.values()) {
                    for (const s of map.values()) {
                        s.unsubscribe();
                        context.set.delete(s);
                    }
                }
            }
        }
        else {
            for (const s of context.set) {
                s.unsubscribe();
            }
            context.map = new WeakMap();
            context.set.clear();
        }
    }
    //__________________________________________________________________________________________________//
    /**
     * @en The class to which the safe event register/unregister method is offered for the object which is a short life cycle than subscription target. <br>
     *     The advantage of using this form, instead of `on()`, is that `listenTo()` allows the object to keep track of the events,
     *     and they can be removed all at once later call `stopListening()`.
     * @ja 購読対象よりもライフサイクルが短いオブジェクトに対して, 安全なイベント登録/解除メソッドを提供するクラス <br>
     *     `on()` の代わりに `listenTo()` を使用することで, 後に `stopListening()` を1度呼ぶだけですべてのリスナーを解除できる利点がある.
     *
     * @example <br>
     *
     * ```ts
     * import { EventReceiver, EventBroker } from '@cdp/events';
     *
     * // declare event interface
     * interface SampleEvent {
     *   hoge: [number, string];        // callback function's args type tuple
     *   foo: [void];                   // no args
     *   hoo: void;                     // no args (same the upon)
     *   bar: [Error];                  // any class is available.
     *   baz: Error | Number;           // if only one argument, `[]` is not required.
     * }
     *
     * // declare client class
     * class SampleReceiver extends EventReceiver {
     *   constructor(broker: EventBroker<SampleEvent>) {
     *     super();
     *     this.listenTo(broker, 'hoge', (num: number, str: string) => { ... });
     *     this.listenTo(broker, 'bar', (e: Error) => { ... });
     *     this.listenTo(broker, ['foo', 'hoo'], () => { ... });
     *   }
     *
     *   release(): void {
     *     this.stopListening();
     *   }
     * }
     * ```
     *
     * or
     *
     * ```ts
     * const broker   = new EventBroker<SampleEvent>();
     * const receiver = new EventReceiver();
     *
     * receiver.listenTo(broker, 'hoge', (num: number, str: string) => { ... });
     * receiver.listenTo(broker, 'bar', (e: Error) => { ... });
     * receiver.listenTo(broker, ['foo', 'hoo'], () => { ... });
     *
     * receiver.stopListening();
     * ```
     */
    class EventReceiver {
        /** constructor */
        constructor() {
            this[_context] = { map: new WeakMap(), set: new Set() };
        }
        /**
         * @en Tell an object to listen to a particular event on an other object.
         * @ja 対象オブジェクトのイベント購読設定
         *
         * @param target
         *  - `en` event listening target object.
         *  - `ja` イベント購読対象のオブジェクト
         * @param channel
         *  - `en` target event channel key. (string | symbol)
         *  - `ja` 対象のイベントチャネルキー (string | symbol)
         * @param listener
         *  - `en` callback function of the `channel` corresponding.
         *  - `ja` `channel` に対応したコールバック関数
         */
        listenTo(target, channel, listener) {
            return register(this[_context], target, channel, listener);
        }
        /**
         * @en Just like listenTo, but causes the bound callback to fire only once before being removed.
         * @ja 対象オブジェクトの一度だけハンドリング可能なイベント購読設定
         *
         * @param target
         *  - `en` event listening target object.
         *  - `ja` イベント購読対象のオブジェクト
         * @param channel
         *  - `en` target event channel key. (string | symbol)
         *  - `ja` 対象のイベントチャネルキー (string | symbol)
         * @param listener
         *  - `en` callback function of the `channel` corresponding.
         *  - `ja` `channel` に対応したコールバック関数
         */
        listenToOnce(target, channel, listener) {
            const context = register(this[_context], target, channel, listener);
            const managed = target.on(channel, () => {
                unregister(this[_context], target, channel, listener);
                managed.unsubscribe();
            });
            return context;
        }
        /**
         * @en Tell an object to stop listening to events.
         * @ja イベント購読解除
         *
         * @param target
         *  - `en` event listening target object.
         *         When not set this parameter, everything is released.
         *  - `ja` イベント購読対象のオブジェクト
         *         指定しない場合はすべてのリスナーを解除
         * @param channel
         *  - `en` target event channel key. (string | symbol)
         *         When not set this parameter, everything is released listeners from `target`.
         *  - `ja` 対象のイベントチャネルキー (string | symbol)
         *         指定しない場合は対象 `target` のリスナーをすべて解除
         * @param listener
         *  - `en` callback function of the `channel` corresponding.
         *         When not set this parameter, all same `channel` listeners are released.
         *  - `ja` `channel` に対応したコールバック関数
         *         指定しない場合は同一 `channel` すべてを解除
         */
        stopListening(target, channel, listener) {
            unregister(this[_context], target, channel, listener);
            return this;
        }
    }

    /* eslint-disable
        @typescript-eslint/no-explicit-any,
     */
    /** @internal [[EventSource]] class */
    class EventSource extends mixins(EventBroker, EventReceiver) {
        constructor() {
            super();
            this.super(EventReceiver);
        }
    }
    /**
     * @en Constructor of [[EventSource]]
     * @ja [[EventSource]] のコンストラクタ実体
     */
    const EventSourceBase = EventSource;

    /*!
     * @cdp/promise 0.9.12
     *   promise utility module
     */

    /** @internal */ const _cancel = Symbol('cancel');
    /** @internal */ const _close = Symbol('close');
    /**
     * @en Invalid subscription object declaration.
     * @ja 無効な Subscription オブジェクト
     *
     * @internal
     */
    const invalidSubscription = Object.freeze({
        enable: false,
        unsubscribe() { }
    });

    /** @internal */ const _tokens$1 = new WeakMap();
    /** @internal */
    function getContext(instance) {
        if (!_tokens$1.has(instance)) {
            throw new TypeError('The object is not a valid CancelToken.');
        }
        return _tokens$1.get(instance);
    }
    /**
     * @en The token object to which unification processing for asynchronous processing cancellation is offered. <br>
     *     Origin is `CancellationToken` of `.NET Framework`.
     * @ja 非同期処理キャンセルのための統一処理を提供するトークンオブジェクト <br>
     *     オリジナルは `.NET Framework` の `CancellationToken`
     *
     * @see https://docs.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads
     *
     * @example <br>
     *
     * ```ts
     * import { CancelToken } from '@cdp/promise';
     * ```
     *
     * - Basic Usage
     *
     * ```ts
     * const token = new CancelToken((cancel, close) => {
     *   button1.onclick = ev => cancel(new Error('Cancel'));
     *   button2.onclick = ev => close();
     * });
     * ```
     *
     * or
     *
     * ```ts
     * const { cancel, close, token } = CancelToken.source();
     * button1.onclick = ev => cancel(new Error('Cancel'));
     * button2.onclick = ev => close();
     * ```
     *
     * - Use with Promise
     *
     * ```ts
     * const { cancel, close, token } = CancelToken.source();
     * const promise = new Promise((ok, ng) => { ... }, token);
     * promise
     *   .then(...)
     *   .then(...)
     *   .then(...)
     *   .catch(reason => {
     *     // check reason
     *   });
     * ```
     *
     * - Register & Unregister callback(s)
     *
     * ```ts
     * const { cancel, close, token } = CancelToken.source();
     * const subscription = token.register(reason => {
     *   console.log(reason.message);
     * });
     * if (someCase) {
     *   subscription.unsubscribe();
     * }
     * ```
     */
    class CancelToken {
        /**
         * @en Create [[CancelTokenSource]] instance.
         * @ja [[CancelTokenSource]] インスタンスの取得
         *
         * @param linkedTokens
         *  - `en` relating already made [[CancelToken]] instance.
         *        You can attach to the token that to be a cancellation target.
         *  - `ja` すでに作成された [[CancelToken]] 関連付ける場合に指定
         *        渡された token はキャンセル対象として紐づけられる
         */
        static source(...linkedTokens) {
            let cancel;
            let close;
            const token = new CancelToken((onCancel, onClose) => {
                cancel = onCancel;
                close = onClose;
            }, ...linkedTokens);
            return Object.freeze({ token, cancel, close });
        }
        /**
         * constructor
         *
         * @param executor
         *  - `en` executer that has `cancel` and `close` callback.
         *  - `ja` キャンセル/クローズ 実行コールバックを指定
         * @param linkedTokens
         *  - `en` relating already made [[CancelToken]] instance.
         *        You can attach to the token that to be a cancellation target.
         *  - `ja` すでに作成された [[CancelToken]] 関連付ける場合に指定
         *        渡された token はキャンセル対象として紐づけられる
         */
        constructor(executor, ...linkedTokens) {
            verify('instanceOf', CancelToken, this);
            verify('typeOf', 'function', executor);
            const linkedTokenSet = new Set(linkedTokens.filter(t => _tokens$1.has(t)));
            let status = 0 /* CancelTokenState.OPEN */;
            for (const t of linkedTokenSet) {
                status |= getContext(t).status;
            }
            const context = {
                broker: new EventBroker(),
                subscriptions: new Set(),
                reason: undefined,
                status,
            };
            _tokens$1.set(this, Object.seal(context));
            const cancel = this[_cancel];
            const close = this[_close];
            if (status === 0 /* CancelTokenState.OPEN */) {
                for (const t of linkedTokenSet) {
                    context.subscriptions.add(t.register(cancel.bind(this)));
                    this.register(cancel.bind(t));
                }
            }
            executor(cancel.bind(this), close.bind(this));
        }
        /**
         * @en Cancellation reason accessor.
         * @ja キャンセルの原因取得
         */
        get reason() {
            return getContext(this).reason;
        }
        /**
         * @en Enable cancellation state accessor.
         * @ja キャンセル可能か判定
         */
        get cancelable() {
            return getContext(this).status === 0 /* CancelTokenState.OPEN */;
        }
        /**
         * @en Cancellation requested state accessor.
         * @ja キャンセルを受け付けているか判定
         */
        get requested() {
            return !!(getContext(this).status & 1 /* CancelTokenState.REQUESTED */);
        }
        /**
         * @en Cancellation closed state accessor.
         * @ja キャンセル受付を終了しているか判定
         */
        get closed() {
            return !!(getContext(this).status & 2 /* CancelTokenState.CLOSED */);
        }
        /**
         * @en `toString` tag override.
         * @ja `toString` タグのオーバーライド
         */
        get [Symbol.toStringTag]() { return 'CancelToken'; }
        /**
         * @en Register custom cancellation callback.
         * @ja キャンセル時のカスタム処理の登録
         *
         * @param onCancel
         *  - `en` cancel operation callback
         *  - `ja` キャンセルコールバック
         * @returns
         *  - `en` `Subscription` instance.
         *        You can revoke cancellation to call `unsubscribe` method.
         *  - `ja` `Subscription` インスタンス
         *        `unsubscribe` メソッドを呼ぶことでキャンセルを無効にすることが可能
         */
        register(onCancel) {
            const context = getContext(this);
            if (!this.cancelable) {
                return invalidSubscription;
            }
            return context.broker.on('cancel', onCancel);
        }
        /** @internal */
        [_cancel](reason) {
            const context = getContext(this);
            verify('notNil', reason);
            if (!this.cancelable) {
                return;
            }
            context.reason = reason;
            context.status |= 1 /* CancelTokenState.REQUESTED */;
            for (const s of context.subscriptions) {
                s.unsubscribe();
            }
            context.broker.trigger('cancel', reason);
            void Promise.resolve().then(() => this[_close]());
        }
        /** @internal */
        [_close]() {
            const context = getContext(this);
            if (this.closed) {
                return;
            }
            context.status |= 2 /* CancelTokenState.CLOSED */;
            for (const s of context.subscriptions) {
                s.unsubscribe();
            }
            context.subscriptions.clear();
            context.broker.off();
        }
    }

    /* eslint-disable
        no-global-assign,
        @typescript-eslint/unbound-method,
     */
    /** @internal `Native Promise` constructor */
    const NativePromise = Promise;
    /** @internal `Native then` method */
    const nativeThen = NativePromise.prototype.then;
    /** @internal */ const _create = Symbol('create');
    /** @internal */ const _tokens = new WeakMap();
    /**
     * @en Extended `Promise` class which enabled cancellation. <br>
     *     `Native Promise` constructor is overridden by framework default behaviour.
     * @ja キャンセルを可能にした `Promise` 拡張クラス <br>
     *     既定で `Native Promise` をオーバーライドする.
     */
    class CancelablePromise extends Promise {
        /**
         * @en Overriding of the default constructor used for generation of an object.
         * @ja オブジェクトの生成に使われるデフォルトコンストラクタのオーバーライド
         *
         * @internal
         */
        static get [Symbol.species]() { return NativePromise; }
        /**
         * @en Creates a new resolved promise for the provided value.
         * @ja 新規に解決済み promise インスタンスを作成
         *
         * @internal
         *
         * @param value
         *  - `en` the value transmitted in promise chain.
         *  - `ja` `Promise` に伝達する値
         * @param cancelToken
         *  - `en` [[CancelToken]] instance create from [[CancelToken]].`source()`.
         *  - `ja` [[CancelToken]].`source()` より作成した [[CancelToken]] インスタンスを指定
         */
        static resolve(value, cancelToken) {
            return this[_create](super.resolve(value), cancelToken);
        }
        /** @internal private construction */
        static [_create](src, token, thenArgs) {
            verify('instanceOf', NativePromise, src);
            let p;
            if (!(token instanceof CancelToken)) {
                p = src;
            }
            else if (thenArgs && (!isFunction(thenArgs[0]) || isFunction(thenArgs[1]))) {
                p = src;
            }
            else if (token.cancelable) {
                let s;
                p = new NativePromise((resolve, reject) => {
                    s = token.register(reject);
                    nativeThen.call(src, resolve, reject);
                });
                const dispose = () => {
                    s.unsubscribe();
                    _tokens.delete(p);
                };
                p.then(dispose, dispose);
            }
            else if (token.requested) {
                p = super.reject(token.reason);
            }
            else if (token.closed) {
                p = src;
            }
            else {
                throw new Error('Unexpected Exception');
            }
            if (thenArgs) {
                p = nativeThen.apply(p, thenArgs);
            }
            if (token && token.cancelable) {
                _tokens.set(p, token);
            }
            p instanceof this || Object.setPrototypeOf(p, this.prototype);
            return p;
        }
        /**
         * constructor
         *
         * @param executor
         *  - `en` A callback used to initialize the promise. This callback is passed two arguments `resolve` and `reject`.
         *  - `ja` promise の初期化に使用するコールバックを指定. `resolve` と `reject` の2つの引数を持つ
         * @param cancelToken
         *  - `en` [[CancelToken]] instance create from [[CancelToken]].`source()`.
         *  - `ja` [[CancelToken]].`source()` より作成した [[CancelToken]] インスタンスを指定
         */
        constructor(executor, cancelToken) {
            super(executor);
            return CancelablePromise[_create](this, cancelToken);
        }
        /**
         * Attaches callbacks for the resolution and/or rejection of the Promise.
         *
         * @internal
         *
         * @param onfulfilled The callback to execute when the Promise is resolved.
         * @param onrejected The callback to execute when the Promise is rejected.
         * @returns A Promise for the completion of which ever callback is executed.
         */
        then(onfulfilled, onrejected) {
            return CancelablePromise[_create](this, _tokens.get(this), [onfulfilled, onrejected]);
        }
        /**
         * Attaches a callback for only the rejection of the Promise.
         *
         * @internal
         *
         * @param onrejected The callback to execute when the Promise is rejected.
         * @returns A Promise for the completion of the callback.
         */
        catch(onrejected) {
            return this.then(undefined, onrejected);
        }
        /**
         * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). <br>
         * The resolved value cannot be modified from the callback.
         *
         * @internal
         *
         * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
         * @returns A Promise for the completion of the callback.
         */
        finally(onfinally) {
            return CancelablePromise[_create](super.finally(onfinally), _tokens.get(this));
        }
    }
    /**
     * @en Switch the global `Promise` constructor `Native Promise` or [[CancelablePromise]]. <br>
     *     `Native Promise` constructor is overridden by framework default behaviour.
     * @ja グローバル `Promise` コンストラクタを `Native Promise` または [[CancelablePromise]] に切り替え <br>
     *     既定で `Native Promise` をオーバーライドする.
     *
     * @param enable
     *  - `en` `true`: use [[CancelablePromise]] /  `false`: use `Native Promise`
     *  - `ja` `true`: [[CancelablePromise]] を使用 / `false`: `Native Promise` を使用
     */
    function extendPromise(enable) {
        if (enable) {
            Promise = CancelablePromise;
        }
        else {
            Promise = NativePromise;
        }
        return Promise;
    }
    // default: automatic native promise override.
    extendPromise(!getConfig().noAutomaticNativeExtend);

    //__________________________________________________________________________________________________//
    /**
     * @en Wait for promises done. <br>
     *     While control will be returned immediately when `Promise.all()` fails, but this mehtod waits for including failure.
     * @ja `Promise` オブジェクトの終了まで待機 <br>
     *     `Promise.all()` は失敗するとすぐに制御を返すのに対し、失敗も含めて待つ `Promise` オブジェクトを返却
     *
     * @param promises
     *  - `en` Promise instance array
     *  - `ja` Promise インスタンスの配列を指定
     */
    function wait(promises) {
        const safePromises = promises.map((promise) => promise.catch((e) => e));
        return Promise.all(safePromises);
    }
    /**
     * @en Cancellation checker method. <br>
     *     It's practicable by `async function`.
     * @ja キャンセルチェッカー <br>
     *     `async function` で使用可能
     *
     * @example <br>
     *
     * ```ts
     *  async function someFunc(token: CancelToken): Promise<{}> {
     *    await checkCanceled(token);
     *    return {};
     *  }
     * ```
     *
     * @param token
     *  - `en` [[CancelToken]] reference. (enable `undefined`)
     *  - `ja` [[CancelToken]] を指定 (undefined 可)
     */
    function checkCanceled(token) {
        return Promise.resolve(undefined, token);
    }
    /**
     * @en Check the status of the promise instance. <br>
     *     It's practicable by `async function`.
     * @ja Promise インスタンスの状態を確認 <br>
     *     `async function` で使用可能
     *
     * @example <br>
     *
     * ```ts
     * ```
     *
     * @param promise
     *  - `en` Promise instance
     *  - `ja` Promise インスタンスを指定
     */
    function checkStatus(promise) {
        const pending = {};
        return Promise.race([promise, pending])
            .then(v => (v === pending) ? 'pending' : 'fulfilled', () => 'rejected');
    }

    /**
     * @en `Deferred` object class that can operate `reject` and` resolve` from the outside.
     * @ja `reject`, ` resolve` を外部より操作可能な `Deferred` オブジェクトクラス
     *
     * @example <br>
     *
     * ```ts
     * const df = new Deferred();
     * df.resolve();
     * df.reject('reason');
     *
     * await df;
     * ```
     */
    class Deferred extends CancelablePromise {
        /**
         * constructor
         *
         * @param cancelToken
         *  - `en` [[CancelToken]] instance create from [[CancelToken]].`source()`.
         *  - `ja` [[CancelToken]].`source()` より作成した [[CancelToken]] インスタンスを指定
         */
        constructor(cancelToken) {
            const publications = {};
            super((resolve, reject) => {
                Object.assign(publications, { resolve, reject });
            }, cancelToken);
            Object.assign(this, publications); // eslint-disable-line @typescript-eslint/no-floating-promises
        }
        /** @internal */
        get [Symbol.toStringTag]() { return 'Deferred'; }
    }

    /**
     * @en The class manages lumping multiple `Promise` objects. <br>
     *     It's possible to make them cancel more than one `Promise` which handles different [[CancelToken]] by lumping.
     * @ja 複数 `Promise` オブジェクトを一括管理するクラス <br>
     *     異なる [[CancelToken]] を扱う複数の `Promise` を一括でキャンセルさせることが可能
     */
    class PromiseManager {
        constructor() {
            // eslint-disable-next-line func-call-spacing
            this._pool = new Map();
        }
        /**
         * @en Add a `Promise` object under the management.
         * @ja `Promise` オブジェクトを管理下に追加
         *
         * @param promise
         *  - `en` any `Promise` instance is available.
         *  - `ja` 任意の `Promise` インスタンス
         * @param cancelSource
         *  - `en` [[CancelTokenSource]] instance made by `CancelToken.source()`.
         *  - `ja` `CancelToken.source()` で生成される [[CancelTokenSource]] インスタンス
         * @returns
         *  - `en` return the same instance of input `promise` instance.
         *  - `ja` 入力した `promise` と同一インスタンスを返却
         */
        add(promise, cancelSource) {
            this._pool.set(promise, cancelSource && cancelSource.cancel); // eslint-disable-line @typescript-eslint/unbound-method
            const always = () => {
                this._pool.delete(promise);
                if (cancelSource) {
                    cancelSource.close();
                }
            };
            promise
                .then(always, always);
            return promise;
        }
        /**
         * @en Released all instances under the management.
         * @ja 管理対象を破棄
         */
        release() {
            this._pool.clear();
        }
        /**
         * @en Return `promise` array from under the management.
         * @ja 管理対象の Promise を配列で取得
         */
        promises() {
            return [...this._pool.keys()];
        }
        /**
         * @en Call `Promise.all()` for under the management. <br>
         *     Wait for all `fullfilled`.
         * @ja 管理対象に対して `Promise.all()` <br>
         *     すべてが `fullfilled` になるまで待機
         */
        all() {
            return Promise.all(this.promises());
        }
        /**
         * @en Call `Promise.race()` for under the management. <br>
         *     Wait for any `settled`.
         * @ja 管理対象に対して `Promise.race()` <br>
         *     いずれかが `settled` になるまで待機
         */
        race() {
            return Promise.race(this.promises());
        }
        /**
         * @en Call [[wait]]() for under the management. <br>
         *     Wait for all `settled`. (simplified version)
         * @ja 管理対象に対して [[wait]]() <br>
         *     すべてが `settled` になるまで待機 (簡易バージョン)
         */
        wait() {
            return wait(this.promises());
        }
        /**
         * @en Call `Promise.allSettled()` for under the management. <br>
         *     Wait for all `settled`.
         * @ja 管理対象に対して `Promise.allSettled()` <br>
         *     すべてが `settled` になるまで待機
         */
        allSettled() {
            return Promise.allSettled(this.promises());
        }
        /**
         * @en Call `Promise.any()` for under the management. <br>
         *     Wait for any `fullfilled`.
         * @ja 管理対象に対して `Promise.any()` <br>
         *     いずれかが `fullfilled` になるまで待機
         */
        any() {
            return Promise.any(this.promises());
        }
        /**
         * @en Invoke `cancel` message for under the management promises.
         * @ja 管理対象の `Promise` に対してキャンセルを発行
         *
         * @param reason
         *  - `en` arguments for `cancelSource`
         *  - `ja` `cancelSource` に渡される引数
         * @returns
         *  - `en` `Promise` instance which wait by until cancellation completion.
         *  - `ja` キャンセル完了まで待機する [[Promise]] インスタンス
         */
        abort(reason) {
            for (const canceler of this._pool.values()) {
                if (canceler) {
                    canceler((null != reason) ? reason : new Error('abort'));
                }
            }
            return wait(this.promises());
        }
    }

    /*!
     * @cdp/observable 0.9.12
     *   observable utility module
     */

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
            if (1 === argLength && isNumber$1(arguments[0])) {
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

    /*!
     * @cdp/result 0.9.12
     *   result utility module
     */

    /* eslint-disable
        no-inner-declarations,
        @typescript-eslint/no-namespace,
        @typescript-eslint/no-unused-vars,
     */
    /*
     * NOTE: 内部モジュールに `CDP` namespace を使用してしまうと, 外部モジュールでは宣言できなくなる.
     * https://github.com/Microsoft/TypeScript/issues/9611
     */
    globalThis.CDP_DECLARE = globalThis.CDP_DECLARE || {};
    (function () {
        /**
         * @en Common result code for the application.
         * @ja アプリケーション全体で使用する共通エラーコード定義
         */
        let RESULT_CODE;
        (function (RESULT_CODE) {
            /** `en` general success code             <br> `ja` 汎用成功コード                       */
            RESULT_CODE[RESULT_CODE["SUCCESS"] = 0] = "SUCCESS";
            /** `en` general cancel code              <br> `ja` 汎用キャンセルコード                 */
            RESULT_CODE[RESULT_CODE["ABORT"] = 1] = "ABORT";
            /** `en` general pending code             <br> `ja` 汎用オペレーション未実行エラーコード */
            RESULT_CODE[RESULT_CODE["PENDING"] = 2] = "PENDING";
            /** `en` general success but noop code    <br> `ja` 汎用実行不要コード                   */
            RESULT_CODE[RESULT_CODE["NOOP"] = 3] = "NOOP";
            /** `en` general error code               <br> `ja` 汎用エラーコード                     */
            RESULT_CODE[RESULT_CODE["FAIL"] = -1] = "FAIL";
            /** `en` general fatal error code         <br> `ja` 汎用致命的エラーコード               */
            RESULT_CODE[RESULT_CODE["FATAL"] = -2] = "FATAL";
            /** `en` general not supported error code <br> `ja` 汎用オペレーションエラーコード       */
            RESULT_CODE[RESULT_CODE["NOT_SUPPORTED"] = -3] = "NOT_SUPPORTED";
        })(RESULT_CODE = CDP_DECLARE.RESULT_CODE || (CDP_DECLARE.RESULT_CODE = {}));
        /**
         * @en Assign declared [[RESULT_CODE]] to root enumeration.
         *     (It's enable to merge enum in the module system environment.)
         * @ja 拡張した [[RESULT_CODE]] を ルート enum にアサイン
         *     モジュールシステム環境においても、enum をマージを可能にする
         */
        function ASSIGN_RESULT_CODE(extend) {
            Object.assign(RESULT_CODE, extend);
        }
        CDP_DECLARE.ASSIGN_RESULT_CODE = ASSIGN_RESULT_CODE;
        /** @internal */
        const _code2message = {
            '0': 'operation succeeded.',
            '1': 'operation aborted.',
            '2': 'operation pending.',
            '3': 'no operation.',
            '-1': 'operation failed.',
            '-2': 'unexpected error occured.',
            '-3': 'operation not supported.',
        };
        /**
         * @en Access to error message map.
         * @ja エラーメッセージマップの取得
         */
        function ERROR_MESSAGE_MAP() {
            return _code2message;
        }
        CDP_DECLARE.ERROR_MESSAGE_MAP = ERROR_MESSAGE_MAP;
        /**
         * @en Generate success code.
         * @ja 成功コードを生成
         *
         * @param base
         *  - `en` set base offset as [[RESULT_CODE_BASE]]
         *  - `ja` オフセット値を [[RESULT_CODE_BASE]] として指定
         * @param code
         *  - `en` set local code for declaration. ex) '1'
         *  - `ja` 宣言用のローカルコード値を指定  例) '1'
         * @param message
         *  - `en` set error message for help string.
         *  - `ja` ヘルプストリング用エラーメッセージを指定
         */
        function DECLARE_SUCCESS_CODE(base, code, message) {
            return declareResultCode(base, code, message, true);
        }
        CDP_DECLARE.DECLARE_SUCCESS_CODE = DECLARE_SUCCESS_CODE;
        /**
         * @en Generate error code.
         * @ja エラーコード生成
         *
         * @param base
         *  - `en` set base offset as [[RESULT_CODE_BASE]]
         *  - `ja` オフセット値を [[RESULT_CODE_BASE]] として指定
         * @param code
         *  - `en` set local code for declaration. ex) '1'
         *  - `ja` 宣言用のローカルコード値を指定  例) '1'
         * @param message
         *  - `en` set error message for help string.
         *  - `ja` ヘルプストリング用エラーメッセージを指定
         */
        function DECLARE_ERROR_CODE(base, code, message) {
            return declareResultCode(base, code, message, false);
        }
        CDP_DECLARE.DECLARE_ERROR_CODE = DECLARE_ERROR_CODE;
        ///////////////////////////////////////////////////////////////////////
        // private section:
        /** @internal register for [[RESULT_CODE]] */
        function declareResultCode(base, code, message, succeeded) {
            if (code < 0 || 1000 /* RESULT_CODE_RANGE.MAX */ <= code) {
                throw new RangeError(`declareResultCode(), invalid local-code range. [code: ${code}]`);
            }
            const signed = succeeded ? 1 : -1;
            const resultCode = signed * (base + code);
            _code2message[resultCode] = message ? message : (`[CODE: ${resultCode}]`);
            return resultCode;
        }
    })();

    var RESULT_CODE = CDP_DECLARE.RESULT_CODE;
    var DECLARE_SUCCESS_CODE = CDP_DECLARE.DECLARE_SUCCESS_CODE;
    var DECLARE_ERROR_CODE = CDP_DECLARE.DECLARE_ERROR_CODE;
    var ASSIGN_RESULT_CODE = CDP_DECLARE.ASSIGN_RESULT_CODE;
    var ERROR_MESSAGE_MAP = CDP_DECLARE.ERROR_MESSAGE_MAP;
    /**
     * @en Judge fail or not.
     * @ja 失敗判定
     *
     * @param code [[RESULT_CODE]]
     * @returns true: fail result / false: success result
     */
    function FAILED(code) {
        return code < 0;
    }
    /**
     * @en Judge success or not.
     * @ja 成功判定
     *
     * @param code [[RESULT_CODE]]
     * @returns true: success result / false: fail result
     */
    function SUCCEEDED(code) {
        return !FAILED(code);
    }
    /**
     * @en Convert to [[RESULT_CODE]] `name` string from [[RESULT_CODE]].
     * @ja [[RESULT_CODE]] を [[RESULT_CODE]] 文字列に変換
     *
     * @param code [[RESULT_CODE]]
     * @param tag  custom tag if needed.
     * @returns name string ex) "[tag][NOT_SUPPORTED]"
     */
    function toNameString(code, tag) {
        const prefix = tag ? `[${tag}]` : '';
        if (RESULT_CODE[code]) {
            return `${prefix}[${RESULT_CODE[code]}]`;
        }
        else {
            return `${prefix}[${"UNKNOWN" /* Description.UNKNOWN_ERROR_NAME */}]`;
        }
    }
    /**
     * @en Convert to help string from [[RESULT_CODE]].
     * @ja [[RESULT_CODE]] をヘルプストリングに変換
     *
     * @param code [[RESULT_CODE]]
     * @returns registered help string
     */
    function toHelpString(code) {
        const map = ERROR_MESSAGE_MAP();
        if (map[code]) {
            return map[code];
        }
        else {
            return `unregistered result code. [code: ${code}]`;
        }
    }

    const { 
    /** @internal */ isFinite: isNumber } = Number;
    /** @internal */
    const desc = (value) => {
        return {
            configurable: false,
            writable: false,
            enumerable: true,
            value,
        };
    };
    /**
     * @en A result holder class. <br>
     *     Derived native `Error` class.
     * @ja 処理結果伝達クラス <br>
     *     ネイティブ `Error` の派生クラス
     */
    class Result extends Error {
        /**
         * constructor
         *
         * @param code
         *  - `en` result code
         *  - `ja` 結果コード
         * @param message
         *  - `en` result info message
         *  - `ja` 結果情報メッセージ
         * @param cause
         *  - `en` low-level error information
         *  - `ja` 下位のエラー情報
         */
        constructor(code, message, cause) {
            code = isNil(code) ? RESULT_CODE.SUCCESS : isNumber(code) ? Math.trunc(code) : RESULT_CODE.FAIL;
            super(message || toHelpString(code));
            let time = isError(cause) ? cause.time : undefined;
            isNumber(time) || (time = Date.now());
            Object.defineProperties(this, { code: desc(code), cause: desc(cause), time: desc(time) });
        }
        /**
         * @en Judge succeeded or not.
         * @ja 成功判定
         */
        get isSucceeded() {
            return SUCCEEDED(this.code);
        }
        /**
         * @en Judge failed or not.
         * @ja 失敗判定
         */
        get isFailed() {
            return FAILED(this.code);
        }
        /**
         * @en Judge canceled or not.
         * @ja キャンセルエラー判定
         */
        get isCanceled() {
            return this.code === RESULT_CODE.ABORT;
        }
        /**
         * @en Get formatted [[RESULT_CODE]] name string.
         * @ja フォーマットされた [[RESULT_CODE]] 名文字列を取得
         */
        get codeName() {
            return toNameString(this.code, this.name);
        }
        /**
         * @en Get [[RESULT_CODE]] help string.
         * @ja [[RESULT_CODE]] のヘルプストリングを取得
         */
        get help() {
            return toHelpString(this.code);
        }
        /** @internal */
        get [Symbol.toStringTag]() {
            return "Result" /* Tag.RESULT */;
        }
    }
    Result.prototype.name = "Result" /* Tag.RESULT */;
    /** @interna lReturns `true` if `x` is `Error`, `false` otherwise. */
    function isError(x) {
        return x instanceof Error || className(x) === "Error" /* Tag.ERROR */;
    }
    /** Returns `true` if `x` is `Result`, `false` otherwise. */
    function isResult(x) {
        return x instanceof Result || className(x) === "Result" /* Tag.RESULT */;
    }
    /**
     * @en Convert to [[Result]] object.
     * @ja [[Result]] オブジェクトに変換
     */
    function toResult(o) {
        if (o instanceof Result) {
            /* eslint-disable-next-line prefer-const */
            let { code, cause, time } = o;
            code = isNil(code) ? RESULT_CODE.SUCCESS : isNumber(code) ? Math.trunc(code) : RESULT_CODE.FAIL;
            isNumber(time) || (time = Date.now());
            // Do nothing if already defined
            Reflect.defineProperty(o, 'code', desc(code));
            Reflect.defineProperty(o, 'cause', desc(cause));
            Reflect.defineProperty(o, 'time', desc(time));
            return o;
        }
        else {
            const e = Object(o);
            const message = isString(e.message) ? e.message : isString(o) ? o : undefined;
            const code = isChancelLikeError(message) ? RESULT_CODE.ABORT : isNumber(e.code) ? e.code : o;
            const cause = isError(e.cause) ? e.cause : isError(o) ? o : isString(o) ? new Error(o) : o;
            return new Result(code, message, cause);
        }
    }
    /**
     * @en Create [[Result]] helper.
     * @ja [[Result]] オブジェクト構築ヘルパー
     *
     * @param code
     *  - `en` result code
     *  - `ja` 結果コード
     * @param message
     *  - `en` result info message
     *  - `ja` 結果情報メッセージ
     * @param cause
     *  - `en` low-level error information
     *  - `ja` 下位のエラー情報
     */
    function makeResult(code, message, cause) {
        return new Result(code, message, cause);
    }
    /**
     * @en Create canceled [[Result]] helper.
     * @ja キャンセル情報格納 [[Result]] オブジェクト構築ヘルパー
     *
     * @param message
     *  - `en` result info message
     *  - `ja` 結果情報メッセージ
     * @param cause
     *  - `en` low-level error information
     *  - `ja` 下位のエラー情報
     */
    function makeCanceledResult(message, cause) {
        return new Result(RESULT_CODE.ABORT, message, cause);
    }

    /*!
     * @cdp/core-storage 0.9.12
     *   core storage utility module
     */

    //__________________________________________________________________________________________________//
    /**
     * @en Memory storage class. This class doesn't support permaneciation data.
     * @ja メモリーストレージクラス. 本クラスはデータの永続化をサポートしない
     */
    class MemoryStorage {
        constructor() {
            /** @internal */
            this._broker = new EventBroker();
            /** @internal */
            this._storage = {};
        }
        ///////////////////////////////////////////////////////////////////////
        // implements: IStorage
        /**
         * @en [[IStorage]] kind signature.
         * @ja [[IStorage]] の種別を表す識別子
         */
        get kind() {
            return 'memory';
        }
        async getItem(key, options) {
            options = options || {};
            await checkCanceled(options.cancel);
            // `undefined` → `null`
            const value = dropUndefined(this._storage[key]);
            switch (options.dataType) {
                case 'string':
                    return fromTypedData(value);
                case 'number':
                    return Number(restoreNil(value));
                case 'boolean':
                    return Boolean(restoreNil(value));
                case 'object':
                    return Object(restoreNil(value));
                default:
                    return restoreNil(value);
            }
        }
        /**
         * @en Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
         * @ja キーを指定して値を設定. 存在しない場合は新規に作成
         *
         * @param key
         *  - `en` access key
         *  - `ja` アクセスキー
         * @param options
         *  - `en` I/O options
         *  - `ja` I/O オプション
         */
        async setItem(key, value, options) {
            options = options || {};
            await checkCanceled(options.cancel);
            const newVal = dropUndefined(value, true); // `null` or `undefined` → 'null' or 'undefined'
            const oldVal = dropUndefined(this._storage[key]); // `undefined` → `null`
            if (!deepEqual(oldVal, newVal)) {
                this._storage[key] = newVal;
                !options.silent && this._broker.trigger('@', key, newVal, oldVal);
            }
        }
        /**
         * @en Removes the key/value pair with the given key from the list associated with the object, if a key/value pair with the given key exists.
         * @ja 指定されたキーに対応する値が存在すれば削除
         *
         * @param options
         *  - `en` storage options
         *  - `ja` ストレージオプション
         */
        async removeItem(key, options) {
            options = options || {};
            await checkCanceled(options.cancel);
            const oldVal = this._storage[key];
            if (undefined !== oldVal) {
                delete this._storage[key];
                !options.silent && this._broker.trigger('@', key, null, oldVal);
            }
        }
        /**
         * @en Empties the list associated with the object of all key/value pairs, if there are any.
         * @ja すべてのキーに対応する値を削除
         *
         * @param options
         *  - `en` storage options
         *  - `ja` ストレージオプション
         */
        async clear(options) {
            options = options || {};
            await checkCanceled(options.cancel);
            if (!isEmptyObject(this._storage)) {
                this._storage = {};
                !options.silent && this._broker.trigger('@', null, null, null);
            }
        }
        /**
         * @en Returns all entry keys.
         * @ja すべてのキー一覧を返却
         *
         * @param options
         *  - `en` cancel options
         *  - `ja` キャンセルオプション
         */
        async keys(options) {
            await checkCanceled(options && options.cancel);
            return Object.keys(this._storage);
        }
        /**
         * @en Subscrive event(s).
         * @ja イベント購読設定
         *
         * @param listener
         *  - `en` callback function.
         *  - `ja` コールバック関数
         */
        on(listener) {
            return this._broker.on('@', listener);
        }
        /**
         * @en Unsubscribe event(s).
         * @ja イベント購読解除
         *
         * @param listener
         *  - `en` callback function.
         *         When not set this parameter, listeners are released.
         *  - `ja` コールバック関数
         *         指定しない場合はすべてを解除
         */
        off(listener) {
            this._broker.off('@', listener);
        }
        ///////////////////////////////////////////////////////////////////////
        // operations:
        /**
         * @en Return a storage-store object.
         * @ja ストレージストアオブジェクトを返却
         */
        get context() {
            return this._storage;
        }
    }
    // default storage
    const memoryStorage = new MemoryStorage();

    /* eslint-disable
        @typescript-eslint/no-explicit-any,
     */
    /**
     * @en Registry management class for synchronous Read/Write accessible from any [[IStorage]] object.
     * @ja 任意の [[IStorage]] オブジェクトから同期 Read/Write アクセス可能なレジストリ管理クラス
     *
     * @example <br>
     *
     * ```ts
     * // 1. define registry schema
     * interface Schema extends RegistrySchemaBase {
     *    'common/mode': 'normal' | 'specified';
     *    'common/value': number;
     *    'trade/local': { unit: '円' | '$'; rate: number; };
     *    'trade/check': boolean;
     *    'extra/user': string;
     * }
     *
     * // 2. prepare IStorage instance
     * // ex
     * import { webStorage } from '@cdp/web-storage';
     *
     * // 3. instantiate this class
     * const reg = new Registry<Schema>(webStorage, '@test');
     *
     * // 4. read example
     * const val = reg.read('common/mode'); // 'normal' | 'specified' | null
     *
     * // 5. write example
     * reg.write('common/mode', 'specified');
     * // reg.write('common/mode', 'hoge'); // compile error
     * ```
     */
    class Registry extends EventPublisher {
        /**
         * constructor
         *
         * @param storage
         *  - `en` Root key for [[IStorage]].
         *  - `ja` [[IStorage]] に使用するルートキー
         * @param rootKey
         *  - `en` Root key for [[IStorage]].
         *  - `ja` [[IStorage]] に使用するルートキー
         * @param formatSpace
         *  - `en` for JSON format space.
         *  - `ja` JSON フォーマットスペースを指定
         */
        constructor(storage, rootKey, formatSpace) {
            super();
            /** @internal */
            this._store = {};
            this._storage = storage;
            this._rootKey = rootKey;
            this._defaultOptions = { jsonSpace: formatSpace };
        }
        /**
         * @en Access to root key.
         * @ja ルートキーを取得
         */
        get rootKey() {
            return this._rootKey;
        }
        /**
         * @en Access to [[IStorage]] object.
         * @ja [[IStorage]] オブジェクトを取得
         */
        get storage() {
            return this._storage;
        }
        ///////////////////////////////////////////////////////////////////////
        // public methods:
        /**
         * @en Read persistence data from [[IStorage]]. The data loaded already will be cleared.
         * @ja [[IStorage]] から永続化したデータを読み込み. すでにキャッシュされているデータは破棄される
         */
        async load(options) {
            options = options || {};
            this._store = (await this._storage.getItem(this._rootKey, options)) || {};
            if (!options.silent) {
                void post(() => this.publish('change', '*'));
            }
        }
        /**
         * @en Persist data to [[IStorage]].
         * @ja [[IStorage]] にデータを永続化
         */
        async save(options) {
            const opts = { ...this._defaultOptions, ...options };
            if (!opts.silent) {
                this.publish('will-save');
            }
            await this._storage.setItem(this._rootKey, this._store, opts);
        }
        /**
         * @en Read registry value.
         * @ja レジストリ値の読み取り
         *
         * @param key
         *  - `en` target registry key.
         *  - `ja` 対象のレジストリキーを指定
         * @param options
         *  - `en` read options.
         *  - `ja` 読み取りオプションを指定
         */
        read(key, options) {
            const { field } = options || {};
            const structure = String(key).split('/');
            const lastKey = structure.pop();
            let name;
            let reg = this.targetRoot(field);
            while (name = structure.shift()) { // eslint-disable-line no-cond-assign
                if (!(name in reg)) {
                    return null;
                }
                reg = reg[name];
            }
            // return deep copy
            return (null != reg[lastKey]) ? deepCopy(reg[lastKey]) : null;
        }
        /**
         * @en Write registry value.
         * @ja レジストリ値の書き込み
         *
         * @param key
         *  - `en` target registry key.
         *  - `ja` 対象のレジストリキーを指定
         * @param value
         *  - `en` update value. if `null` set to delete.
         *  - `ja` 更新する値. `null` は削除
         * @param options
         *  - `en` write options.
         *  - `ja` 書き込みオプションを指定
         */
        write(key, value, options) {
            const { field, noSave, silent } = options || {};
            const remove = (null == value);
            const structure = String(key).split('/');
            const lastKey = structure.pop();
            let name;
            let reg = this.targetRoot(field);
            while (name = structure.shift()) { // eslint-disable-line no-cond-assign
                if (name in reg) {
                    reg = reg[name];
                }
                else if (remove) {
                    return; // すでに親キーがないため何もしない
                }
                else {
                    reg = reg[name] = {};
                }
            }
            const newVal = remove ? null : value;
            const oldVal = dropUndefined(reg[lastKey]);
            if (deepEqual(oldVal, newVal)) {
                return; // 更新なし
            }
            else if (remove) {
                delete reg[lastKey];
            }
            else {
                reg[lastKey] = deepCopy(newVal);
            }
            if (!noSave) {
                // no fire notification
                void this._storage.setItem(this._rootKey, this._store, { ...this._defaultOptions, ...options });
            }
            if (!silent) {
                void post(() => this.publish('change', key, newVal, oldVal));
            }
        }
        /**
         * @en Delete registry key.
         * @ja レジストリキーの削除
         *
         * @param key
         *  - `en` target registry key.
         *  - `ja` 対象のレジストリキーを指定
         * @param options
         *  - `en` read options.
         *  - `ja` 書き込みオプションを指定
         */
        delete(key, options) {
            this.write(key, null, options);
        }
        /**
         * @en Clear all registry.
         * @ja レジストリの全削除
         *
         * @param options
         *  - `en` read options.
         *  - `ja` 書き込みオプションを指定
         */
        clear(options) {
            options = options || {};
            this._store = {};
            void this._storage.removeItem(this._rootKey, options);
            if (!options.silent) {
                this.publish('change', null, null, null);
            }
        }
        ///////////////////////////////////////////////////////////////////////
        // private methods:
        /** @internal get root object */
        targetRoot(field) {
            if (field) {
                // ensure [field] object.
                this._store[field] = this._store[field] || {};
                return this._store[field];
            }
            else {
                return this._store;
            }
        }
    }

    /*!
     * @cdp/core-template 0.9.12
     *   template engine
     */

    /** @internal */
    const globalSettings = {
        tags: ['{{', '}}'],
        escape: escapeHTML,
    };

    /**
     * @en Build cache key.
     * @ja キャッシュキーの生成
     *
     * @internal
     */
    function buildCacheKey(template, tags) {
        return `${template}:${tags.join(':')}`;
    }
    /**
     * @en Clears all cached templates in cache pool.
     * @ja すべてのテンプレートキャッシュを破棄
     *
     * @internal
     */
    function clearCache() {
        const namespace = getGlobalNamespace("CDP_DECLARE" /* CacheLocation.NAMESPACE */);
        namespace["TEMPLATE_CACHE" /* CacheLocation.ROOT */] = {};
    }
    /** @internal global cache pool */
    const cache = ensureObject(null, "CDP_DECLARE" /* CacheLocation.NAMESPACE */, "TEMPLATE_CACHE" /* CacheLocation.ROOT */);

    /**
     * More correct typeof string handling array
     * which normally returns typeof 'object'
     */
    function typeString(src) {
        return isArray(src) ? 'array' : typeof src;
    }
    /**
     * Escape for template's expression charactors.
     */
    function escapeTemplateExp(src) {
        // eslint-disable-next-line
        return src.replace(/[-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
    }
    /**
     * Safe way of detecting whether or not the given thing is a primitive and
     * whether it has the given property
     */
    function primitiveHasOwnProperty(src, propName) {
        return isPrimitive(src) && Object.prototype.hasOwnProperty.call(src, propName);
    }
    /**
     * Check whitespace charactor exists.
     */
    function isWhitespace(src) {
        return !/\S/.test(src);
    }

    /**
     * A simple string scanner that is used by the template parser to find
     * tokens in template strings.
     */
    class Scanner {
        /**
         * constructor
         */
        constructor(src) {
            this._source = this._tail = src;
            this._pos = 0;
        }
        ///////////////////////////////////////////////////////////////////////
        // public methods:
        /**
         * Returns current scanning position.
         */
        get pos() {
            return this._pos;
        }
        /**
         * Returns string  source.
         */
        get source() {
            return this._source;
        }
        /**
         * Returns `true` if the tail is empty (end of string).
         */
        get eos() {
            return '' === this._tail;
        }
        /**
         * Tries to match the given regular expression at the current position.
         * Returns the matched text if it can match, the empty string otherwise.
         */
        scan(regexp) {
            const match = regexp.exec(this._tail);
            if (!match || 0 !== match.index) {
                return '';
            }
            const string = match[0];
            this._tail = this._tail.substring(string.length);
            this._pos += string.length;
            return string;
        }
        /**
         * Skips all text until the given regular expression can be matched. Returns
         * the skipped string, which is the entire tail if no match can be made.
         */
        scanUntil(regexp) {
            const index = this._tail.search(regexp);
            let match;
            switch (index) {
                case -1:
                    match = this._tail;
                    this._tail = '';
                    break;
                case 0:
                    match = '';
                    break;
                default:
                    match = this._tail.substring(0, index);
                    this._tail = this._tail.substring(index);
            }
            this._pos += match.length;
            return match;
        }
    }

    /**
     * Represents a rendering context by wrapping a view object and
     * maintaining a reference to the parent context.
     */
    class Context {
        /** constructor */
        constructor(view, parentContext) {
            this._view = view;
            this._cache = { '.': this._view };
            this._parent = parentContext;
        }
        ///////////////////////////////////////////////////////////////////////
        // public methods:
        /**
         * View parameter getter.
         */
        get view() {
            return this._view;
        }
        /**
         * Creates a new context using the given view with this context
         * as the parent.
         */
        push(view) {
            return new Context(view, this);
        }
        /**
         * Returns the value of the given name in this context, traversing
         * up the context hierarchy if the value is absent in this context's view.
         */
        lookup(name) {
            const cache = this._cache;
            let value;
            if (Object.prototype.hasOwnProperty.call(cache, name)) {
                value = cache[name];
            }
            else {
                let context = this; // eslint-disable-line @typescript-eslint/no-this-alias
                let intermediateValue;
                let names;
                let index;
                let lookupHit = false;
                while (context) {
                    if (0 < name.indexOf('.')) {
                        intermediateValue = context._view;
                        names = name.split('.');
                        index = 0;
                        /**
                         * Using the dot notion path in `name`, we descend through the
                         * nested objects.
                         *
                         * To be certain that the lookup has been successful, we have to
                         * check if the last object in the path actually has the property
                         * we are looking for. We store the result in `lookupHit`.
                         *
                         * This is specially necessary for when the value has been set to
                         * `undefined` and we want to avoid looking up parent contexts.
                         *
                         * In the case where dot notation is used, we consider the lookup
                         * to be successful even if the last "object" in the path is
                         * not actually an object but a primitive (e.g., a string, or an
                         * integer), because it is sometimes useful to access a property
                         * of an autoboxed primitive, such as the length of a string.
                         **/
                        while (null != intermediateValue && index < names.length) {
                            if (index === names.length - 1) {
                                lookupHit = (has(intermediateValue, names[index]) ||
                                    primitiveHasOwnProperty(intermediateValue, names[index]));
                            }
                            intermediateValue = intermediateValue[names[index++]];
                        }
                    }
                    else {
                        intermediateValue = context._view[name];
                        /**
                         * Only checking against `hasProperty`, which always returns `false` if
                         * `context.view` is not an object. Deliberately omitting the check
                         * against `primitiveHasOwnProperty` if dot notation is not used.
                         *
                         * Consider this example:
                         * ```
                         * Mustache.render("The length of a football field is {{#length}}{{length}}{{/length}}.", {length: "100 yards"})
                         * ```
                         *
                         * If we were to check also against `primitiveHasOwnProperty`, as we do
                         * in the dot notation case, then render call would return:
                         *
                         * "The length of a football field is 9."
                         *
                         * rather than the expected:
                         *
                         * "The length of a football field is 100 yards."
                         **/
                        lookupHit = has(context._view, name);
                    }
                    if (lookupHit) {
                        value = intermediateValue;
                        break;
                    }
                    context = context._parent;
                }
                cache[name] = value;
            }
            if (isFunction(value)) {
                value = value.call(this._view);
            }
            return value;
        }
    }

    /** @internal */
    const _regexp = {
        white: /\s*/,
        space: /\s+/,
        equals: /\s*=/,
        curly: /\s*\}/,
        tag: /#|\^|\/|>|\{|&|=|!/,
    };
    /**
     * @internal
     * Combines the values of consecutive text tokens in the given `tokens` array to a single token.
     */
    function squashTokens(tokens) {
        const squashedTokens = [];
        let lastToken;
        for (const token of tokens) {
            if (token) {
                if ('text' === token[0 /* $.TYPE */] && lastToken && 'text' === lastToken[0 /* $.TYPE */]) {
                    lastToken[1 /* $.VALUE */] += token[1 /* $.VALUE */];
                    lastToken[3 /* $.END */] = token[3 /* $.END */];
                }
                else {
                    squashedTokens.push(token);
                    lastToken = token;
                }
            }
        }
        return squashedTokens;
    }
    /**
     * @internal
     * Forms the given array of `tokens` into a nested tree structure where
     * tokens that represent a section have two additional items: 1) an array of
     * all tokens that appear in that section and 2) the index in the original
     * template that represents the end of that section.
     */
    function nestTokens(tokens) {
        const nestedTokens = [];
        let collector = nestedTokens;
        const sections = [];
        let section;
        for (const token of tokens) {
            switch (token[0 /* $.TYPE */]) {
                case '#':
                case '^':
                    collector.push(token);
                    sections.push(token);
                    collector = token[4 /* $.TOKEN_LIST */] = [];
                    break;
                case '/':
                    section = sections.pop();
                    section[5 /* $.TAG_INDEX */] = token[2 /* $.START */];
                    collector = sections.length > 0 ? sections[sections.length - 1][4 /* $.TOKEN_LIST */] : nestedTokens;
                    break;
                default:
                    collector.push(token);
                    break;
            }
        }
        return nestedTokens;
    }
    /**
     * Breaks up the given `template` string into a tree of tokens. If the `tags`
     * argument is given here it must be an array with two string values: the
     * opening and closing tags used in the template (e.g. [ "<%", "%>" ]). Of
     * course, the default is to use mustaches (i.e. mustache.tags).
     *
     * A token is an array with at least 4 elements. The first element is the
     * mustache symbol that was used inside the tag, e.g. "#" or "&". If the tag
     * did not contain a symbol (i.e. {{myValue}}) this element is "name". For
     * all text that appears outside a symbol this element is "text".
     *
     * The second element of a token is its "value". For mustache tags this is
     * whatever else was inside the tag besides the opening symbol. For text tokens
     * this is the text itself.
     *
     * The third and fourth elements of the token are the start and end indices,
     * respectively, of the token in the original template.
     *
     * Tokens that are the root node of a subtree contain two more elements: 1) an
     * array of tokens in the subtree and 2) the index in the original template at
     * which the closing tag for that section begins.
     *
     * Tokens for partials also contain two more elements: 1) a string value of
     * indendation prior to that tag and 2) the index of that tag on that line -
     * eg a value of 2 indicates the partial is the third tag on this line.
     *
     * @param template template string
     * @param tags delimiters ex) ['{{','}}'] or '{{ }}'
     */
    function parseTemplate(template, tags) {
        if (!template) {
            return [];
        }
        let lineHasNonSpace = false;
        const sections = []; // Stack to hold section tokens
        const tokens = []; // Buffer to hold the tokens
        const spaces = []; // Indices of whitespace tokens on the current line
        let hasTag = false; // Is there a {{tag}} on the current line?
        let nonSpace = false; // Is there a non-space char on the current line?
        let indentation = ''; // Tracks indentation for tags that use it
        let tagIndex = 0; // Stores a count of number of tags encountered on a line
        // Strips all whitespace tokens array for the current line
        // if there was a {{#tag}} on it and otherwise only space.
        const stripSpace = () => {
            if (hasTag && !nonSpace) {
                while (spaces.length) {
                    delete tokens[spaces.pop()];
                }
            }
            else {
                spaces.length = 0;
            }
            hasTag = false;
            nonSpace = false;
        };
        const compileTags = (tagsToCompile) => {
            if (isString(tagsToCompile)) {
                tagsToCompile = tagsToCompile.split(_regexp.space, 2);
            }
            if (!isArray(tagsToCompile) || 2 !== tagsToCompile.length) {
                throw new Error(`Invalid tags: ${JSON.stringify(tagsToCompile)}`);
            }
            return {
                openingTag: new RegExp(`${escapeTemplateExp(tagsToCompile[0 /* Tag.OPEN */])}\\s*`),
                closingTag: new RegExp(`\\s*${escapeTemplateExp(tagsToCompile[1 /* Tag.CLOSE */])}`),
                closingCurly: new RegExp(`\\s*${escapeTemplateExp(`}${tagsToCompile[1 /* Tag.CLOSE */]}`)}`),
            };
        };
        const { tag: reTag, white: reWhite, equals: reEquals, curly: reCurly } = _regexp;
        let _regxpTags = compileTags(tags || globalSettings.tags);
        const scanner = new Scanner(template);
        let openSection;
        while (!scanner.eos) {
            const { openingTag: reOpeningTag, closingTag: reClosingTag, closingCurly: reClosingCurly } = _regxpTags;
            let token;
            let start = scanner.pos;
            // Match any text between tags.
            let value = scanner.scanUntil(reOpeningTag);
            if (value) {
                for (let i = 0, valueLength = value.length; i < valueLength; ++i) {
                    const chr = value.charAt(i);
                    if (isWhitespace(chr)) {
                        spaces.push(tokens.length);
                        indentation += chr;
                    }
                    else {
                        nonSpace = true;
                        lineHasNonSpace = true;
                        indentation += ' ';
                    }
                    tokens.push(['text', chr, start, start + 1]);
                    start += 1;
                    // Check for whitespace on the current line.
                    if ('\n' === chr) {
                        stripSpace();
                        indentation = '';
                        tagIndex = 0;
                        lineHasNonSpace = false;
                    }
                }
            }
            // Match the opening tag.
            if (!scanner.scan(reOpeningTag)) {
                break;
            }
            hasTag = true;
            // Get the tag type.
            let type = scanner.scan(reTag) || 'name';
            scanner.scan(reWhite);
            // Get the tag value.
            if ('=' === type) {
                value = scanner.scanUntil(reEquals);
                scanner.scan(reEquals);
                scanner.scanUntil(reClosingTag);
            }
            else if ('{' === type) {
                value = scanner.scanUntil(reClosingCurly);
                scanner.scan(reCurly);
                scanner.scanUntil(reClosingTag);
                type = '&';
            }
            else {
                value = scanner.scanUntil(reClosingTag);
            }
            // Match the closing tag.
            if (!scanner.scan(reClosingTag)) {
                throw new Error(`Unclosed tag at ${scanner.pos}`);
            }
            if ('>' === type) {
                token = [type, value, start, scanner.pos, indentation, tagIndex, lineHasNonSpace];
            }
            else {
                token = [type, value, start, scanner.pos];
            }
            tagIndex++;
            tokens.push(token);
            if ('#' === type || '^' === type) {
                sections.push(token);
            }
            else if ('/' === type) {
                // Check section nesting.
                openSection = sections.pop();
                if (!openSection) {
                    throw new Error(`Unopened section "${value}" at ${start}`);
                }
                if (openSection[1] !== value) {
                    throw new Error(`Unclosed section "${openSection[1 /* $.VALUE */]}" at ${start}`);
                }
            }
            else if ('name' === type || '{' === type || '&' === type) {
                nonSpace = true;
            }
            else if ('=' === type) {
                // Set the tags for the next time around.
                _regxpTags = compileTags(value);
            }
        }
        stripSpace();
        // Make sure there are no open sections when we're done.
        openSection = sections.pop();
        if (openSection) {
            throw new Error(`Unclosed section "${openSection[1 /* $.VALUE */]}" at ${scanner.pos}`);
        }
        return nestTokens(squashTokens(tokens));
    }

    /**
     * A Writer knows how to take a stream of tokens and render them to a
     * string, given a context. It also maintains a cache of templates to
     * avoid the need to parse the same template twice.
     */
    class Writer {
        ///////////////////////////////////////////////////////////////////////
        // public methods:
        /**
         * Parses and caches the given `template` according to the given `tags` or
         * `mustache.tags` if `tags` is omitted,  and returns the array of tokens
         * that is generated from the parse.
         */
        parse(template, tags) {
            const cacheKey = buildCacheKey(template, tags || globalSettings.tags);
            let tokens = cache[cacheKey];
            if (null == tokens) {
                tokens = cache[cacheKey] = parseTemplate(template, tags);
            }
            return { tokens, cacheKey };
        }
        /**
         * High-level method that is used to render the given `template` with
         * the given `view`.
         *
         * The optional `partials` argument may be an object that contains the
         * names and templates of partials that are used in the template. It may
         * also be a function that is used to load partial templates on the fly
         * that takes a single argument: the name of the partial.
         *
         * If the optional `tags` argument is given here it must be an array with two
         * string values: the opening and closing tags used in the template (e.g.
         * [ "<%", "%>" ]). The default is to mustache.tags.
         */
        render(template, view, partials, tags) {
            const { tokens } = this.parse(template, tags);
            return this.renderTokens(tokens, view, partials, template, tags);
        }
        /**
         * Low-level method that renders the given array of `tokens` using
         * the given `context` and `partials`.
         *
         * Note: The `originalTemplate` is only ever used to extract the portion
         * of the original template that was contained in a higher-order section.
         * If the template doesn't use higher-order sections, this argument may
         * be omitted.
         */
        renderTokens(tokens, view, partials, originalTemplate, tags) {
            const context = (view instanceof Context) ? view : new Context(view);
            let buffer = '';
            for (const token of tokens) {
                let value;
                switch (token[0 /* $.TYPE */]) {
                    case '#':
                        value = this.renderSection(token, context, partials, originalTemplate);
                        break;
                    case '^':
                        value = this.renderInverted(token, context, partials, originalTemplate);
                        break;
                    case '>':
                        value = this.renderPartial(token, context, partials, tags);
                        break;
                    case '&':
                        value = this.unescapedValue(token, context);
                        break;
                    case 'name':
                        value = this.escapedValue(token, context);
                        break;
                    case 'text':
                        value = this.rawValue(token);
                        break;
                }
                if (null != value) {
                    buffer += value;
                }
            }
            return buffer;
        }
        ///////////////////////////////////////////////////////////////////////
        // private methods:
        /** @internal */
        renderSection(token, context, partials, originalTemplate) {
            const self = this;
            let buffer = '';
            let value = context.lookup(token[1 /* $.VALUE */]);
            // This function is used to render an arbitrary template
            // in the current context by higher-order sections.
            const subRender = (template) => {
                return self.render(template, context, partials);
            };
            if (!value) {
                return;
            }
            if (isArray(value)) {
                for (const v of value) {
                    buffer += this.renderTokens(token[4 /* $.TOKEN_LIST */], context.push(v), partials, originalTemplate);
                }
            }
            else if ('object' === typeof value || 'string' === typeof value || 'number' === typeof value) {
                buffer += this.renderTokens(token[4 /* $.TOKEN_LIST */], context.push(value), partials, originalTemplate);
            }
            else if (isFunction(value)) {
                if ('string' !== typeof originalTemplate) {
                    throw new Error('Cannot use higher-order sections without the original template');
                }
                // Extract the portion of the original template that the section contains.
                value = value.call(context.view, originalTemplate.slice(token[3 /* $.END */], token[5 /* $.TAG_INDEX */]), subRender);
                if (null != value) {
                    buffer += value;
                }
            }
            else {
                buffer += this.renderTokens(token[4 /* $.TOKEN_LIST */], context, partials, originalTemplate);
            }
            return buffer;
        }
        /** @internal */
        renderInverted(token, context, partials, originalTemplate) {
            const value = context.lookup(token[1 /* $.VALUE */]);
            if (!value || (isArray(value) && 0 === value.length)) {
                return this.renderTokens(token[4 /* $.TOKEN_LIST */], context, partials, originalTemplate);
            }
        }
        /** @internal */
        indentPartial(partial, indentation, lineHasNonSpace) {
            const filteredIndentation = indentation.replace(/[^ \t]/g, '');
            const partialByNl = partial.split('\n');
            for (let i = 0; i < partialByNl.length; i++) {
                if (partialByNl[i].length && (i > 0 || !lineHasNonSpace)) {
                    partialByNl[i] = filteredIndentation + partialByNl[i];
                }
            }
            return partialByNl.join('\n');
        }
        /** @internal */
        renderPartial(token, context, partials, tags) {
            if (!partials) {
                return;
            }
            const value = (isFunction(partials) ? partials(token[1 /* $.VALUE */]) : partials[token[1 /* $.VALUE */]]);
            if (null != value) {
                const lineHasNonSpace = token[6 /* $.HAS_NO_SPACE */];
                const tagIndex = token[5 /* $.TAG_INDEX */];
                const indentation = token[4 /* $.TOKEN_LIST */];
                let indentedValue = value;
                if (0 === tagIndex && indentation) {
                    indentedValue = this.indentPartial(value, indentation, lineHasNonSpace);
                }
                const { tokens } = this.parse(indentedValue, tags);
                return this.renderTokens(tokens, context, partials, indentedValue);
            }
        }
        /** @internal */
        unescapedValue(token, context) {
            const value = context.lookup(token[1 /* $.VALUE */]);
            if (null != value) {
                return value;
            }
        }
        /** @internal */
        escapedValue(token, context) {
            const value = context.lookup(token[1 /* $.VALUE */]);
            if (null != value) {
                return globalSettings.escape(value);
            }
        }
        /** @internal */
        rawValue(token) {
            return token[1 /* $.VALUE */];
        }
    }

    /** [[TemplateEngine]] common settings */
    globalSettings.writer = new Writer();
    /**
     * @en TemplateEngine utility class.
     * @ja TemplateEngine ユーティリティクラス
     */
    class TemplateEngine {
        ///////////////////////////////////////////////////////////////////////
        // public static methods:
        /**
         * @en Get [[JST]] from template source.
         * @ja テンプレート文字列から [[JST]] を取得
         *
         * @param template
         *  - `en` template source string
         *  - `ja` テンプレート文字列
         * @param options
         *  - `en` compile options
         *  - `ja` コンパイルオプション
         */
        static compile(template, options) {
            if (!isString(template)) {
                throw new TypeError(`Invalid template! the first argument should be a "string" but "${typeString(template)}" was given for TemplateEngine.compile(template, options)`);
            }
            const { tags } = options || globalSettings;
            const { writer } = globalSettings;
            const jst = (view, partials) => {
                return writer.render(template, view || {}, partials, tags);
            };
            const { tokens, cacheKey } = writer.parse(template, tags);
            jst.tokens = tokens;
            jst.cacheKey = cacheKey;
            jst.cacheLocation = ["CDP_DECLARE" /* CacheLocation.NAMESPACE */, "TEMPLATE_CACHE" /* CacheLocation.ROOT */];
            return jst;
        }
        /**
         * @en Clears all cached templates in the default [[TemplateWriter]].
         * @ja 既定の [[TemplateWriter]] のすべてのキャッシュを削除
         */
        static clearCache() {
            clearCache();
        }
        /**
         * @en Change [[TemplateEngine]] global settings.
         * @ja [[TemplateEngine]] グローバル設定の更新
         *
         * @param settings
         *  - `en` new settings
         *  - `ja` 新しい設定値
         * @returns
         *  - `en` old settings
         *  - `ja` 古い設定値
         */
        static setGlobalSettings(setiings) {
            const oldSettings = { ...globalSettings };
            const { writer, tags, escape } = setiings;
            writer && (globalSettings.writer = writer);
            tags && (globalSettings.tags = tags);
            escape && (globalSettings.escape = escape);
            return oldSettings;
        }
        ///////////////////////////////////////////////////////////////////////
        // public static methods: for debug
        /** @internal Create [[TemplateScanner]] instance */
        static createScanner(src) {
            return new Scanner(src);
        }
        /** @internal Create [[TemplateContext]] instance */
        static createContext(view, parentContext) {
            return new Context(view, parentContext);
        }
        /** @internal Create [[TemplateWriter]] instance */
        static createWriter() {
            return new Writer();
        }
    }

    exports.$cdp = $cdp;
    exports.ASSIGN_RESULT_CODE = ASSIGN_RESULT_CODE;
    exports.CancelToken = CancelToken;
    exports.CancelablePromise = CancelablePromise;
    exports.DECLARE_ERROR_CODE = DECLARE_ERROR_CODE;
    exports.DECLARE_SUCCESS_CODE = DECLARE_SUCCESS_CODE;
    exports.Deferred = Deferred;
    exports.EventBroker = EventBroker;
    exports.EventPublisher = EventPublisher;
    exports.EventReceiver = EventReceiver;
    exports.EventSource = EventSourceBase;
    exports.FAILED = FAILED;
    exports.MemoryStorage = MemoryStorage;
    exports.ObservableArray = ObservableArray;
    exports.ObservableObject = ObservableObject;
    exports.Promise = CancelablePromise;
    exports.PromiseManager = PromiseManager;
    exports.RESULT_CODE = RESULT_CODE;
    exports.Registry = Registry;
    exports.Result = Result;
    exports.SUCCEEDED = SUCCEEDED;
    exports.TemplateEngine = TemplateEngine;
    exports.at = at;
    exports.camelize = camelize;
    exports.capitalize = capitalize;
    exports.checkCanceled = checkCanceled;
    exports.checkStatus = checkStatus;
    exports.className = className;
    exports.classify = classify;
    exports.clearInterval = clearInterval;
    exports.clearTimeout = clearTimeout;
    exports.combination = combination;
    exports.computeDate = computeDate;
    exports.createEscaper = createEscaper;
    exports.dasherize = dasherize;
    exports.debounce = debounce;
    exports.decapitalize = decapitalize;
    exports.deepCopy = deepCopy;
    exports.deepEqual = deepEqual;
    exports.deepMerge = deepMerge;
    exports.diff = diff;
    exports.difference = difference;
    exports.drop = drop;
    exports.dropUndefined = dropUndefined;
    exports.ensureObject = ensureObject;
    exports.escapeHTML = escapeHTML;
    exports.every = every;
    exports.exists = exists;
    exports.extendPromise = extendPromise;
    exports.filter = filter;
    exports.find = find;
    exports.findIndex = findIndex;
    exports.fromTypedData = fromTypedData;
    exports.getConfig = getConfig;
    exports.getGlobal = getGlobal;
    exports.getGlobalNamespace = getGlobalNamespace;
    exports.groupBy = groupBy;
    exports.has = has;
    exports.indices = indices;
    exports.instanceOf = instanceOf;
    exports.intersection = intersection;
    exports.invert = invert;
    exports.isArray = isArray;
    exports.isBigInt = isBigInt;
    exports.isBoolean = isBoolean;
    exports.isChancelLikeError = isChancelLikeError;
    exports.isEmptyObject = isEmptyObject;
    exports.isFunction = isFunction;
    exports.isIterable = isIterable;
    exports.isNil = isNil;
    exports.isNumber = isNumber$1;
    exports.isNumeric = isNumeric;
    exports.isObject = isObject;
    exports.isObservable = isObservable;
    exports.isPlainObject = isPlainObject;
    exports.isPrimitive = isPrimitive;
    exports.isResult = isResult;
    exports.isString = isString;
    exports.isSymbol = isSymbol;
    exports.isTypedArray = isTypedArray;
    exports.luid = luid;
    exports.makeCanceledResult = makeCanceledResult;
    exports.makeResult = makeResult;
    exports.map = map;
    exports.memoryStorage = memoryStorage;
    exports.mixins = mixins;
    exports.noop = noop;
    exports.omit = omit;
    exports.once = once;
    exports.ownInstanceOf = ownInstanceOf;
    exports.permutation = permutation;
    exports.pick = pick;
    exports.post = post;
    exports.randomInt = randomInt;
    exports.reduce = reduce;
    exports.restoreNil = restoreNil;
    exports.result = result;
    exports.safe = safe;
    exports.sameClass = sameClass;
    exports.sameType = sameType;
    exports.sample = sample;
    exports.setInterval = setInterval;
    exports.setMixClassAttribute = setMixClassAttribute;
    exports.setTimeout = setTimeout;
    exports.shuffle = shuffle;
    exports.sleep = sleep;
    exports.some = some;
    exports.sort = sort;
    exports.throttle = throttle;
    exports.toHelpString = toHelpString;
    exports.toNameString = toNameString;
    exports.toResult = toResult;
    exports.toTypedData = toTypedData;
    exports.typeOf = typeOf;
    exports.underscored = underscored;
    exports.unescapeHTML = unescapeHTML;
    exports.union = union;
    exports.unique = unique;
    exports.verify = verify;
    exports.wait = wait;
    exports.without = without;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliLWNvcmUuanMiLCJzb3VyY2VzIjpbImNvcmUtdXRpbHMvY29uZmlnLnRzIiwiY29yZS11dGlscy90eXBlcy50cyIsImNvcmUtdXRpbHMvdmVyaWZ5LnRzIiwiY29yZS11dGlscy9kZWVwLWNpcmN1aXQudHMiLCJjb3JlLXV0aWxzL21peGlucy50cyIsImNvcmUtdXRpbHMvb2JqZWN0LnRzIiwiY29yZS11dGlscy9zYWZlLnRzIiwiY29yZS11dGlscy90aW1lci50cyIsImNvcmUtdXRpbHMvbWlzYy50cyIsImNvcmUtdXRpbHMvYXJyYXkudHMiLCJjb3JlLXV0aWxzL2RhdGUudHMiLCJldmVudHMvcHVibGlzaGVyLnRzIiwiZXZlbnRzL2Jyb2tlci50cyIsImV2ZW50cy9yZWNlaXZlci50cyIsImV2ZW50cy9zb3VyY2UudHMiLCJwcm9taXNlL2ludGVybmFsLnRzIiwicHJvbWlzZS9jYW5jZWwtdG9rZW4udHMiLCJwcm9taXNlL2NhbmNlbGFibGUtcHJvbWlzZS50cyIsInByb21pc2UvdXRpbHMudHMiLCJwcm9taXNlL2RlZmVycmVkLnRzIiwicHJvbWlzZS9wcm9taXNlLW1hbmFnZXIudHMiLCJvYnNlcnZhYmxlL2ludGVybmFsLnRzIiwib2JzZXJ2YWJsZS9jb21tb24udHMiLCJvYnNlcnZhYmxlL29iamVjdC50cyIsIm9ic2VydmFibGUvYXJyYXkudHMiLCJyZXN1bHQvcmVzdWx0LWNvZGUtZGVmcy50cyIsInJlc3VsdC9yZXN1bHQtY29kZS50cyIsInJlc3VsdC9yZXN1bHQudHMiLCJjb3JlLXN0b3JhZ2UvbWVtb3J5LXN0b3JhZ2UudHMiLCJjb3JlLXN0b3JhZ2UvcmVnaXN0cnkudHMiLCJjb3JlLXRlbXBsYXRlL2ludGVybmFsLnRzIiwiY29yZS10ZW1wbGF0ZS9jYWNoZS50cyIsImNvcmUtdGVtcGxhdGUvdXRpbHMudHMiLCJjb3JlLXRlbXBsYXRlL3NjYW5uZXIudHMiLCJjb3JlLXRlbXBsYXRlL2NvbnRleHQudHMiLCJjb3JlLXRlbXBsYXRlL3BhcnNlLnRzIiwiY29yZS10ZW1wbGF0ZS93cml0ZXIudHMiLCJjb3JlLXRlbXBsYXRlL2NsYXNzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGVuIFNhZmUgYGdsb2JhbGAgYWNjZXNzb3IuXG4gKiBAamEgYGdsb2JhbGAg44Ki44Kv44K744OD44K1XG4gKiBcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIGBnbG9iYWxgIG9iamVjdCBvZiB0aGUgcnVudGltZSBlbnZpcm9ubWVudFxuICogIC0gYGphYCDnkrDlooPjgavlv5zjgZjjgZ8gYGdsb2JhbGAg44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWwoKTogdHlwZW9mIGdsb2JhbFRoaXMge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1uZXctZnVuYywgQHR5cGVzY3JpcHQtZXNsaW50L25vLWltcGxpZWQtZXZhbFxuICAgIHJldHVybiAoJ29iamVjdCcgPT09IHR5cGVvZiBnbG9iYWxUaGlzKSA/IGdsb2JhbFRoaXMgOiBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xufVxuXG4vKipcbiAqIEBlbiBFbnN1cmUgbmFtZWQgb2JqZWN0IGFzIHBhcmVudCdzIHByb3BlcnR5LlxuICogQGphIOimquOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumuOBl+OBpiwg5ZCN5YmN44Gr5oyH5a6a44GX44Gf44Kq44OW44K444Kn44Kv44OI44Gu5a2Y5Zyo44KS5L+d6Ki8XG4gKlxuICogQHBhcmFtIHBhcmVudFxuICogIC0gYGVuYCBwYXJlbnQgb2JqZWN0LiBJZiBudWxsIGdpdmVuLCBgZ2xvYmFsVGhpc2AgaXMgYXNzaWduZWQuXG4gKiAgLSBgamFgIOimquOCquODluOCuOOCp+OCr+ODiC4gbnVsbCDjga7loLTlkIjjga8gYGdsb2JhbFRoaXNgIOOBjOS9v+eUqOOBleOCjOOCi1xuICogQHBhcmFtIG5hbWVzXG4gKiAgLSBgZW5gIG9iamVjdCBuYW1lIGNoYWluIGZvciBlbnN1cmUgaW5zdGFuY2UuXG4gKiAgLSBgamFgIOS/neiovOOBmeOCi+OCquODluOCuOOCp+OCr+ODiOOBruWQjeWJjVxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlT2JqZWN0PFQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+KHBhcmVudDogb2JqZWN0IHwgbnVsbCwgLi4ubmFtZXM6IHN0cmluZ1tdKTogVCB7XG4gICAgbGV0IHJvb3QgPSBwYXJlbnQgfHwgZ2V0R2xvYmFsKCk7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIG5hbWVzKSB7XG4gICAgICAgIHJvb3RbbmFtZV0gPSByb290W25hbWVdIHx8IHt9O1xuICAgICAgICByb290ID0gcm9vdFtuYW1lXTtcbiAgICB9XG4gICAgcmV0dXJuIHJvb3QgYXMgVDtcbn1cblxuLyoqXG4gKiBAZW4gR2xvYmFsIG5hbWVzcGFjZSBhY2Nlc3Nvci5cbiAqIEBqYSDjgrDjg63jg7zjg5Djg6vjg43jg7zjg6Djgrnjg5rjg7zjgrnjgqLjgq/jgrvjg4PjgrVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEdsb2JhbE5hbWVzcGFjZTxUIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PihuYW1lc3BhY2U6IHN0cmluZyk6IFQge1xuICAgIHJldHVybiBlbnN1cmVPYmplY3Q8VD4obnVsbCwgbmFtZXNwYWNlKTtcbn1cblxuLyoqXG4gKiBAZW4gR2xvYmFsIGNvbmZpZyBhY2Nlc3Nvci5cbiAqIEBqYSDjgrDjg63jg7zjg5Djg6vjgrPjg7Pjg5XjgqPjgrDjgqLjgq/jgrvjg4PjgrVcbiAqXG4gKiBAcmV0dXJucyBkZWZhdWx0OiBgQ0RQLkNvbmZpZ2BcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbmZpZzxUIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PihuYW1lc3BhY2UgPSAnQ0RQJywgY29uZmlnTmFtZSA9ICdDb25maWcnKTogVCB7XG4gICAgcmV0dXJuIGVuc3VyZU9iamVjdDxUPihnZXRHbG9iYWxOYW1lc3BhY2UobmFtZXNwYWNlKSwgY29uZmlnTmFtZSk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L2Jhbi10eXBlcyxcbiAqL1xuXG4vKipcbiAqIEBlbiBQcmltaXRpdmUgdHlwZSBvZiBKYXZhU2NyaXB0LlxuICogQGphIEphdmFTY3JpcHQg44Gu44OX44Oq44Of44OG44Kj44OW5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFByaW1pdGl2ZSA9IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBzeW1ib2wgfCBiaWdpbnQgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlbiBUaGUgZ2VuZXJhbCBudWxsIHR5cGUuXG4gKiBAamEg56m644KS56S644GZ5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIE5pbCA9IHZvaWQgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlbiBUaGUgdHlwZSBvZiBvYmplY3Qgb3IgW1tOaWxdXS5cbiAqIEBqYSBbW05pbF1dIOOBq+OBquOCiuOBiOOCi+OCquODluOCuOOCp+OCr+ODiOWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBOaWxsYWJsZTxUIGV4dGVuZHMgb2JqZWN0PiA9IFQgfCBOaWw7XG5cbi8qKlxuICogQGVuIEF2b2lkIHRoZSBgRnVuY3Rpb25gdHlwZXMuXG4gKiBAamEg5rGO55So6Zai5pWw5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFVua25vd25GdW5jdGlvbiA9ICguLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd247XG5cbi8qKlxuICogQGVuIEF2b2lkIHRoZSBgT2JqZWN0YCBhbmQgYHt9YCB0eXBlcywgYXMgdGhleSBtZWFuIFwiYW55IG5vbi1udWxsaXNoIHZhbHVlXCIuXG4gKiBAamEg5rGO55So44Kq44OW44K444Kn44Kv44OI5Z6LLiBgT2JqZWN0YCDjgYrjgojjgbMgYHt9YCDjgr/jgqTjg5fjga/jgIxudWxs44Gn44Gq44GE5YCk44CN44KS5oSP5ZGz44GZ44KL44Gf44KB5Luj5L6h44Go44GX44Gm5L2/55SoXG4gKi9cbmV4cG9ydCB0eXBlIFVua25vd25PYmplY3QgPSBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcblxuLyoqXG4gKiBAZW4gTm9uLW51bGxpc2ggdmFsdWUuXG4gKiBAamEg6Z2eIE51bGwg5YCkXG4gKi9cbmV4cG9ydCB0eXBlIE5vbk5pbCA9IHt9O1xuXG4vKipcbiAqIEBlbiBKYXZhU2NyaXB0IHR5cGUgc2V0IGludGVyZmFjZS5cbiAqIEBqYSBKYXZhU2NyaXB0IOOBruWei+OBrumbhuWQiFxuICovXG5pbnRlcmZhY2UgVHlwZUxpc3Qge1xuICAgIHN0cmluZzogc3RyaW5nO1xuICAgIG51bWJlcjogbnVtYmVyO1xuICAgIGJvb2xlYW46IGJvb2xlYW47XG4gICAgc3ltYm9sOiBzeW1ib2w7XG4gICAgYmlnaW50OiBiaWdpbnQ7XG4gICAgdW5kZWZpbmVkOiB2b2lkIHwgdW5kZWZpbmVkO1xuICAgIG9iamVjdDogb2JqZWN0IHwgbnVsbDtcbiAgICBmdW5jdGlvbiguLi5hcmdzOiB1bmtub3duW10pOiB1bmtub3duO1xufVxuXG4vKipcbiAqIEBlbiBUaGUga2V5IGxpc3Qgb2YgW1tUeXBlTGlzdF1dLlxuICogQGphIFtbVHlwZUxpc3RdXSDjgq3jg7zkuIDopqdcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZUtleXMgPSBrZXlvZiBUeXBlTGlzdDtcblxuLyoqXG4gKiBAZW4gVHlwZSBiYXNlIGRlZmluaXRpb24uXG4gKiBAamEg5Z6L44Gu6KaP5a6a5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZTxUIGV4dGVuZHMgb2JqZWN0PiBleHRlbmRzIEZ1bmN0aW9uIHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IFQ7XG59XG5cbi8qKlxuICogQGVuIFR5cGUgb2YgY29uc3RydWN0b3IuXG4gKiBAamEg44Kz44Oz44K544OI44Op44Kv44K/5Z6LXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29uc3RydWN0b3I8VCBleHRlbmRzIG9iamVjdD4gZXh0ZW5kcyBUeXBlPFQ+IHtcbiAgICBuZXcoLi4uYXJnczogYW55W10pOiBUO1xufVxuXG4vKipcbiAqIEBlbiBUeXBlIG9mIGNsYXNzLlxuICogQGphIOOCr+ODqeOCueWei1xuICovXG5leHBvcnQgdHlwZSBDbGFzczxUIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PiA9IENvbnN0cnVjdG9yPFQ+O1xuXG4vKipcbiAqIEBlbiBFbnN1cmUgZm9yIGZ1bmN0aW9uIHBhcmFtZXRlcnMgdG8gdHVwbGUuXG4gKiBAamEg6Zai5pWw44OR44Op44Oh44O844K/44Go44GX44GmIHR1cGxlIOOCkuS/neiovFxuICovXG5leHBvcnQgdHlwZSBBcmd1bWVudHM8VD4gPSBUIGV4dGVuZHMgYW55W10gPyBUIDogW1RdO1xuXG4vKipcbiAqIEBlbiBSbW92ZSBgcmVhZG9ubHlgIGF0dHJpYnV0ZXMgZnJvbSBpbnB1dCB0eXBlLlxuICogQGphIGByZWFkb25seWAg5bGe5oCn44KS6Kej6ZmkXG4gKi9cbmV4cG9ydCB0eXBlIFdyaXRhYmxlPFQ+ID0geyAtcmVhZG9ubHkgW0sgaW4ga2V5b2YgVF06IFRbS10gfTtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBmdW5jdGlvbmFsIHByb3BlcnR5IG5hbWVzLlxuICogQGphIOmWouaVsOODl+ODreODkeODhuOCo+WQjeOBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBGdW5jdGlvblByb3BlcnR5TmFtZXM8VD4gPSB7IFtLIGluIGtleW9mIFRdOiBUW0tdIGV4dGVuZHMgRnVuY3Rpb24gPyBLIDogbmV2ZXIgfVtrZXlvZiBUXSAmIHN0cmluZztcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBmdW5jdGlvbmFsIHByb3BlcnRpZXMuXG4gKiBAamEg6Zai5pWw44OX44Ot44OR44OG44Kj44Gu5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIEZ1bmN0aW9uUHJvcGVydGllczxUPiA9IFBpY2s8VCwgRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+PjtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBub24tZnVuY3Rpb25hbCBwcm9wZXJ0eSBuYW1lcy5cbiAqIEBqYSDpnZ7plqLmlbDjg5fjg63jg5Hjg4bjgqPlkI3jga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+ID0geyBbSyBpbiBrZXlvZiBUXTogVFtLXSBleHRlbmRzIEZ1bmN0aW9uID8gbmV2ZXIgOiBLIH1ba2V5b2YgVF0gJiBzdHJpbmc7XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgbm9uLWZ1bmN0aW9uYWwgcHJvcGVydGllcy5cbiAqIEBqYSDpnZ7plqLmlbDjg5fjg63jg5Hjg4bjgqPjga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgTm9uRnVuY3Rpb25Qcm9wZXJ0aWVzPFQ+ID0gUGljazxULCBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VD4+O1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG5vbi1mdW5jdGlvbmFsIHR5cGVzLlxuICogQGphIOmdnumWouaVsOWei+OBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBOb25GdW5jdGlvbjxUPiA9IFQgZXh0ZW5kcyBGdW5jdGlvbiA/IG5ldmVyIDogVDtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBvYmplY3Qga2V5IGxpc3QuIChlbnN1cmUgb25seSAnc3RyaW5nJylcbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7jgq3jg7zkuIDopqfjgpLmir3lh7ogKCdzdHJpbmcnIOWei+OBruOBv+OCkuS/neiovClcbiAqL1xuZXhwb3J0IHR5cGUgS2V5czxUIGV4dGVuZHMgb2JqZWN0PiA9IGtleW9mIE9taXQ8VCwgbnVtYmVyIHwgc3ltYm9sPjtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBvYmplY3QgdHlwZSBsaXN0LlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBruWei+S4gOimp+OCkuaKveWHulxuICovXG5leHBvcnQgdHlwZSBUeXBlczxUIGV4dGVuZHMgb2JqZWN0PiA9IFRba2V5b2YgVF07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgb2JqZWN0IGtleSB0byB0eXBlLlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOCreODvOOBi+OCieWei+OBuOWkieaPm1xuICovXG5leHBvcnQgdHlwZSBLZXlUb1R5cGU8TyBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIGtleW9mIE8+ID0gSyBleHRlbmRzIGtleW9mIE8gPyBPW0tdIDogbmV2ZXI7XG5cbi8qKlxuICogQGVuIENvbnZlcnQgb2JqZWN0IHR5cGUgdG8ga2V5LlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOWei+OBi+OCieOCreODvOOBuOWkieaPm1xuICovXG5leHBvcnQgdHlwZSBUeXBlVG9LZXk8TyBleHRlbmRzIG9iamVjdCwgVCBleHRlbmRzIFR5cGVzPE8+PiA9IHsgW0sgaW4ga2V5b2YgT106IE9bS10gZXh0ZW5kcyBUID8gSyA6IG5ldmVyIH1ba2V5b2YgT107XG5cbi8qKlxuICogQGVuIFRoZSBbW1BsYWluT2JqZWN0XV0gdHlwZSBpcyBhIEphdmFTY3JpcHQgb2JqZWN0IGNvbnRhaW5pbmcgemVybyBvciBtb3JlIGtleS12YWx1ZSBwYWlycy4gPGJyPlxuICogICAgICdQbGFpbicgbWVhbnMgaXQgZnJvbSBvdGhlciBraW5kcyBvZiBKYXZhU2NyaXB0IG9iamVjdHMuIGV4OiBudWxsLCB1c2VyLWRlZmluZWQgYXJyYXlzLCBhbmQgaG9zdCBvYmplY3RzIHN1Y2ggYXMgYGRvY3VtZW50YC5cbiAqIEBqYSAwIOS7peS4iuOBriBrZXktdmFsdWUg44Oa44Ki44KS5oyB44GkIFtbUGxhaW5PYmplY3RdXSDlrprnvqkgPGJyPlxuICogICAgICdQbGFpbicg44Go44Gv5LuW44Gu56iu6aGe44GuIEphdmFTY3JpcHQg44Kq44OW44K444Kn44Kv44OI44KS5ZCr44G+44Gq44GE44Kq44OW44K444Kn44Kv44OI44KS5oSP5ZGz44GZ44KLLiDkvos6ICBudWxsLCDjg6bjg7zjgrbjg7zlrprnvqnphY3liJcsIOOBvuOBn+OBryBgZG9jdW1lbnRgIOOBruOCiOOBhuOBque1hOOBv+i+vOOBv+OCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgdHlwZSBQbGFpbk9iamVjdDxUID0ge30gfCBudWxsIHwgdW5kZWZpbmVkPiA9IFJlY29yZDxzdHJpbmcsIFQ+O1xuXG4vKipcbiAqIEBlbiBPYmplY3QgY2FuIGJlIGd1YXJhbnRlZWQgZGVmaW5pdGlvbi4gQmUgY2FyZWZ1bCBub3QgdG8gYWJ1c2UgaXQgYmVjYXVzZSBpdCBkb2VzIG5vdCBmb3JjZSB0aGUgY2FzdC5cbiAqICAgLSBVbmxpa2UgW1tQbGFpbk9iamVjdF1dLCBpdCBjYW4gYWNjZXB0IENsYXNzIChidWlsdC1pbiBvYmplY3QpLCBBcnJheSwgRnVuY3Rpb24uXG4gKiAgIC0gVW5saWtlIGBvYmplY3RgLCB5b3UgY2FuIGFjY2VzcyB1bmtub3duIHByb3BlcnRpZXMuXG4gKiAgIC0gVW5saWtlIGB7fSAvIE9iamVjdGAsIGl0IGNhbiByZXBlbCBbW1ByaW1pdGl2ZV1dLlxuICogQGphIE9iamVjdCDjgpLkv53oqLzlj6/og73jgarlrprnvqkuIOOCreODo+OCueODiOOCkuW8t+WItuOBl+OBquOBhOOBn+OCgeS5seeUqOOBl+OBquOBhOOCiOOBhuOBq+azqOaEj+OBjOW/heimgS5cbiAqICAgLSBbW1BsYWluT2JqZWN0XV0g44Go6YGV44GE44CBQ2xhc3MgKOe1hOOBv+i+vOOBv+OCquODluOCuOOCp+OCr+ODiCksIEFycmF5LCBGdW5jdGlvbiDjgpLlj5fjgZHku5jjgZHjgovjgZPjgajjgYzjgafjgY3jgosuXG4gKiAgIC0gYG9iamVjdGAg44Go6YGV44GE44CB5pyq55+l44Gu44OX44Ot44OR44OG44Kj44Gr44Ki44Kv44K744K544GZ44KL44GT44Go44GM44Gn44GN44KLLlxuICogICAtIGB7fSAvIE9iamVjdGAg44Go6YGV44GE44CBW1tQcmltaXRpdmVdXSDjgpLjga/jgZjjgY/jgZPjgajjgYzjgafjgY3jgosuXG4gKi9cbmV4cG9ydCB0eXBlIEFueU9iamVjdCA9IFJlY29yZDxzdHJpbmcsIGFueT47XG5cbi8qKlxuICogQGVuIFRoZSBkYXRhIHR5cGUgbGlzdCBieSB3aGljaCBzdHlsZSBjb21wdWxzaW9uIGlzIHBvc3NpYmxlLlxuICogQGphIOWei+W8t+WItuWPr+iDveOBquODh+ODvOOCv+Wei+S4gOimp1xuICovXG5leHBvcnQgdHlwZSBUeXBlZERhdGEgPSBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCB8IG9iamVjdDtcblxuLyoqXG4gKiBAZW4gVGhlIGRhdGEgdHlwZSBsaXN0IG9mIFR5cGVkQXJyYXkuXG4gKiBAamEgVHlwZWRBcnJheSDkuIDopqdcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZWRBcnJheSA9IEludDhBcnJheSB8IFVpbnQ4QXJyYXkgfCBVaW50OENsYW1wZWRBcnJheSB8IEludDE2QXJyYXkgfCBVaW50MTZBcnJheSB8IEludDMyQXJyYXkgfCBVaW50MzJBcnJheSB8IEZsb2F0MzJBcnJheSB8IEZsb2F0NjRBcnJheTtcblxuLyoqXG4gKiBAZW4gVHlwZWRBcnJheSBjb25zdHJ1Y3Rvci5cbiAqIEBqYSBUeXBlZEFycmF5IOOCs+ODs+OCueODiOODqeOCr+OCv+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFR5cGVkQXJyYXlDb25zdHJ1Y3RvciB7XG4gICAgcmVhZG9ubHkgcHJvdG90eXBlOiBUeXBlZEFycmF5O1xuICAgIG5ldyhzZWVkOiBudW1iZXIgfCBBcnJheUxpa2U8bnVtYmVyPiB8IEFycmF5QnVmZmVyTGlrZSk6IFR5cGVkQXJyYXk7XG4gICAgbmV3KGJ1ZmZlcjogQXJyYXlCdWZmZXJMaWtlLCBieXRlT2Zmc2V0PzogbnVtYmVyLCBsZW5ndGg/OiBudW1iZXIpOiBUeXBlZEFycmF5O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBzaXplIGluIGJ5dGVzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIOimgee0oOOBruODkOOCpOODiOOCteOCpOOCulxuICAgICAqL1xuICAgIHJlYWRvbmx5IEJZVEVTX1BFUl9FTEVNRU5UOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhIG5ldyBhcnJheSBmcm9tIGEgc2V0IG9mIGVsZW1lbnRzLlxuICAgICAqIEBqYSDopoHntKDjgpLoqK3lrprjgZfmlrDopo/phY3liJfjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpdGVtc1xuICAgICAqICAtIGBlbmAgQSBzZXQgb2YgZWxlbWVudHMgdG8gaW5jbHVkZSBpbiB0aGUgbmV3IGFycmF5IG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOaWsOOBn+OBq+ioreWumuOBmeOCi+imgee0oFxuICAgICAqL1xuICAgIG9mKC4uLml0ZW1zOiBudW1iZXJbXSk6IFR5cGVkQXJyYXk7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlcyBhbiBhcnJheSBmcm9tIGFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0LlxuICAgICAqIEBqYSBhcnJheS1saWtlIC8gaXRlcmF0YWJsZSDjgqrjg5bjgrjjgqfjgq/jg4jjgYvjgonmlrDopo/phY3liJfjgpLkvZzmiJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheUxpa2VcbiAgICAgKiAgLSBgZW5gIEFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0IHRvIGNvbnZlcnQgdG8gYW4gYXJyYXkuXG4gICAgICogIC0gYGphYCBhcnJheS1saWtlIOOCguOBl+OBj+OBryBpdGVyYXRhYmxlIOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIGZyb20oYXJyYXlMaWtlOiBBcnJheUxpa2U8bnVtYmVyPik6IFR5cGVkQXJyYXk7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlcyBhbiBhcnJheSBmcm9tIGFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0LlxuICAgICAqIEBqYSBhcnJheS1saWtlIC8gaXRlcmF0YWJsZSDjgqrjg5bjgrjjgqfjgq/jg4jjgYvjgonmlrDopo/phY3liJfjgpLkvZzmiJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheUxpa2VcbiAgICAgKiAgLSBgZW5gIEFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0IHRvIGNvbnZlcnQgdG8gYW4gYXJyYXkuXG4gICAgICogIC0gYGphYCBhcnJheS1saWtlIOOCguOBl+OBj+OBryBpdGVyYXRhYmxlIOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBtYXBmblxuICAgICAqICAtIGBlbmAgQSBtYXBwaW5nIGZ1bmN0aW9uIHRvIGNhbGwgb24gZXZlcnkgZWxlbWVudCBvZiB0aGUgYXJyYXkuXG4gICAgICogIC0gYGphYCDlhajopoHntKDjgavpgannlKjjgZnjgovjg5fjg63jgq3jgrfplqLmlbBcbiAgICAgKiBAcGFyYW0gdGhpc0FyZ1xuICAgICAqICAtIGBlbmAgVmFsdWUgb2YgJ3RoaXMnIHVzZWQgdG8gaW52b2tlIHRoZSBtYXBmbi5cbiAgICAgKiAgLSBgamFgIG1hcGZuIOOBq+S9v+eUqOOBmeOCiyAndGhpcydcbiAgICAgKi9cbiAgICBmcm9tPFQ+KGFycmF5TGlrZTogQXJyYXlMaWtlPFQ+LCBtYXBmbjogKHY6IFQsIGs6IG51bWJlcikgPT4gbnVtYmVyLCB0aGlzQXJnPzogdW5rbm93bik6IFR5cGVkQXJyYXk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgZXhpc3RzLlxuICogQGphIOWApOOBjOWtmOWcqOOBmeOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4aXN0czxUPih4OiBUIHwgTmlsKTogeCBpcyBUIHtcbiAgICByZXR1cm4gbnVsbCAhPSB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBbW05pbF1dLlxuICogQGphIFtbTmlsXV0g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOaWwoeDogdW5rbm93bik6IHggaXMgTmlsIHtcbiAgICByZXR1cm4gbnVsbCA9PSB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBTdHJpbmcuXG4gKiBAamEgU3RyaW5nIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3RyaW5nKHg6IHVua25vd24pOiB4IGlzIHN0cmluZyB7XG4gICAgcmV0dXJuICdzdHJpbmcnID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgTnVtYmVyLlxuICogQGphIE51bWJlciDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc051bWJlcih4OiB1bmtub3duKTogeCBpcyBudW1iZXIge1xuICAgIHJldHVybiAnbnVtYmVyJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIEJvb2xlYW4uXG4gKiBAamEgQm9vbGVhbiDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Jvb2xlYW4oeDogdW5rbm93bik6IHggaXMgYm9vbGVhbiB7XG4gICAgcmV0dXJuICdib29sZWFuJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFN5bWJsZS5cbiAqIEBqYSBTeW1ib2wg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTeW1ib2woeDogdW5rbm93bik6IHggaXMgc3ltYm9sIHtcbiAgICByZXR1cm4gJ3N5bWJvbCcgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBCaWdJbnQuXG4gKiBAamEgQmlnSW50IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQmlnSW50KHg6IHVua25vd24pOiB4IGlzIGJpZ2ludCB7XG4gICAgcmV0dXJuICdiaWdpbnQnID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgcHJpbWl0aXZlIHR5cGUuXG4gKiBAamEg44OX44Oq44Of44OG44Kj44OW5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQcmltaXRpdmUoeDogdW5rbm93bik6IHggaXMgUHJpbWl0aXZlIHtcbiAgICByZXR1cm4gIXggfHwgKCdmdW5jdGlvbicgIT09IHR5cGVvZiB4KSAmJiAoJ29iamVjdCcgIT09IHR5cGVvZiB4KTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgQXJyYXkuXG4gKiBAamEgQXJyYXkg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgY29uc3QgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIE9iamVjdC5cbiAqIEBqYSBPYmplY3Qg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNPYmplY3QoeDogdW5rbm93bik6IHggaXMgb2JqZWN0IHtcbiAgICByZXR1cm4gQm9vbGVhbih4KSAmJiAnb2JqZWN0JyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFtbUGxhaW5PYmplY3RdXS5cbiAqIEBqYSBbW1BsYWluT2JqZWN0XV0g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQbGFpbk9iamVjdCh4OiB1bmtub3duKTogeCBpcyBQbGFpbk9iamVjdCB7XG4gICAgaWYgKCFpc09iamVjdCh4KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gY3JlYXRlIGZyb20gYE9iamVjdC5jcmVhdGUoIG51bGwgKWAgaXMgcGxhaW5cbiAgICBpZiAoIU9iamVjdC5nZXRQcm90b3R5cGVPZih4KSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3duSW5zdGFuY2VPZihPYmplY3QsIHgpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBlbXB0eSBvYmplY3QuXG4gKiBAamEg56m644Kq44OW44K444Kn44Kv44OI44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFbXB0eU9iamVjdCh4OiB1bmtub3duKTogeCBpcyBvYmplY3Qge1xuICAgIGlmICghaXNQbGFpbk9iamVjdCh4KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbmFtZSBpbiB4KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIEZ1bmN0aW9uLlxuICogQGphIEZ1bmN0aW9uIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRnVuY3Rpb24oeDogdW5rbm93bik6IHggaXMgVHlwZUxpc3RbJ2Z1bmN0aW9uJ10ge1xuICAgIHJldHVybiAnZnVuY3Rpb24nID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGNhbiBiZSBjb252ZXJ0IHRvIGEgbnVtYmVyLlxuICogQGphIOaVsOWApOOBq+WkieaPm+WPr+iDveOBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTnVtZXJpYyh4OiB1bmtub3duKTogeCBpcyBudW1iZXIge1xuICAgIHJldHVybiAhaXNOaWwoeCkgJiYgIWlzQm9vbGVhbih4KSAmJiAhaXNBcnJheSh4KSAmJiAhaXNTeW1ib2woeCkgJiYgKCcnICE9PSB4KSAmJiAhTnVtYmVyLmlzTmFOKE51bWJlcih4KSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIGlucHV0LlxuICogQGphIOaMh+WumuOBl+OBn+Wei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB0eXBlXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB0eXBlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+Wei1xuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZU9mPEsgZXh0ZW5kcyBUeXBlS2V5cz4odHlwZTogSywgeDogdW5rbm93bik6IHggaXMgVHlwZUxpc3RbS10ge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gdHlwZTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGhhcyBpdGVyYXRvci5cbiAqIEBqYSBpdGVyYXRvciDjgpLmiYDmnInjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlPFQ+KHg6IE5pbGxhYmxlPEl0ZXJhYmxlPFQ+Pik6IHggaXMgSXRlcmFibGU8VD47XG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZSh4OiB1bmtub3duKTogeCBpcyBJdGVyYWJsZTx1bmtub3duPjtcbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlKHg6IHVua25vd24pOiBhbnkge1xuICAgIHJldHVybiBTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KHgpO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfdHlwZWRBcnJheU5hbWVzID0ge1xuICAgICdJbnQ4QXJyYXknOiB0cnVlLFxuICAgICdVaW50OEFycmF5JzogdHJ1ZSxcbiAgICAnVWludDhDbGFtcGVkQXJyYXknOiB0cnVlLFxuICAgICdJbnQxNkFycmF5JzogdHJ1ZSxcbiAgICAnVWludDE2QXJyYXknOiB0cnVlLFxuICAgICdJbnQzMkFycmF5JzogdHJ1ZSxcbiAgICAnVWludDMyQXJyYXknOiB0cnVlLFxuICAgICdGbG9hdDMyQXJyYXknOiB0cnVlLFxuICAgICdGbG9hdDY0QXJyYXknOiB0cnVlLFxufTtcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGlzIG9uZSBvZiBbW1R5cGVkQXJyYXldXS5cbiAqIEBqYSDmjIflrprjgZfjgZ/jgqTjg7Pjgrnjgr/jg7PjgrnjgYwgW1tUeXBlZEFycmF5XV0g44Gu5LiA56iu44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlZEFycmF5KHg6IHVua25vd24pOiB4IGlzIFR5cGVkQXJyYXkge1xuICAgIHJldHVybiAhIV90eXBlZEFycmF5TmFtZXNbY2xhc3NOYW1lKHgpXTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGluc3RhbmNlIG9mIGlucHV0LlxuICogQGphIOaMh+WumuOBl+OBn+OCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDoqZXkvqHjgZnjgovjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluc3RhbmNlT2Y8VCBleHRlbmRzIG9iamVjdD4oY3RvcjogTmlsbGFibGU8VHlwZTxUPj4sIHg6IHVua25vd24pOiB4IGlzIFQge1xuICAgIHJldHVybiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGN0b3IpICYmICh4IGluc3RhbmNlb2YgY3Rvcik7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBpbnN0YW5jZSBvZiBpbnB1dCBjb25zdHJ1Y3RvciAoZXhjZXB0IHN1YiBjbGFzcykuXG4gKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44Gu44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5Yik5a6aICjmtL7nlJ/jgq/jg6njgrnjga/lkKvjgoHjgarjgYQpXG4gKlxuICogQHBhcmFtIGN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIGNvbnN0cnVjdG9yXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+OCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gb3duSW5zdGFuY2VPZjxUIGV4dGVuZHMgb2JqZWN0PihjdG9yOiBOaWxsYWJsZTxUeXBlPFQ+PiwgeDogdW5rbm93bik6IHggaXMgVCB7XG4gICAgcmV0dXJuIChudWxsICE9IHgpICYmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgY3RvcikgJiYgKE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSA9PT0gT2JqZWN0KGN0b3IucHJvdG90eXBlKSk7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgdmFsdWUncyBjbGFzcyBuYW1lLlxuICogQGphIOOCr+ODqeOCueWQjeOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzTmFtZSh4OiBhbnkpOiBzdHJpbmcgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1tb2R1bGUtYm91bmRhcnktdHlwZXNcbiAgICBpZiAoeCAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHRvU3RyaW5nVGFnTmFtZSA9IHhbU3ltYm9sLnRvU3RyaW5nVGFnXTtcbiAgICAgICAgaWYgKGlzU3RyaW5nKHRvU3RyaW5nVGFnTmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0b1N0cmluZ1RhZ05hbWU7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbih4KSAmJiB4LnByb3RvdHlwZSAmJiBudWxsICE9IHgubmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHgubmFtZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGN0b3IgPSB4LmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oY3RvcikgJiYgY3RvciA9PT0gKE9iamVjdChjdG9yLnByb3RvdHlwZSkgYXMgb2JqZWN0KS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjdG9yLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgYXMgc3RyaW5nKS5zbGljZSg4LCAtMSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIGlucHV0IHZhbHVlcyBhcmUgc2FtZSB2YWx1ZS10eXBlLlxuICogQGphIOWFpeWKm+OBjOWQjOS4gOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBsaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICogQHBhcmFtIHJoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1lVHlwZShsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0eXBlb2YgbGhzID09PSB0eXBlb2YgcmhzO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBpbnB1dCB2YWx1ZXMgYXJlIHNhbWUgY2xhc3MuXG4gKiBAamEg5YWl5Yqb44GM5ZCM5LiA44Kv44Op44K544Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGxoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKiBAcGFyYW0gcmhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhbWVDbGFzcyhsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIGlmIChudWxsID09IGxocyAmJiBudWxsID09IHJocykge1xuICAgICAgICByZXR1cm4gY2xhc3NOYW1lKGxocykgPT09IGNsYXNzTmFtZShyaHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAobnVsbCAhPSBsaHMpICYmIChudWxsICE9IHJocykgJiYgKE9iamVjdC5nZXRQcm90b3R5cGVPZihsaHMpID09PSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocmhzKSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb21tb24gU3ltYmxlIGZvciBmcmFtZXdvcmsuXG4gKiBAamEg44OV44Os44O844Og44Ov44O844Kv44GM5YWx6YCa44Gn5L2/55So44GZ44KLIFN5bWJsZVxuICovXG5leHBvcnQgY29uc3QgJGNkcCA9IFN5bWJvbCgnQGNkcCcpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvYmFuLXR5cGVzLFxuICovXG5cbmltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIFR5cGVLZXlzLFxuICAgIGlzQXJyYXksXG4gICAgZXhpc3RzLFxuICAgIGNsYXNzTmFtZSxcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogQGVuIFR5cGUgdmVyaWZpZXIgaW50ZXJmYWNlIGRlZmluaXRpb24uIDxicj5cbiAqICAgICBJZiBpbnZhbGlkIHZhbHVlIHJlY2VpdmVkLCB0aGUgbWV0aG9kIHRocm93cyBgVHlwZUVycm9yYC5cbiAqIEBqYSDlnovmpJzoqLzjga7jgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqkgPGJyPlxuICogICAgIOmBleWPjeOBl+OBn+WgtOWQiOOBryBgVHlwZUVycm9yYCDjgpLnmbrnlJ9cbiAqXG4gKlxuICovXG5pbnRlcmZhY2UgVmVyaWZpZXIge1xuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBpcyBub3QgW1tOaWxdXS5cbiAgICAgKiBAamEgW1tOaWxdXSDjgafjgarjgYTjgZPjgajjgpLmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub3ROaWwueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gbm90TmlsLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBub3ROaWw6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGlzIFtbVHlwZUtleXNdXS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIFtbVHlwZUtleXNdXSDjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlT2YudHlwZVxuICAgICAqICAtIGBlbmAgb25lIG9mIFtbVHlwZUtleXNdXVxuICAgICAqICAtIGBqYWAgW1tUeXBlS2V5c11dIOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSB0eXBlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gdHlwZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICB0eXBlT2Y6ICh0eXBlOiBUeXBlS2V5cywgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBpcyBgQXJyYXlgLlxuICAgICAqIEBqYSBgQXJyYXlgIOOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5LnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGFycmF5Lm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBhcnJheTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaXMgYEl0ZXJhYmxlYC5cbiAgICAgKiBAamEgYEl0ZXJhYmxlYCDjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpdGVyYWJsZS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBpdGVyYWJsZS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaXRlcmFibGU6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGluc3RhbmNlIGlzIGVxdWFsIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44Gu44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5zdGFuY2VPZi5jdG9yXG4gICAgICogIC0gYGVuYCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOavlOi8g+WvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBpbnN0YW5jZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGluc3RhbmNlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpbnN0YW5jZSBoYXMgYHN0cmljdGx5YCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3IuXG4gICAgICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OBruWOs+WvhuS4gOiHtOOBl+OBn+OCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIG93bkluc3RhbmNlT2YuY3RvclxuICAgICAqICAtIGBlbmAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDmr5TovIPlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gb3duSW5zdGFuY2VPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBvd25JbnN0YW5jZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBvd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaW5zdGFuY2UgaGFzIG5vdCBgc3RyaWN0bHlgIGVxdWFsIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44KS5oyB44Gk44Kk44Oz44K544K/44Oz44K544Gn44Gq44GE44GT44Go44KS5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm90T3duSW5zdGFuY2VPZi5jdG9yXG4gICAgICogIC0gYGVuYCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOavlOi8g+WvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBub3RPd25JbnN0YW5jZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIG5vdE93bkluc3RhbmNlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIG5vdE93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBoYXMgc3BlY2lmaWVkIHByb3BlcnR5LlxuICAgICAqIEBqYSDmjIflrprjg5fjg63jg5Hjg4bjgqPjgpLmjIHjgaPjgabjgYTjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYXNQcm9wZXJ0eS5wcm9wXG4gICAgICogIC0gYGVuYCBzcGVjaWZpZWQgcHJvcGVydHlcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqIEBwYXJhbSBoYXNQcm9wZXJ0eS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBoYXNQcm9wZXJ0eS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaGFzUHJvcGVydHk6ICh4OiB1bmtub3duLCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBoYXMgb3duIHNwZWNpZmllZCBwcm9wZXJ0eS5cbiAgICAgKiBAamEg5oyH5a6a44OX44Ot44OR44OG44Kj44KS5YWl5Yqb5YCk6Ieq6Lqr5oyB44Gj44Gm44GE44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFzT3duUHJvcGVydHkucHJvcFxuICAgICAqICAtIGBlbmAgc3BlY2lmaWVkIHByb3BlcnR5XG4gICAgICogIC0gYGphYCDlr77osaHjga7jg5fjg63jg5Hjg4bjgqNcbiAgICAgKiBAcGFyYW0gaGFzT3duUHJvcGVydHkueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaGFzT3duUHJvcGVydHkubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGhhc093blByb3BlcnR5OiAoeDogdW5rbm93biwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG59XG5cbi8qKlxuICogQGVuIExpc3Qgb2YgbWV0aG9kIGZvciB0eXBlIHZlcmlmeS5cbiAqIEBqYSDlnovmpJzoqLzjgYzmj5DkvpvjgZnjgovjg6Hjgr3jg4Pjg4nkuIDopqdcbiAqL1xuZXhwb3J0IHR5cGUgVmVyaWZ5TWV0aG9kID0ga2V5b2YgVmVyaWZpZXI7XG5cbi8qKlxuICogQGVuIENvbmNyZXRlIHR5cGUgdmVyaWZpZXIgb2JqZWN0LlxuICogQGphIOWei+aknOiovOWun+ijheOCquODluOCuOOCp+OCr+ODiFxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5jb25zdCBfdmVyaWZpZXI6IFZlcmlmaWVyID0ge1xuICAgIG5vdE5pbDogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYSB2YWxpZCB2YWx1ZS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdHlwZU9mOiAodHlwZTogVHlwZUtleXMsIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiB4ICE9PSB0eXBlKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVHlwZSBvZiAke2NsYXNzTmFtZSh4KX0gaXMgbm90ICR7dHlwZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGFycmF5OiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAoIWlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGFuIEFycmF5LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBpdGVyYWJsZTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKCEoU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdCh4KSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGFuIGl0ZXJhYmxlIG9iamVjdC5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICghKHggaW5zdGFuY2VvZiBjdG9yKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYW4gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBvd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgIT09IE9iamVjdChjdG9yLnByb3RvdHlwZSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGlzIG5vdCBvd24gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBub3RPd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgIT0geCAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgPT09IE9iamVjdChjdG9yLnByb3RvdHlwZSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGlzIG93biBpbnN0YW5jZSBvZiAke2N0b3IubmFtZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGhhc1Byb3BlcnR5OiAoeDogdW5rbm93biwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCB8fCAhKHByb3AgaW4gKHggYXMgb2JqZWN0KSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGRvZXMgbm90IGhhdmUgcHJvcGVydHkgJHtTdHJpbmcocHJvcCl9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBoYXNPd25Qcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHggfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh4LCBwcm9wKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFRoZSBvYmplY3QgZG9lcyBub3QgaGF2ZSBvd24gcHJvcGVydHkgJHtTdHJpbmcocHJvcCl9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vKipcbiAqIEBlbiBWZXJpZnkgbWV0aG9kLlxuICogQGphIOaknOiovOODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBtZXRob2RcbiAqICAtIGBlbmAgbWV0aG9kIG5hbWUgd2hpY2ggdXNpbmdcbiAqICAtIGBqYWAg5L2/55So44GZ44KL44Oh44K944OD44OJ5ZCNXG4gKiBAcGFyYW0gYXJnc1xuICogIC0gYGVuYCBhcmd1bWVudHMgd2hpY2ggY29ycmVzcG9uZHMgdG8gdGhlIG1ldGhvZCBuYW1lXG4gKiAgLSBgamFgIOODoeOCveODg+ODieWQjeOBq+WvvuW/nOOBmeOCi+W8leaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gdmVyaWZ5PFRNZXRob2QgZXh0ZW5kcyBWZXJpZnlNZXRob2Q+KG1ldGhvZDogVE1ldGhvZCwgLi4uYXJnczogUGFyYW1ldGVyczxWZXJpZmllcltUTWV0aG9kXT4pOiB2b2lkIHwgbmV2ZXIge1xuICAgIChfdmVyaWZpZXJbbWV0aG9kXSBhcyBVbmtub3duRnVuY3Rpb24pKC4uLmFyZ3MpO1xufVxuXG5leHBvcnQgeyB2ZXJpZnkgYXMgZGVmYXVsdCB9O1xuIiwiaW1wb3J0IHtcbiAgICBUeXBlZEFycmF5LFxuICAgIFR5cGVkQXJyYXlDb25zdHJ1Y3RvcixcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzQXJyYXksXG4gICAgaXNPYmplY3QsXG4gICAgaXNJdGVyYWJsZSxcbiAgICBpc1R5cGVkQXJyYXksXG4gICAgc2FtZUNsYXNzLFxufSBmcm9tICcuL3R5cGVzJztcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGRlZXBFcXVhbCgpICovXG5mdW5jdGlvbiBhcnJheUVxdWFsKGxoczogdW5rbm93bltdLCByaHM6IHVua25vd25bXSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGxlbiA9IGxocy5sZW5ndGg7XG4gICAgaWYgKGxlbiAhPT0gcmhzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKCFkZWVwRXF1YWwobGhzW2ldLCByaHNbaV0pKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBkZWVwRXF1YWwoKSAqL1xuZnVuY3Rpb24gYnVmZmVyRXF1YWwobGhzOiBTaGFyZWRBcnJheUJ1ZmZlciB8IEFycmF5QnVmZmVyLCByaHM6IFNoYXJlZEFycmF5QnVmZmVyIHwgQXJyYXlCdWZmZXIpOiBib29sZWFuIHtcbiAgICBjb25zdCBzaXplID0gbGhzLmJ5dGVMZW5ndGg7XG4gICAgaWYgKHNpemUgIT09IHJocy5ieXRlTGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgbGV0IHBvcyA9IDA7XG4gICAgaWYgKHNpemUgLSBwb3MgPj0gOCkge1xuICAgICAgICBjb25zdCBsZW4gPSBzaXplID4+PiAzO1xuICAgICAgICBjb25zdCBmNjRMID0gbmV3IEZsb2F0NjRBcnJheShsaHMsIDAsIGxlbik7XG4gICAgICAgIGNvbnN0IGY2NFIgPSBuZXcgRmxvYXQ2NEFycmF5KHJocywgMCwgbGVuKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgaWYgKCFPYmplY3QuaXMoZjY0TFtpXSwgZjY0UltpXSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcG9zID0gbGVuIDw8IDM7XG4gICAgfVxuICAgIGlmIChwb3MgPT09IHNpemUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGNvbnN0IEwgPSBuZXcgRGF0YVZpZXcobGhzKTtcbiAgICBjb25zdCBSID0gbmV3IERhdGFWaWV3KHJocyk7XG4gICAgaWYgKHNpemUgLSBwb3MgPj0gNCkge1xuICAgICAgICBpZiAoIU9iamVjdC5pcyhMLmdldFVpbnQzMihwb3MpLCBSLmdldFVpbnQzMihwb3MpKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHBvcyArPSA0O1xuICAgIH1cbiAgICBpZiAoc2l6ZSAtIHBvcyA+PSAyKSB7XG4gICAgICAgIGlmICghT2JqZWN0LmlzKEwuZ2V0VWludDE2KHBvcyksIFIuZ2V0VWludDE2KHBvcykpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcG9zICs9IDI7XG4gICAgfVxuICAgIGlmIChzaXplID4gcG9zKSB7XG4gICAgICAgIGlmICghT2JqZWN0LmlzKEwuZ2V0VWludDgocG9zKSwgUi5nZXRVaW50OChwb3MpKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHBvcyArPSAxO1xuICAgIH1cbiAgICByZXR1cm4gcG9zID09PSBzaXplO1xufVxuXG4vKipcbiAqIEBlbiBQZXJmb3JtcyBhIGRlZXAgY29tcGFyaXNvbiBiZXR3ZWVuIHR3byB2YWx1ZXMgdG8gZGV0ZXJtaW5lIGlmIHRoZXkgYXJlIGVxdWl2YWxlbnQuXG4gKiBAamEgMuWApOOBruips+e0sOavlOi8g+OCkuOBlywg562J44GX44GE44GL44Gp44GG44GL5Yik5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWVwRXF1YWwobGhzOiB1bmtub3duLCByaHM6IHVua25vd24pOiBib29sZWFuIHtcbiAgICBpZiAobGhzID09PSByaHMpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0Z1bmN0aW9uKGxocykgJiYgaXNGdW5jdGlvbihyaHMpKSB7XG4gICAgICAgIHJldHVybiBsaHMubGVuZ3RoID09PSByaHMubGVuZ3RoICYmIGxocy5uYW1lID09PSByaHMubmFtZTtcbiAgICB9XG4gICAgaWYgKCFpc09iamVjdChsaHMpIHx8ICFpc09iamVjdChyaHMpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgeyAvLyBQcmltaXRpdmUgV3JhcHBlciBPYmplY3RzIC8gRGF0ZVxuICAgICAgICBjb25zdCB2YWx1ZUwgPSBsaHMudmFsdWVPZigpO1xuICAgICAgICBjb25zdCB2YWx1ZVIgPSByaHMudmFsdWVPZigpO1xuICAgICAgICBpZiAobGhzICE9PSB2YWx1ZUwgfHwgcmhzICE9PSB2YWx1ZVIpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZUwgPT09IHZhbHVlUjtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIFJlZ0V4cFxuICAgICAgICBjb25zdCBpc1JlZ0V4cEwgPSBsaHMgaW5zdGFuY2VvZiBSZWdFeHA7XG4gICAgICAgIGNvbnN0IGlzUmVnRXhwUiA9IHJocyBpbnN0YW5jZW9mIFJlZ0V4cDtcbiAgICAgICAgaWYgKGlzUmVnRXhwTCB8fCBpc1JlZ0V4cFIpIHtcbiAgICAgICAgICAgIHJldHVybiBpc1JlZ0V4cEwgPT09IGlzUmVnRXhwUiAmJiBTdHJpbmcobGhzKSA9PT0gU3RyaW5nKHJocyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBBcnJheVxuICAgICAgICBjb25zdCBpc0FycmF5TCA9IGlzQXJyYXkobGhzKTtcbiAgICAgICAgY29uc3QgaXNBcnJheVIgPSBpc0FycmF5KHJocyk7XG4gICAgICAgIGlmIChpc0FycmF5TCB8fCBpc0FycmF5Uikge1xuICAgICAgICAgICAgcmV0dXJuIGlzQXJyYXlMID09PSBpc0FycmF5UiAmJiBhcnJheUVxdWFsKGxocyBhcyB1bmtub3duW10sIHJocyBhcyB1bmtub3duW10pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gQXJyYXlCdWZmZXJcbiAgICAgICAgY29uc3QgaXNCdWZmZXJMID0gbGhzIGluc3RhbmNlb2YgQXJyYXlCdWZmZXI7XG4gICAgICAgIGNvbnN0IGlzQnVmZmVyUiA9IHJocyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyO1xuICAgICAgICBpZiAoaXNCdWZmZXJMIHx8IGlzQnVmZmVyUikge1xuICAgICAgICAgICAgcmV0dXJuIGlzQnVmZmVyTCA9PT0gaXNCdWZmZXJSICYmIGJ1ZmZlckVxdWFsKGxocyBhcyBBcnJheUJ1ZmZlciwgcmhzIGFzIEFycmF5QnVmZmVyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIEFycmF5QnVmZmVyVmlld1xuICAgICAgICBjb25zdCBpc0J1ZmZlclZpZXdMID0gQXJyYXlCdWZmZXIuaXNWaWV3KGxocyk7XG4gICAgICAgIGNvbnN0IGlzQnVmZmVyVmlld1IgPSBBcnJheUJ1ZmZlci5pc1ZpZXcocmhzKTtcbiAgICAgICAgaWYgKGlzQnVmZmVyVmlld0wgfHwgaXNCdWZmZXJWaWV3Uikge1xuICAgICAgICAgICAgcmV0dXJuIGlzQnVmZmVyVmlld0wgPT09IGlzQnVmZmVyVmlld1IgJiYgc2FtZUNsYXNzKGxocywgcmhzKVxuICAgICAgICAgICAgICAgICYmIGJ1ZmZlckVxdWFsKChsaHMgYXMgQXJyYXlCdWZmZXJWaWV3KS5idWZmZXIsIChyaHMgYXMgQXJyYXlCdWZmZXJWaWV3KS5idWZmZXIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gb3RoZXIgSXRlcmFibGVcbiAgICAgICAgY29uc3QgaXNJdGVyYWJsZUwgPSBpc0l0ZXJhYmxlKGxocyk7XG4gICAgICAgIGNvbnN0IGlzSXRlcmFibGVSID0gaXNJdGVyYWJsZShyaHMpO1xuICAgICAgICBpZiAoaXNJdGVyYWJsZUwgfHwgaXNJdGVyYWJsZVIpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0l0ZXJhYmxlTCA9PT0gaXNJdGVyYWJsZVIgJiYgYXJyYXlFcXVhbChbLi4uKGxocyBhcyB1bmtub3duW10pXSwgWy4uLihyaHMgYXMgdW5rbm93bltdKV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChzYW1lQ2xhc3MobGhzLCByaHMpKSB7XG4gICAgICAgIGNvbnN0IGtleXNMID0gbmV3IFNldChPYmplY3Qua2V5cyhsaHMpKTtcbiAgICAgICAgY29uc3Qga2V5c1IgPSBuZXcgU2V0KE9iamVjdC5rZXlzKHJocykpO1xuICAgICAgICBpZiAoa2V5c0wuc2l6ZSAhPT0ga2V5c1Iuc2l6ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGtleXNMKSB7XG4gICAgICAgICAgICBpZiAoIWtleXNSLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGtleXNMKSB7XG4gICAgICAgICAgICBpZiAoIWRlZXBFcXVhbChsaHNba2V5XSwgcmhzW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gbGhzKSB7XG4gICAgICAgICAgICBpZiAoIShrZXkgaW4gcmhzKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBrZXlzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIHJocykge1xuICAgICAgICAgICAgaWYgKCEoa2V5IGluIGxocykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBrZXlzLmFkZChrZXkpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGtleXMpIHtcbiAgICAgICAgICAgIGlmICghZGVlcEVxdWFsKGxoc1trZXldLCByaHNba2V5XSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGNsb25lIFJlZ0V4cCAqL1xuZnVuY3Rpb24gY2xvbmVSZWdFeHAocmVnZXhwOiBSZWdFeHApOiBSZWdFeHAge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBSZWdFeHAocmVnZXhwLnNvdXJjZSwgcmVnZXhwLmZsYWdzKTtcbiAgICByZXN1bHQubGFzdEluZGV4ID0gcmVnZXhwLmxhc3RJbmRleDtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKiogQGludGVybmFsIGNsb25lIEFycmF5QnVmZmVyICovXG5mdW5jdGlvbiBjbG9uZUFycmF5QnVmZmVyKGFycmF5QnVmZmVyOiBBcnJheUJ1ZmZlcik6IEFycmF5QnVmZmVyIHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgQXJyYXlCdWZmZXIoYXJyYXlCdWZmZXIuYnl0ZUxlbmd0aCk7XG4gICAgbmV3IFVpbnQ4QXJyYXkocmVzdWx0KS5zZXQobmV3IFVpbnQ4QXJyYXkoYXJyYXlCdWZmZXIpKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKiogQGludGVybmFsIGNsb25lIERhdGFWaWV3ICovXG5mdW5jdGlvbiBjbG9uZURhdGFWaWV3KGRhdGFWaWV3OiBEYXRhVmlldyk6IERhdGFWaWV3IHtcbiAgICBjb25zdCBidWZmZXIgPSBjbG9uZUFycmF5QnVmZmVyKGRhdGFWaWV3LmJ1ZmZlcik7XG4gICAgcmV0dXJuIG5ldyBEYXRhVmlldyhidWZmZXIsIGRhdGFWaWV3LmJ5dGVPZmZzZXQsIGRhdGFWaWV3LmJ5dGVMZW5ndGgpO1xufVxuXG4vKiogQGludGVybmFsIGNsb25lIFR5cGVkQXJyYXkgKi9cbmZ1bmN0aW9uIGNsb25lVHlwZWRBcnJheTxUIGV4dGVuZHMgVHlwZWRBcnJheT4odHlwZWRBcnJheTogVCk6IFQge1xuICAgIGNvbnN0IGJ1ZmZlciA9IGNsb25lQXJyYXlCdWZmZXIodHlwZWRBcnJheS5idWZmZXIpO1xuICAgIHJldHVybiBuZXcgKHR5cGVkQXJyYXkuY29uc3RydWN0b3IgYXMgVHlwZWRBcnJheUNvbnN0cnVjdG9yKShidWZmZXIsIHR5cGVkQXJyYXkuYnl0ZU9mZnNldCwgdHlwZWRBcnJheS5sZW5ndGgpIGFzIFQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgY2hlY2sgbmVjZXNzYXJ5IHRvIHVwZGF0ZSAqL1xuZnVuY3Rpb24gbmVlZFVwZGF0ZShvbGRWYWx1ZTogdW5rbm93biwgbmV3VmFsdWU6IHVua25vd24sIGV4Y2VwdFVuZGVmaW5lZDogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgIGlmIChvbGRWYWx1ZSAhPT0gbmV3VmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIChleGNlcHRVbmRlZmluZWQgJiYgdW5kZWZpbmVkID09PSBvbGRWYWx1ZSk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIG1lcmdlIEFycmF5ICovXG5mdW5jdGlvbiBtZXJnZUFycmF5KHRhcmdldDogdW5rbm93bltdLCBzb3VyY2U6IHVua25vd25bXSk6IHVua25vd25bXSB7XG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHNvdXJjZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtpXTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBtZXJnZShvbGRWYWx1ZSwgc291cmNlW2ldKTtcbiAgICAgICAgIW5lZWRVcGRhdGUob2xkVmFsdWUsIG5ld1ZhbHVlLCBmYWxzZSkgfHwgKHRhcmdldFtpXSA9IG5ld1ZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuLyoqIEBpbnRlcm5hbCBtZXJnZSBTZXQgKi9cbmZ1bmN0aW9uIG1lcmdlU2V0KHRhcmdldDogU2V0PHVua25vd24+LCBzb3VyY2U6IFNldDx1bmtub3duPik6IFNldDx1bmtub3duPiB7XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHNvdXJjZSkge1xuICAgICAgICB0YXJnZXQuaGFzKGl0ZW0pIHx8IHRhcmdldC5hZGQobWVyZ2UodW5kZWZpbmVkLCBpdGVtKSk7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgbWVyZ2UgTWFwICovXG5mdW5jdGlvbiBtZXJnZU1hcCh0YXJnZXQ6IE1hcDx1bmtub3duLCB1bmtub3duPiwgc291cmNlOiBNYXA8dW5rbm93biwgdW5rbm93bj4pOiBNYXA8dW5rbm93biwgdW5rbm93bj4ge1xuICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIHNvdXJjZSkge1xuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldC5nZXQoayk7XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWVyZ2Uob2xkVmFsdWUsIHYpO1xuICAgICAgICAhbmVlZFVwZGF0ZShvbGRWYWx1ZSwgbmV3VmFsdWUsIGZhbHNlKSB8fCB0YXJnZXQuc2V0KGssIG5ld1ZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGRlZXBNZXJnZSgpICovXG5mdW5jdGlvbiBtZXJnZSh0YXJnZXQ6IHVua25vd24sIHNvdXJjZTogdW5rbm93bik6IHVua25vd24ge1xuICAgIGlmICh1bmRlZmluZWQgPT09IHNvdXJjZSB8fCB0YXJnZXQgPT09IHNvdXJjZSkge1xuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cbiAgICBpZiAoIWlzT2JqZWN0KHNvdXJjZSkpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICB9XG4gICAgLy8gUHJpbWl0aXZlIFdyYXBwZXIgT2JqZWN0cyAvIERhdGVcbiAgICBpZiAoc291cmNlLnZhbHVlT2YoKSAhPT0gc291cmNlKSB7XG4gICAgICAgIHJldHVybiBkZWVwRXF1YWwodGFyZ2V0LCBzb3VyY2UpID8gdGFyZ2V0IDogbmV3IChzb3VyY2UuY29uc3RydWN0b3IgYXMgT2JqZWN0Q29uc3RydWN0b3IpKHNvdXJjZS52YWx1ZU9mKCkpO1xuICAgIH1cbiAgICAvLyBSZWdFeHBcbiAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgIHJldHVybiBkZWVwRXF1YWwodGFyZ2V0LCBzb3VyY2UpID8gdGFyZ2V0IDogY2xvbmVSZWdFeHAoc291cmNlKTtcbiAgICB9XG4gICAgLy8gQXJyYXlCdWZmZXJcbiAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIGRlZXBFcXVhbCh0YXJnZXQsIHNvdXJjZSkgPyB0YXJnZXQgOiBjbG9uZUFycmF5QnVmZmVyKHNvdXJjZSk7XG4gICAgfVxuICAgIC8vIEFycmF5QnVmZmVyVmlld1xuICAgIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcoc291cmNlKSkge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IGlzVHlwZWRBcnJheShzb3VyY2UpID8gY2xvbmVUeXBlZEFycmF5KHNvdXJjZSkgOiBjbG9uZURhdGFWaWV3KHNvdXJjZSBhcyBEYXRhVmlldyk7XG4gICAgfVxuICAgIC8vIEFycmF5XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoc291cmNlKSkge1xuICAgICAgICByZXR1cm4gbWVyZ2VBcnJheShpc0FycmF5KHRhcmdldCkgPyB0YXJnZXQgOiBbXSwgc291cmNlKTtcbiAgICB9XG4gICAgLy8gU2V0XG4gICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIFNldCkge1xuICAgICAgICByZXR1cm4gbWVyZ2VTZXQodGFyZ2V0IGluc3RhbmNlb2YgU2V0ID8gdGFyZ2V0IDogbmV3IFNldCgpLCBzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBNYXBcbiAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgTWFwKSB7XG4gICAgICAgIHJldHVybiBtZXJnZU1hcCh0YXJnZXQgaW5zdGFuY2VvZiBNYXAgPyB0YXJnZXQgOiBuZXcgTWFwKCksIHNvdXJjZSk7XG4gICAgfVxuXG4gICAgY29uc3Qgb2JqID0gaXNPYmplY3QodGFyZ2V0KSA/IHRhcmdldCA6IHt9O1xuICAgIGlmIChzYW1lQ2xhc3ModGFyZ2V0LCBzb3VyY2UpKSB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHNvdXJjZSkpIHtcbiAgICAgICAgICAgIGlmICgnX19wcm90b19fJyAhPT0ga2V5KSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBvYmpba2V5XTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1lcmdlKG9sZFZhbHVlLCBzb3VyY2Vba2V5XSk7XG4gICAgICAgICAgICAgICAgIW5lZWRVcGRhdGUob2xkVmFsdWUsIG5ld1ZhbHVlLCB0cnVlKSB8fCAob2JqW2tleV0gPSBuZXdWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmICgnX19wcm90b19fJyAhPT0ga2V5KSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBvYmpba2V5XTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1lcmdlKG9sZFZhbHVlLCBzb3VyY2Vba2V5XSk7XG4gICAgICAgICAgICAgICAgIW5lZWRVcGRhdGUob2xkVmFsdWUsIG5ld1ZhbHVlLCB0cnVlKSB8fCAob2JqW2tleV0gPSBuZXdWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBAZW4gUmVjdXJzaXZlbHkgbWVyZ2VzIG93biBhbmQgaW5oZXJpdGVkIGVudW1lcmFibGUgc3RyaW5nIGtleWVkIHByb3BlcnRpZXMgb2Ygc291cmNlIG9iamVjdHMgaW50byB0aGUgZGVzdGluYXRpb24gb2JqZWN0LlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBruWGjeW4sOeahOODnuODvOOCuOOCkuWun+ihjFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVlcE1lcmdlPFQsIFMxLCBTMiwgUzMsIFM0LCBTNSwgUzYsIFM3LCBTOCwgUzk+KFxuICAgIHRhcmdldDogVCxcbiAgICAuLi5zb3VyY2VzOiBbUzEsIFMyPywgUzM/LCBTND8sIFM1PywgUzY/LCBTNz8sIFM4PywgUzk/LCAuLi51bmtub3duW11dXG4pOiBUICYgUzEgJiBTMiAmIFMzICYgUzQgJiBTNSAmIFM2ICYgUzcgJiBTOCAmIFM5O1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBNZXJnZTxYPih0YXJnZXQ6IHVua25vd24sIC4uLnNvdXJjZXM6IHVua25vd25bXSk6IFg7XG5leHBvcnQgZnVuY3Rpb24gZGVlcE1lcmdlKHRhcmdldDogdW5rbm93biwgLi4uc291cmNlczogdW5rbm93bltdKTogdW5rbm93biB7XG4gICAgbGV0IHJlc3VsdCA9IHRhcmdldDtcbiAgICBmb3IgKGNvbnN0IHNvdXJjZSBvZiBzb3VyY2VzKSB7XG4gICAgICAgIHJlc3VsdCA9IG1lcmdlKHJlc3VsdCwgc291cmNlKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENyZWF0ZSBkZWVwIGNvcHkgaW5zdGFuY2Ugb2Ygc291cmNlIG9iamVjdC5cbiAqIEBqYSDjg4fjgqPjg7zjg5fjgrPjg5Tjg7zjgqrjg5bjgrjjgqfjgq/jg4jjga7nlJ/miJBcbiAqXG4gKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9zdHJ1Y3R1cmVkQ2xvbmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBDb3B5PFQ+KHNyYzogVCk6IFQge1xuICAgIHJldHVybiBkZWVwTWVyZ2UodW5kZWZpbmVkLCBzcmMpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIE5pbCxcbiAgICBUeXBlLFxuICAgIENsYXNzLFxuICAgIENvbnN0cnVjdG9yLFxufSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBAZW4gTWl4aW4gY2xhc3MncyBiYXNlIGludGVyZmFjZS5cbiAqIEBqYSBNaXhpbiDjgq/jg6njgrnjga7ln7rlupXjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqlcbiAqL1xuZXhwb3J0IGRlY2xhcmUgY2xhc3MgTWl4aW5DbGFzcyB7XG4gICAgLyoqXG4gICAgICogQGVuIGNhbGwgbWl4aW4gc291cmNlIGNsYXNzJ3MgYHN1cGVyKClgLiA8YnI+XG4gICAgICogICAgIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBjYWxsZWQgZnJvbSBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEgTWl4aW4g44Kv44Op44K544Gu5Z+65bqV44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pIDxicj5cbiAgICAgKiAgICAg44Kz44Oz44K544OI44Op44Kv44K/44GL44KJ5ZG844G244GT44Go44KS5oOz5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3JjQ2xhc3NcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiB0YXJnZXQgY2xhc3MgbmFtZS4gZXgpIGZyb20gUzEgYXZhaWxhYmxlXG4gICAgICogIC0gYGphYCDjgrPjg7Pjgrnjg4jjg6njgq/jg4jjgZnjgovjgq/jg6njgrnlkI3jgpLmjIflrpogZXgpIFMxIOOBi+OCieaMh+WumuWPr+iDvVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gcGFyYW1ldGVyc1xuICAgICAqICAtIGBqYWAg44Kz44Oz44K544OI44Op44Kv44OI44Gr5L2/55So44GZ44KL5byV5pWwXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHN1cGVyPFQgZXh0ZW5kcyBDbGFzcz4oc3JjQ2xhc3M6IFQsIC4uLmFyZ3M6IENvbnN0cnVjdG9yUGFyYW1ldGVyczxUPik6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIGlucHV0IGNsYXNzIGlzIG1peGluZWQgKGV4Y2x1ZGluZyBvd24gY2xhc3MpLlxuICAgICAqIEBqYSDmjIflrprjgq/jg6njgrnjgYwgTWl4aW4g44GV44KM44Gm44GE44KL44GL56K66KqNICjoh6rouqvjga7jgq/jg6njgrnjga/lkKvjgb7jgozjgarjgYQpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWl4ZWRDbGFzc1xuICAgICAqICAtIGBlbmAgc2V0IHRhcmdldCBjbGFzcyBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5a++6LGh44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGlzTWl4ZWRXaXRoPFQgZXh0ZW5kcyBvYmplY3Q+KG1peGVkQ2xhc3M6IENvbnN0cnVjdG9yPFQ+KTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZW4gTWl4ZWQgc3ViIGNsYXNzIGNvbnN0cnVjdG9yIGRlZmluaXRpb25zLlxuICogQGphIOWQiOaIkOOBl+OBn+OCteODluOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1peGluQ29uc3RydWN0b3I8QiBleHRlbmRzIENsYXNzLCBVIGV4dGVuZHMgb2JqZWN0PiBleHRlbmRzIFR5cGU8VT4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBjb25zdHJ1Y3RvclxuICAgICAqIEBqYSDjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBiYXNlIGNsYXNzIGFyZ3VtZW50c1xuICAgICAqICAtIGBqYWAg5Z+65bqV44Kv44Op44K544Gr5oyH5a6a44GX44Gf5byV5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHVuaW9uIHR5cGUgb2YgY2xhc3NlcyB3aGVuIGNhbGxpbmcgW1ttaXhpbnNdXSgpXG4gICAgICogIC0gYGphYCBbW21peGluc11dKCkg44Gr5rih44GX44Gf44Kv44Op44K544Gu6ZuG5ZCIXG4gICAgICovXG4gICAgbmV3KC4uLmFyZ3M6IENvbnN0cnVjdG9yUGFyYW1ldGVyczxCPik6IFU7XG59XG5cbi8qKlxuICogQGVuIERlZmluaXRpb24gb2YgW1tzZXRNaXhDbGFzc0F0dHJpYnV0ZV1dIGZ1bmN0aW9uJ3MgYXJndW1lbnRzLlxuICogQGphIFtbc2V0TWl4Q2xhc3NBdHRyaWJ1dGVdXSDjga7lj5bjgorjgYbjgovlvJXmlbDlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNaXhDbGFzc0F0dHJpYnV0ZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFN1cHByZXNzIHByb3ZpZGluZyBjb25zdHJ1Y3Rvci10cmFwIGZvciB0aGUgbWl4aW4gc291cmNlIGNsYXNzLiBJbiB0aGlzIGNhc2UsIGBpc01peGVkV2l0aGAsIGBpbnN0YW5jZW9mYCBhbHNvIGJlY29tZXMgaW52YWxpZC4gKGZvciBpbXByb3ZpbmcgcGVyZm9ybWFuY2UpXG4gICAgICogQGphIE1peGluIFNvdXJjZSDjgq/jg6njgrnjgavlr77jgZfjgaYsIOOCs+ODs+OCueODiOODqeOCr+OCv+ODiOODqeODg+ODl+OCkuaKkeatoi4g44GT44KM44KS5oyH5a6a44GX44Gf5aC05ZCILCBgaXNNaXhlZFdpdGhgLCBgaW5zdGFuY2VvZmAg44KC54Sh5Yq544Gr44Gq44KLLiAo44OR44OV44Kp44O844Oe44Oz44K55pS55ZaEKVxuICAgICAqL1xuICAgIHByb3RvRXh0ZW5kc09ubHk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0dXAgW1N5bWJvbC5oYXNJbnN0YW5jZV0gcHJvcGVydHkuIDxicj5cbiAgICAgKiAgICAgVGhlIGNsYXNzIGRlc2lnbmF0ZWQgYXMgYSBzb3VyY2Ugb2YgW1ttaXhpbnNdXSgpIGhhcyBbU3ltYm9sLmhhc0luc3RhbmNlXSBwcm9wZXJ0eSBpbXBsaWNpdGx5LiA8YnI+XG4gICAgICogICAgIEl0J3MgdXNlZCB0byBhdm9pZCBiZWNvbWluZyB0aGUgYmVoYXZpb3IgYGluc3RhbmNlb2ZgIGRvZXNuJ3QgaW50ZW5kIHdoZW4gdGhlIGNsYXNzIGlzIGV4dGVuZGVkIGZyb20gdGhlIG1peGluZWQgY2xhc3MgdGhlIG90aGVyIHBsYWNlLlxuICAgICAqIEBqYSBbU3ltYm9sLmhhc0luc3RhbmNlXSDjg5fjg63jg5Hjg4bjgqPoqK3lrpo8YnI+XG4gICAgICogICAgIFtbbWl4aW5zXV0oKSDjga7jgr3jg7zjgrnjgavmjIflrprjgZXjgozjgZ/jgq/jg6njgrnjga8gW1N5bWJvbC5oYXNJbnN0YW5jZV0g44KS5pqX6buZ55qE44Gr5YKZ44GI44KL44Gf44KBPGJyPlxuICAgICAqICAgICDjgZ3jga7jgq/jg6njgrnjgYzku5bjgafntpnmib/jgZXjgozjgabjgYTjgovloLTlkIggYGluc3RhbmNlb2ZgIOOBjOaEj+Wbs+OBl+OBquOBhOaMr+OCi+iInuOBhOOBqOOBquOCi+OBruOCkumBv+OBkeOCi+OBn+OCgeOBq+S9v+eUqOOBmeOCiy5cbiAgICAgKi9cbiAgICBpbnN0YW5jZU9mOiAoKGluc3Q6IG9iamVjdCkgPT4gYm9vbGVhbikgfCBOaWw7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9vYmpQcm90b3R5cGUgICAgID0gT2JqZWN0LnByb3RvdHlwZTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2luc3RhbmNlT2YgICAgICAgPSBGdW5jdGlvbi5wcm90b3R5cGVbU3ltYm9sLmhhc0luc3RhbmNlXTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX292ZXJyaWRlICAgICAgICAgPSBTeW1ib2woJ292ZXJyaWRlJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9pc0luaGVyaXRlZCAgICAgID0gU3ltYm9sKCdpcy1pbmhlcml0ZWQnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NvbnN0cnVjdG9ycyAgICAgPSBTeW1ib2woJ2NvbnN0cnVjdG9ycycpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY2xhc3NCYXNlICAgICAgICA9IFN5bWJvbCgnY2xhc3MtYmFzZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY2xhc3NTb3VyY2VzICAgICA9IFN5bWJvbCgnY2xhc3Mtc291cmNlcycpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvdG9FeHRlbmRzT25seSA9IFN5bWJvbCgncHJvdG8tZXh0ZW5kcy1vbmx5Jyk7XG5cbi8qKiBAaW50ZXJuYWwgY29weSBwcm9wZXJ0aWVzIGNvcmUgKi9cbmZ1bmN0aW9uIHJlZmxlY3RQcm9wZXJ0aWVzKHRhcmdldDogb2JqZWN0LCBzb3VyY2U6IG9iamVjdCwga2V5OiBzdHJpbmcgfCBzeW1ib2wpOiB2b2lkIHtcbiAgICBpZiAobnVsbCA9PSB0YXJnZXRba2V5XSkge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc291cmNlLCBrZXkpIGFzIFByb3BlcnR5RGVjb3JhdG9yKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgb2JqZWN0IHByb3BlcnRpZXMgY29weSBtZXRob2QgKi9cbmZ1bmN0aW9uIGNvcHlQcm9wZXJ0aWVzKHRhcmdldDogb2JqZWN0LCBzb3VyY2U6IG9iamVjdCk6IHZvaWQge1xuICAgIHNvdXJjZSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhzb3VyY2UpXG4gICAgICAgIC5maWx0ZXIoa2V5ID0+ICEvKHByb3RvdHlwZXxuYW1lfGNvbnN0cnVjdG9yKS8udGVzdChrZXkpKVxuICAgICAgICAuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgcmVmbGVjdFByb3BlcnRpZXModGFyZ2V0LCBzb3VyY2UsIGtleSk7XG4gICAgICAgIH0pO1xuICAgIHNvdXJjZSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHNvdXJjZSlcbiAgICAgICAgLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIHJlZmxlY3RQcm9wZXJ0aWVzKHRhcmdldCwgc291cmNlLCBrZXkpO1xuICAgICAgICB9KTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNldE1peENsYXNzQXR0cmlidXRlKHRhcmdldCwgJ2luc3RhbmNlT2YnKSAqL1xuZnVuY3Rpb24gc2V0SW5zdGFuY2VPZjxUIGV4dGVuZHMgb2JqZWN0Pih0YXJnZXQ6IENvbnN0cnVjdG9yPFQ+LCBtZXRob2Q6ICgoaW5zdDogb2JqZWN0KSA9PiBib29sZWFuKSB8IE5pbCk6IHZvaWQge1xuICAgIGNvbnN0IGJlaGF2aW91ciA9IG1ldGhvZCB8fCAobnVsbCA9PT0gbWV0aG9kID8gdW5kZWZpbmVkIDogKChpOiBvYmplY3QpID0+IE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZi5jYWxsKHRhcmdldC5wcm90b3R5cGUsIGkpKSk7XG4gICAgY29uc3QgYXBwbGllZCA9IGJlaGF2aW91ciAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgX292ZXJyaWRlKTtcbiAgICBpZiAoIWFwcGxpZWQpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGFyZ2V0LCB7XG4gICAgICAgICAgICBbU3ltYm9sLmhhc0luc3RhbmNlXToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBiZWhhdmlvdXIsXG4gICAgICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW19vdmVycmlkZV06IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogYmVoYXZpb3VyID8gdHJ1ZSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gU2V0IHRoZSBNaXhpbiBjbGFzcyBhdHRyaWJ1dGUuXG4gKiBAamEgTWl4aW4g44Kv44Op44K544Gr5a++44GX44Gm5bGe5oCn44KS6Kit5a6aXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAvLyAncHJvdG9FeHRlbmRPbmx5J1xuICogY2xhc3MgQmFzZSB7IGNvbnN0cnVjdG9yKGEsIGIpIHt9IH07XG4gKiBjbGFzcyBNaXhBIHsgfTtcbiAqIHNldE1peENsYXNzQXR0cmlidXRlKE1peEEsICdwcm90b0V4dGVuZHNPbmx5Jyk7ICAvLyBmb3IgaW1wcm92aW5nIGNvbnN0cnVjdGlvbiBwZXJmb3JtYW5jZVxuICogY2xhc3MgTWl4QiB7IGNvbnN0cnVjdG9yKGMsIGQpIHt9IH07XG4gKlxuICogY2xhc3MgTWl4aW5DbGFzcyBleHRlbmRzIG1peGlucyhCYXNlLCBNaXhBLCBNaXhCKSB7XG4gKiAgICAgY29uc3RydWN0b3IoYSwgYiwgYywgZCl7XG4gKiAgICAgICAgIC8vIGNhbGxpbmcgYEJhc2VgIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHN1cGVyKGEsIGIpO1xuICpcbiAqICAgICAgICAgLy8gY2FsbGluZyBNaXhpbiBjbGFzcydzIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QSk7ICAgICAgICAvLyBubyBhZmZlY3RcbiAqICAgICAgICAgdGhpcy5zdXBlcihNaXhCLCBjLCBkKTtcbiAqICAgICB9XG4gKiB9XG4gKlxuICogY29uc3QgbWl4ZWQgPSBuZXcgTWl4aW5DbGFzcygpO1xuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBNaXhBKTsgICAgLy8gZmFsc2VcbiAqIGNvbnNvbGUubG9nKG1peGVkLmlzTWl4ZWRXaXRoKE1peEEpKTsgIC8vIGZhbHNlXG4gKlxuICogLy8gJ2luc3RhbmNlT2YnXG4gKiBjbGFzcyBCYXNlIHt9O1xuICogY2xhc3MgU291cmNlIHt9O1xuICogY2xhc3MgTWl4aW5DbGFzcyBleHRlbmRzIG1peGlucyhCYXNlLCBTb3VyY2UpIHt9O1xuICpcbiAqIGNsYXNzIE90aGVyIGV4dGVuZHMgU291cmNlIHt9O1xuICpcbiAqIGNvbnN0IG90aGVyID0gbmV3IE90aGVyKCk7XG4gKiBjb25zdCBtaXhlZCA9IG5ldyBNaXhpbkNsYXNzKCk7XG4gKiBjb25zb2xlLmxvZyhvdGhlciBpbnN0YW5jZW9mIFNvdXJjZSk7ICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhvdGhlciBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE1peGluQ2xhc3MpOyAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIEJhc2UpOyAgICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIFNvdXJjZSk7ICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyB0cnVlID8/P1xuICpcbiAqIHNldE1peENsYXNzQXR0cmlidXRlKE90aGVyLCAnaW5zdGFuY2VPZicpOyAvLyBvciBzZXRNaXhDbGFzc0F0dHJpYnV0ZShPdGhlciwgJ2luc3RhbmNlT2YnLCBudWxsKTtcbiAqIGNvbnNvbGUubG9nKG90aGVyIGluc3RhbmNlb2YgU291cmNlKTsgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG90aGVyIGluc3RhbmNlb2YgT3RoZXIpOyAgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgT3RoZXIpOyAgICAgICAgIC8vIGZhbHNlICFcbiAqXG4gKiAvLyBbQmVzdCBQcmFjdGljZV0gSWYgeW91IGRlY2xhcmUgdGhlIGRlcml2ZWQtY2xhc3MgZnJvbSBtaXhpbiwgeW91IHNob3VsZCBjYWxsIHRoZSBmdW5jdGlvbiBmb3IgYXZvaWRpbmcgYGluc3RhbmNlb2ZgIGxpbWl0YXRpb24uXG4gKiBjbGFzcyBEZXJpdmVkQ2xhc3MgZXh0ZW5kcyBNaXhpbkNsYXNzIHt9XG4gKiBzZXRNaXhDbGFzc0F0dHJpYnV0ZShEZXJpdmVkQ2xhc3MsICdpbnN0YW5jZU9mJyk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHNldCB0YXJnZXQgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg6Kit5a6a5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcGFyYW0gYXR0clxuICogIC0gYGVuYDpcbiAqICAgIC0gYHByb3RvRXh0ZW5kc09ubHlgOiBTdXBwcmVzcyBwcm92aWRpbmcgY29uc3RydWN0b3ItdHJhcCBmb3IgdGhlIG1peGluIHNvdXJjZSBjbGFzcy4gKGZvciBpbXByb3ZpbmcgcGVyZm9ybWFuY2UpXG4gKiAgICAtIGBpbnN0YW5jZU9mYCAgICAgIDogZnVuY3Rpb24gYnkgdXNpbmcgW1N5bWJvbC5oYXNJbnN0YW5jZV0gPGJyPlxuICogICAgICAgICAgICAgICAgICAgICAgICAgIERlZmF1bHQgYmVoYXZpb3VyIGlzIGB7IHJldHVybiB0YXJnZXQucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5zdGFuY2UpIH1gXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgSWYgc2V0IGBudWxsYCwgZGVsZXRlIFtTeW1ib2wuaGFzSW5zdGFuY2VdIHByb3BlcnR5LlxuICogIC0gYGphYDpcbiAqICAgIC0gYHByb3RvRXh0ZW5kc09ubHlgOiBNaXhpbiBTb3VyY2Ug44Kv44Op44K544Gr5a++44GX44GmLCDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jg4jjg6njg4Pjg5fjgpLmipHmraIgKOODkeODleOCqeODvOODnuODs+OCueaUueWWhClcbiAqICAgIC0gYGluc3RhbmNlT2ZgICAgICAgOiBbU3ltYm9sLmhhc0luc3RhbmNlXSDjgYzkvb/nlKjjgZnjgovplqLmlbDjgpLmjIflrpogPGJyPlxuICogICAgICAgICAgICAgICAgICAgICAgICAgIOaXouWumuOBp+OBryBgeyByZXR1cm4gdGFyZ2V0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGluc3RhbmNlKSB9YCDjgYzkvb/nlKjjgZXjgozjgotcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIGBudWxsYCDmjIflrprjgpLjgZnjgovjgaggW1N5bWJvbC5oYXNJbnN0YW5jZV0g44OX44Ot44OR44OG44Kj44KS5YmK6Zmk44GZ44KLXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRNaXhDbGFzc0F0dHJpYnV0ZTxUIGV4dGVuZHMgb2JqZWN0LCBVIGV4dGVuZHMga2V5b2YgTWl4Q2xhc3NBdHRyaWJ1dGU+KFxuICAgIHRhcmdldDogQ29uc3RydWN0b3I8VD4sXG4gICAgYXR0cjogVSxcbiAgICBtZXRob2Q/OiBNaXhDbGFzc0F0dHJpYnV0ZVtVXVxuKTogdm9pZCB7XG4gICAgc3dpdGNoIChhdHRyKSB7XG4gICAgICAgIGNhc2UgJ3Byb3RvRXh0ZW5kc09ubHknOlxuICAgICAgICAgICAgdGFyZ2V0W19wcm90b0V4dGVuZHNPbmx5XSA9IHRydWU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnaW5zdGFuY2VPZic6XG4gICAgICAgICAgICBzZXRJbnN0YW5jZU9mKHRhcmdldCwgbWV0aG9kKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBNaXhpbiBmdW5jdGlvbiBmb3IgbXVsdGlwbGUgaW5oZXJpdGFuY2UuIDxicj5cbiAqICAgICBSZXNvbHZpbmcgdHlwZSBzdXBwb3J0IGZvciBtYXhpbXVtIDEwIGNsYXNzZXMuXG4gKiBAamEg5aSa6YeN57aZ5om/44Gu44Gf44KB44GuIE1peGluIDxicj5cbiAqICAgICDmnIDlpKcgMTAg44Kv44Op44K544Gu5Z6L6Kej5rG644KS44K144Od44O844OIXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjbGFzcyBCYXNlIHsgY29uc3RydWN0b3IoYSwgYikge30gfTtcbiAqIGNsYXNzIE1peEEgeyBjb25zdHJ1Y3RvcihhLCBiKSB7fSB9O1xuICogY2xhc3MgTWl4QiB7IGNvbnN0cnVjdG9yKGMsIGQpIHt9IH07XG4gKlxuICogY2xhc3MgTWl4aW5DbGFzcyBleHRlbmRzIG1peGlucyhCYXNlLCBNaXhBLCBNaXhCKSB7XG4gKiAgICAgY29uc3RydWN0b3IoYSwgYiwgYywgZCl7XG4gKiAgICAgICAgIC8vIGNhbGxpbmcgYEJhc2VgIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHN1cGVyKGEsIGIpO1xuICpcbiAqICAgICAgICAgLy8gY2FsbGluZyBNaXhpbiBjbGFzcydzIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QSwgYSwgYik7XG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QiwgYywgZCk7XG4gKiAgICAgfVxuICogfVxuICogYGBgXG4gKlxuICogQHBhcmFtIGJhc2VcbiAqICAtIGBlbmAgcHJpbWFyeSBiYXNlIGNsYXNzLiBzdXBlcihhcmdzKSBpcyB0aGlzIGNsYXNzJ3Mgb25lLlxuICogIC0gYGphYCDln7rlupXjgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr8uIOWQjOWQjeODl+ODreODkeODhuOCoywg44Oh44K944OD44OJ44Gv5pyA5YSq5YWI44GV44KM44KLLiBzdXBlcihhcmdzKSDjga/jgZPjga7jgq/jg6njgrnjga7jgoLjga7jgYzmjIflrprlj6/og70uXG4gKiBAcGFyYW0gc291cmNlc1xuICogIC0gYGVuYCBtdWx0aXBsZSBleHRlbmRzIGNsYXNzXG4gKiAgLSBgamFgIOaLoeW8teOCr+ODqeOCueOCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHJldHVybnNcbiAqICAtIGBlbmAgbWl4aW5lZCBjbGFzcyBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDlkIjmiJDjgZXjgozjgZ/jgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1peGluczxcbiAgICBCIGV4dGVuZHMgQ2xhc3MsXG4gICAgUzEgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzIgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzMgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzQgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzUgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzYgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzcgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzggZXh0ZW5kcyBvYmplY3QsXG4gICAgUzkgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGJhc2U6IEIsXG4gICAgLi4uc291cmNlczogW1xuICAgICAgICBDb25zdHJ1Y3RvcjxTMT4sXG4gICAgICAgIENvbnN0cnVjdG9yPFMyPj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFMzPj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM0Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM1Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM2Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM3Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM4Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM5Pj8sXG4gICAgICAgIC4uLmFueVtdXG4gICAgXSk6IE1peGluQ29uc3RydWN0b3I8QiwgTWl4aW5DbGFzcyAmIEluc3RhbmNlVHlwZTxCPiAmIFMxICYgUzIgJiBTMyAmIFM0ICYgUzUgJiBTNiAmIFM3ICYgUzggJiBTOT4ge1xuXG4gICAgbGV0IF9oYXNTb3VyY2VDb25zdHJ1Y3RvciA9IGZhbHNlO1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uYW1pbmctY29udmVudGlvblxuICAgIGNsYXNzIF9NaXhpbkJhc2UgZXh0ZW5kcyAoYmFzZSBhcyB1bmtub3duIGFzIENvbnN0cnVjdG9yPE1peGluQ2xhc3M+KSB7XG5cbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBbX2NvbnN0cnVjdG9yc106IE1hcDxDb25zdHJ1Y3RvcjxvYmplY3Q+LCBVbmtub3duRnVuY3Rpb24gfCBudWxsPjtcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBbX2NsYXNzQmFzZV06IENvbnN0cnVjdG9yPG9iamVjdD47XG5cbiAgICAgICAgY29uc3RydWN0b3IoLi4uYXJnczogdW5rbm93bltdKSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29uc3RydWN0b3Itc3VwZXJcbiAgICAgICAgICAgIHN1cGVyKC4uLmFyZ3MpO1xuXG4gICAgICAgICAgICBjb25zdCBjb25zdHJ1Y3RvcnMgPSBuZXcgTWFwPENvbnN0cnVjdG9yPG9iamVjdD4sIFVua25vd25GdW5jdGlvbj4oKTtcbiAgICAgICAgICAgIHRoaXNbX2NvbnN0cnVjdG9yc10gPSBjb25zdHJ1Y3RvcnM7XG4gICAgICAgICAgICB0aGlzW19jbGFzc0Jhc2VdID0gYmFzZTtcblxuICAgICAgICAgICAgaWYgKF9oYXNTb3VyY2VDb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc3JjQ2xhc3Mgb2Ygc291cmNlcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXNyY0NsYXNzW19wcm90b0V4dGVuZHNPbmx5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFuZGxlciA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBseTogKHRhcmdldDogdW5rbm93biwgdGhpc29iajogdW5rbm93biwgYXJnbGlzdDogdW5rbm93bltdKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9iaiA9IG5ldyBzcmNDbGFzcyguLi5hcmdsaXN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29weVByb3BlcnRpZXModGhpcywgb2JqKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHJveHkgZm9yICdjb25zdHJ1Y3QnIGFuZCBjYWNoZSBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3RydWN0b3JzLnNldChzcmNDbGFzcywgbmV3IFByb3h5KHNyY0NsYXNzLCBoYW5kbGVyIGFzIFByb3h5SGFuZGxlcjxvYmplY3Q+KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBwcm90ZWN0ZWQgc3VwZXI8VCBleHRlbmRzIENsYXNzPihzcmNDbGFzczogVCwgLi4uYXJnczogQ29uc3RydWN0b3JQYXJhbWV0ZXJzPFQ+KTogdGhpcyB7XG4gICAgICAgICAgICBjb25zdCBtYXAgPSB0aGlzW19jb25zdHJ1Y3RvcnNdO1xuICAgICAgICAgICAgY29uc3QgY3RvciA9IG1hcC5nZXQoc3JjQ2xhc3MpO1xuICAgICAgICAgICAgaWYgKGN0b3IpIHtcbiAgICAgICAgICAgICAgICBjdG9yLmNhbGwodGhpcywgLi4uYXJncyk7XG4gICAgICAgICAgICAgICAgbWFwLnNldChzcmNDbGFzcywgbnVsbCk7ICAgIC8vIHByZXZlbnQgY2FsbGluZyB0d2ljZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgaXNNaXhlZFdpdGg8VCBleHRlbmRzIG9iamVjdD4oc3JjQ2xhc3M6IENvbnN0cnVjdG9yPFQ+KTogYm9vbGVhbiB7XG4gICAgICAgICAgICBpZiAodGhpcy5jb25zdHJ1Y3RvciA9PT0gc3JjQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXNbX2NsYXNzQmFzZV0gPT09IHNyY0NsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzW19jbGFzc1NvdXJjZXNdLnJlZHVjZSgocCwgYykgPT4gcCB8fCAoc3JjQ2xhc3MgPT09IGMpLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgc3RhdGljIFtTeW1ib2wuaGFzSW5zdGFuY2VdKGluc3RhbmNlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mLmNhbGwoX01peGluQmFzZS5wcm90b3R5cGUsIGluc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBbX2lzSW5oZXJpdGVkXTxUIGV4dGVuZHMgb2JqZWN0PihzcmNDbGFzczogQ29uc3RydWN0b3I8VD4pOiBib29sZWFuIHtcbiAgICAgICAgICAgIGNvbnN0IGN0b3JzID0gdGhpc1tfY29uc3RydWN0b3JzXTtcbiAgICAgICAgICAgIGlmIChjdG9ycy5oYXMoc3JjQ2xhc3MpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGN0b3Igb2YgY3RvcnMua2V5cygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZi5jYWxsKHNyY0NsYXNzLCBjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBwcml2YXRlIGdldCBbX2NsYXNzU291cmNlc10oKTogQ29uc3RydWN0b3I8b2JqZWN0PltdIHtcbiAgICAgICAgICAgIHJldHVybiBbLi4udGhpc1tfY29uc3RydWN0b3JzXS5rZXlzKCldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBzcmNDbGFzcyBvZiBzb3VyY2VzKSB7XG4gICAgICAgIC8vIHByb3ZpZGUgY3VzdG9tIGluc3RhbmNlb2ZcbiAgICAgICAgY29uc3QgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc3JjQ2xhc3MsIFN5bWJvbC5oYXNJbnN0YW5jZSk7XG4gICAgICAgIGlmICghZGVzYyB8fCBkZXNjLndyaXRhYmxlKSB7XG4gICAgICAgICAgICBjb25zdCBvcmdJbnN0YW5jZU9mID0gZGVzYyA/IHNyY0NsYXNzW1N5bWJvbC5oYXNJbnN0YW5jZV0gOiBfaW5zdGFuY2VPZjtcbiAgICAgICAgICAgIHNldEluc3RhbmNlT2Yoc3JjQ2xhc3MsIChpbnN0OiBvYmplY3QpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3JnSW5zdGFuY2VPZi5jYWxsKHNyY0NsYXNzLCBpbnN0KSB8fCAoKG51bGwgIT0gaW5zdCAmJiBpbnN0W19pc0luaGVyaXRlZF0pID8gaW5zdFtfaXNJbmhlcml0ZWRdKHNyY0NsYXNzKSA6IGZhbHNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIHByb3ZpZGUgcHJvdG90eXBlXG4gICAgICAgIGNvcHlQcm9wZXJ0aWVzKF9NaXhpbkJhc2UucHJvdG90eXBlLCBzcmNDbGFzcy5wcm90b3R5cGUpO1xuICAgICAgICBsZXQgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHNyY0NsYXNzLnByb3RvdHlwZSk7XG4gICAgICAgIHdoaWxlIChfb2JqUHJvdG90eXBlICE9PSBwYXJlbnQpIHtcbiAgICAgICAgICAgIGNvcHlQcm9wZXJ0aWVzKF9NaXhpbkJhc2UucHJvdG90eXBlLCBwYXJlbnQpO1xuICAgICAgICAgICAgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHBhcmVudCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2hlY2sgY29uc3RydWN0b3JcbiAgICAgICAgaWYgKCFfaGFzU291cmNlQ29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIF9oYXNTb3VyY2VDb25zdHJ1Y3RvciA9ICFzcmNDbGFzc1tfcHJvdG9FeHRlbmRzT25seV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gX01peGluQmFzZSBhcyBhbnk7XG59XG4iLCJpbXBvcnQgeyBkZWVwRXF1YWwgfSBmcm9tICcuL2RlZXAtY2lyY3VpdCc7XG5pbXBvcnQge1xuICAgIE5pbCxcbiAgICBXcml0YWJsZSxcbiAgICBpc0FycmF5LFxuICAgIGlzT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG59IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgdmVyaWZ5IH0gZnJvbSAnLi92ZXJpZnknO1xuXG4vKipcbiAqIEBlbiBDaGVjayB3aGV0aGVyIGlucHV0IHNvdXJjZSBoYXMgYSBwcm9wZXJ0eS5cbiAqIEBqYSDlhaXlipvlhYPjgYzjg5fjg63jg5Hjg4bjgqPjgpLmjIHjgaPjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXMoc3JjOiB1bmtub3duLCBwcm9wTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIG51bGwgIT0gc3JjICYmIGlzT2JqZWN0KHNyYykgJiYgKHByb3BOYW1lIGluIHNyYyk7XG59XG5cbi8qKlxuICogQGVuIEdldCBzaGFsbG93IGNvcHkgb2YgYHRhcmdldGAgd2hpY2ggaGFzIG9ubHkgYHBpY2tLZXlzYC5cbiAqIEBqYSBgcGlja0tleXNgIOOBp+aMh+WumuOBleOCjOOBn+ODl+ODreODkeODhuOCo+OBruOBv+OCkuaMgeOBpCBgdGFyZ2V0YCDjga4gU2hhbGxvdyBDb3B5IOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgY29weSBzb3VyY2Ugb2JqZWN0XG4gKiAgLSBgamFgIOOCs+ODlOODvOWFg+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIHBpY2tLZXlzXG4gKiAgLSBgZW5gIGNvcHkgdGFyZ2V0IGtleXNcbiAqICAtIGBqYWAg44Kz44OU44O85a++6LGh44Gu44Kt44O85LiA6KanXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwaWNrPFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBrZXlvZiBUPih0YXJnZXQ6IFQsIC4uLnBpY2tLZXlzOiBLW10pOiBXcml0YWJsZTxQaWNrPFQsIEs+PiB7XG4gICAgdmVyaWZ5KCd0eXBlT2YnLCAnb2JqZWN0JywgdGFyZ2V0KTtcbiAgICByZXR1cm4gcGlja0tleXMucmVkdWNlKChvYmosIGtleSkgPT4ge1xuICAgICAgICBrZXkgaW4gdGFyZ2V0ICYmIChvYmpba2V5XSA9IHRhcmdldFtrZXldKTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9LCB7fSBhcyBXcml0YWJsZTxQaWNrPFQsIEs+Pik7XG59XG5cbi8qKlxuICogQGVuIEdldCBzaGFsbG93IGNvcHkgb2YgYHRhcmdldGAgd2l0aG91dCBgb21pdEtleXNgLlxuICogQGphIGBvbWl0S2V5c2Ag44Gn5oyH5a6a44GV44KM44Gf44OX44Ot44OR44OG44Kj5Lul5aSW44Gu44Kt44O844KS5oyB44GkIGB0YXJnZXRgIOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBjb3B5IHNvdXJjZSBvYmplY3RcbiAqICAtIGBqYWAg44Kz44OU44O85YWD44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gb21pdEtleXNcbiAqICAtIGBlbmAgb21pdCB0YXJnZXQga2V5c1xuICogIC0gYGphYCDliYrpmaTlr77osaHjga7jgq3jg7zkuIDopqdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9taXQ8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIGtleW9mIFQ+KHRhcmdldDogVCwgLi4ub21pdEtleXM6IEtbXSk6IFdyaXRhYmxlPE9taXQ8VCwgSz4+IHtcbiAgICB2ZXJpZnkoJ3R5cGVPZicsICdvYmplY3QnLCB0YXJnZXQpO1xuICAgIGNvbnN0IG9iaiA9IHt9IGFzIFdyaXRhYmxlPE9taXQ8VCwgSz4+O1xuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRhcmdldCkpIHtcbiAgICAgICAgIW9taXRLZXlzLmluY2x1ZGVzKGtleSBhcyBLKSAmJiAob2JqW2tleV0gPSB0YXJnZXRba2V5XSk7XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogQGVuIEludmVydCB0aGUga2V5cyBhbmQgdmFsdWVzIG9mIGFuIG9iamVjdC4gVGhlIHZhbHVlcyBtdXN0IGJlIHNlcmlhbGl6YWJsZS5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7jgq3jg7zjgajlgKTjgpLpgIbou6LjgZnjgosuIOOBmeOBueOBpuOBruWApOOBjOODpuODi+ODvOOCr+OBp+OBguOCi+OBk+OBqOOBjOWJjeaPkFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IG9iamVjdFxuICogIC0gYGphYCDlr77osaHjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGludmVydDxUIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0Pih0YXJnZXQ6IG9iamVjdCk6IFQge1xuICAgIGNvbnN0IHJlc3VsdCA9IHt9O1xuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRhcmdldCkpIHtcbiAgICAgICAgcmVzdWx0W3RhcmdldFtrZXldXSA9IGtleTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdCBhcyBUO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgc2hhbGxvdyBjb3B5IG9mIGRpZmZlcmVuY2UgYmV0d2VlbiBgYmFzZWAgYW5kIGBzcmNgLlxuICogQGphIGBiYXNlYCDjgaggYHNyY2Ag44Gu5beu5YiG44OX44Ot44OR44OG44Kj44KS44KC44Gk44Kq44OW44K444Kn44Kv44OI44GuIFNoYWxsb3cgQ29weSDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmFzZVxuICogIC0gYGVuYCBiYXNlIG9iamVjdFxuICogIC0gYGphYCDln7rmupbjgajjgarjgovjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIG9iamVjdFxuICogIC0gYGphYCDjgrPjg5Tjg7zlhYPjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpZmY8VCBleHRlbmRzIG9iamVjdD4oYmFzZTogVCwgc3JjOiBQYXJ0aWFsPFQ+KTogUGFydGlhbDxUPiB7XG4gICAgdmVyaWZ5KCd0eXBlT2YnLCAnb2JqZWN0JywgYmFzZSk7XG4gICAgdmVyaWZ5KCd0eXBlT2YnLCAnb2JqZWN0Jywgc3JjKTtcblxuICAgIGNvbnN0IHJldHZhbDogUGFydGlhbDxUPiA9IHt9O1xuXG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc3JjKSkge1xuICAgICAgICBpZiAoIWRlZXBFcXVhbChiYXNlW2tleV0sIHNyY1trZXldKSkge1xuICAgICAgICAgICAgcmV0dmFsW2tleV0gPSBzcmNba2V5XTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8qKlxuICogQGVuIEdldCBzaGFsbG93IGNvcHkgb2YgYGJhc2VgIHdpdGhvdXQgYGRyb3BWYWx1ZWAuXG4gKiBAamEgYGRyb3BWYWx1ZWAg44Gn5oyH5a6a44GV44KM44Gf44OX44Ot44OR44OG44Kj5YCk5Lul5aSW44Gu44Kt44O844KS5oyB44GkIGB0YXJnZXRgIOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGJhc2VcbiAqICAtIGBlbmAgYmFzZSBvYmplY3RcbiAqICAtIGBqYWAg5Z+65rqW44Go44Gq44KL44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gZHJvcFZhbHVlc1xuICogIC0gYGVuYCB0YXJnZXQgdmFsdWUuIGRlZmF1bHQ6IGB1bmRlZmluZWRgLlxuICogIC0gYGphYCDlr77osaHjga7lgKQuIOaXouWumuWApDogYHVuZGVmaW5lZGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRyb3A8VCBleHRlbmRzIG9iamVjdD4oYmFzZTogVCwgLi4uZHJvcFZhbHVlczogdW5rbm93bltdKTogUGFydGlhbDxUPiB7XG4gICAgdmVyaWZ5KCd0eXBlT2YnLCAnb2JqZWN0JywgYmFzZSk7XG5cbiAgICBjb25zdCB2YWx1ZXMgPSBbLi4uZHJvcFZhbHVlc107XG4gICAgaWYgKCF2YWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgIHZhbHVlcy5wdXNoKHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgY29uc3QgcmV0dmFsOiBQYXJ0aWFsPFQ+ID0geyAuLi5iYXNlIH07XG5cbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhiYXNlKSkge1xuICAgICAgICBmb3IgKGNvbnN0IHZhbCBvZiB2YWx1ZXMpIHtcbiAgICAgICAgICAgIGlmIChkZWVwRXF1YWwodmFsLCByZXR2YWxba2V5XSkpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgcmV0dmFsW2tleV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKipcbiAqIEBlbiBJZiB0aGUgdmFsdWUgb2YgdGhlIG5hbWVkIHByb3BlcnR5IGlzIGEgZnVuY3Rpb24gdGhlbiBpbnZva2UgaXQ7IG90aGVyd2lzZSwgcmV0dXJuIGl0LlxuICogQGphIG9iamVjdCDjga4gcHJvcGVydHkg44GM44Oh44K944OD44OJ44Gq44KJ44Gd44Gu5a6f6KGM57WQ5p6c44KSLCDjg5fjg63jg5Hjg4bjgqPjgarjgonjgZ3jga7lgKTjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAtIGBlbmAgT2JqZWN0IHRvIG1heWJlIGludm9rZSBmdW5jdGlvbiBgcHJvcGVydHlgIG9uLlxuICogLSBgamFgIOipleS+oeOBmeOCi+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIHByb3BlcnR5XG4gKiAtIGBlbmAgVGhlIGZ1bmN0aW9uIGJ5IG5hbWUgdG8gaW52b2tlIG9uIGBvYmplY3RgLlxuICogLSBgamFgIOipleS+oeOBmeOCi+ODl+ODreODkeODhuOCo+WQjVxuICogQHBhcmFtIGZhbGxiYWNrXG4gKiAtIGBlbmAgVGhlIHZhbHVlIHRvIGJlIHJldHVybmVkIGluIGNhc2UgYHByb3BlcnR5YCBkb2Vzbid0IGV4aXN0IG9yIGlzIHVuZGVmaW5lZC5cbiAqIC0gYGphYCDlrZjlnKjjgZfjgarjgYvjgaPjgZ/loLTlkIjjga4gZmFsbGJhY2sg5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXN1bHQ8VCA9IGFueT4odGFyZ2V0OiBvYmplY3QgfCBOaWwsIHByb3BlcnR5OiBzdHJpbmcgfCBzdHJpbmdbXSwgZmFsbGJhY2s/OiBUKTogVCB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IHByb3BzID0gaXNBcnJheShwcm9wZXJ0eSkgPyBwcm9wZXJ0eSA6IFtwcm9wZXJ0eV07XG4gICAgaWYgKCFwcm9wcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGlzRnVuY3Rpb24oZmFsbGJhY2spID8gZmFsbGJhY2suY2FsbCh0YXJnZXQpIDogZmFsbGJhY2s7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzb2x2ZSA9IChvOiB1bmtub3duLCBwOiB1bmtub3duKTogdW5rbm93biA9PiB7XG4gICAgICAgIHJldHVybiBpc0Z1bmN0aW9uKHApID8gcC5jYWxsKG8pIDogcDtcbiAgICB9O1xuXG4gICAgbGV0IG9iaiA9IHRhcmdldDtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgcHJvcHMpIHtcbiAgICAgICAgY29uc3QgcHJvcCA9IG51bGwgPT0gb2JqID8gdW5kZWZpbmVkIDogb2JqW25hbWVdO1xuICAgICAgICBpZiAodW5kZWZpbmVkID09PSBwcm9wKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzb2x2ZShvYmosIGZhbGxiYWNrKSBhcyBUO1xuICAgICAgICB9XG4gICAgICAgIG9iaiA9IHJlc29sdmUob2JqLCBwcm9wKSBhcyBvYmplY3Q7XG4gICAgfVxuICAgIHJldHVybiBvYmogYXMgdW5rbm93biBhcyBUO1xufVxuIiwiLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gY2FsbGFibGUoKTogdW5rbm93biB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11c2UtYmVmb3JlLWRlZmluZVxuICAgIHJldHVybiBhY2Nlc3NpYmxlO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBhY2Nlc3NpYmxlOiB1bmtub3duID0gbmV3IFByb3h5KGNhbGxhYmxlLCB7XG4gICAgZ2V0OiAodGFyZ2V0LCBuYW1lKSA9PiB7XG4gICAgICAgIGNvbnN0IHByb3AgPSB0YXJnZXRbbmFtZV07XG4gICAgICAgIGlmIChudWxsICE9IHByb3ApIHtcbiAgICAgICAgICAgIHJldHVybiBwcm9wO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGFjY2Vzc2libGU7XG4gICAgICAgIH1cbiAgICB9LFxufSk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIGNyZWF0ZSgpOiB1bmtub3duIHtcbiAgICBjb25zdCBzdHViID0gbmV3IFByb3h5KHt9LCB7XG4gICAgICAgIGdldDogKHRhcmdldCwgbmFtZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcHJvcCA9IHRhcmdldFtuYW1lXTtcbiAgICAgICAgICAgIGlmIChudWxsICE9IHByb3ApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvcDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjY2Vzc2libGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoc3R1YiwgJ3N0dWInLCB7XG4gICAgICAgIHZhbHVlOiB0cnVlLFxuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc3R1Yjtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHNhZmUgYWNjZXNzaWJsZSBvYmplY3QuXG4gKiBAamEg5a6J5YWo44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kq44OW44K444Kn44Kv44OI44Gu5Y+W5b6XXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBzYWZlV2luZG93ID0gc2FmZShnbG9iYWxUaGlzLndpbmRvdyk7XG4gKiBjb25zb2xlLmxvZyhudWxsICE9IHNhZmVXaW5kb3cuZG9jdW1lbnQpOyAgICAvLyB0cnVlXG4gKiBjb25zdCBkaXYgPSBzYWZlV2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICogY29uc29sZS5sb2cobnVsbCAhPSBkaXYpOyAgICAvLyB0cnVlXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIEEgcmVmZXJlbmNlIG9mIGFuIG9iamVjdCB3aXRoIGEgcG9zc2liaWxpdHkgd2hpY2ggZXhpc3RzLlxuICogIC0gYGphYCDlrZjlnKjjgZfjgYbjgovjgqrjg5bjgrjjgqfjgq/jg4jjga7lj4LnhadcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJlYWxpdHkgb3Igc3R1YiBpbnN0YW5jZS5cbiAqICAtIGBqYWAg5a6f5L2T44G+44Gf44Gv44K544K/44OW44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYWZlPFQ+KHRhcmdldDogVCk6IFQge1xuICAgIHJldHVybiB0YXJnZXQgfHwgY3JlYXRlKCkgYXMgVDtcbn1cbiIsImltcG9ydCB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgZ2V0R2xvYmFsIH0gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHsgc2FmZSB9IGZyb20gJy4vc2FmZSc7XG5cbi8qKlxuICogQGVuIFR5cGUgb2YgaGFuZGxlIGZvciB0aW1lciBmdW5jdGlvbnMuXG4gKiBAamEg44K/44Kk44Oe44O86Zai5pWw44Gr5L2/55So44GZ44KL44OP44Oz44OJ44Or5Z6LXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGltZXJIYW5kbGUgeyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWludGVyZmFjZVxuXG4vKipcbiAqIEBlbiBUeXBlIG9mIHRpbWVyIHN0YXJ0IGZ1bmN0aW9ucy5cbiAqIEBqYSDjgr/jgqTjg57jg7zplovlp4vplqLmlbDjga7lnotcbiAqL1xuZXhwb3J0IHR5cGUgVGltZXJTdGFydEZ1bmN0aW9uID0gKGhhbmRsZXI6IFVua25vd25GdW5jdGlvbiwgdGltZW91dD86IG51bWJlciwgLi4uYXJnczogdW5rbm93bltdKSA9PiBUaW1lckhhbmRsZTtcblxuLyoqXG4gKiBAZW4gVHlwZSBvZiB0aW1lciBzdG9wIGZ1bmN0aW9ucy5cbiAqIEBqYSDjgr/jgqTjg57jg7zlgZzmraLplqLmlbDjga7lnotcbiAqL1xuZXhwb3J0IHR5cGUgVGltZXJTdG9wRnVuY3Rpb24gPSAoaGFuZGxlOiBUaW1lckhhbmRsZSkgPT4gdm9pZDtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFRpbWVyQ29udGV4dCB7XG4gICAgc2V0VGltZW91dDogVGltZXJTdGFydEZ1bmN0aW9uO1xuICAgIGNsZWFyVGltZW91dDogVGltZXJTdG9wRnVuY3Rpb247XG4gICAgc2V0SW50ZXJ2YWw6IFRpbWVyU3RhcnRGdW5jdGlvbjtcbiAgICBjbGVhckludGVydmFsOiBUaW1lclN0b3BGdW5jdGlvbjtcbn1cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcm9vdCA9IGdldEdsb2JhbCgpIGFzIHVua25vd24gYXMgVGltZXJDb250ZXh0O1xuY29uc3Qgc2V0VGltZW91dDogVGltZXJTdGFydEZ1bmN0aW9uICAgPSBzYWZlKF9yb290LnNldFRpbWVvdXQpO1xuY29uc3QgY2xlYXJUaW1lb3V0OiBUaW1lclN0b3BGdW5jdGlvbiAgPSBzYWZlKF9yb290LmNsZWFyVGltZW91dCk7XG5jb25zdCBzZXRJbnRlcnZhbDogVGltZXJTdGFydEZ1bmN0aW9uICA9IHNhZmUoX3Jvb3Quc2V0SW50ZXJ2YWwpO1xuY29uc3QgY2xlYXJJbnRlcnZhbDogVGltZXJTdG9wRnVuY3Rpb24gPSBzYWZlKF9yb290LmNsZWFySW50ZXJ2YWwpO1xuXG5leHBvcnQge1xuICAgIHNldFRpbWVvdXQsXG4gICAgY2xlYXJUaW1lb3V0LFxuICAgIHNldEludGVydmFsLFxuICAgIGNsZWFySW50ZXJ2YWwsXG59O1xuIiwiaW1wb3J0IHtcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgUHJpbWl0aXZlLFxuICAgIFR5cGVkRGF0YSxcbiAgICBpc1N0cmluZyxcbiAgICBpc09iamVjdCxcbn0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBpbnZlcnQgfSBmcm9tICcuL29iamVjdCc7XG5pbXBvcnQge1xuICAgIFRpbWVySGFuZGxlLFxuICAgIHNldFRpbWVvdXQsXG4gICAgY2xlYXJUaW1lb3V0LFxufSBmcm9tICcuL3RpbWVyJztcblxuLyoqXG4gKiBAZW4gRW5zdXJlIGFzeW5jaHJvbm91cyBleGVjdXRpb24uXG4gKiBAamEg6Z2e5ZCM5pyf5a6f6KGM44KS5L+d6Ki8XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiB2b2lkIHBvc3QoKCkgPT4gZXhlYyhhcmcpKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBpbXBsZW1lbnQgYXMgZnVuY3Rpb24gc2NvcGUuXG4gKiAgLSBgamFgIOmWouaVsOOCueOCs+ODvOODl+OBqOOBl+OBpuWun+ijhVxuKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0PFQ+KGV4ZWN1dG9yOiAoKSA9PiBUKTogUHJvbWlzZTxUPiB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oZXhlY3V0b3IpO1xufVxuXG4vKipcbiAqIEBlbiBHZW5lcmljIE5vLU9wZXJhdGlvbi5cbiAqIEBqYSDmsY7nlKggTm8tT3BlcmF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub29wKC4uLmFyZ3M6IHVua25vd25bXSk6IGFueSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgLy8gbm9vcFxufVxuXG4vKipcbiAqIEBlbiBXYWl0IGZvciB0aGUgZGVzaWduYXRpb24gZWxhcHNlLlxuICogQGphIOaMh+WumuaZgumWk+WHpueQhuOCkuW+heapn1xuICpcbiAqIEBwYXJhbSBlbGFwc2VcbiAqICAtIGBlbmAgd2FpdCBlbGFwc2UgW21zZWNdLlxuICogIC0gYGphYCDlvoXmqZ/mmYLplpMgW21zZWNdXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzbGVlcChlbGFwc2U6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgZWxhcHNlKSk7XG59XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgd2hlbiBpbnZva2VkLCB3aWxsIG9ubHkgYmUgdHJpZ2dlcmVkIGF0IG1vc3Qgb25jZSBkdXJpbmcgYSBnaXZlbiB0aW1lLlxuICogQGphIOmWouaVsOOBruWun+ihjOOCkiB3YWl0IFttc2VjXSDjgasx5Zue44Gr5Yi26ZmQXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB0aHJvdHRsZWQgPSB0aHJvdHRsZSh1cGF0ZVBvc2l0aW9uLCAxMDApO1xuICogJCh3aW5kb3cpLnNjcm9sbCh0aHJvdHRsZWQpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIHNlZWQgZnVuY3Rpb24uXG4gKiAgLSBgamFgIOWvvuixoeOBrumWouaVsFxuICogQHBhcmFtIGVsYXBzZVxuICogIC0gYGVuYCB3YWl0IGVsYXBzZSBbbXNlY10uXG4gKiAgLSBgamFgIOW+heapn+aZgumWkyBbbXNlY11cbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0aHJvdHRsZTxUIGV4dGVuZHMgVW5rbm93bkZ1bmN0aW9uPihleGVjdXRvcjogVCwgZWxhcHNlOiBudW1iZXIsIG9wdGlvbnM/OiB7IGxlYWRpbmc/OiBib29sZWFuOyB0cmFpbGluZz86IGJvb2xlYW47IH0pOiBUICYgeyBjYW5jZWwoKTogdm9pZDsgfSB7XG4gICAgY29uc3Qgb3B0cyA9IG9wdGlvbnMgfHwge307XG4gICAgbGV0IGhhbmRsZTogVGltZXJIYW5kbGUgfCB1bmRlZmluZWQ7XG4gICAgbGV0IGFyZ3M6IHVua25vd25bXSB8IHVuZGVmaW5lZDtcbiAgICBsZXQgY29udGV4dDogdW5rbm93biwgcmVzdWx0OiB1bmtub3duO1xuICAgIGxldCBwcmV2aW91cyA9IDA7XG5cbiAgICBjb25zdCBsYXRlciA9IGZ1bmN0aW9uICgpOiB2b2lkIHtcbiAgICAgICAgcHJldmlvdXMgPSBmYWxzZSA9PT0gb3B0cy5sZWFkaW5nID8gMCA6IERhdGUubm93KCk7XG4gICAgICAgIGhhbmRsZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmVzdWx0ID0gZXhlY3V0b3IuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGlmICghaGFuZGxlKSB7XG4gICAgICAgICAgICBjb250ZXh0ID0gYXJncyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCB0aHJvdHRsZWQgPSBmdW5jdGlvbiAodGhpczogdW5rbm93biwgLi4uYXJnOiB1bmtub3duW10pOiB1bmtub3duIHtcbiAgICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgaWYgKCFwcmV2aW91cyAmJiBmYWxzZSA9PT0gb3B0cy5sZWFkaW5nKSB7XG4gICAgICAgICAgICBwcmV2aW91cyA9IG5vdztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZW1haW5pbmcgPSBlbGFwc2UgLSAobm93IC0gcHJldmlvdXMpO1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8taW52YWxpZC10aGlzLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhc1xuICAgICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgICAgYXJncyA9IFsuLi5hcmddO1xuICAgICAgICBpZiAocmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gZWxhcHNlKSB7XG4gICAgICAgICAgICBpZiAoaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGhhbmRsZSk7XG4gICAgICAgICAgICAgICAgaGFuZGxlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgICAgICByZXN1bHQgPSBleGVjdXRvci5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICAgIGlmICghaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dCA9IGFyZ3MgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIWhhbmRsZSAmJiBmYWxzZSAhPT0gb3B0cy50cmFpbGluZykge1xuICAgICAgICAgICAgaGFuZGxlID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICB0aHJvdHRsZWQuY2FuY2VsID0gZnVuY3Rpb24gKCk6IHZvaWQge1xuICAgICAgICBjbGVhclRpbWVvdXQoaGFuZGxlIGFzIFRpbWVySGFuZGxlKTtcbiAgICAgICAgcHJldmlvdXMgPSAwO1xuICAgICAgICBoYW5kbGUgPSBjb250ZXh0ID0gYXJncyA9IHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHRocm90dGxlZCBhcyAoVCAmIHsgY2FuY2VsKCk6IHZvaWQ7IH0pO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIGFzIGxvbmcgYXMgaXQgY29udGludWVzIHRvIGJlIGludm9rZWQsIHdpbGwgbm90IGJlIHRyaWdnZXJlZC5cbiAqIEBqYSDlkbzjgbPlh7rjgZXjgozjgabjgYvjgokgd2FpdCBbbXNlY10g57WM6YGO44GZ44KL44G+44Gn5a6f6KGM44GX44Gq44GE6Zai5pWw44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIHNlZWQgZnVuY3Rpb24uXG4gKiAgLSBgamFgIOWvvuixoeOBrumWouaVsFxuICogQHBhcmFtIHdhaXRcbiAqICAtIGBlbmAgd2FpdCBlbGFwc2UgW21zZWNdLlxuICogIC0gYGphYCDlvoXmqZ/mmYLplpMgW21zZWNdXG4gKiBAcGFyYW0gaW1tZWRpYXRlXG4gKiAgLSBgZW5gIElmIGB0cnVlYCBpcyBwYXNzZWQsIHRyaWdnZXIgdGhlIGZ1bmN0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2UsIGluc3RlYWQgb2YgdGhlIHRyYWlsaW5nLlxuICogIC0gYGphYCBgdHJ1ZWAg44Gu5aC05ZCILCDliJ3lm57jga7jgrPjg7zjg6vjga/ljbPmmYLlrp/ooYxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlYm91bmNlPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGV4ZWN1dG9yOiBULCB3YWl0OiBudW1iZXIsIGltbWVkaWF0ZT86IGJvb2xlYW4pOiBUICYgeyBjYW5jZWwoKTogdm9pZDsgfSB7XG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8taW52YWxpZC10aGlzICovXG4gICAgbGV0IGhhbmRsZTogVGltZXJIYW5kbGUgfCB1bmRlZmluZWQ7XG4gICAgbGV0IHJlc3VsdDogdW5kZWZpbmVkO1xuXG4gICAgY29uc3QgbGF0ZXIgPSBmdW5jdGlvbiAoY29udGV4dDogdW5kZWZpbmVkLCBhcmdzOiB1bmRlZmluZWRbXSk6IHZvaWQge1xuICAgICAgICBoYW5kbGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChhcmdzKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBleGVjdXRvci5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBkZWJvdW5jZWQgPSBmdW5jdGlvbiAodGhpczogdW5kZWZpbmVkLCAuLi5hcmdzOiB1bmRlZmluZWRbXSk6IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChoYW5kbGUpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChoYW5kbGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbW1lZGlhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGNhbGxOb3cgPSAhaGFuZGxlO1xuICAgICAgICAgICAgaGFuZGxlID0gc2V0VGltZW91dChsYXRlciwgd2FpdCk7XG4gICAgICAgICAgICBpZiAoY2FsbE5vdykge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGV4ZWN1dG9yLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaGFuZGxlID0gc2V0VGltZW91dChsYXRlciwgd2FpdCwgdGhpcywgWy4uLmFyZ3NdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gZnVuY3Rpb24gKCk6IHZvaWQge1xuICAgICAgICBjbGVhclRpbWVvdXQoaGFuZGxlIGFzIFRpbWVySGFuZGxlKTtcbiAgICAgICAgaGFuZGxlID0gdW5kZWZpbmVkO1xuICAgIH07XG5cbiAgICByZXR1cm4gZGVib3VuY2VkIGFzIChUICYgeyBjYW5jZWwoKTogdm9pZDsgfSk7XG4gICAgLyogZXNsaW50LWVuYWJsZSBuby1pbnZhbGlkLXRoaXMgKi9cbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBhdCBtb3N0IG9uZSB0aW1lLCBubyBtYXR0ZXIgaG93IG9mdGVuIHlvdSBjYWxsIGl0LlxuICogQGphIDHluqbjgZfjgYvlrp/ooYzjgZXjgozjgarjgYTplqLmlbDjgpLov5TljbQuIDLlm57nm67ku6XpmY3jga/mnIDliJ3jga7jgrPjg7zjg6vjga7jgq3jg6Pjg4Pjgrfjg6XjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvbmNlPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGV4ZWN1dG9yOiBUKTogVCB7XG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8taW52YWxpZC10aGlzLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uICovXG4gICAgbGV0IG1lbW86IHVua25vd247XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0aGlzOiB1bmtub3duLCAuLi5hcmdzOiB1bmtub3duW10pOiB1bmtub3duIHtcbiAgICAgICAgaWYgKGV4ZWN1dG9yKSB7XG4gICAgICAgICAgICBtZW1vID0gZXhlY3V0b3IuY2FsbCh0aGlzLCAuLi5hcmdzKTtcbiAgICAgICAgICAgIGV4ZWN1dG9yID0gbnVsbCE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgfSBhcyBUO1xuICAgIC8qIGVzbGludC1lbmFibGUgbm8taW52YWxpZC10aGlzLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uICovXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgZXNjYXBlIGZ1bmN0aW9uIGZyb20gbWFwLlxuICogQGphIOaWh+Wtl+e9ruaPm+mWouaVsOOCkuS9nOaIkFxuICpcbiAqIEBwYXJhbSBtYXBcbiAqICAtIGBlbmAga2V5OiB0YXJnZXQgY2hhciwgdmFsdWU6IHJlcGxhY2UgY2hhclxuICogIC0gYGphYCBrZXk6IOe9ruaPm+WvvuixoSwgdmFsdWU6IOe9ruaPm+aWh+Wtl1xuICogQHJldHVybnNcbiAqICAtIGBlbmAgZXNwYWNlIGZ1bmN0aW9uXG4gKiAgLSBgamFgIOOCqOOCueOCseODvOODl+mWouaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRXNjYXBlcihtYXA6IG9iamVjdCk6IChzcmM6IFByaW1pdGl2ZSkgPT4gc3RyaW5nIHtcbiAgICBjb25zdCBlc2NhcGVyID0gKG1hdGNoOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgICByZXR1cm4gbWFwW21hdGNoXTtcbiAgICB9O1xuXG4gICAgY29uc3Qgc291cmNlID0gYCg/OiR7T2JqZWN0LmtleXMobWFwKS5qb2luKCd8Jyl9KWA7XG4gICAgY29uc3QgcmVnZXhUZXN0ID0gUmVnRXhwKHNvdXJjZSk7XG4gICAgY29uc3QgcmVnZXhSZXBsYWNlID0gUmVnRXhwKHNvdXJjZSwgJ2cnKTtcblxuICAgIHJldHVybiAoc3JjOiBQcmltaXRpdmUpOiBzdHJpbmcgPT4ge1xuICAgICAgICBzcmMgPSAobnVsbCA9PSBzcmMgfHwgJ3N5bWJvbCcgPT09IHR5cGVvZiBzcmMpID8gJycgOiBTdHJpbmcoc3JjKTtcbiAgICAgICAgcmV0dXJuIHJlZ2V4VGVzdC50ZXN0KHNyYykgPyBzcmMucmVwbGFjZShyZWdleFJlcGxhY2UsIGVzY2FwZXIpIDogc3JjO1xuICAgIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1hcEh0bWxFc2NhcGUgPSB7XG4gICAgJzwnOiAnJmx0OycsXG4gICAgJz4nOiAnJmd0OycsXG4gICAgJyYnOiAnJmFtcDsnLFxuICAgICdcIic6ICcmcXVvdDsnLFxuICAgIFwiJ1wiOiAnJiMzOTsnLFxuICAgICdgJzogJyYjeDYwOydcbn07XG5cbi8qKlxuICogQGVuIEVzY2FwZSBIVE1MIHN0cmluZy5cbiAqIEBqYSBIVE1MIOOBp+S9v+eUqOOBmeOCi+aWh+Wtl+OCkuWItuW+oeaWh+Wtl+OBq+e9ruaPm1xuICpcbiAqIEBicmllZiA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IG1hcEh0bWxFc2NhcGUgPSB7XG4gKiAgICAgJzwnIDogJyZsdDsnLFxuICogICAgICc+JyA6ICcmZ3Q7JyxcbiAqICAgICAnJicgOiAnJmFtcDsnLFxuICogICAgICfigLMnOiAnJnF1b3Q7JyxcbiAqICAgICBgJ2AgOiAnJiMzOTsnLFxuICogICAgICdgJyA6ICcmI3g2MDsnXG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBlc2NhcGVIVE1MID0gY3JlYXRlRXNjYXBlcihtYXBIdG1sRXNjYXBlKTtcblxuLyoqXG4gKiBAZW4gVW5lc2NhcGUgSFRNTCBzdHJpbmcuXG4gKiBAamEgSFRNTCDjgafkvb/nlKjjgZnjgovliLblvqHmloflrZfjgpLlvqnlhYNcbiAqL1xuZXhwb3J0IGNvbnN0IHVuZXNjYXBlSFRNTCA9IGNyZWF0ZUVzY2FwZXIoaW52ZXJ0KG1hcEh0bWxFc2NhcGUpKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gdGhlIHN0eWxlIGNvbXB1bHNpb24gdmFsdWUgZnJvbSBpbnB1dCBzdHJpbmcuXG4gKiBAamEg5YWl5Yqb5paH5a2X5YiX44KS5Z6L5by35Yi244GX44Gf5YCk44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgaW5wdXQgc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WvvuixoeOBruaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9UeXBlZERhdGEoZGF0YTogc3RyaW5nIHwgdW5kZWZpbmVkKTogVHlwZWREYXRhIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoJ3RydWUnID09PSBkYXRhKSB7XG4gICAgICAgIC8vIGJvb2xlYW46IHRydWVcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICgnZmFsc2UnID09PSBkYXRhKSB7XG4gICAgICAgIC8vIGJvb2xlYW46IGZhbHNlXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKCdudWxsJyA9PT0gZGF0YSkge1xuICAgICAgICAvLyBudWxsXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoZGF0YSA9PT0gU3RyaW5nKE51bWJlcihkYXRhKSkpIHtcbiAgICAgICAgLy8gbnVtYmVyOiDmlbDlgKTlpInmj5sg4oaSIOaWh+Wtl+WIl+WkieaPm+OBp+WFg+OBq+aIu+OCi+OBqOOBjVxuICAgICAgICByZXR1cm4gTnVtYmVyKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSAmJiAvXig/Olxce1tcXHdcXFddKlxcfXxcXFtbXFx3XFxXXSpcXF0pJC8udGVzdChkYXRhKSkge1xuICAgICAgICAvLyBvYmplY3RcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc3RyaW5nIC8gdW5kZWZpbmVkXG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBzdHJpbmcgZnJvbSBbW1R5cGVkRGF0YV1dLlxuICogQGphIFtbVHlwZWREYXRhXV0g44KS5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgaW5wdXQgc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WvvuixoeOBruaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbVR5cGVkRGF0YShkYXRhOiBUeXBlZERhdGEgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGlmICh1bmRlZmluZWQgPT09IGRhdGEgfHwgaXNTdHJpbmcoZGF0YSkpIHtcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSBlbHNlIGlmIChpc09iamVjdChkYXRhKSkge1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFN0cmluZyhkYXRhKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gYFdlYiBBUElgIHN0b2NrZWQgdHlwZS4gPGJyPlxuICogICAgIEVuc3VyZSBub3QgdG8gcmV0dXJuIGB1bmRlZmluZWRgIHZhbHVlLlxuICogQGphIGBXZWIgQVBJYCDmoLzntI3lvaLlvI/jgavlpInmj5sgPGJyPlxuICogICAgIGB1bmRlZmluZWRgIOOCkui/lOWNtOOBl+OBquOBhOOBk+OBqOOCkuS/neiovFxuICovXG5leHBvcnQgZnVuY3Rpb24gZHJvcFVuZGVmaW5lZDxUPih2YWx1ZTogVCB8IG51bGwgfCB1bmRlZmluZWQsIG5pbFNlcmlhbGl6ZSA9IGZhbHNlKTogVCB8ICdudWxsJyB8ICd1bmRlZmluZWQnIHwgbnVsbCB7XG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWUgPyB2YWx1ZSA6IChuaWxTZXJpYWxpemUgPyBTdHJpbmcodmFsdWUpIDogbnVsbCkgYXMgVCB8ICdudWxsJyB8ICd1bmRlZmluZWQnIHwgbnVsbDtcbn1cblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemUgZnJvbSBgV2ViIEFQSWAgc3RvY2tlZCB0eXBlLiA8YnI+XG4gKiAgICAgQ29udmVydCBmcm9tICdudWxsJyBvciAndW5kZWZpbmVkJyBzdHJpbmcgdG8gb3JpZ2luYWwgdHlwZS5cbiAqIEBqYSAnbnVsbCcgb3IgJ3VuZGVmaW5lZCcg44KS44KC44Go44Gu5Z6L44Gr5oi744GZXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXN0b3JlTmlsPFQ+KHZhbHVlOiBUIHwgJ251bGwnIHwgJ3VuZGVmaW5lZCcpOiBUIHwgbnVsbCB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCdudWxsJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmICgndW5kZWZpbmVkJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqLyBsZXQgX2xvY2FsSWQgPSAwO1xuXG4vKipcbiAqIEBlbiBHZXQgbG9jYWwgdW5pcXVlIGlkLiA8YnI+XG4gKiAgICAgXCJsb2NhbCB1bmlxdWVcIiBtZWFucyBndWFyYW50ZWVzIHVuaXF1ZSBkdXJpbmcgaW4gc2NyaXB0IGxpZmUgY3ljbGUgb25seS5cbiAqIEBqYSDjg63jg7zjgqvjg6vjg6bjg4vjg7zjgq8gSUQg44Gu5Y+W5b6XIDxicj5cbiAqICAgICDjgrnjgq/jg6rjg5fjg4jjg6njgqTjg5XjgrXjgqTjgq/jg6vkuK3jga7lkIzkuIDmgKfjgpLkv53oqLzjgZnjgosuXG4gKlxuICogQHBhcmFtIHByZWZpeFxuICogIC0gYGVuYCBJRCBwcmVmaXhcbiAqICAtIGBqYWAgSUQg44Gr5LuY5LiO44GZ44KLIFByZWZpeFxuICogQHBhcmFtIHplcm9QYWRcbiAqICAtIGBlbmAgMCBwYWRkaW5nIG9yZGVyXG4gKiAgLSBgamFgIDAg6Kmw44KB44GZ44KL5qGB5pWw44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsdWlkKHByZWZpeCA9ICcnLCB6ZXJvUGFkPzogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBjb25zdCBpZCA9ICgrK19sb2NhbElkKS50b1N0cmluZygxNik7XG4gICAgcmV0dXJuIChudWxsICE9IHplcm9QYWQpID8gYCR7cHJlZml4fSR7aWQucGFkU3RhcnQoemVyb1BhZCwgJzAnKX1gIDogYCR7cHJlZml4fSR7aWR9YDtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gYDBgIGFuZCBgbWF4YCwgaW5jbHVzaXZlLlxuICogQGphIGAwYCAtIGBtYXhgIOOBruODqeODs+ODgOODoOOBruaVtOaVsOWApOOCkueUn+aIkFxuICpcbiAqIEBwYXJhbSBtYXhcbiAqICAtIGBlbmAgVGhlIG1heGltdW0gcmFuZG9tIG51bWJlci5cbiAqICAtIGBqYWAg5pW05pWw44Gu5pyA5aSn5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kb21JbnQobWF4OiBudW1iZXIpOiBudW1iZXI7XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIGBtaW5gIGFuZCBgbWF4YCwgaW5jbHVzaXZlLlxuICogQGphIGBtaW5gIC0gYG1heGAg44Gu44Op44Oz44OA44Og44Gu5pW05pWw5YCk44KS55Sf5oiQXG4gKlxuICogQHBhcmFtIG1pblxuICogIC0gYGVuYCBUaGUgbWF4aW11bSByYW5kb20gbnVtYmVyLlxuICogIC0gYGphYCDmlbTmlbDjga7mnIDlpKflgKRcbiAqIEBwYXJhbSBtYXhcbiAqICAtIGBlbmAgVGhlIG1heGltdW0gcmFuZG9tIG51bWJlci5cbiAqICAtIGBqYWAg5pW05pWw44Gu5pyA5aSn5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kb21JbnQobWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmlmaWVkLXNpZ25hdHVyZXNcblxuZXhwb3J0IGZ1bmN0aW9uIHJhbmRvbUludChtaW46IG51bWJlciwgbWF4PzogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBpZiAobnVsbCA9PSBtYXgpIHtcbiAgICAgICAgbWF4ID0gbWluO1xuICAgICAgICBtaW4gPSAwO1xuICAgIH1cbiAgICByZXR1cm4gbWluICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3JlZ2V4Q2FuY2VsTGlrZVN0cmluZyA9IC8oYWJvcnR8Y2FuY2VsKS9pbTtcblxuLyoqXG4gKiBAZW4gUHJlc3VtZSB3aGV0aGVyIGl0J3MgYSBjYW5jZWxlZCBlcnJvci5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjgZXjgozjgZ/jgqjjg6njg7zjgafjgYLjgovjgYvmjqjlrppcbiAqXG4gKiBAcGFyYW0gZXJyb3JcbiAqICAtIGBlbmAgYW4gZXJyb3Igb2JqZWN0IGhhbmRsZWQgaW4gYGNhdGNoYCBibG9jay5cbiAqICAtIGBqYWAgYGNhdGNoYCDnr4Djgarjganjgafoo5zotrPjgZfjgZ/jgqjjg6njg7zjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQ2hhbmNlbExpa2VFcnJvcihlcnJvcjogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIGlmIChudWxsID09IGVycm9yKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKGVycm9yKSkge1xuICAgICAgICByZXR1cm4gX3JlZ2V4Q2FuY2VsTGlrZVN0cmluZy50ZXN0KGVycm9yKTtcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGVycm9yKSkge1xuICAgICAgICByZXR1cm4gX3JlZ2V4Q2FuY2VsTGlrZVN0cmluZy50ZXN0KChlcnJvciBhcyBFcnJvcikubWVzc2FnZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnRzIGZpcnN0IGxldHRlciBvZiB0aGUgc3RyaW5nIHRvIHVwcGVyY2FzZS5cbiAqIEBqYSDmnIDliJ3jga7mloflrZfjgpLlpKfmloflrZfjgavlpInmj5tcbiAqXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjYXBpdGFsaXplKFwiZm9vIEJhclwiKTtcbiAqIC8vID0+IFwiRm9vIEJhclwiXG4gKlxuICogY2FwaXRhbGl6ZShcIkZPTyBCYXJcIiwgdHJ1ZSk7XG4gKiAvLyA9PiBcIkZvbyBiYXJcIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICogQHBhcmFtIGxvd2VyY2FzZVJlc3RcbiAqICAtIGBlbmAgSWYgYHRydWVgIGlzIHBhc3NlZCwgdGhlIHJlc3Qgb2YgdGhlIHN0cmluZyB3aWxsIGJlIGNvbnZlcnRlZCB0byBsb3dlciBjYXNlXG4gKiAgLSBgamFgIGB0cnVlYCDjgpLmjIflrprjgZfjgZ/loLTlkIgsIDLmloflrZfnm67ku6XpmY3jgoLlsI/mloflrZfljJZcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhcGl0YWxpemUoc3JjOiBzdHJpbmcsIGxvd2VyY2FzZVJlc3QgPSBmYWxzZSk6IHN0cmluZyB7XG4gICAgY29uc3QgcmVtYWluaW5nQ2hhcnMgPSAhbG93ZXJjYXNlUmVzdCA/IHNyYy5zbGljZSgxKSA6IHNyYy5zbGljZSgxKS50b0xvd2VyQ2FzZSgpO1xuICAgIHJldHVybiBzcmMuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyByZW1haW5pbmdDaGFycztcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgZmlyc3QgbGV0dGVyIG9mIHRoZSBzdHJpbmcgdG8gbG93ZXJjYXNlLlxuICogQGphIOacgOWIneOBruaWh+Wtl+OCkuWwj+aWh+Wtl+WMllxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogZGVjYXBpdGFsaXplKFwiRm9vIEJhclwiKTtcbiAqIC8vID0+IFwiZm9vIEJhclwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWNhcGl0YWxpemUoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBzcmMuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyBzcmMuc2xpY2UoMSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIHVuZGVyc2NvcmVkIG9yIGRhc2hlcml6ZWQgc3RyaW5nIHRvIGEgY2FtZWxpemVkIG9uZS4gPGJyPlxuICogICAgIEJlZ2lucyB3aXRoIGEgbG93ZXIgY2FzZSBsZXR0ZXIgdW5sZXNzIGl0IHN0YXJ0cyB3aXRoIGFuIHVuZGVyc2NvcmUsIGRhc2ggb3IgYW4gdXBwZXIgY2FzZSBsZXR0ZXIuXG4gKiBAamEgYF9gLCBgLWAg5Yy65YiH44KK5paH5a2X5YiX44KS44Kt44Oj44Oh44Or44Kx44O844K55YyWIDxicj5cbiAqICAgICBgLWAg44G+44Gf44Gv5aSn5paH5a2X44K544K/44O844OI44Gn44GC44KM44GwLCDlpKfmloflrZfjgrnjgr/jg7zjg4jjgYzml6LlrprlgKRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNhbWVsaXplKFwibW96LXRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwibW96VHJhbnNmb3JtXCJcbiAqXG4gKiBjYW1lbGl6ZShcIi1tb3otdHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJNb3pUcmFuc2Zvcm1cIlxuICpcbiAqIGNhbWVsaXplKFwiX21vel90cmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIk1velRyYW5zZm9ybVwiXG4gKlxuICogY2FtZWxpemUoXCJNb3otdHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJNb3pUcmFuc2Zvcm1cIlxuICpcbiAqIGNhbWVsaXplKFwiLW1vei10cmFuc2Zvcm1cIiwgdHJ1ZSk7XG4gKiAvLyA9PiBcIm1velRyYW5zZm9ybVwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKiBAcGFyYW0gbG93ZXJcbiAqICAtIGBlbmAgSWYgYHRydWVgIGlzIHBhc3NlZCwgZm9yY2UgY29udmVydHMgdG8gbG93ZXIgY2FtZWwgY2FzZSBpbiBzdGFydHMgd2l0aCB0aGUgc3BlY2lhbCBjYXNlLlxuICogIC0gYGphYCDlvLfliLbnmoTjgavlsI/mloflrZfjgrnjgr/jg7zjg4jjgZnjgovloLTlkIjjgavjga8gYHRydWVgIOOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FtZWxpemUoc3JjOiBzdHJpbmcsIGxvd2VyID0gZmFsc2UpOiBzdHJpbmcge1xuICAgIHNyYyA9IHNyYy50cmltKCkucmVwbGFjZSgvWy1fXFxzXSsoLik/L2csIChtYXRjaCwgYykgPT4ge1xuICAgICAgICByZXR1cm4gYyA/IGMudG9VcHBlckNhc2UoKSA6ICcnO1xuICAgIH0pO1xuXG4gICAgaWYgKHRydWUgPT09IGxvd2VyKSB7XG4gICAgICAgIHJldHVybiBkZWNhcGl0YWxpemUoc3JjKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gc3JjO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgc3RyaW5nIHRvIGNhbWVsaXplZCBjbGFzcyBuYW1lLiBGaXJzdCBsZXR0ZXIgaXMgYWx3YXlzIHVwcGVyIGNhc2UuXG4gKiBAamEg5YWI6aCt5aSn5paH5a2X44Gu44Kt44Oj44Oh44Or44Kx44O844K544Gr5aSJ5o+bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjbGFzc2lmeShcInNvbWVfY2xhc3NfbmFtZVwiKTtcbiAqIC8vID0+IFwiU29tZUNsYXNzTmFtZVwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGFzc2lmeShzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGNhcGl0YWxpemUoY2FtZWxpemUoc3JjLnJlcGxhY2UoL1tcXFdfXS9nLCAnICcpKS5yZXBsYWNlKC9cXHMvZywgJycpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgYSBjYW1lbGl6ZWQgb3IgZGFzaGVyaXplZCBzdHJpbmcgaW50byBhbiB1bmRlcnNjb3JlZCBvbmUuXG4gKiBAamEg44Kt44Oj44Oh44Or44Kx44O844K5IG9yIGAtYCDjgaTjgarjgY7mloflrZfliJfjgpIgYF9gIOOBpOOBquOBjuOBq+WkieaPm1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogdW5kZXJzY29yZWQoXCJNb3pUcmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIm1vel90cmFuc2Zvcm1cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdW5kZXJzY29yZWQoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBzcmMudHJpbSgpLnJlcGxhY2UoLyhbYS16XFxkXSkoW0EtWl0rKS9nLCAnJDFfJDInKS5yZXBsYWNlKC9bLVxcc10rL2csICdfJykudG9Mb3dlckNhc2UoKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgYSB1bmRlcnNjb3JlZCBvciBjYW1lbGl6ZWQgc3RyaW5nIGludG8gYW4gZGFzaGVyaXplZCBvbmUuXG4gKiBAamEg44Kt44Oj44Oh44Or44Kx44O844K5IG9yIGBfYCDjgaTjgarjgY7mloflrZfliJfjgpIgYC1gIOOBpOOBquOBjuOBq+WkieaPm1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogZGFzaGVyaXplKFwiTW96VHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCItbW96LXRyYW5zZm9ybVwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXNoZXJpemUoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBzcmMudHJpbSgpLnJlcGxhY2UoLyhbQS1aXSkvZywgJy0kMScpLnJlcGxhY2UoL1tfXFxzXSsvZywgJy0nKS50b0xvd2VyQ2FzZSgpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBuby1pbnZhbGlkLXRoaXMsXG4gKi9cblxuaW1wb3J0IHsgcmFuZG9tSW50IH0gZnJvbSAnLi9taXNjJztcblxuLyoqXG4gKiBAZW4gRXhlY3V0ZSBzaHVmZmxlIG9mIGFuIGFycmF5IGVsZW1lbnRzLlxuICogQGphIOmFjeWIl+imgee0oOOBruOCt+ODo+ODg+ODleODq1xuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gZGVzdHJ1Y3RpdmVcbiAqICAtIGBlbmAgdHJ1ZTogZGVzdHJ1Y3RpdmUgLyBmYWxzZTogbm9uLWRlc3RydWN0aXZlIChkZWZhdWx0KVxuICogIC0gYGphYCB0cnVlOiDnoLTlo4rnmoQgLyBmYWxzZTog6Z2e56C05aOK55qEICjml6LlrpopXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaHVmZmxlPFQ+KGFycmF5OiBUW10sIGRlc3RydWN0aXZlID0gZmFsc2UpOiBUW10ge1xuICAgIGNvbnN0IHNvdXJjZSA9IGRlc3RydWN0aXZlID8gYXJyYXkgOiBhcnJheS5zbGljZSgpO1xuICAgIGNvbnN0IGxlbiA9IHNvdXJjZS5sZW5ndGg7XG4gICAgZm9yIChsZXQgaSA9IGxlbiA+IDAgPyBsZW4gPj4+IDAgOiAwOyBpID4gMTspIHtcbiAgICAgICAgY29uc3QgaiA9IGkgKiBNYXRoLnJhbmRvbSgpID4+PiAwO1xuICAgICAgICBjb25zdCBzd2FwID0gc291cmNlWy0taV07XG4gICAgICAgIHNvdXJjZVtpXSA9IHNvdXJjZVtqXTtcbiAgICAgICAgc291cmNlW2pdID0gc3dhcDtcbiAgICB9XG4gICAgcmV0dXJuIHNvdXJjZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEV4ZWN1dGUgc3RhYmxlIHNvcnQgYnkgbWVyZ2Utc29ydCBhbGdvcml0aG0uXG4gKiBAamEgYG1lcmdlLXNvcnRgIOOBq+OCiOOCi+WuieWumuOCveODvOODiFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY29tcGFyYXRvclxuICogIC0gYGVuYCBzb3J0IGNvbXBhcmF0b3IgZnVuY3Rpb25cbiAqICAtIGBqYWAg44K944O844OI6Zai5pWw44KS5oyH5a6aXG4gKiBAcGFyYW0gZGVzdHJ1Y3RpdmVcbiAqICAtIGBlbmAgdHJ1ZTogZGVzdHJ1Y3RpdmUgLyBmYWxzZTogbm9uLWRlc3RydWN0aXZlIChkZWZhdWx0KVxuICogIC0gYGphYCB0cnVlOiDnoLTlo4rnmoQgLyBmYWxzZTog6Z2e56C05aOK55qEICjml6LlrpopXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzb3J0PFQ+KGFycmF5OiBUW10sIGNvbXBhcmF0b3I6IChsaHM6IFQsIHJoczogVCkgPT4gbnVtYmVyLCBkZXN0cnVjdGl2ZSA9IGZhbHNlKTogVFtdIHtcbiAgICBjb25zdCBzb3VyY2UgPSBkZXN0cnVjdGl2ZSA/IGFycmF5IDogYXJyYXkuc2xpY2UoKTtcbiAgICBpZiAoc291cmNlLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICB9XG4gICAgY29uc3QgbGhzID0gc29ydChzb3VyY2Uuc3BsaWNlKDAsIHNvdXJjZS5sZW5ndGggPj4+IDEpLCBjb21wYXJhdG9yLCB0cnVlKTtcbiAgICBjb25zdCByaHMgPSBzb3J0KHNvdXJjZS5zcGxpY2UoMCksIGNvbXBhcmF0b3IsIHRydWUpO1xuICAgIHdoaWxlIChsaHMubGVuZ3RoICYmIHJocy5sZW5ndGgpIHtcbiAgICAgICAgc291cmNlLnB1c2goY29tcGFyYXRvcihsaHNbMF0sIHJoc1swXSkgPD0gMCA/IGxocy5zaGlmdCgpIGFzIFQgOiByaHMuc2hpZnQoKSBhcyBUKTtcbiAgICB9XG4gICAgcmV0dXJuIHNvdXJjZS5jb25jYXQobGhzLCByaHMpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWFrZSB1bmlxdWUgYXJyYXkuXG4gKiBAamEg6YeN6KSH6KaB57Sg44Gu44Gq44GE6YWN5YiX44Gu5L2c5oiQXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuaXF1ZTxUPihhcnJheTogVFtdKTogVFtdIHtcbiAgICByZXR1cm4gWy4uLm5ldyBTZXQoYXJyYXkpXTtcbn1cblxuLyoqXG4gKiBAZW4gTWFrZSB1bmlvbiBhcnJheS5cbiAqIEBqYSDphY3liJfjga7lkozpm4blkIjjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gYXJyYXlzXG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheXNcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiX576kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmlvbjxUPiguLi5hcnJheXM6IFRbXVtdKTogVFtdIHtcbiAgICByZXR1cm4gdW5pcXVlKGFycmF5cy5mbGF0KCkpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSBtb2RlbCBhdCB0aGUgZ2l2ZW4gaW5kZXguIElmIG5lZ2F0aXZlIHZhbHVlIGlzIGdpdmVuLCB0aGUgdGFyZ2V0IHdpbGwgYmUgZm91bmQgZnJvbSB0aGUgbGFzdCBpbmRleC5cbiAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgavjgojjgovjg6Ljg4fjg6vjgbjjga7jgqLjgq/jgrvjgrkuIOiyoOWApOOBruWgtOWQiOOBr+acq+WwvuaknOe0ouOCkuWun+ihjFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBlbmAgQSB6ZXJvLWJhc2VkIGludGVnZXIgaW5kaWNhdGluZyB3aGljaCBlbGVtZW50IHRvIHJldHJpZXZlLiA8YnI+IElmIG5lZ2F0aXZlIGluZGV4IGlzIGNvdW50ZWQgZnJvbSB0aGUgZW5kIG9mIHRoZSBtYXRjaGVkIHNldC5cbiAqICAtIGBqYWAgMCBiYXNlIOOBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumiA8YnI+IOiyoOWApOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiCwg5pyr5bC+44GL44KJ44Gu44Kk44Oz44OH44OD44Kv44K544Go44GX44Gm6Kej6YeI44GV44KM44KLXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhdDxUPihhcnJheTogVFtdLCBpbmRleDogbnVtYmVyKTogVCB8IG5ldmVyIHtcbiAgICBjb25zdCBpZHggPSBNYXRoLnRydW5jKGluZGV4KTtcbiAgICBjb25zdCBlbCA9IGlkeCA8IDAgPyBhcnJheVtpZHggKyBhcnJheS5sZW5ndGhdIDogYXJyYXlbaWR4XTtcbiAgICBpZiAobnVsbCA9PSBlbCkge1xuICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgaW52YWxpZCBhcnJheSBpbmRleC4gW2xlbmd0aDogJHthcnJheS5sZW5ndGh9LCBnaXZlbjogJHtpbmRleH1dYCk7XG4gICAgfVxuICAgIHJldHVybiBlbDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1ha2UgaW5kZXggYXJyYXkuXG4gKiBAamEg44Kk44Oz44OH44OD44Kv44K56YWN5YiX44Gu5L2c5oiQXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBleGNsdWRlc1xuICogIC0gYGVuYCBleGNsdWRlIGluZGV4IGluIHJldHVybiB2YWx1ZS5cbiAqICAtIGBqYWAg5oi744KK5YCk6YWN5YiX44Gr5ZCr44KB44Gq44GE44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbmRpY2VzPFQ+KGFycmF5OiBUW10sIC4uLmV4Y2x1ZGVzOiBudW1iZXJbXSk6IG51bWJlcltdIHtcbiAgICBjb25zdCByZXR2YWwgPSBbLi4uYXJyYXkua2V5cygpXTtcblxuICAgIGNvbnN0IGxlbiA9IGFycmF5Lmxlbmd0aDtcbiAgICBjb25zdCBleExpc3QgPSBbLi4ubmV3IFNldChleGNsdWRlcyldLnNvcnQoKGxocywgcmhzKSA9PiBsaHMgPCByaHMgPyAxIDogLTEpO1xuICAgIGZvciAoY29uc3QgZXggb2YgZXhMaXN0KSB7XG4gICAgICAgIGlmICgwIDw9IGV4ICYmIGV4IDwgbGVuKSB7XG4gICAgICAgICAgICByZXR2YWwuc3BsaWNlKGV4LCAxKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBbW2dyb3VwQnldXSgpIG9wdGlvbnMgZGVmaW5pdGlvbi5cbiAqIEBqYSBbW2dyb3VwQnldXSgpIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEdyb3VwQnlPcHRpb25zPFxuICAgIFQgZXh0ZW5kcyBvYmplY3QsXG4gICAgVEtFWVMgZXh0ZW5kcyBrZXlvZiBULFxuICAgIFRTVU1LRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUR1JPVVBLRVkgZXh0ZW5kcyBzdHJpbmdcbj4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBgR1JPVVAgQllgIGtleXMuXG4gICAgICogQGphIGBHUk9VUCBCWWAg44Gr5oyH5a6a44GZ44KL44Kt44O8XG4gICAgICovXG4gICAga2V5czogRXh0cmFjdDxUS0VZUywgc3RyaW5nPltdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFnZ3JlZ2F0YWJsZSBrZXlzLlxuICAgICAqIEBqYSDpm4boqIjlj6/og73jgarjgq3jg7zkuIDopqdcbiAgICAgKi9cbiAgICBzdW1LZXlzPzogRXh0cmFjdDxUU1VNS0VZUywgc3RyaW5nPltdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdyb3VwZWQgaXRlbSBhY2Nlc3Mga2V5LiBkZWZhdWx0OiAnaXRlbXMnLFxuICAgICAqIEBqYSDjgrDjg6vjg7zjg5Tjg7PjgrDjgZXjgozjgZ/opoHntKDjgbjjga7jgqLjgq/jgrvjgrnjgq3jg7wuIOaXouWumjogJ2l0ZW1zJ1xuICAgICAqL1xuICAgIGdyb3VwS2V5PzogVEdST1VQS0VZO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm4gdHlwZSBvZiBbW2dyb3VwQnldXSgpLlxuICogQGphIFtbZ3JvdXBCeV1dKCkg44GM6L+U5Y2044GZ44KL5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIEdyb3VwQnlSZXR1cm5WYWx1ZTxcbiAgICBUIGV4dGVuZHMgb2JqZWN0LFxuICAgIFRLRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUU1VNS0VZUyBleHRlbmRzIGtleW9mIFQgPSBuZXZlcixcbiAgICBUR1JPVVBLRVkgZXh0ZW5kcyBzdHJpbmcgPSAnaXRlbXMnXG4+ID0gUmVhZG9ubHk8UmVjb3JkPFRLRVlTLCB1bmtub3duPiAmIFJlY29yZDxUU1VNS0VZUywgdW5rbm93bj4gJiBSZWNvcmQ8VEdST1VQS0VZLCBUW10+PjtcblxuLyoqXG4gKiBAZW4gRXhlY3V0ZSBgR1JPVVAgQllgIGZvciBhcnJheSBlbGVtZW50cy5cbiAqIEBqYSDphY3liJfjga7opoHntKDjga4gYEdST1VQIEJZYCDpm4blkIjjgpLmir3lh7pcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgYEdST1VQIEJZYCBvcHRpb25zXG4gKiAgLSBgamFgIGBHUk9VUCBCWWAg44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBncm91cEJ5PFxuICAgIFQgZXh0ZW5kcyBvYmplY3QsXG4gICAgVEtFWVMgZXh0ZW5kcyBrZXlvZiBULFxuICAgIFRTVU1LRVlTIGV4dGVuZHMga2V5b2YgVCA9IG5ldmVyLFxuICAgIFRHUk9VUEtFWSBleHRlbmRzIHN0cmluZyA9ICdpdGVtcydcbj4oYXJyYXk6IFRbXSwgb3B0aW9uczogR3JvdXBCeU9wdGlvbnM8VCwgVEtFWVMsIFRTVU1LRVlTLCBUR1JPVVBLRVk+KTogR3JvdXBCeVJldHVyblZhbHVlPFQsIFRLRVlTLCBUU1VNS0VZUywgVEdST1VQS0VZPltdIHtcbiAgICBjb25zdCB7IGtleXMsIHN1bUtleXMsIGdyb3VwS2V5IH0gPSBvcHRpb25zO1xuICAgIGNvbnN0IF9ncm91cEtleSA9IGdyb3VwS2V5IHx8ICdpdGVtcyc7XG4gICAgY29uc3QgX3N1bUtleXM6IHN0cmluZ1tdID0gc3VtS2V5cyB8fCBbXTtcbiAgICBfc3VtS2V5cy5wdXNoKF9ncm91cEtleSk7XG5cbiAgICBjb25zdCBoYXNoID0gYXJyYXkucmVkdWNlKChyZXM6IFQsIGRhdGE6IFQpID0+IHtcbiAgICAgICAgLy8gY3JlYXRlIGdyb3VwQnkgaW50ZXJuYWwga2V5XG4gICAgICAgIGNvbnN0IF9rZXkgPSBrZXlzLnJlZHVjZSgocywgaykgPT4gcyArIFN0cmluZyhkYXRhW2tdKSwgJycpO1xuXG4gICAgICAgIC8vIGluaXQga2V5c1xuICAgICAgICBpZiAoIShfa2V5IGluIHJlcykpIHtcbiAgICAgICAgICAgIGNvbnN0IGtleUxpc3QgPSBrZXlzLnJlZHVjZSgoaCwgazogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgaFtrXSA9IGRhdGFba107XG4gICAgICAgICAgICAgICAgcmV0dXJuIGg7XG4gICAgICAgICAgICB9LCB7fSk7XG5cbiAgICAgICAgICAgIHJlc1tfa2V5XSA9IF9zdW1LZXlzLnJlZHVjZSgoaCwgazogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgaFtrXSA9IDA7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGg7XG4gICAgICAgICAgICB9LCBrZXlMaXN0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc0tleSA9IHJlc1tfa2V5XTtcblxuICAgICAgICAvLyBzdW0gcHJvcGVydGllc1xuICAgICAgICBmb3IgKGNvbnN0IGsgb2YgX3N1bUtleXMpIHtcbiAgICAgICAgICAgIGlmIChfZ3JvdXBLZXkgPT09IGspIHtcbiAgICAgICAgICAgICAgICByZXNLZXlba10gPSByZXNLZXlba10gfHwgW107XG4gICAgICAgICAgICAgICAgcmVzS2V5W2tdLnB1c2goZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc0tleVtrXSArPSBkYXRhW2tdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9LCB7fSk7XG5cbiAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyhoYXNoKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbXB1dGVzIHRoZSBsaXN0IG9mIHZhbHVlcyB0aGF0IGFyZSB0aGUgaW50ZXJzZWN0aW9uIG9mIGFsbCB0aGUgYXJyYXlzLiBFYWNoIHZhbHVlIGluIHRoZSByZXN1bHQgaXMgcHJlc2VudCBpbiBlYWNoIG9mIHRoZSBhcnJheXMuXG4gKiBAamEg6YWN5YiX44Gu56mN6ZuG5ZCI44KS6L+U5Y20LiDov5TljbTjgZXjgozjgZ/phY3liJfjga7opoHntKDjga/jgZnjgbnjgabjga7lhaXlipvjgZXjgozjgZ/phY3liJfjgavlkKvjgb7jgozjgotcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnNvbGUubG9nKGludGVyc2VjdGlvbihbMSwgMiwgM10sIFsxMDEsIDIsIDEsIDEwXSwgWzIsIDFdKSk7XG4gKiAvLyA9PiBbMSwgMl1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheXNcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gaW50ZXJzZWN0aW9uPFQ+KC4uLmFycmF5czogVFtdW10pOiBUW10ge1xuICAgIHJldHVybiBhcnJheXMucmVkdWNlKChhY2MsIGFyeSkgPT4gYWNjLmZpbHRlcihlbCA9PiBhcnkuaW5jbHVkZXMoZWwpKSk7XG59XG5cbi8qKlxuICogQGVuIFJldHVybnMgdGhlIHZhbHVlcyBmcm9tIGFycmF5IHRoYXQgYXJlIG5vdCBwcmVzZW50IGluIHRoZSBvdGhlciBhcnJheXMuXG4gKiBAamEg6YWN5YiX44GL44KJ44G744GL44Gu6YWN5YiX44Gr5ZCr44G+44KM44Gq44GE44KC44Gu44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zb2xlLmxvZyhkaWZmZXJlbmNlKFsxLCAyLCAzLCA0LCA1XSwgWzUsIDIsIDEwXSkpO1xuICogLy8gPT4gWzEsIDMsIDRdXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIG90aGVyc1xuICogIC0gYGVuYCBleGNsdWRlIGVsZW1lbnQgaW4gcmV0dXJuIHZhbHVlLlxuICogIC0gYGphYCDmiLvjgorlgKTphY3liJfjgavlkKvjgoHjgarjgYTopoHntKDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpZmZlcmVuY2U8VD4oYXJyYXk6IFRbXSwgLi4ub3RoZXJzOiBUW11bXSk6IFRbXSB7XG4gICAgY29uc3QgYXJyYXlzID0gW2FycmF5LCAuLi5vdGhlcnNdIGFzIFRbXVtdO1xuICAgIHJldHVybiBhcnJheXMucmVkdWNlKChhY2MsIGFyeSkgPT4gYWNjLmZpbHRlcihlbCA9PiAhYXJ5LmluY2x1ZGVzKGVsKSkpO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgY29weSBvZiB0aGUgYXJyYXkgd2l0aCBhbGwgaW5zdGFuY2VzIG9mIHRoZSB2YWx1ZXMgcmVtb3ZlZC5cbiAqIEBqYSDphY3liJfjgYvjgonmjIflrpropoHntKDjgpLlj5bjgorpmaTjgYTjgZ/jgoLjga7jgpLov5TljbRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnNvbGUubG9nKHdpdGhvdXQoWzEsIDIsIDEsIDAsIDMsIDEsIDRdLCAwLCAxKSk7XG4gKiAvLyA9PiBbMiwgMywgNF1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gdmFsdWVzXG4gKiAgLSBgZW5gIGV4Y2x1ZGUgZWxlbWVudCBpbiByZXR1cm4gdmFsdWUuXG4gKiAgLSBgamFgIOaIu+OCiuWApOmFjeWIl+OBq+WQq+OCgeOBquOBhOimgee0oOOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aG91dDxUPihhcnJheTogVFtdLCAuLi52YWx1ZXM6IFRbXSk6IFRbXSB7XG4gICAgcmV0dXJuIGRpZmZlcmVuY2UoYXJyYXksIHZhbHVlcyk7XG59XG5cbi8qKlxuICogQGVuIFByb2R1Y2UgYSByYW5kb20gc2FtcGxlIGZyb20gdGhlIGxpc3QuXG4gKiBAamEg44Op44Oz44OA44Og44Gr44K144Oz44OX44Or5YCk44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zb2xlLmxvZyhzYW1wbGUoWzEsIDIsIDMsIDQsIDUsIDZdLCAzKSk7XG4gKiAvLyA9PiBbMSwgNiwgMl1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY291bnRcbiAqICAtIGBlbmAgbnVtYmVyIG9mIHNhbXBsaW5nIGNvdW50LlxuICogIC0gYGphYCDov5TljbTjgZnjgovjgrXjg7Pjg5fjg6vmlbDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhbXBsZTxUPihhcnJheTogVFtdLCBjb3VudDogbnVtYmVyKTogVFtdO1xuXG4vKipcbiAqIEBlbiBQcm9kdWNlIGEgcmFuZG9tIHNhbXBsZSBmcm9tIHRoZSBsaXN0LlxuICogQGphIOODqeODs+ODgOODoOOBq+OCteODs+ODl+ODq+WApOOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc29sZS5sb2coc2FtcGxlKFsxLCAyLCAzLCA0LCA1LCA2XSkpO1xuICogLy8gPT4gNFxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhbXBsZTxUPihhcnJheTogVFtdKTogVDtcblxuZXhwb3J0IGZ1bmN0aW9uIHNhbXBsZTxUPihhcnJheTogVFtdLCBjb3VudD86IG51bWJlcik6IFQgfCBUW10ge1xuICAgIGlmIChudWxsID09IGNvdW50KSB7XG4gICAgICAgIHJldHVybiBhcnJheVtyYW5kb21JbnQoYXJyYXkubGVuZ3RoIC0gMSldO1xuICAgIH1cbiAgICBjb25zdCBzYW1wbGUgPSBhcnJheS5zbGljZSgpO1xuICAgIGNvbnN0IGxlbmd0aCA9IHNhbXBsZS5sZW5ndGg7XG4gICAgY291bnQgPSBNYXRoLm1heChNYXRoLm1pbihjb3VudCwgbGVuZ3RoKSwgMCk7XG4gICAgY29uc3QgbGFzdCA9IGxlbmd0aCAtIDE7XG4gICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGNvdW50OyBpbmRleCsrKSB7XG4gICAgICAgIGNvbnN0IHJhbmQgPSByYW5kb21JbnQoaW5kZXgsIGxhc3QpO1xuICAgICAgICBjb25zdCB0ZW1wID0gc2FtcGxlW2luZGV4XTtcbiAgICAgICAgc2FtcGxlW2luZGV4XSA9IHNhbXBsZVtyYW5kXTtcbiAgICAgICAgc2FtcGxlW3JhbmRdID0gdGVtcDtcbiAgICB9XG4gICAgcmV0dXJuIHNhbXBsZS5zbGljZSgwLCBjb3VudCk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgcmVzdWx0IG9mIHBlcm11dGF0aW9uIGZyb20gdGhlIGxpc3QuXG4gKiBAamEg6YWN5YiX44GL44KJ6aCG5YiX57WQ5p6c44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBhcnIgPSBwZXJtdXRhdGlvbihbJ2EnLCAnYicsICdjJ10sIDIpO1xuICogY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYXJyKSk7XG4gKiAvLyA9PiBbWydhJywnYiddLFsnYScsJ2MnXSxbJ2InLCdhJ10sWydiJywnYyddLFsnYycsJ2EnXSxbJ2MnLCdiJ11dXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNvdW50XG4gKiAgLSBgZW5gIG51bWJlciBvZiBwaWNrIHVwLlxuICogIC0gYGphYCDpgbjmip7mlbBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcm11dGF0aW9uPFQ+KGFycmF5OiBUW10sIGNvdW50OiBudW1iZXIpOiBUW11bXSB7XG4gICAgY29uc3QgcmV0dmFsOiBUW11bXSA9IFtdO1xuICAgIGlmIChhcnJheS5sZW5ndGggPCBjb3VudCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGlmICgxID09PSBjb3VudCkge1xuICAgICAgICBmb3IgKGNvbnN0IFtpLCB2YWxdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICAgICAgcmV0dmFsW2ldID0gW3ZhbF07XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbjEgPSBhcnJheS5sZW5ndGg7IGkgPCBuMTsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGFycmF5LnNsaWNlKDApO1xuICAgICAgICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gcGVybXV0YXRpb24ocGFydHMsIGNvdW50IC0gMSk7XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMCwgbjIgPSByb3cubGVuZ3RoOyBqIDwgbjI7IGorKykge1xuICAgICAgICAgICAgICAgIHJldHZhbC5wdXNoKFthcnJheVtpXV0uY29uY2F0KHJvd1tqXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSByZXN1bHQgb2YgY29tYmluYXRpb24gZnJvbSB0aGUgbGlzdC5cbiAqIEBqYSDphY3liJfjgYvjgonntYTjgb/lkIjjgo/jgZvntZDmnpzjgpLov5TljbRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGFyciA9IGNvbWJpbmF0aW9uKFsnYScsICdiJywgJ2MnXSwgMik7XG4gKiBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhcnIpKTtcbiAqIC8vID0+IFtbJ2EnLCdiJ10sWydhJywnYyddLFsnYicsJ2MnXV1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY291bnRcbiAqICAtIGBlbmAgbnVtYmVyIG9mIHBpY2sgdXAuXG4gKiAgLSBgamFgIOmBuOaKnuaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tYmluYXRpb248VD4oYXJyYXk6IFRbXSwgY291bnQ6IG51bWJlcik6IFRbXVtdIHtcbiAgICBjb25zdCByZXR2YWw6IFRbXVtdID0gW107XG4gICAgaWYgKGFycmF5Lmxlbmd0aCA8IGNvdW50KSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgaWYgKDEgPT09IGNvdW50KSB7XG4gICAgICAgIGZvciAoY29uc3QgW2ksIHZhbF0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgICAgICByZXR2YWxbaV0gPSBbdmFsXTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBuMSA9IGFycmF5Lmxlbmd0aDsgaSA8IG4xIC0gY291bnQgKyAxOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IGNvbWJpbmF0aW9uKGFycmF5LnNsaWNlKGkgKyAxKSwgY291bnQgLSAxKTtcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwLCBuMiA9IHJvdy5sZW5ndGg7IGogPCBuMjsgaisrKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsLnB1c2goW2FycmF5W2ldXS5jb25jYXQocm93W2pdKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5tYXAoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5tYXAoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKiBcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgKkFycmF5KiBhcyB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c6YWN5YiX44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYXA8VCwgVT4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSB8IFByb21pc2U8VT4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxVW10+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXG4gICAgICAgIGFycmF5Lm1hcChhc3luYyAodiwgaSwgYSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhKTtcbiAgICAgICAgfSlcbiAgICApO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuZmlsdGVyKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZmlsdGVyKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgKkFycmF5KiBhcyB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c6YWN5YiX44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaWx0ZXI8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxUW10+IHtcbiAgICBjb25zdCBiaXRzOiBib29sZWFuW10gPSBhd2FpdCBtYXAoYXJyYXksICh2LCBpLCBhKSA9PiBjYWxsYmFjay5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdiwgaSwgYSkpO1xuICAgIHJldHVybiBhcnJheS5maWx0ZXIoKCkgPT4gYml0cy5zaGlmdCgpKTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLmZpbmQoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5maW5kKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+e1kOaenOOCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZDxUPih0aGlzOiB1bmtub3duLCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBib29sZWFuIHwgUHJvbWlzZTxib29sZWFuPiwgdGhpc0FyZz86IHVua25vd24pOiBQcm9taXNlPFQgfCB1bmRlZmluZWQ+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5maW5kSW5kZXgoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5maW5kSW5kZXgoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIHRoaXNBcmdcbiAqICAtIGBlbmAgVmFsdWUgdG8gdXNlIGFzICp0aGlzKiB3aGVuIGV4ZWN1dGluZyB0aGUgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDlrp/ooYzjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCBpbmRleCB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K544KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaW5kSW5kZXg8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLnNvbWUoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5zb21lKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgYm9vbGVhbiB2YWx1ZS5cbiAqICAtIGBqYWAg55yf5YG95YCk44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzb21lPFQ+KHRoaXM6IHVua25vd24sIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+LCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGZvciAoY29uc3QgW2ksIHZdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoYXdhaXQgY2FsbGJhY2suY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHYsIGksIGFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuZXZlcnkoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5ldmVyeSgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50IGJvb2xlYW4gdmFsdWUuXG4gKiAgLSBgamFgIOecn+WBveWApOOCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXZlcnk8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdW5rbm93biB8IFByb21pc2U8dW5rbm93bj4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmICghYXdhaXQgY2FsbGJhY2suY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHYsIGksIGFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUucmVkdWNlKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUucmVkdWNlKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSBpbml0aWFsVmFsdWVcbiAqICAtIGBlbmAgVXNlZCBhcyBmaXJzdCBhcmd1bWVudCB0byB0aGUgZmlyc3QgY2FsbCBvZiBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOOBq+a4oeOBleOCjOOCi+WIneacn+WApFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50ICpBcnJheSogYXMgdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+e1kOaenOmFjeWIl+OCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVkdWNlPFQsIFU+KFxuICAgIGFycmF5OiBUW10sXG4gICAgY2FsbGJhY2s6IChhY2N1bXVsYXRvcjogVSwgY3VycmVudFZhbHVlOiBULCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSB8IFByb21pc2U8VT4sXG4gICAgaW5pdGlhbFZhbHVlPzogVVxuKTogUHJvbWlzZTxVPiB7XG4gICAgaWYgKGFycmF5Lmxlbmd0aCA8PSAwICYmIHVuZGVmaW5lZCA9PT0gaW5pdGlhbFZhbHVlKSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignUmVkdWNlIG9mIGVtcHR5IGFycmF5IHdpdGggbm8gaW5pdGlhbCB2YWx1ZScpO1xuICAgIH1cblxuICAgIGNvbnN0IGhhc0luaXQgPSAodW5kZWZpbmVkICE9PSBpbml0aWFsVmFsdWUpO1xuICAgIGxldCBhY2MgPSAoaGFzSW5pdCA/IGluaXRpYWxWYWx1ZSA6IGFycmF5WzBdKSBhcyBVO1xuXG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmICghKCFoYXNJbml0ICYmIDAgPT09IGkpKSB7XG4gICAgICAgICAgICBhY2MgPSBhd2FpdCBjYWxsYmFjayhhY2MsIHYsIGksIGFycmF5KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBhY2M7XG59XG4iLCIvKipcbiAqIEBlbiBEYXRlIHVuaXQgZGVmaW5pdGlvbnMuXG4gKiBAamEg5pel5pmC44Kq44OW44K444Kn44Kv44OI44Gu5Y2Y5L2N5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIERhdGVVbml0ID0gJ3llYXInIHwgJ21vbnRoJyB8ICdkYXknIHwgJ2hvdXInIHwgJ21pbicgfCAnc2VjJyB8ICdtc2VjJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2NvbXB1dGVEYXRlRnVuY01hcCA9IHtcbiAgICB5ZWFyOiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENGdWxsWWVhcihiYXNlLmdldFVUQ0Z1bGxZZWFyKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIG1vbnRoOiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENNb250aChiYXNlLmdldFVUQ01vbnRoKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIGRheTogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDRGF0ZShiYXNlLmdldFVUQ0RhdGUoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG4gICAgaG91cjogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDSG91cnMoYmFzZS5nZXRVVENIb3VycygpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbiAgICBtaW46IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ01pbnV0ZXMoYmFzZS5nZXRVVENNaW51dGVzKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIHNlYzogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDU2Vjb25kcyhiYXNlLmdldFVUQ1NlY29uZHMoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG4gICAgbXNlYzogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDTWlsbGlzZWNvbmRzKGJhc2UuZ2V0VVRDTWlsbGlzZWNvbmRzKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBAZW4gQ2FsY3VsYXRlIGZyb20gdGhlIGRhdGUgd2hpY2ggYmVjb21lcyBhIGNhcmRpbmFsIHBvaW50IGJlZm9yZSBhIE4gZGF0ZSB0aW1lIG9yIGFmdGVyIGEgTiBkYXRlIHRpbWUgKGJ5IFtbRGF0ZVVuaXRdXSkuXG4gKiBAamEg5Z+654K544Go44Gq44KL5pel5LuY44GL44KJ44CBTuaXpeW+jOOAgU7ml6XliY3jgpLnrpflh7pcbiAqXG4gKiBAcGFyYW0gYmFzZVxuICogIC0gYGVuYCBiYXNlIGRhdGUgdGltZS5cbiAqICAtIGBqYWAg5Z+65rqW5pelXG4gKiBAcGFyYW0gYWRkXG4gKiAgLSBgZW5gIHJlbGF0aXZlIGRhdGUgdGltZS5cbiAqICAtIGBqYWAg5Yqg566X5pelLiDjg57jgqTjg4rjgrnmjIflrprjgadu5pel5YmN44KC6Kit5a6a5Y+v6IO9XG4gKiBAcGFyYW0gdW5pdCBbW0RhdGVVbml0XV1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVEYXRlKGJhc2U6IERhdGUsIGFkZDogbnVtYmVyLCB1bml0OiBEYXRlVW5pdCA9ICdkYXknKTogRGF0ZSB7XG4gICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKGJhc2UuZ2V0VGltZSgpKTtcbiAgICBjb25zdCBmdW5jID0gX2NvbXB1dGVEYXRlRnVuY01hcFt1bml0XTtcbiAgICBpZiAoZnVuYykge1xuICAgICAgICByZXR1cm4gZnVuYyhkYXRlLCBiYXNlLCBhZGQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYGludmFsaWQgdW5pdDogJHt1bml0fWApO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIEFyZ3VtZW50cyxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIGlzU3ltYm9sLFxuICAgIGNsYXNzTmFtZSxcbiAgICB2ZXJpZnksXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIEV2ZW50QWxsLFxuICAgIFN1YnNjcmlwdGlvbixcbiAgICBTdWJzY3JpYmFibGUsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgTGlzbmVyIOagvOe0jeW9ouW8jyAqL1xudHlwZSBMaXN0ZW5lcnNNYXA8VD4gPSBNYXA8a2V5b2YgVCwgU2V0PCguLi5hcmdzOiBUW2tleW9mIFRdW10pID0+IHVua25vd24+PjtcblxuLyoqIEBpbnRlcm5hbCBMaXNuZXIg44Gu5byx5Y+C54WnICovXG5jb25zdCBfbWFwTGlzdGVuZXJzID0gbmV3IFdlYWtNYXA8RXZlbnRQdWJsaXNoZXI8YW55PiwgTGlzdGVuZXJzTWFwPGFueT4+KCk7XG5cbi8qKiBAaW50ZXJuYWwgTGlzbmVyTWFwIOOBruWPluW+lyAqL1xuZnVuY3Rpb24gbGlzdGVuZXJzPFQgZXh0ZW5kcyBvYmplY3Q+KGluc3RhbmNlOiBFdmVudFB1Ymxpc2hlcjxUPik6IExpc3RlbmVyc01hcDxUPiB7XG4gICAgaWYgKCFfbWFwTGlzdGVuZXJzLmhhcyhpbnN0YW5jZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhpcyBpcyBub3QgYSB2YWxpZCBFdmVudFB1Ymxpc2hlci4nKTtcbiAgICB9XG4gICAgcmV0dXJuIF9tYXBMaXN0ZW5lcnMuZ2V0KGluc3RhbmNlKSBhcyBMaXN0ZW5lcnNNYXA8VD47XG59XG5cbi8qKiBAaW50ZXJuYWwgQ2hhbm5lbCDjga7lnovmpJzoqLwgKi9cbmZ1bmN0aW9uIHZhbGlkQ2hhbm5lbChjaGFubmVsOiB1bmtub3duKTogdm9pZCB8IG5ldmVyIHtcbiAgICBpZiAoaXNTdHJpbmcoY2hhbm5lbCkgfHwgaXNTeW1ib2woY2hhbm5lbCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBUeXBlIG9mICR7Y2xhc3NOYW1lKGNoYW5uZWwpfSBpcyBub3QgYSB2YWxpZCBjaGFubmVsLmApO1xufVxuXG4vKiogQGludGVybmFsIExpc3RlbmVyIOOBruWei+aknOiovCAqL1xuZnVuY3Rpb24gdmFsaWRMaXN0ZW5lcihsaXN0ZW5lcj86ICguLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd24pOiBhbnkgfCBuZXZlciB7XG4gICAgaWYgKG51bGwgIT0gbGlzdGVuZXIpIHtcbiAgICAgICAgdmVyaWZ5KCd0eXBlT2YnLCAnZnVuY3Rpb24nLCBsaXN0ZW5lcik7XG4gICAgfVxuICAgIHJldHVybiBsaXN0ZW5lcjtcbn1cblxuLyoqIEBpbnRlcm5hbCBldmVudCDnmbrooYwgKi9cbmZ1bmN0aW9uIHRyaWdnZXJFdmVudDxFdmVudCwgQ2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihcbiAgICBtYXA6IExpc3RlbmVyc01hcDxFdmVudD4sXG4gICAgY2hhbm5lbDogQ2hhbm5lbCxcbiAgICBvcmlnaW5hbDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj5cbik6IHZvaWQge1xuICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoYW5uZWwpO1xuICAgIGlmICghbGlzdCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAoY29uc3QgbGlzdGVuZXIgb2YgbGlzdCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZXZlbnRBcmdzID0gb3JpZ2luYWwgPyBbb3JpZ2luYWwsIC4uLmFyZ3NdIDogYXJncztcbiAgICAgICAgICAgIGNvbnN0IGhhbmRsZWQgPSBsaXN0ZW5lciguLi5ldmVudEFyZ3MpO1xuICAgICAgICAgICAgLy8gaWYgcmVjZWl2ZWQgJ3RydWUnLCBzdG9wIGRlbGVnYXRpb24uXG4gICAgICAgICAgICBpZiAodHJ1ZSA9PT0gaGFuZGxlZCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB2b2lkIFByb21pc2UucmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gRXZlbnRpbmcgZnJhbWV3b3JrIGNsYXNzIHdpdGggZW5zdXJpbmcgdHlwZS1zYWZlIGZvciBUeXBlU2NyaXB0LiA8YnI+XG4gKiAgICAgVGhlIGNsaWVudCBvZiB0aGlzIGNsYXNzIGNhbiBpbXBsZW1lbnQgb3JpZ2luYWwgUHViLVN1YiAoT2JzZXJ2ZXIpIGRlc2lnbiBwYXR0ZXJuLlxuICogQGphIOWei+WuieWFqOOCkuS/nemanOOBmeOCi+OCpOODmeODs+ODiOeZu+mMsuODu+eZuuihjOOCr+ODqeOCuSA8YnI+XG4gKiAgICAg44Kv44Op44Kk44Ki44Oz44OI44Gv5pys44Kv44Op44K544KS5rS+55Sf44GX44Gm54us6Ieq44GuIFB1Yi1TdWIgKE9ic2VydmVyKSDjg5Hjgr/jg7zjg7PjgpLlrp/oo4Xlj6/og71cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuICpcbiAqIC8vIGRlY2xhcmUgZXZlbnQgaW50ZXJmYWNlXG4gKiBpbnRlcmZhY2UgU2FtcGxlRXZlbnQge1xuICogICBob2dlOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqICAgZm9vOiBbdm9pZF07ICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3NcbiAqICAgaG9vOiB2b2lkOyAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3MgKHNhbWUgdGhlIHVwb24pXG4gKiAgIGJhcjogW0Vycm9yXTsgICAgICAgICAgICAgICAgICAvLyBhbnkgY2xhc3MgaXMgYXZhaWxhYmxlLlxuICogICBiYXo6IEVycm9yIHwgTnVtYmVyOyAgICAgICAgICAgLy8gaWYgb25seSBvbmUgYXJndW1lbnQsIGBbXWAgaXMgbm90IHJlcXVpcmVkLlxuICogfVxuICpcbiAqIC8vIGRlY2xhcmUgY2xpZW50IGNsYXNzXG4gKiBjbGFzcyBTYW1wbGVQdWJsaXNoZXIgZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxTYW1wbGVFdmVudD4ge1xuICogICA6XG4gKiAgIHNvbWVNZXRob2QoKTogdm9pZCB7XG4gKiAgICAgdGhpcy5wdWJsaXNoKCdob2dlJywgMTAwLCAndGVzdCcpOyAgICAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiAgICAgdGhpcy5wdWJsaXNoKCdob2dlJywgMTAwLCB0cnVlKTsgICAgICAgICAvLyBORy4gYXJndW1lbnQgb2YgdHlwZSAndHJ1ZScgaXMgbm90IGFzc2lnbmFibGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBwYXJhbWV0ZXIgb2YgdHlwZSAnc3RyaW5nIHwgdW5kZWZpbmVkJy5cbiAqICAgICB0aGlzLnB1Ymxpc2goJ2hvZ2UnLCAxMDApOyAgICAgICAgICAgICAgIC8vIE9LLiBhbGwgYXJncyB0byBiZSBvcHRpb25hbCBhdXRvbWF0aWNhbGx5LlxuICogICAgIHRoaXMucHVibGlzaCgnZm9vJyk7ICAgICAgICAgICAgICAgICAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogICAgIHRoaXMucHVibGlzaCgnZm9vJywgMTAwKTsgICAgICAgICAgICAgICAgLy8gTkcuIGFyZ3VtZW50IG9mIHR5cGUgJzEwMCcgaXMgbm90IGFzc2lnbmFibGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBwYXJhbWV0ZXIgb2YgdHlwZSAndm9pZCB8IHVuZGVmaW5lZCcuXG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBzYW1wbGUgPSBuZXcgU2FtcGxlUHVibGlzaGVyKCk7XG4gKlxuICogc2FtcGxlLm9uKCdob2dlJywgKGE6IG51bWJlciwgYjogc3RyaW5nKSA9PiB7IC4uLiB9KTsgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogc2FtcGxlLm9uKCdob2dlJywgKGE6IG51bWJlciwgYjogYm9vbGVhbikgPT4geyAuLi4gfSk7ICAgLy8gTkcuIHR5cGVzIG9mIHBhcmFtZXRlcnMgJ2InXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgYW5kICdhcmdzXzEnIGFyZSBpbmNvbXBhdGlibGUuXG4gKiBzYW1wbGUub24oJ2hvZ2UnLCAoYSkgPT4geyAuLi4gfSk7ICAgICAgICAgICAgICAgICAgICAgICAvLyBPSy4gYWxsIGFyZ3NcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBiZSBvcHRpb25hbCBhdXRvbWF0aWNhbGx5LlxuICogc2FtcGxlLm9uKCdob2dlJywgKGEsIGIsIGMpID0+IHsgLi4uIH0pOyAgICAgICAgICAgICAgICAgLy8gTkcuIGV4cGVjdGVkIDEtMiBhcmd1bWVudHMsXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgYnV0IGdvdCAzLlxuICogYGBgXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBFdmVudFB1Ymxpc2hlcjxFdmVudCBleHRlbmRzIG9iamVjdD4gaW1wbGVtZW50cyBTdWJzY3JpYmFibGU8RXZlbnQ+IHtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBFdmVudFB1Ymxpc2hlciwgdGhpcyk7XG4gICAgICAgIF9tYXBMaXN0ZW5lcnMuc2V0KHRoaXMsIG5ldyBNYXAoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE5vdGlmeSBldmVudCB0byBjbGllbnRzLlxuICAgICAqIEBqYSBldmVudCDnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgavmuKHjgZnlvJXmlbBcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgcHVibGlzaDxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwsIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICB2YWxpZENoYW5uZWwoY2hhbm5lbCk7XG4gICAgICAgIHRyaWdnZXJFdmVudChtYXAsIGNoYW5uZWwsIHVuZGVmaW5lZCwgLi4uYXJncyk7XG4gICAgICAgIC8vIHRyaWdnZXIgZm9yIGFsbCBoYW5kbGVyXG4gICAgICAgIGlmICgnKicgIT09IGNoYW5uZWwpIHtcbiAgICAgICAgICAgIHRyaWdnZXJFdmVudChtYXAgYXMgdW5rbm93biBhcyBMaXN0ZW5lcnNNYXA8RXZlbnRBbGw+LCAnKicsIGNoYW5uZWwgYXMgc3RyaW5nLCAuLi5hcmdzKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFN1YnNjcmliYWJsZTxFdmVudD5cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIHRoaXMgb2JqZWN0IGhhcyBjbGllbnRzLlxuICAgICAqIEBqYSDjgq/jg6njgqTjgqLjg7Pjg4jjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIGhhc0xpc3RlbmVyPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbD86IENoYW5uZWwsIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICBpZiAobnVsbCA9PSBjaGFubmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFwLnNpemUgPiAwO1xuICAgICAgICB9XG4gICAgICAgIHZhbGlkQ2hhbm5lbChjaGFubmVsKTtcbiAgICAgICAgaWYgKG51bGwgPT0gbGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXAuaGFzKGNoYW5uZWwpO1xuICAgICAgICB9XG4gICAgICAgIHZhbGlkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaGFubmVsKTtcbiAgICAgICAgcmV0dXJuIGxpc3QgPyBsaXN0LmhhcyhsaXN0ZW5lcikgOiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyByZWdpc3RlcmVkIGNoYW5uZWwga2V5cy5cbiAgICAgKiBAamEg55m76Yyy44GV44KM44Gm44GE44KL44OB44Oj44ON44Or44Kt44O844KS6L+U5Y20XG4gICAgICovXG4gICAgY2hhbm5lbHMoKTogKGtleW9mIEV2ZW50KVtdIHtcbiAgICAgICAgcmV0dXJuIFsuLi5saXN0ZW5lcnModGhpcykua2V5cygpXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVycyh0aGlzKTtcbiAgICAgICAgdmFsaWRMaXN0ZW5lcihsaXN0ZW5lcik7XG5cbiAgICAgICAgY29uc3QgY2hhbm5lbHMgPSBpc0FycmF5KGNoYW5uZWwpID8gY2hhbm5lbCA6IFtjaGFubmVsXTtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgdmFsaWRDaGFubmVsKGNoKTtcbiAgICAgICAgICAgIG1hcC5oYXMoY2gpID8gbWFwLmdldChjaCkhLmFkZChsaXN0ZW5lcikgOiBtYXAuc2V0KGNoLCBuZXcgU2V0KFtsaXN0ZW5lcl0pKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgICAgICBnZXQgZW5hYmxlKCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2gpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWxpc3QgfHwgIWxpc3QuaGFzKGxpc3RlbmVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVuc3Vic2NyaWJlKCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2gpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGlzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdC5kZWxldGUobGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdC5zaXplID4gMCB8fCBtYXAuZGVsZXRlKGNoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykgYnV0IGl0IGNhdXNlcyB0aGUgYm91bmQgY2FsbGJhY2sgdG8gb25seSBmaXJlIG9uY2UgYmVmb3JlIGJlaW5nIHJlbW92ZWQuXG4gICAgICogQGphIOS4gOW6puOBoOOBkeODj+ODs+ODieODquODs+OCsOWPr+iDveOBquOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uY2U8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5vbihjaGFubmVsLCBsaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IG1hbmFnZWQgPSB0aGlzLm9uKGNoYW5uZWwsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnRleHQudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIG1hbmFnZWQudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjb250ZXh0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBldmVyeXRoaW5nIGlzIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/jgZnjgbnjgabop6PpmaRcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgYWxsIHNhbWUgYGNoYW5uZWxgIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lkIzkuIAgYGNoYW5uZWxgIOOBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIG9mZjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw/OiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVycyh0aGlzKTtcbiAgICAgICAgaWYgKG51bGwgPT0gY2hhbm5lbCkge1xuICAgICAgICAgICAgbWFwLmNsZWFyKCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNoYW5uZWxzID0gaXNBcnJheShjaGFubmVsKSA/IGNoYW5uZWwgOiBbY2hhbm5lbF07XG4gICAgICAgIGNvbnN0IGNhbGxiYWNrID0gdmFsaWRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgIHZhbGlkQ2hhbm5lbChjaCk7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIG1hcC5kZWxldGUoY2gpO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaCk7XG4gICAgICAgICAgICAgICAgaWYgKGxpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdC5kZWxldGUoY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgICAgICBsaXN0LnNpemUgPiAwIHx8IG1hcC5kZWxldGUoY2gpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQgeyBBcmd1bWVudHMgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaWJhYmxlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnLi9wdWJsaXNoZXInO1xuXG4vKiogcmUtZXhwb3J0ICovXG5leHBvcnQgdHlwZSBFdmVudEFyZ3VtZW50czxUPiA9IEFyZ3VtZW50czxUPjtcblxuLyoqXG4gKiBAZW4gRXZlbnRpbmcgZnJhbWV3b3JrIG9iamVjdCBhYmxlIHRvIGNhbGwgYHB1Ymxpc2goKWAgbWV0aG9kIGZyb20gb3V0c2lkZS5cbiAqIEBqYSDlpJbpg6jjgYvjgonjga4gYHB1Ymxpc2goKWAg44KS5Y+v6IO944Gr44GX44Gf44Kk44OZ44Oz44OI55m76Yyy44O755m66KGM44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbiAqXG4gKiAvLyBkZWNsYXJlIGV2ZW50IGludGVyZmFjZVxuICogaW50ZXJmYWNlIFNhbXBsZUV2ZW50IHtcbiAqICAgaG9nZTogW251bWJlciwgc3RyaW5nXTsgICAgICAgIC8vIGNhbGxiYWNrIGZ1bmN0aW9uJ3MgYXJncyB0eXBlIHR1cGxlXG4gKiB9XG4gKlxuICogY29uc3QgYnJva2VyID0gbmV3IEV2ZW50QnJva2VyPFNhbXBsZUV2ZW50PigpO1xuICogYnJva2VyLnRyaWdnZXIoJ2hvZ2UnLCAxMDAsICd0ZXN0Jyk7ICAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiBicm9rZXIudHJpZ2dlcignaG9nZScsIDEwMCwgdHJ1ZSk7ICAgICAgIC8vIE5HLiBhcmd1bWVudCBvZiB0eXBlICd0cnVlJyBpcyBub3QgYXNzaWduYWJsZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdG8gcGFyYW1ldGVyIG9mIHR5cGUgJ3N0cmluZyB8IHVuZGVmaW5lZCcuXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFdmVudEJyb2tlcjxFdmVudCBleHRlbmRzIG9iamVjdD4gZXh0ZW5kcyBTdWJzY3JpYmFibGU8RXZlbnQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gTm90aWZ5IGV2ZW50IHRvIGNsaWVudHMuXG4gICAgICogQGphIGV2ZW50IOeZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGFyZ3VtZW50cyBmb3IgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsOOBq+a4oeOBmeW8leaVsFxuICAgICAqL1xuICAgIHRyaWdnZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsLCAuLi5hcmdzOiBBcmd1bWVudHM8UGFydGlhbDxFdmVudFtDaGFubmVsXT4+KTogdm9pZDtcbn1cblxuLyoqXG4gKiBAZW4gQ29uc3RydWN0b3Igb2YgW1tFdmVudEJyb2tlcl1dXG4gKiBAamEgW1tFdmVudEJyb2tlcl1dIOOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wun+S9k1xuICovXG5leHBvcnQgY29uc3QgRXZlbnRCcm9rZXI6IHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IEV2ZW50QnJva2VyPGFueT47XG4gICAgbmV3IDxUIGV4dGVuZHMgb2JqZWN0PigpOiBFdmVudEJyb2tlcjxUPjtcbn0gPSBFdmVudFB1Ymxpc2hlciBhcyBhbnk7XG5cbkV2ZW50QnJva2VyLnByb3RvdHlwZS50cmlnZ2VyID0gKEV2ZW50UHVibGlzaGVyLnByb3RvdHlwZSBhcyBhbnkpLnB1Ymxpc2g7XG4iLCJpbXBvcnQge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBBcmd1bWVudHMsXG4gICAgaXNBcnJheSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgU3Vic2NyaWJhYmxlLFxuICAgIFN1YnNjcmlwdGlvbixcbiAgICBFdmVudFNjaGVtYSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY29udGV4dCA9IFN5bWJvbCgnY29udGV4dCcpO1xuLyoqIEBpbnRlcm5hbCAqLyB0eXBlIFN1YnNjcmlwdGlvbk1hcCA9IE1hcDxVbmtub3duRnVuY3Rpb24sIFN1YnNjcmlwdGlvbj47XG4vKiogQGludGVybmFsICovIHR5cGUgTGlzdGVyTWFwICAgICAgID0gTWFwPHN0cmluZywgU3Vic2NyaXB0aW9uTWFwPjtcbi8qKiBAaW50ZXJuYWwgKi8gdHlwZSBTdWJzY3JpcHRpb25TZXQgPSBTZXQ8U3Vic2NyaXB0aW9uPjtcbi8qKiBAaW50ZXJuYWwgKi8gdHlwZSBTdWJzY3JpYmFibGVNYXAgPSBXZWFrTWFwPFN1YnNjcmliYWJsZSwgTGlzdGVyTWFwPjtcblxuLyoqIEBpbnRlcm5hbCBMaXNuZXIg5qC857SN5b2i5byPICovXG5pbnRlcmZhY2UgQ29udGV4dCB7XG4gICAgbWFwOiBTdWJzY3JpYmFibGVNYXA7XG4gICAgc2V0OiBTdWJzY3JpcHRpb25TZXQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgcmVnaXN0ZXIgbGlzdGVuZXIgY29udGV4dCAqL1xuZnVuY3Rpb24gcmVnaXN0ZXIoY29udGV4dDogQ29udGV4dCwgdGFyZ2V0OiBTdWJzY3JpYmFibGUsIGNoYW5uZWw6IHN0cmluZyB8IHN0cmluZ1tdLCBsaXN0ZW5lcjogVW5rbm93bkZ1bmN0aW9uKTogU3Vic2NyaXB0aW9uIHtcbiAgICBjb25zdCBzdWJzY3JpcHRpb25zOiBTdWJzY3JpcHRpb25bXSA9IFtdO1xuXG4gICAgY29uc3QgY2hhbm5lbHMgPSBpc0FycmF5KGNoYW5uZWwpID8gY2hhbm5lbCA6IFtjaGFubmVsXTtcbiAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgIGNvbnN0IHMgPSB0YXJnZXQub24oY2gsIGxpc3RlbmVyKTtcbiAgICAgICAgY29udGV4dC5zZXQuYWRkKHMpO1xuICAgICAgICBzdWJzY3JpcHRpb25zLnB1c2gocyk7XG5cbiAgICAgICAgY29uc3QgbGlzdGVuZXJNYXAgPSBjb250ZXh0Lm1hcC5nZXQodGFyZ2V0KSB8fCBuZXcgTWFwPHN0cmluZywgTWFwPFVua25vd25GdW5jdGlvbiwgU3Vic2NyaXB0aW9uPj4oKTtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJNYXAuZ2V0KGNoKSB8fCBuZXcgTWFwPFVua25vd25GdW5jdGlvbiwgU3Vic2NyaXB0aW9uPigpO1xuICAgICAgICBtYXAuc2V0KGxpc3RlbmVyLCBzKTtcblxuICAgICAgICBpZiAoIWxpc3RlbmVyTWFwLmhhcyhjaCkpIHtcbiAgICAgICAgICAgIGxpc3RlbmVyTWFwLnNldChjaCwgbWFwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNvbnRleHQubWFwLmhhcyh0YXJnZXQpKSB7XG4gICAgICAgICAgICBjb250ZXh0Lm1hcC5zZXQodGFyZ2V0LCBsaXN0ZW5lck1hcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgIGdldCBlbmFibGUoKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2Ygc3Vic2NyaXB0aW9ucykge1xuICAgICAgICAgICAgICAgIGlmIChzLmVuYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc3Vic2NyaWJlKCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIHN1YnNjcmlwdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgdW5yZWdpc3RlciBsaXN0ZW5lciBjb250ZXh0ICovXG5mdW5jdGlvbiB1bnJlZ2lzdGVyKGNvbnRleHQ6IENvbnRleHQsIHRhcmdldD86IFN1YnNjcmliYWJsZSwgY2hhbm5lbD86IHN0cmluZyB8IHN0cmluZ1tdLCBsaXN0ZW5lcj86IFVua25vd25GdW5jdGlvbik6IHZvaWQge1xuICAgIGlmIChudWxsICE9IHRhcmdldCkge1xuICAgICAgICB0YXJnZXQub2ZmKGNoYW5uZWwsIGxpc3RlbmVyKTtcblxuICAgICAgICBjb25zdCBsaXN0ZW5lck1hcCA9IGNvbnRleHQubWFwLmdldCh0YXJnZXQpO1xuICAgICAgICBpZiAoIWxpc3RlbmVyTWFwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bGwgIT0gY2hhbm5lbCkge1xuICAgICAgICAgICAgY29uc3QgY2hhbm5lbHMgPSBpc0FycmF5KGNoYW5uZWwpID8gY2hhbm5lbCA6IFtjaGFubmVsXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lck1hcC5nZXQoY2gpO1xuICAgICAgICAgICAgICAgIGlmICghbWFwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxpc3RlbmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHMgPSBtYXAuZ2V0KGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuc2V0LmRlbGV0ZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBtYXAuZGVsZXRlKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2YgbWFwLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnNldC5kZWxldGUocyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG1hcCBvZiBsaXN0ZW5lck1hcC52YWx1ZXMoKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBtYXAudmFsdWVzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnNldC5kZWxldGUocyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChjb25zdCBzIG9mIGNvbnRleHQuc2V0KSB7XG4gICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5tYXAgPSBuZXcgV2Vha01hcCgpO1xuICAgICAgICBjb250ZXh0LnNldC5jbGVhcigpO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyB0byB3aGljaCB0aGUgc2FmZSBldmVudCByZWdpc3Rlci91bnJlZ2lzdGVyIG1ldGhvZCBpcyBvZmZlcmVkIGZvciB0aGUgb2JqZWN0IHdoaWNoIGlzIGEgc2hvcnQgbGlmZSBjeWNsZSB0aGFuIHN1YnNjcmlwdGlvbiB0YXJnZXQuIDxicj5cbiAqICAgICBUaGUgYWR2YW50YWdlIG9mIHVzaW5nIHRoaXMgZm9ybSwgaW5zdGVhZCBvZiBgb24oKWAsIGlzIHRoYXQgYGxpc3RlblRvKClgIGFsbG93cyB0aGUgb2JqZWN0IHRvIGtlZXAgdHJhY2sgb2YgdGhlIGV2ZW50cyxcbiAqICAgICBhbmQgdGhleSBjYW4gYmUgcmVtb3ZlZCBhbGwgYXQgb25jZSBsYXRlciBjYWxsIGBzdG9wTGlzdGVuaW5nKClgLlxuICogQGphIOizvOiqreWvvuixoeOCiOOCiuOCguODqeOCpOODleOCteOCpOOCr+ODq+OBjOefreOBhOOCquODluOCuOOCp+OCr+ODiOOBq+WvvuOBl+OBpiwg5a6J5YWo44Gq44Kk44OZ44Oz44OI55m76YyyL+ino+mZpOODoeOCveODg+ODieOCkuaPkOS+m+OBmeOCi+OCr+ODqeOCuSA8YnI+XG4gKiAgICAgYG9uKClgIOOBruS7o+OCj+OCiuOBqyBgbGlzdGVuVG8oKWAg44KS5L2/55So44GZ44KL44GT44Go44GnLCDlvozjgasgYHN0b3BMaXN0ZW5pbmcoKWAg44KSMeW6puWRvOOBtuOBoOOBkeOBp+OBmeOBueOBpuOBruODquOCueODiuODvOOCkuino+mZpOOBp+OBjeOCi+WIqeeCueOBjOOBguOCiy5cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEV2ZW50UmVjZWl2ZXIsIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuICpcbiAqIC8vIGRlY2xhcmUgZXZlbnQgaW50ZXJmYWNlXG4gKiBpbnRlcmZhY2UgU2FtcGxlRXZlbnQge1xuICogICBob2dlOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqICAgZm9vOiBbdm9pZF07ICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3NcbiAqICAgaG9vOiB2b2lkOyAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3MgKHNhbWUgdGhlIHVwb24pXG4gKiAgIGJhcjogW0Vycm9yXTsgICAgICAgICAgICAgICAgICAvLyBhbnkgY2xhc3MgaXMgYXZhaWxhYmxlLlxuICogICBiYXo6IEVycm9yIHwgTnVtYmVyOyAgICAgICAgICAgLy8gaWYgb25seSBvbmUgYXJndW1lbnQsIGBbXWAgaXMgbm90IHJlcXVpcmVkLlxuICogfVxuICpcbiAqIC8vIGRlY2xhcmUgY2xpZW50IGNsYXNzXG4gKiBjbGFzcyBTYW1wbGVSZWNlaXZlciBleHRlbmRzIEV2ZW50UmVjZWl2ZXIge1xuICogICBjb25zdHJ1Y3Rvcihicm9rZXI6IEV2ZW50QnJva2VyPFNhbXBsZUV2ZW50Pikge1xuICogICAgIHN1cGVyKCk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsICdob2dlJywgKG51bTogbnVtYmVyLCBzdHI6IHN0cmluZykgPT4geyAuLi4gfSk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsICdiYXInLCAoZTogRXJyb3IpID0+IHsgLi4uIH0pO1xuICogICAgIHRoaXMubGlzdGVuVG8oYnJva2VyLCBbJ2ZvbycsICdob28nXSwgKCkgPT4geyAuLi4gfSk7XG4gKiAgIH1cbiAqXG4gKiAgIHJlbGVhc2UoKTogdm9pZCB7XG4gKiAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIG9yXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGJyb2tlciAgID0gbmV3IEV2ZW50QnJva2VyPFNhbXBsZUV2ZW50PigpO1xuICogY29uc3QgcmVjZWl2ZXIgPSBuZXcgRXZlbnRSZWNlaXZlcigpO1xuICpcbiAqIHJlY2VpdmVyLmxpc3RlblRvKGJyb2tlciwgJ2hvZ2UnLCAobnVtOiBudW1iZXIsIHN0cjogc3RyaW5nKSA9PiB7IC4uLiB9KTtcbiAqIHJlY2VpdmVyLmxpc3RlblRvKGJyb2tlciwgJ2JhcicsIChlOiBFcnJvcikgPT4geyAuLi4gfSk7XG4gKiByZWNlaXZlci5saXN0ZW5Ubyhicm9rZXIsIFsnZm9vJywgJ2hvbyddLCAoKSA9PiB7IC4uLiB9KTtcbiAqXG4gKiByZWNlaXZlci5zdG9wTGlzdGVuaW5nKCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIEV2ZW50UmVjZWl2ZXIge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfY29udGV4dF06IENvbnRleHQ7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpc1tfY29udGV4dF0gPSB7IG1hcDogbmV3IFdlYWtNYXAoKSwgc2V0OiBuZXcgU2V0KCkgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGVsbCBhbiBvYmplY3QgdG8gbGlzdGVuIHRvIGEgcGFydGljdWxhciBldmVudCBvbiBhbiBvdGhlciBvYmplY3QuXG4gICAgICogQGphIOWvvuixoeOCquODluOCuOOCp+OCr+ODiOOBruOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHRhcmdldFxuICAgICAqICAtIGBlbmAgZXZlbnQgbGlzdGVuaW5nIHRhcmdldCBvYmplY3QuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jos7zoqq3lr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIGxpc3RlblRvPFQgZXh0ZW5kcyBTdWJzY3JpYmFibGUsIEV2ZW50IGV4dGVuZHMgRXZlbnRTY2hlbWE8VD4gPSBFdmVudFNjaGVtYTxUPiwgQ2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50ID0ga2V5b2YgRXZlbnQ+KFxuICAgICAgICB0YXJnZXQ6IFQsXG4gICAgICAgIGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sXG4gICAgICAgIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93blxuICAgICk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiByZWdpc3Rlcih0aGlzW19jb250ZXh0XSwgdGFyZ2V0LCBjaGFubmVsIGFzIHN0cmluZywgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdXN0IGxpa2UgbGlzdGVuVG8sIGJ1dCBjYXVzZXMgdGhlIGJvdW5kIGNhbGxiYWNrIHRvIGZpcmUgb25seSBvbmNlIGJlZm9yZSBiZWluZyByZW1vdmVkLlxuICAgICAqIEBqYSDlr77osaHjgqrjg5bjgrjjgqfjgq/jg4jjga7kuIDluqbjgaDjgZHjg4/jg7Pjg4njg6rjg7PjgrDlj6/og73jgarjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXRcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGxpc3RlbmluZyB0YXJnZXQgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI6LO86Kqt5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBsaXN0ZW5Ub09uY2U8VCBleHRlbmRzIFN1YnNjcmliYWJsZSwgRXZlbnQgZXh0ZW5kcyBFdmVudFNjaGVtYTxUPiA9IEV2ZW50U2NoZW1hPFQ+LCBDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQgPSBrZXlvZiBFdmVudD4oXG4gICAgICAgIHRhcmdldDogVCxcbiAgICAgICAgY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSxcbiAgICAgICAgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duXG4gICAgKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHJlZ2lzdGVyKHRoaXNbX2NvbnRleHRdLCB0YXJnZXQsIGNoYW5uZWwgYXMgc3RyaW5nLCBsaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IG1hbmFnZWQgPSB0YXJnZXQub24oY2hhbm5lbCwgKCkgPT4ge1xuICAgICAgICAgICAgdW5yZWdpc3Rlcih0aGlzW19jb250ZXh0XSwgdGFyZ2V0LCBjaGFubmVsIGFzIHN0cmluZywgbGlzdGVuZXIpO1xuICAgICAgICAgICAgbWFuYWdlZC51bnN1YnNjcmliZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRlbGwgYW4gb2JqZWN0IHRvIHN0b3AgbGlzdGVuaW5nIHRvIGV2ZW50cy5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0XG4gICAgICogIC0gYGVuYCBldmVudCBsaXN0ZW5pbmcgdGFyZ2V0IG9iamVjdC5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOizvOiqreWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm44Gu44Oq44K544OK44O844KS6Kej6ZmkXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZCBsaXN0ZW5lcnMgZnJvbSBgdGFyZ2V0YC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5a++6LGhIGB0YXJnZXRgIOOBruODquOCueODiuODvOOCkuOBmeOBueOBpuino+mZpFxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WQjOS4gCBgY2hhbm5lbGAg44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgcHVibGljIHN0b3BMaXN0ZW5pbmc8VCBleHRlbmRzIFN1YnNjcmliYWJsZSwgRXZlbnQgZXh0ZW5kcyBFdmVudFNjaGVtYTxUPiA9IEV2ZW50U2NoZW1hPFQ+LCBDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQgPSBrZXlvZiBFdmVudD4oXG4gICAgICAgIHRhcmdldD86IFQsXG4gICAgICAgIGNoYW5uZWw/OiBDaGFubmVsIHwgQ2hhbm5lbFtdLFxuICAgICAgICBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duXG4gICAgKTogdGhpcyB7XG4gICAgICAgIHVucmVnaXN0ZXIodGhpc1tfY29udGV4dF0sIHRhcmdldCwgY2hhbm5lbCBhcyBzdHJpbmcsIGxpc3RlbmVyKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7IG1peGlucyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudEJyb2tlciB9IGZyb20gJy4vYnJva2VyJztcbmltcG9ydCB7IEV2ZW50UmVjZWl2ZXIgfSBmcm9tICcuL3JlY2VpdmVyJztcblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIHdoaWNoIGhhdmUgSS9GIG9mIFtbRXZlbnRCcm9rZXJdXSBhbmQgW1tFdmVudFJlY2VpdmVyXV0uIDxicj5cbiAqICAgICBgRXZlbnRzYCBjbGFzcyBvZiBgQmFja2JvbmUuanNgIGVxdWl2YWxlbmNlLlxuICogQGphIFtbRXZlbnRCcm9rZXJdXSDjgaggW1tFdmVudFJlY2VpdmVyXV0g44GuIEkvRiDjgpLjgYLjgo/jgZvmjIHjgaTjgq/jg6njgrkgPGJyPlxuICogICAgIGBCYWNrYm9uZS5qc2Ag44GuIGBFdmVudHNgIOOCr+ODqeOCueebuOW9k1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgRXZlbnRTb3VyY2UgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG4gKlxuICogLy8gZGVjbGFyZSBldmVudCBpbnRlcmZhY2VcbiAqIGludGVyZmFjZSBUYXJnZXRFdmVudCB7XG4gKiAgIGhvZ2U6IFtudW1iZXIsIHN0cmluZ107ICAgICAgICAvLyBjYWxsYmFjayBmdW5jdGlvbidzIGFyZ3MgdHlwZSB0dXBsZVxuICogICBmb286IFt2b2lkXTsgICAgICAgICAgICAgICAgICAgLy8gbm8gYXJnc1xuICogICBob286IHZvaWQ7ICAgICAgICAgICAgICAgICAgICAgLy8gbm8gYXJncyAoc2FtZSB0aGUgdXBvbilcbiAqICAgYmFyOiBbRXJyb3JdOyAgICAgICAgICAgICAgICAgIC8vIGFueSBjbGFzcyBpcyBhdmFpbGFibGUuXG4gKiAgIGJhejogRXJyb3IgfCBOdW1iZXI7ICAgICAgICAgICAvLyBpZiBvbmx5IG9uZSBhcmd1bWVudCwgYFtdYCBpcyBub3QgcmVxdWlyZWQuXG4gKiB9XG4gKlxuICogaW50ZXJmYWNlIFNhbXBsZUV2ZW50IHtcbiAqICAgZnVnYTogW251bWJlciwgc3RyaW5nXTsgICAgICAgIC8vIGNhbGxiYWNrIGZ1bmN0aW9uJ3MgYXJncyB0eXBlIHR1cGxlXG4gKiB9XG4gKlxuICogLy8gZGVjbGFyZSBjbGllbnQgY2xhc3NcbiAqIGNsYXNzIFNhbXBsZVNvdXJjZSBleHRlbmRzIEV2ZW50U291cmNlPFNhbXBsZUV2ZW50PiB7XG4gKiAgIGNvbnN0cnVjdG9yKHRhcmdldDogRXZlbnRTb3VyY2U8VGFyZ2V0RXZlbnQ+KSB7XG4gKiAgICAgc3VwZXIoKTtcbiAqICAgICB0aGlzLmxpc3RlblRvKGJyb2tlciwgJ2hvZ2UnLCAobnVtOiBudW1iZXIsIHN0cjogc3RyaW5nKSA9PiB7IC4uLiB9KTtcbiAqICAgICB0aGlzLmxpc3RlblRvKGJyb2tlciwgJ2JhcicsIChlOiBFcnJvcikgPT4geyAuLi4gfSk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsIFsnZm9vJywgJ2hvbyddLCAoKSA9PiB7IC4uLiB9KTtcbiAqICAgfVxuICpcbiAqICAgcmVsZWFzZSgpOiB2b2lkIHtcbiAqICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAqICAgfVxuICogfVxuICpcbiAqIGNvbnN0IHNhbXBsZSA9IG5ldyBTYW1wbGVTb3VyY2UoKTtcbiAqXG4gKiBzYW1wbGUub24oJ2Z1Z2EnLCAoYTogbnVtYmVyLCBiOiBzdHJpbmcpID0+IHsgLi4uIH0pOyAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiBzYW1wbGUudHJpZ2dlcignZnVnYScsIDEwMCwgJ3Rlc3QnKTsgICAgICAgICAgICAgICAgICAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiBgYGBcbiAqL1xudHlwZSBFdmVudFNvdXJjZUJhc2U8VCBleHRlbmRzIG9iamVjdD4gPSBFdmVudEJyb2tlcjxUPiAmIEV2ZW50UmVjZWl2ZXI7XG5cbi8qKiBAaW50ZXJuYWwgW1tFdmVudFNvdXJjZV1dIGNsYXNzICovXG5jbGFzcyBFdmVudFNvdXJjZSBleHRlbmRzIG1peGlucyhFdmVudEJyb2tlciwgRXZlbnRSZWNlaXZlcikge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLnN1cGVyKEV2ZW50UmVjZWl2ZXIpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29uc3RydWN0b3Igb2YgW1tFdmVudFNvdXJjZV1dXG4gKiBAamEgW1tFdmVudFNvdXJjZV1dIOOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wun+S9k1xuICovXG5jb25zdCBFdmVudFNvdXJjZUJhc2U6IHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IEV2ZW50U291cmNlQmFzZTxhbnk+O1xuICAgIG5ldyA8VCBleHRlbmRzIG9iamVjdD4oKTogRXZlbnRTb3VyY2VCYXNlPFQ+O1xufSA9IEV2ZW50U291cmNlIGFzIGFueTtcblxuZXhwb3J0IHsgRXZlbnRTb3VyY2VCYXNlIGFzIEV2ZW50U291cmNlIH07XG4iLCJpbXBvcnQgeyBFdmVudEJyb2tlciwgU3Vic2NyaXB0aW9uIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuXG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBfY2FuY2VsID0gU3ltYm9sKCdjYW5jZWwnKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IF9jbG9zZSAgPSBTeW1ib2woJ2Nsb3NlJyk7XG5cbi8qKlxuICogQGVuIENhbmNlbFRva2VuIHN0YXRlIGRlZmluaXRpb25zLlxuICogQGphIENhbmNlbFRva2VuIOOBrueKtuaFi+Wumue+qVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY29uc3QgZW51bSBDYW5jZWxUb2tlblN0YXRlIHtcbiAgICAvKiog44Kt44Oj44Oz44K744Or5Y+X5LuY5Y+v6IO9ICovXG4gICAgT1BFTiAgICAgICAgPSAweDAsXG4gICAgLyoqIOOCreODo+ODs+OCu+ODq+WPl+S7mOa4iOOBvyAqL1xuICAgIFJFUVVFU1RFRCAgID0gMHgxLFxuICAgIC8qKiDjgq3jg6Pjg7Pjgrvjg6vlj5fku5jkuI3lj68gKi9cbiAgICBDTE9TRUQgICAgICA9IDB4Mixcbn1cblxuLyoqXG4gKiBAZW4gQ2FuY2VsIGV2ZW50IGRlZmluaXRpb25zLlxuICogQGphIOOCreODo+ODs+OCu+ODq+OCpOODmeODs+ODiOWumue+qVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgaW50ZXJmYWNlIENhbmNlbEV2ZW50PFQ+IHtcbiAgICBjYW5jZWw6IFtUXTtcbn1cblxuLyoqXG4gKiBAZW4gSW50ZXJuYWwgQ2FuY2VsVG9rZW4gaW50ZXJmYWNlLlxuICogQGphIENhbmNlbFRva2VuIOOBruWGhemDqOOCpOODs+OCv+ODvOODleOCp+OCpOOCueWumue+qVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgaW50ZXJmYWNlIENhbmNlbFRva2VuQ29udGV4dDxUID0gdW5rbm93bj4ge1xuICAgIHJlYWRvbmx5IGJyb2tlcjogRXZlbnRCcm9rZXI8Q2FuY2VsRXZlbnQ8VD4+O1xuICAgIHJlYWRvbmx5IHN1YnNjcmlwdGlvbnM6IFNldDxTdWJzY3JpcHRpb24+O1xuICAgIHJlYXNvbjogVCB8IHVuZGVmaW5lZDtcbiAgICBzdGF0dXM6IENhbmNlbFRva2VuU3RhdGU7XG59XG5cbi8qKlxuICogQGVuIEludmFsaWQgc3Vic2NyaXB0aW9uIG9iamVjdCBkZWNsYXJhdGlvbi5cbiAqIEBqYSDnhKHlirnjgaogU3Vic2NyaXB0aW9uIOOCquODluOCuOOCp+OCr+ODiFxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY29uc3QgaW52YWxpZFN1YnNjcmlwdGlvbiA9IE9iamVjdC5mcmVlemUoe1xuICAgIGVuYWJsZTogZmFsc2UsXG4gICAgdW5zdWJzY3JpYmUoKSB7IC8qIG5vb3AgKi8gfVxufSkgYXMgU3Vic2NyaXB0aW9uO1xuIiwiaW1wb3J0IHsgdmVyaWZ5IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50QnJva2VyLCBTdWJzY3JpcHRpb24gfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQge1xuICAgIF9jYW5jZWwsXG4gICAgX2Nsb3NlLFxuICAgIENhbmNlbFRva2VuU3RhdGUsXG4gICAgQ2FuY2VsVG9rZW5Db250ZXh0LFxuICAgIGludmFsaWRTdWJzY3JpcHRpb24sXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKipcbiAqIEBlbiBDYW5jZWxsYXRpb24gc291cmNlIGludGVyZmFjZS5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vnrqHnkIbjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5jZWxUb2tlblNvdXJjZTxUID0gdW5rbm93bj4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBbW0NhbmNlbFRva2VuXV0gZ2V0dGVyLlxuICAgICAqIEBqYSBbW0NhbmNlbFRva2VuXV0g5Y+W5b6XXG4gICAgICovXG4gICAgcmVhZG9ubHkgdG9rZW46IENhbmNlbFRva2VuPFQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgY2FuY2VsLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSByZWFzb25cbiAgICAgKiAgLSBgZW5gIGNhbmNlbGxhdGlvbiByZWFzb24uIHRoaXMgYXJnIGlzIHRyYW5zbWl0dGVkIGluIHByb21pc2UgY2hhaW4uXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6vjga7nkIbnlLHjgpLmjIflrpouIGBQcm9taXNlYCDjg4HjgqfjgqTjg7PjgavkvJ3pgZTjgZXjgozjgosuXG4gICAgICovXG4gICAgY2FuY2VsKHJlYXNvbjogVCk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQnJlYWsgdXAgY2FuY2VsbGF0aW9uIHJlY2VwdGlvbi5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5Y+X5LuY44KS57WC5LqGXG4gICAgICovXG4gICAgY2xvc2UoKTogdm9pZDtcbn1cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfdG9rZW5zID0gbmV3IFdlYWtNYXA8Q2FuY2VsVG9rZW4sIENhbmNlbFRva2VuQ29udGV4dD4oKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gZ2V0Q29udGV4dDxUID0gdW5rbm93bj4oaW5zdGFuY2U6IENhbmNlbFRva2VuPFQ+KTogQ2FuY2VsVG9rZW5Db250ZXh0PFQ+IHtcbiAgICBpZiAoIV90b2tlbnMuaGFzKGluc3RhbmNlKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgb2JqZWN0IGlzIG5vdCBhIHZhbGlkIENhbmNlbFRva2VuLicpO1xuICAgIH1cbiAgICByZXR1cm4gX3Rva2Vucy5nZXQoaW5zdGFuY2UpIGFzIENhbmNlbFRva2VuQ29udGV4dDxUPjtcbn1cblxuLyoqXG4gKiBAZW4gVGhlIHRva2VuIG9iamVjdCB0byB3aGljaCB1bmlmaWNhdGlvbiBwcm9jZXNzaW5nIGZvciBhc3luY2hyb25vdXMgcHJvY2Vzc2luZyBjYW5jZWxsYXRpb24gaXMgb2ZmZXJlZC4gPGJyPlxuICogICAgIE9yaWdpbiBpcyBgQ2FuY2VsbGF0aW9uVG9rZW5gIG9mIGAuTkVUIEZyYW1ld29ya2AuXG4gKiBAamEg6Z2e5ZCM5pyf5Yem55CG44Kt44Oj44Oz44K744Or44Gu44Gf44KB44Gu57Wx5LiA5Yem55CG44KS5o+Q5L6b44GZ44KL44OI44O844Kv44Oz44Kq44OW44K444Kn44Kv44OIIDxicj5cbiAqICAgICDjgqrjg6rjgrjjg4rjg6vjga8gYC5ORVQgRnJhbWV3b3JrYCDjga4gYENhbmNlbGxhdGlvblRva2VuYFxuICpcbiAqIEBzZWUgaHR0cHM6Ly9kb2NzLm1pY3Jvc29mdC5jb20vZW4tdXMvZG90bmV0L3N0YW5kYXJkL3RocmVhZGluZy9jYW5jZWxsYXRpb24taW4tbWFuYWdlZC10aHJlYWRzXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG4gKiBgYGBcbiAqXG4gKiAtIEJhc2ljIFVzYWdlXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHRva2VuID0gbmV3IENhbmNlbFRva2VuKChjYW5jZWwsIGNsb3NlKSA9PiB7XG4gKiAgIGJ1dHRvbjEub25jbGljayA9IGV2ID0+IGNhbmNlbChuZXcgRXJyb3IoJ0NhbmNlbCcpKTtcbiAqICAgYnV0dG9uMi5vbmNsaWNrID0gZXYgPT4gY2xvc2UoKTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogb3JcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgeyBjYW5jZWwsIGNsb3NlLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7XG4gKiBidXR0b24xLm9uY2xpY2sgPSBldiA9PiBjYW5jZWwobmV3IEVycm9yKCdDYW5jZWwnKSk7XG4gKiBidXR0b24yLm9uY2xpY2sgPSBldiA9PiBjbG9zZSgpO1xuICogYGBgXG4gKlxuICogLSBVc2Ugd2l0aCBQcm9taXNlXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHsgY2FuY2VsLCBjbG9zZSwgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZSgpO1xuICogY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChvaywgbmcpID0+IHsgLi4uIH0sIHRva2VuKTtcbiAqIHByb21pc2VcbiAqICAgLnRoZW4oLi4uKVxuICogICAudGhlbiguLi4pXG4gKiAgIC50aGVuKC4uLilcbiAqICAgLmNhdGNoKHJlYXNvbiA9PiB7XG4gKiAgICAgLy8gY2hlY2sgcmVhc29uXG4gKiAgIH0pO1xuICogYGBgXG4gKlxuICogLSBSZWdpc3RlciAmIFVucmVnaXN0ZXIgY2FsbGJhY2socylcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgeyBjYW5jZWwsIGNsb3NlLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7XG4gKiBjb25zdCBzdWJzY3JpcHRpb24gPSB0b2tlbi5yZWdpc3RlcihyZWFzb24gPT4ge1xuICogICBjb25zb2xlLmxvZyhyZWFzb24ubWVzc2FnZSk7XG4gKiB9KTtcbiAqIGlmIChzb21lQ2FzZSkge1xuICogICBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgQ2FuY2VsVG9rZW48VCA9IHVua25vd24+IHtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgW1tDYW5jZWxUb2tlblNvdXJjZV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSBbW0NhbmNlbFRva2VuU291cmNlXV0g44Kk44Oz44K544K/44Oz44K544Gu5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlua2VkVG9rZW5zXG4gICAgICogIC0gYGVuYCByZWxhdGluZyBhbHJlYWR5IG1hZGUgW1tDYW5jZWxUb2tlbl1dIGluc3RhbmNlLlxuICAgICAqICAgICAgICBZb3UgY2FuIGF0dGFjaCB0byB0aGUgdG9rZW4gdGhhdCB0byBiZSBhIGNhbmNlbGxhdGlvbiB0YXJnZXQuXG4gICAgICogIC0gYGphYCDjgZnjgafjgavkvZzmiJDjgZXjgozjgZ8gW1tDYW5jZWxUb2tlbl1dIOmWoumAo+S7mOOBkeOCi+WgtOWQiOOBq+aMh+WumlxuICAgICAqICAgICAgICDmuKHjgZXjgozjgZ8gdG9rZW4g44Gv44Kt44Oj44Oz44K744Or5a++6LGh44Go44GX44Gm57SQ44Gl44GR44KJ44KM44KLXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBzb3VyY2U8VCA9IHVua25vd24+KC4uLmxpbmtlZFRva2VuczogQ2FuY2VsVG9rZW5bXSk6IENhbmNlbFRva2VuU291cmNlPFQ+IHtcbiAgICAgICAgbGV0IGNhbmNlbCE6IChyZWFzb246IFQpID0+IHZvaWQ7XG4gICAgICAgIGxldCBjbG9zZSE6ICgpID0+IHZvaWQ7XG4gICAgICAgIGNvbnN0IHRva2VuID0gbmV3IENhbmNlbFRva2VuPFQ+KChvbkNhbmNlbCwgb25DbG9zZSkgPT4ge1xuICAgICAgICAgICAgY2FuY2VsID0gb25DYW5jZWw7XG4gICAgICAgICAgICBjbG9zZSA9IG9uQ2xvc2U7XG4gICAgICAgIH0sIC4uLmxpbmtlZFRva2Vucyk7XG4gICAgICAgIHJldHVybiBPYmplY3QuZnJlZXplKHsgdG9rZW4sIGNhbmNlbCwgY2xvc2UgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBleGVjdXRvclxuICAgICAqICAtIGBlbmAgZXhlY3V0ZXIgdGhhdCBoYXMgYGNhbmNlbGAgYW5kIGBjbG9zZWAgY2FsbGJhY2suXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6sv44Kv44Ot44O844K6IOWun+ihjOOCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBsaW5rZWRUb2tlbnNcbiAgICAgKiAgLSBgZW5gIHJlbGF0aW5nIGFscmVhZHkgbWFkZSBbW0NhbmNlbFRva2VuXV0gaW5zdGFuY2UuXG4gICAgICogICAgICAgIFlvdSBjYW4gYXR0YWNoIHRvIHRoZSB0b2tlbiB0aGF0IHRvIGJlIGEgY2FuY2VsbGF0aW9uIHRhcmdldC5cbiAgICAgKiAgLSBgamFgIOOBmeOBp+OBq+S9nOaIkOOBleOCjOOBnyBbW0NhbmNlbFRva2VuXV0g6Zai6YCj5LuY44GR44KL5aC05ZCI44Gr5oyH5a6aXG4gICAgICogICAgICAgIOa4oeOBleOCjOOBnyB0b2tlbiDjga/jgq3jg6Pjg7Pjgrvjg6vlr77osaHjgajjgZfjgabntJDjgaXjgZHjgonjgozjgotcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgZXhlY3V0b3I6IChjYW5jZWw6IChyZWFzb246IFQpID0+IHZvaWQsIGNsb3NlOiAoKSA9PiB2b2lkKSA9PiB2b2lkLFxuICAgICAgICAuLi5saW5rZWRUb2tlbnM6IENhbmNlbFRva2VuW11cbiAgICApIHtcbiAgICAgICAgdmVyaWZ5KCdpbnN0YW5jZU9mJywgQ2FuY2VsVG9rZW4sIHRoaXMpO1xuICAgICAgICB2ZXJpZnkoJ3R5cGVPZicsICdmdW5jdGlvbicsIGV4ZWN1dG9yKTtcblxuICAgICAgICBjb25zdCBsaW5rZWRUb2tlblNldCA9IG5ldyBTZXQobGlua2VkVG9rZW5zLmZpbHRlcih0ID0+IF90b2tlbnMuaGFzKHQpKSk7XG4gICAgICAgIGxldCBzdGF0dXMgPSBDYW5jZWxUb2tlblN0YXRlLk9QRU47XG4gICAgICAgIGZvciAoY29uc3QgdCBvZiBsaW5rZWRUb2tlblNldCkge1xuICAgICAgICAgICAgc3RhdHVzIHw9IGdldENvbnRleHQodCkuc3RhdHVzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29udGV4dDogQ2FuY2VsVG9rZW5Db250ZXh0PFQ+ID0ge1xuICAgICAgICAgICAgYnJva2VyOiBuZXcgRXZlbnRCcm9rZXIoKSxcbiAgICAgICAgICAgIHN1YnNjcmlwdGlvbnM6IG5ldyBTZXQoKSxcbiAgICAgICAgICAgIHJlYXNvbjogdW5kZWZpbmVkLFxuICAgICAgICAgICAgc3RhdHVzLFxuICAgICAgICB9O1xuICAgICAgICBfdG9rZW5zLnNldCh0aGlzLCBPYmplY3Quc2VhbChjb250ZXh0KSk7XG5cbiAgICAgICAgY29uc3QgY2FuY2VsID0gdGhpc1tfY2FuY2VsXTtcbiAgICAgICAgY29uc3QgY2xvc2UgPSB0aGlzW19jbG9zZV07XG4gICAgICAgIGlmIChzdGF0dXMgPT09IENhbmNlbFRva2VuU3RhdGUuT1BFTikge1xuICAgICAgICAgICAgZm9yIChjb25zdCB0IG9mIGxpbmtlZFRva2VuU2V0KSB7XG4gICAgICAgICAgICAgICAgY29udGV4dC5zdWJzY3JpcHRpb25zLmFkZCh0LnJlZ2lzdGVyKGNhbmNlbC5iaW5kKHRoaXMpKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWdpc3RlcihjYW5jZWwuYmluZCh0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleGVjdXRvcihjYW5jZWwuYmluZCh0aGlzKSwgY2xvc2UuYmluZCh0aGlzKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbmNlbGxhdGlvbiByZWFzb24gYWNjZXNzb3IuXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+OBruWOn+WboOWPluW+l1xuICAgICAqL1xuICAgIGdldCByZWFzb24oKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiBnZXRDb250ZXh0KHRoaXMpLnJlYXNvbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRW5hYmxlIGNhbmNlbGxhdGlvbiBzdGF0ZSBhY2Nlc3Nvci5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5Y+v6IO944GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGNhbmNlbGFibGUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBnZXRDb250ZXh0KHRoaXMpLnN0YXR1cyA9PT0gQ2FuY2VsVG9rZW5TdGF0ZS5PUEVOO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYW5jZWxsYXRpb24gcmVxdWVzdGVkIHN0YXRlIGFjY2Vzc29yLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjgpLlj5fjgZHku5jjgZHjgabjgYTjgovjgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgcmVxdWVzdGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISEoZ2V0Q29udGV4dCh0aGlzKS5zdGF0dXMgJiBDYW5jZWxUb2tlblN0YXRlLlJFUVVFU1RFRCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbmNlbGxhdGlvbiBjbG9zZWQgc3RhdGUgYWNjZXNzb3IuXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+WPl+S7mOOCkue1guS6huOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBjbG9zZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIShnZXRDb250ZXh0KHRoaXMpLnN0YXR1cyAmIENhbmNlbFRva2VuU3RhdGUuQ0xPU0VEKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gYHRvU3RyaW5nYCB0YWcgb3ZlcnJpZGUuXG4gICAgICogQGphIGB0b1N0cmluZ2Ag44K/44Kw44Gu44Kq44O844OQ44O844Op44Kk44OJXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpOiAnQ2FuY2VsVG9rZW4nIHsgcmV0dXJuICdDYW5jZWxUb2tlbic7IH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWdpc3RlciBjdXN0b20gY2FuY2VsbGF0aW9uIGNhbGxiYWNrLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vmmYLjga7jgqvjgrnjgr/jg6Dlh6bnkIbjga7nmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvbkNhbmNlbFxuICAgICAqICAtIGBlbmAgY2FuY2VsIG9wZXJhdGlvbiBjYWxsYmFja1xuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744Or44Kz44O844Or44OQ44OD44KvXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIGBTdWJzY3JpcHRpb25gIGluc3RhbmNlLlxuICAgICAqICAgICAgICBZb3UgY2FuIHJldm9rZSBjYW5jZWxsYXRpb24gdG8gY2FsbCBgdW5zdWJzY3JpYmVgIG1ldGhvZC5cbiAgICAgKiAgLSBgamFgIGBTdWJzY3JpcHRpb25gIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqICAgICAgICBgdW5zdWJzY3JpYmVgIOODoeOCveODg+ODieOCkuWRvOOBtuOBk+OBqOOBp+OCreODo+ODs+OCu+ODq+OCkueEoeWKueOBq+OBmeOCi+OBk+OBqOOBjOWPr+iDvVxuICAgICAqL1xuICAgIHB1YmxpYyByZWdpc3RlcihvbkNhbmNlbDogKHJlYXNvbjogVCkgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBnZXRDb250ZXh0KHRoaXMpO1xuICAgICAgICBpZiAoIXRoaXMuY2FuY2VsYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIGludmFsaWRTdWJzY3JpcHRpb247XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnRleHQuYnJva2VyLm9uKCdjYW5jZWwnLCBvbkNhbmNlbCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19jYW5jZWxdKHJlYXNvbjogVCk6IHZvaWQge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gZ2V0Q29udGV4dCh0aGlzKTtcbiAgICAgICAgdmVyaWZ5KCdub3ROaWwnLCByZWFzb24pO1xuICAgICAgICBpZiAoIXRoaXMuY2FuY2VsYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQucmVhc29uID0gcmVhc29uO1xuICAgICAgICBjb250ZXh0LnN0YXR1cyB8PSBDYW5jZWxUb2tlblN0YXRlLlJFUVVFU1RFRDtcbiAgICAgICAgZm9yIChjb25zdCBzIG9mIGNvbnRleHQuc3Vic2NyaXB0aW9ucykge1xuICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQuYnJva2VyLnRyaWdnZXIoJ2NhbmNlbCcsIHJlYXNvbik7XG4gICAgICAgIHZvaWQgUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB0aGlzW19jbG9zZV0oKSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19jbG9zZV0oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBnZXRDb250ZXh0KHRoaXMpO1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0LnN0YXR1cyB8PSBDYW5jZWxUb2tlblN0YXRlLkNMT1NFRDtcbiAgICAgICAgZm9yIChjb25zdCBzIG9mIGNvbnRleHQuc3Vic2NyaXB0aW9ucykge1xuICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQuc3Vic2NyaXB0aW9ucy5jbGVhcigpO1xuICAgICAgICBjb250ZXh0LmJyb2tlci5vZmYoKTtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIG5vLWdsb2JhbC1hc3NpZ24sXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kLFxuICovXG5cbmltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICB2ZXJpZnksXG4gICAgZ2V0Q29uZmlnLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgQ2FuY2VsVG9rZW4gfSBmcm9tICcuL2NhbmNlbC10b2tlbic7XG5cbmRlY2xhcmUgZ2xvYmFsIHtcblxuICAgIGludGVyZmFjZSBQcm9taXNlQ29uc3RydWN0b3Ige1xuICAgICAgICBuZXcgPFQ+KGV4ZWN1dG9yOiAocmVzb2x2ZTogKHZhbHVlPzogVCB8IFByb21pc2VMaWtlPFQ+KSA9PiB2b2lkLCByZWplY3Q6IChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkKSA9PiB2b2lkLCBjYW5jZWxUb2tlbj86IENhbmNlbFRva2VuIHwgbnVsbCk6IFByb21pc2U8VD47XG4gICAgICAgIHJlc29sdmU8VD4odmFsdWU/OiBUIHwgUHJvbWlzZUxpa2U8VD4sIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsKTogUHJvbWlzZTxUPjtcbiAgICB9XG5cbn1cblxuLyoqIEBpbnRlcm5hbCBgTmF0aXZlIFByb21pc2VgIGNvbnN0cnVjdG9yICovXG5jb25zdCBOYXRpdmVQcm9taXNlID0gUHJvbWlzZTtcbi8qKiBAaW50ZXJuYWwgYE5hdGl2ZSB0aGVuYCBtZXRob2QgKi9cbmNvbnN0IG5hdGl2ZVRoZW4gPSBOYXRpdmVQcm9taXNlLnByb3RvdHlwZS50aGVuO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY3JlYXRlID0gU3ltYm9sKCdjcmVhdGUnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Rva2VucyA9IG5ldyBXZWFrTWFwPFByb21pc2U8dW5rbm93bj4sIENhbmNlbFRva2VuPigpO1xuXG4vKipcbiAqIEBlbiBFeHRlbmRlZCBgUHJvbWlzZWAgY2xhc3Mgd2hpY2ggZW5hYmxlZCBjYW5jZWxsYXRpb24uIDxicj5cbiAqICAgICBgTmF0aXZlIFByb21pc2VgIGNvbnN0cnVjdG9yIGlzIG92ZXJyaWRkZW4gYnkgZnJhbWV3b3JrIGRlZmF1bHQgYmVoYXZpb3VyLlxuICogQGphIOOCreODo+ODs+OCu+ODq+OCkuWPr+iDveOBq+OBl+OBnyBgUHJvbWlzZWAg5ouh5by144Kv44Op44K5IDxicj5cbiAqICAgICDml6LlrprjgacgYE5hdGl2ZSBQcm9taXNlYCDjgpLjgqrjg7zjg5Djg7zjg6njgqTjg4njgZnjgosuXG4gKi9cbmNsYXNzIENhbmNlbGFibGVQcm9taXNlPFQ+IGV4dGVuZHMgUHJvbWlzZTxUPiB7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gT3ZlcnJpZGluZyBvZiB0aGUgZGVmYXVsdCBjb25zdHJ1Y3RvciB1c2VkIGZvciBnZW5lcmF0aW9uIG9mIGFuIG9iamVjdC5cbiAgICAgKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu55Sf5oiQ44Gr5L2/44KP44KM44KL44OH44OV44Kp44Or44OI44Kz44Oz44K544OI44Op44Kv44K/44Gu44Kq44O844OQ44O844Op44Kk44OJXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0IFtTeW1ib2wuc3BlY2llc10oKTogUHJvbWlzZUNvbnN0cnVjdG9yIHsgcmV0dXJuIE5hdGl2ZVByb21pc2U7IH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGVzIGEgbmV3IHJlc29sdmVkIHByb21pc2UgZm9yIHRoZSBwcm92aWRlZCB2YWx1ZS5cbiAgICAgKiBAamEg5paw6KaP44Gr6Kej5rG65riI44G/IHByb21pc2Ug44Kk44Oz44K544K/44Oz44K544KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgdGhlIHZhbHVlIHRyYW5zbWl0dGVkIGluIHByb21pc2UgY2hhaW4uXG4gICAgICogIC0gYGphYCBgUHJvbWlzZWAg44Gr5Lyd6YGU44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGNhbmNlbFRva2VuXG4gICAgICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gaW5zdGFuY2UgY3JlYXRlIGZyb20gW1tDYW5jZWxUb2tlbl1dLmBzb3VyY2UoKWAuXG4gICAgICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0uYHNvdXJjZSgpYCDjgojjgorkvZzmiJDjgZfjgZ8gW1tDYW5jZWxUb2tlbl1dIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICAgICAqL1xuICAgIHN0YXRpYyByZXNvbHZlPFQ+KHZhbHVlPzogVCB8IFByb21pc2VMaWtlPFQ+LCBjYW5jZWxUb2tlbj86IENhbmNlbFRva2VuIHwgbnVsbCk6IENhbmNlbGFibGVQcm9taXNlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZV0oc3VwZXIucmVzb2x2ZSh2YWx1ZSksIGNhbmNlbFRva2VuKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHByaXZhdGUgY29uc3RydWN0aW9uICovXG4gICAgcHJpdmF0ZSBzdGF0aWMgW19jcmVhdGVdPFQsIFRSZXN1bHQxID0gVCwgVFJlc3VsdDIgPSBuZXZlcj4oXG4gICAgICAgIHNyYzogUHJvbWlzZTxUPixcbiAgICAgICAgdG9rZW4/OiBDYW5jZWxUb2tlbiB8IG51bGwsXG4gICAgICAgIHRoZW5BcmdzPzogW1xuICAgICAgICAgICAgKCh2YWx1ZTogVCkgPT4gVFJlc3VsdDEgfCBQcm9taXNlTGlrZTxUUmVzdWx0MT4pIHwgbnVsbCB8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICgocmVhc29uOiB1bmtub3duKSA9PiBUUmVzdWx0MiB8IFByb21pc2VMaWtlPFRSZXN1bHQyPikgfCBudWxsIHwgdW5kZWZpbmVkXG4gICAgICAgIF0gfCBudWxsXG4gICAgKTogQ2FuY2VsYWJsZVByb21pc2U8VFJlc3VsdDEgfCBUUmVzdWx0Mj4ge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBOYXRpdmVQcm9taXNlLCBzcmMpO1xuXG4gICAgICAgIGxldCBwOiBQcm9taXNlPFQgfCBUUmVzdWx0MSB8IFRSZXN1bHQyPjtcbiAgICAgICAgaWYgKCEodG9rZW4gaW5zdGFuY2VvZiBDYW5jZWxUb2tlbikpIHtcbiAgICAgICAgICAgIHAgPSBzcmM7XG4gICAgICAgIH0gZWxzZSBpZiAodGhlbkFyZ3MgJiYgKCFpc0Z1bmN0aW9uKHRoZW5BcmdzWzBdKSB8fCBpc0Z1bmN0aW9uKHRoZW5BcmdzWzFdKSkpIHtcbiAgICAgICAgICAgIHAgPSBzcmM7XG4gICAgICAgIH0gZWxzZSBpZiAodG9rZW4uY2FuY2VsYWJsZSkge1xuICAgICAgICAgICAgbGV0IHM6IFN1YnNjcmlwdGlvbjtcbiAgICAgICAgICAgIHAgPSBuZXcgTmF0aXZlUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgcyA9IHRva2VuLnJlZ2lzdGVyKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgbmF0aXZlVGhlbi5jYWxsKHNyYywgcmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3QgZGlzcG9zZSA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgX3Rva2Vucy5kZWxldGUocCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcC50aGVuKGRpc3Bvc2UsIGRpc3Bvc2UpO1xuICAgICAgICB9IGVsc2UgaWYgKHRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgcCA9IHN1cGVyLnJlamVjdCh0b2tlbi5yZWFzb24pO1xuICAgICAgICB9IGVsc2UgaWYgKHRva2VuLmNsb3NlZCkge1xuICAgICAgICAgICAgcCA9IHNyYztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5leHBlY3RlZCBFeGNlcHRpb24nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGVuQXJncykge1xuICAgICAgICAgICAgcCA9IG5hdGl2ZVRoZW4uYXBwbHkocCwgdGhlbkFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0b2tlbiAmJiB0b2tlbi5jYW5jZWxhYmxlKSB7XG4gICAgICAgICAgICBfdG9rZW5zLnNldChwLCB0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBwIGluc3RhbmNlb2YgdGhpcyB8fCBPYmplY3Quc2V0UHJvdG90eXBlT2YocCwgdGhpcy5wcm90b3R5cGUpO1xuXG4gICAgICAgIHJldHVybiBwIGFzIENhbmNlbGFibGVQcm9taXNlPFRSZXN1bHQxIHwgVFJlc3VsdDI+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZXhlY3V0b3JcbiAgICAgKiAgLSBgZW5gIEEgY2FsbGJhY2sgdXNlZCB0byBpbml0aWFsaXplIHRoZSBwcm9taXNlLiBUaGlzIGNhbGxiYWNrIGlzIHBhc3NlZCB0d28gYXJndW1lbnRzIGByZXNvbHZlYCBhbmQgYHJlamVjdGAuXG4gICAgICogIC0gYGphYCBwcm9taXNlIOOBruWIneacn+WMluOBq+S9v+eUqOOBmeOCi+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+Wumi4gYHJlc29sdmVgIOOBqCBgcmVqZWN0YCDjga4y44Gk44Gu5byV5pWw44KS5oyB44GkXG4gICAgICogQHBhcmFtIGNhbmNlbFRva2VuXG4gICAgICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gaW5zdGFuY2UgY3JlYXRlIGZyb20gW1tDYW5jZWxUb2tlbl1dLmBzb3VyY2UoKWAuXG4gICAgICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0uYHNvdXJjZSgpYCDjgojjgorkvZzmiJDjgZfjgZ8gW1tDYW5jZWxUb2tlbl1dIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBleGVjdXRvcjogKHJlc29sdmU6ICh2YWx1ZT86IFQgfCBQcm9taXNlTGlrZTxUPikgPT4gdm9pZCwgcmVqZWN0OiAocmVhc29uPzogdW5rbm93bikgPT4gdm9pZCkgPT4gdm9pZCxcbiAgICAgICAgY2FuY2VsVG9rZW4/OiBDYW5jZWxUb2tlbiB8IG51bGxcbiAgICApIHtcbiAgICAgICAgc3VwZXIoZXhlY3V0b3IpO1xuICAgICAgICByZXR1cm4gQ2FuY2VsYWJsZVByb21pc2VbX2NyZWF0ZV0odGhpcywgY2FuY2VsVG9rZW4pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGNhbGxiYWNrcyBmb3IgdGhlIHJlc29sdXRpb24gYW5kL29yIHJlamVjdGlvbiBvZiB0aGUgUHJvbWlzZS5cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIG9uZnVsZmlsbGVkIFRoZSBjYWxsYmFjayB0byBleGVjdXRlIHdoZW4gdGhlIFByb21pc2UgaXMgcmVzb2x2ZWQuXG4gICAgICogQHBhcmFtIG9ucmVqZWN0ZWQgVGhlIGNhbGxiYWNrIHRvIGV4ZWN1dGUgd2hlbiB0aGUgUHJvbWlzZSBpcyByZWplY3RlZC5cbiAgICAgKiBAcmV0dXJucyBBIFByb21pc2UgZm9yIHRoZSBjb21wbGV0aW9uIG9mIHdoaWNoIGV2ZXIgY2FsbGJhY2sgaXMgZXhlY3V0ZWQuXG4gICAgICovXG4gICAgdGhlbjxUUmVzdWx0MSA9IFQsIFRSZXN1bHQyID0gbmV2ZXI+KFxuICAgICAgICBvbmZ1bGZpbGxlZD86ICgodmFsdWU6IFQpID0+IFRSZXN1bHQxIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDE+KSB8IG51bGwsXG4gICAgICAgIG9ucmVqZWN0ZWQ/OiAoKHJlYXNvbjogdW5rbm93bikgPT4gVFJlc3VsdDIgfCBQcm9taXNlTGlrZTxUUmVzdWx0Mj4pIHwgbnVsbFxuICAgICk6IFByb21pc2U8VFJlc3VsdDEgfCBUUmVzdWx0Mj4ge1xuICAgICAgICByZXR1cm4gQ2FuY2VsYWJsZVByb21pc2VbX2NyZWF0ZV0odGhpcywgX3Rva2Vucy5nZXQodGhpcyksIFtvbmZ1bGZpbGxlZCwgb25yZWplY3RlZF0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGEgY2FsbGJhY2sgZm9yIG9ubHkgdGhlIHJlamVjdGlvbiBvZiB0aGUgUHJvbWlzZS5cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIG9ucmVqZWN0ZWQgVGhlIGNhbGxiYWNrIHRvIGV4ZWN1dGUgd2hlbiB0aGUgUHJvbWlzZSBpcyByZWplY3RlZC5cbiAgICAgKiBAcmV0dXJucyBBIFByb21pc2UgZm9yIHRoZSBjb21wbGV0aW9uIG9mIHRoZSBjYWxsYmFjay5cbiAgICAgKi9cbiAgICBjYXRjaDxUUmVzdWx0MiA9IG5ldmVyPihvbnJlamVjdGVkPzogKChyZWFzb246IHVua25vd24pID0+IFRSZXN1bHQyIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDI+KSB8IG51bGwpOiBQcm9taXNlPFQgfCBUUmVzdWx0Mj4ge1xuICAgICAgICByZXR1cm4gdGhpcy50aGVuKHVuZGVmaW5lZCwgb25yZWplY3RlZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXR0YWNoZXMgYSBjYWxsYmFjayB0aGF0IGlzIGludm9rZWQgd2hlbiB0aGUgUHJvbWlzZSBpcyBzZXR0bGVkIChmdWxmaWxsZWQgb3IgcmVqZWN0ZWQpLiA8YnI+XG4gICAgICogVGhlIHJlc29sdmVkIHZhbHVlIGNhbm5vdCBiZSBtb2RpZmllZCBmcm9tIHRoZSBjYWxsYmFjay5cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIG9uZmluYWxseSBUaGUgY2FsbGJhY2sgdG8gZXhlY3V0ZSB3aGVuIHRoZSBQcm9taXNlIGlzIHNldHRsZWQgKGZ1bGZpbGxlZCBvciByZWplY3RlZCkuXG4gICAgICogQHJldHVybnMgQSBQcm9taXNlIGZvciB0aGUgY29tcGxldGlvbiBvZiB0aGUgY2FsbGJhY2suXG4gICAgICovXG4gICAgZmluYWxseShvbmZpbmFsbHk/OiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQgfCBudWxsKTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiBDYW5jZWxhYmxlUHJvbWlzZVtfY3JlYXRlXShzdXBlci5maW5hbGx5KG9uZmluYWxseSksIF90b2tlbnMuZ2V0KHRoaXMpKTtcbiAgICB9XG5cbn1cblxuLyoqXG4gKiBAZW4gU3dpdGNoIHRoZSBnbG9iYWwgYFByb21pc2VgIGNvbnN0cnVjdG9yIGBOYXRpdmUgUHJvbWlzZWAgb3IgW1tDYW5jZWxhYmxlUHJvbWlzZV1dLiA8YnI+XG4gKiAgICAgYE5hdGl2ZSBQcm9taXNlYCBjb25zdHJ1Y3RvciBpcyBvdmVycmlkZGVuIGJ5IGZyYW1ld29yayBkZWZhdWx0IGJlaGF2aW91ci5cbiAqIEBqYSDjgrDjg63jg7zjg5Djg6sgYFByb21pc2VgIOOCs+ODs+OCueODiOODqeOCr+OCv+OCkiBgTmF0aXZlIFByb21pc2VgIOOBvuOBn+OBryBbW0NhbmNlbGFibGVQcm9taXNlXV0g44Gr5YiH44KK5pu/44GIIDxicj5cbiAqICAgICDml6LlrprjgacgYE5hdGl2ZSBQcm9taXNlYCDjgpLjgqrjg7zjg5Djg7zjg6njgqTjg4njgZnjgosuXG4gKlxuICogQHBhcmFtIGVuYWJsZVxuICogIC0gYGVuYCBgdHJ1ZWA6IHVzZSBbW0NhbmNlbGFibGVQcm9taXNlXV0gLyAgYGZhbHNlYDogdXNlIGBOYXRpdmUgUHJvbWlzZWBcbiAqICAtIGBqYWAgYHRydWVgOiBbW0NhbmNlbGFibGVQcm9taXNlXV0g44KS5L2/55SoIC8gYGZhbHNlYDogYE5hdGl2ZSBQcm9taXNlYCDjgpLkvb/nlKhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dGVuZFByb21pc2UoZW5hYmxlOiBib29sZWFuKTogUHJvbWlzZUNvbnN0cnVjdG9yIHtcbiAgICBpZiAoZW5hYmxlKSB7XG4gICAgICAgIFByb21pc2UgPSBDYW5jZWxhYmxlUHJvbWlzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBQcm9taXNlID0gTmF0aXZlUHJvbWlzZTtcbiAgICB9XG4gICAgcmV0dXJuIFByb21pc2U7XG59XG5cbi8qKiBAaW50ZXJuYWwgZ2xvYmFsIGNvbmZpZyBvcHRpb25zICovXG5pbnRlcmZhY2UgR2xvYmFsQ29uZmlnIHtcbiAgICBub0F1dG9tYXRpY05hdGl2ZUV4dGVuZDogYm9vbGVhbjtcbn1cblxuLy8gZGVmYXVsdDogYXV0b21hdGljIG5hdGl2ZSBwcm9taXNlIG92ZXJyaWRlLlxuZXh0ZW5kUHJvbWlzZSghZ2V0Q29uZmlnPEdsb2JhbENvbmZpZz4oKS5ub0F1dG9tYXRpY05hdGl2ZUV4dGVuZCk7XG5cbmV4cG9ydCB7XG4gICAgQ2FuY2VsYWJsZVByb21pc2UsXG4gICAgQ2FuY2VsYWJsZVByb21pc2UgYXMgUHJvbWlzZSxcbn07XG4iLCJpbXBvcnQgeyBDYW5jZWxUb2tlbiB9IGZyb20gJy4vY2FuY2VsLXRva2VuJztcblxuLyoqXG4gKiBAZW4gQ2FuY2VsYWJsZSBiYXNlIG9wdGlvbiBkZWZpbml0aW9uLlxuICogQGphIOOCreODo+ODs+OCu+ODq+WPr+iDveOBquWfuuW6leOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIENhbmNlbGFibGUge1xuICAgIGNhbmNlbD86IENhbmNlbFRva2VuO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gV2FpdCBmb3IgcHJvbWlzZXMgZG9uZS4gPGJyPlxuICogICAgIFdoaWxlIGNvbnRyb2wgd2lsbCBiZSByZXR1cm5lZCBpbW1lZGlhdGVseSB3aGVuIGBQcm9taXNlLmFsbCgpYCBmYWlscywgYnV0IHRoaXMgbWVodG9kIHdhaXRzIGZvciBpbmNsdWRpbmcgZmFpbHVyZS5cbiAqIEBqYSBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OI44Gu57WC5LqG44G+44Gn5b6F5qmfIDxicj5cbiAqICAgICBgUHJvbWlzZS5hbGwoKWAg44Gv5aSx5pWX44GZ44KL44Go44GZ44GQ44Gr5Yi25b6h44KS6L+U44GZ44Gu44Gr5a++44GX44CB5aSx5pWX44KC5ZCr44KB44Gm5b6F44GkIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gcHJvbWlzZXNcbiAqICAtIGBlbmAgUHJvbWlzZSBpbnN0YW5jZSBhcnJheVxuICogIC0gYGphYCBQcm9taXNlIOOCpOODs+OCueOCv+ODs+OCueOBrumFjeWIl+OCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2FpdChwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdKTogUHJvbWlzZTx1bmtub3duW10+IHtcbiAgICBjb25zdCBzYWZlUHJvbWlzZXMgPSBwcm9taXNlcy5tYXAoKHByb21pc2UpID0+IHByb21pc2UuY2F0Y2goKGUpID0+IGUpKTtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoc2FmZVByb21pc2VzKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2FuY2VsbGF0aW9uIGNoZWNrZXIgbWV0aG9kLiA8YnI+XG4gKiAgICAgSXQncyBwcmFjdGljYWJsZSBieSBgYXN5bmMgZnVuY3Rpb25gLlxuICogQGphIOOCreODo+ODs+OCu+ODq+ODgeOCp+ODg+OCq+ODvCA8YnI+XG4gKiAgICAgYGFzeW5jIGZ1bmN0aW9uYCDjgafkvb/nlKjlj6/og71cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICBhc3luYyBmdW5jdGlvbiBzb21lRnVuYyh0b2tlbjogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPHt9PiB7XG4gKiAgICBhd2FpdCBjaGVja0NhbmNlbGVkKHRva2VuKTtcbiAqICAgIHJldHVybiB7fTtcbiAqICB9XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrQ2FuY2VsZWQodG9rZW46IENhbmNlbFRva2VuIHwgdW5kZWZpbmVkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh1bmRlZmluZWQsIHRva2VuKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHN0YXR1cyBvZiB0aGUgcHJvbWlzZSBpbnN0YW5jZS4gPGJyPlxuICogICAgIEl0J3MgcHJhY3RpY2FibGUgYnkgYGFzeW5jIGZ1bmN0aW9uYC5cbiAqIEBqYSBQcm9taXNlIOOCpOODs+OCueOCv+ODs+OCueOBrueKtuaFi+OCkueiuuiqjSA8YnI+XG4gKiAgICAgYGFzeW5jIGZ1bmN0aW9uYCDjgafkvb/nlKjlj6/og71cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBwcm9taXNlXG4gKiAgLSBgZW5gIFByb21pc2UgaW5zdGFuY2VcbiAqICAtIGBqYWAgUHJvbWlzZSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrU3RhdHVzKHByb21pc2U6IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPCdwZW5kaW5nJyB8ICdmdWxmaWxsZWQnIHwgJ3JlamVjdGVkJz4ge1xuICAgIGNvbnN0IHBlbmRpbmcgPSB7fTtcbiAgICByZXR1cm4gUHJvbWlzZS5yYWNlKFtwcm9taXNlLCBwZW5kaW5nXSlcbiAgICAgICAgLnRoZW4odiA9PiAodiA9PT0gcGVuZGluZykgPyAncGVuZGluZycgOiAnZnVsZmlsbGVkJywgKCkgPT4gJ3JlamVjdGVkJyk7XG59XG4iLCJpbXBvcnQgeyBDYW5jZWxUb2tlbiB9IGZyb20gJy4vY2FuY2VsLXRva2VuJztcbmltcG9ydCB7IENhbmNlbGFibGVQcm9taXNlIH0gZnJvbSAnLi9jYW5jZWxhYmxlLXByb21pc2UnO1xuXG4vKipcbiAqIEBlbiBgRGVmZXJyZWRgIG9iamVjdCBjbGFzcyB0aGF0IGNhbiBvcGVyYXRlIGByZWplY3RgIGFuZGAgcmVzb2x2ZWAgZnJvbSB0aGUgb3V0c2lkZS5cbiAqIEBqYSBgcmVqZWN0YCwgYCByZXNvbHZlYCDjgpLlpJbpg6jjgojjgormk43kvZzlj6/og73jgaogYERlZmVycmVkYCDjgqrjg5bjgrjjgqfjgq/jg4jjgq/jg6njgrlcbiAqIFxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBkZiA9IG5ldyBEZWZlcnJlZCgpO1xuICogZGYucmVzb2x2ZSgpO1xuICogZGYucmVqZWN0KCdyZWFzb24nKTtcbiAqIFxuICogYXdhaXQgZGY7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIERlZmVycmVkPFQgPSB2b2lkPiBleHRlbmRzIENhbmNlbGFibGVQcm9taXNlPFQ+IHtcbiAgICByZWFkb25seSByZXNvbHZlITogKGFyZzogVCB8IFByb21pc2VMaWtlPFQ+KSA9PiB2b2lkO1xuICAgIHJlYWRvbmx5IHJlamVjdCE6IChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYW5jZWxUb2tlblxuICAgICAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIGluc3RhbmNlIGNyZWF0ZSBmcm9tIFtbQ2FuY2VsVG9rZW5dXS5gc291cmNlKClgLlxuICAgICAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dLmBzb3VyY2UoKWAg44KI44KK5L2c5oiQ44GX44GfIFtbQ2FuY2VsVG9rZW5dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihjYW5jZWxUb2tlbj86IENhbmNlbFRva2VuIHwgbnVsbCkge1xuICAgICAgICBjb25zdCBwdWJsaWNhdGlvbnMgPSB7fTtcbiAgICAgICAgc3VwZXIoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihwdWJsaWNhdGlvbnMsIHsgcmVzb2x2ZSwgcmVqZWN0IH0pO1xuICAgICAgICB9LCBjYW5jZWxUb2tlbik7XG4gICAgICAgIE9iamVjdC5hc3NpZ24odGhpcywgcHVibGljYXRpb25zKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZmxvYXRpbmctcHJvbWlzZXNcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6ICdEZWZlcnJlZCcgeyByZXR1cm4gJ0RlZmVycmVkJzsgfVxufVxuIiwiaW1wb3J0IHsgQ2FuY2VsVG9rZW5Tb3VyY2UgfSBmcm9tICcuL2NhbmNlbC10b2tlbic7XG5pbXBvcnQgeyB3YWl0IH0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyBtYW5hZ2VzIGx1bXBpbmcgbXVsdGlwbGUgYFByb21pc2VgIG9iamVjdHMuIDxicj5cbiAqICAgICBJdCdzIHBvc3NpYmxlIHRvIG1ha2UgdGhlbSBjYW5jZWwgbW9yZSB0aGFuIG9uZSBgUHJvbWlzZWAgd2hpY2ggaGFuZGxlcyBkaWZmZXJlbnQgW1tDYW5jZWxUb2tlbl1dIGJ5IGx1bXBpbmcuXG4gKiBAamEg6KSH5pWwIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4jjgpLkuIDmi6znrqHnkIbjgZnjgovjgq/jg6njgrkgPGJyPlxuICogICAgIOeVsOOBquOCiyBbW0NhbmNlbFRva2VuXV0g44KS5omx44GG6KSH5pWw44GuIGBQcm9taXNlYCDjgpLkuIDmi6zjgafjgq3jg6Pjg7Pjgrvjg6vjgZXjgZvjgovjgZPjgajjgYzlj6/og71cbiAqL1xuZXhwb3J0IGNsYXNzIFByb21pc2VNYW5hZ2VyIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZnVuYy1jYWxsLXNwYWNpbmdcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wb29sID0gbmV3IE1hcDxQcm9taXNlPHVua25vd24+LCAoKHJlYXNvbjogdW5rbm93bikgPT4gdW5rbm93bikgfCB1bmRlZmluZWQ+KCk7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGEgYFByb21pc2VgIG9iamVjdCB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEgYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiOOCkueuoeeQhuS4i+OBq+i/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHByb21pc2VcbiAgICAgKiAgLSBgZW5gIGFueSBgUHJvbWlzZWAgaW5zdGFuY2UgaXMgYXZhaWxhYmxlLlxuICAgICAqICAtIGBqYWAg5Lu75oSP44GuIGBQcm9taXNlYCDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKiBAcGFyYW0gY2FuY2VsU291cmNlXG4gICAgICogIC0gYGVuYCBbW0NhbmNlbFRva2VuU291cmNlXV0gaW5zdGFuY2UgbWFkZSBieSBgQ2FuY2VsVG9rZW4uc291cmNlKClgLlxuICAgICAqICAtIGBqYWAgYENhbmNlbFRva2VuLnNvdXJjZSgpYCDjgafnlJ/miJDjgZXjgozjgosgW1tDYW5jZWxUb2tlblNvdXJjZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZXR1cm4gdGhlIHNhbWUgaW5zdGFuY2Ugb2YgaW5wdXQgYHByb21pc2VgIGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg5YWl5Yqb44GX44GfIGBwcm9taXNlYCDjgajlkIzkuIDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkPFQ+KHByb21pc2U6IFByb21pc2U8VD4sIGNhbmNlbFNvdXJjZT86IENhbmNlbFRva2VuU291cmNlKTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHRoaXMuX3Bvb2wuc2V0KHByb21pc2UsIGNhbmNlbFNvdXJjZSAmJiBjYW5jZWxTb3VyY2UuY2FuY2VsKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcblxuICAgICAgICBjb25zdCBhbHdheXMgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICB0aGlzLl9wb29sLmRlbGV0ZShwcm9taXNlKTtcbiAgICAgICAgICAgIGlmIChjYW5jZWxTb3VyY2UpIHtcbiAgICAgICAgICAgICAgICBjYW5jZWxTb3VyY2UuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBwcm9taXNlXG4gICAgICAgICAgICAudGhlbihhbHdheXMsIGFsd2F5cyk7XG5cbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbGVhc2VkIGFsbCBpbnN0YW5jZXMgdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOCkuegtOajhFxuICAgICAqL1xuICAgIHB1YmxpYyByZWxlYXNlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9wb29sLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBgcHJvbWlzZWAgYXJyYXkgZnJvbSB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44GuIFByb21pc2Ug44KS6YWN5YiX44Gn5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHByb21pc2VzKCk6IFByb21pc2U8dW5rbm93bj5bXSB7XG4gICAgICAgIHJldHVybiBbLi4udGhpcy5fcG9vbC5rZXlzKCldO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYWxsIGBQcm9taXNlLmFsbCgpYCBmb3IgdW5kZXIgdGhlIG1hbmFnZW1lbnQuIDxicj5cbiAgICAgKiAgICAgV2FpdCBmb3IgYWxsIGBmdWxsZmlsbGVkYC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44Gr5a++44GX44GmIGBQcm9taXNlLmFsbCgpYCA8YnI+XG4gICAgICogICAgIOOBmeOBueOBpuOBjCBgZnVsbGZpbGxlZGAg44Gr44Gq44KL44G+44Gn5b6F5qmfXG4gICAgICovXG4gICAgcHVibGljIGFsbCgpOiBQcm9taXNlPHVua25vd25bXT4ge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FsbCBgUHJvbWlzZS5yYWNlKClgIGZvciB1bmRlciB0aGUgbWFuYWdlbWVudC4gPGJyPlxuICAgICAqICAgICBXYWl0IGZvciBhbnkgYHNldHRsZWRgLlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgavlr77jgZfjgaYgYFByb21pc2UucmFjZSgpYCA8YnI+XG4gICAgICogICAgIOOBhOOBmuOCjOOBi+OBjCBgc2V0dGxlZGAg44Gr44Gq44KL44G+44Gn5b6F5qmfXG4gICAgICovXG4gICAgcHVibGljIHJhY2UoKTogUHJvbWlzZTx1bmtub3duPiB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJhY2UodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FsbCBbW3dhaXRdXSgpIGZvciB1bmRlciB0aGUgbWFuYWdlbWVudC4gPGJyPlxuICAgICAqICAgICBXYWl0IGZvciBhbGwgYHNldHRsZWRgLiAoc2ltcGxpZmllZCB2ZXJzaW9uKVxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgavlr77jgZfjgaYgW1t3YWl0XV0oKSA8YnI+XG4gICAgICogICAgIOOBmeOBueOBpuOBjCBgc2V0dGxlZGAg44Gr44Gq44KL44G+44Gn5b6F5qmfICjnsKHmmJPjg5Djg7zjgrjjg6fjg7MpXG4gICAgICovXG4gICAgcHVibGljIHdhaXQoKTogUHJvbWlzZTx1bmtub3duW10+IHtcbiAgICAgICAgcmV0dXJuIHdhaXQodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FsbCBgUHJvbWlzZS5hbGxTZXR0bGVkKClgIGZvciB1bmRlciB0aGUgbWFuYWdlbWVudC4gPGJyPlxuICAgICAqICAgICBXYWl0IGZvciBhbGwgYHNldHRsZWRgLlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgavlr77jgZfjgaYgYFByb21pc2UuYWxsU2V0dGxlZCgpYCA8YnI+XG4gICAgICogICAgIOOBmeOBueOBpuOBjCBgc2V0dGxlZGAg44Gr44Gq44KL44G+44Gn5b6F5qmfXG4gICAgICovXG4gICAgcHVibGljIGFsbFNldHRsZWQoKTogUHJvbWlzZTxQcm9taXNlU2V0dGxlZFJlc3VsdDx1bmtub3duPltdPiB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbFNldHRsZWQodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FsbCBgUHJvbWlzZS5hbnkoKWAgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50LiA8YnI+XG4gICAgICogICAgIFdhaXQgZm9yIGFueSBgZnVsbGZpbGxlZGAuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBq+WvvuOBl+OBpiBgUHJvbWlzZS5hbnkoKWAgPGJyPlxuICAgICAqICAgICDjgYTjgZrjgozjgYvjgYwgYGZ1bGxmaWxsZWRgIOOBq+OBquOCi+OBvuOBp+W+heapn1xuICAgICAqL1xuICAgIHB1YmxpYyBhbnkoKTogUHJvbWlzZTx1bmtub3duPiB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLmFueSh0aGlzLnByb21pc2VzKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnZva2UgYGNhbmNlbGAgbWVzc2FnZSBmb3IgdW5kZXIgdGhlIG1hbmFnZW1lbnQgcHJvbWlzZXMuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBriBgUHJvbWlzZWAg44Gr5a++44GX44Gm44Kt44Oj44Oz44K744Or44KS55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVhc29uXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGBjYW5jZWxTb3VyY2VgXG4gICAgICogIC0gYGphYCBgY2FuY2VsU291cmNlYCDjgavmuKHjgZXjgozjgovlvJXmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYFByb21pc2VgIGluc3RhbmNlIHdoaWNoIHdhaXQgYnkgdW50aWwgY2FuY2VsbGF0aW9uIGNvbXBsZXRpb24uXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6vlrozkuobjgb7jgaflvoXmqZ/jgZnjgosgW1tQcm9taXNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGFib3J0PFQ+KHJlYXNvbj86IFQpOiBQcm9taXNlPHVua25vd25bXT4ge1xuICAgICAgICBmb3IgKGNvbnN0IGNhbmNlbGVyIG9mIHRoaXMuX3Bvb2wudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIGlmIChjYW5jZWxlcikge1xuICAgICAgICAgICAgICAgIGNhbmNlbGVyKFxuICAgICAgICAgICAgICAgICAgICAobnVsbCAhPSByZWFzb24pID8gcmVhc29uIDogbmV3IEVycm9yKCdhYm9ydCcpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd2FpdCh0aGlzLnByb21pc2VzKCkpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgaXNTdHJpbmcsXG4gICAgaXNTeW1ib2wsXG4gICAgY2xhc3NOYW1lLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5cbi8qKiBAaW50ZXJuYWwgRXZlbnRCcm9rZXJQcm94eSAqL1xuZXhwb3J0IGNsYXNzIEV2ZW50QnJva2VyUHJveHk8RXZlbnQgZXh0ZW5kcyBvYmplY3Q+IHtcbiAgICBwcml2YXRlIF9icm9rZXI/OiBFdmVudEJyb2tlcjxFdmVudD47XG4gICAgcHVibGljIGdldCgpOiBFdmVudEJyb2tlcjxFdmVudD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYnJva2VyIHx8ICh0aGlzLl9icm9rZXIgPSBuZXcgRXZlbnRCcm9rZXIoKSk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBfaW50ZXJuYWwgICAgICA9IFN5bWJvbCgnaW50ZXJuYWwnKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IF9ub3RpZnkgICAgICAgID0gU3ltYm9sKCdub3RpZnknKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IF9zdG9ja0NoYW5nZSAgID0gU3ltYm9sKCdzdG9jay1jaGFuZ2UnKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IF9ub3RpZnlDaGFuZ2VzID0gU3ltYm9sKCdub3RpZnktY2hhbmdlcycpO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgZnVuY3Rpb24gdmVyaWZ5T2JzZXJ2YWJsZSh4OiB1bmtub3duKTogdm9pZCB8IG5ldmVyIHtcbiAgICBpZiAoIXggfHwgISh4IGFzIG9iamVjdClbX2ludGVybmFsXSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBUaGUgb2JqZWN0IHBhc3NlZCBpcyBub3QgYW4gSU9ic2VydmFibGUuYCk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgZnVuY3Rpb24gdmVyaWZ5VmFsaWRLZXkoa2V5OiB1bmtub3duKTogdm9pZCB8IG5ldmVyIHtcbiAgICBpZiAoaXNTdHJpbmcoa2V5KSB8fCBpc1N5bWJvbChrZXkpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVHlwZSBvZiAke2NsYXNzTmFtZShrZXkpfSBpcyBub3QgYSB2YWxpZCBrZXkuYCk7XG59XG4iLCJpbXBvcnQgeyBTdWJzY3JpcHRpb24sIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgX2ludGVybmFsIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKlxuICogQGVuIEV2ZW50IG9ic2VydmF0aW9uIHN0YXRlIGRlZmluaXRpb24uXG4gKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL5a6a576pXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIE9ic2VydmFibGVTdGF0ZSB7XG4gICAgLyoqIG9ic2VydmFibGUgcmVhZHkgKi9cbiAgICBBQ1RJVkUgICA9ICdhY3RpdmUnLFxuICAgIC8qKiBOT1Qgb2JzZXJ2ZWQsIGJ1dCBwcm9wZXJ0eSBjaGFuZ2VzIGFyZSByZWNvcmRlZC4gKi9cbiAgICBTVVNFUE5ERUQgPSAnc3VzcGVuZGVkJyxcbiAgICAvKiogTk9UIG9ic2VydmVkLCBhbmQgbm90IHJlY29yZGluZyBwcm9wZXJ0eSBjaGFuZ2VzLiAqL1xuICAgIERJU0FCTEVEID0gJ2Rpc2FibGVkJyxcbn1cblxuLyoqXG4gKiBAZW4gT2JzZXJ2YWJsZSBjb21tb24gaW50ZXJmYWNlLlxuICogQGphIE9ic2VydmFibGUg5YWx6YCa44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSU9ic2VydmFibGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqL1xuICAgIG9uKC4uLmFyZ3M6IHVua25vd25bXSk6IFN1YnNjcmlwdGlvbjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmKC4uLmFyZ3M6IHVua25vd25bXSk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3VzcGVuZCBvciBkaXNhYmxlIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44K144K544Oa44Oz44OJXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm9SZWNvcmRcbiAgICAgKiAgLSBgZW5gIGB0cnVlYDogbm90IHJlY29yZGluZyBwcm9wZXJ0eSBjaGFuZ2VzIGFuZCBjbGVhciBjaGFuZ2VzLiAvIGBmYWxzZWA6IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkIGFuZCBmaXJlZCB3aGVuIFtbcmVzdW1lXV0oKSBjYWxsZGVkLiAoZGVmYXVsdClcbiAgICAgKiAgLSBgamFgIGB0cnVlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044KC6KiY6Yyy44Gb44GaLCDnj77lnKjjga7oqJjpjLLjgoLnoLTmo4QgLyBgZmFsc2VgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7Tjga/oqJjpjLLjgZXjgowsIFtbcmVzdW1lXV0oKSDmmYLjgavnmbrngavjgZnjgosgKOaXouWumilcbiAgICAgKi9cbiAgICBzdXNwZW5kKG5vUmVjb3JkPzogYm9vbGVhbik6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzdW1lIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44Oq44K444Ol44O844OgXG4gICAgICovXG4gICAgcmVzdW1lKCk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gb2JzZXJ2YXRpb24gc3RhdGVcbiAgICAgKiBAamEg6LO86Kqt5Y+v6IO954q25oWLXG4gICAgICovXG4gICAgZ2V0T2JzZXJ2YWJsZVN0YXRlKCk6IE9ic2VydmFibGVTdGF0ZTtcbn1cblxuLyoqXG4gKiBAZW4gSW50ZXJmYWNlIGFibGUgdG8gYWNjZXNzIHRvIFtbRXZlbnRCcm9rZXJdXSB3aXRoIFtbSU9ic2VydmFibGVdXS5cbiAqIEBqYSBbW0lPYnNlcnZhYmxlXV0g44Gu5oyB44Gk5YaF6YOoIFtbRXZlbnRCcm9rZXJdXSDjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJT2JzZXJ2YWJsZUV2ZW50QnJva2VyQWNjZXNzPFQgZXh0ZW5kcyBvYmplY3QgPSBhbnk+IGV4dGVuZHMgSU9ic2VydmFibGUgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IFtbRXZlbnRCcm9rZXJdXSBpbnN0YW5jZS5cbiAgICAgKiBAamEgW1tFdmVudEJyb2tlcl1dIOOCpOODs+OCueOCv+ODs+OCueOBruWPluW+l1xuICAgICAqL1xuICAgIGdldEJyb2tlcigpOiBFdmVudEJyb2tlcjxUPjtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgW1tJT2JzZXJ2YWJsZV1dLlxuICogQGphIFtbSU9ic2VydmFibGVdXSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09ic2VydmFibGUoeDogdW5rbm93bik6IHggaXMgSU9ic2VydmFibGUge1xuICAgIHJldHVybiBCb29sZWFuKHggJiYgKHggYXMgb2JqZWN0KVtfaW50ZXJuYWxdKTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIE5vbkZ1bmN0aW9uUHJvcGVydGllcyxcbiAgICBOb25GdW5jdGlvblByb3BlcnR5TmFtZXMsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICB2ZXJpZnksXG4gICAgcG9zdCxcbiAgICBkZWVwTWVyZ2UsXG4gICAgZGVlcEVxdWFsLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uLCBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgRXZlbnRCcm9rZXJQcm94eSxcbiAgICBfaW50ZXJuYWwsXG4gICAgX25vdGlmeSxcbiAgICBfc3RvY2tDaGFuZ2UsXG4gICAgX25vdGlmeUNoYW5nZXMsXG4gICAgdmVyaWZ5T2JzZXJ2YWJsZSxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlU3RhdGUsIElPYnNlcnZhYmxlIH0gZnJvbSAnLi9jb21tb24nO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgSW50ZXJuYWxQcm9wcyB7XG4gICAgc3RhdGU6IE9ic2VydmFibGVTdGF0ZTtcbiAgICBjaGFuZ2VkOiBib29sZWFuO1xuICAgIHJlYWRvbmx5IGNoYW5nZU1hcDogTWFwPFByb3BlcnR5S2V5LCBhbnk+O1xuICAgIHJlYWRvbmx5IGJyb2tlcjogRXZlbnRCcm9rZXJQcm94eTxhbnk+O1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcHJveHlIYW5kbGVyOiBQcm94eUhhbmRsZXI8T2JzZXJ2YWJsZU9iamVjdD4gPSB7XG4gICAgc2V0KHRhcmdldCwgcCwgdmFsdWUsIHJlY2VpdmVyKSB7XG4gICAgICAgIGlmICghaXNTdHJpbmcocCkpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LnNldCh0YXJnZXQsIHAsIHZhbHVlLCByZWNlaXZlcik7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXRbcF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IHRhcmdldFtfaW50ZXJuYWxdLnN0YXRlICYmIHZhbHVlICE9PSBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgdGFyZ2V0W19zdG9ja0NoYW5nZV0ocCwgb2xkVmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBSZWZsZWN0LnNldCh0YXJnZXQsIHAsIHZhbHVlLCByZWNlaXZlcik7XG4gICAgfSxcbn07XG5PYmplY3QuZnJlZXplKF9wcm94eUhhbmRsZXIpO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gT2JzZXJ2YWJsZSBrZXkgdHlwZSBkZWZpbml0aW9uLlxuICogQGphIOizvOiqreWPr+iDveOBquOCreODvOOBruWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBPYnNlcnZhYmxlS2V5czxUIGV4dGVuZHMgT2JzZXJ2YWJsZU9iamVjdD4gPSBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VD47XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgb2JqZWN0IGNsYXNzIHdoaWNoIGNoYW5nZSBjYW4gYmUgb2JzZXJ2ZWQuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu5aSJ5pu044KS55uj6KaW44Gn44GN44KL44Kq44OW44K444Kn44Kv44OI44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogY2xhc3MgRXhhbXBsZSBleHRlbmRzIE9ic2VydmFibGVPYmplY3Qge1xuICogICBwdWJsaWMgYTogbnVtYmVyID0gMDtcbiAqICAgcHVibGljIGI6IG51bWJlciA9IDA7XG4gKiAgIHB1YmxpYyBnZXQgc3VtKCk6IG51bWJlciB7XG4gKiAgICAgICByZXR1cm4gdGhpcy5hICsgdGhpcy5iO1xuICogICB9XG4gKiB9XG4gKlxuICogY29uc3Qgb2JzZXJ2YWJsZSA9IG5ldyBFeGFtcGxlKCk7XG4gKlxuICogZnVuY3Rpb24gb25OdW1DaGFuZ2UobmV3VmFsdWU6IG51bWJlciwgb2xkVmFsdWU6IG51bWJlciwga2V5OiBzdHJpbmcpIHtcbiAqICAgY29uc29sZS5sb2coYCR7a2V5fSBjaGFuZ2VkIGZyb20gJHtvbGRWYWx1ZX0gdG8gJHtuZXdWYWx1ZX0uYCk7XG4gKiB9XG4gKiBvYnNlcnZhYmxlLm9uKFsnYScsICdiJ10sIG9uTnVtQ2hhbmdlKTtcbiAqXG4gKiAvLyB1cGRhdGVcbiAqIG9ic2VydmFibGUuYSA9IDEwMDtcbiAqIG9ic2VydmFibGUuYiA9IDIwMDtcbiAqXG4gKiAvLyBjb25zb2xlIG91dCBmcm9tIGBhc3luY2AgZXZlbnQgbG9vcC5cbiAqIC8vID0+ICdhIGNoYW5nZWQgZnJvbSAwIHRvIDEwMC4nXG4gKiAvLyA9PiAnYiBjaGFuZ2VkIGZyb20gMCB0byAyMDAuJ1xuICpcbiAqIDpcbiAqXG4gKiBmdW5jdGlvbiBvblN1bUNoYW5nZShuZXdWYWx1ZTogbnVtYmVyLCBvbGRWYWx1ZTogbnVtYmVyKSB7XG4gKiAgIGNvbnNvbGUubG9nKGBzdW0gY2hhbmdlZCBmcm9tICR7b2xkVmFsdWV9IHRvICR7bmV3VmF1ZX0uYCk7XG4gKiB9XG4gKiBvYnNlcnZhYmxlLm9uKCdzdW0nLCBvblN1bUNoYW5nZSk7XG4gKlxuICogLy8gdXBkYXRlXG4gKiBvYnNlcnZhYmxlLmEgPSAxMDA7IC8vIG5vdGhpbmcgcmVhY3Rpb24gYmVjYXVzZSBvZiBubyBjaGFuZ2UgcHJvcGVydGllcy5cbiAqIG9ic2VydmFibGUuYSA9IDIwMDtcbiAqXG4gKiAvLyBjb25zb2xlIG91dCBmcm9tIGBhc3luY2AgZXZlbnQgbG9vcC5cbiAqIC8vID0+ICdzdW0gY2hhbmdlZCBmcm9tIDMwMCB0byA0MDAuJ1xuICogYGBgXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBPYnNlcnZhYmxlT2JqZWN0IGltcGxlbWVudHMgSU9ic2VydmFibGUge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfaW50ZXJuYWxdITogSW50ZXJuYWxQcm9wcztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdGVcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgc3RhdGUuIGRlZmF1bHQ6IFtbT2JzZXJ2YWJsZVN0YXRlLkFDVElWRV1dXG4gICAgICogIC0gYGphYCDliJ3mnJ/nirbmhYsg5pei5a6aOiBbW09ic2VydmFibGVTdGF0ZS5BQ1RJVkVdXVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHN0YXRlID0gT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBPYnNlcnZhYmxlT2JqZWN0LCB0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWw6IEludGVybmFsUHJvcHMgPSB7XG4gICAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICAgIGNoYW5nZWQ6IGZhbHNlLFxuICAgICAgICAgICAgY2hhbmdlTWFwOiBuZXcgTWFwKCksXG4gICAgICAgICAgICBicm9rZXI6IG5ldyBFdmVudEJyb2tlclByb3h5PHRoaXM+KCksXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBfaW50ZXJuYWwsIHsgdmFsdWU6IE9iamVjdC5zZWFsKGludGVybmFsKSB9KTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eSh0aGlzLCBfcHJveHlIYW5kbGVyKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJT2JzZXJ2YWJsZVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBwcm9wZXJ0eSBjaGFuZ2VzLlxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlpInmm7Tos7zoqq3oqK3lrpogKOWFqOODl+ODreODkeODhuOCo+ebo+imlilcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0eVxuICAgICAqICAtIGBlbmAgd2lsZCBjb3JkIHNpZ25hdHVyZS5cbiAgICAgKiAgLSBgamFgIOODr+OCpOODq+ODieOCq+ODvOODiVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIHByb3BlcnR5IGNoYW5nZS5cbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uKHByb3BlcnR5OiAnQCcsIGxpc3RlbmVyOiAoY29udGV4dDogT2JzZXJ2YWJsZU9iamVjdCkgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgcHJvcGVydHkgY2hhbmdlKHMpLlxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlpInmm7Tos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0eVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44OX44Ot44OR44OG44KjXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgcHJvcGVydHkgY2hhbmdlLlxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb248SyBleHRlbmRzIE9ic2VydmFibGVLZXlzPHRoaXM+Pihwcm9wZXJ0eTogSyB8IEtbXSwgbGlzdGVuZXI6IChuZXdWYWx1ZTogdGhpc1tLXSwgb2xkVmFsdWU6IHRoaXNbS10sIGtleTogSykgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbjtcblxuICAgIG9uPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk6IEsgfCBLW10sIGxpc3RlbmVyOiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCB7IGNoYW5nZU1hcCwgYnJva2VyIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGJyb2tlci5nZXQoKS5vbihwcm9wZXJ0eSwgbGlzdGVuZXIpO1xuICAgICAgICBpZiAoMCA8IGNoYW5nZU1hcC5zaXplKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wcyA9IGlzQXJyYXkocHJvcGVydHkpID8gcHJvcGVydHkgOiBbcHJvcGVydHldO1xuICAgICAgICAgICAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BzKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlTWFwLmhhcyhwcm9wKSB8fCBjaGFuZ2VNYXAuc2V0KHByb3AsIHRoaXNbcHJvcF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIHByb3BlcnR5IGNoYW5nZXMpXG4gICAgICogQGphIOODl+ODreODkeODhuOCo+WkieabtOizvOiqreino+mZpCAo5YWo44OX44Ot44OR44OG44Kj55uj6KaWKVxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnR5XG4gICAgICogIC0gYGVuYCB3aWxkIGNvcmQgc2lnbmF0dXJlLlxuICAgICAqICAtIGBqYWAg44Ov44Kk44Or44OJ44Kr44O844OJXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgcHJvcGVydHkgY2hhbmdlLlxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb2ZmKHByb3BlcnR5OiAnQCcsIGxpc3RlbmVyPzogKGNvbnRleHQ6IE9ic2VydmFibGVPYmplY3QpID0+IGFueSk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgcHJvcGVydHkgY2hhbmdlKHMpLlxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlpInmm7Tos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0eVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5LlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBldmVyeXRoaW5nIGlzIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44OX44Ot44OR44OG44KjXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/jgZnjgbnjgabop6PpmaRcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBwcm9wZXJ0eSBjaGFuZ2UuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lkIzkuIAgYGNoYW5uZWxgIOOBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIG9mZjxLIGV4dGVuZHMgT2JzZXJ2YWJsZUtleXM8dGhpcz4+KHByb3BlcnR5PzogSyB8IEtbXSwgbGlzdGVuZXI/OiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IHVua25vd24pOiB2b2lkO1xuXG4gICAgb2ZmPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk/OiBLIHwgS1tdLCBsaXN0ZW5lcj86IChuZXdWYWx1ZTogdGhpc1tLXSwgb2xkVmFsdWU6IHRoaXNbS10sIGtleTogSykgPT4gdW5rbm93bik6IHZvaWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uYnJva2VyLmdldCgpLm9mZihwcm9wZXJ0eSwgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdXNwZW5kIG9yIGRpc2FibGUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jgrXjgrnjg5rjg7Pjg4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub1JlY29yZFxuICAgICAqICAtIGBlbmAgYHRydWVgOiBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMgYW5kIGNsZWFyIGNoYW5nZXMuIC8gYGZhbHNlYDogcHJvcGVydHkgY2hhbmdlcyBhcmUgcmVjb3JkZWQgYW5kIGZpcmVkIHdoZW4gW1tyZXN1bWVdXSgpIGNhbGxkZWQuIChkZWZhdWx0KVxuICAgICAqICAtIGBqYWAgYHRydWVgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7TjgoLoqJjpjLLjgZvjgZosIOePvuWcqOOBruiomOmMsuOCguegtOajhCAvIGBmYWxzZWA6IOODl+ODreODkeODhuOCo+WkieabtOOBr+iomOmMsuOBleOCjCwgW1tyZXN1bWVdXSgpIOaZguOBq+eZuueBq+OBmeOCiyAo5pei5a6aKVxuICAgICAqL1xuICAgIHN1c3BlbmQobm9SZWNvcmQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uc3RhdGUgPSBub1JlY29yZCA/IE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA6IE9ic2VydmFibGVTdGF0ZS5TVVNFUE5ERUQ7XG4gICAgICAgIGlmIChub1JlY29yZCkge1xuICAgICAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmNoYW5nZU1hcC5jbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN1bWUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jg6rjgrjjg6Xjg7zjg6BcbiAgICAgKi9cbiAgICByZXN1bWUoKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIGludGVybmFsLnN0YXRlID0gT2JzZXJ2YWJsZVN0YXRlLkFDVElWRTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB0aGlzW19ub3RpZnlDaGFuZ2VzXSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gb2JzZXJ2YXRpb24gc3RhdGVcbiAgICAgKiBAamEg6LO86Kqt5Y+v6IO954q25oWLXG4gICAgICovXG4gICAgZ2V0T2JzZXJ2YWJsZVN0YXRlKCk6IE9ic2VydmFibGVTdGF0ZSB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzW19pbnRlcm5hbF0uc3RhdGU7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2Vzc1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIGdldEJyb2tlcigpOiBFdmVudEJyb2tlcjxOb25GdW5jdGlvblByb3BlcnRpZXM8dGhpcz4+IHtcbiAgICAgICAgY29uc3QgeyBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgcmV0dXJuIGJyb2tlci5nZXQoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBzdGF0aWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgW1tPYnNlcnZhYmxlT2JqZWN0XV0gZnJvbSBhbnkgb2JqZWN0LlxuICAgICAqIEBqYSDku7vmhI/jga7jgqrjg5bjgrjjgqfjgq/jg4jjgYvjgokgW1tPYnNlcnZhYmxlT2JqZWN0XV0g44KS55Sf5oiQXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNvbnN0IG9ic2VydmFibGUgPSBPYnNlcnZhYmxlT2JqZWN0LmZyb20oeyBhOiAxLCBiOiAxIH0pO1xuICAgICAqIGZ1bmN0aW9uIG9uTnVtQ2hhbmdlKG5ld1ZhbHVlOiBudW1iZXIsIG9sZFZhbHVlOiBudW1iZXIsIGtleTogc3RyaW5nKSB7XG4gICAgICogICBjb25zb2xlLmxvZyhgJHtrZXl9IGNoYW5nZWQgZnJvbSAke29sZFZhbHVlfSB0byAke25ld1ZhbHVlfS5gKTtcbiAgICAgKiB9XG4gICAgICogb2JzZXJ2YWJsZS5vbihbJ2EnLCAnYiddLCBvbk51bUNoYW5nZSk7XG4gICAgICpcbiAgICAgKiAvLyB1cGRhdGVcbiAgICAgKiBvYnNlcnZhYmxlLmEgPSAxMDA7XG4gICAgICogb2JzZXJ2YWJsZS5iID0gMjAwO1xuICAgICAqXG4gICAgICogLy8gY29uc29sZSBvdXQgZnJvbSBgYXN5bmNgIGV2ZW50IGxvb3AuXG4gICAgICogLy8gPT4gJ2EgY2hhbmdlZCBmcm9tIDEgdG8gMTAwLidcbiAgICAgKiAvLyA9PiAnYiBjaGFuZ2VkIGZyb20gMSB0byAyMDAuJ1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZnJvbTxUIGV4dGVuZHMgb2JqZWN0PihzcmM6IFQpOiBPYnNlcnZhYmxlT2JqZWN0ICYgVCB7XG4gICAgICAgIGNvbnN0IG9ic2VydmFibGUgPSBkZWVwTWVyZ2UobmV3IGNsYXNzIGV4dGVuZHMgT2JzZXJ2YWJsZU9iamVjdCB7IH0oT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEKSwgc3JjKTtcbiAgICAgICAgb2JzZXJ2YWJsZS5yZXN1bWUoKTtcbiAgICAgICAgcmV0dXJuIG9ic2VydmFibGUgYXMgYW55O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByb3RlY3RlZCBtZWh0b2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEZvcmNlIG5vdGlmeSBwcm9wZXJ0eSBjaGFuZ2UocykgaW4gc3BpdGUgb2YgYWN0aXZlIHN0YXRlLlxuICAgICAqIEBqYSDjgqLjgq/jg4bjgqPjg5bnirbmhYvjgavjgYvjgYvjgo/jgonjgZrlvLfliLbnmoTjgavjg5fjg63jg5Hjg4bjgqPlpInmm7TpgJrnn6XjgpLnmbrooYxcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgbm90aWZ5KC4uLnByb3BlcnRpZXM6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGlmICgwID09PSBwcm9wZXJ0aWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHsgY2hhbmdlTWFwIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IGtleVZhbHVlID0gbmV3IE1hcDxQcm9wZXJ0eUtleSwgW2FueSwgYW55XT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgcHJvcGVydGllcykge1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSB0aGlzW2tleV07XG4gICAgICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IGNoYW5nZU1hcC5oYXMoa2V5KSA/IGNoYW5nZU1hcC5nZXQoa2V5KSA6IG5ld1ZhbHVlO1xuICAgICAgICAgICAga2V5VmFsdWUuc2V0KGtleSwgW25ld1ZhbHVlLCBvbGRWYWx1ZV0pO1xuICAgICAgICB9XG4gICAgICAgIDAgPCBrZXlWYWx1ZS5zaXplICYmIHRoaXNbX25vdGlmeV0oa2V5VmFsdWUpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWVodG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfc3RvY2tDaGFuZ2VdKHA6IHN0cmluZywgb2xkVmFsdWU6IGFueSk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCBjaGFuZ2VNYXAsIGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uY2hhbmdlZCA9IHRydWU7XG4gICAgICAgIGlmICgwID09PSBjaGFuZ2VNYXAuc2l6ZSkge1xuICAgICAgICAgICAgY2hhbmdlTWFwLnNldChwLCBvbGRWYWx1ZSk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGsgb2YgYnJva2VyLmdldCgpLmNoYW5uZWxzKCkpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VNYXAuaGFzKGspIHx8IGNoYW5nZU1hcC5zZXQoaywgdGhpc1trXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSA9PT0gc3RhdGUpIHtcbiAgICAgICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4gdGhpc1tfbm90aWZ5Q2hhbmdlc10oKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjaGFuZ2VNYXAuaGFzKHApIHx8IGNoYW5nZU1hcC5zZXQocCwgb2xkVmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19ub3RpZnlDaGFuZ2VzXSgpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZSwgY2hhbmdlTWFwIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFICE9PSBzdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGtleVZhbHVlUGFpcnMgPSBuZXcgTWFwPFByb3BlcnR5S2V5LCBbYW55LCBhbnldPigpO1xuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIG9sZFZhbHVlXSBvZiBjaGFuZ2VNYXApIHtcbiAgICAgICAgICAgIGNvbnN0IGN1clZhbHVlID0gdGhpc1trZXldO1xuICAgICAgICAgICAgaWYgKCFkZWVwRXF1YWwob2xkVmFsdWUsIGN1clZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGtleVZhbHVlUGFpcnMuc2V0KGtleSwgW2N1clZhbHVlLCBvbGRWYWx1ZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXNbX25vdGlmeV0oa2V5VmFsdWVQYWlycyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19ub3RpZnldKGtleVZhbHVlOiBNYXA8UHJvcGVydHlLZXksIFthbnksIGFueV0+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgY2hhbmdlZCwgY2hhbmdlTWFwLCBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY2hhbmdlTWFwLmNsZWFyKCk7XG4gICAgICAgIHRoaXNbX2ludGVybmFsXS5jaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGV2ZW50QnJva2VyID0gYnJva2VyLmdldCgpO1xuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlc10gb2Yga2V5VmFsdWUpIHtcbiAgICAgICAgICAgIChldmVudEJyb2tlciBhcyBhbnkpLnRyaWdnZXIoa2V5LCAuLi52YWx1ZXMsIGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoYW5nZWQpIHtcbiAgICAgICAgICAgIGV2ZW50QnJva2VyLnRyaWdnZXIoJ0AnLCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgcHJlZmVyLXJlc3QtcGFyYW1zLFxuICovXG5cbmltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIFdyaXRhYmxlLFxuICAgIGlzTnVtYmVyLFxuICAgIHZlcmlmeSxcbiAgICBwb3N0LFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uLCBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgRXZlbnRCcm9rZXJQcm94eSxcbiAgICBfaW50ZXJuYWwsXG4gICAgX25vdGlmeSxcbiAgICBfc3RvY2tDaGFuZ2UsXG4gICAgX25vdGlmeUNoYW5nZXMsXG4gICAgdmVyaWZ5T2JzZXJ2YWJsZSxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlU3RhdGUsIElPYnNlcnZhYmxlIH0gZnJvbSAnLi9jb21tb24nO1xuXG4vKipcbiAqIEBlbiBBcnJheSBjaGFuZ2UgdHlwZSBpbmZvcm1hdGlvbi4gPGJyPlxuICogICAgIFRoZSB2YWx1ZSBpcyBzdWl0YWJsZSBmb3IgdGhlIG51bWJlciBvZiBmbHVjdHVhdGlvbiBvZiB0aGUgZWxlbWVudC5cbiAqIEBqYSDphY3liJflpInmm7TpgJrnn6Xjga7jgr/jgqTjg5cgPGJyPlxuICogICAgIOWApOOBr+imgee0oOOBruWil+a4m+aVsOOBq+ebuOW9k1xuICpcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQXJyYXlDaGFuZ2VUeXBlIHtcbiAgICBSRU1PVkUgPSAtMSxcbiAgICBVUERBVEUgPSAwLFxuICAgIElOU0VSVCA9IDEsXG59XG5cbi8qKlxuICogQGVuIEFycmF5IGNoYW5nZSByZWNvcmQgaW5mb3JtYXRpb24uXG4gKiBAamEg6YWN5YiX5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXJyYXlDaGFuZ2VSZWNvcmQ8VD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgY2hhbmdlIHR5cGUgaW5mb3JtYXRpb24uXG4gICAgICogQGphIOmFjeWIl+WkieabtOaDheWgseOBruitmOWIpeWtkFxuICAgICAqL1xuICAgIHJlYWRvbmx5IHR5cGU6IEFycmF5Q2hhbmdlVHlwZTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgY2hhbmdlIHR5cGUgaW5mb3JtYXRpb24uIDxicj5cbiAgICAgKiAgICAg4oC7IFtBdHRlbnRpb25dIFRoZSBpbmRleCB3aWxsIGJlIGRpZmZlcmVudCBmcm9tIHRoZSBhY3R1YWwgbG9jYXRpb24gd2hlbiBhcnJheSBzaXplIGNoYW5nZWQgYmVjYXVzZSB0aGF0IGRldGVybWluZXMgZWxlbWVudCBvcGVyYXRpb24gdW5pdC5cbiAgICAgKiBAamEg5aSJ5pu044GM55m655Sf44GX44Gf6YWN5YiX5YaF44Gu5L2N572u44GuIGluZGV4IDxicj5cbiAgICAgKiAgICAg4oC7IFvms6jmhI9dIOOCquODmuODrOODvOOCt+ODp+ODs+WNmOS9jeOBriBpbmRleCDjgajjgarjgoosIOimgee0oOOBjOWil+a4m+OBmeOCi+WgtOWQiOOBr+Wun+mam+OBruS9jee9ruOBqOeVsOOBquOCi+OBk+OBqOOBjOOBguOCi1xuICAgICAqL1xuICAgIHJlYWRvbmx5IGluZGV4OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTmV3IGVsZW1lbnQncyB2YWx1ZS5cbiAgICAgKiBAamEg6KaB57Sg44Gu5paw44GX44GE5YCkXG4gICAgICovXG4gICAgcmVhZG9ubHkgbmV3VmFsdWU/OiBUO1xuXG4gICAgLyoqXG4gICAgICogQGVuIE9sZCBlbGVtZW50J3MgdmFsdWUuXG4gICAgICogQGphIOimgee0oOOBruWPpOOBhOWApFxuICAgICAqL1xuICAgIHJlYWRvbmx5IG9sZFZhbHVlPzogVDtcbn1cbnR5cGUgTXV0YWJsZUNoYW5nZVJlY29yZDxUPiA9IFdyaXRhYmxlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+PjtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBJQXJyYXlDaGFuZ2VFdmVudDxUPiB7XG4gICAgJ0AnOiBbQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXV07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBJbnRlcm5hbFByb3BzPFQgPSB1bmtub3duPiB7XG4gICAgc3RhdGU6IE9ic2VydmFibGVTdGF0ZTtcbiAgICBieU1ldGhvZDogYm9vbGVhbjtcbiAgICByZWNvcmRzOiBNdXRhYmxlQ2hhbmdlUmVjb3JkPFQ+W107XG4gICAgcmVhZG9ubHkgaW5kZXhlczogU2V0PG51bWJlcj47XG4gICAgcmVhZG9ubHkgYnJva2VyOiBFdmVudEJyb2tlclByb3h5PElBcnJheUNoYW5nZUV2ZW50PFQ+Pjtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3Byb3h5SGFuZGxlcjogUHJveHlIYW5kbGVyPE9ic2VydmFibGVBcnJheT4gPSB7XG4gICAgZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKSB7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGFyZ2V0W19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgPT09IGludGVybmFsLnN0YXRlIHx8IGludGVybmFsLmJ5TWV0aG9kIHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYXR0cmlidXRlcywgJ3ZhbHVlJykpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXRbcF07XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gYXR0cmlidXRlcy52YWx1ZTtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGVxZXFlcVxuICAgICAgICBpZiAoJ2xlbmd0aCcgPT09IHAgJiYgbmV3VmFsdWUgIT0gb2xkVmFsdWUpIHsgLy8gRG8gTk9UIHVzZSBzdHJpY3QgaW5lcXVhbGl0eSAoIT09KVxuICAgICAgICAgICAgY29uc3Qgb2xkTGVuZ3RoID0gb2xkVmFsdWUgPj4+IDA7XG4gICAgICAgICAgICBjb25zdCBuZXdMZW5ndGggPSBuZXdWYWx1ZSA+Pj4gMDtcbiAgICAgICAgICAgIGNvbnN0IHN0b2NrID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmFwID0gbmV3TGVuZ3RoIDwgb2xkTGVuZ3RoICYmIHRhcmdldC5zbGljZShuZXdMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGlmIChzY3JhcCkgeyAvLyBuZXdMZW5ndGggPCBvbGRMZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IG9sZExlbmd0aDsgLS1pID49IG5ld0xlbmd0aDspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFtfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5SRU1PVkUsIGksIHVuZGVmaW5lZCwgc2NyYXBbaSAtIG5ld0xlbmd0aF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgICAgICAgICAgICAvLyBvbGRMZW5ndGggPCBuZXdMZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IG9sZExlbmd0aDsgaSA8IG5ld0xlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuSU5TRVJULCBpIC8qLCB1bmRlZmluZWQsIHVuZGVmaW5lZCAqLyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHAsIGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgcmVzdWx0ICYmIHN0b2NrKCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGVsc2UgaWYgKG5ld1ZhbHVlICE9PSBvbGRWYWx1ZSAmJiBpc1ZhbGlkQXJyYXlJbmRleChwKSkge1xuICAgICAgICAgICAgY29uc3QgaSA9IHAgYXMgdW5rbm93biBhcyBudW1iZXIgPj4+IDA7XG4gICAgICAgICAgICBjb25zdCB0eXBlOiBBcnJheUNoYW5nZVR5cGUgPSBOdW1iZXIoaSA+PSB0YXJnZXQubGVuZ3RoKTsgLy8gSU5TRVJUIG9yIFVQREFURVxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHAsIGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgcmVzdWx0ICYmIHRhcmdldFtfc3RvY2tDaGFuZ2VdKHR5cGUsIGksIG5ld1ZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZGVsZXRlUHJvcGVydHkodGFyZ2V0LCBwKSB7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGFyZ2V0W19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgPT09IGludGVybmFsLnN0YXRlIHx8IGludGVybmFsLmJ5TWV0aG9kIHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGFyZ2V0LCBwKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVsZXRlUHJvcGVydHkodGFyZ2V0LCBwKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtwXTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gUmVmbGVjdC5kZWxldGVQcm9wZXJ0eSh0YXJnZXQsIHApO1xuICAgICAgICByZXN1bHQgJiYgaXNWYWxpZEFycmF5SW5kZXgocCkgJiYgdGFyZ2V0W19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlVQREFURSwgcCBhcyB1bmtub3duIGFzIG51bWJlciA+Pj4gMCwgdW5kZWZpbmVkLCBvbGRWYWx1ZSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbn07XG5PYmplY3QuZnJlZXplKF9wcm94eUhhbmRsZXIpO1xuXG4vKiogQGludGVybmFsIHZhbGlkIGFycmF5IGluZGV4IGhlbHBlciAqL1xuZnVuY3Rpb24gaXNWYWxpZEFycmF5SW5kZXg8VD4oaW5kZXg6IFQpOiBib29sZWFuIHtcbiAgICBjb25zdCBzID0gU3RyaW5nKGluZGV4KTtcbiAgICBjb25zdCBuID0gTWF0aC50cnVuYyhzIGFzIHVua25vd24gYXMgbnVtYmVyKTtcbiAgICByZXR1cm4gU3RyaW5nKG4pID09PSBzICYmIDAgPD0gbiAmJiBuIDwgMHhGRkZGRkZGRjtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGluZGV4IG1hbmFnZW1lbnQgKi9cbmZ1bmN0aW9uIGZpbmRSZWxhdGVkQ2hhbmdlSW5kZXg8VD4ocmVjb3JkczogTXV0YWJsZUNoYW5nZVJlY29yZDxUPltdLCB0eXBlOiBBcnJheUNoYW5nZVR5cGUsIGluZGV4OiBudW1iZXIpOiBudW1iZXIge1xuICAgIGNvbnN0IGNoZWNrVHlwZSA9IHR5cGUgPT09IEFycmF5Q2hhbmdlVHlwZS5JTlNFUlRcbiAgICAgICAgPyAodDogQXJyYXlDaGFuZ2VUeXBlKSA9PiB0ID09PSBBcnJheUNoYW5nZVR5cGUuUkVNT1ZFXG4gICAgICAgIDogKHQ6IEFycmF5Q2hhbmdlVHlwZSkgPT4gdCAhPT0gQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRVxuICAgICAgICA7XG5cbiAgICBmb3IgKGxldCBpID0gcmVjb3Jkcy5sZW5ndGg7IC0taSA+PSAwOykge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHJlY29yZHNbaV07XG4gICAgICAgIGlmICh2YWx1ZS5pbmRleCA9PT0gaW5kZXggJiYgY2hlY2tUeXBlKHZhbHVlLnR5cGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZS5pbmRleCA8IGluZGV4ICYmIEJvb2xlYW4odmFsdWUudHlwZSkpIHsgLy8gUkVNT1ZFIG9yIElOU0VSVFxuICAgICAgICAgICAgaW5kZXggLT0gdmFsdWUudHlwZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgYXJyYXkgY2xhc3Mgd2hpY2ggY2hhbmdlIGNhbiBiZSBvYnNlcnZlZC5cbiAqIEBqYSDlpInmm7Tnm6Poppblj6/og73jgarphY3liJfjgq/jg6njgrlcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogLSBCYXNpYyBVc2FnZVxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBvYnNBcnJheSA9IE9ic2VydmFibGVBcnJheS5mcm9tKFsnYScsICdiJywgJ2MnXSk7XG4gKlxuICogZnVuY3Rpb24gb25DaGFuZ2VBcnJheShyZWNvcmRzOiBBcnJheUNoYW5nZVJlY29yZFtdKSB7XG4gKiAgIGNvbnNvbGUubG9nKHJlY29yZHMpO1xuICogICAvLyAgW1xuICogICAvLyAgICB7IHR5cGU6IDEsIGluZGV4OiAzLCBuZXdWYWx1ZTogJ3gnLCBvbGRWYWx1ZTogdW5kZWZpbmVkIH0sXG4gKiAgIC8vICAgIHsgdHlwZTogMSwgaW5kZXg6IDQsIG5ld1ZhbHVlOiAneScsIG9sZFZhbHVlOiB1bmRlZmluZWQgfSxcbiAqICAgLy8gICAgeyB0eXBlOiAxLCBpbmRleDogNSwgbmV3VmFsdWU6ICd6Jywgb2xkVmFsdWU6IHVuZGVmaW5lZCB9XG4gKiAgIC8vICBdXG4gKiB9XG4gKiBvYnNBcnJheS5vbihvbkNoYW5nZUFycmF5KTtcbiAqXG4gKiBmdW5jdGlvbiBhZGRYWVooKSB7XG4gKiAgIG9ic0FycmF5LnB1c2goJ3gnLCAneScsICd6Jyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIE9ic2VydmFibGVBcnJheTxUID0gdW5rbm93bj4gZXh0ZW5kcyBBcnJheTxUPiBpbXBsZW1lbnRzIElPYnNlcnZhYmxlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX2ludGVybmFsXSE6IEludGVybmFsUHJvcHM8VD47XG5cbiAgICAvKiogQGZpbmFsIGNvbnN0cnVjdG9yICovXG4gICAgcHJpdmF0ZSBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAgICAgICAgdmVyaWZ5KCdpbnN0YW5jZU9mJywgT2JzZXJ2YWJsZUFycmF5LCB0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWw6IEludGVybmFsUHJvcHM8VD4gPSB7XG4gICAgICAgICAgICBzdGF0ZTogT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSxcbiAgICAgICAgICAgIGJ5TWV0aG9kOiBmYWxzZSxcbiAgICAgICAgICAgIHJlY29yZHM6IFtdLFxuICAgICAgICAgICAgaW5kZXhlczogbmV3IFNldCgpLFxuICAgICAgICAgICAgYnJva2VyOiBuZXcgRXZlbnRCcm9rZXJQcm94eTxJQXJyYXlDaGFuZ2VFdmVudDxUPj4oKSxcbiAgICAgICAgfTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIF9pbnRlcm5hbCwgeyB2YWx1ZTogT2JqZWN0LnNlYWwoaW50ZXJuYWwpIH0pO1xuICAgICAgICBjb25zdCBhcmdMZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBpZiAoMSA9PT0gYXJnTGVuZ3RoICYmIGlzTnVtYmVyKGFyZ3VtZW50c1swXSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGxlbiA9IGFyZ3VtZW50c1swXSA+Pj4gMDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLklOU0VSVCwgaSAvKiwgdW5kZWZpbmVkICovKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgwIDwgYXJnTGVuZ3RoKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ0xlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGksIGFyZ3VtZW50c1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eSh0aGlzLCBfcHJveHlIYW5kbGVyKSBhcyBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSU9ic2VydmFibGVcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgYXJyYXkgY2hhbmdlKHMpLlxuICAgICAqIEBqYSDphY3liJflpInmm7Tos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGFycmF5IGNoYW5nZS5cbiAgICAgKiAgLSBgamFgIOmFjeWIl+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uKGxpc3RlbmVyOiAocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSkgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzW19pbnRlcm5hbF0uYnJva2VyLmdldCgpLm9uKCdAJywgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBhcnJheSBjaGFuZ2UocykuXG4gICAgICogQGphIOmFjeWIl+WkieabtOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYXJyYXkgY2hhbmdlLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOmFjeWIl+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvZmYobGlzdGVuZXI/OiAocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSkgPT4gdW5rbm93bik6IHZvaWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uYnJva2VyLmdldCgpLm9mZignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3VzcGVuZCBvciBkaXNhYmxlIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44K144K544Oa44Oz44OJXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm9SZWNvcmRcbiAgICAgKiAgLSBgZW5gIGB0cnVlYDogbm90IHJlY29yZGluZyBwcm9wZXJ0eSBjaGFuZ2VzIGFuZCBjbGVhciBjaGFuZ2VzLiAvIGBmYWxzZWA6IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkIGFuZCBmaXJlZCB3aGVuIFtbcmVzdW1lXV0oKSBjYWxsZGVkLiAoZGVmYXVsdClcbiAgICAgKiAgLSBgamFgIGB0cnVlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044KC6KiY6Yyy44Gb44GaLCDnj77lnKjjga7oqJjpjLLjgoLnoLTmo4QgLyBgZmFsc2VgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7Tjga/oqJjpjLLjgZXjgowsIFtbcmVzdW1lXV0oKSDmmYLjgavnmbrngavjgZnjgosgKOaXouWumilcbiAgICAgKi9cbiAgICBzdXNwZW5kKG5vUmVjb3JkID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLnN0YXRlID0gbm9SZWNvcmQgPyBPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgOiBPYnNlcnZhYmxlU3RhdGUuU1VTRVBOREVEO1xuICAgICAgICBpZiAobm9SZWNvcmQpIHtcbiAgICAgICAgICAgIHRoaXNbX2ludGVybmFsXS5yZWNvcmRzID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc3VtZSBvZiB0aGUgZXZlbnQgc3Vic2NyaXB0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jg6rjgrjjg6Xjg7zjg6BcbiAgICAgKi9cbiAgICByZXN1bWUoKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIGludGVybmFsLnN0YXRlID0gT2JzZXJ2YWJsZVN0YXRlLkFDVElWRTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB0aGlzW19ub3RpZnlDaGFuZ2VzXSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gb2JzZXJ2YXRpb24gc3RhdGVcbiAgICAgKiBAamEg6LO86Kqt5Y+v6IO954q25oWLXG4gICAgICovXG4gICAgZ2V0T2JzZXJ2YWJsZVN0YXRlKCk6IE9ic2VydmFibGVTdGF0ZSB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzW19pbnRlcm5hbF0uc3RhdGU7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3ZlcnJpZGU6IEFycmF5IG1ldGhvZHNcblxuICAgIC8qKlxuICAgICAqIFNvcnRzIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSBjb21wYXJlRm4gVGhlIG5hbWUgb2YgdGhlIGZ1bmN0aW9uIHVzZWQgdG8gZGV0ZXJtaW5lIHRoZSBvcmRlciBvZiB0aGUgZWxlbWVudHMuIElmIG9taXR0ZWQsIHRoZSBlbGVtZW50cyBhcmUgc29ydGVkIGluIGFzY2VuZGluZywgQVNDSUkgY2hhcmFjdGVyIG9yZGVyLlxuICAgICAqL1xuICAgIHNvcnQoY29tcGFyYXRvcj86IChsaHM6IFQsIHJoczogVCkgPT4gbnVtYmVyKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCBvbGQgPSBBcnJheS5mcm9tKHRoaXMpO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLnNvcnQoY29tcGFyYXRvcik7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gZmFsc2U7XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IGludGVybmFsLnN0YXRlKSB7XG4gICAgICAgICAgICBjb25zdCBsZW4gPSBvbGQubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZhbHVlID0gb2xkW2ldO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gdGhpc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUgIT09IG9sZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuVVBEQVRFLCBpLCBuZXdWYWx1ZSwgb2xkVmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgZWxlbWVudHMgZnJvbSBhbiBhcnJheSBhbmQsIGlmIG5lY2Vzc2FyeSwgaW5zZXJ0cyBuZXcgZWxlbWVudHMgaW4gdGhlaXIgcGxhY2UsIHJldHVybmluZyB0aGUgZGVsZXRlZCBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gc3RhcnQgVGhlIHplcm8tYmFzZWQgbG9jYXRpb24gaW4gdGhlIGFycmF5IGZyb20gd2hpY2ggdG8gc3RhcnQgcmVtb3ZpbmcgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIGRlbGV0ZUNvdW50IFRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmVtb3ZlLlxuICAgICAqL1xuICAgIHNwbGljZShzdGFydDogbnVtYmVyLCBkZWxldGVDb3VudD86IG51bWJlcik6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGVsZW1lbnRzIGZyb20gYW4gYXJyYXkgYW5kLCBpZiBuZWNlc3NhcnksIGluc2VydHMgbmV3IGVsZW1lbnRzIGluIHRoZWlyIHBsYWNlLCByZXR1cm5pbmcgdGhlIGRlbGV0ZWQgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIHN0YXJ0IFRoZSB6ZXJvLWJhc2VkIGxvY2F0aW9uIGluIHRoZSBhcnJheSBmcm9tIHdoaWNoIHRvIHN0YXJ0IHJlbW92aW5nIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSBkZWxldGVDb3VudCBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHJlbW92ZS5cbiAgICAgKiBAcGFyYW0gaXRlbXMgRWxlbWVudHMgdG8gaW5zZXJ0IGludG8gdGhlIGFycmF5IGluIHBsYWNlIG9mIHRoZSBkZWxldGVkIGVsZW1lbnRzLlxuICAgICAqL1xuICAgIHNwbGljZShzdGFydDogbnVtYmVyLCBkZWxldGVDb3VudDogbnVtYmVyLCAuLi5pdGVtczogVFtdKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIHNwbGljZShzdGFydDogbnVtYmVyLCBkZWxldGVDb3VudD86IG51bWJlciwgLi4uaXRlbXM6IFRbXSk6IE9ic2VydmFibGVBcnJheTxUPiB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCBvbGRMZW4gPSB0aGlzLmxlbmd0aDtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSB0cnVlO1xuICAgICAgICBjb25zdCByZXN1bHQgPSAoc3VwZXIuc3BsaWNlIGFzIFVua25vd25GdW5jdGlvbikoLi4uYXJndW1lbnRzKSBhcyBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gZmFsc2U7XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IGludGVybmFsLnN0YXRlKSB7XG4gICAgICAgICAgICBzdGFydCA9IE1hdGgudHJ1bmMoc3RhcnQpO1xuICAgICAgICAgICAgY29uc3QgZnJvbSA9IHN0YXJ0IDwgMCA/IE1hdGgubWF4KG9sZExlbiArIHN0YXJ0LCAwKSA6IE1hdGgubWluKHN0YXJ0LCBvbGRMZW4pO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHJlc3VsdC5sZW5ndGg7IC0taSA+PSAwOykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuUkVNT1ZFLCBmcm9tICsgaSwgdW5kZWZpbmVkLCByZXN1bHRbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbGVuID0gaXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuSU5TRVJULCBmcm9tICsgaSwgaXRlbXNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyB0aGUgZmlyc3QgZWxlbWVudCBmcm9tIGFuIGFycmF5IGFuZCByZXR1cm5zIGl0LlxuICAgICAqL1xuICAgIHNoaWZ0KCk6IFQgfCB1bmRlZmluZWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY29uc3Qgb2xkTGVuID0gdGhpcy5sZW5ndGg7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc3VwZXIuc2hpZnQoKTtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSBmYWxzZTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gaW50ZXJuYWwuc3RhdGUgJiYgdGhpcy5sZW5ndGggPCBvbGRMZW4pIHtcbiAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuUkVNT1ZFLCAwLCB1bmRlZmluZWQsIHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbnNlcnRzIG5ldyBlbGVtZW50cyBhdCB0aGUgc3RhcnQgb2YgYW4gYXJyYXkuXG4gICAgICogQHBhcmFtIGl0ZW1zICBFbGVtZW50cyB0byBpbnNlcnQgYXQgdGhlIHN0YXJ0IG9mIHRoZSBBcnJheS5cbiAgICAgKi9cbiAgICB1bnNoaWZ0KC4uLml0ZW1zOiBUW10pOiBudW1iZXIge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSB0cnVlO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzdXBlci51bnNoaWZ0KC4uLml0ZW1zKTtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSBmYWxzZTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGxlbiA9IGl0ZW1zLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLklOU0VSVCwgaSwgaXRlbXNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbHMgYSBkZWZpbmVkIGNhbGxiYWNrIGZ1bmN0aW9uIG9uIGVhY2ggZWxlbWVudCBvZiBhbiBhcnJheSwgYW5kIHJldHVybnMgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgcmVzdWx0cy5cbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tmbiBBIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyB1cCB0byB0aHJlZSBhcmd1bWVudHMuIFRoZSBtYXAgbWV0aG9kIGNhbGxzIHRoZSBjYWxsYmFja2ZuIGZ1bmN0aW9uIG9uZSB0aW1lIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIGFycmF5LlxuICAgICAqIEBwYXJhbSB0aGlzQXJnIEFuIG9iamVjdCB0byB3aGljaCB0aGUgdGhpcyBrZXl3b3JkIGNhbiByZWZlciBpbiB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbi4gSWYgdGhpc0FyZyBpcyBvbWl0dGVkLCB1bmRlZmluZWQgaXMgdXNlZCBhcyB0aGUgdGhpcyB2YWx1ZS5cbiAgICAgKi9cbiAgICBtYXA8VT4oY2FsbGJhY2tmbjogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVLCB0aGlzQXJnPzogdW5rbm93bik6IE9ic2VydmFibGVBcnJheTxVPiB7XG4gICAgICAgIC8qXG4gICAgICAgICAqIFtOT1RFXSBvcmlnaW5hbCBpbXBsZW1lbnQgaXMgdmVyeSB2ZXJ5IGhpZ2gtY29zdC5cbiAgICAgICAgICogICAgICAgIHNvIGl0J3MgY29udmVydGVkIG5hdGl2ZSBBcnJheSBvbmNlLCBhbmQgcmVzdG9yZWQuXG4gICAgICAgICAqXG4gICAgICAgICAqIHJldHVybiAoc3VwZXIubWFwIGFzIFVua25vd25GdW5jdGlvbikoLi4uYXJndW1lbnRzKTtcbiAgICAgICAgICovXG4gICAgICAgIHJldHVybiBPYnNlcnZhYmxlQXJyYXkuZnJvbShbLi4udGhpc10ubWFwKGNhbGxiYWNrZm4sIHRoaXNBcmcpKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJT2JzZXJ2YWJsZUV2ZW50QnJva2VyQWNjZXNzXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgZ2V0QnJva2VyKCk6IEV2ZW50QnJva2VyPElBcnJheUNoYW5nZUV2ZW50PFQ+PiB7XG4gICAgICAgIGNvbnN0IHsgYnJva2VyIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIHJldHVybiBicm9rZXIuZ2V0KCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZWh0b2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19zdG9ja0NoYW5nZV0odHlwZTogQXJyYXlDaGFuZ2VUeXBlLCBpbmRleDogbnVtYmVyLCBuZXdWYWx1ZT86IFQsIG9sZFZhbHVlPzogVCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCBpbmRleGVzLCByZWNvcmRzIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IHJjaSA9IGluZGV4ZXMuaGFzKGluZGV4KSA/IGZpbmRSZWxhdGVkQ2hhbmdlSW5kZXgocmVjb3JkcywgdHlwZSwgaW5kZXgpIDogLTE7XG4gICAgICAgIGNvbnN0IGxlbiA9IHJlY29yZHMubGVuZ3RoO1xuICAgICAgICBpZiAocmNpID49IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHJjdCA9IHJlY29yZHNbcmNpXS50eXBlO1xuICAgICAgICAgICAgaWYgKCFyY3QgLyogVVBEQVRFICovKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJldlJlY29yZCA9IHJlY29yZHMuc3BsaWNlKHJjaSwgMSlbMF07XG4gICAgICAgICAgICAgICAgLy8gVVBEQVRFID0+IFVQREFURSA6IFVQREFURVxuICAgICAgICAgICAgICAgIC8vIFVQREFURSA9PiBSRU1PVkUgOiBJTlNFUlRcbiAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0odHlwZSwgaW5kZXgsIG5ld1ZhbHVlLCBwcmV2UmVjb3JkLm9sZFZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgciwgaSA9IGxlbjsgLS1pID4gcmNpOykge1xuICAgICAgICAgICAgICAgICAgICByID0gcmVjb3Jkc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgKHIuaW5kZXggPj0gaW5kZXgpICYmIChyLmluZGV4IC09IHJjdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZSZWNvcmQgPSByZWNvcmRzLnNwbGljZShyY2ksIDEpWzBdO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlICE9PSBBcnJheUNoYW5nZVR5cGUuUkVNT1ZFKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElOU0VSVCA9PiBVUERBVEUgOiBJTlNFUlRcbiAgICAgICAgICAgICAgICAgICAgLy8gUkVNT1ZFID0+IElOU0VSVCA6IFVQREFURVxuICAgICAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oTnVtYmVyKCF0eXBlKSwgaW5kZXgsIG5ld1ZhbHVlLCBwcmV2UmVjb3JkLm9sZFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaW5kZXhlcy5hZGQoaW5kZXgpO1xuICAgICAgICByZWNvcmRzW2xlbl0gPSB7IHR5cGUsIGluZGV4LCBuZXdWYWx1ZSwgb2xkVmFsdWUgfTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgPT09IHN0YXRlICYmIDAgPT09IGxlbikge1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHRoaXNbX25vdGlmeUNoYW5nZXNdKCkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19ub3RpZnlDaGFuZ2VzXSgpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZSwgcmVjb3JkcyB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSAhPT0gc3RhdGUgfHwgMCA9PT0gcmVjb3Jkcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHIgb2YgcmVjb3Jkcykge1xuICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZShyKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzW19ub3RpZnldKE9iamVjdC5mcmVlemUocmVjb3JkcykgYXMgQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSk7XG4gICAgICAgIHRoaXNbX2ludGVybmFsXS5yZWNvcmRzID0gW107XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19ub3RpZnldKHJlY29yZHM6IEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGludGVybmFsLmluZGV4ZXMuY2xlYXIoKTtcbiAgICAgICAgaW50ZXJuYWwuYnJva2VyLmdldCgpLnRyaWdnZXIoJ0AnLCByZWNvcmRzKTtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIE92ZXJyaWRlIHJldHVybiB0eXBlIG9mIHByb3RvdHlwZSBtZXRob2RzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgT2JzZXJ2YWJsZUFycmF5PFQ+IHtcbiAgICAvKipcbiAgICAgKiBDb21iaW5lcyB0d28gb3IgbW9yZSBhcnJheXMuXG4gICAgICogQHBhcmFtIGl0ZW1zIEFkZGl0aW9uYWwgaXRlbXMgdG8gYWRkIHRvIHRoZSBlbmQgb2YgYXJyYXkxLlxuICAgICAqL1xuICAgIGNvbmNhdCguLi5pdGVtczogVFtdW10pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogQ29tYmluZXMgdHdvIG9yIG1vcmUgYXJyYXlzLlxuICAgICAqIEBwYXJhbSBpdGVtcyBBZGRpdGlvbmFsIGl0ZW1zIHRvIGFkZCB0byB0aGUgZW5kIG9mIGFycmF5MS5cbiAgICAgKi9cbiAgICBjb25jYXQoLi4uaXRlbXM6IChUIHwgVFtdKVtdKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIC8qKlxuICAgICAqIFJldmVyc2VzIHRoZSBlbGVtZW50cyBpbiBhbiBBcnJheS5cbiAgICAgKi9cbiAgICByZXZlcnNlKCk6IHRoaXM7XG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIHNlY3Rpb24gb2YgYW4gYXJyYXkuXG4gICAgICogQHBhcmFtIHN0YXJ0IFRoZSBiZWdpbm5pbmcgb2YgdGhlIHNwZWNpZmllZCBwb3J0aW9uIG9mIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gZW5kIFRoZSBlbmQgb2YgdGhlIHNwZWNpZmllZCBwb3J0aW9uIG9mIHRoZSBhcnJheS5cbiAgICAgKi9cbiAgICBzbGljZShzdGFydD86IG51bWJlciwgZW5kPzogbnVtYmVyKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGVsZW1lbnRzIG9mIGFuIGFycmF5IHRoYXQgbWVldCB0aGUgY29uZGl0aW9uIHNwZWNpZmllZCBpbiBhIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqIEBwYXJhbSBjYWxsYmFja2ZuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIHVwIHRvIHRocmVlIGFyZ3VtZW50cy4gVGhlIGZpbHRlciBtZXRob2QgY2FsbHMgdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24gb25lIHRpbWUgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgYXJyYXkuXG4gICAgICogQHBhcmFtIHRoaXNBcmcgQW4gb2JqZWN0IHRvIHdoaWNoIHRoZSB0aGlzIGtleXdvcmQgY2FuIHJlZmVyIGluIHRoZSBjYWxsYmFja2ZuIGZ1bmN0aW9uLiBJZiB0aGlzQXJnIGlzIG9taXR0ZWQsIHVuZGVmaW5lZCBpcyB1c2VkIGFzIHRoZSB0aGlzIHZhbHVlLlxuICAgICAqL1xuICAgIGZpbHRlcjxTIGV4dGVuZHMgVD4oY2FsbGJhY2tmbjogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiB2YWx1ZSBpcyBTLCB0aGlzQXJnPzogdW5rbm93bik6IE9ic2VydmFibGVBcnJheTxTPjtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBlbGVtZW50cyBvZiBhbiBhcnJheSB0aGF0IG1lZXQgdGhlIGNvbmRpdGlvbiBzcGVjaWZpZWQgaW4gYSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tmbiBBIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyB1cCB0byB0aHJlZSBhcmd1bWVudHMuIFRoZSBmaWx0ZXIgbWV0aG9kIGNhbGxzIHRoZSBjYWxsYmFja2ZuIGZ1bmN0aW9uIG9uZSB0aW1lIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIGFycmF5LlxuICAgICAqIEBwYXJhbSB0aGlzQXJnIEFuIG9iamVjdCB0byB3aGljaCB0aGUgdGhpcyBrZXl3b3JkIGNhbiByZWZlciBpbiB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbi4gSWYgdGhpc0FyZyBpcyBvbWl0dGVkLCB1bmRlZmluZWQgaXMgdXNlZCBhcyB0aGUgdGhpcyB2YWx1ZS5cbiAgICAgKi9cbiAgICBmaWx0ZXIoY2FsbGJhY2tmbjogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiB1bmtub3duLCB0aGlzQXJnPzogdW5rbm93bik6IE9ic2VydmFibGVBcnJheTxUPjtcbn1cblxuLyoqXG4gKiBPdmVycmlkZSByZXR1cm4gdHlwZSBvZiBzdGF0aWMgbWV0aG9kc1xuICovXG5leHBvcnQgZGVjbGFyZSBuYW1lc3BhY2UgT2JzZXJ2YWJsZUFycmF5IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhcnJheSBmcm9tIGFuIGFycmF5LWxpa2Ugb2JqZWN0LlxuICAgICAqIEBwYXJhbSBhcnJheUxpa2UgQW4gYXJyYXktbGlrZSBvciBpdGVyYWJsZSBvYmplY3QgdG8gY29udmVydCB0byBhbiBhcnJheS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmcm9tPFQ+KGFycmF5TGlrZTogQXJyYXlMaWtlPFQ+IHwgSXRlcmFibGU8VD4pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhcnJheSBmcm9tIGFuIGFycmF5LWxpa2Ugb2JqZWN0LlxuICAgICAqIEBwYXJhbSBhcnJheUxpa2UgQW4gYXJyYXktbGlrZSBvciBpdGVyYWJsZSBvYmplY3QgdG8gY29udmVydCB0byBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0gbWFwZm4gQSBtYXBwaW5nIGZ1bmN0aW9uIHRvIGNhbGwgb24gZXZlcnkgZWxlbWVudCBvZiB0aGUgYXJyYXkuXG4gICAgICogQHBhcmFtIHRoaXNBcmcgVmFsdWUgb2YgJ3RoaXMnIHVzZWQgdG8gaW52b2tlIHRoZSBtYXBmbi5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmcm9tPFQsIFU+KGFycmF5TGlrZTogQXJyYXlMaWtlPFQ+IHwgSXRlcmFibGU8VD4sIG1hcGZuOiAodGhpczogdm9pZCwgdjogVCwgazogbnVtYmVyKSA9PiBVLCB0aGlzQXJnPzogdW5kZWZpbmVkKTogT2JzZXJ2YWJsZUFycmF5PFU+O1xuICAgIGZ1bmN0aW9uIGZyb208WCwgVCwgVT4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4gfCBJdGVyYWJsZTxUPiwgbWFwZm46ICh0aGlzOiBYLCB2OiBULCBrOiBudW1iZXIpID0+IFUsIHRoaXNBcmc6IFgpOiBPYnNlcnZhYmxlQXJyYXk8VT47XG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIG5ldyBhcnJheSBmcm9tIGEgc2V0IG9mIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSBpdGVtcyBBIHNldCBvZiBlbGVtZW50cyB0byBpbmNsdWRlIGluIHRoZSBuZXcgYXJyYXkgb2JqZWN0LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG9mPFQ+KC4uLml0ZW1zOiBUW10pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIG5vLWlubmVyLWRlY2xhcmF0aW9ucyxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG4vKlxuICogTk9URTog5YaF6YOo44Oi44K444Ol44O844Or44GrIGBDRFBgIG5hbWVzcGFjZSDjgpLkvb/nlKjjgZfjgabjgZfjgb7jgYbjgagsIOWklumDqOODouOCuOODpeODvOODq+OBp+OBr+Wuo+iogOOBp+OBjeOBquOBj+OBquOCiy5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvOTYxMVxuICovXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgLyoqXG4gICAgICogQGVuIENvbnN0YW50IGRlZmluaXRpb24gYWJvdXQgcmFuZ2Ugb2YgdGhlIHJlc3VsdCBjb2RlLlxuICAgICAqIEBqYSDjg6rjgrbjg6vjg4jjgrPjg7zjg4njga7nr4Tlm7LjgavplqLjgZnjgovlrprmlbDlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgY29uc3QgZW51bSBSRVNVTFRfQ09ERV9SQU5HRSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gVGhlIGFzc2lnbmFibGUgcmFuZ2UgZm9yIHRoZSBjbGllbnQncyBsb2NhbCByZXN1bHQgY29yZCBieSB3aGljaCBleHBhbnNpb24gaXMgcG9zc2libGUuXG4gICAgICAgICAqIEBqYSDjgq/jg6njgqTjgqLjg7Pjg4jjgYzmi6HlvLXlj6/og73jgarjg63jg7zjgqvjg6vjg6rjgrbjg6vjg4jjgrPjg7zjg4njga7jgqLjgrXjgqTjg7Plj6/og73poJjln59cbiAgICAgICAgICovXG4gICAgICAgIE1BWCA9IDEwMDAsXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gUmVzZXJ2ZWQgcmFuZ2Ugb2YgZnJhbWV3b3JrLlxuICAgICAgICAgKiBAamEg44OV44Os44O844Og44Ov44O844Kv44Gu5LqI57SE6aCY5Z+fXG4gICAgICAgICAqL1xuICAgICAgICBSRVNFUlZFRCA9IDEwMDAsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBhc3NpZ25tZW50IHJhbmdlIGd1aWRlbGluZSBkZWZpbml0aW9uIHVzZWQgaW4gdGhlIG1vZHVsZS5cbiAgICAgKiBAamEg44Oi44K444Ol44O844Or5YaF44Gn5L2/55So44GZ44KL44Ki44K144Kk44Oz6aCY5Z+f44Ks44Kk44OJ44Op44Kk44Oz5a6a5pWw5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGNvbnN0IGVudW0gTE9DQUxfQ09ERV9SQU5HRV9HVUlERSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gVGhlIGFzc2lnbm1lbnQgcmFuZ2UgZ3VpZGVsaW5lIHBlciAxIG1vZHVsZS5cbiAgICAgICAgICogQGphIDHjg6Ljgrjjg6Xjg7zjg6vlvZPjgZ/jgorjgavlibLjgorlvZPjgabjgovjgqLjgrXjgqTjg7PpoJjln5/jgqzjgqTjg4njg6njgqTjg7NcbiAgICAgICAgICovXG4gICAgICAgIE1PRFVMRSA9IDEwMCxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBUaGUgYXNzaWdubWVudCByYW5nZSBndWlkZWxpbmUgcGVyIDEgZnVuY3Rpb24uXG4gICAgICAgICAqIEBqYSAx5qmf6IO95b2T44Gf44KK44Gr5Ymy44KK5b2T44Gm44KL44Ki44K144Kk44Oz6aCY5Z+f44Ks44Kk44OJ44Op44Kk44OzXG4gICAgICAgICAqL1xuICAgICAgICBGVU5DVElPTiA9IDIwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBPZmZzZXQgdmFsdWUgZW51bWVyYXRpb24gZm9yIFtbUkVTVUxUX0NPREVdXS4gPGJyPlxuICAgICAqICAgICBUaGUgY2xpZW50IGNhbiBleHBhbmQgYSBkZWZpbml0aW9uIGluIG90aGVyIG1vZHVsZS5cbiAgICAgKiBAamEgW1tSRVNVTFRfQ09ERV1dIOOBruOCquODleOCu+ODg+ODiOWApCA8YnI+XG4gICAgICogICAgIOOCqOODqeODvOOCs+ODvOODieWvvuW/nOOBmeOCi+ODouOCuOODpeODvOODq+WGheOBpyDlrprnvqnjgpLmi6HlvLXjgZnjgosuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICogICAgICBDT01NT04gICAgICA9IDAsXG4gICAgICogICAgICBTT01FTU9EVUxFICA9IDEgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgICAqICAgICAgU09NRU1PRFVMRTIgPSAyICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICAgKiAgfVxuICAgICAqXG4gICAgICogIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgKiAgICAgIFNPTUVNT0RVTEVfREVDTEFSRSAgICAgICAgICAgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsIC8vIGZvciBhdm9pZCBUUzI0MzIuXG4gICAgICogICAgICBFUlJPUl9TT01FTU9EVUxFX1VORVhQRUNURUQgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuU09NRU1PRFVMRSwgTE9DQUxfQ09ERV9CQVNFLlNPTUVNT0RVTEUgKyAxLCBcImVycm9yIHVuZXhwZWN0ZWQuXCIpLFxuICAgICAqICAgICAgRVJST1JfU09NRU1PRFVMRV9JTlZBTElEX0FSRyA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLlNPTUVNT0RVTEUsIExPQ0FMX0NPREVfQkFTRS5TT01FTU9EVUxFICsgMiwgXCJpbnZhbGlkIGFyZ3VtZW50cy5cIiksXG4gICAgICogIH1cbiAgICAgKiAgQVNTSUdOX1JFU1VMVF9DT0RFKFJFU1VMVF9DT0RFKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBleHBvcnQgY29uc3QgZW51bSBSRVNVTFRfQ09ERV9CQVNFIHtcbiAgICAgICAgREVDTEFSRSA9IDkwMDcxOTkyNTQ3NDA5OTEsIC8vIE51bWJlci5NQVhfU0FGRV9JTlRFR0VSXG4gICAgICAgIENPTU1PTiAgPSAwLFxuICAgICAgICBDRFAgICAgID0gMSAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuTU9EVUxFLCAvLyBjZHAgcmVzZXJ2ZWQuIGFicygwIO+9niAxMDAwKVxuLy8gICAgICBNT0RVTEVfQSA9IDEgKiBSRVNVTFRfQ09ERV9SQU5HRS5NQVgsICAgIC8vIGV4KSBtb2R1bGVBOiBhYnMoMTAwMSDvvZ4gMTk5OSlcbi8vICAgICAgTU9EVUxFX0IgPSAyICogUkVTVUxUX0NPREVfUkFOR0UuTUFYLCAgICAvLyBleCkgbW9kdWxlQjogYWJzKDIwMDEg772eIDI5OTkpXG4vLyAgICAgIE1PRFVMRV9DID0gMyAqIFJFU1VMVF9DT0RFX1JBTkdFLk1BWCwgICAgLy8gZXgpIG1vZHVsZUM6IGFicygzMDAxIO+9niAzOTk5KVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBLbm93biBDRFAgbW9kdWxlIG9mZmVzdCBkZWZpbml0aW9uLlxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgosgQ0RQIOODouOCuOODpeODvOODq+OBruOCquODleOCu+ODg+ODiOWumue+qVxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICogICAgQUpBWCA9IENEUF9LTk9XTl9NT0RVTEUuQUpBWCAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgICogfVxuICAgICAqXG4gICAgICogZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAqICAgQUpBWF9ERUNMQVJFICAgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgKiAgIEVSUk9SX0FKQVhfUkVTUE9OU0UgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMSwgJ25ldHdvcmsgZXJyb3IuJyksXG4gICAgICogICBFUlJPUl9BSkFYX1RJTUVPVVQgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQUpBWCArIDIsICdyZXF1ZXN0IHRpbWVvdXQuJyksXG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGV4cG9ydCBjb25zdCBlbnVtIENEUF9LTk9XTl9NT0RVTEUge1xuICAgICAgICAvKiogYEBjZHAvYWpheGAgKi9cbiAgICAgICAgQUpBWCA9IDEsXG4gICAgICAgIC8qKiBgQGNkcC9pMThuYCAqL1xuICAgICAgICBJMThOID0gMixcbiAgICAgICAgLyoqIGBAY2RwL2RhdGEtc3luY2AsIGBAY2RwL21vZGVsYCAqL1xuICAgICAgICBNVkMgID0gMyxcbiAgICAgICAgLyoqIG9mZnNldCBmb3IgdW5rbm93biBtb2R1bGUgKi9cbiAgICAgICAgT0ZGU0VULFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDb21tb24gcmVzdWx0IGNvZGUgZm9yIHRoZSBhcHBsaWNhdGlvbi5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz5YWo5L2T44Gn5L2/55So44GZ44KL5YWx6YCa44Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIHN1Y2Nlc3MgY29kZSAgICAgICAgICAgICA8YnI+IGBqYWAg5rGO55So5oiQ5Yqf44Kz44O844OJICAgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICBTVUNDRVNTID0gMCxcbiAgICAgICAgLyoqIGBlbmAgZ2VuZXJhbCBjYW5jZWwgY29kZSAgICAgICAgICAgICAgPGJyPiBgamFgIOaxjueUqOOCreODo+ODs+OCu+ODq+OCs+ODvOODiSAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgQUJPUlQgPSAxLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIHBlbmRpbmcgY29kZSAgICAgICAgICAgICA8YnI+IGBqYWAg5rGO55So44Kq44Oa44Os44O844K344On44Oz5pyq5a6f6KGM44Ko44Op44O844Kz44O844OJICovXG4gICAgICAgIFBFTkRJTkcgPSAyLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIHN1Y2Nlc3MgYnV0IG5vb3AgY29kZSAgICA8YnI+IGBqYWAg5rGO55So5a6f6KGM5LiN6KaB44Kz44O844OJICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgIE5PT1AgPSAzLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIGVycm9yIGNvZGUgICAgICAgICAgICAgICA8YnI+IGBqYWAg5rGO55So44Ko44Op44O844Kz44O844OJICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgRkFJTCA9IC0xLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIGZhdGFsIGVycm9yIGNvZGUgICAgICAgICA8YnI+IGBqYWAg5rGO55So6Ie05ZG955qE44Ko44Op44O844Kz44O844OJICAgICAgICAgICAgICAgKi9cbiAgICAgICAgRkFUQUwgPSAtMixcbiAgICAgICAgLyoqIGBlbmAgZ2VuZXJhbCBub3Qgc3VwcG9ydGVkIGVycm9yIGNvZGUgPGJyPiBgamFgIOaxjueUqOOCquODmuODrOODvOOCt+ODp+ODs+OCqOODqeODvOOCs+ODvOODiSAgICAgICAqL1xuICAgICAgICBOT1RfU1VQUE9SVEVEID0gLTMsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFzc2lnbiBkZWNsYXJlZCBbW1JFU1VMVF9DT0RFXV0gdG8gcm9vdCBlbnVtZXJhdGlvbi5cbiAgICAgKiAgICAgKEl0J3MgZW5hYmxlIHRvIG1lcmdlIGVudW0gaW4gdGhlIG1vZHVsZSBzeXN0ZW0gZW52aXJvbm1lbnQuKVxuICAgICAqIEBqYSDmi6HlvLXjgZfjgZ8gW1tSRVNVTFRfQ09ERV1dIOOCkiDjg6vjg7zjg4ggZW51bSDjgavjgqLjgrXjgqTjg7NcbiAgICAgKiAgICAg44Oi44K444Ol44O844Or44K344K544OG44Og55Kw5aKD44Gr44GK44GE44Gm44KC44CBZW51bSDjgpLjg57jg7zjgrjjgpLlj6/og73jgavjgZnjgotcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gQVNTSUdOX1JFU1VMVF9DT0RFKGV4dGVuZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihSRVNVTFRfQ09ERSwgZXh0ZW5kKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgY29uc3QgX2NvZGUybWVzc2FnZTogeyBbY29kZTogc3RyaW5nXTogc3RyaW5nOyB9ID0ge1xuICAgICAgICAnMCc6ICdvcGVyYXRpb24gc3VjY2VlZGVkLicsXG4gICAgICAgICcxJzogJ29wZXJhdGlvbiBhYm9ydGVkLicsXG4gICAgICAgICcyJzogJ29wZXJhdGlvbiBwZW5kaW5nLicsXG4gICAgICAgICczJzogJ25vIG9wZXJhdGlvbi4nLFxuICAgICAgICAnLTEnOiAnb3BlcmF0aW9uIGZhaWxlZC4nLFxuICAgICAgICAnLTInOiAndW5leHBlY3RlZCBlcnJvciBvY2N1cmVkLicsXG4gICAgICAgICctMyc6ICdvcGVyYXRpb24gbm90IHN1cHBvcnRlZC4nLFxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIGVycm9yIG1lc3NhZ2UgbWFwLlxuICAgICAqIEBqYSDjgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrjjg57jg4Pjg5fjga7lj5blvpdcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gRVJST1JfTUVTU0FHRV9NQVAoKTogeyBbY29kZTogc3RyaW5nXTogc3RyaW5nOyB9IHtcbiAgICAgICAgcmV0dXJuIF9jb2RlMm1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdlbmVyYXRlIHN1Y2Nlc3MgY29kZS5cbiAgICAgKiBAamEg5oiQ5Yqf44Kz44O844OJ44KS55Sf5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYmFzZVxuICAgICAqICAtIGBlbmAgc2V0IGJhc2Ugb2Zmc2V0IGFzIFtbUkVTVUxUX0NPREVfQkFTRV1dXG4gICAgICogIC0gYGphYCDjgqrjg5Xjgrvjg4Pjg4jlgKTjgpIgW1tSRVNVTFRfQ09ERV9CQVNFXV0g44Go44GX44Gm5oyH5a6aXG4gICAgICogQHBhcmFtIGNvZGVcbiAgICAgKiAgLSBgZW5gIHNldCBsb2NhbCBjb2RlIGZvciBkZWNsYXJhdGlvbi4gZXgpICcxJ1xuICAgICAqICAtIGBqYWAg5a6j6KiA55So44Gu44Ot44O844Kr44Or44Kz44O844OJ5YCk44KS5oyH5a6aICDkvospICcxJ1xuICAgICAqIEBwYXJhbSBtZXNzYWdlXG4gICAgICogIC0gYGVuYCBzZXQgZXJyb3IgbWVzc2FnZSBmb3IgaGVscCBzdHJpbmcuXG4gICAgICogIC0gYGphYCDjg5jjg6vjg5fjgrnjg4jjg6rjg7PjgrDnlKjjgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrjjgpLmjIflrppcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gREVDTEFSRV9TVUNDRVNTX0NPREUoYmFzZTogUkVTVUxUX0NPREVfQkFTRSwgY29kZTogbnVtYmVyLCBtZXNzYWdlPzogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIGRlY2xhcmVSZXN1bHRDb2RlKGJhc2UsIGNvZGUsIG1lc3NhZ2UsIHRydWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZW5lcmF0ZSBlcnJvciBjb2RlLlxuICAgICAqIEBqYSDjgqjjg6njg7zjgrPjg7zjg4nnlJ/miJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBiYXNlXG4gICAgICogIC0gYGVuYCBzZXQgYmFzZSBvZmZzZXQgYXMgW1tSRVNVTFRfQ09ERV9CQVNFXV1cbiAgICAgKiAgLSBgamFgIOOCquODleOCu+ODg+ODiOWApOOCkiBbW1JFU1VMVF9DT0RFX0JBU0VdXSDjgajjgZfjgabmjIflrppcbiAgICAgKiBAcGFyYW0gY29kZVxuICAgICAqICAtIGBlbmAgc2V0IGxvY2FsIGNvZGUgZm9yIGRlY2xhcmF0aW9uLiBleCkgJzEnXG4gICAgICogIC0gYGphYCDlrqPoqIDnlKjjga7jg63jg7zjgqvjg6vjgrPjg7zjg4nlgKTjgpLmjIflrpogIOS+iykgJzEnXG4gICAgICogQHBhcmFtIG1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIHNldCBlcnJvciBtZXNzYWdlIGZvciBoZWxwIHN0cmluZy5cbiAgICAgKiAgLSBgamFgIOODmOODq+ODl+OCueODiOODquODs+OCsOeUqOOCqOODqeODvOODoeODg+OCu+ODvOOCuOOCkuaMh+WumlxuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBERUNMQVJFX0VSUk9SX0NPREUoYmFzZTogUkVTVUxUX0NPREVfQkFTRSwgY29kZTogbnVtYmVyLCBtZXNzYWdlPzogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIGRlY2xhcmVSZXN1bHRDb2RlKGJhc2UsIGNvZGUsIG1lc3NhZ2UsIGZhbHNlKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIHNlY3Rpb246XG5cbiAgICAvKiogQGludGVybmFsIHJlZ2lzdGVyIGZvciBbW1JFU1VMVF9DT0RFXV0gKi9cbiAgICBmdW5jdGlvbiBkZWNsYXJlUmVzdWx0Q29kZShiYXNlOiBSRVNVTFRfQ09ERV9CQVNFLCBjb2RlOiBudW1iZXIsIG1lc3NhZ2U6IHN0cmluZyB8IHVuZGVmaW5lZCwgc3VjY2VlZGVkOiBib29sZWFuKTogbnVtYmVyIHwgbmV2ZXIge1xuICAgICAgICBpZiAoY29kZSA8IDAgfHwgUkVTVUxUX0NPREVfUkFOR0UuTUFYIDw9IGNvZGUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKGBkZWNsYXJlUmVzdWx0Q29kZSgpLCBpbnZhbGlkIGxvY2FsLWNvZGUgcmFuZ2UuIFtjb2RlOiAke2NvZGV9XWApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNpZ25lZCA9IHN1Y2NlZWRlZCA/IDEgOiAtMTtcbiAgICAgICAgY29uc3QgcmVzdWx0Q29kZSA9IHNpZ25lZCAqIChiYXNlIGFzIG51bWJlciArIGNvZGUpO1xuICAgICAgICBfY29kZTJtZXNzYWdlW3Jlc3VsdENvZGVdID0gbWVzc2FnZSA/IG1lc3NhZ2UgOiAoYFtDT0RFOiAke3Jlc3VsdENvZGV9XWApO1xuICAgICAgICByZXR1cm4gcmVzdWx0Q29kZTtcbiAgICB9XG59XG4iLCJpbXBvcnQgUkVTVUxUX0NPREUgICAgICAgICAgICAgID0gQ0RQX0RFQ0xBUkUuUkVTVUxUX0NPREU7XG5pbXBvcnQgUkVTVUxUX0NPREVfQkFTRSAgICAgICAgID0gQ0RQX0RFQ0xBUkUuUkVTVUxUX0NPREVfQkFTRTtcbmltcG9ydCBSRVNVTFRfQ09ERV9SQU5HRSAgICAgICAgPSBDRFBfREVDTEFSRS5SRVNVTFRfQ09ERV9SQU5HRTtcbmltcG9ydCBMT0NBTF9DT0RFX1JBTkdFX0dVSURFICAgPSBDRFBfREVDTEFSRS5MT0NBTF9DT0RFX1JBTkdFX0dVSURFO1xuaW1wb3J0IERFQ0xBUkVfU1VDQ0VTU19DT0RFICAgICA9IENEUF9ERUNMQVJFLkRFQ0xBUkVfU1VDQ0VTU19DT0RFO1xuaW1wb3J0IERFQ0xBUkVfRVJST1JfQ09ERSAgICAgICA9IENEUF9ERUNMQVJFLkRFQ0xBUkVfRVJST1JfQ09ERTtcbmltcG9ydCBBU1NJR05fUkVTVUxUX0NPREUgICAgICAgPSBDRFBfREVDTEFSRS5BU1NJR05fUkVTVUxUX0NPREU7XG5pbXBvcnQgRVJST1JfTUVTU0FHRV9NQVAgICAgICAgID0gQ0RQX0RFQ0xBUkUuRVJST1JfTUVTU0FHRV9NQVA7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gRGVzY3JpcHRpb24ge1xuICAgIFVOS05PV05fRVJST1JfTkFNRSA9J1VOS05PV04nLFxufVxuXG5leHBvcnQge1xuICAgIFJFU1VMVF9DT0RFLFxuICAgIFJFU1VMVF9DT0RFX0JBU0UsXG4gICAgUkVTVUxUX0NPREVfUkFOR0UsXG4gICAgTE9DQUxfQ09ERV9SQU5HRV9HVUlERSxcbiAgICBERUNMQVJFX1NVQ0NFU1NfQ09ERSxcbiAgICBERUNMQVJFX0VSUk9SX0NPREUsXG4gICAgQVNTSUdOX1JFU1VMVF9DT0RFLFxufTtcblxuLyoqXG4gKiBAZW4gSnVkZ2UgZmFpbCBvciBub3QuXG4gKiBAamEg5aSx5pWX5Yik5a6aXG4gKlxuICogQHBhcmFtIGNvZGUgW1tSRVNVTFRfQ09ERV1dXG4gKiBAcmV0dXJucyB0cnVlOiBmYWlsIHJlc3VsdCAvIGZhbHNlOiBzdWNjZXNzIHJlc3VsdFxuICovXG5leHBvcnQgZnVuY3Rpb24gRkFJTEVEKGNvZGU6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIHJldHVybiBjb2RlIDwgMDtcbn1cblxuLyoqXG4gKiBAZW4gSnVkZ2Ugc3VjY2VzcyBvciBub3QuXG4gKiBAamEg5oiQ5Yqf5Yik5a6aXG4gKlxuICogQHBhcmFtIGNvZGUgW1tSRVNVTFRfQ09ERV1dXG4gKiBAcmV0dXJucyB0cnVlOiBzdWNjZXNzIHJlc3VsdCAvIGZhbHNlOiBmYWlsIHJlc3VsdFxuICovXG5leHBvcnQgZnVuY3Rpb24gU1VDQ0VFREVEKGNvZGU6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhRkFJTEVEKGNvZGUpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIFtbUkVTVUxUX0NPREVdXSBgbmFtZWAgc3RyaW5nIGZyb20gW1tSRVNVTFRfQ09ERV1dLlxuICogQGphIFtbUkVTVUxUX0NPREVdXSDjgpIgW1tSRVNVTFRfQ09ERV1dIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBjb2RlIFtbUkVTVUxUX0NPREVdXVxuICogQHBhcmFtIHRhZyAgY3VzdG9tIHRhZyBpZiBuZWVkZWQuXG4gKiBAcmV0dXJucyBuYW1lIHN0cmluZyBleCkgXCJbdGFnXVtOT1RfU1VQUE9SVEVEXVwiXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b05hbWVTdHJpbmcoY29kZTogbnVtYmVyLCB0YWc/OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHByZWZpeCA9IHRhZyA/IGBbJHt0YWd9XWAgOiAnJztcbiAgICBpZiAoUkVTVUxUX0NPREVbY29kZV0pIHtcbiAgICAgICAgcmV0dXJuIGAke3ByZWZpeH1bJHtSRVNVTFRfQ09ERVtjb2RlXX1dYDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYCR7cHJlZml4fVske0Rlc2NyaXB0aW9uLlVOS05PV05fRVJST1JfTkFNRX1dYDtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gaGVscCBzdHJpbmcgZnJvbSBbW1JFU1VMVF9DT0RFXV0uXG4gKiBAamEgW1tSRVNVTFRfQ09ERV1dIOOCkuODmOODq+ODl+OCueODiOODquODs+OCsOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBjb2RlIFtbUkVTVUxUX0NPREVdXVxuICogQHJldHVybnMgcmVnaXN0ZXJlZCBoZWxwIHN0cmluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9IZWxwU3RyaW5nKGNvZGU6IG51bWJlcik6IHN0cmluZyB7XG4gICAgY29uc3QgbWFwID0gRVJST1JfTUVTU0FHRV9NQVAoKTtcbiAgICBpZiAobWFwW2NvZGVdKSB7XG4gICAgICAgIHJldHVybiBtYXBbY29kZV07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGB1bnJlZ2lzdGVyZWQgcmVzdWx0IGNvZGUuIFtjb2RlOiAke2NvZGV9XWA7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBjbGFzc05hbWUsXG4gICAgaXNOaWwsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNDaGFuY2VsTGlrZUVycm9yLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBTVUNDRUVERUQsXG4gICAgRkFJTEVELFxuICAgIHRvTmFtZVN0cmluZyxcbiAgICB0b0hlbHBTdHJpbmcsXG59IGZyb20gJy4vcmVzdWx0LWNvZGUnO1xuXG5jb25zdCB7XG4gICAgLyoqIEBpbnRlcm5hbCAqLyBpc0Zpbml0ZTogaXNOdW1iZXJcbn0gPSBOdW1iZXI7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gVGFnIHtcbiAgICBFUlJPUiAgPSAnRXJyb3InLFxuICAgIFJFU1VMVCA9ICdSZXN1bHQnLFxufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBkZXNjID0gKHZhbHVlOiB1bmtub3duKTogUHJvcGVydHlEZXNjcmlwdG9yID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIHZhbHVlLFxuICAgIH07XG59O1xuXG4vKipcbiAqIEBlbiBBIHJlc3VsdCBob2xkZXIgY2xhc3MuIDxicj5cbiAqICAgICBEZXJpdmVkIG5hdGl2ZSBgRXJyb3JgIGNsYXNzLlxuICogQGphIOWHpueQhue1kOaenOS8nemBlOOCr+ODqeOCuSA8YnI+XG4gKiAgICAg44ON44Kk44OG44Kj44OWIGBFcnJvcmAg44Gu5rS+55Sf44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBSZXN1bHQgZXh0ZW5kcyBFcnJvciB7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGNvZGVcbiAgICAgKiAgLSBgZW5gIHJlc3VsdCBjb2RlXG4gICAgICogIC0gYGphYCDntZDmnpzjgrPjg7zjg4lcbiAgICAgKiBAcGFyYW0gbWVzc2FnZVxuICAgICAqICAtIGBlbmAgcmVzdWx0IGluZm8gbWVzc2FnZVxuICAgICAqICAtIGBqYWAg57WQ5p6c5oOF5aCx44Oh44OD44K744O844K4XG4gICAgICogQHBhcmFtIGNhdXNlXG4gICAgICogIC0gYGVuYCBsb3ctbGV2ZWwgZXJyb3IgaW5mb3JtYXRpb25cbiAgICAgKiAgLSBgamFgIOS4i+S9jeOBruOCqOODqeODvOaDheWgsVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvZGU/OiBudW1iZXIsIG1lc3NhZ2U/OiBzdHJpbmcsIGNhdXNlPzogdW5rbm93bikge1xuICAgICAgICBjb2RlID0gaXNOaWwoY29kZSkgPyBSRVNVTFRfQ09ERS5TVUNDRVNTIDogaXNOdW1iZXIoY29kZSkgPyBNYXRoLnRydW5jKGNvZGUpIDogUkVTVUxUX0NPREUuRkFJTDtcbiAgICAgICAgc3VwZXIobWVzc2FnZSB8fCB0b0hlbHBTdHJpbmcoY29kZSkpO1xuICAgICAgICBsZXQgdGltZSA9IGlzRXJyb3IoY2F1c2UpID8gKGNhdXNlIGFzIFJlc3VsdCkudGltZSA6IHVuZGVmaW5lZDtcbiAgICAgICAgaXNOdW1iZXIodGltZSBhcyBudW1iZXIpIHx8ICh0aW1lID0gRGF0ZS5ub3coKSk7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHsgY29kZTogZGVzYyhjb2RlKSwgY2F1c2U6IGRlc2MoY2F1c2UpLCB0aW1lOiBkZXNjKHRpbWUpIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBbW1JFU1VMVF9DT0RFXV0gdmFsdWUuXG4gICAgICogQGphIFtbUkVTVUxUX0NPREVdXSDjga7lgKRcbiAgICAgKi9cbiAgICByZWFkb25seSBjb2RlITogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFN0b2NrIGxvdy1sZXZlbCBlcnJvciBpbmZvcm1hdGlvbi5cbiAgICAgKiBAamEg5LiL5L2N44Gu44Ko44Op44O85oOF5aCx44KS5qC857SNXG4gICAgICovXG4gICAgcmVhZG9ubHkgY2F1c2U6IGFueTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2VuZXJhdGVkIHRpbWUgaW5mb3JtYXRpb24uXG4gICAgICogQGphIOeUn+aIkOOBleOCjOOBn+aZguWIu+aDheWgsVxuICAgICAqL1xuICAgIHJlYWRvbmx5IHRpbWUhOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2Ugc3VjY2VlZGVkIG9yIG5vdC5cbiAgICAgKiBAamEg5oiQ5Yqf5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzU3VjY2VlZGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gU1VDQ0VFREVEKHRoaXMuY29kZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEp1ZGdlIGZhaWxlZCBvciBub3QuXG4gICAgICogQGphIOWkseaVl+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0ZhaWxlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIEZBSUxFRCh0aGlzLmNvZGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBjYW5jZWxlZCBvciBub3QuXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+OCqOODqeODvOWIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0NhbmNlbGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5jb2RlID09PSBSRVNVTFRfQ09ERS5BQk9SVDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGZvcm1hdHRlZCBbW1JFU1VMVF9DT0RFXV0gbmFtZSBzdHJpbmcuXG4gICAgICogQGphIOODleOCqeODvOODnuODg+ODiOOBleOCjOOBnyBbW1JFU1VMVF9DT0RFXV0g5ZCN5paH5a2X5YiX44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGNvZGVOYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0b05hbWVTdHJpbmcodGhpcy5jb2RlLCB0aGlzLm5hbWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgW1tSRVNVTFRfQ09ERV1dIGhlbHAgc3RyaW5nLlxuICAgICAqIEBqYSBbW1JFU1VMVF9DT0RFXV0g44Gu44OY44Or44OX44K544OI44Oq44Oz44Kw44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGhlbHAoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRvSGVscFN0cmluZyh0aGlzLmNvZGUpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpOiBUYWcuUkVTVUxUIHtcbiAgICAgICAgcmV0dXJuIFRhZy5SRVNVTFQ7XG4gICAgfVxufVxuXG5SZXN1bHQucHJvdG90eXBlLm5hbWUgPSBUYWcuUkVTVUxUO1xuXG4vKiogQGludGVybmEgbFJldHVybnMgYHRydWVgIGlmIGB4YCBpcyBgRXJyb3JgLCBgZmFsc2VgIG90aGVyd2lzZS4gKi9cbmZ1bmN0aW9uIGlzRXJyb3IoeDogdW5rbm93bik6IHggaXMgRXJyb3Ige1xuICAgIHJldHVybiB4IGluc3RhbmNlb2YgRXJyb3IgfHwgY2xhc3NOYW1lKHgpID09PSBUYWcuRVJST1I7XG59XG5cbi8qKiBSZXR1cm5zIGB0cnVlYCBpZiBgeGAgaXMgYFJlc3VsdGAsIGBmYWxzZWAgb3RoZXJ3aXNlLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUmVzdWx0KHg6IHVua25vd24pOiB4IGlzIFJlc3VsdCB7XG4gICAgcmV0dXJuIHggaW5zdGFuY2VvZiBSZXN1bHQgfHwgY2xhc3NOYW1lKHgpID09PSBUYWcuUkVTVUxUO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIFtbUmVzdWx0XV0gb2JqZWN0LlxuICogQGphIFtbUmVzdWx0XV0g44Kq44OW44K444Kn44Kv44OI44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b1Jlc3VsdChvOiB1bmtub3duKTogUmVzdWx0IHtcbiAgICBpZiAobyBpbnN0YW5jZW9mIFJlc3VsdCkge1xuICAgICAgICAvKiBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcHJlZmVyLWNvbnN0ICovXG4gICAgICAgIGxldCB7IGNvZGUsIGNhdXNlLCB0aW1lIH0gPSBvO1xuICAgICAgICBjb2RlID0gaXNOaWwoY29kZSkgPyBSRVNVTFRfQ09ERS5TVUNDRVNTIDogaXNOdW1iZXIoY29kZSkgPyBNYXRoLnRydW5jKGNvZGUpIDogUkVTVUxUX0NPREUuRkFJTDtcbiAgICAgICAgaXNOdW1iZXIodGltZSkgfHwgKHRpbWUgPSBEYXRlLm5vdygpKTtcbiAgICAgICAgLy8gRG8gbm90aGluZyBpZiBhbHJlYWR5IGRlZmluZWRcbiAgICAgICAgUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eShvLCAnY29kZScsICBkZXNjKGNvZGUpKTtcbiAgICAgICAgUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eShvLCAnY2F1c2UnLCBkZXNjKGNhdXNlKSk7XG4gICAgICAgIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkobywgJ3RpbWUnLCAgZGVzYyh0aW1lKSk7XG4gICAgICAgIHJldHVybiBvO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGUgPSBPYmplY3QobykgYXMgUmVzdWx0O1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gaXNTdHJpbmcoZS5tZXNzYWdlKSA/IGUubWVzc2FnZSA6IGlzU3RyaW5nKG8pID8gbyA6IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgY29kZSA9IGlzQ2hhbmNlbExpa2VFcnJvcihtZXNzYWdlKSA/IFJFU1VMVF9DT0RFLkFCT1JUIDogaXNOdW1iZXIoZS5jb2RlKSA/IGUuY29kZSA6IG8gYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCBjYXVzZSA9IGlzRXJyb3IoZS5jYXVzZSkgPyBlLmNhdXNlIDogaXNFcnJvcihvKSA/IG8gOiBpc1N0cmluZyhvKSA/IG5ldyBFcnJvcihvKSA6IG87XG4gICAgICAgIHJldHVybiBuZXcgUmVzdWx0KGNvZGUsIG1lc3NhZ2UsIGNhdXNlKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENyZWF0ZSBbW1Jlc3VsdF1dIGhlbHBlci5cbiAqIEBqYSBbW1Jlc3VsdF1dIOOCquODluOCuOOCp+OCr+ODiOani+evieODmOODq+ODkeODvFxuICpcbiAqIEBwYXJhbSBjb2RlXG4gKiAgLSBgZW5gIHJlc3VsdCBjb2RlXG4gKiAgLSBgamFgIOe1kOaenOOCs+ODvOODiVxuICogQHBhcmFtIG1lc3NhZ2VcbiAqICAtIGBlbmAgcmVzdWx0IGluZm8gbWVzc2FnZVxuICogIC0gYGphYCDntZDmnpzmg4XloLHjg6Hjg4Pjgrvjg7zjgrhcbiAqIEBwYXJhbSBjYXVzZVxuICogIC0gYGVuYCBsb3ctbGV2ZWwgZXJyb3IgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5LiL5L2N44Gu44Ko44Op44O85oOF5aCxXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlUmVzdWx0KGNvZGU6IG51bWJlciwgbWVzc2FnZT86IHN0cmluZywgY2F1c2U/OiB1bmtub3duKTogUmVzdWx0IHtcbiAgICByZXR1cm4gbmV3IFJlc3VsdChjb2RlLCBtZXNzYWdlLCBjYXVzZSk7XG59XG5cbi8qKlxuICogQGVuIENyZWF0ZSBjYW5jZWxlZCBbW1Jlc3VsdF1dIGhlbHBlci5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vmg4XloLHmoLzntI0gW1tSZXN1bHRdXSDjgqrjg5bjgrjjgqfjgq/jg4jmp4vnr4njg5jjg6vjg5Hjg7xcbiAqXG4gKiBAcGFyYW0gbWVzc2FnZVxuICogIC0gYGVuYCByZXN1bHQgaW5mbyBtZXNzYWdlXG4gKiAgLSBgamFgIOe1kOaenOaDheWgseODoeODg+OCu+ODvOOCuFxuICogQHBhcmFtIGNhdXNlXG4gKiAgLSBgZW5gIGxvdy1sZXZlbCBlcnJvciBpbmZvcm1hdGlvblxuICogIC0gYGphYCDkuIvkvY3jga7jgqjjg6njg7zmg4XloLFcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1ha2VDYW5jZWxlZFJlc3VsdChtZXNzYWdlPzogc3RyaW5nLCBjYXVzZT86IHVua25vd24pOiBSZXN1bHQge1xuICAgIHJldHVybiBuZXcgUmVzdWx0KFJFU1VMVF9DT0RFLkFCT1JULCBtZXNzYWdlLCBjYXVzZSk7XG59XG4iLCJpbXBvcnQge1xuICAgIEtleXMsXG4gICAgVHlwZXMsXG4gICAgS2V5VG9UeXBlLFxuICAgIGRlZXBFcXVhbCxcbiAgICBpc0VtcHR5T2JqZWN0LFxuICAgIGZyb21UeXBlZERhdGEsXG4gICAgZHJvcFVuZGVmaW5lZCxcbiAgICByZXN0b3JlTmlsLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uLCBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgQ2FuY2VsYWJsZSxcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHtcbiAgICBTdG9yYWdlRGF0YSxcbiAgICBTdG9yYWdlRGF0YVR5cGVzLFxuICAgIFN0b3JhZ2VEYXRhVHlwZUxpc3QsXG4gICAgU3RvcmFnZUlucHV0RGF0YVR5cGVMaXN0LFxuICAgIElTdG9yYWdlT3B0aW9ucyxcbiAgICBJU3RvcmFnZURhdGFPcHRpb25zLFxuICAgIElTdG9yYWdlRGF0YVJldHVyblR5cGUsXG4gICAgSVN0b3JhZ2VFdmVudENhbGxiYWNrLFxuICAgIElTdG9yYWdlLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogTWVtb3J5U3RvcmFnZSBJL08gb3B0aW9ucyAqL1xuZXhwb3J0IHR5cGUgTWVtb3J5U3RvcmFnZU9wdGlvbnM8SyBleHRlbmRzIEtleXM8U3RvcmFnZURhdGFUeXBlTGlzdD4gPSBLZXlzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+PiA9IElTdG9yYWdlRGF0YU9wdGlvbnM8U3RvcmFnZURhdGFUeXBlTGlzdCwgSz47XG4vKiogTWVtb3J5U3RvcmFnZSByZXR1cm4gdmFsdWUgKi9cbmV4cG9ydCB0eXBlIE1lbW9yeVN0b3JhZ2VSZXN1bHQ8SyBleHRlbmRzIEtleXM8U3RvcmFnZURhdGFUeXBlTGlzdD4+ID0gS2V5VG9UeXBlPFN0b3JhZ2VEYXRhVHlwZUxpc3QsIEs+O1xuLyoqIE1lbW9yeVN0b3JhZ2UgZGF0YSB0eXBlICovXG5leHBvcnQgdHlwZSBNZW1vcnlTdG9yYWdlRGF0YVR5cGVzID0gVHlwZXM8U3RvcmFnZURhdGFUeXBlTGlzdD47XG4vKiogTWVtb3J5U3RvcmFnZSByZXR1cm4gdHlwZSAqL1xuZXhwb3J0IHR5cGUgTWVtb3J5U3RvcmFnZVJldHVyblR5cGU8RCBleHRlbmRzIE1lbW9yeVN0b3JhZ2VEYXRhVHlwZXM+ID0gSVN0b3JhZ2VEYXRhUmV0dXJuVHlwZTxTdG9yYWdlRGF0YVR5cGVMaXN0LCBEPjtcbi8qKiBNZW1vcnlTdG9yYWdlIGlucHV0IGRhdGEgdHlwZSAqL1xuZXhwb3J0IHR5cGUgTWVtb3J5U3RvcmFnZUlucHV0RGF0YVR5cGVzID0gU3RvcmFnZUlucHV0RGF0YVR5cGVMaXN0PFN0b3JhZ2VEYXRhVHlwZUxpc3Q+O1xuLyoqIE1lbW9yeVN0b3JhZ2UgZXZlbnQgY2FsbGJhY2sgKi9cbmV4cG9ydCB0eXBlIE1lbW9yeVN0b3JhZ2VFdmVudENhbGxiYWNrID0gSVN0b3JhZ2VFdmVudENhbGxiYWNrPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+O1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgTWVtb3J5U3RvcmFnZUV2ZW50IHtcbiAgICAnQCc6IFtzdHJpbmcgfCBudWxsLCBNZW1vcnlTdG9yYWdlRGF0YVR5cGVzIHwgbnVsbCwgTWVtb3J5U3RvcmFnZURhdGFUeXBlcyB8IG51bGxdO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWVtb3J5IHN0b3JhZ2UgY2xhc3MuIFRoaXMgY2xhc3MgZG9lc24ndCBzdXBwb3J0IHBlcm1hbmVjaWF0aW9uIGRhdGEuXG4gKiBAamEg44Oh44Oi44Oq44O844K544OI44Os44O844K444Kv44Op44K5LiDmnKzjgq/jg6njgrnjga/jg4fjg7zjgr/jga7msLjntprljJbjgpLjgrXjg53jg7zjg4jjgZfjgarjgYRcbiAqL1xuZXhwb3J0IGNsYXNzIE1lbW9yeVN0b3JhZ2UgaW1wbGVtZW50cyBJU3RvcmFnZSB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfYnJva2VyID0gbmV3IEV2ZW50QnJva2VyPE1lbW9yeVN0b3JhZ2VFdmVudD4oKTtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBfc3RvcmFnZTogU3RvcmFnZURhdGEgPSB7fTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElTdG9yYWdlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gW1tJU3RvcmFnZV1dIGtpbmQgc2lnbmF0dXJlLlxuICAgICAqIEBqYSBbW0lTdG9yYWdlXV0g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdtZW1vcnknO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4ga2V5LCBvciBudWxsIGlmIHRoZSBnaXZlbiBrZXkgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QuXG4gICAgICogQGphIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWPluW+ly4g5a2Y5Zyo44GX44Gq44GE5aC05ZCI44GvIG51bGwg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBhY2Nlc3Mga2V5XG4gICAgICogIC0gYGphYCDjgqLjgq/jgrvjgrnjgq3jg7xcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgSS9PIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIEkvTyDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgUmV0dXJucyB0aGUgdmFsdWUgd2hpY2ggY29ycmVzcG9uZHMgdG8gYSBrZXkgd2l0aCB0eXBlIGNoYW5nZSBkZXNpZ25hdGVkIGluIGBkYXRhVHlwZWAuXG4gICAgICogIC0gYGphYCBgZGF0YVR5cGVgIOOBp+aMh+WumuOBleOCjOOBn+Wei+WkieaPm+OCkuihjOOBo+OBpiwg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgZ2V0SXRlbTxEIGV4dGVuZHMgTWVtb3J5U3RvcmFnZURhdGFUeXBlcyA9IE1lbW9yeVN0b3JhZ2VEYXRhVHlwZXM+KFxuICAgICAgICBrZXk6IHN0cmluZyxcbiAgICAgICAgb3B0aW9ucz86IE1lbW9yeVN0b3JhZ2VPcHRpb25zPG5ldmVyPlxuICAgICk6IFByb21pc2U8TWVtb3J5U3RvcmFnZVJldHVyblR5cGU8RD4+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgdGhlIGN1cnJlbnQgdmFsdWUgYXNzb2NpYXRlZCB3aXRoIHRoZSBnaXZlbiBrZXksIG9yIG51bGwgaWYgdGhlIGdpdmVuIGtleSBkb2VzIG5vdCBleGlzdCBpbiB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdC5cbiAgICAgKiBAamEg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS5Y+W5b6XLiDlrZjlnKjjgZfjgarjgYTloLTlkIjjga8gbnVsbCDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIGFjY2VzcyBrZXlcbiAgICAgKiAgLSBgamFgIOOCouOCr+OCu+OCueOCreODvFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBJL08gb3B0aW9uc1xuICAgICAqICAtIGBqYWAgSS9PIOOCquODl+OCt+ODp+ODs1xuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBSZXR1cm5zIHRoZSB2YWx1ZSB3aGljaCBjb3JyZXNwb25kcyB0byBhIGtleSB3aXRoIHR5cGUgY2hhbmdlIGRlc2lnbmF0ZWQgaW4gYGRhdGFUeXBlYC5cbiAgICAgKiAgLSBgamFgIGBkYXRhVHlwZWAg44Gn5oyH5a6a44GV44KM44Gf5Z6L5aSJ5o+b44KS6KGM44Gj44GmLCDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLov5TljbRcbiAgICAgKi9cbiAgICBnZXRJdGVtPEsgZXh0ZW5kcyBLZXlzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+PihcbiAgICAgICAga2V5OiBzdHJpbmcsXG4gICAgICAgIG9wdGlvbnM/OiBNZW1vcnlTdG9yYWdlT3B0aW9uczxLPlxuICAgICk6IFByb21pc2U8TWVtb3J5U3RvcmFnZVJlc3VsdDxLPiB8IG51bGw+O1xuXG4gICAgYXN5bmMgZ2V0SXRlbShrZXk6IHN0cmluZywgb3B0aW9ucz86IE1lbW9yeVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTxNZW1vcnlTdG9yYWdlRGF0YVR5cGVzIHwgbnVsbD4ge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgYXdhaXQgY2Mob3B0aW9ucy5jYW5jZWwpO1xuXG4gICAgICAgIC8vIGB1bmRlZmluZWRgIOKGkiBgbnVsbGBcbiAgICAgICAgY29uc3QgdmFsdWUgPSBkcm9wVW5kZWZpbmVkKHRoaXMuX3N0b3JhZ2Vba2V5XSk7XG4gICAgICAgIHN3aXRjaCAob3B0aW9ucy5kYXRhVHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gZnJvbVR5cGVkRGF0YSh2YWx1ZSkgYXMgc3RyaW5nO1xuICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gTnVtYmVyKHJlc3RvcmVOaWwodmFsdWUpKTtcbiAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgICAgIHJldHVybiBCb29sZWFuKHJlc3RvcmVOaWwodmFsdWUpKTtcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIE9iamVjdChyZXN0b3JlTmlsKHZhbHVlKSk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiByZXN0b3JlTmlsKHZhbHVlKSBhcyBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldHMgdGhlIHZhbHVlIG9mIHRoZSBwYWlyIGlkZW50aWZpZWQgYnkga2V5IHRvIHZhbHVlLCBjcmVhdGluZyBhIG5ldyBrZXkvdmFsdWUgcGFpciBpZiBub25lIGV4aXN0ZWQgZm9yIGtleSBwcmV2aW91c2x5LlxuICAgICAqIEBqYSDjgq3jg7zjgpLmjIflrprjgZfjgablgKTjgpLoqK3lrpouIOWtmOWcqOOBl+OBquOBhOWgtOWQiOOBr+aWsOimj+OBq+S9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgYWNjZXNzIGtleVxuICAgICAqICAtIGBqYWAg44Ki44Kv44K744K544Kt44O8XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIEkvTyBvcHRpb25zXG4gICAgICogIC0gYGphYCBJL08g44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgc2V0SXRlbTxWIGV4dGVuZHMgTWVtb3J5U3RvcmFnZUlucHV0RGF0YVR5cGVzPihrZXk6IHN0cmluZywgdmFsdWU6IFYsIG9wdGlvbnM/OiBNZW1vcnlTdG9yYWdlT3B0aW9uczxuZXZlcj4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGF3YWl0IGNjKG9wdGlvbnMuY2FuY2VsKTtcbiAgICAgICAgY29uc3QgbmV3VmFsID0gZHJvcFVuZGVmaW5lZCh2YWx1ZSwgdHJ1ZSk7ICAgICAgICAgLy8gYG51bGxgIG9yIGB1bmRlZmluZWRgIOKGkiAnbnVsbCcgb3IgJ3VuZGVmaW5lZCdcbiAgICAgICAgY29uc3Qgb2xkVmFsID0gZHJvcFVuZGVmaW5lZCh0aGlzLl9zdG9yYWdlW2tleV0pOyAgLy8gYHVuZGVmaW5lZGAg4oaSIGBudWxsYFxuICAgICAgICBpZiAoIWRlZXBFcXVhbChvbGRWYWwsIG5ld1ZhbCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2Vba2V5XSA9IG5ld1ZhbCBhcyBTdG9yYWdlRGF0YVR5cGVzO1xuICAgICAgICAgICAgIW9wdGlvbnMuc2lsZW50ICYmIHRoaXMuX2Jyb2tlci50cmlnZ2VyKCdAJywga2V5LCBuZXdWYWwsIG9sZFZhbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlcyB0aGUga2V5L3ZhbHVlIHBhaXIgd2l0aCB0aGUgZ2l2ZW4ga2V5IGZyb20gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QsIGlmIGEga2V5L3ZhbHVlIHBhaXIgd2l0aCB0aGUgZ2l2ZW4ga2V5IGV4aXN0cy5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44Gf44Kt44O844Gr5a++5b+c44GZ44KL5YCk44GM5a2Y5Zyo44GZ44KM44Gw5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyByZW1vdmVJdGVtKGtleTogc3RyaW5nLCBvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zLmNhbmNlbCk7XG4gICAgICAgIGNvbnN0IG9sZFZhbCA9IHRoaXMuX3N0b3JhZ2Vba2V5XTtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gb2xkVmFsKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fc3RvcmFnZVtrZXldO1xuICAgICAgICAgICAgIW9wdGlvbnMuc2lsZW50ICYmIHRoaXMuX2Jyb2tlci50cmlnZ2VyKCdAJywga2V5LCBudWxsLCBvbGRWYWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEVtcHRpZXMgdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3Qgb2YgYWxsIGtleS92YWx1ZSBwYWlycywgaWYgdGhlcmUgYXJlIGFueS5cbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBjbGVhcihvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zLmNhbmNlbCk7XG4gICAgICAgIGlmICghaXNFbXB0eU9iamVjdCh0aGlzLl9zdG9yYWdlKSkge1xuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZSA9IHt9O1xuICAgICAgICAgICAgIW9wdGlvbnMuc2lsZW50ICYmIHRoaXMuX2Jyb2tlci50cmlnZ2VyKCdAJywgbnVsbCwgbnVsbCwgbnVsbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbGwgZW50cnkga2V5cy5cbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kt44O85LiA6Kan44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY2FuY2VsIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODq+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIGtleXMob3B0aW9ucz86IENhbmNlbGFibGUpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgICAgIGF3YWl0IGNjKG9wdGlvbnMgJiYgb3B0aW9ucy5jYW5jZWwpO1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fc3RvcmFnZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb24obGlzdGVuZXI6IE1lbW9yeVN0b3JhZ2VFdmVudENhbGxiYWNrKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Jyb2tlci5vbignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmKGxpc3RlbmVyPzogTWVtb3J5U3RvcmFnZUV2ZW50Q2FsbGJhY2spOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYnJva2VyLm9mZignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOlxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBhIHN0b3JhZ2Utc3RvcmUgb2JqZWN0LlxuICAgICAqIEBqYSDjgrnjg4jjg6zjg7zjgrjjgrnjg4jjgqLjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBnZXQgY29udGV4dCgpOiBTdG9yYWdlRGF0YSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlO1xuICAgIH1cbn1cblxuLy8gZGVmYXVsdCBzdG9yYWdlXG5leHBvcnQgY29uc3QgbWVtb3J5U3RvcmFnZSA9IG5ldyBNZW1vcnlTdG9yYWdlKCk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBwb3N0LFxuICAgIGRlZXBFcXVhbCxcbiAgICBkZWVwQ29weSxcbiAgICBkcm9wVW5kZWZpbmVkLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQge1xuICAgIFN0b3JhZ2VEYXRhLFxuICAgIElTdG9yYWdlLFxuICAgIElTdG9yYWdlT3B0aW9ucyxcbiAgICBJU3RvcmFnZUZvcm1hdE9wdGlvbnMsXG4gICAgUmVnaXN0cnlTY2hlbWFCYXNlLFxuICAgIFJlZ2lzdHJ5RXZlbnQsXG4gICAgUmVnaXN0cnlSZWFkT3B0aW9ucyxcbiAgICBSZWdpc3RyeVdyaXRlT3B0aW9ucyxcbiAgICBSZWdpc3RyeVNhdmVPcHRpb25zLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEBlbiBSZWdpc3RyeSBtYW5hZ2VtZW50IGNsYXNzIGZvciBzeW5jaHJvbm91cyBSZWFkL1dyaXRlIGFjY2Vzc2libGUgZnJvbSBhbnkgW1tJU3RvcmFnZV1dIG9iamVjdC5cbiAqIEBqYSDku7vmhI/jga4gW1tJU3RvcmFnZV1dIOOCquODluOCuOOCp+OCr+ODiOOBi+OCieWQjOacnyBSZWFkL1dyaXRlIOOCouOCr+OCu+OCueWPr+iDveOBquODrOOCuOOCueODiOODqueuoeeQhuOCr+ODqeOCuVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogLy8gMS4gZGVmaW5lIHJlZ2lzdHJ5IHNjaGVtYVxuICogaW50ZXJmYWNlIFNjaGVtYSBleHRlbmRzIFJlZ2lzdHJ5U2NoZW1hQmFzZSB7XG4gKiAgICAnY29tbW9uL21vZGUnOiAnbm9ybWFsJyB8ICdzcGVjaWZpZWQnO1xuICogICAgJ2NvbW1vbi92YWx1ZSc6IG51bWJlcjtcbiAqICAgICd0cmFkZS9sb2NhbCc6IHsgdW5pdDogJ+WGhicgfCAnJCc7IHJhdGU6IG51bWJlcjsgfTtcbiAqICAgICd0cmFkZS9jaGVjayc6IGJvb2xlYW47XG4gKiAgICAnZXh0cmEvdXNlcic6IHN0cmluZztcbiAqIH1cbiAqXG4gKiAvLyAyLiBwcmVwYXJlIElTdG9yYWdlIGluc3RhbmNlXG4gKiAvLyBleFxuICogaW1wb3J0IHsgd2ViU3RvcmFnZSB9IGZyb20gJ0BjZHAvd2ViLXN0b3JhZ2UnO1xuICpcbiAqIC8vIDMuIGluc3RhbnRpYXRlIHRoaXMgY2xhc3NcbiAqIGNvbnN0IHJlZyA9IG5ldyBSZWdpc3RyeTxTY2hlbWE+KHdlYlN0b3JhZ2UsICdAdGVzdCcpO1xuICpcbiAqIC8vIDQuIHJlYWQgZXhhbXBsZVxuICogY29uc3QgdmFsID0gcmVnLnJlYWQoJ2NvbW1vbi9tb2RlJyk7IC8vICdub3JtYWwnIHwgJ3NwZWNpZmllZCcgfCBudWxsXG4gKlxuICogLy8gNS4gd3JpdGUgZXhhbXBsZVxuICogcmVnLndyaXRlKCdjb21tb24vbW9kZScsICdzcGVjaWZpZWQnKTtcbiAqIC8vIHJlZy53cml0ZSgnY29tbW9uL21vZGUnLCAnaG9nZScpOyAvLyBjb21waWxlIGVycm9yXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIFJlZ2lzdHJ5PFQgZXh0ZW5kcyBSZWdpc3RyeVNjaGVtYUJhc2UgPSBhbnk+IGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8UmVnaXN0cnlFdmVudDxUPj4ge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3N0b3JhZ2U6IElTdG9yYWdlO1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yb290S2V5OiBzdHJpbmc7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2RlZmF1bHRPcHRpb25zOiBJU3RvcmFnZUZvcm1hdE9wdGlvbnM7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgX3N0b3JlOiBTdG9yYWdlRGF0YSA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdG9yYWdlXG4gICAgICogIC0gYGVuYCBSb290IGtleSBmb3IgW1tJU3RvcmFnZV1dLlxuICAgICAqICAtIGBqYWAgW1tJU3RvcmFnZV1dIOOBq+S9v+eUqOOBmeOCi+ODq+ODvOODiOOCreODvFxuICAgICAqIEBwYXJhbSByb290S2V5XG4gICAgICogIC0gYGVuYCBSb290IGtleSBmb3IgW1tJU3RvcmFnZV1dLlxuICAgICAqICAtIGBqYWAgW1tJU3RvcmFnZV1dIOOBq+S9v+eUqOOBmeOCi+ODq+ODvOODiOOCreODvFxuICAgICAqIEBwYXJhbSBmb3JtYXRTcGFjZVxuICAgICAqICAtIGBlbmAgZm9yIEpTT04gZm9ybWF0IHNwYWNlLlxuICAgICAqICAtIGBqYWAgSlNPTiDjg5Xjgqnjg7zjg57jg4Pjg4jjgrnjg5rjg7zjgrnjgpLmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzdG9yYWdlOiBJU3RvcmFnZTxhbnk+LCByb290S2V5OiBzdHJpbmcsIGZvcm1hdFNwYWNlPzogbnVtYmVyKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX3N0b3JhZ2UgPSBzdG9yYWdlO1xuICAgICAgICB0aGlzLl9yb290S2V5ID0gcm9vdEtleTtcbiAgICAgICAgdGhpcy5fZGVmYXVsdE9wdGlvbnMgPSB7IGpzb25TcGFjZTogZm9ybWF0U3BhY2UgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIHJvb3Qga2V5LlxuICAgICAqIEBqYSDjg6vjg7zjg4jjgq3jg7zjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgcm9vdEtleSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5fcm9vdEtleTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIFtbSVN0b3JhZ2VdXSBvYmplY3QuXG4gICAgICogQGphIFtbSVN0b3JhZ2VdXSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgc3RvcmFnZSgpOiBJU3RvcmFnZTxhbnk+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2U7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVhZCBwZXJzaXN0ZW5jZSBkYXRhIGZyb20gW1tJU3RvcmFnZV1dLiBUaGUgZGF0YSBsb2FkZWQgYWxyZWFkeSB3aWxsIGJlIGNsZWFyZWQuXG4gICAgICogQGphIFtbSVN0b3JhZ2VdXSDjgYvjgonmsLjntprljJbjgZfjgZ/jg4fjg7zjgr/jgpLoqq3jgb/ovrzjgb8uIOOBmeOBp+OBq+OCreODo+ODg+OCt+ODpeOBleOCjOOBpuOBhOOCi+ODh+ODvOOCv+OBr+egtOajhOOBleOCjOOCi1xuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBsb2FkKG9wdGlvbnM/OiBJU3RvcmFnZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIHRoaXMuX3N0b3JlID0gKGF3YWl0IHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbSh0aGlzLl9yb290S2V5LCBvcHRpb25zKSkgfHwge307XG4gICAgICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB0aGlzLnB1Ymxpc2goJ2NoYW5nZScsICcqJykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFBlcnNpc3QgZGF0YSB0byBbW0lTdG9yYWdlXV0uXG4gICAgICogQGphIFtbSVN0b3JhZ2VdXSDjgavjg4fjg7zjgr/jgpLmsLjntprljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgc2F2ZShvcHRpb25zPzogUmVnaXN0cnlTYXZlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBvcHRzOiBSZWdpc3RyeVNhdmVPcHRpb25zID0geyAuLi50aGlzLl9kZWZhdWx0T3B0aW9ucywgLi4ub3B0aW9ucyB9O1xuICAgICAgICBpZiAoIW9wdHMuc2lsZW50KSB7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ3dpbGwtc2F2ZScpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuX3N0b3JhZ2Uuc2V0SXRlbSh0aGlzLl9yb290S2V5LCB0aGlzLl9zdG9yZSwgb3B0cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlYWQgcmVnaXN0cnkgdmFsdWUuXG4gICAgICogQGphIOODrOOCuOOCueODiOODquWApOOBruiqreOBv+WPluOCilxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHJlZ2lzdHJ5IGtleS5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODrOOCuOOCueODiOODquOCreODvOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZWFkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVhZDxLIGV4dGVuZHMga2V5b2YgVD4oa2V5OiBLLCBvcHRpb25zPzogUmVnaXN0cnlSZWFkT3B0aW9ucyk6IFRbS10gfCBudWxsIHtcbiAgICAgICAgY29uc3QgeyBmaWVsZCB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgY29uc3Qgc3RydWN0dXJlID0gU3RyaW5nKGtleSkuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbGFzdEtleSA9IHN0cnVjdHVyZS5wb3AoKSBhcyBzdHJpbmc7XG5cbiAgICAgICAgbGV0IG5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgbGV0IHJlZyA9IHRoaXMudGFyZ2V0Um9vdChmaWVsZCk7XG5cbiAgICAgICAgd2hpbGUgKG5hbWUgPSBzdHJ1Y3R1cmUuc2hpZnQoKSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbmQtYXNzaWduXG4gICAgICAgICAgICBpZiAoIShuYW1lIGluIHJlZykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlZyA9IHJlZ1tuYW1lXSBhcyBTdG9yYWdlRGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJldHVybiBkZWVwIGNvcHlcbiAgICAgICAgcmV0dXJuIChudWxsICE9IHJlZ1tsYXN0S2V5XSkgPyBkZWVwQ29weShyZWdbbGFzdEtleV0pIGFzIGFueSA6IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFdyaXRlIHJlZ2lzdHJ5IHZhbHVlLlxuICAgICAqIEBqYSDjg6zjgrjjgrnjg4jjg6rlgKTjga7mm7jjgY3ovrzjgb9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCByZWdpc3RyeSBrZXkuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jg6zjgrjjgrnjg4jjg6rjgq3jg7zjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHVwZGF0ZSB2YWx1ZS4gaWYgYG51bGxgIHNldCB0byBkZWxldGUuXG4gICAgICogIC0gYGphYCDmm7TmlrDjgZnjgovlgKQuIGBudWxsYCDjga/liYrpmaRcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgd3JpdGUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOabuOOBjei+vOOBv+OCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyB3cml0ZTxLIGV4dGVuZHMga2V5b2YgVD4oa2V5OiBLLCB2YWx1ZTogVFtLXSB8IG51bGwsIG9wdGlvbnM/OiBSZWdpc3RyeVdyaXRlT3B0aW9ucyk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGZpZWxkLCBub1NhdmUsIHNpbGVudCB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgY29uc3QgcmVtb3ZlID0gKG51bGwgPT0gdmFsdWUpO1xuICAgICAgICBjb25zdCBzdHJ1Y3R1cmUgPSBTdHJpbmcoa2V5KS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBsYXN0S2V5ID0gc3RydWN0dXJlLnBvcCgpIGFzIHN0cmluZztcblxuICAgICAgICBsZXQgbmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBsZXQgcmVnID0gdGhpcy50YXJnZXRSb290KGZpZWxkKTtcblxuICAgICAgICB3aGlsZSAobmFtZSA9IHN0cnVjdHVyZS5zaGlmdCgpKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uZC1hc3NpZ25cbiAgICAgICAgICAgIGlmIChuYW1lIGluIHJlZykge1xuICAgICAgICAgICAgICAgIHJlZyA9IHJlZ1tuYW1lXSBhcyBTdG9yYWdlRGF0YTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVtb3ZlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyDjgZnjgafjgavopqrjgq3jg7zjgYzjgarjgYTjgZ/jgoHkvZXjgoLjgZfjgarjgYRcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVnID0gcmVnW25hbWVdID0ge307XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBuZXdWYWwgPSByZW1vdmUgPyBudWxsIDogdmFsdWU7XG4gICAgICAgIGNvbnN0IG9sZFZhbCA9IGRyb3BVbmRlZmluZWQocmVnW2xhc3RLZXldKTtcbiAgICAgICAgaWYgKGRlZXBFcXVhbChvbGRWYWwsIG5ld1ZhbCkpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8g5pu05paw44Gq44GXXG4gICAgICAgIH0gZWxzZSBpZiAocmVtb3ZlKSB7XG4gICAgICAgICAgICBkZWxldGUgcmVnW2xhc3RLZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVnW2xhc3RLZXldID0gZGVlcENvcHkobmV3VmFsKSBhcyBhbnk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW5vU2F2ZSkge1xuICAgICAgICAgICAgLy8gbm8gZmlyZSBub3RpZmljYXRpb25cbiAgICAgICAgICAgIHZvaWQgdGhpcy5fc3RvcmFnZS5zZXRJdGVtKHRoaXMuX3Jvb3RLZXksIHRoaXMuX3N0b3JlLCB7IC4uLnRoaXMuX2RlZmF1bHRPcHRpb25zLCAuLi5vcHRpb25zIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB0aGlzLnB1Ymxpc2goJ2NoYW5nZScsIGtleSwgbmV3VmFsLCBvbGRWYWwgYXMgYW55KSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVsZXRlIHJlZ2lzdHJ5IGtleS5cbiAgICAgKiBAamEg44Os44K444K544OI44Oq44Kt44O844Gu5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgcmVnaXN0cnkga2V5LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Os44K444K544OI44Oq44Kt44O844KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlYWQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOabuOOBjei+vOOBv+OCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBkZWxldGU8SyBleHRlbmRzIGtleW9mIFQ+KGtleTogSywgb3B0aW9ucz86IFJlZ2lzdHJ5V3JpdGVPcHRpb25zKTogdm9pZCB7XG4gICAgICAgIHRoaXMud3JpdGUoa2V5LCBudWxsLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgYWxsIHJlZ2lzdHJ5LlxuICAgICAqIEBqYSDjg6zjgrjjgrnjg4jjg6rjga7lhajliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZWFkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDmm7jjgY3ovrzjgb/jgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xlYXIob3B0aW9ucz86IFJlZ2lzdHJ5V3JpdGVPcHRpb25zKTogdm9pZCB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICB0aGlzLl9zdG9yZSA9IHt9O1xuICAgICAgICB2b2lkIHRoaXMuX3N0b3JhZ2UucmVtb3ZlSXRlbSh0aGlzLl9yb290S2V5LCBvcHRpb25zKTtcbiAgICAgICAgaWYgKCFvcHRpb25zLnNpbGVudCkge1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdjaGFuZ2UnLCBudWxsLCBudWxsLCBudWxsKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgZ2V0IHJvb3Qgb2JqZWN0ICovXG4gICAgcHJpdmF0ZSB0YXJnZXRSb290KGZpZWxkPzogc3RyaW5nKTogU3RvcmFnZURhdGEge1xuICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICAgIC8vIGVuc3VyZSBbZmllbGRdIG9iamVjdC5cbiAgICAgICAgICAgIHRoaXMuX3N0b3JlW2ZpZWxkXSA9IHRoaXMuX3N0b3JlW2ZpZWxkXSB8fCB7fTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdG9yZVtmaWVsZF0gYXMgU3RvcmFnZURhdGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmU7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBlc2NhcGVIVE1MIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgVGVtcGxhdGVEZWxpbWl0ZXJzLFxuICAgIFRlbXBsYXRlV3JpdGVyLFxuICAgIFRlbXBsYXRlRXNjYXBlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIChzdHJpbmcgfCBUb2tlbltdKSAqL1xuZXhwb3J0IHR5cGUgVG9rZW5MaXN0ID0gdW5rbm93bjtcblxuLyoqXG4gKiBAZW4gW1tUZW1wbGF0ZUVuZ2luZV1dIHRva2VuIHN0cnVjdHVyZS5cbiAqIEBqYSBbW1RlbXBsYXRlRW5naW5lXV0gdG9rZW4g5Z6LXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCB0eXBlIFRva2VuID0gW3N0cmluZywgc3RyaW5nLCBudW1iZXIsIG51bWJlciwgVG9rZW5MaXN0PywgbnVtYmVyPywgYm9vbGVhbj9dO1xuXG4vKipcbiAqIEBlbiBbW1Rva2VuXV0gYWRkcmVzcyBpZC5cbiAqIEBqYSBbW1Rva2VuXV0g44Ki44OJ44Os44K56K2Y5Yil5a2QXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIFRva2VuQWRkcmVzcyB7XG4gICAgVFlQRSA9IDAsXG4gICAgVkFMVUUsXG4gICAgU1RBUlQsXG4gICAgRU5ELFxuICAgIFRPS0VOX0xJU1QsXG4gICAgVEFHX0lOREVYLFxuICAgIEhBU19OT19TUEFDRSxcbn1cblxuLyoqXG4gKiBAZW4gSW50ZXJuYWwgZGVsaW1pdGVycyBkZWZpbml0aW9uIGZvciBbW1RlbXBsYXRlRW5naW5lXV0uIGV4KSBbJ3t7JywnfX0nXSBvciAne3sgfX0nXG4gKiBAamEgW1tUZW1wbGF0ZUVuZ2luZV1dIOOBruWGhemDqOOBp+S9v+eUqOOBmeOCi+WMuuWIh+OCiuaWh+WtlyBleCkgWyd7eycsJ319J10gb3IgJ3t7IH19J1xuICovXG5leHBvcnQgdHlwZSBEZWxpbWl0ZXJzID0gc3RyaW5nIHwgVGVtcGxhdGVEZWxpbWl0ZXJzO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZ2xvYmFsU2V0dGluZ3MgPSB7XG4gICAgdGFnczogWyd7eycsICd9fSddLFxuICAgIGVzY2FwZTogZXNjYXBlSFRNTCxcbn0gYXMge1xuICAgIHRhZ3M6IFRlbXBsYXRlRGVsaW1pdGVycztcbiAgICBlc2NhcGU6IFRlbXBsYXRlRXNjYXBlcjtcbiAgICB3cml0ZXI6IFRlbXBsYXRlV3JpdGVyO1xufTtcbiIsImltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgZW5zdXJlT2JqZWN0LFxuICAgIGdldEdsb2JhbE5hbWVzcGFjZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFRlbXBsYXRlRGVsaW1pdGVycyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQGVuIENhY2hlIGxvY2F0aW9uIGluZm9ybWF0aW9uLlxuICogQGphIOOCreODo+ODg+OCt+ODpeODreOCseODvOOCt+ODp+ODs+aDheWgsVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY29uc3QgZW51bSBDYWNoZUxvY2F0aW9uIHtcbiAgICBOQU1FU1BBQ0UgPSAnQ0RQX0RFQ0xBUkUnLFxuICAgIFJPT1QgICAgICA9ICdURU1QTEFURV9DQUNIRScsXG59XG5cbi8qKlxuICogQGVuIEJ1aWxkIGNhY2hlIGtleS5cbiAqIEBqYSDjgq3jg6Pjg4Pjgrfjg6Xjgq3jg7zjga7nlJ/miJBcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2FjaGVLZXkodGVtcGxhdGU6IHN0cmluZywgdGFnczogVGVtcGxhdGVEZWxpbWl0ZXJzKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7dGVtcGxhdGV9OiR7dGFncy5qb2luKCc6Jyl9YDtcbn1cblxuLyoqXG4gKiBAZW4gQ2xlYXJzIGFsbCBjYWNoZWQgdGVtcGxhdGVzIGluIGNhY2hlIHBvb2wuXG4gKiBAamEg44GZ44G544Gm44Gu44OG44Oz44OX44Os44O844OI44Kt44Oj44OD44K344Ol44KS56C05qOEXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGVhckNhY2hlKCk6IHZvaWQge1xuICAgIGNvbnN0IG5hbWVzcGFjZSA9IGdldEdsb2JhbE5hbWVzcGFjZShDYWNoZUxvY2F0aW9uLk5BTUVTUEFDRSk7XG4gICAgbmFtZXNwYWNlW0NhY2hlTG9jYXRpb24uUk9PVF0gPSB7fTtcbn1cblxuLyoqIEBpbnRlcm5hbCBnbG9iYWwgY2FjaGUgcG9vbCAqL1xuZXhwb3J0IGNvbnN0IGNhY2hlID0gZW5zdXJlT2JqZWN0PFBsYWluT2JqZWN0PihudWxsLCBDYWNoZUxvY2F0aW9uLk5BTUVTUEFDRSwgQ2FjaGVMb2NhdGlvbi5ST09UKTtcbiIsImltcG9ydCB7IGlzQXJyYXksIGlzUHJpbWl0aXZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmV4cG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGhhcyxcbiAgICBlc2NhcGVIVE1MLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKipcbiAqIE1vcmUgY29ycmVjdCB0eXBlb2Ygc3RyaW5nIGhhbmRsaW5nIGFycmF5XG4gKiB3aGljaCBub3JtYWxseSByZXR1cm5zIHR5cGVvZiAnb2JqZWN0J1xuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZVN0cmluZyhzcmM6IHVua25vd24pOiBzdHJpbmcge1xuICAgIHJldHVybiBpc0FycmF5KHNyYykgPyAnYXJyYXknIDogdHlwZW9mIHNyYztcbn1cblxuLyoqXG4gKiBFc2NhcGUgZm9yIHRlbXBsYXRlJ3MgZXhwcmVzc2lvbiBjaGFyYWN0b3JzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlVGVtcGxhdGVFeHAoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuICAgIHJldHVybiBzcmMucmVwbGFjZSgvWy1cXFtcXF17fSgpKis/LixcXFxcXFxeJHwjXFxzXS9nLCAnXFxcXCQmJyk7XG59XG5cbi8qKlxuICogU2FmZSB3YXkgb2YgZGV0ZWN0aW5nIHdoZXRoZXIgb3Igbm90IHRoZSBnaXZlbiB0aGluZyBpcyBhIHByaW1pdGl2ZSBhbmRcbiAqIHdoZXRoZXIgaXQgaGFzIHRoZSBnaXZlbiBwcm9wZXJ0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJpbWl0aXZlSGFzT3duUHJvcGVydHkoc3JjOiB1bmtub3duLCBwcm9wTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGlzUHJpbWl0aXZlKHNyYykgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNyYywgcHJvcE5hbWUpO1xufVxuXG4vKipcbiAqIENoZWNrIHdoaXRlc3BhY2UgY2hhcmFjdG9yIGV4aXN0cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2hpdGVzcGFjZShzcmM6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhL1xcUy8udGVzdChzcmMpO1xufVxuIiwiaW1wb3J0IHsgVGVtcGxhdGVTY2FubmVyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBBIHNpbXBsZSBzdHJpbmcgc2Nhbm5lciB0aGF0IGlzIHVzZWQgYnkgdGhlIHRlbXBsYXRlIHBhcnNlciB0byBmaW5kXG4gKiB0b2tlbnMgaW4gdGVtcGxhdGUgc3RyaW5ncy5cbiAqL1xuZXhwb3J0IGNsYXNzIFNjYW5uZXIgaW1wbGVtZW50cyBUZW1wbGF0ZVNjYW5uZXIge1xuICAgIHByaXZhdGUgX3NvdXJjZTogc3RyaW5nO1xuICAgIHByaXZhdGUgX3RhaWw6IHN0cmluZztcbiAgICBwcml2YXRlIF9wb3M6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3JjOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5fc291cmNlID0gdGhpcy5fdGFpbCA9IHNyYztcbiAgICAgICAgdGhpcy5fcG9zID0gMDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgY3VycmVudCBzY2FubmluZyBwb3NpdGlvbi5cbiAgICAgKi9cbiAgICBnZXQgcG9zKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wb3M7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBzdHJpbmcgIHNvdXJjZS5cbiAgICAgKi9cbiAgICBnZXQgc291cmNlKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHRhaWwgaXMgZW1wdHkgKGVuZCBvZiBzdHJpbmcpLlxuICAgICAqL1xuICAgIGdldCBlb3MoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAnJyA9PT0gdGhpcy5fdGFpbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmllcyB0byBtYXRjaCB0aGUgZ2l2ZW4gcmVndWxhciBleHByZXNzaW9uIGF0IHRoZSBjdXJyZW50IHBvc2l0aW9uLlxuICAgICAqIFJldHVybnMgdGhlIG1hdGNoZWQgdGV4dCBpZiBpdCBjYW4gbWF0Y2gsIHRoZSBlbXB0eSBzdHJpbmcgb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIHNjYW4ocmVnZXhwOiBSZWdFeHApOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBtYXRjaCA9IHJlZ2V4cC5leGVjKHRoaXMuX3RhaWwpO1xuXG4gICAgICAgIGlmICghbWF0Y2ggfHwgMCAhPT0gbWF0Y2guaW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN0cmluZyA9IG1hdGNoWzBdO1xuXG4gICAgICAgIHRoaXMuX3RhaWwgPSB0aGlzLl90YWlsLnN1YnN0cmluZyhzdHJpbmcubGVuZ3RoKTtcbiAgICAgICAgdGhpcy5fcG9zICs9IHN0cmluZy5sZW5ndGg7XG5cbiAgICAgICAgcmV0dXJuIHN0cmluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTa2lwcyBhbGwgdGV4dCB1bnRpbCB0aGUgZ2l2ZW4gcmVndWxhciBleHByZXNzaW9uIGNhbiBiZSBtYXRjaGVkLiBSZXR1cm5zXG4gICAgICogdGhlIHNraXBwZWQgc3RyaW5nLCB3aGljaCBpcyB0aGUgZW50aXJlIHRhaWwgaWYgbm8gbWF0Y2ggY2FuIGJlIG1hZGUuXG4gICAgICovXG4gICAgc2NhblVudGlsKHJlZ2V4cDogUmVnRXhwKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLl90YWlsLnNlYXJjaChyZWdleHApO1xuICAgICAgICBsZXQgbWF0Y2g6IHN0cmluZztcblxuICAgICAgICBzd2l0Y2ggKGluZGV4KSB7XG4gICAgICAgICAgICBjYXNlIC0xOlxuICAgICAgICAgICAgICAgIG1hdGNoID0gdGhpcy5fdGFpbDtcbiAgICAgICAgICAgICAgICB0aGlzLl90YWlsID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICAgbWF0Y2ggPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgbWF0Y2ggPSB0aGlzLl90YWlsLnN1YnN0cmluZygwLCBpbmRleCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fdGFpbCA9IHRoaXMuX3RhaWwuc3Vic3RyaW5nKGluZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3BvcyArPSBtYXRjaC5sZW5ndGg7XG5cbiAgICAgICAgcmV0dXJuIG1hdGNoO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFRlbXBsYXRlQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaGFzLFxuICAgIHByaW1pdGl2ZUhhc093blByb3BlcnR5LFxufSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVuZGVyaW5nIGNvbnRleHQgYnkgd3JhcHBpbmcgYSB2aWV3IG9iamVjdCBhbmRcbiAqIG1haW50YWluaW5nIGEgcmVmZXJlbmNlIHRvIHRoZSBwYXJlbnQgY29udGV4dC5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbnRleHQgaW1wbGVtZW50cyBUZW1wbGF0ZUNvbnRleHQge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3ZpZXc6IFBsYWluT2JqZWN0O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3BhcmVudD86IENvbnRleHQ7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfY2FjaGU6IFBsYWluT2JqZWN0O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3IodmlldzogUGxhaW5PYmplY3QsIHBhcmVudENvbnRleHQ/OiBDb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX3ZpZXcgICA9IHZpZXc7XG4gICAgICAgIHRoaXMuX2NhY2hlICA9IHsgJy4nOiB0aGlzLl92aWV3IH07XG4gICAgICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudENvbnRleHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBWaWV3IHBhcmFtZXRlciBnZXR0ZXIuXG4gICAgICovXG4gICAgZ2V0IHZpZXcoKTogUGxhaW5PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmlldztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IGNvbnRleHQgdXNpbmcgdGhlIGdpdmVuIHZpZXcgd2l0aCB0aGlzIGNvbnRleHRcbiAgICAgKiBhcyB0aGUgcGFyZW50LlxuICAgICAqL1xuICAgIHB1c2godmlldzogUGxhaW5PYmplY3QpOiBDb250ZXh0IHtcbiAgICAgICAgcmV0dXJuIG5ldyBDb250ZXh0KHZpZXcsIHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHZhbHVlIG9mIHRoZSBnaXZlbiBuYW1lIGluIHRoaXMgY29udGV4dCwgdHJhdmVyc2luZ1xuICAgICAqIHVwIHRoZSBjb250ZXh0IGhpZXJhcmNoeSBpZiB0aGUgdmFsdWUgaXMgYWJzZW50IGluIHRoaXMgY29udGV4dCdzIHZpZXcuXG4gICAgICovXG4gICAgbG9va3VwKG5hbWU6IHN0cmluZyk6IHVua25vd24ge1xuICAgICAgICBjb25zdCBjYWNoZSA9IHRoaXMuX2NhY2hlO1xuXG4gICAgICAgIGxldCB2YWx1ZTogdW5rbm93bjtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjYWNoZSwgbmFtZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gY2FjaGVbbmFtZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgY29udGV4dDogQ29udGV4dCB8IHVuZGVmaW5lZCA9IHRoaXM7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICAgICAgICAgIGxldCBpbnRlcm1lZGlhdGVWYWx1ZTogb2JqZWN0IHwgdW5kZWZpbmVkIHwgbnVsbDtcbiAgICAgICAgICAgIGxldCBuYW1lczogc3RyaW5nW107XG4gICAgICAgICAgICBsZXQgaW5kZXg6IG51bWJlcjtcbiAgICAgICAgICAgIGxldCBsb29rdXBIaXQgPSBmYWxzZTtcblxuICAgICAgICAgICAgd2hpbGUgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBpZiAoMCA8IG5hbWUuaW5kZXhPZignLicpKSB7XG4gICAgICAgICAgICAgICAgICAgIGludGVybWVkaWF0ZVZhbHVlID0gY29udGV4dC5fdmlldztcbiAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBuYW1lLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ID0gMDtcblxuICAgICAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgICAgICogVXNpbmcgdGhlIGRvdCBub3Rpb24gcGF0aCBpbiBgbmFtZWAsIHdlIGRlc2NlbmQgdGhyb3VnaCB0aGVcbiAgICAgICAgICAgICAgICAgICAgICogbmVzdGVkIG9iamVjdHMuXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIFRvIGJlIGNlcnRhaW4gdGhhdCB0aGUgbG9va3VwIGhhcyBiZWVuIHN1Y2Nlc3NmdWwsIHdlIGhhdmUgdG9cbiAgICAgICAgICAgICAgICAgICAgICogY2hlY2sgaWYgdGhlIGxhc3Qgb2JqZWN0IGluIHRoZSBwYXRoIGFjdHVhbGx5IGhhcyB0aGUgcHJvcGVydHlcbiAgICAgICAgICAgICAgICAgICAgICogd2UgYXJlIGxvb2tpbmcgZm9yLiBXZSBzdG9yZSB0aGUgcmVzdWx0IGluIGBsb29rdXBIaXRgLlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBUaGlzIGlzIHNwZWNpYWxseSBuZWNlc3NhcnkgZm9yIHdoZW4gdGhlIHZhbHVlIGhhcyBiZWVuIHNldCB0b1xuICAgICAgICAgICAgICAgICAgICAgKiBgdW5kZWZpbmVkYCBhbmQgd2Ugd2FudCB0byBhdm9pZCBsb29raW5nIHVwIHBhcmVudCBjb250ZXh0cy5cbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogSW4gdGhlIGNhc2Ugd2hlcmUgZG90IG5vdGF0aW9uIGlzIHVzZWQsIHdlIGNvbnNpZGVyIHRoZSBsb29rdXBcbiAgICAgICAgICAgICAgICAgICAgICogdG8gYmUgc3VjY2Vzc2Z1bCBldmVuIGlmIHRoZSBsYXN0IFwib2JqZWN0XCIgaW4gdGhlIHBhdGggaXNcbiAgICAgICAgICAgICAgICAgICAgICogbm90IGFjdHVhbGx5IGFuIG9iamVjdCBidXQgYSBwcmltaXRpdmUgKGUuZy4sIGEgc3RyaW5nLCBvciBhblxuICAgICAgICAgICAgICAgICAgICAgKiBpbnRlZ2VyKSwgYmVjYXVzZSBpdCBpcyBzb21ldGltZXMgdXNlZnVsIHRvIGFjY2VzcyBhIHByb3BlcnR5XG4gICAgICAgICAgICAgICAgICAgICAqIG9mIGFuIGF1dG9ib3hlZCBwcmltaXRpdmUsIHN1Y2ggYXMgdGhlIGxlbmd0aCBvZiBhIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgICAgICoqL1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAobnVsbCAhPSBpbnRlcm1lZGlhdGVWYWx1ZSAmJiBpbmRleCA8IG5hbWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSBuYW1lcy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9va3VwSGl0ID0gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXMoaW50ZXJtZWRpYXRlVmFsdWUsIG5hbWVzW2luZGV4XSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpbWl0aXZlSGFzT3duUHJvcGVydHkoaW50ZXJtZWRpYXRlVmFsdWUsIG5hbWVzW2luZGV4XSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJtZWRpYXRlVmFsdWUgPSBpbnRlcm1lZGlhdGVWYWx1ZVtuYW1lc1tpbmRleCsrXV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGVWYWx1ZSA9IGNvbnRleHQuX3ZpZXdbbmFtZV07XG5cbiAgICAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAgICAqIE9ubHkgY2hlY2tpbmcgYWdhaW5zdCBgaGFzUHJvcGVydHlgLCB3aGljaCBhbHdheXMgcmV0dXJucyBgZmFsc2VgIGlmXG4gICAgICAgICAgICAgICAgICAgICAqIGBjb250ZXh0LnZpZXdgIGlzIG5vdCBhbiBvYmplY3QuIERlbGliZXJhdGVseSBvbWl0dGluZyB0aGUgY2hlY2tcbiAgICAgICAgICAgICAgICAgICAgICogYWdhaW5zdCBgcHJpbWl0aXZlSGFzT3duUHJvcGVydHlgIGlmIGRvdCBub3RhdGlvbiBpcyBub3QgdXNlZC5cbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogQ29uc2lkZXIgdGhpcyBleGFtcGxlOlxuICAgICAgICAgICAgICAgICAgICAgKiBgYGBcbiAgICAgICAgICAgICAgICAgICAgICogTXVzdGFjaGUucmVuZGVyKFwiVGhlIGxlbmd0aCBvZiBhIGZvb3RiYWxsIGZpZWxkIGlzIHt7I2xlbmd0aH19e3tsZW5ndGh9fXt7L2xlbmd0aH19LlwiLCB7bGVuZ3RoOiBcIjEwMCB5YXJkc1wifSlcbiAgICAgICAgICAgICAgICAgICAgICogYGBgXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIElmIHdlIHdlcmUgdG8gY2hlY2sgYWxzbyBhZ2FpbnN0IGBwcmltaXRpdmVIYXNPd25Qcm9wZXJ0eWAsIGFzIHdlIGRvXG4gICAgICAgICAgICAgICAgICAgICAqIGluIHRoZSBkb3Qgbm90YXRpb24gY2FzZSwgdGhlbiByZW5kZXIgY2FsbCB3b3VsZCByZXR1cm46XG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIFwiVGhlIGxlbmd0aCBvZiBhIGZvb3RiYWxsIGZpZWxkIGlzIDkuXCJcbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogcmF0aGVyIHRoYW4gdGhlIGV4cGVjdGVkOlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBcIlRoZSBsZW5ndGggb2YgYSBmb290YmFsbCBmaWVsZCBpcyAxMDAgeWFyZHMuXCJcbiAgICAgICAgICAgICAgICAgICAgICoqL1xuICAgICAgICAgICAgICAgICAgICBsb29rdXBIaXQgPSBoYXMoY29udGV4dC5fdmlldywgbmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGxvb2t1cEhpdCkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGludGVybWVkaWF0ZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb250ZXh0ID0gY29udGV4dC5fcGFyZW50O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWNoZVtuYW1lXSA9IHZhbHVlIGFzIG9iamVjdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5jYWxsKHRoaXMuX3ZpZXcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgVG9rZW4sXG4gICAgVG9rZW5BZGRyZXNzIGFzICQsXG4gICAgRGVsaW1pdGVycyxcbiAgICBnbG9iYWxTZXR0aW5ncyxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQge1xuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgaXNXaGl0ZXNwYWNlLFxuICAgIGVzY2FwZVRlbXBsYXRlRXhwLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IFNjYW5uZXIgfSBmcm9tICcuL3NjYW5uZXInO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcmVnZXhwID0ge1xuICAgIHdoaXRlOiAvXFxzKi8sXG4gICAgc3BhY2U6IC9cXHMrLyxcbiAgICBlcXVhbHM6IC9cXHMqPS8sXG4gICAgY3VybHk6IC9cXHMqXFx9LyxcbiAgICB0YWc6IC8jfFxcXnxcXC98PnxcXHt8Jnw9fCEvLFxufTtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIENvbWJpbmVzIHRoZSB2YWx1ZXMgb2YgY29uc2VjdXRpdmUgdGV4dCB0b2tlbnMgaW4gdGhlIGdpdmVuIGB0b2tlbnNgIGFycmF5IHRvIGEgc2luZ2xlIHRva2VuLlxuICovXG5mdW5jdGlvbiBzcXVhc2hUb2tlbnModG9rZW5zOiBUb2tlbltdKTogVG9rZW5bXSB7XG4gICAgY29uc3Qgc3F1YXNoZWRUb2tlbnM6IFRva2VuW10gPSBbXTtcblxuICAgIGxldCBsYXN0VG9rZW4hOiBUb2tlbjtcbiAgICBmb3IgKGNvbnN0IHRva2VuIG9mIHRva2Vucykge1xuICAgICAgICBpZiAodG9rZW4pIHtcbiAgICAgICAgICAgIGlmICgndGV4dCcgPT09IHRva2VuWyQuVFlQRV0gJiYgbGFzdFRva2VuICYmICd0ZXh0JyA9PT0gbGFzdFRva2VuWyQuVFlQRV0pIHtcbiAgICAgICAgICAgICAgICBsYXN0VG9rZW5bJC5WQUxVRV0gKz0gdG9rZW5bJC5WQUxVRV07XG4gICAgICAgICAgICAgICAgbGFzdFRva2VuWyQuRU5EXSA9IHRva2VuWyQuRU5EXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3F1YXNoZWRUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgbGFzdFRva2VuID0gdG9rZW47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3F1YXNoZWRUb2tlbnM7XG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBGb3JtcyB0aGUgZ2l2ZW4gYXJyYXkgb2YgYHRva2Vuc2AgaW50byBhIG5lc3RlZCB0cmVlIHN0cnVjdHVyZSB3aGVyZVxuICogdG9rZW5zIHRoYXQgcmVwcmVzZW50IGEgc2VjdGlvbiBoYXZlIHR3byBhZGRpdGlvbmFsIGl0ZW1zOiAxKSBhbiBhcnJheSBvZlxuICogYWxsIHRva2VucyB0aGF0IGFwcGVhciBpbiB0aGF0IHNlY3Rpb24gYW5kIDIpIHRoZSBpbmRleCBpbiB0aGUgb3JpZ2luYWxcbiAqIHRlbXBsYXRlIHRoYXQgcmVwcmVzZW50cyB0aGUgZW5kIG9mIHRoYXQgc2VjdGlvbi5cbiAqL1xuZnVuY3Rpb24gbmVzdFRva2Vucyh0b2tlbnM6IFRva2VuW10pOiBUb2tlbltdIHtcbiAgICBjb25zdCBuZXN0ZWRUb2tlbnM6IFRva2VuW10gPSBbXTtcbiAgICBsZXQgY29sbGVjdG9yID0gbmVzdGVkVG9rZW5zO1xuICAgIGNvbnN0IHNlY3Rpb25zOiBUb2tlbltdID0gW107XG5cbiAgICBsZXQgc2VjdGlvbiE6IFRva2VuO1xuICAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgICAgIHN3aXRjaCAodG9rZW5bJC5UWVBFXSkge1xuICAgICAgICAgICAgY2FzZSAnIyc6XG4gICAgICAgICAgICBjYXNlICdeJzpcbiAgICAgICAgICAgICAgICBjb2xsZWN0b3IucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgc2VjdGlvbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yID0gdG9rZW5bJC5UT0tFTl9MSVNUXSA9IFtdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnLyc6XG4gICAgICAgICAgICAgICAgc2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpIGFzIFRva2VuO1xuICAgICAgICAgICAgICAgIHNlY3Rpb25bJC5UQUdfSU5ERVhdID0gdG9rZW5bJC5TVEFSVF07XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yID0gc2VjdGlvbnMubGVuZ3RoID4gMCA/IHNlY3Rpb25zW3NlY3Rpb25zLmxlbmd0aCAtIDFdWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSA6IG5lc3RlZFRva2VucztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXN0ZWRUb2tlbnM7XG59XG5cbi8qKlxuICogQnJlYWtzIHVwIHRoZSBnaXZlbiBgdGVtcGxhdGVgIHN0cmluZyBpbnRvIGEgdHJlZSBvZiB0b2tlbnMuIElmIHRoZSBgdGFnc2BcbiAqIGFyZ3VtZW50IGlzIGdpdmVuIGhlcmUgaXQgbXVzdCBiZSBhbiBhcnJheSB3aXRoIHR3byBzdHJpbmcgdmFsdWVzOiB0aGVcbiAqIG9wZW5pbmcgYW5kIGNsb3NpbmcgdGFncyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSAoZS5nLiBbIFwiPCVcIiwgXCIlPlwiIF0pLiBPZlxuICogY291cnNlLCB0aGUgZGVmYXVsdCBpcyB0byB1c2UgbXVzdGFjaGVzIChpLmUuIG11c3RhY2hlLnRhZ3MpLlxuICpcbiAqIEEgdG9rZW4gaXMgYW4gYXJyYXkgd2l0aCBhdCBsZWFzdCA0IGVsZW1lbnRzLiBUaGUgZmlyc3QgZWxlbWVudCBpcyB0aGVcbiAqIG11c3RhY2hlIHN5bWJvbCB0aGF0IHdhcyB1c2VkIGluc2lkZSB0aGUgdGFnLCBlLmcuIFwiI1wiIG9yIFwiJlwiLiBJZiB0aGUgdGFnXG4gKiBkaWQgbm90IGNvbnRhaW4gYSBzeW1ib2wgKGkuZS4ge3tteVZhbHVlfX0pIHRoaXMgZWxlbWVudCBpcyBcIm5hbWVcIi4gRm9yXG4gKiBhbGwgdGV4dCB0aGF0IGFwcGVhcnMgb3V0c2lkZSBhIHN5bWJvbCB0aGlzIGVsZW1lbnQgaXMgXCJ0ZXh0XCIuXG4gKlxuICogVGhlIHNlY29uZCBlbGVtZW50IG9mIGEgdG9rZW4gaXMgaXRzIFwidmFsdWVcIi4gRm9yIG11c3RhY2hlIHRhZ3MgdGhpcyBpc1xuICogd2hhdGV2ZXIgZWxzZSB3YXMgaW5zaWRlIHRoZSB0YWcgYmVzaWRlcyB0aGUgb3BlbmluZyBzeW1ib2wuIEZvciB0ZXh0IHRva2Vuc1xuICogdGhpcyBpcyB0aGUgdGV4dCBpdHNlbGYuXG4gKlxuICogVGhlIHRoaXJkIGFuZCBmb3VydGggZWxlbWVudHMgb2YgdGhlIHRva2VuIGFyZSB0aGUgc3RhcnQgYW5kIGVuZCBpbmRpY2VzLFxuICogcmVzcGVjdGl2ZWx5LCBvZiB0aGUgdG9rZW4gaW4gdGhlIG9yaWdpbmFsIHRlbXBsYXRlLlxuICpcbiAqIFRva2VucyB0aGF0IGFyZSB0aGUgcm9vdCBub2RlIG9mIGEgc3VidHJlZSBjb250YWluIHR3byBtb3JlIGVsZW1lbnRzOiAxKSBhblxuICogYXJyYXkgb2YgdG9rZW5zIGluIHRoZSBzdWJ0cmVlIGFuZCAyKSB0aGUgaW5kZXggaW4gdGhlIG9yaWdpbmFsIHRlbXBsYXRlIGF0XG4gKiB3aGljaCB0aGUgY2xvc2luZyB0YWcgZm9yIHRoYXQgc2VjdGlvbiBiZWdpbnMuXG4gKlxuICogVG9rZW5zIGZvciBwYXJ0aWFscyBhbHNvIGNvbnRhaW4gdHdvIG1vcmUgZWxlbWVudHM6IDEpIGEgc3RyaW5nIHZhbHVlIG9mXG4gKiBpbmRlbmRhdGlvbiBwcmlvciB0byB0aGF0IHRhZyBhbmQgMikgdGhlIGluZGV4IG9mIHRoYXQgdGFnIG9uIHRoYXQgbGluZSAtXG4gKiBlZyBhIHZhbHVlIG9mIDIgaW5kaWNhdGVzIHRoZSBwYXJ0aWFsIGlzIHRoZSB0aGlyZCB0YWcgb24gdGhpcyBsaW5lLlxuICpcbiAqIEBwYXJhbSB0ZW1wbGF0ZSB0ZW1wbGF0ZSBzdHJpbmdcbiAqIEBwYXJhbSB0YWdzIGRlbGltaXRlcnMgZXgpIFsne3snLCd9fSddIG9yICd7eyB9fSdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVGVtcGxhdGUodGVtcGxhdGU6IHN0cmluZywgdGFncz86IERlbGltaXRlcnMpOiBUb2tlbltdIHtcbiAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBsZXQgbGluZUhhc05vblNwYWNlICAgICA9IGZhbHNlO1xuICAgIGNvbnN0IHNlY3Rpb25zOiBUb2tlbltdID0gW107ICAgICAgIC8vIFN0YWNrIHRvIGhvbGQgc2VjdGlvbiB0b2tlbnNcbiAgICBjb25zdCB0b2tlbnM6IFRva2VuW10gICA9IFtdOyAgICAgICAvLyBCdWZmZXIgdG8gaG9sZCB0aGUgdG9rZW5zXG4gICAgY29uc3Qgc3BhY2VzOiBudW1iZXJbXSAgPSBbXTsgICAgICAgLy8gSW5kaWNlcyBvZiB3aGl0ZXNwYWNlIHRva2VucyBvbiB0aGUgY3VycmVudCBsaW5lXG4gICAgbGV0IGhhc1RhZyAgICAgICAgICAgICAgPSBmYWxzZTsgICAgLy8gSXMgdGhlcmUgYSB7e3RhZ319IG9uIHRoZSBjdXJyZW50IGxpbmU/XG4gICAgbGV0IG5vblNwYWNlICAgICAgICAgICAgPSBmYWxzZTsgICAgLy8gSXMgdGhlcmUgYSBub24tc3BhY2UgY2hhciBvbiB0aGUgY3VycmVudCBsaW5lP1xuICAgIGxldCBpbmRlbnRhdGlvbiAgICAgICAgID0gJyc7ICAgICAgIC8vIFRyYWNrcyBpbmRlbnRhdGlvbiBmb3IgdGFncyB0aGF0IHVzZSBpdFxuICAgIGxldCB0YWdJbmRleCAgICAgICAgICAgID0gMDsgICAgICAgIC8vIFN0b3JlcyBhIGNvdW50IG9mIG51bWJlciBvZiB0YWdzIGVuY291bnRlcmVkIG9uIGEgbGluZVxuXG4gICAgLy8gU3RyaXBzIGFsbCB3aGl0ZXNwYWNlIHRva2VucyBhcnJheSBmb3IgdGhlIGN1cnJlbnQgbGluZVxuICAgIC8vIGlmIHRoZXJlIHdhcyBhIHt7I3RhZ319IG9uIGl0IGFuZCBvdGhlcndpc2Ugb25seSBzcGFjZS5cbiAgICBjb25zdCBzdHJpcFNwYWNlID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICBpZiAoaGFzVGFnICYmICFub25TcGFjZSkge1xuICAgICAgICAgICAgd2hpbGUgKHNwYWNlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdG9rZW5zW3NwYWNlcy5wb3AoKSBhcyBudW1iZXJdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3BhY2VzLmxlbmd0aCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaGFzVGFnID0gZmFsc2U7XG4gICAgICAgIG5vblNwYWNlID0gZmFsc2U7XG4gICAgfTtcblxuICAgIGNvbnN0IGNvbXBpbGVUYWdzID0gKHRhZ3NUb0NvbXBpbGU6IHN0cmluZyB8IHN0cmluZ1tdKTogeyBvcGVuaW5nVGFnOiBSZWdFeHA7IGNsb3NpbmdUYWc6IFJlZ0V4cDsgY2xvc2luZ0N1cmx5OiBSZWdFeHA7IH0gPT4ge1xuICAgICAgICBjb25zdCBlbnVtIFRhZyB7XG4gICAgICAgICAgICBPUEVOID0gMCxcbiAgICAgICAgICAgIENMT1NFLFxuICAgICAgICB9XG4gICAgICAgIGlmIChpc1N0cmluZyh0YWdzVG9Db21waWxlKSkge1xuICAgICAgICAgICAgdGFnc1RvQ29tcGlsZSA9IHRhZ3NUb0NvbXBpbGUuc3BsaXQoX3JlZ2V4cC5zcGFjZSwgMik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWlzQXJyYXkodGFnc1RvQ29tcGlsZSkgfHwgMiAhPT0gdGFnc1RvQ29tcGlsZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCB0YWdzOiAke0pTT04uc3RyaW5naWZ5KHRhZ3NUb0NvbXBpbGUpfWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcGVuaW5nVGFnOiAgIG5ldyBSZWdFeHAoYCR7ZXNjYXBlVGVtcGxhdGVFeHAodGFnc1RvQ29tcGlsZVtUYWcuT1BFTl0pfVxcXFxzKmApLFxuICAgICAgICAgICAgY2xvc2luZ1RhZzogICBuZXcgUmVnRXhwKGBcXFxccyoke2VzY2FwZVRlbXBsYXRlRXhwKHRhZ3NUb0NvbXBpbGVbVGFnLkNMT1NFXSl9YCksXG4gICAgICAgICAgICBjbG9zaW5nQ3VybHk6IG5ldyBSZWdFeHAoYFxcXFxzKiR7ZXNjYXBlVGVtcGxhdGVFeHAoYH0ke3RhZ3NUb0NvbXBpbGVbVGFnLkNMT1NFXX1gKX1gKSxcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgY29uc3QgeyB0YWc6IHJlVGFnLCB3aGl0ZTogcmVXaGl0ZSwgZXF1YWxzOiByZUVxdWFscywgY3VybHk6IHJlQ3VybHkgfSA9IF9yZWdleHA7XG4gICAgbGV0IF9yZWd4cFRhZ3MgPSBjb21waWxlVGFncyh0YWdzIHx8IGdsb2JhbFNldHRpbmdzLnRhZ3MpO1xuXG4gICAgY29uc3Qgc2Nhbm5lciA9IG5ldyBTY2FubmVyKHRlbXBsYXRlKTtcblxuICAgIGxldCBvcGVuU2VjdGlvbjogVG9rZW4gfCB1bmRlZmluZWQ7XG4gICAgd2hpbGUgKCFzY2FubmVyLmVvcykge1xuICAgICAgICBjb25zdCB7IG9wZW5pbmdUYWc6IHJlT3BlbmluZ1RhZywgY2xvc2luZ1RhZzogcmVDbG9zaW5nVGFnLCBjbG9zaW5nQ3VybHk6IHJlQ2xvc2luZ0N1cmx5IH0gPSBfcmVneHBUYWdzO1xuICAgICAgICBsZXQgdG9rZW46IFRva2VuO1xuICAgICAgICBsZXQgc3RhcnQgPSBzY2FubmVyLnBvcztcbiAgICAgICAgLy8gTWF0Y2ggYW55IHRleHQgYmV0d2VlbiB0YWdzLlxuICAgICAgICBsZXQgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChyZU9wZW5pbmdUYWcpO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCB2YWx1ZUxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgaSA8IHZhbHVlTGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaHIgPSB2YWx1ZS5jaGFyQXQoaSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNocikpIHtcbiAgICAgICAgICAgICAgICAgICAgc3BhY2VzLnB1c2godG9rZW5zLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uICs9IGNocjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBub25TcGFjZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVIYXNOb25TcGFjZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uICs9ICcgJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0b2tlbnMucHVzaChbJ3RleHQnLCBjaHIsIHN0YXJ0LCBzdGFydCArIDFdKTtcbiAgICAgICAgICAgICAgICBzdGFydCArPSAxO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHdoaXRlc3BhY2Ugb24gdGhlIGN1cnJlbnQgbGluZS5cbiAgICAgICAgICAgICAgICBpZiAoJ1xcbicgPT09IGNocikge1xuICAgICAgICAgICAgICAgICAgICBzdHJpcFNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIHRhZ0luZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgbGluZUhhc05vblNwYWNlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWF0Y2ggdGhlIG9wZW5pbmcgdGFnLlxuICAgICAgICBpZiAoIXNjYW5uZXIuc2NhbihyZU9wZW5pbmdUYWcpKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGhhc1RhZyA9IHRydWU7XG5cbiAgICAgICAgLy8gR2V0IHRoZSB0YWcgdHlwZS5cbiAgICAgICAgbGV0IHR5cGUgPSBzY2FubmVyLnNjYW4ocmVUYWcpIHx8ICduYW1lJztcbiAgICAgICAgc2Nhbm5lci5zY2FuKHJlV2hpdGUpO1xuXG4gICAgICAgIC8vIEdldCB0aGUgdGFnIHZhbHVlLlxuICAgICAgICBpZiAoJz0nID09PSB0eXBlKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHNjYW5uZXIuc2NhblVudGlsKHJlRXF1YWxzKTtcbiAgICAgICAgICAgIHNjYW5uZXIuc2NhbihyZUVxdWFscyk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdUYWcpO1xuICAgICAgICB9IGVsc2UgaWYgKCd7JyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdDdXJseSk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW4ocmVDdXJseSk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdUYWcpO1xuICAgICAgICAgICAgdHlwZSA9ICcmJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwocmVDbG9zaW5nVGFnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hdGNoIHRoZSBjbG9zaW5nIHRhZy5cbiAgICAgICAgaWYgKCFzY2FubmVyLnNjYW4ocmVDbG9zaW5nVGFnKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmNsb3NlZCB0YWcgYXQgJHtzY2FubmVyLnBvc31gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgnPicgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIHRva2VuID0gW3R5cGUsIHZhbHVlLCBzdGFydCwgc2Nhbm5lci5wb3MsIGluZGVudGF0aW9uLCB0YWdJbmRleCwgbGluZUhhc05vblNwYWNlXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRva2VuID0gW3R5cGUsIHZhbHVlLCBzdGFydCwgc2Nhbm5lci5wb3NdO1xuICAgICAgICB9XG4gICAgICAgIHRhZ0luZGV4Kys7XG4gICAgICAgIHRva2Vucy5wdXNoKHRva2VuKTtcblxuICAgICAgICBpZiAoJyMnID09PSB0eXBlIHx8ICdeJyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgc2VjdGlvbnMucHVzaCh0b2tlbik7XG4gICAgICAgIH0gZWxzZSBpZiAoJy8nID09PSB0eXBlKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBzZWN0aW9uIG5lc3RpbmcuXG4gICAgICAgICAgICBvcGVuU2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpO1xuICAgICAgICAgICAgaWYgKCFvcGVuU2VjdGlvbikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5vcGVuZWQgc2VjdGlvbiBcIiR7dmFsdWV9XCIgYXQgJHtzdGFydH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcGVuU2VjdGlvblsxXSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuY2xvc2VkIHNlY3Rpb24gXCIke29wZW5TZWN0aW9uWyQuVkFMVUVdfVwiIGF0ICR7c3RhcnR9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoJ25hbWUnID09PSB0eXBlIHx8ICd7JyA9PT0gdHlwZSB8fCAnJicgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIG5vblNwYWNlID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICgnPScgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIC8vIFNldCB0aGUgdGFncyBmb3IgdGhlIG5leHQgdGltZSBhcm91bmQuXG4gICAgICAgICAgICBfcmVneHBUYWdzID0gY29tcGlsZVRhZ3ModmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RyaXBTcGFjZSgpO1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoZXJlIGFyZSBubyBvcGVuIHNlY3Rpb25zIHdoZW4gd2UncmUgZG9uZS5cbiAgICBvcGVuU2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpO1xuXG4gICAgaWYgKG9wZW5TZWN0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5jbG9zZWQgc2VjdGlvbiBcIiR7b3BlblNlY3Rpb25bJC5WQUxVRV19XCIgYXQgJHtzY2FubmVyLnBvc31gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmVzdFRva2VucyhzcXVhc2hUb2tlbnModG9rZW5zKSk7XG59XG4iLCJpbXBvcnQge1xuICAgIFRlbXBsYXRlRGVsaW1pdGVycyxcbiAgICBUZW1wbGF0ZVdyaXRlcixcbiAgICBUZW1wbGF0ZVZpZXdQYXJhbSxcbiAgICBUZW1wbGF0ZVBhcnRpYWxQYXJhbSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgVG9rZW4sXG4gICAgVG9rZW5BZGRyZXNzIGFzICQsXG4gICAgZ2xvYmFsU2V0dGluZ3MsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHsgY2FjaGUsIGJ1aWxkQ2FjaGVLZXkgfSBmcm9tICcuL2NhY2hlJztcbmltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IHBhcnNlVGVtcGxhdGUgfSBmcm9tICcuL3BhcnNlJztcbmltcG9ydCB7IENvbnRleHQgfSBmcm9tICcuL2NvbnRleHQnO1xuXG4vKipcbiAqIEEgV3JpdGVyIGtub3dzIGhvdyB0byB0YWtlIGEgc3RyZWFtIG9mIHRva2VucyBhbmQgcmVuZGVyIHRoZW0gdG8gYVxuICogc3RyaW5nLCBnaXZlbiBhIGNvbnRleHQuIEl0IGFsc28gbWFpbnRhaW5zIGEgY2FjaGUgb2YgdGVtcGxhdGVzIHRvXG4gKiBhdm9pZCB0aGUgbmVlZCB0byBwYXJzZSB0aGUgc2FtZSB0ZW1wbGF0ZSB0d2ljZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFdyaXRlciBpbXBsZW1lbnRzIFRlbXBsYXRlV3JpdGVyIHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIGFuZCBjYWNoZXMgdGhlIGdpdmVuIGB0ZW1wbGF0ZWAgYWNjb3JkaW5nIHRvIHRoZSBnaXZlbiBgdGFnc2Agb3JcbiAgICAgKiBgbXVzdGFjaGUudGFnc2AgaWYgYHRhZ3NgIGlzIG9taXR0ZWQsICBhbmQgcmV0dXJucyB0aGUgYXJyYXkgb2YgdG9rZW5zXG4gICAgICogdGhhdCBpcyBnZW5lcmF0ZWQgZnJvbSB0aGUgcGFyc2UuXG4gICAgICovXG4gICAgcGFyc2UodGVtcGxhdGU6IHN0cmluZywgdGFncz86IFRlbXBsYXRlRGVsaW1pdGVycyk6IHsgdG9rZW5zOiBUb2tlbltdOyBjYWNoZUtleTogc3RyaW5nOyB9IHtcbiAgICAgICAgY29uc3QgY2FjaGVLZXkgPSBidWlsZENhY2hlS2V5KHRlbXBsYXRlLCB0YWdzIHx8IGdsb2JhbFNldHRpbmdzLnRhZ3MpO1xuICAgICAgICBsZXQgdG9rZW5zID0gY2FjaGVbY2FjaGVLZXldIGFzIFRva2VuW107XG4gICAgICAgIGlmIChudWxsID09IHRva2Vucykge1xuICAgICAgICAgICAgdG9rZW5zID0gY2FjaGVbY2FjaGVLZXldID0gcGFyc2VUZW1wbGF0ZSh0ZW1wbGF0ZSwgdGFncyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgdG9rZW5zLCBjYWNoZUtleSB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEhpZ2gtbGV2ZWwgbWV0aG9kIHRoYXQgaXMgdXNlZCB0byByZW5kZXIgdGhlIGdpdmVuIGB0ZW1wbGF0ZWAgd2l0aFxuICAgICAqIHRoZSBnaXZlbiBgdmlld2AuXG4gICAgICpcbiAgICAgKiBUaGUgb3B0aW9uYWwgYHBhcnRpYWxzYCBhcmd1bWVudCBtYXkgYmUgYW4gb2JqZWN0IHRoYXQgY29udGFpbnMgdGhlXG4gICAgICogbmFtZXMgYW5kIHRlbXBsYXRlcyBvZiBwYXJ0aWFscyB0aGF0IGFyZSB1c2VkIGluIHRoZSB0ZW1wbGF0ZS4gSXQgbWF5XG4gICAgICogYWxzbyBiZSBhIGZ1bmN0aW9uIHRoYXQgaXMgdXNlZCB0byBsb2FkIHBhcnRpYWwgdGVtcGxhdGVzIG9uIHRoZSBmbHlcbiAgICAgKiB0aGF0IHRha2VzIGEgc2luZ2xlIGFyZ3VtZW50OiB0aGUgbmFtZSBvZiB0aGUgcGFydGlhbC5cbiAgICAgKlxuICAgICAqIElmIHRoZSBvcHRpb25hbCBgdGFnc2AgYXJndW1lbnQgaXMgZ2l2ZW4gaGVyZSBpdCBtdXN0IGJlIGFuIGFycmF5IHdpdGggdHdvXG4gICAgICogc3RyaW5nIHZhbHVlczogdGhlIG9wZW5pbmcgYW5kIGNsb3NpbmcgdGFncyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSAoZS5nLlxuICAgICAqIFsgXCI8JVwiLCBcIiU+XCIgXSkuIFRoZSBkZWZhdWx0IGlzIHRvIG11c3RhY2hlLnRhZ3MuXG4gICAgICovXG4gICAgcmVuZGVyKHRlbXBsYXRlOiBzdHJpbmcsIHZpZXc6IFRlbXBsYXRlVmlld1BhcmFtLCBwYXJ0aWFscz86IFRlbXBsYXRlUGFydGlhbFBhcmFtLCB0YWdzPzogVGVtcGxhdGVEZWxpbWl0ZXJzKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgeyB0b2tlbnMgfSA9IHRoaXMucGFyc2UodGVtcGxhdGUsIHRhZ3MpO1xuICAgICAgICByZXR1cm4gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5zLCB2aWV3LCBwYXJ0aWFscywgdGVtcGxhdGUsIHRhZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvdy1sZXZlbCBtZXRob2QgdGhhdCByZW5kZXJzIHRoZSBnaXZlbiBhcnJheSBvZiBgdG9rZW5zYCB1c2luZ1xuICAgICAqIHRoZSBnaXZlbiBgY29udGV4dGAgYW5kIGBwYXJ0aWFsc2AuXG4gICAgICpcbiAgICAgKiBOb3RlOiBUaGUgYG9yaWdpbmFsVGVtcGxhdGVgIGlzIG9ubHkgZXZlciB1c2VkIHRvIGV4dHJhY3QgdGhlIHBvcnRpb25cbiAgICAgKiBvZiB0aGUgb3JpZ2luYWwgdGVtcGxhdGUgdGhhdCB3YXMgY29udGFpbmVkIGluIGEgaGlnaGVyLW9yZGVyIHNlY3Rpb24uXG4gICAgICogSWYgdGhlIHRlbXBsYXRlIGRvZXNuJ3QgdXNlIGhpZ2hlci1vcmRlciBzZWN0aW9ucywgdGhpcyBhcmd1bWVudCBtYXlcbiAgICAgKiBiZSBvbWl0dGVkLlxuICAgICAqL1xuICAgIHJlbmRlclRva2Vucyh0b2tlbnM6IFRva2VuW10sIHZpZXc6IFRlbXBsYXRlVmlld1BhcmFtLCBwYXJ0aWFscz86IFRlbXBsYXRlUGFydGlhbFBhcmFtLCBvcmlnaW5hbFRlbXBsYXRlPzogc3RyaW5nLCB0YWdzPzogVGVtcGxhdGVEZWxpbWl0ZXJzKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9ICh2aWV3IGluc3RhbmNlb2YgQ29udGV4dCkgPyB2aWV3IDogbmV3IENvbnRleHQodmlldyBhcyBQbGFpbk9iamVjdCk7XG4gICAgICAgIGxldCBidWZmZXIgPSAnJztcblxuICAgICAgICBmb3IgKGNvbnN0IHRva2VuIG9mIHRva2Vucykge1xuICAgICAgICAgICAgbGV0IHZhbHVlOiBzdHJpbmcgfCB2b2lkO1xuICAgICAgICAgICAgc3dpdGNoICh0b2tlblskLlRZUEVdKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnIyc6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5yZW5kZXJTZWN0aW9uKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ14nOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMucmVuZGVySW52ZXJ0ZWQodG9rZW4sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnPic6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5yZW5kZXJQYXJ0aWFsKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscywgdGFncyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJyYnOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMudW5lc2NhcGVkVmFsdWUodG9rZW4sIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICduYW1lJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLmVzY2FwZWRWYWx1ZSh0b2tlbiwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3RleHQnOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMucmF3VmFsdWUodG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBidWZmZXIgKz0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlbmRlclNlY3Rpb24odG9rZW46IFRva2VuLCBjb250ZXh0OiBDb250ZXh0LCBwYXJ0aWFscz86IFRlbXBsYXRlUGFydGlhbFBhcmFtLCBvcmlnaW5hbFRlbXBsYXRlPzogc3RyaW5nKTogc3RyaW5nIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBsZXQgYnVmZmVyID0gJyc7XG4gICAgICAgIGxldCB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWyQuVkFMVUVdKTtcblxuICAgICAgICAvLyBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgdG8gcmVuZGVyIGFuIGFyYml0cmFyeSB0ZW1wbGF0ZVxuICAgICAgICAvLyBpbiB0aGUgY3VycmVudCBjb250ZXh0IGJ5IGhpZ2hlci1vcmRlciBzZWN0aW9ucy5cbiAgICAgICAgY29uc3Qgc3ViUmVuZGVyID0gKHRlbXBsYXRlOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYucmVuZGVyKHRlbXBsYXRlLCBjb250ZXh0LCBwYXJ0aWFscyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHYgb2YgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBidWZmZXIgKz0gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5bJC5UT0tFTl9MSVNUXSBhcyBUb2tlbltdLCBjb250ZXh0LnB1c2godiksIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgnb2JqZWN0JyA9PT0gdHlwZW9mIHZhbHVlIHx8ICdzdHJpbmcnID09PSB0eXBlb2YgdmFsdWUgfHwgJ251bWJlcicgPT09IHR5cGVvZiB2YWx1ZSkge1xuICAgICAgICAgICAgYnVmZmVyICs9IHRoaXMucmVuZGVyVG9rZW5zKHRva2VuWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSwgY29udGV4dC5wdXNoKHZhbHVlIGFzIFBsYWluT2JqZWN0KSwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICBpZiAoJ3N0cmluZycgIT09IHR5cGVvZiBvcmlnaW5hbFRlbXBsYXRlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgdXNlIGhpZ2hlci1vcmRlciBzZWN0aW9ucyB3aXRob3V0IHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRXh0cmFjdCB0aGUgcG9ydGlvbiBvZiB0aGUgb3JpZ2luYWwgdGVtcGxhdGUgdGhhdCB0aGUgc2VjdGlvbiBjb250YWlucy5cbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuY2FsbChjb250ZXh0LnZpZXcsIG9yaWdpbmFsVGVtcGxhdGUuc2xpY2UodG9rZW5bJC5FTkRdLCB0b2tlblskLlRBR19JTkRFWF0pLCBzdWJSZW5kZXIpO1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBidWZmZXIgKz0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWZmZXIgKz0gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5bJC5UT0tFTl9MSVNUXSBhcyBUb2tlbltdLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZW5kZXJJbnZlcnRlZCh0b2tlbjogVG9rZW4sIGNvbnRleHQ6IENvbnRleHQsIHBhcnRpYWxzPzogVGVtcGxhdGVQYXJ0aWFsUGFyYW0sIG9yaWdpbmFsVGVtcGxhdGU/OiBzdHJpbmcpOiBzdHJpbmcgfCB2b2lkIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblskLlZBTFVFXSk7XG4gICAgICAgIGlmICghdmFsdWUgfHwgKGlzQXJyYXkodmFsdWUpICYmIDAgPT09IHZhbHVlLmxlbmd0aCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlbmRlclRva2Vucyh0b2tlblskLlRPS0VOX0xJU1RdIGFzIFRva2VuW10sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGluZGVudFBhcnRpYWwocGFydGlhbDogc3RyaW5nLCBpbmRlbnRhdGlvbjogc3RyaW5nLCBsaW5lSGFzTm9uU3BhY2U6IGJvb2xlYW4pOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBmaWx0ZXJlZEluZGVudGF0aW9uID0gaW5kZW50YXRpb24ucmVwbGFjZSgvW14gXFx0XS9nLCAnJyk7XG4gICAgICAgIGNvbnN0IHBhcnRpYWxCeU5sID0gcGFydGlhbC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFydGlhbEJ5TmwubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChwYXJ0aWFsQnlObFtpXS5sZW5ndGggJiYgKGkgPiAwIHx8ICFsaW5lSGFzTm9uU3BhY2UpKSB7XG4gICAgICAgICAgICAgICAgcGFydGlhbEJ5TmxbaV0gPSBmaWx0ZXJlZEluZGVudGF0aW9uICsgcGFydGlhbEJ5TmxbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhcnRpYWxCeU5sLmpvaW4oJ1xcbicpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlbmRlclBhcnRpYWwodG9rZW46IFRva2VuLCBjb250ZXh0OiBDb250ZXh0LCBwYXJ0aWFsczogVGVtcGxhdGVQYXJ0aWFsUGFyYW0gfCB1bmRlZmluZWQsIHRhZ3M6IFRlbXBsYXRlRGVsaW1pdGVycyB8IHVuZGVmaW5lZCk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBpZiAoIXBhcnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB2YWx1ZSA9IChpc0Z1bmN0aW9uKHBhcnRpYWxzKSA/IHBhcnRpYWxzKHRva2VuWyQuVkFMVUVdKSA6IHBhcnRpYWxzW3Rva2VuWyQuVkFMVUVdXSkgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgbGluZUhhc05vblNwYWNlID0gdG9rZW5bJC5IQVNfTk9fU1BBQ0VdO1xuICAgICAgICAgICAgY29uc3QgdGFnSW5kZXggICAgICAgID0gdG9rZW5bJC5UQUdfSU5ERVhdO1xuICAgICAgICAgICAgY29uc3QgaW5kZW50YXRpb24gICAgID0gdG9rZW5bJC5UT0tFTl9MSVNUXTtcbiAgICAgICAgICAgIGxldCBpbmRlbnRlZFZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICBpZiAoMCA9PT0gdGFnSW5kZXggJiYgaW5kZW50YXRpb24pIHtcbiAgICAgICAgICAgICAgICBpbmRlbnRlZFZhbHVlID0gdGhpcy5pbmRlbnRQYXJ0aWFsKHZhbHVlLCBpbmRlbnRhdGlvbiBhcyBzdHJpbmcsIGxpbmVIYXNOb25TcGFjZSBhcyBib29sZWFuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHsgdG9rZW5zIH0gPSB0aGlzLnBhcnNlKGluZGVudGVkVmFsdWUsIHRhZ3MpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyVG9rZW5zKHRva2VucywgY29udGV4dCwgcGFydGlhbHMsIGluZGVudGVkVmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdW5lc2NhcGVkVmFsdWUodG9rZW46IFRva2VuLCBjb250ZXh0OiBDb250ZXh0KTogc3RyaW5nIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gY29udGV4dC5sb29rdXAodG9rZW5bJC5WQUxVRV0pO1xuICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlIGFzIHN0cmluZztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGVzY2FwZWRWYWx1ZSh0b2tlbjogVG9rZW4sIGNvbnRleHQ6IENvbnRleHQpOiBzdHJpbmcgfCB2b2lkIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblskLlZBTFVFXSk7XG4gICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2xvYmFsU2V0dGluZ3MuZXNjYXBlKHZhbHVlIGFzIHN0cmluZyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByYXdWYWx1ZSh0b2tlbjogVG9rZW4pOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdG9rZW5bJC5WQUxVRV07XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBKU1QsXG4gICAgVGVtcGxhdGVEZWxpbWl0ZXJzLFxuICAgIElUZW1wbGF0ZUVuZ2luZSxcbiAgICBUZW1wbGF0ZVNjYW5uZXIsXG4gICAgVGVtcGxhdGVDb250ZXh0LFxuICAgIFRlbXBsYXRlV3JpdGVyLFxuICAgIFRlbXBsYXRlRXNjYXBlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGdsb2JhbFNldHRpbmdzIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBDYWNoZUxvY2F0aW9uLCBjbGVhckNhY2hlIH0gZnJvbSAnLi9jYWNoZSc7XG5pbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzU3RyaW5nLFxuICAgIHR5cGVTdHJpbmcsXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgU2Nhbm5lciB9IGZyb20gJy4vc2Nhbm5lcic7XG5pbXBvcnQgeyBDb250ZXh0IH0gZnJvbSAnLi9jb250ZXh0JztcbmltcG9ydCB7IFdyaXRlciB9IGZyb20gJy4vd3JpdGVyJztcblxuLyoqIFtbVGVtcGxhdGVFbmdpbmVdXSBjb21tb24gc2V0dGluZ3MgKi9cbmdsb2JhbFNldHRpbmdzLndyaXRlciA9IG5ldyBXcml0ZXIoKTtcblxuLyoqXG4gKiBAZW4gW1tUZW1wbGF0ZUVuZ2luZV1dIGdsb2JhbCBzZXR0bmcgb3B0aW9uc1xuICogQGphIFtbVGVtcGxhdGVFbmdpbmVdXSDjgrDjg63jg7zjg5Djg6voqK3lrprjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUdsb2JhbFNldHRpbmdzIHtcbiAgICB3cml0ZXI/OiBUZW1wbGF0ZVdyaXRlcjtcbiAgICB0YWdzPzogVGVtcGxhdGVEZWxpbWl0ZXJzO1xuICAgIGVzY2FwZT86IFRlbXBsYXRlRXNjYXBlcjtcbn1cblxuLyoqXG4gKiBAZW4gW1tUZW1wbGF0ZUVuZ2luZV1dIGNvbXBpbGUgb3B0aW9uc1xuICogQGphIFtbVGVtcGxhdGVFbmdpbmVdXSDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zIHtcbiAgICB0YWdzPzogVGVtcGxhdGVEZWxpbWl0ZXJzO1xufVxuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZUVuZ2luZSB1dGlsaXR5IGNsYXNzLlxuICogQGphIFRlbXBsYXRlRW5naW5lIOODpuODvOODhuOCo+ODquODhuOCo+OCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVFbmdpbmUgaW1wbGVtZW50cyBJVGVtcGxhdGVFbmdpbmUge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIHN0YXRpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBbW0pTVF1dIGZyb20gdGVtcGxhdGUgc291cmNlLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJfjgYvjgokgW1tKU1RdXSDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0ZW1wbGF0ZVxuICAgICAqICAtIGBlbmAgdGVtcGxhdGUgc291cmNlIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI5paH5a2X5YiXXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbXBpbGUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44Kz44Oz44OR44Kk44Or44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjb21waWxlKHRlbXBsYXRlOiBzdHJpbmcsIG9wdGlvbnM/OiBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zKTogSlNUIHtcbiAgICAgICAgaWYgKCFpc1N0cmluZyh0ZW1wbGF0ZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEludmFsaWQgdGVtcGxhdGUhIHRoZSBmaXJzdCBhcmd1bWVudCBzaG91bGQgYmUgYSBcInN0cmluZ1wiIGJ1dCBcIiR7dHlwZVN0cmluZyh0ZW1wbGF0ZSl9XCIgd2FzIGdpdmVuIGZvciBUZW1wbGF0ZUVuZ2luZS5jb21waWxlKHRlbXBsYXRlLCBvcHRpb25zKWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyB0YWdzIH0gPSBvcHRpb25zIHx8IGdsb2JhbFNldHRpbmdzO1xuICAgICAgICBjb25zdCB7IHdyaXRlciB9ID0gZ2xvYmFsU2V0dGluZ3M7XG5cbiAgICAgICAgY29uc3QganN0ID0gKHZpZXc/OiBQbGFpbk9iamVjdCwgcGFydGlhbHM/OiBQbGFpbk9iamVjdCk6IHN0cmluZyA9PiB7XG4gICAgICAgICAgICByZXR1cm4gd3JpdGVyLnJlbmRlcih0ZW1wbGF0ZSwgdmlldyB8fCB7fSwgcGFydGlhbHMsIHRhZ3MpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHsgdG9rZW5zLCBjYWNoZUtleSB9ID0gd3JpdGVyLnBhcnNlKHRlbXBsYXRlLCB0YWdzKTtcbiAgICAgICAganN0LnRva2VucyAgICAgICAgPSB0b2tlbnM7XG4gICAgICAgIGpzdC5jYWNoZUtleSAgICAgID0gY2FjaGVLZXk7XG4gICAgICAgIGpzdC5jYWNoZUxvY2F0aW9uID0gW0NhY2hlTG9jYXRpb24uTkFNRVNQQUNFLCBDYWNoZUxvY2F0aW9uLlJPT1RdO1xuXG4gICAgICAgIHJldHVybiBqc3Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFycyBhbGwgY2FjaGVkIHRlbXBsYXRlcyBpbiB0aGUgZGVmYXVsdCBbW1RlbXBsYXRlV3JpdGVyXV0uXG4gICAgICogQGphIOaXouWumuOBriBbW1RlbXBsYXRlV3JpdGVyXV0g44Gu44GZ44G544Gm44Gu44Kt44Oj44OD44K344Ol44KS5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjbGVhckNhY2hlKCk6IHZvaWQge1xuICAgICAgICBjbGVhckNhY2hlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoYW5nZSBbW1RlbXBsYXRlRW5naW5lXV0gZ2xvYmFsIHNldHRpbmdzLlxuICAgICAqIEBqYSBbW1RlbXBsYXRlRW5naW5lXV0g44Kw44Ot44O844OQ44Or6Kit5a6a44Gu5pu05pawXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2V0dGluZ3NcbiAgICAgKiAgLSBgZW5gIG5ldyBzZXR0aW5nc1xuICAgICAqICAtIGBqYWAg5paw44GX44GE6Kit5a6a5YCkXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG9sZCBzZXR0aW5nc1xuICAgICAqICAtIGBqYWAg5Y+k44GE6Kit5a6a5YCkXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBzZXRHbG9iYWxTZXR0aW5ncyhzZXRpaW5nczogVGVtcGxhdGVHbG9iYWxTZXR0aW5ncyk6IFRlbXBsYXRlR2xvYmFsU2V0dGluZ3Mge1xuICAgICAgICBjb25zdCBvbGRTZXR0aW5ncyA9IHsgLi4uZ2xvYmFsU2V0dGluZ3MgfTtcbiAgICAgICAgY29uc3QgeyB3cml0ZXIsIHRhZ3MsIGVzY2FwZSB9ID0gc2V0aWluZ3M7XG4gICAgICAgIHdyaXRlciAmJiAoZ2xvYmFsU2V0dGluZ3Mud3JpdGVyID0gd3JpdGVyKTtcbiAgICAgICAgdGFncyAgICYmIChnbG9iYWxTZXR0aW5ncy50YWdzICAgPSB0YWdzKTtcbiAgICAgICAgZXNjYXBlICYmIChnbG9iYWxTZXR0aW5ncy5lc2NhcGUgPSBlc2NhcGUpO1xuICAgICAgICByZXR1cm4gb2xkU2V0dGluZ3M7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIHN0YXRpYyBtZXRob2RzOiBmb3IgZGVidWdcblxuICAgIC8qKiBAaW50ZXJuYWwgQ3JlYXRlIFtbVGVtcGxhdGVTY2FubmVyXV0gaW5zdGFuY2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZVNjYW5uZXIoc3JjOiBzdHJpbmcpOiBUZW1wbGF0ZVNjYW5uZXIge1xuICAgICAgICByZXR1cm4gbmV3IFNjYW5uZXIoc3JjKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIENyZWF0ZSBbW1RlbXBsYXRlQ29udGV4dF1dIGluc3RhbmNlICovXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGVDb250ZXh0KHZpZXc6IFBsYWluT2JqZWN0LCBwYXJlbnRDb250ZXh0PzogQ29udGV4dCk6IFRlbXBsYXRlQ29udGV4dCB7XG4gICAgICAgIHJldHVybiBuZXcgQ29udGV4dCh2aWV3LCBwYXJlbnRDb250ZXh0KTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIENyZWF0ZSBbW1RlbXBsYXRlV3JpdGVyXV0gaW5zdGFuY2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZVdyaXRlcigpOiBUZW1wbGF0ZVdyaXRlciB7XG4gICAgICAgIHJldHVybiBuZXcgV3JpdGVyKCk7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbImlzTnVtYmVyIiwiX3Rva2VucyIsIl9wcm94eUhhbmRsZXIiLCJjYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7O0lB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S0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNuQyxJQUFJLFdBQVcsS0FBSyxHQUFHLEVBQUU7SUFDckIsZ0JBQUEsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUMxQixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzlDLGdCQUFBLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDO0lBQ2xFLGFBQUE7SUFDSixTQUFBO0lBQ0osS0FBQTtJQUFNLFNBQUE7SUFDSCxRQUFBLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxFQUFFO2dCQUN0QixJQUFJLFdBQVcsS0FBSyxHQUFHLEVBQUU7SUFDckIsZ0JBQUEsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUMxQixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzlDLGdCQUFBLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDO0lBQ2xFLGFBQUE7SUFDSixTQUFBO0lBQ0osS0FBQTtJQUNELElBQUEsT0FBTyxHQUFHLENBQUM7SUFDZixDQUFDO0lBV2UsU0FBQSxTQUFTLENBQUMsTUFBZSxFQUFFLEdBQUcsT0FBa0IsRUFBQTtRQUM1RCxJQUFJLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDcEIsSUFBQSxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRTtJQUMxQixRQUFBLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2xDLEtB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QUUsSUFBSSxJQUFJLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDL0QsU0FBQyxDQUFDO0lBRUYsUUFBQSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFELFFBQUEsR0FBRyxDQUFDLE1BQU0sR0FBVSxNQUFNLENBQUM7SUFDM0IsUUFBQSxHQUFHLENBQUMsUUFBUSxHQUFRLFFBQVEsQ0FBQztJQUM3QixRQUFBLEdBQUcsQ0FBQyxhQUFhLEdBQUcsQ0FBQSxhQUFBLGdDQUFBLGdCQUFBLDBCQUE2QyxDQUFDO0lBRWxFLFFBQUEsT0FBTyxHQUFHLENBQUM7SUFDZCxLQUFBO0lBRUQ7OztJQUdHO0lBQ0ksSUFBQSxPQUFPLFVBQVUsR0FBQTtJQUNwQixRQUFBLFVBQVUsRUFBRSxDQUFDO0lBQ2hCLEtBQUE7SUFFRDs7Ozs7Ozs7OztJQVVHO1FBQ0ksT0FBTyxpQkFBaUIsQ0FBQyxRQUFnQyxFQUFBO0lBQzVELFFBQUEsTUFBTSxXQUFXLEdBQUcsRUFBRSxHQUFHLGNBQWMsRUFBRSxDQUFDO1lBQzFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQztJQUMxQyxRQUFBLE1BQU0sS0FBSyxjQUFjLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQzNDLFFBQUEsSUFBSSxLQUFPLGNBQWMsQ0FBQyxJQUFJLEdBQUssSUFBSSxDQUFDLENBQUM7SUFDekMsUUFBQSxNQUFNLEtBQUssY0FBYyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQztJQUMzQyxRQUFBLE9BQU8sV0FBVyxDQUFDO0lBQ3RCLEtBQUE7Ozs7UUFNTSxPQUFPLGFBQWEsQ0FBQyxHQUFXLEVBQUE7SUFDbkMsUUFBQSxPQUFPLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzNCLEtBQUE7O0lBR00sSUFBQSxPQUFPLGFBQWEsQ0FBQyxJQUFpQixFQUFFLGFBQXVCLEVBQUE7SUFDbEUsUUFBQSxPQUFPLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztJQUMzQyxLQUFBOztJQUdNLElBQUEsT0FBTyxZQUFZLEdBQUE7WUFDdEIsT0FBTyxJQUFJLE1BQU0sRUFBRSxDQUFDO0lBQ3ZCLEtBQUE7SUFDSjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvbGliLWNvcmUvIn0=
