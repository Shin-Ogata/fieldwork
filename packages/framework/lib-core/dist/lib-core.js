/*!
 * @cdp/lib-core 0.9.22
 *   core library collection
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}));
})(this, (function (exports) { 'use strict';

    /*!
     * @cdp/core-utils 0.9.22
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

    /*!
     * @cdp/events 0.9.22
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
                        if (!list?.has(listener)) {
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
     * @cdp/promise 0.9.22
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
                    void nativeThen.call(src, resolve, reject);
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
            if (token?.cancelable) {
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

    /* eslint-disable
        @typescript-eslint/await-thenable,
     */
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
     * @cdp/observable 0.9.22
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
     * @cdp/result 0.9.22
     *   result utility module
     */


    /* eslint-disable
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
            _code2message[resultCode] = message ?? (`[CODE: ${resultCode}]`);
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
     * @cdp/core-storage 0.9.22
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
     * @cdp/core-template 0.9.22
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
            if (!match || 0 !== match.index) { // eslint-disable-line @typescript-eslint/prefer-optional-chain
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
                if ('text' === token[0 /* $.TYPE */] && 'text' === lastToken?.[0 /* $.TYPE */]) {
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
                    delete tokens[spaces.pop()]; // eslint-disable-line @typescript-eslint/no-array-delete
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
            tokens ??= cache[cacheKey] = parseTemplate(template, tags);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliLWNvcmUuanMiLCJzb3VyY2VzIjpbImNvcmUtdXRpbHMvY29uZmlnLnRzIiwiY29yZS11dGlscy90eXBlcy50cyIsImNvcmUtdXRpbHMvdmVyaWZ5LnRzIiwiY29yZS11dGlscy9kZWVwLWNpcmN1aXQudHMiLCJjb3JlLXV0aWxzL21peGlucy50cyIsImNvcmUtdXRpbHMvb2JqZWN0LnRzIiwiY29yZS11dGlscy9zYWZlLnRzIiwiY29yZS11dGlscy90aW1lci50cyIsImNvcmUtdXRpbHMvbWlzYy50cyIsImNvcmUtdXRpbHMvYXJyYXkudHMiLCJjb3JlLXV0aWxzL2RhdGUudHMiLCJjb3JlLXV0aWxzL3N0YXR1cy50cyIsImV2ZW50cy9wdWJsaXNoZXIudHMiLCJldmVudHMvYnJva2VyLnRzIiwiZXZlbnRzL3JlY2VpdmVyLnRzIiwiZXZlbnRzL3NvdXJjZS50cyIsInByb21pc2UvaW50ZXJuYWwudHMiLCJwcm9taXNlL2NhbmNlbC10b2tlbi50cyIsInByb21pc2UvY2FuY2VsYWJsZS1wcm9taXNlLnRzIiwicHJvbWlzZS91dGlscy50cyIsInByb21pc2UvZGVmZXJyZWQudHMiLCJwcm9taXNlL3Byb21pc2UtbWFuYWdlci50cyIsIm9ic2VydmFibGUvaW50ZXJuYWwudHMiLCJvYnNlcnZhYmxlL2NvbW1vbi50cyIsIm9ic2VydmFibGUvb2JqZWN0LnRzIiwib2JzZXJ2YWJsZS9hcnJheS50cyIsInJlc3VsdC9yZXN1bHQtY29kZS1kZWZzLnRzIiwicmVzdWx0L3Jlc3VsdC1jb2RlLnRzIiwicmVzdWx0L3Jlc3VsdC50cyIsImNvcmUtc3RvcmFnZS9tZW1vcnktc3RvcmFnZS50cyIsImNvcmUtc3RvcmFnZS9yZWdpc3RyeS50cyIsImNvcmUtdGVtcGxhdGUvaW50ZXJuYWwudHMiLCJjb3JlLXRlbXBsYXRlL2NhY2hlLnRzIiwiY29yZS10ZW1wbGF0ZS91dGlscy50cyIsImNvcmUtdGVtcGxhdGUvc2Nhbm5lci50cyIsImNvcmUtdGVtcGxhdGUvY29udGV4dC50cyIsImNvcmUtdGVtcGxhdGUvcGFyc2UudHMiLCJjb3JlLXRlbXBsYXRlL3dyaXRlci50cyIsImNvcmUtdGVtcGxhdGUvY2xhc3MudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBVbmtub3duT2JqZWN0IH0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogQGVuIFNhZmUgYGdsb2JhbGAgYWNjZXNzb3IuXG4gKiBAamEgYGdsb2JhbGAg44Ki44Kv44K744OD44K1XG4gKlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgYGdsb2JhbGAgb2JqZWN0IG9mIHRoZSBydW50aW1lIGVudmlyb25tZW50XG4gKiAgLSBgamFgIOeSsOWig+OBq+W/nOOBmOOBnyBgZ2xvYmFsYCDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEdsb2JhbCgpOiB0eXBlb2YgZ2xvYmFsVGhpcyB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLW5ldy1mdW5jLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8taW1wbGllZC1ldmFsXG4gICAgcmV0dXJuICgnb2JqZWN0JyA9PT0gdHlwZW9mIGdsb2JhbFRoaXMpID8gZ2xvYmFsVGhpcyA6IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG59XG5cbi8qKlxuICogQGVuIEVuc3VyZSBuYW1lZCBvYmplY3QgYXMgcGFyZW50J3MgcHJvcGVydHkuXG4gKiBAamEg6Kaq44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6a44GX44GmLCDlkI3liY3jgavmjIflrprjgZfjgZ/jgqrjg5bjgrjjgqfjgq/jg4jjga7lrZjlnKjjgpLkv53oqLxcbiAqXG4gKiBAcGFyYW0gcGFyZW50XG4gKiAgLSBgZW5gIHBhcmVudCBvYmplY3QuIElmIG51bGwgZ2l2ZW4sIGBnbG9iYWxUaGlzYCBpcyBhc3NpZ25lZC5cbiAqICAtIGBqYWAg6Kaq44Kq44OW44K444Kn44Kv44OILiBudWxsIOOBruWgtOWQiOOBryBgZ2xvYmFsVGhpc2Ag44GM5L2/55So44GV44KM44KLXG4gKiBAcGFyYW0gbmFtZXNcbiAqICAtIGBlbmAgb2JqZWN0IG5hbWUgY2hhaW4gZm9yIGVuc3VyZSBpbnN0YW5jZS5cbiAqICAtIGBqYWAg5L+d6Ki844GZ44KL44Kq44OW44K444Kn44Kv44OI44Gu5ZCN5YmNXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVPYmplY3Q8VCBleHRlbmRzIG9iamVjdCA9IFVua25vd25PYmplY3Q+KHBhcmVudDogb2JqZWN0IHwgbnVsbCwgLi4ubmFtZXM6IHN0cmluZ1tdKTogVCB7XG4gICAgbGV0IHJvb3QgPSAocGFyZW50ID8/IGdldEdsb2JhbCgpKSBhcyBVbmtub3duT2JqZWN0O1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBuYW1lcykge1xuICAgICAgICByb290W25hbWVdID0gcm9vdFtuYW1lXSA/PyB7fTtcbiAgICAgICAgcm9vdCA9IHJvb3RbbmFtZV0gYXMgVW5rbm93bk9iamVjdDtcbiAgICB9XG4gICAgcmV0dXJuIHJvb3QgYXMgVDtcbn1cblxuLyoqXG4gKiBAZW4gR2xvYmFsIG5hbWVzcGFjZSBhY2Nlc3Nvci5cbiAqIEBqYSDjgrDjg63jg7zjg5Djg6vjg43jg7zjg6Djgrnjg5rjg7zjgrnjgqLjgq/jgrvjg4PjgrVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEdsb2JhbE5hbWVzcGFjZTxUIGV4dGVuZHMgb2JqZWN0ID0gVW5rbm93bk9iamVjdD4obmFtZXNwYWNlOiBzdHJpbmcpOiBUIHtcbiAgICByZXR1cm4gZW5zdXJlT2JqZWN0PFQ+KG51bGwsIG5hbWVzcGFjZSk7XG59XG5cbi8qKlxuICogQGVuIEdsb2JhbCBjb25maWcgYWNjZXNzb3IuXG4gKiBAamEg44Kw44Ot44O844OQ44Or44Kz44Oz44OV44Kj44Kw44Ki44Kv44K744OD44K1XG4gKlxuICogQHJldHVybnMgZGVmYXVsdDogYENEUC5Db25maWdgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25maWc8VCBleHRlbmRzIG9iamVjdCA9IFVua25vd25PYmplY3Q+KG5hbWVzcGFjZSA9ICdDRFAnLCBjb25maWdOYW1lID0gJ0NvbmZpZycpOiBUIHtcbiAgICByZXR1cm4gZW5zdXJlT2JqZWN0PFQ+KGdldEdsb2JhbE5hbWVzcGFjZShuYW1lc3BhY2UpLCBjb25maWdOYW1lKTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWZ1bmN0aW9uLXR5cGUsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LW9iamVjdC10eXBlLFxuICovXG5cbi8qKlxuICogQGVuIFByaW1pdGl2ZSB0eXBlIG9mIEphdmFTY3JpcHQuXG4gKiBAamEgSmF2YVNjcmlwdCDjga7jg5fjg6rjg5/jg4bjgqPjg5blnotcbiAqL1xuZXhwb3J0IHR5cGUgUHJpbWl0aXZlID0gc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IHN5bWJvbCB8IGJpZ2ludCB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVuIFRoZSBnZW5lcmFsIG51bGwgdHlwZS5cbiAqIEBqYSDnqbrjgpLnpLrjgZnlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgTnVsbGlzaCA9IHZvaWQgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlbiBUaGUgdHlwZSBvZiBvYmplY3Qgb3Ige0BsaW5rIE51bGxpc2h9LlxuICogQGphIHtAbGluayBOdWxsaXNofSDjgavjgarjgorjgYjjgovjgqrjg5bjgrjjgqfjgq/jg4jlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgTnVsbGFibGU8VCBleHRlbmRzIG9iamVjdD4gPSBUIHwgTnVsbGlzaDtcblxuLyoqXG4gKiBAZW4gQXZvaWQgdGhlIGBGdW5jdGlvbmB0eXBlcy5cbiAqIEBqYSDmsY7nlKjplqLmlbDlnotcbiAqL1xuZXhwb3J0IHR5cGUgVW5rbm93bkZ1bmN0aW9uID0gKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bjtcblxuLyoqXG4gKiBAZW4gQXZvaWQgdGhlIGBPYmplY3RgIGFuZCBge31gIHR5cGVzLCBhcyB0aGV5IG1lYW4gXCJhbnkgbm9uLW51bGxpc2ggdmFsdWVcIi5cbiAqIEBqYSDmsY7nlKjjgqrjg5bjgrjjgqfjgq/jg4jlnosuIGBPYmplY3RgIOOBiuOCiOOBsyBge31gIOOCv+OCpOODl+OBr+OAjG51bGzjgafjgarjgYTlgKTjgI3jgpLmhI/lkbPjgZnjgovjgZ/jgoHku6PkvqHjgajjgZfjgabkvb/nlKhcbiAqL1xuZXhwb3J0IHR5cGUgVW5rbm93bk9iamVjdCA9IFJlY29yZDxzdHJpbmcgfCBudW1iZXIgfCBzeW1ib2wsIHVua25vd24+O1xuXG4vKipcbiAqIEBlbiBKYXZhU2NyaXB0IHR5cGUgc2V0IGludGVyZmFjZS5cbiAqIEBqYSBKYXZhU2NyaXB0IOOBruWei+OBrumbhuWQiFxuICovXG5pbnRlcmZhY2UgVHlwZUxpc3Qge1xuICAgIHN0cmluZzogc3RyaW5nO1xuICAgIG51bWJlcjogbnVtYmVyO1xuICAgIGJvb2xlYW46IGJvb2xlYW47XG4gICAgc3ltYm9sOiBzeW1ib2w7XG4gICAgYmlnaW50OiBiaWdpbnQ7XG4gICAgdW5kZWZpbmVkOiB2b2lkIHwgdW5kZWZpbmVkO1xuICAgIG9iamVjdDogb2JqZWN0IHwgbnVsbDtcbiAgICBmdW5jdGlvbiguLi5hcmdzOiB1bmtub3duW10pOiB1bmtub3duO1xufVxuXG4vKipcbiAqIEBlbiBUaGUga2V5IGxpc3Qgb2Yge0BsaW5rIFR5cGVMaXN0fS5cbiAqIEBqYSB7QGxpbmsgVHlwZUxpc3R9IOOCreODvOS4gOimp1xuICovXG5leHBvcnQgdHlwZSBUeXBlS2V5cyA9IGtleW9mIFR5cGVMaXN0O1xuXG4vKipcbiAqIEBlbiBUeXBlIGJhc2UgZGVmaW5pdGlvbi5cbiAqIEBqYSDlnovjga7opo/lrprlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUeXBlPFQgZXh0ZW5kcyBvYmplY3Q+IGV4dGVuZHMgRnVuY3Rpb24ge1xuICAgIHJlYWRvbmx5IHByb3RvdHlwZTogVDtcbn1cblxuLyoqXG4gKiBAZW4gVHlwZSBvZiBjb25zdHJ1Y3Rvci5cbiAqIEBqYSDjgrPjg7Pjgrnjg4jjg6njgq/jgr/lnotcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb25zdHJ1Y3RvcjxUIGV4dGVuZHMgb2JqZWN0PiBleHRlbmRzIFR5cGU8VD4ge1xuICAgIG5ldyguLi5hcmdzOiBhbnlbXSk6IFQ7XG59XG5cbi8qKlxuICogQGVuIFR5cGUgb2YgY2xhc3MuXG4gKiBAamEg44Kv44Op44K55Z6LXG4gKi9cbmV4cG9ydCB0eXBlIENsYXNzPFQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+ID0gQ29uc3RydWN0b3I8VD47XG5cbi8qKlxuICogQGVuIEVuc3VyZSBmb3IgZnVuY3Rpb24gcGFyYW1ldGVycyB0byB0dXBsZS5cbiAqIEBqYSDplqLmlbDjg5Hjg6njg6Hjg7zjgr/jgajjgZfjgaYgdHVwbGUg44KS5L+d6Ki8XG4gKi9cbmV4cG9ydCB0eXBlIEFyZ3VtZW50czxUPiA9IFQgZXh0ZW5kcyBhbnlbXSA/IFQgOiBbVF07XG5cbi8qKlxuICogQGVuIFJtb3ZlIGByZWFkb25seWAgYXR0cmlidXRlcyBmcm9tIGlucHV0IHR5cGUuXG4gKiBAamEgYHJlYWRvbmx5YCDlsZ7mgKfjgpLop6PpmaRcbiAqL1xuZXhwb3J0IHR5cGUgV3JpdGFibGU8VD4gPSB7IC1yZWFkb25seSBbSyBpbiBrZXlvZiBUXTogVFtLXSB9O1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIHN1YnNjcmlwdCBhY2Nlc3NpYmxlIHR5cGUuXG4gKiBAamEg5re744GI5a2X44Ki44Kv44K744K55Y+v6IO944Gq5Z6L44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCB0eXBlIEFjY2Vzc2libGU8VCwgUyA9IHVua25vd24+ID0gVCAmIFJlY29yZDxzdHJpbmcgfCBudW1iZXIgfCBzeW1ib2wsIFM+O1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IGZ1bmN0aW9uYWwgcHJvcGVydHkgbmFtZXMuXG4gKiBAamEg6Zai5pWw44OX44Ot44OR44OG44Kj5ZCN44Gu5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIEZ1bmN0aW9uUHJvcGVydHlOYW1lczxUPiA9IHsgW0sgaW4ga2V5b2YgVF06IFRbS10gZXh0ZW5kcyBGdW5jdGlvbiA/IEsgOiBuZXZlciB9W2tleW9mIFRdICYgc3RyaW5nO1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IGZ1bmN0aW9uYWwgcHJvcGVydGllcy5cbiAqIEBqYSDplqLmlbDjg5fjg63jg5Hjg4bjgqPjga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgRnVuY3Rpb25Qcm9wZXJ0aWVzPFQ+ID0gUGljazxULCBGdW5jdGlvblByb3BlcnR5TmFtZXM8VD4+O1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG5vbi1mdW5jdGlvbmFsIHByb3BlcnR5IG5hbWVzLlxuICogQGphIOmdnumWouaVsOODl+ODreODkeODhuOCo+WQjeOBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VD4gPSB7IFtLIGluIGtleW9mIFRdOiBUW0tdIGV4dGVuZHMgRnVuY3Rpb24gPyBuZXZlciA6IEsgfVtrZXlvZiBUXSAmIHN0cmluZztcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBub24tZnVuY3Rpb25hbCBwcm9wZXJ0aWVzLlxuICogQGphIOmdnumWouaVsOODl+ODreODkeODhuOCo+OBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBOb25GdW5jdGlvblByb3BlcnRpZXM8VD4gPSBQaWNrPFQsIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxUPj47XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgbm9uLWZ1bmN0aW9uYWwgdHlwZXMuXG4gKiBAamEg6Z2e6Zai5pWw5Z6L44Gu5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIE5vbkZ1bmN0aW9uPFQ+ID0gVCBleHRlbmRzIEZ1bmN0aW9uID8gbmV2ZXIgOiBUO1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG9iamVjdCBrZXkgbGlzdC4gKGVuc3VyZSBvbmx5ICdzdHJpbmcnKVxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBruOCreODvOS4gOimp+OCkuaKveWHuiAoJ3N0cmluZycg5Z6L44Gu44G/44KS5L+d6Ki8KVxuICovXG5leHBvcnQgdHlwZSBLZXlzPFQgZXh0ZW5kcyBvYmplY3Q+ID0ga2V5b2YgT21pdDxULCBudW1iZXIgfCBzeW1ib2w+O1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG9iamVjdCB0eXBlIGxpc3QuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu5Z6L5LiA6Kan44KS5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVzPFQgZXh0ZW5kcyBvYmplY3Q+ID0gVFtrZXlvZiBUXTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBvYmplY3Qga2V5IHRvIHR5cGUuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Kt44O844GL44KJ5Z6L44G45aSJ5o+bXG4gKi9cbmV4cG9ydCB0eXBlIEtleVRvVHlwZTxPIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMga2V5b2YgTz4gPSBLIGV4dGVuZHMga2V5b2YgTyA/IE9bS10gOiBuZXZlcjtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBvYmplY3QgdHlwZSB0byBrZXkuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI5Z6L44GL44KJ44Kt44O844G45aSJ5o+bXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVUb0tleTxPIGV4dGVuZHMgb2JqZWN0LCBUIGV4dGVuZHMgVHlwZXM8Tz4+ID0geyBbSyBpbiBrZXlvZiBPXTogT1tLXSBleHRlbmRzIFQgPyBLIDogbmV2ZXIgfVtrZXlvZiBPXTtcblxuLyoqXG4gKiBAZW4gVGhlIHtAbGluayBQbGFpbk9iamVjdH0gdHlwZSBpcyBhIEphdmFTY3JpcHQgb2JqZWN0IGNvbnRhaW5pbmcgemVybyBvciBtb3JlIGtleS12YWx1ZSBwYWlycy4gPGJyPlxuICogICAgICdQbGFpbicgbWVhbnMgaXQgZnJvbSBvdGhlciBraW5kcyBvZiBKYXZhU2NyaXB0IG9iamVjdHMuIGV4OiBudWxsLCB1c2VyLWRlZmluZWQgYXJyYXlzLCBhbmQgaG9zdCBvYmplY3RzIHN1Y2ggYXMgYGRvY3VtZW50YC5cbiAqIEBqYSAwIOS7peS4iuOBriBrZXktdmFsdWUg44Oa44Ki44KS5oyB44GkIHtAbGluayBQbGFpbk9iamVjdH0g5a6a576pIDxicj5cbiAqICAgICAnUGxhaW4nIOOBqOOBr+S7luOBrueorumhnuOBriBKYXZhU2NyaXB0IOOCquODluOCuOOCp+OCr+ODiOOCkuWQq+OBvuOBquOBhOOCquODluOCuOOCp+OCr+ODiOOCkuaEj+WRs+OBmeOCiy4g5L6LOiAgbnVsbCwg44Om44O844K244O85a6a576p6YWN5YiXLCDjgb7jgZ/jga8gYGRvY3VtZW50YCDjga7jgojjgYbjgarntYTjgb/ovrzjgb/jgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IHR5cGUgUGxhaW5PYmplY3Q8VCA9IHt9IHwgbnVsbCB8IHVuZGVmaW5lZD4gPSBSZWNvcmQ8c3RyaW5nLCBUPjtcblxuLyoqXG4gKiBAZW4gT2JqZWN0IGNhbiBiZSBndWFyYW50ZWVkIGRlZmluaXRpb24uIEJlIGNhcmVmdWwgbm90IHRvIGFidXNlIGl0IGJlY2F1c2UgaXQgZG9lcyBub3QgZm9yY2UgdGhlIGNhc3QuXG4gKiAgIC0gVW5saWtlIHtAbGluayBQbGFpbk9iamVjdH0sIGl0IGNhbiBhY2NlcHQgQ2xhc3MgKGJ1aWx0LWluIG9iamVjdCksIEFycmF5LCBGdW5jdGlvbi5cbiAqICAgLSBVbmxpa2UgYG9iamVjdGAsIHlvdSBjYW4gYWNjZXNzIHVua25vd24gcHJvcGVydGllcy5cbiAqICAgLSBVbmxpa2UgYHt9IC8gT2JqZWN0YCwgaXQgY2FuIHJlcGVsIHtAbGluayBQcmltaXRpdmV9LlxuICogQGphIE9iamVjdCDjgpLkv53oqLzlj6/og73jgarlrprnvqkuIOOCreODo+OCueODiOOCkuW8t+WItuOBl+OBquOBhOOBn+OCgeS5seeUqOOBl+OBquOBhOOCiOOBhuOBq+azqOaEj+OBjOW/heimgS5cbiAqICAgLSB7QGxpbmsgUGxhaW5PYmplY3R9IOOBqOmBleOBhOOAgUNsYXNzICjntYTjgb/ovrzjgb/jgqrjg5bjgrjjgqfjgq/jg4gpLCBBcnJheSwgRnVuY3Rpb24g44KS5Y+X44GR5LuY44GR44KL44GT44Go44GM44Gn44GN44KLLlxuICogICAtIGBvYmplY3RgIOOBqOmBleOBhOOAgeacquefpeOBruODl+ODreODkeODhuOCo+OBq+OCouOCr+OCu+OCueOBmeOCi+OBk+OBqOOBjOOBp+OBjeOCiy5cbiAqICAgLSBge30gLyBPYmplY3RgIOOBqOmBleOBhOOAgXtAbGluayBQcmltaXRpdmV9IOOCkuOBr+OBmOOBj+OBk+OBqOOBjOOBp+OBjeOCiy5cbiAqL1xuZXhwb3J0IHR5cGUgQW55T2JqZWN0ID0gUmVjb3JkPHN0cmluZywgYW55PjtcblxuLyoqXG4gKiBAZW4gVGhlIGRhdGEgdHlwZSBsaXN0IGJ5IHdoaWNoIHN0eWxlIGNvbXB1bHNpb24gaXMgcG9zc2libGUuXG4gKiBAamEg5Z6L5by35Yi25Y+v6IO944Gq44OH44O844K/5Z6L5LiA6KanXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVkRGF0YSA9IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsIHwgb2JqZWN0O1xuXG4vKipcbiAqIEBlbiBUaGUgZGF0YSB0eXBlIGxpc3Qgb2YgVHlwZWRBcnJheS5cbiAqIEBqYSBUeXBlZEFycmF5IOS4gOimp1xuICovXG5leHBvcnQgdHlwZSBUeXBlZEFycmF5ID0gSW50OEFycmF5IHwgVWludDhBcnJheSB8IFVpbnQ4Q2xhbXBlZEFycmF5IHwgSW50MTZBcnJheSB8IFVpbnQxNkFycmF5IHwgSW50MzJBcnJheSB8IFVpbnQzMkFycmF5IHwgRmxvYXQzMkFycmF5IHwgRmxvYXQ2NEFycmF5O1xuXG4vKipcbiAqIEBlbiBUeXBlZEFycmF5IGNvbnN0cnVjdG9yLlxuICogQGphIFR5cGVkQXJyYXkg44Kz44Oz44K544OI44Op44Kv44K/5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZWRBcnJheUNvbnN0cnVjdG9yIHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IFR5cGVkQXJyYXk7XG4gICAgbmV3KHNlZWQ6IG51bWJlciB8IEFycmF5TGlrZTxudW1iZXI+IHwgQXJyYXlCdWZmZXJMaWtlKTogVHlwZWRBcnJheTtcbiAgICBuZXcoYnVmZmVyOiBBcnJheUJ1ZmZlckxpa2UsIGJ5dGVPZmZzZXQ/OiBudW1iZXIsIGxlbmd0aD86IG51bWJlcik6IFR5cGVkQXJyYXk7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIHNpemUgaW4gYnl0ZXMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEg6KaB57Sg44Gu44OQ44Kk44OI44K144Kk44K6XG4gICAgICovXG4gICAgcmVhZG9ubHkgQllURVNfUEVSX0VMRU1FTlQ6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGEgbmV3IGFycmF5IGZyb20gYSBzZXQgb2YgZWxlbWVudHMuXG4gICAgICogQGphIOimgee0oOOCkuioreWumuOBl+aWsOimj+mFjeWIl+OCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGl0ZW1zXG4gICAgICogIC0gYGVuYCBBIHNldCBvZiBlbGVtZW50cyB0byBpbmNsdWRlIGluIHRoZSBuZXcgYXJyYXkgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5paw44Gf44Gr6Kit5a6a44GZ44KL6KaB57SgXG4gICAgICovXG4gICAgb2YoLi4uaXRlbXM6IG51bWJlcltdKTogVHlwZWRBcnJheTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvciBpdGVyYWJsZSBvYmplY3QuXG4gICAgICogQGphIGFycmF5LWxpa2UgLyBpdGVyYXRhYmxlIOOCquODluOCuOOCp+OCr+ODiOOBi+OCieaWsOimj+mFjeWIl+OCkuS9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5TGlrZVxuICAgICAqICAtIGBlbmAgQW4gYXJyYXktbGlrZSBvciBpdGVyYWJsZSBvYmplY3QgdG8gY29udmVydCB0byBhbiBhcnJheS5cbiAgICAgKiAgLSBgamFgIGFycmF5LWxpa2Ug44KC44GX44GP44GvIGl0ZXJhdGFibGUg44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgZnJvbShhcnJheUxpa2U6IEFycmF5TGlrZTxudW1iZXI+KTogVHlwZWRBcnJheTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvciBpdGVyYWJsZSBvYmplY3QuXG4gICAgICogQGphIGFycmF5LWxpa2UgLyBpdGVyYXRhYmxlIOOCquODluOCuOOCp+OCr+ODiOOBi+OCieaWsOimj+mFjeWIl+OCkuS9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5TGlrZVxuICAgICAqICAtIGBlbmAgQW4gYXJyYXktbGlrZSBvciBpdGVyYWJsZSBvYmplY3QgdG8gY29udmVydCB0byBhbiBhcnJheS5cbiAgICAgKiAgLSBgamFgIGFycmF5LWxpa2Ug44KC44GX44GP44GvIGl0ZXJhdGFibGUg44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG1hcGZuXG4gICAgICogIC0gYGVuYCBBIG1hcHBpbmcgZnVuY3Rpb24gdG8gY2FsbCBvbiBldmVyeSBlbGVtZW50IG9mIHRoZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOWFqOimgee0oOOBq+mBqeeUqOOBmeOCi+ODl+ODreOCreOCt+mWouaVsFxuICAgICAqIEBwYXJhbSB0aGlzQXJnXG4gICAgICogIC0gYGVuYCBWYWx1ZSBvZiAndGhpcycgdXNlZCB0byBpbnZva2UgdGhlIG1hcGZuLlxuICAgICAqICAtIGBqYWAgbWFwZm4g44Gr5L2/55So44GZ44KLICd0aGlzJ1xuICAgICAqL1xuICAgIGZyb208VD4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4sIG1hcGZuOiAodjogVCwgazogbnVtYmVyKSA9PiBudW1iZXIsIHRoaXNBcmc/OiB1bmtub3duKTogVHlwZWRBcnJheTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBleGlzdHMuXG4gKiBAamEg5YCk44GM5a2Y5Zyo44GZ44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXhpc3RzPFQ+KHg6IFQgfCBOdWxsaXNoKTogeCBpcyBUIHtcbiAgICByZXR1cm4gbnVsbCAhPSB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyB7QGxpbmsgTnVsbGlzaH0uXG4gKiBAamEge0BsaW5rIE51bGxpc2h9IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTnVsbGlzaCh4OiB1bmtub3duKTogeCBpcyBOdWxsaXNoIHtcbiAgICByZXR1cm4gbnVsbCA9PSB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBTdHJpbmcuXG4gKiBAamEgU3RyaW5nIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3RyaW5nKHg6IHVua25vd24pOiB4IGlzIHN0cmluZyB7XG4gICAgcmV0dXJuICdzdHJpbmcnID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgTnVtYmVyLlxuICogQGphIE51bWJlciDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc051bWJlcih4OiB1bmtub3duKTogeCBpcyBudW1iZXIge1xuICAgIHJldHVybiAnbnVtYmVyJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIEJvb2xlYW4uXG4gKiBAamEgQm9vbGVhbiDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Jvb2xlYW4oeDogdW5rbm93bik6IHggaXMgYm9vbGVhbiB7XG4gICAgcmV0dXJuICdib29sZWFuJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFN5bWJsZS5cbiAqIEBqYSBTeW1ib2wg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTeW1ib2woeDogdW5rbm93bik6IHggaXMgc3ltYm9sIHtcbiAgICByZXR1cm4gJ3N5bWJvbCcgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBCaWdJbnQuXG4gKiBAamEgQmlnSW50IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQmlnSW50KHg6IHVua25vd24pOiB4IGlzIGJpZ2ludCB7XG4gICAgcmV0dXJuICdiaWdpbnQnID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgcHJpbWl0aXZlIHR5cGUuXG4gKiBAamEg44OX44Oq44Of44OG44Kj44OW5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQcmltaXRpdmUoeDogdW5rbm93bik6IHggaXMgUHJpbWl0aXZlIHtcbiAgICByZXR1cm4gIXggfHwgKCdmdW5jdGlvbicgIT09IHR5cGVvZiB4KSAmJiAoJ29iamVjdCcgIT09IHR5cGVvZiB4KTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgQXJyYXkuXG4gKiBAamEgQXJyYXkg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgY29uc3QgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIE9iamVjdC5cbiAqIEBqYSBPYmplY3Qg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNPYmplY3QoeDogdW5rbm93bik6IHggaXMgb2JqZWN0IHtcbiAgICByZXR1cm4gQm9vbGVhbih4KSAmJiAnb2JqZWN0JyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIHtAbGluayBQbGFpbk9iamVjdH0uXG4gKiBAamEge0BsaW5rIFBsYWluT2JqZWN0fSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KHg6IHVua25vd24pOiB4IGlzIFBsYWluT2JqZWN0IHtcbiAgICBpZiAoIWlzT2JqZWN0KHgpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBjcmVhdGUgZnJvbSBgT2JqZWN0LmNyZWF0ZSggbnVsbCApYCBpcyBwbGFpblxuICAgIGlmICghT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBvd25JbnN0YW5jZU9mKE9iamVjdCwgeCk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIGVtcHR5IG9iamVjdC5cbiAqIEBqYSDnqbrjgqrjg5bjgrjjgqfjgq/jg4jjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0VtcHR5T2JqZWN0KHg6IHVua25vd24pOiB4IGlzIG9iamVjdCB7XG4gICAgaWYgKCFpc1BsYWluT2JqZWN0KHgpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBuYW1lIGluIHgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgRnVuY3Rpb24uXG4gKiBAamEgRnVuY3Rpb24g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNGdW5jdGlvbih4OiB1bmtub3duKTogeCBpcyBUeXBlTGlzdFsnZnVuY3Rpb24nXSB7XG4gICAgcmV0dXJuICdmdW5jdGlvbicgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgY2FuIGJlIGNvbnZlcnQgdG8gYSBudW1iZXIuXG4gKiBAamEg5pWw5YCk44Gr5aSJ5o+b5Y+v6IO944GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOdW1lcmljKHg6IHVua25vd24pOiB4IGlzIG51bWJlciB7XG4gICAgcmV0dXJuICFpc051bGxpc2goeCkgJiYgIWlzQm9vbGVhbih4KSAmJiAhaXNBcnJheSh4KSAmJiAhaXNTeW1ib2woeCkgJiYgKCcnICE9PSB4KSAmJiAhTnVtYmVyLmlzTmFOKE51bWJlcih4KSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIGlucHV0LlxuICogQGphIOaMh+WumuOBl+OBn+Wei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB0eXBlXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB0eXBlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+Wei1xuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZU9mPEsgZXh0ZW5kcyBUeXBlS2V5cz4odHlwZTogSywgeDogdW5rbm93bik6IHggaXMgVHlwZUxpc3RbS10ge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gdHlwZTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGhhcyBpdGVyYXRvci5cbiAqIEBqYSBpdGVyYXRvciDjgpLmiYDmnInjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlPFQ+KHg6IE51bGxhYmxlPEl0ZXJhYmxlPFQ+Pik6IHggaXMgSXRlcmFibGU8VD47XG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZSh4OiB1bmtub3duKTogeCBpcyBJdGVyYWJsZTx1bmtub3duPjtcbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlKHg6IHVua25vd24pOiBhbnkge1xuICAgIHJldHVybiBTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KHgpO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfdHlwZWRBcnJheU5hbWVzOiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPiA9IHtcbiAgICAnSW50OEFycmF5JzogdHJ1ZSxcbiAgICAnVWludDhBcnJheSc6IHRydWUsXG4gICAgJ1VpbnQ4Q2xhbXBlZEFycmF5JzogdHJ1ZSxcbiAgICAnSW50MTZBcnJheSc6IHRydWUsXG4gICAgJ1VpbnQxNkFycmF5JzogdHJ1ZSxcbiAgICAnSW50MzJBcnJheSc6IHRydWUsXG4gICAgJ1VpbnQzMkFycmF5JzogdHJ1ZSxcbiAgICAnRmxvYXQzMkFycmF5JzogdHJ1ZSxcbiAgICAnRmxvYXQ2NEFycmF5JzogdHJ1ZSxcbn07XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBpcyBvbmUgb2Yge0BsaW5rIFR5cGVkQXJyYXl9LlxuICogQGphIOaMh+WumuOBl+OBn+OCpOODs+OCueOCv+ODs+OCueOBjCB7QGxpbmsgVHlwZWRBcnJheX0g44Gu5LiA56iu44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlZEFycmF5KHg6IHVua25vd24pOiB4IGlzIFR5cGVkQXJyYXkge1xuICAgIHJldHVybiAhIV90eXBlZEFycmF5TmFtZXNbY2xhc3NOYW1lKHgpXTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGluc3RhbmNlIG9mIGlucHV0LlxuICogQGphIOaMh+WumuOBl+OBn+OCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDoqZXkvqHjgZnjgovjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluc3RhbmNlT2Y8VCBleHRlbmRzIG9iamVjdD4oY3RvcjogTnVsbGFibGU8VHlwZTxUPj4sIHg6IHVua25vd24pOiB4IGlzIFQge1xuICAgIHJldHVybiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGN0b3IpICYmICh4IGluc3RhbmNlb2YgY3Rvcik7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBpbnN0YW5jZSBvZiBpbnB1dCBjb25zdHJ1Y3RvciAoZXhjZXB0IHN1YiBjbGFzcykuXG4gKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44Gu44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5Yik5a6aICjmtL7nlJ/jgq/jg6njgrnjga/lkKvjgoHjgarjgYQpXG4gKlxuICogQHBhcmFtIGN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIGNvbnN0cnVjdG9yXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+OCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gb3duSW5zdGFuY2VPZjxUIGV4dGVuZHMgb2JqZWN0PihjdG9yOiBOdWxsYWJsZTxUeXBlPFQ+PiwgeDogdW5rbm93bik6IHggaXMgVCB7XG4gICAgcmV0dXJuIChudWxsICE9IHgpICYmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgY3RvcikgJiYgKE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSA9PT0gT2JqZWN0KGN0b3IucHJvdG90eXBlKSk7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgdmFsdWUncyBjbGFzcyBuYW1lLlxuICogQGphIOOCr+ODqeOCueWQjeOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzTmFtZSh4OiBhbnkpOiBzdHJpbmcge1xuICAgIGlmICh4ICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgdG9TdHJpbmdUYWdOYW1lID0geFtTeW1ib2wudG9TdHJpbmdUYWddO1xuICAgICAgICBpZiAoaXNTdHJpbmcodG9TdHJpbmdUYWdOYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRvU3RyaW5nVGFnTmFtZTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0Z1bmN0aW9uKHgpICYmIHgucHJvdG90eXBlICYmIG51bGwgIT0geC5uYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4geC5uYW1lO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgY3RvciA9IHguY29uc3RydWN0b3I7XG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihjdG9yKSAmJiBjdG9yID09PSAoT2JqZWN0KGN0b3IucHJvdG90eXBlKSBhcyBvYmplY3QpLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGN0b3IubmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSkuc2xpY2UoOCwgLTEpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBpbnB1dCB2YWx1ZXMgYXJlIHNhbWUgdmFsdWUtdHlwZS5cbiAqIEBqYSDlhaXlipvjgYzlkIzkuIDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gbGhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqIEBwYXJhbSByaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FtZVR5cGUobGhzOiB1bmtub3duLCByaHM6IHVua25vd24pOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHlwZW9mIGxocyA9PT0gdHlwZW9mIHJocztcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgaW5wdXQgdmFsdWVzIGFyZSBzYW1lIGNsYXNzLlxuICogQGphIOWFpeWKm+OBjOWQjOS4gOOCr+ODqeOCueOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBsaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICogQHBhcmFtIHJoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1lQ2xhc3MobGhzOiB1bmtub3duLCByaHM6IHVua25vd24pOiBib29sZWFuIHtcbiAgICBpZiAobnVsbCA9PSBsaHMgJiYgbnVsbCA9PSByaHMpIHtcbiAgICAgICAgcmV0dXJuIGNsYXNzTmFtZShsaHMpID09PSBjbGFzc05hbWUocmhzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKG51bGwgIT0gbGhzKSAmJiAobnVsbCAhPSByaHMpICYmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YobGhzKSA9PT0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHJocykpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29tbW9uIFN5bWJsZSBmb3IgZnJhbWV3b3JrLlxuICogQGphIOODleODrOODvOODoOODr+ODvOOCr+OBjOWFsemAmuOBp+S9v+eUqOOBmeOCiyBTeW1ibGVcbiAqL1xuZXhwb3J0IGNvbnN0ICRjZHAgPSBTeW1ib2woJ0BjZHAnKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1mdW5jdGlvbi10eXBlLFxuICovXG5cbmltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duRnVuY3Rpb24sXG4gICAgdHlwZSBUeXBlS2V5cyxcbiAgICBpc0FycmF5LFxuICAgIGV4aXN0cyxcbiAgICBjbGFzc05hbWUsXG59IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIEBlbiBUeXBlIHZlcmlmaWVyIGludGVyZmFjZSBkZWZpbml0aW9uLiA8YnI+XG4gKiAgICAgSWYgaW52YWxpZCB2YWx1ZSByZWNlaXZlZCwgdGhlIG1ldGhvZCB0aHJvd3MgYFR5cGVFcnJvcmAuXG4gKiBAamEg5Z6L5qSc6Ki844Gu44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pIDxicj5cbiAqICAgICDpgZXlj43jgZfjgZ/loLTlkIjjga8gYFR5cGVFcnJvcmAg44KS55m655SfXG4gKlxuICpcbiAqL1xuaW50ZXJmYWNlIFZlcmlmaWVyIHtcbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaXMgbm90IHtAbGluayBOdWxsaXNofS5cbiAgICAgKiBAamEge0BsaW5rIE51bGxpc2h9IOOBp+OBquOBhOOBk+OBqOOCkuaknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIG5vdE51bGxpc2gueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gbm90TnVsbGlzaC5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgbm90TnVsbGlzaDogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaXMge0BsaW5rIFR5cGVLZXlzfS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIHtAbGluayBUeXBlS2V5c30g44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZU9mLnR5cGVcbiAgICAgKiAgLSBgZW5gIG9uZSBvZiB7QGxpbmsgVHlwZUtleXN9XG4gICAgICogIC0gYGphYCB7QGxpbmsgVHlwZUtleXN9IOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSB0eXBlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gdHlwZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICB0eXBlT2Y6ICh0eXBlOiBUeXBlS2V5cywgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBpcyBgQXJyYXlgLlxuICAgICAqIEBqYSBgQXJyYXlgIOOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5LnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGFycmF5Lm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBhcnJheTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaXMgYEl0ZXJhYmxlYC5cbiAgICAgKiBAamEgYEl0ZXJhYmxlYCDjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpdGVyYWJsZS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBpdGVyYWJsZS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaXRlcmFibGU6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGluc3RhbmNlIGlzIGVxdWFsIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44Gu44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5zdGFuY2VPZi5jdG9yXG4gICAgICogIC0gYGVuYCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOavlOi8g+WvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBpbnN0YW5jZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGluc3RhbmNlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpbnN0YW5jZSBoYXMgYHN0cmljdGx5YCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3IuXG4gICAgICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OBruWOs+WvhuS4gOiHtOOBl+OBn+OCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIG93bkluc3RhbmNlT2YuY3RvclxuICAgICAqICAtIGBlbmAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDmr5TovIPlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gb3duSW5zdGFuY2VPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBvd25JbnN0YW5jZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBvd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaW5zdGFuY2UgaGFzIG5vdCBgc3RyaWN0bHlgIGVxdWFsIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44KS5oyB44Gk44Kk44Oz44K544K/44Oz44K544Gn44Gq44GE44GT44Go44KS5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm90T3duSW5zdGFuY2VPZi5jdG9yXG4gICAgICogIC0gYGVuYCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOavlOi8g+WvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBub3RPd25JbnN0YW5jZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIG5vdE93bkluc3RhbmNlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIG5vdE93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBoYXMgc3BlY2lmaWVkIHByb3BlcnR5LlxuICAgICAqIEBqYSDmjIflrprjg5fjg63jg5Hjg4bjgqPjgpLmjIHjgaPjgabjgYTjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYXNQcm9wZXJ0eS5wcm9wXG4gICAgICogIC0gYGVuYCBzcGVjaWZpZWQgcHJvcGVydHlcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqIEBwYXJhbSBoYXNQcm9wZXJ0eS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBoYXNQcm9wZXJ0eS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaGFzUHJvcGVydHk6ICh4OiB1bmtub3duLCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBoYXMgb3duIHNwZWNpZmllZCBwcm9wZXJ0eS5cbiAgICAgKiBAamEg5oyH5a6a44OX44Ot44OR44OG44Kj44KS5YWl5Yqb5YCk6Ieq6Lqr5oyB44Gj44Gm44GE44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFzT3duUHJvcGVydHkucHJvcFxuICAgICAqICAtIGBlbmAgc3BlY2lmaWVkIHByb3BlcnR5XG4gICAgICogIC0gYGphYCDlr77osaHjga7jg5fjg63jg5Hjg4bjgqNcbiAgICAgKiBAcGFyYW0gaGFzT3duUHJvcGVydHkueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaGFzT3duUHJvcGVydHkubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGhhc093blByb3BlcnR5OiAoeDogdW5rbm93biwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG59XG5cbi8qKlxuICogQGVuIExpc3Qgb2YgbWV0aG9kIGZvciB0eXBlIHZlcmlmeS5cbiAqIEBqYSDlnovmpJzoqLzjgYzmj5DkvpvjgZnjgovjg6Hjgr3jg4Pjg4nkuIDopqdcbiAqL1xuZXhwb3J0IHR5cGUgVmVyaWZ5TWV0aG9kID0ga2V5b2YgVmVyaWZpZXI7XG5cbi8qKlxuICogQGVuIENvbmNyZXRlIHR5cGUgdmVyaWZpZXIgb2JqZWN0LlxuICogQGphIOWei+aknOiovOWun+ijheOCquODluOCuOOCp+OCr+ODiFxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5jb25zdCBfdmVyaWZpZXI6IFZlcmlmaWVyID0ge1xuICAgIG5vdE51bGxpc2g6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHgpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGEgdmFsaWQgdmFsdWUuYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHR5cGVPZjogKHR5cGU6IFR5cGVLZXlzLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgeCAhPT0gdHlwZSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFR5cGUgb2YgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCAke3R5cGV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBhcnJheTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKCFpc0FycmF5KHgpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhbiBBcnJheS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaXRlcmFibGU6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICghKFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoeCkpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhbiBpdGVyYWJsZSBvYmplY3QuYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAoISh4IGluc3RhbmNlb2YgY3RvcikpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGFuIGluc3RhbmNlIG9mICR7Y3Rvci5uYW1lfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgb3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHggfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpICE9PSBPYmplY3QoY3Rvci5wcm90b3R5cGUpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBpcyBub3Qgb3duIGluc3RhbmNlIG9mICR7Y3Rvci5uYW1lfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgbm90T3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsICE9IHggJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpID09PSBPYmplY3QoY3Rvci5wcm90b3R5cGUpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBpcyBvd24gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBoYXNQcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHggfHwgIShwcm9wIGluICh4IGFzIG9iamVjdCkpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBkb2VzIG5vdCBoYXZlIHByb3BlcnR5ICR7U3RyaW5nKHByb3ApfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaGFzT3duUHJvcGVydHk6ICh4OiB1bmtub3duLCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCA9PSB4IHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoeCwgcHJvcCkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGRvZXMgbm90IGhhdmUgb3duIHByb3BlcnR5ICR7U3RyaW5nKHByb3ApfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBAZW4gVmVyaWZ5IG1ldGhvZC5cbiAqIEBqYSDmpJzoqLzjg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gbWV0aG9kXG4gKiAgLSBgZW5gIG1ldGhvZCBuYW1lIHdoaWNoIHVzaW5nXG4gKiAgLSBgamFgIOS9v+eUqOOBmeOCi+ODoeOCveODg+ODieWQjVxuICogQHBhcmFtIGFyZ3NcbiAqICAtIGBlbmAgYXJndW1lbnRzIHdoaWNoIGNvcnJlc3BvbmRzIHRvIHRoZSBtZXRob2QgbmFtZVxuICogIC0gYGphYCDjg6Hjgr3jg4Pjg4nlkI3jgavlr77lv5zjgZnjgovlvJXmlbBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZlcmlmeTxUTWV0aG9kIGV4dGVuZHMgVmVyaWZ5TWV0aG9kPihtZXRob2Q6IFRNZXRob2QsIC4uLmFyZ3M6IFBhcmFtZXRlcnM8VmVyaWZpZXJbVE1ldGhvZF0+KTogdm9pZCB8IG5ldmVyIHtcbiAgICAoX3ZlcmlmaWVyW21ldGhvZF0gYXMgVW5rbm93bkZ1bmN0aW9uKSguLi5hcmdzKTtcbn1cblxuZXhwb3J0IHsgdmVyaWZ5IGFzIGRlZmF1bHQgfTtcbiIsImltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duT2JqZWN0LFxuICAgIHR5cGUgVHlwZWRBcnJheSxcbiAgICB0eXBlIFR5cGVkQXJyYXlDb25zdHJ1Y3RvcixcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzQXJyYXksXG4gICAgaXNPYmplY3QsXG4gICAgaXNJdGVyYWJsZSxcbiAgICBpc1R5cGVkQXJyYXksXG4gICAgc2FtZUNsYXNzLFxufSBmcm9tICcuL3R5cGVzJztcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGRlZXBFcXVhbCgpICovXG5mdW5jdGlvbiBhcnJheUVxdWFsKGxoczogdW5rbm93bltdLCByaHM6IHVua25vd25bXSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGxlbiA9IGxocy5sZW5ndGg7XG4gICAgaWYgKGxlbiAhPT0gcmhzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKCFkZWVwRXF1YWwobGhzW2ldLCByaHNbaV0pKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBkZWVwRXF1YWwoKSAqL1xuZnVuY3Rpb24gYnVmZmVyRXF1YWwobGhzOiBTaGFyZWRBcnJheUJ1ZmZlciB8IEFycmF5QnVmZmVyLCByaHM6IFNoYXJlZEFycmF5QnVmZmVyIHwgQXJyYXlCdWZmZXIpOiBib29sZWFuIHtcbiAgICBjb25zdCBzaXplID0gbGhzLmJ5dGVMZW5ndGg7XG4gICAgaWYgKHNpemUgIT09IHJocy5ieXRlTGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgbGV0IHBvcyA9IDA7XG4gICAgaWYgKHNpemUgLSBwb3MgPj0gOCkge1xuICAgICAgICBjb25zdCBsZW4gPSBzaXplID4+PiAzO1xuICAgICAgICBjb25zdCBmNjRMID0gbmV3IEZsb2F0NjRBcnJheShsaHMsIDAsIGxlbik7XG4gICAgICAgIGNvbnN0IGY2NFIgPSBuZXcgRmxvYXQ2NEFycmF5KHJocywgMCwgbGVuKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgaWYgKCFPYmplY3QuaXMoZjY0TFtpXSwgZjY0UltpXSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcG9zID0gbGVuIDw8IDM7XG4gICAgfVxuICAgIGlmIChwb3MgPT09IHNpemUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGNvbnN0IEwgPSBuZXcgRGF0YVZpZXcobGhzKTtcbiAgICBjb25zdCBSID0gbmV3IERhdGFWaWV3KHJocyk7XG4gICAgaWYgKHNpemUgLSBwb3MgPj0gNCkge1xuICAgICAgICBpZiAoIU9iamVjdC5pcyhMLmdldFVpbnQzMihwb3MpLCBSLmdldFVpbnQzMihwb3MpKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHBvcyArPSA0O1xuICAgIH1cbiAgICBpZiAoc2l6ZSAtIHBvcyA+PSAyKSB7XG4gICAgICAgIGlmICghT2JqZWN0LmlzKEwuZ2V0VWludDE2KHBvcyksIFIuZ2V0VWludDE2KHBvcykpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcG9zICs9IDI7XG4gICAgfVxuICAgIGlmIChzaXplID4gcG9zKSB7XG4gICAgICAgIGlmICghT2JqZWN0LmlzKEwuZ2V0VWludDgocG9zKSwgUi5nZXRVaW50OChwb3MpKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHBvcyArPSAxO1xuICAgIH1cbiAgICByZXR1cm4gcG9zID09PSBzaXplO1xufVxuXG4vKipcbiAqIEBlbiBTZXQgYnkgc3BlY2lmeWluZyBrZXkgYW5kIHZhbHVlIGZvciB0aGUgb2JqZWN0LiAocHJvdG90eXBlIHBvbGx1dGlvbiBjb3VudGVybWVhc3VyZSlcbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjgasga2V5LCB2YWx1ZSDjgpLmjIflrprjgZfjgaboqK3lrpogKOODl+ODreODiOOCv+OCpOODl+axmuafk+WvvuetlilcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2lnblZhbHVlKHRhcmdldDogVW5rbm93bk9iamVjdCwga2V5OiBzdHJpbmcgfCBudW1iZXIgfCBzeW1ib2wsIHZhbHVlOiB1bmtub3duKTogdm9pZCB7XG4gICAgaWYgKCdfX3Byb3RvX18nICE9PSBrZXkgJiYgJ2NvbnN0cnVjdG9yJyAhPT0ga2V5KSB7XG4gICAgICAgIHRhcmdldFtrZXldID0gdmFsdWU7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBQZXJmb3JtcyBhIGRlZXAgY29tcGFyaXNvbiBiZXR3ZWVuIHR3byB2YWx1ZXMgdG8gZGV0ZXJtaW5lIGlmIHRoZXkgYXJlIGVxdWl2YWxlbnQuXG4gKiBAamEgMuWApOOBruips+e0sOavlOi8g+OCkuOBlywg562J44GX44GE44GL44Gp44GG44GL5Yik5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWVwRXF1YWwobGhzOiB1bmtub3duLCByaHM6IHVua25vd24pOiBib29sZWFuIHtcbiAgICBpZiAobGhzID09PSByaHMpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0Z1bmN0aW9uKGxocykgJiYgaXNGdW5jdGlvbihyaHMpKSB7XG4gICAgICAgIHJldHVybiBsaHMubGVuZ3RoID09PSByaHMubGVuZ3RoICYmIGxocy5uYW1lID09PSByaHMubmFtZTtcbiAgICB9XG4gICAgaWYgKCFpc09iamVjdChsaHMpIHx8ICFpc09iamVjdChyaHMpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgeyAvLyBQcmltaXRpdmUgV3JhcHBlciBPYmplY3RzIC8gRGF0ZVxuICAgICAgICBjb25zdCB2YWx1ZUwgPSBsaHMudmFsdWVPZigpO1xuICAgICAgICBjb25zdCB2YWx1ZVIgPSByaHMudmFsdWVPZigpO1xuICAgICAgICBpZiAobGhzICE9PSB2YWx1ZUwgfHwgcmhzICE9PSB2YWx1ZVIpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZUwgPT09IHZhbHVlUjtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIFJlZ0V4cFxuICAgICAgICBjb25zdCBpc1JlZ0V4cEwgPSBsaHMgaW5zdGFuY2VvZiBSZWdFeHA7XG4gICAgICAgIGNvbnN0IGlzUmVnRXhwUiA9IHJocyBpbnN0YW5jZW9mIFJlZ0V4cDtcbiAgICAgICAgaWYgKGlzUmVnRXhwTCB8fCBpc1JlZ0V4cFIpIHtcbiAgICAgICAgICAgIHJldHVybiBpc1JlZ0V4cEwgPT09IGlzUmVnRXhwUiAmJiBTdHJpbmcobGhzKSA9PT0gU3RyaW5nKHJocyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBBcnJheVxuICAgICAgICBjb25zdCBpc0FycmF5TCA9IGlzQXJyYXkobGhzKTtcbiAgICAgICAgY29uc3QgaXNBcnJheVIgPSBpc0FycmF5KHJocyk7XG4gICAgICAgIGlmIChpc0FycmF5TCB8fCBpc0FycmF5Uikge1xuICAgICAgICAgICAgcmV0dXJuIGlzQXJyYXlMID09PSBpc0FycmF5UiAmJiBhcnJheUVxdWFsKGxocyBhcyB1bmtub3duW10sIHJocyBhcyB1bmtub3duW10pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gQXJyYXlCdWZmZXJcbiAgICAgICAgY29uc3QgaXNCdWZmZXJMID0gbGhzIGluc3RhbmNlb2YgQXJyYXlCdWZmZXI7XG4gICAgICAgIGNvbnN0IGlzQnVmZmVyUiA9IHJocyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyO1xuICAgICAgICBpZiAoaXNCdWZmZXJMIHx8IGlzQnVmZmVyUikge1xuICAgICAgICAgICAgcmV0dXJuIGlzQnVmZmVyTCA9PT0gaXNCdWZmZXJSICYmIGJ1ZmZlckVxdWFsKGxocyBhcyBBcnJheUJ1ZmZlciwgcmhzIGFzIEFycmF5QnVmZmVyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIEFycmF5QnVmZmVyVmlld1xuICAgICAgICBjb25zdCBpc0J1ZmZlclZpZXdMID0gQXJyYXlCdWZmZXIuaXNWaWV3KGxocyk7XG4gICAgICAgIGNvbnN0IGlzQnVmZmVyVmlld1IgPSBBcnJheUJ1ZmZlci5pc1ZpZXcocmhzKTtcbiAgICAgICAgaWYgKGlzQnVmZmVyVmlld0wgfHwgaXNCdWZmZXJWaWV3Uikge1xuICAgICAgICAgICAgcmV0dXJuIGlzQnVmZmVyVmlld0wgPT09IGlzQnVmZmVyVmlld1IgJiYgc2FtZUNsYXNzKGxocywgcmhzKVxuICAgICAgICAgICAgICAgICYmIGJ1ZmZlckVxdWFsKChsaHMgYXMgQXJyYXlCdWZmZXJWaWV3KS5idWZmZXIsIChyaHMgYXMgQXJyYXlCdWZmZXJWaWV3KS5idWZmZXIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gb3RoZXIgSXRlcmFibGVcbiAgICAgICAgY29uc3QgaXNJdGVyYWJsZUwgPSBpc0l0ZXJhYmxlKGxocyk7XG4gICAgICAgIGNvbnN0IGlzSXRlcmFibGVSID0gaXNJdGVyYWJsZShyaHMpO1xuICAgICAgICBpZiAoaXNJdGVyYWJsZUwgfHwgaXNJdGVyYWJsZVIpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0l0ZXJhYmxlTCA9PT0gaXNJdGVyYWJsZVIgJiYgYXJyYXlFcXVhbChbLi4uKGxocyBhcyB1bmtub3duW10pXSwgWy4uLihyaHMgYXMgdW5rbm93bltdKV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChzYW1lQ2xhc3MobGhzLCByaHMpKSB7XG4gICAgICAgIGNvbnN0IGtleXNMID0gbmV3IFNldChPYmplY3Qua2V5cyhsaHMpKTtcbiAgICAgICAgY29uc3Qga2V5c1IgPSBuZXcgU2V0KE9iamVjdC5rZXlzKHJocykpO1xuICAgICAgICBpZiAoa2V5c0wuc2l6ZSAhPT0ga2V5c1Iuc2l6ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGtleXNMKSB7XG4gICAgICAgICAgICBpZiAoIWtleXNSLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGtleXNMKSB7XG4gICAgICAgICAgICBpZiAoIWRlZXBFcXVhbCgobGhzIGFzIFVua25vd25PYmplY3QpW2tleV0sIChyaHMgYXMgVW5rbm93bk9iamVjdClba2V5XSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBsaHMpIHtcbiAgICAgICAgICAgIGlmICghKGtleSBpbiByaHMpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGtleXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gcmhzKSB7XG4gICAgICAgICAgICBpZiAoIShrZXkgaW4gbGhzKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGtleXMuYWRkKGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2Yga2V5cykge1xuICAgICAgICAgICAgaWYgKCFkZWVwRXF1YWwoKGxocyBhcyBVbmtub3duT2JqZWN0KVtrZXldLCAocmhzIGFzIFVua25vd25PYmplY3QpW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBSZWdFeHAgKi9cbmZ1bmN0aW9uIGNsb25lUmVnRXhwKHJlZ2V4cDogUmVnRXhwKTogUmVnRXhwIHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgUmVnRXhwKHJlZ2V4cC5zb3VyY2UsIHJlZ2V4cC5mbGFncyk7XG4gICAgcmVzdWx0Lmxhc3RJbmRleCA9IHJlZ2V4cC5sYXN0SW5kZXg7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBBcnJheUJ1ZmZlciAqL1xuZnVuY3Rpb24gY2xvbmVBcnJheUJ1ZmZlcihhcnJheUJ1ZmZlcjogQXJyYXlCdWZmZXJMaWtlKTogQXJyYXlCdWZmZXIge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBBcnJheUJ1ZmZlcihhcnJheUJ1ZmZlci5ieXRlTGVuZ3RoKTtcbiAgICBuZXcgVWludDhBcnJheShyZXN1bHQpLnNldChuZXcgVWludDhBcnJheShhcnJheUJ1ZmZlcikpO1xuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgY2xvbmUgRGF0YVZpZXcgKi9cbmZ1bmN0aW9uIGNsb25lRGF0YVZpZXcoZGF0YVZpZXc6IERhdGFWaWV3KTogRGF0YVZpZXcge1xuICAgIGNvbnN0IGJ1ZmZlciA9IGNsb25lQXJyYXlCdWZmZXIoZGF0YVZpZXcuYnVmZmVyKTtcbiAgICByZXR1cm4gbmV3IERhdGFWaWV3KGJ1ZmZlciwgZGF0YVZpZXcuYnl0ZU9mZnNldCwgZGF0YVZpZXcuYnl0ZUxlbmd0aCk7XG59XG5cbi8qKiBAaW50ZXJuYWwgY2xvbmUgVHlwZWRBcnJheSAqL1xuZnVuY3Rpb24gY2xvbmVUeXBlZEFycmF5PFQgZXh0ZW5kcyBUeXBlZEFycmF5Pih0eXBlZEFycmF5OiBUKTogVCB7XG4gICAgY29uc3QgYnVmZmVyID0gY2xvbmVBcnJheUJ1ZmZlcih0eXBlZEFycmF5LmJ1ZmZlcik7XG4gICAgcmV0dXJuIG5ldyAodHlwZWRBcnJheS5jb25zdHJ1Y3RvciBhcyBUeXBlZEFycmF5Q29uc3RydWN0b3IpKGJ1ZmZlciwgdHlwZWRBcnJheS5ieXRlT2Zmc2V0LCB0eXBlZEFycmF5Lmxlbmd0aCkgYXMgVDtcbn1cblxuLyoqIEBpbnRlcm5hbCBjaGVjayBuZWNlc3NhcnkgdG8gdXBkYXRlICovXG5mdW5jdGlvbiBuZWVkVXBkYXRlKG9sZFZhbHVlOiB1bmtub3duLCBuZXdWYWx1ZTogdW5rbm93biwgZXhjZXB0VW5kZWZpbmVkOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgaWYgKG9sZFZhbHVlICE9PSBuZXdWYWx1ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKGV4Y2VwdFVuZGVmaW5lZCAmJiB1bmRlZmluZWQgPT09IG9sZFZhbHVlKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgbWVyZ2UgQXJyYXkgKi9cbmZ1bmN0aW9uIG1lcmdlQXJyYXkodGFyZ2V0OiB1bmtub3duW10sIHNvdXJjZTogdW5rbm93bltdKTogdW5rbm93bltdIHtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gc291cmNlLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0W2ldO1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1lcmdlKG9sZFZhbHVlLCBzb3VyY2VbaV0pO1xuICAgICAgICAhbmVlZFVwZGF0ZShvbGRWYWx1ZSwgbmV3VmFsdWUsIGZhbHNlKSB8fCAodGFyZ2V0W2ldID0gbmV3VmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG4vKiogQGludGVybmFsIG1lcmdlIFNldCAqL1xuZnVuY3Rpb24gbWVyZ2VTZXQodGFyZ2V0OiBTZXQ8dW5rbm93bj4sIHNvdXJjZTogU2V0PHVua25vd24+KTogU2V0PHVua25vd24+IHtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygc291cmNlKSB7XG4gICAgICAgIHRhcmdldC5oYXMoaXRlbSkgfHwgdGFyZ2V0LmFkZChtZXJnZSh1bmRlZmluZWQsIGl0ZW0pKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuLyoqIEBpbnRlcm5hbCBtZXJnZSBNYXAgKi9cbmZ1bmN0aW9uIG1lcmdlTWFwKHRhcmdldDogTWFwPHVua25vd24sIHVua25vd24+LCBzb3VyY2U6IE1hcDx1bmtub3duLCB1bmtub3duPik6IE1hcDx1bmtub3duLCB1bmtub3duPiB7XG4gICAgZm9yIChjb25zdCBbaywgdl0gb2Ygc291cmNlKSB7XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0LmdldChrKTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBtZXJnZShvbGRWYWx1ZSwgdik7XG4gICAgICAgICFuZWVkVXBkYXRlKG9sZFZhbHVlLCBuZXdWYWx1ZSwgZmFsc2UpIHx8IHRhcmdldC5zZXQoaywgbmV3VmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG4vKiogQGludGVybmFsIG1lcmdlIG9iamVjdCBwcm9wZXJ0eSAqL1xuZnVuY3Rpb24gbWVyZ2VPYmplY3RQcm9wZXJ0eSh0YXJnZXQ6IFVua25vd25PYmplY3QsIHNvdXJjZTogVW5rbm93bk9iamVjdCwga2V5OiBzdHJpbmcgfCBudW1iZXIgfCBzeW1ib2wpOiB2b2lkIHtcbiAgICBpZiAoJ19fcHJvdG9fXycgIT09IGtleSAmJiAnY29uc3RydWN0b3InICE9PSBrZXkpIHtcbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXRba2V5XTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBtZXJnZShvbGRWYWx1ZSwgc291cmNlW2tleV0pO1xuICAgICAgICAhbmVlZFVwZGF0ZShvbGRWYWx1ZSwgbmV3VmFsdWUsIHRydWUpIHx8ICh0YXJnZXRba2V5XSA9IG5ld1ZhbHVlKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBkZWVwTWVyZ2UoKSAqL1xuZnVuY3Rpb24gbWVyZ2UodGFyZ2V0OiB1bmtub3duLCBzb3VyY2U6IHVua25vd24pOiB1bmtub3duIHtcbiAgICBpZiAodW5kZWZpbmVkID09PSBzb3VyY2UgfHwgdGFyZ2V0ID09PSBzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG4gICAgaWYgKCFpc09iamVjdChzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgfVxuICAgIC8vIFByaW1pdGl2ZSBXcmFwcGVyIE9iamVjdHMgLyBEYXRlXG4gICAgaWYgKHNvdXJjZS52YWx1ZU9mKCkgIT09IHNvdXJjZSkge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IG5ldyAoc291cmNlLmNvbnN0cnVjdG9yIGFzIE9iamVjdENvbnN0cnVjdG9yKShzb3VyY2UudmFsdWVPZigpKTtcbiAgICB9XG4gICAgLy8gUmVnRXhwXG4gICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IGNsb25lUmVnRXhwKHNvdXJjZSk7XG4gICAgfVxuICAgIC8vIEFycmF5QnVmZmVyXG4gICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBkZWVwRXF1YWwodGFyZ2V0LCBzb3VyY2UpID8gdGFyZ2V0IDogY2xvbmVBcnJheUJ1ZmZlcihzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBBcnJheUJ1ZmZlclZpZXdcbiAgICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KHNvdXJjZSkpIHtcbiAgICAgICAgcmV0dXJuIGRlZXBFcXVhbCh0YXJnZXQsIHNvdXJjZSkgPyB0YXJnZXQgOiBpc1R5cGVkQXJyYXkoc291cmNlKSA/IGNsb25lVHlwZWRBcnJheShzb3VyY2UpIDogY2xvbmVEYXRhVmlldyhzb3VyY2UgYXMgRGF0YVZpZXcpO1xuICAgIH1cbiAgICAvLyBBcnJheVxuICAgIGlmIChBcnJheS5pc0FycmF5KHNvdXJjZSkpIHtcbiAgICAgICAgcmV0dXJuIG1lcmdlQXJyYXkoaXNBcnJheSh0YXJnZXQpID8gdGFyZ2V0IDogW10sIHNvdXJjZSk7XG4gICAgfVxuICAgIC8vIFNldFxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBTZXQpIHtcbiAgICAgICAgcmV0dXJuIG1lcmdlU2V0KHRhcmdldCBpbnN0YW5jZW9mIFNldCA/IHRhcmdldCA6IG5ldyBTZXQoKSwgc291cmNlKTtcbiAgICB9XG4gICAgLy8gTWFwXG4gICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgICByZXR1cm4gbWVyZ2VNYXAodGFyZ2V0IGluc3RhbmNlb2YgTWFwID8gdGFyZ2V0IDogbmV3IE1hcCgpLCBzb3VyY2UpO1xuICAgIH1cblxuICAgIGNvbnN0IG9iaiA9IGlzT2JqZWN0KHRhcmdldCkgPyB0YXJnZXQgOiB7fTtcbiAgICBpZiAoc2FtZUNsYXNzKHRhcmdldCwgc291cmNlKSkge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzb3VyY2UpKSB7XG4gICAgICAgICAgICBtZXJnZU9iamVjdFByb3BlcnR5KG9iaiBhcyBVbmtub3duT2JqZWN0LCBzb3VyY2UgYXMgVW5rbm93bk9iamVjdCwga2V5KTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgbWVyZ2VPYmplY3RQcm9wZXJ0eShvYmogYXMgVW5rbm93bk9iamVjdCwgc291cmNlIGFzIFVua25vd25PYmplY3QsIGtleSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBAZW4gUmVjdXJzaXZlbHkgbWVyZ2VzIG93biBhbmQgaW5oZXJpdGVkIGVudW1lcmFibGUgc3RyaW5nIGtleWVkIHByb3BlcnRpZXMgb2Ygc291cmNlIG9iamVjdHMgaW50byB0aGUgZGVzdGluYXRpb24gb2JqZWN0LlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBruWGjeW4sOeahOODnuODvOOCuOOCkuWun+ihjFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVlcE1lcmdlPFQsIFMxLCBTMiwgUzMsIFM0LCBTNSwgUzYsIFM3LCBTOCwgUzk+KFxuICAgIHRhcmdldDogVCxcbiAgICAuLi5zb3VyY2VzOiBbUzEsIFMyPywgUzM/LCBTND8sIFM1PywgUzY/LCBTNz8sIFM4PywgUzk/LCAuLi51bmtub3duW11dXG4pOiBUICYgUzEgJiBTMiAmIFMzICYgUzQgJiBTNSAmIFM2ICYgUzcgJiBTOCAmIFM5O1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBNZXJnZTxYPih0YXJnZXQ6IHVua25vd24sIC4uLnNvdXJjZXM6IHVua25vd25bXSk6IFg7XG5leHBvcnQgZnVuY3Rpb24gZGVlcE1lcmdlKHRhcmdldDogdW5rbm93biwgLi4uc291cmNlczogdW5rbm93bltdKTogdW5rbm93biB7XG4gICAgbGV0IHJlc3VsdCA9IHRhcmdldDtcbiAgICBmb3IgKGNvbnN0IHNvdXJjZSBvZiBzb3VyY2VzKSB7XG4gICAgICAgIHJlc3VsdCA9IG1lcmdlKHJlc3VsdCwgc291cmNlKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENyZWF0ZSBkZWVwIGNvcHkgaW5zdGFuY2Ugb2Ygc291cmNlIG9iamVjdC5cbiAqIEBqYSDjg4fjgqPjg7zjg5fjgrPjg5Tjg7zjgqrjg5bjgrjjgqfjgq/jg4jjga7nlJ/miJBcbiAqXG4gKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9zdHJ1Y3R1cmVkQ2xvbmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBDb3B5PFQ+KHNyYzogVCk6IFQge1xuICAgIHJldHVybiBkZWVwTWVyZ2UodW5kZWZpbmVkLCBzcmMpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB0eXBlIHtcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgVW5rbm93bk9iamVjdCxcbiAgICBBY2Nlc3NpYmxlLFxuICAgIE51bGxpc2gsXG4gICAgVHlwZSxcbiAgICBDbGFzcyxcbiAgICBDb25zdHJ1Y3Rvcixcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogQGVuIE1peGluIGNsYXNzJ3MgYmFzZSBpbnRlcmZhY2UuXG4gKiBAamEgTWl4aW4g44Kv44Op44K544Gu5Z+65bqV44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pXG4gKi9cbmV4cG9ydCBkZWNsYXJlIGNsYXNzIE1peGluQ2xhc3Mge1xuICAgIC8qKlxuICAgICAqIEBlbiBjYWxsIG1peGluIHNvdXJjZSBjbGFzcydzIGBzdXBlcigpYC4gPGJyPlxuICAgICAqICAgICBUaGlzIG1ldGhvZCBzaG91bGQgYmUgY2FsbGVkIGZyb20gY29uc3RydWN0b3IuXG4gICAgICogQGphIE1peGluIOOCr+ODqeOCueOBruWfuuW6leOCpOODs+OCv+ODvOODleOCp+OCpOOCueWumue+qSA8YnI+XG4gICAgICogICAgIOOCs+ODs+OCueODiOODqeOCr+OCv+OBi+OCieWRvOOBtuOBk+OBqOOCkuaDs+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHNyY0NsYXNzXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gdGFyZ2V0IGNsYXNzIG5hbWUuIGV4KSBmcm9tIFMxIGF2YWlsYWJsZVxuICAgICAqICAtIGBqYWAg44Kz44Oz44K544OI44Op44Kv44OI44GZ44KL44Kv44Op44K55ZCN44KS5oyH5a6aIGV4KSBTMSDjgYvjgonmjIflrprlj6/og71cbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIHBhcmFtZXRlcnNcbiAgICAgKiAgLSBgamFgIOOCs+ODs+OCueODiOODqeOCr+ODiOOBq+S9v+eUqOOBmeOCi+W8leaVsFxuICAgICAqL1xuICAgIHByb3RlY3RlZCBzdXBlcjxUIGV4dGVuZHMgQ2xhc3M+KHNyY0NsYXNzOiBULCAuLi5hcmdzOiBDb25zdHJ1Y3RvclBhcmFtZXRlcnM8VD4pOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBpbnB1dCBjbGFzcyBpcyBtaXhpbmVkIChleGNsdWRpbmcgb3duIGNsYXNzKS5cbiAgICAgKiBAamEg5oyH5a6a44Kv44Op44K544GMIE1peGluIOOBleOCjOOBpuOBhOOCi+OBi+eiuuiqjSAo6Ieq6Lqr44Gu44Kv44Op44K544Gv5ZCr44G+44KM44Gq44GEKVxuICAgICAqXG4gICAgICogQHBhcmFtIG1peGVkQ2xhc3NcbiAgICAgKiAgLSBgZW5gIHNldCB0YXJnZXQgY2xhc3MgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOWvvuixoeOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBpc01peGVkV2l0aDxUIGV4dGVuZHMgb2JqZWN0PihtaXhlZENsYXNzOiBDb25zdHJ1Y3RvcjxUPik6IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGVuIE1peGVkIHN1YiBjbGFzcyBjb25zdHJ1Y3RvciBkZWZpbml0aW9ucy5cbiAqIEBqYSDlkIjmiJDjgZfjgZ/jgrXjg5bjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/lrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNaXhpbkNvbnN0cnVjdG9yPEIgZXh0ZW5kcyBDbGFzcywgVSBleHRlbmRzIG9iamVjdD4gZXh0ZW5kcyBUeXBlPFU+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gY29uc3RydWN0b3JcbiAgICAgKiBAamEg44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgYmFzZSBjbGFzcyBhcmd1bWVudHNcbiAgICAgKiAgLSBgamFgIOWfuuW6leOCr+ODqeOCueOBq+aMh+WumuOBl+OBn+W8leaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB1bmlvbiB0eXBlIG9mIGNsYXNzZXMgd2hlbiBjYWxsaW5nIHtAbGluayBtaXhpbnN9KClcbiAgICAgKiAgLSBgamFgIHtAbGluayBtaXhpbnN9KCkg44Gr5rih44GX44Gf44Kv44Op44K544Gu6ZuG5ZCIXG4gICAgICovXG4gICAgbmV3KC4uLmFyZ3M6IENvbnN0cnVjdG9yUGFyYW1ldGVyczxCPik6IFU7XG59XG5cbi8qKlxuICogQGVuIERlZmluaXRpb24gb2Yge0BsaW5rIHNldE1peENsYXNzQXR0cmlidXRlfSBmdW5jdGlvbidzIGFyZ3VtZW50cy5cbiAqIEBqYSB7QGxpbmsgc2V0TWl4Q2xhc3NBdHRyaWJ1dGV9IOOBruWPluOCiuOBhuOCi+W8leaVsOWumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1peENsYXNzQXR0cmlidXRlIHtcbiAgICAvKipcbiAgICAgKiBAZW4gU3VwcHJlc3MgcHJvdmlkaW5nIGNvbnN0cnVjdG9yLXRyYXAgZm9yIHRoZSBtaXhpbiBzb3VyY2UgY2xhc3MuIEluIHRoaXMgY2FzZSwgYGlzTWl4ZWRXaXRoYCwgYGluc3RhbmNlb2ZgIGFsc28gYmVjb21lcyBpbnZhbGlkLiAoZm9yIGltcHJvdmluZyBwZXJmb3JtYW5jZSlcbiAgICAgKiBAamEgTWl4aW4gU291cmNlIOOCr+ODqeOCueOBq+WvvuOBl+OBpiwg44Kz44Oz44K544OI44Op44Kv44K/44OI44Op44OD44OX44KS5oqR5q2iLiDjgZPjgozjgpLmjIflrprjgZfjgZ/loLTlkIgsIGBpc01peGVkV2l0aGAsIGBpbnN0YW5jZW9mYCDjgoLnhKHlirnjgavjgarjgosuICjjg5Hjg5Xjgqnjg7zjg57jg7PjgrnmlLnlloQpXG4gICAgICovXG4gICAgcHJvdG9FeHRlbmRzT25seTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXR1cCBbU3ltYm9sLmhhc0luc3RhbmNlXSBwcm9wZXJ0eS4gPGJyPlxuICAgICAqICAgICBUaGUgY2xhc3MgZGVzaWduYXRlZCBhcyBhIHNvdXJjZSBvZiB7QGxpbmsgbWl4aW5zfSgpIGhhcyBbU3ltYm9sLmhhc0luc3RhbmNlXSBwcm9wZXJ0eSBpbXBsaWNpdGx5LiA8YnI+XG4gICAgICogICAgIEl0J3MgdXNlZCB0byBhdm9pZCBiZWNvbWluZyB0aGUgYmVoYXZpb3IgYGluc3RhbmNlb2ZgIGRvZXNuJ3QgaW50ZW5kIHdoZW4gdGhlIGNsYXNzIGlzIGV4dGVuZGVkIGZyb20gdGhlIG1peGluZWQgY2xhc3MgdGhlIG90aGVyIHBsYWNlLlxuICAgICAqIEBqYSBbU3ltYm9sLmhhc0luc3RhbmNlXSDjg5fjg63jg5Hjg4bjgqPoqK3lrpo8YnI+XG4gICAgICogICAgIHtAbGluayBtaXhpbnN9KCkg44Gu44K944O844K544Gr5oyH5a6a44GV44KM44Gf44Kv44Op44K544GvIFtTeW1ib2wuaGFzSW5zdGFuY2VdIOOCkuaal+m7meeahOOBq+WCmeOBiOOCi+OBn+OCgTxicj5cbiAgICAgKiAgICAg44Gd44Gu44Kv44Op44K544GM5LuW44Gn57aZ5om/44GV44KM44Gm44GE44KL5aC05ZCIIGBpbnN0YW5jZW9mYCDjgYzmhI/lm7PjgZfjgarjgYTmjK/jgovoiJ7jgYTjgajjgarjgovjga7jgpLpgb/jgZHjgovjgZ/jgoHjgavkvb/nlKjjgZnjgosuXG4gICAgICovXG4gICAgaW5zdGFuY2VPZjogKChpbnN0OiBvYmplY3QpID0+IGJvb2xlYW4pIHwgTnVsbGlzaDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX29ialByb3RvdHlwZSAgICAgPSBPYmplY3QucHJvdG90eXBlO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfaW5zdGFuY2VPZiAgICAgICA9IEZ1bmN0aW9uLnByb3RvdHlwZVtTeW1ib2wuaGFzSW5zdGFuY2VdO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfb3ZlcnJpZGUgICAgICAgICA9IFN5bWJvbCgnb3ZlcnJpZGUnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2lzSW5oZXJpdGVkICAgICAgPSBTeW1ib2woJ2lzLWluaGVyaXRlZCcpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY29uc3RydWN0b3JzICAgICA9IFN5bWJvbCgnY29uc3RydWN0b3JzJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9jbGFzc0Jhc2UgICAgICAgID0gU3ltYm9sKCdjbGFzcy1iYXNlJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9jbGFzc1NvdXJjZXMgICAgID0gU3ltYm9sKCdjbGFzcy1zb3VyY2VzJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm90b0V4dGVuZHNPbmx5ID0gU3ltYm9sKCdwcm90by1leHRlbmRzLW9ubHknKTtcblxuLyoqIEBpbnRlcm5hbCBjb3B5IHByb3BlcnRpZXMgY29yZSAqL1xuZnVuY3Rpb24gcmVmbGVjdFByb3BlcnRpZXModGFyZ2V0OiBVbmtub3duT2JqZWN0LCBzb3VyY2U6IG9iamVjdCwga2V5OiBzdHJpbmcgfCBzeW1ib2wpOiB2b2lkIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAobnVsbCA9PSB0YXJnZXRba2V5XSkge1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNvdXJjZSwga2V5KSBhcyBQcm9wZXJ0eURlY29yYXRvcik7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gbm9vcFxuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBvYmplY3QgcHJvcGVydGllcyBjb3B5IG1ldGhvZCAqL1xuZnVuY3Rpb24gY29weVByb3BlcnRpZXModGFyZ2V0OiBvYmplY3QsIHNvdXJjZTogb2JqZWN0KTogdm9pZCB7XG4gICAgc291cmNlICYmIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHNvdXJjZSlcbiAgICAgICAgLmZpbHRlcihrZXkgPT4gIS8ocHJvdG90eXBlfG5hbWV8Y29uc3RydWN0b3IpLy50ZXN0KGtleSkpXG4gICAgICAgIC5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICByZWZsZWN0UHJvcGVydGllcyh0YXJnZXQgYXMgVW5rbm93bk9iamVjdCwgc291cmNlLCBrZXkpO1xuICAgICAgICB9KTtcbiAgICBzb3VyY2UgJiYgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzb3VyY2UpXG4gICAgICAgIC5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICByZWZsZWN0UHJvcGVydGllcyh0YXJnZXQgYXMgVW5rbm93bk9iamVjdCwgc291cmNlLCBrZXkpO1xuICAgICAgICB9KTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNldE1peENsYXNzQXR0cmlidXRlKHRhcmdldCwgJ2luc3RhbmNlT2YnKSAqL1xuZnVuY3Rpb24gc2V0SW5zdGFuY2VPZjxUIGV4dGVuZHMgb2JqZWN0Pih0YXJnZXQ6IENvbnN0cnVjdG9yPFQ+LCBtZXRob2Q6ICgoaW5zdDogb2JqZWN0KSA9PiBib29sZWFuKSB8IE51bGxpc2gpOiB2b2lkIHtcbiAgICBjb25zdCBiZWhhdmlvdXIgPSBtZXRob2QgPz8gKG51bGwgPT09IG1ldGhvZCA/IHVuZGVmaW5lZCA6ICgoaTogb2JqZWN0KSA9PiBPYmplY3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YuY2FsbCh0YXJnZXQucHJvdG90eXBlLCBpKSkpO1xuICAgIGNvbnN0IGFwcGxpZWQgPSBiZWhhdmlvdXIgJiYgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIF9vdmVycmlkZSk7XG4gICAgaWYgKCFhcHBsaWVkKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwge1xuICAgICAgICAgICAgW1N5bWJvbC5oYXNJbnN0YW5jZV06IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogYmVoYXZpb3VyLFxuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFtfb3ZlcnJpZGVdOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGJlaGF2aW91ciA/IHRydWUgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIFNldCB0aGUgTWl4aW4gY2xhc3MgYXR0cmlidXRlLlxuICogQGphIE1peGluIOOCr+ODqeOCueOBq+WvvuOBl+OBpuWxnuaAp+OCkuioreWumlxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogLy8gJ3Byb3RvRXh0ZW5kT25seSdcbiAqIGNsYXNzIEJhc2UgeyBjb25zdHJ1Y3RvcihhLCBiKSB7fSB9O1xuICogY2xhc3MgTWl4QSB7IH07XG4gKiBzZXRNaXhDbGFzc0F0dHJpYnV0ZShNaXhBLCAncHJvdG9FeHRlbmRzT25seScpOyAgLy8gZm9yIGltcHJvdmluZyBjb25zdHJ1Y3Rpb24gcGVyZm9ybWFuY2VcbiAqIGNsYXNzIE1peEIgeyBjb25zdHJ1Y3RvcihjLCBkKSB7fSB9O1xuICpcbiAqIGNsYXNzIE1peGluQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoQmFzZSwgTWl4QSwgTWl4Qikge1xuICogICAgIGNvbnN0cnVjdG9yKGEsIGIsIGMsIGQpe1xuICogICAgICAgICAvLyBjYWxsaW5nIGBCYXNlYCBjb25zdHJ1Y3RvclxuICogICAgICAgICBzdXBlcihhLCBiKTtcbiAqXG4gKiAgICAgICAgIC8vIGNhbGxpbmcgTWl4aW4gY2xhc3MncyBjb25zdHJ1Y3RvclxuICogICAgICAgICB0aGlzLnN1cGVyKE1peEEpOyAgICAgICAgLy8gbm8gYWZmZWN0XG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QiwgYywgZCk7XG4gKiAgICAgfVxuICogfVxuICpcbiAqIGNvbnN0IG1peGVkID0gbmV3IE1peGluQ2xhc3MoKTtcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgTWl4QSk7ICAgIC8vIGZhbHNlXG4gKiBjb25zb2xlLmxvZyhtaXhlZC5pc01peGVkV2l0aChNaXhBKSk7ICAvLyBmYWxzZVxuICpcbiAqIC8vICdpbnN0YW5jZU9mJ1xuICogY2xhc3MgQmFzZSB7fTtcbiAqIGNsYXNzIFNvdXJjZSB7fTtcbiAqIGNsYXNzIE1peGluQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoQmFzZSwgU291cmNlKSB7fTtcbiAqXG4gKiBjbGFzcyBPdGhlciBleHRlbmRzIFNvdXJjZSB7fTtcbiAqXG4gKiBjb25zdCBvdGhlciA9IG5ldyBPdGhlcigpO1xuICogY29uc3QgbWl4ZWQgPSBuZXcgTWl4aW5DbGFzcygpO1xuICogY29uc29sZS5sb2cob3RoZXIgaW5zdGFuY2VvZiBTb3VyY2UpOyAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cob3RoZXIgaW5zdGFuY2VvZiBPdGhlcik7ICAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBNaXhpbkNsYXNzKTsgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBCYXNlKTsgICAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBTb3VyY2UpOyAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBPdGhlcik7ICAgICAgICAgLy8gdHJ1ZSA/Pz9cbiAqXG4gKiBzZXRNaXhDbGFzc0F0dHJpYnV0ZShPdGhlciwgJ2luc3RhbmNlT2YnKTsgLy8gb3Igc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoT3RoZXIsICdpbnN0YW5jZU9mJywgbnVsbCk7XG4gKiBjb25zb2xlLmxvZyhvdGhlciBpbnN0YW5jZW9mIFNvdXJjZSk7ICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhvdGhlciBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyBmYWxzZSAhXG4gKlxuICogLy8gW0Jlc3QgUHJhY3RpY2VdIElmIHlvdSBkZWNsYXJlIHRoZSBkZXJpdmVkLWNsYXNzIGZyb20gbWl4aW4sIHlvdSBzaG91bGQgY2FsbCB0aGUgZnVuY3Rpb24gZm9yIGF2b2lkaW5nIGBpbnN0YW5jZW9mYCBsaW1pdGF0aW9uLlxuICogY2xhc3MgRGVyaXZlZENsYXNzIGV4dGVuZHMgTWl4aW5DbGFzcyB7fVxuICogc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRGVyaXZlZENsYXNzLCAnaW5zdGFuY2VPZicpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBzZXQgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gKiAgLSBgamFgIOioreWumuWvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHBhcmFtIGF0dHJcbiAqICAtIGBlbmA6XG4gKiAgICAtIGBwcm90b0V4dGVuZHNPbmx5YDogU3VwcHJlc3MgcHJvdmlkaW5nIGNvbnN0cnVjdG9yLXRyYXAgZm9yIHRoZSBtaXhpbiBzb3VyY2UgY2xhc3MuIChmb3IgaW1wcm92aW5nIHBlcmZvcm1hbmNlKVxuICogICAgLSBgaW5zdGFuY2VPZmAgICAgICA6IGZ1bmN0aW9uIGJ5IHVzaW5nIFtTeW1ib2wuaGFzSW5zdGFuY2VdIDxicj5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBEZWZhdWx0IGJlaGF2aW91ciBpcyBgeyByZXR1cm4gdGFyZ2V0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGluc3RhbmNlKSB9YFxuICogICAgICAgICAgICAgICAgICAgICAgICAgIElmIHNldCBgbnVsbGAsIGRlbGV0ZSBbU3ltYm9sLmhhc0luc3RhbmNlXSBwcm9wZXJ0eS5cbiAqICAtIGBqYWA6XG4gKiAgICAtIGBwcm90b0V4dGVuZHNPbmx5YDogTWl4aW4gU291cmNlIOOCr+ODqeOCueOBq+WvvuOBl+OBpiwg44Kz44Oz44K544OI44Op44Kv44K/44OI44Op44OD44OX44KS5oqR5q2iICjjg5Hjg5Xjgqnjg7zjg57jg7PjgrnmlLnlloQpXG4gKiAgICAtIGBpbnN0YW5jZU9mYCAgICAgIDogW1N5bWJvbC5oYXNJbnN0YW5jZV0g44GM5L2/55So44GZ44KL6Zai5pWw44KS5oyH5a6aIDxicj5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICDml6Llrprjgafjga8gYHsgcmV0dXJuIHRhcmdldC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnN0YW5jZSkgfWAg44GM5L2/55So44GV44KM44KLXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICBgbnVsbGAg5oyH5a6a44KS44GZ44KL44GoIFtTeW1ib2wuaGFzSW5zdGFuY2VdIOODl+ODreODkeODhuOCo+OCkuWJiumZpOOBmeOCi1xuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0TWl4Q2xhc3NBdHRyaWJ1dGU8VCBleHRlbmRzIG9iamVjdCwgVSBleHRlbmRzIGtleW9mIE1peENsYXNzQXR0cmlidXRlPihcbiAgICB0YXJnZXQ6IENvbnN0cnVjdG9yPFQ+LFxuICAgIGF0dHI6IFUsXG4gICAgbWV0aG9kPzogTWl4Q2xhc3NBdHRyaWJ1dGVbVV1cbik6IHZvaWQge1xuICAgIHN3aXRjaCAoYXR0cikge1xuICAgICAgICBjYXNlICdwcm90b0V4dGVuZHNPbmx5JzpcbiAgICAgICAgICAgICh0YXJnZXQgYXMgQWNjZXNzaWJsZTxDb25zdHJ1Y3RvcjxUPj4pW19wcm90b0V4dGVuZHNPbmx5XSA9IHRydWU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnaW5zdGFuY2VPZic6XG4gICAgICAgICAgICBzZXRJbnN0YW5jZU9mKHRhcmdldCwgbWV0aG9kKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBNaXhpbiBmdW5jdGlvbiBmb3IgbXVsdGlwbGUgaW5oZXJpdGFuY2UuIDxicj5cbiAqICAgICBSZXNvbHZpbmcgdHlwZSBzdXBwb3J0IGZvciBtYXhpbXVtIDEwIGNsYXNzZXMuXG4gKiBAamEg5aSa6YeN57aZ5om/44Gu44Gf44KB44GuIE1peGluIDxicj5cbiAqICAgICDmnIDlpKcgMTAg44Kv44Op44K544Gu5Z6L6Kej5rG644KS44K144Od44O844OIXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjbGFzcyBCYXNlIHsgY29uc3RydWN0b3IoYSwgYikge30gfTtcbiAqIGNsYXNzIE1peEEgeyBjb25zdHJ1Y3RvcihhLCBiKSB7fSB9O1xuICogY2xhc3MgTWl4QiB7IGNvbnN0cnVjdG9yKGMsIGQpIHt9IH07XG4gKlxuICogY2xhc3MgTWl4aW5DbGFzcyBleHRlbmRzIG1peGlucyhCYXNlLCBNaXhBLCBNaXhCKSB7XG4gKiAgICAgY29uc3RydWN0b3IoYSwgYiwgYywgZCl7XG4gKiAgICAgICAgIC8vIGNhbGxpbmcgYEJhc2VgIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHN1cGVyKGEsIGIpO1xuICpcbiAqICAgICAgICAgLy8gY2FsbGluZyBNaXhpbiBjbGFzcydzIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QSwgYSwgYik7XG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QiwgYywgZCk7XG4gKiAgICAgfVxuICogfVxuICogYGBgXG4gKlxuICogQHBhcmFtIGJhc2VcbiAqICAtIGBlbmAgcHJpbWFyeSBiYXNlIGNsYXNzLiBzdXBlcihhcmdzKSBpcyB0aGlzIGNsYXNzJ3Mgb25lLlxuICogIC0gYGphYCDln7rlupXjgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr8uIOWQjOWQjeODl+ODreODkeODhuOCoywg44Oh44K944OD44OJ44Gv5pyA5YSq5YWI44GV44KM44KLLiBzdXBlcihhcmdzKSDjga/jgZPjga7jgq/jg6njgrnjga7jgoLjga7jgYzmjIflrprlj6/og70uXG4gKiBAcGFyYW0gc291cmNlc1xuICogIC0gYGVuYCBtdWx0aXBsZSBleHRlbmRzIGNsYXNzXG4gKiAgLSBgamFgIOaLoeW8teOCr+ODqeOCueOCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHJldHVybnNcbiAqICAtIGBlbmAgbWl4aW5lZCBjbGFzcyBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDlkIjmiJDjgZXjgozjgZ/jgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1peGluczxcbiAgICBCIGV4dGVuZHMgQ2xhc3MsXG4gICAgUzEgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzIgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzMgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzQgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzUgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzYgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzcgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzggZXh0ZW5kcyBvYmplY3QsXG4gICAgUzkgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGJhc2U6IEIsXG4gICAgLi4uc291cmNlczogW1xuICAgICAgICBDb25zdHJ1Y3RvcjxTMT4sXG4gICAgICAgIENvbnN0cnVjdG9yPFMyPj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFMzPj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM0Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM1Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM2Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM3Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM4Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM5Pj8sXG4gICAgICAgIC4uLmFueVtdXG4gICAgXSk6IE1peGluQ29uc3RydWN0b3I8QiwgTWl4aW5DbGFzcyAmIEluc3RhbmNlVHlwZTxCPiAmIFMxICYgUzIgJiBTMyAmIFM0ICYgUzUgJiBTNiAmIFM3ICYgUzggJiBTOT4ge1xuXG4gICAgbGV0IF9oYXNTb3VyY2VDb25zdHJ1Y3RvciA9IGZhbHNlO1xuXG4gICAgY2xhc3MgX01peGluQmFzZSBleHRlbmRzIChiYXNlIGFzIHVua25vd24gYXMgQ29uc3RydWN0b3I8TWl4aW5DbGFzcz4pIHtcblxuICAgICAgICBwcml2YXRlIHJlYWRvbmx5IFtfY29uc3RydWN0b3JzXTogTWFwPENvbnN0cnVjdG9yPG9iamVjdD4sIFVua25vd25GdW5jdGlvbiB8IG51bGw+O1xuICAgICAgICBwcml2YXRlIHJlYWRvbmx5IFtfY2xhc3NCYXNlXTogQ29uc3RydWN0b3I8b2JqZWN0PjtcblxuICAgICAgICBjb25zdHJ1Y3RvciguLi5hcmdzOiB1bmtub3duW10pIHtcbiAgICAgICAgICAgIHN1cGVyKC4uLmFyZ3MpO1xuXG4gICAgICAgICAgICBjb25zdCBjb25zdHJ1Y3RvcnMgPSBuZXcgTWFwPENvbnN0cnVjdG9yPG9iamVjdD4sIFVua25vd25GdW5jdGlvbj4oKTtcbiAgICAgICAgICAgIHRoaXNbX2NvbnN0cnVjdG9yc10gPSBjb25zdHJ1Y3RvcnM7XG4gICAgICAgICAgICB0aGlzW19jbGFzc0Jhc2VdID0gYmFzZTtcblxuICAgICAgICAgICAgaWYgKF9oYXNTb3VyY2VDb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc3JjQ2xhc3Mgb2Ygc291cmNlcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXNyY0NsYXNzW19wcm90b0V4dGVuZHNPbmx5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFuZGxlciA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBseTogKHRhcmdldDogdW5rbm93biwgdGhpc29iajogdW5rbm93biwgYXJnbGlzdDogdW5rbm93bltdKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9iaiA9IG5ldyBzcmNDbGFzcyguLi5hcmdsaXN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29weVByb3BlcnRpZXModGhpcywgb2JqKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHJveHkgZm9yICdjb25zdHJ1Y3QnIGFuZCBjYWNoZSBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3RydWN0b3JzLnNldChzcmNDbGFzcywgbmV3IFByb3h5KHNyY0NsYXNzLCBoYW5kbGVyIGFzIFByb3h5SGFuZGxlcjxvYmplY3Q+KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBwcm90ZWN0ZWQgc3VwZXI8VCBleHRlbmRzIENsYXNzPihzcmNDbGFzczogVCwgLi4uYXJnczogQ29uc3RydWN0b3JQYXJhbWV0ZXJzPFQ+KTogdGhpcyB7XG4gICAgICAgICAgICBjb25zdCBtYXAgPSB0aGlzW19jb25zdHJ1Y3RvcnNdO1xuICAgICAgICAgICAgY29uc3QgY3RvciA9IG1hcC5nZXQoc3JjQ2xhc3MpO1xuICAgICAgICAgICAgaWYgKGN0b3IpIHtcbiAgICAgICAgICAgICAgICBjdG9yLmNhbGwodGhpcywgLi4uYXJncyk7XG4gICAgICAgICAgICAgICAgbWFwLnNldChzcmNDbGFzcywgbnVsbCk7ICAgIC8vIHByZXZlbnQgY2FsbGluZyB0d2ljZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgaXNNaXhlZFdpdGg8VCBleHRlbmRzIG9iamVjdD4oc3JjQ2xhc3M6IENvbnN0cnVjdG9yPFQ+KTogYm9vbGVhbiB7XG4gICAgICAgICAgICBpZiAodGhpcy5jb25zdHJ1Y3RvciA9PT0gc3JjQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXNbX2NsYXNzQmFzZV0gPT09IHNyY0NsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzW19jbGFzc1NvdXJjZXNdLnJlZHVjZSgocCwgYykgPT4gcCB8fCAoc3JjQ2xhc3MgPT09IGMpLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgc3RhdGljIFtTeW1ib2wuaGFzSW5zdGFuY2VdKGluc3RhbmNlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mLmNhbGwoX01peGluQmFzZS5wcm90b3R5cGUsIGluc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBbX2lzSW5oZXJpdGVkXTxUIGV4dGVuZHMgb2JqZWN0PihzcmNDbGFzczogQ29uc3RydWN0b3I8VD4pOiBib29sZWFuIHtcbiAgICAgICAgICAgIGNvbnN0IGN0b3JzID0gdGhpc1tfY29uc3RydWN0b3JzXTtcbiAgICAgICAgICAgIGlmIChjdG9ycy5oYXMoc3JjQ2xhc3MpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGN0b3Igb2YgY3RvcnMua2V5cygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZi5jYWxsKHNyY0NsYXNzLCBjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBwcml2YXRlIGdldCBbX2NsYXNzU291cmNlc10oKTogQ29uc3RydWN0b3I8b2JqZWN0PltdIHtcbiAgICAgICAgICAgIHJldHVybiBbLi4udGhpc1tfY29uc3RydWN0b3JzXS5rZXlzKCldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBzcmNDbGFzcyBvZiBzb3VyY2VzKSB7XG4gICAgICAgIC8vIHByb3ZpZGUgY3VzdG9tIGluc3RhbmNlb2ZcbiAgICAgICAgY29uc3QgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc3JjQ2xhc3MsIFN5bWJvbC5oYXNJbnN0YW5jZSk7XG4gICAgICAgIGlmICghZGVzYyB8fCBkZXNjLndyaXRhYmxlKSB7XG4gICAgICAgICAgICBjb25zdCBvcmdJbnN0YW5jZU9mID0gZGVzYyA/IHNyY0NsYXNzW1N5bWJvbC5oYXNJbnN0YW5jZV0gOiBfaW5zdGFuY2VPZjtcbiAgICAgICAgICAgIHNldEluc3RhbmNlT2Yoc3JjQ2xhc3MsIChpbnN0OiBVbmtub3duT2JqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9wcmVmZXItbnVsbGlzaC1jb2FsZXNjaW5nXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yZ0luc3RhbmNlT2YuY2FsbChzcmNDbGFzcywgaW5zdCkgfHwgKChpbnN0Py5bX2lzSW5oZXJpdGVkXSkgPyAoaW5zdFtfaXNJbmhlcml0ZWRdIGFzIFVua25vd25GdW5jdGlvbikoc3JjQ2xhc3MpIDogZmFsc2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcHJvdmlkZSBwcm90b3R5cGVcbiAgICAgICAgY29weVByb3BlcnRpZXMoX01peGluQmFzZS5wcm90b3R5cGUsIHNyY0NsYXNzLnByb3RvdHlwZSk7XG4gICAgICAgIGxldCBwYXJlbnQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yoc3JjQ2xhc3MucHJvdG90eXBlKTtcbiAgICAgICAgd2hpbGUgKF9vYmpQcm90b3R5cGUgIT09IHBhcmVudCkge1xuICAgICAgICAgICAgY29weVByb3BlcnRpZXMoX01peGluQmFzZS5wcm90b3R5cGUsIHBhcmVudCk7XG4gICAgICAgICAgICBwYXJlbnQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocGFyZW50KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBjaGVjayBjb25zdHJ1Y3RvclxuICAgICAgICBpZiAoIV9oYXNTb3VyY2VDb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgX2hhc1NvdXJjZUNvbnN0cnVjdG9yID0gIXNyY0NsYXNzW19wcm90b0V4dGVuZHNPbmx5XTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBfTWl4aW5CYXNlIGFzIGFueTtcbn1cbiIsImltcG9ydCB7IGFzc2lnblZhbHVlLCBkZWVwRXF1YWwgfSBmcm9tICcuL2RlZXAtY2lyY3VpdCc7XG5pbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bk9iamVjdCxcbiAgICB0eXBlIEFjY2Vzc2libGUsXG4gICAgdHlwZSBOdWxsaXNoLFxuICAgIHR5cGUgV3JpdGFibGUsXG4gICAgaXNBcnJheSxcbiAgICBpc09iamVjdCxcbiAgICBpc0Z1bmN0aW9uLFxufSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IHZlcmlmeSB9IGZyb20gJy4vdmVyaWZ5JztcblxuLyoqXG4gKiBAZW4gQ2hlY2sgd2hldGhlciBpbnB1dCBzb3VyY2UgaGFzIGEgcHJvcGVydHkuXG4gKiBAamEg5YWl5Yqb5YWD44GM44OX44Ot44OR44OG44Kj44KS5oyB44Gj44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNyY1xuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzKHNyYzogdW5rbm93biwgcHJvcE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBudWxsICE9IHNyYyAmJiBpc09iamVjdChzcmMpICYmIChwcm9wTmFtZSBpbiBzcmMpO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgc2hhbGxvdyBjb3B5IG9mIGB0YXJnZXRgIHdoaWNoIGhhcyBvbmx5IGBwaWNrS2V5c2AuXG4gKiBAamEgYHBpY2tLZXlzYCDjgafmjIflrprjgZXjgozjgZ/jg5fjg63jg5Hjg4bjgqPjga7jgb/jgpLmjIHjgaQgYHRhcmdldGAg44GuIFNoYWxsb3cgQ29weSDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIGNvcHkgc291cmNlIG9iamVjdFxuICogIC0gYGphYCDjgrPjg5Tjg7zlhYPjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBwaWNrS2V5c1xuICogIC0gYGVuYCBjb3B5IHRhcmdldCBrZXlzXG4gKiAgLSBgamFgIOOCs+ODlOODvOWvvuixoeOBruOCreODvOS4gOimp1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGljazxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMga2V5b2YgVD4odGFyZ2V0OiBULCAuLi5waWNrS2V5czogS1tdKTogV3JpdGFibGU8UGljazxULCBLPj4ge1xuICAgIHZlcmlmeSgndHlwZU9mJywgJ29iamVjdCcsIHRhcmdldCk7XG4gICAgcmV0dXJuIHBpY2tLZXlzLnJlZHVjZSgob2JqLCBrZXkpID0+IHtcbiAgICAgICAga2V5IGluIHRhcmdldCAmJiBhc3NpZ25WYWx1ZShvYmosIGtleSwgdGFyZ2V0W2tleV0pO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH0sIHt9IGFzIFdyaXRhYmxlPFBpY2s8VCwgSz4+KTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHNoYWxsb3cgY29weSBvZiBgdGFyZ2V0YCB3aXRob3V0IGBvbWl0S2V5c2AuXG4gKiBAamEgYG9taXRLZXlzYCDjgafmjIflrprjgZXjgozjgZ/jg5fjg63jg5Hjg4bjgqPku6XlpJbjga7jgq3jg7zjgpLmjIHjgaQgYHRhcmdldGAg44GuIFNoYWxsb3cgQ29weSDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIGNvcHkgc291cmNlIG9iamVjdFxuICogIC0gYGphYCDjgrPjg5Tjg7zlhYPjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBvbWl0S2V5c1xuICogIC0gYGVuYCBvbWl0IHRhcmdldCBrZXlzXG4gKiAgLSBgamFgIOWJiumZpOWvvuixoeOBruOCreODvOS4gOimp1xuICovXG5leHBvcnQgZnVuY3Rpb24gb21pdDxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMga2V5b2YgVD4odGFyZ2V0OiBULCAuLi5vbWl0S2V5czogS1tdKTogV3JpdGFibGU8T21pdDxULCBLPj4ge1xuICAgIHZlcmlmeSgndHlwZU9mJywgJ29iamVjdCcsIHRhcmdldCk7XG4gICAgY29uc3Qgb2JqID0ge30gYXMgV3JpdGFibGU8T21pdDxULCBLPj47XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGFyZ2V0KSkge1xuICAgICAgICAhb21pdEtleXMuaW5jbHVkZXMoa2V5IGFzIEspICYmIGFzc2lnblZhbHVlKG9iaiwga2V5LCAodGFyZ2V0IGFzIFVua25vd25PYmplY3QpW2tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIEBlbiBJbnZlcnQgdGhlIGtleXMgYW5kIHZhbHVlcyBvZiBhbiBvYmplY3QuIFRoZSB2YWx1ZXMgbXVzdCBiZSBzZXJpYWxpemFibGUuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu44Kt44O844Go5YCk44KS6YCG6Lui44GZ44KLLiDjgZnjgbnjgabjga7lgKTjgYzjg6bjg4vjg7zjgq/jgafjgYLjgovjgZPjgajjgYzliY3mj5BcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBvYmplY3RcbiAqICAtIGBqYWAg5a++6LGh44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnZlcnQ8VCBleHRlbmRzIG9iamVjdCA9IFVua25vd25PYmplY3Q+KHRhcmdldDogb2JqZWN0KTogVCB7XG4gICAgY29uc3QgcmVzdWx0ID0ge307XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGFyZ2V0KSkge1xuICAgICAgICBhc3NpZ25WYWx1ZShyZXN1bHQsICh0YXJnZXQgYXMgVW5rbm93bk9iamVjdClba2V5XSBhcyAoc3RyaW5nIHwgbnVtYmVyIHwgc3ltYm9sKSwga2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdCBhcyBUO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgc2hhbGxvdyBjb3B5IG9mIGRpZmZlcmVuY2UgYmV0d2VlbiBgYmFzZWAgYW5kIGBzcmNgLlxuICogQGphIGBiYXNlYCDjgaggYHNyY2Ag44Gu5beu5YiG44OX44Ot44OR44OG44Kj44KS44KC44Gk44Kq44OW44K444Kn44Kv44OI44GuIFNoYWxsb3cgQ29weSDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmFzZVxuICogIC0gYGVuYCBiYXNlIG9iamVjdFxuICogIC0gYGphYCDln7rmupbjgajjgarjgovjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIG9iamVjdFxuICogIC0gYGphYCDjgrPjg5Tjg7zlhYPjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpZmY8VCBleHRlbmRzIG9iamVjdD4oYmFzZTogVCwgc3JjOiBQYXJ0aWFsPFQ+KTogUGFydGlhbDxUPiB7XG4gICAgdmVyaWZ5KCd0eXBlT2YnLCAnb2JqZWN0JywgYmFzZSk7XG4gICAgdmVyaWZ5KCd0eXBlT2YnLCAnb2JqZWN0Jywgc3JjKTtcblxuICAgIGNvbnN0IHJldHZhbDogUGFydGlhbDxUPiA9IHt9O1xuXG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc3JjKSkge1xuICAgICAgICBpZiAoIWRlZXBFcXVhbCgoYmFzZSBhcyBVbmtub3duT2JqZWN0KVtrZXldLCAoc3JjIGFzIFVua25vd25PYmplY3QpW2tleV0pKSB7XG4gICAgICAgICAgICBhc3NpZ25WYWx1ZShyZXR2YWwsIGtleSwgKHNyYyBhcyBVbmtub3duT2JqZWN0KVtrZXldKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8qKlxuICogQGVuIEdldCBzaGFsbG93IGNvcHkgb2YgYGJhc2VgIHdpdGhvdXQgYGRyb3BWYWx1ZWAuXG4gKiBAamEgYGRyb3BWYWx1ZWAg44Gn5oyH5a6a44GV44KM44Gf44OX44Ot44OR44OG44Kj5YCk5Lul5aSW44Gu44Kt44O844KS5oyB44GkIGB0YXJnZXRgIOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGJhc2VcbiAqICAtIGBlbmAgYmFzZSBvYmplY3RcbiAqICAtIGBqYWAg5Z+65rqW44Go44Gq44KL44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gZHJvcFZhbHVlc1xuICogIC0gYGVuYCB0YXJnZXQgdmFsdWUuIGRlZmF1bHQ6IGB1bmRlZmluZWRgLlxuICogIC0gYGphYCDlr77osaHjga7lgKQuIOaXouWumuWApDogYHVuZGVmaW5lZGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRyb3A8VCBleHRlbmRzIG9iamVjdD4oYmFzZTogVCwgLi4uZHJvcFZhbHVlczogdW5rbm93bltdKTogUGFydGlhbDxUPiB7XG4gICAgdmVyaWZ5KCd0eXBlT2YnLCAnb2JqZWN0JywgYmFzZSk7XG5cbiAgICBjb25zdCB2YWx1ZXMgPSBbLi4uZHJvcFZhbHVlc107XG4gICAgaWYgKCF2YWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgIHZhbHVlcy5wdXNoKHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgY29uc3QgcmV0dmFsID0geyAuLi5iYXNlIH0gYXMgQWNjZXNzaWJsZTxQYXJ0aWFsPFQ+PjtcblxuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGJhc2UpKSB7XG4gICAgICAgIGZvciAoY29uc3QgdmFsIG9mIHZhbHVlcykge1xuICAgICAgICAgICAgaWYgKGRlZXBFcXVhbCh2YWwsIHJldHZhbFtrZXldKSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSByZXR2YWxba2V5XTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8qKlxuICogQGVuIElmIHRoZSB2YWx1ZSBvZiB0aGUgbmFtZWQgcHJvcGVydHkgaXMgYSBmdW5jdGlvbiB0aGVuIGludm9rZSBpdDsgb3RoZXJ3aXNlLCByZXR1cm4gaXQuXG4gKiBAamEgb2JqZWN0IOOBriBwcm9wZXJ0eSDjgYzjg6Hjgr3jg4Pjg4njgarjgonjgZ3jga7lrp/ooYzntZDmnpzjgpIsIOODl+ODreODkeODhuOCo+OBquOCieOBneOBruWApOOCkui/lOWNtFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqIC0gYGVuYCBPYmplY3QgdG8gbWF5YmUgaW52b2tlIGZ1bmN0aW9uIGBwcm9wZXJ0eWAgb24uXG4gKiAtIGBqYWAg6KmV5L6h44GZ44KL44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gcHJvcGVydHlcbiAqIC0gYGVuYCBUaGUgZnVuY3Rpb24gYnkgbmFtZSB0byBpbnZva2Ugb24gYG9iamVjdGAuXG4gKiAtIGBqYWAg6KmV5L6h44GZ44KL44OX44Ot44OR44OG44Kj5ZCNXG4gKiBAcGFyYW0gZmFsbGJhY2tcbiAqIC0gYGVuYCBUaGUgdmFsdWUgdG8gYmUgcmV0dXJuZWQgaW4gY2FzZSBgcHJvcGVydHlgIGRvZXNuJ3QgZXhpc3Qgb3IgaXMgdW5kZWZpbmVkLlxuICogLSBgamFgIOWtmOWcqOOBl+OBquOBi+OBo+OBn+WgtOWQiOOBriBmYWxsYmFjayDlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc3VsdDxUID0gYW55Pih0YXJnZXQ6IG9iamVjdCB8IE51bGxpc2gsIHByb3BlcnR5OiBzdHJpbmcgfCBzdHJpbmdbXSwgZmFsbGJhY2s/OiBUKTogVCB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IHJlc29sdmUgPSAobzogdW5rbm93biwgcDogdW5rbm93bik6IHVua25vd24gPT4ge1xuICAgICAgICByZXR1cm4gaXNGdW5jdGlvbihwKSA/IHAuY2FsbChvKSA6IHA7XG4gICAgfTtcblxuICAgIGNvbnN0IHByb3BzID0gaXNBcnJheShwcm9wZXJ0eSkgPyBwcm9wZXJ0eSA6IFtwcm9wZXJ0eV07XG4gICAgaWYgKCFwcm9wcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHJlc29sdmUodGFyZ2V0LCBmYWxsYmFjaykgYXMgVDtcbiAgICB9XG5cbiAgICBsZXQgb2JqID0gdGFyZ2V0IGFzIFVua25vd25PYmplY3Q7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHByb3BzKSB7XG4gICAgICAgIGNvbnN0IHByb3AgPSBudWxsID09IG9iaiA/IHVuZGVmaW5lZCA6IG9ialtuYW1lXTtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gcHJvcCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUob2JqLCBmYWxsYmFjaykgYXMgVDtcbiAgICAgICAgfVxuICAgICAgICBvYmogPSByZXNvbHZlKG9iaiwgcHJvcCkgYXMgVW5rbm93bk9iamVjdDtcbiAgICB9XG4gICAgcmV0dXJuIG9iaiBhcyB1bmtub3duIGFzIFQ7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gY2FsbGFibGUoKTogdW5rbm93biB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11c2UtYmVmb3JlLWRlZmluZVxuICAgIHJldHVybiBhY2Nlc3NpYmxlO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBhY2Nlc3NpYmxlOiB1bmtub3duID0gbmV3IFByb3h5KGNhbGxhYmxlLCB7XG4gICAgZ2V0OiAodGFyZ2V0OiBhbnksIG5hbWUpID0+IHtcbiAgICAgICAgY29uc3QgcHJvcCA9IHRhcmdldFtuYW1lXTtcbiAgICAgICAgaWYgKG51bGwgIT0gcHJvcCkge1xuICAgICAgICAgICAgcmV0dXJuIHByb3A7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYWNjZXNzaWJsZTtcbiAgICAgICAgfVxuICAgIH0sXG59KTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gY3JlYXRlKCk6IHVua25vd24ge1xuICAgIGNvbnN0IHN0dWIgPSBuZXcgUHJveHkoe30sIHtcbiAgICAgICAgZ2V0OiAodGFyZ2V0OiBhbnksIG5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHByb3AgPSB0YXJnZXRbbmFtZV07XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBwcm9wKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb3A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2Nlc3NpYmxlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHN0dWIsICdzdHViJywge1xuICAgICAgICB2YWx1ZTogdHJ1ZSxcbiAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN0dWI7XG59XG5cbi8qKlxuICogQGVuIEdldCBzYWZlIGFjY2Vzc2libGUgb2JqZWN0LlxuICogQGphIOWuieWFqOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCquODluOCuOOCp+OCr+ODiOOBruWPluW+l1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3Qgc2FmZVdpbmRvdyA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuICogY29uc29sZS5sb2cobnVsbCAhPSBzYWZlV2luZG93LmRvY3VtZW50KTsgICAgLy8gdHJ1ZVxuICogY29uc3QgZGl2ID0gc2FmZVdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAqIGNvbnNvbGUubG9nKG51bGwgIT0gZGl2KTsgICAgLy8gdHJ1ZVxuICogYGBgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBBIHJlZmVyZW5jZSBvZiBhbiBvYmplY3Qgd2l0aCBhIHBvc3NpYmlsaXR5IHdoaWNoIGV4aXN0cy5cbiAqICAtIGBqYWAg5a2Y5Zyo44GX44GG44KL44Kq44OW44K444Kn44Kv44OI44Gu5Y+C54WnXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZWFsaXR5IG9yIHN0dWIgaW5zdGFuY2UuXG4gKiAgLSBgamFgIOWun+S9k+OBvuOBn+OBr+OCueOCv+ODluOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FmZTxUPih0YXJnZXQ6IFQpOiBUIHtcbiAgICByZXR1cm4gdGFyZ2V0IHx8IGNyZWF0ZSgpIGFzIFQ7XG59XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgZ2V0R2xvYmFsIH0gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHsgc2FmZSB9IGZyb20gJy4vc2FmZSc7XG5cbi8qKlxuICogQGVuIFR5cGUgb2YgaGFuZGxlIGZvciB0aW1lciBmdW5jdGlvbnMuXG4gKiBAamEg44K/44Kk44Oe44O86Zai5pWw44Gr5L2/55So44GZ44KL44OP44Oz44OJ44Or5Z6LXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGltZXJIYW5kbGUgeyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LW9iamVjdC10eXBlXG5cbi8qKlxuICogQGVuIFR5cGUgb2YgdGltZXIgc3RhcnQgZnVuY3Rpb25zLlxuICogQGphIOOCv+OCpOODnuODvOmWi+Wni+mWouaVsOOBruWei1xuICovXG5leHBvcnQgdHlwZSBUaW1lclN0YXJ0RnVuY3Rpb24gPSAoaGFuZGxlcjogVW5rbm93bkZ1bmN0aW9uLCB0aW1lb3V0PzogbnVtYmVyLCAuLi5hcmdzOiB1bmtub3duW10pID0+IFRpbWVySGFuZGxlO1xuXG4vKipcbiAqIEBlbiBUeXBlIG9mIHRpbWVyIHN0b3AgZnVuY3Rpb25zLlxuICogQGphIOOCv+OCpOODnuODvOWBnOatoumWouaVsOOBruWei1xuICovXG5leHBvcnQgdHlwZSBUaW1lclN0b3BGdW5jdGlvbiA9IChoYW5kbGU6IFRpbWVySGFuZGxlKSA9PiB2b2lkO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgVGltZXJDb250ZXh0IHtcbiAgICBzZXRUaW1lb3V0OiBUaW1lclN0YXJ0RnVuY3Rpb247XG4gICAgY2xlYXJUaW1lb3V0OiBUaW1lclN0b3BGdW5jdGlvbjtcbiAgICBzZXRJbnRlcnZhbDogVGltZXJTdGFydEZ1bmN0aW9uO1xuICAgIGNsZWFySW50ZXJ2YWw6IFRpbWVyU3RvcEZ1bmN0aW9uO1xufVxuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9yb290ID0gZ2V0R2xvYmFsKCkgYXMgdW5rbm93biBhcyBUaW1lckNvbnRleHQ7XG5jb25zdCBzZXRUaW1lb3V0OiBUaW1lclN0YXJ0RnVuY3Rpb24gICA9IHNhZmUoX3Jvb3Quc2V0VGltZW91dCkuYmluZChfcm9vdCk7XG5jb25zdCBjbGVhclRpbWVvdXQ6IFRpbWVyU3RvcEZ1bmN0aW9uICA9IHNhZmUoX3Jvb3QuY2xlYXJUaW1lb3V0KS5iaW5kKF9yb290KTtcbmNvbnN0IHNldEludGVydmFsOiBUaW1lclN0YXJ0RnVuY3Rpb24gID0gc2FmZShfcm9vdC5zZXRJbnRlcnZhbCkuYmluZChfcm9vdCk7XG5jb25zdCBjbGVhckludGVydmFsOiBUaW1lclN0b3BGdW5jdGlvbiA9IHNhZmUoX3Jvb3QuY2xlYXJJbnRlcnZhbCkuYmluZChfcm9vdCk7XG5cbmV4cG9ydCB7XG4gICAgc2V0VGltZW91dCxcbiAgICBjbGVhclRpbWVvdXQsXG4gICAgc2V0SW50ZXJ2YWwsXG4gICAgY2xlYXJJbnRlcnZhbCxcbn07XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bkZ1bmN0aW9uLFxuICAgIHR5cGUgUHJpbWl0aXZlLFxuICAgIHR5cGUgVHlwZWREYXRhLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQm9vbGVhbixcbiAgICBpc09iamVjdCxcbn0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBpbnZlcnQgfSBmcm9tICcuL29iamVjdCc7XG5pbXBvcnQge1xuICAgIHR5cGUgVGltZXJIYW5kbGUsXG4gICAgc2V0VGltZW91dCxcbiAgICBjbGVhclRpbWVvdXQsXG59IGZyb20gJy4vdGltZXInO1xuXG4vKipcbiAqIEBlbiBFbnN1cmUgYXN5bmNocm9ub3VzIGV4ZWN1dGlvbi5cbiAqIEBqYSDpnZ7lkIzmnJ/lrp/ooYzjgpLkv53oqLxcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIHZvaWQgcG9zdCgoKSA9PiBleGVjKGFyZykpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIGltcGxlbWVudCBhcyBmdW5jdGlvbiBzY29wZS5cbiAqICAtIGBqYWAg6Zai5pWw44K544Kz44O844OX44Go44GX44Gm5a6f6KOFXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3Q8VD4oZXhlY3V0b3I6ICgpID0+IFQpOiBQcm9taXNlPFQ+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkudGhlbihleGVjdXRvcik7XG59XG5cbi8qKlxuICogQGVuIEdlbmVyaWMgTm8tT3BlcmF0aW9uLlxuICogQGphIOaxjueUqCBOby1PcGVyYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vb3AoLi4uYXJnczogdW5rbm93bltdKTogYW55IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAvLyBub29wXG59XG5cbi8qKlxuICogQGVuIFdhaXQgZm9yIHRoZSBkZXNpZ25hdGlvbiBlbGFwc2UuXG4gKiBAamEg5oyH5a6a5pmC6ZaT5Yem55CG44KS5b6F5qmfXG4gKlxuICogQHBhcmFtIGVsYXBzZVxuICogIC0gYGVuYCB3YWl0IGVsYXBzZSBbbXNlY10uXG4gKiAgLSBgamFgIOW+heapn+aZgumWkyBbbXNlY11cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNsZWVwKGVsYXBzZTogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBlbGFwc2UpKTtcbn1cblxuLyoqXG4gKiBAZW4gT3B0aW9uIGludGVyZmFjZSBmb3Ige0BsaW5rIGRlYm91bmNlfSgpLlxuICogQGphIHtAbGluayBkZWJvdW5jZX0oKSDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7PjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEZWJvdW5jZU9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIEBlbiB0aGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlIGRlbGF5ZWQgYmVmb3JlIGl0J3MgaW52b2tlZC5cbiAgICAgKiBAamEg44Kz44O844Or44OQ44OD44Kv44Gu5ZG844Gz5Ye644GX44KS5b6F44Gk5pyA5aSn5pmC6ZaTXG4gICAgICovXG4gICAgbWF4V2FpdD86IG51bWJlcjtcbiAgICAvKipcbiAgICAgKiBAZW4gU3BlY2lmeSBgdHJ1ZWAgaWYgeW91IHdhbnQgdG8gY2FsbCB0aGUgY2FsbGJhY2sgbGVhZGluZyBlZGdlIG9mIHRoZSB3YWl0aW5nIHRpbWUuIChkZWZhdWx0OiBmYWxzZSlcbiAgICAgKiBAamEg5b6F44Gh5pmC6ZaT44Gr5a++44GX44Gm44Kz44O844Or44OQ44OD44Kv44KS5YWI5ZG844Gz5a6f6KGM44GZ44KL5aC05ZCI44GvIGB0cnVlYCDjgpLmjIflrpouIChkZWZhdWx0OiBmYWxzZSlcbiAgICAgKi9cbiAgICBsZWFkaW5nPzogYm9vbGVhbjtcbiAgICAvKipcbiAgICAgKiBAZW4gU3BlY2lmeSBgdHJ1ZWAgaWYgeW91IHdhbnQgdG8gY2FsbCB0aGUgY2FsbGJhY2sgdHJhaWxpbmcgZWRnZSBvZiB0aGUgd2FpdGluZyB0aW1lLiAoZGVmYXVsdDogdHJ1ZSlcbiAgICAgKiBAamEg5b6F44Gh5pmC6ZaT44Gr5a++44GX44Gm44Kz44O844Or44OQ44OD44Kv44KS5b6M5ZG844Gz5a6f6KGM44GZ44KL5aC05ZCI44GvIGB0cnVlYCDjgpLmjIflrpouIChkZWZhdWx0OiB0cnVlKVxuICAgICAqL1xuICAgIHRyYWlsaW5nPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IHR5cGUgRGVib3VuY2VkRnVuY3Rpb248VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4gPSBUICYgeyBjYW5jZWwoKTogdm9pZDsgZmx1c2goKTogUmV0dXJuVHlwZTxUPjsgcGVuZGluZygpOiBib29sZWFuOyB9O1xuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIGFzIGxvbmcgYXMgaXQgY29udGludWVzIHRvIGJlIGludm9rZWQsIHdpbGwgbm90IGJlIHRyaWdnZXJlZC5cbiAqIEBqYSDlkbzjgbPlh7rjgZXjgozjgabjgYvjgokgd2FpdCBbbXNlY10g57WM6YGO44GZ44KL44G+44Gn5a6f6KGM44GX44Gq44GE6Zai5pWw44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIHNlZWQgZnVuY3Rpb24uXG4gKiAgLSBgamFgIOWvvuixoeOBrumWouaVsFxuICogQHBhcmFtIHdhaXRcbiAqICAtIGBlbmAgd2FpdCBlbGFwc2UgW21zZWNdLlxuICogIC0gYGphYCDlvoXmqZ/mmYLplpMgW21zZWNdXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBzcGVjaWZ5IHtAbGluayBEZWJvdW5jZU9wdGlvbnN9IG9iamVjdCBvciBgdHJ1ZWAgdG8gZmlyZSB0aGUgY2FsbGJhY2sgaW1tZWRpYXRlbHkuXG4gKiAgLSBgamFgIHtAbGluayBEZWJvdW5jZU9wdGlvbnN9IG9iamVjdCDjgoLjgZfjgY/jga/ljbPmmYLjgavjgrPjg7zjg6vjg5Djg4Pjgq/jgpLnmbrngavjgZnjgovjgajjgY3jga8gYHRydWVgIOOCkuaMh+Wumi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlYm91bmNlPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGV4ZWN1dG9yOiBULCB3YWl0OiBudW1iZXIsIG9wdGlvbnM/OiBEZWJvdW5jZU9wdGlvbnMgfCBib29sZWFuKTogRGVib3VuY2VkRnVuY3Rpb248VD4ge1xuICAgIHR5cGUgUmVzdWx0ID0gUmV0dXJuVHlwZTxUPiB8IHVuZGVmaW5lZDtcblxuICAgIGxldCBsYXN0QXJnczogdW5rbm93bjtcbiAgICBsZXQgbGFzdFRoaXM6IHVua25vd247XG4gICAgbGV0IHJlc3VsdDogUmVzdWx0O1xuICAgIGxldCBsYXN0Q2FsbFRpbWU6IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgICBsZXQgdGltZXJJZDogVGltZXJIYW5kbGUgfCB1bmRlZmluZWQ7XG4gICAgbGV0IGxhc3RJbnZva2VUaW1lID0gMDtcblxuICAgIGNvbnN0IHdhaXRWYWx1ZSA9IE51bWJlcih3YWl0KSB8fCAwO1xuXG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBsZWFkaW5nOiBmYWxzZSwgdHJhaWxpbmc6IHRydWUgfSwgKGlzQm9vbGVhbihvcHRpb25zKSA/IHsgbGVhZGluZzogb3B0aW9ucywgdHJhaWxpbmc6ICFvcHRpb25zIH0gOiBvcHRpb25zKSk7XG4gICAgY29uc3QgeyBsZWFkaW5nLCB0cmFpbGluZyB9ID0gb3B0cztcbiAgICBjb25zdCBtYXhXYWl0ID0gbnVsbCAhPSBvcHRzLm1heFdhaXQgPyBNYXRoLm1heChOdW1iZXIob3B0cy5tYXhXYWl0KSB8fCAwLCB3YWl0VmFsdWUpIDogbnVsbDtcblxuICAgIGNvbnN0IGludm9rZUZ1bmMgPSAodGltZTogbnVtYmVyKTogUmVzdWx0ID0+IHtcbiAgICAgICAgY29uc3QgYXJncyA9IGxhc3RBcmdzO1xuICAgICAgICBjb25zdCB0aGlzQXJnID0gbGFzdFRoaXM7XG5cbiAgICAgICAgbGFzdEFyZ3MgPSBsYXN0VGhpcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgbGFzdEludm9rZVRpbWUgPSB0aW1lO1xuICAgICAgICByZXN1bHQgPSBleGVjdXRvci5hcHBseSh0aGlzQXJnLCBhcmdzIGFzIFBhcmFtZXRlcnM8VD4pIGFzIFJlc3VsdDtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgY29uc3QgcmVtYWluaW5nV2FpdCA9ICh0aW1lOiBudW1iZXIpOiBudW1iZXIgPT4ge1xuICAgICAgICBjb25zdCB0aW1lU2luY2VMYXN0Q2FsbCA9IHRpbWUgLSBsYXN0Q2FsbFRpbWUhO1xuICAgICAgICBjb25zdCB0aW1lU2luY2VMYXN0SW52b2tlID0gdGltZSAtIGxhc3RJbnZva2VUaW1lO1xuICAgICAgICBjb25zdCB0aW1lV2FpdGluZyA9IHdhaXRWYWx1ZSAtIHRpbWVTaW5jZUxhc3RDYWxsO1xuICAgICAgICByZXR1cm4gbnVsbCAhPSBtYXhXYWl0ID8gTWF0aC5taW4odGltZVdhaXRpbmcsIG1heFdhaXQgLSB0aW1lU2luY2VMYXN0SW52b2tlKSA6IHRpbWVXYWl0aW5nO1xuICAgIH07XG5cbiAgICBjb25zdCBzaG91bGRJbnZva2UgPSAodGltZTogbnVtYmVyKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIGlmICh1bmRlZmluZWQgPT09IGxhc3RDYWxsVGltZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdGltZVNpbmNlTGFzdENhbGwgPSB0aW1lIC0gbGFzdENhbGxUaW1lO1xuICAgICAgICBjb25zdCB0aW1lU2luY2VMYXN0SW52b2tlID0gdGltZSAtIGxhc3RJbnZva2VUaW1lO1xuICAgICAgICByZXR1cm4gdGltZVNpbmNlTGFzdENhbGwgPj0gd2FpdFZhbHVlIHx8IHRpbWVTaW5jZUxhc3RDYWxsIDwgMCB8fCAobWF4V2FpdCAhPT0gbnVsbCAmJiB0aW1lU2luY2VMYXN0SW52b2tlID49IG1heFdhaXQpO1xuICAgIH07XG5cbiAgICBjb25zdCB0cmFpbGluZ0VkZ2UgPSAodGltZTogbnVtYmVyKTogUmVzdWx0ID0+IHtcbiAgICAgICAgdGltZXJJZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHRyYWlsaW5nICYmIGxhc3RBcmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gaW52b2tlRnVuYyh0aW1lKTtcbiAgICAgICAgfVxuICAgICAgICBsYXN0QXJncyA9IGxhc3RUaGlzID0gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICBjb25zdCB0aW1lckV4cGlyZWQgPSAoKTogUmVzdWx0IHwgdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IHRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgICBpZiAoc2hvdWxkSW52b2tlKHRpbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJhaWxpbmdFZGdlKHRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgcmVtYWluaW5nV2FpdCh0aW1lKSk7XG4gICAgfTtcblxuICAgIGNvbnN0IGxlYWRpbmdFZGdlID0gKHRpbWU6IG51bWJlcik6IFJlc3VsdCA9PiB7XG4gICAgICAgIGxhc3RJbnZva2VUaW1lID0gdGltZTtcbiAgICAgICAgdGltZXJJZCA9IHNldFRpbWVvdXQodGltZXJFeHBpcmVkLCB3YWl0VmFsdWUpO1xuICAgICAgICByZXR1cm4gbGVhZGluZyA/IGludm9rZUZ1bmModGltZSkgOiByZXN1bHQ7XG4gICAgfTtcblxuICAgIGNvbnN0IGNhbmNlbCA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gdGltZXJJZCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVySWQpO1xuICAgICAgICB9XG4gICAgICAgIGxhc3RJbnZva2VUaW1lID0gMDtcbiAgICAgICAgbGFzdEFyZ3MgPSBsYXN0Q2FsbFRpbWUgPSBsYXN0VGhpcyA9IHRpbWVySWQgPSB1bmRlZmluZWQ7XG4gICAgfTtcblxuICAgIGNvbnN0IGZsdXNoID0gKCk6IFJlc3VsdCA9PiB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQgPT09IHRpbWVySWQgPyByZXN1bHQgOiB0cmFpbGluZ0VkZ2UoRGF0ZS5ub3coKSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHBlbmRpbmcgPSAoKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIHJldHVybiBudWxsICE9IHRpbWVySWQ7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGRlYm91bmNlZCh0aGlzOiB1bmtub3duLCAuLi5hcmdzOiB1bmtub3duW10pOiBSZXN1bHQge1xuICAgICAgICBjb25zdCB0aW1lID0gRGF0ZS5ub3coKTtcbiAgICAgICAgY29uc3QgaXNJbnZva2luZyA9IHNob3VsZEludm9rZSh0aW1lKTtcblxuICAgICAgICBsYXN0QXJncyA9IGFyZ3M7XG4gICAgICAgIGxhc3RUaGlzID0gdGhpczsgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhc1xuICAgICAgICBsYXN0Q2FsbFRpbWUgPSB0aW1lO1xuXG4gICAgICAgIGlmIChpc0ludm9raW5nKSB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSB0aW1lcklkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlYWRpbmdFZGdlKGxhc3RDYWxsVGltZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWF4V2FpdCkge1xuICAgICAgICAgICAgICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgd2FpdFZhbHVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaW52b2tlRnVuYyhsYXN0Q2FsbFRpbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRpbWVySWQgPz89IHNldFRpbWVvdXQodGltZXJFeHBpcmVkLCB3YWl0VmFsdWUpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGRlYm91bmNlZC5jYW5jZWwgPSBjYW5jZWw7XG4gICAgZGVib3VuY2VkLmZsdXNoID0gZmx1c2g7XG4gICAgZGVib3VuY2VkLnBlbmRpbmcgPSBwZW5kaW5nO1xuXG4gICAgcmV0dXJuIGRlYm91bmNlZCBhcyBEZWJvdW5jZWRGdW5jdGlvbjxUPjtcbn1cblxuLyoqXG4gKiBAZW4gT3B0aW9uIGludGVyZmFjZSBmb3Ige0BsaW5rIHRocm90dGxlfSgpLlxuICogQGphIHtAbGluayB0aHJvdHRsZX0oKSDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7PjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUaHJvdHRsZU9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIEBlbiBTcGVjaWZ5IGB0cnVlYCBpZiB5b3Ugd2FudCB0byBjYWxsIHRoZSBjYWxsYmFjayBsZWFkaW5nIGVkZ2Ugb2YgdGhlIHdhaXRpbmcgdGltZS4gKGRlZmF1bHQ6IHRydWUpXG4gICAgICogQGphIOW+heOBoeaZgumWk+OBq+WvvuOBl+OBpuOCs+ODvOODq+ODkOODg+OCr+OCkuWFiOWRvOOBs+Wun+ihjOOBmeOCi+WgtOWQiOOBryBgdHJ1ZWAg44KS5oyH5a6aLiAoZGVmYXVsdDogdHJ1ZSlcbiAgICAgKi9cbiAgICBsZWFkaW5nPzogYm9vbGVhbjtcbiAgICAvKipcbiAgICAgKiBAZW4gU3BlY2lmeSBgdHJ1ZWAgaWYgeW91IHdhbnQgdG8gY2FsbCB0aGUgY2FsbGJhY2sgdHJhaWxpbmcgZWRnZSBvZiB0aGUgd2FpdGluZyB0aW1lLiAoZGVmYXVsdDogdHJ1ZSlcbiAgICAgKiBAamEg5b6F44Gh5pmC6ZaT44Gr5a++44GX44Gm44Kz44O844Or44OQ44OD44Kv44KS5b6M5ZG844Gz5a6f6KGM44GZ44KL5aC05ZCI44GvIGB0cnVlYCDjgpLmjIflrpouIChkZWZhdWx0OiB0cnVlKVxuICAgICAqL1xuICAgIHRyYWlsaW5nPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCB3aGVuIGludm9rZWQsIHdpbGwgb25seSBiZSB0cmlnZ2VyZWQgYXQgbW9zdCBvbmNlIGR1cmluZyBhIGdpdmVuIHRpbWUuXG4gKiBAamEg6Zai5pWw44Gu5a6f6KGM44KSIHdhaXQgW21zZWNdIOOBqzHlm57jgavliLbpmZBcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHRocm90dGxlZCA9IHRocm90dGxlKHVwYXRlUG9zaXRpb24sIDEwMCk7XG4gKiAkKHdpbmRvdykuc2Nyb2xsKHRocm90dGxlZCk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWwXG4gKiBAcGFyYW0gZWxhcHNlXG4gKiAgLSBgZW5gIHdhaXQgZWxhcHNlIFttc2VjXS5cbiAqICAtIGBqYWAg5b6F5qmf5pmC6ZaTIFttc2VjXVxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRocm90dGxlPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGV4ZWN1dG9yOiBULCBlbGFwc2U6IG51bWJlciwgb3B0aW9ucz86IFRocm90dGxlT3B0aW9ucyk6IERlYm91bmNlZEZ1bmN0aW9uPFQ+IHtcbiAgICBjb25zdCB7IGxlYWRpbmcsIHRyYWlsaW5nIH0gPSBPYmplY3QuYXNzaWduKHsgbGVhZGluZzogdHJ1ZSwgdHJhaWxpbmc6IHRydWUgfSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIGRlYm91bmNlKGV4ZWN1dG9yLCBlbGFwc2UsIHtcbiAgICAgICAgbGVhZGluZyxcbiAgICAgICAgdHJhaWxpbmcsXG4gICAgICAgIG1heFdhaXQ6IGVsYXBzZSxcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBhdCBtb3N0IG9uZSB0aW1lLCBubyBtYXR0ZXIgaG93IG9mdGVuIHlvdSBjYWxsIGl0LlxuICogQGphIDHluqbjgZfjgYvlrp/ooYzjgZXjgozjgarjgYTplqLmlbDjgpLov5TljbQuIDLlm57nm67ku6XpmY3jga/mnIDliJ3jga7jgrPjg7zjg6vjga7jgq3jg6Pjg4Pjgrfjg6XjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvbmNlPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGV4ZWN1dG9yOiBUKTogVCB7XG5cbiAgICBsZXQgbWVtbzogdW5rbm93bjtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRoaXM6IHVua25vd24sIC4uLmFyZ3M6IHVua25vd25bXSk6IHVua25vd24ge1xuICAgICAgICBpZiAoZXhlY3V0b3IpIHtcbiAgICAgICAgICAgIG1lbW8gPSBleGVjdXRvci5jYWxsKHRoaXMsIC4uLmFyZ3MpO1xuICAgICAgICAgICAgZXhlY3V0b3IgPSBudWxsITtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWVtbztcbiAgICB9IGFzIFQ7XG5cbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJuIGEgZGVmZXJyZWQgZXhlY3V0YWJsZSBmdW5jdGlvbiBvYmplY3QuXG4gKiBAamEg6YGF5bu25a6f6KGM5Y+v6IO944Gq6Zai5pWw44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBzY2hlZHVsZSA9IHNjaGVkdWxlcigpO1xuICogc2NoZWR1bGUoKCkgPT4gdGFzazEoKSk7XG4gKiBzY2hlZHVsZSgoKSA9PiB0YXNrMigpKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2NoZWR1bGVyKCk6IChleGVjOiAoKSA9PiB2b2lkKSA9PiB2b2lkIHtcbiAgICBsZXQgdGFza3M6ICgoKSA9PiB2b2lkKVtdID0gW107XG4gICAgbGV0IGlkOiBQcm9taXNlPHZvaWQ+IHwgbnVsbDtcblxuICAgIGZ1bmN0aW9uIHJ1blRhc2tzKCk6IHZvaWQge1xuICAgICAgICBpZCA9IG51bGw7XG4gICAgICAgIGNvbnN0IHdvcmsgPSB0YXNrcztcbiAgICAgICAgdGFza3MgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCB0YXNrIG9mIHdvcmspIHtcbiAgICAgICAgICAgIHRhc2soKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbih0YXNrOiAoKSA9PiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgIHRhc2tzLnB1c2godGFzayk7XG4gICAgICAgIGlkID8/PSBwb3N0KHJ1blRhc2tzKTtcbiAgICB9O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIGVzY2FwZSBmdW5jdGlvbiBmcm9tIG1hcC5cbiAqIEBqYSDmloflrZfnva7mj5vplqLmlbDjgpLkvZzmiJBcbiAqXG4gKiBAcGFyYW0gbWFwXG4gKiAgLSBgZW5gIGtleTogdGFyZ2V0IGNoYXIsIHZhbHVlOiByZXBsYWNlIGNoYXJcbiAqICAtIGBqYWAga2V5OiDnva7mj5vlr77osaEsIHZhbHVlOiDnva7mj5vmloflrZdcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIGVzcGFjZSBmdW5jdGlvblxuICogIC0gYGphYCDjgqjjgrnjgrHjg7zjg5fplqLmlbBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVzY2FwZXIobWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTogKHNyYzogUHJpbWl0aXZlKSA9PiBzdHJpbmcge1xuICAgIGNvbnN0IGVzY2FwZXIgPSAobWF0Y2g6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgICAgIHJldHVybiBtYXBbbWF0Y2hdO1xuICAgIH07XG5cbiAgICBjb25zdCBzb3VyY2UgPSBgKD86JHtPYmplY3Qua2V5cyhtYXApLmpvaW4oJ3wnKX0pYDtcbiAgICBjb25zdCByZWdleFRlc3QgPSBSZWdFeHAoc291cmNlKTtcbiAgICBjb25zdCByZWdleFJlcGxhY2UgPSBSZWdFeHAoc291cmNlLCAnZycpO1xuXG4gICAgcmV0dXJuIChzcmM6IFByaW1pdGl2ZSk6IHN0cmluZyA9PiB7XG4gICAgICAgIHNyYyA9IChudWxsID09IHNyYyB8fCAnc3ltYm9sJyA9PT0gdHlwZW9mIHNyYykgPyAnJyA6IFN0cmluZyhzcmMpO1xuICAgICAgICByZXR1cm4gcmVnZXhUZXN0LnRlc3Qoc3JjKSA/IHNyYy5yZXBsYWNlKHJlZ2V4UmVwbGFjZSwgZXNjYXBlcikgOiBzcmM7XG4gICAgfTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgbWFwSHRtbEVzY2FwZSA9IHtcbiAgICAnPCc6ICcmbHQ7JyxcbiAgICAnPic6ICcmZ3Q7JyxcbiAgICAnJic6ICcmYW1wOycsXG4gICAgJ1wiJzogJyZxdW90OycsXG4gICAgXCInXCI6ICcmIzM5OycsXG4gICAgJ2AnOiAnJiN4NjA7J1xufTtcblxuLyoqXG4gKiBAZW4gRXNjYXBlIEhUTUwgc3RyaW5nLlxuICogQGphIEhUTUwg44Gn5L2/55So44GZ44KL5paH5a2X44KS5Yi25b6h5paH5a2X44Gr572u5o+bXG4gKlxuICogQGJyaWVmIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgbWFwSHRtbEVzY2FwZSA9IHtcbiAqICAgICAnPCcgOiAnJmx0OycsXG4gKiAgICAgJz4nIDogJyZndDsnLFxuICogICAgICcmJyA6ICcmYW1wOycsXG4gKiAgICAgJ+KAsyc6ICcmcXVvdDsnLFxuICogICAgIGAnYCA6ICcmIzM5OycsXG4gKiAgICAgJ2AnIDogJyYjeDYwOydcbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGVzY2FwZUhUTUwgPSBjcmVhdGVFc2NhcGVyKG1hcEh0bWxFc2NhcGUpO1xuXG4vKipcbiAqIEBlbiBVbmVzY2FwZSBIVE1MIHN0cmluZy5cbiAqIEBqYSBIVE1MIOOBp+S9v+eUqOOBmeOCi+WItuW+oeaWh+Wtl+OCkuW+qeWFg1xuICovXG5leHBvcnQgY29uc3QgdW5lc2NhcGVIVE1MID0gY3JlYXRlRXNjYXBlcihpbnZlcnQobWFwSHRtbEVzY2FwZSkpO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byB0aGUgc3R5bGUgY29tcHVsc2lvbiB2YWx1ZSBmcm9tIGlucHV0IHN0cmluZy5cbiAqIEBqYSDlhaXlipvmloflrZfliJfjgpLlnovlvLfliLbjgZfjgZ/lgKTjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBpbnB1dCBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5a++6LGh44Gu5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b1R5cGVkRGF0YShkYXRhOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBUeXBlZERhdGEgfCB1bmRlZmluZWQge1xuICAgIGlmICgndHJ1ZScgPT09IGRhdGEpIHtcbiAgICAgICAgLy8gYm9vbGVhbjogdHJ1ZVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKCdmYWxzZScgPT09IGRhdGEpIHtcbiAgICAgICAgLy8gYm9vbGVhbjogZmFsc2VcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoJ251bGwnID09PSBkYXRhKSB7XG4gICAgICAgIC8vIG51bGxcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChkYXRhID09PSBTdHJpbmcoTnVtYmVyKGRhdGEpKSkge1xuICAgICAgICAvLyBudW1iZXI6IOaVsOWApOWkieaPmyDihpIg5paH5a2X5YiX5aSJ5o+b44Gn5YWD44Gr5oi744KL44Go44GNXG4gICAgICAgIHJldHVybiBOdW1iZXIoZGF0YSk7XG4gICAgfSBlbHNlIGlmIChkYXRhICYmIC9eKD86XFx7W1xcd1xcV10qXFx9fFxcW1tcXHdcXFddKlxcXSkkLy50ZXN0KGRhdGEpKSB7XG4gICAgICAgIC8vIG9iamVjdFxuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShkYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzdHJpbmcgLyB1bmRlZmluZWRcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIHN0cmluZyBmcm9tIHtAbGluayBUeXBlZERhdGF9LlxuICogQGphIHtAbGluayBUeXBlZERhdGF9IOOCkuaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhXG4gKiAgLSBgZW5gIGlucHV0IHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlr77osaHjga7mloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21UeXBlZERhdGEoZGF0YTogVHlwZWREYXRhIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAodW5kZWZpbmVkID09PSBkYXRhIHx8IGlzU3RyaW5nKGRhdGEpKSB7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoZGF0YSkpIHtcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBTdHJpbmcoZGF0YSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGBXZWIgQVBJYCBzdG9ja2VkIHR5cGUuIDxicj5cbiAqICAgICBFbnN1cmUgbm90IHRvIHJldHVybiBgdW5kZWZpbmVkYCB2YWx1ZS5cbiAqIEBqYSBgV2ViIEFQSWAg5qC857SN5b2i5byP44Gr5aSJ5o+bIDxicj5cbiAqICAgICBgdW5kZWZpbmVkYCDjgpLov5TljbTjgZfjgarjgYTjgZPjgajjgpLkv53oqLxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRyb3BVbmRlZmluZWQ8VD4odmFsdWU6IFQgfCBudWxsIHwgdW5kZWZpbmVkLCBudWxsaXNoU2VyaWFsaXplID0gZmFsc2UpOiBUIHwgJ251bGwnIHwgJ3VuZGVmaW5lZCcgfCBudWxsIHtcbiAgICByZXR1cm4gdmFsdWUgPz8gKG51bGxpc2hTZXJpYWxpemUgPyBTdHJpbmcodmFsdWUpIDogbnVsbCkgYXMgVCB8ICdudWxsJyB8ICd1bmRlZmluZWQnIHwgbnVsbDtcbn1cblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemUgZnJvbSBgV2ViIEFQSWAgc3RvY2tlZCB0eXBlLiA8YnI+XG4gKiAgICAgQ29udmVydCBmcm9tICdudWxsJyBvciAndW5kZWZpbmVkJyBzdHJpbmcgdG8gb3JpZ2luYWwgdHlwZS5cbiAqIEBqYSAnbnVsbCcgb3IgJ3VuZGVmaW5lZCcg44KS44KC44Go44Gu5Z6L44Gr5oi744GZXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXN0b3JlTnVsbGlzaDxUPih2YWx1ZTogVCB8ICdudWxsJyB8ICd1bmRlZmluZWQnKTogVCB8IG51bGwgfCB1bmRlZmluZWQge1xuICAgIGlmICgnbnVsbCcgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoJ3VuZGVmaW5lZCcgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi8gbGV0IF9sb2NhbElkID0gMDtcblxuLyoqXG4gKiBAZW4gR2V0IGxvY2FsIHVuaXF1ZSBpZC4gPGJyPlxuICogICAgIFwibG9jYWwgdW5pcXVlXCIgbWVhbnMgZ3VhcmFudGVlcyB1bmlxdWUgZHVyaW5nIGluIHNjcmlwdCBsaWZlIGN5Y2xlIG9ubHkuXG4gKiBAamEg44Ot44O844Kr44Or44Om44OL44O844KvIElEIOOBruWPluW+lyA8YnI+XG4gKiAgICAg44K544Kv44Oq44OX44OI44Op44Kk44OV44K144Kk44Kv44Or5Lit44Gu5ZCM5LiA5oCn44KS5L+d6Ki844GZ44KLLlxuICpcbiAqIEBwYXJhbSBwcmVmaXhcbiAqICAtIGBlbmAgSUQgcHJlZml4XG4gKiAgLSBgamFgIElEIOOBq+S7mOS4juOBmeOCiyBQcmVmaXhcbiAqIEBwYXJhbSB6ZXJvUGFkXG4gKiAgLSBgZW5gIDAgcGFkZGluZyBvcmRlclxuICogIC0gYGphYCAwIOipsOOCgeOBmeOCi+ahgeaVsOOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gbHVpZChwcmVmaXggPSAnJywgemVyb1BhZD86IG51bWJlcik6IHN0cmluZyB7XG4gICAgY29uc3QgaWQgPSAoKytfbG9jYWxJZCkudG9TdHJpbmcoMTYpO1xuICAgIHJldHVybiAobnVsbCAhPSB6ZXJvUGFkKSA/IGAke3ByZWZpeH0ke2lkLnBhZFN0YXJ0KHplcm9QYWQsICcwJyl9YCA6IGAke3ByZWZpeH0ke2lkfWA7XG59XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIGAwYCBhbmQgYG1heGAsIGluY2x1c2l2ZS5cbiAqIEBqYSBgMGAgLSBgbWF4YCDjga7jg6njg7Pjg4Djg6Djga7mlbTmlbDlgKTjgpLnlJ/miJBcbiAqXG4gKiBAcGFyYW0gbWF4XG4gKiAgLSBgZW5gIFRoZSBtYXhpbXVtIHJhbmRvbSBudW1iZXIuXG4gKiAgLSBgamFgIOaVtOaVsOOBruacgOWkp+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZG9tSW50KG1heDogbnVtYmVyKTogbnVtYmVyO1xuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBgbWluYCBhbmQgYG1heGAsIGluY2x1c2l2ZS5cbiAqIEBqYSBgbWluYCAtIGBtYXhgIOOBruODqeODs+ODgOODoOOBruaVtOaVsOWApOOCkueUn+aIkFxuICpcbiAqIEBwYXJhbSBtaW5cbiAqICAtIGBlbmAgVGhlIG1heGltdW0gcmFuZG9tIG51bWJlci5cbiAqICAtIGBqYWAg5pW05pWw44Gu5pyA5aSn5YCkXG4gKiBAcGFyYW0gbWF4XG4gKiAgLSBgZW5gIFRoZSBtYXhpbXVtIHJhbmRvbSBudW1iZXIuXG4gKiAgLSBgamFgIOaVtOaVsOOBruacgOWkp+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZG9tSW50KG1pbjogbnVtYmVyLCBtYXg6IG51bWJlcik6IG51bWJlcjsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5pZmllZC1zaWduYXR1cmVzXG5cbmV4cG9ydCBmdW5jdGlvbiByYW5kb21JbnQobWluOiBudW1iZXIsIG1heD86IG51bWJlcik6IG51bWJlciB7XG4gICAgaWYgKG51bGwgPT0gbWF4KSB7XG4gICAgICAgIG1heCA9IG1pbjtcbiAgICAgICAgbWluID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIG1pbiArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9yZWdleENhbmNlbExpa2VTdHJpbmcgPSAvKGFib3J0fGNhbmNlbCkvaW07XG5cbi8qKlxuICogQGVuIFByZXN1bWUgd2hldGhlciBpdCdzIGEgY2FuY2VsZWQgZXJyb3IuXG4gKiBAamEg44Kt44Oj44Oz44K744Or44GV44KM44Gf44Ko44Op44O844Gn44GC44KL44GL5o6o5a6aXG4gKlxuICogQHBhcmFtIGVycm9yXG4gKiAgLSBgZW5gIGFuIGVycm9yIG9iamVjdCBoYW5kbGVkIGluIGBjYXRjaGAgYmxvY2suXG4gKiAgLSBgamFgIGBjYXRjaGAg56+A44Gq44Gp44Gn6KOc6Laz44GX44Gf44Ko44Op44O844KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0NhbmNlbExpa2VFcnJvcihlcnJvcjogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIGlmIChudWxsID09IGVycm9yKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKGVycm9yKSkge1xuICAgICAgICByZXR1cm4gX3JlZ2V4Q2FuY2VsTGlrZVN0cmluZy50ZXN0KGVycm9yKTtcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGVycm9yKSkge1xuICAgICAgICByZXR1cm4gX3JlZ2V4Q2FuY2VsTGlrZVN0cmluZy50ZXN0KChlcnJvciBhcyBFcnJvcikubWVzc2FnZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnRzIGZpcnN0IGxldHRlciBvZiB0aGUgc3RyaW5nIHRvIHVwcGVyY2FzZS5cbiAqIEBqYSDmnIDliJ3jga7mloflrZfjgpLlpKfmloflrZfjgavlpInmj5tcbiAqXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjYXBpdGFsaXplKFwiZm9vIEJhclwiKTtcbiAqIC8vID0+IFwiRm9vIEJhclwiXG4gKlxuICogY2FwaXRhbGl6ZShcIkZPTyBCYXJcIiwgdHJ1ZSk7XG4gKiAvLyA9PiBcIkZvbyBiYXJcIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICogQHBhcmFtIGxvd2VyY2FzZVJlc3RcbiAqICAtIGBlbmAgSWYgYHRydWVgIGlzIHBhc3NlZCwgdGhlIHJlc3Qgb2YgdGhlIHN0cmluZyB3aWxsIGJlIGNvbnZlcnRlZCB0byBsb3dlciBjYXNlXG4gKiAgLSBgamFgIGB0cnVlYCDjgpLmjIflrprjgZfjgZ/loLTlkIgsIDLmloflrZfnm67ku6XpmY3jgoLlsI/mloflrZfljJZcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhcGl0YWxpemUoc3JjOiBzdHJpbmcsIGxvd2VyY2FzZVJlc3QgPSBmYWxzZSk6IHN0cmluZyB7XG4gICAgY29uc3QgcmVtYWluaW5nQ2hhcnMgPSAhbG93ZXJjYXNlUmVzdCA/IHNyYy5zbGljZSgxKSA6IHNyYy5zbGljZSgxKS50b0xvd2VyQ2FzZSgpO1xuICAgIHJldHVybiBzcmMuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyByZW1haW5pbmdDaGFycztcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgZmlyc3QgbGV0dGVyIG9mIHRoZSBzdHJpbmcgdG8gbG93ZXJjYXNlLlxuICogQGphIOacgOWIneOBruaWh+Wtl+OCkuWwj+aWh+Wtl+WMllxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogZGVjYXBpdGFsaXplKFwiRm9vIEJhclwiKTtcbiAqIC8vID0+IFwiZm9vIEJhclwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWNhcGl0YWxpemUoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBzcmMuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyBzcmMuc2xpY2UoMSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIHVuZGVyc2NvcmVkIG9yIGRhc2hlcml6ZWQgc3RyaW5nIHRvIGEgY2FtZWxpemVkIG9uZS4gPGJyPlxuICogICAgIEJlZ2lucyB3aXRoIGEgbG93ZXIgY2FzZSBsZXR0ZXIgdW5sZXNzIGl0IHN0YXJ0cyB3aXRoIGFuIHVuZGVyc2NvcmUsIGRhc2ggb3IgYW4gdXBwZXIgY2FzZSBsZXR0ZXIuXG4gKiBAamEgYF9gLCBgLWAg5Yy65YiH44KK5paH5a2X5YiX44KS44Kt44Oj44Oh44Or44Kx44O844K55YyWIDxicj5cbiAqICAgICBgLWAg44G+44Gf44Gv5aSn5paH5a2X44K544K/44O844OI44Gn44GC44KM44GwLCDlpKfmloflrZfjgrnjgr/jg7zjg4jjgYzml6LlrprlgKRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNhbWVsaXplKFwibW96LXRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwibW96VHJhbnNmb3JtXCJcbiAqXG4gKiBjYW1lbGl6ZShcIi1tb3otdHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJNb3pUcmFuc2Zvcm1cIlxuICpcbiAqIGNhbWVsaXplKFwiX21vel90cmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIk1velRyYW5zZm9ybVwiXG4gKlxuICogY2FtZWxpemUoXCJNb3otdHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJNb3pUcmFuc2Zvcm1cIlxuICpcbiAqIGNhbWVsaXplKFwiLW1vei10cmFuc2Zvcm1cIiwgdHJ1ZSk7XG4gKiAvLyA9PiBcIm1velRyYW5zZm9ybVwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKiBAcGFyYW0gbG93ZXJcbiAqICAtIGBlbmAgSWYgYHRydWVgIGlzIHBhc3NlZCwgZm9yY2UgY29udmVydHMgdG8gbG93ZXIgY2FtZWwgY2FzZSBpbiBzdGFydHMgd2l0aCB0aGUgc3BlY2lhbCBjYXNlLlxuICogIC0gYGphYCDlvLfliLbnmoTjgavlsI/mloflrZfjgrnjgr/jg7zjg4jjgZnjgovloLTlkIjjgavjga8gYHRydWVgIOOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FtZWxpemUoc3JjOiBzdHJpbmcsIGxvd2VyID0gZmFsc2UpOiBzdHJpbmcge1xuICAgIHNyYyA9IHNyYy50cmltKCkucmVwbGFjZSgvWy1fXFxzXSsoLik/L2csIChtYXRjaCwgYykgPT4ge1xuICAgICAgICByZXR1cm4gYyA/IGMudG9VcHBlckNhc2UoKSA6ICcnO1xuICAgIH0pO1xuXG4gICAgaWYgKHRydWUgPT09IGxvd2VyKSB7XG4gICAgICAgIHJldHVybiBkZWNhcGl0YWxpemUoc3JjKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gc3JjO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgc3RyaW5nIHRvIGNhbWVsaXplZCBjbGFzcyBuYW1lLiBGaXJzdCBsZXR0ZXIgaXMgYWx3YXlzIHVwcGVyIGNhc2UuXG4gKiBAamEg5YWI6aCt5aSn5paH5a2X44Gu44Kt44Oj44Oh44Or44Kx44O844K544Gr5aSJ5o+bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjbGFzc2lmeShcInNvbWVfY2xhc3NfbmFtZVwiKTtcbiAqIC8vID0+IFwiU29tZUNsYXNzTmFtZVwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGFzc2lmeShzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGNhcGl0YWxpemUoY2FtZWxpemUoc3JjLnJlcGxhY2UoL1tcXFdfXS9nLCAnICcpKS5yZXBsYWNlKC9cXHMvZywgJycpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgYSBjYW1lbGl6ZWQgb3IgZGFzaGVyaXplZCBzdHJpbmcgaW50byBhbiB1bmRlcnNjb3JlZCBvbmUuXG4gKiBAamEg44Kt44Oj44Oh44Or44Kx44O844K5IG9yIGAtYCDjgaTjgarjgY7mloflrZfliJfjgpIgYF9gIOOBpOOBquOBjuOBq+WkieaPm1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogdW5kZXJzY29yZWQoXCJNb3pUcmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIm1vel90cmFuc2Zvcm1cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdW5kZXJzY29yZWQoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBzcmMudHJpbSgpLnJlcGxhY2UoLyhbYS16XFxkXSkoW0EtWl0rKS9nLCAnJDFfJDInKS5yZXBsYWNlKC9bLVxcc10rL2csICdfJykudG9Mb3dlckNhc2UoKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgYSB1bmRlcnNjb3JlZCBvciBjYW1lbGl6ZWQgc3RyaW5nIGludG8gYW4gZGFzaGVyaXplZCBvbmUuXG4gKiBAamEg44Kt44Oj44Oh44Or44Kx44O844K5IG9yIGBfYCDjgaTjgarjgY7mloflrZfliJfjgpIgYC1gIOOBpOOBquOBjuOBq+WkieaPm1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogZGFzaGVyaXplKFwiTW96VHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCItbW96LXRyYW5zZm9ybVwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXNoZXJpemUoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBzcmMudHJpbSgpLnJlcGxhY2UoLyhbQS1aXSkvZywgJy0kMScpLnJlcGxhY2UoL1tfXFxzXSsvZywgJy0nKS50b0xvd2VyQ2FzZSgpO1xufVxuIiwiaW1wb3J0IHR5cGUgeyBVbmtub3duT2JqZWN0LCBBY2Nlc3NpYmxlIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBhc3NpZ25WYWx1ZSB9IGZyb20gJy4vZGVlcC1jaXJjdWl0JztcbmltcG9ydCB7IHJhbmRvbUludCB9IGZyb20gJy4vbWlzYyc7XG5cbi8qKlxuICogQGVuIEV4ZWN1dGUgc2h1ZmZsZSBvZiBhbiBhcnJheSBlbGVtZW50cy5cbiAqIEBqYSDphY3liJfopoHntKDjga7jgrfjg6Pjg4Pjg5Xjg6tcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGRlc3RydWN0aXZlXG4gKiAgLSBgZW5gIHRydWU6IGRlc3RydWN0aXZlIC8gZmFsc2U6IG5vbi1kZXN0cnVjdGl2ZSAoZGVmYXVsdClcbiAqICAtIGBqYWAgdHJ1ZTog56C05aOK55qEIC8gZmFsc2U6IOmdnuegtOWjiueahCAo5pei5a6aKVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2h1ZmZsZTxUPihhcnJheTogVFtdLCBkZXN0cnVjdGl2ZSA9IGZhbHNlKTogVFtdIHtcbiAgICBjb25zdCBzb3VyY2UgPSBkZXN0cnVjdGl2ZSA/IGFycmF5IDogYXJyYXkuc2xpY2UoKTtcbiAgICBjb25zdCBsZW4gPSBzb3VyY2UubGVuZ3RoO1xuICAgIGZvciAobGV0IGkgPSBsZW4gPiAwID8gbGVuID4+PiAwIDogMDsgaSA+IDE7KSB7XG4gICAgICAgIGNvbnN0IGogPSBpICogTWF0aC5yYW5kb20oKSA+Pj4gMDtcbiAgICAgICAgY29uc3Qgc3dhcCA9IHNvdXJjZVstLWldO1xuICAgICAgICBzb3VyY2VbaV0gPSBzb3VyY2Vbal07XG4gICAgICAgIHNvdXJjZVtqXSA9IHN3YXA7XG4gICAgfVxuICAgIHJldHVybiBzb3VyY2U7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBFeGVjdXRlIHN0YWJsZSBzb3J0IGJ5IG1lcmdlLXNvcnQgYWxnb3JpdGhtLlxuICogQGphIGBtZXJnZS1zb3J0YCDjgavjgojjgovlronlrprjgr3jg7zjg4hcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNvbXBhcmF0b3JcbiAqICAtIGBlbmAgc29ydCBjb21wYXJhdG9yIGZ1bmN0aW9uXG4gKiAgLSBgamFgIOOCveODvOODiOmWouaVsOOCkuaMh+WumlxuICogQHBhcmFtIGRlc3RydWN0aXZlXG4gKiAgLSBgZW5gIHRydWU6IGRlc3RydWN0aXZlIC8gZmFsc2U6IG5vbi1kZXN0cnVjdGl2ZSAoZGVmYXVsdClcbiAqICAtIGBqYWAgdHJ1ZTog56C05aOK55qEIC8gZmFsc2U6IOmdnuegtOWjiueahCAo5pei5a6aKVxuICovXG5leHBvcnQgZnVuY3Rpb24gc29ydDxUPihhcnJheTogVFtdLCBjb21wYXJhdG9yOiAobGhzOiBULCByaHM6IFQpID0+IG51bWJlciwgZGVzdHJ1Y3RpdmUgPSBmYWxzZSk6IFRbXSB7XG4gICAgY29uc3Qgc291cmNlID0gZGVzdHJ1Y3RpdmUgPyBhcnJheSA6IGFycmF5LnNsaWNlKCk7XG4gICAgaWYgKHNvdXJjZS5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgfVxuICAgIGNvbnN0IGxocyA9IHNvcnQoc291cmNlLnNwbGljZSgwLCBzb3VyY2UubGVuZ3RoID4+PiAxKSwgY29tcGFyYXRvciwgdHJ1ZSk7XG4gICAgY29uc3QgcmhzID0gc29ydChzb3VyY2Uuc3BsaWNlKDApLCBjb21wYXJhdG9yLCB0cnVlKTtcbiAgICB3aGlsZSAobGhzLmxlbmd0aCAmJiByaHMubGVuZ3RoKSB7XG4gICAgICAgIHNvdXJjZS5wdXNoKGNvbXBhcmF0b3IobGhzWzBdLCByaHNbMF0pIDw9IDAgPyBsaHMuc2hpZnQoKSBhcyBUIDogcmhzLnNoaWZ0KCkgYXMgVCk7XG4gICAgfVxuICAgIHJldHVybiBzb3VyY2UuY29uY2F0KGxocywgcmhzKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1ha2UgdW5pcXVlIGFycmF5LlxuICogQGphIOmHjeikh+imgee0oOOBruOBquOBhOmFjeWIl+OBruS9nOaIkFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmlxdWU8VD4oYXJyYXk6IFRbXSk6IFRbXSB7XG4gICAgcmV0dXJuIFsuLi5uZXcgU2V0KGFycmF5KV07XG59XG5cbi8qKlxuICogQGVuIE1ha2UgdW5pb24gYXJyYXkuXG4gKiBAamEg6YWN5YiX44Gu5ZKM6ZuG5ZCI44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIGFycmF5c1xuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlzXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl+e+pFxuICovXG5leHBvcnQgZnVuY3Rpb24gdW5pb248VD4oLi4uYXJyYXlzOiBUW11bXSk6IFRbXSB7XG4gICAgcmV0dXJuIHVuaXF1ZShhcnJheXMuZmxhdCgpKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEdldCB0aGUgbW9kZWwgYXQgdGhlIGdpdmVuIGluZGV4LiBJZiBuZWdhdGl2ZSB2YWx1ZSBpcyBnaXZlbiwgdGhlIHRhcmdldCB3aWxsIGJlIGZvdW5kIGZyb20gdGhlIGxhc3QgaW5kZXguXG4gKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44Gr44KI44KL44Oi44OH44Or44G444Gu44Ki44Kv44K744K5LiDosqDlgKTjga7loLTlkIjjga/mnKvlsL7mpJzntKLjgpLlrp/ooYxcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgZW5gIEEgemVyby1iYXNlZCBpbnRlZ2VyIGluZGljYXRpbmcgd2hpY2ggZWxlbWVudCB0byByZXRyaWV2ZS4gPGJyPiBJZiBuZWdhdGl2ZSBpbmRleCBpcyBjb3VudGVkIGZyb20gdGhlIGVuZCBvZiB0aGUgbWF0Y2hlZCBzZXQuXG4gKiAgLSBgamFgIDAgYmFzZSDjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrpogPGJyPiDosqDlgKTjgYzmjIflrprjgZXjgozjgZ/loLTlkIgsIOacq+WwvuOBi+OCieOBruOCpOODs+ODh+ODg+OCr+OCueOBqOOBl+OBpuino+mHiOOBleOCjOOCi1xuICovXG5leHBvcnQgZnVuY3Rpb24gYXQ8VD4oYXJyYXk6IFRbXSwgaW5kZXg6IG51bWJlcik6IFQgfCBuZXZlciB7XG4gICAgY29uc3QgaWR4ID0gTWF0aC50cnVuYyhpbmRleCk7XG4gICAgY29uc3QgZWwgPSBpZHggPCAwID8gYXJyYXlbaWR4ICsgYXJyYXkubGVuZ3RoXSA6IGFycmF5W2lkeF07XG4gICAgaWYgKG51bGwgPT0gZWwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYGludmFsaWQgYXJyYXkgaW5kZXguIFtsZW5ndGg6ICR7YXJyYXkubGVuZ3RofSwgZ2l2ZW46ICR7aW5kZXh9XWApO1xuICAgIH1cbiAgICByZXR1cm4gZWw7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNYWtlIGluZGV4IGFycmF5LlxuICogQGphIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl+OBruS9nOaIkFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gZXhjbHVkZXNcbiAqICAtIGBlbmAgZXhjbHVkZSBpbmRleCBpbiByZXR1cm4gdmFsdWUuXG4gKiAgLSBgamFgIOaIu+OCiuWApOmFjeWIl+OBq+WQq+OCgeOBquOBhOOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5kaWNlczxUPihhcnJheTogVFtdLCAuLi5leGNsdWRlczogbnVtYmVyW10pOiBudW1iZXJbXSB7XG4gICAgY29uc3QgcmV0dmFsID0gWy4uLmFycmF5LmtleXMoKV07XG5cbiAgICBjb25zdCBsZW4gPSBhcnJheS5sZW5ndGg7XG4gICAgY29uc3QgZXhMaXN0ID0gWy4uLm5ldyBTZXQoZXhjbHVkZXMpXS5zb3J0KChsaHMsIHJocykgPT4gbGhzIDwgcmhzID8gMSA6IC0xKTtcbiAgICBmb3IgKGNvbnN0IGV4IG9mIGV4TGlzdCkge1xuICAgICAgICBpZiAoMCA8PSBleCAmJiBleCA8IGxlbikge1xuICAgICAgICAgICAgcmV0dmFsLnNwbGljZShleCwgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4ge0BsaW5rIGdyb3VwQnl9KCkgb3B0aW9ucyBkZWZpbml0aW9uLlxuICogQGphIHtAbGluayBncm91cEJ5fSgpIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEdyb3VwQnlPcHRpb25zPFxuICAgIFQgZXh0ZW5kcyBvYmplY3QsXG4gICAgVEtFWVMgZXh0ZW5kcyBrZXlvZiBULFxuICAgIFRTVU1LRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUR1JPVVBLRVkgZXh0ZW5kcyBzdHJpbmdcbj4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBgR1JPVVAgQllgIGtleXMuXG4gICAgICogQGphIGBHUk9VUCBCWWAg44Gr5oyH5a6a44GZ44KL44Kt44O8XG4gICAgICovXG4gICAga2V5czogRXh0cmFjdDxUS0VZUywgc3RyaW5nPltdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFnZ3JlZ2F0YWJsZSBrZXlzLlxuICAgICAqIEBqYSDpm4boqIjlj6/og73jgarjgq3jg7zkuIDopqdcbiAgICAgKi9cbiAgICBzdW1LZXlzPzogRXh0cmFjdDxUU1VNS0VZUywgc3RyaW5nPltdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdyb3VwZWQgaXRlbSBhY2Nlc3Mga2V5LiBkZWZhdWx0OiAnaXRlbXMnLFxuICAgICAqIEBqYSDjgrDjg6vjg7zjg5Tjg7PjgrDjgZXjgozjgZ/opoHntKDjgbjjga7jgqLjgq/jgrvjgrnjgq3jg7wuIOaXouWumjogJ2l0ZW1zJ1xuICAgICAqL1xuICAgIGdyb3VwS2V5PzogVEdST1VQS0VZO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm4gdHlwZSBvZiB7QGxpbmsgZ3JvdXBCeX0oKS5cbiAqIEBqYSB7QGxpbmsgZ3JvdXBCeX0oKSDjgYzov5TljbTjgZnjgovlnotcbiAqL1xuZXhwb3J0IHR5cGUgR3JvdXBCeVJldHVyblZhbHVlPFxuICAgIFQgZXh0ZW5kcyBvYmplY3QsXG4gICAgVEtFWVMgZXh0ZW5kcyBrZXlvZiBULFxuICAgIFRTVU1LRVlTIGV4dGVuZHMga2V5b2YgVCA9IG5ldmVyLFxuICAgIFRHUk9VUEtFWSBleHRlbmRzIHN0cmluZyA9ICdpdGVtcydcbj4gPSBSZWFkb25seTxSZWNvcmQ8VEtFWVMsIHVua25vd24+ICYgUmVjb3JkPFRTVU1LRVlTLCB1bmtub3duPiAmIFJlY29yZDxUR1JPVVBLRVksIFRbXT4+O1xuXG4vKipcbiAqIEBlbiBFeGVjdXRlIGBHUk9VUCBCWWAgZm9yIGFycmF5IGVsZW1lbnRzLlxuICogQGphIOmFjeWIl+OBruimgee0oOOBriBgR1JPVVAgQllgIOmbhuWQiOOCkuaKveWHulxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBgR1JPVVAgQllgIG9wdGlvbnNcbiAqICAtIGBqYWAgYEdST1VQIEJZYCDjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdyb3VwQnk8XG4gICAgVCBleHRlbmRzIG9iamVjdCxcbiAgICBUS0VZUyBleHRlbmRzIGtleW9mIFQsXG4gICAgVFNVTUtFWVMgZXh0ZW5kcyBrZXlvZiBUID0gbmV2ZXIsXG4gICAgVEdST1VQS0VZIGV4dGVuZHMgc3RyaW5nID0gJ2l0ZW1zJ1xuPihhcnJheTogVFtdLCBvcHRpb25zOiBHcm91cEJ5T3B0aW9uczxULCBUS0VZUywgVFNVTUtFWVMsIFRHUk9VUEtFWT4pOiBHcm91cEJ5UmV0dXJuVmFsdWU8VCwgVEtFWVMsIFRTVU1LRVlTLCBUR1JPVVBLRVk+W10ge1xuICAgIGNvbnN0IHsga2V5cywgc3VtS2V5cywgZ3JvdXBLZXkgfSA9IG9wdGlvbnM7XG4gICAgY29uc3QgX2dyb3VwS2V5ID0gZ3JvdXBLZXkgPz8gJ2l0ZW1zJztcbiAgICBjb25zdCBfc3VtS2V5czogc3RyaW5nW10gPSBzdW1LZXlzID8/IFtdO1xuICAgIF9zdW1LZXlzLnB1c2goX2dyb3VwS2V5KTtcblxuICAgIGNvbnN0IGhhc2ggPSBhcnJheS5yZWR1Y2UoKHJlczogQWNjZXNzaWJsZTxUPiwgZGF0YTogQWNjZXNzaWJsZTxUPikgPT4ge1xuICAgICAgICAvLyBjcmVhdGUgZ3JvdXBCeSBpbnRlcm5hbCBrZXlcbiAgICAgICAgY29uc3QgX2tleSA9IGtleXMucmVkdWNlKChzLCBrKSA9PiBzICsgU3RyaW5nKGRhdGFba10pLCAnJyk7XG5cbiAgICAgICAgLy8gaW5pdCBrZXlzXG4gICAgICAgIGlmICghKF9rZXkgaW4gcmVzKSkge1xuICAgICAgICAgICAgY29uc3Qga2V5TGlzdCA9IGtleXMucmVkdWNlKChoOiBVbmtub3duT2JqZWN0LCBrOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICBhc3NpZ25WYWx1ZShoLCBrLCBkYXRhW2tdKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaDtcbiAgICAgICAgICAgIH0sIHt9KTtcblxuICAgICAgICAgICAgKHJlc1tfa2V5XSBhcyBVbmtub3duT2JqZWN0KSA9IF9zdW1LZXlzLnJlZHVjZSgoaCwgazogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgaFtrXSA9IDA7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGg7XG4gICAgICAgICAgICB9LCBrZXlMaXN0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc0tleSA9IHJlc1tfa2V5XSBhcyBhbnk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuXG4gICAgICAgIC8vIHN1bSBwcm9wZXJ0aWVzXG4gICAgICAgIGZvciAoY29uc3QgayBvZiBfc3VtS2V5cykge1xuICAgICAgICAgICAgaWYgKF9ncm91cEtleSA9PT0gaykge1xuICAgICAgICAgICAgICAgIHJlc0tleVtrXSA9IHJlc0tleVtrXSB8fCBbXTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLW51bGxpc2gtY29hbGVzY2luZ1xuICAgICAgICAgICAgICAgIHJlc0tleVtrXS5wdXNoKGRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNLZXlba10gKz0gZGF0YVtrXSBhcyBudW1iZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH0sIHt9KTtcblxuICAgIHJldHVybiBPYmplY3QudmFsdWVzKGhhc2gpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29tcHV0ZXMgdGhlIGxpc3Qgb2YgdmFsdWVzIHRoYXQgYXJlIHRoZSBpbnRlcnNlY3Rpb24gb2YgYWxsIHRoZSBhcnJheXMuIEVhY2ggdmFsdWUgaW4gdGhlIHJlc3VsdCBpcyBwcmVzZW50IGluIGVhY2ggb2YgdGhlIGFycmF5cy5cbiAqIEBqYSDphY3liJfjga7nqY3pm4blkIjjgpLov5TljbQuIOi/lOWNtOOBleOCjOOBn+mFjeWIl+OBruimgee0oOOBr+OBmeOBueOBpuOBruWFpeWKm+OBleOCjOOBn+mFjeWIl+OBq+WQq+OBvuOCjOOCi1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc29sZS5sb2coaW50ZXJzZWN0aW9uKFsxLCAyLCAzXSwgWzEwMSwgMiwgMSwgMTBdLCBbMiwgMV0pKTtcbiAqIC8vID0+IFsxLCAyXVxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5c1xuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnRlcnNlY3Rpb248VD4oLi4uYXJyYXlzOiBUW11bXSk6IFRbXSB7XG4gICAgcmV0dXJuIGFycmF5cy5yZWR1Y2UoKGFjYywgYXJ5KSA9PiBhY2MuZmlsdGVyKGVsID0+IGFyeS5pbmNsdWRlcyhlbCkpKTtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyB0aGUgdmFsdWVzIGZyb20gYXJyYXkgdGhhdCBhcmUgbm90IHByZXNlbnQgaW4gdGhlIG90aGVyIGFycmF5cy5cbiAqIEBqYSDphY3liJfjgYvjgonjgbvjgYvjga7phY3liJfjgavlkKvjgb7jgozjgarjgYTjgoLjga7jgpLov5TljbRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnNvbGUubG9nKGRpZmZlcmVuY2UoWzEsIDIsIDMsIDQsIDVdLCBbNSwgMiwgMTBdKSk7XG4gKiAvLyA9PiBbMSwgMywgNF1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gb3RoZXJzXG4gKiAgLSBgZW5gIGV4Y2x1ZGUgZWxlbWVudCBpbiByZXR1cm4gdmFsdWUuXG4gKiAgLSBgamFgIOaIu+OCiuWApOmFjeWIl+OBq+WQq+OCgeOBquOBhOimgee0oOOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlmZmVyZW5jZTxUPihhcnJheTogVFtdLCAuLi5vdGhlcnM6IFRbXVtdKTogVFtdIHtcbiAgICBjb25zdCBhcnJheXMgPSBbYXJyYXksIC4uLm90aGVyc10gYXMgVFtdW107XG4gICAgcmV0dXJuIGFycmF5cy5yZWR1Y2UoKGFjYywgYXJ5KSA9PiBhY2MuZmlsdGVyKGVsID0+ICFhcnkuaW5jbHVkZXMoZWwpKSk7XG59XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSBjb3B5IG9mIHRoZSBhcnJheSB3aXRoIGFsbCBpbnN0YW5jZXMgb2YgdGhlIHZhbHVlcyByZW1vdmVkLlxuICogQGphIOmFjeWIl+OBi+OCieaMh+Wumuimgee0oOOCkuWPluOCiumZpOOBhOOBn+OCguOBruOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc29sZS5sb2cod2l0aG91dChbMSwgMiwgMSwgMCwgMywgMSwgNF0sIDAsIDEpKTtcbiAqIC8vID0+IFsyLCAzLCA0XVxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSB2YWx1ZXNcbiAqICAtIGBlbmAgZXhjbHVkZSBlbGVtZW50IGluIHJldHVybiB2YWx1ZS5cbiAqICAtIGBqYWAg5oi744KK5YCk6YWN5YiX44Gr5ZCr44KB44Gq44GE6KaB57Sg44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXRob3V0PFQ+KGFycmF5OiBUW10sIC4uLnZhbHVlczogVFtdKTogVFtdIHtcbiAgICByZXR1cm4gZGlmZmVyZW5jZShhcnJheSwgdmFsdWVzKTtcbn1cblxuLyoqXG4gKiBAZW4gUHJvZHVjZSBhIHJhbmRvbSBzYW1wbGUgZnJvbSB0aGUgbGlzdC5cbiAqIEBqYSDjg6njg7Pjg4Djg6DjgavjgrXjg7Pjg5fjg6vlgKTjgpLov5TljbRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnNvbGUubG9nKHNhbXBsZShbMSwgMiwgMywgNCwgNSwgNl0sIDMpKTtcbiAqIC8vID0+IFsxLCA2LCAyXVxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjb3VudFxuICogIC0gYGVuYCBudW1iZXIgb2Ygc2FtcGxpbmcgY291bnQuXG4gKiAgLSBgamFgIOi/lOWNtOOBmeOCi+OCteODs+ODl+ODq+aVsOOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FtcGxlPFQ+KGFycmF5OiBUW10sIGNvdW50OiBudW1iZXIpOiBUW107XG5cbi8qKlxuICogQGVuIFByb2R1Y2UgYSByYW5kb20gc2FtcGxlIGZyb20gdGhlIGxpc3QuXG4gKiBAamEg44Op44Oz44OA44Og44Gr44K144Oz44OX44Or5YCk44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zb2xlLmxvZyhzYW1wbGUoWzEsIDIsIDMsIDQsIDUsIDZdKSk7XG4gKiAvLyA9PiA0XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gc2FtcGxlPFQ+KGFycmF5OiBUW10pOiBUO1xuXG5leHBvcnQgZnVuY3Rpb24gc2FtcGxlPFQ+KGFycmF5OiBUW10sIGNvdW50PzogbnVtYmVyKTogVCB8IFRbXSB7XG4gICAgaWYgKG51bGwgPT0gY291bnQpIHtcbiAgICAgICAgcmV0dXJuIGFycmF5W3JhbmRvbUludChhcnJheS5sZW5ndGggLSAxKV07XG4gICAgfVxuICAgIGNvbnN0IHNhbXBsZSA9IGFycmF5LnNsaWNlKCk7XG4gICAgY29uc3QgbGVuZ3RoID0gc2FtcGxlLmxlbmd0aDtcbiAgICBjb3VudCA9IE1hdGgubWF4KE1hdGgubWluKGNvdW50LCBsZW5ndGgpLCAwKTtcbiAgICBjb25zdCBsYXN0ID0gbGVuZ3RoIC0gMTtcbiAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgY291bnQ7IGluZGV4KyspIHtcbiAgICAgICAgY29uc3QgcmFuZCA9IHJhbmRvbUludChpbmRleCwgbGFzdCk7XG4gICAgICAgIGNvbnN0IHRlbXAgPSBzYW1wbGVbaW5kZXhdO1xuICAgICAgICBzYW1wbGVbaW5kZXhdID0gc2FtcGxlW3JhbmRdO1xuICAgICAgICBzYW1wbGVbcmFuZF0gPSB0ZW1wO1xuICAgIH1cbiAgICByZXR1cm4gc2FtcGxlLnNsaWNlKDAsIGNvdW50KTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFJldHVybnMgYSByZXN1bHQgb2YgcGVybXV0YXRpb24gZnJvbSB0aGUgbGlzdC5cbiAqIEBqYSDphY3liJfjgYvjgonpoIbliJfntZDmnpzjgpLov5TljbRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGFyciA9IHBlcm11dGF0aW9uKFsnYScsICdiJywgJ2MnXSwgMik7XG4gKiBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhcnIpKTtcbiAqIC8vID0+IFtbJ2EnLCdiJ10sWydhJywnYyddLFsnYicsJ2EnXSxbJ2InLCdjJ10sWydjJywnYSddLFsnYycsJ2InXV1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY291bnRcbiAqICAtIGBlbmAgbnVtYmVyIG9mIHBpY2sgdXAuXG4gKiAgLSBgamFgIOmBuOaKnuaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gcGVybXV0YXRpb248VD4oYXJyYXk6IFRbXSwgY291bnQ6IG51bWJlcik6IFRbXVtdIHtcbiAgICBjb25zdCByZXR2YWw6IFRbXVtdID0gW107XG4gICAgaWYgKGFycmF5Lmxlbmd0aCA8IGNvdW50KSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgaWYgKDEgPT09IGNvdW50KSB7XG4gICAgICAgIGZvciAoY29uc3QgW2ksIHZhbF0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgICAgICByZXR2YWxbaV0gPSBbdmFsXTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBuMSA9IGFycmF5Lmxlbmd0aDsgaSA8IG4xOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gYXJyYXkuc2xpY2UoMCk7XG4gICAgICAgICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBwZXJtdXRhdGlvbihwYXJ0cywgY291bnQgLSAxKTtcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwLCBuMiA9IHJvdy5sZW5ndGg7IGogPCBuMjsgaisrKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsLnB1c2goW2FycmF5W2ldXS5jb25jYXQocm93W2pdKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIHJlc3VsdCBvZiBjb21iaW5hdGlvbiBmcm9tIHRoZSBsaXN0LlxuICogQGphIOmFjeWIl+OBi+OCiee1hOOBv+WQiOOCj+OBm+e1kOaenOOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgYXJyID0gY29tYmluYXRpb24oWydhJywgJ2InLCAnYyddLCAyKTtcbiAqIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFycikpO1xuICogLy8gPT4gW1snYScsJ2InXSxbJ2EnLCdjJ10sWydiJywnYyddXVxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjb3VudFxuICogIC0gYGVuYCBudW1iZXIgb2YgcGljayB1cC5cbiAqICAtIGBqYWAg6YG45oqe5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21iaW5hdGlvbjxUPihhcnJheTogVFtdLCBjb3VudDogbnVtYmVyKTogVFtdW10ge1xuICAgIGNvbnN0IHJldHZhbDogVFtdW10gPSBbXTtcbiAgICBpZiAoYXJyYXkubGVuZ3RoIDwgY291bnQpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBpZiAoMSA9PT0gY291bnQpIHtcbiAgICAgICAgZm9yIChjb25zdCBbaSwgdmFsXSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIHJldHZhbFtpXSA9IFt2YWxdO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIG4xID0gYXJyYXkubGVuZ3RoOyBpIDwgbjEgLSBjb3VudCArIDE7IGkrKykge1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gY29tYmluYXRpb24oYXJyYXkuc2xpY2UoaSArIDEpLCBjb3VudCAtIDEpO1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDAsIG4yID0gcm93Lmxlbmd0aDsgaiA8IG4yOyBqKyspIHtcbiAgICAgICAgICAgICAgICByZXR2YWwucHVzaChbYXJyYXlbaV1dLmNvbmNhdChyb3dbal0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLm1hcCgpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLm1hcCgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50ICpBcnJheSogYXMgdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+e1kOaenOmFjeWIl+OCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFwPFQsIFU+KHRoaXM6IHVua25vd24sIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUgfCBQcm9taXNlPFU+LCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8VVtdPiB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFxuICAgICAgICBhcnJheS5tYXAoYXN5bmMgKHYsIGksIGEpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgPz8gdGhpcywgdiwgaSwgYSk7XG4gICAgICAgIH0pXG4gICAgKTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLmZpbHRlcigpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLmZpbHRlcigpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50ICpBcnJheSogYXMgdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+e1kOaenOmFjeWIl+OCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmlsdGVyPFQ+KHRoaXM6IHVua25vd24sIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IGJvb2xlYW4gfCBQcm9taXNlPGJvb2xlYW4+LCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8VFtdPiB7XG4gICAgY29uc3QgYml0czogYm9vbGVhbltdID0gYXdhaXQgbWFwKGFycmF5LCAodiwgaSwgYSkgPT4gY2FsbGJhY2suY2FsbCh0aGlzQXJnID8/IHRoaXMsIHYsIGksIGEpKTtcbiAgICByZXR1cm4gYXJyYXkuZmlsdGVyKCgpID0+IGJpdHMuc2hpZnQoKSk7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5maW5kKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZmluZCgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50IHZhbHVlLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PntZDmnpzjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbmQ8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxUIHwgdW5kZWZpbmVkPiB7XG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmIChhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgPz8gdGhpcywgdiwgaSwgYXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gdjtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuZmluZEluZGV4KClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZmluZEluZGV4KClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgaW5kZXggdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCueOCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZEluZGV4PFQ+KHRoaXM6IHVua25vd24sIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IGJvb2xlYW4gfCBQcm9taXNlPGJvb2xlYW4+LCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmIChhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgPz8gdGhpcywgdiwgaSwgYXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5zb21lKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuc29tZSgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50IGJvb2xlYW4gdmFsdWUuXG4gKiAgLSBgamFgIOecn+WBveWApOOCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc29tZTxUPih0aGlzOiB1bmtub3duLCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiB1bmtub3duLCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGZvciAoY29uc3QgW2ksIHZdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoYXdhaXQgY2FsbGJhY2suY2FsbCh0aGlzQXJnID8/IHRoaXMsIHYsIGksIGFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuZXZlcnkoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5ldmVyeSgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50IGJvb2xlYW4gdmFsdWUuXG4gKiAgLSBgamFgIOecn+WBveWApOOCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXZlcnk8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdW5rbm93biwgdGhpc0FyZz86IHVua25vd24pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKCFhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgPz8gdGhpcywgdiwgaSwgYXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5yZWR1Y2UoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5yZWR1Y2UoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIGluaXRpYWxWYWx1ZVxuICogIC0gYGVuYCBVc2VkIGFzIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBmaXJzdCBjYWxsIG9mIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag44Gr5rih44GV44KM44KL5Yid5pyf5YCkXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgKkFycmF5KiBhcyB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c6YWN5YiX44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWR1Y2U8VCwgVT4oXG4gICAgYXJyYXk6IFRbXSxcbiAgICBjYWxsYmFjazogKGFjY3VtdWxhdG9yOiBVLCBjdXJyZW50VmFsdWU6IFQsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVIHwgUHJvbWlzZTxVPixcbiAgICBpbml0aWFsVmFsdWU/OiBVXG4pOiBQcm9taXNlPFU+IHtcbiAgICBpZiAoYXJyYXkubGVuZ3RoIDw9IDAgJiYgdW5kZWZpbmVkID09PSBpbml0aWFsVmFsdWUpIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdSZWR1Y2Ugb2YgZW1wdHkgYXJyYXkgd2l0aCBubyBpbml0aWFsIHZhbHVlJyk7XG4gICAgfVxuXG4gICAgY29uc3QgaGFzSW5pdCA9ICh1bmRlZmluZWQgIT09IGluaXRpYWxWYWx1ZSk7XG4gICAgbGV0IGFjYyA9IChoYXNJbml0ID8gaW5pdGlhbFZhbHVlIDogYXJyYXlbMF0pIGFzIFU7XG5cbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKCEoIWhhc0luaXQgJiYgMCA9PT0gaSkpIHtcbiAgICAgICAgICAgIGFjYyA9IGF3YWl0IGNhbGxiYWNrKGFjYywgdiwgaSwgYXJyYXkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGFjYztcbn1cbiIsIi8qKlxuICogQGVuIERhdGUgdW5pdCBkZWZpbml0aW9ucy5cbiAqIEBqYSDml6XmmYLjgqrjg5bjgrjjgqfjgq/jg4jjga7ljZjkvY3lrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgRGF0ZVVuaXQgPSAneWVhcicgfCAnbW9udGgnIHwgJ2RheScgfCAnaG91cicgfCAnbWluJyB8ICdzZWMnIHwgJ21zZWMnO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfY29tcHV0ZURhdGVGdW5jTWFwID0ge1xuICAgIHllYXI6IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ0Z1bGxZZWFyKGJhc2UuZ2V0VVRDRnVsbFllYXIoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG4gICAgbW9udGg6IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ01vbnRoKGJhc2UuZ2V0VVRDTW9udGgoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG4gICAgZGF5OiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENEYXRlKGJhc2UuZ2V0VVRDRGF0ZSgpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbiAgICBob3VyOiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENIb3VycyhiYXNlLmdldFVUQ0hvdXJzKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIG1pbjogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDTWludXRlcyhiYXNlLmdldFVUQ01pbnV0ZXMoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG4gICAgc2VjOiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENTZWNvbmRzKGJhc2UuZ2V0VVRDU2Vjb25kcygpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbiAgICBtc2VjOiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENNaWxsaXNlY29uZHMoYmFzZS5nZXRVVENNaWxsaXNlY29uZHMoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG59O1xuXG4vKipcbiAqIEBlbiBDYWxjdWxhdGUgZnJvbSB0aGUgZGF0ZSB3aGljaCBiZWNvbWVzIGEgY2FyZGluYWwgcG9pbnQgYmVmb3JlIGEgTiBkYXRlIHRpbWUgb3IgYWZ0ZXIgYSBOIGRhdGUgdGltZSAoYnkge0BsaW5rIERhdGVVbml0fSkuXG4gKiBAamEg5Z+654K544Go44Gq44KL5pel5LuY44GL44KJ44CBTuaXpeW+jOOAgU7ml6XliY3jgpLnrpflh7pcbiAqXG4gKiBAcGFyYW0gYmFzZVxuICogIC0gYGVuYCBiYXNlIGRhdGUgdGltZS5cbiAqICAtIGBqYWAg5Z+65rqW5pelXG4gKiBAcGFyYW0gYWRkXG4gKiAgLSBgZW5gIHJlbGF0aXZlIGRhdGUgdGltZS5cbiAqICAtIGBqYWAg5Yqg566X5pelLiDjg57jgqTjg4rjgrnmjIflrprjgadu5pel5YmN44KC6Kit5a6a5Y+v6IO9XG4gKiBAcGFyYW0gdW5pdCB7QGxpbmsgRGF0ZVVuaXR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlRGF0ZShiYXNlOiBEYXRlLCBhZGQ6IG51bWJlciwgdW5pdDogRGF0ZVVuaXQgPSAnZGF5Jyk6IERhdGUge1xuICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShiYXNlLmdldFRpbWUoKSk7XG4gICAgY29uc3QgZnVuYyA9IF9jb21wdXRlRGF0ZUZ1bmNNYXBbdW5pdF07XG4gICAgaWYgKGZ1bmMpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMoZGF0ZSwgYmFzZSwgYWRkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBpbnZhbGlkIHVuaXQ6ICR7dW5pdH1gKTtcbiAgICB9XG59XG4iLCJjb25zdCBfc3RhdHVzOiBSZWNvcmQ8c3RyaW5nIHwgc3ltYm9sLCBudW1iZXI+ID0ge307XG5cbi8qKlxuICogQGVuIEluY3JlbWVudCByZWZlcmVuY2UgY291bnQgZm9yIHN0YXR1cyBpZGVudGlmaWVyLlxuICogQGphIOeKtuaFi+WkieaVsOOBruWPgueFp+OCq+OCpuODs+ODiOOBruOCpOODs+OCr+ODquODoeODs+ODiFxuICpcbiAqIEBwYXJhbSBzdGF0dXNcbiAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIHJlZmVyZW5jZSBjb3VudCB2YWx1ZVxuICogIC0gYGphYCDlj4Lnhafjgqvjgqbjg7Pjg4jjga7lgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0YXR1c0FkZFJlZihzdGF0dXM6IHN0cmluZyB8IHN5bWJvbCk6IG51bWJlciB7XG4gICAgaWYgKCFfc3RhdHVzW3N0YXR1c10pIHtcbiAgICAgICAgX3N0YXR1c1tzdGF0dXNdID0gMTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBfc3RhdHVzW3N0YXR1c10rKztcbiAgICB9XG4gICAgcmV0dXJuIF9zdGF0dXNbc3RhdHVzXTtcbn1cblxuLyoqXG4gKiBAZW4gRGVjcmVtZW50IHJlZmVyZW5jZSBjb3VudCBmb3Igc3RhdHVzIGlkZW50aWZpZXIuXG4gKiBAamEg54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44OH44Kv44Oq44Oh44Oz44OIXG4gKlxuICogQHBhcmFtIHN0YXR1c1xuICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgcmVmZXJlbmNlIGNvdW50IHZhbHVlXG4gKiAgLSBgamFgIOWPgueFp+OCq+OCpuODs+ODiOOBruWApFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RhdHVzUmVsZWFzZShzdGF0dXM6IHN0cmluZyB8IHN5bWJvbCk6IG51bWJlciB7XG4gICAgaWYgKCFfc3RhdHVzW3N0YXR1c10pIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcmV0dmFsID0gLS1fc3RhdHVzW3N0YXR1c107XG4gICAgICAgIGlmICgwID09PSByZXR2YWwpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBfc3RhdHVzW3N0YXR1c107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIFN0YXRlIHZhcmlhYmxlIG1hbmFnZW1lbnQgc2NvcGVcbiAqIEBqYSDnirbmhYvlpInmlbDnrqHnkIbjgrnjgrPjg7zjg5dcbiAqXG4gKiBAcGFyYW0gc3RhdHVzXG4gKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWwXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCByZXR2YWwgb2Ygc2VlZCBmdW5jdGlvbi5cbiAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWw44Gu5oi744KK5YCkXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGF0dXNTY29wZTxUPihzdGF0dXM6IHN0cmluZyB8IHN5bWJvbCwgZXhlY3V0b3I6ICgpID0+IFQgfCBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gICAgdHJ5IHtcbiAgICAgICAgc3RhdHVzQWRkUmVmKHN0YXR1cyk7XG4gICAgICAgIHJldHVybiBhd2FpdCBleGVjdXRvcigpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAgIHN0YXR1c1JlbGVhc2Uoc3RhdHVzKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENoZWNrIGlmIGl0J3MgaW4gdGhlIHNwZWNpZmllZCBzdGF0ZS5cbiAqIEBqYSDmjIflrprjgZfjgZ/nirbmhYvkuK3jgafjgYLjgovjgYvnorroqo1cbiAqXG4gKiBAcGFyYW0gc3RhdHVzXG4gKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gKiBAcmV0dXJuIHtCb29sZWFufSB0cnVlOiDnirbmhYvlhoUgLyBmYWxzZTog54q25oWL5aSWXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBgdHJ1ZWA6IHdpdGhpbiB0aGUgc3RhdHVzIC8gYGZhbHNlYDogb3V0IG9mIHRoZSBzdGF0dXNcbiAqICAtIGBqYWAgYHRydWVgOiDnirbmhYvlhoUgLyBgZmFsc2VgOiDnirbmhYvlpJZcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3RhdHVzSW4oc3RhdHVzOiBzdHJpbmcgfCBzeW1ib2wpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISFfc3RhdHVzW3N0YXR1c107XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICB0eXBlIEFyZ3VtZW50cyxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIGlzU3ltYm9sLFxuICAgIGNsYXNzTmFtZSxcbiAgICB2ZXJpZnksXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgRXZlbnRBbGwsXG4gICAgU3Vic2NyaXB0aW9uLFxuICAgIFN1YnNjcmliYWJsZSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBMaXNuZXIg5qC857SN5b2i5byPICovXG50eXBlIExpc3RlbmVyc01hcDxUPiA9IE1hcDxrZXlvZiBULCBTZXQ8KC4uLmFyZ3M6IFRba2V5b2YgVF1bXSkgPT4gdW5rbm93bj4+O1xuXG4vKiogQGludGVybmFsIExpc25lciDjga7lvLHlj4LnhacgKi9cbmNvbnN0IF9tYXBMaXN0ZW5lcnMgPSBuZXcgV2Vha01hcDxFdmVudFB1Ymxpc2hlcjxhbnk+LCBMaXN0ZW5lcnNNYXA8YW55Pj4oKTtcblxuLyoqIEBpbnRlcm5hbCBMaXNuZXJNYXAg44Gu5Y+W5b6XICovXG5mdW5jdGlvbiBsaXN0ZW5lcnM8VCBleHRlbmRzIG9iamVjdD4oaW5zdGFuY2U6IEV2ZW50UHVibGlzaGVyPFQ+KTogTGlzdGVuZXJzTWFwPFQ+IHtcbiAgICBpZiAoIV9tYXBMaXN0ZW5lcnMuaGFzKGluc3RhbmNlKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGlzIGlzIG5vdCBhIHZhbGlkIEV2ZW50UHVibGlzaGVyLicpO1xuICAgIH1cbiAgICByZXR1cm4gX21hcExpc3RlbmVycy5nZXQoaW5zdGFuY2UpIGFzIExpc3RlbmVyc01hcDxUPjtcbn1cblxuLyoqIEBpbnRlcm5hbCBDaGFubmVsIOOBruWei+aknOiovCAqL1xuZnVuY3Rpb24gdmFsaWRDaGFubmVsKGNoYW5uZWw6IHVua25vd24pOiB2b2lkIHwgbmV2ZXIge1xuICAgIGlmIChpc1N0cmluZyhjaGFubmVsKSB8fCBpc1N5bWJvbChjaGFubmVsKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFR5cGUgb2YgJHtjbGFzc05hbWUoY2hhbm5lbCl9IGlzIG5vdCBhIHZhbGlkIGNoYW5uZWwuYCk7XG59XG5cbi8qKiBAaW50ZXJuYWwgTGlzdGVuZXIg44Gu5Z6L5qSc6Ki8ICovXG5mdW5jdGlvbiB2YWxpZExpc3RlbmVyKGxpc3RlbmVyPzogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bik6IGFueSB7XG4gICAgaWYgKG51bGwgIT0gbGlzdGVuZXIpIHtcbiAgICAgICAgdmVyaWZ5KCd0eXBlT2YnLCAnZnVuY3Rpb24nLCBsaXN0ZW5lcik7XG4gICAgfVxuICAgIHJldHVybiBsaXN0ZW5lcjtcbn1cblxuLyoqIEBpbnRlcm5hbCBldmVudCDnmbrooYwgKi9cbmZ1bmN0aW9uIHRyaWdnZXJFdmVudDxFdmVudCwgQ2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihcbiAgICBtYXA6IExpc3RlbmVyc01hcDxFdmVudD4sXG4gICAgY2hhbm5lbDogQ2hhbm5lbCxcbiAgICBvcmlnaW5hbDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj5cbik6IHZvaWQge1xuICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoYW5uZWwpO1xuICAgIGlmICghbGlzdCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAoY29uc3QgbGlzdGVuZXIgb2YgbGlzdCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZXZlbnRBcmdzID0gb3JpZ2luYWwgPyBbb3JpZ2luYWwsIC4uLmFyZ3NdIDogYXJncztcbiAgICAgICAgICAgIGNvbnN0IGhhbmRsZWQgPSBsaXN0ZW5lciguLi5ldmVudEFyZ3MpO1xuICAgICAgICAgICAgLy8gaWYgcmVjZWl2ZWQgJ3RydWUnLCBzdG9wIGRlbGVnYXRpb24uXG4gICAgICAgICAgICBpZiAodHJ1ZSA9PT0gaGFuZGxlZCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB2b2lkIFByb21pc2UucmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gRXZlbnRpbmcgZnJhbWV3b3JrIGNsYXNzIHdpdGggZW5zdXJpbmcgdHlwZS1zYWZlIGZvciBUeXBlU2NyaXB0LiA8YnI+XG4gKiAgICAgVGhlIGNsaWVudCBvZiB0aGlzIGNsYXNzIGNhbiBpbXBsZW1lbnQgb3JpZ2luYWwgUHViLVN1YiAoT2JzZXJ2ZXIpIGRlc2lnbiBwYXR0ZXJuLlxuICogQGphIOWei+WuieWFqOOCkuS/nemanOOBmeOCi+OCpOODmeODs+ODiOeZu+mMsuODu+eZuuihjOOCr+ODqeOCuSA8YnI+XG4gKiAgICAg44Kv44Op44Kk44Ki44Oz44OI44Gv5pys44Kv44Op44K544KS5rS+55Sf44GX44Gm54us6Ieq44GuIFB1Yi1TdWIgKE9ic2VydmVyKSDjg5Hjgr/jg7zjg7PjgpLlrp/oo4Xlj6/og71cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiAvLyBkZWNsYXJlIGV2ZW50IGludGVyZmFjZVxuICogaW50ZXJmYWNlIFNhbXBsZUV2ZW50IHtcbiAqICAgaG9nZTogW251bWJlciwgc3RyaW5nXTsgICAgICAgIC8vIGNhbGxiYWNrIGZ1bmN0aW9uJ3MgYXJncyB0eXBlIHR1cGxlXG4gKiAgIGZvbzogW3ZvaWRdOyAgICAgICAgICAgICAgICAgICAvLyBubyBhcmdzXG4gKiAgIGhvbzogdm9pZDsgICAgICAgICAgICAgICAgICAgICAvLyBubyBhcmdzIChzYW1lIHRoZSB1cG9uKVxuICogICBiYXI6IFtFcnJvcl07ICAgICAgICAgICAgICAgICAgLy8gYW55IGNsYXNzIGlzIGF2YWlsYWJsZS5cbiAqICAgYmF6OiBFcnJvciB8IE51bWJlcjsgICAgICAgICAgIC8vIGlmIG9ubHkgb25lIGFyZ3VtZW50LCBgW11gIGlzIG5vdCByZXF1aXJlZC5cbiAqIH1cbiAqXG4gKiAvLyBkZWNsYXJlIGNsaWVudCBjbGFzc1xuICogY2xhc3MgU2FtcGxlUHVibGlzaGVyIGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8U2FtcGxlRXZlbnQ+IHtcbiAqICAgOlxuICogICBzb21lTWV0aG9kKCk6IHZvaWQge1xuICogICAgIHRoaXMucHVibGlzaCgnaG9nZScsIDEwMCwgJ3Rlc3QnKTsgICAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogICAgIHRoaXMucHVibGlzaCgnaG9nZScsIDEwMCwgdHJ1ZSk7ICAgICAgICAgLy8gTkcuIGFyZ3VtZW50IG9mIHR5cGUgJ3RydWUnIGlzIG5vdCBhc3NpZ25hYmxlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdG8gcGFyYW1ldGVyIG9mIHR5cGUgJ3N0cmluZyB8IHVuZGVmaW5lZCcuXG4gKiAgICAgdGhpcy5wdWJsaXNoKCdob2dlJywgMTAwKTsgICAgICAgICAgICAgICAvLyBPSy4gYWxsIGFyZ3MgdG8gYmUgb3B0aW9uYWwgYXV0b21hdGljYWxseS5cbiAqICAgICB0aGlzLnB1Ymxpc2goJ2ZvbycpOyAgICAgICAgICAgICAgICAgICAgIC8vIE9LLiBzdGFuZGFyZCB1c2FnZS5cbiAqICAgICB0aGlzLnB1Ymxpc2goJ2ZvbycsIDEwMCk7ICAgICAgICAgICAgICAgIC8vIE5HLiBhcmd1bWVudCBvZiB0eXBlICcxMDAnIGlzIG5vdCBhc3NpZ25hYmxlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdG8gcGFyYW1ldGVyIG9mIHR5cGUgJ3ZvaWQgfCB1bmRlZmluZWQnLlxuICogICB9XG4gKiB9XG4gKlxuICogY29uc3Qgc2FtcGxlID0gbmV3IFNhbXBsZVB1Ymxpc2hlcigpO1xuICpcbiAqIHNhbXBsZS5vbignaG9nZScsIChhOiBudW1iZXIsIGI6IHN0cmluZykgPT4geyAuLi4gfSk7ICAgIC8vIE9LLiBzdGFuZGFyZCB1c2FnZS5cbiAqIHNhbXBsZS5vbignaG9nZScsIChhOiBudW1iZXIsIGI6IGJvb2xlYW4pID0+IHsgLi4uIH0pOyAgIC8vIE5HLiB0eXBlcyBvZiBwYXJhbWV0ZXJzICdiJ1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIGFuZCAnYXJnc18xJyBhcmUgaW5jb21wYXRpYmxlLlxuICogc2FtcGxlLm9uKCdob2dlJywgKGEpID0+IHsgLi4uIH0pOyAgICAgICAgICAgICAgICAgICAgICAgLy8gT0suIGFsbCBhcmdzXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdG8gYmUgb3B0aW9uYWwgYXV0b21hdGljYWxseS5cbiAqIHNhbXBsZS5vbignaG9nZScsIChhLCBiLCBjKSA9PiB7IC4uLiB9KTsgICAgICAgICAgICAgICAgIC8vIE5HLiBleHBlY3RlZCAxLTIgYXJndW1lbnRzLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIGJ1dCBnb3QgMy5cbiAqIGBgYFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRXZlbnRQdWJsaXNoZXI8RXZlbnQgZXh0ZW5kcyBvYmplY3Q+IGltcGxlbWVudHMgU3Vic2NyaWJhYmxlPEV2ZW50PiB7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdmVyaWZ5KCdpbnN0YW5jZU9mJywgRXZlbnRQdWJsaXNoZXIsIHRoaXMpO1xuICAgICAgICBfbWFwTGlzdGVuZXJzLnNldCh0aGlzLCBuZXcgTWFwKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBOb3RpZnkgZXZlbnQgdG8gY2xpZW50cy5cbiAgICAgKiBAamEgZXZlbnQg55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgYXJndW1lbnRzIGZvciBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWw44Gr5rih44GZ5byV5pWwXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHB1Ymxpc2g8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsLCAuLi5hcmdzOiBBcmd1bWVudHM8UGFydGlhbDxFdmVudFtDaGFubmVsXT4+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVycyh0aGlzKTtcbiAgICAgICAgdmFsaWRDaGFubmVsKGNoYW5uZWwpO1xuICAgICAgICB0cmlnZ2VyRXZlbnQobWFwLCBjaGFubmVsLCB1bmRlZmluZWQsIC4uLmFyZ3MpO1xuICAgICAgICAvLyB0cmlnZ2VyIGZvciBhbGwgaGFuZGxlclxuICAgICAgICBpZiAoJyonICE9PSBjaGFubmVsKSB7XG4gICAgICAgICAgICB0cmlnZ2VyRXZlbnQobWFwIGFzIHVua25vd24gYXMgTGlzdGVuZXJzTWFwPEV2ZW50QWxsPiwgJyonLCBjaGFubmVsIGFzIHN0cmluZywgLi4uYXJncyk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBTdWJzY3JpYmFibGU8RXZlbnQ+XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgd2hldGhlciB0aGlzIG9iamVjdCBoYXMgY2xpZW50cy5cbiAgICAgKiBAamEg44Kv44Op44Kk44Ki44Oz44OI44GM5a2Y5Zyo44GZ44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBoYXNMaXN0ZW5lcjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw/OiBDaGFubmVsLCBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVycyh0aGlzKTtcbiAgICAgICAgaWYgKG51bGwgPT0gY2hhbm5lbCkge1xuICAgICAgICAgICAgcmV0dXJuIG1hcC5zaXplID4gMDtcbiAgICAgICAgfVxuICAgICAgICB2YWxpZENoYW5uZWwoY2hhbm5lbCk7XG4gICAgICAgIGlmIChudWxsID09IGxpc3RlbmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFwLmhhcyhjaGFubmVsKTtcbiAgICAgICAgfVxuICAgICAgICB2YWxpZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2hhbm5lbCk7XG4gICAgICAgIHJldHVybiBsaXN0ID8gbGlzdC5oYXMobGlzdGVuZXIpIDogZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgcmVnaXN0ZXJlZCBjaGFubmVsIGtleXMuXG4gICAgICogQGphIOeZu+mMsuOBleOCjOOBpuOBhOOCi+ODgeODo+ODjeODq+OCreODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNoYW5uZWxzKCk6IChrZXlvZiBFdmVudClbXSB7XG4gICAgICAgIHJldHVybiBbLi4ubGlzdGVuZXJzKHRoaXMpLmtleXMoKV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb248Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lcnModGhpcyk7XG4gICAgICAgIHZhbGlkTGlzdGVuZXIobGlzdGVuZXIpO1xuXG4gICAgICAgIGNvbnN0IGNoYW5uZWxzID0gaXNBcnJheShjaGFubmVsKSA/IGNoYW5uZWwgOiBbY2hhbm5lbF07XG4gICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgIHZhbGlkQ2hhbm5lbChjaCk7XG4gICAgICAgICAgICBtYXAuaGFzKGNoKSA/IG1hcC5nZXQoY2gpIS5hZGQobGlzdGVuZXIpIDogbWFwLnNldChjaCwgbmV3IFNldChbbGlzdGVuZXJdKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgICAgICBnZXQgZW5hYmxlKCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2gpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWxpc3Q/LmhhcyhsaXN0ZW5lcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1bnN1YnNjcmliZSgpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3QuZGVsZXRlKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3Quc2l6ZSA+IDAgfHwgbWFwLmRlbGV0ZShjaCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpIGJ1dCBpdCBjYXVzZXMgdGhlIGJvdW5kIGNhbGxiYWNrIHRvIG9ubHkgZmlyZSBvbmNlIGJlZm9yZSBiZWluZyByZW1vdmVkLlxuICAgICAqIEBqYSDkuIDluqbjgaDjgZHjg4/jg7Pjg4njg6rjg7PjgrDlj6/og73jgarjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbmNlPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMub24oY2hhbm5lbCwgbGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBtYW5hZ2VkID0gdGhpcy5vbihjaGFubmVsLCAoKSA9PiB7XG4gICAgICAgICAgICBjb250ZXh0LnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICBtYW5hZ2VkLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29udGV4dDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm6Kej6ZmkXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvZmY8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsPzogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IHRoaXMge1xuICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lcnModGhpcyk7XG4gICAgICAgIGlmIChudWxsID09IGNoYW5uZWwpIHtcbiAgICAgICAgICAgIG1hcC5jbGVhcigpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjaGFubmVscyA9IGlzQXJyYXkoY2hhbm5lbCkgPyBjaGFubmVsIDogW2NoYW5uZWxdO1xuICAgICAgICBjb25zdCBjYWxsYmFjayA9IHZhbGlkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgICAgICB2YWxpZENoYW5uZWwoY2gpO1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBtYXAuZGVsZXRlKGNoKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2gpO1xuICAgICAgICAgICAgICAgIGlmIChsaXN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3QuZGVsZXRlKGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgbGlzdC5zaXplID4gMCB8fCBtYXAuZGVsZXRlKGNoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBBcmd1bWVudHMgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHR5cGUgeyBTdWJzY3JpYmFibGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICcuL3B1Ymxpc2hlcic7XG5cbi8qKiByZS1leHBvcnQgKi9cbmV4cG9ydCB0eXBlIEV2ZW50QXJndW1lbnRzPFQ+ID0gQXJndW1lbnRzPFQ+O1xuXG4vKipcbiAqIEBlbiBFdmVudGluZyBmcmFtZXdvcmsgb2JqZWN0IGFibGUgdG8gY2FsbCBgcHVibGlzaCgpYCBtZXRob2QgZnJvbSBvdXRzaWRlLlxuICogQGphIOWklumDqOOBi+OCieOBriBgcHVibGlzaCgpYCDjgpLlj6/og73jgavjgZfjgZ/jgqTjg5njg7Pjg4jnmbvpjLLjg7vnmbrooYzjgq/jg6njgrlcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiAvLyBkZWNsYXJlIGV2ZW50IGludGVyZmFjZVxuICogaW50ZXJmYWNlIFNhbXBsZUV2ZW50IHtcbiAqICAgaG9nZTogW251bWJlciwgc3RyaW5nXTsgICAgICAgIC8vIGNhbGxiYWNrIGZ1bmN0aW9uJ3MgYXJncyB0eXBlIHR1cGxlXG4gKiB9XG4gKlxuICogY29uc3QgYnJva2VyID0gbmV3IEV2ZW50QnJva2VyPFNhbXBsZUV2ZW50PigpO1xuICogYnJva2VyLnRyaWdnZXIoJ2hvZ2UnLCAxMDAsICd0ZXN0Jyk7ICAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiBicm9rZXIudHJpZ2dlcignaG9nZScsIDEwMCwgdHJ1ZSk7ICAgICAgIC8vIE5HLiBhcmd1bWVudCBvZiB0eXBlICd0cnVlJyBpcyBub3QgYXNzaWduYWJsZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdG8gcGFyYW1ldGVyIG9mIHR5cGUgJ3N0cmluZyB8IHVuZGVmaW5lZCcuXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFdmVudEJyb2tlcjxFdmVudCBleHRlbmRzIG9iamVjdD4gZXh0ZW5kcyBTdWJzY3JpYmFibGU8RXZlbnQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gTm90aWZ5IGV2ZW50IHRvIGNsaWVudHMuXG4gICAgICogQGphIGV2ZW50IOeZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGFyZ3VtZW50cyBmb3IgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsOOBq+a4oeOBmeW8leaVsFxuICAgICAqL1xuICAgIHRyaWdnZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsLCAuLi5hcmdzOiBBcmd1bWVudHM8UGFydGlhbDxFdmVudFtDaGFubmVsXT4+KTogdm9pZDtcbn1cblxuLyoqXG4gKiBAZW4gQ29uc3RydWN0b3Igb2Yge0BsaW5rIEV2ZW50QnJva2VyfVxuICogQGphIHtAbGluayBFdmVudEJyb2tlcn0g44Gu44Kz44Oz44K544OI44Op44Kv44K/5a6f5L2TXG4gKi9cbmV4cG9ydCBjb25zdCBFdmVudEJyb2tlcjoge1xuICAgIHJlYWRvbmx5IHByb3RvdHlwZTogRXZlbnRCcm9rZXI8YW55PjtcbiAgICBuZXcgPFQgZXh0ZW5kcyBvYmplY3Q+KCk6IEV2ZW50QnJva2VyPFQ+O1xufSA9IEV2ZW50UHVibGlzaGVyIGFzIGFueTtcblxuRXZlbnRCcm9rZXIucHJvdG90eXBlLnRyaWdnZXIgPSAoRXZlbnRQdWJsaXNoZXIucHJvdG90eXBlIGFzIGFueSkucHVibGlzaDtcbiIsImltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duRnVuY3Rpb24sXG4gICAgdHlwZSBBcmd1bWVudHMsXG4gICAgaXNBcnJheSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHtcbiAgICBTdWJzY3JpYmFibGUsXG4gICAgU3Vic2NyaXB0aW9uLFxuICAgIEV2ZW50U2NoZW1hLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9jb250ZXh0ID0gU3ltYm9sKCdjb250ZXh0Jyk7XG4vKiogQGludGVybmFsICovIHR5cGUgU3Vic2NyaXB0aW9uTWFwID0gTWFwPFVua25vd25GdW5jdGlvbiwgU3Vic2NyaXB0aW9uPjtcbi8qKiBAaW50ZXJuYWwgKi8gdHlwZSBMaXN0ZXJNYXAgICAgICAgPSBNYXA8c3RyaW5nLCBTdWJzY3JpcHRpb25NYXA+O1xuLyoqIEBpbnRlcm5hbCAqLyB0eXBlIFN1YnNjcmlwdGlvblNldCA9IFNldDxTdWJzY3JpcHRpb24+O1xuLyoqIEBpbnRlcm5hbCAqLyB0eXBlIFN1YnNjcmliYWJsZU1hcCA9IFdlYWtNYXA8U3Vic2NyaWJhYmxlLCBMaXN0ZXJNYXA+O1xuXG4vKiogQGludGVybmFsIExpc25lciDmoLzntI3lvaLlvI8gKi9cbmludGVyZmFjZSBDb250ZXh0IHtcbiAgICBtYXA6IFN1YnNjcmliYWJsZU1hcDtcbiAgICBzZXQ6IFN1YnNjcmlwdGlvblNldDtcbn1cblxuLyoqIEBpbnRlcm5hbCByZWdpc3RlciBsaXN0ZW5lciBjb250ZXh0ICovXG5mdW5jdGlvbiByZWdpc3Rlcihjb250ZXh0OiBDb250ZXh0LCB0YXJnZXQ6IFN1YnNjcmliYWJsZSwgY2hhbm5lbDogc3RyaW5nIHwgc3RyaW5nW10sIGxpc3RlbmVyOiBVbmtub3duRnVuY3Rpb24pOiBTdWJzY3JpcHRpb24ge1xuICAgIGNvbnN0IHN1YnNjcmlwdGlvbnM6IFN1YnNjcmlwdGlvbltdID0gW107XG5cbiAgICBjb25zdCBjaGFubmVscyA9IGlzQXJyYXkoY2hhbm5lbCkgPyBjaGFubmVsIDogW2NoYW5uZWxdO1xuICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgY29uc3QgcyA9IHRhcmdldC5vbihjaCwgbGlzdGVuZXIpO1xuICAgICAgICBjb250ZXh0LnNldC5hZGQocyk7XG4gICAgICAgIHN1YnNjcmlwdGlvbnMucHVzaChzKTtcblxuICAgICAgICBjb25zdCBsaXN0ZW5lck1hcCA9IGNvbnRleHQubWFwLmdldCh0YXJnZXQpID8/IG5ldyBNYXA8c3RyaW5nLCBNYXA8VW5rbm93bkZ1bmN0aW9uLCBTdWJzY3JpcHRpb24+PigpO1xuICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lck1hcC5nZXQoY2gpID8/IG5ldyBNYXA8VW5rbm93bkZ1bmN0aW9uLCBTdWJzY3JpcHRpb24+KCk7XG4gICAgICAgIG1hcC5zZXQobGlzdGVuZXIsIHMpO1xuXG4gICAgICAgIGlmICghbGlzdGVuZXJNYXAuaGFzKGNoKSkge1xuICAgICAgICAgICAgbGlzdGVuZXJNYXAuc2V0KGNoLCBtYXApO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY29udGV4dC5tYXAuaGFzKHRhcmdldCkpIHtcbiAgICAgICAgICAgIGNvbnRleHQubWFwLnNldCh0YXJnZXQsIGxpc3RlbmVyTWFwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBPYmplY3QuZnJlZXplKHtcbiAgICAgICAgZ2V0IGVuYWJsZSgpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBzdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKHMuZW5hYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgdW5zdWJzY3JpYmUoKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2Ygc3Vic2NyaXB0aW9ucykge1xuICAgICAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9KTtcbn1cblxuLyoqIEBpbnRlcm5hbCB1bnJlZ2lzdGVyIGxpc3RlbmVyIGNvbnRleHQgKi9cbmZ1bmN0aW9uIHVucmVnaXN0ZXIoY29udGV4dDogQ29udGV4dCwgdGFyZ2V0PzogU3Vic2NyaWJhYmxlLCBjaGFubmVsPzogc3RyaW5nIHwgc3RyaW5nW10sIGxpc3RlbmVyPzogVW5rbm93bkZ1bmN0aW9uKTogdm9pZCB7XG4gICAgaWYgKG51bGwgIT0gdGFyZ2V0KSB7XG4gICAgICAgIHRhcmdldC5vZmYoY2hhbm5lbCwgbGlzdGVuZXIpO1xuXG4gICAgICAgIGNvbnN0IGxpc3RlbmVyTWFwID0gY29udGV4dC5tYXAuZ2V0KHRhcmdldCk7XG4gICAgICAgIGlmICghbGlzdGVuZXJNYXApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAobnVsbCAhPSBjaGFubmVsKSB7XG4gICAgICAgICAgICBjb25zdCBjaGFubmVscyA9IGlzQXJyYXkoY2hhbm5lbCkgPyBjaGFubmVsIDogW2NoYW5uZWxdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVyTWFwLmdldChjaCk7XG4gICAgICAgICAgICAgICAgaWYgKCFtYXApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcyA9IG1hcC5nZXQobGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5zZXQuZGVsZXRlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG1hcC5kZWxldGUobGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBtYXAudmFsdWVzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuc2V0LmRlbGV0ZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbWFwIG9mIGxpc3RlbmVyTWFwLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIG1hcC52YWx1ZXMoKSkge1xuICAgICAgICAgICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQuc2V0LmRlbGV0ZShzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGNvbnN0IHMgb2YgY29udGV4dC5zZXQpIHtcbiAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0Lm1hcCA9IG5ldyBXZWFrTWFwKCk7XG4gICAgICAgIGNvbnRleHQuc2V0LmNsZWFyKCk7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIHRvIHdoaWNoIHRoZSBzYWZlIGV2ZW50IHJlZ2lzdGVyL3VucmVnaXN0ZXIgbWV0aG9kIGlzIG9mZmVyZWQgZm9yIHRoZSBvYmplY3Qgd2hpY2ggaXMgYSBzaG9ydCBsaWZlIGN5Y2xlIHRoYW4gc3Vic2NyaXB0aW9uIHRhcmdldC4gPGJyPlxuICogICAgIFRoZSBhZHZhbnRhZ2Ugb2YgdXNpbmcgdGhpcyBmb3JtLCBpbnN0ZWFkIG9mIGBvbigpYCwgaXMgdGhhdCBgbGlzdGVuVG8oKWAgYWxsb3dzIHRoZSBvYmplY3QgdG8ga2VlcCB0cmFjayBvZiB0aGUgZXZlbnRzLFxuICogICAgIGFuZCB0aGV5IGNhbiBiZSByZW1vdmVkIGFsbCBhdCBvbmNlIGxhdGVyIGNhbGwgYHN0b3BMaXN0ZW5pbmcoKWAuXG4gKiBAamEg6LO86Kqt5a++6LGh44KI44KK44KC44Op44Kk44OV44K144Kk44Kv44Or44GM55+t44GE44Kq44OW44K444Kn44Kv44OI44Gr5a++44GX44GmLCDlronlhajjgarjgqTjg5njg7Pjg4jnmbvpjLIv6Kej6Zmk44Oh44K944OD44OJ44KS5o+Q5L6b44GZ44KL44Kv44Op44K5IDxicj5cbiAqICAgICBgb24oKWAg44Gu5Luj44KP44KK44GrIGBsaXN0ZW5UbygpYCDjgpLkvb/nlKjjgZnjgovjgZPjgajjgacsIOW+jOOBqyBgc3RvcExpc3RlbmluZygpYCDjgpIx5bqm5ZG844G244Gg44GR44Gn44GZ44G544Gm44Gu44Oq44K544OK44O844KS6Kej6Zmk44Gn44GN44KL5Yip54K544GM44GC44KLLlxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgRXZlbnRSZWNlaXZlciwgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIC8vIGRlY2xhcmUgZXZlbnQgaW50ZXJmYWNlXG4gKiBpbnRlcmZhY2UgU2FtcGxlRXZlbnQge1xuICogICBob2dlOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqICAgZm9vOiBbdm9pZF07ICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3NcbiAqICAgaG9vOiB2b2lkOyAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3MgKHNhbWUgdGhlIHVwb24pXG4gKiAgIGJhcjogW0Vycm9yXTsgICAgICAgICAgICAgICAgICAvLyBhbnkgY2xhc3MgaXMgYXZhaWxhYmxlLlxuICogICBiYXo6IEVycm9yIHwgTnVtYmVyOyAgICAgICAgICAgLy8gaWYgb25seSBvbmUgYXJndW1lbnQsIGBbXWAgaXMgbm90IHJlcXVpcmVkLlxuICogfVxuICpcbiAqIC8vIGRlY2xhcmUgY2xpZW50IGNsYXNzXG4gKiBjbGFzcyBTYW1wbGVSZWNlaXZlciBleHRlbmRzIEV2ZW50UmVjZWl2ZXIge1xuICogICBjb25zdHJ1Y3Rvcihicm9rZXI6IEV2ZW50QnJva2VyPFNhbXBsZUV2ZW50Pikge1xuICogICAgIHN1cGVyKCk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsICdob2dlJywgKG51bTogbnVtYmVyLCBzdHI6IHN0cmluZykgPT4geyAuLi4gfSk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsICdiYXInLCAoZTogRXJyb3IpID0+IHsgLi4uIH0pO1xuICogICAgIHRoaXMubGlzdGVuVG8oYnJva2VyLCBbJ2ZvbycsICdob28nXSwgKCkgPT4geyAuLi4gfSk7XG4gKiAgIH1cbiAqXG4gKiAgIHJlbGVhc2UoKTogdm9pZCB7XG4gKiAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIG9yXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGJyb2tlciAgID0gbmV3IEV2ZW50QnJva2VyPFNhbXBsZUV2ZW50PigpO1xuICogY29uc3QgcmVjZWl2ZXIgPSBuZXcgRXZlbnRSZWNlaXZlcigpO1xuICpcbiAqIHJlY2VpdmVyLmxpc3RlblRvKGJyb2tlciwgJ2hvZ2UnLCAobnVtOiBudW1iZXIsIHN0cjogc3RyaW5nKSA9PiB7IC4uLiB9KTtcbiAqIHJlY2VpdmVyLmxpc3RlblRvKGJyb2tlciwgJ2JhcicsIChlOiBFcnJvcikgPT4geyAuLi4gfSk7XG4gKiByZWNlaXZlci5saXN0ZW5Ubyhicm9rZXIsIFsnZm9vJywgJ2hvbyddLCAoKSA9PiB7IC4uLiB9KTtcbiAqXG4gKiByZWNlaXZlci5zdG9wTGlzdGVuaW5nKCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIEV2ZW50UmVjZWl2ZXIge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfY29udGV4dF06IENvbnRleHQ7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpc1tfY29udGV4dF0gPSB7IG1hcDogbmV3IFdlYWtNYXAoKSwgc2V0OiBuZXcgU2V0KCkgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGVsbCBhbiBvYmplY3QgdG8gbGlzdGVuIHRvIGEgcGFydGljdWxhciBldmVudCBvbiBhbiBvdGhlciBvYmplY3QuXG4gICAgICogQGphIOWvvuixoeOCquODluOCuOOCp+OCr+ODiOOBruOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHRhcmdldFxuICAgICAqICAtIGBlbmAgZXZlbnQgbGlzdGVuaW5nIHRhcmdldCBvYmplY3QuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jos7zoqq3lr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIGxpc3RlblRvPFQgZXh0ZW5kcyBTdWJzY3JpYmFibGUsIEV2ZW50IGV4dGVuZHMgRXZlbnRTY2hlbWE8VD4gPSBFdmVudFNjaGVtYTxUPiwgQ2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50ID0ga2V5b2YgRXZlbnQ+KFxuICAgICAgICB0YXJnZXQ6IFQsXG4gICAgICAgIGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sXG4gICAgICAgIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93blxuICAgICk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiByZWdpc3Rlcih0aGlzW19jb250ZXh0XSwgdGFyZ2V0LCBjaGFubmVsIGFzIHN0cmluZywgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdXN0IGxpa2UgbGlzdGVuVG8sIGJ1dCBjYXVzZXMgdGhlIGJvdW5kIGNhbGxiYWNrIHRvIGZpcmUgb25seSBvbmNlIGJlZm9yZSBiZWluZyByZW1vdmVkLlxuICAgICAqIEBqYSDlr77osaHjgqrjg5bjgrjjgqfjgq/jg4jjga7kuIDluqbjgaDjgZHjg4/jg7Pjg4njg6rjg7PjgrDlj6/og73jgarjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXRcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGxpc3RlbmluZyB0YXJnZXQgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI6LO86Kqt5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBsaXN0ZW5Ub09uY2U8VCBleHRlbmRzIFN1YnNjcmliYWJsZSwgRXZlbnQgZXh0ZW5kcyBFdmVudFNjaGVtYTxUPiA9IEV2ZW50U2NoZW1hPFQ+LCBDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQgPSBrZXlvZiBFdmVudD4oXG4gICAgICAgIHRhcmdldDogVCxcbiAgICAgICAgY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSxcbiAgICAgICAgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duXG4gICAgKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHJlZ2lzdGVyKHRoaXNbX2NvbnRleHRdLCB0YXJnZXQsIGNoYW5uZWwgYXMgc3RyaW5nLCBsaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IG1hbmFnZWQgPSB0YXJnZXQub24oY2hhbm5lbCwgKCkgPT4ge1xuICAgICAgICAgICAgdW5yZWdpc3Rlcih0aGlzW19jb250ZXh0XSwgdGFyZ2V0LCBjaGFubmVsIGFzIHN0cmluZywgbGlzdGVuZXIpO1xuICAgICAgICAgICAgbWFuYWdlZC51bnN1YnNjcmliZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRlbGwgYW4gb2JqZWN0IHRvIHN0b3AgbGlzdGVuaW5nIHRvIGV2ZW50cy5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0XG4gICAgICogIC0gYGVuYCBldmVudCBsaXN0ZW5pbmcgdGFyZ2V0IG9iamVjdC5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOizvOiqreWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm44Gu44Oq44K544OK44O844KS6Kej6ZmkXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZCBsaXN0ZW5lcnMgZnJvbSBgdGFyZ2V0YC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5a++6LGhIGB0YXJnZXRgIOOBruODquOCueODiuODvOOCkuOBmeOBueOBpuino+mZpFxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WQjOS4gCBgY2hhbm5lbGAg44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgcHVibGljIHN0b3BMaXN0ZW5pbmc8VCBleHRlbmRzIFN1YnNjcmliYWJsZSwgRXZlbnQgZXh0ZW5kcyBFdmVudFNjaGVtYTxUPiA9IEV2ZW50U2NoZW1hPFQ+LCBDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQgPSBrZXlvZiBFdmVudD4oXG4gICAgICAgIHRhcmdldD86IFQsXG4gICAgICAgIGNoYW5uZWw/OiBDaGFubmVsIHwgQ2hhbm5lbFtdLFxuICAgICAgICBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duXG4gICAgKTogdGhpcyB7XG4gICAgICAgIHVucmVnaXN0ZXIodGhpc1tfY29udGV4dF0sIHRhcmdldCwgY2hhbm5lbCBhcyBzdHJpbmcsIGxpc3RlbmVyKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7IG1peGlucyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudEJyb2tlciB9IGZyb20gJy4vYnJva2VyJztcbmltcG9ydCB7IEV2ZW50UmVjZWl2ZXIgfSBmcm9tICcuL3JlY2VpdmVyJztcblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIHdoaWNoIGhhdmUgSS9GIG9mIHtAbGluayBFdmVudEJyb2tlcn0gYW5kIHtAbGluayBFdmVudFJlY2VpdmVyfS4gPGJyPlxuICogICAgIGBFdmVudHNgIGNsYXNzIG9mIGBCYWNrYm9uZS5qc2AgZXF1aXZhbGVuY2UuXG4gKiBAamEge0BsaW5rIEV2ZW50QnJva2VyfSDjgagge0BsaW5rIEV2ZW50UmVjZWl2ZXJ9IOOBriBJL0Yg44KS44GC44KP44Gb5oyB44Gk44Kv44Op44K5IDxicj5cbiAqICAgICBgQmFja2JvbmUuanNgIOOBriBgRXZlbnRzYCDjgq/jg6njgrnnm7jlvZNcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEV2ZW50U291cmNlIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiAvLyBkZWNsYXJlIGV2ZW50IGludGVyZmFjZVxuICogaW50ZXJmYWNlIFRhcmdldEV2ZW50IHtcbiAqICAgaG9nZTogW251bWJlciwgc3RyaW5nXTsgICAgICAgIC8vIGNhbGxiYWNrIGZ1bmN0aW9uJ3MgYXJncyB0eXBlIHR1cGxlXG4gKiAgIGZvbzogW3ZvaWRdOyAgICAgICAgICAgICAgICAgICAvLyBubyBhcmdzXG4gKiAgIGhvbzogdm9pZDsgICAgICAgICAgICAgICAgICAgICAvLyBubyBhcmdzIChzYW1lIHRoZSB1cG9uKVxuICogICBiYXI6IFtFcnJvcl07ICAgICAgICAgICAgICAgICAgLy8gYW55IGNsYXNzIGlzIGF2YWlsYWJsZS5cbiAqICAgYmF6OiBFcnJvciB8IE51bWJlcjsgICAgICAgICAgIC8vIGlmIG9ubHkgb25lIGFyZ3VtZW50LCBgW11gIGlzIG5vdCByZXF1aXJlZC5cbiAqIH1cbiAqXG4gKiBpbnRlcmZhY2UgU2FtcGxlRXZlbnQge1xuICogICBmdWdhOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqIH1cbiAqXG4gKiAvLyBkZWNsYXJlIGNsaWVudCBjbGFzc1xuICogY2xhc3MgU2FtcGxlU291cmNlIGV4dGVuZHMgRXZlbnRTb3VyY2U8U2FtcGxlRXZlbnQ+IHtcbiAqICAgY29uc3RydWN0b3IodGFyZ2V0OiBFdmVudFNvdXJjZTxUYXJnZXRFdmVudD4pIHtcbiAqICAgICBzdXBlcigpO1xuICogICAgIHRoaXMubGlzdGVuVG8oYnJva2VyLCAnaG9nZScsIChudW06IG51bWJlciwgc3RyOiBzdHJpbmcpID0+IHsgLi4uIH0pO1xuICogICAgIHRoaXMubGlzdGVuVG8oYnJva2VyLCAnYmFyJywgKGU6IEVycm9yKSA9PiB7IC4uLiB9KTtcbiAqICAgICB0aGlzLmxpc3RlblRvKGJyb2tlciwgWydmb28nLCAnaG9vJ10sICgpID0+IHsgLi4uIH0pO1xuICogICB9XG4gKlxuICogICByZWxlYXNlKCk6IHZvaWQge1xuICogICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICogICB9XG4gKiB9XG4gKlxuICogY29uc3Qgc2FtcGxlID0gbmV3IFNhbXBsZVNvdXJjZSgpO1xuICpcbiAqIHNhbXBsZS5vbignZnVnYScsIChhOiBudW1iZXIsIGI6IHN0cmluZykgPT4geyAuLi4gfSk7ICAgIC8vIE9LLiBzdGFuZGFyZCB1c2FnZS5cbiAqIHNhbXBsZS50cmlnZ2VyKCdmdWdhJywgMTAwLCAndGVzdCcpOyAgICAgICAgICAgICAgICAgICAgIC8vIE9LLiBzdGFuZGFyZCB1c2FnZS5cbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBfRXZlbnRTb3VyY2U8VCBleHRlbmRzIG9iamVjdD4gPSBFdmVudEJyb2tlcjxUPiAmIEV2ZW50UmVjZWl2ZXI7XG5cbi8qKiBAaW50ZXJuYWwge0BsaW5rIEV2ZW50U291cmNlfSBjbGFzcyAqL1xuY2xhc3MgRXZlbnRTb3VyY2UgZXh0ZW5kcyBtaXhpbnMoRXZlbnRCcm9rZXIsIEV2ZW50UmVjZWl2ZXIpIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5zdXBlcihFdmVudFJlY2VpdmVyKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnN0cnVjdG9yIG9mIHtAbGluayBFdmVudFNvdXJjZX1cbiAqIEBqYSB7QGxpbmsgRXZlbnRTb3VyY2V9IOOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wun+S9k1xuICovXG5jb25zdCBfRXZlbnRTb3VyY2U6IHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IF9FdmVudFNvdXJjZTxhbnk+O1xuICAgIG5ldyA8VCBleHRlbmRzIG9iamVjdD4oKTogX0V2ZW50U291cmNlPFQ+O1xufSA9IEV2ZW50U291cmNlIGFzIGFueTtcblxuZXhwb3J0IHsgX0V2ZW50U291cmNlIGFzIEV2ZW50U291cmNlIH07XG4iLCJpbXBvcnQgdHlwZSB7IEV2ZW50QnJva2VyLCBTdWJzY3JpcHRpb24gfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IF9jYW5jZWwgPSBTeW1ib2woJ2NhbmNlbCcpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgX2Nsb3NlICA9IFN5bWJvbCgnY2xvc2UnKTtcblxuLyoqXG4gKiBAZW4gQ2FuY2VsVG9rZW4gc3RhdGUgZGVmaW5pdGlvbnMuXG4gKiBAamEgQ2FuY2VsVG9rZW4g44Gu54q25oWL5a6a576pXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIENhbmNlbFRva2VuU3RhdGUge1xuICAgIC8qKiDjgq3jg6Pjg7Pjgrvjg6vlj5fku5jlj6/og70gKi9cbiAgICBPUEVOICAgICAgICA9IDB4MCxcbiAgICAvKiog44Kt44Oj44Oz44K744Or5Y+X5LuY5riI44G/ICovXG4gICAgUkVRVUVTVEVEICAgPSAweDEsXG4gICAgLyoqIOOCreODo+ODs+OCu+ODq+WPl+S7mOS4jeWPryAqL1xuICAgIENMT1NFRCAgICAgID0gMHgyLFxufVxuXG4vKipcbiAqIEBlbiBDYW5jZWwgZXZlbnQgZGVmaW5pdGlvbnMuXG4gKiBAamEg44Kt44Oj44Oz44K744Or44Kk44OZ44Oz44OI5a6a576pXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuY2VsRXZlbnQ8VD4ge1xuICAgIGNhbmNlbDogW1RdO1xufVxuXG4vKipcbiAqIEBlbiBJbnRlcm5hbCBDYW5jZWxUb2tlbiBpbnRlcmZhY2UuXG4gKiBAamEgQ2FuY2VsVG9rZW4g44Gu5YaF6YOo44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuY2VsVG9rZW5Db250ZXh0PFQgPSB1bmtub3duPiB7XG4gICAgcmVhZG9ubHkgYnJva2VyOiBFdmVudEJyb2tlcjxDYW5jZWxFdmVudDxUPj47XG4gICAgcmVhZG9ubHkgc3Vic2NyaXB0aW9uczogU2V0PFN1YnNjcmlwdGlvbj47XG4gICAgcmVhc29uOiBUIHwgdW5kZWZpbmVkO1xuICAgIHN0YXR1czogQ2FuY2VsVG9rZW5TdGF0ZTtcbn1cblxuLyoqXG4gKiBAZW4gSW52YWxpZCBzdWJzY3JpcHRpb24gb2JqZWN0IGRlY2xhcmF0aW9uLlxuICogQGphIOeEoeWKueOBqiBTdWJzY3JpcHRpb24g44Kq44OW44K444Kn44Kv44OIXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBjb25zdCBpbnZhbGlkU3Vic2NyaXB0aW9uID0gT2JqZWN0LmZyZWV6ZSh7XG4gICAgZW5hYmxlOiBmYWxzZSxcbiAgICB1bnN1YnNjcmliZSgpIHsgLyogbm9vcCAqLyB9XG59KSBhcyBTdWJzY3JpcHRpb247XG4iLCJpbXBvcnQgeyB2ZXJpZnkgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRCcm9rZXIsIHR5cGUgU3Vic2NyaXB0aW9uIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIENhbmNlbFRva2VuQ29udGV4dCxcbiAgICBfY2FuY2VsLFxuICAgIF9jbG9zZSxcbiAgICBDYW5jZWxUb2tlblN0YXRlLFxuICAgIGludmFsaWRTdWJzY3JpcHRpb24sXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKipcbiAqIEBlbiBDYW5jZWxsYXRpb24gc291cmNlIGludGVyZmFjZS5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vnrqHnkIbjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5jZWxUb2tlblNvdXJjZTxUID0gdW5rbm93bj4ge1xuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgQ2FuY2VsVG9rZW59IGdldHRlci5cbiAgICAgKiBAamEge0BsaW5rIENhbmNlbFRva2VufSDlj5blvpdcbiAgICAgKi9cbiAgICByZWFkb25seSB0b2tlbjogQ2FuY2VsVG9rZW48VD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBjYW5jZWwuXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+Wun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIHJlYXNvblxuICAgICAqICAtIGBlbmAgY2FuY2VsbGF0aW9uIHJlYXNvbi4gdGhpcyBhcmcgaXMgdHJhbnNtaXR0ZWQgaW4gcHJvbWlzZSBjaGFpbi5cbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODq+OBrueQhueUseOCkuaMh+Wumi4gYFByb21pc2VgIOODgeOCp+OCpOODs+OBq+S8nemBlOOBleOCjOOCiy5cbiAgICAgKi9cbiAgICBjYW5jZWwocmVhc29uOiBUKTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBCcmVhayB1cCBjYW5jZWxsYXRpb24gcmVjZXB0aW9uLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vlj5fku5jjgpLntYLkuoZcbiAgICAgKi9cbiAgICBjbG9zZSgpOiB2b2lkO1xufVxuXG4vKiogQGludGVybmFsICovIGNvbnN0IF90b2tlbnMgPSBuZXcgV2Vha01hcDxDYW5jZWxUb2tlbiwgQ2FuY2VsVG9rZW5Db250ZXh0PigpO1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBnZXRDb250ZXh0PFQgPSB1bmtub3duPihpbnN0YW5jZTogQ2FuY2VsVG9rZW48VD4pOiBDYW5jZWxUb2tlbkNvbnRleHQ8VD4ge1xuICAgIGlmICghX3Rva2Vucy5oYXMoaW5zdGFuY2UpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBvYmplY3QgaXMgbm90IGEgdmFsaWQgQ2FuY2VsVG9rZW4uJyk7XG4gICAgfVxuICAgIHJldHVybiBfdG9rZW5zLmdldChpbnN0YW5jZSkgYXMgQ2FuY2VsVG9rZW5Db250ZXh0PFQ+O1xufVxuXG4vKipcbiAqIEBlbiBUaGUgdG9rZW4gb2JqZWN0IHRvIHdoaWNoIHVuaWZpY2F0aW9uIHByb2Nlc3NpbmcgZm9yIGFzeW5jaHJvbm91cyBwcm9jZXNzaW5nIGNhbmNlbGxhdGlvbiBpcyBvZmZlcmVkLiA8YnI+XG4gKiAgICAgT3JpZ2luIGlzIGBDYW5jZWxsYXRpb25Ub2tlbmAgb2YgYC5ORVQgRnJhbWV3b3JrYC5cbiAqIEBqYSDpnZ7lkIzmnJ/lh6bnkIbjgq3jg6Pjg7Pjgrvjg6vjga7jgZ/jgoHjga7ntbHkuIDlh6bnkIbjgpLmj5DkvpvjgZnjgovjg4jjg7zjgq/jg7Pjgqrjg5bjgrjjgqfjgq/jg4ggPGJyPlxuICogICAgIOOCquODquOCuOODiuODq+OBryBgLk5FVCBGcmFtZXdvcmtgIOOBriBgQ2FuY2VsbGF0aW9uVG9rZW5gXG4gKlxuICogQHNlZSBodHRwczovL2RvY3MubWljcm9zb2Z0LmNvbS9lbi11cy9kb3RuZXQvc3RhbmRhcmQvdGhyZWFkaW5nL2NhbmNlbGxhdGlvbi1pbi1tYW5hZ2VkLXRocmVhZHNcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqIGBgYFxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgdG9rZW4gPSBuZXcgQ2FuY2VsVG9rZW4oKGNhbmNlbCwgY2xvc2UpID0+IHtcbiAqICAgYnV0dG9uMS5vbmNsaWNrID0gZXYgPT4gY2FuY2VsKG5ldyBFcnJvcignQ2FuY2VsJykpO1xuICogICBidXR0b24yLm9uY2xpY2sgPSBldiA9PiBjbG9zZSgpO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBvclxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB7IGNhbmNlbCwgY2xvc2UsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTtcbiAqIGJ1dHRvbjEub25jbGljayA9IGV2ID0+IGNhbmNlbChuZXcgRXJyb3IoJ0NhbmNlbCcpKTtcbiAqIGJ1dHRvbjIub25jbGljayA9IGV2ID0+IGNsb3NlKCk7XG4gKiBgYGBcbiAqXG4gKiAtIFVzZSB3aXRoIFByb21pc2VcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgeyBjYW5jZWwsIGNsb3NlLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7XG4gKiBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKG9rLCBuZykgPT4geyAuLi4gfSwgdG9rZW4pO1xuICogcHJvbWlzZVxuICogICAudGhlbiguLi4pXG4gKiAgIC50aGVuKC4uLilcbiAqICAgLnRoZW4oLi4uKVxuICogICAuY2F0Y2gocmVhc29uID0+IHtcbiAqICAgICAvLyBjaGVjayByZWFzb25cbiAqICAgfSk7XG4gKiBgYGBcbiAqXG4gKiAtIFJlZ2lzdGVyICYgVW5yZWdpc3RlciBjYWxsYmFjayhzKVxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB7IGNhbmNlbCwgY2xvc2UsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTtcbiAqIGNvbnN0IHN1YnNjcmlwdGlvbiA9IHRva2VuLnJlZ2lzdGVyKHJlYXNvbiA9PiB7XG4gKiAgIGNvbnNvbGUubG9nKHJlYXNvbi5tZXNzYWdlKTtcbiAqIH0pO1xuICogaWYgKHNvbWVDYXNlKSB7XG4gKiAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBDYW5jZWxUb2tlbjxUID0gdW5rbm93bj4ge1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSB7QGxpbmsgQ2FuY2VsVG9rZW5Tb3VyY2V9IGluc3RhbmNlLlxuICAgICAqIEBqYSB7QGxpbmsgQ2FuY2VsVG9rZW5Tb3VyY2V9IOOCpOODs+OCueOCv+ODs+OCueOBruWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIGxpbmtlZFRva2Vuc1xuICAgICAqICAtIGBlbmAgcmVsYXRpbmcgYWxyZWFkeSBtYWRlIHtAbGluayBDYW5jZWxUb2tlbn0gaW5zdGFuY2UuXG4gICAgICogICAgICAgIFlvdSBjYW4gYXR0YWNoIHRvIHRoZSB0b2tlbiB0aGF0IHRvIGJlIGEgY2FuY2VsbGF0aW9uIHRhcmdldC5cbiAgICAgKiAgLSBgamFgIOOBmeOBp+OBq+S9nOaIkOOBleOCjOOBnyB7QGxpbmsgQ2FuY2VsVG9rZW59IOmWoumAo+S7mOOBkeOCi+WgtOWQiOOBq+aMh+WumlxuICAgICAqICAgICAgICDmuKHjgZXjgozjgZ8gdG9rZW4g44Gv44Kt44Oj44Oz44K744Or5a++6LGh44Go44GX44Gm57SQ44Gl44GR44KJ44KM44KLXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBzb3VyY2U8VCA9IHVua25vd24+KC4uLmxpbmtlZFRva2VuczogQ2FuY2VsVG9rZW5bXSk6IENhbmNlbFRva2VuU291cmNlPFQ+IHtcbiAgICAgICAgbGV0IGNhbmNlbCE6IChyZWFzb246IFQpID0+IHZvaWQ7XG4gICAgICAgIGxldCBjbG9zZSE6ICgpID0+IHZvaWQ7XG4gICAgICAgIGNvbnN0IHRva2VuID0gbmV3IENhbmNlbFRva2VuPFQ+KChvbkNhbmNlbCwgb25DbG9zZSkgPT4ge1xuICAgICAgICAgICAgY2FuY2VsID0gb25DYW5jZWw7XG4gICAgICAgICAgICBjbG9zZSA9IG9uQ2xvc2U7XG4gICAgICAgIH0sIC4uLmxpbmtlZFRva2Vucyk7XG4gICAgICAgIHJldHVybiBPYmplY3QuZnJlZXplKHsgdG9rZW4sIGNhbmNlbCwgY2xvc2UgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBleGVjdXRvclxuICAgICAqICAtIGBlbmAgZXhlY3V0ZXIgdGhhdCBoYXMgYGNhbmNlbGAgYW5kIGBjbG9zZWAgY2FsbGJhY2suXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6sv44Kv44Ot44O844K6IOWun+ihjOOCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBsaW5rZWRUb2tlbnNcbiAgICAgKiAgLSBgZW5gIHJlbGF0aW5nIGFscmVhZHkgbWFkZSB7QGxpbmsgQ2FuY2VsVG9rZW59IGluc3RhbmNlLlxuICAgICAqICAgICAgICBZb3UgY2FuIGF0dGFjaCB0byB0aGUgdG9rZW4gdGhhdCB0byBiZSBhIGNhbmNlbGxhdGlvbiB0YXJnZXQuXG4gICAgICogIC0gYGphYCDjgZnjgafjgavkvZzmiJDjgZXjgozjgZ8ge0BsaW5rIENhbmNlbFRva2VufSDplqLpgKPku5jjgZHjgovloLTlkIjjgavmjIflrppcbiAgICAgKiAgICAgICAg5rih44GV44KM44GfIHRva2VuIOOBr+OCreODo+ODs+OCu+ODq+WvvuixoeOBqOOBl+OBpue0kOOBpeOBkeOCieOCjOOCi1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBleGVjdXRvcjogKGNhbmNlbDogKHJlYXNvbjogVCkgPT4gdm9pZCwgY2xvc2U6ICgpID0+IHZvaWQpID0+IHZvaWQsXG4gICAgICAgIC4uLmxpbmtlZFRva2VuczogQ2FuY2VsVG9rZW5bXVxuICAgICkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBDYW5jZWxUb2tlbiwgdGhpcyk7XG4gICAgICAgIHZlcmlmeSgndHlwZU9mJywgJ2Z1bmN0aW9uJywgZXhlY3V0b3IpO1xuXG4gICAgICAgIGNvbnN0IGxpbmtlZFRva2VuU2V0ID0gbmV3IFNldChsaW5rZWRUb2tlbnMuZmlsdGVyKHQgPT4gX3Rva2Vucy5oYXModCkpKTtcbiAgICAgICAgbGV0IHN0YXR1cyA9IENhbmNlbFRva2VuU3RhdGUuT1BFTjtcbiAgICAgICAgZm9yIChjb25zdCB0IG9mIGxpbmtlZFRva2VuU2V0KSB7XG4gICAgICAgICAgICBzdGF0dXMgfD0gZ2V0Q29udGV4dCh0KS5zdGF0dXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb250ZXh0OiBDYW5jZWxUb2tlbkNvbnRleHQ8VD4gPSB7XG4gICAgICAgICAgICBicm9rZXI6IG5ldyBFdmVudEJyb2tlcigpLFxuICAgICAgICAgICAgc3Vic2NyaXB0aW9uczogbmV3IFNldCgpLFxuICAgICAgICAgICAgcmVhc29uOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBzdGF0dXMsXG4gICAgICAgIH07XG4gICAgICAgIF90b2tlbnMuc2V0KHRoaXMsIE9iamVjdC5zZWFsKGNvbnRleHQpKTtcblxuICAgICAgICBjb25zdCBjYW5jZWwgPSB0aGlzW19jYW5jZWxdO1xuICAgICAgICBjb25zdCBjbG9zZSA9IHRoaXNbX2Nsb3NlXTtcbiAgICAgICAgaWYgKHN0YXR1cyA9PT0gQ2FuY2VsVG9rZW5TdGF0ZS5PUEVOKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHQgb2YgbGlua2VkVG9rZW5TZXQpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0LnN1YnNjcmlwdGlvbnMuYWRkKHQucmVnaXN0ZXIoY2FuY2VsLmJpbmQodGhpcykpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZ2lzdGVyKGNhbmNlbC5iaW5kKHQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4ZWN1dG9yKGNhbmNlbC5iaW5kKHRoaXMpLCBjbG9zZS5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FuY2VsbGF0aW9uIHJlYXNvbiBhY2Nlc3Nvci5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or44Gu5Y6f5Zug5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHJlYXNvbigpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIGdldENvbnRleHQodGhpcykucmVhc29uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFbmFibGUgY2FuY2VsbGF0aW9uIHN0YXRlIGFjY2Vzc29yLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vlj6/og73jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgY2FuY2VsYWJsZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIGdldENvbnRleHQodGhpcykuc3RhdHVzID09PSBDYW5jZWxUb2tlblN0YXRlLk9QRU47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbmNlbGxhdGlvbiByZXF1ZXN0ZWQgc3RhdGUgYWNjZXNzb3IuXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+OCkuWPl+OBkeS7mOOBkeOBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCByZXF1ZXN0ZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIShnZXRDb250ZXh0KHRoaXMpLnN0YXR1cyAmIENhbmNlbFRva2VuU3RhdGUuUkVRVUVTVEVEKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FuY2VsbGF0aW9uIGNsb3NlZCBzdGF0ZSBhY2Nlc3Nvci5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5Y+X5LuY44KS57WC5LqG44GX44Gm44GE44KL44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGNsb3NlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhKGdldENvbnRleHQodGhpcykuc3RhdHVzICYgQ2FuY2VsVG9rZW5TdGF0ZS5DTE9TRUQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBgdG9TdHJpbmdgIHRhZyBvdmVycmlkZS5cbiAgICAgKiBAamEgYHRvU3RyaW5nYCDjgr/jgrDjga7jgqrjg7zjg5Djg7zjg6njgqTjg4lcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6ICdDYW5jZWxUb2tlbicgeyByZXR1cm4gJ0NhbmNlbFRva2VuJzsgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIGN1c3RvbSBjYW5jZWxsYXRpb24gY2FsbGJhY2suXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+aZguOBruOCq+OCueOCv+ODoOWHpueQhuOBrueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIG9uQ2FuY2VsXG4gICAgICogIC0gYGVuYCBjYW5jZWwgb3BlcmF0aW9uIGNhbGxiYWNrXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6vjgrPjg7zjg6vjg5Djg4Pjgq9cbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYFN1YnNjcmlwdGlvbmAgaW5zdGFuY2UuXG4gICAgICogICAgICAgIFlvdSBjYW4gcmV2b2tlIGNhbmNlbGxhdGlvbiB0byBjYWxsIGB1bnN1YnNjcmliZWAgbWV0aG9kLlxuICAgICAqICAtIGBqYWAgYFN1YnNjcmlwdGlvbmAg44Kk44Oz44K544K/44Oz44K5XG4gICAgICogICAgICAgIGB1bnN1YnNjcmliZWAg44Oh44K944OD44OJ44KS5ZG844G244GT44Go44Gn44Kt44Oj44Oz44K744Or44KS54Sh5Yq544Gr44GZ44KL44GT44Go44GM5Y+v6IO9XG4gICAgICovXG4gICAgcHVibGljIHJlZ2lzdGVyKG9uQ2FuY2VsOiAocmVhc29uOiBUKSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGdldENvbnRleHQodGhpcyk7XG4gICAgICAgIGlmICghdGhpcy5jYW5jZWxhYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4gaW52YWxpZFN1YnNjcmlwdGlvbjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29udGV4dC5icm9rZXIub24oJ2NhbmNlbCcsIG9uQ2FuY2VsKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX2NhbmNlbF0ocmVhc29uOiBUKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBnZXRDb250ZXh0KHRoaXMpO1xuICAgICAgICB2ZXJpZnkoJ25vdE51bGxpc2gnLCByZWFzb24pO1xuICAgICAgICBpZiAoIXRoaXMuY2FuY2VsYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQucmVhc29uID0gcmVhc29uO1xuICAgICAgICBjb250ZXh0LnN0YXR1cyB8PSBDYW5jZWxUb2tlblN0YXRlLlJFUVVFU1RFRDtcbiAgICAgICAgZm9yIChjb25zdCBzIG9mIGNvbnRleHQuc3Vic2NyaXB0aW9ucykge1xuICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQuYnJva2VyLnRyaWdnZXIoJ2NhbmNlbCcsIHJlYXNvbik7XG4gICAgICAgIHZvaWQgUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB0aGlzW19jbG9zZV0oKSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19jbG9zZV0oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBnZXRDb250ZXh0KHRoaXMpO1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0LnN0YXR1cyB8PSBDYW5jZWxUb2tlblN0YXRlLkNMT1NFRDtcbiAgICAgICAgZm9yIChjb25zdCBzIG9mIGNvbnRleHQuc3Vic2NyaXB0aW9ucykge1xuICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQuc3Vic2NyaXB0aW9ucy5jbGVhcigpO1xuICAgICAgICBjb250ZXh0LmJyb2tlci5vZmYoKTtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIG5vLWdsb2JhbC1hc3NpZ24sXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kLFxuICovXG5cbmltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICB2ZXJpZnksXG4gICAgZ2V0Q29uZmlnLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHR5cGUgeyBTdWJzY3JpcHRpb24gfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBDYW5jZWxUb2tlbiB9IGZyb20gJy4vY2FuY2VsLXRva2VuJztcblxuZGVjbGFyZSBnbG9iYWwge1xuXG4gICAgaW50ZXJmYWNlIFByb21pc2VDb25zdHJ1Y3RvciB7XG4gICAgICAgIG5ldyA8VD4oZXhlY3V0b3I6IChyZXNvbHZlOiAodmFsdWU/OiBUIHwgUHJvbWlzZUxpa2U8VD4pID0+IHZvaWQsIHJlamVjdDogKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQpID0+IHZvaWQsIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsKTogUHJvbWlzZTxUPjtcbiAgICAgICAgcmVzb2x2ZTxUPih2YWx1ZT86IFQgfCBQcm9taXNlTGlrZTxUPiwgY2FuY2VsVG9rZW4/OiBDYW5jZWxUb2tlbiB8IG51bGwpOiBQcm9taXNlPFQ+O1xuICAgIH1cblxufVxuXG4vKipcbiAqIEBlbiBgTmF0aXZlIFByb21pc2VgIGNvbnN0cnVjdG9yIDxicj5cbiAqICAgICBDYW4gYmUgdXNlZCBhcyBhbiBhbGlhcyBmb3IgYE5hdGl2ZSBQcm9taXNlYC5cbiAqIEBqYSBgTmF0aXZlIFByb21pc2VgIOOCs+ODs+OCueODiOODqeOCr+OCvyA8YnI+XG4gKiAgICAgYE5hdGl2ZSBQcm9taXNlYCDjga7jgqjjgqTjg6rjgqLjgrnjgajjgZfjgabkvb/nlKjlj6/og71cbiAqL1xuY29uc3QgTmF0aXZlUHJvbWlzZSA9IFByb21pc2U7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgbmF0aXZlVGhlbiA9IE5hdGl2ZVByb21pc2UucHJvdG90eXBlLnRoZW47XG4vKiogQGludGVybmFsICovIGNvbnN0IF9jcmVhdGUgPSBTeW1ib2woJ2NyZWF0ZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfdG9rZW5zID0gbmV3IFdlYWtNYXA8UHJvbWlzZTx1bmtub3duPiwgQ2FuY2VsVG9rZW4+KCk7XG5cbi8qKlxuICogQGVuIEV4dGVuZGVkIGBQcm9taXNlYCBjbGFzcyB3aGljaCBlbmFibGVkIGNhbmNlbGxhdGlvbi4gPGJyPlxuICogICAgIGBOYXRpdmUgUHJvbWlzZWAgY29uc3RydWN0b3IgaXMgb3ZlcnJpZGRlbiBieSBmcmFtZXdvcmsgZGVmYXVsdCBiZWhhdmlvdXIuXG4gKiBAamEg44Kt44Oj44Oz44K744Or44KS5Y+v6IO944Gr44GX44GfIGBQcm9taXNlYCDmi6HlvLXjgq/jg6njgrkgPGJyPlxuICogICAgIOaXouWumuOBpyBgTmF0aXZlIFByb21pc2VgIOOCkuOCquODvOODkOODvOODqeOCpOODieOBmeOCiy5cbiAqL1xuY2xhc3MgQ2FuY2VsYWJsZVByb21pc2U8VD4gZXh0ZW5kcyBQcm9taXNlPFQ+IHtcblxuICAgIC8qKlxuICAgICAqIEBlbiBPdmVycmlkaW5nIG9mIHRoZSBkZWZhdWx0IGNvbnN0cnVjdG9yIHVzZWQgZm9yIGdlbmVyYXRpb24gb2YgYW4gb2JqZWN0LlxuICAgICAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7nlJ/miJDjgavkvb/jgo/jgozjgovjg4fjg5Xjgqnjg6vjg4jjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7jgqrjg7zjg5Djg7zjg6njgqTjg4lcbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXQgW1N5bWJvbC5zcGVjaWVzXSgpOiBQcm9taXNlQ29uc3RydWN0b3IgeyByZXR1cm4gTmF0aXZlUHJvbWlzZTsgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZXMgYSBuZXcgcmVzb2x2ZWQgcHJvbWlzZSBmb3IgdGhlIHByb3ZpZGVkIHZhbHVlLlxuICAgICAqIEBqYSDmlrDopo/jgavop6PmsbrmuIjjgb8gcHJvbWlzZSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJBcbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB0aGUgdmFsdWUgdHJhbnNtaXR0ZWQgaW4gcHJvbWlzZSBjaGFpbi5cbiAgICAgKiAgLSBgamFgIGBQcm9taXNlYCDjgavkvJ3pgZTjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gY2FuY2VsVG9rZW5cbiAgICAgKiAgLSBgZW5gIHtAbGluayBDYW5jZWxUb2tlbn0gaW5zdGFuY2UgY3JlYXRlIGZyb20ge0BsaW5rIENhbmNlbFRva2VuLnNvdXJjZSB8IENhbmNlbFRva2VuLnNvdXJjZX0oKS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBDYW5jZWxUb2tlbi5zb3VyY2UgfCBDYW5jZWxUb2tlbi5zb3VyY2V9KCkg44KI44KK5L2c5oiQ44GX44GfIHtAbGluayBDYW5jZWxUb2tlbn0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gICAgICovXG4gICAgc3RhdGljIHJlc29sdmU8VD4odmFsdWU/OiBUIHwgUHJvbWlzZUxpa2U8VD4sIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsKTogQ2FuY2VsYWJsZVByb21pc2U8VD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlXShzdXBlci5yZXNvbHZlKHZhbHVlKSwgY2FuY2VsVG9rZW4pO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgcHJpdmF0ZSBjb25zdHJ1Y3Rpb24gKi9cbiAgICBwcml2YXRlIHN0YXRpYyBbX2NyZWF0ZV08VCwgVFJlc3VsdDEgPSBULCBUUmVzdWx0MiA9IG5ldmVyPihcbiAgICAgICAgc3JjOiBQcm9taXNlPFQ+LFxuICAgICAgICB0b2tlbj86IENhbmNlbFRva2VuIHwgbnVsbCxcbiAgICAgICAgdGhlbkFyZ3M/OiBbXG4gICAgICAgICAgICAoKHZhbHVlOiBUKSA9PiBUUmVzdWx0MSB8IFByb21pc2VMaWtlPFRSZXN1bHQxPikgfCBudWxsIHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgKChyZWFzb246IHVua25vd24pID0+IFRSZXN1bHQyIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDI+KSB8IG51bGwgfCB1bmRlZmluZWRcbiAgICAgICAgXSB8IG51bGxcbiAgICApOiBDYW5jZWxhYmxlUHJvbWlzZTxUUmVzdWx0MSB8IFRSZXN1bHQyPiB7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIE5hdGl2ZVByb21pc2UsIHNyYyk7XG5cbiAgICAgICAgbGV0IHA6IFByb21pc2U8VCB8IFRSZXN1bHQxIHwgVFJlc3VsdDI+O1xuICAgICAgICBpZiAoISh0b2tlbiBpbnN0YW5jZW9mIENhbmNlbFRva2VuKSkge1xuICAgICAgICAgICAgcCA9IHNyYztcbiAgICAgICAgfSBlbHNlIGlmICh0aGVuQXJncyAmJiAoIWlzRnVuY3Rpb24odGhlbkFyZ3NbMF0pIHx8IGlzRnVuY3Rpb24odGhlbkFyZ3NbMV0pKSkge1xuICAgICAgICAgICAgcCA9IHNyYztcbiAgICAgICAgfSBlbHNlIGlmICh0b2tlbi5jYW5jZWxhYmxlKSB7XG4gICAgICAgICAgICBsZXQgczogU3Vic2NyaXB0aW9uO1xuICAgICAgICAgICAgcCA9IG5ldyBOYXRpdmVQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBzID0gdG9rZW4ucmVnaXN0ZXIocmVqZWN0KTtcbiAgICAgICAgICAgICAgICB2b2lkIG5hdGl2ZVRoZW4uY2FsbChzcmMsIHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnN0IGRpc3Bvc2UgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgIF90b2tlbnMuZGVsZXRlKHApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHAudGhlbihkaXNwb3NlLCBkaXNwb3NlKTtcbiAgICAgICAgfSBlbHNlIGlmICh0b2tlbi5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgIHAgPSBzdXBlci5yZWplY3QodG9rZW4ucmVhc29uKTtcbiAgICAgICAgfSBlbHNlIGlmICh0b2tlbi5jbG9zZWQpIHtcbiAgICAgICAgICAgIHAgPSBzcmM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgRXhjZXB0aW9uJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhlbkFyZ3MpIHtcbiAgICAgICAgICAgIHAgPSBuYXRpdmVUaGVuLmFwcGx5KHAsIHRoZW5BcmdzKSBhcyBQcm9taXNlPFQgfCBUUmVzdWx0MSB8IFRSZXN1bHQyPjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodG9rZW4/LmNhbmNlbGFibGUpIHtcbiAgICAgICAgICAgIF90b2tlbnMuc2V0KHAsIHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHAgaW5zdGFuY2VvZiB0aGlzIHx8IE9iamVjdC5zZXRQcm90b3R5cGVPZihwLCB0aGlzLnByb3RvdHlwZSk7XG5cbiAgICAgICAgcmV0dXJuIHAgYXMgQ2FuY2VsYWJsZVByb21pc2U8VFJlc3VsdDEgfCBUUmVzdWx0Mj47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBleGVjdXRvclxuICAgICAqICAtIGBlbmAgQSBjYWxsYmFjayB1c2VkIHRvIGluaXRpYWxpemUgdGhlIHByb21pc2UuIFRoaXMgY2FsbGJhY2sgaXMgcGFzc2VkIHR3byBhcmd1bWVudHMgYHJlc29sdmVgIGFuZCBgcmVqZWN0YC5cbiAgICAgKiAgLSBgamFgIHByb21pc2Ug44Gu5Yid5pyf5YyW44Gr5L2/55So44GZ44KL44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6aLiBgcmVzb2x2ZWAg44GoIGByZWplY3RgIOOBrjLjgaTjga7lvJXmlbDjgpLmjIHjgaRcbiAgICAgKiBAcGFyYW0gY2FuY2VsVG9rZW5cbiAgICAgKiAgLSBgZW5gIHtAbGluayBDYW5jZWxUb2tlbn0gaW5zdGFuY2UgY3JlYXRlIGZyb20ge0BsaW5rIENhbmNlbFRva2VuLnNvdXJjZSB8IENhbmNlbFRva2VuLnNvdXJjZX0oKS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBDYW5jZWxUb2tlbi5zb3VyY2UgfCBDYW5jZWxUb2tlbi5zb3VyY2V9KCkg44KI44KK5L2c5oiQ44GX44GfIHtAbGluayBDYW5jZWxUb2tlbn0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIGV4ZWN1dG9yOiAocmVzb2x2ZTogKHZhbHVlPzogVCB8IFByb21pc2VMaWtlPFQ+KSA9PiB2b2lkLCByZWplY3Q6IChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkKSA9PiB2b2lkLFxuICAgICAgICBjYW5jZWxUb2tlbj86IENhbmNlbFRva2VuIHwgbnVsbFxuICAgICkge1xuICAgICAgICBzdXBlcihleGVjdXRvcik7XG4gICAgICAgIHJldHVybiBDYW5jZWxhYmxlUHJvbWlzZVtfY3JlYXRlXSh0aGlzLCBjYW5jZWxUb2tlbik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXR0YWNoZXMgY2FsbGJhY2tzIGZvciB0aGUgcmVzb2x1dGlvbiBhbmQvb3IgcmVqZWN0aW9uIG9mIHRoZSBQcm9taXNlLlxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb25mdWxmaWxsZWQgVGhlIGNhbGxiYWNrIHRvIGV4ZWN1dGUgd2hlbiB0aGUgUHJvbWlzZSBpcyByZXNvbHZlZC5cbiAgICAgKiBAcGFyYW0gb25yZWplY3RlZCBUaGUgY2FsbGJhY2sgdG8gZXhlY3V0ZSB3aGVuIHRoZSBQcm9taXNlIGlzIHJlamVjdGVkLlxuICAgICAqIEByZXR1cm5zIEEgUHJvbWlzZSBmb3IgdGhlIGNvbXBsZXRpb24gb2Ygd2hpY2ggZXZlciBjYWxsYmFjayBpcyBleGVjdXRlZC5cbiAgICAgKi9cbiAgICB0aGVuPFRSZXN1bHQxID0gVCwgVFJlc3VsdDIgPSBuZXZlcj4oXG4gICAgICAgIG9uZnVsZmlsbGVkPzogKCh2YWx1ZTogVCkgPT4gVFJlc3VsdDEgfCBQcm9taXNlTGlrZTxUUmVzdWx0MT4pIHwgbnVsbCxcbiAgICAgICAgb25yZWplY3RlZD86ICgocmVhc29uOiB1bmtub3duKSA9PiBUUmVzdWx0MiB8IFByb21pc2VMaWtlPFRSZXN1bHQyPikgfCBudWxsXG4gICAgKTogUHJvbWlzZTxUUmVzdWx0MSB8IFRSZXN1bHQyPiB7XG4gICAgICAgIHJldHVybiBDYW5jZWxhYmxlUHJvbWlzZVtfY3JlYXRlXSh0aGlzLCBfdG9rZW5zLmdldCh0aGlzKSwgW29uZnVsZmlsbGVkLCBvbnJlamVjdGVkXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXR0YWNoZXMgYSBjYWxsYmFjayBmb3Igb25seSB0aGUgcmVqZWN0aW9uIG9mIHRoZSBQcm9taXNlLlxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb25yZWplY3RlZCBUaGUgY2FsbGJhY2sgdG8gZXhlY3V0ZSB3aGVuIHRoZSBQcm9taXNlIGlzIHJlamVjdGVkLlxuICAgICAqIEByZXR1cm5zIEEgUHJvbWlzZSBmb3IgdGhlIGNvbXBsZXRpb24gb2YgdGhlIGNhbGxiYWNrLlxuICAgICAqL1xuICAgIGNhdGNoPFRSZXN1bHQyID0gbmV2ZXI+KG9ucmVqZWN0ZWQ/OiAoKHJlYXNvbjogdW5rbm93bikgPT4gVFJlc3VsdDIgfCBQcm9taXNlTGlrZTxUUmVzdWx0Mj4pIHwgbnVsbCk6IFByb21pc2U8VCB8IFRSZXN1bHQyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnRoZW4odW5kZWZpbmVkLCBvbnJlamVjdGVkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBhIGNhbGxiYWNrIHRoYXQgaXMgaW52b2tlZCB3aGVuIHRoZSBQcm9taXNlIGlzIHNldHRsZWQgKGZ1bGZpbGxlZCBvciByZWplY3RlZCkuIDxicj5cbiAgICAgKiBUaGUgcmVzb2x2ZWQgdmFsdWUgY2Fubm90IGJlIG1vZGlmaWVkIGZyb20gdGhlIGNhbGxiYWNrLlxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb25maW5hbGx5IFRoZSBjYWxsYmFjayB0byBleGVjdXRlIHdoZW4gdGhlIFByb21pc2UgaXMgc2V0dGxlZCAoZnVsZmlsbGVkIG9yIHJlamVjdGVkKS5cbiAgICAgKiBAcmV0dXJucyBBIFByb21pc2UgZm9yIHRoZSBjb21wbGV0aW9uIG9mIHRoZSBjYWxsYmFjay5cbiAgICAgKi9cbiAgICBmaW5hbGx5KG9uZmluYWxseT86ICgoKSA9PiB2b2lkKSB8IG51bGwpOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgcmV0dXJuIENhbmNlbGFibGVQcm9taXNlW19jcmVhdGVdKHN1cGVyLmZpbmFsbHkob25maW5hbGx5KSwgX3Rva2Vucy5nZXQodGhpcykpO1xuICAgIH1cblxufVxuXG4vKipcbiAqIEBlbiBTd2l0Y2ggdGhlIGdsb2JhbCBgUHJvbWlzZWAgY29uc3RydWN0b3IgYE5hdGl2ZSBQcm9taXNlYCBvciB7QGxpbmsgQ2FuY2VsYWJsZVByb21pc2V9LiA8YnI+XG4gKiAgICAgYE5hdGl2ZSBQcm9taXNlYCBjb25zdHJ1Y3RvciBpcyBvdmVycmlkZGVuIGJ5IGZyYW1ld29yayBkZWZhdWx0IGJlaGF2aW91ci5cbiAqIEBqYSDjgrDjg63jg7zjg5Djg6sgYFByb21pc2VgIOOCs+ODs+OCueODiOODqeOCr+OCv+OCkiBgTmF0aXZlIFByb21pc2VgIOOBvuOBn+OBryB7QGxpbmsgQ2FuY2VsYWJsZVByb21pc2V9IOOBq+WIh+OCiuabv+OBiCA8YnI+XG4gKiAgICAg5pei5a6a44GnIGBOYXRpdmUgUHJvbWlzZWAg44KS44Kq44O844OQ44O844Op44Kk44OJ44GZ44KLLlxuICpcbiAqIEBwYXJhbSBlbmFibGVcbiAqICAtIGBlbmAgYHRydWVgOiB1c2Uge0BsaW5rIENhbmNlbGFibGVQcm9taXNlfSAvICBgZmFsc2VgOiB1c2UgYE5hdGl2ZSBQcm9taXNlYFxuICogIC0gYGphYCBgdHJ1ZWA6IHtAbGluayBDYW5jZWxhYmxlUHJvbWlzZX0g44KS5L2/55SoIC8gYGZhbHNlYDogYE5hdGl2ZSBQcm9taXNlYCDjgpLkvb/nlKhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dGVuZFByb21pc2UoZW5hYmxlOiBib29sZWFuKTogUHJvbWlzZUNvbnN0cnVjdG9yIHtcbiAgICBpZiAoZW5hYmxlKSB7XG4gICAgICAgIFByb21pc2UgPSBDYW5jZWxhYmxlUHJvbWlzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBQcm9taXNlID0gTmF0aXZlUHJvbWlzZTtcbiAgICB9XG4gICAgcmV0dXJuIFByb21pc2U7XG59XG5cbi8qKiBAaW50ZXJuYWwgZ2xvYmFsIGNvbmZpZyBvcHRpb25zICovXG5pbnRlcmZhY2UgR2xvYmFsQ29uZmlnIHtcbiAgICBub0F1dG9tYXRpY05hdGl2ZUV4dGVuZDogYm9vbGVhbjtcbn1cblxuLy8gZGVmYXVsdDogYXV0b21hdGljIG5hdGl2ZSBwcm9taXNlIG92ZXJyaWRlLlxuZXh0ZW5kUHJvbWlzZSghZ2V0Q29uZmlnPEdsb2JhbENvbmZpZz4oKS5ub0F1dG9tYXRpY05hdGl2ZUV4dGVuZCk7XG5cbmV4cG9ydCB7XG4gICAgTmF0aXZlUHJvbWlzZSxcbiAgICBDYW5jZWxhYmxlUHJvbWlzZSxcbiAgICBDYW5jZWxhYmxlUHJvbWlzZSBhcyBQcm9taXNlLFxufTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L2F3YWl0LXRoZW5hYmxlLFxuICovXG5cbmltcG9ydCB0eXBlIHsgQ2FuY2VsVG9rZW4gfSBmcm9tICcuL2NhbmNlbC10b2tlbic7XG5cbi8qKlxuICogQGVuIENhbmNlbGFibGUgYmFzZSBvcHRpb24gZGVmaW5pdGlvbi5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vlj6/og73jgarln7rlupXjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5jZWxhYmxlIHtcbiAgICBjYW5jZWw/OiBDYW5jZWxUb2tlbjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFdhaXQgZm9yIHByb21pc2VzIGRvbmUuIDxicj5cbiAqICAgICBXaGlsZSBjb250cm9sIHdpbGwgYmUgcmV0dXJuZWQgaW1tZWRpYXRlbHkgd2hlbiBgUHJvbWlzZS5hbGwoKWAgZmFpbHMsIGJ1dCB0aGlzIG1laHRvZCB3YWl0cyBmb3IgaW5jbHVkaW5nIGZhaWx1cmUuXG4gKiBAamEgYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiOOBrue1guS6huOBvuOBp+W+heapnyA8YnI+XG4gKiAgICAgYFByb21pc2UuYWxsKClgIOOBr+WkseaVl+OBmeOCi+OBqOOBmeOBkOOBq+WItuW+oeOCkui/lOOBmeOBruOBq+WvvuOBl+OAgeWkseaVl+OCguWQq+OCgeOBpuW+heOBpCBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIHByb21pc2VzXG4gKiAgLSBgZW5gIFByb21pc2UgaW5zdGFuY2UgYXJyYXlcbiAqICAtIGBqYWAgUHJvbWlzZSDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7phY3liJfjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdhaXQocHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSk6IFByb21pc2U8dW5rbm93bltdPiB7XG4gICAgY29uc3Qgc2FmZVByb21pc2VzID0gcHJvbWlzZXMubWFwKChwcm9taXNlKSA9PiBwcm9taXNlLmNhdGNoKChlKSA9PiBlKSk7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHNhZmVQcm9taXNlcyk7XG59XG5cbi8qKlxuICogQGVuIENhbmNlbGxhdGlvbiBjaGVja2VyIG1ldGhvZC4gPGJyPlxuICogICAgIEl0J3MgcHJhY3RpY2FibGUgYnkgYGFzeW5jIGZ1bmN0aW9uYC5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjg4Hjgqfjg4Pjgqvjg7wgPGJyPlxuICogICAgIGBhc3luYyBmdW5jdGlvbmAg44Gn5L2/55So5Y+v6IO9XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAgYXN5bmMgZnVuY3Rpb24gc29tZUZ1bmModG9rZW46IENhbmNlbFRva2VuKTogUHJvbWlzZTx7fT4ge1xuICogICAgYXdhaXQgY2hlY2tDYW5jZWxlZCh0b2tlbik7XG4gKiAgICByZXR1cm4ge307XG4gKiAgfVxuICogYGBgXG4gKlxuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIHtAbGluayBDYW5jZWxUb2tlbn0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCB7QGxpbmsgQ2FuY2VsVG9rZW59IOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrQ2FuY2VsZWQodG9rZW46IENhbmNlbFRva2VuIHwgdW5kZWZpbmVkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh1bmRlZmluZWQsIHRva2VuKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHN0YXR1cyBvZiB0aGUgcHJvbWlzZSBpbnN0YW5jZS4gPGJyPlxuICogICAgIEl0J3MgcHJhY3RpY2FibGUgYnkgYGFzeW5jIGZ1bmN0aW9uYC5cbiAqIEBqYSBQcm9taXNlIOOCpOODs+OCueOCv+ODs+OCueOBrueKtuaFi+OCkueiuuiqjSA8YnI+XG4gKiAgICAgYGFzeW5jIGZ1bmN0aW9uYCDjgafkvb/nlKjlj6/og71cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IGNoZWNrU3RhdHVzIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiBsZXQgcHJvbWlzZTogUHJvbWlzZTx1bmtub3duPjsgLy8gc29tZSBwcm9taXNlIGluc3RhbmNlXG4gKiA6XG4gKiBjb25zdCBzdGF0dXMgPSBhd2FpdCBjaGVja1N0YXR1cyhwcm9taXNlKTtcbiAqIGNvbnNvbGUubG9nKHN0YXR1cyk7XG4gKiAvLyAncGVuZGluZycgb3IgJ2Z1bGZpbGxlZCcgb3IgJ3JlamVjdGVkJ1xuICogYGBgXG4gKlxuICogQHBhcmFtIHByb21pc2VcbiAqICAtIGBlbmAgUHJvbWlzZSBpbnN0YW5jZVxuICogIC0gYGphYCBQcm9taXNlIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tTdGF0dXMocHJvbWlzZTogUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8J3BlbmRpbmcnIHwgJ2Z1bGZpbGxlZCcgfCAncmVqZWN0ZWQnPiB7XG4gICAgY29uc3QgcGVuZGluZyA9IHt9O1xuICAgIC8qXG4gICAgICogUHJvbWlzZSDmtL7nlJ/jgq/jg6njgrnjgafjgoLkvb/nlKjjgZnjgovjgZ/jgoHjgavjga8sIGBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5yYWNlYCDjgafjgqLjgq/jgrvjgrnjgZnjgovlv4XopoHjgYzjgYLjgotcbiAgICAgKiBwcm9taXNlIOOBjOa0vueUn+OCr+ODqeOCueOBp+OBguOCi+WgtOWQiCwgUHJvbWlzZS5yYWNlKCkg44KS5L2/55So44GZ44KL44Go5b+F44GaIGBwZW5kaW5nYCBvYmplY3Qg44GM6L+U44GV44KM44Gm44GX44G+44GGXG4gICAgICovXG4gICAgcmV0dXJuIChwcm9taXNlLmNvbnN0cnVjdG9yIGFzIFByb21pc2VDb25zdHJ1Y3RvcikucmFjZShbcHJvbWlzZSwgcGVuZGluZ10pXG4gICAgICAgIC50aGVuKHYgPT4gKHYgPT09IHBlbmRpbmcpID8gJ3BlbmRpbmcnIDogJ2Z1bGZpbGxlZCcsICgpID0+ICdyZWplY3RlZCcpO1xufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICBpc0Z1bmN0aW9uLFxuICAgIG5vb3AsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IENhbmNlbFRva2VuIH0gZnJvbSAnLi9jYW5jZWwtdG9rZW4nO1xuaW1wb3J0IHsgQ2FuY2VsYWJsZVByb21pc2UsIE5hdGl2ZVByb21pc2UgfSBmcm9tICcuL2NhbmNlbGFibGUtcHJvbWlzZSc7XG5pbXBvcnQgeyBjaGVja1N0YXR1cyB9IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogUHJvbWlzZSDjga7jgq/jg6njgrnmi6HlvLXjga8gdGhlbiBjaGFpbiDjgpLpganliIfjgavnrqHnkIbjgZnjgovjgZ/jgoHjga7kvZzms5XjgYzlrZjlnKjjgZfjgIHln7rmnKznmoTjgavjga/ku6XkuIvjga4z44Gk44Gu5pa56Yed44GM44GC44KLXG4gKiAtIDEuIGV4ZWN1dG9yIOOCkuW8leaVsOOBq+OBqOOCiyBjb25zdHJ1Y3RvciDjgpLmj5DkvpvjgZnjgotcbiAqIC0gMi4gc3RhdGljIGdldCBbU3ltYm9sLnNwZWNpZXNdKCkgeyByZXR1cm4gTmF0aXZlUHJvbWlzZTsgfSDjgpLmj5DkvpvjgZnjgotcbiAqIC0gMy4gRGVmZXJyZWQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTmF0aXZlUHJvbWlzZSDjga7jgojjgYbjgasgcHJvdG90eXBlLmNvbnN0cnVjdG9yIOOCkuS4iuabuOOBjeOBmeOCiyAoSGFja2luZylcbiAqXG4gKiBgRGVmZXJyZWRgIOOCr+ODqeOCueOBp+OBr+S7peS4i+OBrueQhueUseOBq+OCiOOCiiwgYDFgLCBgMmAg44Gu5a++5b+c44KS6KGM44GGLlxuICogLSBjaGVja1N0YXR1cygpIOOCkiBQcm9taXNlIOa0vueUn+OCr+ODqeOCueOBp+OCguS9v+eUqOOBmeOCi+OBn+OCgeOBq+OBrywgYGluc3RhbmNlLmNvbnN0cnVjdG9yLnJhY2VgIOOBp+OCouOCr+OCu+OCueOBmeOCi+W/heimgeOBjOOBguOCi1xuICogICAtIGBUeXBlRXJyb3I6IFByb21pc2UgcmVzb2x2ZSBvciByZWplY3QgZnVuY3Rpb24gaXMgbm90IGNhbGxhYmxlYCDlr77nrZbjga7jgZ/jgoHjga4gYDFgXG4gKiAtIGB0aGVuYCwgYGNhdGNoYCwgYGZpbmFseWAg5pmC44Gr55Sf5oiQ44GV44KM44KL44Kk44Oz44K544K/44Oz44K544GvIGBEZWZlcnJlZGAg44Gn44GC44KL5b+F6KaB44Gv54Sh44GE44Gf44KBIGAyYFxuICpcbiAqIEBzZWUgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNDgxNTg3MzAvZXh0ZW5kLWphdmFzY3JpcHQtcHJvbWlzZS1hbmQtcmVzb2x2ZS1vci1yZWplY3QtaXQtaW5zaWRlLWNvbnN0cnVjdG9yXG4gKi9cbmNvbnN0IHJlc29sdmVBcmdzID0gKGFyZzE/OiBVbmtub3duRnVuY3Rpb24gfCBDYW5jZWxUb2tlbiB8IG51bGwsIGFyZzI/OiBDYW5jZWxUb2tlbiB8IG51bGwpOiBbVW5rbm93bkZ1bmN0aW9uLCBDYW5jZWxUb2tlbiB8IG51bGwgfCB1bmRlZmluZWRdID0+IHtcbiAgICBpZiAoaXNGdW5jdGlvbihhcmcxKSkge1xuICAgICAgICByZXR1cm4gW2FyZzEsIGFyZzJdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBbbm9vcCwgYXJnMV07XG4gICAgfVxufTtcblxuLyoqXG4gKiBAZW4gYERlZmVycmVkYCBvYmplY3QgY2xhc3MgdGhhdCBjYW4gb3BlcmF0ZSBgcmVqZWN0YCBhbmRgIHJlc29sdmVgIGZyb20gdGhlIG91dHNpZGUuXG4gKiBAamEgYHJlamVjdGAsIGAgcmVzb2x2ZWAg44KS5aSW6YOo44KI44KK5pON5L2c5Y+v6IO944GqIGBEZWZlcnJlZGAg44Kq44OW44K444Kn44Kv44OI44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBkZiA9IG5ldyBEZWZlcnJlZCgpO1xuICogZGYucmVzb2x2ZSgpO1xuICogZGYucmVqZWN0KCdyZWFzb24nKTtcbiAqXG4gKiBhd2FpdCBkZjtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgRGVmZXJyZWQ8VCA9IHZvaWQ+IGV4dGVuZHMgQ2FuY2VsYWJsZVByb21pc2U8VD4ge1xuICAgIHJlYWRvbmx5IHJlc29sdmUhOiAoYXJnOiBUIHwgUHJvbWlzZUxpa2U8VD4pID0+IHZvaWQ7XG4gICAgcmVhZG9ubHkgcmVqZWN0ITogKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbmNlbFRva2VuXG4gICAgICogIC0gYGVuYCB7QGxpbmsgQ2FuY2VsVG9rZW59IGluc3RhbmNlIGNyZWF0ZSBmcm9tIHtAbGluayBDYW5jZWxUb2tlbi5zb3VyY2UgfCBDYW5jZWxUb2tlbi5zb3VyY2V9KCkuXG4gICAgICogIC0gYGphYCB7QGxpbmsgQ2FuY2VsVG9rZW4uc291cmNlIHwgQ2FuY2VsVG9rZW4uc291cmNlfSgpIOOCiOOCiuS9nOaIkOOBl+OBnyB7QGxpbmsgQ2FuY2VsVG9rZW59IOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsKTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZXhlY3V0b3JcbiAgICAgKiAgLSBgZW5gIEEgY2FsbGJhY2sgdXNlZCB0byBpbml0aWFsaXplIHRoZSBwcm9taXNlLiBUaGlzIGNhbGxiYWNrIGlzIHBhc3NlZCB0d28gYXJndW1lbnRzIGByZXNvbHZlYCBhbmQgYHJlamVjdGAuXG4gICAgICogIC0gYGphYCBwcm9taXNlIOOBruWIneacn+WMluOBq+S9v+eUqOOBmeOCi+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+Wumi4gYHJlc29sdmVgIOOBqCBgcmVqZWN0YCDjga4y44Gk44Gu5byV5pWw44KS5oyB44GkXG4gICAgICogQHBhcmFtIGNhbmNlbFRva2VuXG4gICAgICogIC0gYGVuYCB7QGxpbmsgQ2FuY2VsVG9rZW59IGluc3RhbmNlIGNyZWF0ZSBmcm9tIHtAbGluayBDYW5jZWxUb2tlbi5zb3VyY2UgfCBDYW5jZWxUb2tlbi5zb3VyY2V9KCkuXG4gICAgICogIC0gYGphYCB7QGxpbmsgQ2FuY2VsVG9rZW4uc291cmNlIHwgQ2FuY2VsVG9rZW4uc291cmNlfSgpIOOCiOOCiuS9nOaIkOOBl+OBnyB7QGxpbmsgQ2FuY2VsVG9rZW59IOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBleGVjdXRvcjogKHJlc29sdmU6ICh2YWx1ZT86IFQgfCBQcm9taXNlTGlrZTxUPikgPT4gdm9pZCwgcmVqZWN0OiAocmVhc29uPzogdW5rbm93bikgPT4gdm9pZCkgPT4gdm9pZCxcbiAgICAgICAgY2FuY2VsVG9rZW4/OiBDYW5jZWxUb2tlbiB8IG51bGxcbiAgICApO1xuXG4gICAgY29uc3RydWN0b3IoYXJnMT86IFVua25vd25GdW5jdGlvbiB8IENhbmNlbFRva2VuIHwgbnVsbCwgYXJnMj86IENhbmNlbFRva2VuIHwgbnVsbCkge1xuICAgICAgICBjb25zdCBbZXhlY3V0b3IsIGNhbmNlbFRva2VuXSA9IHJlc29sdmVBcmdzKGFyZzEsIGFyZzIpO1xuICAgICAgICBjb25zdCBwdWJsaWNhdGlvbnMgPSB7fTtcbiAgICAgICAgc3VwZXIoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihwdWJsaWNhdGlvbnMsIHsgcmVzb2x2ZSwgcmVqZWN0IH0pO1xuICAgICAgICAgICAgZXhlY3V0b3IocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgfSwgY2FuY2VsVG9rZW4pO1xuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMsIHB1YmxpY2F0aW9ucyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWZsb2F0aW5nLXByb21pc2VzXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBzdGF0dXMgb2YgdGhpcyBpbnN0YW5jZS4gPGJyPlxuICAgICAqICAgICBJdCdzIHByYWN0aWNhYmxlIGJ5IGBhc3luYyBmdW5jdGlvbmAuXG4gICAgICogQGphIERlZmVycmVkIOOCpOODs+OCueOCv+ODs+OCueOBrueKtuaFi+OCkueiuuiqjSA8YnI+XG4gICAgICogICAgIGBhc3luYyBmdW5jdGlvbmAg44Gn5L2/55So5Y+v6IO9XG4gICAgICovXG4gICAgc3RhdHVzKCk6IFByb21pc2U8J3BlbmRpbmcnIHwgJ2Z1bGZpbGxlZCcgfCAncmVqZWN0ZWQnPiB7XG4gICAgICAgIHJldHVybiBjaGVja1N0YXR1cyh0aGlzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6ICdEZWZlcnJlZCcgeyByZXR1cm4gJ0RlZmVycmVkJzsgfVxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBzdGF0aWMgZ2V0IFtTeW1ib2wuc3BlY2llc10oKTogUHJvbWlzZUNvbnN0cnVjdG9yIHsgcmV0dXJuIE5hdGl2ZVByb21pc2U7IH1cbn1cbiIsImltcG9ydCB0eXBlIHsgQ2FuY2VsVG9rZW5Tb3VyY2UgfSBmcm9tICcuL2NhbmNlbC10b2tlbic7XG5pbXBvcnQgeyB3YWl0IH0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyBtYW5hZ2VzIGx1bXBpbmcgbXVsdGlwbGUgYFByb21pc2VgIG9iamVjdHMuIDxicj5cbiAqICAgICBJdCdzIHBvc3NpYmxlIHRvIG1ha2UgdGhlbSBjYW5jZWwgbW9yZSB0aGFuIG9uZSBgUHJvbWlzZWAgd2hpY2ggaGFuZGxlcyBkaWZmZXJlbnQge0BsaW5rIENhbmNlbFRva2VufSBieSBsdW1waW5nLlxuICogQGphIOikh+aVsCBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OI44KS5LiA5ous566h55CG44GZ44KL44Kv44Op44K5IDxicj5cbiAqICAgICDnlbDjgarjgosge0BsaW5rIENhbmNlbFRva2VufSDjgpLmibHjgYbopIfmlbDjga4gYFByb21pc2VgIOOCkuS4gOaLrOOBp+OCreODo+ODs+OCu+ODq+OBleOBm+OCi+OBk+OBqOOBjOWPr+iDvVxuICovXG5leHBvcnQgY2xhc3MgUHJvbWlzZU1hbmFnZXIge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Bvb2wgPSBuZXcgTWFwPFByb21pc2U8dW5rbm93bj4sICgocmVhc29uOiB1bmtub3duKSA9PiB1bmtub3duKSB8IHVuZGVmaW5lZD4oKTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgYSBgUHJvbWlzZWAgb2JqZWN0IHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OI44KS566h55CG5LiL44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvbWlzZVxuICAgICAqICAtIGBlbmAgYW55IGBQcm9taXNlYCBpbnN0YW5jZSBpcyBhdmFpbGFibGUuXG4gICAgICogIC0gYGphYCDku7vmhI/jga4gYFByb21pc2VgIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEBwYXJhbSBjYW5jZWxTb3VyY2VcbiAgICAgKiAgLSBgZW5gIHtAbGluayBDYW5jZWxUb2tlblNvdXJjZX0gaW5zdGFuY2UgbWFkZSBieSB7QGxpbmsgQ2FuY2VsVG9rZW4uc291cmNlIHwgQ2FuY2VsVG9rZW4uc291cmNlfSgpLlxuICAgICAqICAtIGBqYWAge0BsaW5rIENhbmNlbFRva2VuLnNvdXJjZSB8IENhbmNlbFRva2VuLnNvdXJjZX0oKSDjgafnlJ/miJDjgZXjgozjgosge0BsaW5rIENhbmNlbFRva2VuU291cmNlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmV0dXJuIHRoZSBzYW1lIGluc3RhbmNlIG9mIGlucHV0IGBwcm9taXNlYCBpbnN0YW5jZS5cbiAgICAgKiAgLSBgamFgIOWFpeWKm+OBl+OBnyBgcHJvbWlzZWAg44Go5ZCM5LiA44Kk44Oz44K544K/44Oz44K544KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGFkZDxUPihwcm9taXNlOiBQcm9taXNlPFQ+LCBjYW5jZWxTb3VyY2U/OiBDYW5jZWxUb2tlblNvdXJjZSk6IFByb21pc2U8VD4ge1xuICAgICAgICB0aGlzLl9wb29sLnNldChwcm9taXNlLCBjYW5jZWxTb3VyY2U/LmNhbmNlbCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG5cbiAgICAgICAgY29uc3QgYWx3YXlzID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgdGhpcy5fcG9vbC5kZWxldGUocHJvbWlzZSk7XG4gICAgICAgICAgICBpZiAoY2FuY2VsU291cmNlKSB7XG4gICAgICAgICAgICAgICAgY2FuY2VsU291cmNlLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcHJvbWlzZVxuICAgICAgICAgICAgLnRoZW4oYWx3YXlzLCBhbHdheXMpO1xuXG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWxlYXNlZCBhbGwgaW5zdGFuY2VzIHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgpLnoLTmo4RcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVsZWFzZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcG9vbC5jbGVhcigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYHByb21pc2VgIGFycmF5IGZyb20gdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBriBQcm9taXNlIOOCkumFjeWIl+OBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBwcm9taXNlcygpOiBQcm9taXNlPHVua25vd24+W10ge1xuICAgICAgICByZXR1cm4gWy4uLnRoaXMuX3Bvb2wua2V5cygpXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FsbCBgUHJvbWlzZS5hbGwoKWAgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50LiA8YnI+XG4gICAgICogICAgIFdhaXQgZm9yIGFsbCBgZnVsZmlsbGVkYC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44Gr5a++44GX44GmIGBQcm9taXNlLmFsbCgpYCA8YnI+XG4gICAgICogICAgIOOBmeOBueOBpuOBjCBgZnVsZmlsbGVkYCDjgavjgarjgovjgb7jgaflvoXmqZ9cbiAgICAgKi9cbiAgICBwdWJsaWMgYWxsKCk6IFByb21pc2U8dW5rbm93bltdPiB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbCh0aGlzLnByb21pc2VzKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYWxsIGBQcm9taXNlLnJhY2UoKWAgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50LiA8YnI+XG4gICAgICogICAgIFdhaXQgZm9yIGFueSBgc2V0dGxlZGAuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBq+WvvuOBl+OBpiBgUHJvbWlzZS5yYWNlKClgIDxicj5cbiAgICAgKiAgICAg44GE44Ga44KM44GL44GMIGBzZXR0bGVkYCDjgavjgarjgovjgb7jgaflvoXmqZ9cbiAgICAgKi9cbiAgICBwdWJsaWMgcmFjZSgpOiBQcm9taXNlPHVua25vd24+IHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmFjZSh0aGlzLnByb21pc2VzKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYWxsIHtAbGluayB3YWl0fSgpIGZvciB1bmRlciB0aGUgbWFuYWdlbWVudC4gPGJyPlxuICAgICAqICAgICBXYWl0IGZvciBhbGwgYHNldHRsZWRgLiAoc2ltcGxpZmllZCB2ZXJzaW9uKVxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgavlr77jgZfjgaYge0BsaW5rIHdhaXR9KCkgPGJyPlxuICAgICAqICAgICDjgZnjgbnjgabjgYwgYHNldHRsZWRgIOOBq+OBquOCi+OBvuOBp+W+heapnyAo57Ch5piT44OQ44O844K444On44OzKVxuICAgICAqL1xuICAgIHB1YmxpYyB3YWl0KCk6IFByb21pc2U8dW5rbm93bltdPiB7XG4gICAgICAgIHJldHVybiB3YWl0KHRoaXMucHJvbWlzZXMoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbGwgYFByb21pc2UuYWxsU2V0dGxlZCgpYCBmb3IgdW5kZXIgdGhlIG1hbmFnZW1lbnQuIDxicj5cbiAgICAgKiAgICAgV2FpdCBmb3IgYWxsIGBzZXR0bGVkYC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44Gr5a++44GX44GmIGBQcm9taXNlLmFsbFNldHRsZWQoKWAgPGJyPlxuICAgICAqICAgICDjgZnjgbnjgabjgYwgYHNldHRsZWRgIOOBq+OBquOCi+OBvuOBp+W+heapn1xuICAgICAqL1xuICAgIHB1YmxpYyBhbGxTZXR0bGVkKCk6IFByb21pc2U8UHJvbWlzZVNldHRsZWRSZXN1bHQ8dW5rbm93bj5bXT4ge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGxTZXR0bGVkKHRoaXMucHJvbWlzZXMoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbGwgYFByb21pc2UuYW55KClgIGZvciB1bmRlciB0aGUgbWFuYWdlbWVudC4gPGJyPlxuICAgICAqICAgICBXYWl0IGZvciBhbnkgYGZ1bGZpbGxlZGAuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBq+WvvuOBl+OBpiBgUHJvbWlzZS5hbnkoKWAgPGJyPlxuICAgICAqICAgICDjgYTjgZrjgozjgYvjgYwgYGZ1bGZpbGxlZGAg44Gr44Gq44KL44G+44Gn5b6F5qmfXG4gICAgICovXG4gICAgcHVibGljIGFueSgpOiBQcm9taXNlPHVua25vd24+IHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYW55KHRoaXMucHJvbWlzZXMoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEludm9rZSBgY2FuY2VsYCBtZXNzYWdlIGZvciB1bmRlciB0aGUgbWFuYWdlbWVudCBwcm9taXNlcy5cbiAgICAgKiBAamEg566h55CG5a++6LGh44GuIGBQcm9taXNlYCDjgavlr77jgZfjgabjgq3jg6Pjg7Pjgrvjg6vjgpLnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSByZWFzb25cbiAgICAgKiAgLSBgZW5gIGFyZ3VtZW50cyBmb3IgYGNhbmNlbFNvdXJjZWBcbiAgICAgKiAgLSBgamFgIGBjYW5jZWxTb3VyY2VgIOOBq+a4oeOBleOCjOOCi+W8leaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgUHJvbWlzZWAgaW5zdGFuY2Ugd2hpY2ggd2FpdCBieSB1bnRpbCBjYW5jZWxsYXRpb24gY29tcGxldGlvbi5cbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODq+WujOS6huOBvuOBp+W+heapn+OBmeOCiyBgUHJvbWlzZWAg44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGFib3J0PFQ+KHJlYXNvbj86IFQpOiBQcm9taXNlPHVua25vd25bXT4ge1xuICAgICAgICBmb3IgKGNvbnN0IGNhbmNlbGVyIG9mIHRoaXMuX3Bvb2wudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIGlmIChjYW5jZWxlcikge1xuICAgICAgICAgICAgICAgIGNhbmNlbGVyKFxuICAgICAgICAgICAgICAgICAgICByZWFzb24gPz8gbmV3IEVycm9yKCdhYm9ydCcpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd2FpdCh0aGlzLnByb21pc2VzKCkpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duT2JqZWN0LFxuICAgIGlzU3RyaW5nLFxuICAgIGlzU3ltYm9sLFxuICAgIGNsYXNzTmFtZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuXG4vKiogQGludGVybmFsIEV2ZW50QnJva2VyUHJveHkgKi9cbmV4cG9ydCBjbGFzcyBFdmVudEJyb2tlclByb3h5PEV2ZW50IGV4dGVuZHMgb2JqZWN0PiB7XG4gICAgcHJpdmF0ZSBfYnJva2VyPzogRXZlbnRCcm9rZXI8RXZlbnQ+O1xuICAgIHB1YmxpYyBnZXQoKTogRXZlbnRCcm9rZXI8RXZlbnQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Jyb2tlciA/PyAodGhpcy5fYnJva2VyID0gbmV3IEV2ZW50QnJva2VyKCkpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgX2ludGVybmFsICAgICAgPSBTeW1ib2woJ2ludGVybmFsJyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBfbm90aWZ5ICAgICAgICA9IFN5bWJvbCgnbm90aWZ5Jyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBfc3RvY2tDaGFuZ2UgICA9IFN5bWJvbCgnc3RvY2stY2hhbmdlJyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBfbm90aWZ5Q2hhbmdlcyA9IFN5bWJvbCgnbm90aWZ5LWNoYW5nZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZlcmlmeU9ic2VydmFibGUoeDogdW5rbm93bik6IHZvaWQgfCBuZXZlciB7XG4gICAgaWYgKCF4IHx8ICEoeCBhcyBVbmtub3duT2JqZWN0KVtfaW50ZXJuYWxdKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFRoZSBvYmplY3QgcGFzc2VkIGlzIG5vdCBhbiBJT2JzZXJ2YWJsZS5gKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiB2ZXJpZnlWYWxpZEtleShrZXk6IHVua25vd24pOiB2b2lkIHwgbmV2ZXIge1xuICAgIGlmIChpc1N0cmluZyhrZXkpIHx8IGlzU3ltYm9sKGtleSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBUeXBlIG9mICR7Y2xhc3NOYW1lKGtleSl9IGlzIG5vdCBhIHZhbGlkIGtleS5gKTtcbn1cbiIsImltcG9ydCB0eXBlIHsgVW5rbm93bk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IFN1YnNjcmlwdGlvbiwgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBfaW50ZXJuYWwgfSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gRXZlbnQgb2JzZXJ2YXRpb24gc3RhdGUgZGVmaW5pdGlvbi5cbiAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvlrprnvqlcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gT2JzZXJ2YWJsZVN0YXRlIHtcbiAgICAvKiogb2JzZXJ2YWJsZSByZWFkeSAqL1xuICAgIEFDVElWRSAgID0gJ2FjdGl2ZScsXG4gICAgLyoqIE5PVCBvYnNlcnZlZCwgYnV0IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkLiAqL1xuICAgIFNVU0VQTkRFRCA9ICdzdXNwZW5kZWQnLFxuICAgIC8qKiBOT1Qgb2JzZXJ2ZWQsIGFuZCBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMuICovXG4gICAgRElTQUJMRUQgPSAnZGlzYWJsZWQnLFxufVxuXG4vKipcbiAqIEBlbiBPYnNlcnZhYmxlIGNvbW1vbiBpbnRlcmZhY2UuXG4gKiBAamEgT2JzZXJ2YWJsZSDlhbHpgJrjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJT2JzZXJ2YWJsZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICovXG4gICAgb24oLi4uYXJnczogdW5rbm93bltdKTogU3Vic2NyaXB0aW9uO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKi9cbiAgICBvZmYoLi4uYXJnczogdW5rbm93bltdKTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdXNwZW5kIG9yIGRpc2FibGUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jgrXjgrnjg5rjg7Pjg4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub1JlY29yZFxuICAgICAqICAtIGBlbmAgYHRydWVgOiBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMgYW5kIGNsZWFyIGNoYW5nZXMuIC8gYGZhbHNlYDogcHJvcGVydHkgY2hhbmdlcyBhcmUgcmVjb3JkZWQgYW5kIGZpcmVkIHdoZW4ge0BsaW5rIHJlc3VtZX0oKSBjYWxsZGVkLiAoZGVmYXVsdClcbiAgICAgKiAgLSBgamFgIGB0cnVlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044KC6KiY6Yyy44Gb44GaLCDnj77lnKjjga7oqJjpjLLjgoLnoLTmo4QgLyBgZmFsc2VgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7Tjga/oqJjpjLLjgZXjgowsIHtAbGluayByZXN1bWV9KCkg5pmC44Gr55m654Gr44GZ44KLICjml6LlrpopXG4gICAgICovXG4gICAgc3VzcGVuZChub1JlY29yZD86IGJvb2xlYW4pOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc3VtZSB0aGUgZXZlbnQgb2JzZXJ2YXRpb24gc3RhdGUuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreeKtuaFi+OBruODquOCuOODpeODvOODoFxuICAgICAqL1xuICAgIHJlc3VtZSgpOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIG9ic2VydmF0aW9uIHN0YXRlXG4gICAgICogQGphIOizvOiqreWPr+iDveeKtuaFi1xuICAgICAqL1xuICAgIGdldE9ic2VydmFibGVTdGF0ZSgpOiBPYnNlcnZhYmxlU3RhdGU7XG59XG5cbi8qKlxuICogQGVuIEludGVyZmFjZSBhYmxlIHRvIGFjY2VzcyB0byB7QGxpbmsgRXZlbnRCcm9rZXJ9IHdpdGgge0BsaW5rIElPYnNlcnZhYmxlfS5cbiAqIEBqYSB7QGxpbmsgSU9ic2VydmFibGV9IOOBruaMgeOBpOWGhemDqCB7QGxpbmsgRXZlbnRCcm9rZXJ9IOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIElPYnNlcnZhYmxlRXZlbnRCcm9rZXJBY2Nlc3M8VCBleHRlbmRzIG9iamVjdCA9IGFueT4gZXh0ZW5kcyBJT2JzZXJ2YWJsZSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQge0BsaW5rIEV2ZW50QnJva2VyfSBpbnN0YW5jZS5cbiAgICAgKiBAamEge0BsaW5rIEV2ZW50QnJva2VyfSDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7lj5blvpdcbiAgICAgKi9cbiAgICBnZXRCcm9rZXIoKTogRXZlbnRCcm9rZXI8VD47XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIHtAbGluayBJT2JzZXJ2YWJsZX0uXG4gKiBAamEge0BsaW5rIElPYnNlcnZhYmxlfSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09ic2VydmFibGUoeDogdW5rbm93bik6IHggaXMgSU9ic2VydmFibGUge1xuICAgIHJldHVybiBCb29sZWFuKHggJiYgKHggYXMgVW5rbm93bk9iamVjdClbX2ludGVybmFsXSk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgdHlwZSBBY2Nlc3NpYmxlLFxuICAgIHR5cGUgTm9uRnVuY3Rpb25Qcm9wZXJ0aWVzLFxuICAgIHR5cGUgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgdmVyaWZ5LFxuICAgIHBvc3QsXG4gICAgZGVlcE1lcmdlLFxuICAgIGRlZXBFcXVhbCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgU3Vic2NyaXB0aW9uLCBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgRXZlbnRCcm9rZXJQcm94eSxcbiAgICBfaW50ZXJuYWwsXG4gICAgX25vdGlmeSxcbiAgICBfc3RvY2tDaGFuZ2UsXG4gICAgX25vdGlmeUNoYW5nZXMsXG4gICAgdmVyaWZ5T2JzZXJ2YWJsZSxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlU3RhdGUsIHR5cGUgSU9ic2VydmFibGUgfSBmcm9tICcuL2NvbW1vbic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBJbnRlcm5hbFByb3BzIHtcbiAgICBzdGF0ZTogT2JzZXJ2YWJsZVN0YXRlO1xuICAgIGNoYW5nZWQ6IGJvb2xlYW47XG4gICAgcmVhZG9ubHkgY2hhbmdlTWFwOiBNYXA8UHJvcGVydHlLZXksIGFueT47XG4gICAgcmVhZG9ubHkgYnJva2VyOiBFdmVudEJyb2tlclByb3h5PGFueT47XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9wcm94eUhhbmRsZXI6IFByb3h5SGFuZGxlcjxPYnNlcnZhYmxlT2JqZWN0PiA9IHtcbiAgICBzZXQodGFyZ2V0OiBBY2Nlc3NpYmxlPE9ic2VydmFibGVPYmplY3Q+LCBwLCB2YWx1ZSwgcmVjZWl2ZXIpIHtcbiAgICAgICAgaWYgKCFpc1N0cmluZyhwKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3Quc2V0KHRhcmdldCwgcCwgdmFsdWUsIHJlY2VpdmVyKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtwXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gdGFyZ2V0W19pbnRlcm5hbF0uc3RhdGUgJiYgdmFsdWUgIT09IG9sZFZhbHVlKSB7XG4gICAgICAgICAgICB0YXJnZXRbX3N0b2NrQ2hhbmdlXShwLCBvbGRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFJlZmxlY3Quc2V0KHRhcmdldCwgcCwgdmFsdWUsIHJlY2VpdmVyKTtcbiAgICB9LFxufTtcbk9iamVjdC5mcmVlemUoX3Byb3h5SGFuZGxlcik7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBPYnNlcnZhYmxlIGtleSB0eXBlIGRlZmluaXRpb24uXG4gKiBAamEg6LO86Kqt5Y+v6IO944Gq44Kt44O844Gu5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIE9ic2VydmFibGVLZXlzPFQgZXh0ZW5kcyBPYnNlcnZhYmxlT2JqZWN0PiA9IE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxUPjtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSBvYmplY3QgY2xhc3Mgd2hpY2ggY2hhbmdlIGNhbiBiZSBvYnNlcnZlZC5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7lpInmm7TjgpLnm6PoppbjgafjgY3jgovjgqrjg5bjgrjjgqfjgq/jg4jjgq/jg6njgrlcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogLSBCYXNpYyBVc2FnZVxuICpcbiAqIGBgYHRzXG4gKiBjbGFzcyBFeGFtcGxlIGV4dGVuZHMgT2JzZXJ2YWJsZU9iamVjdCB7XG4gKiAgIHB1YmxpYyBhOiBudW1iZXIgPSAwO1xuICogICBwdWJsaWMgYjogbnVtYmVyID0gMDtcbiAqICAgcHVibGljIGdldCBzdW0oKTogbnVtYmVyIHtcbiAqICAgICAgIHJldHVybiB0aGlzLmEgKyB0aGlzLmI7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBvYnNlcnZhYmxlID0gbmV3IEV4YW1wbGUoKTtcbiAqXG4gKiBmdW5jdGlvbiBvbk51bUNoYW5nZShuZXdWYWx1ZTogbnVtYmVyLCBvbGRWYWx1ZTogbnVtYmVyLCBrZXk6IHN0cmluZykge1xuICogICBjb25zb2xlLmxvZyhgJHtrZXl9IGNoYW5nZWQgZnJvbSAke29sZFZhbHVlfSB0byAke25ld1ZhbHVlfS5gKTtcbiAqIH1cbiAqIG9ic2VydmFibGUub24oWydhJywgJ2InXSwgb25OdW1DaGFuZ2UpO1xuICpcbiAqIC8vIHVwZGF0ZVxuICogb2JzZXJ2YWJsZS5hID0gMTAwO1xuICogb2JzZXJ2YWJsZS5iID0gMjAwO1xuICpcbiAqIC8vIGNvbnNvbGUgb3V0IGZyb20gYGFzeW5jYCBldmVudCBsb29wLlxuICogLy8gPT4gJ2EgY2hhbmdlZCBmcm9tIDAgdG8gMTAwLidcbiAqIC8vID0+ICdiIGNoYW5nZWQgZnJvbSAwIHRvIDIwMC4nXG4gKlxuICogOlxuICpcbiAqIGZ1bmN0aW9uIG9uU3VtQ2hhbmdlKG5ld1ZhbHVlOiBudW1iZXIsIG9sZFZhbHVlOiBudW1iZXIpIHtcbiAqICAgY29uc29sZS5sb2coYHN1bSBjaGFuZ2VkIGZyb20gJHtvbGRWYWx1ZX0gdG8gJHtuZXdWYXVlfS5gKTtcbiAqIH1cbiAqIG9ic2VydmFibGUub24oJ3N1bScsIG9uU3VtQ2hhbmdlKTtcbiAqXG4gKiAvLyB1cGRhdGVcbiAqIG9ic2VydmFibGUuYSA9IDEwMDsgLy8gbm90aGluZyByZWFjdGlvbiBiZWNhdXNlIG9mIG5vIGNoYW5nZSBwcm9wZXJ0aWVzLlxuICogb2JzZXJ2YWJsZS5hID0gMjAwO1xuICpcbiAqIC8vIGNvbnNvbGUgb3V0IGZyb20gYGFzeW5jYCBldmVudCBsb29wLlxuICogLy8gPT4gJ3N1bSBjaGFuZ2VkIGZyb20gMzAwIHRvIDQwMC4nXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIE9ic2VydmFibGVPYmplY3QgaW1wbGVtZW50cyBJT2JzZXJ2YWJsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19pbnRlcm5hbF0hOiBJbnRlcm5hbFByb3BzO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBzdGF0ZS4gZGVmYXVsdDoge0BsaW5rIE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgfCBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFfVxuICAgICAqICAtIGBqYWAg5Yid5pyf54q25oWLIOaXouWumjoge0BsaW5rIE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgfCBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFfVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHN0YXRlID0gT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBPYnNlcnZhYmxlT2JqZWN0LCB0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWw6IEludGVybmFsUHJvcHMgPSB7XG4gICAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICAgIGNoYW5nZWQ6IGZhbHNlLFxuICAgICAgICAgICAgY2hhbmdlTWFwOiBuZXcgTWFwKCksXG4gICAgICAgICAgICBicm9rZXI6IG5ldyBFdmVudEJyb2tlclByb3h5PHRoaXM+KCksXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBfaW50ZXJuYWwsIHsgdmFsdWU6IE9iamVjdC5zZWFsKGludGVybmFsKSB9KTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eSh0aGlzLCBfcHJveHlIYW5kbGVyKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJT2JzZXJ2YWJsZVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBwcm9wZXJ0eSBjaGFuZ2VzLlxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlpInmm7Tos7zoqq3oqK3lrpogKOWFqOODl+ODreODkeODhuOCo+ebo+imlilcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0eVxuICAgICAqICAtIGBlbmAgd2lsZCBjb3JkIHNpZ25hdHVyZS5cbiAgICAgKiAgLSBgamFgIOODr+OCpOODq+ODieOCq+ODvOODiVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIHByb3BlcnR5IGNoYW5nZS5cbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uKHByb3BlcnR5OiAnQCcsIGxpc3RlbmVyOiAoY29udGV4dDogT2JzZXJ2YWJsZU9iamVjdCkgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgcHJvcGVydHkgY2hhbmdlKHMpLlxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlpInmm7Tos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0eVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44OX44Ot44OR44OG44KjXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgcHJvcGVydHkgY2hhbmdlLlxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb248SyBleHRlbmRzIE9ic2VydmFibGVLZXlzPHRoaXM+Pihwcm9wZXJ0eTogSyB8IEtbXSwgbGlzdGVuZXI6IChuZXdWYWx1ZTogdGhpc1tLXSwgb2xkVmFsdWU6IHRoaXNbS10sIGtleTogSykgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbjtcblxuICAgIG9uPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk6IEsgfCBLW10sIGxpc3RlbmVyOiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCB7IGNoYW5nZU1hcCwgYnJva2VyIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGJyb2tlci5nZXQoKS5vbihwcm9wZXJ0eSwgbGlzdGVuZXIpO1xuICAgICAgICBpZiAoMCA8IGNoYW5nZU1hcC5zaXplKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wcyA9IGlzQXJyYXkocHJvcGVydHkpID8gcHJvcGVydHkgOiBbcHJvcGVydHldO1xuICAgICAgICAgICAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BzKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlTWFwLmhhcyhwcm9wKSB8fCBjaGFuZ2VNYXAuc2V0KHByb3AsIHRoaXNbcHJvcF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIHByb3BlcnR5IGNoYW5nZXMpXG4gICAgICogQGphIOODl+ODreODkeODhuOCo+WkieabtOizvOiqreino+mZpCAo5YWo44OX44Ot44OR44OG44Kj55uj6KaWKVxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnR5XG4gICAgICogIC0gYGVuYCB3aWxkIGNvcmQgc2lnbmF0dXJlLlxuICAgICAqICAtIGBqYWAg44Ov44Kk44Or44OJ44Kr44O844OJXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgcHJvcGVydHkgY2hhbmdlLlxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb2ZmKHByb3BlcnR5OiAnQCcsIGxpc3RlbmVyPzogKGNvbnRleHQ6IE9ic2VydmFibGVPYmplY3QpID0+IGFueSk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgcHJvcGVydHkgY2hhbmdlKHMpLlxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlpInmm7Tos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0eVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5LlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBldmVyeXRoaW5nIGlzIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44OX44Ot44OR44OG44KjXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/jgZnjgbnjgabop6PpmaRcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBwcm9wZXJ0eSBjaGFuZ2UuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lkIzkuIAgYGNoYW5uZWxgIOOBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIG9mZjxLIGV4dGVuZHMgT2JzZXJ2YWJsZUtleXM8dGhpcz4+KHByb3BlcnR5PzogSyB8IEtbXSwgbGlzdGVuZXI/OiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IHVua25vd24pOiB2b2lkO1xuXG4gICAgb2ZmPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk/OiBLIHwgS1tdLCBsaXN0ZW5lcj86IChuZXdWYWx1ZTogdGhpc1tLXSwgb2xkVmFsdWU6IHRoaXNbS10sIGtleTogSykgPT4gdW5rbm93bik6IHZvaWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uYnJva2VyLmdldCgpLm9mZihwcm9wZXJ0eSwgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdXNwZW5kIG9yIGRpc2FibGUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jgrXjgrnjg5rjg7Pjg4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub1JlY29yZFxuICAgICAqICAtIGBlbmAgYHRydWVgOiBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMgYW5kIGNsZWFyIGNoYW5nZXMuIC8gYGZhbHNlYDogcHJvcGVydHkgY2hhbmdlcyBhcmUgcmVjb3JkZWQgYW5kIGZpcmVkIHdoZW4ge0BsaW5rIHJlc3VtZX0oKSBjYWxsZGVkLiAoZGVmYXVsdClcbiAgICAgKiAgLSBgamFgIGB0cnVlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044KC6KiY6Yyy44Gb44GaLCDnj77lnKjjga7oqJjpjLLjgoLnoLTmo4QgLyBgZmFsc2VgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7Tjga/oqJjpjLLjgZXjgowsIHtAbGluayByZXN1bWV9KCkg5pmC44Gr55m654Gr44GZ44KLICjml6LlrpopXG4gICAgICovXG4gICAgc3VzcGVuZChub1JlY29yZCA9IGZhbHNlKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHRoaXNbX2ludGVybmFsXS5zdGF0ZSA9IG5vUmVjb3JkID8gT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEIDogT2JzZXJ2YWJsZVN0YXRlLlNVU0VQTkRFRDtcbiAgICAgICAgaWYgKG5vUmVjb3JkKSB7XG4gICAgICAgICAgICB0aGlzW19pbnRlcm5hbF0uY2hhbmdlTWFwLmNsZWFyKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc3VtZSB0aGUgZXZlbnQgb2JzZXJ2YXRpb24gc3RhdGUuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreeKtuaFi+OBruODquOCuOODpeODvOODoFxuICAgICAqL1xuICAgIHJlc3VtZSgpOiB0aGlzIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgaW50ZXJuYWwuc3RhdGUgPSBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHRoaXNbX25vdGlmeUNoYW5nZXNdKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBvYnNlcnZhdGlvbiBzdGF0ZVxuICAgICAqIEBqYSDos7zoqq3lj6/og73nirbmhYtcbiAgICAgKi9cbiAgICBnZXRPYnNlcnZhYmxlU3RhdGUoKTogT2JzZXJ2YWJsZVN0YXRlIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2ludGVybmFsXS5zdGF0ZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJT2JzZXJ2YWJsZUV2ZW50QnJva2VyQWNjZXNzXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgZ2V0QnJva2VyKCk6IEV2ZW50QnJva2VyPE5vbkZ1bmN0aW9uUHJvcGVydGllczx0aGlzPj4ge1xuICAgICAgICBjb25zdCB7IGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICByZXR1cm4gYnJva2VyLmdldCgpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHN0YXRpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSB7QGxpbmsgT2JzZXJ2YWJsZU9iamVjdH0gZnJvbSBhbnkgb2JqZWN0LlxuICAgICAqIEBqYSDku7vmhI/jga7jgqrjg5bjgrjjgqfjgq/jg4jjgYvjgokge0BsaW5rIE9ic2VydmFibGVPYmplY3R9IOOCkueUn+aIkFxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBjb25zdCBvYnNlcnZhYmxlID0gT2JzZXJ2YWJsZU9iamVjdC5mcm9tKHsgYTogMSwgYjogMSB9KTtcbiAgICAgKiBmdW5jdGlvbiBvbk51bUNoYW5nZShuZXdWYWx1ZTogbnVtYmVyLCBvbGRWYWx1ZTogbnVtYmVyLCBrZXk6IHN0cmluZykge1xuICAgICAqICAgY29uc29sZS5sb2coYCR7a2V5fSBjaGFuZ2VkIGZyb20gJHtvbGRWYWx1ZX0gdG8gJHtuZXdWYWx1ZX0uYCk7XG4gICAgICogfVxuICAgICAqIG9ic2VydmFibGUub24oWydhJywgJ2InXSwgb25OdW1DaGFuZ2UpO1xuICAgICAqXG4gICAgICogLy8gdXBkYXRlXG4gICAgICogb2JzZXJ2YWJsZS5hID0gMTAwO1xuICAgICAqIG9ic2VydmFibGUuYiA9IDIwMDtcbiAgICAgKlxuICAgICAqIC8vIGNvbnNvbGUgb3V0IGZyb20gYGFzeW5jYCBldmVudCBsb29wLlxuICAgICAqIC8vID0+ICdhIGNoYW5nZWQgZnJvbSAxIHRvIDEwMC4nXG4gICAgICogLy8gPT4gJ2IgY2hhbmdlZCBmcm9tIDEgdG8gMjAwLidcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIG9iamVjdD4oc3JjOiBUKTogT2JzZXJ2YWJsZU9iamVjdCAmIFQge1xuICAgICAgICBjb25zdCBvYnNlcnZhYmxlID0gZGVlcE1lcmdlKG5ldyBjbGFzcyBleHRlbmRzIE9ic2VydmFibGVPYmplY3QgeyB9KE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCksIHNyYyk7XG4gICAgICAgIG9ic2VydmFibGUucmVzdW1lKCk7XG4gICAgICAgIHJldHVybiBvYnNlcnZhYmxlIGFzIGFueTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcm90ZWN0ZWQgbWVodG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBGb3JjZSBub3RpZnkgcHJvcGVydHkgY2hhbmdlKHMpIGluIHNwaXRlIG9mIGFjdGl2ZSBzdGF0ZS5cbiAgICAgKiBAamEg44Ki44Kv44OG44Kj44OW54q25oWL44Gr44GL44GL44KP44KJ44Ga5by35Yi255qE44Gr44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44KS55m66KGMXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG5vdGlmeSguLi5wcm9wZXJ0aWVzOiBzdHJpbmdbXSk6IHZvaWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBpZiAoMCA9PT0gcHJvcGVydGllcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgY2hhbmdlTWFwIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IGtleVZhbHVlID0gbmV3IE1hcDxQcm9wZXJ0eUtleSwgW2FueSwgYW55XT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgcHJvcGVydGllcykge1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSAodGhpcyBhcyBVbmtub3duT2JqZWN0KVtrZXldO1xuICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBjaGFuZ2VNYXAuaGFzKGtleSkgPyBjaGFuZ2VNYXAuZ2V0KGtleSkgOiBuZXdWYWx1ZTtcbiAgICAgICAgICAgIGtleVZhbHVlLnNldChrZXksIFtuZXdWYWx1ZSwgb2xkVmFsdWVdKTtcbiAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGhpcywga2V5KSkge1xuICAgICAgICAgICAgICAgIHRoaXNbX2ludGVybmFsXS5jaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXNbX25vdGlmeV0oa2V5VmFsdWUpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWVodG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfc3RvY2tDaGFuZ2VdKHA6IHN0cmluZywgb2xkVmFsdWU6IGFueSk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCBjaGFuZ2VNYXAsIGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uY2hhbmdlZCA9IHRydWU7XG4gICAgICAgIGlmICgwID09PSBjaGFuZ2VNYXAuc2l6ZSkge1xuICAgICAgICAgICAgY2hhbmdlTWFwLnNldChwLCBvbGRWYWx1ZSk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGsgb2YgYnJva2VyLmdldCgpLmNoYW5uZWxzKCkpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VNYXAuaGFzKGspIHx8IGNoYW5nZU1hcC5zZXQoaywgKHRoaXMgYXMgVW5rbm93bk9iamVjdClba10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgPT09IHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHRoaXNbX25vdGlmeUNoYW5nZXNdKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2hhbmdlTWFwLmhhcyhwKSB8fCBjaGFuZ2VNYXAuc2V0KHAsIG9sZFZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfbm90aWZ5Q2hhbmdlc10oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgc3RhdGUsIGNoYW5nZU1hcCB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSAhPT0gc3RhdGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBrZXlWYWx1ZVBhaXJzID0gbmV3IE1hcDxQcm9wZXJ0eUtleSwgW2FueSwgYW55XT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCBvbGRWYWx1ZV0gb2YgY2hhbmdlTWFwKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJWYWx1ZSA9ICh0aGlzIGFzIFVua25vd25PYmplY3QpW2tleV07XG4gICAgICAgICAgICBpZiAoIWRlZXBFcXVhbChvbGRWYWx1ZSwgY3VyVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAga2V5VmFsdWVQYWlycy5zZXQoa2V5LCBbY3VyVmFsdWUsIG9sZFZhbHVlXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpc1tfbm90aWZ5XShrZXlWYWx1ZVBhaXJzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeV0oa2V5VmFsdWU6IE1hcDxQcm9wZXJ0eUtleSwgW2FueSwgYW55XT4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBjaGFuZ2VkLCBjaGFuZ2VNYXAsIGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjaGFuZ2VNYXAuY2xlYXIoKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmNoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgZXZlbnRCcm9rZXIgPSBicm9rZXIuZ2V0KCk7XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVzXSBvZiBrZXlWYWx1ZSkge1xuICAgICAgICAgICAgKGV2ZW50QnJva2VyIGFzIGFueSkudHJpZ2dlcihrZXksIC4uLnZhbHVlcywga2V5KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hhbmdlZCkge1xuICAgICAgICAgICAgZXZlbnRCcm9rZXIudHJpZ2dlcignQCcsIHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBwcmVmZXItcmVzdC1wYXJhbXMsXG4gKi9cblxuaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICB0eXBlIEFjY2Vzc2libGUsXG4gICAgdHlwZSBXcml0YWJsZSxcbiAgICBpc051bWJlcixcbiAgICB2ZXJpZnksXG4gICAgcG9zdCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgU3Vic2NyaXB0aW9uLCBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgRXZlbnRCcm9rZXJQcm94eSxcbiAgICBfaW50ZXJuYWwsXG4gICAgX25vdGlmeSxcbiAgICBfc3RvY2tDaGFuZ2UsXG4gICAgX25vdGlmeUNoYW5nZXMsXG4gICAgdmVyaWZ5T2JzZXJ2YWJsZSxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlU3RhdGUsIHR5cGUgSU9ic2VydmFibGUgfSBmcm9tICcuL2NvbW1vbic7XG5cbi8qKlxuICogQGVuIEFycmF5IGNoYW5nZSB0eXBlIGluZm9ybWF0aW9uLiA8YnI+XG4gKiAgICAgVGhlIHZhbHVlIGlzIHN1aXRhYmxlIGZvciB0aGUgbnVtYmVyIG9mIGZsdWN0dWF0aW9uIG9mIHRoZSBlbGVtZW50LlxuICogQGphIOmFjeWIl+WkieabtOmAmuefpeOBruOCv+OCpOODlyA8YnI+XG4gKiAgICAg5YCk44Gv6KaB57Sg44Gu5aKX5rib5pWw44Gr55u45b2TXG4gKlxuICovXG5leHBvcnQgY29uc3QgZW51bSBBcnJheUNoYW5nZVR5cGUge1xuICAgIFJFTU9WRSA9IC0xLFxuICAgIFVQREFURSA9IDAsXG4gICAgSU5TRVJUID0gMSxcbn1cblxuLyoqXG4gKiBAZW4gQXJyYXkgY2hhbmdlIHJlY29yZCBpbmZvcm1hdGlvbi5cbiAqIEBqYSDphY3liJflpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcnJheUNoYW5nZVJlY29yZDxUPiB7XG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBjaGFuZ2UgdHlwZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAamEg6YWN5YiX5aSJ5pu05oOF5aCx44Gu6K2Y5Yil5a2QXG4gICAgICovXG4gICAgcmVhZG9ubHkgdHlwZTogQXJyYXlDaGFuZ2VUeXBlO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBjaGFuZ2UgdHlwZSBpbmZvcm1hdGlvbi4gPGJyPlxuICAgICAqICAgICDigLsgW0F0dGVudGlvbl0gVGhlIGluZGV4IHdpbGwgYmUgZGlmZmVyZW50IGZyb20gdGhlIGFjdHVhbCBsb2NhdGlvbiB3aGVuIGFycmF5IHNpemUgY2hhbmdlZCBiZWNhdXNlIHRoYXQgZGV0ZXJtaW5lcyBlbGVtZW50IG9wZXJhdGlvbiB1bml0LlxuICAgICAqIEBqYSDlpInmm7TjgYznmbrnlJ/jgZfjgZ/phY3liJflhoXjga7kvY3nva7jga4gaW5kZXggPGJyPlxuICAgICAqICAgICDigLsgW+azqOaEj10g44Kq44Oa44Os44O844K344On44Oz5Y2Y5L2N44GuIGluZGV4IOOBqOOBquOCiiwg6KaB57Sg44GM5aKX5rib44GZ44KL5aC05ZCI44Gv5a6f6Zqb44Gu5L2N572u44Go55Ww44Gq44KL44GT44Go44GM44GC44KLXG4gICAgICovXG4gICAgcmVhZG9ubHkgaW5kZXg6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBOZXcgZWxlbWVudCdzIHZhbHVlLlxuICAgICAqIEBqYSDopoHntKDjga7mlrDjgZfjgYTlgKRcbiAgICAgKi9cbiAgICByZWFkb25seSBuZXdWYWx1ZT86IFQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gT2xkIGVsZW1lbnQncyB2YWx1ZS5cbiAgICAgKiBAamEg6KaB57Sg44Gu5Y+k44GE5YCkXG4gICAgICovXG4gICAgcmVhZG9ubHkgb2xkVmFsdWU/OiBUO1xufVxudHlwZSBNdXRhYmxlQ2hhbmdlUmVjb3JkPFQ+ID0gV3JpdGFibGU8QXJyYXlDaGFuZ2VSZWNvcmQ8VD4+O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIElBcnJheUNoYW5nZUV2ZW50PFQ+IHtcbiAgICAnQCc6IFtBcnJheUNoYW5nZVJlY29yZDxUPltdXTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEludGVybmFsUHJvcHM8VCA9IHVua25vd24+IHtcbiAgICBzdGF0ZTogT2JzZXJ2YWJsZVN0YXRlO1xuICAgIGJ5TWV0aG9kOiBib29sZWFuO1xuICAgIHJlY29yZHM6IE11dGFibGVDaGFuZ2VSZWNvcmQ8VD5bXTtcbiAgICByZWFkb25seSBpbmRleGVzOiBTZXQ8bnVtYmVyPjtcbiAgICByZWFkb25seSBicm9rZXI6IEV2ZW50QnJva2VyUHJveHk8SUFycmF5Q2hhbmdlRXZlbnQ8VD4+O1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcHJveHlIYW5kbGVyOiBQcm94eUhhbmRsZXI8T2JzZXJ2YWJsZUFycmF5PiA9IHtcbiAgICBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQ6IEFjY2Vzc2libGU8T2JzZXJ2YWJsZUFycmF5LCBudW1iZXI+LCBwLCBhdHRyaWJ1dGVzKSB7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGFyZ2V0W19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgPT09IGludGVybmFsLnN0YXRlIHx8IGludGVybmFsLmJ5TWV0aG9kIHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYXR0cmlidXRlcywgJ3ZhbHVlJykpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXRbcF07XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gYXR0cmlidXRlcy52YWx1ZTtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGVxZXFlcVxuICAgICAgICBpZiAoJ2xlbmd0aCcgPT09IHAgJiYgbmV3VmFsdWUgIT0gb2xkVmFsdWUpIHsgLy8gRG8gTk9UIHVzZSBzdHJpY3QgaW5lcXVhbGl0eSAoIT09KVxuICAgICAgICAgICAgY29uc3Qgb2xkTGVuZ3RoID0gb2xkVmFsdWUgPj4+IDA7XG4gICAgICAgICAgICBjb25zdCBuZXdMZW5ndGggPSBuZXdWYWx1ZSA+Pj4gMDtcbiAgICAgICAgICAgIGNvbnN0IHN0b2NrID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmFwID0gbmV3TGVuZ3RoIDwgb2xkTGVuZ3RoICYmIHRhcmdldC5zbGljZShuZXdMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGlmIChzY3JhcCkgeyAvLyBuZXdMZW5ndGggPCBvbGRMZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IG9sZExlbmd0aDsgLS1pID49IG5ld0xlbmd0aDspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFtfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5SRU1PVkUsIGksIHVuZGVmaW5lZCwgc2NyYXBbaSAtIG5ld0xlbmd0aF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgICAgIC8vIG9sZExlbmd0aCA8IG5ld0xlbmd0aFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gb2xkTGVuZ3RoOyBpIDwgbmV3TGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFtfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGkgLyosIHVuZGVmaW5lZCwgdW5kZWZpbmVkICovKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcyk7XG4gICAgICAgICAgICByZXN1bHQgJiYgc3RvY2soKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSBpZiAobmV3VmFsdWUgIT09IG9sZFZhbHVlICYmIGlzVmFsaWRBcnJheUluZGV4KHApKSB7XG4gICAgICAgICAgICBjb25zdCBpID0gcCBhcyB1bmtub3duIGFzIG51bWJlciA+Pj4gMDtcbiAgICAgICAgICAgIGNvbnN0IHR5cGU6IEFycmF5Q2hhbmdlVHlwZSA9IE51bWJlcihpID49IHRhcmdldC5sZW5ndGgpOyAvLyBJTlNFUlQgb3IgVVBEQVRFXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcyk7XG4gICAgICAgICAgICByZXN1bHQgJiYgdGFyZ2V0W19zdG9ja0NoYW5nZV0odHlwZSwgaSwgbmV3VmFsdWUsIG9sZFZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHAsIGF0dHJpYnV0ZXMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBkZWxldGVQcm9wZXJ0eSh0YXJnZXQ6IEFjY2Vzc2libGU8T2JzZXJ2YWJsZUFycmF5LCBudW1iZXI+LCBwKSB7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGFyZ2V0W19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgPT09IGludGVybmFsLnN0YXRlIHx8IGludGVybmFsLmJ5TWV0aG9kIHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGFyZ2V0LCBwKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVsZXRlUHJvcGVydHkodGFyZ2V0LCBwKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtwXTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gUmVmbGVjdC5kZWxldGVQcm9wZXJ0eSh0YXJnZXQsIHApO1xuICAgICAgICByZXN1bHQgJiYgaXNWYWxpZEFycmF5SW5kZXgocCkgJiYgdGFyZ2V0W19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlVQREFURSwgcCBhcyB1bmtub3duIGFzIG51bWJlciA+Pj4gMCwgdW5kZWZpbmVkLCBvbGRWYWx1ZSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbn07XG5PYmplY3QuZnJlZXplKF9wcm94eUhhbmRsZXIpO1xuXG4vKiogQGludGVybmFsIHZhbGlkIGFycmF5IGluZGV4IGhlbHBlciAqL1xuZnVuY3Rpb24gaXNWYWxpZEFycmF5SW5kZXg8VD4oaW5kZXg6IFQpOiBib29sZWFuIHtcbiAgICBjb25zdCBzID0gU3RyaW5nKGluZGV4KTtcbiAgICBjb25zdCBuID0gTWF0aC50cnVuYyhzIGFzIHVua25vd24gYXMgbnVtYmVyKTtcbiAgICByZXR1cm4gU3RyaW5nKG4pID09PSBzICYmIDAgPD0gbiAmJiBuIDwgMHhGRkZGRkZGRjtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGluZGV4IG1hbmFnZW1lbnQgKi9cbmZ1bmN0aW9uIGZpbmRSZWxhdGVkQ2hhbmdlSW5kZXg8VD4ocmVjb3JkczogTXV0YWJsZUNoYW5nZVJlY29yZDxUPltdLCB0eXBlOiBBcnJheUNoYW5nZVR5cGUsIGluZGV4OiBudW1iZXIpOiBudW1iZXIge1xuICAgIGNvbnN0IGNoZWNrVHlwZSA9IHR5cGUgPT09IEFycmF5Q2hhbmdlVHlwZS5JTlNFUlRcbiAgICAgICAgPyAodDogQXJyYXlDaGFuZ2VUeXBlKSA9PiB0ID09PSBBcnJheUNoYW5nZVR5cGUuUkVNT1ZFXG4gICAgICAgIDogKHQ6IEFycmF5Q2hhbmdlVHlwZSkgPT4gdCAhPT0gQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRVxuICAgICAgICA7XG5cbiAgICBmb3IgKGxldCBpID0gcmVjb3Jkcy5sZW5ndGg7IC0taSA+PSAwOykge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHJlY29yZHNbaV07XG4gICAgICAgIGlmICh2YWx1ZS5pbmRleCA9PT0gaW5kZXggJiYgY2hlY2tUeXBlKHZhbHVlLnR5cGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZS5pbmRleCA8IGluZGV4ICYmIEJvb2xlYW4odmFsdWUudHlwZSkpIHsgLy8gUkVNT1ZFIG9yIElOU0VSVFxuICAgICAgICAgICAgaW5kZXggLT0gdmFsdWUudHlwZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgYXJyYXkgY2xhc3Mgd2hpY2ggY2hhbmdlIGNhbiBiZSBvYnNlcnZlZC5cbiAqIEBqYSDlpInmm7Tnm6Poppblj6/og73jgarphY3liJfjgq/jg6njgrlcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogLSBCYXNpYyBVc2FnZVxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBvYnNBcnJheSA9IE9ic2VydmFibGVBcnJheS5mcm9tKFsnYScsICdiJywgJ2MnXSk7XG4gKlxuICogZnVuY3Rpb24gb25DaGFuZ2VBcnJheShyZWNvcmRzOiBBcnJheUNoYW5nZVJlY29yZFtdKSB7XG4gKiAgIGNvbnNvbGUubG9nKHJlY29yZHMpO1xuICogICAvLyAgW1xuICogICAvLyAgICB7IHR5cGU6IDEsIGluZGV4OiAzLCBuZXdWYWx1ZTogJ3gnLCBvbGRWYWx1ZTogdW5kZWZpbmVkIH0sXG4gKiAgIC8vICAgIHsgdHlwZTogMSwgaW5kZXg6IDQsIG5ld1ZhbHVlOiAneScsIG9sZFZhbHVlOiB1bmRlZmluZWQgfSxcbiAqICAgLy8gICAgeyB0eXBlOiAxLCBpbmRleDogNSwgbmV3VmFsdWU6ICd6Jywgb2xkVmFsdWU6IHVuZGVmaW5lZCB9XG4gKiAgIC8vICBdXG4gKiB9XG4gKiBvYnNBcnJheS5vbihvbkNoYW5nZUFycmF5KTtcbiAqXG4gKiBmdW5jdGlvbiBhZGRYWVooKSB7XG4gKiAgIG9ic0FycmF5LnB1c2goJ3gnLCAneScsICd6Jyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIE9ic2VydmFibGVBcnJheTxUID0gdW5rbm93bj4gZXh0ZW5kcyBBcnJheTxUPiBpbXBsZW1lbnRzIElPYnNlcnZhYmxlIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWRlY2xhcmF0aW9uLW1lcmdpbmdcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX2ludGVybmFsXSE6IEludGVybmFsUHJvcHM8VD47XG5cbiAgICAvKiogQGZpbmFsIGNvbnN0cnVjdG9yICovXG4gICAgcHJpdmF0ZSBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAgICAgICAgdmVyaWZ5KCdpbnN0YW5jZU9mJywgT2JzZXJ2YWJsZUFycmF5LCB0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWw6IEludGVybmFsUHJvcHM8VD4gPSB7XG4gICAgICAgICAgICBzdGF0ZTogT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSxcbiAgICAgICAgICAgIGJ5TWV0aG9kOiBmYWxzZSxcbiAgICAgICAgICAgIHJlY29yZHM6IFtdLFxuICAgICAgICAgICAgaW5kZXhlczogbmV3IFNldCgpLFxuICAgICAgICAgICAgYnJva2VyOiBuZXcgRXZlbnRCcm9rZXJQcm94eTxJQXJyYXlDaGFuZ2VFdmVudDxUPj4oKSxcbiAgICAgICAgfTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIF9pbnRlcm5hbCwgeyB2YWx1ZTogT2JqZWN0LnNlYWwoaW50ZXJuYWwpIH0pO1xuICAgICAgICBjb25zdCBhcmdMZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBpZiAoMSA9PT0gYXJnTGVuZ3RoICYmIGlzTnVtYmVyKGFyZ3VtZW50c1swXSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGxlbiA9IGFyZ3VtZW50c1swXSA+Pj4gMDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLklOU0VSVCwgaSAvKiwgdW5kZWZpbmVkICovKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgwIDwgYXJnTGVuZ3RoKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ0xlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGksIGFyZ3VtZW50c1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eSh0aGlzLCBfcHJveHlIYW5kbGVyKSBhcyBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSU9ic2VydmFibGVcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgYXJyYXkgY2hhbmdlKHMpLlxuICAgICAqIEBqYSDphY3liJflpInmm7Tos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGFycmF5IGNoYW5nZS5cbiAgICAgKiAgLSBgamFgIOmFjeWIl+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uKGxpc3RlbmVyOiAocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSkgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzW19pbnRlcm5hbF0uYnJva2VyLmdldCgpLm9uKCdAJywgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBhcnJheSBjaGFuZ2UocykuXG4gICAgICogQGphIOmFjeWIl+WkieabtOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYXJyYXkgY2hhbmdlLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOmFjeWIl+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvZmYobGlzdGVuZXI/OiAocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSkgPT4gdW5rbm93bik6IHZvaWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uYnJva2VyLmdldCgpLm9mZignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3VzcGVuZCBvciBkaXNhYmxlIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44K144K544Oa44Oz44OJXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm9SZWNvcmRcbiAgICAgKiAgLSBgZW5gIGB0cnVlYDogbm90IHJlY29yZGluZyBwcm9wZXJ0eSBjaGFuZ2VzIGFuZCBjbGVhciBjaGFuZ2VzLiAvIGBmYWxzZWA6IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkIGFuZCBmaXJlZCB3aGVuIHtAbGluayByZXN1bWV9KCkgY2FsbGRlZC4gKGRlZmF1bHQpXG4gICAgICogIC0gYGphYCBgdHJ1ZWA6IOODl+ODreODkeODhuOCo+WkieabtOOCguiomOmMsuOBm+OBmiwg54++5Zyo44Gu6KiY6Yyy44KC56C05qOEIC8gYGZhbHNlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044Gv6KiY6Yyy44GV44KMLCB7QGxpbmsgcmVzdW1lfSgpIOaZguOBq+eZuueBq+OBmeOCiyAo5pei5a6aKVxuICAgICAqL1xuICAgIHN1c3BlbmQobm9SZWNvcmQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uc3RhdGUgPSBub1JlY29yZCA/IE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA6IE9ic2VydmFibGVTdGF0ZS5TVVNFUE5ERUQ7XG4gICAgICAgIGlmIChub1JlY29yZCkge1xuICAgICAgICAgICAgdGhpc1tfaW50ZXJuYWxdLnJlY29yZHMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzdW1lIG9mIHRoZSBldmVudCBzdWJzY3JpcHRpb24gc3RhdGUuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreeKtuaFi+OBruODquOCuOODpeODvOODoFxuICAgICAqL1xuICAgIHJlc3VtZSgpOiB0aGlzIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgaW50ZXJuYWwuc3RhdGUgPSBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHRoaXNbX25vdGlmeUNoYW5nZXNdKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBvYnNlcnZhdGlvbiBzdGF0ZVxuICAgICAqIEBqYSDos7zoqq3lj6/og73nirbmhYtcbiAgICAgKi9cbiAgICBnZXRPYnNlcnZhYmxlU3RhdGUoKTogT2JzZXJ2YWJsZVN0YXRlIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2ludGVybmFsXS5zdGF0ZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTogQXJyYXkgbWV0aG9kc1xuXG4gICAgLyoqXG4gICAgICogU29ydHMgYW4gYXJyYXkuXG4gICAgICogQHBhcmFtIGNvbXBhcmVGbiBUaGUgbmFtZSBvZiB0aGUgZnVuY3Rpb24gdXNlZCB0byBkZXRlcm1pbmUgdGhlIG9yZGVyIG9mIHRoZSBlbGVtZW50cy4gSWYgb21pdHRlZCwgdGhlIGVsZW1lbnRzIGFyZSBzb3J0ZWQgaW4gYXNjZW5kaW5nLCBBU0NJSSBjaGFyYWN0ZXIgb3JkZXIuXG4gICAgICovXG4gICAgc29ydChjb21wYXJhdG9yPzogKGxoczogVCwgcmhzOiBUKSA9PiBudW1iZXIpOiB0aGlzIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IG9sZCA9IEFycmF5LmZyb20odGhpcyk7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc3VwZXIuc29ydChjb21wYXJhdG9yKTtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSBmYWxzZTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGxlbiA9IG9sZC5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBvbGRbaV07XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSB0aGlzW2ldO1xuICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZSAhPT0gb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5VUERBVEUsIGksIG5ld1ZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBlbGVtZW50cyBmcm9tIGFuIGFycmF5IGFuZCwgaWYgbmVjZXNzYXJ5LCBpbnNlcnRzIG5ldyBlbGVtZW50cyBpbiB0aGVpciBwbGFjZSwgcmV0dXJuaW5nIHRoZSBkZWxldGVkIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSBzdGFydCBUaGUgemVyby1iYXNlZCBsb2NhdGlvbiBpbiB0aGUgYXJyYXkgZnJvbSB3aGljaCB0byBzdGFydCByZW1vdmluZyBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gZGVsZXRlQ291bnQgVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZW1vdmUuXG4gICAgICovXG4gICAgc3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50PzogbnVtYmVyKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgZWxlbWVudHMgZnJvbSBhbiBhcnJheSBhbmQsIGlmIG5lY2Vzc2FyeSwgaW5zZXJ0cyBuZXcgZWxlbWVudHMgaW4gdGhlaXIgcGxhY2UsIHJldHVybmluZyB0aGUgZGVsZXRlZCBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gc3RhcnQgVGhlIHplcm8tYmFzZWQgbG9jYXRpb24gaW4gdGhlIGFycmF5IGZyb20gd2hpY2ggdG8gc3RhcnQgcmVtb3ZpbmcgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIGRlbGV0ZUNvdW50IFRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmVtb3ZlLlxuICAgICAqIEBwYXJhbSBpdGVtcyBFbGVtZW50cyB0byBpbnNlcnQgaW50byB0aGUgYXJyYXkgaW4gcGxhY2Ugb2YgdGhlIGRlbGV0ZWQgZWxlbWVudHMuXG4gICAgICovXG4gICAgc3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50OiBudW1iZXIsIC4uLml0ZW1zOiBUW10pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgc3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50PzogbnVtYmVyLCAuLi5pdGVtczogVFtdKTogT2JzZXJ2YWJsZUFycmF5PFQ+IHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IG9sZExlbiA9IHRoaXMubGVuZ3RoO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IChzdXBlci5zcGxpY2UgYXMgVW5rbm93bkZ1bmN0aW9uKSguLi5hcmd1bWVudHMpIGFzIE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSBmYWxzZTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIHN0YXJ0ID0gTWF0aC50cnVuYyhzdGFydCk7XG4gICAgICAgICAgICBjb25zdCBmcm9tID0gc3RhcnQgPCAwID8gTWF0aC5tYXgob2xkTGVuICsgc3RhcnQsIDApIDogTWF0aC5taW4oc3RhcnQsIG9sZExlbik7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gcmVzdWx0Lmxlbmd0aDsgLS1pID49IDA7KSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5SRU1PVkUsIGZyb20gKyBpLCB1bmRlZmluZWQsIHJlc3VsdFtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBsZW4gPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGZyb20gKyBpLCBpdGVtc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIHRoZSBmaXJzdCBlbGVtZW50IGZyb20gYW4gYXJyYXkgYW5kIHJldHVybnMgaXQuXG4gICAgICovXG4gICAgc2hpZnQoKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCBvbGRMZW4gPSB0aGlzLmxlbmd0aDtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSB0cnVlO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzdXBlci5zaGlmdCgpO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IGZhbHNlO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSBpbnRlcm5hbC5zdGF0ZSAmJiB0aGlzLmxlbmd0aCA8IG9sZExlbikge1xuICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5SRU1PVkUsIDAsIHVuZGVmaW5lZCwgcmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluc2VydHMgbmV3IGVsZW1lbnRzIGF0IHRoZSBzdGFydCBvZiBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0gaXRlbXMgIEVsZW1lbnRzIHRvIGluc2VydCBhdCB0aGUgc3RhcnQgb2YgdGhlIEFycmF5LlxuICAgICAqL1xuICAgIHVuc2hpZnQoLi4uaXRlbXM6IFRbXSk6IG51bWJlciB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLnVuc2hpZnQoLi4uaXRlbXMpO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IGZhbHNlO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgbGVuID0gaXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuSU5TRVJULCBpLCBpdGVtc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxscyBhIGRlZmluZWQgY2FsbGJhY2sgZnVuY3Rpb24gb24gZWFjaCBlbGVtZW50IG9mIGFuIGFycmF5LCBhbmQgcmV0dXJucyBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIHRoZSByZXN1bHRzLlxuICAgICAqIEBwYXJhbSBjYWxsYmFja2ZuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIHVwIHRvIHRocmVlIGFyZ3VtZW50cy4gVGhlIG1hcCBtZXRob2QgY2FsbHMgdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24gb25lIHRpbWUgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgYXJyYXkuXG4gICAgICogQHBhcmFtIHRoaXNBcmcgQW4gb2JqZWN0IHRvIHdoaWNoIHRoZSB0aGlzIGtleXdvcmQgY2FuIHJlZmVyIGluIHRoZSBjYWxsYmFja2ZuIGZ1bmN0aW9uLiBJZiB0aGlzQXJnIGlzIG9taXR0ZWQsIHVuZGVmaW5lZCBpcyB1c2VkIGFzIHRoZSB0aGlzIHZhbHVlLlxuICAgICAqL1xuICAgIG1hcDxVPihjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUsIHRoaXNBcmc/OiB1bmtub3duKTogT2JzZXJ2YWJsZUFycmF5PFU+IHtcbiAgICAgICAgLypcbiAgICAgICAgICogW05PVEVdIG9yaWdpbmFsIGltcGxlbWVudCBpcyB2ZXJ5IHZlcnkgaGlnaC1jb3N0LlxuICAgICAgICAgKiAgICAgICAgc28gaXQncyBjb252ZXJ0ZWQgbmF0aXZlIEFycmF5IG9uY2UsIGFuZCByZXN0b3JlZC5cbiAgICAgICAgICpcbiAgICAgICAgICogcmV0dXJuIChzdXBlci5tYXAgYXMgVW5rbm93bkZ1bmN0aW9uKSguLi5hcmd1bWVudHMpO1xuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIE9ic2VydmFibGVBcnJheS5mcm9tKFsuLi50aGlzXS5tYXAoY2FsbGJhY2tmbiwgdGhpc0FyZykpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElPYnNlcnZhYmxlRXZlbnRCcm9rZXJBY2Nlc3NcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBnZXRCcm9rZXIoKTogRXZlbnRCcm9rZXI8SUFycmF5Q2hhbmdlRXZlbnQ8VD4+IHtcbiAgICAgICAgY29uc3QgeyBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgcmV0dXJuIGJyb2tlci5nZXQoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1laHRvZHM6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX3N0b2NrQ2hhbmdlXSh0eXBlOiBBcnJheUNoYW5nZVR5cGUsIGluZGV4OiBudW1iZXIsIG5ld1ZhbHVlPzogVCwgb2xkVmFsdWU/OiBUKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgc3RhdGUsIGluZGV4ZXMsIHJlY29yZHMgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY29uc3QgcmNpID0gaW5kZXhlcy5oYXMoaW5kZXgpID8gZmluZFJlbGF0ZWRDaGFuZ2VJbmRleChyZWNvcmRzLCB0eXBlLCBpbmRleCkgOiAtMTtcbiAgICAgICAgY29uc3QgbGVuID0gcmVjb3Jkcy5sZW5ndGg7XG4gICAgICAgIGlmIChyY2kgPj0gMCkge1xuICAgICAgICAgICAgY29uc3QgcmN0ID0gcmVjb3Jkc1tyY2ldLnR5cGU7XG4gICAgICAgICAgICBpZiAoIXJjdCAvKiBVUERBVEUgKi8pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcmV2UmVjb3JkID0gcmVjb3Jkcy5zcGxpY2UocmNpLCAxKVswXTtcbiAgICAgICAgICAgICAgICAvLyBVUERBVEUgPT4gVVBEQVRFIDogVVBEQVRFXG4gICAgICAgICAgICAgICAgLy8gVVBEQVRFID0+IFJFTU9WRSA6IElOU0VSVFxuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXSh0eXBlLCBpbmRleCwgbmV3VmFsdWUsIHByZXZSZWNvcmQub2xkVmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCByLCBpID0gbGVuOyAtLWkgPiByY2k7KSB7XG4gICAgICAgICAgICAgICAgICAgIHIgPSByZWNvcmRzW2ldO1xuICAgICAgICAgICAgICAgICAgICAoci5pbmRleCA+PSBpbmRleCkgJiYgKHIuaW5kZXggLT0gcmN0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgcHJldlJlY29yZCA9IHJlY29yZHMuc3BsaWNlKHJjaSwgMSlbMF07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGUgIT09IEFycmF5Q2hhbmdlVHlwZS5SRU1PVkUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSU5TRVJUID0+IFVQREFURSA6IElOU0VSVFxuICAgICAgICAgICAgICAgICAgICAvLyBSRU1PVkUgPT4gSU5TRVJUIDogVVBEQVRFXG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShOdW1iZXIoIXR5cGUpLCBpbmRleCwgbmV3VmFsdWUsIHByZXZSZWNvcmQub2xkVmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpbmRleGVzLmFkZChpbmRleCk7XG4gICAgICAgIHJlY29yZHNbbGVuXSA9IHsgdHlwZSwgaW5kZXgsIG5ld1ZhbHVlLCBvbGRWYWx1ZSB9O1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSA9PT0gc3RhdGUgJiYgMCA9PT0gbGVuKSB7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4gdGhpc1tfbm90aWZ5Q2hhbmdlc10oKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeUNoYW5nZXNdKCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCByZWNvcmRzIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFICE9PSBzdGF0ZSB8fCAwID09PSByZWNvcmRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgciBvZiByZWNvcmRzKSB7XG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKHIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXNbX25vdGlmeV0oT2JqZWN0LmZyZWV6ZShyZWNvcmRzKSBhcyBBcnJheUNoYW5nZVJlY29yZDxUPltdKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLnJlY29yZHMgPSBbXTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeV0ocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSk6IHZvaWQge1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaW50ZXJuYWwuaW5kZXhlcy5jbGVhcigpO1xuICAgICAgICBpbnRlcm5hbC5icm9rZXIuZ2V0KCkudHJpZ2dlcignQCcsIHJlY29yZHMpO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogT3ZlcnJpZGUgcmV0dXJuIHR5cGUgb2YgcHJvdG90eXBlIG1ldGhvZHNcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBPYnNlcnZhYmxlQXJyYXk8VD4ge1xuICAgIC8qKlxuICAgICAqIENvbWJpbmVzIHR3byBvciBtb3JlIGFycmF5cy5cbiAgICAgKiBAcGFyYW0gaXRlbXMgQWRkaXRpb25hbCBpdGVtcyB0byBhZGQgdG8gdGhlIGVuZCBvZiBhcnJheTEuXG4gICAgICovXG4gICAgY29uY2F0KC4uLml0ZW1zOiBUW11bXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBDb21iaW5lcyB0d28gb3IgbW9yZSBhcnJheXMuXG4gICAgICogQHBhcmFtIGl0ZW1zIEFkZGl0aW9uYWwgaXRlbXMgdG8gYWRkIHRvIHRoZSBlbmQgb2YgYXJyYXkxLlxuICAgICAqL1xuICAgIGNvbmNhdCguLi5pdGVtczogKFQgfCBUW10pW10pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogUmV2ZXJzZXMgdGhlIGVsZW1lbnRzIGluIGFuIEFycmF5LlxuICAgICAqL1xuICAgIHJldmVyc2UoKTogdGhpcztcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgc2VjdGlvbiBvZiBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0gc3RhcnQgVGhlIGJlZ2lubmluZyBvZiB0aGUgc3BlY2lmaWVkIHBvcnRpb24gb2YgdGhlIGFycmF5LlxuICAgICAqIEBwYXJhbSBlbmQgVGhlIGVuZCBvZiB0aGUgc3BlY2lmaWVkIHBvcnRpb24gb2YgdGhlIGFycmF5LlxuICAgICAqL1xuICAgIHNsaWNlKHN0YXJ0PzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZWxlbWVudHMgb2YgYW4gYXJyYXkgdGhhdCBtZWV0IHRoZSBjb25kaXRpb24gc3BlY2lmaWVkIGluIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIGNhbGxiYWNrZm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdXAgdG8gdGhyZWUgYXJndW1lbnRzLiBUaGUgZmlsdGVyIG1ldGhvZCBjYWxscyB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbiBvbmUgdGltZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBBbiBvYmplY3QgdG8gd2hpY2ggdGhlIHRoaXMga2V5d29yZCBjYW4gcmVmZXIgaW4gdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24uIElmIHRoaXNBcmcgaXMgb21pdHRlZCwgdW5kZWZpbmVkIGlzIHVzZWQgYXMgdGhlIHRoaXMgdmFsdWUuXG4gICAgICovXG4gICAgZmlsdGVyPFMgZXh0ZW5kcyBUPihjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHZhbHVlIGlzIFMsIHRoaXNBcmc/OiB1bmtub3duKTogT2JzZXJ2YWJsZUFycmF5PFM+O1xuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGVsZW1lbnRzIG9mIGFuIGFycmF5IHRoYXQgbWVldCB0aGUgY29uZGl0aW9uIHNwZWNpZmllZCBpbiBhIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqIEBwYXJhbSBjYWxsYmFja2ZuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIHVwIHRvIHRocmVlIGFyZ3VtZW50cy4gVGhlIGZpbHRlciBtZXRob2QgY2FsbHMgdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24gb25lIHRpbWUgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgYXJyYXkuXG4gICAgICogQHBhcmFtIHRoaXNBcmcgQW4gb2JqZWN0IHRvIHdoaWNoIHRoZSB0aGlzIGtleXdvcmQgY2FuIHJlZmVyIGluIHRoZSBjYWxsYmFja2ZuIGZ1bmN0aW9uLiBJZiB0aGlzQXJnIGlzIG9taXR0ZWQsIHVuZGVmaW5lZCBpcyB1c2VkIGFzIHRoZSB0aGlzIHZhbHVlLlxuICAgICAqL1xuICAgIGZpbHRlcihjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHVua25vd24sIHRoaXNBcmc/OiB1bmtub3duKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xufVxuXG4vKipcbiAqIE92ZXJyaWRlIHJldHVybiB0eXBlIG9mIHN0YXRpYyBtZXRob2RzXG4gKi9cbmV4cG9ydCBkZWNsYXJlIG5hbWVzcGFjZSBPYnNlcnZhYmxlQXJyYXkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvYmplY3QuXG4gICAgICogQHBhcmFtIGFycmF5TGlrZSBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZyb208VD4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4gfCBJdGVyYWJsZTxUPik6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvYmplY3QuXG4gICAgICogQHBhcmFtIGFycmF5TGlrZSBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSBtYXBmbiBBIG1hcHBpbmcgZnVuY3Rpb24gdG8gY2FsbCBvbiBldmVyeSBlbGVtZW50IG9mIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBWYWx1ZSBvZiAndGhpcycgdXNlZCB0byBpbnZva2UgdGhlIG1hcGZuLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZyb208VCwgVT4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4gfCBJdGVyYWJsZTxUPiwgbWFwZm46ICh0aGlzOiB2b2lkLCB2OiBULCBrOiBudW1iZXIpID0+IFUsIHRoaXNBcmc/OiB1bmRlZmluZWQpOiBPYnNlcnZhYmxlQXJyYXk8VT47XG4gICAgZnVuY3Rpb24gZnJvbTxYLCBULCBVPihhcnJheUxpa2U6IEFycmF5TGlrZTxUPiB8IEl0ZXJhYmxlPFQ+LCBtYXBmbjogKHRoaXM6IFgsIHY6IFQsIGs6IG51bWJlcikgPT4gVSwgdGhpc0FyZzogWCk6IE9ic2VydmFibGVBcnJheTxVPjtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgbmV3IGFycmF5IGZyb20gYSBzZXQgb2YgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIGl0ZW1zIEEgc2V0IG9mIGVsZW1lbnRzIHRvIGluY2x1ZGUgaW4gdGhlIG5ldyBhcnJheSBvYmplY3QuXG4gICAgICovXG4gICAgZnVuY3Rpb24gb2Y8VD4oLi4uaXRlbXM6IFRbXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWR1cGxpY2F0ZS1lbnVtLXZhbHVlcyxcbiAqL1xuXG4vKlxuICogTk9URTog5YaF6YOo44Oi44K444Ol44O844Or44GrIGBDRFBgIG5hbWVzcGFjZSDjgpLkvb/nlKjjgZfjgabjgZfjgb7jgYbjgagsIOWklumDqOODouOCuOODpeODvOODq+OBp+OBr+Wuo+iogOOBp+OBjeOBquOBj+OBquOCiy5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvOTYxMVxuICovXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgLyoqXG4gICAgICogQGVuIENvbnN0YW50IGRlZmluaXRpb24gYWJvdXQgcmFuZ2Ugb2YgdGhlIHJlc3VsdCBjb2RlLlxuICAgICAqIEBqYSDjg6rjgrbjg6vjg4jjgrPjg7zjg4njga7nr4Tlm7LjgavplqLjgZnjgovlrprmlbDlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgY29uc3QgZW51bSBSRVNVTFRfQ09ERV9SQU5HRSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gVGhlIGFzc2lnbmFibGUgcmFuZ2UgZm9yIHRoZSBjbGllbnQncyBsb2NhbCByZXN1bHQgY29yZCBieSB3aGljaCBleHBhbnNpb24gaXMgcG9zc2libGUuXG4gICAgICAgICAqIEBqYSDjgq/jg6njgqTjgqLjg7Pjg4jjgYzmi6HlvLXlj6/og73jgarjg63jg7zjgqvjg6vjg6rjgrbjg6vjg4jjgrPjg7zjg4njga7jgqLjgrXjgqTjg7Plj6/og73poJjln59cbiAgICAgICAgICovXG4gICAgICAgIE1BWCA9IDEwMDAsXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gUmVzZXJ2ZWQgcmFuZ2Ugb2YgZnJhbWV3b3JrLlxuICAgICAgICAgKiBAamEg44OV44Os44O844Og44Ov44O844Kv44Gu5LqI57SE6aCY5Z+fXG4gICAgICAgICAqL1xuICAgICAgICBSRVNFUlZFRCA9IDEwMDAsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBhc3NpZ25tZW50IHJhbmdlIGd1aWRlbGluZSBkZWZpbml0aW9uIHVzZWQgaW4gdGhlIG1vZHVsZS5cbiAgICAgKiBAamEg44Oi44K444Ol44O844Or5YaF44Gn5L2/55So44GZ44KL44Ki44K144Kk44Oz6aCY5Z+f44Ks44Kk44OJ44Op44Kk44Oz5a6a5pWw5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGNvbnN0IGVudW0gTE9DQUxfQ09ERV9SQU5HRV9HVUlERSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gVGhlIGFzc2lnbm1lbnQgcmFuZ2UgZ3VpZGVsaW5lIHBlciAxIG1vZHVsZS5cbiAgICAgICAgICogQGphIDHjg6Ljgrjjg6Xjg7zjg6vlvZPjgZ/jgorjgavlibLjgorlvZPjgabjgovjgqLjgrXjgqTjg7PpoJjln5/jgqzjgqTjg4njg6njgqTjg7NcbiAgICAgICAgICovXG4gICAgICAgIE1PRFVMRSA9IDEwMCxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBUaGUgYXNzaWdubWVudCByYW5nZSBndWlkZWxpbmUgcGVyIDEgZnVuY3Rpb24uXG4gICAgICAgICAqIEBqYSAx5qmf6IO95b2T44Gf44KK44Gr5Ymy44KK5b2T44Gm44KL44Ki44K144Kk44Oz6aCY5Z+f44Ks44Kk44OJ44Op44Kk44OzXG4gICAgICAgICAqL1xuICAgICAgICBGVU5DVElPTiA9IDIwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBPZmZzZXQgdmFsdWUgZW51bWVyYXRpb24gZm9yIHtAbGluayBSRVNVTFRfQ09ERX0uIDxicj5cbiAgICAgKiAgICAgVGhlIGNsaWVudCBjYW4gZXhwYW5kIGEgZGVmaW5pdGlvbiBpbiBvdGhlciBtb2R1bGUuXG4gICAgICogQGphIHtAbGluayBSRVNVTFRfQ09ERX0g44Gu44Kq44OV44K744OD44OI5YCkIDxicj5cbiAgICAgKiAgICAg44Ko44Op44O844Kz44O844OJ5a++5b+c44GZ44KL44Oi44K444Ol44O844Or5YaF44GnIOWumue+qeOCkuaLoeW8teOBmeOCiy5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgKiAgICAgIENPTU1PTiAgICAgID0gMCxcbiAgICAgKiAgICAgIFNPTUVNT0RVTEUgID0gMSAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgICogICAgICBTT01FTU9EVUxFMiA9IDIgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgICAqICB9XG4gICAgICpcbiAgICAgKiAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAqICAgICAgU09NRU1PRFVMRV9ERUNMQVJFICAgICAgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSwgLy8gZm9yIGF2b2lkIFRTMjQzMi5cbiAgICAgKiAgICAgIEVSUk9SX1NPTUVNT0RVTEVfVU5FWFBFQ1RFRCAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5TT01FTU9EVUxFLCBMT0NBTF9DT0RFX0JBU0UuU09NRU1PRFVMRSArIDEsIFwiZXJyb3IgdW5leHBlY3RlZC5cIiksXG4gICAgICogICAgICBFUlJPUl9TT01FTU9EVUxFX0lOVkFMSURfQVJHID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuU09NRU1PRFVMRSwgTE9DQUxfQ09ERV9CQVNFLlNPTUVNT0RVTEUgKyAyLCBcImludmFsaWQgYXJndW1lbnRzLlwiKSxcbiAgICAgKiAgfVxuICAgICAqICBBU1NJR05fUkVTVUxUX0NPREUoUkVTVUxUX0NPREUpO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGV4cG9ydCBjb25zdCBlbnVtIFJFU1VMVF9DT0RFX0JBU0Uge1xuICAgICAgICBERUNMQVJFID0gOTAwNzE5OTI1NDc0MDk5MSwgLy8gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVJcbiAgICAgICAgQ09NTU9OICA9IDAsXG4gICAgICAgIENEUCAgICAgPSAxICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5NT0RVTEUsIC8vIGNkcCByZXNlcnZlZC4gYWJzKDAg772eIDEwMDApXG4vLyAgICAgIE1PRFVMRV9BID0gMSAqIFJFU1VMVF9DT0RFX1JBTkdFLk1BWCwgICAgLy8gZXgpIG1vZHVsZUE6IGFicygxMDAxIO+9niAxOTk5KVxuLy8gICAgICBNT0RVTEVfQiA9IDIgKiBSRVNVTFRfQ09ERV9SQU5HRS5NQVgsICAgIC8vIGV4KSBtb2R1bGVCOiBhYnMoMjAwMSDvvZ4gMjk5OSlcbi8vICAgICAgTU9EVUxFX0MgPSAzICogUkVTVUxUX0NPREVfUkFOR0UuTUFYLCAgICAvLyBleCkgbW9kdWxlQzogYWJzKDMwMDEg772eIDM5OTkpXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEtub3duIENEUCBtb2R1bGUgb2ZmZXN0IGRlZmluaXRpb24uXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCiyBDRFAg44Oi44K444Ol44O844Or44Gu44Kq44OV44K744OD44OI5a6a576pXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgKiAgICBBSkFYID0gQ0RQX0tOT1dOX01PRFVMRS5BSkFYICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICogICBBSkFYX0RFQ0xBUkUgICAgICAgID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAqICAgRVJST1JfQUpBWF9SRVNQT05TRSA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkFKQVggKyAxLCAnbmV0d29yayBlcnJvci4nKSxcbiAgICAgKiAgIEVSUk9SX0FKQVhfVElNRU9VVCAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMiwgJ3JlcXVlc3QgdGltZW91dC4nKSxcbiAgICAgKiB9XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZXhwb3J0IGNvbnN0IGVudW0gQ0RQX0tOT1dOX01PRFVMRSB7XG4gICAgICAgIC8qKiBgQGNkcC9hamF4YCAqL1xuICAgICAgICBBSkFYID0gMSxcbiAgICAgICAgLyoqIGBAY2RwL2kxOG5gICovXG4gICAgICAgIEkxOE4gPSAyLFxuICAgICAgICAvKiogYEBjZHAvZGF0YS1zeW5jYCwgYEBjZHAvbW9kZWxgLCBgQGNkcC9jb2xsZWN0aW9uYCwgYEBjZHAvdmlld2AsIGBAY2RwL3JvdXRlcmAgKi9cbiAgICAgICAgTVZDICA9IDMsXG4gICAgICAgIC8qKiBgQGNkcC9hcHBgICovXG4gICAgICAgIEFQUCAgPSA0LFxuICAgICAgICAvKiogb2Zmc2V0IGZvciB1bmtub3duIG1vZHVsZSAqL1xuICAgICAgICBPRkZTRVQsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENvbW1vbiByZXN1bHQgY29kZSBmb3IgdGhlIGFwcGxpY2F0aW9uLlxuICAgICAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7PlhajkvZPjgafkvb/nlKjjgZnjgovlhbHpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIC8qKiBgZW5gIGdlbmVyYWwgc3VjY2VzcyBjb2RlICAgICAgICAgICAgIDxicj4gYGphYCDmsY7nlKjmiJDlip/jgrPjg7zjg4kgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgIFNVQ0NFU1MgPSAwLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIGNhbmNlbCBjb2RlICAgICAgICAgICAgICA8YnI+IGBqYWAg5rGO55So44Kt44Oj44Oz44K744Or44Kz44O844OJICAgICAgICAgICAgICAgICAqL1xuICAgICAgICBBQk9SVCA9IDEsXG4gICAgICAgIC8qKiBgZW5gIGdlbmVyYWwgcGVuZGluZyBjb2RlICAgICAgICAgICAgIDxicj4gYGphYCDmsY7nlKjjgqrjg5rjg6zjg7zjgrfjg6fjg7PmnKrlrp/ooYzjgqjjg6njg7zjgrPjg7zjg4kgKi9cbiAgICAgICAgUEVORElORyA9IDIsXG4gICAgICAgIC8qKiBgZW5gIGdlbmVyYWwgc3VjY2VzcyBidXQgbm9vcCBjb2RlICAgIDxicj4gYGphYCDmsY7nlKjlrp/ooYzkuI3opoHjgrPjg7zjg4kgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgTk9PUCA9IDMsXG4gICAgICAgIC8qKiBgZW5gIGdlbmVyYWwgZXJyb3IgY29kZSAgICAgICAgICAgICAgIDxicj4gYGphYCDmsY7nlKjjgqjjg6njg7zjgrPjg7zjg4kgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICBGQUlMID0gLTEsXG4gICAgICAgIC8qKiBgZW5gIGdlbmVyYWwgZmF0YWwgZXJyb3IgY29kZSAgICAgICAgIDxicj4gYGphYCDmsY7nlKjoh7Tlkb3nmoTjgqjjg6njg7zjgrPjg7zjg4kgICAgICAgICAgICAgICAqL1xuICAgICAgICBGQVRBTCA9IC0yLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIG5vdCBzdXBwb3J0ZWQgZXJyb3IgY29kZSA8YnI+IGBqYWAg5rGO55So44Kq44Oa44Os44O844K344On44Oz44Ko44Op44O844Kz44O844OJICAgICAgICovXG4gICAgICAgIE5PVF9TVVBQT1JURUQgPSAtMyxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXNzaWduIGRlY2xhcmVkIHtAbGluayBSRVNVTFRfQ09ERX0gdG8gcm9vdCBlbnVtZXJhdGlvbi5cbiAgICAgKiAgICAgKEl0J3MgZW5hYmxlIHRvIG1lcmdlIGVudW0gaW4gdGhlIG1vZHVsZSBzeXN0ZW0gZW52aXJvbm1lbnQuKVxuICAgICAqIEBqYSDmi6HlvLXjgZfjgZ8ge0BsaW5rIFJFU1VMVF9DT0RFfSDjgpIg44Or44O844OIIGVudW0g44Gr44Ki44K144Kk44OzXG4gICAgICogICAgIOODouOCuOODpeODvOODq+OCt+OCueODhuODoOeSsOWig+OBq+OBiuOBhOOBpuOCguOAgWVudW0g44KS44Oe44O844K444KS5Y+v6IO944Gr44GZ44KLXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIEFTU0lHTl9SRVNVTFRfQ09ERShleHRlbmQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24oUkVTVUxUX0NPREUsIGV4dGVuZCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIGNvbnN0IF9jb2RlMm1lc3NhZ2U6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAgICcwJzogJ29wZXJhdGlvbiBzdWNjZWVkZWQuJyxcbiAgICAgICAgJzEnOiAnb3BlcmF0aW9uIGFib3J0ZWQuJyxcbiAgICAgICAgJzInOiAnb3BlcmF0aW9uIHBlbmRpbmcuJyxcbiAgICAgICAgJzMnOiAnbm8gb3BlcmF0aW9uLicsXG4gICAgICAgICctMSc6ICdvcGVyYXRpb24gZmFpbGVkLicsXG4gICAgICAgICctMic6ICd1bmV4cGVjdGVkIGVycm9yIG9jY3VyZWQuJyxcbiAgICAgICAgJy0zJzogJ29wZXJhdGlvbiBub3Qgc3VwcG9ydGVkLicsXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gZXJyb3IgbWVzc2FnZSBtYXAuXG4gICAgICogQGphIOOCqOODqeODvOODoeODg+OCu+ODvOOCuOODnuODg+ODl+OBruWPluW+l1xuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBFUlJPUl9NRVNTQUdFX01BUCgpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHtcbiAgICAgICAgcmV0dXJuIF9jb2RlMm1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdlbmVyYXRlIHN1Y2Nlc3MgY29kZS5cbiAgICAgKiBAamEg5oiQ5Yqf44Kz44O844OJ44KS55Sf5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYmFzZVxuICAgICAqICAtIGBlbmAgc2V0IGJhc2Ugb2Zmc2V0IGFzIHtAbGluayBSRVNVTFRfQ09ERV9CQVNFfVxuICAgICAqICAtIGBqYWAg44Kq44OV44K744OD44OI5YCk44KSIHtAbGluayBSRVNVTFRfQ09ERV9CQVNFfSDjgajjgZfjgabmjIflrppcbiAgICAgKiBAcGFyYW0gY29kZVxuICAgICAqICAtIGBlbmAgc2V0IGxvY2FsIGNvZGUgZm9yIGRlY2xhcmF0aW9uLiBleCkgJzEnXG4gICAgICogIC0gYGphYCDlrqPoqIDnlKjjga7jg63jg7zjgqvjg6vjgrPjg7zjg4nlgKTjgpLmjIflrpogIOS+iykgJzEnXG4gICAgICogQHBhcmFtIG1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIHNldCBlcnJvciBtZXNzYWdlIGZvciBoZWxwIHN0cmluZy5cbiAgICAgKiAgLSBgamFgIOODmOODq+ODl+OCueODiOODquODs+OCsOeUqOOCqOODqeODvOODoeODg+OCu+ODvOOCuOOCkuaMh+WumlxuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBERUNMQVJFX1NVQ0NFU1NfQ09ERShiYXNlOiBSRVNVTFRfQ09ERV9CQVNFLCBjb2RlOiBudW1iZXIsIG1lc3NhZ2U/OiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gZGVjbGFyZVJlc3VsdENvZGUoYmFzZSwgY29kZSwgbWVzc2FnZSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdlbmVyYXRlIGVycm9yIGNvZGUuXG4gICAgICogQGphIOOCqOODqeODvOOCs+ODvOODieeUn+aIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGJhc2VcbiAgICAgKiAgLSBgZW5gIHNldCBiYXNlIG9mZnNldCBhcyB7QGxpbmsgUkVTVUxUX0NPREVfQkFTRX1cbiAgICAgKiAgLSBgamFgIOOCquODleOCu+ODg+ODiOWApOOCkiB7QGxpbmsgUkVTVUxUX0NPREVfQkFTRX0g44Go44GX44Gm5oyH5a6aXG4gICAgICogQHBhcmFtIGNvZGVcbiAgICAgKiAgLSBgZW5gIHNldCBsb2NhbCBjb2RlIGZvciBkZWNsYXJhdGlvbi4gZXgpICcxJ1xuICAgICAqICAtIGBqYWAg5a6j6KiA55So44Gu44Ot44O844Kr44Or44Kz44O844OJ5YCk44KS5oyH5a6aICDkvospICcxJ1xuICAgICAqIEBwYXJhbSBtZXNzYWdlXG4gICAgICogIC0gYGVuYCBzZXQgZXJyb3IgbWVzc2FnZSBmb3IgaGVscCBzdHJpbmcuXG4gICAgICogIC0gYGphYCDjg5jjg6vjg5fjgrnjg4jjg6rjg7PjgrDnlKjjgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrjjgpLmjIflrppcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gREVDTEFSRV9FUlJPUl9DT0RFKGJhc2U6IFJFU1VMVF9DT0RFX0JBU0UsIGNvZGU6IG51bWJlciwgbWVzc2FnZT86IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBkZWNsYXJlUmVzdWx0Q29kZShiYXNlLCBjb2RlLCBtZXNzYWdlLCBmYWxzZSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBzZWN0aW9uOlxuXG4gICAgLyoqIEBpbnRlcm5hbCByZWdpc3RlciBmb3Ige0BsaW5rIFJFU1VMVF9DT0RFfSAqL1xuICAgIGZ1bmN0aW9uIGRlY2xhcmVSZXN1bHRDb2RlKGJhc2U6IFJFU1VMVF9DT0RFX0JBU0UsIGNvZGU6IG51bWJlciwgbWVzc2FnZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBzdWNjZWVkZWQ6IGJvb2xlYW4pOiBudW1iZXIgfCBuZXZlciB7XG4gICAgICAgIGlmIChjb2RlIDwgMCB8fCBSRVNVTFRfQ09ERV9SQU5HRS5NQVggPD0gY29kZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYGRlY2xhcmVSZXN1bHRDb2RlKCksIGludmFsaWQgbG9jYWwtY29kZSByYW5nZS4gW2NvZGU6ICR7Y29kZX1dYCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2lnbmVkID0gc3VjY2VlZGVkID8gMSA6IC0xO1xuICAgICAgICBjb25zdCByZXN1bHRDb2RlID0gc2lnbmVkICogKGJhc2UgYXMgbnVtYmVyICsgY29kZSk7XG4gICAgICAgIF9jb2RlMm1lc3NhZ2VbcmVzdWx0Q29kZV0gPSBtZXNzYWdlID8/IChgW0NPREU6ICR7cmVzdWx0Q29kZX1dYCk7XG4gICAgICAgIHJldHVybiByZXN1bHRDb2RlO1xuICAgIH1cbn1cbiIsImltcG9ydCBSRVNVTFRfQ09ERSAgICAgICAgICAgICAgPSBDRFBfREVDTEFSRS5SRVNVTFRfQ09ERTtcbmltcG9ydCBSRVNVTFRfQ09ERV9CQVNFICAgICAgICAgPSBDRFBfREVDTEFSRS5SRVNVTFRfQ09ERV9CQVNFO1xuaW1wb3J0IFJFU1VMVF9DT0RFX1JBTkdFICAgICAgICA9IENEUF9ERUNMQVJFLlJFU1VMVF9DT0RFX1JBTkdFO1xuaW1wb3J0IExPQ0FMX0NPREVfUkFOR0VfR1VJREUgICA9IENEUF9ERUNMQVJFLkxPQ0FMX0NPREVfUkFOR0VfR1VJREU7XG5pbXBvcnQgREVDTEFSRV9TVUNDRVNTX0NPREUgICAgID0gQ0RQX0RFQ0xBUkUuREVDTEFSRV9TVUNDRVNTX0NPREU7XG5pbXBvcnQgREVDTEFSRV9FUlJPUl9DT0RFICAgICAgID0gQ0RQX0RFQ0xBUkUuREVDTEFSRV9FUlJPUl9DT0RFO1xuaW1wb3J0IEFTU0lHTl9SRVNVTFRfQ09ERSAgICAgICA9IENEUF9ERUNMQVJFLkFTU0lHTl9SRVNVTFRfQ09ERTtcbmltcG9ydCBFUlJPUl9NRVNTQUdFX01BUCAgICAgICAgPSBDRFBfREVDTEFSRS5FUlJPUl9NRVNTQUdFX01BUDtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBEZXNjcmlwdGlvbiB7XG4gICAgVU5LTk9XTl9FUlJPUl9OQU1FID0gJ1VOS05PV04nLFxufVxuXG5leHBvcnQge1xuICAgIFJFU1VMVF9DT0RFLFxuICAgIFJFU1VMVF9DT0RFX0JBU0UsXG4gICAgUkVTVUxUX0NPREVfUkFOR0UsXG4gICAgTE9DQUxfQ09ERV9SQU5HRV9HVUlERSxcbiAgICBERUNMQVJFX1NVQ0NFU1NfQ09ERSxcbiAgICBERUNMQVJFX0VSUk9SX0NPREUsXG4gICAgQVNTSUdOX1JFU1VMVF9DT0RFLFxufTtcblxuLyoqXG4gKiBAZW4gSnVkZ2UgZmFpbCBvciBub3QuXG4gKiBAamEg5aSx5pWX5Yik5a6aXG4gKlxuICogQHBhcmFtIGNvZGUge0BsaW5rIFJFU1VMVF9DT0RFfVxuICogQHJldHVybnMgdHJ1ZTogZmFpbCByZXN1bHQgLyBmYWxzZTogc3VjY2VzcyByZXN1bHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIEZBSUxFRChjb2RlOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gY29kZSA8IDA7XG59XG5cbi8qKlxuICogQGVuIEp1ZGdlIHN1Y2Nlc3Mgb3Igbm90LlxuICogQGphIOaIkOWKn+WIpOWumlxuICpcbiAqIEBwYXJhbSBjb2RlIHtAbGluayBSRVNVTFRfQ09ERX1cbiAqIEByZXR1cm5zIHRydWU6IHN1Y2Nlc3MgcmVzdWx0IC8gZmFsc2U6IGZhaWwgcmVzdWx0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBTVUNDRUVERUQoY29kZTogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICFGQUlMRUQoY29kZSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8ge0BsaW5rIFJFU1VMVF9DT0RFfSBgbmFtZWAgc3RyaW5nIGZyb20ge0BsaW5rIFJFU1VMVF9DT0RFfS5cbiAqIEBqYSB7QGxpbmsgUkVTVUxUX0NPREV9IOOCkiB7QGxpbmsgUkVTVUxUX0NPREV9IOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBjb2RlIHtAbGluayBSRVNVTFRfQ09ERX1cbiAqIEBwYXJhbSB0YWcgIGN1c3RvbSB0YWcgaWYgbmVlZGVkLlxuICogQHJldHVybnMgbmFtZSBzdHJpbmcgZXgpIFwiW3RhZ11bTk9UX1NVUFBPUlRFRF1cIlxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9OYW1lU3RyaW5nKGNvZGU6IG51bWJlciwgdGFnPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBwcmVmaXggPSB0YWcgPyBgWyR7dGFnfV1gIDogJyc7XG4gICAgaWYgKFJFU1VMVF9DT0RFW2NvZGVdKSB7XG4gICAgICAgIHJldHVybiBgJHtwcmVmaXh9WyR7UkVTVUxUX0NPREVbY29kZV19XWA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGAke3ByZWZpeH1bJHtEZXNjcmlwdGlvbi5VTktOT1dOX0VSUk9SX05BTUV9XWA7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGhlbHAgc3RyaW5nIGZyb20ge0BsaW5rIFJFU1VMVF9DT0RFfS5cbiAqIEBqYSB7QGxpbmsgUkVTVUxUX0NPREV9IOOCkuODmOODq+ODl+OCueODiOODquODs+OCsOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBjb2RlIHtAbGluayBSRVNVTFRfQ09ERX1cbiAqIEByZXR1cm5zIHJlZ2lzdGVyZWQgaGVscCBzdHJpbmdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvSGVscFN0cmluZyhjb2RlOiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IG1hcCA9IEVSUk9SX01FU1NBR0VfTUFQKCk7XG4gICAgaWYgKG1hcFtjb2RlXSkge1xuICAgICAgICByZXR1cm4gbWFwW2NvZGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBgdW5yZWdpc3RlcmVkIHJlc3VsdCBjb2RlLiBbY29kZTogJHtjb2RlfV1gO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgY2xhc3NOYW1lLFxuICAgIGlzTnVsbGlzaCxcbiAgICBpc1N0cmluZyxcbiAgICBpc0NhbmNlbExpa2VFcnJvcixcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgUkVTVUxUX0NPREUsXG4gICAgU1VDQ0VFREVELFxuICAgIEZBSUxFRCxcbiAgICB0b05hbWVTdHJpbmcsXG4gICAgdG9IZWxwU3RyaW5nLFxufSBmcm9tICcuL3Jlc3VsdC1jb2RlJztcblxuY29uc3Qge1xuICAgIC8qKiBAaW50ZXJuYWwgKi8gaXNGaW5pdGU6IGlzTnVtYmVyXG59ID0gTnVtYmVyO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIFRhZyB7XG4gICAgRVJST1IgID0gJ0Vycm9yJyxcbiAgICBSRVNVTFQgPSAnUmVzdWx0Jyxcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZGVzYyA9ICh2YWx1ZTogdW5rbm93bik6IFByb3BlcnR5RGVzY3JpcHRvciA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICB2YWx1ZSxcbiAgICB9O1xufTtcblxuLyoqXG4gKiBAZW4gQSByZXN1bHQgaG9sZGVyIGNsYXNzLiA8YnI+XG4gKiAgICAgRGVyaXZlZCBuYXRpdmUgYEVycm9yYCBjbGFzcy5cbiAqIEBqYSDlh6bnkIbntZDmnpzkvJ3pgZTjgq/jg6njgrkgPGJyPlxuICogICAgIOODjeOCpOODhuOCo+ODliBgRXJyb3JgIOOBrua0vueUn+OCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgUmVzdWx0IGV4dGVuZHMgRXJyb3Ige1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb2RlXG4gICAgICogIC0gYGVuYCByZXN1bHQgY29kZVxuICAgICAqICAtIGBqYWAg57WQ5p6c44Kz44O844OJXG4gICAgICogQHBhcmFtIG1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIHJlc3VsdCBpbmZvIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOe1kOaenOaDheWgseODoeODg+OCu+ODvOOCuFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBlcnJvciBjb25zdHJ1Y3Rpb24gb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44Ko44Op44O85qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29kZT86IG51bWJlciwgbWVzc2FnZT86IHN0cmluZywgb3B0aW9ucz86IEVycm9yT3B0aW9ucykge1xuICAgICAgICBjb2RlID0gaXNOdWxsaXNoKGNvZGUpID8gUkVTVUxUX0NPREUuU1VDQ0VTUyA6IGlzTnVtYmVyKGNvZGUpID8gTWF0aC50cnVuYyhjb2RlKSA6IFJFU1VMVF9DT0RFLkZBSUw7XG4gICAgICAgIHN1cGVyKG1lc3NhZ2UgPz8gdG9IZWxwU3RyaW5nKGNvZGUpLCBvcHRpb25zKTtcbiAgICAgICAgY29uc3QgY2F1c2UgPSBvcHRpb25zPy5jYXVzZTtcbiAgICAgICAgbGV0IHRpbWUgPSBpc0Vycm9yKGNhdXNlKSA/IChjYXVzZSBhcyBSZXN1bHQpLnRpbWUgOiB1bmRlZmluZWQ7XG4gICAgICAgIGlzTnVtYmVyKHRpbWUhKSB8fCAodGltZSA9IERhdGUubm93KCkpO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7IGNvZGU6IGRlc2MoY29kZSksIHRpbWU6IGRlc2ModGltZSksIGNhdXNlOiBkZXNjKGNhdXNlKSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4ge0BsaW5rIFJFU1VMVF9DT0RFfSB2YWx1ZS5cbiAgICAgKiBAamEge0BsaW5rIFJFU1VMVF9DT0RFfSDjga7lgKRcbiAgICAgKi9cbiAgICByZWFkb25seSBjb2RlITogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdlbmVyYXRlZCB0aW1lIGluZm9ybWF0aW9uLlxuICAgICAqIEBqYSDnlJ/miJDjgZXjgozjgZ/mmYLliLvmg4XloLFcbiAgICAgKi9cbiAgICByZWFkb25seSB0aW1lITogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFN0b2NrIGxvdy1sZXZlbCBlcnJvciBpbmZvcm1hdGlvbi5cbiAgICAgKiBAamEg5LiL5L2N44Gu44Ko44Op44O85oOF5aCx44KS5qC857SNXG4gICAgICovXG4gICAgcmVhZG9ubHkgY2F1c2U/OiB1bmtub3duO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEp1ZGdlIHN1Y2NlZWRlZCBvciBub3QuXG4gICAgICogQGphIOaIkOWKn+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc1N1Y2NlZWRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFNVQ0NFRURFRCh0aGlzLmNvZGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBmYWlsZWQgb3Igbm90LlxuICAgICAqIEBqYSDlpLHmlZfliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNGYWlsZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBGQUlMRUQodGhpcy5jb2RlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2UgY2FuY2VsZWQgb3Igbm90LlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjgqjjg6njg7zliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNDYW5jZWxlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29kZSA9PT0gUkVTVUxUX0NPREUuQUJPUlQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBmb3JtYXR0ZWQge0BsaW5rIFJFU1VMVF9DT0RFfSBuYW1lIHN0cmluZy5cbiAgICAgKiBAamEg44OV44Kp44O844Oe44OD44OI44GV44KM44GfIHtAbGluayBSRVNVTFRfQ09ERX0g5ZCN5paH5a2X5YiX44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGNvZGVOYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0b05hbWVTdHJpbmcodGhpcy5jb2RlLCB0aGlzLm5hbWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQge0BsaW5rIFJFU1VMVF9DT0RFfSBoZWxwIHN0cmluZy5cbiAgICAgKiBAamEge0BsaW5rIFJFU1VMVF9DT0RFfSDjga7jg5jjg6vjg5fjgrnjg4jjg6rjg7PjgrDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaGVscCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdG9IZWxwU3RyaW5nKHRoaXMuY29kZSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6IFRhZy5SRVNVTFQge1xuICAgICAgICByZXR1cm4gVGFnLlJFU1VMVDtcbiAgICB9XG59XG5cblJlc3VsdC5wcm90b3R5cGUubmFtZSA9IFRhZy5SRVNVTFQ7XG5cbi8qKiBAaW50ZXJuYSBsUmV0dXJucyBgdHJ1ZWAgaWYgYHhgIGlzIGBFcnJvcmAsIGBmYWxzZWAgb3RoZXJ3aXNlLiAqL1xuZnVuY3Rpb24gaXNFcnJvcih4OiB1bmtub3duKTogeCBpcyBFcnJvciB7XG4gICAgcmV0dXJuIHggaW5zdGFuY2VvZiBFcnJvciB8fCBjbGFzc05hbWUoeCkgPT09IFRhZy5FUlJPUjtcbn1cblxuLyoqIFJldHVybnMgYHRydWVgIGlmIGB4YCBpcyBgUmVzdWx0YCwgYGZhbHNlYCBvdGhlcndpc2UuICovXG5leHBvcnQgZnVuY3Rpb24gaXNSZXN1bHQoeDogdW5rbm93bik6IHggaXMgUmVzdWx0IHtcbiAgICByZXR1cm4geCBpbnN0YW5jZW9mIFJlc3VsdCB8fCBjbGFzc05hbWUoeCkgPT09IFRhZy5SRVNVTFQ7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8ge0BsaW5rIFJlc3VsdH0gb2JqZWN0LlxuICogQGphIHtAbGluayBSZXN1bHR9IOOCquODluOCuOOCp+OCr+ODiOOBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9SZXN1bHQobzogdW5rbm93bik6IFJlc3VsdCB7XG4gICAgaWYgKG8gaW5zdGFuY2VvZiBSZXN1bHQpIHtcbiAgICAgICAgLyogZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHByZWZlci1jb25zdCAqL1xuICAgICAgICBsZXQgeyBjb2RlLCBjYXVzZSwgdGltZSB9ID0gbztcbiAgICAgICAgY29kZSA9IGlzTnVsbGlzaChjb2RlKSA/IFJFU1VMVF9DT0RFLlNVQ0NFU1MgOiBpc051bWJlcihjb2RlKSA/IE1hdGgudHJ1bmMoY29kZSkgOiBSRVNVTFRfQ09ERS5GQUlMO1xuICAgICAgICBpc051bWJlcih0aW1lKSB8fCAodGltZSA9IERhdGUubm93KCkpO1xuICAgICAgICAvLyBEbyBub3RoaW5nIGlmIGFscmVhZHkgZGVmaW5lZFxuICAgICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KG8sICdjb2RlJywgIGRlc2MoY29kZSkpO1xuICAgICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KG8sICd0aW1lJywgIGRlc2ModGltZSkpO1xuICAgICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KG8sICdjYXVzZScsIGRlc2MoY2F1c2UpKTtcbiAgICAgICAgcmV0dXJuIG87XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZSA9IE9iamVjdChvKSBhcyBSZXN1bHQ7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBpc1N0cmluZyhlLm1lc3NhZ2UpID8gZS5tZXNzYWdlIDogaXNTdHJpbmcobykgPyBvIDogdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBjb2RlID0gaXNDYW5jZWxMaWtlRXJyb3IobWVzc2FnZSkgPyBSRVNVTFRfQ09ERS5BQk9SVCA6IGlzTnVtYmVyKGUuY29kZSkgPyBlLmNvZGUgOiBvIGFzIG51bWJlcjtcbiAgICAgICAgY29uc3QgY2F1c2UgPSBpc0Vycm9yKGUuY2F1c2UpID8gZS5jYXVzZSA6IGlzRXJyb3IobykgPyBvIDogaXNTdHJpbmcobykgPyBuZXcgRXJyb3IobykgOiBvO1xuICAgICAgICByZXR1cm4gbmV3IFJlc3VsdChjb2RlLCBtZXNzYWdlLCB7IGNhdXNlIH0pO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIHtAbGluayBSZXN1bHR9IGhlbHBlci5cbiAqIEBqYSB7QGxpbmsgUmVzdWx0fSDjgqrjg5bjgrjjgqfjgq/jg4jmp4vnr4njg5jjg6vjg5Hjg7xcbiAqXG4gKiBAcGFyYW0gY29kZVxuICogIC0gYGVuYCByZXN1bHQgY29kZVxuICogIC0gYGphYCDntZDmnpzjgrPjg7zjg4lcbiAqIEBwYXJhbSBtZXNzYWdlXG4gKiAgLSBgZW5gIHJlc3VsdCBpbmZvIG1lc3NhZ2VcbiAqICAtIGBqYWAg57WQ5p6c5oOF5aCx44Oh44OD44K744O844K4XG4gKiBAcGFyYW0gY2F1c2VcbiAqICAtIGBlbmAgbG93LWxldmVsIGVycm9yIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOS4i+S9jeOBruOCqOODqeODvOaDheWgsVxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZVJlc3VsdChjb2RlOiBudW1iZXIsIG1lc3NhZ2U/OiBzdHJpbmcsIGNhdXNlPzogdW5rbm93bik6IFJlc3VsdCB7XG4gICAgcmV0dXJuIG5ldyBSZXN1bHQoY29kZSwgbWVzc2FnZSwgeyBjYXVzZSB9KTtcbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIGNhbmNlbGVkIHtAbGluayBSZXN1bHR9IGhlbHBlci5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vmg4XloLHmoLzntI0ge0BsaW5rIFJlc3VsdH0g44Kq44OW44K444Kn44Kv44OI5qeL56+J44OY44Or44OR44O8XG4gKlxuICogQHBhcmFtIG1lc3NhZ2VcbiAqICAtIGBlbmAgcmVzdWx0IGluZm8gbWVzc2FnZVxuICogIC0gYGphYCDntZDmnpzmg4XloLHjg6Hjg4Pjgrvjg7zjgrhcbiAqIEBwYXJhbSBjYXVzZVxuICogIC0gYGVuYCBsb3ctbGV2ZWwgZXJyb3IgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5LiL5L2N44Gu44Ko44Op44O85oOF5aCxXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlQ2FuY2VsZWRSZXN1bHQobWVzc2FnZT86IHN0cmluZywgY2F1c2U/OiB1bmtub3duKTogUmVzdWx0IHtcbiAgICByZXR1cm4gbmV3IFJlc3VsdChSRVNVTFRfQ09ERS5BQk9SVCwgbWVzc2FnZSwgeyBjYXVzZSB9KTtcbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBLZXlzLFxuICAgIHR5cGUgVHlwZXMsXG4gICAgdHlwZSBLZXlUb1R5cGUsXG4gICAgYXNzaWduVmFsdWUsXG4gICAgZGVlcEVxdWFsLFxuICAgIGlzRW1wdHlPYmplY3QsXG4gICAgZnJvbVR5cGVkRGF0YSxcbiAgICBkcm9wVW5kZWZpbmVkLFxuICAgIHJlc3RvcmVOdWxsaXNoLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgdHlwZSBTdWJzY3JpcHRpb24sIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIENhbmNlbGFibGUsXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB0eXBlIHtcbiAgICBTdG9yYWdlRGF0YSxcbiAgICBTdG9yYWdlRGF0YVR5cGVMaXN0LFxuICAgIFN0b3JhZ2VJbnB1dERhdGFUeXBlTGlzdCxcbiAgICBJU3RvcmFnZU9wdGlvbnMsXG4gICAgSVN0b3JhZ2VEYXRhT3B0aW9ucyxcbiAgICBJU3RvcmFnZURhdGFSZXR1cm5UeXBlLFxuICAgIElTdG9yYWdlRXZlbnRDYWxsYmFjayxcbiAgICBJU3RvcmFnZSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIE1lbW9yeVN0b3JhZ2UgSS9PIG9wdGlvbnMgKi9cbmV4cG9ydCB0eXBlIE1lbW9yeVN0b3JhZ2VPcHRpb25zPEsgZXh0ZW5kcyBLZXlzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+ID0gS2V5czxTdG9yYWdlRGF0YVR5cGVMaXN0Pj4gPSBJU3RvcmFnZURhdGFPcHRpb25zPFN0b3JhZ2VEYXRhVHlwZUxpc3QsIEs+O1xuLyoqIE1lbW9yeVN0b3JhZ2UgcmV0dXJuIHZhbHVlICovXG5leHBvcnQgdHlwZSBNZW1vcnlTdG9yYWdlUmVzdWx0PEsgZXh0ZW5kcyBLZXlzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+PiA9IEtleVRvVHlwZTxTdG9yYWdlRGF0YVR5cGVMaXN0LCBLPjtcbi8qKiBNZW1vcnlTdG9yYWdlIGRhdGEgdHlwZSAqL1xuZXhwb3J0IHR5cGUgTWVtb3J5U3RvcmFnZURhdGFUeXBlcyA9IFR5cGVzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+O1xuLyoqIE1lbW9yeVN0b3JhZ2UgcmV0dXJuIHR5cGUgKi9cbmV4cG9ydCB0eXBlIE1lbW9yeVN0b3JhZ2VSZXR1cm5UeXBlPEQgZXh0ZW5kcyBNZW1vcnlTdG9yYWdlRGF0YVR5cGVzPiA9IElTdG9yYWdlRGF0YVJldHVyblR5cGU8U3RvcmFnZURhdGFUeXBlTGlzdCwgRD47XG4vKiogTWVtb3J5U3RvcmFnZSBpbnB1dCBkYXRhIHR5cGUgKi9cbmV4cG9ydCB0eXBlIE1lbW9yeVN0b3JhZ2VJbnB1dERhdGFUeXBlcyA9IFN0b3JhZ2VJbnB1dERhdGFUeXBlTGlzdDxTdG9yYWdlRGF0YVR5cGVMaXN0Pjtcbi8qKiBNZW1vcnlTdG9yYWdlIGV2ZW50IGNhbGxiYWNrICovXG5leHBvcnQgdHlwZSBNZW1vcnlTdG9yYWdlRXZlbnRDYWxsYmFjayA9IElTdG9yYWdlRXZlbnRDYWxsYmFjazxTdG9yYWdlRGF0YVR5cGVMaXN0PjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIE1lbW9yeVN0b3JhZ2VFdmVudCB7XG4gICAgJ0AnOiBbc3RyaW5nIHwgbnVsbCwgTWVtb3J5U3RvcmFnZURhdGFUeXBlcyB8IG51bGwsIE1lbW9yeVN0b3JhZ2VEYXRhVHlwZXMgfCBudWxsXTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1lbW9yeSBzdG9yYWdlIGNsYXNzLiBUaGlzIGNsYXNzIGRvZXNuJ3Qgc3VwcG9ydCBwZXJtYW5lY2lhdGlvbiBkYXRhLlxuICogQGphIOODoeODouODquODvOOCueODiOODrOODvOOCuOOCr+ODqeOCuS4g5pys44Kv44Op44K544Gv44OH44O844K/44Gu5rC457aa5YyW44KS44K144Od44O844OI44GX44Gq44GEXG4gKi9cbmV4cG9ydCBjbGFzcyBNZW1vcnlTdG9yYWdlIGltcGxlbWVudHMgSVN0b3JhZ2Uge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Jyb2tlciA9IG5ldyBFdmVudEJyb2tlcjxNZW1vcnlTdG9yYWdlRXZlbnQ+KCk7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgX3N0b3JhZ2U6IFN0b3JhZ2VEYXRhID0ge307XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJU3RvcmFnZVxuXG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBJU3RvcmFnZX0ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIHtAbGluayBJU3RvcmFnZX0g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdtZW1vcnknO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4ga2V5LCBvciBudWxsIGlmIHRoZSBnaXZlbiBrZXkgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QuXG4gICAgICogQGphIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWPluW+ly4g5a2Y5Zyo44GX44Gq44GE5aC05ZCI44GvIG51bGwg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBhY2Nlc3Mga2V5XG4gICAgICogIC0gYGphYCDjgqLjgq/jgrvjgrnjgq3jg7xcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgSS9PIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIEkvTyDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgUmV0dXJucyB0aGUgdmFsdWUgd2hpY2ggY29ycmVzcG9uZHMgdG8gYSBrZXkgd2l0aCB0eXBlIGNoYW5nZSBkZXNpZ25hdGVkIGluIGBkYXRhVHlwZWAuXG4gICAgICogIC0gYGphYCBgZGF0YVR5cGVgIOOBp+aMh+WumuOBleOCjOOBn+Wei+WkieaPm+OCkuihjOOBo+OBpiwg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgZ2V0SXRlbTxEIGV4dGVuZHMgTWVtb3J5U3RvcmFnZURhdGFUeXBlcyA9IE1lbW9yeVN0b3JhZ2VEYXRhVHlwZXM+KFxuICAgICAgICBrZXk6IHN0cmluZyxcbiAgICAgICAgb3B0aW9ucz86IE1lbW9yeVN0b3JhZ2VPcHRpb25zPG5ldmVyPlxuICAgICk6IFByb21pc2U8TWVtb3J5U3RvcmFnZVJldHVyblR5cGU8RD4+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgdGhlIGN1cnJlbnQgdmFsdWUgYXNzb2NpYXRlZCB3aXRoIHRoZSBnaXZlbiBrZXksIG9yIG51bGwgaWYgdGhlIGdpdmVuIGtleSBkb2VzIG5vdCBleGlzdCBpbiB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdC5cbiAgICAgKiBAamEg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS5Y+W5b6XLiDlrZjlnKjjgZfjgarjgYTloLTlkIjjga8gbnVsbCDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIGFjY2VzcyBrZXlcbiAgICAgKiAgLSBgamFgIOOCouOCr+OCu+OCueOCreODvFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBJL08gb3B0aW9uc1xuICAgICAqICAtIGBqYWAgSS9PIOOCquODl+OCt+ODp+ODs1xuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBSZXR1cm5zIHRoZSB2YWx1ZSB3aGljaCBjb3JyZXNwb25kcyB0byBhIGtleSB3aXRoIHR5cGUgY2hhbmdlIGRlc2lnbmF0ZWQgaW4gYGRhdGFUeXBlYC5cbiAgICAgKiAgLSBgamFgIGBkYXRhVHlwZWAg44Gn5oyH5a6a44GV44KM44Gf5Z6L5aSJ5o+b44KS6KGM44Gj44GmLCDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLov5TljbRcbiAgICAgKi9cbiAgICBnZXRJdGVtPEsgZXh0ZW5kcyBLZXlzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+PihcbiAgICAgICAga2V5OiBzdHJpbmcsXG4gICAgICAgIG9wdGlvbnM/OiBNZW1vcnlTdG9yYWdlT3B0aW9uczxLPlxuICAgICk6IFByb21pc2U8TWVtb3J5U3RvcmFnZVJlc3VsdDxLPiB8IG51bGw+O1xuXG4gICAgYXN5bmMgZ2V0SXRlbShrZXk6IHN0cmluZywgb3B0aW9ucz86IE1lbW9yeVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTxNZW1vcnlTdG9yYWdlRGF0YVR5cGVzIHwgbnVsbD4ge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgYXdhaXQgY2Mob3B0aW9ucy5jYW5jZWwpO1xuXG4gICAgICAgIC8vIGB1bmRlZmluZWRgIOKGkiBgbnVsbGBcbiAgICAgICAgY29uc3QgdmFsdWUgPSBkcm9wVW5kZWZpbmVkKHRoaXMuX3N0b3JhZ2Vba2V5XSk7XG4gICAgICAgIHN3aXRjaCAob3B0aW9ucy5kYXRhVHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gZnJvbVR5cGVkRGF0YSh2YWx1ZSkhO1xuICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gTnVtYmVyKHJlc3RvcmVOdWxsaXNoKHZhbHVlKSk7XG4gICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gQm9vbGVhbihyZXN0b3JlTnVsbGlzaCh2YWx1ZSkpO1xuICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gT2JqZWN0KHJlc3RvcmVOdWxsaXNoKHZhbHVlKSk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiByZXN0b3JlTnVsbGlzaCh2YWx1ZSkgYXMgbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXRzIHRoZSB2YWx1ZSBvZiB0aGUgcGFpciBpZGVudGlmaWVkIGJ5IGtleSB0byB2YWx1ZSwgY3JlYXRpbmcgYSBuZXcga2V5L3ZhbHVlIHBhaXIgaWYgbm9uZSBleGlzdGVkIGZvciBrZXkgcHJldmlvdXNseS5cbiAgICAgKiBAamEg44Kt44O844KS5oyH5a6a44GX44Gm5YCk44KS6Kit5a6aLiDlrZjlnKjjgZfjgarjgYTloLTlkIjjga/mlrDopo/jgavkvZzmiJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIGFjY2VzcyBrZXlcbiAgICAgKiAgLSBgamFgIOOCouOCr+OCu+OCueOCreODvFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBJL08gb3B0aW9uc1xuICAgICAqICAtIGBqYWAgSS9PIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHNldEl0ZW08ViBleHRlbmRzIE1lbW9yeVN0b3JhZ2VJbnB1dERhdGFUeXBlcz4oa2V5OiBzdHJpbmcsIHZhbHVlOiBWLCBvcHRpb25zPzogTWVtb3J5U3RvcmFnZU9wdGlvbnM8bmV2ZXI+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zID8/IHt9O1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zLmNhbmNlbCk7XG4gICAgICAgIGNvbnN0IG5ld1ZhbCA9IGRyb3BVbmRlZmluZWQodmFsdWUsIHRydWUpOyAgICAgICAgIC8vIGBudWxsYCBvciBgdW5kZWZpbmVkYCDihpIgJ251bGwnIG9yICd1bmRlZmluZWQnXG4gICAgICAgIGNvbnN0IG9sZFZhbCA9IGRyb3BVbmRlZmluZWQodGhpcy5fc3RvcmFnZVtrZXldKTsgIC8vIGB1bmRlZmluZWRgIOKGkiBgbnVsbGBcbiAgICAgICAgaWYgKCFkZWVwRXF1YWwob2xkVmFsLCBuZXdWYWwpKSB7XG4gICAgICAgICAgICBhc3NpZ25WYWx1ZSh0aGlzLl9zdG9yYWdlLCBrZXksIG5ld1ZhbCk7XG4gICAgICAgICAgICAhb3B0aW9ucy5zaWxlbnQgJiYgdGhpcy5fYnJva2VyLnRyaWdnZXIoJ0AnLCBrZXksIG5ld1ZhbCwgb2xkVmFsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmVzIHRoZSBrZXkvdmFsdWUgcGFpciB3aXRoIHRoZSBnaXZlbiBrZXkgZnJvbSB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdCwgaWYgYSBrZXkvdmFsdWUgcGFpciB3aXRoIHRoZSBnaXZlbiBrZXkgZXhpc3RzLlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ/jgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgYzlrZjlnKjjgZnjgozjgbDliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzdG9yYWdlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCueODiOODrOODvOOCuOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHJlbW92ZUl0ZW0oa2V5OiBzdHJpbmcsIG9wdGlvbnM/OiBJU3RvcmFnZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGF3YWl0IGNjKG9wdGlvbnMuY2FuY2VsKTtcbiAgICAgICAgY29uc3Qgb2xkVmFsID0gdGhpcy5fc3RvcmFnZVtrZXldO1xuICAgICAgICBpZiAodW5kZWZpbmVkICE9PSBvbGRWYWwpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9zdG9yYWdlW2tleV07XG4gICAgICAgICAgICAhb3B0aW9ucy5zaWxlbnQgJiYgdGhpcy5fYnJva2VyLnRyaWdnZXIoJ0AnLCBrZXksIG51bGwsIG9sZFZhbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRW1wdGllcyB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdCBvZiBhbGwga2V5L3ZhbHVlIHBhaXJzLCBpZiB0aGVyZSBhcmUgYW55LlxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzdG9yYWdlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCueODiOODrOODvOOCuOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIGNsZWFyKG9wdGlvbnM/OiBJU3RvcmFnZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGF3YWl0IGNjKG9wdGlvbnMuY2FuY2VsKTtcbiAgICAgICAgaWYgKCFpc0VtcHR5T2JqZWN0KHRoaXMuX3N0b3JhZ2UpKSB7XG4gICAgICAgICAgICB0aGlzLl9zdG9yYWdlID0ge307XG4gICAgICAgICAgICAhb3B0aW9ucy5zaWxlbnQgJiYgdGhpcy5fYnJva2VyLnRyaWdnZXIoJ0AnLCBudWxsLCBudWxsLCBudWxsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFsbCBlbnRyeSBrZXlzLlxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgq3jg7zkuIDopqfjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjYW5jZWwgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744Or44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMga2V5cyhvcHRpb25zPzogQ2FuY2VsYWJsZSk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICAgICAgYXdhaXQgY2Mob3B0aW9ucz8uY2FuY2VsKTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3N0b3JhZ2UpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uKGxpc3RlbmVyOiBNZW1vcnlTdG9yYWdlRXZlbnRDYWxsYmFjayk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9icm9rZXIub24oJ0AnLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIG9mZihsaXN0ZW5lcj86IE1lbW9yeVN0b3JhZ2VFdmVudENhbGxiYWNrKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2Jyb2tlci5vZmYoJ0AnLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYSBzdG9yYWdlLXN0b3JlIG9iamVjdC5cbiAgICAgKiBAamEg44K544OI44Os44O844K444K544OI44Ki44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgZ2V0IGNvbnRleHQoKTogU3RvcmFnZURhdGEge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZTtcbiAgICB9XG59XG5cbi8vIGRlZmF1bHQgc3RvcmFnZVxuZXhwb3J0IGNvbnN0IG1lbW9yeVN0b3JhZ2UgPSBuZXcgTWVtb3J5U3RvcmFnZSgpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgcG9zdCxcbiAgICBkZWVwRXF1YWwsXG4gICAgZGVlcENvcHksXG4gICAgZHJvcFVuZGVmaW5lZCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHR5cGUge1xuICAgIFN0b3JhZ2VEYXRhLFxuICAgIElTdG9yYWdlLFxuICAgIElTdG9yYWdlT3B0aW9ucyxcbiAgICBJU3RvcmFnZUZvcm1hdE9wdGlvbnMsXG4gICAgUmVnaXN0cnlTY2hlbWFCYXNlLFxuICAgIFJlZ2lzdHJ5RXZlbnQsXG4gICAgUmVnaXN0cnlSZWFkT3B0aW9ucyxcbiAgICBSZWdpc3RyeVdyaXRlT3B0aW9ucyxcbiAgICBSZWdpc3RyeVNhdmVPcHRpb25zLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEBlbiBSZWdpc3RyeSBtYW5hZ2VtZW50IGNsYXNzIGZvciBzeW5jaHJvbm91cyBSZWFkL1dyaXRlIGFjY2Vzc2libGUgZnJvbSBhbnkge0BsaW5rIElTdG9yYWdlfSBvYmplY3QuXG4gKiBAamEg5Lu75oSP44GuIHtAbGluayBJU3RvcmFnZX0g44Kq44OW44K444Kn44Kv44OI44GL44KJ5ZCM5pyfIFJlYWQvV3JpdGUg44Ki44Kv44K744K55Y+v6IO944Gq44Os44K444K544OI44Oq566h55CG44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAvLyAxLiBkZWZpbmUgcmVnaXN0cnkgc2NoZW1hXG4gKiBpbnRlcmZhY2UgU2NoZW1hIGV4dGVuZHMgUmVnaXN0cnlTY2hlbWFCYXNlIHtcbiAqICAgICdjb21tb24vbW9kZSc6ICdub3JtYWwnIHwgJ3NwZWNpZmllZCc7XG4gKiAgICAnY29tbW9uL3ZhbHVlJzogbnVtYmVyO1xuICogICAgJ3RyYWRlL2xvY2FsJzogeyB1bml0OiAn5YaGJyB8ICckJzsgcmF0ZTogbnVtYmVyOyB9O1xuICogICAgJ3RyYWRlL2NoZWNrJzogYm9vbGVhbjtcbiAqICAgICdleHRyYS91c2VyJzogc3RyaW5nO1xuICogfVxuICpcbiAqIC8vIDIuIHByZXBhcmUgSVN0b3JhZ2UgaW5zdGFuY2VcbiAqIC8vIGV4XG4gKiBpbXBvcnQgeyB3ZWJTdG9yYWdlIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiAvLyAzLiBpbnN0YW50aWF0ZSB0aGlzIGNsYXNzXG4gKiBjb25zdCByZWcgPSBuZXcgUmVnaXN0cnk8U2NoZW1hPih3ZWJTdG9yYWdlLCAnQHRlc3QnKTtcbiAqXG4gKiAvLyA0LiByZWFkIGV4YW1wbGVcbiAqIGNvbnN0IHZhbCA9IHJlZy5yZWFkKCdjb21tb24vbW9kZScpOyAvLyAnbm9ybWFsJyB8ICdzcGVjaWZpZWQnIHwgbnVsbFxuICpcbiAqIC8vIDUuIHdyaXRlIGV4YW1wbGVcbiAqIHJlZy53cml0ZSgnY29tbW9uL21vZGUnLCAnc3BlY2lmaWVkJyk7XG4gKiAvLyByZWcud3JpdGUoJ2NvbW1vbi9tb2RlJywgJ2hvZ2UnKTsgLy8gY29tcGlsZSBlcnJvclxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBSZWdpc3RyeTxUIGV4dGVuZHMgUmVnaXN0cnlTY2hlbWFCYXNlID0gYW55PiBleHRlbmRzIEV2ZW50UHVibGlzaGVyPFJlZ2lzdHJ5RXZlbnQ8VD4+IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdG9yYWdlOiBJU3RvcmFnZTtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfcm9vdEtleTogc3RyaW5nO1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9kZWZhdWx0T3B0aW9uczogSVN0b3JhZ2VGb3JtYXRPcHRpb25zO1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIF9zdG9yZTogU3RvcmFnZURhdGEgPSB7fTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RvcmFnZVxuICAgICAqICAtIGBlbmAgUm9vdCBrZXkgZm9yIHtAbGluayBJU3RvcmFnZX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgSVN0b3JhZ2V9IOOBq+S9v+eUqOOBmeOCi+ODq+ODvOODiOOCreODvFxuICAgICAqIEBwYXJhbSByb290S2V5XG4gICAgICogIC0gYGVuYCBSb290IGtleSBmb3Ige0BsaW5rIElTdG9yYWdlfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBJU3RvcmFnZX0g44Gr5L2/55So44GZ44KL44Or44O844OI44Kt44O8XG4gICAgICogQHBhcmFtIGZvcm1hdFNwYWNlXG4gICAgICogIC0gYGVuYCBmb3IgSlNPTiBmb3JtYXQgc3BhY2UuXG4gICAgICogIC0gYGphYCBKU09OIOODleOCqeODvOODnuODg+ODiOOCueODmuODvOOCueOCkuaMh+WumlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHN0b3JhZ2U6IElTdG9yYWdlPGFueT4sIHJvb3RLZXk6IHN0cmluZywgZm9ybWF0U3BhY2U/OiBudW1iZXIpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fc3RvcmFnZSA9IHN0b3JhZ2U7XG4gICAgICAgIHRoaXMuX3Jvb3RLZXkgPSByb290S2V5O1xuICAgICAgICB0aGlzLl9kZWZhdWx0T3B0aW9ucyA9IHsganNvblNwYWNlOiBmb3JtYXRTcGFjZSB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gcm9vdCBrZXkuXG4gICAgICogQGphIOODq+ODvOODiOOCreODvOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCByb290S2V5KCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb290S2V5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8ge0BsaW5rIElTdG9yYWdlfSBvYmplY3QuXG4gICAgICogQGphIHtAbGluayBJU3RvcmFnZX0g44Kq44OW44K444Kn44Kv44OI44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHN0b3JhZ2UoKTogSVN0b3JhZ2U8YW55PiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlYWQgcGVyc2lzdGVuY2UgZGF0YSBmcm9tIHtAbGluayBJU3RvcmFnZX0uIFRoZSBkYXRhIGxvYWRlZCBhbHJlYWR5IHdpbGwgYmUgY2xlYXJlZC5cbiAgICAgKiBAamEge0BsaW5rIElTdG9yYWdlfSDjgYvjgonmsLjntprljJbjgZfjgZ/jg4fjg7zjgr/jgpLoqq3jgb/ovrzjgb8uIOOBmeOBp+OBq+OCreODo+ODg+OCt+ODpeOBleOCjOOBpuOBhOOCi+ODh+ODvOOCv+OBr+egtOajhOOBleOCjOOCi1xuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBsb2FkKG9wdGlvbnM/OiBJU3RvcmFnZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIHRoaXMuX3N0b3JlID0gKGF3YWl0IHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbSh0aGlzLl9yb290S2V5LCBvcHRpb25zKSkgfHwge307XG4gICAgICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB0aGlzLnB1Ymxpc2goJ2NoYW5nZScsICcqJykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFBlcnNpc3QgZGF0YSB0byB7QGxpbmsgSVN0b3JhZ2V9LlxuICAgICAqIEBqYSB7QGxpbmsgSVN0b3JhZ2V9IOOBq+ODh+ODvOOCv+OCkuawuOe2muWMllxuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBzYXZlKG9wdGlvbnM/OiBSZWdpc3RyeVNhdmVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IG9wdHM6IFJlZ2lzdHJ5U2F2ZU9wdGlvbnMgPSB7IC4uLnRoaXMuX2RlZmF1bHRPcHRpb25zLCAuLi5vcHRpb25zIH07XG4gICAgICAgIGlmICghb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnd2lsbC1zYXZlJyk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5fc3RvcmFnZS5zZXRJdGVtKHRoaXMuX3Jvb3RLZXksIHRoaXMuX3N0b3JlLCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVhZCByZWdpc3RyeSB2YWx1ZS5cbiAgICAgKiBAamEg44Os44K444K544OI44Oq5YCk44Gu6Kqt44G/5Y+W44KKXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgcmVnaXN0cnkga2V5LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Os44K444K544OI44Oq44Kt44O844KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlYWQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZWFkPEsgZXh0ZW5kcyBrZXlvZiBUPihrZXk6IEssIG9wdGlvbnM/OiBSZWdpc3RyeVJlYWRPcHRpb25zKTogVFtLXSB8IG51bGwge1xuICAgICAgICBjb25zdCB7IGZpZWxkIH0gPSBvcHRpb25zID8/IHt9O1xuICAgICAgICBjb25zdCBzdHJ1Y3R1cmUgPSBTdHJpbmcoa2V5KS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBsYXN0S2V5ID0gc3RydWN0dXJlLnBvcCgpITtcblxuICAgICAgICBsZXQgbmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBsZXQgcmVnID0gdGhpcy50YXJnZXRSb290KGZpZWxkKTtcblxuICAgICAgICB3aGlsZSAobmFtZSA9IHN0cnVjdHVyZS5zaGlmdCgpKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uZC1hc3NpZ25cbiAgICAgICAgICAgIGlmICghKG5hbWUgaW4gcmVnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVnID0gcmVnW25hbWVdIGFzIFN0b3JhZ2VEYXRhO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcmV0dXJuIGRlZXAgY29weVxuICAgICAgICByZXR1cm4gKG51bGwgIT0gcmVnW2xhc3RLZXldKSA/IGRlZXBDb3B5KHJlZ1tsYXN0S2V5XSkgYXMgYW55IDogbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gV3JpdGUgcmVnaXN0cnkgdmFsdWUuXG4gICAgICogQGphIOODrOOCuOOCueODiOODquWApOOBruabuOOBjei+vOOBv1xuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHJlZ2lzdHJ5IGtleS5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODrOOCuOOCueODiOODquOCreODvOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgdXBkYXRlIHZhbHVlLiBpZiBgbnVsbGAgc2V0IHRvIGRlbGV0ZS5cbiAgICAgKiAgLSBgamFgIOabtOaWsOOBmeOCi+WApC4gYG51bGxgIOOBr+WJiumZpFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCB3cml0ZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5pu444GN6L6844G/44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHdyaXRlPEsgZXh0ZW5kcyBrZXlvZiBUPihrZXk6IEssIHZhbHVlOiBUW0tdIHwgbnVsbCwgb3B0aW9ucz86IFJlZ2lzdHJ5V3JpdGVPcHRpb25zKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgZmllbGQsIG5vU2F2ZSwgc2lsZW50IH0gPSBvcHRpb25zID8/IHt9O1xuICAgICAgICBjb25zdCByZW1vdmUgPSAobnVsbCA9PSB2YWx1ZSk7XG4gICAgICAgIGNvbnN0IHN0cnVjdHVyZSA9IFN0cmluZyhrZXkpLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IGxhc3RLZXkgPSBzdHJ1Y3R1cmUucG9wKCkhO1xuXG4gICAgICAgIGxldCBuYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGxldCByZWcgPSB0aGlzLnRhcmdldFJvb3QoZmllbGQpO1xuXG4gICAgICAgIHdoaWxlIChuYW1lID0gc3RydWN0dXJlLnNoaWZ0KCkpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25kLWFzc2lnblxuICAgICAgICAgICAgaWYgKG5hbWUgaW4gcmVnKSB7XG4gICAgICAgICAgICAgICAgcmVnID0gcmVnW25hbWVdIGFzIFN0b3JhZ2VEYXRhO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZW1vdmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIOOBmeOBp+OBq+imquOCreODvOOBjOOBquOBhOOBn+OCgeS9leOCguOBl+OBquOBhFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWcgPSByZWdbbmFtZV0gPSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG5ld1ZhbCA9IHJlbW92ZSA/IG51bGwgOiB2YWx1ZTtcbiAgICAgICAgY29uc3Qgb2xkVmFsID0gZHJvcFVuZGVmaW5lZChyZWdbbGFzdEtleV0pO1xuICAgICAgICBpZiAoZGVlcEVxdWFsKG9sZFZhbCwgbmV3VmFsKSkge1xuICAgICAgICAgICAgcmV0dXJuOyAvLyDmm7TmlrDjgarjgZdcbiAgICAgICAgfSBlbHNlIGlmIChyZW1vdmUpIHtcbiAgICAgICAgICAgIGRlbGV0ZSByZWdbbGFzdEtleV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZWdbbGFzdEtleV0gPSBkZWVwQ29weShuZXdWYWwpIGFzIGFueTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbm9TYXZlKSB7XG4gICAgICAgICAgICAvLyBubyBmaXJlIG5vdGlmaWNhdGlvblxuICAgICAgICAgICAgdm9pZCB0aGlzLl9zdG9yYWdlLnNldEl0ZW0odGhpcy5fcm9vdEtleSwgdGhpcy5fc3RvcmUsIHsgLi4udGhpcy5fZGVmYXVsdE9wdGlvbnMsIC4uLm9wdGlvbnMgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHRoaXMucHVibGlzaCgnY2hhbmdlJywga2V5LCBuZXdWYWwsIG9sZFZhbCBhcyBhbnkpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWxldGUgcmVnaXN0cnkga2V5LlxuICAgICAqIEBqYSDjg6zjgrjjgrnjg4jjg6rjgq3jg7zjga7liYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCByZWdpc3RyeSBrZXkuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jg6zjgrjjgrnjg4jjg6rjgq3jg7zjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVhZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5pu444GN6L6844G/44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGRlbGV0ZTxLIGV4dGVuZHMga2V5b2YgVD4oa2V5OiBLLCBvcHRpb25zPzogUmVnaXN0cnlXcml0ZU9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgdGhpcy53cml0ZShrZXksIG51bGwsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBhbGwgcmVnaXN0cnkuXG4gICAgICogQGphIOODrOOCuOOCueODiOODquOBruWFqOWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlYWQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOabuOOBjei+vOOBv+OCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBjbGVhcihvcHRpb25zPzogUmVnaXN0cnlXcml0ZU9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIHRoaXMuX3N0b3JlID0ge307XG4gICAgICAgIHZvaWQgdGhpcy5fc3RvcmFnZS5yZW1vdmVJdGVtKHRoaXMuX3Jvb3RLZXksIG9wdGlvbnMpO1xuICAgICAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2NoYW5nZScsIG51bGwsIG51bGwsIG51bGwpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBnZXQgcm9vdCBvYmplY3QgKi9cbiAgICBwcml2YXRlIHRhcmdldFJvb3QoZmllbGQ/OiBzdHJpbmcpOiBTdG9yYWdlRGF0YSB7XG4gICAgICAgIGlmIChmaWVsZCkge1xuICAgICAgICAgICAgLy8gZW5zdXJlIFtmaWVsZF0gb2JqZWN0LlxuICAgICAgICAgICAgdGhpcy5fc3RvcmVbZmllbGRdID0gdGhpcy5fc3RvcmVbZmllbGRdIHx8IHt9O1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JlW2ZpZWxkXSBhcyBTdG9yYWdlRGF0YTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdG9yZTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCB7IGVzY2FwZUhUTUwgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHR5cGUge1xuICAgIFRlbXBsYXRlRGVsaW1pdGVycyxcbiAgICBUZW1wbGF0ZVdyaXRlcixcbiAgICBUZW1wbGF0ZUVzY2FwZXIsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiAoc3RyaW5nIHwgVG9rZW5bXSkgKi9cbmV4cG9ydCB0eXBlIFRva2VuTGlzdCA9IHVua25vd247XG5cbi8qKlxuICogQGVuIHtAbGluayBUZW1wbGF0ZUVuZ2luZX0gdG9rZW4gc3RydWN0dXJlLlxuICogQGphIHtAbGluayBUZW1wbGF0ZUVuZ2luZX0gdG9rZW4g5Z6LXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCB0eXBlIFRva2VuID0gW3N0cmluZywgc3RyaW5nLCBudW1iZXIsIG51bWJlciwgVG9rZW5MaXN0PywgbnVtYmVyPywgYm9vbGVhbj9dO1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgVG9rZW59IGFkZHJlc3MgaWQuXG4gKiBAamEge0BsaW5rIFRva2VufSDjgqLjg4njg6zjgrnorZjliKXlrZBcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gVG9rZW5BZGRyZXNzIHtcbiAgICBUWVBFID0gMCxcbiAgICBWQUxVRSxcbiAgICBTVEFSVCxcbiAgICBFTkQsXG4gICAgVE9LRU5fTElTVCxcbiAgICBUQUdfSU5ERVgsXG4gICAgSEFTX05PX1NQQUNFLFxufVxuXG4vKipcbiAqIEBlbiBJbnRlcm5hbCBkZWxpbWl0ZXJzIGRlZmluaXRpb24gZm9yIHtAbGluayBUZW1wbGF0ZUVuZ2luZX0uIGV4KSBbJ3t7JywnfX0nXSBvciAne3sgfX0nXG4gKiBAamEge0BsaW5rIFRlbXBsYXRlRW5naW5lfSDjga7lhoXpg6jjgafkvb/nlKjjgZnjgovljLrliIfjgormloflrZcgZXgpIFsne3snLCd9fSddIG9yICd7eyB9fSdcbiAqL1xuZXhwb3J0IHR5cGUgRGVsaW1pdGVycyA9IHN0cmluZyB8IFRlbXBsYXRlRGVsaW1pdGVycztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGdsb2JhbFNldHRpbmdzID0ge1xuICAgIHRhZ3M6IFsne3snLCAnfX0nXSxcbiAgICBlc2NhcGU6IGVzY2FwZUhUTUwsXG59IGFzIHtcbiAgICB0YWdzOiBUZW1wbGF0ZURlbGltaXRlcnM7XG4gICAgZXNjYXBlOiBUZW1wbGF0ZUVzY2FwZXI7XG4gICAgd3JpdGVyOiBUZW1wbGF0ZVdyaXRlcjtcbn07XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgUGxhaW5PYmplY3QsXG4gICAgZW5zdXJlT2JqZWN0LFxuICAgIGdldEdsb2JhbE5hbWVzcGFjZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgVGVtcGxhdGVEZWxpbWl0ZXJzIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gQ2FjaGUgbG9jYXRpb24gaW5mb3JtYXRpb24uXG4gKiBAamEg44Kt44Oj44OD44K344Ol44Ot44Kx44O844K344On44Oz5oOF5aCxXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIENhY2hlTG9jYXRpb24ge1xuICAgIE5BTUVTUEFDRSA9ICdDRFBfREVDTEFSRScsXG4gICAgUk9PVCAgICAgID0gJ1RFTVBMQVRFX0NBQ0hFJyxcbn1cblxuLyoqXG4gKiBAZW4gQnVpbGQgY2FjaGUga2V5LlxuICogQGphIOOCreODo+ODg+OCt+ODpeOCreODvOOBrueUn+aIkFxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYWNoZUtleSh0ZW1wbGF0ZTogc3RyaW5nLCB0YWdzOiBUZW1wbGF0ZURlbGltaXRlcnMpOiBzdHJpbmcge1xuICAgIHJldHVybiBgJHt0ZW1wbGF0ZX06JHt0YWdzLmpvaW4oJzonKX1gO1xufVxuXG4vKipcbiAqIEBlbiBDbGVhcnMgYWxsIGNhY2hlZCB0ZW1wbGF0ZXMgaW4gY2FjaGUgcG9vbC5cbiAqIEBqYSDjgZnjgbnjgabjga7jg4bjg7Pjg5fjg6zjg7zjg4jjgq3jg6Pjg4Pjgrfjg6XjgpLnoLTmo4RcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyQ2FjaGUoKTogdm9pZCB7XG4gICAgY29uc3QgbmFtZXNwYWNlID0gZ2V0R2xvYmFsTmFtZXNwYWNlKENhY2hlTG9jYXRpb24uTkFNRVNQQUNFKTtcbiAgICBuYW1lc3BhY2VbQ2FjaGVMb2NhdGlvbi5ST09UXSA9IHt9O1xufVxuXG4vKiogQGludGVybmFsIGdsb2JhbCBjYWNoZSBwb29sICovXG5leHBvcnQgY29uc3QgY2FjaGUgPSBlbnN1cmVPYmplY3Q8UGxhaW5PYmplY3Q+KG51bGwsIENhY2hlTG9jYXRpb24uTkFNRVNQQUNFLCBDYWNoZUxvY2F0aW9uLlJPT1QpO1xuIiwiaW1wb3J0IHsgaXNBcnJheSwgaXNQcmltaXRpdmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuZXhwb3J0IHtcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgVW5rbm93bk9iamVjdCxcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaGFzLFxuICAgIGVzY2FwZUhUTUwsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKlxuICogTW9yZSBjb3JyZWN0IHR5cGVvZiBzdHJpbmcgaGFuZGxpbmcgYXJyYXlcbiAqIHdoaWNoIG5vcm1hbGx5IHJldHVybnMgdHlwZW9mICdvYmplY3QnXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0eXBlU3RyaW5nKHNyYzogdW5rbm93bik6IHN0cmluZyB7XG4gICAgcmV0dXJuIGlzQXJyYXkoc3JjKSA/ICdhcnJheScgOiB0eXBlb2Ygc3JjO1xufVxuXG4vKipcbiAqIEVzY2FwZSBmb3IgdGVtcGxhdGUncyBleHByZXNzaW9uIGNoYXJhY3RvcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlc2NhcGVUZW1wbGF0ZUV4cChzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG4gICAgcmV0dXJuIHNyYy5yZXBsYWNlKC9bLVxcW1xcXXt9KCkqKz8uLFxcXFxcXF4kfCNcXHNdL2csICdcXFxcJCYnKTtcbn1cblxuLyoqXG4gKiBTYWZlIHdheSBvZiBkZXRlY3Rpbmcgd2hldGhlciBvciBub3QgdGhlIGdpdmVuIHRoaW5nIGlzIGEgcHJpbWl0aXZlIGFuZFxuICogd2hldGhlciBpdCBoYXMgdGhlIGdpdmVuIHByb3BlcnR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmltaXRpdmVIYXNPd25Qcm9wZXJ0eShzcmM6IHVua25vd24sIHByb3BOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gaXNQcmltaXRpdmUoc3JjKSAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc3JjLCBwcm9wTmFtZSk7XG59XG5cbi8qKlxuICogQ2hlY2sgd2hpdGVzcGFjZSBjaGFyYWN0b3IgZXhpc3RzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNXaGl0ZXNwYWNlKHNyYzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEvXFxTLy50ZXN0KHNyYyk7XG59XG4iLCJpbXBvcnQgdHlwZSB7IFRlbXBsYXRlU2Nhbm5lciB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQSBzaW1wbGUgc3RyaW5nIHNjYW5uZXIgdGhhdCBpcyB1c2VkIGJ5IHRoZSB0ZW1wbGF0ZSBwYXJzZXIgdG8gZmluZFxuICogdG9rZW5zIGluIHRlbXBsYXRlIHN0cmluZ3MuXG4gKi9cbmV4cG9ydCBjbGFzcyBTY2FubmVyIGltcGxlbWVudHMgVGVtcGxhdGVTY2FubmVyIHtcbiAgICBwcml2YXRlIF9zb3VyY2U6IHN0cmluZztcbiAgICBwcml2YXRlIF90YWlsOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBfcG9zOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHNyYzogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZSA9IHRoaXMuX3RhaWwgPSBzcmM7XG4gICAgICAgIHRoaXMuX3BvcyA9IDA7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGN1cnJlbnQgc2Nhbm5pbmcgcG9zaXRpb24uXG4gICAgICovXG4gICAgZ2V0IHBvcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fcG9zO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgc3RyaW5nICBzb3VyY2UuXG4gICAgICovXG4gICAgZ2V0IHNvdXJjZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYHRydWVgIGlmIHRoZSB0YWlsIGlzIGVtcHR5IChlbmQgb2Ygc3RyaW5nKS5cbiAgICAgKi9cbiAgICBnZXQgZW9zKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gJycgPT09IHRoaXMuX3RhaWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJpZXMgdG8gbWF0Y2ggdGhlIGdpdmVuIHJlZ3VsYXIgZXhwcmVzc2lvbiBhdCB0aGUgY3VycmVudCBwb3NpdGlvbi5cbiAgICAgKiBSZXR1cm5zIHRoZSBtYXRjaGVkIHRleHQgaWYgaXQgY2FuIG1hdGNoLCB0aGUgZW1wdHkgc3RyaW5nIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBzY2FuKHJlZ2V4cDogUmVnRXhwKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSByZWdleHAuZXhlYyh0aGlzLl90YWlsKTtcblxuICAgICAgICBpZiAoIW1hdGNoIHx8IDAgIT09IG1hdGNoLmluZGV4KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci1vcHRpb25hbC1jaGFpblxuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3RyaW5nID0gbWF0Y2hbMF07XG5cbiAgICAgICAgdGhpcy5fdGFpbCA9IHRoaXMuX3RhaWwuc3Vic3RyaW5nKHN0cmluZy5sZW5ndGgpO1xuICAgICAgICB0aGlzLl9wb3MgKz0gc3RyaW5nLmxlbmd0aDtcblxuICAgICAgICByZXR1cm4gc3RyaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNraXBzIGFsbCB0ZXh0IHVudGlsIHRoZSBnaXZlbiByZWd1bGFyIGV4cHJlc3Npb24gY2FuIGJlIG1hdGNoZWQuIFJldHVybnNcbiAgICAgKiB0aGUgc2tpcHBlZCBzdHJpbmcsIHdoaWNoIGlzIHRoZSBlbnRpcmUgdGFpbCBpZiBubyBtYXRjaCBjYW4gYmUgbWFkZS5cbiAgICAgKi9cbiAgICBzY2FuVW50aWwocmVnZXhwOiBSZWdFeHApOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuX3RhaWwuc2VhcmNoKHJlZ2V4cCk7XG4gICAgICAgIGxldCBtYXRjaDogc3RyaW5nO1xuXG4gICAgICAgIHN3aXRjaCAoaW5kZXgpIHtcbiAgICAgICAgICAgIGNhc2UgLTE6XG4gICAgICAgICAgICAgICAgbWF0Y2ggPSB0aGlzLl90YWlsO1xuICAgICAgICAgICAgICAgIHRoaXMuX3RhaWwgPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICBtYXRjaCA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBtYXRjaCA9IHRoaXMuX3RhaWwuc3Vic3RyaW5nKDAsIGluZGV4KTtcbiAgICAgICAgICAgICAgICB0aGlzLl90YWlsID0gdGhpcy5fdGFpbC5zdWJzdHJpbmcoaW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcG9zICs9IG1hdGNoLmxlbmd0aDtcblxuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBUZW1wbGF0ZUNvbnRleHQgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgdHlwZSBQbGFpbk9iamVjdCxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGhhcyxcbiAgICBwcmltaXRpdmVIYXNPd25Qcm9wZXJ0eSxcbn0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIHJlbmRlcmluZyBjb250ZXh0IGJ5IHdyYXBwaW5nIGEgdmlldyBvYmplY3QgYW5kXG4gKiBtYWludGFpbmluZyBhIHJlZmVyZW5jZSB0byB0aGUgcGFyZW50IGNvbnRleHQuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb250ZXh0IGltcGxlbWVudHMgVGVtcGxhdGVDb250ZXh0IHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF92aWV3OiBQbGFpbk9iamVjdDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wYXJlbnQ/OiBDb250ZXh0O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2NhY2hlOiBQbGFpbk9iamVjdDtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKHZpZXc6IFBsYWluT2JqZWN0LCBwYXJlbnRDb250ZXh0PzogQ29udGV4dCkge1xuICAgICAgICB0aGlzLl92aWV3ICAgPSB2aWV3O1xuICAgICAgICB0aGlzLl9jYWNoZSAgPSB7ICcuJzogdGhpcy5fdmlldyB9O1xuICAgICAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnRDb250ZXh0O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogVmlldyBwYXJhbWV0ZXIgZ2V0dGVyLlxuICAgICAqL1xuICAgIGdldCB2aWV3KCk6IFBsYWluT2JqZWN0IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZpZXc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBjb250ZXh0IHVzaW5nIHRoZSBnaXZlbiB2aWV3IHdpdGggdGhpcyBjb250ZXh0XG4gICAgICogYXMgdGhlIHBhcmVudC5cbiAgICAgKi9cbiAgICBwdXNoKHZpZXc6IFBsYWluT2JqZWN0KTogQ29udGV4dCB7XG4gICAgICAgIHJldHVybiBuZXcgQ29udGV4dCh2aWV3LCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gbmFtZSBpbiB0aGlzIGNvbnRleHQsIHRyYXZlcnNpbmdcbiAgICAgKiB1cCB0aGUgY29udGV4dCBoaWVyYXJjaHkgaWYgdGhlIHZhbHVlIGlzIGFic2VudCBpbiB0aGlzIGNvbnRleHQncyB2aWV3LlxuICAgICAqL1xuICAgIGxvb2t1cChuYW1lOiBzdHJpbmcpOiB1bmtub3duIHtcbiAgICAgICAgY29uc3QgY2FjaGUgPSB0aGlzLl9jYWNoZTtcblxuICAgICAgICBsZXQgdmFsdWU6IHVua25vd247XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY2FjaGUsIG5hbWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGNhY2hlW25hbWVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGNvbnRleHQ6IENvbnRleHQgfCB1bmRlZmluZWQgPSB0aGlzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgICAgICAgICBsZXQgaW50ZXJtZWRpYXRlVmFsdWU6IFVua25vd25PYmplY3QgfCB1bmRlZmluZWQgfCBudWxsO1xuICAgICAgICAgICAgbGV0IG5hbWVzOiBzdHJpbmdbXTtcbiAgICAgICAgICAgIGxldCBpbmRleDogbnVtYmVyO1xuICAgICAgICAgICAgbGV0IGxvb2t1cEhpdCA9IGZhbHNlO1xuXG4gICAgICAgICAgICB3aGlsZSAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgIGlmICgwIDwgbmFtZS5pbmRleE9mKCcuJykpIHtcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJtZWRpYXRlVmFsdWUgPSBjb250ZXh0Ll92aWV3O1xuICAgICAgICAgICAgICAgICAgICBuYW1lcyA9IG5hbWUuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggPSAwO1xuXG4gICAgICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgICAgKiBVc2luZyB0aGUgZG90IG5vdGlvbiBwYXRoIGluIGBuYW1lYCwgd2UgZGVzY2VuZCB0aHJvdWdoIHRoZVxuICAgICAgICAgICAgICAgICAgICAgKiBuZXN0ZWQgb2JqZWN0cy5cbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogVG8gYmUgY2VydGFpbiB0aGF0IHRoZSBsb29rdXAgaGFzIGJlZW4gc3VjY2Vzc2Z1bCwgd2UgaGF2ZSB0b1xuICAgICAgICAgICAgICAgICAgICAgKiBjaGVjayBpZiB0aGUgbGFzdCBvYmplY3QgaW4gdGhlIHBhdGggYWN0dWFsbHkgaGFzIHRoZSBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgICAgICAgKiB3ZSBhcmUgbG9va2luZyBmb3IuIFdlIHN0b3JlIHRoZSByZXN1bHQgaW4gYGxvb2t1cEhpdGAuXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIFRoaXMgaXMgc3BlY2lhbGx5IG5lY2Vzc2FyeSBmb3Igd2hlbiB0aGUgdmFsdWUgaGFzIGJlZW4gc2V0IHRvXG4gICAgICAgICAgICAgICAgICAgICAqIGB1bmRlZmluZWRgIGFuZCB3ZSB3YW50IHRvIGF2b2lkIGxvb2tpbmcgdXAgcGFyZW50IGNvbnRleHRzLlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBJbiB0aGUgY2FzZSB3aGVyZSBkb3Qgbm90YXRpb24gaXMgdXNlZCwgd2UgY29uc2lkZXIgdGhlIGxvb2t1cFxuICAgICAgICAgICAgICAgICAgICAgKiB0byBiZSBzdWNjZXNzZnVsIGV2ZW4gaWYgdGhlIGxhc3QgXCJvYmplY3RcIiBpbiB0aGUgcGF0aCBpc1xuICAgICAgICAgICAgICAgICAgICAgKiBub3QgYWN0dWFsbHkgYW4gb2JqZWN0IGJ1dCBhIHByaW1pdGl2ZSAoZS5nLiwgYSBzdHJpbmcsIG9yIGFuXG4gICAgICAgICAgICAgICAgICAgICAqIGludGVnZXIpLCBiZWNhdXNlIGl0IGlzIHNvbWV0aW1lcyB1c2VmdWwgdG8gYWNjZXNzIGEgcHJvcGVydHlcbiAgICAgICAgICAgICAgICAgICAgICogb2YgYW4gYXV0b2JveGVkIHByaW1pdGl2ZSwgc3VjaCBhcyB0aGUgbGVuZ3RoIG9mIGEgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAgICAgKiovXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChudWxsICE9IGludGVybWVkaWF0ZVZhbHVlICYmIGluZGV4IDwgbmFtZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IG5hbWVzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb29rdXBIaXQgPSAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhcyhpbnRlcm1lZGlhdGVWYWx1ZSwgbmFtZXNbaW5kZXhdKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmltaXRpdmVIYXNPd25Qcm9wZXJ0eShpbnRlcm1lZGlhdGVWYWx1ZSwgbmFtZXNbaW5kZXhdKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGVWYWx1ZSA9IGludGVybWVkaWF0ZVZhbHVlW25hbWVzW2luZGV4KytdXSBhcyBVbmtub3duT2JqZWN0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJtZWRpYXRlVmFsdWUgPSBjb250ZXh0Ll92aWV3W25hbWVdO1xuXG4gICAgICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgICAgKiBPbmx5IGNoZWNraW5nIGFnYWluc3QgYGhhc1Byb3BlcnR5YCwgd2hpY2ggYWx3YXlzIHJldHVybnMgYGZhbHNlYCBpZlxuICAgICAgICAgICAgICAgICAgICAgKiBgY29udGV4dC52aWV3YCBpcyBub3QgYW4gb2JqZWN0LiBEZWxpYmVyYXRlbHkgb21pdHRpbmcgdGhlIGNoZWNrXG4gICAgICAgICAgICAgICAgICAgICAqIGFnYWluc3QgYHByaW1pdGl2ZUhhc093blByb3BlcnR5YCBpZiBkb3Qgbm90YXRpb24gaXMgbm90IHVzZWQuXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIENvbnNpZGVyIHRoaXMgZXhhbXBsZTpcbiAgICAgICAgICAgICAgICAgICAgICogYGBgXG4gICAgICAgICAgICAgICAgICAgICAqIE11c3RhY2hlLnJlbmRlcihcIlRoZSBsZW5ndGggb2YgYSBmb290YmFsbCBmaWVsZCBpcyB7eyNsZW5ndGh9fXt7bGVuZ3RofX17ey9sZW5ndGh9fS5cIiwge2xlbmd0aDogXCIxMDAgeWFyZHNcIn0pXG4gICAgICAgICAgICAgICAgICAgICAqIGBgYFxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBJZiB3ZSB3ZXJlIHRvIGNoZWNrIGFsc28gYWdhaW5zdCBgcHJpbWl0aXZlSGFzT3duUHJvcGVydHlgLCBhcyB3ZSBkb1xuICAgICAgICAgICAgICAgICAgICAgKiBpbiB0aGUgZG90IG5vdGF0aW9uIGNhc2UsIHRoZW4gcmVuZGVyIGNhbGwgd291bGQgcmV0dXJuOlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBcIlRoZSBsZW5ndGggb2YgYSBmb290YmFsbCBmaWVsZCBpcyA5LlwiXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIHJhdGhlciB0aGFuIHRoZSBleHBlY3RlZDpcbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogXCJUaGUgbGVuZ3RoIG9mIGEgZm9vdGJhbGwgZmllbGQgaXMgMTAwIHlhcmRzLlwiXG4gICAgICAgICAgICAgICAgICAgICAqKi9cbiAgICAgICAgICAgICAgICAgICAgbG9va3VwSGl0ID0gaGFzKGNvbnRleHQuX3ZpZXcsIG5hbWUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChsb29rdXBIaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBpbnRlcm1lZGlhdGVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29udGV4dCA9IGNvbnRleHQuX3BhcmVudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FjaGVbbmFtZV0gPSB2YWx1ZSBhcyBvYmplY3Q7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gKHZhbHVlIGFzIFVua25vd25GdW5jdGlvbikuY2FsbCh0aGlzLl92aWV3KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgVG9rZW4sXG4gICAgVG9rZW5BZGRyZXNzIGFzICQsXG4gICAgdHlwZSBEZWxpbWl0ZXJzLFxuICAgIGdsb2JhbFNldHRpbmdzLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7XG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBpc1doaXRlc3BhY2UsXG4gICAgZXNjYXBlVGVtcGxhdGVFeHAsXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgU2Nhbm5lciB9IGZyb20gJy4vc2Nhbm5lcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9yZWdleHAgPSB7XG4gICAgd2hpdGU6IC9cXHMqLyxcbiAgICBzcGFjZTogL1xccysvLFxuICAgIGVxdWFsczogL1xccyo9LyxcbiAgICBjdXJseTogL1xccypcXH0vLFxuICAgIHRhZzogLyN8XFxefFxcL3w+fFxce3wmfD18IS8sXG59O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQ29tYmluZXMgdGhlIHZhbHVlcyBvZiBjb25zZWN1dGl2ZSB0ZXh0IHRva2VucyBpbiB0aGUgZ2l2ZW4gYHRva2Vuc2AgYXJyYXkgdG8gYSBzaW5nbGUgdG9rZW4uXG4gKi9cbmZ1bmN0aW9uIHNxdWFzaFRva2Vucyh0b2tlbnM6IFRva2VuW10pOiBUb2tlbltdIHtcbiAgICBjb25zdCBzcXVhc2hlZFRva2VuczogVG9rZW5bXSA9IFtdO1xuXG4gICAgbGV0IGxhc3RUb2tlbiE6IFRva2VuO1xuICAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgICAgIGlmICh0b2tlbikge1xuICAgICAgICAgICAgaWYgKCd0ZXh0JyA9PT0gdG9rZW5bJC5UWVBFXSAmJiAndGV4dCcgPT09IGxhc3RUb2tlbj8uWyQuVFlQRV0pIHtcbiAgICAgICAgICAgICAgICBsYXN0VG9rZW5bJC5WQUxVRV0gKz0gdG9rZW5bJC5WQUxVRV07XG4gICAgICAgICAgICAgICAgbGFzdFRva2VuWyQuRU5EXSA9IHRva2VuWyQuRU5EXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3F1YXNoZWRUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgbGFzdFRva2VuID0gdG9rZW47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3F1YXNoZWRUb2tlbnM7XG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBGb3JtcyB0aGUgZ2l2ZW4gYXJyYXkgb2YgYHRva2Vuc2AgaW50byBhIG5lc3RlZCB0cmVlIHN0cnVjdHVyZSB3aGVyZVxuICogdG9rZW5zIHRoYXQgcmVwcmVzZW50IGEgc2VjdGlvbiBoYXZlIHR3byBhZGRpdGlvbmFsIGl0ZW1zOiAxKSBhbiBhcnJheSBvZlxuICogYWxsIHRva2VucyB0aGF0IGFwcGVhciBpbiB0aGF0IHNlY3Rpb24gYW5kIDIpIHRoZSBpbmRleCBpbiB0aGUgb3JpZ2luYWxcbiAqIHRlbXBsYXRlIHRoYXQgcmVwcmVzZW50cyB0aGUgZW5kIG9mIHRoYXQgc2VjdGlvbi5cbiAqL1xuZnVuY3Rpb24gbmVzdFRva2Vucyh0b2tlbnM6IFRva2VuW10pOiBUb2tlbltdIHtcbiAgICBjb25zdCBuZXN0ZWRUb2tlbnM6IFRva2VuW10gPSBbXTtcbiAgICBsZXQgY29sbGVjdG9yID0gbmVzdGVkVG9rZW5zO1xuICAgIGNvbnN0IHNlY3Rpb25zOiBUb2tlbltdID0gW107XG5cbiAgICBsZXQgc2VjdGlvbiE6IFRva2VuO1xuICAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgICAgIHN3aXRjaCAodG9rZW5bJC5UWVBFXSkge1xuICAgICAgICAgICAgY2FzZSAnIyc6XG4gICAgICAgICAgICBjYXNlICdeJzpcbiAgICAgICAgICAgICAgICBjb2xsZWN0b3IucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgc2VjdGlvbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yID0gdG9rZW5bJC5UT0tFTl9MSVNUXSA9IFtdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnLyc6XG4gICAgICAgICAgICAgICAgc2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpITtcbiAgICAgICAgICAgICAgICBzZWN0aW9uWyQuVEFHX0lOREVYXSA9IHRva2VuWyQuU1RBUlRdO1xuICAgICAgICAgICAgICAgIGNvbGxlY3RvciA9IHNlY3Rpb25zLmxlbmd0aCA+IDAgPyBzZWN0aW9uc1tzZWN0aW9ucy5sZW5ndGggLSAxXVskLlRPS0VOX0xJU1RdIGFzIFRva2VuW10gOiBuZXN0ZWRUb2tlbnM7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGNvbGxlY3Rvci5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmVzdGVkVG9rZW5zO1xufVxuXG4vKipcbiAqIEJyZWFrcyB1cCB0aGUgZ2l2ZW4gYHRlbXBsYXRlYCBzdHJpbmcgaW50byBhIHRyZWUgb2YgdG9rZW5zLiBJZiB0aGUgYHRhZ3NgXG4gKiBhcmd1bWVudCBpcyBnaXZlbiBoZXJlIGl0IG11c3QgYmUgYW4gYXJyYXkgd2l0aCB0d28gc3RyaW5nIHZhbHVlczogdGhlXG4gKiBvcGVuaW5nIGFuZCBjbG9zaW5nIHRhZ3MgdXNlZCBpbiB0aGUgdGVtcGxhdGUgKGUuZy4gWyBcIjwlXCIsIFwiJT5cIiBdKS4gT2ZcbiAqIGNvdXJzZSwgdGhlIGRlZmF1bHQgaXMgdG8gdXNlIG11c3RhY2hlcyAoaS5lLiBtdXN0YWNoZS50YWdzKS5cbiAqXG4gKiBBIHRva2VuIGlzIGFuIGFycmF5IHdpdGggYXQgbGVhc3QgNCBlbGVtZW50cy4gVGhlIGZpcnN0IGVsZW1lbnQgaXMgdGhlXG4gKiBtdXN0YWNoZSBzeW1ib2wgdGhhdCB3YXMgdXNlZCBpbnNpZGUgdGhlIHRhZywgZS5nLiBcIiNcIiBvciBcIiZcIi4gSWYgdGhlIHRhZ1xuICogZGlkIG5vdCBjb250YWluIGEgc3ltYm9sIChpLmUuIHt7bXlWYWx1ZX19KSB0aGlzIGVsZW1lbnQgaXMgXCJuYW1lXCIuIEZvclxuICogYWxsIHRleHQgdGhhdCBhcHBlYXJzIG91dHNpZGUgYSBzeW1ib2wgdGhpcyBlbGVtZW50IGlzIFwidGV4dFwiLlxuICpcbiAqIFRoZSBzZWNvbmQgZWxlbWVudCBvZiBhIHRva2VuIGlzIGl0cyBcInZhbHVlXCIuIEZvciBtdXN0YWNoZSB0YWdzIHRoaXMgaXNcbiAqIHdoYXRldmVyIGVsc2Ugd2FzIGluc2lkZSB0aGUgdGFnIGJlc2lkZXMgdGhlIG9wZW5pbmcgc3ltYm9sLiBGb3IgdGV4dCB0b2tlbnNcbiAqIHRoaXMgaXMgdGhlIHRleHQgaXRzZWxmLlxuICpcbiAqIFRoZSB0aGlyZCBhbmQgZm91cnRoIGVsZW1lbnRzIG9mIHRoZSB0b2tlbiBhcmUgdGhlIHN0YXJ0IGFuZCBlbmQgaW5kaWNlcyxcbiAqIHJlc3BlY3RpdmVseSwgb2YgdGhlIHRva2VuIGluIHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZS5cbiAqXG4gKiBUb2tlbnMgdGhhdCBhcmUgdGhlIHJvb3Qgbm9kZSBvZiBhIHN1YnRyZWUgY29udGFpbiB0d28gbW9yZSBlbGVtZW50czogMSkgYW5cbiAqIGFycmF5IG9mIHRva2VucyBpbiB0aGUgc3VidHJlZSBhbmQgMikgdGhlIGluZGV4IGluIHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZSBhdFxuICogd2hpY2ggdGhlIGNsb3NpbmcgdGFnIGZvciB0aGF0IHNlY3Rpb24gYmVnaW5zLlxuICpcbiAqIFRva2VucyBmb3IgcGFydGlhbHMgYWxzbyBjb250YWluIHR3byBtb3JlIGVsZW1lbnRzOiAxKSBhIHN0cmluZyB2YWx1ZSBvZlxuICogaW5kZW5kYXRpb24gcHJpb3IgdG8gdGhhdCB0YWcgYW5kIDIpIHRoZSBpbmRleCBvZiB0aGF0IHRhZyBvbiB0aGF0IGxpbmUgLVxuICogZWcgYSB2YWx1ZSBvZiAyIGluZGljYXRlcyB0aGUgcGFydGlhbCBpcyB0aGUgdGhpcmQgdGFnIG9uIHRoaXMgbGluZS5cbiAqXG4gKiBAcGFyYW0gdGVtcGxhdGUgdGVtcGxhdGUgc3RyaW5nXG4gKiBAcGFyYW0gdGFncyBkZWxpbWl0ZXJzIGV4KSBbJ3t7JywnfX0nXSBvciAne3sgfX0nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRlbXBsYXRlKHRlbXBsYXRlOiBzdHJpbmcsIHRhZ3M/OiBEZWxpbWl0ZXJzKTogVG9rZW5bXSB7XG4gICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgbGV0IGxpbmVIYXNOb25TcGFjZSAgICAgPSBmYWxzZTtcbiAgICBjb25zdCBzZWN0aW9uczogVG9rZW5bXSA9IFtdOyAgICAgICAvLyBTdGFjayB0byBob2xkIHNlY3Rpb24gdG9rZW5zXG4gICAgY29uc3QgdG9rZW5zOiBUb2tlbltdICAgPSBbXTsgICAgICAgLy8gQnVmZmVyIHRvIGhvbGQgdGhlIHRva2Vuc1xuICAgIGNvbnN0IHNwYWNlczogbnVtYmVyW10gID0gW107ICAgICAgIC8vIEluZGljZXMgb2Ygd2hpdGVzcGFjZSB0b2tlbnMgb24gdGhlIGN1cnJlbnQgbGluZVxuICAgIGxldCBoYXNUYWcgICAgICAgICAgICAgID0gZmFsc2U7ICAgIC8vIElzIHRoZXJlIGEge3t0YWd9fSBvbiB0aGUgY3VycmVudCBsaW5lP1xuICAgIGxldCBub25TcGFjZSAgICAgICAgICAgID0gZmFsc2U7ICAgIC8vIElzIHRoZXJlIGEgbm9uLXNwYWNlIGNoYXIgb24gdGhlIGN1cnJlbnQgbGluZT9cbiAgICBsZXQgaW5kZW50YXRpb24gICAgICAgICA9ICcnOyAgICAgICAvLyBUcmFja3MgaW5kZW50YXRpb24gZm9yIHRhZ3MgdGhhdCB1c2UgaXRcbiAgICBsZXQgdGFnSW5kZXggICAgICAgICAgICA9IDA7ICAgICAgICAvLyBTdG9yZXMgYSBjb3VudCBvZiBudW1iZXIgb2YgdGFncyBlbmNvdW50ZXJlZCBvbiBhIGxpbmVcblxuICAgIC8vIFN0cmlwcyBhbGwgd2hpdGVzcGFjZSB0b2tlbnMgYXJyYXkgZm9yIHRoZSBjdXJyZW50IGxpbmVcbiAgICAvLyBpZiB0aGVyZSB3YXMgYSB7eyN0YWd9fSBvbiBpdCBhbmQgb3RoZXJ3aXNlIG9ubHkgc3BhY2UuXG4gICAgY29uc3Qgc3RyaXBTcGFjZSA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgaWYgKGhhc1RhZyAmJiAhbm9uU3BhY2UpIHtcbiAgICAgICAgICAgIHdoaWxlIChzcGFjZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRva2Vuc1tzcGFjZXMucG9wKCkhXTsgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1hcnJheS1kZWxldGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNwYWNlcy5sZW5ndGggPSAwO1xuICAgICAgICB9XG4gICAgICAgIGhhc1RhZyA9IGZhbHNlO1xuICAgICAgICBub25TcGFjZSA9IGZhbHNlO1xuICAgIH07XG5cbiAgICBjb25zdCBjb21waWxlVGFncyA9ICh0YWdzVG9Db21waWxlOiBzdHJpbmcgfCBzdHJpbmdbXSk6IHsgb3BlbmluZ1RhZzogUmVnRXhwOyBjbG9zaW5nVGFnOiBSZWdFeHA7IGNsb3NpbmdDdXJseTogUmVnRXhwOyB9ID0+IHtcbiAgICAgICAgY29uc3QgZW51bSBUYWcge1xuICAgICAgICAgICAgT1BFTiA9IDAsXG4gICAgICAgICAgICBDTE9TRSxcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNTdHJpbmcodGFnc1RvQ29tcGlsZSkpIHtcbiAgICAgICAgICAgIHRhZ3NUb0NvbXBpbGUgPSB0YWdzVG9Db21waWxlLnNwbGl0KF9yZWdleHAuc3BhY2UsIDIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFpc0FycmF5KHRhZ3NUb0NvbXBpbGUpIHx8IDIgIT09IHRhZ3NUb0NvbXBpbGUubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgdGFnczogJHtKU09OLnN0cmluZ2lmeSh0YWdzVG9Db21waWxlKX1gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3BlbmluZ1RhZzogICBuZXcgUmVnRXhwKGAke2VzY2FwZVRlbXBsYXRlRXhwKHRhZ3NUb0NvbXBpbGVbVGFnLk9QRU5dKX1cXFxccypgKSxcbiAgICAgICAgICAgIGNsb3NpbmdUYWc6ICAgbmV3IFJlZ0V4cChgXFxcXHMqJHtlc2NhcGVUZW1wbGF0ZUV4cCh0YWdzVG9Db21waWxlW1RhZy5DTE9TRV0pfWApLFxuICAgICAgICAgICAgY2xvc2luZ0N1cmx5OiBuZXcgUmVnRXhwKGBcXFxccyoke2VzY2FwZVRlbXBsYXRlRXhwKGB9JHt0YWdzVG9Db21waWxlW1RhZy5DTE9TRV19YCl9YCksXG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIGNvbnN0IHsgdGFnOiByZVRhZywgd2hpdGU6IHJlV2hpdGUsIGVxdWFsczogcmVFcXVhbHMsIGN1cmx5OiByZUN1cmx5IH0gPSBfcmVnZXhwO1xuICAgIGxldCBfcmVneHBUYWdzID0gY29tcGlsZVRhZ3ModGFncyA/PyBnbG9iYWxTZXR0aW5ncy50YWdzKTtcblxuICAgIGNvbnN0IHNjYW5uZXIgPSBuZXcgU2Nhbm5lcih0ZW1wbGF0ZSk7XG5cbiAgICBsZXQgb3BlblNlY3Rpb246IFRva2VuIHwgdW5kZWZpbmVkO1xuICAgIHdoaWxlICghc2Nhbm5lci5lb3MpIHtcbiAgICAgICAgY29uc3QgeyBvcGVuaW5nVGFnOiByZU9wZW5pbmdUYWcsIGNsb3NpbmdUYWc6IHJlQ2xvc2luZ1RhZywgY2xvc2luZ0N1cmx5OiByZUNsb3NpbmdDdXJseSB9ID0gX3JlZ3hwVGFncztcbiAgICAgICAgbGV0IHRva2VuOiBUb2tlbjtcbiAgICAgICAgbGV0IHN0YXJ0ID0gc2Nhbm5lci5wb3M7XG4gICAgICAgIC8vIE1hdGNoIGFueSB0ZXh0IGJldHdlZW4gdGFncy5cbiAgICAgICAgbGV0IHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwocmVPcGVuaW5nVGFnKTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMCwgdmFsdWVMZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGkgPCB2YWx1ZUxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2hyID0gdmFsdWUuY2hhckF0KGkpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzV2hpdGVzcGFjZShjaHIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNwYWNlcy5wdXNoKHRva2Vucy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICBpbmRlbnRhdGlvbiArPSBjaHI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbm9uU3BhY2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBsaW5lSGFzTm9uU3BhY2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpbmRlbnRhdGlvbiArPSAnICc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdG9rZW5zLnB1c2goWyd0ZXh0JywgY2hyLCBzdGFydCwgc3RhcnQgKyAxXSk7XG4gICAgICAgICAgICAgICAgc3RhcnQgKz0gMTtcblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGZvciB3aGl0ZXNwYWNlIG9uIHRoZSBjdXJyZW50IGxpbmUuXG4gICAgICAgICAgICAgICAgaWYgKCdcXG4nID09PSBjaHIpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RyaXBTcGFjZSgpO1xuICAgICAgICAgICAgICAgICAgICBpbmRlbnRhdGlvbiA9ICcnO1xuICAgICAgICAgICAgICAgICAgICB0YWdJbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVIYXNOb25TcGFjZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hdGNoIHRoZSBvcGVuaW5nIHRhZy5cbiAgICAgICAgaWYgKCFzY2FubmVyLnNjYW4ocmVPcGVuaW5nVGFnKSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBoYXNUYWcgPSB0cnVlO1xuXG4gICAgICAgIC8vIEdldCB0aGUgdGFnIHR5cGUuXG4gICAgICAgIGxldCB0eXBlID0gc2Nhbm5lci5zY2FuKHJlVGFnKSB8fCAnbmFtZSc7XG4gICAgICAgIHNjYW5uZXIuc2NhbihyZVdoaXRlKTtcblxuICAgICAgICAvLyBHZXQgdGhlIHRhZyB2YWx1ZS5cbiAgICAgICAgaWYgKCc9JyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChyZUVxdWFscyk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW4ocmVFcXVhbHMpO1xuICAgICAgICAgICAgc2Nhbm5lci5zY2FuVW50aWwocmVDbG9zaW5nVGFnKTtcbiAgICAgICAgfSBlbHNlIGlmICgneycgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwocmVDbG9zaW5nQ3VybHkpO1xuICAgICAgICAgICAgc2Nhbm5lci5zY2FuKHJlQ3VybHkpO1xuICAgICAgICAgICAgc2Nhbm5lci5zY2FuVW50aWwocmVDbG9zaW5nVGFnKTtcbiAgICAgICAgICAgIHR5cGUgPSAnJic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHNjYW5uZXIuc2NhblVudGlsKHJlQ2xvc2luZ1RhZyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXRjaCB0aGUgY2xvc2luZyB0YWcuXG4gICAgICAgIGlmICghc2Nhbm5lci5zY2FuKHJlQ2xvc2luZ1RhZykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5jbG9zZWQgdGFnIGF0ICR7c2Nhbm5lci5wb3N9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJz4nID09PSB0eXBlKSB7XG4gICAgICAgICAgICB0b2tlbiA9IFt0eXBlLCB2YWx1ZSwgc3RhcnQsIHNjYW5uZXIucG9zLCBpbmRlbnRhdGlvbiwgdGFnSW5kZXgsIGxpbmVIYXNOb25TcGFjZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0b2tlbiA9IFt0eXBlLCB2YWx1ZSwgc3RhcnQsIHNjYW5uZXIucG9zXTtcbiAgICAgICAgfVxuICAgICAgICB0YWdJbmRleCsrO1xuICAgICAgICB0b2tlbnMucHVzaCh0b2tlbik7XG5cbiAgICAgICAgaWYgKCcjJyA9PT0gdHlwZSB8fCAnXicgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIHNlY3Rpb25zLnB1c2godG9rZW4pO1xuICAgICAgICB9IGVsc2UgaWYgKCcvJyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgc2VjdGlvbiBuZXN0aW5nLlxuICAgICAgICAgICAgb3BlblNlY3Rpb24gPSBzZWN0aW9ucy5wb3AoKTtcbiAgICAgICAgICAgIGlmICghb3BlblNlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVub3BlbmVkIHNlY3Rpb24gXCIke3ZhbHVlfVwiIGF0ICR7c3RhcnR9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob3BlblNlY3Rpb25bMV0gIT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmNsb3NlZCBzZWN0aW9uIFwiJHtvcGVuU2VjdGlvblskLlZBTFVFXX1cIiBhdCAke3N0YXJ0fWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCduYW1lJyA9PT0gdHlwZSB8fCAneycgPT09IHR5cGUgfHwgJyYnID09PSB0eXBlKSB7XG4gICAgICAgICAgICBub25TcGFjZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoJz0nID09PSB0eXBlKSB7XG4gICAgICAgICAgICAvLyBTZXQgdGhlIHRhZ3MgZm9yIHRoZSBuZXh0IHRpbWUgYXJvdW5kLlxuICAgICAgICAgICAgX3JlZ3hwVGFncyA9IGNvbXBpbGVUYWdzKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHN0cmlwU3BhY2UoKTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGVyZSBhcmUgbm8gb3BlbiBzZWN0aW9ucyB3aGVuIHdlJ3JlIGRvbmUuXG4gICAgb3BlblNlY3Rpb24gPSBzZWN0aW9ucy5wb3AoKTtcblxuICAgIGlmIChvcGVuU2VjdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuY2xvc2VkIHNlY3Rpb24gXCIke29wZW5TZWN0aW9uWyQuVkFMVUVdfVwiIGF0ICR7c2Nhbm5lci5wb3N9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5lc3RUb2tlbnMoc3F1YXNoVG9rZW5zKHRva2VucykpO1xufVxuIiwiaW1wb3J0IHR5cGUge1xuICAgIFRlbXBsYXRlRGVsaW1pdGVycyxcbiAgICBUZW1wbGF0ZVdyaXRlcixcbiAgICBUZW1wbGF0ZVZpZXdQYXJhbSxcbiAgICBUZW1wbGF0ZVBhcnRpYWxQYXJhbSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgdHlwZSBUb2tlbixcbiAgICBUb2tlbkFkZHJlc3MgYXMgJCxcbiAgICBnbG9iYWxTZXR0aW5ncyxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBjYWNoZSwgYnVpbGRDYWNoZUtleSB9IGZyb20gJy4vY2FjaGUnO1xuaW1wb3J0IHtcbiAgICB0eXBlIFBsYWluT2JqZWN0LFxuICAgIGlzQXJyYXksXG4gICAgaXNGdW5jdGlvbixcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBwYXJzZVRlbXBsYXRlIH0gZnJvbSAnLi9wYXJzZSc7XG5pbXBvcnQgeyBDb250ZXh0IH0gZnJvbSAnLi9jb250ZXh0JztcblxuLyoqXG4gKiBBIFdyaXRlciBrbm93cyBob3cgdG8gdGFrZSBhIHN0cmVhbSBvZiB0b2tlbnMgYW5kIHJlbmRlciB0aGVtIHRvIGFcbiAqIHN0cmluZywgZ2l2ZW4gYSBjb250ZXh0LiBJdCBhbHNvIG1haW50YWlucyBhIGNhY2hlIG9mIHRlbXBsYXRlcyB0b1xuICogYXZvaWQgdGhlIG5lZWQgdG8gcGFyc2UgdGhlIHNhbWUgdGVtcGxhdGUgdHdpY2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBXcml0ZXIgaW1wbGVtZW50cyBUZW1wbGF0ZVdyaXRlciB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyBhbmQgY2FjaGVzIHRoZSBnaXZlbiBgdGVtcGxhdGVgIGFjY29yZGluZyB0byB0aGUgZ2l2ZW4gYHRhZ3NgIG9yXG4gICAgICogYG11c3RhY2hlLnRhZ3NgIGlmIGB0YWdzYCBpcyBvbWl0dGVkLCAgYW5kIHJldHVybnMgdGhlIGFycmF5IG9mIHRva2Vuc1xuICAgICAqIHRoYXQgaXMgZ2VuZXJhdGVkIGZyb20gdGhlIHBhcnNlLlxuICAgICAqL1xuICAgIHBhcnNlKHRlbXBsYXRlOiBzdHJpbmcsIHRhZ3M/OiBUZW1wbGF0ZURlbGltaXRlcnMpOiB7IHRva2VuczogVG9rZW5bXTsgY2FjaGVLZXk6IHN0cmluZzsgfSB7XG4gICAgICAgIGNvbnN0IGNhY2hlS2V5ID0gYnVpbGRDYWNoZUtleSh0ZW1wbGF0ZSwgdGFncyA/PyBnbG9iYWxTZXR0aW5ncy50YWdzKTtcbiAgICAgICAgbGV0IHRva2VucyA9IGNhY2hlW2NhY2hlS2V5XSBhcyBUb2tlbltdO1xuICAgICAgICB0b2tlbnMgPz89IGNhY2hlW2NhY2hlS2V5XSA9IHBhcnNlVGVtcGxhdGUodGVtcGxhdGUsIHRhZ3MpO1xuICAgICAgICByZXR1cm4geyB0b2tlbnMsIGNhY2hlS2V5IH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSGlnaC1sZXZlbCBtZXRob2QgdGhhdCBpcyB1c2VkIHRvIHJlbmRlciB0aGUgZ2l2ZW4gYHRlbXBsYXRlYCB3aXRoXG4gICAgICogdGhlIGdpdmVuIGB2aWV3YC5cbiAgICAgKlxuICAgICAqIFRoZSBvcHRpb25hbCBgcGFydGlhbHNgIGFyZ3VtZW50IG1heSBiZSBhbiBvYmplY3QgdGhhdCBjb250YWlucyB0aGVcbiAgICAgKiBuYW1lcyBhbmQgdGVtcGxhdGVzIG9mIHBhcnRpYWxzIHRoYXQgYXJlIHVzZWQgaW4gdGhlIHRlbXBsYXRlLiBJdCBtYXlcbiAgICAgKiBhbHNvIGJlIGEgZnVuY3Rpb24gdGhhdCBpcyB1c2VkIHRvIGxvYWQgcGFydGlhbCB0ZW1wbGF0ZXMgb24gdGhlIGZseVxuICAgICAqIHRoYXQgdGFrZXMgYSBzaW5nbGUgYXJndW1lbnQ6IHRoZSBuYW1lIG9mIHRoZSBwYXJ0aWFsLlxuICAgICAqXG4gICAgICogSWYgdGhlIG9wdGlvbmFsIGB0YWdzYCBhcmd1bWVudCBpcyBnaXZlbiBoZXJlIGl0IG11c3QgYmUgYW4gYXJyYXkgd2l0aCB0d29cbiAgICAgKiBzdHJpbmcgdmFsdWVzOiB0aGUgb3BlbmluZyBhbmQgY2xvc2luZyB0YWdzIHVzZWQgaW4gdGhlIHRlbXBsYXRlIChlLmcuXG4gICAgICogWyBcIjwlXCIsIFwiJT5cIiBdKS4gVGhlIGRlZmF1bHQgaXMgdG8gbXVzdGFjaGUudGFncy5cbiAgICAgKi9cbiAgICByZW5kZXIodGVtcGxhdGU6IHN0cmluZywgdmlldzogVGVtcGxhdGVWaWV3UGFyYW0sIHBhcnRpYWxzPzogVGVtcGxhdGVQYXJ0aWFsUGFyYW0sIHRhZ3M/OiBUZW1wbGF0ZURlbGltaXRlcnMpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCB7IHRva2VucyB9ID0gdGhpcy5wYXJzZSh0ZW1wbGF0ZSwgdGFncyk7XG4gICAgICAgIHJldHVybiB0aGlzLnJlbmRlclRva2Vucyh0b2tlbnMsIHZpZXcsIHBhcnRpYWxzLCB0ZW1wbGF0ZSwgdGFncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG93LWxldmVsIG1ldGhvZCB0aGF0IHJlbmRlcnMgdGhlIGdpdmVuIGFycmF5IG9mIGB0b2tlbnNgIHVzaW5nXG4gICAgICogdGhlIGdpdmVuIGBjb250ZXh0YCBhbmQgYHBhcnRpYWxzYC5cbiAgICAgKlxuICAgICAqIE5vdGU6IFRoZSBgb3JpZ2luYWxUZW1wbGF0ZWAgaXMgb25seSBldmVyIHVzZWQgdG8gZXh0cmFjdCB0aGUgcG9ydGlvblxuICAgICAqIG9mIHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZSB0aGF0IHdhcyBjb250YWluZWQgaW4gYSBoaWdoZXItb3JkZXIgc2VjdGlvbi5cbiAgICAgKiBJZiB0aGUgdGVtcGxhdGUgZG9lc24ndCB1c2UgaGlnaGVyLW9yZGVyIHNlY3Rpb25zLCB0aGlzIGFyZ3VtZW50IG1heVxuICAgICAqIGJlIG9taXR0ZWQuXG4gICAgICovXG4gICAgcmVuZGVyVG9rZW5zKHRva2VuczogVG9rZW5bXSwgdmlldzogVGVtcGxhdGVWaWV3UGFyYW0sIHBhcnRpYWxzPzogVGVtcGxhdGVQYXJ0aWFsUGFyYW0sIG9yaWdpbmFsVGVtcGxhdGU/OiBzdHJpbmcsIHRhZ3M/OiBUZW1wbGF0ZURlbGltaXRlcnMpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gKHZpZXcgaW5zdGFuY2VvZiBDb250ZXh0KSA/IHZpZXcgOiBuZXcgQ29udGV4dCh2aWV3IGFzIFBsYWluT2JqZWN0KTtcbiAgICAgICAgbGV0IGJ1ZmZlciA9ICcnO1xuXG4gICAgICAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgICAgICAgICBsZXQgdmFsdWU6IHN0cmluZyB8IHZvaWQgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBzd2l0Y2ggKHRva2VuWyQuVFlQRV0pIHtcbiAgICAgICAgICAgICAgICBjYXNlICcjJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnJlbmRlclNlY3Rpb24odG9rZW4sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnXic6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5yZW5kZXJJbnZlcnRlZCh0b2tlbiwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICc+JzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnJlbmRlclBhcnRpYWwodG9rZW4sIGNvbnRleHQsIHBhcnRpYWxzLCB0YWdzKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnJic6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy51bmVzY2FwZWRWYWx1ZSh0b2tlbiwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ25hbWUnOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMuZXNjYXBlZFZhbHVlKHRva2VuLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndGV4dCc6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5yYXdWYWx1ZSh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlciArPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVuZGVyU2VjdGlvbih0b2tlbjogVG9rZW4sIGNvbnRleHQ6IENvbnRleHQsIHBhcnRpYWxzPzogVGVtcGxhdGVQYXJ0aWFsUGFyYW0sIG9yaWdpbmFsVGVtcGxhdGU/OiBzdHJpbmcpOiBzdHJpbmcgfCB2b2lkIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIGxldCBidWZmZXIgPSAnJztcbiAgICAgICAgbGV0IHZhbHVlID0gY29udGV4dC5sb29rdXAodG9rZW5bJC5WQUxVRV0pO1xuXG4gICAgICAgIC8vIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byByZW5kZXIgYW4gYXJiaXRyYXJ5IHRlbXBsYXRlXG4gICAgICAgIC8vIGluIHRoZSBjdXJyZW50IGNvbnRleHQgYnkgaGlnaGVyLW9yZGVyIHNlY3Rpb25zLlxuICAgICAgICBjb25zdCBzdWJSZW5kZXIgPSAodGVtcGxhdGU6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgICAgICAgICByZXR1cm4gc2VsZi5yZW5kZXIodGVtcGxhdGUsIGNvbnRleHQsIHBhcnRpYWxzKTtcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgdiBvZiB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlciArPSB0aGlzLnJlbmRlclRva2Vucyh0b2tlblskLlRPS0VOX0xJU1RdIGFzIFRva2VuW10sIGNvbnRleHQucHVzaCh2KSwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCdvYmplY3QnID09PSB0eXBlb2YgdmFsdWUgfHwgJ3N0cmluZycgPT09IHR5cGVvZiB2YWx1ZSB8fCAnbnVtYmVyJyA9PT0gdHlwZW9mIHZhbHVlKSB7XG4gICAgICAgICAgICBidWZmZXIgKz0gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5bJC5UT0tFTl9MSVNUXSBhcyBUb2tlbltdLCBjb250ZXh0LnB1c2godmFsdWUgYXMgUGxhaW5PYmplY3QpLCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICAgIGlmICgnc3RyaW5nJyAhPT0gdHlwZW9mIG9yaWdpbmFsVGVtcGxhdGUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCB1c2UgaGlnaGVyLW9yZGVyIHNlY3Rpb25zIHdpdGhvdXQgdGhlIG9yaWdpbmFsIHRlbXBsYXRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBFeHRyYWN0IHRoZSBwb3J0aW9uIG9mIHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZSB0aGF0IHRoZSBzZWN0aW9uIGNvbnRhaW5zLlxuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5jYWxsKGNvbnRleHQudmlldywgb3JpZ2luYWxUZW1wbGF0ZS5zbGljZSh0b2tlblskLkVORF0sIHRva2VuWyQuVEFHX0lOREVYXSksIHN1YlJlbmRlcik7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlciArPSB2YWx1ZSBhcyBudW1iZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWZmZXIgKz0gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5bJC5UT0tFTl9MSVNUXSBhcyBUb2tlbltdLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZW5kZXJJbnZlcnRlZCh0b2tlbjogVG9rZW4sIGNvbnRleHQ6IENvbnRleHQsIHBhcnRpYWxzPzogVGVtcGxhdGVQYXJ0aWFsUGFyYW0sIG9yaWdpbmFsVGVtcGxhdGU/OiBzdHJpbmcpOiBzdHJpbmcgfCB2b2lkIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblskLlZBTFVFXSk7XG4gICAgICAgIGlmICghdmFsdWUgfHwgKGlzQXJyYXkodmFsdWUpICYmIDAgPT09IHZhbHVlLmxlbmd0aCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlbmRlclRva2Vucyh0b2tlblskLlRPS0VOX0xJU1RdIGFzIFRva2VuW10sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGluZGVudFBhcnRpYWwocGFydGlhbDogc3RyaW5nLCBpbmRlbnRhdGlvbjogc3RyaW5nLCBsaW5lSGFzTm9uU3BhY2U6IGJvb2xlYW4pOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBmaWx0ZXJlZEluZGVudGF0aW9uID0gaW5kZW50YXRpb24ucmVwbGFjZSgvW14gXFx0XS9nLCAnJyk7XG4gICAgICAgIGNvbnN0IHBhcnRpYWxCeU5sID0gcGFydGlhbC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFydGlhbEJ5TmwubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChwYXJ0aWFsQnlObFtpXS5sZW5ndGggJiYgKGkgPiAwIHx8ICFsaW5lSGFzTm9uU3BhY2UpKSB7XG4gICAgICAgICAgICAgICAgcGFydGlhbEJ5TmxbaV0gPSBmaWx0ZXJlZEluZGVudGF0aW9uICsgcGFydGlhbEJ5TmxbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhcnRpYWxCeU5sLmpvaW4oJ1xcbicpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlbmRlclBhcnRpYWwodG9rZW46IFRva2VuLCBjb250ZXh0OiBDb250ZXh0LCBwYXJ0aWFsczogVGVtcGxhdGVQYXJ0aWFsUGFyYW0gfCB1bmRlZmluZWQsIHRhZ3M6IFRlbXBsYXRlRGVsaW1pdGVycyB8IHVuZGVmaW5lZCk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBpZiAoIXBhcnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB2YWx1ZSA9IChpc0Z1bmN0aW9uKHBhcnRpYWxzKSA/IHBhcnRpYWxzKHRva2VuWyQuVkFMVUVdKSA6IHBhcnRpYWxzW3Rva2VuWyQuVkFMVUVdXSkgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgbGluZUhhc05vblNwYWNlID0gdG9rZW5bJC5IQVNfTk9fU1BBQ0VdO1xuICAgICAgICAgICAgY29uc3QgdGFnSW5kZXggICAgICAgID0gdG9rZW5bJC5UQUdfSU5ERVhdO1xuICAgICAgICAgICAgY29uc3QgaW5kZW50YXRpb24gICAgID0gdG9rZW5bJC5UT0tFTl9MSVNUXTtcbiAgICAgICAgICAgIGxldCBpbmRlbnRlZFZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICBpZiAoMCA9PT0gdGFnSW5kZXggJiYgaW5kZW50YXRpb24pIHtcbiAgICAgICAgICAgICAgICBpbmRlbnRlZFZhbHVlID0gdGhpcy5pbmRlbnRQYXJ0aWFsKHZhbHVlLCBpbmRlbnRhdGlvbiBhcyBzdHJpbmcsIGxpbmVIYXNOb25TcGFjZSEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgeyB0b2tlbnMgfSA9IHRoaXMucGFyc2UoaW5kZW50ZWRWYWx1ZSwgdGFncyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5zLCBjb250ZXh0LCBwYXJ0aWFscywgaW5kZW50ZWRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1bmVzY2FwZWRWYWx1ZSh0b2tlbjogVG9rZW4sIGNvbnRleHQ6IENvbnRleHQpOiBzdHJpbmcgfCB2b2lkIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblskLlZBTFVFXSk7XG4gICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUgYXMgc3RyaW5nO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgZXNjYXBlZFZhbHVlKHRva2VuOiBUb2tlbiwgY29udGV4dDogQ29udGV4dCk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWyQuVkFMVUVdKTtcbiAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBnbG9iYWxTZXR0aW5ncy5lc2NhcGUodmFsdWUgYXMgc3RyaW5nKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJhd1ZhbHVlKHRva2VuOiBUb2tlbik6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0b2tlblskLlZBTFVFXTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7XG4gICAgSlNULFxuICAgIFRlbXBsYXRlRGVsaW1pdGVycyxcbiAgICBJVGVtcGxhdGVFbmdpbmUsXG4gICAgVGVtcGxhdGVTY2FubmVyLFxuICAgIFRlbXBsYXRlQ29udGV4dCxcbiAgICBUZW1wbGF0ZVdyaXRlcixcbiAgICBUZW1wbGF0ZUVzY2FwZXIsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBnbG9iYWxTZXR0aW5ncyB9IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHsgQ2FjaGVMb2NhdGlvbiwgY2xlYXJDYWNoZSB9IGZyb20gJy4vY2FjaGUnO1xuaW1wb3J0IHtcbiAgICB0eXBlIFBsYWluT2JqZWN0LFxuICAgIGlzU3RyaW5nLFxuICAgIHR5cGVTdHJpbmcsXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgU2Nhbm5lciB9IGZyb20gJy4vc2Nhbm5lcic7XG5pbXBvcnQgeyBDb250ZXh0IH0gZnJvbSAnLi9jb250ZXh0JztcbmltcG9ydCB7IFdyaXRlciB9IGZyb20gJy4vd3JpdGVyJztcblxuLyoqIHtAbGluayBUZW1wbGF0ZUVuZ2luZX0gY29tbW9uIHNldHRpbmdzICovXG5nbG9iYWxTZXR0aW5ncy53cml0ZXIgPSBuZXcgV3JpdGVyKCk7XG5cbi8qKlxuICogQGVuIHtAbGluayBUZW1wbGF0ZUVuZ2luZX0gZ2xvYmFsIHNldHRuZyBvcHRpb25zXG4gKiBAamEge0BsaW5rIFRlbXBsYXRlRW5naW5lfSDjgrDjg63jg7zjg5Djg6voqK3lrprjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUdsb2JhbFNldHRpbmdzIHtcbiAgICB3cml0ZXI/OiBUZW1wbGF0ZVdyaXRlcjtcbiAgICB0YWdzPzogVGVtcGxhdGVEZWxpbWl0ZXJzO1xuICAgIGVzY2FwZT86IFRlbXBsYXRlRXNjYXBlcjtcbn1cblxuLyoqXG4gKiBAZW4ge0BsaW5rIFRlbXBsYXRlRW5naW5lfSBjb21waWxlIG9wdGlvbnNcbiAqIEBqYSB7QGxpbmsgVGVtcGxhdGVFbmdpbmV9IOOCs+ODs+ODkeOCpOODq+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMge1xuICAgIHRhZ3M/OiBUZW1wbGF0ZURlbGltaXRlcnM7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlRW5naW5lIHV0aWxpdHkgY2xhc3MuXG4gKiBAamEgVGVtcGxhdGVFbmdpbmUg44Om44O844OG44Kj44Oq44OG44Kj44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZUVuZ2luZSBpbXBsZW1lbnRzIElUZW1wbGF0ZUVuZ2luZSB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHtAbGluayBKU1R9IGZyb20gdGVtcGxhdGUgc291cmNlLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJfjgYvjgokge0BsaW5rIEpTVH0g44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGVtcGxhdGVcbiAgICAgKiAgLSBgZW5gIHRlbXBsYXRlIHNvdXJjZSBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjb21waWxlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCs+ODs+ODkeOCpOODq+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY29tcGlsZSh0ZW1wbGF0ZTogc3RyaW5nLCBvcHRpb25zPzogVGVtcGxhdGVDb21waWxlT3B0aW9ucyk6IEpTVCB7XG4gICAgICAgIGlmICghaXNTdHJpbmcodGVtcGxhdGUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBJbnZhbGlkIHRlbXBsYXRlISB0aGUgZmlyc3QgYXJndW1lbnQgc2hvdWxkIGJlIGEgXCJzdHJpbmdcIiBidXQgXCIke3R5cGVTdHJpbmcodGVtcGxhdGUpfVwiIHdhcyBnaXZlbiBmb3IgVGVtcGxhdGVFbmdpbmUuY29tcGlsZSh0ZW1wbGF0ZSwgb3B0aW9ucylgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgdGFncyB9ID0gb3B0aW9ucyA/PyBnbG9iYWxTZXR0aW5ncztcbiAgICAgICAgY29uc3QgeyB3cml0ZXIgfSA9IGdsb2JhbFNldHRpbmdzO1xuXG4gICAgICAgIGNvbnN0IGpzdCA9ICh2aWV3PzogUGxhaW5PYmplY3QsIHBhcnRpYWxzPzogUGxhaW5PYmplY3QpOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHdyaXRlci5yZW5kZXIodGVtcGxhdGUsIHZpZXcgPz8ge30sIHBhcnRpYWxzLCB0YWdzKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCB7IHRva2VucywgY2FjaGVLZXkgfSA9IHdyaXRlci5wYXJzZSh0ZW1wbGF0ZSwgdGFncyk7XG4gICAgICAgIGpzdC50b2tlbnMgICAgICAgID0gdG9rZW5zO1xuICAgICAgICBqc3QuY2FjaGVLZXkgICAgICA9IGNhY2hlS2V5O1xuICAgICAgICBqc3QuY2FjaGVMb2NhdGlvbiA9IFtDYWNoZUxvY2F0aW9uLk5BTUVTUEFDRSwgQ2FjaGVMb2NhdGlvbi5ST09UXTtcblxuICAgICAgICByZXR1cm4ganN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhcnMgYWxsIGNhY2hlZCB0ZW1wbGF0ZXMgaW4gdGhlIGRlZmF1bHQge0BsaW5rIFRlbXBsYXRlV3JpdGVyfS5cbiAgICAgKiBAamEg5pei5a6a44GuIHtAbGluayBUZW1wbGF0ZVdyaXRlcn0g44Gu44GZ44G544Gm44Gu44Kt44Oj44OD44K344Ol44KS5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjbGVhckNhY2hlKCk6IHZvaWQge1xuICAgICAgICBjbGVhckNhY2hlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoYW5nZSB7QGxpbmsgVGVtcGxhdGVFbmdpbmV9IGdsb2JhbCBzZXR0aW5ncy5cbiAgICAgKiBAamEge0BsaW5rIFRlbXBsYXRlRW5naW5lfSDjgrDjg63jg7zjg5Djg6voqK3lrprjga7mm7TmlrBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZXR0aW5nc1xuICAgICAqICAtIGBlbmAgbmV3IHNldHRpbmdzXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYToqK3lrprlgKRcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHNldHRpbmdzXG4gICAgICogIC0gYGphYCDlj6TjgYToqK3lrprlgKRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHNldEdsb2JhbFNldHRpbmdzKHNldGlpbmdzOiBUZW1wbGF0ZUdsb2JhbFNldHRpbmdzKTogVGVtcGxhdGVHbG9iYWxTZXR0aW5ncyB7XG4gICAgICAgIGNvbnN0IG9sZFNldHRpbmdzID0geyAuLi5nbG9iYWxTZXR0aW5ncyB9O1xuICAgICAgICBjb25zdCB7IHdyaXRlciwgdGFncywgZXNjYXBlIH0gPSBzZXRpaW5ncztcbiAgICAgICAgd3JpdGVyICYmIChnbG9iYWxTZXR0aW5ncy53cml0ZXIgPSB3cml0ZXIpO1xuICAgICAgICB0YWdzICAgJiYgKGdsb2JhbFNldHRpbmdzLnRhZ3MgICA9IHRhZ3MpO1xuICAgICAgICBlc2NhcGUgJiYgKGdsb2JhbFNldHRpbmdzLmVzY2FwZSA9IGVzY2FwZSk7XG4gICAgICAgIHJldHVybiBvbGRTZXR0aW5ncztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgc3RhdGljIG1ldGhvZHM6IGZvciBkZWJ1Z1xuXG4gICAgLyoqIEBpbnRlcm5hbCBDcmVhdGUge0BsaW5rIFRlbXBsYXRlU2Nhbm5lcn0gaW5zdGFuY2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZVNjYW5uZXIoc3JjOiBzdHJpbmcpOiBUZW1wbGF0ZVNjYW5uZXIge1xuICAgICAgICByZXR1cm4gbmV3IFNjYW5uZXIoc3JjKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIENyZWF0ZSB7QGxpbmsgVGVtcGxhdGVDb250ZXh0fSBpbnN0YW5jZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlQ29udGV4dCh2aWV3OiBQbGFpbk9iamVjdCwgcGFyZW50Q29udGV4dD86IENvbnRleHQpOiBUZW1wbGF0ZUNvbnRleHQge1xuICAgICAgICByZXR1cm4gbmV3IENvbnRleHQodmlldywgcGFyZW50Q29udGV4dCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBDcmVhdGUge0BsaW5rIFRlbXBsYXRlV3JpdGVyfSBpbnN0YW5jZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlV3JpdGVyKCk6IFRlbXBsYXRlV3JpdGVyIHtcbiAgICAgICAgcmV0dXJuIG5ldyBXcml0ZXIoKTtcbiAgICB9XG59XG4iXSwibmFtZXMiOlsiaXNOdW1iZXIiLCJfdG9rZW5zIiwiX3Byb3h5SGFuZGxlciIsImNjIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0lBRUE7Ozs7Ozs7SUFPRztJQUNhLFNBQUEsU0FBUyxHQUFBOztJQUVyQixJQUFBLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxVQUFVLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRTtJQUNwRjtJQUVBOzs7Ozs7Ozs7O0lBVUc7SUFDYSxTQUFBLFlBQVksQ0FBbUMsTUFBcUIsRUFBRSxHQUFHLEtBQWUsRUFBQTtJQUNwRyxJQUFBLElBQUksSUFBSSxJQUFJLE1BQU0sSUFBSSxTQUFTLEVBQUUsQ0FBa0I7SUFDbkQsSUFBQSxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtZQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDN0IsUUFBQSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBa0I7SUFDdEMsSUFBQTtJQUNBLElBQUEsT0FBTyxJQUFTO0lBQ3BCO0lBRUE7OztJQUdHO0lBQ0csU0FBVSxrQkFBa0IsQ0FBbUMsU0FBaUIsRUFBQTtJQUNsRixJQUFBLE9BQU8sWUFBWSxDQUFJLElBQUksRUFBRSxTQUFTLENBQUM7SUFDM0M7SUFFQTs7Ozs7SUFLRztJQUNHLFNBQVUsU0FBUyxDQUFtQyxTQUFTLEdBQUcsS0FBSyxFQUFFLFVBQVUsR0FBRyxRQUFRLEVBQUE7UUFDaEcsT0FBTyxZQUFZLENBQUksa0JBQWtCLENBQUMsU0FBUyxDQUFDLEVBQUUsVUFBVSxDQUFDO0lBQ3JFOztJQ25EQTs7OztJQUlHO0lBdU9IO0lBRUE7Ozs7Ozs7SUFPRztJQUNHLFNBQVUsTUFBTSxDQUFJLENBQWMsRUFBQTtRQUNwQyxPQUFPLElBQUksSUFBSSxDQUFDO0lBQ3BCO0lBRUE7Ozs7Ozs7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TSxDQUFDLFFBQVEsRUFBRSxJQUFJLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUM7SUFDOUQsUUFBQSxDQUFDO0lBRUQsUUFBQSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQztJQUN6RCxRQUFBLEdBQUcsQ0FBQyxNQUFNLEdBQVUsTUFBTTtJQUMxQixRQUFBLEdBQUcsQ0FBQyxRQUFRLEdBQVEsUUFBUTtJQUM1QixRQUFBLEdBQUcsQ0FBQyxhQUFhLEdBQUcsQ0FBQSxhQUFBLGdDQUFBLGdCQUFBLDBCQUE2QztJQUVqRSxRQUFBLE9BQU8sR0FBRztJQUNkLElBQUE7SUFFQTs7O0lBR0c7SUFDSSxJQUFBLE9BQU8sVUFBVSxHQUFBO0lBQ3BCLFFBQUEsVUFBVSxFQUFFO0lBQ2hCLElBQUE7SUFFQTs7Ozs7Ozs7OztJQVVHO1FBQ0ksT0FBTyxpQkFBaUIsQ0FBQyxRQUFnQyxFQUFBO0lBQzVELFFBQUEsTUFBTSxXQUFXLEdBQUcsRUFBRSxHQUFHLGNBQWMsRUFBRTtZQUN6QyxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxRQUFRO0lBQ3pDLFFBQUEsTUFBTSxLQUFLLGNBQWMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQzFDLFFBQUEsSUFBSSxLQUFPLGNBQWMsQ0FBQyxJQUFJLEdBQUssSUFBSSxDQUFDO0lBQ3hDLFFBQUEsTUFBTSxLQUFLLGNBQWMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQzFDLFFBQUEsT0FBTyxXQUFXO0lBQ3RCLElBQUE7Ozs7UUFNTyxPQUFPLGFBQWEsQ0FBQyxHQUFXLEVBQUE7SUFDbkMsUUFBQSxPQUFPLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQztJQUMzQixJQUFBOztJQUdPLElBQUEsT0FBTyxhQUFhLENBQUMsSUFBaUIsRUFBRSxhQUF1QixFQUFBO0lBQ2xFLFFBQUEsT0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDO0lBQzNDLElBQUE7O0lBR08sSUFBQSxPQUFPLFlBQVksR0FBQTtZQUN0QixPQUFPLElBQUksTUFBTSxFQUFFO0lBQ3ZCLElBQUE7SUFDSDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2xpYi1jb3JlLyJ9