/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import type {
    UnknownFunction,
    UnknownObject,
    Accessible,
    Nullish,
    Type,
    Class,
    Constructor,
} from './types';

/**
 * @en Mixin class's base interface.
 * @ja Mixin クラスの基底インターフェイス定義
 */
export declare class MixinClass {
    /**
     * @en call mixin source class's `super()`. <br>
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
     * @en Check the input class is mixined (excluding own class).
     * @ja 指定クラスが Mixin されているか確認 (自身のクラスは含まれない)
     *
     * @param mixedClass
     *  - `en` set target class constructor
     *  - `ja` 対象クラスのコンストラクタを指定
     */
    public isMixedWith<T extends object>(mixedClass: Constructor<T>): boolean;
}

/**
 * @en Mixed sub class constructor definitions.
 * @ja 合成したサブクラスのコンストラクタ定義
 */
export interface MixinConstructor<B extends Class, U extends object> extends Type<U> {
    /**
     * @en constructor
     * @ja コンストラクタ
     *
     * @param args
     *  - `en` base class arguments
     *  - `ja` 基底クラスに指定した引数
     * @returns
     *  - `en` union type of classes when calling {@link mixins}()
     *  - `ja` {@link mixins}() に渡したクラスの集合
     */
    new(...args: ConstructorParameters<B>): U;
}

/**
 * @en Definition of {@link setMixClassAttribute} function's arguments.
 * @ja {@link setMixClassAttribute} の取りうる引数定義
 */
export interface MixClassAttribute {
    /**
     * @en Suppress providing constructor-trap for the mixin source class. In this case, `isMixedWith`, `instanceof` also becomes invalid. (for improving performance)
     * @ja Mixin Source クラスに対して, コンストラクタトラップを抑止. これを指定した場合, `isMixedWith`, `instanceof` も無効になる. (パフォーマンス改善)
     */
    protoExtendsOnly: void;

    /**
     * @en Setup [Symbol.hasInstance] property. <br>
     *     The class designated as a source of {@link mixins}() has [Symbol.hasInstance] property implicitly. <br>
     *     It's used to avoid becoming the behavior `instanceof` doesn't intend when the class is extended from the mixined class the other place.
     * @ja [Symbol.hasInstance] プロパティ設定<br>
     *     {@link mixins}() のソースに指定されたクラスは [Symbol.hasInstance] を暗黙的に備えるため<br>
     *     そのクラスが他で継承されている場合 `instanceof` が意図しない振る舞いとなるのを避けるために使用する.
     */
    instanceOf: ((inst: object) => boolean) | Nullish;
}

//__________________________________________________________________________________________________//

/** @internal */ const _objPrototype     = Object.prototype;
/** @internal */ const _instanceOf       = Function.prototype[Symbol.hasInstance];
/** @internal */ const _override         = Symbol('override');
/** @internal */ const _isInherited      = Symbol('is-inherited');
/** @internal */ const _constructors     = Symbol('constructors');
/** @internal */ const _classBase        = Symbol('class-base');
/** @internal */ const _classSources     = Symbol('class-sources');
/** @internal */ const _protoExtendsOnly = Symbol('proto-extends-only');

/** @internal copy properties core */
function reflectProperties(target: UnknownObject, source: object, key: string | symbol): void {
    try {
        if (null == target[key]) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key) as PropertyDecorator);
        }
    } catch {
        // noop
    }
}

/** @internal object properties copy method */
function copyProperties(target: object, source: object): void {
    source && Object.getOwnPropertyNames(source)
        .filter(key => !/(prototype|name|constructor)/.test(key))
        .forEach(key => {
            reflectProperties(target as UnknownObject, source, key);
        });
    source && Object.getOwnPropertySymbols(source)
        .forEach(key => {
            reflectProperties(target as UnknownObject, source, key);
        });
}

/** @internal helper for setMixClassAttribute(target, 'instanceOf') */
function setInstanceOf<T extends object>(target: Constructor<T>, method: ((inst: object) => boolean) | Nullish): void {
    const behaviour = method ?? (null === method ? undefined : ((i: object) => Object.prototype.isPrototypeOf.call(target.prototype, i)));
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
export function setMixClassAttribute<T extends object, U extends keyof MixClassAttribute>(
    target: Constructor<T>,
    attr: U,
    method?: MixClassAttribute[U]
): void {
    switch (attr) {
        case 'protoExtendsOnly':
            (target as Accessible<Constructor<T>>)[_protoExtendsOnly] = true;
            break;
        case 'instanceOf':
            setInstanceOf(target, method);
            break;
        default:
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
export function mixins<
    B extends Class,
    S1 extends object,
    S2 extends object,
    S3 extends object,
    S4 extends object,
    S5 extends object,
    S6 extends object,
    S7 extends object,
    S8 extends object,
    S9 extends object>(
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

    let _hasSourceConstructor = false;

    class _MixinBase extends (base as unknown as Constructor<MixinClass>) {

        private readonly [_constructors]: Map<Constructor<object>, UnknownFunction | null>;
        private readonly [_classBase]: Constructor<object>;

        constructor(...args: unknown[]) {
            super(...args);

            const constructors = new Map<Constructor<object>, UnknownFunction>();
            this[_constructors] = constructors;
            this[_classBase] = base;

            if (_hasSourceConstructor) {
                for (const srcClass of sources) {
                    if (!srcClass[_protoExtendsOnly]) {
                        const handler = {
                            apply: (target: unknown, thisobj: unknown, arglist: unknown[]) => {
                                const obj = new srcClass(...arglist);
                                copyProperties(this, obj);
                            }
                        };
                        // proxy for 'construct' and cache constructor
                        constructors.set(srcClass, new Proxy(srcClass, handler as ProxyHandler<object>));
                    }
                }
            }
        }

        protected super<T extends Class>(srcClass: T, ...args: ConstructorParameters<T>): this {
            const map = this[_constructors];
            const ctor = map.get(srcClass);
            if (ctor) {
                ctor.call(this, ...args);
                map.set(srcClass, null);    // prevent calling twice
            }
            return this;
        }

        public isMixedWith<T extends object>(srcClass: Constructor<T>): boolean {
            if (this.constructor === srcClass) {
                return false;
            } else if (this[_classBase] === srcClass) {
                return true;
            } else {
                return this[_classSources].reduce((p, c) => p || (srcClass === c), false);
            }
        }

        public static [Symbol.hasInstance](instance: unknown): boolean {
            return Object.prototype.isPrototypeOf.call(_MixinBase.prototype, instance);
        }

        public [_isInherited]<T extends object>(srcClass: Constructor<T>): boolean {
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

        private get [_classSources](): Constructor<object>[] {
            return [...this[_constructors].keys()];
        }
    }

    for (const srcClass of sources) {
        // provide custom instanceof
        const desc = Object.getOwnPropertyDescriptor(srcClass, Symbol.hasInstance);
        if (!desc || desc.writable) {
            const orgInstanceOf = desc ? srcClass[Symbol.hasInstance] : _instanceOf;
            setInstanceOf(srcClass, (inst: UnknownObject) => {
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                return orgInstanceOf.call(srcClass, inst) || ((inst?.[_isInherited]) ? (inst[_isInherited] as UnknownFunction)(srcClass) : false);
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

    return _MixinBase as any;
}
