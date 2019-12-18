/*!
 * @cdp/framework-core 0.9.0
 *   core framework
 */

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

/*!
 * @cdp/event-publisher 0.9.0
 *   pub/sub framework
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
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
 * import { EventPublisher } from '@cdp/event-publisher';
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
        const list = map.get(channel);
        if (!list) {
            return;
        }
        for (const listener of list) {
            try {
                const handled = listener(...args);
                // if received 'true', stop delegation.
                if (true === handled) {
                    break;
                }
            }
            catch (e) {
                Promise.reject(e);
            }
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
            return;
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
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @en Constructor of EventBroker
 * @ja EventBroker のコンストラクタ実体
 */
const EventBroker = EventPublisher;

/*!
 * @cdp/promise 0.9.0
 *   promise utility module
 */

/** @internal */
const _cancel = Symbol('cancel');
/** @internal */
const _close = Symbol('close');
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

/* eslint-disable no-redeclare, @typescript-eslint/no-explicit-any */
/** @internal */
const _tokens = new WeakMap();
/** @internal */
function getContext(instance) {
    if (!_tokens.has(instance)) {
        throw new TypeError('The object is not a valid CancelToken.');
    }
    return _tokens.get(instance);
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
        const linkedTokenSet = new Set(linkedTokens.filter(t => _tokens.has(t)));
        let status = 0 /* OPEN */;
        for (const t of linkedTokenSet) {
            status |= getContext(t).status;
        }
        const context = {
            publisher: new EventBroker(),
            subscriptions: new Set(),
            reason: undefined,
            status,
        };
        _tokens.set(this, Object.seal(context));
        const cancel = this[_cancel];
        const close = this[_close];
        if (status === 0 /* OPEN */) {
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
        return getContext(this).status === 0 /* OPEN */;
    }
    /**
     * @en Cancellation requested state accessor.
     * @ja キャンセルを受け付けているか判定
     */
    get requested() {
        return !!(getContext(this).status & 1 /* REQUESTED */);
    }
    /**
     * @en Cancellation closed state accessor.
     * @ja キャンセル受付を終了しているか判定
     */
    get closed() {
        return !!(getContext(this).status & 2 /* CLOSED */);
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
        return context.publisher.on('cancel', onCancel);
    }
    /** @internal */
    [_cancel](reason) {
        const context = getContext(this);
        verify('notNil', reason);
        if (!this.cancelable) {
            return;
        }
        context.reason = reason;
        context.status |= 1 /* REQUESTED */;
        for (const s of context.subscriptions) {
            s.unsubscribe();
        }
        context.publisher.publish('cancel', reason);
        Promise.resolve().then(() => this[_close]());
    }
    /** @internal */
    [_close]() {
        const context = getContext(this);
        if (this.closed) {
            return;
        }
        context.status |= 2 /* CLOSED */;
        for (const s of context.subscriptions) {
            s.unsubscribe();
        }
        context.subscriptions.clear();
        context.publisher.off();
    }
}

/* eslint-disable no-global-assign, @typescript-eslint/no-explicit-any */
/** `Native Promise` constructor */
const NativePromise = Promise;
/** @internal */
const _create = Symbol('create');
/** @internal */
const _tokens$1 = new WeakMap();
/**
 * @en Extended `Promise` class which enabled cancellation. <br>
 *     `Native Promise` constructor is overridden by framework default behaviour.
 * @ja キャンセルを可能にした `Promise` 拡張クラス <br>
 *     既定で `Native Promise` をオーバーライドする.
 */
class CancelablePromise extends NativePromise {
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
                super.prototype.then.call(src, resolve, reject);
            });
            const dispose = () => {
                s.unsubscribe();
                _tokens$1.delete(p);
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
            p = super.prototype.then.apply(p, thenArgs);
        }
        if (token && token.cancelable) {
            _tokens$1.set(p, token);
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
        return CancelablePromise[_create](this, _tokens$1.get(this), [onfulfilled, onrejected]);
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
        return CancelablePromise[_create](super.finally(onfinally), _tokens$1.get(this));
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

/* eslint-disable @typescript-eslint/explicit-function-return-type */
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
        this._pool.set(promise, cancelSource && cancelSource.cancel);
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
     * @en Call `Promise.all()` for under the management.
     * @ja 管理対象に対して `Promise.all()`
     */
    all() {
        return Promise.all(this.promises());
    }
    /**
     * @en Call `Promise.race()` for under the management.
     * @ja 管理対象に対して `Promise.race()`
     */
    race() {
        return Promise.race(this.promises());
    }
    /**
     * @en Call [[wait]]() for under the management.
     * @ja 管理対象に対して [[wait]]()
     */
    wait() {
        return wait(this.promises());
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
 * @cdp/observable 0.9.0
 *   observable utility module
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/** @internal EventBrokerProxy */
class EventBrokerProxy {
    get() {
        return this._broker || (this._broker = new EventBroker());
    }
}
/** @internal */
const _internal = Symbol('internal');
/** @internal */
const _notify = Symbol('notify');
/** @internal */
const _stockChange = Symbol('stock-change');
/** @internal */
const _notifyChanges = Symbol('notify-changes');
/** @internal */
function verifyObservable(x) {
    if (!x || !x[_internal]) {
        throw new TypeError(`The object passed is not an IObservable.`);
    }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
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

/* eslint-disable @typescript-eslint/no-explicit-any */
/** @internal */
const _proxyHandler = {
    set(target, p, value, receiver) {
        if (!isString(p)) {
            return Reflect.set(target, p, value, receiver);
        }
        const oldValue = target[p];
        if ("disabled" /* DISABLED */ !== target[_internal].state && value !== oldValue) {
            target[_stockChange](p, oldValue);
        }
        return Reflect.set(target, p, value, receiver);
    },
};
Object.freeze(_proxyHandler);
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
    constructor(state = "active" /* ACTIVE */) {
        verify('instanceOf', ObservableObject, this);
        const internal = {
            state,
            changed: false,
            changeMap: new Map(),
            broker: new EventBrokerProxy(),
        };
        Object.defineProperty(this, _internal, { value: Object.seal(internal) });
        return new Proxy(this, _proxyHandler);
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
        this[_internal].state = noRecord ? "disabled" /* DISABLED */ : "suspended" /* SUSEPNDED */;
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
        if ("active" /* ACTIVE */ !== internal.state) {
            internal.state = "active" /* ACTIVE */;
            post(() => this[_notifyChanges]());
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
    // implements: IObservableEventTrigger
    /** @internal */
    trigger(channel, ...args) {
        const { broker } = this[_internal];
        broker.get().publish(channel, ...args);
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
        }("disabled" /* DISABLED */), src);
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
            if ("active" /* ACTIVE */ === state) {
                post(() => this[_notifyChanges]());
            }
        }
        else {
            changeMap.has(p) || changeMap.set(p, oldValue);
        }
    }
    /** @internal */
    [_notifyChanges]() {
        const { state, changeMap } = this[_internal];
        if ("active" /* ACTIVE */ !== state) {
            return;
        }
        const keyValuePairs = new Map();
        for (const [key, oldValue] of changeMap) {
            const curValue = this[key];
            if (oldValue !== curValue) {
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
            eventBroker.publish(key, ...values, key);
        }
        if (changed) {
            eventBroker.publish('*', this);
        }
    }
}

/* eslint-disable prefer-rest-params, @typescript-eslint/no-explicit-any */
/** @internal */
const _proxyHandler$1 = {
    defineProperty(target, p, attributes) {
        const internal = target[_internal];
        if ("disabled" /* DISABLED */ === internal.state || internal.byMethod || !Object.prototype.hasOwnProperty.call(attributes, 'value')) {
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
                        target[_stockChange](-1 /* REMOVE */, i, undefined, scrap[i - newLength]);
                    }
                }
                else { // oldLength < newLength
                    for (let i = oldLength; i < newLength; i++) {
                        target[_stockChange](1 /* INSERT */, i /*, undefined, undefined */);
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
        if ("disabled" /* DISABLED */ === internal.state || internal.byMethod || !Object.prototype.hasOwnProperty.call(target, p)) {
            return Reflect.deleteProperty(target, p);
        }
        const oldValue = target[p];
        const result = Reflect.deleteProperty(target, p);
        result && isValidArrayIndex(p) && target[_stockChange](0 /* UPDATE */, p >>> 0, undefined, oldValue);
        return result;
    },
};
Object.freeze(_proxyHandler$1);
/** @internal valid array index helper */
function isValidArrayIndex(index) {
    const s = String(index);
    const n = Math.trunc(s);
    return String(n) === s && 0 <= n && n < 0xFFFFFFFF;
}
/** @internal helper for index management */
function findRelatedChangeIndex(records, type, index) {
    const checkType = type === 1 /* INSERT */
        ? (t) => t === -1 /* REMOVE */
        : (t) => t !== -1 /* REMOVE */;
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
            state: "active" /* ACTIVE */,
            byMethod: false,
            records: [],
            indexes: new Set(),
            broker: new EventBrokerProxy(),
        };
        Object.defineProperty(this, _internal, { value: Object.seal(internal) });
        const argLength = arguments.length;
        if (1 === argLength && isNumber(arguments[0])) {
            const len = arguments[0] >>> 0;
            for (let i = 0; i < len; i++) {
                this[_stockChange](1 /* INSERT */, i /*, undefined */);
            }
        }
        else if (0 < argLength) {
            for (let i = 0; i < argLength; i++) {
                this[_stockChange](1 /* INSERT */, i, arguments[i]);
            }
        }
        return new Proxy(this, _proxyHandler$1);
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
        this[_internal].state = noRecord ? "disabled" /* DISABLED */ : "suspended" /* SUSEPNDED */;
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
        if ("active" /* ACTIVE */ !== internal.state) {
            internal.state = "active" /* ACTIVE */;
            post(() => this[_notifyChanges]());
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
        if ("disabled" /* DISABLED */ !== internal.state) {
            const len = old.length;
            for (let i = 0; i < len; i++) {
                const oldValue = old[i];
                const newValue = this[i];
                if (newValue !== oldValue) {
                    this[_stockChange](0 /* UPDATE */, i, newValue, oldValue);
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
        if ("disabled" /* DISABLED */ !== internal.state) {
            start = Math.trunc(start);
            const from = start < 0 ? Math.max(oldLen + start, 0) : Math.min(start, oldLen);
            for (let i = result.length; --i >= 0;) {
                this[_stockChange](-1 /* REMOVE */, from + i, undefined, result[i]);
            }
            const len = items.length;
            for (let i = 0; i < len; i++) {
                this[_stockChange](1 /* INSERT */, from + i, items[i]);
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
        if ("disabled" /* DISABLED */ !== internal.state && this.length < oldLen) {
            this[_stockChange](-1 /* REMOVE */, 0, undefined, result);
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
        if ("disabled" /* DISABLED */ !== internal.state) {
            const len = items.length;
            for (let i = 0; i < len; i++) {
                this[_stockChange](1 /* INSERT */, i, items[i]);
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
         * return (super.map as any)(...arguments);
         */
        return ObservableArray.from([...this].map(callbackfn, thisArg));
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
                if (type !== -1 /* REMOVE */) {
                    // INSERT => UPDATE : INSERT
                    // REMOVE => INSERT : UPDATE
                    this[_stockChange](Number(!type), index, newValue, prevRecord.oldValue);
                }
            }
            return;
        }
        indexes.add(index);
        records[len] = { type, index, newValue, oldValue };
        if ("active" /* ACTIVE */ === state && 0 === len) {
            post(() => this[_notifyChanges]());
        }
    }
    /** @internal */
    [_notifyChanges]() {
        const { state, records } = this[_internal];
        if ("active" /* ACTIVE */ !== state || 0 === records.length) {
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
        internal.broker.get().publish('@', records);
    }
}

/*!
 * @cdp/result 0.9.0
 *   result utility module
 */

/* eslint-disable no-inner-declarations, @typescript-eslint/no-namespace, @typescript-eslint/no-unused-vars */
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
     *
     * @internal
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
        if (code < 0 || 1000 /* MAX */ <= code) {
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
        return `${prefix}[${"UNKNOWN" /* UNKNOWN_ERROR_NAME */}]`;
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

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable-next-line @typescript-eslint/unbound-method */
const isNumber$1 = Number.isFinite;
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
        code = isNil(code) ? RESULT_CODE.SUCCESS : isNumber$1(code) ? Math.trunc(code) : RESULT_CODE.FAIL;
        super(message || toHelpString(code));
        let time = isError(cause) ? cause.time : undefined;
        isNumber$1(time) || (time = Date.now());
        const descriptors = {
            code: { enumerable: true, value: code },
            cause: { enumerable: true, value: cause },
            time: { enumerable: true, value: time },
        };
        Object.defineProperties(this, descriptors);
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
        return "Result" /* RESULT */;
    }
}
Result.prototype.name = "Result" /* RESULT */;
/** @interna lReturns `true` if `x` is `Error`, `false` otherwise. */
function isError(x) {
    return x instanceof Error || className(x) === "Error" /* ERROR */;
}
/** Returns `true` if `x` is `Result`, `false` otherwise. */
function isResult(x) {
    return x instanceof Result || className(x) === "Result" /* RESULT */;
}
/**
 * @en Transfer [[Result]] object
 * @ja [[Result]] オブジェクトに変換
 */
function toResult(o) {
    if (o instanceof Result) {
        /* eslint-disable-next-line prefer-const */
        let { code, cause, time } = o;
        code = isNil(code) ? RESULT_CODE.SUCCESS : isNumber$1(code) ? Math.trunc(code) : RESULT_CODE.FAIL;
        isNumber$1(time) || (time = Date.now());
        // Do nothing if already defined
        Reflect.defineProperty(o, 'code', { enumerable: true, value: code });
        Reflect.defineProperty(o, 'cause', { enumerable: true, value: cause });
        Reflect.defineProperty(o, 'time', { enumerable: true, value: time });
        return o;
    }
    else {
        const e = Object(o);
        const code = isNumber$1(e.code) ? e.code : o;
        const message = isString(e.message) ? e.message : isString(o) ? o : undefined;
        const cause = isError(e.cause) ? e.cause : isError(o) ? o : isString(o) ? new Error(o) : o;
        return new Result(code, message, cause);
    }
}
/**
 * @en Create [[Result]] helper
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
 * @en Create canceled [[Result]] helper
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
 * @cdp/core-storage 0.9.0
 *   core storage utility module
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
//__________________________________________________________________________________________________//
/**
 * @en Memory storage class. This class doesn't support permaneciation data.
 * @ja メモリーストレージクラス. 本クラスはデータの永続化をサポートしない
 */
class MemoryStorage {
    constructor() {
        this._broker = new EventBroker();
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
            !options.silent && this._broker.publish('@', key, newVal, oldVal);
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
            !options.silent && this._broker.publish('@', key, null, oldVal);
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
            !options.silent && this._broker.publish('@', null, null, null);
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
}
// default storage
const memoryStorage = new MemoryStorage();

/* eslint-disable @typescript-eslint/no-explicit-any */
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
            post(() => this.publish('change', '*'));
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
            this._storage.setItem(this._rootKey, this._store, { ...this._defaultOptions, ...options });
        }
        if (!silent) {
            post(() => this.publish('change', key, newVal, oldVal));
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
        this._storage.removeItem(this._rootKey, options);
        if (!options.silent) {
            this.publish('change', null, null, null);
        }
    }
    ///////////////////////////////////////////////////////////////////////
    // private methods:
    /** get root object */
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
 * @cdp/template 0.9.0
 *   template engine
 */

const globalSettings = {
    tags: ['{{', '}}'],
    escape: escapeHTML,
};

/**
 * @en Build cache key.
 * @ja キャッシュキーの生成
 */
function buildCacheKey(template, tags) {
    return `${template}:${tags.join(':')}`;
}
/**
 * @en Clears all cached templates in cache pool.
 * @ja すべてのテンプレートキャッシュを破棄
 */
function clearCache() {
    const namespace = getGlobalNamespace("CDP_DECLARE" /* NAMESPACE */);
    namespace["TEMPLATE_CACHE" /* ROOT */] = {};
}
/** global cache pool */
const cache = ensureObject(null, "CDP_DECLARE" /* NAMESPACE */, "TEMPLATE_CACHE" /* ROOT */);

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

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-this-alias */
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
            let context = this;
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
                            lookupHit = (hasProperty(intermediateValue, names[index]) ||
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
                    lookupHit = hasProperty(context._view, name);
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
            if ('text' === token[0 /* TYPE */] && lastToken && 'text' === lastToken[0 /* TYPE */]) {
                lastToken[1 /* VALUE */] += token[1 /* VALUE */];
                lastToken[3 /* END */] = token[3 /* END */];
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
        switch (token[0 /* TYPE */]) {
            case '#':
            case '^':
                collector.push(token);
                sections.push(token);
                collector = token[4 /* TOKEN_LIST */] = [];
                break;
            case '/':
                section = sections.pop();
                section[5 /* TAG_INDEX */] = token[2 /* START */];
                collector = sections.length > 0 ? sections[sections.length - 1][4 /* TOKEN_LIST */] : nestedTokens;
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
            openingTag: new RegExp(`${escapeTemplateExp(tagsToCompile[0 /* OPEN */])}\\s*`),
            closingTag: new RegExp(`\\s*${escapeTemplateExp(tagsToCompile[1 /* CLOSE */])}`),
            closingCurly: new RegExp(`\\s*${escapeTemplateExp(`}${tagsToCompile[1 /* CLOSE */]}`)}`),
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
                throw new Error(`Unclosed section "${openSection[1 /* VALUE */]}" at ${start}`);
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
        throw new Error(`Unclosed section "${openSection[1 /* VALUE */]}" at ${scanner.pos}`);
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
            switch (token[0 /* TYPE */]) {
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
        let value = context.lookup(token[1 /* VALUE */]);
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
                buffer += this.renderTokens(token[4 /* TOKEN_LIST */], context.push(v), partials, originalTemplate);
            }
        }
        else if ('object' === typeof value || 'string' === typeof value || 'number' === typeof value) {
            buffer += this.renderTokens(token[4 /* TOKEN_LIST */], context.push(value), partials, originalTemplate);
        }
        else if (isFunction(value)) {
            if ('string' !== typeof originalTemplate) {
                throw new Error('Cannot use higher-order sections without the original template');
            }
            // Extract the portion of the original template that the section contains.
            value = value.call(context.view, originalTemplate.slice(token[3 /* END */], token[5 /* TAG_INDEX */]), subRender);
            if (null != value) {
                buffer += value;
            }
        }
        else {
            buffer += this.renderTokens(token[4 /* TOKEN_LIST */], context, partials, originalTemplate);
        }
        return buffer;
    }
    /** @internal */
    renderInverted(token, context, partials, originalTemplate) {
        const value = context.lookup(token[1 /* VALUE */]);
        if (!value || (isArray(value) && 0 === value.length)) {
            return this.renderTokens(token[4 /* TOKEN_LIST */], context, partials, originalTemplate);
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
        const value = isFunction(partials) ? partials(token[1 /* VALUE */]) : partials[token[1 /* VALUE */]];
        if (null != value) {
            const lineHasNonSpace = token[6 /* HAS_NO_SPACE */];
            const tagIndex = token[5 /* TAG_INDEX */];
            const indentation = token[4 /* TOKEN_LIST */];
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
        const value = context.lookup(token[1 /* VALUE */]);
        if (null != value) {
            return value;
        }
    }
    /** @internal */
    escapedValue(token, context) {
        const value = context.lookup(token[1 /* VALUE */]);
        if (null != value) {
            return globalSettings.escape(value);
        }
    }
    /** @internal */
    rawValue(token) {
        return token[1 /* VALUE */];
    }
}

/** [[Template]] common settings */
globalSettings.writer = new Writer();
/**
 * @en Template utility class.
 * @ja Template ユーティリティクラス
 */
class Template {
    ///////////////////////////////////////////////////////////////////////
    // public static methods:
    /**
     * @en Get [[JST]] from template source.
     * @ja テンプレート文字列から [[JST]] を取得
     *
     * @package template
     *  - `en` template source string
     *  - `ja` テンプレート文字列
     * @package options
     *  - `en` compile options
     *  - `ja` コンパイルオプション
     */
    static compile(template, options) {
        if (!isString(template)) {
            throw new TypeError(`Invalid template! the first argument should be a "string" but "${typeString(template)}" was given for Template.compile(template, options)`);
        }
        const { tags } = options || globalSettings;
        const { writer } = globalSettings;
        const jst = (view, partials) => {
            return writer.render(template, view || {}, partials, tags);
        };
        const { tokens, cacheKey } = writer.parse(template, tags);
        jst.tokens = tokens;
        jst.cacheKey = cacheKey;
        jst.cacheLocation = ["CDP_DECLARE" /* NAMESPACE */, "TEMPLATE_CACHE" /* ROOT */];
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
     * @en Change [[Template]] global settings.
     * @ja [[Template]] グローバル設定の更新
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

export { ASSIGN_RESULT_CODE, CancelToken, CancelablePromise, DECLARE_ERROR_CODE, DECLARE_SUCCESS_CODE, EventBroker, EventPublisher, FAILED, MemoryStorage, ObservableArray, ObservableObject, CancelablePromise as Promise, PromiseManager, RESULT_CODE, Registry, Result, SUCCEEDED, Template, camelize, capitalize, checkCanceled, className, classify, _clearInterval as clearInterval, _clearTimeout as clearTimeout, createEscaper, dasherize, decapitalize, deepCopy, deepEqual, deepMerge, dropUndefined, ensureObject, escapeHTML, every, exists, extendPromise, filter, find, findIndex, fromTypedData, getConfig, getGlobal, getGlobalNamespace, groupBy, hasProperty, indices, instanceOf, isArray, isBoolean, isChancelLikeError, isEmptyObject, isFunction, isIterable, isNil, isNumber, isObject, isObservable, isPlainObject, isPrimitive, isResult, isString, isSymbol, isTypedArray, luid, makeCanceledResult, makeResult, map, memoryStorage, mixins, noop, ownInstanceOf, partialize, post, reduce, restoreNil, safe, sameClass, sameType, _setInterval as setInterval, setMixClassAttribute, _setTimeout as setTimeout, shuffle, sleep, some, sort, toHelpString, toNameString, toResult, toTypedData, typeOf, underscored, unique, verify, wait };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJhbWV3b3JrLWNvcmUubWpzIiwic291cmNlcyI6WyJjb3JlLXV0aWxzL2NvbmZpZy50cyIsImNvcmUtdXRpbHMvdHlwZXMudHMiLCJjb3JlLXV0aWxzL3ZlcmlmeS50cyIsImNvcmUtdXRpbHMvZGVlcC1jaXJjdWl0LnRzIiwiY29yZS11dGlscy9taXhpbnMudHMiLCJjb3JlLXV0aWxzL2FycmF5LnRzIiwiY29yZS11dGlscy9zYWZlLnRzIiwiY29yZS11dGlscy90aW1lci50cyIsImNvcmUtdXRpbHMvbWlzYy50cyIsImV2ZW50LXB1Ymxpc2hlci9wdWJsaXNoZXIudHMiLCJldmVudC1wdWJsaXNoZXIvYnJva2VyLnRzIiwicHJvbWlzZS9pbnRlcm5hbC50cyIsInByb21pc2UvY2FuY2VsLXRva2VuLnRzIiwicHJvbWlzZS9jYW5jZWxhYmxlLXByb21pc2UudHMiLCJwcm9taXNlL3V0aWxzLnRzIiwib2JzZXJ2YWJsZS9pbnRlcm5hbC50cyIsIm9ic2VydmFibGUvY29tbW9uLnRzIiwib2JzZXJ2YWJsZS9vYmplY3QudHMiLCJvYnNlcnZhYmxlL2FycmF5LnRzIiwicmVzdWx0L3Jlc3VsdC1jb2RlLWRlZnMudHMiLCJyZXN1bHQvcmVzdWx0LWNvZGUudHMiLCJyZXN1bHQvcmVzdWx0LnRzIiwiY29yZS1zdG9yYWdlL21lbW9yeS1zdG9yYWdlLnRzIiwiY29yZS1zdG9yYWdlL3JlZ2lzdHJ5LnRzIiwidGVtcGxhdGUvaW50ZXJuYWwudHMiLCJ0ZW1wbGF0ZS9jYWNoZS50cyIsInRlbXBsYXRlL3V0aWxzLnRzIiwidGVtcGxhdGUvc2Nhbm5lci50cyIsInRlbXBsYXRlL2NvbnRleHQudHMiLCJ0ZW1wbGF0ZS9wYXJzZS50cyIsInRlbXBsYXRlL3dyaXRlci50cyIsInRlbXBsYXRlL2NsYXNzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGVuIFNhZmUgYGdsb2JhbGAgYWNjZXNzb3IuXG4gKiBAamEgYGdsb2JhbGAg44Ki44Kv44K744OD44K1XG4gKiBcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIGBnbG9iYWxgIG9iamVjdCBvZiB0aGUgcnVudGltZSBlbnZpcm9ubWVudFxuICogIC0gYGphYCDnkrDlooPjgavlv5zjgZjjgZ8gYGdsb2JhbGAg44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWwoKTogdHlwZW9mIGdsb2JhbFRoaXMge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1uZXctZnVuY1xuICAgIHJldHVybiAoJ29iamVjdCcgPT09IHR5cGVvZiBnbG9iYWxUaGlzKSA/IGdsb2JhbFRoaXMgOiBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xufVxuXG4vKipcbiAqIEBlbiBFbnN1cmUgbmFtZWQgb2JqZWN0IGFzIHBhcmVudCdzIHByb3BlcnR5LlxuICogQGphIOimquOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumuOBl+OBpiwg5ZCN5YmN44Gr5oyH5a6a44GX44Gf44Kq44OW44K444Kn44Kv44OI44Gu5a2Y5Zyo44KS5L+d6Ki8XG4gKlxuICogQHBhcmFtIHBhcmVudFxuICogIC0gYGVuYCBwYXJlbnQgb2JqZWN0LiBJZiBudWxsIGdpdmVuLCBgZ2xvYmFsVGhpc2AgaXMgYXNzaWduZWQuXG4gKiAgLSBgamFgIOimquOCquODluOCuOOCp+OCr+ODiC4gbnVsbCDjga7loLTlkIjjga8gYGdsb2JhbFRoaXNgIOOBjOS9v+eUqOOBleOCjOOCi1xuICogQHBhcmFtIG5hbWVzXG4gKiAgLSBgZW5gIG9iamVjdCBuYW1lIGNoYWluIGZvciBlbnN1cmUgaW5zdGFuY2UuXG4gKiAgLSBgamFgIOS/neiovOOBmeOCi+OCquODluOCuOOCp+OCr+ODiOOBruWQjeWJjVxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlT2JqZWN0PFQgZXh0ZW5kcyB7fSA9IHt9PihwYXJlbnQ6IG9iamVjdCB8IG51bGwsIC4uLm5hbWVzOiBzdHJpbmdbXSk6IFQge1xuICAgIGxldCByb290ID0gcGFyZW50IHx8IGdldEdsb2JhbCgpO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBuYW1lcykge1xuICAgICAgICByb290W25hbWVdID0gcm9vdFtuYW1lXSB8fCB7fTtcbiAgICAgICAgcm9vdCA9IHJvb3RbbmFtZV07XG4gICAgfVxuICAgIHJldHVybiByb290IGFzIFQ7XG59XG5cbi8qKlxuICogQGVuIEdsb2JhbCBuYW1lc3BhY2UgYWNjZXNzb3IuXG4gKiBAamEg44Kw44Ot44O844OQ44Or44ON44O844Og44K544Oa44O844K544Ki44Kv44K744OD44K1XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWxOYW1lc3BhY2U8VCBleHRlbmRzIHt9ID0ge30+KG5hbWVzcGFjZTogc3RyaW5nKTogVCB7XG4gICAgcmV0dXJuIGVuc3VyZU9iamVjdDxUPihudWxsLCBuYW1lc3BhY2UpO1xufVxuXG4vKipcbiAqIEBlbiBHbG9iYWwgY29uZmlnIGFjY2Vzc29yLlxuICogQGphIOOCsOODreODvOODkOODq+OCs+ODs+ODleOCo+OCsOOCouOCr+OCu+ODg+OCtVxuICpcbiAqIEByZXR1cm5zIGRlZmF1bHQ6IGBDRFAuQ29uZmlnYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnPFQgZXh0ZW5kcyB7fSA9IHt9PihuYW1lc3BhY2UgPSAnQ0RQJywgY29uZmlnTmFtZSA9ICdDb25maWcnKTogVCB7XG4gICAgcmV0dXJuIGVuc3VyZU9iamVjdDxUPihnZXRHbG9iYWxOYW1lc3BhY2UobmFtZXNwYWNlKSwgY29uZmlnTmFtZSk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbi8qKlxuICogQGVuIFRoZSBnZW5lcmFsIG51bGwgdHlwZS5cbiAqIEBqYSDnqbrjgpLnpLrjgZnlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgTmlsID0gdm9pZCB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVuIFRoZSB0eXBlIG9mIG9iamVjdCBvciBbW05pbF1dLlxuICogQGphIFtbTmlsXV0g44Gr44Gq44KK44GI44KL44Kq44OW44K444Kn44Kv44OI5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIE5pbGxhYmxlPFQgZXh0ZW5kcyB7fT4gPSBUIHwgTmlsO1xuXG4vKipcbiAqIEBlbiBQcmltaXRpdmUgdHlwZSBvZiBKYXZhU2NyaXB0LlxuICogQGphIEphdmFTY3JpcHQg44Gu44OX44Oq44Of44OG44Kj44OW5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFByaW1pdGl2ZSA9IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBzeW1ib2wgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlbiBKYXZhU2NyaXB0IHR5cGUgc2V0IGludGVyZmFjZS5cbiAqIEBqYSBKYXZhU2NyaXB0IOOBruWei+OBrumbhuWQiFxuICovXG5pbnRlcmZhY2UgVHlwZUxpc3Qge1xuICAgIHN0cmluZzogc3RyaW5nO1xuICAgIG51bWJlcjogbnVtYmVyO1xuICAgIGJvb2xlYW46IGJvb2xlYW47XG4gICAgc3ltYm9sOiBzeW1ib2w7XG4gICAgdW5kZWZpbmVkOiB2b2lkIHwgdW5kZWZpbmVkO1xuICAgIG9iamVjdDogb2JqZWN0IHwgbnVsbDtcbiAgICBmdW5jdGlvbiguLi5hcmdzOiB1bmtub3duW10pOiB1bmtub3duO1xufVxuXG4vKipcbiAqIEBlbiBUaGUga2V5IGxpc3Qgb2YgW1tUeXBlTGlzdF1dLlxuICogQGphIFtbVHlwZUxpc3RdXSDjgq3jg7zkuIDopqdcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZUtleXMgPSBrZXlvZiBUeXBlTGlzdDtcblxuLyoqXG4gKiBAZW4gVHlwZSBiYXNlIGRlZmluaXRpb24uXG4gKiBAamEg5Z6L44Gu6KaP5a6a5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZTxUIGV4dGVuZHMge30+IGV4dGVuZHMgRnVuY3Rpb24ge1xuICAgIHJlYWRvbmx5IHByb3RvdHlwZTogVDtcbn1cblxuLyoqXG4gKiBAZW4gVHlwZSBvZiBjb25zdHJ1Y3Rvci5cbiAqIEBqYSDjgrPjg7Pjgrnjg4jjg6njgq/jgr/lnotcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb25zdHJ1Y3RvcjxUPiBleHRlbmRzIFR5cGU8VD4ge1xuICAgIG5ldyguLi5hcmdzOiB1bmtub3duW10pOiBUO1xufVxuXG4vKipcbiAqIEBlbiBUeXBlIG9mIGNsYXNzLlxuICogQGphIOOCr+ODqeOCueWei1xuICovXG5leHBvcnQgdHlwZSBDbGFzczxUID0gYW55PiA9IENvbnN0cnVjdG9yPFQ+O1xuXG4vKipcbiAqIEBlbiBFbnN1cmUgZm9yIGZ1bmN0aW9uIHBhcmFtZXRlcnMgdG8gdHVwbGUuXG4gKiBAamEg6Zai5pWw44OR44Op44Oh44O844K/44Go44GX44GmIHR1cGxlIOOCkuS/neiovFxuICovXG5leHBvcnQgdHlwZSBBcmd1bWVudHM8VD4gPSBUIGV4dGVuZHMgYW55W10gPyBUIDogW1RdO1xuXG4vKipcbiAqIEBlbiBSbW92ZSBgcmVhZG9ubHlgIGF0dHJpYnV0ZXMgZnJvbSBpbnB1dCB0eXBlLlxuICogQGphIGByZWFkb25seWAg5bGe5oCn44KS6Kej6ZmkXG4gKi9cbmV4cG9ydCB0eXBlIFdyaXRhYmxlPFQ+ID0geyAtcmVhZG9ubHkgW0sgaW4ga2V5b2YgVF06IFRbS10gfTtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBmdW5jdGlvbmFsIHByb3BlcnR5IG5hbWVzLlxuICogQGphIOmWouaVsOODl+ODreODkeODhuOCo+WQjeOBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBGdW5jdGlvblByb3BlcnR5TmFtZXM8VD4gPSB7IFtLIGluIGtleW9mIFRdOiBUW0tdIGV4dGVuZHMgRnVuY3Rpb24gPyBLIDogbmV2ZXIgfVtrZXlvZiBUXTtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBmdW5jdGlvbmFsIHByb3BlcnRpZXMuXG4gKiBAamEg6Zai5pWw44OX44Ot44OR44OG44Kj44Gu5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIEZ1bmN0aW9uUHJvcGVydGllczxUPiA9IFBpY2s8VCwgRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+PjtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBub24tZnVuY3Rpb25hbCBwcm9wZXJ0eSBuYW1lcy5cbiAqIEBqYSDpnZ7plqLmlbDjg5fjg63jg5Hjg4bjgqPlkI3jga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+ID0geyBbSyBpbiBrZXlvZiBUXTogVFtLXSBleHRlbmRzIEZ1bmN0aW9uID8gbmV2ZXIgOiBLIH1ba2V5b2YgVF07XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgbm9uLWZ1bmN0aW9uYWwgcHJvcGVydGllcy5cbiAqIEBqYSDpnZ7plqLmlbDjg5fjg63jg5Hjg4bjgqPjga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgTm9uRnVuY3Rpb25Qcm9wZXJ0aWVzPFQ+ID0gUGljazxULCBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VD4+O1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG9iamVjdCBrZXkgbGlzdC4gKGBrZXlvZmAgYWxpYXMpXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu44Kt44O85LiA6Kan44KS5oq95Ye6IChga2V5b2ZgIGFsaWFzKVxuICovXG5leHBvcnQgdHlwZSBLZXlzPFQgZXh0ZW5kcyB7fT4gPSBrZXlvZiBUO1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG9iamVjdCB0eXBlIGxpc3QuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu5Z6L5LiA6Kan44KS5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVzPFQgZXh0ZW5kcyB7fT4gPSBUW2tleW9mIFRdO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IG9iamVjdCBrZXkgdG8gdHlwZS5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjgq3jg7zjgYvjgonlnovjgbjlpInmj5tcbiAqL1xuZXhwb3J0IHR5cGUgS2V5VG9UeXBlPE8gZXh0ZW5kcyB7fSwgSyBleHRlbmRzIGtleW9mIE8+ID0gSyBleHRlbmRzIGtleW9mIE8gPyBPW0tdIDogbmV2ZXI7XG5cbi8qKlxuICogQGVuIENvbnZlcnQgb2JqZWN0IHR5cGUgdG8ga2V5LlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOWei+OBi+OCieOCreODvOOBuOWkieaPm1xuICovXG5leHBvcnQgdHlwZSBUeXBlVG9LZXk8TyBleHRlbmRzIHt9LCBUIGV4dGVuZHMgVHlwZXM8Tz4+ID0geyBbSyBpbiBrZXlvZiBPXTogT1tLXSBleHRlbmRzIFQgPyBLIDogbmV2ZXIgfVtrZXlvZiBPXTtcblxuLyoqXG4gKiBAZW4gVGhlIFtbUGxhaW5PYmplY3RdXSB0eXBlIGlzIGEgSmF2YVNjcmlwdCBvYmplY3QgY29udGFpbmluZyB6ZXJvIG9yIG1vcmUga2V5LXZhbHVlIHBhaXJzLiA8YnI+XG4gKiAgICAgJ1BsYWluJyBtZWFucyBpdCBmcm9tIG90aGVyIGtpbmRzIG9mIEphdmFTY3JpcHQgb2JqZWN0cy4gZXg6IG51bGwsIHVzZXItZGVmaW5lZCBhcnJheXMsIGFuZCBob3N0IG9iamVjdHMgc3VjaCBhcyBgZG9jdW1lbnRgLlxuICogQGphIDAg5Lul5LiK44GuIGtleS12YWx1ZSDjg5rjgqLjgpLmjIHjgaQgW1tQbGFpbk9iamVjdF1dIOWumue+qSA8YnI+VGhlIFBsYWluT2JqZWN0IHR5cGUgaXMgYSBKYXZhU2NyaXB0IG9iamVjdCBjb250YWluaW5nIHplcm8gb3IgbW9yZSBrZXktdmFsdWUgcGFpcnMuIDxicj5cbiAqICAgICAnUGxhaW4nIOOBqOOBr+S7luOBrueorumhnuOBriBKYXZhU2NyaXB0IOOCquODluOCuOOCp+OCr+ODiOOCkuWQq+OBvuOBquOBhOOCquODluOCuOOCp+OCr+ODiOOCkuaEj+WRs+OBmeOCiy4g5L6LOiAgbnVsbCwg44Om44O844K244O85a6a576p6YWN5YiXLCDjgb7jgZ/jga8gYGRvY3VtZW50YCDjga7jgojjgYbjgarntYTjgb/ovrzjgb/jgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGFpbk9iamVjdDxUID0gYW55PiB7XG4gICAgW2tleTogc3RyaW5nXTogVDtcbn1cblxuLyoqXG4gKiBAZW4gVGhlIGRhdGEgdHlwZSBsaXN0IGJ5IHdoaWNoIHN0eWxlIGNvbXB1bHNpb24gaXMgcG9zc2libGUuXG4gKiBAamEg5Z6L5by35Yi25Y+v6IO944Gq44OH44O844K/5Z6L5LiA6KanXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVkRGF0YSA9IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsIHwgb2JqZWN0O1xuXG4vKipcbiAqIEBlbiBUaGUgZGF0YSB0eXBlIGxpc3Qgb2YgVHlwZWRBcnJheS5cbiAqIEBqYSBUeXBlZEFycmF5IOS4gOimp1xuICovXG5leHBvcnQgdHlwZSBUeXBlZEFycmF5ID0gSW50OEFycmF5IHwgVWludDhBcnJheSB8IFVpbnQ4Q2xhbXBlZEFycmF5IHwgSW50MTZBcnJheSB8IFVpbnQxNkFycmF5IHwgSW50MzJBcnJheSB8IFVpbnQzMkFycmF5IHwgRmxvYXQzMkFycmF5IHwgRmxvYXQ2NEFycmF5O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGV4aXN0cy5cbiAqIEBqYSDlgKTjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleGlzdHM8TyBleHRlbmRzIHt9Pih4OiBOaWxsYWJsZTxPPik6IHggaXMgTztcbmV4cG9ydCBmdW5jdGlvbiBleGlzdHMoeDogdW5rbm93bik6IHggaXMgdW5rbm93bjtcbmV4cG9ydCBmdW5jdGlvbiBleGlzdHMoeDogYW55KTogYW55IHtcbiAgICByZXR1cm4gbnVsbCAhPSB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBbW05pbF1dLlxuICogQGphIFtbTmlsXV0g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOaWwoeDogdW5rbm93bik6IHggaXMgTmlsIHtcbiAgICByZXR1cm4gbnVsbCA9PSB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBTdHJpbmcuXG4gKiBAamEgU3RyaW5nIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3RyaW5nKHg6IHVua25vd24pOiB4IGlzIHN0cmluZyB7XG4gICAgcmV0dXJuICdzdHJpbmcnID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgTnVtYmVyLlxuICogQGphIE51bWJlciDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc051bWJlcih4OiB1bmtub3duKTogeCBpcyBudW1iZXIge1xuICAgIHJldHVybiAnbnVtYmVyJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIEJvb2xlYW4uXG4gKiBAamEgQm9vbGVhbiDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Jvb2xlYW4oeDogdW5rbm93bik6IHggaXMgYm9vbGVhbiB7XG4gICAgcmV0dXJuICdib29sZWFuJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFN5bWJsZS5cbiAqIEBqYSBTeW1ib2wg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTeW1ib2woeDogdW5rbm93bik6IHggaXMgc3ltYm9sIHtcbiAgICByZXR1cm4gJ3N5bWJvbCcgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBwcmltaXRpdmUgdHlwZS5cbiAqIEBqYSDjg5fjg6rjg5/jg4bjgqPjg5blnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1ByaW1pdGl2ZSh4OiB1bmtub3duKTogeCBpcyBQcmltaXRpdmUge1xuICAgIHJldHVybiAheCB8fCAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHgpICYmICgnb2JqZWN0JyAhPT0gdHlwZW9mIHgpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBBcnJheS5cbiAqIEBqYSBBcnJheSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBjb25zdCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgT2JqZWN0LlxuICogQGphIE9iamVjdCDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09iamVjdCh4OiB1bmtub3duKTogeCBpcyBvYmplY3Qge1xuICAgIHJldHVybiBCb29sZWFuKHgpICYmICdvYmplY3QnID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgW1tQbGFpbk9iamVjdF1dLlxuICogQGphIFtbUGxhaW5PYmplY3RdXSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KHg6IHVua25vd24pOiB4IGlzIFBsYWluT2JqZWN0IHtcbiAgICBpZiAoIWlzT2JqZWN0KHgpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBjcmVhdGUgZnJvbSBgT2JqZWN0LmNyZWF0ZSggbnVsbCApYCBpcyBwbGFpblxuICAgIGlmICghT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBvd25JbnN0YW5jZU9mKE9iamVjdCwgeCk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIGVtcHR5IG9iamVjdC5cbiAqIEBqYSDnqbrjgqrjg5bjgrjjgqfjgq/jg4jjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0VtcHR5T2JqZWN0KHg6IHVua25vd24pOiB4IGlzIG9iamVjdCB7XG4gICAgaWYgKCFpc1BsYWluT2JqZWN0KHgpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBuYW1lIGluIHgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgRnVuY3Rpb24uXG4gKiBAamEgRnVuY3Rpb24g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNGdW5jdGlvbih4OiB1bmtub3duKTogeCBpcyBUeXBlTGlzdFsnZnVuY3Rpb24nXSB7XG4gICAgcmV0dXJuICdmdW5jdGlvbicgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBpbnB1dC5cbiAqIEBqYSDmjIflrprjgZfjgZ/lnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gdHlwZVxuICogIC0gYGVuYCBldmFsdWF0ZWQgdHlwZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlnotcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHR5cGVPZjxLIGV4dGVuZHMgVHlwZUtleXM+KHR5cGU6IEssIHg6IHVua25vd24pOiB4IGlzIFR5cGVMaXN0W0tdIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09IHR5cGU7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBoYXMgaXRlcmF0b3IuXG4gKiBAamEgaXRlcmF0b3Ig44KS5omA5pyJ44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZTxUPih4OiBOaWxsYWJsZTxJdGVyYWJsZTxUPj4pOiB4IGlzIEl0ZXJhYmxlPFQ+O1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGUoeDogdW5rbm93bik6IHggaXMgSXRlcmFibGU8dW5rbm93bj47XG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZSh4OiBhbnkpOiBhbnkge1xuICAgIHJldHVybiBTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KHgpO1xufVxuXG5jb25zdCBfdHlwZWRBcnJheU5hbWVzID0ge1xuICAgICdJbnQ4QXJyYXknOiB0cnVlLFxuICAgICdVaW50OEFycmF5JzogdHJ1ZSxcbiAgICAnVWludDhDbGFtcGVkQXJyYXknOiB0cnVlLFxuICAgICdJbnQxNkFycmF5JzogdHJ1ZSxcbiAgICAnVWludDE2QXJyYXknOiB0cnVlLFxuICAgICdJbnQzMkFycmF5JzogdHJ1ZSxcbiAgICAnVWludDMyQXJyYXknOiB0cnVlLFxuICAgICdGbG9hdDMyQXJyYXknOiB0cnVlLFxuICAgICdGbG9hdDY0QXJyYXknOiB0cnVlLFxufTtcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGlzIG9uZSBvZiBbW1R5cGVkQXJyYXldXS5cbiAqIEBqYSDmjIflrprjgZfjgZ/jgqTjg7Pjgrnjgr/jg7PjgrnjgYwgW1tUeXBlZEFycmF5XV0g44Gu5LiA56iu44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlZEFycmF5KHg6IHVua25vd24pOiB4IGlzIFR5cGVkQXJyYXkge1xuICAgIHJldHVybiAhIV90eXBlZEFycmF5TmFtZXNbY2xhc3NOYW1lKHgpXTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGluc3RhbmNlIG9mIGlucHV0LlxuICogQGphIOaMh+WumuOBl+OBn+OCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDoqZXkvqHjgZnjgovjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluc3RhbmNlT2Y8VCBleHRlbmRzIHt9PihjdG9yOiBOaWxsYWJsZTxUeXBlPFQ+PiwgeDogdW5rbm93bik6IHggaXMgVCB7XG4gICAgcmV0dXJuICgnZnVuY3Rpb24nID09PSB0eXBlb2YgY3RvcikgJiYgKHggaW5zdGFuY2VvZiBjdG9yKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGluc3RhbmNlIG9mIGlucHV0IGNvbnN0cnVjdG9yIChleGNlcHQgc3ViIGNsYXNzKS5cbiAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvliKTlrpogKOa0vueUn+OCr+ODqeOCueOBr+WQq+OCgeOBquOBhClcbiAqXG4gKiBAcGFyYW0gY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL44Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvd25JbnN0YW5jZU9mPFQgZXh0ZW5kcyB7fT4oY3RvcjogTmlsbGFibGU8VHlwZTxUPj4sIHg6IHVua25vd24pOiB4IGlzIFQge1xuICAgIHJldHVybiAobnVsbCAhPSB4KSAmJiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGN0b3IpICYmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgPT09IE9iamVjdChjdG9yLnByb3RvdHlwZSkpO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIHZhbHVlJ3MgY2xhc3MgbmFtZS5cbiAqIEBqYSDjgq/jg6njgrnlkI3jgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGFzc05hbWUoeDogYW55KTogc3RyaW5nIHtcbiAgICBpZiAoeCAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHRvU3RyaW5nVGFnTmFtZSA9IHhbU3ltYm9sLnRvU3RyaW5nVGFnXTtcbiAgICAgICAgaWYgKGlzU3RyaW5nKHRvU3RyaW5nVGFnTmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0b1N0cmluZ1RhZ05hbWU7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbih4KSAmJiB4LnByb3RvdHlwZSAmJiBudWxsICE9IHgubmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHgubmFtZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGN0b3IgPSB4LmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oY3RvcikgJiYgY3RvciA9PT0gKE9iamVjdChjdG9yLnByb3RvdHlwZSkgYXMgb2JqZWN0KS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjdG9yLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgYXMgc3RyaW5nKS5zbGljZSg4LCAtMSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIGlucHV0IHZhbHVlcyBhcmUgc2FtZSB2YWx1ZS10eXBlLlxuICogQGphIOWFpeWKm+OBjOWQjOS4gOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBsaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICogQHBhcmFtIHJoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1lVHlwZShsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0eXBlb2YgbGhzID09PSB0eXBlb2YgcmhzO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBpbnB1dCB2YWx1ZXMgYXJlIHNhbWUgY2xhc3MuXG4gKiBAamEg5YWl5Yqb44GM5ZCM5LiA44Kv44Op44K544Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGxoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKiBAcGFyYW0gcmhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhbWVDbGFzcyhsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIGlmIChudWxsID09IGxocyAmJiBudWxsID09IHJocykge1xuICAgICAgICByZXR1cm4gY2xhc3NOYW1lKGxocykgPT09IGNsYXNzTmFtZShyaHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAobnVsbCAhPSBsaHMpICYmIChudWxsICE9IHJocykgJiYgKE9iamVjdC5nZXRQcm90b3R5cGVPZihsaHMpID09PSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocmhzKSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBUeXBlS2V5cyxcbiAgICBpc0FycmF5LFxuICAgIGV4aXN0cyxcbiAgICBjbGFzc05hbWUsXG59IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIEBlbiBUeXBlIHZlcmlmaWVyIGludGVyZmFjZSBkZWZpbml0aW9uLiA8YnI+XG4gKiAgICAgSWYgaW52YWxpZCB2YWx1ZSByZWNlaXZlZCwgdGhlIG1ldGhvZCB0aHJvd3MgYFR5cGVFcnJvcmAuXG4gKiBAamEg5Z6L5qSc6Ki844Gu44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pIDxicj5cbiAqICAgICDpgZXlj43jgZfjgZ/loLTlkIjjga8gYFR5cGVFcnJvcmAg44KS55m655SfXG4gKlxuICpcbiAqL1xuaW50ZXJmYWNlIFZlcmlmaWVyIHtcbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaXMgbm90IFtbTmlsXV0uXG4gICAgICogQGphIFtbTmlsXV0g44Gn44Gq44GE44GT44Go44KS5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm90TmlsLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIG5vdE5pbC5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgbm90TmlsOiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpcyBbW1R5cGVLZXlzXV0uXG4gICAgICogQGphIOaMh+WumuOBl+OBnyBbW1R5cGVLZXlzXV0g44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZU9mLnR5cGVcbiAgICAgKiAgLSBgZW5gIG9uZSBvZiBbW1R5cGVLZXlzXV1cbiAgICAgKiAgLSBgamFgIFtbVHlwZUtleXNdXSDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdHlwZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIHR5cGVPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgdHlwZU9mOiAodHlwZTogVHlwZUtleXMsIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaXMgYEFycmF5YC5cbiAgICAgKiBAamEgYEFycmF5YCDjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBhcnJheS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgYXJyYXk6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGlzIGBJdGVyYWJsZWAuXG4gICAgICogQGphIGBJdGVyYWJsZWAg44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlcmFibGUueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaXRlcmFibGUubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGl0ZXJhYmxlOiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpbnN0YW5jZSBpcyBlcXVhbCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3IuXG4gICAgICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OBruOCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGluc3RhbmNlT2YuY3RvclxuICAgICAqICAtIGBlbmAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDmr5TovIPlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gaW5zdGFuY2VPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBpbnN0YW5jZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBpbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaW5zdGFuY2UgaGFzIGBzdHJpY3RseWAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7ljrPlr4bkuIDoh7TjgZfjgZ/jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvd25JbnN0YW5jZU9mLmN0b3JcbiAgICAgKiAgLSBgZW5gIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5q+U6LyD5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIG93bkluc3RhbmNlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gb3duSW5zdGFuY2VPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgb3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGluc3RhbmNlIGhhcyBub3QgYHN0cmljdGx5YCBlcXVhbCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3IuXG4gICAgICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OCkuaMgeOBpOOCpOODs+OCueOCv+ODs+OCueOBp+OBquOBhOOBk+OBqOOCkuaknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIG5vdE93bkluc3RhbmNlT2YuY3RvclxuICAgICAqICAtIGBlbmAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDmr5TovIPlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gbm90T3duSW5zdGFuY2VPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBub3RPd25JbnN0YW5jZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBub3RPd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaGFzIHNwZWNpZmllZCBwcm9wZXJ0eS5cbiAgICAgKiBAamEg5oyH5a6a44OX44Ot44OR44OG44Kj44KS5oyB44Gj44Gm44GE44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkucHJvcFxuICAgICAqICAtIGBlbmAgc3BlY2lmaWVkIHByb3BlcnR5XG4gICAgICogIC0gYGphYCDlr77osaHjga7jg5fjg63jg5Hjg4bjgqNcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGhhc1Byb3BlcnR5OiAoeDogdW5rbm93biwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaGFzIG93biBzcGVjaWZpZWQgcHJvcGVydHkuXG4gICAgICogQGphIOaMh+WumuODl+ODreODkeODhuOCo+OCkuWFpeWKm+WApOiHqui6q+aMgeOBo+OBpuOBhOOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGhhc093blByb3BlcnR5LnByb3BcbiAgICAgKiAgLSBgZW5gIHNwZWNpZmllZCBwcm9wZXJ0eVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44OX44Ot44OR44OG44KjXG4gICAgICogQHBhcmFtIGhhc093blByb3BlcnR5LnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGhhc093blByb3BlcnR5Lm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBoYXNPd25Qcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xufVxuXG4vKipcbiAqIEBlbiBMaXN0IG9mIG1ldGhvZCBmb3IgdHlwZSB2ZXJpZnkuXG4gKiBAamEg5Z6L5qSc6Ki844GM5o+Q5L6b44GZ44KL44Oh44K944OD44OJ5LiA6KanXG4gKi9cbnR5cGUgVmVyaWZ5TWV0aG9kID0ga2V5b2YgVmVyaWZpZXI7XG5cbi8qKlxuICogQGVuIENvbmNyZXRlIHR5cGUgdmVyaWZpZXIgb2JqZWN0LlxuICogQGphIOWei+aknOiovOWun+ijheOCquODluOCuOOCp+OCr+ODiFxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5jb25zdCBfdmVyaWZpZXI6IFZlcmlmaWVyID0ge1xuICAgIG5vdE5pbDogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYSB2YWxpZCB2YWx1ZS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdHlwZU9mOiAodHlwZTogVHlwZUtleXMsIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiB4ICE9PSB0eXBlKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVHlwZSBvZiAke2NsYXNzTmFtZSh4KX0gaXMgbm90ICR7dHlwZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGFycmF5OiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAoIWlzQXJyYXkoeCkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGFuIEFycmF5LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBpdGVyYWJsZTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKCEoU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdCh4KSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGFuIGl0ZXJhYmxlIG9iamVjdC5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICghKHggaW5zdGFuY2VvZiBjdG9yKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYW4gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBvd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgIT09IE9iamVjdChjdG9yLnByb3RvdHlwZSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGlzIG5vdCBvd24gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBub3RPd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgIT0geCAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgPT09IE9iamVjdChjdG9yLnByb3RvdHlwZSkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGlzIG93biBpbnN0YW5jZSBvZiAke2N0b3IubmFtZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGhhc1Byb3BlcnR5OiAoeDogYW55LCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4geyAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgaWYgKG51bGwgPT0geCB8fCAhKHByb3AgaW4geCkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGRvZXMgbm90IGhhdmUgcHJvcGVydHkgJHtTdHJpbmcocHJvcCl9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBoYXNPd25Qcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHggfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh4LCBwcm9wKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFRoZSBvYmplY3QgZG9lcyBub3QgaGF2ZSBvd24gcHJvcGVydHkgJHtTdHJpbmcocHJvcCl9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vKipcbiAqIEBlbiBWZXJpZnkgbWV0aG9kLlxuICogQGphIOaknOiovOODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBtZXRob2RcbiAqICAtIGBlbmAgbWV0aG9kIG5hbWUgd2hpY2ggdXNpbmdcbiAqICAtIGBqYWAg5L2/55So44GZ44KL44Oh44K944OD44OJ5ZCNXG4gKiBAcGFyYW0gYXJnc1xuICogIC0gYGVuYCBhcmd1bWVudHMgd2hpY2ggY29ycmVzcG9uZHMgdG8gdGhlIG1ldGhvZCBuYW1lXG4gKiAgLSBgamFgIOODoeOCveODg+ODieWQjeOBq+WvvuW/nOOBmeOCi+W8leaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gdmVyaWZ5PFRNZXRob2QgZXh0ZW5kcyBWZXJpZnlNZXRob2Q+KG1ldGhvZDogVE1ldGhvZCwgLi4uYXJnczogUGFyYW1ldGVyczxWZXJpZmllcltUTWV0aG9kXT4pOiB2b2lkIHwgbmV2ZXIge1xuICAgIChfdmVyaWZpZXJbbWV0aG9kXSBhcyBhbnkpKC4uLmFyZ3MpOyAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbn1cblxuZXhwb3J0IHsgdmVyaWZ5IGFzIGRlZmF1bHQgfTtcbiIsIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuaW1wb3J0IHtcbiAgICBUeXBlZEFycmF5LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNBcnJheSxcbiAgICBpc09iamVjdCxcbiAgICBpc0l0ZXJhYmxlLFxuICAgIGlzVHlwZWRBcnJheSxcbiAgICBzYW1lQ2xhc3MsXG59IGZyb20gJy4vdHlwZXMnO1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgZGVlcEVxdWFsKCkgKi9cbmZ1bmN0aW9uIGFycmF5RXF1YWwobGhzOiB1bmtub3duW10sIHJoczogdW5rbm93bltdKTogYm9vbGVhbiB7XG4gICAgY29uc3QgbGVuID0gbGhzLmxlbmd0aDtcbiAgICBpZiAobGVuICE9PSByaHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoIWRlZXBFcXVhbChsaHNbaV0sIHJoc1tpXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGRlZXBFcXVhbCgpICovXG5mdW5jdGlvbiBidWZmZXJFcXVhbChsaHM6IFNoYXJlZEFycmF5QnVmZmVyIHwgQXJyYXlCdWZmZXIsIHJoczogU2hhcmVkQXJyYXlCdWZmZXIgfCBBcnJheUJ1ZmZlcik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHNpemUgPSBsaHMuYnl0ZUxlbmd0aDtcbiAgICBpZiAoc2l6ZSAhPT0gcmhzLmJ5dGVMZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBsZXQgcG9zID0gMDtcbiAgICBpZiAoc2l6ZSAtIHBvcyA+PSA4KSB7XG4gICAgICAgIGNvbnN0IGxlbiA9IHNpemUgPj4+IDM7XG4gICAgICAgIGNvbnN0IGY2NEwgPSBuZXcgRmxvYXQ2NEFycmF5KGxocywgMCwgbGVuKTtcbiAgICAgICAgY29uc3QgZjY0UiA9IG5ldyBGbG9hdDY0QXJyYXkocmhzLCAwLCBsZW4pO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoIU9iamVjdC5pcyhmNjRMW2ldLCBmNjRSW2ldKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBwb3MgPSBsZW4gPDwgMztcbiAgICB9XG4gICAgaWYgKHBvcyA9PT0gc2l6ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY29uc3QgTCA9IG5ldyBEYXRhVmlldyhsaHMpO1xuICAgIGNvbnN0IFIgPSBuZXcgRGF0YVZpZXcocmhzKTtcbiAgICBpZiAoc2l6ZSAtIHBvcyA+PSA0KSB7XG4gICAgICAgIGlmICghT2JqZWN0LmlzKEwuZ2V0VWludDMyKHBvcyksIFIuZ2V0VWludDMyKHBvcykpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcG9zICs9IDQ7XG4gICAgfVxuICAgIGlmIChzaXplIC0gcG9zID49IDIpIHtcbiAgICAgICAgaWYgKCFPYmplY3QuaXMoTC5nZXRVaW50MTYocG9zKSwgUi5nZXRVaW50MTYocG9zKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwb3MgKz0gMjtcbiAgICB9XG4gICAgaWYgKHNpemUgPiBwb3MpIHtcbiAgICAgICAgaWYgKCFPYmplY3QuaXMoTC5nZXRVaW50OChwb3MpLCBSLmdldFVpbnQ4KHBvcykpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcG9zICs9IDE7XG4gICAgfVxuICAgIHJldHVybiBwb3MgPT09IHNpemU7XG59XG5cbi8qKlxuICogQGVuIFBlcmZvcm1zIGEgZGVlcCBjb21wYXJpc29uIGJldHdlZW4gdHdvIHZhbHVlcyB0byBkZXRlcm1pbmUgaWYgdGhleSBhcmUgZXF1aXZhbGVudC5cbiAqIEBqYSAy5YCk44Gu6Kmz57Sw5q+U6LyD44KS44GXLCDnrYnjgZfjgYTjgYvjganjgYbjgYvliKTlrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBFcXVhbChsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIGlmIChsaHMgPT09IHJocykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGlzRnVuY3Rpb24obGhzKSAmJiBpc0Z1bmN0aW9uKHJocykpIHtcbiAgICAgICAgcmV0dXJuIGxocy5sZW5ndGggPT09IHJocy5sZW5ndGggJiYgbGhzLm5hbWUgPT09IHJocy5uYW1lO1xuICAgIH1cbiAgICBpZiAoIWlzT2JqZWN0KGxocykgfHwgIWlzT2JqZWN0KHJocykpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB7IC8vIFByaW1pdGl2ZSBXcmFwcGVyIE9iamVjdHMgLyBEYXRlXG4gICAgICAgIGNvbnN0IHZhbHVlTCA9IGxocy52YWx1ZU9mKCk7XG4gICAgICAgIGNvbnN0IHZhbHVlUiA9IHJocy52YWx1ZU9mKCk7XG4gICAgICAgIGlmIChsaHMgIT09IHZhbHVlTCB8fCByaHMgIT09IHZhbHVlUikge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlTCA9PT0gdmFsdWVSO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gUmVnRXhwXG4gICAgICAgIGNvbnN0IGlzUmVnRXhwTCA9IGxocyBpbnN0YW5jZW9mIFJlZ0V4cDtcbiAgICAgICAgY29uc3QgaXNSZWdFeHBSID0gcmhzIGluc3RhbmNlb2YgUmVnRXhwO1xuICAgICAgICBpZiAoaXNSZWdFeHBMIHx8IGlzUmVnRXhwUikge1xuICAgICAgICAgICAgcmV0dXJuIGlzUmVnRXhwTCA9PT0gaXNSZWdFeHBSICYmIFN0cmluZyhsaHMpID09PSBTdHJpbmcocmhzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIEFycmF5XG4gICAgICAgIGNvbnN0IGlzQXJyYXlMID0gaXNBcnJheShsaHMpO1xuICAgICAgICBjb25zdCBpc0FycmF5UiA9IGlzQXJyYXkocmhzKTtcbiAgICAgICAgaWYgKGlzQXJyYXlMIHx8IGlzQXJyYXlSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNBcnJheUwgPT09IGlzQXJyYXlSICYmIGFycmF5RXF1YWwobGhzIGFzIGFueSwgcmhzIGFzIGFueSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBBcnJheUJ1ZmZlclxuICAgICAgICBjb25zdCBpc0J1ZmZlckwgPSBsaHMgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcjtcbiAgICAgICAgY29uc3QgaXNCdWZmZXJSID0gcmhzIGluc3RhbmNlb2YgQXJyYXlCdWZmZXI7XG4gICAgICAgIGlmIChpc0J1ZmZlckwgfHwgaXNCdWZmZXJSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNCdWZmZXJMID09PSBpc0J1ZmZlclIgJiYgYnVmZmVyRXF1YWwobGhzIGFzIGFueSwgcmhzIGFzIGFueSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBBcnJheUJ1ZmZlclZpZXdcbiAgICAgICAgY29uc3QgaXNCdWZmZXJWaWV3TCA9IEFycmF5QnVmZmVyLmlzVmlldyhsaHMpO1xuICAgICAgICBjb25zdCBpc0J1ZmZlclZpZXdSID0gQXJyYXlCdWZmZXIuaXNWaWV3KHJocyk7XG4gICAgICAgIGlmIChpc0J1ZmZlclZpZXdMIHx8IGlzQnVmZmVyVmlld1IpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0J1ZmZlclZpZXdMID09PSBpc0J1ZmZlclZpZXdSICYmIHNhbWVDbGFzcyhsaHMsIHJocylcbiAgICAgICAgICAgICAgICAmJiBidWZmZXJFcXVhbCgobGhzIGFzIEFycmF5QnVmZmVyVmlldykuYnVmZmVyLCAocmhzIGFzIEFycmF5QnVmZmVyVmlldykuYnVmZmVyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIG90aGVyIEl0ZXJhYmxlXG4gICAgICAgIGNvbnN0IGlzSXRlcmFibGVMID0gaXNJdGVyYWJsZShsaHMpO1xuICAgICAgICBjb25zdCBpc0l0ZXJhYmxlUiA9IGlzSXRlcmFibGUocmhzKTtcbiAgICAgICAgaWYgKGlzSXRlcmFibGVMIHx8IGlzSXRlcmFibGVSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNJdGVyYWJsZUwgPT09IGlzSXRlcmFibGVSICYmIGFycmF5RXF1YWwoWy4uLihsaHMgYXMgYW55KV0sIFsuLi4ocmhzIGFzIGFueSldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoc2FtZUNsYXNzKGxocywgcmhzKSkge1xuICAgICAgICBjb25zdCBrZXlzTCA9IG5ldyBTZXQoT2JqZWN0LmtleXMobGhzKSk7XG4gICAgICAgIGNvbnN0IGtleXNSID0gbmV3IFNldChPYmplY3Qua2V5cyhyaHMpKTtcbiAgICAgICAgaWYgKGtleXNMLnNpemUgIT09IGtleXNSLnNpemUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzTCkge1xuICAgICAgICAgICAgaWYgKCFrZXlzUi5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzTCkge1xuICAgICAgICAgICAgaWYgKCFkZWVwRXF1YWwobGhzW2tleV0sIHJoc1trZXldKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIGxocykge1xuICAgICAgICAgICAgaWYgKCEoa2V5IGluIHJocykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qga2V5cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiByaHMpIHtcbiAgICAgICAgICAgIGlmICghKGtleSBpbiBsaHMpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAga2V5cy5hZGQoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzKSB7XG4gICAgICAgICAgICBpZiAoIWRlZXBFcXVhbChsaHNba2V5XSwgcmhzW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBSZWdFeHAgKi9cbmZ1bmN0aW9uIGNsb25lUmVnRXhwKHJlZ2V4cDogUmVnRXhwKTogUmVnRXhwIHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgUmVnRXhwKHJlZ2V4cC5zb3VyY2UsIHJlZ2V4cC5mbGFncyk7XG4gICAgcmVzdWx0Lmxhc3RJbmRleCA9IHJlZ2V4cC5sYXN0SW5kZXg7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBBcnJheUJ1ZmZlciAqL1xuZnVuY3Rpb24gY2xvbmVBcnJheUJ1ZmZlcihhcnJheUJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBBcnJheUJ1ZmZlciB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IEFycmF5QnVmZmVyKGFycmF5QnVmZmVyLmJ5dGVMZW5ndGgpO1xuICAgIG5ldyBVaW50OEFycmF5KHJlc3VsdCkuc2V0KG5ldyBVaW50OEFycmF5KGFycmF5QnVmZmVyKSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBEYXRhVmlldyAqL1xuZnVuY3Rpb24gY2xvbmVEYXRhVmlldyhkYXRhVmlldzogRGF0YVZpZXcpOiBEYXRhVmlldyB7XG4gICAgY29uc3QgYnVmZmVyID0gY2xvbmVBcnJheUJ1ZmZlcihkYXRhVmlldy5idWZmZXIpO1xuICAgIHJldHVybiBuZXcgRGF0YVZpZXcoYnVmZmVyLCBkYXRhVmlldy5ieXRlT2Zmc2V0LCBkYXRhVmlldy5ieXRlTGVuZ3RoKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBUeXBlZEFycmF5ICovXG5mdW5jdGlvbiBjbG9uZVR5cGVkQXJyYXk8VCBleHRlbmRzIFR5cGVkQXJyYXk+KHR5cGVkQXJyYXk6IFQpOiBUIHtcbiAgICBjb25zdCBidWZmZXIgPSBjbG9uZUFycmF5QnVmZmVyKHR5cGVkQXJyYXkuYnVmZmVyKTtcbiAgICByZXR1cm4gbmV3ICh0eXBlZEFycmF5IGFzIGFueSkuY29uc3RydWN0b3IoYnVmZmVyLCB0eXBlZEFycmF5LmJ5dGVPZmZzZXQsIHR5cGVkQXJyYXkubGVuZ3RoKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjaGVjayBuZWNlc3NhcnkgdG8gdXBkYXRlICovXG5mdW5jdGlvbiBuZWVkVXBkYXRlKG9sZFZhbHVlOiB1bmtub3duLCBuZXdWYWx1ZTogdW5rbm93biwgZXhjZXB0VW5kZWZpbmVkOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgaWYgKG9sZFZhbHVlICE9PSBuZXdWYWx1ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKGV4Y2VwdFVuZGVmaW5lZCAmJiB1bmRlZmluZWQgPT09IG9sZFZhbHVlKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgbWVyZ2UgQXJyYXkgKi9cbmZ1bmN0aW9uIG1lcmdlQXJyYXkodGFyZ2V0OiBhbnlbXSwgc291cmNlOiBhbnlbXSk6IGFueVtdIHtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gc291cmNlLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0W2ldO1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1lcmdlKG9sZFZhbHVlLCBzb3VyY2VbaV0pO1xuICAgICAgICAhbmVlZFVwZGF0ZShvbGRWYWx1ZSwgbmV3VmFsdWUsIGZhbHNlKSB8fCAodGFyZ2V0W2ldID0gbmV3VmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG4vKiogQGludGVybmFsIG1lcmdlIFNldCAqL1xuZnVuY3Rpb24gbWVyZ2VTZXQodGFyZ2V0OiBTZXQ8YW55Piwgc291cmNlOiBTZXQ8YW55Pik6IFNldDxhbnk+IHtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygc291cmNlKSB7XG4gICAgICAgIHRhcmdldC5oYXMoaXRlbSkgfHwgdGFyZ2V0LmFkZChtZXJnZSh1bmRlZmluZWQsIGl0ZW0pKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuLyoqIEBpbnRlcm5hbCBtZXJnZSBNYXAgKi9cbmZ1bmN0aW9uIG1lcmdlTWFwKHRhcmdldDogTWFwPGFueSwgYW55Piwgc291cmNlOiBNYXA8YW55LCBhbnk+KTogTWFwPGFueSwgYW55PiB7XG4gICAgZm9yIChjb25zdCBbaywgdl0gb2Ygc291cmNlKSB7XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0LmdldChrKTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBtZXJnZShvbGRWYWx1ZSwgdik7XG4gICAgICAgICFuZWVkVXBkYXRlKG9sZFZhbHVlLCBuZXdWYWx1ZSwgZmFsc2UpIHx8IHRhcmdldC5zZXQoaywgbmV3VmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgZGVlcE1lcmdlKCkgKi9cbmZ1bmN0aW9uIG1lcmdlKHRhcmdldDogdW5rbm93biwgc291cmNlOiB1bmtub3duKTogYW55IHtcbiAgICBpZiAodW5kZWZpbmVkID09PSBzb3VyY2UgfHwgdGFyZ2V0ID09PSBzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG4gICAgaWYgKCFpc09iamVjdChzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgfVxuICAgIC8vIFByaW1pdGl2ZSBXcmFwcGVyIE9iamVjdHMgLyBEYXRlXG4gICAgaWYgKHNvdXJjZS52YWx1ZU9mKCkgIT09IHNvdXJjZSkge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IG5ldyAoc291cmNlIGFzIGFueSkuY29uc3RydWN0b3Ioc291cmNlLnZhbHVlT2YoKSk7XG4gICAgfVxuICAgIC8vIFJlZ0V4cFxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgcmV0dXJuIGRlZXBFcXVhbCh0YXJnZXQsIHNvdXJjZSkgPyB0YXJnZXQgOiBjbG9uZVJlZ0V4cChzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBBcnJheUJ1ZmZlclxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IGNsb25lQXJyYXlCdWZmZXIoc291cmNlKTtcbiAgICB9XG4gICAgLy8gQXJyYXlCdWZmZXJWaWV3XG4gICAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBkZWVwRXF1YWwodGFyZ2V0LCBzb3VyY2UpID8gdGFyZ2V0IDogaXNUeXBlZEFycmF5KHNvdXJjZSkgPyBjbG9uZVR5cGVkQXJyYXkoc291cmNlKSA6IGNsb25lRGF0YVZpZXcoc291cmNlIGFzIERhdGFWaWV3KTtcbiAgICB9XG4gICAgLy8gQXJyYXlcbiAgICBpZiAoQXJyYXkuaXNBcnJheShzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBtZXJnZUFycmF5KGlzQXJyYXkodGFyZ2V0KSA/IHRhcmdldCA6IFtdLCBzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBTZXRcbiAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgU2V0KSB7XG4gICAgICAgIHJldHVybiBtZXJnZVNldCh0YXJnZXQgaW5zdGFuY2VvZiBTZXQgPyB0YXJnZXQgOiBuZXcgU2V0KCksIHNvdXJjZSk7XG4gICAgfVxuICAgIC8vIE1hcFxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgICAgcmV0dXJuIG1lcmdlTWFwKHRhcmdldCBpbnN0YW5jZW9mIE1hcCA/IHRhcmdldCA6IG5ldyBNYXAoKSwgc291cmNlKTtcbiAgICB9XG5cbiAgICBjb25zdCBvYmogPSBpc09iamVjdCh0YXJnZXQpID8gdGFyZ2V0IDoge307XG4gICAgaWYgKHNhbWVDbGFzcyh0YXJnZXQsIHNvdXJjZSkpIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc291cmNlKSkge1xuICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBvYmpba2V5XTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWVyZ2Uob2xkVmFsdWUsIHNvdXJjZVtrZXldKTtcbiAgICAgICAgICAgICFuZWVkVXBkYXRlKG9sZFZhbHVlLCBuZXdWYWx1ZSwgdHJ1ZSkgfHwgKG9ialtrZXldID0gbmV3VmFsdWUpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IG9ialtrZXldO1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBtZXJnZShvbGRWYWx1ZSwgc291cmNlW2tleV0pO1xuICAgICAgICAgICAgIW5lZWRVcGRhdGUob2xkVmFsdWUsIG5ld1ZhbHVlLCB0cnVlKSB8fCAob2JqW2tleV0gPSBuZXdWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBAZW4gUmVjdXJzaXZlbHkgbWVyZ2VzIG93biBhbmQgaW5oZXJpdGVkIGVudW1lcmFibGUgc3RyaW5nIGtleWVkIHByb3BlcnRpZXMgb2Ygc291cmNlIG9iamVjdHMgaW50byB0aGUgZGVzdGluYXRpb24gb2JqZWN0LlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBruWGjeW4sOeahOODnuODvOOCuOOCkuWun+ihjFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVlcE1lcmdlPFQsIFMxLCBTMiwgUzMsIFM0LCBTNSwgUzYsIFM3LCBTOCwgUzk+KFxuICAgIHRhcmdldDogVCxcbiAgICAuLi5zb3VyY2VzOiBbUzEsIFMyPywgUzM/LCBTND8sIFM1PywgUzY/LCBTNz8sIFM4PywgUzk/LCAuLi5hbnlbXV1cbik6IFQgJiBTMSAmIFMyICYgUzMgJiBTNCAmIFM1ICYgUzYgJiBTNyAmIFM4ICYgUzk7XG5leHBvcnQgZnVuY3Rpb24gZGVlcE1lcmdlPFg+KHRhcmdldDogYW55LCAuLi5zb3VyY2VzOiBhbnlbXSk6IFg7XG5leHBvcnQgZnVuY3Rpb24gZGVlcE1lcmdlKHRhcmdldDogYW55LCAuLi5zb3VyY2VzOiBhbnlbXSk6IGFueSB7XG4gICAgbGV0IHJlc3VsdCA9IHRhcmdldDtcbiAgICBmb3IgKGNvbnN0IHNvdXJjZSBvZiBzb3VyY2VzKSB7XG4gICAgICAgIHJlc3VsdCA9IG1lcmdlKHJlc3VsdCwgc291cmNlKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENyZWF0ZSBkZWVwIGNvcHkgaW5zdGFuY2Ugb2Ygc291cmNlIG9iamVjdC5cbiAqIEBqYSDjg4fjgqPjg7zjg5fjgrPjg5Tjg7zjgqrjg5bjgrjjgqfjgq/jg4jjga7nlJ/miJBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBDb3B5PFQ+KHNyYzogVCk6IFQge1xuICAgIHJldHVybiBkZWVwTWVyZ2UodW5kZWZpbmVkLCBzcmMpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5pbXBvcnQge1xuICAgIE5pbCxcbiAgICBUeXBlLFxuICAgIENsYXNzLFxuICAgIENvbnN0cnVjdG9yLFxufSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBAZW4gTWl4aW4gY2xhc3MncyBiYXNlIGludGVyZmFjZS5cbiAqIEBqYSBNaXhpbiDjgq/jg6njgrnjga7ln7rlupXjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqlcbiAqL1xuZXhwb3J0IGRlY2xhcmUgY2xhc3MgTWl4aW5DbGFzcyB7XG4gICAgLyoqXG4gICAgICogQGVuIGNhbGwgbWl4aW4gc291cmNlIGNsYXNzJ3MgYHN1cGVyKClgLiA8YnI+XG4gICAgICogICAgIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBjYWxsZWQgZnJvbSBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEgTWl4aW4g44Kv44Op44K544Gu5Z+65bqV44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pIDxicj5cbiAgICAgKiAgICAg44Kz44Oz44K544OI44Op44Kv44K/44GL44KJ5ZG844G244GT44Go44KS5oOz5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3JjQ2xhc3NcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiB0YXJnZXQgY2xhc3MgbmFtZS4gZXgpIGZyb20gUzEgYXZhaWxhYmxlXG4gICAgICogIC0gYGphYCDjgrPjg7Pjgrnjg4jjg6njgq/jg4jjgZnjgovjgq/jg6njgrnlkI3jgpLmjIflrpogZXgpIFMxIOOBi+OCieaMh+WumuWPr+iDvVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gcGFyYW1ldGVyc1xuICAgICAqICAtIGBqYWAg44Kz44Oz44K544OI44Op44Kv44OI44Gr5L2/55So44GZ44KL5byV5pWwXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHN1cGVyPFQgZXh0ZW5kcyBDbGFzcz4oc3JjQ2xhc3M6IFQsIC4uLmFyZ3M6IENvbnN0cnVjdG9yUGFyYW1ldGVyczxUPik6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIGlucHV0IGNsYXNzIGlzIG1peGluZWQgKGV4Y2x1ZGluZyBvd24gY2xhc3MpLlxuICAgICAqIEBqYSDmjIflrprjgq/jg6njgrnjgYwgTWl4aW4g44GV44KM44Gm44GE44KL44GL56K66KqNICjoh6rouqvjga7jgq/jg6njgrnjga/lkKvjgb7jgozjgarjgYQpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWl4ZWRDbGFzc1xuICAgICAqICAtIGBlbmAgc2V0IHRhcmdldCBjbGFzcyBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5a++6LGh44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGlzTWl4ZWRXaXRoPFQ+KG1peGVkQ2xhc3M6IENvbnN0cnVjdG9yPFQ+KTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZW4gTWl4ZWQgc3ViIGNsYXNzIGNvbnN0cnVjdG9yIGRlZmluaXRpb25zLlxuICogQGphIOWQiOaIkOOBl+OBn+OCteODluOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1peGluQ29uc3RydWN0b3I8QiBleHRlbmRzIENsYXNzLCBVPiBleHRlbmRzIFR5cGU8VT4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBjb25zdHJ1Y3RvclxuICAgICAqIEBqYSDjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBiYXNlIGNsYXNzIGFyZ3VtZW50c1xuICAgICAqICAtIGBqYWAg5Z+65bqV44Kv44Op44K544Gr5oyH5a6a44GX44Gf5byV5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHVuaW9uIHR5cGUgb2YgY2xhc3NlcyB3aGVuIGNhbGxpbmcgW1ttaXhpbnNdXSgpXG4gICAgICogIC0gYGphYCBbW21peGluc11dKCkg44Gr5rih44GX44Gf44Kv44Op44K544Gu6ZuG5ZCIXG4gICAgICovXG4gICAgbmV3KC4uLmFyZ3M6IENvbnN0cnVjdG9yUGFyYW1ldGVyczxCPik6IFU7XG59XG5cbi8qKlxuICogQGVuIERlZmluaXRpb24gb2YgW1tzZXRNaXhDbGFzc0F0dHJpYnV0ZV1dIGZ1bmN0aW9uJ3MgYXJndW1lbnRzLlxuICogQGphIFtbc2V0TWl4Q2xhc3NBdHRyaWJ1dGVdXSDjga7lj5bjgorjgYbjgovlvJXmlbDlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNaXhDbGFzc0F0dHJpYnV0ZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFN1cHByZXNzIHByb3ZpZGluZyBjb25zdHJ1Y3Rvci10cmFwIGZvciB0aGUgbWl4aW4gc291cmNlIGNsYXNzLiBJbiB0aGlzIGNhc2UsIGBpc01peGVkV2l0aGAsIGBpbnN0YW5jZW9mYCBhbHNvIGJlY29tZXMgaW52YWxpZC4gKGZvciBpbXByb3ZpbmcgcGVyZm9ybWFuY2UpXG4gICAgICogQGphIE1peGluIFNvdXJjZSDjgq/jg6njgrnjgavlr77jgZfjgaYsIOOCs+ODs+OCueODiOODqeOCr+OCv+ODiOODqeODg+ODl+OCkuaKkeatoi4g44GT44KM44KS5oyH5a6a44GX44Gf5aC05ZCILCBgaXNNaXhlZFdpdGhgLCBgaW5zdGFuY2VvZmAg44KC54Sh5Yq544Gr44Gq44KLLiAo44OR44OV44Kp44O844Oe44Oz44K55pS55ZaEKVxuICAgICAqL1xuICAgIHByb3RvRXh0ZW5kc09ubHk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0dXAgW1N5bWJvbC5oYXNJbnN0YW5jZV0gcHJvcGVydHkuIDxicj5cbiAgICAgKiAgICAgVGhlIGNsYXNzIGRlc2lnbmF0ZWQgYXMgYSBzb3VyY2Ugb2YgW1ttaXhpbnNdXSgpIGhhcyBbU3ltYm9sLmhhc0luc3RhbmNlXSBwcm9wZXJ0eSBpbXBsaWNpdGx5LiA8YnI+XG4gICAgICogICAgIEl0J3MgdXNlZCB0byBhdm9pZCBiZWNvbWluZyB0aGUgYmVoYXZpb3IgYGluc3RhbmNlb2ZgIGRvZXNuJ3QgaW50ZW5kIHdoZW4gdGhlIGNsYXNzIGlzIGV4dGVuZGVkIGZyb20gdGhlIG1peGluZWQgY2xhc3MgdGhlIG90aGVyIHBsYWNlLlxuICAgICAqIEBqYSBbU3ltYm9sLmhhc0luc3RhbmNlXSDjg5fjg63jg5Hjg4bjgqPoqK3lrpo8YnI+XG4gICAgICogICAgIFtbbWl4aW5zXV0oKSDjga7jgr3jg7zjgrnjgavmjIflrprjgZXjgozjgZ/jgq/jg6njgrnjga8gW1N5bWJvbC5oYXNJbnN0YW5jZV0g44KS5pqX6buZ55qE44Gr5YKZ44GI44KL44Gf44KBPGJyPlxuICAgICAqICAgICDjgZ3jga7jgq/jg6njgrnjgYzku5bjgafntpnmib/jgZXjgozjgabjgYTjgovloLTlkIggYGluc3RhbmNlb2ZgIOOBjOaEj+Wbs+OBl+OBquOBhOaMr+OCi+iInuOBhOOBqOOBquOCi+OBruOCkumBv+OBkeOCi+OBn+OCgeOBq+S9v+eUqOOBmeOCiy5cbiAgICAgKi9cbiAgICBpbnN0YW5jZU9mOiAoKGluc3Q6IG9iamVjdCkgPT4gYm9vbGVhbikgfCBOaWw7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG5jb25zdCBfb2JqUHJvdG90eXBlICAgICA9IE9iamVjdC5wcm90b3R5cGU7XG5jb25zdCBfaW5zdGFuY2VPZiAgICAgICA9IEZ1bmN0aW9uLnByb3RvdHlwZVtTeW1ib2wuaGFzSW5zdGFuY2VdO1xuY29uc3QgX292ZXJyaWRlICAgICAgICAgPSBTeW1ib2woJ292ZXJyaWRlJyk7XG5jb25zdCBfaXNJbmhlcml0ZWQgICAgICA9IFN5bWJvbCgnaXNJbmhlcml0ZWQnKTtcbmNvbnN0IF9jb25zdHJ1Y3RvcnMgICAgID0gU3ltYm9sKCdjb25zdHJ1Y3RvcnMnKTtcbmNvbnN0IF9jbGFzc0Jhc2UgICAgICAgID0gU3ltYm9sKCdjbGFzc0Jhc2UnKTtcbmNvbnN0IF9jbGFzc1NvdXJjZXMgICAgID0gU3ltYm9sKCdjbGFzc1NvdXJjZXMnKTtcbmNvbnN0IF9wcm90b0V4dGVuZHNPbmx5ID0gU3ltYm9sKCdwcm90b0V4dGVuZHNPbmx5Jyk7XG5cbi8vIG9iamVjdCBwcm9wZXJ0aWVzIGNvcHkgbWV0aG9kXG5mdW5jdGlvbiBjb3B5UHJvcGVydGllcyh0YXJnZXQ6IG9iamVjdCwgc291cmNlPzogb2JqZWN0KTogdm9pZCB7XG4gICAgc291cmNlICYmIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHNvdXJjZSlcbiAgICAgICAgLmZpbHRlcihrZXkgPT4gIS8ocHJvdG90eXBlfG5hbWV8Y29uc3RydWN0b3IpLy50ZXN0KGtleSkpXG4gICAgICAgIC5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSB0YXJnZXRba2V5XSkge1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzb3VyY2UsIGtleSkgYXMgUHJvcGVydHlEZWNvcmF0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cblxuLy8gaGVscGVyIGZvciBzZXRNaXhDbGFzc0F0dHJpYnV0ZSh0YXJnZXQsICdpbnN0YW5jZU9mJylcbmZ1bmN0aW9uIHNldEluc3RhbmNlT2Y8VCBleHRlbmRzIHt9Pih0YXJnZXQ6IENvbnN0cnVjdG9yPFQ+LCBtZXRob2Q6ICgoaW5zdDogb2JqZWN0KSA9PiBib29sZWFuKSB8IE5pbCk6IHZvaWQge1xuICAgIGNvbnN0IGJlaGF2aW91ciA9IG1ldGhvZCB8fCAobnVsbCA9PT0gbWV0aG9kID8gdW5kZWZpbmVkIDogKChpOiBvYmplY3QpID0+IE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZi5jYWxsKHRhcmdldC5wcm90b3R5cGUsIGkpKSk7XG4gICAgY29uc3QgYXBwbGllZCA9IGJlaGF2aW91ciAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgX292ZXJyaWRlKTtcbiAgICBpZiAoIWFwcGxpZWQpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGFyZ2V0LCB7XG4gICAgICAgICAgICBbU3ltYm9sLmhhc0luc3RhbmNlXToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBiZWhhdmlvdXIsXG4gICAgICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW19vdmVycmlkZV06IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogYmVoYXZpb3VyID8gdHJ1ZSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gU2V0IHRoZSBNaXhpbiBjbGFzcyBhdHRyaWJ1dGUuXG4gKiBAamEgTWl4aW4g44Kv44Op44K544Gr5a++44GX44Gm5bGe5oCn44KS6Kit5a6aXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAvLyAncHJvdG9FeHRlbmRPbmx5J1xuICogY2xhc3MgQmFzZSB7IGNvbnN0cnVjdG9yKGEsIGIpIHt9IH07XG4gKiBjbGFzcyBNaXhBIHsgfTtcbiAqIHNldE1peENsYXNzQXR0cmlidXRlKE1peEEsICdwcm90b0V4dGVuZHNPbmx5Jyk7ICAvLyBmb3IgaW1wcm92aW5nIGNvbnN0cnVjdGlvbiBwZXJmb3JtYW5jZVxuICogY2xhc3MgTWl4QiB7IGNvbnN0cnVjdG9yKGMsIGQpIHt9IH07XG4gKlxuICogY2xhc3MgTWl4aW5DbGFzcyBleHRlbmRzIG1peGlucyhCYXNlLCBNaXhBLCBNaXhCKSB7XG4gKiAgICAgY29uc3RydWN0b3IoYSwgYiwgYywgZCl7XG4gKiAgICAgICAgIC8vIGNhbGxpbmcgYEJhc2VgIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHN1cGVyKGEsIGIpO1xuICpcbiAqICAgICAgICAgLy8gY2FsbGluZyBNaXhpbiBjbGFzcydzIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QSk7ICAgICAgICAvLyBubyBhZmZlY3RcbiAqICAgICAgICAgdGhpcy5zdXBlcihNaXhCLCBjLCBkKTtcbiAqICAgICB9XG4gKiB9XG4gKlxuICogY29uc3QgbWl4ZWQgPSBuZXcgTWl4aW5DbGFzcygpO1xuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBNaXhBKTsgICAgLy8gZmFsc2VcbiAqIGNvbnNvbGUubG9nKG1peGVkLmlzTWl4ZWRXaXRoKE1peEEpKTsgIC8vIGZhbHNlXG4gKlxuICogLy8gJ2luc3RhbmNlT2YnXG4gKiBjbGFzcyBCYXNlIHt9O1xuICogY2xhc3MgU291cmNlIHt9O1xuICogY2xhc3MgTWl4aW5DbGFzcyBleHRlbmRzIG1peGlucyhCYXNlLCBTb3VyY2UpIHt9O1xuICpcbiAqIGNsYXNzIE90aGVyIGV4dGVuZHMgU291cmNlIHt9O1xuICpcbiAqIGNvbnN0IG1peGVkID0gbmV3IE1peGluQ2xhc3MoKTtcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgTWl4aW5DbGFzcyk7ICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgQmFzZSk7ICAgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgU291cmNlKTsgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgT3RoZXIpOyAgICAgICAgIC8vIHRydWUgPz8/XG4gKlxuICogc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoT3RoZXIsICdpbnN0YW5jZU9mJyk7IC8vIG9yIHNldE1peENsYXNzQXR0cmlidXRlKE90aGVyLCAnaW5zdGFuY2VPZicsIG51bGwpO1xuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBPdGhlcik7ICAgICAgICAgLy8gZmFsc2UgIVxuICogYGBgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBzZXQgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gKiAgLSBgamFgIOioreWumuWvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHBhcmFtIGF0dHJcbiAqICAtIGBlbmA6XG4gKiAgICAtIGBwcm90b0V4dGVuZHNPbmx5YDogU3VwcHJlc3MgcHJvdmlkaW5nIGNvbnN0cnVjdG9yLXRyYXAgZm9yIHRoZSBtaXhpbiBzb3VyY2UgY2xhc3MuIChmb3IgaW1wcm92aW5nIHBlcmZvcm1hbmNlKVxuICogICAgLSBgaW5zdGFuY2VPZmAgICAgICA6IGZ1bmN0aW9uIGJ5IHVzaW5nIFtTeW1ib2wuaGFzSW5zdGFuY2VdIDxicj5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBEZWZhdWx0IGJlaGF2aW91ciBpcyBgeyByZXR1cm4gdGFyZ2V0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGluc3RhbmNlKSB9YFxuICogICAgICAgICAgICAgICAgICAgICAgICAgIElmIHNldCBgbnVsbGAsIGRlbGV0ZSBbU3ltYm9sLmhhc0luc3RhbmNlXSBwcm9wZXJ0eS5cbiAqICAtIGBqYWA6XG4gKiAgICAtIGBwcm90b0V4dGVuZHNPbmx5YDogTWl4aW4gU291cmNlIOOCr+ODqeOCueOBq+WvvuOBl+OBpiwg44Kz44Oz44K544OI44Op44Kv44K/44OI44Op44OD44OX44KS5oqR5q2iICjjg5Hjg5Xjgqnjg7zjg57jg7PjgrnmlLnlloQpXG4gKiAgICAtIGBpbnN0YW5jZU9mYCAgICAgIDogW1N5bWJvbC5oYXNJbnN0YW5jZV0g44GM5L2/55So44GZ44KL6Zai5pWw44KS5oyH5a6aIDxicj5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICDml6Llrprjgafjga8gYHsgcmV0dXJuIHRhcmdldC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnN0YW5jZSkgfWAg44GM5L2/55So44GV44KM44KLXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICBgbnVsbGAg5oyH5a6a44KS44GZ44KL44GoIFtTeW1ib2wuaGFzSW5zdGFuY2VdIOODl+ODreODkeODhuOCo+OCkuWJiumZpOOBmeOCi1xuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0TWl4Q2xhc3NBdHRyaWJ1dGU8VCBleHRlbmRzIHt9LCBVIGV4dGVuZHMga2V5b2YgTWl4Q2xhc3NBdHRyaWJ1dGU+KFxuICAgIHRhcmdldDogQ29uc3RydWN0b3I8VD4sXG4gICAgYXR0cjogVSxcbiAgICBtZXRob2Q/OiBNaXhDbGFzc0F0dHJpYnV0ZVtVXVxuKTogdm9pZCB7XG4gICAgc3dpdGNoIChhdHRyKSB7XG4gICAgICAgIGNhc2UgJ3Byb3RvRXh0ZW5kc09ubHknOlxuICAgICAgICAgICAgdGFyZ2V0W19wcm90b0V4dGVuZHNPbmx5XSA9IHRydWU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnaW5zdGFuY2VPZic6XG4gICAgICAgICAgICBzZXRJbnN0YW5jZU9mKHRhcmdldCwgbWV0aG9kKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBNaXhpbiBmdW5jdGlvbiBmb3IgbXVsdGlwbGUgaW5oZXJpdGFuY2UuIDxicj5cbiAqICAgICBSZXNvbHZpbmcgdHlwZSBzdXBwb3J0IGZvciBtYXhpbXVtIDEwIGNsYXNzZXMuXG4gKiBAamEg5aSa6YeN57aZ5om/44Gu44Gf44KB44GuIE1peGluIDxicj5cbiAqICAgICDmnIDlpKcgMTAg44Kv44Op44K544Gu5Z6L6Kej5rG644KS44K144Od44O844OIXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjbGFzcyBCYXNlIHsgY29uc3RydWN0b3IoYSwgYikge30gfTtcbiAqIGNsYXNzIE1peEEgeyBjb25zdHJ1Y3RvcihhLCBiKSB7fSB9O1xuICogY2xhc3MgTWl4QiB7IGNvbnN0cnVjdG9yKGMsIGQpIHt9IH07XG4gKlxuICogY2xhc3MgTWl4aW5DbGFzcyBleHRlbmRzIG1peGlucyhCYXNlLCBNaXhBLCBNaXhCKSB7XG4gKiAgICAgY29uc3RydWN0b3IoYSwgYiwgYywgZCl7XG4gKiAgICAgICAgIC8vIGNhbGxpbmcgYEJhc2VgIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHN1cGVyKGEsIGIpO1xuICpcbiAqICAgICAgICAgLy8gY2FsbGluZyBNaXhpbiBjbGFzcydzIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QSwgYSwgYik7XG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QiwgYywgZCk7XG4gKiAgICAgfVxuICogfVxuICogYGBgXG4gKlxuICogQHBhcmFtIGJhc2VcbiAqICAtIGBlbmAgcHJpbWFyeSBiYXNlIGNsYXNzLiBzdXBlcihhcmdzKSBpcyB0aGlzIGNsYXNzJ3Mgb25lLlxuICogIC0gYGphYCDln7rlupXjgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr8uIOWQjOWQjeODl+ODreODkeODhuOCoywg44Oh44K944OD44OJ44Gv5pyA5YSq5YWI44GV44KM44KLLiBzdXBlcihhcmdzKSDjga/jgZPjga7jgq/jg6njgrnjga7jgoLjga7jgYzmjIflrprlj6/og70uXG4gKiBAcGFyYW0gc291cmNlc1xuICogIC0gYGVuYCBtdWx0aXBsZSBleHRlbmRzIGNsYXNzXG4gKiAgLSBgamFgIOaLoeW8teOCr+ODqeOCueOCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHJldHVybnNcbiAqICAtIGBlbmAgbWl4aW5lZCBjbGFzcyBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDlkIjmiJDjgZXjgozjgZ/jgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1peGluczxCIGV4dGVuZHMgQ2xhc3MsIFMxLCBTMiwgUzMsIFM0LCBTNSwgUzYsIFM3LCBTOCwgUzk+KFxuICAgIGJhc2U6IEIsXG4gICAgLi4uc291cmNlczogW1xuICAgICAgICBDb25zdHJ1Y3RvcjxTMT4sXG4gICAgICAgIENvbnN0cnVjdG9yPFMyPj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFMzPj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM0Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM1Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM2Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM3Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM4Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM5Pj8sXG4gICAgICAgIC4uLmFueVtdXG4gICAgXSk6IE1peGluQ29uc3RydWN0b3I8QiwgTWl4aW5DbGFzcyAmIEluc3RhbmNlVHlwZTxCPiAmIFMxICYgUzIgJiBTMyAmIFM0ICYgUzUgJiBTNiAmIFM3ICYgUzggJiBTOT4ge1xuXG4gICAgbGV0IF9oYXNTb3VyY2VDb25zdHJ1Y3RvciA9IGZhbHNlO1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9jbGFzcy1uYW1lLWNhc2luZ1xuICAgIGNsYXNzIF9NaXhpbkJhc2UgZXh0ZW5kcyAoYmFzZSBhcyBhbnkgYXMgQ29uc3RydWN0b3I8TWl4aW5DbGFzcz4pIHtcblxuICAgICAgICBwcml2YXRlIHJlYWRvbmx5IFtfY29uc3RydWN0b3JzXTogTWFwPENvbnN0cnVjdG9yPGFueT4sIEZ1bmN0aW9uIHwgbnVsbD47XG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgW19jbGFzc0Jhc2VdOiBDb25zdHJ1Y3Rvcjxhbnk+O1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKC4uLmFyZ3M6IGFueVtdKSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29uc3RydWN0b3Itc3VwZXJcbiAgICAgICAgICAgIHN1cGVyKC4uLmFyZ3MpO1xuXG4gICAgICAgICAgICBjb25zdCBjb25zdHJ1Y3RvcnMgPSBuZXcgTWFwPENvbnN0cnVjdG9yPGFueT4sIEZ1bmN0aW9uPigpO1xuICAgICAgICAgICAgdGhpc1tfY29uc3RydWN0b3JzXSA9IGNvbnN0cnVjdG9ycztcbiAgICAgICAgICAgIHRoaXNbX2NsYXNzQmFzZV0gPSBiYXNlO1xuXG4gICAgICAgICAgICBpZiAoX2hhc1NvdXJjZUNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzcmNDbGFzcyBvZiBzb3VyY2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc3JjQ2xhc3NbX3Byb3RvRXh0ZW5kc09ubHldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoYW5kbGVyID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcGx5OiAodGFyZ2V0OiBhbnksIHRoaXNvYmo6IGFueSwgYXJnbGlzdDogYW55W10pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb2JqID0gbmV3IHNyY0NsYXNzKC4uLmFyZ2xpc3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3B5UHJvcGVydGllcyh0aGlzLCBvYmopO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBwcm94eSBmb3IgJ2NvbnN0cnVjdCcgYW5kIGNhY2hlIGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3RvcnMuc2V0KHNyY0NsYXNzLCBuZXcgUHJveHkoc3JjQ2xhc3MsIGhhbmRsZXIpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHByb3RlY3RlZCBzdXBlcjxUIGV4dGVuZHMgQ2xhc3M+KHNyY0NsYXNzOiBULCAuLi5hcmdzOiBDb25zdHJ1Y3RvclBhcmFtZXRlcnM8VD4pOiB0aGlzIHtcbiAgICAgICAgICAgIGNvbnN0IG1hcCA9IHRoaXNbX2NvbnN0cnVjdG9yc107XG4gICAgICAgICAgICBjb25zdCBjdG9yID0gbWFwLmdldChzcmNDbGFzcyk7XG4gICAgICAgICAgICBpZiAoY3Rvcikge1xuICAgICAgICAgICAgICAgIGN0b3IoLi4uYXJncyk7XG4gICAgICAgICAgICAgICAgbWFwLnNldChzcmNDbGFzcywgbnVsbCk7ICAgIC8vIHByZXZlbnQgY2FsbGluZyB0d2ljZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgaXNNaXhlZFdpdGg8VD4oc3JjQ2xhc3M6IENvbnN0cnVjdG9yPFQ+KTogYm9vbGVhbiB7XG4gICAgICAgICAgICBpZiAodGhpcy5jb25zdHJ1Y3RvciA9PT0gc3JjQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXNbX2NsYXNzQmFzZV0gPT09IHNyY0NsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzW19jbGFzc1NvdXJjZXNdLnJlZHVjZSgocCwgYykgPT4gcCB8fCAoc3JjQ2xhc3MgPT09IGMpLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgc3RhdGljIFtTeW1ib2wuaGFzSW5zdGFuY2VdKGluc3RhbmNlOiBhbnkpOiBib29sZWFuIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YuY2FsbChfTWl4aW5CYXNlLnByb3RvdHlwZSwgaW5zdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIFtfaXNJbmhlcml0ZWRdPFQ+KHNyY0NsYXNzOiBDb25zdHJ1Y3RvcjxUPik6IGJvb2xlYW4ge1xuICAgICAgICAgICAgY29uc3QgY3RvcnMgPSB0aGlzW19jb25zdHJ1Y3RvcnNdO1xuICAgICAgICAgICAgaWYgKGN0b3JzLmhhcyhzcmNDbGFzcykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgY3RvciBvZiBjdG9ycy5rZXlzKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mLmNhbGwoc3JjQ2xhc3MsIGN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByaXZhdGUgZ2V0IFtfY2xhc3NTb3VyY2VzXSgpOiBDb25zdHJ1Y3Rvcjxhbnk+W10ge1xuICAgICAgICAgICAgcmV0dXJuIFsuLi50aGlzW19jb25zdHJ1Y3RvcnNdLmtleXMoKV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHNyY0NsYXNzIG9mIHNvdXJjZXMpIHtcbiAgICAgICAgLy8gcHJvdmlkZSBjdXN0b20gaW5zdGFuY2VvZlxuICAgICAgICBjb25zdCBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzcmNDbGFzcywgU3ltYm9sLmhhc0luc3RhbmNlKTtcbiAgICAgICAgaWYgKCFkZXNjIHx8IGRlc2Mud3JpdGFibGUpIHtcbiAgICAgICAgICAgIGNvbnN0IG9yZ0luc3RhbmNlT2YgPSBkZXNjID8gc3JjQ2xhc3NbU3ltYm9sLmhhc0luc3RhbmNlXSA6IF9pbnN0YW5jZU9mO1xuICAgICAgICAgICAgc2V0SW5zdGFuY2VPZihzcmNDbGFzcywgKGluc3Q6IG9iamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBvcmdJbnN0YW5jZU9mLmNhbGwoc3JjQ2xhc3MsIGluc3QpIHx8ICgobnVsbCAhPSBpbnN0ICYmIGluc3RbX2lzSW5oZXJpdGVkXSkgPyBpbnN0W19pc0luaGVyaXRlZF0oc3JjQ2xhc3MpIDogZmFsc2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcHJvdmlkZSBwcm90b3R5cGVcbiAgICAgICAgY29weVByb3BlcnRpZXMoX01peGluQmFzZS5wcm90b3R5cGUsIHNyY0NsYXNzLnByb3RvdHlwZSk7XG4gICAgICAgIGxldCBwYXJlbnQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yoc3JjQ2xhc3MucHJvdG90eXBlKTtcbiAgICAgICAgd2hpbGUgKF9vYmpQcm90b3R5cGUgIT09IHBhcmVudCkge1xuICAgICAgICAgICAgY29weVByb3BlcnRpZXMoX01peGluQmFzZS5wcm90b3R5cGUsIHBhcmVudCk7XG4gICAgICAgICAgICBwYXJlbnQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocGFyZW50KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBjaGVjayBjb25zdHJ1Y3RvclxuICAgICAgICBpZiAoIV9oYXNTb3VyY2VDb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgX2hhc1NvdXJjZUNvbnN0cnVjdG9yID0gIXNyY0NsYXNzW19wcm90b0V4dGVuZHNPbmx5XTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBfTWl4aW5CYXNlIGFzIGFueTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlIG5vLWludmFsaWQtdGhpcywgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5jb25zdCByYW5kb20gPSBNYXRoLnJhbmRvbS5iaW5kKE1hdGgpO1xuXG4vKipcbiAqIEBlbiBFeGVjdXRlIHNodWZmbGUgb2YgYW4gYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6YWN5YiX6KaB57Sg44Gu44K344Oj44OD44OV44OrXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBkZXN0cnVjdGl2ZVxuICogIC0gYGVuYCB0cnVlOiBkZXN0cnVjdGl2ZSAvIGZhbHNlOiBub24tZGVzdHJ1Y3RpdmUgKGRlZmF1bHQpXG4gKiAgLSBgamFgIHRydWU6IOegtOWjiueahCAvIGZhbHNlOiDpnZ7noLTlo4rnmoQgKOaXouWumilcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGU8VD4oYXJyYXk6IFRbXSwgZGVzdHJ1Y3RpdmUgPSBmYWxzZSk6IFRbXSB7XG4gICAgY29uc3Qgc291cmNlID0gZGVzdHJ1Y3RpdmUgPyBhcnJheSA6IGFycmF5LnNsaWNlKCk7XG4gICAgY29uc3QgbGVuID0gc291cmNlLmxlbmd0aDtcbiAgICBmb3IgKGxldCBpID0gbGVuID4gMCA/IGxlbiA+Pj4gMCA6IDA7IGkgPiAxOykge1xuICAgICAgICBjb25zdCBqID0gaSAqIHJhbmRvbSgpID4+PiAwO1xuICAgICAgICBjb25zdCBzd2FwID0gc291cmNlWy0taV07XG4gICAgICAgIHNvdXJjZVtpXSA9IHNvdXJjZVtqXTtcbiAgICAgICAgc291cmNlW2pdID0gc3dhcDtcbiAgICB9XG4gICAgcmV0dXJuIHNvdXJjZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEV4ZWN1dGUgc3RhYmxlIHNvcnQgYnkgbWVyZ2Utc29ydCBhbGdvcml0aG0uXG4gKiBAamEgYG1lcmdlLXNvcnRgIOOBq+OCiOOCi+WuieWumuOCveODvOODiFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY29tcGFyYXRvclxuICogIC0gYGVuYCBzb3J0IGNvbXBhcmF0b3IgZnVuY3Rpb25cbiAqICAtIGBqYWAg44K944O844OI6Zai5pWw44KS5oyH5a6aXG4gKiBAcGFyYW0gZGVzdHJ1Y3RpdmVcbiAqICAtIGBlbmAgdHJ1ZTogZGVzdHJ1Y3RpdmUgLyBmYWxzZTogbm9uLWRlc3RydWN0aXZlIChkZWZhdWx0KVxuICogIC0gYGphYCB0cnVlOiDnoLTlo4rnmoQgLyBmYWxzZTog6Z2e56C05aOK55qEICjml6LlrpopXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzb3J0PFQ+KGFycmF5OiBUW10sIGNvbXBhcmF0b3I6IChsaHM6IFQsIHJoczogVCkgPT4gbnVtYmVyLCBkZXN0cnVjdGl2ZSA9IGZhbHNlKTogVFtdIHtcbiAgICBjb25zdCBzb3VyY2UgPSBkZXN0cnVjdGl2ZSA/IGFycmF5IDogYXJyYXkuc2xpY2UoKTtcbiAgICBpZiAoc291cmNlLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICB9XG4gICAgY29uc3QgbGhzID0gc29ydChzb3VyY2Uuc3BsaWNlKDAsIHNvdXJjZS5sZW5ndGggPj4+IDEpLCBjb21wYXJhdG9yLCB0cnVlKTtcbiAgICBjb25zdCByaHMgPSBzb3J0KHNvdXJjZS5zcGxpY2UoMCksIGNvbXBhcmF0b3IsIHRydWUpO1xuICAgIHdoaWxlIChsaHMubGVuZ3RoICYmIHJocy5sZW5ndGgpIHtcbiAgICAgICAgc291cmNlLnB1c2goY29tcGFyYXRvcihsaHNbMF0sIHJoc1swXSkgPD0gMCA/IGxocy5zaGlmdCgpIGFzIFQgOiByaHMuc2hpZnQoKSBhcyBUKTtcbiAgICB9XG4gICAgcmV0dXJuIHNvdXJjZS5jb25jYXQobGhzLCByaHMpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWFrZSB1bmlxdWUgYXJyYXkuXG4gKiBAamEg6YeN6KSH6KaB57Sg44Gu44Gq44GE6YWN5YiX44Gu5L2c5oiQXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuaXF1ZTxUPihhcnJheTogVFtdKTogVFtdIHtcbiAgICByZXR1cm4gWy4uLm5ldyBTZXQoYXJyYXkpXTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1ha2UgaW5kZXggYXJyYXkuXG4gKiBAamEg44Kk44Oz44OH44OD44Kv44K56YWN5YiX44Gu5L2c5oiQXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBleGNsdWRlc1xuICogIC0gYGVuYCBleGNsdWRlIGluZGV4IGluIHJldHVybiB2YWx1ZS5cbiAqICAtIGBqYWAg5oi744KK5YCk6YWN5YiX44Gr5ZCr44KB44Gq44GE44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbmRpY2VzPFQ+KGFycmF5OiBUW10sIC4uLmV4Y2x1ZGVzOiBudW1iZXJbXSk6IG51bWJlcltdIHtcbiAgICBjb25zdCByZXR2YWwgPSBbLi4uYXJyYXkua2V5cygpXTtcblxuICAgIGNvbnN0IGxlbiA9IGFycmF5Lmxlbmd0aDtcbiAgICBjb25zdCBleExpc3QgPSBbLi4ubmV3IFNldChleGNsdWRlcyldLnNvcnQoKGxocywgcmhzKSA9PiBsaHMgPCByaHMgPyAxIDogLTEpO1xuICAgIGZvciAoY29uc3QgZXggb2YgZXhMaXN0KSB7XG4gICAgICAgIGlmICgwIDw9IGV4ICYmIGV4IDwgbGVuKSB7XG4gICAgICAgICAgICByZXR2YWwuc3BsaWNlKGV4LCAxKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBbW2dyb3VwQnldXSgpIG9wdGlvbnMgZGVmaW5pdGlvbi5cbiAqIEBqYSBbW2dyb3VwQnldXSgpIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEdyb3VwQnlPcHRpb25zPFxuICAgIFQgZXh0ZW5kcyBvYmplY3QsXG4gICAgVEtFWVMgZXh0ZW5kcyBrZXlvZiBULFxuICAgIFRTVU1LRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUR1JPVVBLRVkgZXh0ZW5kcyBzdHJpbmdcbj4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBgR1JPVVAgQllgIGtleXMuXG4gICAgICogQGphIGBHUk9VUCBCWWAg44Gr5oyH5a6a44GZ44KL44Kt44O8XG4gICAgICovXG4gICAga2V5czogRXh0cmFjdDxUS0VZUywgc3RyaW5nPltdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFnZ3JlZ2F0YWJsZSBrZXlzLlxuICAgICAqIEBqYSDpm4boqIjlj6/og73jgarjgq3jg7zkuIDopqdcbiAgICAgKi9cbiAgICBzdW1LZXlzPzogRXh0cmFjdDxUU1VNS0VZUywgc3RyaW5nPltdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdyb3VwZWQgaXRlbSBhY2Nlc3Mga2V5LiBkZWZhdWx0OiAnaXRlbXMnLFxuICAgICAqIEBqYSDjgrDjg6vjg7zjg5Tjg7PjgrDjgZXjgozjgZ/opoHntKDjgbjjga7jgqLjgq/jgrvjgrnjgq3jg7wuIOaXouWumjogJ2l0ZW1zJ1xuICAgICAqL1xuICAgIGdyb3VwS2V5PzogVEdST1VQS0VZO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm4gdHlwZSBvZiBbW2dyb3VwQnldXSgpLlxuICogQGphIFtbZ3JvdXBCeV1dKCkg44GM6L+U5Y2044GZ44KL5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIEdyb3VwQnlSZXR1cm5WYWx1ZTxcbiAgICBUIGV4dGVuZHMgb2JqZWN0LFxuICAgIFRLRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUU1VNS0VZUyBleHRlbmRzIGtleW9mIFQgPSBuZXZlcixcbiAgICBUR1JPVVBLRVkgZXh0ZW5kcyBzdHJpbmcgPSAnaXRlbXMnXG4+ID0gUmVhZG9ubHk8UmVjb3JkPFRLRVlTLCB7fT4gJiBSZWNvcmQ8VFNVTUtFWVMsIHt9PiAmIFJlY29yZDxUR1JPVVBLRVksIFRbXT4+O1xuXG4vKipcbiAqIEBlbiBFeGVjdXRlIGBHUk9VUCBCWWAgZm9yIGFycmF5IGVsZW1lbnRzLlxuICogQGphIOmFjeWIl+OBruimgee0oOOBriBgR1JPVVAgQllgIOmbhuWQiOOCkuaKveWHulxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBgR1JPVVAgQllgIG9wdGlvbnNcbiAqICAtIGBqYWAgYEdST1VQIEJZYCDjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdyb3VwQnk8XG4gICAgVCBleHRlbmRzIG9iamVjdCxcbiAgICBUS0VZUyBleHRlbmRzIGtleW9mIFQsXG4gICAgVFNVTUtFWVMgZXh0ZW5kcyBrZXlvZiBUID0gbmV2ZXIsXG4gICAgVEdST1VQS0VZIGV4dGVuZHMgc3RyaW5nID0gJ2l0ZW1zJ1xuPihhcnJheTogVFtdLCBvcHRpb25zOiBHcm91cEJ5T3B0aW9uczxULCBUS0VZUywgVFNVTUtFWVMsIFRHUk9VUEtFWT4pOiBHcm91cEJ5UmV0dXJuVmFsdWU8VCwgVEtFWVMsIFRTVU1LRVlTLCBUR1JPVVBLRVk+W10ge1xuICAgIGNvbnN0IHsga2V5cywgc3VtS2V5cywgZ3JvdXBLZXkgfSA9IG9wdGlvbnM7XG4gICAgY29uc3QgX2dyb3VwS2V5ID0gZ3JvdXBLZXkgfHwgJ2l0ZW1zJztcbiAgICBjb25zdCBfc3VtS2V5czogc3RyaW5nW10gPSBzdW1LZXlzIHx8IFtdO1xuICAgIF9zdW1LZXlzLnB1c2goX2dyb3VwS2V5KTtcblxuICAgIGNvbnN0IGhhc2ggPSBhcnJheS5yZWR1Y2UoKHJlczogVCwgZGF0YTogVCkgPT4ge1xuICAgICAgICAvLyBjcmVhdGUgZ3JvdXBCeSBpbnRlcm5hbCBrZXlcbiAgICAgICAgY29uc3QgX2tleSA9IGtleXMucmVkdWNlKChzLCBrKSA9PiBzICsgU3RyaW5nKGRhdGFba10pLCAnJyk7XG5cbiAgICAgICAgLy8gaW5pdCBrZXlzXG4gICAgICAgIGlmICghKF9rZXkgaW4gcmVzKSkge1xuICAgICAgICAgICAgY29uc3Qga2V5TGlzdCA9IGtleXMucmVkdWNlKChoLCBrOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICBoW2tdID0gZGF0YVtrXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaDtcbiAgICAgICAgICAgIH0sIHt9KTtcblxuICAgICAgICAgICAgcmVzW19rZXldID0gX3N1bUtleXMucmVkdWNlKChoLCBrOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICBoW2tdID0gMDtcbiAgICAgICAgICAgICAgICByZXR1cm4gaDtcbiAgICAgICAgICAgIH0sIGtleUxpc3QpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzS2V5ID0gcmVzW19rZXldO1xuXG4gICAgICAgIC8vIHN1bSBwcm9wZXJ0aWVzXG4gICAgICAgIGZvciAoY29uc3QgayBvZiBfc3VtS2V5cykge1xuICAgICAgICAgICAgaWYgKF9ncm91cEtleSA9PT0gaykge1xuICAgICAgICAgICAgICAgIHJlc0tleVtrXSA9IHJlc0tleVtrXSB8fCBbXTtcbiAgICAgICAgICAgICAgICByZXNLZXlba10ucHVzaChkYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzS2V5W2tdICs9IGRhdGFba107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH0sIHt9KTtcblxuICAgIHJldHVybiBPYmplY3QudmFsdWVzKGhhc2gpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLm1hcCgpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLm1hcCgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqIFxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIHRoaXNBcmdcbiAqICAtIGBlbmAgVmFsdWUgdG8gdXNlIGFzICp0aGlzKiB3aGVuIGV4ZWN1dGluZyB0aGUgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDlrp/ooYzjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCAqQXJyYXkqIGFzIHZhbHVlLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PntZDmnpzphY3liJfjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1hcDxULCBVPih0aGlzOiBhbnksIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUgfCBQcm9taXNlPFU+LCB0aGlzQXJnPzogYW55KTogUHJvbWlzZTxVW10+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXG4gICAgICAgIGFycmF5Lm1hcChhc3luYyAodiwgaSwgYSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhKTtcbiAgICAgICAgfSlcbiAgICApO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuZmlsdGVyKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZmlsdGVyKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgKkFycmF5KiBhcyB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c6YWN5YiX44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaWx0ZXI8VD4odGhpczogYW55LCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBib29sZWFuIHwgUHJvbWlzZTxib29sZWFuPiwgdGhpc0FyZz86IGFueSk6IFByb21pc2U8VFtdPiB7XG4gICAgY29uc3QgYml0czogYm9vbGVhbltdID0gYXdhaXQgbWFwKGFycmF5LCAodiwgaSwgYSkgPT4gY2FsbGJhY2suY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHYsIGksIGEpKTtcbiAgICByZXR1cm4gYXJyYXkuZmlsdGVyKCgpID0+IGJpdHMuc2hpZnQoKSk7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5maW5kKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZmluZCgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50IHZhbHVlLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PntZDmnpzjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbmQ8VD4odGhpczogYW55LCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBib29sZWFuIHwgUHJvbWlzZTxib29sZWFuPiwgdGhpc0FyZz86IGFueSk6IFByb21pc2U8VCB8IHVuZGVmaW5lZD4ge1xuICAgIGZvciAoY29uc3QgW2ksIHZdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoYXdhaXQgY2FsbGJhY2suY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHYsIGksIGFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLmZpbmRJbmRleCgpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLmZpbmRJbmRleCgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50IGluZGV4IHZhbHVlLlxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbmRJbmRleDxUPih0aGlzOiBhbnksIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IGJvb2xlYW4gfCBQcm9taXNlPGJvb2xlYW4+LCB0aGlzQXJnPzogYW55KTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLnNvbWUoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5zb21lKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgYm9vbGVhbiB2YWx1ZS5cbiAqICAtIGBqYWAg55yf5YG95YCk44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzb21lPFQ+KHRoaXM6IGFueSwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdW5rbm93biB8IFByb21pc2U8dW5rbm93bj4sIHRoaXNBcmc/OiBhbnkpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLmV2ZXJ5KClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZXZlcnkoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIHRoaXNBcmdcbiAqICAtIGBlbmAgVmFsdWUgdG8gdXNlIGFzICp0aGlzKiB3aGVuIGV4ZWN1dGluZyB0aGUgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDlrp/ooYzjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCBib29sZWFuIHZhbHVlLlxuICogIC0gYGphYCDnnJ/lgb3lgKTjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV2ZXJ5PFQ+KHRoaXM6IGFueSwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdW5rbm93biB8IFByb21pc2U8dW5rbm93bj4sIHRoaXNBcmc/OiBhbnkpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKCFhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdiwgaSwgYXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5yZWR1Y2UoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5yZWR1Y2UoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIGluaXRpYWxWYWx1ZVxuICogIC0gYGVuYCBVc2VkIGFzIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBmaXJzdCBjYWxsIG9mIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag44Gr5rih44GV44KM44KL5Yid5pyf5YCkXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgKkFycmF5KiBhcyB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c6YWN5YiX44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWR1Y2U8VCwgVT4oXG4gICAgYXJyYXk6IFRbXSxcbiAgICBjYWxsYmFjazogKGFjY3VtdWxhdG9yOiBVLCBjdXJyZW50VmFsdWU6IFQsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVIHwgUHJvbWlzZTxVPixcbiAgICBpbml0aWFsVmFsdWU/OiBVXG4pOiBQcm9taXNlPFU+IHtcbiAgICBpZiAoYXJyYXkubGVuZ3RoIDw9IDAgJiYgdW5kZWZpbmVkID09PSBpbml0aWFsVmFsdWUpIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdSZWR1Y2Ugb2YgZW1wdHkgYXJyYXkgd2l0aCBubyBpbml0aWFsIHZhbHVlJyk7XG4gICAgfVxuXG4gICAgY29uc3QgaGFzSW5pdCA9ICh1bmRlZmluZWQgIT09IGluaXRpYWxWYWx1ZSk7XG4gICAgbGV0IGFjYyA9IChoYXNJbml0ID8gaW5pdGlhbFZhbHVlIDogYXJyYXlbMF0pIGFzIFU7XG5cbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKCEoIWhhc0luaXQgJiYgMCA9PT0gaSkpIHtcbiAgICAgICAgICAgIGFjYyA9IGF3YWl0IGNhbGxiYWNrKGFjYywgdiwgaSwgYXJyYXkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGFjYztcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuZnVuY3Rpb24gY2FsbGFibGUoKTogYW55IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVzZS1iZWZvcmUtZGVmaW5lXG4gICAgcmV0dXJuIGFjY2Vzc2libGU7XG59XG5cbmNvbnN0IGFjY2Vzc2libGU6IGFueSA9IG5ldyBQcm94eShjYWxsYWJsZSwge1xuICAgIGdldDogKHRhcmdldCwgbmFtZSkgPT4ge1xuICAgICAgICBjb25zdCBwcm9wID0gdGFyZ2V0W25hbWVdO1xuICAgICAgICBpZiAobnVsbCAhPSBwcm9wKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvcDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBhY2Nlc3NpYmxlO1xuICAgICAgICB9XG4gICAgfSxcbn0pO1xuXG5mdW5jdGlvbiBjcmVhdGUoKTogYW55IHtcbiAgICBjb25zdCBzdHViID0gbmV3IFByb3h5KHt9LCB7XG4gICAgICAgIGdldDogKHRhcmdldCwgbmFtZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcHJvcCA9IHRhcmdldFtuYW1lXTtcbiAgICAgICAgICAgIGlmIChudWxsICE9IHByb3ApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvcDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjY2Vzc2libGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoc3R1YiwgJ3N0dWInLCB7XG4gICAgICAgIHZhbHVlOiB0cnVlLFxuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc3R1Yjtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHNhZmUgYWNjZXNzaWJsZSBvYmplY3QuXG4gKiBAamEg5a6J5YWo44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kq44OW44K444Kn44Kv44OI44Gu5Y+W5b6XXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBzYWZlV2luZG93ID0gc2FmZShnbG9iYWxUaGlzLndpbmRvdyk7XG4gKiBjb25zb2xlLmxvZyhudWxsICE9IHNhZmVXaW5kb3cuZG9jdW1lbnQpOyAgICAvLyB0cnVlXG4gKiBjb25zdCBkaXYgPSBzYWZlV2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICogY29uc29sZS5sb2cobnVsbCAhPSBkaXYpOyAgICAvLyB0cnVlXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIEEgcmVmZXJlbmNlIG9mIGFuIG9iamVjdCB3aXRoIGEgcG9zc2liaWxpdHkgd2hpY2ggZXhpc3RzLlxuICogIC0gYGphYCDlrZjlnKjjgZfjgYbjgovjgqrjg5bjgrjjgqfjgq/jg4jjga7lj4LnhadcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJlYWxpdHkgb3Igc3R1YiBpbnN0YW5jZS5cbiAqICAtIGBqYWAg5a6f5L2T44G+44Gf44Gv44K544K/44OW44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYWZlPFQ+KHRhcmdldDogVCk6IFQge1xuICAgIHJldHVybiB0YXJnZXQgfHwgY3JlYXRlKCk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktaW50ZXJmYWNlLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7IGdldEdsb2JhbCB9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7IHNhZmUgfSBmcm9tICcuL3NhZmUnO1xuXG4vKipcbiAqIEBlbiBUeXBlIG9mIGhhbmRsZSBmb3IgdGltZXIgZnVuY3Rpb25zLlxuICogQGphIOOCv+OCpOODnuODvOmWouaVsOOBq+S9v+eUqOOBmeOCi+ODj+ODs+ODieODq+Wei1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRpbWVySGFuZGxlIHsgfVxuXG4vKipcbiAqIEBlbiBUeXBlIG9mIHRpbWVyIHN0YXJ0IGZ1bmN0aW9ucy5cbiAqIEBqYSDjgr/jgqTjg57jg7zplovlp4vplqLmlbDjga7lnotcbiAqL1xuZXhwb3J0IHR5cGUgVGltZXJTdGFydEZ1bmN0aW9uID0gKGhhbmRsZXI6IEZ1bmN0aW9uLCB0aW1lb3V0PzogbnVtYmVyLCAuLi5hcmdzOiBhbnlbXSkgPT4gVGltZXJIYW5kbGU7XG5cbi8qKlxuICogQGVuIFR5cGUgb2YgdGltZXIgc3RvcCBmdW5jdGlvbnMuXG4gKiBAamEg44K/44Kk44Oe44O85YGc5q2i6Zai5pWw44Gu5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFRpbWVyU3RvcEZ1bmN0aW9uID0gKGhhbmRsZTogVGltZXJIYW5kbGUpID0+IHZvaWQ7XG5cbmNvbnN0IHJvb3Q6IGFueSA9IGdldEdsb2JhbCgpO1xuY29uc3QgX3NldFRpbWVvdXQ6IFRpbWVyU3RhcnRGdW5jdGlvbiA9IHNhZmUocm9vdC5zZXRUaW1lb3V0KTtcbmNvbnN0IF9jbGVhclRpbWVvdXQ6IFRpbWVyU3RvcEZ1bmN0aW9uID0gc2FmZShyb290LmNsZWFyVGltZW91dCk7XG5jb25zdCBfc2V0SW50ZXJ2YWw6IFRpbWVyU3RhcnRGdW5jdGlvbiA9IHNhZmUocm9vdC5zZXRJbnRlcnZhbCk7XG5jb25zdCBfY2xlYXJJbnRlcnZhbDogVGltZXJTdG9wRnVuY3Rpb24gPSBzYWZlKHJvb3QuY2xlYXJJbnRlcnZhbCk7XG5cbmV4cG9ydCB7XG4gICAgX3NldFRpbWVvdXQgYXMgc2V0VGltZW91dCxcbiAgICBfY2xlYXJUaW1lb3V0IGFzIGNsZWFyVGltZW91dCxcbiAgICBfc2V0SW50ZXJ2YWwgYXMgc2V0SW50ZXJ2YWwsXG4gICAgX2NsZWFySW50ZXJ2YWwgYXMgY2xlYXJJbnRlcnZhbCxcbn07XG4iLCJpbXBvcnQge1xuICAgIFdyaXRhYmxlLFxuICAgIFByaW1pdGl2ZSxcbiAgICBUeXBlZERhdGEsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNPYmplY3QsXG4gICAgY2xhc3NOYW1lLFxufSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IHNldFRpbWVvdXQgfSBmcm9tICcuL3RpbWVyJztcblxuLyoqXG4gKiBAZW4gRW5zdXJlIGFzeW5jaHJvbm91cyBleGVjdXRpb24uXG4gKiBAamEg6Z2e5ZCM5pyf5a6f6KGM44KS5L+d6Ki8XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBwb3N0KCgpID0+IGV4ZWMoYXJnKSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgaW1wbGVtZW50IGFzIGZ1bmN0aW9uIHNjb3BlLlxuICogIC0gYGphYCDplqLmlbDjgrnjgrPjg7zjg5fjgajjgZfjgablrp/oo4VcbiovXG5leHBvcnQgZnVuY3Rpb24gcG9zdDxUPihleGVjdXRvcjogKCkgPT4gVCk6IFByb21pc2U8VD4ge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGV4ZWN1dG9yKTtcbn1cblxuLyoqXG4gKiBAZW4gR2VuZXJpYyBOby1PcGVyYXRpb24uXG4gKiBAamEg5rGO55SoIE5vLU9wZXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9vcCguLi5hcmdzOiBhbnlbXSk6IGFueSB7ICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgLy8gbm9vcFxufVxuXG4vKipcbiAqIEBlbiBXYWl0IGZvciB0aGUgZGVzaWduYXRpb24gZWxhcHNlLlxuICogQGphIOaMh+WumuaZgumWk+WHpueQhuOCkuW+heapn1xuICpcbiAqIEBwYXJhbSBlbGFwc2VcbiAqICAtIGBlbmAgd2FpdCBlbGFwc2UgW21zZWNdLlxuICogIC0gYGphYCDlvoXmqZ/mmYLplpMgW21zZWNdXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzbGVlcChlbGFwc2U6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgZWxhcHNlKSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgZXNjYXBlIGZ1bmN0aW9uIGZyb20gbWFwLlxuICogQGphIOaWh+Wtl+e9ruaPm+mWouaVsOOCkuS9nOaIkFxuICpcbiAqIEBwYXJhbSBtYXBcbiAqICAtIGBlbmAga2V5OiB0YXJnZXQgY2hhciwgdmFsdWU6IHJlcGxhY2UgY2hhclxuICogIC0gYGphYCBrZXk6IOe9ruaPm+WvvuixoSwgdmFsdWU6IOe9ruaPm+aWh+Wtl1xuICogQHJldHVybnNcbiAqICAtIGBlbmAgZXNwYWNlIGZ1bmN0aW9uXG4gKiAgLSBgamFgIOOCqOOCueOCseODvOODl+mWouaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRXNjYXBlcihtYXA6IG9iamVjdCk6IChzcmM6IFByaW1pdGl2ZSkgPT4gc3RyaW5nIHtcbiAgICBjb25zdCBlc2NhcGVyID0gKG1hdGNoOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgICByZXR1cm4gbWFwW21hdGNoXTtcbiAgICB9O1xuXG4gICAgY29uc3Qgc291cmNlID0gYCg/OiR7T2JqZWN0LmtleXMobWFwKS5qb2luKCd8Jyl9KWA7XG4gICAgY29uc3QgcmVnZXhUZXN0ID0gUmVnRXhwKHNvdXJjZSk7XG4gICAgY29uc3QgcmVnZXhSZXBsYWNlID0gUmVnRXhwKHNvdXJjZSwgJ2cnKTtcblxuICAgIHJldHVybiAoc3JjOiBQcmltaXRpdmUpOiBzdHJpbmcgPT4ge1xuICAgICAgICBzcmMgPSAobnVsbCA9PSBzcmMgfHwgJ3N5bWJvbCcgPT09IHR5cGVvZiBzcmMpID8gJycgOiBTdHJpbmcoc3JjKTtcbiAgICAgICAgcmV0dXJuIHJlZ2V4VGVzdC50ZXN0KHNyYykgPyBzcmMucmVwbGFjZShyZWdleFJlcGxhY2UsIGVzY2FwZXIpIDogc3JjO1xuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEVzY2FwZSBIVE1MIHN0cmluZ1xuICogQGphIEhUTUwg44Gn5L2/55So44GZ44KL5paH5a2X44KS5Yi25b6h5paH5a2X44Gr572u5o+bXG4gKlxuICogQGJyaWVmIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgbWFwSHRtbEVzY2FwZSA9IHtcbiAqICAgICAnPCc6ICcmbHQ7JyxcbiAqICAgICAnPic6ICcmZ3Q7JyxcbiAqICAgICAnJic6ICcmYW1wOycsXG4gKiAgICAgJ1wiJzogJyZxdW90OycsXG4gKiAgICAgXCInXCI6ICcmIzM5OycsXG4gKiAgICAgJ2AnOiAnJiN4NjA7J1xuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgZXNjYXBlSFRNTCA9IGNyZWF0ZUVzY2FwZXIoe1xuICAgICc8JzogJyZsdDsnLFxuICAgICc+JzogJyZndDsnLFxuICAgICcmJzogJyZhbXA7JyxcbiAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICBcIidcIjogJyYjMzk7JyxcbiAgICAnYCc6ICcmI3g2MDsnXG59KTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gdGhlIHN0eWxlIGNvbXB1bHNpb24gdmFsdWUgZnJvbSBpbnB1dCBzdHJpbmcuXG4gKiBAamEg5YWl5Yqb5paH5a2X5YiX44KS5Z6L5by35Yi244GX44Gf5YCk44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgaW5wdXQgc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WvvuixoeOBruaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9UeXBlZERhdGEoZGF0YTogc3RyaW5nIHwgdW5kZWZpbmVkKTogVHlwZWREYXRhIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoJ3RydWUnID09PSBkYXRhKSB7XG4gICAgICAgIC8vIGJvb2xlYW46IHRydWVcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICgnZmFsc2UnID09PSBkYXRhKSB7XG4gICAgICAgIC8vIGJvb2xlYW46IGZhbHNlXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKCdudWxsJyA9PT0gZGF0YSkge1xuICAgICAgICAvLyBudWxsXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoZGF0YSA9PT0gU3RyaW5nKE51bWJlcihkYXRhKSkpIHtcbiAgICAgICAgLy8gbnVtYmVyOiDmlbDlgKTlpInmj5sg4oaSIOaWh+Wtl+WIl+WkieaPm+OBp+WFg+OBq+aIu+OCi+OBqOOBjVxuICAgICAgICByZXR1cm4gTnVtYmVyKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSAmJiAvXig/Olxce1tcXHdcXFddKlxcfXxcXFtbXFx3XFxXXSpcXF0pJC8udGVzdChkYXRhKSkge1xuICAgICAgICAvLyBvYmplY3RcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc3RyaW5nIC8gdW5kZWZpbmVkXG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBzdHJpbmcgZnJvbSBbW1R5cGVkRGF0YV1dLlxuICogQGphIFtbVHlwZWREYXRhXV0g44KS5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgaW5wdXQgc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WvvuixoeOBruaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbVR5cGVkRGF0YShkYXRhOiBUeXBlZERhdGEgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGlmICh1bmRlZmluZWQgPT09IGRhdGEgfHwgaXNTdHJpbmcoZGF0YSkpIHtcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSBlbHNlIGlmIChpc09iamVjdChkYXRhKSkge1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFN0cmluZyhkYXRhKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gYFdlYiBBUElgIHN0b2NrZWQgdHlwZS4gPGJyPlxuICogICAgIEVuc3VyZSBub3QgdG8gcmV0dXJuIGB1bmRlZmluZWRgIHZhbHVlLlxuICogQGphIGBXZWIgQVBJYCDmoLzntI3lvaLlvI/jgavlpInmj5sgPGJyPlxuICogICAgIGB1bmRlZmluZWRgIOOCkui/lOWNtOOBl+OBquOBhOOBk+OBqOOCkuS/neiovFxuICovXG5leHBvcnQgZnVuY3Rpb24gZHJvcFVuZGVmaW5lZDxUPih2YWx1ZTogVCB8IG51bGwgfCB1bmRlZmluZWQsIG5pbFNlcmlhbGl6ZSA9IGZhbHNlKTogVCB8ICdudWxsJyB8ICd1bmRlZmluZWQnIHwgbnVsbCB7XG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWUgPyB2YWx1ZSA6IChuaWxTZXJpYWxpemUgPyBTdHJpbmcodmFsdWUpIDogbnVsbCkgYXMgVCB8ICdudWxsJyB8ICd1bmRlZmluZWQnIHwgbnVsbDtcbn1cblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemUgZnJvbSBgV2ViIEFQSWAgc3RvY2tlZCB0eXBlLiA8YnI+XG4gKiAgICAgQ29udmVydCBmcm9tICdudWxsJyBvciAndW5kZWZpbmVkJyBzdHJpbmcgdG8gb3JpZ2luYWwgdHlwZS5cbiAqIEBqYSAnbnVsbCcgb3IgJ3VuZGVmaW5lZCcg44KS44KC44Go44Gu5Z6L44Gr5oi744GZXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXN0b3JlTmlsPFQ+KHZhbHVlOiBUIHwgJ251bGwnIHwgJ3VuZGVmaW5lZCcpOiBUIHwgbnVsbCB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCdudWxsJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmICgndW5kZWZpbmVkJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgd2hldGhlciBpbnB1dCBzb3VyY2UgaGFzIGEgcHJvcGVydHkuXG4gKiBAamEg5YWl5Yqb5YWD44GM44OX44Ot44OR44OG44Kj44KS5oyB44Gj44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNyY1xuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzUHJvcGVydHkoc3JjOiB1bmtub3duLCBwcm9wTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIG51bGwgIT0gc3JjICYmIGlzT2JqZWN0KHNyYykgJiYgKHByb3BOYW1lIGluIHNyYyk7XG59XG5cbi8qKlxuICogQGVuIEdldCBzaGFsbG93IGNvcHkgb2YgYHRhcmdldGAgd2hpY2ggaGFzIG9ubHkgYHBpY2t1cEtleXNgLlxuICogQGphIGBwaWNrdXBLZXlzYCDjgafmjIflrprjgZXjgozjgZ/jg5fjg63jg5Hjg4bjgqPjga7jgb/jgpLmjIHjgaQgYHRhcmdldGAg44GuIFNoYWxsb3cgQ29weSDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIGNvcHkgc291cmNlIG9iamVjdFxuICogIC0gYGphYCDjgrPjg5Tjg7zlhYPjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBwaWNrdXBLZXlzXG4gKiAgLSBgZW5gIGNvcHkgdGFyZ2V0IGtleXNcbiAqICAtIGBqYWAg44Kz44OU44O85a++6LGh44Gu44Kt44O85LiA6KanXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJ0aWFsaXplPFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBrZXlvZiBUPih0YXJnZXQ6IFQsIC4uLnBpY2t1cEtleXM6IEtbXSk6IFdyaXRhYmxlPFBpY2s8VCwgSz4+IHtcbiAgICBpZiAoIXRhcmdldCB8fCAhaXNPYmplY3QodGFyZ2V0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGAke2NsYXNzTmFtZSh0YXJnZXQpfSBpcyBub3QgYW4gb2JqZWN0LmApO1xuICAgIH1cbiAgICByZXR1cm4gcGlja3VwS2V5cy5yZWR1Y2UoKG9iaiwga2V5KSA9PiB7XG4gICAgICAgIGtleSBpbiB0YXJnZXQgJiYgKG9ialtrZXldID0gdGFyZ2V0W2tleV0pO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH0sIHt9IGFzIFdyaXRhYmxlPFBpY2s8VCwgSz4+KTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbmxldCBfbG9jYWxJZCA9IDA7XG5cbi8qKlxuICogQGVuIEdldCBsb2NhbCB1bmlxdWUgaWQuIDxicj5cbiAqICAgICBcImxvY2FsIHVuaXF1ZVwiIG1lYW5zIGd1YXJhbnRlZXMgdW5pcXVlIGR1cmluZyBpbiBzY3JpcHQgbGlmZSBjeWNsZSBvbmx5LlxuICogQGphIOODreODvOOCq+ODq+ODpuODi+ODvOOCryBJRCDjga7lj5blvpcgPGJyPlxuICogICAgIOOCueOCr+ODquODl+ODiOODqeOCpOODleOCteOCpOOCr+ODq+S4reOBruWQjOS4gOaAp+OCkuS/neiovOOBmeOCiy5cbiAqXG4gKiBAcGFyYW0gcHJlZml4XG4gKiAgLSBgZW5gIElEIHByZWZpeFxuICogIC0gYGphYCBJRCDjgavku5jkuI7jgZnjgosgUHJlZml4XG4gKiBAcGFyYW0gemVyb1BhZFxuICogIC0gYGVuYCAwIHBhZGRpbmcgb3JkZXJcbiAqICAtIGBqYWAgMCDoqbDjgoHjgZnjgovmoYHmlbDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGx1aWQocHJlZml4ID0gJycsIHplcm9QYWQ/OiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IGlkID0gKCsrX2xvY2FsSWQpLnRvU3RyaW5nKDE2KTtcbiAgICByZXR1cm4gKG51bGwgIT0gemVyb1BhZCkgPyBgJHtwcmVmaXh9JHtpZC5wYWRTdGFydCh6ZXJvUGFkLCAnMCcpfWAgOiBgJHtwcmVmaXh9JHtpZH1gO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgZmlyc3QgbGV0dGVyIG9mIHRoZSBzdHJpbmcgdG8gdXBwZXJjYXNlLlxuICogQGphIOacgOWIneOBruaWh+Wtl+OCkuWkp+aWh+Wtl+OBq+WkieaPm1xuICpcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNhcGl0YWxpemUoXCJmb28gQmFyXCIpO1xuICogLy8gPT4gXCJGb28gQmFyXCJcbiAqXG4gKiBjYXBpdGFsaXplKFwiRk9PIEJhclwiLCB0cnVlKTtcbiAqIC8vID0+IFwiRm9vIGJhclwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKiBAcGFyYW0gbG93ZXJjYXNlUmVzdFxuICogIC0gYGVuYCBJZiBgdHJ1ZWAgaXMgcGFzc2VkLCB0aGUgcmVzdCBvZiB0aGUgc3RyaW5nIHdpbGwgYmUgY29udmVydGVkIHRvIGxvd2VyIGNhc2VcbiAqICAtIGBqYWAgYHRydWVgIOOCkuaMh+WumuOBl+OBn+WgtOWQiCwgMuaWh+Wtl+ebruS7pemZjeOCguWwj+aWh+Wtl+WMllxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FwaXRhbGl6ZShzcmM6IHN0cmluZywgbG93ZXJjYXNlUmVzdCA9IGZhbHNlKTogc3RyaW5nIHtcbiAgICBjb25zdCByZW1haW5pbmdDaGFycyA9ICFsb3dlcmNhc2VSZXN0ID8gc3JjLnNsaWNlKDEpIDogc3JjLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIHNyYy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHJlbWFpbmluZ0NoYXJzO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBmaXJzdCBsZXR0ZXIgb2YgdGhlIHN0cmluZyB0byBsb3dlcmNhc2UuXG4gKiBAamEg5pyA5Yid44Gu5paH5a2X44KS5bCP5paH5a2X5YyWXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBkZWNhcGl0YWxpemUoXCJGb28gQmFyXCIpO1xuICogLy8gPT4gXCJmb28gQmFyXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlY2FwaXRhbGl6ZShzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHNyYy5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIHNyYy5zbGljZSgxKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgdW5kZXJzY29yZWQgb3IgZGFzaGVyaXplZCBzdHJpbmcgdG8gYSBjYW1lbGl6ZWQgb25lLiA8YnI+XG4gKiAgICAgQmVnaW5zIHdpdGggYSBsb3dlciBjYXNlIGxldHRlciB1bmxlc3MgaXQgc3RhcnRzIHdpdGggYW4gdW5kZXJzY29yZSwgZGFzaCBvciBhbiB1cHBlciBjYXNlIGxldHRlci5cbiAqIEBqYSBgX2AsIGAtYCDljLrliIfjgormloflrZfliJfjgpLjgq3jg6Pjg6Hjg6vjgrHjg7zjgrnljJYgPGJyPlxuICogICAgIGAtYCDjgb7jgZ/jga/lpKfmloflrZfjgrnjgr/jg7zjg4jjgafjgYLjgozjgbAsIOWkp+aWh+Wtl+OCueOCv+ODvOODiOOBjOaXouWumuWApFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2FtZWxpemUoXCJtb3otdHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJtb3pUcmFuc2Zvcm1cIlxuICpcbiAqIGNhbWVsaXplKFwiLW1vei10cmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIk1velRyYW5zZm9ybVwiXG4gKlxuICogY2FtZWxpemUoXCJfbW96X3RyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwiTW96VHJhbnNmb3JtXCJcbiAqXG4gKiBjYW1lbGl6ZShcIk1vei10cmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIk1velRyYW5zZm9ybVwiXG4gKlxuICogY2FtZWxpemUoXCItbW96LXRyYW5zZm9ybVwiLCB0cnVlKTtcbiAqIC8vID0+IFwibW96VHJhbnNmb3JtXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqIEBwYXJhbSBsb3dlclxuICogIC0gYGVuYCBJZiBgdHJ1ZWAgaXMgcGFzc2VkLCBmb3JjZSBjb252ZXJ0cyB0byBsb3dlciBjYW1lbCBjYXNlIGluIHN0YXJ0cyB3aXRoIHRoZSBzcGVjaWFsIGNhc2UuXG4gKiAgLSBgamFgIOW8t+WItueahOOBq+Wwj+aWh+Wtl+OCueOCv+ODvOODiOOBmeOCi+WgtOWQiOOBq+OBryBgdHJ1ZWAg44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYW1lbGl6ZShzcmM6IHN0cmluZywgbG93ZXIgPSBmYWxzZSk6IHN0cmluZyB7XG4gICAgc3JjID0gc3JjLnRyaW0oKS5yZXBsYWNlKC9bLV9cXHNdKyguKT8vZywgKG1hdGNoLCBjKSA9PiB7XG4gICAgICAgIHJldHVybiBjID8gYy50b1VwcGVyQ2FzZSgpIDogJyc7XG4gICAgfSk7XG5cbiAgICBpZiAodHJ1ZSA9PT0gbG93ZXIpIHtcbiAgICAgICAgcmV0dXJuIGRlY2FwaXRhbGl6ZShzcmMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzcmM7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBzdHJpbmcgdG8gY2FtZWxpemVkIGNsYXNzIG5hbWUuIEZpcnN0IGxldHRlciBpcyBhbHdheXMgdXBwZXIgY2FzZS5cbiAqIEBqYSDlhYjpoK3lpKfmloflrZfjga7jgq3jg6Pjg6Hjg6vjgrHjg7zjgrnjgavlpInmj5tcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNsYXNzaWZ5KFwic29tZV9jbGFzc19uYW1lXCIpO1xuICogLy8gPT4gXCJTb21lQ2xhc3NOYW1lXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzaWZ5KHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gY2FwaXRhbGl6ZShjYW1lbGl6ZShzcmMucmVwbGFjZSgvW1xcV19dL2csICcgJykpLnJlcGxhY2UoL1xccy9nLCAnJykpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBhIGNhbWVsaXplZCBvciBkYXNoZXJpemVkIHN0cmluZyBpbnRvIGFuIHVuZGVyc2NvcmVkIG9uZS5cbiAqIEBqYSDjgq3jg6Pjg6Hjg6vjgrHjg7zjgrkgb3IgYC1gIOOBpOOBquOBjuaWh+Wtl+WIl+OCkiBgX2Ag44Gk44Gq44GO44Gr5aSJ5o+bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiB1bmRlcnNjb3JlZChcIk1velRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwibW96X3RyYW5zZm9ybVwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmRlcnNjb3JlZChzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHNyYy50cmltKCkucmVwbGFjZSgvKFthLXpcXGRdKShbQS1aXSspL2csICckMV8kMicpLnJlcGxhY2UoL1stXFxzXSsvZywgJ18nKS50b0xvd2VyQ2FzZSgpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBhIHVuZGVyc2NvcmVkIG9yIGNhbWVsaXplZCBzdHJpbmcgaW50byBhbiBkYXNoZXJpemVkIG9uZS5cbiAqIEBqYSDjgq3jg6Pjg6Hjg6vjgrHjg7zjgrkgb3IgYF9gIOOBpOOBquOBjuaWh+Wtl+WIl+OCkiBgLWAg44Gk44Gq44GO44Gr5aSJ5o+bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBkYXNoZXJpemUoXCJNb3pUcmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIi1tb3otdHJhbnNmb3JtXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhc2hlcml6ZShzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHNyYy50cmltKCkucmVwbGFjZSgvKFtBLVpdKS9nLCAnLSQxJykucmVwbGFjZSgvW19cXHNdKy9nLCAnLScpLnRvTG93ZXJDYXNlKCk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7XG4gICAgQXJndW1lbnRzLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgaXNTeW1ib2wsXG4gICAgY2xhc3NOYW1lLFxuICAgIHZlcmlmeSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiwgU3Vic2NyaWJhYmxlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBMaXNuZXIg5qC857SN5b2i5byPICovXG50eXBlIExpc3RlbmVyc01hcDxUPiA9IE1hcDxrZXlvZiBULCBTZXQ8KC4uLmFyZ3M6IFRba2V5b2YgVF1bXSkgPT4gdW5rbm93bj4+O1xuXG4vKiogQGludGVybmFsIExpc25lciDjga7lvLHlj4LnhacgKi9cbmNvbnN0IF9tYXBMaXN0ZW5lcnMgPSBuZXcgV2Vha01hcDxFdmVudFB1Ymxpc2hlcjxhbnk+LCBMaXN0ZW5lcnNNYXA8YW55Pj4oKTtcblxuLyoqIEBpbnRlcm5hbCBMaXNuZXJNYXAg44Gu5Y+W5b6XICovXG5mdW5jdGlvbiBsaXN0ZW5lcnM8VD4oaW5zdGFuY2U6IEV2ZW50UHVibGlzaGVyPFQ+KTogTGlzdGVuZXJzTWFwPFQ+IHtcbiAgICBpZiAoIV9tYXBMaXN0ZW5lcnMuaGFzKGluc3RhbmNlKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGlzIGlzIG5vdCBhIHZhbGlkIEV2ZW50UHVibGlzaGVyLicpO1xuICAgIH1cbiAgICByZXR1cm4gX21hcExpc3RlbmVycy5nZXQoaW5zdGFuY2UpIGFzIExpc3RlbmVyc01hcDxUPjtcbn1cblxuLyoqIEBpbnRlcm5hbCBDaGFubmVsIOOBruWei+aknOiovCAqL1xuZnVuY3Rpb24gdmFsaWRDaGFubmVsKGNoYW5uZWw6IHVua25vd24pOiB2b2lkIHwgbmV2ZXIge1xuICAgIGlmIChpc1N0cmluZyhjaGFubmVsKSB8fCBpc1N5bWJvbChjaGFubmVsKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFR5cGUgb2YgJHtjbGFzc05hbWUoY2hhbm5lbCl9IGlzIG5vdCBhIHZhbGlkIGNoYW5uZWwuYCk7XG59XG5cbi8qKiBAaW50ZXJuYWwgTGlzdGVuZXIg44Gu5Z6L5qSc6Ki8ICovXG5mdW5jdGlvbiB2YWxpZExpc3RlbmVyKGxpc3RlbmVyPzogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bik6IGFueSB8IG5ldmVyIHtcbiAgICBpZiAobnVsbCAhPSBsaXN0ZW5lcikge1xuICAgICAgICB2ZXJpZnkoJ3R5cGVPZicsICdmdW5jdGlvbicsIGxpc3RlbmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpc3RlbmVyO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gRXZlbnRpbmcgZnJhbWV3b3JrIGNsYXNzIHdpdGggZW5zdXJpbmcgdHlwZS1zYWZlIGZvciBUeXBlU2NyaXB0LiA8YnI+XG4gKiAgICAgVGhlIGNsaWVudCBvZiB0aGlzIGNsYXNzIGNhbiBpbXBsZW1lbnQgb3JpZ2luYWwgUHViLVN1YiAoT2JzZXJ2ZXIpIGRlc2lnbiBwYXR0ZXJuLlxuICogQGphIOWei+WuieWFqOOCkuS/nemanOOBmeOCi+OCpOODmeODs+ODiOeZu+mMsuODu+eZuuihjOOCr+ODqeOCuSA8YnI+XG4gKiAgICAg44Kv44Op44Kk44Ki44Oz44OI44Gv5pys44Kv44Op44K544KS5rS+55Sf44GX44Gm54us6Ieq44GuIFB1Yi1TdWIgKE9ic2VydmVyKSDjg5Hjgr/jg7zjg7PjgpLlrp/oo4Xlj6/og71cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudC1wdWJsaXNoZXInO1xuICpcbiAqIC8vIGRlY2xhcmUgZXZlbnQgaW50ZXJmYWNlXG4gKiBpbnRlcmZhY2UgU2FtcGxlRXZlbnQge1xuICogICBob2dlOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqICAgZm9vOiBbdm9pZF07ICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3NcbiAqICAgaG9vOiB2b2lkOyAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3MgKHNhbWUgdGhlIHVwb24pXG4gKiAgIGJhcjogW0Vycm9yXTsgICAgICAgICAgICAgICAgICAvLyBhbnkgY2xhc3MgaXMgYXZhaWxhYmxlLlxuICogICBiYXo6IEVycm9yIHwgTnVtYmVyOyAgICAgICAgICAgLy8gaWYgb25seSBvbmUgYXJndW1lbnQsIGBbXWAgaXMgbm90IHJlcXVpcmVkLlxuICogfVxuICpcbiAqIC8vIGRlY2xhcmUgY2xpZW50IGNsYXNzXG4gKiBjbGFzcyBTYW1wbGVQdWJsaXNoZXIgZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxTYW1wbGVFdmVudD4ge1xuICogICA6XG4gKiAgIHNvbWVNZXRob2QoKTogdm9pZCB7XG4gKiAgICAgdGhpcy5wdWJsaXNoKCdob2dlJywgMTAwLCAndGVzdCcpOyAgICAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiAgICAgdGhpcy5wdWJsaXNoKCdob2dlJywgMTAwLCB0cnVlKTsgICAgICAgICAvLyBORy4gYXJndW1lbnQgb2YgdHlwZSAndHJ1ZScgaXMgbm90IGFzc2lnbmFibGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBwYXJhbWV0ZXIgb2YgdHlwZSAnc3RyaW5nIHwgdW5kZWZpbmVkJy5cbiAqICAgICB0aGlzLnB1Ymxpc2goJ2hvZ2UnLCAxMDApOyAgICAgICAgICAgICAgIC8vIE9LLiBhbGwgYXJncyB0byBiZSBvcHRpb25hbCBhdXRvbWF0aWNhbGx5LlxuICogICAgIHRoaXMucHVibGlzaCgnZm9vJyk7ICAgICAgICAgICAgICAgICAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogICAgIHRoaXMucHVibGlzaCgnZm9vJywgMTAwKTsgICAgICAgICAgICAgICAgLy8gTkcuIGFyZ3VtZW50IG9mIHR5cGUgJzEwMCcgaXMgbm90IGFzc2lnbmFibGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBwYXJhbWV0ZXIgb2YgdHlwZSAndm9pZCB8IHVuZGVmaW5lZCcuXG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBzYW1wbGUgPSBuZXcgU2FtcGxlUHVibGlzaGVyKCk7XG4gKlxuICogc2FtcGxlLm9uKCdob2dlJywgKGE6IG51bWJlciwgYjogc3RyaW5nKSA9PiB7IC4uLiB9KTsgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogc2FtcGxlLm9uKCdob2dlJywgKGE6IG51bWJlciwgYjogYm9vbGVhbikgPT4geyAuLi4gfSk7ICAgLy8gTkcuIHR5cGVzIG9mIHBhcmFtZXRlcnMgJ2InXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgYW5kICdhcmdzXzEnIGFyZSBpbmNvbXBhdGlibGUuXG4gKiBzYW1wbGUub24oJ2hvZ2UnLCAoYSkgPT4geyAuLi4gfSk7ICAgICAgICAgICAgICAgICAgICAgICAvLyBPSy4gYWxsIGFyZ3NcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBiZSBvcHRpb25hbCBhdXRvbWF0aWNhbGx5LlxuICogc2FtcGxlLm9uKCdob2dlJywgKGEsIGIsIGMpID0+IHsgLi4uIH0pOyAgICAgICAgICAgICAgICAgLy8gTkcuIGV4cGVjdGVkIDEtMiBhcmd1bWVudHMsXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgYnV0IGdvdCAzLlxuICogYGBgXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBFdmVudFB1Ymxpc2hlcjxFdmVudD4gaW1wbGVtZW50cyBTdWJzY3JpYmFibGU8RXZlbnQ+IHtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBFdmVudFB1Ymxpc2hlciwgdGhpcyk7XG4gICAgICAgIF9tYXBMaXN0ZW5lcnMuc2V0KHRoaXMsIG5ldyBNYXAoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE5vdGlmeSBldmVudCB0byBjbGllbnRzLlxuICAgICAqIEBqYSBldmVudCDnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgavmuKHjgZnlvJXmlbBcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgcHVibGlzaDxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwsIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICB2YWxpZENoYW5uZWwoY2hhbm5lbCk7XG4gICAgICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoYW5uZWwpO1xuICAgICAgICBpZiAoIWxpc3QpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGxpc3RlbmVyIG9mIGxpc3QpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGFuZGxlZCA9IGxpc3RlbmVyKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICAgIC8vIGlmIHJlY2VpdmVkICd0cnVlJywgc3RvcCBkZWxlZ2F0aW9uLlxuICAgICAgICAgICAgICAgIGlmICh0cnVlID09PSBoYW5kbGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBQcm9taXNlLnJlamVjdChlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFN1YnNjcmliYWJsZTxFdmVudD5cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIHRoaXMgb2JqZWN0IGhhcyBjbGllbnRzLlxuICAgICAqIEBqYSDjgq/jg6njgqTjgqLjg7Pjg4jjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIGhhc0xpc3RlbmVyPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbD86IENoYW5uZWwsIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICBpZiAobnVsbCA9PSBjaGFubmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFwLnNpemUgPiAwO1xuICAgICAgICB9XG4gICAgICAgIHZhbGlkQ2hhbm5lbChjaGFubmVsKTtcbiAgICAgICAgaWYgKG51bGwgPT0gbGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXAuaGFzKGNoYW5uZWwpO1xuICAgICAgICB9XG4gICAgICAgIHZhbGlkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaGFubmVsKTtcbiAgICAgICAgcmV0dXJuIGxpc3QgPyBsaXN0LmhhcyhsaXN0ZW5lcikgOiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyByZWdpc3RlcmVkIGNoYW5uZWwga2V5cy5cbiAgICAgKiBAamEg55m76Yyy44GV44KM44Gm44GE44KL44OB44Oj44ON44Or44Kt44O844KS6L+U5Y20XG4gICAgICovXG4gICAgY2hhbm5lbHMoKTogKGtleW9mIEV2ZW50KVtdIHtcbiAgICAgICAgcmV0dXJuIFsuLi5saXN0ZW5lcnModGhpcykua2V5cygpXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm6Kej6ZmkXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvZmY8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsPzogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IHZvaWQge1xuICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lcnModGhpcyk7XG4gICAgICAgIGlmIChudWxsID09IGNoYW5uZWwpIHtcbiAgICAgICAgICAgIG1hcC5jbGVhcigpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2hhbm5lbHMgPSBpc0FycmF5KGNoYW5uZWwpID8gY2hhbm5lbCA6IFtjaGFubmVsXTtcbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSB2YWxpZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgdmFsaWRDaGFubmVsKGNoKTtcbiAgICAgICAgICAgIGlmIChudWxsID09IGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgbWFwLmRlbGV0ZShjaCk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoKTtcbiAgICAgICAgICAgICAgICBpZiAobGlzdCkge1xuICAgICAgICAgICAgICAgICAgICBsaXN0LmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgICAgIGxpc3Quc2l6ZSA+IDAgfHwgbWFwLmRlbGV0ZShjaCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb248Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lcnModGhpcyk7XG4gICAgICAgIHZhbGlkTGlzdGVuZXIobGlzdGVuZXIpO1xuXG4gICAgICAgIGNvbnN0IGNoYW5uZWxzID0gaXNBcnJheShjaGFubmVsKSA/IGNoYW5uZWwgOiBbY2hhbm5lbF07XG4gICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgIHZhbGlkQ2hhbm5lbChjaCk7XG4gICAgICAgICAgICBtYXAuaGFzKGNoKSA/IG1hcC5nZXQoY2gpIS5hZGQobGlzdGVuZXIpIDogbWFwLnNldChjaCwgbmV3IFNldChbbGlzdGVuZXJdKSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5mcmVlemUoe1xuICAgICAgICAgICAgZ2V0IGVuYWJsZSgpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFsaXN0IHx8ICFsaXN0LmhhcyhsaXN0ZW5lcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1bnN1YnNjcmliZSgpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3QuZGVsZXRlKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3Quc2l6ZSA+IDAgfHwgbWFwLmRlbGV0ZShjaCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpIGJ1dCBpdCBjYXVzZXMgdGhlIGJvdW5kIGNhbGxiYWNrIHRvIG9ubHkgZmlyZSBvbmNlIGJlZm9yZSBiZWluZyByZW1vdmVkLlxuICAgICAqIEBqYSDkuIDluqbjgaDjgZHjg4/jg7Pjg4njg6rjg7PjgrDlj6/og73jgarjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbmNlPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMub24oY2hhbm5lbCwgbGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBtYW5hZ2VkID0gdGhpcy5vbihjaGFubmVsLCAoKSA9PiB7XG4gICAgICAgICAgICBjb250ZXh0LnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICBtYW5hZ2VkLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29udGV4dDtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7IEFyZ3VtZW50cyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpYmFibGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICcuL3B1Ymxpc2hlcic7XG5cbi8vIHJlLWV4cG9ydFxuZXhwb3J0IHsgQXJndW1lbnRzIGFzIEV2ZW50QXJndW1lbnRzIH07XG5cbi8qKlxuICogQGVuIEV2ZW50aW5nIGZyYW1ld29yayBvYmplY3QgYWJsZSB0byBjYWxsIGBwdWJsaXNoKClgIG1ldGhvZCBmcm9tIG91dHNpZGUuXG4gKiBAamEg5aSW6YOo44GL44KJ44GuIGBwdWJsaXNoKClgIOOCkuWPr+iDveOBq+OBl+OBn+OCpOODmeODs+ODiOeZu+mMsuODu+eZuuihjOOCr+ODqeOCuVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50LXB1Ymxpc2hlcic7XG4gKlxuICogLy8gZGVjbGFyZSBldmVudCBpbnRlcmZhY2VcbiAqIGludGVyZmFjZSBTYW1wbGVFdmVudCB7XG4gKiAgIGhvZ2U6IFtudW1iZXIsIHN0cmluZ107ICAgICAgICAvLyBjYWxsYmFjayBmdW5jdGlvbidzIGFyZ3MgdHlwZSB0dXBsZVxuICogfVxuICpcbiAqIGNvbnN0IGJyb2tlciA9IG5ldyBFdmVudEJyb2tlcjxTYW1wbGVFdmVudD4oKTtcbiAqIGJyb2tlci5wdWJsaXNoKCdob2dlJywgMTAwLCAndGVzdCcpOyAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogYnJva2VyLnB1Ymxpc2goJ2hvZ2UnLCAxMDAsIHRydWUpOyAgICAgICAvLyBORy4gYXJndW1lbnQgb2YgdHlwZSAndHJ1ZScgaXMgbm90IGFzc2lnbmFibGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIHRvIHBhcmFtZXRlciBvZiB0eXBlICdzdHJpbmcgfCB1bmRlZmluZWQnLlxuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRCcm9rZXI8RXZlbnQgZXh0ZW5kcyB7fT4gZXh0ZW5kcyBTdWJzY3JpYmFibGU8RXZlbnQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gTm90aWZ5IGV2ZW50IHRvIGNsaWVudHMuXG4gICAgICogQGphIGV2ZW50IOeZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGFyZ3VtZW50cyBmb3IgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsOOBq+a4oeOBmeW8leaVsFxuICAgICAqL1xuICAgIHB1Ymxpc2g8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsLCAuLi5hcmdzOiBBcmd1bWVudHM8UGFydGlhbDxFdmVudFtDaGFubmVsXT4+KTogdm9pZDtcbn1cblxuLyoqXG4gKiBAZW4gQ29uc3RydWN0b3Igb2YgRXZlbnRCcm9rZXJcbiAqIEBqYSBFdmVudEJyb2tlciDjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/lrp/kvZNcbiAqL1xuZXhwb3J0IGNvbnN0IEV2ZW50QnJva2VyOiB7XG4gICAgcmVhZG9ubHkgcHJvdG90eXBlOiBFdmVudEJyb2tlcjxhbnk+O1xuICAgIG5ldyA8VD4oKTogRXZlbnRCcm9rZXI8VD47XG59ID0gRXZlbnRQdWJsaXNoZXIgYXMgYW55O1xuIiwiaW1wb3J0IHsgRXZlbnRCcm9rZXIsIFN1YnNjcmlwdGlvbiB9IGZyb20gJ0BjZHAvZXZlbnQtcHVibGlzaGVyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IF9jYW5jZWwgPSBTeW1ib2woJ2NhbmNlbCcpO1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IF9jbG9zZSA9IFN5bWJvbCgnY2xvc2UnKTtcblxuLyoqXG4gKiBAZW4gQ2FuY2VsVG9rZW4gc3RhdGUgZGVmaW5pdGlvbnMuXG4gKiBAamEgQ2FuY2VsVG9rZW4g44Gu54q25oWL5a6a576pXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIENhbmNlbFRva2VuU3RhdGUge1xuICAgIC8qKiDjgq3jg6Pjg7Pjgrvjg6vlj5fku5jlj6/og70gKi9cbiAgICBPUEVOICAgICAgICA9IDB4MCxcbiAgICAvKiog44Kt44Oj44Oz44K744Or5Y+X5LuY5riI44G/ICovXG4gICAgUkVRVUVTVEVEICAgPSAweDEsXG4gICAgLyoqIOOCreODo+ODs+OCu+ODq+WPl+S7mOS4jeWPryAqL1xuICAgIENMT1NFRCAgICAgID0gMHgyLFxufVxuXG4vKipcbiAqIEBlbiBDYW5jZWwgZXZlbnQgZGVmaW5pdGlvbnMuXG4gKiBAamEg44Kt44Oj44Oz44K744Or44Kk44OZ44Oz44OI5a6a576pXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuY2VsRXZlbnQ8VD4ge1xuICAgIGNhbmNlbDogW1RdO1xufVxuXG4vKipcbiAqIEBlbiBJbnRlcm5hbCBDYW5jZWxUb2tlbiBpbnRlcmZhY2UuXG4gKiBAamEgQ2FuY2VsVG9rZW4g44Gu5YaF6YOo44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuY2VsVG9rZW5Db250ZXh0PFQgZXh0ZW5kcyB7fT4ge1xuICAgIHJlYWRvbmx5IHB1Ymxpc2hlcjogRXZlbnRCcm9rZXI8Q2FuY2VsRXZlbnQ8VD4+O1xuICAgIHJlYWRvbmx5IHN1YnNjcmlwdGlvbnM6IFNldDxTdWJzY3JpcHRpb24+O1xuICAgIHJlYXNvbjogVCB8IHVuZGVmaW5lZDtcbiAgICBzdGF0dXM6IENhbmNlbFRva2VuU3RhdGU7XG59XG5cbi8qKlxuICogQGVuIEludmFsaWQgc3Vic2NyaXB0aW9uIG9iamVjdCBkZWNsYXJhdGlvbi5cbiAqIEBqYSDnhKHlirnjgaogU3Vic2NyaXB0aW9uIOOCquODluOCuOOCp+OCr+ODiFxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY29uc3QgaW52YWxpZFN1YnNjcmlwdGlvbiA9IE9iamVjdC5mcmVlemUoe1xuICAgIGVuYWJsZTogZmFsc2UsXG4gICAgdW5zdWJzY3JpYmUoKSB7IC8qIG5vb3AgKi8gfVxufSkgYXMgU3Vic2NyaXB0aW9uO1xuIiwiLyogZXNsaW50LWRpc2FibGUgbm8tcmVkZWNsYXJlLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7IHZlcmlmeSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudEJyb2tlciwgU3Vic2NyaXB0aW9uIH0gZnJvbSAnQGNkcC9ldmVudC1wdWJsaXNoZXInO1xuaW1wb3J0IHtcbiAgICBfY2FuY2VsLFxuICAgIF9jbG9zZSxcbiAgICBDYW5jZWxUb2tlblN0YXRlLFxuICAgIENhbmNlbFRva2VuQ29udGV4dCxcbiAgICBpbnZhbGlkU3Vic2NyaXB0aW9uLFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gQ2FuY2VsbGF0aW9uIHNvdXJjZSBpbnRlcmZhY2UuXG4gKiBAamEg44Kt44Oj44Oz44K744Or566h55CG44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuY2VsVG9rZW5Tb3VyY2U8VCBleHRlbmRzIHt9ID0ge30+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gW1tDYW5jZWxUb2tlbl1dIGdldHRlci5cbiAgICAgKiBAamEgW1tDYW5jZWxUb2tlbl1dIOWPluW+l1xuICAgICAqL1xuICAgIHJlYWRvbmx5IHRva2VuOiBDYW5jZWxUb2tlbjxUPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGNhbmNlbC5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVhc29uXG4gICAgICogIC0gYGVuYCBjYW5jZWxsYXRpb24gcmVhc29uLiB0aGlzIGFyZyBpcyB0cmFuc21pdHRlZCBpbiBwcm9taXNlIGNoYWluLlxuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744Or44Gu55CG55Sx44KS5oyH5a6aLiBgUHJvbWlzZWAg44OB44Kn44Kk44Oz44Gr5Lyd6YGU44GV44KM44KLLlxuICAgICAqL1xuICAgIGNhbmNlbChyZWFzb246IFQpOiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEJyZWFrIHVwIGNhbmNlbGxhdGlvbiByZWNlcHRpb24uXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+WPl+S7mOOCkue1guS6hlxuICAgICAqL1xuICAgIGNsb3NlKCk6IHZvaWQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF90b2tlbnMgPSBuZXcgV2Vha01hcDxDYW5jZWxUb2tlbjxhbnk+LCBDYW5jZWxUb2tlbkNvbnRleHQ8YW55Pj4oKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gZ2V0Q29udGV4dDxUPihpbnN0YW5jZTogQ2FuY2VsVG9rZW48VD4pOiBDYW5jZWxUb2tlbkNvbnRleHQ8VD4ge1xuICAgIGlmICghX3Rva2Vucy5oYXMoaW5zdGFuY2UpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBvYmplY3QgaXMgbm90IGEgdmFsaWQgQ2FuY2VsVG9rZW4uJyk7XG4gICAgfVxuICAgIHJldHVybiBfdG9rZW5zLmdldChpbnN0YW5jZSkgYXMgQ2FuY2VsVG9rZW5Db250ZXh0PFQ+O1xufVxuXG4vKipcbiAqIEBlbiBUaGUgdG9rZW4gb2JqZWN0IHRvIHdoaWNoIHVuaWZpY2F0aW9uIHByb2Nlc3NpbmcgZm9yIGFzeW5jaHJvbm91cyBwcm9jZXNzaW5nIGNhbmNlbGxhdGlvbiBpcyBvZmZlcmVkLiA8YnI+XG4gKiAgICAgT3JpZ2luIGlzIGBDYW5jZWxsYXRpb25Ub2tlbmAgb2YgYC5ORVQgRnJhbWV3b3JrYC5cbiAqIEBqYSDpnZ7lkIzmnJ/lh6bnkIbjgq3jg6Pjg7Pjgrvjg6vjga7jgZ/jgoHjga7ntbHkuIDlh6bnkIbjgpLmj5DkvpvjgZnjgovjg4jjg7zjgq/jg7Pjgqrjg5bjgrjjgqfjgq/jg4ggPGJyPlxuICogICAgIOOCquODquOCuOODiuODq+OBryBgLk5FVCBGcmFtZXdvcmtgIOOBriBgQ2FuY2VsbGF0aW9uVG9rZW5gXG4gKlxuICogQHNlZSBodHRwczovL2RvY3MubWljcm9zb2Z0LmNvbS9lbi11cy9kb3RuZXQvc3RhbmRhcmQvdGhyZWFkaW5nL2NhbmNlbGxhdGlvbi1pbi1tYW5hZ2VkLXRocmVhZHNcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbiAqIGBgYFxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgdG9rZW4gPSBuZXcgQ2FuY2VsVG9rZW4oKGNhbmNlbCwgY2xvc2UpID0+IHtcbiAqICAgYnV0dG9uMS5vbmNsaWNrID0gZXYgPT4gY2FuY2VsKG5ldyBFcnJvcignQ2FuY2VsJykpO1xuICogICBidXR0b24yLm9uY2xpY2sgPSBldiA9PiBjbG9zZSgpO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBvclxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB7IGNhbmNlbCwgY2xvc2UsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTtcbiAqIGJ1dHRvbjEub25jbGljayA9IGV2ID0+IGNhbmNlbChuZXcgRXJyb3IoJ0NhbmNlbCcpKTtcbiAqIGJ1dHRvbjIub25jbGljayA9IGV2ID0+IGNsb3NlKCk7XG4gKiBgYGBcbiAqXG4gKiAtIFVzZSB3aXRoIFByb21pc2VcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgeyBjYW5jZWwsIGNsb3NlLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7XG4gKiBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKG9rLCBuZykgPT4geyAuLi4gfSwgdG9rZW4pO1xuICogcHJvbWlzZVxuICogICAudGhlbiguLi4pXG4gKiAgIC50aGVuKC4uLilcbiAqICAgLnRoZW4oLi4uKVxuICogICAuY2F0Y2gocmVhc29uID0+IHtcbiAqICAgICAvLyBjaGVjayByZWFzb25cbiAqICAgfSk7XG4gKiBgYGBcbiAqXG4gKiAtIFJlZ2lzdGVyICYgVW5yZWdpc3RlciBjYWxsYmFjayhzKVxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB7IGNhbmNlbCwgY2xvc2UsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTtcbiAqIGNvbnN0IHN1YnNjcmlwdGlvbiA9IHRva2VuLnJlZ2lzdGVyKHJlYXNvbiA9PiB7XG4gKiAgIGNvbnNvbGUubG9nKHJlYXNvbi5tZXNzYWdlKTtcbiAqIH0pO1xuICogaWYgKHNvbWVDYXNlKSB7XG4gKiAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBDYW5jZWxUb2tlbjxUIGV4dGVuZHMge30gPSB7fT4ge1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBbW0NhbmNlbFRva2VuU291cmNlXV0gaW5zdGFuY2UuXG4gICAgICogQGphIFtbQ2FuY2VsVG9rZW5Tb3VyY2VdXSDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7lj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaW5rZWRUb2tlbnNcbiAgICAgKiAgLSBgZW5gIHJlbGF0aW5nIGFscmVhZHkgbWFkZSBbW0NhbmNlbFRva2VuXV0gaW5zdGFuY2UuXG4gICAgICogICAgICAgIFlvdSBjYW4gYXR0YWNoIHRvIHRoZSB0b2tlbiB0aGF0IHRvIGJlIGEgY2FuY2VsbGF0aW9uIHRhcmdldC5cbiAgICAgKiAgLSBgamFgIOOBmeOBp+OBq+S9nOaIkOOBleOCjOOBnyBbW0NhbmNlbFRva2VuXV0g6Zai6YCj5LuY44GR44KL5aC05ZCI44Gr5oyH5a6aXG4gICAgICogICAgICAgIOa4oeOBleOCjOOBnyB0b2tlbiDjga/jgq3jg6Pjg7Pjgrvjg6vlr77osaHjgajjgZfjgabntJDjgaXjgZHjgonjgozjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHNvdXJjZTxUIGV4dGVuZHMge30gPSB7fT4oLi4ubGlua2VkVG9rZW5zOiBDYW5jZWxUb2tlbltdKTogQ2FuY2VsVG9rZW5Tb3VyY2U8VD4ge1xuICAgICAgICBsZXQgY2FuY2VsITogKHJlYXNvbjogVCkgPT4gdm9pZDtcbiAgICAgICAgbGV0IGNsb3NlITogKCkgPT4gdm9pZDtcbiAgICAgICAgY29uc3QgdG9rZW4gPSBuZXcgQ2FuY2VsVG9rZW48VD4oKG9uQ2FuY2VsLCBvbkNsb3NlKSA9PiB7XG4gICAgICAgICAgICBjYW5jZWwgPSBvbkNhbmNlbDtcbiAgICAgICAgICAgIGNsb3NlID0gb25DbG9zZTtcbiAgICAgICAgfSwgLi4ubGlua2VkVG9rZW5zKTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5mcmVlemUoeyB0b2tlbiwgY2FuY2VsLCBjbG9zZSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGV4ZWN1dG9yXG4gICAgICogIC0gYGVuYCBleGVjdXRlciB0aGF0IGhhcyBgY2FuY2VsYCBhbmQgYGNsb3NlYCBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODqy/jgq/jg63jg7zjgrog5a6f6KGM44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGxpbmtlZFRva2Vuc1xuICAgICAqICAtIGBlbmAgcmVsYXRpbmcgYWxyZWFkeSBtYWRlIFtbQ2FuY2VsVG9rZW5dXSBpbnN0YW5jZS5cbiAgICAgKiAgICAgICAgWW91IGNhbiBhdHRhY2ggdG8gdGhlIHRva2VuIHRoYXQgdG8gYmUgYSBjYW5jZWxsYXRpb24gdGFyZ2V0LlxuICAgICAqICAtIGBqYWAg44GZ44Gn44Gr5L2c5oiQ44GV44KM44GfIFtbQ2FuY2VsVG9rZW5dXSDplqLpgKPku5jjgZHjgovloLTlkIjjgavmjIflrppcbiAgICAgKiAgICAgICAg5rih44GV44KM44GfIHRva2VuIOOBr+OCreODo+ODs+OCu+ODq+WvvuixoeOBqOOBl+OBpue0kOOBpeOBkeOCieOCjOOCi1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBleGVjdXRvcjogKGNhbmNlbDogKHJlYXNvbjogVCkgPT4gdm9pZCwgY2xvc2U6ICgpID0+IHZvaWQpID0+IHZvaWQsXG4gICAgICAgIC4uLmxpbmtlZFRva2VuczogQ2FuY2VsVG9rZW5bXVxuICAgICkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBDYW5jZWxUb2tlbiwgdGhpcyk7XG4gICAgICAgIHZlcmlmeSgndHlwZU9mJywgJ2Z1bmN0aW9uJywgZXhlY3V0b3IpO1xuXG4gICAgICAgIGNvbnN0IGxpbmtlZFRva2VuU2V0ID0gbmV3IFNldChsaW5rZWRUb2tlbnMuZmlsdGVyKHQgPT4gX3Rva2Vucy5oYXModCkpKTtcbiAgICAgICAgbGV0IHN0YXR1cyA9IENhbmNlbFRva2VuU3RhdGUuT1BFTjtcbiAgICAgICAgZm9yIChjb25zdCB0IG9mIGxpbmtlZFRva2VuU2V0KSB7XG4gICAgICAgICAgICBzdGF0dXMgfD0gZ2V0Q29udGV4dCh0KS5zdGF0dXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb250ZXh0OiBDYW5jZWxUb2tlbkNvbnRleHQ8VD4gPSB7XG4gICAgICAgICAgICBwdWJsaXNoZXI6IG5ldyBFdmVudEJyb2tlcigpLFxuICAgICAgICAgICAgc3Vic2NyaXB0aW9uczogbmV3IFNldCgpLFxuICAgICAgICAgICAgcmVhc29uOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBzdGF0dXMsXG4gICAgICAgIH07XG4gICAgICAgIF90b2tlbnMuc2V0KHRoaXMsIE9iamVjdC5zZWFsKGNvbnRleHQpKTtcblxuICAgICAgICBjb25zdCBjYW5jZWwgPSB0aGlzW19jYW5jZWxdO1xuICAgICAgICBjb25zdCBjbG9zZSA9IHRoaXNbX2Nsb3NlXTtcbiAgICAgICAgaWYgKHN0YXR1cyA9PT0gQ2FuY2VsVG9rZW5TdGF0ZS5PUEVOKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHQgb2YgbGlua2VkVG9rZW5TZXQpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0LnN1YnNjcmlwdGlvbnMuYWRkKHQucmVnaXN0ZXIoY2FuY2VsLmJpbmQodGhpcykpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZ2lzdGVyKGNhbmNlbC5iaW5kKHQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4ZWN1dG9yKGNhbmNlbC5iaW5kKHRoaXMpLCBjbG9zZS5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FuY2VsbGF0aW9uIHJlYXNvbiBhY2Nlc3Nvci5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or44Gu5Y6f5Zug5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHJlYXNvbigpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIGdldENvbnRleHQodGhpcykucmVhc29uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFbmFibGUgY2FuY2VsbGF0aW9uIHN0YXRlIGFjY2Vzc29yLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vlj6/og73jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgY2FuY2VsYWJsZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIGdldENvbnRleHQodGhpcykuc3RhdHVzID09PSBDYW5jZWxUb2tlblN0YXRlLk9QRU47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbmNlbGxhdGlvbiByZXF1ZXN0ZWQgc3RhdGUgYWNjZXNzb3IuXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+OCkuWPl+OBkeS7mOOBkeOBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCByZXF1ZXN0ZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIShnZXRDb250ZXh0KHRoaXMpLnN0YXR1cyAmIENhbmNlbFRva2VuU3RhdGUuUkVRVUVTVEVEKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FuY2VsbGF0aW9uIGNsb3NlZCBzdGF0ZSBhY2Nlc3Nvci5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5Y+X5LuY44KS57WC5LqG44GX44Gm44GE44KL44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGNsb3NlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhKGdldENvbnRleHQodGhpcykuc3RhdHVzICYgQ2FuY2VsVG9rZW5TdGF0ZS5DTE9TRUQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBgdG9TdHJpbmdgIHRhZyBvdmVycmlkZS5cbiAgICAgKiBAamEgYHRvU3RyaW5nYCDjgr/jgrDjga7jgqrjg7zjg5Djg7zjg6njgqTjg4lcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6ICdDYW5jZWxUb2tlbicgeyByZXR1cm4gJ0NhbmNlbFRva2VuJzsgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIGN1c3RvbSBjYW5jZWxsYXRpb24gY2FsbGJhY2suXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+aZguOBruOCq+OCueOCv+ODoOWHpueQhuOBrueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIG9uQ2FuY2VsXG4gICAgICogIC0gYGVuYCBjYW5jZWwgb3BlcmF0aW9uIGNhbGxiYWNrXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6vjgrPjg7zjg6vjg5Djg4Pjgq9cbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYFN1YnNjcmlwdGlvbmAgaW5zdGFuY2UuXG4gICAgICogICAgICAgIFlvdSBjYW4gcmV2b2tlIGNhbmNlbGxhdGlvbiB0byBjYWxsIGB1bnN1YnNjcmliZWAgbWV0aG9kLlxuICAgICAqICAtIGBqYWAgYFN1YnNjcmlwdGlvbmAg44Kk44Oz44K544K/44Oz44K5XG4gICAgICogICAgICAgIGB1bnN1YnNjcmliZWAg44Oh44K944OD44OJ44KS5ZG844G244GT44Go44Gn44Kt44Oj44Oz44K744Or44KS54Sh5Yq544Gr44GZ44KL44GT44Go44GM5Y+v6IO9XG4gICAgICovXG4gICAgcHVibGljIHJlZ2lzdGVyKG9uQ2FuY2VsOiAocmVhc29uOiBUKSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGdldENvbnRleHQodGhpcyk7XG4gICAgICAgIGlmICghdGhpcy5jYW5jZWxhYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4gaW52YWxpZFN1YnNjcmlwdGlvbjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29udGV4dC5wdWJsaXNoZXIub24oJ2NhbmNlbCcsIG9uQ2FuY2VsKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX2NhbmNlbF0ocmVhc29uOiBUKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBnZXRDb250ZXh0KHRoaXMpO1xuICAgICAgICB2ZXJpZnkoJ25vdE5pbCcsIHJlYXNvbik7XG4gICAgICAgIGlmICghdGhpcy5jYW5jZWxhYmxlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5yZWFzb24gPSByZWFzb247XG4gICAgICAgIGNvbnRleHQuc3RhdHVzIHw9IENhbmNlbFRva2VuU3RhdGUuUkVRVUVTVEVEO1xuICAgICAgICBmb3IgKGNvbnN0IHMgb2YgY29udGV4dC5zdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5wdWJsaXNoZXIucHVibGlzaCgnY2FuY2VsJywgcmVhc29uKTtcbiAgICAgICAgUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB0aGlzW19jbG9zZV0oKSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19jbG9zZV0oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBnZXRDb250ZXh0KHRoaXMpO1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0LnN0YXR1cyB8PSBDYW5jZWxUb2tlblN0YXRlLkNMT1NFRDtcbiAgICAgICAgZm9yIChjb25zdCBzIG9mIGNvbnRleHQuc3Vic2NyaXB0aW9ucykge1xuICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQuc3Vic2NyaXB0aW9ucy5jbGVhcigpO1xuICAgICAgICBjb250ZXh0LnB1Ymxpc2hlci5vZmYoKTtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBuby1nbG9iYWwtYXNzaWduLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICB2ZXJpZnksXG4gICAgZ2V0Q29uZmlnLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uIH0gZnJvbSAnQGNkcC9ldmVudC1wdWJsaXNoZXInO1xuaW1wb3J0IHsgQ2FuY2VsVG9rZW4gfSBmcm9tICcuL2NhbmNlbC10b2tlbic7XG5cbmRlY2xhcmUgZ2xvYmFsIHtcblxuICAgIGludGVyZmFjZSBQcm9taXNlQ29uc3RydWN0b3Ige1xuICAgICAgICBuZXcgPFQ+KGV4ZWN1dG9yOiAocmVzb2x2ZTogKHZhbHVlPzogVCB8IFByb21pc2VMaWtlPFQ+KSA9PiB2b2lkLCByZWplY3Q6IChyZWFzb24/OiBhbnkpID0+IHZvaWQpID0+IHZvaWQsIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsKTogUHJvbWlzZTxUPjtcbiAgICAgICAgcmVzb2x2ZTxUPih2YWx1ZT86IFQgfCBQcm9taXNlTGlrZTxUPiwgY2FuY2VsVG9rZW4/OiBDYW5jZWxUb2tlbiB8IG51bGwpOiBQcm9taXNlPFQ+O1xuICAgIH1cblxufVxuXG4vKiogYE5hdGl2ZSBQcm9taXNlYCBjb25zdHJ1Y3RvciAqL1xuY29uc3QgTmF0aXZlUHJvbWlzZSA9IFByb21pc2U7XG4vKiogQGludGVybmFsICovXG5jb25zdCBfY3JlYXRlID0gU3ltYm9sKCdjcmVhdGUnKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF90b2tlbnMgPSBuZXcgV2Vha01hcDxQcm9taXNlPHVua25vd24+LCBDYW5jZWxUb2tlbj4oKTtcblxuLyoqXG4gKiBAZW4gRXh0ZW5kZWQgYFByb21pc2VgIGNsYXNzIHdoaWNoIGVuYWJsZWQgY2FuY2VsbGF0aW9uLiA8YnI+XG4gKiAgICAgYE5hdGl2ZSBQcm9taXNlYCBjb25zdHJ1Y3RvciBpcyBvdmVycmlkZGVuIGJ5IGZyYW1ld29yayBkZWZhdWx0IGJlaGF2aW91ci5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjgpLlj6/og73jgavjgZfjgZ8gYFByb21pc2VgIOaLoeW8teOCr+ODqeOCuSA8YnI+XG4gKiAgICAg5pei5a6a44GnIGBOYXRpdmUgUHJvbWlzZWAg44KS44Kq44O844OQ44O844Op44Kk44OJ44GZ44KLLlxuICovXG5jbGFzcyBDYW5jZWxhYmxlUHJvbWlzZTxUPiBleHRlbmRzIE5hdGl2ZVByb21pc2U8VD4ge1xuXG4gICAgLyoqXG4gICAgICogQGVuIE92ZXJyaWRpbmcgb2YgdGhlIGRlZmF1bHQgY29uc3RydWN0b3IgdXNlZCBmb3IgZ2VuZXJhdGlvbiBvZiBhbiBvYmplY3QuXG4gICAgICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBrueUn+aIkOOBq+S9v+OCj+OCjOOCi+ODh+ODleOCqeODq+ODiOOCs+ODs+OCueODiOODqeOCr+OCv+OBruOCquODvOODkOODvOODqeOCpOODiVxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgc3RhdGljIGdldCBbU3ltYm9sLnNwZWNpZXNdKCk6IFByb21pc2VDb25zdHJ1Y3RvciB7IHJldHVybiBOYXRpdmVQcm9taXNlOyB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlcyBhIG5ldyByZXNvbHZlZCBwcm9taXNlIGZvciB0aGUgcHJvdmlkZWQgdmFsdWUuXG4gICAgICogQGphIOaWsOimj+OBq+ino+axuua4iOOBvyBwcm9taXNlIOOCpOODs+OCueOCv+ODs+OCueOCkuS9nOaIkFxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHRoZSB2YWx1ZSB0cmFuc21pdHRlZCBpbiBwcm9taXNlIGNoYWluLlxuICAgICAqICAtIGBqYWAgYFByb21pc2VgIOOBq+S8nemBlOOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBjYW5jZWxUb2tlblxuICAgICAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIGluc3RhbmNlIGNyZWF0ZSBmcm9tIFtbQ2FuY2VsVG9rZW5dXS5gc291cmNlKClgLlxuICAgICAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dLmBzb3VyY2UoKWAg44KI44KK5L2c5oiQ44GX44GfIFtbQ2FuY2VsVG9rZW5dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAgICAgKi9cbiAgICBzdGF0aWMgcmVzb2x2ZTxUPih2YWx1ZT86IFQgfCBQcm9taXNlTGlrZTxUPiwgY2FuY2VsVG9rZW4/OiBDYW5jZWxUb2tlbiB8IG51bGwpOiBDYW5jZWxhYmxlUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVdKHN1cGVyLnJlc29sdmUodmFsdWUpLCBjYW5jZWxUb2tlbik7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBwcml2YXRlIGNvbnN0cnVjdGlvbiAqL1xuICAgIHByaXZhdGUgc3RhdGljIFtfY3JlYXRlXTxULCBUUmVzdWx0MSA9IFQsIFRSZXN1bHQyID0gbmV2ZXI+KFxuICAgICAgICBzcmM6IFByb21pc2U8VD4sXG4gICAgICAgIHRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsLFxuICAgICAgICB0aGVuQXJncz86IFtcbiAgICAgICAgICAgICgodmFsdWU6IFQpID0+IFRSZXN1bHQxIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDE+KSB8IG51bGwgfCB1bmRlZmluZWQsXG4gICAgICAgICAgICAoKHJlYXNvbjogYW55KSA9PiBUUmVzdWx0MiB8IFByb21pc2VMaWtlPFRSZXN1bHQyPikgfCBudWxsIHwgdW5kZWZpbmVkXG4gICAgICAgIF0gfCBudWxsXG4gICAgKTogQ2FuY2VsYWJsZVByb21pc2U8VFJlc3VsdDEgfCBUUmVzdWx0Mj4ge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBOYXRpdmVQcm9taXNlLCBzcmMpO1xuXG4gICAgICAgIGxldCBwOiBQcm9taXNlPFQgfCBUUmVzdWx0MSB8IFRSZXN1bHQyPjtcbiAgICAgICAgaWYgKCEodG9rZW4gaW5zdGFuY2VvZiBDYW5jZWxUb2tlbikpIHtcbiAgICAgICAgICAgIHAgPSBzcmM7XG4gICAgICAgIH0gZWxzZSBpZiAodGhlbkFyZ3MgJiYgKCFpc0Z1bmN0aW9uKHRoZW5BcmdzWzBdKSB8fCBpc0Z1bmN0aW9uKHRoZW5BcmdzWzFdKSkpIHtcbiAgICAgICAgICAgIHAgPSBzcmM7XG4gICAgICAgIH0gZWxzZSBpZiAodG9rZW4uY2FuY2VsYWJsZSkge1xuICAgICAgICAgICAgbGV0IHM6IFN1YnNjcmlwdGlvbjtcbiAgICAgICAgICAgIHAgPSBuZXcgTmF0aXZlUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgcyA9IHRva2VuLnJlZ2lzdGVyKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgc3VwZXIucHJvdG90eXBlLnRoZW4uY2FsbChzcmMsIHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnN0IGRpc3Bvc2UgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgIF90b2tlbnMuZGVsZXRlKHApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHAudGhlbihkaXNwb3NlLCBkaXNwb3NlKTtcbiAgICAgICAgfSBlbHNlIGlmICh0b2tlbi5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgIHAgPSBzdXBlci5yZWplY3QodG9rZW4ucmVhc29uKTtcbiAgICAgICAgfSBlbHNlIGlmICh0b2tlbi5jbG9zZWQpIHtcbiAgICAgICAgICAgIHAgPSBzcmM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgRXhjZXB0aW9uJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhlbkFyZ3MpIHtcbiAgICAgICAgICAgIHAgPSBzdXBlci5wcm90b3R5cGUudGhlbi5hcHBseShwLCB0aGVuQXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRva2VuICYmIHRva2VuLmNhbmNlbGFibGUpIHtcbiAgICAgICAgICAgIF90b2tlbnMuc2V0KHAsIHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHAgaW5zdGFuY2VvZiB0aGlzIHx8IE9iamVjdC5zZXRQcm90b3R5cGVPZihwLCB0aGlzLnByb3RvdHlwZSk7XG5cbiAgICAgICAgcmV0dXJuIHAgYXMgQ2FuY2VsYWJsZVByb21pc2U8VFJlc3VsdDEgfCBUUmVzdWx0Mj47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBleGVjdXRvclxuICAgICAqICAtIGBlbmAgQSBjYWxsYmFjayB1c2VkIHRvIGluaXRpYWxpemUgdGhlIHByb21pc2UuIFRoaXMgY2FsbGJhY2sgaXMgcGFzc2VkIHR3byBhcmd1bWVudHMgYHJlc29sdmVgIGFuZCBgcmVqZWN0YC5cbiAgICAgKiAgLSBgamFgIHByb21pc2Ug44Gu5Yid5pyf5YyW44Gr5L2/55So44GZ44KL44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6aLiBgcmVzb2x2ZWAg44GoIGByZWplY3RgIOOBrjLjgaTjga7lvJXmlbDjgpLmjIHjgaRcbiAgICAgKiBAcGFyYW0gY2FuY2VsVG9rZW5cbiAgICAgKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSBpbnN0YW5jZSBjcmVhdGUgZnJvbSBbW0NhbmNlbFRva2VuXV0uYHNvdXJjZSgpYC5cbiAgICAgKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXS5gc291cmNlKClgIOOCiOOCiuS9nOaIkOOBl+OBnyBbW0NhbmNlbFRva2VuXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIGV4ZWN1dG9yOiAocmVzb2x2ZTogKHZhbHVlPzogVCB8IFByb21pc2VMaWtlPFQ+KSA9PiB2b2lkLCByZWplY3Q6IChyZWFzb24/OiBhbnkpID0+IHZvaWQpID0+IHZvaWQsXG4gICAgICAgIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsXG4gICAgKSB7XG4gICAgICAgIHN1cGVyKGV4ZWN1dG9yKTtcbiAgICAgICAgcmV0dXJuIENhbmNlbGFibGVQcm9taXNlW19jcmVhdGVdKHRoaXMsIGNhbmNlbFRva2VuKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBjYWxsYmFja3MgZm9yIHRoZSByZXNvbHV0aW9uIGFuZC9vciByZWplY3Rpb24gb2YgdGhlIFByb21pc2UuXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvbmZ1bGZpbGxlZCBUaGUgY2FsbGJhY2sgdG8gZXhlY3V0ZSB3aGVuIHRoZSBQcm9taXNlIGlzIHJlc29sdmVkLlxuICAgICAqIEBwYXJhbSBvbnJlamVjdGVkIFRoZSBjYWxsYmFjayB0byBleGVjdXRlIHdoZW4gdGhlIFByb21pc2UgaXMgcmVqZWN0ZWQuXG4gICAgICogQHJldHVybnMgQSBQcm9taXNlIGZvciB0aGUgY29tcGxldGlvbiBvZiB3aGljaCBldmVyIGNhbGxiYWNrIGlzIGV4ZWN1dGVkLlxuICAgICAqL1xuICAgIHRoZW48VFJlc3VsdDEgPSBULCBUUmVzdWx0MiA9IG5ldmVyPihcbiAgICAgICAgb25mdWxmaWxsZWQ/OiAoKHZhbHVlOiBUKSA9PiBUUmVzdWx0MSB8IFByb21pc2VMaWtlPFRSZXN1bHQxPikgfCBudWxsLFxuICAgICAgICBvbnJlamVjdGVkPzogKChyZWFzb246IGFueSkgPT4gVFJlc3VsdDIgfCBQcm9taXNlTGlrZTxUUmVzdWx0Mj4pIHwgbnVsbFxuICAgICk6IFByb21pc2U8VFJlc3VsdDEgfCBUUmVzdWx0Mj4ge1xuICAgICAgICByZXR1cm4gQ2FuY2VsYWJsZVByb21pc2VbX2NyZWF0ZV0odGhpcywgX3Rva2Vucy5nZXQodGhpcyksIFtvbmZ1bGZpbGxlZCwgb25yZWplY3RlZF0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGEgY2FsbGJhY2sgZm9yIG9ubHkgdGhlIHJlamVjdGlvbiBvZiB0aGUgUHJvbWlzZS5cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIG9ucmVqZWN0ZWQgVGhlIGNhbGxiYWNrIHRvIGV4ZWN1dGUgd2hlbiB0aGUgUHJvbWlzZSBpcyByZWplY3RlZC5cbiAgICAgKiBAcmV0dXJucyBBIFByb21pc2UgZm9yIHRoZSBjb21wbGV0aW9uIG9mIHRoZSBjYWxsYmFjay5cbiAgICAgKi9cbiAgICBjYXRjaDxUUmVzdWx0MiA9IG5ldmVyPihvbnJlamVjdGVkPzogKChyZWFzb246IGFueSkgPT4gVFJlc3VsdDIgfCBQcm9taXNlTGlrZTxUUmVzdWx0Mj4pIHwgbnVsbCk6IFByb21pc2U8VCB8IFRSZXN1bHQyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnRoZW4odW5kZWZpbmVkLCBvbnJlamVjdGVkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBhIGNhbGxiYWNrIHRoYXQgaXMgaW52b2tlZCB3aGVuIHRoZSBQcm9taXNlIGlzIHNldHRsZWQgKGZ1bGZpbGxlZCBvciByZWplY3RlZCkuIDxicj5cbiAgICAgKiBUaGUgcmVzb2x2ZWQgdmFsdWUgY2Fubm90IGJlIG1vZGlmaWVkIGZyb20gdGhlIGNhbGxiYWNrLlxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb25maW5hbGx5IFRoZSBjYWxsYmFjayB0byBleGVjdXRlIHdoZW4gdGhlIFByb21pc2UgaXMgc2V0dGxlZCAoZnVsZmlsbGVkIG9yIHJlamVjdGVkKS5cbiAgICAgKiBAcmV0dXJucyBBIFByb21pc2UgZm9yIHRoZSBjb21wbGV0aW9uIG9mIHRoZSBjYWxsYmFjay5cbiAgICAgKi9cbiAgICBmaW5hbGx5KG9uZmluYWxseT86ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZCB8IG51bGwpOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgcmV0dXJuIENhbmNlbGFibGVQcm9taXNlW19jcmVhdGVdKHN1cGVyLmZpbmFsbHkob25maW5hbGx5KSwgX3Rva2Vucy5nZXQodGhpcykpO1xuICAgIH1cblxufVxuXG4vKipcbiAqIEBlbiBTd2l0Y2ggdGhlIGdsb2JhbCBgUHJvbWlzZWAgY29uc3RydWN0b3IgYE5hdGl2ZSBQcm9taXNlYCBvciBbW0NhbmNlbGFibGVQcm9taXNlXV0uIDxicj5cbiAqICAgICBgTmF0aXZlIFByb21pc2VgIGNvbnN0cnVjdG9yIGlzIG92ZXJyaWRkZW4gYnkgZnJhbWV3b3JrIGRlZmF1bHQgYmVoYXZpb3VyLlxuICogQGphIOOCsOODreODvOODkOODqyBgUHJvbWlzZWAg44Kz44Oz44K544OI44Op44Kv44K/44KSIGBOYXRpdmUgUHJvbWlzZWAg44G+44Gf44GvIFtbQ2FuY2VsYWJsZVByb21pc2VdXSDjgavliIfjgormm7/jgYggPGJyPlxuICogICAgIOaXouWumuOBpyBgTmF0aXZlIFByb21pc2VgIOOCkuOCquODvOODkOODvOODqeOCpOODieOBmeOCiy5cbiAqXG4gKiBAcGFyYW0gZW5hYmxlXG4gKiAgLSBgZW5gIGB0cnVlYDogdXNlIFtbQ2FuY2VsYWJsZVByb21pc2VdXSAvICBgZmFsc2VgOiB1c2UgYE5hdGl2ZSBQcm9taXNlYFxuICogIC0gYGphYCBgdHJ1ZWA6IFtbQ2FuY2VsYWJsZVByb21pc2VdXSDjgpLkvb/nlKggLyBgZmFsc2VgOiBgTmF0aXZlIFByb21pc2VgIOOCkuS9v+eUqFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0ZW5kUHJvbWlzZShlbmFibGU6IGJvb2xlYW4pOiBQcm9taXNlQ29uc3RydWN0b3Ige1xuICAgIGlmIChlbmFibGUpIHtcbiAgICAgICAgUHJvbWlzZSA9IENhbmNlbGFibGVQcm9taXNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIFByb21pc2UgPSBOYXRpdmVQcm9taXNlO1xuICAgIH1cbiAgICByZXR1cm4gUHJvbWlzZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBnbG9iYWwgY29uZmlnIG9wdGlvbnMgKi9cbmludGVyZmFjZSBHbG9iYWxDb25maWcge1xuICAgIG5vQXV0b21hdGljTmF0aXZlRXh0ZW5kOiBib29sZWFuO1xufVxuXG4vLyBkZWZhdWx0OiBhdXRvbWF0aWMgbmF0aXZlIHByb21pc2Ugb3ZlcnJpZGUuXG5leHRlbmRQcm9taXNlKCFnZXRDb25maWc8R2xvYmFsQ29uZmlnPigpLm5vQXV0b21hdGljTmF0aXZlRXh0ZW5kKTtcblxuZXhwb3J0IHtcbiAgICBDYW5jZWxhYmxlUHJvbWlzZSxcbiAgICBDYW5jZWxhYmxlUHJvbWlzZSBhcyBQcm9taXNlLFxufTtcbiIsIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1mdW5jdGlvbi1yZXR1cm4tdHlwZSAqL1xuXG5pbXBvcnQgeyBpc09iamVjdCwgaXNTdHJpbmcgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgQ2FuY2VsVG9rZW4sIENhbmNlbFRva2VuU291cmNlIH0gZnJvbSAnLi9jYW5jZWwtdG9rZW4nO1xuXG4vKipcbiAqIEBlbiBDYW5jZWxhYmxlIGJhc2Ugb3B0aW9uIGRlZmluaXRpb24uXG4gKiBAamEg44Kt44Oj44Oz44K744Or5Y+v6IO944Gq5Z+65bqV44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuY2VsYWJsZSB7XG4gICAgY2FuY2VsPzogQ2FuY2VsVG9rZW47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBXYWl0IGZvciBwcm9taXNlcyBkb25lLiA8YnI+XG4gKiAgICAgV2hpbGUgY29udHJvbCB3aWxsIGJlIHJldHVybmVkIGltbWVkaWF0ZWx5IHdoZW4gYFByb21pc2UuYWxsKClgIGZhaWxzLCBidXQgdGhpcyBtZWh0b2Qgd2FpdHMgZm9yIGluY2x1ZGluZyBmYWlsdXJlLlxuICogQGphIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4jjga7ntYLkuobjgb7jgaflvoXmqZ8gPGJyPlxuICogICAgIGBQcm9taXNlLmFsbCgpYCDjga/lpLHmlZfjgZnjgovjgajjgZnjgZDjgavliLblvqHjgpLov5TjgZnjga7jgavlr77jgZfjgIHlpLHmlZfjgoLlkKvjgoHjgablvoXjgaQgYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICpcbiAqIEBwYXJhbSBwcm9taXNlc1xuICogIC0gYGVuYCBQcm9taXNlIGluc3RhbmNlIGFycmF5XG4gKiAgLSBgamFgIFByb21pc2Ug44Kk44Oz44K544K/44Oz44K544Gu6YWN5YiX44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3YWl0KHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10pOiBQcm9taXNlPHVua25vd25bXT4ge1xuICAgIGNvbnN0IHNhZmVQcm9taXNlcyA9IHByb21pc2VzLm1hcCgocHJvbWlzZSkgPT4gcHJvbWlzZS5jYXRjaCgoZSkgPT4gZSkpO1xuICAgIHJldHVybiBQcm9taXNlLmFsbChzYWZlUHJvbWlzZXMpO1xufVxuXG4vKipcbiAqIEBlbiBDYW5jZWxsYXRpb24gY2hlY2tlciBtZXRob2QuIDxicj5cbiAqICAgICBJdCdzIHByYWN0aWNhYmxlIGJ5IGBhc3luYyBmdW5jdGlvbmAuXG4gKiBAamEg44Kt44Oj44Oz44K744Or44OB44Kn44OD44Kr44O8IDxicj5cbiAqICAgICBgYXN5bmMgZnVuY3Rpb25gIOOBp+S9v+eUqOWPr+iDvVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogIGFzeW5jIGZ1bmN0aW9uIHNvbWVGdW5jKHRva2VuOiBDYW5jZWxUb2tlbik6IFByb21pc2U8e30+IHtcbiAqICAgIGF3YWl0IGNoZWNrQ2FuY2VsZWQodG9rZW4pO1xuICogICAgcmV0dXJuIHt9O1xuICogIH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tDYW5jZWxlZCh0b2tlbjogQ2FuY2VsVG9rZW4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHVuZGVmaW5lZCwgdG9rZW4pO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcmVnZXhDYW5jZWxMaWtlU3RyaW5nID0gLyhhYm9ydHxjYW5jZWwpL2ltO1xuXG4vKipcbiAqIEBlbiBQcmVzdW1lIHdoZXRoZXIgaXQncyBhIGNhbmNlbGVkIGVycm9yLlxuICogQGphIOOCreODo+ODs+OCu+ODq+OBleOCjOOBn+OCqOODqeODvOOBp+OBguOCi+OBi+aOqOWumlxuICpcbiAqIEBwYXJhbSBlcnJvclxuICogIC0gYGVuYCBhbiBlcnJvciBvYmplY3QgaGFuZGxlZCBpbiBgY2F0Y2hgIGJsb2NrLlxuICogIC0gYGphYCBgY2F0Y2hgIOevgOOBquOBqeOBp+ijnOi2s+OBl+OBn+OCqOODqeODvOOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNDaGFuY2VsTGlrZUVycm9yKGVycm9yOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgaWYgKG51bGwgPT0gZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoZXJyb3IpKSB7XG4gICAgICAgIHJldHVybiBfcmVnZXhDYW5jZWxMaWtlU3RyaW5nLnRlc3QoZXJyb3IpO1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoZXJyb3IpKSB7XG4gICAgICAgIHJldHVybiBfcmVnZXhDYW5jZWxMaWtlU3RyaW5nLnRlc3QoKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIG1hbmFnZXMgbHVtcGluZyBtdWx0aXBsZSBgUHJvbWlzZWAgb2JqZWN0cy4gPGJyPlxuICogICAgIEl0J3MgcG9zc2libGUgdG8gbWFrZSB0aGVtIGNhbmNlbCBtb3JlIHRoYW4gb25lIGBQcm9taXNlYCB3aGljaCBoYW5kbGVzIGRpZmZlcmVudCBbW0NhbmNlbFRva2VuXV0gYnkgbHVtcGluZy5cbiAqIEBqYSDopIfmlbAgYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiOOCkuS4gOaLrOeuoeeQhuOBmeOCi+OCr+ODqeOCuSA8YnI+XG4gKiAgICAg55Ww44Gq44KLIFtbQ2FuY2VsVG9rZW5dXSDjgpLmibHjgYbopIfmlbDjga4gYFByb21pc2VgIOOCkuS4gOaLrOOBp+OCreODo+ODs+OCu+ODq+OBleOBm+OCi+OBk+OBqOOBjOWPr+iDvVxuICovXG5leHBvcnQgY2xhc3MgUHJvbWlzZU1hbmFnZXIge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBmdW5jLWNhbGwtc3BhY2luZ1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Bvb2wgPSBuZXcgTWFwPFByb21pc2U8dW5rbm93bj4sICgocmVhc29uOiB1bmtub3duKSA9PiB1bmtub3duKSB8IHVuZGVmaW5lZD4oKTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgYSBgUHJvbWlzZWAgb2JqZWN0IHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OI44KS566h55CG5LiL44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvbWlzZVxuICAgICAqICAtIGBlbmAgYW55IGBQcm9taXNlYCBpbnN0YW5jZSBpcyBhdmFpbGFibGUuXG4gICAgICogIC0gYGphYCDku7vmhI/jga4gYFByb21pc2VgIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEBwYXJhbSBjYW5jZWxTb3VyY2VcbiAgICAgKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5Tb3VyY2VdXSBpbnN0YW5jZSBtYWRlIGJ5IGBDYW5jZWxUb2tlbi5zb3VyY2UoKWAuXG4gICAgICogIC0gYGphYCBgQ2FuY2VsVG9rZW4uc291cmNlKClgIOOBp+eUn+aIkOOBleOCjOOCiyBbW0NhbmNlbFRva2VuU291cmNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJldHVybiB0aGUgc2FtZSBpbnN0YW5jZSBvZiBpbnB1dCBgcHJvbWlzZWAgaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDlhaXlipvjgZfjgZ8gYHByb21pc2VgIOOBqOWQjOS4gOOCpOODs+OCueOCv+ODs+OCueOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBhZGQ8VD4ocHJvbWlzZTogUHJvbWlzZTxUPiwgY2FuY2VsU291cmNlPzogQ2FuY2VsVG9rZW5Tb3VyY2UpOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgdGhpcy5fcG9vbC5zZXQocHJvbWlzZSwgY2FuY2VsU291cmNlICYmIGNhbmNlbFNvdXJjZS5jYW5jZWwpO1xuXG4gICAgICAgIGNvbnN0IGFsd2F5cyA9ICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3Bvb2wuZGVsZXRlKHByb21pc2UpO1xuICAgICAgICAgICAgaWYgKGNhbmNlbFNvdXJjZSkge1xuICAgICAgICAgICAgICAgIGNhbmNlbFNvdXJjZS5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHByb21pc2VcbiAgICAgICAgICAgIC50aGVuKGFsd2F5cywgYWx3YXlzKTtcblxuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVsZWFzZWQgYWxsIGluc3RhbmNlcyB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44KS56C05qOEXG4gICAgICovXG4gICAgcHVibGljIHJlbGVhc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Bvb2wuY2xlYXIoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGBwcm9taXNlYCBhcnJheSBmcm9tIHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjga4gUHJvbWlzZSDjgpLphY3liJfjgaflj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJvbWlzZXMoKTogUHJvbWlzZTx1bmtub3duPltdIHtcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzLl9wb29sLmtleXMoKV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbGwgYFByb21pc2UuYWxsKClgIGZvciB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44Gr5a++44GX44GmIGBQcm9taXNlLmFsbCgpYFxuICAgICAqL1xuICAgIHB1YmxpYyBhbGwoKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbCh0aGlzLnByb21pc2VzKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYWxsIGBQcm9taXNlLnJhY2UoKWAgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgavlr77jgZfjgaYgYFByb21pc2UucmFjZSgpYFxuICAgICAqL1xuICAgIHB1YmxpYyByYWNlKCkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yYWNlKHRoaXMucHJvbWlzZXMoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbGwgW1t3YWl0XV0oKSBmb3IgdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBq+WvvuOBl+OBpiBbW3dhaXRdXSgpXG4gICAgICovXG4gICAgcHVibGljIHdhaXQoKSB7XG4gICAgICAgIHJldHVybiB3YWl0KHRoaXMucHJvbWlzZXMoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEludm9rZSBgY2FuY2VsYCBtZXNzYWdlIGZvciB1bmRlciB0aGUgbWFuYWdlbWVudCBwcm9taXNlcy5cbiAgICAgKiBAamEg566h55CG5a++6LGh44GuIGBQcm9taXNlYCDjgavlr77jgZfjgabjgq3jg6Pjg7Pjgrvjg6vjgpLnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSByZWFzb25cbiAgICAgKiAgLSBgZW5gIGFyZ3VtZW50cyBmb3IgYGNhbmNlbFNvdXJjZWBcbiAgICAgKiAgLSBgamFgIGBjYW5jZWxTb3VyY2VgIOOBq+a4oeOBleOCjOOCi+W8leaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgUHJvbWlzZWAgaW5zdGFuY2Ugd2hpY2ggd2FpdCBieSB1bnRpbCBjYW5jZWxsYXRpb24gY29tcGxldGlvbi5cbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODq+WujOS6huOBvuOBp+W+heapn+OBmeOCiyBbW1Byb21pc2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgYWJvcnQ8VD4ocmVhc29uPzogVCk6IFByb21pc2U8dW5rbm93bltdPiB7XG4gICAgICAgIGZvciAoY29uc3QgY2FuY2VsZXIgb2YgdGhpcy5fcG9vbC52YWx1ZXMoKSkge1xuICAgICAgICAgICAgaWYgKGNhbmNlbGVyKSB7XG4gICAgICAgICAgICAgICAgY2FuY2VsZXIoXG4gICAgICAgICAgICAgICAgICAgIChudWxsICE9IHJlYXNvbikgPyByZWFzb24gOiBuZXcgRXJyb3IoJ2Fib3J0JylcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3YWl0KHRoaXMucHJvbWlzZXMoKSk7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5pbXBvcnQge1xuICAgIGlzU3RyaW5nLFxuICAgIGlzU3ltYm9sLFxuICAgIGNsYXNzTmFtZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudC1wdWJsaXNoZXInO1xuXG4vKiogQGludGVybmFsIEV2ZW50QnJva2VyUHJveHkgKi9cbmV4cG9ydCBjbGFzcyBFdmVudEJyb2tlclByb3h5PEV2ZW50IGV4dGVuZHMge30+IHtcbiAgICBwcml2YXRlIF9icm9rZXI/OiBFdmVudEJyb2tlcjxFdmVudD47XG4gICAgcHVibGljIGdldCgpOiBFdmVudEJyb2tlcjxFdmVudD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYnJva2VyIHx8ICh0aGlzLl9icm9rZXIgPSBuZXcgRXZlbnRCcm9rZXIoKSk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgX2ludGVybmFsID0gU3ltYm9sKCdpbnRlcm5hbCcpO1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IF9ub3RpZnkgPSBTeW1ib2woJ25vdGlmeScpO1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IF9zdG9ja0NoYW5nZSA9IFN5bWJvbCgnc3RvY2stY2hhbmdlJyk7XG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgX25vdGlmeUNoYW5nZXMgPSBTeW1ib2woJ25vdGlmeS1jaGFuZ2VzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiB2ZXJpZnlPYnNlcnZhYmxlKHg6IGFueSk6IHZvaWQgfCBuZXZlciB7XG4gICAgaWYgKCF4IHx8ICF4W19pbnRlcm5hbF0pIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVGhlIG9iamVjdCBwYXNzZWQgaXMgbm90IGFuIElPYnNlcnZhYmxlLmApO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZlcmlmeVZhbGlkS2V5KGtleTogdW5rbm93bik6IHZvaWQgfCBuZXZlciB7XG4gICAgaWYgKGlzU3RyaW5nKGtleSkgfHwgaXNTeW1ib2woa2V5KSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFR5cGUgb2YgJHtjbGFzc05hbWUoa2V5KX0gaXMgbm90IGEgdmFsaWQga2V5LmApO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5pbXBvcnQgeyBTdWJzY3JpcHRpb24gfSBmcm9tICdAY2RwL2V2ZW50LXB1Ymxpc2hlcic7XG5pbXBvcnQgeyBfaW50ZXJuYWwgfSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gRXZlbnQgb2JzZXJ2YXRpb24gc3RhdGUgZGVmaW5pdGlvbi5cbiAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvlrprnvqlcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gT2JzZXJ2YWJsZVN0YXRlIHtcbiAgICAvKiogb2JzZXJ2YWJsZSByZWFkeSAqL1xuICAgIEFDVElWRSAgID0gJ2FjdGl2ZScsXG4gICAgLyoqIE5PVCBvYnNlcnZlZCwgYnV0IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkLiAqL1xuICAgIFNVU0VQTkRFRCA9ICdzdXNwZW5kZWQnLFxuICAgIC8qKiBOT1Qgb2JzZXJ2ZWQsIGFuZCBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMuICovXG4gICAgRElTQUJMRUQgPSAnZGlzYWJsZWQnLFxufVxuXG4vKipcbiAqIEBlbiBPYnNlcnZhYmxlIGNvbW1vbiBpbnRlcmZhY2UuXG4gKiBAamEgT2JzZXJ2YWJsZSDlhbHpgJrjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJT2JzZXJ2YWJsZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICovXG4gICAgb24oLi4uYXJnczogYW55W10pOiBTdWJzY3JpcHRpb247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqL1xuICAgIG9mZiguLi5hcmdzOiBhbnlbXSk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3VzcGVuZCBvciBkaXNhYmxlIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44K144K544Oa44Oz44OJXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm9SZWNvcmRcbiAgICAgKiAgLSBgZW5gIGB0cnVlYDogbm90IHJlY29yZGluZyBwcm9wZXJ0eSBjaGFuZ2VzIGFuZCBjbGVhciBjaGFuZ2VzLiAvIGBmYWxzZWA6IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkIGFuZCBmaXJlZCB3aGVuIFtbcmVzdW1lXV0oKSBjYWxsZGVkLiAoZGVmYXVsdClcbiAgICAgKiAgLSBgamFgIGB0cnVlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044KC6KiY6Yyy44Gb44GaLCDnj77lnKjjga7oqJjpjLLjgoLnoLTmo4QgLyBgZmFsc2VgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7Tjga/oqJjpjLLjgZXjgowsIFtbcmVzdW1lXV0oKSDmmYLjgavnmbrngavjgZnjgosgKOaXouWumilcbiAgICAgKi9cbiAgICBzdXNwZW5kKG5vUmVjb3JkPzogYm9vbGVhbik6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzdW1lIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44Oq44K444Ol44O844OgXG4gICAgICovXG4gICAgcmVzdW1lKCk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gb2JzZXJ2YXRpb24gc3RhdGVcbiAgICAgKiBAamEg6LO86Kqt5Y+v6IO954q25oWLXG4gICAgICovXG4gICAgZ2V0T2JzZXJ2YWJsZVN0YXRlKCk6IE9ic2VydmFibGVTdGF0ZTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgW1tJT2JzZXJ2YWJsZV1dLlxuICogQGphIFtbSU9ic2VydmFibGVdXSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09ic2VydmFibGUoeDogYW55KTogeCBpcyBJT2JzZXJ2YWJsZSB7XG4gICAgcmV0dXJuIEJvb2xlYW4oeCAmJiB4W19pbnRlcm5hbF0pO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5pbXBvcnQge1xuICAgIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lcyxcbiAgICBBcmd1bWVudHMsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICB2ZXJpZnksXG4gICAgcG9zdCxcbiAgICBkZWVwTWVyZ2UsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24gfSBmcm9tICdAY2RwL2V2ZW50LXB1Ymxpc2hlcic7XG5pbXBvcnQge1xuICAgIEV2ZW50QnJva2VyUHJveHksXG4gICAgX2ludGVybmFsLFxuICAgIF9ub3RpZnksXG4gICAgX3N0b2NrQ2hhbmdlLFxuICAgIF9ub3RpZnlDaGFuZ2VzLFxuICAgIHZlcmlmeU9ic2VydmFibGUsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZVN0YXRlLCBJT2JzZXJ2YWJsZSB9IGZyb20gJy4vY29tbW9uJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEludGVybmFsUHJvcHMge1xuICAgIHN0YXRlOiBPYnNlcnZhYmxlU3RhdGU7XG4gICAgY2hhbmdlZDogYm9vbGVhbjtcbiAgICByZWFkb25seSBjaGFuZ2VNYXA6IE1hcDxQcm9wZXJ0eUtleSwgYW55PjtcbiAgICByZWFkb25seSBicm9rZXI6IEV2ZW50QnJva2VyUHJveHk8YW55Pjtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3Byb3h5SGFuZGxlcjogUHJveHlIYW5kbGVyPE9ic2VydmFibGVPYmplY3Q+ID0ge1xuICAgIHNldCh0YXJnZXQsIHAsIHZhbHVlLCByZWNlaXZlcikge1xuICAgICAgICBpZiAoIWlzU3RyaW5nKHApKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5zZXQodGFyZ2V0LCBwLCB2YWx1ZSwgcmVjZWl2ZXIpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0W3BdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSB0YXJnZXRbX2ludGVybmFsXS5zdGF0ZSAmJiB2YWx1ZSAhPT0gb2xkVmFsdWUpIHtcbiAgICAgICAgICAgIHRhcmdldFtfc3RvY2tDaGFuZ2VdKHAsIG9sZFZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUmVmbGVjdC5zZXQodGFyZ2V0LCBwLCB2YWx1ZSwgcmVjZWl2ZXIpO1xuICAgIH0sXG59O1xuT2JqZWN0LmZyZWV6ZShfcHJveHlIYW5kbGVyKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE9ic2VydmFibGUga2V5IHR5cGUgZGVmaW5pdGlvbi5cbiAqIEBqYSDos7zoqq3lj6/og73jgarjgq3jg7zjga7lnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgT2JzZXJ2YWJsZUtleXM8VCBleHRlbmRzIE9ic2VydmFibGVPYmplY3Q+ID0gTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+O1xuXG4vKipcbiAqIEBlbiBJbnRlcmZhY2UgYWJsZSB0byB0cmlnZ2VyIGFueSBldmVudHMgd2l0aCBbW0lPYnNlcnZhYmxlXV0uXG4gKiBAamEgW1tJT2JzZXJ2YWJsZV1dIOOBq+WvvuOBl+OBpuS7u+aEj+OBruOCpOODmeODs+ODiOOCkueZuuihjOWPr+iDveOBquOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIElPYnNlcnZhYmxlRXZlbnRUcmlnZ2VyPEV2ZW50ID0gYW55PiBleHRlbmRzIElPYnNlcnZhYmxlIHtcbiAgICAvKipcbiAgICAgKiBAZW4gTm90aWZ5IGV2ZW50IHRvIGNsaWVudHMuXG4gICAgICogQGphIGV2ZW50IOeZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGFyZ3VtZW50cyBmb3IgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsOOBq+a4oeOBmeW8leaVsFxuICAgICAqL1xuICAgIHRyaWdnZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsLCAuLi5hcmdzOiBBcmd1bWVudHM8UGFydGlhbDxFdmVudFtDaGFubmVsXT4+KTogdm9pZDtcbn1cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgb2JqZWN0IGNsYXNzIHdoaWNoIGNoYW5nZSBjYW4gYmUgb2JzZXJ2ZWQuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu5aSJ5pu044KS55uj6KaW44Gn44GN44KL44Kq44OW44K444Kn44Kv44OI44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogY2xhc3MgRXhhbXBsZSBleHRlbmRzIE9ic2VydmFibGVPYmplY3Qge1xuICogICBwdWJsaWMgYTogbnVtYmVyID0gMDtcbiAqICAgcHVibGljIGI6IG51bWJlciA9IDA7XG4gKiAgIHB1YmxpYyBnZXQgc3VtKCk6IG51bWJlciB7XG4gKiAgICAgICByZXR1cm4gdGhpcy5hICsgdGhpcy5iO1xuICogICB9XG4gKiB9XG4gKlxuICogY29uc3Qgb2JzZXJ2YWJsZSA9IG5ldyBFeGFtcGxlKCk7XG4gKlxuICogZnVuY3Rpb24gb25OdW1DaGFuZ2UobmV3VmFsdWU6IG51bWJlciwgb2xkVmFsdWU6IG51bWJlciwga2V5OiBzdHJpbmcpIHtcbiAqICAgY29uc29sZS5sb2coYCR7a2V5fSBjaGFuZ2VkIGZyb20gJHtvbGRWYWx1ZX0gdG8gJHtuZXdWYWx1ZX0uYCk7XG4gKiB9XG4gKiBvYnNlcnZhYmxlLm9uKFsnYScsICdiJ10sIG9uTnVtQ2hhbmdlKTtcbiAqXG4gKiAvLyB1cGRhdGVcbiAqIG9ic2VydmFibGUuYSA9IDEwMDtcbiAqIG9ic2VydmFibGUuYiA9IDIwMDtcbiAqXG4gKiAvLyBjb25zb2xlIG91dCBmcm9tIGBhc3luY2AgZXZlbnQgbG9vcC5cbiAqIC8vID0+ICdhIGNoYW5nZWQgZnJvbSAwIHRvIDEwMC4nXG4gKiAvLyA9PiAnYiBjaGFuZ2VkIGZyb20gMCB0byAyMDAuJ1xuICpcbiAqIDpcbiAqXG4gKiBmdW5jdGlvbiBvblN1bUNoYW5nZShuZXdWYWx1ZTogbnVtYmVyLCBvbGRWYWx1ZTogbnVtYmVyKSB7XG4gKiAgIGNvbnNvbGUubG9nKGBzdW0gY2hhbmdlZCBmcm9tICR7b2xkVmFsdWV9IHRvICR7bmV3VmF1ZX0uYCk7XG4gKiB9XG4gKiBvYnNlcnZhYmxlLm9uKCdzdW0nLCBvblN1bUNoYW5nZSk7XG4gKlxuICogLy8gdXBkYXRlXG4gKiBvYnNlcnZhYmxlLmEgPSAxMDA7IC8vIG5vdGhpbmcgcmVhY3Rpb24gYmVjYXVzZSBvZiBubyBjaGFuZ2UgcHJvcGVydGllcy5cbiAqIG9ic2VydmFibGUuYSA9IDIwMDtcbiAqXG4gKiAvLyBjb25zb2xlIG91dCBmcm9tIGBhc3luY2AgZXZlbnQgbG9vcC5cbiAqIC8vID0+ICdzdW0gY2hhbmdlZCBmcm9tIDMwMCB0byA0MDAuJ1xuICogYGBgXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBPYnNlcnZhYmxlT2JqZWN0IGltcGxlbWVudHMgSU9ic2VydmFibGUge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfaW50ZXJuYWxdOiBJbnRlcm5hbFByb3BzO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBzdGF0ZS4gZGVmYXVsdDogW1tPYnNlcnZhYmxlU3RhdGUuQUNUSVZFXV1cbiAgICAgKiAgLSBgamFgIOWIneacn+eKtuaFiyDml6Llrpo6IFtbT2JzZXJ2YWJsZVN0YXRlLkFDVElWRV1dXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3RhdGUgPSBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFKSB7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIE9ic2VydmFibGVPYmplY3QsIHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbDogSW50ZXJuYWxQcm9wcyA9IHtcbiAgICAgICAgICAgIHN0YXRlLFxuICAgICAgICAgICAgY2hhbmdlZDogZmFsc2UsXG4gICAgICAgICAgICBjaGFuZ2VNYXA6IG5ldyBNYXAoKSxcbiAgICAgICAgICAgIGJyb2tlcjogbmV3IEV2ZW50QnJva2VyUHJveHk8dGhpcz4oKSxcbiAgICAgICAgfTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIF9pbnRlcm5hbCwgeyB2YWx1ZTogT2JqZWN0LnNlYWwoaW50ZXJuYWwpIH0pO1xuICAgICAgICByZXR1cm4gbmV3IFByb3h5KHRoaXMsIF9wcm94eUhhbmRsZXIpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElPYnNlcnZhYmxlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIHByb3BlcnR5IGNoYW5nZXMuXG4gICAgICogQGphIOODl+ODreODkeODhuOCo+WkieabtOizvOiqreioreWumiAo5YWo44OX44Ot44OR44OG44Kj55uj6KaWKVxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnR5XG4gICAgICogIC0gYGVuYCB3aWxkIGNvcmQgc2lnbmF0dXJlLlxuICAgICAqICAtIGBqYWAg44Ov44Kk44Or44OJ44Kr44O844OJXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgcHJvcGVydHkgY2hhbmdlLlxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb24ocHJvcGVydHk6ICcqJywgbGlzdGVuZXI6IChjb250ZXh0OiBPYnNlcnZhYmxlT2JqZWN0KSA9PiBhbnkpOiBTdWJzY3JpcHRpb247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIHByb3BlcnR5IGNoYW5nZShzKS5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5aSJ5pu06LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydHlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eS5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIHByb3BlcnR5IGNoYW5nZS5cbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk6IEsgfCBLW10sIGxpc3RlbmVyOiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IGFueSk6IFN1YnNjcmlwdGlvbjtcblxuICAgIG9uPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk6IEsgfCBLW10sIGxpc3RlbmVyOiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IGFueSk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IHsgY2hhbmdlTWFwLCBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYnJva2VyLmdldCgpLm9uKHByb3BlcnR5LCBsaXN0ZW5lcik7XG4gICAgICAgIGlmICgwIDwgY2hhbmdlTWFwLnNpemUpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0gaXNBcnJheShwcm9wZXJ0eSkgPyBwcm9wZXJ0eSA6IFtwcm9wZXJ0eV07XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcHMpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VNYXAuaGFzKHByb3ApIHx8IGNoYW5nZU1hcC5zZXQocHJvcCwgdGhpc1twcm9wXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgcHJvcGVydHkgY2hhbmdlcylcbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5aSJ5pu06LO86Kqt6Kej6ZmkICjlhajjg5fjg63jg5Hjg4bjgqPnm6PoppYpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydHlcbiAgICAgKiAgLSBgZW5gIHdpbGQgY29yZCBzaWduYXR1cmUuXG4gICAgICogIC0gYGphYCDjg6/jgqTjg6vjg4njgqvjg7zjg4lcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBwcm9wZXJ0eSBjaGFuZ2UuXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvZmYocHJvcGVydHk6ICcqJywgbGlzdGVuZXI/OiAoY29udGV4dDogT2JzZXJ2YWJsZU9iamVjdCkgPT4gYW55KTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBwcm9wZXJ0eSBjaGFuZ2UocykuXG4gICAgICogQGphIOODl+ODreODkeODhuOCo+WkieabtOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnR5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGV2ZXJ5dGhpbmcgaXMgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jg5fjg63jg5Hjg4bjgqNcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuino+mZpFxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIHByb3BlcnR5IGNoYW5nZS5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgYWxsIHNhbWUgYGNoYW5uZWxgIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WQjOS4gCBgY2hhbm5lbGAg44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk/OiBLIHwgS1tdLCBsaXN0ZW5lcj86IChuZXdWYWx1ZTogdGhpc1tLXSwgb2xkVmFsdWU6IHRoaXNbS10sIGtleTogSykgPT4gYW55KTogdm9pZDtcblxuICAgIG9mZjxLIGV4dGVuZHMgT2JzZXJ2YWJsZUtleXM8dGhpcz4+KHByb3BlcnR5PzogSyB8IEtbXSwgbGlzdGVuZXI/OiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IGFueSk6IHZvaWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uYnJva2VyLmdldCgpLm9mZihwcm9wZXJ0eSwgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdXNwZW5kIG9yIGRpc2FibGUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jgrXjgrnjg5rjg7Pjg4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub1JlY29yZFxuICAgICAqICAtIGBlbmAgYHRydWVgOiBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMgYW5kIGNsZWFyIGNoYW5nZXMuIC8gYGZhbHNlYDogcHJvcGVydHkgY2hhbmdlcyBhcmUgcmVjb3JkZWQgYW5kIGZpcmVkIHdoZW4gW1tyZXN1bWVdXSgpIGNhbGxkZWQuIChkZWZhdWx0KVxuICAgICAqICAtIGBqYWAgYHRydWVgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7TjgoLoqJjpjLLjgZvjgZosIOePvuWcqOOBruiomOmMsuOCguegtOajhCAvIGBmYWxzZWA6IOODl+ODreODkeODhuOCo+WkieabtOOBr+iomOmMsuOBleOCjCwgW1tyZXN1bWVdXSgpIOaZguOBq+eZuueBq+OBmeOCiyAo5pei5a6aKVxuICAgICAqL1xuICAgIHN1c3BlbmQobm9SZWNvcmQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uc3RhdGUgPSBub1JlY29yZCA/IE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA6IE9ic2VydmFibGVTdGF0ZS5TVVNFUE5ERUQ7XG4gICAgICAgIGlmIChub1JlY29yZCkge1xuICAgICAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmNoYW5nZU1hcC5jbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN1bWUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jg6rjgrjjg6Xjg7zjg6BcbiAgICAgKi9cbiAgICByZXN1bWUoKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIGludGVybmFsLnN0YXRlID0gT2JzZXJ2YWJsZVN0YXRlLkFDVElWRTtcbiAgICAgICAgICAgIHBvc3QoKCkgPT4gdGhpc1tfbm90aWZ5Q2hhbmdlc10oKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIG9ic2VydmF0aW9uIHN0YXRlXG4gICAgICogQGphIOizvOiqreWPr+iDveeKtuaFi1xuICAgICAqL1xuICAgIGdldE9ic2VydmFibGVTdGF0ZSgpOiBPYnNlcnZhYmxlU3RhdGUge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpc1tfaW50ZXJuYWxdLnN0YXRlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElPYnNlcnZhYmxlRXZlbnRUcmlnZ2VyXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgdHJpZ2dlcihjaGFubmVsOiBzdHJpbmcsIC4uLmFyZ3M6IGFueVtdKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgYnJva2VyIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIChicm9rZXIuZ2V0KCkgYXMgYW55KS5wdWJsaXNoKGNoYW5uZWwsIC4uLmFyZ3MpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHN0YXRpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBbW09ic2VydmFibGVPYmplY3RdXSBmcm9tIGFueSBvYmplY3QuXG4gICAgICogQGphIOS7u+aEj+OBruOCquODluOCuOOCp+OCr+ODiOOBi+OCiSBbW09ic2VydmFibGVPYmplY3RdXSDjgpLnlJ/miJBcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogY29uc3Qgb2JzZXJ2YWJsZSA9IE9ic2VydmFibGVPYmplY3QuZnJvbSh7IGE6IDEsIGI6IDEgfSk7XG4gICAgICogZnVuY3Rpb24gb25OdW1DaGFuZ2UobmV3VmFsdWU6IG51bWJlciwgb2xkVmFsdWU6IG51bWJlciwga2V5OiBzdHJpbmcpIHtcbiAgICAgKiAgIGNvbnNvbGUubG9nKGAke2tleX0gY2hhbmdlZCBmcm9tICR7b2xkVmFsdWV9IHRvICR7bmV3VmFsdWV9LmApO1xuICAgICAqIH1cbiAgICAgKiBvYnNlcnZhYmxlLm9uKFsnYScsICdiJ10sIG9uTnVtQ2hhbmdlKTtcbiAgICAgKlxuICAgICAqIC8vIHVwZGF0ZVxuICAgICAqIG9ic2VydmFibGUuYSA9IDEwMDtcbiAgICAgKiBvYnNlcnZhYmxlLmIgPSAyMDA7XG4gICAgICpcbiAgICAgKiAvLyBjb25zb2xlIG91dCBmcm9tIGBhc3luY2AgZXZlbnQgbG9vcC5cbiAgICAgKiAvLyA9PiAnYSBjaGFuZ2VkIGZyb20gMSB0byAxMDAuJ1xuICAgICAqIC8vID0+ICdiIGNoYW5nZWQgZnJvbSAxIHRvIDIwMC4nXG4gICAgICogYGBgXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBmcm9tPFQgZXh0ZW5kcyB7fT4oc3JjOiBUKTogT2JzZXJ2YWJsZU9iamVjdCAmIFQge1xuICAgICAgICBjb25zdCBvYnNlcnZhYmxlID0gZGVlcE1lcmdlKG5ldyBjbGFzcyBleHRlbmRzIE9ic2VydmFibGVPYmplY3QgeyB9KE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCksIHNyYyk7XG4gICAgICAgIG9ic2VydmFibGUucmVzdW1lKCk7XG4gICAgICAgIHJldHVybiBvYnNlcnZhYmxlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByb3RlY3RlZCBtZWh0b2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEZvcmNlIG5vdGlmeSBwcm9wZXJ0eSBjaGFuZ2UocykgaW4gc3BpdGUgb2YgYWN0aXZlIHN0YXRlLlxuICAgICAqIEBqYSDjgqLjgq/jg4bjgqPjg5bnirbmhYvjgavjgYvjgYvjgo/jgonjgZrlvLfliLbnmoTjgavjg5fjg63jg5Hjg4bjgqPlpInmm7TpgJrnn6XjgpLnmbrooYxcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgbm90aWZ5KC4uLnByb3BlcnRpZXM6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGlmICgwID09PSBwcm9wZXJ0aWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHsgY2hhbmdlTWFwIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IGtleVZhbHVlID0gbmV3IE1hcDxQcm9wZXJ0eUtleSwgW2FueSwgYW55XT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgcHJvcGVydGllcykge1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSB0aGlzW2tleV07XG4gICAgICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IGNoYW5nZU1hcC5oYXMoa2V5KSA/IGNoYW5nZU1hcC5nZXQoa2V5KSA6IG5ld1ZhbHVlO1xuICAgICAgICAgICAga2V5VmFsdWUuc2V0KGtleSwgW25ld1ZhbHVlLCBvbGRWYWx1ZV0pO1xuICAgICAgICB9XG4gICAgICAgIDAgPCBrZXlWYWx1ZS5zaXplICYmIHRoaXNbX25vdGlmeV0oa2V5VmFsdWUpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWVodG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfc3RvY2tDaGFuZ2VdKHA6IHN0cmluZywgb2xkVmFsdWU6IGFueSk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCBjaGFuZ2VNYXAsIGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uY2hhbmdlZCA9IHRydWU7XG4gICAgICAgIGlmICgwID09PSBjaGFuZ2VNYXAuc2l6ZSkge1xuICAgICAgICAgICAgY2hhbmdlTWFwLnNldChwLCBvbGRWYWx1ZSk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGsgb2YgYnJva2VyLmdldCgpLmNoYW5uZWxzKCkpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VNYXAuaGFzKGspIHx8IGNoYW5nZU1hcC5zZXQoaywgdGhpc1trXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSA9PT0gc3RhdGUpIHtcbiAgICAgICAgICAgICAgICBwb3N0KCgpID0+IHRoaXNbX25vdGlmeUNoYW5nZXNdKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2hhbmdlTWFwLmhhcyhwKSB8fCBjaGFuZ2VNYXAuc2V0KHAsIG9sZFZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfbm90aWZ5Q2hhbmdlc10oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgc3RhdGUsIGNoYW5nZU1hcCB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSAhPT0gc3RhdGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBrZXlWYWx1ZVBhaXJzID0gbmV3IE1hcDxQcm9wZXJ0eUtleSwgW2FueSwgYW55XT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCBvbGRWYWx1ZV0gb2YgY2hhbmdlTWFwKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJWYWx1ZSA9IHRoaXNba2V5XTtcbiAgICAgICAgICAgIGlmIChvbGRWYWx1ZSAhPT0gY3VyVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBrZXlWYWx1ZVBhaXJzLnNldChrZXksIFtjdXJWYWx1ZSwgb2xkVmFsdWVdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzW19ub3RpZnldKGtleVZhbHVlUGFpcnMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfbm90aWZ5XShrZXlWYWx1ZTogTWFwPFByb3BlcnR5S2V5LCBbYW55LCBhbnldPik6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGNoYW5nZWQsIGNoYW5nZU1hcCwgYnJva2VyIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNoYW5nZU1hcC5jbGVhcigpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBjb25zdCBldmVudEJyb2tlciA9IGJyb2tlci5nZXQoKTtcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZXNdIG9mIGtleVZhbHVlKSB7XG4gICAgICAgICAgICAoZXZlbnRCcm9rZXIgYXMgYW55KS5wdWJsaXNoKGtleSwgLi4udmFsdWVzLCBrZXkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGFuZ2VkKSB7XG4gICAgICAgICAgICBldmVudEJyb2tlci5wdWJsaXNoKCcqJywgdGhpcyk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBwcmVmZXItcmVzdC1wYXJhbXMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuaW1wb3J0IHtcbiAgICBXcml0YWJsZSxcbiAgICBpc051bWJlcixcbiAgICB2ZXJpZnksXG4gICAgcG9zdCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiB9IGZyb20gJ0BjZHAvZXZlbnQtcHVibGlzaGVyJztcbmltcG9ydCB7XG4gICAgRXZlbnRCcm9rZXJQcm94eSxcbiAgICBfaW50ZXJuYWwsXG4gICAgX25vdGlmeSxcbiAgICBfc3RvY2tDaGFuZ2UsXG4gICAgX25vdGlmeUNoYW5nZXMsXG4gICAgdmVyaWZ5T2JzZXJ2YWJsZSxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlU3RhdGUsIElPYnNlcnZhYmxlIH0gZnJvbSAnLi9jb21tb24nO1xuXG4vKipcbiAqIEBlbiBBcnJheSBjaGFuZ2UgdHlwZSBpbmZvcm1hdGlvbi4gPGJyPlxuICogICAgIFRoZSB2YWx1ZSBpcyBzdWl0YWJsZSBmb3IgdGhlIG51bWJlciBvZiBmbHVjdHVhdGlvbiBvZiB0aGUgZWxlbWVudC5cbiAqIEBqYSDphY3liJflpInmm7TpgJrnn6Xjga7jgr/jgqTjg5cgPGJyPlxuICogICAgIOWApOOBr+imgee0oOOBruWil+a4m+aVsOOBq+ebuOW9k1xuICpcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQXJyYXlDaGFuZ2VUeXBlIHtcbiAgICBSRU1PVkUgPSAtMSxcbiAgICBVUERBVEUgPSAwLFxuICAgIElOU0VSVCA9IDEsXG59XG5cbi8qKlxuICogQGVuIEFycmF5IGNoYW5nZSByZWNvcmQgaW5mb3JtYXRpb24uXG4gKiBAamEg6YWN5YiX5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXJyYXlDaGFuZ2VSZWNvcmQ8VD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgY2hhbmdlIHR5cGUgaW5mb3JtYXRpb24uXG4gICAgICogQGphIOmFjeWIl+WkieabtOaDheWgseOBruitmOWIpeWtkFxuICAgICAqL1xuICAgIHJlYWRvbmx5IHR5cGU6IEFycmF5Q2hhbmdlVHlwZTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgY2hhbmdlIHR5cGUgaW5mb3JtYXRpb24uIDxicj5cbiAgICAgKiAgICAg4oC7IFtBdHRlbnRpb25dIFRoZSBpbmRleCB3aWxsIGJlIGRpZmZlcmVudCBmcm9tIHRoZSBhY3R1YWwgbG9jYXRpb24gd2hlbiBhcnJheSBzaXplIGNoYW5nZWQgYmVjYXVzZSB0aGF0IGRldGVybWluZXMgZWxlbWVudCBvcGVyYXRpb24gdW5pdC5cbiAgICAgKiBAamEg5aSJ5pu044GM55m655Sf44GX44Gf6YWN5YiX5YaF44Gu5L2N572u44GuIGluZGV4IDxicj5cbiAgICAgKiAgICAg4oC7IFvms6jmhI9dIOOCquODmuODrOODvOOCt+ODp+ODs+WNmOS9jeOBriBpbmRleCDjgajjgarjgoosIOimgee0oOOBjOWil+a4m+OBmeOCi+WgtOWQiOOBr+Wun+mam+OBruS9jee9ruOBqOeVsOOBquOCi+OBk+OBqOOBjOOBguOCi1xuICAgICAqL1xuICAgIHJlYWRvbmx5IGluZGV4OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTmV3IGVsZW1lbnQncyB2YWx1ZS5cbiAgICAgKiBAamEg6KaB57Sg44Gu5paw44GX44GE5YCkXG4gICAgICovXG4gICAgcmVhZG9ubHkgbmV3VmFsdWU/OiBUO1xuXG4gICAgLyoqXG4gICAgICogQGVuIE9sZCBlbGVtZW50J3MgdmFsdWUuXG4gICAgICogQGphIOimgee0oOOBruWPpOOBhOWApFxuICAgICAqL1xuICAgIHJlYWRvbmx5IG9sZFZhbHVlPzogVDtcbn1cbnR5cGUgTXV0YWJsZUNoYW5nZVJlY29yZDxUPiA9IFdyaXRhYmxlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+PjtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBJQXJyYXlDaGFuZ2VFdmVudDxUPiB7XG4gICAgJ0AnOiBbQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXV07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBJbnRlcm5hbFByb3BzPFQgPSBhbnk+IHtcbiAgICBzdGF0ZTogT2JzZXJ2YWJsZVN0YXRlO1xuICAgIGJ5TWV0aG9kOiBib29sZWFuO1xuICAgIHJlY29yZHM6IE11dGFibGVDaGFuZ2VSZWNvcmQ8VD5bXTtcbiAgICByZWFkb25seSBpbmRleGVzOiBTZXQ8bnVtYmVyPjtcbiAgICByZWFkb25seSBicm9rZXI6IEV2ZW50QnJva2VyUHJveHk8SUFycmF5Q2hhbmdlRXZlbnQ8VD4+O1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcHJveHlIYW5kbGVyOiBQcm94eUhhbmRsZXI8T2JzZXJ2YWJsZUFycmF5PiA9IHtcbiAgICBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHAsIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0YXJnZXRbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA9PT0gaW50ZXJuYWwuc3RhdGUgfHwgaW50ZXJuYWwuYnlNZXRob2QgfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhdHRyaWJ1dGVzLCAndmFsdWUnKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtwXTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBhdHRyaWJ1dGVzLnZhbHVlO1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZXFlcWVxXG4gICAgICAgIGlmICgnbGVuZ3RoJyA9PT0gcCAmJiBuZXdWYWx1ZSAhPSBvbGRWYWx1ZSkgeyAvLyBEbyBOT1QgdXNlIHN0cmljdCBpbmVxdWFsaXR5ICghPT0pXG4gICAgICAgICAgICBjb25zdCBvbGRMZW5ndGggPSBvbGRWYWx1ZSA+Pj4gMDtcbiAgICAgICAgICAgIGNvbnN0IG5ld0xlbmd0aCA9IG5ld1ZhbHVlID4+PiAwO1xuICAgICAgICAgICAgY29uc3Qgc3RvY2sgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyYXAgPSBuZXdMZW5ndGggPCBvbGRMZW5ndGggJiYgdGFyZ2V0LnNsaWNlKG5ld0xlbmd0aCk7XG4gICAgICAgICAgICAgICAgaWYgKHNjcmFwKSB7IC8vIG5ld0xlbmd0aCA8IG9sZExlbmd0aFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gb2xkTGVuZ3RoOyAtLWkgPj0gbmV3TGVuZ3RoOykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRSwgaSwgdW5kZWZpbmVkLCBzY3JhcFtpIC0gbmV3TGVuZ3RoXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgIC8vIG9sZExlbmd0aCA8IG5ld0xlbmd0aFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gb2xkTGVuZ3RoOyBpIDwgbmV3TGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFtfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGkgLyosIHVuZGVmaW5lZCwgdW5kZWZpbmVkICovKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcyk7XG4gICAgICAgICAgICByZXN1bHQgJiYgc3RvY2soKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSBpZiAobmV3VmFsdWUgIT09IG9sZFZhbHVlICYmIGlzVmFsaWRBcnJheUluZGV4KHApKSB7XG4gICAgICAgICAgICBjb25zdCBpID0gcCBhcyBhbnkgPj4+IDA7XG4gICAgICAgICAgICBjb25zdCB0eXBlOiBBcnJheUNoYW5nZVR5cGUgPSBOdW1iZXIoaSA+PSB0YXJnZXQubGVuZ3RoKTsgLy8gSU5TRVJUIG9yIFVQREFURVxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHAsIGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgcmVzdWx0ICYmIHRhcmdldFtfc3RvY2tDaGFuZ2VdKHR5cGUsIGksIG5ld1ZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZGVsZXRlUHJvcGVydHkodGFyZ2V0LCBwKSB7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGFyZ2V0W19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgPT09IGludGVybmFsLnN0YXRlIHx8IGludGVybmFsLmJ5TWV0aG9kIHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGFyZ2V0LCBwKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVsZXRlUHJvcGVydHkodGFyZ2V0LCBwKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtwXTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gUmVmbGVjdC5kZWxldGVQcm9wZXJ0eSh0YXJnZXQsIHApO1xuICAgICAgICByZXN1bHQgJiYgaXNWYWxpZEFycmF5SW5kZXgocCkgJiYgdGFyZ2V0W19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLlVQREFURSwgcCBhcyBhbnkgPj4+IDAsIHVuZGVmaW5lZCwgb2xkVmFsdWUpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG59O1xuT2JqZWN0LmZyZWV6ZShfcHJveHlIYW5kbGVyKTtcblxuLyoqIEBpbnRlcm5hbCB2YWxpZCBhcnJheSBpbmRleCBoZWxwZXIgKi9cbmZ1bmN0aW9uIGlzVmFsaWRBcnJheUluZGV4PFQ+KGluZGV4OiBhbnkpOiBib29sZWFuIHtcbiAgICBjb25zdCBzID0gU3RyaW5nKGluZGV4KTtcbiAgICBjb25zdCBuID0gTWF0aC50cnVuYyhzIGFzIGFueSk7XG4gICAgcmV0dXJuIFN0cmluZyhuKSA9PT0gcyAmJiAwIDw9IG4gJiYgbiA8IDB4RkZGRkZGRkY7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBpbmRleCBtYW5hZ2VtZW50ICovXG5mdW5jdGlvbiBmaW5kUmVsYXRlZENoYW5nZUluZGV4PFQ+KHJlY29yZHM6IE11dGFibGVDaGFuZ2VSZWNvcmQ8VD5bXSwgdHlwZTogQXJyYXlDaGFuZ2VUeXBlLCBpbmRleDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBjb25zdCBjaGVja1R5cGUgPSB0eXBlID09PSBBcnJheUNoYW5nZVR5cGUuSU5TRVJUXG4gICAgICAgID8gKHQ6IEFycmF5Q2hhbmdlVHlwZSkgPT4gdCA9PT0gQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRVxuICAgICAgICA6ICh0OiBBcnJheUNoYW5nZVR5cGUpID0+IHQgIT09IEFycmF5Q2hhbmdlVHlwZS5SRU1PVkVcbiAgICAgICAgO1xuXG4gICAgZm9yIChsZXQgaSA9IHJlY29yZHMubGVuZ3RoOyAtLWkgPj0gMDspIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSByZWNvcmRzW2ldO1xuICAgICAgICBpZiAodmFsdWUuaW5kZXggPT09IGluZGV4ICYmIGNoZWNrVHlwZSh2YWx1ZS50eXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWUuaW5kZXggPCBpbmRleCAmJiBCb29sZWFuKHZhbHVlLnR5cGUpKSB7IC8vIFJFTU9WRSBvciBJTlNFUlRcbiAgICAgICAgICAgIGluZGV4IC09IHZhbHVlLnR5cGU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIGFycmF5IGNsYXNzIHdoaWNoIGNoYW5nZSBjYW4gYmUgb2JzZXJ2ZWQuXG4gKiBAamEg5aSJ5pu055uj6KaW5Y+v6IO944Gq6YWN5YiX44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogY29uc3Qgb2JzQXJyYXkgPSBPYnNlcnZhYmxlQXJyYXkuZnJvbShbJ2EnLCAnYicsICdjJ10pO1xuICpcbiAqIGZ1bmN0aW9uIG9uQ2hhbmdlQXJyYXkocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmRbXSkge1xuICogICBjb25zb2xlLmxvZyhyZWNvcmRzKTtcbiAqICAgLy8gIFtcbiAqICAgLy8gICAgeyB0eXBlOiAxLCBpbmRleDogMywgbmV3VmFsdWU6ICd4Jywgb2xkVmFsdWU6IHVuZGVmaW5lZCB9LFxuICogICAvLyAgICB7IHR5cGU6IDEsIGluZGV4OiA0LCBuZXdWYWx1ZTogJ3knLCBvbGRWYWx1ZTogdW5kZWZpbmVkIH0sXG4gKiAgIC8vICAgIHsgdHlwZTogMSwgaW5kZXg6IDUsIG5ld1ZhbHVlOiAneicsIG9sZFZhbHVlOiB1bmRlZmluZWQgfVxuICogICAvLyAgXVxuICogfVxuICogb2JzQXJyYXkub24ob25DaGFuZ2VBcnJheSk7XG4gKlxuICogZnVuY3Rpb24gYWRkWFlaKCkge1xuICogICBvYnNBcnJheS5wdXNoKCd4JywgJ3knLCAneicpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBPYnNlcnZhYmxlQXJyYXk8VCA9IGFueT4gZXh0ZW5kcyBBcnJheTxUPiBpbXBsZW1lbnRzIElPYnNlcnZhYmxlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX2ludGVybmFsXTogSW50ZXJuYWxQcm9wczxUPjtcblxuICAgIC8qKiBAZmluYWwgY29uc3RydWN0b3IgKi9cbiAgICBwcml2YXRlIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlciguLi5hcmd1bWVudHMpO1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBPYnNlcnZhYmxlQXJyYXksIHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbDogSW50ZXJuYWxQcm9wczxUPiA9IHtcbiAgICAgICAgICAgIHN0YXRlOiBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFLFxuICAgICAgICAgICAgYnlNZXRob2Q6IGZhbHNlLFxuICAgICAgICAgICAgcmVjb3JkczogW10sXG4gICAgICAgICAgICBpbmRleGVzOiBuZXcgU2V0KCksXG4gICAgICAgICAgICBicm9rZXI6IG5ldyBFdmVudEJyb2tlclByb3h5PElBcnJheUNoYW5nZUV2ZW50PFQ+PigpLFxuICAgICAgICB9O1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgX2ludGVybmFsLCB7IHZhbHVlOiBPYmplY3Quc2VhbChpbnRlcm5hbCkgfSk7XG4gICAgICAgIGNvbnN0IGFyZ0xlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGlmICgxID09PSBhcmdMZW5ndGggJiYgaXNOdW1iZXIoYXJndW1lbnRzWzBdKSkge1xuICAgICAgICAgICAgY29uc3QgbGVuID0gYXJndW1lbnRzWzBdID4+PiAwO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuSU5TRVJULCBpIC8qLCB1bmRlZmluZWQgKi8pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKDAgPCBhcmdMZW5ndGgpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJnTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLklOU0VSVCwgaSwgYXJndW1lbnRzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFByb3h5KHRoaXMsIF9wcm94eUhhbmRsZXIpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElPYnNlcnZhYmxlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGFycmF5IGNoYW5nZShzKS5cbiAgICAgKiBAamEg6YWN5YiX5aSJ5pu06LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBhcnJheSBjaGFuZ2UuXG4gICAgICogIC0gYGphYCDphY3liJflpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbihsaXN0ZW5lcjogKHJlY29yZHM6IEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10pID0+IGFueSk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzW19pbnRlcm5hbF0uYnJva2VyLmdldCgpLm9uKCdAJywgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBhcnJheSBjaGFuZ2UocykuXG4gICAgICogQGphIOmFjeWIl+WkieabtOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYXJyYXkgY2hhbmdlLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOmFjeWIl+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvZmYobGlzdGVuZXI/OiAocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSkgPT4gYW55KTogdm9pZCB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHRoaXNbX2ludGVybmFsXS5icm9rZXIuZ2V0KCkub2ZmKCdAJywgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdXNwZW5kIG9yIGRpc2FibGUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jgrXjgrnjg5rjg7Pjg4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub1JlY29yZFxuICAgICAqICAtIGBlbmAgYHRydWVgOiBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMgYW5kIGNsZWFyIGNoYW5nZXMuIC8gYGZhbHNlYDogcHJvcGVydHkgY2hhbmdlcyBhcmUgcmVjb3JkZWQgYW5kIGZpcmVkIHdoZW4gW1tyZXN1bWVdXSgpIGNhbGxkZWQuIChkZWZhdWx0KVxuICAgICAqICAtIGBqYWAgYHRydWVgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7TjgoLoqJjpjLLjgZvjgZosIOePvuWcqOOBruiomOmMsuOCguegtOajhCAvIGBmYWxzZWA6IOODl+ODreODkeODhuOCo+WkieabtOOBr+iomOmMsuOBleOCjCwgW1tyZXN1bWVdXSgpIOaZguOBq+eZuueBq+OBmeOCiyAo5pei5a6aKVxuICAgICAqL1xuICAgIHN1c3BlbmQobm9SZWNvcmQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uc3RhdGUgPSBub1JlY29yZCA/IE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCA6IE9ic2VydmFibGVTdGF0ZS5TVVNFUE5ERUQ7XG4gICAgICAgIGlmIChub1JlY29yZCkge1xuICAgICAgICAgICAgdGhpc1tfaW50ZXJuYWxdLnJlY29yZHMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzdW1lIG9mIHRoZSBldmVudCBzdWJzY3JpcHRpb24gc3RhdGUuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreeKtuaFi+OBruODquOCuOODpeODvOODoFxuICAgICAqL1xuICAgIHJlc3VtZSgpOiB0aGlzIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgaW50ZXJuYWwuc3RhdGUgPSBPYnNlcnZhYmxlU3RhdGUuQUNUSVZFO1xuICAgICAgICAgICAgcG9zdCgoKSA9PiB0aGlzW19ub3RpZnlDaGFuZ2VzXSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gb2JzZXJ2YXRpb24gc3RhdGVcbiAgICAgKiBAamEg6LO86Kqt5Y+v6IO954q25oWLXG4gICAgICovXG4gICAgZ2V0T2JzZXJ2YWJsZVN0YXRlKCk6IE9ic2VydmFibGVTdGF0ZSB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzW19pbnRlcm5hbF0uc3RhdGU7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3ZlcnJpZGU6IEFycmF5IG1ldGhvZHNcblxuICAgIC8qKlxuICAgICAqIFNvcnRzIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSBjb21wYXJlRm4gVGhlIG5hbWUgb2YgdGhlIGZ1bmN0aW9uIHVzZWQgdG8gZGV0ZXJtaW5lIHRoZSBvcmRlciBvZiB0aGUgZWxlbWVudHMuIElmIG9taXR0ZWQsIHRoZSBlbGVtZW50cyBhcmUgc29ydGVkIGluIGFzY2VuZGluZywgQVNDSUkgY2hhcmFjdGVyIG9yZGVyLlxuICAgICAqL1xuICAgIHNvcnQoY29tcGFyYXRvcj86IChsaHM6IFQsIHJoczogVCkgPT4gbnVtYmVyKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCBvbGQgPSBBcnJheS5mcm9tKHRoaXMpO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLnNvcnQoY29tcGFyYXRvcik7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gZmFsc2U7XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IGludGVybmFsLnN0YXRlKSB7XG4gICAgICAgICAgICBjb25zdCBsZW4gPSBvbGQubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZhbHVlID0gb2xkW2ldO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gdGhpc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUgIT09IG9sZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuVVBEQVRFLCBpLCBuZXdWYWx1ZSwgb2xkVmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgZWxlbWVudHMgZnJvbSBhbiBhcnJheSBhbmQsIGlmIG5lY2Vzc2FyeSwgaW5zZXJ0cyBuZXcgZWxlbWVudHMgaW4gdGhlaXIgcGxhY2UsIHJldHVybmluZyB0aGUgZGVsZXRlZCBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gc3RhcnQgVGhlIHplcm8tYmFzZWQgbG9jYXRpb24gaW4gdGhlIGFycmF5IGZyb20gd2hpY2ggdG8gc3RhcnQgcmVtb3ZpbmcgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIGRlbGV0ZUNvdW50IFRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmVtb3ZlLlxuICAgICAqL1xuICAgIHNwbGljZShzdGFydDogbnVtYmVyLCBkZWxldGVDb3VudD86IG51bWJlcik6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGVsZW1lbnRzIGZyb20gYW4gYXJyYXkgYW5kLCBpZiBuZWNlc3NhcnksIGluc2VydHMgbmV3IGVsZW1lbnRzIGluIHRoZWlyIHBsYWNlLCByZXR1cm5pbmcgdGhlIGRlbGV0ZWQgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIHN0YXJ0IFRoZSB6ZXJvLWJhc2VkIGxvY2F0aW9uIGluIHRoZSBhcnJheSBmcm9tIHdoaWNoIHRvIHN0YXJ0IHJlbW92aW5nIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSBkZWxldGVDb3VudCBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHJlbW92ZS5cbiAgICAgKiBAcGFyYW0gaXRlbXMgRWxlbWVudHMgdG8gaW5zZXJ0IGludG8gdGhlIGFycmF5IGluIHBsYWNlIG9mIHRoZSBkZWxldGVkIGVsZW1lbnRzLlxuICAgICAqL1xuICAgIHNwbGljZShzdGFydDogbnVtYmVyLCBkZWxldGVDb3VudDogbnVtYmVyLCAuLi5pdGVtczogVFtdKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIHNwbGljZShzdGFydDogbnVtYmVyLCBkZWxldGVDb3VudD86IG51bWJlciwgLi4uaXRlbXM6IFRbXSk6IE9ic2VydmFibGVBcnJheTxUPiB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCBvbGRMZW4gPSB0aGlzLmxlbmd0aDtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSB0cnVlO1xuICAgICAgICBjb25zdCByZXN1bHQgPSAoc3VwZXIuc3BsaWNlIGFzIGFueSkoLi4uYXJndW1lbnRzKSBhcyBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gZmFsc2U7XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IGludGVybmFsLnN0YXRlKSB7XG4gICAgICAgICAgICBzdGFydCA9IE1hdGgudHJ1bmMoc3RhcnQpO1xuICAgICAgICAgICAgY29uc3QgZnJvbSA9IHN0YXJ0IDwgMCA/IE1hdGgubWF4KG9sZExlbiArIHN0YXJ0LCAwKSA6IE1hdGgubWluKHN0YXJ0LCBvbGRMZW4pO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IHJlc3VsdC5sZW5ndGg7IC0taSA+PSAwOykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuUkVNT1ZFLCBmcm9tICsgaSwgdW5kZWZpbmVkLCByZXN1bHRbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbGVuID0gaXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuSU5TRVJULCBmcm9tICsgaSwgaXRlbXNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyB0aGUgZmlyc3QgZWxlbWVudCBmcm9tIGFuIGFycmF5IGFuZCByZXR1cm5zIGl0LlxuICAgICAqL1xuICAgIHNoaWZ0KCk6IFQgfCB1bmRlZmluZWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY29uc3Qgb2xkTGVuID0gdGhpcy5sZW5ndGg7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc3VwZXIuc2hpZnQoKTtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSBmYWxzZTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gaW50ZXJuYWwuc3RhdGUgJiYgdGhpcy5sZW5ndGggPCBvbGRMZW4pIHtcbiAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuUkVNT1ZFLCAwLCB1bmRlZmluZWQsIHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbnNlcnRzIG5ldyBlbGVtZW50cyBhdCB0aGUgc3RhcnQgb2YgYW4gYXJyYXkuXG4gICAgICogQHBhcmFtIGl0ZW1zICBFbGVtZW50cyB0byBpbnNlcnQgYXQgdGhlIHN0YXJ0IG9mIHRoZSBBcnJheS5cbiAgICAgKi9cbiAgICB1bnNoaWZ0KC4uLml0ZW1zOiBUW10pOiBudW1iZXIge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSB0cnVlO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzdXBlci51bnNoaWZ0KC4uLml0ZW1zKTtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSBmYWxzZTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGxlbiA9IGl0ZW1zLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLklOU0VSVCwgaSwgaXRlbXNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbHMgYSBkZWZpbmVkIGNhbGxiYWNrIGZ1bmN0aW9uIG9uIGVhY2ggZWxlbWVudCBvZiBhbiBhcnJheSwgYW5kIHJldHVybnMgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgcmVzdWx0cy5cbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tmbiBBIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyB1cCB0byB0aHJlZSBhcmd1bWVudHMuIFRoZSBtYXAgbWV0aG9kIGNhbGxzIHRoZSBjYWxsYmFja2ZuIGZ1bmN0aW9uIG9uZSB0aW1lIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIGFycmF5LlxuICAgICAqIEBwYXJhbSB0aGlzQXJnIEFuIG9iamVjdCB0byB3aGljaCB0aGUgdGhpcyBrZXl3b3JkIGNhbiByZWZlciBpbiB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbi4gSWYgdGhpc0FyZyBpcyBvbWl0dGVkLCB1bmRlZmluZWQgaXMgdXNlZCBhcyB0aGUgdGhpcyB2YWx1ZS5cbiAgICAgKi9cbiAgICBtYXA8VT4oY2FsbGJhY2tmbjogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVLCB0aGlzQXJnPzogYW55KTogT2JzZXJ2YWJsZUFycmF5PFU+IHtcbiAgICAgICAgLypcbiAgICAgICAgICogW05PVEVdIG9yaWdpbmFsIGltcGxlbWVudCBpcyB2ZXJ5IHZlcnkgaGlnaC1jb3N0LlxuICAgICAgICAgKiAgICAgICAgc28gaXQncyBjb252ZXJ0ZWQgbmF0aXZlIEFycmF5IG9uY2UsIGFuZCByZXN0b3JlZC5cbiAgICAgICAgICpcbiAgICAgICAgICogcmV0dXJuIChzdXBlci5tYXAgYXMgYW55KSguLi5hcmd1bWVudHMpO1xuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIE9ic2VydmFibGVBcnJheS5mcm9tKFsuLi50aGlzXS5tYXAoY2FsbGJhY2tmbiwgdGhpc0FyZykpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWVodG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfc3RvY2tDaGFuZ2VdKHR5cGU6IEFycmF5Q2hhbmdlVHlwZSwgaW5kZXg6IG51bWJlciwgbmV3VmFsdWU/OiBULCBvbGRWYWx1ZT86IFQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZSwgaW5kZXhlcywgcmVjb3JkcyB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCByY2kgPSBpbmRleGVzLmhhcyhpbmRleCkgPyBmaW5kUmVsYXRlZENoYW5nZUluZGV4KHJlY29yZHMsIHR5cGUsIGluZGV4KSA6IC0xO1xuICAgICAgICBjb25zdCBsZW4gPSByZWNvcmRzLmxlbmd0aDtcbiAgICAgICAgaWYgKHJjaSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCByY3QgPSByZWNvcmRzW3JjaV0udHlwZTtcbiAgICAgICAgICAgIGlmICghcmN0IC8qIFVQREFURSAqLykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZSZWNvcmQgPSByZWNvcmRzLnNwbGljZShyY2ksIDEpWzBdO1xuICAgICAgICAgICAgICAgIC8vIFVQREFURSA9PiBVUERBVEUgOiBVUERBVEVcbiAgICAgICAgICAgICAgICAvLyBVUERBVEUgPT4gUkVNT1ZFIDogSU5TRVJUXG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKHR5cGUsIGluZGV4LCBuZXdWYWx1ZSwgcHJldlJlY29yZC5vbGRWYWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IHIsIGkgPSBsZW47IC0taSA+IHJjaTspIHtcbiAgICAgICAgICAgICAgICAgICAgciA9IHJlY29yZHNbaV07XG4gICAgICAgICAgICAgICAgICAgIChyLmluZGV4ID49IGluZGV4KSAmJiAoci5pbmRleCAtPSByY3QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBwcmV2UmVjb3JkID0gcmVjb3Jkcy5zcGxpY2UocmNpLCAxKVswXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZSAhPT0gQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJTlNFUlQgPT4gVVBEQVRFIDogSU5TRVJUXG4gICAgICAgICAgICAgICAgICAgIC8vIFJFTU9WRSA9PiBJTlNFUlQgOiBVUERBVEVcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKE51bWJlcighdHlwZSksIGluZGV4LCBuZXdWYWx1ZSwgcHJldlJlY29yZC5vbGRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGluZGV4ZXMuYWRkKGluZGV4KTtcbiAgICAgICAgcmVjb3Jkc1tsZW5dID0geyB0eXBlLCBpbmRleCwgbmV3VmFsdWUsIG9sZFZhbHVlIH07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFID09PSBzdGF0ZSAmJiAwID09PSBsZW4pIHtcbiAgICAgICAgICAgIHBvc3QoKCkgPT4gdGhpc1tfbm90aWZ5Q2hhbmdlc10oKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeUNoYW5nZXNdKCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCByZWNvcmRzIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFICE9PSBzdGF0ZSB8fCAwID09PSByZWNvcmRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgciBvZiByZWNvcmRzKSB7XG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKHIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXNbX25vdGlmeV0oT2JqZWN0LmZyZWV6ZShyZWNvcmRzKSBhcyBBcnJheUNoYW5nZVJlY29yZDxUPltdKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLnJlY29yZHMgPSBbXTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeV0ocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSk6IHZvaWQge1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaW50ZXJuYWwuaW5kZXhlcy5jbGVhcigpO1xuICAgICAgICBpbnRlcm5hbC5icm9rZXIuZ2V0KCkucHVibGlzaCgnQCcsIHJlY29yZHMpO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogT3ZlcnJpZGUgcmV0dXJuIHR5cGUgb2YgcHJvdG90eXBlIG1ldGhvZHNcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBPYnNlcnZhYmxlQXJyYXk8VD4ge1xuICAgIC8qKlxuICAgICAqIENvbWJpbmVzIHR3byBvciBtb3JlIGFycmF5cy5cbiAgICAgKiBAcGFyYW0gaXRlbXMgQWRkaXRpb25hbCBpdGVtcyB0byBhZGQgdG8gdGhlIGVuZCBvZiBhcnJheTEuXG4gICAgICovXG4gICAgY29uY2F0KC4uLml0ZW1zOiBUW11bXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBDb21iaW5lcyB0d28gb3IgbW9yZSBhcnJheXMuXG4gICAgICogQHBhcmFtIGl0ZW1zIEFkZGl0aW9uYWwgaXRlbXMgdG8gYWRkIHRvIHRoZSBlbmQgb2YgYXJyYXkxLlxuICAgICAqL1xuICAgIGNvbmNhdCguLi5pdGVtczogKFQgfCBUW10pW10pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogUmV2ZXJzZXMgdGhlIGVsZW1lbnRzIGluIGFuIEFycmF5LlxuICAgICAqL1xuICAgIHJldmVyc2UoKTogdGhpcztcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgc2VjdGlvbiBvZiBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0gc3RhcnQgVGhlIGJlZ2lubmluZyBvZiB0aGUgc3BlY2lmaWVkIHBvcnRpb24gb2YgdGhlIGFycmF5LlxuICAgICAqIEBwYXJhbSBlbmQgVGhlIGVuZCBvZiB0aGUgc3BlY2lmaWVkIHBvcnRpb24gb2YgdGhlIGFycmF5LlxuICAgICAqL1xuICAgIHNsaWNlKHN0YXJ0PzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZWxlbWVudHMgb2YgYW4gYXJyYXkgdGhhdCBtZWV0IHRoZSBjb25kaXRpb24gc3BlY2lmaWVkIGluIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIGNhbGxiYWNrZm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdXAgdG8gdGhyZWUgYXJndW1lbnRzLiBUaGUgZmlsdGVyIG1ldGhvZCBjYWxscyB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbiBvbmUgdGltZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBBbiBvYmplY3QgdG8gd2hpY2ggdGhlIHRoaXMga2V5d29yZCBjYW4gcmVmZXIgaW4gdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24uIElmIHRoaXNBcmcgaXMgb21pdHRlZCwgdW5kZWZpbmVkIGlzIHVzZWQgYXMgdGhlIHRoaXMgdmFsdWUuXG4gICAgICovXG4gICAgZmlsdGVyPFMgZXh0ZW5kcyBUPihjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHZhbHVlIGlzIFMsIHRoaXNBcmc/OiBhbnkpOiBPYnNlcnZhYmxlQXJyYXk8Uz47XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZWxlbWVudHMgb2YgYW4gYXJyYXkgdGhhdCBtZWV0IHRoZSBjb25kaXRpb24gc3BlY2lmaWVkIGluIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIGNhbGxiYWNrZm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdXAgdG8gdGhyZWUgYXJndW1lbnRzLiBUaGUgZmlsdGVyIG1ldGhvZCBjYWxscyB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbiBvbmUgdGltZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBBbiBvYmplY3QgdG8gd2hpY2ggdGhlIHRoaXMga2V5d29yZCBjYW4gcmVmZXIgaW4gdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24uIElmIHRoaXNBcmcgaXMgb21pdHRlZCwgdW5kZWZpbmVkIGlzIHVzZWQgYXMgdGhlIHRoaXMgdmFsdWUuXG4gICAgICovXG4gICAgZmlsdGVyKGNhbGxiYWNrZm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYW55LCB0aGlzQXJnPzogYW55KTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xufVxuXG4vKipcbiAqIE92ZXJyaWRlIHJldHVybiB0eXBlIG9mIHN0YXRpYyBtZXRob2RzXG4gKi9cbmV4cG9ydCBkZWNsYXJlIG5hbWVzcGFjZSBPYnNlcnZhYmxlQXJyYXkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvYmplY3QuXG4gICAgICogQHBhcmFtIGFycmF5TGlrZSBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZyb208VD4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4gfCBJdGVyYWJsZTxUPik6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvYmplY3QuXG4gICAgICogQHBhcmFtIGFycmF5TGlrZSBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSBtYXBmbiBBIG1hcHBpbmcgZnVuY3Rpb24gdG8gY2FsbCBvbiBldmVyeSBlbGVtZW50IG9mIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBWYWx1ZSBvZiAndGhpcycgdXNlZCB0byBpbnZva2UgdGhlIG1hcGZuLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZyb208VCwgVT4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4gfCBJdGVyYWJsZTxUPiwgbWFwZm46ICh0aGlzOiB2b2lkLCB2OiBULCBrOiBudW1iZXIpID0+IFUsIHRoaXNBcmc/OiB1bmRlZmluZWQpOiBPYnNlcnZhYmxlQXJyYXk8VT47XG4gICAgZnVuY3Rpb24gZnJvbTxYLCBULCBVPihhcnJheUxpa2U6IEFycmF5TGlrZTxUPiB8IEl0ZXJhYmxlPFQ+LCBtYXBmbjogKHRoaXM6IFgsIHY6IFQsIGs6IG51bWJlcikgPT4gVSwgdGhpc0FyZzogWCk6IE9ic2VydmFibGVBcnJheTxVPjtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgbmV3IGFycmF5IGZyb20gYSBzZXQgb2YgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIGl0ZW1zIEEgc2V0IG9mIGVsZW1lbnRzIHRvIGluY2x1ZGUgaW4gdGhlIG5ldyBhcnJheSBvYmplY3QuXG4gICAgICovXG4gICAgZnVuY3Rpb24gb2Y8VD4oLi4uaXRlbXM6IFRbXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlIG5vLWlubmVyLWRlY2xhcmF0aW9ucywgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzICovXG5cbi8qXG4gKiBOT1RFOiDlhoXpg6jjg6Ljgrjjg6Xjg7zjg6vjgasgYENEUGAgbmFtZXNwYWNlIOOCkuS9v+eUqOOBl+OBpuOBl+OBvuOBhuOBqCwg5aSW6YOo44Oi44K444Ol44O844Or44Gn44Gv5a6j6KiA44Gn44GN44Gq44GP44Gq44KLLlxuICogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy85NjExXG4gKi9cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29uc3RhbnQgZGVmaW5pdGlvbiBhYm91dCByYW5nZSBvZiB0aGUgcmVzdWx0IGNvZGUuXG4gICAgICogQGphIOODquOCtuODq+ODiOOCs+ODvOODieOBruevhOWbsuOBq+mWouOBmeOCi+WumuaVsOWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBjb25zdCBlbnVtIFJFU1VMVF9DT0RFX1JBTkdFIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBUaGUgYXNzaWduYWJsZSByYW5nZSBmb3IgdGhlIGNsaWVudCdzIGxvY2FsIHJlc3VsdCBjb3JkIGJ5IHdoaWNoIGV4cGFuc2lvbiBpcyBwb3NzaWJsZS5cbiAgICAgICAgICogQGphIOOCr+ODqeOCpOOCouODs+ODiOOBjOaLoeW8teWPr+iDveOBquODreODvOOCq+ODq+ODquOCtuODq+ODiOOCs+ODvOODieOBruOCouOCteOCpOODs+WPr+iDvemgmOWfn1xuICAgICAgICAgKi9cbiAgICAgICAgTUFYID0gMTAwMCxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBSZXNlcnZlZCByYW5nZSBvZiBmcmFtZXdvcmsuXG4gICAgICAgICAqIEBqYSDjg5Xjg6zjg7zjg6Djg6/jg7zjgq/jga7kuojntITpoJjln59cbiAgICAgICAgICovXG4gICAgICAgIFJFU0VSVkVEID0gMTAwMCxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIGFzc2lnbm1lbnQgcmFuZ2UgZ3VpZGVsaW5lIGRlZmluaXRpb24gdXNlZCBpbiB0aGUgbW9kdWxlLlxuICAgICAqIEBqYSDjg6Ljgrjjg6Xjg7zjg6vlhoXjgafkvb/nlKjjgZnjgovjgqLjgrXjgqTjg7PpoJjln5/jgqzjgqTjg4njg6njgqTjg7PlrprmlbDlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgY29uc3QgZW51bSBMT0NBTF9DT0RFX1JBTkdFX0dVSURFIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBUaGUgYXNzaWdubWVudCByYW5nZSBndWlkZWxpbmUgcGVyIDEgbW9kdWxlLlxuICAgICAgICAgKiBAamEgMeODouOCuOODpeODvOODq+W9k+OBn+OCiuOBq+WJsuOCiuW9k+OBpuOCi+OCouOCteOCpOODs+mgmOWfn+OCrOOCpOODieODqeOCpOODs1xuICAgICAgICAgKi9cbiAgICAgICAgTU9EVUxFID0gMTAwLFxuICAgICAgICAvKipcbiAgICAgICAgICogQGVuIFRoZSBhc3NpZ25tZW50IHJhbmdlIGd1aWRlbGluZSBwZXIgMSBmdW5jdGlvbi5cbiAgICAgICAgICogQGphIDHmqZ/og73lvZPjgZ/jgorjgavlibLjgorlvZPjgabjgovjgqLjgrXjgqTjg7PpoJjln5/jgqzjgqTjg4njg6njgqTjg7NcbiAgICAgICAgICovXG4gICAgICAgIEZVTkNUSU9OID0gMjAsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE9mZnNldCB2YWx1ZSBlbnVtZXJhdGlvbiBmb3IgW1tSRVNVTFRfQ09ERV1dLiA8YnI+XG4gICAgICogICAgIFRoZSBjbGllbnQgY2FuIGV4cGFuZCBhIGRlZmluaXRpb24gaW4gb3RoZXIgbW9kdWxlLlxuICAgICAqIEBqYSBbW1JFU1VMVF9DT0RFXV0g44Gu44Kq44OV44K744OD44OI5YCkIDxicj5cbiAgICAgKiAgICAg44Ko44Op44O844Kz44O844OJ5a++5b+c44GZ44KL44Oi44K444Ol44O844Or5YaF44GnIOWumue+qeOCkuaLoeW8teOBmeOCiy5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgKiAgICAgIENPTU1PTiAgICAgID0gMCxcbiAgICAgKiAgICAgIFNPTUVNT0RVTEUgID0gMSAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgICogICAgICBTT01FTU9EVUxFMiA9IDIgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgICAqICB9XG4gICAgICpcbiAgICAgKiAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAqICAgICAgRVJST1JfU09NRU1PRFVMRV9VTkVYUEVDVEVEICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLlNPTUVNT0RVTEUsIExPQ0FMX0NPREVfQkFTRS5TT01FTU9EVUxFICsgMSwgXCJlcnJvciB1bmV4cGVjdGVkLlwiKSxcbiAgICAgKiAgICAgIEVSUk9SX1NPTUVNT0RVTEVfSU5WQUxJRF9BUkcgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5TT01FTU9EVUxFLCBMT0NBTF9DT0RFX0JBU0UuU09NRU1PRFVMRSArIDIsIFwiaW52YWxpZCBhcmd1bWVudHMuXCIpLFxuICAgICAqICB9XG4gICAgICogIEFTU0lHTl9SRVNVTFRfQ09ERShSRVNVTFRfQ09ERSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZXhwb3J0IGNvbnN0IGVudW0gUkVTVUxUX0NPREVfQkFTRSB7XG4gICAgICAgIENPTU1PTiA9IDAsXG4gICAgICAgIENEUCA9IDEgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLk1PRFVMRSwgLy8gY2RwIHJlc2VydmVkLiBhYnMoMCDvvZ4gMTAwMClcbi8vICAgICAgTU9EVUxFX0EgPSAxICogUkVTVUxUX0NPREVfUkFOR0UuTUFYLCAgICAvLyBleCkgbW9kdWxlQTogYWJzKDEwMDEg772eIDE5OTkpXG4vLyAgICAgIE1PRFVMRV9CID0gMiAqIFJFU1VMVF9DT0RFX1JBTkdFLk1BWCwgICAgLy8gZXgpIG1vZHVsZUI6IGFicygyMDAxIO+9niAyOTk5KVxuLy8gICAgICBNT0RVTEVfQyA9IDMgKiBSRVNVTFRfQ09ERV9SQU5HRS5NQVgsICAgIC8vIGV4KSBtb2R1bGVDOiBhYnMoMzAwMSDvvZ4gMzk5OSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gS25vd24gQ0RQIG1vZHVsZSBvZmZlc3QgZGVmaW5pdGlvbi5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KLIENEUCDjg6Ljgrjjg6Xjg7zjg6vjga7jgqrjg5Xjgrvjg4Pjg4jlrprnvqlcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAqICAgIEFKQVggPSBDRFBfS05PV05fTU9EVUxFLkFKQVggKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgICAqIH1cbiAgICAgKlxuICAgICAqIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgKiAgIEVSUk9SX0FKQVhfUkVTUE9OU0UgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMSwgJ25ldHdvcmsgZXJyb3IuJyksXG4gICAgICogICBFUlJPUl9BSkFYX1RJTUVPVVQgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQUpBWCArIDIsICdyZXF1ZXN0IHRpbWVvdXQuJyksXG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGV4cG9ydCBjb25zdCBlbnVtIENEUF9LTk9XTl9NT0RVTEUge1xuICAgICAgICAvKiogYEBjZHAvYWpheGAgKi9cbiAgICAgICAgQUpBWCA9IDEsXG4gICAgICAgIC8qKiBgQGNkcC9tb2RlbGAgKi9cbiAgICAgICAgTVZDICA9IDIsXG4gICAgICAgIC8qKiBvZmZzZXQgZm9yIHVua25vd24gbW9kdWxlICovXG4gICAgICAgIE9GRlNFVCxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29tbW9uIHJlc3VsdCBjb2RlIGZvciB0aGUgYXBwbGljYXRpb24uXG4gICAgICogQGphIOOCouODl+ODquOCseODvOOCt+ODp+ODs+WFqOS9k+OBp+S9v+eUqOOBmeOCi+WFsemAmuOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgLyoqIGBlbmAgZ2VuZXJhbCBzdWNjZXNzIGNvZGUgICAgICAgICAgICAgPGJyPiBgamFgIOaxjueUqOaIkOWKn+OCs+ODvOODiSAgICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgU1VDQ0VTUyA9IDAsXG4gICAgICAgIC8qKiBgZW5gIGdlbmVyYWwgY2FuY2VsIGNvZGUgICAgICAgICAgICAgIDxicj4gYGphYCDmsY7nlKjjgq3jg6Pjg7Pjgrvjg6vjgrPjg7zjg4kgICAgICAgICAgICAgICAgICovXG4gICAgICAgIEFCT1JUID0gMSxcbiAgICAgICAgLyoqIGBlbmAgZ2VuZXJhbCBwZW5kaW5nIGNvZGUgICAgICAgICAgICAgPGJyPiBgamFgIOaxjueUqOOCquODmuODrOODvOOCt+ODp+ODs+acquWun+ihjOOCqOODqeODvOOCs+ODvOODiSAqL1xuICAgICAgICBQRU5ESU5HID0gMixcbiAgICAgICAgLyoqIGBlbmAgZ2VuZXJhbCBzdWNjZXNzIGJ1dCBub29wIGNvZGUgICAgPGJyPiBgamFgIOaxjueUqOWun+ihjOS4jeimgeOCs+ODvOODiSAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICBOT09QID0gMyxcbiAgICAgICAgLyoqIGBlbmAgZ2VuZXJhbCBlcnJvciBjb2RlICAgICAgICAgICAgICAgPGJyPiBgamFgIOaxjueUqOOCqOODqeODvOOCs+ODvOODiSAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgIEZBSUwgPSAtMSxcbiAgICAgICAgLyoqIGBlbmAgZ2VuZXJhbCBmYXRhbCBlcnJvciBjb2RlICAgICAgICAgPGJyPiBgamFgIOaxjueUqOiHtOWRveeahOOCqOODqeODvOOCs+ODvOODiSAgICAgICAgICAgICAgICovXG4gICAgICAgIEZBVEFMID0gLTIsXG4gICAgICAgIC8qKiBgZW5gIGdlbmVyYWwgbm90IHN1cHBvcnRlZCBlcnJvciBjb2RlIDxicj4gYGphYCDmsY7nlKjjgqrjg5rjg6zjg7zjgrfjg6fjg7Pjgqjjg6njg7zjgrPjg7zjg4kgICAgICAgKi9cbiAgICAgICAgTk9UX1NVUFBPUlRFRCA9IC0zLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBc3NpZ24gZGVjbGFyZWQgW1tSRVNVTFRfQ09ERV1dIHRvIHJvb3QgZW51bWVyYXRpb24uXG4gICAgICogICAgIChJdCdzIGVuYWJsZSB0byBtZXJnZSBlbnVtIGluIHRoZSBtb2R1bGUgc3lzdGVtIGVudmlyb25tZW50LilcbiAgICAgKiBAamEg5ouh5by144GX44GfIFtbUkVTVUxUX0NPREVdXSDjgpIg44Or44O844OIIGVudW0g44Gr44Ki44K144Kk44OzXG4gICAgICogICAgIOODouOCuOODpeODvOODq+OCt+OCueODhuODoOeSsOWig+OBq+OBiuOBhOOBpuOCguOAgWVudW0g44KS44Oe44O844K444KS5Y+v6IO944Gr44GZ44KLXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIEFTU0lHTl9SRVNVTFRfQ09ERShleHRlbmQ6IG9iamVjdCk6IHZvaWQge1xuICAgICAgICBPYmplY3QuYXNzaWduKFJFU1VMVF9DT0RFLCBleHRlbmQpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBjb25zdCBfY29kZTJtZXNzYWdlOiB7IFtjb2RlOiBzdHJpbmddOiBzdHJpbmc7IH0gPSB7XG4gICAgICAgICcwJzogJ29wZXJhdGlvbiBzdWNjZWVkZWQuJyxcbiAgICAgICAgJzEnOiAnb3BlcmF0aW9uIGFib3J0ZWQuJyxcbiAgICAgICAgJzInOiAnb3BlcmF0aW9uIHBlbmRpbmcuJyxcbiAgICAgICAgJzMnOiAnbm8gb3BlcmF0aW9uLicsXG4gICAgICAgICctMSc6ICdvcGVyYXRpb24gZmFpbGVkLicsXG4gICAgICAgICctMic6ICd1bmV4cGVjdGVkIGVycm9yIG9jY3VyZWQuJyxcbiAgICAgICAgJy0zJzogJ29wZXJhdGlvbiBub3Qgc3VwcG9ydGVkLicsXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gZXJyb3IgbWVzc2FnZSBtYXAuXG4gICAgICogQGphIOOCqOODqeODvOODoeODg+OCu+ODvOOCuOODnuODg+ODl+OBruWPluW+l1xuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIEVSUk9SX01FU1NBR0VfTUFQKCk6IHsgW2NvZGU6IHN0cmluZ106IHN0cmluZzsgfSB7XG4gICAgICAgIHJldHVybiBfY29kZTJtZXNzYWdlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZW5lcmF0ZSBzdWNjZXNzIGNvZGUuXG4gICAgICogQGphIOaIkOWKn+OCs+ODvOODieOCkueUn+aIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGJhc2VcbiAgICAgKiAgLSBgZW5gIHNldCBiYXNlIG9mZnNldCBhcyBbW1JFU1VMVF9DT0RFX0JBU0VdXVxuICAgICAqICAtIGBqYWAg44Kq44OV44K744OD44OI5YCk44KSIFtbUkVTVUxUX0NPREVfQkFTRV1dIOOBqOOBl+OBpuaMh+WumlxuICAgICAqIEBwYXJhbSBjb2RlXG4gICAgICogIC0gYGVuYCBzZXQgbG9jYWwgY29kZSBmb3IgZGVjbGFyYXRpb24uIGV4KSAnMSdcbiAgICAgKiAgLSBgamFgIOWuo+iogOeUqOOBruODreODvOOCq+ODq+OCs+ODvOODieWApOOCkuaMh+WumiAg5L6LKSAnMSdcbiAgICAgKiBAcGFyYW0gbWVzc2FnZVxuICAgICAqICAtIGBlbmAgc2V0IGVycm9yIG1lc3NhZ2UgZm9yIGhlbHAgc3RyaW5nLlxuICAgICAqICAtIGBqYWAg44OY44Or44OX44K544OI44Oq44Oz44Kw55So44Ko44Op44O844Oh44OD44K744O844K444KS5oyH5a6aXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIERFQ0xBUkVfU1VDQ0VTU19DT0RFKGJhc2U6IFJFU1VMVF9DT0RFX0JBU0UsIGNvZGU6IG51bWJlciwgbWVzc2FnZT86IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBkZWNsYXJlUmVzdWx0Q29kZShiYXNlLCBjb2RlLCBtZXNzYWdlLCB0cnVlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2VuZXJhdGUgZXJyb3IgY29kZS5cbiAgICAgKiBAamEg44Ko44Op44O844Kz44O844OJ55Sf5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYmFzZVxuICAgICAqICAtIGBlbmAgc2V0IGJhc2Ugb2Zmc2V0IGFzIFtbUkVTVUxUX0NPREVfQkFTRV1dXG4gICAgICogIC0gYGphYCDjgqrjg5Xjgrvjg4Pjg4jlgKTjgpIgW1tSRVNVTFRfQ09ERV9CQVNFXV0g44Go44GX44Gm5oyH5a6aXG4gICAgICogQHBhcmFtIGNvZGVcbiAgICAgKiAgLSBgZW5gIHNldCBsb2NhbCBjb2RlIGZvciBkZWNsYXJhdGlvbi4gZXgpICcxJ1xuICAgICAqICAtIGBqYWAg5a6j6KiA55So44Gu44Ot44O844Kr44Or44Kz44O844OJ5YCk44KS5oyH5a6aICDkvospICcxJ1xuICAgICAqIEBwYXJhbSBtZXNzYWdlXG4gICAgICogIC0gYGVuYCBzZXQgZXJyb3IgbWVzc2FnZSBmb3IgaGVscCBzdHJpbmcuXG4gICAgICogIC0gYGphYCDjg5jjg6vjg5fjgrnjg4jjg6rjg7PjgrDnlKjjgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrjjgpLmjIflrppcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gREVDTEFSRV9FUlJPUl9DT0RFKGJhc2U6IFJFU1VMVF9DT0RFX0JBU0UsIGNvZGU6IG51bWJlciwgbWVzc2FnZT86IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBkZWNsYXJlUmVzdWx0Q29kZShiYXNlLCBjb2RlLCBtZXNzYWdlLCBmYWxzZSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBzZWN0aW9uOlxuXG4gICAgLyoqIEBpbnRlcm5hbCByZWdpc3RlciBmb3IgW1tSRVNVTFRfQ09ERV1dICovXG4gICAgZnVuY3Rpb24gZGVjbGFyZVJlc3VsdENvZGUoYmFzZTogUkVTVUxUX0NPREVfQkFTRSwgY29kZTogbnVtYmVyLCBtZXNzYWdlOiBzdHJpbmcgfCB1bmRlZmluZWQsIHN1Y2NlZWRlZDogYm9vbGVhbik6IG51bWJlciB8IG5ldmVyIHtcbiAgICAgICAgaWYgKGNvZGUgPCAwIHx8IFJFU1VMVF9DT0RFX1JBTkdFLk1BWCA8PSBjb2RlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgZGVjbGFyZVJlc3VsdENvZGUoKSwgaW52YWxpZCBsb2NhbC1jb2RlIHJhbmdlLiBbY29kZTogJHtjb2RlfV1gKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzaWduZWQgPSBzdWNjZWVkZWQgPyAxIDogLTE7XG4gICAgICAgIGNvbnN0IHJlc3VsdENvZGUgPSBzaWduZWQgKiAoYmFzZSBhcyBudW1iZXIgKyBjb2RlKTtcbiAgICAgICAgX2NvZGUybWVzc2FnZVtyZXN1bHRDb2RlXSA9IG1lc3NhZ2UgPyBtZXNzYWdlIDogKGBbQ09ERTogJHtyZXN1bHRDb2RlfV1gKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdENvZGU7XG4gICAgfVxufVxuIiwiaW1wb3J0IFJFU1VMVF9DT0RFICAgICAgICAgICAgICA9IENEUF9ERUNMQVJFLlJFU1VMVF9DT0RFO1xuaW1wb3J0IFJFU1VMVF9DT0RFX0JBU0UgICAgICAgICA9IENEUF9ERUNMQVJFLlJFU1VMVF9DT0RFX0JBU0U7XG5pbXBvcnQgUkVTVUxUX0NPREVfUkFOR0UgICAgICAgID0gQ0RQX0RFQ0xBUkUuUkVTVUxUX0NPREVfUkFOR0U7XG5pbXBvcnQgTE9DQUxfQ09ERV9SQU5HRV9HVUlERSAgID0gQ0RQX0RFQ0xBUkUuTE9DQUxfQ09ERV9SQU5HRV9HVUlERTtcbmltcG9ydCBERUNMQVJFX1NVQ0NFU1NfQ09ERSAgICAgPSBDRFBfREVDTEFSRS5ERUNMQVJFX1NVQ0NFU1NfQ09ERTtcbmltcG9ydCBERUNMQVJFX0VSUk9SX0NPREUgICAgICAgPSBDRFBfREVDTEFSRS5ERUNMQVJFX0VSUk9SX0NPREU7XG5pbXBvcnQgQVNTSUdOX1JFU1VMVF9DT0RFICAgICAgID0gQ0RQX0RFQ0xBUkUuQVNTSUdOX1JFU1VMVF9DT0RFO1xuaW1wb3J0IEVSUk9SX01FU1NBR0VfTUFQICAgICAgICA9IENEUF9ERUNMQVJFLkVSUk9SX01FU1NBR0VfTUFQO1xuXG5jb25zdCBlbnVtIERlc2NyaXB0aW9uIHtcbiAgICBVTktOT1dOX0VSUk9SX05BTUUgPSdVTktOT1dOJyxcbn1cblxuZXhwb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBSRVNVTFRfQ09ERV9CQVNFLFxuICAgIFJFU1VMVF9DT0RFX1JBTkdFLFxuICAgIExPQ0FMX0NPREVfUkFOR0VfR1VJREUsXG4gICAgREVDTEFSRV9TVUNDRVNTX0NPREUsXG4gICAgREVDTEFSRV9FUlJPUl9DT0RFLFxuICAgIEFTU0lHTl9SRVNVTFRfQ09ERSxcbn07XG5cbi8qKlxuICogQGVuIEp1ZGdlIGZhaWwgb3Igbm90LlxuICogQGphIOWkseaVl+WIpOWumlxuICpcbiAqIEBwYXJhbSBjb2RlIFtbUkVTVUxUX0NPREVdXVxuICogQHJldHVybnMgdHJ1ZTogZmFpbCByZXN1bHQgLyBmYWxzZTogc3VjY2VzcyByZXN1bHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIEZBSUxFRChjb2RlOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gY29kZSA8IDA7XG59XG5cbi8qKlxuICogQGVuIEp1ZGdlIHN1Y2Nlc3Mgb3Igbm90LlxuICogQGphIOaIkOWKn+WIpOWumlxuICpcbiAqIEBwYXJhbSBjb2RlIFtbUkVTVUxUX0NPREVdXVxuICogQHJldHVybnMgdHJ1ZTogc3VjY2VzcyByZXN1bHQgLyBmYWxzZTogZmFpbCByZXN1bHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIFNVQ0NFRURFRChjb2RlOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gIUZBSUxFRChjb2RlKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBbW1JFU1VMVF9DT0RFXV0gYG5hbWVgIHN0cmluZyBmcm9tIFtbUkVTVUxUX0NPREVdXS5cbiAqIEBqYSBbW1JFU1VMVF9DT0RFXV0g44KSIFtbUkVTVUxUX0NPREVdXSDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gY29kZSBbW1JFU1VMVF9DT0RFXV1cbiAqIEBwYXJhbSB0YWcgIGN1c3RvbSB0YWcgaWYgbmVlZGVkLlxuICogQHJldHVybnMgbmFtZSBzdHJpbmcgZXgpIFwiW3RhZ11bTk9UX1NVUFBPUlRFRF1cIlxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9OYW1lU3RyaW5nKGNvZGU6IG51bWJlciwgdGFnPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBwcmVmaXggPSB0YWcgPyBgWyR7dGFnfV1gIDogJyc7XG4gICAgaWYgKFJFU1VMVF9DT0RFW2NvZGVdKSB7XG4gICAgICAgIHJldHVybiBgJHtwcmVmaXh9WyR7UkVTVUxUX0NPREVbY29kZV19XWA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGAke3ByZWZpeH1bJHtEZXNjcmlwdGlvbi5VTktOT1dOX0VSUk9SX05BTUV9XWA7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGhlbHAgc3RyaW5nIGZyb20gW1tSRVNVTFRfQ09ERV1dLlxuICogQGphIFtbUkVTVUxUX0NPREVdXSDjgpLjg5jjg6vjg5fjgrnjg4jjg6rjg7PjgrDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gY29kZSBbW1JFU1VMVF9DT0RFXV1cbiAqIEByZXR1cm5zIHJlZ2lzdGVyZWQgaGVscCBzdHJpbmdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvSGVscFN0cmluZyhjb2RlOiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IG1hcCA9IEVSUk9SX01FU1NBR0VfTUFQKCk7XG4gICAgaWYgKG1hcFtjb2RlXSkge1xuICAgICAgICByZXR1cm4gbWFwW2NvZGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBgdW5yZWdpc3RlcmVkIHJlc3VsdCBjb2RlLiBbY29kZTogJHtjb2RlfV1gO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuaW1wb3J0IHtcbiAgICBjbGFzc05hbWUsXG4gICAgaXNOaWwsXG4gICAgaXNTdHJpbmcsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIFJFU1VMVF9DT0RFLFxuICAgIFNVQ0NFRURFRCxcbiAgICBGQUlMRUQsXG4gICAgdG9OYW1lU3RyaW5nLFxuICAgIHRvSGVscFN0cmluZyxcbn0gZnJvbSAnLi9yZXN1bHQtY29kZSc7XG5cbi8qIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2QgKi9cbmNvbnN0IGlzTnVtYmVyID0gTnVtYmVyLmlzRmluaXRlO1xuXG5jb25zdCBlbnVtIFRhZyB7XG4gICAgRVJST1IgID0gJ0Vycm9yJyxcbiAgICBSRVNVTFQgPSAnUmVzdWx0Jyxcbn1cblxuLyoqXG4gKiBAZW4gQSByZXN1bHQgaG9sZGVyIGNsYXNzLiA8YnI+XG4gKiAgICAgRGVyaXZlZCBuYXRpdmUgYEVycm9yYCBjbGFzcy5cbiAqIEBqYSDlh6bnkIbntZDmnpzkvJ3pgZTjgq/jg6njgrkgPGJyPlxuICogICAgIOODjeOCpOODhuOCo+ODliBgRXJyb3JgIOOBrua0vueUn+OCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgUmVzdWx0IGV4dGVuZHMgRXJyb3Ige1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb2RlXG4gICAgICogIC0gYGVuYCByZXN1bHQgY29kZVxuICAgICAqICAtIGBqYWAg57WQ5p6c44Kz44O844OJXG4gICAgICogQHBhcmFtIG1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIHJlc3VsdCBpbmZvIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOe1kOaenOaDheWgseODoeODg+OCu+ODvOOCuFxuICAgICAqIEBwYXJhbSBjYXVzZVxuICAgICAqICAtIGBlbmAgbG93LWxldmVsIGVycm9yIGluZm9ybWF0aW9uXG4gICAgICogIC0gYGphYCDkuIvkvY3jga7jgqjjg6njg7zmg4XloLFcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb2RlPzogbnVtYmVyLCBtZXNzYWdlPzogc3RyaW5nLCBjYXVzZT86IGFueSkge1xuICAgICAgICBjb2RlID0gaXNOaWwoY29kZSkgPyBSRVNVTFRfQ09ERS5TVUNDRVNTIDogaXNOdW1iZXIoY29kZSkgPyBNYXRoLnRydW5jKGNvZGUpIDogUkVTVUxUX0NPREUuRkFJTDtcbiAgICAgICAgc3VwZXIobWVzc2FnZSB8fCB0b0hlbHBTdHJpbmcoY29kZSkpO1xuICAgICAgICBsZXQgdGltZSA9IGlzRXJyb3IoY2F1c2UpID8gKGNhdXNlIGFzIFJlc3VsdCkudGltZSA6IHVuZGVmaW5lZDtcbiAgICAgICAgaXNOdW1iZXIodGltZSBhcyBudW1iZXIpIHx8ICh0aW1lID0gRGF0ZS5ub3coKSk7XG4gICAgICAgIGNvbnN0IGRlc2NyaXB0b3JzOiBQcm9wZXJ0eURlc2NyaXB0b3JNYXAgPSB7XG4gICAgICAgICAgICBjb2RlOiAgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogY29kZSAgfSxcbiAgICAgICAgICAgIGNhdXNlOiB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiBjYXVzZSB9LFxuICAgICAgICAgICAgdGltZTogIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHRpbWUgIH0sXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIGRlc2NyaXB0b3JzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gW1tSRVNVTFRfQ09ERV1dIHZhbHVlLlxuICAgICAqIEBqYSBbW1JFU1VMVF9DT0RFXV0g44Gu5YCkXG4gICAgICovXG4gICAgcmVhZG9ubHkgY29kZSE6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdG9jayBsb3ctbGV2ZWwgZXJyb3IgaW5mb3JtYXRpb24uXG4gICAgICogQGphIOS4i+S9jeOBruOCqOODqeODvOaDheWgseOCkuagvOe0jVxuICAgICAqL1xuICAgIHJlYWRvbmx5IGNhdXNlOiBhbnk7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2VuZXJhdGVkIHRpbWUgaW5mb3JtYXRpb24uXG4gICAgICogQGphIOeUn+aIkOOBleOCjOOBn+aZguWIu+aDheWgsVxuICAgICAqL1xuICAgIHJlYWRvbmx5IHRpbWUhOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2Ugc3VjY2VlZGVkIG9yIG5vdC5cbiAgICAgKiBAamEg5oiQ5Yqf5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzU3VjY2VlZGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gU1VDQ0VFREVEKHRoaXMuY29kZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEp1ZGdlIGZhaWxlZCBvciBub3QuXG4gICAgICogQGphIOWkseaVl+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0ZhaWxlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIEZBSUxFRCh0aGlzLmNvZGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBjYW5jZWxlZCBvciBub3QuXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+OCqOODqeODvOWIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0NhbmNlbGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5jb2RlID09PSBSRVNVTFRfQ09ERS5BQk9SVDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGZvcm1hdHRlZCBbW1JFU1VMVF9DT0RFXV0gbmFtZSBzdHJpbmcuXG4gICAgICogQGphIOODleOCqeODvOODnuODg+ODiOOBleOCjOOBnyBbW1JFU1VMVF9DT0RFXV0g5ZCN5paH5a2X5YiX44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGNvZGVOYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0b05hbWVTdHJpbmcodGhpcy5jb2RlLCB0aGlzLm5hbWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgW1tSRVNVTFRfQ09ERV1dIGhlbHAgc3RyaW5nLlxuICAgICAqIEBqYSBbW1JFU1VMVF9DT0RFXV0g44Gu44OY44Or44OX44K544OI44Oq44Oz44Kw44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGhlbHAoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRvSGVscFN0cmluZyh0aGlzLmNvZGUpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpOiBUYWcuUkVTVUxUIHtcbiAgICAgICAgcmV0dXJuIFRhZy5SRVNVTFQ7XG4gICAgfVxufVxuXG5SZXN1bHQucHJvdG90eXBlLm5hbWUgPSBUYWcuUkVTVUxUO1xuXG4vKiogQGludGVybmEgbFJldHVybnMgYHRydWVgIGlmIGB4YCBpcyBgRXJyb3JgLCBgZmFsc2VgIG90aGVyd2lzZS4gKi9cbmZ1bmN0aW9uIGlzRXJyb3IoeDogdW5rbm93bik6IHggaXMgRXJyb3Ige1xuICAgIHJldHVybiB4IGluc3RhbmNlb2YgRXJyb3IgfHwgY2xhc3NOYW1lKHgpID09PSBUYWcuRVJST1I7XG59XG5cbi8qKiBSZXR1cm5zIGB0cnVlYCBpZiBgeGAgaXMgYFJlc3VsdGAsIGBmYWxzZWAgb3RoZXJ3aXNlLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUmVzdWx0KHg6IHVua25vd24pOiB4IGlzIFJlc3VsdCB7XG4gICAgcmV0dXJuIHggaW5zdGFuY2VvZiBSZXN1bHQgfHwgY2xhc3NOYW1lKHgpID09PSBUYWcuUkVTVUxUO1xufVxuXG4vKipcbiAqIEBlbiBUcmFuc2ZlciBbW1Jlc3VsdF1dIG9iamVjdFxuICogQGphIFtbUmVzdWx0XV0g44Kq44OW44K444Kn44Kv44OI44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b1Jlc3VsdChvOiB1bmtub3duKTogUmVzdWx0IHtcbiAgICBpZiAobyBpbnN0YW5jZW9mIFJlc3VsdCkge1xuICAgICAgICAvKiBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcHJlZmVyLWNvbnN0ICovXG4gICAgICAgIGxldCB7IGNvZGUsIGNhdXNlLCB0aW1lIH0gPSBvO1xuICAgICAgICBjb2RlID0gaXNOaWwoY29kZSkgPyBSRVNVTFRfQ09ERS5TVUNDRVNTIDogaXNOdW1iZXIoY29kZSkgPyBNYXRoLnRydW5jKGNvZGUpIDogUkVTVUxUX0NPREUuRkFJTDtcbiAgICAgICAgaXNOdW1iZXIodGltZSkgfHwgKHRpbWUgPSBEYXRlLm5vdygpKTtcbiAgICAgICAgLy8gRG8gbm90aGluZyBpZiBhbHJlYWR5IGRlZmluZWRcbiAgICAgICAgUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eShvLCAnY29kZScsICB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiBjb2RlICB9KTtcbiAgICAgICAgUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eShvLCAnY2F1c2UnLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiBjYXVzZSB9KTtcbiAgICAgICAgUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eShvLCAndGltZScsICB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB0aW1lICB9KTtcbiAgICAgICAgcmV0dXJuIG87XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZSA9IE9iamVjdChvKSBhcyBSZXN1bHQ7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBpc051bWJlcihlLmNvZGUpID8gZS5jb2RlIDogbyBhcyBhbnk7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBpc1N0cmluZyhlLm1lc3NhZ2UpID8gZS5tZXNzYWdlIDogaXNTdHJpbmcobykgPyBvIDogdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBjYXVzZSA9IGlzRXJyb3IoZS5jYXVzZSkgPyBlLmNhdXNlIDogaXNFcnJvcihvKSA/IG8gOiBpc1N0cmluZyhvKSA/IG5ldyBFcnJvcihvKSA6IG87XG4gICAgICAgIHJldHVybiBuZXcgUmVzdWx0KGNvZGUsIG1lc3NhZ2UsIGNhdXNlKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENyZWF0ZSBbW1Jlc3VsdF1dIGhlbHBlclxuICogQGphIFtbUmVzdWx0XV0g44Kq44OW44K444Kn44Kv44OI5qeL56+J44OY44Or44OR44O8XG4gKlxuICogQHBhcmFtIGNvZGVcbiAqICAtIGBlbmAgcmVzdWx0IGNvZGVcbiAqICAtIGBqYWAg57WQ5p6c44Kz44O844OJXG4gKiBAcGFyYW0gbWVzc2FnZVxuICogIC0gYGVuYCByZXN1bHQgaW5mbyBtZXNzYWdlXG4gKiAgLSBgamFgIOe1kOaenOaDheWgseODoeODg+OCu+ODvOOCuFxuICogQHBhcmFtIGNhdXNlXG4gKiAgLSBgZW5gIGxvdy1sZXZlbCBlcnJvciBpbmZvcm1hdGlvblxuICogIC0gYGphYCDkuIvkvY3jga7jgqjjg6njg7zmg4XloLFcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1ha2VSZXN1bHQoY29kZTogbnVtYmVyLCBtZXNzYWdlPzogc3RyaW5nLCBjYXVzZT86IGFueSk6IFJlc3VsdCB7XG4gICAgcmV0dXJuIG5ldyBSZXN1bHQoY29kZSwgbWVzc2FnZSwgY2F1c2UpO1xufVxuXG4vKipcbiAqIEBlbiBDcmVhdGUgY2FuY2VsZWQgW1tSZXN1bHRdXSBoZWxwZXJcbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vmg4XloLHmoLzntI0gW1tSZXN1bHRdXSDjgqrjg5bjgrjjgqfjgq/jg4jmp4vnr4njg5jjg6vjg5Hjg7xcbiAqXG4gKiBAcGFyYW0gbWVzc2FnZVxuICogIC0gYGVuYCByZXN1bHQgaW5mbyBtZXNzYWdlXG4gKiAgLSBgamFgIOe1kOaenOaDheWgseODoeODg+OCu+ODvOOCuFxuICogQHBhcmFtIGNhdXNlXG4gKiAgLSBgZW5gIGxvdy1sZXZlbCBlcnJvciBpbmZvcm1hdGlvblxuICogIC0gYGphYCDkuIvkvY3jga7jgqjjg6njg7zmg4XloLFcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1ha2VDYW5jZWxlZFJlc3VsdChtZXNzYWdlPzogc3RyaW5nLCBjYXVzZT86IGFueSk6IFJlc3VsdCB7XG4gICAgcmV0dXJuIG5ldyBSZXN1bHQoUkVTVUxUX0NPREUuQUJPUlQsIG1lc3NhZ2UsIGNhdXNlKTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuaW1wb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBLZXlzLFxuICAgIFR5cGVzLFxuICAgIEtleVRvVHlwZSxcbiAgICBkZWVwRXF1YWwsXG4gICAgaXNFbXB0eU9iamVjdCxcbiAgICBmcm9tVHlwZWREYXRhLFxuICAgIGRyb3BVbmRlZmluZWQsXG4gICAgcmVzdG9yZU5pbCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiwgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50LXB1Ymxpc2hlcic7XG5pbXBvcnQge1xuICAgIENhbmNlbGFibGUsXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7XG4gICAgU3RvcmFnZURhdGFUeXBlTGlzdCxcbiAgICBTdG9yYWdlSW5wdXREYXRhVHlwZUxpc3QsXG4gICAgSVN0b3JhZ2VPcHRpb25zLFxuICAgIElTdG9yYWdlRGF0YU9wdGlvbnMsXG4gICAgSVN0b3JhZ2VEYXRhUmV0dXJuVHlwZSxcbiAgICBJU3RvcmFnZUV2ZW50Q2FsbGJhY2ssXG4gICAgSVN0b3JhZ2UsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBNZW1vcnlTdG9yYWdlIEkvTyBvcHRpb25zICovXG5leHBvcnQgdHlwZSBNZW1vcnlTdG9yYWdlT3B0aW9uczxLIGV4dGVuZHMgS2V5czxTdG9yYWdlRGF0YVR5cGVMaXN0Pj4gPSBJU3RvcmFnZURhdGFPcHRpb25zPFN0b3JhZ2VEYXRhVHlwZUxpc3QsIEs+O1xuLyoqIE1lbW9yeVN0b3JhZ2UgcmV0dXJuIHZhbHVlICovXG5leHBvcnQgdHlwZSBNZW1vcnlTdG9yYWdlUmVzdWx0PEsgZXh0ZW5kcyBLZXlzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+PiA9IEtleVRvVHlwZTxTdG9yYWdlRGF0YVR5cGVMaXN0LCBLPjtcbi8qKiBNZW1vcnlTdG9yYWdlIGRhdGEgdHlwZSAqL1xuZXhwb3J0IHR5cGUgTWVtb3J5U3RvcmFnZURhdGFUeXBlcyA9IFR5cGVzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+O1xuLyoqIE1lbW9yeVN0b3JhZ2UgaW5wdXQgZGF0YSB0eXBlICovXG5leHBvcnQgdHlwZSBNZW1vcnlTdG9yYWdlSW5wdXREYXRhVHlwZXMgPSBTdG9yYWdlSW5wdXREYXRhVHlwZUxpc3Q8U3RvcmFnZURhdGFUeXBlTGlzdD47XG4vKiogTWVtb3J5U3RvcmFnZSBldmVudCBjYWxsYmFjayAqL1xuZXhwb3J0IHR5cGUgTWVtb3J5U3RvcmFnZUV2ZW50Q2FsbGJhY2sgPSBJU3RvcmFnZUV2ZW50Q2FsbGJhY2s8U3RvcmFnZURhdGFUeXBlTGlzdD47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBNZW1vcnlTdG9yYWdlRXZlbnQge1xuICAgICdAJzogW3N0cmluZyB8IG51bGwsIFR5cGVzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+IHwgbnVsbCwgVHlwZXM8U3RvcmFnZURhdGFUeXBlTGlzdD4gfCBudWxsXTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1lbW9yeSBzdG9yYWdlIGNsYXNzLiBUaGlzIGNsYXNzIGRvZXNuJ3Qgc3VwcG9ydCBwZXJtYW5lY2lhdGlvbiBkYXRhLlxuICogQGphIOODoeODouODquODvOOCueODiOODrOODvOOCuOOCr+ODqeOCuS4g5pys44Kv44Op44K544Gv44OH44O844K/44Gu5rC457aa5YyW44KS44K144Od44O844OI44GX44Gq44GEXG4gKi9cbmV4cG9ydCBjbGFzcyBNZW1vcnlTdG9yYWdlIGltcGxlbWVudHMgSVN0b3JhZ2Uge1xuXG4gICAgcHJpdmF0ZSByZWFkb25seSBfYnJva2VyID0gbmV3IEV2ZW50QnJva2VyPE1lbW9yeVN0b3JhZ2VFdmVudD4oKTtcbiAgICBwcml2YXRlIF9zdG9yYWdlOiBQbGFpbk9iamVjdCA9IHt9O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSVN0b3JhZ2VcbiAgICAvKipcbiAgICAgKiBAZW4gW1tJU3RvcmFnZV1dIGtpbmQgc2lnbmF0dXJlLlxuICAgICAqIEBqYSBbW0lTdG9yYWdlXV0g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdtZW1vcnknO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4ga2V5LCBvciBudWxsIGlmIHRoZSBnaXZlbiBrZXkgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QuXG4gICAgICogQGphIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWPluW+ly4g5a2Y5Zyo44GX44Gq44GE5aC05ZCI44GvIG51bGwg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBhY2Nlc3Mga2V5XG4gICAgICogIC0gYGphYCDjgqLjgq/jgrvjgrnjgq3jg7xcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgSS9PIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIEkvTyDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgUmV0dXJucyB0aGUgdmFsdWUgd2hpY2ggY29ycmVzcG9uZHMgdG8gYSBrZXkgd2l0aCB0eXBlIGNoYW5nZSBkZXNpZ25hdGVkIGluIGBkYXRhVHlwZWAuXG4gICAgICogIC0gYGphYCBgZGF0YVR5cGVgIOOBp+aMh+WumuOBleOCjOOBn+Wei+WkieaPm+OCkuihjOOBo+OBpiwg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgZ2V0SXRlbTxEIGV4dGVuZHMgVHlwZXM8U3RvcmFnZURhdGFUeXBlTGlzdD4gPSBUeXBlczxTdG9yYWdlRGF0YVR5cGVMaXN0Pj4oXG4gICAgICAgIGtleTogc3RyaW5nLFxuICAgICAgICBvcHRpb25zPzogTWVtb3J5U3RvcmFnZU9wdGlvbnM8bmV2ZXI+XG4gICAgKTogUHJvbWlzZTxJU3RvcmFnZURhdGFSZXR1cm5UeXBlPFN0b3JhZ2VEYXRhVHlwZUxpc3QsIEQ+PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4ga2V5LCBvciBudWxsIGlmIHRoZSBnaXZlbiBrZXkgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QuXG4gICAgICogQGphIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWPluW+ly4g5a2Y5Zyo44GX44Gq44GE5aC05ZCI44GvIG51bGwg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBhY2Nlc3Mga2V5XG4gICAgICogIC0gYGphYCDjgqLjgq/jgrvjgrnjgq3jg7xcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgSS9PIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIEkvTyDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgUmV0dXJucyB0aGUgdmFsdWUgd2hpY2ggY29ycmVzcG9uZHMgdG8gYSBrZXkgd2l0aCB0eXBlIGNoYW5nZSBkZXNpZ25hdGVkIGluIGBkYXRhVHlwZWAuXG4gICAgICogIC0gYGphYCBgZGF0YVR5cGVgIOOBp+aMh+WumuOBleOCjOOBn+Wei+WkieaPm+OCkuihjOOBo+OBpiwg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgZ2V0SXRlbTxLIGV4dGVuZHMgS2V5czxTdG9yYWdlRGF0YVR5cGVMaXN0Pj4oXG4gICAgICAgIGtleTogc3RyaW5nLFxuICAgICAgICBvcHRpb25zPzogTWVtb3J5U3RvcmFnZU9wdGlvbnM8Sz5cbiAgICApOiBQcm9taXNlPE1lbW9yeVN0b3JhZ2VSZXN1bHQ8Sz4gfCBudWxsPjtcblxuICAgIGFzeW5jIGdldEl0ZW0oa2V5OiBzdHJpbmcsIG9wdGlvbnM/OiBNZW1vcnlTdG9yYWdlT3B0aW9uczxhbnk+KTogUHJvbWlzZTxUeXBlczxTdG9yYWdlRGF0YVR5cGVMaXN0PiB8IG51bGw+IHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGF3YWl0IGNjKG9wdGlvbnMuY2FuY2VsKTtcblxuICAgICAgICAvLyBgdW5kZWZpbmVkYCDihpIgYG51bGxgXG4gICAgICAgIGNvbnN0IHZhbHVlID0gZHJvcFVuZGVmaW5lZCh0aGlzLl9zdG9yYWdlW2tleV0pO1xuICAgICAgICBzd2l0Y2ggKG9wdGlvbnMuZGF0YVR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZyb21UeXBlZERhdGEodmFsdWUpIGFzIHN0cmluZztcbiAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIE51bWJlcihyZXN0b3JlTmlsKHZhbHVlKSk7XG4gICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gQm9vbGVhbihyZXN0b3JlTmlsKHZhbHVlKSk7XG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBPYmplY3QocmVzdG9yZU5pbCh2YWx1ZSkpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdG9yZU5pbCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0cyB0aGUgdmFsdWUgb2YgdGhlIHBhaXIgaWRlbnRpZmllZCBieSBrZXkgdG8gdmFsdWUsIGNyZWF0aW5nIGEgbmV3IGtleS92YWx1ZSBwYWlyIGlmIG5vbmUgZXhpc3RlZCBmb3Iga2V5IHByZXZpb3VzbHkuXG4gICAgICogQGphIOOCreODvOOCkuaMh+WumuOBl+OBpuWApOOCkuioreWumi4g5a2Y5Zyo44GX44Gq44GE5aC05ZCI44Gv5paw6KaP44Gr5L2c5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBhY2Nlc3Mga2V5XG4gICAgICogIC0gYGphYCDjgqLjgq/jgrvjgrnjgq3jg7xcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgSS9PIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIEkvTyDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBzZXRJdGVtPFYgZXh0ZW5kcyBNZW1vcnlTdG9yYWdlSW5wdXREYXRhVHlwZXM+KGtleTogc3RyaW5nLCB2YWx1ZTogViwgb3B0aW9ucz86IE1lbW9yeVN0b3JhZ2VPcHRpb25zPG5ldmVyPik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgYXdhaXQgY2Mob3B0aW9ucy5jYW5jZWwpO1xuICAgICAgICBjb25zdCBuZXdWYWwgPSBkcm9wVW5kZWZpbmVkKHZhbHVlLCB0cnVlKTsgICAgICAgICAvLyBgbnVsbGAgb3IgYHVuZGVmaW5lZGAg4oaSICdudWxsJyBvciAndW5kZWZpbmVkJ1xuICAgICAgICBjb25zdCBvbGRWYWwgPSBkcm9wVW5kZWZpbmVkKHRoaXMuX3N0b3JhZ2Vba2V5XSk7ICAvLyBgdW5kZWZpbmVkYCDihpIgYG51bGxgXG4gICAgICAgIGlmICghZGVlcEVxdWFsKG9sZFZhbCwgbmV3VmFsKSkge1xuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZVtrZXldID0gbmV3VmFsO1xuICAgICAgICAgICAgIW9wdGlvbnMuc2lsZW50ICYmIHRoaXMuX2Jyb2tlci5wdWJsaXNoKCdAJywga2V5LCBuZXdWYWwsIG9sZFZhbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlcyB0aGUga2V5L3ZhbHVlIHBhaXIgd2l0aCB0aGUgZ2l2ZW4ga2V5IGZyb20gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QsIGlmIGEga2V5L3ZhbHVlIHBhaXIgd2l0aCB0aGUgZ2l2ZW4ga2V5IGV4aXN0cy5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44Gf44Kt44O844Gr5a++5b+c44GZ44KL5YCk44GM5a2Y5Zyo44GZ44KM44Gw5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyByZW1vdmVJdGVtKGtleTogc3RyaW5nLCBvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zLmNhbmNlbCk7XG4gICAgICAgIGNvbnN0IG9sZFZhbCA9IHRoaXMuX3N0b3JhZ2Vba2V5XTtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gb2xkVmFsKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fc3RvcmFnZVtrZXldO1xuICAgICAgICAgICAgIW9wdGlvbnMuc2lsZW50ICYmIHRoaXMuX2Jyb2tlci5wdWJsaXNoKCdAJywga2V5LCBudWxsLCBvbGRWYWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEVtcHRpZXMgdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3Qgb2YgYWxsIGtleS92YWx1ZSBwYWlycywgaWYgdGhlcmUgYXJlIGFueS5cbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBjbGVhcihvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zLmNhbmNlbCk7XG4gICAgICAgIGlmICghaXNFbXB0eU9iamVjdCh0aGlzLl9zdG9yYWdlKSkge1xuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZSA9IHt9O1xuICAgICAgICAgICAgIW9wdGlvbnMuc2lsZW50ICYmIHRoaXMuX2Jyb2tlci5wdWJsaXNoKCdAJywgbnVsbCwgbnVsbCwgbnVsbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbGwgZW50cnkga2V5cy5cbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kt44O85LiA6Kan44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY2FuY2VsIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODq+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIGtleXMob3B0aW9ucz86IENhbmNlbGFibGUpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgICAgIGF3YWl0IGNjKG9wdGlvbnMgJiYgb3B0aW9ucy5jYW5jZWwpO1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fc3RvcmFnZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb24obGlzdGVuZXI6IE1lbW9yeVN0b3JhZ2VFdmVudENhbGxiYWNrKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Jyb2tlci5vbignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmKGxpc3RlbmVyPzogTWVtb3J5U3RvcmFnZUV2ZW50Q2FsbGJhY2spOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYnJva2VyLm9mZignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG59XG5cbi8vIGRlZmF1bHQgc3RvcmFnZVxuZXhwb3J0IGNvbnN0IG1lbW9yeVN0b3JhZ2UgPSBuZXcgTWVtb3J5U3RvcmFnZSgpO1xuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5pbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIHBvc3QsXG4gICAgZGVlcEVxdWFsLFxuICAgIGRlZXBDb3B5LFxuICAgIGRyb3BVbmRlZmluZWQsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnQtcHVibGlzaGVyJztcbmltcG9ydCB7XG4gICAgSVN0b3JhZ2UsXG4gICAgSVN0b3JhZ2VPcHRpb25zLFxuICAgIElTdG9yYWdlRm9ybWF0T3B0aW9ucyxcbiAgICBSZWdpc3RyeVNjaGVtYUJhc2UsXG4gICAgUmVnaXN0cnlFdmVudCxcbiAgICBSZWdpc3RyeVJlYWRPcHRpb25zLFxuICAgIFJlZ2lzdHJ5V3JpdGVPcHRpb25zLFxuICAgIFJlZ2lzdHJ5U2F2ZU9wdGlvbnMsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQGVuIFJlZ2lzdHJ5IG1hbmFnZW1lbnQgY2xhc3MgZm9yIHN5bmNocm9ub3VzIFJlYWQvV3JpdGUgYWNjZXNzaWJsZSBmcm9tIGFueSBbW0lTdG9yYWdlXV0gb2JqZWN0LlxuICogQGphIOS7u+aEj+OBriBbW0lTdG9yYWdlXV0g44Kq44OW44K444Kn44Kv44OI44GL44KJ5ZCM5pyfIFJlYWQvV3JpdGUg44Ki44Kv44K744K55Y+v6IO944Gq44Os44K444K544OI44Oq566h55CG44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAvLyAxLiBkZWZpbmUgcmVnaXN0cnkgc2NoZW1hXG4gKiBpbnRlcmZhY2UgU2NoZW1hIGV4dGVuZHMgUmVnaXN0cnlTY2hlbWFCYXNlIHtcbiAqICAgICdjb21tb24vbW9kZSc6ICdub3JtYWwnIHwgJ3NwZWNpZmllZCc7XG4gKiAgICAnY29tbW9uL3ZhbHVlJzogbnVtYmVyO1xuICogICAgJ3RyYWRlL2xvY2FsJzogeyB1bml0OiAn5YaGJyB8ICckJzsgcmF0ZTogbnVtYmVyOyB9O1xuICogICAgJ3RyYWRlL2NoZWNrJzogYm9vbGVhbjtcbiAqICAgICdleHRyYS91c2VyJzogc3RyaW5nO1xuICogfVxuICpcbiAqIC8vIDIuIHByZXBhcmUgSVN0b3JhZ2UgaW5zdGFuY2VcbiAqIC8vIGV4XG4gKiBpbXBvcnQgeyB3ZWJTdG9yYWdlIH0gZnJvbSAnQGNkcC93ZWItc3RvcmFnZSc7XG4gKlxuICogLy8gMy4gaW5zdGFudGlhdGUgdGhpcyBjbGFzc1xuICogY29uc3QgcmVnID0gbmV3IFJlZ2lzdHJ5PFNjaGVtYT4od2ViU3RvcmFnZSwgJ0B0ZXN0Jyk7XG4gKlxuICogLy8gNC4gcmVhZCBleGFtcGxlXG4gKiBjb25zdCB2YWwgPSByZWcucmVhZCgnY29tbW9uL21vZGUnKTsgLy8gJ25vcm1hbCcgfCAnc3BlY2lmaWVkJyB8IG51bGxcbiAqXG4gKiAvLyA1LiB3cml0ZSBleGFtcGxlXG4gKiByZWcud3JpdGUoJ2NvbW1vbi9tb2RlJywgJ3NwZWNpZmllZCcpO1xuICogLy8gcmVnLndyaXRlKCdjb21tb24vbW9kZScsICdob2dlJyk7IC8vIGNvbXBpbGUgZXJyb3JcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgUmVnaXN0cnk8VCBleHRlbmRzIFJlZ2lzdHJ5U2NoZW1hQmFzZSA9IGFueT4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxSZWdpc3RyeUV2ZW50PFQ+PiB7XG5cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdG9yYWdlOiBJU3RvcmFnZTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yb290S2V5OiBzdHJpbmc7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfZGVmYXVsdE9wdGlvbnM6IElTdG9yYWdlRm9ybWF0T3B0aW9ucztcbiAgICBwcml2YXRlIF9zdG9yZTogUGxhaW5PYmplY3QgPSB7fTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RvcmFnZVxuICAgICAqICAtIGBlbmAgUm9vdCBrZXkgZm9yIFtbSVN0b3JhZ2VdXS5cbiAgICAgKiAgLSBgamFgIFtbSVN0b3JhZ2VdXSDjgavkvb/nlKjjgZnjgovjg6vjg7zjg4jjgq3jg7xcbiAgICAgKiBAcGFyYW0gcm9vdEtleVxuICAgICAqICAtIGBlbmAgUm9vdCBrZXkgZm9yIFtbSVN0b3JhZ2VdXS5cbiAgICAgKiAgLSBgamFgIFtbSVN0b3JhZ2VdXSDjgavkvb/nlKjjgZnjgovjg6vjg7zjg4jjgq3jg7xcbiAgICAgKiBAcGFyYW0gZm9ybWF0U3BhY2VcbiAgICAgKiAgLSBgZW5gIGZvciBKU09OIGZvcm1hdCBzcGFjZS5cbiAgICAgKiAgLSBgamFgIEpTT04g44OV44Kp44O844Oe44OD44OI44K544Oa44O844K544KS5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3RvcmFnZTogSVN0b3JhZ2U8YW55Piwgcm9vdEtleTogc3RyaW5nLCBmb3JtYXRTcGFjZT86IG51bWJlcikge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9zdG9yYWdlID0gc3RvcmFnZTtcbiAgICAgICAgdGhpcy5fcm9vdEtleSA9IHJvb3RLZXk7XG4gICAgICAgIHRoaXMuX2RlZmF1bHRPcHRpb25zID0geyBqc29uU3BhY2U6IGZvcm1hdFNwYWNlIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byByb290IGtleS5cbiAgICAgKiBAamEg44Or44O844OI44Kt44O844KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHJvb3RLZXkoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Jvb3RLZXk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBbW0lTdG9yYWdlXV0gb2JqZWN0LlxuICAgICAqIEBqYSBbW0lTdG9yYWdlXV0g44Kq44OW44K444Kn44Kv44OI44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHN0b3JhZ2UoKTogSVN0b3JhZ2U8YW55PiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlYWQgcGVyc2lzdGVuY2UgZGF0YSBmcm9tIFtbSVN0b3JhZ2VdXS4gVGhlIGRhdGEgbG9hZGVkIGFscmVhZHkgd2lsbCBiZSBjbGVhcmVkLlxuICAgICAqIEBqYSBbW0lTdG9yYWdlXV0g44GL44KJ5rC457aa5YyW44GX44Gf44OH44O844K/44KS6Kqt44G/6L6844G/LiDjgZnjgafjgavjgq3jg6Pjg4Pjgrfjg6XjgZXjgozjgabjgYTjgovjg4fjg7zjgr/jga/noLTmo4TjgZXjgozjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgbG9hZChvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICB0aGlzLl9zdG9yZSA9IChhd2FpdCB0aGlzLl9zdG9yYWdlLmdldEl0ZW0odGhpcy5fcm9vdEtleSwgb3B0aW9ucykpIHx8IHt9O1xuICAgICAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgICAgICBwb3N0KCgpID0+IHRoaXMucHVibGlzaCgnY2hhbmdlJywgJyonKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUGVyc2lzdCBkYXRhIHRvIFtbSVN0b3JhZ2VdXS5cbiAgICAgKiBAamEgW1tJU3RvcmFnZV1dIOOBq+ODh+ODvOOCv+OCkuawuOe2muWMllxuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBzYXZlKG9wdGlvbnM/OiBSZWdpc3RyeVNhdmVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IG9wdHM6IFJlZ2lzdHJ5U2F2ZU9wdGlvbnMgPSB7IC4uLnRoaXMuX2RlZmF1bHRPcHRpb25zLCAuLi5vcHRpb25zIH07XG4gICAgICAgIGlmICghb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnd2lsbC1zYXZlJyk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5fc3RvcmFnZS5zZXRJdGVtKHRoaXMuX3Jvb3RLZXksIHRoaXMuX3N0b3JlLCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVhZCByZWdpc3RyeSB2YWx1ZS5cbiAgICAgKiBAamEg44Os44K444K544OI44Oq5YCk44Gu6Kqt44G/5Y+W44KKXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgcmVnaXN0cnkga2V5LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Os44K444K544OI44Oq44Kt44O844KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlYWQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZWFkPEsgZXh0ZW5kcyBrZXlvZiBUPihrZXk6IEssIG9wdGlvbnM/OiBSZWdpc3RyeVJlYWRPcHRpb25zKTogVFtLXSB8IG51bGwge1xuICAgICAgICBjb25zdCB7IGZpZWxkIH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBjb25zdCBzdHJ1Y3R1cmUgPSBTdHJpbmcoa2V5KS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBsYXN0S2V5ID0gc3RydWN0dXJlLnBvcCgpIGFzIHN0cmluZztcblxuICAgICAgICBsZXQgbmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBsZXQgcmVnID0gdGhpcy50YXJnZXRSb290KGZpZWxkKTtcblxuICAgICAgICB3aGlsZSAobmFtZSA9IHN0cnVjdHVyZS5zaGlmdCgpKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uZC1hc3NpZ25cbiAgICAgICAgICAgIGlmICghKG5hbWUgaW4gcmVnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVnID0gcmVnW25hbWVdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcmV0dXJuIGRlZXAgY29weVxuICAgICAgICByZXR1cm4gKG51bGwgIT0gcmVnW2xhc3RLZXldKSA/IGRlZXBDb3B5KHJlZ1tsYXN0S2V5XSkgOiBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBXcml0ZSByZWdpc3RyeSB2YWx1ZS5cbiAgICAgKiBAamEg44Os44K444K544OI44Oq5YCk44Gu5pu444GN6L6844G/XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgcmVnaXN0cnkga2V5LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Os44K444K544OI44Oq44Kt44O844KS5oyH5a6aXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB1cGRhdGUgdmFsdWUuIGlmIGBudWxsYCBzZXQgdG8gZGVsZXRlLlxuICAgICAqICAtIGBqYWAg5pu05paw44GZ44KL5YCkLiBgbnVsbGAg44Gv5YmK6ZmkXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHdyaXRlIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDmm7jjgY3ovrzjgb/jgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgd3JpdGU8SyBleHRlbmRzIGtleW9mIFQ+KGtleTogSywgdmFsdWU6IFRbS10gfCBudWxsLCBvcHRpb25zPzogUmVnaXN0cnlXcml0ZU9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBmaWVsZCwgbm9TYXZlLCBzaWxlbnQgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGNvbnN0IHJlbW92ZSA9IChudWxsID09IHZhbHVlKTtcbiAgICAgICAgY29uc3Qgc3RydWN0dXJlID0gU3RyaW5nKGtleSkuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbGFzdEtleSA9IHN0cnVjdHVyZS5wb3AoKSBhcyBzdHJpbmc7XG5cbiAgICAgICAgbGV0IG5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgbGV0IHJlZyA9IHRoaXMudGFyZ2V0Um9vdChmaWVsZCk7XG5cbiAgICAgICAgd2hpbGUgKG5hbWUgPSBzdHJ1Y3R1cmUuc2hpZnQoKSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbmQtYXNzaWduXG4gICAgICAgICAgICBpZiAobmFtZSBpbiByZWcpIHtcbiAgICAgICAgICAgICAgICByZWcgPSByZWdbbmFtZV07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlbW92ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjsgLy8g44GZ44Gn44Gr6Kaq44Kt44O844GM44Gq44GE44Gf44KB5L2V44KC44GX44Gq44GEXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlZyA9IHJlZ1tuYW1lXSA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbmV3VmFsID0gcmVtb3ZlID8gbnVsbCA6IHZhbHVlO1xuICAgICAgICBjb25zdCBvbGRWYWwgPSBkcm9wVW5kZWZpbmVkKHJlZ1tsYXN0S2V5XSk7XG4gICAgICAgIGlmIChkZWVwRXF1YWwob2xkVmFsLCBuZXdWYWwpKSB7XG4gICAgICAgICAgICByZXR1cm47IC8vIOabtOaWsOOBquOBl1xuICAgICAgICB9IGVsc2UgaWYgKHJlbW92ZSkge1xuICAgICAgICAgICAgZGVsZXRlIHJlZ1tsYXN0S2V5XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlZ1tsYXN0S2V5XSA9IGRlZXBDb3B5KG5ld1ZhbCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW5vU2F2ZSkge1xuICAgICAgICAgICAgLy8gbm8gZmlyZSBub3RpZmljYXRpb25cbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2Uuc2V0SXRlbSh0aGlzLl9yb290S2V5LCB0aGlzLl9zdG9yZSwgeyAuLi50aGlzLl9kZWZhdWx0T3B0aW9ucywgLi4ub3B0aW9ucyB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBwb3N0KCgpID0+IHRoaXMucHVibGlzaCgnY2hhbmdlJywga2V5LCBuZXdWYWwsIG9sZFZhbCkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlbGV0ZSByZWdpc3RyeSBrZXkuXG4gICAgICogQGphIOODrOOCuOOCueODiOODquOCreODvOOBruWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHJlZ2lzdHJ5IGtleS5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODrOOCuOOCueODiOODquOCreODvOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZWFkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDmm7jjgY3ovrzjgb/jgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVsZXRlPEsgZXh0ZW5kcyBrZXlvZiBUPihrZXk6IEssIG9wdGlvbnM/OiBSZWdpc3RyeVdyaXRlT3B0aW9ucyk6IHZvaWQge1xuICAgICAgICB0aGlzLndyaXRlKGtleSwgbnVsbCwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGFsbCByZWdpc3RyeS5cbiAgICAgKiBAamEg44Os44K444K544OI44Oq44Gu5YWo5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVhZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5pu444GN6L6844G/44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGNsZWFyKG9wdGlvbnM/OiBSZWdpc3RyeVdyaXRlT3B0aW9ucyk6IHZvaWQge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgdGhpcy5fc3RvcmUgPSB7fTtcbiAgICAgICAgdGhpcy5fc3RvcmFnZS5yZW1vdmVJdGVtKHRoaXMuX3Jvb3RLZXksIG9wdGlvbnMpO1xuICAgICAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2NoYW5nZScsIG51bGwsIG51bGwsIG51bGwpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIGdldCByb290IG9iamVjdCAqL1xuICAgIHByaXZhdGUgdGFyZ2V0Um9vdChmaWVsZD86IHN0cmluZyk6IFBsYWluT2JqZWN0IHtcbiAgICAgICAgaWYgKGZpZWxkKSB7XG4gICAgICAgICAgICAvLyBlbnN1cmUgW2ZpZWxkXSBvYmplY3QuXG4gICAgICAgICAgICB0aGlzLl9zdG9yZVtmaWVsZF0gPSB0aGlzLl9zdG9yZVtmaWVsZF0gfHwge307XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmVbZmllbGRdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JlO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgZXNjYXBlSFRNTCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIFRlbXBsYXRlVGFncyxcbiAgICBUZW1wbGF0ZVdyaXRlcixcbiAgICBUZW1wbGF0ZUVzY2FwZXIsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiAoc3RyaW5nIHwgVG9rZW5bXSkgKi9cbnR5cGUgVG9rZW5MaXN0ID0gdW5rbm93bjtcblxuLyoqXG4gKiBAZW4gW1tUZW1wbGF0ZV1dIHRva2VuIHN0cnVjdHVyZS5cbiAqIEBqYSBbW1RlbXBsYXRlXV0gdG9rZW4g5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFRva2VuID0gW3N0cmluZywgc3RyaW5nLCBudW1iZXIsIG51bWJlciwgVG9rZW5MaXN0PywgbnVtYmVyPywgYm9vbGVhbj9dO1xuXG4vKipcbiAqIEBlbiBbW1Rva2VuXV0gYWRkcmVzcyBpZC5cbiAqIEBqYSBbW1Rva2VuXV0g44Ki44OJ44Os44K56K2Y5Yil5a2QXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIFRva2VuQWRkcmVzcyB7XG4gICAgVFlQRSA9IDAsXG4gICAgVkFMVUUsXG4gICAgU1RBUlQsXG4gICAgRU5ELFxuICAgIFRPS0VOX0xJU1QsXG4gICAgVEFHX0lOREVYLFxuICAgIEhBU19OT19TUEFDRSxcbn1cblxuLyoqXG4gKiBAZW4gSW50ZXJuYWwgZGVsaW1pdGVycyBkZWZpbml0aW9uIGZvciBbW1RlbXBsYXRlXV0uIGV4KSBbJ3t7JywnfX0nXSBvciAne3sgfX0nXG4gKiBAamEgW1tUZW1wbGF0ZV1dIOOBruWGhemDqOOBp+S9v+eUqOOBmeOCi+WMuuWIh+OCiuaWh+WtlyBleCkgWyd7eycsJ319J10gb3IgJ3t7IH19J1xuICovXG5leHBvcnQgdHlwZSBEZWxpbWl0ZXJzID0gc3RyaW5nIHwgVGVtcGxhdGVUYWdzO1xuXG5leHBvcnQgY29uc3QgZ2xvYmFsU2V0dGluZ3MgPSB7XG4gICAgdGFnczogWyd7eycsICd9fSddLFxuICAgIGVzY2FwZTogZXNjYXBlSFRNTCxcbn0gYXMge1xuICAgIHRhZ3M6IFRlbXBsYXRlVGFncztcbiAgICBlc2NhcGU6IFRlbXBsYXRlRXNjYXBlcjtcbiAgICB3cml0ZXI6IFRlbXBsYXRlV3JpdGVyO1xufTtcbiIsImltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgZW5zdXJlT2JqZWN0LFxuICAgIGdldEdsb2JhbE5hbWVzcGFjZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFRlbXBsYXRlVGFncyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQGVuIENhY2hlIGxvY2F0aW9uIGluZm9ybWF0aW9uLlxuICogQGphIOOCreODo+ODg+OCt+ODpeODreOCseODvOOCt+ODp+ODs+aDheWgsVxuICovXG5leHBvcnQgY29uc3QgZW51bSBDYWNoZUxvY2F0aW9uIHtcbiAgICBOQU1FU1BBQ0UgPSAnQ0RQX0RFQ0xBUkUnLFxuICAgIFJPT1QgICAgICA9ICdURU1QTEFURV9DQUNIRScsXG59XG5cbi8qKlxuICogQGVuIEJ1aWxkIGNhY2hlIGtleS5cbiAqIEBqYSDjgq3jg6Pjg4Pjgrfjg6Xjgq3jg7zjga7nlJ/miJBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2FjaGVLZXkodGVtcGxhdGU6IHN0cmluZywgdGFnczogVGVtcGxhdGVUYWdzKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7dGVtcGxhdGV9OiR7dGFncy5qb2luKCc6Jyl9YDtcbn1cblxuLyoqXG4gKiBAZW4gQ2xlYXJzIGFsbCBjYWNoZWQgdGVtcGxhdGVzIGluIGNhY2hlIHBvb2wuXG4gKiBAamEg44GZ44G544Gm44Gu44OG44Oz44OX44Os44O844OI44Kt44Oj44OD44K344Ol44KS56C05qOEXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGVhckNhY2hlKCk6IHZvaWQge1xuICAgIGNvbnN0IG5hbWVzcGFjZSA9IGdldEdsb2JhbE5hbWVzcGFjZShDYWNoZUxvY2F0aW9uLk5BTUVTUEFDRSk7XG4gICAgbmFtZXNwYWNlW0NhY2hlTG9jYXRpb24uUk9PVF0gPSB7fTtcbn1cblxuLyoqIGdsb2JhbCBjYWNoZSBwb29sICovXG5leHBvcnQgY29uc3QgY2FjaGUgPSBlbnN1cmVPYmplY3Q8UGxhaW5PYmplY3Q+KG51bGwsIENhY2hlTG9jYXRpb24uTkFNRVNQQUNFLCBDYWNoZUxvY2F0aW9uLlJPT1QpO1xuIiwiaW1wb3J0IHtcbiAgICBpc0FycmF5LFxuICAgIGlzUHJpbWl0aXZlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuZXhwb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaGFzUHJvcGVydHksXG4gICAgZXNjYXBlSFRNTCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqXG4gKiBNb3JlIGNvcnJlY3QgdHlwZW9mIHN0cmluZyBoYW5kbGluZyBhcnJheVxuICogd2hpY2ggbm9ybWFsbHkgcmV0dXJucyB0eXBlb2YgJ29iamVjdCdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHR5cGVTdHJpbmcoc3JjOiB1bmtub3duKTogc3RyaW5nIHtcbiAgICByZXR1cm4gaXNBcnJheShzcmMpID8gJ2FycmF5JyA6IHR5cGVvZiBzcmM7XG59XG5cbi8qKlxuICogRXNjYXBlIGZvciB0ZW1wbGF0ZSdzIGV4cHJlc3Npb24gY2hhcmFjdG9ycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVzY2FwZVRlbXBsYXRlRXhwKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcbiAgICByZXR1cm4gc3JjLnJlcGxhY2UoL1stXFxbXFxde30oKSorPy4sXFxcXFxcXiR8I1xcc10vZywgJ1xcXFwkJicpO1xufVxuXG4vKipcbiAqIFNhZmUgd2F5IG9mIGRldGVjdGluZyB3aGV0aGVyIG9yIG5vdCB0aGUgZ2l2ZW4gdGhpbmcgaXMgYSBwcmltaXRpdmUgYW5kXG4gKiB3aGV0aGVyIGl0IGhhcyB0aGUgZ2l2ZW4gcHJvcGVydHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByaW1pdGl2ZUhhc093blByb3BlcnR5KHNyYzogdW5rbm93biwgcHJvcE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBpc1ByaW1pdGl2ZShzcmMpICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzcmMsIHByb3BOYW1lKTtcbn1cblxuLyoqXG4gKiBDaGVjayB3aGl0ZXNwYWNlIGNoYXJhY3RvciBleGlzdHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1doaXRlc3BhY2Uoc3JjOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gIS9cXFMvLnRlc3Qoc3JjKTtcbn1cbiIsImltcG9ydCB7IFRlbXBsYXRlU2Nhbm5lciB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQSBzaW1wbGUgc3RyaW5nIHNjYW5uZXIgdGhhdCBpcyB1c2VkIGJ5IHRoZSB0ZW1wbGF0ZSBwYXJzZXIgdG8gZmluZFxuICogdG9rZW5zIGluIHRlbXBsYXRlIHN0cmluZ3MuXG4gKi9cbmV4cG9ydCBjbGFzcyBTY2FubmVyIGltcGxlbWVudHMgVGVtcGxhdGVTY2FubmVyIHtcbiAgICBwcml2YXRlIF9zb3VyY2U6IHN0cmluZztcbiAgICBwcml2YXRlIF90YWlsOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBfcG9zOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHNyYzogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZSA9IHRoaXMuX3RhaWwgPSBzcmM7XG4gICAgICAgIHRoaXMuX3BvcyA9IDA7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGN1cnJlbnQgc2Nhbm5pbmcgcG9zaXRpb24uXG4gICAgICovXG4gICAgZ2V0IHBvcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fcG9zO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgc3RyaW5nICBzb3VyY2UuXG4gICAgICovXG4gICAgZ2V0IHNvdXJjZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYHRydWVgIGlmIHRoZSB0YWlsIGlzIGVtcHR5IChlbmQgb2Ygc3RyaW5nKS5cbiAgICAgKi9cbiAgICBnZXQgZW9zKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gJycgPT09IHRoaXMuX3RhaWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJpZXMgdG8gbWF0Y2ggdGhlIGdpdmVuIHJlZ3VsYXIgZXhwcmVzc2lvbiBhdCB0aGUgY3VycmVudCBwb3NpdGlvbi5cbiAgICAgKiBSZXR1cm5zIHRoZSBtYXRjaGVkIHRleHQgaWYgaXQgY2FuIG1hdGNoLCB0aGUgZW1wdHkgc3RyaW5nIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBzY2FuKHJlZ2V4cDogUmVnRXhwKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSByZWdleHAuZXhlYyh0aGlzLl90YWlsKTtcblxuICAgICAgICBpZiAoIW1hdGNoIHx8IDAgIT09IG1hdGNoLmluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzdHJpbmcgPSBtYXRjaFswXTtcblxuICAgICAgICB0aGlzLl90YWlsID0gdGhpcy5fdGFpbC5zdWJzdHJpbmcoc3RyaW5nLmxlbmd0aCk7XG4gICAgICAgIHRoaXMuX3BvcyArPSBzdHJpbmcubGVuZ3RoO1xuXG4gICAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2tpcHMgYWxsIHRleHQgdW50aWwgdGhlIGdpdmVuIHJlZ3VsYXIgZXhwcmVzc2lvbiBjYW4gYmUgbWF0Y2hlZC4gUmV0dXJuc1xuICAgICAqIHRoZSBza2lwcGVkIHN0cmluZywgd2hpY2ggaXMgdGhlIGVudGlyZSB0YWlsIGlmIG5vIG1hdGNoIGNhbiBiZSBtYWRlLlxuICAgICAqL1xuICAgIHNjYW5VbnRpbChyZWdleHA6IFJlZ0V4cCk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5fdGFpbC5zZWFyY2gocmVnZXhwKTtcbiAgICAgICAgbGV0IG1hdGNoOiBzdHJpbmc7XG5cbiAgICAgICAgc3dpdGNoIChpbmRleCkge1xuICAgICAgICAgICAgY2FzZSAtMTpcbiAgICAgICAgICAgICAgICBtYXRjaCA9IHRoaXMuX3RhaWw7XG4gICAgICAgICAgICAgICAgdGhpcy5fdGFpbCA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgIG1hdGNoID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIG1hdGNoID0gdGhpcy5fdGFpbC5zdWJzdHJpbmcoMCwgaW5kZXgpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3RhaWwgPSB0aGlzLl90YWlsLnN1YnN0cmluZyhpbmRleCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9wb3MgKz0gbWF0Y2gubGVuZ3RoO1xuXG4gICAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhcyAqL1xuXG5pbXBvcnQgeyBUZW1wbGF0ZUNvbnRleHQgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGhhc1Byb3BlcnR5LFxuICAgIHByaW1pdGl2ZUhhc093blByb3BlcnR5LFxufSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVuZGVyaW5nIGNvbnRleHQgYnkgd3JhcHBpbmcgYSB2aWV3IG9iamVjdCBhbmRcbiAqIG1haW50YWluaW5nIGEgcmVmZXJlbmNlIHRvIHRoZSBwYXJlbnQgY29udGV4dC5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbnRleHQgaW1wbGVtZW50cyBUZW1wbGF0ZUNvbnRleHQge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3ZpZXc6IFBsYWluT2JqZWN0O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3BhcmVudD86IENvbnRleHQ7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfY2FjaGU6IFBsYWluT2JqZWN0O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3IodmlldzogUGxhaW5PYmplY3QsIHBhcmVudENvbnRleHQ/OiBDb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX3ZpZXcgICA9IHZpZXc7XG4gICAgICAgIHRoaXMuX2NhY2hlICA9IHsgJy4nOiB0aGlzLl92aWV3IH07XG4gICAgICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudENvbnRleHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBWaWV3IHBhcmFtZXRlciBnZXR0ZXIuXG4gICAgICovXG4gICAgZ2V0IHZpZXcoKTogUGxhaW5PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmlldztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IGNvbnRleHQgdXNpbmcgdGhlIGdpdmVuIHZpZXcgd2l0aCB0aGlzIGNvbnRleHRcbiAgICAgKiBhcyB0aGUgcGFyZW50LlxuICAgICAqL1xuICAgIHB1c2godmlldzogUGxhaW5PYmplY3QpOiBDb250ZXh0IHtcbiAgICAgICAgcmV0dXJuIG5ldyBDb250ZXh0KHZpZXcsIHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHZhbHVlIG9mIHRoZSBnaXZlbiBuYW1lIGluIHRoaXMgY29udGV4dCwgdHJhdmVyc2luZ1xuICAgICAqIHVwIHRoZSBjb250ZXh0IGhpZXJhcmNoeSBpZiB0aGUgdmFsdWUgaXMgYWJzZW50IGluIHRoaXMgY29udGV4dCdzIHZpZXcuXG4gICAgICovXG4gICAgbG9va3VwKG5hbWU6IHN0cmluZyk6IGFueSB7XG4gICAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5fY2FjaGU7XG5cbiAgICAgICAgbGV0IHZhbHVlOiBhbnk7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY2FjaGUsIG5hbWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGNhY2hlW25hbWVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGNvbnRleHQ6IENvbnRleHQgfCB1bmRlZmluZWQgPSB0aGlzO1xuICAgICAgICAgICAgbGV0IGludGVybWVkaWF0ZVZhbHVlOiBQbGFpbk9iamVjdDtcbiAgICAgICAgICAgIGxldCBuYW1lczogc3RyaW5nW107XG4gICAgICAgICAgICBsZXQgaW5kZXg6IG51bWJlcjtcbiAgICAgICAgICAgIGxldCBsb29rdXBIaXQgPSBmYWxzZTtcblxuICAgICAgICAgICAgd2hpbGUgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBpZiAoMCA8IG5hbWUuaW5kZXhPZignLicpKSB7XG4gICAgICAgICAgICAgICAgICAgIGludGVybWVkaWF0ZVZhbHVlID0gY29udGV4dC5fdmlldztcbiAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBuYW1lLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ID0gMDtcblxuICAgICAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgICAgICogVXNpbmcgdGhlIGRvdCBub3Rpb24gcGF0aCBpbiBgbmFtZWAsIHdlIGRlc2NlbmQgdGhyb3VnaCB0aGVcbiAgICAgICAgICAgICAgICAgICAgICogbmVzdGVkIG9iamVjdHMuXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIFRvIGJlIGNlcnRhaW4gdGhhdCB0aGUgbG9va3VwIGhhcyBiZWVuIHN1Y2Nlc3NmdWwsIHdlIGhhdmUgdG9cbiAgICAgICAgICAgICAgICAgICAgICogY2hlY2sgaWYgdGhlIGxhc3Qgb2JqZWN0IGluIHRoZSBwYXRoIGFjdHVhbGx5IGhhcyB0aGUgcHJvcGVydHlcbiAgICAgICAgICAgICAgICAgICAgICogd2UgYXJlIGxvb2tpbmcgZm9yLiBXZSBzdG9yZSB0aGUgcmVzdWx0IGluIGBsb29rdXBIaXRgLlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBUaGlzIGlzIHNwZWNpYWxseSBuZWNlc3NhcnkgZm9yIHdoZW4gdGhlIHZhbHVlIGhhcyBiZWVuIHNldCB0b1xuICAgICAgICAgICAgICAgICAgICAgKiBgdW5kZWZpbmVkYCBhbmQgd2Ugd2FudCB0byBhdm9pZCBsb29raW5nIHVwIHBhcmVudCBjb250ZXh0cy5cbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogSW4gdGhlIGNhc2Ugd2hlcmUgZG90IG5vdGF0aW9uIGlzIHVzZWQsIHdlIGNvbnNpZGVyIHRoZSBsb29rdXBcbiAgICAgICAgICAgICAgICAgICAgICogdG8gYmUgc3VjY2Vzc2Z1bCBldmVuIGlmIHRoZSBsYXN0IFwib2JqZWN0XCIgaW4gdGhlIHBhdGggaXNcbiAgICAgICAgICAgICAgICAgICAgICogbm90IGFjdHVhbGx5IGFuIG9iamVjdCBidXQgYSBwcmltaXRpdmUgKGUuZy4sIGEgc3RyaW5nLCBvciBhblxuICAgICAgICAgICAgICAgICAgICAgKiBpbnRlZ2VyKSwgYmVjYXVzZSBpdCBpcyBzb21ldGltZXMgdXNlZnVsIHRvIGFjY2VzcyBhIHByb3BlcnR5XG4gICAgICAgICAgICAgICAgICAgICAqIG9mIGFuIGF1dG9ib3hlZCBwcmltaXRpdmUsIHN1Y2ggYXMgdGhlIGxlbmd0aCBvZiBhIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgICAgICoqL1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAobnVsbCAhPSBpbnRlcm1lZGlhdGVWYWx1ZSAmJiBpbmRleCA8IG5hbWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSBuYW1lcy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9va3VwSGl0ID0gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNQcm9wZXJ0eShpbnRlcm1lZGlhdGVWYWx1ZSwgbmFtZXNbaW5kZXhdKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmltaXRpdmVIYXNPd25Qcm9wZXJ0eShpbnRlcm1lZGlhdGVWYWx1ZSwgbmFtZXNbaW5kZXhdKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGVWYWx1ZSA9IGludGVybWVkaWF0ZVZhbHVlW25hbWVzW2luZGV4KytdXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGludGVybWVkaWF0ZVZhbHVlID0gY29udGV4dC5fdmlld1tuYW1lXTtcblxuICAgICAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgICAgICogT25seSBjaGVja2luZyBhZ2FpbnN0IGBoYXNQcm9wZXJ0eWAsIHdoaWNoIGFsd2F5cyByZXR1cm5zIGBmYWxzZWAgaWZcbiAgICAgICAgICAgICAgICAgICAgICogYGNvbnRleHQudmlld2AgaXMgbm90IGFuIG9iamVjdC4gRGVsaWJlcmF0ZWx5IG9taXR0aW5nIHRoZSBjaGVja1xuICAgICAgICAgICAgICAgICAgICAgKiBhZ2FpbnN0IGBwcmltaXRpdmVIYXNPd25Qcm9wZXJ0eWAgaWYgZG90IG5vdGF0aW9uIGlzIG5vdCB1c2VkLlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBDb25zaWRlciB0aGlzIGV4YW1wbGU6XG4gICAgICAgICAgICAgICAgICAgICAqIGBgYFxuICAgICAgICAgICAgICAgICAgICAgKiBNdXN0YWNoZS5yZW5kZXIoXCJUaGUgbGVuZ3RoIG9mIGEgZm9vdGJhbGwgZmllbGQgaXMge3sjbGVuZ3RofX17e2xlbmd0aH19e3svbGVuZ3RofX0uXCIsIHtsZW5ndGg6IFwiMTAwIHlhcmRzXCJ9KVxuICAgICAgICAgICAgICAgICAgICAgKiBgYGBcbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogSWYgd2Ugd2VyZSB0byBjaGVjayBhbHNvIGFnYWluc3QgYHByaW1pdGl2ZUhhc093blByb3BlcnR5YCwgYXMgd2UgZG9cbiAgICAgICAgICAgICAgICAgICAgICogaW4gdGhlIGRvdCBub3RhdGlvbiBjYXNlLCB0aGVuIHJlbmRlciBjYWxsIHdvdWxkIHJldHVybjpcbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogXCJUaGUgbGVuZ3RoIG9mIGEgZm9vdGJhbGwgZmllbGQgaXMgOS5cIlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiByYXRoZXIgdGhhbiB0aGUgZXhwZWN0ZWQ6XG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIFwiVGhlIGxlbmd0aCBvZiBhIGZvb3RiYWxsIGZpZWxkIGlzIDEwMCB5YXJkcy5cIlxuICAgICAgICAgICAgICAgICAgICAgKiovXG4gICAgICAgICAgICAgICAgICAgIGxvb2t1cEhpdCA9IGhhc1Byb3BlcnR5KGNvbnRleHQuX3ZpZXcsIG5hbWUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChsb29rdXBIaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBpbnRlcm1lZGlhdGVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29udGV4dCA9IGNvbnRleHQuX3BhcmVudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FjaGVbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5jYWxsKHRoaXMuX3ZpZXcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgVG9rZW4sXG4gICAgVG9rZW5BZGRyZXNzIGFzICQsXG4gICAgRGVsaW1pdGVycyxcbiAgICBnbG9iYWxTZXR0aW5ncyxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQge1xuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgaXNXaGl0ZXNwYWNlLFxuICAgIGVzY2FwZVRlbXBsYXRlRXhwLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IFNjYW5uZXIgfSBmcm9tICcuL3NjYW5uZXInO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcmVnZXhwID0ge1xuICAgIHdoaXRlOiAvXFxzKi8sXG4gICAgc3BhY2U6IC9cXHMrLyxcbiAgICBlcXVhbHM6IC9cXHMqPS8sXG4gICAgY3VybHk6IC9cXHMqXFx9LyxcbiAgICB0YWc6IC8jfFxcXnxcXC98PnxcXHt8Jnw9fCEvLFxufTtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIENvbWJpbmVzIHRoZSB2YWx1ZXMgb2YgY29uc2VjdXRpdmUgdGV4dCB0b2tlbnMgaW4gdGhlIGdpdmVuIGB0b2tlbnNgIGFycmF5IHRvIGEgc2luZ2xlIHRva2VuLlxuICovXG5mdW5jdGlvbiBzcXVhc2hUb2tlbnModG9rZW5zOiBUb2tlbltdKTogVG9rZW5bXSB7XG4gICAgY29uc3Qgc3F1YXNoZWRUb2tlbnM6IFRva2VuW10gPSBbXTtcblxuICAgIGxldCBsYXN0VG9rZW4hOiBUb2tlbjtcbiAgICBmb3IgKGNvbnN0IHRva2VuIG9mIHRva2Vucykge1xuICAgICAgICBpZiAodG9rZW4pIHtcbiAgICAgICAgICAgIGlmICgndGV4dCcgPT09IHRva2VuWyQuVFlQRV0gJiYgbGFzdFRva2VuICYmICd0ZXh0JyA9PT0gbGFzdFRva2VuWyQuVFlQRV0pIHtcbiAgICAgICAgICAgICAgICBsYXN0VG9rZW5bJC5WQUxVRV0gKz0gdG9rZW5bJC5WQUxVRV07XG4gICAgICAgICAgICAgICAgbGFzdFRva2VuWyQuRU5EXSA9IHRva2VuWyQuRU5EXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3F1YXNoZWRUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgbGFzdFRva2VuID0gdG9rZW47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3F1YXNoZWRUb2tlbnM7XG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBGb3JtcyB0aGUgZ2l2ZW4gYXJyYXkgb2YgYHRva2Vuc2AgaW50byBhIG5lc3RlZCB0cmVlIHN0cnVjdHVyZSB3aGVyZVxuICogdG9rZW5zIHRoYXQgcmVwcmVzZW50IGEgc2VjdGlvbiBoYXZlIHR3byBhZGRpdGlvbmFsIGl0ZW1zOiAxKSBhbiBhcnJheSBvZlxuICogYWxsIHRva2VucyB0aGF0IGFwcGVhciBpbiB0aGF0IHNlY3Rpb24gYW5kIDIpIHRoZSBpbmRleCBpbiB0aGUgb3JpZ2luYWxcbiAqIHRlbXBsYXRlIHRoYXQgcmVwcmVzZW50cyB0aGUgZW5kIG9mIHRoYXQgc2VjdGlvbi5cbiAqL1xuZnVuY3Rpb24gbmVzdFRva2Vucyh0b2tlbnM6IFRva2VuW10pOiBUb2tlbltdIHtcbiAgICBjb25zdCBuZXN0ZWRUb2tlbnM6IFRva2VuW10gPSBbXTtcbiAgICBsZXQgY29sbGVjdG9yID0gbmVzdGVkVG9rZW5zO1xuICAgIGNvbnN0IHNlY3Rpb25zOiBUb2tlbltdID0gW107XG5cbiAgICBsZXQgc2VjdGlvbiE6IFRva2VuO1xuICAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgICAgIHN3aXRjaCAodG9rZW5bJC5UWVBFXSkge1xuICAgICAgICAgICAgY2FzZSAnIyc6XG4gICAgICAgICAgICBjYXNlICdeJzpcbiAgICAgICAgICAgICAgICBjb2xsZWN0b3IucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgc2VjdGlvbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yID0gdG9rZW5bJC5UT0tFTl9MSVNUXSA9IFtdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnLyc6XG4gICAgICAgICAgICAgICAgc2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpIGFzIFRva2VuO1xuICAgICAgICAgICAgICAgIHNlY3Rpb25bJC5UQUdfSU5ERVhdID0gdG9rZW5bJC5TVEFSVF07XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yID0gc2VjdGlvbnMubGVuZ3RoID4gMCA/IHNlY3Rpb25zW3NlY3Rpb25zLmxlbmd0aCAtIDFdWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSA6IG5lc3RlZFRva2VucztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXN0ZWRUb2tlbnM7XG59XG5cbi8qKlxuICogQnJlYWtzIHVwIHRoZSBnaXZlbiBgdGVtcGxhdGVgIHN0cmluZyBpbnRvIGEgdHJlZSBvZiB0b2tlbnMuIElmIHRoZSBgdGFnc2BcbiAqIGFyZ3VtZW50IGlzIGdpdmVuIGhlcmUgaXQgbXVzdCBiZSBhbiBhcnJheSB3aXRoIHR3byBzdHJpbmcgdmFsdWVzOiB0aGVcbiAqIG9wZW5pbmcgYW5kIGNsb3NpbmcgdGFncyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSAoZS5nLiBbIFwiPCVcIiwgXCIlPlwiIF0pLiBPZlxuICogY291cnNlLCB0aGUgZGVmYXVsdCBpcyB0byB1c2UgbXVzdGFjaGVzIChpLmUuIG11c3RhY2hlLnRhZ3MpLlxuICpcbiAqIEEgdG9rZW4gaXMgYW4gYXJyYXkgd2l0aCBhdCBsZWFzdCA0IGVsZW1lbnRzLiBUaGUgZmlyc3QgZWxlbWVudCBpcyB0aGVcbiAqIG11c3RhY2hlIHN5bWJvbCB0aGF0IHdhcyB1c2VkIGluc2lkZSB0aGUgdGFnLCBlLmcuIFwiI1wiIG9yIFwiJlwiLiBJZiB0aGUgdGFnXG4gKiBkaWQgbm90IGNvbnRhaW4gYSBzeW1ib2wgKGkuZS4ge3tteVZhbHVlfX0pIHRoaXMgZWxlbWVudCBpcyBcIm5hbWVcIi4gRm9yXG4gKiBhbGwgdGV4dCB0aGF0IGFwcGVhcnMgb3V0c2lkZSBhIHN5bWJvbCB0aGlzIGVsZW1lbnQgaXMgXCJ0ZXh0XCIuXG4gKlxuICogVGhlIHNlY29uZCBlbGVtZW50IG9mIGEgdG9rZW4gaXMgaXRzIFwidmFsdWVcIi4gRm9yIG11c3RhY2hlIHRhZ3MgdGhpcyBpc1xuICogd2hhdGV2ZXIgZWxzZSB3YXMgaW5zaWRlIHRoZSB0YWcgYmVzaWRlcyB0aGUgb3BlbmluZyBzeW1ib2wuIEZvciB0ZXh0IHRva2Vuc1xuICogdGhpcyBpcyB0aGUgdGV4dCBpdHNlbGYuXG4gKlxuICogVGhlIHRoaXJkIGFuZCBmb3VydGggZWxlbWVudHMgb2YgdGhlIHRva2VuIGFyZSB0aGUgc3RhcnQgYW5kIGVuZCBpbmRpY2VzLFxuICogcmVzcGVjdGl2ZWx5LCBvZiB0aGUgdG9rZW4gaW4gdGhlIG9yaWdpbmFsIHRlbXBsYXRlLlxuICpcbiAqIFRva2VucyB0aGF0IGFyZSB0aGUgcm9vdCBub2RlIG9mIGEgc3VidHJlZSBjb250YWluIHR3byBtb3JlIGVsZW1lbnRzOiAxKSBhblxuICogYXJyYXkgb2YgdG9rZW5zIGluIHRoZSBzdWJ0cmVlIGFuZCAyKSB0aGUgaW5kZXggaW4gdGhlIG9yaWdpbmFsIHRlbXBsYXRlIGF0XG4gKiB3aGljaCB0aGUgY2xvc2luZyB0YWcgZm9yIHRoYXQgc2VjdGlvbiBiZWdpbnMuXG4gKlxuICogVG9rZW5zIGZvciBwYXJ0aWFscyBhbHNvIGNvbnRhaW4gdHdvIG1vcmUgZWxlbWVudHM6IDEpIGEgc3RyaW5nIHZhbHVlIG9mXG4gKiBpbmRlbmRhdGlvbiBwcmlvciB0byB0aGF0IHRhZyBhbmQgMikgdGhlIGluZGV4IG9mIHRoYXQgdGFnIG9uIHRoYXQgbGluZSAtXG4gKiBlZyBhIHZhbHVlIG9mIDIgaW5kaWNhdGVzIHRoZSBwYXJ0aWFsIGlzIHRoZSB0aGlyZCB0YWcgb24gdGhpcyBsaW5lLlxuICpcbiAqIEBwYXJhbSB0ZW1wbGF0ZSB0ZW1wbGF0ZSBzdHJpbmdcbiAqIEBwYXJhbSB0YWdzIGRlbGltaXRlcnMgZXgpIFsne3snLCd9fSddIG9yICd7eyB9fSdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVGVtcGxhdGUodGVtcGxhdGU6IHN0cmluZywgdGFncz86IERlbGltaXRlcnMpOiBUb2tlbltdIHtcbiAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBsZXQgbGluZUhhc05vblNwYWNlICAgICA9IGZhbHNlO1xuICAgIGNvbnN0IHNlY3Rpb25zOiBUb2tlbltdID0gW107ICAgICAgIC8vIFN0YWNrIHRvIGhvbGQgc2VjdGlvbiB0b2tlbnNcbiAgICBjb25zdCB0b2tlbnM6IFRva2VuW10gICA9IFtdOyAgICAgICAvLyBCdWZmZXIgdG8gaG9sZCB0aGUgdG9rZW5zXG4gICAgY29uc3Qgc3BhY2VzOiBudW1iZXJbXSAgPSBbXTsgICAgICAgLy8gSW5kaWNlcyBvZiB3aGl0ZXNwYWNlIHRva2VucyBvbiB0aGUgY3VycmVudCBsaW5lXG4gICAgbGV0IGhhc1RhZyAgICAgICAgICAgICAgPSBmYWxzZTsgICAgLy8gSXMgdGhlcmUgYSB7e3RhZ319IG9uIHRoZSBjdXJyZW50IGxpbmU/XG4gICAgbGV0IG5vblNwYWNlICAgICAgICAgICAgPSBmYWxzZTsgICAgLy8gSXMgdGhlcmUgYSBub24tc3BhY2UgY2hhciBvbiB0aGUgY3VycmVudCBsaW5lP1xuICAgIGxldCBpbmRlbnRhdGlvbiAgICAgICAgID0gJyc7ICAgICAgIC8vIFRyYWNrcyBpbmRlbnRhdGlvbiBmb3IgdGFncyB0aGF0IHVzZSBpdFxuICAgIGxldCB0YWdJbmRleCAgICAgICAgICAgID0gMDsgICAgICAgIC8vIFN0b3JlcyBhIGNvdW50IG9mIG51bWJlciBvZiB0YWdzIGVuY291bnRlcmVkIG9uIGEgbGluZVxuXG4gICAgLy8gU3RyaXBzIGFsbCB3aGl0ZXNwYWNlIHRva2VucyBhcnJheSBmb3IgdGhlIGN1cnJlbnQgbGluZVxuICAgIC8vIGlmIHRoZXJlIHdhcyBhIHt7I3RhZ319IG9uIGl0IGFuZCBvdGhlcndpc2Ugb25seSBzcGFjZS5cbiAgICBjb25zdCBzdHJpcFNwYWNlID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICBpZiAoaGFzVGFnICYmICFub25TcGFjZSkge1xuICAgICAgICAgICAgd2hpbGUgKHNwYWNlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdG9rZW5zW3NwYWNlcy5wb3AoKSBhcyBudW1iZXJdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3BhY2VzLmxlbmd0aCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaGFzVGFnID0gZmFsc2U7XG4gICAgICAgIG5vblNwYWNlID0gZmFsc2U7XG4gICAgfTtcblxuICAgIGNvbnN0IGNvbXBpbGVUYWdzID0gKHRhZ3NUb0NvbXBpbGU6IHN0cmluZyB8IHN0cmluZ1tdKTogeyBvcGVuaW5nVGFnOiBSZWdFeHA7IGNsb3NpbmdUYWc6IFJlZ0V4cDsgY2xvc2luZ0N1cmx5OiBSZWdFeHA7IH0gPT4ge1xuICAgICAgICBjb25zdCBlbnVtIFRhZyB7XG4gICAgICAgICAgICBPUEVOID0gMCxcbiAgICAgICAgICAgIENMT1NFLFxuICAgICAgICB9XG4gICAgICAgIGlmIChpc1N0cmluZyh0YWdzVG9Db21waWxlKSkge1xuICAgICAgICAgICAgdGFnc1RvQ29tcGlsZSA9IHRhZ3NUb0NvbXBpbGUuc3BsaXQoX3JlZ2V4cC5zcGFjZSwgMik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWlzQXJyYXkodGFnc1RvQ29tcGlsZSkgfHwgMiAhPT0gdGFnc1RvQ29tcGlsZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCB0YWdzOiAke0pTT04uc3RyaW5naWZ5KHRhZ3NUb0NvbXBpbGUpfWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcGVuaW5nVGFnOiAgIG5ldyBSZWdFeHAoYCR7ZXNjYXBlVGVtcGxhdGVFeHAodGFnc1RvQ29tcGlsZVtUYWcuT1BFTl0pfVxcXFxzKmApLFxuICAgICAgICAgICAgY2xvc2luZ1RhZzogICBuZXcgUmVnRXhwKGBcXFxccyoke2VzY2FwZVRlbXBsYXRlRXhwKHRhZ3NUb0NvbXBpbGVbVGFnLkNMT1NFXSl9YCksXG4gICAgICAgICAgICBjbG9zaW5nQ3VybHk6IG5ldyBSZWdFeHAoYFxcXFxzKiR7ZXNjYXBlVGVtcGxhdGVFeHAoYH0ke3RhZ3NUb0NvbXBpbGVbVGFnLkNMT1NFXX1gKX1gKSxcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgY29uc3QgeyB0YWc6IHJlVGFnLCB3aGl0ZTogcmVXaGl0ZSwgZXF1YWxzOiByZUVxdWFscywgY3VybHk6IHJlQ3VybHkgfSA9IF9yZWdleHA7XG4gICAgbGV0IF9yZWd4cFRhZ3MgPSBjb21waWxlVGFncyh0YWdzIHx8IGdsb2JhbFNldHRpbmdzLnRhZ3MpO1xuXG4gICAgY29uc3Qgc2Nhbm5lciA9IG5ldyBTY2FubmVyKHRlbXBsYXRlKTtcblxuICAgIGxldCBvcGVuU2VjdGlvbjogVG9rZW4gfCB1bmRlZmluZWQ7XG4gICAgd2hpbGUgKCFzY2FubmVyLmVvcykge1xuICAgICAgICBjb25zdCB7IG9wZW5pbmdUYWc6IHJlT3BlbmluZ1RhZywgY2xvc2luZ1RhZzogcmVDbG9zaW5nVGFnLCBjbG9zaW5nQ3VybHk6IHJlQ2xvc2luZ0N1cmx5IH0gPSBfcmVneHBUYWdzO1xuICAgICAgICBsZXQgdG9rZW46IFRva2VuO1xuICAgICAgICBsZXQgc3RhcnQgPSBzY2FubmVyLnBvcztcbiAgICAgICAgLy8gTWF0Y2ggYW55IHRleHQgYmV0d2VlbiB0YWdzLlxuICAgICAgICBsZXQgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChyZU9wZW5pbmdUYWcpO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCB2YWx1ZUxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgaSA8IHZhbHVlTGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaHIgPSB2YWx1ZS5jaGFyQXQoaSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNocikpIHtcbiAgICAgICAgICAgICAgICAgICAgc3BhY2VzLnB1c2godG9rZW5zLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uICs9IGNocjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBub25TcGFjZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVIYXNOb25TcGFjZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uICs9ICcgJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0b2tlbnMucHVzaChbJ3RleHQnLCBjaHIsIHN0YXJ0LCBzdGFydCArIDFdKTtcbiAgICAgICAgICAgICAgICBzdGFydCArPSAxO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHdoaXRlc3BhY2Ugb24gdGhlIGN1cnJlbnQgbGluZS5cbiAgICAgICAgICAgICAgICBpZiAoJ1xcbicgPT09IGNocikge1xuICAgICAgICAgICAgICAgICAgICBzdHJpcFNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIHRhZ0luZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgbGluZUhhc05vblNwYWNlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWF0Y2ggdGhlIG9wZW5pbmcgdGFnLlxuICAgICAgICBpZiAoIXNjYW5uZXIuc2NhbihyZU9wZW5pbmdUYWcpKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGhhc1RhZyA9IHRydWU7XG5cbiAgICAgICAgLy8gR2V0IHRoZSB0YWcgdHlwZS5cbiAgICAgICAgbGV0IHR5cGUgPSBzY2FubmVyLnNjYW4ocmVUYWcpIHx8ICduYW1lJztcbiAgICAgICAgc2Nhbm5lci5zY2FuKHJlV2hpdGUpO1xuXG4gICAgICAgIC8vIEdldCB0aGUgdGFnIHZhbHVlLlxuICAgICAgICBpZiAoJz0nID09PSB0eXBlKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHNjYW5uZXIuc2NhblVudGlsKHJlRXF1YWxzKTtcbiAgICAgICAgICAgIHNjYW5uZXIuc2NhbihyZUVxdWFscyk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdUYWcpO1xuICAgICAgICB9IGVsc2UgaWYgKCd7JyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdDdXJseSk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW4ocmVDdXJseSk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdUYWcpO1xuICAgICAgICAgICAgdHlwZSA9ICcmJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwocmVDbG9zaW5nVGFnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hdGNoIHRoZSBjbG9zaW5nIHRhZy5cbiAgICAgICAgaWYgKCFzY2FubmVyLnNjYW4ocmVDbG9zaW5nVGFnKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmNsb3NlZCB0YWcgYXQgJHtzY2FubmVyLnBvc31gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgnPicgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIHRva2VuID0gW3R5cGUsIHZhbHVlLCBzdGFydCwgc2Nhbm5lci5wb3MsIGluZGVudGF0aW9uLCB0YWdJbmRleCwgbGluZUhhc05vblNwYWNlXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRva2VuID0gW3R5cGUsIHZhbHVlLCBzdGFydCwgc2Nhbm5lci5wb3NdO1xuICAgICAgICB9XG4gICAgICAgIHRhZ0luZGV4Kys7XG4gICAgICAgIHRva2Vucy5wdXNoKHRva2VuKTtcblxuICAgICAgICBpZiAoJyMnID09PSB0eXBlIHx8ICdeJyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgc2VjdGlvbnMucHVzaCh0b2tlbik7XG4gICAgICAgIH0gZWxzZSBpZiAoJy8nID09PSB0eXBlKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBzZWN0aW9uIG5lc3RpbmcuXG4gICAgICAgICAgICBvcGVuU2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpO1xuICAgICAgICAgICAgaWYgKCFvcGVuU2VjdGlvbikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5vcGVuZWQgc2VjdGlvbiBcIiR7dmFsdWV9XCIgYXQgJHtzdGFydH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcGVuU2VjdGlvblsxXSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuY2xvc2VkIHNlY3Rpb24gXCIke29wZW5TZWN0aW9uWyQuVkFMVUVdfVwiIGF0ICR7c3RhcnR9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoJ25hbWUnID09PSB0eXBlIHx8ICd7JyA9PT0gdHlwZSB8fCAnJicgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIG5vblNwYWNlID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICgnPScgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIC8vIFNldCB0aGUgdGFncyBmb3IgdGhlIG5leHQgdGltZSBhcm91bmQuXG4gICAgICAgICAgICBfcmVneHBUYWdzID0gY29tcGlsZVRhZ3ModmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RyaXBTcGFjZSgpO1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoZXJlIGFyZSBubyBvcGVuIHNlY3Rpb25zIHdoZW4gd2UncmUgZG9uZS5cbiAgICBvcGVuU2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpO1xuXG4gICAgaWYgKG9wZW5TZWN0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5jbG9zZWQgc2VjdGlvbiBcIiR7b3BlblNlY3Rpb25bJC5WQUxVRV19XCIgYXQgJHtzY2FubmVyLnBvc31gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmVzdFRva2VucyhzcXVhc2hUb2tlbnModG9rZW5zKSk7XG59XG4iLCJpbXBvcnQgeyBUZW1wbGF0ZVRhZ3MsIFRlbXBsYXRlV3JpdGVyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgVG9rZW4sXG4gICAgVG9rZW5BZGRyZXNzIGFzICQsXG4gICAgZ2xvYmFsU2V0dGluZ3MsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHsgY2FjaGUsIGJ1aWxkQ2FjaGVLZXkgfSBmcm9tICcuL2NhY2hlJztcbmltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IHBhcnNlVGVtcGxhdGUgfSBmcm9tICcuL3BhcnNlJztcbmltcG9ydCB7IENvbnRleHQgfSBmcm9tICcuL2NvbnRleHQnO1xuXG4vKipcbiAqIEEgV3JpdGVyIGtub3dzIGhvdyB0byB0YWtlIGEgc3RyZWFtIG9mIHRva2VucyBhbmQgcmVuZGVyIHRoZW0gdG8gYVxuICogc3RyaW5nLCBnaXZlbiBhIGNvbnRleHQuIEl0IGFsc28gbWFpbnRhaW5zIGEgY2FjaGUgb2YgdGVtcGxhdGVzIHRvXG4gKiBhdm9pZCB0aGUgbmVlZCB0byBwYXJzZSB0aGUgc2FtZSB0ZW1wbGF0ZSB0d2ljZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFdyaXRlciBpbXBsZW1lbnRzIFRlbXBsYXRlV3JpdGVyIHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIGFuZCBjYWNoZXMgdGhlIGdpdmVuIGB0ZW1wbGF0ZWAgYWNjb3JkaW5nIHRvIHRoZSBnaXZlbiBgdGFnc2Agb3JcbiAgICAgKiBgbXVzdGFjaGUudGFnc2AgaWYgYHRhZ3NgIGlzIG9taXR0ZWQsICBhbmQgcmV0dXJucyB0aGUgYXJyYXkgb2YgdG9rZW5zXG4gICAgICogdGhhdCBpcyBnZW5lcmF0ZWQgZnJvbSB0aGUgcGFyc2UuXG4gICAgICovXG4gICAgcGFyc2UodGVtcGxhdGU6IHN0cmluZywgdGFncz86IFRlbXBsYXRlVGFncyk6IHsgdG9rZW5zOiBUb2tlbltdOyBjYWNoZUtleTogc3RyaW5nOyB9IHtcbiAgICAgICAgY29uc3QgY2FjaGVLZXkgPSBidWlsZENhY2hlS2V5KHRlbXBsYXRlLCB0YWdzIHx8IGdsb2JhbFNldHRpbmdzLnRhZ3MpO1xuICAgICAgICBsZXQgdG9rZW5zID0gY2FjaGVbY2FjaGVLZXldO1xuICAgICAgICBpZiAobnVsbCA9PSB0b2tlbnMpIHtcbiAgICAgICAgICAgIHRva2VucyA9IGNhY2hlW2NhY2hlS2V5XSA9IHBhcnNlVGVtcGxhdGUodGVtcGxhdGUsIHRhZ3MpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHRva2VucywgY2FjaGVLZXkgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIaWdoLWxldmVsIG1ldGhvZCB0aGF0IGlzIHVzZWQgdG8gcmVuZGVyIHRoZSBnaXZlbiBgdGVtcGxhdGVgIHdpdGhcbiAgICAgKiB0aGUgZ2l2ZW4gYHZpZXdgLlxuICAgICAqXG4gICAgICogVGhlIG9wdGlvbmFsIGBwYXJ0aWFsc2AgYXJndW1lbnQgbWF5IGJlIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIHRoZVxuICAgICAqIG5hbWVzIGFuZCB0ZW1wbGF0ZXMgb2YgcGFydGlhbHMgdGhhdCBhcmUgdXNlZCBpbiB0aGUgdGVtcGxhdGUuIEl0IG1heVxuICAgICAqIGFsc28gYmUgYSBmdW5jdGlvbiB0aGF0IGlzIHVzZWQgdG8gbG9hZCBwYXJ0aWFsIHRlbXBsYXRlcyBvbiB0aGUgZmx5XG4gICAgICogdGhhdCB0YWtlcyBhIHNpbmdsZSBhcmd1bWVudDogdGhlIG5hbWUgb2YgdGhlIHBhcnRpYWwuXG4gICAgICpcbiAgICAgKiBJZiB0aGUgb3B0aW9uYWwgYHRhZ3NgIGFyZ3VtZW50IGlzIGdpdmVuIGhlcmUgaXQgbXVzdCBiZSBhbiBhcnJheSB3aXRoIHR3b1xuICAgICAqIHN0cmluZyB2YWx1ZXM6IHRoZSBvcGVuaW5nIGFuZCBjbG9zaW5nIHRhZ3MgdXNlZCBpbiB0aGUgdGVtcGxhdGUgKGUuZy5cbiAgICAgKiBbIFwiPCVcIiwgXCIlPlwiIF0pLiBUaGUgZGVmYXVsdCBpcyB0byBtdXN0YWNoZS50YWdzLlxuICAgICAqL1xuICAgIHJlbmRlcih0ZW1wbGF0ZTogc3RyaW5nLCB2aWV3OiBQbGFpbk9iamVjdCwgcGFydGlhbHM/OiBQbGFpbk9iamVjdCwgdGFncz86IFRlbXBsYXRlVGFncyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IHsgdG9rZW5zIH0gPSB0aGlzLnBhcnNlKHRlbXBsYXRlLCB0YWdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyVG9rZW5zKHRva2VucywgdmlldywgcGFydGlhbHMsIHRlbXBsYXRlLCB0YWdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb3ctbGV2ZWwgbWV0aG9kIHRoYXQgcmVuZGVycyB0aGUgZ2l2ZW4gYXJyYXkgb2YgYHRva2Vuc2AgdXNpbmdcbiAgICAgKiB0aGUgZ2l2ZW4gYGNvbnRleHRgIGFuZCBgcGFydGlhbHNgLlxuICAgICAqXG4gICAgICogTm90ZTogVGhlIGBvcmlnaW5hbFRlbXBsYXRlYCBpcyBvbmx5IGV2ZXIgdXNlZCB0byBleHRyYWN0IHRoZSBwb3J0aW9uXG4gICAgICogb2YgdGhlIG9yaWdpbmFsIHRlbXBsYXRlIHRoYXQgd2FzIGNvbnRhaW5lZCBpbiBhIGhpZ2hlci1vcmRlciBzZWN0aW9uLlxuICAgICAqIElmIHRoZSB0ZW1wbGF0ZSBkb2Vzbid0IHVzZSBoaWdoZXItb3JkZXIgc2VjdGlvbnMsIHRoaXMgYXJndW1lbnQgbWF5XG4gICAgICogYmUgb21pdHRlZC5cbiAgICAgKi9cbiAgICByZW5kZXJUb2tlbnModG9rZW5zOiBUb2tlbltdLCB2aWV3OiBQbGFpbk9iamVjdCwgcGFydGlhbHM/OiBQbGFpbk9iamVjdCwgb3JpZ2luYWxUZW1wbGF0ZT86IHN0cmluZywgdGFncz86IFRlbXBsYXRlVGFncyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSAodmlldyBpbnN0YW5jZW9mIENvbnRleHQpID8gdmlldyA6IG5ldyBDb250ZXh0KHZpZXcpO1xuICAgICAgICBsZXQgYnVmZmVyID0gJyc7XG5cbiAgICAgICAgZm9yIChjb25zdCB0b2tlbiBvZiB0b2tlbnMpIHtcbiAgICAgICAgICAgIGxldCB2YWx1ZTogc3RyaW5nIHwgdm9pZDtcbiAgICAgICAgICAgIHN3aXRjaCAodG9rZW5bJC5UWVBFXSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJyMnOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMucmVuZGVyU2VjdGlvbih0b2tlbiwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdeJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnJlbmRlckludmVydGVkKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJz4nOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMucmVuZGVyUGFydGlhbCh0b2tlbiwgY29udGV4dCwgcGFydGlhbHMsIHRhZ3MpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICcmJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnVuZXNjYXBlZFZhbHVlKHRva2VuLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnbmFtZSc6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5lc2NhcGVkVmFsdWUodG9rZW4sIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd0ZXh0JzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnJhd1ZhbHVlKHRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyICs9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZW5kZXJTZWN0aW9uKHRva2VuOiBUb2tlbiwgY29udGV4dDogQ29udGV4dCwgcGFydGlhbHM/OiBQbGFpbk9iamVjdCwgb3JpZ2luYWxUZW1wbGF0ZT86IHN0cmluZyk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgbGV0IGJ1ZmZlciA9ICcnO1xuICAgICAgICBsZXQgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblskLlZBTFVFXSk7XG5cbiAgICAgICAgLy8gVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIHJlbmRlciBhbiBhcmJpdHJhcnkgdGVtcGxhdGVcbiAgICAgICAgLy8gaW4gdGhlIGN1cnJlbnQgY29udGV4dCBieSBoaWdoZXItb3JkZXIgc2VjdGlvbnMuXG4gICAgICAgIGNvbnN0IHN1YlJlbmRlciA9ICh0ZW1wbGF0ZTogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICAgICAgICAgIHJldHVybiBzZWxmLnJlbmRlcih0ZW1wbGF0ZSwgY29udGV4dCwgcGFydGlhbHMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCB2IG9mIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyICs9IHRoaXMucmVuZGVyVG9rZW5zKHRva2VuWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSwgY29udGV4dC5wdXNoKHYpLCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoJ29iamVjdCcgPT09IHR5cGVvZiB2YWx1ZSB8fCAnc3RyaW5nJyA9PT0gdHlwZW9mIHZhbHVlIHx8ICdudW1iZXInID09PSB0eXBlb2YgdmFsdWUpIHtcbiAgICAgICAgICAgIGJ1ZmZlciArPSB0aGlzLnJlbmRlclRva2Vucyh0b2tlblskLlRPS0VOX0xJU1RdIGFzIFRva2VuW10sIGNvbnRleHQucHVzaCh2YWx1ZSksIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAgICAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2Ygb3JpZ2luYWxUZW1wbGF0ZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHVzZSBoaWdoZXItb3JkZXIgc2VjdGlvbnMgd2l0aG91dCB0aGUgb3JpZ2luYWwgdGVtcGxhdGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgdGhlIHBvcnRpb24gb2YgdGhlIG9yaWdpbmFsIHRlbXBsYXRlIHRoYXQgdGhlIHNlY3Rpb24gY29udGFpbnMuXG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLmNhbGwoY29udGV4dC52aWV3LCBvcmlnaW5hbFRlbXBsYXRlLnNsaWNlKHRva2VuWyQuRU5EXSwgdG9rZW5bJC5UQUdfSU5ERVhdKSwgc3ViUmVuZGVyKTtcbiAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyICs9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnVmZmVyICs9IHRoaXMucmVuZGVyVG9rZW5zKHRva2VuWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVuZGVySW52ZXJ0ZWQodG9rZW46IFRva2VuLCBjb250ZXh0OiBDb250ZXh0LCBwYXJ0aWFscz86IFBsYWluT2JqZWN0LCBvcmlnaW5hbFRlbXBsYXRlPzogc3RyaW5nKTogc3RyaW5nIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gY29udGV4dC5sb29rdXAodG9rZW5bJC5WQUxVRV0pO1xuICAgICAgICBpZiAoIXZhbHVlIHx8IChpc0FycmF5KHZhbHVlKSAmJiAwID09PSB2YWx1ZS5sZW5ndGgpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5bJC5UT0tFTl9MSVNUXSBhcyBUb2tlbltdLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBpbmRlbnRQYXJ0aWFsKHBhcnRpYWw6IHN0cmluZywgaW5kZW50YXRpb246IHN0cmluZywgbGluZUhhc05vblNwYWNlOiBib29sZWFuKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgZmlsdGVyZWRJbmRlbnRhdGlvbiA9IGluZGVudGF0aW9uLnJlcGxhY2UoL1teIFxcdF0vZywgJycpO1xuICAgICAgICBjb25zdCBwYXJ0aWFsQnlObCA9IHBhcnRpYWwuc3BsaXQoJ1xcbicpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcnRpYWxCeU5sLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAocGFydGlhbEJ5TmxbaV0ubGVuZ3RoICYmIChpID4gMCB8fCAhbGluZUhhc05vblNwYWNlKSkge1xuICAgICAgICAgICAgICAgIHBhcnRpYWxCeU5sW2ldID0gZmlsdGVyZWRJbmRlbnRhdGlvbiArIHBhcnRpYWxCeU5sW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXJ0aWFsQnlObC5qb2luKCdcXG4nKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZW5kZXJQYXJ0aWFsKHRva2VuOiBUb2tlbiwgY29udGV4dDogQ29udGV4dCwgcGFydGlhbHM6IFBsYWluT2JqZWN0IHwgdW5kZWZpbmVkLCB0YWdzOiBUZW1wbGF0ZVRhZ3MgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB2b2lkIHtcbiAgICAgICAgaWYgKCFwYXJ0aWFscykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdmFsdWUgPSBpc0Z1bmN0aW9uKHBhcnRpYWxzKSA/IHBhcnRpYWxzKHRva2VuWyQuVkFMVUVdKSA6IHBhcnRpYWxzW3Rva2VuWyQuVkFMVUVdXTtcbiAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgIGNvbnN0IGxpbmVIYXNOb25TcGFjZSA9IHRva2VuWyQuSEFTX05PX1NQQUNFXTtcbiAgICAgICAgICAgIGNvbnN0IHRhZ0luZGV4ICAgICAgICA9IHRva2VuWyQuVEFHX0lOREVYXTtcbiAgICAgICAgICAgIGNvbnN0IGluZGVudGF0aW9uICAgICA9IHRva2VuWyQuVE9LRU5fTElTVF07XG4gICAgICAgICAgICBsZXQgaW5kZW50ZWRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgaWYgKDAgPT09IHRhZ0luZGV4ICYmIGluZGVudGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgaW5kZW50ZWRWYWx1ZSA9IHRoaXMuaW5kZW50UGFydGlhbCh2YWx1ZSwgaW5kZW50YXRpb24gYXMgc3RyaW5nLCBsaW5lSGFzTm9uU3BhY2UgYXMgYm9vbGVhbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB7IHRva2VucyB9ID0gdGhpcy5wYXJzZShpbmRlbnRlZFZhbHVlLCB0YWdzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlbmRlclRva2Vucyh0b2tlbnMsIGNvbnRleHQsIHBhcnRpYWxzLCBpbmRlbnRlZFZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVuZXNjYXBlZFZhbHVlKHRva2VuOiBUb2tlbiwgY29udGV4dDogQ29udGV4dCk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWyQuVkFMVUVdKTtcbiAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGVzY2FwZWRWYWx1ZSh0b2tlbjogVG9rZW4sIGNvbnRleHQ6IENvbnRleHQpOiBzdHJpbmcgfCB2b2lkIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblskLlZBTFVFXSk7XG4gICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2xvYmFsU2V0dGluZ3MuZXNjYXBlKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJhd1ZhbHVlKHRva2VuOiBUb2tlbik6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0b2tlblskLlZBTFVFXTtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIEpTVCxcbiAgICBUZW1wbGF0ZVRhZ3MsXG4gICAgSVRlbXBsYXRlLFxuICAgIFRlbXBsYXRlU2Nhbm5lcixcbiAgICBUZW1wbGF0ZUNvbnRleHQsXG4gICAgVGVtcGxhdGVXcml0ZXIsXG4gICAgVGVtcGxhdGVFc2NhcGVyLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgZ2xvYmFsU2V0dGluZ3MgfSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IENhY2hlTG9jYXRpb24sIGNsZWFyQ2FjaGUgfSBmcm9tICcuL2NhY2hlJztcbmltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNTdHJpbmcsXG4gICAgdHlwZVN0cmluZyxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBTY2FubmVyIH0gZnJvbSAnLi9zY2FubmVyJztcbmltcG9ydCB7IENvbnRleHQgfSBmcm9tICcuL2NvbnRleHQnO1xuaW1wb3J0IHsgV3JpdGVyIH0gZnJvbSAnLi93cml0ZXInO1xuXG4vKiogW1tUZW1wbGF0ZV1dIGNvbW1vbiBzZXR0aW5ncyAqL1xuZ2xvYmFsU2V0dGluZ3Mud3JpdGVyID0gbmV3IFdyaXRlcigpO1xuXG4vKipcbiAqIEBlbiBbW1RlbXBsYXRlXV0gZ2xvYmFsIHNldHRuZyBvcHRpb25zXG4gKiBAamEgW1tUZW1wbGF0ZV1dIOOCsOODreODvOODkOODq+ioreWumuOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlR2xvYmFsU2V0dGluZ3Mge1xuICAgIHdyaXRlcj86IFRlbXBsYXRlV3JpdGVyO1xuICAgIHRhZ3M/OiBUZW1wbGF0ZVRhZ3M7XG4gICAgZXNjYXBlPzogVGVtcGxhdGVFc2NhcGVyO1xufVxuXG4vKipcbiAqIEBlbiBbW1RlbXBsYXRlXV0gY29tcGlsZSBvcHRpb25zXG4gKiBAamEgW1tUZW1wbGF0ZV1dIOOCs+ODs+ODkeOCpOODq+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMge1xuICAgIHRhZ3M/OiBUZW1wbGF0ZVRhZ3M7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIHV0aWxpdHkgY2xhc3MuXG4gKiBAamEgVGVtcGxhdGUg44Om44O844OG44Kj44Oq44OG44Kj44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZSBpbXBsZW1lbnRzIElUZW1wbGF0ZSB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IFtbSlNUXV0gZnJvbSB0ZW1wbGF0ZSBzb3VyY2UuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl+OBi+OCiSBbW0pTVF1dIOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhY2thZ2UgdGVtcGxhdGVcbiAgICAgKiAgLSBgZW5gIHRlbXBsYXRlIHNvdXJjZSBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl1xuICAgICAqIEBwYWNrYWdlIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbXBpbGUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44Kz44Oz44OR44Kk44Or44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjb21waWxlKHRlbXBsYXRlOiBzdHJpbmcsIG9wdGlvbnM/OiBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zKTogSlNUIHtcbiAgICAgICAgaWYgKCFpc1N0cmluZyh0ZW1wbGF0ZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEludmFsaWQgdGVtcGxhdGUhIHRoZSBmaXJzdCBhcmd1bWVudCBzaG91bGQgYmUgYSBcInN0cmluZ1wiIGJ1dCBcIiR7dHlwZVN0cmluZyh0ZW1wbGF0ZSl9XCIgd2FzIGdpdmVuIGZvciBUZW1wbGF0ZS5jb21waWxlKHRlbXBsYXRlLCBvcHRpb25zKWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyB0YWdzIH0gPSBvcHRpb25zIHx8IGdsb2JhbFNldHRpbmdzO1xuICAgICAgICBjb25zdCB7IHdyaXRlciB9ID0gZ2xvYmFsU2V0dGluZ3M7XG5cbiAgICAgICAgY29uc3QganN0ID0gKHZpZXc/OiBQbGFpbk9iamVjdCwgcGFydGlhbHM/OiBQbGFpbk9iamVjdCk6IHN0cmluZyA9PiB7XG4gICAgICAgICAgICByZXR1cm4gd3JpdGVyLnJlbmRlcih0ZW1wbGF0ZSwgdmlldyB8fCB7fSwgcGFydGlhbHMsIHRhZ3MpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHsgdG9rZW5zLCBjYWNoZUtleSB9ID0gd3JpdGVyLnBhcnNlKHRlbXBsYXRlLCB0YWdzKTtcbiAgICAgICAganN0LnRva2VucyAgICAgICAgPSB0b2tlbnM7XG4gICAgICAgIGpzdC5jYWNoZUtleSAgICAgID0gY2FjaGVLZXk7XG4gICAgICAgIGpzdC5jYWNoZUxvY2F0aW9uID0gW0NhY2hlTG9jYXRpb24uTkFNRVNQQUNFLCBDYWNoZUxvY2F0aW9uLlJPT1RdO1xuXG4gICAgICAgIHJldHVybiBqc3Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFycyBhbGwgY2FjaGVkIHRlbXBsYXRlcyBpbiB0aGUgZGVmYXVsdCBbW1RlbXBsYXRlV3JpdGVyXV0uXG4gICAgICogQGphIOaXouWumuOBriBbW1RlbXBsYXRlV3JpdGVyXV0g44Gu44GZ44G544Gm44Gu44Kt44Oj44OD44K344Ol44KS5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjbGVhckNhY2hlKCk6IHZvaWQge1xuICAgICAgICBjbGVhckNhY2hlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoYW5nZSBbW1RlbXBsYXRlXV0gZ2xvYmFsIHNldHRpbmdzLlxuICAgICAqIEBqYSBbW1RlbXBsYXRlXV0g44Kw44Ot44O844OQ44Or6Kit5a6a44Gu5pu05pawXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2V0dGluZ3NcbiAgICAgKiAgLSBgZW5gIG5ldyBzZXR0aW5nc1xuICAgICAqICAtIGBqYWAg5paw44GX44GE6Kit5a6a5YCkXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG9sZCBzZXR0aW5nc1xuICAgICAqICAtIGBqYWAg5Y+k44GE6Kit5a6a5YCkXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBzZXRHbG9iYWxTZXR0aW5ncyhzZXRpaW5nczogVGVtcGxhdGVHbG9iYWxTZXR0aW5ncyk6IFRlbXBsYXRlR2xvYmFsU2V0dGluZ3Mge1xuICAgICAgICBjb25zdCBvbGRTZXR0aW5ncyA9IHsgLi4uZ2xvYmFsU2V0dGluZ3MgfTtcbiAgICAgICAgY29uc3QgeyB3cml0ZXIsIHRhZ3MsIGVzY2FwZSB9ID0gc2V0aWluZ3M7XG4gICAgICAgIHdyaXRlciAmJiAoZ2xvYmFsU2V0dGluZ3Mud3JpdGVyID0gd3JpdGVyKTtcbiAgICAgICAgdGFncyAgICYmIChnbG9iYWxTZXR0aW5ncy50YWdzICAgPSB0YWdzKTtcbiAgICAgICAgZXNjYXBlICYmIChnbG9iYWxTZXR0aW5ncy5lc2NhcGUgPSBlc2NhcGUpO1xuICAgICAgICByZXR1cm4gb2xkU2V0dGluZ3M7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIHN0YXRpYyBtZXRob2RzOiBmb3IgZGVidWdcblxuICAgIC8qKiBAaW50ZXJuYWwgQ3JlYXRlIFtbVGVtcGxhdGVTY2FubmVyXV0gaW5zdGFuY2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZVNjYW5uZXIoc3JjOiBzdHJpbmcpOiBUZW1wbGF0ZVNjYW5uZXIge1xuICAgICAgICByZXR1cm4gbmV3IFNjYW5uZXIoc3JjKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIENyZWF0ZSBbW1RlbXBsYXRlQ29udGV4dF1dIGluc3RhbmNlICovXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGVDb250ZXh0KHZpZXc6IFBsYWluT2JqZWN0LCBwYXJlbnRDb250ZXh0PzogQ29udGV4dCk6IFRlbXBsYXRlQ29udGV4dCB7XG4gICAgICAgIHJldHVybiBuZXcgQ29udGV4dCh2aWV3LCBwYXJlbnRDb250ZXh0KTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIENyZWF0ZSBbW1RlbXBsYXRlV3JpdGVyXV0gaW5zdGFuY2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZVdyaXRlcigpOiBUZW1wbGF0ZVdyaXRlciB7XG4gICAgICAgIHJldHVybiBuZXcgV3JpdGVyKCk7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbInNldFRpbWVvdXQiLCJfdG9rZW5zIiwiX3Byb3h5SGFuZGxlciIsImlz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
