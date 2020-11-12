/* eslint-disable
    @typescript-eslint/no-explicit-any
 */

import {
    Nil,
    PlainObject,
    Constructor,
    Class,
    Arguments,
    isArray,
    isObject,
    isEmptyObject,
    luid,
    escapeHTML,
    deepCopy,
    deepEqual,
    diff,
    setMixClassAttribute,
} from '@cdp/core-utils';
import {
    Subscription,
    Silenceable,
    EventBroker,
    EventReceiver,
    EventSource,
} from '@cdp/events';
import { checkCanceled as cc } from '@cdp/promise';
import {
    IObservable,
    IObservableEventBrokerAccess,
    ObservableObject,
} from '@cdp/observable';
import {
    RESULT_CODE,
    Result,
    makeResult,
    SUCCEEDED,
    FAILED,
} from '@cdp/result';
import { SyncContext, defaultSync } from '@cdp/data-sync';
import {
    ModelEvent,
    ModelValidateAttributeOptions,
    ModelAttributeInput,
    ModelSetOptions,
    ModelConstructionOptions,
    ModelSyncMethods,
    ModelSyncResult,
    ModelDataSyncOptions,
    ModelFetchOptions,
    ModelSaveOptions,
    ModelDestroyOptions,
} from './interfaces';

const _defineAttributes = Symbol('define');
const _validate         = Symbol('validate');
const _changeHandler    = Symbol('onchange');
const _broker           = Symbol('broker');
const _properties       = Symbol('properties');

/** @internal */
interface Property<T> {
    attrs: ObservableObject;
    baseAttrs: T;
    prevAttrs: T;
    changedAttrs?: Partial<T>;
    readonly cid: string;
    readonly options: ModelSetOptions;
}

/**
 * @en Valid attributes result.
 * @ja 属性検証の有効値
 */
export const RESULT_VALID_ATTRS = Object.freeze(makeResult(RESULT_CODE.SUCCESS, 'valid attribute.'));

/** @internal helper for save() */
function parseSaveArgs<A extends object>(...args: any[]): { attrs?: ModelAttributeInput<A>; options?: ModelSaveOptions; } {
    let [key, value, options] = args; // eslint-disable-line prefer-const
    let attrs: any;

    if (null == key || isObject(key)) {
        attrs = key;
        options = value;
    } else {
        (attrs = {})[key] = value;
    }

    if (options && options.data) {
        attrs = Object.assign(attrs || {}, options.data);
    }

    return { attrs, options };
}

//__________________________________________________________________________________________________//

/**
 * @en [[Model]] base class definition.
 * @ja [[Model]] の基底クラス定義
 *
 * @example <br>
 *
 * ```ts
 * import { Model, ModelConstructor } from '@cdp/model';
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
 * const ContentBase = Model as ModelConstructor<Model<ContentAttribute>, ContentAttribute>;
 *
 * class Content extends ContentBase {
 *   constructor(attrs: ContentAttribute) {
 *     super(attrs);
 *   }
 * }
 * ```
 *
 * or
 *
 * ```ts
 * // late cast
 * class ContentClass extends Model<ContentAttribute> {
 *   constructor(attrs: ContentAttribute) {
 *     super(attrs);
 *   }
 * }
 *
 * const Content = ContentClass as ModelConstructor<ContentClass, ContentAttribute>;
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
 * const ContentBase = Model as ModelConstructor<Model<ContentAttribute, CustomEvent>, ContentAttribute>;
 * class Content extends ContentBase {
 *   :
 * }
 *
 * // late cast
 * class ContentClass extends Model<ContentAttribute, CustomEvent> {
 *   :
 * }
 * const Content = ContentClass as ModelConstructor<ContentClass, ContentAttribute>;
 *
 * const content = new Content({ ... });
 * content.trigger('fire', true, 100);
 * ```
 */
export abstract class Model<T extends object = object, Event extends ModelEvent<T> = ModelEvent<T>> extends EventReceiver implements EventSource<Event> {
    /**
     * @en Get ID attribute name.
     * @ja ID アトリビュート名にアクセス
     *
     * @override
     */
    static idAttribute = 'id';

