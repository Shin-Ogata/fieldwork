/**
 * @es The general null type.
 * @ja 空を示す型定義
 */
export declare type Nil = void | null | undefined;
/**
 * @es The type of object or [[Nil]].
 * @ja [[Nil]] になりえるオブジェクト型定義
 */
export declare type Nillable<T extends Object> = T | Nil;
/**
 * @es Primitive type of JavaScript.
 * @ja JavaScript のプリミティブ型
 */
export declare type Primitive = string | number | boolean | symbol | null | undefined;
/**
 * @es JavaScript type set interface.
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
 * @es The key list of [[TypeList]].
 * @ja [[TypeList]] キー一覧
 */
export declare type TypeKeys = keyof TypeList;
/**
 * @es Type base definition.
 * @ja 型の規定定義
 */
export interface Type<T extends Object> extends Function {
    readonly prototype: T;
}
/**
 * @es Type of constructor.
 * @ja コンストラクタ型
 */
export interface Constructor<T> extends Type<T> {
    new (...args: any[]): T;
}
/**
 * @es Type of class.
 * @ja クラス型
 */
export declare type Class<T = any> = Constructor<T>;
/**
 * @es Ensure for function parameters to tuple.
 * @ja 関数パラメータとして tuple を保証
 */
export declare type Arguments<T> = T extends any[] ? T : [T];
/**
 * @es Check the value exists.
 * @ja 値が存在するか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function exists<O extends Object>(x: Nillable<O>): x is O;
export declare function exists(x: any): x is Object;
/**
 * @es Check the value-type is [[Nil]].
 * @ja [[Nil]] 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isNil(x: any): x is Nil;
/**
 * @es Check the value-type is String.
 * @ja String 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isString(x: any): x is string;
/**
 * @es Check the value-type is Number.
 * @ja Number 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isNumber(x: any): x is number;
/**
 * @es Check the value-type is Boolean.
 * @ja Boolean 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isBoolean(x: any): x is boolean;
/**
 * @es Check the value-type is Symble.
 * @ja Symbol 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isSymbol(x: any): x is symbol;
/**
 * @es Check the value-type is primitive type.
 * @ja プリミティブ型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isPrimitive(x: any): x is Primitive;
/**
 * @es Check the value-type is Object.
 * @ja Object 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isObject(x: any): x is object;
/**
 * @es Check the value-type is Function.
 * @ja Function 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isFunction(x: any): x is TypeList['function'];
/**
 * @es Check the value-type is input.
 * @ja 指定した型であるか判定
 *
 * @param type
 *  - `en` evaluated type
 *  - `ja` 評価する型
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function typeOf<K extends TypeKeys>(type: K, x: any): x is TypeList[K];
/**
 * @es Check the value has iterator.
 * @ja iterator を所有しているか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isIterable<T>(x: Nillable<Iterable<T>>): x is Iterable<T>;
export declare function isIterable(x: any): x is Iterable<any>;
/**
 * @es Check the value instance of input.
 * @ja 指定したインスタンスであるか判定
 *
 * @param ctor
 *  - `en` evaluated constructor
 *  - `ja` 評価するコンストラクタ
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function instanceOf<T extends Object>(ctor: Nillable<Type<T>>, x: any): x is T;
/**
 * @es Check the value instance of input constructor (except sub class).
 * @ja 指定コンストラクタのインスタンスであるか判定 (派生クラスは含めない)
 *
 * @param ctor
 *  - `en` evaluated constructor
 *  - `ja` 評価するコンストラクタ
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function ownInstanceOf<T extends Object>(ctor: Nillable<Type<T>>, x: any): x is T;
/**
 * @es Get the value's class name.
 * @ja クラス名を取得
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function className(x: any): string;
/**
 * @es Check input values are same value-type.
 * @ja 入力が同一型であるか判定
 *
 * @param lhs
 *  - `en` evaluated value
 *  - `ja` 評価する値
 * @param rhs
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function sameType(lhs: any, rhs: any): boolean;
/**
 * @es Check input values are same class.
 * @ja 入力が同一クラスであるか判定
 *
 * @param lhs
 *  - `en` evaluated value
 *  - `ja` 評価する値
 * @param rhs
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function sameClass(lhs: any, rhs: any): boolean;
/**
 * @es Get shallow copy of `target` which has only `pickupKeys`.
 * @ja `pickupKeys` で指定されたプロパティのみを持つ `target` の Shallow Copy を取得
 *
 * @param target
 *  - `en` copy source object
 *  - `ja` コピー元オブジェクト
 * @param pickupKeys
 *  - `en` copy target keys
 *  - `ja` コピー対象のキー一覧
 */
export declare function partialize<T extends object, K extends keyof T>(target: T, ...pickupKeys: K[]): {
    -readonly [P in K]: T[P];
};
export {};
