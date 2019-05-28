import { Type, Class, Constructor } from './types';
/**
 * @es Mixin class's base interface.
 * @ja Mixin クラスの基底インターフェイス定義
 */
export declare class MixinClass {
    /**
     * @es call mixin source class's `super()`. <br>
     *     This method should be called from constructor.
     * @ja Mixin クラスの基底インターフェイス定義 <br>
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
     * @es Check the input class is mixined (excluding own class).
     * @ja 指定クラスが Mixin されているか確認 (自身のクラスは含まれない)
     *
     * @param mixedClass
     *  - `en` set target class constructor
     *  - `ja` 対象クラスのコンストラクタを指定
     */
    isMixedWith<T>(mixedClass: Constructor<T>): boolean;
}
/**
 * @es Mixed sub class constructor definitions.
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
 * @es Setup [Symbol.hasInstance] property. <br>
 *     The class designated as a source of [[mixins]]() has [Symbol.hasInstance] property implicitly. <br>
 *     It's used to avoid becoming the behavior `instanceof` doesn't intend when the class is extended from the mixined class the other place.
 * @ja [Symbol.hasInstance] プロパティ設定関数 <br>
 *     [[mixins]]() のソースに指定されたクラスは [Symbol.hasInstance] を暗黙的に備えるため<br>
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
 *  - `en` function by using [Symbol.hasInstance] <br>
 *         Default behaviour is `{ return target.prototype.isPrototypeOf(instance) }`
 *         If set `null`, delete [Symbol.hasInstance] property.
 *  - `ja` [Symbol.hasInstance] が使用する関数を指定 <br>
 *         既定では `{ return target.prototype.isPrototypeOf(instance) }` が使用される
 *         `null` 指定をすると [Symbol.hasInstance] プロパティを削除する
 */
export declare function setInstanceOf<T>(target: Constructor<T>, method?: ((inst: object) => boolean) | null): void;
/**
 * @es Mixin function for multiple inheritance. <br>
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
export declare function mixins<B extends Class, S1, S2, S3, S4, S5, S6, S7, S8, S9>(base: B, ...sources: [Constructor<S1>, Constructor<S2>?, Constructor<S3>?, Constructor<S4>?, Constructor<S5>?, Constructor<S6>?, Constructor<S7>?, Constructor<S8>?, Constructor<S9>?, ...any[]]): MixinConstructor<B, MixinClass & InstanceType<B> & S1 & S2 & S3 & S4 & S5 & S6 & S7 & S8 & S9>;
