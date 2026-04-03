/*!
 * @cdp/core-utils 0.9.22
 *   core domain utilities
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}));
})(this, (function (exports) { 'use strict';

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
            root[name] = root[name] ?? {};
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
        @typescript-eslint/no-unsafe-function-type,
        @typescript-eslint/no-empty-object-type,
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
        return (Object.prototype.toString.call(x)).slice(8, -1);
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
        @typescript-eslint/no-unsafe-function-type,
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
                    const obj = inst;
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                    return orgInstanceOf.call(srcClass, inst) || ((obj?.[_isInherited]) ? obj[_isInherited](srcClass) : false);
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
        const resolve = (o, p) => {
            return isFunction(p) ? p.call(o) : p;
        };
        const props = isArray(property) ? property : [property];
        if (!props.length) {
            return resolve(target, fallback);
        }
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
            lastThis = this; // eslint-disable-line @typescript-eslint/no-this-alias
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
            timerId ??= setTimeout(timerExpired, waitValue);
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
        let memo;
        return function (...args) {
            if (executor) {
                memo = executor.call(this, ...args);
                executor = null;
            }
            return memo;
        };
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
            id ??= post(runTasks);
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
            const _data = data;
            // create groupBy internal key
            const _key = keys.reduce((s, k) => s + String(_data[k]), '');
            // init keys
            if (!(_key in res)) {
                const keyList = keys.reduce((h, k) => {
                    assignValue(h, k, _data[k]);
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
                    resKey[k] = resKey[k] || []; // eslint-disable-line @typescript-eslint/prefer-nullish-coalescing
                    resKey[k].push(data);
                }
                else {
                    resKey[k] += _data[k];
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
            return await callback.call(thisArg ?? this, v, i, a);
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
        const bits = await map(array, (v, i, a) => callback.call(thisArg ?? this, v, i, a));
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
            if (await callback.call(thisArg ?? this, v, i, array)) {
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
            if (await callback.call(thisArg ?? this, v, i, array)) {
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
            if (await callback.call(thisArg ?? this, v, i, array)) {
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
            if (!await callback.call(thisArg ?? this, v, i, array)) {
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

    exports.$cdp = $cdp;
    exports.assignValue = assignValue;
    exports.at = at;
    exports.camelize = camelize;
    exports.capitalize = capitalize;
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
    exports.isNumber = isNumber;
    exports.isNumeric = isNumeric;
    exports.isObject = isObject;
    exports.isPlainObject = isPlainObject;
    exports.isPrimitive = isPrimitive;
    exports.isStatusIn = isStatusIn;
    exports.isString = isString;
    exports.isSymbol = isSymbol;
    exports.isTypedArray = isTypedArray;
    exports.luid = luid;
    exports.map = map;
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
    exports.toTypedData = toTypedData;
    exports.typeOf = typeOf;
    exports.underscored = underscored;
    exports.unescapeHTML = unescapeHTML;
    exports.union = union;
    exports.unique = unique;
    exports.verify = verify;
    exports.without = without;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS11dGlscy5qcyIsInNvdXJjZXMiOlsiY29uZmlnLnRzIiwidHlwZXMudHMiLCJ2ZXJpZnkudHMiLCJkZWVwLWNpcmN1aXQudHMiLCJtaXhpbnMudHMiLCJvYmplY3QudHMiLCJzYWZlLnRzIiwidGltZXIudHMiLCJtaXNjLnRzIiwiYXJyYXkudHMiLCJkYXRlLnRzIiwic3RhdHVzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgVW5rbm93bk9iamVjdCB9IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIEBlbiBTYWZlIGBnbG9iYWxgIGFjY2Vzc29yLlxuICogQGphIGBnbG9iYWxgIOOCouOCr+OCu+ODg+OCtVxuICpcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIGBnbG9iYWxgIG9iamVjdCBvZiB0aGUgcnVudGltZSBlbnZpcm9ubWVudFxuICogIC0gYGphYCDnkrDlooPjgavlv5zjgZjjgZ8gYGdsb2JhbGAg44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWwoKTogdHlwZW9mIGdsb2JhbFRoaXMge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1uZXctZnVuYywgQHR5cGVzY3JpcHQtZXNsaW50L25vLWltcGxpZWQtZXZhbFxuICAgIHJldHVybiAoJ29iamVjdCcgPT09IHR5cGVvZiBnbG9iYWxUaGlzKSA/IGdsb2JhbFRoaXMgOiBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xufVxuXG4vKipcbiAqIEBlbiBFbnN1cmUgbmFtZWQgb2JqZWN0IGFzIHBhcmVudCdzIHByb3BlcnR5LlxuICogQGphIOimquOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumuOBl+OBpiwg5ZCN5YmN44Gr5oyH5a6a44GX44Gf44Kq44OW44K444Kn44Kv44OI44Gu5a2Y5Zyo44KS5L+d6Ki8XG4gKlxuICogQHBhcmFtIHBhcmVudFxuICogIC0gYGVuYCBwYXJlbnQgb2JqZWN0LiBJZiBudWxsIGdpdmVuLCBgZ2xvYmFsVGhpc2AgaXMgYXNzaWduZWQuXG4gKiAgLSBgamFgIOimquOCquODluOCuOOCp+OCr+ODiC4gbnVsbCDjga7loLTlkIjjga8gYGdsb2JhbFRoaXNgIOOBjOS9v+eUqOOBleOCjOOCi1xuICogQHBhcmFtIG5hbWVzXG4gKiAgLSBgZW5gIG9iamVjdCBuYW1lIGNoYWluIGZvciBlbnN1cmUgaW5zdGFuY2UuXG4gKiAgLSBgamFgIOS/neiovOOBmeOCi+OCquODluOCuOOCp+OCr+ODiOOBruWQjeWJjVxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlT2JqZWN0PFQgZXh0ZW5kcyBvYmplY3QgPSBVbmtub3duT2JqZWN0PihwYXJlbnQ6IG9iamVjdCB8IG51bGwsIC4uLm5hbWVzOiBzdHJpbmdbXSk6IFQge1xuICAgIGxldCByb290ID0gKHBhcmVudCA/PyBnZXRHbG9iYWwoKSkgYXMgVW5rbm93bk9iamVjdDtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgbmFtZXMpIHtcbiAgICAgICAgcm9vdFtuYW1lXSA9IHJvb3RbbmFtZV0gPz8ge307XG4gICAgICAgIHJvb3QgPSByb290W25hbWVdIGFzIFVua25vd25PYmplY3Q7XG4gICAgfVxuICAgIHJldHVybiByb290IGFzIFQ7XG59XG5cbi8qKlxuICogQGVuIEdsb2JhbCBuYW1lc3BhY2UgYWNjZXNzb3IuXG4gKiBAamEg44Kw44Ot44O844OQ44Or44ON44O844Og44K544Oa44O844K544Ki44Kv44K744OD44K1XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWxOYW1lc3BhY2U8VCBleHRlbmRzIG9iamVjdCA9IFVua25vd25PYmplY3Q+KG5hbWVzcGFjZTogc3RyaW5nKTogVCB7XG4gICAgcmV0dXJuIGVuc3VyZU9iamVjdDxUPihudWxsLCBuYW1lc3BhY2UpO1xufVxuXG4vKipcbiAqIEBlbiBHbG9iYWwgY29uZmlnIGFjY2Vzc29yLlxuICogQGphIOOCsOODreODvOODkOODq+OCs+ODs+ODleOCo+OCsOOCouOCr+OCu+ODg+OCtVxuICpcbiAqIEByZXR1cm5zIGRlZmF1bHQ6IGBDRFAuQ29uZmlnYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnPFQgZXh0ZW5kcyBvYmplY3QgPSBVbmtub3duT2JqZWN0PihuYW1lc3BhY2UgPSAnQ0RQJywgY29uZmlnTmFtZSA9ICdDb25maWcnKTogVCB7XG4gICAgcmV0dXJuIGVuc3VyZU9iamVjdDxUPihnZXRHbG9iYWxOYW1lc3BhY2UobmFtZXNwYWNlKSwgY29uZmlnTmFtZSk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1mdW5jdGlvbi10eXBlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1vYmplY3QtdHlwZSxcbiAqL1xuXG4vKipcbiAqIEBlbiBQcmltaXRpdmUgdHlwZSBvZiBKYXZhU2NyaXB0LlxuICogQGphIEphdmFTY3JpcHQg44Gu44OX44Oq44Of44OG44Kj44OW5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFByaW1pdGl2ZSA9IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBzeW1ib2wgfCBiaWdpbnQgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlbiBUaGUgZ2VuZXJhbCBudWxsIHR5cGUuXG4gKiBAamEg56m644KS56S644GZ5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIE51bGxpc2ggPSB2b2lkIHwgbnVsbCB8IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBAZW4gVGhlIHR5cGUgb2Ygb2JqZWN0IG9yIHtAbGluayBOdWxsaXNofS5cbiAqIEBqYSB7QGxpbmsgTnVsbGlzaH0g44Gr44Gq44KK44GI44KL44Kq44OW44K444Kn44Kv44OI5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIE51bGxhYmxlPFQgZXh0ZW5kcyBvYmplY3Q+ID0gVCB8IE51bGxpc2g7XG5cbi8qKlxuICogQGVuIEdlbmVyYWwgZnVuY3Rpb24gdHlwZSBmb3IgZGlyZWN0IGludm9jYXRpb24gYW5kIHR5cGUgYXNzZXJ0aW9ucy5cbiAqIEBqYSDnm7TmjqXlkbzjgbPlh7rjgZfjg7vlnovjgqLjgrXjg7zjgrfjg6fjg7PnlKjjga7msY7nlKjplqLmlbDlnotcbiAqL1xuZXhwb3J0IHR5cGUgVW5rbm93bkZ1bmN0aW9uID0gKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bjtcblxuLyoqXG4gKiBAZW4gR2VuZXJhbCBmdW5jdGlvbiB0eXBlIGZvciBnZW5lcmljIGNvbnN0cmFpbnRzLiBUeXBlIGluZmVyZW5jZSBpcyBwcmVzZXJ2ZWQgdGhyb3VnaCB0aGUgdHlwZSB2YXJpYWJsZSBgVGAuXG4gKiBAamEg44K444Kn44ON44Oq44OD44Kv5Yi257SE55So44Gu5rGO55So6Zai5pWw5Z6LLiDlnovlpInmlbAgYFRgIOOCkumAmuOBmOOBpuWei+aOqOirluOCkue2reaMgeOBmeOCi1xuICovXG5leHBvcnQgdHlwZSBBbnlGdW5jdGlvbiA9ICguLi5hcmdzOiBhbnlbXSkgPT4gYW55O1xuXG4vKipcbiAqIEBlbiBBdm9pZCB0aGUgYE9iamVjdGAgYW5kIGB7fWAgdHlwZXMsIGFzIHRoZXkgbWVhbiBcImFueSBub24tbnVsbGlzaCB2YWx1ZVwiLlxuICogQGphIOaxjueUqOOCquODluOCuOOCp+OCr+ODiOWeiy4gYE9iamVjdGAg44GK44KI44GzIGB7fWAg44K/44Kk44OX44Gv44CMbnVsbOOBp+OBquOBhOWApOOAjeOCkuaEj+WRs+OBmeOCi+OBn+OCgeS7o+S+oeOBqOOBl+OBpuS9v+eUqFxuICovXG5leHBvcnQgdHlwZSBVbmtub3duT2JqZWN0ID0gUmVjb3JkPHN0cmluZyB8IG51bWJlciB8IHN5bWJvbCwgdW5rbm93bj47XG5cbi8qKlxuICogQGVuIEphdmFTY3JpcHQgdHlwZSBzZXQgaW50ZXJmYWNlLlxuICogQGphIEphdmFTY3JpcHQg44Gu5Z6L44Gu6ZuG5ZCIXG4gKi9cbmludGVyZmFjZSBUeXBlTGlzdCB7XG4gICAgc3RyaW5nOiBzdHJpbmc7XG4gICAgbnVtYmVyOiBudW1iZXI7XG4gICAgYm9vbGVhbjogYm9vbGVhbjtcbiAgICBzeW1ib2w6IHN5bWJvbDtcbiAgICBiaWdpbnQ6IGJpZ2ludDtcbiAgICB1bmRlZmluZWQ6IHZvaWQgfCB1bmRlZmluZWQ7XG4gICAgb2JqZWN0OiBvYmplY3QgfCBudWxsO1xuICAgIGZ1bmN0aW9uKC4uLmFyZ3M6IHVua25vd25bXSk6IHVua25vd247XG59XG5cbi8qKlxuICogQGVuIFRoZSBrZXkgbGlzdCBvZiB7QGxpbmsgVHlwZUxpc3R9LlxuICogQGphIHtAbGluayBUeXBlTGlzdH0g44Kt44O85LiA6KanXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVLZXlzID0ga2V5b2YgVHlwZUxpc3Q7XG5cbi8qKlxuICogQGVuIFR5cGUgYmFzZSBkZWZpbml0aW9uLlxuICogQGphIOWei+OBruimj+WumuWumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFR5cGU8VCBleHRlbmRzIG9iamVjdD4gZXh0ZW5kcyBGdW5jdGlvbiB7XG4gICAgcmVhZG9ubHkgcHJvdG90eXBlOiBUO1xufVxuXG4vKipcbiAqIEBlbiBUeXBlIG9mIGNvbnN0cnVjdG9yLlxuICogQGphIOOCs+ODs+OCueODiOODqeOCr+OCv+Wei1xuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbnN0cnVjdG9yPFQgZXh0ZW5kcyBvYmplY3Q+IGV4dGVuZHMgVHlwZTxUPiB7XG4gICAgbmV3KC4uLmFyZ3M6IGFueVtdKTogVDtcbn1cblxuLyoqXG4gKiBAZW4gVHlwZSBvZiBjbGFzcy5cbiAqIEBqYSDjgq/jg6njgrnlnotcbiAqL1xuZXhwb3J0IHR5cGUgQ2xhc3M8VCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4gPSBDb25zdHJ1Y3RvcjxUPjtcblxuLyoqXG4gKiBAZW4gRW5zdXJlIGZvciBmdW5jdGlvbiBwYXJhbWV0ZXJzIHRvIHR1cGxlLlxuICogQGphIOmWouaVsOODkeODqeODoeODvOOCv+OBqOOBl+OBpiB0dXBsZSDjgpLkv53oqLxcbiAqL1xuZXhwb3J0IHR5cGUgQXJndW1lbnRzPFQ+ID0gVCBleHRlbmRzIGFueVtdID8gVCA6IFtUXTtcblxuLyoqXG4gKiBAZW4gUm1vdmUgYHJlYWRvbmx5YCBhdHRyaWJ1dGVzIGZyb20gaW5wdXQgdHlwZS5cbiAqIEBqYSBgcmVhZG9ubHlgIOWxnuaAp+OCkuino+mZpFxuICovXG5leHBvcnQgdHlwZSBXcml0YWJsZTxUPiA9IHsgLXJlYWRvbmx5IFtLIGluIGtleW9mIFRdOiBUW0tdIH07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gc3Vic2NyaXB0IGFjY2Vzc2libGUgdHlwZS5cbiAqIEBqYSDmt7vjgYjlrZfjgqLjgq/jgrvjgrnlj6/og73jgarlnovjgavlpInmj5tcbiAqL1xuZXhwb3J0IHR5cGUgQWNjZXNzaWJsZTxULCBTID0gdW5rbm93bj4gPSBUICYgUmVjb3JkPHN0cmluZyB8IG51bWJlciB8IHN5bWJvbCwgUz47XG5cbi8qKlxuICogQGVuIEV4dHJhY3QgZnVuY3Rpb25hbCBwcm9wZXJ0eSBuYW1lcy5cbiAqIEBqYSDplqLmlbDjg5fjg63jg5Hjg4bjgqPlkI3jga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+ID0geyBbSyBpbiBrZXlvZiBUXTogVFtLXSBleHRlbmRzIEZ1bmN0aW9uID8gSyA6IG5ldmVyIH1ba2V5b2YgVF0gJiBzdHJpbmc7XG5cbi8qKlxuICogQGVuIEV4dHJhY3QgZnVuY3Rpb25hbCBwcm9wZXJ0aWVzLlxuICogQGphIOmWouaVsOODl+ODreODkeODhuOCo+OBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBGdW5jdGlvblByb3BlcnRpZXM8VD4gPSBQaWNrPFQsIEZ1bmN0aW9uUHJvcGVydHlOYW1lczxUPj47XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgbm9uLWZ1bmN0aW9uYWwgcHJvcGVydHkgbmFtZXMuXG4gKiBAamEg6Z2e6Zai5pWw44OX44Ot44OR44OG44Kj5ZCN44Gu5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxUPiA9IHsgW0sgaW4ga2V5b2YgVF06IFRbS10gZXh0ZW5kcyBGdW5jdGlvbiA/IG5ldmVyIDogSyB9W2tleW9mIFRdICYgc3RyaW5nO1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG5vbi1mdW5jdGlvbmFsIHByb3BlcnRpZXMuXG4gKiBAamEg6Z2e6Zai5pWw44OX44Ot44OR44OG44Kj44Gu5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIE5vbkZ1bmN0aW9uUHJvcGVydGllczxUPiA9IFBpY2s8VCwgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+PjtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBub24tZnVuY3Rpb25hbCB0eXBlcy5cbiAqIEBqYSDpnZ7plqLmlbDlnovjga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgTm9uRnVuY3Rpb248VD4gPSBUIGV4dGVuZHMgRnVuY3Rpb24gPyBuZXZlciA6IFQ7XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgb2JqZWN0IGtleSBsaXN0LiAoZW5zdXJlIG9ubHkgJ3N0cmluZycpXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu44Kt44O85LiA6Kan44KS5oq95Ye6ICgnc3RyaW5nJyDlnovjga7jgb/jgpLkv53oqLwpXG4gKi9cbmV4cG9ydCB0eXBlIEtleXM8VCBleHRlbmRzIG9iamVjdD4gPSBrZXlvZiBPbWl0PFQsIG51bWJlciB8IHN5bWJvbD47XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgb2JqZWN0IHR5cGUgbGlzdC5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7lnovkuIDopqfjgpLmir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZXM8VCBleHRlbmRzIG9iamVjdD4gPSBUW2tleW9mIFRdO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IG9iamVjdCBrZXkgdG8gdHlwZS5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjgq3jg7zjgYvjgonlnovjgbjlpInmj5tcbiAqL1xuZXhwb3J0IHR5cGUgS2V5VG9UeXBlPE8gZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBrZXlvZiBPPiA9IEsgZXh0ZW5kcyBrZXlvZiBPID8gT1tLXSA6IG5ldmVyO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IG9iamVjdCB0eXBlIHRvIGtleS5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jlnovjgYvjgonjgq3jg7zjgbjlpInmj5tcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZVRvS2V5PE8gZXh0ZW5kcyBvYmplY3QsIFQgZXh0ZW5kcyBUeXBlczxPPj4gPSB7IFtLIGluIGtleW9mIE9dOiBPW0tdIGV4dGVuZHMgVCA/IEsgOiBuZXZlciB9W2tleW9mIE9dO1xuXG4vKipcbiAqIEBlbiBUaGUge0BsaW5rIFBsYWluT2JqZWN0fSB0eXBlIGlzIGEgSmF2YVNjcmlwdCBvYmplY3QgY29udGFpbmluZyB6ZXJvIG9yIG1vcmUga2V5LXZhbHVlIHBhaXJzLiA8YnI+XG4gKiAgICAgJ1BsYWluJyBtZWFucyBpdCBmcm9tIG90aGVyIGtpbmRzIG9mIEphdmFTY3JpcHQgb2JqZWN0cy4gZXg6IG51bGwsIHVzZXItZGVmaW5lZCBhcnJheXMsIGFuZCBob3N0IG9iamVjdHMgc3VjaCBhcyBgZG9jdW1lbnRgLlxuICogQGphIDAg5Lul5LiK44GuIGtleS12YWx1ZSDjg5rjgqLjgpLmjIHjgaQge0BsaW5rIFBsYWluT2JqZWN0fSDlrprnvqkgPGJyPlxuICogICAgICdQbGFpbicg44Go44Gv5LuW44Gu56iu6aGe44GuIEphdmFTY3JpcHQg44Kq44OW44K444Kn44Kv44OI44KS5ZCr44G+44Gq44GE44Kq44OW44K444Kn44Kv44OI44KS5oSP5ZGz44GZ44KLLiDkvos6ICBudWxsLCDjg6bjg7zjgrbjg7zlrprnvqnphY3liJcsIOOBvuOBn+OBryBgZG9jdW1lbnRgIOOBruOCiOOBhuOBque1hOOBv+i+vOOBv+OCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgdHlwZSBQbGFpbk9iamVjdDxUID0ge30gfCBudWxsIHwgdW5kZWZpbmVkPiA9IFJlY29yZDxzdHJpbmcsIFQ+O1xuXG4vKipcbiAqIEBlbiBPYmplY3QgY2FuIGJlIGd1YXJhbnRlZWQgZGVmaW5pdGlvbi4gQmUgY2FyZWZ1bCBub3QgdG8gYWJ1c2UgaXQgYmVjYXVzZSBpdCBkb2VzIG5vdCBmb3JjZSB0aGUgY2FzdC5cbiAqICAgLSBVbmxpa2Uge0BsaW5rIFBsYWluT2JqZWN0fSwgaXQgY2FuIGFjY2VwdCBDbGFzcyAoYnVpbHQtaW4gb2JqZWN0KSwgQXJyYXksIEZ1bmN0aW9uLlxuICogICAtIFVubGlrZSBgb2JqZWN0YCwgeW91IGNhbiBhY2Nlc3MgdW5rbm93biBwcm9wZXJ0aWVzLlxuICogICAtIFVubGlrZSBge30gLyBPYmplY3RgLCBpdCBjYW4gcmVwZWwge0BsaW5rIFByaW1pdGl2ZX0uXG4gKiBAamEgT2JqZWN0IOOCkuS/neiovOWPr+iDveOBquWumue+qS4g44Kt44Oj44K544OI44KS5by35Yi244GX44Gq44GE44Gf44KB5Lmx55So44GX44Gq44GE44KI44GG44Gr5rOo5oSP44GM5b+F6KaBLlxuICogICAtIHtAbGluayBQbGFpbk9iamVjdH0g44Go6YGV44GE44CBQ2xhc3MgKOe1hOOBv+i+vOOBv+OCquODluOCuOOCp+OCr+ODiCksIEFycmF5LCBGdW5jdGlvbiDjgpLlj5fjgZHku5jjgZHjgovjgZPjgajjgYzjgafjgY3jgosuXG4gKiAgIC0gYG9iamVjdGAg44Go6YGV44GE44CB5pyq55+l44Gu44OX44Ot44OR44OG44Kj44Gr44Ki44Kv44K744K544GZ44KL44GT44Go44GM44Gn44GN44KLLlxuICogICAtIGB7fSAvIE9iamVjdGAg44Go6YGV44GE44CBe0BsaW5rIFByaW1pdGl2ZX0g44KS44Gv44GY44GP44GT44Go44GM44Gn44GN44KLLlxuICovXG5leHBvcnQgdHlwZSBBbnlPYmplY3QgPSBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xuXG4vKipcbiAqIEBlbiBUaGUgZGF0YSB0eXBlIGxpc3QgYnkgd2hpY2ggc3R5bGUgY29tcHVsc2lvbiBpcyBwb3NzaWJsZS5cbiAqIEBqYSDlnovlvLfliLblj6/og73jgarjg4fjg7zjgr/lnovkuIDopqdcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZWREYXRhID0gc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGwgfCBvYmplY3Q7XG5cbi8qKlxuICogQGVuIFRoZSBkYXRhIHR5cGUgbGlzdCBvZiBUeXBlZEFycmF5LlxuICogQGphIFR5cGVkQXJyYXkg5LiA6KanXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVkQXJyYXkgPSBJbnQ4QXJyYXkgfCBVaW50OEFycmF5IHwgVWludDhDbGFtcGVkQXJyYXkgfCBJbnQxNkFycmF5IHwgVWludDE2QXJyYXkgfCBJbnQzMkFycmF5IHwgVWludDMyQXJyYXkgfCBGbG9hdDMyQXJyYXkgfCBGbG9hdDY0QXJyYXk7XG5cbi8qKlxuICogQGVuIFR5cGVkQXJyYXkgY29uc3RydWN0b3IuXG4gKiBAamEgVHlwZWRBcnJheSDjgrPjg7Pjgrnjg4jjg6njgq/jgr/lrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUeXBlZEFycmF5Q29uc3RydWN0b3Ige1xuICAgIHJlYWRvbmx5IHByb3RvdHlwZTogVHlwZWRBcnJheTtcbiAgICBuZXcoc2VlZDogbnVtYmVyIHwgQXJyYXlMaWtlPG51bWJlcj4gfCBBcnJheUJ1ZmZlckxpa2UpOiBUeXBlZEFycmF5O1xuICAgIG5ldyhidWZmZXI6IEFycmF5QnVmZmVyTGlrZSwgYnl0ZU9mZnNldD86IG51bWJlciwgbGVuZ3RoPzogbnVtYmVyKTogVHlwZWRBcnJheTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgc2l6ZSBpbiBieXRlcyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSDopoHntKDjga7jg5DjgqTjg4jjgrXjgqTjgrpcbiAgICAgKi9cbiAgICByZWFkb25seSBCWVRFU19QRVJfRUxFTUVOVDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYSBuZXcgYXJyYXkgZnJvbSBhIHNldCBvZiBlbGVtZW50cy5cbiAgICAgKiBAamEg6KaB57Sg44KS6Kit5a6a44GX5paw6KaP6YWN5YiX44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlbXNcbiAgICAgKiAgLSBgZW5gIEEgc2V0IG9mIGVsZW1lbnRzIHRvIGluY2x1ZGUgaW4gdGhlIG5ldyBhcnJheSBvYmplY3QuXG4gICAgICogIC0gYGphYCDmlrDjgZ/jgavoqK3lrprjgZnjgovopoHntKBcbiAgICAgKi9cbiAgICBvZiguLi5pdGVtczogbnVtYmVyW10pOiBUeXBlZEFycmF5O1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZXMgYW4gYXJyYXkgZnJvbSBhbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdC5cbiAgICAgKiBAamEgYXJyYXktbGlrZSAvIGl0ZXJhdGFibGUg44Kq44OW44K444Kn44Kv44OI44GL44KJ5paw6KaP6YWN5YiX44KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlMaWtlXG4gICAgICogIC0gYGVuYCBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqICAtIGBqYWAgYXJyYXktbGlrZSDjgoLjgZfjgY/jga8gaXRlcmF0YWJsZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICBmcm9tKGFycmF5TGlrZTogQXJyYXlMaWtlPG51bWJlcj4pOiBUeXBlZEFycmF5O1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZXMgYW4gYXJyYXkgZnJvbSBhbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdC5cbiAgICAgKiBAamEgYXJyYXktbGlrZSAvIGl0ZXJhdGFibGUg44Kq44OW44K444Kn44Kv44OI44GL44KJ5paw6KaP6YWN5YiX44KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlMaWtlXG4gICAgICogIC0gYGVuYCBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqICAtIGBqYWAgYXJyYXktbGlrZSDjgoLjgZfjgY/jga8gaXRlcmF0YWJsZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gbWFwZm5cbiAgICAgKiAgLSBgZW5gIEEgbWFwcGluZyBmdW5jdGlvbiB0byBjYWxsIG9uIGV2ZXJ5IGVsZW1lbnQgb2YgdGhlIGFycmF5LlxuICAgICAqICAtIGBqYWAg5YWo6KaB57Sg44Gr6YGp55So44GZ44KL44OX44Ot44Kt44K36Zai5pWwXG4gICAgICogQHBhcmFtIHRoaXNBcmdcbiAgICAgKiAgLSBgZW5gIFZhbHVlIG9mICd0aGlzJyB1c2VkIHRvIGludm9rZSB0aGUgbWFwZm4uXG4gICAgICogIC0gYGphYCBtYXBmbiDjgavkvb/nlKjjgZnjgosgJ3RoaXMnXG4gICAgICovXG4gICAgZnJvbTxUPihhcnJheUxpa2U6IEFycmF5TGlrZTxUPiwgbWFwZm46ICh2OiBULCBrOiBudW1iZXIpID0+IG51bWJlciwgdGhpc0FyZz86IHVua25vd24pOiBUeXBlZEFycmF5O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGV4aXN0cy5cbiAqIEBqYSDlgKTjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleGlzdHM8VD4oeDogVCB8IE51bGxpc2gpOiB4IGlzIFQge1xuICAgIHJldHVybiBudWxsICE9IHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIHtAbGluayBOdWxsaXNofS5cbiAqIEBqYSB7QGxpbmsgTnVsbGlzaH0g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOdWxsaXNoKHg6IHVua25vd24pOiB4IGlzIE51bGxpc2gge1xuICAgIHJldHVybiBudWxsID09IHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFN0cmluZy5cbiAqIEBqYSBTdHJpbmcg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmcoeDogdW5rbm93bik6IHggaXMgc3RyaW5nIHtcbiAgICByZXR1cm4gJ3N0cmluZycgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBOdW1iZXIuXG4gKiBAamEgTnVtYmVyIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTnVtYmVyKHg6IHVua25vd24pOiB4IGlzIG51bWJlciB7XG4gICAgcmV0dXJuICdudW1iZXInID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgQm9vbGVhbi5cbiAqIEBqYSBCb29sZWFuIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQm9vbGVhbih4OiB1bmtub3duKTogeCBpcyBib29sZWFuIHtcbiAgICByZXR1cm4gJ2Jvb2xlYW4nID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgU3ltYmxlLlxuICogQGphIFN5bWJvbCDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N5bWJvbCh4OiB1bmtub3duKTogeCBpcyBzeW1ib2wge1xuICAgIHJldHVybiAnc3ltYm9sJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIEJpZ0ludC5cbiAqIEBqYSBCaWdJbnQg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCaWdJbnQoeDogdW5rbm93bik6IHggaXMgYmlnaW50IHtcbiAgICByZXR1cm4gJ2JpZ2ludCcgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBwcmltaXRpdmUgdHlwZS5cbiAqIEBqYSDjg5fjg6rjg5/jg4bjgqPjg5blnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1ByaW1pdGl2ZSh4OiB1bmtub3duKTogeCBpcyBQcmltaXRpdmUge1xuICAgIHJldHVybiAheCB8fCAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHgpICYmICgnb2JqZWN0JyAhPT0gdHlwZW9mIHgpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBBcnJheS5cbiAqIEBqYSBBcnJheSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBjb25zdCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgT2JqZWN0LlxuICogQGphIE9iamVjdCDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09iamVjdCh4OiB1bmtub3duKTogeCBpcyBvYmplY3Qge1xuICAgIHJldHVybiBCb29sZWFuKHgpICYmICdvYmplY3QnID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMge0BsaW5rIFBsYWluT2JqZWN0fS5cbiAqIEBqYSB7QGxpbmsgUGxhaW5PYmplY3R9IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUGxhaW5PYmplY3QoeDogdW5rbm93bik6IHggaXMgUGxhaW5PYmplY3Qge1xuICAgIGlmICghaXNPYmplY3QoeCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGNyZWF0ZSBmcm9tIGBPYmplY3QuY3JlYXRlKCBudWxsIClgIGlzIHBsYWluXG4gICAgaWYgKCFPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIG93bkluc3RhbmNlT2YoT2JqZWN0LCB4KTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgZW1wdHkgb2JqZWN0LlxuICogQGphIOepuuOCquODluOCuOOCp+OCr+ODiOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRW1wdHlPYmplY3QoeDogdW5rbm93bik6IHggaXMgb2JqZWN0IHtcbiAgICBpZiAoIWlzUGxhaW5PYmplY3QoeCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG5hbWUgaW4geCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBGdW5jdGlvbi5cbiAqIEBqYSBGdW5jdGlvbiDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Z1bmN0aW9uKHg6IHVua25vd24pOiB4IGlzIFR5cGVMaXN0WydmdW5jdGlvbiddIHtcbiAgICByZXR1cm4gJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBjYW4gYmUgY29udmVydCB0byBhIG51bWJlci5cbiAqIEBqYSDmlbDlgKTjgavlpInmj5vlj6/og73jgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc051bWVyaWMoeDogdW5rbm93bik6IHggaXMgbnVtYmVyIHtcbiAgICByZXR1cm4gIWlzTnVsbGlzaCh4KSAmJiAhaXNCb29sZWFuKHgpICYmICFpc0FycmF5KHgpICYmICFpc1N5bWJvbCh4KSAmJiAoJycgIT09IHgpICYmICFOdW1iZXIuaXNOYU4oTnVtYmVyKHgpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgaW5wdXQuXG4gKiBAamEg5oyH5a6a44GX44Gf5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHR5cGVcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHR5cGVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5Z6LXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0eXBlT2Y8SyBleHRlbmRzIFR5cGVLZXlzPih0eXBlOiBLLCB4OiB1bmtub3duKTogeCBpcyBUeXBlTGlzdFtLXSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSB0eXBlO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgaGFzIGl0ZXJhdG9yLlxuICogQGphIGl0ZXJhdG9yIOOCkuaJgOacieOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGU8VD4oeDogTnVsbGFibGU8SXRlcmFibGU8VD4+KTogeCBpcyBJdGVyYWJsZTxUPjtcbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlKHg6IHVua25vd24pOiB4IGlzIEl0ZXJhYmxlPHVua25vd24+O1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGUoeDogdW5rbm93bik6IGFueSB7XG4gICAgcmV0dXJuIFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoeCk7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF90eXBlZEFycmF5TmFtZXM6IFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+ID0ge1xuICAgICdJbnQ4QXJyYXknOiB0cnVlLFxuICAgICdVaW50OEFycmF5JzogdHJ1ZSxcbiAgICAnVWludDhDbGFtcGVkQXJyYXknOiB0cnVlLFxuICAgICdJbnQxNkFycmF5JzogdHJ1ZSxcbiAgICAnVWludDE2QXJyYXknOiB0cnVlLFxuICAgICdJbnQzMkFycmF5JzogdHJ1ZSxcbiAgICAnVWludDMyQXJyYXknOiB0cnVlLFxuICAgICdGbG9hdDMyQXJyYXknOiB0cnVlLFxuICAgICdGbG9hdDY0QXJyYXknOiB0cnVlLFxufTtcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGlzIG9uZSBvZiB7QGxpbmsgVHlwZWRBcnJheX0uXG4gKiBAamEg5oyH5a6a44GX44Gf44Kk44Oz44K544K/44Oz44K544GMIHtAbGluayBUeXBlZEFycmF5fSDjga7kuIDnqK7jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVkQXJyYXkoeDogdW5rbm93bik6IHggaXMgVHlwZWRBcnJheSB7XG4gICAgcmV0dXJuICEhX3R5cGVkQXJyYXlOYW1lc1tjbGFzc05hbWUoeCldO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgaW5zdGFuY2Ugb2YgaW5wdXQuXG4gKiBAamEg5oyH5a6a44GX44Gf44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIGNvbnN0cnVjdG9yXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+OCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5zdGFuY2VPZjxUIGV4dGVuZHMgb2JqZWN0PihjdG9yOiBOdWxsYWJsZTxUeXBlPFQ+PiwgeDogdW5rbm93bik6IHggaXMgVCB7XG4gICAgcmV0dXJuICgnZnVuY3Rpb24nID09PSB0eXBlb2YgY3RvcikgJiYgKHggaW5zdGFuY2VvZiBjdG9yKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGluc3RhbmNlIG9mIGlucHV0IGNvbnN0cnVjdG9yIChleGNlcHQgc3ViIGNsYXNzKS5cbiAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvliKTlrpogKOa0vueUn+OCr+ODqeOCueOBr+WQq+OCgeOBquOBhClcbiAqXG4gKiBAcGFyYW0gY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL44Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvd25JbnN0YW5jZU9mPFQgZXh0ZW5kcyBvYmplY3Q+KGN0b3I6IE51bGxhYmxlPFR5cGU8VD4+LCB4OiB1bmtub3duKTogeCBpcyBUIHtcbiAgICByZXR1cm4gKG51bGwgIT0geCkgJiYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBjdG9yKSAmJiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpID09PSBPYmplY3QoY3Rvci5wcm90b3R5cGUpKTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSB2YWx1ZSdzIGNsYXNzIG5hbWUuXG4gKiBAamEg44Kv44Op44K55ZCN44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xhc3NOYW1lKHg6IGFueSk6IHN0cmluZyB7XG4gICAgaWYgKHggIT0gbnVsbCkge1xuICAgICAgICBjb25zdCB0b1N0cmluZ1RhZ05hbWUgPSB4W1N5bWJvbC50b1N0cmluZ1RhZ107XG4gICAgICAgIGlmIChpc1N0cmluZyh0b1N0cmluZ1RhZ05hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9TdHJpbmdUYWdOYW1lO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb24oeCkgJiYgeC5wcm90b3R5cGUgJiYgbnVsbCAhPSB4Lm5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB4Lm5hbWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBjdG9yID0geC5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGN0b3IpICYmIGN0b3IgPT09IChPYmplY3QoY3Rvci5wcm90b3R5cGUpIGFzIG9iamVjdCkuY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY3Rvci5uYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpKS5zbGljZSg4LCAtMSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIGlucHV0IHZhbHVlcyBhcmUgc2FtZSB2YWx1ZS10eXBlLlxuICogQGphIOWFpeWKm+OBjOWQjOS4gOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBsaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICogQHBhcmFtIHJoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1lVHlwZShsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0eXBlb2YgbGhzID09PSB0eXBlb2YgcmhzO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBpbnB1dCB2YWx1ZXMgYXJlIHNhbWUgY2xhc3MuXG4gKiBAamEg5YWl5Yqb44GM5ZCM5LiA44Kv44Op44K544Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGxoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKiBAcGFyYW0gcmhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhbWVDbGFzcyhsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIGlmIChudWxsID09IGxocyAmJiBudWxsID09IHJocykge1xuICAgICAgICByZXR1cm4gY2xhc3NOYW1lKGxocykgPT09IGNsYXNzTmFtZShyaHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAobnVsbCAhPSBsaHMpICYmIChudWxsICE9IHJocykgJiYgKE9iamVjdC5nZXRQcm90b3R5cGVPZihsaHMpID09PSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocmhzKSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb21tb24gU3ltYmxlIGZvciBmcmFtZXdvcmsuXG4gKiBAamEg44OV44Os44O844Og44Ov44O844Kv44GM5YWx6YCa44Gn5L2/55So44GZ44KLIFN5bWJsZVxuICovXG5leHBvcnQgY29uc3QgJGNkcCA9IFN5bWJvbCgnQGNkcCcpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWZ1bmN0aW9uLXR5cGUsXG4gKi9cblxuaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICB0eXBlIFR5cGVLZXlzLFxuICAgIGlzQXJyYXksXG4gICAgZXhpc3RzLFxuICAgIGNsYXNzTmFtZSxcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogQGVuIFR5cGUgdmVyaWZpZXIgaW50ZXJmYWNlIGRlZmluaXRpb24uIDxicj5cbiAqICAgICBJZiBpbnZhbGlkIHZhbHVlIHJlY2VpdmVkLCB0aGUgbWV0aG9kIHRocm93cyBgVHlwZUVycm9yYC5cbiAqIEBqYSDlnovmpJzoqLzjga7jgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqkgPGJyPlxuICogICAgIOmBleWPjeOBl+OBn+WgtOWQiOOBryBgVHlwZUVycm9yYCDjgpLnmbrnlJ9cbiAqXG4gKlxuICovXG5pbnRlcmZhY2UgVmVyaWZpZXIge1xuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBpcyBub3Qge0BsaW5rIE51bGxpc2h9LlxuICAgICAqIEBqYSB7QGxpbmsgTnVsbGlzaH0g44Gn44Gq44GE44GT44Go44KS5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm90TnVsbGlzaC54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBub3ROdWxsaXNoLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBub3ROdWxsaXNoOiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpcyB7QGxpbmsgVHlwZUtleXN9LlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ8ge0BsaW5rIFR5cGVLZXlzfSDjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlT2YudHlwZVxuICAgICAqICAtIGBlbmAgb25lIG9mIHtAbGluayBUeXBlS2V5c31cbiAgICAgKiAgLSBgamFgIHtAbGluayBUeXBlS2V5c30g44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHR5cGVPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSB0eXBlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIHR5cGVPZjogKHR5cGU6IFR5cGVLZXlzLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGlzIGBBcnJheWAuXG4gICAgICogQGphIGBBcnJheWAg44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXkueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gYXJyYXkubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGFycmF5OiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBpcyBgSXRlcmFibGVgLlxuICAgICAqIEBqYSBgSXRlcmFibGVgIOOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGl0ZXJhYmxlLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGl0ZXJhYmxlLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBpdGVyYWJsZTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaW5zdGFuY2UgaXMgZXF1YWwgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbnN0YW5jZU9mLmN0b3JcbiAgICAgKiAgLSBgZW5gIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5q+U6LyD5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluc3RhbmNlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaW5zdGFuY2VPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGluc3RhbmNlIGhhcyBgc3RyaWN0bHlgIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44Gu5Y6z5a+G5LiA6Ie044GX44Gf44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3duSW5zdGFuY2VPZi5jdG9yXG4gICAgICogIC0gYGVuYCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOavlOi8g+WvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBvd25JbnN0YW5jZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIG93bkluc3RhbmNlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIG93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpbnN0YW5jZSBoYXMgbm90IGBzdHJpY3RseWAgZXF1YWwgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jgpLmjIHjgaTjgqTjg7Pjgrnjgr/jg7PjgrnjgafjgarjgYTjgZPjgajjgpLmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub3RPd25JbnN0YW5jZU9mLmN0b3JcbiAgICAgKiAgLSBgZW5gIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5q+U6LyD5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIG5vdE93bkluc3RhbmNlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gbm90T3duSW5zdGFuY2VPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgbm90T3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGhhcyBzcGVjaWZpZWQgcHJvcGVydHkuXG4gICAgICogQGphIOaMh+WumuODl+ODreODkeODhuOCo+OCkuaMgeOBo+OBpuOBhOOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGhhc1Byb3BlcnR5LnByb3BcbiAgICAgKiAgLSBgZW5gIHNwZWNpZmllZCBwcm9wZXJ0eVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44OX44Ot44OR44OG44KjXG4gICAgICogQHBhcmFtIGhhc1Byb3BlcnR5LnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGhhc1Byb3BlcnR5Lm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBoYXNQcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGhhcyBvd24gc3BlY2lmaWVkIHByb3BlcnR5LlxuICAgICAqIEBqYSDmjIflrprjg5fjg63jg5Hjg4bjgqPjgpLlhaXlipvlgKToh6rouqvmjIHjgaPjgabjgYTjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS5wcm9wXG4gICAgICogIC0gYGVuYCBzcGVjaWZpZWQgcHJvcGVydHlcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaGFzT3duUHJvcGVydHk6ICh4OiB1bmtub3duLCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcbn1cblxuLyoqXG4gKiBAZW4gTGlzdCBvZiBtZXRob2QgZm9yIHR5cGUgdmVyaWZ5LlxuICogQGphIOWei+aknOiovOOBjOaPkOS+m+OBmeOCi+ODoeOCveODg+ODieS4gOimp1xuICovXG5leHBvcnQgdHlwZSBWZXJpZnlNZXRob2QgPSBrZXlvZiBWZXJpZmllcjtcblxuLyoqXG4gKiBAZW4gQ29uY3JldGUgdHlwZSB2ZXJpZmllciBvYmplY3QuXG4gKiBAamEg5Z6L5qSc6Ki85a6f6KOF44Kq44OW44K444Kn44Kv44OIXG4gKlxuICogQGludGVybmFsXG4gKi9cbmNvbnN0IF92ZXJpZmllcjogVmVyaWZpZXIgPSB7XG4gICAgbm90TnVsbGlzaDogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYSB2YWxpZCB2YWx1ZS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdHlwZU9mOiAodHlwZTogVHlwZUtleXMsIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiB4ICE9PSB0eXBlKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVHlwZSBvZiAke2NsYXNzTmFtZSh4KX0gaXMgbm90ICR7dHlwZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGFycmF5OiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAoIWlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGFuIEFycmF5LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBpdGVyYWJsZTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKCEoU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdCh4KSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGFuIGl0ZXJhYmxlIG9iamVjdC5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICghKHggaW5zdGFuY2VvZiBjdG9yKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYW4gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBvd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgIT09IE9iamVjdChjdG9yLnByb3RvdHlwZSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGlzIG5vdCBvd24gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBub3RPd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgIT0geCAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgPT09IE9iamVjdChjdG9yLnByb3RvdHlwZSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGlzIG93biBpbnN0YW5jZSBvZiAke2N0b3IubmFtZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGhhc1Byb3BlcnR5OiAoeDogdW5rbm93biwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCB8fCAhKHByb3AgaW4gKHggYXMgb2JqZWN0KSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGRvZXMgbm90IGhhdmUgcHJvcGVydHkgJHtTdHJpbmcocHJvcCl9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBoYXNPd25Qcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHggfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh4LCBwcm9wKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFRoZSBvYmplY3QgZG9lcyBub3QgaGF2ZSBvd24gcHJvcGVydHkgJHtTdHJpbmcocHJvcCl9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vKipcbiAqIEBlbiBWZXJpZnkgbWV0aG9kLlxuICogQGphIOaknOiovOODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBtZXRob2RcbiAqICAtIGBlbmAgbWV0aG9kIG5hbWUgd2hpY2ggdXNpbmdcbiAqICAtIGBqYWAg5L2/55So44GZ44KL44Oh44K944OD44OJ5ZCNXG4gKiBAcGFyYW0gYXJnc1xuICogIC0gYGVuYCBhcmd1bWVudHMgd2hpY2ggY29ycmVzcG9uZHMgdG8gdGhlIG1ldGhvZCBuYW1lXG4gKiAgLSBgamFgIOODoeOCveODg+ODieWQjeOBq+WvvuW/nOOBmeOCi+W8leaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gdmVyaWZ5PFRNZXRob2QgZXh0ZW5kcyBWZXJpZnlNZXRob2Q+KG1ldGhvZDogVE1ldGhvZCwgLi4uYXJnczogUGFyYW1ldGVyczxWZXJpZmllcltUTWV0aG9kXT4pOiB2b2lkIHwgbmV2ZXIge1xuICAgIChfdmVyaWZpZXJbbWV0aG9kXSBhcyBVbmtub3duRnVuY3Rpb24pKC4uLmFyZ3MpO1xufVxuXG5leHBvcnQgeyB2ZXJpZnkgYXMgZGVmYXVsdCB9O1xuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgdHlwZSBUeXBlZEFycmF5LFxuICAgIHR5cGUgVHlwZWRBcnJheUNvbnN0cnVjdG9yLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNBcnJheSxcbiAgICBpc09iamVjdCxcbiAgICBpc0l0ZXJhYmxlLFxuICAgIGlzVHlwZWRBcnJheSxcbiAgICBzYW1lQ2xhc3MsXG59IGZyb20gJy4vdHlwZXMnO1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgZGVlcEVxdWFsKCkgKi9cbmZ1bmN0aW9uIGFycmF5RXF1YWwobGhzOiB1bmtub3duW10sIHJoczogdW5rbm93bltdKTogYm9vbGVhbiB7XG4gICAgY29uc3QgbGVuID0gbGhzLmxlbmd0aDtcbiAgICBpZiAobGVuICE9PSByaHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoIWRlZXBFcXVhbChsaHNbaV0sIHJoc1tpXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGRlZXBFcXVhbCgpICovXG5mdW5jdGlvbiBidWZmZXJFcXVhbChsaHM6IFNoYXJlZEFycmF5QnVmZmVyIHwgQXJyYXlCdWZmZXIsIHJoczogU2hhcmVkQXJyYXlCdWZmZXIgfCBBcnJheUJ1ZmZlcik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHNpemUgPSBsaHMuYnl0ZUxlbmd0aDtcbiAgICBpZiAoc2l6ZSAhPT0gcmhzLmJ5dGVMZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBsZXQgcG9zID0gMDtcbiAgICBpZiAoc2l6ZSAtIHBvcyA+PSA4KSB7XG4gICAgICAgIGNvbnN0IGxlbiA9IHNpemUgPj4+IDM7XG4gICAgICAgIGNvbnN0IGY2NEwgPSBuZXcgRmxvYXQ2NEFycmF5KGxocywgMCwgbGVuKTtcbiAgICAgICAgY29uc3QgZjY0UiA9IG5ldyBGbG9hdDY0QXJyYXkocmhzLCAwLCBsZW4pO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoIU9iamVjdC5pcyhmNjRMW2ldLCBmNjRSW2ldKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBwb3MgPSBsZW4gPDwgMztcbiAgICB9XG4gICAgaWYgKHBvcyA9PT0gc2l6ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY29uc3QgTCA9IG5ldyBEYXRhVmlldyhsaHMpO1xuICAgIGNvbnN0IFIgPSBuZXcgRGF0YVZpZXcocmhzKTtcbiAgICBpZiAoc2l6ZSAtIHBvcyA+PSA0KSB7XG4gICAgICAgIGlmICghT2JqZWN0LmlzKEwuZ2V0VWludDMyKHBvcyksIFIuZ2V0VWludDMyKHBvcykpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcG9zICs9IDQ7XG4gICAgfVxuICAgIGlmIChzaXplIC0gcG9zID49IDIpIHtcbiAgICAgICAgaWYgKCFPYmplY3QuaXMoTC5nZXRVaW50MTYocG9zKSwgUi5nZXRVaW50MTYocG9zKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwb3MgKz0gMjtcbiAgICB9XG4gICAgaWYgKHNpemUgPiBwb3MpIHtcbiAgICAgICAgaWYgKCFPYmplY3QuaXMoTC5nZXRVaW50OChwb3MpLCBSLmdldFVpbnQ4KHBvcykpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcG9zICs9IDE7XG4gICAgfVxuICAgIHJldHVybiBwb3MgPT09IHNpemU7XG59XG5cbi8qKlxuICogQGVuIFNldCBieSBzcGVjaWZ5aW5nIGtleSBhbmQgdmFsdWUgZm9yIHRoZSBvYmplY3QuIChwcm90b3R5cGUgcG9sbHV0aW9uIGNvdW50ZXJtZWFzdXJlKVxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBqyBrZXksIHZhbHVlIOOCkuaMh+WumuOBl+OBpuioreWumiAo44OX44Ot44OI44K/44Kk44OX5rGa5p+T5a++562WKVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzaWduVmFsdWUodGFyZ2V0OiBVbmtub3duT2JqZWN0LCBrZXk6IHN0cmluZyB8IG51bWJlciB8IHN5bWJvbCwgdmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICBpZiAoJ19fcHJvdG9fXycgIT09IGtleSAmJiAnY29uc3RydWN0b3InICE9PSBrZXkpIHtcbiAgICAgICAgdGFyZ2V0W2tleV0gPSB2YWx1ZTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIFBlcmZvcm1zIGEgZGVlcCBjb21wYXJpc29uIGJldHdlZW4gdHdvIHZhbHVlcyB0byBkZXRlcm1pbmUgaWYgdGhleSBhcmUgZXF1aXZhbGVudC5cbiAqIEBqYSAy5YCk44Gu6Kmz57Sw5q+U6LyD44KS44GXLCDnrYnjgZfjgYTjgYvjganjgYbjgYvliKTlrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBFcXVhbChsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIGlmIChsaHMgPT09IHJocykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGlzRnVuY3Rpb24obGhzKSAmJiBpc0Z1bmN0aW9uKHJocykpIHtcbiAgICAgICAgcmV0dXJuIGxocy5sZW5ndGggPT09IHJocy5sZW5ndGggJiYgbGhzLm5hbWUgPT09IHJocy5uYW1lO1xuICAgIH1cbiAgICBpZiAoIWlzT2JqZWN0KGxocykgfHwgIWlzT2JqZWN0KHJocykpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB7IC8vIFByaW1pdGl2ZSBXcmFwcGVyIE9iamVjdHMgLyBEYXRlXG4gICAgICAgIGNvbnN0IHZhbHVlTCA9IGxocy52YWx1ZU9mKCk7XG4gICAgICAgIGNvbnN0IHZhbHVlUiA9IHJocy52YWx1ZU9mKCk7XG4gICAgICAgIGlmIChsaHMgIT09IHZhbHVlTCB8fCByaHMgIT09IHZhbHVlUikge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlTCA9PT0gdmFsdWVSO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gUmVnRXhwXG4gICAgICAgIGNvbnN0IGlzUmVnRXhwTCA9IGxocyBpbnN0YW5jZW9mIFJlZ0V4cDtcbiAgICAgICAgY29uc3QgaXNSZWdFeHBSID0gcmhzIGluc3RhbmNlb2YgUmVnRXhwO1xuICAgICAgICBpZiAoaXNSZWdFeHBMIHx8IGlzUmVnRXhwUikge1xuICAgICAgICAgICAgcmV0dXJuIGlzUmVnRXhwTCA9PT0gaXNSZWdFeHBSICYmIFN0cmluZyhsaHMpID09PSBTdHJpbmcocmhzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIEFycmF5XG4gICAgICAgIGNvbnN0IGlzQXJyYXlMID0gaXNBcnJheShsaHMpO1xuICAgICAgICBjb25zdCBpc0FycmF5UiA9IGlzQXJyYXkocmhzKTtcbiAgICAgICAgaWYgKGlzQXJyYXlMIHx8IGlzQXJyYXlSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNBcnJheUwgPT09IGlzQXJyYXlSICYmIGFycmF5RXF1YWwobGhzIGFzIHVua25vd25bXSwgcmhzIGFzIHVua25vd25bXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBBcnJheUJ1ZmZlclxuICAgICAgICBjb25zdCBpc0J1ZmZlckwgPSBsaHMgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcjtcbiAgICAgICAgY29uc3QgaXNCdWZmZXJSID0gcmhzIGluc3RhbmNlb2YgQXJyYXlCdWZmZXI7XG4gICAgICAgIGlmIChpc0J1ZmZlckwgfHwgaXNCdWZmZXJSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNCdWZmZXJMID09PSBpc0J1ZmZlclIgJiYgYnVmZmVyRXF1YWwobGhzIGFzIEFycmF5QnVmZmVyLCByaHMgYXMgQXJyYXlCdWZmZXIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gQXJyYXlCdWZmZXJWaWV3XG4gICAgICAgIGNvbnN0IGlzQnVmZmVyVmlld0wgPSBBcnJheUJ1ZmZlci5pc1ZpZXcobGhzKTtcbiAgICAgICAgY29uc3QgaXNCdWZmZXJWaWV3UiA9IEFycmF5QnVmZmVyLmlzVmlldyhyaHMpO1xuICAgICAgICBpZiAoaXNCdWZmZXJWaWV3TCB8fCBpc0J1ZmZlclZpZXdSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNCdWZmZXJWaWV3TCA9PT0gaXNCdWZmZXJWaWV3UiAmJiBzYW1lQ2xhc3MobGhzLCByaHMpXG4gICAgICAgICAgICAgICAgJiYgYnVmZmVyRXF1YWwoKGxocyBhcyBBcnJheUJ1ZmZlclZpZXcpLmJ1ZmZlciwgKHJocyBhcyBBcnJheUJ1ZmZlclZpZXcpLmJ1ZmZlcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBvdGhlciBJdGVyYWJsZVxuICAgICAgICBjb25zdCBpc0l0ZXJhYmxlTCA9IGlzSXRlcmFibGUobGhzKTtcbiAgICAgICAgY29uc3QgaXNJdGVyYWJsZVIgPSBpc0l0ZXJhYmxlKHJocyk7XG4gICAgICAgIGlmIChpc0l0ZXJhYmxlTCB8fCBpc0l0ZXJhYmxlUikge1xuICAgICAgICAgICAgcmV0dXJuIGlzSXRlcmFibGVMID09PSBpc0l0ZXJhYmxlUiAmJiBhcnJheUVxdWFsKFsuLi4obGhzIGFzIHVua25vd25bXSldLCBbLi4uKHJocyBhcyB1bmtub3duW10pXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHNhbWVDbGFzcyhsaHMsIHJocykpIHtcbiAgICAgICAgY29uc3Qga2V5c0wgPSBuZXcgU2V0KE9iamVjdC5rZXlzKGxocykpO1xuICAgICAgICBjb25zdCBrZXlzUiA9IG5ldyBTZXQoT2JqZWN0LmtleXMocmhzKSk7XG4gICAgICAgIGlmIChrZXlzTC5zaXplICE9PSBrZXlzUi5zaXplKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2Yga2V5c0wpIHtcbiAgICAgICAgICAgIGlmICgha2V5c1IuaGFzKGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2Yga2V5c0wpIHtcbiAgICAgICAgICAgIGlmICghZGVlcEVxdWFsKChsaHMgYXMgVW5rbm93bk9iamVjdClba2V5XSwgKHJocyBhcyBVbmtub3duT2JqZWN0KVtrZXldKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIGxocykge1xuICAgICAgICAgICAgaWYgKCEoa2V5IGluIHJocykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qga2V5cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiByaHMpIHtcbiAgICAgICAgICAgIGlmICghKGtleSBpbiBsaHMpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAga2V5cy5hZGQoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzKSB7XG4gICAgICAgICAgICBpZiAoIWRlZXBFcXVhbCgobGhzIGFzIFVua25vd25PYmplY3QpW2tleV0sIChyaHMgYXMgVW5rbm93bk9iamVjdClba2V5XSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGNsb25lIFJlZ0V4cCAqL1xuZnVuY3Rpb24gY2xvbmVSZWdFeHAocmVnZXhwOiBSZWdFeHApOiBSZWdFeHAge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBSZWdFeHAocmVnZXhwLnNvdXJjZSwgcmVnZXhwLmZsYWdzKTtcbiAgICByZXN1bHQubGFzdEluZGV4ID0gcmVnZXhwLmxhc3RJbmRleDtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKiogQGludGVybmFsIGNsb25lIEFycmF5QnVmZmVyICovXG5mdW5jdGlvbiBjbG9uZUFycmF5QnVmZmVyKGFycmF5QnVmZmVyOiBBcnJheUJ1ZmZlckxpa2UpOiBBcnJheUJ1ZmZlciB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IEFycmF5QnVmZmVyKGFycmF5QnVmZmVyLmJ5dGVMZW5ndGgpO1xuICAgIG5ldyBVaW50OEFycmF5KHJlc3VsdCkuc2V0KG5ldyBVaW50OEFycmF5KGFycmF5QnVmZmVyKSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBEYXRhVmlldyAqL1xuZnVuY3Rpb24gY2xvbmVEYXRhVmlldyhkYXRhVmlldzogRGF0YVZpZXcpOiBEYXRhVmlldyB7XG4gICAgY29uc3QgYnVmZmVyID0gY2xvbmVBcnJheUJ1ZmZlcihkYXRhVmlldy5idWZmZXIpO1xuICAgIHJldHVybiBuZXcgRGF0YVZpZXcoYnVmZmVyLCBkYXRhVmlldy5ieXRlT2Zmc2V0LCBkYXRhVmlldy5ieXRlTGVuZ3RoKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBUeXBlZEFycmF5ICovXG5mdW5jdGlvbiBjbG9uZVR5cGVkQXJyYXk8VCBleHRlbmRzIFR5cGVkQXJyYXk+KHR5cGVkQXJyYXk6IFQpOiBUIHtcbiAgICBjb25zdCBidWZmZXIgPSBjbG9uZUFycmF5QnVmZmVyKHR5cGVkQXJyYXkuYnVmZmVyKTtcbiAgICByZXR1cm4gbmV3ICh0eXBlZEFycmF5LmNvbnN0cnVjdG9yIGFzIFR5cGVkQXJyYXlDb25zdHJ1Y3RvcikoYnVmZmVyLCB0eXBlZEFycmF5LmJ5dGVPZmZzZXQsIHR5cGVkQXJyYXkubGVuZ3RoKSBhcyBUO1xufVxuXG4vKiogQGludGVybmFsIGNoZWNrIG5lY2Vzc2FyeSB0byB1cGRhdGUgKi9cbmZ1bmN0aW9uIG5lZWRVcGRhdGUob2xkVmFsdWU6IHVua25vd24sIG5ld1ZhbHVlOiB1bmtub3duLCBleGNlcHRVbmRlZmluZWQ6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBpZiAob2xkVmFsdWUgIT09IG5ld1ZhbHVlKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAoZXhjZXB0VW5kZWZpbmVkICYmIHVuZGVmaW5lZCA9PT0gb2xkVmFsdWUpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBtZXJnZSBBcnJheSAqL1xuZnVuY3Rpb24gbWVyZ2VBcnJheSh0YXJnZXQ6IHVua25vd25bXSwgc291cmNlOiB1bmtub3duW10pOiB1bmtub3duW10ge1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBzb3VyY2UubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXRbaV07XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWVyZ2Uob2xkVmFsdWUsIHNvdXJjZVtpXSk7XG4gICAgICAgICFuZWVkVXBkYXRlKG9sZFZhbHVlLCBuZXdWYWx1ZSwgZmFsc2UpIHx8ICh0YXJnZXRbaV0gPSBuZXdWYWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgbWVyZ2UgU2V0ICovXG5mdW5jdGlvbiBtZXJnZVNldCh0YXJnZXQ6IFNldDx1bmtub3duPiwgc291cmNlOiBTZXQ8dW5rbm93bj4pOiBTZXQ8dW5rbm93bj4ge1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiBzb3VyY2UpIHtcbiAgICAgICAgdGFyZ2V0LmhhcyhpdGVtKSB8fCB0YXJnZXQuYWRkKG1lcmdlKHVuZGVmaW5lZCwgaXRlbSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG4vKiogQGludGVybmFsIG1lcmdlIE1hcCAqL1xuZnVuY3Rpb24gbWVyZ2VNYXAodGFyZ2V0OiBNYXA8dW5rbm93biwgdW5rbm93bj4sIHNvdXJjZTogTWFwPHVua25vd24sIHVua25vd24+KTogTWFwPHVua25vd24sIHVua25vd24+IHtcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBzb3VyY2UpIHtcbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXQuZ2V0KGspO1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1lcmdlKG9sZFZhbHVlLCB2KTtcbiAgICAgICAgIW5lZWRVcGRhdGUob2xkVmFsdWUsIG5ld1ZhbHVlLCBmYWxzZSkgfHwgdGFyZ2V0LnNldChrLCBuZXdWYWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgbWVyZ2Ugb2JqZWN0IHByb3BlcnR5ICovXG5mdW5jdGlvbiBtZXJnZU9iamVjdFByb3BlcnR5KHRhcmdldDogVW5rbm93bk9iamVjdCwgc291cmNlOiBVbmtub3duT2JqZWN0LCBrZXk6IHN0cmluZyB8IG51bWJlciB8IHN5bWJvbCk6IHZvaWQge1xuICAgIGlmICgnX19wcm90b19fJyAhPT0ga2V5ICYmICdjb25zdHJ1Y3RvcicgIT09IGtleSkge1xuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtrZXldO1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1lcmdlKG9sZFZhbHVlLCBzb3VyY2Vba2V5XSk7XG4gICAgICAgICFuZWVkVXBkYXRlKG9sZFZhbHVlLCBuZXdWYWx1ZSwgdHJ1ZSkgfHwgKHRhcmdldFtrZXldID0gbmV3VmFsdWUpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGRlZXBNZXJnZSgpICovXG5mdW5jdGlvbiBtZXJnZSh0YXJnZXQ6IHVua25vd24sIHNvdXJjZTogdW5rbm93bik6IHVua25vd24ge1xuICAgIGlmICh1bmRlZmluZWQgPT09IHNvdXJjZSB8fCB0YXJnZXQgPT09IHNvdXJjZSkge1xuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cbiAgICBpZiAoIWlzT2JqZWN0KHNvdXJjZSkpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICB9XG4gICAgLy8gUHJpbWl0aXZlIFdyYXBwZXIgT2JqZWN0cyAvIERhdGVcbiAgICBpZiAoc291cmNlLnZhbHVlT2YoKSAhPT0gc291cmNlKSB7XG4gICAgICAgIHJldHVybiBkZWVwRXF1YWwodGFyZ2V0LCBzb3VyY2UpID8gdGFyZ2V0IDogbmV3IChzb3VyY2UuY29uc3RydWN0b3IgYXMgT2JqZWN0Q29uc3RydWN0b3IpKHNvdXJjZS52YWx1ZU9mKCkpO1xuICAgIH1cbiAgICAvLyBSZWdFeHBcbiAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgIHJldHVybiBkZWVwRXF1YWwodGFyZ2V0LCBzb3VyY2UpID8gdGFyZ2V0IDogY2xvbmVSZWdFeHAoc291cmNlKTtcbiAgICB9XG4gICAgLy8gQXJyYXlCdWZmZXJcbiAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIGRlZXBFcXVhbCh0YXJnZXQsIHNvdXJjZSkgPyB0YXJnZXQgOiBjbG9uZUFycmF5QnVmZmVyKHNvdXJjZSk7XG4gICAgfVxuICAgIC8vIEFycmF5QnVmZmVyVmlld1xuICAgIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcoc291cmNlKSkge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IGlzVHlwZWRBcnJheShzb3VyY2UpID8gY2xvbmVUeXBlZEFycmF5KHNvdXJjZSkgOiBjbG9uZURhdGFWaWV3KHNvdXJjZSBhcyBEYXRhVmlldyk7XG4gICAgfVxuICAgIC8vIEFycmF5XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoc291cmNlKSkge1xuICAgICAgICByZXR1cm4gbWVyZ2VBcnJheShpc0FycmF5KHRhcmdldCkgPyB0YXJnZXQgOiBbXSwgc291cmNlKTtcbiAgICB9XG4gICAgLy8gU2V0XG4gICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIFNldCkge1xuICAgICAgICByZXR1cm4gbWVyZ2VTZXQodGFyZ2V0IGluc3RhbmNlb2YgU2V0ID8gdGFyZ2V0IDogbmV3IFNldCgpLCBzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBNYXBcbiAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgTWFwKSB7XG4gICAgICAgIHJldHVybiBtZXJnZU1hcCh0YXJnZXQgaW5zdGFuY2VvZiBNYXAgPyB0YXJnZXQgOiBuZXcgTWFwKCksIHNvdXJjZSk7XG4gICAgfVxuXG4gICAgY29uc3Qgb2JqID0gaXNPYmplY3QodGFyZ2V0KSA/IHRhcmdldCA6IHt9O1xuICAgIGlmIChzYW1lQ2xhc3ModGFyZ2V0LCBzb3VyY2UpKSB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHNvdXJjZSkpIHtcbiAgICAgICAgICAgIG1lcmdlT2JqZWN0UHJvcGVydHkob2JqIGFzIFVua25vd25PYmplY3QsIHNvdXJjZSBhcyBVbmtub3duT2JqZWN0LCBrZXkpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBtZXJnZU9iamVjdFByb3BlcnR5KG9iaiBhcyBVbmtub3duT2JqZWN0LCBzb3VyY2UgYXMgVW5rbm93bk9iamVjdCwga2V5KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIEBlbiBSZWN1cnNpdmVseSBtZXJnZXMgb3duIGFuZCBpbmhlcml0ZWQgZW51bWVyYWJsZSBzdHJpbmcga2V5ZWQgcHJvcGVydGllcyBvZiBzb3VyY2Ugb2JqZWN0cyBpbnRvIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu5YaN5biw55qE44Oe44O844K444KS5a6f6KGMXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWVwTWVyZ2U8VCwgUzEsIFMyLCBTMywgUzQsIFM1LCBTNiwgUzcsIFM4LCBTOT4oXG4gICAgdGFyZ2V0OiBULFxuICAgIC4uLnNvdXJjZXM6IFtTMSwgUzI/LCBTMz8sIFM0PywgUzU/LCBTNj8sIFM3PywgUzg/LCBTOT8sIC4uLnVua25vd25bXV1cbik6IFQgJiBTMSAmIFMyICYgUzMgJiBTNCAmIFM1ICYgUzYgJiBTNyAmIFM4ICYgUzk7XG5leHBvcnQgZnVuY3Rpb24gZGVlcE1lcmdlPFg+KHRhcmdldDogdW5rbm93biwgLi4uc291cmNlczogdW5rbm93bltdKTogWDtcbmV4cG9ydCBmdW5jdGlvbiBkZWVwTWVyZ2UodGFyZ2V0OiB1bmtub3duLCAuLi5zb3VyY2VzOiB1bmtub3duW10pOiB1bmtub3duIHtcbiAgICBsZXQgcmVzdWx0ID0gdGFyZ2V0O1xuICAgIGZvciAoY29uc3Qgc291cmNlIG9mIHNvdXJjZXMpIHtcbiAgICAgICAgcmVzdWx0ID0gbWVyZ2UocmVzdWx0LCBzb3VyY2UpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIGRlZXAgY29weSBpbnN0YW5jZSBvZiBzb3VyY2Ugb2JqZWN0LlxuICogQGphIOODh+OCo+ODvOODl+OCs+ODlOODvOOCquODluOCuOOCp+OCr+ODiOOBrueUn+aIkFxuICpcbiAqIEBzZWUgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL3N0cnVjdHVyZWRDbG9uZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVlcENvcHk8VD4oc3JjOiBUKTogVCB7XG4gICAgcmV0dXJuIGRlZXBNZXJnZSh1bmRlZmluZWQsIHNyYyk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHR5cGUge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBVbmtub3duT2JqZWN0LFxuICAgIEFjY2Vzc2libGUsXG4gICAgTnVsbGlzaCxcbiAgICBUeXBlLFxuICAgIENsYXNzLFxuICAgIENvbnN0cnVjdG9yLFxufSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBAZW4gTWl4aW4gY2xhc3MncyBiYXNlIGludGVyZmFjZS5cbiAqIEBqYSBNaXhpbiDjgq/jg6njgrnjga7ln7rlupXjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqlcbiAqL1xuZXhwb3J0IGRlY2xhcmUgY2xhc3MgTWl4aW5DbGFzcyB7XG4gICAgLyoqXG4gICAgICogQGVuIGNhbGwgbWl4aW4gc291cmNlIGNsYXNzJ3MgYHN1cGVyKClgLiA8YnI+XG4gICAgICogICAgIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBjYWxsZWQgZnJvbSBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEgTWl4aW4g44Kv44Op44K544Gu5Z+65bqV44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pIDxicj5cbiAgICAgKiAgICAg44Kz44Oz44K544OI44Op44Kv44K/44GL44KJ5ZG844G244GT44Go44KS5oOz5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3JjQ2xhc3NcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiB0YXJnZXQgY2xhc3MgbmFtZS4gZXgpIGZyb20gUzEgYXZhaWxhYmxlXG4gICAgICogIC0gYGphYCDjgrPjg7Pjgrnjg4jjg6njgq/jg4jjgZnjgovjgq/jg6njgrnlkI3jgpLmjIflrpogZXgpIFMxIOOBi+OCieaMh+WumuWPr+iDvVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gcGFyYW1ldGVyc1xuICAgICAqICAtIGBqYWAg44Kz44Oz44K544OI44Op44Kv44OI44Gr5L2/55So44GZ44KL5byV5pWwXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHN1cGVyPFQgZXh0ZW5kcyBDbGFzcz4oc3JjQ2xhc3M6IFQsIC4uLmFyZ3M6IENvbnN0cnVjdG9yUGFyYW1ldGVyczxUPik6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIGlucHV0IGNsYXNzIGlzIG1peGluZWQgKGV4Y2x1ZGluZyBvd24gY2xhc3MpLlxuICAgICAqIEBqYSDmjIflrprjgq/jg6njgrnjgYwgTWl4aW4g44GV44KM44Gm44GE44KL44GL56K66KqNICjoh6rouqvjga7jgq/jg6njgrnjga/lkKvjgb7jgozjgarjgYQpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWl4ZWRDbGFzc1xuICAgICAqICAtIGBlbmAgc2V0IHRhcmdldCBjbGFzcyBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5a++6LGh44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGlzTWl4ZWRXaXRoPFQgZXh0ZW5kcyBvYmplY3Q+KG1peGVkQ2xhc3M6IENvbnN0cnVjdG9yPFQ+KTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZW4gTWl4ZWQgc3ViIGNsYXNzIGNvbnN0cnVjdG9yIGRlZmluaXRpb25zLlxuICogQGphIOWQiOaIkOOBl+OBn+OCteODluOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1peGluQ29uc3RydWN0b3I8QiBleHRlbmRzIENsYXNzLCBVIGV4dGVuZHMgb2JqZWN0PiBleHRlbmRzIFR5cGU8VT4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBjb25zdHJ1Y3RvclxuICAgICAqIEBqYSDjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBiYXNlIGNsYXNzIGFyZ3VtZW50c1xuICAgICAqICAtIGBqYWAg5Z+65bqV44Kv44Op44K544Gr5oyH5a6a44GX44Gf5byV5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHVuaW9uIHR5cGUgb2YgY2xhc3NlcyB3aGVuIGNhbGxpbmcge0BsaW5rIG1peGluc30oKVxuICAgICAqICAtIGBqYWAge0BsaW5rIG1peGluc30oKSDjgavmuKHjgZfjgZ/jgq/jg6njgrnjga7pm4blkIhcbiAgICAgKi9cbiAgICBuZXcoLi4uYXJnczogQ29uc3RydWN0b3JQYXJhbWV0ZXJzPEI+KTogVTtcbn1cblxuLyoqXG4gKiBAZW4gRGVmaW5pdGlvbiBvZiB7QGxpbmsgc2V0TWl4Q2xhc3NBdHRyaWJ1dGV9IGZ1bmN0aW9uJ3MgYXJndW1lbnRzLlxuICogQGphIHtAbGluayBzZXRNaXhDbGFzc0F0dHJpYnV0ZX0g44Gu5Y+W44KK44GG44KL5byV5pWw5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWl4Q2xhc3NBdHRyaWJ1dGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBTdXBwcmVzcyBwcm92aWRpbmcgY29uc3RydWN0b3ItdHJhcCBmb3IgdGhlIG1peGluIHNvdXJjZSBjbGFzcy4gSW4gdGhpcyBjYXNlLCBgaXNNaXhlZFdpdGhgLCBgaW5zdGFuY2VvZmAgYWxzbyBiZWNvbWVzIGludmFsaWQuIChmb3IgaW1wcm92aW5nIHBlcmZvcm1hbmNlKVxuICAgICAqIEBqYSBNaXhpbiBTb3VyY2Ug44Kv44Op44K544Gr5a++44GX44GmLCDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jg4jjg6njg4Pjg5fjgpLmipHmraIuIOOBk+OCjOOCkuaMh+WumuOBl+OBn+WgtOWQiCwgYGlzTWl4ZWRXaXRoYCwgYGluc3RhbmNlb2ZgIOOCgueEoeWKueOBq+OBquOCiy4gKOODkeODleOCqeODvOODnuODs+OCueaUueWWhClcbiAgICAgKi9cbiAgICBwcm90b0V4dGVuZHNPbmx5OiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldHVwIFtTeW1ib2wuaGFzSW5zdGFuY2VdIHByb3BlcnR5LiA8YnI+XG4gICAgICogICAgIFRoZSBjbGFzcyBkZXNpZ25hdGVkIGFzIGEgc291cmNlIG9mIHtAbGluayBtaXhpbnN9KCkgaGFzIFtTeW1ib2wuaGFzSW5zdGFuY2VdIHByb3BlcnR5IGltcGxpY2l0bHkuIDxicj5cbiAgICAgKiAgICAgSXQncyB1c2VkIHRvIGF2b2lkIGJlY29taW5nIHRoZSBiZWhhdmlvciBgaW5zdGFuY2VvZmAgZG9lc24ndCBpbnRlbmQgd2hlbiB0aGUgY2xhc3MgaXMgZXh0ZW5kZWQgZnJvbSB0aGUgbWl4aW5lZCBjbGFzcyB0aGUgb3RoZXIgcGxhY2UuXG4gICAgICogQGphIFtTeW1ib2wuaGFzSW5zdGFuY2VdIOODl+ODreODkeODhuOCo+ioreWumjxicj5cbiAgICAgKiAgICAge0BsaW5rIG1peGluc30oKSDjga7jgr3jg7zjgrnjgavmjIflrprjgZXjgozjgZ/jgq/jg6njgrnjga8gW1N5bWJvbC5oYXNJbnN0YW5jZV0g44KS5pqX6buZ55qE44Gr5YKZ44GI44KL44Gf44KBPGJyPlxuICAgICAqICAgICDjgZ3jga7jgq/jg6njgrnjgYzku5bjgafntpnmib/jgZXjgozjgabjgYTjgovloLTlkIggYGluc3RhbmNlb2ZgIOOBjOaEj+Wbs+OBl+OBquOBhOaMr+OCi+iInuOBhOOBqOOBquOCi+OBruOCkumBv+OBkeOCi+OBn+OCgeOBq+S9v+eUqOOBmeOCiy5cbiAgICAgKi9cbiAgICBpbnN0YW5jZU9mOiAoKGluc3Q6IG9iamVjdCkgPT4gYm9vbGVhbikgfCBOdWxsaXNoO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfb2JqUHJvdG90eXBlICAgICA9IE9iamVjdC5wcm90b3R5cGU7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9pbnN0YW5jZU9mICAgICAgID0gRnVuY3Rpb24ucHJvdG90eXBlW1N5bWJvbC5oYXNJbnN0YW5jZV07XG4vKiogQGludGVybmFsICovIGNvbnN0IF9vdmVycmlkZSAgICAgICAgID0gU3ltYm9sKCdvdmVycmlkZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfaXNJbmhlcml0ZWQgICAgICA9IFN5bWJvbCgnaXMtaW5oZXJpdGVkJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9jb25zdHJ1Y3RvcnMgICAgID0gU3ltYm9sKCdjb25zdHJ1Y3RvcnMnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NsYXNzQmFzZSAgICAgICAgPSBTeW1ib2woJ2NsYXNzLWJhc2UnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NsYXNzU291cmNlcyAgICAgPSBTeW1ib2woJ2NsYXNzLXNvdXJjZXMnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3RvRXh0ZW5kc09ubHkgPSBTeW1ib2woJ3Byb3RvLWV4dGVuZHMtb25seScpO1xuXG4vKiogQGludGVybmFsIGNvcHkgcHJvcGVydGllcyBjb3JlICovXG5mdW5jdGlvbiByZWZsZWN0UHJvcGVydGllcyh0YXJnZXQ6IFVua25vd25PYmplY3QsIHNvdXJjZTogb2JqZWN0LCBrZXk6IHN0cmluZyB8IHN5bWJvbCk6IHZvaWQge1xuICAgIHRyeSB7XG4gICAgICAgIGlmIChudWxsID09IHRhcmdldFtrZXldKSB7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc291cmNlLCBrZXkpIGFzIFByb3BlcnR5RGVjb3JhdG9yKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBub29wXG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIG9iamVjdCBwcm9wZXJ0aWVzIGNvcHkgbWV0aG9kICovXG5mdW5jdGlvbiBjb3B5UHJvcGVydGllcyh0YXJnZXQ6IG9iamVjdCwgc291cmNlOiBvYmplY3QpOiB2b2lkIHtcbiAgICBzb3VyY2UgJiYgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoc291cmNlKVxuICAgICAgICAuZmlsdGVyKGtleSA9PiAhLyhwcm90b3R5cGV8bmFtZXxjb25zdHJ1Y3RvcikvLnRlc3Qoa2V5KSlcbiAgICAgICAgLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIHJlZmxlY3RQcm9wZXJ0aWVzKHRhcmdldCBhcyBVbmtub3duT2JqZWN0LCBzb3VyY2UsIGtleSk7XG4gICAgICAgIH0pO1xuICAgIHNvdXJjZSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHNvdXJjZSlcbiAgICAgICAgLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIHJlZmxlY3RQcm9wZXJ0aWVzKHRhcmdldCBhcyBVbmtub3duT2JqZWN0LCBzb3VyY2UsIGtleSk7XG4gICAgICAgIH0pO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3Igc2V0TWl4Q2xhc3NBdHRyaWJ1dGUodGFyZ2V0LCAnaW5zdGFuY2VPZicpICovXG5mdW5jdGlvbiBzZXRJbnN0YW5jZU9mPFQgZXh0ZW5kcyBvYmplY3Q+KHRhcmdldDogQ29uc3RydWN0b3I8VD4sIG1ldGhvZDogKChpbnN0OiBvYmplY3QpID0+IGJvb2xlYW4pIHwgTnVsbGlzaCk6IHZvaWQge1xuICAgIGNvbnN0IGJlaGF2aW91ciA9IG1ldGhvZCA/PyAobnVsbCA9PT0gbWV0aG9kID8gdW5kZWZpbmVkIDogKChpOiBvYmplY3QpID0+IE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZi5jYWxsKHRhcmdldC5wcm90b3R5cGUsIGkpKSk7XG4gICAgY29uc3QgYXBwbGllZCA9IGJlaGF2aW91ciAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgX292ZXJyaWRlKTtcbiAgICBpZiAoIWFwcGxpZWQpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGFyZ2V0LCB7XG4gICAgICAgICAgICBbU3ltYm9sLmhhc0luc3RhbmNlXToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBiZWhhdmlvdXIsXG4gICAgICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW19vdmVycmlkZV06IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogYmVoYXZpb3VyID8gdHJ1ZSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gU2V0IHRoZSBNaXhpbiBjbGFzcyBhdHRyaWJ1dGUuXG4gKiBAamEgTWl4aW4g44Kv44Op44K544Gr5a++44GX44Gm5bGe5oCn44KS6Kit5a6aXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAvLyAncHJvdG9FeHRlbmRPbmx5J1xuICogY2xhc3MgQmFzZSB7IGNvbnN0cnVjdG9yKGEsIGIpIHt9IH07XG4gKiBjbGFzcyBNaXhBIHsgfTtcbiAqIHNldE1peENsYXNzQXR0cmlidXRlKE1peEEsICdwcm90b0V4dGVuZHNPbmx5Jyk7ICAvLyBmb3IgaW1wcm92aW5nIGNvbnN0cnVjdGlvbiBwZXJmb3JtYW5jZVxuICogY2xhc3MgTWl4QiB7IGNvbnN0cnVjdG9yKGMsIGQpIHt9IH07XG4gKlxuICogY2xhc3MgTWl4aW5DbGFzcyBleHRlbmRzIG1peGlucyhCYXNlLCBNaXhBLCBNaXhCKSB7XG4gKiAgICAgY29uc3RydWN0b3IoYSwgYiwgYywgZCl7XG4gKiAgICAgICAgIC8vIGNhbGxpbmcgYEJhc2VgIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHN1cGVyKGEsIGIpO1xuICpcbiAqICAgICAgICAgLy8gY2FsbGluZyBNaXhpbiBjbGFzcydzIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QSk7ICAgICAgICAvLyBubyBhZmZlY3RcbiAqICAgICAgICAgdGhpcy5zdXBlcihNaXhCLCBjLCBkKTtcbiAqICAgICB9XG4gKiB9XG4gKlxuICogY29uc3QgbWl4ZWQgPSBuZXcgTWl4aW5DbGFzcygpO1xuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBNaXhBKTsgICAgLy8gZmFsc2VcbiAqIGNvbnNvbGUubG9nKG1peGVkLmlzTWl4ZWRXaXRoKE1peEEpKTsgIC8vIGZhbHNlXG4gKlxuICogLy8gJ2luc3RhbmNlT2YnXG4gKiBjbGFzcyBCYXNlIHt9O1xuICogY2xhc3MgU291cmNlIHt9O1xuICogY2xhc3MgTWl4aW5DbGFzcyBleHRlbmRzIG1peGlucyhCYXNlLCBTb3VyY2UpIHt9O1xuICpcbiAqIGNsYXNzIE90aGVyIGV4dGVuZHMgU291cmNlIHt9O1xuICpcbiAqIGNvbnN0IG90aGVyID0gbmV3IE90aGVyKCk7XG4gKiBjb25zdCBtaXhlZCA9IG5ldyBNaXhpbkNsYXNzKCk7XG4gKiBjb25zb2xlLmxvZyhvdGhlciBpbnN0YW5jZW9mIFNvdXJjZSk7ICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhvdGhlciBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE1peGluQ2xhc3MpOyAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIEJhc2UpOyAgICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIFNvdXJjZSk7ICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyB0cnVlID8/P1xuICpcbiAqIHNldE1peENsYXNzQXR0cmlidXRlKE90aGVyLCAnaW5zdGFuY2VPZicpOyAvLyBvciBzZXRNaXhDbGFzc0F0dHJpYnV0ZShPdGhlciwgJ2luc3RhbmNlT2YnLCBudWxsKTtcbiAqIGNvbnNvbGUubG9nKG90aGVyIGluc3RhbmNlb2YgU291cmNlKTsgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG90aGVyIGluc3RhbmNlb2YgT3RoZXIpOyAgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgT3RoZXIpOyAgICAgICAgIC8vIGZhbHNlICFcbiAqXG4gKiAvLyBbQmVzdCBQcmFjdGljZV0gSWYgeW91IGRlY2xhcmUgdGhlIGRlcml2ZWQtY2xhc3MgZnJvbSBtaXhpbiwgeW91IHNob3VsZCBjYWxsIHRoZSBmdW5jdGlvbiBmb3IgYXZvaWRpbmcgYGluc3RhbmNlb2ZgIGxpbWl0YXRpb24uXG4gKiBjbGFzcyBEZXJpdmVkQ2xhc3MgZXh0ZW5kcyBNaXhpbkNsYXNzIHt9XG4gKiBzZXRNaXhDbGFzc0F0dHJpYnV0ZShEZXJpdmVkQ2xhc3MsICdpbnN0YW5jZU9mJyk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHNldCB0YXJnZXQgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg6Kit5a6a5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcGFyYW0gYXR0clxuICogIC0gYGVuYDpcbiAqICAgIC0gYHByb3RvRXh0ZW5kc09ubHlgOiBTdXBwcmVzcyBwcm92aWRpbmcgY29uc3RydWN0b3ItdHJhcCBmb3IgdGhlIG1peGluIHNvdXJjZSBjbGFzcy4gKGZvciBpbXByb3ZpbmcgcGVyZm9ybWFuY2UpXG4gKiAgICAtIGBpbnN0YW5jZU9mYCAgICAgIDogZnVuY3Rpb24gYnkgdXNpbmcgW1N5bWJvbC5oYXNJbnN0YW5jZV0gPGJyPlxuICogICAgICAgICAgICAgICAgICAgICAgICAgIERlZmF1bHQgYmVoYXZpb3VyIGlzIGB7IHJldHVybiB0YXJnZXQucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5zdGFuY2UpIH1gXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgSWYgc2V0IGBudWxsYCwgZGVsZXRlIFtTeW1ib2wuaGFzSW5zdGFuY2VdIHByb3BlcnR5LlxuICogIC0gYGphYDpcbiAqICAgIC0gYHByb3RvRXh0ZW5kc09ubHlgOiBNaXhpbiBTb3VyY2Ug44Kv44Op44K544Gr5a++44GX44GmLCDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jg4jjg6njg4Pjg5fjgpLmipHmraIgKOODkeODleOCqeODvOODnuODs+OCueaUueWWhClcbiAqICAgIC0gYGluc3RhbmNlT2ZgICAgICAgOiBbU3ltYm9sLmhhc0luc3RhbmNlXSDjgYzkvb/nlKjjgZnjgovplqLmlbDjgpLmjIflrpogPGJyPlxuICogICAgICAgICAgICAgICAgICAgICAgICAgIOaXouWumuOBp+OBryBgeyByZXR1cm4gdGFyZ2V0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGluc3RhbmNlKSB9YCDjgYzkvb/nlKjjgZXjgozjgotcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIGBudWxsYCDmjIflrprjgpLjgZnjgovjgaggW1N5bWJvbC5oYXNJbnN0YW5jZV0g44OX44Ot44OR44OG44Kj44KS5YmK6Zmk44GZ44KLXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRNaXhDbGFzc0F0dHJpYnV0ZTxUIGV4dGVuZHMgb2JqZWN0LCBVIGV4dGVuZHMga2V5b2YgTWl4Q2xhc3NBdHRyaWJ1dGU+KFxuICAgIHRhcmdldDogQ29uc3RydWN0b3I8VD4sXG4gICAgYXR0cjogVSxcbiAgICBtZXRob2Q/OiBNaXhDbGFzc0F0dHJpYnV0ZVtVXVxuKTogdm9pZCB7XG4gICAgc3dpdGNoIChhdHRyKSB7XG4gICAgICAgIGNhc2UgJ3Byb3RvRXh0ZW5kc09ubHknOlxuICAgICAgICAgICAgKHRhcmdldCBhcyBBY2Nlc3NpYmxlPENvbnN0cnVjdG9yPFQ+PilbX3Byb3RvRXh0ZW5kc09ubHldID0gdHJ1ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdpbnN0YW5jZU9mJzpcbiAgICAgICAgICAgIHNldEluc3RhbmNlT2YodGFyZ2V0LCBtZXRob2QpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIE1peGluIGZ1bmN0aW9uIGZvciBtdWx0aXBsZSBpbmhlcml0YW5jZS4gPGJyPlxuICogICAgIFJlc29sdmluZyB0eXBlIHN1cHBvcnQgZm9yIG1heGltdW0gMTAgY2xhc3Nlcy5cbiAqIEBqYSDlpJrph43ntpnmib/jga7jgZ/jgoHjga4gTWl4aW4gPGJyPlxuICogICAgIOacgOWkpyAxMCDjgq/jg6njgrnjga7lnovop6PmsbrjgpLjgrXjg53jg7zjg4hcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNsYXNzIEJhc2UgeyBjb25zdHJ1Y3RvcihhLCBiKSB7fSB9O1xuICogY2xhc3MgTWl4QSB7IGNvbnN0cnVjdG9yKGEsIGIpIHt9IH07XG4gKiBjbGFzcyBNaXhCIHsgY29uc3RydWN0b3IoYywgZCkge30gfTtcbiAqXG4gKiBjbGFzcyBNaXhpbkNsYXNzIGV4dGVuZHMgbWl4aW5zKEJhc2UsIE1peEEsIE1peEIpIHtcbiAqICAgICBjb25zdHJ1Y3RvcihhLCBiLCBjLCBkKXtcbiAqICAgICAgICAgLy8gY2FsbGluZyBgQmFzZWAgY29uc3RydWN0b3JcbiAqICAgICAgICAgc3VwZXIoYSwgYik7XG4gKlxuICogICAgICAgICAvLyBjYWxsaW5nIE1peGluIGNsYXNzJ3MgY29uc3RydWN0b3JcbiAqICAgICAgICAgdGhpcy5zdXBlcihNaXhBLCBhLCBiKTtcbiAqICAgICAgICAgdGhpcy5zdXBlcihNaXhCLCBjLCBkKTtcbiAqICAgICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYmFzZVxuICogIC0gYGVuYCBwcmltYXJ5IGJhc2UgY2xhc3MuIHN1cGVyKGFyZ3MpIGlzIHRoaXMgY2xhc3MncyBvbmUuXG4gKiAgLSBgamFgIOWfuuW6leOCr+ODqeOCueOCs+ODs+OCueODiOODqeOCr+OCvy4g5ZCM5ZCN44OX44Ot44OR44OG44KjLCDjg6Hjgr3jg4Pjg4njga/mnIDlhKrlhYjjgZXjgozjgosuIHN1cGVyKGFyZ3MpIOOBr+OBk+OBruOCr+ODqeOCueOBruOCguOBruOBjOaMh+WumuWPr+iDvS5cbiAqIEBwYXJhbSBzb3VyY2VzXG4gKiAgLSBgZW5gIG11bHRpcGxlIGV4dGVuZHMgY2xhc3NcbiAqICAtIGBqYWAg5ouh5by144Kv44Op44K544Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBtaXhpbmVkIGNsYXNzIGNvbnN0cnVjdG9yXG4gKiAgLSBgamFgIOWQiOaIkOOBleOCjOOBn+OCr+ODqeOCueOCs+ODs+OCueODiOODqeOCr+OCv1xuICovXG5leHBvcnQgZnVuY3Rpb24gbWl4aW5zPFxuICAgIEIgZXh0ZW5kcyBDbGFzcyxcbiAgICBTMSBleHRlbmRzIG9iamVjdCxcbiAgICBTMiBleHRlbmRzIG9iamVjdCxcbiAgICBTMyBleHRlbmRzIG9iamVjdCxcbiAgICBTNCBleHRlbmRzIG9iamVjdCxcbiAgICBTNSBleHRlbmRzIG9iamVjdCxcbiAgICBTNiBleHRlbmRzIG9iamVjdCxcbiAgICBTNyBleHRlbmRzIG9iamVjdCxcbiAgICBTOCBleHRlbmRzIG9iamVjdCxcbiAgICBTOSBleHRlbmRzIG9iamVjdD4oXG4gICAgYmFzZTogQixcbiAgICAuLi5zb3VyY2VzOiBbXG4gICAgICAgIENvbnN0cnVjdG9yPFMxPixcbiAgICAgICAgQ29uc3RydWN0b3I8UzI+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8UzM+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8UzQ+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8UzU+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8UzY+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8Uzc+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8Uzg+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8Uzk+PyxcbiAgICAgICAgLi4uYW55W11cbiAgICBdKTogTWl4aW5Db25zdHJ1Y3RvcjxCLCBNaXhpbkNsYXNzICYgSW5zdGFuY2VUeXBlPEI+ICYgUzEgJiBTMiAmIFMzICYgUzQgJiBTNSAmIFM2ICYgUzcgJiBTOCAmIFM5PiB7XG5cbiAgICBsZXQgX2hhc1NvdXJjZUNvbnN0cnVjdG9yID0gZmFsc2U7XG5cbiAgICBjbGFzcyBfTWl4aW5CYXNlIGV4dGVuZHMgKGJhc2UgYXMgdW5rbm93biBhcyBDb25zdHJ1Y3RvcjxNaXhpbkNsYXNzPikge1xuXG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgW19jb25zdHJ1Y3RvcnNdOiBNYXA8Q29uc3RydWN0b3I8b2JqZWN0PiwgVW5rbm93bkZ1bmN0aW9uIHwgbnVsbD47XG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgW19jbGFzc0Jhc2VdOiBDb25zdHJ1Y3RvcjxvYmplY3Q+O1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKC4uLmFyZ3M6IHVua25vd25bXSkge1xuICAgICAgICAgICAgc3VwZXIoLi4uYXJncyk7XG5cbiAgICAgICAgICAgIGNvbnN0IGNvbnN0cnVjdG9ycyA9IG5ldyBNYXA8Q29uc3RydWN0b3I8b2JqZWN0PiwgVW5rbm93bkZ1bmN0aW9uPigpO1xuICAgICAgICAgICAgdGhpc1tfY29uc3RydWN0b3JzXSA9IGNvbnN0cnVjdG9ycztcbiAgICAgICAgICAgIHRoaXNbX2NsYXNzQmFzZV0gPSBiYXNlO1xuXG4gICAgICAgICAgICBpZiAoX2hhc1NvdXJjZUNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzcmNDbGFzcyBvZiBzb3VyY2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc3JjQ2xhc3NbX3Byb3RvRXh0ZW5kc09ubHldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoYW5kbGVyID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcGx5OiAodGFyZ2V0OiB1bmtub3duLCB0aGlzb2JqOiB1bmtub3duLCBhcmdsaXN0OiB1bmtub3duW10pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb2JqID0gbmV3IHNyY0NsYXNzKC4uLmFyZ2xpc3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3B5UHJvcGVydGllcyh0aGlzLCBvYmopO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBwcm94eSBmb3IgJ2NvbnN0cnVjdCcgYW5kIGNhY2hlIGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3RvcnMuc2V0KHNyY0NsYXNzLCBuZXcgUHJveHkoc3JjQ2xhc3MsIGhhbmRsZXIgYXMgUHJveHlIYW5kbGVyPG9iamVjdD4pKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHByb3RlY3RlZCBzdXBlcjxUIGV4dGVuZHMgQ2xhc3M+KHNyY0NsYXNzOiBULCAuLi5hcmdzOiBDb25zdHJ1Y3RvclBhcmFtZXRlcnM8VD4pOiB0aGlzIHtcbiAgICAgICAgICAgIGNvbnN0IG1hcCA9IHRoaXNbX2NvbnN0cnVjdG9yc107XG4gICAgICAgICAgICBjb25zdCBjdG9yID0gbWFwLmdldChzcmNDbGFzcyk7XG4gICAgICAgICAgICBpZiAoY3Rvcikge1xuICAgICAgICAgICAgICAgIGN0b3IuY2FsbCh0aGlzLCAuLi5hcmdzKTtcbiAgICAgICAgICAgICAgICBtYXAuc2V0KHNyY0NsYXNzLCBudWxsKTsgICAgLy8gcHJldmVudCBjYWxsaW5nIHR3aWNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBpc01peGVkV2l0aDxUIGV4dGVuZHMgb2JqZWN0PihzcmNDbGFzczogQ29uc3RydWN0b3I8VD4pOiBib29sZWFuIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbnN0cnVjdG9yID09PSBzcmNDbGFzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpc1tfY2xhc3NCYXNlXSA9PT0gc3JjQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXNbX2NsYXNzU291cmNlc10ucmVkdWNlKChwLCBjKSA9PiBwIHx8IChzcmNDbGFzcyA9PT0gYyksIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgW1N5bWJvbC5oYXNJbnN0YW5jZV0oaW5zdGFuY2U6IHVua25vd24pOiBib29sZWFuIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YuY2FsbChfTWl4aW5CYXNlLnByb3RvdHlwZSwgaW5zdGFuY2UgYXMgb2JqZWN0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBbX2lzSW5oZXJpdGVkXTxUIGV4dGVuZHMgb2JqZWN0PihzcmNDbGFzczogQ29uc3RydWN0b3I8VD4pOiBib29sZWFuIHtcbiAgICAgICAgICAgIGNvbnN0IGN0b3JzID0gdGhpc1tfY29uc3RydWN0b3JzXTtcbiAgICAgICAgICAgIGlmIChjdG9ycy5oYXMoc3JjQ2xhc3MpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGN0b3Igb2YgY3RvcnMua2V5cygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZi5jYWxsKHNyY0NsYXNzLCBjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBwcml2YXRlIGdldCBbX2NsYXNzU291cmNlc10oKTogQ29uc3RydWN0b3I8b2JqZWN0PltdIHtcbiAgICAgICAgICAgIHJldHVybiBbLi4udGhpc1tfY29uc3RydWN0b3JzXS5rZXlzKCldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBzcmNDbGFzcyBvZiBzb3VyY2VzKSB7XG4gICAgICAgIC8vIHByb3ZpZGUgY3VzdG9tIGluc3RhbmNlb2ZcbiAgICAgICAgY29uc3QgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc3JjQ2xhc3MsIFN5bWJvbC5oYXNJbnN0YW5jZSk7XG4gICAgICAgIGlmICghZGVzYyB8fCBkZXNjLndyaXRhYmxlKSB7XG4gICAgICAgICAgICBjb25zdCBvcmdJbnN0YW5jZU9mID0gZGVzYyA/IHNyY0NsYXNzW1N5bWJvbC5oYXNJbnN0YW5jZV0gOiBfaW5zdGFuY2VPZjtcbiAgICAgICAgICAgIHNldEluc3RhbmNlT2Yoc3JjQ2xhc3MsIChpbnN0OiBvYmplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBvYmogPSBpbnN0IGFzIEFjY2Vzc2libGU8b2JqZWN0PjtcbiAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci1udWxsaXNoLWNvYWxlc2NpbmdcbiAgICAgICAgICAgICAgICByZXR1cm4gb3JnSW5zdGFuY2VPZi5jYWxsKHNyY0NsYXNzLCBpbnN0KSB8fCAoKG9iaj8uW19pc0luaGVyaXRlZF0pID8gKG9ialtfaXNJbmhlcml0ZWRdIGFzIFVua25vd25GdW5jdGlvbikoc3JjQ2xhc3MpIDogZmFsc2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcHJvdmlkZSBwcm90b3R5cGVcbiAgICAgICAgY29weVByb3BlcnRpZXMoX01peGluQmFzZS5wcm90b3R5cGUsIHNyY0NsYXNzLnByb3RvdHlwZSk7XG4gICAgICAgIGxldCBwYXJlbnQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yoc3JjQ2xhc3MucHJvdG90eXBlKTtcbiAgICAgICAgd2hpbGUgKF9vYmpQcm90b3R5cGUgIT09IHBhcmVudCkge1xuICAgICAgICAgICAgY29weVByb3BlcnRpZXMoX01peGluQmFzZS5wcm90b3R5cGUsIHBhcmVudCk7XG4gICAgICAgICAgICBwYXJlbnQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocGFyZW50KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBjaGVjayBjb25zdHJ1Y3RvclxuICAgICAgICBpZiAoIV9oYXNTb3VyY2VDb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgX2hhc1NvdXJjZUNvbnN0cnVjdG9yID0gIXNyY0NsYXNzW19wcm90b0V4dGVuZHNPbmx5XTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBfTWl4aW5CYXNlIGFzIGFueTtcbn1cbiIsImltcG9ydCB7IGFzc2lnblZhbHVlLCBkZWVwRXF1YWwgfSBmcm9tICcuL2RlZXAtY2lyY3VpdCc7XG5pbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bk9iamVjdCxcbiAgICB0eXBlIEFjY2Vzc2libGUsXG4gICAgdHlwZSBOdWxsaXNoLFxuICAgIHR5cGUgV3JpdGFibGUsXG4gICAgaXNBcnJheSxcbiAgICBpc09iamVjdCxcbiAgICBpc0Z1bmN0aW9uLFxufSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IHZlcmlmeSB9IGZyb20gJy4vdmVyaWZ5JztcblxuLyoqXG4gKiBAZW4gQ2hlY2sgd2hldGhlciBpbnB1dCBzb3VyY2UgaGFzIGEgcHJvcGVydHkuXG4gKiBAamEg5YWl5Yqb5YWD44GM44OX44Ot44OR44OG44Kj44KS5oyB44Gj44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNyY1xuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzKHNyYzogdW5rbm93biwgcHJvcE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBudWxsICE9IHNyYyAmJiBpc09iamVjdChzcmMpICYmIChwcm9wTmFtZSBpbiBzcmMpO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgc2hhbGxvdyBjb3B5IG9mIGB0YXJnZXRgIHdoaWNoIGhhcyBvbmx5IGBwaWNrS2V5c2AuXG4gKiBAamEgYHBpY2tLZXlzYCDjgafmjIflrprjgZXjgozjgZ/jg5fjg63jg5Hjg4bjgqPjga7jgb/jgpLmjIHjgaQgYHRhcmdldGAg44GuIFNoYWxsb3cgQ29weSDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIGNvcHkgc291cmNlIG9iamVjdFxuICogIC0gYGphYCDjgrPjg5Tjg7zlhYPjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBwaWNrS2V5c1xuICogIC0gYGVuYCBjb3B5IHRhcmdldCBrZXlzXG4gKiAgLSBgamFgIOOCs+ODlOODvOWvvuixoeOBruOCreODvOS4gOimp1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGljazxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMga2V5b2YgVD4odGFyZ2V0OiBULCAuLi5waWNrS2V5czogS1tdKTogV3JpdGFibGU8UGljazxULCBLPj4ge1xuICAgIHZlcmlmeSgndHlwZU9mJywgJ29iamVjdCcsIHRhcmdldCk7XG4gICAgcmV0dXJuIHBpY2tLZXlzLnJlZHVjZSgob2JqLCBrZXkpID0+IHtcbiAgICAgICAga2V5IGluIHRhcmdldCAmJiBhc3NpZ25WYWx1ZShvYmosIGtleSwgdGFyZ2V0W2tleV0pO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH0sIHt9IGFzIFdyaXRhYmxlPFBpY2s8VCwgSz4+KTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHNoYWxsb3cgY29weSBvZiBgdGFyZ2V0YCB3aXRob3V0IGBvbWl0S2V5c2AuXG4gKiBAamEgYG9taXRLZXlzYCDjgafmjIflrprjgZXjgozjgZ/jg5fjg63jg5Hjg4bjgqPku6XlpJbjga7jgq3jg7zjgpLmjIHjgaQgYHRhcmdldGAg44GuIFNoYWxsb3cgQ29weSDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIGNvcHkgc291cmNlIG9iamVjdFxuICogIC0gYGphYCDjgrPjg5Tjg7zlhYPjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBvbWl0S2V5c1xuICogIC0gYGVuYCBvbWl0IHRhcmdldCBrZXlzXG4gKiAgLSBgamFgIOWJiumZpOWvvuixoeOBruOCreODvOS4gOimp1xuICovXG5leHBvcnQgZnVuY3Rpb24gb21pdDxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMga2V5b2YgVD4odGFyZ2V0OiBULCAuLi5vbWl0S2V5czogS1tdKTogV3JpdGFibGU8T21pdDxULCBLPj4ge1xuICAgIHZlcmlmeSgndHlwZU9mJywgJ29iamVjdCcsIHRhcmdldCk7XG4gICAgY29uc3Qgb2JqID0ge30gYXMgV3JpdGFibGU8T21pdDxULCBLPj47XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGFyZ2V0KSkge1xuICAgICAgICAhb21pdEtleXMuaW5jbHVkZXMoa2V5IGFzIEspICYmIGFzc2lnblZhbHVlKG9iaiwga2V5LCAodGFyZ2V0IGFzIFVua25vd25PYmplY3QpW2tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIEBlbiBJbnZlcnQgdGhlIGtleXMgYW5kIHZhbHVlcyBvZiBhbiBvYmplY3QuIFRoZSB2YWx1ZXMgbXVzdCBiZSBzZXJpYWxpemFibGUuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu44Kt44O844Go5YCk44KS6YCG6Lui44GZ44KLLiDjgZnjgbnjgabjga7lgKTjgYzjg6bjg4vjg7zjgq/jgafjgYLjgovjgZPjgajjgYzliY3mj5BcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBvYmplY3RcbiAqICAtIGBqYWAg5a++6LGh44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnZlcnQ8VCBleHRlbmRzIG9iamVjdCA9IFVua25vd25PYmplY3Q+KHRhcmdldDogb2JqZWN0KTogVCB7XG4gICAgY29uc3QgcmVzdWx0ID0ge307XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGFyZ2V0KSkge1xuICAgICAgICBhc3NpZ25WYWx1ZShyZXN1bHQsICh0YXJnZXQgYXMgVW5rbm93bk9iamVjdClba2V5XSBhcyAoc3RyaW5nIHwgbnVtYmVyIHwgc3ltYm9sKSwga2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdCBhcyBUO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgc2hhbGxvdyBjb3B5IG9mIGRpZmZlcmVuY2UgYmV0d2VlbiBgYmFzZWAgYW5kIGBzcmNgLlxuICogQGphIGBiYXNlYCDjgaggYHNyY2Ag44Gu5beu5YiG44OX44Ot44OR44OG44Kj44KS44KC44Gk44Kq44OW44K444Kn44Kv44OI44GuIFNoYWxsb3cgQ29weSDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmFzZVxuICogIC0gYGVuYCBiYXNlIG9iamVjdFxuICogIC0gYGphYCDln7rmupbjgajjgarjgovjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIG9iamVjdFxuICogIC0gYGphYCDjgrPjg5Tjg7zlhYPjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpZmY8VCBleHRlbmRzIG9iamVjdD4oYmFzZTogVCwgc3JjOiBQYXJ0aWFsPFQ+KTogUGFydGlhbDxUPiB7XG4gICAgdmVyaWZ5KCd0eXBlT2YnLCAnb2JqZWN0JywgYmFzZSk7XG4gICAgdmVyaWZ5KCd0eXBlT2YnLCAnb2JqZWN0Jywgc3JjKTtcblxuICAgIGNvbnN0IHJldHZhbDogUGFydGlhbDxUPiA9IHt9O1xuXG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc3JjKSkge1xuICAgICAgICBpZiAoIWRlZXBFcXVhbCgoYmFzZSBhcyBVbmtub3duT2JqZWN0KVtrZXldLCAoc3JjIGFzIFVua25vd25PYmplY3QpW2tleV0pKSB7XG4gICAgICAgICAgICBhc3NpZ25WYWx1ZShyZXR2YWwsIGtleSwgKHNyYyBhcyBVbmtub3duT2JqZWN0KVtrZXldKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8qKlxuICogQGVuIEdldCBzaGFsbG93IGNvcHkgb2YgYGJhc2VgIHdpdGhvdXQgYGRyb3BWYWx1ZWAuXG4gKiBAamEgYGRyb3BWYWx1ZWAg44Gn5oyH5a6a44GV44KM44Gf44OX44Ot44OR44OG44Kj5YCk5Lul5aSW44Gu44Kt44O844KS5oyB44GkIGB0YXJnZXRgIOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGJhc2VcbiAqICAtIGBlbmAgYmFzZSBvYmplY3RcbiAqICAtIGBqYWAg5Z+65rqW44Go44Gq44KL44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gZHJvcFZhbHVlc1xuICogIC0gYGVuYCB0YXJnZXQgdmFsdWUuIGRlZmF1bHQ6IGB1bmRlZmluZWRgLlxuICogIC0gYGphYCDlr77osaHjga7lgKQuIOaXouWumuWApDogYHVuZGVmaW5lZGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRyb3A8VCBleHRlbmRzIG9iamVjdD4oYmFzZTogVCwgLi4uZHJvcFZhbHVlczogdW5rbm93bltdKTogUGFydGlhbDxUPiB7XG4gICAgdmVyaWZ5KCd0eXBlT2YnLCAnb2JqZWN0JywgYmFzZSk7XG5cbiAgICBjb25zdCB2YWx1ZXMgPSBbLi4uZHJvcFZhbHVlc107XG4gICAgaWYgKCF2YWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgIHZhbHVlcy5wdXNoKHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgY29uc3QgcmV0dmFsID0geyAuLi5iYXNlIH0gYXMgQWNjZXNzaWJsZTxQYXJ0aWFsPFQ+PjtcblxuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGJhc2UpKSB7XG4gICAgICAgIGZvciAoY29uc3QgdmFsIG9mIHZhbHVlcykge1xuICAgICAgICAgICAgaWYgKGRlZXBFcXVhbCh2YWwsIHJldHZhbFtrZXldKSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSByZXR2YWxba2V5XTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8qKlxuICogQGVuIElmIHRoZSB2YWx1ZSBvZiB0aGUgbmFtZWQgcHJvcGVydHkgaXMgYSBmdW5jdGlvbiB0aGVuIGludm9rZSBpdDsgb3RoZXJ3aXNlLCByZXR1cm4gaXQuXG4gKiBAamEgb2JqZWN0IOOBriBwcm9wZXJ0eSDjgYzjg6Hjgr3jg4Pjg4njgarjgonjgZ3jga7lrp/ooYzntZDmnpzjgpIsIOODl+ODreODkeODhuOCo+OBquOCieOBneOBruWApOOCkui/lOWNtFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqIC0gYGVuYCBPYmplY3QgdG8gbWF5YmUgaW52b2tlIGZ1bmN0aW9uIGBwcm9wZXJ0eWAgb24uXG4gKiAtIGBqYWAg6KmV5L6h44GZ44KL44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gcHJvcGVydHlcbiAqIC0gYGVuYCBUaGUgZnVuY3Rpb24gYnkgbmFtZSB0byBpbnZva2Ugb24gYG9iamVjdGAuXG4gKiAtIGBqYWAg6KmV5L6h44GZ44KL44OX44Ot44OR44OG44Kj5ZCNXG4gKiBAcGFyYW0gZmFsbGJhY2tcbiAqIC0gYGVuYCBUaGUgdmFsdWUgdG8gYmUgcmV0dXJuZWQgaW4gY2FzZSBgcHJvcGVydHlgIGRvZXNuJ3QgZXhpc3Qgb3IgaXMgdW5kZWZpbmVkLlxuICogLSBgamFgIOWtmOWcqOOBl+OBquOBi+OBo+OBn+WgtOWQiOOBriBmYWxsYmFjayDlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc3VsdDxUID0gYW55Pih0YXJnZXQ6IG9iamVjdCB8IE51bGxpc2gsIHByb3BlcnR5OiBzdHJpbmcgfCBzdHJpbmdbXSwgZmFsbGJhY2s/OiBUKTogVCB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IHJlc29sdmUgPSAobzogdW5rbm93biwgcDogdW5rbm93bik6IHVua25vd24gPT4ge1xuICAgICAgICByZXR1cm4gaXNGdW5jdGlvbihwKSA/IHAuY2FsbChvKSA6IHA7XG4gICAgfTtcblxuICAgIGNvbnN0IHByb3BzID0gaXNBcnJheShwcm9wZXJ0eSkgPyBwcm9wZXJ0eSA6IFtwcm9wZXJ0eV07XG4gICAgaWYgKCFwcm9wcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHJlc29sdmUodGFyZ2V0LCBmYWxsYmFjaykgYXMgVDtcbiAgICB9XG5cbiAgICBsZXQgb2JqID0gdGFyZ2V0IGFzIFVua25vd25PYmplY3Q7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHByb3BzKSB7XG4gICAgICAgIGNvbnN0IHByb3AgPSBudWxsID09IG9iaiA/IHVuZGVmaW5lZCA6IG9ialtuYW1lXTtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gcHJvcCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUob2JqLCBmYWxsYmFjaykgYXMgVDtcbiAgICAgICAgfVxuICAgICAgICBvYmogPSByZXNvbHZlKG9iaiwgcHJvcCkgYXMgVW5rbm93bk9iamVjdDtcbiAgICB9XG4gICAgcmV0dXJuIG9iaiBhcyB1bmtub3duIGFzIFQ7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gY2FsbGFibGUoKTogdW5rbm93biB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11c2UtYmVmb3JlLWRlZmluZVxuICAgIHJldHVybiBhY2Nlc3NpYmxlO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBhY2Nlc3NpYmxlOiB1bmtub3duID0gbmV3IFByb3h5KGNhbGxhYmxlLCB7XG4gICAgZ2V0OiAodGFyZ2V0OiBhbnksIG5hbWUpID0+IHtcbiAgICAgICAgY29uc3QgcHJvcCA9IHRhcmdldFtuYW1lXTtcbiAgICAgICAgaWYgKG51bGwgIT0gcHJvcCkge1xuICAgICAgICAgICAgcmV0dXJuIHByb3A7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYWNjZXNzaWJsZTtcbiAgICAgICAgfVxuICAgIH0sXG59KTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gY3JlYXRlKCk6IHVua25vd24ge1xuICAgIGNvbnN0IHN0dWIgPSBuZXcgUHJveHkoe30sIHtcbiAgICAgICAgZ2V0OiAodGFyZ2V0OiBhbnksIG5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHByb3AgPSB0YXJnZXRbbmFtZV07XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBwcm9wKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb3A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2Nlc3NpYmxlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHN0dWIsICdzdHViJywge1xuICAgICAgICB2YWx1ZTogdHJ1ZSxcbiAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN0dWI7XG59XG5cbi8qKlxuICogQGVuIEdldCBzYWZlIGFjY2Vzc2libGUgb2JqZWN0LlxuICogQGphIOWuieWFqOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCquODluOCuOOCp+OCr+ODiOOBruWPluW+l1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3Qgc2FmZVdpbmRvdyA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuICogY29uc29sZS5sb2cobnVsbCAhPSBzYWZlV2luZG93LmRvY3VtZW50KTsgICAgLy8gdHJ1ZVxuICogY29uc3QgZGl2ID0gc2FmZVdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAqIGNvbnNvbGUubG9nKG51bGwgIT0gZGl2KTsgICAgLy8gdHJ1ZVxuICogYGBgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBBIHJlZmVyZW5jZSBvZiBhbiBvYmplY3Qgd2l0aCBhIHBvc3NpYmlsaXR5IHdoaWNoIGV4aXN0cy5cbiAqICAtIGBqYWAg5a2Y5Zyo44GX44GG44KL44Kq44OW44K444Kn44Kv44OI44Gu5Y+C54WnXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZWFsaXR5IG9yIHN0dWIgaW5zdGFuY2UuXG4gKiAgLSBgamFgIOWun+S9k+OBvuOBn+OBr+OCueOCv+ODluOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FmZTxUPih0YXJnZXQ6IFQpOiBUIHtcbiAgICByZXR1cm4gdGFyZ2V0IHx8IGNyZWF0ZSgpIGFzIFQ7XG59XG4iLCJpbXBvcnQgdHlwZSB7IEFueUZ1bmN0aW9uIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBnZXRHbG9iYWwgfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgeyBzYWZlIH0gZnJvbSAnLi9zYWZlJztcblxuLyoqXG4gKiBAZW4gVHlwZSBvZiBoYW5kbGUgZm9yIHRpbWVyIGZ1bmN0aW9ucy5cbiAqIEBqYSDjgr/jgqTjg57jg7zplqLmlbDjgavkvb/nlKjjgZnjgovjg4/jg7Pjg4njg6vlnotcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUaW1lckhhbmRsZSB7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktb2JqZWN0LXR5cGVcblxuLyoqXG4gKiBAZW4gVHlwZSBvZiB0aW1lciBzdGFydCBmdW5jdGlvbnMuXG4gKiBAamEg44K/44Kk44Oe44O86ZaL5aeL6Zai5pWw44Gu5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFRpbWVyU3RhcnRGdW5jdGlvbiA9IChoYW5kbGVyOiBBbnlGdW5jdGlvbiwgdGltZW91dD86IG51bWJlciwgLi4uYXJnczogdW5rbm93bltdKSA9PiBUaW1lckhhbmRsZTtcblxuLyoqXG4gKiBAZW4gVHlwZSBvZiB0aW1lciBzdG9wIGZ1bmN0aW9ucy5cbiAqIEBqYSDjgr/jgqTjg57jg7zlgZzmraLplqLmlbDjga7lnotcbiAqL1xuZXhwb3J0IHR5cGUgVGltZXJTdG9wRnVuY3Rpb24gPSAoaGFuZGxlOiBUaW1lckhhbmRsZSkgPT4gdm9pZDtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFRpbWVyQ29udGV4dCB7XG4gICAgc2V0VGltZW91dDogVGltZXJTdGFydEZ1bmN0aW9uO1xuICAgIGNsZWFyVGltZW91dDogVGltZXJTdG9wRnVuY3Rpb247XG4gICAgc2V0SW50ZXJ2YWw6IFRpbWVyU3RhcnRGdW5jdGlvbjtcbiAgICBjbGVhckludGVydmFsOiBUaW1lclN0b3BGdW5jdGlvbjtcbn1cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcm9vdCA9IGdldEdsb2JhbCgpIGFzIHVua25vd24gYXMgVGltZXJDb250ZXh0O1xuY29uc3Qgc2V0VGltZW91dDogVGltZXJTdGFydEZ1bmN0aW9uICAgPSBzYWZlKF9yb290LnNldFRpbWVvdXQpLmJpbmQoX3Jvb3QpO1xuY29uc3QgY2xlYXJUaW1lb3V0OiBUaW1lclN0b3BGdW5jdGlvbiAgPSBzYWZlKF9yb290LmNsZWFyVGltZW91dCkuYmluZChfcm9vdCk7XG5jb25zdCBzZXRJbnRlcnZhbDogVGltZXJTdGFydEZ1bmN0aW9uICA9IHNhZmUoX3Jvb3Quc2V0SW50ZXJ2YWwpLmJpbmQoX3Jvb3QpO1xuY29uc3QgY2xlYXJJbnRlcnZhbDogVGltZXJTdG9wRnVuY3Rpb24gPSBzYWZlKF9yb290LmNsZWFySW50ZXJ2YWwpLmJpbmQoX3Jvb3QpO1xuXG5leHBvcnQge1xuICAgIHNldFRpbWVvdXQsXG4gICAgY2xlYXJUaW1lb3V0LFxuICAgIHNldEludGVydmFsLFxuICAgIGNsZWFySW50ZXJ2YWwsXG59O1xuIiwiaW1wb3J0IHtcbiAgICB0eXBlIEFueUZ1bmN0aW9uLFxuICAgIHR5cGUgUHJpbWl0aXZlLFxuICAgIHR5cGUgVHlwZWREYXRhLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQm9vbGVhbixcbiAgICBpc09iamVjdCxcbn0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBpbnZlcnQgfSBmcm9tICcuL29iamVjdCc7XG5pbXBvcnQge1xuICAgIHR5cGUgVGltZXJIYW5kbGUsXG4gICAgc2V0VGltZW91dCxcbiAgICBjbGVhclRpbWVvdXQsXG59IGZyb20gJy4vdGltZXInO1xuXG4vKipcbiAqIEBlbiBFbnN1cmUgYXN5bmNocm9ub3VzIGV4ZWN1dGlvbi5cbiAqIEBqYSDpnZ7lkIzmnJ/lrp/ooYzjgpLkv53oqLxcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIHZvaWQgcG9zdCgoKSA9PiBleGVjKGFyZykpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIGltcGxlbWVudCBhcyBmdW5jdGlvbiBzY29wZS5cbiAqICAtIGBqYWAg6Zai5pWw44K544Kz44O844OX44Go44GX44Gm5a6f6KOFXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3Q8VD4oZXhlY3V0b3I6ICgpID0+IFQpOiBQcm9taXNlPFQ+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkudGhlbihleGVjdXRvcik7XG59XG5cbi8qKlxuICogQGVuIEdlbmVyaWMgTm8tT3BlcmF0aW9uLlxuICogQGphIOaxjueUqCBOby1PcGVyYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vb3AoLi4uYXJnczogdW5rbm93bltdKTogYW55IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAvLyBub29wXG59XG5cbi8qKlxuICogQGVuIFdhaXQgZm9yIHRoZSBkZXNpZ25hdGlvbiBlbGFwc2UuXG4gKiBAamEg5oyH5a6a5pmC6ZaT5Yem55CG44KS5b6F5qmfXG4gKlxuICogQHBhcmFtIGVsYXBzZVxuICogIC0gYGVuYCB3YWl0IGVsYXBzZSBbbXNlY10uXG4gKiAgLSBgamFgIOW+heapn+aZgumWkyBbbXNlY11cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNsZWVwKGVsYXBzZTogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBlbGFwc2UpKTtcbn1cblxuLyoqXG4gKiBAZW4gT3B0aW9uIGludGVyZmFjZSBmb3Ige0BsaW5rIGRlYm91bmNlfSgpLlxuICogQGphIHtAbGluayBkZWJvdW5jZX0oKSDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7PjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEZWJvdW5jZU9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIEBlbiB0aGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlIGRlbGF5ZWQgYmVmb3JlIGl0J3MgaW52b2tlZC5cbiAgICAgKiBAamEg44Kz44O844Or44OQ44OD44Kv44Gu5ZG844Gz5Ye644GX44KS5b6F44Gk5pyA5aSn5pmC6ZaTXG4gICAgICovXG4gICAgbWF4V2FpdD86IG51bWJlcjtcbiAgICAvKipcbiAgICAgKiBAZW4gU3BlY2lmeSBgdHJ1ZWAgaWYgeW91IHdhbnQgdG8gY2FsbCB0aGUgY2FsbGJhY2sgbGVhZGluZyBlZGdlIG9mIHRoZSB3YWl0aW5nIHRpbWUuIChkZWZhdWx0OiBmYWxzZSlcbiAgICAgKiBAamEg5b6F44Gh5pmC6ZaT44Gr5a++44GX44Gm44Kz44O844Or44OQ44OD44Kv44KS5YWI5ZG844Gz5a6f6KGM44GZ44KL5aC05ZCI44GvIGB0cnVlYCDjgpLmjIflrpouIChkZWZhdWx0OiBmYWxzZSlcbiAgICAgKi9cbiAgICBsZWFkaW5nPzogYm9vbGVhbjtcbiAgICAvKipcbiAgICAgKiBAZW4gU3BlY2lmeSBgdHJ1ZWAgaWYgeW91IHdhbnQgdG8gY2FsbCB0aGUgY2FsbGJhY2sgdHJhaWxpbmcgZWRnZSBvZiB0aGUgd2FpdGluZyB0aW1lLiAoZGVmYXVsdDogdHJ1ZSlcbiAgICAgKiBAamEg5b6F44Gh5pmC6ZaT44Gr5a++44GX44Gm44Kz44O844Or44OQ44OD44Kv44KS5b6M5ZG844Gz5a6f6KGM44GZ44KL5aC05ZCI44GvIGB0cnVlYCDjgpLmjIflrpouIChkZWZhdWx0OiB0cnVlKVxuICAgICAqL1xuICAgIHRyYWlsaW5nPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IHR5cGUgRGVib3VuY2VkRnVuY3Rpb248VCBleHRlbmRzIEFueUZ1bmN0aW9uPiA9IFQgJiB7IGNhbmNlbCgpOiB2b2lkOyBmbHVzaCgpOiBSZXR1cm5UeXBlPFQ+OyBwZW5kaW5nKCk6IGJvb2xlYW47IH07XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgYXMgbG9uZyBhcyBpdCBjb250aW51ZXMgdG8gYmUgaW52b2tlZCwgd2lsbCBub3QgYmUgdHJpZ2dlcmVkLlxuICogQGphIOWRvOOBs+WHuuOBleOCjOOBpuOBi+OCiSB3YWl0IFttc2VjXSDntYzpgY7jgZnjgovjgb7jgaflrp/ooYzjgZfjgarjgYTplqLmlbDjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWwXG4gKiBAcGFyYW0gd2FpdFxuICogIC0gYGVuYCB3YWl0IGVsYXBzZSBbbXNlY10uXG4gKiAgLSBgamFgIOW+heapn+aZgumWkyBbbXNlY11cbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHNwZWNpZnkge0BsaW5rIERlYm91bmNlT3B0aW9uc30gb2JqZWN0IG9yIGB0cnVlYCB0byBmaXJlIHRoZSBjYWxsYmFjayBpbW1lZGlhdGVseS5cbiAqICAtIGBqYWAge0BsaW5rIERlYm91bmNlT3B0aW9uc30gb2JqZWN0IOOCguOBl+OBj+OBr+WNs+aZguOBq+OCs+ODvOODq+ODkOODg+OCr+OCkueZuueBq+OBmeOCi+OBqOOBjeOBryBgdHJ1ZWAg44KS5oyH5a6aLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVib3VuY2U8VCBleHRlbmRzIEFueUZ1bmN0aW9uPihleGVjdXRvcjogVCwgd2FpdDogbnVtYmVyLCBvcHRpb25zPzogRGVib3VuY2VPcHRpb25zIHwgYm9vbGVhbik6IERlYm91bmNlZEZ1bmN0aW9uPFQ+IHtcbiAgICB0eXBlIFJlc3VsdCA9IFJldHVyblR5cGU8VD4gfCB1bmRlZmluZWQ7XG5cbiAgICBsZXQgbGFzdEFyZ3M6IHVua25vd247XG4gICAgbGV0IGxhc3RUaGlzOiB1bmtub3duO1xuICAgIGxldCByZXN1bHQ6IFJlc3VsdDtcbiAgICBsZXQgbGFzdENhbGxUaW1lOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gICAgbGV0IHRpbWVySWQ6IFRpbWVySGFuZGxlIHwgdW5kZWZpbmVkO1xuICAgIGxldCBsYXN0SW52b2tlVGltZSA9IDA7XG5cbiAgICBjb25zdCB3YWl0VmFsdWUgPSBOdW1iZXIod2FpdCkgfHwgMDtcblxuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgbGVhZGluZzogZmFsc2UsIHRyYWlsaW5nOiB0cnVlIH0sIChpc0Jvb2xlYW4ob3B0aW9ucykgPyB7IGxlYWRpbmc6IG9wdGlvbnMsIHRyYWlsaW5nOiAhb3B0aW9ucyB9IDogb3B0aW9ucykpO1xuICAgIGNvbnN0IHsgbGVhZGluZywgdHJhaWxpbmcgfSA9IG9wdHM7XG4gICAgY29uc3QgbWF4V2FpdCA9IG51bGwgIT0gb3B0cy5tYXhXYWl0ID8gTWF0aC5tYXgoTnVtYmVyKG9wdHMubWF4V2FpdCkgfHwgMCwgd2FpdFZhbHVlKSA6IG51bGw7XG5cbiAgICBjb25zdCBpbnZva2VGdW5jID0gKHRpbWU6IG51bWJlcik6IFJlc3VsdCA9PiB7XG4gICAgICAgIGNvbnN0IGFyZ3MgPSBsYXN0QXJncztcbiAgICAgICAgY29uc3QgdGhpc0FyZyA9IGxhc3RUaGlzO1xuXG4gICAgICAgIGxhc3RBcmdzID0gbGFzdFRoaXMgPSB1bmRlZmluZWQ7XG4gICAgICAgIGxhc3RJbnZva2VUaW1lID0gdGltZTtcbiAgICAgICAgcmVzdWx0ID0gZXhlY3V0b3IuYXBwbHkodGhpc0FyZywgYXJncyBhcyBQYXJhbWV0ZXJzPFQ+KSBhcyBSZXN1bHQ7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcblxuICAgIGNvbnN0IHJlbWFpbmluZ1dhaXQgPSAodGltZTogbnVtYmVyKTogbnVtYmVyID0+IHtcbiAgICAgICAgY29uc3QgdGltZVNpbmNlTGFzdENhbGwgPSB0aW1lIC0gbGFzdENhbGxUaW1lITtcbiAgICAgICAgY29uc3QgdGltZVNpbmNlTGFzdEludm9rZSA9IHRpbWUgLSBsYXN0SW52b2tlVGltZTtcbiAgICAgICAgY29uc3QgdGltZVdhaXRpbmcgPSB3YWl0VmFsdWUgLSB0aW1lU2luY2VMYXN0Q2FsbDtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gbWF4V2FpdCA/IE1hdGgubWluKHRpbWVXYWl0aW5nLCBtYXhXYWl0IC0gdGltZVNpbmNlTGFzdEludm9rZSkgOiB0aW1lV2FpdGluZztcbiAgICB9O1xuXG4gICAgY29uc3Qgc2hvdWxkSW52b2tlID0gKHRpbWU6IG51bWJlcik6IGJvb2xlYW4gPT4ge1xuICAgICAgICBpZiAodW5kZWZpbmVkID09PSBsYXN0Q2FsbFRpbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRpbWVTaW5jZUxhc3RDYWxsID0gdGltZSAtIGxhc3RDYWxsVGltZTtcbiAgICAgICAgY29uc3QgdGltZVNpbmNlTGFzdEludm9rZSA9IHRpbWUgLSBsYXN0SW52b2tlVGltZTtcbiAgICAgICAgcmV0dXJuIHRpbWVTaW5jZUxhc3RDYWxsID49IHdhaXRWYWx1ZSB8fCB0aW1lU2luY2VMYXN0Q2FsbCA8IDAgfHwgKG1heFdhaXQgIT09IG51bGwgJiYgdGltZVNpbmNlTGFzdEludm9rZSA+PSBtYXhXYWl0KTtcbiAgICB9O1xuXG4gICAgY29uc3QgdHJhaWxpbmdFZGdlID0gKHRpbWU6IG51bWJlcik6IFJlc3VsdCA9PiB7XG4gICAgICAgIHRpbWVySWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmICh0cmFpbGluZyAmJiBsYXN0QXJncykge1xuICAgICAgICAgICAgcmV0dXJuIGludm9rZUZ1bmModGltZSk7XG4gICAgICAgIH1cbiAgICAgICAgbGFzdEFyZ3MgPSBsYXN0VGhpcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgY29uc3QgdGltZXJFeHBpcmVkID0gKCk6IFJlc3VsdCB8IHZvaWQgPT4ge1xuICAgICAgICBjb25zdCB0aW1lID0gRGF0ZS5ub3coKTtcbiAgICAgICAgaWYgKHNob3VsZEludm9rZSh0aW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRyYWlsaW5nRWRnZSh0aW1lKTtcbiAgICAgICAgfVxuICAgICAgICB0aW1lcklkID0gc2V0VGltZW91dCh0aW1lckV4cGlyZWQsIHJlbWFpbmluZ1dhaXQodGltZSkpO1xuICAgIH07XG5cbiAgICBjb25zdCBsZWFkaW5nRWRnZSA9ICh0aW1lOiBudW1iZXIpOiBSZXN1bHQgPT4ge1xuICAgICAgICBsYXN0SW52b2tlVGltZSA9IHRpbWU7XG4gICAgICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgd2FpdFZhbHVlKTtcbiAgICAgICAgcmV0dXJuIGxlYWRpbmcgPyBpbnZva2VGdW5jKHRpbWUpIDogcmVzdWx0O1xuICAgIH07XG5cbiAgICBjb25zdCBjYW5jZWwgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgIGlmICh1bmRlZmluZWQgIT09IHRpbWVySWQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcklkKTtcbiAgICAgICAgfVxuICAgICAgICBsYXN0SW52b2tlVGltZSA9IDA7XG4gICAgICAgIGxhc3RBcmdzID0gbGFzdENhbGxUaW1lID0gbGFzdFRoaXMgPSB0aW1lcklkID0gdW5kZWZpbmVkO1xuICAgIH07XG5cbiAgICBjb25zdCBmbHVzaCA9ICgpOiBSZXN1bHQgPT4ge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkID09PSB0aW1lcklkID8gcmVzdWx0IDogdHJhaWxpbmdFZGdlKERhdGUubm93KCkpO1xuICAgIH07XG5cbiAgICBjb25zdCBwZW5kaW5nID0gKCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSB0aW1lcklkO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBkZWJvdW5jZWQodGhpczogdW5rbm93biwgLi4uYXJnczogdW5rbm93bltdKTogUmVzdWx0IHtcbiAgICAgICAgY29uc3QgdGltZSA9IERhdGUubm93KCk7XG4gICAgICAgIGNvbnN0IGlzSW52b2tpbmcgPSBzaG91bGRJbnZva2UodGltZSk7XG5cbiAgICAgICAgbGFzdEFyZ3MgPSBhcmdzO1xuICAgICAgICBsYXN0VGhpcyA9IHRoaXM7ICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICAgICAgbGFzdENhbGxUaW1lID0gdGltZTtcblxuICAgICAgICBpZiAoaXNJbnZva2luZykge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gdGltZXJJZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWFkaW5nRWRnZShsYXN0Q2FsbFRpbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1heFdhaXQpIHtcbiAgICAgICAgICAgICAgICB0aW1lcklkID0gc2V0VGltZW91dCh0aW1lckV4cGlyZWQsIHdhaXRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGludm9rZUZ1bmMobGFzdENhbGxUaW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aW1lcklkID8/PSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgd2FpdFZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gY2FuY2VsO1xuICAgIGRlYm91bmNlZC5mbHVzaCA9IGZsdXNoO1xuICAgIGRlYm91bmNlZC5wZW5kaW5nID0gcGVuZGluZztcblxuICAgIHJldHVybiBkZWJvdW5jZWQgYXMgRGVib3VuY2VkRnVuY3Rpb248VD47XG59XG5cbi8qKlxuICogQGVuIE9wdGlvbiBpbnRlcmZhY2UgZm9yIHtAbGluayB0aHJvdHRsZX0oKS5cbiAqIEBqYSB7QGxpbmsgdGhyb3R0bGV9KCkg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44Oz44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGhyb3R0bGVPcHRpb25zIHtcbiAgICAvKipcbiAgICAgKiBAZW4gU3BlY2lmeSBgdHJ1ZWAgaWYgeW91IHdhbnQgdG8gY2FsbCB0aGUgY2FsbGJhY2sgbGVhZGluZyBlZGdlIG9mIHRoZSB3YWl0aW5nIHRpbWUuIChkZWZhdWx0OiB0cnVlKVxuICAgICAqIEBqYSDlvoXjgaHmmYLplpPjgavlr77jgZfjgabjgrPjg7zjg6vjg5Djg4Pjgq/jgpLlhYjlkbzjgbPlrp/ooYzjgZnjgovloLTlkIjjga8gYHRydWVgIOOCkuaMh+Wumi4gKGRlZmF1bHQ6IHRydWUpXG4gICAgICovXG4gICAgbGVhZGluZz86IGJvb2xlYW47XG4gICAgLyoqXG4gICAgICogQGVuIFNwZWNpZnkgYHRydWVgIGlmIHlvdSB3YW50IHRvIGNhbGwgdGhlIGNhbGxiYWNrIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHdhaXRpbmcgdGltZS4gKGRlZmF1bHQ6IHRydWUpXG4gICAgICogQGphIOW+heOBoeaZgumWk+OBq+WvvuOBl+OBpuOCs+ODvOODq+ODkOODg+OCr+OCkuW+jOWRvOOBs+Wun+ihjOOBmeOCi+WgtOWQiOOBryBgdHJ1ZWAg44KS5oyH5a6aLiAoZGVmYXVsdDogdHJ1ZSlcbiAgICAgKi9cbiAgICB0cmFpbGluZz86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgd2hlbiBpbnZva2VkLCB3aWxsIG9ubHkgYmUgdHJpZ2dlcmVkIGF0IG1vc3Qgb25jZSBkdXJpbmcgYSBnaXZlbiB0aW1lLlxuICogQGphIOmWouaVsOOBruWun+ihjOOCkiB3YWl0IFttc2VjXSDjgasx5Zue44Gr5Yi26ZmQXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB0aHJvdHRsZWQgPSB0aHJvdHRsZSh1cGF0ZVBvc2l0aW9uLCAxMDApO1xuICogJCh3aW5kb3cpLnNjcm9sbCh0aHJvdHRsZWQpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIHNlZWQgZnVuY3Rpb24uXG4gKiAgLSBgamFgIOWvvuixoeOBrumWouaVsFxuICogQHBhcmFtIGVsYXBzZVxuICogIC0gYGVuYCB3YWl0IGVsYXBzZSBbbXNlY10uXG4gKiAgLSBgamFgIOW+heapn+aZgumWkyBbbXNlY11cbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0aHJvdHRsZTxUIGV4dGVuZHMgQW55RnVuY3Rpb24+KGV4ZWN1dG9yOiBULCBlbGFwc2U6IG51bWJlciwgb3B0aW9ucz86IFRocm90dGxlT3B0aW9ucyk6IERlYm91bmNlZEZ1bmN0aW9uPFQ+IHtcbiAgICBjb25zdCB7IGxlYWRpbmcsIHRyYWlsaW5nIH0gPSBPYmplY3QuYXNzaWduKHsgbGVhZGluZzogdHJ1ZSwgdHJhaWxpbmc6IHRydWUgfSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIGRlYm91bmNlKGV4ZWN1dG9yLCBlbGFwc2UsIHtcbiAgICAgICAgbGVhZGluZyxcbiAgICAgICAgdHJhaWxpbmcsXG4gICAgICAgIG1heFdhaXQ6IGVsYXBzZSxcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBhdCBtb3N0IG9uZSB0aW1lLCBubyBtYXR0ZXIgaG93IG9mdGVuIHlvdSBjYWxsIGl0LlxuICogQGphIDHluqbjgZfjgYvlrp/ooYzjgZXjgozjgarjgYTplqLmlbDjgpLov5TljbQuIDLlm57nm67ku6XpmY3jga/mnIDliJ3jga7jgrPjg7zjg6vjga7jgq3jg6Pjg4Pjgrfjg6XjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvbmNlPFQgZXh0ZW5kcyBBbnlGdW5jdGlvbj4oZXhlY3V0b3I6IFQpOiBUIHtcblxuICAgIGxldCBtZW1vOiB1bmtub3duO1xuICAgIHJldHVybiBmdW5jdGlvbiAodGhpczogdW5rbm93biwgLi4uYXJnczogdW5rbm93bltdKTogdW5rbm93biB7XG4gICAgICAgIGlmIChleGVjdXRvcikge1xuICAgICAgICAgICAgbWVtbyA9IGV4ZWN1dG9yLmNhbGwodGhpcywgLi4uYXJncyk7XG4gICAgICAgICAgICBleGVjdXRvciA9IG51bGwhO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtZW1vO1xuICAgIH0gYXMgVDtcblxufVxuXG4vKipcbiAqIEBlbiBSZXR1cm4gYSBkZWZlcnJlZCBleGVjdXRhYmxlIGZ1bmN0aW9uIG9iamVjdC5cbiAqIEBqYSDpgYXlu7blrp/ooYzlj6/og73jgarplqLmlbDjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHNjaGVkdWxlID0gc2NoZWR1bGVyKCk7XG4gKiBzY2hlZHVsZSgoKSA9PiB0YXNrMSgpKTtcbiAqIHNjaGVkdWxlKCgpID0+IHRhc2syKCkpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzY2hlZHVsZXIoKTogKGV4ZWM6ICgpID0+IHZvaWQpID0+IHZvaWQge1xuICAgIGxldCB0YXNrczogKCgpID0+IHZvaWQpW10gPSBbXTtcbiAgICBsZXQgaWQ6IFByb21pc2U8dm9pZD4gfCBudWxsO1xuXG4gICAgZnVuY3Rpb24gcnVuVGFza3MoKTogdm9pZCB7XG4gICAgICAgIGlkID0gbnVsbDtcbiAgICAgICAgY29uc3Qgd29yayA9IHRhc2tzO1xuICAgICAgICB0YXNrcyA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHRhc2sgb2Ygd29yaykge1xuICAgICAgICAgICAgdGFzaygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKHRhc2s6ICgpID0+IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgdGFza3MucHVzaCh0YXNrKTtcbiAgICAgICAgaWQgPz89IHBvc3QocnVuVGFza3MpO1xuICAgIH07XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgZXNjYXBlIGZ1bmN0aW9uIGZyb20gbWFwLlxuICogQGphIOaWh+Wtl+e9ruaPm+mWouaVsOOCkuS9nOaIkFxuICpcbiAqIEBwYXJhbSBtYXBcbiAqICAtIGBlbmAga2V5OiB0YXJnZXQgY2hhciwgdmFsdWU6IHJlcGxhY2UgY2hhclxuICogIC0gYGphYCBrZXk6IOe9ruaPm+WvvuixoSwgdmFsdWU6IOe9ruaPm+aWh+Wtl1xuICogQHJldHVybnNcbiAqICAtIGBlbmAgZXNwYWNlIGZ1bmN0aW9uXG4gKiAgLSBgamFgIOOCqOOCueOCseODvOODl+mWouaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRXNjYXBlcihtYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiAoc3JjOiBQcmltaXRpdmUpID0+IHN0cmluZyB7XG4gICAgY29uc3QgZXNjYXBlciA9IChtYXRjaDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICAgICAgcmV0dXJuIG1hcFttYXRjaF07XG4gICAgfTtcblxuICAgIGNvbnN0IHNvdXJjZSA9IGAoPzoke09iamVjdC5rZXlzKG1hcCkuam9pbignfCcpfSlgO1xuICAgIGNvbnN0IHJlZ2V4VGVzdCA9IFJlZ0V4cChzb3VyY2UpO1xuICAgIGNvbnN0IHJlZ2V4UmVwbGFjZSA9IFJlZ0V4cChzb3VyY2UsICdnJyk7XG5cbiAgICByZXR1cm4gKHNyYzogUHJpbWl0aXZlKTogc3RyaW5nID0+IHtcbiAgICAgICAgc3JjID0gKG51bGwgPT0gc3JjIHx8ICdzeW1ib2wnID09PSB0eXBlb2Ygc3JjKSA/ICcnIDogU3RyaW5nKHNyYyk7XG4gICAgICAgIHJldHVybiByZWdleFRlc3QudGVzdChzcmMpID8gc3JjLnJlcGxhY2UocmVnZXhSZXBsYWNlLCBlc2NhcGVyKSA6IHNyYztcbiAgICB9O1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBtYXBIdG1sRXNjYXBlID0ge1xuICAgICc8JzogJyZsdDsnLFxuICAgICc+JzogJyZndDsnLFxuICAgICcmJzogJyZhbXA7JyxcbiAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICBcIidcIjogJyYjMzk7JyxcbiAgICAnYCc6ICcmI3g2MDsnXG59O1xuXG4vKipcbiAqIEBlbiBFc2NhcGUgSFRNTCBzdHJpbmcuXG4gKiBAamEgSFRNTCDjgafkvb/nlKjjgZnjgovmloflrZfjgpLliLblvqHmloflrZfjgavnva7mj5tcbiAqXG4gKiBAYnJpZWYgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBtYXBIdG1sRXNjYXBlID0ge1xuICogICAgICc8JyA6ICcmbHQ7JyxcbiAqICAgICAnPicgOiAnJmd0OycsXG4gKiAgICAgJyYnIDogJyZhbXA7JyxcbiAqICAgICAn4oCzJzogJyZxdW90OycsXG4gKiAgICAgYCdgIDogJyYjMzk7JyxcbiAqICAgICAnYCcgOiAnJiN4NjA7J1xuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgZXNjYXBlSFRNTCA9IGNyZWF0ZUVzY2FwZXIobWFwSHRtbEVzY2FwZSk7XG5cbi8qKlxuICogQGVuIFVuZXNjYXBlIEhUTUwgc3RyaW5nLlxuICogQGphIEhUTUwg44Gn5L2/55So44GZ44KL5Yi25b6h5paH5a2X44KS5b6p5YWDXG4gKi9cbmV4cG9ydCBjb25zdCB1bmVzY2FwZUhUTUwgPSBjcmVhdGVFc2NhcGVyKGludmVydChtYXBIdG1sRXNjYXBlKSk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIHRoZSBzdHlsZSBjb21wdWxzaW9uIHZhbHVlIGZyb20gaW5wdXQgc3RyaW5nLlxuICogQGphIOWFpeWKm+aWh+Wtl+WIl+OCkuWei+W8t+WItuOBl+OBn+WApOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhXG4gKiAgLSBgZW5gIGlucHV0IHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlr77osaHjga7mloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvVHlwZWREYXRhKGRhdGE6IHN0cmluZyB8IHVuZGVmaW5lZCk6IFR5cGVkRGF0YSB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCd0cnVlJyA9PT0gZGF0YSkge1xuICAgICAgICAvLyBib29sZWFuOiB0cnVlXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoJ2ZhbHNlJyA9PT0gZGF0YSkge1xuICAgICAgICAvLyBib29sZWFuOiBmYWxzZVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmICgnbnVsbCcgPT09IGRhdGEpIHtcbiAgICAgICAgLy8gbnVsbFxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKGRhdGEgPT09IFN0cmluZyhOdW1iZXIoZGF0YSkpKSB7XG4gICAgICAgIC8vIG51bWJlcjog5pWw5YCk5aSJ5o+bIOKGkiDmloflrZfliJflpInmj5vjgaflhYPjgavmiLvjgovjgajjgY1cbiAgICAgICAgcmV0dXJuIE51bWJlcihkYXRhKTtcbiAgICB9IGVsc2UgaWYgKGRhdGEgJiYgL14oPzpcXHtbXFx3XFxXXSpcXH18XFxbW1xcd1xcV10qXFxdKSQvLnRlc3QoZGF0YSkpIHtcbiAgICAgICAgLy8gb2JqZWN0XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKGRhdGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHN0cmluZyAvIHVuZGVmaW5lZFxuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gc3RyaW5nIGZyb20ge0BsaW5rIFR5cGVkRGF0YX0uXG4gKiBAamEge0BsaW5rIFR5cGVkRGF0YX0g44KS5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgaW5wdXQgc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WvvuixoeOBruaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbVR5cGVkRGF0YShkYXRhOiBUeXBlZERhdGEgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGlmICh1bmRlZmluZWQgPT09IGRhdGEgfHwgaXNTdHJpbmcoZGF0YSkpIHtcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSBlbHNlIGlmIChpc09iamVjdChkYXRhKSkge1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFN0cmluZyhkYXRhKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gYFdlYiBBUElgIHN0b2NrZWQgdHlwZS4gPGJyPlxuICogICAgIEVuc3VyZSBub3QgdG8gcmV0dXJuIGB1bmRlZmluZWRgIHZhbHVlLlxuICogQGphIGBXZWIgQVBJYCDmoLzntI3lvaLlvI/jgavlpInmj5sgPGJyPlxuICogICAgIGB1bmRlZmluZWRgIOOCkui/lOWNtOOBl+OBquOBhOOBk+OBqOOCkuS/neiovFxuICovXG5leHBvcnQgZnVuY3Rpb24gZHJvcFVuZGVmaW5lZDxUPih2YWx1ZTogVCB8IG51bGwgfCB1bmRlZmluZWQsIG51bGxpc2hTZXJpYWxpemUgPSBmYWxzZSk6IFQgfCAnbnVsbCcgfCAndW5kZWZpbmVkJyB8IG51bGwge1xuICAgIHJldHVybiB2YWx1ZSA/PyAobnVsbGlzaFNlcmlhbGl6ZSA/IFN0cmluZyh2YWx1ZSkgOiBudWxsKSBhcyBUIHwgJ251bGwnIHwgJ3VuZGVmaW5lZCcgfCBudWxsO1xufVxuXG4vKipcbiAqIEBlbiBEZXNlcmlhbGl6ZSBmcm9tIGBXZWIgQVBJYCBzdG9ja2VkIHR5cGUuIDxicj5cbiAqICAgICBDb252ZXJ0IGZyb20gJ251bGwnIG9yICd1bmRlZmluZWQnIHN0cmluZyB0byBvcmlnaW5hbCB0eXBlLlxuICogQGphICdudWxsJyBvciAndW5kZWZpbmVkJyDjgpLjgoLjgajjga7lnovjgavmiLvjgZlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc3RvcmVOdWxsaXNoPFQ+KHZhbHVlOiBUIHwgJ251bGwnIHwgJ3VuZGVmaW5lZCcpOiBUIHwgbnVsbCB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCdudWxsJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmICgndW5kZWZpbmVkJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqLyBsZXQgX2xvY2FsSWQgPSAwO1xuXG4vKipcbiAqIEBlbiBHZXQgbG9jYWwgdW5pcXVlIGlkLiA8YnI+XG4gKiAgICAgXCJsb2NhbCB1bmlxdWVcIiBtZWFucyBndWFyYW50ZWVzIHVuaXF1ZSBkdXJpbmcgaW4gc2NyaXB0IGxpZmUgY3ljbGUgb25seS5cbiAqIEBqYSDjg63jg7zjgqvjg6vjg6bjg4vjg7zjgq8gSUQg44Gu5Y+W5b6XIDxicj5cbiAqICAgICDjgrnjgq/jg6rjg5fjg4jjg6njgqTjg5XjgrXjgqTjgq/jg6vkuK3jga7lkIzkuIDmgKfjgpLkv53oqLzjgZnjgosuXG4gKlxuICogQHBhcmFtIHByZWZpeFxuICogIC0gYGVuYCBJRCBwcmVmaXhcbiAqICAtIGBqYWAgSUQg44Gr5LuY5LiO44GZ44KLIFByZWZpeFxuICogQHBhcmFtIHplcm9QYWRcbiAqICAtIGBlbmAgMCBwYWRkaW5nIG9yZGVyXG4gKiAgLSBgamFgIDAg6Kmw44KB44GZ44KL5qGB5pWw44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsdWlkKHByZWZpeCA9ICcnLCB6ZXJvUGFkPzogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBjb25zdCBpZCA9ICgrK19sb2NhbElkKS50b1N0cmluZygxNik7XG4gICAgcmV0dXJuIChudWxsICE9IHplcm9QYWQpID8gYCR7cHJlZml4fSR7aWQucGFkU3RhcnQoemVyb1BhZCwgJzAnKX1gIDogYCR7cHJlZml4fSR7aWR9YDtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gYDBgIGFuZCBgbWF4YCwgaW5jbHVzaXZlLlxuICogQGphIGAwYCAtIGBtYXhgIOOBruODqeODs+ODgOODoOOBruaVtOaVsOWApOOCkueUn+aIkFxuICpcbiAqIEBwYXJhbSBtYXhcbiAqICAtIGBlbmAgVGhlIG1heGltdW0gcmFuZG9tIG51bWJlci5cbiAqICAtIGBqYWAg5pW05pWw44Gu5pyA5aSn5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kb21JbnQobWF4OiBudW1iZXIpOiBudW1iZXI7XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIGBtaW5gIGFuZCBgbWF4YCwgaW5jbHVzaXZlLlxuICogQGphIGBtaW5gIC0gYG1heGAg44Gu44Op44Oz44OA44Og44Gu5pW05pWw5YCk44KS55Sf5oiQXG4gKlxuICogQHBhcmFtIG1pblxuICogIC0gYGVuYCBUaGUgbWF4aW11bSByYW5kb20gbnVtYmVyLlxuICogIC0gYGphYCDmlbTmlbDjga7mnIDlpKflgKRcbiAqIEBwYXJhbSBtYXhcbiAqICAtIGBlbmAgVGhlIG1heGltdW0gcmFuZG9tIG51bWJlci5cbiAqICAtIGBqYWAg5pW05pWw44Gu5pyA5aSn5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kb21JbnQobWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmlmaWVkLXNpZ25hdHVyZXNcblxuZXhwb3J0IGZ1bmN0aW9uIHJhbmRvbUludChtaW46IG51bWJlciwgbWF4PzogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBpZiAobnVsbCA9PSBtYXgpIHtcbiAgICAgICAgbWF4ID0gbWluO1xuICAgICAgICBtaW4gPSAwO1xuICAgIH1cbiAgICByZXR1cm4gbWluICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3JlZ2V4Q2FuY2VsTGlrZVN0cmluZyA9IC8oYWJvcnR8Y2FuY2VsKS9pbTtcblxuLyoqXG4gKiBAZW4gUHJlc3VtZSB3aGV0aGVyIGl0J3MgYSBjYW5jZWxlZCBlcnJvci5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjgZXjgozjgZ/jgqjjg6njg7zjgafjgYLjgovjgYvmjqjlrppcbiAqXG4gKiBAcGFyYW0gZXJyb3JcbiAqICAtIGBlbmAgYW4gZXJyb3Igb2JqZWN0IGhhbmRsZWQgaW4gYGNhdGNoYCBibG9jay5cbiAqICAtIGBqYWAgYGNhdGNoYCDnr4Djgarjganjgafoo5zotrPjgZfjgZ/jgqjjg6njg7zjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQ2FuY2VsTGlrZUVycm9yKGVycm9yOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgaWYgKG51bGwgPT0gZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoZXJyb3IpKSB7XG4gICAgICAgIHJldHVybiBfcmVnZXhDYW5jZWxMaWtlU3RyaW5nLnRlc3QoZXJyb3IpO1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoZXJyb3IpKSB7XG4gICAgICAgIHJldHVybiBfcmVnZXhDYW5jZWxMaWtlU3RyaW5nLnRlc3QoKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgZmlyc3QgbGV0dGVyIG9mIHRoZSBzdHJpbmcgdG8gdXBwZXJjYXNlLlxuICogQGphIOacgOWIneOBruaWh+Wtl+OCkuWkp+aWh+Wtl+OBq+WkieaPm1xuICpcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNhcGl0YWxpemUoXCJmb28gQmFyXCIpO1xuICogLy8gPT4gXCJGb28gQmFyXCJcbiAqXG4gKiBjYXBpdGFsaXplKFwiRk9PIEJhclwiLCB0cnVlKTtcbiAqIC8vID0+IFwiRm9vIGJhclwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKiBAcGFyYW0gbG93ZXJjYXNlUmVzdFxuICogIC0gYGVuYCBJZiBgdHJ1ZWAgaXMgcGFzc2VkLCB0aGUgcmVzdCBvZiB0aGUgc3RyaW5nIHdpbGwgYmUgY29udmVydGVkIHRvIGxvd2VyIGNhc2VcbiAqICAtIGBqYWAgYHRydWVgIOOCkuaMh+WumuOBl+OBn+WgtOWQiCwgMuaWh+Wtl+ebruS7pemZjeOCguWwj+aWh+Wtl+WMllxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FwaXRhbGl6ZShzcmM6IHN0cmluZywgbG93ZXJjYXNlUmVzdCA9IGZhbHNlKTogc3RyaW5nIHtcbiAgICBjb25zdCByZW1haW5pbmdDaGFycyA9ICFsb3dlcmNhc2VSZXN0ID8gc3JjLnNsaWNlKDEpIDogc3JjLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIHNyYy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHJlbWFpbmluZ0NoYXJzO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBmaXJzdCBsZXR0ZXIgb2YgdGhlIHN0cmluZyB0byBsb3dlcmNhc2UuXG4gKiBAamEg5pyA5Yid44Gu5paH5a2X44KS5bCP5paH5a2X5YyWXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBkZWNhcGl0YWxpemUoXCJGb28gQmFyXCIpO1xuICogLy8gPT4gXCJmb28gQmFyXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlY2FwaXRhbGl6ZShzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHNyYy5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIHNyYy5zbGljZSgxKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgdW5kZXJzY29yZWQgb3IgZGFzaGVyaXplZCBzdHJpbmcgdG8gYSBjYW1lbGl6ZWQgb25lLiA8YnI+XG4gKiAgICAgQmVnaW5zIHdpdGggYSBsb3dlciBjYXNlIGxldHRlciB1bmxlc3MgaXQgc3RhcnRzIHdpdGggYW4gdW5kZXJzY29yZSwgZGFzaCBvciBhbiB1cHBlciBjYXNlIGxldHRlci5cbiAqIEBqYSBgX2AsIGAtYCDljLrliIfjgormloflrZfliJfjgpLjgq3jg6Pjg6Hjg6vjgrHjg7zjgrnljJYgPGJyPlxuICogICAgIGAtYCDjgb7jgZ/jga/lpKfmloflrZfjgrnjgr/jg7zjg4jjgafjgYLjgozjgbAsIOWkp+aWh+Wtl+OCueOCv+ODvOODiOOBjOaXouWumuWApFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2FtZWxpemUoXCJtb3otdHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJtb3pUcmFuc2Zvcm1cIlxuICpcbiAqIGNhbWVsaXplKFwiLW1vei10cmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIk1velRyYW5zZm9ybVwiXG4gKlxuICogY2FtZWxpemUoXCJfbW96X3RyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwiTW96VHJhbnNmb3JtXCJcbiAqXG4gKiBjYW1lbGl6ZShcIk1vei10cmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIk1velRyYW5zZm9ybVwiXG4gKlxuICogY2FtZWxpemUoXCItbW96LXRyYW5zZm9ybVwiLCB0cnVlKTtcbiAqIC8vID0+IFwibW96VHJhbnNmb3JtXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqIEBwYXJhbSBsb3dlclxuICogIC0gYGVuYCBJZiBgdHJ1ZWAgaXMgcGFzc2VkLCBmb3JjZSBjb252ZXJ0cyB0byBsb3dlciBjYW1lbCBjYXNlIGluIHN0YXJ0cyB3aXRoIHRoZSBzcGVjaWFsIGNhc2UuXG4gKiAgLSBgamFgIOW8t+WItueahOOBq+Wwj+aWh+Wtl+OCueOCv+ODvOODiOOBmeOCi+WgtOWQiOOBq+OBryBgdHJ1ZWAg44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYW1lbGl6ZShzcmM6IHN0cmluZywgbG93ZXIgPSBmYWxzZSk6IHN0cmluZyB7XG4gICAgc3JjID0gc3JjLnRyaW0oKS5yZXBsYWNlKC9bLV9cXHNdKyguKT8vZywgKG1hdGNoLCBjKSA9PiB7XG4gICAgICAgIHJldHVybiBjID8gYy50b1VwcGVyQ2FzZSgpIDogJyc7XG4gICAgfSk7XG5cbiAgICBpZiAodHJ1ZSA9PT0gbG93ZXIpIHtcbiAgICAgICAgcmV0dXJuIGRlY2FwaXRhbGl6ZShzcmMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzcmM7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBzdHJpbmcgdG8gY2FtZWxpemVkIGNsYXNzIG5hbWUuIEZpcnN0IGxldHRlciBpcyBhbHdheXMgdXBwZXIgY2FzZS5cbiAqIEBqYSDlhYjpoK3lpKfmloflrZfjga7jgq3jg6Pjg6Hjg6vjgrHjg7zjgrnjgavlpInmj5tcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNsYXNzaWZ5KFwic29tZV9jbGFzc19uYW1lXCIpO1xuICogLy8gPT4gXCJTb21lQ2xhc3NOYW1lXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzaWZ5KHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gY2FwaXRhbGl6ZShjYW1lbGl6ZShzcmMucmVwbGFjZSgvW1xcV19dL2csICcgJykpLnJlcGxhY2UoL1xccy9nLCAnJykpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBhIGNhbWVsaXplZCBvciBkYXNoZXJpemVkIHN0cmluZyBpbnRvIGFuIHVuZGVyc2NvcmVkIG9uZS5cbiAqIEBqYSDjgq3jg6Pjg6Hjg6vjgrHjg7zjgrkgb3IgYC1gIOOBpOOBquOBjuaWh+Wtl+WIl+OCkiBgX2Ag44Gk44Gq44GO44Gr5aSJ5o+bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiB1bmRlcnNjb3JlZChcIk1velRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwibW96X3RyYW5zZm9ybVwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmRlcnNjb3JlZChzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHNyYy50cmltKCkucmVwbGFjZSgvKFthLXpcXGRdKShbQS1aXSspL2csICckMV8kMicpLnJlcGxhY2UoL1stXFxzXSsvZywgJ18nKS50b0xvd2VyQ2FzZSgpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBhIHVuZGVyc2NvcmVkIG9yIGNhbWVsaXplZCBzdHJpbmcgaW50byBhbiBkYXNoZXJpemVkIG9uZS5cbiAqIEBqYSDjgq3jg6Pjg6Hjg6vjgrHjg7zjgrkgb3IgYF9gIOOBpOOBquOBjuaWh+Wtl+WIl+OCkiBgLWAg44Gk44Gq44GO44Gr5aSJ5o+bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBkYXNoZXJpemUoXCJNb3pUcmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIi1tb3otdHJhbnNmb3JtXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhc2hlcml6ZShzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHNyYy50cmltKCkucmVwbGFjZSgvKFtBLVpdKS9nLCAnLSQxJykucmVwbGFjZSgvW19cXHNdKy9nLCAnLScpLnRvTG93ZXJDYXNlKCk7XG59XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25PYmplY3QsIEFjY2Vzc2libGUgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGFzc2lnblZhbHVlIH0gZnJvbSAnLi9kZWVwLWNpcmN1aXQnO1xuaW1wb3J0IHsgcmFuZG9tSW50IH0gZnJvbSAnLi9taXNjJztcblxuLyoqXG4gKiBAZW4gRXhlY3V0ZSBzaHVmZmxlIG9mIGFuIGFycmF5IGVsZW1lbnRzLlxuICogQGphIOmFjeWIl+imgee0oOOBruOCt+ODo+ODg+ODleODq1xuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gZGVzdHJ1Y3RpdmVcbiAqICAtIGBlbmAgdHJ1ZTogZGVzdHJ1Y3RpdmUgLyBmYWxzZTogbm9uLWRlc3RydWN0aXZlIChkZWZhdWx0KVxuICogIC0gYGphYCB0cnVlOiDnoLTlo4rnmoQgLyBmYWxzZTog6Z2e56C05aOK55qEICjml6LlrpopXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaHVmZmxlPFQ+KGFycmF5OiBUW10sIGRlc3RydWN0aXZlID0gZmFsc2UpOiBUW10ge1xuICAgIGNvbnN0IHNvdXJjZSA9IGRlc3RydWN0aXZlID8gYXJyYXkgOiBhcnJheS5zbGljZSgpO1xuICAgIGNvbnN0IGxlbiA9IHNvdXJjZS5sZW5ndGg7XG4gICAgZm9yIChsZXQgaSA9IGxlbiA+IDAgPyBsZW4gPj4+IDAgOiAwOyBpID4gMTspIHtcbiAgICAgICAgY29uc3QgaiA9IGkgKiBNYXRoLnJhbmRvbSgpID4+PiAwO1xuICAgICAgICBjb25zdCBzd2FwID0gc291cmNlWy0taV07XG4gICAgICAgIHNvdXJjZVtpXSA9IHNvdXJjZVtqXTtcbiAgICAgICAgc291cmNlW2pdID0gc3dhcDtcbiAgICB9XG4gICAgcmV0dXJuIHNvdXJjZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEV4ZWN1dGUgc3RhYmxlIHNvcnQgYnkgbWVyZ2Utc29ydCBhbGdvcml0aG0uXG4gKiBAamEgYG1lcmdlLXNvcnRgIOOBq+OCiOOCi+WuieWumuOCveODvOODiFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY29tcGFyYXRvclxuICogIC0gYGVuYCBzb3J0IGNvbXBhcmF0b3IgZnVuY3Rpb25cbiAqICAtIGBqYWAg44K944O844OI6Zai5pWw44KS5oyH5a6aXG4gKiBAcGFyYW0gZGVzdHJ1Y3RpdmVcbiAqICAtIGBlbmAgdHJ1ZTogZGVzdHJ1Y3RpdmUgLyBmYWxzZTogbm9uLWRlc3RydWN0aXZlIChkZWZhdWx0KVxuICogIC0gYGphYCB0cnVlOiDnoLTlo4rnmoQgLyBmYWxzZTog6Z2e56C05aOK55qEICjml6LlrpopXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzb3J0PFQ+KGFycmF5OiBUW10sIGNvbXBhcmF0b3I6IChsaHM6IFQsIHJoczogVCkgPT4gbnVtYmVyLCBkZXN0cnVjdGl2ZSA9IGZhbHNlKTogVFtdIHtcbiAgICBjb25zdCBzb3VyY2UgPSBkZXN0cnVjdGl2ZSA/IGFycmF5IDogYXJyYXkuc2xpY2UoKTtcbiAgICBpZiAoc291cmNlLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICB9XG4gICAgY29uc3QgbGhzID0gc29ydChzb3VyY2Uuc3BsaWNlKDAsIHNvdXJjZS5sZW5ndGggPj4+IDEpLCBjb21wYXJhdG9yLCB0cnVlKTtcbiAgICBjb25zdCByaHMgPSBzb3J0KHNvdXJjZS5zcGxpY2UoMCksIGNvbXBhcmF0b3IsIHRydWUpO1xuICAgIHdoaWxlIChsaHMubGVuZ3RoICYmIHJocy5sZW5ndGgpIHtcbiAgICAgICAgc291cmNlLnB1c2goY29tcGFyYXRvcihsaHNbMF0sIHJoc1swXSkgPD0gMCA/IGxocy5zaGlmdCgpIGFzIFQgOiByaHMuc2hpZnQoKSBhcyBUKTtcbiAgICB9XG4gICAgcmV0dXJuIHNvdXJjZS5jb25jYXQobGhzLCByaHMpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWFrZSB1bmlxdWUgYXJyYXkuXG4gKiBAamEg6YeN6KSH6KaB57Sg44Gu44Gq44GE6YWN5YiX44Gu5L2c5oiQXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuaXF1ZTxUPihhcnJheTogVFtdKTogVFtdIHtcbiAgICByZXR1cm4gWy4uLm5ldyBTZXQoYXJyYXkpXTtcbn1cblxuLyoqXG4gKiBAZW4gTWFrZSB1bmlvbiBhcnJheS5cbiAqIEBqYSDphY3liJfjga7lkozpm4blkIjjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gYXJyYXlzXG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheXNcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiX576kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmlvbjxUPiguLi5hcnJheXM6IFRbXVtdKTogVFtdIHtcbiAgICByZXR1cm4gdW5pcXVlKGFycmF5cy5mbGF0KCkpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSBtb2RlbCBhdCB0aGUgZ2l2ZW4gaW5kZXguIElmIG5lZ2F0aXZlIHZhbHVlIGlzIGdpdmVuLCB0aGUgdGFyZ2V0IHdpbGwgYmUgZm91bmQgZnJvbSB0aGUgbGFzdCBpbmRleC5cbiAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgavjgojjgovjg6Ljg4fjg6vjgbjjga7jgqLjgq/jgrvjgrkuIOiyoOWApOOBruWgtOWQiOOBr+acq+WwvuaknOe0ouOCkuWun+ihjFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBlbmAgQSB6ZXJvLWJhc2VkIGludGVnZXIgaW5kaWNhdGluZyB3aGljaCBlbGVtZW50IHRvIHJldHJpZXZlLiA8YnI+IElmIG5lZ2F0aXZlIGluZGV4IGlzIGNvdW50ZWQgZnJvbSB0aGUgZW5kIG9mIHRoZSBtYXRjaGVkIHNldC5cbiAqICAtIGBqYWAgMCBiYXNlIOOBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumiA8YnI+IOiyoOWApOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiCwg5pyr5bC+44GL44KJ44Gu44Kk44Oz44OH44OD44Kv44K544Go44GX44Gm6Kej6YeI44GV44KM44KLXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhdDxUPihhcnJheTogVFtdLCBpbmRleDogbnVtYmVyKTogVCB8IG5ldmVyIHtcbiAgICBjb25zdCBpZHggPSBNYXRoLnRydW5jKGluZGV4KTtcbiAgICBjb25zdCBlbCA9IGlkeCA8IDAgPyBhcnJheVtpZHggKyBhcnJheS5sZW5ndGhdIDogYXJyYXlbaWR4XTtcbiAgICBpZiAobnVsbCA9PSBlbCkge1xuICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgaW52YWxpZCBhcnJheSBpbmRleC4gW2xlbmd0aDogJHthcnJheS5sZW5ndGh9LCBnaXZlbjogJHtpbmRleH1dYCk7XG4gICAgfVxuICAgIHJldHVybiBlbDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1ha2UgaW5kZXggYXJyYXkuXG4gKiBAamEg44Kk44Oz44OH44OD44Kv44K56YWN5YiX44Gu5L2c5oiQXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBleGNsdWRlc1xuICogIC0gYGVuYCBleGNsdWRlIGluZGV4IGluIHJldHVybiB2YWx1ZS5cbiAqICAtIGBqYWAg5oi744KK5YCk6YWN5YiX44Gr5ZCr44KB44Gq44GE44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbmRpY2VzPFQ+KGFycmF5OiBUW10sIC4uLmV4Y2x1ZGVzOiBudW1iZXJbXSk6IG51bWJlcltdIHtcbiAgICBjb25zdCByZXR2YWwgPSBbLi4uYXJyYXkua2V5cygpXTtcblxuICAgIGNvbnN0IGxlbiA9IGFycmF5Lmxlbmd0aDtcbiAgICBjb25zdCBleExpc3QgPSBbLi4ubmV3IFNldChleGNsdWRlcyldLnNvcnQoKGxocywgcmhzKSA9PiBsaHMgPCByaHMgPyAxIDogLTEpO1xuICAgIGZvciAoY29uc3QgZXggb2YgZXhMaXN0KSB7XG4gICAgICAgIGlmICgwIDw9IGV4ICYmIGV4IDwgbGVuKSB7XG4gICAgICAgICAgICByZXR2YWwuc3BsaWNlKGV4LCAxKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgZ3JvdXBCeX0oKSBvcHRpb25zIGRlZmluaXRpb24uXG4gKiBAamEge0BsaW5rIGdyb3VwQnl9KCkg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44Oz5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3JvdXBCeU9wdGlvbnM8XG4gICAgVCBleHRlbmRzIG9iamVjdCxcbiAgICBUS0VZUyBleHRlbmRzIGtleW9mIFQsXG4gICAgVFNVTUtFWVMgZXh0ZW5kcyBrZXlvZiBULFxuICAgIFRHUk9VUEtFWSBleHRlbmRzIHN0cmluZ1xuPiB7XG4gICAgLyoqXG4gICAgICogQGVuIGBHUk9VUCBCWWAga2V5cy5cbiAgICAgKiBAamEgYEdST1VQIEJZYCDjgavmjIflrprjgZnjgovjgq3jg7xcbiAgICAgKi9cbiAgICBrZXlzOiBFeHRyYWN0PFRLRVlTLCBzdHJpbmc+W107XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWdncmVnYXRhYmxlIGtleXMuXG4gICAgICogQGphIOmbhuioiOWPr+iDveOBquOCreODvOS4gOimp1xuICAgICAqL1xuICAgIHN1bUtleXM/OiBFeHRyYWN0PFRTVU1LRVlTLCBzdHJpbmc+W107XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR3JvdXBlZCBpdGVtIGFjY2VzcyBrZXkuIGRlZmF1bHQ6ICdpdGVtcycsXG4gICAgICogQGphIOOCsOODq+ODvOODlOODs+OCsOOBleOCjOOBn+imgee0oOOBuOOBruOCouOCr+OCu+OCueOCreODvC4g5pei5a6aOiAnaXRlbXMnXG4gICAgICovXG4gICAgZ3JvdXBLZXk/OiBUR1JPVVBLRVk7XG59XG5cbi8qKlxuICogQGVuIFJldHVybiB0eXBlIG9mIHtAbGluayBncm91cEJ5fSgpLlxuICogQGphIHtAbGluayBncm91cEJ5fSgpIOOBjOi/lOWNtOOBmeOCi+Wei1xuICovXG5leHBvcnQgdHlwZSBHcm91cEJ5UmV0dXJuVmFsdWU8XG4gICAgVCBleHRlbmRzIG9iamVjdCxcbiAgICBUS0VZUyBleHRlbmRzIGtleW9mIFQsXG4gICAgVFNVTUtFWVMgZXh0ZW5kcyBrZXlvZiBUID0gbmV2ZXIsXG4gICAgVEdST1VQS0VZIGV4dGVuZHMgc3RyaW5nID0gJ2l0ZW1zJ1xuPiA9IFJlYWRvbmx5PFJlY29yZDxUS0VZUywgdW5rbm93bj4gJiBSZWNvcmQ8VFNVTUtFWVMsIHVua25vd24+ICYgUmVjb3JkPFRHUk9VUEtFWSwgVFtdPj47XG5cbi8qKlxuICogQGVuIEV4ZWN1dGUgYEdST1VQIEJZYCBmb3IgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6YWN5YiX44Gu6KaB57Sg44GuIGBHUk9VUCBCWWAg6ZuG5ZCI44KS5oq95Ye6XG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGBHUk9VUCBCWWAgb3B0aW9uc1xuICogIC0gYGphYCBgR1JPVVAgQllgIOOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ3JvdXBCeTxcbiAgICBUIGV4dGVuZHMgb2JqZWN0LFxuICAgIFRLRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUU1VNS0VZUyBleHRlbmRzIGtleW9mIFQgPSBuZXZlcixcbiAgICBUR1JPVVBLRVkgZXh0ZW5kcyBzdHJpbmcgPSAnaXRlbXMnXG4+KGFycmF5OiBUW10sIG9wdGlvbnM6IEdyb3VwQnlPcHRpb25zPFQsIFRLRVlTLCBUU1VNS0VZUywgVEdST1VQS0VZPik6IEdyb3VwQnlSZXR1cm5WYWx1ZTxULCBUS0VZUywgVFNVTUtFWVMsIFRHUk9VUEtFWT5bXSB7XG4gICAgY29uc3QgeyBrZXlzLCBzdW1LZXlzLCBncm91cEtleSB9ID0gb3B0aW9ucztcbiAgICBjb25zdCBfZ3JvdXBLZXkgPSBncm91cEtleSA/PyAnaXRlbXMnO1xuICAgIGNvbnN0IF9zdW1LZXlzOiBzdHJpbmdbXSA9IHN1bUtleXMgPz8gW107XG4gICAgX3N1bUtleXMucHVzaChfZ3JvdXBLZXkpO1xuXG4gICAgY29uc3QgaGFzaCA9IGFycmF5LnJlZHVjZSgocmVzOiBBY2Nlc3NpYmxlPFQ+LCBkYXRhKSA9PiB7XG4gICAgICAgIGNvbnN0IF9kYXRhID0gZGF0YSBhcyBBY2Nlc3NpYmxlPFQ+O1xuXG4gICAgICAgIC8vIGNyZWF0ZSBncm91cEJ5IGludGVybmFsIGtleVxuICAgICAgICBjb25zdCBfa2V5ID0ga2V5cy5yZWR1Y2UoKHMsIGspID0+IHMgKyBTdHJpbmcoX2RhdGFba10pLCAnJyk7XG5cbiAgICAgICAgLy8gaW5pdCBrZXlzXG4gICAgICAgIGlmICghKF9rZXkgaW4gcmVzKSkge1xuICAgICAgICAgICAgY29uc3Qga2V5TGlzdCA9IGtleXMucmVkdWNlKChoOiBVbmtub3duT2JqZWN0LCBrOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICBhc3NpZ25WYWx1ZShoLCBrLCBfZGF0YVtrXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGg7XG4gICAgICAgICAgICB9LCB7fSk7XG5cbiAgICAgICAgICAgIChyZXNbX2tleV0gYXMgVW5rbm93bk9iamVjdCkgPSBfc3VtS2V5cy5yZWR1Y2UoKGgsIGs6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIGhba10gPSAwO1xuICAgICAgICAgICAgICAgIHJldHVybiBoO1xuICAgICAgICAgICAgfSwga2V5TGlzdCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByZXNLZXkgPSByZXNbX2tleV0gYXMgYW55OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuICAgICAgICAvLyBzdW0gcHJvcGVydGllc1xuICAgICAgICBmb3IgKGNvbnN0IGsgb2YgX3N1bUtleXMpIHtcbiAgICAgICAgICAgIGlmIChfZ3JvdXBLZXkgPT09IGspIHtcbiAgICAgICAgICAgICAgICByZXNLZXlba10gPSByZXNLZXlba10gfHwgW107IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci1udWxsaXNoLWNvYWxlc2NpbmdcbiAgICAgICAgICAgICAgICByZXNLZXlba10ucHVzaChkYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzS2V5W2tdICs9IF9kYXRhW2tdIGFzIG51bWJlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfSwge30gYXMgQWNjZXNzaWJsZTxUPik7XG5cbiAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyhoYXNoKSBhcyBHcm91cEJ5UmV0dXJuVmFsdWU8VCwgVEtFWVMsIFRTVU1LRVlTLCBUR1JPVVBLRVk+W107XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb21wdXRlcyB0aGUgbGlzdCBvZiB2YWx1ZXMgdGhhdCBhcmUgdGhlIGludGVyc2VjdGlvbiBvZiBhbGwgdGhlIGFycmF5cy4gRWFjaCB2YWx1ZSBpbiB0aGUgcmVzdWx0IGlzIHByZXNlbnQgaW4gZWFjaCBvZiB0aGUgYXJyYXlzLlxuICogQGphIOmFjeWIl+OBruepjembhuWQiOOCkui/lOWNtC4g6L+U5Y2044GV44KM44Gf6YWN5YiX44Gu6KaB57Sg44Gv44GZ44G544Gm44Gu5YWl5Yqb44GV44KM44Gf6YWN5YiX44Gr5ZCr44G+44KM44KLXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zb2xlLmxvZyhpbnRlcnNlY3Rpb24oWzEsIDIsIDNdLCBbMTAxLCAyLCAxLCAxMF0sIFsyLCAxXSkpO1xuICogLy8gPT4gWzEsIDJdXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlzXG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGludGVyc2VjdGlvbjxUPiguLi5hcnJheXM6IFRbXVtdKTogVFtdIHtcbiAgICByZXR1cm4gYXJyYXlzLnJlZHVjZSgoYWNjLCBhcnkpID0+IGFjYy5maWx0ZXIoZWwgPT4gYXJ5LmluY2x1ZGVzKGVsKSkpO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIHRoZSB2YWx1ZXMgZnJvbSBhcnJheSB0aGF0IGFyZSBub3QgcHJlc2VudCBpbiB0aGUgb3RoZXIgYXJyYXlzLlxuICogQGphIOmFjeWIl+OBi+OCieOBu+OBi+OBrumFjeWIl+OBq+WQq+OBvuOCjOOBquOBhOOCguOBruOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc29sZS5sb2coZGlmZmVyZW5jZShbMSwgMiwgMywgNCwgNV0sIFs1LCAyLCAxMF0pKTtcbiAqIC8vID0+IFsxLCAzLCA0XVxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBvdGhlcnNcbiAqICAtIGBlbmAgZXhjbHVkZSBlbGVtZW50IGluIHJldHVybiB2YWx1ZS5cbiAqICAtIGBqYWAg5oi744KK5YCk6YWN5YiX44Gr5ZCr44KB44Gq44GE6KaB57Sg44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaWZmZXJlbmNlPFQ+KGFycmF5OiBUW10sIC4uLm90aGVyczogVFtdW10pOiBUW10ge1xuICAgIGNvbnN0IGFycmF5cyA9IFthcnJheSwgLi4ub3RoZXJzXSBhcyBUW11bXTtcbiAgICByZXR1cm4gYXJyYXlzLnJlZHVjZSgoYWNjLCBhcnkpID0+IGFjYy5maWx0ZXIoZWwgPT4gIWFyeS5pbmNsdWRlcyhlbCkpKTtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIGNvcHkgb2YgdGhlIGFycmF5IHdpdGggYWxsIGluc3RhbmNlcyBvZiB0aGUgdmFsdWVzIHJlbW92ZWQuXG4gKiBAamEg6YWN5YiX44GL44KJ5oyH5a6a6KaB57Sg44KS5Y+W44KK6Zmk44GE44Gf44KC44Gu44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zb2xlLmxvZyh3aXRob3V0KFsxLCAyLCAxLCAwLCAzLCAxLCA0XSwgMCwgMSkpO1xuICogLy8gPT4gWzIsIDMsIDRdXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIHZhbHVlc1xuICogIC0gYGVuYCBleGNsdWRlIGVsZW1lbnQgaW4gcmV0dXJuIHZhbHVlLlxuICogIC0gYGphYCDmiLvjgorlgKTphY3liJfjgavlkKvjgoHjgarjgYTopoHntKDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhvdXQ8VD4oYXJyYXk6IFRbXSwgLi4udmFsdWVzOiBUW10pOiBUW10ge1xuICAgIHJldHVybiBkaWZmZXJlbmNlKGFycmF5LCB2YWx1ZXMpO1xufVxuXG4vKipcbiAqIEBlbiBQcm9kdWNlIGEgcmFuZG9tIHNhbXBsZSBmcm9tIHRoZSBsaXN0LlxuICogQGphIOODqeODs+ODgOODoOOBq+OCteODs+ODl+ODq+WApOOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc29sZS5sb2coc2FtcGxlKFsxLCAyLCAzLCA0LCA1LCA2XSwgMykpO1xuICogLy8gPT4gWzEsIDYsIDJdXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNvdW50XG4gKiAgLSBgZW5gIG51bWJlciBvZiBzYW1wbGluZyBjb3VudC5cbiAqICAtIGBqYWAg6L+U5Y2044GZ44KL44K144Oz44OX44Or5pWw44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1wbGU8VD4oYXJyYXk6IFRbXSwgY291bnQ6IG51bWJlcik6IFRbXTtcblxuLyoqXG4gKiBAZW4gUHJvZHVjZSBhIHJhbmRvbSBzYW1wbGUgZnJvbSB0aGUgbGlzdC5cbiAqIEBqYSDjg6njg7Pjg4Djg6DjgavjgrXjg7Pjg5fjg6vlgKTjgpLov5TljbRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnNvbGUubG9nKHNhbXBsZShbMSwgMiwgMywgNCwgNSwgNl0pKTtcbiAqIC8vID0+IDRcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1wbGU8VD4oYXJyYXk6IFRbXSk6IFQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBzYW1wbGU8VD4oYXJyYXk6IFRbXSwgY291bnQ/OiBudW1iZXIpOiBUIHwgVFtdIHtcbiAgICBpZiAobnVsbCA9PSBjb3VudCkge1xuICAgICAgICByZXR1cm4gYXJyYXlbcmFuZG9tSW50KGFycmF5Lmxlbmd0aCAtIDEpXTtcbiAgICB9XG4gICAgY29uc3Qgc2FtcGxlID0gYXJyYXkuc2xpY2UoKTtcbiAgICBjb25zdCBsZW5ndGggPSBzYW1wbGUubGVuZ3RoO1xuICAgIGNvdW50ID0gTWF0aC5tYXgoTWF0aC5taW4oY291bnQsIGxlbmd0aCksIDApO1xuICAgIGNvbnN0IGxhc3QgPSBsZW5ndGggLSAxO1xuICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBjb3VudDsgaW5kZXgrKykge1xuICAgICAgICBjb25zdCByYW5kID0gcmFuZG9tSW50KGluZGV4LCBsYXN0KTtcbiAgICAgICAgY29uc3QgdGVtcCA9IHNhbXBsZVtpbmRleF07XG4gICAgICAgIHNhbXBsZVtpbmRleF0gPSBzYW1wbGVbcmFuZF07XG4gICAgICAgIHNhbXBsZVtyYW5kXSA9IHRlbXA7XG4gICAgfVxuICAgIHJldHVybiBzYW1wbGUuc2xpY2UoMCwgY291bnQpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIHJlc3VsdCBvZiBwZXJtdXRhdGlvbiBmcm9tIHRoZSBsaXN0LlxuICogQGphIOmFjeWIl+OBi+OCiemghuWIl+e1kOaenOOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgYXJyID0gcGVybXV0YXRpb24oWydhJywgJ2InLCAnYyddLCAyKTtcbiAqIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFycikpO1xuICogLy8gPT4gW1snYScsJ2InXSxbJ2EnLCdjJ10sWydiJywnYSddLFsnYicsJ2MnXSxbJ2MnLCdhJ10sWydjJywnYiddXVxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjb3VudFxuICogIC0gYGVuYCBudW1iZXIgb2YgcGljayB1cC5cbiAqICAtIGBqYWAg6YG45oqe5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJtdXRhdGlvbjxUPihhcnJheTogVFtdLCBjb3VudDogbnVtYmVyKTogVFtdW10ge1xuICAgIGNvbnN0IHJldHZhbDogVFtdW10gPSBbXTtcbiAgICBpZiAoYXJyYXkubGVuZ3RoIDwgY291bnQpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBpZiAoMSA9PT0gY291bnQpIHtcbiAgICAgICAgZm9yIChjb25zdCBbaSwgdmFsXSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIHJldHZhbFtpXSA9IFt2YWxdO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIG4xID0gYXJyYXkubGVuZ3RoOyBpIDwgbjE7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgcGFydHMgPSBhcnJheS5zbGljZSgwKTtcbiAgICAgICAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IHBlcm11dGF0aW9uKHBhcnRzLCBjb3VudCAtIDEpO1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDAsIG4yID0gcm93Lmxlbmd0aDsgaiA8IG4yOyBqKyspIHtcbiAgICAgICAgICAgICAgICByZXR2YWwucHVzaChbYXJyYXlbaV1dLmNvbmNhdChyb3dbal0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgcmVzdWx0IG9mIGNvbWJpbmF0aW9uIGZyb20gdGhlIGxpc3QuXG4gKiBAamEg6YWN5YiX44GL44KJ57WE44G/5ZCI44KP44Gb57WQ5p6c44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBhcnIgPSBjb21iaW5hdGlvbihbJ2EnLCAnYicsICdjJ10sIDIpO1xuICogY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYXJyKSk7XG4gKiAvLyA9PiBbWydhJywnYiddLFsnYScsJ2MnXSxbJ2InLCdjJ11dXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNvdW50XG4gKiAgLSBgZW5gIG51bWJlciBvZiBwaWNrIHVwLlxuICogIC0gYGphYCDpgbjmip7mlbBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmF0aW9uPFQ+KGFycmF5OiBUW10sIGNvdW50OiBudW1iZXIpOiBUW11bXSB7XG4gICAgY29uc3QgcmV0dmFsOiBUW11bXSA9IFtdO1xuICAgIGlmIChhcnJheS5sZW5ndGggPCBjb3VudCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGlmICgxID09PSBjb3VudCkge1xuICAgICAgICBmb3IgKGNvbnN0IFtpLCB2YWxdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICAgICAgcmV0dmFsW2ldID0gW3ZhbF07XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbjEgPSBhcnJheS5sZW5ndGg7IGkgPCBuMSAtIGNvdW50ICsgMTsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBjb21iaW5hdGlvbihhcnJheS5zbGljZShpICsgMSksIGNvdW50IC0gMSk7XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMCwgbjIgPSByb3cubGVuZ3RoOyBqIDwgbjI7IGorKykge1xuICAgICAgICAgICAgICAgIHJldHZhbC5wdXNoKFthcnJheVtpXV0uY29uY2F0KHJvd1tqXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUubWFwKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUubWFwKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgKkFycmF5KiBhcyB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c6YWN5YiX44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYXA8VCwgVT4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSB8IFByb21pc2U8VT4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxVW10+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXG4gICAgICAgIGFycmF5Lm1hcChhc3luYyAodiwgaSwgYSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyA/PyB0aGlzLCB2LCBpLCBhKTtcbiAgICAgICAgfSlcbiAgICApO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuZmlsdGVyKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZmlsdGVyKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgKkFycmF5KiBhcyB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c6YWN5YiX44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaWx0ZXI8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxUW10+IHtcbiAgICBjb25zdCBiaXRzOiBib29sZWFuW10gPSBhd2FpdCBtYXAoYXJyYXksICh2LCBpLCBhKSA9PiBjYWxsYmFjay5jYWxsKHRoaXNBcmcgPz8gdGhpcywgdiwgaSwgYSkpO1xuICAgIHJldHVybiBhcnJheS5maWx0ZXIoKCkgPT4gYml0cy5zaGlmdCgpKTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLmZpbmQoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5maW5kKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+e1kOaenOOCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZDxUPih0aGlzOiB1bmtub3duLCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBib29sZWFuIHwgUHJvbWlzZTxib29sZWFuPiwgdGhpc0FyZz86IHVua25vd24pOiBQcm9taXNlPFQgfCB1bmRlZmluZWQ+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyA/PyB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5maW5kSW5kZXgoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5maW5kSW5kZXgoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIHRoaXNBcmdcbiAqICAtIGBlbmAgVmFsdWUgdG8gdXNlIGFzICp0aGlzKiB3aGVuIGV4ZWN1dGluZyB0aGUgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDlrp/ooYzjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCBpbmRleCB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K544KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaW5kSW5kZXg8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyA/PyB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLnNvbWUoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5zb21lKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgYm9vbGVhbiB2YWx1ZS5cbiAqICAtIGBqYWAg55yf5YG95YCk44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzb21lPFQ+KHRoaXM6IHVua25vd24sIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHVua25vd24sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmIChhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgPz8gdGhpcywgdiwgaSwgYXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5ldmVyeSgpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLmV2ZXJ5KClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgYm9vbGVhbiB2YWx1ZS5cbiAqICAtIGBqYWAg55yf5YG95YCk44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBldmVyeTxUPih0aGlzOiB1bmtub3duLCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiB1bmtub3duLCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGZvciAoY29uc3QgW2ksIHZdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoIWF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyA/PyB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLnJlZHVjZSgpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLnJlZHVjZSgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gaW5pdGlhbFZhbHVlXG4gKiAgLSBgZW5gIFVzZWQgYXMgZmlyc3QgYXJndW1lbnQgdG8gdGhlIGZpcnN0IGNhbGwgb2YgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDjgavmuKHjgZXjgozjgovliJ3mnJ/lgKRcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCAqQXJyYXkqIGFzIHZhbHVlLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PntZDmnpzphY3liJfjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlZHVjZTxULCBVPihcbiAgICBhcnJheTogVFtdLFxuICAgIGNhbGxiYWNrOiAoYWNjdW11bGF0b3I6IFUsIGN1cnJlbnRWYWx1ZTogVCwgY3VycmVudEluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUgfCBQcm9taXNlPFU+LFxuICAgIGluaXRpYWxWYWx1ZT86IFVcbik6IFByb21pc2U8VT4ge1xuICAgIGlmIChhcnJheS5sZW5ndGggPD0gMCAmJiB1bmRlZmluZWQgPT09IGluaXRpYWxWYWx1ZSkge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1JlZHVjZSBvZiBlbXB0eSBhcnJheSB3aXRoIG5vIGluaXRpYWwgdmFsdWUnKTtcbiAgICB9XG5cbiAgICBjb25zdCBoYXNJbml0ID0gKHVuZGVmaW5lZCAhPT0gaW5pdGlhbFZhbHVlKTtcbiAgICBsZXQgYWNjID0gKGhhc0luaXQgPyBpbml0aWFsVmFsdWUgOiBhcnJheVswXSkgYXMgVTtcblxuICAgIGZvciAoY29uc3QgW2ksIHZdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoISghaGFzSW5pdCAmJiAwID09PSBpKSkge1xuICAgICAgICAgICAgYWNjID0gYXdhaXQgY2FsbGJhY2soYWNjLCB2LCBpLCBhcnJheSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYWNjO1xufVxuIiwiLyoqXG4gKiBAZW4gRGF0ZSB1bml0IGRlZmluaXRpb25zLlxuICogQGphIOaXpeaZguOCquODluOCuOOCp+OCr+ODiOOBruWNmOS9jeWumue+qVxuICovXG5leHBvcnQgdHlwZSBEYXRlVW5pdCA9ICd5ZWFyJyB8ICdtb250aCcgfCAnZGF5JyB8ICdob3VyJyB8ICdtaW4nIHwgJ3NlYycgfCAnbXNlYyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9jb21wdXRlRGF0ZUZ1bmNNYXAgPSB7XG4gICAgeWVhcjogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDRnVsbFllYXIoYmFzZS5nZXRVVENGdWxsWWVhcigpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbiAgICBtb250aDogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDTW9udGgoYmFzZS5nZXRVVENNb250aCgpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbiAgICBkYXk6IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ0RhdGUoYmFzZS5nZXRVVENEYXRlKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIGhvdXI6IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ0hvdXJzKGJhc2UuZ2V0VVRDSG91cnMoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG4gICAgbWluOiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENNaW51dGVzKGJhc2UuZ2V0VVRDTWludXRlcygpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbiAgICBzZWM6IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ1NlY29uZHMoYmFzZS5nZXRVVENTZWNvbmRzKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIG1zZWM6IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ01pbGxpc2Vjb25kcyhiYXNlLmdldFVUQ01pbGxpc2Vjb25kcygpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQGVuIENhbGN1bGF0ZSBmcm9tIHRoZSBkYXRlIHdoaWNoIGJlY29tZXMgYSBjYXJkaW5hbCBwb2ludCBiZWZvcmUgYSBOIGRhdGUgdGltZSBvciBhZnRlciBhIE4gZGF0ZSB0aW1lIChieSB7QGxpbmsgRGF0ZVVuaXR9KS5cbiAqIEBqYSDln7rngrnjgajjgarjgovml6Xku5jjgYvjgonjgIFO5pel5b6M44CBTuaXpeWJjeOCkueul+WHulxuICpcbiAqIEBwYXJhbSBiYXNlXG4gKiAgLSBgZW5gIGJhc2UgZGF0ZSB0aW1lLlxuICogIC0gYGphYCDln7rmupbml6VcbiAqIEBwYXJhbSBhZGRcbiAqICAtIGBlbmAgcmVsYXRpdmUgZGF0ZSB0aW1lLlxuICogIC0gYGphYCDliqDnrpfml6UuIOODnuOCpOODiuOCueaMh+WumuOBp27ml6XliY3jgoLoqK3lrprlj6/og71cbiAqIEBwYXJhbSB1bml0IHtAbGluayBEYXRlVW5pdH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVEYXRlKGJhc2U6IERhdGUsIGFkZDogbnVtYmVyLCB1bml0OiBEYXRlVW5pdCA9ICdkYXknKTogRGF0ZSB7XG4gICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKGJhc2UuZ2V0VGltZSgpKTtcbiAgICBjb25zdCBmdW5jID0gX2NvbXB1dGVEYXRlRnVuY01hcFt1bml0XTtcbiAgICBpZiAoZnVuYykge1xuICAgICAgICByZXR1cm4gZnVuYyhkYXRlLCBiYXNlLCBhZGQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYGludmFsaWQgdW5pdDogJHt1bml0fWApO1xuICAgIH1cbn1cbiIsImNvbnN0IF9zdGF0dXM6IFJlY29yZDxzdHJpbmcgfCBzeW1ib2wsIG51bWJlcj4gPSB7fTtcblxuLyoqXG4gKiBAZW4gSW5jcmVtZW50IHJlZmVyZW5jZSBjb3VudCBmb3Igc3RhdHVzIGlkZW50aWZpZXIuXG4gKiBAamEg54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44Kk44Oz44Kv44Oq44Oh44Oz44OIXG4gKlxuICogQHBhcmFtIHN0YXR1c1xuICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgcmVmZXJlbmNlIGNvdW50IHZhbHVlXG4gKiAgLSBgamFgIOWPgueFp+OCq+OCpuODs+ODiOOBruWApFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RhdHVzQWRkUmVmKHN0YXR1czogc3RyaW5nIHwgc3ltYm9sKTogbnVtYmVyIHtcbiAgICBpZiAoIV9zdGF0dXNbc3RhdHVzXSkge1xuICAgICAgICBfc3RhdHVzW3N0YXR1c10gPSAxO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIF9zdGF0dXNbc3RhdHVzXSsrO1xuICAgIH1cbiAgICByZXR1cm4gX3N0YXR1c1tzdGF0dXNdO1xufVxuXG4vKipcbiAqIEBlbiBEZWNyZW1lbnQgcmVmZXJlbmNlIGNvdW50IGZvciBzdGF0dXMgaWRlbnRpZmllci5cbiAqIEBqYSDnirbmhYvlpInmlbDjga7lj4Lnhafjgqvjgqbjg7Pjg4jjga7jg4fjgq/jg6rjg6Hjg7Pjg4hcbiAqXG4gKiBAcGFyYW0gc3RhdHVzXG4gKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCByZWZlcmVuY2UgY291bnQgdmFsdWVcbiAqICAtIGBqYWAg5Y+C54Wn44Kr44Km44Oz44OI44Gu5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGF0dXNSZWxlYXNlKHN0YXR1czogc3RyaW5nIHwgc3ltYm9sKTogbnVtYmVyIHtcbiAgICBpZiAoIV9zdGF0dXNbc3RhdHVzXSkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCByZXR2YWwgPSAtLV9zdGF0dXNbc3RhdHVzXTtcbiAgICAgICAgaWYgKDAgPT09IHJldHZhbCkge1xuICAgICAgICAgICAgZGVsZXRlIF9zdGF0dXNbc3RhdHVzXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gU3RhdGUgdmFyaWFibGUgbWFuYWdlbWVudCBzY29wZVxuICogQGphIOeKtuaFi+WkieaVsOeuoeeQhuOCueOCs+ODvOODl1xuICpcbiAqIEBwYXJhbSBzdGF0dXNcbiAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBzZWVkIGZ1bmN0aW9uLlxuICogIC0gYGphYCDlr77osaHjga7plqLmlbBcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIHJldHZhbCBvZiBzZWVkIGZ1bmN0aW9uLlxuICogIC0gYGphYCDlr77osaHjga7plqLmlbDjga7miLvjgorlgKRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXR1c1Njb3BlPFQ+KHN0YXR1czogc3RyaW5nIHwgc3ltYm9sLCBleGVjdXRvcjogKCkgPT4gVCB8IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICB0cnkge1xuICAgICAgICBzdGF0dXNBZGRSZWYoc3RhdHVzKTtcbiAgICAgICAgcmV0dXJuIGF3YWl0IGV4ZWN1dG9yKCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgc3RhdHVzUmVsZWFzZShzdGF0dXMpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgaWYgaXQncyBpbiB0aGUgc3BlY2lmaWVkIHN0YXRlLlxuICogQGphIOaMh+WumuOBl+OBn+eKtuaFi+S4reOBp+OBguOCi+OBi+eiuuiqjVxuICpcbiAqIEBwYXJhbSBzdGF0dXNcbiAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHRydWU6IOeKtuaFi+WGhSAvIGZhbHNlOiDnirbmhYvlpJZcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIGB0cnVlYDogd2l0aGluIHRoZSBzdGF0dXMgLyBgZmFsc2VgOiBvdXQgb2YgdGhlIHN0YXR1c1xuICogIC0gYGphYCBgdHJ1ZWA6IOeKtuaFi+WGhSAvIGBmYWxzZWA6IOeKtuaFi+WkllxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdGF0dXNJbihzdGF0dXM6IHN0cmluZyB8IHN5bWJvbCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIV9zdGF0dXNbc3RhdHVzXTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUVBOzs7Ozs7O0lBT0c7YUFDYSxTQUFTLEdBQUE7O0lBRXJCLElBQUEsT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLFVBQVUsSUFBSSxVQUFVLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFO0lBQ3BGO0lBRUE7Ozs7Ozs7Ozs7SUFVRzthQUNhLFlBQVksQ0FBbUMsTUFBcUIsRUFBRSxHQUFHLEtBQWUsRUFBQTtRQUNwRyxJQUFJLElBQUksSUFBSSxNQUFNLElBQUksU0FBUyxFQUFFLENBQWtCO0lBQ25ELElBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7WUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQzdCLFFBQUEsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQWtCO1FBQ3RDO0lBQ0EsSUFBQSxP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