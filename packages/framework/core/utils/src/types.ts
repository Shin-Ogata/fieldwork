/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any */

/**
 * @es The general null type
 * @ja 空を示す型定義
 */
export type Nil = void | null | undefined;

/**
 * @es The type of object or [[Nil]]
 * @ja [[Nil]] になりえるオブジェクト型定義
 */
export type Nillable<T extends Object> = T | Nil;

/**
 * @es Primitive type of JavaScript
 * @ja JavaScript のプリミティブ型
 */
export type Primitive = string | number | boolean | symbol | null | undefined;

/**
 * @es JavaScript type set interface
 * @ja JavaScript の型の集合
 */
interface TypeList {
    string: string;
    number: number;
    boolean: boolean;
    symbol: symbol;
    undefined: void | undefined;
    object: object | null;
    function(...args: any[]): any;
}

/**
 * @es The key list of [[TypeList]]
 * @ja [[TypeList]] キー一覧
 */
export type TypeKeys = keyof TypeList;

/**
 * @es Type base definition
 * @ja 型の規定定義
 */
export interface Type<T extends Object> extends Function {
    readonly prototype: T;
}

/**
 * @es Type of constructor
 * @ja コンストラクタ型
 */
export interface Constructor<T> extends Type<T> {
    new(...args: any[]): T;
}

/**
 * @es Type of class
 * @ja クラス型
 */
export type Class<T = any> = Constructor<T>;

/**
 * @es Check the value exists
 * @ja 値が存在するか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function exists<O extends Object>(x: Nillable<O>): x is O;
export function exists(x: any): x is Object;
export function exists(x: any): any {
    return null != x;
}

/**
 * @es Check the value-type is [[Nil]]
 * @ja [[Nil]] 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isNil(x: any): x is Nil {
    return null == x;
}

/**
 * @es Check the value-type is String
 * @ja String 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isString(x: any): x is string {
    return 'string' === typeof x;
}

/**
 * @es Check the value-type is Number
 * @ja Number 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isNumber(x: any): x is number {
    return 'number' === typeof x;
}

/**
 * @es Check the value-type is Boolean
 * @ja Boolean 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isBoolean(x: any): x is boolean {
    return 'boolean' === typeof x;
}

/**
 * @es Check the value-type is Symble
 * @ja Symbol 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isSymbol(x: any): x is symbol {
    return 'symbol' === typeof x;
}

/**
 * @es Check the value-type is primitive type
 * @ja プリミティブ型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isPrimitive(x: any): x is Primitive {
    return !x || ('function' !== typeof x) && ('object' !== typeof x);
}

/**
 * @es Check the value-type is Object
 * @ja Object 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isObject(x: any): x is object {
    return Boolean(x) && 'object' === typeof x;
}

/**
 * @es Check the value-type is Function
 * @ja Function 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isFunction(x: any): x is TypeList['function'] {
    return 'function' === typeof x;
}

/**
 * @es Check the value-type is input
 * @ja 指定した型であるか判定
 *
 * @param type
 *  - `en` evaluated type
 *  - `ja` 評価する型
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function typeOf<K extends TypeKeys>(type: K, x: any): x is TypeList[K] {
    return typeof x === type;
}

/**
 * @es Check the value has iterator
 * @ja iterator を所有しているか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isIterable<T>(x: Nillable<Iterable<T>>): x is Iterable<T>;
export function isIterable(x: any): x is Iterable<any>;
export function isIterable(x: any): any {
    return Symbol.iterator in Object(x);
}

/**
 * @es Check the value instance of input
 * @ja 指定したインスタンスであるか判定
 *
 * @param ctor
 *  - `en` evaluated constructor
 *  - `ja` 評価するコンストラクタ
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function instanceOf<T extends Object>(ctor: Nillable<Type<T>>, x: any): x is T {
    return ('function' === typeof ctor) && (x instanceof ctor);
}

/**
 * @es Check the value instance of input constructor (except sub class)
 * @ja 指定コンストラクタのインスタンスであるか判定 (派生クラスは含めない)
 *
 * @param ctor
 *  - `en` evaluated constructor
 *  - `ja` 評価するコンストラクタ
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function ownInstanceOf<T extends Object>(ctor: Nillable<Type<T>>, x: any): x is T {
    return (null != x) && ('function' === typeof ctor) && (Object.getPrototypeOf(x) === Object(ctor.prototype));
}

/**
 * @es Get the value's class name
 * @ja クラス名を取得
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function className(x: any): string {
    if (x != null) {
        const toStringTagName = x[Symbol.toStringTag];
        if (isString(toStringTagName)) {
            return toStringTagName;
        } else if (isFunction(x) && x.prototype && null != x.name) {
            return x.name;
        } else {
            const ctor = x.constructor;
            if (isFunction(ctor) && ctor === (Object(ctor.prototype) as Object).constructor) {
                return ctor.name;
            }
        }
    }
    return (Object.prototype.toString.call(x) as string).slice(8, -1);
}

/**
 * @es Check input values are same value-type
 * @ja 入力が同一型であるか判定
 *
 * @param lhs
 *  - `en` evaluated value
 *  - `ja` 評価する値
 * @param rhs
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function sameType(lhs: any, rhs: any): boolean {
    return typeof lhs === typeof rhs;
}

/**
 * @es Check input values are same class
 * @ja 入力が同一クラスであるか判定
 *
 * @param lhs
 *  - `en` evaluated value
 *  - `ja` 評価する値
 * @param rhs
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function sameClass(lhs: any, rhs: any): boolean {
    if (null == lhs && null == rhs) {
        return className(lhs) === className(rhs);
    } else {
        return (null != lhs) && (null != rhs) && (Object.getPrototypeOf(lhs) === Object.getPrototypeOf(rhs));
    }
}

/**
 * @es Get shallow copy of `target` which has only `pickupKeys`
 * @ja `pickupKeys` で指定されたプロパティのみを持つ `target` の Shallow Copy を取得
 *
 * @param target
 *  - `en` copy source object
 *  - `ja` コピー元オブジェクト
 * @param pickupKeys
 *  - `en` copy target keys
 *  - `ja` コピー対象のキー一覧
 */
export function partialize<T extends object, K extends keyof T>(target: T, ...pickupKeys: K[]): { -readonly [P in K]: T[P]; } {
    if (!target || !isObject(target)) {
        throw new TypeError(`${className(target)} is not an object.`);
    }
    return pickupKeys.reduce((obj, key) => {
        key in target && (obj[key] = target[key]);
        return obj;
    }, {} as { -readonly [P in K]: T[P]; });    // eslint-disable-line @typescript-eslint/no-object-literal-type-assertion
}
