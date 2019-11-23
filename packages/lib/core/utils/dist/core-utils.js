/*!
 * @cdp/core-utils 0.9.0
 *   core framework utilities
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory((global.CDP = global.CDP || {}, global.CDP.Utils = global.CDP.Utils || {})));
}(this, (function (exports) { 'use strict';

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
        _verifier[method](...args); // eslint-disable-line @typescript-eslint/no-explicit-any
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
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
    /** @internal merge Array */
    function mergeArray(target, source) {
        for (let i = 0, len = source.length; i < len; i++) {
            const oldValue = target[i];
            const newValue = merge(oldValue, source[i]);
            oldValue === newValue || (target[i] = newValue);
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
            oldValue === newValue || target.set(k, newValue);
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
                const oldValue = obj[key];
                const newValue = merge(oldValue, source[key]);
                oldValue === newValue || (obj[key] = newValue);
            }
        }
        else {
            for (const key in source) {
                const oldValue = obj[key];
                const newValue = merge(oldValue, source[key]);
                oldValue === newValue || (obj[key] = newValue);
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
     */
    function deepCopy(src) {
        return deepMerge(undefined, src);
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
    const _protoExtendsOnly = Symbol('protoExtendsOnly');
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
    // helper for setMixClassAttribute(target, 'instanceOf')
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
     * const mixed = new MixinClass();
     * console.log(mixed instanceof MixinClass);    // true
     * console.log(mixed instanceof Base);          // true
     * console.log(mixed instanceof Source);        // true
     * console.log(mixed instanceof Other);         // true ???
     *
     * setMixClassAttribute(Other, 'instanceOf'); // or setMixClassAttribute(Other, 'instanceOf', null);
     * console.log(mixed instanceof Other);         // false !
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
        // eslint-disable-next-line @typescript-eslint/class-name-casing
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

    /* eslint-disable no-invalid-this, @typescript-eslint/no-explicit-any */
    const random = Math.random.bind(Math);
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
            const j = i * random() >>> 0;
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

    /* eslint-disable @typescript-eslint/no-explicit-any */
    function callable() {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return accessible;
    }
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

    /* eslint-disable @typescript-eslint/no-empty-interface, @typescript-eslint/no-explicit-any */
    const root = getGlobal();
    const _setTimeout = safe(root.setTimeout);
    const _clearTimeout = safe(root.clearTimeout);
    const _setInterval = safe(root.setInterval);
    const _clearInterval = safe(root.clearInterval);

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
    /**
     * @en Wait for the designation elapse.
     * @ja 指定時間処理を待機
     *
     * @param elapse
     *  - `en` wait elapse [msec].
     *  - `ja` 待機時間 [msec]
     */
    function sleep(elapse) {
        return new Promise(resolve => _setTimeout(resolve, elapse));
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
    /**
     * @en Escape HTML string
     * @ja HTML で使用する文字を制御文字に置換
     *
     * @brief <br>
     *
     * ```ts
     * const mapHtmlEscape = {
     *     '<': '&lt;',
     *     '>': '&gt;',
     *     '&': '&amp;',
     *     '"': '&quot;',
     *     "'": '&#39;',
     *     '`': '&#x60;'
     * };
     * ```
     */
    const escapeHTML = createEscaper({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;',
        '`': '&#x60;'
    });
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
    /**
     * @en Check whether input source has a property.
     * @ja 入力元がプロパティを持っているか判定
     *
     * @param src
     */
    function hasProperty(src, propName) {
        return null != src && isObject(src) && (propName in src);
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

    exports.camelize = camelize;
    exports.capitalize = capitalize;
    exports.className = className;
    exports.classify = classify;
    exports.clearInterval = _clearInterval;
    exports.clearTimeout = _clearTimeout;
    exports.createEscaper = createEscaper;
    exports.dasherize = dasherize;
    exports.decapitalize = decapitalize;
    exports.deepCopy = deepCopy;
    exports.deepEqual = deepEqual;
    exports.deepMerge = deepMerge;
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
    exports.hasProperty = hasProperty;
    exports.indices = indices;
    exports.instanceOf = instanceOf;
    exports.isArray = isArray;
    exports.isBoolean = isBoolean;
    exports.isEmptyObject = isEmptyObject;
    exports.isFunction = isFunction;
    exports.isIterable = isIterable;
    exports.isNil = isNil;
    exports.isNumber = isNumber;
    exports.isObject = isObject;
    exports.isPlainObject = isPlainObject;
    exports.isPrimitive = isPrimitive;
    exports.isString = isString;
    exports.isSymbol = isSymbol;
    exports.isTypedArray = isTypedArray;
    exports.map = map;
    exports.mixins = mixins;
    exports.noop = noop;
    exports.ownInstanceOf = ownInstanceOf;
    exports.partialize = partialize;
    exports.post = post;
    exports.reduce = reduce;
    exports.restoreNil = restoreNil;
    exports.safe = safe;
    exports.sameClass = sameClass;
    exports.sameType = sameType;
    exports.setInterval = _setInterval;
    exports.setMixClassAttribute = setMixClassAttribute;
    exports.setTimeout = _setTimeout;
    exports.shuffle = shuffle;
    exports.sleep = sleep;
    exports.some = some;
    exports.sort = sort;
    exports.toTypedData = toTypedData;
    exports.typeOf = typeOf;
    exports.underscored = underscored;
    exports.unique = unique;
    exports.verify = verify;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS11dGlscy5qcyIsInNvdXJjZXMiOlsiY29uZmlnLnRzIiwidHlwZXMudHMiLCJ2ZXJpZnkudHMiLCJkZWVwLWNpcmN1aXQudHMiLCJtaXhpbnMudHMiLCJhcnJheS50cyIsInNhZmUudHMiLCJ0aW1lci50cyIsIm1pc2MudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZW4gU2FmZSBgZ2xvYmFsYCBhY2Nlc3Nvci5cbiAqIEBqYSBgZ2xvYmFsYCDjgqLjgq/jgrvjg4PjgrVcbiAqIFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgYGdsb2JhbGAgb2JqZWN0IG9mIHRoZSBydW50aW1lIGVudmlyb25tZW50XG4gKiAgLSBgamFgIOeSsOWig+OBq+W/nOOBmOOBnyBgZ2xvYmFsYCDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEdsb2JhbCgpOiB0eXBlb2YgZ2xvYmFsVGhpcyB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLW5ldy1mdW5jXG4gICAgcmV0dXJuICgnb2JqZWN0JyA9PT0gdHlwZW9mIGdsb2JhbFRoaXMpID8gZ2xvYmFsVGhpcyA6IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG59XG5cbi8qKlxuICogQGVuIEVuc3VyZSBuYW1lZCBvYmplY3QgYXMgcGFyZW50J3MgcHJvcGVydHkuXG4gKiBAamEg6Kaq44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6a44GX44GmLCDlkI3liY3jgavmjIflrprjgZfjgZ/jgqrjg5bjgrjjgqfjgq/jg4jjga7lrZjlnKjjgpLkv53oqLxcbiAqXG4gKiBAcGFyYW0gcGFyZW50XG4gKiAgLSBgZW5gIHBhcmVudCBvYmplY3QuIElmIG51bGwgZ2l2ZW4sIGBnbG9iYWxUaGlzYCBpcyBhc3NpZ25lZC5cbiAqICAtIGBqYWAg6Kaq44Kq44OW44K444Kn44Kv44OILiBudWxsIOOBruWgtOWQiOOBryBgZ2xvYmFsVGhpc2Ag44GM5L2/55So44GV44KM44KLXG4gKiBAcGFyYW0gbmFtZXNcbiAqICAtIGBlbmAgb2JqZWN0IG5hbWUgY2hhaW4gZm9yIGVuc3VyZSBpbnN0YW5jZS5cbiAqICAtIGBqYWAg5L+d6Ki844GZ44KL44Kq44OW44K444Kn44Kv44OI44Gu5ZCN5YmNXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVPYmplY3Q8VCBleHRlbmRzIHt9ID0ge30+KHBhcmVudDogb2JqZWN0IHwgbnVsbCwgLi4ubmFtZXM6IHN0cmluZ1tdKTogVCB7XG4gICAgbGV0IHJvb3QgPSBwYXJlbnQgfHwgZ2V0R2xvYmFsKCk7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIG5hbWVzKSB7XG4gICAgICAgIHJvb3RbbmFtZV0gPSByb290W25hbWVdIHx8IHt9O1xuICAgICAgICByb290ID0gcm9vdFtuYW1lXTtcbiAgICB9XG4gICAgcmV0dXJuIHJvb3QgYXMgVDtcbn1cblxuLyoqXG4gKiBAZW4gR2xvYmFsIG5hbWVzcGFjZSBhY2Nlc3Nvci5cbiAqIEBqYSDjgrDjg63jg7zjg5Djg6vjg43jg7zjg6Djgrnjg5rjg7zjgrnjgqLjgq/jgrvjg4PjgrVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEdsb2JhbE5hbWVzcGFjZTxUIGV4dGVuZHMge30gPSB7fT4obmFtZXNwYWNlOiBzdHJpbmcpOiBUIHtcbiAgICByZXR1cm4gZW5zdXJlT2JqZWN0PFQ+KG51bGwsIG5hbWVzcGFjZSk7XG59XG5cbi8qKlxuICogQGVuIEdsb2JhbCBjb25maWcgYWNjZXNzb3IuXG4gKiBAamEg44Kw44Ot44O844OQ44Or44Kz44Oz44OV44Kj44Kw44Ki44Kv44K744OD44K1XG4gKlxuICogQHJldHVybnMgZGVmYXVsdDogYENEUC5Db25maWdgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25maWc8VCBleHRlbmRzIHt9ID0ge30+KG5hbWVzcGFjZSA9ICdDRFAnLCBjb25maWdOYW1lID0gJ0NvbmZpZycpOiBUIHtcbiAgICByZXR1cm4gZW5zdXJlT2JqZWN0PFQ+KGdldEdsb2JhbE5hbWVzcGFjZShuYW1lc3BhY2UpLCBjb25maWdOYW1lKTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuLyoqXG4gKiBAZW4gVGhlIGdlbmVyYWwgbnVsbCB0eXBlLlxuICogQGphIOepuuOCkuekuuOBmeWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBOaWwgPSB2b2lkIHwgbnVsbCB8IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBAZW4gVGhlIHR5cGUgb2Ygb2JqZWN0IG9yIFtbTmlsXV0uXG4gKiBAamEgW1tOaWxdXSDjgavjgarjgorjgYjjgovjgqrjg5bjgrjjgqfjgq/jg4jlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgTmlsbGFibGU8VCBleHRlbmRzIHt9PiA9IFQgfCBOaWw7XG5cbi8qKlxuICogQGVuIFByaW1pdGl2ZSB0eXBlIG9mIEphdmFTY3JpcHQuXG4gKiBAamEgSmF2YVNjcmlwdCDjga7jg5fjg6rjg5/jg4bjgqPjg5blnotcbiAqL1xuZXhwb3J0IHR5cGUgUHJpbWl0aXZlID0gc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IHN5bWJvbCB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVuIEphdmFTY3JpcHQgdHlwZSBzZXQgaW50ZXJmYWNlLlxuICogQGphIEphdmFTY3JpcHQg44Gu5Z6L44Gu6ZuG5ZCIXG4gKi9cbmludGVyZmFjZSBUeXBlTGlzdCB7XG4gICAgc3RyaW5nOiBzdHJpbmc7XG4gICAgbnVtYmVyOiBudW1iZXI7XG4gICAgYm9vbGVhbjogYm9vbGVhbjtcbiAgICBzeW1ib2w6IHN5bWJvbDtcbiAgICB1bmRlZmluZWQ6IHZvaWQgfCB1bmRlZmluZWQ7XG4gICAgb2JqZWN0OiBvYmplY3QgfCBudWxsO1xuICAgIGZ1bmN0aW9uKC4uLmFyZ3M6IHVua25vd25bXSk6IHVua25vd247XG59XG5cbi8qKlxuICogQGVuIFRoZSBrZXkgbGlzdCBvZiBbW1R5cGVMaXN0XV0uXG4gKiBAamEgW1tUeXBlTGlzdF1dIOOCreODvOS4gOimp1xuICovXG5leHBvcnQgdHlwZSBUeXBlS2V5cyA9IGtleW9mIFR5cGVMaXN0O1xuXG4vKipcbiAqIEBlbiBUeXBlIGJhc2UgZGVmaW5pdGlvbi5cbiAqIEBqYSDlnovjga7opo/lrprlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUeXBlPFQgZXh0ZW5kcyB7fT4gZXh0ZW5kcyBGdW5jdGlvbiB7XG4gICAgcmVhZG9ubHkgcHJvdG90eXBlOiBUO1xufVxuXG4vKipcbiAqIEBlbiBUeXBlIG9mIGNvbnN0cnVjdG9yLlxuICogQGphIOOCs+ODs+OCueODiOODqeOCr+OCv+Wei1xuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbnN0cnVjdG9yPFQ+IGV4dGVuZHMgVHlwZTxUPiB7XG4gICAgbmV3KC4uLmFyZ3M6IHVua25vd25bXSk6IFQ7XG59XG5cbi8qKlxuICogQGVuIFR5cGUgb2YgY2xhc3MuXG4gKiBAamEg44Kv44Op44K55Z6LXG4gKi9cbmV4cG9ydCB0eXBlIENsYXNzPFQgPSBhbnk+ID0gQ29uc3RydWN0b3I8VD47XG5cbi8qKlxuICogQGVuIEVuc3VyZSBmb3IgZnVuY3Rpb24gcGFyYW1ldGVycyB0byB0dXBsZS5cbiAqIEBqYSDplqLmlbDjg5Hjg6njg6Hjg7zjgr/jgajjgZfjgaYgdHVwbGUg44KS5L+d6Ki8XG4gKi9cbmV4cG9ydCB0eXBlIEFyZ3VtZW50czxUPiA9IFQgZXh0ZW5kcyBhbnlbXSA/IFQgOiBbVF07XG5cbi8qKlxuICogQGVuIFJtb3ZlIGByZWFkb25seWAgYXR0cmlidXRlcyBmcm9tIGlucHV0IHR5cGUuXG4gKiBAamEgYHJlYWRvbmx5YCDlsZ7mgKfjgpLop6PpmaRcbiAqL1xuZXhwb3J0IHR5cGUgV3JpdGFibGU8VD4gPSB7IC1yZWFkb25seSBbSyBpbiBrZXlvZiBUXTogVFtLXSB9O1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IGZ1bmN0aW9uYWwgcHJvcGVydHkgbmFtZXMuXG4gKiBAamEg6Zai5pWw44OX44Ot44OR44OG44Kj5ZCN44Gu5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIEZ1bmN0aW9uUHJvcGVydHlOYW1lczxUPiA9IHsgW0sgaW4ga2V5b2YgVF06IFRbS10gZXh0ZW5kcyBGdW5jdGlvbiA/IEsgOiBuZXZlciB9W2tleW9mIFRdO1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IGZ1bmN0aW9uYWwgcHJvcGVydGllcy5cbiAqIEBqYSDplqLmlbDjg5fjg63jg5Hjg4bjgqPjga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgRnVuY3Rpb25Qcm9wZXJ0aWVzPFQ+ID0gUGljazxULCBGdW5jdGlvblByb3BlcnR5TmFtZXM8VD4+O1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG5vbi1mdW5jdGlvbmFsIHByb3BlcnR5IG5hbWVzLlxuICogQGphIOmdnumWouaVsOODl+ODreODkeODhuOCo+WQjeOBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VD4gPSB7IFtLIGluIGtleW9mIFRdOiBUW0tdIGV4dGVuZHMgRnVuY3Rpb24gPyBuZXZlciA6IEsgfVtrZXlvZiBUXTtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBub24tZnVuY3Rpb25hbCBwcm9wZXJ0aWVzLlxuICogQGphIOmdnumWouaVsOODl+ODreODkeODhuOCo+OBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBOb25GdW5jdGlvblByb3BlcnRpZXM8VD4gPSBQaWNrPFQsIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxUPj47XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgb2JqZWN0IGtleSBsaXN0LiAoYGtleW9mYCBhbGlhcylcbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7jgq3jg7zkuIDopqfjgpLmir3lh7ogKGBrZXlvZmAgYWxpYXMpXG4gKi9cbmV4cG9ydCB0eXBlIEtleXM8VCBleHRlbmRzIHt9PiA9IGtleW9mIFQ7XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgb2JqZWN0IHR5cGUgbGlzdC5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7lnovkuIDopqfjgpLmir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZXM8VCBleHRlbmRzIHt9PiA9IFRba2V5b2YgVF07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgb2JqZWN0IGtleSB0byB0eXBlLlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOCreODvOOBi+OCieWei+OBuOWkieaPm1xuICovXG5leHBvcnQgdHlwZSBLZXlUb1R5cGU8TyBleHRlbmRzIHt9LCBLIGV4dGVuZHMga2V5b2YgTz4gPSBLIGV4dGVuZHMga2V5b2YgTyA/IE9bS10gOiBuZXZlcjtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBvYmplY3QgdHlwZSB0byBrZXkuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI5Z6L44GL44KJ44Kt44O844G45aSJ5o+bXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVUb0tleTxPIGV4dGVuZHMge30sIFQgZXh0ZW5kcyBUeXBlczxPPj4gPSB7IFtLIGluIGtleW9mIE9dOiBPW0tdIGV4dGVuZHMgVCA/IEsgOiBuZXZlciB9W2tleW9mIE9dO1xuXG4vKipcbiAqIEBlbiBUaGUgW1tQbGFpbk9iamVjdF1dIHR5cGUgaXMgYSBKYXZhU2NyaXB0IG9iamVjdCBjb250YWluaW5nIHplcm8gb3IgbW9yZSBrZXktdmFsdWUgcGFpcnMuIDxicj5cbiAqICAgICAnUGxhaW4nIG1lYW5zIGl0IGZyb20gb3RoZXIga2luZHMgb2YgSmF2YVNjcmlwdCBvYmplY3RzLiBleDogbnVsbCwgdXNlci1kZWZpbmVkIGFycmF5cywgYW5kIGhvc3Qgb2JqZWN0cyBzdWNoIGFzIGBkb2N1bWVudGAuXG4gKiBAamEgMCDku6XkuIrjga4ga2V5LXZhbHVlIOODmuOCouOCkuaMgeOBpCBbW1BsYWluT2JqZWN0XV0g5a6a576pIDxicj5UaGUgUGxhaW5PYmplY3QgdHlwZSBpcyBhIEphdmFTY3JpcHQgb2JqZWN0IGNvbnRhaW5pbmcgemVybyBvciBtb3JlIGtleS12YWx1ZSBwYWlycy4gPGJyPlxuICogICAgICdQbGFpbicg44Go44Gv5LuW44Gu56iu6aGe44GuIEphdmFTY3JpcHQg44Kq44OW44K444Kn44Kv44OI44KS5ZCr44G+44Gq44GE44Kq44OW44K444Kn44Kv44OI44KS5oSP5ZGz44GZ44KLLiDkvos6ICBudWxsLCDjg6bjg7zjgrbjg7zlrprnvqnphY3liJcsIOOBvuOBn+OBryBgZG9jdW1lbnRgIOOBruOCiOOBhuOBque1hOOBv+i+vOOBv+OCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBsYWluT2JqZWN0PFQgPSBhbnk+IHtcbiAgICBba2V5OiBzdHJpbmddOiBUO1xufVxuXG4vKipcbiAqIEBlbiBUaGUgZGF0YSB0eXBlIGxpc3QgYnkgd2hpY2ggc3R5bGUgY29tcHVsc2lvbiBpcyBwb3NzaWJsZS5cbiAqIEBqYSDlnovlvLfliLblj6/og73jgarjg4fjg7zjgr/lnovkuIDopqdcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZWREYXRhID0gc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGwgfCBvYmplY3Q7XG5cbi8qKlxuICogQGVuIFRoZSBkYXRhIHR5cGUgbGlzdCBvZiBUeXBlZEFycmF5LlxuICogQGphIFR5cGVkQXJyYXkg5LiA6KanXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVkQXJyYXkgPSBJbnQ4QXJyYXkgfCBVaW50OEFycmF5IHwgVWludDhDbGFtcGVkQXJyYXkgfCBJbnQxNkFycmF5IHwgVWludDE2QXJyYXkgfCBJbnQzMkFycmF5IHwgVWludDMyQXJyYXkgfCBGbG9hdDMyQXJyYXkgfCBGbG9hdDY0QXJyYXk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgZXhpc3RzLlxuICogQGphIOWApOOBjOWtmOWcqOOBmeOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4aXN0czxPIGV4dGVuZHMge30+KHg6IE5pbGxhYmxlPE8+KTogeCBpcyBPO1xuZXhwb3J0IGZ1bmN0aW9uIGV4aXN0cyh4OiB1bmtub3duKTogeCBpcyB1bmtub3duO1xuZXhwb3J0IGZ1bmN0aW9uIGV4aXN0cyh4OiBhbnkpOiBhbnkge1xuICAgIHJldHVybiBudWxsICE9IHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFtbTmlsXV0uXG4gKiBAamEgW1tOaWxdXSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05pbCh4OiB1bmtub3duKTogeCBpcyBOaWwge1xuICAgIHJldHVybiBudWxsID09IHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFN0cmluZy5cbiAqIEBqYSBTdHJpbmcg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmcoeDogdW5rbm93bik6IHggaXMgc3RyaW5nIHtcbiAgICByZXR1cm4gJ3N0cmluZycgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBOdW1iZXIuXG4gKiBAamEgTnVtYmVyIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTnVtYmVyKHg6IHVua25vd24pOiB4IGlzIG51bWJlciB7XG4gICAgcmV0dXJuICdudW1iZXInID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgQm9vbGVhbi5cbiAqIEBqYSBCb29sZWFuIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQm9vbGVhbih4OiB1bmtub3duKTogeCBpcyBib29sZWFuIHtcbiAgICByZXR1cm4gJ2Jvb2xlYW4nID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgU3ltYmxlLlxuICogQGphIFN5bWJvbCDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N5bWJvbCh4OiB1bmtub3duKTogeCBpcyBzeW1ib2wge1xuICAgIHJldHVybiAnc3ltYm9sJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIHByaW1pdGl2ZSB0eXBlLlxuICogQGphIOODl+ODquODn+ODhuOCo+ODluWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUHJpbWl0aXZlKHg6IHVua25vd24pOiB4IGlzIFByaW1pdGl2ZSB7XG4gICAgcmV0dXJuICF4IHx8ICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgeCkgJiYgKCdvYmplY3QnICE9PSB0eXBlb2YgeCk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIEFycmF5LlxuICogQGphIEFycmF5IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGNvbnN0IGlzQXJyYXkgPSBBcnJheS5pc0FycmF5OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBPYmplY3QuXG4gKiBAamEgT2JqZWN0IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT2JqZWN0KHg6IHVua25vd24pOiB4IGlzIG9iamVjdCB7XG4gICAgcmV0dXJuIEJvb2xlYW4oeCkgJiYgJ29iamVjdCcgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBbW1BsYWluT2JqZWN0XV0uXG4gKiBAamEgW1tQbGFpbk9iamVjdF1dIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUGxhaW5PYmplY3QoeDogdW5rbm93bik6IHggaXMgUGxhaW5PYmplY3Qge1xuICAgIGlmICghaXNPYmplY3QoeCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGNyZWF0ZSBmcm9tIGBPYmplY3QuY3JlYXRlKCBudWxsIClgIGlzIHBsYWluXG4gICAgaWYgKCFPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIG93bkluc3RhbmNlT2YoT2JqZWN0LCB4KTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgZW1wdHkgb2JqZWN0LlxuICogQGphIOepuuOCquODluOCuOOCp+OCr+ODiOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRW1wdHlPYmplY3QoeDogdW5rbm93bik6IHggaXMgb2JqZWN0IHtcbiAgICBpZiAoIWlzUGxhaW5PYmplY3QoeCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG5hbWUgaW4geCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBGdW5jdGlvbi5cbiAqIEBqYSBGdW5jdGlvbiDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Z1bmN0aW9uKHg6IHVua25vd24pOiB4IGlzIFR5cGVMaXN0WydmdW5jdGlvbiddIHtcbiAgICByZXR1cm4gJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIGlucHV0LlxuICogQGphIOaMh+WumuOBl+OBn+Wei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB0eXBlXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB0eXBlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+Wei1xuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZU9mPEsgZXh0ZW5kcyBUeXBlS2V5cz4odHlwZTogSywgeDogdW5rbm93bik6IHggaXMgVHlwZUxpc3RbS10ge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gdHlwZTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGhhcyBpdGVyYXRvci5cbiAqIEBqYSBpdGVyYXRvciDjgpLmiYDmnInjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlPFQ+KHg6IE5pbGxhYmxlPEl0ZXJhYmxlPFQ+Pik6IHggaXMgSXRlcmFibGU8VD47XG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZSh4OiB1bmtub3duKTogeCBpcyBJdGVyYWJsZTx1bmtub3duPjtcbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlKHg6IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoeCk7XG59XG5cbmNvbnN0IF90eXBlZEFycmF5TmFtZXMgPSB7XG4gICAgJ0ludDhBcnJheSc6IHRydWUsXG4gICAgJ1VpbnQ4QXJyYXknOiB0cnVlLFxuICAgICdVaW50OENsYW1wZWRBcnJheSc6IHRydWUsXG4gICAgJ0ludDE2QXJyYXknOiB0cnVlLFxuICAgICdVaW50MTZBcnJheSc6IHRydWUsXG4gICAgJ0ludDMyQXJyYXknOiB0cnVlLFxuICAgICdVaW50MzJBcnJheSc6IHRydWUsXG4gICAgJ0Zsb2F0MzJBcnJheSc6IHRydWUsXG4gICAgJ0Zsb2F0NjRBcnJheSc6IHRydWUsXG59O1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgaXMgb25lIG9mIFtbVHlwZWRBcnJheV1dLlxuICogQGphIOaMh+WumuOBl+OBn+OCpOODs+OCueOCv+ODs+OCueOBjCBbW1R5cGVkQXJyYXldXSDjga7kuIDnqK7jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVkQXJyYXkoeDogdW5rbm93bik6IHggaXMgVHlwZWRBcnJheSB7XG4gICAgcmV0dXJuICEhX3R5cGVkQXJyYXlOYW1lc1tjbGFzc05hbWUoeCldO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgaW5zdGFuY2Ugb2YgaW5wdXQuXG4gKiBAamEg5oyH5a6a44GX44Gf44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIGNvbnN0cnVjdG9yXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+OCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5zdGFuY2VPZjxUIGV4dGVuZHMge30+KGN0b3I6IE5pbGxhYmxlPFR5cGU8VD4+LCB4OiB1bmtub3duKTogeCBpcyBUIHtcbiAgICByZXR1cm4gKCdmdW5jdGlvbicgPT09IHR5cGVvZiBjdG9yKSAmJiAoeCBpbnN0YW5jZW9mIGN0b3IpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgaW5zdGFuY2Ugb2YgaW5wdXQgY29uc3RydWN0b3IgKGV4Y2VwdCBzdWIgY2xhc3MpLlxuICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OBruOCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+WIpOWumiAo5rS+55Sf44Kv44Op44K544Gv5ZCr44KB44Gq44GEKVxuICpcbiAqIEBwYXJhbSBjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDoqZXkvqHjgZnjgovjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG93bkluc3RhbmNlT2Y8VCBleHRlbmRzIHt9PihjdG9yOiBOaWxsYWJsZTxUeXBlPFQ+PiwgeDogdW5rbm93bik6IHggaXMgVCB7XG4gICAgcmV0dXJuIChudWxsICE9IHgpICYmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgY3RvcikgJiYgKE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSA9PT0gT2JqZWN0KGN0b3IucHJvdG90eXBlKSk7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgdmFsdWUncyBjbGFzcyBuYW1lLlxuICogQGphIOOCr+ODqeOCueWQjeOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzTmFtZSh4OiBhbnkpOiBzdHJpbmcge1xuICAgIGlmICh4ICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgdG9TdHJpbmdUYWdOYW1lID0geFtTeW1ib2wudG9TdHJpbmdUYWddO1xuICAgICAgICBpZiAoaXNTdHJpbmcodG9TdHJpbmdUYWdOYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRvU3RyaW5nVGFnTmFtZTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0Z1bmN0aW9uKHgpICYmIHgucHJvdG90eXBlICYmIG51bGwgIT0geC5uYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4geC5uYW1lO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgY3RvciA9IHguY29uc3RydWN0b3I7XG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihjdG9yKSAmJiBjdG9yID09PSAoT2JqZWN0KGN0b3IucHJvdG90eXBlKSBhcyBvYmplY3QpLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGN0b3IubmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSBhcyBzdHJpbmcpLnNsaWNlKDgsIC0xKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgaW5wdXQgdmFsdWVzIGFyZSBzYW1lIHZhbHVlLXR5cGUuXG4gKiBAamEg5YWl5Yqb44GM5ZCM5LiA5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGxoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKiBAcGFyYW0gcmhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhbWVUeXBlKGxoczogdW5rbm93biwgcmhzOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHR5cGVvZiBsaHMgPT09IHR5cGVvZiByaHM7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIGlucHV0IHZhbHVlcyBhcmUgc2FtZSBjbGFzcy5cbiAqIEBqYSDlhaXlipvjgYzlkIzkuIDjgq/jg6njgrnjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gbGhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqIEBwYXJhbSByaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FtZUNsYXNzKGxoczogdW5rbm93biwgcmhzOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgaWYgKG51bGwgPT0gbGhzICYmIG51bGwgPT0gcmhzKSB7XG4gICAgICAgIHJldHVybiBjbGFzc05hbWUobGhzKSA9PT0gY2xhc3NOYW1lKHJocyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIChudWxsICE9IGxocykgJiYgKG51bGwgIT0gcmhzKSAmJiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKGxocykgPT09IE9iamVjdC5nZXRQcm90b3R5cGVPZihyaHMpKTtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIFR5cGVLZXlzLFxuICAgIGlzQXJyYXksXG4gICAgZXhpc3RzLFxuICAgIGNsYXNzTmFtZSxcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogQGVuIFR5cGUgdmVyaWZpZXIgaW50ZXJmYWNlIGRlZmluaXRpb24uIDxicj5cbiAqICAgICBJZiBpbnZhbGlkIHZhbHVlIHJlY2VpdmVkLCB0aGUgbWV0aG9kIHRocm93cyBgVHlwZUVycm9yYC5cbiAqIEBqYSDlnovmpJzoqLzjga7jgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqkgPGJyPlxuICogICAgIOmBleWPjeOBl+OBn+WgtOWQiOOBryBgVHlwZUVycm9yYCDjgpLnmbrnlJ9cbiAqXG4gKlxuICovXG5pbnRlcmZhY2UgVmVyaWZpZXIge1xuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBpcyBub3QgW1tOaWxdXS5cbiAgICAgKiBAamEgW1tOaWxdXSDjgafjgarjgYTjgZPjgajjgpLmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub3ROaWwueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gbm90TmlsLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBub3ROaWw6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGlzIFtbVHlwZUtleXNdXS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIFtbVHlwZUtleXNdXSDjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlT2YudHlwZVxuICAgICAqICAtIGBlbmAgb25lIG9mIFtbVHlwZUtleXNdXVxuICAgICAqICAtIGBqYWAgW1tUeXBlS2V5c11dIOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSB0eXBlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gdHlwZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICB0eXBlT2Y6ICh0eXBlOiBUeXBlS2V5cywgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBpcyBgQXJyYXlgLlxuICAgICAqIEBqYSBgQXJyYXlgIOOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5LnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGFycmF5Lm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBhcnJheTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaXMgYEl0ZXJhYmxlYC5cbiAgICAgKiBAamEgYEl0ZXJhYmxlYCDjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpdGVyYWJsZS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBpdGVyYWJsZS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaXRlcmFibGU6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGluc3RhbmNlIGlzIGVxdWFsIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44Gu44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5zdGFuY2VPZi5jdG9yXG4gICAgICogIC0gYGVuYCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOavlOi8g+WvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBpbnN0YW5jZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGluc3RhbmNlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpbnN0YW5jZSBoYXMgYHN0cmljdGx5YCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3IuXG4gICAgICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OBruWOs+WvhuS4gOiHtOOBl+OBn+OCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIG93bkluc3RhbmNlT2YuY3RvclxuICAgICAqICAtIGBlbmAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDmr5TovIPlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gb3duSW5zdGFuY2VPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBvd25JbnN0YW5jZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBvd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaW5zdGFuY2UgaGFzIG5vdCBgc3RyaWN0bHlgIGVxdWFsIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44KS5oyB44Gk44Kk44Oz44K544K/44Oz44K544Gn44Gq44GE44GT44Go44KS5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm90T3duSW5zdGFuY2VPZi5jdG9yXG4gICAgICogIC0gYGVuYCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOavlOi8g+WvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBub3RPd25JbnN0YW5jZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIG5vdE93bkluc3RhbmNlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIG5vdE93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBoYXMgc3BlY2lmaWVkIHByb3BlcnR5LlxuICAgICAqIEBqYSDmjIflrprjg5fjg63jg5Hjg4bjgqPjgpLmjIHjgaPjgabjgYTjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYXNQcm9wZXJ0eS5wcm9wXG4gICAgICogIC0gYGVuYCBzcGVjaWZpZWQgcHJvcGVydHlcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqIEBwYXJhbSBoYXNQcm9wZXJ0eS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBoYXNQcm9wZXJ0eS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaGFzUHJvcGVydHk6ICh4OiB1bmtub3duLCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBoYXMgb3duIHNwZWNpZmllZCBwcm9wZXJ0eS5cbiAgICAgKiBAamEg5oyH5a6a44OX44Ot44OR44OG44Kj44KS5YWl5Yqb5YCk6Ieq6Lqr5oyB44Gj44Gm44GE44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFzT3duUHJvcGVydHkucHJvcFxuICAgICAqICAtIGBlbmAgc3BlY2lmaWVkIHByb3BlcnR5XG4gICAgICogIC0gYGphYCDlr77osaHjga7jg5fjg63jg5Hjg4bjgqNcbiAgICAgKiBAcGFyYW0gaGFzT3duUHJvcGVydHkueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaGFzT3duUHJvcGVydHkubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGhhc093blByb3BlcnR5OiAoeDogdW5rbm93biwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG59XG5cbi8qKlxuICogQGVuIExpc3Qgb2YgbWV0aG9kIGZvciB0eXBlIHZlcmlmeS5cbiAqIEBqYSDlnovmpJzoqLzjgYzmj5DkvpvjgZnjgovjg6Hjgr3jg4Pjg4nkuIDopqdcbiAqL1xudHlwZSBWZXJpZnlNZXRob2QgPSBrZXlvZiBWZXJpZmllcjtcblxuLyoqXG4gKiBAZW4gQ29uY3JldGUgdHlwZSB2ZXJpZmllciBvYmplY3QuXG4gKiBAamEg5Z6L5qSc6Ki85a6f6KOF44Kq44OW44K444Kn44Kv44OIXG4gKlxuICogQGludGVybmFsXG4gKi9cbmNvbnN0IF92ZXJpZmllcjogVmVyaWZpZXIgPSB7XG4gICAgbm90TmlsOiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCA9PSB4KSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhIHZhbGlkIHZhbHVlLmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB0eXBlT2Y6ICh0eXBlOiBUeXBlS2V5cywgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHggIT09IHR5cGUpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUeXBlIG9mICR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgJHt0eXBlfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgYXJyYXk6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICghaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYW4gQXJyYXkuYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGl0ZXJhYmxlOiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAoIShTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KHgpKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYW4gaXRlcmFibGUgb2JqZWN0LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBpbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKCEoeCBpbnN0YW5jZW9mIGN0b3IpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhbiBpbnN0YW5jZSBvZiAke2N0b3IubmFtZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIG93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCA9PSB4IHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSAhPT0gT2JqZWN0KGN0b3IucHJvdG90eXBlKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFRoZSBvYmplY3QgaXMgbm90IG93biBpbnN0YW5jZSBvZiAke2N0b3IubmFtZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIG5vdE93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCAhPSB4ICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSA9PT0gT2JqZWN0KGN0b3IucHJvdG90eXBlKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFRoZSBvYmplY3QgaXMgb3duIGluc3RhbmNlIG9mICR7Y3Rvci5uYW1lfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaGFzUHJvcGVydHk6ICh4OiBhbnksIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7ICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICBpZiAobnVsbCA9PSB4IHx8ICEocHJvcCBpbiB4KSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFRoZSBvYmplY3QgZG9lcyBub3QgaGF2ZSBwcm9wZXJ0eSAke1N0cmluZyhwcm9wKX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGhhc093blByb3BlcnR5OiAoeDogdW5rbm93biwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHgsIHByb3ApKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBkb2VzIG5vdCBoYXZlIG93biBwcm9wZXJ0eSAke1N0cmluZyhwcm9wKX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogQGVuIFZlcmlmeSBtZXRob2QuXG4gKiBAamEg5qSc6Ki844Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIG1ldGhvZFxuICogIC0gYGVuYCBtZXRob2QgbmFtZSB3aGljaCB1c2luZ1xuICogIC0gYGphYCDkvb/nlKjjgZnjgovjg6Hjgr3jg4Pjg4nlkI1cbiAqIEBwYXJhbSBhcmdzXG4gKiAgLSBgZW5gIGFyZ3VtZW50cyB3aGljaCBjb3JyZXNwb25kcyB0byB0aGUgbWV0aG9kIG5hbWVcbiAqICAtIGBqYWAg44Oh44K944OD44OJ5ZCN44Gr5a++5b+c44GZ44KL5byV5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2ZXJpZnk8VE1ldGhvZCBleHRlbmRzIFZlcmlmeU1ldGhvZD4obWV0aG9kOiBUTWV0aG9kLCAuLi5hcmdzOiBQYXJhbWV0ZXJzPFZlcmlmaWVyW1RNZXRob2RdPik6IHZvaWQgfCBuZXZlciB7XG4gICAgKF92ZXJpZmllclttZXRob2RdIGFzIGFueSkoLi4uYXJncyk7ICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxufVxuXG5leHBvcnQgeyB2ZXJpZnkgYXMgZGVmYXVsdCB9O1xuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5pbXBvcnQge1xuICAgIFR5cGVkQXJyYXksXG4gICAgaXNGdW5jdGlvbixcbiAgICBpc0FycmF5LFxuICAgIGlzT2JqZWN0LFxuICAgIGlzSXRlcmFibGUsXG4gICAgaXNUeXBlZEFycmF5LFxuICAgIHNhbWVDbGFzcyxcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBkZWVwRXF1YWwoKSAqL1xuZnVuY3Rpb24gYXJyYXlFcXVhbChsaHM6IHVua25vd25bXSwgcmhzOiB1bmtub3duW10pOiBib29sZWFuIHtcbiAgICBjb25zdCBsZW4gPSBsaHMubGVuZ3RoO1xuICAgIGlmIChsZW4gIT09IHJocy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICghZGVlcEVxdWFsKGxoc1tpXSwgcmhzW2ldKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgZGVlcEVxdWFsKCkgKi9cbmZ1bmN0aW9uIGJ1ZmZlckVxdWFsKGxoczogU2hhcmVkQXJyYXlCdWZmZXIgfCBBcnJheUJ1ZmZlciwgcmhzOiBTaGFyZWRBcnJheUJ1ZmZlciB8IEFycmF5QnVmZmVyKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc2l6ZSA9IGxocy5ieXRlTGVuZ3RoO1xuICAgIGlmIChzaXplICE9PSByaHMuYnl0ZUxlbmd0aCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGxldCBwb3MgPSAwO1xuICAgIGlmIChzaXplIC0gcG9zID49IDgpIHtcbiAgICAgICAgY29uc3QgbGVuID0gc2l6ZSA+Pj4gMztcbiAgICAgICAgY29uc3QgZjY0TCA9IG5ldyBGbG9hdDY0QXJyYXkobGhzLCAwLCBsZW4pO1xuICAgICAgICBjb25zdCBmNjRSID0gbmV3IEZsb2F0NjRBcnJheShyaHMsIDAsIGxlbik7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGlmICghT2JqZWN0LmlzKGY2NExbaV0sIGY2NFJbaV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHBvcyA9IGxlbiA8PCAzO1xuICAgIH1cbiAgICBpZiAocG9zID09PSBzaXplKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBjb25zdCBMID0gbmV3IERhdGFWaWV3KGxocyk7XG4gICAgY29uc3QgUiA9IG5ldyBEYXRhVmlldyhyaHMpO1xuICAgIGlmIChzaXplIC0gcG9zID49IDQpIHtcbiAgICAgICAgaWYgKCFPYmplY3QuaXMoTC5nZXRVaW50MzIocG9zKSwgUi5nZXRVaW50MzIocG9zKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwb3MgKz0gNDtcbiAgICB9XG4gICAgaWYgKHNpemUgLSBwb3MgPj0gMikge1xuICAgICAgICBpZiAoIU9iamVjdC5pcyhMLmdldFVpbnQxNihwb3MpLCBSLmdldFVpbnQxNihwb3MpKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHBvcyArPSAyO1xuICAgIH1cbiAgICBpZiAoc2l6ZSA+IHBvcykge1xuICAgICAgICBpZiAoIU9iamVjdC5pcyhMLmdldFVpbnQ4KHBvcyksIFIuZ2V0VWludDgocG9zKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwb3MgKz0gMTtcbiAgICB9XG4gICAgcmV0dXJuIHBvcyA9PT0gc2l6ZTtcbn1cblxuLyoqXG4gKiBAZW4gUGVyZm9ybXMgYSBkZWVwIGNvbXBhcmlzb24gYmV0d2VlbiB0d28gdmFsdWVzIHRvIGRldGVybWluZSBpZiB0aGV5IGFyZSBlcXVpdmFsZW50LlxuICogQGphIDLlgKTjga7oqbPntLDmr5TovIPjgpLjgZcsIOetieOBl+OBhOOBi+OBqeOBhuOBi+WIpOWumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVlcEVxdWFsKGxoczogdW5rbm93biwgcmhzOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgaWYgKGxocyA9PT0gcmhzKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXNGdW5jdGlvbihsaHMpICYmIGlzRnVuY3Rpb24ocmhzKSkge1xuICAgICAgICByZXR1cm4gbGhzLmxlbmd0aCA9PT0gcmhzLmxlbmd0aCAmJiBsaHMubmFtZSA9PT0gcmhzLm5hbWU7XG4gICAgfVxuICAgIGlmICghaXNPYmplY3QobGhzKSB8fCAhaXNPYmplY3QocmhzKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHsgLy8gUHJpbWl0aXZlIFdyYXBwZXIgT2JqZWN0cyAvIERhdGVcbiAgICAgICAgY29uc3QgdmFsdWVMID0gbGhzLnZhbHVlT2YoKTtcbiAgICAgICAgY29uc3QgdmFsdWVSID0gcmhzLnZhbHVlT2YoKTtcbiAgICAgICAgaWYgKGxocyAhPT0gdmFsdWVMIHx8IHJocyAhPT0gdmFsdWVSKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVMID09PSB2YWx1ZVI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBSZWdFeHBcbiAgICAgICAgY29uc3QgaXNSZWdFeHBMID0gbGhzIGluc3RhbmNlb2YgUmVnRXhwO1xuICAgICAgICBjb25zdCBpc1JlZ0V4cFIgPSByaHMgaW5zdGFuY2VvZiBSZWdFeHA7XG4gICAgICAgIGlmIChpc1JlZ0V4cEwgfHwgaXNSZWdFeHBSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNSZWdFeHBMID09PSBpc1JlZ0V4cFIgJiYgU3RyaW5nKGxocykgPT09IFN0cmluZyhyaHMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gQXJyYXlcbiAgICAgICAgY29uc3QgaXNBcnJheUwgPSBpc0FycmF5KGxocyk7XG4gICAgICAgIGNvbnN0IGlzQXJyYXlSID0gaXNBcnJheShyaHMpO1xuICAgICAgICBpZiAoaXNBcnJheUwgfHwgaXNBcnJheVIpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0FycmF5TCA9PT0gaXNBcnJheVIgJiYgYXJyYXlFcXVhbChsaHMgYXMgYW55LCByaHMgYXMgYW55KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIEFycmF5QnVmZmVyXG4gICAgICAgIGNvbnN0IGlzQnVmZmVyTCA9IGxocyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyO1xuICAgICAgICBjb25zdCBpc0J1ZmZlclIgPSByaHMgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcjtcbiAgICAgICAgaWYgKGlzQnVmZmVyTCB8fCBpc0J1ZmZlclIpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0J1ZmZlckwgPT09IGlzQnVmZmVyUiAmJiBidWZmZXJFcXVhbChsaHMgYXMgYW55LCByaHMgYXMgYW55KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIEFycmF5QnVmZmVyVmlld1xuICAgICAgICBjb25zdCBpc0J1ZmZlclZpZXdMID0gQXJyYXlCdWZmZXIuaXNWaWV3KGxocyk7XG4gICAgICAgIGNvbnN0IGlzQnVmZmVyVmlld1IgPSBBcnJheUJ1ZmZlci5pc1ZpZXcocmhzKTtcbiAgICAgICAgaWYgKGlzQnVmZmVyVmlld0wgfHwgaXNCdWZmZXJWaWV3Uikge1xuICAgICAgICAgICAgcmV0dXJuIGlzQnVmZmVyVmlld0wgPT09IGlzQnVmZmVyVmlld1IgJiYgc2FtZUNsYXNzKGxocywgcmhzKVxuICAgICAgICAgICAgICAgICYmIGJ1ZmZlckVxdWFsKChsaHMgYXMgQXJyYXlCdWZmZXJWaWV3KS5idWZmZXIsIChyaHMgYXMgQXJyYXlCdWZmZXJWaWV3KS5idWZmZXIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gb3RoZXIgSXRlcmFibGVcbiAgICAgICAgY29uc3QgaXNJdGVyYWJsZUwgPSBpc0l0ZXJhYmxlKGxocyk7XG4gICAgICAgIGNvbnN0IGlzSXRlcmFibGVSID0gaXNJdGVyYWJsZShyaHMpO1xuICAgICAgICBpZiAoaXNJdGVyYWJsZUwgfHwgaXNJdGVyYWJsZVIpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0l0ZXJhYmxlTCA9PT0gaXNJdGVyYWJsZVIgJiYgYXJyYXlFcXVhbChbLi4uKGxocyBhcyBhbnkpXSwgWy4uLihyaHMgYXMgYW55KV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChzYW1lQ2xhc3MobGhzLCByaHMpKSB7XG4gICAgICAgIGNvbnN0IGtleXNMID0gbmV3IFNldChPYmplY3Qua2V5cyhsaHMpKTtcbiAgICAgICAgY29uc3Qga2V5c1IgPSBuZXcgU2V0KE9iamVjdC5rZXlzKHJocykpO1xuICAgICAgICBpZiAoa2V5c0wuc2l6ZSAhPT0ga2V5c1Iuc2l6ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGtleXNMKSB7XG4gICAgICAgICAgICBpZiAoIWtleXNSLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGtleXNMKSB7XG4gICAgICAgICAgICBpZiAoIWRlZXBFcXVhbChsaHNba2V5XSwgcmhzW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gbGhzKSB7XG4gICAgICAgICAgICBpZiAoIShrZXkgaW4gcmhzKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBrZXlzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIHJocykge1xuICAgICAgICAgICAgaWYgKCEoa2V5IGluIGxocykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBrZXlzLmFkZChrZXkpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGtleXMpIHtcbiAgICAgICAgICAgIGlmICghZGVlcEVxdWFsKGxoc1trZXldLCByaHNba2V5XSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGNsb25lIFJlZ0V4cCAqL1xuZnVuY3Rpb24gY2xvbmVSZWdFeHAocmVnZXhwOiBSZWdFeHApOiBSZWdFeHAge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBSZWdFeHAocmVnZXhwLnNvdXJjZSwgcmVnZXhwLmZsYWdzKTtcbiAgICByZXN1bHQubGFzdEluZGV4ID0gcmVnZXhwLmxhc3RJbmRleDtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKiogQGludGVybmFsIGNsb25lIEFycmF5QnVmZmVyICovXG5mdW5jdGlvbiBjbG9uZUFycmF5QnVmZmVyKGFycmF5QnVmZmVyOiBBcnJheUJ1ZmZlcik6IEFycmF5QnVmZmVyIHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgQXJyYXlCdWZmZXIoYXJyYXlCdWZmZXIuYnl0ZUxlbmd0aCk7XG4gICAgbmV3IFVpbnQ4QXJyYXkocmVzdWx0KS5zZXQobmV3IFVpbnQ4QXJyYXkoYXJyYXlCdWZmZXIpKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKiogQGludGVybmFsIGNsb25lIERhdGFWaWV3ICovXG5mdW5jdGlvbiBjbG9uZURhdGFWaWV3KGRhdGFWaWV3OiBEYXRhVmlldyk6IERhdGFWaWV3IHtcbiAgICBjb25zdCBidWZmZXIgPSBjbG9uZUFycmF5QnVmZmVyKGRhdGFWaWV3LmJ1ZmZlcik7XG4gICAgcmV0dXJuIG5ldyBEYXRhVmlldyhidWZmZXIsIGRhdGFWaWV3LmJ5dGVPZmZzZXQsIGRhdGFWaWV3LmJ5dGVMZW5ndGgpO1xufVxuXG4vKiogQGludGVybmFsIGNsb25lIFR5cGVkQXJyYXkgKi9cbmZ1bmN0aW9uIGNsb25lVHlwZWRBcnJheTxUIGV4dGVuZHMgVHlwZWRBcnJheT4odHlwZWRBcnJheTogVCk6IFQge1xuICAgIGNvbnN0IGJ1ZmZlciA9IGNsb25lQXJyYXlCdWZmZXIodHlwZWRBcnJheS5idWZmZXIpO1xuICAgIHJldHVybiBuZXcgKHR5cGVkQXJyYXkgYXMgYW55KS5jb25zdHJ1Y3RvcihidWZmZXIsIHR5cGVkQXJyYXkuYnl0ZU9mZnNldCwgdHlwZWRBcnJheS5sZW5ndGgpO1xufVxuXG4vKiogQGludGVybmFsIG1lcmdlIEFycmF5ICovXG5mdW5jdGlvbiBtZXJnZUFycmF5KHRhcmdldDogYW55W10sIHNvdXJjZTogYW55W10pOiBhbnlbXSB7XG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHNvdXJjZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtpXTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBtZXJnZShvbGRWYWx1ZSwgc291cmNlW2ldKTtcbiAgICAgICAgb2xkVmFsdWUgPT09IG5ld1ZhbHVlIHx8ICh0YXJnZXRbaV0gPSBuZXdWYWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgbWVyZ2UgU2V0ICovXG5mdW5jdGlvbiBtZXJnZVNldCh0YXJnZXQ6IFNldDxhbnk+LCBzb3VyY2U6IFNldDxhbnk+KTogU2V0PGFueT4ge1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiBzb3VyY2UpIHtcbiAgICAgICAgdGFyZ2V0LmhhcyhpdGVtKSB8fCB0YXJnZXQuYWRkKG1lcmdlKHVuZGVmaW5lZCwgaXRlbSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG4vKiogQGludGVybmFsIG1lcmdlIE1hcCAqL1xuZnVuY3Rpb24gbWVyZ2VNYXAodGFyZ2V0OiBNYXA8YW55LCBhbnk+LCBzb3VyY2U6IE1hcDxhbnksIGFueT4pOiBNYXA8YW55LCBhbnk+IHtcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBzb3VyY2UpIHtcbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXQuZ2V0KGspO1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1lcmdlKG9sZFZhbHVlLCB2KTtcbiAgICAgICAgb2xkVmFsdWUgPT09IG5ld1ZhbHVlIHx8IHRhcmdldC5zZXQoaywgbmV3VmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgZGVlcE1lcmdlKCkgKi9cbmZ1bmN0aW9uIG1lcmdlKHRhcmdldDogdW5rbm93biwgc291cmNlOiB1bmtub3duKTogYW55IHtcbiAgICBpZiAodW5kZWZpbmVkID09PSBzb3VyY2UgfHwgdGFyZ2V0ID09PSBzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG4gICAgaWYgKCFpc09iamVjdChzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgfVxuICAgIC8vIFByaW1pdGl2ZSBXcmFwcGVyIE9iamVjdHMgLyBEYXRlXG4gICAgaWYgKHNvdXJjZS52YWx1ZU9mKCkgIT09IHNvdXJjZSkge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IG5ldyAoc291cmNlIGFzIGFueSkuY29uc3RydWN0b3Ioc291cmNlLnZhbHVlT2YoKSk7XG4gICAgfVxuICAgIC8vIFJlZ0V4cFxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgcmV0dXJuIGRlZXBFcXVhbCh0YXJnZXQsIHNvdXJjZSkgPyB0YXJnZXQgOiBjbG9uZVJlZ0V4cChzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBBcnJheUJ1ZmZlclxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IGNsb25lQXJyYXlCdWZmZXIoc291cmNlKTtcbiAgICB9XG4gICAgLy8gQXJyYXlCdWZmZXJWaWV3XG4gICAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBkZWVwRXF1YWwodGFyZ2V0LCBzb3VyY2UpID8gdGFyZ2V0IDogaXNUeXBlZEFycmF5KHNvdXJjZSkgPyBjbG9uZVR5cGVkQXJyYXkoc291cmNlKSA6IGNsb25lRGF0YVZpZXcoc291cmNlIGFzIERhdGFWaWV3KTtcbiAgICB9XG4gICAgLy8gQXJyYXlcbiAgICBpZiAoQXJyYXkuaXNBcnJheShzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBtZXJnZUFycmF5KGlzQXJyYXkodGFyZ2V0KSA/IHRhcmdldCA6IFtdLCBzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBTZXRcbiAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgU2V0KSB7XG4gICAgICAgIHJldHVybiBtZXJnZVNldCh0YXJnZXQgaW5zdGFuY2VvZiBTZXQgPyB0YXJnZXQgOiBuZXcgU2V0KCksIHNvdXJjZSk7XG4gICAgfVxuICAgIC8vIE1hcFxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgICAgcmV0dXJuIG1lcmdlTWFwKHRhcmdldCBpbnN0YW5jZW9mIE1hcCA/IHRhcmdldCA6IG5ldyBNYXAoKSwgc291cmNlKTtcbiAgICB9XG5cbiAgICBjb25zdCBvYmogPSBpc09iamVjdCh0YXJnZXQpID8gdGFyZ2V0IDoge307XG4gICAgaWYgKHNhbWVDbGFzcyh0YXJnZXQsIHNvdXJjZSkpIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc291cmNlKSkge1xuICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBvYmpba2V5XTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWVyZ2Uob2xkVmFsdWUsIHNvdXJjZVtrZXldKTtcbiAgICAgICAgICAgIG9sZFZhbHVlID09PSBuZXdWYWx1ZSB8fCAob2JqW2tleV0gPSBuZXdWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGNvbnN0IG9sZFZhbHVlID0gb2JqW2tleV07XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1lcmdlKG9sZFZhbHVlLCBzb3VyY2Vba2V5XSk7XG4gICAgICAgICAgICBvbGRWYWx1ZSA9PT0gbmV3VmFsdWUgfHwgKG9ialtrZXldID0gbmV3VmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogQGVuIFJlY3Vyc2l2ZWx5IG1lcmdlcyBvd24gYW5kIGluaGVyaXRlZCBlbnVtZXJhYmxlIHN0cmluZyBrZXllZCBwcm9wZXJ0aWVzIG9mIHNvdXJjZSBvYmplY3RzIGludG8gdGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7lho3luLDnmoTjg57jg7zjgrjjgpLlrp/ooYxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBNZXJnZTxULCBTMSwgUzIsIFMzLCBTNCwgUzUsIFM2LCBTNywgUzgsIFM5PihcbiAgICB0YXJnZXQ6IFQsXG4gICAgLi4uc291cmNlczogW1MxLCBTMj8sIFMzPywgUzQ/LCBTNT8sIFM2PywgUzc/LCBTOD8sIFM5PywgLi4uYW55W11dXG4pOiBUICYgUzEgJiBTMiAmIFMzICYgUzQgJiBTNSAmIFM2ICYgUzcgJiBTOCAmIFM5O1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBNZXJnZTxYPih0YXJnZXQ6IGFueSwgLi4uc291cmNlczogYW55W10pOiBYO1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBNZXJnZSh0YXJnZXQ6IGFueSwgLi4uc291cmNlczogYW55W10pOiBhbnkge1xuICAgIGxldCByZXN1bHQgPSB0YXJnZXQ7XG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2Ygc291cmNlcykge1xuICAgICAgICByZXN1bHQgPSBtZXJnZShyZXN1bHQsIHNvdXJjZSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgZGVlcCBjb3B5IGluc3RhbmNlIG9mIHNvdXJjZSBvYmplY3QuXG4gKiBAamEg44OH44Kj44O844OX44Kz44OU44O844Kq44OW44K444Kn44Kv44OI44Gu55Sf5oiQXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWVwQ29weTxUPihzcmM6IFQpOiBUIHtcbiAgICByZXR1cm4gZGVlcE1lcmdlKHVuZGVmaW5lZCwgc3JjKTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuaW1wb3J0IHtcbiAgICBOaWwsXG4gICAgVHlwZSxcbiAgICBDbGFzcyxcbiAgICBDb25zdHJ1Y3Rvcixcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogQGVuIE1peGluIGNsYXNzJ3MgYmFzZSBpbnRlcmZhY2UuXG4gKiBAamEgTWl4aW4g44Kv44Op44K544Gu5Z+65bqV44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pXG4gKi9cbmV4cG9ydCBkZWNsYXJlIGNsYXNzIE1peGluQ2xhc3Mge1xuICAgIC8qKlxuICAgICAqIEBlbiBjYWxsIG1peGluIHNvdXJjZSBjbGFzcydzIGBzdXBlcigpYC4gPGJyPlxuICAgICAqICAgICBUaGlzIG1ldGhvZCBzaG91bGQgYmUgY2FsbGVkIGZyb20gY29uc3RydWN0b3IuXG4gICAgICogQGphIE1peGluIOOCr+ODqeOCueOBruWfuuW6leOCpOODs+OCv+ODvOODleOCp+OCpOOCueWumue+qSA8YnI+XG4gICAgICogICAgIOOCs+ODs+OCueODiOODqeOCr+OCv+OBi+OCieWRvOOBtuOBk+OBqOOCkuaDs+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHNyY0NsYXNzXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gdGFyZ2V0IGNsYXNzIG5hbWUuIGV4KSBmcm9tIFMxIGF2YWlsYWJsZVxuICAgICAqICAtIGBqYWAg44Kz44Oz44K544OI44Op44Kv44OI44GZ44KL44Kv44Op44K55ZCN44KS5oyH5a6aIGV4KSBTMSDjgYvjgonmjIflrprlj6/og71cbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIHBhcmFtZXRlcnNcbiAgICAgKiAgLSBgamFgIOOCs+ODs+OCueODiOODqeOCr+ODiOOBq+S9v+eUqOOBmeOCi+W8leaVsFxuICAgICAqL1xuICAgIHByb3RlY3RlZCBzdXBlcjxUIGV4dGVuZHMgQ2xhc3M+KHNyY0NsYXNzOiBULCAuLi5hcmdzOiBDb25zdHJ1Y3RvclBhcmFtZXRlcnM8VD4pOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBpbnB1dCBjbGFzcyBpcyBtaXhpbmVkIChleGNsdWRpbmcgb3duIGNsYXNzKS5cbiAgICAgKiBAamEg5oyH5a6a44Kv44Op44K544GMIE1peGluIOOBleOCjOOBpuOBhOOCi+OBi+eiuuiqjSAo6Ieq6Lqr44Gu44Kv44Op44K544Gv5ZCr44G+44KM44Gq44GEKVxuICAgICAqXG4gICAgICogQHBhcmFtIG1peGVkQ2xhc3NcbiAgICAgKiAgLSBgZW5gIHNldCB0YXJnZXQgY2xhc3MgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOWvvuixoeOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBpc01peGVkV2l0aDxUPihtaXhlZENsYXNzOiBDb25zdHJ1Y3RvcjxUPik6IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGVuIE1peGVkIHN1YiBjbGFzcyBjb25zdHJ1Y3RvciBkZWZpbml0aW9ucy5cbiAqIEBqYSDlkIjmiJDjgZfjgZ/jgrXjg5bjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/lrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNaXhpbkNvbnN0cnVjdG9yPEIgZXh0ZW5kcyBDbGFzcywgVT4gZXh0ZW5kcyBUeXBlPFU+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gY29uc3RydWN0b3JcbiAgICAgKiBAamEg44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgYmFzZSBjbGFzcyBhcmd1bWVudHNcbiAgICAgKiAgLSBgamFgIOWfuuW6leOCr+ODqeOCueOBq+aMh+WumuOBl+OBn+W8leaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB1bmlvbiB0eXBlIG9mIGNsYXNzZXMgd2hlbiBjYWxsaW5nIFtbbWl4aW5zXV0oKVxuICAgICAqICAtIGBqYWAgW1ttaXhpbnNdXSgpIOOBq+a4oeOBl+OBn+OCr+ODqeOCueOBrumbhuWQiFxuICAgICAqL1xuICAgIG5ldyguLi5hcmdzOiBDb25zdHJ1Y3RvclBhcmFtZXRlcnM8Qj4pOiBVO1xufVxuXG4vKipcbiAqIEBlbiBEZWZpbml0aW9uIG9mIFtbc2V0TWl4Q2xhc3NBdHRyaWJ1dGVdXSBmdW5jdGlvbidzIGFyZ3VtZW50cy5cbiAqIEBqYSBbW3NldE1peENsYXNzQXR0cmlidXRlXV0g44Gu5Y+W44KK44GG44KL5byV5pWw5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWl4Q2xhc3NBdHRyaWJ1dGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBTdXBwcmVzcyBwcm92aWRpbmcgY29uc3RydWN0b3ItdHJhcCBmb3IgdGhlIG1peGluIHNvdXJjZSBjbGFzcy4gSW4gdGhpcyBjYXNlLCBgaXNNaXhlZFdpdGhgLCBgaW5zdGFuY2VvZmAgYWxzbyBiZWNvbWVzIGludmFsaWQuIChmb3IgaW1wcm92aW5nIHBlcmZvcm1hbmNlKVxuICAgICAqIEBqYSBNaXhpbiBTb3VyY2Ug44Kv44Op44K544Gr5a++44GX44GmLCDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jg4jjg6njg4Pjg5fjgpLmipHmraIuIOOBk+OCjOOCkuaMh+WumuOBl+OBn+WgtOWQiCwgYGlzTWl4ZWRXaXRoYCwgYGluc3RhbmNlb2ZgIOOCgueEoeWKueOBq+OBquOCiy4gKOODkeODleOCqeODvOODnuODs+OCueaUueWWhClcbiAgICAgKi9cbiAgICBwcm90b0V4dGVuZHNPbmx5OiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldHVwIFtTeW1ib2wuaGFzSW5zdGFuY2VdIHByb3BlcnR5LiA8YnI+XG4gICAgICogICAgIFRoZSBjbGFzcyBkZXNpZ25hdGVkIGFzIGEgc291cmNlIG9mIFtbbWl4aW5zXV0oKSBoYXMgW1N5bWJvbC5oYXNJbnN0YW5jZV0gcHJvcGVydHkgaW1wbGljaXRseS4gPGJyPlxuICAgICAqICAgICBJdCdzIHVzZWQgdG8gYXZvaWQgYmVjb21pbmcgdGhlIGJlaGF2aW9yIGBpbnN0YW5jZW9mYCBkb2Vzbid0IGludGVuZCB3aGVuIHRoZSBjbGFzcyBpcyBleHRlbmRlZCBmcm9tIHRoZSBtaXhpbmVkIGNsYXNzIHRoZSBvdGhlciBwbGFjZS5cbiAgICAgKiBAamEgW1N5bWJvbC5oYXNJbnN0YW5jZV0g44OX44Ot44OR44OG44Kj6Kit5a6aPGJyPlxuICAgICAqICAgICBbW21peGluc11dKCkg44Gu44K944O844K544Gr5oyH5a6a44GV44KM44Gf44Kv44Op44K544GvIFtTeW1ib2wuaGFzSW5zdGFuY2VdIOOCkuaal+m7meeahOOBq+WCmeOBiOOCi+OBn+OCgTxicj5cbiAgICAgKiAgICAg44Gd44Gu44Kv44Op44K544GM5LuW44Gn57aZ5om/44GV44KM44Gm44GE44KL5aC05ZCIIGBpbnN0YW5jZW9mYCDjgYzmhI/lm7PjgZfjgarjgYTmjK/jgovoiJ7jgYTjgajjgarjgovjga7jgpLpgb/jgZHjgovjgZ/jgoHjgavkvb/nlKjjgZnjgosuXG4gICAgICovXG4gICAgaW5zdGFuY2VPZjogKChpbnN0OiBvYmplY3QpID0+IGJvb2xlYW4pIHwgTmlsO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuY29uc3QgX29ialByb3RvdHlwZSAgICAgPSBPYmplY3QucHJvdG90eXBlO1xuY29uc3QgX2luc3RhbmNlT2YgICAgICAgPSBGdW5jdGlvbi5wcm90b3R5cGVbU3ltYm9sLmhhc0luc3RhbmNlXTtcbmNvbnN0IF9vdmVycmlkZSAgICAgICAgID0gU3ltYm9sKCdvdmVycmlkZScpO1xuY29uc3QgX2lzSW5oZXJpdGVkICAgICAgPSBTeW1ib2woJ2lzSW5oZXJpdGVkJyk7XG5jb25zdCBfY29uc3RydWN0b3JzICAgICA9IFN5bWJvbCgnY29uc3RydWN0b3JzJyk7XG5jb25zdCBfY2xhc3NCYXNlICAgICAgICA9IFN5bWJvbCgnY2xhc3NCYXNlJyk7XG5jb25zdCBfY2xhc3NTb3VyY2VzICAgICA9IFN5bWJvbCgnY2xhc3NTb3VyY2VzJyk7XG5jb25zdCBfcHJvdG9FeHRlbmRzT25seSA9IFN5bWJvbCgncHJvdG9FeHRlbmRzT25seScpO1xuXG4vLyBvYmplY3QgcHJvcGVydGllcyBjb3B5IG1ldGhvZFxuZnVuY3Rpb24gY29weVByb3BlcnRpZXModGFyZ2V0OiBvYmplY3QsIHNvdXJjZT86IG9iamVjdCk6IHZvaWQge1xuICAgIHNvdXJjZSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhzb3VyY2UpXG4gICAgICAgIC5maWx0ZXIoa2V5ID0+ICEvKHByb3RvdHlwZXxuYW1lfGNvbnN0cnVjdG9yKS8udGVzdChrZXkpKVxuICAgICAgICAuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gdGFyZ2V0W2tleV0pIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc291cmNlLCBrZXkpIGFzIFByb3BlcnR5RGVjb3JhdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG5cbi8vIGhlbHBlciBmb3Igc2V0TWl4Q2xhc3NBdHRyaWJ1dGUodGFyZ2V0LCAnaW5zdGFuY2VPZicpXG5mdW5jdGlvbiBzZXRJbnN0YW5jZU9mPFQgZXh0ZW5kcyB7fT4odGFyZ2V0OiBDb25zdHJ1Y3RvcjxUPiwgbWV0aG9kOiAoKGluc3Q6IG9iamVjdCkgPT4gYm9vbGVhbikgfCBOaWwpOiB2b2lkIHtcbiAgICBjb25zdCBiZWhhdmlvdXIgPSBtZXRob2QgfHwgKG51bGwgPT09IG1ldGhvZCA/IHVuZGVmaW5lZCA6ICgoaTogb2JqZWN0KSA9PiBPYmplY3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YuY2FsbCh0YXJnZXQucHJvdG90eXBlLCBpKSkpO1xuICAgIGNvbnN0IGFwcGxpZWQgPSBiZWhhdmlvdXIgJiYgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIF9vdmVycmlkZSk7XG4gICAgaWYgKCFhcHBsaWVkKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwge1xuICAgICAgICAgICAgW1N5bWJvbC5oYXNJbnN0YW5jZV06IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogYmVoYXZpb3VyLFxuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFtfb3ZlcnJpZGVdOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGJlaGF2aW91ciA/IHRydWUgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIFNldCB0aGUgTWl4aW4gY2xhc3MgYXR0cmlidXRlLlxuICogQGphIE1peGluIOOCr+ODqeOCueOBq+WvvuOBl+OBpuWxnuaAp+OCkuioreWumlxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogLy8gJ3Byb3RvRXh0ZW5kT25seSdcbiAqIGNsYXNzIEJhc2UgeyBjb25zdHJ1Y3RvcihhLCBiKSB7fSB9O1xuICogY2xhc3MgTWl4QSB7IH07XG4gKiBzZXRNaXhDbGFzc0F0dHJpYnV0ZShNaXhBLCAncHJvdG9FeHRlbmRzT25seScpOyAgLy8gZm9yIGltcHJvdmluZyBjb25zdHJ1Y3Rpb24gcGVyZm9ybWFuY2VcbiAqIGNsYXNzIE1peEIgeyBjb25zdHJ1Y3RvcihjLCBkKSB7fSB9O1xuICpcbiAqIGNsYXNzIE1peGluQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoQmFzZSwgTWl4QSwgTWl4Qikge1xuICogICAgIGNvbnN0cnVjdG9yKGEsIGIsIGMsIGQpe1xuICogICAgICAgICAvLyBjYWxsaW5nIGBCYXNlYCBjb25zdHJ1Y3RvclxuICogICAgICAgICBzdXBlcihhLCBiKTtcbiAqXG4gKiAgICAgICAgIC8vIGNhbGxpbmcgTWl4aW4gY2xhc3MncyBjb25zdHJ1Y3RvclxuICogICAgICAgICB0aGlzLnN1cGVyKE1peEEpOyAgICAgICAgLy8gbm8gYWZmZWN0XG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QiwgYywgZCk7XG4gKiAgICAgfVxuICogfVxuICpcbiAqIGNvbnN0IG1peGVkID0gbmV3IE1peGluQ2xhc3MoKTtcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgTWl4QSk7ICAgIC8vIGZhbHNlXG4gKiBjb25zb2xlLmxvZyhtaXhlZC5pc01peGVkV2l0aChNaXhBKSk7ICAvLyBmYWxzZVxuICpcbiAqIC8vICdpbnN0YW5jZU9mJ1xuICogY2xhc3MgQmFzZSB7fTtcbiAqIGNsYXNzIFNvdXJjZSB7fTtcbiAqIGNsYXNzIE1peGluQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoQmFzZSwgU291cmNlKSB7fTtcbiAqXG4gKiBjbGFzcyBPdGhlciBleHRlbmRzIFNvdXJjZSB7fTtcbiAqXG4gKiBjb25zdCBtaXhlZCA9IG5ldyBNaXhpbkNsYXNzKCk7XG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE1peGluQ2xhc3MpOyAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIEJhc2UpOyAgICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIFNvdXJjZSk7ICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyB0cnVlID8/P1xuICpcbiAqIHNldE1peENsYXNzQXR0cmlidXRlKE90aGVyLCAnaW5zdGFuY2VPZicpOyAvLyBvciBzZXRNaXhDbGFzc0F0dHJpYnV0ZShPdGhlciwgJ2luc3RhbmNlT2YnLCBudWxsKTtcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgT3RoZXIpOyAgICAgICAgIC8vIGZhbHNlICFcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgc2V0IHRhcmdldCBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDoqK3lrprlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEBwYXJhbSBhdHRyXG4gKiAgLSBgZW5gOlxuICogICAgLSBgcHJvdG9FeHRlbmRzT25seWA6IFN1cHByZXNzIHByb3ZpZGluZyBjb25zdHJ1Y3Rvci10cmFwIGZvciB0aGUgbWl4aW4gc291cmNlIGNsYXNzLiAoZm9yIGltcHJvdmluZyBwZXJmb3JtYW5jZSlcbiAqICAgIC0gYGluc3RhbmNlT2ZgICAgICAgOiBmdW5jdGlvbiBieSB1c2luZyBbU3ltYm9sLmhhc0luc3RhbmNlXSA8YnI+XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgRGVmYXVsdCBiZWhhdmlvdXIgaXMgYHsgcmV0dXJuIHRhcmdldC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnN0YW5jZSkgfWBcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBJZiBzZXQgYG51bGxgLCBkZWxldGUgW1N5bWJvbC5oYXNJbnN0YW5jZV0gcHJvcGVydHkuXG4gKiAgLSBgamFgOlxuICogICAgLSBgcHJvdG9FeHRlbmRzT25seWA6IE1peGluIFNvdXJjZSDjgq/jg6njgrnjgavlr77jgZfjgaYsIOOCs+ODs+OCueODiOODqeOCr+OCv+ODiOODqeODg+ODl+OCkuaKkeatoiAo44OR44OV44Kp44O844Oe44Oz44K55pS55ZaEKVxuICogICAgLSBgaW5zdGFuY2VPZmAgICAgICA6IFtTeW1ib2wuaGFzSW5zdGFuY2VdIOOBjOS9v+eUqOOBmeOCi+mWouaVsOOCkuaMh+WumiA8YnI+XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAg5pei5a6a44Gn44GvIGB7IHJldHVybiB0YXJnZXQucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5zdGFuY2UpIH1gIOOBjOS9v+eUqOOBleOCjOOCi1xuICogICAgICAgICAgICAgICAgICAgICAgICAgYG51bGxgIOaMh+WumuOCkuOBmeOCi+OBqCBbU3ltYm9sLmhhc0luc3RhbmNlXSDjg5fjg63jg5Hjg4bjgqPjgpLliYrpmaTjgZnjgotcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldE1peENsYXNzQXR0cmlidXRlPFQgZXh0ZW5kcyB7fSwgVSBleHRlbmRzIGtleW9mIE1peENsYXNzQXR0cmlidXRlPihcbiAgICB0YXJnZXQ6IENvbnN0cnVjdG9yPFQ+LFxuICAgIGF0dHI6IFUsXG4gICAgbWV0aG9kPzogTWl4Q2xhc3NBdHRyaWJ1dGVbVV1cbik6IHZvaWQge1xuICAgIHN3aXRjaCAoYXR0cikge1xuICAgICAgICBjYXNlICdwcm90b0V4dGVuZHNPbmx5JzpcbiAgICAgICAgICAgIHRhcmdldFtfcHJvdG9FeHRlbmRzT25seV0gPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2luc3RhbmNlT2YnOlxuICAgICAgICAgICAgc2V0SW5zdGFuY2VPZih0YXJnZXQsIG1ldGhvZCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gTWl4aW4gZnVuY3Rpb24gZm9yIG11bHRpcGxlIGluaGVyaXRhbmNlLiA8YnI+XG4gKiAgICAgUmVzb2x2aW5nIHR5cGUgc3VwcG9ydCBmb3IgbWF4aW11bSAxMCBjbGFzc2VzLlxuICogQGphIOWkmumHjee2meaJv+OBruOBn+OCgeOBriBNaXhpbiA8YnI+XG4gKiAgICAg5pyA5aSnIDEwIOOCr+ODqeOCueOBruWei+ino+axuuOCkuOCteODneODvOODiFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2xhc3MgQmFzZSB7IGNvbnN0cnVjdG9yKGEsIGIpIHt9IH07XG4gKiBjbGFzcyBNaXhBIHsgY29uc3RydWN0b3IoYSwgYikge30gfTtcbiAqIGNsYXNzIE1peEIgeyBjb25zdHJ1Y3RvcihjLCBkKSB7fSB9O1xuICpcbiAqIGNsYXNzIE1peGluQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoQmFzZSwgTWl4QSwgTWl4Qikge1xuICogICAgIGNvbnN0cnVjdG9yKGEsIGIsIGMsIGQpe1xuICogICAgICAgICAvLyBjYWxsaW5nIGBCYXNlYCBjb25zdHJ1Y3RvclxuICogICAgICAgICBzdXBlcihhLCBiKTtcbiAqXG4gKiAgICAgICAgIC8vIGNhbGxpbmcgTWl4aW4gY2xhc3MncyBjb25zdHJ1Y3RvclxuICogICAgICAgICB0aGlzLnN1cGVyKE1peEEsIGEsIGIpO1xuICogICAgICAgICB0aGlzLnN1cGVyKE1peEIsIGMsIGQpO1xuICogICAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBiYXNlXG4gKiAgLSBgZW5gIHByaW1hcnkgYmFzZSBjbGFzcy4gc3VwZXIoYXJncykgaXMgdGhpcyBjbGFzcydzIG9uZS5cbiAqICAtIGBqYWAg5Z+65bqV44Kv44Op44K544Kz44Oz44K544OI44Op44Kv44K/LiDlkIzlkI3jg5fjg63jg5Hjg4bjgqMsIOODoeOCveODg+ODieOBr+acgOWEquWFiOOBleOCjOOCiy4gc3VwZXIoYXJncykg44Gv44GT44Gu44Kv44Op44K544Gu44KC44Gu44GM5oyH5a6a5Y+v6IO9LlxuICogQHBhcmFtIHNvdXJjZXNcbiAqICAtIGBlbmAgbXVsdGlwbGUgZXh0ZW5kcyBjbGFzc1xuICogIC0gYGphYCDmi6HlvLXjgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIG1peGluZWQgY2xhc3MgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg5ZCI5oiQ44GV44KM44Gf44Kv44Op44K544Kz44Oz44K544OI44Op44Kv44K/XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtaXhpbnM8QiBleHRlbmRzIENsYXNzLCBTMSwgUzIsIFMzLCBTNCwgUzUsIFM2LCBTNywgUzgsIFM5PihcbiAgICBiYXNlOiBCLFxuICAgIC4uLnNvdXJjZXM6IFtcbiAgICAgICAgQ29uc3RydWN0b3I8UzE+LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTMj4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTMz4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTND4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNT4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNj4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNz4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTOD4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTOT4/LFxuICAgICAgICAuLi5hbnlbXVxuICAgIF0pOiBNaXhpbkNvbnN0cnVjdG9yPEIsIE1peGluQ2xhc3MgJiBJbnN0YW5jZVR5cGU8Qj4gJiBTMSAmIFMyICYgUzMgJiBTNCAmIFM1ICYgUzYgJiBTNyAmIFM4ICYgUzk+IHtcblxuICAgIGxldCBfaGFzU291cmNlQ29uc3RydWN0b3IgPSBmYWxzZTtcblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvY2xhc3MtbmFtZS1jYXNpbmdcbiAgICBjbGFzcyBfTWl4aW5CYXNlIGV4dGVuZHMgKGJhc2UgYXMgYW55IGFzIENvbnN0cnVjdG9yPE1peGluQ2xhc3M+KSB7XG5cbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBbX2NvbnN0cnVjdG9yc106IE1hcDxDb25zdHJ1Y3Rvcjxhbnk+LCBGdW5jdGlvbiB8IG51bGw+O1xuICAgICAgICBwcml2YXRlIHJlYWRvbmx5IFtfY2xhc3NCYXNlXTogQ29uc3RydWN0b3I8YW55PjtcblxuICAgICAgICBjb25zdHJ1Y3RvciguLi5hcmdzOiBhbnlbXSkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGNvbnN0cnVjdG9yLXN1cGVyXG4gICAgICAgICAgICBzdXBlciguLi5hcmdzKTtcblxuICAgICAgICAgICAgY29uc3QgY29uc3RydWN0b3JzID0gbmV3IE1hcDxDb25zdHJ1Y3Rvcjxhbnk+LCBGdW5jdGlvbj4oKTtcbiAgICAgICAgICAgIHRoaXNbX2NvbnN0cnVjdG9yc10gPSBjb25zdHJ1Y3RvcnM7XG4gICAgICAgICAgICB0aGlzW19jbGFzc0Jhc2VdID0gYmFzZTtcblxuICAgICAgICAgICAgaWYgKF9oYXNTb3VyY2VDb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc3JjQ2xhc3Mgb2Ygc291cmNlcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXNyY0NsYXNzW19wcm90b0V4dGVuZHNPbmx5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFuZGxlciA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBseTogKHRhcmdldDogYW55LCB0aGlzb2JqOiBhbnksIGFyZ2xpc3Q6IGFueVtdKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9iaiA9IG5ldyBzcmNDbGFzcyguLi5hcmdsaXN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29weVByb3BlcnRpZXModGhpcywgb2JqKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHJveHkgZm9yICdjb25zdHJ1Y3QnIGFuZCBjYWNoZSBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3RydWN0b3JzLnNldChzcmNDbGFzcywgbmV3IFByb3h5KHNyY0NsYXNzLCBoYW5kbGVyKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBwcm90ZWN0ZWQgc3VwZXI8VCBleHRlbmRzIENsYXNzPihzcmNDbGFzczogVCwgLi4uYXJnczogQ29uc3RydWN0b3JQYXJhbWV0ZXJzPFQ+KTogdGhpcyB7XG4gICAgICAgICAgICBjb25zdCBtYXAgPSB0aGlzW19jb25zdHJ1Y3RvcnNdO1xuICAgICAgICAgICAgY29uc3QgY3RvciA9IG1hcC5nZXQoc3JjQ2xhc3MpO1xuICAgICAgICAgICAgaWYgKGN0b3IpIHtcbiAgICAgICAgICAgICAgICBjdG9yKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICAgIG1hcC5zZXQoc3JjQ2xhc3MsIG51bGwpOyAgICAvLyBwcmV2ZW50IGNhbGxpbmcgdHdpY2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIGlzTWl4ZWRXaXRoPFQ+KHNyY0NsYXNzOiBDb25zdHJ1Y3RvcjxUPik6IGJvb2xlYW4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uc3RydWN0b3IgPT09IHNyY0NsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzW19jbGFzc0Jhc2VdID09PSBzcmNDbGFzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1tfY2xhc3NTb3VyY2VzXS5yZWR1Y2UoKHAsIGMpID0+IHAgfHwgKHNyY0NsYXNzID09PSBjKSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIHN0YXRpYyBbU3ltYm9sLmhhc0luc3RhbmNlXShpbnN0YW5jZTogYW55KTogYm9vbGVhbiB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mLmNhbGwoX01peGluQmFzZS5wcm90b3R5cGUsIGluc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBbX2lzSW5oZXJpdGVkXTxUPihzcmNDbGFzczogQ29uc3RydWN0b3I8VD4pOiBib29sZWFuIHtcbiAgICAgICAgICAgIGNvbnN0IGN0b3JzID0gdGhpc1tfY29uc3RydWN0b3JzXTtcbiAgICAgICAgICAgIGlmIChjdG9ycy5oYXMoc3JjQ2xhc3MpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGN0b3Igb2YgY3RvcnMua2V5cygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZi5jYWxsKHNyY0NsYXNzLCBjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBwcml2YXRlIGdldCBbX2NsYXNzU291cmNlc10oKTogQ29uc3RydWN0b3I8YW55PltdIHtcbiAgICAgICAgICAgIHJldHVybiBbLi4udGhpc1tfY29uc3RydWN0b3JzXS5rZXlzKCldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBzcmNDbGFzcyBvZiBzb3VyY2VzKSB7XG4gICAgICAgIC8vIHByb3ZpZGUgY3VzdG9tIGluc3RhbmNlb2ZcbiAgICAgICAgY29uc3QgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc3JjQ2xhc3MsIFN5bWJvbC5oYXNJbnN0YW5jZSk7XG4gICAgICAgIGlmICghZGVzYyB8fCBkZXNjLndyaXRhYmxlKSB7XG4gICAgICAgICAgICBjb25zdCBvcmdJbnN0YW5jZU9mID0gZGVzYyA/IHNyY0NsYXNzW1N5bWJvbC5oYXNJbnN0YW5jZV0gOiBfaW5zdGFuY2VPZjtcbiAgICAgICAgICAgIHNldEluc3RhbmNlT2Yoc3JjQ2xhc3MsIChpbnN0OiBvYmplY3QpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3JnSW5zdGFuY2VPZi5jYWxsKHNyY0NsYXNzLCBpbnN0KSB8fCAoKG51bGwgIT0gaW5zdCAmJiBpbnN0W19pc0luaGVyaXRlZF0pID8gaW5zdFtfaXNJbmhlcml0ZWRdKHNyY0NsYXNzKSA6IGZhbHNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIHByb3ZpZGUgcHJvdG90eXBlXG4gICAgICAgIGNvcHlQcm9wZXJ0aWVzKF9NaXhpbkJhc2UucHJvdG90eXBlLCBzcmNDbGFzcy5wcm90b3R5cGUpO1xuICAgICAgICBsZXQgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHNyY0NsYXNzLnByb3RvdHlwZSk7XG4gICAgICAgIHdoaWxlIChfb2JqUHJvdG90eXBlICE9PSBwYXJlbnQpIHtcbiAgICAgICAgICAgIGNvcHlQcm9wZXJ0aWVzKF9NaXhpbkJhc2UucHJvdG90eXBlLCBwYXJlbnQpO1xuICAgICAgICAgICAgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHBhcmVudCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2hlY2sgY29uc3RydWN0b3JcbiAgICAgICAgaWYgKCFfaGFzU291cmNlQ29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIF9oYXNTb3VyY2VDb25zdHJ1Y3RvciA9ICFzcmNDbGFzc1tfcHJvdG9FeHRlbmRzT25seV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gX01peGluQmFzZSBhcyBhbnk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBuby1pbnZhbGlkLXRoaXMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuY29uc3QgcmFuZG9tID0gTWF0aC5yYW5kb20uYmluZChNYXRoKTtcblxuLyoqXG4gKiBAZW4gRXhlY3V0ZSBzaHVmZmxlIG9mIGFuIGFycmF5IGVsZW1lbnRzLlxuICogQGphIOmFjeWIl+imgee0oOOBruOCt+ODo+ODg+ODleODq1xuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gZGVzdHJ1Y3RpdmVcbiAqICAtIGBlbmAgdHJ1ZTogZGVzdHJ1Y3RpdmUgLyBmYWxzZTogbm9uLWRlc3RydWN0aXZlIChkZWZhdWx0KVxuICogIC0gYGphYCB0cnVlOiDnoLTlo4rnmoQgLyBmYWxzZTog6Z2e56C05aOK55qEICjml6LlrpopXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaHVmZmxlPFQ+KGFycmF5OiBUW10sIGRlc3RydWN0aXZlID0gZmFsc2UpOiBUW10ge1xuICAgIGNvbnN0IHNvdXJjZSA9IGRlc3RydWN0aXZlID8gYXJyYXkgOiBhcnJheS5zbGljZSgpO1xuICAgIGNvbnN0IGxlbiA9IHNvdXJjZS5sZW5ndGg7XG4gICAgZm9yIChsZXQgaSA9IGxlbiA+IDAgPyBsZW4gPj4+IDAgOiAwOyBpID4gMTspIHtcbiAgICAgICAgY29uc3QgaiA9IGkgKiByYW5kb20oKSA+Pj4gMDtcbiAgICAgICAgY29uc3Qgc3dhcCA9IHNvdXJjZVstLWldO1xuICAgICAgICBzb3VyY2VbaV0gPSBzb3VyY2Vbal07XG4gICAgICAgIHNvdXJjZVtqXSA9IHN3YXA7XG4gICAgfVxuICAgIHJldHVybiBzb3VyY2U7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBFeGVjdXRlIHN0YWJsZSBzb3J0IGJ5IG1lcmdlLXNvcnQgYWxnb3JpdGhtLlxuICogQGphIGBtZXJnZS1zb3J0YCDjgavjgojjgovlronlrprjgr3jg7zjg4hcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNvbXBhcmF0b3JcbiAqICAtIGBlbmAgc29ydCBjb21wYXJhdG9yIGZ1bmN0aW9uXG4gKiAgLSBgamFgIOOCveODvOODiOmWouaVsOOCkuaMh+WumlxuICogQHBhcmFtIGRlc3RydWN0aXZlXG4gKiAgLSBgZW5gIHRydWU6IGRlc3RydWN0aXZlIC8gZmFsc2U6IG5vbi1kZXN0cnVjdGl2ZSAoZGVmYXVsdClcbiAqICAtIGBqYWAgdHJ1ZTog56C05aOK55qEIC8gZmFsc2U6IOmdnuegtOWjiueahCAo5pei5a6aKVxuICovXG5leHBvcnQgZnVuY3Rpb24gc29ydDxUPihhcnJheTogVFtdLCBjb21wYXJhdG9yOiAobGhzOiBULCByaHM6IFQpID0+IG51bWJlciwgZGVzdHJ1Y3RpdmUgPSBmYWxzZSk6IFRbXSB7XG4gICAgY29uc3Qgc291cmNlID0gZGVzdHJ1Y3RpdmUgPyBhcnJheSA6IGFycmF5LnNsaWNlKCk7XG4gICAgaWYgKHNvdXJjZS5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgfVxuICAgIGNvbnN0IGxocyA9IHNvcnQoc291cmNlLnNwbGljZSgwLCBzb3VyY2UubGVuZ3RoID4+PiAxKSwgY29tcGFyYXRvciwgdHJ1ZSk7XG4gICAgY29uc3QgcmhzID0gc29ydChzb3VyY2Uuc3BsaWNlKDApLCBjb21wYXJhdG9yLCB0cnVlKTtcbiAgICB3aGlsZSAobGhzLmxlbmd0aCAmJiByaHMubGVuZ3RoKSB7XG4gICAgICAgIHNvdXJjZS5wdXNoKGNvbXBhcmF0b3IobGhzWzBdLCByaHNbMF0pIDw9IDAgPyBsaHMuc2hpZnQoKSBhcyBUIDogcmhzLnNoaWZ0KCkgYXMgVCk7XG4gICAgfVxuICAgIHJldHVybiBzb3VyY2UuY29uY2F0KGxocywgcmhzKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1ha2UgdW5pcXVlIGFycmF5LlxuICogQGphIOmHjeikh+imgee0oOOBruOBquOBhOmFjeWIl+OBruS9nOaIkFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmlxdWU8VD4oYXJyYXk6IFRbXSk6IFRbXSB7XG4gICAgcmV0dXJuIFsuLi5uZXcgU2V0KGFycmF5KV07XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNYWtlIGluZGV4IGFycmF5LlxuICogQGphIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl+OBruS9nOaIkFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gZXhjbHVkZXNcbiAqICAtIGBlbmAgZXhjbHVkZSBpbmRleCBpbiByZXR1cm4gdmFsdWUuXG4gKiAgLSBgamFgIOaIu+OCiuWApOmFjeWIl+OBq+WQq+OCgeOBquOBhOOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5kaWNlczxUPihhcnJheTogVFtdLCAuLi5leGNsdWRlczogbnVtYmVyW10pOiBudW1iZXJbXSB7XG4gICAgY29uc3QgcmV0dmFsID0gWy4uLmFycmF5LmtleXMoKV07XG5cbiAgICBjb25zdCBsZW4gPSBhcnJheS5sZW5ndGg7XG4gICAgY29uc3QgZXhMaXN0ID0gWy4uLm5ldyBTZXQoZXhjbHVkZXMpXS5zb3J0KChsaHMsIHJocykgPT4gbGhzIDwgcmhzID8gMSA6IC0xKTtcbiAgICBmb3IgKGNvbnN0IGV4IG9mIGV4TGlzdCkge1xuICAgICAgICBpZiAoMCA8PSBleCAmJiBleCA8IGxlbikge1xuICAgICAgICAgICAgcmV0dmFsLnNwbGljZShleCwgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gW1tncm91cEJ5XV0oKSBvcHRpb25zIGRlZmluaXRpb24uXG4gKiBAamEgW1tncm91cEJ5XV0oKSDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7PlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBHcm91cEJ5T3B0aW9uczxcbiAgICBUIGV4dGVuZHMgb2JqZWN0LFxuICAgIFRLRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUU1VNS0VZUyBleHRlbmRzIGtleW9mIFQsXG4gICAgVEdST1VQS0VZIGV4dGVuZHMgc3RyaW5nXG4+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gYEdST1VQIEJZYCBrZXlzLlxuICAgICAqIEBqYSBgR1JPVVAgQllgIOOBq+aMh+WumuOBmeOCi+OCreODvFxuICAgICAqL1xuICAgIGtleXM6IEV4dHJhY3Q8VEtFWVMsIHN0cmluZz5bXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZ2dyZWdhdGFibGUga2V5cy5cbiAgICAgKiBAamEg6ZuG6KiI5Y+v6IO944Gq44Kt44O85LiA6KanXG4gICAgICovXG4gICAgc3VtS2V5cz86IEV4dHJhY3Q8VFNVTUtFWVMsIHN0cmluZz5bXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBHcm91cGVkIGl0ZW0gYWNjZXNzIGtleS4gZGVmYXVsdDogJ2l0ZW1zJyxcbiAgICAgKiBAamEg44Kw44Or44O844OU44Oz44Kw44GV44KM44Gf6KaB57Sg44G444Gu44Ki44Kv44K744K544Kt44O8LiDml6Llrpo6ICdpdGVtcydcbiAgICAgKi9cbiAgICBncm91cEtleT86IFRHUk9VUEtFWTtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJuIHR5cGUgb2YgW1tncm91cEJ5XV0oKS5cbiAqIEBqYSBbW2dyb3VwQnldXSgpIOOBjOi/lOWNtOOBmeOCi+Wei1xuICovXG5leHBvcnQgdHlwZSBHcm91cEJ5UmV0dXJuVmFsdWU8XG4gICAgVCBleHRlbmRzIG9iamVjdCxcbiAgICBUS0VZUyBleHRlbmRzIGtleW9mIFQsXG4gICAgVFNVTUtFWVMgZXh0ZW5kcyBrZXlvZiBUID0gbmV2ZXIsXG4gICAgVEdST1VQS0VZIGV4dGVuZHMgc3RyaW5nID0gJ2l0ZW1zJ1xuPiA9IFJlYWRvbmx5PFJlY29yZDxUS0VZUywge30+ICYgUmVjb3JkPFRTVU1LRVlTLCB7fT4gJiBSZWNvcmQ8VEdST1VQS0VZLCBUW10+PjtcblxuLyoqXG4gKiBAZW4gRXhlY3V0ZSBgR1JPVVAgQllgIGZvciBhcnJheSBlbGVtZW50cy5cbiAqIEBqYSDphY3liJfjga7opoHntKDjga4gYEdST1VQIEJZYCDpm4blkIjjgpLmir3lh7pcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgYEdST1VQIEJZYCBvcHRpb25zXG4gKiAgLSBgamFgIGBHUk9VUCBCWWAg44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBncm91cEJ5PFxuICAgIFQgZXh0ZW5kcyBvYmplY3QsXG4gICAgVEtFWVMgZXh0ZW5kcyBrZXlvZiBULFxuICAgIFRTVU1LRVlTIGV4dGVuZHMga2V5b2YgVCA9IG5ldmVyLFxuICAgIFRHUk9VUEtFWSBleHRlbmRzIHN0cmluZyA9ICdpdGVtcydcbj4oYXJyYXk6IFRbXSwgb3B0aW9uczogR3JvdXBCeU9wdGlvbnM8VCwgVEtFWVMsIFRTVU1LRVlTLCBUR1JPVVBLRVk+KTogR3JvdXBCeVJldHVyblZhbHVlPFQsIFRLRVlTLCBUU1VNS0VZUywgVEdST1VQS0VZPltdIHtcbiAgICBjb25zdCB7IGtleXMsIHN1bUtleXMsIGdyb3VwS2V5IH0gPSBvcHRpb25zO1xuICAgIGNvbnN0IF9ncm91cEtleSA9IGdyb3VwS2V5IHx8ICdpdGVtcyc7XG4gICAgY29uc3QgX3N1bUtleXM6IHN0cmluZ1tdID0gc3VtS2V5cyB8fCBbXTtcbiAgICBfc3VtS2V5cy5wdXNoKF9ncm91cEtleSk7XG5cbiAgICBjb25zdCBoYXNoID0gYXJyYXkucmVkdWNlKChyZXM6IFQsIGRhdGE6IFQpID0+IHtcbiAgICAgICAgLy8gY3JlYXRlIGdyb3VwQnkgaW50ZXJuYWwga2V5XG4gICAgICAgIGNvbnN0IF9rZXkgPSBrZXlzLnJlZHVjZSgocywgaykgPT4gcyArIFN0cmluZyhkYXRhW2tdKSwgJycpO1xuXG4gICAgICAgIC8vIGluaXQga2V5c1xuICAgICAgICBpZiAoIShfa2V5IGluIHJlcykpIHtcbiAgICAgICAgICAgIGNvbnN0IGtleUxpc3QgPSBrZXlzLnJlZHVjZSgoaCwgazogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgaFtrXSA9IGRhdGFba107XG4gICAgICAgICAgICAgICAgcmV0dXJuIGg7XG4gICAgICAgICAgICB9LCB7fSk7XG5cbiAgICAgICAgICAgIHJlc1tfa2V5XSA9IF9zdW1LZXlzLnJlZHVjZSgoaCwgazogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgaFtrXSA9IDA7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGg7XG4gICAgICAgICAgICB9LCBrZXlMaXN0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc0tleSA9IHJlc1tfa2V5XTtcblxuICAgICAgICAvLyBzdW0gcHJvcGVydGllc1xuICAgICAgICBmb3IgKGNvbnN0IGsgb2YgX3N1bUtleXMpIHtcbiAgICAgICAgICAgIGlmIChfZ3JvdXBLZXkgPT09IGspIHtcbiAgICAgICAgICAgICAgICByZXNLZXlba10gPSByZXNLZXlba10gfHwgW107XG4gICAgICAgICAgICAgICAgcmVzS2V5W2tdLnB1c2goZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc0tleVtrXSArPSBkYXRhW2tdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9LCB7fSk7XG5cbiAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyhoYXNoKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5tYXAoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5tYXAoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKiBcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgKkFycmF5KiBhcyB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c6YWN5YiX44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYXA8VCwgVT4odGhpczogYW55LCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVIHwgUHJvbWlzZTxVPiwgdGhpc0FyZz86IGFueSk6IFByb21pc2U8VVtdPiB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFxuICAgICAgICBhcnJheS5tYXAoYXN5bmMgKHYsIGksIGEpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdiwgaSwgYSk7XG4gICAgICAgIH0pXG4gICAgKTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLmZpbHRlcigpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLmZpbHRlcigpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50ICpBcnJheSogYXMgdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+e1kOaenOmFjeWIl+OCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmlsdGVyPFQ+KHRoaXM6IGFueSwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj4sIHRoaXNBcmc/OiBhbnkpOiBQcm9taXNlPFRbXT4ge1xuICAgIGNvbnN0IGJpdHM6IGJvb2xlYW5bXSA9IGF3YWl0IG1hcChhcnJheSwgKHYsIGksIGEpID0+IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhKSk7XG4gICAgcmV0dXJuIGFycmF5LmZpbHRlcigoKSA9PiBiaXRzLnNoaWZ0KCkpO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuZmluZCgpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLmZpbmQoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIHRoaXNBcmdcbiAqICAtIGBlbmAgVmFsdWUgdG8gdXNlIGFzICp0aGlzKiB3aGVuIGV4ZWN1dGluZyB0aGUgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDlrp/ooYzjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaW5kPFQ+KHRoaXM6IGFueSwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj4sIHRoaXNBcmc/OiBhbnkpOiBQcm9taXNlPFQgfCB1bmRlZmluZWQ+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5maW5kSW5kZXgoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5maW5kSW5kZXgoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIHRoaXNBcmdcbiAqICAtIGBlbmAgVmFsdWUgdG8gdXNlIGFzICp0aGlzKiB3aGVuIGV4ZWN1dGluZyB0aGUgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDlrp/ooYzjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCBpbmRleCB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K544KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaW5kSW5kZXg8VD4odGhpczogYW55LCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBib29sZWFuIHwgUHJvbWlzZTxib29sZWFuPiwgdGhpc0FyZz86IGFueSk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmIChhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdiwgaSwgYXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5zb21lKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuc29tZSgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50IGJvb2xlYW4gdmFsdWUuXG4gKiAgLSBgamFgIOecn+WBveWApOOCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc29tZTxUPih0aGlzOiBhbnksIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+LCB0aGlzQXJnPzogYW55KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmIChhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdiwgaSwgYXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5ldmVyeSgpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLmV2ZXJ5KClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgYm9vbGVhbiB2YWx1ZS5cbiAqICAtIGBqYWAg55yf5YG95YCk44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBldmVyeTxUPih0aGlzOiBhbnksIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+LCB0aGlzQXJnPzogYW55KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmICghYXdhaXQgY2FsbGJhY2suY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHYsIGksIGFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUucmVkdWNlKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUucmVkdWNlKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSBpbml0aWFsVmFsdWVcbiAqICAtIGBlbmAgVXNlZCBhcyBmaXJzdCBhcmd1bWVudCB0byB0aGUgZmlyc3QgY2FsbCBvZiBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOOBq+a4oeOBleOCjOOCi+WIneacn+WApFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50ICpBcnJheSogYXMgdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+e1kOaenOmFjeWIl+OCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVkdWNlPFQsIFU+KFxuICAgIGFycmF5OiBUW10sXG4gICAgY2FsbGJhY2s6IChhY2N1bXVsYXRvcjogVSwgY3VycmVudFZhbHVlOiBULCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSB8IFByb21pc2U8VT4sXG4gICAgaW5pdGlhbFZhbHVlPzogVVxuKTogUHJvbWlzZTxVPiB7XG4gICAgaWYgKGFycmF5Lmxlbmd0aCA8PSAwICYmIHVuZGVmaW5lZCA9PT0gaW5pdGlhbFZhbHVlKSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignUmVkdWNlIG9mIGVtcHR5IGFycmF5IHdpdGggbm8gaW5pdGlhbCB2YWx1ZScpO1xuICAgIH1cblxuICAgIGNvbnN0IGhhc0luaXQgPSAodW5kZWZpbmVkICE9PSBpbml0aWFsVmFsdWUpO1xuICAgIGxldCBhY2MgPSAoaGFzSW5pdCA/IGluaXRpYWxWYWx1ZSA6IGFycmF5WzBdKSBhcyBVO1xuXG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmICghKCFoYXNJbml0ICYmIDAgPT09IGkpKSB7XG4gICAgICAgICAgICBhY2MgPSBhd2FpdCBjYWxsYmFjayhhY2MsIHYsIGksIGFycmF5KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBhY2M7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmZ1bmN0aW9uIGNhbGxhYmxlKCk6IGFueSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11c2UtYmVmb3JlLWRlZmluZVxuICAgIHJldHVybiBhY2Nlc3NpYmxlO1xufVxuXG5jb25zdCBhY2Nlc3NpYmxlOiBhbnkgPSBuZXcgUHJveHkoY2FsbGFibGUsIHtcbiAgICBnZXQ6ICh0YXJnZXQsIG5hbWUpID0+IHtcbiAgICAgICAgY29uc3QgcHJvcCA9IHRhcmdldFtuYW1lXTtcbiAgICAgICAgaWYgKG51bGwgIT0gcHJvcCkge1xuICAgICAgICAgICAgcmV0dXJuIHByb3A7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYWNjZXNzaWJsZTtcbiAgICAgICAgfVxuICAgIH0sXG59KTtcblxuZnVuY3Rpb24gY3JlYXRlKCk6IGFueSB7XG4gICAgY29uc3Qgc3R1YiA9IG5ldyBQcm94eSh7fSwge1xuICAgICAgICBnZXQ6ICh0YXJnZXQsIG5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHByb3AgPSB0YXJnZXRbbmFtZV07XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBwcm9wKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb3A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2Nlc3NpYmxlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHN0dWIsICdzdHViJywge1xuICAgICAgICB2YWx1ZTogdHJ1ZSxcbiAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN0dWI7XG59XG5cbi8qKlxuICogQGVuIEdldCBzYWZlIGFjY2Vzc2libGUgb2JqZWN0LlxuICogQGphIOWuieWFqOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCquODluOCuOOCp+OCr+ODiOOBruWPluW+l1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3Qgc2FmZVdpbmRvdyA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuICogY29uc29sZS5sb2cobnVsbCAhPSBzYWZlV2luZG93LmRvY3VtZW50KTsgICAgLy8gdHJ1ZVxuICogY29uc3QgZGl2ID0gc2FmZVdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAqIGNvbnNvbGUubG9nKG51bGwgIT0gZGl2KTsgICAgLy8gdHJ1ZVxuICogYGBgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBBIHJlZmVyZW5jZSBvZiBhbiBvYmplY3Qgd2l0aCBhIHBvc3NpYmlsaXR5IHdoaWNoIGV4aXN0cy5cbiAqICAtIGBqYWAg5a2Y5Zyo44GX44GG44KL44Kq44OW44K444Kn44Kv44OI44Gu5Y+C54WnXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZWFsaXR5IG9yIHN0dWIgaW5zdGFuY2UuXG4gKiAgLSBgamFgIOWun+S9k+OBvuOBn+OBr+OCueOCv+ODluOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FmZTxUPih0YXJnZXQ6IFQpOiBUIHtcbiAgICByZXR1cm4gdGFyZ2V0IHx8IGNyZWF0ZSgpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWludGVyZmFjZSwgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5pbXBvcnQgeyBnZXRHbG9iYWwgfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgeyBzYWZlIH0gZnJvbSAnLi9zYWZlJztcblxuLyoqXG4gKiBAZW4gVHlwZSBvZiBoYW5kbGUgZm9yIHRpbWVyIGZ1bmN0aW9ucy5cbiAqIEBqYSDjgr/jgqTjg57jg7zplqLmlbDjgavkvb/nlKjjgZnjgovjg4/jg7Pjg4njg6vlnotcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUaW1lckhhbmRsZSB7IH1cblxuLyoqXG4gKiBAZW4gVHlwZSBvZiB0aW1lciBzdGFydCBmdW5jdGlvbnMuXG4gKiBAamEg44K/44Kk44Oe44O86ZaL5aeL6Zai5pWw44Gu5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFRpbWVyU3RhcnRGdW5jdGlvbiA9IChoYW5kbGVyOiBGdW5jdGlvbiwgdGltZW91dD86IG51bWJlciwgLi4uYXJnczogYW55W10pID0+IFRpbWVySGFuZGxlO1xuXG4vKipcbiAqIEBlbiBUeXBlIG9mIHRpbWVyIHN0b3AgZnVuY3Rpb25zLlxuICogQGphIOOCv+OCpOODnuODvOWBnOatoumWouaVsOOBruWei1xuICovXG5leHBvcnQgdHlwZSBUaW1lclN0b3BGdW5jdGlvbiA9IChoYW5kbGU6IFRpbWVySGFuZGxlKSA9PiB2b2lkO1xuXG5jb25zdCByb290OiBhbnkgPSBnZXRHbG9iYWwoKTtcbmNvbnN0IF9zZXRUaW1lb3V0OiBUaW1lclN0YXJ0RnVuY3Rpb24gPSBzYWZlKHJvb3Quc2V0VGltZW91dCk7XG5jb25zdCBfY2xlYXJUaW1lb3V0OiBUaW1lclN0b3BGdW5jdGlvbiA9IHNhZmUocm9vdC5jbGVhclRpbWVvdXQpO1xuY29uc3QgX3NldEludGVydmFsOiBUaW1lclN0YXJ0RnVuY3Rpb24gPSBzYWZlKHJvb3Quc2V0SW50ZXJ2YWwpO1xuY29uc3QgX2NsZWFySW50ZXJ2YWw6IFRpbWVyU3RvcEZ1bmN0aW9uID0gc2FmZShyb290LmNsZWFySW50ZXJ2YWwpO1xuXG5leHBvcnQge1xuICAgIF9zZXRUaW1lb3V0IGFzIHNldFRpbWVvdXQsXG4gICAgX2NsZWFyVGltZW91dCBhcyBjbGVhclRpbWVvdXQsXG4gICAgX3NldEludGVydmFsIGFzIHNldEludGVydmFsLFxuICAgIF9jbGVhckludGVydmFsIGFzIGNsZWFySW50ZXJ2YWwsXG59O1xuIiwiaW1wb3J0IHtcbiAgICBXcml0YWJsZSxcbiAgICBQcmltaXRpdmUsXG4gICAgVHlwZWREYXRhLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzT2JqZWN0LFxuICAgIGNsYXNzTmFtZSxcbn0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBzZXRUaW1lb3V0IH0gZnJvbSAnLi90aW1lcic7XG5cbi8qKlxuICogQGVuIEVuc3VyZSBhc3luY2hyb25vdXMgZXhlY3V0aW9uLlxuICogQGphIOmdnuWQjOacn+Wun+ihjOOCkuS/neiovFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogcG9zdCgoKSA9PiBleGVjKGFyZykpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIGltcGxlbWVudCBhcyBmdW5jdGlvbiBzY29wZS5cbiAqICAtIGBqYWAg6Zai5pWw44K544Kz44O844OX44Go44GX44Gm5a6f6KOFXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3Q8VD4oZXhlY3V0b3I6ICgpID0+IFQpOiBQcm9taXNlPFQ+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkudGhlbihleGVjdXRvcik7XG59XG5cbi8qKlxuICogQGVuIEdlbmVyaWMgTm8tT3BlcmF0aW9uLlxuICogQGphIOaxjueUqCBOby1PcGVyYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vb3AoLi4uYXJnczogYW55W10pOiBhbnkgeyAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgIC8vIG5vb3Bcbn1cblxuLyoqXG4gKiBAZW4gV2FpdCBmb3IgdGhlIGRlc2lnbmF0aW9uIGVsYXBzZS5cbiAqIEBqYSDmjIflrprmmYLplpPlh6bnkIbjgpLlvoXmqZ9cbiAqXG4gKiBAcGFyYW0gZWxhcHNlXG4gKiAgLSBgZW5gIHdhaXQgZWxhcHNlIFttc2VjXS5cbiAqICAtIGBqYWAg5b6F5qmf5pmC6ZaTIFttc2VjXVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2xlZXAoZWxhcHNlOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIGVsYXBzZSkpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIGVzY2FwZSBmdW5jdGlvbiBmcm9tIG1hcC5cbiAqIEBqYSDmloflrZfnva7mj5vplqLmlbDjgpLkvZzmiJBcbiAqXG4gKiBAcGFyYW0gbWFwXG4gKiAgLSBgZW5gIGtleTogdGFyZ2V0IGNoYXIsIHZhbHVlOiByZXBsYWNlIGNoYXJcbiAqICAtIGBqYWAga2V5OiDnva7mj5vlr77osaEsIHZhbHVlOiDnva7mj5vmloflrZdcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIGVzcGFjZSBmdW5jdGlvblxuICogIC0gYGphYCDjgqjjgrnjgrHjg7zjg5fplqLmlbBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVzY2FwZXIobWFwOiBvYmplY3QpOiAoc3JjOiBQcmltaXRpdmUpID0+IHN0cmluZyB7XG4gICAgY29uc3QgZXNjYXBlciA9IChtYXRjaDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICAgICAgcmV0dXJuIG1hcFttYXRjaF07XG4gICAgfTtcblxuICAgIGNvbnN0IHNvdXJjZSA9IGAoPzoke09iamVjdC5rZXlzKG1hcCkuam9pbignfCcpfSlgO1xuICAgIGNvbnN0IHJlZ2V4VGVzdCA9IFJlZ0V4cChzb3VyY2UpO1xuICAgIGNvbnN0IHJlZ2V4UmVwbGFjZSA9IFJlZ0V4cChzb3VyY2UsICdnJyk7XG5cbiAgICByZXR1cm4gKHNyYzogUHJpbWl0aXZlKTogc3RyaW5nID0+IHtcbiAgICAgICAgc3JjID0gKG51bGwgPT0gc3JjIHx8ICdzeW1ib2wnID09PSB0eXBlb2Ygc3JjKSA/ICcnIDogU3RyaW5nKHNyYyk7XG4gICAgICAgIHJldHVybiByZWdleFRlc3QudGVzdChzcmMpID8gc3JjLnJlcGxhY2UocmVnZXhSZXBsYWNlLCBlc2NhcGVyKSA6IHNyYztcbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBFc2NhcGUgSFRNTCBzdHJpbmdcbiAqIEBqYSBIVE1MIOOBp+S9v+eUqOOBmeOCi+aWh+Wtl+OCkuWItuW+oeaWh+Wtl+OBq+e9ruaPm1xuICpcbiAqIEBicmllZiA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IG1hcEh0bWxFc2NhcGUgPSB7XG4gKiAgICAgJzwnOiAnJmx0OycsXG4gKiAgICAgJz4nOiAnJmd0OycsXG4gKiAgICAgJyYnOiAnJmFtcDsnLFxuICogICAgICdcIic6ICcmcXVvdDsnLFxuICogICAgIFwiJ1wiOiAnJiMzOTsnLFxuICogICAgICdgJzogJyYjeDYwOydcbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGVzY2FwZUhUTUwgPSBjcmVhdGVFc2NhcGVyKHtcbiAgICAnPCc6ICcmbHQ7JyxcbiAgICAnPic6ICcmZ3Q7JyxcbiAgICAnJic6ICcmYW1wOycsXG4gICAgJ1wiJzogJyZxdW90OycsXG4gICAgXCInXCI6ICcmIzM5OycsXG4gICAgJ2AnOiAnJiN4NjA7J1xufSk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIHRoZSBzdHlsZSBjb21wdWxzaW9uIHZhbHVlIGZyb20gaW5wdXQgc3RyaW5nLlxuICogQGphIOWFpeWKm+aWh+Wtl+WIl+OCkuWei+W8t+WItuOBl+OBn+WApOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhXG4gKiAgLSBgZW5gIGlucHV0IHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlr77osaHjga7mloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvVHlwZWREYXRhKGRhdGE6IHN0cmluZyB8IHVuZGVmaW5lZCk6IFR5cGVkRGF0YSB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCd0cnVlJyA9PT0gZGF0YSkge1xuICAgICAgICAvLyBib29sZWFuOiB0cnVlXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoJ2ZhbHNlJyA9PT0gZGF0YSkge1xuICAgICAgICAvLyBib29sZWFuOiBmYWxzZVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmICgnbnVsbCcgPT09IGRhdGEpIHtcbiAgICAgICAgLy8gbnVsbFxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKGRhdGEgPT09IFN0cmluZyhOdW1iZXIoZGF0YSkpKSB7XG4gICAgICAgIC8vIG51bWJlcjog5pWw5YCk5aSJ5o+bIOKGkiDmloflrZfliJflpInmj5vjgaflhYPjgavmiLvjgovjgajjgY1cbiAgICAgICAgcmV0dXJuIE51bWJlcihkYXRhKTtcbiAgICB9IGVsc2UgaWYgKGRhdGEgJiYgL14oPzpcXHtbXFx3XFxXXSpcXH18XFxbW1xcd1xcV10qXFxdKSQvLnRlc3QoZGF0YSkpIHtcbiAgICAgICAgLy8gb2JqZWN0XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKGRhdGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHN0cmluZyAvIHVuZGVmaW5lZFxuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gc3RyaW5nIGZyb20gW1tUeXBlZERhdGFdXS5cbiAqIEBqYSBbW1R5cGVkRGF0YV1dIOOCkuaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhXG4gKiAgLSBgZW5gIGlucHV0IHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlr77osaHjga7mloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21UeXBlZERhdGEoZGF0YTogVHlwZWREYXRhIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAodW5kZWZpbmVkID09PSBkYXRhIHx8IGlzU3RyaW5nKGRhdGEpKSB7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoZGF0YSkpIHtcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBTdHJpbmcoZGF0YSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGBXZWIgQVBJYCBzdG9ja2VkIHR5cGUuIDxicj5cbiAqICAgICBFbnN1cmUgbm90IHRvIHJldHVybiBgdW5kZWZpbmVkYCB2YWx1ZS5cbiAqIEBqYSBgV2ViIEFQSWAg5qC857SN5b2i5byP44Gr5aSJ5o+bIDxicj5cbiAqICAgICBgdW5kZWZpbmVkYCDjgpLov5TljbTjgZfjgarjgYTjgZPjgajjgpLkv53oqLxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRyb3BVbmRlZmluZWQ8VD4odmFsdWU6IFQgfCBudWxsIHwgdW5kZWZpbmVkLCBuaWxTZXJpYWxpemUgPSBmYWxzZSk6IFQgfCAnbnVsbCcgfCAndW5kZWZpbmVkJyB8IG51bGwge1xuICAgIHJldHVybiBudWxsICE9IHZhbHVlID8gdmFsdWUgOiAobmlsU2VyaWFsaXplID8gU3RyaW5nKHZhbHVlKSA6IG51bGwpIGFzIFQgfCAnbnVsbCcgfCAndW5kZWZpbmVkJyB8IG51bGw7XG59XG5cbi8qKlxuICogQGVuIERlc2VyaWFsaXplIGZyb20gYFdlYiBBUElgIHN0b2NrZWQgdHlwZS4gPGJyPlxuICogICAgIENvbnZlcnQgZnJvbSAnbnVsbCcgb3IgJ3VuZGVmaW5lZCcgc3RyaW5nIHRvIG9yaWdpbmFsIHR5cGUuXG4gKiBAamEgJ251bGwnIG9yICd1bmRlZmluZWQnIOOCkuOCguOBqOOBruWei+OBq+aIu+OBmVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzdG9yZU5pbDxUPih2YWx1ZTogVCB8ICdudWxsJyB8ICd1bmRlZmluZWQnKTogVCB8IG51bGwgfCB1bmRlZmluZWQge1xuICAgIGlmICgnbnVsbCcgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoJ3VuZGVmaW5lZCcgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENoZWNrIHdoZXRoZXIgaW5wdXQgc291cmNlIGhhcyBhIHByb3BlcnR5LlxuICogQGphIOWFpeWKm+WFg+OBjOODl+ODreODkeODhuOCo+OCkuaMgeOBo+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzcmNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc1Byb3BlcnR5KHNyYzogdW5rbm93biwgcHJvcE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBudWxsICE9IHNyYyAmJiBpc09iamVjdChzcmMpICYmIChwcm9wTmFtZSBpbiBzcmMpO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgc2hhbGxvdyBjb3B5IG9mIGB0YXJnZXRgIHdoaWNoIGhhcyBvbmx5IGBwaWNrdXBLZXlzYC5cbiAqIEBqYSBgcGlja3VwS2V5c2Ag44Gn5oyH5a6a44GV44KM44Gf44OX44Ot44OR44OG44Kj44Gu44G/44KS5oyB44GkIGB0YXJnZXRgIOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBjb3B5IHNvdXJjZSBvYmplY3RcbiAqICAtIGBqYWAg44Kz44OU44O85YWD44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gcGlja3VwS2V5c1xuICogIC0gYGVuYCBjb3B5IHRhcmdldCBrZXlzXG4gKiAgLSBgamFgIOOCs+ODlOODvOWvvuixoeOBruOCreODvOS4gOimp1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFydGlhbGl6ZTxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMga2V5b2YgVD4odGFyZ2V0OiBULCAuLi5waWNrdXBLZXlzOiBLW10pOiBXcml0YWJsZTxQaWNrPFQsIEs+PiB7XG4gICAgaWYgKCF0YXJnZXQgfHwgIWlzT2JqZWN0KHRhcmdldCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHtjbGFzc05hbWUodGFyZ2V0KX0gaXMgbm90IGFuIG9iamVjdC5gKTtcbiAgICB9XG4gICAgcmV0dXJuIHBpY2t1cEtleXMucmVkdWNlKChvYmosIGtleSkgPT4ge1xuICAgICAgICBrZXkgaW4gdGFyZ2V0ICYmIChvYmpba2V5XSA9IHRhcmdldFtrZXldKTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9LCB7fSBhcyBXcml0YWJsZTxQaWNrPFQsIEs+Pik7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBmaXJzdCBsZXR0ZXIgb2YgdGhlIHN0cmluZyB0byB1cHBlcmNhc2UuXG4gKiBAamEg5pyA5Yid44Gu5paH5a2X44KS5aSn5paH5a2X44Gr5aSJ5o+bXG4gKlxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2FwaXRhbGl6ZShcImZvbyBCYXJcIik7XG4gKiAvLyA9PiBcIkZvbyBCYXJcIlxuICpcbiAqIGNhcGl0YWxpemUoXCJGT08gQmFyXCIsIHRydWUpO1xuICogLy8gPT4gXCJGb28gYmFyXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqIEBwYXJhbSBsb3dlcmNhc2VSZXN0XG4gKiAgLSBgZW5gIElmIGB0cnVlYCBpcyBwYXNzZWQsIHRoZSByZXN0IG9mIHRoZSBzdHJpbmcgd2lsbCBiZSBjb252ZXJ0ZWQgdG8gbG93ZXIgY2FzZVxuICogIC0gYGphYCBgdHJ1ZWAg44KS5oyH5a6a44GX44Gf5aC05ZCILCAy5paH5a2X55uu5Lul6ZmN44KC5bCP5paH5a2X5YyWXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYXBpdGFsaXplKHNyYzogc3RyaW5nLCBsb3dlcmNhc2VSZXN0ID0gZmFsc2UpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlbWFpbmluZ0NoYXJzID0gIWxvd2VyY2FzZVJlc3QgPyBzcmMuc2xpY2UoMSkgOiBzcmMuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcbiAgICByZXR1cm4gc3JjLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcmVtYWluaW5nQ2hhcnM7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIGZpcnN0IGxldHRlciBvZiB0aGUgc3RyaW5nIHRvIGxvd2VyY2FzZS5cbiAqIEBqYSDmnIDliJ3jga7mloflrZfjgpLlsI/mloflrZfljJZcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGRlY2FwaXRhbGl6ZShcIkZvbyBCYXJcIik7XG4gKiAvLyA9PiBcImZvbyBCYXJcIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVjYXBpdGFsaXplKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc3JjLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgc3JjLnNsaWNlKDEpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyB1bmRlcnNjb3JlZCBvciBkYXNoZXJpemVkIHN0cmluZyB0byBhIGNhbWVsaXplZCBvbmUuIDxicj5cbiAqICAgICBCZWdpbnMgd2l0aCBhIGxvd2VyIGNhc2UgbGV0dGVyIHVubGVzcyBpdCBzdGFydHMgd2l0aCBhbiB1bmRlcnNjb3JlLCBkYXNoIG9yIGFuIHVwcGVyIGNhc2UgbGV0dGVyLlxuICogQGphIGBfYCwgYC1gIOWMuuWIh+OCiuaWh+Wtl+WIl+OCkuOCreODo+ODoeODq+OCseODvOOCueWMliA8YnI+XG4gKiAgICAgYC1gIOOBvuOBn+OBr+Wkp+aWh+Wtl+OCueOCv+ODvOODiOOBp+OBguOCjOOBsCwg5aSn5paH5a2X44K544K/44O844OI44GM5pei5a6a5YCkXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjYW1lbGl6ZShcIm1vei10cmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIm1velRyYW5zZm9ybVwiXG4gKlxuICogY2FtZWxpemUoXCItbW96LXRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwiTW96VHJhbnNmb3JtXCJcbiAqXG4gKiBjYW1lbGl6ZShcIl9tb3pfdHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJNb3pUcmFuc2Zvcm1cIlxuICpcbiAqIGNhbWVsaXplKFwiTW96LXRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwiTW96VHJhbnNmb3JtXCJcbiAqXG4gKiBjYW1lbGl6ZShcIi1tb3otdHJhbnNmb3JtXCIsIHRydWUpO1xuICogLy8gPT4gXCJtb3pUcmFuc2Zvcm1cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICogQHBhcmFtIGxvd2VyXG4gKiAgLSBgZW5gIElmIGB0cnVlYCBpcyBwYXNzZWQsIGZvcmNlIGNvbnZlcnRzIHRvIGxvd2VyIGNhbWVsIGNhc2UgaW4gc3RhcnRzIHdpdGggdGhlIHNwZWNpYWwgY2FzZS5cbiAqICAtIGBqYWAg5by35Yi255qE44Gr5bCP5paH5a2X44K544K/44O844OI44GZ44KL5aC05ZCI44Gr44GvIGB0cnVlYCDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhbWVsaXplKHNyYzogc3RyaW5nLCBsb3dlciA9IGZhbHNlKTogc3RyaW5nIHtcbiAgICBzcmMgPSBzcmMudHJpbSgpLnJlcGxhY2UoL1stX1xcc10rKC4pPy9nLCAobWF0Y2gsIGMpID0+IHtcbiAgICAgICAgcmV0dXJuIGMgPyBjLnRvVXBwZXJDYXNlKCkgOiAnJztcbiAgICB9KTtcblxuICAgIGlmICh0cnVlID09PSBsb3dlcikge1xuICAgICAgICByZXR1cm4gZGVjYXBpdGFsaXplKHNyYyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHNyYztcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIHN0cmluZyB0byBjYW1lbGl6ZWQgY2xhc3MgbmFtZS4gRmlyc3QgbGV0dGVyIGlzIGFsd2F5cyB1cHBlciBjYXNlLlxuICogQGphIOWFiOmgreWkp+aWh+Wtl+OBruOCreODo+ODoeODq+OCseODvOOCueOBq+WkieaPm1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2xhc3NpZnkoXCJzb21lX2NsYXNzX25hbWVcIik7XG4gKiAvLyA9PiBcIlNvbWVDbGFzc05hbWVcIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gY2xhc3NpZnkoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBjYXBpdGFsaXplKGNhbWVsaXplKHNyYy5yZXBsYWNlKC9bXFxXX10vZywgJyAnKSkucmVwbGFjZSgvXFxzL2csICcnKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIGEgY2FtZWxpemVkIG9yIGRhc2hlcml6ZWQgc3RyaW5nIGludG8gYW4gdW5kZXJzY29yZWQgb25lLlxuICogQGphIOOCreODo+ODoeODq+OCseODvOOCuSBvciBgLWAg44Gk44Gq44GO5paH5a2X5YiX44KSIGBfYCDjgaTjgarjgY7jgavlpInmj5tcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIHVuZGVyc2NvcmVkKFwiTW96VHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJtb3pfdHJhbnNmb3JtXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuZGVyc2NvcmVkKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc3JjLnRyaW0oKS5yZXBsYWNlKC8oW2EtelxcZF0pKFtBLVpdKykvZywgJyQxXyQyJykucmVwbGFjZSgvWy1cXHNdKy9nLCAnXycpLnRvTG93ZXJDYXNlKCk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIGEgdW5kZXJzY29yZWQgb3IgY2FtZWxpemVkIHN0cmluZyBpbnRvIGFuIGRhc2hlcml6ZWQgb25lLlxuICogQGphIOOCreODo+ODoeODq+OCseODvOOCuSBvciBgX2Ag44Gk44Gq44GO5paH5a2X5YiX44KSIGAtYCDjgaTjgarjgY7jgavlpInmj5tcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGRhc2hlcml6ZShcIk1velRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwiLW1vei10cmFuc2Zvcm1cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGFzaGVyaXplKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc3JjLnRyaW0oKS5yZXBsYWNlKC8oW0EtWl0pL2csICctJDEnKS5yZXBsYWNlKC9bX1xcc10rL2csICctJykudG9Mb3dlckNhc2UoKTtcbn1cbiJdLCJuYW1lcyI6WyJzZXRUaW1lb3V0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7OztBQVFBLGFBQWdCLFNBQVM7O1FBRXJCLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxVQUFVLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO0lBQ3JGLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7QUFXQSxhQUFnQixZQUFZLENBQW9CLE1BQXFCLEVBQUUsR0FBRyxLQUFlO1FBQ3JGLElBQUksSUFBSSxHQUFHLE1BQU0sSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUNqQyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtZQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElB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LENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNsRixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsY0FBYyxDQUFDO0lBQ3hELENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7O0FBZUEsYUFBZ0IsWUFBWSxDQUFDLEdBQVc7UUFDcEMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWdDQSxhQUFnQixRQUFRLENBQUMsR0FBVyxFQUFFLEtBQUssR0FBRyxLQUFLO1FBQy9DLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzlDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFLENBQUM7U0FDbkMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxJQUFJLEtBQUssS0FBSyxFQUFFO1lBQ2hCLE9BQU8sWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzVCO2FBQU07WUFDSCxPQUFPLEdBQUcsQ0FBQztTQUNkO0lBQ0wsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7QUFlQSxhQUFnQixRQUFRLENBQUMsR0FBVztRQUNoQyxPQUFPLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0UsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7QUFlQSxhQUFnQixXQUFXLENBQUMsR0FBVztRQUNuQyxPQUFPLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNuRyxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7OztBQWVBLGFBQWdCLFNBQVMsQ0FBQyxHQUFXO1FBQ2pDLE9BQU8sR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUN2RixDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2NvcmUtdXRpbHMvIn0=
