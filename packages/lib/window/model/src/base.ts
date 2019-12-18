/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    Arguments,
    luid,
    escapeHTML,
} from '@cdp/core-utils';
import { Subscription, Silenceable } from '@cdp/event-publisher';
import { ObservableObject } from '@cdp/observable';
import {
    RESULT_CODE,
    Result,
    makeResult,
    SUCCEEDED,
    FAILED,
} from '@cdp/result';
import {
    ModelEvent,
    ModelValidateAttributeOptions,
    ModelAttributeInput,
    ModelSetOptions,
    ModelConstructionOptions,
} from './interfaces';

const _defineAttributes = Symbol('define');
const _validate         = Symbol('validate');
const _changeHandler    = Symbol('onchange');
const _properties       = Symbol('properties');

/** @internal */
interface Property<T> {
    attrs: ObservableObject;
    baseAttrs: T;
    prevAttrs: T;
    readonly idAttribute: string;
    readonly cid: string;
}

/**
 * @en Valid attributes result.
 * @ja 属性検証の有効値
 */
export const RESULT_VALID_ATTRS = Object.freeze(makeResult(RESULT_CODE.SUCCESS, 'valid attribute.'));

/**
 * @en [[Model]] base class definition.
 * @ja [[Model]] の基底クラス定義
 *
 * @example <br>
 *
 * ```ts
 * import { ModelBase, ModelConstructor } from '@cdp/model';
 *
 * interface ContentAttribute {
 *   uri: string;
 *   readonly size: number;
 *   cookie?: string;
 * }
 * ```
 *
 * - Basic Usage
 *
 * ```ts
 * // early cast
 * const Mode = ModelBase as ModelConstructor<ModelBase<ContentAttribute>, ContentAttribute>;
 *
 * class Content extends Model {
 *   constructor(attrs: ContentAttribute) {
 *     super(attrs);
 *   }
 * }
 * ```
 *
 * or
 *
 * ```ts
 * class ContentBase extends ModelBase<ContentAttribute> {
 *   constructor(attrs: ContentAttribute) {
 *     super(attrs);
 *   }
 * }
 *
 * // late cast
 * const Content = ContentBase as ModelConstructor<Content, ContentAttribute>;
 * ```
 * then
 *
 * ```ts
 * const content = new Content({
 *   uri: 'aaa.txt',
 *   size: 10,
 *   cookie: undefined, // need explicit assign
 * });
 *
 * console.log(content.uri);    // 'aaa.txt'
 * console.log(content.size);   // '10'
 * console.log(content.cookie); // 'undefined'
 * ```
 *
 * - Using Custom Event
 *
 * ```ts
 * import { ModelEvent } from '@cdp/model';
 *
 * interface CustomEvent extends ModelEvent<ContentAttribute> {
 *   fire: [boolean, number];
 * }
 * 
 * :
 *
 * // early cast
 * const Mode = ModelBase as ModelConstructor<ModelBase<ContentAttribute, CustomEvent>, ContentAttribute>;
 *
 * // late cast
 * class ContentBase extends ModelBase<ContentAttribute, CustomEvent> {
 *   :
 * }
 *
 * const content = new Content({ ... });
 * content.trigger('fire', true, 100);
 * ```
 */
abstract class Model<T extends {} = {}, Event extends ModelEvent<T> = ModelEvent<T>> {
    /**
     * @en Attributes pool
     * @ja 属性格納領域
     */
    private readonly [_properties]: Property<T>;

    /**
     * constructor
     *
     * @param attributes
     *  - `en` initial attribute values
     *  - `ja` 属性の初期値を指定
     */
    constructor(attributes: Required<T>, options?: ModelConstructionOptions<T>) {
        const opts = Object.assign({ idAttribute: 'id' }, options);

        const props: Property<T> = {
            attrs: ObservableObject.from(attributes),
            baseAttrs: { ...attributes },
            prevAttrs: { ...attributes },
            idAttribute: opts.idAttribute,
            cid: luid('model:', 8),
        };
        Object.defineProperty(this, _properties, { value: Object.seal(props) });

        for (const key of Object.keys(attributes)) {
            this[_defineAttributes](this, key);
        }

        this[_changeHandler] = () => {
            (this as any).trigger('change', { ...this._attrs });
        };

        this[_validate]({}, opts);
    }

