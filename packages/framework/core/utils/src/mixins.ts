/* eslint-disable @typescript-eslint/no-explicit-any */

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
    public isMixedWith<T>(mixedClass: Constructor<T>): boolean;
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
    new(...args: ConstructorParameters<B>): U;
}

//__________________________________________________________________________________________________//

const _objPrototype = Object.prototype;
const _instanceOf   = Function.prototype[Symbol.hasInstance];
const _override     = Symbol('override');
const _isInherited  = Symbol('isInherited');
const _constructors = Symbol('constructors');
const _classBase    = Symbol('classBase');
const _classSources = Symbol('classSources');

// object properties copy method
function copyProperties(target: object, source?: object): void {
    source && Object.getOwnPropertyNames(source)
        .filter(key => !/(prototype|name|constructor)/.test(key))
        .forEach(key => {
            if (null == target[key]) {
                Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key) as PropertyDecorator);
            }
        });
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
export function setInstanceOf<T extends {}>(target: Constructor<T>, method?: ((inst: object) => boolean) | null): void {
    const behaviour = method || (null === method ? undefined : ((i: object) => target.prototype.isPrototypeOf(i)));
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
export function mixins<B extends Class, S1, S2, S3, S4, S5, S6, S7, S8, S9>(
    base: B,
    ...sources: [
        Constructor<S1>,
        Constructor<S2>?,
        Constructor<S3>?,
        Constructor<S4>?,
        Constructor<S5>?,
        Constructor<S6>?,
        Constructor<S7>?,
        Constructor<S8>?,
        Constructor<S9>?,
        ...any[]
    ]): MixinConstructor<B, MixinClass & InstanceType<B> & S1 & S2 & S3 & S4 & S5 & S6 & S7 & S8 & S9> {

    // provide custom instanceof
    for (const srcClass of sources) {
        const desc = Object.getOwnPropertyDescriptor(srcClass, Symbol.hasInstance);
        if (!desc || desc.writable) {
            const orgInstanceOf = desc ? srcClass[Symbol.hasInstance] : _instanceOf;
            setInstanceOf(srcClass, (inst: object) => {
                return orgInstanceOf.call(srcClass, inst) || (inst[_isInherited] && inst[_isInherited](srcClass));
            });
        }
    }

    // eslint-disable-next-line @typescript-eslint/class-name-casing
    return class _MixinBase extends (base as any as Constructor<MixinClass>) {

        private readonly [_constructors]: Map<Constructor<any>, Function | null>;
        private readonly [_classBase]: Constructor<any>;

        constructor(...args: any[]) {
            // eslint-disable-next-line constructor-super
            super(...args);

            const constructors = new Map<Constructor<any>, Function>();
            for (const srcClass of sources) {
                const handler = {
                    apply: (target: any, thisobj: any, arglist: any[]) => {
                        copyProperties(_MixinBase.prototype, srcClass.prototype);
                        let parent = Object.getPrototypeOf(srcClass.prototype);
                        while (_objPrototype !== parent) {
                            copyProperties(_MixinBase.prototype, parent);
                            parent = Object.getPrototypeOf(parent);
                        }
                        const obj = new srcClass(...arglist);
                        copyProperties(this, obj);
                    }
                };

                // proxy for 'construct' and cache constructor
                constructors.set(srcClass, new Proxy(srcClass, handler));
            }

            this[_constructors] = constructors;
            this[_classBase]    = base;
        }

        protected super<T extends Class>(srcClass: T, ...args: ConstructorParameters<T>): this {
            const map = this[_constructors];
            const ctor = map.get(srcClass);
            if (ctor) {
                ctor(...args);
                map.set(srcClass, null);    // prevent calling twice
            }
            return this;
        }

        public isMixedWith<T>(srcClass: Constructor<T>): boolean {
            if (this.constructor === srcClass) {
                return false;
            } else if (this[_classBase] === srcClass) {
                return true;
            } else {
                return this[_classSources].reduce((p, c) => p || (srcClass === c), false);
            }
        }

        public static [Symbol.hasInstance](instance: any): boolean {
            return _MixinBase.prototype.isPrototypeOf(instance);
        }

        public [_isInherited]<T>(srcClass: Constructor<T>): boolean {
            const ctors = this[_constructors];
            if (ctors.has(srcClass)) {
                return true;
            }
            for (const ctor of ctors.keys()) {
                if (srcClass.isPrototypeOf(ctor)) {
                    return true;
                }
            }
            return false;
        }

        private get [_classSources](): Constructor<any>[] {
            return [...this[_constructors].keys()];
        }

    } as any;
}
