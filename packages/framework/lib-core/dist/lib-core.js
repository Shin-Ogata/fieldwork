/*!
 * @cdp/lib-core 0.9.17
 *   core library collection
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}));
})(this, (function (exports) { 'use strict';

    /*!
     * @cdp/core-utils 0.9.17
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
        let root = (parent ?? getGlobal());
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
     * @en Check the value-type is {@link Nullish}.
     * @ja {@link Nullish} 型であるか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isNullish(x) {
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
    const isArray = Array.isArray;
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
     * @en Check the value-type is {@link PlainObject}.
     * @ja {@link PlainObject} 型であるか判定
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
        for (const name in x) {
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
        return !isNullish(x) && !isBoolean(x) && !isArray(x) && !isSymbol(x) && ('' !== x) && !Number.isNaN(Number(x));
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
     * @en Check the value is one of {@link TypedArray}.
     * @ja 指定したインスタンスが {@link TypedArray} の一種であるか判定
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
        notNullish: (x, message) => {
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
     * @en Set by specifying key and value for the object. (prototype pollution countermeasure)
     * @ja オブジェクトに key, value を指定して設定 (プロトタイプ汚染対策)
     */
    function assignValue(target, key, value) {
        if ('__proto__' !== key && 'constructor' !== key) {
            target[key] = value;
        }
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
    /** @internal merge object property */
    function mergeObjectProperty(target, source, key) {
        if ('__proto__' !== key && 'constructor' !== key) {
            const oldValue = target[key];
            const newValue = merge(oldValue, source[key]);
            !needUpdate(oldValue, newValue, true) || (target[key] = newValue);
        }
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
                mergeObjectProperty(obj, source, key);
            }
        }
        else {
            for (const key in source) {
                mergeObjectProperty(obj, source, key);
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
        try {
            if (null == target[key]) {
                Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
            }
        }
        catch {
            // noop
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
        const behaviour = method ?? (null === method ? undefined : ((i) => Object.prototype.isPrototypeOf.call(target.prototype, i)));
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
        class _MixinBase extends base {
            [_constructors];
            [_classBase];
            constructor(...args) {
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
                    return orgInstanceOf.call(srcClass, inst) || ((inst?.[_isInherited]) ? inst[_isInherited](srcClass) : false);
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
            key in target && assignValue(obj, key, target[key]);
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
            !omitKeys.includes(key) && assignValue(obj, key, target[key]);
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
            assignValue(result, target[key], key);
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
                assignValue(retval, key, src[key]);
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

    /* eslint-disable
        @typescript-eslint/no-explicit-any,
     */
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
    const setTimeout = safe(_root.setTimeout).bind(_root);
    const clearTimeout = safe(_root.clearTimeout).bind(_root);
    const setInterval = safe(_root.setInterval).bind(_root);
    const clearInterval = safe(_root.clearInterval).bind(_root);

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
     * @en Returns a function, that, as long as it continues to be invoked, will not be triggered.
     * @ja 呼び出されてから wait [msec] 経過するまで実行しない関数を返却
     *
     * @param executor
     *  - `en` seed function.
     *  - `ja` 対象の関数
     * @param wait
     *  - `en` wait elapse [msec].
     *  - `ja` 待機時間 [msec]
     * @param options
     *  - `en` specify {@link DebounceOptions} object or `true` to fire the callback immediately.
     *  - `ja` {@link DebounceOptions} object もしくは即時にコールバックを発火するときは `true` を指定.
     */
    function debounce(executor, wait, options) {
        let lastArgs;
        let lastThis;
        let result;
        let lastCallTime;
        let timerId;
        let lastInvokeTime = 0;
        const waitValue = Number(wait) || 0;
        const opts = Object.assign({ leading: false, trailing: true }, (isBoolean(options) ? { leading: options, trailing: !options } : options));
        const { leading, trailing } = opts;
        const maxWait = null != opts.maxWait ? Math.max(Number(opts.maxWait) || 0, waitValue) : null;
        const invokeFunc = (time) => {
            const args = lastArgs;
            const thisArg = lastThis;
            lastArgs = lastThis = undefined;
            lastInvokeTime = time;
            result = executor.apply(thisArg, args);
            return result;
        };
        const remainingWait = (time) => {
            const timeSinceLastCall = time - lastCallTime;
            const timeSinceLastInvoke = time - lastInvokeTime;
            const timeWaiting = waitValue - timeSinceLastCall;
            return null != maxWait ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;
        };
        const shouldInvoke = (time) => {
            if (undefined === lastCallTime) {
                return true;
            }
            const timeSinceLastCall = time - lastCallTime;
            const timeSinceLastInvoke = time - lastInvokeTime;
            return timeSinceLastCall >= waitValue || timeSinceLastCall < 0 || (maxWait !== null && timeSinceLastInvoke >= maxWait);
        };
        const trailingEdge = (time) => {
            timerId = undefined;
            if (trailing && lastArgs) {
                return invokeFunc(time);
            }
            lastArgs = lastThis = undefined;
            return result;
        };
        const timerExpired = () => {
            const time = Date.now();
            if (shouldInvoke(time)) {
                return trailingEdge(time);
            }
            timerId = setTimeout(timerExpired, remainingWait(time));
        };
        const leadingEdge = (time) => {
            lastInvokeTime = time;
            timerId = setTimeout(timerExpired, waitValue);
            return leading ? invokeFunc(time) : result;
        };
        const cancel = () => {
            if (undefined !== timerId) {
                clearTimeout(timerId);
            }
            lastInvokeTime = 0;
            lastArgs = lastCallTime = lastThis = timerId = undefined;
        };
        const flush = () => {
            return undefined === timerId ? result : trailingEdge(Date.now());
        };
        const pending = () => {
            return null != timerId;
        };
        function debounced(...args) {
            const time = Date.now();
            const isInvoking = shouldInvoke(time);
            lastArgs = args;
            lastThis = this; // eslint-disable-line no-invalid-this, @typescript-eslint/no-this-alias
            lastCallTime = time;
            if (isInvoking) {
                if (null == timerId) {
                    return leadingEdge(lastCallTime);
                }
                if (maxWait) {
                    timerId = setTimeout(timerExpired, waitValue);
                    return invokeFunc(lastCallTime);
                }
            }
            if (null == timerId) {
                timerId = setTimeout(timerExpired, waitValue);
            }
            return result;
        }
        debounced.cancel = cancel;
        debounced.flush = flush;
        debounced.pending = pending;
        return debounced;
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
        const { leading, trailing } = Object.assign({ leading: true, trailing: true }, options);
        return debounce(executor, elapse, {
            leading,
            trailing,
            maxWait: elapse,
        });
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
        /* eslint-disable no-invalid-this */
        let memo;
        return function (...args) {
            if (executor) {
                memo = executor.call(this, ...args);
                executor = null;
            }
            return memo;
        };
        /* eslint-enable no-invalid-this */
    }
    /**
     * @en Return a deferred executable function object.
     * @ja 遅延実行可能な関数オブジェクトを返却
     *
     * @example <br>
     *
     * ```ts
     * const schedule = scheduler();
     * schedule(() => task1());
     * schedule(() => task2());
     * ```
     */
    function scheduler() {
        let tasks = [];
        let id;
        function runTasks() {
            id = null;
            const work = tasks;
            tasks = [];
            for (const task of work) {
                task();
            }
        }
        return function (task) {
            tasks.push(task);
            if (null == id) {
                id = post(runTasks);
            }
        };
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
     * @en Convert to string from {@link TypedData}.
     * @ja {@link TypedData} を文字列に変換
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
    function dropUndefined(value, nullishSerialize = false) {
        return value ?? (nullishSerialize ? String(value) : null);
    }
    /**
     * @en Deserialize from `Web API` stocked type. <br>
     *     Convert from 'null' or 'undefined' string to original type.
     * @ja 'null' or 'undefined' をもとの型に戻す
     */
    function restoreNullish(value) {
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
    function isCancelLikeError(error) {
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
        const _groupKey = groupKey ?? 'items';
        const _sumKeys = sumKeys ?? [];
        _sumKeys.push(_groupKey);
        const hash = array.reduce((res, data) => {
            // create groupBy internal key
            const _key = keys.reduce((s, k) => s + String(data[k]), '');
            // init keys
            if (!(_key in res)) {
                const keyList = keys.reduce((h, k) => {
                    assignValue(h, k, data[k]);
                    return h;
                }, {});
                res[_key] = _sumKeys.reduce((h, k) => {
                    h[k] = 0;
                    return h;
                }, keyList);
            }
            const resKey = res[_key]; // eslint-disable-line @typescript-eslint/no-explicit-any
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
     * @en Calculate from the date which becomes a cardinal point before a N date time or after a N date time (by {@link DateUnit}).
     * @ja 基点となる日付から、N日後、N日前を算出
     *
     * @param base
     *  - `en` base date time.
     *  - `ja` 基準日
     * @param add
     *  - `en` relative date time.
     *  - `ja` 加算日. マイナス指定でn日前も設定可能
     * @param unit {@link DateUnit}
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

    const _status = {};
    /**
     * @en Increment reference count for status identifier.
     * @ja 状態変数の参照カウントのインクリメント
     *
     * @param status
     *  - `en` state identifier
     *  - `ja` 状態識別子
     * @returns
     *  - `en` reference count value
     *  - `ja` 参照カウントの値
     */
    function statusAddRef(status) {
        if (!_status[status]) {
            _status[status] = 1;
        }
        else {
            _status[status]++;
        }
        return _status[status];
    }
    /**
     * @en Decrement reference count for status identifier.
     * @ja 状態変数の参照カウントのデクリメント
     *
     * @param status
     *  - `en` state identifier
     *  - `ja` 状態識別子
     * @returns
     *  - `en` reference count value
     *  - `ja` 参照カウントの値
     */
    function statusRelease(status) {
        if (!_status[status]) {
            return 0;
        }
        else {
            const retval = --_status[status];
            if (0 === retval) {
                delete _status[status];
            }
            return retval;
        }
    }
    /**
     * @en State variable management scope
     * @ja 状態変数管理スコープ
     *
     * @param status
     *  - `en` state identifier
     *  - `ja` 状態識別子
     * @param executor
     *  - `en` seed function.
     *  - `ja` 対象の関数
     * @returns
     *  - `en` retval of seed function.
     *  - `ja` 対象の関数の戻り値
     */
    async function statusScope(status, executor) {
        try {
            statusAddRef(status);
            return await executor();
        }
        finally {
            statusRelease(status);
        }
    }
    /**
     * @en Check if it's in the specified state.
     * @ja 指定した状態中であるか確認
     *
     * @param status
     *  - `en` state identifier
     *  - `ja` 状態識別子
     * @return {Boolean} true: 状態内 / false: 状態外
     * @returns
     *  - `en` `true`: within the status / `false`: out of the status
     *  - `ja` `true`: 状態内 / `false`: 状態外
     */
    function isStatusIn(status) {
        return !!_status[status];
    }

    /*!
     * @cdp/events 0.9.17
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
     * import { EventPublisher } from '@cdp/runtime';
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
                map.has(ch) ? map.get(ch).add(listener) : map.set(ch, new Set([listener]));
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
     * @en Constructor of {@link EventBroker}
     * @ja {@link EventBroker} のコンストラクタ実体
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
            const listenerMap = context.map.get(target) ?? new Map();
            const map = listenerMap.get(ch) ?? new Map();
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
     * import { EventReceiver, EventBroker } from '@cdp/runtime';
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
        /** @internal */
        [_context];
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
    /** @internal {@link EventSource} class */
    class EventSource extends mixins(EventBroker, EventReceiver) {
        constructor() {
            super();
            this.super(EventReceiver);
        }
    }
    /**
     * @en Constructor of {@link EventSource}
     * @ja {@link EventSource} のコンストラクタ実体
     */
    const _EventSource = EventSource;

    /*!
     * @cdp/promise 0.9.17
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
     * import { CancelToken } from '@cdp/runtime';
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
         * @en Create {@link CancelTokenSource} instance.
         * @ja {@link CancelTokenSource} インスタンスの取得
         *
         * @param linkedTokens
         *  - `en` relating already made {@link CancelToken} instance.
         *        You can attach to the token that to be a cancellation target.
         *  - `ja` すでに作成された {@link CancelToken} 関連付ける場合に指定
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
         *  - `en` relating already made {@link CancelToken} instance.
         *        You can attach to the token that to be a cancellation target.
         *  - `ja` すでに作成された {@link CancelToken} 関連付ける場合に指定
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
            verify('notNullish', reason);
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
    /**
     * @en `Native Promise` constructor <br>
     *     Can be used as an alias for `Native Promise`.
     * @ja `Native Promise` コンストラクタ <br>
     *     `Native Promise` のエイリアスとして使用可能
     */
    const NativePromise = Promise;
    /** @internal */ const nativeThen = NativePromise.prototype.then;
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
         *  - `en` {@link CancelToken} instance create from {@link CancelToken.source | CancelToken.source}().
         *  - `ja` {@link CancelToken.source | CancelToken.source}() より作成した {@link CancelToken} インスタンスを指定
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
         *  - `en` {@link CancelToken} instance create from {@link CancelToken.source | CancelToken.source}().
         *  - `ja` {@link CancelToken.source | CancelToken.source}() より作成した {@link CancelToken} インスタンスを指定
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
     * @en Switch the global `Promise` constructor `Native Promise` or {@link CancelablePromise}. <br>
     *     `Native Promise` constructor is overridden by framework default behaviour.
     * @ja グローバル `Promise` コンストラクタを `Native Promise` または {@link CancelablePromise} に切り替え <br>
     *     既定で `Native Promise` をオーバーライドする.
     *
     * @param enable
     *  - `en` `true`: use {@link CancelablePromise} /  `false`: use `Native Promise`
     *  - `ja` `true`: {@link CancelablePromise} を使用 / `false`: `Native Promise` を使用
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
     *  - `en` {@link CancelToken} reference. (enable `undefined`)
     *  - `ja` {@link CancelToken} を指定 (undefined 可)
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
     * import { checkStatus } from '@cdp/runtime';
     *
     * let promise: Promise<unknown>; // some promise instance
     * :
     * const status = await checkStatus(promise);
     * console.log(status);
     * // 'pending' or 'fulfilled' or 'rejected'
     * ```
     *
     * @param promise
     *  - `en` Promise instance
     *  - `ja` Promise インスタンスを指定
     */
    function checkStatus(promise) {
        const pending = {};
        /*
         * Promise 派生クラスでも使用するためには, `instance.constructor.race` でアクセスする必要がある
         * promise が派生クラスである場合, Promise.race() を使用すると必ず `pending` object が返されてしまう
         */
        return promise.constructor.race([promise, pending])
            .then(v => (v === pending) ? 'pending' : 'fulfilled', () => 'rejected');
    }

    /**
     * @internal
     * Promise のクラス拡張は then chain を適切に管理するための作法が存在し、基本的には以下の3つの方針がある
     * - 1. executor を引数にとる constructor を提供する
     * - 2. static get [Symbol.species]() { return NativePromise; } を提供する
     * - 3. Deferred.prototype.constructor = NativePromise のように prototype.constructor を上書きする (Hacking)
     *
     * `Deferred` クラスでは以下の理由により, `1`, `2` の対応を行う.
     * - checkStatus() を Promise 派生クラスでも使用するためには, `instance.constructor.race` でアクセスする必要がある
     *   - `TypeError: Promise resolve or reject function is not callable` 対策のための `1`
     * - `then`, `catch`, `finaly` 時に生成されるインスタンスは `Deferred` である必要は無いため `2`
     *
     * @see https://stackoverflow.com/questions/48158730/extend-javascript-promise-and-resolve-or-reject-it-inside-constructor
     */
    const resolveArgs = (arg1, arg2) => {
        if (isFunction(arg1)) {
            return [arg1, arg2];
        }
        else {
            return [noop, arg1];
        }
    };
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
        resolve;
        reject;
        constructor(arg1, arg2) {
            const [executor, cancelToken] = resolveArgs(arg1, arg2);
            const publications = {};
            super((resolve, reject) => {
                Object.assign(publications, { resolve, reject });
                executor(resolve, reject);
            }, cancelToken);
            Object.assign(this, publications); // eslint-disable-line @typescript-eslint/no-floating-promises
        }
        /**
         * @en Check the status of this instance. <br>
         *     It's practicable by `async function`.
         * @ja Deferred インスタンスの状態を確認 <br>
         *     `async function` で使用可能
         */
        status() {
            return checkStatus(this);
        }
        /** @internal */
        get [Symbol.toStringTag]() { return 'Deferred'; }
        /** @internal */
        static get [Symbol.species]() { return NativePromise; }
    }

    /**
     * @en The class manages lumping multiple `Promise` objects. <br>
     *     It's possible to make them cancel more than one `Promise` which handles different {@link CancelToken} by lumping.
     * @ja 複数 `Promise` オブジェクトを一括管理するクラス <br>
     *     異なる {@link CancelToken} を扱う複数の `Promise` を一括でキャンセルさせることが可能
     */
    class PromiseManager {
        // eslint-disable-next-line func-call-spacing
        _pool = new Map();
        /**
         * @en Add a `Promise` object under the management.
         * @ja `Promise` オブジェクトを管理下に追加
         *
         * @param promise
         *  - `en` any `Promise` instance is available.
         *  - `ja` 任意の `Promise` インスタンス
         * @param cancelSource
         *  - `en` {@link CancelTokenSource} instance made by {@link CancelToken.source | CancelToken.source}().
         *  - `ja` {@link CancelToken.source | CancelToken.source}() で生成される {@link CancelTokenSource} インスタンス
         * @returns
         *  - `en` return the same instance of input `promise` instance.
         *  - `ja` 入力した `promise` と同一インスタンスを返却
         */
        add(promise, cancelSource) {
            this._pool.set(promise, cancelSource?.cancel); // eslint-disable-line @typescript-eslint/unbound-method
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
         *     Wait for all `fulfilled`.
         * @ja 管理対象に対して `Promise.all()` <br>
         *     すべてが `fulfilled` になるまで待機
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
         * @en Call {@link wait}() for under the management. <br>
         *     Wait for all `settled`. (simplified version)
         * @ja 管理対象に対して {@link wait}() <br>
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
         *     Wait for any `fulfilled`.
         * @ja 管理対象に対して `Promise.any()` <br>
         *     いずれかが `fulfilled` になるまで待機
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
         *  - `ja` キャンセル完了まで待機する `Promise` インスタンス
         */
        abort(reason) {
            for (const canceler of this._pool.values()) {
                if (canceler) {
                    canceler(reason ?? new Error('abort'));
                }
            }
            return wait(this.promises());
        }
    }

    /*!
     * @cdp/observable 0.9.17
     *   observable utility module
     */


    /** @internal EventBrokerProxy */
    class EventBrokerProxy {
        _broker;
        get() {
            return this._broker ?? (this._broker = new EventBroker());
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
     * @en Check the value-type is {@link IObservable}.
     * @ja {@link IObservable} 型であるか判定
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
         *  - `en` initial state. default: {@link ObservableState.ACTIVE | ObservableState.ACTIVE}
         *  - `ja` 初期状態 既定: {@link ObservableState.ACTIVE | ObservableState.ACTIVE}
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
         *  - `en` `true`: not recording property changes and clear changes. / `false`: property changes are recorded and fired when {@link resume}() callded. (default)
         *  - `ja` `true`: プロパティ変更も記録せず, 現在の記録も破棄 / `false`: プロパティ変更は記録され, {@link resume}() 時に発火する (既定)
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
         * @en Create {@link ObservableObject} from any object.
         * @ja 任意のオブジェクトから {@link ObservableObject} を生成
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
         *  - `en` `true`: not recording property changes and clear changes. / `false`: property changes are recorded and fired when {@link resume}() callded. (default)
         *  - `ja` `true`: プロパティ変更も記録せず, 現在の記録も破棄 / `false`: プロパティ変更は記録され, {@link resume}() 時に発火する (既定)
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
     * @cdp/result 0.9.17
     *   result utility module
     */


    /* eslint-disable
        no-inner-declarations,
        @typescript-eslint/no-namespace,
        @typescript-eslint/no-unused-vars,
        @typescript-eslint/no-duplicate-enum-values,
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
         * @en Assign declared {@link RESULT_CODE} to root enumeration.
         *     (It's enable to merge enum in the module system environment.)
         * @ja 拡張した {@link RESULT_CODE} を ルート enum にアサイン
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
         *  - `en` set base offset as {@link RESULT_CODE_BASE}
         *  - `ja` オフセット値を {@link RESULT_CODE_BASE} として指定
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
         *  - `en` set base offset as {@link RESULT_CODE_BASE}
         *  - `ja` オフセット値を {@link RESULT_CODE_BASE} として指定
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
        /** @internal register for {@link RESULT_CODE} */
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
     * @param code {@link RESULT_CODE}
     * @returns true: fail result / false: success result
     */
    function FAILED(code) {
        return code < 0;
    }
    /**
     * @en Judge success or not.
     * @ja 成功判定
     *
     * @param code {@link RESULT_CODE}
     * @returns true: success result / false: fail result
     */
    function SUCCEEDED(code) {
        return !FAILED(code);
    }
    /**
     * @en Convert to {@link RESULT_CODE} `name` string from {@link RESULT_CODE}.
     * @ja {@link RESULT_CODE} を {@link RESULT_CODE} 文字列に変換
     *
     * @param code {@link RESULT_CODE}
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
     * @en Convert to help string from {@link RESULT_CODE}.
     * @ja {@link RESULT_CODE} をヘルプストリングに変換
     *
     * @param code {@link RESULT_CODE}
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
         * @param options
         *  - `en` error construction options
         *  - `ja` エラー構築オプション
         */
        constructor(code, message, options) {
            code = isNullish(code) ? RESULT_CODE.SUCCESS : isNumber(code) ? Math.trunc(code) : RESULT_CODE.FAIL;
            super(message ?? toHelpString(code), options);
            const cause = options?.cause;
            let time = isError(cause) ? cause.time : undefined;
            isNumber(time) || (time = Date.now());
            Object.defineProperties(this, { code: desc(code), time: desc(time), cause: desc(cause) });
        }
        /**
         * @en {@link RESULT_CODE} value.
         * @ja {@link RESULT_CODE} の値
         */
        code;
        /**
         * @en Generated time information.
         * @ja 生成された時刻情報
         */
        time;
        /**
         * @en Stock low-level error information.
         * @ja 下位のエラー情報を格納
         */
        cause;
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
         * @en Get formatted {@link RESULT_CODE} name string.
         * @ja フォーマットされた {@link RESULT_CODE} 名文字列を取得
         */
        get codeName() {
            return toNameString(this.code, this.name);
        }
        /**
         * @en Get {@link RESULT_CODE} help string.
         * @ja {@link RESULT_CODE} のヘルプストリングを取得
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
     * @en Convert to {@link Result} object.
     * @ja {@link Result} オブジェクトに変換
     */
    function toResult(o) {
        if (o instanceof Result) {
            /* eslint-disable-next-line prefer-const */
            let { code, cause, time } = o;
            code = isNullish(code) ? RESULT_CODE.SUCCESS : isNumber(code) ? Math.trunc(code) : RESULT_CODE.FAIL;
            isNumber(time) || (time = Date.now());
            // Do nothing if already defined
            Reflect.defineProperty(o, 'code', desc(code));
            Reflect.defineProperty(o, 'time', desc(time));
            Reflect.defineProperty(o, 'cause', desc(cause));
            return o;
        }
        else {
            const e = Object(o);
            const message = isString(e.message) ? e.message : isString(o) ? o : undefined;
            const code = isCancelLikeError(message) ? RESULT_CODE.ABORT : isNumber(e.code) ? e.code : o;
            const cause = isError(e.cause) ? e.cause : isError(o) ? o : isString(o) ? new Error(o) : o;
            return new Result(code, message, { cause });
        }
    }
    /**
     * @en Create {@link Result} helper.
     * @ja {@link Result} オブジェクト構築ヘルパー
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
        return new Result(code, message, { cause });
    }
    /**
     * @en Create canceled {@link Result} helper.
     * @ja キャンセル情報格納 {@link Result} オブジェクト構築ヘルパー
     *
     * @param message
     *  - `en` result info message
     *  - `ja` 結果情報メッセージ
     * @param cause
     *  - `en` low-level error information
     *  - `ja` 下位のエラー情報
     */
    function makeCanceledResult(message, cause) {
        return new Result(RESULT_CODE.ABORT, message, { cause });
    }

    /*!
     * @cdp/core-storage 0.9.17
     *   core storage utility module
     */


    //__________________________________________________________________________________________________//
    /**
     * @en Memory storage class. This class doesn't support permaneciation data.
     * @ja メモリーストレージクラス. 本クラスはデータの永続化をサポートしない
     */
    class MemoryStorage {
        /** @internal */
        _broker = new EventBroker();
        /** @internal */
        _storage = {};
        ///////////////////////////////////////////////////////////////////////
        // implements: IStorage
        /**
         * @en {@link IStorage} kind signature.
         * @ja {@link IStorage} の種別を表す識別子
         */
        get kind() {
            return 'memory';
        }
        async getItem(key, options) {
            options = options ?? {};
            await checkCanceled(options.cancel);
            // `undefined` → `null`
            const value = dropUndefined(this._storage[key]);
            switch (options.dataType) {
                case 'string':
                    return fromTypedData(value);
                case 'number':
                    return Number(restoreNullish(value));
                case 'boolean':
                    return Boolean(restoreNullish(value));
                case 'object':
                    return Object(restoreNullish(value));
                default:
                    return restoreNullish(value);
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
            options = options ?? {};
            await checkCanceled(options.cancel);
            const newVal = dropUndefined(value, true); // `null` or `undefined` → 'null' or 'undefined'
            const oldVal = dropUndefined(this._storage[key]); // `undefined` → `null`
            if (!deepEqual(oldVal, newVal)) {
                assignValue(this._storage, key, newVal);
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
            options = options ?? {};
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
            options = options ?? {};
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
            await checkCanceled(options?.cancel);
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
     * @en Registry management class for synchronous Read/Write accessible from any {@link IStorage} object.
     * @ja 任意の {@link IStorage} オブジェクトから同期 Read/Write アクセス可能なレジストリ管理クラス
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
     * import { webStorage } from '@cdp/runtime';
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
        /** @internal */
        _storage;
        /** @internal */
        _rootKey;
        /** @internal */
        _defaultOptions;
        /** @internal */
        _store = {};
        /**
         * constructor
         *
         * @param storage
         *  - `en` Root key for {@link IStorage}.
         *  - `ja` {@link IStorage} に使用するルートキー
         * @param rootKey
         *  - `en` Root key for {@link IStorage}.
         *  - `ja` {@link IStorage} に使用するルートキー
         * @param formatSpace
         *  - `en` for JSON format space.
         *  - `ja` JSON フォーマットスペースを指定
         */
        constructor(storage, rootKey, formatSpace) {
            super();
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
         * @en Access to {@link IStorage} object.
         * @ja {@link IStorage} オブジェクトを取得
         */
        get storage() {
            return this._storage;
        }
        ///////////////////////////////////////////////////////////////////////
        // public methods:
        /**
         * @en Read persistence data from {@link IStorage}. The data loaded already will be cleared.
         * @ja {@link IStorage} から永続化したデータを読み込み. すでにキャッシュされているデータは破棄される
         */
        async load(options) {
            options = options ?? {};
            this._store = (await this._storage.getItem(this._rootKey, options)) || {};
            if (!options.silent) {
                void post(() => this.publish('change', '*'));
            }
        }
        /**
         * @en Persist data to {@link IStorage}.
         * @ja {@link IStorage} にデータを永続化
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
            const { field } = options ?? {};
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
            const { field, noSave, silent } = options ?? {};
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
            options = options ?? {};
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
     * @cdp/core-template 0.9.17
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
        _source;
        _tail;
        _pos;
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
        _view;
        _parent;
        _cache;
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
        let _regxpTags = compileTags(tags ?? globalSettings.tags);
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
            const cacheKey = buildCacheKey(template, tags ?? globalSettings.tags);
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

    /** {@link TemplateEngine} common settings */
    globalSettings.writer = new Writer();
    /**
     * @en TemplateEngine utility class.
     * @ja TemplateEngine ユーティリティクラス
     */
    class TemplateEngine {
        ///////////////////////////////////////////////////////////////////////
        // public static methods:
        /**
         * @en Get {@link JST} from template source.
         * @ja テンプレート文字列から {@link JST} を取得
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
            const { tags } = options ?? globalSettings;
            const { writer } = globalSettings;
            const jst = (view, partials) => {
                return writer.render(template, view ?? {}, partials, tags);
            };
            const { tokens, cacheKey } = writer.parse(template, tags);
            jst.tokens = tokens;
            jst.cacheKey = cacheKey;
            jst.cacheLocation = ["CDP_DECLARE" /* CacheLocation.NAMESPACE */, "TEMPLATE_CACHE" /* CacheLocation.ROOT */];
            return jst;
        }
        /**
         * @en Clears all cached templates in the default {@link TemplateWriter}.
         * @ja 既定の {@link TemplateWriter} のすべてのキャッシュを削除
         */
        static clearCache() {
            clearCache();
        }
        /**
         * @en Change {@link TemplateEngine} global settings.
         * @ja {@link TemplateEngine} グローバル設定の更新
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
        /** @internal Create {@link TemplateScanner} instance */
        static createScanner(src) {
            return new Scanner(src);
        }
        /** @internal Create {@link TemplateContext} instance */
        static createContext(view, parentContext) {
            return new Context(view, parentContext);
        }
        /** @internal Create {@link TemplateWriter} instance */
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
    exports.EventSource = _EventSource;
    exports.FAILED = FAILED;
    exports.MemoryStorage = MemoryStorage;
    exports.NativePromise = NativePromise;
    exports.ObservableArray = ObservableArray;
    exports.ObservableObject = ObservableObject;
    exports.Promise = CancelablePromise;
    exports.PromiseManager = PromiseManager;
    exports.RESULT_CODE = RESULT_CODE;
    exports.Registry = Registry;
    exports.Result = Result;
    exports.SUCCEEDED = SUCCEEDED;
    exports.TemplateEngine = TemplateEngine;
    exports.assignValue = assignValue;
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
    exports.isCancelLikeError = isCancelLikeError;
    exports.isEmptyObject = isEmptyObject;
    exports.isFunction = isFunction;
    exports.isIterable = isIterable;
    exports.isNullish = isNullish;
    exports.isNumber = isNumber$1;
    exports.isNumeric = isNumeric;
    exports.isObject = isObject;
    exports.isObservable = isObservable;
    exports.isPlainObject = isPlainObject;
    exports.isPrimitive = isPrimitive;
    exports.isResult = isResult;
    exports.isStatusIn = isStatusIn;
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
    exports.restoreNullish = restoreNullish;
    exports.result = result;
    exports.safe = safe;
    exports.sameClass = sameClass;
    exports.sameType = sameType;
    exports.sample = sample;
    exports.scheduler = scheduler;
    exports.setInterval = setInterval;
    exports.setMixClassAttribute = setMixClassAttribute;
    exports.setTimeout = setTimeout;
    exports.shuffle = shuffle;
    exports.sleep = sleep;
    exports.some = some;
    exports.sort = sort;
    exports.statusAddRef = statusAddRef;
    exports.statusRelease = statusRelease;
    exports.statusScope = statusScope;
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

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliLWNvcmUuanMiLCJzb3VyY2VzIjpbImNvcmUtdXRpbHMvY29uZmlnLnRzIiwiY29yZS11dGlscy90eXBlcy50cyIsImNvcmUtdXRpbHMvdmVyaWZ5LnRzIiwiY29yZS11dGlscy9kZWVwLWNpcmN1aXQudHMiLCJjb3JlLXV0aWxzL21peGlucy50cyIsImNvcmUtdXRpbHMvb2JqZWN0LnRzIiwiY29yZS11dGlscy9zYWZlLnRzIiwiY29yZS11dGlscy90aW1lci50cyIsImNvcmUtdXRpbHMvbWlzYy50cyIsImNvcmUtdXRpbHMvYXJyYXkudHMiLCJjb3JlLXV0aWxzL2RhdGUudHMiLCJjb3JlLXV0aWxzL3N0YXR1cy50cyIsImV2ZW50cy9wdWJsaXNoZXIudHMiLCJldmVudHMvYnJva2VyLnRzIiwiZXZlbnRzL3JlY2VpdmVyLnRzIiwiZXZlbnRzL3NvdXJjZS50cyIsInByb21pc2UvaW50ZXJuYWwudHMiLCJwcm9taXNlL2NhbmNlbC10b2tlbi50cyIsInByb21pc2UvY2FuY2VsYWJsZS1wcm9taXNlLnRzIiwicHJvbWlzZS91dGlscy50cyIsInByb21pc2UvZGVmZXJyZWQudHMiLCJwcm9taXNlL3Byb21pc2UtbWFuYWdlci50cyIsIm9ic2VydmFibGUvaW50ZXJuYWwudHMiLCJvYnNlcnZhYmxlL2NvbW1vbi50cyIsIm9ic2VydmFibGUvb2JqZWN0LnRzIiwib2JzZXJ2YWJsZS9hcnJheS50cyIsInJlc3VsdC9yZXN1bHQtY29kZS1kZWZzLnRzIiwicmVzdWx0L3Jlc3VsdC1jb2RlLnRzIiwicmVzdWx0L3Jlc3VsdC50cyIsImNvcmUtc3RvcmFnZS9tZW1vcnktc3RvcmFnZS50cyIsImNvcmUtc3RvcmFnZS9yZWdpc3RyeS50cyIsImNvcmUtdGVtcGxhdGUvaW50ZXJuYWwudHMiLCJjb3JlLXRlbXBsYXRlL2NhY2hlLnRzIiwiY29yZS10ZW1wbGF0ZS91dGlscy50cyIsImNvcmUtdGVtcGxhdGUvc2Nhbm5lci50cyIsImNvcmUtdGVtcGxhdGUvY29udGV4dC50cyIsImNvcmUtdGVtcGxhdGUvcGFyc2UudHMiLCJjb3JlLXRlbXBsYXRlL3dyaXRlci50cyIsImNvcmUtdGVtcGxhdGUvY2xhc3MudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBVbmtub3duT2JqZWN0IH0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogQGVuIFNhZmUgYGdsb2JhbGAgYWNjZXNzb3IuXG4gKiBAamEgYGdsb2JhbGAg44Ki44Kv44K744OD44K1XG4gKiBcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIGBnbG9iYWxgIG9iamVjdCBvZiB0aGUgcnVudGltZSBlbnZpcm9ubWVudFxuICogIC0gYGphYCDnkrDlooPjgavlv5zjgZjjgZ8gYGdsb2JhbGAg44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWwoKTogdHlwZW9mIGdsb2JhbFRoaXMge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1uZXctZnVuYywgQHR5cGVzY3JpcHQtZXNsaW50L25vLWltcGxpZWQtZXZhbFxuICAgIHJldHVybiAoJ29iamVjdCcgPT09IHR5cGVvZiBnbG9iYWxUaGlzKSA/IGdsb2JhbFRoaXMgOiBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xufVxuXG4vKipcbiAqIEBlbiBFbnN1cmUgbmFtZWQgb2JqZWN0IGFzIHBhcmVudCdzIHByb3BlcnR5LlxuICogQGphIOimquOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumuOBl+OBpiwg5ZCN5YmN44Gr5oyH5a6a44GX44Gf44Kq44OW44K444Kn44Kv44OI44Gu5a2Y5Zyo44KS5L+d6Ki8XG4gKlxuICogQHBhcmFtIHBhcmVudFxuICogIC0gYGVuYCBwYXJlbnQgb2JqZWN0LiBJZiBudWxsIGdpdmVuLCBgZ2xvYmFsVGhpc2AgaXMgYXNzaWduZWQuXG4gKiAgLSBgamFgIOimquOCquODluOCuOOCp+OCr+ODiC4gbnVsbCDjga7loLTlkIjjga8gYGdsb2JhbFRoaXNgIOOBjOS9v+eUqOOBleOCjOOCi1xuICogQHBhcmFtIG5hbWVzXG4gKiAgLSBgZW5gIG9iamVjdCBuYW1lIGNoYWluIGZvciBlbnN1cmUgaW5zdGFuY2UuXG4gKiAgLSBgamFgIOS/neiovOOBmeOCi+OCquODluOCuOOCp+OCr+ODiOOBruWQjeWJjVxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlT2JqZWN0PFQgZXh0ZW5kcyBvYmplY3QgPSBVbmtub3duT2JqZWN0PihwYXJlbnQ6IG9iamVjdCB8IG51bGwsIC4uLm5hbWVzOiBzdHJpbmdbXSk6IFQge1xuICAgIGxldCByb290ID0gKHBhcmVudCA/PyBnZXRHbG9iYWwoKSkgYXMgVW5rbm93bk9iamVjdDtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgbmFtZXMpIHtcbiAgICAgICAgcm9vdFtuYW1lXSA9IHJvb3RbbmFtZV0gfHwge307XG4gICAgICAgIHJvb3QgPSByb290W25hbWVdIGFzIFVua25vd25PYmplY3Q7XG4gICAgfVxuICAgIHJldHVybiByb290IGFzIFQ7XG59XG5cbi8qKlxuICogQGVuIEdsb2JhbCBuYW1lc3BhY2UgYWNjZXNzb3IuXG4gKiBAamEg44Kw44Ot44O844OQ44Or44ON44O844Og44K544Oa44O844K544Ki44Kv44K744OD44K1XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWxOYW1lc3BhY2U8VCBleHRlbmRzIG9iamVjdCA9IFVua25vd25PYmplY3Q+KG5hbWVzcGFjZTogc3RyaW5nKTogVCB7XG4gICAgcmV0dXJuIGVuc3VyZU9iamVjdDxUPihudWxsLCBuYW1lc3BhY2UpO1xufVxuXG4vKipcbiAqIEBlbiBHbG9iYWwgY29uZmlnIGFjY2Vzc29yLlxuICogQGphIOOCsOODreODvOODkOODq+OCs+ODs+ODleOCo+OCsOOCouOCr+OCu+ODg+OCtVxuICpcbiAqIEByZXR1cm5zIGRlZmF1bHQ6IGBDRFAuQ29uZmlnYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnPFQgZXh0ZW5kcyBvYmplY3QgPSBVbmtub3duT2JqZWN0PihuYW1lc3BhY2UgPSAnQ0RQJywgY29uZmlnTmFtZSA9ICdDb25maWcnKTogVCB7XG4gICAgcmV0dXJuIGVuc3VyZU9iamVjdDxUPihnZXRHbG9iYWxOYW1lc3BhY2UobmFtZXNwYWNlKSwgY29uZmlnTmFtZSk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L2Jhbi10eXBlcyxcbiAqL1xuXG4vKipcbiAqIEBlbiBQcmltaXRpdmUgdHlwZSBvZiBKYXZhU2NyaXB0LlxuICogQGphIEphdmFTY3JpcHQg44Gu44OX44Oq44Of44OG44Kj44OW5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFByaW1pdGl2ZSA9IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBzeW1ib2wgfCBiaWdpbnQgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlbiBUaGUgZ2VuZXJhbCBudWxsIHR5cGUuXG4gKiBAamEg56m644KS56S644GZ5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIE51bGxpc2ggPSB2b2lkIHwgbnVsbCB8IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBAZW4gVGhlIHR5cGUgb2Ygb2JqZWN0IG9yIHtAbGluayBOdWxsaXNofS5cbiAqIEBqYSB7QGxpbmsgTnVsbGlzaH0g44Gr44Gq44KK44GI44KL44Kq44OW44K444Kn44Kv44OI5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIE51bGxhYmxlPFQgZXh0ZW5kcyBvYmplY3Q+ID0gVCB8IE51bGxpc2g7XG5cbi8qKlxuICogQGVuIEF2b2lkIHRoZSBgRnVuY3Rpb25gdHlwZXMuXG4gKiBAamEg5rGO55So6Zai5pWw5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFVua25vd25GdW5jdGlvbiA9ICguLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd247XG5cbi8qKlxuICogQGVuIEF2b2lkIHRoZSBgT2JqZWN0YCBhbmQgYHt9YCB0eXBlcywgYXMgdGhleSBtZWFuIFwiYW55IG5vbi1udWxsaXNoIHZhbHVlXCIuXG4gKiBAamEg5rGO55So44Kq44OW44K444Kn44Kv44OI5Z6LLiBgT2JqZWN0YCDjgYrjgojjgbMgYHt9YCDjgr/jgqTjg5fjga/jgIxudWxs44Gn44Gq44GE5YCk44CN44KS5oSP5ZGz44GZ44KL44Gf44KB5Luj5L6h44Go44GX44Gm5L2/55SoXG4gKi9cbmV4cG9ydCB0eXBlIFVua25vd25PYmplY3QgPSBSZWNvcmQ8c3RyaW5nIHwgbnVtYmVyIHwgc3ltYm9sLCB1bmtub3duPjtcblxuLyoqXG4gKiBAZW4gSmF2YVNjcmlwdCB0eXBlIHNldCBpbnRlcmZhY2UuXG4gKiBAamEgSmF2YVNjcmlwdCDjga7lnovjga7pm4blkIhcbiAqL1xuaW50ZXJmYWNlIFR5cGVMaXN0IHtcbiAgICBzdHJpbmc6IHN0cmluZztcbiAgICBudW1iZXI6IG51bWJlcjtcbiAgICBib29sZWFuOiBib29sZWFuO1xuICAgIHN5bWJvbDogc3ltYm9sO1xuICAgIGJpZ2ludDogYmlnaW50O1xuICAgIHVuZGVmaW5lZDogdm9pZCB8IHVuZGVmaW5lZDtcbiAgICBvYmplY3Q6IG9iamVjdCB8IG51bGw7XG4gICAgZnVuY3Rpb24oLi4uYXJnczogdW5rbm93bltdKTogdW5rbm93bjtcbn1cblxuLyoqXG4gKiBAZW4gVGhlIGtleSBsaXN0IG9mIHtAbGluayBUeXBlTGlzdH0uXG4gKiBAamEge0BsaW5rIFR5cGVMaXN0fSDjgq3jg7zkuIDopqdcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZUtleXMgPSBrZXlvZiBUeXBlTGlzdDtcblxuLyoqXG4gKiBAZW4gVHlwZSBiYXNlIGRlZmluaXRpb24uXG4gKiBAamEg5Z6L44Gu6KaP5a6a5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZTxUIGV4dGVuZHMgb2JqZWN0PiBleHRlbmRzIEZ1bmN0aW9uIHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IFQ7XG59XG5cbi8qKlxuICogQGVuIFR5cGUgb2YgY29uc3RydWN0b3IuXG4gKiBAamEg44Kz44Oz44K544OI44Op44Kv44K/5Z6LXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29uc3RydWN0b3I8VCBleHRlbmRzIG9iamVjdD4gZXh0ZW5kcyBUeXBlPFQ+IHtcbiAgICBuZXcoLi4uYXJnczogYW55W10pOiBUO1xufVxuXG4vKipcbiAqIEBlbiBUeXBlIG9mIGNsYXNzLlxuICogQGphIOOCr+ODqeOCueWei1xuICovXG5leHBvcnQgdHlwZSBDbGFzczxUIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PiA9IENvbnN0cnVjdG9yPFQ+O1xuXG4vKipcbiAqIEBlbiBFbnN1cmUgZm9yIGZ1bmN0aW9uIHBhcmFtZXRlcnMgdG8gdHVwbGUuXG4gKiBAamEg6Zai5pWw44OR44Op44Oh44O844K/44Go44GX44GmIHR1cGxlIOOCkuS/neiovFxuICovXG5leHBvcnQgdHlwZSBBcmd1bWVudHM8VD4gPSBUIGV4dGVuZHMgYW55W10gPyBUIDogW1RdO1xuXG4vKipcbiAqIEBlbiBSbW92ZSBgcmVhZG9ubHlgIGF0dHJpYnV0ZXMgZnJvbSBpbnB1dCB0eXBlLlxuICogQGphIGByZWFkb25seWAg5bGe5oCn44KS6Kej6ZmkXG4gKi9cbmV4cG9ydCB0eXBlIFdyaXRhYmxlPFQ+ID0geyAtcmVhZG9ubHkgW0sgaW4ga2V5b2YgVF06IFRbS10gfTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBzdWJzY3JpcHQgYWNjZXNzaWJsZSB0eXBlLlxuICogQGphIOa3u+OBiOWtl+OCouOCr+OCu+OCueWPr+iDveOBquWei+OBq+WkieaPm1xuICovXG5leHBvcnQgdHlwZSBBY2Nlc3NpYmxlPFQsIFMgPSB1bmtub3duPiA9IFQgJiBSZWNvcmQ8c3RyaW5nIHwgbnVtYmVyIHwgc3ltYm9sLCBTPjtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBmdW5jdGlvbmFsIHByb3BlcnR5IG5hbWVzLlxuICogQGphIOmWouaVsOODl+ODreODkeODhuOCo+WQjeOBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBGdW5jdGlvblByb3BlcnR5TmFtZXM8VD4gPSB7IFtLIGluIGtleW9mIFRdOiBUW0tdIGV4dGVuZHMgRnVuY3Rpb24gPyBLIDogbmV2ZXIgfVtrZXlvZiBUXSAmIHN0cmluZztcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBmdW5jdGlvbmFsIHByb3BlcnRpZXMuXG4gKiBAamEg6Zai5pWw44OX44Ot44OR44OG44Kj44Gu5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIEZ1bmN0aW9uUHJvcGVydGllczxUPiA9IFBpY2s8VCwgRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+PjtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBub24tZnVuY3Rpb25hbCBwcm9wZXJ0eSBuYW1lcy5cbiAqIEBqYSDpnZ7plqLmlbDjg5fjg63jg5Hjg4bjgqPlkI3jga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+ID0geyBbSyBpbiBrZXlvZiBUXTogVFtLXSBleHRlbmRzIEZ1bmN0aW9uID8gbmV2ZXIgOiBLIH1ba2V5b2YgVF0gJiBzdHJpbmc7XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgbm9uLWZ1bmN0aW9uYWwgcHJvcGVydGllcy5cbiAqIEBqYSDpnZ7plqLmlbDjg5fjg63jg5Hjg4bjgqPjga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgTm9uRnVuY3Rpb25Qcm9wZXJ0aWVzPFQ+ID0gUGljazxULCBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VD4+O1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG5vbi1mdW5jdGlvbmFsIHR5cGVzLlxuICogQGphIOmdnumWouaVsOWei+OBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBOb25GdW5jdGlvbjxUPiA9IFQgZXh0ZW5kcyBGdW5jdGlvbiA/IG5ldmVyIDogVDtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBvYmplY3Qga2V5IGxpc3QuIChlbnN1cmUgb25seSAnc3RyaW5nJylcbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7jgq3jg7zkuIDopqfjgpLmir3lh7ogKCdzdHJpbmcnIOWei+OBruOBv+OCkuS/neiovClcbiAqL1xuZXhwb3J0IHR5cGUgS2V5czxUIGV4dGVuZHMgb2JqZWN0PiA9IGtleW9mIE9taXQ8VCwgbnVtYmVyIHwgc3ltYm9sPjtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBvYmplY3QgdHlwZSBsaXN0LlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBruWei+S4gOimp+OCkuaKveWHulxuICovXG5leHBvcnQgdHlwZSBUeXBlczxUIGV4dGVuZHMgb2JqZWN0PiA9IFRba2V5b2YgVF07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgb2JqZWN0IGtleSB0byB0eXBlLlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOCreODvOOBi+OCieWei+OBuOWkieaPm1xuICovXG5leHBvcnQgdHlwZSBLZXlUb1R5cGU8TyBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIGtleW9mIE8+ID0gSyBleHRlbmRzIGtleW9mIE8gPyBPW0tdIDogbmV2ZXI7XG5cbi8qKlxuICogQGVuIENvbnZlcnQgb2JqZWN0IHR5cGUgdG8ga2V5LlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOWei+OBi+OCieOCreODvOOBuOWkieaPm1xuICovXG5leHBvcnQgdHlwZSBUeXBlVG9LZXk8TyBleHRlbmRzIG9iamVjdCwgVCBleHRlbmRzIFR5cGVzPE8+PiA9IHsgW0sgaW4ga2V5b2YgT106IE9bS10gZXh0ZW5kcyBUID8gSyA6IG5ldmVyIH1ba2V5b2YgT107XG5cbi8qKlxuICogQGVuIFRoZSB7QGxpbmsgUGxhaW5PYmplY3R9IHR5cGUgaXMgYSBKYXZhU2NyaXB0IG9iamVjdCBjb250YWluaW5nIHplcm8gb3IgbW9yZSBrZXktdmFsdWUgcGFpcnMuIDxicj5cbiAqICAgICAnUGxhaW4nIG1lYW5zIGl0IGZyb20gb3RoZXIga2luZHMgb2YgSmF2YVNjcmlwdCBvYmplY3RzLiBleDogbnVsbCwgdXNlci1kZWZpbmVkIGFycmF5cywgYW5kIGhvc3Qgb2JqZWN0cyBzdWNoIGFzIGBkb2N1bWVudGAuXG4gKiBAamEgMCDku6XkuIrjga4ga2V5LXZhbHVlIOODmuOCouOCkuaMgeOBpCB7QGxpbmsgUGxhaW5PYmplY3R9IOWumue+qSA8YnI+XG4gKiAgICAgJ1BsYWluJyDjgajjga/ku5bjga7nqK7poZ7jga4gSmF2YVNjcmlwdCDjgqrjg5bjgrjjgqfjgq/jg4jjgpLlkKvjgb7jgarjgYTjgqrjg5bjgrjjgqfjgq/jg4jjgpLmhI/lkbPjgZnjgosuIOS+izogIG51bGwsIOODpuODvOOCtuODvOWumue+qemFjeWIlywg44G+44Gf44GvIGBkb2N1bWVudGAg44Gu44KI44GG44Gq57WE44G/6L6844G/44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCB0eXBlIFBsYWluT2JqZWN0PFQgPSB7fSB8IG51bGwgfCB1bmRlZmluZWQ+ID0gUmVjb3JkPHN0cmluZywgVD47XG5cbi8qKlxuICogQGVuIE9iamVjdCBjYW4gYmUgZ3VhcmFudGVlZCBkZWZpbml0aW9uLiBCZSBjYXJlZnVsIG5vdCB0byBhYnVzZSBpdCBiZWNhdXNlIGl0IGRvZXMgbm90IGZvcmNlIHRoZSBjYXN0LlxuICogICAtIFVubGlrZSB7QGxpbmsgUGxhaW5PYmplY3R9LCBpdCBjYW4gYWNjZXB0IENsYXNzIChidWlsdC1pbiBvYmplY3QpLCBBcnJheSwgRnVuY3Rpb24uXG4gKiAgIC0gVW5saWtlIGBvYmplY3RgLCB5b3UgY2FuIGFjY2VzcyB1bmtub3duIHByb3BlcnRpZXMuXG4gKiAgIC0gVW5saWtlIGB7fSAvIE9iamVjdGAsIGl0IGNhbiByZXBlbCB7QGxpbmsgUHJpbWl0aXZlfS5cbiAqIEBqYSBPYmplY3Qg44KS5L+d6Ki85Y+v6IO944Gq5a6a576pLiDjgq3jg6Pjgrnjg4jjgpLlvLfliLbjgZfjgarjgYTjgZ/jgoHkubHnlKjjgZfjgarjgYTjgojjgYbjgavms6jmhI/jgYzlv4XopoEuXG4gKiAgIC0ge0BsaW5rIFBsYWluT2JqZWN0fSDjgajpgZXjgYTjgIFDbGFzcyAo57WE44G/6L6844G/44Kq44OW44K444Kn44Kv44OIKSwgQXJyYXksIEZ1bmN0aW9uIOOCkuWPl+OBkeS7mOOBkeOCi+OBk+OBqOOBjOOBp+OBjeOCiy5cbiAqICAgLSBgb2JqZWN0YCDjgajpgZXjgYTjgIHmnKrnn6Xjga7jg5fjg63jg5Hjg4bjgqPjgavjgqLjgq/jgrvjgrnjgZnjgovjgZPjgajjgYzjgafjgY3jgosuXG4gKiAgIC0gYHt9IC8gT2JqZWN0YCDjgajpgZXjgYTjgIF7QGxpbmsgUHJpbWl0aXZlfSDjgpLjga/jgZjjgY/jgZPjgajjgYzjgafjgY3jgosuXG4gKi9cbmV4cG9ydCB0eXBlIEFueU9iamVjdCA9IFJlY29yZDxzdHJpbmcsIGFueT47XG5cbi8qKlxuICogQGVuIFRoZSBkYXRhIHR5cGUgbGlzdCBieSB3aGljaCBzdHlsZSBjb21wdWxzaW9uIGlzIHBvc3NpYmxlLlxuICogQGphIOWei+W8t+WItuWPr+iDveOBquODh+ODvOOCv+Wei+S4gOimp1xuICovXG5leHBvcnQgdHlwZSBUeXBlZERhdGEgPSBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCB8IG9iamVjdDtcblxuLyoqXG4gKiBAZW4gVGhlIGRhdGEgdHlwZSBsaXN0IG9mIFR5cGVkQXJyYXkuXG4gKiBAamEgVHlwZWRBcnJheSDkuIDopqdcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZWRBcnJheSA9IEludDhBcnJheSB8IFVpbnQ4QXJyYXkgfCBVaW50OENsYW1wZWRBcnJheSB8IEludDE2QXJyYXkgfCBVaW50MTZBcnJheSB8IEludDMyQXJyYXkgfCBVaW50MzJBcnJheSB8IEZsb2F0MzJBcnJheSB8IEZsb2F0NjRBcnJheTtcblxuLyoqXG4gKiBAZW4gVHlwZWRBcnJheSBjb25zdHJ1Y3Rvci5cbiAqIEBqYSBUeXBlZEFycmF5IOOCs+ODs+OCueODiOODqeOCr+OCv+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFR5cGVkQXJyYXlDb25zdHJ1Y3RvciB7XG4gICAgcmVhZG9ubHkgcHJvdG90eXBlOiBUeXBlZEFycmF5O1xuICAgIG5ldyhzZWVkOiBudW1iZXIgfCBBcnJheUxpa2U8bnVtYmVyPiB8IEFycmF5QnVmZmVyTGlrZSk6IFR5cGVkQXJyYXk7XG4gICAgbmV3KGJ1ZmZlcjogQXJyYXlCdWZmZXJMaWtlLCBieXRlT2Zmc2V0PzogbnVtYmVyLCBsZW5ndGg/OiBudW1iZXIpOiBUeXBlZEFycmF5O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBzaXplIGluIGJ5dGVzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIOimgee0oOOBruODkOOCpOODiOOCteOCpOOCulxuICAgICAqL1xuICAgIHJlYWRvbmx5IEJZVEVTX1BFUl9FTEVNRU5UOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhIG5ldyBhcnJheSBmcm9tIGEgc2V0IG9mIGVsZW1lbnRzLlxuICAgICAqIEBqYSDopoHntKDjgpLoqK3lrprjgZfmlrDopo/phY3liJfjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpdGVtc1xuICAgICAqICAtIGBlbmAgQSBzZXQgb2YgZWxlbWVudHMgdG8gaW5jbHVkZSBpbiB0aGUgbmV3IGFycmF5IG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOaWsOOBn+OBq+ioreWumuOBmeOCi+imgee0oFxuICAgICAqL1xuICAgIG9mKC4uLml0ZW1zOiBudW1iZXJbXSk6IFR5cGVkQXJyYXk7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlcyBhbiBhcnJheSBmcm9tIGFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0LlxuICAgICAqIEBqYSBhcnJheS1saWtlIC8gaXRlcmF0YWJsZSDjgqrjg5bjgrjjgqfjgq/jg4jjgYvjgonmlrDopo/phY3liJfjgpLkvZzmiJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheUxpa2VcbiAgICAgKiAgLSBgZW5gIEFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0IHRvIGNvbnZlcnQgdG8gYW4gYXJyYXkuXG4gICAgICogIC0gYGphYCBhcnJheS1saWtlIOOCguOBl+OBj+OBryBpdGVyYXRhYmxlIOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIGZyb20oYXJyYXlMaWtlOiBBcnJheUxpa2U8bnVtYmVyPik6IFR5cGVkQXJyYXk7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlcyBhbiBhcnJheSBmcm9tIGFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0LlxuICAgICAqIEBqYSBhcnJheS1saWtlIC8gaXRlcmF0YWJsZSDjgqrjg5bjgrjjgqfjgq/jg4jjgYvjgonmlrDopo/phY3liJfjgpLkvZzmiJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheUxpa2VcbiAgICAgKiAgLSBgZW5gIEFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0IHRvIGNvbnZlcnQgdG8gYW4gYXJyYXkuXG4gICAgICogIC0gYGphYCBhcnJheS1saWtlIOOCguOBl+OBj+OBryBpdGVyYXRhYmxlIOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBtYXBmblxuICAgICAqICAtIGBlbmAgQSBtYXBwaW5nIGZ1bmN0aW9uIHRvIGNhbGwgb24gZXZlcnkgZWxlbWVudCBvZiB0aGUgYXJyYXkuXG4gICAgICogIC0gYGphYCDlhajopoHntKDjgavpgannlKjjgZnjgovjg5fjg63jgq3jgrfplqLmlbBcbiAgICAgKiBAcGFyYW0gdGhpc0FyZ1xuICAgICAqICAtIGBlbmAgVmFsdWUgb2YgJ3RoaXMnIHVzZWQgdG8gaW52b2tlIHRoZSBtYXBmbi5cbiAgICAgKiAgLSBgamFgIG1hcGZuIOOBq+S9v+eUqOOBmeOCiyAndGhpcydcbiAgICAgKi9cbiAgICBmcm9tPFQ+KGFycmF5TGlrZTogQXJyYXlMaWtlPFQ+LCBtYXBmbjogKHY6IFQsIGs6IG51bWJlcikgPT4gbnVtYmVyLCB0aGlzQXJnPzogdW5rbm93bik6IFR5cGVkQXJyYXk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgZXhpc3RzLlxuICogQGphIOWApOOBjOWtmOWcqOOBmeOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4aXN0czxUPih4OiBUIHwgTnVsbGlzaCk6IHggaXMgVCB7XG4gICAgcmV0dXJuIG51bGwgIT0geDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMge0BsaW5rIE51bGxpc2h9LlxuICogQGphIHtAbGluayBOdWxsaXNofSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc051bGxpc2goeDogdW5rbm93bik6IHggaXMgTnVsbGlzaCB7XG4gICAgcmV0dXJuIG51bGwgPT0geDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgU3RyaW5nLlxuICogQGphIFN0cmluZyDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0cmluZyh4OiB1bmtub3duKTogeCBpcyBzdHJpbmcge1xuICAgIHJldHVybiAnc3RyaW5nJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIE51bWJlci5cbiAqIEBqYSBOdW1iZXIg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOdW1iZXIoeDogdW5rbm93bik6IHggaXMgbnVtYmVyIHtcbiAgICByZXR1cm4gJ251bWJlcicgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBCb29sZWFuLlxuICogQGphIEJvb2xlYW4g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCb29sZWFuKHg6IHVua25vd24pOiB4IGlzIGJvb2xlYW4ge1xuICAgIHJldHVybiAnYm9vbGVhbicgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBTeW1ibGUuXG4gKiBAamEgU3ltYm9sIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3ltYm9sKHg6IHVua25vd24pOiB4IGlzIHN5bWJvbCB7XG4gICAgcmV0dXJuICdzeW1ib2wnID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgQmlnSW50LlxuICogQGphIEJpZ0ludCDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0JpZ0ludCh4OiB1bmtub3duKTogeCBpcyBiaWdpbnQge1xuICAgIHJldHVybiAnYmlnaW50JyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIHByaW1pdGl2ZSB0eXBlLlxuICogQGphIOODl+ODquODn+ODhuOCo+ODluWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUHJpbWl0aXZlKHg6IHVua25vd24pOiB4IGlzIFByaW1pdGl2ZSB7XG4gICAgcmV0dXJuICF4IHx8ICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgeCkgJiYgKCdvYmplY3QnICE9PSB0eXBlb2YgeCk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIEFycmF5LlxuICogQGphIEFycmF5IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGNvbnN0IGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBPYmplY3QuXG4gKiBAamEgT2JqZWN0IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT2JqZWN0KHg6IHVua25vd24pOiB4IGlzIG9iamVjdCB7XG4gICAgcmV0dXJuIEJvb2xlYW4oeCkgJiYgJ29iamVjdCcgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyB7QGxpbmsgUGxhaW5PYmplY3R9LlxuICogQGphIHtAbGluayBQbGFpbk9iamVjdH0g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQbGFpbk9iamVjdCh4OiB1bmtub3duKTogeCBpcyBQbGFpbk9iamVjdCB7XG4gICAgaWYgKCFpc09iamVjdCh4KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gY3JlYXRlIGZyb20gYE9iamVjdC5jcmVhdGUoIG51bGwgKWAgaXMgcGxhaW5cbiAgICBpZiAoIU9iamVjdC5nZXRQcm90b3R5cGVPZih4KSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3duSW5zdGFuY2VPZihPYmplY3QsIHgpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBlbXB0eSBvYmplY3QuXG4gKiBAamEg56m644Kq44OW44K444Kn44Kv44OI44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFbXB0eU9iamVjdCh4OiB1bmtub3duKTogeCBpcyBvYmplY3Qge1xuICAgIGlmICghaXNQbGFpbk9iamVjdCh4KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbmFtZSBpbiB4KSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIEZ1bmN0aW9uLlxuICogQGphIEZ1bmN0aW9uIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRnVuY3Rpb24oeDogdW5rbm93bik6IHggaXMgVHlwZUxpc3RbJ2Z1bmN0aW9uJ10ge1xuICAgIHJldHVybiAnZnVuY3Rpb24nID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGNhbiBiZSBjb252ZXJ0IHRvIGEgbnVtYmVyLlxuICogQGphIOaVsOWApOOBq+WkieaPm+WPr+iDveOBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTnVtZXJpYyh4OiB1bmtub3duKTogeCBpcyBudW1iZXIge1xuICAgIHJldHVybiAhaXNOdWxsaXNoKHgpICYmICFpc0Jvb2xlYW4oeCkgJiYgIWlzQXJyYXkoeCkgJiYgIWlzU3ltYm9sKHgpICYmICgnJyAhPT0geCkgJiYgIU51bWJlci5pc05hTihOdW1iZXIoeCkpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBpbnB1dC5cbiAqIEBqYSDmjIflrprjgZfjgZ/lnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gdHlwZVxuICogIC0gYGVuYCBldmFsdWF0ZWQgdHlwZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlnotcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHR5cGVPZjxLIGV4dGVuZHMgVHlwZUtleXM+KHR5cGU6IEssIHg6IHVua25vd24pOiB4IGlzIFR5cGVMaXN0W0tdIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09IHR5cGU7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBoYXMgaXRlcmF0b3IuXG4gKiBAamEgaXRlcmF0b3Ig44KS5omA5pyJ44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZTxUPih4OiBOdWxsYWJsZTxJdGVyYWJsZTxUPj4pOiB4IGlzIEl0ZXJhYmxlPFQ+O1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGUoeDogdW5rbm93bik6IHggaXMgSXRlcmFibGU8dW5rbm93bj47XG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZSh4OiB1bmtub3duKTogYW55IHtcbiAgICByZXR1cm4gU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdCh4KTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3R5cGVkQXJyYXlOYW1lczogUmVjb3JkPHN0cmluZywgYm9vbGVhbj4gPSB7XG4gICAgJ0ludDhBcnJheSc6IHRydWUsXG4gICAgJ1VpbnQ4QXJyYXknOiB0cnVlLFxuICAgICdVaW50OENsYW1wZWRBcnJheSc6IHRydWUsXG4gICAgJ0ludDE2QXJyYXknOiB0cnVlLFxuICAgICdVaW50MTZBcnJheSc6IHRydWUsXG4gICAgJ0ludDMyQXJyYXknOiB0cnVlLFxuICAgICdVaW50MzJBcnJheSc6IHRydWUsXG4gICAgJ0Zsb2F0MzJBcnJheSc6IHRydWUsXG4gICAgJ0Zsb2F0NjRBcnJheSc6IHRydWUsXG59O1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgaXMgb25lIG9mIHtAbGluayBUeXBlZEFycmF5fS5cbiAqIEBqYSDmjIflrprjgZfjgZ/jgqTjg7Pjgrnjgr/jg7PjgrnjgYwge0BsaW5rIFR5cGVkQXJyYXl9IOOBruS4gOeoruOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZWRBcnJheSh4OiB1bmtub3duKTogeCBpcyBUeXBlZEFycmF5IHtcbiAgICByZXR1cm4gISFfdHlwZWRBcnJheU5hbWVzW2NsYXNzTmFtZSh4KV07XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBpbnN0YW5jZSBvZiBpbnB1dC5cbiAqIEBqYSDmjIflrprjgZfjgZ/jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL44Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnN0YW5jZU9mPFQgZXh0ZW5kcyBvYmplY3Q+KGN0b3I6IE51bGxhYmxlPFR5cGU8VD4+LCB4OiB1bmtub3duKTogeCBpcyBUIHtcbiAgICByZXR1cm4gKCdmdW5jdGlvbicgPT09IHR5cGVvZiBjdG9yKSAmJiAoeCBpbnN0YW5jZW9mIGN0b3IpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgaW5zdGFuY2Ugb2YgaW5wdXQgY29uc3RydWN0b3IgKGV4Y2VwdCBzdWIgY2xhc3MpLlxuICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OBruOCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+WIpOWumiAo5rS+55Sf44Kv44Op44K544Gv5ZCr44KB44Gq44GEKVxuICpcbiAqIEBwYXJhbSBjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDoqZXkvqHjgZnjgovjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG93bkluc3RhbmNlT2Y8VCBleHRlbmRzIG9iamVjdD4oY3RvcjogTnVsbGFibGU8VHlwZTxUPj4sIHg6IHVua25vd24pOiB4IGlzIFQge1xuICAgIHJldHVybiAobnVsbCAhPSB4KSAmJiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGN0b3IpICYmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgPT09IE9iamVjdChjdG9yLnByb3RvdHlwZSkpO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIHZhbHVlJ3MgY2xhc3MgbmFtZS5cbiAqIEBqYSDjgq/jg6njgrnlkI3jgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGFzc05hbWUoeDogYW55KTogc3RyaW5nIHtcbiAgICBpZiAoeCAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHRvU3RyaW5nVGFnTmFtZSA9IHhbU3ltYm9sLnRvU3RyaW5nVGFnXTtcbiAgICAgICAgaWYgKGlzU3RyaW5nKHRvU3RyaW5nVGFnTmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0b1N0cmluZ1RhZ05hbWU7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbih4KSAmJiB4LnByb3RvdHlwZSAmJiBudWxsICE9IHgubmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHgubmFtZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGN0b3IgPSB4LmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oY3RvcikgJiYgY3RvciA9PT0gKE9iamVjdChjdG9yLnByb3RvdHlwZSkgYXMgb2JqZWN0KS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjdG9yLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgYXMgc3RyaW5nKS5zbGljZSg4LCAtMSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIGlucHV0IHZhbHVlcyBhcmUgc2FtZSB2YWx1ZS10eXBlLlxuICogQGphIOWFpeWKm+OBjOWQjOS4gOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBsaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICogQHBhcmFtIHJoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1lVHlwZShsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0eXBlb2YgbGhzID09PSB0eXBlb2YgcmhzO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBpbnB1dCB2YWx1ZXMgYXJlIHNhbWUgY2xhc3MuXG4gKiBAamEg5YWl5Yqb44GM5ZCM5LiA44Kv44Op44K544Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGxoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKiBAcGFyYW0gcmhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhbWVDbGFzcyhsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIGlmIChudWxsID09IGxocyAmJiBudWxsID09IHJocykge1xuICAgICAgICByZXR1cm4gY2xhc3NOYW1lKGxocykgPT09IGNsYXNzTmFtZShyaHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAobnVsbCAhPSBsaHMpICYmIChudWxsICE9IHJocykgJiYgKE9iamVjdC5nZXRQcm90b3R5cGVPZihsaHMpID09PSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocmhzKSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb21tb24gU3ltYmxlIGZvciBmcmFtZXdvcmsuXG4gKiBAamEg44OV44Os44O844Og44Ov44O844Kv44GM5YWx6YCa44Gn5L2/55So44GZ44KLIFN5bWJsZVxuICovXG5leHBvcnQgY29uc3QgJGNkcCA9IFN5bWJvbCgnQGNkcCcpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvYmFuLXR5cGVzLFxuICovXG5cbmltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIFR5cGVLZXlzLFxuICAgIGlzQXJyYXksXG4gICAgZXhpc3RzLFxuICAgIGNsYXNzTmFtZSxcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogQGVuIFR5cGUgdmVyaWZpZXIgaW50ZXJmYWNlIGRlZmluaXRpb24uIDxicj5cbiAqICAgICBJZiBpbnZhbGlkIHZhbHVlIHJlY2VpdmVkLCB0aGUgbWV0aG9kIHRocm93cyBgVHlwZUVycm9yYC5cbiAqIEBqYSDlnovmpJzoqLzjga7jgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqkgPGJyPlxuICogICAgIOmBleWPjeOBl+OBn+WgtOWQiOOBryBgVHlwZUVycm9yYCDjgpLnmbrnlJ9cbiAqXG4gKlxuICovXG5pbnRlcmZhY2UgVmVyaWZpZXIge1xuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBpcyBub3Qge0BsaW5rIE51bGxpc2h9LlxuICAgICAqIEBqYSB7QGxpbmsgTnVsbGlzaH0g44Gn44Gq44GE44GT44Go44KS5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm90TnVsbGlzaC54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBub3ROdWxsaXNoLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBub3ROdWxsaXNoOiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpcyB7QGxpbmsgVHlwZUtleXN9LlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ8ge0BsaW5rIFR5cGVLZXlzfSDjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlT2YudHlwZVxuICAgICAqICAtIGBlbmAgb25lIG9mIHtAbGluayBUeXBlS2V5c31cbiAgICAgKiAgLSBgamFgIHtAbGluayBUeXBlS2V5c30g44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHR5cGVPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSB0eXBlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIHR5cGVPZjogKHR5cGU6IFR5cGVLZXlzLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGlzIGBBcnJheWAuXG4gICAgICogQGphIGBBcnJheWAg44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXkueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gYXJyYXkubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGFycmF5OiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBpcyBgSXRlcmFibGVgLlxuICAgICAqIEBqYSBgSXRlcmFibGVgIOOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGl0ZXJhYmxlLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGl0ZXJhYmxlLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBpdGVyYWJsZTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaW5zdGFuY2UgaXMgZXF1YWwgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbnN0YW5jZU9mLmN0b3JcbiAgICAgKiAgLSBgZW5gIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5q+U6LyD5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluc3RhbmNlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaW5zdGFuY2VPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGluc3RhbmNlIGhhcyBgc3RyaWN0bHlgIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44Gu5Y6z5a+G5LiA6Ie044GX44Gf44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3duSW5zdGFuY2VPZi5jdG9yXG4gICAgICogIC0gYGVuYCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOavlOi8g+WvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBvd25JbnN0YW5jZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIG93bkluc3RhbmNlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIG93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpbnN0YW5jZSBoYXMgbm90IGBzdHJpY3RseWAgZXF1YWwgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jgpLmjIHjgaTjgqTjg7Pjgrnjgr/jg7PjgrnjgafjgarjgYTjgZPjgajjgpLmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub3RPd25JbnN0YW5jZU9mLmN0b3JcbiAgICAgKiAgLSBgZW5gIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5q+U6LyD5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIG5vdE93bkluc3RhbmNlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gbm90T3duSW5zdGFuY2VPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgbm90T3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGhhcyBzcGVjaWZpZWQgcHJvcGVydHkuXG4gICAgICogQGphIOaMh+WumuODl+ODreODkeODhuOCo+OCkuaMgeOBo+OBpuOBhOOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGhhc1Byb3BlcnR5LnByb3BcbiAgICAgKiAgLSBgZW5gIHNwZWNpZmllZCBwcm9wZXJ0eVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44OX44Ot44OR44OG44KjXG4gICAgICogQHBhcmFtIGhhc1Byb3BlcnR5LnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGhhc1Byb3BlcnR5Lm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBoYXNQcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGhhcyBvd24gc3BlY2lmaWVkIHByb3BlcnR5LlxuICAgICAqIEBqYSDmjIflrprjg5fjg63jg5Hjg4bjgqPjgpLlhaXlipvlgKToh6rouqvmjIHjgaPjgabjgYTjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS5wcm9wXG4gICAgICogIC0gYGVuYCBzcGVjaWZpZWQgcHJvcGVydHlcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaGFzT3duUHJvcGVydHk6ICh4OiB1bmtub3duLCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcbn1cblxuLyoqXG4gKiBAZW4gTGlzdCBvZiBtZXRob2QgZm9yIHR5cGUgdmVyaWZ5LlxuICogQGphIOWei+aknOiovOOBjOaPkOS+m+OBmeOCi+ODoeOCveODg+ODieS4gOimp1xuICovXG5leHBvcnQgdHlwZSBWZXJpZnlNZXRob2QgPSBrZXlvZiBWZXJpZmllcjtcblxuLyoqXG4gKiBAZW4gQ29uY3JldGUgdHlwZSB2ZXJpZmllciBvYmplY3QuXG4gKiBAamEg5Z6L5qSc6Ki85a6f6KOF44Kq44OW44K444Kn44Kv44OIXG4gKlxuICogQGludGVybmFsXG4gKi9cbmNvbnN0IF92ZXJpZmllcjogVmVyaWZpZXIgPSB7XG4gICAgbm90TnVsbGlzaDogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYSB2YWxpZCB2YWx1ZS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdHlwZU9mOiAodHlwZTogVHlwZUtleXMsIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiB4ICE9PSB0eXBlKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVHlwZSBvZiAke2NsYXNzTmFtZSh4KX0gaXMgbm90ICR7dHlwZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGFycmF5OiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAoIWlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGFuIEFycmF5LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBpdGVyYWJsZTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKCEoU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdCh4KSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGFuIGl0ZXJhYmxlIG9iamVjdC5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICghKHggaW5zdGFuY2VvZiBjdG9yKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYW4gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBvd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgIT09IE9iamVjdChjdG9yLnByb3RvdHlwZSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGlzIG5vdCBvd24gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBub3RPd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgIT0geCAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgPT09IE9iamVjdChjdG9yLnByb3RvdHlwZSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGlzIG93biBpbnN0YW5jZSBvZiAke2N0b3IubmFtZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGhhc1Byb3BlcnR5OiAoeDogdW5rbm93biwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCB8fCAhKHByb3AgaW4gKHggYXMgb2JqZWN0KSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGRvZXMgbm90IGhhdmUgcHJvcGVydHkgJHtTdHJpbmcocHJvcCl9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBoYXNPd25Qcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHggfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh4LCBwcm9wKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFRoZSBvYmplY3QgZG9lcyBub3QgaGF2ZSBvd24gcHJvcGVydHkgJHtTdHJpbmcocHJvcCl9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vKipcbiAqIEBlbiBWZXJpZnkgbWV0aG9kLlxuICogQGphIOaknOiovOODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBtZXRob2RcbiAqICAtIGBlbmAgbWV0aG9kIG5hbWUgd2hpY2ggdXNpbmdcbiAqICAtIGBqYWAg5L2/55So44GZ44KL44Oh44K944OD44OJ5ZCNXG4gKiBAcGFyYW0gYXJnc1xuICogIC0gYGVuYCBhcmd1bWVudHMgd2hpY2ggY29ycmVzcG9uZHMgdG8gdGhlIG1ldGhvZCBuYW1lXG4gKiAgLSBgamFgIOODoeOCveODg+ODieWQjeOBq+WvvuW/nOOBmeOCi+W8leaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gdmVyaWZ5PFRNZXRob2QgZXh0ZW5kcyBWZXJpZnlNZXRob2Q+KG1ldGhvZDogVE1ldGhvZCwgLi4uYXJnczogUGFyYW1ldGVyczxWZXJpZmllcltUTWV0aG9kXT4pOiB2b2lkIHwgbmV2ZXIge1xuICAgIChfdmVyaWZpZXJbbWV0aG9kXSBhcyBVbmtub3duRnVuY3Rpb24pKC4uLmFyZ3MpO1xufVxuXG5leHBvcnQgeyB2ZXJpZnkgYXMgZGVmYXVsdCB9O1xuIiwiaW1wb3J0IHtcbiAgICBVbmtub3duT2JqZWN0LFxuICAgIFR5cGVkQXJyYXksXG4gICAgVHlwZWRBcnJheUNvbnN0cnVjdG9yLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNBcnJheSxcbiAgICBpc09iamVjdCxcbiAgICBpc0l0ZXJhYmxlLFxuICAgIGlzVHlwZWRBcnJheSxcbiAgICBzYW1lQ2xhc3MsXG59IGZyb20gJy4vdHlwZXMnO1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgZGVlcEVxdWFsKCkgKi9cbmZ1bmN0aW9uIGFycmF5RXF1YWwobGhzOiB1bmtub3duW10sIHJoczogdW5rbm93bltdKTogYm9vbGVhbiB7XG4gICAgY29uc3QgbGVuID0gbGhzLmxlbmd0aDtcbiAgICBpZiAobGVuICE9PSByaHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoIWRlZXBFcXVhbChsaHNbaV0sIHJoc1tpXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGRlZXBFcXVhbCgpICovXG5mdW5jdGlvbiBidWZmZXJFcXVhbChsaHM6IFNoYXJlZEFycmF5QnVmZmVyIHwgQXJyYXlCdWZmZXIsIHJoczogU2hhcmVkQXJyYXlCdWZmZXIgfCBBcnJheUJ1ZmZlcik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHNpemUgPSBsaHMuYnl0ZUxlbmd0aDtcbiAgICBpZiAoc2l6ZSAhPT0gcmhzLmJ5dGVMZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBsZXQgcG9zID0gMDtcbiAgICBpZiAoc2l6ZSAtIHBvcyA+PSA4KSB7XG4gICAgICAgIGNvbnN0IGxlbiA9IHNpemUgPj4+IDM7XG4gICAgICAgIGNvbnN0IGY2NEwgPSBuZXcgRmxvYXQ2NEFycmF5KGxocywgMCwgbGVuKTtcbiAgICAgICAgY29uc3QgZjY0UiA9IG5ldyBGbG9hdDY0QXJyYXkocmhzLCAwLCBsZW4pO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoIU9iamVjdC5pcyhmNjRMW2ldLCBmNjRSW2ldKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBwb3MgPSBsZW4gPDwgMztcbiAgICB9XG4gICAgaWYgKHBvcyA9PT0gc2l6ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY29uc3QgTCA9IG5ldyBEYXRhVmlldyhsaHMpO1xuICAgIGNvbnN0IFIgPSBuZXcgRGF0YVZpZXcocmhzKTtcbiAgICBpZiAoc2l6ZSAtIHBvcyA+PSA0KSB7XG4gICAgICAgIGlmICghT2JqZWN0LmlzKEwuZ2V0VWludDMyKHBvcyksIFIuZ2V0VWludDMyKHBvcykpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcG9zICs9IDQ7XG4gICAgfVxuICAgIGlmIChzaXplIC0gcG9zID49IDIpIHtcbiAgICAgICAgaWYgKCFPYmplY3QuaXMoTC5nZXRVaW50MTYocG9zKSwgUi5nZXRVaW50MTYocG9zKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwb3MgKz0gMjtcbiAgICB9XG4gICAgaWYgKHNpemUgPiBwb3MpIHtcbiAgICAgICAgaWYgKCFPYmplY3QuaXMoTC5nZXRVaW50OChwb3MpLCBSLmdldFVpbnQ4KHBvcykpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcG9zICs9IDE7XG4gICAgfVxuICAgIHJldHVybiBwb3MgPT09IHNpemU7XG59XG5cbi8qKlxuICogQGVuIFNldCBieSBzcGVjaWZ5aW5nIGtleSBhbmQgdmFsdWUgZm9yIHRoZSBvYmplY3QuIChwcm90b3R5cGUgcG9sbHV0aW9uIGNvdW50ZXJtZWFzdXJlKVxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBqyBrZXksIHZhbHVlIOOCkuaMh+WumuOBl+OBpuioreWumiAo44OX44Ot44OI44K/44Kk44OX5rGa5p+T5a++562WKVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzaWduVmFsdWUodGFyZ2V0OiBVbmtub3duT2JqZWN0LCBrZXk6IHN0cmluZyB8IG51bWJlciB8IHN5bWJvbCwgdmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICBpZiAoJ19fcHJvdG9fXycgIT09IGtleSAmJiAnY29uc3RydWN0b3InICE9PSBrZXkpIHtcbiAgICAgICAgdGFyZ2V0W2tleV0gPSB2YWx1ZTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIFBlcmZvcm1zIGEgZGVlcCBjb21wYXJpc29uIGJldHdlZW4gdHdvIHZhbHVlcyB0byBkZXRlcm1pbmUgaWYgdGhleSBhcmUgZXF1aXZhbGVudC5cbiAqIEBqYSAy5YCk44Gu6Kmz57Sw5q+U6LyD44KS44GXLCDnrYnjgZfjgYTjgYvjganjgYbjgYvliKTlrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBFcXVhbChsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIGlmIChsaHMgPT09IHJocykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGlzRnVuY3Rpb24obGhzKSAmJiBpc0Z1bmN0aW9uKHJocykpIHtcbiAgICAgICAgcmV0dXJuIGxocy5sZW5ndGggPT09IHJocy5sZW5ndGggJiYgbGhzLm5hbWUgPT09IHJocy5uYW1lO1xuICAgIH1cbiAgICBpZiAoIWlzT2JqZWN0KGxocykgfHwgIWlzT2JqZWN0KHJocykpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB7IC8vIFByaW1pdGl2ZSBXcmFwcGVyIE9iamVjdHMgLyBEYXRlXG4gICAgICAgIGNvbnN0IHZhbHVlTCA9IGxocy52YWx1ZU9mKCk7XG4gICAgICAgIGNvbnN0IHZhbHVlUiA9IHJocy52YWx1ZU9mKCk7XG4gICAgICAgIGlmIChsaHMgIT09IHZhbHVlTCB8fCByaHMgIT09IHZhbHVlUikge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlTCA9PT0gdmFsdWVSO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gUmVnRXhwXG4gICAgICAgIGNvbnN0IGlzUmVnRXhwTCA9IGxocyBpbnN0YW5jZW9mIFJlZ0V4cDtcbiAgICAgICAgY29uc3QgaXNSZWdFeHBSID0gcmhzIGluc3RhbmNlb2YgUmVnRXhwO1xuICAgICAgICBpZiAoaXNSZWdFeHBMIHx8IGlzUmVnRXhwUikge1xuICAgICAgICAgICAgcmV0dXJuIGlzUmVnRXhwTCA9PT0gaXNSZWdFeHBSICYmIFN0cmluZyhsaHMpID09PSBTdHJpbmcocmhzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIEFycmF5XG4gICAgICAgIGNvbnN0IGlzQXJyYXlMID0gaXNBcnJheShsaHMpO1xuICAgICAgICBjb25zdCBpc0FycmF5UiA9IGlzQXJyYXkocmhzKTtcbiAgICAgICAgaWYgKGlzQXJyYXlMIHx8IGlzQXJyYXlSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNBcnJheUwgPT09IGlzQXJyYXlSICYmIGFycmF5RXF1YWwobGhzIGFzIHVua25vd25bXSwgcmhzIGFzIHVua25vd25bXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBBcnJheUJ1ZmZlclxuICAgICAgICBjb25zdCBpc0J1ZmZlckwgPSBsaHMgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcjtcbiAgICAgICAgY29uc3QgaXNCdWZmZXJSID0gcmhzIGluc3RhbmNlb2YgQXJyYXlCdWZmZXI7XG4gICAgICAgIGlmIChpc0J1ZmZlckwgfHwgaXNCdWZmZXJSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNCdWZmZXJMID09PSBpc0J1ZmZlclIgJiYgYnVmZmVyRXF1YWwobGhzIGFzIEFycmF5QnVmZmVyLCByaHMgYXMgQXJyYXlCdWZmZXIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gQXJyYXlCdWZmZXJWaWV3XG4gICAgICAgIGNvbnN0IGlzQnVmZmVyVmlld0wgPSBBcnJheUJ1ZmZlci5pc1ZpZXcobGhzKTtcbiAgICAgICAgY29uc3QgaXNCdWZmZXJWaWV3UiA9IEFycmF5QnVmZmVyLmlzVmlldyhyaHMpO1xuICAgICAgICBpZiAoaXNCdWZmZXJWaWV3TCB8fCBpc0J1ZmZlclZpZXdSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNCdWZmZXJWaWV3TCA9PT0gaXNCdWZmZXJWaWV3UiAmJiBzYW1lQ2xhc3MobGhzLCByaHMpXG4gICAgICAgICAgICAgICAgJiYgYnVmZmVyRXF1YWwoKGxocyBhcyBBcnJheUJ1ZmZlclZpZXcpLmJ1ZmZlciwgKHJocyBhcyBBcnJheUJ1ZmZlclZpZXcpLmJ1ZmZlcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBvdGhlciBJdGVyYWJsZVxuICAgICAgICBjb25zdCBpc0l0ZXJhYmxlTCA9IGlzSXRlcmFibGUobGhzKTtcbiAgICAgICAgY29uc3QgaXNJdGVyYWJsZVIgPSBpc0l0ZXJhYmxlKHJocyk7XG4gICAgICAgIGlmIChpc0l0ZXJhYmxlTCB8fCBpc0l0ZXJhYmxlUikge1xuICAgICAgICAgICAgcmV0dXJuIGlzSXRlcmFibGVMID09PSBpc0l0ZXJhYmxlUiAmJiBhcnJheUVxdWFsKFsuLi4obGhzIGFzIHVua25vd25bXSldLCBbLi4uKHJocyBhcyB1bmtub3duW10pXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHNhbWVDbGFzcyhsaHMsIHJocykpIHtcbiAgICAgICAgY29uc3Qga2V5c0wgPSBuZXcgU2V0KE9iamVjdC5rZXlzKGxocykpO1xuICAgICAgICBjb25zdCBrZXlzUiA9IG5ldyBTZXQoT2JqZWN0LmtleXMocmhzKSk7XG4gICAgICAgIGlmIChrZXlzTC5zaXplICE9PSBrZXlzUi5zaXplKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2Yga2V5c0wpIHtcbiAgICAgICAgICAgIGlmICgha2V5c1IuaGFzKGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2Yga2V5c0wpIHtcbiAgICAgICAgICAgIGlmICghZGVlcEVxdWFsKChsaHMgYXMgVW5rbm93bk9iamVjdClba2V5XSwgKHJocyBhcyBVbmtub3duT2JqZWN0KVtrZXldKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIGxocykge1xuICAgICAgICAgICAgaWYgKCEoa2V5IGluIHJocykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qga2V5cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiByaHMpIHtcbiAgICAgICAgICAgIGlmICghKGtleSBpbiBsaHMpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAga2V5cy5hZGQoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzKSB7XG4gICAgICAgICAgICBpZiAoIWRlZXBFcXVhbCgobGhzIGFzIFVua25vd25PYmplY3QpW2tleV0sIChyaHMgYXMgVW5rbm93bk9iamVjdClba2V5XSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGNsb25lIFJlZ0V4cCAqL1xuZnVuY3Rpb24gY2xvbmVSZWdFeHAocmVnZXhwOiBSZWdFeHApOiBSZWdFeHAge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBSZWdFeHAocmVnZXhwLnNvdXJjZSwgcmVnZXhwLmZsYWdzKTtcbiAgICByZXN1bHQubGFzdEluZGV4ID0gcmVnZXhwLmxhc3RJbmRleDtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKiogQGludGVybmFsIGNsb25lIEFycmF5QnVmZmVyICovXG5mdW5jdGlvbiBjbG9uZUFycmF5QnVmZmVyKGFycmF5QnVmZmVyOiBBcnJheUJ1ZmZlcik6IEFycmF5QnVmZmVyIHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgQXJyYXlCdWZmZXIoYXJyYXlCdWZmZXIuYnl0ZUxlbmd0aCk7XG4gICAgbmV3IFVpbnQ4QXJyYXkocmVzdWx0KS5zZXQobmV3IFVpbnQ4QXJyYXkoYXJyYXlCdWZmZXIpKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKiogQGludGVybmFsIGNsb25lIERhdGFWaWV3ICovXG5mdW5jdGlvbiBjbG9uZURhdGFWaWV3KGRhdGFWaWV3OiBEYXRhVmlldyk6IERhdGFWaWV3IHtcbiAgICBjb25zdCBidWZmZXIgPSBjbG9uZUFycmF5QnVmZmVyKGRhdGFWaWV3LmJ1ZmZlcik7XG4gICAgcmV0dXJuIG5ldyBEYXRhVmlldyhidWZmZXIsIGRhdGFWaWV3LmJ5dGVPZmZzZXQsIGRhdGFWaWV3LmJ5dGVMZW5ndGgpO1xufVxuXG4vKiogQGludGVybmFsIGNsb25lIFR5cGVkQXJyYXkgKi9cbmZ1bmN0aW9uIGNsb25lVHlwZWRBcnJheTxUIGV4dGVuZHMgVHlwZWRBcnJheT4odHlwZWRBcnJheTogVCk6IFQge1xuICAgIGNvbnN0IGJ1ZmZlciA9IGNsb25lQXJyYXlCdWZmZXIodHlwZWRBcnJheS5idWZmZXIpO1xuICAgIHJldHVybiBuZXcgKHR5cGVkQXJyYXkuY29uc3RydWN0b3IgYXMgVHlwZWRBcnJheUNvbnN0cnVjdG9yKShidWZmZXIsIHR5cGVkQXJyYXkuYnl0ZU9mZnNldCwgdHlwZWRBcnJheS5sZW5ndGgpIGFzIFQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgY2hlY2sgbmVjZXNzYXJ5IHRvIHVwZGF0ZSAqL1xuZnVuY3Rpb24gbmVlZFVwZGF0ZShvbGRWYWx1ZTogdW5rbm93biwgbmV3VmFsdWU6IHVua25vd24sIGV4Y2VwdFVuZGVmaW5lZDogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgIGlmIChvbGRWYWx1ZSAhPT0gbmV3VmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIChleGNlcHRVbmRlZmluZWQgJiYgdW5kZWZpbmVkID09PSBvbGRWYWx1ZSk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIG1lcmdlIEFycmF5ICovXG5mdW5jdGlvbiBtZXJnZUFycmF5KHRhcmdldDogdW5rbm93bltdLCBzb3VyY2U6IHVua25vd25bXSk6IHVua25vd25bXSB7XG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHNvdXJjZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtpXTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBtZXJnZShvbGRWYWx1ZSwgc291cmNlW2ldKTtcbiAgICAgICAgIW5lZWRVcGRhdGUob2xkVmFsdWUsIG5ld1ZhbHVlLCBmYWxzZSkgfHwgKHRhcmdldFtpXSA9IG5ld1ZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuLyoqIEBpbnRlcm5hbCBtZXJnZSBTZXQgKi9cbmZ1bmN0aW9uIG1lcmdlU2V0KHRhcmdldDogU2V0PHVua25vd24+LCBzb3VyY2U6IFNldDx1bmtub3duPik6IFNldDx1bmtub3duPiB7XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHNvdXJjZSkge1xuICAgICAgICB0YXJnZXQuaGFzKGl0ZW0pIHx8IHRhcmdldC5hZGQobWVyZ2UodW5kZWZpbmVkLCBpdGVtKSk7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgbWVyZ2UgTWFwICovXG5mdW5jdGlvbiBtZXJnZU1hcCh0YXJnZXQ6IE1hcDx1bmtub3duLCB1bmtub3duPiwgc291cmNlOiBNYXA8dW5rbm93biwgdW5rbm93bj4pOiBNYXA8dW5rbm93biwgdW5rbm93bj4ge1xuICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIHNvdXJjZSkge1xuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldC5nZXQoayk7XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWVyZ2Uob2xkVmFsdWUsIHYpO1xuICAgICAgICAhbmVlZFVwZGF0ZShvbGRWYWx1ZSwgbmV3VmFsdWUsIGZhbHNlKSB8fCB0YXJnZXQuc2V0KGssIG5ld1ZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuLyoqIEBpbnRlcm5hbCBtZXJnZSBvYmplY3QgcHJvcGVydHkgKi9cbmZ1bmN0aW9uIG1lcmdlT2JqZWN0UHJvcGVydHkodGFyZ2V0OiBVbmtub3duT2JqZWN0LCBzb3VyY2U6IFVua25vd25PYmplY3QsIGtleTogc3RyaW5nIHwgbnVtYmVyIHwgc3ltYm9sKTogdm9pZCB7XG4gICAgaWYgKCdfX3Byb3RvX18nICE9PSBrZXkgJiYgJ2NvbnN0cnVjdG9yJyAhPT0ga2V5KSB7XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0W2tleV07XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWVyZ2Uob2xkVmFsdWUsIHNvdXJjZVtrZXldKTtcbiAgICAgICAgIW5lZWRVcGRhdGUob2xkVmFsdWUsIG5ld1ZhbHVlLCB0cnVlKSB8fCAodGFyZ2V0W2tleV0gPSBuZXdWYWx1ZSk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgZGVlcE1lcmdlKCkgKi9cbmZ1bmN0aW9uIG1lcmdlKHRhcmdldDogdW5rbm93biwgc291cmNlOiB1bmtub3duKTogdW5rbm93biB7XG4gICAgaWYgKHVuZGVmaW5lZCA9PT0gc291cmNlIHx8IHRhcmdldCA9PT0gc291cmNlKSB7XG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuICAgIGlmICghaXNPYmplY3Qoc291cmNlKSkge1xuICAgICAgICByZXR1cm4gc291cmNlO1xuICAgIH1cbiAgICAvLyBQcmltaXRpdmUgV3JhcHBlciBPYmplY3RzIC8gRGF0ZVxuICAgIGlmIChzb3VyY2UudmFsdWVPZigpICE9PSBzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIGRlZXBFcXVhbCh0YXJnZXQsIHNvdXJjZSkgPyB0YXJnZXQgOiBuZXcgKHNvdXJjZS5jb25zdHJ1Y3RvciBhcyBPYmplY3RDb25zdHJ1Y3Rvcikoc291cmNlLnZhbHVlT2YoKSk7XG4gICAgfVxuICAgIC8vIFJlZ0V4cFxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgcmV0dXJuIGRlZXBFcXVhbCh0YXJnZXQsIHNvdXJjZSkgPyB0YXJnZXQgOiBjbG9uZVJlZ0V4cChzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBBcnJheUJ1ZmZlclxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IGNsb25lQXJyYXlCdWZmZXIoc291cmNlKTtcbiAgICB9XG4gICAgLy8gQXJyYXlCdWZmZXJWaWV3XG4gICAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBkZWVwRXF1YWwodGFyZ2V0LCBzb3VyY2UpID8gdGFyZ2V0IDogaXNUeXBlZEFycmF5KHNvdXJjZSkgPyBjbG9uZVR5cGVkQXJyYXkoc291cmNlKSA6IGNsb25lRGF0YVZpZXcoc291cmNlIGFzIERhdGFWaWV3KTtcbiAgICB9XG4gICAgLy8gQXJyYXlcbiAgICBpZiAoQXJyYXkuaXNBcnJheShzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBtZXJnZUFycmF5KGlzQXJyYXkodGFyZ2V0KSA/IHRhcmdldCA6IFtdLCBzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBTZXRcbiAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgU2V0KSB7XG4gICAgICAgIHJldHVybiBtZXJnZVNldCh0YXJnZXQgaW5zdGFuY2VvZiBTZXQgPyB0YXJnZXQgOiBuZXcgU2V0KCksIHNvdXJjZSk7XG4gICAgfVxuICAgIC8vIE1hcFxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgICAgcmV0dXJuIG1lcmdlTWFwKHRhcmdldCBpbnN0YW5jZW9mIE1hcCA/IHRhcmdldCA6IG5ldyBNYXAoKSwgc291cmNlKTtcbiAgICB9XG5cbiAgICBjb25zdCBvYmogPSBpc09iamVjdCh0YXJnZXQpID8gdGFyZ2V0IDoge307XG4gICAgaWYgKHNhbWVDbGFzcyh0YXJnZXQsIHNvdXJjZSkpIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc291cmNlKSkge1xuICAgICAgICAgICAgbWVyZ2VPYmplY3RQcm9wZXJ0eShvYmogYXMgVW5rbm93bk9iamVjdCwgc291cmNlIGFzIFVua25vd25PYmplY3QsIGtleSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIG1lcmdlT2JqZWN0UHJvcGVydHkob2JqIGFzIFVua25vd25PYmplY3QsIHNvdXJjZSBhcyBVbmtub3duT2JqZWN0LCBrZXkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogQGVuIFJlY3Vyc2l2ZWx5IG1lcmdlcyBvd24gYW5kIGluaGVyaXRlZCBlbnVtZXJhYmxlIHN0cmluZyBrZXllZCBwcm9wZXJ0aWVzIG9mIHNvdXJjZSBvYmplY3RzIGludG8gdGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7lho3luLDnmoTjg57jg7zjgrjjgpLlrp/ooYxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBNZXJnZTxULCBTMSwgUzIsIFMzLCBTNCwgUzUsIFM2LCBTNywgUzgsIFM5PihcbiAgICB0YXJnZXQ6IFQsXG4gICAgLi4uc291cmNlczogW1MxLCBTMj8sIFMzPywgUzQ/LCBTNT8sIFM2PywgUzc/LCBTOD8sIFM5PywgLi4udW5rbm93bltdXVxuKTogVCAmIFMxICYgUzIgJiBTMyAmIFM0ICYgUzUgJiBTNiAmIFM3ICYgUzggJiBTOTtcbmV4cG9ydCBmdW5jdGlvbiBkZWVwTWVyZ2U8WD4odGFyZ2V0OiB1bmtub3duLCAuLi5zb3VyY2VzOiB1bmtub3duW10pOiBYO1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBNZXJnZSh0YXJnZXQ6IHVua25vd24sIC4uLnNvdXJjZXM6IHVua25vd25bXSk6IHVua25vd24ge1xuICAgIGxldCByZXN1bHQgPSB0YXJnZXQ7XG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2Ygc291cmNlcykge1xuICAgICAgICByZXN1bHQgPSBtZXJnZShyZXN1bHQsIHNvdXJjZSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgZGVlcCBjb3B5IGluc3RhbmNlIG9mIHNvdXJjZSBvYmplY3QuXG4gKiBAamEg44OH44Kj44O844OX44Kz44OU44O844Kq44OW44K444Kn44Kv44OI44Gu55Sf5oiQXG4gKlxuICogQHNlZSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvc3RydWN0dXJlZENsb25lXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWVwQ29weTxUPihzcmM6IFQpOiBUIHtcbiAgICByZXR1cm4gZGVlcE1lcmdlKHVuZGVmaW5lZCwgc3JjKTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQgdHlwZSB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIFVua25vd25PYmplY3QsXG4gICAgQWNjZXNzaWJsZSxcbiAgICBOdWxsaXNoLFxuICAgIFR5cGUsXG4gICAgQ2xhc3MsXG4gICAgQ29uc3RydWN0b3IsXG59IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIEBlbiBNaXhpbiBjbGFzcydzIGJhc2UgaW50ZXJmYWNlLlxuICogQGphIE1peGluIOOCr+ODqeOCueOBruWfuuW6leOCpOODs+OCv+ODvOODleOCp+OCpOOCueWumue+qVxuICovXG5leHBvcnQgZGVjbGFyZSBjbGFzcyBNaXhpbkNsYXNzIHtcbiAgICAvKipcbiAgICAgKiBAZW4gY2FsbCBtaXhpbiBzb3VyY2UgY2xhc3MncyBgc3VwZXIoKWAuIDxicj5cbiAgICAgKiAgICAgVGhpcyBtZXRob2Qgc2hvdWxkIGJlIGNhbGxlZCBmcm9tIGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSBNaXhpbiDjgq/jg6njgrnjga7ln7rlupXjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqkgPGJyPlxuICAgICAqICAgICDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jgYvjgonlkbzjgbbjgZPjgajjgpLmg7PlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzcmNDbGFzc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIHRhcmdldCBjbGFzcyBuYW1lLiBleCkgZnJvbSBTMSBhdmFpbGFibGVcbiAgICAgKiAgLSBgamFgIOOCs+ODs+OCueODiOODqeOCr+ODiOOBmeOCi+OCr+ODqeOCueWQjeOCkuaMh+WumiBleCkgUzEg44GL44KJ5oyH5a6a5Y+v6IO9XG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBwYXJhbWV0ZXJzXG4gICAgICogIC0gYGphYCDjgrPjg7Pjgrnjg4jjg6njgq/jg4jjgavkvb/nlKjjgZnjgovlvJXmlbBcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgc3VwZXI8VCBleHRlbmRzIENsYXNzPihzcmNDbGFzczogVCwgLi4uYXJnczogQ29uc3RydWN0b3JQYXJhbWV0ZXJzPFQ+KTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgaW5wdXQgY2xhc3MgaXMgbWl4aW5lZCAoZXhjbHVkaW5nIG93biBjbGFzcykuXG4gICAgICogQGphIOaMh+WumuOCr+ODqeOCueOBjCBNaXhpbiDjgZXjgozjgabjgYTjgovjgYvnorroqo0gKOiHqui6q+OBruOCr+ODqeOCueOBr+WQq+OBvuOCjOOBquOBhClcbiAgICAgKlxuICAgICAqIEBwYXJhbSBtaXhlZENsYXNzXG4gICAgICogIC0gYGVuYCBzZXQgdGFyZ2V0IGNsYXNzIGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDlr77osaHjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/jgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgaXNNaXhlZFdpdGg8VCBleHRlbmRzIG9iamVjdD4obWl4ZWRDbGFzczogQ29uc3RydWN0b3I8VD4pOiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBlbiBNaXhlZCBzdWIgY2xhc3MgY29uc3RydWN0b3IgZGVmaW5pdGlvbnMuXG4gKiBAamEg5ZCI5oiQ44GX44Gf44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWl4aW5Db25zdHJ1Y3RvcjxCIGV4dGVuZHMgQ2xhc3MsIFUgZXh0ZW5kcyBvYmplY3Q+IGV4dGVuZHMgVHlwZTxVPiB7XG4gICAgLyoqXG4gICAgICogQGVuIGNvbnN0cnVjdG9yXG4gICAgICogQGphIOOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGJhc2UgY2xhc3MgYXJndW1lbnRzXG4gICAgICogIC0gYGphYCDln7rlupXjgq/jg6njgrnjgavmjIflrprjgZfjgZ/lvJXmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdW5pb24gdHlwZSBvZiBjbGFzc2VzIHdoZW4gY2FsbGluZyB7QGxpbmsgbWl4aW5zfSgpXG4gICAgICogIC0gYGphYCB7QGxpbmsgbWl4aW5zfSgpIOOBq+a4oeOBl+OBn+OCr+ODqeOCueOBrumbhuWQiFxuICAgICAqL1xuICAgIG5ldyguLi5hcmdzOiBDb25zdHJ1Y3RvclBhcmFtZXRlcnM8Qj4pOiBVO1xufVxuXG4vKipcbiAqIEBlbiBEZWZpbml0aW9uIG9mIHtAbGluayBzZXRNaXhDbGFzc0F0dHJpYnV0ZX0gZnVuY3Rpb24ncyBhcmd1bWVudHMuXG4gKiBAamEge0BsaW5rIHNldE1peENsYXNzQXR0cmlidXRlfSDjga7lj5bjgorjgYbjgovlvJXmlbDlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNaXhDbGFzc0F0dHJpYnV0ZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFN1cHByZXNzIHByb3ZpZGluZyBjb25zdHJ1Y3Rvci10cmFwIGZvciB0aGUgbWl4aW4gc291cmNlIGNsYXNzLiBJbiB0aGlzIGNhc2UsIGBpc01peGVkV2l0aGAsIGBpbnN0YW5jZW9mYCBhbHNvIGJlY29tZXMgaW52YWxpZC4gKGZvciBpbXByb3ZpbmcgcGVyZm9ybWFuY2UpXG4gICAgICogQGphIE1peGluIFNvdXJjZSDjgq/jg6njgrnjgavlr77jgZfjgaYsIOOCs+ODs+OCueODiOODqeOCr+OCv+ODiOODqeODg+ODl+OCkuaKkeatoi4g44GT44KM44KS5oyH5a6a44GX44Gf5aC05ZCILCBgaXNNaXhlZFdpdGhgLCBgaW5zdGFuY2VvZmAg44KC54Sh5Yq544Gr44Gq44KLLiAo44OR44OV44Kp44O844Oe44Oz44K55pS55ZaEKVxuICAgICAqL1xuICAgIHByb3RvRXh0ZW5kc09ubHk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0dXAgW1N5bWJvbC5oYXNJbnN0YW5jZV0gcHJvcGVydHkuIDxicj5cbiAgICAgKiAgICAgVGhlIGNsYXNzIGRlc2lnbmF0ZWQgYXMgYSBzb3VyY2Ugb2Yge0BsaW5rIG1peGluc30oKSBoYXMgW1N5bWJvbC5oYXNJbnN0YW5jZV0gcHJvcGVydHkgaW1wbGljaXRseS4gPGJyPlxuICAgICAqICAgICBJdCdzIHVzZWQgdG8gYXZvaWQgYmVjb21pbmcgdGhlIGJlaGF2aW9yIGBpbnN0YW5jZW9mYCBkb2Vzbid0IGludGVuZCB3aGVuIHRoZSBjbGFzcyBpcyBleHRlbmRlZCBmcm9tIHRoZSBtaXhpbmVkIGNsYXNzIHRoZSBvdGhlciBwbGFjZS5cbiAgICAgKiBAamEgW1N5bWJvbC5oYXNJbnN0YW5jZV0g44OX44Ot44OR44OG44Kj6Kit5a6aPGJyPlxuICAgICAqICAgICB7QGxpbmsgbWl4aW5zfSgpIOOBruOCveODvOOCueOBq+aMh+WumuOBleOCjOOBn+OCr+ODqeOCueOBryBbU3ltYm9sLmhhc0luc3RhbmNlXSDjgpLmmpfpu5nnmoTjgavlgpnjgYjjgovjgZ/jgoE8YnI+XG4gICAgICogICAgIOOBneOBruOCr+ODqeOCueOBjOS7luOBp+e2meaJv+OBleOCjOOBpuOBhOOCi+WgtOWQiCBgaW5zdGFuY2VvZmAg44GM5oSP5Zuz44GX44Gq44GE5oyv44KL6Iie44GE44Go44Gq44KL44Gu44KS6YG/44GR44KL44Gf44KB44Gr5L2/55So44GZ44KLLlxuICAgICAqL1xuICAgIGluc3RhbmNlT2Y6ICgoaW5zdDogb2JqZWN0KSA9PiBib29sZWFuKSB8IE51bGxpc2g7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9vYmpQcm90b3R5cGUgICAgID0gT2JqZWN0LnByb3RvdHlwZTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2luc3RhbmNlT2YgICAgICAgPSBGdW5jdGlvbi5wcm90b3R5cGVbU3ltYm9sLmhhc0luc3RhbmNlXTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX292ZXJyaWRlICAgICAgICAgPSBTeW1ib2woJ292ZXJyaWRlJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9pc0luaGVyaXRlZCAgICAgID0gU3ltYm9sKCdpcy1pbmhlcml0ZWQnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NvbnN0cnVjdG9ycyAgICAgPSBTeW1ib2woJ2NvbnN0cnVjdG9ycycpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY2xhc3NCYXNlICAgICAgICA9IFN5bWJvbCgnY2xhc3MtYmFzZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY2xhc3NTb3VyY2VzICAgICA9IFN5bWJvbCgnY2xhc3Mtc291cmNlcycpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvdG9FeHRlbmRzT25seSA9IFN5bWJvbCgncHJvdG8tZXh0ZW5kcy1vbmx5Jyk7XG5cbi8qKiBAaW50ZXJuYWwgY29weSBwcm9wZXJ0aWVzIGNvcmUgKi9cbmZ1bmN0aW9uIHJlZmxlY3RQcm9wZXJ0aWVzKHRhcmdldDogVW5rbm93bk9iamVjdCwgc291cmNlOiBvYmplY3QsIGtleTogc3RyaW5nIHwgc3ltYm9sKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGFyZ2V0W2tleV0pIHtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzb3VyY2UsIGtleSkgYXMgUHJvcGVydHlEZWNvcmF0b3IpO1xuICAgICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIG5vb3BcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgb2JqZWN0IHByb3BlcnRpZXMgY29weSBtZXRob2QgKi9cbmZ1bmN0aW9uIGNvcHlQcm9wZXJ0aWVzKHRhcmdldDogb2JqZWN0LCBzb3VyY2U6IG9iamVjdCk6IHZvaWQge1xuICAgIHNvdXJjZSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhzb3VyY2UpXG4gICAgICAgIC5maWx0ZXIoa2V5ID0+ICEvKHByb3RvdHlwZXxuYW1lfGNvbnN0cnVjdG9yKS8udGVzdChrZXkpKVxuICAgICAgICAuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgcmVmbGVjdFByb3BlcnRpZXModGFyZ2V0IGFzIFVua25vd25PYmplY3QsIHNvdXJjZSwga2V5KTtcbiAgICAgICAgfSk7XG4gICAgc291cmNlICYmIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoc291cmNlKVxuICAgICAgICAuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgcmVmbGVjdFByb3BlcnRpZXModGFyZ2V0IGFzIFVua25vd25PYmplY3QsIHNvdXJjZSwga2V5KTtcbiAgICAgICAgfSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzZXRNaXhDbGFzc0F0dHJpYnV0ZSh0YXJnZXQsICdpbnN0YW5jZU9mJykgKi9cbmZ1bmN0aW9uIHNldEluc3RhbmNlT2Y8VCBleHRlbmRzIG9iamVjdD4odGFyZ2V0OiBDb25zdHJ1Y3RvcjxUPiwgbWV0aG9kOiAoKGluc3Q6IG9iamVjdCkgPT4gYm9vbGVhbikgfCBOdWxsaXNoKTogdm9pZCB7XG4gICAgY29uc3QgYmVoYXZpb3VyID0gbWV0aG9kID8/IChudWxsID09PSBtZXRob2QgPyB1bmRlZmluZWQgOiAoKGk6IG9iamVjdCkgPT4gT2JqZWN0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mLmNhbGwodGFyZ2V0LnByb3RvdHlwZSwgaSkpKTtcbiAgICBjb25zdCBhcHBsaWVkID0gYmVoYXZpb3VyICYmIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBfb3ZlcnJpZGUpO1xuICAgIGlmICghYXBwbGllZCkge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHtcbiAgICAgICAgICAgIFtTeW1ib2wuaGFzSW5zdGFuY2VdOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGJlaGF2aW91cixcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBbX292ZXJyaWRlXToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBiZWhhdmlvdXIgPyB0cnVlIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBTZXQgdGhlIE1peGluIGNsYXNzIGF0dHJpYnV0ZS5cbiAqIEBqYSBNaXhpbiDjgq/jg6njgrnjgavlr77jgZfjgablsZ7mgKfjgpLoqK3lrppcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIC8vICdwcm90b0V4dGVuZE9ubHknXG4gKiBjbGFzcyBCYXNlIHsgY29uc3RydWN0b3IoYSwgYikge30gfTtcbiAqIGNsYXNzIE1peEEgeyB9O1xuICogc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoTWl4QSwgJ3Byb3RvRXh0ZW5kc09ubHknKTsgIC8vIGZvciBpbXByb3ZpbmcgY29uc3RydWN0aW9uIHBlcmZvcm1hbmNlXG4gKiBjbGFzcyBNaXhCIHsgY29uc3RydWN0b3IoYywgZCkge30gfTtcbiAqXG4gKiBjbGFzcyBNaXhpbkNsYXNzIGV4dGVuZHMgbWl4aW5zKEJhc2UsIE1peEEsIE1peEIpIHtcbiAqICAgICBjb25zdHJ1Y3RvcihhLCBiLCBjLCBkKXtcbiAqICAgICAgICAgLy8gY2FsbGluZyBgQmFzZWAgY29uc3RydWN0b3JcbiAqICAgICAgICAgc3VwZXIoYSwgYik7XG4gKlxuICogICAgICAgICAvLyBjYWxsaW5nIE1peGluIGNsYXNzJ3MgY29uc3RydWN0b3JcbiAqICAgICAgICAgdGhpcy5zdXBlcihNaXhBKTsgICAgICAgIC8vIG5vIGFmZmVjdFxuICogICAgICAgICB0aGlzLnN1cGVyKE1peEIsIGMsIGQpO1xuICogICAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBtaXhlZCA9IG5ldyBNaXhpbkNsYXNzKCk7XG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE1peEEpOyAgICAvLyBmYWxzZVxuICogY29uc29sZS5sb2cobWl4ZWQuaXNNaXhlZFdpdGgoTWl4QSkpOyAgLy8gZmFsc2VcbiAqXG4gKiAvLyAnaW5zdGFuY2VPZidcbiAqIGNsYXNzIEJhc2Uge307XG4gKiBjbGFzcyBTb3VyY2Uge307XG4gKiBjbGFzcyBNaXhpbkNsYXNzIGV4dGVuZHMgbWl4aW5zKEJhc2UsIFNvdXJjZSkge307XG4gKlxuICogY2xhc3MgT3RoZXIgZXh0ZW5kcyBTb3VyY2Uge307XG4gKlxuICogY29uc3Qgb3RoZXIgPSBuZXcgT3RoZXIoKTtcbiAqIGNvbnN0IG1peGVkID0gbmV3IE1peGluQ2xhc3MoKTtcbiAqIGNvbnNvbGUubG9nKG90aGVyIGluc3RhbmNlb2YgU291cmNlKTsgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG90aGVyIGluc3RhbmNlb2YgT3RoZXIpOyAgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgTWl4aW5DbGFzcyk7ICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgQmFzZSk7ICAgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgU291cmNlKTsgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgT3RoZXIpOyAgICAgICAgIC8vIHRydWUgPz8/XG4gKlxuICogc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoT3RoZXIsICdpbnN0YW5jZU9mJyk7IC8vIG9yIHNldE1peENsYXNzQXR0cmlidXRlKE90aGVyLCAnaW5zdGFuY2VPZicsIG51bGwpO1xuICogY29uc29sZS5sb2cob3RoZXIgaW5zdGFuY2VvZiBTb3VyY2UpOyAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cob3RoZXIgaW5zdGFuY2VvZiBPdGhlcik7ICAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBPdGhlcik7ICAgICAgICAgLy8gZmFsc2UgIVxuICpcbiAqIC8vIFtCZXN0IFByYWN0aWNlXSBJZiB5b3UgZGVjbGFyZSB0aGUgZGVyaXZlZC1jbGFzcyBmcm9tIG1peGluLCB5b3Ugc2hvdWxkIGNhbGwgdGhlIGZ1bmN0aW9uIGZvciBhdm9pZGluZyBgaW5zdGFuY2VvZmAgbGltaXRhdGlvbi5cbiAqIGNsYXNzIERlcml2ZWRDbGFzcyBleHRlbmRzIE1peGluQ2xhc3Mge31cbiAqIHNldE1peENsYXNzQXR0cmlidXRlKERlcml2ZWRDbGFzcywgJ2luc3RhbmNlT2YnKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgc2V0IHRhcmdldCBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDoqK3lrprlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEBwYXJhbSBhdHRyXG4gKiAgLSBgZW5gOlxuICogICAgLSBgcHJvdG9FeHRlbmRzT25seWA6IFN1cHByZXNzIHByb3ZpZGluZyBjb25zdHJ1Y3Rvci10cmFwIGZvciB0aGUgbWl4aW4gc291cmNlIGNsYXNzLiAoZm9yIGltcHJvdmluZyBwZXJmb3JtYW5jZSlcbiAqICAgIC0gYGluc3RhbmNlT2ZgICAgICAgOiBmdW5jdGlvbiBieSB1c2luZyBbU3ltYm9sLmhhc0luc3RhbmNlXSA8YnI+XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgRGVmYXVsdCBiZWhhdmlvdXIgaXMgYHsgcmV0dXJuIHRhcmdldC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnN0YW5jZSkgfWBcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBJZiBzZXQgYG51bGxgLCBkZWxldGUgW1N5bWJvbC5oYXNJbnN0YW5jZV0gcHJvcGVydHkuXG4gKiAgLSBgamFgOlxuICogICAgLSBgcHJvdG9FeHRlbmRzT25seWA6IE1peGluIFNvdXJjZSDjgq/jg6njgrnjgavlr77jgZfjgaYsIOOCs+ODs+OCueODiOODqeOCr+OCv+ODiOODqeODg+ODl+OCkuaKkeatoiAo44OR44OV44Kp44O844Oe44Oz44K55pS55ZaEKVxuICogICAgLSBgaW5zdGFuY2VPZmAgICAgICA6IFtTeW1ib2wuaGFzSW5zdGFuY2VdIOOBjOS9v+eUqOOBmeOCi+mWouaVsOOCkuaMh+WumiA8YnI+XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAg5pei5a6a44Gn44GvIGB7IHJldHVybiB0YXJnZXQucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5zdGFuY2UpIH1gIOOBjOS9v+eUqOOBleOCjOOCi1xuICogICAgICAgICAgICAgICAgICAgICAgICAgYG51bGxgIOaMh+WumuOCkuOBmeOCi+OBqCBbU3ltYm9sLmhhc0luc3RhbmNlXSDjg5fjg63jg5Hjg4bjgqPjgpLliYrpmaTjgZnjgotcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldE1peENsYXNzQXR0cmlidXRlPFQgZXh0ZW5kcyBvYmplY3QsIFUgZXh0ZW5kcyBrZXlvZiBNaXhDbGFzc0F0dHJpYnV0ZT4oXG4gICAgdGFyZ2V0OiBDb25zdHJ1Y3RvcjxUPixcbiAgICBhdHRyOiBVLFxuICAgIG1ldGhvZD86IE1peENsYXNzQXR0cmlidXRlW1VdXG4pOiB2b2lkIHtcbiAgICBzd2l0Y2ggKGF0dHIpIHtcbiAgICAgICAgY2FzZSAncHJvdG9FeHRlbmRzT25seSc6XG4gICAgICAgICAgICAodGFyZ2V0IGFzIEFjY2Vzc2libGU8Q29uc3RydWN0b3I8VD4+KVtfcHJvdG9FeHRlbmRzT25seV0gPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2luc3RhbmNlT2YnOlxuICAgICAgICAgICAgc2V0SW5zdGFuY2VPZih0YXJnZXQsIG1ldGhvZCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gTWl4aW4gZnVuY3Rpb24gZm9yIG11bHRpcGxlIGluaGVyaXRhbmNlLiA8YnI+XG4gKiAgICAgUmVzb2x2aW5nIHR5cGUgc3VwcG9ydCBmb3IgbWF4aW11bSAxMCBjbGFzc2VzLlxuICogQGphIOWkmumHjee2meaJv+OBruOBn+OCgeOBriBNaXhpbiA8YnI+XG4gKiAgICAg5pyA5aSnIDEwIOOCr+ODqeOCueOBruWei+ino+axuuOCkuOCteODneODvOODiFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2xhc3MgQmFzZSB7IGNvbnN0cnVjdG9yKGEsIGIpIHt9IH07XG4gKiBjbGFzcyBNaXhBIHsgY29uc3RydWN0b3IoYSwgYikge30gfTtcbiAqIGNsYXNzIE1peEIgeyBjb25zdHJ1Y3RvcihjLCBkKSB7fSB9O1xuICpcbiAqIGNsYXNzIE1peGluQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoQmFzZSwgTWl4QSwgTWl4Qikge1xuICogICAgIGNvbnN0cnVjdG9yKGEsIGIsIGMsIGQpe1xuICogICAgICAgICAvLyBjYWxsaW5nIGBCYXNlYCBjb25zdHJ1Y3RvclxuICogICAgICAgICBzdXBlcihhLCBiKTtcbiAqXG4gKiAgICAgICAgIC8vIGNhbGxpbmcgTWl4aW4gY2xhc3MncyBjb25zdHJ1Y3RvclxuICogICAgICAgICB0aGlzLnN1cGVyKE1peEEsIGEsIGIpO1xuICogICAgICAgICB0aGlzLnN1cGVyKE1peEIsIGMsIGQpO1xuICogICAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBiYXNlXG4gKiAgLSBgZW5gIHByaW1hcnkgYmFzZSBjbGFzcy4gc3VwZXIoYXJncykgaXMgdGhpcyBjbGFzcydzIG9uZS5cbiAqICAtIGBqYWAg5Z+65bqV44Kv44Op44K544Kz44Oz44K544OI44Op44Kv44K/LiDlkIzlkI3jg5fjg63jg5Hjg4bjgqMsIOODoeOCveODg+ODieOBr+acgOWEquWFiOOBleOCjOOCiy4gc3VwZXIoYXJncykg44Gv44GT44Gu44Kv44Op44K544Gu44KC44Gu44GM5oyH5a6a5Y+v6IO9LlxuICogQHBhcmFtIHNvdXJjZXNcbiAqICAtIGBlbmAgbXVsdGlwbGUgZXh0ZW5kcyBjbGFzc1xuICogIC0gYGphYCDmi6HlvLXjgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIG1peGluZWQgY2xhc3MgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg5ZCI5oiQ44GV44KM44Gf44Kv44Op44K544Kz44Oz44K544OI44Op44Kv44K/XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtaXhpbnM8XG4gICAgQiBleHRlbmRzIENsYXNzLFxuICAgIFMxIGV4dGVuZHMgb2JqZWN0LFxuICAgIFMyIGV4dGVuZHMgb2JqZWN0LFxuICAgIFMzIGV4dGVuZHMgb2JqZWN0LFxuICAgIFM0IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM1IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM2IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM3IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM4IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM5IGV4dGVuZHMgb2JqZWN0PihcbiAgICBiYXNlOiBCLFxuICAgIC4uLnNvdXJjZXM6IFtcbiAgICAgICAgQ29uc3RydWN0b3I8UzE+LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTMj4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTMz4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTND4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNT4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNj4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNz4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTOD4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTOT4/LFxuICAgICAgICAuLi5hbnlbXVxuICAgIF0pOiBNaXhpbkNvbnN0cnVjdG9yPEIsIE1peGluQ2xhc3MgJiBJbnN0YW5jZVR5cGU8Qj4gJiBTMSAmIFMyICYgUzMgJiBTNCAmIFM1ICYgUzYgJiBTNyAmIFM4ICYgUzk+IHtcblxuICAgIGxldCBfaGFzU291cmNlQ29uc3RydWN0b3IgPSBmYWxzZTtcblxuICAgIGNsYXNzIF9NaXhpbkJhc2UgZXh0ZW5kcyAoYmFzZSBhcyB1bmtub3duIGFzIENvbnN0cnVjdG9yPE1peGluQ2xhc3M+KSB7XG5cbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBbX2NvbnN0cnVjdG9yc106IE1hcDxDb25zdHJ1Y3RvcjxvYmplY3Q+LCBVbmtub3duRnVuY3Rpb24gfCBudWxsPjtcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBbX2NsYXNzQmFzZV06IENvbnN0cnVjdG9yPG9iamVjdD47XG5cbiAgICAgICAgY29uc3RydWN0b3IoLi4uYXJnczogdW5rbm93bltdKSB7XG4gICAgICAgICAgICBzdXBlciguLi5hcmdzKTtcblxuICAgICAgICAgICAgY29uc3QgY29uc3RydWN0b3JzID0gbmV3IE1hcDxDb25zdHJ1Y3RvcjxvYmplY3Q+LCBVbmtub3duRnVuY3Rpb24+KCk7XG4gICAgICAgICAgICB0aGlzW19jb25zdHJ1Y3RvcnNdID0gY29uc3RydWN0b3JzO1xuICAgICAgICAgICAgdGhpc1tfY2xhc3NCYXNlXSA9IGJhc2U7XG5cbiAgICAgICAgICAgIGlmIChfaGFzU291cmNlQ29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNyY0NsYXNzIG9mIHNvdXJjZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzcmNDbGFzc1tfcHJvdG9FeHRlbmRzT25seV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhbmRsZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwbHk6ICh0YXJnZXQ6IHVua25vd24sIHRoaXNvYmo6IHVua25vd24sIGFyZ2xpc3Q6IHVua25vd25bXSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvYmogPSBuZXcgc3JjQ2xhc3MoLi4uYXJnbGlzdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcHlQcm9wZXJ0aWVzKHRoaXMsIG9iaik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHByb3h5IGZvciAnY29uc3RydWN0JyBhbmQgY2FjaGUgY29uc3RydWN0b3JcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9ycy5zZXQoc3JjQ2xhc3MsIG5ldyBQcm94eShzcmNDbGFzcywgaGFuZGxlciBhcyBQcm94eUhhbmRsZXI8b2JqZWN0PikpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcHJvdGVjdGVkIHN1cGVyPFQgZXh0ZW5kcyBDbGFzcz4oc3JjQ2xhc3M6IFQsIC4uLmFyZ3M6IENvbnN0cnVjdG9yUGFyYW1ldGVyczxUPik6IHRoaXMge1xuICAgICAgICAgICAgY29uc3QgbWFwID0gdGhpc1tfY29uc3RydWN0b3JzXTtcbiAgICAgICAgICAgIGNvbnN0IGN0b3IgPSBtYXAuZ2V0KHNyY0NsYXNzKTtcbiAgICAgICAgICAgIGlmIChjdG9yKSB7XG4gICAgICAgICAgICAgICAgY3Rvci5jYWxsKHRoaXMsIC4uLmFyZ3MpO1xuICAgICAgICAgICAgICAgIG1hcC5zZXQoc3JjQ2xhc3MsIG51bGwpOyAgICAvLyBwcmV2ZW50IGNhbGxpbmcgdHdpY2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIGlzTWl4ZWRXaXRoPFQgZXh0ZW5kcyBvYmplY3Q+KHNyY0NsYXNzOiBDb25zdHJ1Y3RvcjxUPik6IGJvb2xlYW4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uc3RydWN0b3IgPT09IHNyY0NsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzW19jbGFzc0Jhc2VdID09PSBzcmNDbGFzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1tfY2xhc3NTb3VyY2VzXS5yZWR1Y2UoKHAsIGMpID0+IHAgfHwgKHNyY0NsYXNzID09PSBjKSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIHN0YXRpYyBbU3ltYm9sLmhhc0luc3RhbmNlXShpbnN0YW5jZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZi5jYWxsKF9NaXhpbkJhc2UucHJvdG90eXBlLCBpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgW19pc0luaGVyaXRlZF08VCBleHRlbmRzIG9iamVjdD4oc3JjQ2xhc3M6IENvbnN0cnVjdG9yPFQ+KTogYm9vbGVhbiB7XG4gICAgICAgICAgICBjb25zdCBjdG9ycyA9IHRoaXNbX2NvbnN0cnVjdG9yc107XG4gICAgICAgICAgICBpZiAoY3RvcnMuaGFzKHNyY0NsYXNzKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCBjdG9yIG9mIGN0b3JzLmtleXMoKSkge1xuICAgICAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YuY2FsbChzcmNDbGFzcywgY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJpdmF0ZSBnZXQgW19jbGFzc1NvdXJjZXNdKCk6IENvbnN0cnVjdG9yPG9iamVjdD5bXSB7XG4gICAgICAgICAgICByZXR1cm4gWy4uLnRoaXNbX2NvbnN0cnVjdG9yc10ua2V5cygpXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoY29uc3Qgc3JjQ2xhc3Mgb2Ygc291cmNlcykge1xuICAgICAgICAvLyBwcm92aWRlIGN1c3RvbSBpbnN0YW5jZW9mXG4gICAgICAgIGNvbnN0IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNyY0NsYXNzLCBTeW1ib2wuaGFzSW5zdGFuY2UpO1xuICAgICAgICBpZiAoIWRlc2MgfHwgZGVzYy53cml0YWJsZSkge1xuICAgICAgICAgICAgY29uc3Qgb3JnSW5zdGFuY2VPZiA9IGRlc2MgPyBzcmNDbGFzc1tTeW1ib2wuaGFzSW5zdGFuY2VdIDogX2luc3RhbmNlT2Y7XG4gICAgICAgICAgICBzZXRJbnN0YW5jZU9mKHNyY0NsYXNzLCAoaW5zdDogVW5rbm93bk9iamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBvcmdJbnN0YW5jZU9mLmNhbGwoc3JjQ2xhc3MsIGluc3QpIHx8ICgoaW5zdD8uW19pc0luaGVyaXRlZF0pID8gKGluc3RbX2lzSW5oZXJpdGVkXSBhcyBVbmtub3duRnVuY3Rpb24pKHNyY0NsYXNzKSA6IGZhbHNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIHByb3ZpZGUgcHJvdG90eXBlXG4gICAgICAgIGNvcHlQcm9wZXJ0aWVzKF9NaXhpbkJhc2UucHJvdG90eXBlLCBzcmNDbGFzcy5wcm90b3R5cGUpO1xuICAgICAgICBsZXQgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHNyY0NsYXNzLnByb3RvdHlwZSk7XG4gICAgICAgIHdoaWxlIChfb2JqUHJvdG90eXBlICE9PSBwYXJlbnQpIHtcbiAgICAgICAgICAgIGNvcHlQcm9wZXJ0aWVzKF9NaXhpbkJhc2UucHJvdG90eXBlLCBwYXJlbnQpO1xuICAgICAgICAgICAgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHBhcmVudCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2hlY2sgY29uc3RydWN0b3JcbiAgICAgICAgaWYgKCFfaGFzU291cmNlQ29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIF9oYXNTb3VyY2VDb25zdHJ1Y3RvciA9ICFzcmNDbGFzc1tfcHJvdG9FeHRlbmRzT25seV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gX01peGluQmFzZSBhcyBhbnk7XG59XG4iLCJpbXBvcnQgeyBhc3NpZ25WYWx1ZSwgZGVlcEVxdWFsIH0gZnJvbSAnLi9kZWVwLWNpcmN1aXQnO1xuaW1wb3J0IHtcbiAgICBVbmtub3duT2JqZWN0LFxuICAgIEFjY2Vzc2libGUsXG4gICAgTnVsbGlzaCxcbiAgICBXcml0YWJsZSxcbiAgICBpc0FycmF5LFxuICAgIGlzT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG59IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgdmVyaWZ5IH0gZnJvbSAnLi92ZXJpZnknO1xuXG4vKipcbiAqIEBlbiBDaGVjayB3aGV0aGVyIGlucHV0IHNvdXJjZSBoYXMgYSBwcm9wZXJ0eS5cbiAqIEBqYSDlhaXlipvlhYPjgYzjg5fjg63jg5Hjg4bjgqPjgpLmjIHjgaPjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXMoc3JjOiB1bmtub3duLCBwcm9wTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIG51bGwgIT0gc3JjICYmIGlzT2JqZWN0KHNyYykgJiYgKHByb3BOYW1lIGluIHNyYyk7XG59XG5cbi8qKlxuICogQGVuIEdldCBzaGFsbG93IGNvcHkgb2YgYHRhcmdldGAgd2hpY2ggaGFzIG9ubHkgYHBpY2tLZXlzYC5cbiAqIEBqYSBgcGlja0tleXNgIOOBp+aMh+WumuOBleOCjOOBn+ODl+ODreODkeODhuOCo+OBruOBv+OCkuaMgeOBpCBgdGFyZ2V0YCDjga4gU2hhbGxvdyBDb3B5IOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgY29weSBzb3VyY2Ugb2JqZWN0XG4gKiAgLSBgamFgIOOCs+ODlOODvOWFg+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIHBpY2tLZXlzXG4gKiAgLSBgZW5gIGNvcHkgdGFyZ2V0IGtleXNcbiAqICAtIGBqYWAg44Kz44OU44O85a++6LGh44Gu44Kt44O85LiA6KanXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwaWNrPFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBrZXlvZiBUPih0YXJnZXQ6IFQsIC4uLnBpY2tLZXlzOiBLW10pOiBXcml0YWJsZTxQaWNrPFQsIEs+PiB7XG4gICAgdmVyaWZ5KCd0eXBlT2YnLCAnb2JqZWN0JywgdGFyZ2V0KTtcbiAgICByZXR1cm4gcGlja0tleXMucmVkdWNlKChvYmosIGtleSkgPT4ge1xuICAgICAgICBrZXkgaW4gdGFyZ2V0ICYmIGFzc2lnblZhbHVlKG9iaiwga2V5LCB0YXJnZXRba2V5XSk7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfSwge30gYXMgV3JpdGFibGU8UGljazxULCBLPj4pO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgc2hhbGxvdyBjb3B5IG9mIGB0YXJnZXRgIHdpdGhvdXQgYG9taXRLZXlzYC5cbiAqIEBqYSBgb21pdEtleXNgIOOBp+aMh+WumuOBleOCjOOBn+ODl+ODreODkeODhuOCo+S7peWkluOBruOCreODvOOCkuaMgeOBpCBgdGFyZ2V0YCDjga4gU2hhbGxvdyBDb3B5IOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgY29weSBzb3VyY2Ugb2JqZWN0XG4gKiAgLSBgamFgIOOCs+ODlOODvOWFg+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIG9taXRLZXlzXG4gKiAgLSBgZW5gIG9taXQgdGFyZ2V0IGtleXNcbiAqICAtIGBqYWAg5YmK6Zmk5a++6LGh44Gu44Kt44O85LiA6KanXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvbWl0PFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBrZXlvZiBUPih0YXJnZXQ6IFQsIC4uLm9taXRLZXlzOiBLW10pOiBXcml0YWJsZTxPbWl0PFQsIEs+PiB7XG4gICAgdmVyaWZ5KCd0eXBlT2YnLCAnb2JqZWN0JywgdGFyZ2V0KTtcbiAgICBjb25zdCBvYmogPSB7fSBhcyBXcml0YWJsZTxPbWl0PFQsIEs+PjtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0YXJnZXQpKSB7XG4gICAgICAgICFvbWl0S2V5cy5pbmNsdWRlcyhrZXkgYXMgSykgJiYgYXNzaWduVmFsdWUob2JqLCBrZXksICh0YXJnZXQgYXMgVW5rbm93bk9iamVjdClba2V5XSk7XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogQGVuIEludmVydCB0aGUga2V5cyBhbmQgdmFsdWVzIG9mIGFuIG9iamVjdC4gVGhlIHZhbHVlcyBtdXN0IGJlIHNlcmlhbGl6YWJsZS5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7jgq3jg7zjgajlgKTjgpLpgIbou6LjgZnjgosuIOOBmeOBueOBpuOBruWApOOBjOODpuODi+ODvOOCr+OBp+OBguOCi+OBk+OBqOOBjOWJjeaPkFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IG9iamVjdFxuICogIC0gYGphYCDlr77osaHjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGludmVydDxUIGV4dGVuZHMgb2JqZWN0ID0gVW5rbm93bk9iamVjdD4odGFyZ2V0OiBvYmplY3QpOiBUIHtcbiAgICBjb25zdCByZXN1bHQgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0YXJnZXQpKSB7XG4gICAgICAgIGFzc2lnblZhbHVlKHJlc3VsdCwgKHRhcmdldCBhcyBVbmtub3duT2JqZWN0KVtrZXldIGFzIChzdHJpbmcgfCBudW1iZXIgfCBzeW1ib2wpLCBrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0IGFzIFQ7XG59XG5cbi8qKlxuICogQGVuIEdldCBzaGFsbG93IGNvcHkgb2YgZGlmZmVyZW5jZSBiZXR3ZWVuIGBiYXNlYCBhbmQgYHNyY2AuXG4gKiBAamEgYGJhc2VgIOOBqCBgc3JjYCDjga7lt67liIbjg5fjg63jg5Hjg4bjgqPjgpLjgoLjgaTjgqrjg5bjgrjjgqfjgq/jg4jjga4gU2hhbGxvdyBDb3B5IOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBiYXNlXG4gKiAgLSBgZW5gIGJhc2Ugb2JqZWN0XG4gKiAgLSBgamFgIOWfuua6luOBqOOBquOCi+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugb2JqZWN0XG4gKiAgLSBgamFgIOOCs+ODlOODvOWFg+OCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlmZjxUIGV4dGVuZHMgb2JqZWN0PihiYXNlOiBULCBzcmM6IFBhcnRpYWw8VD4pOiBQYXJ0aWFsPFQ+IHtcbiAgICB2ZXJpZnkoJ3R5cGVPZicsICdvYmplY3QnLCBiYXNlKTtcbiAgICB2ZXJpZnkoJ3R5cGVPZicsICdvYmplY3QnLCBzcmMpO1xuXG4gICAgY29uc3QgcmV0dmFsOiBQYXJ0aWFsPFQ+ID0ge307XG5cbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzcmMpKSB7XG4gICAgICAgIGlmICghZGVlcEVxdWFsKChiYXNlIGFzIFVua25vd25PYmplY3QpW2tleV0sIChzcmMgYXMgVW5rbm93bk9iamVjdClba2V5XSkpIHtcbiAgICAgICAgICAgIGFzc2lnblZhbHVlKHJldHZhbCwga2V5LCAoc3JjIGFzIFVua25vd25PYmplY3QpW2tleV0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHNoYWxsb3cgY29weSBvZiBgYmFzZWAgd2l0aG91dCBgZHJvcFZhbHVlYC5cbiAqIEBqYSBgZHJvcFZhbHVlYCDjgafmjIflrprjgZXjgozjgZ/jg5fjg63jg5Hjg4bjgqPlgKTku6XlpJbjga7jgq3jg7zjgpLmjIHjgaQgYHRhcmdldGAg44GuIFNoYWxsb3cgQ29weSDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmFzZVxuICogIC0gYGVuYCBiYXNlIG9iamVjdFxuICogIC0gYGphYCDln7rmupbjgajjgarjgovjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBkcm9wVmFsdWVzXG4gKiAgLSBgZW5gIHRhcmdldCB2YWx1ZS4gZGVmYXVsdDogYHVuZGVmaW5lZGAuXG4gKiAgLSBgamFgIOWvvuixoeOBruWApC4g5pei5a6a5YCkOiBgdW5kZWZpbmVkYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZHJvcDxUIGV4dGVuZHMgb2JqZWN0PihiYXNlOiBULCAuLi5kcm9wVmFsdWVzOiB1bmtub3duW10pOiBQYXJ0aWFsPFQ+IHtcbiAgICB2ZXJpZnkoJ3R5cGVPZicsICdvYmplY3QnLCBiYXNlKTtcblxuICAgIGNvbnN0IHZhbHVlcyA9IFsuLi5kcm9wVmFsdWVzXTtcbiAgICBpZiAoIXZhbHVlcy5sZW5ndGgpIHtcbiAgICAgICAgdmFsdWVzLnB1c2godW5kZWZpbmVkKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXR2YWwgPSB7IC4uLmJhc2UgfSBhcyBBY2Nlc3NpYmxlPFBhcnRpYWw8VD4+O1xuXG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoYmFzZSkpIHtcbiAgICAgICAgZm9yIChjb25zdCB2YWwgb2YgdmFsdWVzKSB7XG4gICAgICAgICAgICBpZiAoZGVlcEVxdWFsKHZhbCwgcmV0dmFsW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJldHZhbFtrZXldO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLyoqXG4gKiBAZW4gSWYgdGhlIHZhbHVlIG9mIHRoZSBuYW1lZCBwcm9wZXJ0eSBpcyBhIGZ1bmN0aW9uIHRoZW4gaW52b2tlIGl0OyBvdGhlcndpc2UsIHJldHVybiBpdC5cbiAqIEBqYSBvYmplY3Qg44GuIHByb3BlcnR5IOOBjOODoeOCveODg+ODieOBquOCieOBneOBruWun+ihjOe1kOaenOOCkiwg44OX44Ot44OR44OG44Kj44Gq44KJ44Gd44Gu5YCk44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogLSBgZW5gIE9iamVjdCB0byBtYXliZSBpbnZva2UgZnVuY3Rpb24gYHByb3BlcnR5YCBvbi5cbiAqIC0gYGphYCDoqZXkvqHjgZnjgovjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBwcm9wZXJ0eVxuICogLSBgZW5gIFRoZSBmdW5jdGlvbiBieSBuYW1lIHRvIGludm9rZSBvbiBgb2JqZWN0YC5cbiAqIC0gYGphYCDoqZXkvqHjgZnjgovjg5fjg63jg5Hjg4bjgqPlkI1cbiAqIEBwYXJhbSBmYWxsYmFja1xuICogLSBgZW5gIFRoZSB2YWx1ZSB0byBiZSByZXR1cm5lZCBpbiBjYXNlIGBwcm9wZXJ0eWAgZG9lc24ndCBleGlzdCBvciBpcyB1bmRlZmluZWQuXG4gKiAtIGBqYWAg5a2Y5Zyo44GX44Gq44GL44Gj44Gf5aC05ZCI44GuIGZhbGxiYWNrIOWApFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzdWx0PFQgPSBhbnk+KHRhcmdldDogb2JqZWN0IHwgTnVsbGlzaCwgcHJvcGVydHk6IHN0cmluZyB8IHN0cmluZ1tdLCBmYWxsYmFjaz86IFQpOiBUIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgY29uc3QgcHJvcHMgPSBpc0FycmF5KHByb3BlcnR5KSA/IHByb3BlcnR5IDogW3Byb3BlcnR5XTtcbiAgICBpZiAoIXByb3BzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gaXNGdW5jdGlvbihmYWxsYmFjaykgPyBmYWxsYmFjay5jYWxsKHRhcmdldCkgOiBmYWxsYmFjaztcbiAgICB9XG5cbiAgICBjb25zdCByZXNvbHZlID0gKG86IHVua25vd24sIHA6IHVua25vd24pOiB1bmtub3duID0+IHtcbiAgICAgICAgcmV0dXJuIGlzRnVuY3Rpb24ocCkgPyBwLmNhbGwobykgOiBwO1xuICAgIH07XG5cbiAgICBsZXQgb2JqID0gdGFyZ2V0IGFzIFVua25vd25PYmplY3Q7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHByb3BzKSB7XG4gICAgICAgIGNvbnN0IHByb3AgPSBudWxsID09IG9iaiA/IHVuZGVmaW5lZCA6IG9ialtuYW1lXTtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gcHJvcCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUob2JqLCBmYWxsYmFjaykgYXMgVDtcbiAgICAgICAgfVxuICAgICAgICBvYmogPSByZXNvbHZlKG9iaiwgcHJvcCkgYXMgVW5rbm93bk9iamVjdDtcbiAgICB9XG4gICAgcmV0dXJuIG9iaiBhcyB1bmtub3duIGFzIFQ7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gY2FsbGFibGUoKTogdW5rbm93biB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11c2UtYmVmb3JlLWRlZmluZVxuICAgIHJldHVybiBhY2Nlc3NpYmxlO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBhY2Nlc3NpYmxlOiB1bmtub3duID0gbmV3IFByb3h5KGNhbGxhYmxlLCB7XG4gICAgZ2V0OiAodGFyZ2V0OiBhbnksIG5hbWUpID0+IHtcbiAgICAgICAgY29uc3QgcHJvcCA9IHRhcmdldFtuYW1lXTtcbiAgICAgICAgaWYgKG51bGwgIT0gcHJvcCkge1xuICAgICAgICAgICAgcmV0dXJuIHByb3A7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYWNjZXNzaWJsZTtcbiAgICAgICAgfVxuICAgIH0sXG59KTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gY3JlYXRlKCk6IHVua25vd24ge1xuICAgIGNvbnN0IHN0dWIgPSBuZXcgUHJveHkoe30sIHtcbiAgICAgICAgZ2V0OiAodGFyZ2V0OiBhbnksIG5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHByb3AgPSB0YXJnZXRbbmFtZV07XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBwcm9wKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb3A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2Nlc3NpYmxlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHN0dWIsICdzdHViJywge1xuICAgICAgICB2YWx1ZTogdHJ1ZSxcbiAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN0dWI7XG59XG5cbi8qKlxuICogQGVuIEdldCBzYWZlIGFjY2Vzc2libGUgb2JqZWN0LlxuICogQGphIOWuieWFqOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCquODluOCuOOCp+OCr+ODiOOBruWPluW+l1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3Qgc2FmZVdpbmRvdyA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuICogY29uc29sZS5sb2cobnVsbCAhPSBzYWZlV2luZG93LmRvY3VtZW50KTsgICAgLy8gdHJ1ZVxuICogY29uc3QgZGl2ID0gc2FmZVdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAqIGNvbnNvbGUubG9nKG51bGwgIT0gZGl2KTsgICAgLy8gdHJ1ZVxuICogYGBgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBBIHJlZmVyZW5jZSBvZiBhbiBvYmplY3Qgd2l0aCBhIHBvc3NpYmlsaXR5IHdoaWNoIGV4aXN0cy5cbiAqICAtIGBqYWAg5a2Y5Zyo44GX44GG44KL44Kq44OW44K444Kn44Kv44OI44Gu5Y+C54WnXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZWFsaXR5IG9yIHN0dWIgaW5zdGFuY2UuXG4gKiAgLSBgamFgIOWun+S9k+OBvuOBn+OBr+OCueOCv+ODluOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FmZTxUPih0YXJnZXQ6IFQpOiBUIHtcbiAgICByZXR1cm4gdGFyZ2V0IHx8IGNyZWF0ZSgpIGFzIFQ7XG59XG4iLCJpbXBvcnQgeyBVbmtub3duRnVuY3Rpb24gfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGdldEdsb2JhbCB9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7IHNhZmUgfSBmcm9tICcuL3NhZmUnO1xuXG4vKipcbiAqIEBlbiBUeXBlIG9mIGhhbmRsZSBmb3IgdGltZXIgZnVuY3Rpb25zLlxuICogQGphIOOCv+OCpOODnuODvOmWouaVsOOBq+S9v+eUqOOBmeOCi+ODj+ODs+ODieODq+Wei1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRpbWVySGFuZGxlIHsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1pbnRlcmZhY2VcblxuLyoqXG4gKiBAZW4gVHlwZSBvZiB0aW1lciBzdGFydCBmdW5jdGlvbnMuXG4gKiBAamEg44K/44Kk44Oe44O86ZaL5aeL6Zai5pWw44Gu5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFRpbWVyU3RhcnRGdW5jdGlvbiA9IChoYW5kbGVyOiBVbmtub3duRnVuY3Rpb24sIHRpbWVvdXQ/OiBudW1iZXIsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gVGltZXJIYW5kbGU7XG5cbi8qKlxuICogQGVuIFR5cGUgb2YgdGltZXIgc3RvcCBmdW5jdGlvbnMuXG4gKiBAamEg44K/44Kk44Oe44O85YGc5q2i6Zai5pWw44Gu5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFRpbWVyU3RvcEZ1bmN0aW9uID0gKGhhbmRsZTogVGltZXJIYW5kbGUpID0+IHZvaWQ7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBUaW1lckNvbnRleHQge1xuICAgIHNldFRpbWVvdXQ6IFRpbWVyU3RhcnRGdW5jdGlvbjtcbiAgICBjbGVhclRpbWVvdXQ6IFRpbWVyU3RvcEZ1bmN0aW9uO1xuICAgIHNldEludGVydmFsOiBUaW1lclN0YXJ0RnVuY3Rpb247XG4gICAgY2xlYXJJbnRlcnZhbDogVGltZXJTdG9wRnVuY3Rpb247XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Jvb3QgPSBnZXRHbG9iYWwoKSBhcyB1bmtub3duIGFzIFRpbWVyQ29udGV4dDtcbmNvbnN0IHNldFRpbWVvdXQ6IFRpbWVyU3RhcnRGdW5jdGlvbiAgID0gc2FmZShfcm9vdC5zZXRUaW1lb3V0KS5iaW5kKF9yb290KTtcbmNvbnN0IGNsZWFyVGltZW91dDogVGltZXJTdG9wRnVuY3Rpb24gID0gc2FmZShfcm9vdC5jbGVhclRpbWVvdXQpLmJpbmQoX3Jvb3QpO1xuY29uc3Qgc2V0SW50ZXJ2YWw6IFRpbWVyU3RhcnRGdW5jdGlvbiAgPSBzYWZlKF9yb290LnNldEludGVydmFsKS5iaW5kKF9yb290KTtcbmNvbnN0IGNsZWFySW50ZXJ2YWw6IFRpbWVyU3RvcEZ1bmN0aW9uID0gc2FmZShfcm9vdC5jbGVhckludGVydmFsKS5iaW5kKF9yb290KTtcblxuZXhwb3J0IHtcbiAgICBzZXRUaW1lb3V0LFxuICAgIGNsZWFyVGltZW91dCxcbiAgICBzZXRJbnRlcnZhbCxcbiAgICBjbGVhckludGVydmFsLFxufTtcbiIsImltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIFByaW1pdGl2ZSxcbiAgICBUeXBlZERhdGEsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNCb29sZWFuLFxuICAgIGlzT2JqZWN0LFxufSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGludmVydCB9IGZyb20gJy4vb2JqZWN0JztcbmltcG9ydCB7XG4gICAgVGltZXJIYW5kbGUsXG4gICAgc2V0VGltZW91dCxcbiAgICBjbGVhclRpbWVvdXQsXG59IGZyb20gJy4vdGltZXInO1xuXG4vKipcbiAqIEBlbiBFbnN1cmUgYXN5bmNocm9ub3VzIGV4ZWN1dGlvbi5cbiAqIEBqYSDpnZ7lkIzmnJ/lrp/ooYzjgpLkv53oqLxcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIHZvaWQgcG9zdCgoKSA9PiBleGVjKGFyZykpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIGltcGxlbWVudCBhcyBmdW5jdGlvbiBzY29wZS5cbiAqICAtIGBqYWAg6Zai5pWw44K544Kz44O844OX44Go44GX44Gm5a6f6KOFXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3Q8VD4oZXhlY3V0b3I6ICgpID0+IFQpOiBQcm9taXNlPFQ+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkudGhlbihleGVjdXRvcik7XG59XG5cbi8qKlxuICogQGVuIEdlbmVyaWMgTm8tT3BlcmF0aW9uLlxuICogQGphIOaxjueUqCBOby1PcGVyYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vb3AoLi4uYXJnczogdW5rbm93bltdKTogYW55IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAvLyBub29wXG59XG5cbi8qKlxuICogQGVuIFdhaXQgZm9yIHRoZSBkZXNpZ25hdGlvbiBlbGFwc2UuXG4gKiBAamEg5oyH5a6a5pmC6ZaT5Yem55CG44KS5b6F5qmfXG4gKlxuICogQHBhcmFtIGVsYXBzZVxuICogIC0gYGVuYCB3YWl0IGVsYXBzZSBbbXNlY10uXG4gKiAgLSBgamFgIOW+heapn+aZgumWkyBbbXNlY11cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNsZWVwKGVsYXBzZTogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBlbGFwc2UpKTtcbn1cblxuLyoqXG4gKiBAZW4gT3B0aW9uIGludGVyZmFjZSBmb3Ige0BsaW5rIGRlYm91bmNlfSgpLlxuICogQGphIHtAbGluayBkZWJvdW5jZX0oKSDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7PjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEZWJvdW5jZU9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIEBlbiB0aGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlIGRlbGF5ZWQgYmVmb3JlIGl0J3MgaW52b2tlZC5cbiAgICAgKiBAamEg44Kz44O844Or44OQ44OD44Kv44Gu5ZG844Gz5Ye644GX44KS5b6F44Gk5pyA5aSn5pmC6ZaTXG4gICAgICovXG4gICAgbWF4V2FpdD86IG51bWJlcjtcbiAgICAvKipcbiAgICAgKiBAZW4gU3BlY2lmeSBgdHJ1ZWAgaWYgeW91IHdhbnQgdG8gY2FsbCB0aGUgY2FsbGJhY2sgbGVhZGluZyBlZGdlIG9mIHRoZSB3YWl0aW5nIHRpbWUuIChkZWZhdWx0OiBmYWxzZSlcbiAgICAgKiBAamEg5b6F44Gh5pmC6ZaT44Gr5a++44GX44Gm44Kz44O844Or44OQ44OD44Kv44KS5YWI5ZG844Gz5a6f6KGM44GZ44KL5aC05ZCI44GvIGB0cnVlYCDjgpLmjIflrpouIChkZWZhdWx0OiBmYWxzZSlcbiAgICAgKi9cbiAgICBsZWFkaW5nPzogYm9vbGVhbjtcbiAgICAvKipcbiAgICAgKiBAZW4gU3BlY2lmeSBgdHJ1ZWAgaWYgeW91IHdhbnQgdG8gY2FsbCB0aGUgY2FsbGJhY2sgdHJhaWxpbmcgZWRnZSBvZiB0aGUgd2FpdGluZyB0aW1lLiAoZGVmYXVsdDogdHJ1ZSlcbiAgICAgKiBAamEg5b6F44Gh5pmC6ZaT44Gr5a++44GX44Gm44Kz44O844Or44OQ44OD44Kv44KS5b6M5ZG844Gz5a6f6KGM44GZ44KL5aC05ZCI44GvIGB0cnVlYCDjgpLmjIflrpouIChkZWZhdWx0OiB0cnVlKVxuICAgICAqL1xuICAgIHRyYWlsaW5nPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IHR5cGUgRGVib3VuY2VkRnVuY3Rpb248VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4gPSBUICYgeyBjYW5jZWwoKTogdm9pZDsgZmx1c2goKTogUmV0dXJuVHlwZTxUPjsgcGVuZGluZygpOiBib29sZWFuOyB9O1xuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIGFzIGxvbmcgYXMgaXQgY29udGludWVzIHRvIGJlIGludm9rZWQsIHdpbGwgbm90IGJlIHRyaWdnZXJlZC5cbiAqIEBqYSDlkbzjgbPlh7rjgZXjgozjgabjgYvjgokgd2FpdCBbbXNlY10g57WM6YGO44GZ44KL44G+44Gn5a6f6KGM44GX44Gq44GE6Zai5pWw44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIHNlZWQgZnVuY3Rpb24uXG4gKiAgLSBgamFgIOWvvuixoeOBrumWouaVsFxuICogQHBhcmFtIHdhaXRcbiAqICAtIGBlbmAgd2FpdCBlbGFwc2UgW21zZWNdLlxuICogIC0gYGphYCDlvoXmqZ/mmYLplpMgW21zZWNdXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBzcGVjaWZ5IHtAbGluayBEZWJvdW5jZU9wdGlvbnN9IG9iamVjdCBvciBgdHJ1ZWAgdG8gZmlyZSB0aGUgY2FsbGJhY2sgaW1tZWRpYXRlbHkuXG4gKiAgLSBgamFgIHtAbGluayBEZWJvdW5jZU9wdGlvbnN9IG9iamVjdCDjgoLjgZfjgY/jga/ljbPmmYLjgavjgrPjg7zjg6vjg5Djg4Pjgq/jgpLnmbrngavjgZnjgovjgajjgY3jga8gYHRydWVgIOOCkuaMh+Wumi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlYm91bmNlPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGV4ZWN1dG9yOiBULCB3YWl0OiBudW1iZXIsIG9wdGlvbnM/OiBEZWJvdW5jZU9wdGlvbnMgfCBib29sZWFuKTogRGVib3VuY2VkRnVuY3Rpb248VD4ge1xuICAgIHR5cGUgUmVzdWx0ID0gUmV0dXJuVHlwZTxUPiB8IHVuZGVmaW5lZDtcblxuICAgIGxldCBsYXN0QXJnczogdW5rbm93bjtcbiAgICBsZXQgbGFzdFRoaXM6IHVua25vd247XG4gICAgbGV0IHJlc3VsdDogUmVzdWx0O1xuICAgIGxldCBsYXN0Q2FsbFRpbWU6IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgICBsZXQgdGltZXJJZDogVGltZXJIYW5kbGUgfCB1bmRlZmluZWQ7XG4gICAgbGV0IGxhc3RJbnZva2VUaW1lID0gMDtcblxuICAgIGNvbnN0IHdhaXRWYWx1ZSA9IE51bWJlcih3YWl0KSB8fCAwO1xuXG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBsZWFkaW5nOiBmYWxzZSwgdHJhaWxpbmc6IHRydWUgfSwgKGlzQm9vbGVhbihvcHRpb25zKSA/IHsgbGVhZGluZzogb3B0aW9ucywgdHJhaWxpbmc6ICFvcHRpb25zIH0gOiBvcHRpb25zKSk7XG4gICAgY29uc3QgeyBsZWFkaW5nLCB0cmFpbGluZyB9ID0gb3B0cztcbiAgICBjb25zdCBtYXhXYWl0ID0gbnVsbCAhPSBvcHRzLm1heFdhaXQgPyBNYXRoLm1heChOdW1iZXIob3B0cy5tYXhXYWl0KSB8fCAwLCB3YWl0VmFsdWUpIDogbnVsbDtcblxuICAgIGNvbnN0IGludm9rZUZ1bmMgPSAodGltZTogbnVtYmVyKTogUmVzdWx0ID0+IHtcbiAgICAgICAgY29uc3QgYXJncyA9IGxhc3RBcmdzO1xuICAgICAgICBjb25zdCB0aGlzQXJnID0gbGFzdFRoaXM7XG5cbiAgICAgICAgbGFzdEFyZ3MgPSBsYXN0VGhpcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgbGFzdEludm9rZVRpbWUgPSB0aW1lO1xuICAgICAgICByZXN1bHQgPSBleGVjdXRvci5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgY29uc3QgcmVtYWluaW5nV2FpdCA9ICh0aW1lOiBudW1iZXIpOiBudW1iZXIgPT4ge1xuICAgICAgICBjb25zdCB0aW1lU2luY2VMYXN0Q2FsbCA9IHRpbWUgLSBsYXN0Q2FsbFRpbWUhO1xuICAgICAgICBjb25zdCB0aW1lU2luY2VMYXN0SW52b2tlID0gdGltZSAtIGxhc3RJbnZva2VUaW1lO1xuICAgICAgICBjb25zdCB0aW1lV2FpdGluZyA9IHdhaXRWYWx1ZSAtIHRpbWVTaW5jZUxhc3RDYWxsO1xuICAgICAgICByZXR1cm4gbnVsbCAhPSBtYXhXYWl0ID8gTWF0aC5taW4odGltZVdhaXRpbmcsIG1heFdhaXQgLSB0aW1lU2luY2VMYXN0SW52b2tlKSA6IHRpbWVXYWl0aW5nO1xuICAgIH07XG5cbiAgICBjb25zdCBzaG91bGRJbnZva2UgPSAodGltZTogbnVtYmVyKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIGlmICh1bmRlZmluZWQgPT09IGxhc3RDYWxsVGltZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdGltZVNpbmNlTGFzdENhbGwgPSB0aW1lIC0gbGFzdENhbGxUaW1lO1xuICAgICAgICBjb25zdCB0aW1lU2luY2VMYXN0SW52b2tlID0gdGltZSAtIGxhc3RJbnZva2VUaW1lO1xuICAgICAgICByZXR1cm4gdGltZVNpbmNlTGFzdENhbGwgPj0gd2FpdFZhbHVlIHx8IHRpbWVTaW5jZUxhc3RDYWxsIDwgMCB8fCAobWF4V2FpdCAhPT0gbnVsbCAmJiB0aW1lU2luY2VMYXN0SW52b2tlID49IG1heFdhaXQpO1xuICAgIH07XG5cbiAgICBjb25zdCB0cmFpbGluZ0VkZ2UgPSAodGltZTogbnVtYmVyKTogUmVzdWx0ID0+IHtcbiAgICAgICAgdGltZXJJZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHRyYWlsaW5nICYmIGxhc3RBcmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gaW52b2tlRnVuYyh0aW1lKTtcbiAgICAgICAgfVxuICAgICAgICBsYXN0QXJncyA9IGxhc3RUaGlzID0gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICBjb25zdCB0aW1lckV4cGlyZWQgPSAoKTogUmVzdWx0IHwgdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IHRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgICBpZiAoc2hvdWxkSW52b2tlKHRpbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJhaWxpbmdFZGdlKHRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgcmVtYWluaW5nV2FpdCh0aW1lKSk7XG4gICAgfTtcblxuICAgIGNvbnN0IGxlYWRpbmdFZGdlID0gKHRpbWU6IG51bWJlcik6IFJlc3VsdCA9PiB7XG4gICAgICAgIGxhc3RJbnZva2VUaW1lID0gdGltZTtcbiAgICAgICAgdGltZXJJZCA9IHNldFRpbWVvdXQodGltZXJFeHBpcmVkLCB3YWl0VmFsdWUpO1xuICAgICAgICByZXR1cm4gbGVhZGluZyA/IGludm9rZUZ1bmModGltZSkgOiByZXN1bHQ7XG4gICAgfTtcblxuICAgIGNvbnN0IGNhbmNlbCA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gdGltZXJJZCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVySWQpO1xuICAgICAgICB9XG4gICAgICAgIGxhc3RJbnZva2VUaW1lID0gMDtcbiAgICAgICAgbGFzdEFyZ3MgPSBsYXN0Q2FsbFRpbWUgPSBsYXN0VGhpcyA9IHRpbWVySWQgPSB1bmRlZmluZWQ7XG4gICAgfTtcblxuICAgIGNvbnN0IGZsdXNoID0gKCk6IFJlc3VsdCA9PiB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQgPT09IHRpbWVySWQgPyByZXN1bHQgOiB0cmFpbGluZ0VkZ2UoRGF0ZS5ub3coKSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHBlbmRpbmcgPSAoKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIHJldHVybiBudWxsICE9IHRpbWVySWQ7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGRlYm91bmNlZCh0aGlzOiB1bmtub3duLCAuLi5hcmdzOiB1bmtub3duW10pOiBSZXN1bHQge1xuICAgICAgICBjb25zdCB0aW1lID0gRGF0ZS5ub3coKTtcbiAgICAgICAgY29uc3QgaXNJbnZva2luZyA9IHNob3VsZEludm9rZSh0aW1lKTtcblxuICAgICAgICBsYXN0QXJncyA9IGFyZ3M7XG4gICAgICAgIGxhc3RUaGlzID0gdGhpczsgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1pbnZhbGlkLXRoaXMsIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgICAgIGxhc3RDYWxsVGltZSA9IHRpbWU7XG5cbiAgICAgICAgaWYgKGlzSW52b2tpbmcpIHtcbiAgICAgICAgICAgIGlmIChudWxsID09IHRpbWVySWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVhZGluZ0VkZ2UobGFzdENhbGxUaW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtYXhXYWl0KSB7XG4gICAgICAgICAgICAgICAgdGltZXJJZCA9IHNldFRpbWVvdXQodGltZXJFeHBpcmVkLCB3YWl0VmFsdWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBpbnZva2VGdW5jKGxhc3RDYWxsVGltZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bGwgPT0gdGltZXJJZCkge1xuICAgICAgICAgICAgdGltZXJJZCA9IHNldFRpbWVvdXQodGltZXJFeHBpcmVkLCB3YWl0VmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgZGVib3VuY2VkLmNhbmNlbCA9IGNhbmNlbDtcbiAgICBkZWJvdW5jZWQuZmx1c2ggPSBmbHVzaDtcbiAgICBkZWJvdW5jZWQucGVuZGluZyA9IHBlbmRpbmc7XG5cbiAgICByZXR1cm4gZGVib3VuY2VkIGFzIERlYm91bmNlZEZ1bmN0aW9uPFQ+O1xufVxuXG4vKipcbiAqIEBlbiBPcHRpb24gaW50ZXJmYWNlIGZvciB7QGxpbmsgdGhyb3R0bGV9KCkuXG4gKiBAamEge0BsaW5rIHRocm90dGxlfSgpIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs+OCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRocm90dGxlT3B0aW9ucyB7XG4gICAgLyoqXG4gICAgICogQGVuIFNwZWNpZnkgYHRydWVgIGlmIHlvdSB3YW50IHRvIGNhbGwgdGhlIGNhbGxiYWNrIGxlYWRpbmcgZWRnZSBvZiB0aGUgd2FpdGluZyB0aW1lLiAoZGVmYXVsdDogdHJ1ZSlcbiAgICAgKiBAamEg5b6F44Gh5pmC6ZaT44Gr5a++44GX44Gm44Kz44O844Or44OQ44OD44Kv44KS5YWI5ZG844Gz5a6f6KGM44GZ44KL5aC05ZCI44GvIGB0cnVlYCDjgpLmjIflrpouIChkZWZhdWx0OiB0cnVlKVxuICAgICAqL1xuICAgIGxlYWRpbmc/OiBib29sZWFuO1xuICAgIC8qKlxuICAgICAqIEBlbiBTcGVjaWZ5IGB0cnVlYCBpZiB5b3Ugd2FudCB0byBjYWxsIHRoZSBjYWxsYmFjayB0cmFpbGluZyBlZGdlIG9mIHRoZSB3YWl0aW5nIHRpbWUuIChkZWZhdWx0OiB0cnVlKVxuICAgICAqIEBqYSDlvoXjgaHmmYLplpPjgavlr77jgZfjgabjgrPjg7zjg6vjg5Djg4Pjgq/jgpLlvozlkbzjgbPlrp/ooYzjgZnjgovloLTlkIjjga8gYHRydWVgIOOCkuaMh+Wumi4gKGRlZmF1bHQ6IHRydWUpXG4gICAgICovXG4gICAgdHJhaWxpbmc/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIHdoZW4gaW52b2tlZCwgd2lsbCBvbmx5IGJlIHRyaWdnZXJlZCBhdCBtb3N0IG9uY2UgZHVyaW5nIGEgZ2l2ZW4gdGltZS5cbiAqIEBqYSDplqLmlbDjga7lrp/ooYzjgpIgd2FpdCBbbXNlY10g44GrMeWbnuOBq+WItumZkFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgdGhyb3R0bGVkID0gdGhyb3R0bGUodXBhdGVQb3NpdGlvbiwgMTAwKTtcbiAqICQod2luZG93KS5zY3JvbGwodGhyb3R0bGVkKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBzZWVkIGZ1bmN0aW9uLlxuICogIC0gYGphYCDlr77osaHjga7plqLmlbBcbiAqIEBwYXJhbSBlbGFwc2VcbiAqICAtIGBlbmAgd2FpdCBlbGFwc2UgW21zZWNdLlxuICogIC0gYGphYCDlvoXmqZ/mmYLplpMgW21zZWNdXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGhyb3R0bGU8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZXhlY3V0b3I6IFQsIGVsYXBzZTogbnVtYmVyLCBvcHRpb25zPzogVGhyb3R0bGVPcHRpb25zKTogRGVib3VuY2VkRnVuY3Rpb248VD4ge1xuICAgIGNvbnN0IHsgbGVhZGluZywgdHJhaWxpbmcgfSA9IE9iamVjdC5hc3NpZ24oeyBsZWFkaW5nOiB0cnVlLCB0cmFpbGluZzogdHJ1ZSB9LCBvcHRpb25zKTtcbiAgICByZXR1cm4gZGVib3VuY2UoZXhlY3V0b3IsIGVsYXBzZSwge1xuICAgICAgICBsZWFkaW5nLFxuICAgICAgICB0cmFpbGluZyxcbiAgICAgICAgbWF4V2FpdDogZWxhcHNlLFxuICAgIH0pO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIGF0IG1vc3Qgb25lIHRpbWUsIG5vIG1hdHRlciBob3cgb2Z0ZW4geW91IGNhbGwgaXQuXG4gKiBAamEgMeW6puOBl+OBi+Wun+ihjOOBleOCjOOBquOBhOmWouaVsOOCkui/lOWNtC4gMuWbnuebruS7pemZjeOBr+acgOWIneOBruOCs+ODvOODq+OBruOCreODo+ODg+OCt+ODpeOCkui/lOWNtFxuICpcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBzZWVkIGZ1bmN0aW9uLlxuICogIC0gYGphYCDlr77osaHjga7plqLmlbBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9uY2U8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZXhlY3V0b3I6IFQpOiBUIHtcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby1pbnZhbGlkLXRoaXMgKi9cbiAgICBsZXQgbWVtbzogdW5rbm93bjtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRoaXM6IHVua25vd24sIC4uLmFyZ3M6IHVua25vd25bXSk6IHVua25vd24ge1xuICAgICAgICBpZiAoZXhlY3V0b3IpIHtcbiAgICAgICAgICAgIG1lbW8gPSBleGVjdXRvci5jYWxsKHRoaXMsIC4uLmFyZ3MpO1xuICAgICAgICAgICAgZXhlY3V0b3IgPSBudWxsITtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWVtbztcbiAgICB9IGFzIFQ7XG4gICAgLyogZXNsaW50LWVuYWJsZSBuby1pbnZhbGlkLXRoaXMgKi9cbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJuIGEgZGVmZXJyZWQgZXhlY3V0YWJsZSBmdW5jdGlvbiBvYmplY3QuXG4gKiBAamEg6YGF5bu25a6f6KGM5Y+v6IO944Gq6Zai5pWw44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBzY2hlZHVsZSA9IHNjaGVkdWxlcigpO1xuICogc2NoZWR1bGUoKCkgPT4gdGFzazEoKSk7XG4gKiBzY2hlZHVsZSgoKSA9PiB0YXNrMigpKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2NoZWR1bGVyKCk6IChleGVjOiAoKSA9PiB2b2lkKSA9PiB2b2lkIHtcbiAgICBsZXQgdGFza3M6ICgoKSA9PiB2b2lkKVtdID0gW107XG4gICAgbGV0IGlkOiBQcm9taXNlPHZvaWQ+IHwgbnVsbDtcblxuICAgIGZ1bmN0aW9uIHJ1blRhc2tzKCk6IHZvaWQge1xuICAgICAgICBpZCA9IG51bGw7XG4gICAgICAgIGNvbnN0IHdvcmsgPSB0YXNrcztcbiAgICAgICAgdGFza3MgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCB0YXNrIG9mIHdvcmspIHtcbiAgICAgICAgICAgIHRhc2soKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbih0YXNrOiAoKSA9PiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgIHRhc2tzLnB1c2godGFzayk7XG4gICAgICAgIGlmIChudWxsID09IGlkKSB7XG4gICAgICAgICAgICBpZCA9IHBvc3QocnVuVGFza3MpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENyZWF0ZSBlc2NhcGUgZnVuY3Rpb24gZnJvbSBtYXAuXG4gKiBAamEg5paH5a2X572u5o+b6Zai5pWw44KS5L2c5oiQXG4gKlxuICogQHBhcmFtIG1hcFxuICogIC0gYGVuYCBrZXk6IHRhcmdldCBjaGFyLCB2YWx1ZTogcmVwbGFjZSBjaGFyXG4gKiAgLSBgamFgIGtleTog572u5o+b5a++6LGhLCB2YWx1ZTog572u5o+b5paH5a2XXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBlc3BhY2UgZnVuY3Rpb25cbiAqICAtIGBqYWAg44Ko44K544Kx44O844OX6Zai5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFc2NhcGVyKG1hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPik6IChzcmM6IFByaW1pdGl2ZSkgPT4gc3RyaW5nIHtcbiAgICBjb25zdCBlc2NhcGVyID0gKG1hdGNoOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgICByZXR1cm4gbWFwW21hdGNoXTtcbiAgICB9O1xuXG4gICAgY29uc3Qgc291cmNlID0gYCg/OiR7T2JqZWN0LmtleXMobWFwKS5qb2luKCd8Jyl9KWA7XG4gICAgY29uc3QgcmVnZXhUZXN0ID0gUmVnRXhwKHNvdXJjZSk7XG4gICAgY29uc3QgcmVnZXhSZXBsYWNlID0gUmVnRXhwKHNvdXJjZSwgJ2cnKTtcblxuICAgIHJldHVybiAoc3JjOiBQcmltaXRpdmUpOiBzdHJpbmcgPT4ge1xuICAgICAgICBzcmMgPSAobnVsbCA9PSBzcmMgfHwgJ3N5bWJvbCcgPT09IHR5cGVvZiBzcmMpID8gJycgOiBTdHJpbmcoc3JjKTtcbiAgICAgICAgcmV0dXJuIHJlZ2V4VGVzdC50ZXN0KHNyYykgPyBzcmMucmVwbGFjZShyZWdleFJlcGxhY2UsIGVzY2FwZXIpIDogc3JjO1xuICAgIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1hcEh0bWxFc2NhcGUgPSB7XG4gICAgJzwnOiAnJmx0OycsXG4gICAgJz4nOiAnJmd0OycsXG4gICAgJyYnOiAnJmFtcDsnLFxuICAgICdcIic6ICcmcXVvdDsnLFxuICAgIFwiJ1wiOiAnJiMzOTsnLFxuICAgICdgJzogJyYjeDYwOydcbn07XG5cbi8qKlxuICogQGVuIEVzY2FwZSBIVE1MIHN0cmluZy5cbiAqIEBqYSBIVE1MIOOBp+S9v+eUqOOBmeOCi+aWh+Wtl+OCkuWItuW+oeaWh+Wtl+OBq+e9ruaPm1xuICpcbiAqIEBicmllZiA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IG1hcEh0bWxFc2NhcGUgPSB7XG4gKiAgICAgJzwnIDogJyZsdDsnLFxuICogICAgICc+JyA6ICcmZ3Q7JyxcbiAqICAgICAnJicgOiAnJmFtcDsnLFxuICogICAgICfigLMnOiAnJnF1b3Q7JyxcbiAqICAgICBgJ2AgOiAnJiMzOTsnLFxuICogICAgICdgJyA6ICcmI3g2MDsnXG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBlc2NhcGVIVE1MID0gY3JlYXRlRXNjYXBlcihtYXBIdG1sRXNjYXBlKTtcblxuLyoqXG4gKiBAZW4gVW5lc2NhcGUgSFRNTCBzdHJpbmcuXG4gKiBAamEgSFRNTCDjgafkvb/nlKjjgZnjgovliLblvqHmloflrZfjgpLlvqnlhYNcbiAqL1xuZXhwb3J0IGNvbnN0IHVuZXNjYXBlSFRNTCA9IGNyZWF0ZUVzY2FwZXIoaW52ZXJ0KG1hcEh0bWxFc2NhcGUpKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gdGhlIHN0eWxlIGNvbXB1bHNpb24gdmFsdWUgZnJvbSBpbnB1dCBzdHJpbmcuXG4gKiBAamEg5YWl5Yqb5paH5a2X5YiX44KS5Z6L5by35Yi244GX44Gf5YCk44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgaW5wdXQgc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WvvuixoeOBruaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9UeXBlZERhdGEoZGF0YTogc3RyaW5nIHwgdW5kZWZpbmVkKTogVHlwZWREYXRhIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoJ3RydWUnID09PSBkYXRhKSB7XG4gICAgICAgIC8vIGJvb2xlYW46IHRydWVcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICgnZmFsc2UnID09PSBkYXRhKSB7XG4gICAgICAgIC8vIGJvb2xlYW46IGZhbHNlXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKCdudWxsJyA9PT0gZGF0YSkge1xuICAgICAgICAvLyBudWxsXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoZGF0YSA9PT0gU3RyaW5nKE51bWJlcihkYXRhKSkpIHtcbiAgICAgICAgLy8gbnVtYmVyOiDmlbDlgKTlpInmj5sg4oaSIOaWh+Wtl+WIl+WkieaPm+OBp+WFg+OBq+aIu+OCi+OBqOOBjVxuICAgICAgICByZXR1cm4gTnVtYmVyKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSAmJiAvXig/Olxce1tcXHdcXFddKlxcfXxcXFtbXFx3XFxXXSpcXF0pJC8udGVzdChkYXRhKSkge1xuICAgICAgICAvLyBvYmplY3RcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc3RyaW5nIC8gdW5kZWZpbmVkXG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBzdHJpbmcgZnJvbSB7QGxpbmsgVHlwZWREYXRhfS5cbiAqIEBqYSB7QGxpbmsgVHlwZWREYXRhfSDjgpLmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBpbnB1dCBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5a++6LGh44Gu5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tVHlwZWREYXRhKGRhdGE6IFR5cGVkRGF0YSB8IHVuZGVmaW5lZCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKHVuZGVmaW5lZCA9PT0gZGF0YSB8fCBpc1N0cmluZyhkYXRhKSkge1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGRhdGEpKSB7XG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gU3RyaW5nKGRhdGEpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBgV2ViIEFQSWAgc3RvY2tlZCB0eXBlLiA8YnI+XG4gKiAgICAgRW5zdXJlIG5vdCB0byByZXR1cm4gYHVuZGVmaW5lZGAgdmFsdWUuXG4gKiBAamEgYFdlYiBBUElgIOagvOe0jeW9ouW8j+OBq+WkieaPmyA8YnI+XG4gKiAgICAgYHVuZGVmaW5lZGAg44KS6L+U5Y2044GX44Gq44GE44GT44Go44KS5L+d6Ki8XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkcm9wVW5kZWZpbmVkPFQ+KHZhbHVlOiBUIHwgbnVsbCB8IHVuZGVmaW5lZCwgbnVsbGlzaFNlcmlhbGl6ZSA9IGZhbHNlKTogVCB8ICdudWxsJyB8ICd1bmRlZmluZWQnIHwgbnVsbCB7XG4gICAgcmV0dXJuIHZhbHVlID8/IChudWxsaXNoU2VyaWFsaXplID8gU3RyaW5nKHZhbHVlKSA6IG51bGwpIGFzIFQgfCAnbnVsbCcgfCAndW5kZWZpbmVkJyB8IG51bGw7XG59XG5cbi8qKlxuICogQGVuIERlc2VyaWFsaXplIGZyb20gYFdlYiBBUElgIHN0b2NrZWQgdHlwZS4gPGJyPlxuICogICAgIENvbnZlcnQgZnJvbSAnbnVsbCcgb3IgJ3VuZGVmaW5lZCcgc3RyaW5nIHRvIG9yaWdpbmFsIHR5cGUuXG4gKiBAamEgJ251bGwnIG9yICd1bmRlZmluZWQnIOOCkuOCguOBqOOBruWei+OBq+aIu+OBmVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzdG9yZU51bGxpc2g8VD4odmFsdWU6IFQgfCAnbnVsbCcgfCAndW5kZWZpbmVkJyk6IFQgfCBudWxsIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoJ251bGwnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKCd1bmRlZmluZWQnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovIGxldCBfbG9jYWxJZCA9IDA7XG5cbi8qKlxuICogQGVuIEdldCBsb2NhbCB1bmlxdWUgaWQuIDxicj5cbiAqICAgICBcImxvY2FsIHVuaXF1ZVwiIG1lYW5zIGd1YXJhbnRlZXMgdW5pcXVlIGR1cmluZyBpbiBzY3JpcHQgbGlmZSBjeWNsZSBvbmx5LlxuICogQGphIOODreODvOOCq+ODq+ODpuODi+ODvOOCryBJRCDjga7lj5blvpcgPGJyPlxuICogICAgIOOCueOCr+ODquODl+ODiOODqeOCpOODleOCteOCpOOCr+ODq+S4reOBruWQjOS4gOaAp+OCkuS/neiovOOBmeOCiy5cbiAqXG4gKiBAcGFyYW0gcHJlZml4XG4gKiAgLSBgZW5gIElEIHByZWZpeFxuICogIC0gYGphYCBJRCDjgavku5jkuI7jgZnjgosgUHJlZml4XG4gKiBAcGFyYW0gemVyb1BhZFxuICogIC0gYGVuYCAwIHBhZGRpbmcgb3JkZXJcbiAqICAtIGBqYWAgMCDoqbDjgoHjgZnjgovmoYHmlbDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGx1aWQocHJlZml4ID0gJycsIHplcm9QYWQ/OiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IGlkID0gKCsrX2xvY2FsSWQpLnRvU3RyaW5nKDE2KTtcbiAgICByZXR1cm4gKG51bGwgIT0gemVyb1BhZCkgPyBgJHtwcmVmaXh9JHtpZC5wYWRTdGFydCh6ZXJvUGFkLCAnMCcpfWAgOiBgJHtwcmVmaXh9JHtpZH1gO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBgMGAgYW5kIGBtYXhgLCBpbmNsdXNpdmUuXG4gKiBAamEgYDBgIC0gYG1heGAg44Gu44Op44Oz44OA44Og44Gu5pW05pWw5YCk44KS55Sf5oiQXG4gKlxuICogQHBhcmFtIG1heFxuICogIC0gYGVuYCBUaGUgbWF4aW11bSByYW5kb20gbnVtYmVyLlxuICogIC0gYGphYCDmlbTmlbDjga7mnIDlpKflgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmRvbUludChtYXg6IG51bWJlcik6IG51bWJlcjtcblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gYG1pbmAgYW5kIGBtYXhgLCBpbmNsdXNpdmUuXG4gKiBAamEgYG1pbmAgLSBgbWF4YCDjga7jg6njg7Pjg4Djg6Djga7mlbTmlbDlgKTjgpLnlJ/miJBcbiAqXG4gKiBAcGFyYW0gbWluXG4gKiAgLSBgZW5gIFRoZSBtYXhpbXVtIHJhbmRvbSBudW1iZXIuXG4gKiAgLSBgamFgIOaVtOaVsOOBruacgOWkp+WApFxuICogQHBhcmFtIG1heFxuICogIC0gYGVuYCBUaGUgbWF4aW11bSByYW5kb20gbnVtYmVyLlxuICogIC0gYGphYCDmlbTmlbDjga7mnIDlpKflgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmRvbUludChtaW46IG51bWJlciwgbWF4OiBudW1iZXIpOiBudW1iZXI7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuaWZpZWQtc2lnbmF0dXJlc1xuXG5leHBvcnQgZnVuY3Rpb24gcmFuZG9tSW50KG1pbjogbnVtYmVyLCBtYXg/OiBudW1iZXIpOiBudW1iZXIge1xuICAgIGlmIChudWxsID09IG1heCkge1xuICAgICAgICBtYXggPSBtaW47XG4gICAgICAgIG1pbiA9IDA7XG4gICAgfVxuICAgIHJldHVybiBtaW4gKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcmVnZXhDYW5jZWxMaWtlU3RyaW5nID0gLyhhYm9ydHxjYW5jZWwpL2ltO1xuXG4vKipcbiAqIEBlbiBQcmVzdW1lIHdoZXRoZXIgaXQncyBhIGNhbmNlbGVkIGVycm9yLlxuICogQGphIOOCreODo+ODs+OCu+ODq+OBleOCjOOBn+OCqOODqeODvOOBp+OBguOCi+OBi+aOqOWumlxuICpcbiAqIEBwYXJhbSBlcnJvclxuICogIC0gYGVuYCBhbiBlcnJvciBvYmplY3QgaGFuZGxlZCBpbiBgY2F0Y2hgIGJsb2NrLlxuICogIC0gYGphYCBgY2F0Y2hgIOevgOOBquOBqeOBp+ijnOi2s+OBl+OBn+OCqOODqeODvOOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNDYW5jZWxMaWtlRXJyb3IoZXJyb3I6IHVua25vd24pOiBib29sZWFuIHtcbiAgICBpZiAobnVsbCA9PSBlcnJvcikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmIChpc1N0cmluZyhlcnJvcikpIHtcbiAgICAgICAgcmV0dXJuIF9yZWdleENhbmNlbExpa2VTdHJpbmcudGVzdChlcnJvcik7XG4gICAgfSBlbHNlIGlmIChpc09iamVjdChlcnJvcikpIHtcbiAgICAgICAgcmV0dXJuIF9yZWdleENhbmNlbExpa2VTdHJpbmcudGVzdCgoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBmaXJzdCBsZXR0ZXIgb2YgdGhlIHN0cmluZyB0byB1cHBlcmNhc2UuXG4gKiBAamEg5pyA5Yid44Gu5paH5a2X44KS5aSn5paH5a2X44Gr5aSJ5o+bXG4gKlxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2FwaXRhbGl6ZShcImZvbyBCYXJcIik7XG4gKiAvLyA9PiBcIkZvbyBCYXJcIlxuICpcbiAqIGNhcGl0YWxpemUoXCJGT08gQmFyXCIsIHRydWUpO1xuICogLy8gPT4gXCJGb28gYmFyXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqIEBwYXJhbSBsb3dlcmNhc2VSZXN0XG4gKiAgLSBgZW5gIElmIGB0cnVlYCBpcyBwYXNzZWQsIHRoZSByZXN0IG9mIHRoZSBzdHJpbmcgd2lsbCBiZSBjb252ZXJ0ZWQgdG8gbG93ZXIgY2FzZVxuICogIC0gYGphYCBgdHJ1ZWAg44KS5oyH5a6a44GX44Gf5aC05ZCILCAy5paH5a2X55uu5Lul6ZmN44KC5bCP5paH5a2X5YyWXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYXBpdGFsaXplKHNyYzogc3RyaW5nLCBsb3dlcmNhc2VSZXN0ID0gZmFsc2UpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlbWFpbmluZ0NoYXJzID0gIWxvd2VyY2FzZVJlc3QgPyBzcmMuc2xpY2UoMSkgOiBzcmMuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcbiAgICByZXR1cm4gc3JjLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcmVtYWluaW5nQ2hhcnM7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIGZpcnN0IGxldHRlciBvZiB0aGUgc3RyaW5nIHRvIGxvd2VyY2FzZS5cbiAqIEBqYSDmnIDliJ3jga7mloflrZfjgpLlsI/mloflrZfljJZcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGRlY2FwaXRhbGl6ZShcIkZvbyBCYXJcIik7XG4gKiAvLyA9PiBcImZvbyBCYXJcIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVjYXBpdGFsaXplKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc3JjLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgc3JjLnNsaWNlKDEpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyB1bmRlcnNjb3JlZCBvciBkYXNoZXJpemVkIHN0cmluZyB0byBhIGNhbWVsaXplZCBvbmUuIDxicj5cbiAqICAgICBCZWdpbnMgd2l0aCBhIGxvd2VyIGNhc2UgbGV0dGVyIHVubGVzcyBpdCBzdGFydHMgd2l0aCBhbiB1bmRlcnNjb3JlLCBkYXNoIG9yIGFuIHVwcGVyIGNhc2UgbGV0dGVyLlxuICogQGphIGBfYCwgYC1gIOWMuuWIh+OCiuaWh+Wtl+WIl+OCkuOCreODo+ODoeODq+OCseODvOOCueWMliA8YnI+XG4gKiAgICAgYC1gIOOBvuOBn+OBr+Wkp+aWh+Wtl+OCueOCv+ODvOODiOOBp+OBguOCjOOBsCwg5aSn5paH5a2X44K544K/44O844OI44GM5pei5a6a5YCkXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjYW1lbGl6ZShcIm1vei10cmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIm1velRyYW5zZm9ybVwiXG4gKlxuICogY2FtZWxpemUoXCItbW96LXRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwiTW96VHJhbnNmb3JtXCJcbiAqXG4gKiBjYW1lbGl6ZShcIl9tb3pfdHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJNb3pUcmFuc2Zvcm1cIlxuICpcbiAqIGNhbWVsaXplKFwiTW96LXRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwiTW96VHJhbnNmb3JtXCJcbiAqXG4gKiBjYW1lbGl6ZShcIi1tb3otdHJhbnNmb3JtXCIsIHRydWUpO1xuICogLy8gPT4gXCJtb3pUcmFuc2Zvcm1cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICogQHBhcmFtIGxvd2VyXG4gKiAgLSBgZW5gIElmIGB0cnVlYCBpcyBwYXNzZWQsIGZvcmNlIGNvbnZlcnRzIHRvIGxvd2VyIGNhbWVsIGNhc2UgaW4gc3RhcnRzIHdpdGggdGhlIHNwZWNpYWwgY2FzZS5cbiAqICAtIGBqYWAg5by35Yi255qE44Gr5bCP5paH5a2X44K544K/44O844OI44GZ44KL5aC05ZCI44Gr44GvIGB0cnVlYCDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhbWVsaXplKHNyYzogc3RyaW5nLCBsb3dlciA9IGZhbHNlKTogc3RyaW5nIHtcbiAgICBzcmMgPSBzcmMudHJpbSgpLnJlcGxhY2UoL1stX1xcc10rKC4pPy9nLCAobWF0Y2gsIGMpID0+IHtcbiAgICAgICAgcmV0dXJuIGMgPyBjLnRvVXBwZXJDYXNlKCkgOiAnJztcbiAgICB9KTtcblxuICAgIGlmICh0cnVlID09PSBsb3dlcikge1xuICAgICAgICByZXR1cm4gZGVjYXBpdGFsaXplKHNyYyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHNyYztcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIHN0cmluZyB0byBjYW1lbGl6ZWQgY2xhc3MgbmFtZS4gRmlyc3QgbGV0dGVyIGlzIGFsd2F5cyB1cHBlciBjYXNlLlxuICogQGphIOWFiOmgreWkp+aWh+Wtl+OBruOCreODo+ODoeODq+OCseODvOOCueOBq+WkieaPm1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2xhc3NpZnkoXCJzb21lX2NsYXNzX25hbWVcIik7XG4gKiAvLyA9PiBcIlNvbWVDbGFzc05hbWVcIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gY2xhc3NpZnkoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBjYXBpdGFsaXplKGNhbWVsaXplKHNyYy5yZXBsYWNlKC9bXFxXX10vZywgJyAnKSkucmVwbGFjZSgvXFxzL2csICcnKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIGEgY2FtZWxpemVkIG9yIGRhc2hlcml6ZWQgc3RyaW5nIGludG8gYW4gdW5kZXJzY29yZWQgb25lLlxuICogQGphIOOCreODo+ODoeODq+OCseODvOOCuSBvciBgLWAg44Gk44Gq44GO5paH5a2X5YiX44KSIGBfYCDjgaTjgarjgY7jgavlpInmj5tcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIHVuZGVyc2NvcmVkKFwiTW96VHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJtb3pfdHJhbnNmb3JtXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuZGVyc2NvcmVkKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc3JjLnRyaW0oKS5yZXBsYWNlKC8oW2EtelxcZF0pKFtBLVpdKykvZywgJyQxXyQyJykucmVwbGFjZSgvWy1cXHNdKy9nLCAnXycpLnRvTG93ZXJDYXNlKCk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIGEgdW5kZXJzY29yZWQgb3IgY2FtZWxpemVkIHN0cmluZyBpbnRvIGFuIGRhc2hlcml6ZWQgb25lLlxuICogQGphIOOCreODo+ODoeODq+OCseODvOOCuSBvciBgX2Ag44Gk44Gq44GO5paH5a2X5YiX44KSIGAtYCDjgaTjgarjgY7jgavlpInmj5tcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGRhc2hlcml6ZShcIk1velRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwiLW1vei10cmFuc2Zvcm1cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGFzaGVyaXplKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc3JjLnRyaW0oKS5yZXBsYWNlKC8oW0EtWl0pL2csICctJDEnKS5yZXBsYWNlKC9bX1xcc10rL2csICctJykudG9Mb3dlckNhc2UoKTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgbm8taW52YWxpZC10aGlzLFxuICovXG5cbmltcG9ydCB0eXBlIHsgVW5rbm93bk9iamVjdCwgQWNjZXNzaWJsZSB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgYXNzaWduVmFsdWUgfSBmcm9tICcuL2RlZXAtY2lyY3VpdCc7XG5pbXBvcnQgeyByYW5kb21JbnQgfSBmcm9tICcuL21pc2MnO1xuXG4vKipcbiAqIEBlbiBFeGVjdXRlIHNodWZmbGUgb2YgYW4gYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6YWN5YiX6KaB57Sg44Gu44K344Oj44OD44OV44OrXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBkZXN0cnVjdGl2ZVxuICogIC0gYGVuYCB0cnVlOiBkZXN0cnVjdGl2ZSAvIGZhbHNlOiBub24tZGVzdHJ1Y3RpdmUgKGRlZmF1bHQpXG4gKiAgLSBgamFgIHRydWU6IOegtOWjiueahCAvIGZhbHNlOiDpnZ7noLTlo4rnmoQgKOaXouWumilcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGU8VD4oYXJyYXk6IFRbXSwgZGVzdHJ1Y3RpdmUgPSBmYWxzZSk6IFRbXSB7XG4gICAgY29uc3Qgc291cmNlID0gZGVzdHJ1Y3RpdmUgPyBhcnJheSA6IGFycmF5LnNsaWNlKCk7XG4gICAgY29uc3QgbGVuID0gc291cmNlLmxlbmd0aDtcbiAgICBmb3IgKGxldCBpID0gbGVuID4gMCA/IGxlbiA+Pj4gMCA6IDA7IGkgPiAxOykge1xuICAgICAgICBjb25zdCBqID0gaSAqIE1hdGgucmFuZG9tKCkgPj4+IDA7XG4gICAgICAgIGNvbnN0IHN3YXAgPSBzb3VyY2VbLS1pXTtcbiAgICAgICAgc291cmNlW2ldID0gc291cmNlW2pdO1xuICAgICAgICBzb3VyY2Vbal0gPSBzd2FwO1xuICAgIH1cbiAgICByZXR1cm4gc291cmNlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gRXhlY3V0ZSBzdGFibGUgc29ydCBieSBtZXJnZS1zb3J0IGFsZ29yaXRobS5cbiAqIEBqYSBgbWVyZ2Utc29ydGAg44Gr44KI44KL5a6J5a6a44K944O844OIXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjb21wYXJhdG9yXG4gKiAgLSBgZW5gIHNvcnQgY29tcGFyYXRvciBmdW5jdGlvblxuICogIC0gYGphYCDjgr3jg7zjg4jplqLmlbDjgpLmjIflrppcbiAqIEBwYXJhbSBkZXN0cnVjdGl2ZVxuICogIC0gYGVuYCB0cnVlOiBkZXN0cnVjdGl2ZSAvIGZhbHNlOiBub24tZGVzdHJ1Y3RpdmUgKGRlZmF1bHQpXG4gKiAgLSBgamFgIHRydWU6IOegtOWjiueahCAvIGZhbHNlOiDpnZ7noLTlo4rnmoQgKOaXouWumilcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNvcnQ8VD4oYXJyYXk6IFRbXSwgY29tcGFyYXRvcjogKGxoczogVCwgcmhzOiBUKSA9PiBudW1iZXIsIGRlc3RydWN0aXZlID0gZmFsc2UpOiBUW10ge1xuICAgIGNvbnN0IHNvdXJjZSA9IGRlc3RydWN0aXZlID8gYXJyYXkgOiBhcnJheS5zbGljZSgpO1xuICAgIGlmIChzb3VyY2UubGVuZ3RoIDwgMikge1xuICAgICAgICByZXR1cm4gc291cmNlO1xuICAgIH1cbiAgICBjb25zdCBsaHMgPSBzb3J0KHNvdXJjZS5zcGxpY2UoMCwgc291cmNlLmxlbmd0aCA+Pj4gMSksIGNvbXBhcmF0b3IsIHRydWUpO1xuICAgIGNvbnN0IHJocyA9IHNvcnQoc291cmNlLnNwbGljZSgwKSwgY29tcGFyYXRvciwgdHJ1ZSk7XG4gICAgd2hpbGUgKGxocy5sZW5ndGggJiYgcmhzLmxlbmd0aCkge1xuICAgICAgICBzb3VyY2UucHVzaChjb21wYXJhdG9yKGxoc1swXSwgcmhzWzBdKSA8PSAwID8gbGhzLnNoaWZ0KCkgYXMgVCA6IHJocy5zaGlmdCgpIGFzIFQpO1xuICAgIH1cbiAgICByZXR1cm4gc291cmNlLmNvbmNhdChsaHMsIHJocyk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNYWtlIHVuaXF1ZSBhcnJheS5cbiAqIEBqYSDph43opIfopoHntKDjga7jgarjgYTphY3liJfjga7kvZzmiJBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdW5pcXVlPFQ+KGFycmF5OiBUW10pOiBUW10ge1xuICAgIHJldHVybiBbLi4ubmV3IFNldChhcnJheSldO1xufVxuXG4vKipcbiAqIEBlbiBNYWtlIHVuaW9uIGFycmF5LlxuICogQGphIOmFjeWIl+OBruWSjOmbhuWQiOOCkui/lOWNtFxuICpcbiAqIEBwYXJhbSBhcnJheXNcbiAqICAtIGBlbmAgc291cmNlIGFycmF5c1xuICogIC0gYGphYCDlhaXlipvphY3liJfnvqRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuaW9uPFQ+KC4uLmFycmF5czogVFtdW10pOiBUW10ge1xuICAgIHJldHVybiB1bmlxdWUoYXJyYXlzLmZsYXQoKSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBHZXQgdGhlIG1vZGVsIGF0IHRoZSBnaXZlbiBpbmRleC4gSWYgbmVnYXRpdmUgdmFsdWUgaXMgZ2l2ZW4sIHRoZSB0YXJnZXQgd2lsbCBiZSBmb3VuZCBmcm9tIHRoZSBsYXN0IGluZGV4LlxuICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBq+OCiOOCi+ODouODh+ODq+OBuOOBruOCouOCr+OCu+OCuS4g6LKg5YCk44Gu5aC05ZCI44Gv5pyr5bC+5qSc57Si44KS5a6f6KGMXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGVuYCBBIHplcm8tYmFzZWQgaW50ZWdlciBpbmRpY2F0aW5nIHdoaWNoIGVsZW1lbnQgdG8gcmV0cmlldmUuIDxicj4gSWYgbmVnYXRpdmUgaW5kZXggaXMgY291bnRlZCBmcm9tIHRoZSBlbmQgb2YgdGhlIG1hdGNoZWQgc2V0LlxuICogIC0gYGphYCAwIGJhc2Ug44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aIDxicj4g6LKg5YCk44GM5oyH5a6a44GV44KM44Gf5aC05ZCILCDmnKvlsL7jgYvjgonjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgajjgZfjgabop6Pph4jjgZXjgozjgotcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGF0PFQ+KGFycmF5OiBUW10sIGluZGV4OiBudW1iZXIpOiBUIHwgbmV2ZXIge1xuICAgIGNvbnN0IGlkeCA9IE1hdGgudHJ1bmMoaW5kZXgpO1xuICAgIGNvbnN0IGVsID0gaWR4IDwgMCA/IGFycmF5W2lkeCArIGFycmF5Lmxlbmd0aF0gOiBhcnJheVtpZHhdO1xuICAgIGlmIChudWxsID09IGVsKSB7XG4gICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKGBpbnZhbGlkIGFycmF5IGluZGV4LiBbbGVuZ3RoOiAke2FycmF5Lmxlbmd0aH0sIGdpdmVuOiAke2luZGV4fV1gKTtcbiAgICB9XG4gICAgcmV0dXJuIGVsO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWFrZSBpbmRleCBhcnJheS5cbiAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJfjga7kvZzmiJBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGV4Y2x1ZGVzXG4gKiAgLSBgZW5gIGV4Y2x1ZGUgaW5kZXggaW4gcmV0dXJuIHZhbHVlLlxuICogIC0gYGphYCDmiLvjgorlgKTphY3liJfjgavlkKvjgoHjgarjgYTjgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluZGljZXM8VD4oYXJyYXk6IFRbXSwgLi4uZXhjbHVkZXM6IG51bWJlcltdKTogbnVtYmVyW10ge1xuICAgIGNvbnN0IHJldHZhbCA9IFsuLi5hcnJheS5rZXlzKCldO1xuXG4gICAgY29uc3QgbGVuID0gYXJyYXkubGVuZ3RoO1xuICAgIGNvbnN0IGV4TGlzdCA9IFsuLi5uZXcgU2V0KGV4Y2x1ZGVzKV0uc29ydCgobGhzLCByaHMpID0+IGxocyA8IHJocyA/IDEgOiAtMSk7XG4gICAgZm9yIChjb25zdCBleCBvZiBleExpc3QpIHtcbiAgICAgICAgaWYgKDAgPD0gZXggJiYgZXggPCBsZW4pIHtcbiAgICAgICAgICAgIHJldHZhbC5zcGxpY2UoZXgsIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIHtAbGluayBncm91cEJ5fSgpIG9wdGlvbnMgZGVmaW5pdGlvbi5cbiAqIEBqYSB7QGxpbmsgZ3JvdXBCeX0oKSDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7PlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBHcm91cEJ5T3B0aW9uczxcbiAgICBUIGV4dGVuZHMgb2JqZWN0LFxuICAgIFRLRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUU1VNS0VZUyBleHRlbmRzIGtleW9mIFQsXG4gICAgVEdST1VQS0VZIGV4dGVuZHMgc3RyaW5nXG4+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gYEdST1VQIEJZYCBrZXlzLlxuICAgICAqIEBqYSBgR1JPVVAgQllgIOOBq+aMh+WumuOBmeOCi+OCreODvFxuICAgICAqL1xuICAgIGtleXM6IEV4dHJhY3Q8VEtFWVMsIHN0cmluZz5bXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZ2dyZWdhdGFibGUga2V5cy5cbiAgICAgKiBAamEg6ZuG6KiI5Y+v6IO944Gq44Kt44O85LiA6KanXG4gICAgICovXG4gICAgc3VtS2V5cz86IEV4dHJhY3Q8VFNVTUtFWVMsIHN0cmluZz5bXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBHcm91cGVkIGl0ZW0gYWNjZXNzIGtleS4gZGVmYXVsdDogJ2l0ZW1zJyxcbiAgICAgKiBAamEg44Kw44Or44O844OU44Oz44Kw44GV44KM44Gf6KaB57Sg44G444Gu44Ki44Kv44K744K544Kt44O8LiDml6Llrpo6ICdpdGVtcydcbiAgICAgKi9cbiAgICBncm91cEtleT86IFRHUk9VUEtFWTtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJuIHR5cGUgb2Yge0BsaW5rIGdyb3VwQnl9KCkuXG4gKiBAamEge0BsaW5rIGdyb3VwQnl9KCkg44GM6L+U5Y2044GZ44KL5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIEdyb3VwQnlSZXR1cm5WYWx1ZTxcbiAgICBUIGV4dGVuZHMgb2JqZWN0LFxuICAgIFRLRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUU1VNS0VZUyBleHRlbmRzIGtleW9mIFQgPSBuZXZlcixcbiAgICBUR1JPVVBLRVkgZXh0ZW5kcyBzdHJpbmcgPSAnaXRlbXMnXG4+ID0gUmVhZG9ubHk8UmVjb3JkPFRLRVlTLCB1bmtub3duPiAmIFJlY29yZDxUU1VNS0VZUywgdW5rbm93bj4gJiBSZWNvcmQ8VEdST1VQS0VZLCBUW10+PjtcblxuLyoqXG4gKiBAZW4gRXhlY3V0ZSBgR1JPVVAgQllgIGZvciBhcnJheSBlbGVtZW50cy5cbiAqIEBqYSDphY3liJfjga7opoHntKDjga4gYEdST1VQIEJZYCDpm4blkIjjgpLmir3lh7pcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgYEdST1VQIEJZYCBvcHRpb25zXG4gKiAgLSBgamFgIGBHUk9VUCBCWWAg44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBncm91cEJ5PFxuICAgIFQgZXh0ZW5kcyBvYmplY3QsXG4gICAgVEtFWVMgZXh0ZW5kcyBrZXlvZiBULFxuICAgIFRTVU1LRVlTIGV4dGVuZHMga2V5b2YgVCA9IG5ldmVyLFxuICAgIFRHUk9VUEtFWSBleHRlbmRzIHN0cmluZyA9ICdpdGVtcydcbj4oYXJyYXk6IFRbXSwgb3B0aW9uczogR3JvdXBCeU9wdGlvbnM8VCwgVEtFWVMsIFRTVU1LRVlTLCBUR1JPVVBLRVk+KTogR3JvdXBCeVJldHVyblZhbHVlPFQsIFRLRVlTLCBUU1VNS0VZUywgVEdST1VQS0VZPltdIHtcbiAgICBjb25zdCB7IGtleXMsIHN1bUtleXMsIGdyb3VwS2V5IH0gPSBvcHRpb25zO1xuICAgIGNvbnN0IF9ncm91cEtleSA9IGdyb3VwS2V5ID8/ICdpdGVtcyc7XG4gICAgY29uc3QgX3N1bUtleXM6IHN0cmluZ1tdID0gc3VtS2V5cyA/PyBbXTtcbiAgICBfc3VtS2V5cy5wdXNoKF9ncm91cEtleSk7XG5cbiAgICBjb25zdCBoYXNoID0gYXJyYXkucmVkdWNlKChyZXM6IEFjY2Vzc2libGU8VD4sIGRhdGE6IEFjY2Vzc2libGU8VD4pID0+IHtcbiAgICAgICAgLy8gY3JlYXRlIGdyb3VwQnkgaW50ZXJuYWwga2V5XG4gICAgICAgIGNvbnN0IF9rZXkgPSBrZXlzLnJlZHVjZSgocywgaykgPT4gcyArIFN0cmluZyhkYXRhW2tdKSwgJycpO1xuXG4gICAgICAgIC8vIGluaXQga2V5c1xuICAgICAgICBpZiAoIShfa2V5IGluIHJlcykpIHtcbiAgICAgICAgICAgIGNvbnN0IGtleUxpc3QgPSBrZXlzLnJlZHVjZSgoaDogVW5rbm93bk9iamVjdCwgazogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgYXNzaWduVmFsdWUoaCwgaywgZGF0YVtrXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGg7XG4gICAgICAgICAgICB9LCB7fSk7XG5cbiAgICAgICAgICAgIChyZXNbX2tleV0gYXMgVW5rbm93bk9iamVjdCkgPSBfc3VtS2V5cy5yZWR1Y2UoKGgsIGs6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIGhba10gPSAwO1xuICAgICAgICAgICAgICAgIHJldHVybiBoO1xuICAgICAgICAgICAgfSwga2V5TGlzdCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByZXNLZXkgPSByZXNbX2tleV0gYXMgYW55OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuICAgICAgICAvLyBzdW0gcHJvcGVydGllc1xuICAgICAgICBmb3IgKGNvbnN0IGsgb2YgX3N1bUtleXMpIHtcbiAgICAgICAgICAgIGlmIChfZ3JvdXBLZXkgPT09IGspIHtcbiAgICAgICAgICAgICAgICByZXNLZXlba10gPSByZXNLZXlba10gfHwgW107XG4gICAgICAgICAgICAgICAgcmVzS2V5W2tdLnB1c2goZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc0tleVtrXSArPSBkYXRhW2tdIGFzIG51bWJlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfSwge30pO1xuXG4gICAgcmV0dXJuIE9iamVjdC52YWx1ZXMoaGFzaCk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb21wdXRlcyB0aGUgbGlzdCBvZiB2YWx1ZXMgdGhhdCBhcmUgdGhlIGludGVyc2VjdGlvbiBvZiBhbGwgdGhlIGFycmF5cy4gRWFjaCB2YWx1ZSBpbiB0aGUgcmVzdWx0IGlzIHByZXNlbnQgaW4gZWFjaCBvZiB0aGUgYXJyYXlzLlxuICogQGphIOmFjeWIl+OBruepjembhuWQiOOCkui/lOWNtC4g6L+U5Y2044GV44KM44Gf6YWN5YiX44Gu6KaB57Sg44Gv44GZ44G544Gm44Gu5YWl5Yqb44GV44KM44Gf6YWN5YiX44Gr5ZCr44G+44KM44KLXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zb2xlLmxvZyhpbnRlcnNlY3Rpb24oWzEsIDIsIDNdLCBbMTAxLCAyLCAxLCAxMF0sIFsyLCAxXSkpO1xuICogLy8gPT4gWzEsIDJdXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlzXG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGludGVyc2VjdGlvbjxUPiguLi5hcnJheXM6IFRbXVtdKTogVFtdIHtcbiAgICByZXR1cm4gYXJyYXlzLnJlZHVjZSgoYWNjLCBhcnkpID0+IGFjYy5maWx0ZXIoZWwgPT4gYXJ5LmluY2x1ZGVzKGVsKSkpO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIHRoZSB2YWx1ZXMgZnJvbSBhcnJheSB0aGF0IGFyZSBub3QgcHJlc2VudCBpbiB0aGUgb3RoZXIgYXJyYXlzLlxuICogQGphIOmFjeWIl+OBi+OCieOBu+OBi+OBrumFjeWIl+OBq+WQq+OBvuOCjOOBquOBhOOCguOBruOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc29sZS5sb2coZGlmZmVyZW5jZShbMSwgMiwgMywgNCwgNV0sIFs1LCAyLCAxMF0pKTtcbiAqIC8vID0+IFsxLCAzLCA0XVxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBvdGhlcnNcbiAqICAtIGBlbmAgZXhjbHVkZSBlbGVtZW50IGluIHJldHVybiB2YWx1ZS5cbiAqICAtIGBqYWAg5oi744KK5YCk6YWN5YiX44Gr5ZCr44KB44Gq44GE6KaB57Sg44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaWZmZXJlbmNlPFQ+KGFycmF5OiBUW10sIC4uLm90aGVyczogVFtdW10pOiBUW10ge1xuICAgIGNvbnN0IGFycmF5cyA9IFthcnJheSwgLi4ub3RoZXJzXSBhcyBUW11bXTtcbiAgICByZXR1cm4gYXJyYXlzLnJlZHVjZSgoYWNjLCBhcnkpID0+IGFjYy5maWx0ZXIoZWwgPT4gIWFyeS5pbmNsdWRlcyhlbCkpKTtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIGNvcHkgb2YgdGhlIGFycmF5IHdpdGggYWxsIGluc3RhbmNlcyBvZiB0aGUgdmFsdWVzIHJlbW92ZWQuXG4gKiBAamEg6YWN5YiX44GL44KJ5oyH5a6a6KaB57Sg44KS5Y+W44KK6Zmk44GE44Gf44KC44Gu44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zb2xlLmxvZyh3aXRob3V0KFsxLCAyLCAxLCAwLCAzLCAxLCA0XSwgMCwgMSkpO1xuICogLy8gPT4gWzIsIDMsIDRdXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIHZhbHVlc1xuICogIC0gYGVuYCBleGNsdWRlIGVsZW1lbnQgaW4gcmV0dXJuIHZhbHVlLlxuICogIC0gYGphYCDmiLvjgorlgKTphY3liJfjgavlkKvjgoHjgarjgYTopoHntKDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhvdXQ8VD4oYXJyYXk6IFRbXSwgLi4udmFsdWVzOiBUW10pOiBUW10ge1xuICAgIHJldHVybiBkaWZmZXJlbmNlKGFycmF5LCB2YWx1ZXMpO1xufVxuXG4vKipcbiAqIEBlbiBQcm9kdWNlIGEgcmFuZG9tIHNhbXBsZSBmcm9tIHRoZSBsaXN0LlxuICogQGphIOODqeODs+ODgOODoOOBq+OCteODs+ODl+ODq+WApOOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc29sZS5sb2coc2FtcGxlKFsxLCAyLCAzLCA0LCA1LCA2XSwgMykpO1xuICogLy8gPT4gWzEsIDYsIDJdXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNvdW50XG4gKiAgLSBgZW5gIG51bWJlciBvZiBzYW1wbGluZyBjb3VudC5cbiAqICAtIGBqYWAg6L+U5Y2044GZ44KL44K144Oz44OX44Or5pWw44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1wbGU8VD4oYXJyYXk6IFRbXSwgY291bnQ6IG51bWJlcik6IFRbXTtcblxuLyoqXG4gKiBAZW4gUHJvZHVjZSBhIHJhbmRvbSBzYW1wbGUgZnJvbSB0aGUgbGlzdC5cbiAqIEBqYSDjg6njg7Pjg4Djg6DjgavjgrXjg7Pjg5fjg6vlgKTjgpLov5TljbRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnNvbGUubG9nKHNhbXBsZShbMSwgMiwgMywgNCwgNSwgNl0pKTtcbiAqIC8vID0+IDRcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1wbGU8VD4oYXJyYXk6IFRbXSk6IFQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBzYW1wbGU8VD4oYXJyYXk6IFRbXSwgY291bnQ/OiBudW1iZXIpOiBUIHwgVFtdIHtcbiAgICBpZiAobnVsbCA9PSBjb3VudCkge1xuICAgICAgICByZXR1cm4gYXJyYXlbcmFuZG9tSW50KGFycmF5Lmxlbmd0aCAtIDEpXTtcbiAgICB9XG4gICAgY29uc3Qgc2FtcGxlID0gYXJyYXkuc2xpY2UoKTtcbiAgICBjb25zdCBsZW5ndGggPSBzYW1wbGUubGVuZ3RoO1xuICAgIGNvdW50ID0gTWF0aC5tYXgoTWF0aC5taW4oY291bnQsIGxlbmd0aCksIDApO1xuICAgIGNvbnN0IGxhc3QgPSBsZW5ndGggLSAxO1xuICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBjb3VudDsgaW5kZXgrKykge1xuICAgICAgICBjb25zdCByYW5kID0gcmFuZG9tSW50KGluZGV4LCBsYXN0KTtcbiAgICAgICAgY29uc3QgdGVtcCA9IHNhbXBsZVtpbmRleF07XG4gICAgICAgIHNhbXBsZVtpbmRleF0gPSBzYW1wbGVbcmFuZF07XG4gICAgICAgIHNhbXBsZVtyYW5kXSA9IHRlbXA7XG4gICAgfVxuICAgIHJldHVybiBzYW1wbGUuc2xpY2UoMCwgY291bnQpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIHJlc3VsdCBvZiBwZXJtdXRhdGlvbiBmcm9tIHRoZSBsaXN0LlxuICogQGphIOmFjeWIl+OBi+OCiemghuWIl+e1kOaenOOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgYXJyID0gcGVybXV0YXRpb24oWydhJywgJ2InLCAnYyddLCAyKTtcbiAqIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFycikpO1xuICogLy8gPT4gW1snYScsJ2InXSxbJ2EnLCdjJ10sWydiJywnYSddLFsnYicsJ2MnXSxbJ2MnLCdhJ10sWydjJywnYiddXVxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjb3VudFxuICogIC0gYGVuYCBudW1iZXIgb2YgcGljayB1cC5cbiAqICAtIGBqYWAg6YG45oqe5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJtdXRhdGlvbjxUPihhcnJheTogVFtdLCBjb3VudDogbnVtYmVyKTogVFtdW10ge1xuICAgIGNvbnN0IHJldHZhbDogVFtdW10gPSBbXTtcbiAgICBpZiAoYXJyYXkubGVuZ3RoIDwgY291bnQpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBpZiAoMSA9PT0gY291bnQpIHtcbiAgICAgICAgZm9yIChjb25zdCBbaSwgdmFsXSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIHJldHZhbFtpXSA9IFt2YWxdO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIG4xID0gYXJyYXkubGVuZ3RoOyBpIDwgbjE7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgcGFydHMgPSBhcnJheS5zbGljZSgwKTtcbiAgICAgICAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IHBlcm11dGF0aW9uKHBhcnRzLCBjb3VudCAtIDEpO1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDAsIG4yID0gcm93Lmxlbmd0aDsgaiA8IG4yOyBqKyspIHtcbiAgICAgICAgICAgICAgICByZXR2YWwucHVzaChbYXJyYXlbaV1dLmNvbmNhdChyb3dbal0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgcmVzdWx0IG9mIGNvbWJpbmF0aW9uIGZyb20gdGhlIGxpc3QuXG4gKiBAamEg6YWN5YiX44GL44KJ57WE44G/5ZCI44KP44Gb57WQ5p6c44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBhcnIgPSBjb21iaW5hdGlvbihbJ2EnLCAnYicsICdjJ10sIDIpO1xuICogY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYXJyKSk7XG4gKiAvLyA9PiBbWydhJywnYiddLFsnYScsJ2MnXSxbJ2InLCdjJ11dXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNvdW50XG4gKiAgLSBgZW5gIG51bWJlciBvZiBwaWNrIHVwLlxuICogIC0gYGphYCDpgbjmip7mlbBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmF0aW9uPFQ+KGFycmF5OiBUW10sIGNvdW50OiBudW1iZXIpOiBUW11bXSB7XG4gICAgY29uc3QgcmV0dmFsOiBUW11bXSA9IFtdO1xuICAgIGlmIChhcnJheS5sZW5ndGggPCBjb3VudCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGlmICgxID09PSBjb3VudCkge1xuICAgICAgICBmb3IgKGNvbnN0IFtpLCB2YWxdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICAgICAgcmV0dmFsW2ldID0gW3ZhbF07XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbjEgPSBhcnJheS5sZW5ndGg7IGkgPCBuMSAtIGNvdW50ICsgMTsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBjb21iaW5hdGlvbihhcnJheS5zbGljZShpICsgMSksIGNvdW50IC0gMSk7XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMCwgbjIgPSByb3cubGVuZ3RoOyBqIDwgbjI7IGorKykge1xuICAgICAgICAgICAgICAgIHJldHZhbC5wdXNoKFthcnJheVtpXV0uY29uY2F0KHJvd1tqXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUubWFwKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUubWFwKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICogXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50ICpBcnJheSogYXMgdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+e1kOaenOmFjeWIl+OCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFwPFQsIFU+KHRoaXM6IHVua25vd24sIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUgfCBQcm9taXNlPFU+LCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8VVtdPiB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFxuICAgICAgICBhcnJheS5tYXAoYXN5bmMgKHYsIGksIGEpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdiwgaSwgYSk7XG4gICAgICAgIH0pXG4gICAgKTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLmZpbHRlcigpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLmZpbHRlcigpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50ICpBcnJheSogYXMgdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+e1kOaenOmFjeWIl+OCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmlsdGVyPFQ+KHRoaXM6IHVua25vd24sIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IGJvb2xlYW4gfCBQcm9taXNlPGJvb2xlYW4+LCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8VFtdPiB7XG4gICAgY29uc3QgYml0czogYm9vbGVhbltdID0gYXdhaXQgbWFwKGFycmF5LCAodiwgaSwgYSkgPT4gY2FsbGJhY2suY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHYsIGksIGEpKTtcbiAgICByZXR1cm4gYXJyYXkuZmlsdGVyKCgpID0+IGJpdHMuc2hpZnQoKSk7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5maW5kKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZmluZCgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50IHZhbHVlLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PntZDmnpzjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbmQ8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxUIHwgdW5kZWZpbmVkPiB7XG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmIChhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdiwgaSwgYXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gdjtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuZmluZEluZGV4KClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZmluZEluZGV4KClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgaW5kZXggdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCueOCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZEluZGV4PFQ+KHRoaXM6IHVua25vd24sIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IGJvb2xlYW4gfCBQcm9taXNlPGJvb2xlYW4+LCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmIChhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdiwgaSwgYXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5zb21lKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuc29tZSgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50IGJvb2xlYW4gdmFsdWUuXG4gKiAgLSBgamFgIOecn+WBveWApOOCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc29tZTxUPih0aGlzOiB1bmtub3duLCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiB1bmtub3duLCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGZvciAoY29uc3QgW2ksIHZdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoYXdhaXQgY2FsbGJhY2suY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHYsIGksIGFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuZXZlcnkoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5ldmVyeSgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50IGJvb2xlYW4gdmFsdWUuXG4gKiAgLSBgamFgIOecn+WBveWApOOCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXZlcnk8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdW5rbm93biwgdGhpc0FyZz86IHVua25vd24pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKCFhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdiwgaSwgYXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5yZWR1Y2UoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5yZWR1Y2UoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIGluaXRpYWxWYWx1ZVxuICogIC0gYGVuYCBVc2VkIGFzIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBmaXJzdCBjYWxsIG9mIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag44Gr5rih44GV44KM44KL5Yid5pyf5YCkXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgKkFycmF5KiBhcyB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c6YWN5YiX44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWR1Y2U8VCwgVT4oXG4gICAgYXJyYXk6IFRbXSxcbiAgICBjYWxsYmFjazogKGFjY3VtdWxhdG9yOiBVLCBjdXJyZW50VmFsdWU6IFQsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVIHwgUHJvbWlzZTxVPixcbiAgICBpbml0aWFsVmFsdWU/OiBVXG4pOiBQcm9taXNlPFU+IHtcbiAgICBpZiAoYXJyYXkubGVuZ3RoIDw9IDAgJiYgdW5kZWZpbmVkID09PSBpbml0aWFsVmFsdWUpIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdSZWR1Y2Ugb2YgZW1wdHkgYXJyYXkgd2l0aCBubyBpbml0aWFsIHZhbHVlJyk7XG4gICAgfVxuXG4gICAgY29uc3QgaGFzSW5pdCA9ICh1bmRlZmluZWQgIT09IGluaXRpYWxWYWx1ZSk7XG4gICAgbGV0IGFjYyA9IChoYXNJbml0ID8gaW5pdGlhbFZhbHVlIDogYXJyYXlbMF0pIGFzIFU7XG5cbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKCEoIWhhc0luaXQgJiYgMCA9PT0gaSkpIHtcbiAgICAgICAgICAgIGFjYyA9IGF3YWl0IGNhbGxiYWNrKGFjYywgdiwgaSwgYXJyYXkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGFjYztcbn1cbiIsIi8qKlxuICogQGVuIERhdGUgdW5pdCBkZWZpbml0aW9ucy5cbiAqIEBqYSDml6XmmYLjgqrjg5bjgrjjgqfjgq/jg4jjga7ljZjkvY3lrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgRGF0ZVVuaXQgPSAneWVhcicgfCAnbW9udGgnIHwgJ2RheScgfCAnaG91cicgfCAnbWluJyB8ICdzZWMnIHwgJ21zZWMnO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfY29tcHV0ZURhdGVGdW5jTWFwID0ge1xuICAgIHllYXI6IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ0Z1bGxZZWFyKGJhc2UuZ2V0VVRDRnVsbFllYXIoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG4gICAgbW9udGg6IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ01vbnRoKGJhc2UuZ2V0VVRDTW9udGgoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG4gICAgZGF5OiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENEYXRlKGJhc2UuZ2V0VVRDRGF0ZSgpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbiAgICBob3VyOiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENIb3VycyhiYXNlLmdldFVUQ0hvdXJzKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIG1pbjogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDTWludXRlcyhiYXNlLmdldFVUQ01pbnV0ZXMoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG4gICAgc2VjOiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENTZWNvbmRzKGJhc2UuZ2V0VVRDU2Vjb25kcygpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbiAgICBtc2VjOiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENNaWxsaXNlY29uZHMoYmFzZS5nZXRVVENNaWxsaXNlY29uZHMoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG59O1xuXG4vKipcbiAqIEBlbiBDYWxjdWxhdGUgZnJvbSB0aGUgZGF0ZSB3aGljaCBiZWNvbWVzIGEgY2FyZGluYWwgcG9pbnQgYmVmb3JlIGEgTiBkYXRlIHRpbWUgb3IgYWZ0ZXIgYSBOIGRhdGUgdGltZSAoYnkge0BsaW5rIERhdGVVbml0fSkuXG4gKiBAamEg5Z+654K544Go44Gq44KL5pel5LuY44GL44KJ44CBTuaXpeW+jOOAgU7ml6XliY3jgpLnrpflh7pcbiAqXG4gKiBAcGFyYW0gYmFzZVxuICogIC0gYGVuYCBiYXNlIGRhdGUgdGltZS5cbiAqICAtIGBqYWAg5Z+65rqW5pelXG4gKiBAcGFyYW0gYWRkXG4gKiAgLSBgZW5gIHJlbGF0aXZlIGRhdGUgdGltZS5cbiAqICAtIGBqYWAg5Yqg566X5pelLiDjg57jgqTjg4rjgrnmjIflrprjgadu5pel5YmN44KC6Kit5a6a5Y+v6IO9XG4gKiBAcGFyYW0gdW5pdCB7QGxpbmsgRGF0ZVVuaXR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlRGF0ZShiYXNlOiBEYXRlLCBhZGQ6IG51bWJlciwgdW5pdDogRGF0ZVVuaXQgPSAnZGF5Jyk6IERhdGUge1xuICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShiYXNlLmdldFRpbWUoKSk7XG4gICAgY29uc3QgZnVuYyA9IF9jb21wdXRlRGF0ZUZ1bmNNYXBbdW5pdF07XG4gICAgaWYgKGZ1bmMpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMoZGF0ZSwgYmFzZSwgYWRkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBpbnZhbGlkIHVuaXQ6ICR7dW5pdH1gKTtcbiAgICB9XG59XG4iLCJjb25zdCBfc3RhdHVzOiBSZWNvcmQ8c3RyaW5nIHwgc3ltYm9sLCBudW1iZXI+ID0ge307XG5cbi8qKlxuICogQGVuIEluY3JlbWVudCByZWZlcmVuY2UgY291bnQgZm9yIHN0YXR1cyBpZGVudGlmaWVyLlxuICogQGphIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruOCpOODs+OCr+ODquODoeODs+ODiFxuICpcbiAqIEBwYXJhbSBzdGF0dXNcbiAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIHJlZmVyZW5jZSBjb3VudCB2YWx1ZVxuICogIC0gYGphYCDlj4Lnhafjgqvjgqbjg7Pjg4jjga7lgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0YXR1c0FkZFJlZihzdGF0dXM6IHN0cmluZyB8IHN5bWJvbCk6IG51bWJlciB7XG4gICAgaWYgKCFfc3RhdHVzW3N0YXR1c10pIHtcbiAgICAgICAgX3N0YXR1c1tzdGF0dXNdID0gMTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBfc3RhdHVzW3N0YXR1c10rKztcbiAgICB9XG4gICAgcmV0dXJuIF9zdGF0dXNbc3RhdHVzXTtcbn1cblxuLyoqXG4gKiBAZW4gRGVjcmVtZW50IHJlZmVyZW5jZSBjb3VudCBmb3Igc3RhdHVzIGlkZW50aWZpZXIuXG4gKiBAamEg54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44OH44Kv44Oq44Oh44Oz44OIXG4gKlxuICogQHBhcmFtIHN0YXR1c1xuICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgcmVmZXJlbmNlIGNvdW50IHZhbHVlXG4gKiAgLSBgamFgIOWPgueFp+OCq+OCpuODs+ODiOOBruWApFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RhdHVzUmVsZWFzZShzdGF0dXM6IHN0cmluZyB8IHN5bWJvbCk6IG51bWJlciB7XG4gICAgaWYgKCFfc3RhdHVzW3N0YXR1c10pIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcmV0dmFsID0gLS1fc3RhdHVzW3N0YXR1c107XG4gICAgICAgIGlmICgwID09PSByZXR2YWwpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBfc3RhdHVzW3N0YXR1c107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIFN0YXRlIHZhcmlhYmxlIG1hbmFnZW1lbnQgc2NvcGVcbiAqIEBqYSDnirbmhYvlpInmlbDnrqHnkIbjgrnjgrPjg7zjg5dcbiAqXG4gKiBAcGFyYW0gc3RhdHVzXG4gKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWwXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCByZXR2YWwgb2Ygc2VlZCBmdW5jdGlvbi5cbiAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWw44Gu5oi744KK5YCkXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGF0dXNTY29wZTxUPihzdGF0dXM6IHN0cmluZyB8IHN5bWJvbCwgZXhlY3V0b3I6ICgpID0+IFQgfCBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gICAgdHJ5IHtcbiAgICAgICAgc3RhdHVzQWRkUmVmKHN0YXR1cyk7XG4gICAgICAgIHJldHVybiBhd2FpdCBleGVjdXRvcigpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAgIHN0YXR1c1JlbGVhc2Uoc3RhdHVzKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENoZWNrIGlmIGl0J3MgaW4gdGhlIHNwZWNpZmllZCBzdGF0ZS5cbiAqIEBqYSDmjIflrprjgZfjgZ/nirbmhYvkuK3jgafjgYLjgovjgYvnorroqo1cbiAqXG4gKiBAcGFyYW0gc3RhdHVzXG4gKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gKiBAcmV0dXJuIHtCb29sZWFufSB0cnVlOiDnirbmhYvlhoUgLyBmYWxzZTog54q25oWL5aSWXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBgdHJ1ZWA6IHdpdGhpbiB0aGUgc3RhdHVzIC8gYGZhbHNlYDogb3V0IG9mIHRoZSBzdGF0dXNcbiAqICAtIGBqYWAgYHRydWVgOiDnirbmhYvlhoUgLyBgZmFsc2VgOiDnirbmhYvlpJZcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3RhdHVzSW4oc3RhdHVzOiBzdHJpbmcgfCBzeW1ib2wpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISFfc3RhdHVzW3N0YXR1c107XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBBcmd1bWVudHMsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBpc1N5bWJvbCxcbiAgICBjbGFzc05hbWUsXG4gICAgdmVyaWZ5LFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFdmVudEFsbCxcbiAgICBTdWJzY3JpcHRpb24sXG4gICAgU3Vic2NyaWJhYmxlLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIExpc25lciDmoLzntI3lvaLlvI8gKi9cbnR5cGUgTGlzdGVuZXJzTWFwPFQ+ID0gTWFwPGtleW9mIFQsIFNldDwoLi4uYXJnczogVFtrZXlvZiBUXVtdKSA9PiB1bmtub3duPj47XG5cbi8qKiBAaW50ZXJuYWwgTGlzbmVyIOOBruW8seWPgueFpyAqL1xuY29uc3QgX21hcExpc3RlbmVycyA9IG5ldyBXZWFrTWFwPEV2ZW50UHVibGlzaGVyPGFueT4sIExpc3RlbmVyc01hcDxhbnk+PigpO1xuXG4vKiogQGludGVybmFsIExpc25lck1hcCDjga7lj5blvpcgKi9cbmZ1bmN0aW9uIGxpc3RlbmVyczxUIGV4dGVuZHMgb2JqZWN0PihpbnN0YW5jZTogRXZlbnRQdWJsaXNoZXI8VD4pOiBMaXN0ZW5lcnNNYXA8VD4ge1xuICAgIGlmICghX21hcExpc3RlbmVycy5oYXMoaW5zdGFuY2UpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoaXMgaXMgbm90IGEgdmFsaWQgRXZlbnRQdWJsaXNoZXIuJyk7XG4gICAgfVxuICAgIHJldHVybiBfbWFwTGlzdGVuZXJzLmdldChpbnN0YW5jZSkgYXMgTGlzdGVuZXJzTWFwPFQ+O1xufVxuXG4vKiogQGludGVybmFsIENoYW5uZWwg44Gu5Z6L5qSc6Ki8ICovXG5mdW5jdGlvbiB2YWxpZENoYW5uZWwoY2hhbm5lbDogdW5rbm93bik6IHZvaWQgfCBuZXZlciB7XG4gICAgaWYgKGlzU3RyaW5nKGNoYW5uZWwpIHx8IGlzU3ltYm9sKGNoYW5uZWwpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVHlwZSBvZiAke2NsYXNzTmFtZShjaGFubmVsKX0gaXMgbm90IGEgdmFsaWQgY2hhbm5lbC5gKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBMaXN0ZW5lciDjga7lnovmpJzoqLwgKi9cbmZ1bmN0aW9uIHZhbGlkTGlzdGVuZXIobGlzdGVuZXI/OiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB1bmtub3duKTogYW55IHtcbiAgICBpZiAobnVsbCAhPSBsaXN0ZW5lcikge1xuICAgICAgICB2ZXJpZnkoJ3R5cGVPZicsICdmdW5jdGlvbicsIGxpc3RlbmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpc3RlbmVyO1xufVxuXG4vKiogQGludGVybmFsIGV2ZW50IOeZuuihjCAqL1xuZnVuY3Rpb24gdHJpZ2dlckV2ZW50PEV2ZW50LCBDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KFxuICAgIG1hcDogTGlzdGVuZXJzTWFwPEV2ZW50PixcbiAgICBjaGFubmVsOiBDaGFubmVsLFxuICAgIG9yaWdpbmFsOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgLi4uYXJnczogQXJndW1lbnRzPFBhcnRpYWw8RXZlbnRbQ2hhbm5lbF0+PlxuKTogdm9pZCB7XG4gICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2hhbm5lbCk7XG4gICAgaWYgKCFsaXN0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yIChjb25zdCBsaXN0ZW5lciBvZiBsaXN0KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBldmVudEFyZ3MgPSBvcmlnaW5hbCA/IFtvcmlnaW5hbCwgLi4uYXJnc10gOiBhcmdzO1xuICAgICAgICAgICAgY29uc3QgaGFuZGxlZCA9IGxpc3RlbmVyKC4uLmV2ZW50QXJncyk7XG4gICAgICAgICAgICAvLyBpZiByZWNlaXZlZCAndHJ1ZScsIHN0b3AgZGVsZWdhdGlvbi5cbiAgICAgICAgICAgIGlmICh0cnVlID09PSBoYW5kbGVkKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHZvaWQgUHJvbWlzZS5yZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBFdmVudGluZyBmcmFtZXdvcmsgY2xhc3Mgd2l0aCBlbnN1cmluZyB0eXBlLXNhZmUgZm9yIFR5cGVTY3JpcHQuIDxicj5cbiAqICAgICBUaGUgY2xpZW50IG9mIHRoaXMgY2xhc3MgY2FuIGltcGxlbWVudCBvcmlnaW5hbCBQdWItU3ViIChPYnNlcnZlcikgZGVzaWduIHBhdHRlcm4uXG4gKiBAamEg5Z6L5a6J5YWo44KS5L+d6Zqc44GZ44KL44Kk44OZ44Oz44OI55m76Yyy44O755m66KGM44Kv44Op44K5IDxicj5cbiAqICAgICDjgq/jg6njgqTjgqLjg7Pjg4jjga/mnKzjgq/jg6njgrnjgpLmtL7nlJ/jgZfjgabni6zoh6rjga4gUHViLVN1YiAoT2JzZXJ2ZXIpIOODkeOCv+ODvOODs+OCkuWun+ijheWPr+iDvVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIC8vIGRlY2xhcmUgZXZlbnQgaW50ZXJmYWNlXG4gKiBpbnRlcmZhY2UgU2FtcGxlRXZlbnQge1xuICogICBob2dlOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqICAgZm9vOiBbdm9pZF07ICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3NcbiAqICAgaG9vOiB2b2lkOyAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3MgKHNhbWUgdGhlIHVwb24pXG4gKiAgIGJhcjogW0Vycm9yXTsgICAgICAgICAgICAgICAgICAvLyBhbnkgY2xhc3MgaXMgYXZhaWxhYmxlLlxuICogICBiYXo6IEVycm9yIHwgTnVtYmVyOyAgICAgICAgICAgLy8gaWYgb25seSBvbmUgYXJndW1lbnQsIGBbXWAgaXMgbm90IHJlcXVpcmVkLlxuICogfVxuICpcbiAqIC8vIGRlY2xhcmUgY2xpZW50IGNsYXNzXG4gKiBjbGFzcyBTYW1wbGVQdWJsaXNoZXIgZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxTYW1wbGVFdmVudD4ge1xuICogICA6XG4gKiAgIHNvbWVNZXRob2QoKTogdm9pZCB7XG4gKiAgICAgdGhpcy5wdWJsaXNoKCdob2dlJywgMTAwLCAndGVzdCcpOyAgICAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiAgICAgdGhpcy5wdWJsaXNoKCdob2dlJywgMTAwLCB0cnVlKTsgICAgICAgICAvLyBORy4gYXJndW1lbnQgb2YgdHlwZSAndHJ1ZScgaXMgbm90IGFzc2lnbmFibGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBwYXJhbWV0ZXIgb2YgdHlwZSAnc3RyaW5nIHwgdW5kZWZpbmVkJy5cbiAqICAgICB0aGlzLnB1Ymxpc2goJ2hvZ2UnLCAxMDApOyAgICAgICAgICAgICAgIC8vIE9LLiBhbGwgYXJncyB0byBiZSBvcHRpb25hbCBhdXRvbWF0aWNhbGx5LlxuICogICAgIHRoaXMucHVibGlzaCgnZm9vJyk7ICAgICAgICAgICAgICAgICAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogICAgIHRoaXMucHVibGlzaCgnZm9vJywgMTAwKTsgICAgICAgICAgICAgICAgLy8gTkcuIGFyZ3VtZW50IG9mIHR5cGUgJzEwMCcgaXMgbm90IGFzc2lnbmFibGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBwYXJhbWV0ZXIgb2YgdHlwZSAndm9pZCB8IHVuZGVmaW5lZCcuXG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBzYW1wbGUgPSBuZXcgU2FtcGxlUHVibGlzaGVyKCk7XG4gKlxuICogc2FtcGxlLm9uKCdob2dlJywgKGE6IG51bWJlciwgYjogc3RyaW5nKSA9PiB7IC4uLiB9KTsgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogc2FtcGxlLm9uKCdob2dlJywgKGE6IG51bWJlciwgYjogYm9vbGVhbikgPT4geyAuLi4gfSk7ICAgLy8gTkcuIHR5cGVzIG9mIHBhcmFtZXRlcnMgJ2InXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgYW5kICdhcmdzXzEnIGFyZSBpbmNvbXBhdGlibGUuXG4gKiBzYW1wbGUub24oJ2hvZ2UnLCAoYSkgPT4geyAuLi4gfSk7ICAgICAgICAgICAgICAgICAgICAgICAvLyBPSy4gYWxsIGFyZ3NcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBiZSBvcHRpb25hbCBhdXRvbWF0aWNhbGx5LlxuICogc2FtcGxlLm9uKCdob2dlJywgKGEsIGIsIGMpID0+IHsgLi4uIH0pOyAgICAgICAgICAgICAgICAgLy8gTkcuIGV4cGVjdGVkIDEtMiBhcmd1bWVudHMsXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgYnV0IGdvdCAzLlxuICogYGBgXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBFdmVudFB1Ymxpc2hlcjxFdmVudCBleHRlbmRzIG9iamVjdD4gaW1wbGVtZW50cyBTdWJzY3JpYmFibGU8RXZlbnQ+IHtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBFdmVudFB1Ymxpc2hlciwgdGhpcyk7XG4gICAgICAgIF9tYXBMaXN0ZW5lcnMuc2V0KHRoaXMsIG5ldyBNYXAoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE5vdGlmeSBldmVudCB0byBjbGllbnRzLlxuICAgICAqIEBqYSBldmVudCDnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgavmuKHjgZnlvJXmlbBcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgcHVibGlzaDxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwsIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICB2YWxpZENoYW5uZWwoY2hhbm5lbCk7XG4gICAgICAgIHRyaWdnZXJFdmVudChtYXAsIGNoYW5uZWwsIHVuZGVmaW5lZCwgLi4uYXJncyk7XG4gICAgICAgIC8vIHRyaWdnZXIgZm9yIGFsbCBoYW5kbGVyXG4gICAgICAgIGlmICgnKicgIT09IGNoYW5uZWwpIHtcbiAgICAgICAgICAgIHRyaWdnZXJFdmVudChtYXAgYXMgdW5rbm93biBhcyBMaXN0ZW5lcnNNYXA8RXZlbnRBbGw+LCAnKicsIGNoYW5uZWwgYXMgc3RyaW5nLCAuLi5hcmdzKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFN1YnNjcmliYWJsZTxFdmVudD5cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIHRoaXMgb2JqZWN0IGhhcyBjbGllbnRzLlxuICAgICAqIEBqYSDjgq/jg6njgqTjgqLjg7Pjg4jjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIGhhc0xpc3RlbmVyPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbD86IENoYW5uZWwsIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICBpZiAobnVsbCA9PSBjaGFubmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFwLnNpemUgPiAwO1xuICAgICAgICB9XG4gICAgICAgIHZhbGlkQ2hhbm5lbChjaGFubmVsKTtcbiAgICAgICAgaWYgKG51bGwgPT0gbGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXAuaGFzKGNoYW5uZWwpO1xuICAgICAgICB9XG4gICAgICAgIHZhbGlkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaGFubmVsKTtcbiAgICAgICAgcmV0dXJuIGxpc3QgPyBsaXN0LmhhcyhsaXN0ZW5lcikgOiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyByZWdpc3RlcmVkIGNoYW5uZWwga2V5cy5cbiAgICAgKiBAamEg55m76Yyy44GV44KM44Gm44GE44KL44OB44Oj44ON44Or44Kt44O844KS6L+U5Y20XG4gICAgICovXG4gICAgY2hhbm5lbHMoKTogKGtleW9mIEV2ZW50KVtdIHtcbiAgICAgICAgcmV0dXJuIFsuLi5saXN0ZW5lcnModGhpcykua2V5cygpXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVycyh0aGlzKTtcbiAgICAgICAgdmFsaWRMaXN0ZW5lcihsaXN0ZW5lcik7XG5cbiAgICAgICAgY29uc3QgY2hhbm5lbHMgPSBpc0FycmF5KGNoYW5uZWwpID8gY2hhbm5lbCA6IFtjaGFubmVsXTtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgdmFsaWRDaGFubmVsKGNoKTtcbiAgICAgICAgICAgIG1hcC5oYXMoY2gpID8gbWFwLmdldChjaCkhLmFkZChsaXN0ZW5lcikgOiBtYXAuc2V0KGNoLCBuZXcgU2V0KFtsaXN0ZW5lcl0pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3QuZnJlZXplKHtcbiAgICAgICAgICAgIGdldCBlbmFibGUoKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbGlzdCB8fCAhbGlzdC5oYXMobGlzdGVuZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdW5zdWJzY3JpYmUoKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsaXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0LmRlbGV0ZShsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0LnNpemUgPiAwIHx8IG1hcC5kZWxldGUoY2gpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKSBidXQgaXQgY2F1c2VzIHRoZSBib3VuZCBjYWxsYmFjayB0byBvbmx5IGZpcmUgb25jZSBiZWZvcmUgYmVpbmcgcmVtb3ZlZC5cbiAgICAgKiBAamEg5LiA5bqm44Gg44GR44OP44Oz44OJ44Oq44Oz44Kw5Y+v6IO944Gq44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb25jZTxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLm9uKGNoYW5uZWwsIGxpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgbWFuYWdlZCA9IHRoaXMub24oY2hhbm5lbCwgKCkgPT4ge1xuICAgICAgICAgICAgY29udGV4dC51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgbWFuYWdlZC51bnN1YnNjcmliZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGV2ZXJ5dGhpbmcgaXMgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuino+mZpFxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WQjOS4gCBgY2hhbm5lbGAg44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbD86IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICBpZiAobnVsbCA9PSBjaGFubmVsKSB7XG4gICAgICAgICAgICBtYXAuY2xlYXIoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2hhbm5lbHMgPSBpc0FycmF5KGNoYW5uZWwpID8gY2hhbm5lbCA6IFtjaGFubmVsXTtcbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSB2YWxpZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgdmFsaWRDaGFubmVsKGNoKTtcbiAgICAgICAgICAgIGlmIChudWxsID09IGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgbWFwLmRlbGV0ZShjaCk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoKTtcbiAgICAgICAgICAgICAgICBpZiAobGlzdCkge1xuICAgICAgICAgICAgICAgICAgICBsaXN0LmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgICAgIGxpc3Quc2l6ZSA+IDAgfHwgbWFwLmRlbGV0ZShjaCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7IEFyZ3VtZW50cyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpYmFibGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICcuL3B1Ymxpc2hlcic7XG5cbi8qKiByZS1leHBvcnQgKi9cbmV4cG9ydCB0eXBlIEV2ZW50QXJndW1lbnRzPFQ+ID0gQXJndW1lbnRzPFQ+O1xuXG4vKipcbiAqIEBlbiBFdmVudGluZyBmcmFtZXdvcmsgb2JqZWN0IGFibGUgdG8gY2FsbCBgcHVibGlzaCgpYCBtZXRob2QgZnJvbSBvdXRzaWRlLlxuICogQGphIOWklumDqOOBi+OCieOBriBgcHVibGlzaCgpYCDjgpLlj6/og73jgavjgZfjgZ/jgqTjg5njg7Pjg4jnmbvpjLLjg7vnmbrooYzjgq/jg6njgrlcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiAvLyBkZWNsYXJlIGV2ZW50IGludGVyZmFjZVxuICogaW50ZXJmYWNlIFNhbXBsZUV2ZW50IHtcbiAqICAgaG9nZTogW251bWJlciwgc3RyaW5nXTsgICAgICAgIC8vIGNhbGxiYWNrIGZ1bmN0aW9uJ3MgYXJncyB0eXBlIHR1cGxlXG4gKiB9XG4gKlxuICogY29uc3QgYnJva2VyID0gbmV3IEV2ZW50QnJva2VyPFNhbXBsZUV2ZW50PigpO1xuICogYnJva2VyLnRyaWdnZXIoJ2hvZ2UnLCAxMDAsICd0ZXN0Jyk7ICAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiBicm9rZXIudHJpZ2dlcignaG9nZScsIDEwMCwgdHJ1ZSk7ICAgICAgIC8vIE5HLiBhcmd1bWVudCBvZiB0eXBlICd0cnVlJyBpcyBub3QgYXNzaWduYWJsZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdG8gcGFyYW1ldGVyIG9mIHR5cGUgJ3N0cmluZyB8IHVuZGVmaW5lZCcuXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFdmVudEJyb2tlcjxFdmVudCBleHRlbmRzIG9iamVjdD4gZXh0ZW5kcyBTdWJzY3JpYmFibGU8RXZlbnQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gTm90aWZ5IGV2ZW50IHRvIGNsaWVudHMuXG4gICAgICogQGphIGV2ZW50IOeZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGFyZ3VtZW50cyBmb3IgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsOOBq+a4oeOBmeW8leaVsFxuICAgICAqL1xuICAgIHRyaWdnZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsLCAuLi5hcmdzOiBBcmd1bWVudHM8UGFydGlhbDxFdmVudFtDaGFubmVsXT4+KTogdm9pZDtcbn1cblxuLyoqXG4gKiBAZW4gQ29uc3RydWN0b3Igb2Yge0BsaW5rIEV2ZW50QnJva2VyfVxuICogQGphIHtAbGluayBFdmVudEJyb2tlcn0g44Gu44Kz44Oz44K544OI44Op44Kv44K/5a6f5L2TXG4gKi9cbmV4cG9ydCBjb25zdCBFdmVudEJyb2tlcjoge1xuICAgIHJlYWRvbmx5IHByb3RvdHlwZTogRXZlbnRCcm9rZXI8YW55PjtcbiAgICBuZXcgPFQgZXh0ZW5kcyBvYmplY3Q+KCk6IEV2ZW50QnJva2VyPFQ+O1xufSA9IEV2ZW50UHVibGlzaGVyIGFzIGFueTtcblxuRXZlbnRCcm9rZXIucHJvdG90eXBlLnRyaWdnZXIgPSAoRXZlbnRQdWJsaXNoZXIucHJvdG90eXBlIGFzIGFueSkucHVibGlzaDtcbiIsImltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIEFyZ3VtZW50cyxcbiAgICBpc0FycmF5LFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBTdWJzY3JpYmFibGUsXG4gICAgU3Vic2NyaXB0aW9uLFxuICAgIEV2ZW50U2NoZW1hLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9jb250ZXh0ID0gU3ltYm9sKCdjb250ZXh0Jyk7XG4vKiogQGludGVybmFsICovIHR5cGUgU3Vic2NyaXB0aW9uTWFwID0gTWFwPFVua25vd25GdW5jdGlvbiwgU3Vic2NyaXB0aW9uPjtcbi8qKiBAaW50ZXJuYWwgKi8gdHlwZSBMaXN0ZXJNYXAgICAgICAgPSBNYXA8c3RyaW5nLCBTdWJzY3JpcHRpb25NYXA+O1xuLyoqIEBpbnRlcm5hbCAqLyB0eXBlIFN1YnNjcmlwdGlvblNldCA9IFNldDxTdWJzY3JpcHRpb24+O1xuLyoqIEBpbnRlcm5hbCAqLyB0eXBlIFN1YnNjcmliYWJsZU1hcCA9IFdlYWtNYXA8U3Vic2NyaWJhYmxlLCBMaXN0ZXJNYXA+O1xuXG4vKiogQGludGVybmFsIExpc25lciDmoLzntI3lvaLlvI8gKi9cbmludGVyZmFjZSBDb250ZXh0IHtcbiAgICBtYXA6IFN1YnNjcmliYWJsZU1hcDtcbiAgICBzZXQ6IFN1YnNjcmlwdGlvblNldDtcbn1cblxuLyoqIEBpbnRlcm5hbCByZWdpc3RlciBsaXN0ZW5lciBjb250ZXh0ICovXG5mdW5jdGlvbiByZWdpc3Rlcihjb250ZXh0OiBDb250ZXh0LCB0YXJnZXQ6IFN1YnNjcmliYWJsZSwgY2hhbm5lbDogc3RyaW5nIHwgc3RyaW5nW10sIGxpc3RlbmVyOiBVbmtub3duRnVuY3Rpb24pOiBTdWJzY3JpcHRpb24ge1xuICAgIGNvbnN0IHN1YnNjcmlwdGlvbnM6IFN1YnNjcmlwdGlvbltdID0gW107XG5cbiAgICBjb25zdCBjaGFubmVscyA9IGlzQXJyYXkoY2hhbm5lbCkgPyBjaGFubmVsIDogW2NoYW5uZWxdO1xuICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgY29uc3QgcyA9IHRhcmdldC5vbihjaCwgbGlzdGVuZXIpO1xuICAgICAgICBjb250ZXh0LnNldC5hZGQocyk7XG4gICAgICAgIHN1YnNjcmlwdGlvbnMucHVzaChzKTtcblxuICAgICAgICBjb25zdCBsaXN0ZW5lck1hcCA9IGNvbnRleHQubWFwLmdldCh0YXJnZXQpID8/IG5ldyBNYXA8c3RyaW5nLCBNYXA8VW5rbm93bkZ1bmN0aW9uLCBTdWJzY3JpcHRpb24+PigpO1xuICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lck1hcC5nZXQoY2gpID8/IG5ldyBNYXA8VW5rbm93bkZ1bmN0aW9uLCBTdWJzY3JpcHRpb24+KCk7XG4gICAgICAgIG1hcC5zZXQobGlzdGVuZXIsIHMpO1xuXG4gICAgICAgIGlmICghbGlzdGVuZXJNYXAuaGFzKGNoKSkge1xuICAgICAgICAgICAgbGlzdGVuZXJNYXAuc2V0KGNoLCBtYXApO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY29udGV4dC5tYXAuaGFzKHRhcmdldCkpIHtcbiAgICAgICAgICAgIGNvbnRleHQubWFwLnNldCh0YXJnZXQsIGxpc3RlbmVyTWFwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBPYmplY3QuZnJlZXplKHtcbiAgICAgICAgZ2V0IGVuYWJsZSgpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBzdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKHMuZW5hYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgdW5zdWJzY3JpYmUoKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2Ygc3Vic2NyaXB0aW9ucykge1xuICAgICAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9KTtcbn1cblxuLyoqIEBpbnRlcm5hbCB1bnJlZ2lzdGVyIGxpc3RlbmVyIGNvbnRleHQgKi9cbmZ1bmN0aW9uIHVucmVnaXN0ZXIoY29udGV4dDogQ29udGV4dCwgdGFyZ2V0PzogU3Vic2NyaWJhYmxlLCBjaGFubmVsPzogc3RyaW5nIHwgc3RyaW5nW10sIGxpc3RlbmVyPzogVW5rbm93bkZ1bmN0aW9uKTogdm9pZCB7XG4gICAgaWYgKG51bGwgIT0gdGFyZ2V0KSB7XG4gICAgICAgIHRhcmdldC5vZmYoY2hhbm5lbCwgbGlzdGVuZXIpO1xuXG4gICAgICAgIGNvbnN0IGxpc3RlbmVyTWFwID0gY29udGV4dC5tYXAuZ2V0KHRhcmdldCk7XG4gICAgICAgIGlmICghbGlzdGVuZXJNYXApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAobnVsbCAhPSBjaGFubmVsKSB7XG4gICAgICAgICAgICBjb25zdCBjaGFubmVscyA9IGlzQXJyYXkoY2hhbm5lbCkgPyBjaGFubmVsIDogW2NoYW5uZWxdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVyTWFwLmdldChjaCk7XG4gICAgICAgICAgICAgICAgaWYgKCFtYXApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcyA9IG1hcC5nZXQobGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5zZXQuZGVsZXRlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG1hcC5kZWxldGUobGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBtYXAudmFsdWVzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuc2V0LmRlbGV0ZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbWFwIG9mIGxpc3RlbmVyTWFwLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIG1hcC52YWx1ZXMoKSkge1xuICAgICAgICAgICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQuc2V0LmRlbGV0ZShzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGNvbnN0IHMgb2YgY29udGV4dC5zZXQpIHtcbiAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0Lm1hcCA9IG5ldyBXZWFrTWFwKCk7XG4gICAgICAgIGNvbnRleHQuc2V0LmNsZWFyKCk7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIHRvIHdoaWNoIHRoZSBzYWZlIGV2ZW50IHJlZ2lzdGVyL3VucmVnaXN0ZXIgbWV0aG9kIGlzIG9mZmVyZWQgZm9yIHRoZSBvYmplY3Qgd2hpY2ggaXMgYSBzaG9ydCBsaWZlIGN5Y2xlIHRoYW4gc3Vic2NyaXB0aW9uIHRhcmdldC4gPGJyPlxuICogICAgIFRoZSBhZHZhbnRhZ2Ugb2YgdXNpbmcgdGhpcyBmb3JtLCBpbnN0ZWFkIG9mIGBvbigpYCwgaXMgdGhhdCBgbGlzdGVuVG8oKWAgYWxsb3dzIHRoZSBvYmplY3QgdG8ga2VlcCB0cmFjayBvZiB0aGUgZXZlbnRzLFxuICogICAgIGFuZCB0aGV5IGNhbiBiZSByZW1vdmVkIGFsbCBhdCBvbmNlIGxhdGVyIGNhbGwgYHN0b3BMaXN0ZW5pbmcoKWAuXG4gKiBAamEg6LO86Kqt5a++6LGh44KI44KK44KC44Op44Kk44OV44K144Kk44Kv44Or44GM55+t44GE44Kq44OW44K444Kn44Kv44OI44Gr5a++44GX44GmLCDlronlhajjgarjgqTjg5njg7Pjg4jnmbvpjLIv6Kej6Zmk44Oh44K944OD44OJ44KS5o+Q5L6b44GZ44KL44Kv44Op44K5IDxicj5cbiAqICAgICBgb24oKWAg44Gu5Luj44KP44KK44GrIGBsaXN0ZW5UbygpYCDjgpLkvb/nlKjjgZnjgovjgZPjgajjgacsIOW+jOOBqyBgc3RvcExpc3RlbmluZygpYCDjgpIx5bqm5ZG844G244Gg44GR44Gn44GZ44G544Gm44Gu44Oq44K544OK44O844KS6Kej6Zmk44Gn44GN44KL5Yip54K544GM44GC44KLLlxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgRXZlbnRSZWNlaXZlciwgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIC8vIGRlY2xhcmUgZXZlbnQgaW50ZXJmYWNlXG4gKiBpbnRlcmZhY2UgU2FtcGxlRXZlbnQge1xuICogICBob2dlOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqICAgZm9vOiBbdm9pZF07ICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3NcbiAqICAgaG9vOiB2b2lkOyAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3MgKHNhbWUgdGhlIHVwb24pXG4gKiAgIGJhcjogW0Vycm9yXTsgICAgICAgICAgICAgICAgICAvLyBhbnkgY2xhc3MgaXMgYXZhaWxhYmxlLlxuICogICBiYXo6IEVycm9yIHwgTnVtYmVyOyAgICAgICAgICAgLy8gaWYgb25seSBvbmUgYXJndW1lbnQsIGBbXWAgaXMgbm90IHJlcXVpcmVkLlxuICogfVxuICpcbiAqIC8vIGRlY2xhcmUgY2xpZW50IGNsYXNzXG4gKiBjbGFzcyBTYW1wbGVSZWNlaXZlciBleHRlbmRzIEV2ZW50UmVjZWl2ZXIge1xuICogICBjb25zdHJ1Y3Rvcihicm9rZXI6IEV2ZW50QnJva2VyPFNhbXBsZUV2ZW50Pikge1xuICogICAgIHN1cGVyKCk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsICdob2dlJywgKG51bTogbnVtYmVyLCBzdHI6IHN0cmluZykgPT4geyAuLi4gfSk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsICdiYXInLCAoZTogRXJyb3IpID0+IHsgLi4uIH0pO1xuICogICAgIHRoaXMubGlzdGVuVG8oYnJva2VyLCBbJ2ZvbycsICdob28nXSwgKCkgPT4geyAuLi4gfSk7XG4gKiAgIH1cbiAqXG4gKiAgIHJlbGVhc2UoKTogdm9pZCB7XG4gKiAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIG9yXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGJyb2tlciAgID0gbmV3IEV2ZW50QnJva2VyPFNhbXBsZUV2ZW50PigpO1xuICogY29uc3QgcmVjZWl2ZXIgPSBuZXcgRXZlbnRSZWNlaXZlcigpO1xuICpcbiAqIHJlY2VpdmVyLmxpc3RlblRvKGJyb2tlciwgJ2hvZ2UnLCAobnVtOiBudW1iZXIsIHN0cjogc3RyaW5nKSA9PiB7IC4uLiB9KTtcbiAqIHJlY2VpdmVyLmxpc3RlblRvKGJyb2tlciwgJ2JhcicsIChlOiBFcnJvcikgPT4geyAuLi4gfSk7XG4gKiByZWNlaXZlci5saXN0ZW5Ubyhicm9rZXIsIFsnZm9vJywgJ2hvbyddLCAoKSA9PiB7IC4uLiB9KTtcbiAqXG4gKiByZWNlaXZlci5zdG9wTGlzdGVuaW5nKCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIEV2ZW50UmVjZWl2ZXIge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfY29udGV4dF06IENvbnRleHQ7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpc1tfY29udGV4dF0gPSB7IG1hcDogbmV3IFdlYWtNYXAoKSwgc2V0OiBuZXcgU2V0KCkgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGVsbCBhbiBvYmplY3QgdG8gbGlzdGVuIHRvIGEgcGFydGljdWxhciBldmVudCBvbiBhbiBvdGhlciBvYmplY3QuXG4gICAgICogQGphIOWvvuixoeOCquODluOCuOOCp+OCr+ODiOOBruOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHRhcmdldFxuICAgICAqICAtIGBlbmAgZXZlbnQgbGlzdGVuaW5nIHRhcmdldCBvYmplY3QuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jos7zoqq3lr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIGxpc3RlblRvPFQgZXh0ZW5kcyBTdWJzY3JpYmFibGUsIEV2ZW50IGV4dGVuZHMgRXZlbnRTY2hlbWE8VD4gPSBFdmVudFNjaGVtYTxUPiwgQ2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50ID0ga2V5b2YgRXZlbnQ+KFxuICAgICAgICB0YXJnZXQ6IFQsXG4gICAgICAgIGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sXG4gICAgICAgIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93blxuICAgICk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiByZWdpc3Rlcih0aGlzW19jb250ZXh0XSwgdGFyZ2V0LCBjaGFubmVsIGFzIHN0cmluZywgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdXN0IGxpa2UgbGlzdGVuVG8sIGJ1dCBjYXVzZXMgdGhlIGJvdW5kIGNhbGxiYWNrIHRvIGZpcmUgb25seSBvbmNlIGJlZm9yZSBiZWluZyByZW1vdmVkLlxuICAgICAqIEBqYSDlr77osaHjgqrjg5bjgrjjgqfjgq/jg4jjga7kuIDluqbjgaDjgZHjg4/jg7Pjg4njg6rjg7PjgrDlj6/og73jgarjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXRcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGxpc3RlbmluZyB0YXJnZXQgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI6LO86Kqt5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBsaXN0ZW5Ub09uY2U8VCBleHRlbmRzIFN1YnNjcmliYWJsZSwgRXZlbnQgZXh0ZW5kcyBFdmVudFNjaGVtYTxUPiA9IEV2ZW50U2NoZW1hPFQ+LCBDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQgPSBrZXlvZiBFdmVudD4oXG4gICAgICAgIHRhcmdldDogVCxcbiAgICAgICAgY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSxcbiAgICAgICAgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duXG4gICAgKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHJlZ2lzdGVyKHRoaXNbX2NvbnRleHRdLCB0YXJnZXQsIGNoYW5uZWwgYXMgc3RyaW5nLCBsaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IG1hbmFnZWQgPSB0YXJnZXQub24oY2hhbm5lbCwgKCkgPT4ge1xuICAgICAgICAgICAgdW5yZWdpc3Rlcih0aGlzW19jb250ZXh0XSwgdGFyZ2V0LCBjaGFubmVsIGFzIHN0cmluZywgbGlzdGVuZXIpO1xuICAgICAgICAgICAgbWFuYWdlZC51bnN1YnNjcmliZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRlbGwgYW4gb2JqZWN0IHRvIHN0b3AgbGlzdGVuaW5nIHRvIGV2ZW50cy5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0XG4gICAgICogIC0gYGVuYCBldmVudCBsaXN0ZW5pbmcgdGFyZ2V0IG9iamVjdC5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOizvOiqreWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm44Gu44Oq44K544OK44O844KS6Kej6ZmkXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZCBsaXN0ZW5lcnMgZnJvbSBgdGFyZ2V0YC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5a++6LGhIGB0YXJnZXRgIOOBruODquOCueODiuODvOOCkuOBmeOBueOBpuino+mZpFxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WQjOS4gCBgY2hhbm5lbGAg44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgcHVibGljIHN0b3BMaXN0ZW5pbmc8VCBleHRlbmRzIFN1YnNjcmliYWJsZSwgRXZlbnQgZXh0ZW5kcyBFdmVudFNjaGVtYTxUPiA9IEV2ZW50U2NoZW1hPFQ+LCBDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQgPSBrZXlvZiBFdmVudD4oXG4gICAgICAgIHRhcmdldD86IFQsXG4gICAgICAgIGNoYW5uZWw/OiBDaGFubmVsIHwgQ2hhbm5lbFtdLFxuICAgICAgICBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duXG4gICAgKTogdGhpcyB7XG4gICAgICAgIHVucmVnaXN0ZXIodGhpc1tfY29udGV4dF0sIHRhcmdldCwgY2hhbm5lbCBhcyBzdHJpbmcsIGxpc3RlbmVyKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7IG1peGlucyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudEJyb2tlciB9IGZyb20gJy4vYnJva2VyJztcbmltcG9ydCB7IEV2ZW50UmVjZWl2ZXIgfSBmcm9tICcuL3JlY2VpdmVyJztcblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIHdoaWNoIGhhdmUgSS9GIG9mIHtAbGluayBFdmVudEJyb2tlcn0gYW5kIHtAbGluayBFdmVudFJlY2VpdmVyfS4gPGJyPlxuICogICAgIGBFdmVudHNgIGNsYXNzIG9mIGBCYWNrYm9uZS5qc2AgZXF1aXZhbGVuY2UuXG4gKiBAamEge0BsaW5rIEV2ZW50QnJva2VyfSDjgagge0BsaW5rIEV2ZW50UmVjZWl2ZXJ9IOOBriBJL0Yg44KS44GC44KP44Gb5oyB44Gk44Kv44Op44K5IDxicj5cbiAqICAgICBgQmFja2JvbmUuanNgIOOBriBgRXZlbnRzYCDjgq/jg6njgrnnm7jlvZNcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEV2ZW50U291cmNlIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiAvLyBkZWNsYXJlIGV2ZW50IGludGVyZmFjZVxuICogaW50ZXJmYWNlIFRhcmdldEV2ZW50IHtcbiAqICAgaG9nZTogW251bWJlciwgc3RyaW5nXTsgICAgICAgIC8vIGNhbGxiYWNrIGZ1bmN0aW9uJ3MgYXJncyB0eXBlIHR1cGxlXG4gKiAgIGZvbzogW3ZvaWRdOyAgICAgICAgICAgICAgICAgICAvLyBubyBhcmdzXG4gKiAgIGhvbzogdm9pZDsgICAgICAgICAgICAgICAgICAgICAvLyBubyBhcmdzIChzYW1lIHRoZSB1cG9uKVxuICogICBiYXI6IFtFcnJvcl07ICAgICAgICAgICAgICAgICAgLy8gYW55IGNsYXNzIGlzIGF2YWlsYWJsZS5cbiAqICAgYmF6OiBFcnJvciB8IE51bWJlcjsgICAgICAgICAgIC8vIGlmIG9ubHkgb25lIGFyZ3VtZW50LCBgW11gIGlzIG5vdCByZXF1aXJlZC5cbiAqIH1cbiAqXG4gKiBpbnRlcmZhY2UgU2FtcGxlRXZlbnQge1xuICogICBmdWdhOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqIH1cbiAqXG4gKiAvLyBkZWNsYXJlIGNsaWVudCBjbGFzc1xuICogY2xhc3MgU2FtcGxlU291cmNlIGV4dGVuZHMgRXZlbnRTb3VyY2U8U2FtcGxlRXZlbnQ+IHtcbiAqICAgY29uc3RydWN0b3IodGFyZ2V0OiBFdmVudFNvdXJjZTxUYXJnZXRFdmVudD4pIHtcbiAqICAgICBzdXBlcigpO1xuICogICAgIHRoaXMubGlzdGVuVG8oYnJva2VyLCAnaG9nZScsIChudW06IG51bWJlciwgc3RyOiBzdHJpbmcpID0+IHsgLi4uIH0pO1xuICogICAgIHRoaXMubGlzdGVuVG8oYnJva2VyLCAnYmFyJywgKGU6IEVycm9yKSA9PiB7IC4uLiB9KTtcbiAqICAgICB0aGlzLmxpc3RlblRvKGJyb2tlciwgWydmb28nLCAnaG9vJ10sICgpID0+IHsgLi4uIH0pO1xuICogICB9XG4gKlxuICogICByZWxlYXNlKCk6IHZvaWQge1xuICogICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICogICB9XG4gKiB9XG4gKlxuICogY29uc3Qgc2FtcGxlID0gbmV3IFNhbXBsZVNvdXJjZSgpO1xuICpcbiAqIHNhbXBsZS5vbignZnVnYScsIChhOiBudW1iZXIsIGI6IHN0cmluZykgPT4geyAuLi4gfSk7ICAgIC8vIE9LLiBzdGFuZGFyZCB1c2FnZS5cbiAqIHNhbXBsZS50cmlnZ2VyKCdmdWdhJywgMTAwLCAndGVzdCcpOyAgICAgICAgICAgICAgICAgICAgIC8vIE9LLiBzdGFuZGFyZCB1c2FnZS5cbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBfRXZlbnRTb3VyY2U8VCBleHRlbmRzIG9iamVjdD4gPSBFdmVudEJyb2tlcjxUPiAmIEV2ZW50UmVjZWl2ZXI7XG5cbi8qKiBAaW50ZXJuYWwge0BsaW5rIEV2ZW50U291cmNlfSBjbGFzcyAqL1xuY2xhc3MgRXZlbnRTb3VyY2UgZXh0ZW5kcyBtaXhpbnMoRXZlbnRCcm9rZXIsIEV2ZW50UmVjZWl2ZXIpIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5zdXBlcihFdmVudFJlY2VpdmVyKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnN0cnVjdG9yIG9mIHtAbGluayBFdmVudFNvdXJjZX1cbiAqIEBqYSB7QGxpbmsgRXZlbnRTb3VyY2V9IOOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wun+S9k1xuICovXG5jb25zdCBfRXZlbnRTb3VyY2U6IHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IF9FdmVudFNvdXJjZTxhbnk+O1xuICAgIG5ldyA8VCBleHRlbmRzIG9iamVjdD4oKTogX0V2ZW50U291cmNlPFQ+O1xufSA9IEV2ZW50U291cmNlIGFzIGFueTtcblxuZXhwb3J0IHsgX0V2ZW50U291cmNlIGFzIEV2ZW50U291cmNlIH07XG4iLCJpbXBvcnQgeyBFdmVudEJyb2tlciwgU3Vic2NyaXB0aW9uIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuXG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBfY2FuY2VsID0gU3ltYm9sKCdjYW5jZWwnKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IF9jbG9zZSAgPSBTeW1ib2woJ2Nsb3NlJyk7XG5cbi8qKlxuICogQGVuIENhbmNlbFRva2VuIHN0YXRlIGRlZmluaXRpb25zLlxuICogQGphIENhbmNlbFRva2VuIOOBrueKtuaFi+Wumue+qVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY29uc3QgZW51bSBDYW5jZWxUb2tlblN0YXRlIHtcbiAgICAvKiog44Kt44Oj44Oz44K744Or5Y+X5LuY5Y+v6IO9ICovXG4gICAgT1BFTiAgICAgICAgPSAweDAsXG4gICAgLyoqIOOCreODo+ODs+OCu+ODq+WPl+S7mOa4iOOBvyAqL1xuICAgIFJFUVVFU1RFRCAgID0gMHgxLFxuICAgIC8qKiDjgq3jg6Pjg7Pjgrvjg6vlj5fku5jkuI3lj68gKi9cbiAgICBDTE9TRUQgICAgICA9IDB4Mixcbn1cblxuLyoqXG4gKiBAZW4gQ2FuY2VsIGV2ZW50IGRlZmluaXRpb25zLlxuICogQGphIOOCreODo+ODs+OCu+ODq+OCpOODmeODs+ODiOWumue+qVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgaW50ZXJmYWNlIENhbmNlbEV2ZW50PFQ+IHtcbiAgICBjYW5jZWw6IFtUXTtcbn1cblxuLyoqXG4gKiBAZW4gSW50ZXJuYWwgQ2FuY2VsVG9rZW4gaW50ZXJmYWNlLlxuICogQGphIENhbmNlbFRva2VuIOOBruWGhemDqOOCpOODs+OCv+ODvOODleOCp+OCpOOCueWumue+qVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgaW50ZXJmYWNlIENhbmNlbFRva2VuQ29udGV4dDxUID0gdW5rbm93bj4ge1xuICAgIHJlYWRvbmx5IGJyb2tlcjogRXZlbnRCcm9rZXI8Q2FuY2VsRXZlbnQ8VD4+O1xuICAgIHJlYWRvbmx5IHN1YnNjcmlwdGlvbnM6IFNldDxTdWJzY3JpcHRpb24+O1xuICAgIHJlYXNvbjogVCB8IHVuZGVmaW5lZDtcbiAgICBzdGF0dXM6IENhbmNlbFRva2VuU3RhdGU7XG59XG5cbi8qKlxuICogQGVuIEludmFsaWQgc3Vic2NyaXB0aW9uIG9iamVjdCBkZWNsYXJhdGlvbi5cbiAqIEBqYSDnhKHlirnjgaogU3Vic2NyaXB0aW9uIOOCquODluOCuOOCp+OCr+ODiFxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY29uc3QgaW52YWxpZFN1YnNjcmlwdGlvbiA9IE9iamVjdC5mcmVlemUoe1xuICAgIGVuYWJsZTogZmFsc2UsXG4gICAgdW5zdWJzY3JpYmUoKSB7IC8qIG5vb3AgKi8gfVxufSkgYXMgU3Vic2NyaXB0aW9uO1xuIiwiaW1wb3J0IHsgdmVyaWZ5IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50QnJva2VyLCBTdWJzY3JpcHRpb24gfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQge1xuICAgIF9jYW5jZWwsXG4gICAgX2Nsb3NlLFxuICAgIENhbmNlbFRva2VuU3RhdGUsXG4gICAgQ2FuY2VsVG9rZW5Db250ZXh0LFxuICAgIGludmFsaWRTdWJzY3JpcHRpb24sXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKipcbiAqIEBlbiBDYW5jZWxsYXRpb24gc291cmNlIGludGVyZmFjZS5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vnrqHnkIbjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5jZWxUb2tlblNvdXJjZTxUID0gdW5rbm93bj4ge1xuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgQ2FuY2VsVG9rZW59IGdldHRlci5cbiAgICAgKiBAamEge0BsaW5rIENhbmNlbFRva2VufSDlj5blvpdcbiAgICAgKi9cbiAgICByZWFkb25seSB0b2tlbjogQ2FuY2VsVG9rZW48VD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBjYW5jZWwuXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+Wun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIHJlYXNvblxuICAgICAqICAtIGBlbmAgY2FuY2VsbGF0aW9uIHJlYXNvbi4gdGhpcyBhcmcgaXMgdHJhbnNtaXR0ZWQgaW4gcHJvbWlzZSBjaGFpbi5cbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODq+OBrueQhueUseOCkuaMh+Wumi4gYFByb21pc2VgIOODgeOCp+OCpOODs+OBq+S8nemBlOOBleOCjOOCiy5cbiAgICAgKi9cbiAgICBjYW5jZWwocmVhc29uOiBUKTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBCcmVhayB1cCBjYW5jZWxsYXRpb24gcmVjZXB0aW9uLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vlj5fku5jjgpLntYLkuoZcbiAgICAgKi9cbiAgICBjbG9zZSgpOiB2b2lkO1xufVxuXG4vKiogQGludGVybmFsICovIGNvbnN0IF90b2tlbnMgPSBuZXcgV2Vha01hcDxDYW5jZWxUb2tlbiwgQ2FuY2VsVG9rZW5Db250ZXh0PigpO1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBnZXRDb250ZXh0PFQgPSB1bmtub3duPihpbnN0YW5jZTogQ2FuY2VsVG9rZW48VD4pOiBDYW5jZWxUb2tlbkNvbnRleHQ8VD4ge1xuICAgIGlmICghX3Rva2Vucy5oYXMoaW5zdGFuY2UpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBvYmplY3QgaXMgbm90IGEgdmFsaWQgQ2FuY2VsVG9rZW4uJyk7XG4gICAgfVxuICAgIHJldHVybiBfdG9rZW5zLmdldChpbnN0YW5jZSkgYXMgQ2FuY2VsVG9rZW5Db250ZXh0PFQ+O1xufVxuXG4vKipcbiAqIEBlbiBUaGUgdG9rZW4gb2JqZWN0IHRvIHdoaWNoIHVuaWZpY2F0aW9uIHByb2Nlc3NpbmcgZm9yIGFzeW5jaHJvbm91cyBwcm9jZXNzaW5nIGNhbmNlbGxhdGlvbiBpcyBvZmZlcmVkLiA8YnI+XG4gKiAgICAgT3JpZ2luIGlzIGBDYW5jZWxsYXRpb25Ub2tlbmAgb2YgYC5ORVQgRnJhbWV3b3JrYC5cbiAqIEBqYSDpnZ7lkIzmnJ/lh6bnkIbjgq3jg6Pjg7Pjgrvjg6vjga7jgZ/jgoHjga7ntbHkuIDlh6bnkIbjgpLmj5DkvpvjgZnjgovjg4jjg7zjgq/jg7Pjgqrjg5bjgrjjgqfjgq/jg4ggPGJyPlxuICogICAgIOOCquODquOCuOODiuODq+OBryBgLk5FVCBGcmFtZXdvcmtgIOOBriBgQ2FuY2VsbGF0aW9uVG9rZW5gXG4gKlxuICogQHNlZSBodHRwczovL2RvY3MubWljcm9zb2Z0LmNvbS9lbi11cy9kb3RuZXQvc3RhbmRhcmQvdGhyZWFkaW5nL2NhbmNlbGxhdGlvbi1pbi1tYW5hZ2VkLXRocmVhZHNcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqIGBgYFxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgdG9rZW4gPSBuZXcgQ2FuY2VsVG9rZW4oKGNhbmNlbCwgY2xvc2UpID0+IHtcbiAqICAgYnV0dG9uMS5vbmNsaWNrID0gZXYgPT4gY2FuY2VsKG5ldyBFcnJvcignQ2FuY2VsJykpO1xuICogICBidXR0b24yLm9uY2xpY2sgPSBldiA9PiBjbG9zZSgpO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBvclxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB7IGNhbmNlbCwgY2xvc2UsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTtcbiAqIGJ1dHRvbjEub25jbGljayA9IGV2ID0+IGNhbmNlbChuZXcgRXJyb3IoJ0NhbmNlbCcpKTtcbiAqIGJ1dHRvbjIub25jbGljayA9IGV2ID0+IGNsb3NlKCk7XG4gKiBgYGBcbiAqXG4gKiAtIFVzZSB3aXRoIFByb21pc2VcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgeyBjYW5jZWwsIGNsb3NlLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7XG4gKiBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKG9rLCBuZykgPT4geyAuLi4gfSwgdG9rZW4pO1xuICogcHJvbWlzZVxuICogICAudGhlbiguLi4pXG4gKiAgIC50aGVuKC4uLilcbiAqICAgLnRoZW4oLi4uKVxuICogICAuY2F0Y2gocmVhc29uID0+IHtcbiAqICAgICAvLyBjaGVjayByZWFzb25cbiAqICAgfSk7XG4gKiBgYGBcbiAqXG4gKiAtIFJlZ2lzdGVyICYgVW5yZWdpc3RlciBjYWxsYmFjayhzKVxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB7IGNhbmNlbCwgY2xvc2UsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTtcbiAqIGNvbnN0IHN1YnNjcmlwdGlvbiA9IHRva2VuLnJlZ2lzdGVyKHJlYXNvbiA9PiB7XG4gKiAgIGNvbnNvbGUubG9nKHJlYXNvbi5tZXNzYWdlKTtcbiAqIH0pO1xuICogaWYgKHNvbWVDYXNlKSB7XG4gKiAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBDYW5jZWxUb2tlbjxUID0gdW5rbm93bj4ge1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSB7QGxpbmsgQ2FuY2VsVG9rZW5Tb3VyY2V9IGluc3RhbmNlLlxuICAgICAqIEBqYSB7QGxpbmsgQ2FuY2VsVG9rZW5Tb3VyY2V9IOOCpOODs+OCueOCv+ODs+OCueOBruWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIGxpbmtlZFRva2Vuc1xuICAgICAqICAtIGBlbmAgcmVsYXRpbmcgYWxyZWFkeSBtYWRlIHtAbGluayBDYW5jZWxUb2tlbn0gaW5zdGFuY2UuXG4gICAgICogICAgICAgIFlvdSBjYW4gYXR0YWNoIHRvIHRoZSB0b2tlbiB0aGF0IHRvIGJlIGEgY2FuY2VsbGF0aW9uIHRhcmdldC5cbiAgICAgKiAgLSBgamFgIOOBmeOBp+OBq+S9nOaIkOOBleOCjOOBnyB7QGxpbmsgQ2FuY2VsVG9rZW59IOmWoumAo+S7mOOBkeOCi+WgtOWQiOOBq+aMh+WumlxuICAgICAqICAgICAgICDmuKHjgZXjgozjgZ8gdG9rZW4g44Gv44Kt44Oj44Oz44K744Or5a++6LGh44Go44GX44Gm57SQ44Gl44GR44KJ44KM44KLXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBzb3VyY2U8VCA9IHVua25vd24+KC4uLmxpbmtlZFRva2VuczogQ2FuY2VsVG9rZW5bXSk6IENhbmNlbFRva2VuU291cmNlPFQ+IHtcbiAgICAgICAgbGV0IGNhbmNlbCE6IChyZWFzb246IFQpID0+IHZvaWQ7XG4gICAgICAgIGxldCBjbG9zZSE6ICgpID0+IHZvaWQ7XG4gICAgICAgIGNvbnN0IHRva2VuID0gbmV3IENhbmNlbFRva2VuPFQ+KChvbkNhbmNlbCwgb25DbG9zZSkgPT4ge1xuICAgICAgICAgICAgY2FuY2VsID0gb25DYW5jZWw7XG4gICAgICAgICAgICBjbG9zZSA9IG9uQ2xvc2U7XG4gICAgICAgIH0sIC4uLmxpbmtlZFRva2Vucyk7XG4gICAgICAgIHJldHVybiBPYmplY3QuZnJlZXplKHsgdG9rZW4sIGNhbmNlbCwgY2xvc2UgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBleGVjdXRvclxuICAgICAqICAtIGBlbmAgZXhlY3V0ZXIgdGhhdCBoYXMgYGNhbmNlbGAgYW5kIGBjbG9zZWAgY2FsbGJhY2suXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6sv44Kv44Ot44O844K6IOWun+ihjOOCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBsaW5rZWRUb2tlbnNcbiAgICAgKiAgLSBgZW5gIHJlbGF0aW5nIGFscmVhZHkgbWFkZSB7QGxpbmsgQ2FuY2VsVG9rZW59IGluc3RhbmNlLlxuICAgICAqICAgICAgICBZb3UgY2FuIGF0dGFjaCB0byB0aGUgdG9rZW4gdGhhdCB0byBiZSBhIGNhbmNlbGxhdGlvbiB0YXJnZXQuXG4gICAgICogIC0gYGphYCDjgZnjgafjgavkvZzmiJDjgZXjgozjgZ8ge0BsaW5rIENhbmNlbFRva2VufSDplqLpgKPku5jjgZHjgovloLTlkIjjgavmjIflrppcbiAgICAgKiAgICAgICAg5rih44GV44KM44GfIHRva2VuIOOBr+OCreODo+ODs+OCu+ODq+WvvuixoeOBqOOBl+OBpue0kOOBpeOBkeOCieOCjOOCi1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBleGVjdXRvcjogKGNhbmNlbDogKHJlYXNvbjogVCkgPT4gdm9pZCwgY2xvc2U6ICgpID0+IHZvaWQpID0+IHZvaWQsXG4gICAgICAgIC4uLmxpbmtlZFRva2VuczogQ2FuY2VsVG9rZW5bXVxuICAgICkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBDYW5jZWxUb2tlbiwgdGhpcyk7XG4gICAgICAgIHZlcmlmeSgndHlwZU9mJywgJ2Z1bmN0aW9uJywgZXhlY3V0b3IpO1xuXG4gICAgICAgIGNvbnN0IGxpbmtlZFRva2VuU2V0ID0gbmV3IFNldChsaW5rZWRUb2tlbnMuZmlsdGVyKHQgPT4gX3Rva2Vucy5oYXModCkpKTtcbiAgICAgICAgbGV0IHN0YXR1cyA9IENhbmNlbFRva2VuU3RhdGUuT1BFTjtcbiAgICAgICAgZm9yIChjb25zdCB0IG9mIGxpbmtlZFRva2VuU2V0KSB7XG4gICAgICAgICAgICBzdGF0dXMgfD0gZ2V0Q29udGV4dCh0KS5zdGF0dXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb250ZXh0OiBDYW5jZWxUb2tlbkNvbnRleHQ8VD4gPSB7XG4gICAgICAgICAgICBicm9rZXI6IG5ldyBFdmVudEJyb2tlcigpLFxuICAgICAgICAgICAgc3Vic2NyaXB0aW9uczogbmV3IFNldCgpLFxuICAgICAgICAgICAgcmVhc29uOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBzdGF0dXMsXG4gICAgICAgIH07XG4gICAgICAgIF90b2tlbnMuc2V0KHRoaXMsIE9iamVjdC5zZWFsKGNvbnRleHQpKTtcblxuICAgICAgICBjb25zdCBjYW5jZWwgPSB0aGlzW19jYW5jZWxdO1xuICAgICAgICBjb25zdCBjbG9zZSA9IHRoaXNbX2Nsb3NlXTtcbiAgICAgICAgaWYgKHN0YXR1cyA9PT0gQ2FuY2VsVG9rZW5TdGF0ZS5PUEVOKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHQgb2YgbGlua2VkVG9rZW5TZXQpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0LnN1YnNjcmlwdGlvbnMuYWRkKHQucmVnaXN0ZXIoY2FuY2VsLmJpbmQodGhpcykpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZ2lzdGVyKGNhbmNlbC5iaW5kKHQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4ZWN1dG9yKGNhbmNlbC5iaW5kKHRoaXMpLCBjbG9zZS5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FuY2VsbGF0aW9uIHJlYXNvbiBhY2Nlc3Nvci5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or44Gu5Y6f5Zug5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHJlYXNvbigpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIGdldENvbnRleHQodGhpcykucmVhc29uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFbmFibGUgY2FuY2VsbGF0aW9uIHN0YXRlIGFjY2Vzc29yLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vlj6/og73jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgY2FuY2VsYWJsZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIGdldENvbnRleHQodGhpcykuc3RhdHVzID09PSBDYW5jZWxUb2tlblN0YXRlLk9QRU47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbmNlbGxhdGlvbiByZXF1ZXN0ZWQgc3RhdGUgYWNjZXNzb3IuXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+OCkuWPl+OBkeS7mOOBkeOBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCByZXF1ZXN0ZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIShnZXRDb250ZXh0KHRoaXMpLnN0YXR1cyAmIENhbmNlbFRva2VuU3RhdGUuUkVRVUVTVEVEKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FuY2VsbGF0aW9uIGNsb3NlZCBzdGF0ZSBhY2Nlc3Nvci5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5Y+X5LuY44KS57WC5LqG44GX44Gm44GE44KL44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGNsb3NlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhKGdldENvbnRleHQodGhpcykuc3RhdHVzICYgQ2FuY2VsVG9rZW5TdGF0ZS5DTE9TRUQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBgdG9TdHJpbmdgIHRhZyBvdmVycmlkZS5cbiAgICAgKiBAamEgYHRvU3RyaW5nYCDjgr/jgrDjga7jgqrjg7zjg5Djg7zjg6njgqTjg4lcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6ICdDYW5jZWxUb2tlbicgeyByZXR1cm4gJ0NhbmNlbFRva2VuJzsgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIGN1c3RvbSBjYW5jZWxsYXRpb24gY2FsbGJhY2suXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+aZguOBruOCq+OCueOCv+ODoOWHpueQhuOBrueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIG9uQ2FuY2VsXG4gICAgICogIC0gYGVuYCBjYW5jZWwgb3BlcmF0aW9uIGNhbGxiYWNrXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6vjgrPjg7zjg6vjg5Djg4Pjgq9cbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYFN1YnNjcmlwdGlvbmAgaW5zdGFuY2UuXG4gICAgICogICAgICAgIFlvdSBjYW4gcmV2b2tlIGNhbmNlbGxhdGlvbiB0byBjYWxsIGB1bnN1YnNjcmliZWAgbWV0aG9kLlxuICAgICAqICAtIGBqYWAgYFN1YnNjcmlwdGlvbmAg44Kk44Oz44K544K/44Oz44K5XG4gICAgICogICAgICAgIGB1bnN1YnNjcmliZWAg44Oh44K944OD44OJ44KS5ZG844G244GT44Go44Gn44Kt44Oj44Oz44K744Or44KS54Sh5Yq544Gr44GZ44KL44GT44Go44GM5Y+v6IO9XG4gICAgICovXG4gICAgcHVibGljIHJlZ2lzdGVyKG9uQ2FuY2VsOiAocmVhc29uOiBUKSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGdldENvbnRleHQodGhpcyk7XG4gICAgICAgIGlmICghdGhpcy5jYW5jZWxhYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4gaW52YWxpZFN1YnNjcmlwdGlvbjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29udGV4dC5icm9rZXIub24oJ2NhbmNlbCcsIG9uQ2FuY2VsKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX2NhbmNlbF0ocmVhc29uOiBUKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBnZXRDb250ZXh0KHRoaXMpO1xuICAgICAgICB2ZXJpZnkoJ25vdE51bGxpc2gnLCByZWFzb24pO1xuICAgICAgICBpZiAoIXRoaXMuY2FuY2VsYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQucmVhc29uID0gcmVhc29uO1xuICAgICAgICBjb250ZXh0LnN0YXR1cyB8PSBDYW5jZWxUb2tlblN0YXRlLlJFUVVFU1RFRDtcbiAgICAgICAgZm9yIChjb25zdCBzIG9mIGNvbnRleHQuc3Vic2NyaXB0aW9ucykge1xuICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQuYnJva2VyLnRyaWdnZXIoJ2NhbmNlbCcsIHJlYXNvbik7XG4gICAgICAgIHZvaWQgUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB0aGlzW19jbG9zZV0oKSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19jbG9zZV0oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBnZXRDb250ZXh0KHRoaXMpO1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0LnN0YXR1cyB8PSBDYW5jZWxUb2tlblN0YXRlLkNMT1NFRDtcbiAgICAgICAgZm9yIChjb25zdCBzIG9mIGNvbnRleHQuc3Vic2NyaXB0aW9ucykge1xuICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQuc3Vic2NyaXB0aW9ucy5jbGVhcigpO1xuICAgICAgICBjb250ZXh0LmJyb2tlci5vZmYoKTtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIG5vLWdsb2JhbC1hc3NpZ24sXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kLFxuICovXG5cbmltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICB2ZXJpZnksXG4gICAgZ2V0Q29uZmlnLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgQ2FuY2VsVG9rZW4gfSBmcm9tICcuL2NhbmNlbC10b2tlbic7XG5cbmRlY2xhcmUgZ2xvYmFsIHtcblxuICAgIGludGVyZmFjZSBQcm9taXNlQ29uc3RydWN0b3Ige1xuICAgICAgICBuZXcgPFQ+KGV4ZWN1dG9yOiAocmVzb2x2ZTogKHZhbHVlPzogVCB8IFByb21pc2VMaWtlPFQ+KSA9PiB2b2lkLCByZWplY3Q6IChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkKSA9PiB2b2lkLCBjYW5jZWxUb2tlbj86IENhbmNlbFRva2VuIHwgbnVsbCk6IFByb21pc2U8VD47XG4gICAgICAgIHJlc29sdmU8VD4odmFsdWU/OiBUIHwgUHJvbWlzZUxpa2U8VD4sIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsKTogUHJvbWlzZTxUPjtcbiAgICB9XG5cbn1cblxuLyoqXG4gKiBAZW4gYE5hdGl2ZSBQcm9taXNlYCBjb25zdHJ1Y3RvciA8YnI+XG4gKiAgICAgQ2FuIGJlIHVzZWQgYXMgYW4gYWxpYXMgZm9yIGBOYXRpdmUgUHJvbWlzZWAuXG4gKiBAamEgYE5hdGl2ZSBQcm9taXNlYCDjgrPjg7Pjgrnjg4jjg6njgq/jgr8gPGJyPlxuICogICAgIGBOYXRpdmUgUHJvbWlzZWAg44Gu44Ko44Kk44Oq44Ki44K544Go44GX44Gm5L2/55So5Y+v6IO9XG4gKi9cbmNvbnN0IE5hdGl2ZVByb21pc2UgPSBQcm9taXNlO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IG5hdGl2ZVRoZW4gPSBOYXRpdmVQcm9taXNlLnByb3RvdHlwZS50aGVuO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY3JlYXRlID0gU3ltYm9sKCdjcmVhdGUnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Rva2VucyA9IG5ldyBXZWFrTWFwPFByb21pc2U8dW5rbm93bj4sIENhbmNlbFRva2VuPigpO1xuXG4vKipcbiAqIEBlbiBFeHRlbmRlZCBgUHJvbWlzZWAgY2xhc3Mgd2hpY2ggZW5hYmxlZCBjYW5jZWxsYXRpb24uIDxicj5cbiAqICAgICBgTmF0aXZlIFByb21pc2VgIGNvbnN0cnVjdG9yIGlzIG92ZXJyaWRkZW4gYnkgZnJhbWV3b3JrIGRlZmF1bHQgYmVoYXZpb3VyLlxuICogQGphIOOCreODo+ODs+OCu+ODq+OCkuWPr+iDveOBq+OBl+OBnyBgUHJvbWlzZWAg5ouh5by144Kv44Op44K5IDxicj5cbiAqICAgICDml6LlrprjgacgYE5hdGl2ZSBQcm9taXNlYCDjgpLjgqrjg7zjg5Djg7zjg6njgqTjg4njgZnjgosuXG4gKi9cbmNsYXNzIENhbmNlbGFibGVQcm9taXNlPFQ+IGV4dGVuZHMgUHJvbWlzZTxUPiB7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gT3ZlcnJpZGluZyBvZiB0aGUgZGVmYXVsdCBjb25zdHJ1Y3RvciB1c2VkIGZvciBnZW5lcmF0aW9uIG9mIGFuIG9iamVjdC5cbiAgICAgKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu55Sf5oiQ44Gr5L2/44KP44KM44KL44OH44OV44Kp44Or44OI44Kz44Oz44K544OI44Op44Kv44K/44Gu44Kq44O844OQ44O844Op44Kk44OJXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0IFtTeW1ib2wuc3BlY2llc10oKTogUHJvbWlzZUNvbnN0cnVjdG9yIHsgcmV0dXJuIE5hdGl2ZVByb21pc2U7IH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGVzIGEgbmV3IHJlc29sdmVkIHByb21pc2UgZm9yIHRoZSBwcm92aWRlZCB2YWx1ZS5cbiAgICAgKiBAamEg5paw6KaP44Gr6Kej5rG65riI44G/IHByb21pc2Ug44Kk44Oz44K544K/44Oz44K544KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgdGhlIHZhbHVlIHRyYW5zbWl0dGVkIGluIHByb21pc2UgY2hhaW4uXG4gICAgICogIC0gYGphYCBgUHJvbWlzZWAg44Gr5Lyd6YGU44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGNhbmNlbFRva2VuXG4gICAgICogIC0gYGVuYCB7QGxpbmsgQ2FuY2VsVG9rZW59IGluc3RhbmNlIGNyZWF0ZSBmcm9tIHtAbGluayBDYW5jZWxUb2tlbi5zb3VyY2UgfCBDYW5jZWxUb2tlbi5zb3VyY2V9KCkuXG4gICAgICogIC0gYGphYCB7QGxpbmsgQ2FuY2VsVG9rZW4uc291cmNlIHwgQ2FuY2VsVG9rZW4uc291cmNlfSgpIOOCiOOCiuS9nOaIkOOBl+OBnyB7QGxpbmsgQ2FuY2VsVG9rZW59IOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICAgICAqL1xuICAgIHN0YXRpYyByZXNvbHZlPFQ+KHZhbHVlPzogVCB8IFByb21pc2VMaWtlPFQ+LCBjYW5jZWxUb2tlbj86IENhbmNlbFRva2VuIHwgbnVsbCk6IENhbmNlbGFibGVQcm9taXNlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZV0oc3VwZXIucmVzb2x2ZSh2YWx1ZSksIGNhbmNlbFRva2VuKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHByaXZhdGUgY29uc3RydWN0aW9uICovXG4gICAgcHJpdmF0ZSBzdGF0aWMgW19jcmVhdGVdPFQsIFRSZXN1bHQxID0gVCwgVFJlc3VsdDIgPSBuZXZlcj4oXG4gICAgICAgIHNyYzogUHJvbWlzZTxUPixcbiAgICAgICAgdG9rZW4/OiBDYW5jZWxUb2tlbiB8IG51bGwsXG4gICAgICAgIHRoZW5BcmdzPzogW1xuICAgICAgICAgICAgKCh2YWx1ZTogVCkgPT4gVFJlc3VsdDEgfCBQcm9taXNlTGlrZTxUUmVzdWx0MT4pIHwgbnVsbCB8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICgocmVhc29uOiB1bmtub3duKSA9PiBUUmVzdWx0MiB8IFByb21pc2VMaWtlPFRSZXN1bHQyPikgfCBudWxsIHwgdW5kZWZpbmVkXG4gICAgICAgIF0gfCBudWxsXG4gICAgKTogQ2FuY2VsYWJsZVByb21pc2U8VFJlc3VsdDEgfCBUUmVzdWx0Mj4ge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBOYXRpdmVQcm9taXNlLCBzcmMpO1xuXG4gICAgICAgIGxldCBwOiBQcm9taXNlPFQgfCBUUmVzdWx0MSB8IFRSZXN1bHQyPjtcbiAgICAgICAgaWYgKCEodG9rZW4gaW5zdGFuY2VvZiBDYW5jZWxUb2tlbikpIHtcbiAgICAgICAgICAgIHAgPSBzcmM7XG4gICAgICAgIH0gZWxzZSBpZiAodGhlbkFyZ3MgJiYgKCFpc0Z1bmN0aW9uKHRoZW5BcmdzWzBdKSB8fCBpc0Z1bmN0aW9uKHRoZW5BcmdzWzFdKSkpIHtcbiAgICAgICAgICAgIHAgPSBzcmM7XG4gICAgICAgIH0gZWxzZSBpZiAodG9rZW4uY2FuY2VsYWJsZSkge1xuICAgICAgICAgICAgbGV0IHM6IFN1YnNjcmlwdGlvbjtcbiAgICAgICAgICAgIHAgPSBuZXcgTmF0aXZlUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgcyA9IHRva2VuLnJlZ2lzdGVyKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgbmF0aXZlVGhlbi5jYWxsKHNyYywgcmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3QgZGlzcG9zZSA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgX3Rva2Vucy5kZWxldGUocCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcC50aGVuKGRpc3Bvc2UsIGRpc3Bvc2UpO1xuICAgICAgICB9IGVsc2UgaWYgKHRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgcCA9IHN1cGVyLnJlamVjdCh0b2tlbi5yZWFzb24pO1xuICAgICAgICB9IGVsc2UgaWYgKHRva2VuLmNsb3NlZCkge1xuICAgICAgICAgICAgcCA9IHNyYztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5leHBlY3RlZCBFeGNlcHRpb24nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGVuQXJncykge1xuICAgICAgICAgICAgcCA9IG5hdGl2ZVRoZW4uYXBwbHkocCwgdGhlbkFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0b2tlbiAmJiB0b2tlbi5jYW5jZWxhYmxlKSB7XG4gICAgICAgICAgICBfdG9rZW5zLnNldChwLCB0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBwIGluc3RhbmNlb2YgdGhpcyB8fCBPYmplY3Quc2V0UHJvdG90eXBlT2YocCwgdGhpcy5wcm90b3R5cGUpO1xuXG4gICAgICAgIHJldHVybiBwIGFzIENhbmNlbGFibGVQcm9taXNlPFRSZXN1bHQxIHwgVFJlc3VsdDI+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZXhlY3V0b3JcbiAgICAgKiAgLSBgZW5gIEEgY2FsbGJhY2sgdXNlZCB0byBpbml0aWFsaXplIHRoZSBwcm9taXNlLiBUaGlzIGNhbGxiYWNrIGlzIHBhc3NlZCB0d28gYXJndW1lbnRzIGByZXNvbHZlYCBhbmQgYHJlamVjdGAuXG4gICAgICogIC0gYGphYCBwcm9taXNlIOOBruWIneacn+WMluOBq+S9v+eUqOOBmeOCi+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+Wumi4gYHJlc29sdmVgIOOBqCBgcmVqZWN0YCDjga4y44Gk44Gu5byV5pWw44KS5oyB44GkXG4gICAgICogQHBhcmFtIGNhbmNlbFRva2VuXG4gICAgICogIC0gYGVuYCB7QGxpbmsgQ2FuY2VsVG9rZW59IGluc3RhbmNlIGNyZWF0ZSBmcm9tIHtAbGluayBDYW5jZWxUb2tlbi5zb3VyY2UgfCBDYW5jZWxUb2tlbi5zb3VyY2V9KCkuXG4gICAgICogIC0gYGphYCB7QGxpbmsgQ2FuY2VsVG9rZW4uc291cmNlIHwgQ2FuY2VsVG9rZW4uc291cmNlfSgpIOOCiOOCiuS9nOaIkOOBl+OBnyB7QGxpbmsgQ2FuY2VsVG9rZW59IOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBleGVjdXRvcjogKHJlc29sdmU6ICh2YWx1ZT86IFQgfCBQcm9taXNlTGlrZTxUPikgPT4gdm9pZCwgcmVqZWN0OiAocmVhc29uPzogdW5rbm93bikgPT4gdm9pZCkgPT4gdm9pZCxcbiAgICAgICAgY2FuY2VsVG9rZW4/OiBDYW5jZWxUb2tlbiB8IG51bGxcbiAgICApIHtcbiAgICAgICAgc3VwZXIoZXhlY3V0b3IpO1xuICAgICAgICByZXR1cm4gQ2FuY2VsYWJsZVByb21pc2VbX2NyZWF0ZV0odGhpcywgY2FuY2VsVG9rZW4pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGNhbGxiYWNrcyBmb3IgdGhlIHJlc29sdXRpb24gYW5kL29yIHJlamVjdGlvbiBvZiB0aGUgUHJvbWlzZS5cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIG9uZnVsZmlsbGVkIFRoZSBjYWxsYmFjayB0byBleGVjdXRlIHdoZW4gdGhlIFByb21pc2UgaXMgcmVzb2x2ZWQuXG4gICAgICogQHBhcmFtIG9ucmVqZWN0ZWQgVGhlIGNhbGxiYWNrIHRvIGV4ZWN1dGUgd2hlbiB0aGUgUHJvbWlzZSBpcyByZWplY3RlZC5cbiAgICAgKiBAcmV0dXJucyBBIFByb21pc2UgZm9yIHRoZSBjb21wbGV0aW9uIG9mIHdoaWNoIGV2ZXIgY2FsbGJhY2sgaXMgZXhlY3V0ZWQuXG4gICAgICovXG4gICAgdGhlbjxUUmVzdWx0MSA9IFQsIFRSZXN1bHQyID0gbmV2ZXI+KFxuICAgICAgICBvbmZ1bGZpbGxlZD86ICgodmFsdWU6IFQpID0+IFRSZXN1bHQxIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDE+KSB8IG51bGwsXG4gICAgICAgIG9ucmVqZWN0ZWQ/OiAoKHJlYXNvbjogdW5rbm93bikgPT4gVFJlc3VsdDIgfCBQcm9taXNlTGlrZTxUUmVzdWx0Mj4pIHwgbnVsbFxuICAgICk6IFByb21pc2U8VFJlc3VsdDEgfCBUUmVzdWx0Mj4ge1xuICAgICAgICByZXR1cm4gQ2FuY2VsYWJsZVByb21pc2VbX2NyZWF0ZV0odGhpcywgX3Rva2Vucy5nZXQodGhpcyksIFtvbmZ1bGZpbGxlZCwgb25yZWplY3RlZF0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGEgY2FsbGJhY2sgZm9yIG9ubHkgdGhlIHJlamVjdGlvbiBvZiB0aGUgUHJvbWlzZS5cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIG9ucmVqZWN0ZWQgVGhlIGNhbGxiYWNrIHRvIGV4ZWN1dGUgd2hlbiB0aGUgUHJvbWlzZSBpcyByZWplY3RlZC5cbiAgICAgKiBAcmV0dXJucyBBIFByb21pc2UgZm9yIHRoZSBjb21wbGV0aW9uIG9mIHRoZSBjYWxsYmFjay5cbiAgICAgKi9cbiAgICBjYXRjaDxUUmVzdWx0MiA9IG5ldmVyPihvbnJlamVjdGVkPzogKChyZWFzb246IHVua25vd24pID0+IFRSZXN1bHQyIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDI+KSB8IG51bGwpOiBQcm9taXNlPFQgfCBUUmVzdWx0Mj4ge1xuICAgICAgICByZXR1cm4gdGhpcy50aGVuKHVuZGVmaW5lZCwgb25yZWplY3RlZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXR0YWNoZXMgYSBjYWxsYmFjayB0aGF0IGlzIGludm9rZWQgd2hlbiB0aGUgUHJvbWlzZSBpcyBzZXR0bGVkIChmdWxmaWxsZWQgb3IgcmVqZWN0ZWQpLiA8YnI+XG4gICAgICogVGhlIHJlc29sdmVkIHZhbHVlIGNhbm5vdCBiZSBtb2RpZmllZCBmcm9tIHRoZSBjYWxsYmFjay5cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIG9uZmluYWxseSBUaGUgY2FsbGJhY2sgdG8gZXhlY3V0ZSB3aGVuIHRoZSBQcm9taXNlIGlzIHNldHRsZWQgKGZ1bGZpbGxlZCBvciByZWplY3RlZCkuXG4gICAgICogQHJldHVybnMgQSBQcm9taXNlIGZvciB0aGUgY29tcGxldGlvbiBvZiB0aGUgY2FsbGJhY2suXG4gICAgICovXG4gICAgZmluYWxseShvbmZpbmFsbHk/OiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQgfCBudWxsKTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiBDYW5jZWxhYmxlUHJvbWlzZVtfY3JlYXRlXShzdXBlci5maW5hbGx5KG9uZmluYWxseSksIF90b2tlbnMuZ2V0KHRoaXMpKTtcbiAgICB9XG5cbn1cblxuLyoqXG4gKiBAZW4gU3dpdGNoIHRoZSBnbG9iYWwgYFByb21pc2VgIGNvbnN0cnVjdG9yIGBOYXRpdmUgUHJvbWlzZWAgb3Ige0BsaW5rIENhbmNlbGFibGVQcm9taXNlfS4gPGJyPlxuICogICAgIGBOYXRpdmUgUHJvbWlzZWAgY29uc3RydWN0b3IgaXMgb3ZlcnJpZGRlbiBieSBmcmFtZXdvcmsgZGVmYXVsdCBiZWhhdmlvdXIuXG4gKiBAamEg44Kw44Ot44O844OQ44OrIGBQcm9taXNlYCDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jgpIgYE5hdGl2ZSBQcm9taXNlYCDjgb7jgZ/jga8ge0BsaW5rIENhbmNlbGFibGVQcm9taXNlfSDjgavliIfjgormm7/jgYggPGJyPlxuICogICAgIOaXouWumuOBpyBgTmF0aXZlIFByb21pc2VgIOOCkuOCquODvOODkOODvOODqeOCpOODieOBmeOCiy5cbiAqXG4gKiBAcGFyYW0gZW5hYmxlXG4gKiAgLSBgZW5gIGB0cnVlYDogdXNlIHtAbGluayBDYW5jZWxhYmxlUHJvbWlzZX0gLyAgYGZhbHNlYDogdXNlIGBOYXRpdmUgUHJvbWlzZWBcbiAqICAtIGBqYWAgYHRydWVgOiB7QGxpbmsgQ2FuY2VsYWJsZVByb21pc2V9IOOCkuS9v+eUqCAvIGBmYWxzZWA6IGBOYXRpdmUgUHJvbWlzZWAg44KS5L2/55SoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRlbmRQcm9taXNlKGVuYWJsZTogYm9vbGVhbik6IFByb21pc2VDb25zdHJ1Y3RvciB7XG4gICAgaWYgKGVuYWJsZSkge1xuICAgICAgICBQcm9taXNlID0gQ2FuY2VsYWJsZVByb21pc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgUHJvbWlzZSA9IE5hdGl2ZVByb21pc2U7XG4gICAgfVxuICAgIHJldHVybiBQcm9taXNlO1xufVxuXG4vKiogQGludGVybmFsIGdsb2JhbCBjb25maWcgb3B0aW9ucyAqL1xuaW50ZXJmYWNlIEdsb2JhbENvbmZpZyB7XG4gICAgbm9BdXRvbWF0aWNOYXRpdmVFeHRlbmQ6IGJvb2xlYW47XG59XG5cbi8vIGRlZmF1bHQ6IGF1dG9tYXRpYyBuYXRpdmUgcHJvbWlzZSBvdmVycmlkZS5cbmV4dGVuZFByb21pc2UoIWdldENvbmZpZzxHbG9iYWxDb25maWc+KCkubm9BdXRvbWF0aWNOYXRpdmVFeHRlbmQpO1xuXG5leHBvcnQge1xuICAgIE5hdGl2ZVByb21pc2UsXG4gICAgQ2FuY2VsYWJsZVByb21pc2UsXG4gICAgQ2FuY2VsYWJsZVByb21pc2UgYXMgUHJvbWlzZSxcbn07XG4iLCJpbXBvcnQgeyBDYW5jZWxUb2tlbiB9IGZyb20gJy4vY2FuY2VsLXRva2VuJztcblxuLyoqXG4gKiBAZW4gQ2FuY2VsYWJsZSBiYXNlIG9wdGlvbiBkZWZpbml0aW9uLlxuICogQGphIOOCreODo+ODs+OCu+ODq+WPr+iDveOBquWfuuW6leOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIENhbmNlbGFibGUge1xuICAgIGNhbmNlbD86IENhbmNlbFRva2VuO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gV2FpdCBmb3IgcHJvbWlzZXMgZG9uZS4gPGJyPlxuICogICAgIFdoaWxlIGNvbnRyb2wgd2lsbCBiZSByZXR1cm5lZCBpbW1lZGlhdGVseSB3aGVuIGBQcm9taXNlLmFsbCgpYCBmYWlscywgYnV0IHRoaXMgbWVodG9kIHdhaXRzIGZvciBpbmNsdWRpbmcgZmFpbHVyZS5cbiAqIEBqYSBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OI44Gu57WC5LqG44G+44Gn5b6F5qmfIDxicj5cbiAqICAgICBgUHJvbWlzZS5hbGwoKWAg44Gv5aSx5pWX44GZ44KL44Go44GZ44GQ44Gr5Yi25b6h44KS6L+U44GZ44Gu44Gr5a++44GX44CB5aSx5pWX44KC5ZCr44KB44Gm5b6F44GkIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gcHJvbWlzZXNcbiAqICAtIGBlbmAgUHJvbWlzZSBpbnN0YW5jZSBhcnJheVxuICogIC0gYGphYCBQcm9taXNlIOOCpOODs+OCueOCv+ODs+OCueOBrumFjeWIl+OCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2FpdChwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdKTogUHJvbWlzZTx1bmtub3duW10+IHtcbiAgICBjb25zdCBzYWZlUHJvbWlzZXMgPSBwcm9taXNlcy5tYXAoKHByb21pc2UpID0+IHByb21pc2UuY2F0Y2goKGUpID0+IGUpKTtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoc2FmZVByb21pc2VzKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2FuY2VsbGF0aW9uIGNoZWNrZXIgbWV0aG9kLiA8YnI+XG4gKiAgICAgSXQncyBwcmFjdGljYWJsZSBieSBgYXN5bmMgZnVuY3Rpb25gLlxuICogQGphIOOCreODo+ODs+OCu+ODq+ODgeOCp+ODg+OCq+ODvCA8YnI+XG4gKiAgICAgYGFzeW5jIGZ1bmN0aW9uYCDjgafkvb/nlKjlj6/og71cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICBhc3luYyBmdW5jdGlvbiBzb21lRnVuYyh0b2tlbjogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPHt9PiB7XG4gKiAgICBhd2FpdCBjaGVja0NhbmNlbGVkKHRva2VuKTtcbiAqICAgIHJldHVybiB7fTtcbiAqICB9XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAge0BsaW5rIENhbmNlbFRva2VufSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIHtAbGluayBDYW5jZWxUb2tlbn0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tDYW5jZWxlZCh0b2tlbjogQ2FuY2VsVG9rZW4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHVuZGVmaW5lZCwgdG9rZW4pO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc3RhdHVzIG9mIHRoZSBwcm9taXNlIGluc3RhbmNlLiA8YnI+XG4gKiAgICAgSXQncyBwcmFjdGljYWJsZSBieSBgYXN5bmMgZnVuY3Rpb25gLlxuICogQGphIFByb21pc2Ug44Kk44Oz44K544K/44Oz44K544Gu54q25oWL44KS56K66KqNIDxicj5cbiAqICAgICBgYXN5bmMgZnVuY3Rpb25gIOOBp+S9v+eUqOWPr+iDvVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgY2hlY2tTdGF0dXMgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIGxldCBwcm9taXNlOiBQcm9taXNlPHVua25vd24+OyAvLyBzb21lIHByb21pc2UgaW5zdGFuY2VcbiAqIDpcbiAqIGNvbnN0IHN0YXR1cyA9IGF3YWl0IGNoZWNrU3RhdHVzKHByb21pc2UpO1xuICogY29uc29sZS5sb2coc3RhdHVzKTtcbiAqIC8vICdwZW5kaW5nJyBvciAnZnVsZmlsbGVkJyBvciAncmVqZWN0ZWQnXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gcHJvbWlzZVxuICogIC0gYGVuYCBQcm9taXNlIGluc3RhbmNlXG4gKiAgLSBgamFgIFByb21pc2Ug44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjaGVja1N0YXR1cyhwcm9taXNlOiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTwncGVuZGluZycgfCAnZnVsZmlsbGVkJyB8ICdyZWplY3RlZCc+IHtcbiAgICBjb25zdCBwZW5kaW5nID0ge307XG4gICAgLypcbiAgICAgKiBQcm9taXNlIOa0vueUn+OCr+ODqeOCueOBp+OCguS9v+eUqOOBmeOCi+OBn+OCgeOBq+OBrywgYGluc3RhbmNlLmNvbnN0cnVjdG9yLnJhY2VgIOOBp+OCouOCr+OCu+OCueOBmeOCi+W/heimgeOBjOOBguOCi1xuICAgICAqIHByb21pc2Ug44GM5rS+55Sf44Kv44Op44K544Gn44GC44KL5aC05ZCILCBQcm9taXNlLnJhY2UoKSDjgpLkvb/nlKjjgZnjgovjgajlv4XjgZogYHBlbmRpbmdgIG9iamVjdCDjgYzov5TjgZXjgozjgabjgZfjgb7jgYZcbiAgICAgKi9cbiAgICByZXR1cm4gKHByb21pc2UuY29uc3RydWN0b3IgYXMgUHJvbWlzZUNvbnN0cnVjdG9yKS5yYWNlKFtwcm9taXNlLCBwZW5kaW5nXSlcbiAgICAgICAgLnRoZW4odiA9PiAodiA9PT0gcGVuZGluZykgPyAncGVuZGluZycgOiAnZnVsZmlsbGVkJywgKCkgPT4gJ3JlamVjdGVkJyk7XG59XG4iLCJpbXBvcnQge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBpc0Z1bmN0aW9uLFxuICAgIG5vb3AsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBDYW5jZWxUb2tlbiB9IGZyb20gJy4vY2FuY2VsLXRva2VuJztcbmltcG9ydCB7IENhbmNlbGFibGVQcm9taXNlLCBOYXRpdmVQcm9taXNlIH0gZnJvbSAnLi9jYW5jZWxhYmxlLXByb21pc2UnO1xuaW1wb3J0IHsgY2hlY2tTdGF0dXMgfSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIFByb21pc2Ug44Gu44Kv44Op44K55ouh5by144GvIHRoZW4gY2hhaW4g44KS6YGp5YiH44Gr566h55CG44GZ44KL44Gf44KB44Gu5L2c5rOV44GM5a2Y5Zyo44GX44CB5Z+65pys55qE44Gr44Gv5Lul5LiL44GuM+OBpOOBruaWuemHneOBjOOBguOCi1xuICogLSAxLiBleGVjdXRvciDjgpLlvJXmlbDjgavjgajjgosgY29uc3RydWN0b3Ig44KS5o+Q5L6b44GZ44KLXG4gKiAtIDIuIHN0YXRpYyBnZXQgW1N5bWJvbC5zcGVjaWVzXSgpIHsgcmV0dXJuIE5hdGl2ZVByb21pc2U7IH0g44KS5o+Q5L6b44GZ44KLXG4gKiAtIDMuIERlZmVycmVkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE5hdGl2ZVByb21pc2Ug44Gu44KI44GG44GrIHByb3RvdHlwZS5jb25zdHJ1Y3RvciDjgpLkuIrmm7jjgY3jgZnjgosgKEhhY2tpbmcpXG4gKlxuICogYERlZmVycmVkYCDjgq/jg6njgrnjgafjga/ku6XkuIvjga7nkIbnlLHjgavjgojjgoosIGAxYCwgYDJgIOOBruWvvuW/nOOCkuihjOOBhi4gXG4gKiAtIGNoZWNrU3RhdHVzKCkg44KSIFByb21pc2Ug5rS+55Sf44Kv44Op44K544Gn44KC5L2/55So44GZ44KL44Gf44KB44Gr44GvLCBgaW5zdGFuY2UuY29uc3RydWN0b3IucmFjZWAg44Gn44Ki44Kv44K744K544GZ44KL5b+F6KaB44GM44GC44KLXG4gKiAgIC0gYFR5cGVFcnJvcjogUHJvbWlzZSByZXNvbHZlIG9yIHJlamVjdCBmdW5jdGlvbiBpcyBub3QgY2FsbGFibGVgIOWvvuetluOBruOBn+OCgeOBriBgMWBcbiAqIC0gYHRoZW5gLCBgY2F0Y2hgLCBgZmluYWx5YCDmmYLjgavnlJ/miJDjgZXjgozjgovjgqTjg7Pjgrnjgr/jg7Pjgrnjga8gYERlZmVycmVkYCDjgafjgYLjgovlv4XopoHjga/nhKHjgYTjgZ/jgoEgYDJgXG4gKlxuICogQHNlZSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy80ODE1ODczMC9leHRlbmQtamF2YXNjcmlwdC1wcm9taXNlLWFuZC1yZXNvbHZlLW9yLXJlamVjdC1pdC1pbnNpZGUtY29uc3RydWN0b3JcbiAqL1xuY29uc3QgcmVzb2x2ZUFyZ3MgPSAoYXJnMT86IFVua25vd25GdW5jdGlvbiB8IENhbmNlbFRva2VuIHwgbnVsbCwgYXJnMj86IENhbmNlbFRva2VuIHwgbnVsbCk6IFtVbmtub3duRnVuY3Rpb24sIENhbmNlbFRva2VuIHwgbnVsbCB8IHVuZGVmaW5lZF0gPT4ge1xuICAgIGlmIChpc0Z1bmN0aW9uKGFyZzEpKSB7XG4gICAgICAgIHJldHVybiBbYXJnMSwgYXJnMl07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFtub29wLCBhcmcxXTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEBlbiBgRGVmZXJyZWRgIG9iamVjdCBjbGFzcyB0aGF0IGNhbiBvcGVyYXRlIGByZWplY3RgIGFuZGAgcmVzb2x2ZWAgZnJvbSB0aGUgb3V0c2lkZS5cbiAqIEBqYSBgcmVqZWN0YCwgYCByZXNvbHZlYCDjgpLlpJbpg6jjgojjgormk43kvZzlj6/og73jgaogYERlZmVycmVkYCDjgqrjg5bjgrjjgqfjgq/jg4jjgq/jg6njgrlcbiAqIFxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBkZiA9IG5ldyBEZWZlcnJlZCgpO1xuICogZGYucmVzb2x2ZSgpO1xuICogZGYucmVqZWN0KCdyZWFzb24nKTtcbiAqIFxuICogYXdhaXQgZGY7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIERlZmVycmVkPFQgPSB2b2lkPiBleHRlbmRzIENhbmNlbGFibGVQcm9taXNlPFQ+IHtcbiAgICByZWFkb25seSByZXNvbHZlITogKGFyZzogVCB8IFByb21pc2VMaWtlPFQ+KSA9PiB2b2lkO1xuICAgIHJlYWRvbmx5IHJlamVjdCE6IChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYW5jZWxUb2tlblxuICAgICAqICAtIGBlbmAge0BsaW5rIENhbmNlbFRva2VufSBpbnN0YW5jZSBjcmVhdGUgZnJvbSB7QGxpbmsgQ2FuY2VsVG9rZW4uc291cmNlIHwgQ2FuY2VsVG9rZW4uc291cmNlfSgpLlxuICAgICAqICAtIGBqYWAge0BsaW5rIENhbmNlbFRva2VuLnNvdXJjZSB8IENhbmNlbFRva2VuLnNvdXJjZX0oKSDjgojjgorkvZzmiJDjgZfjgZ8ge0BsaW5rIENhbmNlbFRva2VufSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihjYW5jZWxUb2tlbj86IENhbmNlbFRva2VuIHwgbnVsbCk7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGV4ZWN1dG9yXG4gICAgICogIC0gYGVuYCBBIGNhbGxiYWNrIHVzZWQgdG8gaW5pdGlhbGl6ZSB0aGUgcHJvbWlzZS4gVGhpcyBjYWxsYmFjayBpcyBwYXNzZWQgdHdvIGFyZ3VtZW50cyBgcmVzb2x2ZWAgYW5kIGByZWplY3RgLlxuICAgICAqICAtIGBqYWAgcHJvbWlzZSDjga7liJ3mnJ/ljJbjgavkvb/nlKjjgZnjgovjgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrpouIGByZXNvbHZlYCDjgaggYHJlamVjdGAg44GuMuOBpOOBruW8leaVsOOCkuaMgeOBpFxuICAgICAqIEBwYXJhbSBjYW5jZWxUb2tlblxuICAgICAqICAtIGBlbmAge0BsaW5rIENhbmNlbFRva2VufSBpbnN0YW5jZSBjcmVhdGUgZnJvbSB7QGxpbmsgQ2FuY2VsVG9rZW4uc291cmNlIHwgQ2FuY2VsVG9rZW4uc291cmNlfSgpLlxuICAgICAqICAtIGBqYWAge0BsaW5rIENhbmNlbFRva2VuLnNvdXJjZSB8IENhbmNlbFRva2VuLnNvdXJjZX0oKSDjgojjgorkvZzmiJDjgZfjgZ8ge0BsaW5rIENhbmNlbFRva2VufSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgZXhlY3V0b3I6IChyZXNvbHZlOiAodmFsdWU/OiBUIHwgUHJvbWlzZUxpa2U8VD4pID0+IHZvaWQsIHJlamVjdDogKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQpID0+IHZvaWQsXG4gICAgICAgIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsXG4gICAgKTtcblxuICAgIGNvbnN0cnVjdG9yKGFyZzE/OiBVbmtub3duRnVuY3Rpb24gfCBDYW5jZWxUb2tlbiB8IG51bGwsIGFyZzI/OiBDYW5jZWxUb2tlbiB8IG51bGwpIHtcbiAgICAgICAgY29uc3QgW2V4ZWN1dG9yLCBjYW5jZWxUb2tlbl0gPSByZXNvbHZlQXJncyhhcmcxLCBhcmcyKTtcbiAgICAgICAgY29uc3QgcHVibGljYXRpb25zID0ge307XG4gICAgICAgIHN1cGVyKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24ocHVibGljYXRpb25zLCB7IHJlc29sdmUsIHJlamVjdCB9KTtcbiAgICAgICAgICAgIGV4ZWN1dG9yKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgIH0sIGNhbmNlbFRva2VuKTtcbiAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLCBwdWJsaWNhdGlvbnMpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1mbG9hdGluZy1wcm9taXNlc1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgc3RhdHVzIG9mIHRoaXMgaW5zdGFuY2UuIDxicj5cbiAgICAgKiAgICAgSXQncyBwcmFjdGljYWJsZSBieSBgYXN5bmMgZnVuY3Rpb25gLlxuICAgICAqIEBqYSBEZWZlcnJlZCDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7nirbmhYvjgpLnorroqo0gPGJyPlxuICAgICAqICAgICBgYXN5bmMgZnVuY3Rpb25gIOOBp+S9v+eUqOWPr+iDvVxuICAgICAqL1xuICAgIHN0YXR1cygpOiBQcm9taXNlPCdwZW5kaW5nJyB8ICdmdWxmaWxsZWQnIHwgJ3JlamVjdGVkJz4ge1xuICAgICAgICByZXR1cm4gY2hlY2tTdGF0dXModGhpcyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpOiAnRGVmZXJyZWQnIHsgcmV0dXJuICdEZWZlcnJlZCc7IH1cbiAgICAvKiogQGludGVybmFsICovXG4gICAgc3RhdGljIGdldCBbU3ltYm9sLnNwZWNpZXNdKCk6IFByb21pc2VDb25zdHJ1Y3RvciB7IHJldHVybiBOYXRpdmVQcm9taXNlOyB9XG59XG4iLCJpbXBvcnQgeyBDYW5jZWxUb2tlblNvdXJjZSB9IGZyb20gJy4vY2FuY2VsLXRva2VuJztcbmltcG9ydCB7IHdhaXQgfSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIG1hbmFnZXMgbHVtcGluZyBtdWx0aXBsZSBgUHJvbWlzZWAgb2JqZWN0cy4gPGJyPlxuICogICAgIEl0J3MgcG9zc2libGUgdG8gbWFrZSB0aGVtIGNhbmNlbCBtb3JlIHRoYW4gb25lIGBQcm9taXNlYCB3aGljaCBoYW5kbGVzIGRpZmZlcmVudCB7QGxpbmsgQ2FuY2VsVG9rZW59IGJ5IGx1bXBpbmcuXG4gKiBAamEg6KSH5pWwIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4jjgpLkuIDmi6znrqHnkIbjgZnjgovjgq/jg6njgrkgPGJyPlxuICogICAgIOeVsOOBquOCiyB7QGxpbmsgQ2FuY2VsVG9rZW59IOOCkuaJseOBhuikh+aVsOOBriBgUHJvbWlzZWAg44KS5LiA5ous44Gn44Kt44Oj44Oz44K744Or44GV44Gb44KL44GT44Go44GM5Y+v6IO9XG4gKi9cbmV4cG9ydCBjbGFzcyBQcm9taXNlTWFuYWdlciB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGZ1bmMtY2FsbC1zcGFjaW5nXG4gICAgcHJpdmF0ZSByZWFkb25seSBfcG9vbCA9IG5ldyBNYXA8UHJvbWlzZTx1bmtub3duPiwgKChyZWFzb246IHVua25vd24pID0+IHVua25vd24pIHwgdW5kZWZpbmVkPigpO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBhIGBQcm9taXNlYCBvYmplY3QgdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4jjgpLnrqHnkIbkuIvjgavov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9taXNlXG4gICAgICogIC0gYGVuYCBhbnkgYFByb21pc2VgIGluc3RhbmNlIGlzIGF2YWlsYWJsZS5cbiAgICAgKiAgLSBgamFgIOS7u+aEj+OBriBgUHJvbWlzZWAg44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIGNhbmNlbFNvdXJjZVxuICAgICAqICAtIGBlbmAge0BsaW5rIENhbmNlbFRva2VuU291cmNlfSBpbnN0YW5jZSBtYWRlIGJ5IHtAbGluayBDYW5jZWxUb2tlbi5zb3VyY2UgfCBDYW5jZWxUb2tlbi5zb3VyY2V9KCkuXG4gICAgICogIC0gYGphYCB7QGxpbmsgQ2FuY2VsVG9rZW4uc291cmNlIHwgQ2FuY2VsVG9rZW4uc291cmNlfSgpIOOBp+eUn+aIkOOBleOCjOOCiyB7QGxpbmsgQ2FuY2VsVG9rZW5Tb3VyY2V9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZXR1cm4gdGhlIHNhbWUgaW5zdGFuY2Ugb2YgaW5wdXQgYHByb21pc2VgIGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg5YWl5Yqb44GX44GfIGBwcm9taXNlYCDjgajlkIzkuIDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkPFQ+KHByb21pc2U6IFByb21pc2U8VD4sIGNhbmNlbFNvdXJjZT86IENhbmNlbFRva2VuU291cmNlKTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHRoaXMuX3Bvb2wuc2V0KHByb21pc2UsIGNhbmNlbFNvdXJjZT8uY2FuY2VsKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcblxuICAgICAgICBjb25zdCBhbHdheXMgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICB0aGlzLl9wb29sLmRlbGV0ZShwcm9taXNlKTtcbiAgICAgICAgICAgIGlmIChjYW5jZWxTb3VyY2UpIHtcbiAgICAgICAgICAgICAgICBjYW5jZWxTb3VyY2UuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBwcm9taXNlXG4gICAgICAgICAgICAudGhlbihhbHdheXMsIGFsd2F5cyk7XG5cbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbGVhc2VkIGFsbCBpbnN0YW5jZXMgdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOCkuegtOajhFxuICAgICAqL1xuICAgIHB1YmxpYyByZWxlYXNlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9wb29sLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBgcHJvbWlzZWAgYXJyYXkgZnJvbSB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44GuIFByb21pc2Ug44KS6YWN5YiX44Gn5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHByb21pc2VzKCk6IFByb21pc2U8dW5rbm93bj5bXSB7XG4gICAgICAgIHJldHVybiBbLi4udGhpcy5fcG9vbC5rZXlzKCldO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYWxsIGBQcm9taXNlLmFsbCgpYCBmb3IgdW5kZXIgdGhlIG1hbmFnZW1lbnQuIDxicj5cbiAgICAgKiAgICAgV2FpdCBmb3IgYWxsIGBmdWxmaWxsZWRgLlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgavlr77jgZfjgaYgYFByb21pc2UuYWxsKClgIDxicj5cbiAgICAgKiAgICAg44GZ44G544Gm44GMIGBmdWxmaWxsZWRgIOOBq+OBquOCi+OBvuOBp+W+heapn1xuICAgICAqL1xuICAgIHB1YmxpYyBhbGwoKTogUHJvbWlzZTx1bmtub3duW10+IHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHRoaXMucHJvbWlzZXMoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbGwgYFByb21pc2UucmFjZSgpYCBmb3IgdW5kZXIgdGhlIG1hbmFnZW1lbnQuIDxicj5cbiAgICAgKiAgICAgV2FpdCBmb3IgYW55IGBzZXR0bGVkYC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44Gr5a++44GX44GmIGBQcm9taXNlLnJhY2UoKWAgPGJyPlxuICAgICAqICAgICDjgYTjgZrjgozjgYvjgYwgYHNldHRsZWRgIOOBq+OBquOCi+OBvuOBp+W+heapn1xuICAgICAqL1xuICAgIHB1YmxpYyByYWNlKCk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yYWNlKHRoaXMucHJvbWlzZXMoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbGwge0BsaW5rIHdhaXR9KCkgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50LiA8YnI+XG4gICAgICogICAgIFdhaXQgZm9yIGFsbCBgc2V0dGxlZGAuIChzaW1wbGlmaWVkIHZlcnNpb24pXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBq+WvvuOBl+OBpiB7QGxpbmsgd2FpdH0oKSA8YnI+XG4gICAgICogICAgIOOBmeOBueOBpuOBjCBgc2V0dGxlZGAg44Gr44Gq44KL44G+44Gn5b6F5qmfICjnsKHmmJPjg5Djg7zjgrjjg6fjg7MpXG4gICAgICovXG4gICAgcHVibGljIHdhaXQoKTogUHJvbWlzZTx1bmtub3duW10+IHtcbiAgICAgICAgcmV0dXJuIHdhaXQodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FsbCBgUHJvbWlzZS5hbGxTZXR0bGVkKClgIGZvciB1bmRlciB0aGUgbWFuYWdlbWVudC4gPGJyPlxuICAgICAqICAgICBXYWl0IGZvciBhbGwgYHNldHRsZWRgLlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgavlr77jgZfjgaYgYFByb21pc2UuYWxsU2V0dGxlZCgpYCA8YnI+XG4gICAgICogICAgIOOBmeOBueOBpuOBjCBgc2V0dGxlZGAg44Gr44Gq44KL44G+44Gn5b6F5qmfXG4gICAgICovXG4gICAgcHVibGljIGFsbFNldHRsZWQoKTogUHJvbWlzZTxQcm9taXNlU2V0dGxlZFJlc3VsdDx1bmtub3duPltdPiB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbFNldHRsZWQodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FsbCBgUHJvbWlzZS5hbnkoKWAgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50LiA8YnI+XG4gICAgICogICAgIFdhaXQgZm9yIGFueSBgZnVsZmlsbGVkYC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44Gr5a++44GX44GmIGBQcm9taXNlLmFueSgpYCA8YnI+XG4gICAgICogICAgIOOBhOOBmuOCjOOBi+OBjCBgZnVsZmlsbGVkYCDjgavjgarjgovjgb7jgaflvoXmqZ9cbiAgICAgKi9cbiAgICBwdWJsaWMgYW55KCk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbnkodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW52b2tlIGBjYW5jZWxgIG1lc3NhZ2UgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50IHByb21pc2VzLlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjga4gYFByb21pc2VgIOOBq+WvvuOBl+OBpuOCreODo+ODs+OCu+ODq+OCkueZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIHJlYXNvblxuICAgICAqICAtIGBlbmAgYXJndW1lbnRzIGZvciBgY2FuY2VsU291cmNlYFxuICAgICAqICAtIGBqYWAgYGNhbmNlbFNvdXJjZWAg44Gr5rih44GV44KM44KL5byV5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIGBQcm9taXNlYCBpbnN0YW5jZSB3aGljaCB3YWl0IGJ5IHVudGlsIGNhbmNlbGxhdGlvbiBjb21wbGV0aW9uLlxuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744Or5a6M5LqG44G+44Gn5b6F5qmf44GZ44KLIGBQcm9taXNlYCDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgYWJvcnQ8VD4ocmVhc29uPzogVCk6IFByb21pc2U8dW5rbm93bltdPiB7XG4gICAgICAgIGZvciAoY29uc3QgY2FuY2VsZXIgb2YgdGhpcy5fcG9vbC52YWx1ZXMoKSkge1xuICAgICAgICAgICAgaWYgKGNhbmNlbGVyKSB7XG4gICAgICAgICAgICAgICAgY2FuY2VsZXIoXG4gICAgICAgICAgICAgICAgICAgIHJlYXNvbiA/PyBuZXcgRXJyb3IoJ2Fib3J0JylcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3YWl0KHRoaXMucHJvbWlzZXMoKSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBVbmtub3duT2JqZWN0LFxuICAgIGlzU3RyaW5nLFxuICAgIGlzU3ltYm9sLFxuICAgIGNsYXNzTmFtZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuXG4vKiogQGludGVybmFsIEV2ZW50QnJva2VyUHJveHkgKi9cbmV4cG9ydCBjbGFzcyBFdmVudEJyb2tlclByb3h5PEV2ZW50IGV4dGVuZHMgb2JqZWN0PiB7XG4gICAgcHJpdmF0ZSBfYnJva2VyPzogRXZlbnRCcm9rZXI8RXZlbnQ+O1xuICAgIHB1YmxpYyBnZXQoKTogRXZlbnRCcm9rZXI8RXZlbnQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Jyb2tlciA/PyAodGhpcy5fYnJva2VyID0gbmV3IEV2ZW50QnJva2VyKCkpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgX2ludGVybmFsICAgICAgPSBTeW1ib2woJ2ludGVybmFsJyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBfbm90aWZ5ICAgICAgICA9IFN5bWJvbCgnbm90aWZ5Jyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBfc3RvY2tDaGFuZ2UgICA9IFN5bWJvbCgnc3RvY2stY2hhbmdlJyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBfbm90aWZ5Q2hhbmdlcyA9IFN5bWJvbCgnbm90aWZ5LWNoYW5nZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZlcmlmeU9ic2VydmFibGUoeDogdW5rbm93bik6IHZvaWQgfCBuZXZlciB7XG4gICAgaWYgKCF4IHx8ICEoeCBhcyBVbmtub3duT2JqZWN0KVtfaW50ZXJuYWxdKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFRoZSBvYmplY3QgcGFzc2VkIGlzIG5vdCBhbiBJT2JzZXJ2YWJsZS5gKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiB2ZXJpZnlWYWxpZEtleShrZXk6IHVua25vd24pOiB2b2lkIHwgbmV2ZXIge1xuICAgIGlmIChpc1N0cmluZyhrZXkpIHx8IGlzU3ltYm9sKGtleSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBUeXBlIG9mICR7Y2xhc3NOYW1lKGtleSl9IGlzIG5vdCBhIHZhbGlkIGtleS5gKTtcbn1cbiIsImltcG9ydCB0eXBlIHsgVW5rbm93bk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24sIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgX2ludGVybmFsIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKlxuICogQGVuIEV2ZW50IG9ic2VydmF0aW9uIHN0YXRlIGRlZmluaXRpb24uXG4gKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL5a6a576pXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIE9ic2VydmFibGVTdGF0ZSB7XG4gICAgLyoqIG9ic2VydmFibGUgcmVhZHkgKi9cbiAgICBBQ1RJVkUgICA9ICdhY3RpdmUnLFxuICAgIC8qKiBOT1Qgb2JzZXJ2ZWQsIGJ1dCBwcm9wZXJ0eSBjaGFuZ2VzIGFyZSByZWNvcmRlZC4gKi9cbiAgICBTVVNFUE5ERUQgPSAnc3VzcGVuZGVkJyxcbiAgICAvKiogTk9UIG9ic2VydmVkLCBhbmQgbm90IHJlY29yZGluZyBwcm9wZXJ0eSBjaGFuZ2VzLiAqL1xuICAgIERJU0FCTEVEID0gJ2Rpc2FibGVkJyxcbn1cblxuLyoqXG4gKiBAZW4gT2JzZXJ2YWJsZSBjb21tb24gaW50ZXJmYWNlLlxuICogQGphIE9ic2VydmFibGUg5YWx6YCa44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSU9ic2VydmFibGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqL1xuICAgIG9uKC4uLmFyZ3M6IHVua25vd25bXSk6IFN1YnNjcmlwdGlvbjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmKC4uLmFyZ3M6IHVua25vd25bXSk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3VzcGVuZCBvciBkaXNhYmxlIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44K144K544Oa44Oz44OJXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm9SZWNvcmRcbiAgICAgKiAgLSBgZW5gIGB0cnVlYDogbm90IHJlY29yZGluZyBwcm9wZXJ0eSBjaGFuZ2VzIGFuZCBjbGVhciBjaGFuZ2VzLiAvIGBmYWxzZWA6IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkIGFuZCBmaXJlZCB3aGVuIHtAbGluayByZXN1bWV9KCkgY2FsbGRlZC4gKGRlZmF1bHQpXG4gICAgICogIC0gYGphYCBgdHJ1ZWA6IOODl+ODreODkeODhuOCo+WkieabtOOCguiomOmMsuOBm+OBmiwg54++5Zyo44Gu6KiY6Yyy44KC56C05qOEIC8gYGZhbHNlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044Gv6KiY6Yyy44GV44KMLCB7QGxpbmsgcmVzdW1lfSgpIOaZguOBq+eZuueBq+OBmeOCiyAo5pei5a6aKVxuICAgICAqL1xuICAgIHN1c3BlbmQobm9SZWNvcmQ/OiBib29sZWFuKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN1bWUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jg6rjgrjjg6Xjg7zjg6BcbiAgICAgKi9cbiAgICByZXN1bWUoKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBvYnNlcnZhdGlvbiBzdGF0ZVxuICAgICAqIEBqYSDos7zoqq3lj6/og73nirbmhYtcbiAgICAgKi9cbiAgICBnZXRPYnNlcnZhYmxlU3RhdGUoKTogT2JzZXJ2YWJsZVN0YXRlO1xufVxuXG4vKipcbiAqIEBlbiBJbnRlcmZhY2UgYWJsZSB0byBhY2Nlc3MgdG8ge0BsaW5rIEV2ZW50QnJva2VyfSB3aXRoIHtAbGluayBJT2JzZXJ2YWJsZX0uXG4gKiBAamEge0BsaW5rIElPYnNlcnZhYmxlfSDjga7mjIHjgaTlhoXpg6gge0BsaW5rIEV2ZW50QnJva2VyfSDjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJT2JzZXJ2YWJsZUV2ZW50QnJva2VyQWNjZXNzPFQgZXh0ZW5kcyBvYmplY3QgPSBhbnk+IGV4dGVuZHMgSU9ic2VydmFibGUgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHtAbGluayBFdmVudEJyb2tlcn0gaW5zdGFuY2UuXG4gICAgICogQGphIHtAbGluayBFdmVudEJyb2tlcn0g44Kk44Oz44K544K/44Oz44K544Gu5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0QnJva2VyKCk6IEV2ZW50QnJva2VyPFQ+O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyB7QGxpbmsgSU9ic2VydmFibGV9LlxuICogQGphIHtAbGluayBJT2JzZXJ2YWJsZX0g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNPYnNlcnZhYmxlKHg6IHVua25vd24pOiB4IGlzIElPYnNlcnZhYmxlIHtcbiAgICByZXR1cm4gQm9vbGVhbih4ICYmICh4IGFzIFVua25vd25PYmplY3QpW19pbnRlcm5hbF0pO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgVW5rbm93bk9iamVjdCxcbiAgICBBY2Nlc3NpYmxlLFxuICAgIE5vbkZ1bmN0aW9uUHJvcGVydGllcyxcbiAgICBOb25GdW5jdGlvblByb3BlcnR5TmFtZXMsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICB2ZXJpZnksXG4gICAgcG9zdCxcbiAgICBkZWVwTWVyZ2UsXG4gICAgZGVlcEVxdWFsLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uLCBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgRXZlbnRCcm9rZXJQcm94eSxcbiAgICBfaW50ZXJuYWwsXG4gICAgX25vdGlmeSxcbiAgICBfc3RvY2tDaGFuZ2UsXG4gICAgX25vdGlmeUNoYW5nZXMsXG4gICAgdmVyaWZ5T2JzZXJ2YWJsZSxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlU3RhdGUsIElPYnNlcnZhYmxlIH0gZnJvbSAnLi9jb21tb24nO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgSW50ZXJuYWxQcm9wcyB7XG4gICAgc3RhdGU6IE9ic2VydmFibGVTdGF0ZTtcbiAgICBjaGFuZ2VkOiBib29sZWFuO1xuICAgIHJlYWRvbmx5IGNoYW5nZU1hcDogTWFwPFByb3BlcnR5S2V5LCBhbnk+O1xuICAgIHJlYWRvbmx5IGJyb2tlcjogRXZlbnRCcm9rZXJQcm94eTxhbnk+O1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcHJveHlIYW5kbGVyOiBQcm94eUhhbmRsZXI8T2JzZXJ2YWJsZU9iamVjdD4gPSB7XG4gICAgc2V0KHRhcmdldDogQWNjZXNzaWJsZTxPYnNlcnZhYmxlT2JqZWN0PiwgcCwgdmFsdWUsIHJlY2VpdmVyKSB7XG4gICAgICAgIGlmICghaXNTdHJpbmcocCkpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LnNldCh0YXJnZXQsIHAsIHZhbHVlLCByZWNlaXZlcik7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXRbcF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IHRhcmdldFtfaW50ZXJuYWxdLnN0YXRlICYmIHZhbHVlICE9PSBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgdGFyZ2V0W19zdG9ja0NoYW5nZV0ocCwgb2xkVmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBSZWZsZWN0LnNldCh0YXJnZXQsIHAsIHZhbHVlLCByZWNlaXZlcik7XG4gICAgfSxcbn07XG5PYmplY3QuZnJlZXplKF9wcm94eUhhbmRsZXIpO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gT2JzZXJ2YWJsZSBrZXkgdHlwZSBkZWZpbml0aW9uLlxuICogQGphIOizvOiqreWPr+iDveOBquOCreODvOOBruWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBPYnNlcnZhYmxlS2V5czxUIGV4dGVuZHMgT2JzZXJ2YWJsZU9iamVjdD4gPSBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VD47XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgb2JqZWN0IGNsYXNzIHdoaWNoIGNoYW5nZSBjYW4gYmUgb2JzZXJ2ZWQuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu5aSJ5pu044KS55uj6KaW44Gn44GN44KL44Kq44OW44K444Kn44Kv44OI44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogY2xhc3MgRXhhbXBsZSBleHRlbmRzIE9ic2VydmFibGVPYmplY3Qge1xuICogICBwdWJsaWMgYTogbnVtYmVyID0gMDtcbiAqICAgcHVibGljIGI6IG51bWJlciA9IDA7XG4gKiAgIHB1YmxpYyBnZXQgc3VtKCk6IG51bWJlciB7XG4gKiAgICAgICByZXR1cm4gdGhpcy5hICsgdGhpcy5iO1xuICogICB9XG4gKiB9XG4gKlxuICogY29uc3Qgb2JzZXJ2YWJsZSA9IG5ldyBFeGFtcGxlKCk7XG4gKlxuICogZnVuY3Rpb24gb25OdW1DaGFuZ2UobmV3VmFsdWU6IG51bWJlciwgb2xkVmFsdWU6IG51bWJlciwga2V5OiBzdHJpbmcpIHtcbiAqICAgY29uc29sZS5sb2coYCR7a2V5fSBjaGFuZ2VkIGZyb20gJHtvbGRWYWx1ZX0gdG8gJHtuZXdWYWx1ZX0uYCk7XG4gKiB9XG4gKiBvYnNlcnZhYmxlLm9uKFsnYScsICdiJ10sIG9uTnVtQ2hhbmdlKTtcbiAqXG4gKiAvLyB1cGRhdGVcbiAqIG9ic2VydmFibGUuYSA9IDEwMDtcbiAqIG9ic2VydmFibGUuYiA9IDIwMDtcbiAqXG4gKiAvLyBjb25zb2xlIG91dCBmcm9tIGBhc3luY2AgZXZlbnQgbG9vcC5cbiAqIC8vID0+ICdhIGNoYW5nZWQgZnJvbSAwIHRvIDEwMC4nXG4gKiAvLyA9PiAnYiBjaGFuZ2VkIGZyb20gMCB0byAyMDAuJ1xuICpcbiAqIDpcbiAqXG4gKiBmdW5jdGlvbiBvblN1bUNoYW5nZShuZXdWYWx1ZTogbnVtYmVyLCBvbGRWYWx1ZTogbnVtYmVyKSB7XG4gKiAgIGNvbnNvbGUubG9nKGBzdW0gY2hhbmdlZCBmcm9tICR7b2xkVmFsdWV9IHRvICR7bmV3VmF1ZX0uYCk7XG4gKiB9XG4gKiBvYnNlcnZhYmxlLm9uKCdzdW0nLCBvblN1bUNoYW5nZSk7XG4gKlxuICogLy8gdXBkYXRlXG4gKiBvYnNlcnZhYmxlLmEgPSAxMDA7IC8vIG5vdGhpbmcgcmVhY3Rpb24gYmVjYXVzZSBvZiBubyBjaGFuZ2UgcHJvcGVydGllcy5cbiAqIG9ic2VydmFibGUuYSA9IDIwMDtcbiAqXG4gKiAvLyBjb25zb2xlIG91dCBmcm9tIGBhc3luY2AgZXZlbnQgbG9vcC5cbiAqIC8vID0+ICdzdW0gY2hhbmdlZCBmcm9tIDMwMCB0byA0MDAuJ1xuICogYGBgXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBPYnNlcnZhYmxlT2JqZWN0IGltcGxlbWVudHMgSU9ic2VydmFibGUge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfaW50ZXJuYWxdITogSW50ZXJuYWxQcm9wcztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RhdGVcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgc3RhdGUuIGRlZmF1bHQ6IHtAbGluayBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFIHwgT2JzZXJ2YWJsZVN0YXRlLkFDVElWRX1cbiAgICAgKiAgLSBgamFgIOWIneacn+eKtuaFiyDml6Llrpo6IHtAbGluayBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFIHwgT2JzZXJ2YWJsZVN0YXRlLkFDVElWRX1cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzdGF0ZSA9IE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUpIHtcbiAgICAgICAgdmVyaWZ5KCdpbnN0YW5jZU9mJywgT2JzZXJ2YWJsZU9iamVjdCwgdGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsOiBJbnRlcm5hbFByb3BzID0ge1xuICAgICAgICAgICAgc3RhdGUsXG4gICAgICAgICAgICBjaGFuZ2VkOiBmYWxzZSxcbiAgICAgICAgICAgIGNoYW5nZU1hcDogbmV3IE1hcCgpLFxuICAgICAgICAgICAgYnJva2VyOiBuZXcgRXZlbnRCcm9rZXJQcm94eTx0aGlzPigpLFxuICAgICAgICB9O1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgX2ludGVybmFsLCB7IHZhbHVlOiBPYmplY3Quc2VhbChpbnRlcm5hbCkgfSk7XG4gICAgICAgIHJldHVybiBuZXcgUHJveHkodGhpcywgX3Byb3h5SGFuZGxlcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSU9ic2VydmFibGVcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgcHJvcGVydHkgY2hhbmdlcy5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5aSJ5pu06LO86Kqt6Kit5a6aICjlhajjg5fjg63jg5Hjg4bjgqPnm6PoppYpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydHlcbiAgICAgKiAgLSBgZW5gIHdpbGQgY29yZCBzaWduYXR1cmUuXG4gICAgICogIC0gYGphYCDjg6/jgqTjg6vjg4njgqvjg7zjg4lcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBwcm9wZXJ0eSBjaGFuZ2UuXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbihwcm9wZXJ0eTogJ0AnLCBsaXN0ZW5lcjogKGNvbnRleHQ6IE9ic2VydmFibGVPYmplY3QpID0+IHVua25vd24pOiBTdWJzY3JpcHRpb247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIHByb3BlcnR5IGNoYW5nZShzKS5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5aSJ5pu06LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydHlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eS5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIHByb3BlcnR5IGNoYW5nZS5cbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk6IEsgfCBLW10sIGxpc3RlbmVyOiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IHVua25vd24pOiBTdWJzY3JpcHRpb247XG5cbiAgICBvbjxLIGV4dGVuZHMgT2JzZXJ2YWJsZUtleXM8dGhpcz4+KHByb3BlcnR5OiBLIHwgS1tdLCBsaXN0ZW5lcjogKG5ld1ZhbHVlOiB0aGlzW0tdLCBvbGRWYWx1ZTogdGhpc1tLXSwga2V5OiBLKSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgeyBjaGFuZ2VNYXAsIGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBicm9rZXIuZ2V0KCkub24ocHJvcGVydHksIGxpc3RlbmVyKTtcbiAgICAgICAgaWYgKDAgPCBjaGFuZ2VNYXAuc2l6ZSkge1xuICAgICAgICAgICAgY29uc3QgcHJvcHMgPSBpc0FycmF5KHByb3BlcnR5KSA/IHByb3BlcnR5IDogW3Byb3BlcnR5XTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wcykge1xuICAgICAgICAgICAgICAgIGNoYW5nZU1hcC5oYXMocHJvcCkgfHwgY2hhbmdlTWFwLnNldChwcm9wLCB0aGlzW3Byb3BdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBwcm9wZXJ0eSBjaGFuZ2VzKVxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlpInmm7Tos7zoqq3op6PpmaQgKOWFqOODl+ODreODkeODhuOCo+ebo+imlilcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0eVxuICAgICAqICAtIGBlbmAgd2lsZCBjb3JkIHNpZ25hdHVyZS5cbiAgICAgKiAgLSBgamFgIOODr+OCpOODq+ODieOCq+ODvOODiVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIHByb3BlcnR5IGNoYW5nZS5cbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9mZihwcm9wZXJ0eTogJ0AnLCBsaXN0ZW5lcj86IChjb250ZXh0OiBPYnNlcnZhYmxlT2JqZWN0KSA9PiBhbnkpOiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIHByb3BlcnR5IGNoYW5nZShzKS5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5aSJ5pu06LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydHlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eS5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm6Kej6ZmkXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgcHJvcGVydHkgY2hhbmdlLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvZmY8SyBleHRlbmRzIE9ic2VydmFibGVLZXlzPHRoaXM+Pihwcm9wZXJ0eT86IEsgfCBLW10sIGxpc3RlbmVyPzogKG5ld1ZhbHVlOiB0aGlzW0tdLCBvbGRWYWx1ZTogdGhpc1tLXSwga2V5OiBLKSA9PiB1bmtub3duKTogdm9pZDtcblxuICAgIG9mZjxLIGV4dGVuZHMgT2JzZXJ2YWJsZUtleXM8dGhpcz4+KHByb3BlcnR5PzogSyB8IEtbXSwgbGlzdGVuZXI/OiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmJyb2tlci5nZXQoKS5vZmYocHJvcGVydHksIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3VzcGVuZCBvciBkaXNhYmxlIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44K144K544Oa44Oz44OJXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm9SZWNvcmRcbiAgICAgKiAgLSBgZW5gIGB0cnVlYDogbm90IHJlY29yZGluZyBwcm9wZXJ0eSBjaGFuZ2VzIGFuZCBjbGVhciBjaGFuZ2VzLiAvIGBmYWxzZWA6IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkIGFuZCBmaXJlZCB3aGVuIHtAbGluayByZXN1bWV9KCkgY2FsbGRlZC4gKGRlZmF1bHQpXG4gICAgICogIC0gYGphYCBgdHJ1ZWA6IOODl+ODreODkeODhuOCo+WkieabtOOCguiomOmMsuOBm+OBmiwg54++5Zyo44Gu6KiY6Yyy44KC56C05qOEIC8gYGZhbHNlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044Gv6KiY6Yyy44GV44KMLCB7QGxpbmsgcmVzdW1lfSgpIOaZguOBq+eZuueBq+OBmeOCiyAo5pei5a6aKVxuICAgICAqL1xuICAgIHN1c3BlbmQobm9SZWNvcmQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uc3RhdGUgPSBub1JlY29yZCA/IE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA6IE9ic2VydmFibGVTdGF0ZS5TVVNFUE5ERUQ7XG4gICAgICAgIGlmIChub1JlY29yZCkge1xuICAgICAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmNoYW5nZU1hcC5jbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN1bWUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jg6rjgrjjg6Xjg7zjg6BcbiAgICAgKi9cbiAgICByZXN1bWUoKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIGludGVybmFsLnN0YXRlID0gT2JzZXJ2YWJsZVN0YXRlLkFDVElWRTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB0aGlzW19ub3RpZnlDaGFuZ2VzXSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gb2JzZXJ2YXRpb24gc3RhdGVcbiAgICAgKiBAamEg6LO86Kqt5Y+v6IO954q25oWLXG4gICAgICovXG4gICAgZ2V0T2JzZXJ2YWJsZVN0YXRlKCk6IE9ic2VydmFibGVTdGF0ZSB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzW19pbnRlcm5hbF0uc3RhdGU7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2Vzc1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIGdldEJyb2tlcigpOiBFdmVudEJyb2tlcjxOb25GdW5jdGlvblByb3BlcnRpZXM8dGhpcz4+IHtcbiAgICAgICAgY29uc3QgeyBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgcmV0dXJuIGJyb2tlci5nZXQoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBzdGF0aWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUge0BsaW5rIE9ic2VydmFibGVPYmplY3R9IGZyb20gYW55IG9iamVjdC5cbiAgICAgKiBAamEg5Lu75oSP44Gu44Kq44OW44K444Kn44Kv44OI44GL44KJIHtAbGluayBPYnNlcnZhYmxlT2JqZWN0fSDjgpLnlJ/miJBcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogY29uc3Qgb2JzZXJ2YWJsZSA9IE9ic2VydmFibGVPYmplY3QuZnJvbSh7IGE6IDEsIGI6IDEgfSk7XG4gICAgICogZnVuY3Rpb24gb25OdW1DaGFuZ2UobmV3VmFsdWU6IG51bWJlciwgb2xkVmFsdWU6IG51bWJlciwga2V5OiBzdHJpbmcpIHtcbiAgICAgKiAgIGNvbnNvbGUubG9nKGAke2tleX0gY2hhbmdlZCBmcm9tICR7b2xkVmFsdWV9IHRvICR7bmV3VmFsdWV9LmApO1xuICAgICAqIH1cbiAgICAgKiBvYnNlcnZhYmxlLm9uKFsnYScsICdiJ10sIG9uTnVtQ2hhbmdlKTtcbiAgICAgKlxuICAgICAqIC8vIHVwZGF0ZVxuICAgICAqIG9ic2VydmFibGUuYSA9IDEwMDtcbiAgICAgKiBvYnNlcnZhYmxlLmIgPSAyMDA7XG4gICAgICpcbiAgICAgKiAvLyBjb25zb2xlIG91dCBmcm9tIGBhc3luY2AgZXZlbnQgbG9vcC5cbiAgICAgKiAvLyA9PiAnYSBjaGFuZ2VkIGZyb20gMSB0byAxMDAuJ1xuICAgICAqIC8vID0+ICdiIGNoYW5nZWQgZnJvbSAxIHRvIDIwMC4nXG4gICAgICogYGBgXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyBvYmplY3Q+KHNyYzogVCk6IE9ic2VydmFibGVPYmplY3QgJiBUIHtcbiAgICAgICAgY29uc3Qgb2JzZXJ2YWJsZSA9IGRlZXBNZXJnZShuZXcgY2xhc3MgZXh0ZW5kcyBPYnNlcnZhYmxlT2JqZWN0IHsgfShPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQpLCBzcmMpO1xuICAgICAgICBvYnNlcnZhYmxlLnJlc3VtZSgpO1xuICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZSBhcyBhbnk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJvdGVjdGVkIG1laHRvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRm9yY2Ugbm90aWZ5IHByb3BlcnR5IGNoYW5nZShzKSBpbiBzcGl0ZSBvZiBhY3RpdmUgc3RhdGUuXG4gICAgICogQGphIOOCouOCr+ODhuOCo+ODlueKtuaFi+OBq+OBi+OBi+OCj+OCieOBmuW8t+WItueahOOBq+ODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCkueZuuihjFxuICAgICAqL1xuICAgIHByb3RlY3RlZCBub3RpZnkoLi4ucHJvcGVydGllczogc3RyaW5nW10pOiB2b2lkIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgaWYgKDAgPT09IHByb3BlcnRpZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IGNoYW5nZU1hcCB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCBrZXlWYWx1ZSA9IG5ldyBNYXA8UHJvcGVydHlLZXksIFthbnksIGFueV0+KCk7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gKHRoaXMgYXMgVW5rbm93bk9iamVjdClba2V5XTtcbiAgICAgICAgICAgIGNvbnN0IG9sZFZhbHVlID0gY2hhbmdlTWFwLmhhcyhrZXkpID8gY2hhbmdlTWFwLmdldChrZXkpIDogbmV3VmFsdWU7XG4gICAgICAgICAgICBrZXlWYWx1ZS5zZXQoa2V5LCBbbmV3VmFsdWUsIG9sZFZhbHVlXSk7XG4gICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMsIGtleSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzW19pbnRlcm5hbF0uY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzW19ub3RpZnldKGtleVZhbHVlKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1laHRvZHM6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX3N0b2NrQ2hhbmdlXShwOiBzdHJpbmcsIG9sZFZhbHVlOiBhbnkpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZSwgY2hhbmdlTWFwLCBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmNoYW5nZWQgPSB0cnVlO1xuICAgICAgICBpZiAoMCA9PT0gY2hhbmdlTWFwLnNpemUpIHtcbiAgICAgICAgICAgIGNoYW5nZU1hcC5zZXQocCwgb2xkVmFsdWUpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBrIG9mIGJyb2tlci5nZXQoKS5jaGFubmVscygpKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlTWFwLmhhcyhrKSB8fCBjaGFuZ2VNYXAuc2V0KGssICh0aGlzIGFzIFVua25vd25PYmplY3QpW2tdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFID09PSBzdGF0ZSkge1xuICAgICAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB0aGlzW19ub3RpZnlDaGFuZ2VzXSgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNoYW5nZU1hcC5oYXMocCkgfHwgY2hhbmdlTWFwLnNldChwLCBvbGRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeUNoYW5nZXNdKCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCBjaGFuZ2VNYXAgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgIT09IHN0YXRlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qga2V5VmFsdWVQYWlycyA9IG5ldyBNYXA8UHJvcGVydHlLZXksIFthbnksIGFueV0+KCk7XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgb2xkVmFsdWVdIG9mIGNoYW5nZU1hcCkge1xuICAgICAgICAgICAgY29uc3QgY3VyVmFsdWUgPSAodGhpcyBhcyBVbmtub3duT2JqZWN0KVtrZXldO1xuICAgICAgICAgICAgaWYgKCFkZWVwRXF1YWwob2xkVmFsdWUsIGN1clZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGtleVZhbHVlUGFpcnMuc2V0KGtleSwgW2N1clZhbHVlLCBvbGRWYWx1ZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXNbX25vdGlmeV0oa2V5VmFsdWVQYWlycyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19ub3RpZnldKGtleVZhbHVlOiBNYXA8UHJvcGVydHlLZXksIFthbnksIGFueV0+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgY2hhbmdlZCwgY2hhbmdlTWFwLCBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY2hhbmdlTWFwLmNsZWFyKCk7XG4gICAgICAgIHRoaXNbX2ludGVybmFsXS5jaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGV2ZW50QnJva2VyID0gYnJva2VyLmdldCgpO1xuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlc10gb2Yga2V5VmFsdWUpIHtcbiAgICAgICAgICAgIChldmVudEJyb2tlciBhcyBhbnkpLnRyaWdnZXIoa2V5LCAuLi52YWx1ZXMsIGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoYW5nZWQpIHtcbiAgICAgICAgICAgIGV2ZW50QnJva2VyLnRyaWdnZXIoJ0AnLCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgcHJlZmVyLXJlc3QtcGFyYW1zLFxuICovXG5cbmltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIEFjY2Vzc2libGUsXG4gICAgV3JpdGFibGUsXG4gICAgaXNOdW1iZXIsXG4gICAgdmVyaWZ5LFxuICAgIHBvc3QsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24sIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBFdmVudEJyb2tlclByb3h5LFxuICAgIF9pbnRlcm5hbCxcbiAgICBfbm90aWZ5LFxuICAgIF9zdG9ja0NoYW5nZSxcbiAgICBfbm90aWZ5Q2hhbmdlcyxcbiAgICB2ZXJpZnlPYnNlcnZhYmxlLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IE9ic2VydmFibGVTdGF0ZSwgSU9ic2VydmFibGUgfSBmcm9tICcuL2NvbW1vbic7XG5cbi8qKlxuICogQGVuIEFycmF5IGNoYW5nZSB0eXBlIGluZm9ybWF0aW9uLiA8YnI+XG4gKiAgICAgVGhlIHZhbHVlIGlzIHN1aXRhYmxlIGZvciB0aGUgbnVtYmVyIG9mIGZsdWN0dWF0aW9uIG9mIHRoZSBlbGVtZW50LlxuICogQGphIOmFjeWIl+WkieabtOmAmuefpeOBruOCv+OCpOODlyA8YnI+XG4gKiAgICAg5YCk44Gv6KaB57Sg44Gu5aKX5rib5pWw44Gr55u45b2TXG4gKlxuICovXG5leHBvcnQgY29uc3QgZW51bSBBcnJheUNoYW5nZVR5cGUge1xuICAgIFJFTU9WRSA9IC0xLFxuICAgIFVQREFURSA9IDAsXG4gICAgSU5TRVJUID0gMSxcbn1cblxuLyoqXG4gKiBAZW4gQXJyYXkgY2hhbmdlIHJlY29yZCBpbmZvcm1hdGlvbi5cbiAqIEBqYSDphY3liJflpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcnJheUNoYW5nZVJlY29yZDxUPiB7XG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBjaGFuZ2UgdHlwZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAamEg6YWN5YiX5aSJ5pu05oOF5aCx44Gu6K2Y5Yil5a2QXG4gICAgICovXG4gICAgcmVhZG9ubHkgdHlwZTogQXJyYXlDaGFuZ2VUeXBlO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBjaGFuZ2UgdHlwZSBpbmZvcm1hdGlvbi4gPGJyPlxuICAgICAqICAgICDigLsgW0F0dGVudGlvbl0gVGhlIGluZGV4IHdpbGwgYmUgZGlmZmVyZW50IGZyb20gdGhlIGFjdHVhbCBsb2NhdGlvbiB3aGVuIGFycmF5IHNpemUgY2hhbmdlZCBiZWNhdXNlIHRoYXQgZGV0ZXJtaW5lcyBlbGVtZW50IG9wZXJhdGlvbiB1bml0LlxuICAgICAqIEBqYSDlpInmm7TjgYznmbrnlJ/jgZfjgZ/phY3liJflhoXjga7kvY3nva7jga4gaW5kZXggPGJyPlxuICAgICAqICAgICDigLsgW+azqOaEj10g44Kq44Oa44Os44O844K344On44Oz5Y2Y5L2N44GuIGluZGV4IOOBqOOBquOCiiwg6KaB57Sg44GM5aKX5rib44GZ44KL5aC05ZCI44Gv5a6f6Zqb44Gu5L2N572u44Go55Ww44Gq44KL44GT44Go44GM44GC44KLXG4gICAgICovXG4gICAgcmVhZG9ubHkgaW5kZXg6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBOZXcgZWxlbWVudCdzIHZhbHVlLlxuICAgICAqIEBqYSDopoHntKDjga7mlrDjgZfjgYTlgKRcbiAgICAgKi9cbiAgICByZWFkb25seSBuZXdWYWx1ZT86IFQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gT2xkIGVsZW1lbnQncyB2YWx1ZS5cbiAgICAgKiBAamEg6KaB57Sg44Gu5Y+k44GE5YCkXG4gICAgICovXG4gICAgcmVhZG9ubHkgb2xkVmFsdWU/OiBUO1xufVxudHlwZSBNdXRhYmxlQ2hhbmdlUmVjb3JkPFQ+ID0gV3JpdGFibGU8QXJyYXlDaGFuZ2VSZWNvcmQ8VD4+O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIElBcnJheUNoYW5nZUV2ZW50PFQ+IHtcbiAgICAnQCc6IFtBcnJheUNoYW5nZVJlY29yZDxUPltdXTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEludGVybmFsUHJvcHM8VCA9IHVua25vd24+IHtcbiAgICBzdGF0ZTogT2JzZXJ2YWJsZVN0YXRlO1xuICAgIGJ5TWV0aG9kOiBib29sZWFuO1xuICAgIHJlY29yZHM6IE11dGFibGVDaGFuZ2VSZWNvcmQ8VD5bXTtcbiAgICByZWFkb25seSBpbmRleGVzOiBTZXQ8bnVtYmVyPjtcbiAgICByZWFkb25seSBicm9rZXI6IEV2ZW50QnJva2VyUHJveHk8SUFycmF5Q2hhbmdlRXZlbnQ8VD4+O1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcHJveHlIYW5kbGVyOiBQcm94eUhhbmRsZXI8T2JzZXJ2YWJsZUFycmF5PiA9IHtcbiAgICBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQ6IEFjY2Vzc2libGU8T2JzZXJ2YWJsZUFycmF5LCBudW1iZXI+LCBwLCBhdHRyaWJ1dGVzKSB7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGFyZ2V0W19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgPT09IGludGVybmFsLnN0YXRlIHx8IGludGVybmFsLmJ5TWV0aG9kIHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYXR0cmlidXRlcywgJ3ZhbHVlJykpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXRbcF07XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gYXR0cmlidXRlcy52YWx1ZTtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGVxZXFlcVxuICAgICAgICBpZiAoJ2xlbmd0aCcgPT09IHAgJiYgbmV3VmFsdWUgIT0gb2xkVmFsdWUpIHsgLy8gRG8gTk9UIHVzZSBzdHJpY3QgaW5lcXVhbGl0eSAoIT09KVxuICAgICAgICAgICAgY29uc3Qgb2xkTGVuZ3RoID0gb2xkVmFsdWUgPj4+IDA7XG4gICAgICAgICAgICBjb25zdCBuZXdMZW5ndGggPSBuZXdWYWx1ZSA+Pj4gMDtcbiAgICAgICAgICAgIGNvbnN0IHN0b2NrID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmFwID0gbmV3TGVuZ3RoIDwgb2xkTGVuZ3RoICYmIHRhcmdldC5zbGljZShuZXdMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGlmIChzY3JhcCkgeyAvLyBuZXdMZW5ndGggPCBvbGRMZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IG9sZExlbmd0aDsgLS1pID49IG5ld0xlbmd0aDspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFtfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5SRU1PVkUsIGksIHVuZGVmaW5lZCwgc2NyYXBbaSAtIG5ld0xlbmd0aF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgICAgIC8vIG9sZExlbmd0aCA8IG5ld0xlbmd0aFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gb2xkTGVuZ3RoOyBpIDwgbmV3TGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFtfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGkgLyosIHVuZGVmaW5lZCwgdW5kZWZpbmVkICovKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcyk7XG4gICAgICAgICAgICByZXN1bHQgJiYgc3RvY2soKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSBpZiAobmV3VmFsdWUgIT09IG9sZFZhbHVlICYmIGlzVmFsaWRBcnJheUluZGV4KHApKSB7XG4gICAgICAgICAgICBjb25zdCBpID0gcCBhcyB1bmtub3duIGFzIG51bWJlciA+Pj4gMDtcbiAgICAgICAgICAgIGNvbnN0IHR5cGU6IEFycmF5Q2hhbmdlVHlwZSA9IE51bWJlcihpID49IHRhcmdldC5sZW5ndGgpOyAvLyBJTlNFUlQgb3IgVVBEQVRFXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcyk7XG4gICAgICAgICAgICByZXN1bHQgJiYgdGFyZ2V0W19zdG9ja0NoYW5nZV0odHlwZSwgaSwgbmV3VmFsdWUsIG9sZFZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHAsIGF0dHJpYnV0ZXMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBkZWxldGVQcm9wZXJ0eSh0YXJnZXQ6IEFjY2Vzc2libGU8T2JzZXJ2YWJsZUFycmF5LCBudW1iZXI+LCBwKSB7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGFyZ2V0W19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgPT09IGludGVybmFsLnN0YXRlIHx8IGludGVybmFsLmJ5TWV0aG9kIHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGFyZ2V0LCBwKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVsZXRlUHJvcGVydHkodGFyZ2V0LCBwKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtwXTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gUmVmbGVjdC5kZWxldGVQcm9wZXJ0eSh0YXJnZXQsIHApO1xuICAgICAgICByZXN1bHQgJiYgaXNWYWxpZEFycmF5SW5kZXgocCkgJiYgdGFyZ2V0W19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlVQREFURSwgcCBhcyB1bmtub3duIGFzIG51bWJlciA+Pj4gMCwgdW5kZWZpbmVkLCBvbGRWYWx1ZSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbn07XG5PYmplY3QuZnJlZXplKF9wcm94eUhhbmRsZXIpO1xuXG4vKiogQGludGVybmFsIHZhbGlkIGFycmF5IGluZGV4IGhlbHBlciAqL1xuZnVuY3Rpb24gaXNWYWxpZEFycmF5SW5kZXg8VD4oaW5kZXg6IFQpOiBib29sZWFuIHtcbiAgICBjb25zdCBzID0gU3RyaW5nKGluZGV4KTtcbiAgICBjb25zdCBuID0gTWF0aC50cnVuYyhzIGFzIHVua25vd24gYXMgbnVtYmVyKTtcbiAgICByZXR1cm4gU3RyaW5nKG4pID09PSBzICYmIDAgPD0gbiAmJiBuIDwgMHhGRkZGRkZGRjtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGluZGV4IG1hbmFnZW1lbnQgKi9cbmZ1bmN0aW9uIGZpbmRSZWxhdGVkQ2hhbmdlSW5kZXg8VD4ocmVjb3JkczogTXV0YWJsZUNoYW5nZVJlY29yZDxUPltdLCB0eXBlOiBBcnJheUNoYW5nZVR5cGUsIGluZGV4OiBudW1iZXIpOiBudW1iZXIge1xuICAgIGNvbnN0IGNoZWNrVHlwZSA9IHR5cGUgPT09IEFycmF5Q2hhbmdlVHlwZS5JTlNFUlRcbiAgICAgICAgPyAodDogQXJyYXlDaGFuZ2VUeXBlKSA9PiB0ID09PSBBcnJheUNoYW5nZVR5cGUuUkVNT1ZFXG4gICAgICAgIDogKHQ6IEFycmF5Q2hhbmdlVHlwZSkgPT4gdCAhPT0gQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRVxuICAgICAgICA7XG5cbiAgICBmb3IgKGxldCBpID0gcmVjb3Jkcy5sZW5ndGg7IC0taSA+PSAwOykge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHJlY29yZHNbaV07XG4gICAgICAgIGlmICh2YWx1ZS5pbmRleCA9PT0gaW5kZXggJiYgY2hlY2tUeXBlKHZhbHVlLnR5cGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZS5pbmRleCA8IGluZGV4ICYmIEJvb2xlYW4odmFsdWUudHlwZSkpIHsgLy8gUkVNT1ZFIG9yIElOU0VSVFxuICAgICAgICAgICAgaW5kZXggLT0gdmFsdWUudHlwZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgYXJyYXkgY2xhc3Mgd2hpY2ggY2hhbmdlIGNhbiBiZSBvYnNlcnZlZC5cbiAqIEBqYSDlpInmm7Tnm6Poppblj6/og73jgarphY3liJfjgq/jg6njgrlcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogLSBCYXNpYyBVc2FnZVxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBvYnNBcnJheSA9IE9ic2VydmFibGVBcnJheS5mcm9tKFsnYScsICdiJywgJ2MnXSk7XG4gKlxuICogZnVuY3Rpb24gb25DaGFuZ2VBcnJheShyZWNvcmRzOiBBcnJheUNoYW5nZVJlY29yZFtdKSB7XG4gKiAgIGNvbnNvbGUubG9nKHJlY29yZHMpO1xuICogICAvLyAgW1xuICogICAvLyAgICB7IHR5cGU6IDEsIGluZGV4OiAzLCBuZXdWYWx1ZTogJ3gnLCBvbGRWYWx1ZTogdW5kZWZpbmVkIH0sXG4gKiAgIC8vICAgIHsgdHlwZTogMSwgaW5kZXg6IDQsIG5ld1ZhbHVlOiAneScsIG9sZFZhbHVlOiB1bmRlZmluZWQgfSxcbiAqICAgLy8gICAgeyB0eXBlOiAxLCBpbmRleDogNSwgbmV3VmFsdWU6ICd6Jywgb2xkVmFsdWU6IHVuZGVmaW5lZCB9XG4gKiAgIC8vICBdXG4gKiB9XG4gKiBvYnNBcnJheS5vbihvbkNoYW5nZUFycmF5KTtcbiAqXG4gKiBmdW5jdGlvbiBhZGRYWVooKSB7XG4gKiAgIG9ic0FycmF5LnB1c2goJ3gnLCAneScsICd6Jyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIE9ic2VydmFibGVBcnJheTxUID0gdW5rbm93bj4gZXh0ZW5kcyBBcnJheTxUPiBpbXBsZW1lbnRzIElPYnNlcnZhYmxlIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWRlY2xhcmF0aW9uLW1lcmdpbmdcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX2ludGVybmFsXSE6IEludGVybmFsUHJvcHM8VD47XG5cbiAgICAvKiogQGZpbmFsIGNvbnN0cnVjdG9yICovXG4gICAgcHJpdmF0ZSBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAgICAgICAgdmVyaWZ5KCdpbnN0YW5jZU9mJywgT2JzZXJ2YWJsZUFycmF5LCB0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWw6IEludGVybmFsUHJvcHM8VD4gPSB7XG4gICAgICAgICAgICBzdGF0ZTogT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSxcbiAgICAgICAgICAgIGJ5TWV0aG9kOiBmYWxzZSxcbiAgICAgICAgICAgIHJlY29yZHM6IFtdLFxuICAgICAgICAgICAgaW5kZXhlczogbmV3IFNldCgpLFxuICAgICAgICAgICAgYnJva2VyOiBuZXcgRXZlbnRCcm9rZXJQcm94eTxJQXJyYXlDaGFuZ2VFdmVudDxUPj4oKSxcbiAgICAgICAgfTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIF9pbnRlcm5hbCwgeyB2YWx1ZTogT2JqZWN0LnNlYWwoaW50ZXJuYWwpIH0pO1xuICAgICAgICBjb25zdCBhcmdMZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBpZiAoMSA9PT0gYXJnTGVuZ3RoICYmIGlzTnVtYmVyKGFyZ3VtZW50c1swXSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGxlbiA9IGFyZ3VtZW50c1swXSA+Pj4gMDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLklOU0VSVCwgaSAvKiwgdW5kZWZpbmVkICovKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgwIDwgYXJnTGVuZ3RoKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ0xlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGksIGFyZ3VtZW50c1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eSh0aGlzLCBfcHJveHlIYW5kbGVyKSBhcyBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSU9ic2VydmFibGVcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgYXJyYXkgY2hhbmdlKHMpLlxuICAgICAqIEBqYSDphY3liJflpInmm7Tos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGFycmF5IGNoYW5nZS5cbiAgICAgKiAgLSBgamFgIOmFjeWIl+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uKGxpc3RlbmVyOiAocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSkgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzW19pbnRlcm5hbF0uYnJva2VyLmdldCgpLm9uKCdAJywgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBhcnJheSBjaGFuZ2UocykuXG4gICAgICogQGphIOmFjeWIl+WkieabtOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYXJyYXkgY2hhbmdlLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOmFjeWIl+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvZmYobGlzdGVuZXI/OiAocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSkgPT4gdW5rbm93bik6IHZvaWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uYnJva2VyLmdldCgpLm9mZignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3VzcGVuZCBvciBkaXNhYmxlIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44K144K544Oa44Oz44OJXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm9SZWNvcmRcbiAgICAgKiAgLSBgZW5gIGB0cnVlYDogbm90IHJlY29yZGluZyBwcm9wZXJ0eSBjaGFuZ2VzIGFuZCBjbGVhciBjaGFuZ2VzLiAvIGBmYWxzZWA6IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkIGFuZCBmaXJlZCB3aGVuIHtAbGluayByZXN1bWV9KCkgY2FsbGRlZC4gKGRlZmF1bHQpXG4gICAgICogIC0gYGphYCBgdHJ1ZWA6IOODl+ODreODkeODhuOCo+WkieabtOOCguiomOmMsuOBm+OBmiwg54++5Zyo44Gu6KiY6Yyy44KC56C05qOEIC8gYGZhbHNlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044Gv6KiY6Yyy44GV44KMLCB7QGxpbmsgcmVzdW1lfSgpIOaZguOBq+eZuueBq+OBmeOCiyAo5pei5a6aKVxuICAgICAqL1xuICAgIHN1c3BlbmQobm9SZWNvcmQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uc3RhdGUgPSBub1JlY29yZCA/IE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA6IE9ic2VydmFibGVTdGF0ZS5TVVNFUE5ERUQ7XG4gICAgICAgIGlmIChub1JlY29yZCkge1xuICAgICAgICAgICAgdGhpc1tfaW50ZXJuYWxdLnJlY29yZHMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzdW1lIG9mIHRoZSBldmVudCBzdWJzY3JpcHRpb24gc3RhdGUuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreeKtuaFi+OBruODquOCuOODpeODvOODoFxuICAgICAqL1xuICAgIHJlc3VtZSgpOiB0aGlzIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgaW50ZXJuYWwuc3RhdGUgPSBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHRoaXNbX25vdGlmeUNoYW5nZXNdKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBvYnNlcnZhdGlvbiBzdGF0ZVxuICAgICAqIEBqYSDos7zoqq3lj6/og73nirbmhYtcbiAgICAgKi9cbiAgICBnZXRPYnNlcnZhYmxlU3RhdGUoKTogT2JzZXJ2YWJsZVN0YXRlIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2ludGVybmFsXS5zdGF0ZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTogQXJyYXkgbWV0aG9kc1xuXG4gICAgLyoqXG4gICAgICogU29ydHMgYW4gYXJyYXkuXG4gICAgICogQHBhcmFtIGNvbXBhcmVGbiBUaGUgbmFtZSBvZiB0aGUgZnVuY3Rpb24gdXNlZCB0byBkZXRlcm1pbmUgdGhlIG9yZGVyIG9mIHRoZSBlbGVtZW50cy4gSWYgb21pdHRlZCwgdGhlIGVsZW1lbnRzIGFyZSBzb3J0ZWQgaW4gYXNjZW5kaW5nLCBBU0NJSSBjaGFyYWN0ZXIgb3JkZXIuXG4gICAgICovXG4gICAgc29ydChjb21wYXJhdG9yPzogKGxoczogVCwgcmhzOiBUKSA9PiBudW1iZXIpOiB0aGlzIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IG9sZCA9IEFycmF5LmZyb20odGhpcyk7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc3VwZXIuc29ydChjb21wYXJhdG9yKTtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSBmYWxzZTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGxlbiA9IG9sZC5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBvbGRbaV07XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSB0aGlzW2ldO1xuICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZSAhPT0gb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5VUERBVEUsIGksIG5ld1ZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBlbGVtZW50cyBmcm9tIGFuIGFycmF5IGFuZCwgaWYgbmVjZXNzYXJ5LCBpbnNlcnRzIG5ldyBlbGVtZW50cyBpbiB0aGVpciBwbGFjZSwgcmV0dXJuaW5nIHRoZSBkZWxldGVkIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSBzdGFydCBUaGUgemVyby1iYXNlZCBsb2NhdGlvbiBpbiB0aGUgYXJyYXkgZnJvbSB3aGljaCB0byBzdGFydCByZW1vdmluZyBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gZGVsZXRlQ291bnQgVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZW1vdmUuXG4gICAgICovXG4gICAgc3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50PzogbnVtYmVyKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgZWxlbWVudHMgZnJvbSBhbiBhcnJheSBhbmQsIGlmIG5lY2Vzc2FyeSwgaW5zZXJ0cyBuZXcgZWxlbWVudHMgaW4gdGhlaXIgcGxhY2UsIHJldHVybmluZyB0aGUgZGVsZXRlZCBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gc3RhcnQgVGhlIHplcm8tYmFzZWQgbG9jYXRpb24gaW4gdGhlIGFycmF5IGZyb20gd2hpY2ggdG8gc3RhcnQgcmVtb3ZpbmcgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIGRlbGV0ZUNvdW50IFRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmVtb3ZlLlxuICAgICAqIEBwYXJhbSBpdGVtcyBFbGVtZW50cyB0byBpbnNlcnQgaW50byB0aGUgYXJyYXkgaW4gcGxhY2Ugb2YgdGhlIGRlbGV0ZWQgZWxlbWVudHMuXG4gICAgICovXG4gICAgc3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50OiBudW1iZXIsIC4uLml0ZW1zOiBUW10pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgc3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50PzogbnVtYmVyLCAuLi5pdGVtczogVFtdKTogT2JzZXJ2YWJsZUFycmF5PFQ+IHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IG9sZExlbiA9IHRoaXMubGVuZ3RoO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IChzdXBlci5zcGxpY2UgYXMgVW5rbm93bkZ1bmN0aW9uKSguLi5hcmd1bWVudHMpIGFzIE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSBmYWxzZTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIHN0YXJ0ID0gTWF0aC50cnVuYyhzdGFydCk7XG4gICAgICAgICAgICBjb25zdCBmcm9tID0gc3RhcnQgPCAwID8gTWF0aC5tYXgob2xkTGVuICsgc3RhcnQsIDApIDogTWF0aC5taW4oc3RhcnQsIG9sZExlbik7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gcmVzdWx0Lmxlbmd0aDsgLS1pID49IDA7KSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5SRU1PVkUsIGZyb20gKyBpLCB1bmRlZmluZWQsIHJlc3VsdFtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBsZW4gPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGZyb20gKyBpLCBpdGVtc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIHRoZSBmaXJzdCBlbGVtZW50IGZyb20gYW4gYXJyYXkgYW5kIHJldHVybnMgaXQuXG4gICAgICovXG4gICAgc2hpZnQoKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCBvbGRMZW4gPSB0aGlzLmxlbmd0aDtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSB0cnVlO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzdXBlci5zaGlmdCgpO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IGZhbHNlO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSBpbnRlcm5hbC5zdGF0ZSAmJiB0aGlzLmxlbmd0aCA8IG9sZExlbikge1xuICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5SRU1PVkUsIDAsIHVuZGVmaW5lZCwgcmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluc2VydHMgbmV3IGVsZW1lbnRzIGF0IHRoZSBzdGFydCBvZiBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0gaXRlbXMgIEVsZW1lbnRzIHRvIGluc2VydCBhdCB0aGUgc3RhcnQgb2YgdGhlIEFycmF5LlxuICAgICAqL1xuICAgIHVuc2hpZnQoLi4uaXRlbXM6IFRbXSk6IG51bWJlciB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLnVuc2hpZnQoLi4uaXRlbXMpO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IGZhbHNlO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgbGVuID0gaXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuSU5TRVJULCBpLCBpdGVtc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxscyBhIGRlZmluZWQgY2FsbGJhY2sgZnVuY3Rpb24gb24gZWFjaCBlbGVtZW50IG9mIGFuIGFycmF5LCBhbmQgcmV0dXJucyBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIHRoZSByZXN1bHRzLlxuICAgICAqIEBwYXJhbSBjYWxsYmFja2ZuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIHVwIHRvIHRocmVlIGFyZ3VtZW50cy4gVGhlIG1hcCBtZXRob2QgY2FsbHMgdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24gb25lIHRpbWUgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgYXJyYXkuXG4gICAgICogQHBhcmFtIHRoaXNBcmcgQW4gb2JqZWN0IHRvIHdoaWNoIHRoZSB0aGlzIGtleXdvcmQgY2FuIHJlZmVyIGluIHRoZSBjYWxsYmFja2ZuIGZ1bmN0aW9uLiBJZiB0aGlzQXJnIGlzIG9taXR0ZWQsIHVuZGVmaW5lZCBpcyB1c2VkIGFzIHRoZSB0aGlzIHZhbHVlLlxuICAgICAqL1xuICAgIG1hcDxVPihjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUsIHRoaXNBcmc/OiB1bmtub3duKTogT2JzZXJ2YWJsZUFycmF5PFU+IHtcbiAgICAgICAgLypcbiAgICAgICAgICogW05PVEVdIG9yaWdpbmFsIGltcGxlbWVudCBpcyB2ZXJ5IHZlcnkgaGlnaC1jb3N0LlxuICAgICAgICAgKiAgICAgICAgc28gaXQncyBjb252ZXJ0ZWQgbmF0aXZlIEFycmF5IG9uY2UsIGFuZCByZXN0b3JlZC5cbiAgICAgICAgICpcbiAgICAgICAgICogcmV0dXJuIChzdXBlci5tYXAgYXMgVW5rbm93bkZ1bmN0aW9uKSguLi5hcmd1bWVudHMpO1xuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIE9ic2VydmFibGVBcnJheS5mcm9tKFsuLi50aGlzXS5tYXAoY2FsbGJhY2tmbiwgdGhpc0FyZykpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElPYnNlcnZhYmxlRXZlbnRCcm9rZXJBY2Nlc3NcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBnZXRCcm9rZXIoKTogRXZlbnRCcm9rZXI8SUFycmF5Q2hhbmdlRXZlbnQ8VD4+IHtcbiAgICAgICAgY29uc3QgeyBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgcmV0dXJuIGJyb2tlci5nZXQoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1laHRvZHM6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX3N0b2NrQ2hhbmdlXSh0eXBlOiBBcnJheUNoYW5nZVR5cGUsIGluZGV4OiBudW1iZXIsIG5ld1ZhbHVlPzogVCwgb2xkVmFsdWU/OiBUKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgc3RhdGUsIGluZGV4ZXMsIHJlY29yZHMgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY29uc3QgcmNpID0gaW5kZXhlcy5oYXMoaW5kZXgpID8gZmluZFJlbGF0ZWRDaGFuZ2VJbmRleChyZWNvcmRzLCB0eXBlLCBpbmRleCkgOiAtMTtcbiAgICAgICAgY29uc3QgbGVuID0gcmVjb3Jkcy5sZW5ndGg7XG4gICAgICAgIGlmIChyY2kgPj0gMCkge1xuICAgICAgICAgICAgY29uc3QgcmN0ID0gcmVjb3Jkc1tyY2ldLnR5cGU7XG4gICAgICAgICAgICBpZiAoIXJjdCAvKiBVUERBVEUgKi8pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcmV2UmVjb3JkID0gcmVjb3Jkcy5zcGxpY2UocmNpLCAxKVswXTtcbiAgICAgICAgICAgICAgICAvLyBVUERBVEUgPT4gVVBEQVRFIDogVVBEQVRFXG4gICAgICAgICAgICAgICAgLy8gVVBEQVRFID0+IFJFTU9WRSA6IElOU0VSVFxuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXSh0eXBlLCBpbmRleCwgbmV3VmFsdWUsIHByZXZSZWNvcmQub2xkVmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCByLCBpID0gbGVuOyAtLWkgPiByY2k7KSB7XG4gICAgICAgICAgICAgICAgICAgIHIgPSByZWNvcmRzW2ldO1xuICAgICAgICAgICAgICAgICAgICAoci5pbmRleCA+PSBpbmRleCkgJiYgKHIuaW5kZXggLT0gcmN0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgcHJldlJlY29yZCA9IHJlY29yZHMuc3BsaWNlKHJjaSwgMSlbMF07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGUgIT09IEFycmF5Q2hhbmdlVHlwZS5SRU1PVkUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSU5TRVJUID0+IFVQREFURSA6IElOU0VSVFxuICAgICAgICAgICAgICAgICAgICAvLyBSRU1PVkUgPT4gSU5TRVJUIDogVVBEQVRFXG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShOdW1iZXIoIXR5cGUpLCBpbmRleCwgbmV3VmFsdWUsIHByZXZSZWNvcmQub2xkVmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpbmRleGVzLmFkZChpbmRleCk7XG4gICAgICAgIHJlY29yZHNbbGVuXSA9IHsgdHlwZSwgaW5kZXgsIG5ld1ZhbHVlLCBvbGRWYWx1ZSB9O1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSA9PT0gc3RhdGUgJiYgMCA9PT0gbGVuKSB7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4gdGhpc1tfbm90aWZ5Q2hhbmdlc10oKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeUNoYW5nZXNdKCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCByZWNvcmRzIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFICE9PSBzdGF0ZSB8fCAwID09PSByZWNvcmRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgciBvZiByZWNvcmRzKSB7XG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKHIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXNbX25vdGlmeV0oT2JqZWN0LmZyZWV6ZShyZWNvcmRzKSBhcyBBcnJheUNoYW5nZVJlY29yZDxUPltdKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLnJlY29yZHMgPSBbXTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeV0ocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSk6IHZvaWQge1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaW50ZXJuYWwuaW5kZXhlcy5jbGVhcigpO1xuICAgICAgICBpbnRlcm5hbC5icm9rZXIuZ2V0KCkudHJpZ2dlcignQCcsIHJlY29yZHMpO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogT3ZlcnJpZGUgcmV0dXJuIHR5cGUgb2YgcHJvdG90eXBlIG1ldGhvZHNcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBPYnNlcnZhYmxlQXJyYXk8VD4ge1xuICAgIC8qKlxuICAgICAqIENvbWJpbmVzIHR3byBvciBtb3JlIGFycmF5cy5cbiAgICAgKiBAcGFyYW0gaXRlbXMgQWRkaXRpb25hbCBpdGVtcyB0byBhZGQgdG8gdGhlIGVuZCBvZiBhcnJheTEuXG4gICAgICovXG4gICAgY29uY2F0KC4uLml0ZW1zOiBUW11bXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBDb21iaW5lcyB0d28gb3IgbW9yZSBhcnJheXMuXG4gICAgICogQHBhcmFtIGl0ZW1zIEFkZGl0aW9uYWwgaXRlbXMgdG8gYWRkIHRvIHRoZSBlbmQgb2YgYXJyYXkxLlxuICAgICAqL1xuICAgIGNvbmNhdCguLi5pdGVtczogKFQgfCBUW10pW10pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogUmV2ZXJzZXMgdGhlIGVsZW1lbnRzIGluIGFuIEFycmF5LlxuICAgICAqL1xuICAgIHJldmVyc2UoKTogdGhpcztcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgc2VjdGlvbiBvZiBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0gc3RhcnQgVGhlIGJlZ2lubmluZyBvZiB0aGUgc3BlY2lmaWVkIHBvcnRpb24gb2YgdGhlIGFycmF5LlxuICAgICAqIEBwYXJhbSBlbmQgVGhlIGVuZCBvZiB0aGUgc3BlY2lmaWVkIHBvcnRpb24gb2YgdGhlIGFycmF5LlxuICAgICAqL1xuICAgIHNsaWNlKHN0YXJ0PzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZWxlbWVudHMgb2YgYW4gYXJyYXkgdGhhdCBtZWV0IHRoZSBjb25kaXRpb24gc3BlY2lmaWVkIGluIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIGNhbGxiYWNrZm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdXAgdG8gdGhyZWUgYXJndW1lbnRzLiBUaGUgZmlsdGVyIG1ldGhvZCBjYWxscyB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbiBvbmUgdGltZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBBbiBvYmplY3QgdG8gd2hpY2ggdGhlIHRoaXMga2V5d29yZCBjYW4gcmVmZXIgaW4gdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24uIElmIHRoaXNBcmcgaXMgb21pdHRlZCwgdW5kZWZpbmVkIGlzIHVzZWQgYXMgdGhlIHRoaXMgdmFsdWUuXG4gICAgICovXG4gICAgZmlsdGVyPFMgZXh0ZW5kcyBUPihjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHZhbHVlIGlzIFMsIHRoaXNBcmc/OiB1bmtub3duKTogT2JzZXJ2YWJsZUFycmF5PFM+O1xuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGVsZW1lbnRzIG9mIGFuIGFycmF5IHRoYXQgbWVldCB0aGUgY29uZGl0aW9uIHNwZWNpZmllZCBpbiBhIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqIEBwYXJhbSBjYWxsYmFja2ZuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIHVwIHRvIHRocmVlIGFyZ3VtZW50cy4gVGhlIGZpbHRlciBtZXRob2QgY2FsbHMgdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24gb25lIHRpbWUgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgYXJyYXkuXG4gICAgICogQHBhcmFtIHRoaXNBcmcgQW4gb2JqZWN0IHRvIHdoaWNoIHRoZSB0aGlzIGtleXdvcmQgY2FuIHJlZmVyIGluIHRoZSBjYWxsYmFja2ZuIGZ1bmN0aW9uLiBJZiB0aGlzQXJnIGlzIG9taXR0ZWQsIHVuZGVmaW5lZCBpcyB1c2VkIGFzIHRoZSB0aGlzIHZhbHVlLlxuICAgICAqL1xuICAgIGZpbHRlcihjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHVua25vd24sIHRoaXNBcmc/OiB1bmtub3duKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xufVxuXG4vKipcbiAqIE92ZXJyaWRlIHJldHVybiB0eXBlIG9mIHN0YXRpYyBtZXRob2RzXG4gKi9cbmV4cG9ydCBkZWNsYXJlIG5hbWVzcGFjZSBPYnNlcnZhYmxlQXJyYXkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvYmplY3QuXG4gICAgICogQHBhcmFtIGFycmF5TGlrZSBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZyb208VD4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4gfCBJdGVyYWJsZTxUPik6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvYmplY3QuXG4gICAgICogQHBhcmFtIGFycmF5TGlrZSBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSBtYXBmbiBBIG1hcHBpbmcgZnVuY3Rpb24gdG8gY2FsbCBvbiBldmVyeSBlbGVtZW50IG9mIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBWYWx1ZSBvZiAndGhpcycgdXNlZCB0byBpbnZva2UgdGhlIG1hcGZuLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZyb208VCwgVT4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4gfCBJdGVyYWJsZTxUPiwgbWFwZm46ICh0aGlzOiB2b2lkLCB2OiBULCBrOiBudW1iZXIpID0+IFUsIHRoaXNBcmc/OiB1bmRlZmluZWQpOiBPYnNlcnZhYmxlQXJyYXk8VT47XG4gICAgZnVuY3Rpb24gZnJvbTxYLCBULCBVPihhcnJheUxpa2U6IEFycmF5TGlrZTxUPiB8IEl0ZXJhYmxlPFQ+LCBtYXBmbjogKHRoaXM6IFgsIHY6IFQsIGs6IG51bWJlcikgPT4gVSwgdGhpc0FyZzogWCk6IE9ic2VydmFibGVBcnJheTxVPjtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgbmV3IGFycmF5IGZyb20gYSBzZXQgb2YgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIGl0ZW1zIEEgc2V0IG9mIGVsZW1lbnRzIHRvIGluY2x1ZGUgaW4gdGhlIG5ldyBhcnJheSBvYmplY3QuXG4gICAgICovXG4gICAgZnVuY3Rpb24gb2Y8VD4oLi4uaXRlbXM6IFRbXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgbm8taW5uZXItZGVjbGFyYXRpb25zLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1kdXBsaWNhdGUtZW51bS12YWx1ZXMsXG4gKi9cblxuLypcbiAqIE5PVEU6IOWGhemDqOODouOCuOODpeODvOODq+OBqyBgQ0RQYCBuYW1lc3BhY2Ug44KS5L2/55So44GX44Gm44GX44G+44GG44GoLCDlpJbpg6jjg6Ljgrjjg6Xjg7zjg6vjgafjga/lrqPoqIDjgafjgY3jgarjgY/jgarjgosuXG4gKiBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzk2MTFcbiAqL1xubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDb25zdGFudCBkZWZpbml0aW9uIGFib3V0IHJhbmdlIG9mIHRoZSByZXN1bHQgY29kZS5cbiAgICAgKiBAamEg44Oq44K244Or44OI44Kz44O844OJ44Gu56+E5Zuy44Gr6Zai44GZ44KL5a6a5pWw5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGNvbnN0IGVudW0gUkVTVUxUX0NPREVfUkFOR0Uge1xuICAgICAgICAvKipcbiAgICAgICAgICogQGVuIFRoZSBhc3NpZ25hYmxlIHJhbmdlIGZvciB0aGUgY2xpZW50J3MgbG9jYWwgcmVzdWx0IGNvcmQgYnkgd2hpY2ggZXhwYW5zaW9uIGlzIHBvc3NpYmxlLlxuICAgICAgICAgKiBAamEg44Kv44Op44Kk44Ki44Oz44OI44GM5ouh5by15Y+v6IO944Gq44Ot44O844Kr44Or44Oq44K244Or44OI44Kz44O844OJ44Gu44Ki44K144Kk44Oz5Y+v6IO96aCY5Z+fXG4gICAgICAgICAqL1xuICAgICAgICBNQVggPSAxMDAwLFxuICAgICAgICAvKipcbiAgICAgICAgICogQGVuIFJlc2VydmVkIHJhbmdlIG9mIGZyYW1ld29yay5cbiAgICAgICAgICogQGphIOODleODrOODvOODoOODr+ODvOOCr+OBruS6iOe0hOmgmOWfn1xuICAgICAgICAgKi9cbiAgICAgICAgUkVTRVJWRUQgPSAxMDAwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgYXNzaWdubWVudCByYW5nZSBndWlkZWxpbmUgZGVmaW5pdGlvbiB1c2VkIGluIHRoZSBtb2R1bGUuXG4gICAgICogQGphIOODouOCuOODpeODvOODq+WGheOBp+S9v+eUqOOBmeOCi+OCouOCteOCpOODs+mgmOWfn+OCrOOCpOODieODqeOCpOODs+WumuaVsOWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBjb25zdCBlbnVtIExPQ0FMX0NPREVfUkFOR0VfR1VJREUge1xuICAgICAgICAvKipcbiAgICAgICAgICogQGVuIFRoZSBhc3NpZ25tZW50IHJhbmdlIGd1aWRlbGluZSBwZXIgMSBtb2R1bGUuXG4gICAgICAgICAqIEBqYSAx44Oi44K444Ol44O844Or5b2T44Gf44KK44Gr5Ymy44KK5b2T44Gm44KL44Ki44K144Kk44Oz6aCY5Z+f44Ks44Kk44OJ44Op44Kk44OzXG4gICAgICAgICAqL1xuICAgICAgICBNT0RVTEUgPSAxMDAsXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gVGhlIGFzc2lnbm1lbnQgcmFuZ2UgZ3VpZGVsaW5lIHBlciAxIGZ1bmN0aW9uLlxuICAgICAgICAgKiBAamEgMeapn+iDveW9k+OBn+OCiuOBq+WJsuOCiuW9k+OBpuOCi+OCouOCteOCpOODs+mgmOWfn+OCrOOCpOODieODqeOCpOODs1xuICAgICAgICAgKi9cbiAgICAgICAgRlVOQ1RJT04gPSAyMCxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gT2Zmc2V0IHZhbHVlIGVudW1lcmF0aW9uIGZvciB7QGxpbmsgUkVTVUxUX0NPREV9LiA8YnI+XG4gICAgICogICAgIFRoZSBjbGllbnQgY2FuIGV4cGFuZCBhIGRlZmluaXRpb24gaW4gb3RoZXIgbW9kdWxlLlxuICAgICAqIEBqYSB7QGxpbmsgUkVTVUxUX0NPREV9IOOBruOCquODleOCu+ODg+ODiOWApCA8YnI+XG4gICAgICogICAgIOOCqOODqeODvOOCs+ODvOODieWvvuW/nOOBmeOCi+ODouOCuOODpeODvOODq+WGheOBpyDlrprnvqnjgpLmi6HlvLXjgZnjgosuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICogICAgICBDT01NT04gICAgICA9IDAsXG4gICAgICogICAgICBTT01FTU9EVUxFICA9IDEgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgICAqICAgICAgU09NRU1PRFVMRTIgPSAyICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICAgKiAgfVxuICAgICAqXG4gICAgICogIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgKiAgICAgIFNPTUVNT0RVTEVfREVDTEFSRSAgICAgICAgICAgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsIC8vIGZvciBhdm9pZCBUUzI0MzIuXG4gICAgICogICAgICBFUlJPUl9TT01FTU9EVUxFX1VORVhQRUNURUQgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuU09NRU1PRFVMRSwgTE9DQUxfQ09ERV9CQVNFLlNPTUVNT0RVTEUgKyAxLCBcImVycm9yIHVuZXhwZWN0ZWQuXCIpLFxuICAgICAqICAgICAgRVJST1JfU09NRU1PRFVMRV9JTlZBTElEX0FSRyA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLlNPTUVNT0RVTEUsIExPQ0FMX0NPREVfQkFTRS5TT01FTU9EVUxFICsgMiwgXCJpbnZhbGlkIGFyZ3VtZW50cy5cIiksXG4gICAgICogIH1cbiAgICAgKiAgQVNTSUdOX1JFU1VMVF9DT0RFKFJFU1VMVF9DT0RFKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBleHBvcnQgY29uc3QgZW51bSBSRVNVTFRfQ09ERV9CQVNFIHtcbiAgICAgICAgREVDTEFSRSA9IDkwMDcxOTkyNTQ3NDA5OTEsIC8vIE51bWJlci5NQVhfU0FGRV9JTlRFR0VSXG4gICAgICAgIENPTU1PTiAgPSAwLFxuICAgICAgICBDRFAgICAgID0gMSAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuTU9EVUxFLCAvLyBjZHAgcmVzZXJ2ZWQuIGFicygwIO+9niAxMDAwKVxuLy8gICAgICBNT0RVTEVfQSA9IDEgKiBSRVNVTFRfQ09ERV9SQU5HRS5NQVgsICAgIC8vIGV4KSBtb2R1bGVBOiBhYnMoMTAwMSDvvZ4gMTk5OSlcbi8vICAgICAgTU9EVUxFX0IgPSAyICogUkVTVUxUX0NPREVfUkFOR0UuTUFYLCAgICAvLyBleCkgbW9kdWxlQjogYWJzKDIwMDEg772eIDI5OTkpXG4vLyAgICAgIE1PRFVMRV9DID0gMyAqIFJFU1VMVF9DT0RFX1JBTkdFLk1BWCwgICAgLy8gZXgpIG1vZHVsZUM6IGFicygzMDAxIO+9niAzOTk5KVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBLbm93biBDRFAgbW9kdWxlIG9mZmVzdCBkZWZpbml0aW9uLlxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgosgQ0RQIOODouOCuOODpeODvOODq+OBruOCquODleOCu+ODg+ODiOWumue+qVxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICogICAgQUpBWCA9IENEUF9LTk9XTl9NT0RVTEUuQUpBWCAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgICogfVxuICAgICAqXG4gICAgICogZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAqICAgQUpBWF9ERUNMQVJFICAgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgKiAgIEVSUk9SX0FKQVhfUkVTUE9OU0UgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMSwgJ25ldHdvcmsgZXJyb3IuJyksXG4gICAgICogICBFUlJPUl9BSkFYX1RJTUVPVVQgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQUpBWCArIDIsICdyZXF1ZXN0IHRpbWVvdXQuJyksXG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGV4cG9ydCBjb25zdCBlbnVtIENEUF9LTk9XTl9NT0RVTEUge1xuICAgICAgICAvKiogYEBjZHAvYWpheGAgKi9cbiAgICAgICAgQUpBWCA9IDEsXG4gICAgICAgIC8qKiBgQGNkcC9pMThuYCAqL1xuICAgICAgICBJMThOID0gMixcbiAgICAgICAgLyoqIGBAY2RwL2RhdGEtc3luY2AsIGBAY2RwL21vZGVsYCwgYEBjZHAvY29sbGVjdGlvbmAsIGBAY2RwL3ZpZXdgLCBgQGNkcC9yb3V0ZXJgICovXG4gICAgICAgIE1WQyAgPSAzLFxuICAgICAgICAvKiogYEBjZHAvYXBwYCAqL1xuICAgICAgICBBUFAgID0gNCxcbiAgICAgICAgLyoqIG9mZnNldCBmb3IgdW5rbm93biBtb2R1bGUgKi9cbiAgICAgICAgT0ZGU0VULFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDb21tb24gcmVzdWx0IGNvZGUgZm9yIHRoZSBhcHBsaWNhdGlvbi5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz5YWo5L2T44Gn5L2/55So44GZ44KL5YWx6YCa44Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIHN1Y2Nlc3MgY29kZSAgICAgICAgICAgICA8YnI+IGBqYWAg5rGO55So5oiQ5Yqf44Kz44O844OJICAgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICBTVUNDRVNTID0gMCxcbiAgICAgICAgLyoqIGBlbmAgZ2VuZXJhbCBjYW5jZWwgY29kZSAgICAgICAgICAgICAgPGJyPiBgamFgIOaxjueUqOOCreODo+ODs+OCu+ODq+OCs+ODvOODiSAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgQUJPUlQgPSAxLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIHBlbmRpbmcgY29kZSAgICAgICAgICAgICA8YnI+IGBqYWAg5rGO55So44Kq44Oa44Os44O844K344On44Oz5pyq5a6f6KGM44Ko44Op44O844Kz44O844OJICovXG4gICAgICAgIFBFTkRJTkcgPSAyLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIHN1Y2Nlc3MgYnV0IG5vb3AgY29kZSAgICA8YnI+IGBqYWAg5rGO55So5a6f6KGM5LiN6KaB44Kz44O844OJICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgIE5PT1AgPSAzLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIGVycm9yIGNvZGUgICAgICAgICAgICAgICA8YnI+IGBqYWAg5rGO55So44Ko44Op44O844Kz44O844OJICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgRkFJTCA9IC0xLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIGZhdGFsIGVycm9yIGNvZGUgICAgICAgICA8YnI+IGBqYWAg5rGO55So6Ie05ZG955qE44Ko44Op44O844Kz44O844OJICAgICAgICAgICAgICAgKi9cbiAgICAgICAgRkFUQUwgPSAtMixcbiAgICAgICAgLyoqIGBlbmAgZ2VuZXJhbCBub3Qgc3VwcG9ydGVkIGVycm9yIGNvZGUgPGJyPiBgamFgIOaxjueUqOOCquODmuODrOODvOOCt+ODp+ODs+OCqOODqeODvOOCs+ODvOODiSAgICAgICAqL1xuICAgICAgICBOT1RfU1VQUE9SVEVEID0gLTMsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFzc2lnbiBkZWNsYXJlZCB7QGxpbmsgUkVTVUxUX0NPREV9IHRvIHJvb3QgZW51bWVyYXRpb24uXG4gICAgICogICAgIChJdCdzIGVuYWJsZSB0byBtZXJnZSBlbnVtIGluIHRoZSBtb2R1bGUgc3lzdGVtIGVudmlyb25tZW50LilcbiAgICAgKiBAamEg5ouh5by144GX44GfIHtAbGluayBSRVNVTFRfQ09ERX0g44KSIOODq+ODvOODiCBlbnVtIOOBq+OCouOCteOCpOODs1xuICAgICAqICAgICDjg6Ljgrjjg6Xjg7zjg6vjgrfjgrnjg4bjg6DnkrDlooPjgavjgYrjgYTjgabjgoLjgIFlbnVtIOOCkuODnuODvOOCuOOCkuWPr+iDveOBq+OBmeOCi1xuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBBU1NJR05fUkVTVUxUX0NPREUoZXh0ZW5kOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgICAgICBPYmplY3QuYXNzaWduKFJFU1VMVF9DT0RFLCBleHRlbmQpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBjb25zdCBfY29kZTJtZXNzYWdlOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICAnMCc6ICdvcGVyYXRpb24gc3VjY2VlZGVkLicsXG4gICAgICAgICcxJzogJ29wZXJhdGlvbiBhYm9ydGVkLicsXG4gICAgICAgICcyJzogJ29wZXJhdGlvbiBwZW5kaW5nLicsXG4gICAgICAgICczJzogJ25vIG9wZXJhdGlvbi4nLFxuICAgICAgICAnLTEnOiAnb3BlcmF0aW9uIGZhaWxlZC4nLFxuICAgICAgICAnLTInOiAndW5leHBlY3RlZCBlcnJvciBvY2N1cmVkLicsXG4gICAgICAgICctMyc6ICdvcGVyYXRpb24gbm90IHN1cHBvcnRlZC4nLFxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIGVycm9yIG1lc3NhZ2UgbWFwLlxuICAgICAqIEBqYSDjgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrjjg57jg4Pjg5fjga7lj5blvpdcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gRVJST1JfTUVTU0FHRV9NQVAoKTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB7XG4gICAgICAgIHJldHVybiBfY29kZTJtZXNzYWdlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZW5lcmF0ZSBzdWNjZXNzIGNvZGUuXG4gICAgICogQGphIOaIkOWKn+OCs+ODvOODieOCkueUn+aIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGJhc2VcbiAgICAgKiAgLSBgZW5gIHNldCBiYXNlIG9mZnNldCBhcyB7QGxpbmsgUkVTVUxUX0NPREVfQkFTRX1cbiAgICAgKiAgLSBgamFgIOOCquODleOCu+ODg+ODiOWApOOCkiB7QGxpbmsgUkVTVUxUX0NPREVfQkFTRX0g44Go44GX44Gm5oyH5a6aXG4gICAgICogQHBhcmFtIGNvZGVcbiAgICAgKiAgLSBgZW5gIHNldCBsb2NhbCBjb2RlIGZvciBkZWNsYXJhdGlvbi4gZXgpICcxJ1xuICAgICAqICAtIGBqYWAg5a6j6KiA55So44Gu44Ot44O844Kr44Or44Kz44O844OJ5YCk44KS5oyH5a6aICDkvospICcxJ1xuICAgICAqIEBwYXJhbSBtZXNzYWdlXG4gICAgICogIC0gYGVuYCBzZXQgZXJyb3IgbWVzc2FnZSBmb3IgaGVscCBzdHJpbmcuXG4gICAgICogIC0gYGphYCDjg5jjg6vjg5fjgrnjg4jjg6rjg7PjgrDnlKjjgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrjjgpLmjIflrppcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gREVDTEFSRV9TVUNDRVNTX0NPREUoYmFzZTogUkVTVUxUX0NPREVfQkFTRSwgY29kZTogbnVtYmVyLCBtZXNzYWdlPzogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIGRlY2xhcmVSZXN1bHRDb2RlKGJhc2UsIGNvZGUsIG1lc3NhZ2UsIHRydWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZW5lcmF0ZSBlcnJvciBjb2RlLlxuICAgICAqIEBqYSDjgqjjg6njg7zjgrPjg7zjg4nnlJ/miJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBiYXNlXG4gICAgICogIC0gYGVuYCBzZXQgYmFzZSBvZmZzZXQgYXMge0BsaW5rIFJFU1VMVF9DT0RFX0JBU0V9XG4gICAgICogIC0gYGphYCDjgqrjg5Xjgrvjg4Pjg4jlgKTjgpIge0BsaW5rIFJFU1VMVF9DT0RFX0JBU0V9IOOBqOOBl+OBpuaMh+WumlxuICAgICAqIEBwYXJhbSBjb2RlXG4gICAgICogIC0gYGVuYCBzZXQgbG9jYWwgY29kZSBmb3IgZGVjbGFyYXRpb24uIGV4KSAnMSdcbiAgICAgKiAgLSBgamFgIOWuo+iogOeUqOOBruODreODvOOCq+ODq+OCs+ODvOODieWApOOCkuaMh+WumiAg5L6LKSAnMSdcbiAgICAgKiBAcGFyYW0gbWVzc2FnZVxuICAgICAqICAtIGBlbmAgc2V0IGVycm9yIG1lc3NhZ2UgZm9yIGhlbHAgc3RyaW5nLlxuICAgICAqICAtIGBqYWAg44OY44Or44OX44K544OI44Oq44Oz44Kw55So44Ko44Op44O844Oh44OD44K744O844K444KS5oyH5a6aXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIERFQ0xBUkVfRVJST1JfQ09ERShiYXNlOiBSRVNVTFRfQ09ERV9CQVNFLCBjb2RlOiBudW1iZXIsIG1lc3NhZ2U/OiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gZGVjbGFyZVJlc3VsdENvZGUoYmFzZSwgY29kZSwgbWVzc2FnZSwgZmFsc2UpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgc2VjdGlvbjpcblxuICAgIC8qKiBAaW50ZXJuYWwgcmVnaXN0ZXIgZm9yIHtAbGluayBSRVNVTFRfQ09ERX0gKi9cbiAgICBmdW5jdGlvbiBkZWNsYXJlUmVzdWx0Q29kZShiYXNlOiBSRVNVTFRfQ09ERV9CQVNFLCBjb2RlOiBudW1iZXIsIG1lc3NhZ2U6IHN0cmluZyB8IHVuZGVmaW5lZCwgc3VjY2VlZGVkOiBib29sZWFuKTogbnVtYmVyIHwgbmV2ZXIge1xuICAgICAgICBpZiAoY29kZSA8IDAgfHwgUkVTVUxUX0NPREVfUkFOR0UuTUFYIDw9IGNvZGUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKGBkZWNsYXJlUmVzdWx0Q29kZSgpLCBpbnZhbGlkIGxvY2FsLWNvZGUgcmFuZ2UuIFtjb2RlOiAke2NvZGV9XWApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNpZ25lZCA9IHN1Y2NlZWRlZCA/IDEgOiAtMTtcbiAgICAgICAgY29uc3QgcmVzdWx0Q29kZSA9IHNpZ25lZCAqIChiYXNlIGFzIG51bWJlciArIGNvZGUpO1xuICAgICAgICBfY29kZTJtZXNzYWdlW3Jlc3VsdENvZGVdID0gbWVzc2FnZSA/IG1lc3NhZ2UgOiAoYFtDT0RFOiAke3Jlc3VsdENvZGV9XWApO1xuICAgICAgICByZXR1cm4gcmVzdWx0Q29kZTtcbiAgICB9XG59XG4iLCJpbXBvcnQgUkVTVUxUX0NPREUgICAgICAgICAgICAgID0gQ0RQX0RFQ0xBUkUuUkVTVUxUX0NPREU7XG5pbXBvcnQgUkVTVUxUX0NPREVfQkFTRSAgICAgICAgID0gQ0RQX0RFQ0xBUkUuUkVTVUxUX0NPREVfQkFTRTtcbmltcG9ydCBSRVNVTFRfQ09ERV9SQU5HRSAgICAgICAgPSBDRFBfREVDTEFSRS5SRVNVTFRfQ09ERV9SQU5HRTtcbmltcG9ydCBMT0NBTF9DT0RFX1JBTkdFX0dVSURFICAgPSBDRFBfREVDTEFSRS5MT0NBTF9DT0RFX1JBTkdFX0dVSURFO1xuaW1wb3J0IERFQ0xBUkVfU1VDQ0VTU19DT0RFICAgICA9IENEUF9ERUNMQVJFLkRFQ0xBUkVfU1VDQ0VTU19DT0RFO1xuaW1wb3J0IERFQ0xBUkVfRVJST1JfQ09ERSAgICAgICA9IENEUF9ERUNMQVJFLkRFQ0xBUkVfRVJST1JfQ09ERTtcbmltcG9ydCBBU1NJR05fUkVTVUxUX0NPREUgICAgICAgPSBDRFBfREVDTEFSRS5BU1NJR05fUkVTVUxUX0NPREU7XG5pbXBvcnQgRVJST1JfTUVTU0FHRV9NQVAgICAgICAgID0gQ0RQX0RFQ0xBUkUuRVJST1JfTUVTU0FHRV9NQVA7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gRGVzY3JpcHRpb24ge1xuICAgIFVOS05PV05fRVJST1JfTkFNRSA9J1VOS05PV04nLFxufVxuXG5leHBvcnQge1xuICAgIFJFU1VMVF9DT0RFLFxuICAgIFJFU1VMVF9DT0RFX0JBU0UsXG4gICAgUkVTVUxUX0NPREVfUkFOR0UsXG4gICAgTE9DQUxfQ09ERV9SQU5HRV9HVUlERSxcbiAgICBERUNMQVJFX1NVQ0NFU1NfQ09ERSxcbiAgICBERUNMQVJFX0VSUk9SX0NPREUsXG4gICAgQVNTSUdOX1JFU1VMVF9DT0RFLFxufTtcblxuLyoqXG4gKiBAZW4gSnVkZ2UgZmFpbCBvciBub3QuXG4gKiBAamEg5aSx5pWX5Yik5a6aXG4gKlxuICogQHBhcmFtIGNvZGUge0BsaW5rIFJFU1VMVF9DT0RFfVxuICogQHJldHVybnMgdHJ1ZTogZmFpbCByZXN1bHQgLyBmYWxzZTogc3VjY2VzcyByZXN1bHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIEZBSUxFRChjb2RlOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gY29kZSA8IDA7XG59XG5cbi8qKlxuICogQGVuIEp1ZGdlIHN1Y2Nlc3Mgb3Igbm90LlxuICogQGphIOaIkOWKn+WIpOWumlxuICpcbiAqIEBwYXJhbSBjb2RlIHtAbGluayBSRVNVTFRfQ09ERX1cbiAqIEByZXR1cm5zIHRydWU6IHN1Y2Nlc3MgcmVzdWx0IC8gZmFsc2U6IGZhaWwgcmVzdWx0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBTVUNDRUVERUQoY29kZTogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICFGQUlMRUQoY29kZSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8ge0BsaW5rIFJFU1VMVF9DT0RFfSBgbmFtZWAgc3RyaW5nIGZyb20ge0BsaW5rIFJFU1VMVF9DT0RFfS5cbiAqIEBqYSB7QGxpbmsgUkVTVUxUX0NPREV9IOOCkiB7QGxpbmsgUkVTVUxUX0NPREV9IOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBjb2RlIHtAbGluayBSRVNVTFRfQ09ERX1cbiAqIEBwYXJhbSB0YWcgIGN1c3RvbSB0YWcgaWYgbmVlZGVkLlxuICogQHJldHVybnMgbmFtZSBzdHJpbmcgZXgpIFwiW3RhZ11bTk9UX1NVUFBPUlRFRF1cIlxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9OYW1lU3RyaW5nKGNvZGU6IG51bWJlciwgdGFnPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBwcmVmaXggPSB0YWcgPyBgWyR7dGFnfV1gIDogJyc7XG4gICAgaWYgKFJFU1VMVF9DT0RFW2NvZGVdKSB7XG4gICAgICAgIHJldHVybiBgJHtwcmVmaXh9WyR7UkVTVUxUX0NPREVbY29kZV19XWA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGAke3ByZWZpeH1bJHtEZXNjcmlwdGlvbi5VTktOT1dOX0VSUk9SX05BTUV9XWA7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGhlbHAgc3RyaW5nIGZyb20ge0BsaW5rIFJFU1VMVF9DT0RFfS5cbiAqIEBqYSB7QGxpbmsgUkVTVUxUX0NPREV9IOOCkuODmOODq+ODl+OCueODiOODquODs+OCsOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBjb2RlIHtAbGluayBSRVNVTFRfQ09ERX1cbiAqIEByZXR1cm5zIHJlZ2lzdGVyZWQgaGVscCBzdHJpbmdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvSGVscFN0cmluZyhjb2RlOiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IG1hcCA9IEVSUk9SX01FU1NBR0VfTUFQKCk7XG4gICAgaWYgKG1hcFtjb2RlXSkge1xuICAgICAgICByZXR1cm4gbWFwW2NvZGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBgdW5yZWdpc3RlcmVkIHJlc3VsdCBjb2RlLiBbY29kZTogJHtjb2RlfV1gO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgY2xhc3NOYW1lLFxuICAgIGlzTnVsbGlzaCxcbiAgICBpc1N0cmluZyxcbiAgICBpc0NhbmNlbExpa2VFcnJvcixcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgUkVTVUxUX0NPREUsXG4gICAgU1VDQ0VFREVELFxuICAgIEZBSUxFRCxcbiAgICB0b05hbWVTdHJpbmcsXG4gICAgdG9IZWxwU3RyaW5nLFxufSBmcm9tICcuL3Jlc3VsdC1jb2RlJztcblxuY29uc3Qge1xuICAgIC8qKiBAaW50ZXJuYWwgKi8gaXNGaW5pdGU6IGlzTnVtYmVyXG59ID0gTnVtYmVyO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIFRhZyB7XG4gICAgRVJST1IgID0gJ0Vycm9yJyxcbiAgICBSRVNVTFQgPSAnUmVzdWx0Jyxcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZGVzYyA9ICh2YWx1ZTogdW5rbm93bik6IFByb3BlcnR5RGVzY3JpcHRvciA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICB2YWx1ZSxcbiAgICB9O1xufTtcblxuLyoqXG4gKiBAZW4gQSByZXN1bHQgaG9sZGVyIGNsYXNzLiA8YnI+XG4gKiAgICAgRGVyaXZlZCBuYXRpdmUgYEVycm9yYCBjbGFzcy5cbiAqIEBqYSDlh6bnkIbntZDmnpzkvJ3pgZTjgq/jg6njgrkgPGJyPlxuICogICAgIOODjeOCpOODhuOCo+ODliBgRXJyb3JgIOOBrua0vueUn+OCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgUmVzdWx0IGV4dGVuZHMgRXJyb3Ige1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb2RlXG4gICAgICogIC0gYGVuYCByZXN1bHQgY29kZVxuICAgICAqICAtIGBqYWAg57WQ5p6c44Kz44O844OJXG4gICAgICogQHBhcmFtIG1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIHJlc3VsdCBpbmZvIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOe1kOaenOaDheWgseODoeODg+OCu+ODvOOCuFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBlcnJvciBjb25zdHJ1Y3Rpb24gb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44Ko44Op44O85qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29kZT86IG51bWJlciwgbWVzc2FnZT86IHN0cmluZywgb3B0aW9ucz86IEVycm9yT3B0aW9ucykge1xuICAgICAgICBjb2RlID0gaXNOdWxsaXNoKGNvZGUpID8gUkVTVUxUX0NPREUuU1VDQ0VTUyA6IGlzTnVtYmVyKGNvZGUpID8gTWF0aC50cnVuYyhjb2RlKSA6IFJFU1VMVF9DT0RFLkZBSUw7XG4gICAgICAgIHN1cGVyKG1lc3NhZ2UgPz8gdG9IZWxwU3RyaW5nKGNvZGUpLCBvcHRpb25zKTtcbiAgICAgICAgY29uc3QgY2F1c2UgPSBvcHRpb25zPy5jYXVzZTtcbiAgICAgICAgbGV0IHRpbWUgPSBpc0Vycm9yKGNhdXNlKSA/IChjYXVzZSBhcyBSZXN1bHQpLnRpbWUgOiB1bmRlZmluZWQ7XG4gICAgICAgIGlzTnVtYmVyKHRpbWUhKSB8fCAodGltZSA9IERhdGUubm93KCkpO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7IGNvZGU6IGRlc2MoY29kZSksIHRpbWU6IGRlc2ModGltZSksIGNhdXNlOiBkZXNjKGNhdXNlKSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4ge0BsaW5rIFJFU1VMVF9DT0RFfSB2YWx1ZS5cbiAgICAgKiBAamEge0BsaW5rIFJFU1VMVF9DT0RFfSDjga7lgKRcbiAgICAgKi9cbiAgICByZWFkb25seSBjb2RlITogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdlbmVyYXRlZCB0aW1lIGluZm9ybWF0aW9uLlxuICAgICAqIEBqYSDnlJ/miJDjgZXjgozjgZ/mmYLliLvmg4XloLFcbiAgICAgKi9cbiAgICByZWFkb25seSB0aW1lITogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFN0b2NrIGxvdy1sZXZlbCBlcnJvciBpbmZvcm1hdGlvbi5cbiAgICAgKiBAamEg5LiL5L2N44Gu44Ko44Op44O85oOF5aCx44KS5qC857SNXG4gICAgICovXG4gICAgcmVhZG9ubHkgY2F1c2U/OiB1bmtub3duO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEp1ZGdlIHN1Y2NlZWRlZCBvciBub3QuXG4gICAgICogQGphIOaIkOWKn+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc1N1Y2NlZWRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFNVQ0NFRURFRCh0aGlzLmNvZGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBmYWlsZWQgb3Igbm90LlxuICAgICAqIEBqYSDlpLHmlZfliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNGYWlsZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBGQUlMRUQodGhpcy5jb2RlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2UgY2FuY2VsZWQgb3Igbm90LlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjgqjjg6njg7zliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNDYW5jZWxlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29kZSA9PT0gUkVTVUxUX0NPREUuQUJPUlQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBmb3JtYXR0ZWQge0BsaW5rIFJFU1VMVF9DT0RFfSBuYW1lIHN0cmluZy5cbiAgICAgKiBAamEg44OV44Kp44O844Oe44OD44OI44GV44KM44GfIHtAbGluayBSRVNVTFRfQ09ERX0g5ZCN5paH5a2X5YiX44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGNvZGVOYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0b05hbWVTdHJpbmcodGhpcy5jb2RlLCB0aGlzLm5hbWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQge0BsaW5rIFJFU1VMVF9DT0RFfSBoZWxwIHN0cmluZy5cbiAgICAgKiBAamEge0BsaW5rIFJFU1VMVF9DT0RFfSDjga7jg5jjg6vjg5fjgrnjg4jjg6rjg7PjgrDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaGVscCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdG9IZWxwU3RyaW5nKHRoaXMuY29kZSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6IFRhZy5SRVNVTFQge1xuICAgICAgICByZXR1cm4gVGFnLlJFU1VMVDtcbiAgICB9XG59XG5cblJlc3VsdC5wcm90b3R5cGUubmFtZSA9IFRhZy5SRVNVTFQ7XG5cbi8qKiBAaW50ZXJuYSBsUmV0dXJucyBgdHJ1ZWAgaWYgYHhgIGlzIGBFcnJvcmAsIGBmYWxzZWAgb3RoZXJ3aXNlLiAqL1xuZnVuY3Rpb24gaXNFcnJvcih4OiB1bmtub3duKTogeCBpcyBFcnJvciB7XG4gICAgcmV0dXJuIHggaW5zdGFuY2VvZiBFcnJvciB8fCBjbGFzc05hbWUoeCkgPT09IFRhZy5FUlJPUjtcbn1cblxuLyoqIFJldHVybnMgYHRydWVgIGlmIGB4YCBpcyBgUmVzdWx0YCwgYGZhbHNlYCBvdGhlcndpc2UuICovXG5leHBvcnQgZnVuY3Rpb24gaXNSZXN1bHQoeDogdW5rbm93bik6IHggaXMgUmVzdWx0IHtcbiAgICByZXR1cm4geCBpbnN0YW5jZW9mIFJlc3VsdCB8fCBjbGFzc05hbWUoeCkgPT09IFRhZy5SRVNVTFQ7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8ge0BsaW5rIFJlc3VsdH0gb2JqZWN0LlxuICogQGphIHtAbGluayBSZXN1bHR9IOOCquODluOCuOOCp+OCr+ODiOOBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9SZXN1bHQobzogdW5rbm93bik6IFJlc3VsdCB7XG4gICAgaWYgKG8gaW5zdGFuY2VvZiBSZXN1bHQpIHtcbiAgICAgICAgLyogZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHByZWZlci1jb25zdCAqL1xuICAgICAgICBsZXQgeyBjb2RlLCBjYXVzZSwgdGltZSB9ID0gbztcbiAgICAgICAgY29kZSA9IGlzTnVsbGlzaChjb2RlKSA/IFJFU1VMVF9DT0RFLlNVQ0NFU1MgOiBpc051bWJlcihjb2RlKSA/IE1hdGgudHJ1bmMoY29kZSkgOiBSRVNVTFRfQ09ERS5GQUlMO1xuICAgICAgICBpc051bWJlcih0aW1lKSB8fCAodGltZSA9IERhdGUubm93KCkpO1xuICAgICAgICAvLyBEbyBub3RoaW5nIGlmIGFscmVhZHkgZGVmaW5lZFxuICAgICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KG8sICdjb2RlJywgIGRlc2MoY29kZSkpO1xuICAgICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KG8sICd0aW1lJywgIGRlc2ModGltZSkpO1xuICAgICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KG8sICdjYXVzZScsIGRlc2MoY2F1c2UpKTtcbiAgICAgICAgcmV0dXJuIG87XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZSA9IE9iamVjdChvKSBhcyBSZXN1bHQ7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBpc1N0cmluZyhlLm1lc3NhZ2UpID8gZS5tZXNzYWdlIDogaXNTdHJpbmcobykgPyBvIDogdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBjb2RlID0gaXNDYW5jZWxMaWtlRXJyb3IobWVzc2FnZSkgPyBSRVNVTFRfQ09ERS5BQk9SVCA6IGlzTnVtYmVyKGUuY29kZSkgPyBlLmNvZGUgOiBvIGFzIG51bWJlcjtcbiAgICAgICAgY29uc3QgY2F1c2UgPSBpc0Vycm9yKGUuY2F1c2UpID8gZS5jYXVzZSA6IGlzRXJyb3IobykgPyBvIDogaXNTdHJpbmcobykgPyBuZXcgRXJyb3IobykgOiBvO1xuICAgICAgICByZXR1cm4gbmV3IFJlc3VsdChjb2RlLCBtZXNzYWdlLCB7IGNhdXNlIH0pO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIHtAbGluayBSZXN1bHR9IGhlbHBlci5cbiAqIEBqYSB7QGxpbmsgUmVzdWx0fSDjgqrjg5bjgrjjgqfjgq/jg4jmp4vnr4njg5jjg6vjg5Hjg7xcbiAqXG4gKiBAcGFyYW0gY29kZVxuICogIC0gYGVuYCByZXN1bHQgY29kZVxuICogIC0gYGphYCDntZDmnpzjgrPjg7zjg4lcbiAqIEBwYXJhbSBtZXNzYWdlXG4gKiAgLSBgZW5gIHJlc3VsdCBpbmZvIG1lc3NhZ2VcbiAqICAtIGBqYWAg57WQ5p6c5oOF5aCx44Oh44OD44K744O844K4XG4gKiBAcGFyYW0gY2F1c2VcbiAqICAtIGBlbmAgbG93LWxldmVsIGVycm9yIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOS4i+S9jeOBruOCqOODqeODvOaDheWgsVxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZVJlc3VsdChjb2RlOiBudW1iZXIsIG1lc3NhZ2U/OiBzdHJpbmcsIGNhdXNlPzogdW5rbm93bik6IFJlc3VsdCB7XG4gICAgcmV0dXJuIG5ldyBSZXN1bHQoY29kZSwgbWVzc2FnZSwgeyBjYXVzZSB9KTtcbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIGNhbmNlbGVkIHtAbGluayBSZXN1bHR9IGhlbHBlci5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vmg4XloLHmoLzntI0ge0BsaW5rIFJlc3VsdH0g44Kq44OW44K444Kn44Kv44OI5qeL56+J44OY44Or44OR44O8XG4gKlxuICogQHBhcmFtIG1lc3NhZ2VcbiAqICAtIGBlbmAgcmVzdWx0IGluZm8gbWVzc2FnZVxuICogIC0gYGphYCDntZDmnpzmg4XloLHjg6Hjg4Pjgrvjg7zjgrhcbiAqIEBwYXJhbSBjYXVzZVxuICogIC0gYGVuYCBsb3ctbGV2ZWwgZXJyb3IgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5LiL5L2N44Gu44Ko44Op44O85oOF5aCxXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlQ2FuY2VsZWRSZXN1bHQobWVzc2FnZT86IHN0cmluZywgY2F1c2U/OiB1bmtub3duKTogUmVzdWx0IHtcbiAgICByZXR1cm4gbmV3IFJlc3VsdChSRVNVTFRfQ09ERS5BQk9SVCwgbWVzc2FnZSwgeyBjYXVzZSB9KTtcbn1cbiIsImltcG9ydCB7XG4gICAgS2V5cyxcbiAgICBUeXBlcyxcbiAgICBLZXlUb1R5cGUsXG4gICAgYXNzaWduVmFsdWUsXG4gICAgZGVlcEVxdWFsLFxuICAgIGlzRW1wdHlPYmplY3QsXG4gICAgZnJvbVR5cGVkRGF0YSxcbiAgICBkcm9wVW5kZWZpbmVkLFxuICAgIHJlc3RvcmVOdWxsaXNoLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uLCBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgQ2FuY2VsYWJsZSxcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHtcbiAgICBTdG9yYWdlRGF0YSxcbiAgICBTdG9yYWdlRGF0YVR5cGVMaXN0LFxuICAgIFN0b3JhZ2VJbnB1dERhdGFUeXBlTGlzdCxcbiAgICBJU3RvcmFnZU9wdGlvbnMsXG4gICAgSVN0b3JhZ2VEYXRhT3B0aW9ucyxcbiAgICBJU3RvcmFnZURhdGFSZXR1cm5UeXBlLFxuICAgIElTdG9yYWdlRXZlbnRDYWxsYmFjayxcbiAgICBJU3RvcmFnZSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIE1lbW9yeVN0b3JhZ2UgSS9PIG9wdGlvbnMgKi9cbmV4cG9ydCB0eXBlIE1lbW9yeVN0b3JhZ2VPcHRpb25zPEsgZXh0ZW5kcyBLZXlzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+ID0gS2V5czxTdG9yYWdlRGF0YVR5cGVMaXN0Pj4gPSBJU3RvcmFnZURhdGFPcHRpb25zPFN0b3JhZ2VEYXRhVHlwZUxpc3QsIEs+O1xuLyoqIE1lbW9yeVN0b3JhZ2UgcmV0dXJuIHZhbHVlICovXG5leHBvcnQgdHlwZSBNZW1vcnlTdG9yYWdlUmVzdWx0PEsgZXh0ZW5kcyBLZXlzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+PiA9IEtleVRvVHlwZTxTdG9yYWdlRGF0YVR5cGVMaXN0LCBLPjtcbi8qKiBNZW1vcnlTdG9yYWdlIGRhdGEgdHlwZSAqL1xuZXhwb3J0IHR5cGUgTWVtb3J5U3RvcmFnZURhdGFUeXBlcyA9IFR5cGVzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+O1xuLyoqIE1lbW9yeVN0b3JhZ2UgcmV0dXJuIHR5cGUgKi9cbmV4cG9ydCB0eXBlIE1lbW9yeVN0b3JhZ2VSZXR1cm5UeXBlPEQgZXh0ZW5kcyBNZW1vcnlTdG9yYWdlRGF0YVR5cGVzPiA9IElTdG9yYWdlRGF0YVJldHVyblR5cGU8U3RvcmFnZURhdGFUeXBlTGlzdCwgRD47XG4vKiogTWVtb3J5U3RvcmFnZSBpbnB1dCBkYXRhIHR5cGUgKi9cbmV4cG9ydCB0eXBlIE1lbW9yeVN0b3JhZ2VJbnB1dERhdGFUeXBlcyA9IFN0b3JhZ2VJbnB1dERhdGFUeXBlTGlzdDxTdG9yYWdlRGF0YVR5cGVMaXN0Pjtcbi8qKiBNZW1vcnlTdG9yYWdlIGV2ZW50IGNhbGxiYWNrICovXG5leHBvcnQgdHlwZSBNZW1vcnlTdG9yYWdlRXZlbnRDYWxsYmFjayA9IElTdG9yYWdlRXZlbnRDYWxsYmFjazxTdG9yYWdlRGF0YVR5cGVMaXN0PjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIE1lbW9yeVN0b3JhZ2VFdmVudCB7XG4gICAgJ0AnOiBbc3RyaW5nIHwgbnVsbCwgTWVtb3J5U3RvcmFnZURhdGFUeXBlcyB8IG51bGwsIE1lbW9yeVN0b3JhZ2VEYXRhVHlwZXMgfCBudWxsXTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1lbW9yeSBzdG9yYWdlIGNsYXNzLiBUaGlzIGNsYXNzIGRvZXNuJ3Qgc3VwcG9ydCBwZXJtYW5lY2lhdGlvbiBkYXRhLlxuICogQGphIOODoeODouODquODvOOCueODiOODrOODvOOCuOOCr+ODqeOCuS4g5pys44Kv44Op44K544Gv44OH44O844K/44Gu5rC457aa5YyW44KS44K144Od44O844OI44GX44Gq44GEXG4gKi9cbmV4cG9ydCBjbGFzcyBNZW1vcnlTdG9yYWdlIGltcGxlbWVudHMgSVN0b3JhZ2Uge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Jyb2tlciA9IG5ldyBFdmVudEJyb2tlcjxNZW1vcnlTdG9yYWdlRXZlbnQ+KCk7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgX3N0b3JhZ2U6IFN0b3JhZ2VEYXRhID0ge307XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJU3RvcmFnZVxuXG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBJU3RvcmFnZX0ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIHtAbGluayBJU3RvcmFnZX0g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdtZW1vcnknO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4ga2V5LCBvciBudWxsIGlmIHRoZSBnaXZlbiBrZXkgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QuXG4gICAgICogQGphIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWPluW+ly4g5a2Y5Zyo44GX44Gq44GE5aC05ZCI44GvIG51bGwg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBhY2Nlc3Mga2V5XG4gICAgICogIC0gYGphYCDjgqLjgq/jgrvjgrnjgq3jg7xcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgSS9PIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIEkvTyDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgUmV0dXJucyB0aGUgdmFsdWUgd2hpY2ggY29ycmVzcG9uZHMgdG8gYSBrZXkgd2l0aCB0eXBlIGNoYW5nZSBkZXNpZ25hdGVkIGluIGBkYXRhVHlwZWAuXG4gICAgICogIC0gYGphYCBgZGF0YVR5cGVgIOOBp+aMh+WumuOBleOCjOOBn+Wei+WkieaPm+OCkuihjOOBo+OBpiwg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgZ2V0SXRlbTxEIGV4dGVuZHMgTWVtb3J5U3RvcmFnZURhdGFUeXBlcyA9IE1lbW9yeVN0b3JhZ2VEYXRhVHlwZXM+KFxuICAgICAgICBrZXk6IHN0cmluZyxcbiAgICAgICAgb3B0aW9ucz86IE1lbW9yeVN0b3JhZ2VPcHRpb25zPG5ldmVyPlxuICAgICk6IFByb21pc2U8TWVtb3J5U3RvcmFnZVJldHVyblR5cGU8RD4+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgdGhlIGN1cnJlbnQgdmFsdWUgYXNzb2NpYXRlZCB3aXRoIHRoZSBnaXZlbiBrZXksIG9yIG51bGwgaWYgdGhlIGdpdmVuIGtleSBkb2VzIG5vdCBleGlzdCBpbiB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdC5cbiAgICAgKiBAamEg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS5Y+W5b6XLiDlrZjlnKjjgZfjgarjgYTloLTlkIjjga8gbnVsbCDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIGFjY2VzcyBrZXlcbiAgICAgKiAgLSBgamFgIOOCouOCr+OCu+OCueOCreODvFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBJL08gb3B0aW9uc1xuICAgICAqICAtIGBqYWAgSS9PIOOCquODl+OCt+ODp+ODs1xuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBSZXR1cm5zIHRoZSB2YWx1ZSB3aGljaCBjb3JyZXNwb25kcyB0byBhIGtleSB3aXRoIHR5cGUgY2hhbmdlIGRlc2lnbmF0ZWQgaW4gYGRhdGFUeXBlYC5cbiAgICAgKiAgLSBgamFgIGBkYXRhVHlwZWAg44Gn5oyH5a6a44GV44KM44Gf5Z6L5aSJ5o+b44KS6KGM44Gj44GmLCDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLov5TljbRcbiAgICAgKi9cbiAgICBnZXRJdGVtPEsgZXh0ZW5kcyBLZXlzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+PihcbiAgICAgICAga2V5OiBzdHJpbmcsXG4gICAgICAgIG9wdGlvbnM/OiBNZW1vcnlTdG9yYWdlT3B0aW9uczxLPlxuICAgICk6IFByb21pc2U8TWVtb3J5U3RvcmFnZVJlc3VsdDxLPiB8IG51bGw+O1xuXG4gICAgYXN5bmMgZ2V0SXRlbShrZXk6IHN0cmluZywgb3B0aW9ucz86IE1lbW9yeVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTxNZW1vcnlTdG9yYWdlRGF0YVR5cGVzIHwgbnVsbD4ge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgYXdhaXQgY2Mob3B0aW9ucy5jYW5jZWwpO1xuXG4gICAgICAgIC8vIGB1bmRlZmluZWRgIOKGkiBgbnVsbGBcbiAgICAgICAgY29uc3QgdmFsdWUgPSBkcm9wVW5kZWZpbmVkKHRoaXMuX3N0b3JhZ2Vba2V5XSk7XG4gICAgICAgIHN3aXRjaCAob3B0aW9ucy5kYXRhVHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gZnJvbVR5cGVkRGF0YSh2YWx1ZSkhO1xuICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gTnVtYmVyKHJlc3RvcmVOdWxsaXNoKHZhbHVlKSk7XG4gICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gQm9vbGVhbihyZXN0b3JlTnVsbGlzaCh2YWx1ZSkpO1xuICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gT2JqZWN0KHJlc3RvcmVOdWxsaXNoKHZhbHVlKSk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiByZXN0b3JlTnVsbGlzaCh2YWx1ZSkgYXMgbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXRzIHRoZSB2YWx1ZSBvZiB0aGUgcGFpciBpZGVudGlmaWVkIGJ5IGtleSB0byB2YWx1ZSwgY3JlYXRpbmcgYSBuZXcga2V5L3ZhbHVlIHBhaXIgaWYgbm9uZSBleGlzdGVkIGZvciBrZXkgcHJldmlvdXNseS5cbiAgICAgKiBAamEg44Kt44O844KS5oyH5a6a44GX44Gm5YCk44KS6Kit5a6aLiDlrZjlnKjjgZfjgarjgYTloLTlkIjjga/mlrDopo/jgavkvZzmiJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIGFjY2VzcyBrZXlcbiAgICAgKiAgLSBgamFgIOOCouOCr+OCu+OCueOCreODvFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBJL08gb3B0aW9uc1xuICAgICAqICAtIGBqYWAgSS9PIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHNldEl0ZW08ViBleHRlbmRzIE1lbW9yeVN0b3JhZ2VJbnB1dERhdGFUeXBlcz4oa2V5OiBzdHJpbmcsIHZhbHVlOiBWLCBvcHRpb25zPzogTWVtb3J5U3RvcmFnZU9wdGlvbnM8bmV2ZXI+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zID8/IHt9O1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zLmNhbmNlbCk7XG4gICAgICAgIGNvbnN0IG5ld1ZhbCA9IGRyb3BVbmRlZmluZWQodmFsdWUsIHRydWUpOyAgICAgICAgIC8vIGBudWxsYCBvciBgdW5kZWZpbmVkYCDihpIgJ251bGwnIG9yICd1bmRlZmluZWQnXG4gICAgICAgIGNvbnN0IG9sZFZhbCA9IGRyb3BVbmRlZmluZWQodGhpcy5fc3RvcmFnZVtrZXldKTsgIC8vIGB1bmRlZmluZWRgIOKGkiBgbnVsbGBcbiAgICAgICAgaWYgKCFkZWVwRXF1YWwob2xkVmFsLCBuZXdWYWwpKSB7XG4gICAgICAgICAgICBhc3NpZ25WYWx1ZSh0aGlzLl9zdG9yYWdlLCBrZXksIG5ld1ZhbCk7XG4gICAgICAgICAgICAhb3B0aW9ucy5zaWxlbnQgJiYgdGhpcy5fYnJva2VyLnRyaWdnZXIoJ0AnLCBrZXksIG5ld1ZhbCwgb2xkVmFsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmVzIHRoZSBrZXkvdmFsdWUgcGFpciB3aXRoIHRoZSBnaXZlbiBrZXkgZnJvbSB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdCwgaWYgYSBrZXkvdmFsdWUgcGFpciB3aXRoIHRoZSBnaXZlbiBrZXkgZXhpc3RzLlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ/jgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgYzlrZjlnKjjgZnjgozjgbDliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzdG9yYWdlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCueODiOODrOODvOOCuOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHJlbW92ZUl0ZW0oa2V5OiBzdHJpbmcsIG9wdGlvbnM/OiBJU3RvcmFnZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGF3YWl0IGNjKG9wdGlvbnMuY2FuY2VsKTtcbiAgICAgICAgY29uc3Qgb2xkVmFsID0gdGhpcy5fc3RvcmFnZVtrZXldO1xuICAgICAgICBpZiAodW5kZWZpbmVkICE9PSBvbGRWYWwpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9zdG9yYWdlW2tleV07XG4gICAgICAgICAgICAhb3B0aW9ucy5zaWxlbnQgJiYgdGhpcy5fYnJva2VyLnRyaWdnZXIoJ0AnLCBrZXksIG51bGwsIG9sZFZhbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRW1wdGllcyB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdCBvZiBhbGwga2V5L3ZhbHVlIHBhaXJzLCBpZiB0aGVyZSBhcmUgYW55LlxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzdG9yYWdlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCueODiOODrOODvOOCuOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIGNsZWFyKG9wdGlvbnM/OiBJU3RvcmFnZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGF3YWl0IGNjKG9wdGlvbnMuY2FuY2VsKTtcbiAgICAgICAgaWYgKCFpc0VtcHR5T2JqZWN0KHRoaXMuX3N0b3JhZ2UpKSB7XG4gICAgICAgICAgICB0aGlzLl9zdG9yYWdlID0ge307XG4gICAgICAgICAgICAhb3B0aW9ucy5zaWxlbnQgJiYgdGhpcy5fYnJva2VyLnRyaWdnZXIoJ0AnLCBudWxsLCBudWxsLCBudWxsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFsbCBlbnRyeSBrZXlzLlxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgq3jg7zkuIDopqfjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjYW5jZWwgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744Or44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMga2V5cyhvcHRpb25zPzogQ2FuY2VsYWJsZSk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICAgICAgYXdhaXQgY2Mob3B0aW9ucz8uY2FuY2VsKTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3N0b3JhZ2UpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uKGxpc3RlbmVyOiBNZW1vcnlTdG9yYWdlRXZlbnRDYWxsYmFjayk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9icm9rZXIub24oJ0AnLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIG9mZihsaXN0ZW5lcj86IE1lbW9yeVN0b3JhZ2VFdmVudENhbGxiYWNrKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2Jyb2tlci5vZmYoJ0AnLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYSBzdG9yYWdlLXN0b3JlIG9iamVjdC5cbiAgICAgKiBAamEg44K544OI44Os44O844K444K544OI44Ki44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgZ2V0IGNvbnRleHQoKTogU3RvcmFnZURhdGEge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZTtcbiAgICB9XG59XG5cbi8vIGRlZmF1bHQgc3RvcmFnZVxuZXhwb3J0IGNvbnN0IG1lbW9yeVN0b3JhZ2UgPSBuZXcgTWVtb3J5U3RvcmFnZSgpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgcG9zdCxcbiAgICBkZWVwRXF1YWwsXG4gICAgZGVlcENvcHksXG4gICAgZHJvcFVuZGVmaW5lZCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBTdG9yYWdlRGF0YSxcbiAgICBJU3RvcmFnZSxcbiAgICBJU3RvcmFnZU9wdGlvbnMsXG4gICAgSVN0b3JhZ2VGb3JtYXRPcHRpb25zLFxuICAgIFJlZ2lzdHJ5U2NoZW1hQmFzZSxcbiAgICBSZWdpc3RyeUV2ZW50LFxuICAgIFJlZ2lzdHJ5UmVhZE9wdGlvbnMsXG4gICAgUmVnaXN0cnlXcml0ZU9wdGlvbnMsXG4gICAgUmVnaXN0cnlTYXZlT3B0aW9ucyxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gUmVnaXN0cnkgbWFuYWdlbWVudCBjbGFzcyBmb3Igc3luY2hyb25vdXMgUmVhZC9Xcml0ZSBhY2Nlc3NpYmxlIGZyb20gYW55IHtAbGluayBJU3RvcmFnZX0gb2JqZWN0LlxuICogQGphIOS7u+aEj+OBriB7QGxpbmsgSVN0b3JhZ2V9IOOCquODluOCuOOCp+OCr+ODiOOBi+OCieWQjOacnyBSZWFkL1dyaXRlIOOCouOCr+OCu+OCueWPr+iDveOBquODrOOCuOOCueODiOODqueuoeeQhuOCr+ODqeOCuVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogLy8gMS4gZGVmaW5lIHJlZ2lzdHJ5IHNjaGVtYVxuICogaW50ZXJmYWNlIFNjaGVtYSBleHRlbmRzIFJlZ2lzdHJ5U2NoZW1hQmFzZSB7XG4gKiAgICAnY29tbW9uL21vZGUnOiAnbm9ybWFsJyB8ICdzcGVjaWZpZWQnO1xuICogICAgJ2NvbW1vbi92YWx1ZSc6IG51bWJlcjtcbiAqICAgICd0cmFkZS9sb2NhbCc6IHsgdW5pdDogJ+WGhicgfCAnJCc7IHJhdGU6IG51bWJlcjsgfTtcbiAqICAgICd0cmFkZS9jaGVjayc6IGJvb2xlYW47XG4gKiAgICAnZXh0cmEvdXNlcic6IHN0cmluZztcbiAqIH1cbiAqXG4gKiAvLyAyLiBwcmVwYXJlIElTdG9yYWdlIGluc3RhbmNlXG4gKiAvLyBleFxuICogaW1wb3J0IHsgd2ViU3RvcmFnZSB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogLy8gMy4gaW5zdGFudGlhdGUgdGhpcyBjbGFzc1xuICogY29uc3QgcmVnID0gbmV3IFJlZ2lzdHJ5PFNjaGVtYT4od2ViU3RvcmFnZSwgJ0B0ZXN0Jyk7XG4gKlxuICogLy8gNC4gcmVhZCBleGFtcGxlXG4gKiBjb25zdCB2YWwgPSByZWcucmVhZCgnY29tbW9uL21vZGUnKTsgLy8gJ25vcm1hbCcgfCAnc3BlY2lmaWVkJyB8IG51bGxcbiAqXG4gKiAvLyA1LiB3cml0ZSBleGFtcGxlXG4gKiByZWcud3JpdGUoJ2NvbW1vbi9tb2RlJywgJ3NwZWNpZmllZCcpO1xuICogLy8gcmVnLndyaXRlKCdjb21tb24vbW9kZScsICdob2dlJyk7IC8vIGNvbXBpbGUgZXJyb3JcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgUmVnaXN0cnk8VCBleHRlbmRzIFJlZ2lzdHJ5U2NoZW1hQmFzZSA9IGFueT4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxSZWdpc3RyeUV2ZW50PFQ+PiB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RvcmFnZTogSVN0b3JhZ2U7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Jvb3RLZXk6IHN0cmluZztcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfZGVmYXVsdE9wdGlvbnM6IElTdG9yYWdlRm9ybWF0T3B0aW9ucztcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBfc3RvcmU6IFN0b3JhZ2VEYXRhID0ge307XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHN0b3JhZ2VcbiAgICAgKiAgLSBgZW5gIFJvb3Qga2V5IGZvciB7QGxpbmsgSVN0b3JhZ2V9LlxuICAgICAqICAtIGBqYWAge0BsaW5rIElTdG9yYWdlfSDjgavkvb/nlKjjgZnjgovjg6vjg7zjg4jjgq3jg7xcbiAgICAgKiBAcGFyYW0gcm9vdEtleVxuICAgICAqICAtIGBlbmAgUm9vdCBrZXkgZm9yIHtAbGluayBJU3RvcmFnZX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgSVN0b3JhZ2V9IOOBq+S9v+eUqOOBmeOCi+ODq+ODvOODiOOCreODvFxuICAgICAqIEBwYXJhbSBmb3JtYXRTcGFjZVxuICAgICAqICAtIGBlbmAgZm9yIEpTT04gZm9ybWF0IHNwYWNlLlxuICAgICAqICAtIGBqYWAgSlNPTiDjg5Xjgqnjg7zjg57jg4Pjg4jjgrnjg5rjg7zjgrnjgpLmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzdG9yYWdlOiBJU3RvcmFnZTxhbnk+LCByb290S2V5OiBzdHJpbmcsIGZvcm1hdFNwYWNlPzogbnVtYmVyKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX3N0b3JhZ2UgPSBzdG9yYWdlO1xuICAgICAgICB0aGlzLl9yb290S2V5ID0gcm9vdEtleTtcbiAgICAgICAgdGhpcy5fZGVmYXVsdE9wdGlvbnMgPSB7IGpzb25TcGFjZTogZm9ybWF0U3BhY2UgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIHJvb3Qga2V5LlxuICAgICAqIEBqYSDjg6vjg7zjg4jjgq3jg7zjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgcm9vdEtleSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5fcm9vdEtleTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIHtAbGluayBJU3RvcmFnZX0gb2JqZWN0LlxuICAgICAqIEBqYSB7QGxpbmsgSVN0b3JhZ2V9IOOCquODluOCuOOCp+OCr+ODiOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBzdG9yYWdlKCk6IElTdG9yYWdlPGFueT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWFkIHBlcnNpc3RlbmNlIGRhdGEgZnJvbSB7QGxpbmsgSVN0b3JhZ2V9LiBUaGUgZGF0YSBsb2FkZWQgYWxyZWFkeSB3aWxsIGJlIGNsZWFyZWQuXG4gICAgICogQGphIHtAbGluayBJU3RvcmFnZX0g44GL44KJ5rC457aa5YyW44GX44Gf44OH44O844K/44KS6Kqt44G/6L6844G/LiDjgZnjgafjgavjgq3jg6Pjg4Pjgrfjg6XjgZXjgozjgabjgYTjgovjg4fjg7zjgr/jga/noLTmo4TjgZXjgozjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgbG9hZChvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zID8/IHt9O1xuICAgICAgICB0aGlzLl9zdG9yZSA9IChhd2FpdCB0aGlzLl9zdG9yYWdlLmdldEl0ZW0odGhpcy5fcm9vdEtleSwgb3B0aW9ucykpIHx8IHt9O1xuICAgICAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4gdGhpcy5wdWJsaXNoKCdjaGFuZ2UnLCAnKicpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBQZXJzaXN0IGRhdGEgdG8ge0BsaW5rIElTdG9yYWdlfS5cbiAgICAgKiBAamEge0BsaW5rIElTdG9yYWdlfSDjgavjg4fjg7zjgr/jgpLmsLjntprljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgc2F2ZShvcHRpb25zPzogUmVnaXN0cnlTYXZlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBvcHRzOiBSZWdpc3RyeVNhdmVPcHRpb25zID0geyAuLi50aGlzLl9kZWZhdWx0T3B0aW9ucywgLi4ub3B0aW9ucyB9O1xuICAgICAgICBpZiAoIW9wdHMuc2lsZW50KSB7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ3dpbGwtc2F2ZScpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuX3N0b3JhZ2Uuc2V0SXRlbSh0aGlzLl9yb290S2V5LCB0aGlzLl9zdG9yZSwgb3B0cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlYWQgcmVnaXN0cnkgdmFsdWUuXG4gICAgICogQGphIOODrOOCuOOCueODiOODquWApOOBruiqreOBv+WPluOCilxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHJlZ2lzdHJ5IGtleS5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODrOOCuOOCueODiOODquOCreODvOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZWFkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVhZDxLIGV4dGVuZHMga2V5b2YgVD4oa2V5OiBLLCBvcHRpb25zPzogUmVnaXN0cnlSZWFkT3B0aW9ucyk6IFRbS10gfCBudWxsIHtcbiAgICAgICAgY29uc3QgeyBmaWVsZCB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgY29uc3Qgc3RydWN0dXJlID0gU3RyaW5nKGtleSkuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbGFzdEtleSA9IHN0cnVjdHVyZS5wb3AoKSE7XG5cbiAgICAgICAgbGV0IG5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgbGV0IHJlZyA9IHRoaXMudGFyZ2V0Um9vdChmaWVsZCk7XG5cbiAgICAgICAgd2hpbGUgKG5hbWUgPSBzdHJ1Y3R1cmUuc2hpZnQoKSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbmQtYXNzaWduXG4gICAgICAgICAgICBpZiAoIShuYW1lIGluIHJlZykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlZyA9IHJlZ1tuYW1lXSBhcyBTdG9yYWdlRGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJldHVybiBkZWVwIGNvcHlcbiAgICAgICAgcmV0dXJuIChudWxsICE9IHJlZ1tsYXN0S2V5XSkgPyBkZWVwQ29weShyZWdbbGFzdEtleV0pIGFzIGFueSA6IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFdyaXRlIHJlZ2lzdHJ5IHZhbHVlLlxuICAgICAqIEBqYSDjg6zjgrjjgrnjg4jjg6rlgKTjga7mm7jjgY3ovrzjgb9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCByZWdpc3RyeSBrZXkuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jg6zjgrjjgrnjg4jjg6rjgq3jg7zjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHVwZGF0ZSB2YWx1ZS4gaWYgYG51bGxgIHNldCB0byBkZWxldGUuXG4gICAgICogIC0gYGphYCDmm7TmlrDjgZnjgovlgKQuIGBudWxsYCDjga/liYrpmaRcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgd3JpdGUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOabuOOBjei+vOOBv+OCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyB3cml0ZTxLIGV4dGVuZHMga2V5b2YgVD4oa2V5OiBLLCB2YWx1ZTogVFtLXSB8IG51bGwsIG9wdGlvbnM/OiBSZWdpc3RyeVdyaXRlT3B0aW9ucyk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGZpZWxkLCBub1NhdmUsIHNpbGVudCB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgY29uc3QgcmVtb3ZlID0gKG51bGwgPT0gdmFsdWUpO1xuICAgICAgICBjb25zdCBzdHJ1Y3R1cmUgPSBTdHJpbmcoa2V5KS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBsYXN0S2V5ID0gc3RydWN0dXJlLnBvcCgpITtcblxuICAgICAgICBsZXQgbmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBsZXQgcmVnID0gdGhpcy50YXJnZXRSb290KGZpZWxkKTtcblxuICAgICAgICB3aGlsZSAobmFtZSA9IHN0cnVjdHVyZS5zaGlmdCgpKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uZC1hc3NpZ25cbiAgICAgICAgICAgIGlmIChuYW1lIGluIHJlZykge1xuICAgICAgICAgICAgICAgIHJlZyA9IHJlZ1tuYW1lXSBhcyBTdG9yYWdlRGF0YTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVtb3ZlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyDjgZnjgafjgavopqrjgq3jg7zjgYzjgarjgYTjgZ/jgoHkvZXjgoLjgZfjgarjgYRcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVnID0gcmVnW25hbWVdID0ge307XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBuZXdWYWwgPSByZW1vdmUgPyBudWxsIDogdmFsdWU7XG4gICAgICAgIGNvbnN0IG9sZFZhbCA9IGRyb3BVbmRlZmluZWQocmVnW2xhc3RLZXldKTtcbiAgICAgICAgaWYgKGRlZXBFcXVhbChvbGRWYWwsIG5ld1ZhbCkpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8g5pu05paw44Gq44GXXG4gICAgICAgIH0gZWxzZSBpZiAocmVtb3ZlKSB7XG4gICAgICAgICAgICBkZWxldGUgcmVnW2xhc3RLZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVnW2xhc3RLZXldID0gZGVlcENvcHkobmV3VmFsKSBhcyBhbnk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW5vU2F2ZSkge1xuICAgICAgICAgICAgLy8gbm8gZmlyZSBub3RpZmljYXRpb25cbiAgICAgICAgICAgIHZvaWQgdGhpcy5fc3RvcmFnZS5zZXRJdGVtKHRoaXMuX3Jvb3RLZXksIHRoaXMuX3N0b3JlLCB7IC4uLnRoaXMuX2RlZmF1bHRPcHRpb25zLCAuLi5vcHRpb25zIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB0aGlzLnB1Ymxpc2goJ2NoYW5nZScsIGtleSwgbmV3VmFsLCBvbGRWYWwgYXMgYW55KSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVsZXRlIHJlZ2lzdHJ5IGtleS5cbiAgICAgKiBAamEg44Os44K444K544OI44Oq44Kt44O844Gu5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgcmVnaXN0cnkga2V5LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Os44K444K544OI44Oq44Kt44O844KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlYWQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOabuOOBjei+vOOBv+OCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBkZWxldGU8SyBleHRlbmRzIGtleW9mIFQ+KGtleTogSywgb3B0aW9ucz86IFJlZ2lzdHJ5V3JpdGVPcHRpb25zKTogdm9pZCB7XG4gICAgICAgIHRoaXMud3JpdGUoa2V5LCBudWxsLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgYWxsIHJlZ2lzdHJ5LlxuICAgICAqIEBqYSDjg6zjgrjjgrnjg4jjg6rjga7lhajliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZWFkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDmm7jjgY3ovrzjgb/jgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xlYXIob3B0aW9ucz86IFJlZ2lzdHJ5V3JpdGVPcHRpb25zKTogdm9pZCB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zID8/IHt9O1xuICAgICAgICB0aGlzLl9zdG9yZSA9IHt9O1xuICAgICAgICB2b2lkIHRoaXMuX3N0b3JhZ2UucmVtb3ZlSXRlbSh0aGlzLl9yb290S2V5LCBvcHRpb25zKTtcbiAgICAgICAgaWYgKCFvcHRpb25zLnNpbGVudCkge1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdjaGFuZ2UnLCBudWxsLCBudWxsLCBudWxsKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgZ2V0IHJvb3Qgb2JqZWN0ICovXG4gICAgcHJpdmF0ZSB0YXJnZXRSb290KGZpZWxkPzogc3RyaW5nKTogU3RvcmFnZURhdGEge1xuICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICAgIC8vIGVuc3VyZSBbZmllbGRdIG9iamVjdC5cbiAgICAgICAgICAgIHRoaXMuX3N0b3JlW2ZpZWxkXSA9IHRoaXMuX3N0b3JlW2ZpZWxkXSB8fCB7fTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdG9yZVtmaWVsZF0gYXMgU3RvcmFnZURhdGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmU7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBlc2NhcGVIVE1MIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgVGVtcGxhdGVEZWxpbWl0ZXJzLFxuICAgIFRlbXBsYXRlV3JpdGVyLFxuICAgIFRlbXBsYXRlRXNjYXBlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIChzdHJpbmcgfCBUb2tlbltdKSAqL1xuZXhwb3J0IHR5cGUgVG9rZW5MaXN0ID0gdW5rbm93bjtcblxuLyoqXG4gKiBAZW4ge0BsaW5rIFRlbXBsYXRlRW5naW5lfSB0b2tlbiBzdHJ1Y3R1cmUuXG4gKiBAamEge0BsaW5rIFRlbXBsYXRlRW5naW5lfSB0b2tlbiDlnotcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IHR5cGUgVG9rZW4gPSBbc3RyaW5nLCBzdHJpbmcsIG51bWJlciwgbnVtYmVyLCBUb2tlbkxpc3Q/LCBudW1iZXI/LCBib29sZWFuP107XG5cbi8qKlxuICogQGVuIHtAbGluayBUb2tlbn0gYWRkcmVzcyBpZC5cbiAqIEBqYSB7QGxpbmsgVG9rZW59IOOCouODieODrOOCueitmOWIpeWtkFxuICovXG5leHBvcnQgY29uc3QgZW51bSBUb2tlbkFkZHJlc3Mge1xuICAgIFRZUEUgPSAwLFxuICAgIFZBTFVFLFxuICAgIFNUQVJULFxuICAgIEVORCxcbiAgICBUT0tFTl9MSVNULFxuICAgIFRBR19JTkRFWCxcbiAgICBIQVNfTk9fU1BBQ0UsXG59XG5cbi8qKlxuICogQGVuIEludGVybmFsIGRlbGltaXRlcnMgZGVmaW5pdGlvbiBmb3Ige0BsaW5rIFRlbXBsYXRlRW5naW5lfS4gZXgpIFsne3snLCd9fSddIG9yICd7eyB9fSdcbiAqIEBqYSB7QGxpbmsgVGVtcGxhdGVFbmdpbmV9IOOBruWGhemDqOOBp+S9v+eUqOOBmeOCi+WMuuWIh+OCiuaWh+WtlyBleCkgWyd7eycsJ319J10gb3IgJ3t7IH19J1xuICovXG5leHBvcnQgdHlwZSBEZWxpbWl0ZXJzID0gc3RyaW5nIHwgVGVtcGxhdGVEZWxpbWl0ZXJzO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZ2xvYmFsU2V0dGluZ3MgPSB7XG4gICAgdGFnczogWyd7eycsICd9fSddLFxuICAgIGVzY2FwZTogZXNjYXBlSFRNTCxcbn0gYXMge1xuICAgIHRhZ3M6IFRlbXBsYXRlRGVsaW1pdGVycztcbiAgICBlc2NhcGU6IFRlbXBsYXRlRXNjYXBlcjtcbiAgICB3cml0ZXI6IFRlbXBsYXRlV3JpdGVyO1xufTtcbiIsImltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgZW5zdXJlT2JqZWN0LFxuICAgIGdldEdsb2JhbE5hbWVzcGFjZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFRlbXBsYXRlRGVsaW1pdGVycyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQGVuIENhY2hlIGxvY2F0aW9uIGluZm9ybWF0aW9uLlxuICogQGphIOOCreODo+ODg+OCt+ODpeODreOCseODvOOCt+ODp+ODs+aDheWgsVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY29uc3QgZW51bSBDYWNoZUxvY2F0aW9uIHtcbiAgICBOQU1FU1BBQ0UgPSAnQ0RQX0RFQ0xBUkUnLFxuICAgIFJPT1QgICAgICA9ICdURU1QTEFURV9DQUNIRScsXG59XG5cbi8qKlxuICogQGVuIEJ1aWxkIGNhY2hlIGtleS5cbiAqIEBqYSDjgq3jg6Pjg4Pjgrfjg6Xjgq3jg7zjga7nlJ/miJBcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2FjaGVLZXkodGVtcGxhdGU6IHN0cmluZywgdGFnczogVGVtcGxhdGVEZWxpbWl0ZXJzKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7dGVtcGxhdGV9OiR7dGFncy5qb2luKCc6Jyl9YDtcbn1cblxuLyoqXG4gKiBAZW4gQ2xlYXJzIGFsbCBjYWNoZWQgdGVtcGxhdGVzIGluIGNhY2hlIHBvb2wuXG4gKiBAamEg44GZ44G544Gm44Gu44OG44Oz44OX44Os44O844OI44Kt44Oj44OD44K344Ol44KS56C05qOEXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGVhckNhY2hlKCk6IHZvaWQge1xuICAgIGNvbnN0IG5hbWVzcGFjZSA9IGdldEdsb2JhbE5hbWVzcGFjZShDYWNoZUxvY2F0aW9uLk5BTUVTUEFDRSk7XG4gICAgbmFtZXNwYWNlW0NhY2hlTG9jYXRpb24uUk9PVF0gPSB7fTtcbn1cblxuLyoqIEBpbnRlcm5hbCBnbG9iYWwgY2FjaGUgcG9vbCAqL1xuZXhwb3J0IGNvbnN0IGNhY2hlID0gZW5zdXJlT2JqZWN0PFBsYWluT2JqZWN0PihudWxsLCBDYWNoZUxvY2F0aW9uLk5BTUVTUEFDRSwgQ2FjaGVMb2NhdGlvbi5ST09UKTtcbiIsImltcG9ydCB7IGlzQXJyYXksIGlzUHJpbWl0aXZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmV4cG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIFVua25vd25PYmplY3QsXG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGhhcyxcbiAgICBlc2NhcGVIVE1MLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKipcbiAqIE1vcmUgY29ycmVjdCB0eXBlb2Ygc3RyaW5nIGhhbmRsaW5nIGFycmF5XG4gKiB3aGljaCBub3JtYWxseSByZXR1cm5zIHR5cGVvZiAnb2JqZWN0J1xuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZVN0cmluZyhzcmM6IHVua25vd24pOiBzdHJpbmcge1xuICAgIHJldHVybiBpc0FycmF5KHNyYykgPyAnYXJyYXknIDogdHlwZW9mIHNyYztcbn1cblxuLyoqXG4gKiBFc2NhcGUgZm9yIHRlbXBsYXRlJ3MgZXhwcmVzc2lvbiBjaGFyYWN0b3JzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlVGVtcGxhdGVFeHAoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuICAgIHJldHVybiBzcmMucmVwbGFjZSgvWy1cXFtcXF17fSgpKis/LixcXFxcXFxeJHwjXFxzXS9nLCAnXFxcXCQmJyk7XG59XG5cbi8qKlxuICogU2FmZSB3YXkgb2YgZGV0ZWN0aW5nIHdoZXRoZXIgb3Igbm90IHRoZSBnaXZlbiB0aGluZyBpcyBhIHByaW1pdGl2ZSBhbmRcbiAqIHdoZXRoZXIgaXQgaGFzIHRoZSBnaXZlbiBwcm9wZXJ0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJpbWl0aXZlSGFzT3duUHJvcGVydHkoc3JjOiB1bmtub3duLCBwcm9wTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGlzUHJpbWl0aXZlKHNyYykgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNyYywgcHJvcE5hbWUpO1xufVxuXG4vKipcbiAqIENoZWNrIHdoaXRlc3BhY2UgY2hhcmFjdG9yIGV4aXN0cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2hpdGVzcGFjZShzcmM6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhL1xcUy8udGVzdChzcmMpO1xufVxuIiwiaW1wb3J0IHsgVGVtcGxhdGVTY2FubmVyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBBIHNpbXBsZSBzdHJpbmcgc2Nhbm5lciB0aGF0IGlzIHVzZWQgYnkgdGhlIHRlbXBsYXRlIHBhcnNlciB0byBmaW5kXG4gKiB0b2tlbnMgaW4gdGVtcGxhdGUgc3RyaW5ncy5cbiAqL1xuZXhwb3J0IGNsYXNzIFNjYW5uZXIgaW1wbGVtZW50cyBUZW1wbGF0ZVNjYW5uZXIge1xuICAgIHByaXZhdGUgX3NvdXJjZTogc3RyaW5nO1xuICAgIHByaXZhdGUgX3RhaWw6IHN0cmluZztcbiAgICBwcml2YXRlIF9wb3M6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3JjOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5fc291cmNlID0gdGhpcy5fdGFpbCA9IHNyYztcbiAgICAgICAgdGhpcy5fcG9zID0gMDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgY3VycmVudCBzY2FubmluZyBwb3NpdGlvbi5cbiAgICAgKi9cbiAgICBnZXQgcG9zKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wb3M7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBzdHJpbmcgIHNvdXJjZS5cbiAgICAgKi9cbiAgICBnZXQgc291cmNlKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHRhaWwgaXMgZW1wdHkgKGVuZCBvZiBzdHJpbmcpLlxuICAgICAqL1xuICAgIGdldCBlb3MoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAnJyA9PT0gdGhpcy5fdGFpbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmllcyB0byBtYXRjaCB0aGUgZ2l2ZW4gcmVndWxhciBleHByZXNzaW9uIGF0IHRoZSBjdXJyZW50IHBvc2l0aW9uLlxuICAgICAqIFJldHVybnMgdGhlIG1hdGNoZWQgdGV4dCBpZiBpdCBjYW4gbWF0Y2gsIHRoZSBlbXB0eSBzdHJpbmcgb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIHNjYW4ocmVnZXhwOiBSZWdFeHApOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBtYXRjaCA9IHJlZ2V4cC5leGVjKHRoaXMuX3RhaWwpO1xuXG4gICAgICAgIGlmICghbWF0Y2ggfHwgMCAhPT0gbWF0Y2guaW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN0cmluZyA9IG1hdGNoWzBdO1xuXG4gICAgICAgIHRoaXMuX3RhaWwgPSB0aGlzLl90YWlsLnN1YnN0cmluZyhzdHJpbmcubGVuZ3RoKTtcbiAgICAgICAgdGhpcy5fcG9zICs9IHN0cmluZy5sZW5ndGg7XG5cbiAgICAgICAgcmV0dXJuIHN0cmluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTa2lwcyBhbGwgdGV4dCB1bnRpbCB0aGUgZ2l2ZW4gcmVndWxhciBleHByZXNzaW9uIGNhbiBiZSBtYXRjaGVkLiBSZXR1cm5zXG4gICAgICogdGhlIHNraXBwZWQgc3RyaW5nLCB3aGljaCBpcyB0aGUgZW50aXJlIHRhaWwgaWYgbm8gbWF0Y2ggY2FuIGJlIG1hZGUuXG4gICAgICovXG4gICAgc2NhblVudGlsKHJlZ2V4cDogUmVnRXhwKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLl90YWlsLnNlYXJjaChyZWdleHApO1xuICAgICAgICBsZXQgbWF0Y2g6IHN0cmluZztcblxuICAgICAgICBzd2l0Y2ggKGluZGV4KSB7XG4gICAgICAgICAgICBjYXNlIC0xOlxuICAgICAgICAgICAgICAgIG1hdGNoID0gdGhpcy5fdGFpbDtcbiAgICAgICAgICAgICAgICB0aGlzLl90YWlsID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICAgbWF0Y2ggPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgbWF0Y2ggPSB0aGlzLl90YWlsLnN1YnN0cmluZygwLCBpbmRleCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fdGFpbCA9IHRoaXMuX3RhaWwuc3Vic3RyaW5nKGluZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3BvcyArPSBtYXRjaC5sZW5ndGg7XG5cbiAgICAgICAgcmV0dXJuIG1hdGNoO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFRlbXBsYXRlQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBVbmtub3duT2JqZWN0LFxuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaGFzLFxuICAgIHByaW1pdGl2ZUhhc093blByb3BlcnR5LFxufSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVuZGVyaW5nIGNvbnRleHQgYnkgd3JhcHBpbmcgYSB2aWV3IG9iamVjdCBhbmRcbiAqIG1haW50YWluaW5nIGEgcmVmZXJlbmNlIHRvIHRoZSBwYXJlbnQgY29udGV4dC5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbnRleHQgaW1wbGVtZW50cyBUZW1wbGF0ZUNvbnRleHQge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3ZpZXc6IFBsYWluT2JqZWN0O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3BhcmVudD86IENvbnRleHQ7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfY2FjaGU6IFBsYWluT2JqZWN0O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3IodmlldzogUGxhaW5PYmplY3QsIHBhcmVudENvbnRleHQ/OiBDb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX3ZpZXcgICA9IHZpZXc7XG4gICAgICAgIHRoaXMuX2NhY2hlICA9IHsgJy4nOiB0aGlzLl92aWV3IH07XG4gICAgICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudENvbnRleHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBWaWV3IHBhcmFtZXRlciBnZXR0ZXIuXG4gICAgICovXG4gICAgZ2V0IHZpZXcoKTogUGxhaW5PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmlldztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IGNvbnRleHQgdXNpbmcgdGhlIGdpdmVuIHZpZXcgd2l0aCB0aGlzIGNvbnRleHRcbiAgICAgKiBhcyB0aGUgcGFyZW50LlxuICAgICAqL1xuICAgIHB1c2godmlldzogUGxhaW5PYmplY3QpOiBDb250ZXh0IHtcbiAgICAgICAgcmV0dXJuIG5ldyBDb250ZXh0KHZpZXcsIHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHZhbHVlIG9mIHRoZSBnaXZlbiBuYW1lIGluIHRoaXMgY29udGV4dCwgdHJhdmVyc2luZ1xuICAgICAqIHVwIHRoZSBjb250ZXh0IGhpZXJhcmNoeSBpZiB0aGUgdmFsdWUgaXMgYWJzZW50IGluIHRoaXMgY29udGV4dCdzIHZpZXcuXG4gICAgICovXG4gICAgbG9va3VwKG5hbWU6IHN0cmluZyk6IHVua25vd24ge1xuICAgICAgICBjb25zdCBjYWNoZSA9IHRoaXMuX2NhY2hlO1xuXG4gICAgICAgIGxldCB2YWx1ZTogdW5rbm93bjtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjYWNoZSwgbmFtZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gY2FjaGVbbmFtZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgY29udGV4dDogQ29udGV4dCB8IHVuZGVmaW5lZCA9IHRoaXM7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICAgICAgICAgIGxldCBpbnRlcm1lZGlhdGVWYWx1ZTogVW5rbm93bk9iamVjdCB8IHVuZGVmaW5lZCB8IG51bGw7XG4gICAgICAgICAgICBsZXQgbmFtZXM6IHN0cmluZ1tdO1xuICAgICAgICAgICAgbGV0IGluZGV4OiBudW1iZXI7XG4gICAgICAgICAgICBsZXQgbG9va3VwSGl0ID0gZmFsc2U7XG5cbiAgICAgICAgICAgIHdoaWxlIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgaWYgKDAgPCBuYW1lLmluZGV4T2YoJy4nKSkge1xuICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGVWYWx1ZSA9IGNvbnRleHQuX3ZpZXc7XG4gICAgICAgICAgICAgICAgICAgIG5hbWVzID0gbmFtZS5zcGxpdCgnLicpO1xuICAgICAgICAgICAgICAgICAgICBpbmRleCA9IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAgICAqIFVzaW5nIHRoZSBkb3Qgbm90aW9uIHBhdGggaW4gYG5hbWVgLCB3ZSBkZXNjZW5kIHRocm91Z2ggdGhlXG4gICAgICAgICAgICAgICAgICAgICAqIG5lc3RlZCBvYmplY3RzLlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBUbyBiZSBjZXJ0YWluIHRoYXQgdGhlIGxvb2t1cCBoYXMgYmVlbiBzdWNjZXNzZnVsLCB3ZSBoYXZlIHRvXG4gICAgICAgICAgICAgICAgICAgICAqIGNoZWNrIGlmIHRoZSBsYXN0IG9iamVjdCBpbiB0aGUgcGF0aCBhY3R1YWxseSBoYXMgdGhlIHByb3BlcnR5XG4gICAgICAgICAgICAgICAgICAgICAqIHdlIGFyZSBsb29raW5nIGZvci4gV2Ugc3RvcmUgdGhlIHJlc3VsdCBpbiBgbG9va3VwSGl0YC5cbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogVGhpcyBpcyBzcGVjaWFsbHkgbmVjZXNzYXJ5IGZvciB3aGVuIHRoZSB2YWx1ZSBoYXMgYmVlbiBzZXQgdG9cbiAgICAgICAgICAgICAgICAgICAgICogYHVuZGVmaW5lZGAgYW5kIHdlIHdhbnQgdG8gYXZvaWQgbG9va2luZyB1cCBwYXJlbnQgY29udGV4dHMuXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIEluIHRoZSBjYXNlIHdoZXJlIGRvdCBub3RhdGlvbiBpcyB1c2VkLCB3ZSBjb25zaWRlciB0aGUgbG9va3VwXG4gICAgICAgICAgICAgICAgICAgICAqIHRvIGJlIHN1Y2Nlc3NmdWwgZXZlbiBpZiB0aGUgbGFzdCBcIm9iamVjdFwiIGluIHRoZSBwYXRoIGlzXG4gICAgICAgICAgICAgICAgICAgICAqIG5vdCBhY3R1YWxseSBhbiBvYmplY3QgYnV0IGEgcHJpbWl0aXZlIChlLmcuLCBhIHN0cmluZywgb3IgYW5cbiAgICAgICAgICAgICAgICAgICAgICogaW50ZWdlciksIGJlY2F1c2UgaXQgaXMgc29tZXRpbWVzIHVzZWZ1bCB0byBhY2Nlc3MgYSBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgICAgICAgKiBvZiBhbiBhdXRvYm94ZWQgcHJpbWl0aXZlLCBzdWNoIGFzIHRoZSBsZW5ndGggb2YgYSBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICAgICAqKi9cbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKG51bGwgIT0gaW50ZXJtZWRpYXRlVmFsdWUgJiYgaW5kZXggPCBuYW1lcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gbmFtZXMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvb2t1cEhpdCA9IChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzKGludGVybWVkaWF0ZVZhbHVlLCBuYW1lc1tpbmRleF0pIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByaW1pdGl2ZUhhc093blByb3BlcnR5KGludGVybWVkaWF0ZVZhbHVlLCBuYW1lc1tpbmRleF0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVybWVkaWF0ZVZhbHVlID0gaW50ZXJtZWRpYXRlVmFsdWVbbmFtZXNbaW5kZXgrK11dIGFzIFVua25vd25PYmplY3Q7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGVWYWx1ZSA9IGNvbnRleHQuX3ZpZXdbbmFtZV07XG5cbiAgICAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAgICAqIE9ubHkgY2hlY2tpbmcgYWdhaW5zdCBgaGFzUHJvcGVydHlgLCB3aGljaCBhbHdheXMgcmV0dXJucyBgZmFsc2VgIGlmXG4gICAgICAgICAgICAgICAgICAgICAqIGBjb250ZXh0LnZpZXdgIGlzIG5vdCBhbiBvYmplY3QuIERlbGliZXJhdGVseSBvbWl0dGluZyB0aGUgY2hlY2tcbiAgICAgICAgICAgICAgICAgICAgICogYWdhaW5zdCBgcHJpbWl0aXZlSGFzT3duUHJvcGVydHlgIGlmIGRvdCBub3RhdGlvbiBpcyBub3QgdXNlZC5cbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogQ29uc2lkZXIgdGhpcyBleGFtcGxlOlxuICAgICAgICAgICAgICAgICAgICAgKiBgYGBcbiAgICAgICAgICAgICAgICAgICAgICogTXVzdGFjaGUucmVuZGVyKFwiVGhlIGxlbmd0aCBvZiBhIGZvb3RiYWxsIGZpZWxkIGlzIHt7I2xlbmd0aH19e3tsZW5ndGh9fXt7L2xlbmd0aH19LlwiLCB7bGVuZ3RoOiBcIjEwMCB5YXJkc1wifSlcbiAgICAgICAgICAgICAgICAgICAgICogYGBgXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIElmIHdlIHdlcmUgdG8gY2hlY2sgYWxzbyBhZ2FpbnN0IGBwcmltaXRpdmVIYXNPd25Qcm9wZXJ0eWAsIGFzIHdlIGRvXG4gICAgICAgICAgICAgICAgICAgICAqIGluIHRoZSBkb3Qgbm90YXRpb24gY2FzZSwgdGhlbiByZW5kZXIgY2FsbCB3b3VsZCByZXR1cm46XG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIFwiVGhlIGxlbmd0aCBvZiBhIGZvb3RiYWxsIGZpZWxkIGlzIDkuXCJcbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogcmF0aGVyIHRoYW4gdGhlIGV4cGVjdGVkOlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBcIlRoZSBsZW5ndGggb2YgYSBmb290YmFsbCBmaWVsZCBpcyAxMDAgeWFyZHMuXCJcbiAgICAgICAgICAgICAgICAgICAgICoqL1xuICAgICAgICAgICAgICAgICAgICBsb29rdXBIaXQgPSBoYXMoY29udGV4dC5fdmlldywgbmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGxvb2t1cEhpdCkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGludGVybWVkaWF0ZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb250ZXh0ID0gY29udGV4dC5fcGFyZW50O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWNoZVtuYW1lXSA9IHZhbHVlIGFzIG9iamVjdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSAodmFsdWUgYXMgVW5rbm93bkZ1bmN0aW9uKS5jYWxsKHRoaXMuX3ZpZXcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgVG9rZW4sXG4gICAgVG9rZW5BZGRyZXNzIGFzICQsXG4gICAgRGVsaW1pdGVycyxcbiAgICBnbG9iYWxTZXR0aW5ncyxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQge1xuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgaXNXaGl0ZXNwYWNlLFxuICAgIGVzY2FwZVRlbXBsYXRlRXhwLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IFNjYW5uZXIgfSBmcm9tICcuL3NjYW5uZXInO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcmVnZXhwID0ge1xuICAgIHdoaXRlOiAvXFxzKi8sXG4gICAgc3BhY2U6IC9cXHMrLyxcbiAgICBlcXVhbHM6IC9cXHMqPS8sXG4gICAgY3VybHk6IC9cXHMqXFx9LyxcbiAgICB0YWc6IC8jfFxcXnxcXC98PnxcXHt8Jnw9fCEvLFxufTtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIENvbWJpbmVzIHRoZSB2YWx1ZXMgb2YgY29uc2VjdXRpdmUgdGV4dCB0b2tlbnMgaW4gdGhlIGdpdmVuIGB0b2tlbnNgIGFycmF5IHRvIGEgc2luZ2xlIHRva2VuLlxuICovXG5mdW5jdGlvbiBzcXVhc2hUb2tlbnModG9rZW5zOiBUb2tlbltdKTogVG9rZW5bXSB7XG4gICAgY29uc3Qgc3F1YXNoZWRUb2tlbnM6IFRva2VuW10gPSBbXTtcblxuICAgIGxldCBsYXN0VG9rZW4hOiBUb2tlbjtcbiAgICBmb3IgKGNvbnN0IHRva2VuIG9mIHRva2Vucykge1xuICAgICAgICBpZiAodG9rZW4pIHtcbiAgICAgICAgICAgIGlmICgndGV4dCcgPT09IHRva2VuWyQuVFlQRV0gJiYgbGFzdFRva2VuICYmICd0ZXh0JyA9PT0gbGFzdFRva2VuWyQuVFlQRV0pIHtcbiAgICAgICAgICAgICAgICBsYXN0VG9rZW5bJC5WQUxVRV0gKz0gdG9rZW5bJC5WQUxVRV07XG4gICAgICAgICAgICAgICAgbGFzdFRva2VuWyQuRU5EXSA9IHRva2VuWyQuRU5EXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3F1YXNoZWRUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgbGFzdFRva2VuID0gdG9rZW47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3F1YXNoZWRUb2tlbnM7XG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBGb3JtcyB0aGUgZ2l2ZW4gYXJyYXkgb2YgYHRva2Vuc2AgaW50byBhIG5lc3RlZCB0cmVlIHN0cnVjdHVyZSB3aGVyZVxuICogdG9rZW5zIHRoYXQgcmVwcmVzZW50IGEgc2VjdGlvbiBoYXZlIHR3byBhZGRpdGlvbmFsIGl0ZW1zOiAxKSBhbiBhcnJheSBvZlxuICogYWxsIHRva2VucyB0aGF0IGFwcGVhciBpbiB0aGF0IHNlY3Rpb24gYW5kIDIpIHRoZSBpbmRleCBpbiB0aGUgb3JpZ2luYWxcbiAqIHRlbXBsYXRlIHRoYXQgcmVwcmVzZW50cyB0aGUgZW5kIG9mIHRoYXQgc2VjdGlvbi5cbiAqL1xuZnVuY3Rpb24gbmVzdFRva2Vucyh0b2tlbnM6IFRva2VuW10pOiBUb2tlbltdIHtcbiAgICBjb25zdCBuZXN0ZWRUb2tlbnM6IFRva2VuW10gPSBbXTtcbiAgICBsZXQgY29sbGVjdG9yID0gbmVzdGVkVG9rZW5zO1xuICAgIGNvbnN0IHNlY3Rpb25zOiBUb2tlbltdID0gW107XG5cbiAgICBsZXQgc2VjdGlvbiE6IFRva2VuO1xuICAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgICAgIHN3aXRjaCAodG9rZW5bJC5UWVBFXSkge1xuICAgICAgICAgICAgY2FzZSAnIyc6XG4gICAgICAgICAgICBjYXNlICdeJzpcbiAgICAgICAgICAgICAgICBjb2xsZWN0b3IucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgc2VjdGlvbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yID0gdG9rZW5bJC5UT0tFTl9MSVNUXSA9IFtdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnLyc6XG4gICAgICAgICAgICAgICAgc2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpITtcbiAgICAgICAgICAgICAgICBzZWN0aW9uWyQuVEFHX0lOREVYXSA9IHRva2VuWyQuU1RBUlRdO1xuICAgICAgICAgICAgICAgIGNvbGxlY3RvciA9IHNlY3Rpb25zLmxlbmd0aCA+IDAgPyBzZWN0aW9uc1tzZWN0aW9ucy5sZW5ndGggLSAxXVskLlRPS0VOX0xJU1RdIGFzIFRva2VuW10gOiBuZXN0ZWRUb2tlbnM7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGNvbGxlY3Rvci5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmVzdGVkVG9rZW5zO1xufVxuXG4vKipcbiAqIEJyZWFrcyB1cCB0aGUgZ2l2ZW4gYHRlbXBsYXRlYCBzdHJpbmcgaW50byBhIHRyZWUgb2YgdG9rZW5zLiBJZiB0aGUgYHRhZ3NgXG4gKiBhcmd1bWVudCBpcyBnaXZlbiBoZXJlIGl0IG11c3QgYmUgYW4gYXJyYXkgd2l0aCB0d28gc3RyaW5nIHZhbHVlczogdGhlXG4gKiBvcGVuaW5nIGFuZCBjbG9zaW5nIHRhZ3MgdXNlZCBpbiB0aGUgdGVtcGxhdGUgKGUuZy4gWyBcIjwlXCIsIFwiJT5cIiBdKS4gT2ZcbiAqIGNvdXJzZSwgdGhlIGRlZmF1bHQgaXMgdG8gdXNlIG11c3RhY2hlcyAoaS5lLiBtdXN0YWNoZS50YWdzKS5cbiAqXG4gKiBBIHRva2VuIGlzIGFuIGFycmF5IHdpdGggYXQgbGVhc3QgNCBlbGVtZW50cy4gVGhlIGZpcnN0IGVsZW1lbnQgaXMgdGhlXG4gKiBtdXN0YWNoZSBzeW1ib2wgdGhhdCB3YXMgdXNlZCBpbnNpZGUgdGhlIHRhZywgZS5nLiBcIiNcIiBvciBcIiZcIi4gSWYgdGhlIHRhZ1xuICogZGlkIG5vdCBjb250YWluIGEgc3ltYm9sIChpLmUuIHt7bXlWYWx1ZX19KSB0aGlzIGVsZW1lbnQgaXMgXCJuYW1lXCIuIEZvclxuICogYWxsIHRleHQgdGhhdCBhcHBlYXJzIG91dHNpZGUgYSBzeW1ib2wgdGhpcyBlbGVtZW50IGlzIFwidGV4dFwiLlxuICpcbiAqIFRoZSBzZWNvbmQgZWxlbWVudCBvZiBhIHRva2VuIGlzIGl0cyBcInZhbHVlXCIuIEZvciBtdXN0YWNoZSB0YWdzIHRoaXMgaXNcbiAqIHdoYXRldmVyIGVsc2Ugd2FzIGluc2lkZSB0aGUgdGFnIGJlc2lkZXMgdGhlIG9wZW5pbmcgc3ltYm9sLiBGb3IgdGV4dCB0b2tlbnNcbiAqIHRoaXMgaXMgdGhlIHRleHQgaXRzZWxmLlxuICpcbiAqIFRoZSB0aGlyZCBhbmQgZm91cnRoIGVsZW1lbnRzIG9mIHRoZSB0b2tlbiBhcmUgdGhlIHN0YXJ0IGFuZCBlbmQgaW5kaWNlcyxcbiAqIHJlc3BlY3RpdmVseSwgb2YgdGhlIHRva2VuIGluIHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZS5cbiAqXG4gKiBUb2tlbnMgdGhhdCBhcmUgdGhlIHJvb3Qgbm9kZSBvZiBhIHN1YnRyZWUgY29udGFpbiB0d28gbW9yZSBlbGVtZW50czogMSkgYW5cbiAqIGFycmF5IG9mIHRva2VucyBpbiB0aGUgc3VidHJlZSBhbmQgMikgdGhlIGluZGV4IGluIHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZSBhdFxuICogd2hpY2ggdGhlIGNsb3NpbmcgdGFnIGZvciB0aGF0IHNlY3Rpb24gYmVnaW5zLlxuICpcbiAqIFRva2VucyBmb3IgcGFydGlhbHMgYWxzbyBjb250YWluIHR3byBtb3JlIGVsZW1lbnRzOiAxKSBhIHN0cmluZyB2YWx1ZSBvZlxuICogaW5kZW5kYXRpb24gcHJpb3IgdG8gdGhhdCB0YWcgYW5kIDIpIHRoZSBpbmRleCBvZiB0aGF0IHRhZyBvbiB0aGF0IGxpbmUgLVxuICogZWcgYSB2YWx1ZSBvZiAyIGluZGljYXRlcyB0aGUgcGFydGlhbCBpcyB0aGUgdGhpcmQgdGFnIG9uIHRoaXMgbGluZS5cbiAqXG4gKiBAcGFyYW0gdGVtcGxhdGUgdGVtcGxhdGUgc3RyaW5nXG4gKiBAcGFyYW0gdGFncyBkZWxpbWl0ZXJzIGV4KSBbJ3t7JywnfX0nXSBvciAne3sgfX0nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRlbXBsYXRlKHRlbXBsYXRlOiBzdHJpbmcsIHRhZ3M/OiBEZWxpbWl0ZXJzKTogVG9rZW5bXSB7XG4gICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgbGV0IGxpbmVIYXNOb25TcGFjZSAgICAgPSBmYWxzZTtcbiAgICBjb25zdCBzZWN0aW9uczogVG9rZW5bXSA9IFtdOyAgICAgICAvLyBTdGFjayB0byBob2xkIHNlY3Rpb24gdG9rZW5zXG4gICAgY29uc3QgdG9rZW5zOiBUb2tlbltdICAgPSBbXTsgICAgICAgLy8gQnVmZmVyIHRvIGhvbGQgdGhlIHRva2Vuc1xuICAgIGNvbnN0IHNwYWNlczogbnVtYmVyW10gID0gW107ICAgICAgIC8vIEluZGljZXMgb2Ygd2hpdGVzcGFjZSB0b2tlbnMgb24gdGhlIGN1cnJlbnQgbGluZVxuICAgIGxldCBoYXNUYWcgICAgICAgICAgICAgID0gZmFsc2U7ICAgIC8vIElzIHRoZXJlIGEge3t0YWd9fSBvbiB0aGUgY3VycmVudCBsaW5lP1xuICAgIGxldCBub25TcGFjZSAgICAgICAgICAgID0gZmFsc2U7ICAgIC8vIElzIHRoZXJlIGEgbm9uLXNwYWNlIGNoYXIgb24gdGhlIGN1cnJlbnQgbGluZT9cbiAgICBsZXQgaW5kZW50YXRpb24gICAgICAgICA9ICcnOyAgICAgICAvLyBUcmFja3MgaW5kZW50YXRpb24gZm9yIHRhZ3MgdGhhdCB1c2UgaXRcbiAgICBsZXQgdGFnSW5kZXggICAgICAgICAgICA9IDA7ICAgICAgICAvLyBTdG9yZXMgYSBjb3VudCBvZiBudW1iZXIgb2YgdGFncyBlbmNvdW50ZXJlZCBvbiBhIGxpbmVcblxuICAgIC8vIFN0cmlwcyBhbGwgd2hpdGVzcGFjZSB0b2tlbnMgYXJyYXkgZm9yIHRoZSBjdXJyZW50IGxpbmVcbiAgICAvLyBpZiB0aGVyZSB3YXMgYSB7eyN0YWd9fSBvbiBpdCBhbmQgb3RoZXJ3aXNlIG9ubHkgc3BhY2UuXG4gICAgY29uc3Qgc3RyaXBTcGFjZSA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgaWYgKGhhc1RhZyAmJiAhbm9uU3BhY2UpIHtcbiAgICAgICAgICAgIHdoaWxlIChzcGFjZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRva2Vuc1tzcGFjZXMucG9wKCkhXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNwYWNlcy5sZW5ndGggPSAwO1xuICAgICAgICB9XG4gICAgICAgIGhhc1RhZyA9IGZhbHNlO1xuICAgICAgICBub25TcGFjZSA9IGZhbHNlO1xuICAgIH07XG5cbiAgICBjb25zdCBjb21waWxlVGFncyA9ICh0YWdzVG9Db21waWxlOiBzdHJpbmcgfCBzdHJpbmdbXSk6IHsgb3BlbmluZ1RhZzogUmVnRXhwOyBjbG9zaW5nVGFnOiBSZWdFeHA7IGNsb3NpbmdDdXJseTogUmVnRXhwOyB9ID0+IHtcbiAgICAgICAgY29uc3QgZW51bSBUYWcge1xuICAgICAgICAgICAgT1BFTiA9IDAsXG4gICAgICAgICAgICBDTE9TRSxcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNTdHJpbmcodGFnc1RvQ29tcGlsZSkpIHtcbiAgICAgICAgICAgIHRhZ3NUb0NvbXBpbGUgPSB0YWdzVG9Db21waWxlLnNwbGl0KF9yZWdleHAuc3BhY2UsIDIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFpc0FycmF5KHRhZ3NUb0NvbXBpbGUpIHx8IDIgIT09IHRhZ3NUb0NvbXBpbGUubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgdGFnczogJHtKU09OLnN0cmluZ2lmeSh0YWdzVG9Db21waWxlKX1gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3BlbmluZ1RhZzogICBuZXcgUmVnRXhwKGAke2VzY2FwZVRlbXBsYXRlRXhwKHRhZ3NUb0NvbXBpbGVbVGFnLk9QRU5dKX1cXFxccypgKSxcbiAgICAgICAgICAgIGNsb3NpbmdUYWc6ICAgbmV3IFJlZ0V4cChgXFxcXHMqJHtlc2NhcGVUZW1wbGF0ZUV4cCh0YWdzVG9Db21waWxlW1RhZy5DTE9TRV0pfWApLFxuICAgICAgICAgICAgY2xvc2luZ0N1cmx5OiBuZXcgUmVnRXhwKGBcXFxccyoke2VzY2FwZVRlbXBsYXRlRXhwKGB9JHt0YWdzVG9Db21waWxlW1RhZy5DTE9TRV19YCl9YCksXG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIGNvbnN0IHsgdGFnOiByZVRhZywgd2hpdGU6IHJlV2hpdGUsIGVxdWFsczogcmVFcXVhbHMsIGN1cmx5OiByZUN1cmx5IH0gPSBfcmVnZXhwO1xuICAgIGxldCBfcmVneHBUYWdzID0gY29tcGlsZVRhZ3ModGFncyA/PyBnbG9iYWxTZXR0aW5ncy50YWdzKTtcblxuICAgIGNvbnN0IHNjYW5uZXIgPSBuZXcgU2Nhbm5lcih0ZW1wbGF0ZSk7XG5cbiAgICBsZXQgb3BlblNlY3Rpb246IFRva2VuIHwgdW5kZWZpbmVkO1xuICAgIHdoaWxlICghc2Nhbm5lci5lb3MpIHtcbiAgICAgICAgY29uc3QgeyBvcGVuaW5nVGFnOiByZU9wZW5pbmdUYWcsIGNsb3NpbmdUYWc6IHJlQ2xvc2luZ1RhZywgY2xvc2luZ0N1cmx5OiByZUNsb3NpbmdDdXJseSB9ID0gX3JlZ3hwVGFncztcbiAgICAgICAgbGV0IHRva2VuOiBUb2tlbjtcbiAgICAgICAgbGV0IHN0YXJ0ID0gc2Nhbm5lci5wb3M7XG4gICAgICAgIC8vIE1hdGNoIGFueSB0ZXh0IGJldHdlZW4gdGFncy5cbiAgICAgICAgbGV0IHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwocmVPcGVuaW5nVGFnKTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMCwgdmFsdWVMZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGkgPCB2YWx1ZUxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2hyID0gdmFsdWUuY2hhckF0KGkpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzV2hpdGVzcGFjZShjaHIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNwYWNlcy5wdXNoKHRva2Vucy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICBpbmRlbnRhdGlvbiArPSBjaHI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbm9uU3BhY2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBsaW5lSGFzTm9uU3BhY2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpbmRlbnRhdGlvbiArPSAnICc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdG9rZW5zLnB1c2goWyd0ZXh0JywgY2hyLCBzdGFydCwgc3RhcnQgKyAxXSk7XG4gICAgICAgICAgICAgICAgc3RhcnQgKz0gMTtcblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGZvciB3aGl0ZXNwYWNlIG9uIHRoZSBjdXJyZW50IGxpbmUuXG4gICAgICAgICAgICAgICAgaWYgKCdcXG4nID09PSBjaHIpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RyaXBTcGFjZSgpO1xuICAgICAgICAgICAgICAgICAgICBpbmRlbnRhdGlvbiA9ICcnO1xuICAgICAgICAgICAgICAgICAgICB0YWdJbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVIYXNOb25TcGFjZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hdGNoIHRoZSBvcGVuaW5nIHRhZy5cbiAgICAgICAgaWYgKCFzY2FubmVyLnNjYW4ocmVPcGVuaW5nVGFnKSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBoYXNUYWcgPSB0cnVlO1xuXG4gICAgICAgIC8vIEdldCB0aGUgdGFnIHR5cGUuXG4gICAgICAgIGxldCB0eXBlID0gc2Nhbm5lci5zY2FuKHJlVGFnKSB8fCAnbmFtZSc7XG4gICAgICAgIHNjYW5uZXIuc2NhbihyZVdoaXRlKTtcblxuICAgICAgICAvLyBHZXQgdGhlIHRhZyB2YWx1ZS5cbiAgICAgICAgaWYgKCc9JyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChyZUVxdWFscyk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW4ocmVFcXVhbHMpO1xuICAgICAgICAgICAgc2Nhbm5lci5zY2FuVW50aWwocmVDbG9zaW5nVGFnKTtcbiAgICAgICAgfSBlbHNlIGlmICgneycgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwocmVDbG9zaW5nQ3VybHkpO1xuICAgICAgICAgICAgc2Nhbm5lci5zY2FuKHJlQ3VybHkpO1xuICAgICAgICAgICAgc2Nhbm5lci5zY2FuVW50aWwocmVDbG9zaW5nVGFnKTtcbiAgICAgICAgICAgIHR5cGUgPSAnJic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHNjYW5uZXIuc2NhblVudGlsKHJlQ2xvc2luZ1RhZyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXRjaCB0aGUgY2xvc2luZyB0YWcuXG4gICAgICAgIGlmICghc2Nhbm5lci5zY2FuKHJlQ2xvc2luZ1RhZykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5jbG9zZWQgdGFnIGF0ICR7c2Nhbm5lci5wb3N9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJz4nID09PSB0eXBlKSB7XG4gICAgICAgICAgICB0b2tlbiA9IFt0eXBlLCB2YWx1ZSwgc3RhcnQsIHNjYW5uZXIucG9zLCBpbmRlbnRhdGlvbiwgdGFnSW5kZXgsIGxpbmVIYXNOb25TcGFjZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0b2tlbiA9IFt0eXBlLCB2YWx1ZSwgc3RhcnQsIHNjYW5uZXIucG9zXTtcbiAgICAgICAgfVxuICAgICAgICB0YWdJbmRleCsrO1xuICAgICAgICB0b2tlbnMucHVzaCh0b2tlbik7XG5cbiAgICAgICAgaWYgKCcjJyA9PT0gdHlwZSB8fCAnXicgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIHNlY3Rpb25zLnB1c2godG9rZW4pO1xuICAgICAgICB9IGVsc2UgaWYgKCcvJyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgc2VjdGlvbiBuZXN0aW5nLlxuICAgICAgICAgICAgb3BlblNlY3Rpb24gPSBzZWN0aW9ucy5wb3AoKTtcbiAgICAgICAgICAgIGlmICghb3BlblNlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVub3BlbmVkIHNlY3Rpb24gXCIke3ZhbHVlfVwiIGF0ICR7c3RhcnR9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob3BlblNlY3Rpb25bMV0gIT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmNsb3NlZCBzZWN0aW9uIFwiJHtvcGVuU2VjdGlvblskLlZBTFVFXX1cIiBhdCAke3N0YXJ0fWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCduYW1lJyA9PT0gdHlwZSB8fCAneycgPT09IHR5cGUgfHwgJyYnID09PSB0eXBlKSB7XG4gICAgICAgICAgICBub25TcGFjZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoJz0nID09PSB0eXBlKSB7XG4gICAgICAgICAgICAvLyBTZXQgdGhlIHRhZ3MgZm9yIHRoZSBuZXh0IHRpbWUgYXJvdW5kLlxuICAgICAgICAgICAgX3JlZ3hwVGFncyA9IGNvbXBpbGVUYWdzKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHN0cmlwU3BhY2UoKTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGVyZSBhcmUgbm8gb3BlbiBzZWN0aW9ucyB3aGVuIHdlJ3JlIGRvbmUuXG4gICAgb3BlblNlY3Rpb24gPSBzZWN0aW9ucy5wb3AoKTtcblxuICAgIGlmIChvcGVuU2VjdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuY2xvc2VkIHNlY3Rpb24gXCIke29wZW5TZWN0aW9uWyQuVkFMVUVdfVwiIGF0ICR7c2Nhbm5lci5wb3N9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5lc3RUb2tlbnMoc3F1YXNoVG9rZW5zKHRva2VucykpO1xufVxuIiwiaW1wb3J0IHtcbiAgICBUZW1wbGF0ZURlbGltaXRlcnMsXG4gICAgVGVtcGxhdGVXcml0ZXIsXG4gICAgVGVtcGxhdGVWaWV3UGFyYW0sXG4gICAgVGVtcGxhdGVQYXJ0aWFsUGFyYW0sXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIFRva2VuLFxuICAgIFRva2VuQWRkcmVzcyBhcyAkLFxuICAgIGdsb2JhbFNldHRpbmdzLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IGNhY2hlLCBidWlsZENhY2hlS2V5IH0gZnJvbSAnLi9jYWNoZSc7XG5pbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzQXJyYXksXG4gICAgaXNGdW5jdGlvbixcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBwYXJzZVRlbXBsYXRlIH0gZnJvbSAnLi9wYXJzZSc7XG5pbXBvcnQgeyBDb250ZXh0IH0gZnJvbSAnLi9jb250ZXh0JztcblxuLyoqXG4gKiBBIFdyaXRlciBrbm93cyBob3cgdG8gdGFrZSBhIHN0cmVhbSBvZiB0b2tlbnMgYW5kIHJlbmRlciB0aGVtIHRvIGFcbiAqIHN0cmluZywgZ2l2ZW4gYSBjb250ZXh0LiBJdCBhbHNvIG1haW50YWlucyBhIGNhY2hlIG9mIHRlbXBsYXRlcyB0b1xuICogYXZvaWQgdGhlIG5lZWQgdG8gcGFyc2UgdGhlIHNhbWUgdGVtcGxhdGUgdHdpY2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBXcml0ZXIgaW1wbGVtZW50cyBUZW1wbGF0ZVdyaXRlciB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyBhbmQgY2FjaGVzIHRoZSBnaXZlbiBgdGVtcGxhdGVgIGFjY29yZGluZyB0byB0aGUgZ2l2ZW4gYHRhZ3NgIG9yXG4gICAgICogYG11c3RhY2hlLnRhZ3NgIGlmIGB0YWdzYCBpcyBvbWl0dGVkLCAgYW5kIHJldHVybnMgdGhlIGFycmF5IG9mIHRva2Vuc1xuICAgICAqIHRoYXQgaXMgZ2VuZXJhdGVkIGZyb20gdGhlIHBhcnNlLlxuICAgICAqL1xuICAgIHBhcnNlKHRlbXBsYXRlOiBzdHJpbmcsIHRhZ3M/OiBUZW1wbGF0ZURlbGltaXRlcnMpOiB7IHRva2VuczogVG9rZW5bXTsgY2FjaGVLZXk6IHN0cmluZzsgfSB7XG4gICAgICAgIGNvbnN0IGNhY2hlS2V5ID0gYnVpbGRDYWNoZUtleSh0ZW1wbGF0ZSwgdGFncyA/PyBnbG9iYWxTZXR0aW5ncy50YWdzKTtcbiAgICAgICAgbGV0IHRva2VucyA9IGNhY2hlW2NhY2hlS2V5XSBhcyBUb2tlbltdO1xuICAgICAgICBpZiAobnVsbCA9PSB0b2tlbnMpIHtcbiAgICAgICAgICAgIHRva2VucyA9IGNhY2hlW2NhY2hlS2V5XSA9IHBhcnNlVGVtcGxhdGUodGVtcGxhdGUsIHRhZ3MpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHRva2VucywgY2FjaGVLZXkgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIaWdoLWxldmVsIG1ldGhvZCB0aGF0IGlzIHVzZWQgdG8gcmVuZGVyIHRoZSBnaXZlbiBgdGVtcGxhdGVgIHdpdGhcbiAgICAgKiB0aGUgZ2l2ZW4gYHZpZXdgLlxuICAgICAqXG4gICAgICogVGhlIG9wdGlvbmFsIGBwYXJ0aWFsc2AgYXJndW1lbnQgbWF5IGJlIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIHRoZVxuICAgICAqIG5hbWVzIGFuZCB0ZW1wbGF0ZXMgb2YgcGFydGlhbHMgdGhhdCBhcmUgdXNlZCBpbiB0aGUgdGVtcGxhdGUuIEl0IG1heVxuICAgICAqIGFsc28gYmUgYSBmdW5jdGlvbiB0aGF0IGlzIHVzZWQgdG8gbG9hZCBwYXJ0aWFsIHRlbXBsYXRlcyBvbiB0aGUgZmx5XG4gICAgICogdGhhdCB0YWtlcyBhIHNpbmdsZSBhcmd1bWVudDogdGhlIG5hbWUgb2YgdGhlIHBhcnRpYWwuXG4gICAgICpcbiAgICAgKiBJZiB0aGUgb3B0aW9uYWwgYHRhZ3NgIGFyZ3VtZW50IGlzIGdpdmVuIGhlcmUgaXQgbXVzdCBiZSBhbiBhcnJheSB3aXRoIHR3b1xuICAgICAqIHN0cmluZyB2YWx1ZXM6IHRoZSBvcGVuaW5nIGFuZCBjbG9zaW5nIHRhZ3MgdXNlZCBpbiB0aGUgdGVtcGxhdGUgKGUuZy5cbiAgICAgKiBbIFwiPCVcIiwgXCIlPlwiIF0pLiBUaGUgZGVmYXVsdCBpcyB0byBtdXN0YWNoZS50YWdzLlxuICAgICAqL1xuICAgIHJlbmRlcih0ZW1wbGF0ZTogc3RyaW5nLCB2aWV3OiBUZW1wbGF0ZVZpZXdQYXJhbSwgcGFydGlhbHM/OiBUZW1wbGF0ZVBhcnRpYWxQYXJhbSwgdGFncz86IFRlbXBsYXRlRGVsaW1pdGVycyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IHsgdG9rZW5zIH0gPSB0aGlzLnBhcnNlKHRlbXBsYXRlLCB0YWdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyVG9rZW5zKHRva2VucywgdmlldywgcGFydGlhbHMsIHRlbXBsYXRlLCB0YWdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb3ctbGV2ZWwgbWV0aG9kIHRoYXQgcmVuZGVycyB0aGUgZ2l2ZW4gYXJyYXkgb2YgYHRva2Vuc2AgdXNpbmdcbiAgICAgKiB0aGUgZ2l2ZW4gYGNvbnRleHRgIGFuZCBgcGFydGlhbHNgLlxuICAgICAqXG4gICAgICogTm90ZTogVGhlIGBvcmlnaW5hbFRlbXBsYXRlYCBpcyBvbmx5IGV2ZXIgdXNlZCB0byBleHRyYWN0IHRoZSBwb3J0aW9uXG4gICAgICogb2YgdGhlIG9yaWdpbmFsIHRlbXBsYXRlIHRoYXQgd2FzIGNvbnRhaW5lZCBpbiBhIGhpZ2hlci1vcmRlciBzZWN0aW9uLlxuICAgICAqIElmIHRoZSB0ZW1wbGF0ZSBkb2Vzbid0IHVzZSBoaWdoZXItb3JkZXIgc2VjdGlvbnMsIHRoaXMgYXJndW1lbnQgbWF5XG4gICAgICogYmUgb21pdHRlZC5cbiAgICAgKi9cbiAgICByZW5kZXJUb2tlbnModG9rZW5zOiBUb2tlbltdLCB2aWV3OiBUZW1wbGF0ZVZpZXdQYXJhbSwgcGFydGlhbHM/OiBUZW1wbGF0ZVBhcnRpYWxQYXJhbSwgb3JpZ2luYWxUZW1wbGF0ZT86IHN0cmluZywgdGFncz86IFRlbXBsYXRlRGVsaW1pdGVycyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSAodmlldyBpbnN0YW5jZW9mIENvbnRleHQpID8gdmlldyA6IG5ldyBDb250ZXh0KHZpZXcgYXMgUGxhaW5PYmplY3QpO1xuICAgICAgICBsZXQgYnVmZmVyID0gJyc7XG5cbiAgICAgICAgZm9yIChjb25zdCB0b2tlbiBvZiB0b2tlbnMpIHtcbiAgICAgICAgICAgIGxldCB2YWx1ZTogc3RyaW5nIHwgdm9pZCB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHN3aXRjaCAodG9rZW5bJC5UWVBFXSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJyMnOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMucmVuZGVyU2VjdGlvbih0b2tlbiwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdeJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnJlbmRlckludmVydGVkKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJz4nOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMucmVuZGVyUGFydGlhbCh0b2tlbiwgY29udGV4dCwgcGFydGlhbHMsIHRhZ3MpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICcmJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnVuZXNjYXBlZFZhbHVlKHRva2VuLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnbmFtZSc6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5lc2NhcGVkVmFsdWUodG9rZW4sIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd0ZXh0JzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnJhd1ZhbHVlKHRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyICs9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZW5kZXJTZWN0aW9uKHRva2VuOiBUb2tlbiwgY29udGV4dDogQ29udGV4dCwgcGFydGlhbHM/OiBUZW1wbGF0ZVBhcnRpYWxQYXJhbSwgb3JpZ2luYWxUZW1wbGF0ZT86IHN0cmluZyk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgbGV0IGJ1ZmZlciA9ICcnO1xuICAgICAgICBsZXQgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblskLlZBTFVFXSk7XG5cbiAgICAgICAgLy8gVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIHJlbmRlciBhbiBhcmJpdHJhcnkgdGVtcGxhdGVcbiAgICAgICAgLy8gaW4gdGhlIGN1cnJlbnQgY29udGV4dCBieSBoaWdoZXItb3JkZXIgc2VjdGlvbnMuXG4gICAgICAgIGNvbnN0IHN1YlJlbmRlciA9ICh0ZW1wbGF0ZTogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICAgICAgICAgIHJldHVybiBzZWxmLnJlbmRlcih0ZW1wbGF0ZSwgY29udGV4dCwgcGFydGlhbHMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCB2IG9mIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyICs9IHRoaXMucmVuZGVyVG9rZW5zKHRva2VuWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSwgY29udGV4dC5wdXNoKHYpLCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoJ29iamVjdCcgPT09IHR5cGVvZiB2YWx1ZSB8fCAnc3RyaW5nJyA9PT0gdHlwZW9mIHZhbHVlIHx8ICdudW1iZXInID09PSB0eXBlb2YgdmFsdWUpIHtcbiAgICAgICAgICAgIGJ1ZmZlciArPSB0aGlzLnJlbmRlclRva2Vucyh0b2tlblskLlRPS0VOX0xJU1RdIGFzIFRva2VuW10sIGNvbnRleHQucHVzaCh2YWx1ZSBhcyBQbGFpbk9iamVjdCksIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAgICAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2Ygb3JpZ2luYWxUZW1wbGF0ZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHVzZSBoaWdoZXItb3JkZXIgc2VjdGlvbnMgd2l0aG91dCB0aGUgb3JpZ2luYWwgdGVtcGxhdGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgdGhlIHBvcnRpb24gb2YgdGhlIG9yaWdpbmFsIHRlbXBsYXRlIHRoYXQgdGhlIHNlY3Rpb24gY29udGFpbnMuXG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLmNhbGwoY29udGV4dC52aWV3LCBvcmlnaW5hbFRlbXBsYXRlLnNsaWNlKHRva2VuWyQuRU5EXSwgdG9rZW5bJC5UQUdfSU5ERVhdKSwgc3ViUmVuZGVyKTtcbiAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyICs9IHZhbHVlIGFzIG51bWJlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1ZmZlciArPSB0aGlzLnJlbmRlclRva2Vucyh0b2tlblskLlRPS0VOX0xJU1RdIGFzIFRva2VuW10sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlbmRlckludmVydGVkKHRva2VuOiBUb2tlbiwgY29udGV4dDogQ29udGV4dCwgcGFydGlhbHM/OiBUZW1wbGF0ZVBhcnRpYWxQYXJhbSwgb3JpZ2luYWxUZW1wbGF0ZT86IHN0cmluZyk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWyQuVkFMVUVdKTtcbiAgICAgICAgaWYgKCF2YWx1ZSB8fCAoaXNBcnJheSh2YWx1ZSkgJiYgMCA9PT0gdmFsdWUubGVuZ3RoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyVG9rZW5zKHRva2VuWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgaW5kZW50UGFydGlhbChwYXJ0aWFsOiBzdHJpbmcsIGluZGVudGF0aW9uOiBzdHJpbmcsIGxpbmVIYXNOb25TcGFjZTogYm9vbGVhbik6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGZpbHRlcmVkSW5kZW50YXRpb24gPSBpbmRlbnRhdGlvbi5yZXBsYWNlKC9bXiBcXHRdL2csICcnKTtcbiAgICAgICAgY29uc3QgcGFydGlhbEJ5TmwgPSBwYXJ0aWFsLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJ0aWFsQnlObC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHBhcnRpYWxCeU5sW2ldLmxlbmd0aCAmJiAoaSA+IDAgfHwgIWxpbmVIYXNOb25TcGFjZSkpIHtcbiAgICAgICAgICAgICAgICBwYXJ0aWFsQnlObFtpXSA9IGZpbHRlcmVkSW5kZW50YXRpb24gKyBwYXJ0aWFsQnlObFtpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFydGlhbEJ5Tmwuam9pbignXFxuJyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVuZGVyUGFydGlhbCh0b2tlbjogVG9rZW4sIGNvbnRleHQ6IENvbnRleHQsIHBhcnRpYWxzOiBUZW1wbGF0ZVBhcnRpYWxQYXJhbSB8IHVuZGVmaW5lZCwgdGFnczogVGVtcGxhdGVEZWxpbWl0ZXJzIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgdm9pZCB7XG4gICAgICAgIGlmICghcGFydGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHZhbHVlID0gKGlzRnVuY3Rpb24ocGFydGlhbHMpID8gcGFydGlhbHModG9rZW5bJC5WQUxVRV0pIDogcGFydGlhbHNbdG9rZW5bJC5WQUxVRV1dKSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCBsaW5lSGFzTm9uU3BhY2UgPSB0b2tlblskLkhBU19OT19TUEFDRV07XG4gICAgICAgICAgICBjb25zdCB0YWdJbmRleCAgICAgICAgPSB0b2tlblskLlRBR19JTkRFWF07XG4gICAgICAgICAgICBjb25zdCBpbmRlbnRhdGlvbiAgICAgPSB0b2tlblskLlRPS0VOX0xJU1RdO1xuICAgICAgICAgICAgbGV0IGluZGVudGVkVmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIGlmICgwID09PSB0YWdJbmRleCAmJiBpbmRlbnRhdGlvbikge1xuICAgICAgICAgICAgICAgIGluZGVudGVkVmFsdWUgPSB0aGlzLmluZGVudFBhcnRpYWwodmFsdWUsIGluZGVudGF0aW9uIGFzIHN0cmluZywgbGluZUhhc05vblNwYWNlISk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB7IHRva2VucyB9ID0gdGhpcy5wYXJzZShpbmRlbnRlZFZhbHVlLCB0YWdzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlbmRlclRva2Vucyh0b2tlbnMsIGNvbnRleHQsIHBhcnRpYWxzLCBpbmRlbnRlZFZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVuZXNjYXBlZFZhbHVlKHRva2VuOiBUb2tlbiwgY29udGV4dDogQ29udGV4dCk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWyQuVkFMVUVdKTtcbiAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZSBhcyBzdHJpbmc7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBlc2NhcGVkVmFsdWUodG9rZW46IFRva2VuLCBjb250ZXh0OiBDb250ZXh0KTogc3RyaW5nIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gY29udGV4dC5sb29rdXAodG9rZW5bJC5WQUxVRV0pO1xuICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGdsb2JhbFNldHRpbmdzLmVzY2FwZSh2YWx1ZSBhcyBzdHJpbmcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmF3VmFsdWUodG9rZW46IFRva2VuKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRva2VuWyQuVkFMVUVdO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgSlNULFxuICAgIFRlbXBsYXRlRGVsaW1pdGVycyxcbiAgICBJVGVtcGxhdGVFbmdpbmUsXG4gICAgVGVtcGxhdGVTY2FubmVyLFxuICAgIFRlbXBsYXRlQ29udGV4dCxcbiAgICBUZW1wbGF0ZVdyaXRlcixcbiAgICBUZW1wbGF0ZUVzY2FwZXIsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBnbG9iYWxTZXR0aW5ncyB9IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHsgQ2FjaGVMb2NhdGlvbiwgY2xlYXJDYWNoZSB9IGZyb20gJy4vY2FjaGUnO1xuaW1wb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc1N0cmluZyxcbiAgICB0eXBlU3RyaW5nLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IFNjYW5uZXIgfSBmcm9tICcuL3NjYW5uZXInO1xuaW1wb3J0IHsgQ29udGV4dCB9IGZyb20gJy4vY29udGV4dCc7XG5pbXBvcnQgeyBXcml0ZXIgfSBmcm9tICcuL3dyaXRlcic7XG5cbi8qKiB7QGxpbmsgVGVtcGxhdGVFbmdpbmV9IGNvbW1vbiBzZXR0aW5ncyAqL1xuZ2xvYmFsU2V0dGluZ3Mud3JpdGVyID0gbmV3IFdyaXRlcigpO1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgVGVtcGxhdGVFbmdpbmV9IGdsb2JhbCBzZXR0bmcgb3B0aW9uc1xuICogQGphIHtAbGluayBUZW1wbGF0ZUVuZ2luZX0g44Kw44Ot44O844OQ44Or6Kit5a6a44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVHbG9iYWxTZXR0aW5ncyB7XG4gICAgd3JpdGVyPzogVGVtcGxhdGVXcml0ZXI7XG4gICAgdGFncz86IFRlbXBsYXRlRGVsaW1pdGVycztcbiAgICBlc2NhcGU/OiBUZW1wbGF0ZUVzY2FwZXI7XG59XG5cbi8qKlxuICogQGVuIHtAbGluayBUZW1wbGF0ZUVuZ2luZX0gY29tcGlsZSBvcHRpb25zXG4gKiBAamEge0BsaW5rIFRlbXBsYXRlRW5naW5lfSDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zIHtcbiAgICB0YWdzPzogVGVtcGxhdGVEZWxpbWl0ZXJzO1xufVxuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZUVuZ2luZSB1dGlsaXR5IGNsYXNzLlxuICogQGphIFRlbXBsYXRlRW5naW5lIOODpuODvOODhuOCo+ODquODhuOCo+OCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVFbmdpbmUgaW1wbGVtZW50cyBJVGVtcGxhdGVFbmdpbmUge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIHN0YXRpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB7QGxpbmsgSlNUfSBmcm9tIHRlbXBsYXRlIHNvdXJjZS5cbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI5paH5a2X5YiX44GL44KJIHtAbGluayBKU1R9IOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHRlbXBsYXRlXG4gICAgICogIC0gYGVuYCB0ZW1wbGF0ZSBzb3VyY2Ugc3RyaW5nXG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJdcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29tcGlsZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNvbXBpbGUodGVtcGxhdGU6IHN0cmluZywgb3B0aW9ucz86IFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMpOiBKU1Qge1xuICAgICAgICBpZiAoIWlzU3RyaW5nKHRlbXBsYXRlKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgSW52YWxpZCB0ZW1wbGF0ZSEgdGhlIGZpcnN0IGFyZ3VtZW50IHNob3VsZCBiZSBhIFwic3RyaW5nXCIgYnV0IFwiJHt0eXBlU3RyaW5nKHRlbXBsYXRlKX1cIiB3YXMgZ2l2ZW4gZm9yIFRlbXBsYXRlRW5naW5lLmNvbXBpbGUodGVtcGxhdGUsIG9wdGlvbnMpYCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHRhZ3MgfSA9IG9wdGlvbnMgPz8gZ2xvYmFsU2V0dGluZ3M7XG4gICAgICAgIGNvbnN0IHsgd3JpdGVyIH0gPSBnbG9iYWxTZXR0aW5ncztcblxuICAgICAgICBjb25zdCBqc3QgPSAodmlldz86IFBsYWluT2JqZWN0LCBwYXJ0aWFscz86IFBsYWluT2JqZWN0KTogc3RyaW5nID0+IHtcbiAgICAgICAgICAgIHJldHVybiB3cml0ZXIucmVuZGVyKHRlbXBsYXRlLCB2aWV3ID8/IHt9LCBwYXJ0aWFscywgdGFncyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgeyB0b2tlbnMsIGNhY2hlS2V5IH0gPSB3cml0ZXIucGFyc2UodGVtcGxhdGUsIHRhZ3MpO1xuICAgICAgICBqc3QudG9rZW5zICAgICAgICA9IHRva2VucztcbiAgICAgICAganN0LmNhY2hlS2V5ICAgICAgPSBjYWNoZUtleTtcbiAgICAgICAganN0LmNhY2hlTG9jYXRpb24gPSBbQ2FjaGVMb2NhdGlvbi5OQU1FU1BBQ0UsIENhY2hlTG9jYXRpb24uUk9PVF07XG5cbiAgICAgICAgcmV0dXJuIGpzdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXJzIGFsbCBjYWNoZWQgdGVtcGxhdGVzIGluIHRoZSBkZWZhdWx0IHtAbGluayBUZW1wbGF0ZVdyaXRlcn0uXG4gICAgICogQGphIOaXouWumuOBriB7QGxpbmsgVGVtcGxhdGVXcml0ZXJ9IOOBruOBmeOBueOBpuOBruOCreODo+ODg+OCt+ODpeOCkuWJiumZpFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY2xlYXJDYWNoZSgpOiB2b2lkIHtcbiAgICAgICAgY2xlYXJDYWNoZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGFuZ2Uge0BsaW5rIFRlbXBsYXRlRW5naW5lfSBnbG9iYWwgc2V0dGluZ3MuXG4gICAgICogQGphIHtAbGluayBUZW1wbGF0ZUVuZ2luZX0g44Kw44Ot44O844OQ44Or6Kit5a6a44Gu5pu05pawXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2V0dGluZ3NcbiAgICAgKiAgLSBgZW5gIG5ldyBzZXR0aW5nc1xuICAgICAqICAtIGBqYWAg5paw44GX44GE6Kit5a6a5YCkXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG9sZCBzZXR0aW5nc1xuICAgICAqICAtIGBqYWAg5Y+k44GE6Kit5a6a5YCkXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBzZXRHbG9iYWxTZXR0aW5ncyhzZXRpaW5nczogVGVtcGxhdGVHbG9iYWxTZXR0aW5ncyk6IFRlbXBsYXRlR2xvYmFsU2V0dGluZ3Mge1xuICAgICAgICBjb25zdCBvbGRTZXR0aW5ncyA9IHsgLi4uZ2xvYmFsU2V0dGluZ3MgfTtcbiAgICAgICAgY29uc3QgeyB3cml0ZXIsIHRhZ3MsIGVzY2FwZSB9ID0gc2V0aWluZ3M7XG4gICAgICAgIHdyaXRlciAmJiAoZ2xvYmFsU2V0dGluZ3Mud3JpdGVyID0gd3JpdGVyKTtcbiAgICAgICAgdGFncyAgICYmIChnbG9iYWxTZXR0aW5ncy50YWdzICAgPSB0YWdzKTtcbiAgICAgICAgZXNjYXBlICYmIChnbG9iYWxTZXR0aW5ncy5lc2NhcGUgPSBlc2NhcGUpO1xuICAgICAgICByZXR1cm4gb2xkU2V0dGluZ3M7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIHN0YXRpYyBtZXRob2RzOiBmb3IgZGVidWdcblxuICAgIC8qKiBAaW50ZXJuYWwgQ3JlYXRlIHtAbGluayBUZW1wbGF0ZVNjYW5uZXJ9IGluc3RhbmNlICovXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGVTY2FubmVyKHNyYzogc3RyaW5nKTogVGVtcGxhdGVTY2FubmVyIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTY2FubmVyKHNyYyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBDcmVhdGUge0BsaW5rIFRlbXBsYXRlQ29udGV4dH0gaW5zdGFuY2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZUNvbnRleHQodmlldzogUGxhaW5PYmplY3QsIHBhcmVudENvbnRleHQ/OiBDb250ZXh0KTogVGVtcGxhdGVDb250ZXh0IHtcbiAgICAgICAgcmV0dXJuIG5ldyBDb250ZXh0KHZpZXcsIHBhcmVudENvbnRleHQpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgQ3JlYXRlIHtAbGluayBUZW1wbGF0ZVdyaXRlcn0gaW5zdGFuY2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZVdyaXRlcigpOiBUZW1wbGF0ZVdyaXRlciB7XG4gICAgICAgIHJldHVybiBuZXcgV3JpdGVyKCk7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbImlzTnVtYmVyIiwiX3Rva2VucyIsIl9wcm94eUhhbmRsZXIiLCJjYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztJQUVBOzs7Ozs7O0lBT0c7SUFDYSxTQUFBLFNBQVMsR0FBQTs7SUFFckIsSUFBQSxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sVUFBVSxJQUFJLFVBQVUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztJQUNyRixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7SUFVRztJQUNhLFNBQUEsWUFBWSxDQUFtQyxNQUFxQixFQUFFLEdBQUcsS0FBZSxFQUFBO0lBQ3BHLElBQUEsSUFBSSxJQUFJLElBQUksTUFBTSxJQUFJLFNBQVMsRUFBRSxD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UUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFELFFBQUEsR0FBRyxDQUFDLE1BQU0sR0FBVSxNQUFNLENBQUM7SUFDM0IsUUFBQSxHQUFHLENBQUMsUUFBUSxHQUFRLFFBQVEsQ0FBQztJQUM3QixRQUFBLEdBQUcsQ0FBQyxhQUFhLEdBQUcsQ0FBQSxhQUFBLGdDQUFBLGdCQUFBLDBCQUE2QyxDQUFDO0lBRWxFLFFBQUEsT0FBTyxHQUFHLENBQUM7SUFDZCxLQUFBO0lBRUQ7OztJQUdHO0lBQ0ksSUFBQSxPQUFPLFVBQVUsR0FBQTtJQUNwQixRQUFBLFVBQVUsRUFBRSxDQUFDO0lBQ2hCLEtBQUE7SUFFRDs7Ozs7Ozs7OztJQVVHO1FBQ0ksT0FBTyxpQkFBaUIsQ0FBQyxRQUFnQyxFQUFBO0lBQzVELFFBQUEsTUFBTSxXQUFXLEdBQUcsRUFBRSxHQUFHLGNBQWMsRUFBRSxDQUFDO1lBQzFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQztJQUMxQyxRQUFBLE1BQU0sS0FBSyxjQUFjLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQzNDLFFBQUEsSUFBSSxLQUFPLGNBQWMsQ0FBQyxJQUFJLEdBQUssSUFBSSxDQUFDLENBQUM7SUFDekMsUUFBQSxNQUFNLEtBQUssY0FBYyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQztJQUMzQyxRQUFBLE9BQU8sV0FBVyxDQUFDO0lBQ3RCLEtBQUE7Ozs7UUFNTSxPQUFPLGFBQWEsQ0FBQyxHQUFXLEVBQUE7SUFDbkMsUUFBQSxPQUFPLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzNCLEtBQUE7O0lBR00sSUFBQSxPQUFPLGFBQWEsQ0FBQyxJQUFpQixFQUFFLGFBQXVCLEVBQUE7SUFDbEUsUUFBQSxPQUFPLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztJQUMzQyxLQUFBOztJQUdNLElBQUEsT0FBTyxZQUFZLEdBQUE7WUFDdEIsT0FBTyxJQUFJLE1BQU0sRUFBRSxDQUFDO0lBQ3ZCLEtBQUE7SUFDSjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2xpYi1jb3JlLyJ9