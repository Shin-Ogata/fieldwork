/*!
 * @cdp/core-utils 0.9.5
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
    @typescript-eslint/no-explicit-any
 ,  @typescript-eslint/ban-types
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
    @typescript-eslint/ban-types
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
    @typescript-eslint/no-explicit-any
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
    no-invalid-this
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

export { $cdp, at, camelize, capitalize, className, classify, clearInterval, clearTimeout, computeDate, createEscaper, dasherize, debounce, decapitalize, deepCopy, deepEqual, deepMerge, diff, difference, dropUndefined, ensureObject, escapeHTML, every, exists, filter, find, findIndex, fromTypedData, getConfig, getGlobal, getGlobalNamespace, groupBy, has, indices, instanceOf, intersection, invert, isArray, isBoolean, isChancelLikeError, isEmptyObject, isFunction, isIterable, isNil, isNumber, isObject, isPlainObject, isPrimitive, isString, isSymbol, isTypedArray, luid, map, mixins, noop, omit, once, ownInstanceOf, pick, post, randomInt, reduce, restoreNil, result, safe, sameClass, sameType, sample, setInterval, setMixClassAttribute, setTimeout, shuffle, sleep, some, sort, throttle, toTypedData, typeOf, underscored, unescapeHTML, union, unique, verify, without };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS11dGlscy5tanMiLCJzb3VyY2VzIjpbImNvbmZpZy50cyIsInR5cGVzLnRzIiwidmVyaWZ5LnRzIiwiZGVlcC1jaXJjdWl0LnRzIiwibWl4aW5zLnRzIiwib2JqZWN0LnRzIiwic2FmZS50cyIsInRpbWVyLnRzIiwibWlzYy50cyIsImFycmF5LnRzIiwiZGF0ZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBlbiBTYWZlIGBnbG9iYWxgIGFjY2Vzc29yLlxuICogQGphIGBnbG9iYWxgIOOCouOCr+OCu+ODg+OCtVxuICogXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBgZ2xvYmFsYCBvYmplY3Qgb2YgdGhlIHJ1bnRpbWUgZW52aXJvbm1lbnRcbiAqICAtIGBqYWAg55Kw5aKD44Gr5b+c44GY44GfIGBnbG9iYWxgIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2xvYmFsKCk6IHR5cGVvZiBnbG9iYWxUaGlzIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbmV3LWZ1bmMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1pbXBsaWVkLWV2YWxcbiAgICByZXR1cm4gKCdvYmplY3QnID09PSB0eXBlb2YgZ2xvYmFsVGhpcykgPyBnbG9iYWxUaGlzIDogRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcbn1cblxuLyoqXG4gKiBAZW4gRW5zdXJlIG5hbWVkIG9iamVjdCBhcyBwYXJlbnQncyBwcm9wZXJ0eS5cbiAqIEBqYSDopqrjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrprjgZfjgaYsIOWQjeWJjeOBq+aMh+WumuOBl+OBn+OCquODluOCuOOCp+OCr+ODiOOBruWtmOWcqOOCkuS/neiovFxuICpcbiAqIEBwYXJhbSBwYXJlbnRcbiAqICAtIGBlbmAgcGFyZW50IG9iamVjdC4gSWYgbnVsbCBnaXZlbiwgYGdsb2JhbFRoaXNgIGlzIGFzc2lnbmVkLlxuICogIC0gYGphYCDopqrjgqrjg5bjgrjjgqfjgq/jg4guIG51bGwg44Gu5aC05ZCI44GvIGBnbG9iYWxUaGlzYCDjgYzkvb/nlKjjgZXjgozjgotcbiAqIEBwYXJhbSBuYW1lc1xuICogIC0gYGVuYCBvYmplY3QgbmFtZSBjaGFpbiBmb3IgZW5zdXJlIGluc3RhbmNlLlxuICogIC0gYGphYCDkv53oqLzjgZnjgovjgqrjg5bjgrjjgqfjgq/jg4jjga7lkI3liY1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZU9iamVjdDxUIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PihwYXJlbnQ6IG9iamVjdCB8IG51bGwsIC4uLm5hbWVzOiBzdHJpbmdbXSk6IFQge1xuICAgIGxldCByb290ID0gcGFyZW50IHx8IGdldEdsb2JhbCgpO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBuYW1lcykge1xuICAgICAgICByb290W25hbWVdID0gcm9vdFtuYW1lXSB8fCB7fTtcbiAgICAgICAgcm9vdCA9IHJvb3RbbmFtZV07XG4gICAgfVxuICAgIHJldHVybiByb290IGFzIFQ7XG59XG5cbi8qKlxuICogQGVuIEdsb2JhbCBuYW1lc3BhY2UgYWNjZXNzb3IuXG4gKiBAamEg44Kw44Ot44O844OQ44Or44ON44O844Og44K544Oa44O844K544Ki44Kv44K744OD44K1XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWxOYW1lc3BhY2U8VCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4obmFtZXNwYWNlOiBzdHJpbmcpOiBUIHtcbiAgICByZXR1cm4gZW5zdXJlT2JqZWN0PFQ+KG51bGwsIG5hbWVzcGFjZSk7XG59XG5cbi8qKlxuICogQGVuIEdsb2JhbCBjb25maWcgYWNjZXNzb3IuXG4gKiBAamEg44Kw44Ot44O844OQ44Or44Kz44Oz44OV44Kj44Kw44Ki44Kv44K744OD44K1XG4gKlxuICogQHJldHVybnMgZGVmYXVsdDogYENEUC5Db25maWdgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25maWc8VCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4obmFtZXNwYWNlID0gJ0NEUCcsIGNvbmZpZ05hbWUgPSAnQ29uZmlnJyk6IFQge1xuICAgIHJldHVybiBlbnN1cmVPYmplY3Q8VD4oZ2V0R2xvYmFsTmFtZXNwYWNlKG5hbWVzcGFjZSksIGNvbmZpZ05hbWUpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L2Jhbi10eXBlc1xuICovXG5cbi8qKlxuICogQGVuIFByaW1pdGl2ZSB0eXBlIG9mIEphdmFTY3JpcHQuXG4gKiBAamEgSmF2YVNjcmlwdCDjga7jg5fjg6rjg5/jg4bjgqPjg5blnotcbiAqL1xuZXhwb3J0IHR5cGUgUHJpbWl0aXZlID0gc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IHN5bWJvbCB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVuIFRoZSBnZW5lcmFsIG51bGwgdHlwZS5cbiAqIEBqYSDnqbrjgpLnpLrjgZnlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgTmlsID0gdm9pZCB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVuIFRoZSB0eXBlIG9mIG9iamVjdCBvciBbW05pbF1dLlxuICogQGphIFtbTmlsXV0g44Gr44Gq44KK44GI44KL44Kq44OW44K444Kn44Kv44OI5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIE5pbGxhYmxlPFQgZXh0ZW5kcyBvYmplY3Q+ID0gVCB8IE5pbDtcblxuLyoqXG4gKiBAZW4gQXZvaWQgdGhlIGBGdW5jdGlvbmB0eXBlcy5cbiAqIEBqYSDmsY7nlKjplqLmlbDlnotcbiAqL1xuZXhwb3J0IHR5cGUgVW5rbm93bkZ1bmN0aW9uID0gKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bjtcblxuLyoqXG4gKiBAZW4gQXZvaWQgdGhlIGBPYmplY3RgIGFuZCBge31gIHR5cGVzLCBhcyB0aGV5IG1lYW4gXCJhbnkgbm9uLW51bGxpc2ggdmFsdWVcIi5cbiAqIEBqYSDmsY7nlKjjgqrjg5bjgrjjgqfjgq/jg4jlnosuIGBPYmplY3RgIOOBiuOCiOOBsyBge31gIOOCv+OCpOODl+OBr+OAjG51bGzjgafjgarjgYTlgKTjgI3jgpLmhI/lkbPjgZnjgovjgZ/jgoHku6PkvqHjgajjgZfjgabkvb/nlKhcbiAqL1xuZXhwb3J0IHR5cGUgVW5rbm93bk9iamVjdCA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG4vKipcbiAqIEBlbiBOb24tbnVsbGlzaCB2YWx1ZS5cbiAqIEBqYSDpnZ4gTnVsbCDlgKRcbiAqL1xuZXhwb3J0IHR5cGUgTm9uTmlsID0ge307XG5cbi8qKlxuICogQGVuIEphdmFTY3JpcHQgdHlwZSBzZXQgaW50ZXJmYWNlLlxuICogQGphIEphdmFTY3JpcHQg44Gu5Z6L44Gu6ZuG5ZCIXG4gKi9cbmludGVyZmFjZSBUeXBlTGlzdCB7XG4gICAgc3RyaW5nOiBzdHJpbmc7XG4gICAgbnVtYmVyOiBudW1iZXI7XG4gICAgYm9vbGVhbjogYm9vbGVhbjtcbiAgICBzeW1ib2w6IHN5bWJvbDtcbiAgICB1bmRlZmluZWQ6IHZvaWQgfCB1bmRlZmluZWQ7XG4gICAgb2JqZWN0OiBvYmplY3QgfCBudWxsO1xuICAgIGZ1bmN0aW9uKC4uLmFyZ3M6IHVua25vd25bXSk6IHVua25vd247XG59XG5cbi8qKlxuICogQGVuIFRoZSBrZXkgbGlzdCBvZiBbW1R5cGVMaXN0XV0uXG4gKiBAamEgW1tUeXBlTGlzdF1dIOOCreODvOS4gOimp1xuICovXG5leHBvcnQgdHlwZSBUeXBlS2V5cyA9IGtleW9mIFR5cGVMaXN0O1xuXG4vKipcbiAqIEBlbiBUeXBlIGJhc2UgZGVmaW5pdGlvbi5cbiAqIEBqYSDlnovjga7opo/lrprlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUeXBlPFQgZXh0ZW5kcyBvYmplY3Q+IGV4dGVuZHMgRnVuY3Rpb24ge1xuICAgIHJlYWRvbmx5IHByb3RvdHlwZTogVDtcbn1cblxuLyoqXG4gKiBAZW4gVHlwZSBvZiBjb25zdHJ1Y3Rvci5cbiAqIEBqYSDjgrPjg7Pjgrnjg4jjg6njgq/jgr/lnotcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb25zdHJ1Y3RvcjxUIGV4dGVuZHMgb2JqZWN0PiBleHRlbmRzIFR5cGU8VD4ge1xuICAgIG5ldyguLi5hcmdzOiB1bmtub3duW10pOiBUO1xufVxuXG4vKipcbiAqIEBlbiBUeXBlIG9mIGNsYXNzLlxuICogQGphIOOCr+ODqeOCueWei1xuICovXG5leHBvcnQgdHlwZSBDbGFzczxUIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PiA9IENvbnN0cnVjdG9yPFQ+O1xuXG4vKipcbiAqIEBlbiBFbnN1cmUgZm9yIGZ1bmN0aW9uIHBhcmFtZXRlcnMgdG8gdHVwbGUuXG4gKiBAamEg6Zai5pWw44OR44Op44Oh44O844K/44Go44GX44GmIHR1cGxlIOOCkuS/neiovFxuICovXG5leHBvcnQgdHlwZSBBcmd1bWVudHM8VD4gPSBUIGV4dGVuZHMgYW55W10gPyBUIDogW1RdO1xuXG4vKipcbiAqIEBlbiBSbW92ZSBgcmVhZG9ubHlgIGF0dHJpYnV0ZXMgZnJvbSBpbnB1dCB0eXBlLlxuICogQGphIGByZWFkb25seWAg5bGe5oCn44KS6Kej6ZmkXG4gKi9cbmV4cG9ydCB0eXBlIFdyaXRhYmxlPFQ+ID0geyAtcmVhZG9ubHkgW0sgaW4ga2V5b2YgVF06IFRbS10gfTtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBmdW5jdGlvbmFsIHByb3BlcnR5IG5hbWVzLlxuICogQGphIOmWouaVsOODl+ODreODkeODhuOCo+WQjeOBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBGdW5jdGlvblByb3BlcnR5TmFtZXM8VD4gPSB7IFtLIGluIGtleW9mIFRdOiBUW0tdIGV4dGVuZHMgRnVuY3Rpb24gPyBLIDogbmV2ZXIgfVtrZXlvZiBUXTtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBmdW5jdGlvbmFsIHByb3BlcnRpZXMuXG4gKiBAamEg6Zai5pWw44OX44Ot44OR44OG44Kj44Gu5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIEZ1bmN0aW9uUHJvcGVydGllczxUPiA9IFBpY2s8VCwgRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+PjtcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBub24tZnVuY3Rpb25hbCBwcm9wZXJ0eSBuYW1lcy5cbiAqIEBqYSDpnZ7plqLmlbDjg5fjg63jg5Hjg4bjgqPlkI3jga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFQ+ID0geyBbSyBpbiBrZXlvZiBUXTogVFtLXSBleHRlbmRzIEZ1bmN0aW9uID8gbmV2ZXIgOiBLIH1ba2V5b2YgVF07XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgbm9uLWZ1bmN0aW9uYWwgcHJvcGVydGllcy5cbiAqIEBqYSDpnZ7plqLmlbDjg5fjg63jg5Hjg4bjgqPjga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgTm9uRnVuY3Rpb25Qcm9wZXJ0aWVzPFQ+ID0gUGljazxULCBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VD4+O1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG9iamVjdCBrZXkgbGlzdC4gKGVuc3VyZSBvbmx5ICdzdHJpbmcnKVxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBruOCreODvOS4gOimp+OCkuaKveWHuiAoJ3N0cmluZycg5Z6L44Gu44G/44KS5L+d6Ki8KVxuICovXG5leHBvcnQgdHlwZSBLZXlzPFQgZXh0ZW5kcyBvYmplY3Q+ID0ga2V5b2YgT21pdDxULCBudW1iZXIgfCBzeW1ib2w+O1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG9iamVjdCB0eXBlIGxpc3QuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu5Z6L5LiA6Kan44KS5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVzPFQgZXh0ZW5kcyBvYmplY3Q+ID0gVFtrZXlvZiBUXTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBvYmplY3Qga2V5IHRvIHR5cGUuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Kt44O844GL44KJ5Z6L44G45aSJ5o+bXG4gKi9cbmV4cG9ydCB0eXBlIEtleVRvVHlwZTxPIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMga2V5b2YgTz4gPSBLIGV4dGVuZHMga2V5b2YgTyA/IE9bS10gOiBuZXZlcjtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBvYmplY3QgdHlwZSB0byBrZXkuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI5Z6L44GL44KJ44Kt44O844G45aSJ5o+bXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVUb0tleTxPIGV4dGVuZHMgb2JqZWN0LCBUIGV4dGVuZHMgVHlwZXM8Tz4+ID0geyBbSyBpbiBrZXlvZiBPXTogT1tLXSBleHRlbmRzIFQgPyBLIDogbmV2ZXIgfVtrZXlvZiBPXTtcblxuLyoqXG4gKiBAZW4gVGhlIFtbUGxhaW5PYmplY3RdXSB0eXBlIGlzIGEgSmF2YVNjcmlwdCBvYmplY3QgY29udGFpbmluZyB6ZXJvIG9yIG1vcmUga2V5LXZhbHVlIHBhaXJzLiA8YnI+XG4gKiAgICAgJ1BsYWluJyBtZWFucyBpdCBmcm9tIG90aGVyIGtpbmRzIG9mIEphdmFTY3JpcHQgb2JqZWN0cy4gZXg6IG51bGwsIHVzZXItZGVmaW5lZCBhcnJheXMsIGFuZCBob3N0IG9iamVjdHMgc3VjaCBhcyBgZG9jdW1lbnRgLlxuICogQGphIDAg5Lul5LiK44GuIGtleS12YWx1ZSDjg5rjgqLjgpLmjIHjgaQgW1tQbGFpbk9iamVjdF1dIOWumue+qSA8YnI+VGhlIFBsYWluT2JqZWN0IHR5cGUgaXMgYSBKYXZhU2NyaXB0IG9iamVjdCBjb250YWluaW5nIHplcm8gb3IgbW9yZSBrZXktdmFsdWUgcGFpcnMuIDxicj5cbiAqICAgICAnUGxhaW4nIOOBqOOBr+S7luOBrueorumhnuOBriBKYXZhU2NyaXB0IOOCquODluOCuOOCp+OCr+ODiOOCkuWQq+OBvuOBquOBhOOCquODluOCuOOCp+OCr+ODiOOCkuaEj+WRs+OBmeOCiy4g5L6LOiAgbnVsbCwg44Om44O844K244O85a6a576p6YWN5YiXLCDjgb7jgZ/jga8gYGRvY3VtZW50YCDjga7jgojjgYbjgarntYTjgb/ovrzjgb/jgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGFpbk9iamVjdDxUID0gYW55PiB7XG4gICAgW2tleTogc3RyaW5nXTogVDtcbn1cblxuLyoqXG4gKiBAZW4gVGhlIGRhdGEgdHlwZSBsaXN0IGJ5IHdoaWNoIHN0eWxlIGNvbXB1bHNpb24gaXMgcG9zc2libGUuXG4gKiBAamEg5Z6L5by35Yi25Y+v6IO944Gq44OH44O844K/5Z6L5LiA6KanXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVkRGF0YSA9IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsIHwgb2JqZWN0O1xuXG4vKipcbiAqIEBlbiBUaGUgZGF0YSB0eXBlIGxpc3Qgb2YgVHlwZWRBcnJheS5cbiAqIEBqYSBUeXBlZEFycmF5IOS4gOimp1xuICovXG5leHBvcnQgdHlwZSBUeXBlZEFycmF5ID0gSW50OEFycmF5IHwgVWludDhBcnJheSB8IFVpbnQ4Q2xhbXBlZEFycmF5IHwgSW50MTZBcnJheSB8IFVpbnQxNkFycmF5IHwgSW50MzJBcnJheSB8IFVpbnQzMkFycmF5IHwgRmxvYXQzMkFycmF5IHwgRmxvYXQ2NEFycmF5O1xuXG4vKipcbiAqIEBlbiBUeXBlZEFycmF5IGNvbnN0cnVjdG9yLlxuICogQGphIFR5cGVkQXJyYXkg44Kz44Oz44K544OI44Op44Kv44K/5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZWRBcnJheUNvbnN0cnVjdG9yIHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IFR5cGVkQXJyYXk7XG4gICAgbmV3KHNlZWQ6IG51bWJlciB8IEFycmF5TGlrZTxudW1iZXI+IHwgQXJyYXlCdWZmZXJMaWtlKTogVHlwZWRBcnJheTtcbiAgICBuZXcoYnVmZmVyOiBBcnJheUJ1ZmZlckxpa2UsIGJ5dGVPZmZzZXQ/OiBudW1iZXIsIGxlbmd0aD86IG51bWJlcik6IFR5cGVkQXJyYXk7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIHNpemUgaW4gYnl0ZXMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEg6KaB57Sg44Gu44OQ44Kk44OI44K144Kk44K6XG4gICAgICovXG4gICAgcmVhZG9ubHkgQllURVNfUEVSX0VMRU1FTlQ6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGEgbmV3IGFycmF5IGZyb20gYSBzZXQgb2YgZWxlbWVudHMuXG4gICAgICogQGphIOimgee0oOOCkuioreWumuOBl+aWsOimj+mFjeWIl+OCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGl0ZW1zXG4gICAgICogIC0gYGVuYCBBIHNldCBvZiBlbGVtZW50cyB0byBpbmNsdWRlIGluIHRoZSBuZXcgYXJyYXkgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5paw44Gf44Gr6Kit5a6a44GZ44KL6KaB57SgXG4gICAgICovXG4gICAgb2YoLi4uaXRlbXM6IG51bWJlcltdKTogVHlwZWRBcnJheTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvciBpdGVyYWJsZSBvYmplY3QuXG4gICAgICogQGphIGFycmF5LWxpa2UgLyBpdGVyYXRhYmxlIOOCquODluOCuOOCp+OCr+ODiOOBi+OCieaWsOimj+mFjeWIl+OCkuS9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5TGlrZVxuICAgICAqICAtIGBlbmAgQW4gYXJyYXktbGlrZSBvciBpdGVyYWJsZSBvYmplY3QgdG8gY29udmVydCB0byBhbiBhcnJheS5cbiAgICAgKiAgLSBgamFgIGFycmF5LWxpa2Ug44KC44GX44GP44GvIGl0ZXJhdGFibGUg44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgZnJvbShhcnJheUxpa2U6IEFycmF5TGlrZTxudW1iZXI+KTogVHlwZWRBcnJheTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGVzIGFuIGFycmF5IGZyb20gYW4gYXJyYXktbGlrZSBvciBpdGVyYWJsZSBvYmplY3QuXG4gICAgICogQGphIGFycmF5LWxpa2UgLyBpdGVyYXRhYmxlIOOCquODluOCuOOCp+OCr+ODiOOBi+OCieaWsOimj+mFjeWIl+OCkuS9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5TGlrZVxuICAgICAqICAtIGBlbmAgQW4gYXJyYXktbGlrZSBvciBpdGVyYWJsZSBvYmplY3QgdG8gY29udmVydCB0byBhbiBhcnJheS5cbiAgICAgKiAgLSBgamFgIGFycmF5LWxpa2Ug44KC44GX44GP44GvIGl0ZXJhdGFibGUg44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG1hcGZuXG4gICAgICogIC0gYGVuYCBBIG1hcHBpbmcgZnVuY3Rpb24gdG8gY2FsbCBvbiBldmVyeSBlbGVtZW50IG9mIHRoZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOWFqOimgee0oOOBq+mBqeeUqOOBmeOCi+ODl+ODreOCreOCt+mWouaVsFxuICAgICAqIEBwYXJhbSB0aGlzQXJnXG4gICAgICogIC0gYGVuYCBWYWx1ZSBvZiAndGhpcycgdXNlZCB0byBpbnZva2UgdGhlIG1hcGZuLlxuICAgICAqICAtIGBqYWAgbWFwZm4g44Gr5L2/55So44GZ44KLICd0aGlzJ1xuICAgICAqL1xuICAgIGZyb208VD4oYXJyYXlMaWtlOiBBcnJheUxpa2U8VD4sIG1hcGZuOiAodjogVCwgazogbnVtYmVyKSA9PiBudW1iZXIsIHRoaXNBcmc/OiB1bmtub3duKTogVHlwZWRBcnJheTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBleGlzdHMuXG4gKiBAamEg5YCk44GM5a2Y5Zyo44GZ44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXhpc3RzPFQ+KHg6IFQgfCBOaWwpOiB4IGlzIFQge1xuICAgIHJldHVybiBudWxsICE9IHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFtbTmlsXV0uXG4gKiBAamEgW1tOaWxdXSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05pbCh4OiB1bmtub3duKTogeCBpcyBOaWwge1xuICAgIHJldHVybiBudWxsID09IHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFN0cmluZy5cbiAqIEBqYSBTdHJpbmcg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmcoeDogdW5rbm93bik6IHggaXMgc3RyaW5nIHtcbiAgICByZXR1cm4gJ3N0cmluZycgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBOdW1iZXIuXG4gKiBAamEgTnVtYmVyIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTnVtYmVyKHg6IHVua25vd24pOiB4IGlzIG51bWJlciB7XG4gICAgcmV0dXJuICdudW1iZXInID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgQm9vbGVhbi5cbiAqIEBqYSBCb29sZWFuIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQm9vbGVhbih4OiB1bmtub3duKTogeCBpcyBib29sZWFuIHtcbiAgICByZXR1cm4gJ2Jvb2xlYW4nID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgU3ltYmxlLlxuICogQGphIFN5bWJvbCDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N5bWJvbCh4OiB1bmtub3duKTogeCBpcyBzeW1ib2wge1xuICAgIHJldHVybiAnc3ltYm9sJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIHByaW1pdGl2ZSB0eXBlLlxuICogQGphIOODl+ODquODn+ODhuOCo+ODluWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUHJpbWl0aXZlKHg6IHVua25vd24pOiB4IGlzIFByaW1pdGl2ZSB7XG4gICAgcmV0dXJuICF4IHx8ICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgeCkgJiYgKCdvYmplY3QnICE9PSB0eXBlb2YgeCk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIEFycmF5LlxuICogQGphIEFycmF5IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGNvbnN0IGlzQXJyYXkgPSBBcnJheS5pc0FycmF5OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBPYmplY3QuXG4gKiBAamEgT2JqZWN0IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT2JqZWN0KHg6IHVua25vd24pOiB4IGlzIG9iamVjdCB7XG4gICAgcmV0dXJuIEJvb2xlYW4oeCkgJiYgJ29iamVjdCcgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBbW1BsYWluT2JqZWN0XV0uXG4gKiBAamEgW1tQbGFpbk9iamVjdF1dIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUGxhaW5PYmplY3QoeDogdW5rbm93bik6IHggaXMgUGxhaW5PYmplY3Qge1xuICAgIGlmICghaXNPYmplY3QoeCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGNyZWF0ZSBmcm9tIGBPYmplY3QuY3JlYXRlKCBudWxsIClgIGlzIHBsYWluXG4gICAgaWYgKCFPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIG93bkluc3RhbmNlT2YoT2JqZWN0LCB4KTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgZW1wdHkgb2JqZWN0LlxuICogQGphIOepuuOCquODluOCuOOCp+OCr+ODiOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRW1wdHlPYmplY3QoeDogdW5rbm93bik6IHggaXMgb2JqZWN0IHtcbiAgICBpZiAoIWlzUGxhaW5PYmplY3QoeCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG5hbWUgaW4geCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBGdW5jdGlvbi5cbiAqIEBqYSBGdW5jdGlvbiDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Z1bmN0aW9uKHg6IHVua25vd24pOiB4IGlzIFR5cGVMaXN0WydmdW5jdGlvbiddIHtcbiAgICByZXR1cm4gJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIGlucHV0LlxuICogQGphIOaMh+WumuOBl+OBn+Wei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB0eXBlXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB0eXBlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+Wei1xuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZU9mPEsgZXh0ZW5kcyBUeXBlS2V5cz4odHlwZTogSywgeDogdW5rbm93bik6IHggaXMgVHlwZUxpc3RbS10ge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gdHlwZTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGhhcyBpdGVyYXRvci5cbiAqIEBqYSBpdGVyYXRvciDjgpLmiYDmnInjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlPFQ+KHg6IE5pbGxhYmxlPEl0ZXJhYmxlPFQ+Pik6IHggaXMgSXRlcmFibGU8VD47XG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZSh4OiB1bmtub3duKTogeCBpcyBJdGVyYWJsZTx1bmtub3duPjtcbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlKHg6IHVua25vd24pOiBhbnkge1xuICAgIHJldHVybiBTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KHgpO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfdHlwZWRBcnJheU5hbWVzID0ge1xuICAgICdJbnQ4QXJyYXknOiB0cnVlLFxuICAgICdVaW50OEFycmF5JzogdHJ1ZSxcbiAgICAnVWludDhDbGFtcGVkQXJyYXknOiB0cnVlLFxuICAgICdJbnQxNkFycmF5JzogdHJ1ZSxcbiAgICAnVWludDE2QXJyYXknOiB0cnVlLFxuICAgICdJbnQzMkFycmF5JzogdHJ1ZSxcbiAgICAnVWludDMyQXJyYXknOiB0cnVlLFxuICAgICdGbG9hdDMyQXJyYXknOiB0cnVlLFxuICAgICdGbG9hdDY0QXJyYXknOiB0cnVlLFxufTtcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGlzIG9uZSBvZiBbW1R5cGVkQXJyYXldXS5cbiAqIEBqYSDmjIflrprjgZfjgZ/jgqTjg7Pjgrnjgr/jg7PjgrnjgYwgW1tUeXBlZEFycmF5XV0g44Gu5LiA56iu44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlZEFycmF5KHg6IHVua25vd24pOiB4IGlzIFR5cGVkQXJyYXkge1xuICAgIHJldHVybiAhIV90eXBlZEFycmF5TmFtZXNbY2xhc3NOYW1lKHgpXTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGluc3RhbmNlIG9mIGlucHV0LlxuICogQGphIOaMh+WumuOBl+OBn+OCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDoqZXkvqHjgZnjgovjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluc3RhbmNlT2Y8VCBleHRlbmRzIG9iamVjdD4oY3RvcjogTmlsbGFibGU8VHlwZTxUPj4sIHg6IHVua25vd24pOiB4IGlzIFQge1xuICAgIHJldHVybiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGN0b3IpICYmICh4IGluc3RhbmNlb2YgY3Rvcik7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZSBpbnN0YW5jZSBvZiBpbnB1dCBjb25zdHJ1Y3RvciAoZXhjZXB0IHN1YiBjbGFzcykuXG4gKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44Gu44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5Yik5a6aICjmtL7nlJ/jgq/jg6njgrnjga/lkKvjgoHjgarjgYQpXG4gKlxuICogQHBhcmFtIGN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIGNvbnN0cnVjdG9yXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+OCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gb3duSW5zdGFuY2VPZjxUIGV4dGVuZHMgb2JqZWN0PihjdG9yOiBOaWxsYWJsZTxUeXBlPFQ+PiwgeDogdW5rbm93bik6IHggaXMgVCB7XG4gICAgcmV0dXJuIChudWxsICE9IHgpICYmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgY3RvcikgJiYgKE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSA9PT0gT2JqZWN0KGN0b3IucHJvdG90eXBlKSk7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgdmFsdWUncyBjbGFzcyBuYW1lLlxuICogQGphIOOCr+ODqeOCueWQjeOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzTmFtZSh4OiBhbnkpOiBzdHJpbmcgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1tb2R1bGUtYm91bmRhcnktdHlwZXNcbiAgICBpZiAoeCAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHRvU3RyaW5nVGFnTmFtZSA9IHhbU3ltYm9sLnRvU3RyaW5nVGFnXTtcbiAgICAgICAgaWYgKGlzU3RyaW5nKHRvU3RyaW5nVGFnTmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0b1N0cmluZ1RhZ05hbWU7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbih4KSAmJiB4LnByb3RvdHlwZSAmJiBudWxsICE9IHgubmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHgubmFtZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGN0b3IgPSB4LmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oY3RvcikgJiYgY3RvciA9PT0gKE9iamVjdChjdG9yLnByb3RvdHlwZSkgYXMgb2JqZWN0KS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjdG9yLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgYXMgc3RyaW5nKS5zbGljZSg4LCAtMSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIGlucHV0IHZhbHVlcyBhcmUgc2FtZSB2YWx1ZS10eXBlLlxuICogQGphIOWFpeWKm+OBjOWQjOS4gOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBsaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICogQHBhcmFtIHJoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYW1lVHlwZShsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0eXBlb2YgbGhzID09PSB0eXBlb2YgcmhzO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBpbnB1dCB2YWx1ZXMgYXJlIHNhbWUgY2xhc3MuXG4gKiBAamEg5YWl5Yqb44GM5ZCM5LiA44Kv44Op44K544Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGxoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKiBAcGFyYW0gcmhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhbWVDbGFzcyhsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIGlmIChudWxsID09IGxocyAmJiBudWxsID09IHJocykge1xuICAgICAgICByZXR1cm4gY2xhc3NOYW1lKGxocykgPT09IGNsYXNzTmFtZShyaHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAobnVsbCAhPSBsaHMpICYmIChudWxsICE9IHJocykgJiYgKE9iamVjdC5nZXRQcm90b3R5cGVPZihsaHMpID09PSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocmhzKSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb21tb24gU3ltYmxlIGZvciBmcmFtZXdvcmsuXG4gKiBAamEg44OV44Os44O844Og44Ov44O844Kv44GM5YWx6YCa44Gn5L2/55So44GZ44KLIFN5bWJsZVxuICovXG5leHBvcnQgY29uc3QgJGNkcCA9IFN5bWJvbCgnQGNkcCcpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvYmFuLXR5cGVzXG4gKi9cblxuaW1wb3J0IHtcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgVHlwZUtleXMsXG4gICAgaXNBcnJheSxcbiAgICBleGlzdHMsXG4gICAgY2xhc3NOYW1lLFxufSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBAZW4gVHlwZSB2ZXJpZmllciBpbnRlcmZhY2UgZGVmaW5pdGlvbi4gPGJyPlxuICogICAgIElmIGludmFsaWQgdmFsdWUgcmVjZWl2ZWQsIHRoZSBtZXRob2QgdGhyb3dzIGBUeXBlRXJyb3JgLlxuICogQGphIOWei+aknOiovOOBruOCpOODs+OCv+ODvOODleOCp+OCpOOCueWumue+qSA8YnI+XG4gKiAgICAg6YGV5Y+N44GX44Gf5aC05ZCI44GvIGBUeXBlRXJyb3JgIOOCkueZuueUn1xuICpcbiAqXG4gKi9cbmludGVyZmFjZSBWZXJpZmllciB7XG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGlzIG5vdCBbW05pbF1dLlxuICAgICAqIEBqYSBbW05pbF1dIOOBp+OBquOBhOOBk+OBqOOCkuaknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIG5vdE5pbC54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBub3ROaWwubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIG5vdE5pbDogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaXMgW1tUeXBlS2V5c11dLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ8gW1tUeXBlS2V5c11dIOOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVPZi50eXBlXG4gICAgICogIC0gYGVuYCBvbmUgb2YgW1tUeXBlS2V5c11dXG4gICAgICogIC0gYGphYCBbW1R5cGVLZXlzXV0g44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHR5cGVPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSB0eXBlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIHR5cGVPZjogKHR5cGU6IFR5cGVLZXlzLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGlzIGBBcnJheWAuXG4gICAgICogQGphIGBBcnJheWAg44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXkueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gYXJyYXkubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGFycmF5OiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCB2YWx1ZSBpcyBgSXRlcmFibGVgLlxuICAgICAqIEBqYSBgSXRlcmFibGVgIOOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGl0ZXJhYmxlLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGl0ZXJhYmxlLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBpdGVyYWJsZTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaW5zdGFuY2UgaXMgZXF1YWwgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbnN0YW5jZU9mLmN0b3JcbiAgICAgKiAgLSBgZW5gIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5q+U6LyD5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIGluc3RhbmNlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaW5zdGFuY2VPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGluc3RhbmNlIGhhcyBgc3RyaWN0bHlgIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44Kz44Oz44K544OI44Op44Kv44K/44Gu5Y6z5a+G5LiA6Ie044GX44Gf44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3duSW5zdGFuY2VPZi5jdG9yXG4gICAgICogIC0gYGVuYCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOavlOi8g+WvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICAgICAqIEBwYXJhbSBvd25JbnN0YW5jZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIG93bkluc3RhbmNlT2YubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIG93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpbnN0YW5jZSBoYXMgbm90IGBzdHJpY3RseWAgZXF1YWwgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jgpLmjIHjgaTjgqTjg7Pjgrnjgr/jg7PjgrnjgafjgarjgYTjgZPjgajjgpLmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub3RPd25JbnN0YW5jZU9mLmN0b3JcbiAgICAgKiAgLSBgZW5gIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5q+U6LyD5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIG5vdE93bkluc3RhbmNlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gbm90T3duSW5zdGFuY2VPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgbm90T3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGhhcyBzcGVjaWZpZWQgcHJvcGVydHkuXG4gICAgICogQGphIOaMh+WumuODl+ODreODkeODhuOCo+OCkuaMgeOBo+OBpuOBhOOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGhhc1Byb3BlcnR5LnByb3BcbiAgICAgKiAgLSBgZW5gIHNwZWNpZmllZCBwcm9wZXJ0eVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44OX44Ot44OR44OG44KjXG4gICAgICogQHBhcmFtIGhhc1Byb3BlcnR5LnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGhhc1Byb3BlcnR5Lm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBoYXNQcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGhhcyBvd24gc3BlY2lmaWVkIHByb3BlcnR5LlxuICAgICAqIEBqYSDmjIflrprjg5fjg63jg5Hjg4bjgqPjgpLlhaXlipvlgKToh6rouqvmjIHjgaPjgabjgYTjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS5wcm9wXG4gICAgICogIC0gYGVuYCBzcGVjaWZpZWQgcHJvcGVydHlcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODl+ODreODkeODhuOCo1xuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBoYXNPd25Qcm9wZXJ0eS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgaGFzT3duUHJvcGVydHk6ICh4OiB1bmtub3duLCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcbn1cblxuLyoqXG4gKiBAZW4gTGlzdCBvZiBtZXRob2QgZm9yIHR5cGUgdmVyaWZ5LlxuICogQGphIOWei+aknOiovOOBjOaPkOS+m+OBmeOCi+ODoeOCveODg+ODieS4gOimp1xuICovXG5leHBvcnQgdHlwZSBWZXJpZnlNZXRob2QgPSBrZXlvZiBWZXJpZmllcjtcblxuLyoqXG4gKiBAZW4gQ29uY3JldGUgdHlwZSB2ZXJpZmllciBvYmplY3QuXG4gKiBAamEg5Z6L5qSc6Ki85a6f6KOF44Kq44OW44K444Kn44Kv44OIXG4gKlxuICogQGludGVybmFsXG4gKi9cbmNvbnN0IF92ZXJpZmllcjogVmVyaWZpZXIgPSB7XG4gICAgbm90TmlsOiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCA9PSB4KSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhIHZhbGlkIHZhbHVlLmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB0eXBlT2Y6ICh0eXBlOiBUeXBlS2V5cywgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHggIT09IHR5cGUpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUeXBlIG9mICR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgJHt0eXBlfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgYXJyYXk6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICghaXNBcnJheSh4KSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYW4gQXJyYXkuYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGl0ZXJhYmxlOiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAoIShTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KHgpKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYW4gaXRlcmFibGUgb2JqZWN0LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBpbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKCEoeCBpbnN0YW5jZW9mIGN0b3IpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhbiBpbnN0YW5jZSBvZiAke2N0b3IubmFtZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIG93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCA9PSB4IHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSAhPT0gT2JqZWN0KGN0b3IucHJvdG90eXBlKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFRoZSBvYmplY3QgaXMgbm90IG93biBpbnN0YW5jZSBvZiAke2N0b3IubmFtZX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIG5vdE93bkluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCAhPSB4ICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSA9PT0gT2JqZWN0KGN0b3IucHJvdG90eXBlKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFRoZSBvYmplY3QgaXMgb3duIGluc3RhbmNlIG9mICR7Y3Rvci5uYW1lfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaGFzUHJvcGVydHk6ICh4OiB1bmtub3duLCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCA9PSB4IHx8ICEocHJvcCBpbiAoeCBhcyBvYmplY3QpKSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFRoZSBvYmplY3QgZG9lcyBub3QgaGF2ZSBwcm9wZXJ0eSAke1N0cmluZyhwcm9wKX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGhhc093blByb3BlcnR5OiAoeDogdW5rbm93biwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKG51bGwgPT0geCB8fCAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHgsIHByb3ApKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBkb2VzIG5vdCBoYXZlIG93biBwcm9wZXJ0eSAke1N0cmluZyhwcm9wKX0uYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogQGVuIFZlcmlmeSBtZXRob2QuXG4gKiBAamEg5qSc6Ki844Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIG1ldGhvZFxuICogIC0gYGVuYCBtZXRob2QgbmFtZSB3aGljaCB1c2luZ1xuICogIC0gYGphYCDkvb/nlKjjgZnjgovjg6Hjgr3jg4Pjg4nlkI1cbiAqIEBwYXJhbSBhcmdzXG4gKiAgLSBgZW5gIGFyZ3VtZW50cyB3aGljaCBjb3JyZXNwb25kcyB0byB0aGUgbWV0aG9kIG5hbWVcbiAqICAtIGBqYWAg44Oh44K944OD44OJ5ZCN44Gr5a++5b+c44GZ44KL5byV5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2ZXJpZnk8VE1ldGhvZCBleHRlbmRzIFZlcmlmeU1ldGhvZD4obWV0aG9kOiBUTWV0aG9kLCAuLi5hcmdzOiBQYXJhbWV0ZXJzPFZlcmlmaWVyW1RNZXRob2RdPik6IHZvaWQgfCBuZXZlciB7XG4gICAgKF92ZXJpZmllclttZXRob2RdIGFzIFVua25vd25GdW5jdGlvbikoLi4uYXJncyk7XG59XG5cbmV4cG9ydCB7IHZlcmlmeSBhcyBkZWZhdWx0IH07XG4iLCJpbXBvcnQge1xuICAgIFR5cGVkQXJyYXksXG4gICAgVHlwZWRBcnJheUNvbnN0cnVjdG9yLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNBcnJheSxcbiAgICBpc09iamVjdCxcbiAgICBpc0l0ZXJhYmxlLFxuICAgIGlzVHlwZWRBcnJheSxcbiAgICBzYW1lQ2xhc3MsXG59IGZyb20gJy4vdHlwZXMnO1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgZGVlcEVxdWFsKCkgKi9cbmZ1bmN0aW9uIGFycmF5RXF1YWwobGhzOiB1bmtub3duW10sIHJoczogdW5rbm93bltdKTogYm9vbGVhbiB7XG4gICAgY29uc3QgbGVuID0gbGhzLmxlbmd0aDtcbiAgICBpZiAobGVuICE9PSByaHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoIWRlZXBFcXVhbChsaHNbaV0sIHJoc1tpXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGRlZXBFcXVhbCgpICovXG5mdW5jdGlvbiBidWZmZXJFcXVhbChsaHM6IFNoYXJlZEFycmF5QnVmZmVyIHwgQXJyYXlCdWZmZXIsIHJoczogU2hhcmVkQXJyYXlCdWZmZXIgfCBBcnJheUJ1ZmZlcik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHNpemUgPSBsaHMuYnl0ZUxlbmd0aDtcbiAgICBpZiAoc2l6ZSAhPT0gcmhzLmJ5dGVMZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBsZXQgcG9zID0gMDtcbiAgICBpZiAoc2l6ZSAtIHBvcyA+PSA4KSB7XG4gICAgICAgIGNvbnN0IGxlbiA9IHNpemUgPj4+IDM7XG4gICAgICAgIGNvbnN0IGY2NEwgPSBuZXcgRmxvYXQ2NEFycmF5KGxocywgMCwgbGVuKTtcbiAgICAgICAgY29uc3QgZjY0UiA9IG5ldyBGbG9hdDY0QXJyYXkocmhzLCAwLCBsZW4pO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoIU9iamVjdC5pcyhmNjRMW2ldLCBmNjRSW2ldKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBwb3MgPSBsZW4gPDwgMztcbiAgICB9XG4gICAgaWYgKHBvcyA9PT0gc2l6ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY29uc3QgTCA9IG5ldyBEYXRhVmlldyhsaHMpO1xuICAgIGNvbnN0IFIgPSBuZXcgRGF0YVZpZXcocmhzKTtcbiAgICBpZiAoc2l6ZSAtIHBvcyA+PSA0KSB7XG4gICAgICAgIGlmICghT2JqZWN0LmlzKEwuZ2V0VWludDMyKHBvcyksIFIuZ2V0VWludDMyKHBvcykpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcG9zICs9IDQ7XG4gICAgfVxuICAgIGlmIChzaXplIC0gcG9zID49IDIpIHtcbiAgICAgICAgaWYgKCFPYmplY3QuaXMoTC5nZXRVaW50MTYocG9zKSwgUi5nZXRVaW50MTYocG9zKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwb3MgKz0gMjtcbiAgICB9XG4gICAgaWYgKHNpemUgPiBwb3MpIHtcbiAgICAgICAgaWYgKCFPYmplY3QuaXMoTC5nZXRVaW50OChwb3MpLCBSLmdldFVpbnQ4KHBvcykpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcG9zICs9IDE7XG4gICAgfVxuICAgIHJldHVybiBwb3MgPT09IHNpemU7XG59XG5cbi8qKlxuICogQGVuIFBlcmZvcm1zIGEgZGVlcCBjb21wYXJpc29uIGJldHdlZW4gdHdvIHZhbHVlcyB0byBkZXRlcm1pbmUgaWYgdGhleSBhcmUgZXF1aXZhbGVudC5cbiAqIEBqYSAy5YCk44Gu6Kmz57Sw5q+U6LyD44KS44GXLCDnrYnjgZfjgYTjgYvjganjgYbjgYvliKTlrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBFcXVhbChsaHM6IHVua25vd24sIHJoczogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIGlmIChsaHMgPT09IHJocykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGlzRnVuY3Rpb24obGhzKSAmJiBpc0Z1bmN0aW9uKHJocykpIHtcbiAgICAgICAgcmV0dXJuIGxocy5sZW5ndGggPT09IHJocy5sZW5ndGggJiYgbGhzLm5hbWUgPT09IHJocy5uYW1lO1xuICAgIH1cbiAgICBpZiAoIWlzT2JqZWN0KGxocykgfHwgIWlzT2JqZWN0KHJocykpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB7IC8vIFByaW1pdGl2ZSBXcmFwcGVyIE9iamVjdHMgLyBEYXRlXG4gICAgICAgIGNvbnN0IHZhbHVlTCA9IGxocy52YWx1ZU9mKCk7XG4gICAgICAgIGNvbnN0IHZhbHVlUiA9IHJocy52YWx1ZU9mKCk7XG4gICAgICAgIGlmIChsaHMgIT09IHZhbHVlTCB8fCByaHMgIT09IHZhbHVlUikge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlTCA9PT0gdmFsdWVSO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gUmVnRXhwXG4gICAgICAgIGNvbnN0IGlzUmVnRXhwTCA9IGxocyBpbnN0YW5jZW9mIFJlZ0V4cDtcbiAgICAgICAgY29uc3QgaXNSZWdFeHBSID0gcmhzIGluc3RhbmNlb2YgUmVnRXhwO1xuICAgICAgICBpZiAoaXNSZWdFeHBMIHx8IGlzUmVnRXhwUikge1xuICAgICAgICAgICAgcmV0dXJuIGlzUmVnRXhwTCA9PT0gaXNSZWdFeHBSICYmIFN0cmluZyhsaHMpID09PSBTdHJpbmcocmhzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIEFycmF5XG4gICAgICAgIGNvbnN0IGlzQXJyYXlMID0gaXNBcnJheShsaHMpO1xuICAgICAgICBjb25zdCBpc0FycmF5UiA9IGlzQXJyYXkocmhzKTtcbiAgICAgICAgaWYgKGlzQXJyYXlMIHx8IGlzQXJyYXlSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNBcnJheUwgPT09IGlzQXJyYXlSICYmIGFycmF5RXF1YWwobGhzIGFzIHVua25vd25bXSwgcmhzIGFzIHVua25vd25bXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBBcnJheUJ1ZmZlclxuICAgICAgICBjb25zdCBpc0J1ZmZlckwgPSBsaHMgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcjtcbiAgICAgICAgY29uc3QgaXNCdWZmZXJSID0gcmhzIGluc3RhbmNlb2YgQXJyYXlCdWZmZXI7XG4gICAgICAgIGlmIChpc0J1ZmZlckwgfHwgaXNCdWZmZXJSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNCdWZmZXJMID09PSBpc0J1ZmZlclIgJiYgYnVmZmVyRXF1YWwobGhzIGFzIEFycmF5QnVmZmVyLCByaHMgYXMgQXJyYXlCdWZmZXIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gQXJyYXlCdWZmZXJWaWV3XG4gICAgICAgIGNvbnN0IGlzQnVmZmVyVmlld0wgPSBBcnJheUJ1ZmZlci5pc1ZpZXcobGhzKTtcbiAgICAgICAgY29uc3QgaXNCdWZmZXJWaWV3UiA9IEFycmF5QnVmZmVyLmlzVmlldyhyaHMpO1xuICAgICAgICBpZiAoaXNCdWZmZXJWaWV3TCB8fCBpc0J1ZmZlclZpZXdSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNCdWZmZXJWaWV3TCA9PT0gaXNCdWZmZXJWaWV3UiAmJiBzYW1lQ2xhc3MobGhzLCByaHMpXG4gICAgICAgICAgICAgICAgJiYgYnVmZmVyRXF1YWwoKGxocyBhcyBBcnJheUJ1ZmZlclZpZXcpLmJ1ZmZlciwgKHJocyBhcyBBcnJheUJ1ZmZlclZpZXcpLmJ1ZmZlcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBvdGhlciBJdGVyYWJsZVxuICAgICAgICBjb25zdCBpc0l0ZXJhYmxlTCA9IGlzSXRlcmFibGUobGhzKTtcbiAgICAgICAgY29uc3QgaXNJdGVyYWJsZVIgPSBpc0l0ZXJhYmxlKHJocyk7XG4gICAgICAgIGlmIChpc0l0ZXJhYmxlTCB8fCBpc0l0ZXJhYmxlUikge1xuICAgICAgICAgICAgcmV0dXJuIGlzSXRlcmFibGVMID09PSBpc0l0ZXJhYmxlUiAmJiBhcnJheUVxdWFsKFsuLi4obGhzIGFzIHVua25vd25bXSldLCBbLi4uKHJocyBhcyB1bmtub3duW10pXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHNhbWVDbGFzcyhsaHMsIHJocykpIHtcbiAgICAgICAgY29uc3Qga2V5c0wgPSBuZXcgU2V0KE9iamVjdC5rZXlzKGxocykpO1xuICAgICAgICBjb25zdCBrZXlzUiA9IG5ldyBTZXQoT2JqZWN0LmtleXMocmhzKSk7XG4gICAgICAgIGlmIChrZXlzTC5zaXplICE9PSBrZXlzUi5zaXplKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2Yga2V5c0wpIHtcbiAgICAgICAgICAgIGlmICgha2V5c1IuaGFzKGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2Yga2V5c0wpIHtcbiAgICAgICAgICAgIGlmICghZGVlcEVxdWFsKGxoc1trZXldLCByaHNba2V5XSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBsaHMpIHtcbiAgICAgICAgICAgIGlmICghKGtleSBpbiByaHMpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGtleXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gcmhzKSB7XG4gICAgICAgICAgICBpZiAoIShrZXkgaW4gbGhzKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGtleXMuYWRkKGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2Yga2V5cykge1xuICAgICAgICAgICAgaWYgKCFkZWVwRXF1YWwobGhzW2tleV0sIHJoc1trZXldKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgY2xvbmUgUmVnRXhwICovXG5mdW5jdGlvbiBjbG9uZVJlZ0V4cChyZWdleHA6IFJlZ0V4cCk6IFJlZ0V4cCB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IFJlZ0V4cChyZWdleHAuc291cmNlLCByZWdleHAuZmxhZ3MpO1xuICAgIHJlc3VsdC5sYXN0SW5kZXggPSByZWdleHAubGFzdEluZGV4O1xuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgY2xvbmUgQXJyYXlCdWZmZXIgKi9cbmZ1bmN0aW9uIGNsb25lQXJyYXlCdWZmZXIoYXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyKTogQXJyYXlCdWZmZXIge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBBcnJheUJ1ZmZlcihhcnJheUJ1ZmZlci5ieXRlTGVuZ3RoKTtcbiAgICBuZXcgVWludDhBcnJheShyZXN1bHQpLnNldChuZXcgVWludDhBcnJheShhcnJheUJ1ZmZlcikpO1xuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgY2xvbmUgRGF0YVZpZXcgKi9cbmZ1bmN0aW9uIGNsb25lRGF0YVZpZXcoZGF0YVZpZXc6IERhdGFWaWV3KTogRGF0YVZpZXcge1xuICAgIGNvbnN0IGJ1ZmZlciA9IGNsb25lQXJyYXlCdWZmZXIoZGF0YVZpZXcuYnVmZmVyKTtcbiAgICByZXR1cm4gbmV3IERhdGFWaWV3KGJ1ZmZlciwgZGF0YVZpZXcuYnl0ZU9mZnNldCwgZGF0YVZpZXcuYnl0ZUxlbmd0aCk7XG59XG5cbi8qKiBAaW50ZXJuYWwgY2xvbmUgVHlwZWRBcnJheSAqL1xuZnVuY3Rpb24gY2xvbmVUeXBlZEFycmF5PFQgZXh0ZW5kcyBUeXBlZEFycmF5Pih0eXBlZEFycmF5OiBUKTogVCB7XG4gICAgY29uc3QgYnVmZmVyID0gY2xvbmVBcnJheUJ1ZmZlcih0eXBlZEFycmF5LmJ1ZmZlcik7XG4gICAgcmV0dXJuIG5ldyAodHlwZWRBcnJheS5jb25zdHJ1Y3RvciBhcyBUeXBlZEFycmF5Q29uc3RydWN0b3IpKGJ1ZmZlciwgdHlwZWRBcnJheS5ieXRlT2Zmc2V0LCB0eXBlZEFycmF5Lmxlbmd0aCkgYXMgVDtcbn1cblxuLyoqIEBpbnRlcm5hbCBjaGVjayBuZWNlc3NhcnkgdG8gdXBkYXRlICovXG5mdW5jdGlvbiBuZWVkVXBkYXRlKG9sZFZhbHVlOiB1bmtub3duLCBuZXdWYWx1ZTogdW5rbm93biwgZXhjZXB0VW5kZWZpbmVkOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgaWYgKG9sZFZhbHVlICE9PSBuZXdWYWx1ZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKGV4Y2VwdFVuZGVmaW5lZCAmJiB1bmRlZmluZWQgPT09IG9sZFZhbHVlKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgbWVyZ2UgQXJyYXkgKi9cbmZ1bmN0aW9uIG1lcmdlQXJyYXkodGFyZ2V0OiB1bmtub3duW10sIHNvdXJjZTogdW5rbm93bltdKTogdW5rbm93bltdIHtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gc291cmNlLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0W2ldO1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1lcmdlKG9sZFZhbHVlLCBzb3VyY2VbaV0pO1xuICAgICAgICAhbmVlZFVwZGF0ZShvbGRWYWx1ZSwgbmV3VmFsdWUsIGZhbHNlKSB8fCAodGFyZ2V0W2ldID0gbmV3VmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG4vKiogQGludGVybmFsIG1lcmdlIFNldCAqL1xuZnVuY3Rpb24gbWVyZ2VTZXQodGFyZ2V0OiBTZXQ8dW5rbm93bj4sIHNvdXJjZTogU2V0PHVua25vd24+KTogU2V0PHVua25vd24+IHtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygc291cmNlKSB7XG4gICAgICAgIHRhcmdldC5oYXMoaXRlbSkgfHwgdGFyZ2V0LmFkZChtZXJnZSh1bmRlZmluZWQsIGl0ZW0pKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuLyoqIEBpbnRlcm5hbCBtZXJnZSBNYXAgKi9cbmZ1bmN0aW9uIG1lcmdlTWFwKHRhcmdldDogTWFwPHVua25vd24sIHVua25vd24+LCBzb3VyY2U6IE1hcDx1bmtub3duLCB1bmtub3duPik6IE1hcDx1bmtub3duLCB1bmtub3duPiB7XG4gICAgZm9yIChjb25zdCBbaywgdl0gb2Ygc291cmNlKSB7XG4gICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGFyZ2V0LmdldChrKTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBtZXJnZShvbGRWYWx1ZSwgdik7XG4gICAgICAgICFuZWVkVXBkYXRlKG9sZFZhbHVlLCBuZXdWYWx1ZSwgZmFsc2UpIHx8IHRhcmdldC5zZXQoaywgbmV3VmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgZGVlcE1lcmdlKCkgKi9cbmZ1bmN0aW9uIG1lcmdlKHRhcmdldDogdW5rbm93biwgc291cmNlOiB1bmtub3duKTogdW5rbm93biB7XG4gICAgaWYgKHVuZGVmaW5lZCA9PT0gc291cmNlIHx8IHRhcmdldCA9PT0gc291cmNlKSB7XG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuICAgIGlmICghaXNPYmplY3Qoc291cmNlKSkge1xuICAgICAgICByZXR1cm4gc291cmNlO1xuICAgIH1cbiAgICAvLyBQcmltaXRpdmUgV3JhcHBlciBPYmplY3RzIC8gRGF0ZVxuICAgIGlmIChzb3VyY2UudmFsdWVPZigpICE9PSBzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIGRlZXBFcXVhbCh0YXJnZXQsIHNvdXJjZSkgPyB0YXJnZXQgOiBuZXcgKHNvdXJjZS5jb25zdHJ1Y3RvciBhcyBPYmplY3RDb25zdHJ1Y3Rvcikoc291cmNlLnZhbHVlT2YoKSk7XG4gICAgfVxuICAgIC8vIFJlZ0V4cFxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgcmV0dXJuIGRlZXBFcXVhbCh0YXJnZXQsIHNvdXJjZSkgPyB0YXJnZXQgOiBjbG9uZVJlZ0V4cChzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBBcnJheUJ1ZmZlclxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IGNsb25lQXJyYXlCdWZmZXIoc291cmNlKTtcbiAgICB9XG4gICAgLy8gQXJyYXlCdWZmZXJWaWV3XG4gICAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBkZWVwRXF1YWwodGFyZ2V0LCBzb3VyY2UpID8gdGFyZ2V0IDogaXNUeXBlZEFycmF5KHNvdXJjZSkgPyBjbG9uZVR5cGVkQXJyYXkoc291cmNlKSA6IGNsb25lRGF0YVZpZXcoc291cmNlIGFzIERhdGFWaWV3KTtcbiAgICB9XG4gICAgLy8gQXJyYXlcbiAgICBpZiAoQXJyYXkuaXNBcnJheShzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBtZXJnZUFycmF5KGlzQXJyYXkodGFyZ2V0KSA/IHRhcmdldCA6IFtdLCBzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBTZXRcbiAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgU2V0KSB7XG4gICAgICAgIHJldHVybiBtZXJnZVNldCh0YXJnZXQgaW5zdGFuY2VvZiBTZXQgPyB0YXJnZXQgOiBuZXcgU2V0KCksIHNvdXJjZSk7XG4gICAgfVxuICAgIC8vIE1hcFxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgICAgcmV0dXJuIG1lcmdlTWFwKHRhcmdldCBpbnN0YW5jZW9mIE1hcCA/IHRhcmdldCA6IG5ldyBNYXAoKSwgc291cmNlKTtcbiAgICB9XG5cbiAgICBjb25zdCBvYmogPSBpc09iamVjdCh0YXJnZXQpID8gdGFyZ2V0IDoge307XG4gICAgaWYgKHNhbWVDbGFzcyh0YXJnZXQsIHNvdXJjZSkpIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc291cmNlKSkge1xuICAgICAgICAgICAgaWYgKCdfX3Byb3RvX18nICE9PSBrZXkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IG9ialtrZXldO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWVyZ2Uob2xkVmFsdWUsIHNvdXJjZVtrZXldKTtcbiAgICAgICAgICAgICAgICAhbmVlZFVwZGF0ZShvbGRWYWx1ZSwgbmV3VmFsdWUsIHRydWUpIHx8IChvYmpba2V5XSA9IG5ld1ZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgaWYgKCdfX3Byb3RvX18nICE9PSBrZXkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IG9ialtrZXldO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWVyZ2Uob2xkVmFsdWUsIHNvdXJjZVtrZXldKTtcbiAgICAgICAgICAgICAgICAhbmVlZFVwZGF0ZShvbGRWYWx1ZSwgbmV3VmFsdWUsIHRydWUpIHx8IChvYmpba2V5XSA9IG5ld1ZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIEBlbiBSZWN1cnNpdmVseSBtZXJnZXMgb3duIGFuZCBpbmhlcml0ZWQgZW51bWVyYWJsZSBzdHJpbmcga2V5ZWQgcHJvcGVydGllcyBvZiBzb3VyY2Ugb2JqZWN0cyBpbnRvIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu5YaN5biw55qE44Oe44O844K444KS5a6f6KGMXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWVwTWVyZ2U8VCwgUzEsIFMyLCBTMywgUzQsIFM1LCBTNiwgUzcsIFM4LCBTOT4oXG4gICAgdGFyZ2V0OiBULFxuICAgIC4uLnNvdXJjZXM6IFtTMSwgUzI/LCBTMz8sIFM0PywgUzU/LCBTNj8sIFM3PywgUzg/LCBTOT8sIC4uLnVua25vd25bXV1cbik6IFQgJiBTMSAmIFMyICYgUzMgJiBTNCAmIFM1ICYgUzYgJiBTNyAmIFM4ICYgUzk7XG5leHBvcnQgZnVuY3Rpb24gZGVlcE1lcmdlPFg+KHRhcmdldDogdW5rbm93biwgLi4uc291cmNlczogdW5rbm93bltdKTogWDtcbmV4cG9ydCBmdW5jdGlvbiBkZWVwTWVyZ2UodGFyZ2V0OiB1bmtub3duLCAuLi5zb3VyY2VzOiB1bmtub3duW10pOiB1bmtub3duIHtcbiAgICBsZXQgcmVzdWx0ID0gdGFyZ2V0O1xuICAgIGZvciAoY29uc3Qgc291cmNlIG9mIHNvdXJjZXMpIHtcbiAgICAgICAgcmVzdWx0ID0gbWVyZ2UocmVzdWx0LCBzb3VyY2UpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIGRlZXAgY29weSBpbnN0YW5jZSBvZiBzb3VyY2Ugb2JqZWN0LlxuICogQGphIOODh+OCo+ODvOODl+OCs+ODlOODvOOCquODluOCuOOCp+OCr+ODiOOBrueUn+aIkFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVlcENvcHk8VD4oc3JjOiBUKTogVCB7XG4gICAgcmV0dXJuIGRlZXBNZXJnZSh1bmRlZmluZWQsIHNyYyk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBOaWwsXG4gICAgVHlwZSxcbiAgICBDbGFzcyxcbiAgICBDb25zdHJ1Y3Rvcixcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogQGVuIE1peGluIGNsYXNzJ3MgYmFzZSBpbnRlcmZhY2UuXG4gKiBAamEgTWl4aW4g44Kv44Op44K544Gu5Z+65bqV44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pXG4gKi9cbmV4cG9ydCBkZWNsYXJlIGNsYXNzIE1peGluQ2xhc3Mge1xuICAgIC8qKlxuICAgICAqIEBlbiBjYWxsIG1peGluIHNvdXJjZSBjbGFzcydzIGBzdXBlcigpYC4gPGJyPlxuICAgICAqICAgICBUaGlzIG1ldGhvZCBzaG91bGQgYmUgY2FsbGVkIGZyb20gY29uc3RydWN0b3IuXG4gICAgICogQGphIE1peGluIOOCr+ODqeOCueOBruWfuuW6leOCpOODs+OCv+ODvOODleOCp+OCpOOCueWumue+qSA8YnI+XG4gICAgICogICAgIOOCs+ODs+OCueODiOODqeOCr+OCv+OBi+OCieWRvOOBtuOBk+OBqOOCkuaDs+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHNyY0NsYXNzXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gdGFyZ2V0IGNsYXNzIG5hbWUuIGV4KSBmcm9tIFMxIGF2YWlsYWJsZVxuICAgICAqICAtIGBqYWAg44Kz44Oz44K544OI44Op44Kv44OI44GZ44KL44Kv44Op44K55ZCN44KS5oyH5a6aIGV4KSBTMSDjgYvjgonmjIflrprlj6/og71cbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIHBhcmFtZXRlcnNcbiAgICAgKiAgLSBgamFgIOOCs+ODs+OCueODiOODqeOCr+ODiOOBq+S9v+eUqOOBmeOCi+W8leaVsFxuICAgICAqL1xuICAgIHByb3RlY3RlZCBzdXBlcjxUIGV4dGVuZHMgQ2xhc3M+KHNyY0NsYXNzOiBULCAuLi5hcmdzOiBDb25zdHJ1Y3RvclBhcmFtZXRlcnM8VD4pOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBpbnB1dCBjbGFzcyBpcyBtaXhpbmVkIChleGNsdWRpbmcgb3duIGNsYXNzKS5cbiAgICAgKiBAamEg5oyH5a6a44Kv44Op44K544GMIE1peGluIOOBleOCjOOBpuOBhOOCi+OBi+eiuuiqjSAo6Ieq6Lqr44Gu44Kv44Op44K544Gv5ZCr44G+44KM44Gq44GEKVxuICAgICAqXG4gICAgICogQHBhcmFtIG1peGVkQ2xhc3NcbiAgICAgKiAgLSBgZW5gIHNldCB0YXJnZXQgY2xhc3MgY29uc3RydWN0b3JcbiAgICAgKiAgLSBgamFgIOWvvuixoeOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBpc01peGVkV2l0aDxUIGV4dGVuZHMgb2JqZWN0PihtaXhlZENsYXNzOiBDb25zdHJ1Y3RvcjxUPik6IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGVuIE1peGVkIHN1YiBjbGFzcyBjb25zdHJ1Y3RvciBkZWZpbml0aW9ucy5cbiAqIEBqYSDlkIjmiJDjgZfjgZ/jgrXjg5bjgq/jg6njgrnjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/lrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNaXhpbkNvbnN0cnVjdG9yPEIgZXh0ZW5kcyBDbGFzcywgVSBleHRlbmRzIG9iamVjdD4gZXh0ZW5kcyBUeXBlPFU+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gY29uc3RydWN0b3JcbiAgICAgKiBAamEg44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgYmFzZSBjbGFzcyBhcmd1bWVudHNcbiAgICAgKiAgLSBgamFgIOWfuuW6leOCr+ODqeOCueOBq+aMh+WumuOBl+OBn+W8leaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB1bmlvbiB0eXBlIG9mIGNsYXNzZXMgd2hlbiBjYWxsaW5nIFtbbWl4aW5zXV0oKVxuICAgICAqICAtIGBqYWAgW1ttaXhpbnNdXSgpIOOBq+a4oeOBl+OBn+OCr+ODqeOCueOBrumbhuWQiFxuICAgICAqL1xuICAgIG5ldyguLi5hcmdzOiBDb25zdHJ1Y3RvclBhcmFtZXRlcnM8Qj4pOiBVO1xufVxuXG4vKipcbiAqIEBlbiBEZWZpbml0aW9uIG9mIFtbc2V0TWl4Q2xhc3NBdHRyaWJ1dGVdXSBmdW5jdGlvbidzIGFyZ3VtZW50cy5cbiAqIEBqYSBbW3NldE1peENsYXNzQXR0cmlidXRlXV0g44Gu5Y+W44KK44GG44KL5byV5pWw5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWl4Q2xhc3NBdHRyaWJ1dGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBTdXBwcmVzcyBwcm92aWRpbmcgY29uc3RydWN0b3ItdHJhcCBmb3IgdGhlIG1peGluIHNvdXJjZSBjbGFzcy4gSW4gdGhpcyBjYXNlLCBgaXNNaXhlZFdpdGhgLCBgaW5zdGFuY2VvZmAgYWxzbyBiZWNvbWVzIGludmFsaWQuIChmb3IgaW1wcm92aW5nIHBlcmZvcm1hbmNlKVxuICAgICAqIEBqYSBNaXhpbiBTb3VyY2Ug44Kv44Op44K544Gr5a++44GX44GmLCDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jg4jjg6njg4Pjg5fjgpLmipHmraIuIOOBk+OCjOOCkuaMh+WumuOBl+OBn+WgtOWQiCwgYGlzTWl4ZWRXaXRoYCwgYGluc3RhbmNlb2ZgIOOCgueEoeWKueOBq+OBquOCiy4gKOODkeODleOCqeODvOODnuODs+OCueaUueWWhClcbiAgICAgKi9cbiAgICBwcm90b0V4dGVuZHNPbmx5OiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldHVwIFtTeW1ib2wuaGFzSW5zdGFuY2VdIHByb3BlcnR5LiA8YnI+XG4gICAgICogICAgIFRoZSBjbGFzcyBkZXNpZ25hdGVkIGFzIGEgc291cmNlIG9mIFtbbWl4aW5zXV0oKSBoYXMgW1N5bWJvbC5oYXNJbnN0YW5jZV0gcHJvcGVydHkgaW1wbGljaXRseS4gPGJyPlxuICAgICAqICAgICBJdCdzIHVzZWQgdG8gYXZvaWQgYmVjb21pbmcgdGhlIGJlaGF2aW9yIGBpbnN0YW5jZW9mYCBkb2Vzbid0IGludGVuZCB3aGVuIHRoZSBjbGFzcyBpcyBleHRlbmRlZCBmcm9tIHRoZSBtaXhpbmVkIGNsYXNzIHRoZSBvdGhlciBwbGFjZS5cbiAgICAgKiBAamEgW1N5bWJvbC5oYXNJbnN0YW5jZV0g44OX44Ot44OR44OG44Kj6Kit5a6aPGJyPlxuICAgICAqICAgICBbW21peGluc11dKCkg44Gu44K944O844K544Gr5oyH5a6a44GV44KM44Gf44Kv44Op44K544GvIFtTeW1ib2wuaGFzSW5zdGFuY2VdIOOCkuaal+m7meeahOOBq+WCmeOBiOOCi+OBn+OCgTxicj5cbiAgICAgKiAgICAg44Gd44Gu44Kv44Op44K544GM5LuW44Gn57aZ5om/44GV44KM44Gm44GE44KL5aC05ZCIIGBpbnN0YW5jZW9mYCDjgYzmhI/lm7PjgZfjgarjgYTmjK/jgovoiJ7jgYTjgajjgarjgovjga7jgpLpgb/jgZHjgovjgZ/jgoHjgavkvb/nlKjjgZnjgosuXG4gICAgICovXG4gICAgaW5zdGFuY2VPZjogKChpbnN0OiBvYmplY3QpID0+IGJvb2xlYW4pIHwgTmlsO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfb2JqUHJvdG90eXBlICAgICA9IE9iamVjdC5wcm90b3R5cGU7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9pbnN0YW5jZU9mICAgICAgID0gRnVuY3Rpb24ucHJvdG90eXBlW1N5bWJvbC5oYXNJbnN0YW5jZV07XG4vKiogQGludGVybmFsICovIGNvbnN0IF9vdmVycmlkZSAgICAgICAgID0gU3ltYm9sKCdvdmVycmlkZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfaXNJbmhlcml0ZWQgICAgICA9IFN5bWJvbCgnaXMtaW5oZXJpdGVkJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9jb25zdHJ1Y3RvcnMgICAgID0gU3ltYm9sKCdjb25zdHJ1Y3RvcnMnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NsYXNzQmFzZSAgICAgICAgPSBTeW1ib2woJ2NsYXNzLWJhc2UnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NsYXNzU291cmNlcyAgICAgPSBTeW1ib2woJ2NsYXNzLXNvdXJjZXMnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3RvRXh0ZW5kc09ubHkgPSBTeW1ib2woJ3Byb3RvLWV4dGVuZHMtb25seScpO1xuXG4vKiogQGludGVybmFsIGNvcHkgcHJvcGVydGllcyBjb3JlICovXG5mdW5jdGlvbiByZWZsZWN0UHJvcGVydGllcyh0YXJnZXQ6IG9iamVjdCwgc291cmNlOiBvYmplY3QsIGtleTogc3RyaW5nIHwgc3ltYm9sKTogdm9pZCB7XG4gICAgaWYgKG51bGwgPT0gdGFyZ2V0W2tleV0pIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNvdXJjZSwga2V5KSBhcyBQcm9wZXJ0eURlY29yYXRvcik7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIG9iamVjdCBwcm9wZXJ0aWVzIGNvcHkgbWV0aG9kICovXG5mdW5jdGlvbiBjb3B5UHJvcGVydGllcyh0YXJnZXQ6IG9iamVjdCwgc291cmNlOiBvYmplY3QpOiB2b2lkIHtcbiAgICBzb3VyY2UgJiYgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoc291cmNlKVxuICAgICAgICAuZmlsdGVyKGtleSA9PiAhLyhwcm90b3R5cGV8bmFtZXxjb25zdHJ1Y3RvcikvLnRlc3Qoa2V5KSlcbiAgICAgICAgLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIHJlZmxlY3RQcm9wZXJ0aWVzKHRhcmdldCwgc291cmNlLCBrZXkpO1xuICAgICAgICB9KTtcbiAgICBzb3VyY2UgJiYgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzb3VyY2UpXG4gICAgICAgIC5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICByZWZsZWN0UHJvcGVydGllcyh0YXJnZXQsIHNvdXJjZSwga2V5KTtcbiAgICAgICAgfSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzZXRNaXhDbGFzc0F0dHJpYnV0ZSh0YXJnZXQsICdpbnN0YW5jZU9mJykgKi9cbmZ1bmN0aW9uIHNldEluc3RhbmNlT2Y8VCBleHRlbmRzIG9iamVjdD4odGFyZ2V0OiBDb25zdHJ1Y3RvcjxUPiwgbWV0aG9kOiAoKGluc3Q6IG9iamVjdCkgPT4gYm9vbGVhbikgfCBOaWwpOiB2b2lkIHtcbiAgICBjb25zdCBiZWhhdmlvdXIgPSBtZXRob2QgfHwgKG51bGwgPT09IG1ldGhvZCA/IHVuZGVmaW5lZCA6ICgoaTogb2JqZWN0KSA9PiBPYmplY3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YuY2FsbCh0YXJnZXQucHJvdG90eXBlLCBpKSkpO1xuICAgIGNvbnN0IGFwcGxpZWQgPSBiZWhhdmlvdXIgJiYgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIF9vdmVycmlkZSk7XG4gICAgaWYgKCFhcHBsaWVkKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwge1xuICAgICAgICAgICAgW1N5bWJvbC5oYXNJbnN0YW5jZV06IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogYmVoYXZpb3VyLFxuICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFtfb3ZlcnJpZGVdOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGJlaGF2aW91ciA/IHRydWUgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIFNldCB0aGUgTWl4aW4gY2xhc3MgYXR0cmlidXRlLlxuICogQGphIE1peGluIOOCr+ODqeOCueOBq+WvvuOBl+OBpuWxnuaAp+OCkuioreWumlxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogLy8gJ3Byb3RvRXh0ZW5kT25seSdcbiAqIGNsYXNzIEJhc2UgeyBjb25zdHJ1Y3RvcihhLCBiKSB7fSB9O1xuICogY2xhc3MgTWl4QSB7IH07XG4gKiBzZXRNaXhDbGFzc0F0dHJpYnV0ZShNaXhBLCAncHJvdG9FeHRlbmRzT25seScpOyAgLy8gZm9yIGltcHJvdmluZyBjb25zdHJ1Y3Rpb24gcGVyZm9ybWFuY2VcbiAqIGNsYXNzIE1peEIgeyBjb25zdHJ1Y3RvcihjLCBkKSB7fSB9O1xuICpcbiAqIGNsYXNzIE1peGluQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoQmFzZSwgTWl4QSwgTWl4Qikge1xuICogICAgIGNvbnN0cnVjdG9yKGEsIGIsIGMsIGQpe1xuICogICAgICAgICAvLyBjYWxsaW5nIGBCYXNlYCBjb25zdHJ1Y3RvclxuICogICAgICAgICBzdXBlcihhLCBiKTtcbiAqXG4gKiAgICAgICAgIC8vIGNhbGxpbmcgTWl4aW4gY2xhc3MncyBjb25zdHJ1Y3RvclxuICogICAgICAgICB0aGlzLnN1cGVyKE1peEEpOyAgICAgICAgLy8gbm8gYWZmZWN0XG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QiwgYywgZCk7XG4gKiAgICAgfVxuICogfVxuICpcbiAqIGNvbnN0IG1peGVkID0gbmV3IE1peGluQ2xhc3MoKTtcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgTWl4QSk7ICAgIC8vIGZhbHNlXG4gKiBjb25zb2xlLmxvZyhtaXhlZC5pc01peGVkV2l0aChNaXhBKSk7ICAvLyBmYWxzZVxuICpcbiAqIC8vICdpbnN0YW5jZU9mJ1xuICogY2xhc3MgQmFzZSB7fTtcbiAqIGNsYXNzIFNvdXJjZSB7fTtcbiAqIGNsYXNzIE1peGluQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoQmFzZSwgU291cmNlKSB7fTtcbiAqXG4gKiBjbGFzcyBPdGhlciBleHRlbmRzIFNvdXJjZSB7fTtcbiAqXG4gKiBjb25zdCBvdGhlciA9IG5ldyBPdGhlcigpO1xuICogY29uc3QgbWl4ZWQgPSBuZXcgTWl4aW5DbGFzcygpO1xuICogY29uc29sZS5sb2cob3RoZXIgaW5zdGFuY2VvZiBTb3VyY2UpOyAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cob3RoZXIgaW5zdGFuY2VvZiBPdGhlcik7ICAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBNaXhpbkNsYXNzKTsgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBCYXNlKTsgICAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBTb3VyY2UpOyAgICAgICAgLy8gdHJ1ZVxuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBPdGhlcik7ICAgICAgICAgLy8gdHJ1ZSA/Pz9cbiAqXG4gKiBzZXRNaXhDbGFzc0F0dHJpYnV0ZShPdGhlciwgJ2luc3RhbmNlT2YnKTsgLy8gb3Igc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoT3RoZXIsICdpbnN0YW5jZU9mJywgbnVsbCk7XG4gKiBjb25zb2xlLmxvZyhvdGhlciBpbnN0YW5jZW9mIFNvdXJjZSk7ICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhvdGhlciBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyBmYWxzZSAhXG4gKlxuICogLy8gW0Jlc3QgUHJhY3RpY2VdIElmIHlvdSBkZWNsYXJlIHRoZSBkZXJpdmVkLWNsYXNzIGZyb20gbWl4aW4sIHlvdSBzaG91bGQgY2FsbCB0aGUgZnVuY3Rpb24gZm9yIGF2b2lkaW5nIGBpbnN0YW5jZW9mYCBsaW1pdGF0aW9uLlxuICogY2xhc3MgRGVyaXZlZENsYXNzIGV4dGVuZHMgTWl4aW5DbGFzcyB7fVxuICogc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRGVyaXZlZENsYXNzLCAnaW5zdGFuY2VPZicpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBzZXQgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gKiAgLSBgamFgIOioreWumuWvvuixoeOBruOCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHBhcmFtIGF0dHJcbiAqICAtIGBlbmA6XG4gKiAgICAtIGBwcm90b0V4dGVuZHNPbmx5YDogU3VwcHJlc3MgcHJvdmlkaW5nIGNvbnN0cnVjdG9yLXRyYXAgZm9yIHRoZSBtaXhpbiBzb3VyY2UgY2xhc3MuIChmb3IgaW1wcm92aW5nIHBlcmZvcm1hbmNlKVxuICogICAgLSBgaW5zdGFuY2VPZmAgICAgICA6IGZ1bmN0aW9uIGJ5IHVzaW5nIFtTeW1ib2wuaGFzSW5zdGFuY2VdIDxicj5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBEZWZhdWx0IGJlaGF2aW91ciBpcyBgeyByZXR1cm4gdGFyZ2V0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGluc3RhbmNlKSB9YFxuICogICAgICAgICAgICAgICAgICAgICAgICAgIElmIHNldCBgbnVsbGAsIGRlbGV0ZSBbU3ltYm9sLmhhc0luc3RhbmNlXSBwcm9wZXJ0eS5cbiAqICAtIGBqYWA6XG4gKiAgICAtIGBwcm90b0V4dGVuZHNPbmx5YDogTWl4aW4gU291cmNlIOOCr+ODqeOCueOBq+WvvuOBl+OBpiwg44Kz44Oz44K544OI44Op44Kv44K/44OI44Op44OD44OX44KS5oqR5q2iICjjg5Hjg5Xjgqnjg7zjg57jg7PjgrnmlLnlloQpXG4gKiAgICAtIGBpbnN0YW5jZU9mYCAgICAgIDogW1N5bWJvbC5oYXNJbnN0YW5jZV0g44GM5L2/55So44GZ44KL6Zai5pWw44KS5oyH5a6aIDxicj5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICDml6Llrprjgafjga8gYHsgcmV0dXJuIHRhcmdldC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnN0YW5jZSkgfWAg44GM5L2/55So44GV44KM44KLXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICBgbnVsbGAg5oyH5a6a44KS44GZ44KL44GoIFtTeW1ib2wuaGFzSW5zdGFuY2VdIOODl+ODreODkeODhuOCo+OCkuWJiumZpOOBmeOCi1xuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0TWl4Q2xhc3NBdHRyaWJ1dGU8VCBleHRlbmRzIG9iamVjdCwgVSBleHRlbmRzIGtleW9mIE1peENsYXNzQXR0cmlidXRlPihcbiAgICB0YXJnZXQ6IENvbnN0cnVjdG9yPFQ+LFxuICAgIGF0dHI6IFUsXG4gICAgbWV0aG9kPzogTWl4Q2xhc3NBdHRyaWJ1dGVbVV1cbik6IHZvaWQge1xuICAgIHN3aXRjaCAoYXR0cikge1xuICAgICAgICBjYXNlICdwcm90b0V4dGVuZHNPbmx5JzpcbiAgICAgICAgICAgIHRhcmdldFtfcHJvdG9FeHRlbmRzT25seV0gPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2luc3RhbmNlT2YnOlxuICAgICAgICAgICAgc2V0SW5zdGFuY2VPZih0YXJnZXQsIG1ldGhvZCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gTWl4aW4gZnVuY3Rpb24gZm9yIG11bHRpcGxlIGluaGVyaXRhbmNlLiA8YnI+XG4gKiAgICAgUmVzb2x2aW5nIHR5cGUgc3VwcG9ydCBmb3IgbWF4aW11bSAxMCBjbGFzc2VzLlxuICogQGphIOWkmumHjee2meaJv+OBruOBn+OCgeOBriBNaXhpbiA8YnI+XG4gKiAgICAg5pyA5aSnIDEwIOOCr+ODqeOCueOBruWei+ino+axuuOCkuOCteODneODvOODiFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2xhc3MgQmFzZSB7IGNvbnN0cnVjdG9yKGEsIGIpIHt9IH07XG4gKiBjbGFzcyBNaXhBIHsgY29uc3RydWN0b3IoYSwgYikge30gfTtcbiAqIGNsYXNzIE1peEIgeyBjb25zdHJ1Y3RvcihjLCBkKSB7fSB9O1xuICpcbiAqIGNsYXNzIE1peGluQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoQmFzZSwgTWl4QSwgTWl4Qikge1xuICogICAgIGNvbnN0cnVjdG9yKGEsIGIsIGMsIGQpe1xuICogICAgICAgICAvLyBjYWxsaW5nIGBCYXNlYCBjb25zdHJ1Y3RvclxuICogICAgICAgICBzdXBlcihhLCBiKTtcbiAqXG4gKiAgICAgICAgIC8vIGNhbGxpbmcgTWl4aW4gY2xhc3MncyBjb25zdHJ1Y3RvclxuICogICAgICAgICB0aGlzLnN1cGVyKE1peEEsIGEsIGIpO1xuICogICAgICAgICB0aGlzLnN1cGVyKE1peEIsIGMsIGQpO1xuICogICAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBiYXNlXG4gKiAgLSBgZW5gIHByaW1hcnkgYmFzZSBjbGFzcy4gc3VwZXIoYXJncykgaXMgdGhpcyBjbGFzcydzIG9uZS5cbiAqICAtIGBqYWAg5Z+65bqV44Kv44Op44K544Kz44Oz44K544OI44Op44Kv44K/LiDlkIzlkI3jg5fjg63jg5Hjg4bjgqMsIOODoeOCveODg+ODieOBr+acgOWEquWFiOOBleOCjOOCiy4gc3VwZXIoYXJncykg44Gv44GT44Gu44Kv44Op44K544Gu44KC44Gu44GM5oyH5a6a5Y+v6IO9LlxuICogQHBhcmFtIHNvdXJjZXNcbiAqICAtIGBlbmAgbXVsdGlwbGUgZXh0ZW5kcyBjbGFzc1xuICogIC0gYGphYCDmi6HlvLXjgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIG1peGluZWQgY2xhc3MgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg5ZCI5oiQ44GV44KM44Gf44Kv44Op44K544Kz44Oz44K544OI44Op44Kv44K/XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtaXhpbnM8XG4gICAgQiBleHRlbmRzIENsYXNzLFxuICAgIFMxIGV4dGVuZHMgb2JqZWN0LFxuICAgIFMyIGV4dGVuZHMgb2JqZWN0LFxuICAgIFMzIGV4dGVuZHMgb2JqZWN0LFxuICAgIFM0IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM1IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM2IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM3IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM4IGV4dGVuZHMgb2JqZWN0LFxuICAgIFM5IGV4dGVuZHMgb2JqZWN0PihcbiAgICBiYXNlOiBCLFxuICAgIC4uLnNvdXJjZXM6IFtcbiAgICAgICAgQ29uc3RydWN0b3I8UzE+LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTMj4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTMz4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTND4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNT4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNj4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTNz4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTOD4/LFxuICAgICAgICBDb25zdHJ1Y3RvcjxTOT4/LFxuICAgICAgICAuLi5hbnlbXVxuICAgIF0pOiBNaXhpbkNvbnN0cnVjdG9yPEIsIE1peGluQ2xhc3MgJiBJbnN0YW5jZVR5cGU8Qj4gJiBTMSAmIFMyICYgUzMgJiBTNCAmIFM1ICYgUzYgJiBTNyAmIFM4ICYgUzk+IHtcblxuICAgIGxldCBfaGFzU291cmNlQ29uc3RydWN0b3IgPSBmYWxzZTtcblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbmFtaW5nLWNvbnZlbnRpb25cbiAgICBjbGFzcyBfTWl4aW5CYXNlIGV4dGVuZHMgKGJhc2UgYXMgdW5rbm93biBhcyBDb25zdHJ1Y3RvcjxNaXhpbkNsYXNzPikge1xuXG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgW19jb25zdHJ1Y3RvcnNdOiBNYXA8Q29uc3RydWN0b3I8b2JqZWN0PiwgVW5rbm93bkZ1bmN0aW9uIHwgbnVsbD47XG4gICAgICAgIHByaXZhdGUgcmVhZG9ubHkgW19jbGFzc0Jhc2VdOiBDb25zdHJ1Y3RvcjxvYmplY3Q+O1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKC4uLmFyZ3M6IHVua25vd25bXSkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGNvbnN0cnVjdG9yLXN1cGVyXG4gICAgICAgICAgICBzdXBlciguLi5hcmdzKTtcblxuICAgICAgICAgICAgY29uc3QgY29uc3RydWN0b3JzID0gbmV3IE1hcDxDb25zdHJ1Y3RvcjxvYmplY3Q+LCBVbmtub3duRnVuY3Rpb24+KCk7XG4gICAgICAgICAgICB0aGlzW19jb25zdHJ1Y3RvcnNdID0gY29uc3RydWN0b3JzO1xuICAgICAgICAgICAgdGhpc1tfY2xhc3NCYXNlXSA9IGJhc2U7XG5cbiAgICAgICAgICAgIGlmIChfaGFzU291cmNlQ29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNyY0NsYXNzIG9mIHNvdXJjZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzcmNDbGFzc1tfcHJvdG9FeHRlbmRzT25seV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhbmRsZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwbHk6ICh0YXJnZXQ6IHVua25vd24sIHRoaXNvYmo6IHVua25vd24sIGFyZ2xpc3Q6IHVua25vd25bXSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvYmogPSBuZXcgc3JjQ2xhc3MoLi4uYXJnbGlzdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcHlQcm9wZXJ0aWVzKHRoaXMsIG9iaik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHByb3h5IGZvciAnY29uc3RydWN0JyBhbmQgY2FjaGUgY29uc3RydWN0b3JcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9ycy5zZXQoc3JjQ2xhc3MsIG5ldyBQcm94eShzcmNDbGFzcywgaGFuZGxlciBhcyBQcm94eUhhbmRsZXI8b2JqZWN0PikpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcHJvdGVjdGVkIHN1cGVyPFQgZXh0ZW5kcyBDbGFzcz4oc3JjQ2xhc3M6IFQsIC4uLmFyZ3M6IENvbnN0cnVjdG9yUGFyYW1ldGVyczxUPik6IHRoaXMge1xuICAgICAgICAgICAgY29uc3QgbWFwID0gdGhpc1tfY29uc3RydWN0b3JzXTtcbiAgICAgICAgICAgIGNvbnN0IGN0b3IgPSBtYXAuZ2V0KHNyY0NsYXNzKTtcbiAgICAgICAgICAgIGlmIChjdG9yKSB7XG4gICAgICAgICAgICAgICAgY3Rvci5jYWxsKHRoaXMsIC4uLmFyZ3MpO1xuICAgICAgICAgICAgICAgIG1hcC5zZXQoc3JjQ2xhc3MsIG51bGwpOyAgICAvLyBwcmV2ZW50IGNhbGxpbmcgdHdpY2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIGlzTWl4ZWRXaXRoPFQgZXh0ZW5kcyBvYmplY3Q+KHNyY0NsYXNzOiBDb25zdHJ1Y3RvcjxUPik6IGJvb2xlYW4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uc3RydWN0b3IgPT09IHNyY0NsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzW19jbGFzc0Jhc2VdID09PSBzcmNDbGFzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1tfY2xhc3NTb3VyY2VzXS5yZWR1Y2UoKHAsIGMpID0+IHAgfHwgKHNyY0NsYXNzID09PSBjKSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcHVibGljIHN0YXRpYyBbU3ltYm9sLmhhc0luc3RhbmNlXShpbnN0YW5jZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZi5jYWxsKF9NaXhpbkJhc2UucHJvdG90eXBlLCBpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgW19pc0luaGVyaXRlZF08VCBleHRlbmRzIG9iamVjdD4oc3JjQ2xhc3M6IENvbnN0cnVjdG9yPFQ+KTogYm9vbGVhbiB7XG4gICAgICAgICAgICBjb25zdCBjdG9ycyA9IHRoaXNbX2NvbnN0cnVjdG9yc107XG4gICAgICAgICAgICBpZiAoY3RvcnMuaGFzKHNyY0NsYXNzKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCBjdG9yIG9mIGN0b3JzLmtleXMoKSkge1xuICAgICAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YuY2FsbChzcmNDbGFzcywgY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJpdmF0ZSBnZXQgW19jbGFzc1NvdXJjZXNdKCk6IENvbnN0cnVjdG9yPG9iamVjdD5bXSB7XG4gICAgICAgICAgICByZXR1cm4gWy4uLnRoaXNbX2NvbnN0cnVjdG9yc10ua2V5cygpXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoY29uc3Qgc3JjQ2xhc3Mgb2Ygc291cmNlcykge1xuICAgICAgICAvLyBwcm92aWRlIGN1c3RvbSBpbnN0YW5jZW9mXG4gICAgICAgIGNvbnN0IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNyY0NsYXNzLCBTeW1ib2wuaGFzSW5zdGFuY2UpO1xuICAgICAgICBpZiAoIWRlc2MgfHwgZGVzYy53cml0YWJsZSkge1xuICAgICAgICAgICAgY29uc3Qgb3JnSW5zdGFuY2VPZiA9IGRlc2MgPyBzcmNDbGFzc1tTeW1ib2wuaGFzSW5zdGFuY2VdIDogX2luc3RhbmNlT2Y7XG4gICAgICAgICAgICBzZXRJbnN0YW5jZU9mKHNyY0NsYXNzLCAoaW5zdDogb2JqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yZ0luc3RhbmNlT2YuY2FsbChzcmNDbGFzcywgaW5zdCkgfHwgKChudWxsICE9IGluc3QgJiYgaW5zdFtfaXNJbmhlcml0ZWRdKSA/IGluc3RbX2lzSW5oZXJpdGVkXShzcmNDbGFzcykgOiBmYWxzZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBwcm92aWRlIHByb3RvdHlwZVxuICAgICAgICBjb3B5UHJvcGVydGllcyhfTWl4aW5CYXNlLnByb3RvdHlwZSwgc3JjQ2xhc3MucHJvdG90eXBlKTtcbiAgICAgICAgbGV0IHBhcmVudCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihzcmNDbGFzcy5wcm90b3R5cGUpO1xuICAgICAgICB3aGlsZSAoX29ialByb3RvdHlwZSAhPT0gcGFyZW50KSB7XG4gICAgICAgICAgICBjb3B5UHJvcGVydGllcyhfTWl4aW5CYXNlLnByb3RvdHlwZSwgcGFyZW50KTtcbiAgICAgICAgICAgIHBhcmVudCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihwYXJlbnQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNoZWNrIGNvbnN0cnVjdG9yXG4gICAgICAgIGlmICghX2hhc1NvdXJjZUNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICBfaGFzU291cmNlQ29uc3RydWN0b3IgPSAhc3JjQ2xhc3NbX3Byb3RvRXh0ZW5kc09ubHldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIF9NaXhpbkJhc2UgYXMgYW55O1xufVxuIiwiaW1wb3J0IHsgZGVlcEVxdWFsIH0gZnJvbSAnLi9kZWVwLWNpcmN1aXQnO1xuaW1wb3J0IHtcbiAgICBOaWwsXG4gICAgV3JpdGFibGUsXG4gICAgaXNBcnJheSxcbiAgICBpc09iamVjdCxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGNsYXNzTmFtZSxcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogQGVuIENoZWNrIHdoZXRoZXIgaW5wdXQgc291cmNlIGhhcyBhIHByb3BlcnR5LlxuICogQGphIOWFpeWKm+WFg+OBjOODl+ODreODkeODhuOCo+OCkuaMgeOBo+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzcmNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhcyhzcmM6IHVua25vd24sIHByb3BOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gbnVsbCAhPSBzcmMgJiYgaXNPYmplY3Qoc3JjKSAmJiAocHJvcE5hbWUgaW4gc3JjKTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHNoYWxsb3cgY29weSBvZiBgdGFyZ2V0YCB3aGljaCBoYXMgb25seSBgcGlja0tleXNgLlxuICogQGphIGBwaWNrS2V5c2Ag44Gn5oyH5a6a44GV44KM44Gf44OX44Ot44OR44OG44Kj44Gu44G/44KS5oyB44GkIGB0YXJnZXRgIOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBjb3B5IHNvdXJjZSBvYmplY3RcbiAqICAtIGBqYWAg44Kz44OU44O85YWD44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gcGlja0tleXNcbiAqICAtIGBlbmAgY29weSB0YXJnZXQga2V5c1xuICogIC0gYGphYCDjgrPjg5Tjg7zlr77osaHjga7jgq3jg7zkuIDopqdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBpY2s8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIGtleW9mIFQ+KHRhcmdldDogVCwgLi4ucGlja0tleXM6IEtbXSk6IFdyaXRhYmxlPFBpY2s8VCwgSz4+IHtcbiAgICBpZiAoIXRhcmdldCB8fCAhaXNPYmplY3QodGFyZ2V0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGAke2NsYXNzTmFtZSh0YXJnZXQpfSBpcyBub3QgYW4gb2JqZWN0LmApO1xuICAgIH1cbiAgICByZXR1cm4gcGlja0tleXMucmVkdWNlKChvYmosIGtleSkgPT4ge1xuICAgICAgICBrZXkgaW4gdGFyZ2V0ICYmIChvYmpba2V5XSA9IHRhcmdldFtrZXldKTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9LCB7fSBhcyBXcml0YWJsZTxQaWNrPFQsIEs+Pik7XG59XG5cbi8qKlxuICogQGVuIEdldCBzaGFsbG93IGNvcHkgb2YgYHRhcmdldGAgd2l0aG91dCBgb21pdEtleXNgLlxuICogQGphIGBvbWl0S2V5c2Ag44Gn5oyH5a6a44GV44KM44Gf44OX44Ot44OR44OG44Kj5Lul5aSW44Gu44Kt44O844KS5oyB44GkIGB0YXJnZXRgIOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBjb3B5IHNvdXJjZSBvYmplY3RcbiAqICAtIGBqYWAg44Kz44OU44O85YWD44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gb21pdEtleXNcbiAqICAtIGBlbmAgb21pdCB0YXJnZXQga2V5c1xuICogIC0gYGphYCDliYrpmaTlr77osaHjga7jgq3jg7zkuIDopqdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9taXQ8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIGtleW9mIFQ+KHRhcmdldDogVCwgLi4ub21pdEtleXM6IEtbXSk6IFdyaXRhYmxlPE9taXQ8VCwgSz4+IHtcbiAgICBpZiAoIXRhcmdldCB8fCAhaXNPYmplY3QodGFyZ2V0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGAke2NsYXNzTmFtZSh0YXJnZXQpfSBpcyBub3QgYW4gb2JqZWN0LmApO1xuICAgIH1cbiAgICBjb25zdCBvYmogPSB7fSBhcyBXcml0YWJsZTxPbWl0PFQsIEs+PjtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0YXJnZXQpKSB7XG4gICAgICAgICFvbWl0S2V5cy5pbmNsdWRlcyhrZXkgYXMgSykgJiYgKG9ialtrZXldID0gdGFyZ2V0W2tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIEBlbiBJbnZlcnQgdGhlIGtleXMgYW5kIHZhbHVlcyBvZiBhbiBvYmplY3QuIFRoZSB2YWx1ZXMgbXVzdCBiZSBzZXJpYWxpemFibGUuXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu44Kt44O844Go5YCk44KS6YCG6Lui44GZ44KLLiDjgZnjgbnjgabjga7lgKTjgYzjg6bjg4vjg7zjgq/jgafjgYLjgovjgZPjgajjgYzliY3mj5BcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBvYmplY3RcbiAqICAtIGBqYWAg5a++6LGh44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnZlcnQ8VCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4odGFyZ2V0OiBvYmplY3QpOiBUIHtcbiAgICBjb25zdCByZXN1bHQgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0YXJnZXQpKSB7XG4gICAgICAgIHJlc3VsdFt0YXJnZXRba2V5XV0gPSBrZXk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQgYXMgVDtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHNoYWxsb3cgY29weSBvZiBkaWZmZXJlbmNlIGJldHdlZW4gYGJhc2VgIGFuZCBgc3JjYC5cbiAqIEBqYSBgYmFzZWAg44GoIGBzcmNgIOOBruW3ruWIhuODl+ODreODkeODhuOCo+OCkuOCguOBpOOCquODluOCuOOCp+OCr+ODiOOBriBTaGFsbG93IENvcHkg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGJhc2VcbiAqICAtIGBlbmAgYmFzZSBvYmplY3RcbiAqICAtIGBqYWAg5Z+65rqW44Go44Gq44KL44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBvYmplY3RcbiAqICAtIGBqYWAg44Kz44OU44O85YWD44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaWZmPFQgZXh0ZW5kcyBvYmplY3Q+KGJhc2U6IFQsIHNyYzogUGFydGlhbDxUPik6IFBhcnRpYWw8VD4ge1xuICAgIGlmICghYmFzZSB8fCAhaXNPYmplY3QoYmFzZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHtjbGFzc05hbWUoYmFzZSl9IGlzIG5vdCBhbiBvYmplY3QuYCk7XG4gICAgfVxuICAgIGlmICghc3JjIHx8ICFpc09iamVjdChzcmMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYCR7Y2xhc3NOYW1lKHNyYyl9IGlzIG5vdCBhbiBvYmplY3QuYCk7XG4gICAgfVxuXG4gICAgY29uc3QgcmV0dmFsOiBQYXJ0aWFsPFQ+ID0ge307XG5cbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzcmMpKSB7XG4gICAgICAgIGlmICghZGVlcEVxdWFsKGJhc2Vba2V5XSwgc3JjW2tleV0pKSB7XG4gICAgICAgICAgICByZXR2YWxba2V5XSA9IHNyY1trZXldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLyoqXG4gKiBAZW4gSWYgdGhlIHZhbHVlIG9mIHRoZSBuYW1lZCBwcm9wZXJ0eSBpcyBhIGZ1bmN0aW9uIHRoZW4gaW52b2tlIGl0OyBvdGhlcndpc2UsIHJldHVybiBpdC5cbiAqIEBqYSBvYmplY3Qg44GuIHByb3BlcnR5IOOBjOODoeOCveODg+ODieOBquOCieOBneOBruWun+ihjOe1kOaenOOCkiwg44OX44Ot44OR44OG44Kj44Gq44KJ44Gd44Gu5YCk44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogLSBgZW5gIE9iamVjdCB0byBtYXliZSBpbnZva2UgZnVuY3Rpb24gYHByb3BlcnR5YCBvbi5cbiAqIC0gYGphYCDoqZXkvqHjgZnjgovjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBwcm9wZXJ0eVxuICogLSBgZW5gIFRoZSBmdW5jdGlvbiBieSBuYW1lIHRvIGludm9rZSBvbiBgb2JqZWN0YC5cbiAqIC0gYGphYCDoqZXkvqHjgZnjgovjg5fjg63jg5Hjg4bjgqPlkI1cbiAqIEBwYXJhbSBmYWxsYmFja1xuICogLSBgZW5gIFRoZSB2YWx1ZSB0byBiZSByZXR1cm5lZCBpbiBjYXNlIGBwcm9wZXJ0eWAgZG9lc24ndCBleGlzdCBvciBpcyB1bmRlZmluZWQuXG4gKiAtIGBqYWAg5a2Y5Zyo44GX44Gq44GL44Gj44Gf5aC05ZCI44GuIGZhbGxiYWNrIOWApFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzdWx0PFQgPSBhbnk+KHRhcmdldDogb2JqZWN0IHwgTmlsLCBwcm9wZXJ0eTogc3RyaW5nIHwgc3RyaW5nW10sIGZhbGxiYWNrPzogVCk6IFQgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICBjb25zdCBwcm9wcyA9IGlzQXJyYXkocHJvcGVydHkpID8gcHJvcGVydHkgOiBbcHJvcGVydHldO1xuICAgIGlmICghcHJvcHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBpc0Z1bmN0aW9uKGZhbGxiYWNrKSA/IGZhbGxiYWNrLmNhbGwodGFyZ2V0KSA6IGZhbGxiYWNrO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc29sdmUgPSAobzogdW5rbm93biwgcDogdW5rbm93bik6IHVua25vd24gPT4ge1xuICAgICAgICByZXR1cm4gaXNGdW5jdGlvbihwKSA/IHAuY2FsbChvKSA6IHA7XG4gICAgfTtcblxuICAgIGxldCBvYmogPSB0YXJnZXQ7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHByb3BzKSB7XG4gICAgICAgIGNvbnN0IHByb3AgPSBudWxsID09IG9iaiA/IHVuZGVmaW5lZCA6IG9ialtuYW1lXTtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gcHJvcCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUob2JqLCBmYWxsYmFjaykgYXMgVDtcbiAgICAgICAgfVxuICAgICAgICBvYmogPSByZXNvbHZlKG9iaiwgcHJvcCkgYXMgb2JqZWN0O1xuICAgIH1cbiAgICByZXR1cm4gb2JqIGFzIHVua25vd24gYXMgVDtcbn1cbiIsIi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIGNhbGxhYmxlKCk6IHVua25vd24ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdXNlLWJlZm9yZS1kZWZpbmVcbiAgICByZXR1cm4gYWNjZXNzaWJsZTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgYWNjZXNzaWJsZTogdW5rbm93biA9IG5ldyBQcm94eShjYWxsYWJsZSwge1xuICAgIGdldDogKHRhcmdldCwgbmFtZSkgPT4ge1xuICAgICAgICBjb25zdCBwcm9wID0gdGFyZ2V0W25hbWVdO1xuICAgICAgICBpZiAobnVsbCAhPSBwcm9wKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvcDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBhY2Nlc3NpYmxlO1xuICAgICAgICB9XG4gICAgfSxcbn0pO1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBjcmVhdGUoKTogdW5rbm93biB7XG4gICAgY29uc3Qgc3R1YiA9IG5ldyBQcm94eSh7fSwge1xuICAgICAgICBnZXQ6ICh0YXJnZXQsIG5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHByb3AgPSB0YXJnZXRbbmFtZV07XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBwcm9wKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb3A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2Nlc3NpYmxlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHN0dWIsICdzdHViJywge1xuICAgICAgICB2YWx1ZTogdHJ1ZSxcbiAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN0dWI7XG59XG5cbi8qKlxuICogQGVuIEdldCBzYWZlIGFjY2Vzc2libGUgb2JqZWN0LlxuICogQGphIOWuieWFqOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCquODluOCuOOCp+OCr+ODiOOBruWPluW+l1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3Qgc2FmZVdpbmRvdyA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuICogY29uc29sZS5sb2cobnVsbCAhPSBzYWZlV2luZG93LmRvY3VtZW50KTsgICAgLy8gdHJ1ZVxuICogY29uc3QgZGl2ID0gc2FmZVdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAqIGNvbnNvbGUubG9nKG51bGwgIT0gZGl2KTsgICAgLy8gdHJ1ZVxuICogYGBgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBBIHJlZmVyZW5jZSBvZiBhbiBvYmplY3Qgd2l0aCBhIHBvc3NpYmlsaXR5IHdoaWNoIGV4aXN0cy5cbiAqICAtIGBqYWAg5a2Y5Zyo44GX44GG44KL44Kq44OW44K444Kn44Kv44OI44Gu5Y+C54WnXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZWFsaXR5IG9yIHN0dWIgaW5zdGFuY2UuXG4gKiAgLSBgamFgIOWun+S9k+OBvuOBn+OBr+OCueOCv+ODluOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FmZTxUPih0YXJnZXQ6IFQpOiBUIHtcbiAgICByZXR1cm4gdGFyZ2V0IHx8IGNyZWF0ZSgpIGFzIFQ7XG59XG4iLCJpbXBvcnQgeyBVbmtub3duRnVuY3Rpb24gfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGdldEdsb2JhbCB9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7IHNhZmUgfSBmcm9tICcuL3NhZmUnO1xuXG4vKipcbiAqIEBlbiBUeXBlIG9mIGhhbmRsZSBmb3IgdGltZXIgZnVuY3Rpb25zLlxuICogQGphIOOCv+OCpOODnuODvOmWouaVsOOBq+S9v+eUqOOBmeOCi+ODj+ODs+ODieODq+Wei1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRpbWVySGFuZGxlIHsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1pbnRlcmZhY2VcblxuLyoqXG4gKiBAZW4gVHlwZSBvZiB0aW1lciBzdGFydCBmdW5jdGlvbnMuXG4gKiBAamEg44K/44Kk44Oe44O86ZaL5aeL6Zai5pWw44Gu5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFRpbWVyU3RhcnRGdW5jdGlvbiA9IChoYW5kbGVyOiBVbmtub3duRnVuY3Rpb24sIHRpbWVvdXQ/OiBudW1iZXIsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gVGltZXJIYW5kbGU7XG5cbi8qKlxuICogQGVuIFR5cGUgb2YgdGltZXIgc3RvcCBmdW5jdGlvbnMuXG4gKiBAamEg44K/44Kk44Oe44O85YGc5q2i6Zai5pWw44Gu5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFRpbWVyU3RvcEZ1bmN0aW9uID0gKGhhbmRsZTogVGltZXJIYW5kbGUpID0+IHZvaWQ7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBUaW1lckNvbnRleHQge1xuICAgIHNldFRpbWVvdXQ6IFRpbWVyU3RhcnRGdW5jdGlvbjtcbiAgICBjbGVhclRpbWVvdXQ6IFRpbWVyU3RvcEZ1bmN0aW9uO1xuICAgIHNldEludGVydmFsOiBUaW1lclN0YXJ0RnVuY3Rpb247XG4gICAgY2xlYXJJbnRlcnZhbDogVGltZXJTdG9wRnVuY3Rpb247XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Jvb3QgPSBnZXRHbG9iYWwoKSBhcyB1bmtub3duIGFzIFRpbWVyQ29udGV4dDtcbmNvbnN0IHNldFRpbWVvdXQ6IFRpbWVyU3RhcnRGdW5jdGlvbiAgID0gc2FmZShfcm9vdC5zZXRUaW1lb3V0KTtcbmNvbnN0IGNsZWFyVGltZW91dDogVGltZXJTdG9wRnVuY3Rpb24gID0gc2FmZShfcm9vdC5jbGVhclRpbWVvdXQpO1xuY29uc3Qgc2V0SW50ZXJ2YWw6IFRpbWVyU3RhcnRGdW5jdGlvbiAgPSBzYWZlKF9yb290LnNldEludGVydmFsKTtcbmNvbnN0IGNsZWFySW50ZXJ2YWw6IFRpbWVyU3RvcEZ1bmN0aW9uID0gc2FmZShfcm9vdC5jbGVhckludGVydmFsKTtcblxuZXhwb3J0IHtcbiAgICBzZXRUaW1lb3V0LFxuICAgIGNsZWFyVGltZW91dCxcbiAgICBzZXRJbnRlcnZhbCxcbiAgICBjbGVhckludGVydmFsLFxufTtcbiIsImltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIFByaW1pdGl2ZSxcbiAgICBUeXBlZERhdGEsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNPYmplY3QsXG59IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgaW52ZXJ0IH0gZnJvbSAnLi9vYmplY3QnO1xuaW1wb3J0IHtcbiAgICBUaW1lckhhbmRsZSxcbiAgICBzZXRUaW1lb3V0LFxuICAgIGNsZWFyVGltZW91dCxcbn0gZnJvbSAnLi90aW1lcic7XG5cbi8qKlxuICogQGVuIEVuc3VyZSBhc3luY2hyb25vdXMgZXhlY3V0aW9uLlxuICogQGphIOmdnuWQjOacn+Wun+ihjOOCkuS/neiovFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogdm9pZCBwb3N0KCgpID0+IGV4ZWMoYXJnKSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgaW1wbGVtZW50IGFzIGZ1bmN0aW9uIHNjb3BlLlxuICogIC0gYGphYCDplqLmlbDjgrnjgrPjg7zjg5fjgajjgZfjgablrp/oo4VcbiovXG5leHBvcnQgZnVuY3Rpb24gcG9zdDxUPihleGVjdXRvcjogKCkgPT4gVCk6IFByb21pc2U8VD4ge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGV4ZWN1dG9yKTtcbn1cblxuLyoqXG4gKiBAZW4gR2VuZXJpYyBOby1PcGVyYXRpb24uXG4gKiBAamEg5rGO55SoIE5vLU9wZXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9vcCguLi5hcmdzOiB1bmtub3duW10pOiBhbnkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycywgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIC8vIG5vb3Bcbn1cblxuLyoqXG4gKiBAZW4gV2FpdCBmb3IgdGhlIGRlc2lnbmF0aW9uIGVsYXBzZS5cbiAqIEBqYSDmjIflrprmmYLplpPlh6bnkIbjgpLlvoXmqZ9cbiAqXG4gKiBAcGFyYW0gZWxhcHNlXG4gKiAgLSBgZW5gIHdhaXQgZWxhcHNlIFttc2VjXS5cbiAqICAtIGBqYWAg5b6F5qmf5pmC6ZaTIFttc2VjXVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2xlZXAoZWxhcHNlOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIGVsYXBzZSkpO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIHdoZW4gaW52b2tlZCwgd2lsbCBvbmx5IGJlIHRyaWdnZXJlZCBhdCBtb3N0IG9uY2UgZHVyaW5nIGEgZ2l2ZW4gdGltZS5cbiAqIEBqYSDplqLmlbDjga7lrp/ooYzjgpIgd2FpdCBbbXNlY10g44GrMeWbnuOBq+WItumZkFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgdGhyb3R0bGVkID0gdGhyb3R0bGUodXBhdGVQb3NpdGlvbiwgMTAwKTtcbiAqICQod2luZG93KS5zY3JvbGwodGhyb3R0bGVkKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBzZWVkIGZ1bmN0aW9uLlxuICogIC0gYGphYCDlr77osaHjga7plqLmlbBcbiAqIEBwYXJhbSBlbGFwc2VcbiAqICAtIGBlbmAgd2FpdCBlbGFwc2UgW21zZWNdLlxuICogIC0gYGphYCDlvoXmqZ/mmYLplpMgW21zZWNdXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGhyb3R0bGU8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZXhlY3V0b3I6IFQsIGVsYXBzZTogbnVtYmVyLCBvcHRpb25zPzogeyBsZWFkaW5nPzogYm9vbGVhbjsgdHJhaWxpbmc/OiBib29sZWFuOyB9KTogVCAmIHsgY2FuY2VsKCk6IHZvaWQ7IH0ge1xuICAgIGNvbnN0IG9wdHMgPSBvcHRpb25zIHx8IHt9O1xuICAgIGxldCBoYW5kbGU6IFRpbWVySGFuZGxlIHwgdW5kZWZpbmVkO1xuICAgIGxldCBhcmdzOiB1bmtub3duW10gfCB1bmRlZmluZWQ7XG4gICAgbGV0IGNvbnRleHQ6IHVua25vd24sIHJlc3VsdDogdW5rbm93bjtcbiAgICBsZXQgcHJldmlvdXMgPSAwO1xuXG4gICAgY29uc3QgbGF0ZXIgPSBmdW5jdGlvbiAoKTogdm9pZCB7XG4gICAgICAgIHByZXZpb3VzID0gZmFsc2UgPT09IG9wdHMubGVhZGluZyA/IDAgOiBEYXRlLm5vdygpO1xuICAgICAgICBoYW5kbGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHJlc3VsdCA9IGV4ZWN1dG9yLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBpZiAoIWhhbmRsZSkge1xuICAgICAgICAgICAgY29udGV4dCA9IGFyZ3MgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgdGhyb3R0bGVkID0gZnVuY3Rpb24gKHRoaXM6IHVua25vd24sIC4uLmFyZzogdW5rbm93bltdKTogdW5rbm93biB7XG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIGlmICghcHJldmlvdXMgJiYgZmFsc2UgPT09IG9wdHMubGVhZGluZykge1xuICAgICAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVtYWluaW5nID0gZWxhcHNlIC0gKG5vdyAtIHByZXZpb3VzKTtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWludmFsaWQtdGhpc1xuICAgICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgICAgYXJncyA9IFsuLi5hcmddO1xuICAgICAgICBpZiAocmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gZWxhcHNlKSB7XG4gICAgICAgICAgICBpZiAoaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGhhbmRsZSk7XG4gICAgICAgICAgICAgICAgaGFuZGxlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgICAgICByZXN1bHQgPSBleGVjdXRvci5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICAgIGlmICghaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dCA9IGFyZ3MgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIWhhbmRsZSAmJiBmYWxzZSAhPT0gb3B0cy50cmFpbGluZykge1xuICAgICAgICAgICAgaGFuZGxlID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICB0aHJvdHRsZWQuY2FuY2VsID0gZnVuY3Rpb24gKCk6IHZvaWQge1xuICAgICAgICBjbGVhclRpbWVvdXQoaGFuZGxlIGFzIFRpbWVySGFuZGxlKTtcbiAgICAgICAgcHJldmlvdXMgPSAwO1xuICAgICAgICBoYW5kbGUgPSBjb250ZXh0ID0gYXJncyA9IHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHRocm90dGxlZCBhcyAoVCAmIHsgY2FuY2VsKCk6IHZvaWQ7IH0pO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIGFzIGxvbmcgYXMgaXQgY29udGludWVzIHRvIGJlIGludm9rZWQsIHdpbGwgbm90IGJlIHRyaWdnZXJlZC5cbiAqIEBqYSDlkbzjgbPlh7rjgZXjgozjgabjgYvjgokgd2FpdCBbbXNlY10g57WM6YGO44GZ44KL44G+44Gn5a6f6KGM44GX44Gq44GE6Zai5pWw44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIHNlZWQgZnVuY3Rpb24uXG4gKiAgLSBgamFgIOWvvuixoeOBrumWouaVsFxuICogQHBhcmFtIHdhaXRcbiAqICAtIGBlbmAgd2FpdCBlbGFwc2UgW21zZWNdLlxuICogIC0gYGphYCDlvoXmqZ/mmYLplpMgW21zZWNdXG4gKiBAcGFyYW0gaW1tZWRpYXRlXG4gKiAgLSBgZW5gIElmIGB0cnVlYCBpcyBwYXNzZWQsIHRyaWdnZXIgdGhlIGZ1bmN0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2UsIGluc3RlYWQgb2YgdGhlIHRyYWlsaW5nLlxuICogIC0gYGphYCBgdHJ1ZWAg44Gu5aC05ZCILCDliJ3lm57jga7jgrPjg7zjg6vjga/ljbPmmYLlrp/ooYxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlYm91bmNlPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGV4ZWN1dG9yOiBULCB3YWl0OiBudW1iZXIsIGltbWVkaWF0ZT86IGJvb2xlYW4pOiBUICYgeyBjYW5jZWwoKTogdm9pZDsgfSB7XG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8taW52YWxpZC10aGlzICovXG4gICAgbGV0IGhhbmRsZTogVGltZXJIYW5kbGUgfCB1bmRlZmluZWQ7XG4gICAgbGV0IHJlc3VsdDogdW5kZWZpbmVkO1xuXG4gICAgY29uc3QgbGF0ZXIgPSBmdW5jdGlvbiAoY29udGV4dDogdW5kZWZpbmVkLCBhcmdzOiB1bmRlZmluZWRbXSk6IHZvaWQge1xuICAgICAgICBoYW5kbGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChhcmdzKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBleGVjdXRvci5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBkZWJvdW5jZWQgPSBmdW5jdGlvbiAodGhpczogdW5kZWZpbmVkLCAuLi5hcmdzOiB1bmRlZmluZWRbXSk6IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChoYW5kbGUpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChoYW5kbGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbW1lZGlhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGNhbGxOb3cgPSAhaGFuZGxlO1xuICAgICAgICAgICAgaGFuZGxlID0gc2V0VGltZW91dChsYXRlciwgd2FpdCk7XG4gICAgICAgICAgICBpZiAoY2FsbE5vdykge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGV4ZWN1dG9yLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaGFuZGxlID0gc2V0VGltZW91dChsYXRlciwgd2FpdCwgdGhpcywgWy4uLmFyZ3NdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gZnVuY3Rpb24gKCk6IHZvaWQge1xuICAgICAgICBjbGVhclRpbWVvdXQoaGFuZGxlIGFzIFRpbWVySGFuZGxlKTtcbiAgICAgICAgaGFuZGxlID0gdW5kZWZpbmVkO1xuICAgIH07XG5cbiAgICByZXR1cm4gZGVib3VuY2VkIGFzIChUICYgeyBjYW5jZWwoKTogdm9pZDsgfSk7XG4gICAgLyogZXNsaW50LWVuYWJsZSBuby1pbnZhbGlkLXRoaXMgKi9cbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBhdCBtb3N0IG9uZSB0aW1lLCBubyBtYXR0ZXIgaG93IG9mdGVuIHlvdSBjYWxsIGl0LlxuICogQGphIDHluqbjgZfjgYvlrp/ooYzjgZXjgozjgarjgYTplqLmlbDjgpLov5TljbQuIDLlm57nm67ku6XpmY3jga/mnIDliJ3jga7jgrPjg7zjg6vjga7jgq3jg6Pjg4Pjgrfjg6XjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvbmNlPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGV4ZWN1dG9yOiBUKTogVCB7XG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8taW52YWxpZC10aGlzLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uICovXG4gICAgbGV0IG1lbW86IHVua25vd247XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0aGlzOiB1bmtub3duLCAuLi5hcmdzOiB1bmtub3duW10pOiB1bmtub3duIHtcbiAgICAgICAgaWYgKGV4ZWN1dG9yKSB7XG4gICAgICAgICAgICBtZW1vID0gZXhlY3V0b3IuY2FsbCh0aGlzLCAuLi5hcmdzKTtcbiAgICAgICAgICAgIGV4ZWN1dG9yID0gbnVsbCE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgfSBhcyBUO1xuICAgIC8qIGVzbGludC1lbmFibGUgbm8taW52YWxpZC10aGlzLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uICovXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgZXNjYXBlIGZ1bmN0aW9uIGZyb20gbWFwLlxuICogQGphIOaWh+Wtl+e9ruaPm+mWouaVsOOCkuS9nOaIkFxuICpcbiAqIEBwYXJhbSBtYXBcbiAqICAtIGBlbmAga2V5OiB0YXJnZXQgY2hhciwgdmFsdWU6IHJlcGxhY2UgY2hhclxuICogIC0gYGphYCBrZXk6IOe9ruaPm+WvvuixoSwgdmFsdWU6IOe9ruaPm+aWh+Wtl1xuICogQHJldHVybnNcbiAqICAtIGBlbmAgZXNwYWNlIGZ1bmN0aW9uXG4gKiAgLSBgamFgIOOCqOOCueOCseODvOODl+mWouaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRXNjYXBlcihtYXA6IG9iamVjdCk6IChzcmM6IFByaW1pdGl2ZSkgPT4gc3RyaW5nIHtcbiAgICBjb25zdCBlc2NhcGVyID0gKG1hdGNoOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgICByZXR1cm4gbWFwW21hdGNoXTtcbiAgICB9O1xuXG4gICAgY29uc3Qgc291cmNlID0gYCg/OiR7T2JqZWN0LmtleXMobWFwKS5qb2luKCd8Jyl9KWA7XG4gICAgY29uc3QgcmVnZXhUZXN0ID0gUmVnRXhwKHNvdXJjZSk7XG4gICAgY29uc3QgcmVnZXhSZXBsYWNlID0gUmVnRXhwKHNvdXJjZSwgJ2cnKTtcblxuICAgIHJldHVybiAoc3JjOiBQcmltaXRpdmUpOiBzdHJpbmcgPT4ge1xuICAgICAgICBzcmMgPSAobnVsbCA9PSBzcmMgfHwgJ3N5bWJvbCcgPT09IHR5cGVvZiBzcmMpID8gJycgOiBTdHJpbmcoc3JjKTtcbiAgICAgICAgcmV0dXJuIHJlZ2V4VGVzdC50ZXN0KHNyYykgPyBzcmMucmVwbGFjZShyZWdleFJlcGxhY2UsIGVzY2FwZXIpIDogc3JjO1xuICAgIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1hcEh0bWxFc2NhcGUgPSB7XG4gICAgJzwnOiAnJmx0OycsXG4gICAgJz4nOiAnJmd0OycsXG4gICAgJyYnOiAnJmFtcDsnLFxuICAgICdcIic6ICcmcXVvdDsnLFxuICAgIFwiJ1wiOiAnJiMzOTsnLFxuICAgICdgJzogJyYjeDYwOydcbn07XG5cbi8qKlxuICogQGVuIEVzY2FwZSBIVE1MIHN0cmluZy5cbiAqIEBqYSBIVE1MIOOBp+S9v+eUqOOBmeOCi+aWh+Wtl+OCkuWItuW+oeaWh+Wtl+OBq+e9ruaPm1xuICpcbiAqIEBicmllZiA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IG1hcEh0bWxFc2NhcGUgPSB7XG4gKiAgICAgJzwnOiAnJmx0OycsXG4gKiAgICAgJz4nOiAnJmd0OycsXG4gKiAgICAgJyYnOiAnJmFtcDsnLFxuICogICAgICdcIic6ICcmcXVvdDsnLFxuICogICAgIFwiJ1wiOiAnJiMzOTsnLFxuICogICAgICdgJzogJyYjeDYwOydcbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGVzY2FwZUhUTUwgPSBjcmVhdGVFc2NhcGVyKG1hcEh0bWxFc2NhcGUpO1xuXG4vKipcbiAqIEBlbiBVbmVzY2FwZSBIVE1MIHN0cmluZy5cbiAqIEBqYSBIVE1MIOOBp+S9v+eUqOOBmeOCi+WItuW+oeaWh+Wtl+OCkuW+qeWFg1xuICovXG5leHBvcnQgY29uc3QgdW5lc2NhcGVIVE1MID0gY3JlYXRlRXNjYXBlcihpbnZlcnQobWFwSHRtbEVzY2FwZSkpO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byB0aGUgc3R5bGUgY29tcHVsc2lvbiB2YWx1ZSBmcm9tIGlucHV0IHN0cmluZy5cbiAqIEBqYSDlhaXlipvmloflrZfliJfjgpLlnovlvLfliLbjgZfjgZ/lgKTjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBpbnB1dCBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5a++6LGh44Gu5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b1R5cGVkRGF0YShkYXRhOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBUeXBlZERhdGEgfCB1bmRlZmluZWQge1xuICAgIGlmICgndHJ1ZScgPT09IGRhdGEpIHtcbiAgICAgICAgLy8gYm9vbGVhbjogdHJ1ZVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKCdmYWxzZScgPT09IGRhdGEpIHtcbiAgICAgICAgLy8gYm9vbGVhbjogZmFsc2VcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoJ251bGwnID09PSBkYXRhKSB7XG4gICAgICAgIC8vIG51bGxcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChkYXRhID09PSBTdHJpbmcoTnVtYmVyKGRhdGEpKSkge1xuICAgICAgICAvLyBudW1iZXI6IOaVsOWApOWkieaPmyDihpIg5paH5a2X5YiX5aSJ5o+b44Gn5YWD44Gr5oi744KL44Go44GNXG4gICAgICAgIHJldHVybiBOdW1iZXIoZGF0YSk7XG4gICAgfSBlbHNlIGlmIChkYXRhICYmIC9eKD86XFx7W1xcd1xcV10qXFx9fFxcW1tcXHdcXFddKlxcXSkkLy50ZXN0KGRhdGEpKSB7XG4gICAgICAgIC8vIG9iamVjdFxuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShkYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzdHJpbmcgLyB1bmRlZmluZWRcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIHN0cmluZyBmcm9tIFtbVHlwZWREYXRhXV0uXG4gKiBAamEgW1tUeXBlZERhdGFdXSDjgpLmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBpbnB1dCBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5a++6LGh44Gu5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tVHlwZWREYXRhKGRhdGE6IFR5cGVkRGF0YSB8IHVuZGVmaW5lZCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKHVuZGVmaW5lZCA9PT0gZGF0YSB8fCBpc1N0cmluZyhkYXRhKSkge1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGRhdGEpKSB7XG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gU3RyaW5nKGRhdGEpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBgV2ViIEFQSWAgc3RvY2tlZCB0eXBlLiA8YnI+XG4gKiAgICAgRW5zdXJlIG5vdCB0byByZXR1cm4gYHVuZGVmaW5lZGAgdmFsdWUuXG4gKiBAamEgYFdlYiBBUElgIOagvOe0jeW9ouW8j+OBq+WkieaPmyA8YnI+XG4gKiAgICAgYHVuZGVmaW5lZGAg44KS6L+U5Y2044GX44Gq44GE44GT44Go44KS5L+d6Ki8XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkcm9wVW5kZWZpbmVkPFQ+KHZhbHVlOiBUIHwgbnVsbCB8IHVuZGVmaW5lZCwgbmlsU2VyaWFsaXplID0gZmFsc2UpOiBUIHwgJ251bGwnIHwgJ3VuZGVmaW5lZCcgfCBudWxsIHtcbiAgICByZXR1cm4gbnVsbCAhPSB2YWx1ZSA/IHZhbHVlIDogKG5pbFNlcmlhbGl6ZSA/IFN0cmluZyh2YWx1ZSkgOiBudWxsKSBhcyBUIHwgJ251bGwnIHwgJ3VuZGVmaW5lZCcgfCBudWxsO1xufVxuXG4vKipcbiAqIEBlbiBEZXNlcmlhbGl6ZSBmcm9tIGBXZWIgQVBJYCBzdG9ja2VkIHR5cGUuIDxicj5cbiAqICAgICBDb252ZXJ0IGZyb20gJ251bGwnIG9yICd1bmRlZmluZWQnIHN0cmluZyB0byBvcmlnaW5hbCB0eXBlLlxuICogQGphICdudWxsJyBvciAndW5kZWZpbmVkJyDjgpLjgoLjgajjga7lnovjgavmiLvjgZlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc3RvcmVOaWw8VD4odmFsdWU6IFQgfCAnbnVsbCcgfCAndW5kZWZpbmVkJyk6IFQgfCBudWxsIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoJ251bGwnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKCd1bmRlZmluZWQnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovIGxldCBfbG9jYWxJZCA9IDA7XG5cbi8qKlxuICogQGVuIEdldCBsb2NhbCB1bmlxdWUgaWQuIDxicj5cbiAqICAgICBcImxvY2FsIHVuaXF1ZVwiIG1lYW5zIGd1YXJhbnRlZXMgdW5pcXVlIGR1cmluZyBpbiBzY3JpcHQgbGlmZSBjeWNsZSBvbmx5LlxuICogQGphIOODreODvOOCq+ODq+ODpuODi+ODvOOCryBJRCDjga7lj5blvpcgPGJyPlxuICogICAgIOOCueOCr+ODquODl+ODiOODqeOCpOODleOCteOCpOOCr+ODq+S4reOBruWQjOS4gOaAp+OCkuS/neiovOOBmeOCiy5cbiAqXG4gKiBAcGFyYW0gcHJlZml4XG4gKiAgLSBgZW5gIElEIHByZWZpeFxuICogIC0gYGphYCBJRCDjgavku5jkuI7jgZnjgosgUHJlZml4XG4gKiBAcGFyYW0gemVyb1BhZFxuICogIC0gYGVuYCAwIHBhZGRpbmcgb3JkZXJcbiAqICAtIGBqYWAgMCDoqbDjgoHjgZnjgovmoYHmlbDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGx1aWQocHJlZml4ID0gJycsIHplcm9QYWQ/OiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IGlkID0gKCsrX2xvY2FsSWQpLnRvU3RyaW5nKDE2KTtcbiAgICByZXR1cm4gKG51bGwgIT0gemVyb1BhZCkgPyBgJHtwcmVmaXh9JHtpZC5wYWRTdGFydCh6ZXJvUGFkLCAnMCcpfWAgOiBgJHtwcmVmaXh9JHtpZH1gO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBgMGAgYW5kIGBtYXhgLCBpbmNsdXNpdmUuXG4gKiBAamEgYDBgIC0gYG1heGAg44Gu44Op44Oz44OA44Og44Gu5pW05pWw5YCk44KS55Sf5oiQXG4gKlxuICogQHBhcmFtIG1heFxuICogIC0gYGVuYCBUaGUgbWF4aW11bSByYW5kb20gbnVtYmVyLlxuICogIC0gYGphYCDmlbTmlbDjga7mnIDlpKflgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmRvbUludChtYXg6IG51bWJlcik6IG51bWJlcjtcblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gYG1pbmAgYW5kIGBtYXhgLCBpbmNsdXNpdmUuXG4gKiBAamEgYG1pbmAgLSBgbWF4YCDjga7jg6njg7Pjg4Djg6Djga7mlbTmlbDlgKTjgpLnlJ/miJBcbiAqXG4gKiBAcGFyYW0gbWluXG4gKiAgLSBgZW5gIFRoZSBtYXhpbXVtIHJhbmRvbSBudW1iZXIuXG4gKiAgLSBgamFgIOaVtOaVsOOBruacgOWkp+WApFxuICogQHBhcmFtIG1heFxuICogIC0gYGVuYCBUaGUgbWF4aW11bSByYW5kb20gbnVtYmVyLlxuICogIC0gYGphYCDmlbTmlbDjga7mnIDlpKflgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmRvbUludChtaW46IG51bWJlciwgbWF4OiBudW1iZXIpOiBudW1iZXI7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuaWZpZWQtc2lnbmF0dXJlc1xuXG5leHBvcnQgZnVuY3Rpb24gcmFuZG9tSW50KG1pbjogbnVtYmVyLCBtYXg/OiBudW1iZXIpOiBudW1iZXIge1xuICAgIGlmIChudWxsID09IG1heCkge1xuICAgICAgICBtYXggPSBtaW47XG4gICAgICAgIG1pbiA9IDA7XG4gICAgfVxuICAgIHJldHVybiBtaW4gKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcmVnZXhDYW5jZWxMaWtlU3RyaW5nID0gLyhhYm9ydHxjYW5jZWwpL2ltO1xuXG4vKipcbiAqIEBlbiBQcmVzdW1lIHdoZXRoZXIgaXQncyBhIGNhbmNlbGVkIGVycm9yLlxuICogQGphIOOCreODo+ODs+OCu+ODq+OBleOCjOOBn+OCqOODqeODvOOBp+OBguOCi+OBi+aOqOWumlxuICpcbiAqIEBwYXJhbSBlcnJvclxuICogIC0gYGVuYCBhbiBlcnJvciBvYmplY3QgaGFuZGxlZCBpbiBgY2F0Y2hgIGJsb2NrLlxuICogIC0gYGphYCBgY2F0Y2hgIOevgOOBquOBqeOBp+ijnOi2s+OBl+OBn+OCqOODqeODvOOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNDaGFuY2VsTGlrZUVycm9yKGVycm9yOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgaWYgKG51bGwgPT0gZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoZXJyb3IpKSB7XG4gICAgICAgIHJldHVybiBfcmVnZXhDYW5jZWxMaWtlU3RyaW5nLnRlc3QoZXJyb3IpO1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoZXJyb3IpKSB7XG4gICAgICAgIHJldHVybiBfcmVnZXhDYW5jZWxMaWtlU3RyaW5nLnRlc3QoKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgZmlyc3QgbGV0dGVyIG9mIHRoZSBzdHJpbmcgdG8gdXBwZXJjYXNlLlxuICogQGphIOacgOWIneOBruaWh+Wtl+OCkuWkp+aWh+Wtl+OBq+WkieaPm1xuICpcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNhcGl0YWxpemUoXCJmb28gQmFyXCIpO1xuICogLy8gPT4gXCJGb28gQmFyXCJcbiAqXG4gKiBjYXBpdGFsaXplKFwiRk9PIEJhclwiLCB0cnVlKTtcbiAqIC8vID0+IFwiRm9vIGJhclwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKiBAcGFyYW0gbG93ZXJjYXNlUmVzdFxuICogIC0gYGVuYCBJZiBgdHJ1ZWAgaXMgcGFzc2VkLCB0aGUgcmVzdCBvZiB0aGUgc3RyaW5nIHdpbGwgYmUgY29udmVydGVkIHRvIGxvd2VyIGNhc2VcbiAqICAtIGBqYWAgYHRydWVgIOOCkuaMh+WumuOBl+OBn+WgtOWQiCwgMuaWh+Wtl+ebruS7pemZjeOCguWwj+aWh+Wtl+WMllxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FwaXRhbGl6ZShzcmM6IHN0cmluZywgbG93ZXJjYXNlUmVzdCA9IGZhbHNlKTogc3RyaW5nIHtcbiAgICBjb25zdCByZW1haW5pbmdDaGFycyA9ICFsb3dlcmNhc2VSZXN0ID8gc3JjLnNsaWNlKDEpIDogc3JjLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIHNyYy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHJlbWFpbmluZ0NoYXJzO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBmaXJzdCBsZXR0ZXIgb2YgdGhlIHN0cmluZyB0byBsb3dlcmNhc2UuXG4gKiBAamEg5pyA5Yid44Gu5paH5a2X44KS5bCP5paH5a2X5YyWXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBkZWNhcGl0YWxpemUoXCJGb28gQmFyXCIpO1xuICogLy8gPT4gXCJmb28gQmFyXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlY2FwaXRhbGl6ZShzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHNyYy5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIHNyYy5zbGljZSgxKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgdW5kZXJzY29yZWQgb3IgZGFzaGVyaXplZCBzdHJpbmcgdG8gYSBjYW1lbGl6ZWQgb25lLiA8YnI+XG4gKiAgICAgQmVnaW5zIHdpdGggYSBsb3dlciBjYXNlIGxldHRlciB1bmxlc3MgaXQgc3RhcnRzIHdpdGggYW4gdW5kZXJzY29yZSwgZGFzaCBvciBhbiB1cHBlciBjYXNlIGxldHRlci5cbiAqIEBqYSBgX2AsIGAtYCDljLrliIfjgormloflrZfliJfjgpLjgq3jg6Pjg6Hjg6vjgrHjg7zjgrnljJYgPGJyPlxuICogICAgIGAtYCDjgb7jgZ/jga/lpKfmloflrZfjgrnjgr/jg7zjg4jjgafjgYLjgozjgbAsIOWkp+aWh+Wtl+OCueOCv+ODvOODiOOBjOaXouWumuWApFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY2FtZWxpemUoXCJtb3otdHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJtb3pUcmFuc2Zvcm1cIlxuICpcbiAqIGNhbWVsaXplKFwiLW1vei10cmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIk1velRyYW5zZm9ybVwiXG4gKlxuICogY2FtZWxpemUoXCJfbW96X3RyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwiTW96VHJhbnNmb3JtXCJcbiAqXG4gKiBjYW1lbGl6ZShcIk1vei10cmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIk1velRyYW5zZm9ybVwiXG4gKlxuICogY2FtZWxpemUoXCItbW96LXRyYW5zZm9ybVwiLCB0cnVlKTtcbiAqIC8vID0+IFwibW96VHJhbnNmb3JtXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqIEBwYXJhbSBsb3dlclxuICogIC0gYGVuYCBJZiBgdHJ1ZWAgaXMgcGFzc2VkLCBmb3JjZSBjb252ZXJ0cyB0byBsb3dlciBjYW1lbCBjYXNlIGluIHN0YXJ0cyB3aXRoIHRoZSBzcGVjaWFsIGNhc2UuXG4gKiAgLSBgamFgIOW8t+WItueahOOBq+Wwj+aWh+Wtl+OCueOCv+ODvOODiOOBmeOCi+WgtOWQiOOBq+OBryBgdHJ1ZWAg44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYW1lbGl6ZShzcmM6IHN0cmluZywgbG93ZXIgPSBmYWxzZSk6IHN0cmluZyB7XG4gICAgc3JjID0gc3JjLnRyaW0oKS5yZXBsYWNlKC9bLV9cXHNdKyguKT8vZywgKG1hdGNoLCBjKSA9PiB7XG4gICAgICAgIHJldHVybiBjID8gYy50b1VwcGVyQ2FzZSgpIDogJyc7XG4gICAgfSk7XG5cbiAgICBpZiAodHJ1ZSA9PT0gbG93ZXIpIHtcbiAgICAgICAgcmV0dXJuIGRlY2FwaXRhbGl6ZShzcmMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzcmM7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBzdHJpbmcgdG8gY2FtZWxpemVkIGNsYXNzIG5hbWUuIEZpcnN0IGxldHRlciBpcyBhbHdheXMgdXBwZXIgY2FzZS5cbiAqIEBqYSDlhYjpoK3lpKfmloflrZfjga7jgq3jg6Pjg6Hjg6vjgrHjg7zjgrnjgavlpInmj5tcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNsYXNzaWZ5KFwic29tZV9jbGFzc19uYW1lXCIpO1xuICogLy8gPT4gXCJTb21lQ2xhc3NOYW1lXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzaWZ5KHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gY2FwaXRhbGl6ZShjYW1lbGl6ZShzcmMucmVwbGFjZSgvW1xcV19dL2csICcgJykpLnJlcGxhY2UoL1xccy9nLCAnJykpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBhIGNhbWVsaXplZCBvciBkYXNoZXJpemVkIHN0cmluZyBpbnRvIGFuIHVuZGVyc2NvcmVkIG9uZS5cbiAqIEBqYSDjgq3jg6Pjg6Hjg6vjgrHjg7zjgrkgb3IgYC1gIOOBpOOBquOBjuaWh+Wtl+WIl+OCkiBgX2Ag44Gk44Gq44GO44Gr5aSJ5o+bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiB1bmRlcnNjb3JlZChcIk1velRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwibW96X3RyYW5zZm9ybVwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmRlcnNjb3JlZChzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHNyYy50cmltKCkucmVwbGFjZSgvKFthLXpcXGRdKShbQS1aXSspL2csICckMV8kMicpLnJlcGxhY2UoL1stXFxzXSsvZywgJ18nKS50b0xvd2VyQ2FzZSgpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0cyBhIHVuZGVyc2NvcmVkIG9yIGNhbWVsaXplZCBzdHJpbmcgaW50byBhbiBkYXNoZXJpemVkIG9uZS5cbiAqIEBqYSDjgq3jg6Pjg6Hjg6vjgrHjg7zjgrkgb3IgYF9gIOOBpOOBquOBjuaWh+Wtl+WIl+OCkiBgLWAg44Gk44Gq44GO44Gr5aSJ5o+bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBkYXNoZXJpemUoXCJNb3pUcmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIi1tb3otdHJhbnNmb3JtXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIHN0cmluZ1xuICogIC0gYGphYCDlpInmj5vlhYPmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhc2hlcml6ZShzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHNyYy50cmltKCkucmVwbGFjZSgvKFtBLVpdKS9nLCAnLSQxJykucmVwbGFjZSgvW19cXHNdKy9nLCAnLScpLnRvTG93ZXJDYXNlKCk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIG5vLWludmFsaWQtdGhpc1xuICovXG5cbmltcG9ydCB7IHJhbmRvbUludCB9IGZyb20gJy4vbWlzYyc7XG5cbmNvbnN0IHtcbiAgICAvKiogQGludGVybmFsICovIHJhbmRvbVxufSA9IE1hdGg7XG5cbi8qKlxuICogQGVuIEV4ZWN1dGUgc2h1ZmZsZSBvZiBhbiBhcnJheSBlbGVtZW50cy5cbiAqIEBqYSDphY3liJfopoHntKDjga7jgrfjg6Pjg4Pjg5Xjg6tcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGRlc3RydWN0aXZlXG4gKiAgLSBgZW5gIHRydWU6IGRlc3RydWN0aXZlIC8gZmFsc2U6IG5vbi1kZXN0cnVjdGl2ZSAoZGVmYXVsdClcbiAqICAtIGBqYWAgdHJ1ZTog56C05aOK55qEIC8gZmFsc2U6IOmdnuegtOWjiueahCAo5pei5a6aKVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2h1ZmZsZTxUPihhcnJheTogVFtdLCBkZXN0cnVjdGl2ZSA9IGZhbHNlKTogVFtdIHtcbiAgICBjb25zdCBzb3VyY2UgPSBkZXN0cnVjdGl2ZSA/IGFycmF5IDogYXJyYXkuc2xpY2UoKTtcbiAgICBjb25zdCBsZW4gPSBzb3VyY2UubGVuZ3RoO1xuICAgIGZvciAobGV0IGkgPSBsZW4gPiAwID8gbGVuID4+PiAwIDogMDsgaSA+IDE7KSB7XG4gICAgICAgIGNvbnN0IGogPSBpICogcmFuZG9tKCkgPj4+IDA7XG4gICAgICAgIGNvbnN0IHN3YXAgPSBzb3VyY2VbLS1pXTtcbiAgICAgICAgc291cmNlW2ldID0gc291cmNlW2pdO1xuICAgICAgICBzb3VyY2Vbal0gPSBzd2FwO1xuICAgIH1cbiAgICByZXR1cm4gc291cmNlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gRXhlY3V0ZSBzdGFibGUgc29ydCBieSBtZXJnZS1zb3J0IGFsZ29yaXRobS5cbiAqIEBqYSBgbWVyZ2Utc29ydGAg44Gr44KI44KL5a6J5a6a44K944O844OIXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjb21wYXJhdG9yXG4gKiAgLSBgZW5gIHNvcnQgY29tcGFyYXRvciBmdW5jdGlvblxuICogIC0gYGphYCDjgr3jg7zjg4jplqLmlbDjgpLmjIflrppcbiAqIEBwYXJhbSBkZXN0cnVjdGl2ZVxuICogIC0gYGVuYCB0cnVlOiBkZXN0cnVjdGl2ZSAvIGZhbHNlOiBub24tZGVzdHJ1Y3RpdmUgKGRlZmF1bHQpXG4gKiAgLSBgamFgIHRydWU6IOegtOWjiueahCAvIGZhbHNlOiDpnZ7noLTlo4rnmoQgKOaXouWumilcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNvcnQ8VD4oYXJyYXk6IFRbXSwgY29tcGFyYXRvcjogKGxoczogVCwgcmhzOiBUKSA9PiBudW1iZXIsIGRlc3RydWN0aXZlID0gZmFsc2UpOiBUW10ge1xuICAgIGNvbnN0IHNvdXJjZSA9IGRlc3RydWN0aXZlID8gYXJyYXkgOiBhcnJheS5zbGljZSgpO1xuICAgIGlmIChzb3VyY2UubGVuZ3RoIDwgMikge1xuICAgICAgICByZXR1cm4gc291cmNlO1xuICAgIH1cbiAgICBjb25zdCBsaHMgPSBzb3J0KHNvdXJjZS5zcGxpY2UoMCwgc291cmNlLmxlbmd0aCA+Pj4gMSksIGNvbXBhcmF0b3IsIHRydWUpO1xuICAgIGNvbnN0IHJocyA9IHNvcnQoc291cmNlLnNwbGljZSgwKSwgY29tcGFyYXRvciwgdHJ1ZSk7XG4gICAgd2hpbGUgKGxocy5sZW5ndGggJiYgcmhzLmxlbmd0aCkge1xuICAgICAgICBzb3VyY2UucHVzaChjb21wYXJhdG9yKGxoc1swXSwgcmhzWzBdKSA8PSAwID8gbGhzLnNoaWZ0KCkgYXMgVCA6IHJocy5zaGlmdCgpIGFzIFQpO1xuICAgIH1cbiAgICByZXR1cm4gc291cmNlLmNvbmNhdChsaHMsIHJocyk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNYWtlIHVuaXF1ZSBhcnJheS5cbiAqIEBqYSDph43opIfopoHntKDjga7jgarjgYTphY3liJfjga7kvZzmiJBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdW5pcXVlPFQ+KGFycmF5OiBUW10pOiBUW10ge1xuICAgIHJldHVybiBbLi4ubmV3IFNldChhcnJheSldO1xufVxuXG4vKipcbiAqIEBlbiBNYWtlIHVuaW9uIGFycmF5LlxuICogQGphIOmFjeWIl+OBruWSjOmbhuWQiOOCkui/lOWNtFxuICpcbiAqIEBwYXJhbSBhcnJheXNcbiAqICAtIGBlbmAgc291cmNlIGFycmF5c1xuICogIC0gYGphYCDlhaXlipvphY3liJfnvqRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuaW9uPFQ+KC4uLmFycmF5czogVFtdW10pOiBUW10ge1xuICAgIHJldHVybiB1bmlxdWUoYXJyYXlzLmZsYXQoKSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBHZXQgdGhlIG1vZGVsIGF0IHRoZSBnaXZlbiBpbmRleC4gSWYgbmVnYXRpdmUgdmFsdWUgaXMgZ2l2ZW4sIHRoZSB0YXJnZXQgd2lsbCBiZSBmb3VuZCBmcm9tIHRoZSBsYXN0IGluZGV4LlxuICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBq+OCiOOCi+ODouODh+ODq+OBuOOBruOCouOCr+OCu+OCuS4g6LKg5YCk44Gu5aC05ZCI44Gv5pyr5bC+5qSc57Si44KS5a6f6KGMXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGVuYCBBIHplcm8tYmFzZWQgaW50ZWdlciBpbmRpY2F0aW5nIHdoaWNoIGVsZW1lbnQgdG8gcmV0cmlldmUuIDxicj4gSWYgbmVnYXRpdmUgaW5kZXggaXMgY291bnRlZCBmcm9tIHRoZSBlbmQgb2YgdGhlIG1hdGNoZWQgc2V0LlxuICogIC0gYGphYCAwIGJhc2Ug44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aIDxicj4g6LKg5YCk44GM5oyH5a6a44GV44KM44Gf5aC05ZCILCDmnKvlsL7jgYvjgonjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgajjgZfjgabop6Pph4jjgZXjgozjgotcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGF0PFQ+KGFycmF5OiBUW10sIGluZGV4OiBudW1iZXIpOiBUIHwgbmV2ZXIge1xuICAgIGNvbnN0IGlkeCA9IE1hdGgudHJ1bmMoaW5kZXgpO1xuICAgIGNvbnN0IGVsID0gaWR4IDwgMCA/IGFycmF5W2lkeCArIGFycmF5Lmxlbmd0aF0gOiBhcnJheVtpZHhdO1xuICAgIGlmIChudWxsID09IGVsKSB7XG4gICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKGBpbnZhbGlkIGFycmF5IGluZGV4LiBbbGVuZ3RoOiAke2FycmF5Lmxlbmd0aH0sIGdpdmVuOiAke2luZGV4fV1gKTtcbiAgICB9XG4gICAgcmV0dXJuIGVsO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWFrZSBpbmRleCBhcnJheS5cbiAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJfjga7kvZzmiJBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGV4Y2x1ZGVzXG4gKiAgLSBgZW5gIGV4Y2x1ZGUgaW5kZXggaW4gcmV0dXJuIHZhbHVlLlxuICogIC0gYGphYCDmiLvjgorlgKTphY3liJfjgavlkKvjgoHjgarjgYTjgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluZGljZXM8VD4oYXJyYXk6IFRbXSwgLi4uZXhjbHVkZXM6IG51bWJlcltdKTogbnVtYmVyW10ge1xuICAgIGNvbnN0IHJldHZhbCA9IFsuLi5hcnJheS5rZXlzKCldO1xuXG4gICAgY29uc3QgbGVuID0gYXJyYXkubGVuZ3RoO1xuICAgIGNvbnN0IGV4TGlzdCA9IFsuLi5uZXcgU2V0KGV4Y2x1ZGVzKV0uc29ydCgobGhzLCByaHMpID0+IGxocyA8IHJocyA/IDEgOiAtMSk7XG4gICAgZm9yIChjb25zdCBleCBvZiBleExpc3QpIHtcbiAgICAgICAgaWYgKDAgPD0gZXggJiYgZXggPCBsZW4pIHtcbiAgICAgICAgICAgIHJldHZhbC5zcGxpY2UoZXgsIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFtbZ3JvdXBCeV1dKCkgb3B0aW9ucyBkZWZpbml0aW9uLlxuICogQGphIFtbZ3JvdXBCeV1dKCkg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44Oz5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3JvdXBCeU9wdGlvbnM8XG4gICAgVCBleHRlbmRzIG9iamVjdCxcbiAgICBUS0VZUyBleHRlbmRzIGtleW9mIFQsXG4gICAgVFNVTUtFWVMgZXh0ZW5kcyBrZXlvZiBULFxuICAgIFRHUk9VUEtFWSBleHRlbmRzIHN0cmluZ1xuPiB7XG4gICAgLyoqXG4gICAgICogQGVuIGBHUk9VUCBCWWAga2V5cy5cbiAgICAgKiBAamEgYEdST1VQIEJZYCDjgavmjIflrprjgZnjgovjgq3jg7xcbiAgICAgKi9cbiAgICBrZXlzOiBFeHRyYWN0PFRLRVlTLCBzdHJpbmc+W107XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWdncmVnYXRhYmxlIGtleXMuXG4gICAgICogQGphIOmbhuioiOWPr+iDveOBquOCreODvOS4gOimp1xuICAgICAqL1xuICAgIHN1bUtleXM/OiBFeHRyYWN0PFRTVU1LRVlTLCBzdHJpbmc+W107XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR3JvdXBlZCBpdGVtIGFjY2VzcyBrZXkuIGRlZmF1bHQ6ICdpdGVtcycsXG4gICAgICogQGphIOOCsOODq+ODvOODlOODs+OCsOOBleOCjOOBn+imgee0oOOBuOOBruOCouOCr+OCu+OCueOCreODvC4g5pei5a6aOiAnaXRlbXMnXG4gICAgICovXG4gICAgZ3JvdXBLZXk/OiBUR1JPVVBLRVk7XG59XG5cbi8qKlxuICogQGVuIFJldHVybiB0eXBlIG9mIFtbZ3JvdXBCeV1dKCkuXG4gKiBAamEgW1tncm91cEJ5XV0oKSDjgYzov5TljbTjgZnjgovlnotcbiAqL1xuZXhwb3J0IHR5cGUgR3JvdXBCeVJldHVyblZhbHVlPFxuICAgIFQgZXh0ZW5kcyBvYmplY3QsXG4gICAgVEtFWVMgZXh0ZW5kcyBrZXlvZiBULFxuICAgIFRTVU1LRVlTIGV4dGVuZHMga2V5b2YgVCA9IG5ldmVyLFxuICAgIFRHUk9VUEtFWSBleHRlbmRzIHN0cmluZyA9ICdpdGVtcydcbj4gPSBSZWFkb25seTxSZWNvcmQ8VEtFWVMsIHVua25vd24+ICYgUmVjb3JkPFRTVU1LRVlTLCB1bmtub3duPiAmIFJlY29yZDxUR1JPVVBLRVksIFRbXT4+O1xuXG4vKipcbiAqIEBlbiBFeGVjdXRlIGBHUk9VUCBCWWAgZm9yIGFycmF5IGVsZW1lbnRzLlxuICogQGphIOmFjeWIl+OBruimgee0oOOBriBgR1JPVVAgQllgIOmbhuWQiOOCkuaKveWHulxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBgR1JPVVAgQllgIG9wdGlvbnNcbiAqICAtIGBqYWAgYEdST1VQIEJZYCDjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdyb3VwQnk8XG4gICAgVCBleHRlbmRzIG9iamVjdCxcbiAgICBUS0VZUyBleHRlbmRzIGtleW9mIFQsXG4gICAgVFNVTUtFWVMgZXh0ZW5kcyBrZXlvZiBUID0gbmV2ZXIsXG4gICAgVEdST1VQS0VZIGV4dGVuZHMgc3RyaW5nID0gJ2l0ZW1zJ1xuPihhcnJheTogVFtdLCBvcHRpb25zOiBHcm91cEJ5T3B0aW9uczxULCBUS0VZUywgVFNVTUtFWVMsIFRHUk9VUEtFWT4pOiBHcm91cEJ5UmV0dXJuVmFsdWU8VCwgVEtFWVMsIFRTVU1LRVlTLCBUR1JPVVBLRVk+W10ge1xuICAgIGNvbnN0IHsga2V5cywgc3VtS2V5cywgZ3JvdXBLZXkgfSA9IG9wdGlvbnM7XG4gICAgY29uc3QgX2dyb3VwS2V5ID0gZ3JvdXBLZXkgfHwgJ2l0ZW1zJztcbiAgICBjb25zdCBfc3VtS2V5czogc3RyaW5nW10gPSBzdW1LZXlzIHx8IFtdO1xuICAgIF9zdW1LZXlzLnB1c2goX2dyb3VwS2V5KTtcblxuICAgIGNvbnN0IGhhc2ggPSBhcnJheS5yZWR1Y2UoKHJlczogVCwgZGF0YTogVCkgPT4ge1xuICAgICAgICAvLyBjcmVhdGUgZ3JvdXBCeSBpbnRlcm5hbCBrZXlcbiAgICAgICAgY29uc3QgX2tleSA9IGtleXMucmVkdWNlKChzLCBrKSA9PiBzICsgU3RyaW5nKGRhdGFba10pLCAnJyk7XG5cbiAgICAgICAgLy8gaW5pdCBrZXlzXG4gICAgICAgIGlmICghKF9rZXkgaW4gcmVzKSkge1xuICAgICAgICAgICAgY29uc3Qga2V5TGlzdCA9IGtleXMucmVkdWNlKChoLCBrOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICBoW2tdID0gZGF0YVtrXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaDtcbiAgICAgICAgICAgIH0sIHt9KTtcblxuICAgICAgICAgICAgcmVzW19rZXldID0gX3N1bUtleXMucmVkdWNlKChoLCBrOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICBoW2tdID0gMDtcbiAgICAgICAgICAgICAgICByZXR1cm4gaDtcbiAgICAgICAgICAgIH0sIGtleUxpc3QpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzS2V5ID0gcmVzW19rZXldO1xuXG4gICAgICAgIC8vIHN1bSBwcm9wZXJ0aWVzXG4gICAgICAgIGZvciAoY29uc3QgayBvZiBfc3VtS2V5cykge1xuICAgICAgICAgICAgaWYgKF9ncm91cEtleSA9PT0gaykge1xuICAgICAgICAgICAgICAgIHJlc0tleVtrXSA9IHJlc0tleVtrXSB8fCBbXTtcbiAgICAgICAgICAgICAgICByZXNLZXlba10ucHVzaChkYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzS2V5W2tdICs9IGRhdGFba107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH0sIHt9KTtcblxuICAgIHJldHVybiBPYmplY3QudmFsdWVzKGhhc2gpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29tcHV0ZXMgdGhlIGxpc3Qgb2YgdmFsdWVzIHRoYXQgYXJlIHRoZSBpbnRlcnNlY3Rpb24gb2YgYWxsIHRoZSBhcnJheXMuIEVhY2ggdmFsdWUgaW4gdGhlIHJlc3VsdCBpcyBwcmVzZW50IGluIGVhY2ggb2YgdGhlIGFycmF5cy5cbiAqIEBqYSDphY3liJfjga7nqY3pm4blkIjjgpLov5TljbQuIOi/lOWNtOOBleOCjOOBn+mFjeWIl+OBruimgee0oOOBr+OBmeOBueOBpuOBruWFpeWKm+OBleOCjOOBn+mFjeWIl+OBq+WQq+OBvuOCjOOCi1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc29sZS5sb2coaW50ZXJzZWN0aW9uKFsxLCAyLCAzXSwgWzEwMSwgMiwgMSwgMTBdLCBbMiwgMV0pKTtcbiAqIC8vID0+IFsxLCAyXVxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5c1xuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnRlcnNlY3Rpb248VD4oLi4uYXJyYXlzOiBUW11bXSk6IFRbXSB7XG4gICAgcmV0dXJuIGFycmF5cy5yZWR1Y2UoKGFjYywgYXJ5KSA9PiBhY2MuZmlsdGVyKGVsID0+IGFyeS5pbmNsdWRlcyhlbCkpKTtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyB0aGUgdmFsdWVzIGZyb20gYXJyYXkgdGhhdCBhcmUgbm90IHByZXNlbnQgaW4gdGhlIG90aGVyIGFycmF5cy5cbiAqIEBqYSDphY3liJfjgYvjgonjgbvjgYvjga7phY3liJfjgavlkKvjgb7jgozjgarjgYTjgoLjga7jgpLov5TljbRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnNvbGUubG9nKGRpZmZlcmVuY2UoWzEsIDIsIDMsIDQsIDVdLCBbNSwgMiwgMTBdKSk7XG4gKiAvLyA9PiBbMSwgMywgNF1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gb3RoZXJzXG4gKiAgLSBgZW5gIGV4Y2x1ZGUgZWxlbWVudCBpbiByZXR1cm4gdmFsdWUuXG4gKiAgLSBgamFgIOaIu+OCiuWApOmFjeWIl+OBq+WQq+OCgeOBquOBhOimgee0oOOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlmZmVyZW5jZTxUPihhcnJheTogVFtdLCAuLi5vdGhlcnM6IFRbXVtdKTogVFtdIHtcbiAgICBjb25zdCBhcnJheXMgPSBbYXJyYXksIC4uLm90aGVyc10gYXMgVFtdW107XG4gICAgcmV0dXJuIGFycmF5cy5yZWR1Y2UoKGFjYywgYXJ5KSA9PiBhY2MuZmlsdGVyKGVsID0+ICFhcnkuaW5jbHVkZXMoZWwpKSk7XG59XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSBjb3B5IG9mIHRoZSBhcnJheSB3aXRoIGFsbCBpbnN0YW5jZXMgb2YgdGhlIHZhbHVlcyByZW1vdmVkLlxuICogQGphIOmFjeWIl+OBi+OCieaMh+Wumuimgee0oOOCkuWPluOCiumZpOOBhOOBn+OCguOBruOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc29sZS5sb2cod2l0aG91dChbMSwgMiwgMSwgMCwgMywgMSwgNF0sIDAsIDEpKTtcbiAqIC8vID0+IFsyLCAzLCA0XVxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSB2YWx1ZXNcbiAqICAtIGBlbmAgZXhjbHVkZSBlbGVtZW50IGluIHJldHVybiB2YWx1ZS5cbiAqICAtIGBqYWAg5oi744KK5YCk6YWN5YiX44Gr5ZCr44KB44Gq44GE6KaB57Sg44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXRob3V0PFQ+KGFycmF5OiBUW10sIC4uLnZhbHVlczogVFtdKTogVFtdIHtcbiAgICByZXR1cm4gZGlmZmVyZW5jZShhcnJheSwgdmFsdWVzKTtcbn1cblxuLyoqXG4gKiBAZW4gUHJvZHVjZSBhIHJhbmRvbSBzYW1wbGUgZnJvbSB0aGUgbGlzdC5cbiAqIEBqYSDjg6njg7Pjg4Djg6DjgavjgrXjg7Pjg5fjg6vlgKTjgpLov5TljbRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnNvbGUubG9nKHNhbXBsZShbMSwgMiwgMywgNCwgNSwgNl0sIDMpKTtcbiAqIC8vID0+IFsxLCA2LCAyXVxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjb3VudFxuICogIC0gYGVuYCBudW1iZXIgb2Ygc2FtcGxpbmcgY291bnQuXG4gKiAgLSBgamFgIOi/lOWNtOOBmeOCi+OCteODs+ODl+ODq+aVsOOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FtcGxlPFQ+KGFycmF5OiBUW10sIGNvdW50OiBudW1iZXIpOiBUW107XG5cbi8qKlxuICogQGVuIFByb2R1Y2UgYSByYW5kb20gc2FtcGxlIGZyb20gdGhlIGxpc3QuXG4gKiBAamEg44Op44Oz44OA44Og44Gr44K144Oz44OX44Or5YCk44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zb2xlLmxvZyhzYW1wbGUoWzEsIDIsIDMsIDQsIDUsIDZdKSk7XG4gKiAvLyA9PiA0XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gc2FtcGxlPFQ+KGFycmF5OiBUW10pOiBUO1xuXG5leHBvcnQgZnVuY3Rpb24gc2FtcGxlPFQ+KGFycmF5OiBUW10sIGNvdW50PzogbnVtYmVyKTogVCB8IFRbXSB7XG4gICAgaWYgKG51bGwgPT0gY291bnQpIHtcbiAgICAgICAgcmV0dXJuIGFycmF5W3JhbmRvbUludChhcnJheS5sZW5ndGggLSAxKV07XG4gICAgfVxuICAgIGNvbnN0IHNhbXBsZSA9IGFycmF5LnNsaWNlKCk7XG4gICAgY29uc3QgbGVuZ3RoID0gc2FtcGxlLmxlbmd0aDtcbiAgICBjb3VudCA9IE1hdGgubWF4KE1hdGgubWluKGNvdW50LCBsZW5ndGgpLCAwKTtcbiAgICBjb25zdCBsYXN0ID0gbGVuZ3RoIC0gMTtcbiAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgY291bnQ7IGluZGV4KyspIHtcbiAgICAgICAgY29uc3QgcmFuZCA9IHJhbmRvbUludChpbmRleCwgbGFzdCk7XG4gICAgICAgIGNvbnN0IHRlbXAgPSBzYW1wbGVbaW5kZXhdO1xuICAgICAgICBzYW1wbGVbaW5kZXhdID0gc2FtcGxlW3JhbmRdO1xuICAgICAgICBzYW1wbGVbcmFuZF0gPSB0ZW1wO1xuICAgIH1cbiAgICByZXR1cm4gc2FtcGxlLnNsaWNlKDAsIGNvdW50KTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5tYXAoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5tYXAoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKiBcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgKkFycmF5KiBhcyB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c6YWN5YiX44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYXA8VCwgVT4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSB8IFByb21pc2U8VT4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxVW10+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXG4gICAgICAgIGFycmF5Lm1hcChhc3luYyAodiwgaSwgYSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhKTtcbiAgICAgICAgfSlcbiAgICApO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuZmlsdGVyKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZmlsdGVyKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgKkFycmF5KiBhcyB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c6YWN5YiX44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaWx0ZXI8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxUW10+IHtcbiAgICBjb25zdCBiaXRzOiBib29sZWFuW10gPSBhd2FpdCBtYXAoYXJyYXksICh2LCBpLCBhKSA9PiBjYWxsYmFjay5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdiwgaSwgYSkpO1xuICAgIHJldHVybiBhcnJheS5maWx0ZXIoKCkgPT4gYml0cy5zaGlmdCgpKTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLmZpbmQoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5maW5kKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+e1kOaenOOCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZDxUPih0aGlzOiB1bmtub3duLCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBib29sZWFuIHwgUHJvbWlzZTxib29sZWFuPiwgdGhpc0FyZz86IHVua25vd24pOiBQcm9taXNlPFQgfCB1bmRlZmluZWQ+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5maW5kSW5kZXgoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5maW5kSW5kZXgoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIHRoaXNBcmdcbiAqICAtIGBlbmAgVmFsdWUgdG8gdXNlIGFzICp0aGlzKiB3aGVuIGV4ZWN1dGluZyB0aGUgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDlrp/ooYzjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCBpbmRleCB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K544KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaW5kSW5kZXg8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLnNvbWUoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5zb21lKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgYm9vbGVhbiB2YWx1ZS5cbiAqICAtIGBqYWAg55yf5YG95YCk44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzb21lPFQ+KHRoaXM6IHVua25vd24sIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+LCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGZvciAoY29uc3QgW2ksIHZdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoYXdhaXQgY2FsbGJhY2suY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHYsIGksIGFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuZXZlcnkoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5ldmVyeSgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50IGJvb2xlYW4gdmFsdWUuXG4gKiAgLSBgamFgIOecn+WBveWApOOCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXZlcnk8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdW5rbm93biB8IFByb21pc2U8dW5rbm93bj4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmICghYXdhaXQgY2FsbGJhY2suY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHYsIGksIGFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUucmVkdWNlKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUucmVkdWNlKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSBpbml0aWFsVmFsdWVcbiAqICAtIGBlbmAgVXNlZCBhcyBmaXJzdCBhcmd1bWVudCB0byB0aGUgZmlyc3QgY2FsbCBvZiBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOOBq+a4oeOBleOCjOOCi+WIneacn+WApFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50ICpBcnJheSogYXMgdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+e1kOaenOmFjeWIl+OCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVkdWNlPFQsIFU+KFxuICAgIGFycmF5OiBUW10sXG4gICAgY2FsbGJhY2s6IChhY2N1bXVsYXRvcjogVSwgY3VycmVudFZhbHVlOiBULCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSB8IFByb21pc2U8VT4sXG4gICAgaW5pdGlhbFZhbHVlPzogVVxuKTogUHJvbWlzZTxVPiB7XG4gICAgaWYgKGFycmF5Lmxlbmd0aCA8PSAwICYmIHVuZGVmaW5lZCA9PT0gaW5pdGlhbFZhbHVlKSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignUmVkdWNlIG9mIGVtcHR5IGFycmF5IHdpdGggbm8gaW5pdGlhbCB2YWx1ZScpO1xuICAgIH1cblxuICAgIGNvbnN0IGhhc0luaXQgPSAodW5kZWZpbmVkICE9PSBpbml0aWFsVmFsdWUpO1xuICAgIGxldCBhY2MgPSAoaGFzSW5pdCA/IGluaXRpYWxWYWx1ZSA6IGFycmF5WzBdKSBhcyBVO1xuXG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmICghKCFoYXNJbml0ICYmIDAgPT09IGkpKSB7XG4gICAgICAgICAgICBhY2MgPSBhd2FpdCBjYWxsYmFjayhhY2MsIHYsIGksIGFycmF5KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBhY2M7XG59XG4iLCIvKipcbiAqIEBlbiBEYXRlIHVuaXQgZGVmaW5pdGlvbnMuXG4gKiBAamEg5pel5pmC44Kq44OW44K444Kn44Kv44OI44Gu5Y2Y5L2N5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIERhdGVVbml0ID0gJ3llYXInIHwgJ21vbnRoJyB8ICdkYXknIHwgJ2hvdXInIHwgJ21pbicgfCAnc2VjJyB8ICdtc2VjJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2NvbXB1dGVEYXRlRnVuY01hcCA9IHtcbiAgICB5ZWFyOiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENGdWxsWWVhcihiYXNlLmdldFVUQ0Z1bGxZZWFyKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIG1vbnRoOiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENNb250aChiYXNlLmdldFVUQ01vbnRoKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIGRheTogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDRGF0ZShiYXNlLmdldFVUQ0RhdGUoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG4gICAgaG91cjogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDSG91cnMoYmFzZS5nZXRVVENIb3VycygpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbiAgICBtaW46IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ01pbnV0ZXMoYmFzZS5nZXRVVENNaW51dGVzKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIHNlYzogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDU2Vjb25kcyhiYXNlLmdldFVUQ1NlY29uZHMoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG4gICAgbXNlYzogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDTWlsbGlzZWNvbmRzKGJhc2UuZ2V0VVRDTWlsbGlzZWNvbmRzKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBAZW4gQ2FsY3VsYXRlIGZyb20gdGhlIGRhdGUgd2hpY2ggYmVjb21lcyBhIGNhcmRpbmFsIHBvaW50IGJlZm9yZSBhIE4gZGF0ZSB0aW1lIG9yIGFmdGVyIGEgTiBkYXRlIHRpbWUgKGJ5IFtbRGF0ZVVuaXRdXSkuXG4gKiBAamEg5Z+654K544Go44Gq44KL5pel5LuY44GL44KJ44CBTuaXpeW+jOOAgU7ml6XliY3jgpLnrpflh7pcbiAqXG4gKiBAcGFyYW0gYmFzZVxuICogIC0gYGVuYCBiYXNlIGRhdGUgdGltZS5cbiAqICAtIGBqYWAg5Z+65rqW5pelXG4gKiBAcGFyYW0gYWRkXG4gKiAgLSBgZW5gIHJlbGF0aXZlIGRhdGUgdGltZS5cbiAqICAtIGBqYWAg5Yqg566X5pelLiDjg57jgqTjg4rjgrnmjIflrprjgadu5pel5YmN44KC6Kit5a6a5Y+v6IO9XG4gKiBAcGFyYW0gdW5pdCBbW0RhdGVVbml0XV1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVEYXRlKGJhc2U6IERhdGUsIGFkZDogbnVtYmVyLCB1bml0OiBEYXRlVW5pdCA9ICdkYXknKTogRGF0ZSB7XG4gICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKGJhc2UuZ2V0VGltZSgpKTtcbiAgICBjb25zdCBmdW5jID0gX2NvbXB1dGVEYXRlRnVuY01hcFt1bml0XTtcbiAgICBpZiAoZnVuYykge1xuICAgICAgICByZXR1cm4gZnVuYyhkYXRlLCBiYXNlLCBhZGQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYGludmFsaWQgdW5pdDogJHt1bml0fWApO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBOzs7Ozs7OztTQVFnQixTQUFTOztJQUVyQixPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sVUFBVSxJQUFJLFVBQVUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztBQUNyRixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7O1NBV2dCLFlBQVksQ0FBNEIsTUFBcUIsRUFBRSxHQUFHLEtBQWU7SUFDN0YsSUFBSSxJQUFJLEdBQUcsTUFBTSxJQUFJLFNBQVMsRUFBRSxDQUFDO0lBQ2pDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1FBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFD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