    /** @internal attribute bridge def */
    private [_defineAttributes](instance: any, name: string): void {
        const proto = instance.constructor.prototype;
        if (!(name in proto)) {
            Object.defineProperty(proto, name, {
                get(): unknown {
                    return this._attrs[name];
                },
                set(val: unknown): void {
                    this._prevAttrs[name] = this._attrs[name];
                    this._attrs[name]     = val;
                },
                enumerable: true,
                configurable: true,
            });
        }
    }

///////////////////////////////////////////////////////////////////////
// accessor: public properties

    /**
     * @en Get content ID.
     * @ja コンテンツ ID を取得
     */
    get id(): string {
        const { idAttribute, cid, attrs } = this[_properties];
        return (idAttribute in attrs) ? attrs[idAttribute] : cid;
    }

///////////////////////////////////////////////////////////////////////
// accessor: protected properties

    /**
     * @en Attributes instance
     * @ja 属性を格納するインスタンス
     */
    protected get _attrs(): ObservableObject {
        return this[_properties].attrs;
    }

    /**
     * @en Default attributes instance
     * @ja 既定値属性を格納するインスタンス
     */
    protected get _baseAttrs(): T {
        return this[_properties].baseAttrs;
    }

    /**
     * @en Previous attributes instance
     * @ja 変更前の属性を格納するインスタンス
     */
    protected get _prevAttrs(): T {
        return this[_properties].prevAttrs;
    }

    /**
     * @en Get internal content ID.
     * @ja 内部のコンテンツ ID を取得
     */
    protected get _cid(): string {
        return this[_properties].cid;
    }

///////////////////////////////////////////////////////////////////////
// operations: events

    /**
     * @en Notify event to clients.
     * @ja event 発行
     *
     * @param channel
     *  - `en` event channel key. (string | symbol)
     *  - `ja` イベントチャネルキー (string | symbol)
     * @param args
     *  - `en` arguments for callback function of the `channel` corresponding.
     *  - `ja` `channel` に対応したコールバック関数に渡す引数
     */
    public trigger<Channel extends keyof Event>(channel: Channel, ...args: Arguments<Partial<Event[Channel]>>): void {
        (this._attrs as any).trigger(channel, ...args);
    }

    /**
     * @en Unsubscribe event(s).
     * @ja イベント購読解除
     *
     * @param channel
     *  - `en` target event channel key. (string | symbol)
     *         When not set this parameter, everything is released.
     *  - `ja` 対象のイベントチャネルキー (string | symbol)
     *         指定しない場合はすべて解除
     * @param listener
     *  - `en` callback function of the `channel` corresponding.
     *         When not set this parameter, all same `channel` listeners are released.
     *  - `ja` `channel` に対応したコールバック関数
     *         指定しない場合は同一 `channel` すべてを解除
     */
    public off<Channel extends keyof Event>(channel?: Channel | Channel[], listener?: (...args: Arguments<Event[Channel]>) => unknown): void {
        this._attrs.off(channel as any, listener as any);
    }

    /**
     * @en Subscrive event(s).
     * @ja イベント購読設定
     *
     * @param channel
     *  - `en` target event channel key. (string | symbol)
     *  - `ja` 対象のイベントチャネルキー (string | symbol)
     * @param listener
     *  - `en` callback function of the `channel` corresponding.
     *  - `ja` `channel` に対応したコールバック関数
     */
    public on<Channel extends keyof Event>(channel: Channel | Channel[], listener: (...args: Arguments<Event[Channel]>) => unknown): Subscription {
        if ('change' === channel) {
            this._attrs.on('*', this[_changeHandler]);
        }
        return this._attrs.on(channel as any, listener as any);
    }

    /**
     * @en Subscrive event(s) but it causes the bound callback to only fire once before being removed.
     * @ja 一度だけハンドリング可能なイベント購読設定
     *
     * @param channel
     *  - `en` target event channel key. (string | symbol)
     *  - `ja` 対象のイベントチャネルキー (string | symbol)
     * @param listener
     *  - `en` callback function of the `channel` corresponding.
     *  - `ja` `channel` に対応したコールバック関数
     */
    public once<Channel extends keyof Event>(channel: Channel | Channel[], listener: (...args: Arguments<Event[Channel]>) => unknown): Subscription {
        const context = this.on(channel, listener);
        const managed = this.on(channel, () => {
            context.unsubscribe();
            managed.unsubscribe();
        });
        return context;
    }

///////////////////////////////////////////////////////////////////////
// operations: validation

