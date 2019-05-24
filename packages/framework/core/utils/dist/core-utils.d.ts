/*!
 * @cdp/core-utils 0.9.0
 *   core framework utilities
 */

declare module '@cdp/core-utils' {
    export * from '@cdp/core-utils/types';
    export * from '@cdp/core-utils/verify';
    export * from '@cdp/core-utils/mixins';
}

declare module '@cdp/core-utils/types' {
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
            new (...args: any[]): T;
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
    /**
        * @es Check the value-type is [[Nil]]
        * @ja [[Nil]] 型であるか判定
        *
        * @param x
        *  - `en` evaluated value
        *  - `ja` 評価する値
        */
    export function isNil(x: any): x is Nil;
    /**
        * @es Check the value-type is String
        * @ja String 型であるか判定
        *
        * @param x
        *  - `en` evaluated value
        *  - `ja` 評価する値
        */
    export function isString(x: any): x is string;
    /**
        * @es Check the value-type is Number
        * @ja Number 型であるか判定
        *
        * @param x
        *  - `en` evaluated value
        *  - `ja` 評価する値
        */
    export function isNumber(x: any): x is number;
    /**
        * @es Check the value-type is Boolean
        * @ja Boolean 型であるか判定
        *
        * @param x
        *  - `en` evaluated value
        *  - `ja` 評価する値
        */
    export function isBoolean(x: any): x is boolean;
    /**
        * @es Check the value-type is Symble
        * @ja Symbol 型であるか判定
        *
        * @param x
        *  - `en` evaluated value
        *  - `ja` 評価する値
        */
    export function isSymbol(x: any): x is symbol;
    /**
        * @es Check the value-type is primitive type
        * @ja プリミティブ型であるか判定
        *
        * @param x
        *  - `en` evaluated value
        *  - `ja` 評価する値
        */
    export function isPrimitive(x: any): x is Primitive;
    /**
        * @es Check the value-type is Object
        * @ja Object 型であるか判定
        *
        * @param x
        *  - `en` evaluated value
        *  - `ja` 評価する値
        */
    export function isObject(x: any): x is object;
    /**
        * @es Check the value-type is Function
        * @ja Function 型であるか判定
        *
        * @param x
        *  - `en` evaluated value
        *  - `ja` 評価する値
        */
    export function isFunction(x: any): x is TypeList['function'];
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
    export function typeOf<K extends TypeKeys>(type: K, x: any): x is TypeList[K];
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
    export function instanceOf<T extends Object>(ctor: Nillable<Type<T>>, x: any): x is T;
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
    export function ownInstanceOf<T extends Object>(ctor: Nillable<Type<T>>, x: any): x is T;
    /**
        * @es Get the value's class name
        * @ja クラス名を取得
        *
        * @param x
        *  - `en` evaluated value
        *  - `ja` 評価する値
        */
    export function className(x: any): string;
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
    export function sameType(lhs: any, rhs: any): boolean;
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
    export function sameClass(lhs: any, rhs: any): boolean;
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
    export function partialize<T extends object, K extends keyof T>(target: T, ...pickupKeys: K[]): {
            -readonly [P in K]: T[P];
    };
    export {};
}