    /**
     * @en Attributes pool
     * @ja 属性格納領域
     *
     * @internal
     */
    private readonly [_properties]: Property<T>;

    /**
     * constructor
     *
     * @param attributes
     *  - `en` initial attribute values
     *  - `ja` 属性の初期値を指定
     */
    constructor(attributes: Required<T>, options?: ModelConstructionOptions) {
        super();
        const opts = Object.assign({}, options);
        const attrs = opts.parse ? this.parse(attributes, opts) as T : attributes;
        const props: Property<T> = {
            attrs: ObservableObject.from(attrs),
            baseAttrs: { ...attrs },
            prevAttrs: { ...attrs },
            cid: luid('model:', 8),
            options: opts,
        };
        Object.defineProperty(this, _properties, { value: props });

        for (const key of Object.keys(attrs)) {
            this[_defineAttributes](this, key);
        }

        this[_changeHandler] = () => {
            (this as Model).trigger('@change', this as Model);
        };

        this[_validate]({}, opts);
    }

    /** @internal attribute bridge def */
    private [_defineAttributes](instance: object, name: string): void {
        const proto = instance.constructor.prototype;
        if (!(name in proto)) {
            Object.defineProperty(proto, name, {
                get(): unknown {
                    return this._attrs[name];
                },
                set(val: unknown): void {
                    if (!deepEqual(this._attrs[name], val)) {
                        delete this[_properties].changedAttrs;
                        this._prevAttrs[name] = this._attrs[name];
                        this._attrs[name]     = val;
                    }
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
        const idAttr = idAttribute(this, 'id');
        const { cid, attrs } = this[_properties];
        return (idAttr in attrs) ? attrs[idAttr] : cid;
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
     * @en Changed attributes instance
     * @ja 変更のあった属性を格納するインスタンス
     */
    protected get _changedAttrs(): Partial<T> {
        if (null == this[_properties].changedAttrs) {
            this[_properties].changedAttrs = diff(this._baseAttrs, this._attrs as unknown as Partial<T>);
        }
        return this[_properties].changedAttrs as Partial<T>;
    }

    /**
     * @en Get internal content ID.
     * @ja 内部のコンテンツ ID を取得
     */
    protected get _cid(): string {
        return this[_properties].cid;
    }

    /**
     * @en Get creating options.
     * @ja 構築時のオプションを取得
     */
    protected get _options(): ModelSetOptions {
        return this[_properties].options;
    }

///////////////////////////////////////////////////////////////////////
// operations: events

    /** @internal broker access */
    private get [_broker](): EventBroker<any> {
        return (this._attrs as IObservable as IObservableEventBrokerAccess).getBroker();
    }

    /**
     * @en Check whether this object has clients.
     * @ja クライアントが存在するか判定
     *
     * @param channel
     *  - `en` event channel key. (string | symbol)
     *  - `ja` イベントチャネルキー (string | symbol)
     * @param listener
     *  - `en` callback function of the `channel` corresponding.
     *  - `ja` `channel` に対応したコールバック関数
     */
    hasListener<Channel extends keyof Event>(channel?: Channel, listener?: (...args: Arguments<Event[Channel]>) => unknown): boolean {
        return this[_broker].hasListener(channel, listener);
    }

    /**
     * @en Returns registered channel keys.
     * @ja 登録されているチャネルキーを返却
     */
    channels(): (keyof Event)[] {
        return this[_broker].channels() as (keyof Event)[];
    }

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
        (this[_broker] as any).trigger(channel, ...args);
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
        if ('*' === channel || '@change' === channel || (isArray(channel) && channel.includes('@change' as Channel))) {
            this._attrs.on('@', this[_changeHandler]);
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
                    (this as Model).trigger('@invalid', this as Model, attrs, result);
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
        return null != (this._attrs as unknown as T)[attribute];
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

    /**
     * @en Return a copy of the model's `attributes` object.
     * @ja モデル属性値のコピーを返却
     */
    public toJSON(): T {
        return deepCopy({ ...this._attrs } as T);
    }

    /**
     * @es Clone this instance.
     * @ja インスタンスの複製を返却
     *
     * @override
     */
    public clone(): this {
        const { constructor, _attrs, _options } = this;
        return new (constructor as Constructor<this>)(_attrs, _options);
    }

    /**
     * @en Check changed attributes.
     * @ja 変更された属性値を持つか判定
     *
     * @param attribute
     *  - `en` checked attribute
     *  - `ja` 検証する属性
     */
    public hasChanged(attribute?: keyof T): boolean {
        if (null == attribute) {
            return !isEmptyObject(this._changedAttrs);
        } else {
            return attribute in this._changedAttrs;
        }
    }

    /**
     * @en Return an object containing all the attributes that have changed, or `undefined` if there are no changed attributes.
     * @ja 入力した attributes 値の差分に対して変更がある属性値を返却. 差分がない場合は `undefiend` を返却
     *
     * @param attributes
     *  - `en` checked attributes
     *  - `ja` 検証する属性
     */
    public changed(attributes?: Partial<T>): Partial<T> | undefined {
        if (!attributes) {
            return this.hasChanged() ? { ...this._changedAttrs } : undefined;
        } else {
            const changed = diff(this._attrs, attributes);
            return !isEmptyObject(changed) ? changed : undefined;
        }
    }

    /**
     * @en Get the previous value of an attribute, recorded at the time the last `@change` event was fired.
     * @ja `@change` が発火された前の属性値を取得
     */
    public previous<K extends keyof T>(attribute: K): T[K] {
        return this._prevAttrs[attribute];
    }

///////////////////////////////////////////////////////////////////////
// operations: sync

    /**
     * @en Check a [[Model]] is new if it has never been saved to the server, and lacks an id.
     * @ja [[Model]] がまだサーバーに存在しないかチェック. 既定では `idAttribute` の有無で判定
     */
    protected isNew(): boolean {
        const idAttr = idAttribute(this, 'id');
        return !this.has(idAttr as keyof T);
    }

    /**
     * @en Converts a response into the hash of attributes to be `set` on the model. The default implementation is just to pass the response along.
     * @ja レスポンスの変換メソッド. 既定では何もしない
     *
     * @override
     */
    protected parse(response: PlainObject | void, options?: ModelSetOptions): T | void { // eslint-disable-line @typescript-eslint/no-unused-vars
        return response as T;
    }

    /**
     * @en Proxy [[IDataSync#sync]] by default -- but override this if you need custom syncing semantics for *this* particular model.
     * @ja データ同期. 必要に応じてオーバーライド可能.
     *
     * @override
     *
     * @param method
     *  - `en` operation string
     *  - `ja` オペレーションを指定
     * @param context
     *  - `en` synchronized context object
     *  - `ja` 同期するコンテキストオブジェクト
     * @param options
     *  - `en` option object
     *  - `ja` オプション
     */
    protected sync<K extends ModelSyncMethods>(method: K, context: Model<T>, options?: ModelDataSyncOptions): Promise<ModelSyncResult<K, T>> {
        return defaultSync().sync(method, context as SyncContext<T>, options) as unknown as Promise<ModelSyncResult<K, T>>;
    }

    /**
     * @en Fetch the [[Model]] from the server, merging the response with the model's local attributes.
     * @ja [[Model]] 属性のサーバー同期. レスポンスのマージを実行
     */
    public async fetch(options?: ModelFetchOptions): Promise<T> {
        const opts = Object.assign({ parse: true }, options, { syncMethod: 'read' });

        try {
            const resp = await this.sync('read', this as Model<T>, opts);
            this.setAttributes(opts.parse ? this.parse(resp, opts) as T : resp, opts);
            (this as Model).trigger('@sync', this as Model, resp, opts);
            return resp;
        } catch (e) {
            (this as Model).trigger('@error', this as Model, e, opts);
            throw e;
        }
    }

    /**
     * @en Set a hash of [[Model]] attributes, and sync the model to the server. <br>
     *     If the server returns an attributes hash that differs, the model's state will be `set` again.
     * @ja [[Model]] 属性をサーバーに保存. <br>
     *     異なる属性が返却される場合は再設定
     *
     * @param key
     *  - `en` update attribute key
     *  - `ja` 更新属性キー
     * @param value
     *  - `en` update attribute value
     *  - `ja` 更新属性値
     * @param options
     *  - `en` save options
     *  - `ja` 保存オプション
     */
    public async save<K extends keyof T>(key?: keyof T, value?: T[K], options?: ModelSaveOptions): Promise<PlainObject | void>;

    /**
     * @en Set a hash of [[Model]] attributes, and sync the model to the server. <br>
     *     If the server returns an attributes hash that differs, the model's state will be `set` again.
     * @ja [[Model]] 属性をサーバーに保存. <br>
     *     異なる属性が返却される場合は再設定
     *
     * @param attributes
     *  - `en` update attributes
     *  - `ja` 更新属性
     * @param options
     *  - `en` save options
     *  - `ja` 保存オプション
     */
    public async save<A extends T>(attributes: ModelAttributeInput<A> | Nil, options?: ModelSaveOptions): Promise<PlainObject | void>;

    public async save(...args: unknown[]): Promise<PlainObject | void> {
        const { attrs, options } = parseSaveArgs(...args);
        const opts = Object.assign({ validate: true, parse: true, wait: true }, options);

        try {
            const { wait } = opts;

            const method = opts.syncMethod = this.isNew() ? 'create' : opts.patch ? 'patch' : 'update';

            if (attrs) {
                if (!wait) {
                    this.setAttributes(attrs, opts);
                    this[_properties].baseAttrs = { ...this._attrs } as T;
                } else {
                    this[_validate](attrs, opts);
                }
                if ('patch' === method) {
                    opts.data = attrs;
                } else {
                    opts.data = Object.assign(this.toJSON(), attrs);
                }
            }

            const resp = await this.sync(method, this as Model<T>, opts);

            let serverAttrs = opts.parse ? this.parse(resp, opts) : resp;
            if (attrs && wait) {
                serverAttrs = Object.assign({}, attrs, serverAttrs);
            }
            if (isObject(serverAttrs) && !isEmptyObject(serverAttrs)) {
                this.setAttributes(serverAttrs as T, opts);
                this[_properties].baseAttrs = { ...this._attrs } as T;
            }

            (this as Model).trigger('@sync', this as Model, resp as PlainObject, opts);
            return resp;
        } catch (e) {
            (this as Model).trigger('@error', this as Model, e, opts);
            throw e;
        }
    }

    /**
     * @en Destroy this [[Model]] on the server if it was already persisted.
     * @ja [[Model]] をサーバーから削除
     *
     * @param options
     *  - `en` destroy options
     *  - `ja` 破棄オプション
     */
    public async destroy(options?: ModelDestroyOptions): Promise<PlainObject | void> {
        const opts = Object.assign({ wait: true }, options, { syncMethod: 'delete' });

        try {
            const { wait, cancel } = opts;
            const exists = !this.isNew();
            const destruct = (): void => {
                this.stopListening();
                (this as Model).trigger('@destroy', this as Model, opts);
            };

            !wait && destruct();

            let resp: PlainObject | void;
            if (!exists) {
                await cc(cancel);
            } else {
                resp = await this.sync('delete', this as Model<T>, opts);
            }

            wait && destruct();
            exists && (this as Model).trigger('@sync', this as Model, resp as PlainObject, opts);

            return resp;
        } catch (e) {
            (this as Model).trigger('@error', this as Model, e, opts);
            throw e;
        }
    }
}

// mixin による `instanceof` は無効に設定
setMixClassAttribute(Model as unknown as Class, 'instanceOf', null);

/**
 * @en Check the value-type is [[Model]].
 * @ja [[Model]] 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isModel(x: unknown): x is Model {
    return x instanceof Model;
}

/**
 * @en Query [[Model]] `id-attribute`.
 * @ja [[Model]] の `id-attribute` を取得
 */
export function idAttribute(x: unknown, fallback = ''): string {
    return isObject(x) ? (x.constructor['idAttribute'] || fallback) : fallback;
}
