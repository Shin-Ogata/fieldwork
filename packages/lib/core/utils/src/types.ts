/* eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/no-unsafe-function-type,
    @typescript-eslint/no-empty-object-type,
 */

/**
 * @en Primitive type of JavaScript.
 * @ja JavaScript のプリミティブ型
 */
export type Primitive = string | number | boolean | symbol | bigint | null | undefined;

/**
 * @en The general null type.
 * @ja 空を示す型定義
 */
export type Nullish = void | null | undefined;

/**
 * @en The type of object or {@link Nullish}.
 * @ja {@link Nullish} になりえるオブジェクト型定義
 */
export type Nullable<T extends object> = T | Nullish;

/**
 * @en Avoid the `Function`types.
 * @ja 汎用関数型
 */
export type UnknownFunction = (...args: unknown[]) => unknown;

/**
 * @en Avoid the `Object` and `{}` types, as they mean "any non-nullish value".
 * @ja 汎用オブジェクト型. `Object` および `{}` タイプは「nullでない値」を意味するため代価として使用
 */
export type UnknownObject = Record<string | number | symbol, unknown>;

/**
 * @en JavaScript type set interface.
 * @ja JavaScript の型の集合
 */
interface TypeList {
    string: string;
    number: number;
    boolean: boolean;
    symbol: symbol;
    bigint: bigint;
    undefined: void | undefined;
    object: object | null;
    function(...args: unknown[]): unknown;
}

/**
 * @en The key list of {@link TypeList}.
 * @ja {@link TypeList} キー一覧
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
    new(...args: any[]): T;
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
 * @en Convert to subscript accessible type.
 * @ja 添え字アクセス可能な型に変換
 */
export type Accessible<T, S = unknown> = T & Record<string | number | symbol, S>;

/**
 * @en Extract functional property names.
 * @ja 関数プロパティ名の抽出
 */
export type FunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? K : never }[keyof T] & string;

/**
 * @en Extract functional properties.
 * @ja 関数プロパティの抽出
 */
export type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>;

/**
 * @en Extract non-functional property names.
 * @ja 非関数プロパティ名の抽出
 */
export type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T] & string;

/**
 * @en Extract non-functional properties.
 * @ja 非関数プロパティの抽出
 */
export type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;

/**
 * @en Extract non-functional types.
 * @ja 非関数型の抽出
 */
export type NonFunction<T> = T extends Function ? never : T;

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
 * @en The {@link PlainObject} type is a JavaScript object containing zero or more key-value pairs. <br>
 *     'Plain' means it from other kinds of JavaScript objects. ex: null, user-defined arrays, and host objects such as `document`.
 * @ja 0 以上の key-value ペアを持つ {@link PlainObject} 定義 <br>
 *     'Plain' とは他の種類の JavaScript オブジェクトを含まないオブジェクトを意味する. 例:  null, ユーザー定義配列, または `document` のような組み込みオブジェクト
 */
export type PlainObject<T = {} | null | undefined> = Record<string, T>;

/**
 * @en Object can be guaranteed definition. Be careful not to abuse it because it does not force the cast.
 *   - Unlike {@link PlainObject}, it can accept Class (built-in object), Array, Function.
 *   - Unlike `object`, you can access unknown properties.
 *   - Unlike `{} / Object`, it can repel {@link Primitive}.
 * @ja Object を保証可能な定義. キャストを強制しないため乱用しないように注意が必要.
 *   - {@link PlainObject} と違い、Class (組み込みオブジェクト), Array, Function を受け付けることができる.
 *   - `object` と違い、未知のプロパティにアクセスすることができる.
 *   - `{} / Object` と違い、{@link Primitive} をはじくことができる.
 */
export type AnyObject = Record<string, any>;

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

/**
 * @en TypedArray constructor.
 * @ja TypedArray コンストラクタ定義
 */
export interface TypedArrayConstructor {
    readonly prototype: TypedArray;
    new(seed: number | ArrayLike<number> | ArrayBufferLike): TypedArray;
    new(buffer: ArrayBufferLike, byteOffset?: number, length?: number): TypedArray;

    /**
     * @en The size in bytes of each element in the array.
     * @ja 要素のバイトサイズ
     */
    readonly BYTES_PER_ELEMENT: number;

    /**
     * @en Returns a new array from a set of elements.
     * @ja 要素を設定し新規配列を返却
     *
     * @param items
     *  - `en` A set of elements to include in the new array object.
     *  - `ja` 新たに設定する要素
     */
    of(...items: number[]): TypedArray;

    /**
     * @en Creates an array from an array-like or iterable object.
     * @ja array-like / iteratable オブジェクトから新規配列を作成
     *
     * @param arrayLike
     *  - `en` An array-like or iterable object to convert to an array.
     *  - `ja` array-like もしくは iteratable オブジェクト
     */
    from(arrayLike: ArrayLike<number>): TypedArray;

    /**
     * @en Creates an array from an array-like or iterable object.
     * @ja array-like / iteratable オブジェクトから新規配列を作成
     *
     * @param arrayLike
     *  - `en` An array-like or iterable object to convert to an array.
     *  - `ja` array-like もしくは iteratable オブジェクト
     * @param mapfn
     *  - `en` A mapping function to call on every element of the array.
     *  - `ja` 全要素に適用するプロキシ関数
     * @param thisArg
     *  - `en` Value of 'this' used to invoke the mapfn.
     *  - `ja` mapfn に使用する 'this'
     */
    from<T>(arrayLike: ArrayLike<T>, mapfn: (v: T, k: number) => number, thisArg?: unknown): TypedArray;
}

//__________________________________________________________________________________________________//

/**
 * @en Check the value exists.
 * @ja 値が存在するか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function exists<T>(x: T | Nullish): x is T {
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
export function isNullish(x: unknown): x is Nullish {
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
 * @en Check the value-type is BigInt.
 * @ja BigInt 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isBigInt(x: unknown): x is bigint {
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
export const isArray = Array.isArray;

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
 * @en Check the value-type is {@link PlainObject}.
 * @ja {@link PlainObject} 型であるか判定
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
export function isFunction(x: unknown): x is TypeList['function'] {
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
export function isNumeric(x: unknown): x is number {
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
export function isIterable<T>(x: Nullable<Iterable<T>>): x is Iterable<T>;
export function isIterable(x: unknown): x is Iterable<unknown>;
export function isIterable(x: unknown): any {
    return Symbol.iterator in Object(x);
}

/** @internal */
const _typedArrayNames: Record<string, boolean> = {
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
export function instanceOf<T extends object>(ctor: Nullable<Type<T>>, x: unknown): x is T {
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
export function ownInstanceOf<T extends object>(ctor: Nullable<Type<T>>, x: unknown): x is T {
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