declare module '@cdp/core-utils/verify' {
    import { TypeKeys } from '@cdp/core-utils/types';
    /**
        * @es Type verifier interface definition<br>
        *     If invalid value received, the method throws `TypeError`.
        * @ja 型検証のインターフェイス定義<br>
        *     違反した場合は `TypeError` を発生
        *
        *
        */
    interface Verifier {
            /**
                * @es Verification for the input value is not [[Nil]]
                * @ja [[Nil]] でないことを検証
                *
                * @param notNil.x
                *  - `en` evaluated value
                *  - `ja` 評価する値
                * @param notNil.message
                *  - `en` custom error message
                *  - `ja` カスタムエラーメッセージ
                */
            notNil: (x: any, message?: string | null) => void | never;
            /**
                * @es Verification for the input is [[TypeKeys]]
                * @ja 指定した [[TypeKeys]] であるか検証
                *
                * @param typeOf.type
                *  - `en` one of [[TypeKeys]]
                *  - `ja` [[TypeKeys]] を指定
                * @param typeOf.x
                *  - `en` evaluated value
                *  - `ja` 評価する値
                * @param typeOf.message
                *  - `en` custom error message
                *  - `ja` カスタムエラーメッセージ
                */
            typeOf: (type: TypeKeys, x: any, message?: string | null) => void | never;
            /**
                * @es Verification for the input value is `Array`
                * @ja `Array` であるか検証
                *
                * @param array.x
                *  - `en` evaluated value
                *  - `ja` 評価する値
                * @param array.message
                *  - `en` custom error message
                *  - `ja` カスタムエラーメッセージ
                */
            array: (x: any, message?: string | null) => void | never;
            /**
                * @es Verification for the input value is `Iterable`
                * @ja `Iterable` であるか検証
                *
                * @param iterable.x
                *  - `en` evaluated value
                *  - `ja` 評価する値
                * @param iterable.message
                *  - `en` custom error message
                *  - `ja` カスタムエラーメッセージ
                */
            iterable: (x: any, message?: string | null) => void | never;
            /**
                * @es Verification for the input instance is equal comparative target constructor
                * @ja 指定コンストラクタのインスタンスであるか検証
                *
                * @param instanceOf.ctor
                *  - `en` comparative target constructor
                *  - `ja` 比較対象のコンストラクタ
                * @param instanceOf.x
                *  - `en` evaluated value
                *  - `ja` 評価する値
                * @param instanceOf.message
                *  - `en` custom error message
                *  - `ja` カスタムエラーメッセージ
                */
            instanceOf: (ctor: Function, x: any, message?: string | null) => void | never;
            /**
                * @es Verification for the input instance has `strictly` comparative target constructor
                * @ja 指定コンストラクタの厳密一致したインスタンスであるか検証
                *
                * @param ownInstanceOf.ctor
                *  - `en` comparative target constructor
                *  - `ja` 比較対象のコンストラクタ
                * @param ownInstanceOf.x
                *  - `en` evaluated value
                *  - `ja` 評価する値
                * @param ownInstanceOf.message
                *  - `en` custom error message
                *  - `ja` カスタムエラーメッセージ
                */
            ownInstanceOf: (ctor: Function, x: any, message?: string | null) => void | never;
            /**
                * @es Verification for the input instance has not `strictly` equal comparative target constructor
                * @ja 指定コンストラクタを持つインスタンスでないことを検証
                *
                * @param notOwnInstanceOf.ctor
                *  - `en` comparative target constructor
                *  - `ja` 比較対象のコンストラクタ
                * @param notOwnInstanceOf.x
                *  - `en` evaluated value
                *  - `ja` 評価する値
                * @param notOwnInstanceOf.message
                *  - `en` custom error message
                *  - `ja` カスタムエラーメッセージ
                */
            notOwnInstanceOf: (ctor: Function, x: any, message?: string | null) => void | never;
            /**
                * @es Verification for the input value has specified property
                * @ja 指定プロパティを持っているか検証
                *
                * @param hasProperty.prop
                *  - `en` specified property
                *  - `ja` 対象のプロパティ
                * @param hasProperty.x
                *  - `en` evaluated value
                *  - `ja` 評価する値
                * @param hasProperty.message
                *  - `en` custom error message
                *  - `ja` カスタムエラーメッセージ
                */
            hasProperty: (x: any, prop: PropertyKey, message?: string | null) => void | never;
            /**
                * @es Verification for the input value has own specified property
                * @ja 指定プロパティを入力値自身持っているか検証
                *
                * @param hasOwnProperty.prop
                *  - `en` specified property
                *  - `ja` 対象のプロパティ
                * @param hasOwnProperty.x
                *  - `en` evaluated value
                *  - `ja` 評価する値
                * @param hasOwnProperty.message
                *  - `en` custom error message
                *  - `ja` カスタムエラーメッセージ
                */
            hasOwnProperty: (x: any, prop: PropertyKey, message?: string | null) => void | never;
    }
    /**
        * @es List of method for type verify
        * @ja 型検証が提供するメソッド一覧
        */
    type VerifyMethod = keyof Verifier;
    /**
        * @es Verify method
        * @ja 検証メソッド
        *
        * @param method
        *  - `en` method name which using
        *  - `ja` 使用するメソッド名
        * @param args
        *  - `en` arguments which corresponds to the method name
        *  - `ja` メソッド名に対応する引数
        */
    export function verify<TMethod extends VerifyMethod>(method: TMethod, ...args: Parameters<Verifier[TMethod]>): void | never;
    export { verify as default };
}

