/*!
 * @cdp/core-utils 0.9.19
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

export { $cdp, assignValue, at, camelize, capitalize, className, classify, clearInterval, clearTimeout, combination, computeDate, createEscaper, dasherize, debounce, decapitalize, deepCopy, deepEqual, deepMerge, diff, difference, drop, dropUndefined, ensureObject, escapeHTML, every, exists, filter, find, findIndex, fromTypedData, getConfig, getGlobal, getGlobalNamespace, groupBy, has, indices, instanceOf, intersection, invert, isArray, isBigInt, isBoolean, isCancelLikeError, isEmptyObject, isFunction, isIterable, isNullish, isNumber, isNumeric, isObject, isPlainObject, isPrimitive, isStatusIn, isString, isSymbol, isTypedArray, luid, map, mixins, noop, omit, once, ownInstanceOf, permutation, pick, post, randomInt, reduce, restoreNullish, result, safe, sameClass, sameType, sample, scheduler, setInterval, setMixClassAttribute, setTimeout, shuffle, sleep, some, sort, statusAddRef, statusRelease, statusScope, throttle, toTypedData, typeOf, underscored, unescapeHTML, union, unique, verify, without };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS11dGlscy5tanMiLCJzb3VyY2VzIjpbImNvbmZpZy50cyIsInR5cGVzLnRzIiwidmVyaWZ5LnRzIiwiZGVlcC1jaXJjdWl0LnRzIiwibWl4aW5zLnRzIiwib2JqZWN0LnRzIiwic2FmZS50cyIsInRpbWVyLnRzIiwibWlzYy50cyIsImFycmF5LnRzIiwiZGF0ZS50cyIsInN0YXR1cy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdHlwZSB7IFVua25vd25PYmplY3QgfSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBAZW4gU2FmZSBgZ2xvYmFsYCBhY2Nlc3Nvci5cbiAqIEBqYSBgZ2xvYmFsYCDjgqLjgq/jgrvjg4PjgrVcbiAqXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBgZ2xvYmFsYCBvYmplY3Qgb2YgdGhlIHJ1bnRpbWUgZW52aXJvbm1lbnRcbiAqICAtIGBqYWAg55Kw5aKD44Gr5b+c44GY44GfIGBnbG9iYWxgIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2xvYmFsKCk6IHR5cGVvZiBnbG9iYWxUaGlzIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbmV3LWZ1bmMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1pbXBsaWVkLWV2YWxcbiAgICByZXR1cm4gKCdvYmplY3QnID09PSB0eXBlb2YgZ2xvYmFsVGhpcykgPyBnbG9iYWxUaGlzIDogRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcbn1cblxuLyoqXG4gKiBAZW4gRW5zdXJlIG5hbWVkIG9iamVjdCBhcyBwYXJlbnQncyBwcm9wZXJ0eS5cbiAqIEBqYSDopqrjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrprjgZfjgaYsIOWQjeWJjeOBq+aMh+WumuOBl+OBn+OCquODluOCuOOCp+OCr+ODiOOBruWtmOWcqOOCkuS/neiovFxuICpcbiAqIEBwYXJhbSBwYXJlbnRcbiAqICAtIGBlbmAgcGFyZW50IG9iamVjdC4gSWYgbnVsbCBnaXZlbiwgYGdsb2JhbFRoaXNgIGlzIGFzc2lnbmVkLlxuICogIC0gYGphYCDopqrjgqrjg5bjgrjjgqfjgq/jg4guIG51bGwg44Gu5aC05ZCI44GvIGBnbG9iYWxUaGlzYCDjgYzkvb/nlKjjgZXjgozjgotcbiAqIEBwYXJhbSBuYW1lc1xuICogIC0gYGVuYCBvYmplY3QgbmFtZSBjaGFpbiBmb3IgZW5zdXJlIGluc3RhbmNlLlxuICogIC0gYGphYCDkv53oqLzjgZnjgovjgqrjg5bjgrjjgqfjgq/jg4jjga7lkI3liY1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZU9iamVjdDxUIGV4dGVuZHMgb2JqZWN0ID0gVW5rbm93bk9iamVjdD4ocGFyZW50OiBvYmplY3QgfCBudWxsLCAuLi5uYW1lczogc3RyaW5nW10pOiBUIHtcbiAgICBsZXQgcm9vdCA9IChwYXJlbnQgPz8gZ2V0R2xvYmFsKCkpIGFzIFVua25vd25PYmplY3Q7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIG5hbWVzKSB7XG4gICAgICAgIHJvb3RbbmFtZV0gPSByb290W25hbWVdID8/IHt9O1xuICAgICAgICByb290ID0gcm9vdFtuYW1lXSBhcyBVbmtub3duT2JqZWN0O1xuICAgIH1cbiAgICByZXR1cm4gcm9vdCBhcyBUO1xufVxuXG4vKipcbiAqIEBlbiBHbG9iYWwgbmFtZXNwYWNlIGFjY2Vzc29yLlxuICogQGphIOOCsOODreODvOODkOODq+ODjeODvOODoOOCueODmuODvOOCueOCouOCr+OCu+ODg+OCtVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2xvYmFsTmFtZXNwYWNlPFQgZXh0ZW5kcyBvYmplY3QgPSBVbmtub3duT2JqZWN0PihuYW1lc3BhY2U6IHN0cmluZyk6IFQge1xuICAgIHJldHVybiBlbnN1cmVPYmplY3Q8VD4obnVsbCwgbmFtZXNwYWNlKTtcbn1cblxuLyoqXG4gKiBAZW4gR2xvYmFsIGNvbmZpZyBhY2Nlc3Nvci5cbiAqIEBqYSDjgrDjg63jg7zjg5Djg6vjgrPjg7Pjg5XjgqPjgrDjgqLjgq/jgrvjg4PjgrVcbiAqXG4gKiBAcmV0dXJucyBkZWZhdWx0OiBgQ0RQLkNvbmZpZ2BcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbmZpZzxUIGV4dGVuZHMgb2JqZWN0ID0gVW5rbm93bk9iamVjdD4obmFtZXNwYWNlID0gJ0NEUCcsIGNvbmZpZ05hbWUgPSAnQ29uZmlnJyk6IFQge1xuICAgIHJldHVybiBlbnN1cmVPYmplY3Q8VD4oZ2V0R2xvYmFsTmFtZXNwYWNlKG5hbWVzcGFjZSksIGNvbmZpZ05hbWUpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtZnVuY3Rpb24tdHlwZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktb2JqZWN0LXR5cGUsXG4gKi9cblxuLyoqXG4gKiBAZW4gUHJpbWl0aXZlIHR5cGUgb2YgSmF2YVNjcmlwdC5cbiAqIEBqYSBKYXZhU2NyaXB0IOOBruODl+ODquODn+ODhuOCo+ODluWei1xuICovXG5leHBvcnQgdHlwZSBQcmltaXRpdmUgPSBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgc3ltYm9sIHwgYmlnaW50IHwgbnVsbCB8IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBAZW4gVGhlIGdlbmVyYWwgbnVsbCB0eXBlLlxuICogQGphIOepuuOCkuekuuOBmeWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBOdWxsaXNoID0gdm9pZCB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVuIFRoZSB0eXBlIG9mIG9iamVjdCBvciB7QGxpbmsgTnVsbGlzaH0uXG4gKiBAamEge0BsaW5rIE51bGxpc2h9IOOBq+OBquOCiuOBiOOCi+OCquODluOCuOOCp+OCr+ODiOWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBOdWxsYWJsZTxUIGV4dGVuZHMgb2JqZWN0PiA9IFQgfCBOdWxsaXNoO1xuXG4vKipcbiAqIEBlbiBBdm9pZCB0aGUgYEZ1bmN0aW9uYHR5cGVzLlxuICogQGphIOaxjueUqOmWouaVsOWei1xuICovXG5leHBvcnQgdHlwZSBVbmtub3duRnVuY3Rpb24gPSAoLi4uYXJnczogdW5rbm93bltdKSA9PiB1bmtub3duO1xuXG4vKipcbiAqIEBlbiBBdm9pZCB0aGUgYE9iamVjdGAgYW5kIGB7fWAgdHlwZXMsIGFzIHRoZXkgbWVhbiBcImFueSBub24tbnVsbGlzaCB2YWx1ZVwiLlxuICogQGphIOaxjueUqOOCquODluOCuOOCp+OCr+ODiOWeiy4gYE9iamVjdGAg44GK44KI44GzIGB7fWAg44K/44Kk44OX44Gv44CMbnVsbOOBp+OBquOBhOWApOOAjeOCkuaEj+WRs+OBmeOCi+OBn+OCgeS7o+S+oeOBqOOBl+OBpuS9v+eUqFxuICovXG5leHBvcnQgdHlwZSBVbmtub3duT2JqZWN0ID0gUmVjb3JkPHN0cmluZyB8IG51bWJlciB8IHN5bWJvbCwgdW5rbm93bj47XG5cbi8qKlxuICogQGVuIEphdmFTY3JpcHQgdHlwZSBzZXQgaW50ZXJmYWNlLlxuICogQGphIEphdmFTY3JpcHQg44Gu5Z6L44Gu6ZuG5ZCIXG4gKi9cbmludGVyZmFjZSBUeXBlTGlzdCB7XG4gICAgc3RyaW5nOiBzdHJpbmc7XG4gICAgbnVtYmVyOiBudW1iZXI7XG4gICAgYm9vbGVhbjogYm9vbGVhbjtcbiAgICBzeW1ib2w6IHN5bWJvbDtcbiAgICBiaWdpbnQ6IGJpZ2ludDtcbiAgICB1bmRlZmluZWQ6IHZvaWQgfCB1bmRlZmluZWQ7XG4gICAgb2JqZWN0OiBvYmplY3QgfCBudWxsO1xuICAgIGZ1bmN0aW9uKC4uLmFyZ3M6IHVua25vd25bXSk6IHVua25vd247XG59XG5cbi8qKlxuICogQGVuIFRoZSBrZXkgbGlzdCBvZiB7QGxpbmsgVHlwZUxpc3R9LlxuICogQGphIHtAbGluayBUeXBlTGlzdH0g44Kt44O85LiA6KanXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVLZXlzID0ga2V5b2YgVHlwZUxpc3Q7XG5cbi8qKlxuICogQGVuIFR5cGUgYmFzZSBkZWZpbml0aW9uLlxuICogQGphIOWei+OBruimj+WumuWumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFR5cGU8VCBleHRlbmRzIG9iamVjdD4gZXh0ZW5kcyBGdW5jdGlvbiB7XG4gICAgcmVhZG9ubHkgcHJvdG90eXBlOiBUO1xufVxuXG4vKipcbiAqIEBlbiBUeXBlIG9mIGNvbnN0cnVjdG9yLlxuICogQGphIOOCs+ODs+OCueODiOODqeOCr+OCv+Wei1xuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbnN0cnVjdG9yPFQgZXh0ZW5kcyBvYmplY3Q+IGV4dGVuZHMgVHlwZTxUPiB7XG4gICAgbmV3KC4uLmFyZ3M6IGFueVtdKTogVDtcbn1cblxuLyoqXG4gKiBAZW4gVHlwZSBvZiBjbGFzcy5cbiAqIEBqYSDjgq/jg6njgrnlnotcbiAqL1xuZXhwb3J0IHR5cGUgQ2xhc3M8VCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4gPSBDb25zdHJ1Y3RvcjxUPjtcblxuLyoqXG4gKiBAZW4gRW5zdXJlIGZvciBmdW5jdGlvbiBwYXJhbWV0ZXJzIHRvIHR1cGxlLlxuICogQGphIOmWouaVsOODkeODqeODoeODvOOCv+OBqOOBl+OBpiB0dXBsZSDjgpLkv53oqLxcbiAqL1xuZXhwb3J0IHR5cGUgQXJndW1lbnRzPFQ+ID0gVCBleHRlbmRzIGFueVtdID8gVCA6IFtUXTtcblxuLyoqXG4gKiBAZW4gUm1vdmUgYHJlYWRvbmx5YCBhdHRyaWJ1dGVzIGZyb20gaW5wdXQgdHlwZS5cbiAqIEBqYSBgcmVhZG9ubHlgIOWxnuaAp+OCkuino+mZpFxuICovXG5leHBvcnQgdHlwZSBXcml0YWJsZTxUPiA9IHsgLXJlYWRvbmx5IFtLIGluIGtleW9mIFRdOiBUW0tdIH07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gc3Vic2NyaXB0IGFjY2Vzc2libGUgdHlwZS5cbiAqIEBqYSDmt7vjgYjlrZfjgqLjgq/jgrvjgrnlj6/og73jgarlnovjgavlpInmj5tcbiAqL1xuZXhwb3J0IHR5cGUgQWNjZXNzaWJsZTxULCBTID0gdW5rbm93bj4gPSBUICYgUmVjb3JkPHN0cmluZyB8IG51bWJlciB8IHN5bWJvbCwgUz47XG5cbi8qKlxuICogQGVuIEV4dHJhY3QgZnVuY3Rpb25hbCBwcm9wZXJ0eSBuYW1lcy5cbiAqIEBqYSDplqLmlbDjg5fjg63jg5Hjg4bjgqPlkI3jga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+ID0geyBbSyBpbiBrZXlvZiBUXTogVFtLXSBleHRlbmRzIEZ1bmN0aW9uID8gSyA6IG5ldmVyIH1ba2V5b2YgVF0gJiBzdHJpbmc7XG5cbi8qKlxuICogQGVuIEV4dHJhY3QgZnVuY3Rpb25hbCBwcm9wZXJ0aWVzLlxuICogQGphIOmWouaVsOODl+ODreODkeODhuOCo+OBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBGdW5jdGlvblByb3BlcnRpZXM8VD4gPSBQaWNrPFQsIEZ1bmN0aW9uUHJvcGVydHlOYW1lczxUPj47XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgbm9uLWZ1bmN0aW9uYWwgcHJvcGVydHkgbmFtZXMuXG4gKiBAamEg6Z2e6Zai5pWw44OX44Ot44OR44OG44Kj5ZCN44Gu5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxUPiA9IHsgW0sgaW4ga2V5b2YgVF06IFRbS10gZXh0ZW5kcyBGdW5jdGlvbiA/IG5ldmVyIDogSyB9W2tleW9mIFRdICYgc3RyaW5nO1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG5vbi1mdW5jdGlvbmFsIHByb3BlcnRpZXMuXG4gKiBAamEg6Z2e6Zai5pWw44OX44Ot44OR44OG44Kj44Gu5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIE5vbkZ1bmN0aW9uUHJvcGVydGllczxUPiA9IFBpY2s8VCwgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+PjtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBub24tZnVuY3Rpb25hbCB0eXBlcy5cbiAqIEBqYSDpnZ7plqLmlbDlnovjga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgTm9uRnVuY3Rpb248VD4gPSBUIGV4dGVuZHMgRnVuY3Rpb24gPyBuZXZlciA6IFQ7XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgb2JqZWN0IGtleSBsaXN0LiAoZW5zdXJlIG9ubHkgJ3N0cmluZycpXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu44Kt44O85LiA6Kan44KS5oq95Ye6ICgnc3RyaW5nJyDlnovjga7jgb/jgpLkv53oqLwpXG4gKi9cbmV4cG9ydCB0eXBlIEtleXM8VCBleHRlbmRzIG9iamVjdD4gPSBrZXlvZiBPbWl0PFQsIG51bWJlciB8IHN5bWJvbD47XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgb2JqZWN0IHR5cGUgbGlzdC5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7lnovkuIDopqfjgpLmir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZXM8VCBleHRlbmRzIG9iamVjdD4gPSBUW2tleW9mIFRdO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IG9iamVjdCBrZXkgdG8gdHlwZS5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjgq3jg7zjgYvjgonlnovjgbjlpInmj5tcbiAqL1xuZXhwb3J0IHR5cGUgS2V5VG9UeXBlPE8gZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBrZXlvZiBPPiA9IEsgZXh0ZW5kcyBrZXlvZiBPID8gT1tLXSA6IG5ldmVyO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IG9iamVjdCB0eXBlIHRvIGtleS5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jlnovjgYvjgonjgq3jg7zjgbjlpInmj5tcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZVRvS2V5PE8gZXh0ZW5kcyBvYmplY3QsIFQgZXh0ZW5kcyBUeXBlczxPPj4gPSB7IFtLIGluIGtleW9mIE9dOiBPW0tdIGV4dGVuZHMgVCA/IEsgOiBuZXZlciB9W2tleW9mIE9dO1xuXG4vKipcbiAqIEBlbiBUaGUge0BsaW5rIFBsYWluT2JqZWN0fSB0eXBlIGlzIGEgSmF2YVNjcmlwdCBvYmplY3QgY29udGFpbmluZyB6ZXJvIG9yIG1vcmUga2V5LXZhbHVlIHBhaXJzLiA8YnI+XG4gKiAgICAgJ1BsYWluJyBtZWFucyBpdCBmcm9tIG90aGVyIGtpbmRzIG9mIEphdmFTY3JpcHQgb2JqZWN0cy4gZXg6IG51bGwsIHVzZXItZGVmaW5lZCBhcnJheXMsIGFuZCBob3N0IG9iamVjdHMgc3VjaCBhcyBgZG9jdW1lbnRgLlxuICogQGphIDAg5Lul5LiK44GuIGtleS12YWx1ZSDjg5rjgqLjgpLmjIHjgaQge0BsaW5rIFBsYWluT2JqZWN0fSDlrprnvqkgPGJyPlxuICogICAgICdQbGFpbicg44Go44Gv5LuW44Gu56iu6aGe44GuIEphdmFTY3JpcHQg44Kq44OW44K444Kn44Kv44OI44KS5ZCr44G+44Gq44GE44Kq44OW44K444Kn44Kv44OI44KS5oSP5ZGz44GZ44KLLiDkvos6ICBudWxsLCDjg6bjg7zjgrbjg7zlrprnvqnphY3liJcsIOOBvuOBn+OBryBgZG9jdW1lbnRgIOOBruOCiOOBhuOBque1hOOBv+i+vOOBv+OCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgdHlwZSBQbGFpbk9iamVjdDxUID0ge30gfCBudWxsIHwgdW5kZWZpbmVkPiA9IFJlY29yZDxzdHJpbmcsIFQ+O1xuXG4vKipcbiAqIEBlbiBPYmplY3QgY2FuIGJlIGd1YXJhbnRlZWQgZGVmaW5pdGlvbi4gQmUgY2FyZWZ1bCBub3QgdG8gYWJ1c2UgaXQgYmVjYXVzZSBpdCBkb2VzIG5vdCBmb3JjZSB0aGUgY2FzdC5cbiAqICAgLSBVbmxpa2Uge0BsaW5rIFBsYWluT2JqZWN0fSwgaXQgY2FuIGFjY2VwdCBDbGFzcyAoYnVpbHQtaW4gb2JqZWN0KSwgQXJyYXksIEZ1bmN0aW9uLlxuICogICAtIFVubGlrZSBgb2JqZWN0YCwgeW91IGNhbiBhY2Nlc3MgdW5rbm93biBwcm9wZXJ0aWVzLlxuICogICAtIFVubGlrZSBge30gLyBPYmplY3RgLCBpdCBjYW4gcmVwZWwge0BsaW5rIFByaW1pdGl2ZX0uXG4gKiBAamEgT2JqZWN0IOOCkuS/neiovOWPr+iDveOBquWumue+qS4g44Kt44Oj44K544OI44KS5by35Yi244GX44Gq44GE44Gf44KB5Lmx55So44GX44Gq44GE44KI44GG44Gr5rOo5oSP44GM5b+F6KaBLlxuICogICAtIHtAbGluayBQbGFpbk9iamVjdH0g44Go6YGV44GE44CBQ2xhc3MgKOe1hOOBv+i+vOOBv+OCquODluOCuOOCp+OCr+ODiCksIEFycmF5LCBGdW5jdGlvbiDjgpLlj5fjgZHku5jjgZHjgovjgZPjgajjgYzjgafjgY3jgosuXG4gKiAgIC0gYG9iamVjdGAg44Go6YGV44GE44CB5pyq55+l44Gu44OX44Ot44OR44OG44Kj44Gr44Ki44Kv44K744K544GZ44KL44GT44Go44GM44Gn44GN44KLLlxuICogICAtIGB7fSAvIE9iamVjdGAg44Go6YGV44GE44CBe0BsaW5rIFByaW1pdGl2ZX0g44KS44Gv44GY44GP44GT44Go44GM44Gn44GN44KLLlxuICovXG5leHBvcnQgdHlwZSBBbnlPYmplY3QgPSBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xuXG4vKipcbiAqIEBlbiBUaGUgZGF0YSB0eXBlIGxpc3QgYnkgd2hpY2ggc3R5bGUgY29tcHVsc2lvbiBpcyBwb3NzaWJsZS5cbiAqIEBqYSDlnovlvLfliLblj6/og73jgarjg4fjg7zjgr/lnovkuIDopqdcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZWREYXRhID0gc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGwgfCBvYmplY3Q7XG5cbi8qKlxuICogQGVuIFRoZSBkYXRhIHR5cGUgbGlzdCBvZiBUeXBlZEFycmF5LlxuICogQGphIFR5cGVkQXJyYXkg5LiA6KanXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVkQXJyYXkgPSBJbnQ4QXJyYXkgfCBVaW50OEFycmF5IHwgVWludDhDbGFtcGVkQXJyYXkgfCBJbnQxNkFycmF5IHwgVWludDE2QXJyYXkgfCBJbnQzMkFycmF5IHwgVWludDMyQXJyYXkgfCBGbG9hdDMyQXJyYXkgfCBGbG9hdDY0QXJyYXk7XG5cbi8qKlxuICogQGVuIFR5cGVkQXJyYXkgY29uc3RydWN0b3IuXG4gKiBAamEgVHlwZWRBcnJheSDjgrPjg7Pjgrnjg4jjg6njgq/jgr/lrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUeXBlZEFycmF5Q29uc3RydWN0b3Ige1xuICAgIHJlYWRvbmx5IHByb3RvdHlwZTogVHlwZWRBcnJheTtcbiAgICBuZXcoc2VlZDogbnVtYmVyIHwgQXJyYXlMaWtlPG51bWJlcj4gfCBBcnJheUJ1ZmZlckxpa2UpOiBUeXBlZEFycmF5O1xuICAgIG5ldyhidWZmZXI6IEFycmF5QnVmZmVyTGlrZSwgYnl0ZU9mZnNldD86IG51bWJlciwgbGVuZ3RoPzogbnVtYmVyKTogVHlwZWRBcnJheTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgc2l6ZSBpbiBieXRlcyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSDopoHntKDjga7jg5DjgqTjg4jjgrXjgqTjgrpcbiAgICAgKi9cbiAgICByZWFkb25seSBCWVRFU19QRVJfRUxFTUVOVDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYSBuZXcgYXJyYXkgZnJvbSBhIHNldCBvZiBlbGVtZW50cy5cbiAgICAgKiBAamEg6KaB57Sg44KS6Kit5a6a44GX5paw6KaP6YWN5YiX44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlbXNcbiAgICAgKiAgLSBgZW5gIEEgc2V0IG9mIGVsZW1lbnRzIHRvIGluY2x1ZGUgaW4gdGhlIG5ldyBhcnJheSBvYmplY3QuXG4gICAgICogIC0gYGphYCDmlrDjgZ/jgavoqK3lrprjgZnjgovopoHntKBcbiAgICAgKi9cbiAgICBvZiguLi5pdGVtczogbnVtYmVyW10pOiBUeXBlZEFycmF5O1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZXMgYW4gYXJyYXkgZnJvbSBhbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdC5cbiAgICAgKiBAamEgYXJyYXktbGlrZSAvIGl0ZXJhdGFibGUg44Kq44OW44K444Kn44Kv44OI44GL44KJ5paw6KaP6YWN5YiX44KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlMaWtlXG4gICAgICogIC0gYGVuYCBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqICAtIGBqYWAgYXJyYXktbGlrZSDjgoLjgZfjgY/jga8gaXRlcmF0YWJsZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICBmcm9tKGFycmF5TGlrZTogQXJyYXlMaWtlPG51bWJlcj4pOiBUeXBlZEFycmF5O1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZXMgYW4gYXJyYXkgZnJvbSBhbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdC5cbiAgICAgKiBAamEgYXJyYXktbGlrZSAvIGl0ZXJhdGFibGUg44Kq44OW44K444Kn44Kv44OI44GL44KJ5paw6KaP6YWN5YiX44KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlMaWtlXG4gICAgICogIC0gYGVuYCBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqICAtIGBqYWAgYXJyYXktbGlrZSDjgoLjgZfjgY/jga8gaXRlcmF0YWJsZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gbWFwZm5cbiAgICAgKiAgLSBgZW5gIEEgbWFwcGluZyBmdW5jdGlvbiB0byBjYWxsIG9uIGV2ZXJ5IGVsZW1lbnQgb2YgdGhlIGFycmF5LlxuICAgICAqICAtIGBqYWAg5YWo6KaB57Sg44Gr6YGp55So44GZ44KL44OX44Ot44Kt44K36Zai5pWwXG4gICAgICogQHBhcmFtIHRoaXNBcmdcbiAgICAgKiAgLSBgZW5gIFZhbHVlIG9mICd0aGlzJyB1c2VkIHRvIGludm9rZSB0aGUgbWFwZm4uXG4gICAgICogIC0gYGphYCBtYXBmbiDjgavkvb/nlKjjgZnjgosgJ3RoaXMnXG4gICAgICovXG4gICAgZnJvbTxUPihhcnJheUxpa2U6IEFycmF5TGlrZTxUPiwgbWFwZm46ICh2OiBULCBrOiBudW1iZXIpID0+IG51bWJlciwgdGhpc0FyZz86IHVua25vd24pOiBUeXBlZEFycmF5O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGV4aXN0cy5cbiAqIEBqYSDlgKTjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleGlzdHM8VD4oeDogVCB8IE51bGxpc2gpOiB4IGlzIFQge1xuICAgIHJldHVybiBudWxsICE9IHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIHtAbGluayBOdWxsaXNofS5cbiAqIEBqYSB7QGxpbmsgTnVsbGlzaH0g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOdWxsaXNoKHg6IHVua25vd24pOiB4IGlzIE51bGxpc2gge1xuICAgIHJldHVybiBudWxsID09IHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFN0cmluZy5cbiAqIEBqYSBTdHJpbmcg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmcoeDogdW5rbm93bik6IHggaXMgc3RyaW5nIHtcbiAgICByZXR1cm4gJ3N0cmluZycgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBOdW1iZXIuXG4gKiBAamEgTnVtYmVyIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTnVtYmVyKHg6IHVua25vd24pOiB4IGlzIG51bWJlciB7XG4gICAgcmV0dXJuICdudW1iZXInID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgQm9vbGVhbi5cbiAqIEBqYSBCb29sZWFuIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQm9vbGVhbih4OiB1bmtub3duKTogeCBpcyBib29sZWFuIHtcbiAgICByZXR1cm4gJ2Jvb2xlYW4nID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgU3ltYmxlLlxuICogQGphIFN5bWJvbCDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N5bWJvbCh4OiB1bmtub3duKTogeCBpcyBzeW1ib2wge1xuICAgIHJldHVybiAnc3ltYm9sJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIEJpZ0ludC5cbiAqIEBqYSBCaWdJbnQg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCaWdJbnQoeDogdW5rbm93bik6IHggaXMgYmlnaW50IHtcbiAgICByZXR1cm4gJ2JpZ2ludCcgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBwcmltaXRpdmUgdHlwZS5cbiAqIEBqYSDjg5fjg6rjg5/jg4bjgqPjg5blnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1ByaW1pdGl2ZSh4OiB1bmtub3duKTogeCBpcyBQcmltaXRpdmUge1xuICAgIHJldHVybiAheCB8fCAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHgpICYmICgnb2JqZWN0JyAhPT0gdHlwZW9mIHgpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBBcnJheS5cbiAqIEBqYSBBcnJheSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBjb25zdCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgT2JqZWN0LlxuICogQGphIE9iamVjdCDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09iamVjdCh4OiB1bmtub3duKTogeCBpcyBvYmplY3Qge1xuICAgIHJldHVybiBCb29sZWFuKHgpICYmICdvYmplY3QnID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMge0BsaW5rIFBsYWluT2JqZWN0fS5cbiAqIEBqYSB7QGxpbmsgUGxhaW5PYmplY3R9IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUGxhaW5PYmplY3QoeDogdW5rbm93bik6IHggaXMgUGxhaW5PYmplY3Qge1xuICAgIGlmICghaXNPYmplY3QoeCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGNyZWF0ZSBmcm9tIGBPYmplY3QuY3JlYXRlKCBudWxsIClgIGlzIHBsYWluXG4gICAgaWYgKCFPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIG93bkluc3RhbmNlT2YoT2JqZWN0LCB4KTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgZW1wdHkgb2JqZWN0LlxuICogQGphIOepuuOCquODluOCuOOCp+OCr+ODiOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRW1wdHlPYmplY3QoeDogdW5rbm93bik6IHggaXMgb2JqZWN0IHtcbiAgICBpZiAoIWlzUGxhaW5PYmplY3QoeCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG5hbWUgaW4geCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBGdW5jdGlvbi5cbiAqIEBqYSBGdW5jdGlvbiDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Z1bmN0aW9uKHg6IHVua25vd24pOiB4IGlzIFR5cGVMaXN0WydmdW5jdGlvbiddIHtcbiAgICByZXR1cm4gJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBjYW4gYmUgY29udmVydCB0byBhIG51bWJlci5cbiAqIEBqYSDmlbDlgKTjgavlpInmj5vlj6/og73jgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc051bWVyaWMoeDogdW5rbm93bik6IHggaXMgbnVtYmVyIHtcbiAgICByZXR1cm4gIWlzTnVsbGlzaCh4KSAmJiAhaXNCb29sZWFuKHgpICYmICFpc0FycmF5KHgpICYmICFpc1N5bWJvbCh4KSAmJiAoJycgIT09IHgpICYmICFOdW1iZXIuaXNOYU4oTnVtYmVyKHgpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgaW5wdXQuXG4gKiBAamEg5oyH5a6a44GX44Gf5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHR5cGVcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHR5cGVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5Z6LXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0eXBlT2Y8SyBleHRlbmRzIFR5cGVLZXlzPih0eXBlOiBLLCB4OiB1bmtub3duKTogeCBpcyBUeXBlTGlzdFtLXSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSB0eXBlO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgaGFzIGl0ZXJhdG9yLlxuICogQGphIGl0ZXJhdG9yIOOCkuaJgOacieOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGU8VD4oeDogTnVsbGFibGU8SXRlcmFibGU8VD4+KTogeCBpcyBJdGVyYWJsZTxUPjtcbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlKHg6IHVua25vd24pOiB4IGlzIEl0ZXJhYmxlPHVua25vd24+O1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGUoeDogdW5rbm93bik6IGFueSB7XG4gICAgcmV0dXJuIFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoeCk7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF90eXBlZEFycmF5TmFtZXM6IFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+ID0ge1xuICAgICdJbnQ4QXJyYXknOiB0cnVlLFxuICAgICdVaW50OEFycmF5JzogdHJ1ZSxcbiAgICAnVWludDhDbGFtcGVkQXJyYXknOiB0cnVlLFxuICAgICdJbnQxNkFycmF5JzogdHJ1ZSxcbiAgICAnVWludDE2QXJyYXknOiB0cnVlLFxuICAgICdJbnQzMkFycmF5JzogdHJ1ZSxcbiAgICAnVWludDMyQXJyYXknOiB0cnVlLFxuICAgICdGbG9hdDMyQXJyYXknOiB0cnVlLFxuICAgICdGbG9hdDY0QXJyYXknOiB0cnVlLFxufTtcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGlzIG9uZSBvZiB7QGxpbmsgVHlwZWRBcnJheX0uXG4gKiBAamEg5oyH5a6a44GX44Gf44Kk44Oz44K544K/44Oz44K544GMIHtAbGluayBUeXBlZEFycmF5fSDjga7kuIDnqK7jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVkQXJyYXkoeDogdW5rbm93bik6IHggaXMgVHlwZWRBcnJheSB7XG4gICAgcmV0dXJuICEhX3R5cGVkQXJyYXlOYW1lc1tjbGFzc05hbWUoeCldO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgaW5zdGFuY2Ugb2YgaW5wdXQuXG4gKiBAamEg5oyH5a6a44GX44Gf44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIGNvbnN0cnVjdG9yXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+OCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5zdGFuY2VPZjxUIGV4dGVuZHMgb2JqZWN0PihjdG9yOiBOdWxsYWJsZTxUeXBlPFQ+PiwgeDogdW5rbm93bik6IHggaXMgVCB7XG4gICAgcmV0dXJuICgnZnVuY3Rpb24nID09PSB0eXBlb2YgY3RvcikgJiYgKHggaW5zdGFuY2VvZiBjdG9yKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGluc3RhbmNlIG9mIGlucHV0IGNvbnN0cnVjdG9yIChleGNlcHQgc3ViIGNsYXNzKS5cbiAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvliKTlrpogKOa0vueUn+OCr+ODqeOCueOBr+WQq+OCgeOBquOBhClcbiAqXG4gKiBAcGFyYW0gY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL44Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvd25JbnN0YW5jZU9mPFQgZXh0ZW5kcyBvYmplY3Q+KGN0b3I6IE51bGxhYmxlPFR5cGU8VD4+LCB4OiB1bmtub3duKTogeCBpcyBUIHtcbiAgICByZXR1cm4gKG51bGwgIT0geCkgJiYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBjdG9yKSAmJiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpID09PSBPYmplY3QoY3Rvci5wcm90b3R5cGUpKTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSB2YWx1ZSdzIGNsYXNzIG5hbWUuXG4gKiBAamEg44Kv44Op44K55ZCN44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xhc3NOYW1lKHg6IGFueSk6IHN0cmluZyB7XG4gICAgaWYgKHggIT0gbnVsbCkge1xuICAgICAgICBjb25zdCB0b1N0cmluZ1RhZ05hbWUgPSB4W1N5bWJvbC50b1N0cmluZ1RhZ107XG4gICAgICAgIGlmIChpc1N0cmluZyh0b1N0cmluZ1RhZ05hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9TdHJpbmdUYWdOYW1lO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb24oeCkgJiYgeC5wcm90b3R5cGUgJiYgbnVsbCAhPSB4Lm5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB4Lm5hbWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBjdG9yID0geC5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGN0b3IpICYmIGN0b3IgPT09IChPYmplY3QoY3Rvci5wcm90b3R5cGUpIGFzIG9iamVjdCkuY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY3Rvci5uYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpIGFzIHN0cmluZykuc2xpY2UoOCwgLTEpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBpbnB1dCB2YWx1ZXMgYXJlIHNhbWUgdmFsdWUtdHlwZS5cbiAqIEBqYSDlhaXlipvjgYzlkIzkuIDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gbGhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqIEBwYXJhbSByaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FtZVR5cGUobGhzOiB1bmtub3duLCByaHM6IHVua25vd24pOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHlwZW9mIGxocyA9PT0gdHlwZW9mIHJocztcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgaW5wdXQgdmFsdWVzIGFyZSBzYW1lIGNsYXNzLlxuICogQGphIOWFpeWKm+OBjOWQjOS4gOOCr+ODqeOCueOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBsaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICogQHBhcmFtIHJoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1lQ2xhc3MobGhzOiB1bmtub3duLCByaHM6IHVua25vd24pOiBib29sZWFuIHtcbiAgICBpZiAobnVsbCA9PSBsaHMgJiYgbnVsbCA9PSByaHMpIHtcbiAgICAgICAgcmV0dXJuIGNsYXNzTmFtZShsaHMpID09PSBjbGFzc05hbWUocmhzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKG51bGwgIT0gbGhzKSAmJiAobnVsbCAhPSByaHMpICYmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YobGhzKSA9PT0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHJocykpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29tbW9uIFN5bWJsZSBmb3IgZnJhbWV3b3JrLlxuICogQGphIOODleODrOODvOODoOODr+ODvOOCr+OBjOWFsemAmuOBp+S9v+eUqOOBmeOCiyBTeW1ibGVcbiAqL1xuZXhwb3J0IGNvbnN0ICRjZHAgPSBTeW1ib2woJ0BjZHAnKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1mdW5jdGlvbi10eXBlLFxuICovXG5cbmltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duRnVuY3Rpb24sXG4gICAgdHlwZSBUeXBlS2V5cyxcbiAgICBpc0FycmF5LFxuICAgIGV4aXN0cyxcbiAgICBjbGFzc05hbWUsXG59IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIEBlbiBUeXBlIHZlcmlmaWVyIGludGVyZmFjZSBkZWZpbml0aW9uLiA8YnI+XG4gKiAgICAgSWYgaW52YWxpZCB2YWx1ZSByZWNlaXZlZCwgdGhlIG1ldGhvZCB0aHJvd3MgYFR5cGVFcnJvcmAuXG4gKiBAamEg5Z6L5qSc6Ki844Gu44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pIDxicj5cbiAqICAgICDpgZXlj43jgZfjgZ/loLTlkIjjga8gYFR5cGVFcnJvcmAg44KS55m655SfXG4gKlxuICpcbiAqL1xuaW50ZXJmYWNlIFZlcmlmaWVyIHtcbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaXMgbm90IHtAbGluayBOdWxsaXNofS5cbiAgICAgKiBAamEge0BsaW5rIE51bGxpc2h9IOOBp+OBquOBhOOBk+OBqOOCkuaknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIG5vdE51bGxpc2gueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gbm90TnVsbGlzaC5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgbm90TnVsbGlzaDogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaXMge0BsaW5rIFR5cGVLZXlzfS5cbiAgICAgKiBAamEg5oyH5a6a44GX44GfIHtAbGluayBUeXBlS2V5c30g44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZU9mLnR5cGVcbiAgICAgKiAgLSBgZW5gIG9uZSBvZiB7QGxpbmsgVHlwZUtleXN9XG4gICAgICogIC0gYGphYCB7QGxpbmsgVHlwZUtleXN9IOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSB0eXBlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gdHlwZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICB0eXBlT2Y6ICh0eXBlOiBUeXBlS2V5cywgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBpcyBgQXJyYXlgLlxuICAgICAqIEBqYSBgQXJyYXlgIOOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5LnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGFycmF5Lm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBhcnJheTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaXMgYEl0ZXJhYmxlYC5cbiAgICAgKiBAamEgYEl0ZXJhYmxlYCDjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpdGVyYWJsZS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBpdGVyYWJsZS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaXRlcmFibGU6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGluc3RhbmNlIGlzIGVxdWFsIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44Gu44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5zdGFuY2VPZi5jdG9yXG4gICAgICogIC0gYGVuYCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOavlOi8g+WvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBpbnN0YW5jZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGluc3RhbmNlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpbnN0YW5jZSBoYXMgYHN0cmljdGx5YCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3IuXG4gICAgICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OBruWOs+WvhuS4gOiHtOOBl+OBn+OCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIG93bkluc3RhbmNlT2YuY3RvclxuICAgICAqICAtIGBlbmAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDmr5TovIPlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gb3duSW5zdGFuY2VPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBvd25JbnN0YW5jZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBvd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaW5zdGFuY2UgaGFzIG5vdCBgc3RyaWN0bHlgIGVxdWFsIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44KS5oyB44Gk44Kk44Oz44K544K/44Oz44K544Gn44Gq44GE44GT44Go44KS5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm90T3duSW5zdGFuY2VPZi5jdG9yXG4gICAgICogIC0gYGVuYCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOavlOi8g+WvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBub3RPd25JbnN0YW5jZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIG5vdE93bkluc3RhbmNlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIG5vdE93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBoYXMgc3BlY2lmaWVkIHByb3BlcnR5LlxuICAgICAqIEBqYSDmjIflrprjg5fjg63jg5Hjg4bjgqPjgpLmjIHjgaPjgabjgYTjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYXNQcm9wZXJ0eS5wcm9wXG4gICAgICogIC0gYGVuYCBzcGVjaWZpZWQgcHJvcGVydHlcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqIEBwYXJhbSBoYXNQcm9wZXJ0eS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBoYXNQcm9wZXJ0eS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaGFzUHJvcGVydHk6ICh4OiB1bmtub3duLCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBoYXMgb3duIHNwZWNpZmllZCBwcm9wZXJ0eS5cbiAgICAgKiBAamEg5oyH5a6a44OX44Ot44OR44OG44Kj44KS5YWl5Yqb5YCk6Ieq6Lqr5oyB44Gj44Gm44GE44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFzT3duUHJvcGVydHkucHJvcFxuICAgICAqICAtIGBlbmAgc3BlY2lmaWVkIHByb3BlcnR5XG4gICAgICogIC0gYGphYCDlr77osaHjga7jg5fjg63jg5Hjg4bjgqNcbiAgICAgKiBAcGFyYW0gaGFzT3duUHJvcGVydHkueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaGFzT3duUHJvcGVydHkubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGhhc093blByb3BlcnR5OiAoeDogdW5rbm93biwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG59XG5cbi8qKlxuICogQGVuIExpc3Qgb2YgbWV0aG9kIGZvciB0eXBlIHZlcmlmeS5cbiAqIEBqYSDlnovmpJzoqLzjgYzmj5DkvpvjgZnjgovjg6Hjgr3jg4Pjg4nkuIDopqdcbiAqL1xuZXhwb3J0IHR5cGUgVmVyaWZ5TWV0aG9kID0ga2V5b2YgVmVyaWZpZXI7XG5cbi8qKlxuICogQGVuIENvbmNyZXRlIHR5cGUgdmVyaWZpZXIgb2JqZWN0LlxuICogQGphIOWei+aknOiovOWun+ijheOCquODluOCuOOCp+OCr+ODiFxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5jb25zdCBfdmVyaWZpZXI6IFZlcmlmaWVyID0ge1xuICAgIG5vdE51bGxpc2g6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHgpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGEgdmFsaWQgdmFsdWUuYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHR5cGVPZjogKHR5cGU6IFR5cGVLZXlzLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgeCAhPT0gdHlwZSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFR5cGUgb2YgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCAke3R5cGV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBhcnJheTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKCFpc0FycmF5KHgpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhbiBBcnJheS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaXRlcmFibGU6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICghKFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoeCkpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhbiBpdGVyYWJsZSBvYmplY3QuYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAoISh4IGluc3RhbmNlb2YgY3RvcikpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGFuIGluc3RhbmNlIG9mICR7Y3Rvci5uYW1lfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgb3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHggfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpICE9PSBPYmplY3QoY3Rvci5wcm90b3R5cGUpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBpcyBub3Qgb3duIGluc3RhbmNlIG9mICR7Y3Rvci5uYW1lfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgbm90T3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsICE9IHggJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpID09PSBPYmplY3QoY3Rvci5wcm90b3R5cGUpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBpcyBvd24gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBoYXNQcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHggfHwgIShwcm9wIGluICh4IGFzIG9iamVjdCkpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBkb2VzIG5vdCBoYXZlIHByb3BlcnR5ICR7U3RyaW5nKHByb3ApfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaGFzT3duUHJvcGVydHk6ICh4OiB1bmtub3duLCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCA9PSB4IHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoeCwgcHJvcCkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGRvZXMgbm90IGhhdmUgb3duIHByb3BlcnR5ICR7U3RyaW5nKHByb3ApfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBAZW4gVmVyaWZ5IG1ldGhvZC5cbiAqIEBqYSDmpJzoqLzjg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gbWV0aG9kXG4gKiAgLSBgZW5gIG1ldGhvZCBuYW1lIHdoaWNoIHVzaW5nXG4gKiAgLSBgamFgIOS9v+eUqOOBmeOCi+ODoeOCveODg+ODieWQjVxuICogQHBhcmFtIGFyZ3NcbiAqICAtIGBlbmAgYXJndW1lbnRzIHdoaWNoIGNvcnJlc3BvbmRzIHRvIHRoZSBtZXRob2QgbmFtZVxuICogIC0gYGphYCDjg6Hjgr3jg4Pjg4nlkI3jgavlr77lv5zjgZnjgovlvJXmlbBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZlcmlmeTxUTWV0aG9kIGV4dGVuZHMgVmVyaWZ5TWV0aG9kPihtZXRob2Q6IFRNZXRob2QsIC4uLmFyZ3M6IFBhcmFtZXRlcnM8VmVyaWZpZXJbVE1ldGhvZF0+KTogdm9pZCB8IG5ldmVyIHtcbiAgICAoX3ZlcmlmaWVyW21ldGhvZF0gYXMgVW5rbm93bkZ1bmN0aW9uKSguLi5hcmdzKTtcbn1cblxuZXhwb3J0IHsgdmVyaWZ5IGFzIGRlZmF1bHQgfTtcbiIsImltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duT2JqZWN0LFxuICAgIHR5cGUgVHlwZWRBcnJheSxcbiAgICB0eXBlIFR5cGVkQXJyYXlDb25zdHJ1Y3RvcixcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzQXJyYXksXG4gICAgaXNPYmplY3QsXG4gICAgaXNJdGVyYWJsZSxcbiAgICBpc1R5cGVkQXJyYXksXG4gICAgc2FtZUNsYXNzLFxufSBmcm9tICcuL3R5cGVzJztcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGRlZXBFcXVhbCgpICovXG5mdW5jdGlvbiBhcnJheUVxdWFsKGxoczogdW5rbm93bltdLCByaHM6IHVua25vd25bXSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGxlbiA9IGxocy5sZW5ndGg7XG4gICAgaWYgKGxlbiAhPT0gcmhzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKCFkZWVwRXF1YWwobGhzW2ldLCByaHNbaV0pKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBkZWVwRXF1YWwoKSAqL1xuZnVuY3Rpb24gYnVmZmVyRXF1YWwobGhzOiBTaGFyZWRBcnJheUJ1ZmZlciB8IEFycmF5QnVmZmVyLCByaHM6IFNoYXJlZEFycmF5QnVmZmVyIHwgQXJyYXlCdWZmZXIpOiBib29sZWFuIHtcbiAgICBjb25zdCBzaXplID0gbGhzLmJ5dGVMZW5ndGg7XG4gICAgaWYgKHNpemUgIT09IHJocy5ieXRlTGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgbGV0IHBvcyA9IDA7XG4gICAgaWYgKHNpemUgLSBwb3MgPj0gOCkge1xuICAgICAgICBjb25zdCBsZW4gPSBzaXplID4+PiAzO1xuICAgICAgICBjb25zdCBmNjRMID0gbmV3IEZsb2F0NjRBcnJheShsaHMsIDAsIGxlbik7XG4gICAgICAgIGNvbnN0IGY2NFIgPSBuZXcgRmxvYXQ2NEFycmF5KHJocywgMCwgbGVuKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgaWYgKCFPYmplY3QuaXMoZjY0TFtpXSwgZjY0UltpXSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcG9zID0gbGVuIDw8IDM7XG4gICAgfVxuICAgIGlmIChwb3MgPT09IHNpemUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGNvbnN0IEwgPSBuZXcgRGF0YVZpZXcobGhzKTtcbiAgICBjb25zdCBSID0gbmV3IERhdGFWaWV3KHJocyk7XG4gICAgaWYgKHNpemUgLSBwb3MgPj0gNCkge1xuICAgICAgICBpZiAoIU9iamVjdC5pcyhMLmdldFVpbnQzMihwb3MpLCBSLmdldFVpbnQzMihwb3MpKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHBvcyArPSA0O1xuICAgIH1cbiAgICBpZiAoc2l6ZSAtIHBvcyA+PSAyKSB7XG4gICAgICAgIGlmICghT2JqZWN0LmlzKEwuZ2V0VWludDE2KHBvcyksIFIuZ2V0VWludDE2KHBvcykpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcG9zICs9IDI7XG4gICAgfVxuICAgIGlmIChzaXplID4gcG9zKSB7XG4gICAgICAgIGlmICghT2JqZWN0LmlzKEwuZ2V0VWludDgocG9zKSwgUi5nZXRVaW50OChwb3MpKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHBvcyArPSAxO1xuICAgIH1cbiAgICByZXR1cm4gcG9zID09PSBzaXplO1xufVxuXG4vKipcbiAqIEBlbiBTZXQgYnkgc3BlY2lmeWluZyBrZXkgYW5kIHZhbHVlIGZvciB0aGUgb2JqZWN0LiAocHJvdG90eXBlIHBvbGx1dGlvbiBjb3VudGVybWVhc3VyZSlcbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjgasga2V5LCB2YWx1ZSDjgpLmjIflrprjgZfjgaboqK3lrpogKOODl+ODreODiOOCv+OCpOODl+axmuafk+WvvuetlilcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2lnblZhbHVlKHRhcmdldDogVW5rbm93bk9iamVjdCwga2V5OiBzdHJpbmcgfCBudW1iZXIgfCBzeW1ib2wsIHZhbHVlOiB1bmtub3duKTogdm9pZCB7XG4gICAgaWYgKCdfX3Byb3RvX18nICE9PSBrZXkgJiYgJ2NvbnN0cnVjdG9yJyAhPT0ga2V5KSB7XG4gICAgICAgIHRhcmdldFtrZXldID0gdmFsdWU7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBQZXJmb3JtcyBhIGRlZXAgY29tcGFyaXNvbiBiZXR3ZWVuIHR3byB2YWx1ZXMgdG8gZGV0ZXJtaW5lIGlmIHRoZXkgYXJlIGVxdWl2YWxlbnQuXG4gKiBAamEgMuWApOOBruips+e0sOavlOi8g+OCkuOBlywg562J44GX44GE44GL44Gp44GG44GL5Yik5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWVwRXF1YWwobGhzOiB1bmtub3duLCByaHM6IHVua25vd24pOiBib29sZWFuIHtcbiAgICBpZiAobGhzID09PSByaHMpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0Z1bmN0aW9uKGxocykgJiYgaXNGdW5jdGlvbihyaHMpKSB7XG4gICAgICAgIHJldHVybiBsaHMubGVuZ3RoID09PSByaHMubGVuZ3RoICYmIGxocy5uYW1lID09PSByaHMubmFtZTtcbiAgICB9XG4gICAgaWYgKCFpc09iamVjdChsaHMpIHx8ICFpc09iamVjdChyaHMpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgeyAvLyBQcmltaXRpdmUgV3JhcHBlciBPYmplY3RzIC8gRGF0ZVxuICAgICAgICBjb25zdCB2YWx1ZUwgPSBsaHMudmFsdWVPZigpO1xuICAgICAgICBjb25zdCB2YWx1ZVIgPSByaHMudmFsdWVPZigpO1xuICAgICAgICBpZiAobGhzICE9PSB2YWx1ZUwgfHwgcmhzICE9PSB2YWx1ZVIpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZUwgPT09IHZhbHVlUjtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIFJlZ0V4cFxuICAgICAgICBjb25zdCBpc1JlZ0V4cEwgPSBsaHMgaW5zdGFuY2VvZiBSZWdFeHA7XG4gICAgICAgIGNvbnN0IGlzUmVnRXhwUiA9IHJocyBpbnN0YW5jZW9mIFJlZ0V4cDtcbiAgICAgICAgaWYgKGlzUmVnRXhwTCB8fCBpc1JlZ0V4cFIpIHtcbiAgICAgICAgICAgIHJldHVybiBpc1JlZ0V4cEwgPT09IGlzUmVnRXhwUiAmJiBTdHJpbmcobGhzKSA9PT0gU3RyaW5nKHJocyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBBcnJheVxuICAgICAgICBjb25zdCBpc0FycmF5TCA9IGlzQXJyYXkobGhzKTtcbiAgICAgICAgY29uc3QgaXNBcnJheVIgPSBpc0FycmF5KHJocyk7XG4gICAgICAgIGlmIChpc0FycmF5TCB8fCBpc0FycmF5Uikge1xuICAgICAgICAgICAgcmV0dXJuIGlzQXJyYXlMID09PSBpc0FycmF5UiAmJiBhcnJheUVxdWFsKGxocyBhcyB1bmtub3duW10sIHJocyBhcyB1bmtub3duW10pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gQXJyYXlCdWZmZXJcbiAgICAgICAgY29uc3QgaXNCdWZmZXJMID0gbGhzIGluc3RhbmNlb2YgQXJyYXlCdWZmZXI7XG4gICAgICAgIGNvbnN0IGlzQnVmZmVyUiA9IHJocyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyO1xuICAgICAgICBpZiAoaXNCdWZmZXJMIHx8IGlzQnVmZmVyUikge1xuICAgICAgICAgICAgcmV0dXJuIGlzQnVmZmVyTCA9PT0gaXNCdWZmZXJSICYmIGJ1ZmZlckVxdWFsKGxocyBhcyBBcnJheUJ1ZmZlciwgcmhzIGFzIEFycmF5QnVmZmVyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIEFycmF5QnVmZmVyVmlld1xuICAgICAgICBjb25zdCBpc0J1ZmZlclZpZXdMID0gQXJyYXlCdWZmZXIuaXNWaWV3KGxocyk7XG4gICAgICAgIGNvbnN0IGlzQnVmZmVyVmlld1IgPSBBcnJheUJ1ZmZlci5pc1ZpZXcocmhzKTtcbiAgICAgICAgaWYgKGlzQnVmZmVyVmlld0wgfHwgaXNCdWZmZXJWaWV3Uikge1xuICAgICAgICAgICAgcmV0dXJuIGlzQnVmZmVyVmlld0wgPT09IGlzQnVmZmVyVmlld1IgJiYgc2FtZUNsYXNzKGxocywgcmhzKVxuICAgICAgICAgICAgICAgICYmIGJ1ZmZlckVxdWFsKChsaHMgYXMgQXJyYXlCdWZmZXJWaWV3KS5idWZmZXIsIChyaHMgYXMgQXJyYXlCdWZmZXJWaWV3KS5idWZmZXIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gb3RoZXIgSXRlcmFibGVcbiAgICAgICAgY29uc3QgaXNJdGVyYWJsZUwgPSBpc0l0ZXJhYmxlKGxocyk7XG4gICAgICAgIGNvbnN0IGlzSXRlcmFibGVSID0gaXNJdGVyYWJsZShyaHMpO1xuICAgICAgICBpZiAoaXNJdGVyYWJsZUwgfHwgaXNJdGVyYWJsZVIpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0l0ZXJhYmxlTCA9PT0gaXNJdGVyYWJsZVIgJiYgYXJyYXlFcXVhbChbLi4uKGxocyBhcyB1bmtub3duW10pXSwgWy4uLihyaHMgYXMgdW5rbm93bltdKV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChzYW1lQ2xhc3MobGhzLCByaHMpKSB7XG4gICAgICAgIGNvbnN0IGtleXNMID0gbmV3IFNldChPYmplY3Qua2V5cyhsaHMpKTtcbiAgICAgICAgY29uc3Qga2V5c1IgPSBuZXcgU2V0KE9iamVjdC5rZXlzKHJocykpO1xuICAgICAgICBpZiAoa2V5c0wuc2l6ZSAhPT0ga2V5c1Iuc2l6ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGtleXNMKSB7XG4gICAgICAgICAgICBpZiAoIWtleXNSLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGtleXNMKSB7XG4gICAgICAgICAgICBpZiAoIWRlZXBFcXVhbCgobGhzIGFzIFVua25vd25PYmplY3QpW2tleV0sIChyaHMgYXMgVW5rbm93bk9iamVjdClba2V5XSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBsaHMpIHtcbiAgICAgICAgICAgIGlmICghKGtleSBpbiByaHMpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGtleXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gcmhzKSB7XG4gICAgICAgICAgICBpZiAoIShrZXkgaW4gbGhzKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGtleXMuYWRkKGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2Yga2V5cykge1xuICAgICAgICAgICAgaWYgKCFkZWVwRXF1YWwoKGxocyBhcyBVbmtub3duT2JqZWN0KVtrZXldLCAocmhzIGFzIFVua25vd25PYmplY3QpW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBSZWdFeHAgKi9cbmZ1bmN0aW9uIGNsb25lUmVnRXhwKHJlZ2V4cDogUmVnRXhwKTogUmVnRXhwIHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgUmVnRXhwKHJlZ2V4cC5zb3VyY2UsIHJlZ2V4cC5mbGFncyk7XG4gICAgcmVzdWx0Lmxhc3RJbmRleCA9IHJlZ2V4cC5sYXN0SW5kZXg7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBBcnJheUJ1ZmZlciAqL1xuZnVuY3Rpb24gY2xvbmVBcnJheUJ1ZmZlcihhcnJheUJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBBcnJheUJ1ZmZlciB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IEFycmF5QnVmZmVyKGFycmF5QnVmZmVyLmJ5dGVMZW5ndGgpO1xuICAgIG5ldyBVaW50OEFycmF5KHJlc3VsdCkuc2V0KG5ldyBVaW50OEFycmF5KGFycmF5QnVmZmVyKSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBEYXRhVmlldyAqL1xuZnVuY3Rpb24gY2xvbmVEYXRhVmlldyhkYXRhVmlldzogRGF0YVZpZXcpOiBEYXRhVmlldyB7XG4gICAgY29uc3QgYnVmZmVyID0gY2xvbmVBcnJheUJ1ZmZlcihkYXRhVmlldy5idWZmZXIpO1xuICAgIHJldHVybiBuZXcgRGF0YVZpZXcoYnVmZmVyLCBkYXRhVmlldy5ieXRlT2Zmc2V0LCBkYXRhVmlldy5ieXRlTGVuZ3RoKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBUeXBlZEFycmF5ICovXG5mdW5jdGlvbiBjbG9uZVR5cGVkQXJyYXk8VCBleHRlbmRzIFR5cGVkQXJyYXk+KHR5cGVkQXJyYXk6IFQpOiBUIHtcbiAgICBjb25zdCBidWZmZXIgPSBjbG9uZUFycmF5QnVmZmVyKHR5cGVkQXJyYXkuYnVmZmVyKTtcbiAgICByZXR1cm4gbmV3ICh0eXBlZEFycmF5LmNvbnN0cnVjdG9yIGFzIFR5cGVkQXJyYXlDb25zdHJ1Y3RvcikoYnVmZmVyLCB0eXBlZEFycmF5LmJ5dGVPZmZzZXQsIHR5cGVkQXJyYXkubGVuZ3RoKSBhcyBUO1xufVxuXG4vKiogQGludGVybmFsIGNoZWNrIG5lY2Vzc2FyeSB0byB1cGRhdGUgKi9cbmZ1bmN0aW9uIG5lZWRVcGRhdGUob2xkVmFsdWU6IHVua25vd24sIG5ld1ZhbHVlOiB1bmtub3duLCBleGNlcHRVbmRlZmluZWQ6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBpZiAob2xkVmFsdWUgIT09IG5ld1ZhbHVlKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAoZXhjZXB0VW5kZWZpbmVkICYmIHVuZGVmaW5lZCA9PT0gb2xkVmFsdWUpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBtZXJnZSBBcnJheSAqL1xuZnVuY3Rpb24gbWVyZ2VBcnJheSh0YXJnZXQ6IHVua25vd25bXSwgc291cmNlOiB1bmtub3duW10pOiB1bmtub3duW10ge1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBzb3VyY2UubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXRbaV07XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWVyZ2Uob2xkVmFsdWUsIHNvdXJjZVtpXSk7XG4gICAgICAgICFuZWVkVXBkYXRlKG9sZFZhbHVlLCBuZXdWYWx1ZSwgZmFsc2UpIHx8ICh0YXJnZXRbaV0gPSBuZXdWYWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgbWVyZ2UgU2V0ICovXG5mdW5jdGlvbiBtZXJnZVNldCh0YXJnZXQ6IFNldDx1bmtub3duPiwgc291cmNlOiBTZXQ8dW5rbm93bj4pOiBTZXQ8dW5rbm93bj4ge1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiBzb3VyY2UpIHtcbiAgICAgICAgdGFyZ2V0LmhhcyhpdGVtKSB8fCB0YXJnZXQuYWRkKG1lcmdlKHVuZGVmaW5lZCwgaXRlbSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG4vKiogQGludGVybmFsIG1lcmdlIE1hcCAqL1xuZnVuY3Rpb24gbWVyZ2VNYXAodGFyZ2V0OiBNYXA8dW5rbm93biwgdW5rbm93bj4sIHNvdXJjZTogTWFwPHVua25vd24sIHVua25vd24+KTogTWFwPHVua25vd24sIHVua25vd24+IHtcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBzb3VyY2UpIHtcbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXQuZ2V0KGspO1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1lcmdlKG9sZFZhbHVlLCB2KTtcbiAgICAgICAgIW5lZWRVcGRhdGUob2xkVmFsdWUsIG5ld1ZhbHVlLCBmYWxzZSkgfHwgdGFyZ2V0LnNldChrLCBuZXdWYWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgbWVyZ2Ugb2JqZWN0IHByb3BlcnR5ICovXG5mdW5jdGlvbiBtZXJnZU9iamVjdFByb3BlcnR5KHRhcmdldDogVW5rbm93bk9iamVjdCwgc291cmNlOiBVbmtub3duT2JqZWN0LCBrZXk6IHN0cmluZyB8IG51bWJlciB8IHN5bWJvbCk6IHZvaWQge1xuICAgIGlmICgnX19wcm90b19fJyAhPT0ga2V5ICYmICdjb25zdHJ1Y3RvcicgIT09IGtleSkge1xuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtrZXldO1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1lcmdlKG9sZFZhbHVlLCBzb3VyY2Vba2V5XSk7XG4gICAgICAgICFuZWVkVXBkYXRlKG9sZFZhbHVlLCBuZXdWYWx1ZSwgdHJ1ZSkgfHwgKHRhcmdldFtrZXldID0gbmV3VmFsdWUpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGRlZXBNZXJnZSgpICovXG5mdW5jdGlvbiBtZXJnZSh0YXJnZXQ6IHVua25vd24sIHNvdXJjZTogdW5rbm93bik6IHVua25vd24ge1xuICAgIGlmICh1bmRlZmluZWQgPT09IHNvdXJjZSB8fCB0YXJnZXQgPT09IHNvdXJjZSkge1xuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cbiAgICBpZiAoIWlzT2JqZWN0KHNvdXJjZSkpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICB9XG4gICAgLy8gUHJpbWl0aXZlIFdyYXBwZXIgT2JqZWN0cyAvIERhdGVcbiAgICBpZiAoc291cmNlLnZhbHVlT2YoKSAhPT0gc291cmNlKSB7XG4gICAgICAgIHJldHVybiBkZWVwRXF1YWwodGFyZ2V0LCBzb3VyY2UpID8gdGFyZ2V0IDogbmV3IChzb3VyY2UuY29uc3RydWN0b3IgYXMgT2JqZWN0Q29uc3RydWN0b3IpKHNvdXJjZS52YWx1ZU9mKCkpO1xuICAgIH1cbiAgICAvLyBSZWdFeHBcbiAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgIHJldHVybiBkZWVwRXF1YWwodGFyZ2V0LCBzb3VyY2UpID8gdGFyZ2V0IDogY2xvbmVSZWdFeHAoc291cmNlKTtcbiAgICB9XG4gICAgLy8gQXJyYXlCdWZmZXJcbiAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIGRlZXBFcXVhbCh0YXJnZXQsIHNvdXJjZSkgPyB0YXJnZXQgOiBjbG9uZUFycmF5QnVmZmVyKHNvdXJjZSk7XG4gICAgfVxuICAgIC8vIEFycmF5QnVmZmVyVmlld1xuICAgIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcoc291cmNlKSkge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IGlzVHlwZWRBcnJheShzb3VyY2UpID8gY2xvbmVUeXBlZEFycmF5KHNvdXJjZSkgOiBjbG9uZURhdGFWaWV3KHNvdXJjZSBhcyBEYXRhVmlldyk7XG4gICAgfVxuICAgIC8vIEFycmF5XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoc291cmNlKSkge1xuICAgICAgICByZXR1cm4gbWVyZ2VBcnJheShpc0FycmF5KHRhcmdldCkgPyB0YXJnZXQgOiBbXSwgc291cmNlKTtcbiAgICB9XG4gICAgLy8gU2V0XG4gICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIFNldCkge1xuICAgICAgICByZXR1cm4gbWVyZ2VTZXQodGFyZ2V0IGluc3RhbmNlb2YgU2V0ID8gdGFyZ2V0IDogbmV3IFNldCgpLCBzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBNYXBcbiAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgTWFwKSB7XG4gICAgICAgIHJldHVybiBtZXJnZU1hcCh0YXJnZXQgaW5zdGFuY2VvZiBNYXAgPyB0YXJnZXQgOiBuZXcgTWFwKCksIHNvdXJjZSk7XG4gICAgfVxuXG4gICAgY29uc3Qgb2JqID0gaXNPYmplY3QodGFyZ2V0KSA/IHRhcmdldCA6IHt9O1xuICAgIGlmIChzYW1lQ2xhc3ModGFyZ2V0LCBzb3VyY2UpKSB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHNvdXJjZSkpIHtcbiAgICAgICAgICAgIG1lcmdlT2JqZWN0UHJvcGVydHkob2JqIGFzIFVua25vd25PYmplY3QsIHNvdXJjZSBhcyBVbmtub3duT2JqZWN0LCBrZXkpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBtZXJnZU9iamVjdFByb3BlcnR5KG9iaiBhcyBVbmtub3duT2JqZWN0LCBzb3VyY2UgYXMgVW5rbm93bk9iamVjdCwga2V5KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIEBlbiBSZWN1cnNpdmVseSBtZXJnZXMgb3duIGFuZCBpbmhlcml0ZWQgZW51bWVyYWJsZSBzdHJpbmcga2V5ZWQgcHJvcGVydGllcyBvZiBzb3VyY2Ugb2JqZWN0cyBpbnRvIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu5YaN5biw55qE44Oe44O844K444KS5a6f6KGMXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWVwTWVyZ2U8VCwgUzEsIFMyLCBTMywgUzQsIFM1LCBTNiwgUzcsIFM4LCBTOT4oXG4gICAgdGFyZ2V0OiBULFxuICAgIC4uLnNvdXJjZXM6IFtTMSwgUzI/LCBTMz8sIFM0PywgUzU/LCBTNj8sIFM3PywgUzg/LCBTOT8sIC4uLnVua25vd25bXV1cbik6IFQgJiBTMSAmIFMyICYgUzMgJiBTNCAmIFM1ICYgUzYgJiBTNyAmIFM4ICYgUzk7XG5leHBvcnQgZnVuY3Rpb24gZGVlcE1lcmdlPFg+KHRhcmdldDogdW5rbm93biwgLi4uc291cmNlczogdW5rbm93bltdKTogWDtcbmV4cG9ydCBmdW5jdGlvbiBkZWVwTWVyZ2UodGFyZ2V0OiB1bmtub3duLCAuLi5zb3VyY2VzOiB1bmtub3duW10pOiB1bmtub3duIHtcbiAgICBsZXQgcmVzdWx0ID0gdGFyZ2V0O1xuICAgIGZvciAoY29uc3Qgc291cmNlIG9mIHNvdXJjZXMpIHtcbiAgICAgICAgcmVzdWx0ID0gbWVyZ2UocmVzdWx0LCBzb3VyY2UpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIGRlZXAgY29weSBpbnN0YW5jZSBvZiBzb3VyY2Ugb2JqZWN0LlxuICogQGphIOODh+OCo+ODvOODl+OCs+ODlOODvOOCquODluOCuOOCp+OCr+ODiOOBrueUn+aIkFxuICpcbiAqIEBzZWUgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL3N0cnVjdHVyZWRDbG9uZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVlcENvcHk8VD4oc3JjOiBUKTogVCB7XG4gICAgcmV0dXJuIGRlZXBNZXJnZSh1bmRlZmluZWQsIHNyYyk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHR5cGUge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBVbmtub3duT2JqZWN0LFxuICAgIEFjY2Vzc2libGUsXG4gICAgTnVsbGlzaCxcbiAgICBUeXBlLFxuICAgIENsYXNzLFxuICAgIENvbnN0cnVjdG9yLFxufSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBAZW4gTWl4aW4gY2xhc3MncyBiYXNlIGludGVyZmFjZS5cbiAqIEBqYSBNaXhpbiDjgq/jg6njgrnjga7ln7rlupXjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqlcbiAqL1xuZXhwb3J0IGRlY2xhcmUgY2xhc3MgTWl4aW5DbGFzcyB7XG4gICAgLyoqXG4gICAgICogQGVuIGNhbGwgbWl4aW4gc291cmNlIGNsYXNzJ3MgYHN1cGVyKClgLiA8YnI+XG4gICAgICogICAgIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBjYWxsZWQgZnJvbSBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEgTWl4aW4g44Kv44Op44K544Gu5Z+65bqV44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pIDxicj5cbiAgICAgKiAgICAg44Kz44Oz44K544OI44Op44Kv44K/44GL44KJ5ZG844G244GT44Go44KS5oOz5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3JjQ2xhc3NcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiB0YXJnZXQgY2xhc3MgbmFtZS4gZXgpIGZyb20gUzEgYXZhaWxhYmxlXG4gICAgICogIC0gYGphYCDjgrPjg7Pjgrnjg4jjg6njgq/jg4jjgZnjgovjgq/jg6njgrnlkI3jgpLmjIflrpogZXgpIFMxIOOBi+OCieaMh+WumuWPr+iDvVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gcGFyYW1ldGVyc1xuICAgICAqICAtIGBqYWAg44Kz44Oz44K544OI44Op44Kv44OI44Gr5L2/55So44GZ44KL5byV5pWwXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHN1cGVyPFQgZXh0ZW5kcyBDbGFzcz4oc3JjQ2xhc3M6IFQsIC4uLmFyZ3M6IENvbnN0cnVjdG9yUGFyYW1ldGVyczxUPik6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIGlucHV0IGNsYXNzIGlzIG1peGluZWQgKGV4Y2x1ZGluZyBvd24gY2xhc3MpLlxuICAgICAqIEBqYSDmjIflrprjgq/jg6njgrnjgYwgTWl4aW4g44GV44KM44Gm44GE44KL44GL56K66KqNICjoh6rouqvjga7jgq/jg6njgrnjga/lkKvjgb7jgozjgarjgYQpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWl4ZWRDbGFzc1xuICAgICAqICAtIGBlbmAgc2V0IHRhcmdldCBjbGFzcyBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5a++6LGh44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGlzTWl4ZWRXaXRoPFQgZXh0ZW5kcyBvYmplY3Q+KG1peGVkQ2xhc3M6IENvbnN0cnVjdG9yPFQ+KTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZW4gTWl4ZWQgc3ViIGNsYXNzIGNvbnN0cnVjdG9yIGRlZmluaXRpb25zLlxuICogQGphIOWQiOaIkOOBl+OBn+OCteODluOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1peGluQ29uc3RydWN0b3I8QiBleHRlbmRzIENsYXNzLCBVIGV4dGVuZHMgb2JqZWN0PiBleHRlbmRzIFR5cGU8VT4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBjb25zdHJ1Y3RvclxuICAgICAqIEBqYSDjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBiYXNlIGNsYXNzIGFyZ3VtZW50c1xuICAgICAqICAtIGBqYWAg5Z+65bqV44Kv44Op44K544Gr5oyH5a6a44GX44Gf5byV5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHVuaW9uIHR5cGUgb2YgY2xhc3NlcyB3aGVuIGNhbGxpbmcge0BsaW5rIG1peGluc30oKVxuICAgICAqICAtIGBqYWAge0BsaW5rIG1peGluc30oKSDjgavmuKHjgZfjgZ/jgq/jg6njgrnjga7pm4blkIhcbiAgICAgKi9cbiAgICBuZXcoLi4uYXJnczogQ29uc3RydWN0b3JQYXJhbWV0ZXJzPEI+KTogVTtcbn1cblxuLyoqXG4gKiBAZW4gRGVmaW5pdGlvbiBvZiB7QGxpbmsgc2V0TWl4Q2xhc3NBdHRyaWJ1dGV9IGZ1bmN0aW9uJ3MgYXJndW1lbnRzLlxuICogQGphIHtAbGluayBzZXRNaXhDbGFzc0F0dHJpYnV0ZX0g44Gu5Y+W44KK44GG44KL5byV5pWw5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWl4Q2xhc3NBdHRyaWJ1dGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBTdXBwcmVzcyBwcm92aWRpbmcgY29uc3RydWN0b3ItdHJhcCBmb3IgdGhlIG1peGluIHNvdXJjZSBjbGFzcy4gSW4gdGhpcyBjYXNlLCBgaXNNaXhlZFdpdGhgLCBgaW5zdGFuY2VvZmAgYWxzbyBiZWNvbWVzIGludmFsaWQuIChmb3IgaW1wcm92aW5nIHBlcmZvcm1hbmNlKVxuICAgICAqIEBqYSBNaXhpbiBTb3VyY2Ug44Kv44Op44K544Gr5a++44GX44GmLCDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jg4jjg6njg4Pjg5fjgpLmipHmraIuIOOBk+OCjOOCkuaMh+WumuOBl+OBn+WgtOWQiCwgYGlzTWl4ZWRXaXRoYCwgYGluc3RhbmNlb2ZgIOOCgueEoeWKueOBq+OBquOCiy4gKOODkeODleOCqeODvOODnuODs+OCueaUueWWhClcbiAgICAgKi9cbiAgICBwcm90b0V4dGVuZHNPbmx5OiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldHVwIFtTeW1ib2wuaGFzSW5zdGFuY2VdIHByb3BlcnR5LiA8YnI+XG4gICAgICogICAgIFRoZSBjbGFzcyBkZXNpZ25hdGVkIGFzIGEgc291cmNlIG9mIHtAbGluayBtaXhpbnN9KCkgaGFzIFtTeW1ib2wuaGFzSW5zdGFuY2VdIHByb3BlcnR5IGltcGxpY2l0bHkuIDxicj5cbiAgICAgKiAgICAgSXQncyB1c2VkIHRvIGF2b2lkIGJlY29taW5nIHRoZSBiZWhhdmlvciBgaW5zdGFuY2VvZmAgZG9lc24ndCBpbnRlbmQgd2hlbiB0aGUgY2xhc3MgaXMgZXh0ZW5kZWQgZnJvbSB0aGUgbWl4aW5lZCBjbGFzcyB0aGUgb3RoZXIgcGxhY2UuXG4gICAgICogQGphIFtTeW1ib2wuaGFzSW5zdGFuY2VdIOODl+ODreODkeODhuOCo+ioreWumjxicj5cbiAgICAgKiAgICAge0BsaW5rIG1peGluc30oKSDjga7jgr3jg7zjgrnjgavmjIflrprjgZXjgozjgZ/jgq/jg6njgrnjga8gW1N5bWJvbC5oYXNJbnN0YW5jZV0g44KS5pqX6buZ55qE44Gr5YKZ44GI44KL44Gf44KBPGJyPlxuICAgICAqICAgICDjgZ3jga7jgq/jg6njgrnjgYzku5bjgafntpnmib/jgZXjgozjgabjgYTjgovloLTlkIggYGluc3RhbmNlb2ZgIOOBjOaEj+Wbs+OBl+OBquOBhOaMr+OCi+iInuOBhOOBqOOBquOCi+OBruOCkumBv+OBkeOCi+OBn+OCgeOBq+S9v+eUqOOBmeOCiy5cbiAgICAgKi9cbiAgICBpbnN0YW5jZU9mOiAoKGluc3Q6IG9iamVjdCkgPT4gYm9vbGVhbikgfCBOdWxsaXNoO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfb2JqUHJvdG90eXBlICAgICA9IE9iamVjdC5wcm90b3R5cGU7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9pbnN0YW5jZU9mICAgICAgID0gRnVuY3Rpb24ucHJvdG90eXBlW1N5bWJvbC5oYXNJbnN0YW5jZV07XG4vKiogQGludGVybmFsICovIGNvbnN0IF9vdmVycmlkZSAgICAgICAgID0gU3ltYm9sKCdvdmVycmlkZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfaXNJbmhlcml0ZWQgICAgICA9IFN5bWJvbCgnaXMtaW5oZXJpdGVkJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9jb25zdHJ1Y3RvcnMgICAgID0gU3ltYm9sKCdjb25zdHJ1Y3RvcnMnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NsYXNzQmFzZSAgICAgICAgPSBTeW1ib2woJ2NsYXNzLWJhc2UnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NsYXNzU291cmNlcyAgICAgPSBTeW1ib2woJ2NsYXNzLXNvdXJjZXMnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3RvRXh0ZW5kc09ubHkgPSBTeW1ib2woJ3Byb3RvLWV4dGVuZHMtb25seScpO1xuXG4vKiogQGludGVybmFsIGNvcHkgcHJvcGVydGllcyBjb3JlICovXG5mdW5jdGlvbiByZWZsZWN0UHJvcGVydGllcyh0YXJnZXQ6IFVua25vd25PYmplY3QsIHNvdXJjZTogb2JqZWN0LCBrZXk6IHN0cmluZyB8IHN5bWJvbCk6IHZvaWQge1xuICAgIHRyeSB7XG4gICAgICAgIGlmIChudWxsID09IHRhcmdldFtrZXldKSB7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc291cmNlLCBrZXkpIGFzIFByb3BlcnR5RGVjb3JhdG9yKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBub29wXG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIG9iamVjdCBwcm9wZXJ0aWVzIGNvcHkgbWV0aG9kICovXG5mdW5jdGlvbiBjb3B5UHJvcGVydGllcyh0YXJnZXQ6IG9iamVjdCwgc291cmNlOiBvYmplY3QpOiB2b2lkIHtcbiAgICBzb3VyY2UgJiYgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoc291cmNlKVxuICAgICAgICAuZmlsdGVyKGtleSA9PiAhLyhwcm90b3R5cGV8bmFtZXxjb25zdHJ1Y3RvcikvLnRlc3Qoa2V5KSlcbiAgICAgICAgLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIHJlZmxlY3RQcm9wZXJ0aWVzKHRhcmdldCBhcyBVbmtub3duT2JqZWN0LCBzb3VyY2UsIGtleSk7XG4gICAgICAgIH0pO1xuICAgIHNvdXJjZSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHNvdXJjZSlcbiAgICAgICAgLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIHJlZmxlY3RQcm9wZXJ0aWVzKHRhcmdldCBhcyBVbmtub3duT2JqZWN0LCBzb3VyY2UsIGtleSk7XG4gICAgICAgIH0pO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3Igc2V0TWl4Q2xhc3NBdHRyaWJ1dGUodGFyZ2V0LCAnaW5zdGFuY2VPZicpICovXG5mdW5jdGlvbiBzZXRJbnN0YW5jZU9mPFQgZXh0ZW5kcyBvYmplY3Q+KHRhcmdldDogQ29uc3RydWN0b3I8VD4sIG1ldGhvZDogKChpbnN0OiBvYmplY3QpID0+IGJvb2xlYW4pIHwgTnVsbGlzaCk6IHZvaWQge1xuICAgIGNvbnN0IGJlaGF2aW91ciA9IG1ldGhvZCA/PyAobnVsbCA9PT0gbWV0aG9kID8gdW5kZWZpbmVkIDogKChpOiBvYmplY3QpID0+IE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZi5jYWxsKHRhcmdldC5wcm90b3R5cGUsIGkpKSk7XG4gICAgY29uc3QgYXBwbGllZCA9IGJlaGF2aW91ciAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgX292ZXJyaWRlKTtcbiAgICBpZiAoIWFwcGxpZWQpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGFyZ2V0LCB7XG4gICAgICAgICAgICBbU3ltYm9sLmhhc0luc3RhbmNlXToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBiZWhhdmlvdXIsXG4gICAgICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW19vdmVycmlkZV06IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogYmVoYXZpb3VyID8gdHJ1ZSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gU2V0IHRoZSBNaXhpbiBjbGFzcyBhdHRyaWJ1dGUuXG4gKiBAamEgTWl4aW4g44Kv44Op44K544Gr5a++44GX44Gm5bGe5oCn44KS6Kit5a6aXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAvLyAncHJvdG9FeHRlbmRPbmx5J1xuICogY2xhc3MgQmFzZSB7IGNvbnN0cnVjdG9yKGEsIGIpIHt9IH07XG4gKiBjbGFzcyBNaXhBIHsgfTtcbiAqIHNldE1peENsYXNzQXR0cmlidXRlKE1peEEsICdwcm90b0V4dGVuZHNPbmx5Jyk7ICAvLyBmb3IgaW1wcm92aW5nIGNvbnN0cnVjdGlvbiBwZXJmb3JtYW5jZVxuICogY2xhc3MgTWl4QiB7IGNvbnN0cnVjdG9yKGMsIGQpIHt9IH07XG4gKlxuICogY2xhc3MgTWl4aW5DbGFzcyBleHRlbmRzIG1peGlucyhCYXNlLCBNaXhBLCBNaXhCKSB7XG4gKiAgICAgY29uc3RydWN0b3IoYSwgYiwgYywgZCl7XG4gKiAgICAgICAgIC8vIGNhbGxpbmcgYEJhc2VgIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHN1cGVyKGEsIGIpO1xuICpcbiAqICAgICAgICAgLy8gY2FsbGluZyBNaXhpbiBjbGFzcydzIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QSk7ICAgICAgICAvLyBubyBhZmZlY3RcbiAqICAgICAgICAgdGhpcy5zdXBlcihNaXhCLCBjLCBkKTtcbiAqICAgICB9XG4gKiB9XG4gKlxuICogY29uc3QgbWl4ZWQgPSBuZXcgTWl4aW5DbGFzcygpO1xuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBNaXhBKTsgICAgLy8gZmFsc2VcbiAqIGNvbnNvbGUubG9nKG1peGVkLmlzTWl4ZWRXaXRoKE1peEEpKTsgIC8vIGZhbHNlXG4gKlxuICogLy8gJ2luc3RhbmNlT2YnXG4gKiBjbGFzcyBCYXNlIHt9O1xuICogY2xhc3MgU291cmNlIHt9O1xuICogY2xhc3MgTWl4aW5DbGFzcyBleHRlbmRzIG1peGlucyhCYXNlLCBTb3VyY2UpIHt9O1xuICpcbiAqIGNsYXNzIE90aGVyIGV4dGVuZHMgU291cmNlIHt9O1xuICpcbiAqIGNvbnN0IG90aGVyID0gbmV3IE90aGVyKCk7XG4gKiBjb25zdCBtaXhlZCA9IG5ldyBNaXhpbkNsYXNzKCk7XG4gKiBjb25zb2xlLmxvZyhvdGhlciBpbnN0YW5jZW9mIFNvdXJjZSk7ICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhvdGhlciBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE1peGluQ2xhc3MpOyAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIEJhc2UpOyAgICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIFNvdXJjZSk7ICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyB0cnVlID8/P1xuICpcbiAqIHNldE1peENsYXNzQXR0cmlidXRlKE90aGVyLCAnaW5zdGFuY2VPZicpOyAvLyBvciBzZXRNaXhDbGFzc0F0dHJpYnV0ZShPdGhlciwgJ2luc3RhbmNlT2YnLCBudWxsKTtcbiAqIGNvbnNvbGUubG9nKG90aGVyIGluc3RhbmNlb2YgU291cmNlKTsgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG90aGVyIGluc3RhbmNlb2YgT3RoZXIpOyAgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgT3RoZXIpOyAgICAgICAgIC8vIGZhbHNlICFcbiAqXG4gKiAvLyBbQmVzdCBQcmFjdGljZV0gSWYgeW91IGRlY2xhcmUgdGhlIGRlcml2ZWQtY2xhc3MgZnJvbSBtaXhpbiwgeW91IHNob3VsZCBjYWxsIHRoZSBmdW5jdGlvbiBmb3IgYXZvaWRpbmcgYGluc3RhbmNlb2ZgIGxpbWl0YXRpb24uXG4gKiBjbGFzcyBEZXJpdmVkQ2xhc3MgZXh0ZW5kcyBNaXhpbkNsYXNzIHt9XG4gKiBzZXRNaXhDbGFzc0F0dHJpYnV0ZShEZXJpdmVkQ2xhc3MsICdpbnN0YW5jZU9mJyk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHNldCB0YXJnZXQgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg6Kit5a6a5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcGFyYW0gYXR0clxuICogIC0gYGVuYDpcbiAqICAgIC0gYHByb3RvRXh0ZW5kc09ubHlgOiBTdXBwcmVzcyBwcm92aWRpbmcgY29uc3RydWN0b3ItdHJhcCBmb3IgdGhlIG1peGluIHNvdXJjZSBjbGFzcy4gKGZvciBpbXByb3ZpbmcgcGVyZm9ybWFuY2UpXG4gKiAgICAtIGBpbnN0YW5jZU9mYCAgICAgIDogZnVuY3Rpb24gYnkgdXNpbmcgW1N5bWJvbC5oYXNJbnN0YW5jZV0gPGJyPlxuICogICAgICAgICAgICAgICAgICAgICAgICAgIERlZmF1bHQgYmVoYXZpb3VyIGlzIGB7IHJldHVybiB0YXJnZXQucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5zdGFuY2UpIH1gXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgSWYgc2V0IGBudWxsYCwgZGVsZXRlIFtTeW1ib2wuaGFzSW5zdGFuY2VdIHByb3BlcnR5LlxuICogIC0gYGphYDpcbiAqICAgIC0gYHByb3RvRXh0ZW5kc09ubHlgOiBNaXhpbiBTb3VyY2Ug44Kv44Op44K544Gr5a++44GX44GmLCDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jg4jjg6njg4Pjg5fjgpLmipHmraIgKOODkeODleOCqeODvOODnuODs+OCueaUueWWhClcbiAqICAgIC0gYGluc3RhbmNlT2ZgICAgICAgOiBbU3ltYm9sLmhhc0luc3RhbmNlXSDjgYzkvb/nlKjjgZnjgovplqLmlbDjgpLmjIflrpogPGJyPlxuICogICAgICAgICAgICAgICAgICAgICAgICAgIOaXouWumuOBp+OBryBgeyByZXR1cm4gdGFyZ2V0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGluc3RhbmNlKSB9YCDjgYzkvb/nlKjjgZXjgozjgotcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIGBudWxsYCDmjIflrprjgpLjgZnjgovjgaggW1N5bWJvbC5oYXNJbnN0YW5jZV0g44OX44Ot44OR44OG44Kj44KS5YmK6Zmk44GZ44KLXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRNaXhDbGFzc0F0dHJpYnV0ZTxUIGV4dGVuZHMgb2JqZWN0LCBVIGV4dGVuZHMga2V5b2YgTWl4Q2xhc3NBdHRyaWJ1dGU+KFxuICAgIHRhcmdldDogQ29uc3RydWN0b3I8VD4sXG4gICAgYXR0cjogVSxcbiAgICBtZXRob2Q/OiBNaXhDbGFzc0F0dHJpYnV0ZVtVXVxuKTogdm9pZCB7XG4gICAgc3dpdGNoIChhdHRyKSB7XG4gICAgICAgIGNhc2UgJ3Byb3RvRXh0ZW5kc09ubHknOlxuICAgICAgICAgICAgKHRhcmdldCBhcyBBY2Nlc3NpYmxlPENvbnN0cnVjdG9yPFQ+PilbX3Byb3RvRXh0ZW5kc09ubHldID0gdHJ1ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdpbnN0YW5jZU9mJzpcbiAgICAgICAgICAgIHNldEluc3RhbmNlT2YodGFyZ2V0LCBtZXRob2QpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIE1peGluIGZ1bmN0aW9uIGZvciBtdWx0aXBsZSBpbmhlcml0YW5jZS4gPGJyPlxuICogICAgIFJlc29sdmluZyB0eXBlIHN1cHBvcnQgZm9yIG1heGltdW0gMTAgY2xhc3Nlcy5cbiAqIEBqYSDlpJrph43ntpnmib/jga7jgZ/jgoHjga4gTWl4aW4gPGJyPlxuICogICAgIOacgOWkpyAxMCDjgq/jg6njgrnjga7lnovop6PmsbrjgpLjgrXjg53jg7zjg4hcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNsYXNzIEJhc2UgeyBjb25zdHJ1Y3RvcihhLCBiKSB7fSB9O1xuICogY2xhc3MgTWl4QSB7IGNvbnN0cnVjdG9yKGEsIGIpIHt9IH07XG4gKiBjbGFzcyBNaXhCIHsgY29uc3RydWN0b3IoYywgZCkge30gfTtcbiAqXG4gKiBjbGFzcyBNaXhpbkNsYXNzIGV4dGVuZHMgbWl4aW5zKEJhc2UsIE1peEEsIE1peEIpIHtcbiAqICAgICBjb25zdHJ1Y3RvcihhLCBiLCBjLCBkKXtcbiAqICAgICAgICAgLy8gY2FsbGluZyBgQmFzZWAgY29uc3RydWN0b3JcbiAqICAgICAgICAgc3VwZXIoYSwgYik7XG4gKlxuICogICAgICAgICAvLyBjYWxsaW5nIE1peGluIGNsYXNzJ3MgY29uc3RydWN0b3JcbiAqICAgICAgICAgdGhpcy5zdXBlcihNaXhBLCBhLCBiKTtcbiAqICAgICAgICAgdGhpcy5zdXBlcihNaXhCLCBjLCBkKTtcbiAqICAgICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYmFzZVxuICogIC0gYGVuYCBwcmltYXJ5IGJhc2UgY2xhc3MuIHN1cGVyKGFyZ3MpIGlzIHRoaXMgY2xhc3MncyBvbmUuXG4gKiAgLSBgamFgIOWfuuW6leOCr+ODqeOCueOCs+ODs+OCueODiOODqeOCr+OCvy4g5ZCM5ZCN44OX44Ot44OR44OG44KjLCDjg6Hjgr3jg4Pjg4njga/mnIDlhKrlhYjjgZXjgozjgosuIHN1cGVyKGFyZ3MpIOOBr+OBk+OBruOCr+ODqeOCueOBruOCguOBruOBjOaMh+WumuWPr+iDvS5cbiAqIEBwYXJhbSBzb3VyY2VzXG4gKiAgLSBgZW5gIG11bHRpcGxlIGV4dGVuZHMgY2xhc3NcbiAqICAtIGBqYWAg5ouh5by144Kv44Op44K544Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBtaXhpbmVkIGNsYXNzIGNvbnN0cnVjdG9yXG4gKiAgLSBgamFgIOWQiOaIkOOBleOCjOOBn+OCr+ODqeOCueOCs+ODs+OCueODiOODqeOCr+OCv1xuICovXG5leHBvcnQgZnVuY3Rpb24gbWl4aW5zPFxuICAgIEIgZXh0ZW5kcyBDbGFzcyxcbiAgICBTMSBleHRlbmRzIG9iamVjdCxcbiAgICBTMiBleHRlbmRzIG9iamVjdCxcbiAgICBTMyBleHRlbmRzIG9iamVjdCxcbiAgICBTNCBleHRlbmRzIG9iamVjdCxcbiAgICBTNSBleHRlbmRzIG9iamVjdCxcbiAgICBTNiBleHRlbmRzIG9iamVjdCxcbiAgICBTNyBleHRlbmRzIG9iamVjdCxcbiAgICBTOCBleHRlbmRzIG9iamVjdCxcbiAgICBTOSBleHRlbmRzIG9iamVjdD4oXG4gICAgYmFzZTogQixcbiAgICAuLi5zb3VyY2VzOiBbXG4gICAgICAgIENvbnN0cnVjdG9yPFMxPixcbiAgICAgICAgQ29uc3RydWN0b3I8UzI+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8UzM+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8UzQ+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8UzU+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8UzY+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8Uzc+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8Uzg+PyxcbiAgICAgICAgQ29uc3RydWN0b3I8Uzk+PyxcbiAgICAgICAgLi4uYW55W11cbiAgICBdKTogTWl4aW5Db25zdHJ1Y3RvcjxCLCBNaXhpbkNsYXNzICYgSW5zdGFuY2VUeXBlPEI+ICYgUzEgJiBTMiAmIFMzICYgUzQgJiBTNSAmIFM2ICYgUzcgJiBTOCAmIFM5PiB7XG5cbiAgICBsZXQgX2hhc1NvdXJjZUNvbnN0cnVjdG9yID0gZmFsc2U7XG5cbiAgICBjbGFzcyBfTWl4aW5CYXNlIGV4dGVuZHMgKGJhc2UgYXMgdW5rbm93biBhcyBDb25zdHJ1Y3RvcjxNaXhpbkNsYXNzPikge1xuXG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgW19jb25zdHJ1Y3RvcnNdOiBNYXA8Q29uc3RydWN0b3I8b2JqZWN0PiwgVW5rbm93bkZ1bmN0aW9uIHwgbnVsbD47XG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgW19jbGFzc0Jhc2VdOiBDb25zdHJ1Y3RvcjxvYmplY3Q+O1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKC4uLmFyZ3M6IHVua25vd25bXSkge1xuICAgICAgICAgICAgc3VwZXIoLi4uYXJncyk7XG5cbiAgICAgICAgICAgIGNvbnN0IGNvbnN0cnVjdG9ycyA9IG5ldyBNYXA8Q29uc3RydWN0b3I8b2JqZWN0PiwgVW5rbm93bkZ1bmN0aW9uPigpO1xuICAgICAgICAgICAgdGhpc1tfY29uc3RydWN0b3JzXSA9IGNvbnN0cnVjdG9ycztcbiAgICAgICAgICAgIHRoaXNbX2NsYXNzQmFzZV0gPSBiYXNlO1xuXG4gICAgICAgICAgICBpZiAoX2hhc1NvdXJjZUNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzcmNDbGFzcyBvZiBzb3VyY2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc3JjQ2xhc3NbX3Byb3RvRXh0ZW5kc09ubHldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoYW5kbGVyID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcGx5OiAodGFyZ2V0OiB1bmtub3duLCB0aGlzb2JqOiB1bmtub3duLCBhcmdsaXN0OiB1bmtub3duW10pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb2JqID0gbmV3IHNyY0NsYXNzKC4uLmFyZ2xpc3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3B5UHJvcGVydGllcyh0aGlzLCBvYmopO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBwcm94eSBmb3IgJ2NvbnN0cnVjdCcgYW5kIGNhY2hlIGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3RvcnMuc2V0KHNyY0NsYXNzLCBuZXcgUHJveHkoc3JjQ2xhc3MsIGhhbmRsZXIgYXMgUHJveHlIYW5kbGVyPG9iamVjdD4pKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHByb3RlY3RlZCBzdXBlcjxUIGV4dGVuZHMgQ2xhc3M+KHNyY0NsYXNzOiBULCAuLi5hcmdzOiBDb25zdHJ1Y3RvclBhcmFtZXRlcnM8VD4pOiB0aGlzIHtcbiAgICAgICAgICAgIGNvbnN0IG1hcCA9IHRoaXNbX2NvbnN0cnVjdG9yc107XG4gICAgICAgICAgICBjb25zdCBjdG9yID0gbWFwLmdldChzcmNDbGFzcyk7XG4gICAgICAgICAgICBpZiAoY3Rvcikge1xuICAgICAgICAgICAgICAgIGN0b3IuY2FsbCh0aGlzLCAuLi5hcmdzKTtcbiAgICAgICAgICAgICAgICBtYXAuc2V0KHNyY0NsYXNzLCBudWxsKTsgICAgLy8gcHJldmVudCBjYWxsaW5nIHR3aWNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBpc01peGVkV2l0aDxUIGV4dGVuZHMgb2JqZWN0PihzcmNDbGFzczogQ29uc3RydWN0b3I8VD4pOiBib29sZWFuIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbnN0cnVjdG9yID09PSBzcmNDbGFzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpc1tfY2xhc3NCYXNlXSA9PT0gc3JjQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXNbX2NsYXNzU291cmNlc10ucmVkdWNlKChwLCBjKSA9PiBwIHx8IChzcmNDbGFzcyA9PT0gYyksIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgW1N5bWJvbC5oYXNJbnN0YW5jZV0oaW5zdGFuY2U6IHVua25vd24pOiBib29sZWFuIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YuY2FsbChfTWl4aW5CYXNlLnByb3RvdHlwZSwgaW5zdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIFtfaXNJbmhlcml0ZWRdPFQgZXh0ZW5kcyBvYmplY3Q+KHNyY0NsYXNzOiBDb25zdHJ1Y3RvcjxUPik6IGJvb2xlYW4ge1xuICAgICAgICAgICAgY29uc3QgY3RvcnMgPSB0aGlzW19jb25zdHJ1Y3RvcnNdO1xuICAgICAgICAgICAgaWYgKGN0b3JzLmhhcyhzcmNDbGFzcykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgY3RvciBvZiBjdG9ycy5rZXlzKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mLmNhbGwoc3JjQ2xhc3MsIGN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByaXZhdGUgZ2V0IFtfY2xhc3NTb3VyY2VzXSgpOiBDb25zdHJ1Y3RvcjxvYmplY3Q+W10ge1xuICAgICAgICAgICAgcmV0dXJuIFsuLi50aGlzW19jb25zdHJ1Y3RvcnNdLmtleXMoKV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHNyY0NsYXNzIG9mIHNvdXJjZXMpIHtcbiAgICAgICAgLy8gcHJvdmlkZSBjdXN0b20gaW5zdGFuY2VvZlxuICAgICAgICBjb25zdCBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzcmNDbGFzcywgU3ltYm9sLmhhc0luc3RhbmNlKTtcbiAgICAgICAgaWYgKCFkZXNjIHx8IGRlc2Mud3JpdGFibGUpIHtcbiAgICAgICAgICAgIGNvbnN0IG9yZ0luc3RhbmNlT2YgPSBkZXNjID8gc3JjQ2xhc3NbU3ltYm9sLmhhc0luc3RhbmNlXSA6IF9pbnN0YW5jZU9mO1xuICAgICAgICAgICAgc2V0SW5zdGFuY2VPZihzcmNDbGFzcywgKGluc3Q6IFVua25vd25PYmplY3QpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci1udWxsaXNoLWNvYWxlc2NpbmdcbiAgICAgICAgICAgICAgICByZXR1cm4gb3JnSW5zdGFuY2VPZi5jYWxsKHNyY0NsYXNzLCBpbnN0KSB8fCAoKGluc3Q/LltfaXNJbmhlcml0ZWRdKSA/IChpbnN0W19pc0luaGVyaXRlZF0gYXMgVW5rbm93bkZ1bmN0aW9uKShzcmNDbGFzcykgOiBmYWxzZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBwcm92aWRlIHByb3RvdHlwZVxuICAgICAgICBjb3B5UHJvcGVydGllcyhfTWl4aW5CYXNlLnByb3RvdHlwZSwgc3JjQ2xhc3MucHJvdG90eXBlKTtcbiAgICAgICAgbGV0IHBhcmVudCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihzcmNDbGFzcy5wcm90b3R5cGUpO1xuICAgICAgICB3aGlsZSAoX29ialByb3RvdHlwZSAhPT0gcGFyZW50KSB7XG4gICAgICAgICAgICBjb3B5UHJvcGVydGllcyhfTWl4aW5CYXNlLnByb3RvdHlwZSwgcGFyZW50KTtcbiAgICAgICAgICAgIHBhcmVudCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihwYXJlbnQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNoZWNrIGNvbnN0cnVjdG9yXG4gICAgICAgIGlmICghX2hhc1NvdXJjZUNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICBfaGFzU291cmNlQ29uc3RydWN0b3IgPSAhc3JjQ2xhc3NbX3Byb3RvRXh0ZW5kc09ubHldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIF9NaXhpbkJhc2UgYXMgYW55O1xufVxuIiwiaW1wb3J0IHsgYXNzaWduVmFsdWUsIGRlZXBFcXVhbCB9IGZyb20gJy4vZGVlcC1jaXJjdWl0JztcbmltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duT2JqZWN0LFxuICAgIHR5cGUgQWNjZXNzaWJsZSxcbiAgICB0eXBlIE51bGxpc2gsXG4gICAgdHlwZSBXcml0YWJsZSxcbiAgICBpc0FycmF5LFxuICAgIGlzT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG59IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgdmVyaWZ5IH0gZnJvbSAnLi92ZXJpZnknO1xuXG4vKipcbiAqIEBlbiBDaGVjayB3aGV0aGVyIGlucHV0IHNvdXJjZSBoYXMgYSBwcm9wZXJ0eS5cbiAqIEBqYSDlhaXlipvlhYPjgYzjg5fjg63jg5Hjg4bjgqPjgpLmjIHjgaPjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXMoc3JjOiB1bmtub3duLCBwcm9wTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIG51bGwgIT0gc3JjICYmIGlzT2JqZWN0KHNyYykgJiYgKHByb3BOYW1lIGluIHNyYyk7XG59XG5cbi8qKlxuICogQGVuIEdldCBzaGFsbG93IGNvcHkgb2YgYHRhcmdldGAgd2hpY2ggaGFzIG9ubHkgYHBpY2tLZXlzYC5cbiAqIEBqYSBgcGlja0tleXNgIOOBp+aMh+WumuOBleOCjOOBn+ODl+ODreODkeODhuOCo+OBruOBv+OCkuaMgeOBpCBgdGFyZ2V0YCDjga4gU2hhbGxvdyBDb3B5IOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgY29weSBzb3VyY2Ugb2JqZWN0XG4gKiAgLSBgamFgIOOCs+ODlOODvOWFg+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIHBpY2tLZXlzXG4gKiAgLSBgZW5gIGNvcHkgdGFyZ2V0IGtleXNcbiAqICAtIGBqYWAg44Kz44OU44O85a++6LGh44Gu44Kt44O85LiA6KanXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwaWNrPFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBrZXlvZiBUPih0YXJnZXQ6IFQsIC4uLnBpY2tLZXlzOiBLW10pOiBXcml0YWJsZTxQaWNrPFQsIEs+PiB7XG4gICAgdmVyaWZ5KCd0eXBlT2YnLCAnb2JqZWN0JywgdGFyZ2V0KTtcbiAgICByZXR1cm4gcGlja0tleXMucmVkdWNlKChvYmosIGtleSkgPT4ge1xuICAgICAgICBrZXkgaW4gdGFyZ2V0ICYmIGFzc2lnblZhbHVlKG9iaiwga2V5LCB0YXJnZXRba2V5XSk7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfSwge30gYXMgV3JpdGFibGU8UGljazxULCBLPj4pO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgc2hhbGxvdyBjb3B5IG9mIGB0YXJnZXRgIHdpdGhvdXQgYG9taXRLZXlzYC5cbiAqIEBqYSBgb21pdEtleXNgIOOBp+aMh+WumuOBleOCjOOBn+ODl+ODreODkeODhuOCo+S7peWkluOBruOCreODvOOCkuaMgeOBpCBgdGFyZ2V0YCDjga4gU2hhbGxvdyBDb3B5IOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgY29weSBzb3VyY2Ugb2JqZWN0XG4gKiAgLSBgamFgIOOCs+ODlOODvOWFg+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIG9taXRLZXlzXG4gKiAgLSBgZW5gIG9taXQgdGFyZ2V0IGtleXNcbiAqICAtIGBqYWAg5YmK6Zmk5a++6LGh44Gu44Kt44O85LiA6KanXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvbWl0PFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBrZXlvZiBUPih0YXJnZXQ6IFQsIC4uLm9taXRLZXlzOiBLW10pOiBXcml0YWJsZTxPbWl0PFQsIEs+PiB7XG4gICAgdmVyaWZ5KCd0eXBlT2YnLCAnb2JqZWN0JywgdGFyZ2V0KTtcbiAgICBjb25zdCBvYmogPSB7fSBhcyBXcml0YWJsZTxPbWl0PFQsIEs+PjtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0YXJnZXQpKSB7XG4gICAgICAgICFvbWl0S2V5cy5pbmNsdWRlcyhrZXkgYXMgSykgJiYgYXNzaWduVmFsdWUob2JqLCBrZXksICh0YXJnZXQgYXMgVW5rbm93bk9iamVjdClba2V5XSk7XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogQGVuIEludmVydCB0aGUga2V5cyBhbmQgdmFsdWVzIG9mIGFuIG9iamVjdC4gVGhlIHZhbHVlcyBtdXN0IGJlIHNlcmlhbGl6YWJsZS5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7jgq3jg7zjgajlgKTjgpLpgIbou6LjgZnjgosuIOOBmeOBueOBpuOBruWApOOBjOODpuODi+ODvOOCr+OBp+OBguOCi+OBk+OBqOOBjOWJjeaPkFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IG9iamVjdFxuICogIC0gYGphYCDlr77osaHjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGludmVydDxUIGV4dGVuZHMgb2JqZWN0ID0gVW5rbm93bk9iamVjdD4odGFyZ2V0OiBvYmplY3QpOiBUIHtcbiAgICBjb25zdCByZXN1bHQgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0YXJnZXQpKSB7XG4gICAgICAgIGFzc2lnblZhbHVlKHJlc3VsdCwgKHRhcmdldCBhcyBVbmtub3duT2JqZWN0KVtrZXldIGFzIChzdHJpbmcgfCBudW1iZXIgfCBzeW1ib2wpLCBrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0IGFzIFQ7XG59XG5cbi8qKlxuICogQGVuIEdldCBzaGFsbG93IGNvcHkgb2YgZGlmZmVyZW5jZSBiZXR3ZWVuIGBiYXNlYCBhbmQgYHNyY2AuXG4gKiBAamEgYGJhc2VgIOOBqCBgc3JjYCDjga7lt67liIbjg5fjg63jg5Hjg4bjgqPjgpLjgoLjgaTjgqrjg5bjgrjjgqfjgq/jg4jjga4gU2hhbGxvdyBDb3B5IOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBiYXNlXG4gKiAgLSBgZW5gIGJhc2Ugb2JqZWN0XG4gKiAgLSBgamFgIOWfuua6luOBqOOBquOCi+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugb2JqZWN0XG4gKiAgLSBgamFgIOOCs+ODlOODvOWFg+OCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlmZjxUIGV4dGVuZHMgb2JqZWN0PihiYXNlOiBULCBzcmM6IFBhcnRpYWw8VD4pOiBQYXJ0aWFsPFQ+IHtcbiAgICB2ZXJpZnkoJ3R5cGVPZicsICdvYmplY3QnLCBiYXNlKTtcbiAgICB2ZXJpZnkoJ3R5cGVPZicsICdvYmplY3QnLCBzcmMpO1xuXG4gICAgY29uc3QgcmV0dmFsOiBQYXJ0aWFsPFQ+ID0ge307XG5cbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzcmMpKSB7XG4gICAgICAgIGlmICghZGVlcEVxdWFsKChiYXNlIGFzIFVua25vd25PYmplY3QpW2tleV0sIChzcmMgYXMgVW5rbm93bk9iamVjdClba2V5XSkpIHtcbiAgICAgICAgICAgIGFzc2lnblZhbHVlKHJldHZhbCwga2V5LCAoc3JjIGFzIFVua25vd25PYmplY3QpW2tleV0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHNoYWxsb3cgY29weSBvZiBgYmFzZWAgd2l0aG91dCBgZHJvcFZhbHVlYC5cbiAqIEBqYSBgZHJvcFZhbHVlYCDjgafmjIflrprjgZXjgozjgZ/jg5fjg63jg5Hjg4bjgqPlgKTku6XlpJbjga7jgq3jg7zjgpLmjIHjgaQgYHRhcmdldGAg44GuIFNoYWxsb3cgQ29weSDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmFzZVxuICogIC0gYGVuYCBiYXNlIG9iamVjdFxuICogIC0gYGphYCDln7rmupbjgajjgarjgovjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBkcm9wVmFsdWVzXG4gKiAgLSBgZW5gIHRhcmdldCB2YWx1ZS4gZGVmYXVsdDogYHVuZGVmaW5lZGAuXG4gKiAgLSBgamFgIOWvvuixoeOBruWApC4g5pei5a6a5YCkOiBgdW5kZWZpbmVkYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZHJvcDxUIGV4dGVuZHMgb2JqZWN0PihiYXNlOiBULCAuLi5kcm9wVmFsdWVzOiB1bmtub3duW10pOiBQYXJ0aWFsPFQ+IHtcbiAgICB2ZXJpZnkoJ3R5cGVPZicsICdvYmplY3QnLCBiYXNlKTtcblxuICAgIGNvbnN0IHZhbHVlcyA9IFsuLi5kcm9wVmFsdWVzXTtcbiAgICBpZiAoIXZhbHVlcy5sZW5ndGgpIHtcbiAgICAgICAgdmFsdWVzLnB1c2godW5kZWZpbmVkKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXR2YWwgPSB7IC4uLmJhc2UgfSBhcyBBY2Nlc3NpYmxlPFBhcnRpYWw8VD4+O1xuXG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoYmFzZSkpIHtcbiAgICAgICAgZm9yIChjb25zdCB2YWwgb2YgdmFsdWVzKSB7XG4gICAgICAgICAgICBpZiAoZGVlcEVxdWFsKHZhbCwgcmV0dmFsW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJldHZhbFtrZXldO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLyoqXG4gKiBAZW4gSWYgdGhlIHZhbHVlIG9mIHRoZSBuYW1lZCBwcm9wZXJ0eSBpcyBhIGZ1bmN0aW9uIHRoZW4gaW52b2tlIGl0OyBvdGhlcndpc2UsIHJldHVybiBpdC5cbiAqIEBqYSBvYmplY3Qg44GuIHByb3BlcnR5IOOBjOODoeOCveODg+ODieOBquOCieOBneOBruWun+ihjOe1kOaenOOCkiwg44OX44Ot44OR44OG44Kj44Gq44KJ44Gd44Gu5YCk44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogLSBgZW5gIE9iamVjdCB0byBtYXliZSBpbnZva2UgZnVuY3Rpb24gYHByb3BlcnR5YCBvbi5cbiAqIC0gYGphYCDoqZXkvqHjgZnjgovjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBwcm9wZXJ0eVxuICogLSBgZW5gIFRoZSBmdW5jdGlvbiBieSBuYW1lIHRvIGludm9rZSBvbiBgb2JqZWN0YC5cbiAqIC0gYGphYCDoqZXkvqHjgZnjgovjg5fjg63jg5Hjg4bjgqPlkI1cbiAqIEBwYXJhbSBmYWxsYmFja1xuICogLSBgZW5gIFRoZSB2YWx1ZSB0byBiZSByZXR1cm5lZCBpbiBjYXNlIGBwcm9wZXJ0eWAgZG9lc24ndCBleGlzdCBvciBpcyB1bmRlZmluZWQuXG4gKiAtIGBqYWAg5a2Y5Zyo44GX44Gq44GL44Gj44Gf5aC05ZCI44GuIGZhbGxiYWNrIOWApFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzdWx0PFQgPSBhbnk+KHRhcmdldDogb2JqZWN0IHwgTnVsbGlzaCwgcHJvcGVydHk6IHN0cmluZyB8IHN0cmluZ1tdLCBmYWxsYmFjaz86IFQpOiBUIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgY29uc3QgcHJvcHMgPSBpc0FycmF5KHByb3BlcnR5KSA/IHByb3BlcnR5IDogW3Byb3BlcnR5XTtcbiAgICBpZiAoIXByb3BzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gaXNGdW5jdGlvbihmYWxsYmFjaykgPyBmYWxsYmFjay5jYWxsKHRhcmdldCkgOiBmYWxsYmFjayBhcyBUO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc29sdmUgPSAobzogdW5rbm93biwgcDogdW5rbm93bik6IHVua25vd24gPT4ge1xuICAgICAgICByZXR1cm4gaXNGdW5jdGlvbihwKSA/IHAuY2FsbChvKSA6IHA7XG4gICAgfTtcblxuICAgIGxldCBvYmogPSB0YXJnZXQgYXMgVW5rbm93bk9iamVjdDtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgcHJvcHMpIHtcbiAgICAgICAgY29uc3QgcHJvcCA9IG51bGwgPT0gb2JqID8gdW5kZWZpbmVkIDogb2JqW25hbWVdO1xuICAgICAgICBpZiAodW5kZWZpbmVkID09PSBwcm9wKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzb2x2ZShvYmosIGZhbGxiYWNrKSBhcyBUO1xuICAgICAgICB9XG4gICAgICAgIG9iaiA9IHJlc29sdmUob2JqLCBwcm9wKSBhcyBVbmtub3duT2JqZWN0O1xuICAgIH1cbiAgICByZXR1cm4gb2JqIGFzIHVua25vd24gYXMgVDtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBjYWxsYWJsZSgpOiB1bmtub3duIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVzZS1iZWZvcmUtZGVmaW5lXG4gICAgcmV0dXJuIGFjY2Vzc2libGU7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGFjY2Vzc2libGU6IHVua25vd24gPSBuZXcgUHJveHkoY2FsbGFibGUsIHtcbiAgICBnZXQ6ICh0YXJnZXQ6IGFueSwgbmFtZSkgPT4ge1xuICAgICAgICBjb25zdCBwcm9wID0gdGFyZ2V0W25hbWVdO1xuICAgICAgICBpZiAobnVsbCAhPSBwcm9wKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvcDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBhY2Nlc3NpYmxlO1xuICAgICAgICB9XG4gICAgfSxcbn0pO1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBjcmVhdGUoKTogdW5rbm93biB7XG4gICAgY29uc3Qgc3R1YiA9IG5ldyBQcm94eSh7fSwge1xuICAgICAgICBnZXQ6ICh0YXJnZXQ6IGFueSwgbmFtZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcHJvcCA9IHRhcmdldFtuYW1lXTtcbiAgICAgICAgICAgIGlmIChudWxsICE9IHByb3ApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvcDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjY2Vzc2libGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoc3R1YiwgJ3N0dWInLCB7XG4gICAgICAgIHZhbHVlOiB0cnVlLFxuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc3R1Yjtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHNhZmUgYWNjZXNzaWJsZSBvYmplY3QuXG4gKiBAamEg5a6J5YWo44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kq44OW44K444Kn44Kv44OI44Gu5Y+W5b6XXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBzYWZlV2luZG93ID0gc2FmZShnbG9iYWxUaGlzLndpbmRvdyk7XG4gKiBjb25zb2xlLmxvZyhudWxsICE9IHNhZmVXaW5kb3cuZG9jdW1lbnQpOyAgICAvLyB0cnVlXG4gKiBjb25zdCBkaXYgPSBzYWZlV2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICogY29uc29sZS5sb2cobnVsbCAhPSBkaXYpOyAgICAvLyB0cnVlXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIEEgcmVmZXJlbmNlIG9mIGFuIG9iamVjdCB3aXRoIGEgcG9zc2liaWxpdHkgd2hpY2ggZXhpc3RzLlxuICogIC0gYGphYCDlrZjlnKjjgZfjgYbjgovjgqrjg5bjgrjjgqfjgq/jg4jjga7lj4LnhadcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJlYWxpdHkgb3Igc3R1YiBpbnN0YW5jZS5cbiAqICAtIGBqYWAg5a6f5L2T44G+44Gf44Gv44K544K/44OW44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYWZlPFQ+KHRhcmdldDogVCk6IFQge1xuICAgIHJldHVybiB0YXJnZXQgfHwgY3JlYXRlKCkgYXMgVDtcbn1cbiIsImltcG9ydCB0eXBlIHsgVW5rbm93bkZ1bmN0aW9uIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBnZXRHbG9iYWwgfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgeyBzYWZlIH0gZnJvbSAnLi9zYWZlJztcblxuLyoqXG4gKiBAZW4gVHlwZSBvZiBoYW5kbGUgZm9yIHRpbWVyIGZ1bmN0aW9ucy5cbiAqIEBqYSDjgr/jgqTjg57jg7zplqLmlbDjgavkvb/nlKjjgZnjgovjg4/jg7Pjg4njg6vlnotcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUaW1lckhhbmRsZSB7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktb2JqZWN0LXR5cGVcblxuLyoqXG4gKiBAZW4gVHlwZSBvZiB0aW1lciBzdGFydCBmdW5jdGlvbnMuXG4gKiBAamEg44K/44Kk44Oe44O86ZaL5aeL6Zai5pWw44Gu5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFRpbWVyU3RhcnRGdW5jdGlvbiA9IChoYW5kbGVyOiBVbmtub3duRnVuY3Rpb24sIHRpbWVvdXQ/OiBudW1iZXIsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gVGltZXJIYW5kbGU7XG5cbi8qKlxuICogQGVuIFR5cGUgb2YgdGltZXIgc3RvcCBmdW5jdGlvbnMuXG4gKiBAamEg44K/44Kk44Oe44O85YGc5q2i6Zai5pWw44Gu5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFRpbWVyU3RvcEZ1bmN0aW9uID0gKGhhbmRsZTogVGltZXJIYW5kbGUpID0+IHZvaWQ7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBUaW1lckNvbnRleHQge1xuICAgIHNldFRpbWVvdXQ6IFRpbWVyU3RhcnRGdW5jdGlvbjtcbiAgICBjbGVhclRpbWVvdXQ6IFRpbWVyU3RvcEZ1bmN0aW9uO1xuICAgIHNldEludGVydmFsOiBUaW1lclN0YXJ0RnVuY3Rpb247XG4gICAgY2xlYXJJbnRlcnZhbDogVGltZXJTdG9wRnVuY3Rpb247XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Jvb3QgPSBnZXRHbG9iYWwoKSBhcyB1bmtub3duIGFzIFRpbWVyQ29udGV4dDtcbmNvbnN0IHNldFRpbWVvdXQ6IFRpbWVyU3RhcnRGdW5jdGlvbiAgID0gc2FmZShfcm9vdC5zZXRUaW1lb3V0KS5iaW5kKF9yb290KTtcbmNvbnN0IGNsZWFyVGltZW91dDogVGltZXJTdG9wRnVuY3Rpb24gID0gc2FmZShfcm9vdC5jbGVhclRpbWVvdXQpLmJpbmQoX3Jvb3QpO1xuY29uc3Qgc2V0SW50ZXJ2YWw6IFRpbWVyU3RhcnRGdW5jdGlvbiAgPSBzYWZlKF9yb290LnNldEludGVydmFsKS5iaW5kKF9yb290KTtcbmNvbnN0IGNsZWFySW50ZXJ2YWw6IFRpbWVyU3RvcEZ1bmN0aW9uID0gc2FmZShfcm9vdC5jbGVhckludGVydmFsKS5iaW5kKF9yb290KTtcblxuZXhwb3J0IHtcbiAgICBzZXRUaW1lb3V0LFxuICAgIGNsZWFyVGltZW91dCxcbiAgICBzZXRJbnRlcnZhbCxcbiAgICBjbGVhckludGVydmFsLFxufTtcbiIsImltcG9ydCB7XG4gICAgdHlwZSBVbmtub3duRnVuY3Rpb24sXG4gICAgdHlwZSBQcmltaXRpdmUsXG4gICAgdHlwZSBUeXBlZERhdGEsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNCb29sZWFuLFxuICAgIGlzT2JqZWN0LFxufSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGludmVydCB9IGZyb20gJy4vb2JqZWN0JztcbmltcG9ydCB7XG4gICAgdHlwZSBUaW1lckhhbmRsZSxcbiAgICBzZXRUaW1lb3V0LFxuICAgIGNsZWFyVGltZW91dCxcbn0gZnJvbSAnLi90aW1lcic7XG5cbi8qKlxuICogQGVuIEVuc3VyZSBhc3luY2hyb25vdXMgZXhlY3V0aW9uLlxuICogQGphIOmdnuWQjOacn+Wun+ihjOOCkuS/neiovFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogdm9pZCBwb3N0KCgpID0+IGV4ZWMoYXJnKSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgaW1wbGVtZW50IGFzIGZ1bmN0aW9uIHNjb3BlLlxuICogIC0gYGphYCDplqLmlbDjgrnjgrPjg7zjg5fjgajjgZfjgablrp/oo4VcbiovXG5leHBvcnQgZnVuY3Rpb24gcG9zdDxUPihleGVjdXRvcjogKCkgPT4gVCk6IFByb21pc2U8VD4ge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGV4ZWN1dG9yKTtcbn1cblxuLyoqXG4gKiBAZW4gR2VuZXJpYyBOby1PcGVyYXRpb24uXG4gKiBAamEg5rGO55SoIE5vLU9wZXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9vcCguLi5hcmdzOiB1bmtub3duW10pOiBhbnkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycywgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIC8vIG5vb3Bcbn1cblxuLyoqXG4gKiBAZW4gV2FpdCBmb3IgdGhlIGRlc2lnbmF0aW9uIGVsYXBzZS5cbiAqIEBqYSDmjIflrprmmYLplpPlh6bnkIbjgpLlvoXmqZ9cbiAqXG4gKiBAcGFyYW0gZWxhcHNlXG4gKiAgLSBgZW5gIHdhaXQgZWxhcHNlIFttc2VjXS5cbiAqICAtIGBqYWAg5b6F5qmf5pmC6ZaTIFttc2VjXVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2xlZXAoZWxhcHNlOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIGVsYXBzZSkpO1xufVxuXG4vKipcbiAqIEBlbiBPcHRpb24gaW50ZXJmYWNlIGZvciB7QGxpbmsgZGVib3VuY2V9KCkuXG4gKiBAamEge0BsaW5rIGRlYm91bmNlfSgpIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs+OCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERlYm91bmNlT3B0aW9ucyB7XG4gICAgLyoqXG4gICAgICogQGVuIHRoZSBtYXhpbXVtIHRpbWUgYGZ1bmNgIGlzIGFsbG93ZWQgdG8gYmUgZGVsYXllZCBiZWZvcmUgaXQncyBpbnZva2VkLlxuICAgICAqIEBqYSDjgrPjg7zjg6vjg5Djg4Pjgq/jga7lkbzjgbPlh7rjgZfjgpLlvoXjgaTmnIDlpKfmmYLplpNcbiAgICAgKi9cbiAgICBtYXhXYWl0PzogbnVtYmVyO1xuICAgIC8qKlxuICAgICAqIEBlbiBTcGVjaWZ5IGB0cnVlYCBpZiB5b3Ugd2FudCB0byBjYWxsIHRoZSBjYWxsYmFjayBsZWFkaW5nIGVkZ2Ugb2YgdGhlIHdhaXRpbmcgdGltZS4gKGRlZmF1bHQ6IGZhbHNlKVxuICAgICAqIEBqYSDlvoXjgaHmmYLplpPjgavlr77jgZfjgabjgrPjg7zjg6vjg5Djg4Pjgq/jgpLlhYjlkbzjgbPlrp/ooYzjgZnjgovloLTlkIjjga8gYHRydWVgIOOCkuaMh+Wumi4gKGRlZmF1bHQ6IGZhbHNlKVxuICAgICAqL1xuICAgIGxlYWRpbmc/OiBib29sZWFuO1xuICAgIC8qKlxuICAgICAqIEBlbiBTcGVjaWZ5IGB0cnVlYCBpZiB5b3Ugd2FudCB0byBjYWxsIHRoZSBjYWxsYmFjayB0cmFpbGluZyBlZGdlIG9mIHRoZSB3YWl0aW5nIHRpbWUuIChkZWZhdWx0OiB0cnVlKVxuICAgICAqIEBqYSDlvoXjgaHmmYLplpPjgavlr77jgZfjgabjgrPjg7zjg6vjg5Djg4Pjgq/jgpLlvozlkbzjgbPlrp/ooYzjgZnjgovloLTlkIjjga8gYHRydWVgIOOCkuaMh+Wumi4gKGRlZmF1bHQ6IHRydWUpXG4gICAgICovXG4gICAgdHJhaWxpbmc/OiBib29sZWFuO1xufVxuXG5leHBvcnQgdHlwZSBEZWJvdW5jZWRGdW5jdGlvbjxUIGV4dGVuZHMgVW5rbm93bkZ1bmN0aW9uPiA9IFQgJiB7IGNhbmNlbCgpOiB2b2lkOyBmbHVzaCgpOiBSZXR1cm5UeXBlPFQ+OyBwZW5kaW5nKCk6IGJvb2xlYW47IH07XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgYXMgbG9uZyBhcyBpdCBjb250aW51ZXMgdG8gYmUgaW52b2tlZCwgd2lsbCBub3QgYmUgdHJpZ2dlcmVkLlxuICogQGphIOWRvOOBs+WHuuOBleOCjOOBpuOBi+OCiSB3YWl0IFttc2VjXSDntYzpgY7jgZnjgovjgb7jgaflrp/ooYzjgZfjgarjgYTplqLmlbDjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWwXG4gKiBAcGFyYW0gd2FpdFxuICogIC0gYGVuYCB3YWl0IGVsYXBzZSBbbXNlY10uXG4gKiAgLSBgamFgIOW+heapn+aZgumWkyBbbXNlY11cbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHNwZWNpZnkge0BsaW5rIERlYm91bmNlT3B0aW9uc30gb2JqZWN0IG9yIGB0cnVlYCB0byBmaXJlIHRoZSBjYWxsYmFjayBpbW1lZGlhdGVseS5cbiAqICAtIGBqYWAge0BsaW5rIERlYm91bmNlT3B0aW9uc30gb2JqZWN0IOOCguOBl+OBj+OBr+WNs+aZguOBq+OCs+ODvOODq+ODkOODg+OCr+OCkueZuueBq+OBmeOCi+OBqOOBjeOBryBgdHJ1ZWAg44KS5oyH5a6aLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVib3VuY2U8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZXhlY3V0b3I6IFQsIHdhaXQ6IG51bWJlciwgb3B0aW9ucz86IERlYm91bmNlT3B0aW9ucyB8IGJvb2xlYW4pOiBEZWJvdW5jZWRGdW5jdGlvbjxUPiB7XG4gICAgdHlwZSBSZXN1bHQgPSBSZXR1cm5UeXBlPFQ+IHwgdW5kZWZpbmVkO1xuXG4gICAgbGV0IGxhc3RBcmdzOiB1bmtub3duO1xuICAgIGxldCBsYXN0VGhpczogdW5rbm93bjtcbiAgICBsZXQgcmVzdWx0OiBSZXN1bHQ7XG4gICAgbGV0IGxhc3RDYWxsVGltZTogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICAgIGxldCB0aW1lcklkOiBUaW1lckhhbmRsZSB8IHVuZGVmaW5lZDtcbiAgICBsZXQgbGFzdEludm9rZVRpbWUgPSAwO1xuXG4gICAgY29uc3Qgd2FpdFZhbHVlID0gTnVtYmVyKHdhaXQpIHx8IDA7XG5cbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IGxlYWRpbmc6IGZhbHNlLCB0cmFpbGluZzogdHJ1ZSB9LCAoaXNCb29sZWFuKG9wdGlvbnMpID8geyBsZWFkaW5nOiBvcHRpb25zLCB0cmFpbGluZzogIW9wdGlvbnMgfSA6IG9wdGlvbnMpKTtcbiAgICBjb25zdCB7IGxlYWRpbmcsIHRyYWlsaW5nIH0gPSBvcHRzO1xuICAgIGNvbnN0IG1heFdhaXQgPSBudWxsICE9IG9wdHMubWF4V2FpdCA/IE1hdGgubWF4KE51bWJlcihvcHRzLm1heFdhaXQpIHx8IDAsIHdhaXRWYWx1ZSkgOiBudWxsO1xuXG4gICAgY29uc3QgaW52b2tlRnVuYyA9ICh0aW1lOiBudW1iZXIpOiBSZXN1bHQgPT4ge1xuICAgICAgICBjb25zdCBhcmdzID0gbGFzdEFyZ3M7XG4gICAgICAgIGNvbnN0IHRoaXNBcmcgPSBsYXN0VGhpcztcblxuICAgICAgICBsYXN0QXJncyA9IGxhc3RUaGlzID0gdW5kZWZpbmVkO1xuICAgICAgICBsYXN0SW52b2tlVGltZSA9IHRpbWU7XG4gICAgICAgIHJlc3VsdCA9IGV4ZWN1dG9yLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICBjb25zdCByZW1haW5pbmdXYWl0ID0gKHRpbWU6IG51bWJlcik6IG51bWJlciA9PiB7XG4gICAgICAgIGNvbnN0IHRpbWVTaW5jZUxhc3RDYWxsID0gdGltZSAtIGxhc3RDYWxsVGltZSE7XG4gICAgICAgIGNvbnN0IHRpbWVTaW5jZUxhc3RJbnZva2UgPSB0aW1lIC0gbGFzdEludm9rZVRpbWU7XG4gICAgICAgIGNvbnN0IHRpbWVXYWl0aW5nID0gd2FpdFZhbHVlIC0gdGltZVNpbmNlTGFzdENhbGw7XG4gICAgICAgIHJldHVybiBudWxsICE9IG1heFdhaXQgPyBNYXRoLm1pbih0aW1lV2FpdGluZywgbWF4V2FpdCAtIHRpbWVTaW5jZUxhc3RJbnZva2UpIDogdGltZVdhaXRpbmc7XG4gICAgfTtcblxuICAgIGNvbnN0IHNob3VsZEludm9rZSA9ICh0aW1lOiBudW1iZXIpOiBib29sZWFuID0+IHtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gbGFzdENhbGxUaW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0aW1lU2luY2VMYXN0Q2FsbCA9IHRpbWUgLSBsYXN0Q2FsbFRpbWU7XG4gICAgICAgIGNvbnN0IHRpbWVTaW5jZUxhc3RJbnZva2UgPSB0aW1lIC0gbGFzdEludm9rZVRpbWU7XG4gICAgICAgIHJldHVybiB0aW1lU2luY2VMYXN0Q2FsbCA+PSB3YWl0VmFsdWUgfHwgdGltZVNpbmNlTGFzdENhbGwgPCAwIHx8IChtYXhXYWl0ICE9PSBudWxsICYmIHRpbWVTaW5jZUxhc3RJbnZva2UgPj0gbWF4V2FpdCk7XG4gICAgfTtcblxuICAgIGNvbnN0IHRyYWlsaW5nRWRnZSA9ICh0aW1lOiBudW1iZXIpOiBSZXN1bHQgPT4ge1xuICAgICAgICB0aW1lcklkID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAodHJhaWxpbmcgJiYgbGFzdEFyZ3MpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnZva2VGdW5jKHRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIGxhc3RBcmdzID0gbGFzdFRoaXMgPSB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcblxuICAgIGNvbnN0IHRpbWVyRXhwaXJlZCA9ICgpOiBSZXN1bHQgfCB2b2lkID0+IHtcbiAgICAgICAgY29uc3QgdGltZSA9IERhdGUubm93KCk7XG4gICAgICAgIGlmIChzaG91bGRJbnZva2UodGltZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cmFpbGluZ0VkZ2UodGltZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGltZXJJZCA9IHNldFRpbWVvdXQodGltZXJFeHBpcmVkLCByZW1haW5pbmdXYWl0KHRpbWUpKTtcbiAgICB9O1xuXG4gICAgY29uc3QgbGVhZGluZ0VkZ2UgPSAodGltZTogbnVtYmVyKTogUmVzdWx0ID0+IHtcbiAgICAgICAgbGFzdEludm9rZVRpbWUgPSB0aW1lO1xuICAgICAgICB0aW1lcklkID0gc2V0VGltZW91dCh0aW1lckV4cGlyZWQsIHdhaXRWYWx1ZSk7XG4gICAgICAgIHJldHVybiBsZWFkaW5nID8gaW52b2tlRnVuYyh0aW1lKSA6IHJlc3VsdDtcbiAgICB9O1xuXG4gICAgY29uc3QgY2FuY2VsID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICBpZiAodW5kZWZpbmVkICE9PSB0aW1lcklkKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXJJZCk7XG4gICAgICAgIH1cbiAgICAgICAgbGFzdEludm9rZVRpbWUgPSAwO1xuICAgICAgICBsYXN0QXJncyA9IGxhc3RDYWxsVGltZSA9IGxhc3RUaGlzID0gdGltZXJJZCA9IHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgY29uc3QgZmx1c2ggPSAoKTogUmVzdWx0ID0+IHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZCA9PT0gdGltZXJJZCA/IHJlc3VsdCA6IHRyYWlsaW5nRWRnZShEYXRlLm5vdygpKTtcbiAgICB9O1xuXG4gICAgY29uc3QgcGVuZGluZyA9ICgpOiBib29sZWFuID0+IHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gdGltZXJJZDtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gZGVib3VuY2VkKHRoaXM6IHVua25vd24sIC4uLmFyZ3M6IHVua25vd25bXSk6IFJlc3VsdCB7XG4gICAgICAgIGNvbnN0IHRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgICBjb25zdCBpc0ludm9raW5nID0gc2hvdWxkSW52b2tlKHRpbWUpO1xuXG4gICAgICAgIGxhc3RBcmdzID0gYXJncztcbiAgICAgICAgbGFzdFRoaXMgPSB0aGlzOyAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgICAgIGxhc3RDYWxsVGltZSA9IHRpbWU7XG5cbiAgICAgICAgaWYgKGlzSW52b2tpbmcpIHtcbiAgICAgICAgICAgIGlmIChudWxsID09IHRpbWVySWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVhZGluZ0VkZ2UobGFzdENhbGxUaW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtYXhXYWl0KSB7XG4gICAgICAgICAgICAgICAgdGltZXJJZCA9IHNldFRpbWVvdXQodGltZXJFeHBpcmVkLCB3YWl0VmFsdWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBpbnZva2VGdW5jKGxhc3RDYWxsVGltZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGltZXJJZCA/Pz0gc2V0VGltZW91dCh0aW1lckV4cGlyZWQsIHdhaXRWYWx1ZSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgZGVib3VuY2VkLmNhbmNlbCA9IGNhbmNlbDtcbiAgICBkZWJvdW5jZWQuZmx1c2ggPSBmbHVzaDtcbiAgICBkZWJvdW5jZWQucGVuZGluZyA9IHBlbmRpbmc7XG5cbiAgICByZXR1cm4gZGVib3VuY2VkIGFzIERlYm91bmNlZEZ1bmN0aW9uPFQ+O1xufVxuXG4vKipcbiAqIEBlbiBPcHRpb24gaW50ZXJmYWNlIGZvciB7QGxpbmsgdGhyb3R0bGV9KCkuXG4gKiBAamEge0BsaW5rIHRocm90dGxlfSgpIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs+OCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRocm90dGxlT3B0aW9ucyB7XG4gICAgLyoqXG4gICAgICogQGVuIFNwZWNpZnkgYHRydWVgIGlmIHlvdSB3YW50IHRvIGNhbGwgdGhlIGNhbGxiYWNrIGxlYWRpbmcgZWRnZSBvZiB0aGUgd2FpdGluZyB0aW1lLiAoZGVmYXVsdDogdHJ1ZSlcbiAgICAgKiBAamEg5b6F44Gh5pmC6ZaT44Gr5a++44GX44Gm44Kz44O844Or44OQ44OD44Kv44KS5YWI5ZG844Gz5a6f6KGM44GZ44KL5aC05ZCI44GvIGB0cnVlYCDjgpLmjIflrpouIChkZWZhdWx0OiB0cnVlKVxuICAgICAqL1xuICAgIGxlYWRpbmc/OiBib29sZWFuO1xuICAgIC8qKlxuICAgICAqIEBlbiBTcGVjaWZ5IGB0cnVlYCBpZiB5b3Ugd2FudCB0byBjYWxsIHRoZSBjYWxsYmFjayB0cmFpbGluZyBlZGdlIG9mIHRoZSB3YWl0aW5nIHRpbWUuIChkZWZhdWx0OiB0cnVlKVxuICAgICAqIEBqYSDlvoXjgaHmmYLplpPjgavlr77jgZfjgabjgrPjg7zjg6vjg5Djg4Pjgq/jgpLlvozlkbzjgbPlrp/ooYzjgZnjgovloLTlkIjjga8gYHRydWVgIOOCkuaMh+Wumi4gKGRlZmF1bHQ6IHRydWUpXG4gICAgICovXG4gICAgdHJhaWxpbmc/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIHdoZW4gaW52b2tlZCwgd2lsbCBvbmx5IGJlIHRyaWdnZXJlZCBhdCBtb3N0IG9uY2UgZHVyaW5nIGEgZ2l2ZW4gdGltZS5cbiAqIEBqYSDplqLmlbDjga7lrp/ooYzjgpIgd2FpdCBbbXNlY10g44GrMeWbnuOBq+WItumZkFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgdGhyb3R0bGVkID0gdGhyb3R0bGUodXBhdGVQb3NpdGlvbiwgMTAwKTtcbiAqICQod2luZG93KS5zY3JvbGwodGhyb3R0bGVkKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBzZWVkIGZ1bmN0aW9uLlxuICogIC0gYGphYCDlr77osaHjga7plqLmlbBcbiAqIEBwYXJhbSBlbGFwc2VcbiAqICAtIGBlbmAgd2FpdCBlbGFwc2UgW21zZWNdLlxuICogIC0gYGphYCDlvoXmqZ/mmYLplpMgW21zZWNdXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGhyb3R0bGU8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZXhlY3V0b3I6IFQsIGVsYXBzZTogbnVtYmVyLCBvcHRpb25zPzogVGhyb3R0bGVPcHRpb25zKTogRGVib3VuY2VkRnVuY3Rpb248VD4ge1xuICAgIGNvbnN0IHsgbGVhZGluZywgdHJhaWxpbmcgfSA9IE9iamVjdC5hc3NpZ24oeyBsZWFkaW5nOiB0cnVlLCB0cmFpbGluZzogdHJ1ZSB9LCBvcHRpb25zKTtcbiAgICByZXR1cm4gZGVib3VuY2UoZXhlY3V0b3IsIGVsYXBzZSwge1xuICAgICAgICBsZWFkaW5nLFxuICAgICAgICB0cmFpbGluZyxcbiAgICAgICAgbWF4V2FpdDogZWxhcHNlLFxuICAgIH0pO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIGF0IG1vc3Qgb25lIHRpbWUsIG5vIG1hdHRlciBob3cgb2Z0ZW4geW91IGNhbGwgaXQuXG4gKiBAamEgMeW6puOBl+OBi+Wun+ihjOOBleOCjOOBquOBhOmWouaVsOOCkui/lOWNtC4gMuWbnuebruS7pemZjeOBr+acgOWIneOBruOCs+ODvOODq+OBruOCreODo+ODg+OCt+ODpeOCkui/lOWNtFxuICpcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBzZWVkIGZ1bmN0aW9uLlxuICogIC0gYGphYCDlr77osaHjga7plqLmlbBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9uY2U8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZXhlY3V0b3I6IFQpOiBUIHtcblxuICAgIGxldCBtZW1vOiB1bmtub3duO1xuICAgIHJldHVybiBmdW5jdGlvbiAodGhpczogdW5rbm93biwgLi4uYXJnczogdW5rbm93bltdKTogdW5rbm93biB7XG4gICAgICAgIGlmIChleGVjdXRvcikge1xuICAgICAgICAgICAgbWVtbyA9IGV4ZWN1dG9yLmNhbGwodGhpcywgLi4uYXJncyk7XG4gICAgICAgICAgICBleGVjdXRvciA9IG51bGwhO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtZW1vO1xuICAgIH0gYXMgVDtcblxufVxuXG4vKipcbiAqIEBlbiBSZXR1cm4gYSBkZWZlcnJlZCBleGVjdXRhYmxlIGZ1bmN0aW9uIG9iamVjdC5cbiAqIEBqYSDpgYXlu7blrp/ooYzlj6/og73jgarplqLmlbDjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHNjaGVkdWxlID0gc2NoZWR1bGVyKCk7XG4gKiBzY2hlZHVsZSgoKSA9PiB0YXNrMSgpKTtcbiAqIHNjaGVkdWxlKCgpID0+IHRhc2syKCkpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzY2hlZHVsZXIoKTogKGV4ZWM6ICgpID0+IHZvaWQpID0+IHZvaWQge1xuICAgIGxldCB0YXNrczogKCgpID0+IHZvaWQpW10gPSBbXTtcbiAgICBsZXQgaWQ6IFByb21pc2U8dm9pZD4gfCBudWxsO1xuXG4gICAgZnVuY3Rpb24gcnVuVGFza3MoKTogdm9pZCB7XG4gICAgICAgIGlkID0gbnVsbDtcbiAgICAgICAgY29uc3Qgd29yayA9IHRhc2tzO1xuICAgICAgICB0YXNrcyA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHRhc2sgb2Ygd29yaykge1xuICAgICAgICAgICAgdGFzaygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKHRhc2s6ICgpID0+IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgdGFza3MucHVzaCh0YXNrKTtcbiAgICAgICAgaWQgPz89IHBvc3QocnVuVGFza3MpO1xuICAgIH07XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgZXNjYXBlIGZ1bmN0aW9uIGZyb20gbWFwLlxuICogQGphIOaWh+Wtl+e9ruaPm+mWouaVsOOCkuS9nOaIkFxuICpcbiAqIEBwYXJhbSBtYXBcbiAqICAtIGBlbmAga2V5OiB0YXJnZXQgY2hhciwgdmFsdWU6IHJlcGxhY2UgY2hhclxuICogIC0gYGphYCBrZXk6IOe9ruaPm+WvvuixoSwgdmFsdWU6IOe9ruaPm+aWh+Wtl1xuICogQHJldHVybnNcbiAqICAtIGBlbmAgZXNwYWNlIGZ1bmN0aW9uXG4gKiAgLSBgamFgIOOCqOOCueOCseODvOODl+mWouaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRXNjYXBlcihtYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiAoc3JjOiBQcmltaXRpdmUpID0+IHN0cmluZyB7XG4gICAgY29uc3QgZXNjYXBlciA9IChtYXRjaDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICAgICAgcmV0dXJuIG1hcFttYXRjaF07XG4gICAgfTtcblxuICAgIGNvbnN0IHNvdXJjZSA9IGAoPzoke09iamVjdC5rZXlzKG1hcCkuam9pbignfCcpfSlgO1xuICAgIGNvbnN0IHJlZ2V4VGVzdCA9IFJlZ0V4cChzb3VyY2UpO1xuICAgIGNvbnN0IHJlZ2V4UmVwbGFjZSA9IFJlZ0V4cChzb3VyY2UsICdnJyk7XG5cbiAgICByZXR1cm4gKHNyYzogUHJpbWl0aXZlKTogc3RyaW5nID0+IHtcbiAgICAgICAgc3JjID0gKG51bGwgPT0gc3JjIHx8ICdzeW1ib2wnID09PSB0eXBlb2Ygc3JjKSA/ICcnIDogU3RyaW5nKHNyYyk7XG4gICAgICAgIHJldHVybiByZWdleFRlc3QudGVzdChzcmMpID8gc3JjLnJlcGxhY2UocmVnZXhSZXBsYWNlLCBlc2NhcGVyKSA6IHNyYztcbiAgICB9O1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBtYXBIdG1sRXNjYXBlID0ge1xuICAgICc8JzogJyZsdDsnLFxuICAgICc+JzogJyZndDsnLFxuICAgICcmJzogJyZhbXA7JyxcbiAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICBcIidcIjogJyYjMzk7JyxcbiAgICAnYCc6ICcmI3g2MDsnXG59O1xuXG4vKipcbiAqIEBlbiBFc2NhcGUgSFRNTCBzdHJpbmcuXG4gKiBAamEgSFRNTCDjgafkvb/nlKjjgZnjgovmloflrZfjgpLliLblvqHmloflrZfjgavnva7mj5tcbiAqXG4gKiBAYnJpZWYgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBtYXBIdG1sRXNjYXBlID0ge1xuICogICAgICc8JyA6ICcmbHQ7JyxcbiAqICAgICAnPicgOiAnJmd0OycsXG4gKiAgICAgJyYnIDogJyZhbXA7JyxcbiAqICAgICAn4oCzJzogJyZxdW90OycsXG4gKiAgICAgYCdgIDogJyYjMzk7JyxcbiAqICAgICAnYCcgOiAnJiN4NjA7J1xuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgZXNjYXBlSFRNTCA9IGNyZWF0ZUVzY2FwZXIobWFwSHRtbEVzY2FwZSk7XG5cbi8qKlxuICogQGVuIFVuZXNjYXBlIEhUTUwgc3RyaW5nLlxuICogQGphIEhUTUwg44Gn5L2/55So44GZ44KL5Yi25b6h5paH5a2X44KS5b6p5YWDXG4gKi9cbmV4cG9ydCBjb25zdCB1bmVzY2FwZUhUTUwgPSBjcmVhdGVFc2NhcGVyKGludmVydChtYXBIdG1sRXNjYXBlKSk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIHRoZSBzdHlsZSBjb21wdWxzaW9uIHZhbHVlIGZyb20gaW5wdXQgc3RyaW5nLlxuICogQGphIOWFpeWKm+aWh+Wtl+WIl+OCkuWei+W8t+WItuOBl+OBn+WApOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhXG4gKiAgLSBgZW5gIGlucHV0IHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlr77osaHjga7mloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvVHlwZWREYXRhKGRhdGE6IHN0cmluZyB8IHVuZGVmaW5lZCk6IFR5cGVkRGF0YSB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCd0cnVlJyA9PT0gZGF0YSkge1xuICAgICAgICAvLyBib29sZWFuOiB0cnVlXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoJ2ZhbHNlJyA9PT0gZGF0YSkge1xuICAgICAgICAvLyBib29sZWFuOiBmYWxzZVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmICgnbnVsbCcgPT09IGRhdGEpIHtcbiAgICAgICAgLy8gbnVsbFxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKGRhdGEgPT09IFN0cmluZyhOdW1iZXIoZGF0YSkpKSB7XG4gICAgICAgIC8vIG51bWJlcjog5pWw5YCk5aSJ5o+bIOKGkiDmloflrZfliJflpInmj5vjgaflhYPjgavmiLvjgovjgajjgY1cbiAgICAgICAgcmV0dXJuIE51bWJlcihkYXRhKTtcbiAgICB9IGVsc2UgaWYgKGRhdGEgJiYgL14oPzpcXHtbXFx3XFxXXSpcXH18XFxbW1xcd1xcV10qXFxdKSQvLnRlc3QoZGF0YSkpIHtcbiAgICAgICAgLy8gb2JqZWN0XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKGRhdGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHN0cmluZyAvIHVuZGVmaW5lZFxuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gc3RyaW5nIGZyb20ge0BsaW5rIFR5cGVkRGF0YX0uXG4gKiBAamEge0BsaW5rIFR5cGVkRGF0YX0g44KS5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgaW5wdXQgc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WvvuixoeOBruaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbVR5cGVkRGF0YShkYXRhOiBUeXBlZERhdGEgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGlmICh1bmRlZmluZWQgPT09IGRhdGEgfHwgaXNTdHJpbmcoZGF0YSkpIHtcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSBlbHNlIGlmIChpc09iamVjdChkYXRhKSkge1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFN0cmluZyhkYXRhKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gYFdlYiBBUElgIHN0b2NrZWQgdHlwZS4gPGJyPlxuICogICAgIEVuc3VyZSBub3QgdG8gcmV0dXJuIGB1bmRlZmluZWRgIHZhbHVlLlxuICogQGphIGBXZWIgQVBJYCDmoLzntI3lvaLlvI/jgavlpInmj5sgPGJyPlxuICogICAgIGB1bmRlZmluZWRgIOOCkui/lOWNtOOBl+OBquOBhOOBk+OBqOOCkuS/neiovFxuICovXG5leHBvcnQgZnVuY3Rpb24gZHJvcFVuZGVmaW5lZDxUPih2YWx1ZTogVCB8IG51bGwgfCB1bmRlZmluZWQsIG51bGxpc2hTZXJpYWxpemUgPSBmYWxzZSk6IFQgfCAnbnVsbCcgfCAndW5kZWZpbmVkJyB8IG51bGwge1xuICAgIHJldHVybiB2YWx1ZSA/PyAobnVsbGlzaFNlcmlhbGl6ZSA/IFN0cmluZyh2YWx1ZSkgOiBudWxsKSBhcyBUIHwgJ251bGwnIHwgJ3VuZGVmaW5lZCcgfCBudWxsO1xufVxuXG4vKipcbiAqIEBlbiBEZXNlcmlhbGl6ZSBmcm9tIGBXZWIgQVBJYCBzdG9ja2VkIHR5cGUuIDxicj5cbiAqICAgICBDb252ZXJ0IGZyb20gJ251bGwnIG9yICd1bmRlZmluZWQnIHN0cmluZyB0byBvcmlnaW5hbCB0eXBlLlxuICogQGphICdudWxsJyBvciAndW5kZWZpbmVkJyDjgpLjgoLjgajjga7lnovjgavmiLvjgZlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc3RvcmVOdWxsaXNoPFQ+KHZhbHVlOiBUIHwgJ251bGwnIHwgJ3VuZGVmaW5lZCcpOiBUIHwgbnVsbCB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCdudWxsJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmICgndW5kZWZpbmVkJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqLyBsZXQgX2xvY2FsSWQgPSAwO1xuXG4vKipcbiAqIEBlbiBHZXQgbG9jYWwgdW5pcXVlIGlkLiA8YnI+XG4gKiAgICAgXCJsb2NhbCB1bmlxdWVcIiBtZWFucyBndWFyYW50ZWVzIHVuaXF1ZSBkdXJpbmcgaW4gc2NyaXB0IGxpZmUgY3ljbGUgb25seS5cbiAqIEBqYSDjg63jg7zjgqvjg6vjg6bjg4vjg7zjgq8gSUQg44Gu5Y+W5b6XIDxicj5cbiAqICAgICDjgrnjgq/jg6rjg5fjg4jjg6njgqTjg5XjgrXjgqTjgq/jg6vkuK3jga7lkIzkuIDmgKfjgpLkv53oqLzjgZnjgosuXG4gKlxuICogQHBhcmFtIHByZWZpeFxuICogIC0gYGVuYCBJRCBwcmVmaXhcbiAqICAtIGBqYWAgSUQg44Gr5LuY5LiO44GZ44KLIFByZWZpeFxuICogQHBhcmFtIHplcm9QYWRcbiAqICAtIGBlbmAgMCBwYWRkaW5nIG9yZGVyXG4gKiAgLSBgamFgIDAg6Kmw44KB44GZ44KL5qGB5pWw44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsdWlkKHByZWZpeCA9ICcnLCB6ZXJvUGFkPzogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBjb25zdCBpZCA9ICgrK19sb2NhbElkKS50b1N0cmluZygxNik7XG4gICAgcmV0dXJuIChudWxsICE9IHplcm9QYWQpID8gYCR7cHJlZml4fSR7aWQucGFkU3RhcnQoemVyb1BhZCwgJzAnKX1gIDogYCR7cHJlZml4fSR7aWR9YDtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gYDBgIGFuZCBgbWF4YCwgaW5jbHVzaXZlLlxuICogQGphIGAwYCAtIGBtYXhgIOOBruODqeODs+ODgOODoOOBruaVtOaVsOWApOOCkueUn+aIkFxuICpcbiAqIEBwYXJhbSBtYXhcbiAqICAtIGBlbmAgVGhlIG1heGltdW0gcmFuZG9tIG51bWJlci5cbiAqICAtIGBqYWAg5pW05pWw44Gu5pyA5aSn5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kb21JbnQobWF4OiBudW1iZXIpOiBudW1iZXI7XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIGBtaW5gIGFuZCBgbWF4YCwgaW5jbHVzaXZlLlxuICogQGphIGBtaW5gIC0gYG1heGAg44Gu44Op44Oz44OA44Og44Gu5pW05pWw5YCk44KS55Sf5oiQXG4gKlxuICogQHBhcmFtIG1pblxuICogIC0gYGVuYCBUaGUgbWF4aW11bSByYW5kb20gbnVtYmVyLlxuICogIC0gYGphYCDmlbTmlbDjga7mnIDlpKflgKRcbiAqIEBwYXJhbSBtYXhcbiAqICAtIGBlbmAgVGhlIG1heGltdW0gcmFuZG9tIG51bWJlci5cbiAqICAtIGBqYWAg5pW05pWw44Gu5pyA5aSn5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kb21JbnQobWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmlmaWVkLXNpZ25hdHVyZXNcblxuZXhwb3J0IGZ1bmN0aW9uIHJhbmRvbUludChtaW46IG51bWJlciwgbWF4PzogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBpZiAobnVsbCA9PSBtYXgpIHtcbiAgICAgICAgbWF4ID0gbWluO1xuICAgICAgICBtaW4gPSAwO1xuICAgIH1cbiAgICByZXR1cm4gbWluICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3JlZ2V4Q2FuY2VsTGlrZVN0cmluZyA9IC8oYWJvcnR8Y2FuY2VsKS9pbTtcblxuLyoqXG4gKiBAZW4gUHJlc3VtZSB3aGV0aGVyIGl0J3MgYSBjYW5jZWxlZCBlcnJvci5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjgZXjgozjgZ/jgqjjg6njg7zjgafjgYLjgovjgYvmjqjlrppcbiAqXG4gKiBAcGFyYW0gZXJyb3JcbiAqICAtIGBlbmAgYW4gZXJyb3Igb2JqZWN0IGhhbmRsZWQgaW4gYGNhdGNoYCBibG9jay5cbiAqICAtIGBqYWAgYGNhdGNoYCDnr4Djgarjganjgafoo5zotrPjgZfjgZ/jgqjjg6njg7zjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQ2FuY2VsTGlrZUVycm9yKGVycm9yOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgaWYgKG51bGwgPT0gZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoZXJyb3IpKSB7XG4gICAgICAgIHJldHVybiBfcmVnZXhDYW5jZWxMaWtlU3RyaW5nLnRlc3QoZXJyb3IpO1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoZXJyb3IpKSB7XG4gICAgICAgIHJldHVybiBfcmVnZXhDYW5jZWxMaWtlU3RyaW5nLnRlc3QoKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgZmlyc3QgbGV0dGVyIG9mIHRoZSBzdHJpbmcgdG8gdXBwZXJjYXNlLlxuICogQGphIOacgOWIneOBruaWh+Wtl+OCkuWkp+aWh+Wtl+OBq+WkieaPm1xuICpcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNhcGl0YWxpemUoXCJmb28gQmFyXCIpO1xuICogLy8gPT4gXCJGb28gQmFyXCJcbiAqXG4gKiBjYXBpdGFsaXplKFwiRk9PIEJhclwiLCB0cnVlKTtcbiAqIC8vID0+IFwiRm9vIGJhclwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKiBAcGFyYW0gbG93ZXJjYXNlUmVzdFxuICogIC0gYGVuYCBJZiBgdHJ1ZWAgaXMgcGFzc2VkLCB0aGUgcmVzdCBvZiB0aGUgc3RyaW5nIHdpbGwgYmUgY29udmVydGVkIHRvIGxvd2VyIGNhc2VcbiAqICAtIGBqYWAgYHRydWVgIOOCkuaMh+WumuOBl+OBn+WgtOWQiCwgMuaWh+Wtl+ebruS7pemZjeOCguWwj+aWh+Wtl+WMllxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FwaXRhbGl6ZShzcmM6IHN0cmluZywgbG93ZXJjYXNlUmVzdCA9IGZhbHNlKTogc3RyaW5nIHtcbiAgICBjb25zdCByZW1haW5pbmdDaGFycyA9ICFsb3dlcmNhc2VSZXN0ID8gc3JjLnNsaWNlKDEpIDogc3JjLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIHNyYy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHJlbWFpbmluZ0NoYXJzO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBmaXJzdCBsZXR0ZXIgb2YgdGhlIHN0cmluZyB0byBsb3dlcmNhc2UuXG4gKiBAamEg5pyA5Yid44Gu5paH5a2X44KS5bCP5paH5a2X5YyWXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBkZWNhcGl0YWxpemUoXCJGb28gQmFyXCIpO1xuICogLy8gPT4gXCJmb28gQmFyXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlY2FwaXRhbGl6ZShzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHNyYy5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIHNyYy5zbGljZSgxKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgdW5kZXJzY29yZWQgb3IgZGFzaGVyaXplZCBzdHJpbmcgdG8gYSBjYW1lbGl6ZWQgb25lLiA8YnI+XG4gKiAgICAgQmVnaW5zIHdpdGggYSBsb3dlciBjYXNlIGxldHRlciB1bmxlc3MgaXQgc3RhcnRzIHdpdGggYW4gdW5kZXJzY29yZSwgZGFzaCBvciBhbiB1cHBlciBjYXNlIGxldHRlci5cbiAqIEBqYSBgX2AsIGAtYCDljLrliIfjgormloflrZfliJfjgpLjgq3jg6Pjg6Hjg6vjgrHjg7zjgrnljJYgPGJyPlxuICogICAgIGAtYCDjgb7jgZ/jga/lpKfmloflrZfjgrnjgr/jg7zjg4jjgafjgYLjgozjgbAsIOWkp+aWh+Wtl+OCueOCv+ODvOODiOOBjOaXouWumuWApFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2FtZWxpemUoXCJtb3otdHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJtb3pUcmFuc2Zvcm1cIlxuICpcbiAqIGNhbWVsaXplKFwiLW1vei10cmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIk1velRyYW5zZm9ybVwiXG4gKlxuICogY2FtZWxpemUoXCJfbW96X3RyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwiTW96VHJhbnNmb3JtXCJcbiAqXG4gKiBjYW1lbGl6ZShcIk1vei10cmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIk1velRyYW5zZm9ybVwiXG4gKlxuICogY2FtZWxpemUoXCItbW96LXRyYW5zZm9ybVwiLCB0cnVlKTtcbiAqIC8vID0+IFwibW96VHJhbnNmb3JtXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqIEBwYXJhbSBsb3dlclxuICogIC0gYGVuYCBJZiBgdHJ1ZWAgaXMgcGFzc2VkLCBmb3JjZSBjb252ZXJ0cyB0byBsb3dlciBjYW1lbCBjYXNlIGluIHN0YXJ0cyB3aXRoIHRoZSBzcGVjaWFsIGNhc2UuXG4gKiAgLSBgamFgIOW8t+WItueahOOBq+Wwj+aWh+Wtl+OCueOCv+ODvOODiOOBmeOCi+WgtOWQiOOBq+OBryBgdHJ1ZWAg44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYW1lbGl6ZShzcmM6IHN0cmluZywgbG93ZXIgPSBmYWxzZSk6IHN0cmluZyB7XG4gICAgc3JjID0gc3JjLnRyaW0oKS5yZXBsYWNlKC9bLV9cXHNdKyguKT8vZywgKG1hdGNoLCBjKSA9PiB7XG4gICAgICAgIHJldHVybiBjID8gYy50b1VwcGVyQ2FzZSgpIDogJyc7XG4gICAgfSk7XG5cbiAgICBpZiAodHJ1ZSA9PT0gbG93ZXIpIHtcbiAgICAgICAgcmV0dXJuIGRlY2FwaXRhbGl6ZShzcmMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzcmM7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBzdHJpbmcgdG8gY2FtZWxpemVkIGNsYXNzIG5hbWUuIEZpcnN0IGxldHRlciBpcyBhbHdheXMgdXBwZXIgY2FzZS5cbiAqIEBqYSDlhYjpoK3lpKfmloflrZfjga7jgq3jg6Pjg6Hjg6vjgrHjg7zjgrnjgavlpInmj5tcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNsYXNzaWZ5KFwic29tZV9jbGFzc19uYW1lXCIpO1xuICogLy8gPT4gXCJTb21lQ2xhc3NOYW1lXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzaWZ5KHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gY2FwaXRhbGl6ZShjYW1lbGl6ZShzcmMucmVwbGFjZSgvW1xcV19dL2csICcgJykpLnJlcGxhY2UoL1xccy9nLCAnJykpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBhIGNhbWVsaXplZCBvciBkYXNoZXJpemVkIHN0cmluZyBpbnRvIGFuIHVuZGVyc2NvcmVkIG9uZS5cbiAqIEBqYSDjgq3jg6Pjg6Hjg6vjgrHjg7zjgrkgb3IgYC1gIOOBpOOBquOBjuaWh+Wtl+WIl+OCkiBgX2Ag44Gk44Gq44GO44Gr5aSJ5o+bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiB1bmRlcnNjb3JlZChcIk1velRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwibW96X3RyYW5zZm9ybVwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmRlcnNjb3JlZChzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHNyYy50cmltKCkucmVwbGFjZSgvKFthLXpcXGRdKShbQS1aXSspL2csICckMV8kMicpLnJlcGxhY2UoL1stXFxzXSsvZywgJ18nKS50b0xvd2VyQ2FzZSgpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBhIHVuZGVyc2NvcmVkIG9yIGNhbWVsaXplZCBzdHJpbmcgaW50byBhbiBkYXNoZXJpemVkIG9uZS5cbiAqIEBqYSDjgq3jg6Pjg6Hjg6vjgrHjg7zjgrkgb3IgYF9gIOOBpOOBquOBjuaWh+Wtl+WIl+OCkiBgLWAg44Gk44Gq44GO44Gr5aSJ5o+bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBkYXNoZXJpemUoXCJNb3pUcmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIi1tb3otdHJhbnNmb3JtXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhc2hlcml6ZShzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHNyYy50cmltKCkucmVwbGFjZSgvKFtBLVpdKS9nLCAnLSQxJykucmVwbGFjZSgvW19cXHNdKy9nLCAnLScpLnRvTG93ZXJDYXNlKCk7XG59XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25PYmplY3QsIEFjY2Vzc2libGUgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGFzc2lnblZhbHVlIH0gZnJvbSAnLi9kZWVwLWNpcmN1aXQnO1xuaW1wb3J0IHsgcmFuZG9tSW50IH0gZnJvbSAnLi9taXNjJztcblxuLyoqXG4gKiBAZW4gRXhlY3V0ZSBzaHVmZmxlIG9mIGFuIGFycmF5IGVsZW1lbnRzLlxuICogQGphIOmFjeWIl+imgee0oOOBruOCt+ODo+ODg+ODleODq1xuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gZGVzdHJ1Y3RpdmVcbiAqICAtIGBlbmAgdHJ1ZTogZGVzdHJ1Y3RpdmUgLyBmYWxzZTogbm9uLWRlc3RydWN0aXZlIChkZWZhdWx0KVxuICogIC0gYGphYCB0cnVlOiDnoLTlo4rnmoQgLyBmYWxzZTog6Z2e56C05aOK55qEICjml6LlrpopXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaHVmZmxlPFQ+KGFycmF5OiBUW10sIGRlc3RydWN0aXZlID0gZmFsc2UpOiBUW10ge1xuICAgIGNvbnN0IHNvdXJjZSA9IGRlc3RydWN0aXZlID8gYXJyYXkgOiBhcnJheS5zbGljZSgpO1xuICAgIGNvbnN0IGxlbiA9IHNvdXJjZS5sZW5ndGg7XG4gICAgZm9yIChsZXQgaSA9IGxlbiA+IDAgPyBsZW4gPj4+IDAgOiAwOyBpID4gMTspIHtcbiAgICAgICAgY29uc3QgaiA9IGkgKiBNYXRoLnJhbmRvbSgpID4+PiAwO1xuICAgICAgICBjb25zdCBzd2FwID0gc291cmNlWy0taV07XG4gICAgICAgIHNvdXJjZVtpXSA9IHNvdXJjZVtqXTtcbiAgICAgICAgc291cmNlW2pdID0gc3dhcDtcbiAgICB9XG4gICAgcmV0dXJuIHNvdXJjZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEV4ZWN1dGUgc3RhYmxlIHNvcnQgYnkgbWVyZ2Utc29ydCBhbGdvcml0aG0uXG4gKiBAamEgYG1lcmdlLXNvcnRgIOOBq+OCiOOCi+WuieWumuOCveODvOODiFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY29tcGFyYXRvclxuICogIC0gYGVuYCBzb3J0IGNvbXBhcmF0b3IgZnVuY3Rpb25cbiAqICAtIGBqYWAg44K944O844OI6Zai5pWw44KS5oyH5a6aXG4gKiBAcGFyYW0gZGVzdHJ1Y3RpdmVcbiAqICAtIGBlbmAgdHJ1ZTogZGVzdHJ1Y3RpdmUgLyBmYWxzZTogbm9uLWRlc3RydWN0aXZlIChkZWZhdWx0KVxuICogIC0gYGphYCB0cnVlOiDnoLTlo4rnmoQgLyBmYWxzZTog6Z2e56C05aOK55qEICjml6LlrpopXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzb3J0PFQ+KGFycmF5OiBUW10sIGNvbXBhcmF0b3I6IChsaHM6IFQsIHJoczogVCkgPT4gbnVtYmVyLCBkZXN0cnVjdGl2ZSA9IGZhbHNlKTogVFtdIHtcbiAgICBjb25zdCBzb3VyY2UgPSBkZXN0cnVjdGl2ZSA/IGFycmF5IDogYXJyYXkuc2xpY2UoKTtcbiAgICBpZiAoc291cmNlLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICB9XG4gICAgY29uc3QgbGhzID0gc29ydChzb3VyY2Uuc3BsaWNlKDAsIHNvdXJjZS5sZW5ndGggPj4+IDEpLCBjb21wYXJhdG9yLCB0cnVlKTtcbiAgICBjb25zdCByaHMgPSBzb3J0KHNvdXJjZS5zcGxpY2UoMCksIGNvbXBhcmF0b3IsIHRydWUpO1xuICAgIHdoaWxlIChsaHMubGVuZ3RoICYmIHJocy5sZW5ndGgpIHtcbiAgICAgICAgc291cmNlLnB1c2goY29tcGFyYXRvcihsaHNbMF0sIHJoc1swXSkgPD0gMCA/IGxocy5zaGlmdCgpIGFzIFQgOiByaHMuc2hpZnQoKSBhcyBUKTtcbiAgICB9XG4gICAgcmV0dXJuIHNvdXJjZS5jb25jYXQobGhzLCByaHMpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWFrZSB1bmlxdWUgYXJyYXkuXG4gKiBAamEg6YeN6KSH6KaB57Sg44Gu44Gq44GE6YWN5YiX44Gu5L2c5oiQXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuaXF1ZTxUPihhcnJheTogVFtdKTogVFtdIHtcbiAgICByZXR1cm4gWy4uLm5ldyBTZXQoYXJyYXkpXTtcbn1cblxuLyoqXG4gKiBAZW4gTWFrZSB1bmlvbiBhcnJheS5cbiAqIEBqYSDphY3liJfjga7lkozpm4blkIjjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gYXJyYXlzXG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheXNcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiX576kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmlvbjxUPiguLi5hcnJheXM6IFRbXVtdKTogVFtdIHtcbiAgICByZXR1cm4gdW5pcXVlKGFycmF5cy5mbGF0KCkpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSBtb2RlbCBhdCB0aGUgZ2l2ZW4gaW5kZXguIElmIG5lZ2F0aXZlIHZhbHVlIGlzIGdpdmVuLCB0aGUgdGFyZ2V0IHdpbGwgYmUgZm91bmQgZnJvbSB0aGUgbGFzdCBpbmRleC5cbiAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgavjgojjgovjg6Ljg4fjg6vjgbjjga7jgqLjgq/jgrvjgrkuIOiyoOWApOOBruWgtOWQiOOBr+acq+WwvuaknOe0ouOCkuWun+ihjFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBlbmAgQSB6ZXJvLWJhc2VkIGludGVnZXIgaW5kaWNhdGluZyB3aGljaCBlbGVtZW50IHRvIHJldHJpZXZlLiA8YnI+IElmIG5lZ2F0aXZlIGluZGV4IGlzIGNvdW50ZWQgZnJvbSB0aGUgZW5kIG9mIHRoZSBtYXRjaGVkIHNldC5cbiAqICAtIGBqYWAgMCBiYXNlIOOBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumiA8YnI+IOiyoOWApOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiCwg5pyr5bC+44GL44KJ44Gu44Kk44Oz44OH44OD44Kv44K544Go44GX44Gm6Kej6YeI44GV44KM44KLXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhdDxUPihhcnJheTogVFtdLCBpbmRleDogbnVtYmVyKTogVCB8IG5ldmVyIHtcbiAgICBjb25zdCBpZHggPSBNYXRoLnRydW5jKGluZGV4KTtcbiAgICBjb25zdCBlbCA9IGlkeCA8IDAgPyBhcnJheVtpZHggKyBhcnJheS5sZW5ndGhdIDogYXJyYXlbaWR4XTtcbiAgICBpZiAobnVsbCA9PSBlbCkge1xuICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgaW52YWxpZCBhcnJheSBpbmRleC4gW2xlbmd0aDogJHthcnJheS5sZW5ndGh9LCBnaXZlbjogJHtpbmRleH1dYCk7XG4gICAgfVxuICAgIHJldHVybiBlbDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1ha2UgaW5kZXggYXJyYXkuXG4gKiBAamEg44Kk44Oz44OH44OD44Kv44K56YWN5YiX44Gu5L2c5oiQXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBleGNsdWRlc1xuICogIC0gYGVuYCBleGNsdWRlIGluZGV4IGluIHJldHVybiB2YWx1ZS5cbiAqICAtIGBqYWAg5oi744KK5YCk6YWN5YiX44Gr5ZCr44KB44Gq44GE44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbmRpY2VzPFQ+KGFycmF5OiBUW10sIC4uLmV4Y2x1ZGVzOiBudW1iZXJbXSk6IG51bWJlcltdIHtcbiAgICBjb25zdCByZXR2YWwgPSBbLi4uYXJyYXkua2V5cygpXTtcblxuICAgIGNvbnN0IGxlbiA9IGFycmF5Lmxlbmd0aDtcbiAgICBjb25zdCBleExpc3QgPSBbLi4ubmV3IFNldChleGNsdWRlcyldLnNvcnQoKGxocywgcmhzKSA9PiBsaHMgPCByaHMgPyAxIDogLTEpO1xuICAgIGZvciAoY29uc3QgZXggb2YgZXhMaXN0KSB7XG4gICAgICAgIGlmICgwIDw9IGV4ICYmIGV4IDwgbGVuKSB7XG4gICAgICAgICAgICByZXR2YWwuc3BsaWNlKGV4LCAxKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgZ3JvdXBCeX0oKSBvcHRpb25zIGRlZmluaXRpb24uXG4gKiBAamEge0BsaW5rIGdyb3VwQnl9KCkg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44Oz5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3JvdXBCeU9wdGlvbnM8XG4gICAgVCBleHRlbmRzIG9iamVjdCxcbiAgICBUS0VZUyBleHRlbmRzIGtleW9mIFQsXG4gICAgVFNVTUtFWVMgZXh0ZW5kcyBrZXlvZiBULFxuICAgIFRHUk9VUEtFWSBleHRlbmRzIHN0cmluZ1xuPiB7XG4gICAgLyoqXG4gICAgICogQGVuIGBHUk9VUCBCWWAga2V5cy5cbiAgICAgKiBAamEgYEdST1VQIEJZYCDjgavmjIflrprjgZnjgovjgq3jg7xcbiAgICAgKi9cbiAgICBrZXlzOiBFeHRyYWN0PFRLRVlTLCBzdHJpbmc+W107XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWdncmVnYXRhYmxlIGtleXMuXG4gICAgICogQGphIOmbhuioiOWPr+iDveOBquOCreODvOS4gOimp1xuICAgICAqL1xuICAgIHN1bUtleXM/OiBFeHRyYWN0PFRTVU1LRVlTLCBzdHJpbmc+W107XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR3JvdXBlZCBpdGVtIGFjY2VzcyBrZXkuIGRlZmF1bHQ6ICdpdGVtcycsXG4gICAgICogQGphIOOCsOODq+ODvOODlOODs+OCsOOBleOCjOOBn+imgee0oOOBuOOBruOCouOCr+OCu+OCueOCreODvC4g5pei5a6aOiAnaXRlbXMnXG4gICAgICovXG4gICAgZ3JvdXBLZXk/OiBUR1JPVVBLRVk7XG59XG5cbi8qKlxuICogQGVuIFJldHVybiB0eXBlIG9mIHtAbGluayBncm91cEJ5fSgpLlxuICogQGphIHtAbGluayBncm91cEJ5fSgpIOOBjOi/lOWNtOOBmeOCi+Wei1xuICovXG5leHBvcnQgdHlwZSBHcm91cEJ5UmV0dXJuVmFsdWU8XG4gICAgVCBleHRlbmRzIG9iamVjdCxcbiAgICBUS0VZUyBleHRlbmRzIGtleW9mIFQsXG4gICAgVFNVTUtFWVMgZXh0ZW5kcyBrZXlvZiBUID0gbmV2ZXIsXG4gICAgVEdST1VQS0VZIGV4dGVuZHMgc3RyaW5nID0gJ2l0ZW1zJ1xuPiA9IFJlYWRvbmx5PFJlY29yZDxUS0VZUywgdW5rbm93bj4gJiBSZWNvcmQ8VFNVTUtFWVMsIHVua25vd24+ICYgUmVjb3JkPFRHUk9VUEtFWSwgVFtdPj47XG5cbi8qKlxuICogQGVuIEV4ZWN1dGUgYEdST1VQIEJZYCBmb3IgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6YWN5YiX44Gu6KaB57Sg44GuIGBHUk9VUCBCWWAg6ZuG5ZCI44KS5oq95Ye6XG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGBHUk9VUCBCWWAgb3B0aW9uc1xuICogIC0gYGphYCBgR1JPVVAgQllgIOOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ3JvdXBCeTxcbiAgICBUIGV4dGVuZHMgb2JqZWN0LFxuICAgIFRLRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUU1VNS0VZUyBleHRlbmRzIGtleW9mIFQgPSBuZXZlcixcbiAgICBUR1JPVVBLRVkgZXh0ZW5kcyBzdHJpbmcgPSAnaXRlbXMnXG4+KGFycmF5OiBUW10sIG9wdGlvbnM6IEdyb3VwQnlPcHRpb25zPFQsIFRLRVlTLCBUU1VNS0VZUywgVEdST1VQS0VZPik6IEdyb3VwQnlSZXR1cm5WYWx1ZTxULCBUS0VZUywgVFNVTUtFWVMsIFRHUk9VUEtFWT5bXSB7XG4gICAgY29uc3QgeyBrZXlzLCBzdW1LZXlzLCBncm91cEtleSB9ID0gb3B0aW9ucztcbiAgICBjb25zdCBfZ3JvdXBLZXkgPSBncm91cEtleSA/PyAnaXRlbXMnO1xuICAgIGNvbnN0IF9zdW1LZXlzOiBzdHJpbmdbXSA9IHN1bUtleXMgPz8gW107XG4gICAgX3N1bUtleXMucHVzaChfZ3JvdXBLZXkpO1xuXG4gICAgY29uc3QgaGFzaCA9IGFycmF5LnJlZHVjZSgocmVzOiBBY2Nlc3NpYmxlPFQ+LCBkYXRhOiBBY2Nlc3NpYmxlPFQ+KSA9PiB7XG4gICAgICAgIC8vIGNyZWF0ZSBncm91cEJ5IGludGVybmFsIGtleVxuICAgICAgICBjb25zdCBfa2V5ID0ga2V5cy5yZWR1Y2UoKHMsIGspID0+IHMgKyBTdHJpbmcoZGF0YVtrXSksICcnKTtcblxuICAgICAgICAvLyBpbml0IGtleXNcbiAgICAgICAgaWYgKCEoX2tleSBpbiByZXMpKSB7XG4gICAgICAgICAgICBjb25zdCBrZXlMaXN0ID0ga2V5cy5yZWR1Y2UoKGg6IFVua25vd25PYmplY3QsIGs6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIGFzc2lnblZhbHVlKGgsIGssIGRhdGFba10pO1xuICAgICAgICAgICAgICAgIHJldHVybiBoO1xuICAgICAgICAgICAgfSwge30pO1xuXG4gICAgICAgICAgICAocmVzW19rZXldIGFzIFVua25vd25PYmplY3QpID0gX3N1bUtleXMucmVkdWNlKChoLCBrOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICBoW2tdID0gMDtcbiAgICAgICAgICAgICAgICByZXR1cm4gaDtcbiAgICAgICAgICAgIH0sIGtleUxpc3QpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzS2V5ID0gcmVzW19rZXldIGFzIGFueTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5cbiAgICAgICAgLy8gc3VtIHByb3BlcnRpZXNcbiAgICAgICAgZm9yIChjb25zdCBrIG9mIF9zdW1LZXlzKSB7XG4gICAgICAgICAgICBpZiAoX2dyb3VwS2V5ID09PSBrKSB7XG4gICAgICAgICAgICAgICAgcmVzS2V5W2tdID0gcmVzS2V5W2tdIHx8IFtdOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9wcmVmZXItbnVsbGlzaC1jb2FsZXNjaW5nXG4gICAgICAgICAgICAgICAgcmVzS2V5W2tdLnB1c2goZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc0tleVtrXSArPSBkYXRhW2tdIGFzIG51bWJlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfSwge30pO1xuXG4gICAgcmV0dXJuIE9iamVjdC52YWx1ZXMoaGFzaCk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb21wdXRlcyB0aGUgbGlzdCBvZiB2YWx1ZXMgdGhhdCBhcmUgdGhlIGludGVyc2VjdGlvbiBvZiBhbGwgdGhlIGFycmF5cy4gRWFjaCB2YWx1ZSBpbiB0aGUgcmVzdWx0IGlzIHByZXNlbnQgaW4gZWFjaCBvZiB0aGUgYXJyYXlzLlxuICogQGphIOmFjeWIl+OBruepjembhuWQiOOCkui/lOWNtC4g6L+U5Y2044GV44KM44Gf6YWN5YiX44Gu6KaB57Sg44Gv44GZ44G544Gm44Gu5YWl5Yqb44GV44KM44Gf6YWN5YiX44Gr5ZCr44G+44KM44KLXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zb2xlLmxvZyhpbnRlcnNlY3Rpb24oWzEsIDIsIDNdLCBbMTAxLCAyLCAxLCAxMF0sIFsyLCAxXSkpO1xuICogLy8gPT4gWzEsIDJdXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlzXG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGludGVyc2VjdGlvbjxUPiguLi5hcnJheXM6IFRbXVtdKTogVFtdIHtcbiAgICByZXR1cm4gYXJyYXlzLnJlZHVjZSgoYWNjLCBhcnkpID0+IGFjYy5maWx0ZXIoZWwgPT4gYXJ5LmluY2x1ZGVzKGVsKSkpO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIHRoZSB2YWx1ZXMgZnJvbSBhcnJheSB0aGF0IGFyZSBub3QgcHJlc2VudCBpbiB0aGUgb3RoZXIgYXJyYXlzLlxuICogQGphIOmFjeWIl+OBi+OCieOBu+OBi+OBrumFjeWIl+OBq+WQq+OBvuOCjOOBquOBhOOCguOBruOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc29sZS5sb2coZGlmZmVyZW5jZShbMSwgMiwgMywgNCwgNV0sIFs1LCAyLCAxMF0pKTtcbiAqIC8vID0+IFsxLCAzLCA0XVxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBvdGhlcnNcbiAqICAtIGBlbmAgZXhjbHVkZSBlbGVtZW50IGluIHJldHVybiB2YWx1ZS5cbiAqICAtIGBqYWAg5oi744KK5YCk6YWN5YiX44Gr5ZCr44KB44Gq44GE6KaB57Sg44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaWZmZXJlbmNlPFQ+KGFycmF5OiBUW10sIC4uLm90aGVyczogVFtdW10pOiBUW10ge1xuICAgIGNvbnN0IGFycmF5cyA9IFthcnJheSwgLi4ub3RoZXJzXSBhcyBUW11bXTtcbiAgICByZXR1cm4gYXJyYXlzLnJlZHVjZSgoYWNjLCBhcnkpID0+IGFjYy5maWx0ZXIoZWwgPT4gIWFyeS5pbmNsdWRlcyhlbCkpKTtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIGNvcHkgb2YgdGhlIGFycmF5IHdpdGggYWxsIGluc3RhbmNlcyBvZiB0aGUgdmFsdWVzIHJlbW92ZWQuXG4gKiBAamEg6YWN5YiX44GL44KJ5oyH5a6a6KaB57Sg44KS5Y+W44KK6Zmk44GE44Gf44KC44Gu44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zb2xlLmxvZyh3aXRob3V0KFsxLCAyLCAxLCAwLCAzLCAxLCA0XSwgMCwgMSkpO1xuICogLy8gPT4gWzIsIDMsIDRdXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIHZhbHVlc1xuICogIC0gYGVuYCBleGNsdWRlIGVsZW1lbnQgaW4gcmV0dXJuIHZhbHVlLlxuICogIC0gYGphYCDmiLvjgorlgKTphY3liJfjgavlkKvjgoHjgarjgYTopoHntKDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhvdXQ8VD4oYXJyYXk6IFRbXSwgLi4udmFsdWVzOiBUW10pOiBUW10ge1xuICAgIHJldHVybiBkaWZmZXJlbmNlKGFycmF5LCB2YWx1ZXMpO1xufVxuXG4vKipcbiAqIEBlbiBQcm9kdWNlIGEgcmFuZG9tIHNhbXBsZSBmcm9tIHRoZSBsaXN0LlxuICogQGphIOODqeODs+ODgOODoOOBq+OCteODs+ODl+ODq+WApOOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc29sZS5sb2coc2FtcGxlKFsxLCAyLCAzLCA0LCA1LCA2XSwgMykpO1xuICogLy8gPT4gWzEsIDYsIDJdXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNvdW50XG4gKiAgLSBgZW5gIG51bWJlciBvZiBzYW1wbGluZyBjb3VudC5cbiAqICAtIGBqYWAg6L+U5Y2044GZ44KL44K144Oz44OX44Or5pWw44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1wbGU8VD4oYXJyYXk6IFRbXSwgY291bnQ6IG51bWJlcik6IFRbXTtcblxuLyoqXG4gKiBAZW4gUHJvZHVjZSBhIHJhbmRvbSBzYW1wbGUgZnJvbSB0aGUgbGlzdC5cbiAqIEBqYSDjg6njg7Pjg4Djg6DjgavjgrXjg7Pjg5fjg6vlgKTjgpLov5TljbRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnNvbGUubG9nKHNhbXBsZShbMSwgMiwgMywgNCwgNSwgNl0pKTtcbiAqIC8vID0+IDRcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1wbGU8VD4oYXJyYXk6IFRbXSk6IFQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBzYW1wbGU8VD4oYXJyYXk6IFRbXSwgY291bnQ/OiBudW1iZXIpOiBUIHwgVFtdIHtcbiAgICBpZiAobnVsbCA9PSBjb3VudCkge1xuICAgICAgICByZXR1cm4gYXJyYXlbcmFuZG9tSW50KGFycmF5Lmxlbmd0aCAtIDEpXTtcbiAgICB9XG4gICAgY29uc3Qgc2FtcGxlID0gYXJyYXkuc2xpY2UoKTtcbiAgICBjb25zdCBsZW5ndGggPSBzYW1wbGUubGVuZ3RoO1xuICAgIGNvdW50ID0gTWF0aC5tYXgoTWF0aC5taW4oY291bnQsIGxlbmd0aCksIDApO1xuICAgIGNvbnN0IGxhc3QgPSBsZW5ndGggLSAxO1xuICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBjb3VudDsgaW5kZXgrKykge1xuICAgICAgICBjb25zdCByYW5kID0gcmFuZG9tSW50KGluZGV4LCBsYXN0KTtcbiAgICAgICAgY29uc3QgdGVtcCA9IHNhbXBsZVtpbmRleF07XG4gICAgICAgIHNhbXBsZVtpbmRleF0gPSBzYW1wbGVbcmFuZF07XG4gICAgICAgIHNhbXBsZVtyYW5kXSA9IHRlbXA7XG4gICAgfVxuICAgIHJldHVybiBzYW1wbGUuc2xpY2UoMCwgY291bnQpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIHJlc3VsdCBvZiBwZXJtdXRhdGlvbiBmcm9tIHRoZSBsaXN0LlxuICogQGphIOmFjeWIl+OBi+OCiemghuWIl+e1kOaenOOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgYXJyID0gcGVybXV0YXRpb24oWydhJywgJ2InLCAnYyddLCAyKTtcbiAqIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFycikpO1xuICogLy8gPT4gW1snYScsJ2InXSxbJ2EnLCdjJ10sWydiJywnYSddLFsnYicsJ2MnXSxbJ2MnLCdhJ10sWydjJywnYiddXVxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjb3VudFxuICogIC0gYGVuYCBudW1iZXIgb2YgcGljayB1cC5cbiAqICAtIGBqYWAg6YG45oqe5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJtdXRhdGlvbjxUPihhcnJheTogVFtdLCBjb3VudDogbnVtYmVyKTogVFtdW10ge1xuICAgIGNvbnN0IHJldHZhbDogVFtdW10gPSBbXTtcbiAgICBpZiAoYXJyYXkubGVuZ3RoIDwgY291bnQpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBpZiAoMSA9PT0gY291bnQpIHtcbiAgICAgICAgZm9yIChjb25zdCBbaSwgdmFsXSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIHJldHZhbFtpXSA9IFt2YWxdO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIG4xID0gYXJyYXkubGVuZ3RoOyBpIDwgbjE7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgcGFydHMgPSBhcnJheS5zbGljZSgwKTtcbiAgICAgICAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IHBlcm11dGF0aW9uKHBhcnRzLCBjb3VudCAtIDEpO1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDAsIG4yID0gcm93Lmxlbmd0aDsgaiA8IG4yOyBqKyspIHtcbiAgICAgICAgICAgICAgICByZXR2YWwucHVzaChbYXJyYXlbaV1dLmNvbmNhdChyb3dbal0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgcmVzdWx0IG9mIGNvbWJpbmF0aW9uIGZyb20gdGhlIGxpc3QuXG4gKiBAamEg6YWN5YiX44GL44KJ57WE44G/5ZCI44KP44Gb57WQ5p6c44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBhcnIgPSBjb21iaW5hdGlvbihbJ2EnLCAnYicsICdjJ10sIDIpO1xuICogY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYXJyKSk7XG4gKiAvLyA9PiBbWydhJywnYiddLFsnYScsJ2MnXSxbJ2InLCdjJ11dXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNvdW50XG4gKiAgLSBgZW5gIG51bWJlciBvZiBwaWNrIHVwLlxuICogIC0gYGphYCDpgbjmip7mlbBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmF0aW9uPFQ+KGFycmF5OiBUW10sIGNvdW50OiBudW1iZXIpOiBUW11bXSB7XG4gICAgY29uc3QgcmV0dmFsOiBUW11bXSA9IFtdO1xuICAgIGlmIChhcnJheS5sZW5ndGggPCBjb3VudCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGlmICgxID09PSBjb3VudCkge1xuICAgICAgICBmb3IgKGNvbnN0IFtpLCB2YWxdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICAgICAgcmV0dmFsW2ldID0gW3ZhbF07XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbjEgPSBhcnJheS5sZW5ndGg7IGkgPCBuMSAtIGNvdW50ICsgMTsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBjb21iaW5hdGlvbihhcnJheS5zbGljZShpICsgMSksIGNvdW50IC0gMSk7XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMCwgbjIgPSByb3cubGVuZ3RoOyBqIDwgbjI7IGorKykge1xuICAgICAgICAgICAgICAgIHJldHZhbC5wdXNoKFthcnJheVtpXV0uY29uY2F0KHJvd1tqXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUubWFwKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUubWFwKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgKkFycmF5KiBhcyB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c6YWN5YiX44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYXA8VCwgVT4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSB8IFByb21pc2U8VT4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxVW10+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXG4gICAgICAgIGFycmF5Lm1hcChhc3luYyAodiwgaSwgYSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyA/PyB0aGlzLCB2LCBpLCBhKTtcbiAgICAgICAgfSlcbiAgICApO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuZmlsdGVyKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZmlsdGVyKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgKkFycmF5KiBhcyB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c6YWN5YiX44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaWx0ZXI8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxUW10+IHtcbiAgICBjb25zdCBiaXRzOiBib29sZWFuW10gPSBhd2FpdCBtYXAoYXJyYXksICh2LCBpLCBhKSA9PiBjYWxsYmFjay5jYWxsKHRoaXNBcmcgPz8gdGhpcywgdiwgaSwgYSkpO1xuICAgIHJldHVybiBhcnJheS5maWx0ZXIoKCkgPT4gYml0cy5zaGlmdCgpKTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLmZpbmQoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5maW5kKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+e1kOaenOOCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZDxUPih0aGlzOiB1bmtub3duLCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBib29sZWFuIHwgUHJvbWlzZTxib29sZWFuPiwgdGhpc0FyZz86IHVua25vd24pOiBQcm9taXNlPFQgfCB1bmRlZmluZWQ+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyA/PyB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5maW5kSW5kZXgoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5maW5kSW5kZXgoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIHRoaXNBcmdcbiAqICAtIGBlbmAgVmFsdWUgdG8gdXNlIGFzICp0aGlzKiB3aGVuIGV4ZWN1dGluZyB0aGUgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDlrp/ooYzjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCBpbmRleCB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K544KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaW5kSW5kZXg8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyA/PyB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLnNvbWUoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5zb21lKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgYm9vbGVhbiB2YWx1ZS5cbiAqICAtIGBqYWAg55yf5YG95YCk44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzb21lPFQ+KHRoaXM6IHVua25vd24sIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHVua25vd24sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmIChhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgPz8gdGhpcywgdiwgaSwgYXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5ldmVyeSgpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLmV2ZXJ5KClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgYm9vbGVhbiB2YWx1ZS5cbiAqICAtIGBqYWAg55yf5YG95YCk44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBldmVyeTxUPih0aGlzOiB1bmtub3duLCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiB1bmtub3duLCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGZvciAoY29uc3QgW2ksIHZdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoIWF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyA/PyB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLnJlZHVjZSgpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLnJlZHVjZSgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gaW5pdGlhbFZhbHVlXG4gKiAgLSBgZW5gIFVzZWQgYXMgZmlyc3QgYXJndW1lbnQgdG8gdGhlIGZpcnN0IGNhbGwgb2YgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDjgavmuKHjgZXjgozjgovliJ3mnJ/lgKRcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCAqQXJyYXkqIGFzIHZhbHVlLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PntZDmnpzphY3liJfjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlZHVjZTxULCBVPihcbiAgICBhcnJheTogVFtdLFxuICAgIGNhbGxiYWNrOiAoYWNjdW11bGF0b3I6IFUsIGN1cnJlbnRWYWx1ZTogVCwgY3VycmVudEluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUgfCBQcm9taXNlPFU+LFxuICAgIGluaXRpYWxWYWx1ZT86IFVcbik6IFByb21pc2U8VT4ge1xuICAgIGlmIChhcnJheS5sZW5ndGggPD0gMCAmJiB1bmRlZmluZWQgPT09IGluaXRpYWxWYWx1ZSkge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1JlZHVjZSBvZiBlbXB0eSBhcnJheSB3aXRoIG5vIGluaXRpYWwgdmFsdWUnKTtcbiAgICB9XG5cbiAgICBjb25zdCBoYXNJbml0ID0gKHVuZGVmaW5lZCAhPT0gaW5pdGlhbFZhbHVlKTtcbiAgICBsZXQgYWNjID0gKGhhc0luaXQgPyBpbml0aWFsVmFsdWUgOiBhcnJheVswXSkgYXMgVTtcblxuICAgIGZvciAoY29uc3QgW2ksIHZdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoISghaGFzSW5pdCAmJiAwID09PSBpKSkge1xuICAgICAgICAgICAgYWNjID0gYXdhaXQgY2FsbGJhY2soYWNjLCB2LCBpLCBhcnJheSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYWNjO1xufVxuIiwiLyoqXG4gKiBAZW4gRGF0ZSB1bml0IGRlZmluaXRpb25zLlxuICogQGphIOaXpeaZguOCquODluOCuOOCp+OCr+ODiOOBruWNmOS9jeWumue+qVxuICovXG5leHBvcnQgdHlwZSBEYXRlVW5pdCA9ICd5ZWFyJyB8ICdtb250aCcgfCAnZGF5JyB8ICdob3VyJyB8ICdtaW4nIHwgJ3NlYycgfCAnbXNlYyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9jb21wdXRlRGF0ZUZ1bmNNYXAgPSB7XG4gICAgeWVhcjogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDRnVsbFllYXIoYmFzZS5nZXRVVENGdWxsWWVhcigpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbiAgICBtb250aDogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDTW9udGgoYmFzZS5nZXRVVENNb250aCgpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbiAgICBkYXk6IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ0RhdGUoYmFzZS5nZXRVVENEYXRlKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIGhvdXI6IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ0hvdXJzKGJhc2UuZ2V0VVRDSG91cnMoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG4gICAgbWluOiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENNaW51dGVzKGJhc2UuZ2V0VVRDTWludXRlcygpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbiAgICBzZWM6IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ1NlY29uZHMoYmFzZS5nZXRVVENTZWNvbmRzKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIG1zZWM6IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ01pbGxpc2Vjb25kcyhiYXNlLmdldFVUQ01pbGxpc2Vjb25kcygpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQGVuIENhbGN1bGF0ZSBmcm9tIHRoZSBkYXRlIHdoaWNoIGJlY29tZXMgYSBjYXJkaW5hbCBwb2ludCBiZWZvcmUgYSBOIGRhdGUgdGltZSBvciBhZnRlciBhIE4gZGF0ZSB0aW1lIChieSB7QGxpbmsgRGF0ZVVuaXR9KS5cbiAqIEBqYSDln7rngrnjgajjgarjgovml6Xku5jjgYvjgonjgIFO5pel5b6M44CBTuaXpeWJjeOCkueul+WHulxuICpcbiAqIEBwYXJhbSBiYXNlXG4gKiAgLSBgZW5gIGJhc2UgZGF0ZSB0aW1lLlxuICogIC0gYGphYCDln7rmupbml6VcbiAqIEBwYXJhbSBhZGRcbiAqICAtIGBlbmAgcmVsYXRpdmUgZGF0ZSB0aW1lLlxuICogIC0gYGphYCDliqDnrpfml6UuIOODnuOCpOODiuOCueaMh+WumuOBp27ml6XliY3jgoLoqK3lrprlj6/og71cbiAqIEBwYXJhbSB1bml0IHtAbGluayBEYXRlVW5pdH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVEYXRlKGJhc2U6IERhdGUsIGFkZDogbnVtYmVyLCB1bml0OiBEYXRlVW5pdCA9ICdkYXknKTogRGF0ZSB7XG4gICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKGJhc2UuZ2V0VGltZSgpKTtcbiAgICBjb25zdCBmdW5jID0gX2NvbXB1dGVEYXRlRnVuY01hcFt1bml0XTtcbiAgICBpZiAoZnVuYykge1xuICAgICAgICByZXR1cm4gZnVuYyhkYXRlLCBiYXNlLCBhZGQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYGludmFsaWQgdW5pdDogJHt1bml0fWApO1xuICAgIH1cbn1cbiIsImNvbnN0IF9zdGF0dXM6IFJlY29yZDxzdHJpbmcgfCBzeW1ib2wsIG51bWJlcj4gPSB7fTtcblxuLyoqXG4gKiBAZW4gSW5jcmVtZW50IHJlZmVyZW5jZSBjb3VudCBmb3Igc3RhdHVzIGlkZW50aWZpZXIuXG4gKiBAamEg54q25oWL5aSJ5pWw44Gu5Y+C54Wn44Kr44Km44Oz44OI44Gu44Kk44Oz44Kv44Oq44Oh44Oz44OIXG4gKlxuICogQHBhcmFtIHN0YXR1c1xuICogIC0gYGVuYCBzdGF0ZSBpZGVudGlmaWVyXG4gKiAgLSBgamFgIOeKtuaFi+itmOWIpeWtkFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgcmVmZXJlbmNlIGNvdW50IHZhbHVlXG4gKiAgLSBgamFgIOWPgueFp+OCq+OCpuODs+ODiOOBruWApFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RhdHVzQWRkUmVmKHN0YXR1czogc3RyaW5nIHwgc3ltYm9sKTogbnVtYmVyIHtcbiAgICBpZiAoIV9zdGF0dXNbc3RhdHVzXSkge1xuICAgICAgICBfc3RhdHVzW3N0YXR1c10gPSAxO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIF9zdGF0dXNbc3RhdHVzXSsrO1xuICAgIH1cbiAgICByZXR1cm4gX3N0YXR1c1tzdGF0dXNdO1xufVxuXG4vKipcbiAqIEBlbiBEZWNyZW1lbnQgcmVmZXJlbmNlIGNvdW50IGZvciBzdGF0dXMgaWRlbnRpZmllci5cbiAqIEBqYSDnirbmhYvlpInmlbDjga7lj4Lnhafjgqvjgqbjg7Pjg4jjga7jg4fjgq/jg6rjg6Hjg7Pjg4hcbiAqXG4gKiBAcGFyYW0gc3RhdHVzXG4gKiAgLSBgZW5gIHN0YXRlIGlkZW50aWZpZXJcbiAqICAtIGBqYWAg54q25oWL6K2Y5Yil5a2QXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCByZWZlcmVuY2UgY291bnQgdmFsdWVcbiAqICAtIGBqYWAg5Y+C54Wn44Kr44Km44Oz44OI44Gu5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGF0dXNSZWxlYXNlKHN0YXR1czogc3RyaW5nIHwgc3ltYm9sKTogbnVtYmVyIHtcbiAgICBpZiAoIV9zdGF0dXNbc3RhdHVzXSkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCByZXR2YWwgPSAtLV9zdGF0dXNbc3RhdHVzXTtcbiAgICAgICAgaWYgKDAgPT09IHJldHZhbCkge1xuICAgICAgICAgICAgZGVsZXRlIF9zdGF0dXNbc3RhdHVzXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gU3RhdGUgdmFyaWFibGUgbWFuYWdlbWVudCBzY29wZVxuICogQGphIOeKtuaFi+WkieaVsOeuoeeQhuOCueOCs+ODvOODl1xuICpcbiAqIEBwYXJhbSBzdGF0dXNcbiAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBzZWVkIGZ1bmN0aW9uLlxuICogIC0gYGphYCDlr77osaHjga7plqLmlbBcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIHJldHZhbCBvZiBzZWVkIGZ1bmN0aW9uLlxuICogIC0gYGphYCDlr77osaHjga7plqLmlbDjga7miLvjgorlgKRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXR1c1Njb3BlPFQ+KHN0YXR1czogc3RyaW5nIHwgc3ltYm9sLCBleGVjdXRvcjogKCkgPT4gVCB8IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICB0cnkge1xuICAgICAgICBzdGF0dXNBZGRSZWYoc3RhdHVzKTtcbiAgICAgICAgcmV0dXJuIGF3YWl0IGV4ZWN1dG9yKCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgc3RhdHVzUmVsZWFzZShzdGF0dXMpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgaWYgaXQncyBpbiB0aGUgc3BlY2lmaWVkIHN0YXRlLlxuICogQGphIOaMh+WumuOBl+OBn+eKtuaFi+S4reOBp+OBguOCi+OBi+eiuuiqjVxuICpcbiAqIEBwYXJhbSBzdGF0dXNcbiAqICAtIGBlbmAgc3RhdGUgaWRlbnRpZmllclxuICogIC0gYGphYCDnirbmhYvorZjliKXlrZBcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHRydWU6IOeKtuaFi+WGhSAvIGZhbHNlOiDnirbmhYvlpJZcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIGB0cnVlYDogd2l0aGluIHRoZSBzdGF0dXMgLyBgZmFsc2VgOiBvdXQgb2YgdGhlIHN0YXR1c1xuICogIC0gYGphYCBgdHJ1ZWA6IOeKtuaFi+WGhSAvIGBmYWxzZWA6IOeKtuaFi+WkllxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdGF0dXNJbihzdGF0dXM6IHN0cmluZyB8IHN5bWJvbCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIV9zdGF0dXNbc3RhdHVzXTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdz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QUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUNyQyxJQUFBLE1BQU0sSUFBSSxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQztJQUN0QyxJQUFJLElBQUksRUFBRTtRQUNOLE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDOztTQUN6QjtBQUNILFFBQUEsTUFBTSxJQUFJLFNBQVMsQ0FBQyxpQkFBaUIsSUFBSSxDQUFBLENBQUUsQ0FBQzs7QUFFcEQ7O0FDMURBLE1BQU0sT0FBTyxHQUFvQyxFQUFFO0FBRW5EOzs7Ozs7Ozs7O0FBVUc7QUFDRyxTQUFVLFlBQVksQ0FBQyxNQUF1QixFQUFBO0FBQ2hELElBQUEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtBQUNsQixRQUFBLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDOztTQUNoQjtBQUNILFFBQUEsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFOztBQUVyQixJQUFBLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUMxQjtBQUVBOzs7Ozs7Ozs7O0FBVUc7QUFDRyxTQUFVLGFBQWEsQ0FBQyxNQUF1QixFQUFBO0FBQ2pELElBQUEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtBQUNsQixRQUFBLE9BQU8sQ0FBQzs7U0FDTDtBQUNILFFBQUEsTUFBTSxNQUFNLEdBQUcsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDO0FBQ2hDLFFBQUEsSUFBSSxDQUFDLEtBQUssTUFBTSxFQUFFO0FBQ2QsWUFBQSxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUM7O0FBRTFCLFFBQUEsT0FBTyxNQUFNOztBQUVyQjtBQUVBOzs7Ozs7Ozs7Ozs7O0FBYUc7QUFDSSxlQUFlLFdBQVcsQ0FBSSxNQUF1QixFQUFFLFFBQThCLEVBQUE7QUFDeEYsSUFBQSxJQUFJO1FBQ0EsWUFBWSxDQUFDLE1BQU0sQ0FBQztRQUNwQixPQUFPLE1BQU0sUUFBUSxFQUFFOztZQUNqQjtRQUNOLGFBQWEsQ0FBQyxNQUFNLENBQUM7O0FBRTdCO0FBRUE7Ozs7Ozs7Ozs7O0FBV0c7QUFDRyxTQUFVLFVBQVUsQ0FBQyxNQUF1QixFQUFBO0FBQzlDLElBQUEsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUM1Qjs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvY29yZS11dGlscy8ifQ==