    /**
     * @en Check valid or not.
     * @ja 検証の成否を取得
     */
    get isValid(): boolean {
        return SUCCEEDED(this.validate({ silent: true }).code);
    }

    /**
     * @en Validate result accesser.
     * @ja 検証結果にアクセス
     */
    public validate(options?: Silenceable): Result {
        const opts = Object.assign({ validate: true, noThrow: true, extend: false }, options);
        return this[_validate]({}, opts);
    }

    /* eslint-disable @typescript-eslint/no-unused-vars */

    /**
     * @en Validate data method.
     * @ja データ検証
     *
     * @override
     *
     * @param attributes
     *  - `en` validatee attributes
     *  - `ja` 被検証属性
     * @param options
     *  - `en` validate options
     *  - `ja` 検証オプション
     */
    protected validateAttributes<A extends T>(attributes: ModelAttributeInput<A>, options?: ModelValidateAttributeOptions): Result {
        return RESULT_VALID_ATTRS;
    }

    /* eslint-enable @typescript-eslint/no-unused-vars */

    /** @internal validate */
    private [_validate]<A extends T>(attributes: ModelAttributeInput<A>, options?: ModelSetOptions): Result | never {
        const { validate, silent, noThrow } = options || {};
        if (validate) {
            const attrs = { ...this._attrs, ...attributes };
            const result = this.validateAttributes(attrs, options);
            if (FAILED(result.code)) {
                if (!silent) {
                    (this as any).trigger('invalid', attrs, result);
                }
                if (!noThrow) {
                    throw result;
                }
            }
            return result;
        } else {
            return RESULT_VALID_ATTRS;
        }
    }

///////////////////////////////////////////////////////////////////////
// operations: attributes

    /**
     * @en Check the [[Model]] has valid property. (not `null` or `undefined`)
     * @ja [[Model]] が有効なプロパティを持っているか確認 (`null` または `undefined` でない)
     */
    public has(attribute: keyof T): boolean {
        return null != (this._attrs as any)[attribute];
    }

    /**
     * @en Get the HTML-escaped value of an attribute.
     * @ja HTML で使用する文字を制御文字に置換した属性値を取得
     */
    public escape(attribute: keyof T): string {
        return escapeHTML((this._attrs as any)[attribute]);
    }

    /**
     * @en Update attributes for batch input with options.
     * @ja 属性の一括設定
     *
     * @param attributes
     *  - `en` update attributes
     *  - `ja` 更新属性
     * @param options
     *  - `en` set attributes options
     *  - `ja` 属性更新用オプション
     */
    public setAttributes<A extends T>(attributes: ModelAttributeInput<A>, options?: ModelSetOptions): this {
        const { silent, extend } = options || {};

        try {
            if (silent) {
                this._attrs.suspend(true);
            }

            const result = this[_validate](attributes, options);
            if (FAILED(result.code)) {
                return this;
            }

            for (const attr of Object.keys(attributes)) {
                if (attr in this._attrs) {
                    this._attrs[attr] = attributes[attr];
                } else if (extend) {
                    this[_defineAttributes](this, attr);
                    this._attrs[attr] = attributes[attr];
                }
            }
        } finally {
            if (silent) {
                this._attrs.resume();
            }
        }

        return this;
    }

    /**
     * @en Clear all attributes on the [[Model]]. (set `undefined`)
     * @ja [[Model]] からすべての属性を削除 (`undefined` を設定)
     */
    public clear(options?: ModelSetOptions): this {
        const clearAttrs = {};
        for (const attr of Object.keys(this._baseAttrs)) {
            clearAttrs[attr] = undefined;
        }
        return this.setAttributes(clearAttrs, options);
    }
}

export { Model as ModelBase };

/*
 PROGRESS:

● Events
☆ on
☆ off
☆ trigger
☆ once
★ listenTo
★ stopListening
★ listenToOnce

● Model
☆ extend
☆ preinitialize
☆ constructor / initialize
☆ get
☆ set
☆ escape
☆ has
△ unset
☆ clear
☆ id
☆ idAttribute
☆ cid
△ attributes
★ changed
△ defaults
★ toJSON
★ sync
★ fetch
★ save
★ destroy

● Underscore
☆ validate
△ validationError
☆ isValid
★ url
★ urlRoot
★ parse
★ clone
★ isNew
★ hasChanged
★ changedAttributes
△ previous
★ previousAttributes
 */
