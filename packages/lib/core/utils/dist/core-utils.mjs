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
    if (!base || !isObject(base)) {
        throw new TypeError(`${className(base)} is not an object.`);
    }
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

export { $cdp, at, camelize, capitalize, className, classify, clearInterval, clearTimeout, combination, computeDate, createEscaper, dasherize, debounce, decapitalize, deepCopy, deepEqual, deepMerge, diff, difference, drop, dropUndefined, ensureObject, escapeHTML, every, exists, filter, find, findIndex, fromTypedData, getConfig, getGlobal, getGlobalNamespace, groupBy, has, indices, instanceOf, intersection, invert, isArray, isBoolean, isChancelLikeError, isEmptyObject, isFunction, isIterable, isNil, isNumber, isObject, isPlainObject, isPrimitive, isString, isSymbol, isTypedArray, luid, map, mixins, noop, omit, once, ownInstanceOf, permutation, pick, post, randomInt, reduce, restoreNil, result, safe, sameClass, sameType, sample, setInterval, setMixClassAttribute, setTimeout, shuffle, sleep, some, sort, throttle, toTypedData, typeOf, underscored, unescapeHTML, union, unique, verify, without };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS11dGlscy5tanMiLCJzb3VyY2VzIjpbImNvbmZpZy50cyIsInR5cGVzLnRzIiwidmVyaWZ5LnRzIiwiZGVlcC1jaXJjdWl0LnRzIiwibWl4aW5zLnRzIiwib2JqZWN0LnRzIiwic2FmZS50cyIsInRpbWVyLnRzIiwibWlzYy50cyIsImFycmF5LnRzIiwiZGF0ZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBlbiBTYWZlIGBnbG9iYWxgIGFjY2Vzc29yLlxuICogQGphIGBnbG9iYWxgIOOCouOCr+OCu+ODg+OCtVxuICogXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBgZ2xvYmFsYCBvYmplY3Qgb2YgdGhlIHJ1bnRpbWUgZW52aXJvbm1lbnRcbiAqICAtIGBqYWAg55Kw5aKD44Gr5b+c44GY44GfIGBnbG9iYWxgIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2xvYmFsKCk6IHR5cGVvZiBnbG9iYWxUaGlzIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbmV3LWZ1bmMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1pbXBsaWVkLWV2YWxcbiAgICByZXR1cm4gKCdvYmplY3QnID09PSB0eXBlb2YgZ2xvYmFsVGhpcykgPyBnbG9iYWxUaGlzIDogRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcbn1cblxuLyoqXG4gKiBAZW4gRW5zdXJlIG5hbWVkIG9iamVjdCBhcyBwYXJlbnQncyBwcm9wZXJ0eS5cbiAqIEBqYSDopqrjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrprjgZfjgaYsIOWQjeWJjeOBq+aMh+WumuOBl+OBn+OCquODluOCuOOCp+OCr+ODiOOBruWtmOWcqOOCkuS/neiovFxuICpcbiAqIEBwYXJhbSBwYXJlbnRcbiAqICAtIGBlbmAgcGFyZW50IG9iamVjdC4gSWYgbnVsbCBnaXZlbiwgYGdsb2JhbFRoaXNgIGlzIGFzc2lnbmVkLlxuICogIC0gYGphYCDopqrjgqrjg5bjgrjjgqfjgq/jg4guIG51bGwg44Gu5aC05ZCI44GvIGBnbG9iYWxUaGlzYCDjgYzkvb/nlKjjgZXjgozjgotcbiAqIEBwYXJhbSBuYW1lc1xuICogIC0gYGVuYCBvYmplY3QgbmFtZSBjaGFpbiBmb3IgZW5zdXJlIGluc3RhbmNlLlxuICogIC0gYGphYCDkv53oqLzjgZnjgovjgqrjg5bjgrjjgqfjgq/jg4jjga7lkI3liY1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZU9iamVjdDxUIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PihwYXJlbnQ6IG9iamVjdCB8IG51bGwsIC4uLm5hbWVzOiBzdHJpbmdbXSk6IFQge1xuICAgIGxldCByb290ID0gcGFyZW50IHx8IGdldEdsb2JhbCgpO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBuYW1lcykge1xuICAgICAgICByb290W25hbWVdID0gcm9vdFtuYW1lXSB8fCB7fTtcbiAgICAgICAgcm9vdCA9IHJvb3RbbmFtZV07XG4gICAgfVxuICAgIHJldHVybiByb290IGFzIFQ7XG59XG5cbi8qKlxuICogQGVuIEdsb2JhbCBuYW1lc3BhY2UgYWNjZXNzb3IuXG4gKiBAamEg44Kw44Ot44O844OQ44Or44ON44O844Og44K544Oa44O844K544Ki44Kv44K744OD44K1XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWxOYW1lc3BhY2U8VCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4obmFtZXNwYWNlOiBzdHJpbmcpOiBUIHtcbiAgICByZXR1cm4gZW5zdXJlT2JqZWN0PFQ+KG51bGwsIG5hbWVzcGFjZSk7XG59XG5cbi8qKlxuICogQGVuIEdsb2JhbCBjb25maWcgYWNjZXNzb3IuXG4gKiBAamEg44Kw44Ot44O844OQ44Or44Kz44Oz44OV44Kj44Kw44Ki44Kv44K744OD44K1XG4gKlxuICogQHJldHVybnMgZGVmYXVsdDogYENEUC5Db25maWdgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25maWc8VCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4obmFtZXNwYWNlID0gJ0NEUCcsIGNvbmZpZ05hbWUgPSAnQ29uZmlnJyk6IFQge1xuICAgIHJldHVybiBlbnN1cmVPYmplY3Q8VD4oZ2V0R2xvYmFsTmFtZXNwYWNlKG5hbWVzcGFjZSksIGNvbmZpZ05hbWUpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L2Jhbi10eXBlc1xuICovXG5cbi8qKlxuICogQGVuIFByaW1pdGl2ZSB0eXBlIG9mIEphdmFTY3JpcHQuXG4gKiBAamEgSmF2YVNjcmlwdCDjga7jg5fjg6rjg5/jg4bjgqPjg5blnotcbiAqL1xuZXhwb3J0IHR5cGUgUHJpbWl0aXZlID0gc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IHN5bWJvbCB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVuIFRoZSBnZW5lcmFsIG51bGwgdHlwZS5cbiAqIEBqYSDnqbrjgpLnpLrjgZnlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgTmlsID0gdm9pZCB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVuIFRoZSB0eXBlIG9mIG9iamVjdCBvciBbW05pbF1dLlxuICogQGphIFtbTmlsXV0g44Gr44Gq44KK44GI44KL44Kq44OW44K444Kn44Kv44OI5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIE5pbGxhYmxlPFQgZXh0ZW5kcyBvYmplY3Q+ID0gVCB8IE5pbDtcblxuLyoqXG4gKiBAZW4gQXZvaWQgdGhlIGBGdW5jdGlvbmB0eXBlcy5cbiAqIEBqYSDmsY7nlKjplqLmlbDlnotcbiAqL1xuZXhwb3J0IHR5cGUgVW5rbm93bkZ1bmN0aW9uID0gKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bjtcblxuLyoqXG4gKiBAZW4gQXZvaWQgdGhlIGBPYmplY3RgIGFuZCBge31gIHR5cGVzLCBhcyB0aGV5IG1lYW4gXCJhbnkgbm9uLW51bGxpc2ggdmFsdWVcIi5cbiAqIEBqYSDmsY7nlKjjgqrjg5bjgrjjgqfjgq/jg4jlnosuIGBPYmplY3RgIOOBiuOCiOOBsyBge31gIOOCv+OCpOODl+OBr+OAjG51bGzjgafjgarjgYTlgKTjgI3jgpLmhI/lkbPjgZnjgovjgZ/jgoHku6PkvqHjgajjgZfjgabkvb/nlKhcbiAqL1xuZXhwb3J0IHR5cGUgVW5rbm93bk9iamVjdCA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG4vKipcbiAqIEBlbiBOb24tbnVsbGlzaCB2YWx1ZS5cbiAqIEBqYSDpnZ4gTnVsbCDlgKRcbiAqL1xuZXhwb3J0IHR5cGUgTm9uTmlsID0ge307XG5cbi8qKlxuICogQGVuIEphdmFTY3JpcHQgdHlwZSBzZXQgaW50ZXJmYWNlLlxuICogQGphIEphdmFTY3JpcHQg44Gu5Z6L44Gu6ZuG5ZCIXG4gKi9cbmludGVyZmFjZSBUeXBlTGlzdCB7XG4gICAgc3RyaW5nOiBzdHJpbmc7XG4gICAgbnVtYmVyOiBudW1iZXI7XG4gICAgYm9vbGVhbjogYm9vbGVhbjtcbiAgICBzeW1ib2w6IHN5bWJvbDtcbiAgICB1bmRlZmluZWQ6IHZvaWQgfCB1bmRlZmluZWQ7XG4gICAgb2JqZWN0OiBvYmplY3QgfCBudWxsO1xuICAgIGZ1bmN0aW9uKC4uLmFyZ3M6IHVua25vd25bXSk6IHVua25vd247XG59XG5cbi8qKlxuICogQGVuIFRoZSBrZXkgbGlzdCBvZiBbW1R5cGVMaXN0XV0uXG4gKiBAamEgW1tUeXBlTGlzdF1dIOOCreODvOS4gOimp1xuICovXG5leHBvcnQgdHlwZSBUeXBlS2V5cyA9IGtleW9mIFR5cGVMaXN0O1xuXG4vKipcbiAqIEBlbiBUeXBlIGJhc2UgZGVmaW5pdGlvbi5cbiAqIEBqYSDlnovjga7opo/lrprlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUeXBlPFQgZXh0ZW5kcyBvYmplY3Q+IGV4dGVuZHMgRnVuY3Rpb24ge1xuICAgIHJlYWRvbmx5IHByb3RvdHlwZTogVDtcbn1cblxuLyoqXG4gKiBAZW4gVHlwZSBvZiBjb25zdHJ1Y3Rvci5cbiAqIEBqYSDjgrPjg7Pjgrnjg4jjg6njgq/jgr/lnotcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb25zdHJ1Y3RvcjxUIGV4dGVuZHMgb2JqZWN0PiBleHRlbmRzIFR5cGU8VD4ge1xuICAgIG5ldyguLi5hcmdzOiBhbnlbXSk6IFQ7XG59XG5cbi8qKlxuICogQGVuIFR5cGUgb2YgY2xhc3MuXG4gKiBAamEg44Kv44Op44K55Z6LXG4gKi9cbmV4cG9ydCB0eXBlIENsYXNzPFQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+ID0gQ29uc3RydWN0b3I8VD47XG5cbi8qKlxuICogQGVuIEVuc3VyZSBmb3IgZnVuY3Rpb24gcGFyYW1ldGVycyB0byB0dXBsZS5cbiAqIEBqYSDplqLmlbDjg5Hjg6njg6Hjg7zjgr/jgajjgZfjgaYgdHVwbGUg44KS5L+d6Ki8XG4gKi9cbmV4cG9ydCB0eXBlIEFyZ3VtZW50czxUPiA9IFQgZXh0ZW5kcyBhbnlbXSA/IFQgOiBbVF07XG5cbi8qKlxuICogQGVuIFJtb3ZlIGByZWFkb25seWAgYXR0cmlidXRlcyBmcm9tIGlucHV0IHR5cGUuXG4gKiBAamEgYHJlYWRvbmx5YCDlsZ7mgKfjgpLop6PpmaRcbiAqL1xuZXhwb3J0IHR5cGUgV3JpdGFibGU8VD4gPSB7IC1yZWFkb25seSBbSyBpbiBrZXlvZiBUXTogVFtLXSB9O1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IGZ1bmN0aW9uYWwgcHJvcGVydHkgbmFtZXMuXG4gKiBAamEg6Zai5pWw44OX44Ot44OR44OG44Kj5ZCN44Gu5oq95Ye6XG4gKi9cbmV4cG9ydCB0eXBlIEZ1bmN0aW9uUHJvcGVydHlOYW1lczxUPiA9IHsgW0sgaW4ga2V5b2YgVF06IFRbS10gZXh0ZW5kcyBGdW5jdGlvbiA/IEsgOiBuZXZlciB9W2tleW9mIFRdICYgc3RyaW5nO1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IGZ1bmN0aW9uYWwgcHJvcGVydGllcy5cbiAqIEBqYSDplqLmlbDjg5fjg63jg5Hjg4bjgqPjga7mir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgRnVuY3Rpb25Qcm9wZXJ0aWVzPFQ+ID0gUGljazxULCBGdW5jdGlvblByb3BlcnR5TmFtZXM8VD4+O1xuXG4vKipcbiAqIEBlbiBFeHRyYWN0IG5vbi1mdW5jdGlvbmFsIHByb3BlcnR5IG5hbWVzLlxuICogQGphIOmdnumWouaVsOODl+ODreODkeODhuOCo+WQjeOBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VD4gPSB7IFtLIGluIGtleW9mIFRdOiBUW0tdIGV4dGVuZHMgRnVuY3Rpb24gPyBuZXZlciA6IEsgfVtrZXlvZiBUXSAmIHN0cmluZztcblxuLyoqXG4gKiBAZW4gRXh0cmFjdCBub24tZnVuY3Rpb25hbCBwcm9wZXJ0aWVzLlxuICogQGphIOmdnumWouaVsOODl+ODreODkeODhuOCo+OBruaKveWHulxuICovXG5leHBvcnQgdHlwZSBOb25GdW5jdGlvblByb3BlcnRpZXM8VD4gPSBQaWNrPFQsIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxUPj47XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgb2JqZWN0IGtleSBsaXN0LiAoZW5zdXJlIG9ubHkgJ3N0cmluZycpXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu44Kt44O85LiA6Kan44KS5oq95Ye6ICgnc3RyaW5nJyDlnovjga7jgb/jgpLkv53oqLwpXG4gKi9cbmV4cG9ydCB0eXBlIEtleXM8VCBleHRlbmRzIG9iamVjdD4gPSBrZXlvZiBPbWl0PFQsIG51bWJlciB8IHN5bWJvbD47XG5cbi8qKlxuICogQGVuIEV4dHJhY3Qgb2JqZWN0IHR5cGUgbGlzdC5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7lnovkuIDopqfjgpLmir3lh7pcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZXM8VCBleHRlbmRzIG9iamVjdD4gPSBUW2tleW9mIFRdO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IG9iamVjdCBrZXkgdG8gdHlwZS5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjgq3jg7zjgYvjgonlnovjgbjlpInmj5tcbiAqL1xuZXhwb3J0IHR5cGUgS2V5VG9UeXBlPE8gZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBrZXlvZiBPPiA9IEsgZXh0ZW5kcyBrZXlvZiBPID8gT1tLXSA6IG5ldmVyO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IG9iamVjdCB0eXBlIHRvIGtleS5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jlnovjgYvjgonjgq3jg7zjgbjlpInmj5tcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZVRvS2V5PE8gZXh0ZW5kcyBvYmplY3QsIFQgZXh0ZW5kcyBUeXBlczxPPj4gPSB7IFtLIGluIGtleW9mIE9dOiBPW0tdIGV4dGVuZHMgVCA/IEsgOiBuZXZlciB9W2tleW9mIE9dO1xuXG4vKipcbiAqIEBlbiBUaGUgW1tQbGFpbk9iamVjdF1dIHR5cGUgaXMgYSBKYXZhU2NyaXB0IG9iamVjdCBjb250YWluaW5nIHplcm8gb3IgbW9yZSBrZXktdmFsdWUgcGFpcnMuIDxicj5cbiAqICAgICAnUGxhaW4nIG1lYW5zIGl0IGZyb20gb3RoZXIga2luZHMgb2YgSmF2YVNjcmlwdCBvYmplY3RzLiBleDogbnVsbCwgdXNlci1kZWZpbmVkIGFycmF5cywgYW5kIGhvc3Qgb2JqZWN0cyBzdWNoIGFzIGBkb2N1bWVudGAuXG4gKiBAamEgMCDku6XkuIrjga4ga2V5LXZhbHVlIOODmuOCouOCkuaMgeOBpCBbW1BsYWluT2JqZWN0XV0g5a6a576pIDxicj5UaGUgUGxhaW5PYmplY3QgdHlwZSBpcyBhIEphdmFTY3JpcHQgb2JqZWN0IGNvbnRhaW5pbmcgemVybyBvciBtb3JlIGtleS12YWx1ZSBwYWlycy4gPGJyPlxuICogICAgICdQbGFpbicg44Go44Gv5LuW44Gu56iu6aGe44GuIEphdmFTY3JpcHQg44Kq44OW44K444Kn44Kv44OI44KS5ZCr44G+44Gq44GE44Kq44OW44K444Kn44Kv44OI44KS5oSP5ZGz44GZ44KLLiDkvos6ICBudWxsLCDjg6bjg7zjgrbjg7zlrprnvqnphY3liJcsIOOBvuOBn+OBryBgZG9jdW1lbnRgIOOBruOCiOOBhuOBque1hOOBv+i+vOOBv+OCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBsYWluT2JqZWN0PFQgPSBhbnk+IHtcbiAgICBba2V5OiBzdHJpbmddOiBUO1xufVxuXG4vKipcbiAqIEBlbiBUaGUgZGF0YSB0eXBlIGxpc3QgYnkgd2hpY2ggc3R5bGUgY29tcHVsc2lvbiBpcyBwb3NzaWJsZS5cbiAqIEBqYSDlnovlvLfliLblj6/og73jgarjg4fjg7zjgr/lnovkuIDopqdcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZWREYXRhID0gc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGwgfCBvYmplY3Q7XG5cbi8qKlxuICogQGVuIFRoZSBkYXRhIHR5cGUgbGlzdCBvZiBUeXBlZEFycmF5LlxuICogQGphIFR5cGVkQXJyYXkg5LiA6KanXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVkQXJyYXkgPSBJbnQ4QXJyYXkgfCBVaW50OEFycmF5IHwgVWludDhDbGFtcGVkQXJyYXkgfCBJbnQxNkFycmF5IHwgVWludDE2QXJyYXkgfCBJbnQzMkFycmF5IHwgVWludDMyQXJyYXkgfCBGbG9hdDMyQXJyYXkgfCBGbG9hdDY0QXJyYXk7XG5cbi8qKlxuICogQGVuIFR5cGVkQXJyYXkgY29uc3RydWN0b3IuXG4gKiBAamEgVHlwZWRBcnJheSDjgrPjg7Pjgrnjg4jjg6njgq/jgr/lrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUeXBlZEFycmF5Q29uc3RydWN0b3Ige1xuICAgIHJlYWRvbmx5IHByb3RvdHlwZTogVHlwZWRBcnJheTtcbiAgICBuZXcoc2VlZDogbnVtYmVyIHwgQXJyYXlMaWtlPG51bWJlcj4gfCBBcnJheUJ1ZmZlckxpa2UpOiBUeXBlZEFycmF5O1xuICAgIG5ldyhidWZmZXI6IEFycmF5QnVmZmVyTGlrZSwgYnl0ZU9mZnNldD86IG51bWJlciwgbGVuZ3RoPzogbnVtYmVyKTogVHlwZWRBcnJheTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgc2l6ZSBpbiBieXRlcyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSDopoHntKDjga7jg5DjgqTjg4jjgrXjgqTjgrpcbiAgICAgKi9cbiAgICByZWFkb25seSBCWVRFU19QRVJfRUxFTUVOVDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYSBuZXcgYXJyYXkgZnJvbSBhIHNldCBvZiBlbGVtZW50cy5cbiAgICAgKiBAamEg6KaB57Sg44KS6Kit5a6a44GX5paw6KaP6YWN5YiX44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlbXNcbiAgICAgKiAgLSBgZW5gIEEgc2V0IG9mIGVsZW1lbnRzIHRvIGluY2x1ZGUgaW4gdGhlIG5ldyBhcnJheSBvYmplY3QuXG4gICAgICogIC0gYGphYCDmlrDjgZ/jgavoqK3lrprjgZnjgovopoHntKBcbiAgICAgKi9cbiAgICBvZiguLi5pdGVtczogbnVtYmVyW10pOiBUeXBlZEFycmF5O1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZXMgYW4gYXJyYXkgZnJvbSBhbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdC5cbiAgICAgKiBAamEgYXJyYXktbGlrZSAvIGl0ZXJhdGFibGUg44Kq44OW44K444Kn44Kv44OI44GL44KJ5paw6KaP6YWN5YiX44KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlMaWtlXG4gICAgICogIC0gYGVuYCBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqICAtIGBqYWAgYXJyYXktbGlrZSDjgoLjgZfjgY/jga8gaXRlcmF0YWJsZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICBmcm9tKGFycmF5TGlrZTogQXJyYXlMaWtlPG51bWJlcj4pOiBUeXBlZEFycmF5O1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZXMgYW4gYXJyYXkgZnJvbSBhbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdC5cbiAgICAgKiBAamEgYXJyYXktbGlrZSAvIGl0ZXJhdGFibGUg44Kq44OW44K444Kn44Kv44OI44GL44KJ5paw6KaP6YWN5YiX44KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlMaWtlXG4gICAgICogIC0gYGVuYCBBbiBhcnJheS1saWtlIG9yIGl0ZXJhYmxlIG9iamVjdCB0byBjb252ZXJ0IHRvIGFuIGFycmF5LlxuICAgICAqICAtIGBqYWAgYXJyYXktbGlrZSDjgoLjgZfjgY/jga8gaXRlcmF0YWJsZSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gbWFwZm5cbiAgICAgKiAgLSBgZW5gIEEgbWFwcGluZyBmdW5jdGlvbiB0byBjYWxsIG9uIGV2ZXJ5IGVsZW1lbnQgb2YgdGhlIGFycmF5LlxuICAgICAqICAtIGBqYWAg5YWo6KaB57Sg44Gr6YGp55So44GZ44KL44OX44Ot44Kt44K36Zai5pWwXG4gICAgICogQHBhcmFtIHRoaXNBcmdcbiAgICAgKiAgLSBgZW5gIFZhbHVlIG9mICd0aGlzJyB1c2VkIHRvIGludm9rZSB0aGUgbWFwZm4uXG4gICAgICogIC0gYGphYCBtYXBmbiDjgavkvb/nlKjjgZnjgosgJ3RoaXMnXG4gICAgICovXG4gICAgZnJvbTxUPihhcnJheUxpa2U6IEFycmF5TGlrZTxUPiwgbWFwZm46ICh2OiBULCBrOiBudW1iZXIpID0+IG51bWJlciwgdGhpc0FyZz86IHVua25vd24pOiBUeXBlZEFycmF5O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGV4aXN0cy5cbiAqIEBqYSDlgKTjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleGlzdHM8VD4oeDogVCB8IE5pbCk6IHggaXMgVCB7XG4gICAgcmV0dXJuIG51bGwgIT0geDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgW1tOaWxdXS5cbiAqIEBqYSBbW05pbF1dIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTmlsKHg6IHVua25vd24pOiB4IGlzIE5pbCB7XG4gICAgcmV0dXJuIG51bGwgPT0geDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgU3RyaW5nLlxuICogQGphIFN0cmluZyDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0cmluZyh4OiB1bmtub3duKTogeCBpcyBzdHJpbmcge1xuICAgIHJldHVybiAnc3RyaW5nJyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIE51bWJlci5cbiAqIEBqYSBOdW1iZXIg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOdW1iZXIoeDogdW5rbm93bik6IHggaXMgbnVtYmVyIHtcbiAgICByZXR1cm4gJ251bWJlcicgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBCb29sZWFuLlxuICogQGphIEJvb2xlYW4g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCb29sZWFuKHg6IHVua25vd24pOiB4IGlzIGJvb2xlYW4ge1xuICAgIHJldHVybiAnYm9vbGVhbicgPT09IHR5cGVvZiB4O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBTeW1ibGUuXG4gKiBAamEgU3ltYm9sIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3ltYm9sKHg6IHVua25vd24pOiB4IGlzIHN5bWJvbCB7XG4gICAgcmV0dXJuICdzeW1ib2wnID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgcHJpbWl0aXZlIHR5cGUuXG4gKiBAamEg44OX44Oq44Of44OG44Kj44OW5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQcmltaXRpdmUoeDogdW5rbm93bik6IHggaXMgUHJpbWl0aXZlIHtcbiAgICByZXR1cm4gIXggfHwgKCdmdW5jdGlvbicgIT09IHR5cGVvZiB4KSAmJiAoJ29iamVjdCcgIT09IHR5cGVvZiB4KTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgQXJyYXkuXG4gKiBAamEgQXJyYXkg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgY29uc3QgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIE9iamVjdC5cbiAqIEBqYSBPYmplY3Qg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNPYmplY3QoeDogdW5rbm93bik6IHggaXMgb2JqZWN0IHtcbiAgICByZXR1cm4gQm9vbGVhbih4KSAmJiAnb2JqZWN0JyA9PT0gdHlwZW9mIHg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFtbUGxhaW5PYmplY3RdXS5cbiAqIEBqYSBbW1BsYWluT2JqZWN0XV0g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQbGFpbk9iamVjdCh4OiB1bmtub3duKTogeCBpcyBQbGFpbk9iamVjdCB7XG4gICAgaWYgKCFpc09iamVjdCh4KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gY3JlYXRlIGZyb20gYE9iamVjdC5jcmVhdGUoIG51bGwgKWAgaXMgcGxhaW5cbiAgICBpZiAoIU9iamVjdC5nZXRQcm90b3R5cGVPZih4KSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3duSW5zdGFuY2VPZihPYmplY3QsIHgpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBlbXB0eSBvYmplY3QuXG4gKiBAamEg56m644Kq44OW44K444Kn44Kv44OI44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFbXB0eU9iamVjdCh4OiB1bmtub3duKTogeCBpcyBvYmplY3Qge1xuICAgIGlmICghaXNQbGFpbk9iamVjdCh4KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbmFtZSBpbiB4KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIEZ1bmN0aW9uLlxuICogQGphIEZ1bmN0aW9uIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRnVuY3Rpb24oeDogdW5rbm93bik6IHggaXMgVHlwZUxpc3RbJ2Z1bmN0aW9uJ10ge1xuICAgIHJldHVybiAnZnVuY3Rpb24nID09PSB0eXBlb2YgeDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgaW5wdXQuXG4gKiBAamEg5oyH5a6a44GX44Gf5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHR5cGVcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHR5cGVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5Z6LXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0eXBlT2Y8SyBleHRlbmRzIFR5cGVLZXlzPih0eXBlOiBLLCB4OiB1bmtub3duKTogeCBpcyBUeXBlTGlzdFtLXSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSB0eXBlO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgaGFzIGl0ZXJhdG9yLlxuICogQGphIGl0ZXJhdG9yIOOCkuaJgOacieOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGU8VD4oeDogTmlsbGFibGU8SXRlcmFibGU8VD4+KTogeCBpcyBJdGVyYWJsZTxUPjtcbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlKHg6IHVua25vd24pOiB4IGlzIEl0ZXJhYmxlPHVua25vd24+O1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGUoeDogdW5rbm93bik6IGFueSB7XG4gICAgcmV0dXJuIFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoeCk7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF90eXBlZEFycmF5TmFtZXMgPSB7XG4gICAgJ0ludDhBcnJheSc6IHRydWUsXG4gICAgJ1VpbnQ4QXJyYXknOiB0cnVlLFxuICAgICdVaW50OENsYW1wZWRBcnJheSc6IHRydWUsXG4gICAgJ0ludDE2QXJyYXknOiB0cnVlLFxuICAgICdVaW50MTZBcnJheSc6IHRydWUsXG4gICAgJ0ludDMyQXJyYXknOiB0cnVlLFxuICAgICdVaW50MzJBcnJheSc6IHRydWUsXG4gICAgJ0Zsb2F0MzJBcnJheSc6IHRydWUsXG4gICAgJ0Zsb2F0NjRBcnJheSc6IHRydWUsXG59O1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgaXMgb25lIG9mIFtbVHlwZWRBcnJheV1dLlxuICogQGphIOaMh+WumuOBl+OBn+OCpOODs+OCueOCv+ODs+OCueOBjCBbW1R5cGVkQXJyYXldXSDjga7kuIDnqK7jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVkQXJyYXkoeDogdW5rbm93bik6IHggaXMgVHlwZWRBcnJheSB7XG4gICAgcmV0dXJuICEhX3R5cGVkQXJyYXlOYW1lc1tjbGFzc05hbWUoeCldO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUgaW5zdGFuY2Ugb2YgaW5wdXQuXG4gKiBAamEg5oyH5a6a44GX44Gf44Kk44Oz44K544K/44Oz44K544Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIGNvbnN0cnVjdG9yXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+OCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5zdGFuY2VPZjxUIGV4dGVuZHMgb2JqZWN0PihjdG9yOiBOaWxsYWJsZTxUeXBlPFQ+PiwgeDogdW5rbm93bik6IHggaXMgVCB7XG4gICAgcmV0dXJuICgnZnVuY3Rpb24nID09PSB0eXBlb2YgY3RvcikgJiYgKHggaW5zdGFuY2VvZiBjdG9yKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlIGluc3RhbmNlIG9mIGlucHV0IGNvbnN0cnVjdG9yIChleGNlcHQgc3ViIGNsYXNzKS5cbiAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvliKTlrpogKOa0vueUn+OCr+ODqeOCueOBr+WQq+OCgeOBquOBhClcbiAqXG4gKiBAcGFyYW0gY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL44Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvd25JbnN0YW5jZU9mPFQgZXh0ZW5kcyBvYmplY3Q+KGN0b3I6IE5pbGxhYmxlPFR5cGU8VD4+LCB4OiB1bmtub3duKTogeCBpcyBUIHtcbiAgICByZXR1cm4gKG51bGwgIT0geCkgJiYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBjdG9yKSAmJiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpID09PSBPYmplY3QoY3Rvci5wcm90b3R5cGUpKTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSB2YWx1ZSdzIGNsYXNzIG5hbWUuXG4gKiBAamEg44Kv44Op44K55ZCN44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xhc3NOYW1lKHg6IGFueSk6IHN0cmluZyB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LW1vZHVsZS1ib3VuZGFyeS10eXBlc1xuICAgIGlmICh4ICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgdG9TdHJpbmdUYWdOYW1lID0geFtTeW1ib2wudG9TdHJpbmdUYWddO1xuICAgICAgICBpZiAoaXNTdHJpbmcodG9TdHJpbmdUYWdOYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRvU3RyaW5nVGFnTmFtZTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0Z1bmN0aW9uKHgpICYmIHgucHJvdG90eXBlICYmIG51bGwgIT0geC5uYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4geC5uYW1lO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgY3RvciA9IHguY29uc3RydWN0b3I7XG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihjdG9yKSAmJiBjdG9yID09PSAoT2JqZWN0KGN0b3IucHJvdG90eXBlKSBhcyBvYmplY3QpLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGN0b3IubmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSBhcyBzdHJpbmcpLnNsaWNlKDgsIC0xKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgaW5wdXQgdmFsdWVzIGFyZSBzYW1lIHZhbHVlLXR5cGUuXG4gKiBAamEg5YWl5Yqb44GM5ZCM5LiA5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGxoc1xuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKiBAcGFyYW0gcmhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhbWVUeXBlKGxoczogdW5rbm93biwgcmhzOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHR5cGVvZiBsaHMgPT09IHR5cGVvZiByaHM7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIGlucHV0IHZhbHVlcyBhcmUgc2FtZSBjbGFzcy5cbiAqIEBqYSDlhaXlipvjgYzlkIzkuIDjgq/jg6njgrnjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gbGhzXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqIEBwYXJhbSByaHNcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FtZUNsYXNzKGxoczogdW5rbm93biwgcmhzOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgaWYgKG51bGwgPT0gbGhzICYmIG51bGwgPT0gcmhzKSB7XG4gICAgICAgIHJldHVybiBjbGFzc05hbWUobGhzKSA9PT0gY2xhc3NOYW1lKHJocyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIChudWxsICE9IGxocykgJiYgKG51bGwgIT0gcmhzKSAmJiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKGxocykgPT09IE9iamVjdC5nZXRQcm90b3R5cGVPZihyaHMpKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbW1vbiBTeW1ibGUgZm9yIGZyYW1ld29yay5cbiAqIEBqYSDjg5Xjg6zjg7zjg6Djg6/jg7zjgq/jgYzlhbHpgJrjgafkvb/nlKjjgZnjgosgU3ltYmxlXG4gKi9cbmV4cG9ydCBjb25zdCAkY2RwID0gU3ltYm9sKCdAY2RwJyk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9iYW4tdHlwZXNcbiAqL1xuXG5pbXBvcnQge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBUeXBlS2V5cyxcbiAgICBpc0FycmF5LFxuICAgIGV4aXN0cyxcbiAgICBjbGFzc05hbWUsXG59IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIEBlbiBUeXBlIHZlcmlmaWVyIGludGVyZmFjZSBkZWZpbml0aW9uLiA8YnI+XG4gKiAgICAgSWYgaW52YWxpZCB2YWx1ZSByZWNlaXZlZCwgdGhlIG1ldGhvZCB0aHJvd3MgYFR5cGVFcnJvcmAuXG4gKiBAamEg5Z6L5qSc6Ki844Gu44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pIDxicj5cbiAqICAgICDpgZXlj43jgZfjgZ/loLTlkIjjga8gYFR5cGVFcnJvcmAg44KS55m655SfXG4gKlxuICpcbiAqL1xuaW50ZXJmYWNlIFZlcmlmaWVyIHtcbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaXMgbm90IFtbTmlsXV0uXG4gICAgICogQGphIFtbTmlsXV0g44Gn44Gq44GE44GT44Go44KS5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm90TmlsLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIG5vdE5pbC5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgbm90TmlsOiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpcyBbW1R5cGVLZXlzXV0uXG4gICAgICogQGphIOaMh+WumuOBl+OBnyBbW1R5cGVLZXlzXV0g44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZU9mLnR5cGVcbiAgICAgKiAgLSBgZW5gIG9uZSBvZiBbW1R5cGVLZXlzXV1cbiAgICAgKiAgLSBgamFgIFtbVHlwZUtleXNdXSDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdHlwZU9mLnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIHR5cGVPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgdHlwZU9mOiAodHlwZTogVHlwZUtleXMsIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaXMgYEFycmF5YC5cbiAgICAgKiBAamEgYEFycmF5YCDjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheS54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBhcnJheS5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgYXJyYXk6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IHZhbHVlIGlzIGBJdGVyYWJsZWAuXG4gICAgICogQGphIGBJdGVyYWJsZWAg44Gn44GC44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlcmFibGUueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaXRlcmFibGUubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGl0ZXJhYmxlOiAoeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpID0+IHZvaWQgfCBuZXZlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBWZXJpZmljYXRpb24gZm9yIHRoZSBpbnB1dCBpbnN0YW5jZSBpcyBlcXVhbCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3IuXG4gICAgICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OBruOCpOODs+OCueOCv+ODs+OCueOBp+OBguOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGluc3RhbmNlT2YuY3RvclxuICAgICAqICAtIGBlbmAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDmr5TovIPlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gaW5zdGFuY2VPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBpbnN0YW5jZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBpbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgaW5zdGFuY2UgaGFzIGBzdHJpY3RseWAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yLlxuICAgICAqIEBqYSDmjIflrprjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7ljrPlr4bkuIDoh7TjgZfjgZ/jgqTjg7Pjgrnjgr/jg7PjgrnjgafjgYLjgovjgYvmpJzoqLxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvd25JbnN0YW5jZU9mLmN0b3JcbiAgICAgKiAgLSBgZW5gIGNvbXBhcmF0aXZlIHRhcmdldCBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5q+U6LyD5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gICAgICogQHBhcmFtIG93bkluc3RhbmNlT2YueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gb3duSW5zdGFuY2VPZi5tZXNzYWdlXG4gICAgICogIC0gYGVuYCBjdXN0b20gZXJyb3IgbWVzc2FnZVxuICAgICAqICAtIGBqYWAg44Kr44K544K/44Og44Ko44Op44O844Oh44OD44K744O844K4XG4gICAgICovXG4gICAgb3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZlcmlmaWNhdGlvbiBmb3IgdGhlIGlucHV0IGluc3RhbmNlIGhhcyBub3QgYHN0cmljdGx5YCBlcXVhbCBjb21wYXJhdGl2ZSB0YXJnZXQgY29uc3RydWN0b3IuXG4gICAgICogQGphIOaMh+WumuOCs+ODs+OCueODiOODqeOCr+OCv+OCkuaMgeOBpOOCpOODs+OCueOCv+ODs+OCueOBp+OBquOBhOOBk+OBqOOCkuaknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIG5vdE93bkluc3RhbmNlT2YuY3RvclxuICAgICAqICAtIGBlbmAgY29tcGFyYXRpdmUgdGFyZ2V0IGNvbnN0cnVjdG9yXG4gICAgICogIC0gYGphYCDmr5TovIPlr77osaHjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKiBAcGFyYW0gbm90T3duSW5zdGFuY2VPZi54XG4gICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBub3RPd25JbnN0YW5jZU9mLm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBub3RPd25JbnN0YW5jZU9mOiAoY3RvcjogRnVuY3Rpb24sIHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaGFzIHNwZWNpZmllZCBwcm9wZXJ0eS5cbiAgICAgKiBAamEg5oyH5a6a44OX44Ot44OR44OG44Kj44KS5oyB44Gj44Gm44GE44KL44GL5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkucHJvcFxuICAgICAqICAtIGBlbmAgc3BlY2lmaWVkIHByb3BlcnR5XG4gICAgICogIC0gYGphYCDlr77osaHjga7jg5fjg63jg5Hjg4bjgqNcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkueFxuICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gaGFzUHJvcGVydHkubWVzc2FnZVxuICAgICAqICAtIGBlbmAgY3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICAgKiAgLSBgamFgIOOCq+OCueOCv+ODoOOCqOODqeODvOODoeODg+OCu+ODvOOCuFxuICAgICAqL1xuICAgIGhhc1Byb3BlcnR5OiAoeDogdW5rbm93biwgcHJvcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkIHwgbmV2ZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmVyaWZpY2F0aW9uIGZvciB0aGUgaW5wdXQgdmFsdWUgaGFzIG93biBzcGVjaWZpZWQgcHJvcGVydHkuXG4gICAgICogQGphIOaMh+WumuODl+ODreODkeODhuOCo+OCkuWFpeWKm+WApOiHqui6q+aMgeOBo+OBpuOBhOOCi+OBi+aknOiovFxuICAgICAqXG4gICAgICogQHBhcmFtIGhhc093blByb3BlcnR5LnByb3BcbiAgICAgKiAgLSBgZW5gIHNwZWNpZmllZCBwcm9wZXJ0eVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44OX44Ot44OR44OG44KjXG4gICAgICogQHBhcmFtIGhhc093blByb3BlcnR5LnhcbiAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGhhc093blByb3BlcnR5Lm1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIGN1c3RvbSBlcnJvciBtZXNzYWdlXG4gICAgICogIC0gYGphYCDjgqvjgrnjgr/jg6Djgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrhcbiAgICAgKi9cbiAgICBoYXNPd25Qcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCB8IG5ldmVyO1xufVxuXG4vKipcbiAqIEBlbiBMaXN0IG9mIG1ldGhvZCBmb3IgdHlwZSB2ZXJpZnkuXG4gKiBAamEg5Z6L5qSc6Ki844GM5o+Q5L6b44GZ44KL44Oh44K944OD44OJ5LiA6KanXG4gKi9cbmV4cG9ydCB0eXBlIFZlcmlmeU1ldGhvZCA9IGtleW9mIFZlcmlmaWVyO1xuXG4vKipcbiAqIEBlbiBDb25jcmV0ZSB0eXBlIHZlcmlmaWVyIG9iamVjdC5cbiAqIEBqYSDlnovmpJzoqLzlrp/oo4Xjgqrjg5bjgrjjgqfjgq/jg4hcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuY29uc3QgX3ZlcmlmaWVyOiBWZXJpZmllciA9IHtcbiAgICBub3ROaWw6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHgpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGEgdmFsaWQgdmFsdWUuYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHR5cGVPZjogKHR5cGU6IFR5cGVLZXlzLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgeCAhPT0gdHlwZSkge1xuICAgICAgICAgICAgZXhpc3RzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYFR5cGUgb2YgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCAke3R5cGV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBhcnJheTogKHg6IHVua25vd24sIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyID0+IHtcbiAgICAgICAgaWYgKCFpc0FycmF5KHgpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhbiBBcnJheS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaXRlcmFibGU6ICh4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmICghKFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoeCkpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhbiBpdGVyYWJsZSBvYmplY3QuYCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGluc3RhbmNlT2Y6IChjdG9yOiBGdW5jdGlvbiwgeDogdW5rbm93biwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAoISh4IGluc3RhbmNlb2YgY3RvcikpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGAke2NsYXNzTmFtZSh4KX0gaXMgbm90IGFuIGluc3RhbmNlIG9mICR7Y3Rvci5uYW1lfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgb3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHggfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpICE9PSBPYmplY3QoY3Rvci5wcm90b3R5cGUpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBpcyBub3Qgb3duIGluc3RhbmNlIG9mICR7Y3Rvci5uYW1lfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgbm90T3duSW5zdGFuY2VPZjogKGN0b3I6IEZ1bmN0aW9uLCB4OiB1bmtub3duLCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsICE9IHggJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpID09PSBPYmplY3QoY3Rvci5wcm90b3R5cGUpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBpcyBvd24gaW5zdGFuY2Ugb2YgJHtjdG9yLm5hbWV9LmApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBoYXNQcm9wZXJ0eTogKHg6IHVua25vd24sIHByb3A6IFByb3BlcnR5S2V5LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciA9PiB7XG4gICAgICAgIGlmIChudWxsID09IHggfHwgIShwcm9wIGluICh4IGFzIG9iamVjdCkpKSB7XG4gICAgICAgICAgICBleGlzdHMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBkb2VzIG5vdCBoYXZlIHByb3BlcnR5ICR7U3RyaW5nKHByb3ApfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaGFzT3duUHJvcGVydHk6ICh4OiB1bmtub3duLCBwcm9wOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIgPT4ge1xuICAgICAgICBpZiAobnVsbCA9PSB4IHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoeCwgcHJvcCkpIHtcbiAgICAgICAgICAgIGV4aXN0cyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IGRvZXMgbm90IGhhdmUgb3duIHByb3BlcnR5ICR7U3RyaW5nKHByb3ApfS5gKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBAZW4gVmVyaWZ5IG1ldGhvZC5cbiAqIEBqYSDmpJzoqLzjg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gbWV0aG9kXG4gKiAgLSBgZW5gIG1ldGhvZCBuYW1lIHdoaWNoIHVzaW5nXG4gKiAgLSBgamFgIOS9v+eUqOOBmeOCi+ODoeOCveODg+ODieWQjVxuICogQHBhcmFtIGFyZ3NcbiAqICAtIGBlbmAgYXJndW1lbnRzIHdoaWNoIGNvcnJlc3BvbmRzIHRvIHRoZSBtZXRob2QgbmFtZVxuICogIC0gYGphYCDjg6Hjgr3jg4Pjg4nlkI3jgavlr77lv5zjgZnjgovlvJXmlbBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZlcmlmeTxUTWV0aG9kIGV4dGVuZHMgVmVyaWZ5TWV0aG9kPihtZXRob2Q6IFRNZXRob2QsIC4uLmFyZ3M6IFBhcmFtZXRlcnM8VmVyaWZpZXJbVE1ldGhvZF0+KTogdm9pZCB8IG5ldmVyIHtcbiAgICAoX3ZlcmlmaWVyW21ldGhvZF0gYXMgVW5rbm93bkZ1bmN0aW9uKSguLi5hcmdzKTtcbn1cblxuZXhwb3J0IHsgdmVyaWZ5IGFzIGRlZmF1bHQgfTtcbiIsImltcG9ydCB7XG4gICAgVHlwZWRBcnJheSxcbiAgICBUeXBlZEFycmF5Q29uc3RydWN0b3IsXG4gICAgaXNGdW5jdGlvbixcbiAgICBpc0FycmF5LFxuICAgIGlzT2JqZWN0LFxuICAgIGlzSXRlcmFibGUsXG4gICAgaXNUeXBlZEFycmF5LFxuICAgIHNhbWVDbGFzcyxcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBkZWVwRXF1YWwoKSAqL1xuZnVuY3Rpb24gYXJyYXlFcXVhbChsaHM6IHVua25vd25bXSwgcmhzOiB1bmtub3duW10pOiBib29sZWFuIHtcbiAgICBjb25zdCBsZW4gPSBsaHMubGVuZ3RoO1xuICAgIGlmIChsZW4gIT09IHJocy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICghZGVlcEVxdWFsKGxoc1tpXSwgcmhzW2ldKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgZGVlcEVxdWFsKCkgKi9cbmZ1bmN0aW9uIGJ1ZmZlckVxdWFsKGxoczogU2hhcmVkQXJyYXlCdWZmZXIgfCBBcnJheUJ1ZmZlciwgcmhzOiBTaGFyZWRBcnJheUJ1ZmZlciB8IEFycmF5QnVmZmVyKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc2l6ZSA9IGxocy5ieXRlTGVuZ3RoO1xuICAgIGlmIChzaXplICE9PSByaHMuYnl0ZUxlbmd0aCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGxldCBwb3MgPSAwO1xuICAgIGlmIChzaXplIC0gcG9zID49IDgpIHtcbiAgICAgICAgY29uc3QgbGVuID0gc2l6ZSA+Pj4gMztcbiAgICAgICAgY29uc3QgZjY0TCA9IG5ldyBGbG9hdDY0QXJyYXkobGhzLCAwLCBsZW4pO1xuICAgICAgICBjb25zdCBmNjRSID0gbmV3IEZsb2F0NjRBcnJheShyaHMsIDAsIGxlbik7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGlmICghT2JqZWN0LmlzKGY2NExbaV0sIGY2NFJbaV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHBvcyA9IGxlbiA8PCAzO1xuICAgIH1cbiAgICBpZiAocG9zID09PSBzaXplKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBjb25zdCBMID0gbmV3IERhdGFWaWV3KGxocyk7XG4gICAgY29uc3QgUiA9IG5ldyBEYXRhVmlldyhyaHMpO1xuICAgIGlmIChzaXplIC0gcG9zID49IDQpIHtcbiAgICAgICAgaWYgKCFPYmplY3QuaXMoTC5nZXRVaW50MzIocG9zKSwgUi5nZXRVaW50MzIocG9zKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwb3MgKz0gNDtcbiAgICB9XG4gICAgaWYgKHNpemUgLSBwb3MgPj0gMikge1xuICAgICAgICBpZiAoIU9iamVjdC5pcyhMLmdldFVpbnQxNihwb3MpLCBSLmdldFVpbnQxNihwb3MpKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHBvcyArPSAyO1xuICAgIH1cbiAgICBpZiAoc2l6ZSA+IHBvcykge1xuICAgICAgICBpZiAoIU9iamVjdC5pcyhMLmdldFVpbnQ4KHBvcyksIFIuZ2V0VWludDgocG9zKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwb3MgKz0gMTtcbiAgICB9XG4gICAgcmV0dXJuIHBvcyA9PT0gc2l6ZTtcbn1cblxuLyoqXG4gKiBAZW4gUGVyZm9ybXMgYSBkZWVwIGNvbXBhcmlzb24gYmV0d2VlbiB0d28gdmFsdWVzIHRvIGRldGVybWluZSBpZiB0aGV5IGFyZSBlcXVpdmFsZW50LlxuICogQGphIDLlgKTjga7oqbPntLDmr5TovIPjgpLjgZcsIOetieOBl+OBhOOBi+OBqeOBhuOBi+WIpOWumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVlcEVxdWFsKGxoczogdW5rbm93biwgcmhzOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgaWYgKGxocyA9PT0gcmhzKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXNGdW5jdGlvbihsaHMpICYmIGlzRnVuY3Rpb24ocmhzKSkge1xuICAgICAgICByZXR1cm4gbGhzLmxlbmd0aCA9PT0gcmhzLmxlbmd0aCAmJiBsaHMubmFtZSA9PT0gcmhzLm5hbWU7XG4gICAgfVxuICAgIGlmICghaXNPYmplY3QobGhzKSB8fCAhaXNPYmplY3QocmhzKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHsgLy8gUHJpbWl0aXZlIFdyYXBwZXIgT2JqZWN0cyAvIERhdGVcbiAgICAgICAgY29uc3QgdmFsdWVMID0gbGhzLnZhbHVlT2YoKTtcbiAgICAgICAgY29uc3QgdmFsdWVSID0gcmhzLnZhbHVlT2YoKTtcbiAgICAgICAgaWYgKGxocyAhPT0gdmFsdWVMIHx8IHJocyAhPT0gdmFsdWVSKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVMID09PSB2YWx1ZVI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBSZWdFeHBcbiAgICAgICAgY29uc3QgaXNSZWdFeHBMID0gbGhzIGluc3RhbmNlb2YgUmVnRXhwO1xuICAgICAgICBjb25zdCBpc1JlZ0V4cFIgPSByaHMgaW5zdGFuY2VvZiBSZWdFeHA7XG4gICAgICAgIGlmIChpc1JlZ0V4cEwgfHwgaXNSZWdFeHBSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNSZWdFeHBMID09PSBpc1JlZ0V4cFIgJiYgU3RyaW5nKGxocykgPT09IFN0cmluZyhyaHMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHsgLy8gQXJyYXlcbiAgICAgICAgY29uc3QgaXNBcnJheUwgPSBpc0FycmF5KGxocyk7XG4gICAgICAgIGNvbnN0IGlzQXJyYXlSID0gaXNBcnJheShyaHMpO1xuICAgICAgICBpZiAoaXNBcnJheUwgfHwgaXNBcnJheVIpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0FycmF5TCA9PT0gaXNBcnJheVIgJiYgYXJyYXlFcXVhbChsaHMgYXMgdW5rbm93bltdLCByaHMgYXMgdW5rbm93bltdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIEFycmF5QnVmZmVyXG4gICAgICAgIGNvbnN0IGlzQnVmZmVyTCA9IGxocyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyO1xuICAgICAgICBjb25zdCBpc0J1ZmZlclIgPSByaHMgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcjtcbiAgICAgICAgaWYgKGlzQnVmZmVyTCB8fCBpc0J1ZmZlclIpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0J1ZmZlckwgPT09IGlzQnVmZmVyUiAmJiBidWZmZXJFcXVhbChsaHMgYXMgQXJyYXlCdWZmZXIsIHJocyBhcyBBcnJheUJ1ZmZlcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgeyAvLyBBcnJheUJ1ZmZlclZpZXdcbiAgICAgICAgY29uc3QgaXNCdWZmZXJWaWV3TCA9IEFycmF5QnVmZmVyLmlzVmlldyhsaHMpO1xuICAgICAgICBjb25zdCBpc0J1ZmZlclZpZXdSID0gQXJyYXlCdWZmZXIuaXNWaWV3KHJocyk7XG4gICAgICAgIGlmIChpc0J1ZmZlclZpZXdMIHx8IGlzQnVmZmVyVmlld1IpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0J1ZmZlclZpZXdMID09PSBpc0J1ZmZlclZpZXdSICYmIHNhbWVDbGFzcyhsaHMsIHJocylcbiAgICAgICAgICAgICAgICAmJiBidWZmZXJFcXVhbCgobGhzIGFzIEFycmF5QnVmZmVyVmlldykuYnVmZmVyLCAocmhzIGFzIEFycmF5QnVmZmVyVmlldykuYnVmZmVyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB7IC8vIG90aGVyIEl0ZXJhYmxlXG4gICAgICAgIGNvbnN0IGlzSXRlcmFibGVMID0gaXNJdGVyYWJsZShsaHMpO1xuICAgICAgICBjb25zdCBpc0l0ZXJhYmxlUiA9IGlzSXRlcmFibGUocmhzKTtcbiAgICAgICAgaWYgKGlzSXRlcmFibGVMIHx8IGlzSXRlcmFibGVSKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNJdGVyYWJsZUwgPT09IGlzSXRlcmFibGVSICYmIGFycmF5RXF1YWwoWy4uLihsaHMgYXMgdW5rbm93bltdKV0sIFsuLi4ocmhzIGFzIHVua25vd25bXSldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoc2FtZUNsYXNzKGxocywgcmhzKSkge1xuICAgICAgICBjb25zdCBrZXlzTCA9IG5ldyBTZXQoT2JqZWN0LmtleXMobGhzKSk7XG4gICAgICAgIGNvbnN0IGtleXNSID0gbmV3IFNldChPYmplY3Qua2V5cyhyaHMpKTtcbiAgICAgICAgaWYgKGtleXNMLnNpemUgIT09IGtleXNSLnNpemUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzTCkge1xuICAgICAgICAgICAgaWYgKCFrZXlzUi5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzTCkge1xuICAgICAgICAgICAgaWYgKCFkZWVwRXF1YWwobGhzW2tleV0sIHJoc1trZXldKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIGxocykge1xuICAgICAgICAgICAgaWYgKCEoa2V5IGluIHJocykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qga2V5cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiByaHMpIHtcbiAgICAgICAgICAgIGlmICghKGtleSBpbiBsaHMpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAga2V5cy5hZGQoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzKSB7XG4gICAgICAgICAgICBpZiAoIWRlZXBFcXVhbChsaHNba2V5XSwgcmhzW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBSZWdFeHAgKi9cbmZ1bmN0aW9uIGNsb25lUmVnRXhwKHJlZ2V4cDogUmVnRXhwKTogUmVnRXhwIHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgUmVnRXhwKHJlZ2V4cC5zb3VyY2UsIHJlZ2V4cC5mbGFncyk7XG4gICAgcmVzdWx0Lmxhc3RJbmRleCA9IHJlZ2V4cC5sYXN0SW5kZXg7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBBcnJheUJ1ZmZlciAqL1xuZnVuY3Rpb24gY2xvbmVBcnJheUJ1ZmZlcihhcnJheUJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBBcnJheUJ1ZmZlciB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IEFycmF5QnVmZmVyKGFycmF5QnVmZmVyLmJ5dGVMZW5ndGgpO1xuICAgIG5ldyBVaW50OEFycmF5KHJlc3VsdCkuc2V0KG5ldyBVaW50OEFycmF5KGFycmF5QnVmZmVyKSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBEYXRhVmlldyAqL1xuZnVuY3Rpb24gY2xvbmVEYXRhVmlldyhkYXRhVmlldzogRGF0YVZpZXcpOiBEYXRhVmlldyB7XG4gICAgY29uc3QgYnVmZmVyID0gY2xvbmVBcnJheUJ1ZmZlcihkYXRhVmlldy5idWZmZXIpO1xuICAgIHJldHVybiBuZXcgRGF0YVZpZXcoYnVmZmVyLCBkYXRhVmlldy5ieXRlT2Zmc2V0LCBkYXRhVmlldy5ieXRlTGVuZ3RoKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjbG9uZSBUeXBlZEFycmF5ICovXG5mdW5jdGlvbiBjbG9uZVR5cGVkQXJyYXk8VCBleHRlbmRzIFR5cGVkQXJyYXk+KHR5cGVkQXJyYXk6IFQpOiBUIHtcbiAgICBjb25zdCBidWZmZXIgPSBjbG9uZUFycmF5QnVmZmVyKHR5cGVkQXJyYXkuYnVmZmVyKTtcbiAgICByZXR1cm4gbmV3ICh0eXBlZEFycmF5LmNvbnN0cnVjdG9yIGFzIFR5cGVkQXJyYXlDb25zdHJ1Y3RvcikoYnVmZmVyLCB0eXBlZEFycmF5LmJ5dGVPZmZzZXQsIHR5cGVkQXJyYXkubGVuZ3RoKSBhcyBUO1xufVxuXG4vKiogQGludGVybmFsIGNoZWNrIG5lY2Vzc2FyeSB0byB1cGRhdGUgKi9cbmZ1bmN0aW9uIG5lZWRVcGRhdGUob2xkVmFsdWU6IHVua25vd24sIG5ld1ZhbHVlOiB1bmtub3duLCBleGNlcHRVbmRlZmluZWQ6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBpZiAob2xkVmFsdWUgIT09IG5ld1ZhbHVlKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAoZXhjZXB0VW5kZWZpbmVkICYmIHVuZGVmaW5lZCA9PT0gb2xkVmFsdWUpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBtZXJnZSBBcnJheSAqL1xuZnVuY3Rpb24gbWVyZ2VBcnJheSh0YXJnZXQ6IHVua25vd25bXSwgc291cmNlOiB1bmtub3duW10pOiB1bmtub3duW10ge1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBzb3VyY2UubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXRbaV07XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWVyZ2Uob2xkVmFsdWUsIHNvdXJjZVtpXSk7XG4gICAgICAgICFuZWVkVXBkYXRlKG9sZFZhbHVlLCBuZXdWYWx1ZSwgZmFsc2UpIHx8ICh0YXJnZXRbaV0gPSBuZXdWYWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgbWVyZ2UgU2V0ICovXG5mdW5jdGlvbiBtZXJnZVNldCh0YXJnZXQ6IFNldDx1bmtub3duPiwgc291cmNlOiBTZXQ8dW5rbm93bj4pOiBTZXQ8dW5rbm93bj4ge1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiBzb3VyY2UpIHtcbiAgICAgICAgdGFyZ2V0LmhhcyhpdGVtKSB8fCB0YXJnZXQuYWRkKG1lcmdlKHVuZGVmaW5lZCwgaXRlbSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG4vKiogQGludGVybmFsIG1lcmdlIE1hcCAqL1xuZnVuY3Rpb24gbWVyZ2VNYXAodGFyZ2V0OiBNYXA8dW5rbm93biwgdW5rbm93bj4sIHNvdXJjZTogTWFwPHVua25vd24sIHVua25vd24+KTogTWFwPHVua25vd24sIHVua25vd24+IHtcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBzb3VyY2UpIHtcbiAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSB0YXJnZXQuZ2V0KGspO1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1lcmdlKG9sZFZhbHVlLCB2KTtcbiAgICAgICAgIW5lZWRVcGRhdGUob2xkVmFsdWUsIG5ld1ZhbHVlLCBmYWxzZSkgfHwgdGFyZ2V0LnNldChrLCBuZXdWYWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBkZWVwTWVyZ2UoKSAqL1xuZnVuY3Rpb24gbWVyZ2UodGFyZ2V0OiB1bmtub3duLCBzb3VyY2U6IHVua25vd24pOiB1bmtub3duIHtcbiAgICBpZiAodW5kZWZpbmVkID09PSBzb3VyY2UgfHwgdGFyZ2V0ID09PSBzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG4gICAgaWYgKCFpc09iamVjdChzb3VyY2UpKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2U7XG4gICAgfVxuICAgIC8vIFByaW1pdGl2ZSBXcmFwcGVyIE9iamVjdHMgLyBEYXRlXG4gICAgaWYgKHNvdXJjZS52YWx1ZU9mKCkgIT09IHNvdXJjZSkge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IG5ldyAoc291cmNlLmNvbnN0cnVjdG9yIGFzIE9iamVjdENvbnN0cnVjdG9yKShzb3VyY2UudmFsdWVPZigpKTtcbiAgICB9XG4gICAgLy8gUmVnRXhwXG4gICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICByZXR1cm4gZGVlcEVxdWFsKHRhcmdldCwgc291cmNlKSA/IHRhcmdldCA6IGNsb25lUmVnRXhwKHNvdXJjZSk7XG4gICAgfVxuICAgIC8vIEFycmF5QnVmZmVyXG4gICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBkZWVwRXF1YWwodGFyZ2V0LCBzb3VyY2UpID8gdGFyZ2V0IDogY2xvbmVBcnJheUJ1ZmZlcihzb3VyY2UpO1xuICAgIH1cbiAgICAvLyBBcnJheUJ1ZmZlclZpZXdcbiAgICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KHNvdXJjZSkpIHtcbiAgICAgICAgcmV0dXJuIGRlZXBFcXVhbCh0YXJnZXQsIHNvdXJjZSkgPyB0YXJnZXQgOiBpc1R5cGVkQXJyYXkoc291cmNlKSA/IGNsb25lVHlwZWRBcnJheShzb3VyY2UpIDogY2xvbmVEYXRhVmlldyhzb3VyY2UgYXMgRGF0YVZpZXcpO1xuICAgIH1cbiAgICAvLyBBcnJheVxuICAgIGlmIChBcnJheS5pc0FycmF5KHNvdXJjZSkpIHtcbiAgICAgICAgcmV0dXJuIG1lcmdlQXJyYXkoaXNBcnJheSh0YXJnZXQpID8gdGFyZ2V0IDogW10sIHNvdXJjZSk7XG4gICAgfVxuICAgIC8vIFNldFxuICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBTZXQpIHtcbiAgICAgICAgcmV0dXJuIG1lcmdlU2V0KHRhcmdldCBpbnN0YW5jZW9mIFNldCA/IHRhcmdldCA6IG5ldyBTZXQoKSwgc291cmNlKTtcbiAgICB9XG4gICAgLy8gTWFwXG4gICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgICByZXR1cm4gbWVyZ2VNYXAodGFyZ2V0IGluc3RhbmNlb2YgTWFwID8gdGFyZ2V0IDogbmV3IE1hcCgpLCBzb3VyY2UpO1xuICAgIH1cblxuICAgIGNvbnN0IG9iaiA9IGlzT2JqZWN0KHRhcmdldCkgPyB0YXJnZXQgOiB7fTtcbiAgICBpZiAoc2FtZUNsYXNzKHRhcmdldCwgc291cmNlKSkge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzb3VyY2UpKSB7XG4gICAgICAgICAgICBpZiAoJ19fcHJvdG9fXycgIT09IGtleSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZhbHVlID0gb2JqW2tleV07XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBtZXJnZShvbGRWYWx1ZSwgc291cmNlW2tleV0pO1xuICAgICAgICAgICAgICAgICFuZWVkVXBkYXRlKG9sZFZhbHVlLCBuZXdWYWx1ZSwgdHJ1ZSkgfHwgKG9ialtrZXldID0gbmV3VmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoJ19fcHJvdG9fXycgIT09IGtleSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZhbHVlID0gb2JqW2tleV07XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBtZXJnZShvbGRWYWx1ZSwgc291cmNlW2tleV0pO1xuICAgICAgICAgICAgICAgICFuZWVkVXBkYXRlKG9sZFZhbHVlLCBuZXdWYWx1ZSwgdHJ1ZSkgfHwgKG9ialtrZXldID0gbmV3VmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogQGVuIFJlY3Vyc2l2ZWx5IG1lcmdlcyBvd24gYW5kIGluaGVyaXRlZCBlbnVtZXJhYmxlIHN0cmluZyBrZXllZCBwcm9wZXJ0aWVzIG9mIHNvdXJjZSBvYmplY3RzIGludG8gdGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7lho3luLDnmoTjg57jg7zjgrjjgpLlrp/ooYxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBNZXJnZTxULCBTMSwgUzIsIFMzLCBTNCwgUzUsIFM2LCBTNywgUzgsIFM5PihcbiAgICB0YXJnZXQ6IFQsXG4gICAgLi4uc291cmNlczogW1MxLCBTMj8sIFMzPywgUzQ/LCBTNT8sIFM2PywgUzc/LCBTOD8sIFM5PywgLi4udW5rbm93bltdXVxuKTogVCAmIFMxICYgUzIgJiBTMyAmIFM0ICYgUzUgJiBTNiAmIFM3ICYgUzggJiBTOTtcbmV4cG9ydCBmdW5jdGlvbiBkZWVwTWVyZ2U8WD4odGFyZ2V0OiB1bmtub3duLCAuLi5zb3VyY2VzOiB1bmtub3duW10pOiBYO1xuZXhwb3J0IGZ1bmN0aW9uIGRlZXBNZXJnZSh0YXJnZXQ6IHVua25vd24sIC4uLnNvdXJjZXM6IHVua25vd25bXSk6IHVua25vd24ge1xuICAgIGxldCByZXN1bHQgPSB0YXJnZXQ7XG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2Ygc291cmNlcykge1xuICAgICAgICByZXN1bHQgPSBtZXJnZShyZXN1bHQsIHNvdXJjZSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgZGVlcCBjb3B5IGluc3RhbmNlIG9mIHNvdXJjZSBvYmplY3QuXG4gKiBAamEg44OH44Kj44O844OX44Kz44OU44O844Kq44OW44K444Kn44Kv44OI44Gu55Sf5oiQXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWVwQ29weTxUPihzcmM6IFQpOiBUIHtcbiAgICByZXR1cm4gZGVlcE1lcmdlKHVuZGVmaW5lZCwgc3JjKTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIE5pbCxcbiAgICBUeXBlLFxuICAgIENsYXNzLFxuICAgIENvbnN0cnVjdG9yLFxufSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBAZW4gTWl4aW4gY2xhc3MncyBiYXNlIGludGVyZmFjZS5cbiAqIEBqYSBNaXhpbiDjgq/jg6njgrnjga7ln7rlupXjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqlcbiAqL1xuZXhwb3J0IGRlY2xhcmUgY2xhc3MgTWl4aW5DbGFzcyB7XG4gICAgLyoqXG4gICAgICogQGVuIGNhbGwgbWl4aW4gc291cmNlIGNsYXNzJ3MgYHN1cGVyKClgLiA8YnI+XG4gICAgICogICAgIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBjYWxsZWQgZnJvbSBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAamEgTWl4aW4g44Kv44Op44K544Gu5Z+65bqV44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pIDxicj5cbiAgICAgKiAgICAg44Kz44Oz44K544OI44Op44Kv44K/44GL44KJ5ZG844G244GT44Go44KS5oOz5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3JjQ2xhc3NcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiB0YXJnZXQgY2xhc3MgbmFtZS4gZXgpIGZyb20gUzEgYXZhaWxhYmxlXG4gICAgICogIC0gYGphYCDjgrPjg7Pjgrnjg4jjg6njgq/jg4jjgZnjgovjgq/jg6njgrnlkI3jgpLmjIflrpogZXgpIFMxIOOBi+OCieaMh+WumuWPr+iDvVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gcGFyYW1ldGVyc1xuICAgICAqICAtIGBqYWAg44Kz44Oz44K544OI44Op44Kv44OI44Gr5L2/55So44GZ44KL5byV5pWwXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHN1cGVyPFQgZXh0ZW5kcyBDbGFzcz4oc3JjQ2xhc3M6IFQsIC4uLmFyZ3M6IENvbnN0cnVjdG9yUGFyYW1ldGVyczxUPik6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIGlucHV0IGNsYXNzIGlzIG1peGluZWQgKGV4Y2x1ZGluZyBvd24gY2xhc3MpLlxuICAgICAqIEBqYSDmjIflrprjgq/jg6njgrnjgYwgTWl4aW4g44GV44KM44Gm44GE44KL44GL56K66KqNICjoh6rouqvjga7jgq/jg6njgrnjga/lkKvjgb7jgozjgarjgYQpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWl4ZWRDbGFzc1xuICAgICAqICAtIGBlbmAgc2V0IHRhcmdldCBjbGFzcyBjb25zdHJ1Y3RvclxuICAgICAqICAtIGBqYWAg5a++6LGh44Kv44Op44K544Gu44Kz44Oz44K544OI44Op44Kv44K/44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGlzTWl4ZWRXaXRoPFQgZXh0ZW5kcyBvYmplY3Q+KG1peGVkQ2xhc3M6IENvbnN0cnVjdG9yPFQ+KTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZW4gTWl4ZWQgc3ViIGNsYXNzIGNvbnN0cnVjdG9yIGRlZmluaXRpb25zLlxuICogQGphIOWQiOaIkOOBl+OBn+OCteODluOCr+ODqeOCueOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1peGluQ29uc3RydWN0b3I8QiBleHRlbmRzIENsYXNzLCBVIGV4dGVuZHMgb2JqZWN0PiBleHRlbmRzIFR5cGU8VT4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBjb25zdHJ1Y3RvclxuICAgICAqIEBqYSDjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBiYXNlIGNsYXNzIGFyZ3VtZW50c1xuICAgICAqICAtIGBqYWAg5Z+65bqV44Kv44Op44K544Gr5oyH5a6a44GX44Gf5byV5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHVuaW9uIHR5cGUgb2YgY2xhc3NlcyB3aGVuIGNhbGxpbmcgW1ttaXhpbnNdXSgpXG4gICAgICogIC0gYGphYCBbW21peGluc11dKCkg44Gr5rih44GX44Gf44Kv44Op44K544Gu6ZuG5ZCIXG4gICAgICovXG4gICAgbmV3KC4uLmFyZ3M6IENvbnN0cnVjdG9yUGFyYW1ldGVyczxCPik6IFU7XG59XG5cbi8qKlxuICogQGVuIERlZmluaXRpb24gb2YgW1tzZXRNaXhDbGFzc0F0dHJpYnV0ZV1dIGZ1bmN0aW9uJ3MgYXJndW1lbnRzLlxuICogQGphIFtbc2V0TWl4Q2xhc3NBdHRyaWJ1dGVdXSDjga7lj5bjgorjgYbjgovlvJXmlbDlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNaXhDbGFzc0F0dHJpYnV0ZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFN1cHByZXNzIHByb3ZpZGluZyBjb25zdHJ1Y3Rvci10cmFwIGZvciB0aGUgbWl4aW4gc291cmNlIGNsYXNzLiBJbiB0aGlzIGNhc2UsIGBpc01peGVkV2l0aGAsIGBpbnN0YW5jZW9mYCBhbHNvIGJlY29tZXMgaW52YWxpZC4gKGZvciBpbXByb3ZpbmcgcGVyZm9ybWFuY2UpXG4gICAgICogQGphIE1peGluIFNvdXJjZSDjgq/jg6njgrnjgavlr77jgZfjgaYsIOOCs+ODs+OCueODiOODqeOCr+OCv+ODiOODqeODg+ODl+OCkuaKkeatoi4g44GT44KM44KS5oyH5a6a44GX44Gf5aC05ZCILCBgaXNNaXhlZFdpdGhgLCBgaW5zdGFuY2VvZmAg44KC54Sh5Yq544Gr44Gq44KLLiAo44OR44OV44Kp44O844Oe44Oz44K55pS55ZaEKVxuICAgICAqL1xuICAgIHByb3RvRXh0ZW5kc09ubHk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0dXAgW1N5bWJvbC5oYXNJbnN0YW5jZV0gcHJvcGVydHkuIDxicj5cbiAgICAgKiAgICAgVGhlIGNsYXNzIGRlc2lnbmF0ZWQgYXMgYSBzb3VyY2Ugb2YgW1ttaXhpbnNdXSgpIGhhcyBbU3ltYm9sLmhhc0luc3RhbmNlXSBwcm9wZXJ0eSBpbXBsaWNpdGx5LiA8YnI+XG4gICAgICogICAgIEl0J3MgdXNlZCB0byBhdm9pZCBiZWNvbWluZyB0aGUgYmVoYXZpb3IgYGluc3RhbmNlb2ZgIGRvZXNuJ3QgaW50ZW5kIHdoZW4gdGhlIGNsYXNzIGlzIGV4dGVuZGVkIGZyb20gdGhlIG1peGluZWQgY2xhc3MgdGhlIG90aGVyIHBsYWNlLlxuICAgICAqIEBqYSBbU3ltYm9sLmhhc0luc3RhbmNlXSDjg5fjg63jg5Hjg4bjgqPoqK3lrpo8YnI+XG4gICAgICogICAgIFtbbWl4aW5zXV0oKSDjga7jgr3jg7zjgrnjgavmjIflrprjgZXjgozjgZ/jgq/jg6njgrnjga8gW1N5bWJvbC5oYXNJbnN0YW5jZV0g44KS5pqX6buZ55qE44Gr5YKZ44GI44KL44Gf44KBPGJyPlxuICAgICAqICAgICDjgZ3jga7jgq/jg6njgrnjgYzku5bjgafntpnmib/jgZXjgozjgabjgYTjgovloLTlkIggYGluc3RhbmNlb2ZgIOOBjOaEj+Wbs+OBl+OBquOBhOaMr+OCi+iInuOBhOOBqOOBquOCi+OBruOCkumBv+OBkeOCi+OBn+OCgeOBq+S9v+eUqOOBmeOCiy5cbiAgICAgKi9cbiAgICBpbnN0YW5jZU9mOiAoKGluc3Q6IG9iamVjdCkgPT4gYm9vbGVhbikgfCBOaWw7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9vYmpQcm90b3R5cGUgICAgID0gT2JqZWN0LnByb3RvdHlwZTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2luc3RhbmNlT2YgICAgICAgPSBGdW5jdGlvbi5wcm90b3R5cGVbU3ltYm9sLmhhc0luc3RhbmNlXTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX292ZXJyaWRlICAgICAgICAgPSBTeW1ib2woJ292ZXJyaWRlJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9pc0luaGVyaXRlZCAgICAgID0gU3ltYm9sKCdpcy1pbmhlcml0ZWQnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NvbnN0cnVjdG9ycyAgICAgPSBTeW1ib2woJ2NvbnN0cnVjdG9ycycpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY2xhc3NCYXNlICAgICAgICA9IFN5bWJvbCgnY2xhc3MtYmFzZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY2xhc3NTb3VyY2VzICAgICA9IFN5bWJvbCgnY2xhc3Mtc291cmNlcycpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvdG9FeHRlbmRzT25seSA9IFN5bWJvbCgncHJvdG8tZXh0ZW5kcy1vbmx5Jyk7XG5cbi8qKiBAaW50ZXJuYWwgY29weSBwcm9wZXJ0aWVzIGNvcmUgKi9cbmZ1bmN0aW9uIHJlZmxlY3RQcm9wZXJ0aWVzKHRhcmdldDogb2JqZWN0LCBzb3VyY2U6IG9iamVjdCwga2V5OiBzdHJpbmcgfCBzeW1ib2wpOiB2b2lkIHtcbiAgICBpZiAobnVsbCA9PSB0YXJnZXRba2V5XSkge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc291cmNlLCBrZXkpIGFzIFByb3BlcnR5RGVjb3JhdG9yKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgb2JqZWN0IHByb3BlcnRpZXMgY29weSBtZXRob2QgKi9cbmZ1bmN0aW9uIGNvcHlQcm9wZXJ0aWVzKHRhcmdldDogb2JqZWN0LCBzb3VyY2U6IG9iamVjdCk6IHZvaWQge1xuICAgIHNvdXJjZSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhzb3VyY2UpXG4gICAgICAgIC5maWx0ZXIoa2V5ID0+ICEvKHByb3RvdHlwZXxuYW1lfGNvbnN0cnVjdG9yKS8udGVzdChrZXkpKVxuICAgICAgICAuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgcmVmbGVjdFByb3BlcnRpZXModGFyZ2V0LCBzb3VyY2UsIGtleSk7XG4gICAgICAgIH0pO1xuICAgIHNvdXJjZSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHNvdXJjZSlcbiAgICAgICAgLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIHJlZmxlY3RQcm9wZXJ0aWVzKHRhcmdldCwgc291cmNlLCBrZXkpO1xuICAgICAgICB9KTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNldE1peENsYXNzQXR0cmlidXRlKHRhcmdldCwgJ2luc3RhbmNlT2YnKSAqL1xuZnVuY3Rpb24gc2V0SW5zdGFuY2VPZjxUIGV4dGVuZHMgb2JqZWN0Pih0YXJnZXQ6IENvbnN0cnVjdG9yPFQ+LCBtZXRob2Q6ICgoaW5zdDogb2JqZWN0KSA9PiBib29sZWFuKSB8IE5pbCk6IHZvaWQge1xuICAgIGNvbnN0IGJlaGF2aW91ciA9IG1ldGhvZCB8fCAobnVsbCA9PT0gbWV0aG9kID8gdW5kZWZpbmVkIDogKChpOiBvYmplY3QpID0+IE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZi5jYWxsKHRhcmdldC5wcm90b3R5cGUsIGkpKSk7XG4gICAgY29uc3QgYXBwbGllZCA9IGJlaGF2aW91ciAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgX292ZXJyaWRlKTtcbiAgICBpZiAoIWFwcGxpZWQpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGFyZ2V0LCB7XG4gICAgICAgICAgICBbU3ltYm9sLmhhc0luc3RhbmNlXToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBiZWhhdmlvdXIsXG4gICAgICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW19vdmVycmlkZV06IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogYmVoYXZpb3VyID8gdHJ1ZSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gU2V0IHRoZSBNaXhpbiBjbGFzcyBhdHRyaWJ1dGUuXG4gKiBAamEgTWl4aW4g44Kv44Op44K544Gr5a++44GX44Gm5bGe5oCn44KS6Kit5a6aXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAvLyAncHJvdG9FeHRlbmRPbmx5J1xuICogY2xhc3MgQmFzZSB7IGNvbnN0cnVjdG9yKGEsIGIpIHt9IH07XG4gKiBjbGFzcyBNaXhBIHsgfTtcbiAqIHNldE1peENsYXNzQXR0cmlidXRlKE1peEEsICdwcm90b0V4dGVuZHNPbmx5Jyk7ICAvLyBmb3IgaW1wcm92aW5nIGNvbnN0cnVjdGlvbiBwZXJmb3JtYW5jZVxuICogY2xhc3MgTWl4QiB7IGNvbnN0cnVjdG9yKGMsIGQpIHt9IH07XG4gKlxuICogY2xhc3MgTWl4aW5DbGFzcyBleHRlbmRzIG1peGlucyhCYXNlLCBNaXhBLCBNaXhCKSB7XG4gKiAgICAgY29uc3RydWN0b3IoYSwgYiwgYywgZCl7XG4gKiAgICAgICAgIC8vIGNhbGxpbmcgYEJhc2VgIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHN1cGVyKGEsIGIpO1xuICpcbiAqICAgICAgICAgLy8gY2FsbGluZyBNaXhpbiBjbGFzcydzIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QSk7ICAgICAgICAvLyBubyBhZmZlY3RcbiAqICAgICAgICAgdGhpcy5zdXBlcihNaXhCLCBjLCBkKTtcbiAqICAgICB9XG4gKiB9XG4gKlxuICogY29uc3QgbWl4ZWQgPSBuZXcgTWl4aW5DbGFzcygpO1xuICogY29uc29sZS5sb2cobWl4ZWQgaW5zdGFuY2VvZiBNaXhBKTsgICAgLy8gZmFsc2VcbiAqIGNvbnNvbGUubG9nKG1peGVkLmlzTWl4ZWRXaXRoKE1peEEpKTsgIC8vIGZhbHNlXG4gKlxuICogLy8gJ2luc3RhbmNlT2YnXG4gKiBjbGFzcyBCYXNlIHt9O1xuICogY2xhc3MgU291cmNlIHt9O1xuICogY2xhc3MgTWl4aW5DbGFzcyBleHRlbmRzIG1peGlucyhCYXNlLCBTb3VyY2UpIHt9O1xuICpcbiAqIGNsYXNzIE90aGVyIGV4dGVuZHMgU291cmNlIHt9O1xuICpcbiAqIGNvbnN0IG90aGVyID0gbmV3IE90aGVyKCk7XG4gKiBjb25zdCBtaXhlZCA9IG5ldyBNaXhpbkNsYXNzKCk7XG4gKiBjb25zb2xlLmxvZyhvdGhlciBpbnN0YW5jZW9mIFNvdXJjZSk7ICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhvdGhlciBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE1peGluQ2xhc3MpOyAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIEJhc2UpOyAgICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIFNvdXJjZSk7ICAgICAgICAvLyB0cnVlXG4gKiBjb25zb2xlLmxvZyhtaXhlZCBpbnN0YW5jZW9mIE90aGVyKTsgICAgICAgICAvLyB0cnVlID8/P1xuICpcbiAqIHNldE1peENsYXNzQXR0cmlidXRlKE90aGVyLCAnaW5zdGFuY2VPZicpOyAvLyBvciBzZXRNaXhDbGFzc0F0dHJpYnV0ZShPdGhlciwgJ2luc3RhbmNlT2YnLCBudWxsKTtcbiAqIGNvbnNvbGUubG9nKG90aGVyIGluc3RhbmNlb2YgU291cmNlKTsgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG90aGVyIGluc3RhbmNlb2YgT3RoZXIpOyAgICAgICAgIC8vIHRydWVcbiAqIGNvbnNvbGUubG9nKG1peGVkIGluc3RhbmNlb2YgT3RoZXIpOyAgICAgICAgIC8vIGZhbHNlICFcbiAqXG4gKiAvLyBbQmVzdCBQcmFjdGljZV0gSWYgeW91IGRlY2xhcmUgdGhlIGRlcml2ZWQtY2xhc3MgZnJvbSBtaXhpbiwgeW91IHNob3VsZCBjYWxsIHRoZSBmdW5jdGlvbiBmb3IgYXZvaWRpbmcgYGluc3RhbmNlb2ZgIGxpbWl0YXRpb24uXG4gKiBjbGFzcyBEZXJpdmVkQ2xhc3MgZXh0ZW5kcyBNaXhpbkNsYXNzIHt9XG4gKiBzZXRNaXhDbGFzc0F0dHJpYnV0ZShEZXJpdmVkQ2xhc3MsICdpbnN0YW5jZU9mJyk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHNldCB0YXJnZXQgY29uc3RydWN0b3JcbiAqICAtIGBqYWAg6Kit5a6a5a++6LGh44Gu44Kz44Oz44K544OI44Op44Kv44K/XG4gKiBAcGFyYW0gYXR0clxuICogIC0gYGVuYDpcbiAqICAgIC0gYHByb3RvRXh0ZW5kc09ubHlgOiBTdXBwcmVzcyBwcm92aWRpbmcgY29uc3RydWN0b3ItdHJhcCBmb3IgdGhlIG1peGluIHNvdXJjZSBjbGFzcy4gKGZvciBpbXByb3ZpbmcgcGVyZm9ybWFuY2UpXG4gKiAgICAtIGBpbnN0YW5jZU9mYCAgICAgIDogZnVuY3Rpb24gYnkgdXNpbmcgW1N5bWJvbC5oYXNJbnN0YW5jZV0gPGJyPlxuICogICAgICAgICAgICAgICAgICAgICAgICAgIERlZmF1bHQgYmVoYXZpb3VyIGlzIGB7IHJldHVybiB0YXJnZXQucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5zdGFuY2UpIH1gXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgSWYgc2V0IGBudWxsYCwgZGVsZXRlIFtTeW1ib2wuaGFzSW5zdGFuY2VdIHByb3BlcnR5LlxuICogIC0gYGphYDpcbiAqICAgIC0gYHByb3RvRXh0ZW5kc09ubHlgOiBNaXhpbiBTb3VyY2Ug44Kv44Op44K544Gr5a++44GX44GmLCDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jg4jjg6njg4Pjg5fjgpLmipHmraIgKOODkeODleOCqeODvOODnuODs+OCueaUueWWhClcbiAqICAgIC0gYGluc3RhbmNlT2ZgICAgICAgOiBbU3ltYm9sLmhhc0luc3RhbmNlXSDjgYzkvb/nlKjjgZnjgovplqLmlbDjgpLmjIflrpogPGJyPlxuICogICAgICAgICAgICAgICAgICAgICAgICAgIOaXouWumuOBp+OBryBgeyByZXR1cm4gdGFyZ2V0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGluc3RhbmNlKSB9YCDjgYzkvb/nlKjjgZXjgozjgotcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIGBudWxsYCDmjIflrprjgpLjgZnjgovjgaggW1N5bWJvbC5oYXNJbnN0YW5jZV0g44OX44Ot44OR44OG44Kj44KS5YmK6Zmk44GZ44KLXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRNaXhDbGFzc0F0dHJpYnV0ZTxUIGV4dGVuZHMgb2JqZWN0LCBVIGV4dGVuZHMga2V5b2YgTWl4Q2xhc3NBdHRyaWJ1dGU+KFxuICAgIHRhcmdldDogQ29uc3RydWN0b3I8VD4sXG4gICAgYXR0cjogVSxcbiAgICBtZXRob2Q/OiBNaXhDbGFzc0F0dHJpYnV0ZVtVXVxuKTogdm9pZCB7XG4gICAgc3dpdGNoIChhdHRyKSB7XG4gICAgICAgIGNhc2UgJ3Byb3RvRXh0ZW5kc09ubHknOlxuICAgICAgICAgICAgdGFyZ2V0W19wcm90b0V4dGVuZHNPbmx5XSA9IHRydWU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnaW5zdGFuY2VPZic6XG4gICAgICAgICAgICBzZXRJbnN0YW5jZU9mKHRhcmdldCwgbWV0aG9kKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBNaXhpbiBmdW5jdGlvbiBmb3IgbXVsdGlwbGUgaW5oZXJpdGFuY2UuIDxicj5cbiAqICAgICBSZXNvbHZpbmcgdHlwZSBzdXBwb3J0IGZvciBtYXhpbXVtIDEwIGNsYXNzZXMuXG4gKiBAamEg5aSa6YeN57aZ5om/44Gu44Gf44KB44GuIE1peGluIDxicj5cbiAqICAgICDmnIDlpKcgMTAg44Kv44Op44K544Gu5Z6L6Kej5rG644KS44K144Od44O844OIXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjbGFzcyBCYXNlIHsgY29uc3RydWN0b3IoYSwgYikge30gfTtcbiAqIGNsYXNzIE1peEEgeyBjb25zdHJ1Y3RvcihhLCBiKSB7fSB9O1xuICogY2xhc3MgTWl4QiB7IGNvbnN0cnVjdG9yKGMsIGQpIHt9IH07XG4gKlxuICogY2xhc3MgTWl4aW5DbGFzcyBleHRlbmRzIG1peGlucyhCYXNlLCBNaXhBLCBNaXhCKSB7XG4gKiAgICAgY29uc3RydWN0b3IoYSwgYiwgYywgZCl7XG4gKiAgICAgICAgIC8vIGNhbGxpbmcgYEJhc2VgIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHN1cGVyKGEsIGIpO1xuICpcbiAqICAgICAgICAgLy8gY2FsbGluZyBNaXhpbiBjbGFzcydzIGNvbnN0cnVjdG9yXG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QSwgYSwgYik7XG4gKiAgICAgICAgIHRoaXMuc3VwZXIoTWl4QiwgYywgZCk7XG4gKiAgICAgfVxuICogfVxuICogYGBgXG4gKlxuICogQHBhcmFtIGJhc2VcbiAqICAtIGBlbmAgcHJpbWFyeSBiYXNlIGNsYXNzLiBzdXBlcihhcmdzKSBpcyB0aGlzIGNsYXNzJ3Mgb25lLlxuICogIC0gYGphYCDln7rlupXjgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr8uIOWQjOWQjeODl+ODreODkeODhuOCoywg44Oh44K944OD44OJ44Gv5pyA5YSq5YWI44GV44KM44KLLiBzdXBlcihhcmdzKSDjga/jgZPjga7jgq/jg6njgrnjga7jgoLjga7jgYzmjIflrprlj6/og70uXG4gKiBAcGFyYW0gc291cmNlc1xuICogIC0gYGVuYCBtdWx0aXBsZSBleHRlbmRzIGNsYXNzXG4gKiAgLSBgamFgIOaLoeW8teOCr+ODqeOCueOCs+ODs+OCueODiOODqeOCr+OCv1xuICogQHJldHVybnNcbiAqICAtIGBlbmAgbWl4aW5lZCBjbGFzcyBjb25zdHJ1Y3RvclxuICogIC0gYGphYCDlkIjmiJDjgZXjgozjgZ/jgq/jg6njgrnjgrPjg7Pjgrnjg4jjg6njgq/jgr9cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1peGluczxcbiAgICBCIGV4dGVuZHMgQ2xhc3MsXG4gICAgUzEgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzIgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzMgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzQgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzUgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzYgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzcgZXh0ZW5kcyBvYmplY3QsXG4gICAgUzggZXh0ZW5kcyBvYmplY3QsXG4gICAgUzkgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGJhc2U6IEIsXG4gICAgLi4uc291cmNlczogW1xuICAgICAgICBDb25zdHJ1Y3RvcjxTMT4sXG4gICAgICAgIENvbnN0cnVjdG9yPFMyPj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFMzPj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM0Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM1Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM2Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM3Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM4Pj8sXG4gICAgICAgIENvbnN0cnVjdG9yPFM5Pj8sXG4gICAgICAgIC4uLmFueVtdXG4gICAgXSk6IE1peGluQ29uc3RydWN0b3I8QiwgTWl4aW5DbGFzcyAmIEluc3RhbmNlVHlwZTxCPiAmIFMxICYgUzIgJiBTMyAmIFM0ICYgUzUgJiBTNiAmIFM3ICYgUzggJiBTOT4ge1xuXG4gICAgbGV0IF9oYXNTb3VyY2VDb25zdHJ1Y3RvciA9IGZhbHNlO1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uYW1pbmctY29udmVudGlvblxuICAgIGNsYXNzIF9NaXhpbkJhc2UgZXh0ZW5kcyAoYmFzZSBhcyB1bmtub3duIGFzIENvbnN0cnVjdG9yPE1peGluQ2xhc3M+KSB7XG5cbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBbX2NvbnN0cnVjdG9yc106IE1hcDxDb25zdHJ1Y3RvcjxvYmplY3Q+LCBVbmtub3duRnVuY3Rpb24gfCBudWxsPjtcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBbX2NsYXNzQmFzZV06IENvbnN0cnVjdG9yPG9iamVjdD47XG5cbiAgICAgICAgY29uc3RydWN0b3IoLi4uYXJnczogdW5rbm93bltdKSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29uc3RydWN0b3Itc3VwZXJcbiAgICAgICAgICAgIHN1cGVyKC4uLmFyZ3MpO1xuXG4gICAgICAgICAgICBjb25zdCBjb25zdHJ1Y3RvcnMgPSBuZXcgTWFwPENvbnN0cnVjdG9yPG9iamVjdD4sIFVua25vd25GdW5jdGlvbj4oKTtcbiAgICAgICAgICAgIHRoaXNbX2NvbnN0cnVjdG9yc10gPSBjb25zdHJ1Y3RvcnM7XG4gICAgICAgICAgICB0aGlzW19jbGFzc0Jhc2VdID0gYmFzZTtcblxuICAgICAgICAgICAgaWYgKF9oYXNTb3VyY2VDb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc3JjQ2xhc3Mgb2Ygc291cmNlcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXNyY0NsYXNzW19wcm90b0V4dGVuZHNPbmx5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFuZGxlciA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBseTogKHRhcmdldDogdW5rbm93biwgdGhpc29iajogdW5rbm93biwgYXJnbGlzdDogdW5rbm93bltdKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9iaiA9IG5ldyBzcmNDbGFzcyguLi5hcmdsaXN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29weVByb3BlcnRpZXModGhpcywgb2JqKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHJveHkgZm9yICdjb25zdHJ1Y3QnIGFuZCBjYWNoZSBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3RydWN0b3JzLnNldChzcmNDbGFzcywgbmV3IFByb3h5KHNyY0NsYXNzLCBoYW5kbGVyIGFzIFByb3h5SGFuZGxlcjxvYmplY3Q+KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBwcm90ZWN0ZWQgc3VwZXI8VCBleHRlbmRzIENsYXNzPihzcmNDbGFzczogVCwgLi4uYXJnczogQ29uc3RydWN0b3JQYXJhbWV0ZXJzPFQ+KTogdGhpcyB7XG4gICAgICAgICAgICBjb25zdCBtYXAgPSB0aGlzW19jb25zdHJ1Y3RvcnNdO1xuICAgICAgICAgICAgY29uc3QgY3RvciA9IG1hcC5nZXQoc3JjQ2xhc3MpO1xuICAgICAgICAgICAgaWYgKGN0b3IpIHtcbiAgICAgICAgICAgICAgICBjdG9yLmNhbGwodGhpcywgLi4uYXJncyk7XG4gICAgICAgICAgICAgICAgbWFwLnNldChzcmNDbGFzcywgbnVsbCk7ICAgIC8vIHByZXZlbnQgY2FsbGluZyB0d2ljZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgaXNNaXhlZFdpdGg8VCBleHRlbmRzIG9iamVjdD4oc3JjQ2xhc3M6IENvbnN0cnVjdG9yPFQ+KTogYm9vbGVhbiB7XG4gICAgICAgICAgICBpZiAodGhpcy5jb25zdHJ1Y3RvciA9PT0gc3JjQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXNbX2NsYXNzQmFzZV0gPT09IHNyY0NsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzW19jbGFzc1NvdXJjZXNdLnJlZHVjZSgocCwgYykgPT4gcCB8fCAoc3JjQ2xhc3MgPT09IGMpLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaWMgc3RhdGljIFtTeW1ib2wuaGFzSW5zdGFuY2VdKGluc3RhbmNlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mLmNhbGwoX01peGluQmFzZS5wcm90b3R5cGUsIGluc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHB1YmxpYyBbX2lzSW5oZXJpdGVkXTxUIGV4dGVuZHMgb2JqZWN0PihzcmNDbGFzczogQ29uc3RydWN0b3I8VD4pOiBib29sZWFuIHtcbiAgICAgICAgICAgIGNvbnN0IGN0b3JzID0gdGhpc1tfY29uc3RydWN0b3JzXTtcbiAgICAgICAgICAgIGlmIChjdG9ycy5oYXMoc3JjQ2xhc3MpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGN0b3Igb2YgY3RvcnMua2V5cygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZi5jYWxsKHNyY0NsYXNzLCBjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBwcml2YXRlIGdldCBbX2NsYXNzU291cmNlc10oKTogQ29uc3RydWN0b3I8b2JqZWN0PltdIHtcbiAgICAgICAgICAgIHJldHVybiBbLi4udGhpc1tfY29uc3RydWN0b3JzXS5rZXlzKCldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBzcmNDbGFzcyBvZiBzb3VyY2VzKSB7XG4gICAgICAgIC8vIHByb3ZpZGUgY3VzdG9tIGluc3RhbmNlb2ZcbiAgICAgICAgY29uc3QgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc3JjQ2xhc3MsIFN5bWJvbC5oYXNJbnN0YW5jZSk7XG4gICAgICAgIGlmICghZGVzYyB8fCBkZXNjLndyaXRhYmxlKSB7XG4gICAgICAgICAgICBjb25zdCBvcmdJbnN0YW5jZU9mID0gZGVzYyA/IHNyY0NsYXNzW1N5bWJvbC5oYXNJbnN0YW5jZV0gOiBfaW5zdGFuY2VPZjtcbiAgICAgICAgICAgIHNldEluc3RhbmNlT2Yoc3JjQ2xhc3MsIChpbnN0OiBvYmplY3QpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3JnSW5zdGFuY2VPZi5jYWxsKHNyY0NsYXNzLCBpbnN0KSB8fCAoKG51bGwgIT0gaW5zdCAmJiBpbnN0W19pc0luaGVyaXRlZF0pID8gaW5zdFtfaXNJbmhlcml0ZWRdKHNyY0NsYXNzKSA6IGZhbHNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIHByb3ZpZGUgcHJvdG90eXBlXG4gICAgICAgIGNvcHlQcm9wZXJ0aWVzKF9NaXhpbkJhc2UucHJvdG90eXBlLCBzcmNDbGFzcy5wcm90b3R5cGUpO1xuICAgICAgICBsZXQgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHNyY0NsYXNzLnByb3RvdHlwZSk7XG4gICAgICAgIHdoaWxlIChfb2JqUHJvdG90eXBlICE9PSBwYXJlbnQpIHtcbiAgICAgICAgICAgIGNvcHlQcm9wZXJ0aWVzKF9NaXhpbkJhc2UucHJvdG90eXBlLCBwYXJlbnQpO1xuICAgICAgICAgICAgcGFyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHBhcmVudCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2hlY2sgY29uc3RydWN0b3JcbiAgICAgICAgaWYgKCFfaGFzU291cmNlQ29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIF9oYXNTb3VyY2VDb25zdHJ1Y3RvciA9ICFzcmNDbGFzc1tfcHJvdG9FeHRlbmRzT25seV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gX01peGluQmFzZSBhcyBhbnk7XG59XG4iLCJpbXBvcnQgeyBkZWVwRXF1YWwgfSBmcm9tICcuL2RlZXAtY2lyY3VpdCc7XG5pbXBvcnQge1xuICAgIE5pbCxcbiAgICBXcml0YWJsZSxcbiAgICBpc0FycmF5LFxuICAgIGlzT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgY2xhc3NOYW1lLFxufSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBAZW4gQ2hlY2sgd2hldGhlciBpbnB1dCBzb3VyY2UgaGFzIGEgcHJvcGVydHkuXG4gKiBAamEg5YWl5Yqb5YWD44GM44OX44Ot44OR44OG44Kj44KS5oyB44Gj44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNyY1xuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzKHNyYzogdW5rbm93biwgcHJvcE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBudWxsICE9IHNyYyAmJiBpc09iamVjdChzcmMpICYmIChwcm9wTmFtZSBpbiBzcmMpO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgc2hhbGxvdyBjb3B5IG9mIGB0YXJnZXRgIHdoaWNoIGhhcyBvbmx5IGBwaWNrS2V5c2AuXG4gKiBAamEgYHBpY2tLZXlzYCDjgafmjIflrprjgZXjgozjgZ/jg5fjg63jg5Hjg4bjgqPjga7jgb/jgpLmjIHjgaQgYHRhcmdldGAg44GuIFNoYWxsb3cgQ29weSDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIGNvcHkgc291cmNlIG9iamVjdFxuICogIC0gYGphYCDjgrPjg5Tjg7zlhYPjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBwaWNrS2V5c1xuICogIC0gYGVuYCBjb3B5IHRhcmdldCBrZXlzXG4gKiAgLSBgamFgIOOCs+ODlOODvOWvvuixoeOBruOCreODvOS4gOimp1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGljazxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMga2V5b2YgVD4odGFyZ2V0OiBULCAuLi5waWNrS2V5czogS1tdKTogV3JpdGFibGU8UGljazxULCBLPj4ge1xuICAgIGlmICghdGFyZ2V0IHx8ICFpc09iamVjdCh0YXJnZXQpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYCR7Y2xhc3NOYW1lKHRhcmdldCl9IGlzIG5vdCBhbiBvYmplY3QuYCk7XG4gICAgfVxuICAgIHJldHVybiBwaWNrS2V5cy5yZWR1Y2UoKG9iaiwga2V5KSA9PiB7XG4gICAgICAgIGtleSBpbiB0YXJnZXQgJiYgKG9ialtrZXldID0gdGFyZ2V0W2tleV0pO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH0sIHt9IGFzIFdyaXRhYmxlPFBpY2s8VCwgSz4+KTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHNoYWxsb3cgY29weSBvZiBgdGFyZ2V0YCB3aXRob3V0IGBvbWl0S2V5c2AuXG4gKiBAamEgYG9taXRLZXlzYCDjgafmjIflrprjgZXjgozjgZ/jg5fjg63jg5Hjg4bjgqPku6XlpJbjga7jgq3jg7zjgpLmjIHjgaQgYHRhcmdldGAg44GuIFNoYWxsb3cgQ29weSDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIGNvcHkgc291cmNlIG9iamVjdFxuICogIC0gYGphYCDjgrPjg5Tjg7zlhYPjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBvbWl0S2V5c1xuICogIC0gYGVuYCBvbWl0IHRhcmdldCBrZXlzXG4gKiAgLSBgamFgIOWJiumZpOWvvuixoeOBruOCreODvOS4gOimp1xuICovXG5leHBvcnQgZnVuY3Rpb24gb21pdDxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMga2V5b2YgVD4odGFyZ2V0OiBULCAuLi5vbWl0S2V5czogS1tdKTogV3JpdGFibGU8T21pdDxULCBLPj4ge1xuICAgIGlmICghdGFyZ2V0IHx8ICFpc09iamVjdCh0YXJnZXQpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYCR7Y2xhc3NOYW1lKHRhcmdldCl9IGlzIG5vdCBhbiBvYmplY3QuYCk7XG4gICAgfVxuICAgIGNvbnN0IG9iaiA9IHt9IGFzIFdyaXRhYmxlPE9taXQ8VCwgSz4+O1xuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRhcmdldCkpIHtcbiAgICAgICAgIW9taXRLZXlzLmluY2x1ZGVzKGtleSBhcyBLKSAmJiAob2JqW2tleV0gPSB0YXJnZXRba2V5XSk7XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogQGVuIEludmVydCB0aGUga2V5cyBhbmQgdmFsdWVzIG9mIGFuIG9iamVjdC4gVGhlIHZhbHVlcyBtdXN0IGJlIHNlcmlhbGl6YWJsZS5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7jgq3jg7zjgajlgKTjgpLpgIbou6LjgZnjgosuIOOBmeOBueOBpuOBruWApOOBjOODpuODi+ODvOOCr+OBp+OBguOCi+OBk+OBqOOBjOWJjeaPkFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IG9iamVjdFxuICogIC0gYGphYCDlr77osaHjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGludmVydDxUIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0Pih0YXJnZXQ6IG9iamVjdCk6IFQge1xuICAgIGNvbnN0IHJlc3VsdCA9IHt9O1xuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRhcmdldCkpIHtcbiAgICAgICAgcmVzdWx0W3RhcmdldFtrZXldXSA9IGtleTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdCBhcyBUO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgc2hhbGxvdyBjb3B5IG9mIGRpZmZlcmVuY2UgYmV0d2VlbiBgYmFzZWAgYW5kIGBzcmNgLlxuICogQGphIGBiYXNlYCDjgaggYHNyY2Ag44Gu5beu5YiG44OX44Ot44OR44OG44Kj44KS44KC44Gk44Kq44OW44K444Kn44Kv44OI44GuIFNoYWxsb3cgQ29weSDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmFzZVxuICogIC0gYGVuYCBiYXNlIG9iamVjdFxuICogIC0gYGphYCDln7rmupbjgajjgarjgovjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIG9iamVjdFxuICogIC0gYGphYCDjgrPjg5Tjg7zlhYPjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpZmY8VCBleHRlbmRzIG9iamVjdD4oYmFzZTogVCwgc3JjOiBQYXJ0aWFsPFQ+KTogUGFydGlhbDxUPiB7XG4gICAgaWYgKCFiYXNlIHx8ICFpc09iamVjdChiYXNlKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGAke2NsYXNzTmFtZShiYXNlKX0gaXMgbm90IGFuIG9iamVjdC5gKTtcbiAgICB9XG4gICAgaWYgKCFzcmMgfHwgIWlzT2JqZWN0KHNyYykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHtjbGFzc05hbWUoc3JjKX0gaXMgbm90IGFuIG9iamVjdC5gKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXR2YWw6IFBhcnRpYWw8VD4gPSB7fTtcblxuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHNyYykpIHtcbiAgICAgICAgaWYgKCFkZWVwRXF1YWwoYmFzZVtrZXldLCBzcmNba2V5XSkpIHtcbiAgICAgICAgICAgIHJldHZhbFtrZXldID0gc3JjW2tleV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgc2hhbGxvdyBjb3B5IG9mIGBiYXNlYCB3aXRob3V0IGBkcm9wVmFsdWVgLlxuICogQGphIGBkcm9wVmFsdWVgIOOBp+aMh+WumuOBleOCjOOBn+ODl+ODreODkeODhuOCo+WApOS7peWkluOBruOCreODvOOCkuaMgeOBpCBgdGFyZ2V0YCDjga4gU2hhbGxvdyBDb3B5IOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBiYXNlXG4gKiAgLSBgZW5gIGJhc2Ugb2JqZWN0XG4gKiAgLSBgamFgIOWfuua6luOBqOOBquOCi+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIGRyb3BWYWx1ZXNcbiAqICAtIGBlbmAgdGFyZ2V0IHZhbHVlLiBkZWZhdWx0OiBgdW5kZWZpbmVkYC5cbiAqICAtIGBqYWAg5a++6LGh44Gu5YCkLiDml6LlrprlgKQ6IGB1bmRlZmluZWRgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkcm9wPFQgZXh0ZW5kcyBvYmplY3Q+KGJhc2U6IFQsIC4uLmRyb3BWYWx1ZXM6IHVua25vd25bXSk6IFBhcnRpYWw8VD4ge1xuICAgIGlmICghYmFzZSB8fCAhaXNPYmplY3QoYmFzZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHtjbGFzc05hbWUoYmFzZSl9IGlzIG5vdCBhbiBvYmplY3QuYCk7XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWVzID0gWy4uLmRyb3BWYWx1ZXNdO1xuICAgIGlmICghdmFsdWVzLmxlbmd0aCkge1xuICAgICAgICB2YWx1ZXMucHVzaCh1bmRlZmluZWQpO1xuICAgIH1cblxuICAgIGNvbnN0IHJldHZhbDogUGFydGlhbDxUPiA9IHsgLi4uYmFzZSB9O1xuXG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoYmFzZSkpIHtcbiAgICAgICAgZm9yIChjb25zdCB2YWwgb2YgdmFsdWVzKSB7XG4gICAgICAgICAgICBpZiAoZGVlcEVxdWFsKHZhbCwgcmV0dmFsW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJldHZhbFtrZXldO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLyoqXG4gKiBAZW4gSWYgdGhlIHZhbHVlIG9mIHRoZSBuYW1lZCBwcm9wZXJ0eSBpcyBhIGZ1bmN0aW9uIHRoZW4gaW52b2tlIGl0OyBvdGhlcndpc2UsIHJldHVybiBpdC5cbiAqIEBqYSBvYmplY3Qg44GuIHByb3BlcnR5IOOBjOODoeOCveODg+ODieOBquOCieOBneOBruWun+ihjOe1kOaenOOCkiwg44OX44Ot44OR44OG44Kj44Gq44KJ44Gd44Gu5YCk44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogLSBgZW5gIE9iamVjdCB0byBtYXliZSBpbnZva2UgZnVuY3Rpb24gYHByb3BlcnR5YCBvbi5cbiAqIC0gYGphYCDoqZXkvqHjgZnjgovjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBwcm9wZXJ0eVxuICogLSBgZW5gIFRoZSBmdW5jdGlvbiBieSBuYW1lIHRvIGludm9rZSBvbiBgb2JqZWN0YC5cbiAqIC0gYGphYCDoqZXkvqHjgZnjgovjg5fjg63jg5Hjg4bjgqPlkI1cbiAqIEBwYXJhbSBmYWxsYmFja1xuICogLSBgZW5gIFRoZSB2YWx1ZSB0byBiZSByZXR1cm5lZCBpbiBjYXNlIGBwcm9wZXJ0eWAgZG9lc24ndCBleGlzdCBvciBpcyB1bmRlZmluZWQuXG4gKiAtIGBqYWAg5a2Y5Zyo44GX44Gq44GL44Gj44Gf5aC05ZCI44GuIGZhbGxiYWNrIOWApFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzdWx0PFQgPSBhbnk+KHRhcmdldDogb2JqZWN0IHwgTmlsLCBwcm9wZXJ0eTogc3RyaW5nIHwgc3RyaW5nW10sIGZhbGxiYWNrPzogVCk6IFQgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICBjb25zdCBwcm9wcyA9IGlzQXJyYXkocHJvcGVydHkpID8gcHJvcGVydHkgOiBbcHJvcGVydHldO1xuICAgIGlmICghcHJvcHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBpc0Z1bmN0aW9uKGZhbGxiYWNrKSA/IGZhbGxiYWNrLmNhbGwodGFyZ2V0KSA6IGZhbGxiYWNrO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc29sdmUgPSAobzogdW5rbm93biwgcDogdW5rbm93bik6IHVua25vd24gPT4ge1xuICAgICAgICByZXR1cm4gaXNGdW5jdGlvbihwKSA/IHAuY2FsbChvKSA6IHA7XG4gICAgfTtcblxuICAgIGxldCBvYmogPSB0YXJnZXQ7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHByb3BzKSB7XG4gICAgICAgIGNvbnN0IHByb3AgPSBudWxsID09IG9iaiA/IHVuZGVmaW5lZCA6IG9ialtuYW1lXTtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gcHJvcCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUob2JqLCBmYWxsYmFjaykgYXMgVDtcbiAgICAgICAgfVxuICAgICAgICBvYmogPSByZXNvbHZlKG9iaiwgcHJvcCkgYXMgb2JqZWN0O1xuICAgIH1cbiAgICByZXR1cm4gb2JqIGFzIHVua25vd24gYXMgVDtcbn1cbiIsIi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIGNhbGxhYmxlKCk6IHVua25vd24ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdXNlLWJlZm9yZS1kZWZpbmVcbiAgICByZXR1cm4gYWNjZXNzaWJsZTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgYWNjZXNzaWJsZTogdW5rbm93biA9IG5ldyBQcm94eShjYWxsYWJsZSwge1xuICAgIGdldDogKHRhcmdldCwgbmFtZSkgPT4ge1xuICAgICAgICBjb25zdCBwcm9wID0gdGFyZ2V0W25hbWVdO1xuICAgICAgICBpZiAobnVsbCAhPSBwcm9wKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvcDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBhY2Nlc3NpYmxlO1xuICAgICAgICB9XG4gICAgfSxcbn0pO1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBjcmVhdGUoKTogdW5rbm93biB7XG4gICAgY29uc3Qgc3R1YiA9IG5ldyBQcm94eSh7fSwge1xuICAgICAgICBnZXQ6ICh0YXJnZXQsIG5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHByb3AgPSB0YXJnZXRbbmFtZV07XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBwcm9wKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb3A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2Nlc3NpYmxlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHN0dWIsICdzdHViJywge1xuICAgICAgICB2YWx1ZTogdHJ1ZSxcbiAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN0dWI7XG59XG5cbi8qKlxuICogQGVuIEdldCBzYWZlIGFjY2Vzc2libGUgb2JqZWN0LlxuICogQGphIOWuieWFqOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCquODluOCuOOCp+OCr+ODiOOBruWPluW+l1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3Qgc2FmZVdpbmRvdyA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuICogY29uc29sZS5sb2cobnVsbCAhPSBzYWZlV2luZG93LmRvY3VtZW50KTsgICAgLy8gdHJ1ZVxuICogY29uc3QgZGl2ID0gc2FmZVdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAqIGNvbnNvbGUubG9nKG51bGwgIT0gZGl2KTsgICAgLy8gdHJ1ZVxuICogYGBgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCBBIHJlZmVyZW5jZSBvZiBhbiBvYmplY3Qgd2l0aCBhIHBvc3NpYmlsaXR5IHdoaWNoIGV4aXN0cy5cbiAqICAtIGBqYWAg5a2Y5Zyo44GX44GG44KL44Kq44OW44K444Kn44Kv44OI44Gu5Y+C54WnXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZWFsaXR5IG9yIHN0dWIgaW5zdGFuY2UuXG4gKiAgLSBgamFgIOWun+S9k+OBvuOBn+OBr+OCueOCv+ODluOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FmZTxUPih0YXJnZXQ6IFQpOiBUIHtcbiAgICByZXR1cm4gdGFyZ2V0IHx8IGNyZWF0ZSgpIGFzIFQ7XG59XG4iLCJpbXBvcnQgeyBVbmtub3duRnVuY3Rpb24gfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGdldEdsb2JhbCB9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7IHNhZmUgfSBmcm9tICcuL3NhZmUnO1xuXG4vKipcbiAqIEBlbiBUeXBlIG9mIGhhbmRsZSBmb3IgdGltZXIgZnVuY3Rpb25zLlxuICogQGphIOOCv+OCpOODnuODvOmWouaVsOOBq+S9v+eUqOOBmeOCi+ODj+ODs+ODieODq+Wei1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRpbWVySGFuZGxlIHsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1pbnRlcmZhY2VcblxuLyoqXG4gKiBAZW4gVHlwZSBvZiB0aW1lciBzdGFydCBmdW5jdGlvbnMuXG4gKiBAamEg44K/44Kk44Oe44O86ZaL5aeL6Zai5pWw44Gu5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFRpbWVyU3RhcnRGdW5jdGlvbiA9IChoYW5kbGVyOiBVbmtub3duRnVuY3Rpb24sIHRpbWVvdXQ/OiBudW1iZXIsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gVGltZXJIYW5kbGU7XG5cbi8qKlxuICogQGVuIFR5cGUgb2YgdGltZXIgc3RvcCBmdW5jdGlvbnMuXG4gKiBAamEg44K/44Kk44Oe44O85YGc5q2i6Zai5pWw44Gu5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIFRpbWVyU3RvcEZ1bmN0aW9uID0gKGhhbmRsZTogVGltZXJIYW5kbGUpID0+IHZvaWQ7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBUaW1lckNvbnRleHQge1xuICAgIHNldFRpbWVvdXQ6IFRpbWVyU3RhcnRGdW5jdGlvbjtcbiAgICBjbGVhclRpbWVvdXQ6IFRpbWVyU3RvcEZ1bmN0aW9uO1xuICAgIHNldEludGVydmFsOiBUaW1lclN0YXJ0RnVuY3Rpb247XG4gICAgY2xlYXJJbnRlcnZhbDogVGltZXJTdG9wRnVuY3Rpb247XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Jvb3QgPSBnZXRHbG9iYWwoKSBhcyB1bmtub3duIGFzIFRpbWVyQ29udGV4dDtcbmNvbnN0IHNldFRpbWVvdXQ6IFRpbWVyU3RhcnRGdW5jdGlvbiAgID0gc2FmZShfcm9vdC5zZXRUaW1lb3V0KTtcbmNvbnN0IGNsZWFyVGltZW91dDogVGltZXJTdG9wRnVuY3Rpb24gID0gc2FmZShfcm9vdC5jbGVhclRpbWVvdXQpO1xuY29uc3Qgc2V0SW50ZXJ2YWw6IFRpbWVyU3RhcnRGdW5jdGlvbiAgPSBzYWZlKF9yb290LnNldEludGVydmFsKTtcbmNvbnN0IGNsZWFySW50ZXJ2YWw6IFRpbWVyU3RvcEZ1bmN0aW9uID0gc2FmZShfcm9vdC5jbGVhckludGVydmFsKTtcblxuZXhwb3J0IHtcbiAgICBzZXRUaW1lb3V0LFxuICAgIGNsZWFyVGltZW91dCxcbiAgICBzZXRJbnRlcnZhbCxcbiAgICBjbGVhckludGVydmFsLFxufTtcbiIsImltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIFByaW1pdGl2ZSxcbiAgICBUeXBlZERhdGEsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNPYmplY3QsXG59IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgaW52ZXJ0IH0gZnJvbSAnLi9vYmplY3QnO1xuaW1wb3J0IHtcbiAgICBUaW1lckhhbmRsZSxcbiAgICBzZXRUaW1lb3V0LFxuICAgIGNsZWFyVGltZW91dCxcbn0gZnJvbSAnLi90aW1lcic7XG5cbi8qKlxuICogQGVuIEVuc3VyZSBhc3luY2hyb25vdXMgZXhlY3V0aW9uLlxuICogQGphIOmdnuWQjOacn+Wun+ihjOOCkuS/neiovFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogdm9pZCBwb3N0KCgpID0+IGV4ZWMoYXJnKSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgaW1wbGVtZW50IGFzIGZ1bmN0aW9uIHNjb3BlLlxuICogIC0gYGphYCDplqLmlbDjgrnjgrPjg7zjg5fjgajjgZfjgablrp/oo4VcbiovXG5leHBvcnQgZnVuY3Rpb24gcG9zdDxUPihleGVjdXRvcjogKCkgPT4gVCk6IFByb21pc2U8VD4ge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGV4ZWN1dG9yKTtcbn1cblxuLyoqXG4gKiBAZW4gR2VuZXJpYyBOby1PcGVyYXRpb24uXG4gKiBAamEg5rGO55SoIE5vLU9wZXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9vcCguLi5hcmdzOiB1bmtub3duW10pOiBhbnkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycywgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIC8vIG5vb3Bcbn1cblxuLyoqXG4gKiBAZW4gV2FpdCBmb3IgdGhlIGRlc2lnbmF0aW9uIGVsYXBzZS5cbiAqIEBqYSDmjIflrprmmYLplpPlh6bnkIbjgpLlvoXmqZ9cbiAqXG4gKiBAcGFyYW0gZWxhcHNlXG4gKiAgLSBgZW5gIHdhaXQgZWxhcHNlIFttc2VjXS5cbiAqICAtIGBqYWAg5b6F5qmf5pmC6ZaTIFttc2VjXVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2xlZXAoZWxhcHNlOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIGVsYXBzZSkpO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIHdoZW4gaW52b2tlZCwgd2lsbCBvbmx5IGJlIHRyaWdnZXJlZCBhdCBtb3N0IG9uY2UgZHVyaW5nIGEgZ2l2ZW4gdGltZS5cbiAqIEBqYSDplqLmlbDjga7lrp/ooYzjgpIgd2FpdCBbbXNlY10g44GrMeWbnuOBq+WItumZkFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgdGhyb3R0bGVkID0gdGhyb3R0bGUodXBhdGVQb3NpdGlvbiwgMTAwKTtcbiAqICQod2luZG93KS5zY3JvbGwodGhyb3R0bGVkKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBzZWVkIGZ1bmN0aW9uLlxuICogIC0gYGphYCDlr77osaHjga7plqLmlbBcbiAqIEBwYXJhbSBlbGFwc2VcbiAqICAtIGBlbmAgd2FpdCBlbGFwc2UgW21zZWNdLlxuICogIC0gYGphYCDlvoXmqZ/mmYLplpMgW21zZWNdXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGhyb3R0bGU8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZXhlY3V0b3I6IFQsIGVsYXBzZTogbnVtYmVyLCBvcHRpb25zPzogeyBsZWFkaW5nPzogYm9vbGVhbjsgdHJhaWxpbmc/OiBib29sZWFuOyB9KTogVCAmIHsgY2FuY2VsKCk6IHZvaWQ7IH0ge1xuICAgIGNvbnN0IG9wdHMgPSBvcHRpb25zIHx8IHt9O1xuICAgIGxldCBoYW5kbGU6IFRpbWVySGFuZGxlIHwgdW5kZWZpbmVkO1xuICAgIGxldCBhcmdzOiB1bmtub3duW10gfCB1bmRlZmluZWQ7XG4gICAgbGV0IGNvbnRleHQ6IHVua25vd24sIHJlc3VsdDogdW5rbm93bjtcbiAgICBsZXQgcHJldmlvdXMgPSAwO1xuXG4gICAgY29uc3QgbGF0ZXIgPSBmdW5jdGlvbiAoKTogdm9pZCB7XG4gICAgICAgIHByZXZpb3VzID0gZmFsc2UgPT09IG9wdHMubGVhZGluZyA/IDAgOiBEYXRlLm5vdygpO1xuICAgICAgICBoYW5kbGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHJlc3VsdCA9IGV4ZWN1dG9yLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBpZiAoIWhhbmRsZSkge1xuICAgICAgICAgICAgY29udGV4dCA9IGFyZ3MgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgdGhyb3R0bGVkID0gZnVuY3Rpb24gKHRoaXM6IHVua25vd24sIC4uLmFyZzogdW5rbm93bltdKTogdW5rbm93biB7XG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIGlmICghcHJldmlvdXMgJiYgZmFsc2UgPT09IG9wdHMubGVhZGluZykge1xuICAgICAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVtYWluaW5nID0gZWxhcHNlIC0gKG5vdyAtIHByZXZpb3VzKTtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWludmFsaWQtdGhpc1xuICAgICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgICAgYXJncyA9IFsuLi5hcmddO1xuICAgICAgICBpZiAocmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gZWxhcHNlKSB7XG4gICAgICAgICAgICBpZiAoaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGhhbmRsZSk7XG4gICAgICAgICAgICAgICAgaGFuZGxlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgICAgICByZXN1bHQgPSBleGVjdXRvci5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICAgIGlmICghaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dCA9IGFyZ3MgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIWhhbmRsZSAmJiBmYWxzZSAhPT0gb3B0cy50cmFpbGluZykge1xuICAgICAgICAgICAgaGFuZGxlID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICB0aHJvdHRsZWQuY2FuY2VsID0gZnVuY3Rpb24gKCk6IHZvaWQge1xuICAgICAgICBjbGVhclRpbWVvdXQoaGFuZGxlIGFzIFRpbWVySGFuZGxlKTtcbiAgICAgICAgcHJldmlvdXMgPSAwO1xuICAgICAgICBoYW5kbGUgPSBjb250ZXh0ID0gYXJncyA9IHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHRocm90dGxlZCBhcyAoVCAmIHsgY2FuY2VsKCk6IHZvaWQ7IH0pO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIGFzIGxvbmcgYXMgaXQgY29udGludWVzIHRvIGJlIGludm9rZWQsIHdpbGwgbm90IGJlIHRyaWdnZXJlZC5cbiAqIEBqYSDlkbzjgbPlh7rjgZXjgozjgabjgYvjgokgd2FpdCBbbXNlY10g57WM6YGO44GZ44KL44G+44Gn5a6f6KGM44GX44Gq44GE6Zai5pWw44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIHNlZWQgZnVuY3Rpb24uXG4gKiAgLSBgamFgIOWvvuixoeOBrumWouaVsFxuICogQHBhcmFtIHdhaXRcbiAqICAtIGBlbmAgd2FpdCBlbGFwc2UgW21zZWNdLlxuICogIC0gYGphYCDlvoXmqZ/mmYLplpMgW21zZWNdXG4gKiBAcGFyYW0gaW1tZWRpYXRlXG4gKiAgLSBgZW5gIElmIGB0cnVlYCBpcyBwYXNzZWQsIHRyaWdnZXIgdGhlIGZ1bmN0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2UsIGluc3RlYWQgb2YgdGhlIHRyYWlsaW5nLlxuICogIC0gYGphYCBgdHJ1ZWAg44Gu5aC05ZCILCDliJ3lm57jga7jgrPjg7zjg6vjga/ljbPmmYLlrp/ooYxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlYm91bmNlPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGV4ZWN1dG9yOiBULCB3YWl0OiBudW1iZXIsIGltbWVkaWF0ZT86IGJvb2xlYW4pOiBUICYgeyBjYW5jZWwoKTogdm9pZDsgfSB7XG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8taW52YWxpZC10aGlzICovXG4gICAgbGV0IGhhbmRsZTogVGltZXJIYW5kbGUgfCB1bmRlZmluZWQ7XG4gICAgbGV0IHJlc3VsdDogdW5kZWZpbmVkO1xuXG4gICAgY29uc3QgbGF0ZXIgPSBmdW5jdGlvbiAoY29udGV4dDogdW5kZWZpbmVkLCBhcmdzOiB1bmRlZmluZWRbXSk6IHZvaWQge1xuICAgICAgICBoYW5kbGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChhcmdzKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBleGVjdXRvci5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBkZWJvdW5jZWQgPSBmdW5jdGlvbiAodGhpczogdW5kZWZpbmVkLCAuLi5hcmdzOiB1bmRlZmluZWRbXSk6IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChoYW5kbGUpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChoYW5kbGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbW1lZGlhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGNhbGxOb3cgPSAhaGFuZGxlO1xuICAgICAgICAgICAgaGFuZGxlID0gc2V0VGltZW91dChsYXRlciwgd2FpdCk7XG4gICAgICAgICAgICBpZiAoY2FsbE5vdykge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGV4ZWN1dG9yLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaGFuZGxlID0gc2V0VGltZW91dChsYXRlciwgd2FpdCwgdGhpcywgWy4uLmFyZ3NdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gZnVuY3Rpb24gKCk6IHZvaWQge1xuICAgICAgICBjbGVhclRpbWVvdXQoaGFuZGxlIGFzIFRpbWVySGFuZGxlKTtcbiAgICAgICAgaGFuZGxlID0gdW5kZWZpbmVkO1xuICAgIH07XG5cbiAgICByZXR1cm4gZGVib3VuY2VkIGFzIChUICYgeyBjYW5jZWwoKTogdm9pZDsgfSk7XG4gICAgLyogZXNsaW50LWVuYWJsZSBuby1pbnZhbGlkLXRoaXMgKi9cbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBhdCBtb3N0IG9uZSB0aW1lLCBubyBtYXR0ZXIgaG93IG9mdGVuIHlvdSBjYWxsIGl0LlxuICogQGphIDHluqbjgZfjgYvlrp/ooYzjgZXjgozjgarjgYTplqLmlbDjgpLov5TljbQuIDLlm57nm67ku6XpmY3jga/mnIDliJ3jga7jgrPjg7zjg6vjga7jgq3jg6Pjg4Pjgrfjg6XjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgc2VlZCBmdW5jdGlvbi5cbiAqICAtIGBqYWAg5a++6LGh44Gu6Zai5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvbmNlPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGV4ZWN1dG9yOiBUKTogVCB7XG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8taW52YWxpZC10aGlzLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uICovXG4gICAgbGV0IG1lbW86IHVua25vd247XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0aGlzOiB1bmtub3duLCAuLi5hcmdzOiB1bmtub3duW10pOiB1bmtub3duIHtcbiAgICAgICAgaWYgKGV4ZWN1dG9yKSB7XG4gICAgICAgICAgICBtZW1vID0gZXhlY3V0b3IuY2FsbCh0aGlzLCAuLi5hcmdzKTtcbiAgICAgICAgICAgIGV4ZWN1dG9yID0gbnVsbCE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgfSBhcyBUO1xuICAgIC8qIGVzbGludC1lbmFibGUgbm8taW52YWxpZC10aGlzLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uICovXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgZXNjYXBlIGZ1bmN0aW9uIGZyb20gbWFwLlxuICogQGphIOaWh+Wtl+e9ruaPm+mWouaVsOOCkuS9nOaIkFxuICpcbiAqIEBwYXJhbSBtYXBcbiAqICAtIGBlbmAga2V5OiB0YXJnZXQgY2hhciwgdmFsdWU6IHJlcGxhY2UgY2hhclxuICogIC0gYGphYCBrZXk6IOe9ruaPm+WvvuixoSwgdmFsdWU6IOe9ruaPm+aWh+Wtl1xuICogQHJldHVybnNcbiAqICAtIGBlbmAgZXNwYWNlIGZ1bmN0aW9uXG4gKiAgLSBgamFgIOOCqOOCueOCseODvOODl+mWouaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRXNjYXBlcihtYXA6IG9iamVjdCk6IChzcmM6IFByaW1pdGl2ZSkgPT4gc3RyaW5nIHtcbiAgICBjb25zdCBlc2NhcGVyID0gKG1hdGNoOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgICByZXR1cm4gbWFwW21hdGNoXTtcbiAgICB9O1xuXG4gICAgY29uc3Qgc291cmNlID0gYCg/OiR7T2JqZWN0LmtleXMobWFwKS5qb2luKCd8Jyl9KWA7XG4gICAgY29uc3QgcmVnZXhUZXN0ID0gUmVnRXhwKHNvdXJjZSk7XG4gICAgY29uc3QgcmVnZXhSZXBsYWNlID0gUmVnRXhwKHNvdXJjZSwgJ2cnKTtcblxuICAgIHJldHVybiAoc3JjOiBQcmltaXRpdmUpOiBzdHJpbmcgPT4ge1xuICAgICAgICBzcmMgPSAobnVsbCA9PSBzcmMgfHwgJ3N5bWJvbCcgPT09IHR5cGVvZiBzcmMpID8gJycgOiBTdHJpbmcoc3JjKTtcbiAgICAgICAgcmV0dXJuIHJlZ2V4VGVzdC50ZXN0KHNyYykgPyBzcmMucmVwbGFjZShyZWdleFJlcGxhY2UsIGVzY2FwZXIpIDogc3JjO1xuICAgIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1hcEh0bWxFc2NhcGUgPSB7XG4gICAgJzwnOiAnJmx0OycsXG4gICAgJz4nOiAnJmd0OycsXG4gICAgJyYnOiAnJmFtcDsnLFxuICAgICdcIic6ICcmcXVvdDsnLFxuICAgIFwiJ1wiOiAnJiMzOTsnLFxuICAgICdgJzogJyYjeDYwOydcbn07XG5cbi8qKlxuICogQGVuIEVzY2FwZSBIVE1MIHN0cmluZy5cbiAqIEBqYSBIVE1MIOOBp+S9v+eUqOOBmeOCi+aWh+Wtl+OCkuWItuW+oeaWh+Wtl+OBq+e9ruaPm1xuICpcbiAqIEBicmllZiA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IG1hcEh0bWxFc2NhcGUgPSB7XG4gKiAgICAgJzwnIDogJyZsdDsnLFxuICogICAgICc+JyA6ICcmZ3Q7JyxcbiAqICAgICAnJicgOiAnJmFtcDsnLFxuICogICAgICfigLMnOiAnJnF1b3Q7JyxcbiAqICAgICBgJ2AgOiAnJiMzOTsnLFxuICogICAgICdgJyA6ICcmI3g2MDsnXG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBlc2NhcGVIVE1MID0gY3JlYXRlRXNjYXBlcihtYXBIdG1sRXNjYXBlKTtcblxuLyoqXG4gKiBAZW4gVW5lc2NhcGUgSFRNTCBzdHJpbmcuXG4gKiBAamEgSFRNTCDjgafkvb/nlKjjgZnjgovliLblvqHmloflrZfjgpLlvqnlhYNcbiAqL1xuZXhwb3J0IGNvbnN0IHVuZXNjYXBlSFRNTCA9IGNyZWF0ZUVzY2FwZXIoaW52ZXJ0KG1hcEh0bWxFc2NhcGUpKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gdGhlIHN0eWxlIGNvbXB1bHNpb24gdmFsdWUgZnJvbSBpbnB1dCBzdHJpbmcuXG4gKiBAamEg5YWl5Yqb5paH5a2X5YiX44KS5Z6L5by35Yi244GX44Gf5YCk44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgaW5wdXQgc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WvvuixoeOBruaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9UeXBlZERhdGEoZGF0YTogc3RyaW5nIHwgdW5kZWZpbmVkKTogVHlwZWREYXRhIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoJ3RydWUnID09PSBkYXRhKSB7XG4gICAgICAgIC8vIGJvb2xlYW46IHRydWVcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICgnZmFsc2UnID09PSBkYXRhKSB7XG4gICAgICAgIC8vIGJvb2xlYW46IGZhbHNlXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKCdudWxsJyA9PT0gZGF0YSkge1xuICAgICAgICAvLyBudWxsXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoZGF0YSA9PT0gU3RyaW5nKE51bWJlcihkYXRhKSkpIHtcbiAgICAgICAgLy8gbnVtYmVyOiDmlbDlgKTlpInmj5sg4oaSIOaWh+Wtl+WIl+WkieaPm+OBp+WFg+OBq+aIu+OCi+OBqOOBjVxuICAgICAgICByZXR1cm4gTnVtYmVyKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSAmJiAvXig/Olxce1tcXHdcXFddKlxcfXxcXFtbXFx3XFxXXSpcXF0pJC8udGVzdChkYXRhKSkge1xuICAgICAgICAvLyBvYmplY3RcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc3RyaW5nIC8gdW5kZWZpbmVkXG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBzdHJpbmcgZnJvbSBbW1R5cGVkRGF0YV1dLlxuICogQGphIFtbVHlwZWREYXRhXV0g44KS5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgaW5wdXQgc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WvvuixoeOBruaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbVR5cGVkRGF0YShkYXRhOiBUeXBlZERhdGEgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGlmICh1bmRlZmluZWQgPT09IGRhdGEgfHwgaXNTdHJpbmcoZGF0YSkpIHtcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSBlbHNlIGlmIChpc09iamVjdChkYXRhKSkge1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFN0cmluZyhkYXRhKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gYFdlYiBBUElgIHN0b2NrZWQgdHlwZS4gPGJyPlxuICogICAgIEVuc3VyZSBub3QgdG8gcmV0dXJuIGB1bmRlZmluZWRgIHZhbHVlLlxuICogQGphIGBXZWIgQVBJYCDmoLzntI3lvaLlvI/jgavlpInmj5sgPGJyPlxuICogICAgIGB1bmRlZmluZWRgIOOCkui/lOWNtOOBl+OBquOBhOOBk+OBqOOCkuS/neiovFxuICovXG5leHBvcnQgZnVuY3Rpb24gZHJvcFVuZGVmaW5lZDxUPih2YWx1ZTogVCB8IG51bGwgfCB1bmRlZmluZWQsIG5pbFNlcmlhbGl6ZSA9IGZhbHNlKTogVCB8ICdudWxsJyB8ICd1bmRlZmluZWQnIHwgbnVsbCB7XG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWUgPyB2YWx1ZSA6IChuaWxTZXJpYWxpemUgPyBTdHJpbmcodmFsdWUpIDogbnVsbCkgYXMgVCB8ICdudWxsJyB8ICd1bmRlZmluZWQnIHwgbnVsbDtcbn1cblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemUgZnJvbSBgV2ViIEFQSWAgc3RvY2tlZCB0eXBlLiA8YnI+XG4gKiAgICAgQ29udmVydCBmcm9tICdudWxsJyBvciAndW5kZWZpbmVkJyBzdHJpbmcgdG8gb3JpZ2luYWwgdHlwZS5cbiAqIEBqYSAnbnVsbCcgb3IgJ3VuZGVmaW5lZCcg44KS44KC44Go44Gu5Z6L44Gr5oi744GZXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXN0b3JlTmlsPFQ+KHZhbHVlOiBUIHwgJ251bGwnIHwgJ3VuZGVmaW5lZCcpOiBUIHwgbnVsbCB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCdudWxsJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmICgndW5kZWZpbmVkJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqLyBsZXQgX2xvY2FsSWQgPSAwO1xuXG4vKipcbiAqIEBlbiBHZXQgbG9jYWwgdW5pcXVlIGlkLiA8YnI+XG4gKiAgICAgXCJsb2NhbCB1bmlxdWVcIiBtZWFucyBndWFyYW50ZWVzIHVuaXF1ZSBkdXJpbmcgaW4gc2NyaXB0IGxpZmUgY3ljbGUgb25seS5cbiAqIEBqYSDjg63jg7zjgqvjg6vjg6bjg4vjg7zjgq8gSUQg44Gu5Y+W5b6XIDxicj5cbiAqICAgICDjgrnjgq/jg6rjg5fjg4jjg6njgqTjg5XjgrXjgqTjgq/jg6vkuK3jga7lkIzkuIDmgKfjgpLkv53oqLzjgZnjgosuXG4gKlxuICogQHBhcmFtIHByZWZpeFxuICogIC0gYGVuYCBJRCBwcmVmaXhcbiAqICAtIGBqYWAgSUQg44Gr5LuY5LiO44GZ44KLIFByZWZpeFxuICogQHBhcmFtIHplcm9QYWRcbiAqICAtIGBlbmAgMCBwYWRkaW5nIG9yZGVyXG4gKiAgLSBgamFgIDAg6Kmw44KB44GZ44KL5qGB5pWw44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsdWlkKHByZWZpeCA9ICcnLCB6ZXJvUGFkPzogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBjb25zdCBpZCA9ICgrK19sb2NhbElkKS50b1N0cmluZygxNik7XG4gICAgcmV0dXJuIChudWxsICE9IHplcm9QYWQpID8gYCR7cHJlZml4fSR7aWQucGFkU3RhcnQoemVyb1BhZCwgJzAnKX1gIDogYCR7cHJlZml4fSR7aWR9YDtcbn1cblxuLyoqXG4gKiBAZW4gUmV0dXJucyBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gYDBgIGFuZCBgbWF4YCwgaW5jbHVzaXZlLlxuICogQGphIGAwYCAtIGBtYXhgIOOBruODqeODs+ODgOODoOOBruaVtOaVsOWApOOCkueUn+aIkFxuICpcbiAqIEBwYXJhbSBtYXhcbiAqICAtIGBlbmAgVGhlIG1heGltdW0gcmFuZG9tIG51bWJlci5cbiAqICAtIGBqYWAg5pW05pWw44Gu5pyA5aSn5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kb21JbnQobWF4OiBudW1iZXIpOiBudW1iZXI7XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIGBtaW5gIGFuZCBgbWF4YCwgaW5jbHVzaXZlLlxuICogQGphIGBtaW5gIC0gYG1heGAg44Gu44Op44Oz44OA44Og44Gu5pW05pWw5YCk44KS55Sf5oiQXG4gKlxuICogQHBhcmFtIG1pblxuICogIC0gYGVuYCBUaGUgbWF4aW11bSByYW5kb20gbnVtYmVyLlxuICogIC0gYGphYCDmlbTmlbDjga7mnIDlpKflgKRcbiAqIEBwYXJhbSBtYXhcbiAqICAtIGBlbmAgVGhlIG1heGltdW0gcmFuZG9tIG51bWJlci5cbiAqICAtIGBqYWAg5pW05pWw44Gu5pyA5aSn5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5kb21JbnQobWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmlmaWVkLXNpZ25hdHVyZXNcblxuZXhwb3J0IGZ1bmN0aW9uIHJhbmRvbUludChtaW46IG51bWJlciwgbWF4PzogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBpZiAobnVsbCA9PSBtYXgpIHtcbiAgICAgICAgbWF4ID0gbWluO1xuICAgICAgICBtaW4gPSAwO1xuICAgIH1cbiAgICByZXR1cm4gbWluICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3JlZ2V4Q2FuY2VsTGlrZVN0cmluZyA9IC8oYWJvcnR8Y2FuY2VsKS9pbTtcblxuLyoqXG4gKiBAZW4gUHJlc3VtZSB3aGV0aGVyIGl0J3MgYSBjYW5jZWxlZCBlcnJvci5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjgZXjgozjgZ/jgqjjg6njg7zjgafjgYLjgovjgYvmjqjlrppcbiAqXG4gKiBAcGFyYW0gZXJyb3JcbiAqICAtIGBlbmAgYW4gZXJyb3Igb2JqZWN0IGhhbmRsZWQgaW4gYGNhdGNoYCBibG9jay5cbiAqICAtIGBqYWAgYGNhdGNoYCDnr4Djgarjganjgafoo5zotrPjgZfjgZ/jgqjjg6njg7zjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQ2hhbmNlbExpa2VFcnJvcihlcnJvcjogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIGlmIChudWxsID09IGVycm9yKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKGVycm9yKSkge1xuICAgICAgICByZXR1cm4gX3JlZ2V4Q2FuY2VsTGlrZVN0cmluZy50ZXN0KGVycm9yKTtcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGVycm9yKSkge1xuICAgICAgICByZXR1cm4gX3JlZ2V4Q2FuY2VsTGlrZVN0cmluZy50ZXN0KChlcnJvciBhcyBFcnJvcikubWVzc2FnZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnRzIGZpcnN0IGxldHRlciBvZiB0aGUgc3RyaW5nIHRvIHVwcGVyY2FzZS5cbiAqIEBqYSDmnIDliJ3jga7mloflrZfjgpLlpKfmloflrZfjgavlpInmj5tcbiAqXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjYXBpdGFsaXplKFwiZm9vIEJhclwiKTtcbiAqIC8vID0+IFwiRm9vIEJhclwiXG4gKlxuICogY2FwaXRhbGl6ZShcIkZPTyBCYXJcIiwgdHJ1ZSk7XG4gKiAvLyA9PiBcIkZvbyBiYXJcIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICogQHBhcmFtIGxvd2VyY2FzZVJlc3RcbiAqICAtIGBlbmAgSWYgYHRydWVgIGlzIHBhc3NlZCwgdGhlIHJlc3Qgb2YgdGhlIHN0cmluZyB3aWxsIGJlIGNvbnZlcnRlZCB0byBsb3dlciBjYXNlXG4gKiAgLSBgamFgIGB0cnVlYCDjgpLmjIflrprjgZfjgZ/loLTlkIgsIDLmloflrZfnm67ku6XpmY3jgoLlsI/mloflrZfljJZcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhcGl0YWxpemUoc3JjOiBzdHJpbmcsIGxvd2VyY2FzZVJlc3QgPSBmYWxzZSk6IHN0cmluZyB7XG4gICAgY29uc3QgcmVtYWluaW5nQ2hhcnMgPSAhbG93ZXJjYXNlUmVzdCA/IHNyYy5zbGljZSgxKSA6IHNyYy5zbGljZSgxKS50b0xvd2VyQ2FzZSgpO1xuICAgIHJldHVybiBzcmMuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyByZW1haW5pbmdDaGFycztcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgZmlyc3QgbGV0dGVyIG9mIHRoZSBzdHJpbmcgdG8gbG93ZXJjYXNlLlxuICogQGphIOacgOWIneOBruaWh+Wtl+OCkuWwj+aWh+Wtl+WMllxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogZGVjYXBpdGFsaXplKFwiRm9vIEJhclwiKTtcbiAqIC8vID0+IFwiZm9vIEJhclwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWNhcGl0YWxpemUoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBzcmMuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyBzcmMuc2xpY2UoMSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnRzIHVuZGVyc2NvcmVkIG9yIGRhc2hlcml6ZWQgc3RyaW5nIHRvIGEgY2FtZWxpemVkIG9uZS4gPGJyPlxuICogICAgIEJlZ2lucyB3aXRoIGEgbG93ZXIgY2FzZSBsZXR0ZXIgdW5sZXNzIGl0IHN0YXJ0cyB3aXRoIGFuIHVuZGVyc2NvcmUsIGRhc2ggb3IgYW4gdXBwZXIgY2FzZSBsZXR0ZXIuXG4gKiBAamEgYF9gLCBgLWAg5Yy65YiH44KK5paH5a2X5YiX44KS44Kt44Oj44Oh44Or44Kx44O844K55YyWIDxicj5cbiAqICAgICBgLWAg44G+44Gf44Gv5aSn5paH5a2X44K544K/44O844OI44Gn44GC44KM44GwLCDlpKfmloflrZfjgrnjgr/jg7zjg4jjgYzml6LlrprlgKRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNhbWVsaXplKFwibW96LXRyYW5zZm9ybVwiKTtcbiAqIC8vID0+IFwibW96VHJhbnNmb3JtXCJcbiAqXG4gKiBjYW1lbGl6ZShcIi1tb3otdHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJNb3pUcmFuc2Zvcm1cIlxuICpcbiAqIGNhbWVsaXplKFwiX21vel90cmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIk1velRyYW5zZm9ybVwiXG4gKlxuICogY2FtZWxpemUoXCJNb3otdHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCJNb3pUcmFuc2Zvcm1cIlxuICpcbiAqIGNhbWVsaXplKFwiLW1vei10cmFuc2Zvcm1cIiwgdHJ1ZSk7XG4gKiAvLyA9PiBcIm1velRyYW5zZm9ybVwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKiBAcGFyYW0gbG93ZXJcbiAqICAtIGBlbmAgSWYgYHRydWVgIGlzIHBhc3NlZCwgZm9yY2UgY29udmVydHMgdG8gbG93ZXIgY2FtZWwgY2FzZSBpbiBzdGFydHMgd2l0aCB0aGUgc3BlY2lhbCBjYXNlLlxuICogIC0gYGphYCDlvLfliLbnmoTjgavlsI/mloflrZfjgrnjgr/jg7zjg4jjgZnjgovloLTlkIjjgavjga8gYHRydWVgIOOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FtZWxpemUoc3JjOiBzdHJpbmcsIGxvd2VyID0gZmFsc2UpOiBzdHJpbmcge1xuICAgIHNyYyA9IHNyYy50cmltKCkucmVwbGFjZSgvWy1fXFxzXSsoLik/L2csIChtYXRjaCwgYykgPT4ge1xuICAgICAgICByZXR1cm4gYyA/IGMudG9VcHBlckNhc2UoKSA6ICcnO1xuICAgIH0pO1xuXG4gICAgaWYgKHRydWUgPT09IGxvd2VyKSB7XG4gICAgICAgIHJldHVybiBkZWNhcGl0YWxpemUoc3JjKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gc3JjO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgc3RyaW5nIHRvIGNhbWVsaXplZCBjbGFzcyBuYW1lLiBGaXJzdCBsZXR0ZXIgaXMgYWx3YXlzIHVwcGVyIGNhc2UuXG4gKiBAamEg5YWI6aCt5aSn5paH5a2X44Gu44Kt44Oj44Oh44Or44Kx44O844K544Gr5aSJ5o+bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjbGFzc2lmeShcInNvbWVfY2xhc3NfbmFtZVwiKTtcbiAqIC8vID0+IFwiU29tZUNsYXNzTmFtZVwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGFzc2lmeShzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGNhcGl0YWxpemUoY2FtZWxpemUoc3JjLnJlcGxhY2UoL1tcXFdfXS9nLCAnICcpKS5yZXBsYWNlKC9cXHMvZywgJycpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgYSBjYW1lbGl6ZWQgb3IgZGFzaGVyaXplZCBzdHJpbmcgaW50byBhbiB1bmRlcnNjb3JlZCBvbmUuXG4gKiBAamEg44Kt44Oj44Oh44Or44Kx44O844K5IG9yIGAtYCDjgaTjgarjgY7mloflrZfliJfjgpIgYF9gIOOBpOOBquOBjuOBq+WkieaPm1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogdW5kZXJzY29yZWQoXCJNb3pUcmFuc2Zvcm1cIik7XG4gKiAvLyA9PiBcIm1vel90cmFuc2Zvcm1cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2Ugc3RyaW5nXG4gKiAgLSBgamFgIOWkieaPm+WFg+aWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdW5kZXJzY29yZWQoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBzcmMudHJpbSgpLnJlcGxhY2UoLyhbYS16XFxkXSkoW0EtWl0rKS9nLCAnJDFfJDInKS5yZXBsYWNlKC9bLVxcc10rL2csICdfJykudG9Mb3dlckNhc2UoKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydHMgYSB1bmRlcnNjb3JlZCBvciBjYW1lbGl6ZWQgc3RyaW5nIGludG8gYW4gZGFzaGVyaXplZCBvbmUuXG4gKiBAamEg44Kt44Oj44Oh44Or44Kx44O844K5IG9yIGBfYCDjgaTjgarjgY7mloflrZfliJfjgpIgYC1gIOOBpOOBquOBjuOBq+WkieaPm1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogZGFzaGVyaXplKFwiTW96VHJhbnNmb3JtXCIpO1xuICogLy8gPT4gXCItbW96LXRyYW5zZm9ybVwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBzdHJpbmdcbiAqICAtIGBqYWAg5aSJ5o+b5YWD5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXNoZXJpemUoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBzcmMudHJpbSgpLnJlcGxhY2UoLyhbQS1aXSkvZywgJy0kMScpLnJlcGxhY2UoL1tfXFxzXSsvZywgJy0nKS50b0xvd2VyQ2FzZSgpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBuby1pbnZhbGlkLXRoaXNcbiAqL1xuXG5pbXBvcnQgeyByYW5kb21JbnQgfSBmcm9tICcuL21pc2MnO1xuXG5jb25zdCB7XG4gICAgLyoqIEBpbnRlcm5hbCAqLyByYW5kb21cbn0gPSBNYXRoO1xuXG4vKipcbiAqIEBlbiBFeGVjdXRlIHNodWZmbGUgb2YgYW4gYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6YWN5YiX6KaB57Sg44Gu44K344Oj44OD44OV44OrXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBkZXN0cnVjdGl2ZVxuICogIC0gYGVuYCB0cnVlOiBkZXN0cnVjdGl2ZSAvIGZhbHNlOiBub24tZGVzdHJ1Y3RpdmUgKGRlZmF1bHQpXG4gKiAgLSBgamFgIHRydWU6IOegtOWjiueahCAvIGZhbHNlOiDpnZ7noLTlo4rnmoQgKOaXouWumilcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGU8VD4oYXJyYXk6IFRbXSwgZGVzdHJ1Y3RpdmUgPSBmYWxzZSk6IFRbXSB7XG4gICAgY29uc3Qgc291cmNlID0gZGVzdHJ1Y3RpdmUgPyBhcnJheSA6IGFycmF5LnNsaWNlKCk7XG4gICAgY29uc3QgbGVuID0gc291cmNlLmxlbmd0aDtcbiAgICBmb3IgKGxldCBpID0gbGVuID4gMCA/IGxlbiA+Pj4gMCA6IDA7IGkgPiAxOykge1xuICAgICAgICBjb25zdCBqID0gaSAqIHJhbmRvbSgpID4+PiAwO1xuICAgICAgICBjb25zdCBzd2FwID0gc291cmNlWy0taV07XG4gICAgICAgIHNvdXJjZVtpXSA9IHNvdXJjZVtqXTtcbiAgICAgICAgc291cmNlW2pdID0gc3dhcDtcbiAgICB9XG4gICAgcmV0dXJuIHNvdXJjZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEV4ZWN1dGUgc3RhYmxlIHNvcnQgYnkgbWVyZ2Utc29ydCBhbGdvcml0aG0uXG4gKiBAamEgYG1lcmdlLXNvcnRgIOOBq+OCiOOCi+WuieWumuOCveODvOODiFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY29tcGFyYXRvclxuICogIC0gYGVuYCBzb3J0IGNvbXBhcmF0b3IgZnVuY3Rpb25cbiAqICAtIGBqYWAg44K944O844OI6Zai5pWw44KS5oyH5a6aXG4gKiBAcGFyYW0gZGVzdHJ1Y3RpdmVcbiAqICAtIGBlbmAgdHJ1ZTogZGVzdHJ1Y3RpdmUgLyBmYWxzZTogbm9uLWRlc3RydWN0aXZlIChkZWZhdWx0KVxuICogIC0gYGphYCB0cnVlOiDnoLTlo4rnmoQgLyBmYWxzZTog6Z2e56C05aOK55qEICjml6LlrpopXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzb3J0PFQ+KGFycmF5OiBUW10sIGNvbXBhcmF0b3I6IChsaHM6IFQsIHJoczogVCkgPT4gbnVtYmVyLCBkZXN0cnVjdGl2ZSA9IGZhbHNlKTogVFtdIHtcbiAgICBjb25zdCBzb3VyY2UgPSBkZXN0cnVjdGl2ZSA/IGFycmF5IDogYXJyYXkuc2xpY2UoKTtcbiAgICBpZiAoc291cmNlLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICB9XG4gICAgY29uc3QgbGhzID0gc29ydChzb3VyY2Uuc3BsaWNlKDAsIHNvdXJjZS5sZW5ndGggPj4+IDEpLCBjb21wYXJhdG9yLCB0cnVlKTtcbiAgICBjb25zdCByaHMgPSBzb3J0KHNvdXJjZS5zcGxpY2UoMCksIGNvbXBhcmF0b3IsIHRydWUpO1xuICAgIHdoaWxlIChsaHMubGVuZ3RoICYmIHJocy5sZW5ndGgpIHtcbiAgICAgICAgc291cmNlLnB1c2goY29tcGFyYXRvcihsaHNbMF0sIHJoc1swXSkgPD0gMCA/IGxocy5zaGlmdCgpIGFzIFQgOiByaHMuc2hpZnQoKSBhcyBUKTtcbiAgICB9XG4gICAgcmV0dXJuIHNvdXJjZS5jb25jYXQobGhzLCByaHMpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWFrZSB1bmlxdWUgYXJyYXkuXG4gKiBAamEg6YeN6KSH6KaB57Sg44Gu44Gq44GE6YWN5YiX44Gu5L2c5oiQXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuaXF1ZTxUPihhcnJheTogVFtdKTogVFtdIHtcbiAgICByZXR1cm4gWy4uLm5ldyBTZXQoYXJyYXkpXTtcbn1cblxuLyoqXG4gKiBAZW4gTWFrZSB1bmlvbiBhcnJheS5cbiAqIEBqYSDphY3liJfjga7lkozpm4blkIjjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gYXJyYXlzXG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheXNcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiX576kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmlvbjxUPiguLi5hcnJheXM6IFRbXVtdKTogVFtdIHtcbiAgICByZXR1cm4gdW5pcXVlKGFycmF5cy5mbGF0KCkpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSBtb2RlbCBhdCB0aGUgZ2l2ZW4gaW5kZXguIElmIG5lZ2F0aXZlIHZhbHVlIGlzIGdpdmVuLCB0aGUgdGFyZ2V0IHdpbGwgYmUgZm91bmQgZnJvbSB0aGUgbGFzdCBpbmRleC5cbiAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgavjgojjgovjg6Ljg4fjg6vjgbjjga7jgqLjgq/jgrvjgrkuIOiyoOWApOOBruWgtOWQiOOBr+acq+WwvuaknOe0ouOCkuWun+ihjFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBlbmAgQSB6ZXJvLWJhc2VkIGludGVnZXIgaW5kaWNhdGluZyB3aGljaCBlbGVtZW50IHRvIHJldHJpZXZlLiA8YnI+IElmIG5lZ2F0aXZlIGluZGV4IGlzIGNvdW50ZWQgZnJvbSB0aGUgZW5kIG9mIHRoZSBtYXRjaGVkIHNldC5cbiAqICAtIGBqYWAgMCBiYXNlIOOBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumiA8YnI+IOiyoOWApOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiCwg5pyr5bC+44GL44KJ44Gu44Kk44Oz44OH44OD44Kv44K544Go44GX44Gm6Kej6YeI44GV44KM44KLXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhdDxUPihhcnJheTogVFtdLCBpbmRleDogbnVtYmVyKTogVCB8IG5ldmVyIHtcbiAgICBjb25zdCBpZHggPSBNYXRoLnRydW5jKGluZGV4KTtcbiAgICBjb25zdCBlbCA9IGlkeCA8IDAgPyBhcnJheVtpZHggKyBhcnJheS5sZW5ndGhdIDogYXJyYXlbaWR4XTtcbiAgICBpZiAobnVsbCA9PSBlbCkge1xuICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgaW52YWxpZCBhcnJheSBpbmRleC4gW2xlbmd0aDogJHthcnJheS5sZW5ndGh9LCBnaXZlbjogJHtpbmRleH1dYCk7XG4gICAgfVxuICAgIHJldHVybiBlbDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1ha2UgaW5kZXggYXJyYXkuXG4gKiBAamEg44Kk44Oz44OH44OD44Kv44K56YWN5YiX44Gu5L2c5oiQXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBleGNsdWRlc1xuICogIC0gYGVuYCBleGNsdWRlIGluZGV4IGluIHJldHVybiB2YWx1ZS5cbiAqICAtIGBqYWAg5oi744KK5YCk6YWN5YiX44Gr5ZCr44KB44Gq44GE44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbmRpY2VzPFQ+KGFycmF5OiBUW10sIC4uLmV4Y2x1ZGVzOiBudW1iZXJbXSk6IG51bWJlcltdIHtcbiAgICBjb25zdCByZXR2YWwgPSBbLi4uYXJyYXkua2V5cygpXTtcblxuICAgIGNvbnN0IGxlbiA9IGFycmF5Lmxlbmd0aDtcbiAgICBjb25zdCBleExpc3QgPSBbLi4ubmV3IFNldChleGNsdWRlcyldLnNvcnQoKGxocywgcmhzKSA9PiBsaHMgPCByaHMgPyAxIDogLTEpO1xuICAgIGZvciAoY29uc3QgZXggb2YgZXhMaXN0KSB7XG4gICAgICAgIGlmICgwIDw9IGV4ICYmIGV4IDwgbGVuKSB7XG4gICAgICAgICAgICByZXR2YWwuc3BsaWNlKGV4LCAxKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBbW2dyb3VwQnldXSgpIG9wdGlvbnMgZGVmaW5pdGlvbi5cbiAqIEBqYSBbW2dyb3VwQnldXSgpIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEdyb3VwQnlPcHRpb25zPFxuICAgIFQgZXh0ZW5kcyBvYmplY3QsXG4gICAgVEtFWVMgZXh0ZW5kcyBrZXlvZiBULFxuICAgIFRTVU1LRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUR1JPVVBLRVkgZXh0ZW5kcyBzdHJpbmdcbj4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBgR1JPVVAgQllgIGtleXMuXG4gICAgICogQGphIGBHUk9VUCBCWWAg44Gr5oyH5a6a44GZ44KL44Kt44O8XG4gICAgICovXG4gICAga2V5czogRXh0cmFjdDxUS0VZUywgc3RyaW5nPltdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFnZ3JlZ2F0YWJsZSBrZXlzLlxuICAgICAqIEBqYSDpm4boqIjlj6/og73jgarjgq3jg7zkuIDopqdcbiAgICAgKi9cbiAgICBzdW1LZXlzPzogRXh0cmFjdDxUU1VNS0VZUywgc3RyaW5nPltdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdyb3VwZWQgaXRlbSBhY2Nlc3Mga2V5LiBkZWZhdWx0OiAnaXRlbXMnLFxuICAgICAqIEBqYSDjgrDjg6vjg7zjg5Tjg7PjgrDjgZXjgozjgZ/opoHntKDjgbjjga7jgqLjgq/jgrvjgrnjgq3jg7wuIOaXouWumjogJ2l0ZW1zJ1xuICAgICAqL1xuICAgIGdyb3VwS2V5PzogVEdST1VQS0VZO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm4gdHlwZSBvZiBbW2dyb3VwQnldXSgpLlxuICogQGphIFtbZ3JvdXBCeV1dKCkg44GM6L+U5Y2044GZ44KL5Z6LXG4gKi9cbmV4cG9ydCB0eXBlIEdyb3VwQnlSZXR1cm5WYWx1ZTxcbiAgICBUIGV4dGVuZHMgb2JqZWN0LFxuICAgIFRLRVlTIGV4dGVuZHMga2V5b2YgVCxcbiAgICBUU1VNS0VZUyBleHRlbmRzIGtleW9mIFQgPSBuZXZlcixcbiAgICBUR1JPVVBLRVkgZXh0ZW5kcyBzdHJpbmcgPSAnaXRlbXMnXG4+ID0gUmVhZG9ubHk8UmVjb3JkPFRLRVlTLCB1bmtub3duPiAmIFJlY29yZDxUU1VNS0VZUywgdW5rbm93bj4gJiBSZWNvcmQ8VEdST1VQS0VZLCBUW10+PjtcblxuLyoqXG4gKiBAZW4gRXhlY3V0ZSBgR1JPVVAgQllgIGZvciBhcnJheSBlbGVtZW50cy5cbiAqIEBqYSDphY3liJfjga7opoHntKDjga4gYEdST1VQIEJZYCDpm4blkIjjgpLmir3lh7pcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgYEdST1VQIEJZYCBvcHRpb25zXG4gKiAgLSBgamFgIGBHUk9VUCBCWWAg44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBncm91cEJ5PFxuICAgIFQgZXh0ZW5kcyBvYmplY3QsXG4gICAgVEtFWVMgZXh0ZW5kcyBrZXlvZiBULFxuICAgIFRTVU1LRVlTIGV4dGVuZHMga2V5b2YgVCA9IG5ldmVyLFxuICAgIFRHUk9VUEtFWSBleHRlbmRzIHN0cmluZyA9ICdpdGVtcydcbj4oYXJyYXk6IFRbXSwgb3B0aW9uczogR3JvdXBCeU9wdGlvbnM8VCwgVEtFWVMsIFRTVU1LRVlTLCBUR1JPVVBLRVk+KTogR3JvdXBCeVJldHVyblZhbHVlPFQsIFRLRVlTLCBUU1VNS0VZUywgVEdST1VQS0VZPltdIHtcbiAgICBjb25zdCB7IGtleXMsIHN1bUtleXMsIGdyb3VwS2V5IH0gPSBvcHRpb25zO1xuICAgIGNvbnN0IF9ncm91cEtleSA9IGdyb3VwS2V5IHx8ICdpdGVtcyc7XG4gICAgY29uc3QgX3N1bUtleXM6IHN0cmluZ1tdID0gc3VtS2V5cyB8fCBbXTtcbiAgICBfc3VtS2V5cy5wdXNoKF9ncm91cEtleSk7XG5cbiAgICBjb25zdCBoYXNoID0gYXJyYXkucmVkdWNlKChyZXM6IFQsIGRhdGE6IFQpID0+IHtcbiAgICAgICAgLy8gY3JlYXRlIGdyb3VwQnkgaW50ZXJuYWwga2V5XG4gICAgICAgIGNvbnN0IF9rZXkgPSBrZXlzLnJlZHVjZSgocywgaykgPT4gcyArIFN0cmluZyhkYXRhW2tdKSwgJycpO1xuXG4gICAgICAgIC8vIGluaXQga2V5c1xuICAgICAgICBpZiAoIShfa2V5IGluIHJlcykpIHtcbiAgICAgICAgICAgIGNvbnN0IGtleUxpc3QgPSBrZXlzLnJlZHVjZSgoaCwgazogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgaFtrXSA9IGRhdGFba107XG4gICAgICAgICAgICAgICAgcmV0dXJuIGg7XG4gICAgICAgICAgICB9LCB7fSk7XG5cbiAgICAgICAgICAgIHJlc1tfa2V5XSA9IF9zdW1LZXlzLnJlZHVjZSgoaCwgazogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgaFtrXSA9IDA7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGg7XG4gICAgICAgICAgICB9LCBrZXlMaXN0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc0tleSA9IHJlc1tfa2V5XTtcblxuICAgICAgICAvLyBzdW0gcHJvcGVydGllc1xuICAgICAgICBmb3IgKGNvbnN0IGsgb2YgX3N1bUtleXMpIHtcbiAgICAgICAgICAgIGlmIChfZ3JvdXBLZXkgPT09IGspIHtcbiAgICAgICAgICAgICAgICByZXNLZXlba10gPSByZXNLZXlba10gfHwgW107XG4gICAgICAgICAgICAgICAgcmVzS2V5W2tdLnB1c2goZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc0tleVtrXSArPSBkYXRhW2tdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9LCB7fSk7XG5cbiAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyhoYXNoKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbXB1dGVzIHRoZSBsaXN0IG9mIHZhbHVlcyB0aGF0IGFyZSB0aGUgaW50ZXJzZWN0aW9uIG9mIGFsbCB0aGUgYXJyYXlzLiBFYWNoIHZhbHVlIGluIHRoZSByZXN1bHQgaXMgcHJlc2VudCBpbiBlYWNoIG9mIHRoZSBhcnJheXMuXG4gKiBAamEg6YWN5YiX44Gu56mN6ZuG5ZCI44KS6L+U5Y20LiDov5TljbTjgZXjgozjgZ/phY3liJfjga7opoHntKDjga/jgZnjgbnjgabjga7lhaXlipvjgZXjgozjgZ/phY3liJfjgavlkKvjgb7jgozjgotcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnNvbGUubG9nKGludGVyc2VjdGlvbihbMSwgMiwgM10sIFsxMDEsIDIsIDEsIDEwXSwgWzIsIDFdKSk7XG4gKiAvLyA9PiBbMSwgMl1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheXNcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gaW50ZXJzZWN0aW9uPFQ+KC4uLmFycmF5czogVFtdW10pOiBUW10ge1xuICAgIHJldHVybiBhcnJheXMucmVkdWNlKChhY2MsIGFyeSkgPT4gYWNjLmZpbHRlcihlbCA9PiBhcnkuaW5jbHVkZXMoZWwpKSk7XG59XG5cbi8qKlxuICogQGVuIFJldHVybnMgdGhlIHZhbHVlcyBmcm9tIGFycmF5IHRoYXQgYXJlIG5vdCBwcmVzZW50IGluIHRoZSBvdGhlciBhcnJheXMuXG4gKiBAamEg6YWN5YiX44GL44KJ44G744GL44Gu6YWN5YiX44Gr5ZCr44G+44KM44Gq44GE44KC44Gu44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zb2xlLmxvZyhkaWZmZXJlbmNlKFsxLCAyLCAzLCA0LCA1XSwgWzUsIDIsIDEwXSkpO1xuICogLy8gPT4gWzEsIDMsIDRdXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIG90aGVyc1xuICogIC0gYGVuYCBleGNsdWRlIGVsZW1lbnQgaW4gcmV0dXJuIHZhbHVlLlxuICogIC0gYGphYCDmiLvjgorlgKTphY3liJfjgavlkKvjgoHjgarjgYTopoHntKDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpZmZlcmVuY2U8VD4oYXJyYXk6IFRbXSwgLi4ub3RoZXJzOiBUW11bXSk6IFRbXSB7XG4gICAgY29uc3QgYXJyYXlzID0gW2FycmF5LCAuLi5vdGhlcnNdIGFzIFRbXVtdO1xuICAgIHJldHVybiBhcnJheXMucmVkdWNlKChhY2MsIGFyeSkgPT4gYWNjLmZpbHRlcihlbCA9PiAhYXJ5LmluY2x1ZGVzKGVsKSkpO1xufVxuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgY29weSBvZiB0aGUgYXJyYXkgd2l0aCBhbGwgaW5zdGFuY2VzIG9mIHRoZSB2YWx1ZXMgcmVtb3ZlZC5cbiAqIEBqYSDphY3liJfjgYvjgonmjIflrpropoHntKDjgpLlj5bjgorpmaTjgYTjgZ/jgoLjga7jgpLov5TljbRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnNvbGUubG9nKHdpdGhvdXQoWzEsIDIsIDEsIDAsIDMsIDEsIDRdLCAwLCAxKSk7XG4gKiAvLyA9PiBbMiwgMywgNF1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gdmFsdWVzXG4gKiAgLSBgZW5gIGV4Y2x1ZGUgZWxlbWVudCBpbiByZXR1cm4gdmFsdWUuXG4gKiAgLSBgamFgIOaIu+OCiuWApOmFjeWIl+OBq+WQq+OCgeOBquOBhOimgee0oOOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aG91dDxUPihhcnJheTogVFtdLCAuLi52YWx1ZXM6IFRbXSk6IFRbXSB7XG4gICAgcmV0dXJuIGRpZmZlcmVuY2UoYXJyYXksIHZhbHVlcyk7XG59XG5cbi8qKlxuICogQGVuIFByb2R1Y2UgYSByYW5kb20gc2FtcGxlIGZyb20gdGhlIGxpc3QuXG4gKiBAamEg44Op44Oz44OA44Og44Gr44K144Oz44OX44Or5YCk44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zb2xlLmxvZyhzYW1wbGUoWzEsIDIsIDMsIDQsIDUsIDZdLCAzKSk7XG4gKiAvLyA9PiBbMSwgNiwgMl1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY291bnRcbiAqICAtIGBlbmAgbnVtYmVyIG9mIHNhbXBsaW5nIGNvdW50LlxuICogIC0gYGphYCDov5TljbTjgZnjgovjgrXjg7Pjg5fjg6vmlbDjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhbXBsZTxUPihhcnJheTogVFtdLCBjb3VudDogbnVtYmVyKTogVFtdO1xuXG4vKipcbiAqIEBlbiBQcm9kdWNlIGEgcmFuZG9tIHNhbXBsZSBmcm9tIHRoZSBsaXN0LlxuICogQGphIOODqeODs+ODgOODoOOBq+OCteODs+ODl+ODq+WApOOCkui/lOWNtFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc29sZS5sb2coc2FtcGxlKFsxLCAyLCAzLCA0LCA1LCA2XSkpO1xuICogLy8gPT4gNFxuICogYGBgXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIHNvdXJjZSBhcnJheVxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhbXBsZTxUPihhcnJheTogVFtdKTogVDtcblxuZXhwb3J0IGZ1bmN0aW9uIHNhbXBsZTxUPihhcnJheTogVFtdLCBjb3VudD86IG51bWJlcik6IFQgfCBUW10ge1xuICAgIGlmIChudWxsID09IGNvdW50KSB7XG4gICAgICAgIHJldHVybiBhcnJheVtyYW5kb21JbnQoYXJyYXkubGVuZ3RoIC0gMSldO1xuICAgIH1cbiAgICBjb25zdCBzYW1wbGUgPSBhcnJheS5zbGljZSgpO1xuICAgIGNvbnN0IGxlbmd0aCA9IHNhbXBsZS5sZW5ndGg7XG4gICAgY291bnQgPSBNYXRoLm1heChNYXRoLm1pbihjb3VudCwgbGVuZ3RoKSwgMCk7XG4gICAgY29uc3QgbGFzdCA9IGxlbmd0aCAtIDE7XG4gICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGNvdW50OyBpbmRleCsrKSB7XG4gICAgICAgIGNvbnN0IHJhbmQgPSByYW5kb21JbnQoaW5kZXgsIGxhc3QpO1xuICAgICAgICBjb25zdCB0ZW1wID0gc2FtcGxlW2luZGV4XTtcbiAgICAgICAgc2FtcGxlW2luZGV4XSA9IHNhbXBsZVtyYW5kXTtcbiAgICAgICAgc2FtcGxlW3JhbmRdID0gdGVtcDtcbiAgICB9XG4gICAgcmV0dXJuIHNhbXBsZS5zbGljZSgwLCBjb3VudCk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBSZXR1cm5zIGEgcmVzdWx0IG9mIHBlcm11dGF0aW9uIGZyb20gdGhlIGxpc3QuXG4gKiBAamEg6YWN5YiX44GL44KJ6aCG5YiX57WQ5p6c44KS6L+U5Y20XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBhcnIgPSBwZXJtdXRhdGlvbihbJ2EnLCAnYicsICdjJ10sIDIpO1xuICogY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYXJyKSk7XG4gKiAvLyA9PiBbWydhJywnYiddLFsnYScsJ2MnXSxbJ2InLCdhJ10sWydiJywnYyddLFsnYycsJ2EnXSxbJ2MnLCdiJ11dXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgc291cmNlIGFycmF5XG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNvdW50XG4gKiAgLSBgZW5gIG51bWJlciBvZiBwaWNrIHVwLlxuICogIC0gYGphYCDpgbjmip7mlbBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcm11dGF0aW9uPFQ+KGFycmF5OiBUW10sIGNvdW50OiBudW1iZXIpOiBUW11bXSB7XG4gICAgY29uc3QgcmV0dmFsOiBUW11bXSA9IFtdO1xuICAgIGlmIChhcnJheS5sZW5ndGggPCBjb3VudCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGlmICgxID09PSBjb3VudCkge1xuICAgICAgICBmb3IgKGNvbnN0IFtpLCB2YWxdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICAgICAgcmV0dmFsW2ldID0gW3ZhbF07XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbjEgPSBhcnJheS5sZW5ndGg7IGkgPCBuMTsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGFycmF5LnNsaWNlKDApO1xuICAgICAgICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gcGVybXV0YXRpb24ocGFydHMsIGNvdW50IC0gMSk7XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMCwgbjIgPSByb3cubGVuZ3RoOyBqIDwgbjI7IGorKykge1xuICAgICAgICAgICAgICAgIHJldHZhbC5wdXNoKFthcnJheVtpXV0uY29uY2F0KHJvd1tqXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8qKlxuICogQGVuIFJldHVybnMgYSByZXN1bHQgb2YgY29tYmluYXRpb24gZnJvbSB0aGUgbGlzdC5cbiAqIEBqYSDphY3liJfjgYvjgonntYTjgb/lkIjjgo/jgZvntZDmnpzjgpLov5TljbRcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGFyciA9IGNvbWJpbmF0aW9uKFsnYScsICdiJywgJ2MnXSwgMik7XG4gKiBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhcnIpKTtcbiAqIC8vID0+IFtbJ2EnLCdiJ10sWydhJywnYyddLFsnYicsJ2MnXV1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBzb3VyY2UgYXJyYXlcbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY291bnRcbiAqICAtIGBlbmAgbnVtYmVyIG9mIHBpY2sgdXAuXG4gKiAgLSBgamFgIOmBuOaKnuaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tYmluYXRpb248VD4oYXJyYXk6IFRbXSwgY291bnQ6IG51bWJlcik6IFRbXVtdIHtcbiAgICBjb25zdCByZXR2YWw6IFRbXVtdID0gW107XG4gICAgaWYgKGFycmF5Lmxlbmd0aCA8IGNvdW50KSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgaWYgKDEgPT09IGNvdW50KSB7XG4gICAgICAgIGZvciAoY29uc3QgW2ksIHZhbF0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgICAgICByZXR2YWxbaV0gPSBbdmFsXTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBuMSA9IGFycmF5Lmxlbmd0aDsgaSA8IG4xIC0gY291bnQgKyAxOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IGNvbWJpbmF0aW9uKGFycmF5LnNsaWNlKGkgKyAxKSwgY291bnQgLSAxKTtcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwLCBuMiA9IHJvdy5sZW5ndGg7IGogPCBuMjsgaisrKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsLnB1c2goW2FycmF5W2ldXS5jb25jYXQocm93W2pdKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5tYXAoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5tYXAoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKiBcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgKkFycmF5KiBhcyB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c6YWN5YiX44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYXA8VCwgVT4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSB8IFByb21pc2U8VT4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxVW10+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXG4gICAgICAgIGFycmF5Lm1hcChhc3luYyAodiwgaSwgYSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhKTtcbiAgICAgICAgfSlcbiAgICApO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuZmlsdGVyKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUuZmlsdGVyKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgKkFycmF5KiBhcyB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz57WQ5p6c6YWN5YiX44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaWx0ZXI8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxUW10+IHtcbiAgICBjb25zdCBiaXRzOiBib29sZWFuW10gPSBhd2FpdCBtYXAoYXJyYXksICh2LCBpLCBhKSA9PiBjYWxsYmFjay5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdiwgaSwgYSkpO1xuICAgIHJldHVybiBhcnJheS5maWx0ZXIoKCkgPT4gYml0cy5zaGlmdCgpKTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLmZpbmQoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5maW5kKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+e1kOaenOOCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZDxUPih0aGlzOiB1bmtub3duLCBhcnJheTogVFtdLCBjYWxsYmFjazogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBib29sZWFuIHwgUHJvbWlzZTxib29sZWFuPiwgdGhpc0FyZz86IHVua25vd24pOiBQcm9taXNlPFQgfCB1bmRlZmluZWQ+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQGVuIFN1YnN0aXR1dGlvbiBtZXRob2Qgb2YgYEFycmF5LnByb3RvdHlwZS5maW5kSW5kZXgoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5maW5kSW5kZXgoKWAg44Gu5Luj5pu/44Oh44K944OD44OJXG4gKlxuICogQHBhcmFtIGFycmF5XG4gKiAgLSBgZW5gIEFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqICAtIGBqYWAg5YWl5Yqb6YWN5YiXXG4gKiBAcGFyYW0gY2FsbGJhY2tcbiAqICAtIGBlbmAgRnVuY3Rpb24gdG8gYXBwbHkgZWFjaCBpdGVtIGluIGBhcnJheWAuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+mBqeeUqOmWouaVsFxuICogQHBhcmFtIHRoaXNBcmdcbiAqICAtIGBlbmAgVmFsdWUgdG8gdXNlIGFzICp0aGlzKiB3aGVuIGV4ZWN1dGluZyB0aGUgYGNhbGxiYWNrYC5cbiAqICAtIGBqYWAgYGNhbGxiYWNrYCDlrp/ooYzjgrPjg7Pjg4bjgq3jgrnjg4hcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIFJldHVybnMgYSBQcm9taXNlIHdpdGggdGhlIHJlc3VsdGFudCBpbmRleCB2YWx1ZS5cbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K544KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaW5kSW5kZXg8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBmb3IgKGNvbnN0IFtpLCB2XSBvZiBhcnJheS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGF3YWl0IGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB2LCBpLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbn1cblxuLyoqXG4gKiBAZW4gU3Vic3RpdHV0aW9uIG1ldGhvZCBvZiBgQXJyYXkucHJvdG90eXBlLnNvbWUoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5zb21lKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSB0aGlzQXJnXG4gKiAgLSBgZW5gIFZhbHVlIHRvIHVzZSBhcyAqdGhpcyogd2hlbiBleGVjdXRpbmcgdGhlIGBjYWxsYmFja2AuXG4gKiAgLSBgamFgIGBjYWxsYmFja2Ag5a6f6KGM44Kz44Oz44OG44Kt44K544OIXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBSZXR1cm5zIGEgUHJvbWlzZSB3aXRoIHRoZSByZXN1bHRhbnQgYm9vbGVhbiB2YWx1ZS5cbiAqICAtIGBqYWAg55yf5YG95YCk44KS5qC857SN44GX44GfIFByb21pc2Ug44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzb21lPFQ+KHRoaXM6IHVua25vd24sIGFycmF5OiBUW10sIGNhbGxiYWNrOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+LCB0aGlzQXJnPzogdW5rbm93bik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGZvciAoY29uc3QgW2ksIHZdIG9mIGFycmF5LmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoYXdhaXQgY2FsbGJhY2suY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHYsIGksIGFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUuZXZlcnkoKWAgd2hpY2ggYWxzbyBhY2NlcHRzIGFzeW5jaHJvbm91cyBjYWxsYmFjay5cbiAqIEBqYSDpnZ7lkIzmnJ/jgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrprlj6/og73jgaogYEFycmF5LnByb3RvdHlwZS5ldmVyeSgpYCDjga7ku6Pmm7/jg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAcGFyYW0gYXJyYXlcbiAqICAtIGBlbmAgQXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICogIC0gYGphYCDlhaXlipvphY3liJdcbiAqIEBwYXJhbSBjYWxsYmFja1xuICogIC0gYGVuYCBGdW5jdGlvbiB0byBhcHBseSBlYWNoIGl0ZW0gaW4gYGFycmF5YC5cbiAqICAtIGBqYWAg44Kk44OG44Os44O844K344On44Oz6YGp55So6Zai5pWwXG4gKiBAcGFyYW0gdGhpc0FyZ1xuICogIC0gYGVuYCBWYWx1ZSB0byB1c2UgYXMgKnRoaXMqIHdoZW4gZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOWun+ihjOOCs+ODs+ODhuOCreOCueODiFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50IGJvb2xlYW4gdmFsdWUuXG4gKiAgLSBgamFgIOecn+WBveWApOOCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXZlcnk8VD4odGhpczogdW5rbm93biwgYXJyYXk6IFRbXSwgY2FsbGJhY2s6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdW5rbm93biB8IFByb21pc2U8dW5rbm93bj4sIHRoaXNBcmc/OiB1bmtub3duKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmICghYXdhaXQgY2FsbGJhY2suY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHYsIGksIGFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBlbiBTdWJzdGl0dXRpb24gbWV0aG9kIG9mIGBBcnJheS5wcm90b3R5cGUucmVkdWNlKClgIHdoaWNoIGFsc28gYWNjZXB0cyBhc3luY2hyb25vdXMgY2FsbGJhY2suXG4gKiBAamEg6Z2e5ZCM5pyf44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6a5Y+v6IO944GqIGBBcnJheS5wcm90b3R5cGUucmVkdWNlKClgIOOBruS7o+abv+ODoeOCveODg+ODiVxuICpcbiAqIEBwYXJhbSBhcnJheVxuICogIC0gYGVuYCBBcnJheSB0byBpdGVyYXRlIG92ZXIuXG4gKiAgLSBgamFgIOWFpeWKm+mFjeWIl1xuICogQHBhcmFtIGNhbGxiYWNrXG4gKiAgLSBgZW5gIEZ1bmN0aW9uIHRvIGFwcGx5IGVhY2ggaXRlbSBpbiBgYXJyYXlgLlxuICogIC0gYGphYCDjgqTjg4bjg6zjg7zjgrfjg6fjg7PpgannlKjplqLmlbBcbiAqIEBwYXJhbSBpbml0aWFsVmFsdWVcbiAqICAtIGBlbmAgVXNlZCBhcyBmaXJzdCBhcmd1bWVudCB0byB0aGUgZmlyc3QgY2FsbCBvZiBgY2FsbGJhY2tgLlxuICogIC0gYGphYCBgY2FsbGJhY2tgIOOBq+a4oeOBleOCjOOCi+WIneacn+WApFxuICogQHJldHVybnNcbiAqICAtIGBlbmAgUmV0dXJucyBhIFByb21pc2Ugd2l0aCB0aGUgcmVzdWx0YW50ICpBcnJheSogYXMgdmFsdWUuXG4gKiAgLSBgamFgIOOCpOODhuODrOODvOOCt+ODp+ODs+e1kOaenOmFjeWIl+OCkuagvOe0jeOBl+OBnyBQcm9taXNlIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVkdWNlPFQsIFU+KFxuICAgIGFycmF5OiBUW10sXG4gICAgY2FsbGJhY2s6IChhY2N1bXVsYXRvcjogVSwgY3VycmVudFZhbHVlOiBULCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSB8IFByb21pc2U8VT4sXG4gICAgaW5pdGlhbFZhbHVlPzogVVxuKTogUHJvbWlzZTxVPiB7XG4gICAgaWYgKGFycmF5Lmxlbmd0aCA8PSAwICYmIHVuZGVmaW5lZCA9PT0gaW5pdGlhbFZhbHVlKSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignUmVkdWNlIG9mIGVtcHR5IGFycmF5IHdpdGggbm8gaW5pdGlhbCB2YWx1ZScpO1xuICAgIH1cblxuICAgIGNvbnN0IGhhc0luaXQgPSAodW5kZWZpbmVkICE9PSBpbml0aWFsVmFsdWUpO1xuICAgIGxldCBhY2MgPSAoaGFzSW5pdCA/IGluaXRpYWxWYWx1ZSA6IGFycmF5WzBdKSBhcyBVO1xuXG4gICAgZm9yIChjb25zdCBbaSwgdl0gb2YgYXJyYXkuZW50cmllcygpKSB7XG4gICAgICAgIGlmICghKCFoYXNJbml0ICYmIDAgPT09IGkpKSB7XG4gICAgICAgICAgICBhY2MgPSBhd2FpdCBjYWxsYmFjayhhY2MsIHYsIGksIGFycmF5KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBhY2M7XG59XG4iLCIvKipcbiAqIEBlbiBEYXRlIHVuaXQgZGVmaW5pdGlvbnMuXG4gKiBAamEg5pel5pmC44Kq44OW44K444Kn44Kv44OI44Gu5Y2Y5L2N5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIERhdGVVbml0ID0gJ3llYXInIHwgJ21vbnRoJyB8ICdkYXknIHwgJ2hvdXInIHwgJ21pbicgfCAnc2VjJyB8ICdtc2VjJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2NvbXB1dGVEYXRlRnVuY01hcCA9IHtcbiAgICB5ZWFyOiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENGdWxsWWVhcihiYXNlLmdldFVUQ0Z1bGxZZWFyKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIG1vbnRoOiAoZGF0ZTogRGF0ZSwgYmFzZTogRGF0ZSwgYWRkOiBudW1iZXIpID0+IHtcbiAgICAgICAgZGF0ZS5zZXRVVENNb250aChiYXNlLmdldFVUQ01vbnRoKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIGRheTogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDRGF0ZShiYXNlLmdldFVUQ0RhdGUoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG4gICAgaG91cjogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDSG91cnMoYmFzZS5nZXRVVENIb3VycygpICsgYWRkKTtcbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSxcbiAgICBtaW46IChkYXRlOiBEYXRlLCBiYXNlOiBEYXRlLCBhZGQ6IG51bWJlcikgPT4ge1xuICAgICAgICBkYXRlLnNldFVUQ01pbnV0ZXMoYmFzZS5nZXRVVENNaW51dGVzKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxuICAgIHNlYzogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDU2Vjb25kcyhiYXNlLmdldFVUQ1NlY29uZHMoKSArIGFkZCk7XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH0sXG4gICAgbXNlYzogKGRhdGU6IERhdGUsIGJhc2U6IERhdGUsIGFkZDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGRhdGUuc2V0VVRDTWlsbGlzZWNvbmRzKGJhc2UuZ2V0VVRDTWlsbGlzZWNvbmRzKCkgKyBhZGQpO1xuICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBAZW4gQ2FsY3VsYXRlIGZyb20gdGhlIGRhdGUgd2hpY2ggYmVjb21lcyBhIGNhcmRpbmFsIHBvaW50IGJlZm9yZSBhIE4gZGF0ZSB0aW1lIG9yIGFmdGVyIGEgTiBkYXRlIHRpbWUgKGJ5IFtbRGF0ZVVuaXRdXSkuXG4gKiBAamEg5Z+654K544Go44Gq44KL5pel5LuY44GL44KJ44CBTuaXpeW+jOOAgU7ml6XliY3jgpLnrpflh7pcbiAqXG4gKiBAcGFyYW0gYmFzZVxuICogIC0gYGVuYCBiYXNlIGRhdGUgdGltZS5cbiAqICAtIGBqYWAg5Z+65rqW5pelXG4gKiBAcGFyYW0gYWRkXG4gKiAgLSBgZW5gIHJlbGF0aXZlIGRhdGUgdGltZS5cbiAqICAtIGBqYWAg5Yqg566X5pelLiDjg57jgqTjg4rjgrnmjIflrprjgadu5pel5YmN44KC6Kit5a6a5Y+v6IO9XG4gKiBAcGFyYW0gdW5pdCBbW0RhdGVVbml0XV1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVEYXRlKGJhc2U6IERhdGUsIGFkZDogbnVtYmVyLCB1bml0OiBEYXRlVW5pdCA9ICdkYXknKTogRGF0ZSB7XG4gICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKGJhc2UuZ2V0VGltZSgpKTtcbiAgICBjb25zdCBmdW5jID0gX2NvbXB1dGVEYXRlRnVuY01hcFt1bml0XTtcbiAgICBpZiAoZnVuYykge1xuICAgICAgICByZXR1cm4gZnVuYyhkYXRlLCBiYXNlLCBhZGQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYGludmFsaWQgdW5pdDogJHt1bml0fWApO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBOzs7Ozs7OztTQVFnQixTQUFTOztJQUVyQixPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sVUFBVSxJQUFJLFVBQVUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztBQUNyRixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7O1NBV2dCLFlBQVksQ0FBNEIsTUFBcUIsRUFBRSxHQUFHLEtBQWU7SUFDN0YsSUFBSSxJQUFJLEdBQUcsTUFBTSxJQUFJLFNBQVMsRUFBRSxDQUFDO0lBQ2pDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1FBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzlCLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDckI7SUFDRCxPQUFPLElBQVMsQ0FBQztBQUNyQixDQUFDO0FBRUQ7Ozs7U0FJZ0Isa0JBQWtCLENBQTRCLFNBQWlCO0lBQzNFLE9BQU8sWUFBWSxDQUFJLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztBQUM1QyxDQUFDO0FBRUQ7Ozs7OztTQU1nQixTQUFTLENBQTRCLFNBQVMsR0FBRyxLQUFLLEVBQUUsVUFBVSxHQUFHLFFBQVE7SUFDekYsT0FBTyxZQUFZLENBQUksa0JBQWtCLENBQUMsU0FBUyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDdEU7O0FDakRBOzs7O0FBeU5B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
