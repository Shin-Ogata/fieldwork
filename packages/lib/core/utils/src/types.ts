/* eslint-disable
    @typescript-eslint/no-explicit-any
 ,  @typescript-eslint/ban-types
 ,  @typescript-eslint/explicit-module-boundary-types
 */

/**
 * @en Primitive type of JavaScript.
 * @ja JavaScript のプリミティブ型
 */
export type Primitive = string | number | boolean | symbol | null | undefined;

/**
 * @en The general null type.
 * @ja 空を示す型定義
 */
export type Nil = void | null | undefined;

/**
 * @en The type of object or [[Nil]].
 * @ja [[Nil]] になりえるオブジェクト型定義
 */
export type Nillable<T extends object> = T | Nil;

/**
 * @en Avoid the `Function`types.
 * @ja 汎用関数型
 */
export type UnknownFunction = (...args: unknown[]) => unknown;

/**
 * @en Avoid the `Object` and `{}` types, as they mean "any non-nullish value".
 * @ja 汎用オブジェクト型. `Object` および `{}` タイプは「nullでない値」を意味するため代価として使用
 */
export type UnknownObject = Record<string, unknown>;

/**
 * @en Non-nullish value.
 * @ja 非 Null 値
 */
export type NonNil = {};

/**
 * @en JavaScript type set interface.
 * @ja JavaScript の型の集合
 */
interface TypeList {
    string: string;
    number: number;
    boolean: boolean;
    symbol: symbol;
    undefined: void | undefined;
    object: object | null;
    function(...args: unknown[]): unknown;
}

/**
 * @en The key list of [[TypeList]].
 * @ja [[TypeList]] キー一覧
 */
export type TypeKeys = keyof TypeList;

/**
 * @en Type base definition.
 * @ja 型の規定定義
 */
export interface Type<T extends object> extends Function {
    readonly prototype: T;
}

/**
 * @en Type of constructor.
 * @ja コンストラクタ型
 */
export interface Constructor<T extends object> extends Type<T> {
    new(...args: unknown[]): T;
}

/**
 * @en Type of class.
 * @ja クラス型
 */
export type Class<T extends object = object> = Constructor<T>;

/**
 * @en Ensure for function parameters to tuple.
 * @ja 関数パラメータとして tuple を保証
 */
export type Arguments<T> = T extends any[] ? T : [T];

/**
 * @en Rmove `readonly` attributes from input type.
 * @ja `readonly` 属性を解除
 */
export type Writable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * @en Extract functional property names.
 * @ja 関数プロパティ名の抽出
 */
export type FunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? K : never }[keyof T];

/**
 * @en Extract functional properties.
 * @ja 関数プロパティの抽出
 */
export type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>;

/**
 * @en Extract non-functional property names.
 * @ja 非関数プロパティ名の抽出
 */
export type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];

/**
 * @en Extract non-functional properties.
 * @ja 非関数プロパティの抽出
 */
export type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;

/**
 * @en Extract object key list. (ensure only 'string')
 * @ja オブジェクトのキー一覧を抽出 ('string' 型のみを保証)
 */
export type Keys<T extends object> = keyof Omit<T, number | symbol>;

/**
 * @en Extract object type list.
 * @ja オブジェクトの型一覧を抽出
 */
export type Types<T extends object> = T[keyof T];

/**
 * @en Convert object key to type.
 * @ja オブジェクトキーから型へ変換
 */
export type KeyToType<O extends object, K extends keyof O> = K extends keyof O ? O[K] : never;

/**
 * @en Convert object type to key.
 * @ja オブジェクト型からキーへ変換
 */
export type TypeToKey<O extends object, T extends Types<O>> = { [K in keyof O]: O[K] extends T ? K : never }[keyof O];

/**
 * @en The [[PlainObject]] type is a JavaScript object containing zero or more key-value pairs. <br>
 *     'Plain' means it from other kinds of JavaScript objects. ex: null, user-defined arrays, and host objects such as `document`.
 * @ja 0 以上の key-value ペアを持つ [[PlainObject]] 定義 <br>The PlainObject type is a JavaScript object containing zero or more key-value pairs. <br>
 *     'Plain' とは他の種類の JavaScript オブジェクトを含まないオブジェクトを意味する. 例:  null, ユーザー定義配列, または `document` のような組み込みオブジェクト
 */
export interface PlainObject<T = any> {
    [key: string]: T;
}

/**
 * @en The data type list by which style compulsion is possible.
 * @ja 型強制可能なデータ型一覧
 */
export type TypedData = string | number | boolean | null | object;

/**
 * @en The data type list of TypedArray.
 * @ja TypedArray 一覧
 */
export type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;

//__________________________________________________________________________________________________//

/**
 * @en Check the value exists.
 * @ja 値が存在するか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function exists<T>(x: T | Nil): x is T {
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
export function isNil(x: unknown): x is Nil {
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
export function isString(x: unknown): x is string {
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
export function isNumber(x: unknown): x is number {
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
export function isBoolean(x: unknown): x is boolean {
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
export function isSymbol(x: unknown): x is symbol {
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
export function isPrimitive(x: unknown): x is Primitive {
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
export const isArray = Array.isArray; // eslint-disable-line @typescript-eslint/unbound-method

/**
 * @en Check the value-type is Object.
 * @ja Object 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isObject(x: unknown): x is object {
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
export function isPlainObject(x: unknown): x is PlainObject {
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
export function isEmptyObject(x: unknown): x is object {
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
export function isFunction(x: unknown): x is TypeList['function'] {
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
export function typeOf<K extends TypeKeys>(type: K, x: unknown): x is TypeList[K] {
    return typeof x === type;
}

/**
 * @en Check the value has iterator.
 * @ja iterator を所有しているか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isIterable<T>(x: Nillable<Iterable<T>>): x is Iterable<T>;
export function isIterable(x: unknown): x is Iterable<unknown>;
export function isIterable(x: any): any {
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
export function isTypedArray(x: unknown): x is TypedArray {
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
export function instanceOf<T extends object>(ctor: Nillable<Type<T>>, x: unknown): x is T {
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
export function ownInstanceOf<T extends object>(ctor: Nillable<Type<T>>, x: unknown): x is T {
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
export function className(x: any): string {
    if (x != null) {
        const toStringTagName = x[Symbol.toStringTag];
        if (isString(toStringTagName)) {
            return toStringTagName;
        } else if (isFunction(x) && x.prototype && null != x.name) {
            return x.name;
        } else {
            const ctor = x.constructor;
            if (isFunction(ctor) && ctor === (Object(ctor.prototype) as object).constructor) {
                return ctor.name;
            }
        }
    }
    return (Object.prototype.toString.call(x) as string).slice(8, -1);
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
export function sameType(lhs: unknown, rhs: unknown): boolean {
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
export function sameClass(lhs: unknown, rhs: unknown): boolean {
    if (null == lhs && null == rhs) {
        return className(lhs) === className(rhs);
    } else {
        return (null != lhs) && (null != rhs) && (Object.getPrototypeOf(lhs) === Object.getPrototypeOf(rhs));
    }
}

/**
 * @en Common Symble for framework.
 * @ja フレームワークが共通で使用する Symble
 */
export const $cdp = Symbol('@cdp');