declare module '@cdp/core-utils/mixins' {
    import { Type, Class, Constructor } from '@cdp/core-utils/types';
    /**
        * @es Mixin class's base interface
        * @ja Mixin クラスの基底インターフェイス定義
        */
    export class MixinClass {
            /**
                * @es call mixin source class's `super()`
                *     This method should be called from constructor.
                * @ja Mixin クラスの基底インターフェイス定義
                *     コンストラクタから呼ぶことを想定
                *
                * @param srcClass
                *  - `en` construction target class name. ex) from S1 available
                *  - `ja` コンストラクトするクラス名を指定 ex) S1 から指定可能
                * @param args
                *  - `en` construction parameters
                *  - `ja` コンストラクトに使用する引数
                */
            protected super<T extends Class>(srcClass: T, ...args: ConstructorParameters<T>): this;
            /**
                * @es Check the input class is mixined (excluding own class)
                * @ja 指定クラスが Mixin されているか確認 (自身のクラスは含まれない)
                *
                * @param mixedClass
                *  - `en` set target class constructor
                *  - `ja` 対象クラスのコンストラクタを指定
                */
            isMixedWith<T>(mixedClass: Constructor<T>): boolean;
    }
    /**
        * @es Mixed sub class constructor definition
        * @ja 合成したサブクラスのコンストラクタ定義
        */
    export interface MixinConstructor<B extends Class, U> extends Type<U> {
            /**
                * @es constructor
                * @ja コンストラクタ
                *
                * @param args
                *  - `en` base class arguments
                *  - `ja` 基底クラスに指定した引数
                * @returns
                *  - `en` union type of classes when calling [[mixins]]()
                *  - `ja` [[mixins]]() に渡したクラスの集合
                */
            new (...args: ConstructorParameters<B>): U;
    }
    /**
        * @es Setup [Symbol.hasInstance] property
        *     The class designated as a source of [[mixins]]() has [Symbol.hasInstance] property implicitly.
        *     It's used to avoid becoming the behavior `instanceof` doesn't intend when the class is extended from the mixined class the other place.
        * @ja [Symbol.hasInstance] プロパティ設定関数
        *     [[mixins]]() のソースに指定されたクラスは [Symbol.hasInstance] を暗黙的に備えるため,
        *     そのクラスが他で継承されている場合 `instanceof` が意図しない振る舞いとなるのを避けるために使用する.
        *
        * @example <br>
        *
        * ```ts
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
        * setInstanceOf(Other); // or setInstanceOf(Other, null);
        * console.log(mixed instanceof Other);         // false !
        * ```
        *
        * @param target
        *  - `en` set target constructor
        *  - `ja` 設定対象のコンストラクタ
        * @param method
        *  - `en` function by using [Symbol.hasInstance]
        *         Default behaviour is `{ return target.prototype.isPrototypeOf(instance) }`
        *         If set `null`, delete [Symbol.hasInstance] property.
        *  - `ja` [Symbol.hasInstance] が使用する関数を指定
        *         既定では `{ return target.prototype.isPrototypeOf(instance) }` が使用される
        *         `null` 指定をすると [Symbol.hasInstance] プロパティを削除する
        */
    export function setInstanceOf<T>(target: Constructor<T>, method?: ((inst: object) => boolean) | null): void;
    /**
        * @es Mixin function for multiple inheritance
        *     Resolving type support for maximum 10 classes.
        * @ja 多重継承のための Mixin 関数
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
        *         // calling Mixin classes' constructor
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
    export function mixins<B extends Class, S1, S2, S3, S4, S5, S6, S7, S8, S9>(base: B, ...sources: [Constructor<S1>, Constructor<S2>?, Constructor<S3>?, Constructor<S4>?, Constructor<S5>?, Constructor<S6>?, Constructor<S7>?, Constructor<S8>?, Constructor<S9>?, ...any[]]): MixinConstructor<B, MixinClass & InstanceType<B> & S1 & S2 & S3 & S4 & S5 & S6 & S7 & S8 & S9>;
}

