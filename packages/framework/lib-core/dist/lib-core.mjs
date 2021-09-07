/*!
 * @cdp/lib-core 0.9.9
 *   core library collection
 */

/*!
 * @cdp/core-utils 0.9.9
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
        // eslint-disable-next-line no-invalid-this
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
const { 
/** @internal */ random } = Math;
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
 * @cdp/events 0.9.9
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
 * @cdp/promise 0.9.9
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
        let status = 0 /* OPEN */;
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
        context.status |= 1 /* REQUESTED */;
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
        context.status |= 2 /* CLOSED */;
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
 * @cdp/observable 0.9.9
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
        if ("disabled" /* DISABLED */ !== target[_internal].state && value !== oldValue) {
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
    constructor(state = "active" /* ACTIVE */) {
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
        if ("active" /* ACTIVE */ !== state) {
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
Object.freeze(_proxyHandler);
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
        if (1 === argLength && isNumber$1(arguments[0])) {
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
            void post(() => this[_notifyChanges]());
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
        internal.broker.get().trigger('@', records);
    }
}

/*!
 * @cdp/result 0.9.9
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
 * @cdp/core-storage 0.9.9
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
 * @cdp/core-template 0.9.9
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
    const namespace = getGlobalNamespace("CDP_DECLARE" /* NAMESPACE */);
    namespace["TEMPLATE_CACHE" /* ROOT */] = {};
}
/** @internal global cache pool */
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
        const value = (isFunction(partials) ? partials(token[1 /* VALUE */]) : partials[token[1 /* VALUE */]]);
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

export { $cdp, ASSIGN_RESULT_CODE, CancelToken, CancelablePromise, DECLARE_ERROR_CODE, DECLARE_SUCCESS_CODE, EventBroker, EventPublisher, EventReceiver, EventSourceBase as EventSource, FAILED, MemoryStorage, ObservableArray, ObservableObject, CancelablePromise as Promise, PromiseManager, RESULT_CODE, Registry, Result, SUCCEEDED, TemplateEngine, at, camelize, capitalize, checkCanceled, className, classify, clearInterval, clearTimeout, combination, computeDate, createEscaper, dasherize, debounce, decapitalize, deepCopy, deepEqual, deepMerge, diff, difference, drop, dropUndefined, ensureObject, escapeHTML, every, exists, extendPromise, filter, find, findIndex, fromTypedData, getConfig, getGlobal, getGlobalNamespace, groupBy, has, indices, instanceOf, intersection, invert, isArray, isBigInt, isBoolean, isChancelLikeError, isEmptyObject, isFunction, isIterable, isNil, isNumber$1 as isNumber, isObject, isObservable, isPlainObject, isPrimitive, isResult, isString, isSymbol, isTypedArray, luid, makeCanceledResult, makeResult, map, memoryStorage, mixins, noop, omit, once, ownInstanceOf, permutation, pick, post, randomInt, reduce, restoreNil, result, safe, sameClass, sameType, sample, setInterval, setMixClassAttribute, setTimeout, shuffle, sleep, some, sort, throttle, toHelpString, toNameString, toResult, toTypedData, typeOf, underscored, unescapeHTML, union, unique, verify, wait, without };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliLWNvcmUubWpzIiwic291cmNlcyI6WyJjb3JlLXV0aWxzL2NvbmZpZy50cyIsImNvcmUtdXRpbHMvdHlwZXMudHMiLCJjb3JlLXV0aWxzL3ZlcmlmeS50cyIsImNvcmUtdXRpbHMvZGVlcC1jaXJjdWl0LnRzIiwiY29yZS11dGlscy9taXhpbnMudHMiLCJjb3JlLXV0aWxzL29iamVjdC50cyIsImNvcmUtdXRpbHMvc2FmZS50cyIsImNvcmUtdXRpbHMvdGltZXIudHMiLCJjb3JlLXV0aWxzL21pc2MudHMiLCJjb3JlLXV0aWxzL2FycmF5LnRzIiwiY29yZS11dGlscy9kYXRlLnRzIiwiZXZlbnRzL3B1Ymxpc2hlci50cyIsImV2ZW50cy9icm9rZXIudHMiLCJldmVudHMvcmVjZWl2ZXIudHMiLCJldmVudHMvc291cmNlLnRzIiwicHJvbWlzZS9pbnRlcm5hbC50cyIsInByb21pc2UvY2FuY2VsLXRva2VuLnRzIiwicHJvbWlzZS9jYW5jZWxhYmxlLXByb21pc2UudHMiLCJwcm9taXNlL3V0aWxzLnRzIiwib2JzZXJ2YWJsZS9pbnRlcm5hbC50cyIsIm9ic2VydmFibGUvY29tbW9uLnRzIiwib2JzZXJ2YWJsZS9vYmplY3QudHMiLCJvYnNlcnZhYmxlL2FycmF5LnRzIiwicmVzdWx0L3Jlc3VsdC1jb2RlLWRlZnMudHMiLCJyZXN1bHQvcmVzdWx0LWNvZGUudHMiLCJyZXN1bHQvcmVzdWx0LnRzIiwiY29yZS1zdG9yYWdlL21lbW9yeS1zdG9yYWdlLnRzIiwiY29yZS1zdG9yYWdlL3JlZ2lzdHJ5LnRzIiwiY29yZS10ZW1wbGF0ZS9pbnRlcm5hbC50cyIsImNvcmUtdGVtcGxhdGUvY2FjaGUudHMiLCJjb3JlLXRlbXBsYXRlL3V0aWxzLnRzIiwiY29yZS10ZW1wbGF0ZS9zY2FubmVyLnRzIiwiY29yZS10ZW1wbGF0ZS9jb250ZXh0LnRzIiwiY29yZS10ZW1wbGF0ZS9wYXJzZS50cyIsImNvcmUtdGVtcGxhdGUvd3JpdGVyLnRzIiwiY29yZS10ZW1wbGF0ZS9jbGFzcy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBlbiBTYWZlIGBnbG9iYWxgIGFjY2Vzc29yLlxuICogQGphIGBnbG9iYWxgIOOCouOCr+OCu+ODg+OCtVxuICogXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBgZ2xvYmFsYCBvYmplY3Qgb2YgdGhlIHJ1bnRpbWUgZW52aXJvbm1lbnRcbiAqICAtIGBqYWAg55Kw5aKD44Gr5b+c44GY44GfIGBnbG9iYWxgIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2xvYmFsKCk6IHR5cGVvZiBnbG9iYWxUaGlzIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbmV3LWZ1bmMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1pbXBsaWVkLWV2YWxcbiAgICByZXR1cm4gKCdvYmplY3QnID09PSB0eXBlb2YgZ2xvYmFsVGhpcykgPyBnbG9iYWxUaGlzIDogRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcbn1cblxuLyoqXG4gKiBAZW4gRW5zdXJlIG5hbWVkIG9iamVjdCBhcyBwYXJlbnQncyBwcm9wZXJ0eS5cbiAqIEBqYSDopqrjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrprjgZfjgaYsIOWQjeWJjeOBq+aMh+WumuOBl+OBn+OCquODluOCuOOCp+OCr+ODiOOBruWtmOWcqOOCkuS/neiovFxuICpcbiAqIEBwYXJhbSBwYXJlbnRcbiAqICAtIGBlbmAgcGFyZW50IG9iamVjdC4gSWYgbnVsbCBnaXZlbiwgYGdsb2JhbFRoaXNgIGlzIGFzc2lnbmVkLlxuICogIC0gYGphYCDopqrjgqrjg5bjgrjjgqfjgq/jg4guIG51bGwg44Gu5aC05ZCI44GvIGBnbG9iYWxUaGlzYCDjgYzkvb/nlKjjgZXjgozjgotcbiAqIEBwYXJhbSBuYW1lc1xuICogIC0gYGVuYCBvYmplY3QgbmFtZSBjaGFpbiBmb3IgZW5zdXJlIGluc3RhbmNlLlxuICogIC0gYGphYCDkv53oqLzjgZnjgovjgqrjg5bjgrjjgqfjgq/jg4jjga7lkI3liY1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZU9iamVjdDxUIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PihwYXJlbnQ6IG9iamVjdCB8IG51bGwsIC4uLm5hbWVzOiBzdHJpbmdbXSk6IFQge1xuICAgIGxldCByb290ID0gcGFyZW50IHx8IGdldEdsb2JhbCgpO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBuYW1lcykge1xuICAgICAgICByb290W25hbWVdID0gcm9vdFtuYW1lXSB8fCB7fTtcbiAgICAgICAgcm9vdCA9IHJvb3RbbmFtZV07XG4gICAgfVxuICAgIHJldHVybiByb290IGFzIFQ7XG59XG5cbi8qKlxuICogQGVuIEdsb2JhbCBuYW1lc3BhY2UgYWNjZXNzb3IuXG4gKiBAamEg44Kw44Ot44O844OQ44Or44ON44O844Og44K544Oa44O844K544Ki44Kv44K744OD44K1XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWxOYW1lc3BhY2U8VCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4obmFtZXNwYWNlOiBzdHJpbmcpOiBUIHtcbiAgICByZXR1cm4gZW5zdXJlT2JqZWN0PFQ+KG51bGwsIG5hbWVzcGFjZSk7XG59XG5cbi8qKlxuICogQGVuIEdsb2JhbCBjb25maWcgYWNjZXNzb3IuXG4gKiBAamEg44Kw44Ot44O844OQ44Or44Kz44Oz44OV44Kj44Kw44Ki44Kv44K744OD44K1XG4gKlxuICogQHJldHVybnMgZGVmYXVsdDogYENEUC5Db25maWdgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25maWc8VCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4obmFtZXNwYWNlID0gJ0NEUCcsIGNvbmZpZ05hbWUgPSAnQ29uZmlnJyk6IFQge1xuICAgIHJldHVybiBlbnN1cmVPYmplY3Q8VD4oZ2V0R2xvYmFsTmFtZXNwYWNlKG5hbWVzcGFjZSksIGNvbmZpZ05hbWUpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9iYW4tdHlwZXMsXG4gKi9cblxuLyoqXG4gKiBAZW4gUHJpbWl0aXZlIHR5cGUgb2YgSmF2YVNjcmlwdC5cbiAqIEBqYSBKYXZhU2NyaXB0IOOBruODl+ODquODn+ODhuOCo+ODluWei1xuICovXG5leHBvcnQgdHlwZSBQcmltaXRpdmUgPSBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgc3ltYm9sIHwgYmlnaW50IHwgbnVsbCB8IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBAZW4gVGhlIGdlbmVyYWwgbnVsbCB0eXBlLlxuICogQGphIOepuuOCkuekuuOBmeWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBOaWwgPSB2b2lkIHwgbnVsbCB8IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBAZW4gVGhlIHR5cGUgb2Ygb2JqZWN0IG9yIFtbTmlsXV0uXG4gKiBAamEgW1tOaWxdXSDjgavjgarjgorjgYjjgovjgqrjg5bjgrjjgqfjgq/jg4jlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgTmlsbGFibGU8VCBleHRlbmRzIG9iamVjdD4gPSBUIHwgTmlsO1xuXG4vKipcbiAqIEBlbiBBdm9pZCB0aGUgYEZ1bmN0aW9uYHR5cGVzLlxuICogQGphIOaxjueUqOmWouaVsOWei1xuICovXG5leHBvcnQgdHlwZSBVbmtub3duRnVuY3Rpb24gPSAoLi4uYXJnczogdW5rbm93bltdKSA9PiB1bmtub3duO1xuXG4vKipcbiAqIEBlbiBBdm9pZCB0aGUgYE9iamVjdGAgYW5kIGB7fWAgdHlwZXMsIGFzIHRoZXkgbWVhbiBcImFueSBub24tbnVsbGlzaCB2YWx1ZVwiLlxuICogQGphIOaxjueUqOOCquODluOCuOOCp+OCr+ODiOWeiy4gYE9iamVjdGAg44GK44KI44GzIGB7fWAg44K/44Kk44OX44Gv44CMbnVsbOOBp+OBquOBhOWApOOAjeOCkuaEj+WRs+OBmeOCi+OBn+OCgeS7o+S+oeOBqOOBl+OBpuS9v+eUqFxuICovXG5leHBvcnQgdHlwZSBVbmtub3duT2JqZWN0ID0gUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG5cbi8qKlxuICogQGVuIE5vbi1udWxsaXNoIHZhbHVlLlxuICogQGphIOmdniBOdWxsIOWApFxuICovXG5leHBvcnQgdHlwZSBOb25OaWwgPSB7fTtcblxuLyoqXG4gKiBAZW4gSmF2YVNjcmlwdCB0eXBlIHNldCBpbnRlcmZhY2UuXG4gKiBAamEgSmF2YVNjcmlwdCDjga7lnovjga7pm4blkIhcbiAqL1xuaW50ZXJmYWNlIFR5cGVMaXN0IHtcbiAgICBzdHJpbmc6IHN0cmluZztcbiAgICBudW1iZXI6IG51bWJlcjtcbiAgICBib29sZWFuOiBib29sZWFuO1xuICAgIHN5bWJvbDogc3ltYm9sO1xuICAgIGJpZ2ludDogYmlnaW50O1xuICAgIHVuZGVmaW5lZDogdm9pZCB8IHVuZGVmaW5lZDtcbiAgICBvYmplY3Q6IG9iamVjdCB8IG51bGw7XG4gICAgZnVuY3Rpb24oLi4uYXJnczogdW5rbm93bltdKTogdW5rbm93bjtcbn1cblxuLyoqXG4gKiBAZW4gVGhlIGtleSBsaXN0IG9mIFtbVHlwZUxpc3RdXS5cbiAqIEBqYSBbW1R5cGVMaXN0XV0g44Kt44O85LiA6KanXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVLZXlzID0ga2V5b2YgVHlwZUxpc3Q7XG5cbi8qKlxuICogQGVuIFR5cGUgYmFzZSBkZWZpbml0aW9uLlxuICogQGphIOWei+OBruimj+WumuWumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFR5cGU8VCBleHRlbmRzIG9iamVjdD4gZXh0ZW5kcyBGdW5jdGlvbiB7XG4gICAgcmVhZG9ubHkgcHJvdG90eXBlOiBUO1xufVxuXG4vKipcbiAqIEBlbiBUeXBlIG9mIGNvbnN0cnVjdG9yLlxuICogQGphIOOCs+ODs+OCueODiOODqeOCr+OCv+Wei1xuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbnN0cnVjdG9yPFQgZXh0ZW5kcyBvYmplY3Q+IGV4dGVuZHMgVHlwZTxUPiB7XG4gICAgbmV3KC4uLmFyZ3M6IGFueVtdKTogVDtcbn1cblxuLyoqXG4gKiBAZW4gVHlwZSBvZiBjbGFzcy5cbiAqIEBqYSDjgq/jg6njgrnlnotcbiAqL1xuZXhwb3J0IHR5cGUgQ2xhc3M8VCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4gPSBDb25zdHJ1Y3RvcjxUPjtcblxuLyoqXG4gKiBAZW4gRW5zdXJlIGZvciBmdW5jdGlvbiBwYXJhbWV0ZXJzIHRvIHR1cGxlLlxuICogQGphIOmWouaVsOODkeODqeODoeODvOOCv+OBqOOBl+OBpiB0dXBsZSDjgpLkv53oqLxcbiAqL1xuZXhwb3J0IHR5cGUgQXJndW1lbnRzPFQ+ID0gVCBleHRlbmRzIGFueVtdID8gVCA6IFtUXTtcblxuLyoqXG4gKiBAZW4gUm1vdmUgYHJlYWRvbmx5YCBhdHRyaWJ1dGVzIGZyb20gaW5wdXQgdHlwZS5cbiAqIEBqYSBgcmVhZG9ubHlgIOWxnuaAp+OCkuino+mZpFxuICovXG5leHBvcnQgdHlwZSBXcml0YWJsZTxUPiA9IHsgLXJlYWRvbmx5IFtLIGluIGtleW9mIFRdOiBUW0tdIH07XG5cbi8qKlxuICogQGVuIEV4dHJhY3QgZnVuY3Rpb25hbCBwcm9wZXJ0eSBuYW1lcy5cbiAqIEBqYSDplqLmlbDjg5fjg63jg5Hjg4bjgqPlkI3jga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+ID0geyBbSyBpbiBrZXlvZiBUXTogVFtLXSBleHRlbmRzIEZ1bmN0aW9uID8gSyA6IG5ldmVyIH1ba2V5b2YgVF0gJiBzdHJpbmc7XG5cbi8qKlxuICogQGVuIEV4dHJhY3QgZnVuY3Rpb25hbCBwcm9wZXJ0aWVzLlxuICogQGphIOmWouaVsOODl+ODreODkeODhuOCo+OBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBGdW5jdGlvblByb3BlcnRpZXM8VD4gPSBQaWNrPFQsIEZ1bmN0aW9uUHJvcGVydHlOYW1lczxUPj47XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgbm9uLWZ1bmN0aW9uYWwgcHJvcGVydHkgbmFtZXMuXG4gKiBAamEg6Z2e6Zai5pWw44OX44Ot44OR44OG44Kj5ZCN44Gu5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxUPiA9IHsgW0sgaW4ga2V5b2YgVF06IFRbS10gZXh0ZW5kcyBGdW5jdGlvbiA/IG5ldmVyIDogSyB9W2tleW9mIFRdICYgc3RyaW5nO1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG5vbi1mdW5jdGlvbmFsIHByb3BlcnRpZXMuXG4gKiBAamEg6Z2e6Zai5pWw44OX44Ot44OR44OG44Kj44Gu5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIE5vbkZ1bmN0aW9uUHJvcGVydGllczxUPiA9IFBpY2s8VCwgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+PjtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBub24tZnVuY3Rpb25hbCB0eXBlcy5cbiAqIEBqYSDpnZ7plqLmlbDlnovjga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgTm9uRnVuY3Rpb248VD4gPSBUIGV4dGVuZHMgRnVuY3Rpb24gPyBuZXZlciA6IFQ7XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgb2JqZWN0IGtleSBsaXN0LiAoZW5zdXJlIG9ubHkgJ3N0cmluZycpXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu44Kt44O85LiA6Kan44KS5oq95Ye6ICgnc3RyaW5nJyDlnovjga7jgb/jgpLkv53oqLwpXG4gKi9cbmV4cG9ydCB0eXBlIEtleXM8VCBleHRlbmRzIG9iamVjdD4gPSBrZXlvZiBPbWl0PFQsIG51bWJlciB8IHN5bWJvbD47XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgb2JqZWN0IHR5cGUgbGlzdC5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7lnovkuIDopqfjgpLmir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZXM8VCBleHRlbmRzIG9iamVjdD4gPSBUW2tleW9mIFRdO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IG9iamVjdCBrZXkgdG8gdHlwZS5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjgq3jg7zjgYvjgonlnovjgbjlpInmj5tcbiAqL1xuZXhwb3J0IHR5cGUgS2V5VG9UeXBlPE8gZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBrZXlvZiBPPiA9IEsgZXh0ZW5kcyBrZXlvZiBPID8gT1tLXSA6IG5ldmVyO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IG9iamVjdCB0eXBlIHRvIGtleS5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jlnovjgYvjgonjgq3jg7zjgbjlpInmj5tcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZVRvS2V5PE8gZXh0ZW5kcyBvYmplY3QsIFQgZXh0ZW5kcyBUeXBlczxPPj4gPSB7IFtLIGluIGtleW9mIE9dOiBPW0tdIGV4dGVuZHMgVCA/IEsgOiBuZXZlciB9W2tleW9mIE9dO1xuXG4vKipcbiAqIEBlbiBUaGUgW1tQbGFpbk9iamVjdF1dIHR5cGUgaXMgYSBKYXZhU2NyaXB0IG9iamVjdCBjb250YWluaW5nIHplcm8gb3IgbW9yZSBrZXktdmFsdWUgcGFpcnMuIDxicj5cbiAqICAgICAnUGxhaW4nIG1lYW5zIGl0IGZyb20gb3RoZXIga2luZHMgb2YgSmF2YVNjcmlwdCBvYmplY3RzLiBleDogbnVsbCwgdXNlci1kZWZpbmVkIGFycmF5cywgYW5kIGhvc3Qgb2JqZWN0cyBzdWNoIGFzIGBkb2N1bWVudGAuXG4gKiBAamEgMCDku6XkuIrjga4ga2V5LXZhbHVlIOODmuOCouOCkuaMgeOBpCBbW1BsYWluT2JqZWN0XV0g5a6a576pIDxicj5cbiAqICAgICAnUGxhaW4nIOOBqOOBr+S7luOBrueorumhnuOBriBKYXZhU2NyaXB0IOOCquODluOCuOOCp+OCr+ODiOOCkuWQq+OBvuOBquOBhOOCquODluOCuOOCp+OCr+ODiOOCkuaEj+WRs+OBmeOCiy4g5L6LOiAgbnVsbCwg44Om44O844K244O85a6a576p6YWN5YiXLCDjgb7jgZ/jga8gYGRvY3VtZW50YCDjga7jgojjgYbjgarntYTjgb/ovrzjgb/jgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IHR5cGUgUGxhaW5PYmplY3Q8VCA9IHt9IHwgbnVsbCB8IHVuZGVmaW5lZD4gPSBSZWNvcmQ8c3RyaW5nLCBUPjtcblxuLyoqXG4gKiBAZW4gVGhlIGRhdGEgdHlwZSBsaXN0IGJ5IHdoaWNoIHN0eWxlIGNvbXB1bHNpb24gaXMgcG9zc2libGUuXG4gKiBAamEg5Z6L5by35Yi25Y+v6IO944Gq44OH44O844K/5Z6L5LiA6KanXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVkRGF0YSA9IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsIHwgb2JqZWN0O1xuXG4vKipcbiAqIEBlbiBUaGUgZGF0YSB0eXBlIGxpc3Qgb2YgVHlwZWRBcnJheS5cbiAqIEBqYSBUeXBlZEFycmF5IOS4gOimp1xuICovXG5leHBvcnQgdHlwZSBUeXBlZEFycmF5ID0gSW50OEFycmF5IHwgVWludDhBcnJheSB8IFVpbnQ4Q2xhbXBlZEFycmF5IHwgSW50MTZBcnJheSB8IFVpbnQxNkFycmF5IHwgSW50MzJBcnJheSB8IFVpbnQzMkFycmF5IHwgRmxvYXQzMkFycmF5IHwgRmxvYXQ2NEFycmF5O1xuXG4vKipcbiAqIEBlbiBUeXBlZEFycmF5IGNvbnN0cnVjdG9yLlxuICogQGphIFR5cGVkQXJyYXkg44Kz44Oz44K544OI44Op44Kv44K/5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZWRBcnJheUNvbnN0cnVjdG9yIHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IFR5cGVkQXJyYXk7XG4gICAgbmV3KHNlZWQ6IG51bWJlciB8IEFycmF5TGlrZTxudW1iZXI+IHwgQXJyYXlCdWZmZXJMaWtlKTogVHlwZWRBcnJheTtcbiAgICBuZXcoYnVmZmVyOiBBcnJheUJ1ZmZlckxpa2UsIGJ5dGVPZmZzZXQ/OiBudW1iZXIsIGxlbmd0aD86IG51bWJlcik6IFR5cGVkQXJyYXk7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIHNpemUgaW4gYnl0ZXMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEg6KaB57Sg44Gu44OQ44Kk44OI44K144Kk44K6XG4gICAgICovXG4gICAgcmVhZG9ubHkgQllURVNfUEVSX0VMRU1FTlQ6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGEgbmV3IGFycmF5IGZyb20gYSBzZXQgb2YgZWxlbWVudHMuXG4gICAgICogQGphIOimgee0oOOCkuioreWumuOBl+aWsOimj+mFjeWIl+OCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGl0ZW1zXG4gICAgICogIC0gYGVuYCBBIHNldCBvZiBlbGVtZW50cyB0byBpbmNsdWRlIGluIHRoZSBuZXcgYXJyYXkgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5paw44Gf44Gr6Kit5a6a44GZ44KL6KaB57SgXG4gICAgICovXG4gICAgb2YoLi4uaXRlbXM6IG51bWJlcltdKTogVHlwZWRBcnJheTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvciBpdGVyYWJsZSBvYmplY3QuXG4gICAgICogQGphIGFycmF5LWxpa2UgLyBpdGVyYXRhYmxlIOOCquODluOCuOOCp+OCr+ODiOOBi+OCieaWsOimj+mFjeWIl+OCkuS9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5TGlrZVxuICAgICAqICAtIGBlbmAgQW4gYXJyYXktbGlrZSBvciBpdGVyYWJsZSBvYmplY3QgdG8gY29udmVydCB0byBhbiBhcnJheS5cbiAgICAgKiAgLSBgamFgIGFycmF5LWxpa2Ug44KC44GX44GP44GvIGl0ZXJhdGFibGUg44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgZnJvbShhcnJheUxpa2U6IEFycmF5TGlrZTxudW1iZXI+KTogVHlwZWRBcnJheTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvciBpdGVyYWJsZSBvYmplY3QuXG4gICAgICogQGphIGFycmF5LWxpa2UgLyBpdGVyYXRhYmxlIOOCquODluOCuOOCp+OCr+ODiOOBi+OCieaWsOimj+mFjeWIl+OCkuS9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5TGlrZVxuICAgICAqICAtIGBlbmAgQW4gYXJyYXktbGlrZSBvciBpdGVyYWJsZSBvYmplY3QgdG8gY29udmVydCB0byBhbiBhcnJheS5cbiAgICAgKiAgLSBgamFgIGFycmF5LWxpa2Ug44KC44GX44GP44GvIGl0ZXJhdGFibGUg44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG1hcGZuXG4gICAgICogIC0gYGVuYCBBIG1hcHBpbmcgZnVuY3Rpb24gdG8gY2FsbCBvbiBldmVyeSBlbGVtZW50IG9mIHRoZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOWFqOimgee0oOOBq+mBqeeUqOOBmeOCi+ODl+ODreOCreOCt+mWouaVsFxuICAgICAqIEBwYXJhbSB0aGlzQXJnXG4gICAgICogIC0gYGVuYCBWYWx1ZSBvZiAndGhpcycgdXNlZCB0byBpbnZva2UgdGhlIG1hcGZuLlxuICAgICAqICAtIGBqYWAgbWFwZm4g44Gr5L2/55So44GZ44KLICd0aGlzJ1xuICAgICAqL1xuICAgIGZyb208VD4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4sIG1hcGZuOiAodjogVCwgazogbnVtYmVyKSA9PiBudW1iZXIsIHRoaXNBcmc/OiB1bmtub3duKTogVHlwZWRBcnJheTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBleGlzdHMuXG4gKiBAamEg5YCk44GM5a2Y5Zyo44GZ44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXhpc3RzPFQ+KHg6IFQgfCBOaWwpOiB4IGlzIFQge1xuICAgIHJldHVybiBudWxsICE9IHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFtbTmlsXV0uXG4gKiBAamEgW1tOaWxdXSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05pbCh4OiB1bmtub3duKTogeCBpcyBOaWwge1xuICAgIHJldHVybiBudWxsID09IHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFN0cmluZy5cbiAqIEBqYSBTdHJpbmcg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmcoeDogdW5rbm93bik6IHggaXMgc3RyaW5nIHtcbiAgICByZXR1cm4gJ3N0cmluZycgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBOdW1iZXIuXG4gKiBAamEgTnVtYmVyIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTnVtYmVyKHg6IHVua25vd24pOiB4IGlzIG51bWJlciB7XG4gICAgcmV0dXJuICdudW1iZXInID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgQm9vbGVhbi5cbiAqIEBqYSBCb29sZWFuIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQm9vbGVhbih4OiB1bmtub3duKTogeCBpcyBib29sZWFuIHtcbiAgICByZXR1cm4gJ2Jvb2xlYW4nID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgU3ltYmxlLlxuICogQGphIFN5bWJvbCDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N5bWJvbCh4OiB1bmtub3duKTogeCBpcyBzeW1ib2wge1xuICAgIHJldHVybiAnc3ltYm9sJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIEJpZ0ludC5cbiAqIEBqYSBCaWdJbnQg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCaWdJbnQoeDogdW5rbm93bik6IHggaXMgYmlnaW50IHtcbiAgICByZXR1cm4gJ2JpZ2ludCcgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBwcmltaXRpdmUgdHlwZS5cbiAqIEBqYSDjg5fjg6rjg5/jg4bjgqPjg5blnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1ByaW1pdGl2ZSh4OiB1bmtub3duKTogeCBpcyBQcmltaXRpdmUge1xuICAgIHJldHVybiAheCB8fCAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHgpICYmICgnb2JqZWN0JyAhPT0gdHlwZW9mIHgpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBBcnJheS5cbiAqIEBqYSBBcnJheSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBjb25zdCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgT2JqZWN0LlxuICogQGphIE9iamVjdCDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09iamVjdCh4OiB1bmtub3duKTogeCBpcyBvYmplY3Qge1xuICAgIHJldHVybiBCb29sZWFuKHgpICYmICdvYmplY3QnID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgW1tQbGFpbk9iamVjdF1dLlxuICogQGphIFtbUGxhaW5PYmplY3RdXSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KHg6IHVua25vd24pOiB4IGlzIFBsYWluT2JqZWN0IHtcbiAgICBpZiAoIWlzT2JqZWN0KHgpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBjcmVhdGUgZnJvbSBgT2JqZWN0LmNyZWF0ZSggbnVsbCApYCBpcyBwbGFpblxuICAgIGlmICghT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBvd25JbnN0YW5jZU9mKE9iamVjdCwgeCk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIGVtcHR5IG9iamVjdC5cbiAqIEBqYSDnqbrjgqrjg5bjgrjjgqfjgq/jg4jjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0VtcHR5T2JqZWN0KHg6IHVua25vd24pOiB4IGlzIG9iamVjdCB7XG4gICAgaWYgKCFpc1BsYWluT2JqZWN0KHgpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBuYW1lIGluIHgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgRnVuY3Rpb24uXG4gKiBAamEgRnVuY3Rpb24g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNGdW5jdGlvbih4OiB1bmtub3duKTogeCBpcyBUeXBlTGlzdFsnZnVuY3Rpb24nXSB7XG4gICAgcmV0dXJuICdmdW5jdGlvbicgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBpbnB1dC5cbiAqIEBqYSDmjIflrprjgZfjgZ/lnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gdHlwZVxuICogIC0gYGVuYCBldmFsdWF0ZWQgdHlwZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlnotcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHR5cGVPZjxLIGV4dGVuZHMgVHlwZUtleXM+KHR5cGU6IEssIHg6IHVua25vd24pOiB4IGlzIFR5cGVMaXN0W0tdIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09IHR5cGU7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBoYXMgaXRlcmF0b3IuXG4gKiBAamEgaXRlcmF0b3Ig44KS5omA5pyJ44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZTxUPih4OiBOaWxsYWJsZTxJdGVyYWJsZTxUPj4pOiB4IGlzIEl0ZXJhYmxlPFQ+O1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGUoeDogdW5rbm93bik6IHggaXMgSXRlcmFibGU8dW5rbm93bj47XG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZSh4OiB1bmtub3duKTogYW55IHtcbiAgICByZXR1cm4gU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdCh4KTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3R5cGVkQXJyYXlOYW1lcyA9IHtcbiAgICAnSW50OEFycmF5JzogdHJ1ZSxcbiAgICAnVWludDhBcnJheSc6IHRydWUsXG4gICAgJ1VpbnQ4Q2xhbXBlZEFycmF5JzogdHJ1ZSxcbiAgICAnSW50MTZBcnJheSc6IHRydWUsXG4gICAgJ1VpbnQxNkFycmF5JzogdHJ1ZSxcbiAgICAnSW50MzJBcnJheSc6IHRydWUsXG4gICAgJ1VpbnQzMkFycmF5JzogdHJ1ZSxcbiAgICAnRmxvYXQzMkFycmF5JzogdHJ1ZSxcbiAgICAnRmxvYXQ2NEFycmF5JzogdHJ1ZSxcbn07XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBpcyBvbmUgb2YgW1tUeXBlZEFycmF5XV0uXG4gKiBAamEg5oyH5a6a44GX44Gf44Kk44Oz44K544K/44Oz44K544GMIFtbVHlwZWRBcnJheV1dIOOBruS4gOeoruOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZWRBcnJheSh4OiB1bmtub3duKTogeCBpcyBUeXBlZEFycmF5IHtcbiAgICByZXR1cm4gISFfdHlwZWRBcnJheU5hbWVzW2NsYXNzTmFtZSh4KV07XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBpbnN0YW5jZSBvZiBpbnB1dC5cbiAqIEBqYSDmjIflrprjgZfjgZ/jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL44Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnN0YW5jZU9mPFQgZXh0ZW5kcyBvYmplY3Q+KGN0b3I6IE5pbGxhYmxlPFR5cGU8VD4+LCB4OiB1bmtub3duKTogeCBpcyBUIHtcbiAgICByZXR1cm4gKCdmdW5jdGlvbicgPT09IHR5cGVvZiBjdG9yKSAmJiAoeCBpbnN0YW5jZW9mIGN0b3IpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgaW5zdGFuY2Ugb2YgaW5wdXQgY29uc3RydWN0b3IgKGV4Y2VwdCBzdWIgY2xhc3MpLlxuICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OBruOCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+WIpOWumiAo5rS+55Sf44Kv44Op44K544Gv5ZCr44KB44Gq44GEKVxuICpcbiAqIEBwYXJhbSBjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDoqZXkvqHjgZnjgovjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG93bkluc3RhbmNlT2Y8VCBleHRlbmRzIG9iamVjdD4oY3RvcjogTmlsbGFibGU8VHlwZTxUPj4sIHg6IHVua25vd24pOiB4IGlzIFQge1xuICAgIHJldHVybiAobnVsbCAhPSB4KSAmJiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGN0b3IpICYmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgPT09IE9iamVjdChjdG9yLnByb3RvdHlwZSkpO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIHZhbHVlJ3MgY2xhc3MgbmFtZS5cbiAqIEBqYSDjgq/jg6njgrnlkI3jgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGFzc05hbWUoeDogYW55KTogc3RyaW5nIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvZXhwbGljaXQtbW9kdWxlLWJvdW5kYXJ5LXR5cGVzXG4gICAgaWYgKHggIT0gbnVsbCkge1xuICAgICAgICBjb25zdCB0b1N0cmluZ1RhZ05hbWUgPSB4W1N5bWJvbC50b1N0cmluZ1RhZ107XG4gICAgICAgIGlmIChpc1N0cmluZyh0b1N0cmluZ1RhZ05hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9TdHJpbmdUYWdOYW1lO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb24oeCkgJiYgeC5wcm90b3R5cGUgJiYgbnVsbCAhPSB4Lm5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB4Lm5hbWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBjdG9yID0geC5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGN0b3IpICYmIGN0b3IgPT09IChPYmplY3QoY3Rvci5wcm90b3R5cGUpIGFzIG9iamVjdCkuY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY3Rvci5uYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpIGFzIHN0cmluZykuc2xpY2UoOCwgLTEpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBpbnB1dCB2YWx1ZXMgYXJlIHNhbWUgdmFsdWUtdHlwZS5cbiAqIEBqYSDlhaXlipvjgYzlkIzkuIDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gbGhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqIEBwYXJhbSByaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FtZVR5cGUobGhzOiB1bmtub3duLCByaHM6IHVua25vd24pOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHlwZW9mIGxocyA9PT0gdHlwZW9mIHJocztcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgaW5wdXQgdmFsdWVzIGFyZSBzYW1lIGNsYXNzLlxuICogQGphIOWFpeWKm+OBjOWQjOS4gOOCr+ODqeOCueOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBsaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICogQHBhcmFtIHJoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1lQ2xhc3MobGhzOiB1bmtub3duLCByaHM6IHVua25vd24pOiBib29sZWFuIHtcbiAgICBpZiAobnVsbCA9PSBsaHMgJiYgbnVsbCA9PSByaHMpIHtcbiAgICAgICAgcmV0dXJuIGNsYXNzTmFtZShsaHMpID09PSBjbGFzc05hbWUocmhzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKG51bGwgIT0gbGhzKSAmJiAobnVsbCAhPSByaHMpICYmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YobGhzKSA9PT0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHJocykpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29tbW9uIFN5bWJsZSBmb3IgZnJhbWV3b3JrLlxuICogQGphIOODleODrOODvOODoOODr+ODvOOCr+OBjOWFsemAmuOBp+S9v+eUqOOBmeOCiyBTeW1ibGVcbiAqL1xuZXhwb3J0IGNvbnN0ICRjZHAgPSBTeW1ib2woJ0BjZHAnKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L2Jhbi10eXBlcyxcbiAqL1xuXG5pbXBvcnQge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBUeXBlS2V5cyxcbiAgICBpc0FycmF5LFxuICAgIGV4aXN0cyxcbiAgICBjbGFzc05hbWUsXG59IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIEBlbiBUeXBlIHZlcmlmaWVyIGludGVyZmFjZSBkZWZpbml0aW9uLiA8YnI+XG4gKiAgICAgSWYgaW52YWxpZCB2YWx1ZSByZWNlaXZlZCwgdGhlIG1ldGhvZCB0aHJvd3MgYFR5cGVFcnJvcmAuXG4gKiBAamEg5Z6L5qSc6Ki844Gu44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pIDxicj5cbiAqICAgICDpgZXlj43jgZfjgZ/loLTlkIjjga8gYFR5cGVFcnJvcmAg44KS55m655SfXG4gKlxuICpcbiAqL1xuaW50ZXJmYWNlIFZlcmlmaWVyIHtcbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaXMgbm90IFtbTmlsXV0uXG4gICAgICogQGphIFtbTmlsXV0g44Gn44Gq44GE44GT44Go44KS5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm90TmlsLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIG5vdE5pbC5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgbm90TmlsOiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpcyBbW1R5cGVLZXlzXV0uXG4gICAgICogQGphIOaMh+WumuOBl+OBnyBbW1R5cGVLZXlzXV0g44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZU9mLnR5cGVcbiAgICAgKiAgLSBgZW5gIG9uZSBvZiBbW1R5cGVLZXlzXV1cbiAgICAgKiAgLSBgamFgIFtbVHlwZUtleXNdXSDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdHlwZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIHR5cGVPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgdHlwZU9mOiAodHlwZTogVHlwZUtleXMsIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaXMgYEFycmF5YC5cbiAgICAgKiBAamEgYEFycmF5YCDjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBhcnJheS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgYXJyYXk6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGlzIGBJdGVyYWJsZWAuXG4gICAgICogQGphIGBJdGVyYWJsZWAg44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlcmFibGUueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaXRlcmFibGUubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGl0ZXJhYmxlOiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpbnN0YW5jZSBpcyBlcXVhbCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3IuXG4gICAgICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OBruOCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGluc3RhbmNlT2YuY3RvclxuICAgICAqICAtIGBlbmAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDmr5TovIPlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gaW5zdGFuY2VPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBpbnN0YW5jZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBpbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaW5zdGFuY2UgaGFzIGBzdHJpY3RseWAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7ljrPlr4bkuIDoh7TjgZfjgZ/jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvd25JbnN0YW5jZU9mLmN0b3JcbiAgICAgKiAgLSBgZW5gIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5q+U6LyD5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIG93bkluc3RhbmNlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gb3duSW5zdGFuY2VPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgb3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGluc3RhbmNlIGhhcyBub3QgYHN0cmljdGx5YCBlcXVhbCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3IuXG4gICAgICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OCkuaMgeOBpOOCpOODs+OCueOCv+ODs+OCueOBp+OBquOBhOOBk+OBqOOCkuaknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIG5vdE93bkluc3RhbmNlT2YuY3RvclxuICAgICAqICAtIGBlbmAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDmr5TovIPlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gbm90T3duSW5zdGFuY2VPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBub3RPd25JbnN0YW5jZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBub3RPd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaGFzIHNwZWNpZmllZCBwcm9wZXJ0eS5cbiAgICAgKiBAamEg5oyH5a6a44OX44Ot44OR44OG44Kj44KS5oyB44Gj44Gm44GE44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkucHJvcFxuICAgICAqICAtIGBlbmAgc3BlY2lmaWVkIHByb3BlcnR5XG4gICAgICogIC0gYGphYCDlr77osaHjga7jg5fjg63jg5Hjg4bjgqNcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGhhc1Byb3BlcnR5OiAoeDogdW5rbm93biwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaGFzIG93biBzcGVjaWZpZWQgcHJvcGVydHkuXG4gICAgICogQGphIOaMh+WumuODl+ODreODkeODhuOCo+OCkuWFpeWKm+WApOiHqui6q+aMgeOBo+OBpuOBhOOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGhhc093blByb3BlcnR5LnByb3BcbiAgICAgKiAgLSBgZW5gIHNwZWNpZmllZCBwcm9wZXJ0eVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44OX44Ot44OR44OG44KjXG4gICAgICogQHBhcmFtIGhhc093blByb3BlcnR5LnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGhhc093blByb3BlcnR5Lm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBoYXNPd25Qcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xufVxuXG4vKipcbiAqIEBlbiBMaXN0IG9mIG1ldGhvZCBmb3IgdHlwZSB2ZXJpZnkuXG4gKiBAamEg5Z6L5qSc6Ki844GM5o+Q5L6b44GZ44KL44Oh44K944OD44OJ5LiA6KanXG4gKi9cbmV4cG9ydCB0eXBlIFZlcmlmeU1ldGhvZCA9IGtleW9mIFZlcmlmaWVyO1xuXG4vKipcbiAqIEBlbiBDb25jcmV0ZSB0eXBlIHZlcmlmaWVyIG9iamVjdC5cbiAqIEBqYSDlnovmpJzoqLzlrp/oo4Xjgqrjg5bjgrjjgqfjgq/jg4hcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuY29uc3QgX3ZlcmlmaWVyOiBWZXJpZmllciA9IHtcbiAgICBub3ROaWw6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHgpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGEgdmFsaWQgdmFsdWUuYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHR5cGVPZjogKHR5cGU6IFR5cGVLZXlzLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgeCAhPT0gdHlwZSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFR5cGUgb2YgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCAke3R5cGV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBhcnJheTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKCFpc0FycmF5KHgpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhbiBBcnJheS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaXRlcmFibGU6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICghKFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoeCkpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhbiBpdGVyYWJsZSBvYmplY3QuYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAoISh4IGluc3RhbmNlb2YgY3RvcikpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGFuIGluc3RhbmNlIG9mICR7Y3Rvci5uYW1lfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgb3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHggfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpICE9PSBPYmplY3QoY3Rvci5wcm90b3R5cGUpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBpcyBub3Qgb3duIGluc3RhbmNlIG9mICR7Y3Rvci5uYW1lfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgbm90T3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsICE9IHggJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpID09PSBPYmplY3QoY3Rvci5wcm90b3R5cGUpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBpcyBvd24gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBoYXNQcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHggfHwgIShwcm9wIGluICh4IGFzIG9iamVjdCkpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBkb2VzIG5vdCBoYXZlIHByb3BlcnR5ICR7U3RyaW5nKHByb3ApfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaGFzT3duUHJvcGVydHk6ICh4OiB1bmtub3duLCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCA9PSB4IHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoeCwgcHJvcCkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGRvZXMgbm90IGhhdmUgb3duIHByb3BlcnR5ICR7U3RyaW5nKHByb3ApfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBAZW4gVmVyaWZ5IG1ldGhvZC5cbiAqIEBqYSDmpJzoqLzjg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gbWV0aG9kXG4gKiAgLSBgZW5gIG1ldGhvZCBuYW1lIHdoaWNoIHVzaW5nXG4gKiAgLSBgamFgIOS9v+eUqOOBmeOCi+ODoeOCveODg+ODieWQjVxuICogQHBhcmFtIGFyZ3NcbiAqICAtIGBlbmAgYXJndW1lbnRzIHdoaWNoIGNvcnJlc3BvbmRzIHRvIHRoZSBtZXRob2QgbmFtZVxuICogIC0gYGphYCDjg6Hjgr3jg4Pjg4nlkI3jgavlr77lv5zjgZnjgovlvJXmlbBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZlcmlmeTxUTWV0aG9kIGV4dGVuZHMgVmVyaWZ5TWV0aG9kPihtZXRob2Q6IFRNZXRob2QsIC4uLmFyZ3M6IFBhcmFtZXRlcnM8VmVyaWZpZXJbVE1ldGhvZF0+KTogdm9pZCB8IG5ldmVyIHtcbiAgICAoX3ZlcmlmaWVyW21ldGhvZF0gYXMgVW5rbm93bkZ1bmN0aW9uKSguLi5hcmdzKTtcbn1cblxuZXhwb3J0IHsgdmVyaWZ5IGFzIGRlZmF1bHQgfTtcbiIsImltcG9ydCB7XG4gICAgVHlwZWRBcnJheSxcbiAgICBUeXBlZEFycmF5Q29uc3RydWN0b3IsXG4gICAgaXNGdW5jdGlvbixcbiAgICBpc0FycmF5LFxuICAgIGlzT2JqZWN0LFxuICAgIGlzSXRlcmFibGUsXG4gICAgaXNUeXBlZEFycmF5LFxuICAgIHNhbWVDbGFzcyxcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBkZWVwRXF1YWwoKSAqL1xuZnVuY3Rpb24gYXJyYXlFcXVhbChsaHM6IHVua25vd25bXSwgcmhzOiB1bmtub3duW10pOiBib29sZWFuIHtcbiAgICBjb25zdCBsZW4gPSBsaHMubGVuZ3RoO1xuICAgIGlmIChsZW4gIT09IHJocy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICghZGVlcEVxdWFsKGxoc1tpXSwgcmhzW2ldKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgZGVlcEVxdWFsKCkgKi9cbmZ1bmN0aW9uIGJ1ZmZlckVxdWFsKGxoczogU2hhcmVkQXJyYXlCdWZmZXIgfCBBcnJheUJ1ZmZlciwgcmhzOiBTaGFyZWRBcnJheUJ1ZmZlciB8IEFycmF5QnVmZmVyKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc2l6ZSA9IGxocy5ieXRlTGVuZ3RoO1xuICAgIGlmIChzaXplICE9PSByaHMuYnl0ZUxlbmd0aCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGxldCBwb3MgPSAwO1xuICAgIGlmIChzaXplIC0gcG9zID49IDgpIHtcbiAgICAgICAgY29uc3QgbGVuID0gc2l6ZSA+Pj4gMztcbiAgICAgICAgY29uc3QgZjY0TCA9IG5ldyBGbG9hdDY0QXJyYXkobGhzLCAwLCBsZW4pO1xuICAgICAgICBjb25zdCBmNjRSID0gbmV3IEZsb2F0NjRBcnJheShyaHMsIDAsIGxlbik7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGlmICghT2JqZWN0LmlzKGY2NExbaV0sIGY2NFJbaV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHBvcyA9IGxlbiA8PCAzO1xuICAgIH1cbiAgICBpZiAocG9zID09PSBzaXplKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBjb25zdCBMID0gbmV3IERhdGFWaWV3KGxocyk7XG4gICAgY29uc3QgUiA9IG5ldyBEYXRhVmlldyhyaHMpO1xuICAgIGlmIChzaXplIC0gcG9zID49IDQpIHtcbiAgICAgICAgaWYgKCFPYmplY3QuaXMoTC5nZXRVaW50MzIocG9zKSwgUi5nZXRVaW50MzIocG9zKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwb3MgKz0gNDtcbiAgICB9XG4gICAgaWYgKHNpemUgLSBwb3MgPj0gMikge1xuICAgICAgICBpZiAoIU9iamVjdC5pcyhMLmdldFVpbnQxNihwb3MpLCBSLmdldFVpbnQxNihwb3MpKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHBvcyArPSAyO1xuICAgIH1cbiAgICBpZiAoc2l6ZSA+IHBvcykge1xuICAgICAgICBpZiAoIU9iamVjdC5pcyhMLmdldFVpbnQ4KHBvcyksIFIuZ2V0VWludDgocG9zKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwb3MgKz0gMTtcbiAgICB9XG4gICAgcmV0dXJuIHBvcyA9PT0gc2l6ZTtcbn1cblxuLyoqXG4gKiBAZW4gUGVyZm9ybXMgYSBkZWVwIGNvbXBhcmlzb24gYmV0d2VlbiB0d28gdmFsdWVzIHRvIGRldGVybWluZSBpZiB0aGV5IGFyZSBlcXVpdmFsZW50LlxuICogQGphIDLlgKTjga7oqbPntLDmr5TovIPjgpLjgZcsIOetieOBl+OBhOOBi+OBqeOBhuOBi+WIpOWumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVlcEVxdWFsKGxoczogdW5rbm93biwgcmhzOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgaWYgKGxocyA9PT0gcmhzKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXNGdW5jdGlvbihsaHMpICYmIGlzRnVuY3Rpb24ocmhzKSkge1xuICAgICAgICByZXR1cm4gbGhzLmxlbmd0aCA9PT0gcmhzLmxlbmd0aCAmJiBsaHMubmFtZSA9PT0gcmhzLm5hbWU7XG4gICAgfVxuICAgIGlmICghaXNPYmplY3QobGhzKSB8fCAhaXNPYmplY3QocmhzKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHsgLy8gUHJpbWl0aXZlIFdyYXBwZXIgT2JqZWN0cyAvIERhdGVcbiAgICAgICAgY29uc3QgdmFsdWVMID0gbGhzLnZhbHVlT2YoKTtcbiAgICAgICAgY29uc3QgdmFsdWVSID0gcmhzLnZhbHVlT2YoKTtcbiAgICAgICAgaWYgKGxocyAhPT0gdmFsdWVMIHx8IHJocyAhPT0gdmFsdWVSKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVMID09PSB2YWx1ZVI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBSZWdFeHBcbiAgICAgICAgY29uc3QgaXNSZWdFeHBMID0gbGhzIGluc3RhbmNlb2YgUmVnRXhwO1xuICAgICAgICBjb25zdCBpc1JlZ0V4cFIgPSByaHMgaW5zdGFuY2VvZiBSZWdFeHA7XG4gICAgICAgIGlmIChpc1JlZ0V4cEwgfHwgaXNSZWdFeHBSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNSZWdFeHBMID09PSBpc1JlZ0V4cFIgJiYgU3RyaW5nKGxocykgPT09IFN0cmluZyhyaHMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gQXJyYXlcbiAgICAgICAgY29uc3QgaXNBcnJheUwgPSBpc0FycmF5KGxocyk7XG4gICAgICAgIGNvbnN0IGlzQXJyYXlSID0gaXNBcnJheShyaHMpO1xuICAgICAgICBpZiAoaXNBcnJheUwgfHwgaXNBcnJheVIpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0FycmF5TCA9PT0gaXNBcnJheVIgJiYgYXJyYXlFcXVhbChsaHMgYXMgdW5rbm93bltdLCByaHMgYXMgdW5rbm93bltdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIEFycmF5QnVmZmVyXG4gICAgICAgIGNvbnN0IGlzQnVmZmVyTCA9IGxocyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyO1xuICAgICAgICBjb25zdCBpc0J1ZmZlclIgPSByaHMgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcjtcbiAgICAgICAgaWYgKGlzQnVmZmVyTCB8fCBpc0J1ZmZlclIpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0J1ZmZlckwgPT09IGlzQnVmZmVyUiAmJiBidWZmZXJFcXVhbChsaHMgYXMgQXJyYXlCdWZmZXIsIHJocyBhcyBBcnJheUJ1ZmZlcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBBcnJheUJ1ZmZlclZpZXdcbiAgICAgICAgY29uc3QgaXNCdWZmZXJWaWV3TCA9IEFycmF5QnVmZmVyLmlzVmlldyhsaHMpO1xuICAgICAgICBjb25zdCBpc0J1ZmZlclZpZXdSID0gQXJyYXlCdWZmZXIuaXNWaWV3KHJocyk7XG4gICAgICAgIGlmIChpc0J1ZmZlclZpZXdMIHx8IGlzQnVmZmVyVmlld1IpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0J1ZmZlclZpZXdMID09PSBpc0J1ZmZlclZpZXdSICYmIHNhbWVDbGFzcyhsaHMsIHJocylcbiAgICAgICAgICAgICAgICAmJiBidWZmZXJFcXVhbCgobGhzIGFzIEFycmF5QnVmZmVyVmlldykuYnVmZmVyLCAocmhzIGFzIEFycmF5QnVmZmVyVmlldykuYnVmZmVyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIG90aGVyIEl0ZXJhYmxlXG4gICAgICAgIGNvbnN0IGlzSXRlcmFibGVMID0gaXNJdGVyYWJsZShsaHMpO1xuICAgICAgICBjb25zdCBpc0l0ZXJhYmxlUiA9IGlzSXRlcmFibGUocmhzKTtcbiAgICAgICAgaWYgKGlzSXRlcmFibGVMIHx8IGlzSXRlcmFibGVSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNJdGVyYWJsZUwgPT09IGlzSXRlcmFibGVSICYmIGFycmF5RXF1YWwoWy4uLihsaHMgYXMgdW5rbm93bltdKV0sIFsuLi4ocmhzIGFzIHVua25vd25bXSldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoc2FtZUNsYXNzKGxocywgcmhzKSkge1xuICAgICAgICBjb25zdCBrZXlzTCA9IG5ldyBTZXQoT2JqZWN0LmtleXMobGhzKSk7XG4gICAgICAgIGNvbnN0IGtleXNSID0gbmV3IFNldChPYmplY3Qua2V5cyhyaHMpKTtcbiAgICAgICAgaWYgKGtleXNMLnNpemUgIT09IGtleXNSLnNpemUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzTCkge1xuICAgICAgICAgICAgaWYgKCFrZXlzUi5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzTCkge1xuICAgICAgICAgICAgaWYgKCFkZWVwRXF1YWwobGhzW2tleV0sIHJoc1trZXldKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIGxocykge1xuICAgICAgICAgICAgaWYgKCEoa2V5IGluIHJocykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qga2V5cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiByaHMpIHtcbiAgICAgICAgICAgIGlmICghKGtleSBpbiBsaHMpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAga2V5cy5hZGQoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzKSB7XG4gICAgICAgICAgICBpZiAoIWRlZXBFcXVhbChsaHNba2V5XSwgcmhzW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBSZWdFeHAgKi9cbmZ1bmN0aW9uIGNsb25lUmVnRXhwKHJlZ2V4cDogUmVnRXhwKTogUmVnRXhwIHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgUmVnRXhwKHJlZ2V4cC5zb3VyY2UsIHJlZ2V4cC5mbGFncyk7XG4gICAgcmVzdWx0Lmxhc3RJbmRleCA9IHJlZ2V4cC5sYXN0SW5kZXg7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBBcnJheUJ1ZmZlciAqL1xuZnVuY3Rpb24gY2xvbmVBcnJheUJ1ZmZlcihhcnJheUJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBBcnJheUJ1ZmZlciB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IEFycmF5QnVmZmVyKGFycmF5QnVmZmVyLmJ5dGVMZW5ndGgpO1xuICAgIG5ldyBVaW50OEFycmF5KHJlc3VsdCkuc2V0KG5ldyBVaW50OEFycmF5KGFycmF5QnVmZmVyKSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBEYXRhVmlldyAqL1xuZnVuY3Rpb24gY2xvbmVEYXRhVmlldyhkYXRhVmlldzogRGF0YVZpZXcpOiBEYXRhVmlldyB7XG4gICAgY29uc3QgYnVmZmVyID0gY2xvbmVBcnJheUJ1ZmZlcihkYXRhVmlldy5idWZmZXIpO1xuICAgIHJldHVybiBuZXcgRGF0YVZpZXcoYnVmZmVyLCBkYXRhVmlldy5ieXRlT2Zmc2V0LCBkYXRhVmlldy5ieXRlTGVuZ3RoKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBUeXBlZEFycmF5ICovXG5mdW5jdGlvbiBjbG9uZVR5cGVkQXJyYXk8VCBleHRlbmRzIFR5cGVkQXJyYXk+KHR5cGVkQXJyYXk6IFQpOiBUIHtcbiAgICBjb25zdCBidWZmZXIgPSBjbG9uZUFycmF5QnVmZmVyKHR5cGVkQXJyYXkuYnVmZmVyKTtcbiAgICByZXR1cm4gbmV3ICh0eXBlZEFycmF5LmNvbnN0cnVjdG9yIGFzIFR5cGVkQXJyYXlDb25zdHJ1Y3RvcikoYnVmZmVyLCB0eXBlZEFycmF5LmJ5dGVPZmZzZXQsIHR5cGVkQXJyYXkubGVuZ3RoKSBhcyBUO1xufVxuXG4vKiogQGludGVybmFsIGNoZWNrIG5lY2Vzc2FyeSB0byB1cGRhdGUgKi9cbmZ1bmN0aW9uIG5lZWRVcGRhdGUob2xkVmFsdWU6IHVua25vd24sIG5ld1ZhbHVlOiB1bmtub3duLCBleGNlcHRVbmRlZmluZWQ6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBpZiAob2xkVmFsdWUgIT09IG5ld1ZhbHVlKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAoZXhjZXB0VW5kZWZpbmVkICYmIHVuZGVmaW5lZCA9PT0gb2xkVmFsdWUpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBtZXJnZSBBcnJheSAqL1xuZnVuY3Rpb24gbWVyZ2VBcnJheSh0YXJnZXQ6IHVua25vd25bXSwgc291cmNlOiB1bmtub3duW10pOiB1bmtub3duW10ge1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBzb3VyY2UubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXRbaV07XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWVyZ2Uob2xkVmFsdWUsIHNvdXJjZVtpXSk7XG4gICAgICAgICFuZWVkVXBkYXRlKG9sZFZhbHVlLCBuZXdWYWx1ZSwgZmFsc2UpIHx8ICh0YXJnZXRbaV0gPSBuZXdWYWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgbWVyZ2UgU2V0ICovXG5mdW5jdGlvbiBtZXJnZVNldCh0YXJnZXQ6IFNldDx1bmtub3duPiwgc291cmNlOiBTZXQ8dW5rbm93bj4pOiBTZXQ8dW5rbm93bj4ge1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiBzb3VyY2UpIHtcbiAgICAgICAgdGFyZ2V0LmhhcyhpdGVtKSB8fCB0YXJnZXQuYWRkKG1lcmdlKHVuZGVmaW5lZCwgaXRlbSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG4vKiogQGludGVybmFsIG1lcmdlIE1hcCAqL1xuZnVuY3Rpb24gbWVyZ2VNYXAodGFyZ2V0OiBNYXA8dW5rbm93biwgdW5rbm93bj4sIHNvdXJjZTogTWFwPHVua25vd24sIHVua25vd24+KTogTWFwPHVua25vd24sIHVua25vd24+IHtcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBzb3VyY2UpIHtcbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXQuZ2V0KGspO1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1lcmdlKG9sZFZhbHVlLCB2KTtcbiAgICAgICAgIW5lZWRVcGRhdGUob2xkVmFsdWUsIG5ld1ZhbHVlLCBmYWxzZSkgfHwgdGFyZ2V0LnNldChrLCBuZXdWYWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBkZWVwTWVyZ2UoKSAqL1xuZnVuY3Rpb24gbWVyZ2UodGFyZ2V0OiB1bmtub3duLCBzb3VyY2U6IHVua25vd24pOiB1bmtub3duIHtcbiAgICBpZiAodW5kZWZpbmVkID09PSBzb3VyY2UgfHwgdGFyZ2V0ID09PSBzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG4gICAgaWYgKCFpc09iamVjdChzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgfVxuICAgIC8vIFByaW1pdGl2ZSBXcmFwcGVyIE9iamVjdHMgLyBEYXRlXG4gICAgaWYgKHNvdXJjZS52YWx1ZU9mKCkgIT09IHNvdXJjZSkge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IG5ldyAoc291cmNlLmNvbnN0cnVjdG9yIGFzIE9iamVjdENvbnN0cnVjdG9yKShzb3VyY2UudmFsdWVPZigpKTtcbiAgICB9XG4gICAgLy8gUmVnRXhwXG4gICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IGNsb25lUmVnRXhwKHNvdXJjZSk7XG4gICAgfVxuICAgIC8vIEFycmF5QnVmZmVyXG4gICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBkZWVwRXF1YWwodGFyZ2V0LCBzb3VyY2UpID8gdGFyZ2V0IDogY2xvbmVBcnJheUJ1ZmZlcihzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBBcnJheUJ1ZmZlclZpZXdcbiAgICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KHNvdXJjZSkpIHtcbiAgICAgICAgcmV0dXJuIGRlZXBFcXVhbCh0YXJnZXQsIHNvdXJjZSkgPyB0YXJnZXQgOiBpc1R5cGVkQXJyYXkoc291cmNlKSA/IGNsb25lVHlwZWRBcnJheShzb3VyY2UpIDogY2xvbmVEYXRhVmlldyhzb3VyY2UgYXMgRGF0YVZpZXcpO1xuICAgIH1cbiAgICAvLyBBcnJheVxuICAgIGlmIChBcnJheS5pc0FycmF5KHNvdXJjZSkpIHtcbiAgICAgICAgcmV0dXJuIG1lcmdlQXJyYXkoaXNBcnJheSh0YXJnZXQpID8gdGFyZ2V0IDogW10sIHNvdXJjZSk7XG4gICAgfVxuICAgIC8vIFNldFxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBTZXQpIHtcbiAgICAgICAgcmV0dXJuIG1lcmdlU2V0KHRhcmdldCBpbnN0YW5jZW9mIFNldCA/IHRhcmdldCA6IG5ldyBTZXQoKSwgc291cmNlKTtcbiAgICB9XG4gICAgLy8gTWFwXG4gICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgICByZXR1cm4gbWVyZ2VNYXAodGFyZ2V0IGluc3RhbmNlb2YgTWFwID8gdGFyZ2V0IDogbmV3IE1hcCgpLCBzb3VyY2UpO1xuICAgIH1cblxuICAgIGNvbnN0IG9iaiA9IGlzT2JqZWN0KHRhcmdldCkgPyB0YXJnZXQgOiB7fTtcbiAgICBpZiAoc2FtZUNsYXNzKHRhcmdldCwgc291cmNlKSkge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzb3VyY2UpKSB7XG4gICAgICAgICAgICBpZiAoJ19fcHJvdG9fXycgIT09IGtleSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZhbHVlID0gb2JqW2tleV07XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBtZXJnZShvbGRWYWx1ZSwgc291cmNlW2tleV0pO1xuICAgICAgICAgICAgICAgICFuZWVkVXBkYXRlKG9sZFZhbHVlLCBuZXdWYWx1ZSwgdHJ1ZSkgfHwgKG9ialtrZXldID0gbmV3VmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoJ19fcHJvdG9fXycgIT09IGtleSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZhbHVlID0gb2JqW2tleV07XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBtZXJnZShvbGRWYWx1ZSwgc291cmNlW2tleV0pO1xuICAgICAgICAgICAgICAgICFuZWVkVXBkYXRlKG9sZFZhbHVlLCBuZXdWYWx1ZSwgdHJ1ZSkgfHwgKG9ialtrZXldID0gbmV3VmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogQGVuIFJlY3Vyc2l2ZWx5IG1lcmdlcyBvd24gYW5kIGluaGVyaXRlZCBlbnVtZXJhYmxlIHN0cmluZyBrZXllZCBwcm9wZXJ0aWVzIG9mIHNvdXJjZSBvYmplY3RzIGludG8gdGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7lho3luLDnmoTjg57jg7zjgrjjgpLlrp/ooYxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBNZXJnZTxULCBTMSwgUzIsIFMzLCBTNCwgUzUsIFM2LCBTNywgUzgsIFM5PihcbiAgICB0YXJnZXQ6IFQsXG4gICAgLi4uc291cmNlczogW1MxLCBTMj8sIFMzPywgUzQ/LCBTNT8sIFM2PywgUzc/LCBTOD8sIFM5PywgLi4udW5rbm93bltdXVxuKTogVCAmIFMxICYgUzIgJiBTMyAmIFM0ICYgUzUgJiBTNiAmIFM3ICYgUzggJiBTOTtcbmV4cG9ydCBmdW5jdGlvbiBkZWVwTWVyZ2U8WD4odGFyZ2V0OiB1bmtub3duLCAuLi5zb3VyY2VzOiB1bmtub3duW10pOiBYO1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBNZXJnZSh0YXJnZXQ6IHVua25vd24sIC4uLnNvdXJjZXM6IHVua25vd25bXSk6IHVua25vd24ge1xuICAgIGxldCByZXN1bHQgPSB0YXJnZXQ7XG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2Ygc291cmNlcykge1xuICAgICAgICByZXN1bHQgPSBtZXJnZShyZXN1bHQsIHNvdXJjZSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgZGVlcCBjb3B5IGluc3RhbmNlIG9mIHNvdXJjZSBvYmplY3QuXG4gKiBAamEg44OH44Kj44O844OX44Kz44OU44O844Kq44OW44K444Kn44Kv44OI44Gu55Sf5oiQXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWVwQ29weTxUPihzcmM6IFQpOiBUIHtcbiAgICByZXR1cm4gZGVlcE1lcmdlKHVuZGVmaW5lZCwgc3JjKTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBOaWwsXG4gICAgVHlwZSxcbiAgICBDbGFzcyxcbiAgICBDb25zdHJ1Y3Rvcixcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogQGVuIE1peGluIGNsYXNzJ3MgYmFzZSBpbnRlcmZhY2UuXG4gKiBAamEgTWl4aW4g44Kv44Op44K544Gu5Z+65bqV44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pXG4gKi9cbmV4cG9ydCBkZWNsYXJlIGNsYXNzIE1peGluQ2xhc3Mge1xuICAgIC8qKlxuICAgICAqIEBlbiBjYWxsIG1peGluIHNvdXJjZSBjbGFzcydzIGBzdXBlcigpYC4gPGJyPlxuICAgICAqICAgICBUaGlzIG1ldGhvZCBzaG91bGQgYmUgY2FsbGVkIGZyb20gY29uc3RydWN0b3IuXG4gICAgICogQGphIE1peGluIOOCr+ODqeOCueOBruWfuuW6leOCpOODs+OCv+ODvOODleOCp+OCpOOCueWumue+qSA8YnI+XG4gICAgICogICAgIOOCs+ODs+OCueODiOODqeOCr+OCv+OBi+OCieWRvOOBtuOBk+OBqOOCkuaDs+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHNyY0NsYXNzXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gdGFyZ2V0IGNsYXNzIG5hbWUuIGV4KSBmcm9tIFMxIGF2YWlsYWJsZVxuICAgICAqICAtIGBqYWAg44Kz44Oz44K544OI44Op44Kv44OI44GZ44KL44Kv44Op44K55ZCN44KS5oyH5a6aIGV4KSBTMSDjgYvjgonmjIflrprlj6/og71cbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIHBhcmFtZXRlcnNcbiAgICAgKiAgLSBgamFgIOOCs+ODs+OCueODiOODqeOCr+ODiOOBq+S9v+eUqOOBmeOCi+W8leaVsFxuICAgICAqL1xuICAgIHByb3RlY3RlZCBzdXBlcjxUIGV4dGVuZHMgQ2xhc3M+KHNyY0NsYXNzOiBULCAuLi5hcmdzOiBDb25zdHJ1Y3RvclBhcmFtZXRlcnM8VD4pOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBpbnB1dCBjbGFzcyBpcyBtaXhpbmVkIChleGNsdWRpbmcgb3duIGNsYXNzKS5cbiAgICAgKiBAamEg5oyH5a6a44Kv44Op44K544GMIE1peGluIOOBleOCjOOBpuOBhOOCi+OBi+eiuuiqjSAo6Ieq6Lqr44Gu44Kv44Op44K544Gv5ZCr44G+44KM44Gq44GEKVxuICAgICAqXG4gICAgICogQHBhcmFtIG1peGVkQ2xhc3NcbiAgICAgKiAgLSBgZW5gIHNldCB0YXJnZXQgY2xhc3MgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOWvvuixoeOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBpc01peGVkV2l0aDxUIGV4dGVuZHMgb2JqZWN0PihtaXhlZENsYXNzOiBDb25zdHJ1Y3RvcjxUPik6IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGVuIE1peGVkIHN1YiBjbGFzcyBjb25zdHJ1Y3RvciBkZWZpbml0aW9ucy5cbiAqIEBqYSDlkIjmiJDjgZfjgZ/jgrXjg5bjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/lrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNaXhpbkNvbnN0cnVjdG9yPEIgZXh0ZW5kcyBDbGFzcywgVSBleHRlbmRzIG9iamVjdD4gZXh0ZW5kcyBUeXBlPFU+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gY29uc3RydWN0b3JcbiAgICAgKiBAamEg44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgYmFzZSBjbGFzcyBhcmd1bWVudHNcbiAgICAgKiAgLSBgamFgIOWfuuW6leOCr+ODqeOCueOBq+aMh+WumuOBl+OBn+W8leaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB1bmlvbiB0eXBlIG9mIGNsYXNzZXMgd2hlbiBjYWxsaW5nIFtbbWl4aW5zXV0oKVxuICAgICAqICAtIGBqYWAgW1ttaXhpbnNdXSgpIOOBq+a4oeOBl+OBn+OCr+ODqeOCueOBrumbhuWQiFxuICAgICAqL1xuICAgIG5ldyguLi5hcmdzOiBDb25zdHJ1Y3RvclBhcmFtZXRlcnM8Qj4pOiBVO1xufVxuXG4vKipcbiAqIEBlbiBEZWZpbml0aW9uIG9mIFtbc2V0TWl4Q2xhc3NBdHRyaWJ1dGVdXSBmdW5jdGlvbidzIGFyZ3VtZW50cy5cbiAqIEBqYSBbW3NldE1peENsYXNzQXR0cmlidXRlXV0g44Gu5Y+W44KK44GG44KL5byV5pWw5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWl4Q2xhc3NBdHRyaWJ1dGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBTdXBwcmVzcyBwcm92aWRpbmcgY29uc3RydWN0b3ItdHJhcCBmb3IgdGhlIG1peGluIHNvdXJjZSBjbGFzcy4gSW4gdGhpcyBjYXNlLCBgaXNNaXhlZFdpdGhgLCBgaW5zdGFuY2VvZmAgYWxzbyBiZWNvbWVzIGludmFsaWQuIChmb3IgaW1wcm92aW5nIHBlcmZvcm1hbmNlKVxuICAgICAqIEBqYSBNaXhpbiBTb3VyY2Ug44Kv44Op44K544Gr5a++44GX44GmLCDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jg4jjg6njg4Pjg5fjgpLmipHmraIuIOOBk+OCjOOCkuaMh+WumuOBl+OBn+WgtOWQiCwgYGlzTWl4ZWRXaXRoYCwgYGluc3RhbmNlb2ZgIOOCgueEoeWKueOBq+OBquOCiy4gKOODkeODleOCqeODvOODnuODs+OCueaUueWWhClcbiAgICAgKi9cbiAgICBwcm90b0V4dGVuZHNPbmx5OiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldHVwIFtTeW1ib2wuaGFzSW5zdGFuY2VdIHByb3BlcnR5LiA8YnI+XG4gICAgICogICAgIFRoZSBjbGFzcyBkZXNpZ25hdGVkIGFzIGEgc291cmNlIG9mIFtbbWl4aW5zXV0oKSBoYXMgW1N5bWJvbC5oYXNJbnN0YW5jZV0gcHJvcGVydHkgaW1wbGljaXRseS4gPGJyPlxuICAgICAqICAgICBJdCdzIHVzZWQgdG8gYXZvaWQgYmVjb21pbmcgdGhlIGJlaGF2aW9yIGBpbnN0YW5jZW9mYCBkb2Vzbid0IGludGVuZCB3aGVuIHRoZSBjbGFzcyBpcyBleHRlbmRlZCBmcm9tIHRoZSBtaXhpbmVkIGNsYXNzIHRoZSBvdGhlciBwbGFjZS5cbiAgICAgKiBAamEgW1N5bWJvbC5oYXNJbnN0YW5jZV0g44OX44Ot44OR44OG44Kj6Kit5a6aPGJyPlxuICAgICAqICAgICBbW21peGluc11dKCkg44Gu44K944O844K544Gr5oyH5a6a44GV44KM44Gf44Kv44Op44K544GvIFtTeW1ib2wuaGFzSW5zdGFuY2VdIOOCkuaal+m7meeahOOBq+WCmeOBiOOCi+OBn+OCgTxicj5cbiAgICAgKiAgICAg44Gd44Gu44Kv44Op44K544GM5LuW44Gn57aZ5om/44GV44KM44Gm44GE44KL5aC05ZCIIGBpbnN0YW5jZW9mYCDjgYzmhI/lm7PjgZfjgarjgYTmjK/jgovoiJ7jgYTjgajjgarjgovjga7jgpLpgb/jgZHjgovjgZ/jgoHjgavkvb/nlKjjgZnjgosuXG4gICAgICovXG4gICAgaW5zdGFuY2VPZjogKChpbnN0OiBvYmplY3QpID0+IGJvb2xlYW4pIHwgTmlsO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfb2JqUHJvdG90eXBlICAgICA9IE9iamVjdC5wcm90b3R5cGU7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9pbnN0YW5jZU9mICAgICAgID0gRnVuY3Rpb24ucHJvdG90eXBlW1N5bWJvbC5oYXNJbnN0YW5jZV07XG4vKiogQGludGVybmFsICovIGNvbnN0IF9vdmVycmlkZSAgICAgICAgID0gU3ltYm9sKCdvdmVycmlkZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfaXNJbmhlcml0ZWQgICAgICA9IFN5bWJvbCgnaXMtaW5oZXJpdGVkJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9jb25zdHJ1Y3RvcnMgICAgID0gU3ltYm9sKCdjb25zdHJ1Y3RvcnMnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NsYXNzQmFzZSAgICAgICAgPSBTeW1ib2woJ2NsYXNzLWJhc2UnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NsYXNzU291cmNlcyAgICAgPSBTeW1ib2woJ2NsYXNzLXNvdXJjZXMnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3RvRXh0ZW5kc09ubHkgPSBTeW1ib2woJ3Byb3RvLWV4dGVuZHMtb25seScpO1xuXG4vKiogQGludGVybmFsIGNvcHkgcHJvcGVydGllcyBjb3JlICovXG5mdW5jdGlvbiByZWZsZWN0UHJvcGVydGllcyh0YXJnZXQ6IG9iamVjdCwgc291cmNlOiBvYmplY3QsIGtleTogc3RyaW5nIHwgc3ltYm9sKTogdm9pZCB7XG4gICAgaWYgKG51bGwgPT0gdGFyZ2V0W2tleV0pIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNvdXJjZSwga2V5KSBhcyBQcm9wZXJ0eURlY29yYXRvcik7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIG9iamVjdCBwcm9wZXJ0aWVzIGNvcHkgbWV0aG9kICovXG5mdW5jdGlvbiBjb3B5UHJvcGVydGllcyh0YXJnZXQ6IG9iamVjdCwgc291cmNlOiBvYmplY3QpOiB2b2lkIHtcbiAgICBzb3VyY2UgJiYgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoc291cmNlKVxuICAgICAgICAuZmlsdGVyKGtleSA9PiAhLyhwcm90b3R5cGV8bmFtZXxjb25zdHJ1Y3RvcikvLnRlc3Qoa2V5KSlcbiAgICAgICAgLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIHJlZmxlY3RQcm9wZXJ0aWVzKHRhcmdldCwgc291cmNlLCBrZXkpO1xuICAgICAgICB9KTtcbiAgICBzb3VyY2UgJiYgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzb3VyY2UpXG4gICAgICAgIC5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICByZWZsZWN0UHJvcGVydGllcyh0YXJnZXQsIHNvdXJjZSwga2V5KTtcbiAgICAgICAgfSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzZXRNaXhDbGFzc0F0dHJpYnV0ZSh0YXJnZXQsICdpbnN0YW5jZU9mJykgKi9cbmZ1bmN0aW9uIHNldEluc3RhbmNlT2Y8VCBleHRlbmRzIG9iamVjdD4odGFyZ2V0OiBDb25zdHJ1Y3RvcjxUPiwgbWV0aG9kOiAoKGluc3Q6IG9iamVjdCkgPT4gYm9vbGVhbikgfCBOaWwpOiB2b2lkIHtcbiAgICBjb25zdCBiZWhhdmlvdXIgPSBtZXRob2QgfHwgKG51bGwgPT09IG1ldGhvZCA/IHVuZGVmaW5lZCA6ICgoaTogb2JqZWN0KSA9PiBPYmplY3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YuY2FsbCh0YXJnZXQucHJvdG90eXBlLCBpKSkpO1xuICAgIGNvbnN0IGFwcGxpZWQgPSBiZWhhdmlvdXIgJiYgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIF9vdmVycmlkZSk7XG4gICAgaWYgKCFhcHBsaWVkKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwge1xuICAgICAgICAgICAgW1N5bWJvbC5oYXNJbnN0YW5jZV06IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogYmVoYXZpb3VyLFxuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFtfb3ZlcnJpZGVdOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGJlaGF2aW91ciA/IHRydWUgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIFNldCB0aGUgTWl4aW4gY2xhc3MgYXR0cmlidXRlLlxuICogQGphIE1peGluIOOCr+ODqeOCueOBq+WvvuOBl+OBpuWxnuaAp+OCkuioreWumlxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogLy8gJ3Byb3RvRXh0ZW5kT25seSdcbiAqIGNsYXNzIEJhc2UgeyBjb25zdHJ1Y3RvcihhLCBiKSB7fSB9O1xuICogY2xhc3MgTWl4QSB7IH07XG4gKiBzZXRNaXhDbGFzc0F0dHJpYnV0ZShNaXhBLCAncHJvdG9FeHRlbmRzT25seScpOyAgLy8gZm9yIGltcHJvdmluZyBjb25zdHJ1Y3Rpb24gcGVyZm9ybWFuY2VcbiAqIGNsYXNzIE1peEIgeyBjb25zdHJ1Y3RvcihjLCBkKSB7fSB9O1xuICpcbiAqIGNsYXNzIE1peGluQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoQmFzZSwgTWl4QSwgTWl4Qikge1xuICogICAgIGNvbnN0cnVjdG9yKGEsIGIsIGMsIGQpe1xuICogICAgICAgICAvLyBjYWxsaW5nIGBCYXNlYCBjb25zdHJ1Y3RvclxuICogICAgICAgICBzdXBlcihhLCBiKTtcbiAqXG4gKiAgICAgICAgIC8vIGNhbGxpbmcgTWl4aW4gY2xhc3MncyBjb25zdHJ1Y3RvclxuICogICAgICAgICB0aGlzLnN1cGVyKE1peEEpOyAgICAgICAgLy8gbm8gYWZmZWN0XG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QiwgYywgZCk7XG4gKiAgICAgfVxuICogfVxuICpcbiAqIGNvbnN0IG1peGVkID0gbmV3IE1peGluQ2xhc3MoKTtcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgTWl4QSk7ICAgIC8vIGZhbHNlXG4gKiBjb25zb2xlLmxvZyhtaXhlZC5pc01peGVkV2l0aChNaXhBKSk7ICAvLyBmYWxzZVxuICpcbiAqIC8vICdpbnN0YW5jZU9mJ1xuICogY2xhc3MgQmFzZSB7fTtcbiAqIGNsYXNzIFNvdXJjZSB7fTtcbiAqIGNsYXNzIE1peGluQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoQmFzZSwgU291cmNlKSB7fTtcbiAqXG4gKiBjbGFzcyBPdGhlciBleHRlbmRzIFNvdXJjZSB7fTtcbiAqXG4gKiBjb25zdCBvdGhlciA9IG5ldyBPdGhlcigpO1xuICogY29uc3QgbWl4ZWQgPSBuZXcgTWl4aW5DbGFzcygpO1xuICogY29uc29sZS5sb2cob3RoZXIgaW5zdGFuY2VvZiBTb3VyY2UpOyAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cob3RoZXIgaW5zdGFuY2VvZiBPdGhlcik7ICAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBNaXhpbkNsYXNzKTsgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBCYXNlKTsgICAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBTb3VyY2UpOyAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBPdGhlcik7ICAgICAgICAgLy8gdHJ1ZSA/Pz9cbiAqXG4gKiBzZXRNaXhDbGFzc0F0dHJpYnV0ZShPdGhlciwgJ2luc3RhbmNlT2YnKTsgLy8gb3Igc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoT3RoZXIsICdpbnN0YW5jZU9mJywgbnVsbCk7XG4gKiBjb25zb2xlLmxvZyhvdGhlciBpbnN0YW5jZW9mIFNvdXJjZSk7ICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhvdGhlciBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyBmYWxzZSAhXG4gKlxuICogLy8gW0Jlc3QgUHJhY3RpY2VdIElmIHlvdSBkZWNsYXJlIHRoZSBkZXJpdmVkLWNsYXNzIGZyb20gbWl4aW4sIHlvdSBzaG91bGQgY2FsbCB0aGUgZnVuY3Rpb24gZm9yIGF2b2lkaW5nIGBpbnN0YW5jZW9mYCBsaW1pdGF0aW9uLlxuICogY2xhc3MgRGVyaXZlZENsYXNzIGV4dGVuZHMgTWl4aW5DbGFzcyB7fVxuICogc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRGVyaXZlZENsYXNzLCAnaW5zdGFuY2VPZicpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBzZXQgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gKiAgLSBgamFgIOioreWumuWvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHBhcmFtIGF0dHJcbiAqICAtIGBlbmA6XG4gKiAgICAtIGBwcm90b0V4dGVuZHNPbmx5YDogU3VwcHJlc3MgcHJvdmlkaW5nIGNvbnN0cnVjdG9yLXRyYXAgZm9yIHRoZSBtaXhpbiBzb3VyY2UgY2xhc3MuIChmb3IgaW1wcm92aW5nIHBlcmZvcm1hbmNlKVxuICogICAgLSBgaW5zdGFuY2VPZmAgICAgICA6IGZ1bmN0aW9uIGJ5IHVzaW5nIFtTeW1ib2wuaGFzSW5zdGFuY2VdIDxicj5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBEZWZhdWx0IGJlaGF2aW91ciBpcyBgeyByZXR1cm4gdGFyZ2V0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGluc3RhbmNlKSB9YFxuICogICAgICAgICAgICAgICAgICAgICAgICAgIElmIHNldCBgbnVsbGAsIGRlbGV0ZSBbU3ltYm9sLmhhc0luc3RhbmNlXSBwcm9wZXJ0eS5cbiAqICAtIGBqYWA6XG4gKiAgICAtIGBwcm90b0V4dGVuZHNPbmx5YDogTWl4aW4gU291cmNlIOOCr+ODqeOCueOBq+WvvuOBl+OBpiwg44Kz44Oz44K544OI44Op44Kv44K/44OI44Op44OD44OX44KS5oqR5q2iICjjg5Hjg5Xjgqnjg7zjg57jg7PjgrnmlLnlloQpXG4gKiAgICAtIGBpbnN0YW5jZU9mYCAgICAgIDogW1N5bWJvbC5oYXNJbnN0YW5jZV0g44GM5L2/55So44GZ44KL6Zai5pWw44KS5oyH5a6aIDxicj5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICDml6Llrprjgafjga8gYHsgcmV0dXJuIHRhcmdldC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnN0YW5jZSkgfWAg44GM5L2/55So44GV44KM44KLXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICBgbnVsbGAg5oyH5a6a44KS44GZ44KL44GoIFtTeW1ib2wuaGFzSW5zdGFuY2VdIOODl+ODreODkeODhuOCo+OCkuWJiumZpOOBmeOCi1xuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0TWl4Q2xhc3NBdHRyaWJ1dGU8VCBleHRlbmRzIG9iamVjdCwgVSBleHRlbmRzIGtleW9mIE1peENsYXNzQXR0cmlidXRlPihcbiAgICB0YXJnZXQ6IENvbnN0cnVjdG9yPFQ+LFxuICAgIGF0dHI6IFUsXG4gICAgbWV0aG9kPzogTWl4Q2xhc3NBdHRyaWJ1dGVbVV1cbik6IHZvaWQge1xuICAgIHN3aXRjaCAoYXR0cikge1xuICAgICAgICBjYXNlICdwcm90b0V4dGVuZHNPbmx5JzpcbiAgICAgICAgICAgIHRhcmdldFtfcHJvdG9FeHRlbmRzT25seV0gPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2luc3RhbmNlT2YnOlxuICAgICAgICAgICAgc2V0SW5zdGFuY2VPZih0YXJnZXQsIG1ldGhvZCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gTWl4aW4gZnVuY3Rpb24gZm9yIG11bHRpcGxlIGluaGVyaXRhbmNlLiA8YnI+XG4gKiAgICAgUmVzb2x2aW5nIHR5cGUgc3VwcG9ydCBmb3IgbWF4aW11bSAxMCBjbGFzc2VzLlxuICogQGphIOWkmumHjee2meaJv+OBruOBn+OCgeOBriBNaXhpbiA8YnI+XG4gKiAgICAg5pyA5aSnIDEwIOOCr+ODqeOCueOBruWei+ino+axuuOCkuOCteODneODvOODiFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2xhc3MgQmFzZSB7IGNvbnN0cnVjdG9yKGEsIGIpIHt9IH07XG4gKiBjbGFzcyBNaXhBIHsgY29uc3RydWN0b3IoYSwgYikge30gfTtcbiAqIGNsYXNzIE1peEIgeyBjb25zdHJ1Y3RvcihjLCBkKSB7fSB9O1xuICpcbiAqIGNsYXNzIE1peGluQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoQmFzZSwgTWl4QSwgTWl4Qikge1xuICogICAgIGNvbnN0cnVjdG9yKGEsIGIsIGMsIGQpe1xuICogICAgICAgICAvLyBjYWxsaW5nIGBCYXNlYCBjb25zdHJ1Y3RvclxuICogICAgICAgICBzdXBlcihhLCBiKTtcbiAqXG4gKiAgICAgICAgIC8vIGNhbGxpbmcgTWl4aW4gY2xhc3MncyBjb25zdHJ1Y3RvclxuICogICAgICAgICB0aGlzLnN1cGVyKE1peEEsIGEsIGIpO1xuICogICAgICAgICB0aGlzLnN1cGVyKE1peEIsIGMsIGQpO1xuICogICAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBiYXNlXG4gKiAgLSBgZW5gIHByaW1hcnkgYmFzZSBjbGFzcy4gc3VwZXIoYXJncykgaXMgdGhpcyBjbGFzcydzIG9uZS5cbiAqICAtIGBqYWAg5Z+65bqV44Kv44Op44K544Kz44Oz44K544OI44Op44Kv44K/LiDlkIzlkI3jg5fjg63jg5Hjg4bjgqMsIOODoeOCveODg+ODieOBr+acgOWEquWFiOOBleOCjOOCiy4gc3VwZXIoYXJncykg44Gv44GT44Gu44Kv44Op44K544Gu44KC44Gu44GM5oyH5a6a5Y+v6IO9LlxuICogQHBhcmFtIHNvdXJjZXNcbiAqICAtIGBlbmAgbXVsdGlwbGUgZXh0ZW5kcyBjbGFzc1xuICogIC0gYGphYCDmi6HlvLXjgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIG1peGluZWQgY2xhc3MgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg5ZCI5oiQ44GV44KM44Gf44Kv44Op44K544Kz44Oz44K544OI44Op44Kv44K/XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtaXhpbnM8XG4gICAgQiBleHRlbmRzIENsYXNzLFxuICAgIFMxIGV4dGVuZHMgb2JqZWN0LFxuICAgIFMyIGV4dGVuZHMgb2JqZWN0LFxuICAgIFMzIGV4dGVuZHMgb2JqZWN0LFxuICAgIFM0IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM1IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM2IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM3IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM4IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM5IGV4dGVuZHMgb2JqZWN0PihcbiAgICBiYXNlOiBCLFxuICAgIC4uLnNvdXJjZXM6IFtcbiAgICAgICAgQ29uc3RydWN0b3I8UzE+LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTMj4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTMz4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTND4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNT4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNj4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNz4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTOD4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTOT4/LFxuICAgICAgICAuLi5hbnlbXVxuICAgIF0pOiBNaXhpbkNvbnN0cnVjdG9yPEIsIE1peGluQ2xhc3MgJiBJbnN0YW5jZVR5cGU8Qj4gJiBTMSAmIFMyICYgUzMgJiBTNCAmIFM1ICYgUzYgJiBTNyAmIFM4ICYgUzk+IHtcblxuICAgIGxldCBfaGFzU291cmNlQ29uc3RydWN0b3IgPSBmYWxzZTtcblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbmFtaW5nLWNvbnZlbnRpb25cbiAgICBjbGFzcyBfTWl4aW5CYXNlIGV4dGVuZHMgKGJhc2UgYXMgdW5rbm93biBhcyBDb25zdHJ1Y3RvcjxNaXhpbkNsYXNzPikge1xuXG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgW19jb25zdHJ1Y3RvcnNdOiBNYXA8Q29uc3RydWN0b3I8b2JqZWN0PiwgVW5rbm93bkZ1bmN0aW9uIHwgbnVsbD47XG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgW19jbGFzc0Jhc2VdOiBDb25zdHJ1Y3RvcjxvYmplY3Q+O1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKC4uLmFyZ3M6IHVua25vd25bXSkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGNvbnN0cnVjdG9yLXN1cGVyXG4gICAgICAgICAgICBzdXBlciguLi5hcmdzKTtcblxuICAgICAgICAgICAgY29uc3QgY29uc3RydWN0b3JzID0gbmV3IE1hcDxDb25zdHJ1Y3RvcjxvYmplY3Q+LCBVbmtub3duRnVuY3Rpb24+KCk7XG4gICAgICAgICAgICB0aGlzW19jb25zdHJ1Y3RvcnNdID0gY29uc3RydWN0b3JzO1xuICAgICAgICAgICAgdGhpc1tfY2xhc3NCYXNlXSA9IGJhc2U7XG5cbiAgICAgICAgICAgIGlmIChfaGFzU291cmNlQ29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNyY0NsYXNzIG9mIHNvdXJjZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzcmNDbGFzc1tfcHJvdG9FeHRlbmRzT25seV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhbmRsZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwbHk6ICh0YXJnZXQ6IHVua25vd24sIHRoaXNvYmo6IHVua25vd24sIGFyZ2xpc3Q6IHVua25vd25bXSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvYmogPSBuZXcgc3JjQ2xhc3MoLi4uYXJnbGlzdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcHlQcm9wZXJ0aWVzKHRoaXMsIG9iaik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHByb3h5IGZvciAnY29uc3RydWN0JyBhbmQgY2FjaGUgY29uc3RydWN0b3JcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9ycy5zZXQoc3JjQ2xhc3MsIG5ldyBQcm94eShzcmNDbGFzcywgaGFuZGxlciBhcyBQcm94eUhhbmRsZXI8b2JqZWN0PikpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcHJvdGVjdGVkIHN1cGVyPFQgZXh0ZW5kcyBDbGFzcz4oc3JjQ2xhc3M6IFQsIC4uLmFyZ3M6IENvbnN0cnVjdG9yUGFyYW1ldGVyczxUPik6IHRoaXMge1xuICAgICAgICAgICAgY29uc3QgbWFwID0gdGhpc1tfY29uc3RydWN0b3JzXTtcbiAgICAgICAgICAgIGNvbnN0IGN0b3IgPSBtYXAuZ2V0KHNyY0NsYXNzKTtcbiAgICAgICAgICAgIGlmIChjdG9yKSB7XG4gICAgICAgICAgICAgICAgY3Rvci5jYWxsKHRoaXMsIC4uLmFyZ3MpO1xuICAgICAgICAgICAgICAgIG1hcC5zZXQoc3JjQ2xhc3MsIG51bGwpOyAgICAvLyBwcmV2ZW50IGNhbGxpbmcgdHdpY2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIGlzTWl4ZWRXaXRoPFQgZXh0ZW5kcyBvYmplY3Q+KHNyY0NsYXNzOiBDb25zdHJ1Y3RvcjxUPik6IGJvb2xlYW4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uc3RydWN0b3IgPT09IHNyY0NsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzW19jbGFzc0Jhc2VdID09PSBzcmNDbGFzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1tfY2xhc3NTb3VyY2VzXS5yZWR1Y2UoKHAsIGMpID0+IHAgfHwgKHNyY0NsYXNzID09PSBjKSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIHN0YXRpYyBbU3ltYm9sLmhhc0luc3RhbmNlXShpbnN0YW5jZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZi5jYWxsKF9NaXhpbkJhc2UucHJvdG90eXBlLCBpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgW19pc0luaGVyaXRlZF08VCBleHRlbmRzIG9iamVjdD4oc3JjQ2xhc3M6IENvbnN0cnVjdG9yPFQ+KTogYm9vbGVhbiB7XG4gICAgICAgICAgICBjb25zdCBjdG9ycyA9IHRoaXNbX2NvbnN0cnVjdG9yc107XG4gICAgICAgICAgICBpZiAoY3RvcnMuaGFzKHNyY0NsYXNzKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCBjdG9yIG9mIGN0b3JzLmtleXMoKSkge1xuICAgICAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YuY2FsbChzcmNDbGFzcywgY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJpdmF0ZSBnZXQgW19jbGFzc1NvdXJjZXNdKCk6IENvbnN0cnVjdG9yPG9iamVjdD5bXSB7XG4gICAgICAgICAgICByZXR1cm4gWy4uLnRoaXNbX2NvbnN0cnVjdG9yc10ua2V5cygpXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoY29uc3Qgc3JjQ2xhc3Mgb2Ygc291cmNlcykge1xuICAgICAgICAvLyBwcm92aWRlIGN1c3RvbSBpbnN0YW5jZW9mXG4gICAgICAgIGNvbnN0IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNyY0NsYXNzLCBTeW1ib2wuaGFzSW5zdGFuY2UpO1xuICAgICAgICBpZiAoIWRlc2MgfHwgZGVzYy53cml0YWJsZSkge1xuICAgICAgICAgICAgY29uc3Qgb3JnSW5zdGFuY2VPZiA9IGRlc2MgPyBzcmNDbGFzc1tTeW1ib2wuaGFzSW5zdGFuY2VdIDogX2luc3RhbmNlT2Y7XG4gICAgICAgICAgICBzZXRJbnN0YW5jZU9mKHNyY0NsYXNzLCAoaW5zdDogb2JqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yZ0luc3RhbmNlT2YuY2FsbChzcmNDbGFzcywgaW5zdCkgfHwgKChudWxsICE9IGluc3QgJiYgaW5zdFtfaXNJbmhlcml0ZWRdKSA/IGluc3RbX2lzSW5oZXJpdGVkXShzcmNDbGFzcykgOiBmYWxzZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBwcm92aWRlIHByb3RvdHlwZVxuICAgICAgICBjb3B5UHJvcGVydGllcyhfTWl4aW5CYXNlLnByb3RvdHlwZSwgc3JjQ2xhc3MucHJvdG90eXBlKTtcbiAgICAgICAgbGV0IHBhcmVudCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihzcmNDbGFzcy5wcm90b3R5cGUpO1xuICAgICAgICB3aGlsZSAoX29ialByb3RvdHlwZSAhPT0gcGFyZW50KSB7XG4gICAgICAgICAgICBjb3B5UHJvcGVydGllcyhfTWl4aW5CYXNlLnByb3RvdHlwZSwgcGFyZW50KTtcbiAgICAgICAgICAgIHBhcmVudCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihwYXJlbnQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNoZWNrIGNvbnN0cnVjdG9yXG4gICAgICAgIGlmICghX2hhc1NvdXJjZUNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICBfaGFzU291cmNlQ29uc3RydWN0b3IgPSAhc3JjQ2xhc3NbX3Byb3RvRXh0ZW5kc09ubHldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIF9NaXhpbkJhc2UgYXMgYW55O1xufVxuIiwiaW1wb3J0IHsgZGVlcEVxdWFsIH0gZnJvbSAnLi9kZWVwLWNpcmN1aXQnO1xuaW1wb3J0IHtcbiAgICBOaWwsXG4gICAgV3JpdGFibGUsXG4gICAgaXNBcnJheSxcbiAgICBpc09iamVjdCxcbiAgICBpc0Z1bmN0aW9uLFxufSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IHZlcmlmeSB9IGZyb20gJy4vdmVyaWZ5JztcblxuLyoqXG4gKiBAZW4gQ2hlY2sgd2hldGhlciBpbnB1dCBzb3VyY2UgaGFzIGEgcHJvcGVydHkuXG4gKiBAamEg5YWl5Yqb5YWD44GM44OX44Ot44OR44OG44Kj44KS5oyB44Gj44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNyY1xuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzKHNyYzogdW5rbm93biwgcHJvcE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBudWxsICE9IHNyYyAmJiBpc09iamVjdChzcmMpICYmIChwcm9wTmFtZSBpbiBzcmMpO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgc2hhbGxvdyBjb3B5IG9mIGB0YXJnZXRgIHdoaWNoIGhhcyBvbmx5IGBwaWNrS2V5c2AuXG4gKiBAamEgYHBpY2tLZXlzYCDjgafmjIflrprjgZXjgozjgZ/jg5fjg63jg5Hjg4bjgqPjga7jgb/jgpLmjIHjgaQgYHRhcmdldGAg44GuIFNoYWxsb3cgQ29weSDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIGNvcHkgc291cmNlIG9iamVjdFxuICogIC0gYGphYCDjgrPjg5Tjg7zlhYPjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBwaWNrS2V5c1xuICogIC0gYGVuYCBjb3B5IHRhcmdldCBrZXlzXG4gKiAgLSBgamFgIOOCs+ODlOODvOWvvuixoeOBruOCreODvOS4gOimp1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGljazxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMga2V5b2YgVD4odGFyZ2V0OiBULCAuLi5waWNrS2V5czogS1tdKTogV3JpdGFibGU8UGljazxULCBLPj4ge1xuICAgIHZlcmlmeSgndHlwZU9mJywgJ29iamVjdCcsIHRhcmdldCk7XG4gICAgcmV0dXJuIHBpY2tLZXlzLnJlZHVjZSgob2JqLCBrZXkpID0+IHtcbiAgICAgICAga2V5IGluIHRhcmdldCAmJiAob2JqW2tleV0gPSB0YXJnZXRba2V5XSk7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfSwge30gYXMgV3JpdGFibGU8UGljazxULCBLPj4pO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgc2hhbGxvdyBjb3B5IG9mIGB0YXJnZXRgIHdpdGhvdXQgYG9taXRLZXlzYC5cbiAqIEBqYSBgb21pdEtleXNgIOOBp+aMh+WumuOBleOCjOOBn+ODl+ODreODkeODhuOCo+S7peWkluOBruOCreODvOOCkuaMgeOBpCBgdGFyZ2V0YCDjga4gU2hhbGxvdyBDb3B5IOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgY29weSBzb3VyY2Ugb2JqZWN0XG4gKiAgLSBgamFgIOOCs+ODlOODvOWFg+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIG9taXRLZXlzXG4gKiAgLSBgZW5gIG9taXQgdGFyZ2V0IGtleXNcbiAqICAtIGBqYWAg5YmK6Zmk5a++6LGh44Gu44Kt44O85LiA6KanXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvbWl0PFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBrZXlvZiBUPih0YXJnZXQ6IFQsIC4uLm9taXRLZXlzOiBLW10pOiBXcml0YWJsZTxPbWl0PFQsIEs+PiB7XG4gICAgdmVyaWZ5KCd0eXBlT2YnLCAnb2JqZWN0JywgdGFyZ2V0KTtcbiAgICBjb25zdCBvYmogPSB7fSBhcyBXcml0YWJsZTxPbWl0PFQsIEs+PjtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0YXJnZXQpKSB7XG4gICAgICAgICFvbWl0S2V5cy5pbmNsdWRlcyhrZXkgYXMgSykgJiYgKG9ialtrZXldID0gdGFyZ2V0W2tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIEBlbiBJbnZlcnQgdGhlIGtleXMgYW5kIHZhbHVlcyBvZiBhbiBvYmplY3QuIFRoZSB2YWx1ZXMgbXVzdCBiZSBzZXJpYWxpemFibGUuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu44Kt44O844Go5YCk44KS6YCG6Lui44GZ44KLLiDjgZnjgbnjgabjga7lgKTjgYzjg6bjg4vjg7zjgq/jgafjgYLjgovjgZPjgajjgYzliY3mj5BcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBvYmplY3RcbiAqICAtIGBqYWAg5a++6LGh44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnZlcnQ8VCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4odGFyZ2V0OiBvYmplY3QpOiBUIHtcbiAgICBjb25zdCByZXN1bHQgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0YXJnZXQpKSB7XG4gICAgICAgIHJlc3VsdFt0YXJnZXRba2V5XV0gPSBrZXk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQgYXMgVDtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHNoYWxsb3cgY29weSBvZiBkaWZmZXJlbmNlIGJldHdlZW4gYGJhc2VgIGFuZCBgc3JjYC5cbiAqIEBqYSBgYmFzZWAg44GoIGBzcmNgIOOBruW3ruWIhuODl+ODreODkeODhuOCo+OCkuOCguOBpOOCquODluOCuOOCp+OCr+ODiOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGJhc2VcbiAqICAtIGBlbmAgYmFzZSBvYmplY3RcbiAqICAtIGBqYWAg5Z+65rqW44Go44Gq44KL44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBvYmplY3RcbiAqICAtIGBqYWAg44Kz44OU44O85YWD44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaWZmPFQgZXh0ZW5kcyBvYmplY3Q+KGJhc2U6IFQsIHNyYzogUGFydGlhbDxUPik6IFBhcnRpYWw8VD4ge1xuICAgIHZlcmlmeSgndHlwZU9mJywgJ29iamVjdCcsIGJhc2UpO1xuICAgIHZlcmlmeSgndHlwZU9mJywgJ29iamVjdCcsIHNyYyk7XG5cbiAgICBjb25zdCByZXR2YWw6IFBhcnRpYWw8VD4gPSB7fTtcblxuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHNyYykpIHtcbiAgICAgICAgaWYgKCFkZWVwRXF1YWwoYmFzZVtrZXldLCBzcmNba2V5XSkpIHtcbiAgICAgICAgICAgIHJldHZhbFtrZXldID0gc3JjW2tleV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgc2hhbGxvdyBjb3B5IG9mIGBiYXNlYCB3aXRob3V0IGBkcm9wVmFsdWVgLlxuICogQGphIGBkcm9wVmFsdWVgIOOBp+aMh+WumuOBleOCjOOBn+ODl+ODreODkeODhuOCo+WApOS7peWkluOBruOCreODvOOCkuaMgeOBpCBgdGFyZ2V0YCDjga4gU2hhbGxvdyBDb3B5IOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBiYXNlXG4gKiAgLSBgZW5gIGJhc2Ugb2JqZWN0XG4gKiAgLSBgamFgIOWfuua6luOBqOOBquOCi+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIGRyb3BWYWx1ZXNcbiAqICAtIGBlbmAgdGFyZ2V0IHZhbHVlLiBkZWZhdWx0OiBgdW5kZWZpbmVkYC5cbiAqICAtIGBqYWAg5a++6LGh44Gu5YCkLiDml6LlrprlgKQ6IGB1bmRlZmluZWRgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkcm9wPFQgZXh0ZW5kcyBvYmplY3Q+KGJhc2U6IFQsIC4uLmRyb3BWYWx1ZXM6IHVua25vd25bXSk6IFBhcnRpYWw8VD4ge1xuICAgIHZlcmlmeSgndHlwZU9mJywgJ29iamVjdCcsIGJhc2UpO1xuXG4gICAgY29uc3QgdmFsdWVzID0gWy4uLmRyb3BWYWx1ZXNdO1xuICAgIGlmICghdmFsdWVzLmxlbmd0aCkge1xuICAgICAgICB2YWx1ZXMucHVzaCh1bmRlZmluZWQpO1xuICAgIH1cblxuICAgIGNvbnN0IHJldHZhbDogUGFydGlhbDxUPiA9IHsgLi4uYmFzZSB9O1xuXG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoYmFzZSkpIHtcbiAgICAgICAgZm9yIChjb25zdCB2YWwgb2YgdmFsdWVzKSB7XG4gICAgICAgICAgICBpZiAoZGVlcEVxdWFsKHZhbCwgcmV0dmFsW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJldHZhbFtrZXldO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLyoqXG4gKiBAZW4gSWYgdGhlIHZhbHVlIG9mIHRoZSBuYW1lZCBwcm9wZXJ0eSBpcyBhIGZ1bmN0aW9uIHRoZW4gaW52b2tlIGl0OyBvdGhlcndpc2UsIHJldHVybiBpdC5cbiAqIEBqYSBvYmplY3Qg44GuIHByb3BlcnR5IOOBjOODoeOCveODg+ODieOBquOCieOBneOBruWun+ihjOe1kOaenOOCkiwg44OX44Ot44OR44OG44Kj44Gq44KJ44Gd44Gu5YCk44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogLSBgZW5gIE9iamVjdCB0byBtYXliZSBpbnZva2UgZnVuY3Rpb24gYHByb3BlcnR5YCBvbi5cbiAqIC0gYGphYCDoqZXkvqHjgZnjgovjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBwcm9wZXJ0eVxuICogLSBgZW5gIFRoZSBmdW5jdGlvbiBieSBuYW1lIHRvIGludm9rZSBvbiBgb2JqZWN0YC5cbiAqIC0gYGphYCDoqZXkvqHjgZnjgovjg5fjg63jg5Hjg4bjgqPlkI1cbiAqIEBwYXJhbSBmYWxsYmFja1xuICogLSBgZW5gIFRoZSB2YWx1ZSB0byBiZSByZXR1cm5lZCBpbiBjYXNlIGBwcm9wZXJ0eWAgZG9lc24ndCBleGlzdCBvciBpcyB1bmRlZmluZWQuXG4gKiAtIGBqYWAg5a2Y5Zyo44GX44Gq44GL44Gj44Gf5aC05ZCI44GuIGZhbGxiYWNrIOWApFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzdWx0PFQgPSBhbnk+KHRhcmdldDogb2JqZWN0IHwgTmlsLCBwcm9wZXJ0eTogc3RyaW5nIHwgc3RyaW5nW10sIGZhbGxiYWNrPzogVCk6IFQgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICBjb25zdCBwcm9wcyA9IGlzQXJyYXkocHJvcGVydHkpID8gcHJvcGVydHkgOiBbcHJvcGVydHldO1xuICAgIGlmICghcHJvcHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBpc0Z1bmN0aW9uKGZhbGxiYWNrKSA/IGZhbGxiYWNrLmNhbGwodGFyZ2V0KSA6IGZhbGxiYWNrO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc29sdmUgPSAobzogdW5rbm93biwgcDogdW5rbm93bik6IHVua25vd24gPT4ge1xuICAgICAgICByZXR1cm4gaXNGdW5jdGlvbihwKSA/IHAuY2FsbChvKSA6IHA7XG4gICAgfTtcblxuICAgIGxldCBvYmogPSB0YXJnZXQ7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHByb3BzKSB7XG4gICAgICAgIGNvbnN0IHByb3AgPSBudWxsID09IG9iaiA/IHVuZGVmaW5lZCA6IG9ialtuYW1lXTtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gcHJvcCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUob2JqLCBmYWxsYmFjaykgYXMgVDtcbiAgICAgICAgfVxuICAgICAgICBvYmogPSByZXNvbHZlKG9iaiwgcHJvcCkgYXMgb2JqZWN0O1xuICAgIH1cbiAgICByZXR1cm4gb2JqIGFzIHVua25vd24gYXMgVDtcbn1cbiIsIi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIGNhbGxhYmxlKCk6IHVua25vd24ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdXNlLWJlZm9yZS1kZWZpbmVcbiAgICByZXR1cm4gYWNjZXNzaWJsZTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgYWNjZXNzaWJsZTogdW5rbm93biA9IG5ldyBQcm94eShjYWxsYWJsZSwge1xuICAgIGdldDogKHRhcmdldCwgbmFtZSkgPT4ge1xuICAgICAgICBjb25zdCBwcm9wID0gdGFyZ2V0W25hbWVdO1xuICAgICAgICBpZiAobnVsbCAhPSBwcm9wKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvcDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBhY2Nlc3NpYmxlO1xuICAgICAgICB9XG4gICAgfSxcbn0pO1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBjcmVhdGUoKTogdW5rbm93biB7XG4gICAgY29uc3Qgc3R1YiA9IG5ldyBQcm94eSh7fSwge1xuICAgICAgICBnZXQ6ICh0YXJnZXQsIG5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHByb3AgPSB0YXJnZXRbbmFtZV07XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBwcm9wKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb3A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2Nlc3NpYmxlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHN0dWIsICdzdHViJywge1xuICAgICAgICB2YWx1ZTogdHJ1ZSxcbiAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN0dWI7XG59XG5cbi8qKlxuICogQGVuIEdldCBzYWZlIGFjY2Vzc2libGUgb2JqZWN0LlxuICogQGphIOWuieWFqOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCquODluOCuOOCp+OCr+ODiOOBruWPluW+l1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3Qgc2FmZVdpbmRvdyA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuICogY29uc29sZS5sb2cobnVsbCAhPSBzYWZlV2luZG93LmRvY3VtZW50KTsgICAgLy8gdHJ1ZVxuICogY29uc3QgZGl2ID0gc2FmZVdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAqIGNvbnNvbGUubG9nKG51bGwgIT0gZGl2KTsgICAgLy8gdHJ1ZVxuICogYGBgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBBIHJlZmVyZW5jZSBvZiBhbiBvYmplY3Qgd2l0aCBhIHBvc3NpYmlsaXR5IHdoaWNoIGV4aXN0cy5cbiAqICAtIGBqYWAg5a2Y5Zyo44GX44GG44KL44Kq44OW44K444Kn44Kv44OI44Gu5Y+C54WnXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZWFsaXR5IG9yIHN0dWIgaW5zdGFuY2UuXG4gKiAgLSBgamFgIOWun+S9k+OBvuOBn+OBr+OCueOCv+ODluOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FmZTxUPih0YXJnZXQ6IFQpOiBUIHtcbiAgICByZXR1cm4gdGFyZ2V0IHx8IGNyZWF0ZSgpIGFzIFQ7XG59XG4iLCJpbXBvcnQgeyBVbmtub3duRnVuY3Rpb24gfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGdldEdsb2JhbCB9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7IHNhZmUgfSBmcm9tICcuL3NhZmUnO1xuXG4vKipcbiAqIEBlbiBUeXBlIG9mIGhhbmRsZSBmb3IgdGltZXIgZnVuY3Rpb25zLlxuICogQGphIOOCv+OCpOODnuODvOmWouaVsOOBq+S9v+eUqOOBmeOCi+ODj+ODs+ODieODq+Wei1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRpbWVySGFuZGxlIHsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1pbnRlcmZhY2VcblxuLyoqXG4gKiBAZW4gVHlwZSBvZiB0aW1lciBzdGFydCBmdW5jdGlvbnMuXG4gKiBAamEg44K/44Kk44Oe44O86ZaL5aeL6Zai5pWw44Gu5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFRpbWVyU3RhcnRGdW5jdGlvbiA9IChoYW5kbGVyOiBVbmtub3duRnVuY3Rpb24sIHRpbWVvdXQ/OiBudW1iZXIsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gVGltZXJIYW5kbGU7XG5cbi8qKlxuICogQGVuIFR5cGUgb2YgdGltZXIgc3RvcCBmdW5jdGlvbnMuXG4gKiBAamEg44K/44Kk44Oe44O85YGc5q2i6Zai5pWw44Gu5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFRpbWVyU3RvcEZ1bmN0aW9uID0gKGhhbmRsZTogVGltZXJIYW5kbGUpID0+IHZvaWQ7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBUaW1lckNvbnRleHQge1xuICAgIHNldFRpbWVvdXQ6IFRpbWVyU3RhcnRGdW5jdGlvbjtcbiAgICBjbGVhclRpbWVvdXQ6IFRpbWVyU3RvcEZ1bmN0aW9uO1xuICAgIHNldEludGVydmFsOiBUaW1lclN0YXJ0RnVuY3Rpb247XG4gICAgY2xlYXJJbnRlcnZhbDogVGltZXJTdG9wRnVuY3Rpb247XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Jvb3QgPSBnZXRHbG9iYWwoKSBhcyB1bmtub3duIGFzIFRpbWVyQ29udGV4dDtcbmNvbnN0IHNldFRpbWVvdXQ6IFRpbWVyU3RhcnRGdW5jdGlvbiAgID0gc2FmZShfcm9vdC5zZXRUaW1lb3V0KTtcbmNvbnN0IGNsZWFyVGltZW91dDogVGltZXJTdG9wRnVuY3Rpb24gID0gc2FmZShfcm9vdC5jbGVhclRpbWVvdXQpO1xuY29uc3Qgc2V0SW50ZXJ2YWw6IFRpbWVyU3RhcnRGdW5jdGlvbiAgPSBzYWZlKF9yb290LnNldEludGVydmFsKTtcbmNvbnN0IGNsZWFySW50ZXJ2YWw6IFRpbWVyU3RvcEZ1bmN0aW9uID0gc2FmZShfcm9vdC5jbGVhckludGVydmFsKTtcblxuZXhwb3J0IHtcbiAgICBzZXRUaW1lb3V0LFxuICAgIGNsZWFyVGltZW91dCxcbiAgICBzZXRJbnRlcnZhbCxcbiAgICBjbGVhckludGVydmFsLFxufTtcbiIsImltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIFByaW1pdGl2ZSxcbiAgICBUeXBlZERhdGEsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNPYmplY3QsXG59IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgaW52ZXJ0IH0gZnJvbSAnLi9vYmplY3QnO1xuaW1wb3J0IHtcbiAgICBUaW1lckhhbmRsZSxcbiAgICBzZXRUaW1lb3V0LFxuICAgIGNsZWFyVGltZW91dCxcbn0gZnJvbSAnLi90aW1lcic7XG5cbi8qKlxuICogQGVuIEVuc3VyZSBhc3luY2hyb25vdXMgZXhlY3V0aW9uLlxuICogQGphIOmdnuWQjOacn+Wun+ihjOOCkuS/neiovFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogdm9pZCBwb3N0KCgpID0+IGV4ZWMoYXJnKSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgaW1wbGVtZW50IGFzIGZ1bmN0aW9uIHNjb3BlLlxuICogIC0gYGphYCDplqLmlbDjgrnjgrPjg7zjg5fjgajjgZfjgablrp/oo4VcbiovXG5leHBvcnQgZnVuY3Rpb24gcG9zdDxUPihleGVjdXRvcjogKCkgPT4gVCk6IFByb21pc2U8VD4ge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGV4ZWN1dG9yKTtcbn1cblxuLyoqXG4gKiBAZW4gR2VuZXJpYyBOby1PcGVyYXRpb24uXG4gKiBAamEg5rGO55SoIE5vLU9wZXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9vcCguLi5hcmdzOiB1bmtub3duW10pOiBhbnkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycywgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIC8vIG5vb3Bcbn1cblxuLyoqXG4gKiBAZW4gV2FpdCBmb3IgdGhlIGRlc2lnbmF0aW9uIGVsYXBzZS5cbiAqIEBqYSDmjIflrprmmYLplpPlh6bnkIbjgpLlvoXmqZ9cbiAqXG4gKiBAcGFyYW0gZWxhcHNlXG4gKiAgLSBgZW5gIHdhaXQgZWxhcHNlIFttc2VjXS5cbiAqICAtIGBqYWAg5b6F5qmf5pmC6ZaTIFttc2VjXVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2xlZXAoZWxhcHNlOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIGVsYXBzZSkpO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIHdoZW4gaW52b2tlZCwgd2lsbCBvbmx5IGJlIHRyaWdnZXJlZCBhdCBtb3N0IG9uY2UgZHVyaW5nIGEgZ2l2ZW4gdGltZS5cbiAqIEBqYSDplqLmlbDjga7lrp/ooYzjgpIgd2FpdCBbbXNlY10g44GrMeWbnuOBq+WItumZkFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgdGhyb3R0bGVkID0gdGhyb3R0bGUodXBhdGVQb3NpdGlvbiwgMTAwKTtcbiAqICQod2luZG93KS5zY3JvbGwodGhyb3R0bGVkKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBzZWVkIGZ1bmN0aW9uLlxuICogIC0gYGphYCDlr77osaHjga7plqLmlbBcbiAqIEBwYXJhbSBlbGFwc2VcbiAqICAtIGBlbmAgd2FpdCBlbGFwc2UgW21zZWNdLlxuICogIC0gYGphYCDlvoXmqZ/mmYLplpMgW21zZWNdXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGhyb3R0bGU8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZXhlY3V0b3I6IFQsIGVsYXBzZTogbnVtYmVyLCBvcHRpb25zPzogeyBsZWFkaW5nPzogYm9vbGVhbjsgdHJhaWxpbmc/OiBib29sZWFuOyB9KTogVCAmIHsgY2FuY2VsKCk6IHZvaWQ7IH0ge1xuICAgIGNvbnN0IG9wdHMgPSBvcHRpb25zIHx8IHt9O1xuICAgIGxldCBoYW5kbGU6IFRpbWVySGFuZGxlIHwgdW5kZWZpbmVkO1xuICAgIGxldCBhcmdzOiB1bmtub3duW10gfCB1bmRlZmluZWQ7XG4gICAgbGV0IGNvbnRleHQ6IHVua25vd24sIHJlc3VsdDogdW5rbm93bjtcbiAgICBsZXQgcHJldmlvdXMgPSAwO1xuXG4gICAgY29uc3QgbGF0ZXIgPSBmdW5jdGlvbiAoKTogdm9pZCB7XG4gICAgICAgIHByZXZpb3VzID0gZmFsc2UgPT09IG9wdHMubGVhZGluZyA/IDAgOiBEYXRlLm5vdygpO1xuICAgICAgICBoYW5kbGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHJlc3VsdCA9IGV4ZWN1dG9yLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBpZiAoIWhhbmRsZSkge1xuICAgICAgICAgICAgY29udGV4dCA9IGFyZ3MgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgdGhyb3R0bGVkID0gZnVuY3Rpb24gKHRoaXM6IHVua25vd24sIC4uLmFyZzogdW5rbm93bltdKTogdW5rbm93biB7XG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIGlmICghcHJldmlvdXMgJiYgZmFsc2UgPT09IG9wdHMubGVhZGluZykge1xuICAgICAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVtYWluaW5nID0gZWxhcHNlIC0gKG5vdyAtIHByZXZpb3VzKTtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWludmFsaWQtdGhpc1xuICAgICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgICAgYXJncyA9IFsuLi5hcmddO1xuICAgICAgICBpZiAocmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gZWxhcHNlKSB7XG4gICAgICAgICAgICBpZiAoaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGhhbmRsZSk7XG4gICAgICAgICAgICAgICAgaGFuZGxlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgICAgICByZXN1bHQgPSBleGVjdXRvci5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICAgIGlmICghaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dCA9IGFyZ3MgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIWhhbmRsZSAmJiBmYWxzZSAhPT0gb3B0cy50cmFpbGluZykge1xuICAgICAgICAgICAgaGFuZGxlID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICB0aHJvdHRsZWQuY2FuY2VsID0gZnVuY3Rpb24gKCk6IHZvaWQge1xuICAgICAgICBjbGVhclRpbWVvdXQoaGFuZGxlIGFzIFRpbWVySGFuZGxlKTtcbiAgICAgICAgcHJldmlvdXMgPSAwO1xuICAgICAgICBoYW5kbGUgPSBjb250ZXh0ID0gYXJncyA9IHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHRocm90dGxlZCBhcyAoVCAmIHsgY2FuY2VsKCk6IHZvaWQ7IH0pO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIGFzIGxvbmcgYXMgaXQgY29udGludWVzIHRvIGJlIGludm9rZWQsIHdpbGwgbm90IGJlIHRyaWdnZXJlZC5cbiAqIEBqYSDlkbzjgbPlh7rjgZXjgozjgabjgYvjgokgd2FpdCBbbXNlY10g57WM6YGO44GZ44KL44G+44Gn5a6f6KGM44GX44Gq44GE6Zai5pWw44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIHNlZWQgZnVuY3Rpb24uXG4gKiAgLSBgamFgIOWvvuixoeOBrumWouaVsFxuICogQHBhcmFtIHdhaXRcbiAqICAtIGBlbmAgd2FpdCBlbGFwc2UgW21zZWNdLlxuICogIC0gYGphYCDlvoXmqZ/mmYLplpMgW21zZWNdXG4gKiBAcGFyYW0gaW1tZWRpYXRlXG4gKiAgLSBgZW5gIElmIGB0cnVlYCBpcyBwYXNzZWQsIHRyaWdnZXIgdGhlIGZ1bmN0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2UsIGluc3RlYWQgb2YgdGhlIHRyYWlsaW5nLlxuICogIC0gYGphYCBgdHJ1ZWAg44Gu5aC05ZCILCDliJ3lm57jga7jgrPjg7zjg6vjga/ljbPmmYLlrp/ooYxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlYm91bmNlPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGV4ZWN1dG9yOiBULCB3YWl0OiBudW1iZXIsIGltbWVkaWF0ZT86IGJvb2xlYW4pOiBUICYgeyBjYW5jZWwoKTogdm9pZDsgfSB7XG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8taW52YWxpZC10aGlzICovXG4gICAgbGV0IGhhbmRsZTogVGltZXJIYW5kbGUgfCB1bmRlZmluZWQ7XG4gICAgbGV0IHJlc3VsdDogdW5kZWZpbmVkO1xuXG4gICAgY29uc3QgbGF0ZXIgPSBmdW5jdGlvbiAoY29udGV4dDogdW5kZWZpbmVkLCBhcmdzOiB1bmRlZmluZWRbXSk6IHZvaWQge1xuICAgICAgICBoYW5kbGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChhcmdzKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBleGVjdXRvci5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBkZWJvdW5jZWQgPSBmdW5jdGlvbiAodGhpczogdW5kZWZpbmVkLCAuLi5hcmdzOiB1bmRlZmluZWRbXSk6IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChoYW5kbGUpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChoYW5kbGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbW1lZGlhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGNhbGxOb3cgPSAhaGFuZGxlO1xuICAgICAgICAgICAgaGFuZGxlID0gc2V0VGltZW91dChsYXRlciwgd2FpdCk7XG4gICAgICAgICAgICBpZiAoY2FsbE5vdykge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGV4ZWN1dG9yLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaGFuZGxlID0gc2V0VGltZW91dChsYXRlciwgd2FpdCwgdGhpcywgWy4uLmFyZ3NdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gZnVuY3Rpb24gKCk6IHZvaWQge1xuICAgICAgICBjbGVhclRpbWVvdXQoaGFuZGxlIGFzIFRpbWVySGFuZGxlKTtcbiAgICAgICAgaGFuZGxlID0gdW5kZWZpbmVkO1xuICAgIH07XG5cbiAgICByZXR1cm4gZGVib3VuY2VkIGFzIChUICYgeyBjYW5jZWwoKTogdm9pZDsgfSk7XG4gICAgLyogZXNsaW50LWVuYWJsZSBuby1pbnZhbGlkLXRoaXMgKi9cbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBhdCBtb3N0IG9uZSB0aW1lLCBubyBtYXR0ZXIgaG93IG9mdGVuIHlvdSBjYWxsIGl0LlxuICogQGphIDHluqbjgZfjgYvlrp/ooYzjgZXjgozjgarjgYTplqLmlbDjgpLov5TljbQuIDLlm57nm67ku6XpmY3jga/mnIDliJ3jga7jgrPjg7zjg6vjga7jgq3jg6Pjg4Pjgrfjg6XjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvbmNlPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGV4ZWN1dG9yOiBUKTogVCB7XG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8taW52YWxpZC10aGlzLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uICovXG4gICAgbGV0IG1lbW86IHVua25vd247XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0aGlzOiB1bmtub3duLCAuLi5hcmdzOiB1bmtub3duW10pOiB1bmtub3duIHtcbiAgICAgICAgaWYgKGV4ZWN1dG9yKSB7XG4gICAgICAgICAgICBtZW1vID0gZXhlY3V0b3IuY2FsbCh0aGlzLCAuLi5hcmdzKTtcbiAgICAgICAgICAgIGV4ZWN1dG9yID0gbnVsbCE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgfSBhcyBUO1xuICAgIC8qIGVzbGludC1lbmFibGUgbm8taW52YWxpZC10aGlzLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uICovXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgZXNjYXBlIGZ1bmN0aW9uIGZyb20gbWFwLlxuICogQGphIOaWh+Wtl+e9ruaPm+mWouaVsOOCkuS9nOaIkFxuICpcbiAqIEBwYXJhbSBtYXBcbiAqICAtIGBlbmAga2V5OiB0YXJnZXQgY2hhciwgdmFsdWU6IHJlcGxhY2UgY2hhclxuICogIC0gYGphYCBrZXk6IOe9ruaPm+WvvuixoSwgdmFsdWU6IOe9ruaPm+aWh+Wtl1xuICogQHJldHVybnNcbiAqICAtIGBlbmAgZXNwYWNlIGZ1bmN0aW9uXG4gKiAgLSBgamFgIOOCqOOCueOCseODvOODl+mWouaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRXNjYXBlcihtYXA6IG9iamVjdCk6IChzcmM6IFByaW1pdGl2ZSkgPT4gc3RyaW5nIHtcbiAgICBjb25zdCBlc2NhcGVyID0gKG1hdGNoOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgICByZXR1cm4gbWFwW21hdGNoXTtcbiAgICB9O1xuXG4gICAgY29uc3Qgc291cmNlID0gYCg/OiR7T2JqZWN0LmtleXMobWFwKS5qb2luKCd8Jyl9KWA7XG4gICAgY29uc3QgcmVnZXhUZXN0ID0gUmVnRXhwKHNvdXJjZSk7XG4gICAgY29uc3QgcmVnZXhSZXBsYWNlID0gUmVnRXhwKHNvdXJjZSwgJ2cnKTtcblxuICAgIHJldHVybiAoc3JjOiBQcmltaXRpdmUpOiBzdHJpbmcgPT4ge1xuICAgICAgICBzcmMgPSAobnVsbCA9PSBzcmMgfHwgJ3N5bWJvbCcgPT09IHR5cGVvZiBzcmMpID8gJycgOiBTdHJpbmcoc3JjKTtcbiAgICAgICAgcmV0dXJuIHJlZ2V4VGVzdC50ZXN0KHNyYykgPyBzcmMucmVwbGFjZShyZWdleFJlcGxhY2UsIGVzY2FwZXIpIDogc3JjO1xuICAgIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1hcEh0bWxFc2NhcGUgPSB7XG4gICAgJzwnOiAnJmx0OycsXG4gICAgJz4nOiAnJmd0OycsXG4gICAgJyYnOiAnJmFtcDsnLFxuICAgICdcIic6ICcmcXVvdDsnLFxuICAgIFwiJ1wiOiAnJiMzOTsnLFxuICAgICdgJzogJyYjeDYwOydcbn07XG5cbi8qKlxuICogQGVuIEVzY2FwZSBIVE1MIHN0cmluZy5cbiAqIEBqYSBIVE1MIOOBp+S9v+eUqOOBmeOCi+aWh+Wtl+OCkuWItuW+oeaWh+Wtl+OBq+e9ruaPm1xuICpcbiAqIEBicmllZiA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IG1hcEh0bWxFc2NhcGUgPSB7XG4gKiAgICAgJzwnIDogJyZsdDsnLFxuICogICAgICc+JyA6ICcmZ3Q7JyxcbiAqICAgICAnJicgOiAnJmFtcDsnLFxuICogICAgICfigLMnOiAnJnF1b3Q7JyxcbiAqICAgICBgJ2AgOiAnJiMzOTsnLFxuICogICAgICdgJyA6ICcmI3g2MDsnXG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBlc2NhcGVIVE1MID0gY3JlYXRlRXNjYXBlcihtYXBIdG1sRXNjYXBlKTtcblxuLyoqXG4gKiBAZW4gVW5lc2NhcGUgSFRNTCBzdHJpbmcuXG4gKiBAamEgSFRNTCDjgafkvb/nlKjjgZnjgovliLblvqHmloflrZfjgpLlvqnlhYNcbiAqL1xuZXhwb3J0IGNvbnN0IHVuZXNjYXBlSFRNTCA9IGNyZWF0ZUVzY2FwZXIoaW52ZXJ0KG1hcEh0bWxFc2NhcGUpKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gdGhlIHN0eWxlIGNvbXB1bHNpb24gdmFsdWUgZnJvbSBpbnB1dCBzdHJpbmcuXG4gKiBAamEg5YWl5Yqb5paH5a2X5YiX44KS5Z6L5by35Yi244GX44Gf5YCk44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgaW5wdXQgc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WvvuixoeOBruaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9UeXBlZERhdGEoZGF0YTogc3RyaW5nIHwgdW5kZWZpbmVkKTogVHlwZWREYXRhIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoJ3RydWUnID09PSBkYXRhKSB7XG4gICAgICAgIC8vIGJvb2xlYW46IHRydWVcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICgnZmFsc2UnID09PSBkYXRhKSB7XG4gICAgICAgIC8vIGJvb2xlYW46IGZhbHNlXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKCdudWxsJyA9PT0gZGF0YSkge1xuICAgICAgICAvLyBudWxsXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoZGF0YSA9PT0gU3RyaW5nKE51bWJlcihkYXRhKSkpIHtcbiAgICAgICAgLy8gbnVtYmVyOiDmlbDlgKTlpInmj5sg4oaSIOaWh+Wtl+WIl+WkieaPm+OBp+WFg+OBq+aIu+OCi+OBqOOBjVxuICAgICAgICByZXR1cm4gTnVtYmVyKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSAmJiAvXig/Olxce1tcXHdcXFddKlxcfXxcXFtbXFx3XFxXXSpcXF0pJC8udGVzdChkYXRhKSkge1xuICAgICAgICAvLyBvYmplY3RcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc3RyaW5nIC8gdW5kZWZpbmVkXG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBzdHJpbmcgZnJvbSBbW1R5cGVkRGF0YV1dLlxuICogQGphIFtbVHlwZWREYXRhXV0g44KS5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgaW5wdXQgc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WvvuixoeOBruaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbVR5cGVkRGF0YShkYXRhOiBUeXBlZERhdGEgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGlmICh1bmRlZmluZWQgPT09IGRhdGEgfHwgaXNTdHJpbmcoZGF0YSkpIHtcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSBlbHNlIGlmIChpc09iamVjdChkYXRhKSkge1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFN0cmluZyhkYXRhKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gYFdlYiBBUElgIHN0b2NrZWQgdHlwZS4gPGJyPlxuICogICAgIEVuc3VyZSBub3QgdG8gcmV0dXJuIGB1bmRlZmluZWRgIHZhbHVlLlxuICogQGphIGBXZWIgQVBJYCDmoLzntI3lvaLlvI/jgavlpInmj5sgPGJyPlxuICogICAgIGB1bmRlZmluZWRgIOOCkui/lOWNtOOBl+OBquOBhOOBk+OBqOOCkuS/neiovFxuICovXG5leHBvcnQgZnVuY3Rpb24gZHJvcFVuZGVmaW5lZDxUPih2YWx1ZTogVCB8IG51bGwgfCB1bmRlZmluZWQsIG5pbFNlcmlhbGl6ZSA9IGZhbHNlKTogVCB8ICdudWxsJyB8ICd1bmRlZmluZWQnIHwgbnVsbCB7XG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWUgPyB2YWx1ZSA6IChuaWxTZXJpYWxpemUgPyBTdHJpbmcodmFsdWUpIDogbnVsbCkgYXMgVCB8ICdudWxsJyB8ICd1bmRlZmluZWQnIHwgbnVsbDtcbn1cblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemUgZnJvbSBgV2ViIEFQSWAgc3RvY2tlZCB0eXBlLiA8YnI+XG4gKiAgICAgQ29udmVydCBmcm9tICdudWxsJyBvciAndW5kZWZpbmVkJyBzdHJpbmcgdG8gb3JpZ2luYWwgdHlwZS5cbiAqIEBqYSAnbnVsbCcgb3IgJ3VuZGVmaW5lZCcg44KS44KC44Go44Gu5Z6L44Gr5oi744GZXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXN0b3JlTmlsPFQ+KHZhbHVlOiBUIHwgJ251bGwnIHwgJ3VuZGVmaW5lZCcpOiBUIHwgbnVsbCB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCdudWxsJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmICgndW5kZWZpbmVkJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqLyBsZXQgX2xvY2FsSWQgPSAwO1xuXG4vKipcbiAqIEBlbiBHZXQgbG9jYWwgdW5pcXVlIGlkLiA8YnI+XG4gKiAgICAgXCJsb2NhbCB1bmlxdWVcIiBtZWFucyBndWFyYW50ZWVzIHVuaXF1ZSBkdXJpbmcgaW4gc2NyaXB0IGxpZmUgY3ljbGUgb25seS5cbiAqIEBqYSDjg63jg7zjgqvjg6vjg6bjg4vjg7zjgq8gSUQg44Gu5Y+W5b6XIDxicj5cbiAqICAgICDjgrnjgq/jg6rjg5fjg4jjg6njgqTjg5XjgrXjgqTjgq/jg6vkuK3jga7lkIzkuIDmgKfjgpLkv53oqLzjgZnjgosuXG4gKlxuICogQHBhcmFtIHByZWZpeFxuICogIC0gYGVuYCBJRCBwcmVmaXhcbiAqICAtIGBqYWAgSUQg44Gr5LuY5LiO44GZ44KLIFByZWZpeFxuICogQHBhcmFtIHplcm9QYWRcbiAqICAtIGBlbmAgMCBwYWRkaW5nIG9yZGVyXG4gKiAgLSBgamFgIDAg6Kmw44KB44GZ44KL5qGB5pWw44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsdWlkKHByZWZpeCA9ICcnLCB6ZXJvUGFkPzogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBjb25zdCBpZCA9ICgrK19sb2NhbElkKS50b1N0cmluZygxNik7XG4gICAgcmV0dXJuIChudWxsICE9IHplcm9QYWQpID8gYCR7cHJlZml4fSR7aWQucGFkU3RhcnQoemVyb1BhZCwgJzAnKX1gIDogYCR7cHJlZml4fSR7aWR9YDtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gYDBgIGFuZCBgbWF4YCwgaW5jbHVzaXZlLlxuICogQGphIGAwYCAtIGBtYXhgIOOBruODqeODs+ODgOODoOOBruaVtOaVsOWApOOCkueUn+aIkFxuICpcbiAqIEBwYXJhbSBtYXhcbiAqICAtIGBlbmAgVGhlIG1heGltdW0gcmFuZG9tIG51bWJlci5cbiAqICAtIGBqYWAg5pW05pWw44Gu5pyA5aSn5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kb21JbnQobWF4OiBudW1iZXIpOiBudW1iZXI7XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIGBtaW5gIGFuZCBgbWF4YCwgaW5jbHVzaXZlLlxuICogQGphIGBtaW5gIC0gYG1heGAg44Gu44Op44Oz44OA44Og44Gu5pW05pWw5YCk44KS55Sf5oiQXG4gKlxuICogQHBhcmFtIG1pblxuICogIC0gYGVuYCBUaGUgbWF4aW11bSByYW5kb20gbnVtYmVyLlxuICogIC0gYGphYCDmlbTmlbDjga7mnIDlpKflgKRcbiAqIEBwYXJhbSBtYXhcbiAqICAtIGBlbmAgVGhlIG1heGltdW0gcmFuZG9tIG51bWJlci5cbiAqICAtIGBqYWAg5pW05pWw44Gu5pyA5aSn5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kb21JbnQobWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmlmaWVkLXNpZ25hdHVyZXNcblxuZXhwb3J0IGZ1bmN0aW9uIHJhbmRvbUludChtaW46IG51bWJlciwgbWF4PzogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBpZiAobnVsbCA9PSBtYXgpIHtcbiAgICAgICAgbWF4ID0gbWluO1xuICAgICAgICBtaW4gPSAwO1xuICAgIH1cbiAgICByZXR1cm4gbWluICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3JlZ2V4Q2FuY2VsTGlrZVN0cmluZyA9IC8oYWJvcnR8Y2FuY2VsKS9pbTtcblxuLyoqXG4gKiBAZW4gUHJlc3VtZSB3aGV0aGVyIGl0J3MgYSBjYW5jZWxlZCBlcnJvci5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjgZXjgozjgZ/jgqjjg6njg7zjgafjgYLjgovjgYvmjqjlrppcbiAqXG4gKiBAcGFyYW0gZXJyb3JcbiAqICAtIGBlbmAgYW4gZXJyb3Igb2JqZWN0IGhhbmRsZWQgaW4gYGNhdGNoYCBibG9jay5cbiAqICAtIGBqYWAgYGNhdGNoYCDnr4Djgarjganjgafoo5zotrPjgZfjgZ/jgqjjg6njg7zjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQ2hhbmNlbExpa2VFcnJvcihlcnJvcjogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIGlmIChudWxsID09IGVycm9yKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKGVycm9yKSkge1xuICAgICAgICByZXR1cm4gX3JlZ2V4Q2FuY2VsTGlrZVN0cmluZy50ZXN0KGVycm9yKTtcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGVycm9yKSkge1xuICAgICAgICByZXR1cm4gX3JlZ2V4Q2FuY2VsTGlrZVN0cmluZy50ZXN0KChlcnJvciBhcyBFcnJvcikubWVzc2FnZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnRzIGZpcnN0IGxldHRlciBvZiB0aGUgc3RyaW5nIHRvIHVwcGVyY2FzZS5cbiAqIEBqYSDmnIDliJ3jga7mloflrZfjgpLlpKfmloflrZfjgavlpInmj5tcbiAqXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjYXBpdGFsaXplKFwiZm9vIEJhclwiKTtcbiAqIC8vID0+IFwiRm9vIEJhclwiXG4gKlxuICogY2FwaXRhbGl6ZShcIkZPTyBCYXJcIiwgdHJ1ZSk7XG4gKiAvLyA9PiBcIkZvbyBiYXJcIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICogQHBhcmFtIGxvd2VyY2FzZVJlc3RcbiAqICAtIGBlbmAgSWYgYHRydWVgIGlzIHBhc3NlZCwgdGhlIHJlc3Qgb2YgdGhlIHN0cmluZyB3aWxsIGJlIGNvbnZlcnRlZCB0byBsb3dlciBjYXNlXG4gKiAgLSBgamFgIGB0cnVlYCDjgpLmjIflrprjgZfjgZ/loLTlkIgsIDLmloflrZfnm67ku6XpmY3jgoLlsI/mloflrZfljJZcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhcGl0YWxpemUoc3JjOiBzdHJpbmcsIGxvd2VyY2FzZVJlc3QgPSBmYWxzZSk6IHN0cmluZyB7XG4gICAgY29uc3QgcmVtYWluaW5nQ2hhcnMgPSAhbG93ZXJjYXNlUmVzdCA/IHNyYy5zbGljZSgxKSA6IHNyYy5zbGljZSgxKS50b0xvd2VyQ2FzZSgpO1xuICAgIHJldHVybiBzcmMuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyByZW1haW5pbmdDaGFycztcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgZmlyc3QgbGV0dGVyIG9mIHRoZSBzdHJpbmcgdG8gbG93ZXJjYXNlLlxuICogQGphIOacgOWIneOBruaWh+Wtl+OCkuWwj+aWh+Wtl+WMllxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogZGVjYXBpdGFsaXplKFwiRm9vIEJhclwiKTtcbiAqIC8vID0+IFwiZm9vIEJhclwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWNhcGl0YWxpemUoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBzcmMuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyBzcmMuc2xpY2UoMSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIHVuZGVyc2NvcmVkIG9yIGRhc2hlcml6ZWQgc3RyaW5nIHRvIGEgY2FtZWxpemVkIG9uZS4gPGJyPlxuICogICAgIEJlZ2lucyB3aXRoIGEgbG93ZXIgY2FzZSBsZXR0ZXIgdW5sZXNzIGl0IHN0YXJ0cyB3aXRoIGFuIHVuZGVyc2NvcmUsIGRhc2ggb3IgYW4gdXBwZXIgY2FzZSBsZXR0ZXIuXG4gKiBAamEgYF9gLCBgLWAg5Yy65YiH44KK5paH5a2X5YiX44KS44Kt44Oj44Oh44Or44Kx44O844K55YyWIDxicj5cbiAqICAgICBgLWAg44G+44Gf44Gv5aSn5paH5a2X44K544K/44O844OI44Gn44GC44KM44GwLCDlpKfmloflrZfjgrnjgr/jg7zjg4jjgYzml6LlrprlgKRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNhbWVsaXplKFwibW96LXRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwibW96VHJhbnNmb3JtXCJcbiAqXG4gKiBjYW1lbGl6ZShcIi1tb3otdHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJNb3pUcmFuc2Zvcm1cIlxuICpcbiAqIGNhbWVsaXplKFwiX21vel90cmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIk1velRyYW5zZm9ybVwiXG4gKlxuICogY2FtZWxpemUoXCJNb3otdHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJNb3pUcmFuc2Zvcm1cIlxuICpcbiAqIGNhbWVsaXplKFwiLW1vei10cmFuc2Zvcm1cIiwgdHJ1ZSk7XG4gKiAvLyA9PiBcIm1velRyYW5zZm9ybVwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKiBAcGFyYW0gbG93ZXJcbiAqICAtIGBlbmAgSWYgYHRydWVgIGlzIHBhc3NlZCwgZm9yY2UgY29udmVydHMgdG8gbG93ZXIgY2FtZWwgY2FzZSBpbiBzdGFydHMgd2l0aCB0aGUgc3BlY2lhbCBjYXNlLlxuICogIC0gYGphYCDlvLfliLbnmoTjgavlsI/mloflrZfjgrnjgr/jg7zjg4jjgZnjgovloLTlkIjjgavjga8gYHRydWVgIOOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FtZWxpemUoc3JjOiBzdHJpbmcsIGxvd2VyID0gZmFsc2UpOiBzdHJpbmcge1xuICAgIHNyYyA9IHNyYy50cmltKCkucmVwbGFjZSgvWy1fXFxzXSsoLik/L2csIChtYXRjaCwgYykgPT4ge1xuICAgICAgICByZXR1cm4gYyA/IGMudG9VcHBlckNhc2UoKSA6ICcnO1xuICAgIH0pO1xuXG4gICAgaWYgKHRydWUgPT09IGxvd2VyKSB7XG4gICAgICAgIHJldHVybiBkZWNhcGl0YWxpemUoc3JjKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gc3JjO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgc3RyaW5nIHRvIGNhbWVsaXplZCBjbGFzcyBuYW1lLiBGaXJzdCBsZXR0ZXIgaXMgYWx3YXlzIHVwcGVyIGNhc2UuXG4gKiBAamEg5YWI6aCt5aSn5paH5a2X44Gu44Kt44Oj44Oh44Or44Kx44O844K544Gr5aSJ5o+bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjbGFzc2lmeShcInNvbWVfY2xhc3NfbmFtZVwiKTtcbiAqIC8vID0+IFwiU29tZUNsYXNzTmFtZVwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGFzc2lmeShzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGNhcGl0YWxpemUoY2FtZWxpemUoc3JjLnJlcGxhY2UoL1tcXFdfXS9nLCAnICcpKS5yZXBsYWNlKC9cXHMvZywgJycpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgYSBjYW1lbGl6ZWQgb3IgZGFzaGVyaXplZCBzdHJpbmcgaW50byBhbiB1bmRlcnNjb3JlZCBvbmUuXG4gKiBAamEg44Kt44Oj44Oh44Or44Kx44O844K5IG9yIGAtYCDjgaTjgarjgY7mloflrZfliJfjgpIgYF9gIOOBpOOBquOBjuOBq+WkieaPm1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogdW5kZXJzY29yZWQoXCJNb3pUcmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIm1vel90cmFuc2Zvcm1cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdW5kZXJzY29yZWQoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBzcmMudHJpbSgpLnJlcGxhY2UoLyhbYS16XFxkXSkoW0EtWl0rKS9nLCAnJDFfJDInKS5yZXBsYWNlKC9bLVxcc10rL2csICdfJykudG9Mb3dlckNhc2UoKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgYSB1bmRlcnNjb3JlZCBvciBjYW1lbGl6ZWQgc3RyaW5nIGludG8gYW4gZGFzaGVyaXplZCBvbmUuXG4gKiBAamEg44Kt44Oj44Oh44Or44Kx44O844K5IG9yIGBfYCDjgaTjgarjgY7mloflrZfliJfjgpIgYC1gIOOBpOOBquOBjuOBq+WkieaPm1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogZGFzaGVyaXplKFwiTW96VHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCItbW96LXRyYW5zZm9ybVwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXNoZXJpemUoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBzcmMudHJpbSgpLnJlcGxhY2UoLyhbQS1aXSkvZywgJy0kMScpLnJlcGxhY2UoL1tfXFxzXSsvZywgJy0nKS50b0xvd2VyQ2FzZSgpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBuby1pbnZhbGlkLXRoaXMsXG4gKi9cblxuaW1wb3J0IHsgcmFuZG9tSW50IH0gZnJvbSAnLi9taXNjJztcblxuY29uc3Qge1xuICAgIC8qKiBAaW50ZXJuYWwgKi8gcmFuZG9tXG59ID0gTWF0aDtcblxuLyoqXG4gKiBAZW4gRXhlY3V0ZSBzaHVmZmxlIG9mIGFuIGFycmF5IGVsZW1lbnRzLlxuICogQGphIOmFjeWIl+imgee0oOOBruOCt+ODo+ODg+ODleODq1xuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gZGVzdHJ1Y3RpdmVcbiAqICAtIGBlbmAgdHJ1ZTogZGVzdHJ1Y3RpdmUgLyBmYWxzZTogbm9uLWRlc3RydWN0aXZlIChkZWZhdWx0KVxuICogIC0gYGphYCB0cnVlOiDnoLTlo4rnmoQgLyBmYWxzZTog6Z2e56C05aOK55qEICjml6LlrpopXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaHVmZmxlPFQ+KGFycmF5OiBUW10sIGRlc3RydWN0aXZlID0gZmFsc2UpOiBUW10ge1xuICAgIGNvbnN0IHNvdXJjZSA9IGRlc3RydWN0aXZlID8gYXJyYXkgOiBhcnJheS5zbGljZSgpO1xuICAgIGNvbnN0IGxlbiA9IHNvdXJjZS5sZW5ndGg7XG4gICAgZm9yIChsZXQgaSA9IGxlbiA+IDAgPyBsZW4gPj4+IDAgOiAwOyBpID4gMTspIHtcbiAgICAgICAgY29uc3QgaiA9IGkgKiByYW5kb20oKSA+Pj4gMDtcbiAgICAgICAgY29uc3Qgc3dhcCA9IHNvdXJjZVstLWldO1xuICAgICAgICBzb3VyY2VbaV0gPSBzb3VyY2Vbal07XG4gICAgICAgIHNvdXJjZVtqXSA9IHN3YXA7XG4gICAgfVxuICAgIHJldHVybiBzb3VyY2U7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBFeGVjdXRlIHN0YWJsZSBzb3J0IGJ5IG1lcmdlLXNvcnQgYWxnb3JpdGhtLlxuICogQGphIGBtZXJnZS1zb3J0YCDjgavjgojjgovlronlrprjgr3jg7zjg4hcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNvbXBhcmF0b3JcbiAqICAtIGBlbmAgc29ydCBjb21wYXJhdG9yIGZ1bmN0aW9uXG4gKiAgLSBgamFgIOOCveODvOODiOmWouaVsOOCkuaMh+WumlxuICogQHBhcmFtIGRlc3RydWN0aXZlXG4gKiAgLSBgZW5gIHRydWU6IGRlc3RydWN0aXZlIC8gZmFsc2U6IG5vbi1kZXN0cnVjdGl2ZSAoZGVmYXVsdClcbiAqICAtIGBqYWAgdHJ1ZTog56C05aOK55qEIC8gZmFsc2U6IOmdnuegtOWjiueahCAo5pei5a6aKVxuICovXG5leHBvcnQgZnVuY3Rpb24gc29ydDxUPihhcnJheTogVFtdLCBjb21wYXJhdG9yOiAobGhzOiBULCByaHM6IFQpID0+IG51bWJlciwgZGVzdHJ1Y3RpdmUgPSBmYWxzZSk6IFRbXSB7XG4gICAgY29uc3Qgc291cmNlID0gZGVzdHJ1Y3RpdmUgPyBhcnJheSA6IGFycmF5LnNsaWNlKCk7XG4gICAgaWYgKHNvdXJjZS5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgfVxuICAgIGNvbnN0IGxocyA9IHNvcnQoc291cmNlLnNwbGljZSgwLCBzb3VyY2UubGVuZ3RoID4+PiAxKSwgY29tcGFyYXRvciwgdHJ1ZSk7XG4gICAgY29uc3QgcmhzID0gc29ydChzb3VyY2Uuc3BsaWNlKDApLCBjb21wYXJhdG9yLCB0cnVlKTtcbiAgICB3aGlsZSAobGhzLmxlbmd0aCAmJiByaHMubGVuZ3RoKSB7XG4gICAgICAgIHNvdXJjZS5wdXNoKGNvbXBhcmF0b3IobGhzWzBdLCByaHNbMF0pIDw9IDAgPyBsaHMuc2hpZnQoKSBhcyBUIDogcmhzLnNoaWZ0KCkgYXMgVCk7XG4gICAgfVxuICAgIHJldHVybiBzb3VyY2UuY29uY2F0KGxocywgcmhzKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1ha2UgdW5pcXVlIGFycmF5LlxuICogQGphIOmHjeikh+imgee0oOOBruOBquOBhOmFjeWIl+OBruS9nOaIkFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmlxdWU8VD4oYXJyYXk6IFRbXSk6IFRbXSB7XG4gICAgcmV0dXJuIFsuLi5uZXcgU2V0KGFycmF5KV07XG59XG5cbi8qKlxuICogQGVuIE1ha2UgdW5pb24gYXJyYXkuXG4gKiBAamEg6YWN5YiX44Gu5ZKM6ZuG5ZCI44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIGFycmF5c1xuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlzXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl+e+pFxuICovXG5leHBvcnQgZnVuY3Rpb24gdW5pb248VD4oLi4uYXJyYXlzOiBUW11bXSk6IFRbXSB7XG4gICAgcmV0dXJuIHVuaXF1ZShhcnJheXMuZmxhdCgpKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEdldCB0aGUgbW9kZWwgYXQgdGhlIGdpdmVuIGluZGV4LiBJZiBuZWdhdGl2ZSB2YWx1ZSBpcyBnaXZlbiwgdGhlIHRhcmdldCB3aWxsIGJlIGZvdW5kIGZyb20gdGhlIGxhc3QgaW5kZXguXG4gKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44Gr44KI44KL44Oi44OH44Or44G444Gu44Ki44Kv44K744K5LiDosqDlgKTjga7loLTlkIjjga/mnKvlsL7mpJzntKLjgpLlrp/ooYxcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgZW5gIEEgemVyby1iYXNlZCBpbnRlZ2VyIGluZGljYXRpbmcgd2hpY2ggZWxlbWVudCB0byByZXRyaWV2ZS4gPGJyPiBJZiBuZWdhdGl2ZSBpbmRleCBpcyBjb3VudGVkIGZyb20gdGhlIGVuZCBvZiB0aGUgbWF0Y2hlZCBzZXQuXG4gKiAgLSBgamFgIDAgYmFzZSDjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrpogPGJyPiDosqDlgKTjgYzmjIflrprjgZXjgozjgZ/loLTlkIgsIOacq+WwvuOBi+OCieOBruOCpOODs+ODh+ODg+OCr+OCueOBqOOBl+OBpuino+mHiOOBleOCjOOCi1xuICovXG5leHBvcnQgZnVuY3Rpb24gYXQ8VD4oYXJyYXk6IFRbXSwgaW5kZXg6IG51bWJlcik6IFQgfCBuZXZlciB7XG4gICAgY29uc3QgaWR4ID0gTWF0aC50cnVuYyhpbmRleCk7XG4gICAgY29uc3QgZWwgPSBpZHggPCAwID8gYXJyYXlbaWR4ICsgYXJyYXkubGVuZ3RoXSA6IGFycmF5W2lkeF07XG4gICAgaWYgKG51bGwgPT0gZWwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYGludmFsaWQgYXJyYXkgaW5kZXguIFtsZW5ndGg6ICR7YXJyYXkubGVuZ3RofSwgZ2l2ZW46ICR7aW5kZXh9XWApO1xuICAgIH1cbiAgICByZXR1cm4gZWw7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNYWtlIGluZGV4IGFycmF5LlxuICogQGphIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl+OBruS9nOaIkFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gZXhjbHVkZXNcbiAqICAtIGBlbmAgZXhjbHVkZSBpbmRleCBpbiByZXR1cm4gdmFsdWUuXG4gKiAgLSBgamFgIOaIu+OCiuWApOmFjeWIl+OBq+WQq+OCgeOBquOBhOOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5kaWNlczxUPihhcnJheTogVFtdLCAuLi5leGNsdWRlczogbnVtYmVyW10pOiBudW1iZXJbXSB7XG4gICAgY29uc3QgcmV0dmFsID0gWy4uLmFycmF5LmtleXMoKV07XG5cbiAgICBjb25zdCBsZW4gPSBhcnJheS5sZW5ndGg7XG4gICAgY29uc3QgZXhMaXN0ID0gWy4uLm5ldyBTZXQoZXhjbHVkZXMpXS5zb3J0KChsaHMsIHJocykgPT4gbGhzIDwgcmhzID8gMSA6IC0xKTtcbiAgICBmb3IgKGNvbnN0IGV4IG9mIGV4TGlzdCkge1xuICAgICAgICBpZiAoMCA8PSBleCAmJiBleCA8IGxlbikge1xuICAgICAgICAgICAgcmV0dmFsLnNwbGljZShleCwgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gW1tncm91cEJ5XV0oKSBvcHRpb25zIGRlZmluaXRpb24uXG4gKiBAamEgW1tncm91cEJ5XV0oKSDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7PlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBHcm91cEJ5T3B0aW9uczxcbiAgICBUIGV4dGVuZHMgb2JqZWN0LFxuICAgIFRLRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUU1VNS0VZUyBleHRlbmRzIGtleW9mIFQsXG4gICAgVEdST1VQS0VZIGV4dGVuZHMgc3RyaW5nXG4+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gYEdST1VQIEJZYCBrZXlzLlxuICAgICAqIEBqYSBgR1JPVVAgQllgIOOBq+aMh+WumuOBmeOCi+OCreODvFxuICAgICAqL1xuICAgIGtleXM6IEV4dHJhY3Q8VEtFWVMsIHN0cmluZz5bXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZ2dyZWdhdGFibGUga2V5cy5cbiAgICAgKiBAamEg6ZuG6KiI5Y+v6IO944Gq44Kt44O85LiA6KanXG4gICAgICovXG4gICAgc3VtS2V5cz86IEV4dHJhY3Q8VFNVTUtFWVMsIHN0cmluZz5bXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBHcm91cGVkIGl0ZW0gYWNjZXNzIGtleS4gZGVmYXVsdDogJ2l0ZW1zJyxcbiAgICAgKiBAamEg44Kw44Or44O844OU44Oz44Kw44GV44KM44Gf6KaB57Sg44G444Gu44Ki44Kv44K744K544Kt44O8LiDml6Llrpo6ICdpdGVtcydcbiAgICAgKi9cbiAgICBncm91cEtleT86IFRHUk9VUEtFWTtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJuIHR5cGUgb2YgW1tncm91cEJ5XV0oKS5cbiAqIEBqYSBbW2dyb3VwQnldXSgpIOOBjOi/lOWNtOOBmeOCi+Wei1xuICovXG5leHBvcnQgdHlwZSBHcm91cEJ5UmV0dXJuVmFsdWU8XG4gICAgVCBleHRlbmRzIG9iamVjdCxcbiAgICBUS0VZUyBleHRlbmRzIGtleW9mIFQsXG4gICAgVFNVTUtFWVMgZXh0ZW5kcyBrZXlvZiBUID0gbmV2ZXIsXG4gICAgVEdST1VQS0VZIGV4dGVuZHMgc3RyaW5nID0gJ2l0ZW1zJ1xuPiA9IFJlYWRvbmx5PFJlY29yZDxUS0VZUywgdW5rbm93bj4gJiBSZWNvcmQ8VFNVTUtFWVMsIHVua25vd24+ICYgUmVjb3JkPFRHUk9VUEtFWSwgVFtdPj47XG5cbi8qKlxuICogQGVuIEV4ZWN1dGUgYEdST1VQIEJZYCBmb3IgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6YWN5YiX44Gu6KaB57Sg44GuIGBHUk9VUCBCWWAg6ZuG5ZCI44KS5oq95Ye6XG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGBHUk9VUCBCWWAgb3B0aW9uc1xuICogIC0gYGphYCBgR1JPVVAgQllgIOOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ3JvdXBCeTxcbiAgICBUIGV4dGVuZHMgb2JqZWN0LFxuICAgIFRLRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUU1VNS0VZUyBleHRlbmRzIGtleW9mIFQgPSBuZXZlcixcbiAgICBUR1JPVVBLRVkgZXh0ZW5kcyBzdHJpbmcgPSAnaXRlbXMnXG4+KGFycmF5OiBUW10sIG9wdGlvbnM6IEdyb3VwQnlPcHRpb25zPFQsIFRLRVlTLCBUU1VNS0VZUywgVEdST1VQS0VZPik6IEdyb3VwQnlSZXR1cm5WYWx1ZTxULCBUS0VZUywgVFNVTUtFWVMsIFRHUk9VUEtFWT5bXSB7XG4gICAgY29uc3QgeyBrZXlzLCBzdW1LZXlzLCBncm91cEtleSB9ID0gb3B0aW9ucztcbiAgICBjb25zdCBfZ3JvdXBLZXkgPSBncm91cEtleSB8fCAnaXRlbXMnO1xuICAgIGNvbnN0IF9zdW1LZXlzOiBzdHJpbmdbXSA9IHN1bUtleXMgfHwgW107XG4gICAgX3N1bUtleXMucHVzaChfZ3JvdXBLZXkpO1xuXG4gICAgY29uc3QgaGFzaCA9IGFycmF5LnJlZHVjZSgocmVzOiBULCBkYXRhOiBUKSA9PiB7XG4gICAgICAgIC8vIGNyZWF0ZSBncm91cEJ5IGludGVybmFsIGtleVxuICAgICAgICBjb25zdCBfa2V5ID0ga2V5cy5yZWR1Y2UoKHMsIGspID0+IHMgKyBTdHJpbmcoZGF0YVtrXSksICcnKTtcblxuICAgICAgICAvLyBpbml0IGtleXNcbiAgICAgICAgaWYgKCEoX2tleSBpbiByZXMpKSB7XG4gICAgICAgICAgICBjb25zdCBrZXlMaXN0ID0ga2V5cy5yZWR1Y2UoKGgsIGs6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIGhba10gPSBkYXRhW2tdO1xuICAgICAgICAgICAgICAgIHJldHVybiBoO1xuICAgICAgICAgICAgfSwge30pO1xuXG4gICAgICAgICAgICByZXNbX2tleV0gPSBfc3VtS2V5cy5yZWR1Y2UoKGgsIGs6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIGhba10gPSAwO1xuICAgICAgICAgICAgICAgIHJldHVybiBoO1xuICAgICAgICAgICAgfSwga2V5TGlzdCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByZXNLZXkgPSByZXNbX2tleV07XG5cbiAgICAgICAgLy8gc3VtIHByb3BlcnRpZXNcbiAgICAgICAgZm9yIChjb25zdCBrIG9mIF9zdW1LZXlzKSB7XG4gICAgICAgICAgICBpZiAoX2dyb3VwS2V5ID09PSBrKSB7XG4gICAgICAgICAgICAgICAgcmVzS2V5W2tdID0gcmVzS2V5W2tdIHx8IFtdO1xuICAgICAgICAgICAgICAgIHJlc0tleVtrXS5wdXNoKGRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNLZXlba10gKz0gZGF0YVtrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfSwge30pO1xuXG4gICAgcmV0dXJuIE9iamVjdC52YWx1ZXMoaGFzaCk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb21wdXRlcyB0aGUgbGlzdCBvZiB2YWx1ZXMgdGhhdCBhcmUgdGhlIGludGVyc2VjdGlvbiBvZiBhbGwgdGhlIGFycmF5cy4gRWFjaCB2YWx1ZSBpbiB0aGUgcmVzdWx0IGlzIHByZXNlbnQgaW4gZWFjaCBvZiB0aGUgYXJyYXlzLlxuICogQGphIOmFjeWIl+OBruepjembhuWQiOOCkui/lOWNtC4g6L+U5Y2044GV44KM44Gf6YWN5YiX44Gu6KaB57Sg44Gv44GZ44G544Gm44Gu5YWl5Yqb44GV44KM44Gf6YWN5YiX44Gr5ZCr44G+44KM44KLXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zb2xlLmxvZyhpbnRlcnNlY3Rpb24oWzEsIDIsIDNdLCBbMTAxLCAyLCAxLCAxMF0sIFsyLCAxXSkpO1xuICogLy8gPT4gWzEsIDJdXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlzXG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGludGVyc2VjdGlvbjxUPiguLi5hcnJheXM6IFRbXVtdKTogVFtdIHtcbiAgICByZXR1cm4gYXJyYXlzLnJlZHVjZSgoYWNjLCBhcnkpID0+IGFjYy5maWx0ZXIoZWwgPT4gYXJ5LmluY2x1ZGVzKGVsKSkpO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIHRoZSB2YWx1ZXMgZnJvbSBhcnJheSB0aGF0IGFyZSBub3QgcHJlc2VudCBpbiB0aGUgb3RoZXIgYXJyYXlzLlxuICogQGphIOmFjeWIl+OBi+OCieOBu+OBi+OBrumFjeWIl+OBq+WQq+OBvuOCjOOBquOBhOOCguOBruOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc29sZS5sb2coZGlmZmVyZW5jZShbMSwgMiwgMywgNCwgNV0sIFs1LCAyLCAxMF0pKTtcbiAqIC8vID0+IFsxLCAzLCA0XVxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBvdGhlcnNcbiAqICAtIGBlbmAgZXhjbHVkZSBlbGVtZW50IGluIHJldHVybiB2YWx1ZS5cbiAqICAtIGBqYWAg5oi744KK5YCk6YWN5YiX44Gr5ZCr44KB44Gq44GE6KaB57Sg44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaWZmZXJlbmNlPFQ+KGFycmF5OiBUW10sIC4uLm90aGVyczogVFtdW10pOiBUW10ge1xuICAgIGNvbnN0IGFycmF5cyA9IFthcnJheSwgLi4ub3RoZXJzXSBhcyBUW11bXTtcbiAgICByZXR1cm4gYXJyYXlzLnJlZHVjZSgoYWNjLCBhcnkpID0+IGFjYy5maWx0ZXIoZWwgPT4gIWFyeS5pbmNsdWRlcyhlbCkpKTtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIGNvcHkgb2YgdGhlIGFycmF5IHdpdGggYWxsIGluc3RhbmNlcyBvZiB0aGUgdmFsdWVzIHJlbW92ZWQuXG4gKiBAamEg6YWN5YiX44GL44KJ5oyH5a6a6KaB57Sg44KS5Y+W44KK6Zmk44GE44Gf44KC44Gu44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zb2xlLmxvZyh3aXRob3V0KFsxLCAyLCAxLCAwLCAzLCAxLCA0XSwgMCwgMSkpO1xuICogLy8gPT4gWzIsIDMsIDRdXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIHZhbHVlc1xuICogIC0gYGVuYCBleGNsdWRlIGVsZW1lbnQgaW4gcmV0dXJuIHZhbHVlLlxuICogIC0gYGphYCDmiLvjgorlgKTphY3liJfjgavlkKvjgoHjgarjgYTopoHntKDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhvdXQ8VD4oYXJyYXk6IFRbXSwgLi4udmFsdWVzOiBUW10pOiBUW10ge1xuICAgIHJldHVybiBkaWZmZXJlbmNlKGFycmF5LCB2YWx1ZXMpO1xufVxuXG4vKipcbiAqIEBlbiBQcm9kdWNlIGEgcmFuZG9tIHNhbXBsZSBmcm9tIHRoZSBsaXN0LlxuICogQGphIOODqeODs+ODgOODoOOBq+OCteODs+ODl+ODq+WApOOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc29sZS5sb2coc2FtcGxlKFsxLCAyLCAzLCA0LCA1LCA2XSwgMykpO1xuICogLy8gPT4gWzEsIDYsIDJdXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNvdW50XG4gKiAgLSBgZW5gIG51bWJlciBvZiBzYW1wbGluZyBjb3VudC5cbiAqICAtIGBqYWAg6L+U5Y2044GZ44KL44K144Oz44OX44Or5pWw44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1wbGU8VD4oYXJyYXk6IFRbXSwgY291bnQ6IG51bWJlcik6IFRbXTtcblxuLyoqXG4gKiBAZW4gUHJvZHVjZSBhIHJhbmRvbSBzYW1wbGUgZnJvbSB0aGUgbGlzdC5cbiAqIEBqYSDjg6njg7Pjg4Djg6DjgavjgrXjg7Pjg5fjg6vlgKTjgpLov5TljbRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnNvbGUubG9nKHNhbXBsZShbMSwgMiwgMywgNCwgNSwgNl0pKTtcbiAqIC8vID0+IDRcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1wbGU8VD4oYXJyYXk6IFRbXSk6IFQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBzYW1wbGU8VD4oYXJyYXk6IFRbXSwgY291bnQ/OiBudW1iZXIpOiBUIHwgVFtdIHtcbiAgICBpZiAobnVsbCA9PSBjb3VudCkge1xuICAgICAgICByZXR1cm4gYXJyYXlbcmFuZG9tSW50KGFycmF5Lmxlbmd0aCAtIDEpXTtcbiAgICB9XG4gICAgY29uc3Qgc2FtcGxlID0gYXJyYXkuc2xpY2UoKTtcbiAgICBjb25zdCBsZW5ndGggPSBzYW1wbGUubGVuZ3RoO1xuICAgIGNvdW50ID0gTWF0aC5tYXgoTWF0aC5taW4oY291bnQsIGxlbmd0aCksIDApO1xuICAgIGNvbnN0IGxhc3QgPSBsZW5ndGggLSAxO1xuICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBjb3VudDsgaW5kZXgrKykge1xuICAgICAgICBjb25zdCByYW5kID0gcmFuZG9tSW50KGluZGV4LCBsYXN0KTtcbiAgICAgICAgY29uc3QgdGVtcCA9IHNhbXBsZVtpbmRleF07XG4gICAgICAgIHNhbXBsZVtpbmRleF0gPSBzYW1wbGVbcmFuZF07XG4gICAgICAgIHNhbXBsZVtyYW5kXSA9IHRlbXA7XG4gICAgfVxuICAgIHJldHVybiBzYW1wbGUuc2xpY2UoMCwgY291bnQpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIHJlc3VsdCBvZiBwZXJtdXRhdGlvbiBmcm9tIHRoZSBsaXN0LlxuICogQGphIOmFjeWIl+OBi+OCiemghuWIl+e1kOaenOOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgYXJyID0gcGVybXV0YXRpb24oWydhJywgJ2InLCAnYyddLCAyKTtcbiAqIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFycikpO1xuICogLy8gPT4gW1snYScsJ2InXSxbJ2EnLCdjJ10sWydiJywnYSddLFsnYicsJ2MnXSxbJ2MnLCdhJ10sWydjJywnYiddXVxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjb3VudFxuICogIC0gYGVuYCBudW1iZXIgb2YgcGljayB1cC5cbiAqICAtIGBqYWAg6YG45oqe5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJtdXRhdGlvbjxUPihhcnJheTogVFtdLCBjb3VudDogbnVtYmVyKTogVFtdW10ge1xuICAgIGNvbnN0IHJldHZhbDogVFtdW10gPSBbXTtcbiAgICBpZiAoYXJyYXkubGVuZ3RoIDwgY291bnQpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBpZiAoMSA9PT0gY291bnQpIHtcbiAgICAgICAgZm9yIChjb25zdCBbaSwgdmFsXSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIHJldHZhbFtpXSA9IFt2YWxdO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIG4xID0gYXJyYXkubGVuZ3RoOyBpIDwgbjE7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgcGFydHMgPSBhcnJheS5zbGljZSgwKTtcbiAgICAgICAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IHBlcm11dGF0aW9uKHBhcnRzLCBjb3VudCAtIDEpO1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDAsIG4yID0gcm93Lmxlbmd0aDsgaiA8IG4yOyBqKyspIHtcbiAgICAgICAgICAgICAgICByZXR2YWwucHVzaChbYXJyYXlbaV1dLmNvbmNhdChyb3dbal0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgcmVzdWx0IG9mIGNvbWJpbmF0aW9uIGZyb20gdGhlIGxpc3QuXG4gKiBAamEg6YWN5YiX44GL44KJ57WE44G/5ZCI44KP44Gb57WQ5p6c44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBhcnIgPSBjb21iaW5hdGlvbihbJ2EnLCAnYicsICdjJ10sIDIpO1xuICogY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYXJyKSk7XG4gKiAvLyA9PiBbWydhJywnYiddLFsnYScsJ2MnXSxbJ2InLCdjJ11dXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNvdW50XG4gKiAgLSBgZW5gIG51bWJlciBvZiBwaWNrIHVwLlxuICogIC0gYGphYCDpgbjmip7mlbBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmF0aW9uPFQ+KGFycmF5OiBUW10sIGNvdW50OiBudW1iZXIpOiBUW11bXSB7XG4gICAgY29uc3QgcmV0dmFsOiBUW11bXSA9IFtdO1xuICAgIGlmIChhcnJheS5sZW5ndGggPCBjb3VudCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGlmICgxID09PSBjb3VudCkge1xuICAgICAgICBmb3IgKGNvbnN0IFtpLCB2YWxdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICAgICAgcmV0dmFsW2ldID0gW3ZhbF07XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbjEgPSBhcnJheS5sZW5ndGg7IGkgPCBuMSAtIGNvdW50ICsgMTsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBjb21iaW5hdGlvbihhcnJheS5zbGljZShpICsgMSksIGNvdW50IC0gMSk7XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMCwgbjIgPSByb3cubGVuZ3RoOyBqIDwgbjI7IGorKykge1xuICAgICAgICAgICAgICAgIHJldHZhbC5wdXNoKFthcnJheVtpXV0uY29uY2F0KHJvd1tqXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUubWFwKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUubWFwKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICogXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50ICpBcnJheSogYXMgdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+e1kOaenOmFjeWIl+OCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFwPFQsIFU+KHRoaXM6IHVua25vd24sIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUgfCBQcm9taXNlPFU+LCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8VVtdPiB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFxuICAgICAgICBhcnJheS5tYXAoYXN5bmMgKHYsIGksIGEpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdiwgaSwgYSk7XG4gICAgICAgIH0pXG4gICAgKTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLmZpbHRlcigpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLmZpbHRlcigpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50ICpBcnJheSogYXMgdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+e1kOaenOmFjeWIl+OCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmlsdGVyPFQ+KHRoaXM6IHVua25vd24sIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IGJvb2xlYW4gfCBQcm9taXNlPGJvb2xlYW4+LCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8VFtdPiB7XG4gICAgY29uc3QgYml0czogYm9vbGVhbltdID0gYXdhaXQgbWFwKGFycmF5LCAodiwgaSwgYSkgPT4gY2FsbGJhY2suY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHYsIGksIGEpKTtcbiAgICByZXR1cm4gYXJyYXkuZmlsdGVyKCgpID0+IGJpdHMuc2hpZnQoKSk7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5maW5kKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZmluZCgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50IHZhbHVlLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PntZDmnpzjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbmQ8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxUIHwgdW5kZWZpbmVkPiB7XG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmIChhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdiwgaSwgYXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gdjtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuZmluZEluZGV4KClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZmluZEluZGV4KClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgaW5kZXggdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCueOCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZEluZGV4PFQ+KHRoaXM6IHVua25vd24sIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IGJvb2xlYW4gfCBQcm9taXNlPGJvb2xlYW4+LCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmIChhd2FpdCBjYWxsYmFjay5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdiwgaSwgYXJyYXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5zb21lKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuc29tZSgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50IGJvb2xlYW4gdmFsdWUuXG4gKiAgLSBgamFgIOecn+WBveWApOOCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc29tZTxUPih0aGlzOiB1bmtub3duLCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiB1bmtub3duIHwgUHJvbWlzZTx1bmtub3duPiwgdGhpc0FyZz86IHVua25vd24pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLmV2ZXJ5KClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZXZlcnkoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIHRoaXNBcmdcbiAqICAtIGBlbmAgVmFsdWUgdG8gdXNlIGFzICp0aGlzKiB3aGVuIGV4ZWN1dGluZyB0aGUgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDlrp/ooYzjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCBib29sZWFuIHZhbHVlLlxuICogIC0gYGphYCDnnJ/lgb3lgKTjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV2ZXJ5PFQ+KHRoaXM6IHVua25vd24sIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+LCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGZvciAoY29uc3QgW2ksIHZdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoIWF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLnJlZHVjZSgpYCB3aGljaCBhbHNvIGFjY2VwdHMgYXN5bmNocm9ub3VzIGNhbGxiYWNrLlxuICogQGphIOmdnuWQjOacn+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumuWPr+iDveOBqiBgQXJyYXkucHJvdG90eXBlLnJlZHVjZSgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gaW5pdGlhbFZhbHVlXG4gKiAgLSBgZW5gIFVzZWQgYXMgZmlyc3QgYXJndW1lbnQgdG8gdGhlIGZpcnN0IGNhbGwgb2YgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDjgavmuKHjgZXjgozjgovliJ3mnJ/lgKRcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCAqQXJyYXkqIGFzIHZhbHVlLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PntZDmnpzphY3liJfjgpLmoLzntI3jgZfjgZ8gUHJvbWlzZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlZHVjZTxULCBVPihcbiAgICBhcnJheTogVFtdLFxuICAgIGNhbGxiYWNrOiAoYWNjdW11bGF0b3I6IFUsIGN1cnJlbnRWYWx1ZTogVCwgY3VycmVudEluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUgfCBQcm9taXNlPFU+LFxuICAgIGluaXRpYWxWYWx1ZT86IFVcbik6IFByb21pc2U8VT4ge1xuICAgIGlmIChhcnJheS5sZW5ndGggPD0gMCAmJiB1bmRlZmluZWQgPT09IGluaXRpYWxWYWx1ZSkge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1JlZHVjZSBvZiBlbXB0eSBhcnJheSB3aXRoIG5vIGluaXRpYWwgdmFsdWUnKTtcbiAgICB9XG5cbiAgICBjb25zdCBoYXNJbml0ID0gKHVuZGVmaW5lZCAhPT0gaW5pdGlhbFZhbHVlKTtcbiAgICBsZXQgYWNjID0gKGhhc0luaXQgPyBpbml0aWFsVmFsdWUgOiBhcnJheVswXSkgYXMgVTtcblxuICAgIGZvciAoY29uc3QgW2ksIHZdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoISghaGFzSW5pdCAmJiAwID09PSBpKSkge1xuICAgICAgICAgICAgYWNjID0gYXdhaXQgY2FsbGJhY2soYWNjLCB2LCBpLCBhcnJheSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYWNjO1xufVxuIiwiLyoqXG4gKiBAZW4gRGF0ZSB1bml0IGRlZmluaXRpb25zLlxuICogQGphIOaXpeaZguOCquODluOCuOOCp+OCr+ODiOOBruWNmOS9jeWumue+qVxuICovXG5leHBvcnQgdHlwZSBEYXRlVW5pdCA9ICd5ZWFyJyB8ICdtb250aCcgfCAnZGF5JyB8ICdob3VyJyB8ICdtaW4nIHwgJ3NlYycgfCAnbXNlYyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9jb21wdXRlRGF0ZUZ1bmNNYXAgPSB7XG4gICAgeWVhcjogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDRnVsbFllYXIoYmFzZS5nZXRVVENGdWxsWWVhcigpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbiAgICBtb250aDogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDTW9udGgoYmFzZS5nZXRVVENNb250aCgpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbiAgICBkYXk6IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ0RhdGUoYmFzZS5nZXRVVENEYXRlKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIGhvdXI6IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ0hvdXJzKGJhc2UuZ2V0VVRDSG91cnMoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG4gICAgbWluOiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENNaW51dGVzKGJhc2UuZ2V0VVRDTWludXRlcygpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbiAgICBzZWM6IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ1NlY29uZHMoYmFzZS5nZXRVVENTZWNvbmRzKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIG1zZWM6IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ01pbGxpc2Vjb25kcyhiYXNlLmdldFVUQ01pbGxpc2Vjb25kcygpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQGVuIENhbGN1bGF0ZSBmcm9tIHRoZSBkYXRlIHdoaWNoIGJlY29tZXMgYSBjYXJkaW5hbCBwb2ludCBiZWZvcmUgYSBOIGRhdGUgdGltZSBvciBhZnRlciBhIE4gZGF0ZSB0aW1lIChieSBbW0RhdGVVbml0XV0pLlxuICogQGphIOWfuueCueOBqOOBquOCi+aXpeS7mOOBi+OCieOAgU7ml6XlvozjgIFO5pel5YmN44KS566X5Ye6XG4gKlxuICogQHBhcmFtIGJhc2VcbiAqICAtIGBlbmAgYmFzZSBkYXRlIHRpbWUuXG4gKiAgLSBgamFgIOWfuua6luaXpVxuICogQHBhcmFtIGFkZFxuICogIC0gYGVuYCByZWxhdGl2ZSBkYXRlIHRpbWUuXG4gKiAgLSBgamFgIOWKoOeul+aXpS4g44Oe44Kk44OK44K55oyH5a6a44GnbuaXpeWJjeOCguioreWumuWPr+iDvVxuICogQHBhcmFtIHVuaXQgW1tEYXRlVW5pdF1dXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlRGF0ZShiYXNlOiBEYXRlLCBhZGQ6IG51bWJlciwgdW5pdDogRGF0ZVVuaXQgPSAnZGF5Jyk6IERhdGUge1xuICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShiYXNlLmdldFRpbWUoKSk7XG4gICAgY29uc3QgZnVuYyA9IF9jb21wdXRlRGF0ZUZ1bmNNYXBbdW5pdF07XG4gICAgaWYgKGZ1bmMpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMoZGF0ZSwgYmFzZSwgYWRkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBpbnZhbGlkIHVuaXQ6ICR7dW5pdH1gKTtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBBcmd1bWVudHMsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBpc1N5bWJvbCxcbiAgICBjbGFzc05hbWUsXG4gICAgdmVyaWZ5LFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFdmVudEFsbCxcbiAgICBTdWJzY3JpcHRpb24sXG4gICAgU3Vic2NyaWJhYmxlLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIExpc25lciDmoLzntI3lvaLlvI8gKi9cbnR5cGUgTGlzdGVuZXJzTWFwPFQ+ID0gTWFwPGtleW9mIFQsIFNldDwoLi4uYXJnczogVFtrZXlvZiBUXVtdKSA9PiB1bmtub3duPj47XG5cbi8qKiBAaW50ZXJuYWwgTGlzbmVyIOOBruW8seWPgueFpyAqL1xuY29uc3QgX21hcExpc3RlbmVycyA9IG5ldyBXZWFrTWFwPEV2ZW50UHVibGlzaGVyPGFueT4sIExpc3RlbmVyc01hcDxhbnk+PigpO1xuXG4vKiogQGludGVybmFsIExpc25lck1hcCDjga7lj5blvpcgKi9cbmZ1bmN0aW9uIGxpc3RlbmVyczxUIGV4dGVuZHMgb2JqZWN0PihpbnN0YW5jZTogRXZlbnRQdWJsaXNoZXI8VD4pOiBMaXN0ZW5lcnNNYXA8VD4ge1xuICAgIGlmICghX21hcExpc3RlbmVycy5oYXMoaW5zdGFuY2UpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoaXMgaXMgbm90IGEgdmFsaWQgRXZlbnRQdWJsaXNoZXIuJyk7XG4gICAgfVxuICAgIHJldHVybiBfbWFwTGlzdGVuZXJzLmdldChpbnN0YW5jZSkgYXMgTGlzdGVuZXJzTWFwPFQ+O1xufVxuXG4vKiogQGludGVybmFsIENoYW5uZWwg44Gu5Z6L5qSc6Ki8ICovXG5mdW5jdGlvbiB2YWxpZENoYW5uZWwoY2hhbm5lbDogdW5rbm93bik6IHZvaWQgfCBuZXZlciB7XG4gICAgaWYgKGlzU3RyaW5nKGNoYW5uZWwpIHx8IGlzU3ltYm9sKGNoYW5uZWwpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVHlwZSBvZiAke2NsYXNzTmFtZShjaGFubmVsKX0gaXMgbm90IGEgdmFsaWQgY2hhbm5lbC5gKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBMaXN0ZW5lciDjga7lnovmpJzoqLwgKi9cbmZ1bmN0aW9uIHZhbGlkTGlzdGVuZXIobGlzdGVuZXI/OiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB1bmtub3duKTogYW55IHwgbmV2ZXIge1xuICAgIGlmIChudWxsICE9IGxpc3RlbmVyKSB7XG4gICAgICAgIHZlcmlmeSgndHlwZU9mJywgJ2Z1bmN0aW9uJywgbGlzdGVuZXIpO1xuICAgIH1cbiAgICByZXR1cm4gbGlzdGVuZXI7XG59XG5cbi8qKiBAaW50ZXJuYWwgZXZlbnQg55m66KGMICovXG5mdW5jdGlvbiB0cmlnZ2VyRXZlbnQ8RXZlbnQsIENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oXG4gICAgbWFwOiBMaXN0ZW5lcnNNYXA8RXZlbnQ+LFxuICAgIGNoYW5uZWw6IENoYW5uZWwsXG4gICAgb3JpZ2luYWw6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICAuLi5hcmdzOiBBcmd1bWVudHM8UGFydGlhbDxFdmVudFtDaGFubmVsXT4+XG4pOiB2b2lkIHtcbiAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaGFubmVsKTtcbiAgICBpZiAoIWxpc3QpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGxpc3RlbmVyIG9mIGxpc3QpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50QXJncyA9IG9yaWdpbmFsID8gW29yaWdpbmFsLCAuLi5hcmdzXSA6IGFyZ3M7XG4gICAgICAgICAgICBjb25zdCBoYW5kbGVkID0gbGlzdGVuZXIoLi4uZXZlbnRBcmdzKTtcbiAgICAgICAgICAgIC8vIGlmIHJlY2VpdmVkICd0cnVlJywgc3RvcCBkZWxlZ2F0aW9uLlxuICAgICAgICAgICAgaWYgKHRydWUgPT09IGhhbmRsZWQpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdm9pZCBQcm9taXNlLnJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEV2ZW50aW5nIGZyYW1ld29yayBjbGFzcyB3aXRoIGVuc3VyaW5nIHR5cGUtc2FmZSBmb3IgVHlwZVNjcmlwdC4gPGJyPlxuICogICAgIFRoZSBjbGllbnQgb2YgdGhpcyBjbGFzcyBjYW4gaW1wbGVtZW50IG9yaWdpbmFsIFB1Yi1TdWIgKE9ic2VydmVyKSBkZXNpZ24gcGF0dGVybi5cbiAqIEBqYSDlnovlronlhajjgpLkv53pmpzjgZnjgovjgqTjg5njg7Pjg4jnmbvpjLLjg7vnmbrooYzjgq/jg6njgrkgPGJyPlxuICogICAgIOOCr+ODqeOCpOOCouODs+ODiOOBr+acrOOCr+ODqeOCueOCkua0vueUn+OBl+OBpueLrOiHquOBriBQdWItU3ViIChPYnNlcnZlcikg44OR44K/44O844Oz44KS5a6f6KOF5Y+v6IO9XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbiAqXG4gKiAvLyBkZWNsYXJlIGV2ZW50IGludGVyZmFjZVxuICogaW50ZXJmYWNlIFNhbXBsZUV2ZW50IHtcbiAqICAgaG9nZTogW251bWJlciwgc3RyaW5nXTsgICAgICAgIC8vIGNhbGxiYWNrIGZ1bmN0aW9uJ3MgYXJncyB0eXBlIHR1cGxlXG4gKiAgIGZvbzogW3ZvaWRdOyAgICAgICAgICAgICAgICAgICAvLyBubyBhcmdzXG4gKiAgIGhvbzogdm9pZDsgICAgICAgICAgICAgICAgICAgICAvLyBubyBhcmdzIChzYW1lIHRoZSB1cG9uKVxuICogICBiYXI6IFtFcnJvcl07ICAgICAgICAgICAgICAgICAgLy8gYW55IGNsYXNzIGlzIGF2YWlsYWJsZS5cbiAqICAgYmF6OiBFcnJvciB8IE51bWJlcjsgICAgICAgICAgIC8vIGlmIG9ubHkgb25lIGFyZ3VtZW50LCBgW11gIGlzIG5vdCByZXF1aXJlZC5cbiAqIH1cbiAqXG4gKiAvLyBkZWNsYXJlIGNsaWVudCBjbGFzc1xuICogY2xhc3MgU2FtcGxlUHVibGlzaGVyIGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8U2FtcGxlRXZlbnQ+IHtcbiAqICAgOlxuICogICBzb21lTWV0aG9kKCk6IHZvaWQge1xuICogICAgIHRoaXMucHVibGlzaCgnaG9nZScsIDEwMCwgJ3Rlc3QnKTsgICAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogICAgIHRoaXMucHVibGlzaCgnaG9nZScsIDEwMCwgdHJ1ZSk7ICAgICAgICAgLy8gTkcuIGFyZ3VtZW50IG9mIHR5cGUgJ3RydWUnIGlzIG5vdCBhc3NpZ25hYmxlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdG8gcGFyYW1ldGVyIG9mIHR5cGUgJ3N0cmluZyB8IHVuZGVmaW5lZCcuXG4gKiAgICAgdGhpcy5wdWJsaXNoKCdob2dlJywgMTAwKTsgICAgICAgICAgICAgICAvLyBPSy4gYWxsIGFyZ3MgdG8gYmUgb3B0aW9uYWwgYXV0b21hdGljYWxseS5cbiAqICAgICB0aGlzLnB1Ymxpc2goJ2ZvbycpOyAgICAgICAgICAgICAgICAgICAgIC8vIE9LLiBzdGFuZGFyZCB1c2FnZS5cbiAqICAgICB0aGlzLnB1Ymxpc2goJ2ZvbycsIDEwMCk7ICAgICAgICAgICAgICAgIC8vIE5HLiBhcmd1bWVudCBvZiB0eXBlICcxMDAnIGlzIG5vdCBhc3NpZ25hYmxlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdG8gcGFyYW1ldGVyIG9mIHR5cGUgJ3ZvaWQgfCB1bmRlZmluZWQnLlxuICogICB9XG4gKiB9XG4gKlxuICogY29uc3Qgc2FtcGxlID0gbmV3IFNhbXBsZVB1Ymxpc2hlcigpO1xuICpcbiAqIHNhbXBsZS5vbignaG9nZScsIChhOiBudW1iZXIsIGI6IHN0cmluZykgPT4geyAuLi4gfSk7ICAgIC8vIE9LLiBzdGFuZGFyZCB1c2FnZS5cbiAqIHNhbXBsZS5vbignaG9nZScsIChhOiBudW1iZXIsIGI6IGJvb2xlYW4pID0+IHsgLi4uIH0pOyAgIC8vIE5HLiB0eXBlcyBvZiBwYXJhbWV0ZXJzICdiJ1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIGFuZCAnYXJnc18xJyBhcmUgaW5jb21wYXRpYmxlLlxuICogc2FtcGxlLm9uKCdob2dlJywgKGEpID0+IHsgLi4uIH0pOyAgICAgICAgICAgICAgICAgICAgICAgLy8gT0suIGFsbCBhcmdzXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdG8gYmUgb3B0aW9uYWwgYXV0b21hdGljYWxseS5cbiAqIHNhbXBsZS5vbignaG9nZScsIChhLCBiLCBjKSA9PiB7IC4uLiB9KTsgICAgICAgICAgICAgICAgIC8vIE5HLiBleHBlY3RlZCAxLTIgYXJndW1lbnRzLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIGJ1dCBnb3QgMy5cbiAqIGBgYFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRXZlbnRQdWJsaXNoZXI8RXZlbnQgZXh0ZW5kcyBvYmplY3Q+IGltcGxlbWVudHMgU3Vic2NyaWJhYmxlPEV2ZW50PiB7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdmVyaWZ5KCdpbnN0YW5jZU9mJywgRXZlbnRQdWJsaXNoZXIsIHRoaXMpO1xuICAgICAgICBfbWFwTGlzdGVuZXJzLnNldCh0aGlzLCBuZXcgTWFwKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBOb3RpZnkgZXZlbnQgdG8gY2xpZW50cy5cbiAgICAgKiBAamEgZXZlbnQg55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgYXJndW1lbnRzIGZvciBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWw44Gr5rih44GZ5byV5pWwXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHB1Ymxpc2g8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsLCAuLi5hcmdzOiBBcmd1bWVudHM8UGFydGlhbDxFdmVudFtDaGFubmVsXT4+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVycyh0aGlzKTtcbiAgICAgICAgdmFsaWRDaGFubmVsKGNoYW5uZWwpO1xuICAgICAgICB0cmlnZ2VyRXZlbnQobWFwLCBjaGFubmVsLCB1bmRlZmluZWQsIC4uLmFyZ3MpO1xuICAgICAgICAvLyB0cmlnZ2VyIGZvciBhbGwgaGFuZGxlclxuICAgICAgICBpZiAoJyonICE9PSBjaGFubmVsKSB7XG4gICAgICAgICAgICB0cmlnZ2VyRXZlbnQobWFwIGFzIHVua25vd24gYXMgTGlzdGVuZXJzTWFwPEV2ZW50QWxsPiwgJyonLCBjaGFubmVsIGFzIHN0cmluZywgLi4uYXJncyk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBTdWJzY3JpYmFibGU8RXZlbnQ+XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgd2hldGhlciB0aGlzIG9iamVjdCBoYXMgY2xpZW50cy5cbiAgICAgKiBAamEg44Kv44Op44Kk44Ki44Oz44OI44GM5a2Y5Zyo44GZ44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBoYXNMaXN0ZW5lcjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw/OiBDaGFubmVsLCBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVycyh0aGlzKTtcbiAgICAgICAgaWYgKG51bGwgPT0gY2hhbm5lbCkge1xuICAgICAgICAgICAgcmV0dXJuIG1hcC5zaXplID4gMDtcbiAgICAgICAgfVxuICAgICAgICB2YWxpZENoYW5uZWwoY2hhbm5lbCk7XG4gICAgICAgIGlmIChudWxsID09IGxpc3RlbmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFwLmhhcyhjaGFubmVsKTtcbiAgICAgICAgfVxuICAgICAgICB2YWxpZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2hhbm5lbCk7XG4gICAgICAgIHJldHVybiBsaXN0ID8gbGlzdC5oYXMobGlzdGVuZXIpIDogZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgcmVnaXN0ZXJlZCBjaGFubmVsIGtleXMuXG4gICAgICogQGphIOeZu+mMsuOBleOCjOOBpuOBhOOCi+ODgeODo+ODjeODq+OCreODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNoYW5uZWxzKCk6IChrZXlvZiBFdmVudClbXSB7XG4gICAgICAgIHJldHVybiBbLi4ubGlzdGVuZXJzKHRoaXMpLmtleXMoKV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb248Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lcnModGhpcyk7XG4gICAgICAgIHZhbGlkTGlzdGVuZXIobGlzdGVuZXIpO1xuXG4gICAgICAgIGNvbnN0IGNoYW5uZWxzID0gaXNBcnJheShjaGFubmVsKSA/IGNoYW5uZWwgOiBbY2hhbm5lbF07XG4gICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgIHZhbGlkQ2hhbm5lbChjaCk7XG4gICAgICAgICAgICBtYXAuaGFzKGNoKSA/IG1hcC5nZXQoY2gpIS5hZGQobGlzdGVuZXIpIDogbWFwLnNldChjaCwgbmV3IFNldChbbGlzdGVuZXJdKSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5mcmVlemUoe1xuICAgICAgICAgICAgZ2V0IGVuYWJsZSgpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFsaXN0IHx8ICFsaXN0LmhhcyhsaXN0ZW5lcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1bnN1YnNjcmliZSgpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3QuZGVsZXRlKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3Quc2l6ZSA+IDAgfHwgbWFwLmRlbGV0ZShjaCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpIGJ1dCBpdCBjYXVzZXMgdGhlIGJvdW5kIGNhbGxiYWNrIHRvIG9ubHkgZmlyZSBvbmNlIGJlZm9yZSBiZWluZyByZW1vdmVkLlxuICAgICAqIEBqYSDkuIDluqbjgaDjgZHjg4/jg7Pjg4njg6rjg7PjgrDlj6/og73jgarjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbmNlPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMub24oY2hhbm5lbCwgbGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBtYW5hZ2VkID0gdGhpcy5vbihjaGFubmVsLCAoKSA9PiB7XG4gICAgICAgICAgICBjb250ZXh0LnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICBtYW5hZ2VkLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29udGV4dDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm6Kej6ZmkXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvZmY8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsPzogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IHRoaXMge1xuICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lcnModGhpcyk7XG4gICAgICAgIGlmIChudWxsID09IGNoYW5uZWwpIHtcbiAgICAgICAgICAgIG1hcC5jbGVhcigpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjaGFubmVscyA9IGlzQXJyYXkoY2hhbm5lbCkgPyBjaGFubmVsIDogW2NoYW5uZWxdO1xuICAgICAgICBjb25zdCBjYWxsYmFjayA9IHZhbGlkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgICAgICB2YWxpZENoYW5uZWwoY2gpO1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBtYXAuZGVsZXRlKGNoKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2gpO1xuICAgICAgICAgICAgICAgIGlmIChsaXN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3QuZGVsZXRlKGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgbGlzdC5zaXplID4gMCB8fCBtYXAuZGVsZXRlKGNoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHsgQXJndW1lbnRzIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmliYWJsZSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBFdmVudFB1Ymxpc2hlciB9IGZyb20gJy4vcHVibGlzaGVyJztcblxuLyoqIHJlLWV4cG9ydCAqL1xuZXhwb3J0IHR5cGUgRXZlbnRBcmd1bWVudHM8VD4gPSBBcmd1bWVudHM8VD47XG5cbi8qKlxuICogQGVuIEV2ZW50aW5nIGZyYW1ld29yayBvYmplY3QgYWJsZSB0byBjYWxsIGBwdWJsaXNoKClgIG1ldGhvZCBmcm9tIG91dHNpZGUuXG4gKiBAamEg5aSW6YOo44GL44KJ44GuIGBwdWJsaXNoKClgIOOCkuWPr+iDveOBq+OBl+OBn+OCpOODmeODs+ODiOeZu+mMsuODu+eZuuihjOOCr+ODqeOCuVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG4gKlxuICogLy8gZGVjbGFyZSBldmVudCBpbnRlcmZhY2VcbiAqIGludGVyZmFjZSBTYW1wbGVFdmVudCB7XG4gKiAgIGhvZ2U6IFtudW1iZXIsIHN0cmluZ107ICAgICAgICAvLyBjYWxsYmFjayBmdW5jdGlvbidzIGFyZ3MgdHlwZSB0dXBsZVxuICogfVxuICpcbiAqIGNvbnN0IGJyb2tlciA9IG5ldyBFdmVudEJyb2tlcjxTYW1wbGVFdmVudD4oKTtcbiAqIGJyb2tlci50cmlnZ2VyKCdob2dlJywgMTAwLCAndGVzdCcpOyAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogYnJva2VyLnRyaWdnZXIoJ2hvZ2UnLCAxMDAsIHRydWUpOyAgICAgICAvLyBORy4gYXJndW1lbnQgb2YgdHlwZSAndHJ1ZScgaXMgbm90IGFzc2lnbmFibGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIHRvIHBhcmFtZXRlciBvZiB0eXBlICdzdHJpbmcgfCB1bmRlZmluZWQnLlxuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRCcm9rZXI8RXZlbnQgZXh0ZW5kcyBvYmplY3Q+IGV4dGVuZHMgU3Vic2NyaWJhYmxlPEV2ZW50PiB7XG4gICAgLyoqXG4gICAgICogQGVuIE5vdGlmeSBldmVudCB0byBjbGllbnRzLlxuICAgICAqIEBqYSBldmVudCDnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgavmuKHjgZnlvJXmlbBcbiAgICAgKi9cbiAgICB0cmlnZ2VyPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCwgLi4uYXJnczogQXJndW1lbnRzPFBhcnRpYWw8RXZlbnRbQ2hhbm5lbF0+Pik6IHZvaWQ7XG59XG5cbi8qKlxuICogQGVuIENvbnN0cnVjdG9yIG9mIFtbRXZlbnRCcm9rZXJdXVxuICogQGphIFtbRXZlbnRCcm9rZXJdXSDjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/lrp/kvZNcbiAqL1xuZXhwb3J0IGNvbnN0IEV2ZW50QnJva2VyOiB7XG4gICAgcmVhZG9ubHkgcHJvdG90eXBlOiBFdmVudEJyb2tlcjxhbnk+O1xuICAgIG5ldyA8VCBleHRlbmRzIG9iamVjdD4oKTogRXZlbnRCcm9rZXI8VD47XG59ID0gRXZlbnRQdWJsaXNoZXIgYXMgYW55O1xuXG5FdmVudEJyb2tlci5wcm90b3R5cGUudHJpZ2dlciA9IChFdmVudFB1Ymxpc2hlci5wcm90b3R5cGUgYXMgYW55KS5wdWJsaXNoO1xuIiwiaW1wb3J0IHtcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgQXJndW1lbnRzLFxuICAgIGlzQXJyYXksXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIFN1YnNjcmliYWJsZSxcbiAgICBTdWJzY3JpcHRpb24sXG4gICAgRXZlbnRTY2hlbWEsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NvbnRleHQgPSBTeW1ib2woJ2NvbnRleHQnKTtcbi8qKiBAaW50ZXJuYWwgKi8gdHlwZSBTdWJzY3JpcHRpb25NYXAgPSBNYXA8VW5rbm93bkZ1bmN0aW9uLCBTdWJzY3JpcHRpb24+O1xuLyoqIEBpbnRlcm5hbCAqLyB0eXBlIExpc3Rlck1hcCAgICAgICA9IE1hcDxzdHJpbmcsIFN1YnNjcmlwdGlvbk1hcD47XG4vKiogQGludGVybmFsICovIHR5cGUgU3Vic2NyaXB0aW9uU2V0ID0gU2V0PFN1YnNjcmlwdGlvbj47XG4vKiogQGludGVybmFsICovIHR5cGUgU3Vic2NyaWJhYmxlTWFwID0gV2Vha01hcDxTdWJzY3JpYmFibGUsIExpc3Rlck1hcD47XG5cbi8qKiBAaW50ZXJuYWwgTGlzbmVyIOagvOe0jeW9ouW8jyAqL1xuaW50ZXJmYWNlIENvbnRleHQge1xuICAgIG1hcDogU3Vic2NyaWJhYmxlTWFwO1xuICAgIHNldDogU3Vic2NyaXB0aW9uU2V0O1xufVxuXG4vKiogQGludGVybmFsIHJlZ2lzdGVyIGxpc3RlbmVyIGNvbnRleHQgKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyKGNvbnRleHQ6IENvbnRleHQsIHRhcmdldDogU3Vic2NyaWJhYmxlLCBjaGFubmVsOiBzdHJpbmcgfCBzdHJpbmdbXSwgbGlzdGVuZXI6IFVua25vd25GdW5jdGlvbik6IFN1YnNjcmlwdGlvbiB7XG4gICAgY29uc3Qgc3Vic2NyaXB0aW9uczogU3Vic2NyaXB0aW9uW10gPSBbXTtcblxuICAgIGNvbnN0IGNoYW5uZWxzID0gaXNBcnJheShjaGFubmVsKSA/IGNoYW5uZWwgOiBbY2hhbm5lbF07XG4gICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICBjb25zdCBzID0gdGFyZ2V0Lm9uKGNoLCBsaXN0ZW5lcik7XG4gICAgICAgIGNvbnRleHQuc2V0LmFkZChzKTtcbiAgICAgICAgc3Vic2NyaXB0aW9ucy5wdXNoKHMpO1xuXG4gICAgICAgIGNvbnN0IGxpc3RlbmVyTWFwID0gY29udGV4dC5tYXAuZ2V0KHRhcmdldCkgfHwgbmV3IE1hcDxzdHJpbmcsIE1hcDxVbmtub3duRnVuY3Rpb24sIFN1YnNjcmlwdGlvbj4+KCk7XG4gICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVyTWFwLmdldChjaCkgfHwgbmV3IE1hcDxVbmtub3duRnVuY3Rpb24sIFN1YnNjcmlwdGlvbj4oKTtcbiAgICAgICAgbWFwLnNldChsaXN0ZW5lciwgcyk7XG5cbiAgICAgICAgaWYgKCFsaXN0ZW5lck1hcC5oYXMoY2gpKSB7XG4gICAgICAgICAgICBsaXN0ZW5lck1hcC5zZXQoY2gsIG1hcCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjb250ZXh0Lm1hcC5oYXModGFyZ2V0KSkge1xuICAgICAgICAgICAgY29udGV4dC5tYXAuc2V0KHRhcmdldCwgbGlzdGVuZXJNYXApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIE9iamVjdC5mcmVlemUoe1xuICAgICAgICBnZXQgZW5hYmxlKCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIHN1YnNjcmlwdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBpZiAocy5lbmFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuICAgICAgICB1bnN1YnNjcmliZSgpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBzdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH0pO1xufVxuXG4vKiogQGludGVybmFsIHVucmVnaXN0ZXIgbGlzdGVuZXIgY29udGV4dCAqL1xuZnVuY3Rpb24gdW5yZWdpc3Rlcihjb250ZXh0OiBDb250ZXh0LCB0YXJnZXQ/OiBTdWJzY3JpYmFibGUsIGNoYW5uZWw/OiBzdHJpbmcgfCBzdHJpbmdbXSwgbGlzdGVuZXI/OiBVbmtub3duRnVuY3Rpb24pOiB2b2lkIHtcbiAgICBpZiAobnVsbCAhPSB0YXJnZXQpIHtcbiAgICAgICAgdGFyZ2V0Lm9mZihjaGFubmVsLCBsaXN0ZW5lcik7XG5cbiAgICAgICAgY29uc3QgbGlzdGVuZXJNYXAgPSBjb250ZXh0Lm1hcC5nZXQodGFyZ2V0KTtcbiAgICAgICAgaWYgKCFsaXN0ZW5lck1hcCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudWxsICE9IGNoYW5uZWwpIHtcbiAgICAgICAgICAgIGNvbnN0IGNoYW5uZWxzID0gaXNBcnJheShjaGFubmVsKSA/IGNoYW5uZWwgOiBbY2hhbm5lbF07XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJNYXAuZ2V0KGNoKTtcbiAgICAgICAgICAgICAgICBpZiAoIW1hcCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gbWFwLmdldChsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnNldC5kZWxldGUocyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbWFwLmRlbGV0ZShsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIG1hcC52YWx1ZXMoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5zZXQuZGVsZXRlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChjb25zdCBtYXAgb2YgbGlzdGVuZXJNYXAudmFsdWVzKCkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2YgbWFwLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5zZXQuZGVsZXRlKHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAoY29uc3QgcyBvZiBjb250ZXh0LnNldCkge1xuICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQubWFwID0gbmV3IFdlYWtNYXAoKTtcbiAgICAgICAgY29udGV4dC5zZXQuY2xlYXIoKTtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3MgdG8gd2hpY2ggdGhlIHNhZmUgZXZlbnQgcmVnaXN0ZXIvdW5yZWdpc3RlciBtZXRob2QgaXMgb2ZmZXJlZCBmb3IgdGhlIG9iamVjdCB3aGljaCBpcyBhIHNob3J0IGxpZmUgY3ljbGUgdGhhbiBzdWJzY3JpcHRpb24gdGFyZ2V0LiA8YnI+XG4gKiAgICAgVGhlIGFkdmFudGFnZSBvZiB1c2luZyB0aGlzIGZvcm0sIGluc3RlYWQgb2YgYG9uKClgLCBpcyB0aGF0IGBsaXN0ZW5UbygpYCBhbGxvd3MgdGhlIG9iamVjdCB0byBrZWVwIHRyYWNrIG9mIHRoZSBldmVudHMsXG4gKiAgICAgYW5kIHRoZXkgY2FuIGJlIHJlbW92ZWQgYWxsIGF0IG9uY2UgbGF0ZXIgY2FsbCBgc3RvcExpc3RlbmluZygpYC5cbiAqIEBqYSDos7zoqq3lr77osaHjgojjgorjgoLjg6njgqTjg5XjgrXjgqTjgq/jg6vjgYznn63jgYTjgqrjg5bjgrjjgqfjgq/jg4jjgavlr77jgZfjgaYsIOWuieWFqOOBquOCpOODmeODs+ODiOeZu+mMsi/op6PpmaTjg6Hjgr3jg4Pjg4njgpLmj5DkvpvjgZnjgovjgq/jg6njgrkgPGJyPlxuICogICAgIGBvbigpYCDjga7ku6Pjgo/jgorjgasgYGxpc3RlblRvKClgIOOCkuS9v+eUqOOBmeOCi+OBk+OBqOOBpywg5b6M44GrIGBzdG9wTGlzdGVuaW5nKClgIOOCkjHluqblkbzjgbbjgaDjgZHjgafjgZnjgbnjgabjga7jg6rjgrnjg4rjg7zjgpLop6PpmaTjgafjgY3jgovliKnngrnjgYzjgYLjgosuXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBFdmVudFJlY2VpdmVyLCBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbiAqXG4gKiAvLyBkZWNsYXJlIGV2ZW50IGludGVyZmFjZVxuICogaW50ZXJmYWNlIFNhbXBsZUV2ZW50IHtcbiAqICAgaG9nZTogW251bWJlciwgc3RyaW5nXTsgICAgICAgIC8vIGNhbGxiYWNrIGZ1bmN0aW9uJ3MgYXJncyB0eXBlIHR1cGxlXG4gKiAgIGZvbzogW3ZvaWRdOyAgICAgICAgICAgICAgICAgICAvLyBubyBhcmdzXG4gKiAgIGhvbzogdm9pZDsgICAgICAgICAgICAgICAgICAgICAvLyBubyBhcmdzIChzYW1lIHRoZSB1cG9uKVxuICogICBiYXI6IFtFcnJvcl07ICAgICAgICAgICAgICAgICAgLy8gYW55IGNsYXNzIGlzIGF2YWlsYWJsZS5cbiAqICAgYmF6OiBFcnJvciB8IE51bWJlcjsgICAgICAgICAgIC8vIGlmIG9ubHkgb25lIGFyZ3VtZW50LCBgW11gIGlzIG5vdCByZXF1aXJlZC5cbiAqIH1cbiAqXG4gKiAvLyBkZWNsYXJlIGNsaWVudCBjbGFzc1xuICogY2xhc3MgU2FtcGxlUmVjZWl2ZXIgZXh0ZW5kcyBFdmVudFJlY2VpdmVyIHtcbiAqICAgY29uc3RydWN0b3IoYnJva2VyOiBFdmVudEJyb2tlcjxTYW1wbGVFdmVudD4pIHtcbiAqICAgICBzdXBlcigpO1xuICogICAgIHRoaXMubGlzdGVuVG8oYnJva2VyLCAnaG9nZScsIChudW06IG51bWJlciwgc3RyOiBzdHJpbmcpID0+IHsgLi4uIH0pO1xuICogICAgIHRoaXMubGlzdGVuVG8oYnJva2VyLCAnYmFyJywgKGU6IEVycm9yKSA9PiB7IC4uLiB9KTtcbiAqICAgICB0aGlzLmxpc3RlblRvKGJyb2tlciwgWydmb28nLCAnaG9vJ10sICgpID0+IHsgLi4uIH0pO1xuICogICB9XG4gKlxuICogICByZWxlYXNlKCk6IHZvaWQge1xuICogICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBvclxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBicm9rZXIgICA9IG5ldyBFdmVudEJyb2tlcjxTYW1wbGVFdmVudD4oKTtcbiAqIGNvbnN0IHJlY2VpdmVyID0gbmV3IEV2ZW50UmVjZWl2ZXIoKTtcbiAqXG4gKiByZWNlaXZlci5saXN0ZW5Ubyhicm9rZXIsICdob2dlJywgKG51bTogbnVtYmVyLCBzdHI6IHN0cmluZykgPT4geyAuLi4gfSk7XG4gKiByZWNlaXZlci5saXN0ZW5Ubyhicm9rZXIsICdiYXInLCAoZTogRXJyb3IpID0+IHsgLi4uIH0pO1xuICogcmVjZWl2ZXIubGlzdGVuVG8oYnJva2VyLCBbJ2ZvbycsICdob28nXSwgKCkgPT4geyAuLi4gfSk7XG4gKlxuICogcmVjZWl2ZXIuc3RvcExpc3RlbmluZygpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBFdmVudFJlY2VpdmVyIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX2NvbnRleHRdOiBDb250ZXh0O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXNbX2NvbnRleHRdID0geyBtYXA6IG5ldyBXZWFrTWFwKCksIHNldDogbmV3IFNldCgpIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRlbGwgYW4gb2JqZWN0IHRvIGxpc3RlbiB0byBhIHBhcnRpY3VsYXIgZXZlbnQgb24gYW4gb3RoZXIgb2JqZWN0LlxuICAgICAqIEBqYSDlr77osaHjgqrjg5bjgrjjgqfjgq/jg4jjga7jgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXRcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGxpc3RlbmluZyB0YXJnZXQgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI6LO86Kqt5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBsaXN0ZW5UbzxUIGV4dGVuZHMgU3Vic2NyaWJhYmxlLCBFdmVudCBleHRlbmRzIEV2ZW50U2NoZW1hPFQ+ID0gRXZlbnRTY2hlbWE8VD4sIENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudCA9IGtleW9mIEV2ZW50PihcbiAgICAgICAgdGFyZ2V0OiBULFxuICAgICAgICBjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLFxuICAgICAgICBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd25cbiAgICApOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICByZXR1cm4gcmVnaXN0ZXIodGhpc1tfY29udGV4dF0sIHRhcmdldCwgY2hhbm5lbCBhcyBzdHJpbmcsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVzdCBsaWtlIGxpc3RlblRvLCBidXQgY2F1c2VzIHRoZSBib3VuZCBjYWxsYmFjayB0byBmaXJlIG9ubHkgb25jZSBiZWZvcmUgYmVpbmcgcmVtb3ZlZC5cbiAgICAgKiBAamEg5a++6LGh44Kq44OW44K444Kn44Kv44OI44Gu5LiA5bqm44Gg44GR44OP44Oz44OJ44Oq44Oz44Kw5Y+v6IO944Gq44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0XG4gICAgICogIC0gYGVuYCBldmVudCBsaXN0ZW5pbmcgdGFyZ2V0IG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOizvOiqreWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgbGlzdGVuVG9PbmNlPFQgZXh0ZW5kcyBTdWJzY3JpYmFibGUsIEV2ZW50IGV4dGVuZHMgRXZlbnRTY2hlbWE8VD4gPSBFdmVudFNjaGVtYTxUPiwgQ2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50ID0ga2V5b2YgRXZlbnQ+KFxuICAgICAgICB0YXJnZXQ6IFQsXG4gICAgICAgIGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sXG4gICAgICAgIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93blxuICAgICk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSByZWdpc3Rlcih0aGlzW19jb250ZXh0XSwgdGFyZ2V0LCBjaGFubmVsIGFzIHN0cmluZywgbGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBtYW5hZ2VkID0gdGFyZ2V0Lm9uKGNoYW5uZWwsICgpID0+IHtcbiAgICAgICAgICAgIHVucmVnaXN0ZXIodGhpc1tfY29udGV4dF0sIHRhcmdldCwgY2hhbm5lbCBhcyBzdHJpbmcsIGxpc3RlbmVyKTtcbiAgICAgICAgICAgIG1hbmFnZWQudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjb250ZXh0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUZWxsIGFuIG9iamVjdCB0byBzdG9wIGxpc3RlbmluZyB0byBldmVudHMuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHRhcmdldFxuICAgICAqICAtIGBlbmAgZXZlbnQgbGlzdGVuaW5nIHRhcmdldCBvYmplY3QuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGV2ZXJ5dGhpbmcgaXMgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jos7zoqq3lr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuOBruODquOCueODiuODvOOCkuino+mZpFxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGV2ZXJ5dGhpbmcgaXMgcmVsZWFzZWQgbGlzdGVuZXJzIGZyb20gYHRhcmdldGAuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WvvuixoSBgdGFyZ2V0YCDjga7jg6rjgrnjg4rjg7zjgpLjgZnjgbnjgabop6PpmaRcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgYWxsIHNhbWUgYGNoYW5uZWxgIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lkIzkuIAgYGNoYW5uZWxgIOOBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIHB1YmxpYyBzdG9wTGlzdGVuaW5nPFQgZXh0ZW5kcyBTdWJzY3JpYmFibGUsIEV2ZW50IGV4dGVuZHMgRXZlbnRTY2hlbWE8VD4gPSBFdmVudFNjaGVtYTxUPiwgQ2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50ID0ga2V5b2YgRXZlbnQ+KFxuICAgICAgICB0YXJnZXQ/OiBULFxuICAgICAgICBjaGFubmVsPzogQ2hhbm5lbCB8IENoYW5uZWxbXSxcbiAgICAgICAgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93blxuICAgICk6IHRoaXMge1xuICAgICAgICB1bnJlZ2lzdGVyKHRoaXNbX2NvbnRleHRdLCB0YXJnZXQsIGNoYW5uZWwgYXMgc3RyaW5nLCBsaXN0ZW5lcik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQgeyBtaXhpbnMgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRCcm9rZXIgfSBmcm9tICcuL2Jyb2tlcic7XG5pbXBvcnQgeyBFdmVudFJlY2VpdmVyIH0gZnJvbSAnLi9yZWNlaXZlcic7XG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyB3aGljaCBoYXZlIEkvRiBvZiBbW0V2ZW50QnJva2VyXV0gYW5kIFtbRXZlbnRSZWNlaXZlcl1dLiA8YnI+XG4gKiAgICAgYEV2ZW50c2AgY2xhc3Mgb2YgYEJhY2tib25lLmpzYCBlcXVpdmFsZW5jZS5cbiAqIEBqYSBbW0V2ZW50QnJva2VyXV0g44GoIFtbRXZlbnRSZWNlaXZlcl1dIOOBriBJL0Yg44KS44GC44KP44Gb5oyB44Gk44Kv44Op44K5IDxicj5cbiAqICAgICBgQmFja2JvbmUuanNgIOOBriBgRXZlbnRzYCDjgq/jg6njgrnnm7jlvZNcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEV2ZW50U291cmNlIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuICpcbiAqIC8vIGRlY2xhcmUgZXZlbnQgaW50ZXJmYWNlXG4gKiBpbnRlcmZhY2UgVGFyZ2V0RXZlbnQge1xuICogICBob2dlOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqICAgZm9vOiBbdm9pZF07ICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3NcbiAqICAgaG9vOiB2b2lkOyAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3MgKHNhbWUgdGhlIHVwb24pXG4gKiAgIGJhcjogW0Vycm9yXTsgICAgICAgICAgICAgICAgICAvLyBhbnkgY2xhc3MgaXMgYXZhaWxhYmxlLlxuICogICBiYXo6IEVycm9yIHwgTnVtYmVyOyAgICAgICAgICAgLy8gaWYgb25seSBvbmUgYXJndW1lbnQsIGBbXWAgaXMgbm90IHJlcXVpcmVkLlxuICogfVxuICpcbiAqIGludGVyZmFjZSBTYW1wbGVFdmVudCB7XG4gKiAgIGZ1Z2E6IFtudW1iZXIsIHN0cmluZ107ICAgICAgICAvLyBjYWxsYmFjayBmdW5jdGlvbidzIGFyZ3MgdHlwZSB0dXBsZVxuICogfVxuICpcbiAqIC8vIGRlY2xhcmUgY2xpZW50IGNsYXNzXG4gKiBjbGFzcyBTYW1wbGVTb3VyY2UgZXh0ZW5kcyBFdmVudFNvdXJjZTxTYW1wbGVFdmVudD4ge1xuICogICBjb25zdHJ1Y3Rvcih0YXJnZXQ6IEV2ZW50U291cmNlPFRhcmdldEV2ZW50Pikge1xuICogICAgIHN1cGVyKCk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsICdob2dlJywgKG51bTogbnVtYmVyLCBzdHI6IHN0cmluZykgPT4geyAuLi4gfSk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsICdiYXInLCAoZTogRXJyb3IpID0+IHsgLi4uIH0pO1xuICogICAgIHRoaXMubGlzdGVuVG8oYnJva2VyLCBbJ2ZvbycsICdob28nXSwgKCkgPT4geyAuLi4gfSk7XG4gKiAgIH1cbiAqXG4gKiAgIHJlbGVhc2UoKTogdm9pZCB7XG4gKiAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBzYW1wbGUgPSBuZXcgU2FtcGxlU291cmNlKCk7XG4gKlxuICogc2FtcGxlLm9uKCdmdWdhJywgKGE6IG51bWJlciwgYjogc3RyaW5nKSA9PiB7IC4uLiB9KTsgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogc2FtcGxlLnRyaWdnZXIoJ2Z1Z2EnLCAxMDAsICd0ZXN0Jyk7ICAgICAgICAgICAgICAgICAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogYGBgXG4gKi9cbnR5cGUgRXZlbnRTb3VyY2VCYXNlPFQgZXh0ZW5kcyBvYmplY3Q+ID0gRXZlbnRCcm9rZXI8VD4gJiBFdmVudFJlY2VpdmVyO1xuXG4vKiogQGludGVybmFsIFtbRXZlbnRTb3VyY2VdXSBjbGFzcyAqL1xuY2xhc3MgRXZlbnRTb3VyY2UgZXh0ZW5kcyBtaXhpbnMoRXZlbnRCcm9rZXIsIEV2ZW50UmVjZWl2ZXIpIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5zdXBlcihFdmVudFJlY2VpdmVyKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnN0cnVjdG9yIG9mIFtbRXZlbnRTb3VyY2VdXVxuICogQGphIFtbRXZlbnRTb3VyY2VdXSDjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/lrp/kvZNcbiAqL1xuY29uc3QgRXZlbnRTb3VyY2VCYXNlOiB7XG4gICAgcmVhZG9ubHkgcHJvdG90eXBlOiBFdmVudFNvdXJjZUJhc2U8YW55PjtcbiAgICBuZXcgPFQgZXh0ZW5kcyBvYmplY3Q+KCk6IEV2ZW50U291cmNlQmFzZTxUPjtcbn0gPSBFdmVudFNvdXJjZSBhcyBhbnk7XG5cbmV4cG9ydCB7IEV2ZW50U291cmNlQmFzZSBhcyBFdmVudFNvdXJjZSB9O1xuIiwiaW1wb3J0IHsgRXZlbnRCcm9rZXIsIFN1YnNjcmlwdGlvbiB9IGZyb20gJ0BjZHAvZXZlbnRzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgX2NhbmNlbCA9IFN5bWJvbCgnY2FuY2VsJyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBfY2xvc2UgID0gU3ltYm9sKCdjbG9zZScpO1xuXG4vKipcbiAqIEBlbiBDYW5jZWxUb2tlbiBzdGF0ZSBkZWZpbml0aW9ucy5cbiAqIEBqYSBDYW5jZWxUb2tlbiDjga7nirbmhYvlrprnvqlcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ2FuY2VsVG9rZW5TdGF0ZSB7XG4gICAgLyoqIOOCreODo+ODs+OCu+ODq+WPl+S7mOWPr+iDvSAqL1xuICAgIE9QRU4gICAgICAgID0gMHgwLFxuICAgIC8qKiDjgq3jg6Pjg7Pjgrvjg6vlj5fku5jmuIjjgb8gKi9cbiAgICBSRVFVRVNURUQgICA9IDB4MSxcbiAgICAvKiog44Kt44Oj44Oz44K744Or5Y+X5LuY5LiN5Y+vICovXG4gICAgQ0xPU0VEICAgICAgPSAweDIsXG59XG5cbi8qKlxuICogQGVuIENhbmNlbCBldmVudCBkZWZpbml0aW9ucy5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjgqTjg5njg7Pjg4jlrprnvqlcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5jZWxFdmVudDxUPiB7XG4gICAgY2FuY2VsOiBbVF07XG59XG5cbi8qKlxuICogQGVuIEludGVybmFsIENhbmNlbFRva2VuIGludGVyZmFjZS5cbiAqIEBqYSBDYW5jZWxUb2tlbiDjga7lhoXpg6jjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqlcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5jZWxUb2tlbkNvbnRleHQ8VCA9IHVua25vd24+IHtcbiAgICByZWFkb25seSBicm9rZXI6IEV2ZW50QnJva2VyPENhbmNlbEV2ZW50PFQ+PjtcbiAgICByZWFkb25seSBzdWJzY3JpcHRpb25zOiBTZXQ8U3Vic2NyaXB0aW9uPjtcbiAgICByZWFzb246IFQgfCB1bmRlZmluZWQ7XG4gICAgc3RhdHVzOiBDYW5jZWxUb2tlblN0YXRlO1xufVxuXG4vKipcbiAqIEBlbiBJbnZhbGlkIHN1YnNjcmlwdGlvbiBvYmplY3QgZGVjbGFyYXRpb24uXG4gKiBAamEg54Sh5Yq544GqIFN1YnNjcmlwdGlvbiDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGNvbnN0IGludmFsaWRTdWJzY3JpcHRpb24gPSBPYmplY3QuZnJlZXplKHtcbiAgICBlbmFibGU6IGZhbHNlLFxuICAgIHVuc3Vic2NyaWJlKCkgeyAvKiBub29wICovIH1cbn0pIGFzIFN1YnNjcmlwdGlvbjtcbiIsImltcG9ydCB7IHZlcmlmeSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudEJyb2tlciwgU3Vic2NyaXB0aW9uIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBfY2FuY2VsLFxuICAgIF9jbG9zZSxcbiAgICBDYW5jZWxUb2tlblN0YXRlLFxuICAgIENhbmNlbFRva2VuQ29udGV4dCxcbiAgICBpbnZhbGlkU3Vic2NyaXB0aW9uLFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gQ2FuY2VsbGF0aW9uIHNvdXJjZSBpbnRlcmZhY2UuXG4gKiBAamEg44Kt44Oj44Oz44K744Or566h55CG44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuY2VsVG9rZW5Tb3VyY2U8VCA9IHVua25vd24+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gW1tDYW5jZWxUb2tlbl1dIGdldHRlci5cbiAgICAgKiBAamEgW1tDYW5jZWxUb2tlbl1dIOWPluW+l1xuICAgICAqL1xuICAgIHJlYWRvbmx5IHRva2VuOiBDYW5jZWxUb2tlbjxUPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGNhbmNlbC5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVhc29uXG4gICAgICogIC0gYGVuYCBjYW5jZWxsYXRpb24gcmVhc29uLiB0aGlzIGFyZyBpcyB0cmFuc21pdHRlZCBpbiBwcm9taXNlIGNoYWluLlxuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744Or44Gu55CG55Sx44KS5oyH5a6aLiBgUHJvbWlzZWAg44OB44Kn44Kk44Oz44Gr5Lyd6YGU44GV44KM44KLLlxuICAgICAqL1xuICAgIGNhbmNlbChyZWFzb246IFQpOiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEJyZWFrIHVwIGNhbmNlbGxhdGlvbiByZWNlcHRpb24uXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+WPl+S7mOOCkue1guS6hlxuICAgICAqL1xuICAgIGNsb3NlKCk6IHZvaWQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Rva2VucyA9IG5ldyBXZWFrTWFwPENhbmNlbFRva2VuLCBDYW5jZWxUb2tlbkNvbnRleHQ+KCk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIGdldENvbnRleHQ8VCA9IHVua25vd24+KGluc3RhbmNlOiBDYW5jZWxUb2tlbjxUPik6IENhbmNlbFRva2VuQ29udGV4dDxUPiB7XG4gICAgaWYgKCFfdG9rZW5zLmhhcyhpbnN0YW5jZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIG9iamVjdCBpcyBub3QgYSB2YWxpZCBDYW5jZWxUb2tlbi4nKTtcbiAgICB9XG4gICAgcmV0dXJuIF90b2tlbnMuZ2V0KGluc3RhbmNlKSBhcyBDYW5jZWxUb2tlbkNvbnRleHQ8VD47XG59XG5cbi8qKlxuICogQGVuIFRoZSB0b2tlbiBvYmplY3QgdG8gd2hpY2ggdW5pZmljYXRpb24gcHJvY2Vzc2luZyBmb3IgYXN5bmNocm9ub3VzIHByb2Nlc3NpbmcgY2FuY2VsbGF0aW9uIGlzIG9mZmVyZWQuIDxicj5cbiAqICAgICBPcmlnaW4gaXMgYENhbmNlbGxhdGlvblRva2VuYCBvZiBgLk5FVCBGcmFtZXdvcmtgLlxuICogQGphIOmdnuWQjOacn+WHpueQhuOCreODo+ODs+OCu+ODq+OBruOBn+OCgeOBrue1seS4gOWHpueQhuOCkuaPkOS+m+OBmeOCi+ODiOODvOOCr+ODs+OCquODluOCuOOCp+OCr+ODiCA8YnI+XG4gKiAgICAg44Kq44Oq44K444OK44Or44GvIGAuTkVUIEZyYW1ld29ya2Ag44GuIGBDYW5jZWxsYXRpb25Ub2tlbmBcbiAqXG4gKiBAc2VlIGh0dHBzOi8vZG9jcy5taWNyb3NvZnQuY29tL2VuLXVzL2RvdG5ldC9zdGFuZGFyZC90aHJlYWRpbmcvY2FuY2VsbGF0aW9uLWluLW1hbmFnZWQtdGhyZWFkc1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuICogYGBgXG4gKlxuICogLSBCYXNpYyBVc2FnZVxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB0b2tlbiA9IG5ldyBDYW5jZWxUb2tlbigoY2FuY2VsLCBjbG9zZSkgPT4ge1xuICogICBidXR0b24xLm9uY2xpY2sgPSBldiA9PiBjYW5jZWwobmV3IEVycm9yKCdDYW5jZWwnKSk7XG4gKiAgIGJ1dHRvbjIub25jbGljayA9IGV2ID0+IGNsb3NlKCk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIG9yXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHsgY2FuY2VsLCBjbG9zZSwgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZSgpO1xuICogYnV0dG9uMS5vbmNsaWNrID0gZXYgPT4gY2FuY2VsKG5ldyBFcnJvcignQ2FuY2VsJykpO1xuICogYnV0dG9uMi5vbmNsaWNrID0gZXYgPT4gY2xvc2UoKTtcbiAqIGBgYFxuICpcbiAqIC0gVXNlIHdpdGggUHJvbWlzZVxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB7IGNhbmNlbCwgY2xvc2UsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTtcbiAqIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgob2ssIG5nKSA9PiB7IC4uLiB9LCB0b2tlbik7XG4gKiBwcm9taXNlXG4gKiAgIC50aGVuKC4uLilcbiAqICAgLnRoZW4oLi4uKVxuICogICAudGhlbiguLi4pXG4gKiAgIC5jYXRjaChyZWFzb24gPT4ge1xuICogICAgIC8vIGNoZWNrIHJlYXNvblxuICogICB9KTtcbiAqIGBgYFxuICpcbiAqIC0gUmVnaXN0ZXIgJiBVbnJlZ2lzdGVyIGNhbGxiYWNrKHMpXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHsgY2FuY2VsLCBjbG9zZSwgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZSgpO1xuICogY29uc3Qgc3Vic2NyaXB0aW9uID0gdG9rZW4ucmVnaXN0ZXIocmVhc29uID0+IHtcbiAqICAgY29uc29sZS5sb2cocmVhc29uLm1lc3NhZ2UpO1xuICogfSk7XG4gKiBpZiAoc29tZUNhc2UpIHtcbiAqICAgc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIENhbmNlbFRva2VuPFQgPSB1bmtub3duPiB7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIFtbQ2FuY2VsVG9rZW5Tb3VyY2VdXSBpbnN0YW5jZS5cbiAgICAgKiBAamEgW1tDYW5jZWxUb2tlblNvdXJjZV1dIOOCpOODs+OCueOCv+ODs+OCueOBruWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIGxpbmtlZFRva2Vuc1xuICAgICAqICAtIGBlbmAgcmVsYXRpbmcgYWxyZWFkeSBtYWRlIFtbQ2FuY2VsVG9rZW5dXSBpbnN0YW5jZS5cbiAgICAgKiAgICAgICAgWW91IGNhbiBhdHRhY2ggdG8gdGhlIHRva2VuIHRoYXQgdG8gYmUgYSBjYW5jZWxsYXRpb24gdGFyZ2V0LlxuICAgICAqICAtIGBqYWAg44GZ44Gn44Gr5L2c5oiQ44GV44KM44GfIFtbQ2FuY2VsVG9rZW5dXSDplqLpgKPku5jjgZHjgovloLTlkIjjgavmjIflrppcbiAgICAgKiAgICAgICAg5rih44GV44KM44GfIHRva2VuIOOBr+OCreODo+ODs+OCu+ODq+WvvuixoeOBqOOBl+OBpue0kOOBpeOBkeOCieOCjOOCi1xuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgc291cmNlPFQgPSB1bmtub3duPiguLi5saW5rZWRUb2tlbnM6IENhbmNlbFRva2VuW10pOiBDYW5jZWxUb2tlblNvdXJjZTxUPiB7XG4gICAgICAgIGxldCBjYW5jZWwhOiAocmVhc29uOiBUKSA9PiB2b2lkO1xuICAgICAgICBsZXQgY2xvc2UhOiAoKSA9PiB2b2lkO1xuICAgICAgICBjb25zdCB0b2tlbiA9IG5ldyBDYW5jZWxUb2tlbjxUPigob25DYW5jZWwsIG9uQ2xvc2UpID0+IHtcbiAgICAgICAgICAgIGNhbmNlbCA9IG9uQ2FuY2VsO1xuICAgICAgICAgICAgY2xvc2UgPSBvbkNsb3NlO1xuICAgICAgICB9LCAuLi5saW5rZWRUb2tlbnMpO1xuICAgICAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7IHRva2VuLCBjYW5jZWwsIGNsb3NlIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZXhlY3V0b3JcbiAgICAgKiAgLSBgZW5gIGV4ZWN1dGVyIHRoYXQgaGFzIGBjYW5jZWxgIGFuZCBgY2xvc2VgIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744OrL+OCr+ODreODvOOCuiDlrp/ooYzjgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrppcbiAgICAgKiBAcGFyYW0gbGlua2VkVG9rZW5zXG4gICAgICogIC0gYGVuYCByZWxhdGluZyBhbHJlYWR5IG1hZGUgW1tDYW5jZWxUb2tlbl1dIGluc3RhbmNlLlxuICAgICAqICAgICAgICBZb3UgY2FuIGF0dGFjaCB0byB0aGUgdG9rZW4gdGhhdCB0byBiZSBhIGNhbmNlbGxhdGlvbiB0YXJnZXQuXG4gICAgICogIC0gYGphYCDjgZnjgafjgavkvZzmiJDjgZXjgozjgZ8gW1tDYW5jZWxUb2tlbl1dIOmWoumAo+S7mOOBkeOCi+WgtOWQiOOBq+aMh+WumlxuICAgICAqICAgICAgICDmuKHjgZXjgozjgZ8gdG9rZW4g44Gv44Kt44Oj44Oz44K744Or5a++6LGh44Go44GX44Gm57SQ44Gl44GR44KJ44KM44KLXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIGV4ZWN1dG9yOiAoY2FuY2VsOiAocmVhc29uOiBUKSA9PiB2b2lkLCBjbG9zZTogKCkgPT4gdm9pZCkgPT4gdm9pZCxcbiAgICAgICAgLi4ubGlua2VkVG9rZW5zOiBDYW5jZWxUb2tlbltdXG4gICAgKSB7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIENhbmNlbFRva2VuLCB0aGlzKTtcbiAgICAgICAgdmVyaWZ5KCd0eXBlT2YnLCAnZnVuY3Rpb24nLCBleGVjdXRvcik7XG5cbiAgICAgICAgY29uc3QgbGlua2VkVG9rZW5TZXQgPSBuZXcgU2V0KGxpbmtlZFRva2Vucy5maWx0ZXIodCA9PiBfdG9rZW5zLmhhcyh0KSkpO1xuICAgICAgICBsZXQgc3RhdHVzID0gQ2FuY2VsVG9rZW5TdGF0ZS5PUEVOO1xuICAgICAgICBmb3IgKGNvbnN0IHQgb2YgbGlua2VkVG9rZW5TZXQpIHtcbiAgICAgICAgICAgIHN0YXR1cyB8PSBnZXRDb250ZXh0KHQpLnN0YXR1cztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbnRleHQ6IENhbmNlbFRva2VuQ29udGV4dDxUPiA9IHtcbiAgICAgICAgICAgIGJyb2tlcjogbmV3IEV2ZW50QnJva2VyKCksXG4gICAgICAgICAgICBzdWJzY3JpcHRpb25zOiBuZXcgU2V0KCksXG4gICAgICAgICAgICByZWFzb246IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHN0YXR1cyxcbiAgICAgICAgfTtcbiAgICAgICAgX3Rva2Vucy5zZXQodGhpcywgT2JqZWN0LnNlYWwoY29udGV4dCkpO1xuXG4gICAgICAgIGNvbnN0IGNhbmNlbCA9IHRoaXNbX2NhbmNlbF07XG4gICAgICAgIGNvbnN0IGNsb3NlID0gdGhpc1tfY2xvc2VdO1xuICAgICAgICBpZiAoc3RhdHVzID09PSBDYW5jZWxUb2tlblN0YXRlLk9QRU4pIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgdCBvZiBsaW5rZWRUb2tlblNldCkge1xuICAgICAgICAgICAgICAgIGNvbnRleHQuc3Vic2NyaXB0aW9ucy5hZGQodC5yZWdpc3RlcihjYW5jZWwuYmluZCh0aGlzKSkpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVnaXN0ZXIoY2FuY2VsLmJpbmQodCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhlY3V0b3IoY2FuY2VsLmJpbmQodGhpcyksIGNsb3NlLmJpbmQodGhpcykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYW5jZWxsYXRpb24gcmVhc29uIGFjY2Vzc29yLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjga7ljp/lm6Dlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgcmVhc29uKCk6IFQgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gZ2V0Q29udGV4dCh0aGlzKS5yZWFzb247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEVuYWJsZSBjYW5jZWxsYXRpb24gc3RhdGUgYWNjZXNzb3IuXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+WPr+iDveOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBjYW5jZWxhYmxlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gZ2V0Q29udGV4dCh0aGlzKS5zdGF0dXMgPT09IENhbmNlbFRva2VuU3RhdGUuT1BFTjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FuY2VsbGF0aW9uIHJlcXVlc3RlZCBzdGF0ZSBhY2Nlc3Nvci5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or44KS5Y+X44GR5LuY44GR44Gm44GE44KL44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IHJlcXVlc3RlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhKGdldENvbnRleHQodGhpcykuc3RhdHVzICYgQ2FuY2VsVG9rZW5TdGF0ZS5SRVFVRVNURUQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYW5jZWxsYXRpb24gY2xvc2VkIHN0YXRlIGFjY2Vzc29yLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vlj5fku5jjgpLntYLkuobjgZfjgabjgYTjgovjgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgY2xvc2VkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISEoZ2V0Q29udGV4dCh0aGlzKS5zdGF0dXMgJiBDYW5jZWxUb2tlblN0YXRlLkNMT1NFRCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIGB0b1N0cmluZ2AgdGFnIG92ZXJyaWRlLlxuICAgICAqIEBqYSBgdG9TdHJpbmdgIOOCv+OCsOOBruOCquODvOODkOODvOODqeOCpOODiVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKTogJ0NhbmNlbFRva2VuJyB7IHJldHVybiAnQ2FuY2VsVG9rZW4nOyB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVnaXN0ZXIgY3VzdG9tIGNhbmNlbGxhdGlvbiBjYWxsYmFjay5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5pmC44Gu44Kr44K544K/44Og5Yem55CG44Gu55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb25DYW5jZWxcbiAgICAgKiAgLSBgZW5gIGNhbmNlbCBvcGVyYXRpb24gY2FsbGJhY2tcbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODq+OCs+ODvOODq+ODkOODg+OCr1xuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgU3Vic2NyaXB0aW9uYCBpbnN0YW5jZS5cbiAgICAgKiAgICAgICAgWW91IGNhbiByZXZva2UgY2FuY2VsbGF0aW9uIHRvIGNhbGwgYHVuc3Vic2NyaWJlYCBtZXRob2QuXG4gICAgICogIC0gYGphYCBgU3Vic2NyaXB0aW9uYCDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKiAgICAgICAgYHVuc3Vic2NyaWJlYCDjg6Hjgr3jg4Pjg4njgpLlkbzjgbbjgZPjgajjgafjgq3jg6Pjg7Pjgrvjg6vjgpLnhKHlirnjgavjgZnjgovjgZPjgajjgYzlj6/og71cbiAgICAgKi9cbiAgICBwdWJsaWMgcmVnaXN0ZXIob25DYW5jZWw6IChyZWFzb246IFQpID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gZ2V0Q29udGV4dCh0aGlzKTtcbiAgICAgICAgaWYgKCF0aGlzLmNhbmNlbGFibGUpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnZhbGlkU3Vic2NyaXB0aW9uO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb250ZXh0LmJyb2tlci5vbignY2FuY2VsJywgb25DYW5jZWwpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfY2FuY2VsXShyZWFzb246IFQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGdldENvbnRleHQodGhpcyk7XG4gICAgICAgIHZlcmlmeSgnbm90TmlsJywgcmVhc29uKTtcbiAgICAgICAgaWYgKCF0aGlzLmNhbmNlbGFibGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0LnJlYXNvbiA9IHJlYXNvbjtcbiAgICAgICAgY29udGV4dC5zdGF0dXMgfD0gQ2FuY2VsVG9rZW5TdGF0ZS5SRVFVRVNURUQ7XG4gICAgICAgIGZvciAoY29uc3QgcyBvZiBjb250ZXh0LnN1YnNjcmlwdGlvbnMpIHtcbiAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0LmJyb2tlci50cmlnZ2VyKCdjYW5jZWwnLCByZWFzb24pO1xuICAgICAgICB2b2lkIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oKCkgPT4gdGhpc1tfY2xvc2VdKCkpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfY2xvc2VdKCk6IHZvaWQge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gZ2V0Q29udGV4dCh0aGlzKTtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5zdGF0dXMgfD0gQ2FuY2VsVG9rZW5TdGF0ZS5DTE9TRUQ7XG4gICAgICAgIGZvciAoY29uc3QgcyBvZiBjb250ZXh0LnN1YnNjcmlwdGlvbnMpIHtcbiAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0LnN1YnNjcmlwdGlvbnMuY2xlYXIoKTtcbiAgICAgICAgY29udGV4dC5icm9rZXIub2ZmKCk7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBuby1nbG9iYWwtYXNzaWduLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZCxcbiAqL1xuXG5pbXBvcnQge1xuICAgIGlzRnVuY3Rpb24sXG4gICAgdmVyaWZ5LFxuICAgIGdldENvbmZpZyxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IENhbmNlbFRva2VuIH0gZnJvbSAnLi9jYW5jZWwtdG9rZW4nO1xuXG5kZWNsYXJlIGdsb2JhbCB7XG5cbiAgICBpbnRlcmZhY2UgUHJvbWlzZUNvbnN0cnVjdG9yIHtcbiAgICAgICAgbmV3IDxUPihleGVjdXRvcjogKHJlc29sdmU6ICh2YWx1ZT86IFQgfCBQcm9taXNlTGlrZTxUPikgPT4gdm9pZCwgcmVqZWN0OiAocmVhc29uPzogdW5rbm93bikgPT4gdm9pZCkgPT4gdm9pZCwgY2FuY2VsVG9rZW4/OiBDYW5jZWxUb2tlbiB8IG51bGwpOiBQcm9taXNlPFQ+O1xuICAgICAgICByZXNvbHZlPFQ+KHZhbHVlPzogVCB8IFByb21pc2VMaWtlPFQ+LCBjYW5jZWxUb2tlbj86IENhbmNlbFRva2VuIHwgbnVsbCk6IFByb21pc2U8VD47XG4gICAgfVxuXG59XG5cbi8qKiBAaW50ZXJuYWwgYE5hdGl2ZSBQcm9taXNlYCBjb25zdHJ1Y3RvciAqL1xuY29uc3QgTmF0aXZlUHJvbWlzZSA9IFByb21pc2U7XG4vKiogQGludGVybmFsIGBOYXRpdmUgdGhlbmAgbWV0aG9kICovXG5jb25zdCBuYXRpdmVUaGVuID0gTmF0aXZlUHJvbWlzZS5wcm90b3R5cGUudGhlbjtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NyZWF0ZSA9IFN5bWJvbCgnY3JlYXRlJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF90b2tlbnMgPSBuZXcgV2Vha01hcDxQcm9taXNlPHVua25vd24+LCBDYW5jZWxUb2tlbj4oKTtcblxuLyoqXG4gKiBAZW4gRXh0ZW5kZWQgYFByb21pc2VgIGNsYXNzIHdoaWNoIGVuYWJsZWQgY2FuY2VsbGF0aW9uLiA8YnI+XG4gKiAgICAgYE5hdGl2ZSBQcm9taXNlYCBjb25zdHJ1Y3RvciBpcyBvdmVycmlkZGVuIGJ5IGZyYW1ld29yayBkZWZhdWx0IGJlaGF2aW91ci5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjgpLlj6/og73jgavjgZfjgZ8gYFByb21pc2VgIOaLoeW8teOCr+ODqeOCuSA8YnI+XG4gKiAgICAg5pei5a6a44GnIGBOYXRpdmUgUHJvbWlzZWAg44KS44Kq44O844OQ44O844Op44Kk44OJ44GZ44KLLlxuICovXG5jbGFzcyBDYW5jZWxhYmxlUHJvbWlzZTxUPiBleHRlbmRzIFByb21pc2U8VD4ge1xuXG4gICAgLyoqXG4gICAgICogQGVuIE92ZXJyaWRpbmcgb2YgdGhlIGRlZmF1bHQgY29uc3RydWN0b3IgdXNlZCBmb3IgZ2VuZXJhdGlvbiBvZiBhbiBvYmplY3QuXG4gICAgICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBrueUn+aIkOOBq+S9v+OCj+OCjOOCi+ODh+ODleOCqeODq+ODiOOCs+ODs+OCueODiOODqeOCr+OCv+OBruOCquODvOODkOODvOODqeOCpOODiVxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgc3RhdGljIGdldCBbU3ltYm9sLnNwZWNpZXNdKCk6IFByb21pc2VDb25zdHJ1Y3RvciB7IHJldHVybiBOYXRpdmVQcm9taXNlOyB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlcyBhIG5ldyByZXNvbHZlZCBwcm9taXNlIGZvciB0aGUgcHJvdmlkZWQgdmFsdWUuXG4gICAgICogQGphIOaWsOimj+OBq+ino+axuua4iOOBvyBwcm9taXNlIOOCpOODs+OCueOCv+ODs+OCueOCkuS9nOaIkFxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHRoZSB2YWx1ZSB0cmFuc21pdHRlZCBpbiBwcm9taXNlIGNoYWluLlxuICAgICAqICAtIGBqYWAgYFByb21pc2VgIOOBq+S8nemBlOOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBjYW5jZWxUb2tlblxuICAgICAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIGluc3RhbmNlIGNyZWF0ZSBmcm9tIFtbQ2FuY2VsVG9rZW5dXS5gc291cmNlKClgLlxuICAgICAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dLmBzb3VyY2UoKWAg44KI44KK5L2c5oiQ44GX44GfIFtbQ2FuY2VsVG9rZW5dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAgICAgKi9cbiAgICBzdGF0aWMgcmVzb2x2ZTxUPih2YWx1ZT86IFQgfCBQcm9taXNlTGlrZTxUPiwgY2FuY2VsVG9rZW4/OiBDYW5jZWxUb2tlbiB8IG51bGwpOiBDYW5jZWxhYmxlUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVdKHN1cGVyLnJlc29sdmUodmFsdWUpLCBjYW5jZWxUb2tlbik7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBwcml2YXRlIGNvbnN0cnVjdGlvbiAqL1xuICAgIHByaXZhdGUgc3RhdGljIFtfY3JlYXRlXTxULCBUUmVzdWx0MSA9IFQsIFRSZXN1bHQyID0gbmV2ZXI+KFxuICAgICAgICBzcmM6IFByb21pc2U8VD4sXG4gICAgICAgIHRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsLFxuICAgICAgICB0aGVuQXJncz86IFtcbiAgICAgICAgICAgICgodmFsdWU6IFQpID0+IFRSZXN1bHQxIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDE+KSB8IG51bGwgfCB1bmRlZmluZWQsXG4gICAgICAgICAgICAoKHJlYXNvbjogdW5rbm93bikgPT4gVFJlc3VsdDIgfCBQcm9taXNlTGlrZTxUUmVzdWx0Mj4pIHwgbnVsbCB8IHVuZGVmaW5lZFxuICAgICAgICBdIHwgbnVsbFxuICAgICk6IENhbmNlbGFibGVQcm9taXNlPFRSZXN1bHQxIHwgVFJlc3VsdDI+IHtcbiAgICAgICAgdmVyaWZ5KCdpbnN0YW5jZU9mJywgTmF0aXZlUHJvbWlzZSwgc3JjKTtcblxuICAgICAgICBsZXQgcDogUHJvbWlzZTxUIHwgVFJlc3VsdDEgfCBUUmVzdWx0Mj47XG4gICAgICAgIGlmICghKHRva2VuIGluc3RhbmNlb2YgQ2FuY2VsVG9rZW4pKSB7XG4gICAgICAgICAgICBwID0gc3JjO1xuICAgICAgICB9IGVsc2UgaWYgKHRoZW5BcmdzICYmICghaXNGdW5jdGlvbih0aGVuQXJnc1swXSkgfHwgaXNGdW5jdGlvbih0aGVuQXJnc1sxXSkpKSB7XG4gICAgICAgICAgICBwID0gc3JjO1xuICAgICAgICB9IGVsc2UgaWYgKHRva2VuLmNhbmNlbGFibGUpIHtcbiAgICAgICAgICAgIGxldCBzOiBTdWJzY3JpcHRpb247XG4gICAgICAgICAgICBwID0gbmV3IE5hdGl2ZVByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIHMgPSB0b2tlbi5yZWdpc3RlcihyZWplY3QpO1xuICAgICAgICAgICAgICAgIG5hdGl2ZVRoZW4uY2FsbChzcmMsIHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnN0IGRpc3Bvc2UgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgIF90b2tlbnMuZGVsZXRlKHApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHAudGhlbihkaXNwb3NlLCBkaXNwb3NlKTtcbiAgICAgICAgfSBlbHNlIGlmICh0b2tlbi5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgIHAgPSBzdXBlci5yZWplY3QodG9rZW4ucmVhc29uKTtcbiAgICAgICAgfSBlbHNlIGlmICh0b2tlbi5jbG9zZWQpIHtcbiAgICAgICAgICAgIHAgPSBzcmM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgRXhjZXB0aW9uJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhlbkFyZ3MpIHtcbiAgICAgICAgICAgIHAgPSBuYXRpdmVUaGVuLmFwcGx5KHAsIHRoZW5BcmdzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodG9rZW4gJiYgdG9rZW4uY2FuY2VsYWJsZSkge1xuICAgICAgICAgICAgX3Rva2Vucy5zZXQocCwgdG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgcCBpbnN0YW5jZW9mIHRoaXMgfHwgT2JqZWN0LnNldFByb3RvdHlwZU9mKHAsIHRoaXMucHJvdG90eXBlKTtcblxuICAgICAgICByZXR1cm4gcCBhcyBDYW5jZWxhYmxlUHJvbWlzZTxUUmVzdWx0MSB8IFRSZXN1bHQyPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGV4ZWN1dG9yXG4gICAgICogIC0gYGVuYCBBIGNhbGxiYWNrIHVzZWQgdG8gaW5pdGlhbGl6ZSB0aGUgcHJvbWlzZS4gVGhpcyBjYWxsYmFjayBpcyBwYXNzZWQgdHdvIGFyZ3VtZW50cyBgcmVzb2x2ZWAgYW5kIGByZWplY3RgLlxuICAgICAqICAtIGBqYWAgcHJvbWlzZSDjga7liJ3mnJ/ljJbjgavkvb/nlKjjgZnjgovjgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrpouIGByZXNvbHZlYCDjgaggYHJlamVjdGAg44GuMuOBpOOBruW8leaVsOOCkuaMgeOBpFxuICAgICAqIEBwYXJhbSBjYW5jZWxUb2tlblxuICAgICAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIGluc3RhbmNlIGNyZWF0ZSBmcm9tIFtbQ2FuY2VsVG9rZW5dXS5gc291cmNlKClgLlxuICAgICAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dLmBzb3VyY2UoKWAg44KI44KK5L2c5oiQ44GX44GfIFtbQ2FuY2VsVG9rZW5dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgZXhlY3V0b3I6IChyZXNvbHZlOiAodmFsdWU/OiBUIHwgUHJvbWlzZUxpa2U8VD4pID0+IHZvaWQsIHJlamVjdDogKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQpID0+IHZvaWQsXG4gICAgICAgIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsXG4gICAgKSB7XG4gICAgICAgIHN1cGVyKGV4ZWN1dG9yKTtcbiAgICAgICAgcmV0dXJuIENhbmNlbGFibGVQcm9taXNlW19jcmVhdGVdKHRoaXMsIGNhbmNlbFRva2VuKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBjYWxsYmFja3MgZm9yIHRoZSByZXNvbHV0aW9uIGFuZC9vciByZWplY3Rpb24gb2YgdGhlIFByb21pc2UuXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvbmZ1bGZpbGxlZCBUaGUgY2FsbGJhY2sgdG8gZXhlY3V0ZSB3aGVuIHRoZSBQcm9taXNlIGlzIHJlc29sdmVkLlxuICAgICAqIEBwYXJhbSBvbnJlamVjdGVkIFRoZSBjYWxsYmFjayB0byBleGVjdXRlIHdoZW4gdGhlIFByb21pc2UgaXMgcmVqZWN0ZWQuXG4gICAgICogQHJldHVybnMgQSBQcm9taXNlIGZvciB0aGUgY29tcGxldGlvbiBvZiB3aGljaCBldmVyIGNhbGxiYWNrIGlzIGV4ZWN1dGVkLlxuICAgICAqL1xuICAgIHRoZW48VFJlc3VsdDEgPSBULCBUUmVzdWx0MiA9IG5ldmVyPihcbiAgICAgICAgb25mdWxmaWxsZWQ/OiAoKHZhbHVlOiBUKSA9PiBUUmVzdWx0MSB8IFByb21pc2VMaWtlPFRSZXN1bHQxPikgfCBudWxsLFxuICAgICAgICBvbnJlamVjdGVkPzogKChyZWFzb246IHVua25vd24pID0+IFRSZXN1bHQyIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDI+KSB8IG51bGxcbiAgICApOiBQcm9taXNlPFRSZXN1bHQxIHwgVFJlc3VsdDI+IHtcbiAgICAgICAgcmV0dXJuIENhbmNlbGFibGVQcm9taXNlW19jcmVhdGVdKHRoaXMsIF90b2tlbnMuZ2V0KHRoaXMpLCBbb25mdWxmaWxsZWQsIG9ucmVqZWN0ZWRdKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBhIGNhbGxiYWNrIGZvciBvbmx5IHRoZSByZWplY3Rpb24gb2YgdGhlIFByb21pc2UuXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvbnJlamVjdGVkIFRoZSBjYWxsYmFjayB0byBleGVjdXRlIHdoZW4gdGhlIFByb21pc2UgaXMgcmVqZWN0ZWQuXG4gICAgICogQHJldHVybnMgQSBQcm9taXNlIGZvciB0aGUgY29tcGxldGlvbiBvZiB0aGUgY2FsbGJhY2suXG4gICAgICovXG4gICAgY2F0Y2g8VFJlc3VsdDIgPSBuZXZlcj4ob25yZWplY3RlZD86ICgocmVhc29uOiB1bmtub3duKSA9PiBUUmVzdWx0MiB8IFByb21pc2VMaWtlPFRSZXN1bHQyPikgfCBudWxsKTogUHJvbWlzZTxUIHwgVFJlc3VsdDI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGhlbih1bmRlZmluZWQsIG9ucmVqZWN0ZWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGEgY2FsbGJhY2sgdGhhdCBpcyBpbnZva2VkIHdoZW4gdGhlIFByb21pc2UgaXMgc2V0dGxlZCAoZnVsZmlsbGVkIG9yIHJlamVjdGVkKS4gPGJyPlxuICAgICAqIFRoZSByZXNvbHZlZCB2YWx1ZSBjYW5ub3QgYmUgbW9kaWZpZWQgZnJvbSB0aGUgY2FsbGJhY2suXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvbmZpbmFsbHkgVGhlIGNhbGxiYWNrIHRvIGV4ZWN1dGUgd2hlbiB0aGUgUHJvbWlzZSBpcyBzZXR0bGVkIChmdWxmaWxsZWQgb3IgcmVqZWN0ZWQpLlxuICAgICAqIEByZXR1cm5zIEEgUHJvbWlzZSBmb3IgdGhlIGNvbXBsZXRpb24gb2YgdGhlIGNhbGxiYWNrLlxuICAgICAqL1xuICAgIGZpbmFsbHkob25maW5hbGx5PzogKCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkIHwgbnVsbCk6IFByb21pc2U8VD4ge1xuICAgICAgICByZXR1cm4gQ2FuY2VsYWJsZVByb21pc2VbX2NyZWF0ZV0oc3VwZXIuZmluYWxseShvbmZpbmFsbHkpLCBfdG9rZW5zLmdldCh0aGlzKSk7XG4gICAgfVxuXG59XG5cbi8qKlxuICogQGVuIFN3aXRjaCB0aGUgZ2xvYmFsIGBQcm9taXNlYCBjb25zdHJ1Y3RvciBgTmF0aXZlIFByb21pc2VgIG9yIFtbQ2FuY2VsYWJsZVByb21pc2VdXS4gPGJyPlxuICogICAgIGBOYXRpdmUgUHJvbWlzZWAgY29uc3RydWN0b3IgaXMgb3ZlcnJpZGRlbiBieSBmcmFtZXdvcmsgZGVmYXVsdCBiZWhhdmlvdXIuXG4gKiBAamEg44Kw44Ot44O844OQ44OrIGBQcm9taXNlYCDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jgpIgYE5hdGl2ZSBQcm9taXNlYCDjgb7jgZ/jga8gW1tDYW5jZWxhYmxlUHJvbWlzZV1dIOOBq+WIh+OCiuabv+OBiCA8YnI+XG4gKiAgICAg5pei5a6a44GnIGBOYXRpdmUgUHJvbWlzZWAg44KS44Kq44O844OQ44O844Op44Kk44OJ44GZ44KLLlxuICpcbiAqIEBwYXJhbSBlbmFibGVcbiAqICAtIGBlbmAgYHRydWVgOiB1c2UgW1tDYW5jZWxhYmxlUHJvbWlzZV1dIC8gIGBmYWxzZWA6IHVzZSBgTmF0aXZlIFByb21pc2VgXG4gKiAgLSBgamFgIGB0cnVlYDogW1tDYW5jZWxhYmxlUHJvbWlzZV1dIOOCkuS9v+eUqCAvIGBmYWxzZWA6IGBOYXRpdmUgUHJvbWlzZWAg44KS5L2/55SoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRlbmRQcm9taXNlKGVuYWJsZTogYm9vbGVhbik6IFByb21pc2VDb25zdHJ1Y3RvciB7XG4gICAgaWYgKGVuYWJsZSkge1xuICAgICAgICBQcm9taXNlID0gQ2FuY2VsYWJsZVByb21pc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgUHJvbWlzZSA9IE5hdGl2ZVByb21pc2U7XG4gICAgfVxuICAgIHJldHVybiBQcm9taXNlO1xufVxuXG4vKiogQGludGVybmFsIGdsb2JhbCBjb25maWcgb3B0aW9ucyAqL1xuaW50ZXJmYWNlIEdsb2JhbENvbmZpZyB7XG4gICAgbm9BdXRvbWF0aWNOYXRpdmVFeHRlbmQ6IGJvb2xlYW47XG59XG5cbi8vIGRlZmF1bHQ6IGF1dG9tYXRpYyBuYXRpdmUgcHJvbWlzZSBvdmVycmlkZS5cbmV4dGVuZFByb21pc2UoIWdldENvbmZpZzxHbG9iYWxDb25maWc+KCkubm9BdXRvbWF0aWNOYXRpdmVFeHRlbmQpO1xuXG5leHBvcnQge1xuICAgIENhbmNlbGFibGVQcm9taXNlLFxuICAgIENhbmNlbGFibGVQcm9taXNlIGFzIFByb21pc2UsXG59O1xuIiwiaW1wb3J0IHsgQ2FuY2VsVG9rZW4sIENhbmNlbFRva2VuU291cmNlIH0gZnJvbSAnLi9jYW5jZWwtdG9rZW4nO1xuXG4vKipcbiAqIEBlbiBDYW5jZWxhYmxlIGJhc2Ugb3B0aW9uIGRlZmluaXRpb24uXG4gKiBAamEg44Kt44Oj44Oz44K744Or5Y+v6IO944Gq5Z+65bqV44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuY2VsYWJsZSB7XG4gICAgY2FuY2VsPzogQ2FuY2VsVG9rZW47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBXYWl0IGZvciBwcm9taXNlcyBkb25lLiA8YnI+XG4gKiAgICAgV2hpbGUgY29udHJvbCB3aWxsIGJlIHJldHVybmVkIGltbWVkaWF0ZWx5IHdoZW4gYFByb21pc2UuYWxsKClgIGZhaWxzLCBidXQgdGhpcyBtZWh0b2Qgd2FpdHMgZm9yIGluY2x1ZGluZyBmYWlsdXJlLlxuICogQGphIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4jjga7ntYLkuobjgb7jgaflvoXmqZ8gPGJyPlxuICogICAgIGBQcm9taXNlLmFsbCgpYCDjga/lpLHmlZfjgZnjgovjgajjgZnjgZDjgavliLblvqHjgpLov5TjgZnjga7jgavlr77jgZfjgIHlpLHmlZfjgoLlkKvjgoHjgablvoXjgaQgYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICpcbiAqIEBwYXJhbSBwcm9taXNlc1xuICogIC0gYGVuYCBQcm9taXNlIGluc3RhbmNlIGFycmF5XG4gKiAgLSBgamFgIFByb21pc2Ug44Kk44Oz44K544K/44Oz44K544Gu6YWN5YiX44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3YWl0KHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10pOiBQcm9taXNlPHVua25vd25bXT4ge1xuICAgIGNvbnN0IHNhZmVQcm9taXNlcyA9IHByb21pc2VzLm1hcCgocHJvbWlzZSkgPT4gcHJvbWlzZS5jYXRjaCgoZSkgPT4gZSkpO1xuICAgIHJldHVybiBQcm9taXNlLmFsbChzYWZlUHJvbWlzZXMpO1xufVxuXG4vKipcbiAqIEBlbiBDYW5jZWxsYXRpb24gY2hlY2tlciBtZXRob2QuIDxicj5cbiAqICAgICBJdCdzIHByYWN0aWNhYmxlIGJ5IGBhc3luYyBmdW5jdGlvbmAuXG4gKiBAamEg44Kt44Oj44Oz44K744Or44OB44Kn44OD44Kr44O8IDxicj5cbiAqICAgICBgYXN5bmMgZnVuY3Rpb25gIOOBp+S9v+eUqOWPr+iDvVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogIGFzeW5jIGZ1bmN0aW9uIHNvbWVGdW5jKHRva2VuOiBDYW5jZWxUb2tlbik6IFByb21pc2U8e30+IHtcbiAqICAgIGF3YWl0IGNoZWNrQ2FuY2VsZWQodG9rZW4pO1xuICogICAgcmV0dXJuIHt9O1xuICogIH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tDYW5jZWxlZCh0b2tlbjogQ2FuY2VsVG9rZW4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHVuZGVmaW5lZCwgdG9rZW4pO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIG1hbmFnZXMgbHVtcGluZyBtdWx0aXBsZSBgUHJvbWlzZWAgb2JqZWN0cy4gPGJyPlxuICogICAgIEl0J3MgcG9zc2libGUgdG8gbWFrZSB0aGVtIGNhbmNlbCBtb3JlIHRoYW4gb25lIGBQcm9taXNlYCB3aGljaCBoYW5kbGVzIGRpZmZlcmVudCBbW0NhbmNlbFRva2VuXV0gYnkgbHVtcGluZy5cbiAqIEBqYSDopIfmlbAgYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiOOCkuS4gOaLrOeuoeeQhuOBmeOCi+OCr+ODqeOCuSA8YnI+XG4gKiAgICAg55Ww44Gq44KLIFtbQ2FuY2VsVG9rZW5dXSDjgpLmibHjgYbopIfmlbDjga4gYFByb21pc2VgIOOCkuS4gOaLrOOBp+OCreODo+ODs+OCu+ODq+OBleOBm+OCi+OBk+OBqOOBjOWPr+iDvVxuICovXG5leHBvcnQgY2xhc3MgUHJvbWlzZU1hbmFnZXIge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBmdW5jLWNhbGwtc3BhY2luZ1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Bvb2wgPSBuZXcgTWFwPFByb21pc2U8dW5rbm93bj4sICgocmVhc29uOiB1bmtub3duKSA9PiB1bmtub3duKSB8IHVuZGVmaW5lZD4oKTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgYSBgUHJvbWlzZWAgb2JqZWN0IHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OI44KS566h55CG5LiL44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvbWlzZVxuICAgICAqICAtIGBlbmAgYW55IGBQcm9taXNlYCBpbnN0YW5jZSBpcyBhdmFpbGFibGUuXG4gICAgICogIC0gYGphYCDku7vmhI/jga4gYFByb21pc2VgIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEBwYXJhbSBjYW5jZWxTb3VyY2VcbiAgICAgKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5Tb3VyY2VdXSBpbnN0YW5jZSBtYWRlIGJ5IGBDYW5jZWxUb2tlbi5zb3VyY2UoKWAuXG4gICAgICogIC0gYGphYCBgQ2FuY2VsVG9rZW4uc291cmNlKClgIOOBp+eUn+aIkOOBleOCjOOCiyBbW0NhbmNlbFRva2VuU291cmNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJldHVybiB0aGUgc2FtZSBpbnN0YW5jZSBvZiBpbnB1dCBgcHJvbWlzZWAgaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDlhaXlipvjgZfjgZ8gYHByb21pc2VgIOOBqOWQjOS4gOOCpOODs+OCueOCv+ODs+OCueOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBhZGQ8VD4ocHJvbWlzZTogUHJvbWlzZTxUPiwgY2FuY2VsU291cmNlPzogQ2FuY2VsVG9rZW5Tb3VyY2UpOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgdGhpcy5fcG9vbC5zZXQocHJvbWlzZSwgY2FuY2VsU291cmNlICYmIGNhbmNlbFNvdXJjZS5jYW5jZWwpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuXG4gICAgICAgIGNvbnN0IGFsd2F5cyA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3Bvb2wuZGVsZXRlKHByb21pc2UpO1xuICAgICAgICAgICAgaWYgKGNhbmNlbFNvdXJjZSkge1xuICAgICAgICAgICAgICAgIGNhbmNlbFNvdXJjZS5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHByb21pc2VcbiAgICAgICAgICAgIC50aGVuKGFsd2F5cywgYWx3YXlzKTtcblxuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVsZWFzZWQgYWxsIGluc3RhbmNlcyB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44KS56C05qOEXG4gICAgICovXG4gICAgcHVibGljIHJlbGVhc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Bvb2wuY2xlYXIoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGBwcm9taXNlYCBhcnJheSBmcm9tIHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjga4gUHJvbWlzZSDjgpLphY3liJfjgaflj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJvbWlzZXMoKTogUHJvbWlzZTx1bmtub3duPltdIHtcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzLl9wb29sLmtleXMoKV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbGwgYFByb21pc2UuYWxsKClgIGZvciB1bmRlciB0aGUgbWFuYWdlbWVudC4gPGJyPlxuICAgICAqICAgICBXYWl0IGZvciBhbGwgYGZ1bGxmaWxsZWRgLlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgavlr77jgZfjgaYgYFByb21pc2UuYWxsKClgIDxicj5cbiAgICAgKiAgICAg44GZ44G544Gm44GMIGBmdWxsZmlsbGVkYCDjgavjgarjgovjgb7jgaflvoXmqZ9cbiAgICAgKi9cbiAgICBwdWJsaWMgYWxsKCk6IFByb21pc2U8dW5rbm93bltdPiB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbCh0aGlzLnByb21pc2VzKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYWxsIGBQcm9taXNlLnJhY2UoKWAgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50LiA8YnI+XG4gICAgICogICAgIFdhaXQgZm9yIGFueSBgc2V0dGxlZGAuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBq+WvvuOBl+OBpiBgUHJvbWlzZS5yYWNlKClgIDxicj5cbiAgICAgKiAgICAg44GE44Ga44KM44GL44GMIGBzZXR0bGVkYCDjgavjgarjgovjgb7jgaflvoXmqZ9cbiAgICAgKi9cbiAgICBwdWJsaWMgcmFjZSgpOiBQcm9taXNlPHVua25vd24+IHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmFjZSh0aGlzLnByb21pc2VzKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYWxsIFtbd2FpdF1dKCkgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50LiA8YnI+XG4gICAgICogICAgIFdhaXQgZm9yIGFsbCBgc2V0dGxlZGAuIChzaW1wbGlmaWVkIHZlcnNpb24pXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBq+WvvuOBl+OBpiBbW3dhaXRdXSgpIDxicj5cbiAgICAgKiAgICAg44GZ44G544Gm44GMIGBzZXR0bGVkYCDjgavjgarjgovjgb7jgaflvoXmqZ8gKOewoeaYk+ODkOODvOOCuOODp+ODsylcbiAgICAgKi9cbiAgICBwdWJsaWMgd2FpdCgpOiBQcm9taXNlPHVua25vd25bXT4ge1xuICAgICAgICByZXR1cm4gd2FpdCh0aGlzLnByb21pc2VzKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYWxsIGBQcm9taXNlLmFsbFNldHRsZWQoKWAgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50LiA8YnI+XG4gICAgICogICAgIFdhaXQgZm9yIGFsbCBgc2V0dGxlZGAuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBq+WvvuOBl+OBpiBgUHJvbWlzZS5hbGxTZXR0bGVkKClgIDxicj5cbiAgICAgKiAgICAg44GZ44G544Gm44GMIGBzZXR0bGVkYCDjgavjgarjgovjgb7jgaflvoXmqZ9cbiAgICAgKi9cbiAgICBwdWJsaWMgYWxsU2V0dGxlZCgpOiBQcm9taXNlPFByb21pc2VTZXR0bGVkUmVzdWx0PHVua25vd24+W10+IHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsU2V0dGxlZCh0aGlzLnByb21pc2VzKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYWxsIGBQcm9taXNlLmFueSgpYCBmb3IgdW5kZXIgdGhlIG1hbmFnZW1lbnQuIDxicj5cbiAgICAgKiAgICAgV2FpdCBmb3IgYW55IGBmdWxsZmlsbGVkYC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44Gr5a++44GX44GmIGBQcm9taXNlLmFueSgpYCA8YnI+XG4gICAgICogICAgIOOBhOOBmuOCjOOBi+OBjCBgZnVsbGZpbGxlZGAg44Gr44Gq44KL44G+44Gn5b6F5qmfXG4gICAgICovXG4gICAgcHVibGljIGFueSgpOiBQcm9taXNlPHVua25vd24+IHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYW55KHRoaXMucHJvbWlzZXMoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEludm9rZSBgY2FuY2VsYCBtZXNzYWdlIGZvciB1bmRlciB0aGUgbWFuYWdlbWVudCBwcm9taXNlcy5cbiAgICAgKiBAamEg566h55CG5a++6LGh44GuIGBQcm9taXNlYCDjgavlr77jgZfjgabjgq3jg6Pjg7Pjgrvjg6vjgpLnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSByZWFzb25cbiAgICAgKiAgLSBgZW5gIGFyZ3VtZW50cyBmb3IgYGNhbmNlbFNvdXJjZWBcbiAgICAgKiAgLSBgamFgIGBjYW5jZWxTb3VyY2VgIOOBq+a4oeOBleOCjOOCi+W8leaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgUHJvbWlzZWAgaW5zdGFuY2Ugd2hpY2ggd2FpdCBieSB1bnRpbCBjYW5jZWxsYXRpb24gY29tcGxldGlvbi5cbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODq+WujOS6huOBvuOBp+W+heapn+OBmeOCiyBbW1Byb21pc2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgYWJvcnQ8VD4ocmVhc29uPzogVCk6IFByb21pc2U8dW5rbm93bltdPiB7XG4gICAgICAgIGZvciAoY29uc3QgY2FuY2VsZXIgb2YgdGhpcy5fcG9vbC52YWx1ZXMoKSkge1xuICAgICAgICAgICAgaWYgKGNhbmNlbGVyKSB7XG4gICAgICAgICAgICAgICAgY2FuY2VsZXIoXG4gICAgICAgICAgICAgICAgICAgIChudWxsICE9IHJlYXNvbikgPyByZWFzb24gOiBuZXcgRXJyb3IoJ2Fib3J0JylcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3YWl0KHRoaXMucHJvbWlzZXMoKSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBpc1N0cmluZyxcbiAgICBpc1N5bWJvbCxcbiAgICBjbGFzc05hbWUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcblxuLyoqIEBpbnRlcm5hbCBFdmVudEJyb2tlclByb3h5ICovXG5leHBvcnQgY2xhc3MgRXZlbnRCcm9rZXJQcm94eTxFdmVudCBleHRlbmRzIG9iamVjdD4ge1xuICAgIHByaXZhdGUgX2Jyb2tlcj86IEV2ZW50QnJva2VyPEV2ZW50PjtcbiAgICBwdWJsaWMgZ2V0KCk6IEV2ZW50QnJva2VyPEV2ZW50PiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9icm9rZXIgfHwgKHRoaXMuX2Jyb2tlciA9IG5ldyBFdmVudEJyb2tlcigpKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IF9pbnRlcm5hbCAgICAgID0gU3ltYm9sKCdpbnRlcm5hbCcpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgX25vdGlmeSAgICAgICAgPSBTeW1ib2woJ25vdGlmeScpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgX3N0b2NrQ2hhbmdlICAgPSBTeW1ib2woJ3N0b2NrLWNoYW5nZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgX25vdGlmeUNoYW5nZXMgPSBTeW1ib2woJ25vdGlmeS1jaGFuZ2VzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiB2ZXJpZnlPYnNlcnZhYmxlKHg6IHVua25vd24pOiB2b2lkIHwgbmV2ZXIge1xuICAgIGlmICgheCB8fCAhKHggYXMgb2JqZWN0KVtfaW50ZXJuYWxdKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFRoZSBvYmplY3QgcGFzc2VkIGlzIG5vdCBhbiBJT2JzZXJ2YWJsZS5gKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiB2ZXJpZnlWYWxpZEtleShrZXk6IHVua25vd24pOiB2b2lkIHwgbmV2ZXIge1xuICAgIGlmIChpc1N0cmluZyhrZXkpIHx8IGlzU3ltYm9sKGtleSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBUeXBlIG9mICR7Y2xhc3NOYW1lKGtleSl9IGlzIG5vdCBhIHZhbGlkIGtleS5gKTtcbn1cbiIsImltcG9ydCB7IFN1YnNjcmlwdGlvbiwgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBfaW50ZXJuYWwgfSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gRXZlbnQgb2JzZXJ2YXRpb24gc3RhdGUgZGVmaW5pdGlvbi5cbiAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvlrprnvqlcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gT2JzZXJ2YWJsZVN0YXRlIHtcbiAgICAvKiogb2JzZXJ2YWJsZSByZWFkeSAqL1xuICAgIEFDVElWRSAgID0gJ2FjdGl2ZScsXG4gICAgLyoqIE5PVCBvYnNlcnZlZCwgYnV0IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkLiAqL1xuICAgIFNVU0VQTkRFRCA9ICdzdXNwZW5kZWQnLFxuICAgIC8qKiBOT1Qgb2JzZXJ2ZWQsIGFuZCBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMuICovXG4gICAgRElTQUJMRUQgPSAnZGlzYWJsZWQnLFxufVxuXG4vKipcbiAqIEBlbiBPYnNlcnZhYmxlIGNvbW1vbiBpbnRlcmZhY2UuXG4gKiBAamEgT2JzZXJ2YWJsZSDlhbHpgJrjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJT2JzZXJ2YWJsZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICovXG4gICAgb24oLi4uYXJnczogdW5rbm93bltdKTogU3Vic2NyaXB0aW9uO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKi9cbiAgICBvZmYoLi4uYXJnczogdW5rbm93bltdKTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdXNwZW5kIG9yIGRpc2FibGUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jgrXjgrnjg5rjg7Pjg4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub1JlY29yZFxuICAgICAqICAtIGBlbmAgYHRydWVgOiBub3QgcmVjb3JkaW5nIHByb3BlcnR5IGNoYW5nZXMgYW5kIGNsZWFyIGNoYW5nZXMuIC8gYGZhbHNlYDogcHJvcGVydHkgY2hhbmdlcyBhcmUgcmVjb3JkZWQgYW5kIGZpcmVkIHdoZW4gW1tyZXN1bWVdXSgpIGNhbGxkZWQuIChkZWZhdWx0KVxuICAgICAqICAtIGBqYWAgYHRydWVgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7TjgoLoqJjpjLLjgZvjgZosIOePvuWcqOOBruiomOmMsuOCguegtOajhCAvIGBmYWxzZWA6IOODl+ODreODkeODhuOCo+WkieabtOOBr+iomOmMsuOBleOCjCwgW1tyZXN1bWVdXSgpIOaZguOBq+eZuueBq+OBmeOCiyAo5pei5a6aKVxuICAgICAqL1xuICAgIHN1c3BlbmQobm9SZWNvcmQ/OiBib29sZWFuKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXN1bWUgdGhlIGV2ZW50IG9ic2VydmF0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jg6rjgrjjg6Xjg7zjg6BcbiAgICAgKi9cbiAgICByZXN1bWUoKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBvYnNlcnZhdGlvbiBzdGF0ZVxuICAgICAqIEBqYSDos7zoqq3lj6/og73nirbmhYtcbiAgICAgKi9cbiAgICBnZXRPYnNlcnZhYmxlU3RhdGUoKTogT2JzZXJ2YWJsZVN0YXRlO1xufVxuXG4vKipcbiAqIEBlbiBJbnRlcmZhY2UgYWJsZSB0byBhY2Nlc3MgdG8gW1tFdmVudEJyb2tlcl1dIHdpdGggW1tJT2JzZXJ2YWJsZV1dLlxuICogQGphIFtbSU9ic2VydmFibGVdXSDjga7mjIHjgaTlhoXpg6ggW1tFdmVudEJyb2tlcl1dIOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIElPYnNlcnZhYmxlRXZlbnRCcm9rZXJBY2Nlc3M8VCBleHRlbmRzIG9iamVjdCA9IGFueT4gZXh0ZW5kcyBJT2JzZXJ2YWJsZSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgW1tFdmVudEJyb2tlcl1dIGluc3RhbmNlLlxuICAgICAqIEBqYSBbW0V2ZW50QnJva2VyXV0g44Kk44Oz44K544K/44Oz44K544Gu5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0QnJva2VyKCk6IEV2ZW50QnJva2VyPFQ+O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBbW0lPYnNlcnZhYmxlXV0uXG4gKiBAamEgW1tJT2JzZXJ2YWJsZV1dIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT2JzZXJ2YWJsZSh4OiB1bmtub3duKTogeCBpcyBJT2JzZXJ2YWJsZSB7XG4gICAgcmV0dXJuIEJvb2xlYW4oeCAmJiAoeCBhcyBvYmplY3QpW19pbnRlcm5hbF0pO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgTm9uRnVuY3Rpb25Qcm9wZXJ0aWVzLFxuICAgIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lcyxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIHZlcmlmeSxcbiAgICBwb3N0LFxuICAgIGRlZXBNZXJnZSxcbiAgICBkZWVwRXF1YWwsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24sIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBFdmVudEJyb2tlclByb3h5LFxuICAgIF9pbnRlcm5hbCxcbiAgICBfbm90aWZ5LFxuICAgIF9zdG9ja0NoYW5nZSxcbiAgICBfbm90aWZ5Q2hhbmdlcyxcbiAgICB2ZXJpZnlPYnNlcnZhYmxlLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IE9ic2VydmFibGVTdGF0ZSwgSU9ic2VydmFibGUgfSBmcm9tICcuL2NvbW1vbic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBJbnRlcm5hbFByb3BzIHtcbiAgICBzdGF0ZTogT2JzZXJ2YWJsZVN0YXRlO1xuICAgIGNoYW5nZWQ6IGJvb2xlYW47XG4gICAgcmVhZG9ubHkgY2hhbmdlTWFwOiBNYXA8UHJvcGVydHlLZXksIGFueT47XG4gICAgcmVhZG9ubHkgYnJva2VyOiBFdmVudEJyb2tlclByb3h5PGFueT47XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9wcm94eUhhbmRsZXI6IFByb3h5SGFuZGxlcjxPYnNlcnZhYmxlT2JqZWN0PiA9IHtcbiAgICBzZXQodGFyZ2V0LCBwLCB2YWx1ZSwgcmVjZWl2ZXIpIHtcbiAgICAgICAgaWYgKCFpc1N0cmluZyhwKSkge1xuICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3Quc2V0KHRhcmdldCwgcCwgdmFsdWUsIHJlY2VpdmVyKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtwXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gdGFyZ2V0W19pbnRlcm5hbF0uc3RhdGUgJiYgdmFsdWUgIT09IG9sZFZhbHVlKSB7XG4gICAgICAgICAgICB0YXJnZXRbX3N0b2NrQ2hhbmdlXShwLCBvbGRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFJlZmxlY3Quc2V0KHRhcmdldCwgcCwgdmFsdWUsIHJlY2VpdmVyKTtcbiAgICB9LFxufTtcbk9iamVjdC5mcmVlemUoX3Byb3h5SGFuZGxlcik7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBPYnNlcnZhYmxlIGtleSB0eXBlIGRlZmluaXRpb24uXG4gKiBAamEg6LO86Kqt5Y+v6IO944Gq44Kt44O844Gu5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIE9ic2VydmFibGVLZXlzPFQgZXh0ZW5kcyBPYnNlcnZhYmxlT2JqZWN0PiA9IE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxUPjtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSBvYmplY3QgY2xhc3Mgd2hpY2ggY2hhbmdlIGNhbiBiZSBvYnNlcnZlZC5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7lpInmm7TjgpLnm6PoppbjgafjgY3jgovjgqrjg5bjgrjjgqfjgq/jg4jjgq/jg6njgrlcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogLSBCYXNpYyBVc2FnZVxuICpcbiAqIGBgYHRzXG4gKiBjbGFzcyBFeGFtcGxlIGV4dGVuZHMgT2JzZXJ2YWJsZU9iamVjdCB7XG4gKiAgIHB1YmxpYyBhOiBudW1iZXIgPSAwO1xuICogICBwdWJsaWMgYjogbnVtYmVyID0gMDtcbiAqICAgcHVibGljIGdldCBzdW0oKTogbnVtYmVyIHtcbiAqICAgICAgIHJldHVybiB0aGlzLmEgKyB0aGlzLmI7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBvYnNlcnZhYmxlID0gbmV3IEV4YW1wbGUoKTtcbiAqXG4gKiBmdW5jdGlvbiBvbk51bUNoYW5nZShuZXdWYWx1ZTogbnVtYmVyLCBvbGRWYWx1ZTogbnVtYmVyLCBrZXk6IHN0cmluZykge1xuICogICBjb25zb2xlLmxvZyhgJHtrZXl9IGNoYW5nZWQgZnJvbSAke29sZFZhbHVlfSB0byAke25ld1ZhbHVlfS5gKTtcbiAqIH1cbiAqIG9ic2VydmFibGUub24oWydhJywgJ2InXSwgb25OdW1DaGFuZ2UpO1xuICpcbiAqIC8vIHVwZGF0ZVxuICogb2JzZXJ2YWJsZS5hID0gMTAwO1xuICogb2JzZXJ2YWJsZS5iID0gMjAwO1xuICpcbiAqIC8vIGNvbnNvbGUgb3V0IGZyb20gYGFzeW5jYCBldmVudCBsb29wLlxuICogLy8gPT4gJ2EgY2hhbmdlZCBmcm9tIDAgdG8gMTAwLidcbiAqIC8vID0+ICdiIGNoYW5nZWQgZnJvbSAwIHRvIDIwMC4nXG4gKlxuICogOlxuICpcbiAqIGZ1bmN0aW9uIG9uU3VtQ2hhbmdlKG5ld1ZhbHVlOiBudW1iZXIsIG9sZFZhbHVlOiBudW1iZXIpIHtcbiAqICAgY29uc29sZS5sb2coYHN1bSBjaGFuZ2VkIGZyb20gJHtvbGRWYWx1ZX0gdG8gJHtuZXdWYXVlfS5gKTtcbiAqIH1cbiAqIG9ic2VydmFibGUub24oJ3N1bScsIG9uU3VtQ2hhbmdlKTtcbiAqXG4gKiAvLyB1cGRhdGVcbiAqIG9ic2VydmFibGUuYSA9IDEwMDsgLy8gbm90aGluZyByZWFjdGlvbiBiZWNhdXNlIG9mIG5vIGNoYW5nZSBwcm9wZXJ0aWVzLlxuICogb2JzZXJ2YWJsZS5hID0gMjAwO1xuICpcbiAqIC8vIGNvbnNvbGUgb3V0IGZyb20gYGFzeW5jYCBldmVudCBsb29wLlxuICogLy8gPT4gJ3N1bSBjaGFuZ2VkIGZyb20gMzAwIHRvIDQwMC4nXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIE9ic2VydmFibGVPYmplY3QgaW1wbGVtZW50cyBJT2JzZXJ2YWJsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19pbnRlcm5hbF06IEludGVybmFsUHJvcHM7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBpbml0aWFsIHN0YXRlLiBkZWZhdWx0OiBbW09ic2VydmFibGVTdGF0ZS5BQ1RJVkVdXVxuICAgICAqICAtIGBqYWAg5Yid5pyf54q25oWLIOaXouWumjogW1tPYnNlcnZhYmxlU3RhdGUuQUNUSVZFXV1cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzdGF0ZSA9IE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUpIHtcbiAgICAgICAgdmVyaWZ5KCdpbnN0YW5jZU9mJywgT2JzZXJ2YWJsZU9iamVjdCwgdGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsOiBJbnRlcm5hbFByb3BzID0ge1xuICAgICAgICAgICAgc3RhdGUsXG4gICAgICAgICAgICBjaGFuZ2VkOiBmYWxzZSxcbiAgICAgICAgICAgIGNoYW5nZU1hcDogbmV3IE1hcCgpLFxuICAgICAgICAgICAgYnJva2VyOiBuZXcgRXZlbnRCcm9rZXJQcm94eTx0aGlzPigpLFxuICAgICAgICB9O1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgX2ludGVybmFsLCB7IHZhbHVlOiBPYmplY3Quc2VhbChpbnRlcm5hbCkgfSk7XG4gICAgICAgIHJldHVybiBuZXcgUHJveHkodGhpcywgX3Byb3h5SGFuZGxlcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSU9ic2VydmFibGVcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgcHJvcGVydHkgY2hhbmdlcy5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5aSJ5pu06LO86Kqt6Kit5a6aICjlhajjg5fjg63jg5Hjg4bjgqPnm6PoppYpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydHlcbiAgICAgKiAgLSBgZW5gIHdpbGQgY29yZCBzaWduYXR1cmUuXG4gICAgICogIC0gYGphYCDjg6/jgqTjg6vjg4njgqvjg7zjg4lcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBwcm9wZXJ0eSBjaGFuZ2UuXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlpInmm7TpgJrnn6XjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbihwcm9wZXJ0eTogJ0AnLCBsaXN0ZW5lcjogKGNvbnRleHQ6IE9ic2VydmFibGVPYmplY3QpID0+IHVua25vd24pOiBTdWJzY3JpcHRpb247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIHByb3BlcnR5IGNoYW5nZShzKS5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5aSJ5pu06LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydHlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eS5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIHByb3BlcnR5IGNoYW5nZS5cbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uPEsgZXh0ZW5kcyBPYnNlcnZhYmxlS2V5czx0aGlzPj4ocHJvcGVydHk6IEsgfCBLW10sIGxpc3RlbmVyOiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IHVua25vd24pOiBTdWJzY3JpcHRpb247XG5cbiAgICBvbjxLIGV4dGVuZHMgT2JzZXJ2YWJsZUtleXM8dGhpcz4+KHByb3BlcnR5OiBLIHwgS1tdLCBsaXN0ZW5lcjogKG5ld1ZhbHVlOiB0aGlzW0tdLCBvbGRWYWx1ZTogdGhpc1tLXSwga2V5OiBLKSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgeyBjaGFuZ2VNYXAsIGJyb2tlciB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBicm9rZXIuZ2V0KCkub24ocHJvcGVydHksIGxpc3RlbmVyKTtcbiAgICAgICAgaWYgKDAgPCBjaGFuZ2VNYXAuc2l6ZSkge1xuICAgICAgICAgICAgY29uc3QgcHJvcHMgPSBpc0FycmF5KHByb3BlcnR5KSA/IHByb3BlcnR5IDogW3Byb3BlcnR5XTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wcykge1xuICAgICAgICAgICAgICAgIGNoYW5nZU1hcC5oYXMocHJvcCkgfHwgY2hhbmdlTWFwLnNldChwcm9wLCB0aGlzW3Byb3BdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBwcm9wZXJ0eSBjaGFuZ2VzKVxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlpInmm7Tos7zoqq3op6PpmaQgKOWFqOODl+ODreODkeODhuOCo+ebo+imlilcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0eVxuICAgICAqICAtIGBlbmAgd2lsZCBjb3JkIHNpZ25hdHVyZS5cbiAgICAgKiAgLSBgamFgIOODr+OCpOODq+ODieOCq+ODvOODiVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIHByb3BlcnR5IGNoYW5nZS5cbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9mZihwcm9wZXJ0eTogJ0AnLCBsaXN0ZW5lcj86IChjb250ZXh0OiBPYnNlcnZhYmxlT2JqZWN0KSA9PiBhbnkpOiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIHByb3BlcnR5IGNoYW5nZShzKS5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5aSJ5pu06LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydHlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eS5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm6Kej6ZmkXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgcHJvcGVydHkgY2hhbmdlLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvZmY8SyBleHRlbmRzIE9ic2VydmFibGVLZXlzPHRoaXM+Pihwcm9wZXJ0eT86IEsgfCBLW10sIGxpc3RlbmVyPzogKG5ld1ZhbHVlOiB0aGlzW0tdLCBvbGRWYWx1ZTogdGhpc1tLXSwga2V5OiBLKSA9PiB1bmtub3duKTogdm9pZDtcblxuICAgIG9mZjxLIGV4dGVuZHMgT2JzZXJ2YWJsZUtleXM8dGhpcz4+KHByb3BlcnR5PzogSyB8IEtbXSwgbGlzdGVuZXI/OiAobmV3VmFsdWU6IHRoaXNbS10sIG9sZFZhbHVlOiB0aGlzW0tdLCBrZXk6IEspID0+IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmJyb2tlci5nZXQoKS5vZmYocHJvcGVydHksIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3VzcGVuZCBvciBkaXNhYmxlIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44K144K544Oa44Oz44OJXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm9SZWNvcmRcbiAgICAgKiAgLSBgZW5gIGB0cnVlYDogbm90IHJlY29yZGluZyBwcm9wZXJ0eSBjaGFuZ2VzIGFuZCBjbGVhciBjaGFuZ2VzLiAvIGBmYWxzZWA6IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkIGFuZCBmaXJlZCB3aGVuIFtbcmVzdW1lXV0oKSBjYWxsZGVkLiAoZGVmYXVsdClcbiAgICAgKiAgLSBgamFgIGB0cnVlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044KC6KiY6Yyy44Gb44GaLCDnj77lnKjjga7oqJjpjLLjgoLnoLTmo4QgLyBgZmFsc2VgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7Tjga/oqJjpjLLjgZXjgowsIFtbcmVzdW1lXV0oKSDmmYLjgavnmbrngavjgZnjgosgKOaXouWumilcbiAgICAgKi9cbiAgICBzdXNwZW5kKG5vUmVjb3JkID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLnN0YXRlID0gbm9SZWNvcmQgPyBPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgOiBPYnNlcnZhYmxlU3RhdGUuU1VTRVBOREVEO1xuICAgICAgICBpZiAobm9SZWNvcmQpIHtcbiAgICAgICAgICAgIHRoaXNbX2ludGVybmFsXS5jaGFuZ2VNYXAuY2xlYXIoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzdW1lIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44Oq44K444Ol44O844OgXG4gICAgICovXG4gICAgcmVzdW1lKCk6IHRoaXMge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgIT09IGludGVybmFsLnN0YXRlKSB7XG4gICAgICAgICAgICBpbnRlcm5hbC5zdGF0ZSA9IE9ic2VydmFibGVTdGF0ZS5BQ1RJVkU7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4gdGhpc1tfbm90aWZ5Q2hhbmdlc10oKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIG9ic2VydmF0aW9uIHN0YXRlXG4gICAgICogQGphIOizvOiqreWPr+iDveeKtuaFi1xuICAgICAqL1xuICAgIGdldE9ic2VydmFibGVTdGF0ZSgpOiBPYnNlcnZhYmxlU3RhdGUge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpc1tfaW50ZXJuYWxdLnN0YXRlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElPYnNlcnZhYmxlRXZlbnRCcm9rZXJBY2Nlc3NcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBnZXRCcm9rZXIoKTogRXZlbnRCcm9rZXI8Tm9uRnVuY3Rpb25Qcm9wZXJ0aWVzPHRoaXM+PiB7XG4gICAgICAgIGNvbnN0IHsgYnJva2VyIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIHJldHVybiBicm9rZXIuZ2V0KCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIFtbT2JzZXJ2YWJsZU9iamVjdF1dIGZyb20gYW55IG9iamVjdC5cbiAgICAgKiBAamEg5Lu75oSP44Gu44Kq44OW44K444Kn44Kv44OI44GL44KJIFtbT2JzZXJ2YWJsZU9iamVjdF1dIOOCkueUn+aIkFxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBjb25zdCBvYnNlcnZhYmxlID0gT2JzZXJ2YWJsZU9iamVjdC5mcm9tKHsgYTogMSwgYjogMSB9KTtcbiAgICAgKiBmdW5jdGlvbiBvbk51bUNoYW5nZShuZXdWYWx1ZTogbnVtYmVyLCBvbGRWYWx1ZTogbnVtYmVyLCBrZXk6IHN0cmluZykge1xuICAgICAqICAgY29uc29sZS5sb2coYCR7a2V5fSBjaGFuZ2VkIGZyb20gJHtvbGRWYWx1ZX0gdG8gJHtuZXdWYWx1ZX0uYCk7XG4gICAgICogfVxuICAgICAqIG9ic2VydmFibGUub24oWydhJywgJ2InXSwgb25OdW1DaGFuZ2UpO1xuICAgICAqXG4gICAgICogLy8gdXBkYXRlXG4gICAgICogb2JzZXJ2YWJsZS5hID0gMTAwO1xuICAgICAqIG9ic2VydmFibGUuYiA9IDIwMDtcbiAgICAgKlxuICAgICAqIC8vIGNvbnNvbGUgb3V0IGZyb20gYGFzeW5jYCBldmVudCBsb29wLlxuICAgICAqIC8vID0+ICdhIGNoYW5nZWQgZnJvbSAxIHRvIDEwMC4nXG4gICAgICogLy8gPT4gJ2IgY2hhbmdlZCBmcm9tIDEgdG8gMjAwLidcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGZyb208VCBleHRlbmRzIG9iamVjdD4oc3JjOiBUKTogT2JzZXJ2YWJsZU9iamVjdCAmIFQge1xuICAgICAgICBjb25zdCBvYnNlcnZhYmxlID0gZGVlcE1lcmdlKG5ldyBjbGFzcyBleHRlbmRzIE9ic2VydmFibGVPYmplY3QgeyB9KE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCksIHNyYyk7XG4gICAgICAgIG9ic2VydmFibGUucmVzdW1lKCk7XG4gICAgICAgIHJldHVybiBvYnNlcnZhYmxlIGFzIGFueTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcm90ZWN0ZWQgbWVodG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBGb3JjZSBub3RpZnkgcHJvcGVydHkgY2hhbmdlKHMpIGluIHNwaXRlIG9mIGFjdGl2ZSBzdGF0ZS5cbiAgICAgKiBAamEg44Ki44Kv44OG44Kj44OW54q25oWL44Gr44GL44GL44KP44KJ44Ga5by35Yi255qE44Gr44OX44Ot44OR44OG44Kj5aSJ5pu06YCa55+l44KS55m66KGMXG4gICAgICovXG4gICAgcHJvdGVjdGVkIG5vdGlmeSguLi5wcm9wZXJ0aWVzOiBzdHJpbmdbXSk6IHZvaWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICBpZiAoMCA9PT0gcHJvcGVydGllcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB7IGNoYW5nZU1hcCB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCBrZXlWYWx1ZSA9IG5ldyBNYXA8UHJvcGVydHlLZXksIFthbnksIGFueV0+KCk7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gdGhpc1trZXldO1xuICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBjaGFuZ2VNYXAuaGFzKGtleSkgPyBjaGFuZ2VNYXAuZ2V0KGtleSkgOiBuZXdWYWx1ZTtcbiAgICAgICAgICAgIGtleVZhbHVlLnNldChrZXksIFtuZXdWYWx1ZSwgb2xkVmFsdWVdKTtcbiAgICAgICAgfVxuICAgICAgICAwIDwga2V5VmFsdWUuc2l6ZSAmJiB0aGlzW19ub3RpZnldKGtleVZhbHVlKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1laHRvZHM6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX3N0b2NrQ2hhbmdlXShwOiBzdHJpbmcsIG9sZFZhbHVlOiBhbnkpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZSwgY2hhbmdlTWFwLCBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLmNoYW5nZWQgPSB0cnVlO1xuICAgICAgICBpZiAoMCA9PT0gY2hhbmdlTWFwLnNpemUpIHtcbiAgICAgICAgICAgIGNoYW5nZU1hcC5zZXQocCwgb2xkVmFsdWUpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBrIG9mIGJyb2tlci5nZXQoKS5jaGFubmVscygpKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlTWFwLmhhcyhrKSB8fCBjaGFuZ2VNYXAuc2V0KGssIHRoaXNba10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5BQ1RJVkUgPT09IHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHRoaXNbX25vdGlmeUNoYW5nZXNdKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2hhbmdlTWFwLmhhcyhwKSB8fCBjaGFuZ2VNYXAuc2V0KHAsIG9sZFZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfbm90aWZ5Q2hhbmdlc10oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgc3RhdGUsIGNoYW5nZU1hcCB9ID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSAhPT0gc3RhdGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBrZXlWYWx1ZVBhaXJzID0gbmV3IE1hcDxQcm9wZXJ0eUtleSwgW2FueSwgYW55XT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCBvbGRWYWx1ZV0gb2YgY2hhbmdlTWFwKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJWYWx1ZSA9IHRoaXNba2V5XTtcbiAgICAgICAgICAgIGlmICghZGVlcEVxdWFsKG9sZFZhbHVlLCBjdXJWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBrZXlWYWx1ZVBhaXJzLnNldChrZXksIFtjdXJWYWx1ZSwgb2xkVmFsdWVdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzW19ub3RpZnldKGtleVZhbHVlUGFpcnMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfbm90aWZ5XShrZXlWYWx1ZTogTWFwPFByb3BlcnR5S2V5LCBbYW55LCBhbnldPik6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGNoYW5nZWQsIGNoYW5nZU1hcCwgYnJva2VyIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNoYW5nZU1hcC5jbGVhcigpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBjb25zdCBldmVudEJyb2tlciA9IGJyb2tlci5nZXQoKTtcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZXNdIG9mIGtleVZhbHVlKSB7XG4gICAgICAgICAgICAoZXZlbnRCcm9rZXIgYXMgYW55KS50cmlnZ2VyKGtleSwgLi4udmFsdWVzLCBrZXkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGFuZ2VkKSB7XG4gICAgICAgICAgICBldmVudEJyb2tlci50cmlnZ2VyKCdAJywgdGhpcyk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIHByZWZlci1yZXN0LXBhcmFtcyxcbiAqL1xuXG5pbXBvcnQge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBXcml0YWJsZSxcbiAgICBpc051bWJlcixcbiAgICB2ZXJpZnksXG4gICAgcG9zdCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiwgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQge1xuICAgIEV2ZW50QnJva2VyUHJveHksXG4gICAgX2ludGVybmFsLFxuICAgIF9ub3RpZnksXG4gICAgX3N0b2NrQ2hhbmdlLFxuICAgIF9ub3RpZnlDaGFuZ2VzLFxuICAgIHZlcmlmeU9ic2VydmFibGUsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZVN0YXRlLCBJT2JzZXJ2YWJsZSB9IGZyb20gJy4vY29tbW9uJztcblxuLyoqXG4gKiBAZW4gQXJyYXkgY2hhbmdlIHR5cGUgaW5mb3JtYXRpb24uIDxicj5cbiAqICAgICBUaGUgdmFsdWUgaXMgc3VpdGFibGUgZm9yIHRoZSBudW1iZXIgb2YgZmx1Y3R1YXRpb24gb2YgdGhlIGVsZW1lbnQuXG4gKiBAamEg6YWN5YiX5aSJ5pu06YCa55+l44Gu44K/44Kk44OXIDxicj5cbiAqICAgICDlgKTjga/opoHntKDjga7lopfmuJvmlbDjgavnm7jlvZNcbiAqXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIEFycmF5Q2hhbmdlVHlwZSB7XG4gICAgUkVNT1ZFID0gLTEsXG4gICAgVVBEQVRFID0gMCxcbiAgICBJTlNFUlQgPSAxLFxufVxuXG4vKipcbiAqIEBlbiBBcnJheSBjaGFuZ2UgcmVjb3JkIGluZm9ybWF0aW9uLlxuICogQGphIOmFjeWIl+WkieabtOaDheWgsVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFycmF5Q2hhbmdlUmVjb3JkPFQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIGNoYW5nZSB0eXBlIGluZm9ybWF0aW9uLlxuICAgICAqIEBqYSDphY3liJflpInmm7Tmg4XloLHjga7orZjliKXlrZBcbiAgICAgKi9cbiAgICByZWFkb25seSB0eXBlOiBBcnJheUNoYW5nZVR5cGU7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIGNoYW5nZSB0eXBlIGluZm9ybWF0aW9uLiA8YnI+XG4gICAgICogICAgIOKAuyBbQXR0ZW50aW9uXSBUaGUgaW5kZXggd2lsbCBiZSBkaWZmZXJlbnQgZnJvbSB0aGUgYWN0dWFsIGxvY2F0aW9uIHdoZW4gYXJyYXkgc2l6ZSBjaGFuZ2VkIGJlY2F1c2UgdGhhdCBkZXRlcm1pbmVzIGVsZW1lbnQgb3BlcmF0aW9uIHVuaXQuXG4gICAgICogQGphIOWkieabtOOBjOeZuueUn+OBl+OBn+mFjeWIl+WGheOBruS9jee9ruOBriBpbmRleCA8YnI+XG4gICAgICogICAgIOKAuyBb5rOo5oSPXSDjgqrjg5rjg6zjg7zjgrfjg6fjg7PljZjkvY3jga4gaW5kZXgg44Go44Gq44KKLCDopoHntKDjgYzlopfmuJvjgZnjgovloLTlkIjjga/lrp/pmpvjga7kvY3nva7jgajnlbDjgarjgovjgZPjgajjgYzjgYLjgotcbiAgICAgKi9cbiAgICByZWFkb25seSBpbmRleDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIE5ldyBlbGVtZW50J3MgdmFsdWUuXG4gICAgICogQGphIOimgee0oOOBruaWsOOBl+OBhOWApFxuICAgICAqL1xuICAgIHJlYWRvbmx5IG5ld1ZhbHVlPzogVDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBPbGQgZWxlbWVudCdzIHZhbHVlLlxuICAgICAqIEBqYSDopoHntKDjga7lj6TjgYTlgKRcbiAgICAgKi9cbiAgICByZWFkb25seSBvbGRWYWx1ZT86IFQ7XG59XG50eXBlIE11dGFibGVDaGFuZ2VSZWNvcmQ8VD4gPSBXcml0YWJsZTxBcnJheUNoYW5nZVJlY29yZDxUPj47XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgSUFycmF5Q2hhbmdlRXZlbnQ8VD4ge1xuICAgICdAJzogW0FycmF5Q2hhbmdlUmVjb3JkPFQ+W11dO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgSW50ZXJuYWxQcm9wczxUID0gdW5rbm93bj4ge1xuICAgIHN0YXRlOiBPYnNlcnZhYmxlU3RhdGU7XG4gICAgYnlNZXRob2Q6IGJvb2xlYW47XG4gICAgcmVjb3JkczogTXV0YWJsZUNoYW5nZVJlY29yZDxUPltdO1xuICAgIHJlYWRvbmx5IGluZGV4ZXM6IFNldDxudW1iZXI+O1xuICAgIHJlYWRvbmx5IGJyb2tlcjogRXZlbnRCcm9rZXJQcm94eTxJQXJyYXlDaGFuZ2VFdmVudDxUPj47XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9wcm94eUhhbmRsZXI6IFByb3h5SGFuZGxlcjxPYnNlcnZhYmxlQXJyYXk+ID0ge1xuICAgIGRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcykge1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRhcmdldFtfaW50ZXJuYWxdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEID09PSBpbnRlcm5hbC5zdGF0ZSB8fCBpbnRlcm5hbC5ieU1ldGhvZCB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGF0dHJpYnV0ZXMsICd2YWx1ZScpKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHAsIGF0dHJpYnV0ZXMpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0W3BdO1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGF0dHJpYnV0ZXMudmFsdWU7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBlcWVxZXFcbiAgICAgICAgaWYgKCdsZW5ndGgnID09PSBwICYmIG5ld1ZhbHVlICE9IG9sZFZhbHVlKSB7IC8vIERvIE5PVCB1c2Ugc3RyaWN0IGluZXF1YWxpdHkgKCE9PSlcbiAgICAgICAgICAgIGNvbnN0IG9sZExlbmd0aCA9IG9sZFZhbHVlID4+PiAwO1xuICAgICAgICAgICAgY29uc3QgbmV3TGVuZ3RoID0gbmV3VmFsdWUgPj4+IDA7XG4gICAgICAgICAgICBjb25zdCBzdG9jayA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzY3JhcCA9IG5ld0xlbmd0aCA8IG9sZExlbmd0aCAmJiB0YXJnZXQuc2xpY2UobmV3TGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBpZiAoc2NyYXApIHsgLy8gbmV3TGVuZ3RoIDwgb2xkTGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBvbGRMZW5ndGg7IC0taSA+PSBuZXdMZW5ndGg7KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuUkVNT1ZFLCBpLCB1bmRlZmluZWQsIHNjcmFwW2kgLSBuZXdMZW5ndGhdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgLy8gb2xkTGVuZ3RoIDwgbmV3TGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBvbGRMZW5ndGg7IGkgPCBuZXdMZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLklOU0VSVCwgaSAvKiwgdW5kZWZpbmVkLCB1bmRlZmluZWQgKi8pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIHJlc3VsdCAmJiBzdG9jaygpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSBlbHNlIGlmIChuZXdWYWx1ZSAhPT0gb2xkVmFsdWUgJiYgaXNWYWxpZEFycmF5SW5kZXgocCkpIHtcbiAgICAgICAgICAgIGNvbnN0IGkgPSBwIGFzIHVua25vd24gYXMgbnVtYmVyID4+PiAwO1xuICAgICAgICAgICAgY29uc3QgdHlwZTogQXJyYXlDaGFuZ2VUeXBlID0gTnVtYmVyKGkgPj0gdGFyZ2V0Lmxlbmd0aCk7IC8vIElOU0VSVCBvciBVUERBVEVcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIHJlc3VsdCAmJiB0YXJnZXRbX3N0b2NrQ2hhbmdlXSh0eXBlLCBpLCBuZXdWYWx1ZSwgb2xkVmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcCwgYXR0cmlidXRlcyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGRlbGV0ZVByb3BlcnR5KHRhcmdldCwgcCkge1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRhcmdldFtfaW50ZXJuYWxdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEID09PSBpbnRlcm5hbC5zdGF0ZSB8fCBpbnRlcm5hbC5ieU1ldGhvZCB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRhcmdldCwgcCkpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LmRlbGV0ZVByb3BlcnR5KHRhcmdldCwgcCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXRbcF07XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IFJlZmxlY3QuZGVsZXRlUHJvcGVydHkodGFyZ2V0LCBwKTtcbiAgICAgICAgcmVzdWx0ICYmIGlzVmFsaWRBcnJheUluZGV4KHApICYmIHRhcmdldFtfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5VUERBVEUsIHAgYXMgdW5rbm93biBhcyBudW1iZXIgPj4+IDAsIHVuZGVmaW5lZCwgb2xkVmFsdWUpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG59O1xuT2JqZWN0LmZyZWV6ZShfcHJveHlIYW5kbGVyKTtcblxuLyoqIEBpbnRlcm5hbCB2YWxpZCBhcnJheSBpbmRleCBoZWxwZXIgKi9cbmZ1bmN0aW9uIGlzVmFsaWRBcnJheUluZGV4PFQ+KGluZGV4OiBUKTogYm9vbGVhbiB7XG4gICAgY29uc3QgcyA9IFN0cmluZyhpbmRleCk7XG4gICAgY29uc3QgbiA9IE1hdGgudHJ1bmMocyBhcyB1bmtub3duIGFzIG51bWJlcik7XG4gICAgcmV0dXJuIFN0cmluZyhuKSA9PT0gcyAmJiAwIDw9IG4gJiYgbiA8IDB4RkZGRkZGRkY7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBpbmRleCBtYW5hZ2VtZW50ICovXG5mdW5jdGlvbiBmaW5kUmVsYXRlZENoYW5nZUluZGV4PFQ+KHJlY29yZHM6IE11dGFibGVDaGFuZ2VSZWNvcmQ8VD5bXSwgdHlwZTogQXJyYXlDaGFuZ2VUeXBlLCBpbmRleDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBjb25zdCBjaGVja1R5cGUgPSB0eXBlID09PSBBcnJheUNoYW5nZVR5cGUuSU5TRVJUXG4gICAgICAgID8gKHQ6IEFycmF5Q2hhbmdlVHlwZSkgPT4gdCA9PT0gQXJyYXlDaGFuZ2VUeXBlLlJFTU9WRVxuICAgICAgICA6ICh0OiBBcnJheUNoYW5nZVR5cGUpID0+IHQgIT09IEFycmF5Q2hhbmdlVHlwZS5SRU1PVkVcbiAgICAgICAgO1xuXG4gICAgZm9yIChsZXQgaSA9IHJlY29yZHMubGVuZ3RoOyAtLWkgPj0gMDspIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSByZWNvcmRzW2ldO1xuICAgICAgICBpZiAodmFsdWUuaW5kZXggPT09IGluZGV4ICYmIGNoZWNrVHlwZSh2YWx1ZS50eXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWUuaW5kZXggPCBpbmRleCAmJiBCb29sZWFuKHZhbHVlLnR5cGUpKSB7IC8vIFJFTU9WRSBvciBJTlNFUlRcbiAgICAgICAgICAgIGluZGV4IC09IHZhbHVlLnR5cGU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIGFycmF5IGNsYXNzIHdoaWNoIGNoYW5nZSBjYW4gYmUgb2JzZXJ2ZWQuXG4gKiBAamEg5aSJ5pu055uj6KaW5Y+v6IO944Gq6YWN5YiX44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogY29uc3Qgb2JzQXJyYXkgPSBPYnNlcnZhYmxlQXJyYXkuZnJvbShbJ2EnLCAnYicsICdjJ10pO1xuICpcbiAqIGZ1bmN0aW9uIG9uQ2hhbmdlQXJyYXkocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmRbXSkge1xuICogICBjb25zb2xlLmxvZyhyZWNvcmRzKTtcbiAqICAgLy8gIFtcbiAqICAgLy8gICAgeyB0eXBlOiAxLCBpbmRleDogMywgbmV3VmFsdWU6ICd4Jywgb2xkVmFsdWU6IHVuZGVmaW5lZCB9LFxuICogICAvLyAgICB7IHR5cGU6IDEsIGluZGV4OiA0LCBuZXdWYWx1ZTogJ3knLCBvbGRWYWx1ZTogdW5kZWZpbmVkIH0sXG4gKiAgIC8vICAgIHsgdHlwZTogMSwgaW5kZXg6IDUsIG5ld1ZhbHVlOiAneicsIG9sZFZhbHVlOiB1bmRlZmluZWQgfVxuICogICAvLyAgXVxuICogfVxuICogb2JzQXJyYXkub24ob25DaGFuZ2VBcnJheSk7XG4gKlxuICogZnVuY3Rpb24gYWRkWFlaKCkge1xuICogICBvYnNBcnJheS5wdXNoKCd4JywgJ3knLCAneicpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBPYnNlcnZhYmxlQXJyYXk8VCA9IHVua25vd24+IGV4dGVuZHMgQXJyYXk8VD4gaW1wbGVtZW50cyBJT2JzZXJ2YWJsZSB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19pbnRlcm5hbF06IEludGVybmFsUHJvcHM8VD47XG5cbiAgICAvKiogQGZpbmFsIGNvbnN0cnVjdG9yICovXG4gICAgcHJpdmF0ZSBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAgICAgICAgdmVyaWZ5KCdpbnN0YW5jZU9mJywgT2JzZXJ2YWJsZUFycmF5LCB0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWw6IEludGVybmFsUHJvcHM8VD4gPSB7XG4gICAgICAgICAgICBzdGF0ZTogT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSxcbiAgICAgICAgICAgIGJ5TWV0aG9kOiBmYWxzZSxcbiAgICAgICAgICAgIHJlY29yZHM6IFtdLFxuICAgICAgICAgICAgaW5kZXhlczogbmV3IFNldCgpLFxuICAgICAgICAgICAgYnJva2VyOiBuZXcgRXZlbnRCcm9rZXJQcm94eTxJQXJyYXlDaGFuZ2VFdmVudDxUPj4oKSxcbiAgICAgICAgfTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIF9pbnRlcm5hbCwgeyB2YWx1ZTogT2JqZWN0LnNlYWwoaW50ZXJuYWwpIH0pO1xuICAgICAgICBjb25zdCBhcmdMZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBpZiAoMSA9PT0gYXJnTGVuZ3RoICYmIGlzTnVtYmVyKGFyZ3VtZW50c1swXSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGxlbiA9IGFyZ3VtZW50c1swXSA+Pj4gMDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzW19zdG9ja0NoYW5nZV0oQXJyYXlDaGFuZ2VUeXBlLklOU0VSVCwgaSAvKiwgdW5kZWZpbmVkICovKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgwIDwgYXJnTGVuZ3RoKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ0xlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGksIGFyZ3VtZW50c1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eSh0aGlzLCBfcHJveHlIYW5kbGVyKSBhcyBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSU9ic2VydmFibGVcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgYXJyYXkgY2hhbmdlKHMpLlxuICAgICAqIEBqYSDphY3liJflpInmm7Tos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGFycmF5IGNoYW5nZS5cbiAgICAgKiAgLSBgamFgIOmFjeWIl+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uKGxpc3RlbmVyOiAocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSkgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzW19pbnRlcm5hbF0uYnJva2VyLmdldCgpLm9uKCdAJywgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBhcnJheSBjaGFuZ2UocykuXG4gICAgICogQGphIOmFjeWIl+WkieabtOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYXJyYXkgY2hhbmdlLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOmFjeWIl+WkieabtOmAmuefpeOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvZmYobGlzdGVuZXI/OiAocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSkgPT4gdW5rbm93bik6IHZvaWQge1xuICAgICAgICB2ZXJpZnlPYnNlcnZhYmxlKHRoaXMpO1xuICAgICAgICB0aGlzW19pbnRlcm5hbF0uYnJva2VyLmdldCgpLm9mZignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3VzcGVuZCBvciBkaXNhYmxlIHRoZSBldmVudCBvYnNlcnZhdGlvbiBzdGF0ZS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt54q25oWL44Gu44K144K544Oa44Oz44OJXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm9SZWNvcmRcbiAgICAgKiAgLSBgZW5gIGB0cnVlYDogbm90IHJlY29yZGluZyBwcm9wZXJ0eSBjaGFuZ2VzIGFuZCBjbGVhciBjaGFuZ2VzLiAvIGBmYWxzZWA6IHByb3BlcnR5IGNoYW5nZXMgYXJlIHJlY29yZGVkIGFuZCBmaXJlZCB3aGVuIFtbcmVzdW1lXV0oKSBjYWxsZGVkLiAoZGVmYXVsdClcbiAgICAgKiAgLSBgamFgIGB0cnVlYDog44OX44Ot44OR44OG44Kj5aSJ5pu044KC6KiY6Yyy44Gb44GaLCDnj77lnKjjga7oqJjpjLLjgoLnoLTmo4QgLyBgZmFsc2VgOiDjg5fjg63jg5Hjg4bjgqPlpInmm7Tjga/oqJjpjLLjgZXjgowsIFtbcmVzdW1lXV0oKSDmmYLjgavnmbrngavjgZnjgosgKOaXouWumilcbiAgICAgKi9cbiAgICBzdXNwZW5kKG5vUmVjb3JkID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLnN0YXRlID0gbm9SZWNvcmQgPyBPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgOiBPYnNlcnZhYmxlU3RhdGUuU1VTRVBOREVEO1xuICAgICAgICBpZiAobm9SZWNvcmQpIHtcbiAgICAgICAgICAgIHRoaXNbX2ludGVybmFsXS5yZWNvcmRzID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc3VtZSBvZiB0aGUgZXZlbnQgc3Vic2NyaXB0aW9uIHN0YXRlLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3nirbmhYvjga7jg6rjgrjjg6Xjg7zjg6BcbiAgICAgKi9cbiAgICByZXN1bWUoKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIGludGVybmFsLnN0YXRlID0gT2JzZXJ2YWJsZVN0YXRlLkFDVElWRTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB0aGlzW19ub3RpZnlDaGFuZ2VzXSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gb2JzZXJ2YXRpb24gc3RhdGVcbiAgICAgKiBAamEg6LO86Kqt5Y+v6IO954q25oWLXG4gICAgICovXG4gICAgZ2V0T2JzZXJ2YWJsZVN0YXRlKCk6IE9ic2VydmFibGVTdGF0ZSB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzW19pbnRlcm5hbF0uc3RhdGU7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3ZlcnJpZGU6IEFycmF5IG1ldGhvZHNcblxuICAgIC8qKlxuICAgICAqIFNvcnRzIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSBjb21wYXJlRm4gVGhlIG5hbWUgb2YgdGhlIGZ1bmN0aW9uIHVzZWQgdG8gZGV0ZXJtaW5lIHRoZSBvcmRlciBvZiB0aGUgZWxlbWVudHMuIElmIG9taXR0ZWQsIHRoZSBlbGVtZW50cyBhcmUgc29ydGVkIGluIGFzY2VuZGluZywgQVNDSUkgY2hhcmFjdGVyIG9yZGVyLlxuICAgICAqL1xuICAgIHNvcnQoY29tcGFyYXRvcj86IChsaHM6IFQsIHJoczogVCkgPT4gbnVtYmVyKTogdGhpcyB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCBvbGQgPSBBcnJheS5mcm9tKHRoaXMpO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLnNvcnQoY29tcGFyYXRvcik7XG4gICAgICAgIGludGVybmFsLmJ5TWV0aG9kID0gZmFsc2U7XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuRElTQUJMRUQgIT09IGludGVybmFsLnN0YXRlKSB7XG4gICAgICAgICAgICBjb25zdCBsZW4gPSBvbGQubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZhbHVlID0gb2xkW2ldO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gdGhpc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUgIT09IG9sZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuVVBEQVRFLCBpLCBuZXdWYWx1ZSwgb2xkVmFsdWUgYXMgVCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBlbGVtZW50cyBmcm9tIGFuIGFycmF5IGFuZCwgaWYgbmVjZXNzYXJ5LCBpbnNlcnRzIG5ldyBlbGVtZW50cyBpbiB0aGVpciBwbGFjZSwgcmV0dXJuaW5nIHRoZSBkZWxldGVkIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSBzdGFydCBUaGUgemVyby1iYXNlZCBsb2NhdGlvbiBpbiB0aGUgYXJyYXkgZnJvbSB3aGljaCB0byBzdGFydCByZW1vdmluZyBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gZGVsZXRlQ291bnQgVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZW1vdmUuXG4gICAgICovXG4gICAgc3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50PzogbnVtYmVyKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgZWxlbWVudHMgZnJvbSBhbiBhcnJheSBhbmQsIGlmIG5lY2Vzc2FyeSwgaW5zZXJ0cyBuZXcgZWxlbWVudHMgaW4gdGhlaXIgcGxhY2UsIHJldHVybmluZyB0aGUgZGVsZXRlZCBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0gc3RhcnQgVGhlIHplcm8tYmFzZWQgbG9jYXRpb24gaW4gdGhlIGFycmF5IGZyb20gd2hpY2ggdG8gc3RhcnQgcmVtb3ZpbmcgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIGRlbGV0ZUNvdW50IFRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmVtb3ZlLlxuICAgICAqIEBwYXJhbSBpdGVtcyBFbGVtZW50cyB0byBpbnNlcnQgaW50byB0aGUgYXJyYXkgaW4gcGxhY2Ugb2YgdGhlIGRlbGV0ZWQgZWxlbWVudHMuXG4gICAgICovXG4gICAgc3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50OiBudW1iZXIsIC4uLml0ZW1zOiBUW10pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgc3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50PzogbnVtYmVyLCAuLi5pdGVtczogVFtdKTogT2JzZXJ2YWJsZUFycmF5PFQ+IHtcbiAgICAgICAgdmVyaWZ5T2JzZXJ2YWJsZSh0aGlzKTtcbiAgICAgICAgY29uc3QgaW50ZXJuYWwgPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGNvbnN0IG9sZExlbiA9IHRoaXMubGVuZ3RoO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IChzdXBlci5zcGxpY2UgYXMgVW5rbm93bkZ1bmN0aW9uKSguLi5hcmd1bWVudHMpIGFzIE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSBmYWxzZTtcbiAgICAgICAgaWYgKE9ic2VydmFibGVTdGF0ZS5ESVNBQkxFRCAhPT0gaW50ZXJuYWwuc3RhdGUpIHtcbiAgICAgICAgICAgIHN0YXJ0ID0gTWF0aC50cnVuYyhzdGFydCk7XG4gICAgICAgICAgICBjb25zdCBmcm9tID0gc3RhcnQgPCAwID8gTWF0aC5tYXgob2xkTGVuICsgc3RhcnQsIDApIDogTWF0aC5taW4oc3RhcnQsIG9sZExlbik7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gcmVzdWx0Lmxlbmd0aDsgLS1pID49IDA7KSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5SRU1PVkUsIGZyb20gKyBpLCB1bmRlZmluZWQsIHJlc3VsdFtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBsZW4gPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5JTlNFUlQsIGZyb20gKyBpLCBpdGVtc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIHRoZSBmaXJzdCBlbGVtZW50IGZyb20gYW4gYXJyYXkgYW5kIHJldHVybnMgaXQuXG4gICAgICovXG4gICAgc2hpZnQoKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBjb25zdCBvbGRMZW4gPSB0aGlzLmxlbmd0aDtcbiAgICAgICAgaW50ZXJuYWwuYnlNZXRob2QgPSB0cnVlO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzdXBlci5zaGlmdCgpO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IGZhbHNlO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSBpbnRlcm5hbC5zdGF0ZSAmJiB0aGlzLmxlbmd0aCA8IG9sZExlbikge1xuICAgICAgICAgICAgdGhpc1tfc3RvY2tDaGFuZ2VdKEFycmF5Q2hhbmdlVHlwZS5SRU1PVkUsIDAsIHVuZGVmaW5lZCwgcmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluc2VydHMgbmV3IGVsZW1lbnRzIGF0IHRoZSBzdGFydCBvZiBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0gaXRlbXMgIEVsZW1lbnRzIHRvIGluc2VydCBhdCB0aGUgc3RhcnQgb2YgdGhlIEFycmF5LlxuICAgICAqL1xuICAgIHVuc2hpZnQoLi4uaXRlbXM6IFRbXSk6IG51bWJlciB7XG4gICAgICAgIHZlcmlmeU9ic2VydmFibGUodGhpcyk7XG4gICAgICAgIGNvbnN0IGludGVybmFsID0gdGhpc1tfaW50ZXJuYWxdO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLnVuc2hpZnQoLi4uaXRlbXMpO1xuICAgICAgICBpbnRlcm5hbC5ieU1ldGhvZCA9IGZhbHNlO1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkRJU0FCTEVEICE9PSBpbnRlcm5hbC5zdGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgbGVuID0gaXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShBcnJheUNoYW5nZVR5cGUuSU5TRVJULCBpLCBpdGVtc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxscyBhIGRlZmluZWQgY2FsbGJhY2sgZnVuY3Rpb24gb24gZWFjaCBlbGVtZW50IG9mIGFuIGFycmF5LCBhbmQgcmV0dXJucyBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIHRoZSByZXN1bHRzLlxuICAgICAqIEBwYXJhbSBjYWxsYmFja2ZuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIHVwIHRvIHRocmVlIGFyZ3VtZW50cy4gVGhlIG1hcCBtZXRob2QgY2FsbHMgdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24gb25lIHRpbWUgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgYXJyYXkuXG4gICAgICogQHBhcmFtIHRoaXNBcmcgQW4gb2JqZWN0IHRvIHdoaWNoIHRoZSB0aGlzIGtleXdvcmQgY2FuIHJlZmVyIGluIHRoZSBjYWxsYmFja2ZuIGZ1bmN0aW9uLiBJZiB0aGlzQXJnIGlzIG9taXR0ZWQsIHVuZGVmaW5lZCBpcyB1c2VkIGFzIHRoZSB0aGlzIHZhbHVlLlxuICAgICAqL1xuICAgIG1hcDxVPihjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUsIHRoaXNBcmc/OiB1bmtub3duKTogT2JzZXJ2YWJsZUFycmF5PFU+IHtcbiAgICAgICAgLypcbiAgICAgICAgICogW05PVEVdIG9yaWdpbmFsIGltcGxlbWVudCBpcyB2ZXJ5IHZlcnkgaGlnaC1jb3N0LlxuICAgICAgICAgKiAgICAgICAgc28gaXQncyBjb252ZXJ0ZWQgbmF0aXZlIEFycmF5IG9uY2UsIGFuZCByZXN0b3JlZC5cbiAgICAgICAgICpcbiAgICAgICAgICogcmV0dXJuIChzdXBlci5tYXAgYXMgVW5rbm93bkZ1bmN0aW9uKSguLi5hcmd1bWVudHMpO1xuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIE9ic2VydmFibGVBcnJheS5mcm9tKFsuLi50aGlzXS5tYXAoY2FsbGJhY2tmbiwgdGhpc0FyZykpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElPYnNlcnZhYmxlRXZlbnRCcm9rZXJBY2Nlc3NcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBnZXRCcm9rZXIoKTogRXZlbnRCcm9rZXI8SUFycmF5Q2hhbmdlRXZlbnQ8VD4+IHtcbiAgICAgICAgY29uc3QgeyBicm9rZXIgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgcmV0dXJuIGJyb2tlci5nZXQoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1laHRvZHM6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX3N0b2NrQ2hhbmdlXSh0eXBlOiBBcnJheUNoYW5nZVR5cGUsIGluZGV4OiBudW1iZXIsIG5ld1ZhbHVlPzogVCwgb2xkVmFsdWU/OiBUKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgc3RhdGUsIGluZGV4ZXMsIHJlY29yZHMgfSA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgY29uc3QgcmNpID0gaW5kZXhlcy5oYXMoaW5kZXgpID8gZmluZFJlbGF0ZWRDaGFuZ2VJbmRleChyZWNvcmRzLCB0eXBlLCBpbmRleCkgOiAtMTtcbiAgICAgICAgY29uc3QgbGVuID0gcmVjb3Jkcy5sZW5ndGg7XG4gICAgICAgIGlmIChyY2kgPj0gMCkge1xuICAgICAgICAgICAgY29uc3QgcmN0ID0gcmVjb3Jkc1tyY2ldLnR5cGU7XG4gICAgICAgICAgICBpZiAoIXJjdCAvKiBVUERBVEUgKi8pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcmV2UmVjb3JkID0gcmVjb3Jkcy5zcGxpY2UocmNpLCAxKVswXTtcbiAgICAgICAgICAgICAgICAvLyBVUERBVEUgPT4gVVBEQVRFIDogVVBEQVRFXG4gICAgICAgICAgICAgICAgLy8gVVBEQVRFID0+IFJFTU9WRSA6IElOU0VSVFxuICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXSh0eXBlLCBpbmRleCwgbmV3VmFsdWUsIHByZXZSZWNvcmQub2xkVmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCByLCBpID0gbGVuOyAtLWkgPiByY2k7KSB7XG4gICAgICAgICAgICAgICAgICAgIHIgPSByZWNvcmRzW2ldO1xuICAgICAgICAgICAgICAgICAgICAoci5pbmRleCA+PSBpbmRleCkgJiYgKHIuaW5kZXggLT0gcmN0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgcHJldlJlY29yZCA9IHJlY29yZHMuc3BsaWNlKHJjaSwgMSlbMF07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGUgIT09IEFycmF5Q2hhbmdlVHlwZS5SRU1PVkUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSU5TRVJUID0+IFVQREFURSA6IElOU0VSVFxuICAgICAgICAgICAgICAgICAgICAvLyBSRU1PVkUgPT4gSU5TRVJUIDogVVBEQVRFXG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3N0b2NrQ2hhbmdlXShOdW1iZXIoIXR5cGUpLCBpbmRleCwgbmV3VmFsdWUsIHByZXZSZWNvcmQub2xkVmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpbmRleGVzLmFkZChpbmRleCk7XG4gICAgICAgIHJlY29yZHNbbGVuXSA9IHsgdHlwZSwgaW5kZXgsIG5ld1ZhbHVlLCBvbGRWYWx1ZSB9O1xuICAgICAgICBpZiAoT2JzZXJ2YWJsZVN0YXRlLkFDVElWRSA9PT0gc3RhdGUgJiYgMCA9PT0gbGVuKSB7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4gdGhpc1tfbm90aWZ5Q2hhbmdlc10oKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeUNoYW5nZXNdKCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCByZWNvcmRzIH0gPSB0aGlzW19pbnRlcm5hbF07XG4gICAgICAgIGlmIChPYnNlcnZhYmxlU3RhdGUuQUNUSVZFICE9PSBzdGF0ZSB8fCAwID09PSByZWNvcmRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgciBvZiByZWNvcmRzKSB7XG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKHIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXNbX25vdGlmeV0oT2JqZWN0LmZyZWV6ZShyZWNvcmRzKSBhcyBBcnJheUNoYW5nZVJlY29yZDxUPltdKTtcbiAgICAgICAgdGhpc1tfaW50ZXJuYWxdLnJlY29yZHMgPSBbXTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX25vdGlmeV0ocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSk6IHZvaWQge1xuICAgICAgICBjb25zdCBpbnRlcm5hbCA9IHRoaXNbX2ludGVybmFsXTtcbiAgICAgICAgaW50ZXJuYWwuaW5kZXhlcy5jbGVhcigpO1xuICAgICAgICBpbnRlcm5hbC5icm9rZXIuZ2V0KCkudHJpZ2dlcignQCcsIHJlY29yZHMpO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogT3ZlcnJpZGUgcmV0dXJuIHR5cGUgb2YgcHJvdG90eXBlIG1ldGhvZHNcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBPYnNlcnZhYmxlQXJyYXk8VD4ge1xuICAgIC8qKlxuICAgICAqIENvbWJpbmVzIHR3byBvciBtb3JlIGFycmF5cy5cbiAgICAgKiBAcGFyYW0gaXRlbXMgQWRkaXRpb25hbCBpdGVtcyB0byBhZGQgdG8gdGhlIGVuZCBvZiBhcnJheTEuXG4gICAgICovXG4gICAgY29uY2F0KC4uLml0ZW1zOiBUW11bXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBDb21iaW5lcyB0d28gb3IgbW9yZSBhcnJheXMuXG4gICAgICogQHBhcmFtIGl0ZW1zIEFkZGl0aW9uYWwgaXRlbXMgdG8gYWRkIHRvIHRoZSBlbmQgb2YgYXJyYXkxLlxuICAgICAqL1xuICAgIGNvbmNhdCguLi5pdGVtczogKFQgfCBUW10pW10pOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogUmV2ZXJzZXMgdGhlIGVsZW1lbnRzIGluIGFuIEFycmF5LlxuICAgICAqL1xuICAgIHJldmVyc2UoKTogdGhpcztcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgc2VjdGlvbiBvZiBhbiBhcnJheS5cbiAgICAgKiBAcGFyYW0gc3RhcnQgVGhlIGJlZ2lubmluZyBvZiB0aGUgc3BlY2lmaWVkIHBvcnRpb24gb2YgdGhlIGFycmF5LlxuICAgICAqIEBwYXJhbSBlbmQgVGhlIGVuZCBvZiB0aGUgc3BlY2lmaWVkIHBvcnRpb24gb2YgdGhlIGFycmF5LlxuICAgICAqL1xuICAgIHNsaWNlKHN0YXJ0PzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBPYnNlcnZhYmxlQXJyYXk8VD47XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZWxlbWVudHMgb2YgYW4gYXJyYXkgdGhhdCBtZWV0IHRoZSBjb25kaXRpb24gc3BlY2lmaWVkIGluIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQHBhcmFtIGNhbGxiYWNrZm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdXAgdG8gdGhyZWUgYXJndW1lbnRzLiBUaGUgZmlsdGVyIG1ldGhvZCBjYWxscyB0aGUgY2FsbGJhY2tmbiBmdW5jdGlvbiBvbmUgdGltZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBBbiBvYmplY3QgdG8gd2hpY2ggdGhlIHRoaXMga2V5d29yZCBjYW4gcmVmZXIgaW4gdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24uIElmIHRoaXNBcmcgaXMgb21pdHRlZCwgdW5kZWZpbmVkIGlzIHVzZWQgYXMgdGhlIHRoaXMgdmFsdWUuXG4gICAgICovXG4gICAgZmlsdGVyPFMgZXh0ZW5kcyBUPihjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHZhbHVlIGlzIFMsIHRoaXNBcmc/OiB1bmtub3duKTogT2JzZXJ2YWJsZUFycmF5PFM+O1xuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGVsZW1lbnRzIG9mIGFuIGFycmF5IHRoYXQgbWVldCB0aGUgY29uZGl0aW9uIHNwZWNpZmllZCBpbiBhIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqIEBwYXJhbSBjYWxsYmFja2ZuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIHVwIHRvIHRocmVlIGFyZ3VtZW50cy4gVGhlIGZpbHRlciBtZXRob2QgY2FsbHMgdGhlIGNhbGxiYWNrZm4gZnVuY3Rpb24gb25lIHRpbWUgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgYXJyYXkuXG4gICAgICogQHBhcmFtIHRoaXNBcmcgQW4gb2JqZWN0IHRvIHdoaWNoIHRoZSB0aGlzIGtleXdvcmQgY2FuIHJlZmVyIGluIHRoZSBjYWxsYmFja2ZuIGZ1bmN0aW9uLiBJZiB0aGlzQXJnIGlzIG9taXR0ZWQsIHVuZGVmaW5lZCBpcyB1c2VkIGFzIHRoZSB0aGlzIHZhbHVlLlxuICAgICAqL1xuICAgIGZpbHRlcihjYWxsYmFja2ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHVua25vd24sIHRoaXNBcmc/OiB1bmtub3duKTogT2JzZXJ2YWJsZUFycmF5PFQ+O1xufVxuXG4vKipcbiAqIE92ZXJyaWRlIHJldHVybiB0eXBlIG9mIHN0YXRpYyBtZXRob2RzXG4gKi9cbmV4cG9ydCBkZWNsYXJlIG5hbWVzcGFjZSBPYnNlcnZhYmxlQXJyYXkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvYmplY3QuXG4gICAgICogQHBhcmFtIGFycmF5TGlrZSBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZyb208VD4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4gfCBJdGVyYWJsZTxUPik6IE9ic2VydmFibGVBcnJheTxUPjtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvYmplY3QuXG4gICAgICogQHBhcmFtIGFycmF5TGlrZSBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqIEBwYXJhbSBtYXBmbiBBIG1hcHBpbmcgZnVuY3Rpb24gdG8gY2FsbCBvbiBldmVyeSBlbGVtZW50IG9mIHRoZSBhcnJheS5cbiAgICAgKiBAcGFyYW0gdGhpc0FyZyBWYWx1ZSBvZiAndGhpcycgdXNlZCB0byBpbnZva2UgdGhlIG1hcGZuLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZyb208VCwgVT4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4gfCBJdGVyYWJsZTxUPiwgbWFwZm46ICh0aGlzOiB2b2lkLCB2OiBULCBrOiBudW1iZXIpID0+IFUsIHRoaXNBcmc/OiB1bmRlZmluZWQpOiBPYnNlcnZhYmxlQXJyYXk8VT47XG4gICAgZnVuY3Rpb24gZnJvbTxYLCBULCBVPihhcnJheUxpa2U6IEFycmF5TGlrZTxUPiB8IEl0ZXJhYmxlPFQ+LCBtYXBmbjogKHRoaXM6IFgsIHY6IFQsIGs6IG51bWJlcikgPT4gVSwgdGhpc0FyZzogWCk6IE9ic2VydmFibGVBcnJheTxVPjtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgbmV3IGFycmF5IGZyb20gYSBzZXQgb2YgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIGl0ZW1zIEEgc2V0IG9mIGVsZW1lbnRzIHRvIGluY2x1ZGUgaW4gdGhlIG5ldyBhcnJheSBvYmplY3QuXG4gICAgICovXG4gICAgZnVuY3Rpb24gb2Y8VD4oLi4uaXRlbXM6IFRbXSk6IE9ic2VydmFibGVBcnJheTxUPjtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgbm8taW5uZXItZGVjbGFyYXRpb25zLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbi8qXG4gKiBOT1RFOiDlhoXpg6jjg6Ljgrjjg6Xjg7zjg6vjgasgYENEUGAgbmFtZXNwYWNlIOOCkuS9v+eUqOOBl+OBpuOBl+OBvuOBhuOBqCwg5aSW6YOo44Oi44K444Ol44O844Or44Gn44Gv5a6j6KiA44Gn44GN44Gq44GP44Gq44KLLlxuICogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy85NjExXG4gKi9cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29uc3RhbnQgZGVmaW5pdGlvbiBhYm91dCByYW5nZSBvZiB0aGUgcmVzdWx0IGNvZGUuXG4gICAgICogQGphIOODquOCtuODq+ODiOOCs+ODvOODieOBruevhOWbsuOBq+mWouOBmeOCi+WumuaVsOWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBjb25zdCBlbnVtIFJFU1VMVF9DT0RFX1JBTkdFIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBUaGUgYXNzaWduYWJsZSByYW5nZSBmb3IgdGhlIGNsaWVudCdzIGxvY2FsIHJlc3VsdCBjb3JkIGJ5IHdoaWNoIGV4cGFuc2lvbiBpcyBwb3NzaWJsZS5cbiAgICAgICAgICogQGphIOOCr+ODqeOCpOOCouODs+ODiOOBjOaLoeW8teWPr+iDveOBquODreODvOOCq+ODq+ODquOCtuODq+ODiOOCs+ODvOODieOBruOCouOCteOCpOODs+WPr+iDvemgmOWfn1xuICAgICAgICAgKi9cbiAgICAgICAgTUFYID0gMTAwMCxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBSZXNlcnZlZCByYW5nZSBvZiBmcmFtZXdvcmsuXG4gICAgICAgICAqIEBqYSDjg5Xjg6zjg7zjg6Djg6/jg7zjgq/jga7kuojntITpoJjln59cbiAgICAgICAgICovXG4gICAgICAgIFJFU0VSVkVEID0gMTAwMCxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIGFzc2lnbm1lbnQgcmFuZ2UgZ3VpZGVsaW5lIGRlZmluaXRpb24gdXNlZCBpbiB0aGUgbW9kdWxlLlxuICAgICAqIEBqYSDjg6Ljgrjjg6Xjg7zjg6vlhoXjgafkvb/nlKjjgZnjgovjgqLjgrXjgqTjg7PpoJjln5/jgqzjgqTjg4njg6njgqTjg7PlrprmlbDlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgY29uc3QgZW51bSBMT0NBTF9DT0RFX1JBTkdFX0dVSURFIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBUaGUgYXNzaWdubWVudCByYW5nZSBndWlkZWxpbmUgcGVyIDEgbW9kdWxlLlxuICAgICAgICAgKiBAamEgMeODouOCuOODpeODvOODq+W9k+OBn+OCiuOBq+WJsuOCiuW9k+OBpuOCi+OCouOCteOCpOODs+mgmOWfn+OCrOOCpOODieODqeOCpOODs1xuICAgICAgICAgKi9cbiAgICAgICAgTU9EVUxFID0gMTAwLFxuICAgICAgICAvKipcbiAgICAgICAgICogQGVuIFRoZSBhc3NpZ25tZW50IHJhbmdlIGd1aWRlbGluZSBwZXIgMSBmdW5jdGlvbi5cbiAgICAgICAgICogQGphIDHmqZ/og73lvZPjgZ/jgorjgavlibLjgorlvZPjgabjgovjgqLjgrXjgqTjg7PpoJjln5/jgqzjgqTjg4njg6njgqTjg7NcbiAgICAgICAgICovXG4gICAgICAgIEZVTkNUSU9OID0gMjAsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE9mZnNldCB2YWx1ZSBlbnVtZXJhdGlvbiBmb3IgW1tSRVNVTFRfQ09ERV1dLiA8YnI+XG4gICAgICogICAgIFRoZSBjbGllbnQgY2FuIGV4cGFuZCBhIGRlZmluaXRpb24gaW4gb3RoZXIgbW9kdWxlLlxuICAgICAqIEBqYSBbW1JFU1VMVF9DT0RFXV0g44Gu44Kq44OV44K744OD44OI5YCkIDxicj5cbiAgICAgKiAgICAg44Ko44Op44O844Kz44O844OJ5a++5b+c44GZ44KL44Oi44K444Ol44O844Or5YaF44GnIOWumue+qeOCkuaLoeW8teOBmeOCiy5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgKiAgICAgIENPTU1PTiAgICAgID0gMCxcbiAgICAgKiAgICAgIFNPTUVNT0RVTEUgID0gMSAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgICogICAgICBTT01FTU9EVUxFMiA9IDIgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgICAqICB9XG4gICAgICpcbiAgICAgKiAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAqICAgICAgU09NRU1PRFVMRV9ERUNMQVJFICAgICAgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSwgLy8gZm9yIGF2b2lkIFRTMjQzMi5cbiAgICAgKiAgICAgIEVSUk9SX1NPTUVNT0RVTEVfVU5FWFBFQ1RFRCAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5TT01FTU9EVUxFLCBMT0NBTF9DT0RFX0JBU0UuU09NRU1PRFVMRSArIDEsIFwiZXJyb3IgdW5leHBlY3RlZC5cIiksXG4gICAgICogICAgICBFUlJPUl9TT01FTU9EVUxFX0lOVkFMSURfQVJHID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuU09NRU1PRFVMRSwgTE9DQUxfQ09ERV9CQVNFLlNPTUVNT0RVTEUgKyAyLCBcImludmFsaWQgYXJndW1lbnRzLlwiKSxcbiAgICAgKiAgfVxuICAgICAqICBBU1NJR05fUkVTVUxUX0NPREUoUkVTVUxUX0NPREUpO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGV4cG9ydCBjb25zdCBlbnVtIFJFU1VMVF9DT0RFX0JBU0Uge1xuICAgICAgICBERUNMQVJFID0gOTAwNzE5OTI1NDc0MDk5MSwgLy8gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVJcbiAgICAgICAgQ09NTU9OICA9IDAsXG4gICAgICAgIENEUCAgICAgPSAxICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5NT0RVTEUsIC8vIGNkcCByZXNlcnZlZC4gYWJzKDAg772eIDEwMDApXG4vLyAgICAgIE1PRFVMRV9BID0gMSAqIFJFU1VMVF9DT0RFX1JBTkdFLk1BWCwgICAgLy8gZXgpIG1vZHVsZUE6IGFicygxMDAxIO+9niAxOTk5KVxuLy8gICAgICBNT0RVTEVfQiA9IDIgKiBSRVNVTFRfQ09ERV9SQU5HRS5NQVgsICAgIC8vIGV4KSBtb2R1bGVCOiBhYnMoMjAwMSDvvZ4gMjk5OSlcbi8vICAgICAgTU9EVUxFX0MgPSAzICogUkVTVUxUX0NPREVfUkFOR0UuTUFYLCAgICAvLyBleCkgbW9kdWxlQzogYWJzKDMwMDEg772eIDM5OTkpXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEtub3duIENEUCBtb2R1bGUgb2ZmZXN0IGRlZmluaXRpb24uXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCiyBDRFAg44Oi44K444Ol44O844Or44Gu44Kq44OV44K744OD44OI5a6a576pXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgKiAgICBBSkFYID0gQ0RQX0tOT1dOX01PRFVMRS5BSkFYICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICogICBBSkFYX0RFQ0xBUkUgICAgICAgID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAqICAgRVJST1JfQUpBWF9SRVNQT05TRSA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkFKQVggKyAxLCAnbmV0d29yayBlcnJvci4nKSxcbiAgICAgKiAgIEVSUk9SX0FKQVhfVElNRU9VVCAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMiwgJ3JlcXVlc3QgdGltZW91dC4nKSxcbiAgICAgKiB9XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZXhwb3J0IGNvbnN0IGVudW0gQ0RQX0tOT1dOX01PRFVMRSB7XG4gICAgICAgIC8qKiBgQGNkcC9hamF4YCAqL1xuICAgICAgICBBSkFYID0gMSxcbiAgICAgICAgLyoqIGBAY2RwL2kxOG5gICovXG4gICAgICAgIEkxOE4gPSAyLFxuICAgICAgICAvKiogYEBjZHAvZGF0YS1zeW5jYCwgYEBjZHAvbW9kZWxgICovXG4gICAgICAgIE1WQyAgPSAzLFxuICAgICAgICAvKiogb2Zmc2V0IGZvciB1bmtub3duIG1vZHVsZSAqL1xuICAgICAgICBPRkZTRVQsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENvbW1vbiByZXN1bHQgY29kZSBmb3IgdGhlIGFwcGxpY2F0aW9uLlxuICAgICAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7PlhajkvZPjgafkvb/nlKjjgZnjgovlhbHpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIC8qKiBgZW5gIGdlbmVyYWwgc3VjY2VzcyBjb2RlICAgICAgICAgICAgIDxicj4gYGphYCDmsY7nlKjmiJDlip/jgrPjg7zjg4kgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgIFNVQ0NFU1MgPSAwLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIGNhbmNlbCBjb2RlICAgICAgICAgICAgICA8YnI+IGBqYWAg5rGO55So44Kt44Oj44Oz44K744Or44Kz44O844OJICAgICAgICAgICAgICAgICAqL1xuICAgICAgICBBQk9SVCA9IDEsXG4gICAgICAgIC8qKiBgZW5gIGdlbmVyYWwgcGVuZGluZyBjb2RlICAgICAgICAgICAgIDxicj4gYGphYCDmsY7nlKjjgqrjg5rjg6zjg7zjgrfjg6fjg7PmnKrlrp/ooYzjgqjjg6njg7zjgrPjg7zjg4kgKi9cbiAgICAgICAgUEVORElORyA9IDIsXG4gICAgICAgIC8qKiBgZW5gIGdlbmVyYWwgc3VjY2VzcyBidXQgbm9vcCBjb2RlICAgIDxicj4gYGphYCDmsY7nlKjlrp/ooYzkuI3opoHjgrPjg7zjg4kgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgTk9PUCA9IDMsXG4gICAgICAgIC8qKiBgZW5gIGdlbmVyYWwgZXJyb3IgY29kZSAgICAgICAgICAgICAgIDxicj4gYGphYCDmsY7nlKjjgqjjg6njg7zjgrPjg7zjg4kgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICBGQUlMID0gLTEsXG4gICAgICAgIC8qKiBgZW5gIGdlbmVyYWwgZmF0YWwgZXJyb3IgY29kZSAgICAgICAgIDxicj4gYGphYCDmsY7nlKjoh7Tlkb3nmoTjgqjjg6njg7zjgrPjg7zjg4kgICAgICAgICAgICAgICAqL1xuICAgICAgICBGQVRBTCA9IC0yLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIG5vdCBzdXBwb3J0ZWQgZXJyb3IgY29kZSA8YnI+IGBqYWAg5rGO55So44Kq44Oa44Os44O844K344On44Oz44Ko44Op44O844Kz44O844OJICAgICAgICovXG4gICAgICAgIE5PVF9TVVBQT1JURUQgPSAtMyxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXNzaWduIGRlY2xhcmVkIFtbUkVTVUxUX0NPREVdXSB0byByb290IGVudW1lcmF0aW9uLlxuICAgICAqICAgICAoSXQncyBlbmFibGUgdG8gbWVyZ2UgZW51bSBpbiB0aGUgbW9kdWxlIHN5c3RlbSBlbnZpcm9ubWVudC4pXG4gICAgICogQGphIOaLoeW8teOBl+OBnyBbW1JFU1VMVF9DT0RFXV0g44KSIOODq+ODvOODiCBlbnVtIOOBq+OCouOCteOCpOODs1xuICAgICAqICAgICDjg6Ljgrjjg6Xjg7zjg6vjgrfjgrnjg4bjg6DnkrDlooPjgavjgYrjgYTjgabjgoLjgIFlbnVtIOOCkuODnuODvOOCuOOCkuWPr+iDveOBq+OBmeOCi1xuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBBU1NJR05fUkVTVUxUX0NPREUoZXh0ZW5kOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgICAgICBPYmplY3QuYXNzaWduKFJFU1VMVF9DT0RFLCBleHRlbmQpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBjb25zdCBfY29kZTJtZXNzYWdlOiB7IFtjb2RlOiBzdHJpbmddOiBzdHJpbmc7IH0gPSB7XG4gICAgICAgICcwJzogJ29wZXJhdGlvbiBzdWNjZWVkZWQuJyxcbiAgICAgICAgJzEnOiAnb3BlcmF0aW9uIGFib3J0ZWQuJyxcbiAgICAgICAgJzInOiAnb3BlcmF0aW9uIHBlbmRpbmcuJyxcbiAgICAgICAgJzMnOiAnbm8gb3BlcmF0aW9uLicsXG4gICAgICAgICctMSc6ICdvcGVyYXRpb24gZmFpbGVkLicsXG4gICAgICAgICctMic6ICd1bmV4cGVjdGVkIGVycm9yIG9jY3VyZWQuJyxcbiAgICAgICAgJy0zJzogJ29wZXJhdGlvbiBub3Qgc3VwcG9ydGVkLicsXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gZXJyb3IgbWVzc2FnZSBtYXAuXG4gICAgICogQGphIOOCqOODqeODvOODoeODg+OCu+ODvOOCuOODnuODg+ODl+OBruWPluW+l1xuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBFUlJPUl9NRVNTQUdFX01BUCgpOiB7IFtjb2RlOiBzdHJpbmddOiBzdHJpbmc7IH0ge1xuICAgICAgICByZXR1cm4gX2NvZGUybWVzc2FnZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2VuZXJhdGUgc3VjY2VzcyBjb2RlLlxuICAgICAqIEBqYSDmiJDlip/jgrPjg7zjg4njgpLnlJ/miJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBiYXNlXG4gICAgICogIC0gYGVuYCBzZXQgYmFzZSBvZmZzZXQgYXMgW1tSRVNVTFRfQ09ERV9CQVNFXV1cbiAgICAgKiAgLSBgamFgIOOCquODleOCu+ODg+ODiOWApOOCkiBbW1JFU1VMVF9DT0RFX0JBU0VdXSDjgajjgZfjgabmjIflrppcbiAgICAgKiBAcGFyYW0gY29kZVxuICAgICAqICAtIGBlbmAgc2V0IGxvY2FsIGNvZGUgZm9yIGRlY2xhcmF0aW9uLiBleCkgJzEnXG4gICAgICogIC0gYGphYCDlrqPoqIDnlKjjga7jg63jg7zjgqvjg6vjgrPjg7zjg4nlgKTjgpLmjIflrpogIOS+iykgJzEnXG4gICAgICogQHBhcmFtIG1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIHNldCBlcnJvciBtZXNzYWdlIGZvciBoZWxwIHN0cmluZy5cbiAgICAgKiAgLSBgamFgIOODmOODq+ODl+OCueODiOODquODs+OCsOeUqOOCqOODqeODvOODoeODg+OCu+ODvOOCuOOCkuaMh+WumlxuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBERUNMQVJFX1NVQ0NFU1NfQ09ERShiYXNlOiBSRVNVTFRfQ09ERV9CQVNFLCBjb2RlOiBudW1iZXIsIG1lc3NhZ2U/OiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gZGVjbGFyZVJlc3VsdENvZGUoYmFzZSwgY29kZSwgbWVzc2FnZSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdlbmVyYXRlIGVycm9yIGNvZGUuXG4gICAgICogQGphIOOCqOODqeODvOOCs+ODvOODieeUn+aIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGJhc2VcbiAgICAgKiAgLSBgZW5gIHNldCBiYXNlIG9mZnNldCBhcyBbW1JFU1VMVF9DT0RFX0JBU0VdXVxuICAgICAqICAtIGBqYWAg44Kq44OV44K744OD44OI5YCk44KSIFtbUkVTVUxUX0NPREVfQkFTRV1dIOOBqOOBl+OBpuaMh+WumlxuICAgICAqIEBwYXJhbSBjb2RlXG4gICAgICogIC0gYGVuYCBzZXQgbG9jYWwgY29kZSBmb3IgZGVjbGFyYXRpb24uIGV4KSAnMSdcbiAgICAgKiAgLSBgamFgIOWuo+iogOeUqOOBruODreODvOOCq+ODq+OCs+ODvOODieWApOOCkuaMh+WumiAg5L6LKSAnMSdcbiAgICAgKiBAcGFyYW0gbWVzc2FnZVxuICAgICAqICAtIGBlbmAgc2V0IGVycm9yIG1lc3NhZ2UgZm9yIGhlbHAgc3RyaW5nLlxuICAgICAqICAtIGBqYWAg44OY44Or44OX44K544OI44Oq44Oz44Kw55So44Ko44Op44O844Oh44OD44K744O844K444KS5oyH5a6aXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIERFQ0xBUkVfRVJST1JfQ09ERShiYXNlOiBSRVNVTFRfQ09ERV9CQVNFLCBjb2RlOiBudW1iZXIsIG1lc3NhZ2U/OiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gZGVjbGFyZVJlc3VsdENvZGUoYmFzZSwgY29kZSwgbWVzc2FnZSwgZmFsc2UpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgc2VjdGlvbjpcblxuICAgIC8qKiBAaW50ZXJuYWwgcmVnaXN0ZXIgZm9yIFtbUkVTVUxUX0NPREVdXSAqL1xuICAgIGZ1bmN0aW9uIGRlY2xhcmVSZXN1bHRDb2RlKGJhc2U6IFJFU1VMVF9DT0RFX0JBU0UsIGNvZGU6IG51bWJlciwgbWVzc2FnZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBzdWNjZWVkZWQ6IGJvb2xlYW4pOiBudW1iZXIgfCBuZXZlciB7XG4gICAgICAgIGlmIChjb2RlIDwgMCB8fCBSRVNVTFRfQ09ERV9SQU5HRS5NQVggPD0gY29kZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYGRlY2xhcmVSZXN1bHRDb2RlKCksIGludmFsaWQgbG9jYWwtY29kZSByYW5nZS4gW2NvZGU6ICR7Y29kZX1dYCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2lnbmVkID0gc3VjY2VlZGVkID8gMSA6IC0xO1xuICAgICAgICBjb25zdCByZXN1bHRDb2RlID0gc2lnbmVkICogKGJhc2UgYXMgbnVtYmVyICsgY29kZSk7XG4gICAgICAgIF9jb2RlMm1lc3NhZ2VbcmVzdWx0Q29kZV0gPSBtZXNzYWdlID8gbWVzc2FnZSA6IChgW0NPREU6ICR7cmVzdWx0Q29kZX1dYCk7XG4gICAgICAgIHJldHVybiByZXN1bHRDb2RlO1xuICAgIH1cbn1cbiIsImltcG9ydCBSRVNVTFRfQ09ERSAgICAgICAgICAgICAgPSBDRFBfREVDTEFSRS5SRVNVTFRfQ09ERTtcbmltcG9ydCBSRVNVTFRfQ09ERV9CQVNFICAgICAgICAgPSBDRFBfREVDTEFSRS5SRVNVTFRfQ09ERV9CQVNFO1xuaW1wb3J0IFJFU1VMVF9DT0RFX1JBTkdFICAgICAgICA9IENEUF9ERUNMQVJFLlJFU1VMVF9DT0RFX1JBTkdFO1xuaW1wb3J0IExPQ0FMX0NPREVfUkFOR0VfR1VJREUgICA9IENEUF9ERUNMQVJFLkxPQ0FMX0NPREVfUkFOR0VfR1VJREU7XG5pbXBvcnQgREVDTEFSRV9TVUNDRVNTX0NPREUgICAgID0gQ0RQX0RFQ0xBUkUuREVDTEFSRV9TVUNDRVNTX0NPREU7XG5pbXBvcnQgREVDTEFSRV9FUlJPUl9DT0RFICAgICAgID0gQ0RQX0RFQ0xBUkUuREVDTEFSRV9FUlJPUl9DT0RFO1xuaW1wb3J0IEFTU0lHTl9SRVNVTFRfQ09ERSAgICAgICA9IENEUF9ERUNMQVJFLkFTU0lHTl9SRVNVTFRfQ09ERTtcbmltcG9ydCBFUlJPUl9NRVNTQUdFX01BUCAgICAgICAgPSBDRFBfREVDTEFSRS5FUlJPUl9NRVNTQUdFX01BUDtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBEZXNjcmlwdGlvbiB7XG4gICAgVU5LTk9XTl9FUlJPUl9OQU1FID0nVU5LTk9XTicsXG59XG5cbmV4cG9ydCB7XG4gICAgUkVTVUxUX0NPREUsXG4gICAgUkVTVUxUX0NPREVfQkFTRSxcbiAgICBSRVNVTFRfQ09ERV9SQU5HRSxcbiAgICBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLFxuICAgIERFQ0xBUkVfU1VDQ0VTU19DT0RFLFxuICAgIERFQ0xBUkVfRVJST1JfQ09ERSxcbiAgICBBU1NJR05fUkVTVUxUX0NPREUsXG59O1xuXG4vKipcbiAqIEBlbiBKdWRnZSBmYWlsIG9yIG5vdC5cbiAqIEBqYSDlpLHmlZfliKTlrppcbiAqXG4gKiBAcGFyYW0gY29kZSBbW1JFU1VMVF9DT0RFXV1cbiAqIEByZXR1cm5zIHRydWU6IGZhaWwgcmVzdWx0IC8gZmFsc2U6IHN1Y2Nlc3MgcmVzdWx0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBGQUlMRUQoY29kZTogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGNvZGUgPCAwO1xufVxuXG4vKipcbiAqIEBlbiBKdWRnZSBzdWNjZXNzIG9yIG5vdC5cbiAqIEBqYSDmiJDlip/liKTlrppcbiAqXG4gKiBAcGFyYW0gY29kZSBbW1JFU1VMVF9DT0RFXV1cbiAqIEByZXR1cm5zIHRydWU6IHN1Y2Nlc3MgcmVzdWx0IC8gZmFsc2U6IGZhaWwgcmVzdWx0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBTVUNDRUVERUQoY29kZTogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICFGQUlMRUQoY29kZSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gW1tSRVNVTFRfQ09ERV1dIGBuYW1lYCBzdHJpbmcgZnJvbSBbW1JFU1VMVF9DT0RFXV0uXG4gKiBAamEgW1tSRVNVTFRfQ09ERV1dIOOCkiBbW1JFU1VMVF9DT0RFXV0g5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGNvZGUgW1tSRVNVTFRfQ09ERV1dXG4gKiBAcGFyYW0gdGFnICBjdXN0b20gdGFnIGlmIG5lZWRlZC5cbiAqIEByZXR1cm5zIG5hbWUgc3RyaW5nIGV4KSBcIlt0YWddW05PVF9TVVBQT1JURURdXCJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvTmFtZVN0cmluZyhjb2RlOiBudW1iZXIsIHRhZz86IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgcHJlZml4ID0gdGFnID8gYFske3RhZ31dYCA6ICcnO1xuICAgIGlmIChSRVNVTFRfQ09ERVtjb2RlXSkge1xuICAgICAgICByZXR1cm4gYCR7cHJlZml4fVske1JFU1VMVF9DT0RFW2NvZGVdfV1gO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBgJHtwcmVmaXh9WyR7RGVzY3JpcHRpb24uVU5LTk9XTl9FUlJPUl9OQU1FfV1gO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBoZWxwIHN0cmluZyBmcm9tIFtbUkVTVUxUX0NPREVdXS5cbiAqIEBqYSBbW1JFU1VMVF9DT0RFXV0g44KS44OY44Or44OX44K544OI44Oq44Oz44Kw44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGNvZGUgW1tSRVNVTFRfQ09ERV1dXG4gKiBAcmV0dXJucyByZWdpc3RlcmVkIGhlbHAgc3RyaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b0hlbHBTdHJpbmcoY29kZTogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBjb25zdCBtYXAgPSBFUlJPUl9NRVNTQUdFX01BUCgpO1xuICAgIGlmIChtYXBbY29kZV0pIHtcbiAgICAgICAgcmV0dXJuIG1hcFtjb2RlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYHVucmVnaXN0ZXJlZCByZXN1bHQgY29kZS4gW2NvZGU6ICR7Y29kZX1dYDtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIGNsYXNzTmFtZSxcbiAgICBpc05pbCxcbiAgICBpc1N0cmluZyxcbiAgICBpc0NoYW5jZWxMaWtlRXJyb3IsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIFJFU1VMVF9DT0RFLFxuICAgIFNVQ0NFRURFRCxcbiAgICBGQUlMRUQsXG4gICAgdG9OYW1lU3RyaW5nLFxuICAgIHRvSGVscFN0cmluZyxcbn0gZnJvbSAnLi9yZXN1bHQtY29kZSc7XG5cbmNvbnN0IHtcbiAgICAvKiogQGludGVybmFsICovIGlzRmluaXRlOiBpc051bWJlclxufSA9IE51bWJlcjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBUYWcge1xuICAgIEVSUk9SICA9ICdFcnJvcicsXG4gICAgUkVTVUxUID0gJ1Jlc3VsdCcsXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGRlc2MgPSAodmFsdWU6IHVua25vd24pOiBQcm9wZXJ0eURlc2NyaXB0b3IgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgdmFsdWUsXG4gICAgfTtcbn07XG5cbi8qKlxuICogQGVuIEEgcmVzdWx0IGhvbGRlciBjbGFzcy4gPGJyPlxuICogICAgIERlcml2ZWQgbmF0aXZlIGBFcnJvcmAgY2xhc3MuXG4gKiBAamEg5Yem55CG57WQ5p6c5Lyd6YGU44Kv44Op44K5IDxicj5cbiAqICAgICDjg43jgqTjg4bjgqPjg5YgYEVycm9yYCDjga7mtL7nlJ/jgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIFJlc3VsdCBleHRlbmRzIEVycm9yIHtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29kZVxuICAgICAqICAtIGBlbmAgcmVzdWx0IGNvZGVcbiAgICAgKiAgLSBgamFgIOe1kOaenOOCs+ODvOODiVxuICAgICAqIEBwYXJhbSBtZXNzYWdlXG4gICAgICogIC0gYGVuYCByZXN1bHQgaW5mbyBtZXNzYWdlXG4gICAgICogIC0gYGphYCDntZDmnpzmg4XloLHjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKiBAcGFyYW0gY2F1c2VcbiAgICAgKiAgLSBgZW5gIGxvdy1sZXZlbCBlcnJvciBpbmZvcm1hdGlvblxuICAgICAqICAtIGBqYWAg5LiL5L2N44Gu44Ko44Op44O85oOF5aCxXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29kZT86IG51bWJlciwgbWVzc2FnZT86IHN0cmluZywgY2F1c2U/OiB1bmtub3duKSB7XG4gICAgICAgIGNvZGUgPSBpc05pbChjb2RlKSA/IFJFU1VMVF9DT0RFLlNVQ0NFU1MgOiBpc051bWJlcihjb2RlKSA/IE1hdGgudHJ1bmMoY29kZSkgOiBSRVNVTFRfQ09ERS5GQUlMO1xuICAgICAgICBzdXBlcihtZXNzYWdlIHx8IHRvSGVscFN0cmluZyhjb2RlKSk7XG4gICAgICAgIGxldCB0aW1lID0gaXNFcnJvcihjYXVzZSkgPyAoY2F1c2UgYXMgUmVzdWx0KS50aW1lIDogdW5kZWZpbmVkO1xuICAgICAgICBpc051bWJlcih0aW1lIGFzIG51bWJlcikgfHwgKHRpbWUgPSBEYXRlLm5vdygpKTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywgeyBjb2RlOiBkZXNjKGNvZGUpLCBjYXVzZTogZGVzYyhjYXVzZSksIHRpbWU6IGRlc2ModGltZSkgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFtbUkVTVUxUX0NPREVdXSB2YWx1ZS5cbiAgICAgKiBAamEgW1tSRVNVTFRfQ09ERV1dIOOBruWApFxuICAgICAqL1xuICAgIHJlYWRvbmx5IGNvZGUhOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3RvY2sgbG93LWxldmVsIGVycm9yIGluZm9ybWF0aW9uLlxuICAgICAqIEBqYSDkuIvkvY3jga7jgqjjg6njg7zmg4XloLHjgpLmoLzntI1cbiAgICAgKi9cbiAgICByZWFkb25seSBjYXVzZTogYW55OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZW5lcmF0ZWQgdGltZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAamEg55Sf5oiQ44GV44KM44Gf5pmC5Yi75oOF5aCxXG4gICAgICovXG4gICAgcmVhZG9ubHkgdGltZSE6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBzdWNjZWVkZWQgb3Igbm90LlxuICAgICAqIEBqYSDmiJDlip/liKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNTdWNjZWVkZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBTVUNDRUVERUQodGhpcy5jb2RlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2UgZmFpbGVkIG9yIG5vdC5cbiAgICAgKiBAamEg5aSx5pWX5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzRmFpbGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gRkFJTEVEKHRoaXMuY29kZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEp1ZGdlIGNhbmNlbGVkIG9yIG5vdC5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or44Ko44Op44O85Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzQ2FuY2VsZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvZGUgPT09IFJFU1VMVF9DT0RFLkFCT1JUO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZm9ybWF0dGVkIFtbUkVTVUxUX0NPREVdXSBuYW1lIHN0cmluZy5cbiAgICAgKiBAamEg44OV44Kp44O844Oe44OD44OI44GV44KM44GfIFtbUkVTVUxUX0NPREVdXSDlkI3mloflrZfliJfjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgY29kZU5hbWUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRvTmFtZVN0cmluZyh0aGlzLmNvZGUsIHRoaXMubmFtZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBbW1JFU1VMVF9DT0RFXV0gaGVscCBzdHJpbmcuXG4gICAgICogQGphIFtbUkVTVUxUX0NPREVdXSDjga7jg5jjg6vjg5fjgrnjg4jjg6rjg7PjgrDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaGVscCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdG9IZWxwU3RyaW5nKHRoaXMuY29kZSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6IFRhZy5SRVNVTFQge1xuICAgICAgICByZXR1cm4gVGFnLlJFU1VMVDtcbiAgICB9XG59XG5cblJlc3VsdC5wcm90b3R5cGUubmFtZSA9IFRhZy5SRVNVTFQ7XG5cbi8qKiBAaW50ZXJuYSBsUmV0dXJucyBgdHJ1ZWAgaWYgYHhgIGlzIGBFcnJvcmAsIGBmYWxzZWAgb3RoZXJ3aXNlLiAqL1xuZnVuY3Rpb24gaXNFcnJvcih4OiB1bmtub3duKTogeCBpcyBFcnJvciB7XG4gICAgcmV0dXJuIHggaW5zdGFuY2VvZiBFcnJvciB8fCBjbGFzc05hbWUoeCkgPT09IFRhZy5FUlJPUjtcbn1cblxuLyoqIFJldHVybnMgYHRydWVgIGlmIGB4YCBpcyBgUmVzdWx0YCwgYGZhbHNlYCBvdGhlcndpc2UuICovXG5leHBvcnQgZnVuY3Rpb24gaXNSZXN1bHQoeDogdW5rbm93bik6IHggaXMgUmVzdWx0IHtcbiAgICByZXR1cm4geCBpbnN0YW5jZW9mIFJlc3VsdCB8fCBjbGFzc05hbWUoeCkgPT09IFRhZy5SRVNVTFQ7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gW1tSZXN1bHRdXSBvYmplY3QuXG4gKiBAamEgW1tSZXN1bHRdXSDjgqrjg5bjgrjjgqfjgq/jg4jjgavlpInmj5tcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvUmVzdWx0KG86IHVua25vd24pOiBSZXN1bHQge1xuICAgIGlmIChvIGluc3RhbmNlb2YgUmVzdWx0KSB7XG4gICAgICAgIC8qIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBwcmVmZXItY29uc3QgKi9cbiAgICAgICAgbGV0IHsgY29kZSwgY2F1c2UsIHRpbWUgfSA9IG87XG4gICAgICAgIGNvZGUgPSBpc05pbChjb2RlKSA/IFJFU1VMVF9DT0RFLlNVQ0NFU1MgOiBpc051bWJlcihjb2RlKSA/IE1hdGgudHJ1bmMoY29kZSkgOiBSRVNVTFRfQ09ERS5GQUlMO1xuICAgICAgICBpc051bWJlcih0aW1lKSB8fCAodGltZSA9IERhdGUubm93KCkpO1xuICAgICAgICAvLyBEbyBub3RoaW5nIGlmIGFscmVhZHkgZGVmaW5lZFxuICAgICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KG8sICdjb2RlJywgIGRlc2MoY29kZSkpO1xuICAgICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KG8sICdjYXVzZScsIGRlc2MoY2F1c2UpKTtcbiAgICAgICAgUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eShvLCAndGltZScsICBkZXNjKHRpbWUpKTtcbiAgICAgICAgcmV0dXJuIG87XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZSA9IE9iamVjdChvKSBhcyBSZXN1bHQ7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBpc1N0cmluZyhlLm1lc3NhZ2UpID8gZS5tZXNzYWdlIDogaXNTdHJpbmcobykgPyBvIDogdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBjb2RlID0gaXNDaGFuY2VsTGlrZUVycm9yKG1lc3NhZ2UpID8gUkVTVUxUX0NPREUuQUJPUlQgOiBpc051bWJlcihlLmNvZGUpID8gZS5jb2RlIDogbyBhcyBudW1iZXI7XG4gICAgICAgIGNvbnN0IGNhdXNlID0gaXNFcnJvcihlLmNhdXNlKSA/IGUuY2F1c2UgOiBpc0Vycm9yKG8pID8gbyA6IGlzU3RyaW5nKG8pID8gbmV3IEVycm9yKG8pIDogbztcbiAgICAgICAgcmV0dXJuIG5ldyBSZXN1bHQoY29kZSwgbWVzc2FnZSwgY2F1c2UpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIFtbUmVzdWx0XV0gaGVscGVyLlxuICogQGphIFtbUmVzdWx0XV0g44Kq44OW44K444Kn44Kv44OI5qeL56+J44OY44Or44OR44O8XG4gKlxuICogQHBhcmFtIGNvZGVcbiAqICAtIGBlbmAgcmVzdWx0IGNvZGVcbiAqICAtIGBqYWAg57WQ5p6c44Kz44O844OJXG4gKiBAcGFyYW0gbWVzc2FnZVxuICogIC0gYGVuYCByZXN1bHQgaW5mbyBtZXNzYWdlXG4gKiAgLSBgamFgIOe1kOaenOaDheWgseODoeODg+OCu+ODvOOCuFxuICogQHBhcmFtIGNhdXNlXG4gKiAgLSBgZW5gIGxvdy1sZXZlbCBlcnJvciBpbmZvcm1hdGlvblxuICogIC0gYGphYCDkuIvkvY3jga7jgqjjg6njg7zmg4XloLFcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1ha2VSZXN1bHQoY29kZTogbnVtYmVyLCBtZXNzYWdlPzogc3RyaW5nLCBjYXVzZT86IHVua25vd24pOiBSZXN1bHQge1xuICAgIHJldHVybiBuZXcgUmVzdWx0KGNvZGUsIG1lc3NhZ2UsIGNhdXNlKTtcbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIGNhbmNlbGVkIFtbUmVzdWx0XV0gaGVscGVyLlxuICogQGphIOOCreODo+ODs+OCu+ODq+aDheWgseagvOe0jSBbW1Jlc3VsdF1dIOOCquODluOCuOOCp+OCr+ODiOani+evieODmOODq+ODkeODvFxuICpcbiAqIEBwYXJhbSBtZXNzYWdlXG4gKiAgLSBgZW5gIHJlc3VsdCBpbmZvIG1lc3NhZ2VcbiAqICAtIGBqYWAg57WQ5p6c5oOF5aCx44Oh44OD44K744O844K4XG4gKiBAcGFyYW0gY2F1c2VcbiAqICAtIGBlbmAgbG93LWxldmVsIGVycm9yIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOS4i+S9jeOBruOCqOODqeODvOaDheWgsVxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZUNhbmNlbGVkUmVzdWx0KG1lc3NhZ2U/OiBzdHJpbmcsIGNhdXNlPzogdW5rbm93bik6IFJlc3VsdCB7XG4gICAgcmV0dXJuIG5ldyBSZXN1bHQoUkVTVUxUX0NPREUuQUJPUlQsIG1lc3NhZ2UsIGNhdXNlKTtcbn1cbiIsImltcG9ydCB7XG4gICAgS2V5cyxcbiAgICBUeXBlcyxcbiAgICBLZXlUb1R5cGUsXG4gICAgZGVlcEVxdWFsLFxuICAgIGlzRW1wdHlPYmplY3QsXG4gICAgZnJvbVR5cGVkRGF0YSxcbiAgICBkcm9wVW5kZWZpbmVkLFxuICAgIHJlc3RvcmVOaWwsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24sIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBDYW5jZWxhYmxlLFxuICAgIGNoZWNrQ2FuY2VsZWQgYXMgY2MsXG59IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQge1xuICAgIFN0b3JhZ2VEYXRhLFxuICAgIFN0b3JhZ2VEYXRhVHlwZXMsXG4gICAgU3RvcmFnZURhdGFUeXBlTGlzdCxcbiAgICBTdG9yYWdlSW5wdXREYXRhVHlwZUxpc3QsXG4gICAgSVN0b3JhZ2VPcHRpb25zLFxuICAgIElTdG9yYWdlRGF0YU9wdGlvbnMsXG4gICAgSVN0b3JhZ2VEYXRhUmV0dXJuVHlwZSxcbiAgICBJU3RvcmFnZUV2ZW50Q2FsbGJhY2ssXG4gICAgSVN0b3JhZ2UsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBNZW1vcnlTdG9yYWdlIEkvTyBvcHRpb25zICovXG5leHBvcnQgdHlwZSBNZW1vcnlTdG9yYWdlT3B0aW9uczxLIGV4dGVuZHMgS2V5czxTdG9yYWdlRGF0YVR5cGVMaXN0PiA9IEtleXM8U3RvcmFnZURhdGFUeXBlTGlzdD4+ID0gSVN0b3JhZ2VEYXRhT3B0aW9uczxTdG9yYWdlRGF0YVR5cGVMaXN0LCBLPjtcbi8qKiBNZW1vcnlTdG9yYWdlIHJldHVybiB2YWx1ZSAqL1xuZXhwb3J0IHR5cGUgTWVtb3J5U3RvcmFnZVJlc3VsdDxLIGV4dGVuZHMgS2V5czxTdG9yYWdlRGF0YVR5cGVMaXN0Pj4gPSBLZXlUb1R5cGU8U3RvcmFnZURhdGFUeXBlTGlzdCwgSz47XG4vKiogTWVtb3J5U3RvcmFnZSBkYXRhIHR5cGUgKi9cbmV4cG9ydCB0eXBlIE1lbW9yeVN0b3JhZ2VEYXRhVHlwZXMgPSBUeXBlczxTdG9yYWdlRGF0YVR5cGVMaXN0Pjtcbi8qKiBNZW1vcnlTdG9yYWdlIHJldHVybiB0eXBlICovXG5leHBvcnQgdHlwZSBNZW1vcnlTdG9yYWdlUmV0dXJuVHlwZTxEIGV4dGVuZHMgTWVtb3J5U3RvcmFnZURhdGFUeXBlcz4gPSBJU3RvcmFnZURhdGFSZXR1cm5UeXBlPFN0b3JhZ2VEYXRhVHlwZUxpc3QsIEQ+O1xuLyoqIE1lbW9yeVN0b3JhZ2UgaW5wdXQgZGF0YSB0eXBlICovXG5leHBvcnQgdHlwZSBNZW1vcnlTdG9yYWdlSW5wdXREYXRhVHlwZXMgPSBTdG9yYWdlSW5wdXREYXRhVHlwZUxpc3Q8U3RvcmFnZURhdGFUeXBlTGlzdD47XG4vKiogTWVtb3J5U3RvcmFnZSBldmVudCBjYWxsYmFjayAqL1xuZXhwb3J0IHR5cGUgTWVtb3J5U3RvcmFnZUV2ZW50Q2FsbGJhY2sgPSBJU3RvcmFnZUV2ZW50Q2FsbGJhY2s8U3RvcmFnZURhdGFUeXBlTGlzdD47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBNZW1vcnlTdG9yYWdlRXZlbnQge1xuICAgICdAJzogW3N0cmluZyB8IG51bGwsIE1lbW9yeVN0b3JhZ2VEYXRhVHlwZXMgfCBudWxsLCBNZW1vcnlTdG9yYWdlRGF0YVR5cGVzIHwgbnVsbF07XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNZW1vcnkgc3RvcmFnZSBjbGFzcy4gVGhpcyBjbGFzcyBkb2Vzbid0IHN1cHBvcnQgcGVybWFuZWNpYXRpb24gZGF0YS5cbiAqIEBqYSDjg6Hjg6Ljg6rjg7zjgrnjg4jjg6zjg7zjgrjjgq/jg6njgrkuIOacrOOCr+ODqeOCueOBr+ODh+ODvOOCv+OBruawuOe2muWMluOCkuOCteODneODvOODiOOBl+OBquOBhFxuICovXG5leHBvcnQgY2xhc3MgTWVtb3J5U3RvcmFnZSBpbXBsZW1lbnRzIElTdG9yYWdlIHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9icm9rZXIgPSBuZXcgRXZlbnRCcm9rZXI8TWVtb3J5U3RvcmFnZUV2ZW50PigpO1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIF9zdG9yYWdlOiBTdG9yYWdlRGF0YSA9IHt9O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSVN0b3JhZ2VcblxuICAgIC8qKlxuICAgICAqIEBlbiBbW0lTdG9yYWdlXV0ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIFtbSVN0b3JhZ2VdXSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ21lbW9yeSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgdGhlIGN1cnJlbnQgdmFsdWUgYXNzb2NpYXRlZCB3aXRoIHRoZSBnaXZlbiBrZXksIG9yIG51bGwgaWYgdGhlIGdpdmVuIGtleSBkb2VzIG5vdCBleGlzdCBpbiB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdC5cbiAgICAgKiBAamEg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS5Y+W5b6XLiDlrZjlnKjjgZfjgarjgYTloLTlkIjjga8gbnVsbCDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIGFjY2VzcyBrZXlcbiAgICAgKiAgLSBgamFgIOOCouOCr+OCu+OCueOCreODvFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBJL08gb3B0aW9uc1xuICAgICAqICAtIGBqYWAgSS9PIOOCquODl+OCt+ODp+ODs1xuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBSZXR1cm5zIHRoZSB2YWx1ZSB3aGljaCBjb3JyZXNwb25kcyB0byBhIGtleSB3aXRoIHR5cGUgY2hhbmdlIGRlc2lnbmF0ZWQgaW4gYGRhdGFUeXBlYC5cbiAgICAgKiAgLSBgamFgIGBkYXRhVHlwZWAg44Gn5oyH5a6a44GV44KM44Gf5Z6L5aSJ5o+b44KS6KGM44Gj44GmLCDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLov5TljbRcbiAgICAgKi9cbiAgICBnZXRJdGVtPEQgZXh0ZW5kcyBNZW1vcnlTdG9yYWdlRGF0YVR5cGVzID0gTWVtb3J5U3RvcmFnZURhdGFUeXBlcz4oXG4gICAgICAgIGtleTogc3RyaW5nLFxuICAgICAgICBvcHRpb25zPzogTWVtb3J5U3RvcmFnZU9wdGlvbnM8bmV2ZXI+XG4gICAgKTogUHJvbWlzZTxNZW1vcnlTdG9yYWdlUmV0dXJuVHlwZTxEPj47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyB0aGUgY3VycmVudCB2YWx1ZSBhc3NvY2lhdGVkIHdpdGggdGhlIGdpdmVuIGtleSwgb3IgbnVsbCBpZiB0aGUgZ2l2ZW4ga2V5IGRvZXMgbm90IGV4aXN0IGluIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0LlxuICAgICAqIEBqYSDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLlj5blvpcuIOWtmOWcqOOBl+OBquOBhOWgtOWQiOOBryBudWxsIOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgYWNjZXNzIGtleVxuICAgICAqICAtIGBqYWAg44Ki44Kv44K744K544Kt44O8XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIEkvTyBvcHRpb25zXG4gICAgICogIC0gYGphYCBJL08g44Kq44OX44K344On44OzXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIFJldHVybnMgdGhlIHZhbHVlIHdoaWNoIGNvcnJlc3BvbmRzIHRvIGEga2V5IHdpdGggdHlwZSBjaGFuZ2UgZGVzaWduYXRlZCBpbiBgZGF0YVR5cGVgLlxuICAgICAqICAtIGBqYWAgYGRhdGFUeXBlYCDjgafmjIflrprjgZXjgozjgZ/lnovlpInmj5vjgpLooYzjgaPjgaYsIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkui/lOWNtFxuICAgICAqL1xuICAgIGdldEl0ZW08SyBleHRlbmRzIEtleXM8U3RvcmFnZURhdGFUeXBlTGlzdD4+KFxuICAgICAgICBrZXk6IHN0cmluZyxcbiAgICAgICAgb3B0aW9ucz86IE1lbW9yeVN0b3JhZ2VPcHRpb25zPEs+XG4gICAgKTogUHJvbWlzZTxNZW1vcnlTdG9yYWdlUmVzdWx0PEs+IHwgbnVsbD47XG5cbiAgICBhc3luYyBnZXRJdGVtKGtleTogc3RyaW5nLCBvcHRpb25zPzogTWVtb3J5U3RvcmFnZU9wdGlvbnMpOiBQcm9taXNlPE1lbW9yeVN0b3JhZ2VEYXRhVHlwZXMgfCBudWxsPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zLmNhbmNlbCk7XG5cbiAgICAgICAgLy8gYHVuZGVmaW5lZGAg4oaSIGBudWxsYFxuICAgICAgICBjb25zdCB2YWx1ZSA9IGRyb3BVbmRlZmluZWQodGhpcy5fc3RvcmFnZVtrZXldKTtcbiAgICAgICAgc3dpdGNoIChvcHRpb25zLmRhdGFUeXBlKSB7XG4gICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgIHJldHVybiBmcm9tVHlwZWREYXRhKHZhbHVlKSBhcyBzdHJpbmc7XG4gICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgIHJldHVybiBOdW1iZXIocmVzdG9yZU5pbCh2YWx1ZSkpO1xuICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIEJvb2xlYW4ocmVzdG9yZU5pbCh2YWx1ZSkpO1xuICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gT2JqZWN0KHJlc3RvcmVOaWwodmFsdWUpKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3RvcmVOaWwodmFsdWUpIGFzIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0cyB0aGUgdmFsdWUgb2YgdGhlIHBhaXIgaWRlbnRpZmllZCBieSBrZXkgdG8gdmFsdWUsIGNyZWF0aW5nIGEgbmV3IGtleS92YWx1ZSBwYWlyIGlmIG5vbmUgZXhpc3RlZCBmb3Iga2V5IHByZXZpb3VzbHkuXG4gICAgICogQGphIOOCreODvOOCkuaMh+WumuOBl+OBpuWApOOCkuioreWumi4g5a2Y5Zyo44GX44Gq44GE5aC05ZCI44Gv5paw6KaP44Gr5L2c5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBhY2Nlc3Mga2V5XG4gICAgICogIC0gYGphYCDjgqLjgq/jgrvjgrnjgq3jg7xcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgSS9PIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIEkvTyDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBzZXRJdGVtPFYgZXh0ZW5kcyBNZW1vcnlTdG9yYWdlSW5wdXREYXRhVHlwZXM+KGtleTogc3RyaW5nLCB2YWx1ZTogViwgb3B0aW9ucz86IE1lbW9yeVN0b3JhZ2VPcHRpb25zPG5ldmVyPik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgYXdhaXQgY2Mob3B0aW9ucy5jYW5jZWwpO1xuICAgICAgICBjb25zdCBuZXdWYWwgPSBkcm9wVW5kZWZpbmVkKHZhbHVlLCB0cnVlKTsgICAgICAgICAvLyBgbnVsbGAgb3IgYHVuZGVmaW5lZGAg4oaSICdudWxsJyBvciAndW5kZWZpbmVkJ1xuICAgICAgICBjb25zdCBvbGRWYWwgPSBkcm9wVW5kZWZpbmVkKHRoaXMuX3N0b3JhZ2Vba2V5XSk7ICAvLyBgdW5kZWZpbmVkYCDihpIgYG51bGxgXG4gICAgICAgIGlmICghZGVlcEVxdWFsKG9sZFZhbCwgbmV3VmFsKSkge1xuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZVtrZXldID0gbmV3VmFsIGFzIFN0b3JhZ2VEYXRhVHlwZXM7XG4gICAgICAgICAgICAhb3B0aW9ucy5zaWxlbnQgJiYgdGhpcy5fYnJva2VyLnRyaWdnZXIoJ0AnLCBrZXksIG5ld1ZhbCwgb2xkVmFsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmVzIHRoZSBrZXkvdmFsdWUgcGFpciB3aXRoIHRoZSBnaXZlbiBrZXkgZnJvbSB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdCwgaWYgYSBrZXkvdmFsdWUgcGFpciB3aXRoIHRoZSBnaXZlbiBrZXkgZXhpc3RzLlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ/jgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgYzlrZjlnKjjgZnjgozjgbDliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzdG9yYWdlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCueODiOODrOODvOOCuOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHJlbW92ZUl0ZW0oa2V5OiBzdHJpbmcsIG9wdGlvbnM/OiBJU3RvcmFnZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGF3YWl0IGNjKG9wdGlvbnMuY2FuY2VsKTtcbiAgICAgICAgY29uc3Qgb2xkVmFsID0gdGhpcy5fc3RvcmFnZVtrZXldO1xuICAgICAgICBpZiAodW5kZWZpbmVkICE9PSBvbGRWYWwpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9zdG9yYWdlW2tleV07XG4gICAgICAgICAgICAhb3B0aW9ucy5zaWxlbnQgJiYgdGhpcy5fYnJva2VyLnRyaWdnZXIoJ0AnLCBrZXksIG51bGwsIG9sZFZhbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRW1wdGllcyB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdCBvZiBhbGwga2V5L3ZhbHVlIHBhaXJzLCBpZiB0aGVyZSBhcmUgYW55LlxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzdG9yYWdlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCueODiOODrOODvOOCuOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIGNsZWFyKG9wdGlvbnM/OiBJU3RvcmFnZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGF3YWl0IGNjKG9wdGlvbnMuY2FuY2VsKTtcbiAgICAgICAgaWYgKCFpc0VtcHR5T2JqZWN0KHRoaXMuX3N0b3JhZ2UpKSB7XG4gICAgICAgICAgICB0aGlzLl9zdG9yYWdlID0ge307XG4gICAgICAgICAgICAhb3B0aW9ucy5zaWxlbnQgJiYgdGhpcy5fYnJva2VyLnRyaWdnZXIoJ0AnLCBudWxsLCBudWxsLCBudWxsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFsbCBlbnRyeSBrZXlzLlxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgq3jg7zkuIDopqfjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjYW5jZWwgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744Or44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMga2V5cyhvcHRpb25zPzogQ2FuY2VsYWJsZSk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICAgICAgYXdhaXQgY2Mob3B0aW9ucyAmJiBvcHRpb25zLmNhbmNlbCk7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9zdG9yYWdlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbihsaXN0ZW5lcjogTWVtb3J5U3RvcmFnZUV2ZW50Q2FsbGJhY2spOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYnJva2VyLm9uKCdAJywgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/jgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvZmYobGlzdGVuZXI/OiBNZW1vcnlTdG9yYWdlRXZlbnRDYWxsYmFjayk6IHZvaWQge1xuICAgICAgICB0aGlzLl9icm9rZXIub2ZmKCdAJywgbGlzdGVuZXIpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGEgc3RvcmFnZS1zdG9yZSBvYmplY3QuXG4gICAgICogQGphIOOCueODiOODrOODvOOCuOOCueODiOOCouOCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGdldCBjb250ZXh0KCk6IFN0b3JhZ2VEYXRhIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2U7XG4gICAgfVxufVxuXG4vLyBkZWZhdWx0IHN0b3JhZ2VcbmV4cG9ydCBjb25zdCBtZW1vcnlTdG9yYWdlID0gbmV3IE1lbW9yeVN0b3JhZ2UoKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIHBvc3QsXG4gICAgZGVlcEVxdWFsLFxuICAgIGRlZXBDb3B5LFxuICAgIGRyb3BVbmRlZmluZWQsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgU3RvcmFnZURhdGEsXG4gICAgSVN0b3JhZ2UsXG4gICAgSVN0b3JhZ2VPcHRpb25zLFxuICAgIElTdG9yYWdlRm9ybWF0T3B0aW9ucyxcbiAgICBSZWdpc3RyeVNjaGVtYUJhc2UsXG4gICAgUmVnaXN0cnlFdmVudCxcbiAgICBSZWdpc3RyeVJlYWRPcHRpb25zLFxuICAgIFJlZ2lzdHJ5V3JpdGVPcHRpb25zLFxuICAgIFJlZ2lzdHJ5U2F2ZU9wdGlvbnMsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQGVuIFJlZ2lzdHJ5IG1hbmFnZW1lbnQgY2xhc3MgZm9yIHN5bmNocm9ub3VzIFJlYWQvV3JpdGUgYWNjZXNzaWJsZSBmcm9tIGFueSBbW0lTdG9yYWdlXV0gb2JqZWN0LlxuICogQGphIOS7u+aEj+OBriBbW0lTdG9yYWdlXV0g44Kq44OW44K444Kn44Kv44OI44GL44KJ5ZCM5pyfIFJlYWQvV3JpdGUg44Ki44Kv44K744K55Y+v6IO944Gq44Os44K444K544OI44Oq566h55CG44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAvLyAxLiBkZWZpbmUgcmVnaXN0cnkgc2NoZW1hXG4gKiBpbnRlcmZhY2UgU2NoZW1hIGV4dGVuZHMgUmVnaXN0cnlTY2hlbWFCYXNlIHtcbiAqICAgICdjb21tb24vbW9kZSc6ICdub3JtYWwnIHwgJ3NwZWNpZmllZCc7XG4gKiAgICAnY29tbW9uL3ZhbHVlJzogbnVtYmVyO1xuICogICAgJ3RyYWRlL2xvY2FsJzogeyB1bml0OiAn5YaGJyB8ICckJzsgcmF0ZTogbnVtYmVyOyB9O1xuICogICAgJ3RyYWRlL2NoZWNrJzogYm9vbGVhbjtcbiAqICAgICdleHRyYS91c2VyJzogc3RyaW5nO1xuICogfVxuICpcbiAqIC8vIDIuIHByZXBhcmUgSVN0b3JhZ2UgaW5zdGFuY2VcbiAqIC8vIGV4XG4gKiBpbXBvcnQgeyB3ZWJTdG9yYWdlIH0gZnJvbSAnQGNkcC93ZWItc3RvcmFnZSc7XG4gKlxuICogLy8gMy4gaW5zdGFudGlhdGUgdGhpcyBjbGFzc1xuICogY29uc3QgcmVnID0gbmV3IFJlZ2lzdHJ5PFNjaGVtYT4od2ViU3RvcmFnZSwgJ0B0ZXN0Jyk7XG4gKlxuICogLy8gNC4gcmVhZCBleGFtcGxlXG4gKiBjb25zdCB2YWwgPSByZWcucmVhZCgnY29tbW9uL21vZGUnKTsgLy8gJ25vcm1hbCcgfCAnc3BlY2lmaWVkJyB8IG51bGxcbiAqXG4gKiAvLyA1LiB3cml0ZSBleGFtcGxlXG4gKiByZWcud3JpdGUoJ2NvbW1vbi9tb2RlJywgJ3NwZWNpZmllZCcpO1xuICogLy8gcmVnLndyaXRlKCdjb21tb24vbW9kZScsICdob2dlJyk7IC8vIGNvbXBpbGUgZXJyb3JcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgUmVnaXN0cnk8VCBleHRlbmRzIFJlZ2lzdHJ5U2NoZW1hQmFzZSA9IGFueT4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxSZWdpc3RyeUV2ZW50PFQ+PiB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RvcmFnZTogSVN0b3JhZ2U7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Jvb3RLZXk6IHN0cmluZztcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfZGVmYXVsdE9wdGlvbnM6IElTdG9yYWdlRm9ybWF0T3B0aW9ucztcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBfc3RvcmU6IFN0b3JhZ2VEYXRhID0ge307XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHN0b3JhZ2VcbiAgICAgKiAgLSBgZW5gIFJvb3Qga2V5IGZvciBbW0lTdG9yYWdlXV0uXG4gICAgICogIC0gYGphYCBbW0lTdG9yYWdlXV0g44Gr5L2/55So44GZ44KL44Or44O844OI44Kt44O8XG4gICAgICogQHBhcmFtIHJvb3RLZXlcbiAgICAgKiAgLSBgZW5gIFJvb3Qga2V5IGZvciBbW0lTdG9yYWdlXV0uXG4gICAgICogIC0gYGphYCBbW0lTdG9yYWdlXV0g44Gr5L2/55So44GZ44KL44Or44O844OI44Kt44O8XG4gICAgICogQHBhcmFtIGZvcm1hdFNwYWNlXG4gICAgICogIC0gYGVuYCBmb3IgSlNPTiBmb3JtYXQgc3BhY2UuXG4gICAgICogIC0gYGphYCBKU09OIOODleOCqeODvOODnuODg+ODiOOCueODmuODvOOCueOCkuaMh+WumlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHN0b3JhZ2U6IElTdG9yYWdlPGFueT4sIHJvb3RLZXk6IHN0cmluZywgZm9ybWF0U3BhY2U/OiBudW1iZXIpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fc3RvcmFnZSA9IHN0b3JhZ2U7XG4gICAgICAgIHRoaXMuX3Jvb3RLZXkgPSByb290S2V5O1xuICAgICAgICB0aGlzLl9kZWZhdWx0T3B0aW9ucyA9IHsganNvblNwYWNlOiBmb3JtYXRTcGFjZSB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gcm9vdCBrZXkuXG4gICAgICogQGphIOODq+ODvOODiOOCreODvOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCByb290S2V5KCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb290S2V5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gW1tJU3RvcmFnZV1dIG9iamVjdC5cbiAgICAgKiBAamEgW1tJU3RvcmFnZV1dIOOCquODluOCuOOCp+OCr+ODiOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBzdG9yYWdlKCk6IElTdG9yYWdlPGFueT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWFkIHBlcnNpc3RlbmNlIGRhdGEgZnJvbSBbW0lTdG9yYWdlXV0uIFRoZSBkYXRhIGxvYWRlZCBhbHJlYWR5IHdpbGwgYmUgY2xlYXJlZC5cbiAgICAgKiBAamEgW1tJU3RvcmFnZV1dIOOBi+OCieawuOe2muWMluOBl+OBn+ODh+ODvOOCv+OCkuiqreOBv+i+vOOBvy4g44GZ44Gn44Gr44Kt44Oj44OD44K344Ol44GV44KM44Gm44GE44KL44OH44O844K/44Gv56C05qOE44GV44KM44KLXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGxvYWQob3B0aW9ucz86IElTdG9yYWdlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgdGhpcy5fc3RvcmUgPSAoYXdhaXQgdGhpcy5fc3RvcmFnZS5nZXRJdGVtKHRoaXMuX3Jvb3RLZXksIG9wdGlvbnMpKSB8fCB7fTtcbiAgICAgICAgaWYgKCFvcHRpb25zLnNpbGVudCkge1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHRoaXMucHVibGlzaCgnY2hhbmdlJywgJyonKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUGVyc2lzdCBkYXRhIHRvIFtbSVN0b3JhZ2VdXS5cbiAgICAgKiBAamEgW1tJU3RvcmFnZV1dIOOBq+ODh+ODvOOCv+OCkuawuOe2muWMllxuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBzYXZlKG9wdGlvbnM/OiBSZWdpc3RyeVNhdmVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IG9wdHM6IFJlZ2lzdHJ5U2F2ZU9wdGlvbnMgPSB7IC4uLnRoaXMuX2RlZmF1bHRPcHRpb25zLCAuLi5vcHRpb25zIH07XG4gICAgICAgIGlmICghb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnd2lsbC1zYXZlJyk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5fc3RvcmFnZS5zZXRJdGVtKHRoaXMuX3Jvb3RLZXksIHRoaXMuX3N0b3JlLCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVhZCByZWdpc3RyeSB2YWx1ZS5cbiAgICAgKiBAamEg44Os44K444K544OI44Oq5YCk44Gu6Kqt44G/5Y+W44KKXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgcmVnaXN0cnkga2V5LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Os44K444K544OI44Oq44Kt44O844KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlYWQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZWFkPEsgZXh0ZW5kcyBrZXlvZiBUPihrZXk6IEssIG9wdGlvbnM/OiBSZWdpc3RyeVJlYWRPcHRpb25zKTogVFtLXSB8IG51bGwge1xuICAgICAgICBjb25zdCB7IGZpZWxkIH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBjb25zdCBzdHJ1Y3R1cmUgPSBTdHJpbmcoa2V5KS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBsYXN0S2V5ID0gc3RydWN0dXJlLnBvcCgpIGFzIHN0cmluZztcblxuICAgICAgICBsZXQgbmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBsZXQgcmVnID0gdGhpcy50YXJnZXRSb290KGZpZWxkKTtcblxuICAgICAgICB3aGlsZSAobmFtZSA9IHN0cnVjdHVyZS5zaGlmdCgpKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uZC1hc3NpZ25cbiAgICAgICAgICAgIGlmICghKG5hbWUgaW4gcmVnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVnID0gcmVnW25hbWVdIGFzIFN0b3JhZ2VEYXRhO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcmV0dXJuIGRlZXAgY29weVxuICAgICAgICByZXR1cm4gKG51bGwgIT0gcmVnW2xhc3RLZXldKSA/IGRlZXBDb3B5KHJlZ1tsYXN0S2V5XSkgYXMgYW55IDogbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gV3JpdGUgcmVnaXN0cnkgdmFsdWUuXG4gICAgICogQGphIOODrOOCuOOCueODiOODquWApOOBruabuOOBjei+vOOBv1xuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHJlZ2lzdHJ5IGtleS5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODrOOCuOOCueODiOODquOCreODvOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgdXBkYXRlIHZhbHVlLiBpZiBgbnVsbGAgc2V0IHRvIGRlbGV0ZS5cbiAgICAgKiAgLSBgamFgIOabtOaWsOOBmeOCi+WApC4gYG51bGxgIOOBr+WJiumZpFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCB3cml0ZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5pu444GN6L6844G/44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHdyaXRlPEsgZXh0ZW5kcyBrZXlvZiBUPihrZXk6IEssIHZhbHVlOiBUW0tdIHwgbnVsbCwgb3B0aW9ucz86IFJlZ2lzdHJ5V3JpdGVPcHRpb25zKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgZmllbGQsIG5vU2F2ZSwgc2lsZW50IH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBjb25zdCByZW1vdmUgPSAobnVsbCA9PSB2YWx1ZSk7XG4gICAgICAgIGNvbnN0IHN0cnVjdHVyZSA9IFN0cmluZyhrZXkpLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IGxhc3RLZXkgPSBzdHJ1Y3R1cmUucG9wKCkgYXMgc3RyaW5nO1xuXG4gICAgICAgIGxldCBuYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGxldCByZWcgPSB0aGlzLnRhcmdldFJvb3QoZmllbGQpO1xuXG4gICAgICAgIHdoaWxlIChuYW1lID0gc3RydWN0dXJlLnNoaWZ0KCkpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25kLWFzc2lnblxuICAgICAgICAgICAgaWYgKG5hbWUgaW4gcmVnKSB7XG4gICAgICAgICAgICAgICAgcmVnID0gcmVnW25hbWVdIGFzIFN0b3JhZ2VEYXRhO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZW1vdmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIOOBmeOBp+OBq+imquOCreODvOOBjOOBquOBhOOBn+OCgeS9leOCguOBl+OBquOBhFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWcgPSByZWdbbmFtZV0gPSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG5ld1ZhbCA9IHJlbW92ZSA/IG51bGwgOiB2YWx1ZTtcbiAgICAgICAgY29uc3Qgb2xkVmFsID0gZHJvcFVuZGVmaW5lZChyZWdbbGFzdEtleV0pO1xuICAgICAgICBpZiAoZGVlcEVxdWFsKG9sZFZhbCwgbmV3VmFsKSkge1xuICAgICAgICAgICAgcmV0dXJuOyAvLyDmm7TmlrDjgarjgZdcbiAgICAgICAgfSBlbHNlIGlmIChyZW1vdmUpIHtcbiAgICAgICAgICAgIGRlbGV0ZSByZWdbbGFzdEtleV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZWdbbGFzdEtleV0gPSBkZWVwQ29weShuZXdWYWwpIGFzIGFueTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbm9TYXZlKSB7XG4gICAgICAgICAgICAvLyBubyBmaXJlIG5vdGlmaWNhdGlvblxuICAgICAgICAgICAgdm9pZCB0aGlzLl9zdG9yYWdlLnNldEl0ZW0odGhpcy5fcm9vdEtleSwgdGhpcy5fc3RvcmUsIHsgLi4udGhpcy5fZGVmYXVsdE9wdGlvbnMsIC4uLm9wdGlvbnMgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHRoaXMucHVibGlzaCgnY2hhbmdlJywga2V5LCBuZXdWYWwsIG9sZFZhbCBhcyBhbnkpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWxldGUgcmVnaXN0cnkga2V5LlxuICAgICAqIEBqYSDjg6zjgrjjgrnjg4jjg6rjgq3jg7zjga7liYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCByZWdpc3RyeSBrZXkuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jg6zjgrjjgrnjg4jjg6rjgq3jg7zjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVhZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5pu444GN6L6844G/44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGRlbGV0ZTxLIGV4dGVuZHMga2V5b2YgVD4oa2V5OiBLLCBvcHRpb25zPzogUmVnaXN0cnlXcml0ZU9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgdGhpcy53cml0ZShrZXksIG51bGwsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBhbGwgcmVnaXN0cnkuXG4gICAgICogQGphIOODrOOCuOOCueODiOODquOBruWFqOWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlYWQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOabuOOBjei+vOOBv+OCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBjbGVhcihvcHRpb25zPzogUmVnaXN0cnlXcml0ZU9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIHRoaXMuX3N0b3JlID0ge307XG4gICAgICAgIHZvaWQgdGhpcy5fc3RvcmFnZS5yZW1vdmVJdGVtKHRoaXMuX3Jvb3RLZXksIG9wdGlvbnMpO1xuICAgICAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2NoYW5nZScsIG51bGwsIG51bGwsIG51bGwpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBnZXQgcm9vdCBvYmplY3QgKi9cbiAgICBwcml2YXRlIHRhcmdldFJvb3QoZmllbGQ/OiBzdHJpbmcpOiBTdG9yYWdlRGF0YSB7XG4gICAgICAgIGlmIChmaWVsZCkge1xuICAgICAgICAgICAgLy8gZW5zdXJlIFtmaWVsZF0gb2JqZWN0LlxuICAgICAgICAgICAgdGhpcy5fc3RvcmVbZmllbGRdID0gdGhpcy5fc3RvcmVbZmllbGRdIHx8IHt9O1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JlW2ZpZWxkXSBhcyBTdG9yYWdlRGF0YTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdG9yZTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCB7IGVzY2FwZUhUTUwgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBUZW1wbGF0ZURlbGltaXRlcnMsXG4gICAgVGVtcGxhdGVXcml0ZXIsXG4gICAgVGVtcGxhdGVFc2NhcGVyLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogKHN0cmluZyB8IFRva2VuW10pICovXG5leHBvcnQgdHlwZSBUb2tlbkxpc3QgPSB1bmtub3duO1xuXG4vKipcbiAqIEBlbiBbW1RlbXBsYXRlRW5naW5lXV0gdG9rZW4gc3RydWN0dXJlLlxuICogQGphIFtbVGVtcGxhdGVFbmdpbmVdXSB0b2tlbiDlnotcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IHR5cGUgVG9rZW4gPSBbc3RyaW5nLCBzdHJpbmcsIG51bWJlciwgbnVtYmVyLCBUb2tlbkxpc3Q/LCBudW1iZXI/LCBib29sZWFuP107XG5cbi8qKlxuICogQGVuIFtbVG9rZW5dXSBhZGRyZXNzIGlkLlxuICogQGphIFtbVG9rZW5dXSDjgqLjg4njg6zjgrnorZjliKXlrZBcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gVG9rZW5BZGRyZXNzIHtcbiAgICBUWVBFID0gMCxcbiAgICBWQUxVRSxcbiAgICBTVEFSVCxcbiAgICBFTkQsXG4gICAgVE9LRU5fTElTVCxcbiAgICBUQUdfSU5ERVgsXG4gICAgSEFTX05PX1NQQUNFLFxufVxuXG4vKipcbiAqIEBlbiBJbnRlcm5hbCBkZWxpbWl0ZXJzIGRlZmluaXRpb24gZm9yIFtbVGVtcGxhdGVFbmdpbmVdXS4gZXgpIFsne3snLCd9fSddIG9yICd7eyB9fSdcbiAqIEBqYSBbW1RlbXBsYXRlRW5naW5lXV0g44Gu5YaF6YOo44Gn5L2/55So44GZ44KL5Yy65YiH44KK5paH5a2XIGV4KSBbJ3t7JywnfX0nXSBvciAne3sgfX0nXG4gKi9cbmV4cG9ydCB0eXBlIERlbGltaXRlcnMgPSBzdHJpbmcgfCBUZW1wbGF0ZURlbGltaXRlcnM7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBnbG9iYWxTZXR0aW5ncyA9IHtcbiAgICB0YWdzOiBbJ3t7JywgJ319J10sXG4gICAgZXNjYXBlOiBlc2NhcGVIVE1MLFxufSBhcyB7XG4gICAgdGFnczogVGVtcGxhdGVEZWxpbWl0ZXJzO1xuICAgIGVzY2FwZTogVGVtcGxhdGVFc2NhcGVyO1xuICAgIHdyaXRlcjogVGVtcGxhdGVXcml0ZXI7XG59O1xuIiwiaW1wb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBlbnN1cmVPYmplY3QsXG4gICAgZ2V0R2xvYmFsTmFtZXNwYWNlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgVGVtcGxhdGVEZWxpbWl0ZXJzIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gQ2FjaGUgbG9jYXRpb24gaW5mb3JtYXRpb24uXG4gKiBAamEg44Kt44Oj44OD44K344Ol44Ot44Kx44O844K344On44Oz5oOF5aCxXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIENhY2hlTG9jYXRpb24ge1xuICAgIE5BTUVTUEFDRSA9ICdDRFBfREVDTEFSRScsXG4gICAgUk9PVCAgICAgID0gJ1RFTVBMQVRFX0NBQ0hFJyxcbn1cblxuLyoqXG4gKiBAZW4gQnVpbGQgY2FjaGUga2V5LlxuICogQGphIOOCreODo+ODg+OCt+ODpeOCreODvOOBrueUn+aIkFxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYWNoZUtleSh0ZW1wbGF0ZTogc3RyaW5nLCB0YWdzOiBUZW1wbGF0ZURlbGltaXRlcnMpOiBzdHJpbmcge1xuICAgIHJldHVybiBgJHt0ZW1wbGF0ZX06JHt0YWdzLmpvaW4oJzonKX1gO1xufVxuXG4vKipcbiAqIEBlbiBDbGVhcnMgYWxsIGNhY2hlZCB0ZW1wbGF0ZXMgaW4gY2FjaGUgcG9vbC5cbiAqIEBqYSDjgZnjgbnjgabjga7jg4bjg7Pjg5fjg6zjg7zjg4jjgq3jg6Pjg4Pjgrfjg6XjgpLnoLTmo4RcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyQ2FjaGUoKTogdm9pZCB7XG4gICAgY29uc3QgbmFtZXNwYWNlID0gZ2V0R2xvYmFsTmFtZXNwYWNlKENhY2hlTG9jYXRpb24uTkFNRVNQQUNFKTtcbiAgICBuYW1lc3BhY2VbQ2FjaGVMb2NhdGlvbi5ST09UXSA9IHt9O1xufVxuXG4vKiogQGludGVybmFsIGdsb2JhbCBjYWNoZSBwb29sICovXG5leHBvcnQgY29uc3QgY2FjaGUgPSBlbnN1cmVPYmplY3Q8UGxhaW5PYmplY3Q+KG51bGwsIENhY2hlTG9jYXRpb24uTkFNRVNQQUNFLCBDYWNoZUxvY2F0aW9uLlJPT1QpO1xuIiwiaW1wb3J0IHsgaXNBcnJheSwgaXNQcmltaXRpdmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuZXhwb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaGFzLFxuICAgIGVzY2FwZUhUTUwsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKlxuICogTW9yZSBjb3JyZWN0IHR5cGVvZiBzdHJpbmcgaGFuZGxpbmcgYXJyYXlcbiAqIHdoaWNoIG5vcm1hbGx5IHJldHVybnMgdHlwZW9mICdvYmplY3QnXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0eXBlU3RyaW5nKHNyYzogdW5rbm93bik6IHN0cmluZyB7XG4gICAgcmV0dXJuIGlzQXJyYXkoc3JjKSA/ICdhcnJheScgOiB0eXBlb2Ygc3JjO1xufVxuXG4vKipcbiAqIEVzY2FwZSBmb3IgdGVtcGxhdGUncyBleHByZXNzaW9uIGNoYXJhY3RvcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlc2NhcGVUZW1wbGF0ZUV4cChzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG4gICAgcmV0dXJuIHNyYy5yZXBsYWNlKC9bLVxcW1xcXXt9KCkqKz8uLFxcXFxcXF4kfCNcXHNdL2csICdcXFxcJCYnKTtcbn1cblxuLyoqXG4gKiBTYWZlIHdheSBvZiBkZXRlY3Rpbmcgd2hldGhlciBvciBub3QgdGhlIGdpdmVuIHRoaW5nIGlzIGEgcHJpbWl0aXZlIGFuZFxuICogd2hldGhlciBpdCBoYXMgdGhlIGdpdmVuIHByb3BlcnR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmltaXRpdmVIYXNPd25Qcm9wZXJ0eShzcmM6IHVua25vd24sIHByb3BOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gaXNQcmltaXRpdmUoc3JjKSAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc3JjLCBwcm9wTmFtZSk7XG59XG5cbi8qKlxuICogQ2hlY2sgd2hpdGVzcGFjZSBjaGFyYWN0b3IgZXhpc3RzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNXaGl0ZXNwYWNlKHNyYzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEvXFxTLy50ZXN0KHNyYyk7XG59XG4iLCJpbXBvcnQgeyBUZW1wbGF0ZVNjYW5uZXIgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEEgc2ltcGxlIHN0cmluZyBzY2FubmVyIHRoYXQgaXMgdXNlZCBieSB0aGUgdGVtcGxhdGUgcGFyc2VyIHRvIGZpbmRcbiAqIHRva2VucyBpbiB0ZW1wbGF0ZSBzdHJpbmdzLlxuICovXG5leHBvcnQgY2xhc3MgU2Nhbm5lciBpbXBsZW1lbnRzIFRlbXBsYXRlU2Nhbm5lciB7XG4gICAgcHJpdmF0ZSBfc291cmNlOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBfdGFpbDogc3RyaW5nO1xuICAgIHByaXZhdGUgX3BvczogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzcmM6IHN0cmluZykge1xuICAgICAgICB0aGlzLl9zb3VyY2UgPSB0aGlzLl90YWlsID0gc3JjO1xuICAgICAgICB0aGlzLl9wb3MgPSAwO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBjdXJyZW50IHNjYW5uaW5nIHBvc2l0aW9uLlxuICAgICAqL1xuICAgIGdldCBwb3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BvcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHN0cmluZyAgc291cmNlLlxuICAgICAqL1xuICAgIGdldCBzb3VyY2UoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgdGFpbCBpcyBlbXB0eSAoZW5kIG9mIHN0cmluZykuXG4gICAgICovXG4gICAgZ2V0IGVvcygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICcnID09PSB0aGlzLl90YWlsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyaWVzIHRvIG1hdGNoIHRoZSBnaXZlbiByZWd1bGFyIGV4cHJlc3Npb24gYXQgdGhlIGN1cnJlbnQgcG9zaXRpb24uXG4gICAgICogUmV0dXJucyB0aGUgbWF0Y2hlZCB0ZXh0IGlmIGl0IGNhbiBtYXRjaCwgdGhlIGVtcHR5IHN0cmluZyBvdGhlcndpc2UuXG4gICAgICovXG4gICAgc2NhbihyZWdleHA6IFJlZ0V4cCk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IG1hdGNoID0gcmVnZXhwLmV4ZWModGhpcy5fdGFpbCk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCB8fCAwICE9PSBtYXRjaC5pbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3RyaW5nID0gbWF0Y2hbMF07XG5cbiAgICAgICAgdGhpcy5fdGFpbCA9IHRoaXMuX3RhaWwuc3Vic3RyaW5nKHN0cmluZy5sZW5ndGgpO1xuICAgICAgICB0aGlzLl9wb3MgKz0gc3RyaW5nLmxlbmd0aDtcblxuICAgICAgICByZXR1cm4gc3RyaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNraXBzIGFsbCB0ZXh0IHVudGlsIHRoZSBnaXZlbiByZWd1bGFyIGV4cHJlc3Npb24gY2FuIGJlIG1hdGNoZWQuIFJldHVybnNcbiAgICAgKiB0aGUgc2tpcHBlZCBzdHJpbmcsIHdoaWNoIGlzIHRoZSBlbnRpcmUgdGFpbCBpZiBubyBtYXRjaCBjYW4gYmUgbWFkZS5cbiAgICAgKi9cbiAgICBzY2FuVW50aWwocmVnZXhwOiBSZWdFeHApOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuX3RhaWwuc2VhcmNoKHJlZ2V4cCk7XG4gICAgICAgIGxldCBtYXRjaDogc3RyaW5nO1xuXG4gICAgICAgIHN3aXRjaCAoaW5kZXgpIHtcbiAgICAgICAgICAgIGNhc2UgLTE6XG4gICAgICAgICAgICAgICAgbWF0Y2ggPSB0aGlzLl90YWlsO1xuICAgICAgICAgICAgICAgIHRoaXMuX3RhaWwgPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICBtYXRjaCA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBtYXRjaCA9IHRoaXMuX3RhaWwuc3Vic3RyaW5nKDAsIGluZGV4KTtcbiAgICAgICAgICAgICAgICB0aGlzLl90YWlsID0gdGhpcy5fdGFpbC5zdWJzdHJpbmcoaW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcG9zICs9IG1hdGNoLmxlbmd0aDtcblxuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgVGVtcGxhdGVDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNGdW5jdGlvbixcbiAgICBoYXMsXG4gICAgcHJpbWl0aXZlSGFzT3duUHJvcGVydHksXG59IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYSByZW5kZXJpbmcgY29udGV4dCBieSB3cmFwcGluZyBhIHZpZXcgb2JqZWN0IGFuZFxuICogbWFpbnRhaW5pbmcgYSByZWZlcmVuY2UgdG8gdGhlIHBhcmVudCBjb250ZXh0LlxuICovXG5leHBvcnQgY2xhc3MgQ29udGV4dCBpbXBsZW1lbnRzIFRlbXBsYXRlQ29udGV4dCB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfdmlldzogUGxhaW5PYmplY3Q7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcGFyZW50PzogQ29udGV4dDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9jYWNoZTogUGxhaW5PYmplY3Q7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3Rvcih2aWV3OiBQbGFpbk9iamVjdCwgcGFyZW50Q29udGV4dD86IENvbnRleHQpIHtcbiAgICAgICAgdGhpcy5fdmlldyAgID0gdmlldztcbiAgICAgICAgdGhpcy5fY2FjaGUgID0geyAnLic6IHRoaXMuX3ZpZXcgfTtcbiAgICAgICAgdGhpcy5fcGFyZW50ID0gcGFyZW50Q29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIFZpZXcgcGFyYW1ldGVyIGdldHRlci5cbiAgICAgKi9cbiAgICBnZXQgdmlldygpOiBQbGFpbk9iamVjdCB7XG4gICAgICAgIHJldHVybiB0aGlzLl92aWV3O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgY29udGV4dCB1c2luZyB0aGUgZ2l2ZW4gdmlldyB3aXRoIHRoaXMgY29udGV4dFxuICAgICAqIGFzIHRoZSBwYXJlbnQuXG4gICAgICovXG4gICAgcHVzaCh2aWV3OiBQbGFpbk9iamVjdCk6IENvbnRleHQge1xuICAgICAgICByZXR1cm4gbmV3IENvbnRleHQodmlldywgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgdmFsdWUgb2YgdGhlIGdpdmVuIG5hbWUgaW4gdGhpcyBjb250ZXh0LCB0cmF2ZXJzaW5nXG4gICAgICogdXAgdGhlIGNvbnRleHQgaGllcmFyY2h5IGlmIHRoZSB2YWx1ZSBpcyBhYnNlbnQgaW4gdGhpcyBjb250ZXh0J3Mgdmlldy5cbiAgICAgKi9cbiAgICBsb29rdXAobmFtZTogc3RyaW5nKTogdW5rbm93biB7XG4gICAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5fY2FjaGU7XG5cbiAgICAgICAgbGV0IHZhbHVlOiB1bmtub3duO1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNhY2hlLCBuYW1lKSkge1xuICAgICAgICAgICAgdmFsdWUgPSBjYWNoZVtuYW1lXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBjb250ZXh0OiBDb250ZXh0IHwgdW5kZWZpbmVkID0gdGhpczsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhc1xuICAgICAgICAgICAgbGV0IGludGVybWVkaWF0ZVZhbHVlOiBvYmplY3QgfCB1bmRlZmluZWQgfCBudWxsO1xuICAgICAgICAgICAgbGV0IG5hbWVzOiBzdHJpbmdbXTtcbiAgICAgICAgICAgIGxldCBpbmRleDogbnVtYmVyO1xuICAgICAgICAgICAgbGV0IGxvb2t1cEhpdCA9IGZhbHNlO1xuXG4gICAgICAgICAgICB3aGlsZSAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgIGlmICgwIDwgbmFtZS5pbmRleE9mKCcuJykpIHtcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJtZWRpYXRlVmFsdWUgPSBjb250ZXh0Ll92aWV3O1xuICAgICAgICAgICAgICAgICAgICBuYW1lcyA9IG5hbWUuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggPSAwO1xuXG4gICAgICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgICAgKiBVc2luZyB0aGUgZG90IG5vdGlvbiBwYXRoIGluIGBuYW1lYCwgd2UgZGVzY2VuZCB0aHJvdWdoIHRoZVxuICAgICAgICAgICAgICAgICAgICAgKiBuZXN0ZWQgb2JqZWN0cy5cbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogVG8gYmUgY2VydGFpbiB0aGF0IHRoZSBsb29rdXAgaGFzIGJlZW4gc3VjY2Vzc2Z1bCwgd2UgaGF2ZSB0b1xuICAgICAgICAgICAgICAgICAgICAgKiBjaGVjayBpZiB0aGUgbGFzdCBvYmplY3QgaW4gdGhlIHBhdGggYWN0dWFsbHkgaGFzIHRoZSBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgICAgICAgKiB3ZSBhcmUgbG9va2luZyBmb3IuIFdlIHN0b3JlIHRoZSByZXN1bHQgaW4gYGxvb2t1cEhpdGAuXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIFRoaXMgaXMgc3BlY2lhbGx5IG5lY2Vzc2FyeSBmb3Igd2hlbiB0aGUgdmFsdWUgaGFzIGJlZW4gc2V0IHRvXG4gICAgICAgICAgICAgICAgICAgICAqIGB1bmRlZmluZWRgIGFuZCB3ZSB3YW50IHRvIGF2b2lkIGxvb2tpbmcgdXAgcGFyZW50IGNvbnRleHRzLlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBJbiB0aGUgY2FzZSB3aGVyZSBkb3Qgbm90YXRpb24gaXMgdXNlZCwgd2UgY29uc2lkZXIgdGhlIGxvb2t1cFxuICAgICAgICAgICAgICAgICAgICAgKiB0byBiZSBzdWNjZXNzZnVsIGV2ZW4gaWYgdGhlIGxhc3QgXCJvYmplY3RcIiBpbiB0aGUgcGF0aCBpc1xuICAgICAgICAgICAgICAgICAgICAgKiBub3QgYWN0dWFsbHkgYW4gb2JqZWN0IGJ1dCBhIHByaW1pdGl2ZSAoZS5nLiwgYSBzdHJpbmcsIG9yIGFuXG4gICAgICAgICAgICAgICAgICAgICAqIGludGVnZXIpLCBiZWNhdXNlIGl0IGlzIHNvbWV0aW1lcyB1c2VmdWwgdG8gYWNjZXNzIGEgcHJvcGVydHlcbiAgICAgICAgICAgICAgICAgICAgICogb2YgYW4gYXV0b2JveGVkIHByaW1pdGl2ZSwgc3VjaCBhcyB0aGUgbGVuZ3RoIG9mIGEgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAgICAgKiovXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChudWxsICE9IGludGVybWVkaWF0ZVZhbHVlICYmIGluZGV4IDwgbmFtZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IG5hbWVzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb29rdXBIaXQgPSAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhcyhpbnRlcm1lZGlhdGVWYWx1ZSwgbmFtZXNbaW5kZXhdKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmltaXRpdmVIYXNPd25Qcm9wZXJ0eShpbnRlcm1lZGlhdGVWYWx1ZSwgbmFtZXNbaW5kZXhdKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGVWYWx1ZSA9IGludGVybWVkaWF0ZVZhbHVlW25hbWVzW2luZGV4KytdXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGludGVybWVkaWF0ZVZhbHVlID0gY29udGV4dC5fdmlld1tuYW1lXTtcblxuICAgICAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgICAgICogT25seSBjaGVja2luZyBhZ2FpbnN0IGBoYXNQcm9wZXJ0eWAsIHdoaWNoIGFsd2F5cyByZXR1cm5zIGBmYWxzZWAgaWZcbiAgICAgICAgICAgICAgICAgICAgICogYGNvbnRleHQudmlld2AgaXMgbm90IGFuIG9iamVjdC4gRGVsaWJlcmF0ZWx5IG9taXR0aW5nIHRoZSBjaGVja1xuICAgICAgICAgICAgICAgICAgICAgKiBhZ2FpbnN0IGBwcmltaXRpdmVIYXNPd25Qcm9wZXJ0eWAgaWYgZG90IG5vdGF0aW9uIGlzIG5vdCB1c2VkLlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBDb25zaWRlciB0aGlzIGV4YW1wbGU6XG4gICAgICAgICAgICAgICAgICAgICAqIGBgYFxuICAgICAgICAgICAgICAgICAgICAgKiBNdXN0YWNoZS5yZW5kZXIoXCJUaGUgbGVuZ3RoIG9mIGEgZm9vdGJhbGwgZmllbGQgaXMge3sjbGVuZ3RofX17e2xlbmd0aH19e3svbGVuZ3RofX0uXCIsIHtsZW5ndGg6IFwiMTAwIHlhcmRzXCJ9KVxuICAgICAgICAgICAgICAgICAgICAgKiBgYGBcbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogSWYgd2Ugd2VyZSB0byBjaGVjayBhbHNvIGFnYWluc3QgYHByaW1pdGl2ZUhhc093blByb3BlcnR5YCwgYXMgd2UgZG9cbiAgICAgICAgICAgICAgICAgICAgICogaW4gdGhlIGRvdCBub3RhdGlvbiBjYXNlLCB0aGVuIHJlbmRlciBjYWxsIHdvdWxkIHJldHVybjpcbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogXCJUaGUgbGVuZ3RoIG9mIGEgZm9vdGJhbGwgZmllbGQgaXMgOS5cIlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiByYXRoZXIgdGhhbiB0aGUgZXhwZWN0ZWQ6XG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIFwiVGhlIGxlbmd0aCBvZiBhIGZvb3RiYWxsIGZpZWxkIGlzIDEwMCB5YXJkcy5cIlxuICAgICAgICAgICAgICAgICAgICAgKiovXG4gICAgICAgICAgICAgICAgICAgIGxvb2t1cEhpdCA9IGhhcyhjb250ZXh0Ll92aWV3LCBuYW1lKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAobG9va3VwSGl0KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gaW50ZXJtZWRpYXRlVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnRleHQgPSBjb250ZXh0Ll9wYXJlbnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhY2hlW25hbWVdID0gdmFsdWUgYXMgb2JqZWN0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLmNhbGwodGhpcy5fdmlldyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBUb2tlbixcbiAgICBUb2tlbkFkZHJlc3MgYXMgJCxcbiAgICBEZWxpbWl0ZXJzLFxuICAgIGdsb2JhbFNldHRpbmdzLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7XG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBpc1doaXRlc3BhY2UsXG4gICAgZXNjYXBlVGVtcGxhdGVFeHAsXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgU2Nhbm5lciB9IGZyb20gJy4vc2Nhbm5lcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9yZWdleHAgPSB7XG4gICAgd2hpdGU6IC9cXHMqLyxcbiAgICBzcGFjZTogL1xccysvLFxuICAgIGVxdWFsczogL1xccyo9LyxcbiAgICBjdXJseTogL1xccypcXH0vLFxuICAgIHRhZzogLyN8XFxefFxcL3w+fFxce3wmfD18IS8sXG59O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQ29tYmluZXMgdGhlIHZhbHVlcyBvZiBjb25zZWN1dGl2ZSB0ZXh0IHRva2VucyBpbiB0aGUgZ2l2ZW4gYHRva2Vuc2AgYXJyYXkgdG8gYSBzaW5nbGUgdG9rZW4uXG4gKi9cbmZ1bmN0aW9uIHNxdWFzaFRva2Vucyh0b2tlbnM6IFRva2VuW10pOiBUb2tlbltdIHtcbiAgICBjb25zdCBzcXVhc2hlZFRva2VuczogVG9rZW5bXSA9IFtdO1xuXG4gICAgbGV0IGxhc3RUb2tlbiE6IFRva2VuO1xuICAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgICAgIGlmICh0b2tlbikge1xuICAgICAgICAgICAgaWYgKCd0ZXh0JyA9PT0gdG9rZW5bJC5UWVBFXSAmJiBsYXN0VG9rZW4gJiYgJ3RleHQnID09PSBsYXN0VG9rZW5bJC5UWVBFXSkge1xuICAgICAgICAgICAgICAgIGxhc3RUb2tlblskLlZBTFVFXSArPSB0b2tlblskLlZBTFVFXTtcbiAgICAgICAgICAgICAgICBsYXN0VG9rZW5bJC5FTkRdID0gdG9rZW5bJC5FTkRdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzcXVhc2hlZFRva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICBsYXN0VG9rZW4gPSB0b2tlbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzcXVhc2hlZFRva2Vucztcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEZvcm1zIHRoZSBnaXZlbiBhcnJheSBvZiBgdG9rZW5zYCBpbnRvIGEgbmVzdGVkIHRyZWUgc3RydWN0dXJlIHdoZXJlXG4gKiB0b2tlbnMgdGhhdCByZXByZXNlbnQgYSBzZWN0aW9uIGhhdmUgdHdvIGFkZGl0aW9uYWwgaXRlbXM6IDEpIGFuIGFycmF5IG9mXG4gKiBhbGwgdG9rZW5zIHRoYXQgYXBwZWFyIGluIHRoYXQgc2VjdGlvbiBhbmQgMikgdGhlIGluZGV4IGluIHRoZSBvcmlnaW5hbFxuICogdGVtcGxhdGUgdGhhdCByZXByZXNlbnRzIHRoZSBlbmQgb2YgdGhhdCBzZWN0aW9uLlxuICovXG5mdW5jdGlvbiBuZXN0VG9rZW5zKHRva2VuczogVG9rZW5bXSk6IFRva2VuW10ge1xuICAgIGNvbnN0IG5lc3RlZFRva2VuczogVG9rZW5bXSA9IFtdO1xuICAgIGxldCBjb2xsZWN0b3IgPSBuZXN0ZWRUb2tlbnM7XG4gICAgY29uc3Qgc2VjdGlvbnM6IFRva2VuW10gPSBbXTtcblxuICAgIGxldCBzZWN0aW9uITogVG9rZW47XG4gICAgZm9yIChjb25zdCB0b2tlbiBvZiB0b2tlbnMpIHtcbiAgICAgICAgc3dpdGNoICh0b2tlblskLlRZUEVdKSB7XG4gICAgICAgICAgICBjYXNlICcjJzpcbiAgICAgICAgICAgIGNhc2UgJ14nOlxuICAgICAgICAgICAgICAgIGNvbGxlY3Rvci5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICBzZWN0aW9ucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICBjb2xsZWN0b3IgPSB0b2tlblskLlRPS0VOX0xJU1RdID0gW107XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICcvJzpcbiAgICAgICAgICAgICAgICBzZWN0aW9uID0gc2VjdGlvbnMucG9wKCkgYXMgVG9rZW47XG4gICAgICAgICAgICAgICAgc2VjdGlvblskLlRBR19JTkRFWF0gPSB0b2tlblskLlNUQVJUXTtcbiAgICAgICAgICAgICAgICBjb2xsZWN0b3IgPSBzZWN0aW9ucy5sZW5ndGggPiAwID8gc2VjdGlvbnNbc2VjdGlvbnMubGVuZ3RoIC0gMV1bJC5UT0tFTl9MSVNUXSBhcyBUb2tlbltdIDogbmVzdGVkVG9rZW5zO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBjb2xsZWN0b3IucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5lc3RlZFRva2Vucztcbn1cblxuLyoqXG4gKiBCcmVha3MgdXAgdGhlIGdpdmVuIGB0ZW1wbGF0ZWAgc3RyaW5nIGludG8gYSB0cmVlIG9mIHRva2Vucy4gSWYgdGhlIGB0YWdzYFxuICogYXJndW1lbnQgaXMgZ2l2ZW4gaGVyZSBpdCBtdXN0IGJlIGFuIGFycmF5IHdpdGggdHdvIHN0cmluZyB2YWx1ZXM6IHRoZVxuICogb3BlbmluZyBhbmQgY2xvc2luZyB0YWdzIHVzZWQgaW4gdGhlIHRlbXBsYXRlIChlLmcuIFsgXCI8JVwiLCBcIiU+XCIgXSkuIE9mXG4gKiBjb3Vyc2UsIHRoZSBkZWZhdWx0IGlzIHRvIHVzZSBtdXN0YWNoZXMgKGkuZS4gbXVzdGFjaGUudGFncykuXG4gKlxuICogQSB0b2tlbiBpcyBhbiBhcnJheSB3aXRoIGF0IGxlYXN0IDQgZWxlbWVudHMuIFRoZSBmaXJzdCBlbGVtZW50IGlzIHRoZVxuICogbXVzdGFjaGUgc3ltYm9sIHRoYXQgd2FzIHVzZWQgaW5zaWRlIHRoZSB0YWcsIGUuZy4gXCIjXCIgb3IgXCImXCIuIElmIHRoZSB0YWdcbiAqIGRpZCBub3QgY29udGFpbiBhIHN5bWJvbCAoaS5lLiB7e215VmFsdWV9fSkgdGhpcyBlbGVtZW50IGlzIFwibmFtZVwiLiBGb3JcbiAqIGFsbCB0ZXh0IHRoYXQgYXBwZWFycyBvdXRzaWRlIGEgc3ltYm9sIHRoaXMgZWxlbWVudCBpcyBcInRleHRcIi5cbiAqXG4gKiBUaGUgc2Vjb25kIGVsZW1lbnQgb2YgYSB0b2tlbiBpcyBpdHMgXCJ2YWx1ZVwiLiBGb3IgbXVzdGFjaGUgdGFncyB0aGlzIGlzXG4gKiB3aGF0ZXZlciBlbHNlIHdhcyBpbnNpZGUgdGhlIHRhZyBiZXNpZGVzIHRoZSBvcGVuaW5nIHN5bWJvbC4gRm9yIHRleHQgdG9rZW5zXG4gKiB0aGlzIGlzIHRoZSB0ZXh0IGl0c2VsZi5cbiAqXG4gKiBUaGUgdGhpcmQgYW5kIGZvdXJ0aCBlbGVtZW50cyBvZiB0aGUgdG9rZW4gYXJlIHRoZSBzdGFydCBhbmQgZW5kIGluZGljZXMsXG4gKiByZXNwZWN0aXZlbHksIG9mIHRoZSB0b2tlbiBpbiB0aGUgb3JpZ2luYWwgdGVtcGxhdGUuXG4gKlxuICogVG9rZW5zIHRoYXQgYXJlIHRoZSByb290IG5vZGUgb2YgYSBzdWJ0cmVlIGNvbnRhaW4gdHdvIG1vcmUgZWxlbWVudHM6IDEpIGFuXG4gKiBhcnJheSBvZiB0b2tlbnMgaW4gdGhlIHN1YnRyZWUgYW5kIDIpIHRoZSBpbmRleCBpbiB0aGUgb3JpZ2luYWwgdGVtcGxhdGUgYXRcbiAqIHdoaWNoIHRoZSBjbG9zaW5nIHRhZyBmb3IgdGhhdCBzZWN0aW9uIGJlZ2lucy5cbiAqXG4gKiBUb2tlbnMgZm9yIHBhcnRpYWxzIGFsc28gY29udGFpbiB0d28gbW9yZSBlbGVtZW50czogMSkgYSBzdHJpbmcgdmFsdWUgb2ZcbiAqIGluZGVuZGF0aW9uIHByaW9yIHRvIHRoYXQgdGFnIGFuZCAyKSB0aGUgaW5kZXggb2YgdGhhdCB0YWcgb24gdGhhdCBsaW5lIC1cbiAqIGVnIGEgdmFsdWUgb2YgMiBpbmRpY2F0ZXMgdGhlIHBhcnRpYWwgaXMgdGhlIHRoaXJkIHRhZyBvbiB0aGlzIGxpbmUuXG4gKlxuICogQHBhcmFtIHRlbXBsYXRlIHRlbXBsYXRlIHN0cmluZ1xuICogQHBhcmFtIHRhZ3MgZGVsaW1pdGVycyBleCkgWyd7eycsJ319J10gb3IgJ3t7IH19J1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VUZW1wbGF0ZSh0ZW1wbGF0ZTogc3RyaW5nLCB0YWdzPzogRGVsaW1pdGVycyk6IFRva2VuW10ge1xuICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGxldCBsaW5lSGFzTm9uU3BhY2UgICAgID0gZmFsc2U7XG4gICAgY29uc3Qgc2VjdGlvbnM6IFRva2VuW10gPSBbXTsgICAgICAgLy8gU3RhY2sgdG8gaG9sZCBzZWN0aW9uIHRva2Vuc1xuICAgIGNvbnN0IHRva2VuczogVG9rZW5bXSAgID0gW107ICAgICAgIC8vIEJ1ZmZlciB0byBob2xkIHRoZSB0b2tlbnNcbiAgICBjb25zdCBzcGFjZXM6IG51bWJlcltdICA9IFtdOyAgICAgICAvLyBJbmRpY2VzIG9mIHdoaXRlc3BhY2UgdG9rZW5zIG9uIHRoZSBjdXJyZW50IGxpbmVcbiAgICBsZXQgaGFzVGFnICAgICAgICAgICAgICA9IGZhbHNlOyAgICAvLyBJcyB0aGVyZSBhIHt7dGFnfX0gb24gdGhlIGN1cnJlbnQgbGluZT9cbiAgICBsZXQgbm9uU3BhY2UgICAgICAgICAgICA9IGZhbHNlOyAgICAvLyBJcyB0aGVyZSBhIG5vbi1zcGFjZSBjaGFyIG9uIHRoZSBjdXJyZW50IGxpbmU/XG4gICAgbGV0IGluZGVudGF0aW9uICAgICAgICAgPSAnJzsgICAgICAgLy8gVHJhY2tzIGluZGVudGF0aW9uIGZvciB0YWdzIHRoYXQgdXNlIGl0XG4gICAgbGV0IHRhZ0luZGV4ICAgICAgICAgICAgPSAwOyAgICAgICAgLy8gU3RvcmVzIGEgY291bnQgb2YgbnVtYmVyIG9mIHRhZ3MgZW5jb3VudGVyZWQgb24gYSBsaW5lXG5cbiAgICAvLyBTdHJpcHMgYWxsIHdoaXRlc3BhY2UgdG9rZW5zIGFycmF5IGZvciB0aGUgY3VycmVudCBsaW5lXG4gICAgLy8gaWYgdGhlcmUgd2FzIGEge3sjdGFnfX0gb24gaXQgYW5kIG90aGVyd2lzZSBvbmx5IHNwYWNlLlxuICAgIGNvbnN0IHN0cmlwU3BhY2UgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgIGlmIChoYXNUYWcgJiYgIW5vblNwYWNlKSB7XG4gICAgICAgICAgICB3aGlsZSAoc3BhY2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0b2tlbnNbc3BhY2VzLnBvcCgpIGFzIG51bWJlcl07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzcGFjZXMubGVuZ3RoID0gMDtcbiAgICAgICAgfVxuICAgICAgICBoYXNUYWcgPSBmYWxzZTtcbiAgICAgICAgbm9uU3BhY2UgPSBmYWxzZTtcbiAgICB9O1xuXG4gICAgY29uc3QgY29tcGlsZVRhZ3MgPSAodGFnc1RvQ29tcGlsZTogc3RyaW5nIHwgc3RyaW5nW10pOiB7IG9wZW5pbmdUYWc6IFJlZ0V4cDsgY2xvc2luZ1RhZzogUmVnRXhwOyBjbG9zaW5nQ3VybHk6IFJlZ0V4cDsgfSA9PiB7XG4gICAgICAgIGNvbnN0IGVudW0gVGFnIHtcbiAgICAgICAgICAgIE9QRU4gPSAwLFxuICAgICAgICAgICAgQ0xPU0UsXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzU3RyaW5nKHRhZ3NUb0NvbXBpbGUpKSB7XG4gICAgICAgICAgICB0YWdzVG9Db21waWxlID0gdGFnc1RvQ29tcGlsZS5zcGxpdChfcmVnZXhwLnNwYWNlLCAyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaXNBcnJheSh0YWdzVG9Db21waWxlKSB8fCAyICE9PSB0YWdzVG9Db21waWxlLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHRhZ3M6ICR7SlNPTi5zdHJpbmdpZnkodGFnc1RvQ29tcGlsZSl9YCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wZW5pbmdUYWc6ICAgbmV3IFJlZ0V4cChgJHtlc2NhcGVUZW1wbGF0ZUV4cCh0YWdzVG9Db21waWxlW1RhZy5PUEVOXSl9XFxcXHMqYCksXG4gICAgICAgICAgICBjbG9zaW5nVGFnOiAgIG5ldyBSZWdFeHAoYFxcXFxzKiR7ZXNjYXBlVGVtcGxhdGVFeHAodGFnc1RvQ29tcGlsZVtUYWcuQ0xPU0VdKX1gKSxcbiAgICAgICAgICAgIGNsb3NpbmdDdXJseTogbmV3IFJlZ0V4cChgXFxcXHMqJHtlc2NhcGVUZW1wbGF0ZUV4cChgfSR7dGFnc1RvQ29tcGlsZVtUYWcuQ0xPU0VdfWApfWApLFxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICBjb25zdCB7IHRhZzogcmVUYWcsIHdoaXRlOiByZVdoaXRlLCBlcXVhbHM6IHJlRXF1YWxzLCBjdXJseTogcmVDdXJseSB9ID0gX3JlZ2V4cDtcbiAgICBsZXQgX3JlZ3hwVGFncyA9IGNvbXBpbGVUYWdzKHRhZ3MgfHwgZ2xvYmFsU2V0dGluZ3MudGFncyk7XG5cbiAgICBjb25zdCBzY2FubmVyID0gbmV3IFNjYW5uZXIodGVtcGxhdGUpO1xuXG4gICAgbGV0IG9wZW5TZWN0aW9uOiBUb2tlbiB8IHVuZGVmaW5lZDtcbiAgICB3aGlsZSAoIXNjYW5uZXIuZW9zKSB7XG4gICAgICAgIGNvbnN0IHsgb3BlbmluZ1RhZzogcmVPcGVuaW5nVGFnLCBjbG9zaW5nVGFnOiByZUNsb3NpbmdUYWcsIGNsb3NpbmdDdXJseTogcmVDbG9zaW5nQ3VybHkgfSA9IF9yZWd4cFRhZ3M7XG4gICAgICAgIGxldCB0b2tlbjogVG9rZW47XG4gICAgICAgIGxldCBzdGFydCA9IHNjYW5uZXIucG9zO1xuICAgICAgICAvLyBNYXRjaCBhbnkgdGV4dCBiZXR3ZWVuIHRhZ3MuXG4gICAgICAgIGxldCB2YWx1ZSA9IHNjYW5uZXIuc2NhblVudGlsKHJlT3BlbmluZ1RhZyk7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIHZhbHVlTGVuZ3RoID0gdmFsdWUubGVuZ3RoOyBpIDwgdmFsdWVMZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNociA9IHZhbHVlLmNoYXJBdChpKTtcblxuICAgICAgICAgICAgICAgIGlmIChpc1doaXRlc3BhY2UoY2hyKSkge1xuICAgICAgICAgICAgICAgICAgICBzcGFjZXMucHVzaCh0b2tlbnMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgaW5kZW50YXRpb24gKz0gY2hyO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5vblNwYWNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgbGluZUhhc05vblNwYWNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaW5kZW50YXRpb24gKz0gJyAnO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRva2Vucy5wdXNoKFsndGV4dCcsIGNociwgc3RhcnQsIHN0YXJ0ICsgMV0pO1xuICAgICAgICAgICAgICAgIHN0YXJ0ICs9IDE7XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBmb3Igd2hpdGVzcGFjZSBvbiB0aGUgY3VycmVudCBsaW5lLlxuICAgICAgICAgICAgICAgIGlmICgnXFxuJyA9PT0gY2hyKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0cmlwU3BhY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgaW5kZW50YXRpb24gPSAnJztcbiAgICAgICAgICAgICAgICAgICAgdGFnSW5kZXggPSAwO1xuICAgICAgICAgICAgICAgICAgICBsaW5lSGFzTm9uU3BhY2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXRjaCB0aGUgb3BlbmluZyB0YWcuXG4gICAgICAgIGlmICghc2Nhbm5lci5zY2FuKHJlT3BlbmluZ1RhZykpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaGFzVGFnID0gdHJ1ZTtcblxuICAgICAgICAvLyBHZXQgdGhlIHRhZyB0eXBlLlxuICAgICAgICBsZXQgdHlwZSA9IHNjYW5uZXIuc2NhbihyZVRhZykgfHwgJ25hbWUnO1xuICAgICAgICBzY2FubmVyLnNjYW4ocmVXaGl0ZSk7XG5cbiAgICAgICAgLy8gR2V0IHRoZSB0YWcgdmFsdWUuXG4gICAgICAgIGlmICgnPScgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwocmVFcXVhbHMpO1xuICAgICAgICAgICAgc2Nhbm5lci5zY2FuKHJlRXF1YWxzKTtcbiAgICAgICAgICAgIHNjYW5uZXIuc2NhblVudGlsKHJlQ2xvc2luZ1RhZyk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ3snID09PSB0eXBlKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHNjYW5uZXIuc2NhblVudGlsKHJlQ2xvc2luZ0N1cmx5KTtcbiAgICAgICAgICAgIHNjYW5uZXIuc2NhbihyZUN1cmx5KTtcbiAgICAgICAgICAgIHNjYW5uZXIuc2NhblVudGlsKHJlQ2xvc2luZ1RhZyk7XG4gICAgICAgICAgICB0eXBlID0gJyYnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdUYWcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWF0Y2ggdGhlIGNsb3NpbmcgdGFnLlxuICAgICAgICBpZiAoIXNjYW5uZXIuc2NhbihyZUNsb3NpbmdUYWcpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuY2xvc2VkIHRhZyBhdCAke3NjYW5uZXIucG9zfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCc+JyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgdG9rZW4gPSBbdHlwZSwgdmFsdWUsIHN0YXJ0LCBzY2FubmVyLnBvcywgaW5kZW50YXRpb24sIHRhZ0luZGV4LCBsaW5lSGFzTm9uU3BhY2VdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdG9rZW4gPSBbdHlwZSwgdmFsdWUsIHN0YXJ0LCBzY2FubmVyLnBvc107XG4gICAgICAgIH1cbiAgICAgICAgdGFnSW5kZXgrKztcbiAgICAgICAgdG9rZW5zLnB1c2godG9rZW4pO1xuXG4gICAgICAgIGlmICgnIycgPT09IHR5cGUgfHwgJ14nID09PSB0eXBlKSB7XG4gICAgICAgICAgICBzZWN0aW9ucy5wdXNoKHRva2VuKTtcbiAgICAgICAgfSBlbHNlIGlmICgnLycgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIHNlY3Rpb24gbmVzdGluZy5cbiAgICAgICAgICAgIG9wZW5TZWN0aW9uID0gc2VjdGlvbnMucG9wKCk7XG4gICAgICAgICAgICBpZiAoIW9wZW5TZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbm9wZW5lZCBzZWN0aW9uIFwiJHt2YWx1ZX1cIiBhdCAke3N0YXJ0fWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9wZW5TZWN0aW9uWzFdICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5jbG9zZWQgc2VjdGlvbiBcIiR7b3BlblNlY3Rpb25bJC5WQUxVRV19XCIgYXQgJHtzdGFydH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgnbmFtZScgPT09IHR5cGUgfHwgJ3snID09PSB0eXBlIHx8ICcmJyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgbm9uU3BhY2UgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKCc9JyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgLy8gU2V0IHRoZSB0YWdzIGZvciB0aGUgbmV4dCB0aW1lIGFyb3VuZC5cbiAgICAgICAgICAgIF9yZWd4cFRhZ3MgPSBjb21waWxlVGFncyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdHJpcFNwYWNlKCk7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlcmUgYXJlIG5vIG9wZW4gc2VjdGlvbnMgd2hlbiB3ZSdyZSBkb25lLlxuICAgIG9wZW5TZWN0aW9uID0gc2VjdGlvbnMucG9wKCk7XG5cbiAgICBpZiAob3BlblNlY3Rpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmNsb3NlZCBzZWN0aW9uIFwiJHtvcGVuU2VjdGlvblskLlZBTFVFXX1cIiBhdCAke3NjYW5uZXIucG9zfWApO1xuICAgIH1cblxuICAgIHJldHVybiBuZXN0VG9rZW5zKHNxdWFzaFRva2Vucyh0b2tlbnMpKTtcbn1cbiIsImltcG9ydCB7XG4gICAgVGVtcGxhdGVEZWxpbWl0ZXJzLFxuICAgIFRlbXBsYXRlV3JpdGVyLFxuICAgIFRlbXBsYXRlVmlld1BhcmFtLFxuICAgIFRlbXBsYXRlUGFydGlhbFBhcmFtLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBUb2tlbixcbiAgICBUb2tlbkFkZHJlc3MgYXMgJCxcbiAgICBnbG9iYWxTZXR0aW5ncyxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBjYWNoZSwgYnVpbGRDYWNoZUtleSB9IGZyb20gJy4vY2FjaGUnO1xuaW1wb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc0FycmF5LFxuICAgIGlzRnVuY3Rpb24sXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgcGFyc2VUZW1wbGF0ZSB9IGZyb20gJy4vcGFyc2UnO1xuaW1wb3J0IHsgQ29udGV4dCB9IGZyb20gJy4vY29udGV4dCc7XG5cbi8qKlxuICogQSBXcml0ZXIga25vd3MgaG93IHRvIHRha2UgYSBzdHJlYW0gb2YgdG9rZW5zIGFuZCByZW5kZXIgdGhlbSB0byBhXG4gKiBzdHJpbmcsIGdpdmVuIGEgY29udGV4dC4gSXQgYWxzbyBtYWludGFpbnMgYSBjYWNoZSBvZiB0ZW1wbGF0ZXMgdG9cbiAqIGF2b2lkIHRoZSBuZWVkIHRvIHBhcnNlIHRoZSBzYW1lIHRlbXBsYXRlIHR3aWNlLlxuICovXG5leHBvcnQgY2xhc3MgV3JpdGVyIGltcGxlbWVudHMgVGVtcGxhdGVXcml0ZXIge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgYW5kIGNhY2hlcyB0aGUgZ2l2ZW4gYHRlbXBsYXRlYCBhY2NvcmRpbmcgdG8gdGhlIGdpdmVuIGB0YWdzYCBvclxuICAgICAqIGBtdXN0YWNoZS50YWdzYCBpZiBgdGFnc2AgaXMgb21pdHRlZCwgIGFuZCByZXR1cm5zIHRoZSBhcnJheSBvZiB0b2tlbnNcbiAgICAgKiB0aGF0IGlzIGdlbmVyYXRlZCBmcm9tIHRoZSBwYXJzZS5cbiAgICAgKi9cbiAgICBwYXJzZSh0ZW1wbGF0ZTogc3RyaW5nLCB0YWdzPzogVGVtcGxhdGVEZWxpbWl0ZXJzKTogeyB0b2tlbnM6IFRva2VuW107IGNhY2hlS2V5OiBzdHJpbmc7IH0ge1xuICAgICAgICBjb25zdCBjYWNoZUtleSA9IGJ1aWxkQ2FjaGVLZXkodGVtcGxhdGUsIHRhZ3MgfHwgZ2xvYmFsU2V0dGluZ3MudGFncyk7XG4gICAgICAgIGxldCB0b2tlbnMgPSBjYWNoZVtjYWNoZUtleV0gYXMgVG9rZW5bXTtcbiAgICAgICAgaWYgKG51bGwgPT0gdG9rZW5zKSB7XG4gICAgICAgICAgICB0b2tlbnMgPSBjYWNoZVtjYWNoZUtleV0gPSBwYXJzZVRlbXBsYXRlKHRlbXBsYXRlLCB0YWdzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyB0b2tlbnMsIGNhY2hlS2V5IH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSGlnaC1sZXZlbCBtZXRob2QgdGhhdCBpcyB1c2VkIHRvIHJlbmRlciB0aGUgZ2l2ZW4gYHRlbXBsYXRlYCB3aXRoXG4gICAgICogdGhlIGdpdmVuIGB2aWV3YC5cbiAgICAgKlxuICAgICAqIFRoZSBvcHRpb25hbCBgcGFydGlhbHNgIGFyZ3VtZW50IG1heSBiZSBhbiBvYmplY3QgdGhhdCBjb250YWlucyB0aGVcbiAgICAgKiBuYW1lcyBhbmQgdGVtcGxhdGVzIG9mIHBhcnRpYWxzIHRoYXQgYXJlIHVzZWQgaW4gdGhlIHRlbXBsYXRlLiBJdCBtYXlcbiAgICAgKiBhbHNvIGJlIGEgZnVuY3Rpb24gdGhhdCBpcyB1c2VkIHRvIGxvYWQgcGFydGlhbCB0ZW1wbGF0ZXMgb24gdGhlIGZseVxuICAgICAqIHRoYXQgdGFrZXMgYSBzaW5nbGUgYXJndW1lbnQ6IHRoZSBuYW1lIG9mIHRoZSBwYXJ0aWFsLlxuICAgICAqXG4gICAgICogSWYgdGhlIG9wdGlvbmFsIGB0YWdzYCBhcmd1bWVudCBpcyBnaXZlbiBoZXJlIGl0IG11c3QgYmUgYW4gYXJyYXkgd2l0aCB0d29cbiAgICAgKiBzdHJpbmcgdmFsdWVzOiB0aGUgb3BlbmluZyBhbmQgY2xvc2luZyB0YWdzIHVzZWQgaW4gdGhlIHRlbXBsYXRlIChlLmcuXG4gICAgICogWyBcIjwlXCIsIFwiJT5cIiBdKS4gVGhlIGRlZmF1bHQgaXMgdG8gbXVzdGFjaGUudGFncy5cbiAgICAgKi9cbiAgICByZW5kZXIodGVtcGxhdGU6IHN0cmluZywgdmlldzogVGVtcGxhdGVWaWV3UGFyYW0sIHBhcnRpYWxzPzogVGVtcGxhdGVQYXJ0aWFsUGFyYW0sIHRhZ3M/OiBUZW1wbGF0ZURlbGltaXRlcnMpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCB7IHRva2VucyB9ID0gdGhpcy5wYXJzZSh0ZW1wbGF0ZSwgdGFncyk7XG4gICAgICAgIHJldHVybiB0aGlzLnJlbmRlclRva2Vucyh0b2tlbnMsIHZpZXcsIHBhcnRpYWxzLCB0ZW1wbGF0ZSwgdGFncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG93LWxldmVsIG1ldGhvZCB0aGF0IHJlbmRlcnMgdGhlIGdpdmVuIGFycmF5IG9mIGB0b2tlbnNgIHVzaW5nXG4gICAgICogdGhlIGdpdmVuIGBjb250ZXh0YCBhbmQgYHBhcnRpYWxzYC5cbiAgICAgKlxuICAgICAqIE5vdGU6IFRoZSBgb3JpZ2luYWxUZW1wbGF0ZWAgaXMgb25seSBldmVyIHVzZWQgdG8gZXh0cmFjdCB0aGUgcG9ydGlvblxuICAgICAqIG9mIHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZSB0aGF0IHdhcyBjb250YWluZWQgaW4gYSBoaWdoZXItb3JkZXIgc2VjdGlvbi5cbiAgICAgKiBJZiB0aGUgdGVtcGxhdGUgZG9lc24ndCB1c2UgaGlnaGVyLW9yZGVyIHNlY3Rpb25zLCB0aGlzIGFyZ3VtZW50IG1heVxuICAgICAqIGJlIG9taXR0ZWQuXG4gICAgICovXG4gICAgcmVuZGVyVG9rZW5zKHRva2VuczogVG9rZW5bXSwgdmlldzogVGVtcGxhdGVWaWV3UGFyYW0sIHBhcnRpYWxzPzogVGVtcGxhdGVQYXJ0aWFsUGFyYW0sIG9yaWdpbmFsVGVtcGxhdGU/OiBzdHJpbmcsIHRhZ3M/OiBUZW1wbGF0ZURlbGltaXRlcnMpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gKHZpZXcgaW5zdGFuY2VvZiBDb250ZXh0KSA/IHZpZXcgOiBuZXcgQ29udGV4dCh2aWV3IGFzIFBsYWluT2JqZWN0KTtcbiAgICAgICAgbGV0IGJ1ZmZlciA9ICcnO1xuXG4gICAgICAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgICAgICAgICBsZXQgdmFsdWU6IHN0cmluZyB8IHZvaWQ7XG4gICAgICAgICAgICBzd2l0Y2ggKHRva2VuWyQuVFlQRV0pIHtcbiAgICAgICAgICAgICAgICBjYXNlICcjJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnJlbmRlclNlY3Rpb24odG9rZW4sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnXic6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5yZW5kZXJJbnZlcnRlZCh0b2tlbiwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICc+JzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnJlbmRlclBhcnRpYWwodG9rZW4sIGNvbnRleHQsIHBhcnRpYWxzLCB0YWdzKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnJic6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy51bmVzY2FwZWRWYWx1ZSh0b2tlbiwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ25hbWUnOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMuZXNjYXBlZFZhbHVlKHRva2VuLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndGV4dCc6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5yYXdWYWx1ZSh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlciArPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVuZGVyU2VjdGlvbih0b2tlbjogVG9rZW4sIGNvbnRleHQ6IENvbnRleHQsIHBhcnRpYWxzPzogVGVtcGxhdGVQYXJ0aWFsUGFyYW0sIG9yaWdpbmFsVGVtcGxhdGU/OiBzdHJpbmcpOiBzdHJpbmcgfCB2b2lkIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIGxldCBidWZmZXIgPSAnJztcbiAgICAgICAgbGV0IHZhbHVlID0gY29udGV4dC5sb29rdXAodG9rZW5bJC5WQUxVRV0pO1xuXG4gICAgICAgIC8vIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byByZW5kZXIgYW4gYXJiaXRyYXJ5IHRlbXBsYXRlXG4gICAgICAgIC8vIGluIHRoZSBjdXJyZW50IGNvbnRleHQgYnkgaGlnaGVyLW9yZGVyIHNlY3Rpb25zLlxuICAgICAgICBjb25zdCBzdWJSZW5kZXIgPSAodGVtcGxhdGU6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgICAgICAgICByZXR1cm4gc2VsZi5yZW5kZXIodGVtcGxhdGUsIGNvbnRleHQsIHBhcnRpYWxzKTtcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgdiBvZiB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlciArPSB0aGlzLnJlbmRlclRva2Vucyh0b2tlblskLlRPS0VOX0xJU1RdIGFzIFRva2VuW10sIGNvbnRleHQucHVzaCh2KSwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCdvYmplY3QnID09PSB0eXBlb2YgdmFsdWUgfHwgJ3N0cmluZycgPT09IHR5cGVvZiB2YWx1ZSB8fCAnbnVtYmVyJyA9PT0gdHlwZW9mIHZhbHVlKSB7XG4gICAgICAgICAgICBidWZmZXIgKz0gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5bJC5UT0tFTl9MSVNUXSBhcyBUb2tlbltdLCBjb250ZXh0LnB1c2godmFsdWUgYXMgUGxhaW5PYmplY3QpLCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICAgIGlmICgnc3RyaW5nJyAhPT0gdHlwZW9mIG9yaWdpbmFsVGVtcGxhdGUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCB1c2UgaGlnaGVyLW9yZGVyIHNlY3Rpb25zIHdpdGhvdXQgdGhlIG9yaWdpbmFsIHRlbXBsYXRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBFeHRyYWN0IHRoZSBwb3J0aW9uIG9mIHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZSB0aGF0IHRoZSBzZWN0aW9uIGNvbnRhaW5zLlxuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5jYWxsKGNvbnRleHQudmlldywgb3JpZ2luYWxUZW1wbGF0ZS5zbGljZSh0b2tlblskLkVORF0sIHRva2VuWyQuVEFHX0lOREVYXSksIHN1YlJlbmRlcik7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlciArPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1ZmZlciArPSB0aGlzLnJlbmRlclRva2Vucyh0b2tlblskLlRPS0VOX0xJU1RdIGFzIFRva2VuW10sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlbmRlckludmVydGVkKHRva2VuOiBUb2tlbiwgY29udGV4dDogQ29udGV4dCwgcGFydGlhbHM/OiBUZW1wbGF0ZVBhcnRpYWxQYXJhbSwgb3JpZ2luYWxUZW1wbGF0ZT86IHN0cmluZyk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWyQuVkFMVUVdKTtcbiAgICAgICAgaWYgKCF2YWx1ZSB8fCAoaXNBcnJheSh2YWx1ZSkgJiYgMCA9PT0gdmFsdWUubGVuZ3RoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyVG9rZW5zKHRva2VuWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgaW5kZW50UGFydGlhbChwYXJ0aWFsOiBzdHJpbmcsIGluZGVudGF0aW9uOiBzdHJpbmcsIGxpbmVIYXNOb25TcGFjZTogYm9vbGVhbik6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGZpbHRlcmVkSW5kZW50YXRpb24gPSBpbmRlbnRhdGlvbi5yZXBsYWNlKC9bXiBcXHRdL2csICcnKTtcbiAgICAgICAgY29uc3QgcGFydGlhbEJ5TmwgPSBwYXJ0aWFsLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJ0aWFsQnlObC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHBhcnRpYWxCeU5sW2ldLmxlbmd0aCAmJiAoaSA+IDAgfHwgIWxpbmVIYXNOb25TcGFjZSkpIHtcbiAgICAgICAgICAgICAgICBwYXJ0aWFsQnlObFtpXSA9IGZpbHRlcmVkSW5kZW50YXRpb24gKyBwYXJ0aWFsQnlObFtpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFydGlhbEJ5Tmwuam9pbignXFxuJyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVuZGVyUGFydGlhbCh0b2tlbjogVG9rZW4sIGNvbnRleHQ6IENvbnRleHQsIHBhcnRpYWxzOiBUZW1wbGF0ZVBhcnRpYWxQYXJhbSB8IHVuZGVmaW5lZCwgdGFnczogVGVtcGxhdGVEZWxpbWl0ZXJzIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgdm9pZCB7XG4gICAgICAgIGlmICghcGFydGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHZhbHVlID0gKGlzRnVuY3Rpb24ocGFydGlhbHMpID8gcGFydGlhbHModG9rZW5bJC5WQUxVRV0pIDogcGFydGlhbHNbdG9rZW5bJC5WQUxVRV1dKSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCBsaW5lSGFzTm9uU3BhY2UgPSB0b2tlblskLkhBU19OT19TUEFDRV07XG4gICAgICAgICAgICBjb25zdCB0YWdJbmRleCAgICAgICAgPSB0b2tlblskLlRBR19JTkRFWF07XG4gICAgICAgICAgICBjb25zdCBpbmRlbnRhdGlvbiAgICAgPSB0b2tlblskLlRPS0VOX0xJU1RdO1xuICAgICAgICAgICAgbGV0IGluZGVudGVkVmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIGlmICgwID09PSB0YWdJbmRleCAmJiBpbmRlbnRhdGlvbikge1xuICAgICAgICAgICAgICAgIGluZGVudGVkVmFsdWUgPSB0aGlzLmluZGVudFBhcnRpYWwodmFsdWUsIGluZGVudGF0aW9uIGFzIHN0cmluZywgbGluZUhhc05vblNwYWNlIGFzIGJvb2xlYW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgeyB0b2tlbnMgfSA9IHRoaXMucGFyc2UoaW5kZW50ZWRWYWx1ZSwgdGFncyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5zLCBjb250ZXh0LCBwYXJ0aWFscywgaW5kZW50ZWRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1bmVzY2FwZWRWYWx1ZSh0b2tlbjogVG9rZW4sIGNvbnRleHQ6IENvbnRleHQpOiBzdHJpbmcgfCB2b2lkIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblskLlZBTFVFXSk7XG4gICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUgYXMgc3RyaW5nO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgZXNjYXBlZFZhbHVlKHRva2VuOiBUb2tlbiwgY29udGV4dDogQ29udGV4dCk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWyQuVkFMVUVdKTtcbiAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBnbG9iYWxTZXR0aW5ncy5lc2NhcGUodmFsdWUgYXMgc3RyaW5nKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJhd1ZhbHVlKHRva2VuOiBUb2tlbik6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0b2tlblskLlZBTFVFXTtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIEpTVCxcbiAgICBUZW1wbGF0ZURlbGltaXRlcnMsXG4gICAgSVRlbXBsYXRlRW5naW5lLFxuICAgIFRlbXBsYXRlU2Nhbm5lcixcbiAgICBUZW1wbGF0ZUNvbnRleHQsXG4gICAgVGVtcGxhdGVXcml0ZXIsXG4gICAgVGVtcGxhdGVFc2NhcGVyLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgZ2xvYmFsU2V0dGluZ3MgfSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IENhY2hlTG9jYXRpb24sIGNsZWFyQ2FjaGUgfSBmcm9tICcuL2NhY2hlJztcbmltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNTdHJpbmcsXG4gICAgdHlwZVN0cmluZyxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBTY2FubmVyIH0gZnJvbSAnLi9zY2FubmVyJztcbmltcG9ydCB7IENvbnRleHQgfSBmcm9tICcuL2NvbnRleHQnO1xuaW1wb3J0IHsgV3JpdGVyIH0gZnJvbSAnLi93cml0ZXInO1xuXG4vKiogW1tUZW1wbGF0ZUVuZ2luZV1dIGNvbW1vbiBzZXR0aW5ncyAqL1xuZ2xvYmFsU2V0dGluZ3Mud3JpdGVyID0gbmV3IFdyaXRlcigpO1xuXG4vKipcbiAqIEBlbiBbW1RlbXBsYXRlRW5naW5lXV0gZ2xvYmFsIHNldHRuZyBvcHRpb25zXG4gKiBAamEgW1tUZW1wbGF0ZUVuZ2luZV1dIOOCsOODreODvOODkOODq+ioreWumuOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlR2xvYmFsU2V0dGluZ3Mge1xuICAgIHdyaXRlcj86IFRlbXBsYXRlV3JpdGVyO1xuICAgIHRhZ3M/OiBUZW1wbGF0ZURlbGltaXRlcnM7XG4gICAgZXNjYXBlPzogVGVtcGxhdGVFc2NhcGVyO1xufVxuXG4vKipcbiAqIEBlbiBbW1RlbXBsYXRlRW5naW5lXV0gY29tcGlsZSBvcHRpb25zXG4gKiBAamEgW1tUZW1wbGF0ZUVuZ2luZV1dIOOCs+ODs+ODkeOCpOODq+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMge1xuICAgIHRhZ3M/OiBUZW1wbGF0ZURlbGltaXRlcnM7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlRW5naW5lIHV0aWxpdHkgY2xhc3MuXG4gKiBAamEgVGVtcGxhdGVFbmdpbmUg44Om44O844OG44Kj44Oq44OG44Kj44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZUVuZ2luZSBpbXBsZW1lbnRzIElUZW1wbGF0ZUVuZ2luZSB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IFtbSlNUXV0gZnJvbSB0ZW1wbGF0ZSBzb3VyY2UuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl+OBi+OCiSBbW0pTVF1dIOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHRlbXBsYXRlXG4gICAgICogIC0gYGVuYCB0ZW1wbGF0ZSBzb3VyY2Ugc3RyaW5nXG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJdcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29tcGlsZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNvbXBpbGUodGVtcGxhdGU6IHN0cmluZywgb3B0aW9ucz86IFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMpOiBKU1Qge1xuICAgICAgICBpZiAoIWlzU3RyaW5nKHRlbXBsYXRlKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgSW52YWxpZCB0ZW1wbGF0ZSEgdGhlIGZpcnN0IGFyZ3VtZW50IHNob3VsZCBiZSBhIFwic3RyaW5nXCIgYnV0IFwiJHt0eXBlU3RyaW5nKHRlbXBsYXRlKX1cIiB3YXMgZ2l2ZW4gZm9yIFRlbXBsYXRlRW5naW5lLmNvbXBpbGUodGVtcGxhdGUsIG9wdGlvbnMpYCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHRhZ3MgfSA9IG9wdGlvbnMgfHwgZ2xvYmFsU2V0dGluZ3M7XG4gICAgICAgIGNvbnN0IHsgd3JpdGVyIH0gPSBnbG9iYWxTZXR0aW5ncztcblxuICAgICAgICBjb25zdCBqc3QgPSAodmlldz86IFBsYWluT2JqZWN0LCBwYXJ0aWFscz86IFBsYWluT2JqZWN0KTogc3RyaW5nID0+IHtcbiAgICAgICAgICAgIHJldHVybiB3cml0ZXIucmVuZGVyKHRlbXBsYXRlLCB2aWV3IHx8IHt9LCBwYXJ0aWFscywgdGFncyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgeyB0b2tlbnMsIGNhY2hlS2V5IH0gPSB3cml0ZXIucGFyc2UodGVtcGxhdGUsIHRhZ3MpO1xuICAgICAgICBqc3QudG9rZW5zICAgICAgICA9IHRva2VucztcbiAgICAgICAganN0LmNhY2hlS2V5ICAgICAgPSBjYWNoZUtleTtcbiAgICAgICAganN0LmNhY2hlTG9jYXRpb24gPSBbQ2FjaGVMb2NhdGlvbi5OQU1FU1BBQ0UsIENhY2hlTG9jYXRpb24uUk9PVF07XG5cbiAgICAgICAgcmV0dXJuIGpzdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXJzIGFsbCBjYWNoZWQgdGVtcGxhdGVzIGluIHRoZSBkZWZhdWx0IFtbVGVtcGxhdGVXcml0ZXJdXS5cbiAgICAgKiBAamEg5pei5a6a44GuIFtbVGVtcGxhdGVXcml0ZXJdXSDjga7jgZnjgbnjgabjga7jgq3jg6Pjg4Pjgrfjg6XjgpLliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNsZWFyQ2FjaGUoKTogdm9pZCB7XG4gICAgICAgIGNsZWFyQ2FjaGUoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hhbmdlIFtbVGVtcGxhdGVFbmdpbmVdXSBnbG9iYWwgc2V0dGluZ3MuXG4gICAgICogQGphIFtbVGVtcGxhdGVFbmdpbmVdXSDjgrDjg63jg7zjg5Djg6voqK3lrprjga7mm7TmlrBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZXR0aW5nc1xuICAgICAqICAtIGBlbmAgbmV3IHNldHRpbmdzXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYToqK3lrprlgKRcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHNldHRpbmdzXG4gICAgICogIC0gYGphYCDlj6TjgYToqK3lrprlgKRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHNldEdsb2JhbFNldHRpbmdzKHNldGlpbmdzOiBUZW1wbGF0ZUdsb2JhbFNldHRpbmdzKTogVGVtcGxhdGVHbG9iYWxTZXR0aW5ncyB7XG4gICAgICAgIGNvbnN0IG9sZFNldHRpbmdzID0geyAuLi5nbG9iYWxTZXR0aW5ncyB9O1xuICAgICAgICBjb25zdCB7IHdyaXRlciwgdGFncywgZXNjYXBlIH0gPSBzZXRpaW5ncztcbiAgICAgICAgd3JpdGVyICYmIChnbG9iYWxTZXR0aW5ncy53cml0ZXIgPSB3cml0ZXIpO1xuICAgICAgICB0YWdzICAgJiYgKGdsb2JhbFNldHRpbmdzLnRhZ3MgICA9IHRhZ3MpO1xuICAgICAgICBlc2NhcGUgJiYgKGdsb2JhbFNldHRpbmdzLmVzY2FwZSA9IGVzY2FwZSk7XG4gICAgICAgIHJldHVybiBvbGRTZXR0aW5ncztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgc3RhdGljIG1ldGhvZHM6IGZvciBkZWJ1Z1xuXG4gICAgLyoqIEBpbnRlcm5hbCBDcmVhdGUgW1tUZW1wbGF0ZVNjYW5uZXJdXSBpbnN0YW5jZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlU2Nhbm5lcihzcmM6IHN0cmluZyk6IFRlbXBsYXRlU2Nhbm5lciB7XG4gICAgICAgIHJldHVybiBuZXcgU2Nhbm5lcihzcmMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgQ3JlYXRlIFtbVGVtcGxhdGVDb250ZXh0XV0gaW5zdGFuY2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZUNvbnRleHQodmlldzogUGxhaW5PYmplY3QsIHBhcmVudENvbnRleHQ/OiBDb250ZXh0KTogVGVtcGxhdGVDb250ZXh0IHtcbiAgICAgICAgcmV0dXJuIG5ldyBDb250ZXh0KHZpZXcsIHBhcmVudENvbnRleHQpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgQ3JlYXRlIFtbVGVtcGxhdGVXcml0ZXJdXSBpbnN0YW5jZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlV3JpdGVyKCk6IFRlbXBsYXRlV3JpdGVyIHtcbiAgICAgICAgcmV0dXJuIG5ldyBXcml0ZXIoKTtcbiAgICB9XG59XG4iXSwibmFtZXMiOlsiaXNOdW1iZXIiLCJfdG9rZW5zIiwiX3Byb3h5SGFuZGxlciIsImNjIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7Ozs7Ozs7O1NBUWdCLFNBQVM7O0lBRXJCLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxVQUFVLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO0FBQ3JGLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7U0FXZ0IsWUFBWSxDQUE0QixNQUFxQixFQUFFLEdBQUcsS0FBZTtJQUM3RixJQUFJLElBQUksR0FBRyxNQUFNLElBQUksU0FBUyxFQUFFLENBQUM7SUFDakMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7UUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDOUIsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNyQjtJQUNELE9BQU8sSUFBUyxDQUFDO0FBQ3JCLENBQUM7QUFFRDs7OztTQUlnQixrQkFBa0IsQ0FBNEIsU0FBaUI7SUFDM0UsT0FBTyxZQUFZLENBQUksSUFBSSxFQUFF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RCxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUEyQixDQUFDO1FBQ3BELEtBQUssTUFBTSxHQUFHLElBQUksVUFBVSxFQUFFO1lBQzFCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMzQixNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDO1lBQ3BFLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7U0FDM0M7UUFDRCxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDaEQ7Ozs7SUFNTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQVMsRUFBRSxRQUFhO1FBQzNDLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUMvQixJQUFJLENBQUMsS0FBSyxTQUFTLENBQUMsSUFBSSxFQUFFO1lBQ3RCLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzNCLEtBQUssTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUNyQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2pEO1lBQ0QsSUFBSSwwQkFBMkIsS0FBSyxFQUFFO2dC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
