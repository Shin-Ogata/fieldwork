/*!
 * @cdp/core-utils 0.9.0
 *   core framework utilities
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
 * @en Common Symble for framework.
 * @ja フレームワークが共通で使用する Symble
 */
const $cdp = Symbol('@cdp');

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
            const oldValue = obj[key];
            const newValue = merge(oldValue, source[key]);
            !needUpdate(oldValue, newValue, true) || (obj[key] = newValue);
        }
    }
    else {
        for (const key in source) {
            const oldValue = obj[key];
            const newValue = merge(oldValue, source[key]);
            !needUpdate(oldValue, newValue, true) || (obj[key] = newValue);
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
// copy properties core
function reflectProperties(target, source, key) {
    if (null == target[key]) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    }
}
// object properties copy method
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
    if (!target || !isObject(target)) {
        throw new TypeError(`${className(target)} is not an object.`);
    }
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
    if (!target || !isObject(target)) {
        throw new TypeError(`${className(target)} is not an object.`);
    }
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
    if (!base || !isObject(base)) {
        throw new TypeError(`${className(base)} is not an object.`);
    }
    if (!src || !isObject(src)) {
        throw new TypeError(`${className(src)} is not an object.`);
    }
    const retval = {};
    for (const key of Object.keys(src)) {
        if (!deepEqual(base[key], src[key])) {
            retval[key] = src[key];
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

/* eslint-disable @typescript-eslint/no-explicit-any */
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
        // eslint-disable-next-line no-invalid-this
        context = this;
        args = [...arg];
        if (remaining <= 0 || remaining > elapse) {
            if (handle) {
                _clearTimeout(handle);
                handle = undefined;
            }
            previous = now;
            result = executor.apply(context, args);
            if (!handle) {
                context = args = undefined;
            }
        }
        else if (!handle && false !== opts.trailing) {
            handle = _setTimeout(later, remaining);
        }
        return result;
    };
    throttled.cancel = function () {
        _clearTimeout(handle);
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
            _clearTimeout(handle);
        }
        if (immediate) {
            const callNow = !handle;
            handle = _setTimeout(later, wait);
            if (callNow) {
                result = executor.apply(this, args);
            }
        }
        else {
            handle = _setTimeout(later, wait, this, [...args]);
        }
        return result;
    };
    debounced.cancel = function () {
        _clearTimeout(handle);
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
 *     '<': '&lt;',
 *     '>': '&gt;',
 *     '&': '&amp;',
 *     '"': '&quot;',
 *     "'": '&#39;',
 *     '`': '&#x60;'
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
let _localId = 0;
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
//__________________________________________________________________________________________________//
/** @internal */
const _regexCancelLikeString = /(abort|cancel)/im;
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

export { $cdp, camelize, capitalize, className, classify, _clearInterval as clearInterval, _clearTimeout as clearTimeout, createEscaper, dasherize, debounce, decapitalize, deepCopy, deepEqual, deepMerge, diff, dropUndefined, ensureObject, escapeHTML, every, exists, filter, find, findIndex, fromTypedData, getConfig, getGlobal, getGlobalNamespace, groupBy, has, indices, instanceOf, invert, isArray, isBoolean, isChancelLikeError, isEmptyObject, isFunction, isIterable, isNil, isNumber, isObject, isPlainObject, isPrimitive, isString, isSymbol, isTypedArray, luid, map, mixins, noop, omit, once, ownInstanceOf, pick, post, reduce, restoreNil, result, safe, sameClass, sameType, _setInterval as setInterval, setMixClassAttribute, _setTimeout as setTimeout, shuffle, sleep, some, sort, throttle, toTypedData, typeOf, underscored, unescapeHTML, union, unique, verify };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS11dGlscy5tanMiLCJzb3VyY2VzIjpbImNvbmZpZy50cyIsInR5cGVzLnRzIiwidmVyaWZ5LnRzIiwiZGVlcC1jaXJjdWl0LnRzIiwibWl4aW5zLnRzIiwiYXJyYXkudHMiLCJvYmplY3QudHMiLCJzYWZlLnRzIiwidGltZXIudHMiLCJtaXNjLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGVuIFNhZmUgYGdsb2JhbGAgYWNjZXNzb3IuXG4gKiBAamEgYGdsb2JhbGAg44Ki44Kv44K744OD44K1XG4gKiBcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIGBnbG9iYWxgIG9iamVjdCBvZiB0aGUgcnVudGltZSBlbnZpcm9ubWVudFxuICogIC0gYGphYCDnkrDlooPjgavlv5zjgZjjgZ8gYGdsb2JhbGAg44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWwoKTogdHlwZW9mIGdsb2JhbFRoaXMge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1uZXctZnVuY1xuICAgIHJldHVybiAoJ29iamVjdCcgPT09IHR5cGVvZiBnbG9iYWxUaGlzKSA/IGdsb2JhbFRoaXMgOiBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xufVxuXG4vKipcbiAqIEBlbiBFbnN1cmUgbmFtZWQgb2JqZWN0IGFzIHBhcmVudCdzIHByb3BlcnR5LlxuICogQGphIOimquOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumuOBl+OBpiwg5ZCN5YmN44Gr5oyH5a6a44GX44Gf44Kq44OW44K444Kn44Kv44OI44Gu5a2Y5Zyo44KS5L+d6Ki8XG4gKlxuICogQHBhcmFtIHBhcmVudFxuICogIC0gYGVuYCBwYXJlbnQgb2JqZWN0LiBJZiBudWxsIGdpdmVuLCBgZ2xvYmFsVGhpc2AgaXMgYXNzaWduZWQuXG4gKiAgLSBgamFgIOimquOCquODluOCuOOCp+OCr+ODiC4gbnVsbCDjga7loLTlkIjjga8gYGdsb2JhbFRoaXNgIOOBjOS9v+eUqOOBleOCjOOCi1xuICogQHBhcmFtIG5hbWVzXG4gKiAgLSBgZW5gIG9iamVjdCBuYW1lIGNoYWluIGZvciBlbnN1cmUgaW5zdGFuY2UuXG4gKiAgLSBgamFgIOS/neiovOOBmeOCi+OCquODluOCuOOCp+OCr+ODiOOBruWQjeWJjVxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlT2JqZWN0PFQgZXh0ZW5kcyB7fSA9IHt9PihwYXJlbnQ6IG9iamVjdCB8IG51bGwsIC4uLm5hbWVzOiBzdHJpbmdbXSk6IFQge1xuICAgIGxldCByb290ID0gcGFyZW50IHx8IGdldEdsb2JhbCgpO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBuYW1lcykge1xuICAgICAgICByb290W25hbWVdID0gcm9vdFtuYW1lXSB8fCB7fTtcbiAgICAgICAgcm9vdCA9IHJvb3RbbmFtZV07XG4gICAgfVxuICAgIHJldHVybiByb290IGFzIFQ7XG59XG5cbi8qKlxuICogQGVuIEdsb2JhbCBuYW1lc3BhY2UgYWNjZXNzb3IuXG4gKiBAamEg44Kw44Ot44O844OQ44Or44ON44O844Og44K544Oa44O844K544Ki44Kv44K744OD44K1XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWxOYW1lc3BhY2U8VCBleHRlbmRzIHt9ID0ge30+KG5hbWVzcGFjZTogc3RyaW5nKTogVCB7XG4gICAgcmV0dXJuIGVuc3VyZU9iamVjdDxUPihudWxsLCBuYW1lc3BhY2UpO1xufVxuXG4vKipcbiAqIEBlbiBHbG9iYWwgY29uZmlnIGFjY2Vzc29yLlxuICogQGphIOOCsOODreODvOODkOODq+OCs+ODs+ODleOCo+OCsOOCouOCr+OCu+ODg+OCtVxuICpcbiAqIEByZXR1cm5zIGRlZmF1bHQ6IGBDRFAuQ29uZmlnYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnPFQgZXh0ZW5kcyB7fSA9IHt9PihuYW1lc3BhY2UgPSAnQ0RQJywgY29uZmlnTmFtZSA9ICdDb25maWcnKTogVCB7XG4gICAgcmV0dXJuIGVuc3VyZU9iamVjdDxUPihnZXRHbG9iYWxOYW1lc3BhY2UobmFtZXNwYWNlKSwgY29uZmlnTmFtZSk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbi8qKlxuICogQGVuIFRoZSBnZW5lcmFsIG51bGwgdHlwZS5cbiAqIEBqYSDnqbrjgpLnpLrjgZnlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgTmlsID0gdm9pZCB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVuIFRoZSB0eXBlIG9mIG9iamVjdCBvciBbW05pbF1dLlxuICogQGphIFtbTmlsXV0g44Gr44Gq44KK44GI44KL44Kq44OW44K444Kn44Kv44OI5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIE5pbGxhYmxlPFQgZXh0ZW5kcyB7fT4gPSBUIHwgTmlsO1xuXG4vKipcbiAqIEBlbiBQcmltaXRpdmUgdHlwZSBvZiBKYXZhU2NyaXB0LlxuICogQGphIEphdmFTY3JpcHQg44Gu44OX44Oq44Of44OG44Kj44OW5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFByaW1pdGl2ZSA9IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBzeW1ib2wgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlbiBKYXZhU2NyaXB0IHR5cGUgc2V0IGludGVyZmFjZS5cbiAqIEBqYSBKYXZhU2NyaXB0IOOBruWei+OBrumbhuWQiFxuICovXG5pbnRlcmZhY2UgVHlwZUxpc3Qge1xuICAgIHN0cmluZzogc3RyaW5nO1xuICAgIG51bWJlcjogbnVtYmVyO1xuICAgIGJvb2xlYW46IGJvb2xlYW47XG4gICAgc3ltYm9sOiBzeW1ib2w7XG4gICAgdW5kZWZpbmVkOiB2b2lkIHwgdW5kZWZpbmVkO1xuICAgIG9iamVjdDogb2JqZWN0IHwgbnVsbDtcbiAgICBmdW5jdGlvbiguLi5hcmdzOiB1bmtub3duW10pOiB1bmtub3duO1xufVxuXG4vKipcbiAqIEBlbiBUaGUga2V5IGxpc3Qgb2YgW1tUeXBlTGlzdF1dLlxuICogQGphIFtbVHlwZUxpc3RdXSDjgq3jg7zkuIDopqdcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZUtleXMgPSBrZXlvZiBUeXBlTGlzdDtcblxuLyoqXG4gKiBAZW4gVHlwZSBiYXNlIGRlZmluaXRpb24uXG4gKiBAamEg5Z6L44Gu6KaP5a6a5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZTxUIGV4dGVuZHMge30+IGV4dGVuZHMgRnVuY3Rpb24ge1xuICAgIHJlYWRvbmx5IHByb3RvdHlwZTogVDtcbn1cblxuLyoqXG4gKiBAZW4gVHlwZSBvZiBjb25zdHJ1Y3Rvci5cbiAqIEBqYSDjgrPjg7Pjgrnjg4jjg6njgq/jgr/lnotcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb25zdHJ1Y3RvcjxUPiBleHRlbmRzIFR5cGU8VD4ge1xuICAgIG5ldyguLi5hcmdzOiB1bmtub3duW10pOiBUO1xufVxuXG4vKipcbiAqIEBlbiBUeXBlIG9mIGNsYXNzLlxuICogQGphIOOCr+ODqeOCueWei1xuICovXG5leHBvcnQgdHlwZSBDbGFzczxUID0gYW55PiA9IENvbnN0cnVjdG9yPFQ+O1xuXG4vKipcbiAqIEBlbiBFbnN1cmUgZm9yIGZ1bmN0aW9uIHBhcmFtZXRlcnMgdG8gdHVwbGUuXG4gKiBAamEg6Zai5pWw44OR44Op44Oh44O844K/44Go44GX44GmIHR1cGxlIOOCkuS/neiovFxuICovXG5leHBvcnQgdHlwZSBBcmd1bWVudHM8VD4gPSBUIGV4dGVuZHMgYW55W10gPyBUIDogW1RdO1xuXG4vKipcbiAqIEBlbiBSbW92ZSBgcmVhZG9ubHlgIGF0dHJpYnV0ZXMgZnJvbSBpbnB1dCB0eXBlLlxuICogQGphIGByZWFkb25seWAg5bGe5oCn44KS6Kej6ZmkXG4gKi9cbmV4cG9ydCB0eXBlIFdyaXRhYmxlPFQ+ID0geyAtcmVhZG9ubHkgW0sgaW4ga2V5b2YgVF06IFRbS10gfTtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBmdW5jdGlvbmFsIHByb3BlcnR5IG5hbWVzLlxuICogQGphIOmWouaVsOODl+ODreODkeODhuOCo+WQjeOBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBGdW5jdGlvblByb3BlcnR5TmFtZXM8VD4gPSB7IFtLIGluIGtleW9mIFRdOiBUW0tdIGV4dGVuZHMgRnVuY3Rpb24gPyBLIDogbmV2ZXIgfVtrZXlvZiBUXTtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBmdW5jdGlvbmFsIHByb3BlcnRpZXMuXG4gKiBAamEg6Zai5pWw44OX44Ot44OR44OG44Kj44Gu5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIEZ1bmN0aW9uUHJvcGVydGllczxUPiA9IFBpY2s8VCwgRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+PjtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBub24tZnVuY3Rpb25hbCBwcm9wZXJ0eSBuYW1lcy5cbiAqIEBqYSDpnZ7plqLmlbDjg5fjg63jg5Hjg4bjgqPlkI3jga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+ID0geyBbSyBpbiBrZXlvZiBUXTogVFtLXSBleHRlbmRzIEZ1bmN0aW9uID8gbmV2ZXIgOiBLIH1ba2V5b2YgVF07XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgbm9uLWZ1bmN0aW9uYWwgcHJvcGVydGllcy5cbiAqIEBqYSDpnZ7plqLmlbDjg5fjg63jg5Hjg4bjgqPjga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgTm9uRnVuY3Rpb25Qcm9wZXJ0aWVzPFQ+ID0gUGljazxULCBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VD4+O1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG9iamVjdCBrZXkgbGlzdC4gKGBrZXlvZmAgYWxpYXMpXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu44Kt44O85LiA6Kan44KS5oq95Ye6IChga2V5b2ZgIGFsaWFzKVxuICovXG5leHBvcnQgdHlwZSBLZXlzPFQgZXh0ZW5kcyB7fT4gPSBrZXlvZiBUO1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG9iamVjdCB0eXBlIGxpc3QuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu5Z6L5LiA6Kan44KS5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVzPFQgZXh0ZW5kcyB7fT4gPSBUW2tleW9mIFRdO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IG9iamVjdCBrZXkgdG8gdHlwZS5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjgq3jg7zjgYvjgonlnovjgbjlpInmj5tcbiAqL1xuZXhwb3J0IHR5cGUgS2V5VG9UeXBlPE8gZXh0ZW5kcyB7fSwgSyBleHRlbmRzIGtleW9mIE8+ID0gSyBleHRlbmRzIGtleW9mIE8gPyBPW0tdIDogbmV2ZXI7XG5cbi8qKlxuICogQGVuIENvbnZlcnQgb2JqZWN0IHR5cGUgdG8ga2V5LlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOWei+OBi+OCieOCreODvOOBuOWkieaPm1xuICovXG5leHBvcnQgdHlwZSBUeXBlVG9LZXk8TyBleHRlbmRzIHt9LCBUIGV4dGVuZHMgVHlwZXM8Tz4+ID0geyBbSyBpbiBrZXlvZiBPXTogT1tLXSBleHRlbmRzIFQgPyBLIDogbmV2ZXIgfVtrZXlvZiBPXTtcblxuLyoqXG4gKiBAZW4gVGhlIFtbUGxhaW5PYmplY3RdXSB0eXBlIGlzIGEgSmF2YVNjcmlwdCBvYmplY3QgY29udGFpbmluZyB6ZXJvIG9yIG1vcmUga2V5LXZhbHVlIHBhaXJzLiA8YnI+XG4gKiAgICAgJ1BsYWluJyBtZWFucyBpdCBmcm9tIG90aGVyIGtpbmRzIG9mIEphdmFTY3JpcHQgb2JqZWN0cy4gZXg6IG51bGwsIHVzZXItZGVmaW5lZCBhcnJheXMsIGFuZCBob3N0IG9iamVjdHMgc3VjaCBhcyBgZG9jdW1lbnRgLlxuICogQGphIDAg5Lul5LiK44GuIGtleS12YWx1ZSDjg5rjgqLjgpLmjIHjgaQgW1tQbGFpbk9iamVjdF1dIOWumue+qSA8YnI+VGhlIFBsYWluT2JqZWN0IHR5cGUgaXMgYSBKYXZhU2NyaXB0IG9iamVjdCBjb250YWluaW5nIHplcm8gb3IgbW9yZSBrZXktdmFsdWUgcGFpcnMuIDxicj5cbiAqICAgICAnUGxhaW4nIOOBqOOBr+S7luOBrueorumhnuOBriBKYXZhU2NyaXB0IOOCquODluOCuOOCp+OCr+ODiOOCkuWQq+OBvuOBquOBhOOCquODluOCuOOCp+OCr+ODiOOCkuaEj+WRs+OBmeOCiy4g5L6LOiAgbnVsbCwg44Om44O844K244O85a6a576p6YWN5YiXLCDjgb7jgZ/jga8gYGRvY3VtZW50YCDjga7jgojjgYbjgarntYTjgb/ovrzjgb/jgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGFpbk9iamVjdDxUID0gYW55PiB7XG4gICAgW2tleTogc3RyaW5nXTogVDtcbn1cblxuLyoqXG4gKiBAZW4gVGhlIGRhdGEgdHlwZSBsaXN0IGJ5IHdoaWNoIHN0eWxlIGNvbXB1bHNpb24gaXMgcG9zc2libGUuXG4gKiBAamEg5Z6L5by35Yi25Y+v6IO944Gq44OH44O844K/5Z6L5LiA6KanXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVkRGF0YSA9IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsIHwgb2JqZWN0O1xuXG4vKipcbiAqIEBlbiBUaGUgZGF0YSB0eXBlIGxpc3Qgb2YgVHlwZWRBcnJheS5cbiAqIEBqYSBUeXBlZEFycmF5IOS4gOimp1xuICovXG5leHBvcnQgdHlwZSBUeXBlZEFycmF5ID0gSW50OEFycmF5IHwgVWludDhBcnJheSB8IFVpbnQ4Q2xhbXBlZEFycmF5IHwgSW50MTZBcnJheSB8IFVpbnQxNkFycmF5IHwgSW50MzJBcnJheSB8IFVpbnQzMkFycmF5IHwgRmxvYXQzMkFycmF5IHwgRmxvYXQ2NEFycmF5O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGV4aXN0cy5cbiAqIEBqYSDlgKTjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleGlzdHM8TyBleHRlbmRzIHt9Pih4OiBOaWxsYWJsZTxPPik6IHggaXMgTztcbmV4cG9ydCBmdW5jdGlvbiBleGlzdHMoeDogdW5rbm93bik6IHggaXMgdW5rbm93bjtcbmV4cG9ydCBmdW5jdGlvbiBleGlzdHMoeDogYW55KTogYW55IHtcbiAgICByZXR1cm4gbnVsbCAhPSB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBbW05pbF1dLlxuICogQGphIFtbTmlsXV0g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOaWwoeDogdW5rbm93bik6IHggaXMgTmlsIHtcbiAgICByZXR1cm4gbnVsbCA9PSB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBTdHJpbmcuXG4gKiBAamEgU3RyaW5nIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3RyaW5nKHg6IHVua25vd24pOiB4IGlzIHN0cmluZyB7XG4gICAgcmV0dXJuICdzdHJpbmcnID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgTnVtYmVyLlxuICogQGphIE51bWJlciDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc051bWJlcih4OiB1bmtub3duKTogeCBpcyBudW1iZXIge1xuICAgIHJldHVybiAnbnVtYmVyJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIEJvb2xlYW4uXG4gKiBAamEgQm9vbGVhbiDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Jvb2xlYW4oeDogdW5rbm93bik6IHggaXMgYm9vbGVhbiB7XG4gICAgcmV0dXJuICdib29sZWFuJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFN5bWJsZS5cbiAqIEBqYSBTeW1ib2wg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTeW1ib2woeDogdW5rbm93bik6IHggaXMgc3ltYm9sIHtcbiAgICByZXR1cm4gJ3N5bWJvbCcgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBwcmltaXRpdmUgdHlwZS5cbiAqIEBqYSDjg5fjg6rjg5/jg4bjgqPjg5blnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1ByaW1pdGl2ZSh4OiB1bmtub3duKTogeCBpcyBQcmltaXRpdmUge1xuICAgIHJldHVybiAheCB8fCAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHgpICYmICgnb2JqZWN0JyAhPT0gdHlwZW9mIHgpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBBcnJheS5cbiAqIEBqYSBBcnJheSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBjb25zdCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgT2JqZWN0LlxuICogQGphIE9iamVjdCDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09iamVjdCh4OiB1bmtub3duKTogeCBpcyBvYmplY3Qge1xuICAgIHJldHVybiBCb29sZWFuKHgpICYmICdvYmplY3QnID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgW1tQbGFpbk9iamVjdF1dLlxuICogQGphIFtbUGxhaW5PYmplY3RdXSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KHg6IHVua25vd24pOiB4IGlzIFBsYWluT2JqZWN0IHtcbiAgICBpZiAoIWlzT2JqZWN0KHgpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBjcmVhdGUgZnJvbSBgT2JqZWN0LmNyZWF0ZSggbnVsbCApYCBpcyBwbGFpblxuICAgIGlmICghT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBvd25JbnN0YW5jZU9mKE9iamVjdCwgeCk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIGVtcHR5IG9iamVjdC5cbiAqIEBqYSDnqbrjgqrjg5bjgrjjgqfjgq/jg4jjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0VtcHR5T2JqZWN0KHg6IHVua25vd24pOiB4IGlzIG9iamVjdCB7XG4gICAgaWYgKCFpc1BsYWluT2JqZWN0KHgpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBuYW1lIGluIHgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgRnVuY3Rpb24uXG4gKiBAamEgRnVuY3Rpb24g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNGdW5jdGlvbih4OiB1bmtub3duKTogeCBpcyBUeXBlTGlzdFsnZnVuY3Rpb24nXSB7XG4gICAgcmV0dXJuICdmdW5jdGlvbicgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBpbnB1dC5cbiAqIEBqYSDmjIflrprjgZfjgZ/lnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gdHlwZVxuICogIC0gYGVuYCBldmFsdWF0ZWQgdHlwZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlnotcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHR5cGVPZjxLIGV4dGVuZHMgVHlwZUtleXM+KHR5cGU6IEssIHg6IHVua25vd24pOiB4IGlzIFR5cGVMaXN0W0tdIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09IHR5cGU7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBoYXMgaXRlcmF0b3IuXG4gKiBAamEgaXRlcmF0b3Ig44KS5omA5pyJ44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZTxUPih4OiBOaWxsYWJsZTxJdGVyYWJsZTxUPj4pOiB4IGlzIEl0ZXJhYmxlPFQ+O1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGUoeDogdW5rbm93bik6IHggaXMgSXRlcmFibGU8dW5rbm93bj47XG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZSh4OiBhbnkpOiBhbnkge1xuICAgIHJldHVybiBTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KHgpO1xufVxuXG5jb25zdCBfdHlwZWRBcnJheU5hbWVzID0ge1xuICAgICdJbnQ4QXJyYXknOiB0cnVlLFxuICAgICdVaW50OEFycmF5JzogdHJ1ZSxcbiAgICAnVWludDhDbGFtcGVkQXJyYXknOiB0cnVlLFxuICAgICdJbnQxNkFycmF5JzogdHJ1ZSxcbiAgICAnVWludDE2QXJyYXknOiB0cnVlLFxuICAgICdJbnQzMkFycmF5JzogdHJ1ZSxcbiAgICAnVWludDMyQXJyYXknOiB0cnVlLFxuICAgICdGbG9hdDMyQXJyYXknOiB0cnVlLFxuICAgICdGbG9hdDY0QXJyYXknOiB0cnVlLFxufTtcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGlzIG9uZSBvZiBbW1R5cGVkQXJyYXldXS5cbiAqIEBqYSDmjIflrprjgZfjgZ/jgqTjg7Pjgrnjgr/jg7PjgrnjgYwgW1tUeXBlZEFycmF5XV0g44Gu5LiA56iu44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlZEFycmF5KHg6IHVua25vd24pOiB4IGlzIFR5cGVkQXJyYXkge1xuICAgIHJldHVybiAhIV90eXBlZEFycmF5TmFtZXNbY2xhc3NOYW1lKHgpXTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGluc3RhbmNlIG9mIGlucHV0LlxuICogQGphIOaMh+WumuOBl+OBn+OCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDoqZXkvqHjgZnjgovjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluc3RhbmNlT2Y8VCBleHRlbmRzIHt9PihjdG9yOiBOaWxsYWJsZTxUeXBlPFQ+PiwgeDogdW5rbm93bik6IHggaXMgVCB7XG4gICAgcmV0dXJuICgnZnVuY3Rpb24nID09PSB0eXBlb2YgY3RvcikgJiYgKHggaW5zdGFuY2VvZiBjdG9yKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGluc3RhbmNlIG9mIGlucHV0IGNvbnN0cnVjdG9yIChleGNlcHQgc3ViIGNsYXNzKS5cbiAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvliKTlrpogKOa0vueUn+OCr+ODqeOCueOBr+WQq+OCgeOBquOBhClcbiAqXG4gKiBAcGFyYW0gY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL44Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvd25JbnN0YW5jZU9mPFQgZXh0ZW5kcyB7fT4oY3RvcjogTmlsbGFibGU8VHlwZTxUPj4sIHg6IHVua25vd24pOiB4IGlzIFQge1xuICAgIHJldHVybiAobnVsbCAhPSB4KSAmJiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGN0b3IpICYmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgPT09IE9iamVjdChjdG9yLnByb3RvdHlwZSkpO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIHZhbHVlJ3MgY2xhc3MgbmFtZS5cbiAqIEBqYSDjgq/jg6njgrnlkI3jgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGFzc05hbWUoeDogYW55KTogc3RyaW5nIHtcbiAgICBpZiAoeCAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHRvU3RyaW5nVGFnTmFtZSA9IHhbU3ltYm9sLnRvU3RyaW5nVGFnXTtcbiAgICAgICAgaWYgKGlzU3RyaW5nKHRvU3RyaW5nVGFnTmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0b1N0cmluZ1RhZ05hbWU7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbih4KSAmJiB4LnByb3RvdHlwZSAmJiBudWxsICE9IHgubmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHgubmFtZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGN0b3IgPSB4LmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oY3RvcikgJiYgY3RvciA9PT0gKE9iamVjdChjdG9yLnByb3RvdHlwZSkgYXMgb2JqZWN0KS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjdG9yLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgYXMgc3RyaW5nKS5zbGljZSg4LCAtMSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIGlucHV0IHZhbHVlcyBhcmUgc2FtZSB2YWx1ZS10eXBlLlxuICogQGphIOWFpeWKm+OBjOWQjOS4gOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBsaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICogQHBhcmFtIHJoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1lVHlwZShsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0eXBlb2YgbGhzID09PSB0eXBlb2YgcmhzO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBpbnB1dCB2YWx1ZXMgYXJlIHNhbWUgY2xhc3MuXG4gKiBAamEg5YWl5Yqb44GM5ZCM5LiA44Kv44Op44K544Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGxoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKiBAcGFyYW0gcmhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhbWVDbGFzcyhsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIGlmIChudWxsID09IGxocyAmJiBudWxsID09IHJocykge1xuICAgICAgICByZXR1cm4gY2xhc3NOYW1lKGxocykgPT09IGNsYXNzTmFtZShyaHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAobnVsbCAhPSBsaHMpICYmIChudWxsICE9IHJocykgJiYgKE9iamVjdC5nZXRQcm90b3R5cGVPZihsaHMpID09PSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocmhzKSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb21tb24gU3ltYmxlIGZvciBmcmFtZXdvcmsuXG4gKiBAamEg44OV44Os44O844Og44Ov44O844Kv44GM5YWx6YCa44Gn5L2/55So44GZ44KLIFN5bWJsZVxuICovXG5leHBvcnQgY29uc3QgJGNkcCA9IFN5bWJvbCgnQGNkcCcpO1xuIiwiaW1wb3J0IHtcbiAgICBUeXBlS2V5cyxcbiAgICBpc0FycmF5LFxuICAgIGV4aXN0cyxcbiAgICBjbGFzc05hbWUsXG59IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIEBlbiBUeXBlIHZlcmlmaWVyIGludGVyZmFjZSBkZWZpbml0aW9uLiA8YnI+XG4gKiAgICAgSWYgaW52YWxpZCB2YWx1ZSByZWNlaXZlZCwgdGhlIG1ldGhvZCB0aHJvd3MgYFR5cGVFcnJvcmAuXG4gKiBAamEg5Z6L5qSc6Ki844Gu44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pIDxicj5cbiAqICAgICDpgZXlj43jgZfjgZ/loLTlkIjjga8gYFR5cGVFcnJvcmAg44KS55m655SfXG4gKlxuICpcbiAqL1xuaW50ZXJmYWNlIFZlcmlmaWVyIHtcbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaXMgbm90IFtbTmlsXV0uXG4gICAgICogQGphIFtbTmlsXV0g44Gn44Gq44GE44GT44Go44KS5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm90TmlsLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIG5vdE5pbC5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgbm90TmlsOiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpcyBbW1R5cGVLZXlzXV0uXG4gICAgICogQGphIOaMh+WumuOBl+OBnyBbW1R5cGVLZXlzXV0g44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZU9mLnR5cGVcbiAgICAgKiAgLSBgZW5gIG9uZSBvZiBbW1R5cGVLZXlzXV1cbiAgICAgKiAgLSBgamFgIFtbVHlwZUtleXNdXSDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdHlwZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIHR5cGVPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgdHlwZU9mOiAodHlwZTogVHlwZUtleXMsIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaXMgYEFycmF5YC5cbiAgICAgKiBAamEgYEFycmF5YCDjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBhcnJheS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgYXJyYXk6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGlzIGBJdGVyYWJsZWAuXG4gICAgICogQGphIGBJdGVyYWJsZWAg44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlcmFibGUueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaXRlcmFibGUubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGl0ZXJhYmxlOiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpbnN0YW5jZSBpcyBlcXVhbCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3IuXG4gICAgICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OBruOCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGluc3RhbmNlT2YuY3RvclxuICAgICAqICAtIGBlbmAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDmr5TovIPlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gaW5zdGFuY2VPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBpbnN0YW5jZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBpbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaW5zdGFuY2UgaGFzIGBzdHJpY3RseWAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7ljrPlr4bkuIDoh7TjgZfjgZ/jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvd25JbnN0YW5jZU9mLmN0b3JcbiAgICAgKiAgLSBgZW5gIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5q+U6LyD5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIG93bkluc3RhbmNlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gb3duSW5zdGFuY2VPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgb3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGluc3RhbmNlIGhhcyBub3QgYHN0cmljdGx5YCBlcXVhbCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3IuXG4gICAgICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OCkuaMgeOBpOOCpOODs+OCueOCv+ODs+OCueOBp+OBquOBhOOBk+OBqOOCkuaknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIG5vdE93bkluc3RhbmNlT2YuY3RvclxuICAgICAqICAtIGBlbmAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDmr5TovIPlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gbm90T3duSW5zdGFuY2VPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBub3RPd25JbnN0YW5jZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBub3RPd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaGFzIHNwZWNpZmllZCBwcm9wZXJ0eS5cbiAgICAgKiBAamEg5oyH5a6a44OX44Ot44OR44OG44Kj44KS5oyB44Gj44Gm44GE44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkucHJvcFxuICAgICAqICAtIGBlbmAgc3BlY2lmaWVkIHByb3BlcnR5XG4gICAgICogIC0gYGphYCDlr77osaHjga7jg5fjg63jg5Hjg4bjgqNcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGhhc1Byb3BlcnR5OiAoeDogdW5rbm93biwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaGFzIG93biBzcGVjaWZpZWQgcHJvcGVydHkuXG4gICAgICogQGphIOaMh+WumuODl+ODreODkeODhuOCo+OCkuWFpeWKm+WApOiHqui6q+aMgeOBo+OBpuOBhOOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGhhc093blByb3BlcnR5LnByb3BcbiAgICAgKiAgLSBgZW5gIHNwZWNpZmllZCBwcm9wZXJ0eVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44OX44Ot44OR44OG44KjXG4gICAgICogQHBhcmFtIGhhc093blByb3BlcnR5LnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGhhc093blByb3BlcnR5Lm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBoYXNPd25Qcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xufVxuXG4vKipcbiAqIEBlbiBMaXN0IG9mIG1ldGhvZCBmb3IgdHlwZSB2ZXJpZnkuXG4gKiBAamEg5Z6L5qSc6Ki844GM5o+Q5L6b44GZ44KL44Oh44K944OD44OJ5LiA6KanXG4gKi9cbnR5cGUgVmVyaWZ5TWV0aG9kID0ga2V5b2YgVmVyaWZpZXI7XG5cbi8qKlxuICogQGVuIENvbmNyZXRlIHR5cGUgdmVyaWZpZXIgb2JqZWN0LlxuICogQGphIOWei+aknOiovOWun+ijheOCquODluOCuOOCp+OCr+ODiFxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5jb25zdCBfdmVyaWZpZXI6IFZlcmlmaWVyID0ge1xuICAgIG5vdE5pbDogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYSB2YWxpZCB2YWx1ZS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdHlwZU9mOiAodHlwZTogVHlwZUtleXMsIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiB4ICE9PSB0eXBlKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVHlwZSBvZiAke2NsYXNzTmFtZSh4KX0gaXMgbm90ICR7dHlwZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGFycmF5OiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAoIWlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGFuIEFycmF5LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBpdGVyYWJsZTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKCEoU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdCh4KSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGFuIGl0ZXJhYmxlIG9iamVjdC5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICghKHggaW5zdGFuY2VvZiBjdG9yKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYW4gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBvd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgIT09IE9iamVjdChjdG9yLnByb3RvdHlwZSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGlzIG5vdCBvd24gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBub3RPd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgIT0geCAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgPT09IE9iamVjdChjdG9yLnByb3RvdHlwZSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGlzIG93biBpbnN0YW5jZSBvZiAke2N0b3IubmFtZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGhhc1Byb3BlcnR5OiAoeDogYW55LCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4geyAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgaWYgKG51bGwgPT0geCB8fCAhKHByb3AgaW4geCkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGRvZXMgbm90IGhhdmUgcHJvcGVydHkgJHtTdHJpbmcocHJvcCl9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBoYXNPd25Qcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHggfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh4LCBwcm9wKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFRoZSBvYmplY3QgZG9lcyBub3QgaGF2ZSBvd24gcHJvcGVydHkgJHtTdHJpbmcocHJvcCl9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vKipcbiAqIEBlbiBWZXJpZnkgbWV0aG9kLlxuICogQGphIOaknOiovOODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBtZXRob2RcbiAqICAtIGBlbmAgbWV0aG9kIG5hbWUgd2hpY2ggdXNpbmdcbiAqICAtIGBqYWAg5L2/55So44GZ44KL44Oh44K944OD44OJ5ZCNXG4gKiBAcGFyYW0gYXJnc1xuICogIC0gYGVuYCBhcmd1bWVudHMgd2hpY2ggY29ycmVzcG9uZHMgdG8gdGhlIG1ldGhvZCBuYW1lXG4gKiAgLSBgamFgIOODoeOCveODg+ODieWQjeOBq+WvvuW/nOOBmeOCi+W8leaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gdmVyaWZ5PFRNZXRob2QgZXh0ZW5kcyBWZXJpZnlNZXRob2Q+KG1ldGhvZDogVE1ldGhvZCwgLi4uYXJnczogUGFyYW1ldGVyczxWZXJpZmllcltUTWV0aG9kXT4pOiB2b2lkIHwgbmV2ZXIge1xuICAgIChfdmVyaWZpZXJbbWV0aG9kXSBhcyBhbnkpKC4uLmFyZ3MpOyAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbn1cblxuZXhwb3J0IHsgdmVyaWZ5IGFzIGRlZmF1bHQgfTtcbiIsIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuaW1wb3J0IHtcbiAgICBUeXBlZEFycmF5LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNBcnJheSxcbiAgICBpc09iamVjdCxcbiAgICBpc0l0ZXJhYmxlLFxuICAgIGlzVHlwZWRBcnJheSxcbiAgICBzYW1lQ2xhc3MsXG59IGZyb20gJy4vdHlwZXMnO1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgZGVlcEVxdWFsKCkgKi9cbmZ1bmN0aW9uIGFycmF5RXF1YWwobGhzOiB1bmtub3duW10sIHJoczogdW5rbm93bltdKTogYm9vbGVhbiB7XG4gICAgY29uc3QgbGVuID0gbGhzLmxlbmd0aDtcbiAgICBpZiAobGVuICE9PSByaHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoIWRlZXBFcXVhbChsaHNbaV0sIHJoc1tpXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGRlZXBFcXVhbCgpICovXG5mdW5jdGlvbiBidWZmZXJFcXVhbChsaHM6IFNoYXJlZEFycmF5QnVmZmVyIHwgQXJyYXlCdWZmZXIsIHJoczogU2hhcmVkQXJyYXlCdWZmZXIgfCBBcnJheUJ1ZmZlcik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHNpemUgPSBsaHMuYnl0ZUxlbmd0aDtcbiAgICBpZiAoc2l6ZSAhPT0gcmhzLmJ5dGVMZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBsZXQgcG9zID0gMDtcbiAgICBpZiAoc2l6ZSAtIHBvcyA+PSA4KSB7XG4gICAgICAgIGNvbnN0IGxlbiA9IHNpemUgPj4+IDM7XG4gICAgICAgIGNvbnN0IGY2NEwgPSBuZXcgRmxvYXQ2NEFycmF5KGxocywgMCwgbGVuKTtcbiAgICAgICAgY29uc3QgZjY0UiA9IG5ldyBGbG9hdDY0QXJyYXkocmhzLCAwLCBsZW4pO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoIU9iamVjdC5pcyhmNjRMW2ldLCBmNjRSW2ldKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBwb3MgPSBsZW4gPDwgMztcbiAgICB9XG4gICAgaWYgKHBvcyA9PT0gc2l6ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY29uc3QgTCA9IG5ldyBEYXRhVmlldyhsaHMpO1xuICAgIGNvbnN0IFIgPSBuZXcgRGF0YVZpZXcocmhzKTtcbiAgICBpZiAoc2l6ZSAtIHBvcyA+PSA0KSB7XG4gICAgICAgIGlmICghT2JqZWN0LmlzKEwuZ2V0VWludDMyKHBvcyksIFIuZ2V0VWludDMyKHBvcykpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcG9zICs9IDQ7XG4gICAgfVxuICAgIGlmIChzaXplIC0gcG9zID49IDIpIHtcbiAgICAgICAgaWYgKCFPYmplY3QuaXMoTC5nZXRVaW50MTYocG9zKSwgUi5nZXRVaW50MTYocG9zKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwb3MgKz0gMjtcbiAgICB9XG4gICAgaWYgKHNpemUgPiBwb3MpIHtcbiAgICAgICAgaWYgKCFPYmplY3QuaXMoTC5nZXRVaW50OChwb3MpLCBSLmdldFVpbnQ4KHBvcykpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcG9zICs9IDE7XG4gICAgfVxuICAgIHJldHVybiBwb3MgPT09IHNpemU7XG59XG5cbi8qKlxuICogQGVuIFBlcmZvcm1zIGEgZGVlcCBjb21wYXJpc29uIGJldHdlZW4gdHdvIHZhbHVlcyB0byBkZXRlcm1pbmUgaWYgdGhleSBhcmUgZXF1aXZhbGVudC5cbiAqIEBqYSAy5YCk44Gu6Kmz57Sw5q+U6LyD44KS44GXLCDnrYnjgZfjgYTjgYvjganjgYbjgYvliKTlrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBFcXVhbChsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIGlmIChsaHMgPT09IHJocykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGlzRnVuY3Rpb24obGhzKSAmJiBpc0Z1bmN0aW9uKHJocykpIHtcbiAgICAgICAgcmV0dXJuIGxocy5sZW5ndGggPT09IHJocy5sZW5ndGggJiYgbGhzLm5hbWUgPT09IHJocy5uYW1lO1xuICAgIH1cbiAgICBpZiAoIWlzT2JqZWN0KGxocykgfHwgIWlzT2JqZWN0KHJocykpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB7IC8vIFByaW1pdGl2ZSBXcmFwcGVyIE9iamVjdHMgLyBEYXRlXG4gICAgICAgIGNvbnN0IHZhbHVlTCA9IGxocy52YWx1ZU9mKCk7XG4gICAgICAgIGNvbnN0IHZhbHVlUiA9IHJocy52YWx1ZU9mKCk7XG4gICAgICAgIGlmIChsaHMgIT09IHZhbHVlTCB8fCByaHMgIT09IHZhbHVlUikge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlTCA9PT0gdmFsdWVSO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gUmVnRXhwXG4gICAgICAgIGNvbnN0IGlzUmVnRXhwTCA9IGxocyBpbnN0YW5jZW9mIFJlZ0V4cDtcbiAgICAgICAgY29uc3QgaXNSZWdFeHBSID0gcmhzIGluc3RhbmNlb2YgUmVnRXhwO1xuICAgICAgICBpZiAoaXNSZWdFeHBMIHx8IGlzUmVnRXhwUikge1xuICAgICAgICAgICAgcmV0dXJuIGlzUmVnRXhwTCA9PT0gaXNSZWdFeHBSICYmIFN0cmluZyhsaHMpID09PSBTdHJpbmcocmhzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIEFycmF5XG4gICAgICAgIGNvbnN0IGlzQXJyYXlMID0gaXNBcnJheShsaHMpO1xuICAgICAgICBjb25zdCBpc0FycmF5UiA9IGlzQXJyYXkocmhzKTtcbiAgICAgICAgaWYgKGlzQXJyYXlMIHx8IGlzQXJyYXlSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNBcnJheUwgPT09IGlzQXJyYXlSICYmIGFycmF5RXF1YWwobGhzIGFzIGFueSwgcmhzIGFzIGFueSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBBcnJheUJ1ZmZlclxuICAgICAgICBjb25zdCBpc0J1ZmZlckwgPSBsaHMgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcjtcbiAgICAgICAgY29uc3QgaXNCdWZmZXJSID0gcmhzIGluc3RhbmNlb2YgQXJyYXlCdWZmZXI7XG4gICAgICAgIGlmIChpc0J1ZmZlckwgfHwgaXNCdWZmZXJSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNCdWZmZXJMID09PSBpc0J1ZmZlclIgJiYgYnVmZmVyRXF1YWwobGhzIGFzIGFueSwgcmhzIGFzIGFueSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBBcnJheUJ1ZmZlclZpZXdcbiAgICAgICAgY29uc3QgaXNCdWZmZXJWaWV3TCA9IEFycmF5QnVmZmVyLmlzVmlldyhsaHMpO1xuICAgICAgICBjb25zdCBpc0J1ZmZlclZpZXdSID0gQXJyYXlCdWZmZXIuaXNWaWV3KHJocyk7XG4gICAgICAgIGlmIChpc0J1ZmZlclZpZXdMIHx8IGlzQnVmZmVyVmlld1IpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0J1ZmZlclZpZXdMID09PSBpc0J1ZmZlclZpZXdSICYmIHNhbWVDbGFzcyhsaHMsIHJocylcbiAgICAgICAgICAgICAgICAmJiBidWZmZXJFcXVhbCgobGhzIGFzIEFycmF5QnVmZmVyVmlldykuYnVmZmVyLCAocmhzIGFzIEFycmF5QnVmZmVyVmlldykuYnVmZmVyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIG90aGVyIEl0ZXJhYmxlXG4gICAgICAgIGNvbnN0IGlzSXRlcmFibGVMID0gaXNJdGVyYWJsZShsaHMpO1xuICAgICAgICBjb25zdCBpc0l0ZXJhYmxlUiA9IGlzSXRlcmFibGUocmhzKTtcbiAgICAgICAgaWYgKGlzSXRlcmFibGVMIHx8IGlzSXRlcmFibGVSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNJdGVyYWJsZUwgPT09IGlzSXRlcmFibGVSICYmIGFycmF5RXF1YWwoWy4uLihsaHMgYXMgYW55KV0sIFsuLi4ocmhzIGFzIGFueSldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoc2FtZUNsYXNzKGxocywgcmhzKSkge1xuICAgICAgICBjb25zdCBrZXlzTCA9IG5ldyBTZXQoT2JqZWN0LmtleXMobGhzKSk7XG4gICAgICAgIGNvbnN0IGtleXNSID0gbmV3IFNldChPYmplY3Qua2V5cyhyaHMpKTtcbiAgICAgICAgaWYgKGtleXNMLnNpemUgIT09IGtleXNSLnNpemUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzTCkge1xuICAgICAgICAgICAgaWYgKCFrZXlzUi5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzTCkge1xuICAgICAgICAgICAgaWYgKCFkZWVwRXF1YWwobGhzW2tleV0sIHJoc1trZXldKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIGxocykge1xuICAgICAgICAgICAgaWYgKCEoa2V5IGluIHJocykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qga2V5cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiByaHMpIHtcbiAgICAgICAgICAgIGlmICghKGtleSBpbiBsaHMpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAga2V5cy5hZGQoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzKSB7XG4gICAgICAgICAgICBpZiAoIWRlZXBFcXVhbChsaHNba2V5XSwgcmhzW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBSZWdFeHAgKi9cbmZ1bmN0aW9uIGNsb25lUmVnRXhwKHJlZ2V4cDogUmVnRXhwKTogUmVnRXhwIHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgUmVnRXhwKHJlZ2V4cC5zb3VyY2UsIHJlZ2V4cC5mbGFncyk7XG4gICAgcmVzdWx0Lmxhc3RJbmRleCA9IHJlZ2V4cC5sYXN0SW5kZXg7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBBcnJheUJ1ZmZlciAqL1xuZnVuY3Rpb24gY2xvbmVBcnJheUJ1ZmZlcihhcnJheUJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBBcnJheUJ1ZmZlciB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IEFycmF5QnVmZmVyKGFycmF5QnVmZmVyLmJ5dGVMZW5ndGgpO1xuICAgIG5ldyBVaW50OEFycmF5KHJlc3VsdCkuc2V0KG5ldyBVaW50OEFycmF5KGFycmF5QnVmZmVyKSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBEYXRhVmlldyAqL1xuZnVuY3Rpb24gY2xvbmVEYXRhVmlldyhkYXRhVmlldzogRGF0YVZpZXcpOiBEYXRhVmlldyB7XG4gICAgY29uc3QgYnVmZmVyID0gY2xvbmVBcnJheUJ1ZmZlcihkYXRhVmlldy5idWZmZXIpO1xuICAgIHJldHVybiBuZXcgRGF0YVZpZXcoYnVmZmVyLCBkYXRhVmlldy5ieXRlT2Zmc2V0LCBkYXRhVmlldy5ieXRlTGVuZ3RoKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBUeXBlZEFycmF5ICovXG5mdW5jdGlvbiBjbG9uZVR5cGVkQXJyYXk8VCBleHRlbmRzIFR5cGVkQXJyYXk+KHR5cGVkQXJyYXk6IFQpOiBUIHtcbiAgICBjb25zdCBidWZmZXIgPSBjbG9uZUFycmF5QnVmZmVyKHR5cGVkQXJyYXkuYnVmZmVyKTtcbiAgICByZXR1cm4gbmV3ICh0eXBlZEFycmF5IGFzIGFueSkuY29uc3RydWN0b3IoYnVmZmVyLCB0eXBlZEFycmF5LmJ5dGVPZmZzZXQsIHR5cGVkQXJyYXkubGVuZ3RoKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjaGVjayBuZWNlc3NhcnkgdG8gdXBkYXRlICovXG5mdW5jdGlvbiBuZWVkVXBkYXRlKG9sZFZhbHVlOiB1bmtub3duLCBuZXdWYWx1ZTogdW5rbm93biwgZXhjZXB0VW5kZWZpbmVkOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgaWYgKG9sZFZhbHVlICE9PSBuZXdWYWx1ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKGV4Y2VwdFVuZGVmaW5lZCAmJiB1bmRlZmluZWQgPT09IG9sZFZhbHVlKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgbWVyZ2UgQXJyYXkgKi9cbmZ1bmN0aW9uIG1lcmdlQXJyYXkodGFyZ2V0OiBhbnlbXSwgc291cmNlOiBhbnlbXSk6IGFueVtdIHtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gc291cmNlLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0W2ldO1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1lcmdlKG9sZFZhbHVlLCBzb3VyY2VbaV0pO1xuICAgICAgICAhbmVlZFVwZGF0ZShvbGRWYWx1ZSwgbmV3VmFsdWUsIGZhbHNlKSB8fCAodGFyZ2V0W2ldID0gbmV3VmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG4vKiogQGludGVybmFsIG1lcmdlIFNldCAqL1xuZnVuY3Rpb24gbWVyZ2VTZXQodGFyZ2V0OiBTZXQ8YW55Piwgc291cmNlOiBTZXQ8YW55Pik6IFNldDxhbnk+IHtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygc291cmNlKSB7XG4gICAgICAgIHRhcmdldC5oYXMoaXRlbSkgfHwgdGFyZ2V0LmFkZChtZXJnZSh1bmRlZmluZWQsIGl0ZW0pKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuLyoqIEBpbnRlcm5hbCBtZXJnZSBNYXAgKi9cbmZ1bmN0aW9uIG1lcmdlTWFwKHRhcmdldDogTWFwPGFueSwgYW55Piwgc291cmNlOiBNYXA8YW55LCBhbnk+KTogTWFwPGFueSwgYW55PiB7XG4gICAgZm9yIChjb25zdCBbaywgdl0gb2Ygc291cmNlKSB7XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0LmdldChrKTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBtZXJnZShvbGRWYWx1ZSwgdik7XG4gICAgICAgICFuZWVkVXBkYXRlKG9sZFZhbHVlLCBuZXdWYWx1ZSwgZmFsc2UpIHx8IHRhcmdldC5zZXQoaywgbmV3VmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgZGVlcE1lcmdlKCkgKi9cbmZ1bmN0aW9uIG1lcmdlKHRhcmdldDogdW5rbm93biwgc291cmNlOiB1bmtub3duKTogYW55IHtcbiAgICBpZiAodW5kZWZpbmVkID09PSBzb3VyY2UgfHwgdGFyZ2V0ID09PSBzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG4gICAgaWYgKCFpc09iamVjdChzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgfVxuICAgIC8vIFByaW1pdGl2ZSBXcmFwcGVyIE9iamVjdHMgLyBEYXRlXG4gICAgaWYgKHNvdXJjZS52YWx1ZU9mKCkgIT09IHNvdXJjZSkge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IG5ldyAoc291cmNlIGFzIGFueSkuY29uc3RydWN0b3Ioc291cmNlLnZhbHVlT2YoKSk7XG4gICAgfVxuICAgIC8vIFJlZ0V4cFxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgcmV0dXJuIGRlZXBFcXVhbCh0YXJnZXQsIHNvdXJjZSkgPyB0YXJnZXQgOiBjbG9uZVJlZ0V4cChzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBBcnJheUJ1ZmZlclxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IGNsb25lQXJyYXlCdWZmZXIoc291cmNlKTtcbiAgICB9XG4gICAgLy8gQXJyYXlCdWZmZXJWaWV3XG4gICAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBkZWVwRXF1YWwodGFyZ2V0LCBzb3VyY2UpID8gdGFyZ2V0IDogaXNUeXBlZEFycmF5KHNvdXJjZSkgPyBjbG9uZVR5cGVkQXJyYXkoc291cmNlKSA6IGNsb25lRGF0YVZpZXcoc291cmNlIGFzIERhdGFWaWV3KTtcbiAgICB9XG4gICAgLy8gQXJyYXlcbiAgICBpZiAoQXJyYXkuaXNBcnJheShzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBtZXJnZUFycmF5KGlzQXJyYXkodGFyZ2V0KSA/IHRhcmdldCA6IFtdLCBzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBTZXRcbiAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgU2V0KSB7XG4gICAgICAgIHJldHVybiBtZXJnZVNldCh0YXJnZXQgaW5zdGFuY2VvZiBTZXQgPyB0YXJnZXQgOiBuZXcgU2V0KCksIHNvdXJjZSk7XG4gICAgfVxuICAgIC8vIE1hcFxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgICAgcmV0dXJuIG1lcmdlTWFwKHRhcmdldCBpbnN0YW5jZW9mIE1hcCA/IHRhcmdldCA6IG5ldyBNYXAoKSwgc291cmNlKTtcbiAgICB9XG5cbiAgICBjb25zdCBvYmogPSBpc09iamVjdCh0YXJnZXQpID8gdGFyZ2V0IDoge307XG4gICAgaWYgKHNhbWVDbGFzcyh0YXJnZXQsIHNvdXJjZSkpIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc291cmNlKSkge1xuICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBvYmpba2V5XTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWVyZ2Uob2xkVmFsdWUsIHNvdXJjZVtrZXldKTtcbiAgICAgICAgICAgICFuZWVkVXBkYXRlKG9sZFZhbHVlLCBuZXdWYWx1ZSwgdHJ1ZSkgfHwgKG9ialtrZXldID0gbmV3VmFsdWUpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IG9ialtrZXldO1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBtZXJnZShvbGRWYWx1ZSwgc291cmNlW2tleV0pO1xuICAgICAgICAgICAgIW5lZWRVcGRhdGUob2xkVmFsdWUsIG5ld1ZhbHVlLCB0cnVlKSB8fCAob2JqW2tleV0gPSBuZXdWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBAZW4gUmVjdXJzaXZlbHkgbWVyZ2VzIG93biBhbmQgaW5oZXJpdGVkIGVudW1lcmFibGUgc3RyaW5nIGtleWVkIHByb3BlcnRpZXMgb2Ygc291cmNlIG9iamVjdHMgaW50byB0aGUgZGVzdGluYXRpb24gb2JqZWN0LlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBruWGjeW4sOeahOODnuODvOOCuOOCkuWun+ihjFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVlcE1lcmdlPFQsIFMxLCBTMiwgUzMsIFM0LCBTNSwgUzYsIFM3LCBTOCwgUzk+KFxuICAgIHRhcmdldDogVCxcbiAgICAuLi5zb3VyY2VzOiBbUzEsIFMyPywgUzM/LCBTND8sIFM1PywgUzY/LCBTNz8sIFM4PywgUzk/LCAuLi5hbnlbXV1cbik6IFQgJiBTMSAmIFMyICYgUzMgJiBTNCAmIFM1ICYgUzYgJiBTNyAmIFM4ICYgUzk7XG5leHBvcnQgZnVuY3Rpb24gZGVlcE1lcmdlPFg+KHRhcmdldDogYW55LCAuLi5zb3VyY2VzOiBhbnlbXSk6IFg7XG5leHBvcnQgZnVuY3Rpb24gZGVlcE1lcmdlKHRhcmdldDogYW55LCAuLi5zb3VyY2VzOiBhbnlbXSk6IGFueSB7XG4gICAgbGV0IHJlc3VsdCA9IHRhcmdldDtcbiAgICBmb3IgKGNvbnN0IHNvdXJjZSBvZiBzb3VyY2VzKSB7XG4gICAgICAgIHJlc3VsdCA9IG1lcmdlKHJlc3VsdCwgc291cmNlKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENyZWF0ZSBkZWVwIGNvcHkgaW5zdGFuY2Ugb2Ygc291cmNlIG9iamVjdC5cbiAqIEBqYSDjg4fjgqPjg7zjg5fjgrPjg5Tjg7zjgqrjg5bjgrjjgqfjgq/jg4jjga7nlJ/miJBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBDb3B5PFQ+KHNyYzogVCk6IFQge1xuICAgIHJldHVybiBkZWVwTWVyZ2UodW5kZWZpbmVkLCBzcmMpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5pbXBvcnQge1xuICAgIE5pbCxcbiAgICBUeXBlLFxuICAgIENsYXNzLFxuICAgIENvbnN0cnVjdG9yLFxufSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBAZW4gTWl4aW4gY2xhc3MncyBiYXNlIGludGVyZmFjZS5cbiAqIEBqYSBNaXhpbiDjgq/jg6njgrnjga7ln7rlupXjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqlcbiAqL1xuZXhwb3J0IGRlY2xhcmUgY2xhc3MgTWl4aW5DbGFzcyB7XG4gICAgLyoqXG4gICAgICogQGVuIGNhbGwgbWl4aW4gc291cmNlIGNsYXNzJ3MgYHN1cGVyKClgLiA8YnI+XG4gICAgICogICAgIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBjYWxsZWQgZnJvbSBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEgTWl4aW4g44Kv44Op44K544Gu5Z+65bqV44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pIDxicj5cbiAgICAgKiAgICAg44Kz44Oz44K544OI44Op44Kv44K/44GL44KJ5ZG844G244GT44Go44KS5oOz5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3JjQ2xhc3NcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiB0YXJnZXQgY2xhc3MgbmFtZS4gZXgpIGZyb20gUzEgYXZhaWxhYmxlXG4gICAgICogIC0gYGphYCDjgrPjg7Pjgrnjg4jjg6njgq/jg4jjgZnjgovjgq/jg6njgrnlkI3jgpLmjIflrpogZXgpIFMxIOOBi+OCieaMh+WumuWPr+iDvVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gcGFyYW1ldGVyc1xuICAgICAqICAtIGBqYWAg44Kz44Oz44K544OI44Op44Kv44OI44Gr5L2/55So44GZ44KL5byV5pWwXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHN1cGVyPFQgZXh0ZW5kcyBDbGFzcz4oc3JjQ2xhc3M6IFQsIC4uLmFyZ3M6IENvbnN0cnVjdG9yUGFyYW1ldGVyczxUPik6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIGlucHV0IGNsYXNzIGlzIG1peGluZWQgKGV4Y2x1ZGluZyBvd24gY2xhc3MpLlxuICAgICAqIEBqYSDmjIflrprjgq/jg6njgrnjgYwgTWl4aW4g44GV44KM44Gm44GE44KL44GL56K66KqNICjoh6rouqvjga7jgq/jg6njgrnjga/lkKvjgb7jgozjgarjgYQpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWl4ZWRDbGFzc1xuICAgICAqICAtIGBlbmAgc2V0IHRhcmdldCBjbGFzcyBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5a++6LGh44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGlzTWl4ZWRXaXRoPFQ+KG1peGVkQ2xhc3M6IENvbnN0cnVjdG9yPFQ+KTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZW4gTWl4ZWQgc3ViIGNsYXNzIGNvbnN0cnVjdG9yIGRlZmluaXRpb25zLlxuICogQGphIOWQiOaIkOOBl+OBn+OCteODluOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1peGluQ29uc3RydWN0b3I8QiBleHRlbmRzIENsYXNzLCBVPiBleHRlbmRzIFR5cGU8VT4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBjb25zdHJ1Y3RvclxuICAgICAqIEBqYSDjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBiYXNlIGNsYXNzIGFyZ3VtZW50c1xuICAgICAqICAtIGBqYWAg5Z+65bqV44Kv44Op44K544Gr5oyH5a6a44GX44Gf5byV5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHVuaW9uIHR5cGUgb2YgY2xhc3NlcyB3aGVuIGNhbGxpbmcgW1ttaXhpbnNdXSgpXG4gICAgICogIC0gYGphYCBbW21peGluc11dKCkg44Gr5rih44GX44Gf44Kv44Op44K544Gu6ZuG5ZCIXG4gICAgICovXG4gICAgbmV3KC4uLmFyZ3M6IENvbnN0cnVjdG9yUGFyYW1ldGVyczxCPik6IFU7XG59XG5cbi8qKlxuICogQGVuIERlZmluaXRpb24gb2YgW1tzZXRNaXhDbGFzc0F0dHJpYnV0ZV1dIGZ1bmN0aW9uJ3MgYXJndW1lbnRzLlxuICogQGphIFtbc2V0TWl4Q2xhc3NBdHRyaWJ1dGVdXSDjga7lj5bjgorjgYbjgovlvJXmlbDlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNaXhDbGFzc0F0dHJpYnV0ZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFN1cHByZXNzIHByb3ZpZGluZyBjb25zdHJ1Y3Rvci10cmFwIGZvciB0aGUgbWl4aW4gc291cmNlIGNsYXNzLiBJbiB0aGlzIGNhc2UsIGBpc01peGVkV2l0aGAsIGBpbnN0YW5jZW9mYCBhbHNvIGJlY29tZXMgaW52YWxpZC4gKGZvciBpbXByb3ZpbmcgcGVyZm9ybWFuY2UpXG4gICAgICogQGphIE1peGluIFNvdXJjZSDjgq/jg6njgrnjgavlr77jgZfjgaYsIOOCs+ODs+OCueODiOODqeOCr+OCv+ODiOODqeODg+ODl+OCkuaKkeatoi4g44GT44KM44KS5oyH5a6a44GX44Gf5aC05ZCILCBgaXNNaXhlZFdpdGhgLCBgaW5zdGFuY2VvZmAg44KC54Sh5Yq544Gr44Gq44KLLiAo44OR44OV44Kp44O844Oe44Oz44K55pS55ZaEKVxuICAgICAqL1xuICAgIHByb3RvRXh0ZW5kc09ubHk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0dXAgW1N5bWJvbC5oYXNJbnN0YW5jZV0gcHJvcGVydHkuIDxicj5cbiAgICAgKiAgICAgVGhlIGNsYXNzIGRlc2lnbmF0ZWQgYXMgYSBzb3VyY2Ugb2YgW1ttaXhpbnNdXSgpIGhhcyBbU3ltYm9sLmhhc0luc3RhbmNlXSBwcm9wZXJ0eSBpbXBsaWNpdGx5LiA8YnI+XG4gICAgICogICAgIEl0J3MgdXNlZCB0byBhdm9pZCBiZWNvbWluZyB0aGUgYmVoYXZpb3IgYGluc3RhbmNlb2ZgIGRvZXNuJ3QgaW50ZW5kIHdoZW4gdGhlIGNsYXNzIGlzIGV4dGVuZGVkIGZyb20gdGhlIG1peGluZWQgY2xhc3MgdGhlIG90aGVyIHBsYWNlLlxuICAgICAqIEBqYSBbU3ltYm9sLmhhc0luc3RhbmNlXSDjg5fjg63jg5Hjg4bjgqPoqK3lrpo8YnI+XG4gICAgICogICAgIFtbbWl4aW5zXV0oKSDjga7jgr3jg7zjgrnjgavmjIflrprjgZXjgozjgZ/jgq/jg6njgrnjga8gW1N5bWJvbC5oYXNJbnN0YW5jZV0g44KS5pqX6buZ55qE44Gr5YKZ44GI44KL44Gf44KBPGJyPlxuICAgICAqICAgICDjgZ3jga7jgq/jg6njgrnjgYzku5bjgafntpnmib/jgZXjgozjgabjgYTjgovloLTlkIggYGluc3RhbmNlb2ZgIOOBjOaEj+Wbs+OBl+OBquOBhOaMr+OCi+iInuOBhOOBqOOBquOCi+OBruOCkumBv+OBkeOCi+OBn+OCgeOBq+S9v+eUqOOBmeOCiy5cbiAgICAgKi9cbiAgICBpbnN0YW5jZU9mOiAoKGluc3Q6IG9iamVjdCkgPT4gYm9vbGVhbikgfCBOaWw7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG5jb25zdCBfb2JqUHJvdG90eXBlICAgICA9IE9iamVjdC5wcm90b3R5cGU7XG5jb25zdCBfaW5zdGFuY2VPZiAgICAgICA9IEZ1bmN0aW9uLnByb3RvdHlwZVtTeW1ib2wuaGFzSW5zdGFuY2VdO1xuY29uc3QgX292ZXJyaWRlICAgICAgICAgPSBTeW1ib2woJ292ZXJyaWRlJyk7XG5jb25zdCBfaXNJbmhlcml0ZWQgICAgICA9IFN5bWJvbCgnaXNJbmhlcml0ZWQnKTtcbmNvbnN0IF9jb25zdHJ1Y3RvcnMgICAgID0gU3ltYm9sKCdjb25zdHJ1Y3RvcnMnKTtcbmNvbnN0IF9jbGFzc0Jhc2UgICAgICAgID0gU3ltYm9sKCdjbGFzc0Jhc2UnKTtcbmNvbnN0IF9jbGFzc1NvdXJjZXMgICAgID0gU3ltYm9sKCdjbGFzc1NvdXJjZXMnKTtcbmNvbnN0IF9wcm90b0V4dGVuZHNPbmx5ID0gU3ltYm9sKCdwcm90b0V4dGVuZHNPbmx5Jyk7XG5cbi8vIGNvcHkgcHJvcGVydGllcyBjb3JlXG5mdW5jdGlvbiByZWZsZWN0UHJvcGVydGllcyh0YXJnZXQ6IG9iamVjdCwgc291cmNlOiBvYmplY3QsIGtleTogc3RyaW5nIHwgc3ltYm9sKTogdm9pZCB7XG4gICAgaWYgKG51bGwgPT0gdGFyZ2V0W2tleV0pIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNvdXJjZSwga2V5KSBhcyBQcm9wZXJ0eURlY29yYXRvcik7XG4gICAgfVxufVxuXG4vLyBvYmplY3QgcHJvcGVydGllcyBjb3B5IG1ldGhvZFxuZnVuY3Rpb24gY29weVByb3BlcnRpZXModGFyZ2V0OiBvYmplY3QsIHNvdXJjZTogb2JqZWN0KTogdm9pZCB7XG4gICAgc291cmNlICYmIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHNvdXJjZSlcbiAgICAgICAgLmZpbHRlcihrZXkgPT4gIS8ocHJvdG90eXBlfG5hbWV8Y29uc3RydWN0b3IpLy50ZXN0KGtleSkpXG4gICAgICAgIC5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICByZWZsZWN0UHJvcGVydGllcyh0YXJnZXQsIHNvdXJjZSwga2V5KTtcbiAgICAgICAgfSk7XG4gICAgc291cmNlICYmIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoc291cmNlKVxuICAgICAgICAuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgcmVmbGVjdFByb3BlcnRpZXModGFyZ2V0LCBzb3VyY2UsIGtleSk7XG4gICAgICAgIH0pO1xufVxuXG4vLyBoZWxwZXIgZm9yIHNldE1peENsYXNzQXR0cmlidXRlKHRhcmdldCwgJ2luc3RhbmNlT2YnKVxuZnVuY3Rpb24gc2V0SW5zdGFuY2VPZjxUIGV4dGVuZHMge30+KHRhcmdldDogQ29uc3RydWN0b3I8VD4sIG1ldGhvZDogKChpbnN0OiBvYmplY3QpID0+IGJvb2xlYW4pIHwgTmlsKTogdm9pZCB7XG4gICAgY29uc3QgYmVoYXZpb3VyID0gbWV0aG9kIHx8IChudWxsID09PSBtZXRob2QgPyB1bmRlZmluZWQgOiAoKGk6IG9iamVjdCkgPT4gT2JqZWN0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mLmNhbGwodGFyZ2V0LnByb3RvdHlwZSwgaSkpKTtcbiAgICBjb25zdCBhcHBsaWVkID0gYmVoYXZpb3VyICYmIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBfb3ZlcnJpZGUpO1xuICAgIGlmICghYXBwbGllZCkge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHtcbiAgICAgICAgICAgIFtTeW1ib2wuaGFzSW5zdGFuY2VdOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGJlaGF2aW91cixcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBbX292ZXJyaWRlXToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBiZWhhdmlvdXIgPyB0cnVlIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBTZXQgdGhlIE1peGluIGNsYXNzIGF0dHJpYnV0ZS5cbiAqIEBqYSBNaXhpbiDjgq/jg6njgrnjgavlr77jgZfjgablsZ7mgKfjgpLoqK3lrppcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIC8vICdwcm90b0V4dGVuZE9ubHknXG4gKiBjbGFzcyBCYXNlIHsgY29uc3RydWN0b3IoYSwgYikge30gfTtcbiAqIGNsYXNzIE1peEEgeyB9O1xuICogc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoTWl4QSwgJ3Byb3RvRXh0ZW5kc09ubHknKTsgIC8vIGZvciBpbXByb3ZpbmcgY29uc3RydWN0aW9uIHBlcmZvcm1hbmNlXG4gKiBjbGFzcyBNaXhCIHsgY29uc3RydWN0b3IoYywgZCkge30gfTtcbiAqXG4gKiBjbGFzcyBNaXhpbkNsYXNzIGV4dGVuZHMgbWl4aW5zKEJhc2UsIE1peEEsIE1peEIpIHtcbiAqICAgICBjb25zdHJ1Y3RvcihhLCBiLCBjLCBkKXtcbiAqICAgICAgICAgLy8gY2FsbGluZyBgQmFzZWAgY29uc3RydWN0b3JcbiAqICAgICAgICAgc3VwZXIoYSwgYik7XG4gKlxuICogICAgICAgICAvLyBjYWxsaW5nIE1peGluIGNsYXNzJ3MgY29uc3RydWN0b3JcbiAqICAgICAgICAgdGhpcy5zdXBlcihNaXhBKTsgICAgICAgIC8vIG5vIGFmZmVjdFxuICogICAgICAgICB0aGlzLnN1cGVyKE1peEIsIGMsIGQpO1xuICogICAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBtaXhlZCA9IG5ldyBNaXhpbkNsYXNzKCk7XG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE1peEEpOyAgICAvLyBmYWxzZVxuICogY29uc29sZS5sb2cobWl4ZWQuaXNNaXhlZFdpdGgoTWl4QSkpOyAgLy8gZmFsc2VcbiAqXG4gKiAvLyAnaW5zdGFuY2VPZidcbiAqIGNsYXNzIEJhc2Uge307XG4gKiBjbGFzcyBTb3VyY2Uge307XG4gKiBjbGFzcyBNaXhpbkNsYXNzIGV4dGVuZHMgbWl4aW5zKEJhc2UsIFNvdXJjZSkge307XG4gKlxuICogY2xhc3MgT3RoZXIgZXh0ZW5kcyBTb3VyY2Uge307XG4gKlxuICogY29uc3QgbWl4ZWQgPSBuZXcgTWl4aW5DbGFzcygpO1xuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBNaXhpbkNsYXNzKTsgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBCYXNlKTsgICAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBTb3VyY2UpOyAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBPdGhlcik7ICAgICAgICAgLy8gdHJ1ZSA/Pz9cbiAqXG4gKiBzZXRNaXhDbGFzc0F0dHJpYnV0ZShPdGhlciwgJ2luc3RhbmNlT2YnKTsgLy8gb3Igc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoT3RoZXIsICdpbnN0YW5jZU9mJywgbnVsbCk7XG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyBmYWxzZSAhXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHNldCB0YXJnZXQgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg6Kit5a6a5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcGFyYW0gYXR0clxuICogIC0gYGVuYDpcbiAqICAgIC0gYHByb3RvRXh0ZW5kc09ubHlgOiBTdXBwcmVzcyBwcm92aWRpbmcgY29uc3RydWN0b3ItdHJhcCBmb3IgdGhlIG1peGluIHNvdXJjZSBjbGFzcy4gKGZvciBpbXByb3ZpbmcgcGVyZm9ybWFuY2UpXG4gKiAgICAtIGBpbnN0YW5jZU9mYCAgICAgIDogZnVuY3Rpb24gYnkgdXNpbmcgW1N5bWJvbC5oYXNJbnN0YW5jZV0gPGJyPlxuICogICAgICAgICAgICAgICAgICAgICAgICAgIERlZmF1bHQgYmVoYXZpb3VyIGlzIGB7IHJldHVybiB0YXJnZXQucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5zdGFuY2UpIH1gXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgSWYgc2V0IGBudWxsYCwgZGVsZXRlIFtTeW1ib2wuaGFzSW5zdGFuY2VdIHByb3BlcnR5LlxuICogIC0gYGphYDpcbiAqICAgIC0gYHByb3RvRXh0ZW5kc09ubHlgOiBNaXhpbiBTb3VyY2Ug44Kv44Op44K544Gr5a++44GX44GmLCDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jg4jjg6njg4Pjg5fjgpLmipHmraIgKOODkeODleOCqeODvOODnuODs+OCueaUueWWhClcbiAqICAgIC0gYGluc3RhbmNlT2ZgICAgICAgOiBbU3ltYm9sLmhhc0luc3RhbmNlXSDjgYzkvb/nlKjjgZnjgovplqLmlbDjgpLmjIflrpogPGJyPlxuICogICAgICAgICAgICAgICAgICAgICAgICAgIOaXouWumuOBp+OBryBgeyByZXR1cm4gdGFyZ2V0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGluc3RhbmNlKSB9YCDjgYzkvb/nlKjjgZXjgozjgotcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIGBudWxsYCDmjIflrprjgpLjgZnjgovjgaggW1N5bWJvbC5oYXNJbnN0YW5jZV0g44OX44Ot44OR44OG44Kj44KS5YmK6Zmk44GZ44KLXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRNaXhDbGFzc0F0dHJpYnV0ZTxUIGV4dGVuZHMge30sIFUgZXh0ZW5kcyBrZXlvZiBNaXhDbGFzc0F0dHJpYnV0ZT4oXG4gICAgdGFyZ2V0OiBDb25zdHJ1Y3RvcjxUPixcbiAgICBhdHRyOiBVLFxuICAgIG1ldGhvZD86IE1peENsYXNzQXR0cmlidXRlW1VdXG4pOiB2b2lkIHtcbiAgICBzd2l0Y2ggKGF0dHIpIHtcbiAgICAgICAgY2FzZSAncHJvdG9FeHRlbmRzT25seSc6XG4gICAgICAgICAgICB0YXJnZXRbX3Byb3RvRXh0ZW5kc09ubHldID0gdHJ1ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdpbnN0YW5jZU9mJzpcbiAgICAgICAgICAgIHNldEluc3RhbmNlT2YodGFyZ2V0LCBtZXRob2QpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIE1peGluIGZ1bmN0aW9uIGZvciBtdWx0aXBsZSBpbmhlcml0YW5jZS4gPGJyPlxuICogICAgIFJlc29sdmluZyB0eXBlIHN1cHBvcnQgZm9yIG1heGltdW0gMTAgY2xhc3Nlcy5cbiAqIEBqYSDlpJrph43ntpnmib/jga7jgZ/jgoHjga4gTWl4aW4gPGJyPlxuICogICAgIOacgOWkpyAxMCDjgq/jg6njgrnjga7lnovop6PmsbrjgpLjgrXjg53jg7zjg4hcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNsYXNzIEJhc2UgeyBjb25zdHJ1Y3RvcihhLCBiKSB7fSB9O1xuICogY2xhc3MgTWl4QSB7IGNvbnN0cnVjdG9yKGEsIGIpIHt9IH07XG4gKiBjbGFzcyBNaXhCIHsgY29uc3RydWN0b3IoYywgZCkge30gfTtcbiAqXG4gKiBjbGFzcyBNaXhpbkNsYXNzIGV4dGVuZHMgbWl4aW5zKEJhc2UsIE1peEEsIE1peEIpIHtcbiAqICAgICBjb25zdHJ1Y3RvcihhLCBiLCBjLCBkKXtcbiAqICAgICAgICAgLy8gY2FsbGluZyBgQmFzZWAgY29uc3RydWN0b3JcbiAqICAgICAgICAgc3VwZXIoYSwgYik7XG4gKlxuICogICAgICAgICAvLyBjYWxsaW5nIE1peGluIGNsYXNzJ3MgY29uc3RydWN0b3JcbiAqICAgICAgICAgdGhpcy5zdXBlcihNaXhBLCBhLCBiKTtcbiAqICAgICAgICAgdGhpcy5zdXBlcihNaXhCLCBjLCBkKTtcbiAqICAgICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYmFzZVxuICogIC0gYGVuYCBwcmltYXJ5IGJhc2UgY2xhc3MuIHN1cGVyKGFyZ3MpIGlzIHRoaXMgY2xhc3MncyBvbmUuXG4gKiAgLSBgamFgIOWfuuW6leOCr+ODqeOCueOCs+ODs+OCueODiOODqeOCr+OCvy4g5ZCM5ZCN44OX44Ot44OR44OG44KjLCDjg6Hjgr3jg4Pjg4njga/mnIDlhKrlhYjjgZXjgozjgosuIHN1cGVyKGFyZ3MpIOOBr+OBk+OBruOCr+ODqeOCueOBruOCguOBruOBjOaMh+WumuWPr+iDvS5cbiAqIEBwYXJhbSBzb3VyY2VzXG4gKiAgLSBgZW5gIG11bHRpcGxlIGV4dGVuZHMgY2xhc3NcbiAqICAtIGBqYWAg5ouh5by144Kv44Op44K544Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBtaXhpbmVkIGNsYXNzIGNvbnN0cnVjdG9yXG4gKiAgLSBgamFgIOWQiOaIkOOBleOCjOOBn+OCr+ODqeOCueOCs+ODs+OCueODiOODqeOCr+OCv1xuICovXG5leHBvcnQgZnVuY3Rpb24gbWl4aW5zPEIgZXh0ZW5kcyBDbGFzcywgUzEsIFMyLCBTMywgUzQsIFM1LCBTNiwgUzcsIFM4LCBTOT4oXG4gICAgYmFzZTogQixcbiAgICAuLi5zb3VyY2VzOiBbXG4gICAgICAgIENvbnN0cnVjdG9yPFMxPixcbiAgICAgICAgQ29uc3RydWN0b3I8UzI+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8UzM+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8UzQ+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8UzU+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8UzY+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8Uzc+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8Uzg+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8Uzk+PyxcbiAgICAgICAgLi4uYW55W11cbiAgICBdKTogTWl4aW5Db25zdHJ1Y3RvcjxCLCBNaXhpbkNsYXNzICYgSW5zdGFuY2VUeXBlPEI+ICYgUzEgJiBTMiAmIFMzICYgUzQgJiBTNSAmIFM2ICYgUzcgJiBTOCAmIFM5PiB7XG5cbiAgICBsZXQgX2hhc1NvdXJjZUNvbnN0cnVjdG9yID0gZmFsc2U7XG5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L2NsYXNzLW5hbWUtY2FzaW5nXG4gICAgY2xhc3MgX01peGluQmFzZSBleHRlbmRzIChiYXNlIGFzIGFueSBhcyBDb25zdHJ1Y3RvcjxNaXhpbkNsYXNzPikge1xuXG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgW19jb25zdHJ1Y3RvcnNdOiBNYXA8Q29uc3RydWN0b3I8YW55PiwgRnVuY3Rpb24gfCBudWxsPjtcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBbX2NsYXNzQmFzZV06IENvbnN0cnVjdG9yPGFueT47XG5cbiAgICAgICAgY29uc3RydWN0b3IoLi4uYXJnczogYW55W10pIHtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjb25zdHJ1Y3Rvci1zdXBlclxuICAgICAgICAgICAgc3VwZXIoLi4uYXJncyk7XG5cbiAgICAgICAgICAgIGNvbnN0IGNvbnN0cnVjdG9ycyA9IG5ldyBNYXA8Q29uc3RydWN0b3I8YW55PiwgRnVuY3Rpb24+KCk7XG4gICAgICAgICAgICB0aGlzW19jb25zdHJ1Y3RvcnNdID0gY29uc3RydWN0b3JzO1xuICAgICAgICAgICAgdGhpc1tfY2xhc3NCYXNlXSA9IGJhc2U7XG5cbiAgICAgICAgICAgIGlmIChfaGFzU291cmNlQ29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNyY0NsYXNzIG9mIHNvdXJjZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzcmNDbGFzc1tfcHJvdG9FeHRlbmRzT25seV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhbmRsZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwbHk6ICh0YXJnZXQ6IGFueSwgdGhpc29iajogYW55LCBhcmdsaXN0OiBhbnlbXSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvYmogPSBuZXcgc3JjQ2xhc3MoLi4uYXJnbGlzdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcHlQcm9wZXJ0aWVzKHRoaXMsIG9iaik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHByb3h5IGZvciAnY29uc3RydWN0JyBhbmQgY2FjaGUgY29uc3RydWN0b3JcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9ycy5zZXQoc3JjQ2xhc3MsIG5ldyBQcm94eShzcmNDbGFzcywgaGFuZGxlcikpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcHJvdGVjdGVkIHN1cGVyPFQgZXh0ZW5kcyBDbGFzcz4oc3JjQ2xhc3M6IFQsIC4uLmFyZ3M6IENvbnN0cnVjdG9yUGFyYW1ldGVyczxUPik6IHRoaXMge1xuICAgICAgICAgICAgY29uc3QgbWFwID0gdGhpc1tfY29uc3RydWN0b3JzXTtcbiAgICAgICAgICAgIGNvbnN0IGN0b3IgPSBtYXAuZ2V0KHNyY0NsYXNzKTtcbiAgICAgICAgICAgIGlmIChjdG9yKSB7XG4gICAgICAgICAgICAgICAgY3Rvci5jYWxsKHRoaXMsIC4uLmFyZ3MpO1xuICAgICAgICAgICAgICAgIG1hcC5zZXQoc3JjQ2xhc3MsIG51bGwpOyAgICAvLyBwcmV2ZW50IGNhbGxpbmcgdHdpY2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIGlzTWl4ZWRXaXRoPFQ+KHNyY0NsYXNzOiBDb25zdHJ1Y3RvcjxUPik6IGJvb2xlYW4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uc3RydWN0b3IgPT09IHNyY0NsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzW19jbGFzc0Jhc2VdID09PSBzcmNDbGFzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1tfY2xhc3NTb3VyY2VzXS5yZWR1Y2UoKHAsIGMpID0+IHAgfHwgKHNyY0NsYXNzID09PSBjKSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIHN0YXRpYyBbU3ltYm9sLmhhc0luc3RhbmNlXShpbnN0YW5jZTogYW55KTogYm9vbGVhbiB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mLmNhbGwoX01peGluQmFzZS5wcm90b3R5cGUsIGluc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBbX2lzSW5oZXJpdGVkXTxUPihzcmNDbGFzczogQ29uc3RydWN0b3I8VD4pOiBib29sZWFuIHtcbiAgICAgICAgICAgIGNvbnN0IGN0b3JzID0gdGhpc1tfY29uc3RydWN0b3JzXTtcbiAgICAgICAgICAgIGlmIChjdG9ycy5oYXMoc3JjQ2xhc3MpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGN0b3Igb2YgY3RvcnMua2V5cygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZi5jYWxsKHNyY0NsYXNzLCBjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBwcml2YXRlIGdldCBbX2NsYXNzU291cmNlc10oKTogQ29uc3RydWN0b3I8YW55PltdIHtcbiAgICAgICAgICAgIHJldHVybiBbLi4udGhpc1tfY29uc3RydWN0b3JzXS5rZXlzKCldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBzcmNDbGFzcyBvZiBzb3VyY2VzKSB7XG4gICAgICAgIC8vIHByb3ZpZGUgY3VzdG9tIGluc3RhbmNlb2ZcbiAgICAgICAgY29uc3QgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc3JjQ2xhc3MsIFN5bWJvbC5oYXNJbnN0YW5jZSk7XG4gICAgICAgIGlmICghZGVzYyB8fCBkZXNjLndyaXRhYmxlKSB7XG4gICAgICAgICAgICBjb25zdCBvcmdJbnN0YW5jZU9mID0gZGVzYyA/IHNyY0NsYXNzW1N5bWJvbC5oYXNJbnN0YW5jZV0gOiBfaW5zdGFuY2VPZjtcbiAgICAgICAgICAgIHNldEluc3RhbmNlT2Yoc3JjQ2xhc3MsIChpbnN0OiBvYmplY3QpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3JnSW5zdGFuY2VPZi5jYWxsKHNyY0NsYXNzLCBpbnN0KSB8fCAoKG51bGwgIT0gaW5zdCAmJiBpbnN0W19pc0luaGVyaXRlZF0pID8gaW5zdFtfaXNJbmhlcml0ZWRdKHNyY0NsYXNzKSA6IGZhbHNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIHByb3ZpZGUgcHJvdG90eXBlXG4gICAgICAgIGNvcHlQcm9wZXJ0aWVzKF9NaXhpbkJhc2UucHJvdG90eXBlLCBzcmNDbGFzcy5wcm90b3R5cGUpO1xuICAgICAgICBsZXQgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHNyY0NsYXNzLnByb3RvdHlwZSk7XG4gICAgICAgIHdoaWxlIChfb2JqUHJvdG90eXBlICE9PSBwYXJlbnQpIHtcbiAgICAgICAgICAgIGNvcHlQcm9wZXJ0aWVzKF9NaXhpbkJhc2UucHJvdG90eXBlLCBwYXJlbnQpO1xuICAgICAgICAgICAgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHBhcmVudCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2hlY2sgY29uc3RydWN0b3JcbiAgICAgICAgaWYgKCFfaGFzU291cmNlQ29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIF9oYXNTb3VyY2VDb25zdHJ1Y3RvciA9ICFzcmNDbGFzc1tfcHJvdG9FeHRlbmRzT25seV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gX01peGluQmFzZSBhcyBhbnk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBuby1pbnZhbGlkLXRoaXMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuY29uc3QgcmFuZG9tID0gTWF0aC5yYW5kb20uYmluZChNYXRoKTtcblxuLyoqXG4gKiBAZW4gRXhlY3V0ZSBzaHVmZmxlIG9mIGFuIGFycmF5IGVsZW1lbnRzLlxuICogQGphIOmFjeWIl+imgee0oOOBruOCt+ODo+ODg+ODleODq1xuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gZGVzdHJ1Y3RpdmVcbiAqICAtIGBlbmAgdHJ1ZTogZGVzdHJ1Y3RpdmUgLyBmYWxzZTogbm9uLWRlc3RydWN0aXZlIChkZWZhdWx0KVxuICogIC0gYGphYCB0cnVlOiDnoLTlo4rnmoQgLyBmYWxzZTog6Z2e56C05aOK55qEICjml6LlrpopXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaHVmZmxlPFQ+KGFycmF5OiBUW10sIGRlc3RydWN0aXZlID0gZmFsc2UpOiBUW10ge1xuICAgIGNvbnN0IHNvdXJjZSA9IGRlc3RydWN0aXZlID8gYXJyYXkgOiBhcnJheS5zbGljZSgpO1xuICAgIGNvbnN0IGxlbiA9IHNvdXJjZS5sZW5ndGg7XG4gICAgZm9yIChsZXQgaSA9IGxlbiA+IDAgPyBsZW4gPj4+IDAgOiAwOyBpID4gMTspIHtcbiAgICAgICAgY29uc3QgaiA9IGkgKiByYW5kb20oKSA+Pj4gMDtcbiAgICAgICAgY29uc3Qgc3dhcCA9IHNvdXJjZVstLWldO1xuICAgICAgICBzb3VyY2VbaV0gPSBzb3VyY2Vbal07XG4gICAgICAgIHNvdXJjZVtqXSA9IHN3YXA7XG4gICAgfVxuICAgIHJldHVybiBzb3VyY2U7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBFeGVjdXRlIHN0YWJsZSBzb3J0IGJ5IG1lcmdlLXNvcnQgYWxnb3JpdGhtLlxuICogQGphIGBtZXJnZS1zb3J0YCDjgavjgojjgovlronlrprjgr3jg7zjg4hcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNvbXBhcmF0b3JcbiAqICAtIGBlbmAgc29ydCBjb21wYXJhdG9yIGZ1bmN0aW9uXG4gKiAgLSBgamFgIOOCveODvOODiOmWouaVsOOCkuaMh+WumlxuICogQHBhcmFtIGRlc3RydWN0aXZlXG4gKiAgLSBgZW5gIHRydWU6IGRlc3RydWN0aXZlIC8gZmFsc2U6IG5vbi1kZXN0cnVjdGl2ZSAoZGVmYXVsdClcbiAqICAtIGBqYWAgdHJ1ZTog56C05aOK55qEIC8gZmFsc2U6IOmdnuegtOWjiueahCAo5pei5a6aKVxuICovXG5leHBvcnQgZnVuY3Rpb24gc29ydDxUPihhcnJheTogVFtdLCBjb21wYXJhdG9yOiAobGhzOiBULCByaHM6IFQpID0+IG51bWJlciwgZGVzdHJ1Y3RpdmUgPSBmYWxzZSk6IFRbXSB7XG4gICAgY29uc3Qgc291cmNlID0gZGVzdHJ1Y3RpdmUgPyBhcnJheSA6IGFycmF5LnNsaWNlKCk7XG4gICAgaWYgKHNvdXJjZS5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgfVxuICAgIGNvbnN0IGxocyA9IHNvcnQoc291cmNlLnNwbGljZSgwLCBzb3VyY2UubGVuZ3RoID4+PiAxKSwgY29tcGFyYXRvciwgdHJ1ZSk7XG4gICAgY29uc3QgcmhzID0gc29ydChzb3VyY2Uuc3BsaWNlKDApLCBjb21wYXJhdG9yLCB0cnVlKTtcbiAgICB3aGlsZSAobGhzLmxlbmd0aCAmJiByaHMubGVuZ3RoKSB7XG4gICAgICAgIHNvdXJjZS5wdXNoKGNvbXBhcmF0b3IobGhzWzBdLCByaHNbMF0pIDw9IDAgPyBsaHMuc2hpZnQoKSBhcyBUIDogcmhzLnNoaWZ0KCkgYXMgVCk7XG4gICAgfVxuICAgIHJldHVybiBzb3VyY2UuY29uY2F0KGxocywgcmhzKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1ha2UgdW5pcXVlIGFycmF5LlxuICogQGphIOmHjeikh+imgee0oOOBruOBquOBhOmFjeWIl+OBruS9nOaIkFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmlxdWU8VD4oYXJyYXk6IFRbXSk6IFRbXSB7XG4gICAgcmV0dXJuIFsuLi5uZXcgU2V0KGFycmF5KV07XG59XG5cbi8qKlxuICogQGVuIE1ha2UgdW5pb24gYXJyYXkuXG4gKiBAamEg6YWN5YiX44Gu5ZKM6ZuG5ZCI44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIGFycmF5c1xuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlzXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl+e+pFxuICovXG5leHBvcnQgZnVuY3Rpb24gdW5pb248VD4oLi4uYXJyYXlzOiBUW11bXSk6IFRbXSB7XG4gICAgcmV0dXJuIHVuaXF1ZShhcnJheXMuZmxhdCgpKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1ha2UgaW5kZXggYXJyYXkuXG4gKiBAamEg44Kk44Oz44OH44OD44Kv44K56YWN5YiX44Gu5L2c5oiQXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBleGNsdWRlc1xuICogIC0gYGVuYCBleGNsdWRlIGluZGV4IGluIHJldHVybiB2YWx1ZS5cbiAqICAtIGBqYWAg5oi744KK5YCk6YWN5YiX44Gr5ZCr44KB44Gq44GE44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbmRpY2VzPFQ+KGFycmF5OiBUW10sIC4uLmV4Y2x1ZGVzOiBudW1iZXJbXSk6IG51bWJlcltdIHtcbiAgICBjb25zdCByZXR2YWwgPSBbLi4uYXJyYXkua2V5cygpXTtcblxuICAgIGNvbnN0IGxlbiA9IGFycmF5Lmxlbmd0aDtcbiAgICBjb25zdCBleExpc3QgPSBbLi4ubmV3IFNldChleGNsdWRlcyldLnNvcnQoKGxocywgcmhzKSA9PiBsaHMgPCByaHMgPyAxIDogLTEpO1xuICAgIGZvciAoY29uc3QgZXggb2YgZXhMaXN0KSB7XG4gICAgICAgIGlmICgwIDw9IGV4ICYmIGV4IDwgbGVuKSB7XG4gICAgICAgICAgICByZXR2YWwuc3BsaWNlKGV4LCAxKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBbW2dyb3VwQnldXSgpIG9wdGlvbnMgZGVmaW5pdGlvbi5cbiAqIEBqYSBbW2dyb3VwQnldXSgpIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEdyb3VwQnlPcHRpb25zPFxuICAgIFQgZXh0ZW5kcyBvYmplY3QsXG4gICAgVEtFWVMgZXh0ZW5kcyBrZXlvZiBULFxuICAgIFRTVU1LRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUR1JPVVBLRVkgZXh0ZW5kcyBzdHJpbmdcbj4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBgR1JPVVAgQllgIGtleXMuXG4gICAgICogQGphIGBHUk9VUCBCWWAg44Gr5oyH5a6a44GZ44KL44Kt44O8XG4gICAgICovXG4gICAga2V5czogRXh0cmFjdDxUS0VZUywgc3RyaW5nPltdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFnZ3JlZ2F0YWJsZSBrZXlzLlxuICAgICAqIEBqYSDpm4boqIjlj6/og73jgarjgq3jg7zkuIDopqdcbiAgICAgKi9cbiAgICBzdW1LZXlzPzogRXh0cmFjdDxUU1VNS0VZUywgc3RyaW5nPltdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdyb3VwZWQgaXRlbSBhY2Nlc3Mga2V5LiBkZWZhdWx0OiAnaXRlbXMnLFxuICAgICAqIEBqYSDjgrDjg6vjg7zjg5Tjg7PjgrDjgZXjgozjgZ/opoHntKDjgbjjga7jgqLjgq/jgrvjgrnjgq3jg7wuIOaXouWumjogJ2l0ZW1zJ1xuICAgICAqL1xuICAgIGdyb3VwS2V5PzogVEdST1VQS0VZO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm4gdHlwZSBvZiBbW2dyb3VwQnldXSgpLlxuICogQGphIFtbZ3JvdXBCeV1dKCkg44GM6L+U5Y2044GZ44KL5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIEdyb3VwQnlSZXR1cm5WYWx1ZTxcbiAgICBUIGV4dGVuZHMgb2JqZWN0LFxuICAgIFRLRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUU1VNS0VZUyBleHRlbmRzIGtleW9mIFQgPSBuZXZlcixcbiAgICBUR1JPVVBLRVkgZXh0ZW5kcyBzdHJpbmcgPSAnaXRlbXMnXG4+ID0gUmVhZG9ubHk8UmVjb3JkPFRLRVlTLCB7fT4gJiBSZWNvcmQ8VFNVTUtFWVMsIHt9PiAmIFJlY29yZDxUR1JPVVBLRVksIFRbXT4+O1xuXG4vKipcbiAqIEBlbiBFeGVjdXRlIGBHUk9VUCBCWWAgZm9yIGFycmF5IGVsZW1lbnRzLlxuICogQGphIOmFjeWIl+OBruimgee0oOOBriBgR1JPVVAgQllgIOmbhuWQiOOCkuaKveWHulxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBgR1JPVVAgQllgIG9wdGlvbnNcbiAqICAtIGBqYWAgYEdST1VQIEJZYCDjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdyb3VwQnk8XG4gICAgVCBleHRlbmRzIG9iamVjdCxcbiAgICBUS0VZUyBleHRlbmRzIGtleW9mIFQsXG4gICAgVFNVTUtFWVMgZXh0ZW5kcyBrZXlvZiBUID0gbmV2ZXIsXG4gICAgVEdST1VQS0VZIGV4dGVuZHMgc3RyaW5nID0gJ2l0ZW1zJ1xuPihhcnJheTogVFtdLCBvcHRpb25zOiBHcm91cEJ5T3B0aW9uczxULCBUS0VZUywgVFNVTUtFWVMsIFRHUk9VUEtFWT4pOiBHcm91cEJ5UmV0dXJuVmFsdWU8VCwgVEtFWVMsIFRTVU1LRVlTLCBUR1JPVVBLRVk+W10ge1xuICAgIGNvbnN0IHsga2V5cywgc3VtS2V5cywgZ3JvdXBLZXkgfSA9IG9wdGlvbnM7XG4gICAgY29uc3QgX2dyb3VwS2V5ID0gZ3JvdXBLZXkgfHwgJ2l0ZW1zJztcbiAgICBjb25zdCBfc3VtS2V5czogc3RyaW5nW10gPSBzdW1LZXlzIHx8IFtdO1xuICAgIF9zdW1LZXlzLnB1c2goX2dyb3VwS2V5KTtcblxuICAgIGNvbnN0IGhhc2ggPSBhcnJheS5yZWR1Y2UoKHJlczogVCwgZGF0YTogVCkgPT4ge1xuICAgICAgICAvLyBjcmVhdGUgZ3JvdXBCeSBpbnRlcm5hbCBrZXlcbiAgICAgICAgY29uc3QgX2tleSA9IGtleXMucmVkdWNlKChzLCBrKSA9PiBzICsgU3RyaW5nKGRhdGFba10pLCAnJyk7XG5cbiAgICAgICAgLy8gaW5pdCBrZXlzXG4gICAgICAgIGlmICghKF9rZXkgaW4gcmVzKSkge1xuICAgICAgICAgICAgY29uc3Qga2V5TGlzdCA9IGtleXMucmVkdWNlKChoLCBrOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICBoW2tdID0gZGF0YVtrXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaDtcbiAgICAgICAgICAgIH0sIHt9KTtcblxuICAgICAgICAgICAgcmVzW19rZXldID0gX3N1bUtleXMucmVkdWNlKChoLCBrOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICBoW2tdID0gMDtcbiAgICAgICAgICAgICAgICByZXR1cm4gaDtcbiAgICAgICAgICAgIH0sIGtleUxpc3QpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzS2V5ID0gcmVzW19rZXldO1xuXG4gICAgICAgIC8vIHN1bSBwcm9wZXJ0aWVzXG4gICAgICAgIGZvciAoY29uc3QgayBvZiBfc3VtS2V5cykge1xuICAgICAgICAgICAgaWYgKF9ncm91cEtleSA9PT0gaykge1xuICAgICAgICAgICAgICAgIHJlc0tleVtrXSA9IHJlc0tleVtrXSB8fCBbXTtcbiAgICAgICAgICAgICAgICByZXNLZXlba10ucHVzaChkYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzS2V5W2tdICs9IGRhdGFba107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH0sIHt9KTtcblxuICAgIHJldHVybiBPYmplY3QudmFsdWVzKGhhc2gpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLm1hcCgpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLm1hcCgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqIFxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIHRoaXNBcmdcbiAqICAtIGBlbmAgVmFsdWUgdG8gdXNlIGFzICp0aGlzKiB3aGVuIGV4ZWN1dGluZyB0aGUgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDlrp/ooYzjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCAqQXJyYXkqIGFzIHZhbHVlLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PntZDmnpzphY3liJfjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1hcDxULCBVPih0aGlzOiBhbnksIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUgfCBQcm9taXNlPFU+LCB0aGlzQXJnPzogYW55KTogUHJvbWlzZTxVW10+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXG4gICAgICAgIGFycmF5Lm1hcChhc3luYyAodiwgaSwgYSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhKTtcbiAgICAgICAgfSlcbiAgICApO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuZmlsdGVyKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZmlsdGVyKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgKkFycmF5KiBhcyB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c6YWN5YiX44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaWx0ZXI8VD4odGhpczogYW55LCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBib29sZWFuIHwgUHJvbWlzZTxib29sZWFuPiwgdGhpc0FyZz86IGFueSk6IFByb21pc2U8VFtdPiB7XG4gICAgY29uc3QgYml0czogYm9vbGVhbltdID0gYXdhaXQgbWFwKGFycmF5LCAodiwgaSwgYSkgPT4gY2FsbGJhY2suY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHYsIGksIGEpKTtcbiAgICByZXR1cm4gYXJyYXkuZmlsdGVyKCgpID0+IGJpdHMuc2hpZnQoKSk7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5maW5kKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZmluZCgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50IHZhbHVlLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PntZDmnpzjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbmQ8VD4odGhpczogYW55LCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBib29sZWFuIHwgUHJvbWlzZTxib29sZWFuPiwgdGhpc0FyZz86IGFueSk6IFByb21pc2U8VCB8IHVuZGVmaW5lZD4ge1xuICAgIGZvciAoY29uc3QgW2ksIHZdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoYXdhaXQgY2FsbGJhY2suY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHYsIGksIGFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLmZpbmRJbmRleCgpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLmZpbmRJbmRleCgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50IGluZGV4IHZhbHVlLlxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbmRJbmRleDxUPih0aGlzOiBhbnksIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IGJvb2xlYW4gfCBQcm9taXNlPGJvb2xlYW4+LCB0aGlzQXJnPzogYW55KTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLnNvbWUoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5zb21lKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgYm9vbGVhbiB2YWx1ZS5cbiAqICAtIGBqYWAg55yf5YG95YCk44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzb21lPFQ+KHRoaXM6IGFueSwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdW5rbm93biB8IFByb21pc2U8dW5rbm93bj4sIHRoaXNBcmc/OiBhbnkpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLmV2ZXJ5KClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZXZlcnkoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIHRoaXNBcmdcbiAqICAtIGBlbmAgVmFsdWUgdG8gdXNlIGFzICp0aGlzKiB3aGVuIGV4ZWN1dGluZyB0aGUgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDlrp/ooYzjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCBib29sZWFuIHZhbHVlLlxuICogIC0gYGphYCDnnJ/lgb3lgKTjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV2ZXJ5PFQ+KHRoaXM6IGFueSwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdW5rbm93biB8IFByb21pc2U8dW5rbm93bj4sIHRoaXNBcmc/OiBhbnkpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKCFhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdiwgaSwgYXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5yZWR1Y2UoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5yZWR1Y2UoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIGluaXRpYWxWYWx1ZVxuICogIC0gYGVuYCBVc2VkIGFzIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBmaXJzdCBjYWxsIG9mIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag44Gr5rih44GV44KM44KL5Yid5pyf5YCkXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgKkFycmF5KiBhcyB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c6YWN5YiX44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWR1Y2U8VCwgVT4oXG4gICAgYXJyYXk6IFRbXSxcbiAgICBjYWxsYmFjazogKGFjY3VtdWxhdG9yOiBVLCBjdXJyZW50VmFsdWU6IFQsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVIHwgUHJvbWlzZTxVPixcbiAgICBpbml0aWFsVmFsdWU/OiBVXG4pOiBQcm9taXNlPFU+IHtcbiAgICBpZiAoYXJyYXkubGVuZ3RoIDw9IDAgJiYgdW5kZWZpbmVkID09PSBpbml0aWFsVmFsdWUpIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdSZWR1Y2Ugb2YgZW1wdHkgYXJyYXkgd2l0aCBubyBpbml0aWFsIHZhbHVlJyk7XG4gICAgfVxuXG4gICAgY29uc3QgaGFzSW5pdCA9ICh1bmRlZmluZWQgIT09IGluaXRpYWxWYWx1ZSk7XG4gICAgbGV0IGFjYyA9IChoYXNJbml0ID8gaW5pdGlhbFZhbHVlIDogYXJyYXlbMF0pIGFzIFU7XG5cbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKCEoIWhhc0luaXQgJiYgMCA9PT0gaSkpIHtcbiAgICAgICAgICAgIGFjYyA9IGF3YWl0IGNhbGxiYWNrKGFjYywgdiwgaSwgYXJyYXkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGFjYztcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuaW1wb3J0IHsgZGVlcEVxdWFsIH0gZnJvbSAnLi9kZWVwLWNpcmN1aXQnO1xuaW1wb3J0IHtcbiAgICBOaWwsXG4gICAgV3JpdGFibGUsXG4gICAgaXNBcnJheSxcbiAgICBpc09iamVjdCxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGNsYXNzTmFtZSxcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogQGVuIENoZWNrIHdoZXRoZXIgaW5wdXQgc291cmNlIGhhcyBhIHByb3BlcnR5LlxuICogQGphIOWFpeWKm+WFg+OBjOODl+ODreODkeODhuOCo+OCkuaMgeOBo+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzcmNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhcyhzcmM6IHVua25vd24sIHByb3BOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gbnVsbCAhPSBzcmMgJiYgaXNPYmplY3Qoc3JjKSAmJiAocHJvcE5hbWUgaW4gc3JjKTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHNoYWxsb3cgY29weSBvZiBgdGFyZ2V0YCB3aGljaCBoYXMgb25seSBgcGlja0tleXNgLlxuICogQGphIGBwaWNrS2V5c2Ag44Gn5oyH5a6a44GV44KM44Gf44OX44Ot44OR44OG44Kj44Gu44G/44KS5oyB44GkIGB0YXJnZXRgIOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBjb3B5IHNvdXJjZSBvYmplY3RcbiAqICAtIGBqYWAg44Kz44OU44O85YWD44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gcGlja0tleXNcbiAqICAtIGBlbmAgY29weSB0YXJnZXQga2V5c1xuICogIC0gYGphYCDjgrPjg5Tjg7zlr77osaHjga7jgq3jg7zkuIDopqdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBpY2s8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIGtleW9mIFQ+KHRhcmdldDogVCwgLi4ucGlja0tleXM6IEtbXSk6IFdyaXRhYmxlPFBpY2s8VCwgSz4+IHtcbiAgICBpZiAoIXRhcmdldCB8fCAhaXNPYmplY3QodGFyZ2V0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGAke2NsYXNzTmFtZSh0YXJnZXQpfSBpcyBub3QgYW4gb2JqZWN0LmApO1xuICAgIH1cbiAgICByZXR1cm4gcGlja0tleXMucmVkdWNlKChvYmosIGtleSkgPT4ge1xuICAgICAgICBrZXkgaW4gdGFyZ2V0ICYmIChvYmpba2V5XSA9IHRhcmdldFtrZXldKTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9LCB7fSBhcyBXcml0YWJsZTxQaWNrPFQsIEs+Pik7XG59XG5cbi8qKlxuICogQGVuIEdldCBzaGFsbG93IGNvcHkgb2YgYHRhcmdldGAgd2l0aG91dCBgb21pdEtleXNgLlxuICogQGphIGBvbWl0S2V5c2Ag44Gn5oyH5a6a44GV44KM44Gf44OX44Ot44OR44OG44Kj5Lul5aSW44Gu44Kt44O844KS5oyB44GkIGB0YXJnZXRgIOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBjb3B5IHNvdXJjZSBvYmplY3RcbiAqICAtIGBqYWAg44Kz44OU44O85YWD44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gb21pdEtleXNcbiAqICAtIGBlbmAgb21pdCB0YXJnZXQga2V5c1xuICogIC0gYGphYCDliYrpmaTlr77osaHjga7jgq3jg7zkuIDopqdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9taXQ8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIGtleW9mIFQ+KHRhcmdldDogVCwgLi4ub21pdEtleXM6IEtbXSk6IFdyaXRhYmxlPE9taXQ8VCwgSz4+IHtcbiAgICBpZiAoIXRhcmdldCB8fCAhaXNPYmplY3QodGFyZ2V0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGAke2NsYXNzTmFtZSh0YXJnZXQpfSBpcyBub3QgYW4gb2JqZWN0LmApO1xuICAgIH1cbiAgICBjb25zdCBvYmogPSB7fSBhcyBXcml0YWJsZTxPbWl0PFQsIEs+PjtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0YXJnZXQpKSB7XG4gICAgICAgICFvbWl0S2V5cy5pbmNsdWRlcyhrZXkgYXMgSykgJiYgKG9ialtrZXldID0gdGFyZ2V0W2tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIEBlbiBJbnZlcnQgdGhlIGtleXMgYW5kIHZhbHVlcyBvZiBhbiBvYmplY3QuIFRoZSB2YWx1ZXMgbXVzdCBiZSBzZXJpYWxpemFibGUuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu44Kt44O844Go5YCk44KS6YCG6Lui44GZ44KLLiDjgZnjgbnjgabjga7lgKTjgYzjg6bjg4vjg7zjgq/jgafjgYLjgovjgZPjgajjgYzliY3mj5BcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBvYmplY3RcbiAqICAtIGBqYWAg5a++6LGh44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnZlcnQ8VCBleHRlbmRzIG9iamVjdCA9IGFueT4odGFyZ2V0OiBvYmplY3QpOiBUIHtcbiAgICBjb25zdCByZXN1bHQgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0YXJnZXQpKSB7XG4gICAgICAgIHJlc3VsdFt0YXJnZXRba2V5XV0gPSBrZXk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQgYXMgVDtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHNoYWxsb3cgY29weSBvZiBkaWZmZXJlbmNlIGJldHdlZW4gYGJhc2VgIGFuZCBgc3JjYC5cbiAqIEBqYSBgYmFzZWAg44GoIGBzcmNgIOOBruW3ruWIhuODl+ODreODkeODhuOCo+OCkuOCguOBpOOCquODluOCuOOCp+OCr+ODiOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGJhc2VcbiAqICAtIGBlbmAgYmFzZSBvYmplY3RcbiAqICAtIGBqYWAg5Z+65rqW44Go44Gq44KL44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBvYmplY3RcbiAqICAtIGBqYWAg44Kz44OU44O85YWD44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaWZmPFQgZXh0ZW5kcyBvYmplY3Q+KGJhc2U6IFQsIHNyYzogUGFydGlhbDxUPik6IFBhcnRpYWw8VD4ge1xuICAgIGlmICghYmFzZSB8fCAhaXNPYmplY3QoYmFzZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHtjbGFzc05hbWUoYmFzZSl9IGlzIG5vdCBhbiBvYmplY3QuYCk7XG4gICAgfVxuICAgIGlmICghc3JjIHx8ICFpc09iamVjdChzcmMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYCR7Y2xhc3NOYW1lKHNyYyl9IGlzIG5vdCBhbiBvYmplY3QuYCk7XG4gICAgfVxuXG4gICAgY29uc3QgcmV0dmFsOiBQYXJ0aWFsPFQ+ID0ge307XG5cbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzcmMpKSB7XG4gICAgICAgIGlmICghZGVlcEVxdWFsKGJhc2Vba2V5XSwgc3JjW2tleV0pKSB7XG4gICAgICAgICAgICByZXR2YWxba2V5XSA9IHNyY1trZXldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLyoqXG4gKiBAZW4gSWYgdGhlIHZhbHVlIG9mIHRoZSBuYW1lZCBwcm9wZXJ0eSBpcyBhIGZ1bmN0aW9uIHRoZW4gaW52b2tlIGl0OyBvdGhlcndpc2UsIHJldHVybiBpdC5cbiAqIEBqYSBvYmplY3Qg44GuIHByb3BlcnR5IOOBjOODoeOCveODg+ODieOBquOCieOBneOBruWun+ihjOe1kOaenOOCkiwg44OX44Ot44OR44OG44Kj44Gq44KJ44Gd44Gu5YCk44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogLSBgZW5gIE9iamVjdCB0byBtYXliZSBpbnZva2UgZnVuY3Rpb24gYHByb3BlcnR5YCBvbi5cbiAqIC0gYGphYCDoqZXkvqHjgZnjgovjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBwcm9wZXJ0eVxuICogLSBgZW5gIFRoZSBmdW5jdGlvbiBieSBuYW1lIHRvIGludm9rZSBvbiBgb2JqZWN0YC5cbiAqIC0gYGphYCDoqZXkvqHjgZnjgovjg5fjg63jg5Hjg4bjgqPlkI1cbiAqIEBwYXJhbSBmYWxsYmFja1xuICogLSBgZW5gIFRoZSB2YWx1ZSB0byBiZSByZXR1cm5lZCBpbiBjYXNlIGBwcm9wZXJ0eWAgZG9lc24ndCBleGlzdCBvciBpcyB1bmRlZmluZWQuXG4gKiAtIGBqYWAg5a2Y5Zyo44GX44Gq44GL44Gj44Gf5aC05ZCI44GuIGZhbGxiYWNrIOWApFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzdWx0PFQgPSBhbnk+KHRhcmdldDogb2JqZWN0IHwgTmlsLCBwcm9wZXJ0eTogc3RyaW5nIHwgc3RyaW5nW10sIGZhbGxiYWNrPzogVCk6IFQge1xuICAgIGNvbnN0IHByb3BzID0gaXNBcnJheShwcm9wZXJ0eSkgPyBwcm9wZXJ0eSA6IFtwcm9wZXJ0eV07XG4gICAgaWYgKCFwcm9wcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGlzRnVuY3Rpb24oZmFsbGJhY2spID8gZmFsbGJhY2suY2FsbCh0YXJnZXQpIDogZmFsbGJhY2s7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzb2x2ZSA9IChvOiB1bmtub3duLCBwOiB1bmtub3duKTogYW55ID0+IHtcbiAgICAgICAgcmV0dXJuIGlzRnVuY3Rpb24ocCkgPyBwLmNhbGwobykgOiBwO1xuICAgIH07XG5cbiAgICBsZXQgb2JqOiBhbnkgPSB0YXJnZXQ7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHByb3BzKSB7XG4gICAgICAgIGNvbnN0IHByb3AgPSBudWxsID09IG9iaiA/IHVuZGVmaW5lZCA6IG9ialtuYW1lXTtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gcHJvcCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUob2JqLCBmYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICAgICAgb2JqID0gcmVzb2x2ZShvYmosIHByb3ApO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5mdW5jdGlvbiBjYWxsYWJsZSgpOiBhbnkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdXNlLWJlZm9yZS1kZWZpbmVcbiAgICByZXR1cm4gYWNjZXNzaWJsZTtcbn1cblxuY29uc3QgYWNjZXNzaWJsZTogYW55ID0gbmV3IFByb3h5KGNhbGxhYmxlLCB7XG4gICAgZ2V0OiAodGFyZ2V0LCBuYW1lKSA9PiB7XG4gICAgICAgIGNvbnN0IHByb3AgPSB0YXJnZXRbbmFtZV07XG4gICAgICAgIGlmIChudWxsICE9IHByb3ApIHtcbiAgICAgICAgICAgIHJldHVybiBwcm9wO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGFjY2Vzc2libGU7XG4gICAgICAgIH1cbiAgICB9LFxufSk7XG5cbmZ1bmN0aW9uIGNyZWF0ZSgpOiBhbnkge1xuICAgIGNvbnN0IHN0dWIgPSBuZXcgUHJveHkoe30sIHtcbiAgICAgICAgZ2V0OiAodGFyZ2V0LCBuYW1lKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwcm9wID0gdGFyZ2V0W25hbWVdO1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gcHJvcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9wO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYWNjZXNzaWJsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9KTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzdHViLCAnc3R1YicsIHtcbiAgICAgICAgdmFsdWU6IHRydWUsXG4gICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICB9KTtcblxuICAgIHJldHVybiBzdHViO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgc2FmZSBhY2Nlc3NpYmxlIG9iamVjdC5cbiAqIEBqYSDlronlhajjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqrjg5bjgrjjgqfjgq/jg4jjga7lj5blvpdcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHNhZmVXaW5kb3cgPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbiAqIGNvbnNvbGUubG9nKG51bGwgIT0gc2FmZVdpbmRvdy5kb2N1bWVudCk7ICAgIC8vIHRydWVcbiAqIGNvbnN0IGRpdiA9IHNhZmVXaW5kb3cuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gKiBjb25zb2xlLmxvZyhudWxsICE9IGRpdik7ICAgIC8vIHRydWVcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgQSByZWZlcmVuY2Ugb2YgYW4gb2JqZWN0IHdpdGggYSBwb3NzaWJpbGl0eSB3aGljaCBleGlzdHMuXG4gKiAgLSBgamFgIOWtmOWcqOOBl+OBhuOCi+OCquODluOCuOOCp+OCr+ODiOOBruWPgueFp1xuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmVhbGl0eSBvciBzdHViIGluc3RhbmNlLlxuICogIC0gYGphYCDlrp/kvZPjgb7jgZ/jga/jgrnjgr/jg5bjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhZmU8VD4odGFyZ2V0OiBUKTogVCB7XG4gICAgcmV0dXJuIHRhcmdldCB8fCBjcmVhdGUoKTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1pbnRlcmZhY2UsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuaW1wb3J0IHsgZ2V0R2xvYmFsIH0gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHsgc2FmZSB9IGZyb20gJy4vc2FmZSc7XG5cbi8qKlxuICogQGVuIFR5cGUgb2YgaGFuZGxlIGZvciB0aW1lciBmdW5jdGlvbnMuXG4gKiBAamEg44K/44Kk44Oe44O86Zai5pWw44Gr5L2/55So44GZ44KL44OP44Oz44OJ44Or5Z6LXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGltZXJIYW5kbGUgeyB9XG5cbi8qKlxuICogQGVuIFR5cGUgb2YgdGltZXIgc3RhcnQgZnVuY3Rpb25zLlxuICogQGphIOOCv+OCpOODnuODvOmWi+Wni+mWouaVsOOBruWei1xuICovXG5leHBvcnQgdHlwZSBUaW1lclN0YXJ0RnVuY3Rpb24gPSAoaGFuZGxlcjogRnVuY3Rpb24sIHRpbWVvdXQ/OiBudW1iZXIsIC4uLmFyZ3M6IGFueVtdKSA9PiBUaW1lckhhbmRsZTtcblxuLyoqXG4gKiBAZW4gVHlwZSBvZiB0aW1lciBzdG9wIGZ1bmN0aW9ucy5cbiAqIEBqYSDjgr/jgqTjg57jg7zlgZzmraLplqLmlbDjga7lnotcbiAqL1xuZXhwb3J0IHR5cGUgVGltZXJTdG9wRnVuY3Rpb24gPSAoaGFuZGxlOiBUaW1lckhhbmRsZSkgPT4gdm9pZDtcblxuY29uc3Qgcm9vdDogYW55ID0gZ2V0R2xvYmFsKCk7XG5jb25zdCBfc2V0VGltZW91dDogVGltZXJTdGFydEZ1bmN0aW9uID0gc2FmZShyb290LnNldFRpbWVvdXQpO1xuY29uc3QgX2NsZWFyVGltZW91dDogVGltZXJTdG9wRnVuY3Rpb24gPSBzYWZlKHJvb3QuY2xlYXJUaW1lb3V0KTtcbmNvbnN0IF9zZXRJbnRlcnZhbDogVGltZXJTdGFydEZ1bmN0aW9uID0gc2FmZShyb290LnNldEludGVydmFsKTtcbmNvbnN0IF9jbGVhckludGVydmFsOiBUaW1lclN0b3BGdW5jdGlvbiA9IHNhZmUocm9vdC5jbGVhckludGVydmFsKTtcblxuZXhwb3J0IHtcbiAgICBfc2V0VGltZW91dCBhcyBzZXRUaW1lb3V0LFxuICAgIF9jbGVhclRpbWVvdXQgYXMgY2xlYXJUaW1lb3V0LFxuICAgIF9zZXRJbnRlcnZhbCBhcyBzZXRJbnRlcnZhbCxcbiAgICBfY2xlYXJJbnRlcnZhbCBhcyBjbGVhckludGVydmFsLFxufTtcbiIsIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuaW1wb3J0IHtcbiAgICBQcmltaXRpdmUsXG4gICAgVHlwZWREYXRhLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzT2JqZWN0LFxufSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGludmVydCB9IGZyb20gJy4vb2JqZWN0JztcbmltcG9ydCB7XG4gICAgVGltZXJIYW5kbGUsXG4gICAgc2V0VGltZW91dCxcbiAgICBjbGVhclRpbWVvdXQsXG59IGZyb20gJy4vdGltZXInO1xuXG4vKipcbiAqIEBlbiBFbnN1cmUgYXN5bmNocm9ub3VzIGV4ZWN1dGlvbi5cbiAqIEBqYSDpnZ7lkIzmnJ/lrp/ooYzjgpLkv53oqLxcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIHBvc3QoKCkgPT4gZXhlYyhhcmcpKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBpbXBsZW1lbnQgYXMgZnVuY3Rpb24gc2NvcGUuXG4gKiAgLSBgamFgIOmWouaVsOOCueOCs+ODvOODl+OBqOOBl+OBpuWun+ijhVxuKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0PFQ+KGV4ZWN1dG9yOiAoKSA9PiBUKTogUHJvbWlzZTxUPiB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oZXhlY3V0b3IpO1xufVxuXG4vKipcbiAqIEBlbiBHZW5lcmljIE5vLU9wZXJhdGlvbi5cbiAqIEBqYSDmsY7nlKggTm8tT3BlcmF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub29wKC4uLmFyZ3M6IGFueVtdKTogYW55IHsgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAvLyBub29wXG59XG5cbi8qKlxuICogQGVuIFdhaXQgZm9yIHRoZSBkZXNpZ25hdGlvbiBlbGFwc2UuXG4gKiBAamEg5oyH5a6a5pmC6ZaT5Yem55CG44KS5b6F5qmfXG4gKlxuICogQHBhcmFtIGVsYXBzZVxuICogIC0gYGVuYCB3YWl0IGVsYXBzZSBbbXNlY10uXG4gKiAgLSBgamFgIOW+heapn+aZgumWkyBbbXNlY11cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNsZWVwKGVsYXBzZTogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBlbGFwc2UpKTtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCB3aGVuIGludm9rZWQsIHdpbGwgb25seSBiZSB0cmlnZ2VyZWQgYXQgbW9zdCBvbmNlIGR1cmluZyBhIGdpdmVuIHRpbWUuXG4gKiBAamEg6Zai5pWw44Gu5a6f6KGM44KSIHdhaXQgW21zZWNdIOOBqzHlm57jgavliLbpmZBcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHRocm90dGxlZCA9IHRocm90dGxlKHVwYXRlUG9zaXRpb24sIDEwMCk7XG4gKiAkKHdpbmRvdykuc2Nyb2xsKHRocm90dGxlZCk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWwXG4gKiBAcGFyYW0gZWxhcHNlXG4gKiAgLSBgZW5gIHdhaXQgZWxhcHNlIFttc2VjXS5cbiAqICAtIGBqYWAg5b6F5qmf5pmC6ZaTIFttc2VjXVxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRocm90dGxlPFQgZXh0ZW5kcyBGdW5jdGlvbj4oZXhlY3V0b3I6IFQsIGVsYXBzZTogbnVtYmVyLCBvcHRpb25zPzogeyBsZWFkaW5nPzogYm9vbGVhbjsgdHJhaWxpbmc/OiBib29sZWFuOyB9KTogVCAmIHsgY2FuY2VsKCk6IHZvaWQ7IH0ge1xuICAgIGNvbnN0IG9wdHMgPSBvcHRpb25zIHx8IHt9O1xuICAgIGxldCBoYW5kbGU6IFRpbWVySGFuZGxlIHwgdW5kZWZpbmVkO1xuICAgIGxldCBhcmdzOiBhbnlbXSB8IHVuZGVmaW5lZDtcbiAgICBsZXQgY29udGV4dDogYW55LCByZXN1bHQ6IGFueTtcbiAgICBsZXQgcHJldmlvdXMgPSAwO1xuXG4gICAgY29uc3QgbGF0ZXIgPSBmdW5jdGlvbiAoKTogdm9pZCB7XG4gICAgICAgIHByZXZpb3VzID0gZmFsc2UgPT09IG9wdHMubGVhZGluZyA/IDAgOiBEYXRlLm5vdygpO1xuICAgICAgICBoYW5kbGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHJlc3VsdCA9IGV4ZWN1dG9yLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBpZiAoIWhhbmRsZSkge1xuICAgICAgICAgICAgY29udGV4dCA9IGFyZ3MgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgdGhyb3R0bGVkID0gZnVuY3Rpb24gKHRoaXM6IGFueSwgLi4uYXJnOiBhbnlbXSk6IGFueSB7XG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIGlmICghcHJldmlvdXMgJiYgZmFsc2UgPT09IG9wdHMubGVhZGluZykge1xuICAgICAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVtYWluaW5nID0gZWxhcHNlIC0gKG5vdyAtIHByZXZpb3VzKTtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWludmFsaWQtdGhpc1xuICAgICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgICAgYXJncyA9IFsuLi5hcmddO1xuICAgICAgICBpZiAocmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gZWxhcHNlKSB7XG4gICAgICAgICAgICBpZiAoaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGhhbmRsZSk7XG4gICAgICAgICAgICAgICAgaGFuZGxlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgICAgICByZXN1bHQgPSBleGVjdXRvci5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICAgIGlmICghaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dCA9IGFyZ3MgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIWhhbmRsZSAmJiBmYWxzZSAhPT0gb3B0cy50cmFpbGluZykge1xuICAgICAgICAgICAgaGFuZGxlID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICB0aHJvdHRsZWQuY2FuY2VsID0gZnVuY3Rpb24gKCk6IHZvaWQge1xuICAgICAgICBjbGVhclRpbWVvdXQoaGFuZGxlIGFzIFRpbWVySGFuZGxlKTtcbiAgICAgICAgcHJldmlvdXMgPSAwO1xuICAgICAgICBoYW5kbGUgPSBjb250ZXh0ID0gYXJncyA9IHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHRocm90dGxlZCBhcyBhbnk7XG59XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgYXMgbG9uZyBhcyBpdCBjb250aW51ZXMgdG8gYmUgaW52b2tlZCwgd2lsbCBub3QgYmUgdHJpZ2dlcmVkLlxuICogQGphIOWRvOOBs+WHuuOBleOCjOOBpuOBi+OCiSB3YWl0IFttc2VjXSDntYzpgY7jgZnjgovjgb7jgaflrp/ooYzjgZfjgarjgYTplqLmlbDjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWwXG4gKiBAcGFyYW0gd2FpdFxuICogIC0gYGVuYCB3YWl0IGVsYXBzZSBbbXNlY10uXG4gKiAgLSBgamFgIOW+heapn+aZgumWkyBbbXNlY11cbiAqIEBwYXJhbSBpbW1lZGlhdGVcbiAqICAtIGBlbmAgSWYgYHRydWVgIGlzIHBhc3NlZCwgdHJpZ2dlciB0aGUgZnVuY3Rpb24gb24gdGhlIGxlYWRpbmcgZWRnZSwgaW5zdGVhZCBvZiB0aGUgdHJhaWxpbmcuXG4gKiAgLSBgamFgIGB0cnVlYCDjga7loLTlkIgsIOWIneWbnuOBruOCs+ODvOODq+OBr+WNs+aZguWun+ihjFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVib3VuY2U8VCBleHRlbmRzIEZ1bmN0aW9uPihleGVjdXRvcjogVCwgd2FpdDogbnVtYmVyLCBpbW1lZGlhdGU/OiBib29sZWFuKTogVCAmIHsgY2FuY2VsKCk6IHZvaWQ7IH0ge1xuICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLWludmFsaWQtdGhpcyAqL1xuICAgIGxldCBoYW5kbGU6IFRpbWVySGFuZGxlIHwgdW5kZWZpbmVkO1xuICAgIGxldCByZXN1bHQ6IGFueTtcblxuICAgIGNvbnN0IGxhdGVyID0gZnVuY3Rpb24gKGNvbnRleHQ6IGFueSwgYXJnczogYW55W10pOiB2b2lkIHtcbiAgICAgICAgaGFuZGxlID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAoYXJncykge1xuICAgICAgICAgICAgcmVzdWx0ID0gZXhlY3V0b3IuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgZGVib3VuY2VkID0gZnVuY3Rpb24gKHRoaXM6IGFueSwgLi4uYXJnczogYW55W10pOiBhbnkge1xuICAgICAgICBpZiAoaGFuZGxlKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoaGFuZGxlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW1tZWRpYXRlKSB7XG4gICAgICAgICAgICBjb25zdCBjYWxsTm93ID0gIWhhbmRsZTtcbiAgICAgICAgICAgIGhhbmRsZSA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuICAgICAgICAgICAgaWYgKGNhbGxOb3cpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBleGVjdXRvci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGhhbmRsZSA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQsIHRoaXMsIFsuLi5hcmdzXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgZGVib3VuY2VkLmNhbmNlbCA9IGZ1bmN0aW9uICgpOiB2b2lkIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGhhbmRsZSBhcyBUaW1lckhhbmRsZSk7XG4gICAgICAgIGhhbmRsZSA9IHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGRlYm91bmNlZCBhcyBhbnk7XG4gICAgLyogZXNsaW50LWVuYWJsZSBuby1pbnZhbGlkLXRoaXMgKi9cbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBhdCBtb3N0IG9uZSB0aW1lLCBubyBtYXR0ZXIgaG93IG9mdGVuIHlvdSBjYWxsIGl0LlxuICogQGphIDHluqbjgZfjgYvlrp/ooYzjgZXjgozjgarjgYTplqLmlbDjgpLov5TljbQuIDLlm57nm67ku6XpmY3jga/mnIDliJ3jga7jgrPjg7zjg6vjga7jgq3jg6Pjg4Pjgrfjg6XjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvbmNlPFQgZXh0ZW5kcyBGdW5jdGlvbj4oZXhlY3V0b3I6IFQpOiBUIHtcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby1pbnZhbGlkLXRoaXMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb24gKi9cbiAgICBsZXQgbWVtbzogYW55O1xuICAgIHJldHVybiBmdW5jdGlvbiAodGhpczogYW55LCAuLi5hcmdzOiBhbnlbXSk6IGFueSB7XG4gICAgICAgIGlmIChleGVjdXRvcikge1xuICAgICAgICAgICAgbWVtbyA9IGV4ZWN1dG9yLmNhbGwodGhpcywgLi4uYXJncyk7XG4gICAgICAgICAgICBleGVjdXRvciA9IG51bGwhO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtZW1vO1xuICAgIH0gYXMgYW55O1xuICAgIC8qIGVzbGludC1lbmFibGUgbm8taW52YWxpZC10aGlzLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uICovXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgZXNjYXBlIGZ1bmN0aW9uIGZyb20gbWFwLlxuICogQGphIOaWh+Wtl+e9ruaPm+mWouaVsOOCkuS9nOaIkFxuICpcbiAqIEBwYXJhbSBtYXBcbiAqICAtIGBlbmAga2V5OiB0YXJnZXQgY2hhciwgdmFsdWU6IHJlcGxhY2UgY2hhclxuICogIC0gYGphYCBrZXk6IOe9ruaPm+WvvuixoSwgdmFsdWU6IOe9ruaPm+aWh+Wtl1xuICogQHJldHVybnNcbiAqICAtIGBlbmAgZXNwYWNlIGZ1bmN0aW9uXG4gKiAgLSBgamFgIOOCqOOCueOCseODvOODl+mWouaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRXNjYXBlcihtYXA6IG9iamVjdCk6IChzcmM6IFByaW1pdGl2ZSkgPT4gc3RyaW5nIHtcbiAgICBjb25zdCBlc2NhcGVyID0gKG1hdGNoOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgICByZXR1cm4gbWFwW21hdGNoXTtcbiAgICB9O1xuXG4gICAgY29uc3Qgc291cmNlID0gYCg/OiR7T2JqZWN0LmtleXMobWFwKS5qb2luKCd8Jyl9KWA7XG4gICAgY29uc3QgcmVnZXhUZXN0ID0gUmVnRXhwKHNvdXJjZSk7XG4gICAgY29uc3QgcmVnZXhSZXBsYWNlID0gUmVnRXhwKHNvdXJjZSwgJ2cnKTtcblxuICAgIHJldHVybiAoc3JjOiBQcmltaXRpdmUpOiBzdHJpbmcgPT4ge1xuICAgICAgICBzcmMgPSAobnVsbCA9PSBzcmMgfHwgJ3N5bWJvbCcgPT09IHR5cGVvZiBzcmMpID8gJycgOiBTdHJpbmcoc3JjKTtcbiAgICAgICAgcmV0dXJuIHJlZ2V4VGVzdC50ZXN0KHNyYykgPyBzcmMucmVwbGFjZShyZWdleFJlcGxhY2UsIGVzY2FwZXIpIDogc3JjO1xuICAgIH07XG59XG5cbmNvbnN0IG1hcEh0bWxFc2NhcGUgPSB7XG4gICAgJzwnOiAnJmx0OycsXG4gICAgJz4nOiAnJmd0OycsXG4gICAgJyYnOiAnJmFtcDsnLFxuICAgICdcIic6ICcmcXVvdDsnLFxuICAgIFwiJ1wiOiAnJiMzOTsnLFxuICAgICdgJzogJyYjeDYwOydcbn07XG5cbi8qKlxuICogQGVuIEVzY2FwZSBIVE1MIHN0cmluZy5cbiAqIEBqYSBIVE1MIOOBp+S9v+eUqOOBmeOCi+aWh+Wtl+OCkuWItuW+oeaWh+Wtl+OBq+e9ruaPm1xuICpcbiAqIEBicmllZiA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IG1hcEh0bWxFc2NhcGUgPSB7XG4gKiAgICAgJzwnOiAnJmx0OycsXG4gKiAgICAgJz4nOiAnJmd0OycsXG4gKiAgICAgJyYnOiAnJmFtcDsnLFxuICogICAgICdcIic6ICcmcXVvdDsnLFxuICogICAgIFwiJ1wiOiAnJiMzOTsnLFxuICogICAgICdgJzogJyYjeDYwOydcbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGVzY2FwZUhUTUwgPSBjcmVhdGVFc2NhcGVyKG1hcEh0bWxFc2NhcGUpO1xuXG4vKipcbiAqIEBlbiBVbmVzY2FwZSBIVE1MIHN0cmluZy5cbiAqIEBqYSBIVE1MIOOBp+S9v+eUqOOBmeOCi+WItuW+oeaWh+Wtl+OCkuW+qeWFg1xuICovXG5leHBvcnQgY29uc3QgdW5lc2NhcGVIVE1MID0gY3JlYXRlRXNjYXBlcihpbnZlcnQobWFwSHRtbEVzY2FwZSkpO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byB0aGUgc3R5bGUgY29tcHVsc2lvbiB2YWx1ZSBmcm9tIGlucHV0IHN0cmluZy5cbiAqIEBqYSDlhaXlipvmloflrZfliJfjgpLlnovlvLfliLbjgZfjgZ/lgKTjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBpbnB1dCBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5a++6LGh44Gu5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b1R5cGVkRGF0YShkYXRhOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBUeXBlZERhdGEgfCB1bmRlZmluZWQge1xuICAgIGlmICgndHJ1ZScgPT09IGRhdGEpIHtcbiAgICAgICAgLy8gYm9vbGVhbjogdHJ1ZVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKCdmYWxzZScgPT09IGRhdGEpIHtcbiAgICAgICAgLy8gYm9vbGVhbjogZmFsc2VcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoJ251bGwnID09PSBkYXRhKSB7XG4gICAgICAgIC8vIG51bGxcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChkYXRhID09PSBTdHJpbmcoTnVtYmVyKGRhdGEpKSkge1xuICAgICAgICAvLyBudW1iZXI6IOaVsOWApOWkieaPmyDihpIg5paH5a2X5YiX5aSJ5o+b44Gn5YWD44Gr5oi744KL44Go44GNXG4gICAgICAgIHJldHVybiBOdW1iZXIoZGF0YSk7XG4gICAgfSBlbHNlIGlmIChkYXRhICYmIC9eKD86XFx7W1xcd1xcV10qXFx9fFxcW1tcXHdcXFddKlxcXSkkLy50ZXN0KGRhdGEpKSB7XG4gICAgICAgIC8vIG9iamVjdFxuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShkYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzdHJpbmcgLyB1bmRlZmluZWRcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIHN0cmluZyBmcm9tIFtbVHlwZWREYXRhXV0uXG4gKiBAamEgW1tUeXBlZERhdGFdXSDjgpLmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBpbnB1dCBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5a++6LGh44Gu5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tVHlwZWREYXRhKGRhdGE6IFR5cGVkRGF0YSB8IHVuZGVmaW5lZCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKHVuZGVmaW5lZCA9PT0gZGF0YSB8fCBpc1N0cmluZyhkYXRhKSkge1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGRhdGEpKSB7XG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gU3RyaW5nKGRhdGEpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBgV2ViIEFQSWAgc3RvY2tlZCB0eXBlLiA8YnI+XG4gKiAgICAgRW5zdXJlIG5vdCB0byByZXR1cm4gYHVuZGVmaW5lZGAgdmFsdWUuXG4gKiBAamEgYFdlYiBBUElgIOagvOe0jeW9ouW8j+OBq+WkieaPmyA8YnI+XG4gKiAgICAgYHVuZGVmaW5lZGAg44KS6L+U5Y2044GX44Gq44GE44GT44Go44KS5L+d6Ki8XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkcm9wVW5kZWZpbmVkPFQ+KHZhbHVlOiBUIHwgbnVsbCB8IHVuZGVmaW5lZCwgbmlsU2VyaWFsaXplID0gZmFsc2UpOiBUIHwgJ251bGwnIHwgJ3VuZGVmaW5lZCcgfCBudWxsIHtcbiAgICByZXR1cm4gbnVsbCAhPSB2YWx1ZSA/IHZhbHVlIDogKG5pbFNlcmlhbGl6ZSA/IFN0cmluZyh2YWx1ZSkgOiBudWxsKSBhcyBUIHwgJ251bGwnIHwgJ3VuZGVmaW5lZCcgfCBudWxsO1xufVxuXG4vKipcbiAqIEBlbiBEZXNlcmlhbGl6ZSBmcm9tIGBXZWIgQVBJYCBzdG9ja2VkIHR5cGUuIDxicj5cbiAqICAgICBDb252ZXJ0IGZyb20gJ251bGwnIG9yICd1bmRlZmluZWQnIHN0cmluZyB0byBvcmlnaW5hbCB0eXBlLlxuICogQGphICdudWxsJyBvciAndW5kZWZpbmVkJyDjgpLjgoLjgajjga7lnovjgavmiLvjgZlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc3RvcmVOaWw8VD4odmFsdWU6IFQgfCAnbnVsbCcgfCAndW5kZWZpbmVkJyk6IFQgfCBudWxsIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoJ251bGwnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKCd1bmRlZmluZWQnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG5sZXQgX2xvY2FsSWQgPSAwO1xuXG4vKipcbiAqIEBlbiBHZXQgbG9jYWwgdW5pcXVlIGlkLiA8YnI+XG4gKiAgICAgXCJsb2NhbCB1bmlxdWVcIiBtZWFucyBndWFyYW50ZWVzIHVuaXF1ZSBkdXJpbmcgaW4gc2NyaXB0IGxpZmUgY3ljbGUgb25seS5cbiAqIEBqYSDjg63jg7zjgqvjg6vjg6bjg4vjg7zjgq8gSUQg44Gu5Y+W5b6XIDxicj5cbiAqICAgICDjgrnjgq/jg6rjg5fjg4jjg6njgqTjg5XjgrXjgqTjgq/jg6vkuK3jga7lkIzkuIDmgKfjgpLkv53oqLzjgZnjgosuXG4gKlxuICogQHBhcmFtIHByZWZpeFxuICogIC0gYGVuYCBJRCBwcmVmaXhcbiAqICAtIGBqYWAgSUQg44Gr5LuY5LiO44GZ44KLIFByZWZpeFxuICogQHBhcmFtIHplcm9QYWRcbiAqICAtIGBlbmAgMCBwYWRkaW5nIG9yZGVyXG4gKiAgLSBgamFgIDAg6Kmw44KB44GZ44KL5qGB5pWw44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsdWlkKHByZWZpeCA9ICcnLCB6ZXJvUGFkPzogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBjb25zdCBpZCA9ICgrK19sb2NhbElkKS50b1N0cmluZygxNik7XG4gICAgcmV0dXJuIChudWxsICE9IHplcm9QYWQpID8gYCR7cHJlZml4fSR7aWQucGFkU3RhcnQoemVyb1BhZCwgJzAnKX1gIDogYCR7cHJlZml4fSR7aWR9YDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9yZWdleENhbmNlbExpa2VTdHJpbmcgPSAvKGFib3J0fGNhbmNlbCkvaW07XG5cbi8qKlxuICogQGVuIFByZXN1bWUgd2hldGhlciBpdCdzIGEgY2FuY2VsZWQgZXJyb3IuXG4gKiBAamEg44Kt44Oj44Oz44K744Or44GV44KM44Gf44Ko44Op44O844Gn44GC44KL44GL5o6o5a6aXG4gKlxuICogQHBhcmFtIGVycm9yXG4gKiAgLSBgZW5gIGFuIGVycm9yIG9iamVjdCBoYW5kbGVkIGluIGBjYXRjaGAgYmxvY2suXG4gKiAgLSBgamFgIGBjYXRjaGAg56+A44Gq44Gp44Gn6KOc6Laz44GX44Gf44Ko44Op44O844KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0NoYW5jZWxMaWtlRXJyb3IoZXJyb3I6IHVua25vd24pOiBib29sZWFuIHtcbiAgICBpZiAobnVsbCA9PSBlcnJvcikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmIChpc1N0cmluZyhlcnJvcikpIHtcbiAgICAgICAgcmV0dXJuIF9yZWdleENhbmNlbExpa2VTdHJpbmcudGVzdChlcnJvcik7XG4gICAgfSBlbHNlIGlmIChpc09iamVjdChlcnJvcikpIHtcbiAgICAgICAgcmV0dXJuIF9yZWdleENhbmNlbExpa2VTdHJpbmcudGVzdCgoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBmaXJzdCBsZXR0ZXIgb2YgdGhlIHN0cmluZyB0byB1cHBlcmNhc2UuXG4gKiBAamEg5pyA5Yid44Gu5paH5a2X44KS5aSn5paH5a2X44Gr5aSJ5o+bXG4gKlxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2FwaXRhbGl6ZShcImZvbyBCYXJcIik7XG4gKiAvLyA9PiBcIkZvbyBCYXJcIlxuICpcbiAqIGNhcGl0YWxpemUoXCJGT08gQmFyXCIsIHRydWUpO1xuICogLy8gPT4gXCJGb28gYmFyXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqIEBwYXJhbSBsb3dlcmNhc2VSZXN0XG4gKiAgLSBgZW5gIElmIGB0cnVlYCBpcyBwYXNzZWQsIHRoZSByZXN0IG9mIHRoZSBzdHJpbmcgd2lsbCBiZSBjb252ZXJ0ZWQgdG8gbG93ZXIgY2FzZVxuICogIC0gYGphYCBgdHJ1ZWAg44KS5oyH5a6a44GX44Gf5aC05ZCILCAy5paH5a2X55uu5Lul6ZmN44KC5bCP5paH5a2X5YyWXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYXBpdGFsaXplKHNyYzogc3RyaW5nLCBsb3dlcmNhc2VSZXN0ID0gZmFsc2UpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlbWFpbmluZ0NoYXJzID0gIWxvd2VyY2FzZVJlc3QgPyBzcmMuc2xpY2UoMSkgOiBzcmMuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcbiAgICByZXR1cm4gc3JjLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcmVtYWluaW5nQ2hhcnM7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIGZpcnN0IGxldHRlciBvZiB0aGUgc3RyaW5nIHRvIGxvd2VyY2FzZS5cbiAqIEBqYSDmnIDliJ3jga7mloflrZfjgpLlsI/mloflrZfljJZcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGRlY2FwaXRhbGl6ZShcIkZvbyBCYXJcIik7XG4gKiAvLyA9PiBcImZvbyBCYXJcIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVjYXBpdGFsaXplKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc3JjLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgc3JjLnNsaWNlKDEpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyB1bmRlcnNjb3JlZCBvciBkYXNoZXJpemVkIHN0cmluZyB0byBhIGNhbWVsaXplZCBvbmUuIDxicj5cbiAqICAgICBCZWdpbnMgd2l0aCBhIGxvd2VyIGNhc2UgbGV0dGVyIHVubGVzcyBpdCBzdGFydHMgd2l0aCBhbiB1bmRlcnNjb3JlLCBkYXNoIG9yIGFuIHVwcGVyIGNhc2UgbGV0dGVyLlxuICogQGphIGBfYCwgYC1gIOWMuuWIh+OCiuaWh+Wtl+WIl+OCkuOCreODo+ODoeODq+OCseODvOOCueWMliA8YnI+XG4gKiAgICAgYC1gIOOBvuOBn+OBr+Wkp+aWh+Wtl+OCueOCv+ODvOODiOOBp+OBguOCjOOBsCwg5aSn5paH5a2X44K544K/44O844OI44GM5pei5a6a5YCkXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjYW1lbGl6ZShcIm1vei10cmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIm1velRyYW5zZm9ybVwiXG4gKlxuICogY2FtZWxpemUoXCItbW96LXRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwiTW96VHJhbnNmb3JtXCJcbiAqXG4gKiBjYW1lbGl6ZShcIl9tb3pfdHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJNb3pUcmFuc2Zvcm1cIlxuICpcbiAqIGNhbWVsaXplKFwiTW96LXRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwiTW96VHJhbnNmb3JtXCJcbiAqXG4gKiBjYW1lbGl6ZShcIi1tb3otdHJhbnNmb3JtXCIsIHRydWUpO1xuICogLy8gPT4gXCJtb3pUcmFuc2Zvcm1cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICogQHBhcmFtIGxvd2VyXG4gKiAgLSBgZW5gIElmIGB0cnVlYCBpcyBwYXNzZWQsIGZvcmNlIGNvbnZlcnRzIHRvIGxvd2VyIGNhbWVsIGNhc2UgaW4gc3RhcnRzIHdpdGggdGhlIHNwZWNpYWwgY2FzZS5cbiAqICAtIGBqYWAg5by35Yi255qE44Gr5bCP5paH5a2X44K544K/44O844OI44GZ44KL5aC05ZCI44Gr44GvIGB0cnVlYCDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhbWVsaXplKHNyYzogc3RyaW5nLCBsb3dlciA9IGZhbHNlKTogc3RyaW5nIHtcbiAgICBzcmMgPSBzcmMudHJpbSgpLnJlcGxhY2UoL1stX1xcc10rKC4pPy9nLCAobWF0Y2gsIGMpID0+IHtcbiAgICAgICAgcmV0dXJuIGMgPyBjLnRvVXBwZXJDYXNlKCkgOiAnJztcbiAgICB9KTtcblxuICAgIGlmICh0cnVlID09PSBsb3dlcikge1xuICAgICAgICByZXR1cm4gZGVjYXBpdGFsaXplKHNyYyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHNyYztcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIHN0cmluZyB0byBjYW1lbGl6ZWQgY2xhc3MgbmFtZS4gRmlyc3QgbGV0dGVyIGlzIGFsd2F5cyB1cHBlciBjYXNlLlxuICogQGphIOWFiOmgreWkp+aWh+Wtl+OBruOCreODo+ODoeODq+OCseODvOOCueOBq+WkieaPm1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2xhc3NpZnkoXCJzb21lX2NsYXNzX25hbWVcIik7XG4gKiAvLyA9PiBcIlNvbWVDbGFzc05hbWVcIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gY2xhc3NpZnkoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBjYXBpdGFsaXplKGNhbWVsaXplKHNyYy5yZXBsYWNlKC9bXFxXX10vZywgJyAnKSkucmVwbGFjZSgvXFxzL2csICcnKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIGEgY2FtZWxpemVkIG9yIGRhc2hlcml6ZWQgc3RyaW5nIGludG8gYW4gdW5kZXJzY29yZWQgb25lLlxuICogQGphIOOCreODo+ODoeODq+OCseODvOOCuSBvciBgLWAg44Gk44Gq44GO5paH5a2X5YiX44KSIGBfYCDjgaTjgarjgY7jgavlpInmj5tcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIHVuZGVyc2NvcmVkKFwiTW96VHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJtb3pfdHJhbnNmb3JtXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuZGVyc2NvcmVkKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc3JjLnRyaW0oKS5yZXBsYWNlKC8oW2EtelxcZF0pKFtBLVpdKykvZywgJyQxXyQyJykucmVwbGFjZSgvWy1cXHNdKy9nLCAnXycpLnRvTG93ZXJDYXNlKCk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIGEgdW5kZXJzY29yZWQgb3IgY2FtZWxpemVkIHN0cmluZyBpbnRvIGFuIGRhc2hlcml6ZWQgb25lLlxuICogQGphIOOCreODo+ODoeODq+OCseODvOOCuSBvciBgX2Ag44Gk44Gq44GO5paH5a2X5YiX44KSIGAtYCDjgaTjgarjgY7jgavlpInmj5tcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGRhc2hlcml6ZShcIk1velRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwiLW1vei10cmFuc2Zvcm1cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGFzaGVyaXplKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc3JjLnRyaW0oKS5yZXBsYWNlKC8oW0EtWl0pL2csICctJDEnKS5yZXBsYWNlKC9bX1xcc10rL2csICctJykudG9Mb3dlckNhc2UoKTtcbn1cbiJdLCJuYW1lcyI6WyJzZXRUaW1lb3V0IiwiY2xlYXJUaW1lb3V0Il0sIm1hcHBpbmdzIjoiOzs7OztBQUFBOzs7Ozs7OztTQVFnQixTQUFTOztJQUVyQixPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sVUFBVSxJQUFJLFVBQVUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztBQUNyRixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7O1NBV2dCLFlBQVksQ0FBb0IsTUFBcUIsRUFBRSxHQUFHLEtBQWU7SUFDckYsSUFBSSxJ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
