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
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
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
                    resKey[k] = resKey[k] || []; // eslint-disable-line @typescript-eslint/prefer-nullish-coalescing
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS11dGlscy5qcyIsInNvdXJjZXMiOlsiY29uZmlnLnRzIiwidHlwZXMudHMiLCJ2ZXJpZnkudHMiLCJkZWVwLWNpcmN1aXQudHMiLCJtaXhpbnMudHMiLCJvYmplY3QudHMiLCJzYWZlLnRzIiwidGltZXIudHMiLCJtaXNjLnRzIiwiYXJyYXkudHMiLCJkYXRlLnRzIiwic3RhdHVzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgVW5rbm93bk9iamVjdCB9IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIEBlbiBTYWZlIGBnbG9iYWxgIGFjY2Vzc29yLlxuICogQGphIGBnbG9iYWxgIOOCouOCr+OCu+ODg+OCtVxuICpcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIGBnbG9iYWxgIG9iamVjdCBvZiB0aGUgcnVudGltZSBlbnZpcm9ubWVudFxuICogIC0gYGphYCDnkrDlooPjgavlv5zjgZjjgZ8gYGdsb2JhbGAg44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWwoKTogdHlwZW9mIGdsb2JhbFRoaXMge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1uZXctZnVuYywgQHR5cGVzY3JpcHQtZXNsaW50L25vLWltcGxpZWQtZXZhbFxuICAgIHJldHVybiAoJ29iamVjdCcgPT09IHR5cGVvZiBnbG9iYWxUaGlzKSA/IGdsb2JhbFRoaXMgOiBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xufVxuXG4vKipcbiAqIEBlbiBFbnN1cmUgbmFtZWQgb2JqZWN0IGFzIHBhcmVudCdzIHByb3BlcnR5LlxuICogQGphIOimquOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumuOBl+OBpiwg5ZCN5YmN44Gr5oyH5a6a44GX44Gf44Kq44OW44K444Kn44Kv44OI44Gu5a2Y5Zyo44KS5L+d6Ki8XG4gKlxuICogQHBhcmFtIHBhcmVudFxuICogIC0gYGVuYCBwYXJlbnQgb2JqZWN0LiBJZiBudWxsIGdpdmVuLCBgZ2xvYmFsVGhpc2AgaXMgYXNzaWduZWQuXG4gKiAgLSBgamFgIOimquOCquODluOCuOOCp+OCr+ODiC4gbnVsbCDjga7loLTlkIjjga8gYGdsb2JhbFRoaXNgIOOBjOS9v+eUqOOBleOCjOOCi1xuICogQHBhcmFtIG5hbWVzXG4gKiAgLSBgZW5gIG9iamVjdCBuYW1lIGNoYWluIGZvciBlbnN1cmUgaW5zdGFuY2UuXG4gKiAgLSBgamFgIOS/neiovOOBmeOCi+OCquODluOCuOOCp+OCr+ODiOOBruWQjeWJjVxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlT2JqZWN0PFQgZXh0ZW5kcyBvYmplY3QgPSBVbmtub3duT2JqZWN0PihwYXJlbnQ6IG9iamVjdCB8IG51bGwsIC4uLm5hbWVzOiBzdHJpbmdbXSk6IFQge1xuICAgIGxldCByb290ID0gKHBhcmVudCA/PyBnZXRHbG9iYWwoKSkgYXMgVW5rbm93bk9iamVjdDtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgbmFtZXMpIHtcbiAgICAgICAgcm9vdFtuYW1lXSA9IHJvb3RbbmFtZV0gPz8ge307XG4gICAgICAgIHJvb3QgPSByb290W25hbWVdIGFzIFVua25vd25PYmplY3Q7XG4gICAgfVxuICAgIHJldHVybiByb290IGFzIFQ7XG59XG5cbi8qKlxuICogQGVuIEdsb2JhbCBuYW1lc3BhY2UgYWNjZXNzb3IuXG4gKiBAamEg44Kw44Ot44O844OQ44Or44ON44O844Og44K544Oa44O844K544Ki44Kv44K744OD44K1XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWxOYW1lc3BhY2U8VCBleHRlbmRzIG9iamVjdCA9IFVua25vd25PYmplY3Q+KG5hbWVzcGFjZTogc3RyaW5nKTogVCB7XG4gICAgcmV0dXJuIGVuc3VyZU9iamVjdDxUPihudWxsLCBuYW1lc3BhY2UpO1xufVxuXG4vKipcbiAqIEBlbiBHbG9iYWwgY29uZmlnIGFjY2Vzc29yLlxuICogQGphIOOCsOODreODvOODkOODq+OCs+ODs+ODleOCo+OCsOOCouOCr+OCu+ODg+OCtVxuICpcbiAqIEByZXR1cm5zIGRlZmF1bHQ6IGBDRFAuQ29uZmlnYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnPFQgZXh0ZW5kcyBvYmplY3QgPSBVbmtub3duT2JqZWN0PihuYW1lc3BhY2UgPSAnQ0RQJywgY29uZmlnTmFtZSA9ICdDb25maWcnKTogVCB7XG4gICAgcmV0dXJuIGVuc3VyZU9iamVjdDxUPihnZXRHbG9iYWxOYW1lc3BhY2UobmFtZXNwYWNlKSwgY29uZmlnTmFtZSk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1mdW5jdGlvbi10eXBlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1vYmplY3QtdHlwZSxcbiAqL1xuXG4vKipcbiAqIEBlbiBQcmltaXRpdmUgdHlwZSBvZiBKYXZhU2NyaXB0LlxuICogQGphIEphdmFTY3JpcHQg44Gu44OX44Oq44Of44OG44Kj44OW5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFByaW1pdGl2ZSA9IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBzeW1ib2wgfCBiaWdpbnQgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlbiBUaGUgZ2VuZXJhbCBudWxsIHR5cGUuXG4gKiBAamEg56m644KS56S644GZ5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIE51bGxpc2ggPSB2b2lkIHwgbnVsbCB8IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBAZW4gVGhlIHR5cGUgb2Ygb2JqZWN0IG9yIHtAbGluayBOdWxsaXNofS5cbiAqIEBqYSB7QGxpbmsgTnVsbGlzaH0g44Gr44Gq44KK44GI44KL44Kq44OW44K444Kn44Kv44OI5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIE51bGxhYmxlPFQgZXh0ZW5kcyBvYmplY3Q+ID0gVCB8IE51bGxpc2g7XG5cbi8qKlxuICogQGVuIEF2b2lkIHRoZSBgRnVuY3Rpb25gdHlwZXMuXG4gKiBAamEg5rGO55So6Zai5pWw5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFVua25vd25GdW5jdGlvbiA9ICguLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd247XG5cbi8qKlxuICogQGVuIEF2b2lkIHRoZSBgT2JqZWN0YCBhbmQgYHt9YCB0eXBlcywgYXMgdGhleSBtZWFuIFwiYW55IG5vbi1udWxsaXNoIHZhbHVlXCIuXG4gKiBAamEg5rGO55So44Kq44OW44K444Kn44Kv44OI5Z6LLiBgT2JqZWN0YCDjgYrjgojjgbMgYHt9YCDjgr/jgqTjg5fjga/jgIxudWxs44Gn44Gq44GE5YCk44CN44KS5oSP5ZGz44GZ44KL44Gf44KB5Luj5L6h44Go44GX44Gm5L2/55SoXG4gKi9cbmV4cG9ydCB0eXBlIFVua25vd25PYmplY3QgPSBSZWNvcmQ8c3RyaW5nIHwgbnVtYmVyIHwgc3ltYm9sLCB1bmtub3duPjtcblxuLyoqXG4gKiBAZW4gSmF2YVNjcmlwdCB0eXBlIHNldCBpbnRlcmZhY2UuXG4gKiBAamEgSmF2YVNjcmlwdCDjga7lnovjga7pm4blkIhcbiAqL1xuaW50ZXJmYWNlIFR5cGVMaXN0IHtcbiAgICBzdHJpbmc6IHN0cmluZztcbiAgICBudW1iZXI6IG51bWJlcjtcbiAgICBib29sZWFuOiBib29sZWFuO1xuICAgIHN5bWJvbDogc3ltYm9sO1xuICAgIGJpZ2ludDogYmlnaW50O1xuICAgIHVuZGVmaW5lZDogdm9pZCB8IHVuZGVmaW5lZDtcbiAgICBvYmplY3Q6IG9iamVjdCB8IG51bGw7XG4gICAgZnVuY3Rpb24oLi4uYXJnczogdW5rbm93bltdKTogdW5rbm93bjtcbn1cblxuLyoqXG4gKiBAZW4gVGhlIGtleSBsaXN0IG9mIHtAbGluayBUeXBlTGlzdH0uXG4gKiBAamEge0BsaW5rIFR5cGVMaXN0fSDjgq3jg7zkuIDopqdcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZUtleXMgPSBrZXlvZiBUeXBlTGlzdDtcblxuLyoqXG4gKiBAZW4gVHlwZSBiYXNlIGRlZmluaXRpb24uXG4gKiBAamEg5Z6L44Gu6KaP5a6a5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZTxUIGV4dGVuZHMgb2JqZWN0PiBleHRlbmRzIEZ1bmN0aW9uIHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IFQ7XG59XG5cbi8qKlxuICogQGVuIFR5cGUgb2YgY29uc3RydWN0b3IuXG4gKiBAamEg44Kz44Oz44K544OI44Op44Kv44K/5Z6LXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29uc3RydWN0b3I8VCBleHRlbmRzIG9iamVjdD4gZXh0ZW5kcyBUeXBlPFQ+IHtcbiAgICBuZXcoLi4uYXJnczogYW55W10pOiBUO1xufVxuXG4vKipcbiAqIEBlbiBUeXBlIG9mIGNsYXNzLlxuICogQGphIOOCr+ODqeOCueWei1xuICovXG5leHBvcnQgdHlwZSBDbGFzczxUIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PiA9IENvbnN0cnVjdG9yPFQ+O1xuXG4vKipcbiAqIEBlbiBFbnN1cmUgZm9yIGZ1bmN0aW9uIHBhcmFtZXRlcnMgdG8gdHVwbGUuXG4gKiBAamEg6Zai5pWw44OR44Op44Oh44O844K/44Go44GX44GmIHR1cGxlIOOCkuS/neiovFxuICovXG5leHBvcnQgdHlwZSBBcmd1bWVudHM8VD4gPSBUIGV4dGVuZHMgYW55W10gPyBUIDogW1RdO1xuXG4vKipcbiAqIEBlbiBSbW92ZSBgcmVhZG9ubHlgIGF0dHJpYnV0ZXMgZnJvbSBpbnB1dCB0eXBlLlxuICogQGphIGByZWFkb25seWAg5bGe5oCn44KS6Kej6ZmkXG4gKi9cbmV4cG9ydCB0eXBlIFdyaXRhYmxlPFQ+ID0geyAtcmVhZG9ubHkgW0sgaW4ga2V5b2YgVF06IFRbS10gfTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBzdWJzY3JpcHQgYWNjZXNzaWJsZSB0eXBlLlxuICogQGphIOa3u+OBiOWtl+OCouOCr+OCu+OCueWPr+iDveOBquWei+OBq+WkieaPm1xuICovXG5leHBvcnQgdHlwZSBBY2Nlc3NpYmxlPFQsIFMgPSB1bmtub3duPiA9IFQgJiBSZWNvcmQ8c3RyaW5nIHwgbnVtYmVyIHwgc3ltYm9sLCBTPjtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBmdW5jdGlvbmFsIHByb3BlcnR5IG5hbWVzLlxuICogQGphIOmWouaVsOODl+ODreODkeODhuOCo+WQjeOBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBGdW5jdGlvblByb3BlcnR5TmFtZXM8VD4gPSB7IFtLIGluIGtleW9mIFRdOiBUW0tdIGV4dGVuZHMgRnVuY3Rpb24gPyBLIDogbmV2ZXIgfVtrZXlvZiBUXSAmIHN0cmluZztcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBmdW5jdGlvbmFsIHByb3BlcnRpZXMuXG4gKiBAamEg6Zai5pWw44OX44Ot44OR44OG44Kj44Gu5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIEZ1bmN0aW9uUHJvcGVydGllczxUPiA9IFBpY2s8VCwgRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+PjtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBub24tZnVuY3Rpb25hbCBwcm9wZXJ0eSBuYW1lcy5cbiAqIEBqYSDpnZ7plqLmlbDjg5fjg63jg5Hjg4bjgqPlkI3jga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+ID0geyBbSyBpbiBrZXlvZiBUXTogVFtLXSBleHRlbmRzIEZ1bmN0aW9uID8gbmV2ZXIgOiBLIH1ba2V5b2YgVF0gJiBzdHJpbmc7XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgbm9uLWZ1bmN0aW9uYWwgcHJvcGVydGllcy5cbiAqIEBqYSDpnZ7plqLmlbDjg5fjg63jg5Hjg4bjgqPjga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgTm9uRnVuY3Rpb25Qcm9wZXJ0aWVzPFQ+ID0gUGljazxULCBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VD4+O1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG5vbi1mdW5jdGlvbmFsIHR5cGVzLlxuICogQGphIOmdnumWouaVsOWei+OBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBOb25GdW5jdGlvbjxUPiA9IFQgZXh0ZW5kcyBGdW5jdGlvbiA/IG5ldmVyIDogVDtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBvYmplY3Qga2V5IGxpc3QuIChlbnN1cmUgb25seSAnc3RyaW5nJylcbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7jgq3jg7zkuIDopqfjgpLmir3lh7ogKCdzdHJpbmcnIOWei+OBruOBv+OCkuS/neiovClcbiAqL1xuZXhwb3J0IHR5cGUgS2V5czxUIGV4dGVuZHMgb2JqZWN0PiA9IGtleW9mIE9taXQ8VCwgbnVtYmVyIHwgc3ltYm9sPjtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBvYmplY3QgdHlwZSBsaXN0LlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBruWei+S4gOimp+OCkuaKveWHulxuICovXG5leHBvcnQgdHlwZSBUeXBlczxUIGV4dGVuZHMgb2JqZWN0PiA9IFRba2V5b2YgVF07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgb2JqZWN0IGtleSB0byB0eXBlLlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOCreODvOOBi+OCieWei+OBuOWkieaPm1xuICovXG5leHBvcnQgdHlwZSBLZXlUb1R5cGU8TyBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIGtleW9mIE8+ID0gSyBleHRlbmRzIGtleW9mIE8gPyBPW0tdIDogbmV2ZXI7XG5cbi8qKlxuICogQGVuIENvbnZlcnQgb2JqZWN0IHR5cGUgdG8ga2V5LlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOWei+OBi+OCieOCreODvOOBuOWkieaPm1xuICovXG5leHBvcnQgdHlwZSBUeXBlVG9LZXk8TyBleHRlbmRzIG9iamVjdCwgVCBleHRlbmRzIFR5cGVzPE8+PiA9IHsgW0sgaW4ga2V5b2YgT106IE9bS10gZXh0ZW5kcyBUID8gSyA6IG5ldmVyIH1ba2V5b2YgT107XG5cbi8qKlxuICogQGVuIFRoZSB7QGxpbmsgUGxhaW5PYmplY3R9IHR5cGUgaXMgYSBKYXZhU2NyaXB0IG9iamVjdCBjb250YWluaW5nIHplcm8gb3IgbW9yZSBrZXktdmFsdWUgcGFpcnMuIDxicj5cbiAqICAgICAnUGxhaW4nIG1lYW5zIGl0IGZyb20gb3RoZXIga2luZHMgb2YgSmF2YVNjcmlwdCBvYmplY3RzLiBleDogbnVsbCwgdXNlci1kZWZpbmVkIGFycmF5cywgYW5kIGhvc3Qgb2JqZWN0cyBzdWNoIGFzIGBkb2N1bWVudGAuXG4gKiBAamEgMCDku6XkuIrjga4ga2V5LXZhbHVlIOODmuOCouOCkuaMgeOBpCB7QGxpbmsgUGxhaW5PYmplY3R9IOWumue+qSA8YnI+XG4gKiAgICAgJ1BsYWluJyDjgajjga/ku5bjga7nqK7poZ7jga4gSmF2YVNjcmlwdCDjgqrjg5bjgrjjgqfjgq/jg4jjgpLlkKvjgb7jgarjgYTjgqrjg5bjgrjjgqfjgq/jg4jjgpLmhI/lkbPjgZnjgosuIOS+izogIG51bGwsIOODpuODvOOCtuODvOWumue+qemFjeWIlywg44G+44Gf44GvIGBkb2N1bWVudGAg44Gu44KI44GG44Gq57WE44G/6L6844G/44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCB0eXBlIFBsYWluT2JqZWN0PFQgPSB7fSB8IG51bGwgfCB1bmRlZmluZWQ+ID0gUmVjb3JkPHN0cmluZywgVD47XG5cbi8qKlxuICogQGVuIE9iamVjdCBjYW4gYmUgZ3VhcmFudGVlZCBkZWZpbml0aW9uLiBCZSBjYXJlZnVsIG5vdCB0byBhYnVzZSBpdCBiZWNhdXNlIGl0IGRvZXMgbm90IGZvcmNlIHRoZSBjYXN0LlxuICogICAtIFVubGlrZSB7QGxpbmsgUGxhaW5PYmplY3R9LCBpdCBjYW4gYWNjZXB0IENsYXNzIChidWlsdC1pbiBvYmplY3QpLCBBcnJheSwgRnVuY3Rpb24uXG4gKiAgIC0gVW5saWtlIGBvYmplY3RgLCB5b3UgY2FuIGFjY2VzcyB1bmtub3duIHByb3BlcnRpZXMuXG4gKiAgIC0gVW5saWtlIGB7fSAvIE9iamVjdGAsIGl0IGNhbiByZXBlbCB7QGxpbmsgUHJpbWl0aXZlfS5cbiAqIEBqYSBPYmplY3Qg44KS5L+d6Ki85Y+v6IO944Gq5a6a576pLiDjgq3jg6Pjgrnjg4jjgpLlvLfliLbjgZfjgarjgYTjgZ/jgoHkubHnlKjjgZfjgarjgYTjgojjgYbjgavms6jmhI/jgYzlv4XopoEuXG4gKiAgIC0ge0BsaW5rIFBsYWluT2JqZWN0fSDjgajpgZXjgYTjgIFDbGFzcyAo57WE44G/6L6844G/44Kq44OW44K444Kn44Kv44OIKSwgQXJyYXksIEZ1bmN0aW9uIOOCkuWPl+OBkeS7mOOBkeOCi+OBk+OBqOOBjOOBp+OBjeOCiy5cbiAqICAgLSBgb2JqZWN0YCDjgajpgZXjgYTjgIHmnKrnn6Xjga7jg5fjg63jg5Hjg4bjgqPjgavjgqLjgq/jgrvjgrnjgZnjgovjgZPjgajjgYzjgafjgY3jgosuXG4gKiAgIC0gYHt9IC8gT2JqZWN0YCDjgajpgZXjgYTjgIF7QGxpbmsgUHJpbWl0aXZlfSDjgpLjga/jgZjjgY/jgZPjgajjgYzjgafjgY3jgosuXG4gKi9cbmV4cG9ydCB0eXBlIEFueU9iamVjdCA9IFJlY29yZDxzdHJpbmcsIGFueT47XG5cbi8qKlxuICogQGVuIFRoZSBkYXRhIHR5cGUgbGlzdCBieSB3aGljaCBzdHlsZSBjb21wdWxzaW9uIGlzIHBvc3NpYmxlLlxuICogQGphIOWei+W8t+WItuWPr+iDveOBquODh+ODvOOCv+Wei+S4gOimp1xuICovXG5leHBvcnQgdHlwZSBUeXBlZERhdGEgPSBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCB8IG9iamVjdDtcblxuLyoqXG4gKiBAZW4gVGhlIGRhdGEgdHlwZSBsaXN0IG9mIFR5cGVkQXJyYXkuXG4gKiBAamEgVHlwZWRBcnJheSDkuIDopqdcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZWRBcnJheSA9IEludDhBcnJheSB8IFVpbnQ4QXJyYXkgfCBVaW50OENsYW1wZWRBcnJheSB8IEludDE2QXJyYXkgfCBVaW50MTZBcnJheSB8IEludDMyQXJyYXkgfCBVaW50MzJBcnJheSB8IEZsb2F0MzJBcnJheSB8IEZsb2F0NjRBcnJheTtcblxuLyoqXG4gKiBAZW4gVHlwZWRBcnJheSBjb25zdHJ1Y3Rvci5cbiAqIEBqYSBUeXBlZEFycmF5IOOCs+ODs+OCueODiOODqeOCr+OCv+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFR5cGVkQXJyYXlDb25zdHJ1Y3RvciB7XG4gICAgcmVhZG9ubHkgcHJvdG90eXBlOiBUeXBlZEFycmF5O1xuICAgIG5ldyhzZWVkOiBudW1iZXIgfCBBcnJheUxpa2U8bnVtYmVyPiB8IEFycmF5QnVmZmVyTGlrZSk6IFR5cGVkQXJyYXk7XG4gICAgbmV3KGJ1ZmZlcjogQXJyYXlCdWZmZXJMaWtlLCBieXRlT2Zmc2V0PzogbnVtYmVyLCBsZW5ndGg/OiBudW1iZXIpOiBUeXBlZEFycmF5O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBzaXplIGluIGJ5dGVzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIOimgee0oOOBruODkOOCpOODiOOCteOCpOOCulxuICAgICAqL1xuICAgIHJlYWRvbmx5IEJZVEVTX1BFUl9FTEVNRU5UOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhIG5ldyBhcnJheSBmcm9tIGEgc2V0IG9mIGVsZW1lbnRzLlxuICAgICAqIEBqYSDopoHntKDjgpLoqK3lrprjgZfmlrDopo/phY3liJfjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpdGVtc1xuICAgICAqICAtIGBlbmAgQSBzZXQgb2YgZWxlbWVudHMgdG8gaW5jbHVkZSBpbiB0aGUgbmV3IGFycmF5IG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOaWsOOBn+OBq+ioreWumuOBmeOCi+imgee0oFxuICAgICAqL1xuICAgIG9mKC4uLml0ZW1zOiBudW1iZXJbXSk6IFR5cGVkQXJyYXk7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlcyBhbiBhcnJheSBmcm9tIGFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0LlxuICAgICAqIEBqYSBhcnJheS1saWtlIC8gaXRlcmF0YWJsZSDjgqrjg5bjgrjjgqfjgq/jg4jjgYvjgonmlrDopo/phY3liJfjgpLkvZzmiJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheUxpa2VcbiAgICAgKiAgLSBgZW5gIEFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0IHRvIGNvbnZlcnQgdG8gYW4gYXJyYXkuXG4gICAgICogIC0gYGphYCBhcnJheS1saWtlIOOCguOBl+OBj+OBryBpdGVyYXRhYmxlIOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIGZyb20oYXJyYXlMaWtlOiBBcnJheUxpa2U8bnVtYmVyPik6IFR5cGVkQXJyYXk7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlcyBhbiBhcnJheSBmcm9tIGFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0LlxuICAgICAqIEBqYSBhcnJheS1saWtlIC8gaXRlcmF0YWJsZSDjgqrjg5bjgrjjgqfjgq/jg4jjgYvjgonmlrDopo/phY3liJfjgpLkvZzmiJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheUxpa2VcbiAgICAgKiAgLSBgZW5gIEFuIGFycmF5LWxpa2Ugb3IgaXRlcmFibGUgb2JqZWN0IHRvIGNvbnZlcnQgdG8gYW4gYXJyYXkuXG4gICAgICogIC0gYGphYCBhcnJheS1saWtlIOOCguOBl+OBj+OBryBpdGVyYXRhYmxlIOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBtYXBmblxuICAgICAqICAtIGBlbmAgQSBtYXBwaW5nIGZ1bmN0aW9uIHRvIGNhbGwgb24gZXZlcnkgZWxlbWVudCBvZiB0aGUgYXJyYXkuXG4gICAgICogIC0gYGphYCDlhajopoHntKDjgavpgannlKjjgZnjgovjg5fjg63jgq3jgrfplqLmlbBcbiAgICAgKiBAcGFyYW0gdGhpc0FyZ1xuICAgICAqICAtIGBlbmAgVmFsdWUgb2YgJ3RoaXMnIHVzZWQgdG8gaW52b2tlIHRoZSBtYXBmbi5cbiAgICAgKiAgLSBgamFgIG1hcGZuIOOBq+S9v+eUqOOBmeOCiyAndGhpcydcbiAgICAgKi9cbiAgICBmcm9tPFQ+KGFycmF5TGlrZTogQXJyYXlMaWtlPFQ+LCBtYXBmbjogKHY6IFQsIGs6IG51bWJlcikgPT4gbnVtYmVyLCB0aGlzQXJnPzogdW5rbm93bik6IFR5cGVkQXJyYXk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgZXhpc3RzLlxuICogQGphIOWApOOBjOWtmOWcqOOBmeOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4aXN0czxUPih4OiBUIHwgTnVsbGlzaCk6IHggaXMgVCB7XG4gICAgcmV0dXJuIG51bGwgIT0geDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMge0BsaW5rIE51bGxpc2h9LlxuICogQGphIHtAbGluayBOdWxsaXNofSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc051bGxpc2goeDogdW5rbm93bik6IHggaXMgTnVsbGlzaCB7XG4gICAgcmV0dXJuIG51bGwgPT0geDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgU3RyaW5nLlxuICogQGphIFN0cmluZyDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0cmluZyh4OiB1bmtub3duKTogeCBpcyBzdHJpbmcge1xuICAgIHJldHVybiAnc3RyaW5nJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIE51bWJlci5cbiAqIEBqYSBOdW1iZXIg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOdW1iZXIoeDogdW5rbm93bik6IHggaXMgbnVtYmVyIHtcbiAgICByZXR1cm4gJ251bWJlcicgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBCb29sZWFuLlxuICogQGphIEJvb2xlYW4g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCb29sZWFuKHg6IHVua25vd24pOiB4IGlzIGJvb2xlYW4ge1xuICAgIHJldHVybiAnYm9vbGVhbicgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBTeW1ibGUuXG4gKiBAamEgU3ltYm9sIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3ltYm9sKHg6IHVua25vd24pOiB4IGlzIHN5bWJvbCB7XG4gICAgcmV0dXJuICdzeW1ib2wnID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgQmlnSW50LlxuICogQGphIEJpZ0ludCDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0JpZ0ludCh4OiB1bmtub3duKTogeCBpcyBiaWdpbnQge1xuICAgIHJldHVybiAnYmlnaW50JyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIHByaW1pdGl2ZSB0eXBlLlxuICogQGphIOODl+ODquODn+ODhuOCo+ODluWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUHJpbWl0aXZlKHg6IHVua25vd24pOiB4IGlzIFByaW1pdGl2ZSB7XG4gICAgcmV0dXJuICF4IHx8ICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgeCkgJiYgKCdvYmplY3QnICE9PSB0eXBlb2YgeCk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIEFycmF5LlxuICogQGphIEFycmF5IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGNvbnN0IGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBPYmplY3QuXG4gKiBAamEgT2JqZWN0IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT2JqZWN0KHg6IHVua25vd24pOiB4IGlzIG9iamVjdCB7XG4gICAgcmV0dXJuIEJvb2xlYW4oeCkgJiYgJ29iamVjdCcgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyB7QGxpbmsgUGxhaW5PYmplY3R9LlxuICogQGphIHtAbGluayBQbGFpbk9iamVjdH0g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQbGFpbk9iamVjdCh4OiB1bmtub3duKTogeCBpcyBQbGFpbk9iamVjdCB7XG4gICAgaWYgKCFpc09iamVjdCh4KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gY3JlYXRlIGZyb20gYE9iamVjdC5jcmVhdGUoIG51bGwgKWAgaXMgcGxhaW5cbiAgICBpZiAoIU9iamVjdC5nZXRQcm90b3R5cGVPZih4KSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3duSW5zdGFuY2VPZihPYmplY3QsIHgpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBlbXB0eSBvYmplY3QuXG4gKiBAamEg56m644Kq44OW44K444Kn44Kv44OI44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFbXB0eU9iamVjdCh4OiB1bmtub3duKTogeCBpcyBvYmplY3Qge1xuICAgIGlmICghaXNQbGFpbk9iamVjdCh4KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbmFtZSBpbiB4KSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIEZ1bmN0aW9uLlxuICogQGphIEZ1bmN0aW9uIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRnVuY3Rpb24oeDogdW5rbm93bik6IHggaXMgVHlwZUxpc3RbJ2Z1bmN0aW9uJ10ge1xuICAgIHJldHVybiAnZnVuY3Rpb24nID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGNhbiBiZSBjb252ZXJ0IHRvIGEgbnVtYmVyLlxuICogQGphIOaVsOWApOOBq+WkieaPm+WPr+iDveOBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTnVtZXJpYyh4OiB1bmtub3duKTogeCBpcyBudW1iZXIge1xuICAgIHJldHVybiAhaXNOdWxsaXNoKHgpICYmICFpc0Jvb2xlYW4oeCkgJiYgIWlzQXJyYXkoeCkgJiYgIWlzU3ltYm9sKHgpICYmICgnJyAhPT0geCkgJiYgIU51bWJlci5pc05hTihOdW1iZXIoeCkpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBpbnB1dC5cbiAqIEBqYSDmjIflrprjgZfjgZ/lnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gdHlwZVxuICogIC0gYGVuYCBldmFsdWF0ZWQgdHlwZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlnotcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHR5cGVPZjxLIGV4dGVuZHMgVHlwZUtleXM+KHR5cGU6IEssIHg6IHVua25vd24pOiB4IGlzIFR5cGVMaXN0W0tdIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09IHR5cGU7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBoYXMgaXRlcmF0b3IuXG4gKiBAamEgaXRlcmF0b3Ig44KS5omA5pyJ44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZTxUPih4OiBOdWxsYWJsZTxJdGVyYWJsZTxUPj4pOiB4IGlzIEl0ZXJhYmxlPFQ+O1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGUoeDogdW5rbm93bik6IHggaXMgSXRlcmFibGU8dW5rbm93bj47XG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZSh4OiB1bmtub3duKTogYW55IHtcbiAgICByZXR1cm4gU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdCh4KTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3R5cGVkQXJyYXlOYW1lczogUmVjb3JkPHN0cmluZywgYm9vbGVhbj4gPSB7XG4gICAgJ0ludDhBcnJheSc6IHRydWUsXG4gICAgJ1VpbnQ4QXJyYXknOiB0cnVlLFxuICAgICdVaW50OENsYW1wZWRBcnJheSc6IHRydWUsXG4gICAgJ0ludDE2QXJyYXknOiB0cnVlLFxuICAgICdVaW50MTZBcnJheSc6IHRydWUsXG4gICAgJ0ludDMyQXJyYXknOiB0cnVlLFxuICAgICdVaW50MzJBcnJheSc6IHRydWUsXG4gICAgJ0Zsb2F0MzJBcnJheSc6IHRydWUsXG4gICAgJ0Zsb2F0NjRBcnJheSc6IHRydWUsXG59O1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgaXMgb25lIG9mIHtAbGluayBUeXBlZEFycmF5fS5cbiAqIEBqYSDmjIflrprjgZfjgZ/jgqTjg7Pjgrnjgr/jg7PjgrnjgYwge0BsaW5rIFR5cGVkQXJyYXl9IOOBruS4gOeoruOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZWRBcnJheSh4OiB1bmtub3duKTogeCBpcyBUeXBlZEFycmF5IHtcbiAgICByZXR1cm4gISFfdHlwZWRBcnJheU5hbWVzW2NsYXNzTmFtZSh4KV07XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBpbnN0YW5jZSBvZiBpbnB1dC5cbiAqIEBqYSDmjIflrprjgZfjgZ/jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL44Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnN0YW5jZU9mPFQgZXh0ZW5kcyBvYmplY3Q+KGN0b3I6IE51bGxhYmxlPFR5cGU8VD4+LCB4OiB1bmtub3duKTogeCBpcyBUIHtcbiAgICByZXR1cm4gKCdmdW5jdGlvbicgPT09IHR5cGVvZiBjdG9yKSAmJiAoeCBpbnN0YW5jZW9mIGN0b3IpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgaW5zdGFuY2Ugb2YgaW5wdXQgY29uc3RydWN0b3IgKGV4Y2VwdCBzdWIgY2xhc3MpLlxuICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OBruOCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+WIpOWumiAo5rS+55Sf44Kv44Op44K544Gv5ZCr44KB44Gq44GEKVxuICpcbiAqIEBwYXJhbSBjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDoqZXkvqHjgZnjgovjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG93bkluc3RhbmNlT2Y8VCBleHRlbmRzIG9iamVjdD4oY3RvcjogTnVsbGFibGU8VHlwZTxUPj4sIHg6IHVua25vd24pOiB4IGlzIFQge1xuICAgIHJldHVybiAobnVsbCAhPSB4KSAmJiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGN0b3IpICYmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgPT09IE9iamVjdChjdG9yLnByb3RvdHlwZSkpO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIHZhbHVlJ3MgY2xhc3MgbmFtZS5cbiAqIEBqYSDjgq/jg6njgrnlkI3jgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGFzc05hbWUoeDogYW55KTogc3RyaW5nIHtcbiAgICBpZiAoeCAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHRvU3RyaW5nVGFnTmFtZSA9IHhbU3ltYm9sLnRvU3RyaW5nVGFnXTtcbiAgICAgICAgaWYgKGlzU3RyaW5nKHRvU3RyaW5nVGFnTmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0b1N0cmluZ1RhZ05hbWU7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbih4KSAmJiB4LnByb3RvdHlwZSAmJiBudWxsICE9IHgubmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHgubmFtZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGN0b3IgPSB4LmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oY3RvcikgJiYgY3RvciA9PT0gKE9iamVjdChjdG9yLnByb3RvdHlwZSkgYXMgb2JqZWN0KS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjdG9yLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkpLnNsaWNlKDgsIC0xKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgaW5wdXQgdmFsdWVzIGFyZSBzYW1lIHZhbHVlLXR5cGUuXG4gKiBAamEg5YWl5Yqb44GM5ZCM5LiA5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGxoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKiBAcGFyYW0gcmhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhbWVUeXBlKGxoczogdW5rbm93biwgcmhzOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHR5cGVvZiBsaHMgPT09IHR5cGVvZiByaHM7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIGlucHV0IHZhbHVlcyBhcmUgc2FtZSBjbGFzcy5cbiAqIEBqYSDlhaXlipvjgYzlkIzkuIDjgq/jg6njgrnjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gbGhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqIEBwYXJhbSByaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FtZUNsYXNzKGxoczogdW5rbm93biwgcmhzOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgaWYgKG51bGwgPT0gbGhzICYmIG51bGwgPT0gcmhzKSB7XG4gICAgICAgIHJldHVybiBjbGFzc05hbWUobGhzKSA9PT0gY2xhc3NOYW1lKHJocyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIChudWxsICE9IGxocykgJiYgKG51bGwgIT0gcmhzKSAmJiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKGxocykgPT09IE9iamVjdC5nZXRQcm90b3R5cGVPZihyaHMpKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbW1vbiBTeW1ibGUgZm9yIGZyYW1ld29yay5cbiAqIEBqYSDjg5Xjg6zjg7zjg6Djg6/jg7zjgq/jgYzlhbHpgJrjgafkvb/nlKjjgZnjgosgU3ltYmxlXG4gKi9cbmV4cG9ydCBjb25zdCAkY2RwID0gU3ltYm9sKCdAY2RwJyk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtZnVuY3Rpb24tdHlwZSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bkZ1bmN0aW9uLFxuICAgIHR5cGUgVHlwZUtleXMsXG4gICAgaXNBcnJheSxcbiAgICBleGlzdHMsXG4gICAgY2xhc3NOYW1lLFxufSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBAZW4gVHlwZSB2ZXJpZmllciBpbnRlcmZhY2UgZGVmaW5pdGlvbi4gPGJyPlxuICogICAgIElmIGludmFsaWQgdmFsdWUgcmVjZWl2ZWQsIHRoZSBtZXRob2QgdGhyb3dzIGBUeXBlRXJyb3JgLlxuICogQGphIOWei+aknOiovOOBruOCpOODs+OCv+ODvOODleOCp+OCpOOCueWumue+qSA8YnI+XG4gKiAgICAg6YGV5Y+N44GX44Gf5aC05ZCI44GvIGBUeXBlRXJyb3JgIOOCkueZuueUn1xuICpcbiAqXG4gKi9cbmludGVyZmFjZSBWZXJpZmllciB7XG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGlzIG5vdCB7QGxpbmsgTnVsbGlzaH0uXG4gICAgICogQGphIHtAbGluayBOdWxsaXNofSDjgafjgarjgYTjgZPjgajjgpLmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub3ROdWxsaXNoLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIG5vdE51bGxpc2gubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIG5vdE51bGxpc2g6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGlzIHtAbGluayBUeXBlS2V5c30uXG4gICAgICogQGphIOaMh+WumuOBl+OBnyB7QGxpbmsgVHlwZUtleXN9IOOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVPZi50eXBlXG4gICAgICogIC0gYGVuYCBvbmUgb2Yge0BsaW5rIFR5cGVLZXlzfVxuICAgICAqICAtIGBqYWAge0BsaW5rIFR5cGVLZXlzfSDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdHlwZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIHR5cGVPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgdHlwZU9mOiAodHlwZTogVHlwZUtleXMsIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaXMgYEFycmF5YC5cbiAgICAgKiBAamEgYEFycmF5YCDjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBhcnJheS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgYXJyYXk6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGlzIGBJdGVyYWJsZWAuXG4gICAgICogQGphIGBJdGVyYWJsZWAg44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlcmFibGUueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaXRlcmFibGUubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGl0ZXJhYmxlOiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpbnN0YW5jZSBpcyBlcXVhbCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3IuXG4gICAgICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OBruOCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGluc3RhbmNlT2YuY3RvclxuICAgICAqICAtIGBlbmAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDmr5TovIPlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gaW5zdGFuY2VPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBpbnN0YW5jZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBpbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaW5zdGFuY2UgaGFzIGBzdHJpY3RseWAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7ljrPlr4bkuIDoh7TjgZfjgZ/jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvd25JbnN0YW5jZU9mLmN0b3JcbiAgICAgKiAgLSBgZW5gIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5q+U6LyD5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIG93bkluc3RhbmNlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gb3duSW5zdGFuY2VPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgb3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGluc3RhbmNlIGhhcyBub3QgYHN0cmljdGx5YCBlcXVhbCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3IuXG4gICAgICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OCkuaMgeOBpOOCpOODs+OCueOCv+ODs+OCueOBp+OBquOBhOOBk+OBqOOCkuaknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIG5vdE93bkluc3RhbmNlT2YuY3RvclxuICAgICAqICAtIGBlbmAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDmr5TovIPlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gbm90T3duSW5zdGFuY2VPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBub3RPd25JbnN0YW5jZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBub3RPd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaGFzIHNwZWNpZmllZCBwcm9wZXJ0eS5cbiAgICAgKiBAamEg5oyH5a6a44OX44Ot44OR44OG44Kj44KS5oyB44Gj44Gm44GE44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkucHJvcFxuICAgICAqICAtIGBlbmAgc3BlY2lmaWVkIHByb3BlcnR5XG4gICAgICogIC0gYGphYCDlr77osaHjga7jg5fjg63jg5Hjg4bjgqNcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGhhc1Byb3BlcnR5OiAoeDogdW5rbm93biwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaGFzIG93biBzcGVjaWZpZWQgcHJvcGVydHkuXG4gICAgICogQGphIOaMh+WumuODl+ODreODkeODhuOCo+OCkuWFpeWKm+WApOiHqui6q+aMgeOBo+OBpuOBhOOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGhhc093blByb3BlcnR5LnByb3BcbiAgICAgKiAgLSBgZW5gIHNwZWNpZmllZCBwcm9wZXJ0eVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44OX44Ot44OR44OG44KjXG4gICAgICogQHBhcmFtIGhhc093blByb3BlcnR5LnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGhhc093blByb3BlcnR5Lm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBoYXNPd25Qcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xufVxuXG4vKipcbiAqIEBlbiBMaXN0IG9mIG1ldGhvZCBmb3IgdHlwZSB2ZXJpZnkuXG4gKiBAamEg5Z6L5qSc6Ki844GM5o+Q5L6b44GZ44KL44Oh44K944OD44OJ5LiA6KanXG4gKi9cbmV4cG9ydCB0eXBlIFZlcmlmeU1ldGhvZCA9IGtleW9mIFZlcmlmaWVyO1xuXG4vKipcbiAqIEBlbiBDb25jcmV0ZSB0eXBlIHZlcmlmaWVyIG9iamVjdC5cbiAqIEBqYSDlnovmpJzoqLzlrp/oo4Xjgqrjg5bjgrjjgqfjgq/jg4hcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuY29uc3QgX3ZlcmlmaWVyOiBWZXJpZmllciA9IHtcbiAgICBub3ROdWxsaXNoOiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCA9PSB4KSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhIHZhbGlkIHZhbHVlLmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB0eXBlT2Y6ICh0eXBlOiBUeXBlS2V5cywgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHggIT09IHR5cGUpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUeXBlIG9mICR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgJHt0eXBlfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgYXJyYXk6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICghaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYW4gQXJyYXkuYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGl0ZXJhYmxlOiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAoIShTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KHgpKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYW4gaXRlcmFibGUgb2JqZWN0LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBpbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKCEoeCBpbnN0YW5jZW9mIGN0b3IpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhbiBpbnN0YW5jZSBvZiAke2N0b3IubmFtZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIG93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCA9PSB4IHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSAhPT0gT2JqZWN0KGN0b3IucHJvdG90eXBlKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFRoZSBvYmplY3QgaXMgbm90IG93biBpbnN0YW5jZSBvZiAke2N0b3IubmFtZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIG5vdE93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCAhPSB4ICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSA9PT0gT2JqZWN0KGN0b3IucHJvdG90eXBlKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFRoZSBvYmplY3QgaXMgb3duIGluc3RhbmNlIG9mICR7Y3Rvci5uYW1lfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaGFzUHJvcGVydHk6ICh4OiB1bmtub3duLCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCA9PSB4IHx8ICEocHJvcCBpbiAoeCBhcyBvYmplY3QpKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFRoZSBvYmplY3QgZG9lcyBub3QgaGF2ZSBwcm9wZXJ0eSAke1N0cmluZyhwcm9wKX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGhhc093blByb3BlcnR5OiAoeDogdW5rbm93biwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHgsIHByb3ApKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBkb2VzIG5vdCBoYXZlIG93biBwcm9wZXJ0eSAke1N0cmluZyhwcm9wKX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogQGVuIFZlcmlmeSBtZXRob2QuXG4gKiBAamEg5qSc6Ki844Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIG1ldGhvZFxuICogIC0gYGVuYCBtZXRob2QgbmFtZSB3aGljaCB1c2luZ1xuICogIC0gYGphYCDkvb/nlKjjgZnjgovjg6Hjgr3jg4Pjg4nlkI1cbiAqIEBwYXJhbSBhcmdzXG4gKiAgLSBgZW5gIGFyZ3VtZW50cyB3aGljaCBjb3JyZXNwb25kcyB0byB0aGUgbWV0aG9kIG5hbWVcbiAqICAtIGBqYWAg44Oh44K944OD44OJ5ZCN44Gr5a++5b+c44GZ44KL5byV5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2ZXJpZnk8VE1ldGhvZCBleHRlbmRzIFZlcmlmeU1ldGhvZD4obWV0aG9kOiBUTWV0aG9kLCAuLi5hcmdzOiBQYXJhbWV0ZXJzPFZlcmlmaWVyW1RNZXRob2RdPik6IHZvaWQgfCBuZXZlciB7XG4gICAgKF92ZXJpZmllclttZXRob2RdIGFzIFVua25vd25GdW5jdGlvbikoLi4uYXJncyk7XG59XG5cbmV4cG9ydCB7IHZlcmlmeSBhcyBkZWZhdWx0IH07XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bk9iamVjdCxcbiAgICB0eXBlIFR5cGVkQXJyYXksXG4gICAgdHlwZSBUeXBlZEFycmF5Q29uc3RydWN0b3IsXG4gICAgaXNGdW5jdGlvbixcbiAgICBpc0FycmF5LFxuICAgIGlzT2JqZWN0LFxuICAgIGlzSXRlcmFibGUsXG4gICAgaXNUeXBlZEFycmF5LFxuICAgIHNhbWVDbGFzcyxcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBkZWVwRXF1YWwoKSAqL1xuZnVuY3Rpb24gYXJyYXlFcXVhbChsaHM6IHVua25vd25bXSwgcmhzOiB1bmtub3duW10pOiBib29sZWFuIHtcbiAgICBjb25zdCBsZW4gPSBsaHMubGVuZ3RoO1xuICAgIGlmIChsZW4gIT09IHJocy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICghZGVlcEVxdWFsKGxoc1tpXSwgcmhzW2ldKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgZGVlcEVxdWFsKCkgKi9cbmZ1bmN0aW9uIGJ1ZmZlckVxdWFsKGxoczogU2hhcmVkQXJyYXlCdWZmZXIgfCBBcnJheUJ1ZmZlciwgcmhzOiBTaGFyZWRBcnJheUJ1ZmZlciB8IEFycmF5QnVmZmVyKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc2l6ZSA9IGxocy5ieXRlTGVuZ3RoO1xuICAgIGlmIChzaXplICE9PSByaHMuYnl0ZUxlbmd0aCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGxldCBwb3MgPSAwO1xuICAgIGlmIChzaXplIC0gcG9zID49IDgpIHtcbiAgICAgICAgY29uc3QgbGVuID0gc2l6ZSA+Pj4gMztcbiAgICAgICAgY29uc3QgZjY0TCA9IG5ldyBGbG9hdDY0QXJyYXkobGhzLCAwLCBsZW4pO1xuICAgICAgICBjb25zdCBmNjRSID0gbmV3IEZsb2F0NjRBcnJheShyaHMsIDAsIGxlbik7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGlmICghT2JqZWN0LmlzKGY2NExbaV0sIGY2NFJbaV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHBvcyA9IGxlbiA8PCAzO1xuICAgIH1cbiAgICBpZiAocG9zID09PSBzaXplKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBjb25zdCBMID0gbmV3IERhdGFWaWV3KGxocyk7XG4gICAgY29uc3QgUiA9IG5ldyBEYXRhVmlldyhyaHMpO1xuICAgIGlmIChzaXplIC0gcG9zID49IDQpIHtcbiAgICAgICAgaWYgKCFPYmplY3QuaXMoTC5nZXRVaW50MzIocG9zKSwgUi5nZXRVaW50MzIocG9zKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwb3MgKz0gNDtcbiAgICB9XG4gICAgaWYgKHNpemUgLSBwb3MgPj0gMikge1xuICAgICAgICBpZiAoIU9iamVjdC5pcyhMLmdldFVpbnQxNihwb3MpLCBSLmdldFVpbnQxNihwb3MpKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHBvcyArPSAyO1xuICAgIH1cbiAgICBpZiAoc2l6ZSA+IHBvcykge1xuICAgICAgICBpZiAoIU9iamVjdC5pcyhMLmdldFVpbnQ4KHBvcyksIFIuZ2V0VWludDgocG9zKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwb3MgKz0gMTtcbiAgICB9XG4gICAgcmV0dXJuIHBvcyA9PT0gc2l6ZTtcbn1cblxuLyoqXG4gKiBAZW4gU2V0IGJ5IHNwZWNpZnlpbmcga2V5IGFuZCB2YWx1ZSBmb3IgdGhlIG9iamVjdC4gKHByb3RvdHlwZSBwb2xsdXRpb24gY291bnRlcm1lYXN1cmUpXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44GrIGtleSwgdmFsdWUg44KS5oyH5a6a44GX44Gm6Kit5a6aICjjg5fjg63jg4jjgr/jgqTjg5fmsZrmn5Plr77nrZYpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NpZ25WYWx1ZSh0YXJnZXQ6IFVua25vd25PYmplY3QsIGtleTogc3RyaW5nIHwgbnVtYmVyIHwgc3ltYm9sLCB2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIGlmICgnX19wcm90b19fJyAhPT0ga2V5ICYmICdjb25zdHJ1Y3RvcicgIT09IGtleSkge1xuICAgICAgICB0YXJnZXRba2V5XSA9IHZhbHVlO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gUGVyZm9ybXMgYSBkZWVwIGNvbXBhcmlzb24gYmV0d2VlbiB0d28gdmFsdWVzIHRvIGRldGVybWluZSBpZiB0aGV5IGFyZSBlcXVpdmFsZW50LlxuICogQGphIDLlgKTjga7oqbPntLDmr5TovIPjgpLjgZcsIOetieOBl+OBhOOBi+OBqeOBhuOBi+WIpOWumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVlcEVxdWFsKGxoczogdW5rbm93biwgcmhzOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgaWYgKGxocyA9PT0gcmhzKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXNGdW5jdGlvbihsaHMpICYmIGlzRnVuY3Rpb24ocmhzKSkge1xuICAgICAgICByZXR1cm4gbGhzLmxlbmd0aCA9PT0gcmhzLmxlbmd0aCAmJiBsaHMubmFtZSA9PT0gcmhzLm5hbWU7XG4gICAgfVxuICAgIGlmICghaXNPYmplY3QobGhzKSB8fCAhaXNPYmplY3QocmhzKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHsgLy8gUHJpbWl0aXZlIFdyYXBwZXIgT2JqZWN0cyAvIERhdGVcbiAgICAgICAgY29uc3QgdmFsdWVMID0gbGhzLnZhbHVlT2YoKTtcbiAgICAgICAgY29uc3QgdmFsdWVSID0gcmhzLnZhbHVlT2YoKTtcbiAgICAgICAgaWYgKGxocyAhPT0gdmFsdWVMIHx8IHJocyAhPT0gdmFsdWVSKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVMID09PSB2YWx1ZVI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBSZWdFeHBcbiAgICAgICAgY29uc3QgaXNSZWdFeHBMID0gbGhzIGluc3RhbmNlb2YgUmVnRXhwO1xuICAgICAgICBjb25zdCBpc1JlZ0V4cFIgPSByaHMgaW5zdGFuY2VvZiBSZWdFeHA7XG4gICAgICAgIGlmIChpc1JlZ0V4cEwgfHwgaXNSZWdFeHBSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNSZWdFeHBMID09PSBpc1JlZ0V4cFIgJiYgU3RyaW5nKGxocykgPT09IFN0cmluZyhyaHMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gQXJyYXlcbiAgICAgICAgY29uc3QgaXNBcnJheUwgPSBpc0FycmF5KGxocyk7XG4gICAgICAgIGNvbnN0IGlzQXJyYXlSID0gaXNBcnJheShyaHMpO1xuICAgICAgICBpZiAoaXNBcnJheUwgfHwgaXNBcnJheVIpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0FycmF5TCA9PT0gaXNBcnJheVIgJiYgYXJyYXlFcXVhbChsaHMgYXMgdW5rbm93bltdLCByaHMgYXMgdW5rbm93bltdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIEFycmF5QnVmZmVyXG4gICAgICAgIGNvbnN0IGlzQnVmZmVyTCA9IGxocyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyO1xuICAgICAgICBjb25zdCBpc0J1ZmZlclIgPSByaHMgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcjtcbiAgICAgICAgaWYgKGlzQnVmZmVyTCB8fCBpc0J1ZmZlclIpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0J1ZmZlckwgPT09IGlzQnVmZmVyUiAmJiBidWZmZXJFcXVhbChsaHMgYXMgQXJyYXlCdWZmZXIsIHJocyBhcyBBcnJheUJ1ZmZlcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBBcnJheUJ1ZmZlclZpZXdcbiAgICAgICAgY29uc3QgaXNCdWZmZXJWaWV3TCA9IEFycmF5QnVmZmVyLmlzVmlldyhsaHMpO1xuICAgICAgICBjb25zdCBpc0J1ZmZlclZpZXdSID0gQXJyYXlCdWZmZXIuaXNWaWV3KHJocyk7XG4gICAgICAgIGlmIChpc0J1ZmZlclZpZXdMIHx8IGlzQnVmZmVyVmlld1IpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0J1ZmZlclZpZXdMID09PSBpc0J1ZmZlclZpZXdSICYmIHNhbWVDbGFzcyhsaHMsIHJocylcbiAgICAgICAgICAgICAgICAmJiBidWZmZXJFcXVhbCgobGhzIGFzIEFycmF5QnVmZmVyVmlldykuYnVmZmVyLCAocmhzIGFzIEFycmF5QnVmZmVyVmlldykuYnVmZmVyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIG90aGVyIEl0ZXJhYmxlXG4gICAgICAgIGNvbnN0IGlzSXRlcmFibGVMID0gaXNJdGVyYWJsZShsaHMpO1xuICAgICAgICBjb25zdCBpc0l0ZXJhYmxlUiA9IGlzSXRlcmFibGUocmhzKTtcbiAgICAgICAgaWYgKGlzSXRlcmFibGVMIHx8IGlzSXRlcmFibGVSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNJdGVyYWJsZUwgPT09IGlzSXRlcmFibGVSICYmIGFycmF5RXF1YWwoWy4uLihsaHMgYXMgdW5rbm93bltdKV0sIFsuLi4ocmhzIGFzIHVua25vd25bXSldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoc2FtZUNsYXNzKGxocywgcmhzKSkge1xuICAgICAgICBjb25zdCBrZXlzTCA9IG5ldyBTZXQoT2JqZWN0LmtleXMobGhzKSk7XG4gICAgICAgIGNvbnN0IGtleXNSID0gbmV3IFNldChPYmplY3Qua2V5cyhyaHMpKTtcbiAgICAgICAgaWYgKGtleXNMLnNpemUgIT09IGtleXNSLnNpemUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzTCkge1xuICAgICAgICAgICAgaWYgKCFrZXlzUi5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzTCkge1xuICAgICAgICAgICAgaWYgKCFkZWVwRXF1YWwoKGxocyBhcyBVbmtub3duT2JqZWN0KVtrZXldLCAocmhzIGFzIFVua25vd25PYmplY3QpW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gbGhzKSB7XG4gICAgICAgICAgICBpZiAoIShrZXkgaW4gcmhzKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBrZXlzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIHJocykge1xuICAgICAgICAgICAgaWYgKCEoa2V5IGluIGxocykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBrZXlzLmFkZChrZXkpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGtleXMpIHtcbiAgICAgICAgICAgIGlmICghZGVlcEVxdWFsKChsaHMgYXMgVW5rbm93bk9iamVjdClba2V5XSwgKHJocyBhcyBVbmtub3duT2JqZWN0KVtrZXldKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgY2xvbmUgUmVnRXhwICovXG5mdW5jdGlvbiBjbG9uZVJlZ0V4cChyZWdleHA6IFJlZ0V4cCk6IFJlZ0V4cCB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IFJlZ0V4cChyZWdleHAuc291cmNlLCByZWdleHAuZmxhZ3MpO1xuICAgIHJlc3VsdC5sYXN0SW5kZXggPSByZWdleHAubGFzdEluZGV4O1xuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgY2xvbmUgQXJyYXlCdWZmZXIgKi9cbmZ1bmN0aW9uIGNsb25lQXJyYXlCdWZmZXIoYXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyTGlrZSk6IEFycmF5QnVmZmVyIHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgQXJyYXlCdWZmZXIoYXJyYXlCdWZmZXIuYnl0ZUxlbmd0aCk7XG4gICAgbmV3IFVpbnQ4QXJyYXkocmVzdWx0KS5zZXQobmV3IFVpbnQ4QXJyYXkoYXJyYXlCdWZmZXIpKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKiogQGludGVybmFsIGNsb25lIERhdGFWaWV3ICovXG5mdW5jdGlvbiBjbG9uZURhdGFWaWV3KGRhdGFWaWV3OiBEYXRhVmlldyk6IERhdGFWaWV3IHtcbiAgICBjb25zdCBidWZmZXIgPSBjbG9uZUFycmF5QnVmZmVyKGRhdGFWaWV3LmJ1ZmZlcik7XG4gICAgcmV0dXJuIG5ldyBEYXRhVmlldyhidWZmZXIsIGRhdGFWaWV3LmJ5dGVPZmZzZXQsIGRhdGFWaWV3LmJ5dGVMZW5ndGgpO1xufVxuXG4vKiogQGludGVybmFsIGNsb25lIFR5cGVkQXJyYXkgKi9cbmZ1bmN0aW9uIGNsb25lVHlwZWRBcnJheTxUIGV4dGVuZHMgVHlwZWRBcnJheT4odHlwZWRBcnJheTogVCk6IFQge1xuICAgIGNvbnN0IGJ1ZmZlciA9IGNsb25lQXJyYXlCdWZmZXIodHlwZWRBcnJheS5idWZmZXIpO1xuICAgIHJldHVybiBuZXcgKHR5cGVkQXJyYXkuY29uc3RydWN0b3IgYXMgVHlwZWRBcnJheUNvbnN0cnVjdG9yKShidWZmZXIsIHR5cGVkQXJyYXkuYnl0ZU9mZnNldCwgdHlwZWRBcnJheS5sZW5ndGgpIGFzIFQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgY2hlY2sgbmVjZXNzYXJ5IHRvIHVwZGF0ZSAqL1xuZnVuY3Rpb24gbmVlZFVwZGF0ZShvbGRWYWx1ZTogdW5rbm93biwgbmV3VmFsdWU6IHVua25vd24sIGV4Y2VwdFVuZGVmaW5lZDogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgIGlmIChvbGRWYWx1ZSAhPT0gbmV3VmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIChleGNlcHRVbmRlZmluZWQgJiYgdW5kZWZpbmVkID09PSBvbGRWYWx1ZSk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIG1lcmdlIEFycmF5ICovXG5mdW5jdGlvbiBtZXJnZUFycmF5KHRhcmdldDogdW5rbm93bltdLCBzb3VyY2U6IHVua25vd25bXSk6IHVua25vd25bXSB7XG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHNvdXJjZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtpXTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBtZXJnZShvbGRWYWx1ZSwgc291cmNlW2ldKTtcbiAgICAgICAgIW5lZWRVcGRhdGUob2xkVmFsdWUsIG5ld1ZhbHVlLCBmYWxzZSkgfHwgKHRhcmdldFtpXSA9IG5ld1ZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuLyoqIEBpbnRlcm5hbCBtZXJnZSBTZXQgKi9cbmZ1bmN0aW9uIG1lcmdlU2V0KHRhcmdldDogU2V0PHVua25vd24+LCBzb3VyY2U6IFNldDx1bmtub3duPik6IFNldDx1bmtub3duPiB7XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHNvdXJjZSkge1xuICAgICAgICB0YXJnZXQuaGFzKGl0ZW0pIHx8IHRhcmdldC5hZGQobWVyZ2UodW5kZWZpbmVkLCBpdGVtKSk7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgbWVyZ2UgTWFwICovXG5mdW5jdGlvbiBtZXJnZU1hcCh0YXJnZXQ6IE1hcDx1bmtub3duLCB1bmtub3duPiwgc291cmNlOiBNYXA8dW5rbm93biwgdW5rbm93bj4pOiBNYXA8dW5rbm93biwgdW5rbm93bj4ge1xuICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIHNvdXJjZSkge1xuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldC5nZXQoayk7XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWVyZ2Uob2xkVmFsdWUsIHYpO1xuICAgICAgICAhbmVlZFVwZGF0ZShvbGRWYWx1ZSwgbmV3VmFsdWUsIGZhbHNlKSB8fCB0YXJnZXQuc2V0KGssIG5ld1ZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuLyoqIEBpbnRlcm5hbCBtZXJnZSBvYmplY3QgcHJvcGVydHkgKi9cbmZ1bmN0aW9uIG1lcmdlT2JqZWN0UHJvcGVydHkodGFyZ2V0OiBVbmtub3duT2JqZWN0LCBzb3VyY2U6IFVua25vd25PYmplY3QsIGtleTogc3RyaW5nIHwgbnVtYmVyIHwgc3ltYm9sKTogdm9pZCB7XG4gICAgaWYgKCdfX3Byb3RvX18nICE9PSBrZXkgJiYgJ2NvbnN0cnVjdG9yJyAhPT0ga2V5KSB7XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0W2tleV07XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWVyZ2Uob2xkVmFsdWUsIHNvdXJjZVtrZXldKTtcbiAgICAgICAgIW5lZWRVcGRhdGUob2xkVmFsdWUsIG5ld1ZhbHVlLCB0cnVlKSB8fCAodGFyZ2V0W2tleV0gPSBuZXdWYWx1ZSk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgZGVlcE1lcmdlKCkgKi9cbmZ1bmN0aW9uIG1lcmdlKHRhcmdldDogdW5rbm93biwgc291cmNlOiB1bmtub3duKTogdW5rbm93biB7XG4gICAgaWYgKHVuZGVmaW5lZCA9PT0gc291cmNlIHx8IHRhcmdldCA9PT0gc291cmNlKSB7XG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuICAgIGlmICghaXNPYmplY3Qoc291cmNlKSkge1xuICAgICAgICByZXR1cm4gc291cmNlO1xuICAgIH1cbiAgICAvLyBQcmltaXRpdmUgV3JhcHBlciBPYmplY3RzIC8gRGF0ZVxuICAgIGlmIChzb3VyY2UudmFsdWVPZigpICE9PSBzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIGRlZXBFcXVhbCh0YXJnZXQsIHNvdXJjZSkgPyB0YXJnZXQgOiBuZXcgKHNvdXJjZS5jb25zdHJ1Y3RvciBhcyBPYmplY3RDb25zdHJ1Y3Rvcikoc291cmNlLnZhbHVlT2YoKSk7XG4gICAgfVxuICAgIC8vIFJlZ0V4cFxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgcmV0dXJuIGRlZXBFcXVhbCh0YXJnZXQsIHNvdXJjZSkgPyB0YXJnZXQgOiBjbG9uZVJlZ0V4cChzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBBcnJheUJ1ZmZlclxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IGNsb25lQXJyYXlCdWZmZXIoc291cmNlKTtcbiAgICB9XG4gICAgLy8gQXJyYXlCdWZmZXJWaWV3XG4gICAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBkZWVwRXF1YWwodGFyZ2V0LCBzb3VyY2UpID8gdGFyZ2V0IDogaXNUeXBlZEFycmF5KHNvdXJjZSkgPyBjbG9uZVR5cGVkQXJyYXkoc291cmNlKSA6IGNsb25lRGF0YVZpZXcoc291cmNlIGFzIERhdGFWaWV3KTtcbiAgICB9XG4gICAgLy8gQXJyYXlcbiAgICBpZiAoQXJyYXkuaXNBcnJheShzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBtZXJnZUFycmF5KGlzQXJyYXkodGFyZ2V0KSA/IHRhcmdldCA6IFtdLCBzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBTZXRcbiAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgU2V0KSB7XG4gICAgICAgIHJldHVybiBtZXJnZVNldCh0YXJnZXQgaW5zdGFuY2VvZiBTZXQgPyB0YXJnZXQgOiBuZXcgU2V0KCksIHNvdXJjZSk7XG4gICAgfVxuICAgIC8vIE1hcFxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgICAgcmV0dXJuIG1lcmdlTWFwKHRhcmdldCBpbnN0YW5jZW9mIE1hcCA/IHRhcmdldCA6IG5ldyBNYXAoKSwgc291cmNlKTtcbiAgICB9XG5cbiAgICBjb25zdCBvYmogPSBpc09iamVjdCh0YXJnZXQpID8gdGFyZ2V0IDoge307XG4gICAgaWYgKHNhbWVDbGFzcyh0YXJnZXQsIHNvdXJjZSkpIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc291cmNlKSkge1xuICAgICAgICAgICAgbWVyZ2VPYmplY3RQcm9wZXJ0eShvYmogYXMgVW5rbm93bk9iamVjdCwgc291cmNlIGFzIFVua25vd25PYmplY3QsIGtleSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIG1lcmdlT2JqZWN0UHJvcGVydHkob2JqIGFzIFVua25vd25PYmplY3QsIHNvdXJjZSBhcyBVbmtub3duT2JqZWN0LCBrZXkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogQGVuIFJlY3Vyc2l2ZWx5IG1lcmdlcyBvd24gYW5kIGluaGVyaXRlZCBlbnVtZXJhYmxlIHN0cmluZyBrZXllZCBwcm9wZXJ0aWVzIG9mIHNvdXJjZSBvYmplY3RzIGludG8gdGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7lho3luLDnmoTjg57jg7zjgrjjgpLlrp/ooYxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBNZXJnZTxULCBTMSwgUzIsIFMzLCBTNCwgUzUsIFM2LCBTNywgUzgsIFM5PihcbiAgICB0YXJnZXQ6IFQsXG4gICAgLi4uc291cmNlczogW1MxLCBTMj8sIFMzPywgUzQ/LCBTNT8sIFM2PywgUzc/LCBTOD8sIFM5PywgLi4udW5rbm93bltdXVxuKTogVCAmIFMxICYgUzIgJiBTMyAmIFM0ICYgUzUgJiBTNiAmIFM3ICYgUzggJiBTOTtcbmV4cG9ydCBmdW5jdGlvbiBkZWVwTWVyZ2U8WD4odGFyZ2V0OiB1bmtub3duLCAuLi5zb3VyY2VzOiB1bmtub3duW10pOiBYO1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBNZXJnZSh0YXJnZXQ6IHVua25vd24sIC4uLnNvdXJjZXM6IHVua25vd25bXSk6IHVua25vd24ge1xuICAgIGxldCByZXN1bHQgPSB0YXJnZXQ7XG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2Ygc291cmNlcykge1xuICAgICAgICByZXN1bHQgPSBtZXJnZShyZXN1bHQsIHNvdXJjZSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgZGVlcCBjb3B5IGluc3RhbmNlIG9mIHNvdXJjZSBvYmplY3QuXG4gKiBAamEg44OH44Kj44O844OX44Kz44OU44O844Kq44OW44K444Kn44Kv44OI44Gu55Sf5oiQXG4gKlxuICogQHNlZSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvc3RydWN0dXJlZENsb25lXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWVwQ29weTxUPihzcmM6IFQpOiBUIHtcbiAgICByZXR1cm4gZGVlcE1lcmdlKHVuZGVmaW5lZCwgc3JjKTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQgdHlwZSB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIFVua25vd25PYmplY3QsXG4gICAgQWNjZXNzaWJsZSxcbiAgICBOdWxsaXNoLFxuICAgIFR5cGUsXG4gICAgQ2xhc3MsXG4gICAgQ29uc3RydWN0b3IsXG59IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIEBlbiBNaXhpbiBjbGFzcydzIGJhc2UgaW50ZXJmYWNlLlxuICogQGphIE1peGluIOOCr+ODqeOCueOBruWfuuW6leOCpOODs+OCv+ODvOODleOCp+OCpOOCueWumue+qVxuICovXG5leHBvcnQgZGVjbGFyZSBjbGFzcyBNaXhpbkNsYXNzIHtcbiAgICAvKipcbiAgICAgKiBAZW4gY2FsbCBtaXhpbiBzb3VyY2UgY2xhc3MncyBgc3VwZXIoKWAuIDxicj5cbiAgICAgKiAgICAgVGhpcyBtZXRob2Qgc2hvdWxkIGJlIGNhbGxlZCBmcm9tIGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSBNaXhpbiDjgq/jg6njgrnjga7ln7rlupXjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqkgPGJyPlxuICAgICAqICAgICDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jgYvjgonlkbzjgbbjgZPjgajjgpLmg7PlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzcmNDbGFzc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIHRhcmdldCBjbGFzcyBuYW1lLiBleCkgZnJvbSBTMSBhdmFpbGFibGVcbiAgICAgKiAgLSBgamFgIOOCs+ODs+OCueODiOODqeOCr+ODiOOBmeOCi+OCr+ODqeOCueWQjeOCkuaMh+WumiBleCkgUzEg44GL44KJ5oyH5a6a5Y+v6IO9XG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBwYXJhbWV0ZXJzXG4gICAgICogIC0gYGphYCDjgrPjg7Pjgrnjg4jjg6njgq/jg4jjgavkvb/nlKjjgZnjgovlvJXmlbBcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgc3VwZXI8VCBleHRlbmRzIENsYXNzPihzcmNDbGFzczogVCwgLi4uYXJnczogQ29uc3RydWN0b3JQYXJhbWV0ZXJzPFQ+KTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgaW5wdXQgY2xhc3MgaXMgbWl4aW5lZCAoZXhjbHVkaW5nIG93biBjbGFzcykuXG4gICAgICogQGphIOaMh+WumuOCr+ODqeOCueOBjCBNaXhpbiDjgZXjgozjgabjgYTjgovjgYvnorroqo0gKOiHqui6q+OBruOCr+ODqeOCueOBr+WQq+OBvuOCjOOBquOBhClcbiAgICAgKlxuICAgICAqIEBwYXJhbSBtaXhlZENsYXNzXG4gICAgICogIC0gYGVuYCBzZXQgdGFyZ2V0IGNsYXNzIGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDlr77osaHjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/jgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgaXNNaXhlZFdpdGg8VCBleHRlbmRzIG9iamVjdD4obWl4ZWRDbGFzczogQ29uc3RydWN0b3I8VD4pOiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBlbiBNaXhlZCBzdWIgY2xhc3MgY29uc3RydWN0b3IgZGVmaW5pdGlvbnMuXG4gKiBAamEg5ZCI5oiQ44GX44Gf44K144OW44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWl4aW5Db25zdHJ1Y3RvcjxCIGV4dGVuZHMgQ2xhc3MsIFUgZXh0ZW5kcyBvYmplY3Q+IGV4dGVuZHMgVHlwZTxVPiB7XG4gICAgLyoqXG4gICAgICogQGVuIGNvbnN0cnVjdG9yXG4gICAgICogQGphIOOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGJhc2UgY2xhc3MgYXJndW1lbnRzXG4gICAgICogIC0gYGphYCDln7rlupXjgq/jg6njgrnjgavmjIflrprjgZfjgZ/lvJXmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdW5pb24gdHlwZSBvZiBjbGFzc2VzIHdoZW4gY2FsbGluZyB7QGxpbmsgbWl4aW5zfSgpXG4gICAgICogIC0gYGphYCB7QGxpbmsgbWl4aW5zfSgpIOOBq+a4oeOBl+OBn+OCr+ODqeOCueOBrumbhuWQiFxuICAgICAqL1xuICAgIG5ldyguLi5hcmdzOiBDb25zdHJ1Y3RvclBhcmFtZXRlcnM8Qj4pOiBVO1xufVxuXG4vKipcbiAqIEBlbiBEZWZpbml0aW9uIG9mIHtAbGluayBzZXRNaXhDbGFzc0F0dHJpYnV0ZX0gZnVuY3Rpb24ncyBhcmd1bWVudHMuXG4gKiBAamEge0BsaW5rIHNldE1peENsYXNzQXR0cmlidXRlfSDjga7lj5bjgorjgYbjgovlvJXmlbDlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNaXhDbGFzc0F0dHJpYnV0ZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFN1cHByZXNzIHByb3ZpZGluZyBjb25zdHJ1Y3Rvci10cmFwIGZvciB0aGUgbWl4aW4gc291cmNlIGNsYXNzLiBJbiB0aGlzIGNhc2UsIGBpc01peGVkV2l0aGAsIGBpbnN0YW5jZW9mYCBhbHNvIGJlY29tZXMgaW52YWxpZC4gKGZvciBpbXByb3ZpbmcgcGVyZm9ybWFuY2UpXG4gICAgICogQGphIE1peGluIFNvdXJjZSDjgq/jg6njgrnjgavlr77jgZfjgaYsIOOCs+ODs+OCueODiOODqeOCr+OCv+ODiOODqeODg+ODl+OCkuaKkeatoi4g44GT44KM44KS5oyH5a6a44GX44Gf5aC05ZCILCBgaXNNaXhlZFdpdGhgLCBgaW5zdGFuY2VvZmAg44KC54Sh5Yq544Gr44Gq44KLLiAo44OR44OV44Kp44O844Oe44Oz44K55pS55ZaEKVxuICAgICAqL1xuICAgIHByb3RvRXh0ZW5kc09ubHk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0dXAgW1N5bWJvbC5oYXNJbnN0YW5jZV0gcHJvcGVydHkuIDxicj5cbiAgICAgKiAgICAgVGhlIGNsYXNzIGRlc2lnbmF0ZWQgYXMgYSBzb3VyY2Ugb2Yge0BsaW5rIG1peGluc30oKSBoYXMgW1N5bWJvbC5oYXNJbnN0YW5jZV0gcHJvcGVydHkgaW1wbGljaXRseS4gPGJyPlxuICAgICAqICAgICBJdCdzIHVzZWQgdG8gYXZvaWQgYmVjb21pbmcgdGhlIGJlaGF2aW9yIGBpbnN0YW5jZW9mYCBkb2Vzbid0IGludGVuZCB3aGVuIHRoZSBjbGFzcyBpcyBleHRlbmRlZCBmcm9tIHRoZSBtaXhpbmVkIGNsYXNzIHRoZSBvdGhlciBwbGFjZS5cbiAgICAgKiBAamEgW1N5bWJvbC5oYXNJbnN0YW5jZV0g44OX44Ot44OR44OG44Kj6Kit5a6aPGJyPlxuICAgICAqICAgICB7QGxpbmsgbWl4aW5zfSgpIOOBruOCveODvOOCueOBq+aMh+WumuOBleOCjOOBn+OCr+ODqeOCueOBryBbU3ltYm9sLmhhc0luc3RhbmNlXSDjgpLmmpfpu5nnmoTjgavlgpnjgYjjgovjgZ/jgoE8YnI+XG4gICAgICogICAgIOOBneOBruOCr+ODqeOCueOBjOS7luOBp+e2meaJv+OBleOCjOOBpuOBhOOCi+WgtOWQiCBgaW5zdGFuY2VvZmAg44GM5oSP5Zuz44GX44Gq44GE5oyv44KL6Iie44GE44Go44Gq44KL44Gu44KS6YG/44GR44KL44Gf44KB44Gr5L2/55So44GZ44KLLlxuICAgICAqL1xuICAgIGluc3RhbmNlT2Y6ICgoaW5zdDogb2JqZWN0KSA9PiBib29sZWFuKSB8IE51bGxpc2g7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9vYmpQcm90b3R5cGUgICAgID0gT2JqZWN0LnByb3RvdHlwZTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2luc3RhbmNlT2YgICAgICAgPSBGdW5jdGlvbi5wcm90b3R5cGVbU3ltYm9sLmhhc0luc3RhbmNlXTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX292ZXJyaWRlICAgICAgICAgPSBTeW1ib2woJ292ZXJyaWRlJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9pc0luaGVyaXRlZCAgICAgID0gU3ltYm9sKCdpcy1pbmhlcml0ZWQnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NvbnN0cnVjdG9ycyAgICAgPSBTeW1ib2woJ2NvbnN0cnVjdG9ycycpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY2xhc3NCYXNlICAgICAgICA9IFN5bWJvbCgnY2xhc3MtYmFzZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY2xhc3NTb3VyY2VzICAgICA9IFN5bWJvbCgnY2xhc3Mtc291cmNlcycpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvdG9FeHRlbmRzT25seSA9IFN5bWJvbCgncHJvdG8tZXh0ZW5kcy1vbmx5Jyk7XG5cbi8qKiBAaW50ZXJuYWwgY29weSBwcm9wZXJ0aWVzIGNvcmUgKi9cbmZ1bmN0aW9uIHJlZmxlY3RQcm9wZXJ0aWVzKHRhcmdldDogVW5rbm93bk9iamVjdCwgc291cmNlOiBvYmplY3QsIGtleTogc3RyaW5nIHwgc3ltYm9sKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGFyZ2V0W2tleV0pIHtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzb3VyY2UsIGtleSkgYXMgUHJvcGVydHlEZWNvcmF0b3IpO1xuICAgICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIG5vb3BcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgb2JqZWN0IHByb3BlcnRpZXMgY29weSBtZXRob2QgKi9cbmZ1bmN0aW9uIGNvcHlQcm9wZXJ0aWVzKHRhcmdldDogb2JqZWN0LCBzb3VyY2U6IG9iamVjdCk6IHZvaWQge1xuICAgIHNvdXJjZSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhzb3VyY2UpXG4gICAgICAgIC5maWx0ZXIoa2V5ID0+ICEvKHByb3RvdHlwZXxuYW1lfGNvbnN0cnVjdG9yKS8udGVzdChrZXkpKVxuICAgICAgICAuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgcmVmbGVjdFByb3BlcnRpZXModGFyZ2V0IGFzIFVua25vd25PYmplY3QsIHNvdXJjZSwga2V5KTtcbiAgICAgICAgfSk7XG4gICAgc291cmNlICYmIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoc291cmNlKVxuICAgICAgICAuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgcmVmbGVjdFByb3BlcnRpZXModGFyZ2V0IGFzIFVua25vd25PYmplY3QsIHNvdXJjZSwga2V5KTtcbiAgICAgICAgfSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzZXRNaXhDbGFzc0F0dHJpYnV0ZSh0YXJnZXQsICdpbnN0YW5jZU9mJykgKi9cbmZ1bmN0aW9uIHNldEluc3RhbmNlT2Y8VCBleHRlbmRzIG9iamVjdD4odGFyZ2V0OiBDb25zdHJ1Y3RvcjxUPiwgbWV0aG9kOiAoKGluc3Q6IG9iamVjdCkgPT4gYm9vbGVhbikgfCBOdWxsaXNoKTogdm9pZCB7XG4gICAgY29uc3QgYmVoYXZpb3VyID0gbWV0aG9kID8/IChudWxsID09PSBtZXRob2QgPyB1bmRlZmluZWQgOiAoKGk6IG9iamVjdCkgPT4gT2JqZWN0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mLmNhbGwodGFyZ2V0LnByb3RvdHlwZSwgaSkpKTtcbiAgICBjb25zdCBhcHBsaWVkID0gYmVoYXZpb3VyICYmIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBfb3ZlcnJpZGUpO1xuICAgIGlmICghYXBwbGllZCkge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHtcbiAgICAgICAgICAgIFtTeW1ib2wuaGFzSW5zdGFuY2VdOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGJlaGF2aW91cixcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBbX292ZXJyaWRlXToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBiZWhhdmlvdXIgPyB0cnVlIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBTZXQgdGhlIE1peGluIGNsYXNzIGF0dHJpYnV0ZS5cbiAqIEBqYSBNaXhpbiDjgq/jg6njgrnjgavlr77jgZfjgablsZ7mgKfjgpLoqK3lrppcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIC8vICdwcm90b0V4dGVuZE9ubHknXG4gKiBjbGFzcyBCYXNlIHsgY29uc3RydWN0b3IoYSwgYikge30gfTtcbiAqIGNsYXNzIE1peEEgeyB9O1xuICogc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoTWl4QSwgJ3Byb3RvRXh0ZW5kc09ubHknKTsgIC8vIGZvciBpbXByb3ZpbmcgY29uc3RydWN0aW9uIHBlcmZvcm1hbmNlXG4gKiBjbGFzcyBNaXhCIHsgY29uc3RydWN0b3IoYywgZCkge30gfTtcbiAqXG4gKiBjbGFzcyBNaXhpbkNsYXNzIGV4dGVuZHMgbWl4aW5zKEJhc2UsIE1peEEsIE1peEIpIHtcbiAqICAgICBjb25zdHJ1Y3RvcihhLCBiLCBjLCBkKXtcbiAqICAgICAgICAgLy8gY2FsbGluZyBgQmFzZWAgY29uc3RydWN0b3JcbiAqICAgICAgICAgc3VwZXIoYSwgYik7XG4gKlxuICogICAgICAgICAvLyBjYWxsaW5nIE1peGluIGNsYXNzJ3MgY29uc3RydWN0b3JcbiAqICAgICAgICAgdGhpcy5zdXBlcihNaXhBKTsgICAgICAgIC8vIG5vIGFmZmVjdFxuICogICAgICAgICB0aGlzLnN1cGVyKE1peEIsIGMsIGQpO1xuICogICAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBtaXhlZCA9IG5ldyBNaXhpbkNsYXNzKCk7XG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE1peEEpOyAgICAvLyBmYWxzZVxuICogY29uc29sZS5sb2cobWl4ZWQuaXNNaXhlZFdpdGgoTWl4QSkpOyAgLy8gZmFsc2VcbiAqXG4gKiAvLyAnaW5zdGFuY2VPZidcbiAqIGNsYXNzIEJhc2Uge307XG4gKiBjbGFzcyBTb3VyY2Uge307XG4gKiBjbGFzcyBNaXhpbkNsYXNzIGV4dGVuZHMgbWl4aW5zKEJhc2UsIFNvdXJjZSkge307XG4gKlxuICogY2xhc3MgT3RoZXIgZXh0ZW5kcyBTb3VyY2Uge307XG4gKlxuICogY29uc3Qgb3RoZXIgPSBuZXcgT3RoZXIoKTtcbiAqIGNvbnN0IG1peGVkID0gbmV3IE1peGluQ2xhc3MoKTtcbiAqIGNvbnNvbGUubG9nKG90aGVyIGluc3RhbmNlb2YgU291cmNlKTsgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG90aGVyIGluc3RhbmNlb2YgT3RoZXIpOyAgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgTWl4aW5DbGFzcyk7ICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgQmFzZSk7ICAgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgU291cmNlKTsgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgT3RoZXIpOyAgICAgICAgIC8vIHRydWUgPz8/XG4gKlxuICogc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoT3RoZXIsICdpbnN0YW5jZU9mJyk7IC8vIG9yIHNldE1peENsYXNzQXR0cmlidXRlKE90aGVyLCAnaW5zdGFuY2VPZicsIG51bGwpO1xuICogY29uc29sZS5sb2cob3RoZXIgaW5zdGFuY2VvZiBTb3VyY2UpOyAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cob3RoZXIgaW5zdGFuY2VvZiBPdGhlcik7ICAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBPdGhlcik7ICAgICAgICAgLy8gZmFsc2UgIVxuICpcbiAqIC8vIFtCZXN0IFByYWN0aWNlXSBJZiB5b3UgZGVjbGFyZSB0aGUgZGVyaXZlZC1jbGFzcyBmcm9tIG1peGluLCB5b3Ugc2hvdWxkIGNhbGwgdGhlIGZ1bmN0aW9uIGZvciBhdm9pZGluZyBgaW5zdGFuY2VvZmAgbGltaXRhdGlvbi5cbiAqIGNsYXNzIERlcml2ZWRDbGFzcyBleHRlbmRzIE1peGluQ2xhc3Mge31cbiAqIHNldE1peENsYXNzQXR0cmlidXRlKERlcml2ZWRDbGFzcywgJ2luc3RhbmNlT2YnKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgc2V0IHRhcmdldCBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDoqK3lrprlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEBwYXJhbSBhdHRyXG4gKiAgLSBgZW5gOlxuICogICAgLSBgcHJvdG9FeHRlbmRzT25seWA6IFN1cHByZXNzIHByb3ZpZGluZyBjb25zdHJ1Y3Rvci10cmFwIGZvciB0aGUgbWl4aW4gc291cmNlIGNsYXNzLiAoZm9yIGltcHJvdmluZyBwZXJmb3JtYW5jZSlcbiAqICAgIC0gYGluc3RhbmNlT2ZgICAgICAgOiBmdW5jdGlvbiBieSB1c2luZyBbU3ltYm9sLmhhc0luc3RhbmNlXSA8YnI+XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgRGVmYXVsdCBiZWhhdmlvdXIgaXMgYHsgcmV0dXJuIHRhcmdldC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnN0YW5jZSkgfWBcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBJZiBzZXQgYG51bGxgLCBkZWxldGUgW1N5bWJvbC5oYXNJbnN0YW5jZV0gcHJvcGVydHkuXG4gKiAgLSBgamFgOlxuICogICAgLSBgcHJvdG9FeHRlbmRzT25seWA6IE1peGluIFNvdXJjZSDjgq/jg6njgrnjgavlr77jgZfjgaYsIOOCs+ODs+OCueODiOODqeOCr+OCv+ODiOODqeODg+ODl+OCkuaKkeatoiAo44OR44OV44Kp44O844Oe44Oz44K55pS55ZaEKVxuICogICAgLSBgaW5zdGFuY2VPZmAgICAgICA6IFtTeW1ib2wuaGFzSW5zdGFuY2VdIOOBjOS9v+eUqOOBmeOCi+mWouaVsOOCkuaMh+WumiA8YnI+XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAg5pei5a6a44Gn44GvIGB7IHJldHVybiB0YXJnZXQucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5zdGFuY2UpIH1gIOOBjOS9v+eUqOOBleOCjOOCi1xuICogICAgICAgICAgICAgICAgICAgICAgICAgYG51bGxgIOaMh+WumuOCkuOBmeOCi+OBqCBbU3ltYm9sLmhhc0luc3RhbmNlXSDjg5fjg63jg5Hjg4bjgqPjgpLliYrpmaTjgZnjgotcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldE1peENsYXNzQXR0cmlidXRlPFQgZXh0ZW5kcyBvYmplY3QsIFUgZXh0ZW5kcyBrZXlvZiBNaXhDbGFzc0F0dHJpYnV0ZT4oXG4gICAgdGFyZ2V0OiBDb25zdHJ1Y3RvcjxUPixcbiAgICBhdHRyOiBVLFxuICAgIG1ldGhvZD86IE1peENsYXNzQXR0cmlidXRlW1VdXG4pOiB2b2lkIHtcbiAgICBzd2l0Y2ggKGF0dHIpIHtcbiAgICAgICAgY2FzZSAncHJvdG9FeHRlbmRzT25seSc6XG4gICAgICAgICAgICAodGFyZ2V0IGFzIEFjY2Vzc2libGU8Q29uc3RydWN0b3I8VD4+KVtfcHJvdG9FeHRlbmRzT25seV0gPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2luc3RhbmNlT2YnOlxuICAgICAgICAgICAgc2V0SW5zdGFuY2VPZih0YXJnZXQsIG1ldGhvZCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gTWl4aW4gZnVuY3Rpb24gZm9yIG11bHRpcGxlIGluaGVyaXRhbmNlLiA8YnI+XG4gKiAgICAgUmVzb2x2aW5nIHR5cGUgc3VwcG9ydCBmb3IgbWF4aW11bSAxMCBjbGFzc2VzLlxuICogQGphIOWkmumHjee2meaJv+OBruOBn+OCgeOBriBNaXhpbiA8YnI+XG4gKiAgICAg5pyA5aSnIDEwIOOCr+ODqeOCueOBruWei+ino+axuuOCkuOCteODneODvOODiFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2xhc3MgQmFzZSB7IGNvbnN0cnVjdG9yKGEsIGIpIHt9IH07XG4gKiBjbGFzcyBNaXhBIHsgY29uc3RydWN0b3IoYSwgYikge30gfTtcbiAqIGNsYXNzIE1peEIgeyBjb25zdHJ1Y3RvcihjLCBkKSB7fSB9O1xuICpcbiAqIGNsYXNzIE1peGluQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoQmFzZSwgTWl4QSwgTWl4Qikge1xuICogICAgIGNvbnN0cnVjdG9yKGEsIGIsIGMsIGQpe1xuICogICAgICAgICAvLyBjYWxsaW5nIGBCYXNlYCBjb25zdHJ1Y3RvclxuICogICAgICAgICBzdXBlcihhLCBiKTtcbiAqXG4gKiAgICAgICAgIC8vIGNhbGxpbmcgTWl4aW4gY2xhc3MncyBjb25zdHJ1Y3RvclxuICogICAgICAgICB0aGlzLnN1cGVyKE1peEEsIGEsIGIpO1xuICogICAgICAgICB0aGlzLnN1cGVyKE1peEIsIGMsIGQpO1xuICogICAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBiYXNlXG4gKiAgLSBgZW5gIHByaW1hcnkgYmFzZSBjbGFzcy4gc3VwZXIoYXJncykgaXMgdGhpcyBjbGFzcydzIG9uZS5cbiAqICAtIGBqYWAg5Z+65bqV44Kv44Op44K544Kz44Oz44K544OI44Op44Kv44K/LiDlkIzlkI3jg5fjg63jg5Hjg4bjgqMsIOODoeOCveODg+ODieOBr+acgOWEquWFiOOBleOCjOOCiy4gc3VwZXIoYXJncykg44Gv44GT44Gu44Kv44Op44K544Gu44KC44Gu44GM5oyH5a6a5Y+v6IO9LlxuICogQHBhcmFtIHNvdXJjZXNcbiAqICAtIGBlbmAgbXVsdGlwbGUgZXh0ZW5kcyBjbGFzc1xuICogIC0gYGphYCDmi6HlvLXjgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIG1peGluZWQgY2xhc3MgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg5ZCI5oiQ44GV44KM44Gf44Kv44Op44K544Kz44Oz44K544OI44Op44Kv44K/XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtaXhpbnM8XG4gICAgQiBleHRlbmRzIENsYXNzLFxuICAgIFMxIGV4dGVuZHMgb2JqZWN0LFxuICAgIFMyIGV4dGVuZHMgb2JqZWN0LFxuICAgIFMzIGV4dGVuZHMgb2JqZWN0LFxuICAgIFM0IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM1IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM2IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM3IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM4IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM5IGV4dGVuZHMgb2JqZWN0PihcbiAgICBiYXNlOiBCLFxuICAgIC4uLnNvdXJjZXM6IFtcbiAgICAgICAgQ29uc3RydWN0b3I8UzE+LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTMj4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTMz4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTND4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNT4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNj4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNz4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTOD4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTOT4/LFxuICAgICAgICAuLi5hbnlbXVxuICAgIF0pOiBNaXhpbkNvbnN0cnVjdG9yPEIsIE1peGluQ2xhc3MgJiBJbnN0YW5jZVR5cGU8Qj4gJiBTMSAmIFMyICYgUzMgJiBTNCAmIFM1ICYgUzYgJiBTNyAmIFM4ICYgUzk+IHtcblxuICAgIGxldCBfaGFzU291cmNlQ29uc3RydWN0b3IgPSBmYWxzZTtcblxuICAgIGNsYXNzIF9NaXhpbkJhc2UgZXh0ZW5kcyAoYmFzZSBhcyB1bmtub3duIGFzIENvbnN0cnVjdG9yPE1peGluQ2xhc3M+KSB7XG5cbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBbX2NvbnN0cnVjdG9yc106IE1hcDxDb25zdHJ1Y3RvcjxvYmplY3Q+LCBVbmtub3duRnVuY3Rpb24gfCBudWxsPjtcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBbX2NsYXNzQmFzZV06IENvbnN0cnVjdG9yPG9iamVjdD47XG5cbiAgICAgICAgY29uc3RydWN0b3IoLi4uYXJnczogdW5rbm93bltdKSB7XG4gICAgICAgICAgICBzdXBlciguLi5hcmdzKTtcblxuICAgICAgICAgICAgY29uc3QgY29uc3RydWN0b3JzID0gbmV3IE1hcDxDb25zdHJ1Y3RvcjxvYmplY3Q+LCBVbmtub3duRnVuY3Rpb24+KCk7XG4gICAgICAgICAgICB0aGlzW19jb25zdHJ1Y3RvcnNdID0gY29uc3RydWN0b3JzO1xuICAgICAgICAgICAgdGhpc1tfY2xhc3NCYXNlXSA9IGJhc2U7XG5cbiAgICAgICAgICAgIGlmIChfaGFzU291cmNlQ29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNyY0NsYXNzIG9mIHNvdXJjZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzcmNDbGFzc1tfcHJvdG9FeHRlbmRzT25seV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhbmRsZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwbHk6ICh0YXJnZXQ6IHVua25vd24sIHRoaXNvYmo6IHVua25vd24sIGFyZ2xpc3Q6IHVua25vd25bXSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvYmogPSBuZXcgc3JjQ2xhc3MoLi4uYXJnbGlzdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcHlQcm9wZXJ0aWVzKHRoaXMsIG9iaik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHByb3h5IGZvciAnY29uc3RydWN0JyBhbmQgY2FjaGUgY29uc3RydWN0b3JcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9ycy5zZXQoc3JjQ2xhc3MsIG5ldyBQcm94eShzcmNDbGFzcywgaGFuZGxlciBhcyBQcm94eUhhbmRsZXI8b2JqZWN0PikpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcHJvdGVjdGVkIHN1cGVyPFQgZXh0ZW5kcyBDbGFzcz4oc3JjQ2xhc3M6IFQsIC4uLmFyZ3M6IENvbnN0cnVjdG9yUGFyYW1ldGVyczxUPik6IHRoaXMge1xuICAgICAgICAgICAgY29uc3QgbWFwID0gdGhpc1tfY29uc3RydWN0b3JzXTtcbiAgICAgICAgICAgIGNvbnN0IGN0b3IgPSBtYXAuZ2V0KHNyY0NsYXNzKTtcbiAgICAgICAgICAgIGlmIChjdG9yKSB7XG4gICAgICAgICAgICAgICAgY3Rvci5jYWxsKHRoaXMsIC4uLmFyZ3MpO1xuICAgICAgICAgICAgICAgIG1hcC5zZXQoc3JjQ2xhc3MsIG51bGwpOyAgICAvLyBwcmV2ZW50IGNhbGxpbmcgdHdpY2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIGlzTWl4ZWRXaXRoPFQgZXh0ZW5kcyBvYmplY3Q+KHNyY0NsYXNzOiBDb25zdHJ1Y3RvcjxUPik6IGJvb2xlYW4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uc3RydWN0b3IgPT09IHNyY0NsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzW19jbGFzc0Jhc2VdID09PSBzcmNDbGFzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1tfY2xhc3NTb3VyY2VzXS5yZWR1Y2UoKHAsIGMpID0+IHAgfHwgKHNyY0NsYXNzID09PSBjKSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIHN0YXRpYyBbU3ltYm9sLmhhc0luc3RhbmNlXShpbnN0YW5jZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZi5jYWxsKF9NaXhpbkJhc2UucHJvdG90eXBlLCBpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgW19pc0luaGVyaXRlZF08VCBleHRlbmRzIG9iamVjdD4oc3JjQ2xhc3M6IENvbnN0cnVjdG9yPFQ+KTogYm9vbGVhbiB7XG4gICAgICAgICAgICBjb25zdCBjdG9ycyA9IHRoaXNbX2NvbnN0cnVjdG9yc107XG4gICAgICAgICAgICBpZiAoY3RvcnMuaGFzKHNyY0NsYXNzKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCBjdG9yIG9mIGN0b3JzLmtleXMoKSkge1xuICAgICAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YuY2FsbChzcmNDbGFzcywgY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJpdmF0ZSBnZXQgW19jbGFzc1NvdXJjZXNdKCk6IENvbnN0cnVjdG9yPG9iamVjdD5bXSB7XG4gICAgICAgICAgICByZXR1cm4gWy4uLnRoaXNbX2NvbnN0cnVjdG9yc10ua2V5cygpXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoY29uc3Qgc3JjQ2xhc3Mgb2Ygc291cmNlcykge1xuICAgICAgICAvLyBwcm92aWRlIGN1c3RvbSBpbnN0YW5jZW9mXG4gICAgICAgIGNvbnN0IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNyY0NsYXNzLCBTeW1ib2wuaGFzSW5zdGFuY2UpO1xuICAgICAgICBpZiAoIWRlc2MgfHwgZGVzYy53cml0YWJsZSkge1xuICAgICAgICAgICAgY29uc3Qgb3JnSW5zdGFuY2VPZiA9IGRlc2MgPyBzcmNDbGFzc1tTeW1ib2wuaGFzSW5zdGFuY2VdIDogX2luc3RhbmNlT2Y7XG4gICAgICAgICAgICBzZXRJbnN0YW5jZU9mKHNyY0NsYXNzLCAoaW5zdDogVW5rbm93bk9iamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLW51bGxpc2gtY29hbGVzY2luZ1xuICAgICAgICAgICAgICAgIHJldHVybiBvcmdJbnN0YW5jZU9mLmNhbGwoc3JjQ2xhc3MsIGluc3QpIHx8ICgoaW5zdD8uW19pc0luaGVyaXRlZF0pID8gKGluc3RbX2lzSW5oZXJpdGVkXSBhcyBVbmtub3duRnVuY3Rpb24pKHNyY0NsYXNzKSA6IGZhbHNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIHByb3ZpZGUgcHJvdG90eXBlXG4gICAgICAgIGNvcHlQcm9wZXJ0aWVzKF9NaXhpbkJhc2UucHJvdG90eXBlLCBzcmNDbGFzcy5wcm90b3R5cGUpO1xuICAgICAgICBsZXQgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHNyY0NsYXNzLnByb3RvdHlwZSk7XG4gICAgICAgIHdoaWxlIChfb2JqUHJvdG90eXBlICE9PSBwYXJlbnQpIHtcbiAgICAgICAgICAgIGNvcHlQcm9wZXJ0aWVzKF9NaXhpbkJhc2UucHJvdG90eXBlLCBwYXJlbnQpO1xuICAgICAgICAgICAgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHBhcmVudCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2hlY2sgY29uc3RydWN0b3JcbiAgICAgICAgaWYgKCFfaGFzU291cmNlQ29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIF9oYXNTb3VyY2VDb25zdHJ1Y3RvciA9ICFzcmNDbGFzc1tfcHJvdG9FeHRlbmRzT25seV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gX01peGluQmFzZSBhcyBhbnk7XG59XG4iLCJpbXBvcnQgeyBhc3NpZ25WYWx1ZSwgZGVlcEVxdWFsIH0gZnJvbSAnLi9kZWVwLWNpcmN1aXQnO1xuaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgdHlwZSBBY2Nlc3NpYmxlLFxuICAgIHR5cGUgTnVsbGlzaCxcbiAgICB0eXBlIFdyaXRhYmxlLFxuICAgIGlzQXJyYXksXG4gICAgaXNPYmplY3QsXG4gICAgaXNGdW5jdGlvbixcbn0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyB2ZXJpZnkgfSBmcm9tICcuL3ZlcmlmeSc7XG5cbi8qKlxuICogQGVuIENoZWNrIHdoZXRoZXIgaW5wdXQgc291cmNlIGhhcyBhIHByb3BlcnR5LlxuICogQGphIOWFpeWKm+WFg+OBjOODl+ODreODkeODhuOCo+OCkuaMgeOBo+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzcmNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhcyhzcmM6IHVua25vd24sIHByb3BOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gbnVsbCAhPSBzcmMgJiYgaXNPYmplY3Qoc3JjKSAmJiAocHJvcE5hbWUgaW4gc3JjKTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHNoYWxsb3cgY29weSBvZiBgdGFyZ2V0YCB3aGljaCBoYXMgb25seSBgcGlja0tleXNgLlxuICogQGphIGBwaWNrS2V5c2Ag44Gn5oyH5a6a44GV44KM44Gf44OX44Ot44OR44OG44Kj44Gu44G/44KS5oyB44GkIGB0YXJnZXRgIOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBjb3B5IHNvdXJjZSBvYmplY3RcbiAqICAtIGBqYWAg44Kz44OU44O85YWD44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gcGlja0tleXNcbiAqICAtIGBlbmAgY29weSB0YXJnZXQga2V5c1xuICogIC0gYGphYCDjgrPjg5Tjg7zlr77osaHjga7jgq3jg7zkuIDopqdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBpY2s8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIGtleW9mIFQ+KHRhcmdldDogVCwgLi4ucGlja0tleXM6IEtbXSk6IFdyaXRhYmxlPFBpY2s8VCwgSz4+IHtcbiAgICB2ZXJpZnkoJ3R5cGVPZicsICdvYmplY3QnLCB0YXJnZXQpO1xuICAgIHJldHVybiBwaWNrS2V5cy5yZWR1Y2UoKG9iaiwga2V5KSA9PiB7XG4gICAgICAgIGtleSBpbiB0YXJnZXQgJiYgYXNzaWduVmFsdWUob2JqLCBrZXksIHRhcmdldFtrZXldKTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9LCB7fSBhcyBXcml0YWJsZTxQaWNrPFQsIEs+Pik7XG59XG5cbi8qKlxuICogQGVuIEdldCBzaGFsbG93IGNvcHkgb2YgYHRhcmdldGAgd2l0aG91dCBgb21pdEtleXNgLlxuICogQGphIGBvbWl0S2V5c2Ag44Gn5oyH5a6a44GV44KM44Gf44OX44Ot44OR44OG44Kj5Lul5aSW44Gu44Kt44O844KS5oyB44GkIGB0YXJnZXRgIOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBjb3B5IHNvdXJjZSBvYmplY3RcbiAqICAtIGBqYWAg44Kz44OU44O85YWD44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gb21pdEtleXNcbiAqICAtIGBlbmAgb21pdCB0YXJnZXQga2V5c1xuICogIC0gYGphYCDliYrpmaTlr77osaHjga7jgq3jg7zkuIDopqdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9taXQ8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIGtleW9mIFQ+KHRhcmdldDogVCwgLi4ub21pdEtleXM6IEtbXSk6IFdyaXRhYmxlPE9taXQ8VCwgSz4+IHtcbiAgICB2ZXJpZnkoJ3R5cGVPZicsICdvYmplY3QnLCB0YXJnZXQpO1xuICAgIGNvbnN0IG9iaiA9IHt9IGFzIFdyaXRhYmxlPE9taXQ8VCwgSz4+O1xuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRhcmdldCkpIHtcbiAgICAgICAgIW9taXRLZXlzLmluY2x1ZGVzKGtleSBhcyBLKSAmJiBhc3NpZ25WYWx1ZShvYmosIGtleSwgKHRhcmdldCBhcyBVbmtub3duT2JqZWN0KVtrZXldKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBAZW4gSW52ZXJ0IHRoZSBrZXlzIGFuZCB2YWx1ZXMgb2YgYW4gb2JqZWN0LiBUaGUgdmFsdWVzIG11c3QgYmUgc2VyaWFsaXphYmxlLlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBruOCreODvOOBqOWApOOCkumAhui7ouOBmeOCiy4g44GZ44G544Gm44Gu5YCk44GM44Om44OL44O844Kv44Gn44GC44KL44GT44Go44GM5YmN5o+QXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgb2JqZWN0XG4gKiAgLSBgamFgIOWvvuixoeOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW52ZXJ0PFQgZXh0ZW5kcyBvYmplY3QgPSBVbmtub3duT2JqZWN0Pih0YXJnZXQ6IG9iamVjdCk6IFQge1xuICAgIGNvbnN0IHJlc3VsdCA9IHt9O1xuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRhcmdldCkpIHtcbiAgICAgICAgYXNzaWduVmFsdWUocmVzdWx0LCAodGFyZ2V0IGFzIFVua25vd25PYmplY3QpW2tleV0gYXMgKHN0cmluZyB8IG51bWJlciB8IHN5bWJvbCksIGtleSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQgYXMgVDtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHNoYWxsb3cgY29weSBvZiBkaWZmZXJlbmNlIGJldHdlZW4gYGJhc2VgIGFuZCBgc3JjYC5cbiAqIEBqYSBgYmFzZWAg44GoIGBzcmNgIOOBruW3ruWIhuODl+ODreODkeODhuOCo+OCkuOCguOBpOOCquODluOCuOOCp+OCr+ODiOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGJhc2VcbiAqICAtIGBlbmAgYmFzZSBvYmplY3RcbiAqICAtIGBqYWAg5Z+65rqW44Go44Gq44KL44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBvYmplY3RcbiAqICAtIGBqYWAg44Kz44OU44O85YWD44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaWZmPFQgZXh0ZW5kcyBvYmplY3Q+KGJhc2U6IFQsIHNyYzogUGFydGlhbDxUPik6IFBhcnRpYWw8VD4ge1xuICAgIHZlcmlmeSgndHlwZU9mJywgJ29iamVjdCcsIGJhc2UpO1xuICAgIHZlcmlmeSgndHlwZU9mJywgJ29iamVjdCcsIHNyYyk7XG5cbiAgICBjb25zdCByZXR2YWw6IFBhcnRpYWw8VD4gPSB7fTtcblxuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHNyYykpIHtcbiAgICAgICAgaWYgKCFkZWVwRXF1YWwoKGJhc2UgYXMgVW5rbm93bk9iamVjdClba2V5XSwgKHNyYyBhcyBVbmtub3duT2JqZWN0KVtrZXldKSkge1xuICAgICAgICAgICAgYXNzaWduVmFsdWUocmV0dmFsLCBrZXksIChzcmMgYXMgVW5rbm93bk9iamVjdClba2V5XSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgc2hhbGxvdyBjb3B5IG9mIGBiYXNlYCB3aXRob3V0IGBkcm9wVmFsdWVgLlxuICogQGphIGBkcm9wVmFsdWVgIOOBp+aMh+WumuOBleOCjOOBn+ODl+ODreODkeODhuOCo+WApOS7peWkluOBruOCreODvOOCkuaMgeOBpCBgdGFyZ2V0YCDjga4gU2hhbGxvdyBDb3B5IOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBiYXNlXG4gKiAgLSBgZW5gIGJhc2Ugb2JqZWN0XG4gKiAgLSBgamFgIOWfuua6luOBqOOBquOCi+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIGRyb3BWYWx1ZXNcbiAqICAtIGBlbmAgdGFyZ2V0IHZhbHVlLiBkZWZhdWx0OiBgdW5kZWZpbmVkYC5cbiAqICAtIGBqYWAg5a++6LGh44Gu5YCkLiDml6LlrprlgKQ6IGB1bmRlZmluZWRgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkcm9wPFQgZXh0ZW5kcyBvYmplY3Q+KGJhc2U6IFQsIC4uLmRyb3BWYWx1ZXM6IHVua25vd25bXSk6IFBhcnRpYWw8VD4ge1xuICAgIHZlcmlmeSgndHlwZU9mJywgJ29iamVjdCcsIGJhc2UpO1xuXG4gICAgY29uc3QgdmFsdWVzID0gWy4uLmRyb3BWYWx1ZXNdO1xuICAgIGlmICghdmFsdWVzLmxlbmd0aCkge1xuICAgICAgICB2YWx1ZXMucHVzaCh1bmRlZmluZWQpO1xuICAgIH1cblxuICAgIGNvbnN0IHJldHZhbCA9IHsgLi4uYmFzZSB9IGFzIEFjY2Vzc2libGU8UGFydGlhbDxUPj47XG5cbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhiYXNlKSkge1xuICAgICAgICBmb3IgKGNvbnN0IHZhbCBvZiB2YWx1ZXMpIHtcbiAgICAgICAgICAgIGlmIChkZWVwRXF1YWwodmFsLCByZXR2YWxba2V5XSkpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgcmV0dmFsW2tleV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKipcbiAqIEBlbiBJZiB0aGUgdmFsdWUgb2YgdGhlIG5hbWVkIHByb3BlcnR5IGlzIGEgZnVuY3Rpb24gdGhlbiBpbnZva2UgaXQ7IG90aGVyd2lzZSwgcmV0dXJuIGl0LlxuICogQGphIG9iamVjdCDjga4gcHJvcGVydHkg44GM44Oh44K944OD44OJ44Gq44KJ44Gd44Gu5a6f6KGM57WQ5p6c44KSLCDjg5fjg63jg5Hjg4bjgqPjgarjgonjgZ3jga7lgKTjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAtIGBlbmAgT2JqZWN0IHRvIG1heWJlIGludm9rZSBmdW5jdGlvbiBgcHJvcGVydHlgIG9uLlxuICogLSBgamFgIOipleS+oeOBmeOCi+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIHByb3BlcnR5XG4gKiAtIGBlbmAgVGhlIGZ1bmN0aW9uIGJ5IG5hbWUgdG8gaW52b2tlIG9uIGBvYmplY3RgLlxuICogLSBgamFgIOipleS+oeOBmeOCi+ODl+ODreODkeODhuOCo+WQjVxuICogQHBhcmFtIGZhbGxiYWNrXG4gKiAtIGBlbmAgVGhlIHZhbHVlIHRvIGJlIHJldHVybmVkIGluIGNhc2UgYHByb3BlcnR5YCBkb2Vzbid0IGV4aXN0IG9yIGlzIHVuZGVmaW5lZC5cbiAqIC0gYGphYCDlrZjlnKjjgZfjgarjgYvjgaPjgZ/loLTlkIjjga4gZmFsbGJhY2sg5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXN1bHQ8VCA9IGFueT4odGFyZ2V0OiBvYmplY3QgfCBOdWxsaXNoLCBwcm9wZXJ0eTogc3RyaW5nIHwgc3RyaW5nW10sIGZhbGxiYWNrPzogVCk6IFQgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICBjb25zdCByZXNvbHZlID0gKG86IHVua25vd24sIHA6IHVua25vd24pOiB1bmtub3duID0+IHtcbiAgICAgICAgcmV0dXJuIGlzRnVuY3Rpb24ocCkgPyBwLmNhbGwobykgOiBwO1xuICAgIH07XG5cbiAgICBjb25zdCBwcm9wcyA9IGlzQXJyYXkocHJvcGVydHkpID8gcHJvcGVydHkgOiBbcHJvcGVydHldO1xuICAgIGlmICghcHJvcHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiByZXNvbHZlKHRhcmdldCwgZmFsbGJhY2spIGFzIFQ7XG4gICAgfVxuXG4gICAgbGV0IG9iaiA9IHRhcmdldCBhcyBVbmtub3duT2JqZWN0O1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBwcm9wcykge1xuICAgICAgICBjb25zdCBwcm9wID0gbnVsbCA9PSBvYmogPyB1bmRlZmluZWQgOiBvYmpbbmFtZV07XG4gICAgICAgIGlmICh1bmRlZmluZWQgPT09IHByb3ApIHtcbiAgICAgICAgICAgIHJldHVybiByZXNvbHZlKG9iaiwgZmFsbGJhY2spIGFzIFQ7XG4gICAgICAgIH1cbiAgICAgICAgb2JqID0gcmVzb2x2ZShvYmosIHByb3ApIGFzIFVua25vd25PYmplY3Q7XG4gICAgfVxuICAgIHJldHVybiBvYmogYXMgdW5rbm93biBhcyBUO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIGNhbGxhYmxlKCk6IHVua25vd24ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdXNlLWJlZm9yZS1kZWZpbmVcbiAgICByZXR1cm4gYWNjZXNzaWJsZTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgYWNjZXNzaWJsZTogdW5rbm93biA9IG5ldyBQcm94eShjYWxsYWJsZSwge1xuICAgIGdldDogKHRhcmdldDogYW55LCBuYW1lKSA9PiB7XG4gICAgICAgIGNvbnN0IHByb3AgPSB0YXJnZXRbbmFtZV07XG4gICAgICAgIGlmIChudWxsICE9IHByb3ApIHtcbiAgICAgICAgICAgIHJldHVybiBwcm9wO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGFjY2Vzc2libGU7XG4gICAgICAgIH1cbiAgICB9LFxufSk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIGNyZWF0ZSgpOiB1bmtub3duIHtcbiAgICBjb25zdCBzdHViID0gbmV3IFByb3h5KHt9LCB7XG4gICAgICAgIGdldDogKHRhcmdldDogYW55LCBuYW1lKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwcm9wID0gdGFyZ2V0W25hbWVdO1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gcHJvcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9wO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYWNjZXNzaWJsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9KTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzdHViLCAnc3R1YicsIHtcbiAgICAgICAgdmFsdWU6IHRydWUsXG4gICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICB9KTtcblxuICAgIHJldHVybiBzdHViO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgc2FmZSBhY2Nlc3NpYmxlIG9iamVjdC5cbiAqIEBqYSDlronlhajjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqrjg5bjgrjjgqfjgq/jg4jjga7lj5blvpdcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHNhZmVXaW5kb3cgPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbiAqIGNvbnNvbGUubG9nKG51bGwgIT0gc2FmZVdpbmRvdy5kb2N1bWVudCk7ICAgIC8vIHRydWVcbiAqIGNvbnN0IGRpdiA9IHNhZmVXaW5kb3cuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gKiBjb25zb2xlLmxvZyhudWxsICE9IGRpdik7ICAgIC8vIHRydWVcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgQSByZWZlcmVuY2Ugb2YgYW4gb2JqZWN0IHdpdGggYSBwb3NzaWJpbGl0eSB3aGljaCBleGlzdHMuXG4gKiAgLSBgamFgIOWtmOWcqOOBl+OBhuOCi+OCquODluOCuOOCp+OCr+ODiOOBruWPgueFp1xuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmVhbGl0eSBvciBzdHViIGluc3RhbmNlLlxuICogIC0gYGphYCDlrp/kvZPjgb7jgZ/jga/jgrnjgr/jg5bjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhZmU8VD4odGFyZ2V0OiBUKTogVCB7XG4gICAgcmV0dXJuIHRhcmdldCB8fCBjcmVhdGUoKSBhcyBUO1xufVxuIiwiaW1wb3J0IHR5cGUgeyBVbmtub3duRnVuY3Rpb24gfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGdldEdsb2JhbCB9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7IHNhZmUgfSBmcm9tICcuL3NhZmUnO1xuXG4vKipcbiAqIEBlbiBUeXBlIG9mIGhhbmRsZSBmb3IgdGltZXIgZnVuY3Rpb25zLlxuICogQGphIOOCv+OCpOODnuODvOmWouaVsOOBq+S9v+eUqOOBmeOCi+ODj+ODs+ODieODq+Wei1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRpbWVySGFuZGxlIHsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1vYmplY3QtdHlwZVxuXG4vKipcbiAqIEBlbiBUeXBlIG9mIHRpbWVyIHN0YXJ0IGZ1bmN0aW9ucy5cbiAqIEBqYSDjgr/jgqTjg57jg7zplovlp4vplqLmlbDjga7lnotcbiAqL1xuZXhwb3J0IHR5cGUgVGltZXJTdGFydEZ1bmN0aW9uID0gKGhhbmRsZXI6IFVua25vd25GdW5jdGlvbiwgdGltZW91dD86IG51bWJlciwgLi4uYXJnczogdW5rbm93bltdKSA9PiBUaW1lckhhbmRsZTtcblxuLyoqXG4gKiBAZW4gVHlwZSBvZiB0aW1lciBzdG9wIGZ1bmN0aW9ucy5cbiAqIEBqYSDjgr/jgqTjg57jg7zlgZzmraLplqLmlbDjga7lnotcbiAqL1xuZXhwb3J0IHR5cGUgVGltZXJTdG9wRnVuY3Rpb24gPSAoaGFuZGxlOiBUaW1lckhhbmRsZSkgPT4gdm9pZDtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFRpbWVyQ29udGV4dCB7XG4gICAgc2V0VGltZW91dDogVGltZXJTdGFydEZ1bmN0aW9uO1xuICAgIGNsZWFyVGltZW91dDogVGltZXJTdG9wRnVuY3Rpb247XG4gICAgc2V0SW50ZXJ2YWw6IFRpbWVyU3RhcnRGdW5jdGlvbjtcbiAgICBjbGVhckludGVydmFsOiBUaW1lclN0b3BGdW5jdGlvbjtcbn1cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcm9vdCA9IGdldEdsb2JhbCgpIGFzIHVua25vd24gYXMgVGltZXJDb250ZXh0O1xuY29uc3Qgc2V0VGltZW91dDogVGltZXJTdGFydEZ1bmN0aW9uICAgPSBzYWZlKF9yb290LnNldFRpbWVvdXQpLmJpbmQoX3Jvb3QpO1xuY29uc3QgY2xlYXJUaW1lb3V0OiBUaW1lclN0b3BGdW5jdGlvbiAgPSBzYWZlKF9yb290LmNsZWFyVGltZW91dCkuYmluZChfcm9vdCk7XG5jb25zdCBzZXRJbnRlcnZhbDogVGltZXJTdGFydEZ1bmN0aW9uICA9IHNhZmUoX3Jvb3Quc2V0SW50ZXJ2YWwpLmJpbmQoX3Jvb3QpO1xuY29uc3QgY2xlYXJJbnRlcnZhbDogVGltZXJTdG9wRnVuY3Rpb24gPSBzYWZlKF9yb290LmNsZWFySW50ZXJ2YWwpLmJpbmQoX3Jvb3QpO1xuXG5leHBvcnQge1xuICAgIHNldFRpbWVvdXQsXG4gICAgY2xlYXJUaW1lb3V0LFxuICAgIHNldEludGVydmFsLFxuICAgIGNsZWFySW50ZXJ2YWwsXG59O1xuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICB0eXBlIFByaW1pdGl2ZSxcbiAgICB0eXBlIFR5cGVkRGF0YSxcbiAgICBpc1N0cmluZyxcbiAgICBpc0Jvb2xlYW4sXG4gICAgaXNPYmplY3QsXG59IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgaW52ZXJ0IH0gZnJvbSAnLi9vYmplY3QnO1xuaW1wb3J0IHtcbiAgICB0eXBlIFRpbWVySGFuZGxlLFxuICAgIHNldFRpbWVvdXQsXG4gICAgY2xlYXJUaW1lb3V0LFxufSBmcm9tICcuL3RpbWVyJztcblxuLyoqXG4gKiBAZW4gRW5zdXJlIGFzeW5jaHJvbm91cyBleGVjdXRpb24uXG4gKiBAamEg6Z2e5ZCM5pyf5a6f6KGM44KS5L+d6Ki8XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiB2b2lkIHBvc3QoKCkgPT4gZXhlYyhhcmcpKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBpbXBsZW1lbnQgYXMgZnVuY3Rpb24gc2NvcGUuXG4gKiAgLSBgamFgIOmWouaVsOOCueOCs+ODvOODl+OBqOOBl+OBpuWun+ijhVxuKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0PFQ+KGV4ZWN1dG9yOiAoKSA9PiBUKTogUHJvbWlzZTxUPiB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oZXhlY3V0b3IpO1xufVxuXG4vKipcbiAqIEBlbiBHZW5lcmljIE5vLU9wZXJhdGlvbi5cbiAqIEBqYSDmsY7nlKggTm8tT3BlcmF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub29wKC4uLmFyZ3M6IHVua25vd25bXSk6IGFueSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgLy8gbm9vcFxufVxuXG4vKipcbiAqIEBlbiBXYWl0IGZvciB0aGUgZGVzaWduYXRpb24gZWxhcHNlLlxuICogQGphIOaMh+WumuaZgumWk+WHpueQhuOCkuW+heapn1xuICpcbiAqIEBwYXJhbSBlbGFwc2VcbiAqICAtIGBlbmAgd2FpdCBlbGFwc2UgW21zZWNdLlxuICogIC0gYGphYCDlvoXmqZ/mmYLplpMgW21zZWNdXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzbGVlcChlbGFwc2U6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgZWxhcHNlKSk7XG59XG5cbi8qKlxuICogQGVuIE9wdGlvbiBpbnRlcmZhY2UgZm9yIHtAbGluayBkZWJvdW5jZX0oKS5cbiAqIEBqYSB7QGxpbmsgZGVib3VuY2V9KCkg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44Oz44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGVib3VuY2VPcHRpb25zIHtcbiAgICAvKipcbiAgICAgKiBAZW4gdGhlIG1heGltdW0gdGltZSBgZnVuY2AgaXMgYWxsb3dlZCB0byBiZSBkZWxheWVkIGJlZm9yZSBpdCdzIGludm9rZWQuXG4gICAgICogQGphIOOCs+ODvOODq+ODkOODg+OCr+OBruWRvOOBs+WHuuOBl+OCkuW+heOBpOacgOWkp+aZgumWk1xuICAgICAqL1xuICAgIG1heFdhaXQ/OiBudW1iZXI7XG4gICAgLyoqXG4gICAgICogQGVuIFNwZWNpZnkgYHRydWVgIGlmIHlvdSB3YW50IHRvIGNhbGwgdGhlIGNhbGxiYWNrIGxlYWRpbmcgZWRnZSBvZiB0aGUgd2FpdGluZyB0aW1lLiAoZGVmYXVsdDogZmFsc2UpXG4gICAgICogQGphIOW+heOBoeaZgumWk+OBq+WvvuOBl+OBpuOCs+ODvOODq+ODkOODg+OCr+OCkuWFiOWRvOOBs+Wun+ihjOOBmeOCi+WgtOWQiOOBryBgdHJ1ZWAg44KS5oyH5a6aLiAoZGVmYXVsdDogZmFsc2UpXG4gICAgICovXG4gICAgbGVhZGluZz86IGJvb2xlYW47XG4gICAgLyoqXG4gICAgICogQGVuIFNwZWNpZnkgYHRydWVgIGlmIHlvdSB3YW50IHRvIGNhbGwgdGhlIGNhbGxiYWNrIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHdhaXRpbmcgdGltZS4gKGRlZmF1bHQ6IHRydWUpXG4gICAgICogQGphIOW+heOBoeaZgumWk+OBq+WvvuOBl+OBpuOCs+ODvOODq+ODkOODg+OCr+OCkuW+jOWRvOOBs+Wun+ihjOOBmeOCi+WgtOWQiOOBryBgdHJ1ZWAg44KS5oyH5a6aLiAoZGVmYXVsdDogdHJ1ZSlcbiAgICAgKi9cbiAgICB0cmFpbGluZz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIERlYm91bmNlZEZ1bmN0aW9uPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+ID0gVCAmIHsgY2FuY2VsKCk6IHZvaWQ7IGZsdXNoKCk6IFJldHVyblR5cGU8VD47IHBlbmRpbmcoKTogYm9vbGVhbjsgfTtcblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCBhcyBsb25nIGFzIGl0IGNvbnRpbnVlcyB0byBiZSBpbnZva2VkLCB3aWxsIG5vdCBiZSB0cmlnZ2VyZWQuXG4gKiBAamEg5ZG844Gz5Ye644GV44KM44Gm44GL44KJIHdhaXQgW21zZWNdIOe1jOmBjuOBmeOCi+OBvuOBp+Wun+ihjOOBl+OBquOBhOmWouaVsOOCkui/lOWNtFxuICpcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBzZWVkIGZ1bmN0aW9uLlxuICogIC0gYGphYCDlr77osaHjga7plqLmlbBcbiAqIEBwYXJhbSB3YWl0XG4gKiAgLSBgZW5gIHdhaXQgZWxhcHNlIFttc2VjXS5cbiAqICAtIGBqYWAg5b6F5qmf5pmC6ZaTIFttc2VjXVxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgc3BlY2lmeSB7QGxpbmsgRGVib3VuY2VPcHRpb25zfSBvYmplY3Qgb3IgYHRydWVgIHRvIGZpcmUgdGhlIGNhbGxiYWNrIGltbWVkaWF0ZWx5LlxuICogIC0gYGphYCB7QGxpbmsgRGVib3VuY2VPcHRpb25zfSBvYmplY3Qg44KC44GX44GP44Gv5Y2z5pmC44Gr44Kz44O844Or44OQ44OD44Kv44KS55m654Gr44GZ44KL44Go44GN44GvIGB0cnVlYCDjgpLmjIflrpouXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWJvdW5jZTxUIGV4dGVuZHMgVW5rbm93bkZ1bmN0aW9uPihleGVjdXRvcjogVCwgd2FpdDogbnVtYmVyLCBvcHRpb25zPzogRGVib3VuY2VPcHRpb25zIHwgYm9vbGVhbik6IERlYm91bmNlZEZ1bmN0aW9uPFQ+IHtcbiAgICB0eXBlIFJlc3VsdCA9IFJldHVyblR5cGU8VD4gfCB1bmRlZmluZWQ7XG5cbiAgICBsZXQgbGFzdEFyZ3M6IHVua25vd247XG4gICAgbGV0IGxhc3RUaGlzOiB1bmtub3duO1xuICAgIGxldCByZXN1bHQ6IFJlc3VsdDtcbiAgICBsZXQgbGFzdENhbGxUaW1lOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gICAgbGV0IHRpbWVySWQ6IFRpbWVySGFuZGxlIHwgdW5kZWZpbmVkO1xuICAgIGxldCBsYXN0SW52b2tlVGltZSA9IDA7XG5cbiAgICBjb25zdCB3YWl0VmFsdWUgPSBOdW1iZXIod2FpdCkgfHwgMDtcblxuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgbGVhZGluZzogZmFsc2UsIHRyYWlsaW5nOiB0cnVlIH0sIChpc0Jvb2xlYW4ob3B0aW9ucykgPyB7IGxlYWRpbmc6IG9wdGlvbnMsIHRyYWlsaW5nOiAhb3B0aW9ucyB9IDogb3B0aW9ucykpO1xuICAgIGNvbnN0IHsgbGVhZGluZywgdHJhaWxpbmcgfSA9IG9wdHM7XG4gICAgY29uc3QgbWF4V2FpdCA9IG51bGwgIT0gb3B0cy5tYXhXYWl0ID8gTWF0aC5tYXgoTnVtYmVyKG9wdHMubWF4V2FpdCkgfHwgMCwgd2FpdFZhbHVlKSA6IG51bGw7XG5cbiAgICBjb25zdCBpbnZva2VGdW5jID0gKHRpbWU6IG51bWJlcik6IFJlc3VsdCA9PiB7XG4gICAgICAgIGNvbnN0IGFyZ3MgPSBsYXN0QXJncztcbiAgICAgICAgY29uc3QgdGhpc0FyZyA9IGxhc3RUaGlzO1xuXG4gICAgICAgIGxhc3RBcmdzID0gbGFzdFRoaXMgPSB1bmRlZmluZWQ7XG4gICAgICAgIGxhc3RJbnZva2VUaW1lID0gdGltZTtcbiAgICAgICAgcmVzdWx0ID0gZXhlY3V0b3IuYXBwbHkodGhpc0FyZywgYXJncyBhcyBQYXJhbWV0ZXJzPFQ+KSBhcyBSZXN1bHQ7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcblxuICAgIGNvbnN0IHJlbWFpbmluZ1dhaXQgPSAodGltZTogbnVtYmVyKTogbnVtYmVyID0+IHtcbiAgICAgICAgY29uc3QgdGltZVNpbmNlTGFzdENhbGwgPSB0aW1lIC0gbGFzdENhbGxUaW1lITtcbiAgICAgICAgY29uc3QgdGltZVNpbmNlTGFzdEludm9rZSA9IHRpbWUgLSBsYXN0SW52b2tlVGltZTtcbiAgICAgICAgY29uc3QgdGltZVdhaXRpbmcgPSB3YWl0VmFsdWUgLSB0aW1lU2luY2VMYXN0Q2FsbDtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gbWF4V2FpdCA/IE1hdGgubWluKHRpbWVXYWl0aW5nLCBtYXhXYWl0IC0gdGltZVNpbmNlTGFzdEludm9rZSkgOiB0aW1lV2FpdGluZztcbiAgICB9O1xuXG4gICAgY29uc3Qgc2hvdWxkSW52b2tlID0gKHRpbWU6IG51bWJlcik6IGJvb2xlYW4gPT4ge1xuICAgICAgICBpZiAodW5kZWZpbmVkID09PSBsYXN0Q2FsbFRpbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRpbWVTaW5jZUxhc3RDYWxsID0gdGltZSAtIGxhc3RDYWxsVGltZTtcbiAgICAgICAgY29uc3QgdGltZVNpbmNlTGFzdEludm9rZSA9IHRpbWUgLSBsYXN0SW52b2tlVGltZTtcbiAgICAgICAgcmV0dXJuIHRpbWVTaW5jZUxhc3RDYWxsID49IHdhaXRWYWx1ZSB8fCB0aW1lU2luY2VMYXN0Q2FsbCA8IDAgfHwgKG1heFdhaXQgIT09IG51bGwgJiYgdGltZVNpbmNlTGFzdEludm9rZSA+PSBtYXhXYWl0KTtcbiAgICB9O1xuXG4gICAgY29uc3QgdHJhaWxpbmdFZGdlID0gKHRpbWU6IG51bWJlcik6IFJlc3VsdCA9PiB7XG4gICAgICAgIHRpbWVySWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmICh0cmFpbGluZyAmJiBsYXN0QXJncykge1xuICAgICAgICAgICAgcmV0dXJuIGludm9rZUZ1bmModGltZSk7XG4gICAgICAgIH1cbiAgICAgICAgbGFzdEFyZ3MgPSBsYXN0VGhpcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgY29uc3QgdGltZXJFeHBpcmVkID0gKCk6IFJlc3VsdCB8IHZvaWQgPT4ge1xuICAgICAgICBjb25zdCB0aW1lID0gRGF0ZS5ub3coKTtcbiAgICAgICAgaWYgKHNob3VsZEludm9rZSh0aW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRyYWlsaW5nRWRnZSh0aW1lKTtcbiAgICAgICAgfVxuICAgICAgICB0aW1lcklkID0gc2V0VGltZW91dCh0aW1lckV4cGlyZWQsIHJlbWFpbmluZ1dhaXQodGltZSkpO1xuICAgIH07XG5cbiAgICBjb25zdCBsZWFkaW5nRWRnZSA9ICh0aW1lOiBudW1iZXIpOiBSZXN1bHQgPT4ge1xuICAgICAgICBsYXN0SW52b2tlVGltZSA9IHRpbWU7XG4gICAgICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgd2FpdFZhbHVlKTtcbiAgICAgICAgcmV0dXJuIGxlYWRpbmcgPyBpbnZva2VGdW5jKHRpbWUpIDogcmVzdWx0O1xuICAgIH07XG5cbiAgICBjb25zdCBjYW5jZWwgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgIGlmICh1bmRlZmluZWQgIT09IHRpbWVySWQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcklkKTtcbiAgICAgICAgfVxuICAgICAgICBsYXN0SW52b2tlVGltZSA9IDA7XG4gICAgICAgIGxhc3RBcmdzID0gbGFzdENhbGxUaW1lID0gbGFzdFRoaXMgPSB0aW1lcklkID0gdW5kZWZpbmVkO1xuICAgIH07XG5cbiAgICBjb25zdCBmbHVzaCA9ICgpOiBSZXN1bHQgPT4ge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkID09PSB0aW1lcklkID8gcmVzdWx0IDogdHJhaWxpbmdFZGdlKERhdGUubm93KCkpO1xuICAgIH07XG5cbiAgICBjb25zdCBwZW5kaW5nID0gKCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSB0aW1lcklkO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBkZWJvdW5jZWQodGhpczogdW5rbm93biwgLi4uYXJnczogdW5rbm93bltdKTogUmVzdWx0IHtcbiAgICAgICAgY29uc3QgdGltZSA9IERhdGUubm93KCk7XG4gICAgICAgIGNvbnN0IGlzSW52b2tpbmcgPSBzaG91bGRJbnZva2UodGltZSk7XG5cbiAgICAgICAgbGFzdEFyZ3MgPSBhcmdzO1xuICAgICAgICBsYXN0VGhpcyA9IHRoaXM7ICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICAgICAgbGFzdENhbGxUaW1lID0gdGltZTtcblxuICAgICAgICBpZiAoaXNJbnZva2luZykge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gdGltZXJJZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWFkaW5nRWRnZShsYXN0Q2FsbFRpbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1heFdhaXQpIHtcbiAgICAgICAgICAgICAgICB0aW1lcklkID0gc2V0VGltZW91dCh0aW1lckV4cGlyZWQsIHdhaXRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGludm9rZUZ1bmMobGFzdENhbGxUaW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aW1lcklkID8/PSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgd2FpdFZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gY2FuY2VsO1xuICAgIGRlYm91bmNlZC5mbHVzaCA9IGZsdXNoO1xuICAgIGRlYm91bmNlZC5wZW5kaW5nID0gcGVuZGluZztcblxuICAgIHJldHVybiBkZWJvdW5jZWQgYXMgRGVib3VuY2VkRnVuY3Rpb248VD47XG59XG5cbi8qKlxuICogQGVuIE9wdGlvbiBpbnRlcmZhY2UgZm9yIHtAbGluayB0aHJvdHRsZX0oKS5cbiAqIEBqYSB7QGxpbmsgdGhyb3R0bGV9KCkg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44Oz44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGhyb3R0bGVPcHRpb25zIHtcbiAgICAvKipcbiAgICAgKiBAZW4gU3BlY2lmeSBgdHJ1ZWAgaWYgeW91IHdhbnQgdG8gY2FsbCB0aGUgY2FsbGJhY2sgbGVhZGluZyBlZGdlIG9mIHRoZSB3YWl0aW5nIHRpbWUuIChkZWZhdWx0OiB0cnVlKVxuICAgICAqIEBqYSDlvoXjgaHmmYLplpPjgavlr77jgZfjgabjgrPjg7zjg6vjg5Djg4Pjgq/jgpLlhYjlkbzjgbPlrp/ooYzjgZnjgovloLTlkIjjga8gYHRydWVgIOOCkuaMh+Wumi4gKGRlZmF1bHQ6IHRydWUpXG4gICAgICovXG4gICAgbGVhZGluZz86IGJvb2xlYW47XG4gICAgLyoqXG4gICAgICogQGVuIFNwZWNpZnkgYHRydWVgIGlmIHlvdSB3YW50IHRvIGNhbGwgdGhlIGNhbGxiYWNrIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHdhaXRpbmcgdGltZS4gKGRlZmF1bHQ6IHRydWUpXG4gICAgICogQGphIOW+heOBoeaZgumWk+OBq+WvvuOBl+OBpuOCs+ODvOODq+ODkOODg+OCr+OCkuW+jOWRvOOBs+Wun+ihjOOBmeOCi+WgtOWQiOOBryBgdHJ1ZWAg44KS5oyH5a6aLiAoZGVmYXVsdDogdHJ1ZSlcbiAgICAgKi9cbiAgICB0cmFpbGluZz86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgd2hlbiBpbnZva2VkLCB3aWxsIG9ubHkgYmUgdHJpZ2dlcmVkIGF0IG1vc3Qgb25jZSBkdXJpbmcgYSBnaXZlbiB0aW1lLlxuICogQGphIOmWouaVsOOBruWun+ihjOOCkiB3YWl0IFttc2VjXSDjgasx5Zue44Gr5Yi26ZmQXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB0aHJvdHRsZWQgPSB0aHJvdHRsZSh1cGF0ZVBvc2l0aW9uLCAxMDApO1xuICogJCh3aW5kb3cpLnNjcm9sbCh0aHJvdHRsZWQpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIHNlZWQgZnVuY3Rpb24uXG4gKiAgLSBgamFgIOWvvuixoeOBrumWouaVsFxuICogQHBhcmFtIGVsYXBzZVxuICogIC0gYGVuYCB3YWl0IGVsYXBzZSBbbXNlY10uXG4gKiAgLSBgamFgIOW+heapn+aZgumWkyBbbXNlY11cbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0aHJvdHRsZTxUIGV4dGVuZHMgVW5rbm93bkZ1bmN0aW9uPihleGVjdXRvcjogVCwgZWxhcHNlOiBudW1iZXIsIG9wdGlvbnM/OiBUaHJvdHRsZU9wdGlvbnMpOiBEZWJvdW5jZWRGdW5jdGlvbjxUPiB7XG4gICAgY29uc3QgeyBsZWFkaW5nLCB0cmFpbGluZyB9ID0gT2JqZWN0LmFzc2lnbih7IGxlYWRpbmc6IHRydWUsIHRyYWlsaW5nOiB0cnVlIH0sIG9wdGlvbnMpO1xuICAgIHJldHVybiBkZWJvdW5jZShleGVjdXRvciwgZWxhcHNlLCB7XG4gICAgICAgIGxlYWRpbmcsXG4gICAgICAgIHRyYWlsaW5nLFxuICAgICAgICBtYXhXYWl0OiBlbGFwc2UsXG4gICAgfSk7XG59XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgYXQgbW9zdCBvbmUgdGltZSwgbm8gbWF0dGVyIGhvdyBvZnRlbiB5b3UgY2FsbCBpdC5cbiAqIEBqYSAx5bqm44GX44GL5a6f6KGM44GV44KM44Gq44GE6Zai5pWw44KS6L+U5Y20LiAy5Zue55uu5Lul6ZmN44Gv5pyA5Yid44Gu44Kz44O844Or44Gu44Kt44Oj44OD44K344Ol44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIHNlZWQgZnVuY3Rpb24uXG4gKiAgLSBgamFgIOWvvuixoeOBrumWouaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gb25jZTxUIGV4dGVuZHMgVW5rbm93bkZ1bmN0aW9uPihleGVjdXRvcjogVCk6IFQge1xuXG4gICAgbGV0IG1lbW86IHVua25vd247XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0aGlzOiB1bmtub3duLCAuLi5hcmdzOiB1bmtub3duW10pOiB1bmtub3duIHtcbiAgICAgICAgaWYgKGV4ZWN1dG9yKSB7XG4gICAgICAgICAgICBtZW1vID0gZXhlY3V0b3IuY2FsbCh0aGlzLCAuLi5hcmdzKTtcbiAgICAgICAgICAgIGV4ZWN1dG9yID0gbnVsbCE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgfSBhcyBUO1xuXG59XG5cbi8qKlxuICogQGVuIFJldHVybiBhIGRlZmVycmVkIGV4ZWN1dGFibGUgZnVuY3Rpb24gb2JqZWN0LlxuICogQGphIOmBheW7tuWun+ihjOWPr+iDveOBqumWouaVsOOCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3Qgc2NoZWR1bGUgPSBzY2hlZHVsZXIoKTtcbiAqIHNjaGVkdWxlKCgpID0+IHRhc2sxKCkpO1xuICogc2NoZWR1bGUoKCkgPT4gdGFzazIoKSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNjaGVkdWxlcigpOiAoZXhlYzogKCkgPT4gdm9pZCkgPT4gdm9pZCB7XG4gICAgbGV0IHRhc2tzOiAoKCkgPT4gdm9pZClbXSA9IFtdO1xuICAgIGxldCBpZDogUHJvbWlzZTx2b2lkPiB8IG51bGw7XG5cbiAgICBmdW5jdGlvbiBydW5UYXNrcygpOiB2b2lkIHtcbiAgICAgICAgaWQgPSBudWxsO1xuICAgICAgICBjb25zdCB3b3JrID0gdGFza3M7XG4gICAgICAgIHRhc2tzID0gW107XG4gICAgICAgIGZvciAoY29uc3QgdGFzayBvZiB3b3JrKSB7XG4gICAgICAgICAgICB0YXNrKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24odGFzazogKCkgPT4gdW5rbm93bik6IHZvaWQge1xuICAgICAgICB0YXNrcy5wdXNoKHRhc2spO1xuICAgICAgICBpZCA/Pz0gcG9zdChydW5UYXNrcyk7XG4gICAgfTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENyZWF0ZSBlc2NhcGUgZnVuY3Rpb24gZnJvbSBtYXAuXG4gKiBAamEg5paH5a2X572u5o+b6Zai5pWw44KS5L2c5oiQXG4gKlxuICogQHBhcmFtIG1hcFxuICogIC0gYGVuYCBrZXk6IHRhcmdldCBjaGFyLCB2YWx1ZTogcmVwbGFjZSBjaGFyXG4gKiAgLSBgamFgIGtleTog572u5o+b5a++6LGhLCB2YWx1ZTog572u5o+b5paH5a2XXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBlc3BhY2UgZnVuY3Rpb25cbiAqICAtIGBqYWAg44Ko44K544Kx44O844OX6Zai5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFc2NhcGVyKG1hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPik6IChzcmM6IFByaW1pdGl2ZSkgPT4gc3RyaW5nIHtcbiAgICBjb25zdCBlc2NhcGVyID0gKG1hdGNoOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgICByZXR1cm4gbWFwW21hdGNoXTtcbiAgICB9O1xuXG4gICAgY29uc3Qgc291cmNlID0gYCg/OiR7T2JqZWN0LmtleXMobWFwKS5qb2luKCd8Jyl9KWA7XG4gICAgY29uc3QgcmVnZXhUZXN0ID0gUmVnRXhwKHNvdXJjZSk7XG4gICAgY29uc3QgcmVnZXhSZXBsYWNlID0gUmVnRXhwKHNvdXJjZSwgJ2cnKTtcblxuICAgIHJldHVybiAoc3JjOiBQcmltaXRpdmUpOiBzdHJpbmcgPT4ge1xuICAgICAgICBzcmMgPSAobnVsbCA9PSBzcmMgfHwgJ3N5bWJvbCcgPT09IHR5cGVvZiBzcmMpID8gJycgOiBTdHJpbmcoc3JjKTtcbiAgICAgICAgcmV0dXJuIHJlZ2V4VGVzdC50ZXN0KHNyYykgPyBzcmMucmVwbGFjZShyZWdleFJlcGxhY2UsIGVzY2FwZXIpIDogc3JjO1xuICAgIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1hcEh0bWxFc2NhcGUgPSB7XG4gICAgJzwnOiAnJmx0OycsXG4gICAgJz4nOiAnJmd0OycsXG4gICAgJyYnOiAnJmFtcDsnLFxuICAgICdcIic6ICcmcXVvdDsnLFxuICAgIFwiJ1wiOiAnJiMzOTsnLFxuICAgICdgJzogJyYjeDYwOydcbn07XG5cbi8qKlxuICogQGVuIEVzY2FwZSBIVE1MIHN0cmluZy5cbiAqIEBqYSBIVE1MIOOBp+S9v+eUqOOBmeOCi+aWh+Wtl+OCkuWItuW+oeaWh+Wtl+OBq+e9ruaPm1xuICpcbiAqIEBicmllZiA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IG1hcEh0bWxFc2NhcGUgPSB7XG4gKiAgICAgJzwnIDogJyZsdDsnLFxuICogICAgICc+JyA6ICcmZ3Q7JyxcbiAqICAgICAnJicgOiAnJmFtcDsnLFxuICogICAgICfigLMnOiAnJnF1b3Q7JyxcbiAqICAgICBgJ2AgOiAnJiMzOTsnLFxuICogICAgICdgJyA6ICcmI3g2MDsnXG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBlc2NhcGVIVE1MID0gY3JlYXRlRXNjYXBlcihtYXBIdG1sRXNjYXBlKTtcblxuLyoqXG4gKiBAZW4gVW5lc2NhcGUgSFRNTCBzdHJpbmcuXG4gKiBAamEgSFRNTCDjgafkvb/nlKjjgZnjgovliLblvqHmloflrZfjgpLlvqnlhYNcbiAqL1xuZXhwb3J0IGNvbnN0IHVuZXNjYXBlSFRNTCA9IGNyZWF0ZUVzY2FwZXIoaW52ZXJ0KG1hcEh0bWxFc2NhcGUpKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gdGhlIHN0eWxlIGNvbXB1bHNpb24gdmFsdWUgZnJvbSBpbnB1dCBzdHJpbmcuXG4gKiBAamEg5YWl5Yqb5paH5a2X5YiX44KS5Z6L5by35Yi244GX44Gf5YCk44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgaW5wdXQgc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WvvuixoeOBruaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9UeXBlZERhdGEoZGF0YTogc3RyaW5nIHwgdW5kZWZpbmVkKTogVHlwZWREYXRhIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoJ3RydWUnID09PSBkYXRhKSB7XG4gICAgICAgIC8vIGJvb2xlYW46IHRydWVcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICgnZmFsc2UnID09PSBkYXRhKSB7XG4gICAgICAgIC8vIGJvb2xlYW46IGZhbHNlXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKCdudWxsJyA9PT0gZGF0YSkge1xuICAgICAgICAvLyBudWxsXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoZGF0YSA9PT0gU3RyaW5nKE51bWJlcihkYXRhKSkpIHtcbiAgICAgICAgLy8gbnVtYmVyOiDmlbDlgKTlpInmj5sg4oaSIOaWh+Wtl+WIl+WkieaPm+OBp+WFg+OBq+aIu+OCi+OBqOOBjVxuICAgICAgICByZXR1cm4gTnVtYmVyKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSAmJiAvXig/Olxce1tcXHdcXFddKlxcfXxcXFtbXFx3XFxXXSpcXF0pJC8udGVzdChkYXRhKSkge1xuICAgICAgICAvLyBvYmplY3RcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc3RyaW5nIC8gdW5kZWZpbmVkXG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBzdHJpbmcgZnJvbSB7QGxpbmsgVHlwZWREYXRhfS5cbiAqIEBqYSB7QGxpbmsgVHlwZWREYXRhfSDjgpLmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBpbnB1dCBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5a++6LGh44Gu5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tVHlwZWREYXRhKGRhdGE6IFR5cGVkRGF0YSB8IHVuZGVmaW5lZCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKHVuZGVmaW5lZCA9PT0gZGF0YSB8fCBpc1N0cmluZyhkYXRhKSkge1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGRhdGEpKSB7XG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gU3RyaW5nKGRhdGEpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBgV2ViIEFQSWAgc3RvY2tlZCB0eXBlLiA8YnI+XG4gKiAgICAgRW5zdXJlIG5vdCB0byByZXR1cm4gYHVuZGVmaW5lZGAgdmFsdWUuXG4gKiBAamEgYFdlYiBBUElgIOagvOe0jeW9ouW8j+OBq+WkieaPmyA8YnI+XG4gKiAgICAgYHVuZGVmaW5lZGAg44KS6L+U5Y2044GX44Gq44GE44GT44Go44KS5L+d6Ki8XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkcm9wVW5kZWZpbmVkPFQ+KHZhbHVlOiBUIHwgbnVsbCB8IHVuZGVmaW5lZCwgbnVsbGlzaFNlcmlhbGl6ZSA9IGZhbHNlKTogVCB8ICdudWxsJyB8ICd1bmRlZmluZWQnIHwgbnVsbCB7XG4gICAgcmV0dXJuIHZhbHVlID8/IChudWxsaXNoU2VyaWFsaXplID8gU3RyaW5nKHZhbHVlKSA6IG51bGwpIGFzIFQgfCAnbnVsbCcgfCAndW5kZWZpbmVkJyB8IG51bGw7XG59XG5cbi8qKlxuICogQGVuIERlc2VyaWFsaXplIGZyb20gYFdlYiBBUElgIHN0b2NrZWQgdHlwZS4gPGJyPlxuICogICAgIENvbnZlcnQgZnJvbSAnbnVsbCcgb3IgJ3VuZGVmaW5lZCcgc3RyaW5nIHRvIG9yaWdpbmFsIHR5cGUuXG4gKiBAamEgJ251bGwnIG9yICd1bmRlZmluZWQnIOOCkuOCguOBqOOBruWei+OBq+aIu+OBmVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzdG9yZU51bGxpc2g8VD4odmFsdWU6IFQgfCAnbnVsbCcgfCAndW5kZWZpbmVkJyk6IFQgfCBudWxsIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoJ251bGwnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKCd1bmRlZmluZWQnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovIGxldCBfbG9jYWxJZCA9IDA7XG5cbi8qKlxuICogQGVuIEdldCBsb2NhbCB1bmlxdWUgaWQuIDxicj5cbiAqICAgICBcImxvY2FsIHVuaXF1ZVwiIG1lYW5zIGd1YXJhbnRlZXMgdW5pcXVlIGR1cmluZyBpbiBzY3JpcHQgbGlmZSBjeWNsZSBvbmx5LlxuICogQGphIOODreODvOOCq+ODq+ODpuODi+ODvOOCryBJRCDjga7lj5blvpcgPGJyPlxuICogICAgIOOCueOCr+ODquODl+ODiOODqeOCpOODleOCteOCpOOCr+ODq+S4reOBruWQjOS4gOaAp+OCkuS/neiovOOBmeOCiy5cbiAqXG4gKiBAcGFyYW0gcHJlZml4XG4gKiAgLSBgZW5gIElEIHByZWZpeFxuICogIC0gYGphYCBJRCDjgavku5jkuI7jgZnjgosgUHJlZml4XG4gKiBAcGFyYW0gemVyb1BhZFxuICogIC0gYGVuYCAwIHBhZGRpbmcgb3JkZXJcbiAqICAtIGBqYWAgMCDoqbDjgoHjgZnjgovmoYHmlbDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGx1aWQocHJlZml4ID0gJycsIHplcm9QYWQ/OiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IGlkID0gKCsrX2xvY2FsSWQpLnRvU3RyaW5nKDE2KTtcbiAgICByZXR1cm4gKG51bGwgIT0gemVyb1BhZCkgPyBgJHtwcmVmaXh9JHtpZC5wYWRTdGFydCh6ZXJvUGFkLCAnMCcpfWAgOiBgJHtwcmVmaXh9JHtpZH1gO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBgMGAgYW5kIGBtYXhgLCBpbmNsdXNpdmUuXG4gKiBAamEgYDBgIC0gYG1heGAg44Gu44Op44Oz44OA44Og44Gu5pW05pWw5YCk44KS55Sf5oiQXG4gKlxuICogQHBhcmFtIG1heFxuICogIC0gYGVuYCBUaGUgbWF4aW11bSByYW5kb20gbnVtYmVyLlxuICogIC0gYGphYCDmlbTmlbDjga7mnIDlpKflgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmRvbUludChtYXg6IG51bWJlcik6IG51bWJlcjtcblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gYG1pbmAgYW5kIGBtYXhgLCBpbmNsdXNpdmUuXG4gKiBAamEgYG1pbmAgLSBgbWF4YCDjga7jg6njg7Pjg4Djg6Djga7mlbTmlbDlgKTjgpLnlJ/miJBcbiAqXG4gKiBAcGFyYW0gbWluXG4gKiAgLSBgZW5gIFRoZSBtYXhpbXVtIHJhbmRvbSBudW1iZXIuXG4gKiAgLSBgamFgIOaVtOaVsOOBruacgOWkp+WApFxuICogQHBhcmFtIG1heFxuICogIC0gYGVuYCBUaGUgbWF4aW11bSByYW5kb20gbnVtYmVyLlxuICogIC0gYGphYCDmlbTmlbDjga7mnIDlpKflgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmRvbUludChtaW46IG51bWJlciwgbWF4OiBudW1iZXIpOiBudW1iZXI7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuaWZpZWQtc2lnbmF0dXJlc1xuXG5leHBvcnQgZnVuY3Rpb24gcmFuZG9tSW50KG1pbjogbnVtYmVyLCBtYXg/OiBudW1iZXIpOiBudW1iZXIge1xuICAgIGlmIChudWxsID09IG1heCkge1xuICAgICAgICBtYXggPSBtaW47XG4gICAgICAgIG1pbiA9IDA7XG4gICAgfVxuICAgIHJldHVybiBtaW4gKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcmVnZXhDYW5jZWxMaWtlU3RyaW5nID0gLyhhYm9ydHxjYW5jZWwpL2ltO1xuXG4vKipcbiAqIEBlbiBQcmVzdW1lIHdoZXRoZXIgaXQncyBhIGNhbmNlbGVkIGVycm9yLlxuICogQGphIOOCreODo+ODs+OCu+ODq+OBleOCjOOBn+OCqOODqeODvOOBp+OBguOCi+OBi+aOqOWumlxuICpcbiAqIEBwYXJhbSBlcnJvclxuICogIC0gYGVuYCBhbiBlcnJvciBvYmplY3QgaGFuZGxlZCBpbiBgY2F0Y2hgIGJsb2NrLlxuICogIC0gYGphYCBgY2F0Y2hgIOevgOOBquOBqeOBp+ijnOi2s+OBl+OBn+OCqOODqeODvOOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNDYW5jZWxMaWtlRXJyb3IoZXJyb3I6IHVua25vd24pOiBib29sZWFuIHtcbiAgICBpZiAobnVsbCA9PSBlcnJvcikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmIChpc1N0cmluZyhlcnJvcikpIHtcbiAgICAgICAgcmV0dXJuIF9yZWdleENhbmNlbExpa2VTdHJpbmcudGVzdChlcnJvcik7XG4gICAgfSBlbHNlIGlmIChpc09iamVjdChlcnJvcikpIHtcbiAgICAgICAgcmV0dXJuIF9yZWdleENhbmNlbExpa2VTdHJpbmcudGVzdCgoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBmaXJzdCBsZXR0ZXIgb2YgdGhlIHN0cmluZyB0byB1cHBlcmNhc2UuXG4gKiBAamEg5pyA5Yid44Gu5paH5a2X44KS5aSn5paH5a2X44Gr5aSJ5o+bXG4gKlxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2FwaXRhbGl6ZShcImZvbyBCYXJcIik7XG4gKiAvLyA9PiBcIkZvbyBCYXJcIlxuICpcbiAqIGNhcGl0YWxpemUoXCJGT08gQmFyXCIsIHRydWUpO1xuICogLy8gPT4gXCJGb28gYmFyXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqIEBwYXJhbSBsb3dlcmNhc2VSZXN0XG4gKiAgLSBgZW5gIElmIGB0cnVlYCBpcyBwYXNzZWQsIHRoZSByZXN0IG9mIHRoZSBzdHJpbmcgd2lsbCBiZSBjb252ZXJ0ZWQgdG8gbG93ZXIgY2FzZVxuICogIC0gYGphYCBgdHJ1ZWAg44KS5oyH5a6a44GX44Gf5aC05ZCILCAy5paH5a2X55uu5Lul6ZmN44KC5bCP5paH5a2X5YyWXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYXBpdGFsaXplKHNyYzogc3RyaW5nLCBsb3dlcmNhc2VSZXN0ID0gZmFsc2UpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlbWFpbmluZ0NoYXJzID0gIWxvd2VyY2FzZVJlc3QgPyBzcmMuc2xpY2UoMSkgOiBzcmMuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcbiAgICByZXR1cm4gc3JjLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcmVtYWluaW5nQ2hhcnM7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIGZpcnN0IGxldHRlciBvZiB0aGUgc3RyaW5nIHRvIGxvd2VyY2FzZS5cbiAqIEBqYSDmnIDliJ3jga7mloflrZfjgpLlsI/mloflrZfljJZcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGRlY2FwaXRhbGl6ZShcIkZvbyBCYXJcIik7XG4gKiAvLyA9PiBcImZvbyBCYXJcIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVjYXBpdGFsaXplKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc3JjLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgc3JjLnNsaWNlKDEpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyB1bmRlcnNjb3JlZCBvciBkYXNoZXJpemVkIHN0cmluZyB0byBhIGNhbWVsaXplZCBvbmUuIDxicj5cbiAqICAgICBCZWdpbnMgd2l0aCBhIGxvd2VyIGNhc2UgbGV0dGVyIHVubGVzcyBpdCBzdGFydHMgd2l0aCBhbiB1bmRlcnNjb3JlLCBkYXNoIG9yIGFuIHVwcGVyIGNhc2UgbGV0dGVyLlxuICogQGphIGBfYCwgYC1gIOWMuuWIh+OCiuaWh+Wtl+WIl+OCkuOCreODo+ODoeODq+OCseODvOOCueWMliA8YnI+XG4gKiAgICAgYC1gIOOBvuOBn+OBr+Wkp+aWh+Wtl+OCueOCv+ODvOODiOOBp+OBguOCjOOBsCwg5aSn5paH5a2X44K544K/44O844OI44GM5pei5a6a5YCkXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjYW1lbGl6ZShcIm1vei10cmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIm1velRyYW5zZm9ybVwiXG4gKlxuICogY2FtZWxpemUoXCItbW96LXRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwiTW96VHJhbnNmb3JtXCJcbiAqXG4gKiBjYW1lbGl6ZShcIl9tb3pfdHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJNb3pUcmFuc2Zvcm1cIlxuICpcbiAqIGNhbWVsaXplKFwiTW96LXRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwiTW96VHJhbnNmb3JtXCJcbiAqXG4gKiBjYW1lbGl6ZShcIi1tb3otdHJhbnNmb3JtXCIsIHRydWUpO1xuICogLy8gPT4gXCJtb3pUcmFuc2Zvcm1cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICogQHBhcmFtIGxvd2VyXG4gKiAgLSBgZW5gIElmIGB0cnVlYCBpcyBwYXNzZWQsIGZvcmNlIGNvbnZlcnRzIHRvIGxvd2VyIGNhbWVsIGNhc2UgaW4gc3RhcnRzIHdpdGggdGhlIHNwZWNpYWwgY2FzZS5cbiAqICAtIGBqYWAg5by35Yi255qE44Gr5bCP5paH5a2X44K544K/44O844OI44GZ44KL5aC05ZCI44Gr44GvIGB0cnVlYCDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhbWVsaXplKHNyYzogc3RyaW5nLCBsb3dlciA9IGZhbHNlKTogc3RyaW5nIHtcbiAgICBzcmMgPSBzcmMudHJpbSgpLnJlcGxhY2UoL1stX1xcc10rKC4pPy9nLCAobWF0Y2gsIGMpID0+IHtcbiAgICAgICAgcmV0dXJuIGMgPyBjLnRvVXBwZXJDYXNlKCkgOiAnJztcbiAgICB9KTtcblxuICAgIGlmICh0cnVlID09PSBsb3dlcikge1xuICAgICAgICByZXR1cm4gZGVjYXBpdGFsaXplKHNyYyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHNyYztcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIHN0cmluZyB0byBjYW1lbGl6ZWQgY2xhc3MgbmFtZS4gRmlyc3QgbGV0dGVyIGlzIGFsd2F5cyB1cHBlciBjYXNlLlxuICogQGphIOWFiOmgreWkp+aWh+Wtl+OBruOCreODo+ODoeODq+OCseODvOOCueOBq+WkieaPm1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2xhc3NpZnkoXCJzb21lX2NsYXNzX25hbWVcIik7XG4gKiAvLyA9PiBcIlNvbWVDbGFzc05hbWVcIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gY2xhc3NpZnkoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBjYXBpdGFsaXplKGNhbWVsaXplKHNyYy5yZXBsYWNlKC9bXFxXX10vZywgJyAnKSkucmVwbGFjZSgvXFxzL2csICcnKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIGEgY2FtZWxpemVkIG9yIGRhc2hlcml6ZWQgc3RyaW5nIGludG8gYW4gdW5kZXJzY29yZWQgb25lLlxuICogQGphIOOCreODo+ODoeODq+OCseODvOOCuSBvciBgLWAg44Gk44Gq44GO5paH5a2X5YiX44KSIGBfYCDjgaTjgarjgY7jgavlpInmj5tcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIHVuZGVyc2NvcmVkKFwiTW96VHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJtb3pfdHJhbnNmb3JtXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuZGVyc2NvcmVkKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc3JjLnRyaW0oKS5yZXBsYWNlKC8oW2EtelxcZF0pKFtBLVpdKykvZywgJyQxXyQyJykucmVwbGFjZSgvWy1cXHNdKy9nLCAnXycpLnRvTG93ZXJDYXNlKCk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIGEgdW5kZXJzY29yZWQgb3IgY2FtZWxpemVkIHN0cmluZyBpbnRvIGFuIGRhc2hlcml6ZWQgb25lLlxuICogQGphIOOCreODo+ODoeODq+OCseODvOOCuSBvciBgX2Ag44Gk44Gq44GO5paH5a2X5YiX44KSIGAtYCDjgaTjgarjgY7jgavlpInmj5tcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGRhc2hlcml6ZShcIk1velRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwiLW1vei10cmFuc2Zvcm1cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGFzaGVyaXplKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc3JjLnRyaW0oKS5yZXBsYWNlKC8oW0EtWl0pL2csICctJDEnKS5yZXBsYWNlKC9bX1xcc10rL2csICctJykudG9Mb3dlckNhc2UoKTtcbn1cbiIsImltcG9ydCB0eXBlIHsgVW5rbm93bk9iamVjdCwgQWNjZXNzaWJsZSB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgYXNzaWduVmFsdWUgfSBmcm9tICcuL2RlZXAtY2lyY3VpdCc7XG5pbXBvcnQgeyByYW5kb21JbnQgfSBmcm9tICcuL21pc2MnO1xuXG4vKipcbiAqIEBlbiBFeGVjdXRlIHNodWZmbGUgb2YgYW4gYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6YWN5YiX6KaB57Sg44Gu44K344Oj44OD44OV44OrXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBkZXN0cnVjdGl2ZVxuICogIC0gYGVuYCB0cnVlOiBkZXN0cnVjdGl2ZSAvIGZhbHNlOiBub24tZGVzdHJ1Y3RpdmUgKGRlZmF1bHQpXG4gKiAgLSBgamFgIHRydWU6IOegtOWjiueahCAvIGZhbHNlOiDpnZ7noLTlo4rnmoQgKOaXouWumilcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGU8VD4oYXJyYXk6IFRbXSwgZGVzdHJ1Y3RpdmUgPSBmYWxzZSk6IFRbXSB7XG4gICAgY29uc3Qgc291cmNlID0gZGVzdHJ1Y3RpdmUgPyBhcnJheSA6IGFycmF5LnNsaWNlKCk7XG4gICAgY29uc3QgbGVuID0gc291cmNlLmxlbmd0aDtcbiAgICBmb3IgKGxldCBpID0gbGVuID4gMCA/IGxlbiA+Pj4gMCA6IDA7IGkgPiAxOykge1xuICAgICAgICBjb25zdCBqID0gaSAqIE1hdGgucmFuZG9tKCkgPj4+IDA7XG4gICAgICAgIGNvbnN0IHN3YXAgPSBzb3VyY2VbLS1pXTtcbiAgICAgICAgc291cmNlW2ldID0gc291cmNlW2pdO1xuICAgICAgICBzb3VyY2Vbal0gPSBzd2FwO1xuICAgIH1cbiAgICByZXR1cm4gc291cmNlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gRXhlY3V0ZSBzdGFibGUgc29ydCBieSBtZXJnZS1zb3J0IGFsZ29yaXRobS5cbiAqIEBqYSBgbWVyZ2Utc29ydGAg44Gr44KI44KL5a6J5a6a44K944O844OIXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjb21wYXJhdG9yXG4gKiAgLSBgZW5gIHNvcnQgY29tcGFyYXRvciBmdW5jdGlvblxuICogIC0gYGphYCDjgr3jg7zjg4jplqLmlbDjgpLmjIflrppcbiAqIEBwYXJhbSBkZXN0cnVjdGl2ZVxuICogIC0gYGVuYCB0cnVlOiBkZXN0cnVjdGl2ZSAvIGZhbHNlOiBub24tZGVzdHJ1Y3RpdmUgKGRlZmF1bHQpXG4gKiAgLSBgamFgIHRydWU6IOegtOWjiueahCAvIGZhbHNlOiDpnZ7noLTlo4rnmoQgKOaXouWumilcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNvcnQ8VD4oYXJyYXk6IFRbXSwgY29tcGFyYXRvcjogKGxoczogVCwgcmhzOiBUKSA9PiBudW1iZXIsIGRlc3RydWN0aXZlID0gZmFsc2UpOiBUW10ge1xuICAgIGNvbnN0IHNvdXJjZSA9IGRlc3RydWN0aXZlID8gYXJyYXkgOiBhcnJheS5zbGljZSgpO1xuICAgIGlmIChzb3VyY2UubGVuZ3RoIDwgMikge1xuICAgICAgICByZXR1cm4gc291cmNlO1xuICAgIH1cbiAgICBjb25zdCBsaHMgPSBzb3J0KHNvdXJjZS5zcGxpY2UoMCwgc291cmNlLmxlbmd0aCA+Pj4gMSksIGNvbXBhcmF0b3IsIHRydWUpO1xuICAgIGNvbnN0IHJocyA9IHNvcnQoc291cmNlLnNwbGljZSgwKSwgY29tcGFyYXRvciwgdHJ1ZSk7XG4gICAgd2hpbGUgKGxocy5sZW5ndGggJiYgcmhzLmxlbmd0aCkge1xuICAgICAgICBzb3VyY2UucHVzaChjb21wYXJhdG9yKGxoc1swXSwgcmhzWzBdKSA8PSAwID8gbGhzLnNoaWZ0KCkgYXMgVCA6IHJocy5zaGlmdCgpIGFzIFQpO1xuICAgIH1cbiAgICByZXR1cm4gc291cmNlLmNvbmNhdChsaHMsIHJocyk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNYWtlIHVuaXF1ZSBhcnJheS5cbiAqIEBqYSDph43opIfopoHntKDjga7jgarjgYTphY3liJfjga7kvZzmiJBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdW5pcXVlPFQ+KGFycmF5OiBUW10pOiBUW10ge1xuICAgIHJldHVybiBbLi4ubmV3IFNldChhcnJheSldO1xufVxuXG4vKipcbiAqIEBlbiBNYWtlIHVuaW9uIGFycmF5LlxuICogQGphIOmFjeWIl+OBruWSjOmbhuWQiOOCkui/lOWNtFxuICpcbiAqIEBwYXJhbSBhcnJheXNcbiAqICAtIGBlbmAgc291cmNlIGFycmF5c1xuICogIC0gYGphYCDlhaXlipvphY3liJfnvqRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuaW9uPFQ+KC4uLmFycmF5czogVFtdW10pOiBUW10ge1xuICAgIHJldHVybiB1bmlxdWUoYXJyYXlzLmZsYXQoKSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBHZXQgdGhlIG1vZGVsIGF0IHRoZSBnaXZlbiBpbmRleC4gSWYgbmVnYXRpdmUgdmFsdWUgaXMgZ2l2ZW4sIHRoZSB0YXJnZXQgd2lsbCBiZSBmb3VuZCBmcm9tIHRoZSBsYXN0IGluZGV4LlxuICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBq+OCiOOCi+ODouODh+ODq+OBuOOBruOCouOCr+OCu+OCuS4g6LKg5YCk44Gu5aC05ZCI44Gv5pyr5bC+5qSc57Si44KS5a6f6KGMXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGVuYCBBIHplcm8tYmFzZWQgaW50ZWdlciBpbmRpY2F0aW5nIHdoaWNoIGVsZW1lbnQgdG8gcmV0cmlldmUuIDxicj4gSWYgbmVnYXRpdmUgaW5kZXggaXMgY291bnRlZCBmcm9tIHRoZSBlbmQgb2YgdGhlIG1hdGNoZWQgc2V0LlxuICogIC0gYGphYCAwIGJhc2Ug44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aIDxicj4g6LKg5YCk44GM5oyH5a6a44GV44KM44Gf5aC05ZCILCDmnKvlsL7jgYvjgonjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgajjgZfjgabop6Pph4jjgZXjgozjgotcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGF0PFQ+KGFycmF5OiBUW10sIGluZGV4OiBudW1iZXIpOiBUIHwgbmV2ZXIge1xuICAgIGNvbnN0IGlkeCA9IE1hdGgudHJ1bmMoaW5kZXgpO1xuICAgIGNvbnN0IGVsID0gaWR4IDwgMCA/IGFycmF5W2lkeCArIGFycmF5Lmxlbmd0aF0gOiBhcnJheVtpZHhdO1xuICAgIGlmIChudWxsID09IGVsKSB7XG4gICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKGBpbnZhbGlkIGFycmF5IGluZGV4LiBbbGVuZ3RoOiAke2FycmF5Lmxlbmd0aH0sIGdpdmVuOiAke2luZGV4fV1gKTtcbiAgICB9XG4gICAgcmV0dXJuIGVsO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWFrZSBpbmRleCBhcnJheS5cbiAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJfjga7kvZzmiJBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGV4Y2x1ZGVzXG4gKiAgLSBgZW5gIGV4Y2x1ZGUgaW5kZXggaW4gcmV0dXJuIHZhbHVlLlxuICogIC0gYGphYCDmiLvjgorlgKTphY3liJfjgavlkKvjgoHjgarjgYTjgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluZGljZXM8VD4oYXJyYXk6IFRbXSwgLi4uZXhjbHVkZXM6IG51bWJlcltdKTogbnVtYmVyW10ge1xuICAgIGNvbnN0IHJldHZhbCA9IFsuLi5hcnJheS5rZXlzKCldO1xuXG4gICAgY29uc3QgbGVuID0gYXJyYXkubGVuZ3RoO1xuICAgIGNvbnN0IGV4TGlzdCA9IFsuLi5uZXcgU2V0KGV4Y2x1ZGVzKV0uc29ydCgobGhzLCByaHMpID0+IGxocyA8IHJocyA/IDEgOiAtMSk7XG4gICAgZm9yIChjb25zdCBleCBvZiBleExpc3QpIHtcbiAgICAgICAgaWYgKDAgPD0gZXggJiYgZXggPCBsZW4pIHtcbiAgICAgICAgICAgIHJldHZhbC5zcGxpY2UoZXgsIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIHtAbGluayBncm91cEJ5fSgpIG9wdGlvbnMgZGVmaW5pdGlvbi5cbiAqIEBqYSB7QGxpbmsgZ3JvdXBCeX0oKSDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7PlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBHcm91cEJ5T3B0aW9uczxcbiAgICBUIGV4dGVuZHMgb2JqZWN0LFxuICAgIFRLRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUU1VNS0VZUyBleHRlbmRzIGtleW9mIFQsXG4gICAgVEdST1VQS0VZIGV4dGVuZHMgc3RyaW5nXG4+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gYEdST1VQIEJZYCBrZXlzLlxuICAgICAqIEBqYSBgR1JPVVAgQllgIOOBq+aMh+WumuOBmeOCi+OCreODvFxuICAgICAqL1xuICAgIGtleXM6IEV4dHJhY3Q8VEtFWVMsIHN0cmluZz5bXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZ2dyZWdhdGFibGUga2V5cy5cbiAgICAgKiBAamEg6ZuG6KiI5Y+v6IO944Gq44Kt44O85LiA6KanXG4gICAgICovXG4gICAgc3VtS2V5cz86IEV4dHJhY3Q8VFNVTUtFWVMsIHN0cmluZz5bXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBHcm91cGVkIGl0ZW0gYWNjZXNzIGtleS4gZGVmYXVsdDogJ2l0ZW1zJyxcbiAgICAgKiBAamEg44Kw44Or44O844OU44Oz44Kw44GV44KM44Gf6KaB57Sg44G444Gu44Ki44Kv44K744K544Kt44O8LiDml6Llrpo6ICdpdGVtcydcbiAgICAgKi9cbiAgICBncm91cEtleT86IFRHUk9VUEtFWTtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJuIHR5cGUgb2Yge0BsaW5rIGdyb3VwQnl9KCkuXG4gKiBAamEge0BsaW5rIGdyb3VwQnl9KCkg44GM6L+U5Y2044GZ44KL5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIEdyb3VwQnlSZXR1cm5WYWx1ZTxcbiAgICBUIGV4dGVuZHMgb2JqZWN0LFxuICAgIFRLRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUU1VNS0VZUyBleHRlbmRzIGtleW9mIFQgPSBuZXZlcixcbiAgICBUR1JPVVBLRVkgZXh0ZW5kcyBzdHJpbmcgPSAnaXRlbXMnXG4+ID0gUmVhZG9ubHk8UmVjb3JkPFRLRVlTLCB1bmtub3duPiAmIFJlY29yZDxUU1VNS0VZUywgdW5rbm93bj4gJiBSZWNvcmQ8VEdST1VQS0VZLCBUW10+PjtcblxuLyoqXG4gKiBAZW4gRXhlY3V0ZSBgR1JPVVAgQllgIGZvciBhcnJheSBlbGVtZW50cy5cbiAqIEBqYSDphY3liJfjga7opoHntKDjga4gYEdST1VQIEJZYCDpm4blkIjjgpLmir3lh7pcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgYEdST1VQIEJZYCBvcHRpb25zXG4gKiAgLSBgamFgIGBHUk9VUCBCWWAg44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBncm91cEJ5PFxuICAgIFQgZXh0ZW5kcyBvYmplY3QsXG4gICAgVEtFWVMgZXh0ZW5kcyBrZXlvZiBULFxuICAgIFRTVU1LRVlTIGV4dGVuZHMga2V5b2YgVCA9IG5ldmVyLFxuICAgIFRHUk9VUEtFWSBleHRlbmRzIHN0cmluZyA9ICdpdGVtcydcbj4oYXJyYXk6IFRbXSwgb3B0aW9uczogR3JvdXBCeU9wdGlvbnM8VCwgVEtFWVMsIFRTVU1LRVlTLCBUR1JPVVBLRVk+KTogR3JvdXBCeVJldHVyblZhbHVlPFQsIFRLRVlTLCBUU1VNS0VZUywgVEdST1VQS0VZPltdIHtcbiAgICBjb25zdCB7IGtleXMsIHN1bUtleXMsIGdyb3VwS2V5IH0gPSBvcHRpb25zO1xuICAgIGNvbnN0IF9ncm91cEtleSA9IGdyb3VwS2V5ID8/ICdpdGVtcyc7XG4gICAgY29uc3QgX3N1bUtleXM6IHN0cmluZ1tdID0gc3VtS2V5cyA/PyBbXTtcbiAgICBfc3VtS2V5cy5wdXNoKF9ncm91cEtleSk7XG5cbiAgICBjb25zdCBoYXNoID0gYXJyYXkucmVkdWNlKChyZXM6IEFjY2Vzc2libGU8VD4sIGRhdGE6IEFjY2Vzc2libGU8VD4pID0+IHtcbiAgICAgICAgLy8gY3JlYXRlIGdyb3VwQnkgaW50ZXJuYWwga2V5XG4gICAgICAgIGNvbnN0IF9rZXkgPSBrZXlzLnJlZHVjZSgocywgaykgPT4gcyArIFN0cmluZyhkYXRhW2tdKSwgJycpO1xuXG4gICAgICAgIC8vIGluaXQga2V5c1xuICAgICAgICBpZiAoIShfa2V5IGluIHJlcykpIHtcbiAgICAgICAgICAgIGNvbnN0IGtleUxpc3QgPSBrZXlzLnJlZHVjZSgoaDogVW5rbm93bk9iamVjdCwgazogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgYXNzaWduVmFsdWUoaCwgaywgZGF0YVtrXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGg7XG4gICAgICAgICAgICB9LCB7fSk7XG5cbiAgICAgICAgICAgIChyZXNbX2tleV0gYXMgVW5rbm93bk9iamVjdCkgPSBfc3VtS2V5cy5yZWR1Y2UoKGgsIGs6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIGhba10gPSAwO1xuICAgICAgICAgICAgICAgIHJldHVybiBoO1xuICAgICAgICAgICAgfSwga2V5TGlzdCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByZXNLZXkgPSByZXNbX2tleV0gYXMgYW55OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuICAgICAgICAvLyBzdW0gcHJvcGVydGllc1xuICAgICAgICBmb3IgKGNvbnN0IGsgb2YgX3N1bUtleXMpIHtcbiAgICAgICAgICAgIGlmIChfZ3JvdXBLZXkgPT09IGspIHtcbiAgICAgICAgICAgICAgICByZXNLZXlba10gPSByZXNLZXlba10gfHwgW107IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci1udWxsaXNoLWNvYWxlc2NpbmdcbiAgICAgICAgICAgICAgICByZXNLZXlba10ucHVzaChkYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzS2V5W2tdICs9IGRhdGFba10gYXMgbnVtYmVyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9LCB7fSk7XG5cbiAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyhoYXNoKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbXB1dGVzIHRoZSBsaXN0IG9mIHZhbHVlcyB0aGF0IGFyZSB0aGUgaW50ZXJzZWN0aW9uIG9mIGFsbCB0aGUgYXJyYXlzLiBFYWNoIHZhbHVlIGluIHRoZSByZXN1bHQgaXMgcHJlc2VudCBpbiBlYWNoIG9mIHRoZSBhcnJheXMuXG4gKiBAamEg6YWN5YiX44Gu56mN6ZuG5ZCI44KS6L+U5Y20LiDov5TljbTjgZXjgozjgZ/phY3liJfjga7opoHntKDjga/jgZnjgbnjgabjga7lhaXlipvjgZXjgozjgZ/phY3liJfjgavlkKvjgb7jgozjgotcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnNvbGUubG9nKGludGVyc2VjdGlvbihbMSwgMiwgM10sIFsxMDEsIDIsIDEsIDEwXSwgWzIsIDFdKSk7XG4gKiAvLyA9PiBbMSwgMl1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheXNcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gaW50ZXJzZWN0aW9uPFQ+KC4uLmFycmF5czogVFtdW10pOiBUW10ge1xuICAgIHJldHVybiBhcnJheXMucmVkdWNlKChhY2MsIGFyeSkgPT4gYWNjLmZpbHRlcihlbCA9PiBhcnkuaW5jbHVkZXMoZWwpKSk7XG59XG5cbi8qKlxuICogQGVuIFJldHVybnMgdGhlIHZhbHVlcyBmcm9tIGFycmF5IHRoYXQgYXJlIG5vdCBwcmVzZW50IGluIHRoZSBvdGhlciBhcnJheXMuXG4gKiBAamEg6YWN5YiX44GL44KJ44G744GL44Gu6YWN5YiX44Gr5ZCr44G+44KM44Gq44GE44KC44Gu44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zb2xlLmxvZyhkaWZmZXJlbmNlKFsxLCAyLCAzLCA0LCA1XSwgWzUsIDIsIDEwXSkpO1xuICogLy8gPT4gWzEsIDMsIDRdXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIG90aGVyc1xuICogIC0gYGVuYCBleGNsdWRlIGVsZW1lbnQgaW4gcmV0dXJuIHZhbHVlLlxuICogIC0gYGphYCDmiLvjgorlgKTphY3liJfjgavlkKvjgoHjgarjgYTopoHntKDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpZmZlcmVuY2U8VD4oYXJyYXk6IFRbXSwgLi4ub3RoZXJzOiBUW11bXSk6IFRbXSB7XG4gICAgY29uc3QgYXJyYXlzID0gW2FycmF5LCAuLi5vdGhlcnNdIGFzIFRbXVtdO1xuICAgIHJldHVybiBhcnJheXMucmVkdWNlKChhY2MsIGFyeSkgPT4gYWNjLmZpbHRlcihlbCA9PiAhYXJ5LmluY2x1ZGVzKGVsKSkpO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgY29weSBvZiB0aGUgYXJyYXkgd2l0aCBhbGwgaW5zdGFuY2VzIG9mIHRoZSB2YWx1ZXMgcmVtb3ZlZC5cbiAqIEBqYSDphY3liJfjgYvjgonmjIflrpropoHntKDjgpLlj5bjgorpmaTjgYTjgZ/jgoLjga7jgpLov5TljbRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnNvbGUubG9nKHdpdGhvdXQoWzEsIDIsIDEsIDAsIDMsIDEsIDRdLCAwLCAxKSk7XG4gKiAvLyA9PiBbMiwgMywgNF1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gdmFsdWVzXG4gKiAgLSBgZW5gIGV4Y2x1ZGUgZWxlbWVudCBpbiByZXR1cm4gdmFsdWUuXG4gKiAgLSBgamFgIOaIu+OCiuWApOmFjeWIl+OBq+WQq+OCgeOBquOBhOimgee0oOOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aG91dDxUPihhcnJheTogVFtdLCAuLi52YWx1ZXM6IFRbXSk6IFRbXSB7XG4gICAgcmV0dXJuIGRpZmZlcmVuY2UoYXJyYXksIHZhbHVlcyk7XG59XG5cbi8qKlxuICogQGVuIFByb2R1Y2UgYSByYW5kb20gc2FtcGxlIGZyb20gdGhlIGxpc3QuXG4gKiBAamEg44Op44Oz44OA44Og44Gr44K144Oz44OX44Or5YCk44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zb2xlLmxvZyhzYW1wbGUoWzEsIDIsIDMsIDQsIDUsIDZdLCAzKSk7XG4gKiAvLyA9PiBbMSwgNiwgMl1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY291bnRcbiAqICAtIGBlbmAgbnVtYmVyIG9mIHNhbXBsaW5nIGNvdW50LlxuICogIC0gYGphYCDov5TljbTjgZnjgovjgrXjg7Pjg5fjg6vmlbDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhbXBsZTxUPihhcnJheTogVFtdLCBjb3VudDogbnVtYmVyKTogVFtdO1xuXG4vKipcbiAqIEBlbiBQcm9kdWNlIGEgcmFuZG9tIHNhbXBsZSBmcm9tIHRoZSBsaXN0LlxuICogQGphIOODqeODs+ODgOODoOOBq+OCteODs+ODl+ODq+WApOOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc29sZS5sb2coc2FtcGxlKFsxLCAyLCAzLCA0LCA1LCA2XSkpO1xuICogLy8gPT4gNFxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhbXBsZTxUPihhcnJheTogVFtdKTogVDtcblxuZXhwb3J0IGZ1bmN0aW9uIHNhbXBsZTxUPihhcnJheTogVFtdLCBjb3VudD86IG51bWJlcik6IFQgfCBUW10ge1xuICAgIGlmIChudWxsID09IGNvdW50KSB7XG4gICAgICAgIHJldHVybiBhcnJheVtyYW5kb21JbnQoYXJyYXkubGVuZ3RoIC0gMSldO1xuICAgIH1cbiAgICBjb25zdCBzYW1wbGUgPSBhcnJheS5zbGljZSgpO1xuICAgIGNvbnN0IGxlbmd0aCA9IHNhbXBsZS5sZW5ndGg7XG4gICAgY291bnQgPSBNYXRoLm1heChNYXRoLm1pbihjb3VudCwgbGVuZ3RoKSwgMCk7XG4gICAgY29uc3QgbGFzdCA9IGxlbmd0aCAtIDE7XG4gICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGNvdW50OyBpbmRleCsrKSB7XG4gICAgICAgIGNvbnN0IHJhbmQgPSByYW5kb21JbnQoaW5kZXgsIGxhc3QpO1xuICAgICAgICBjb25zdCB0ZW1wID0gc2FtcGxlW2luZGV4XTtcbiAgICAgICAgc2FtcGxlW2luZGV4XSA9IHNhbXBsZVtyYW5kXTtcbiAgICAgICAgc2FtcGxlW3JhbmRdID0gdGVtcDtcbiAgICB9XG4gICAgcmV0dXJuIHNhbXBsZS5zbGljZSgwLCBjb3VudCk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgcmVzdWx0IG9mIHBlcm11dGF0aW9uIGZyb20gdGhlIGxpc3QuXG4gKiBAamEg6YWN5YiX44GL44KJ6aCG5YiX57WQ5p6c44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBhcnIgPSBwZXJtdXRhdGlvbihbJ2EnLCAnYicsICdjJ10sIDIpO1xuICogY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYXJyKSk7XG4gKiAvLyA9PiBbWydhJywnYiddLFsnYScsJ2MnXSxbJ2InLCdhJ10sWydiJywnYyddLFsnYycsJ2EnXSxbJ2MnLCdiJ11dXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNvdW50XG4gKiAgLSBgZW5gIG51bWJlciBvZiBwaWNrIHVwLlxuICogIC0gYGphYCDpgbjmip7mlbBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcm11dGF0aW9uPFQ+KGFycmF5OiBUW10sIGNvdW50OiBudW1iZXIpOiBUW11bXSB7XG4gICAgY29uc3QgcmV0dmFsOiBUW11bXSA9IFtdO1xuICAgIGlmIChhcnJheS5sZW5ndGggPCBjb3VudCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGlmICgxID09PSBjb3VudCkge1xuICAgICAgICBmb3IgKGNvbnN0IFtpLCB2YWxdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICAgICAgcmV0dmFsW2ldID0gW3ZhbF07XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbjEgPSBhcnJheS5sZW5ndGg7IGkgPCBuMTsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGFycmF5LnNsaWNlKDApO1xuICAgICAgICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gcGVybXV0YXRpb24ocGFydHMsIGNvdW50IC0gMSk7XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMCwgbjIgPSByb3cubGVuZ3RoOyBqIDwgbjI7IGorKykge1xuICAgICAgICAgICAgICAgIHJldHZhbC5wdXNoKFthcnJheVtpXV0uY29uY2F0KHJvd1tqXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSByZXN1bHQgb2YgY29tYmluYXRpb24gZnJvbSB0aGUgbGlzdC5cbiAqIEBqYSDphY3liJfjgYvjgonntYTjgb/lkIjjgo/jgZvntZDmnpzjgpLov5TljbRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGFyciA9IGNvbWJpbmF0aW9uKFsnYScsICdiJywgJ2MnXSwgMik7XG4gKiBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhcnIpKTtcbiAqIC8vID0+IFtbJ2EnLCdiJ10sWydhJywnYyddLFsnYicsJ2MnXV1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY291bnRcbiAqICAtIGBlbmAgbnVtYmVyIG9mIHBpY2sgdXAuXG4gKiAgLSBgamFgIOmBuOaKnuaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tYmluYXRpb248VD4oYXJyYXk6IFRbXSwgY291bnQ6IG51bWJlcik6IFRbXVtdIHtcbiAgICBjb25zdCByZXR2YWw6IFRbXVtdID0gW107XG4gICAgaWYgKGFycmF5Lmxlbmd0aCA8IGNvdW50KSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgaWYgKDEgPT09IGNvdW50KSB7XG4gICAgICAgIGZvciAoY29uc3QgW2ksIHZhbF0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgICAgICByZXR2YWxbaV0gPSBbdmFsXTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBuMSA9IGFycmF5Lmxlbmd0aDsgaSA8IG4xIC0gY291bnQgKyAxOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IGNvbWJpbmF0aW9uKGFycmF5LnNsaWNlKGkgKyAxKSwgY291bnQgLSAxKTtcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwLCBuMiA9IHJvdy5sZW5ndGg7IGogPCBuMjsgaisrKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsLnB1c2goW2FycmF5W2ldXS5jb25jYXQocm93W2pdKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5tYXAoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5tYXAoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIHRoaXNBcmdcbiAqICAtIGBlbmAgVmFsdWUgdG8gdXNlIGFzICp0aGlzKiB3aGVuIGV4ZWN1dGluZyB0aGUgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDlrp/ooYzjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCAqQXJyYXkqIGFzIHZhbHVlLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PntZDmnpzphY3liJfjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1hcDxULCBVPih0aGlzOiB1bmtub3duLCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVIHwgUHJvbWlzZTxVPiwgdGhpc0FyZz86IHVua25vd24pOiBQcm9taXNlPFVbXT4ge1xuICAgIHJldHVybiBQcm9taXNlLmFsbChcbiAgICAgICAgYXJyYXkubWFwKGFzeW5jICh2LCBpLCBhKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgY2FsbGJhY2suY2FsbCh0aGlzQXJnID8/IHRoaXMsIHYsIGksIGEpO1xuICAgICAgICB9KVxuICAgICk7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5maWx0ZXIoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5maWx0ZXIoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIHRoaXNBcmdcbiAqICAtIGBlbmAgVmFsdWUgdG8gdXNlIGFzICp0aGlzKiB3aGVuIGV4ZWN1dGluZyB0aGUgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDlrp/ooYzjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCAqQXJyYXkqIGFzIHZhbHVlLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PntZDmnpzphY3liJfjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbHRlcjxUPih0aGlzOiB1bmtub3duLCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBib29sZWFuIHwgUHJvbWlzZTxib29sZWFuPiwgdGhpc0FyZz86IHVua25vd24pOiBQcm9taXNlPFRbXT4ge1xuICAgIGNvbnN0IGJpdHM6IGJvb2xlYW5bXSA9IGF3YWl0IG1hcChhcnJheSwgKHYsIGksIGEpID0+IGNhbGxiYWNrLmNhbGwodGhpc0FyZyA/PyB0aGlzLCB2LCBpLCBhKSk7XG4gICAgcmV0dXJuIGFycmF5LmZpbHRlcigoKSA9PiBiaXRzLnNoaWZ0KCkpO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuZmluZCgpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLmZpbmQoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIHRoaXNBcmdcbiAqICAtIGBlbmAgVmFsdWUgdG8gdXNlIGFzICp0aGlzKiB3aGVuIGV4ZWN1dGluZyB0aGUgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDlrp/ooYzjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaW5kPFQ+KHRoaXM6IHVua25vd24sIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IGJvb2xlYW4gfCBQcm9taXNlPGJvb2xlYW4+LCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8VCB8IHVuZGVmaW5lZD4ge1xuICAgIGZvciAoY29uc3QgW2ksIHZdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoYXdhaXQgY2FsbGJhY2suY2FsbCh0aGlzQXJnID8/IHRoaXMsIHYsIGksIGFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLmZpbmRJbmRleCgpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLmZpbmRJbmRleCgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50IGluZGV4IHZhbHVlLlxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbmRJbmRleDxUPih0aGlzOiB1bmtub3duLCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBib29sZWFuIHwgUHJvbWlzZTxib29sZWFuPiwgdGhpc0FyZz86IHVua25vd24pOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGZvciAoY29uc3QgW2ksIHZdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoYXdhaXQgY2FsbGJhY2suY2FsbCh0aGlzQXJnID8/IHRoaXMsIHYsIGksIGFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuc29tZSgpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLnNvbWUoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIHRoaXNBcmdcbiAqICAtIGBlbmAgVmFsdWUgdG8gdXNlIGFzICp0aGlzKiB3aGVuIGV4ZWN1dGluZyB0aGUgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDlrp/ooYzjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCBib29sZWFuIHZhbHVlLlxuICogIC0gYGphYCDnnJ/lgb3lgKTjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNvbWU8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdW5rbm93biwgdGhpc0FyZz86IHVua25vd24pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyA/PyB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLmV2ZXJ5KClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZXZlcnkoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIHRoaXNBcmdcbiAqICAtIGBlbmAgVmFsdWUgdG8gdXNlIGFzICp0aGlzKiB3aGVuIGV4ZWN1dGluZyB0aGUgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDlrp/ooYzjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCBib29sZWFuIHZhbHVlLlxuICogIC0gYGphYCDnnJ/lgb3lgKTjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV2ZXJ5PFQ+KHRoaXM6IHVua25vd24sIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHVua25vd24sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmICghYXdhaXQgY2FsbGJhY2suY2FsbCh0aGlzQXJnID8/IHRoaXMsIHYsIGksIGFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUucmVkdWNlKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUucmVkdWNlKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSBpbml0aWFsVmFsdWVcbiAqICAtIGBlbmAgVXNlZCBhcyBmaXJzdCBhcmd1bWVudCB0byB0aGUgZmlyc3QgY2FsbCBvZiBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOOBq+a4oeOBleOCjOOCi+WIneacn+WApFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50ICpBcnJheSogYXMgdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+e1kOaenOmFjeWIl+OCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVkdWNlPFQsIFU+KFxuICAgIGFycmF5OiBUW10sXG4gICAgY2FsbGJhY2s6IChhY2N1bXVsYXRvcjogVSwgY3VycmVudFZhbHVlOiBULCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSB8IFByb21pc2U8VT4sXG4gICAgaW5pdGlhbFZhbHVlPzogVVxuKTogUHJvbWlzZTxVPiB7XG4gICAgaWYgKGFycmF5Lmxlbmd0aCA8PSAwICYmIHVuZGVmaW5lZCA9PT0gaW5pdGlhbFZhbHVlKSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignUmVkdWNlIG9mIGVtcHR5IGFycmF5IHdpdGggbm8gaW5pdGlhbCB2YWx1ZScpO1xuICAgIH1cblxuICAgIGNvbnN0IGhhc0luaXQgPSAodW5kZWZpbmVkICE9PSBpbml0aWFsVmFsdWUpO1xuICAgIGxldCBhY2MgPSAoaGFzSW5pdCA/IGluaXRpYWxWYWx1ZSA6IGFycmF5WzBdKSBhcyBVO1xuXG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmICghKCFoYXNJbml0ICYmIDAgPT09IGkpKSB7XG4gICAgICAgICAgICBhY2MgPSBhd2FpdCBjYWxsYmFjayhhY2MsIHYsIGksIGFycmF5KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBhY2M7XG59XG4iLCIvKipcbiAqIEBlbiBEYXRlIHVuaXQgZGVmaW5pdGlvbnMuXG4gKiBAamEg5pel5pmC44Kq44OW44K444Kn44Kv44OI44Gu5Y2Y5L2N5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIERhdGVVbml0ID0gJ3llYXInIHwgJ21vbnRoJyB8ICdkYXknIHwgJ2hvdXInIHwgJ21pbicgfCAnc2VjJyB8ICdtc2VjJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2NvbXB1dGVEYXRlRnVuY01hcCA9IHtcbiAgICB5ZWFyOiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENGdWxsWWVhcihiYXNlLmdldFVUQ0Z1bGxZZWFyKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIG1vbnRoOiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENNb250aChiYXNlLmdldFVUQ01vbnRoKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIGRheTogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDRGF0ZShiYXNlLmdldFVUQ0RhdGUoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG4gICAgaG91cjogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDSG91cnMoYmFzZS5nZXRVVENIb3VycygpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbiAgICBtaW46IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ01pbnV0ZXMoYmFzZS5nZXRVVENNaW51dGVzKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIHNlYzogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDU2Vjb25kcyhiYXNlLmdldFVUQ1NlY29uZHMoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG4gICAgbXNlYzogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDTWlsbGlzZWNvbmRzKGJhc2UuZ2V0VVRDTWlsbGlzZWNvbmRzKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBAZW4gQ2FsY3VsYXRlIGZyb20gdGhlIGRhdGUgd2hpY2ggYmVjb21lcyBhIGNhcmRpbmFsIHBvaW50IGJlZm9yZSBhIE4gZGF0ZSB0aW1lIG9yIGFmdGVyIGEgTiBkYXRlIHRpbWUgKGJ5IHtAbGluayBEYXRlVW5pdH0pLlxuICogQGphIOWfuueCueOBqOOBquOCi+aXpeS7mOOBi+OCieOAgU7ml6XlvozjgIFO5pel5YmN44KS566X5Ye6XG4gKlxuICogQHBhcmFtIGJhc2VcbiAqICAtIGBlbmAgYmFzZSBkYXRlIHRpbWUuXG4gKiAgLSBgamFgIOWfuua6luaXpVxuICogQHBhcmFtIGFkZFxuICogIC0gYGVuYCByZWxhdGl2ZSBkYXRlIHRpbWUuXG4gKiAgLSBgamFgIOWKoOeul+aXpS4g44Oe44Kk44OK44K55oyH5a6a44GnbuaXpeWJjeOCguioreWumuWPr+iDvVxuICogQHBhcmFtIHVuaXQge0BsaW5rIERhdGVVbml0fVxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZURhdGUoYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIsIHVuaXQ6IERhdGVVbml0ID0gJ2RheScpOiBEYXRlIHtcbiAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoYmFzZS5nZXRUaW1lKCkpO1xuICAgIGNvbnN0IGZ1bmMgPSBfY29tcHV0ZURhdGVGdW5jTWFwW3VuaXRdO1xuICAgIGlmIChmdW5jKSB7XG4gICAgICAgIHJldHVybiBmdW5jKGRhdGUsIGJhc2UsIGFkZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgaW52YWxpZCB1bml0OiAke3VuaXR9YCk7XG4gICAgfVxufVxuIiwiY29uc3QgX3N0YXR1czogUmVjb3JkPHN0cmluZyB8IHN5bWJvbCwgbnVtYmVyPiA9IHt9O1xuXG4vKipcbiAqIEBlbiBJbmNyZW1lbnQgcmVmZXJlbmNlIGNvdW50IGZvciBzdGF0dXMgaWRlbnRpZmllci5cbiAqIEBqYSDnirbmhYvlpInmlbDjga7lj4Lnhafjgqvjgqbjg7Pjg4jjga7jgqTjg7Pjgq/jg6rjg6Hjg7Pjg4hcbiAqXG4gKiBAcGFyYW0gc3RhdHVzXG4gKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCByZWZlcmVuY2UgY291bnQgdmFsdWVcbiAqICAtIGBqYWAg5Y+C54Wn44Kr44Km44Oz44OI44Gu5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGF0dXNBZGRSZWYoc3RhdHVzOiBzdHJpbmcgfCBzeW1ib2wpOiBudW1iZXIge1xuICAgIGlmICghX3N0YXR1c1tzdGF0dXNdKSB7XG4gICAgICAgIF9zdGF0dXNbc3RhdHVzXSA9IDE7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgX3N0YXR1c1tzdGF0dXNdKys7XG4gICAgfVxuICAgIHJldHVybiBfc3RhdHVzW3N0YXR1c107XG59XG5cbi8qKlxuICogQGVuIERlY3JlbWVudCByZWZlcmVuY2UgY291bnQgZm9yIHN0YXR1cyBpZGVudGlmaWVyLlxuICogQGphIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruODh+OCr+ODquODoeODs+ODiFxuICpcbiAqIEBwYXJhbSBzdGF0dXNcbiAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIHJlZmVyZW5jZSBjb3VudCB2YWx1ZVxuICogIC0gYGphYCDlj4Lnhafjgqvjgqbjg7Pjg4jjga7lgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0YXR1c1JlbGVhc2Uoc3RhdHVzOiBzdHJpbmcgfCBzeW1ib2wpOiBudW1iZXIge1xuICAgIGlmICghX3N0YXR1c1tzdGF0dXNdKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHJldHZhbCA9IC0tX3N0YXR1c1tzdGF0dXNdO1xuICAgICAgICBpZiAoMCA9PT0gcmV0dmFsKSB7XG4gICAgICAgICAgICBkZWxldGUgX3N0YXR1c1tzdGF0dXNdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBTdGF0ZSB2YXJpYWJsZSBtYW5hZ2VtZW50IHNjb3BlXG4gKiBAamEg54q25oWL5aSJ5pWw566h55CG44K544Kz44O844OXXG4gKlxuICogQHBhcmFtIHN0YXR1c1xuICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIHNlZWQgZnVuY3Rpb24uXG4gKiAgLSBgamFgIOWvvuixoeOBrumWouaVsFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgcmV0dmFsIG9mIHNlZWQgZnVuY3Rpb24uXG4gKiAgLSBgamFgIOWvvuixoeOBrumWouaVsOOBruaIu+OCiuWApFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RhdHVzU2NvcGU8VD4oc3RhdHVzOiBzdHJpbmcgfCBzeW1ib2wsIGV4ZWN1dG9yOiAoKSA9PiBUIHwgUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICAgIHRyeSB7XG4gICAgICAgIHN0YXR1c0FkZFJlZihzdGF0dXMpO1xuICAgICAgICByZXR1cm4gYXdhaXQgZXhlY3V0b3IoKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICBzdGF0dXNSZWxlYXNlKHN0YXR1cyk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDaGVjayBpZiBpdCdzIGluIHRoZSBzcGVjaWZpZWQgc3RhdGUuXG4gKiBAamEg5oyH5a6a44GX44Gf54q25oWL5Lit44Gn44GC44KL44GL56K66KqNXG4gKlxuICogQHBhcmFtIHN0YXR1c1xuICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICogQHJldHVybiB7Qm9vbGVhbn0gdHJ1ZTog54q25oWL5YaFIC8gZmFsc2U6IOeKtuaFi+WkllxuICogQHJldHVybnNcbiAqICAtIGBlbmAgYHRydWVgOiB3aXRoaW4gdGhlIHN0YXR1cyAvIGBmYWxzZWA6IG91dCBvZiB0aGUgc3RhdHVzXG4gKiAgLSBgamFgIGB0cnVlYDog54q25oWL5YaFIC8gYGZhbHNlYDog54q25oWL5aSWXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0YXR1c0luKHN0YXR1czogc3RyaW5nIHwgc3ltYm9sKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhX3N0YXR1c1tzdGF0dXNdO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7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LENBQUMsSUFBVSxFQUFFLEdBQVcsRUFBRSxPQUFpQixLQUFLLEVBQUE7UUFDdkUsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3JDLElBQUEsTUFBTSxJQUFJLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDO1FBQ3RDLElBQUksSUFBSSxFQUFFO1lBQ04sT0FBTyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUM7UUFDaEM7YUFBTztJQUNILFFBQUEsTUFBTSxJQUFJLFNBQVMsQ0FBQyxpQkFBaUIsSUFBSSxDQUFBLENBQUUsQ0FBQztRQUNoRDtJQUNKOztJQzFEQSxNQUFNLE9BQU8sR0FBb0MsRUFBRTtJQUVuRDs7Ozs7Ozs7OztJQVVHO0lBQ0csU0FBVSxZQUFZLENBQUMsTUFBdUIsRUFBQTtJQUNoRCxJQUFBLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7SUFDbEIsUUFBQSxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUN2QjthQUFPO0lBQ0gsUUFBQSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDckI7SUFDQSxJQUFBLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQztJQUMxQjtJQUVBOzs7Ozs7Ozs7O0lBVUc7SUFDRyxTQUFVLGFBQWEsQ0FBQyxNQUF1QixFQUFBO0lBQ2pELElBQUEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtJQUNsQixRQUFBLE9BQU8sQ0FBQztRQUNaO2FBQU87SUFDSCxRQUFBLE1BQU0sTUFBTSxHQUFHLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQztJQUNoQyxRQUFBLElBQUksQ0FBQyxLQUFLLE1BQU0sRUFBRTtJQUNkLFlBQUEsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDO1lBQzFCO0lBQ0EsUUFBQSxPQUFPLE1BQU07UUFDakI7SUFDSjtJQUVBOzs7Ozs7Ozs7Ozs7O0lBYUc7SUFDSSxlQUFlLFdBQVcsQ0FBSSxNQUF1QixFQUFFLFFBQThCLEVBQUE7SUFDeEYsSUFBQSxJQUFJO1lBQ0EsWUFBWSxDQUFDLE1BQU0sQ0FBQztZQUNwQixPQUFPLE1BQU0sUUFBUSxFQUFFO1FBQzNCO2dCQUFVO1lBQ04sYUFBYSxDQUFDLE1BQU0sQ0FBQztRQUN6QjtJQUNKO0lBRUE7Ozs7Ozs7Ozs7O0lBV0c7SUFDRyxTQUFVLFVBQVUsQ0FBQyxNQUF1QixFQUFBO0lBQzlDLElBQUEsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztJQUM1Qjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvY29yZS11dGlscy8ifQ==