import { Nullish, Accessible, Arguments } from '@cdp/core-utils';
import { Subscription, Silenceable, EventReceiver, EventSource } from '@cdp/events';
import { ObservableObject } from '@cdp/observable';
import { Result } from '@cdp/result';
import { ModelSeed, ModelEvent, ModelValidateAttributeOptions, ModelAttributeInput, ModelSetOptions, ModelConstructionOptions, ModelSyncMethods, ModelSyncResult, ModelDataSyncOptions, ModelFetchOptions, ModelSaveOptions, ModelDestroyOptions } from './interfaces';
/**
 * @en Valid attributes result.
 * @ja 属性検証の有効値
 */
export declare const RESULT_VALID_ATTRS: Readonly<Result>;
/**
 * @en Base class definition for model that provides a basic set of functionality for managing interaction.
 * @ja インタラクションのための基本機能を提供する Model の基底クラス定義
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
 * - Using Custom TEvent
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
export declare abstract class Model<T extends object = any, TEvent extends ModelEvent<T> = ModelEvent<T>> extends EventReceiver implements EventSource<TEvent> {
    /**
     * @en Get ID attribute name.
     * @ja ID アトリビュート名にアクセス
     *
     * @override
     */
    static idAttribute: string;
    /**
     * constructor
     *
     * @param attributes
     *  - `en` initial attribute values
     *  - `ja` 属性の初期値を指定
     */
    constructor(attributes: Required<T>, options?: ModelConstructionOptions);
    /**
     * @en Get content ID.
     * @ja コンテンツ ID を取得
     */
    get id(): string;
    /**
     * @en Attributes instance
     * @ja 属性を格納するインスタンス
     */
    protected get _attrs(): Accessible<ObservableObject>;
    /**
     * @en Default attributes instance
     * @ja 既定値属性を格納するインスタンス
     */
    protected get _baseAttrs(): T;
    /**
     * @en Previous attributes instance
     * @ja 変更前の属性を格納するインスタンス
     */
    protected get _prevAttrs(): Accessible<T>;
    /**
     * @en Changed attributes instance
     * @ja 変更のあった属性を格納するインスタンス
     */
    protected get _changedAttrs(): Partial<T>;
    /**
     * @en Get internal content ID.
     * @ja 内部のコンテンツ ID を取得
     */
    protected get _cid(): string;
    /**
     * @en Get creating options.
     * @ja 構築時のオプションを取得
     */
    protected get _options(): ModelSetOptions;
    /**
     * @en EventSource type resolver.
     * @ja EventSource 型解決用ヘルパーアクセッサ
     */
    get $(): EventSource<TEvent>;
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
    hasListener<Channel extends keyof TEvent>(channel?: Channel, listener?: (...args: Arguments<TEvent[Channel]>) => unknown): boolean;
    /**
     * @en Returns registered channel keys.
     * @ja 登録されているチャネルキーを返却
     */
    channels(): (keyof TEvent)[];
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
    trigger<Channel extends keyof TEvent>(channel: Channel, ...args: Arguments<Partial<TEvent[Channel]>>): void;
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
    off<Channel extends keyof TEvent>(channel?: Channel | Channel[], listener?: (...args: Arguments<TEvent[Channel]>) => unknown): void;
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
    on<Channel extends keyof TEvent>(channel: Channel | Channel[], listener: (...args: Arguments<TEvent[Channel]>) => unknown): Subscription;
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
    once<Channel extends keyof TEvent>(channel: Channel | Channel[], listener: (...args: Arguments<TEvent[Channel]>) => unknown): Subscription;
    /**
     * @en Check valid or not.
     * @ja 検証の成否を取得
     */
    get isValid(): boolean;
    /**
     * @en Validate result accesser.
     * @ja 検証結果にアクセス
     */
    validate(options?: Silenceable): Result;
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
    protected validateAttributes<A extends T>(attributes: ModelAttributeInput<A>, options?: ModelValidateAttributeOptions): Result;
    /**
     * @en Check the [[Model]] has valid property. (not `null` or `undefined`)
     * @ja [[Model]] が有効なプロパティを持っているか確認 (`null` または `undefined` でない)
     */
    has(attribute: keyof T): boolean;
    /**
     * @en Get the HTML-escaped value of an attribute.
     * @ja HTML で使用する文字を制御文字に置換した属性値を取得
     */
    escape(attribute: keyof T): string;
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
    setAttributes<A extends T>(attributes: ModelAttributeInput<A>, options?: ModelSetOptions): this;
    /**
     * @en Clear all attributes on the [[Model]]. (set `undefined`)
     * @ja [[Model]] からすべての属性を削除 (`undefined` を設定)
     */
    clear(options?: ModelSetOptions): this;
    /**
     * @en Return a copy of the model's `attributes` object.
     * @ja Model 属性値のコピーを返却
     */
    toJSON(): T;
    /**
     * @es Clone this instance.
     * @ja インスタンスの複製を返却
     *
     * @override
     */
    clone(): this;
    /**
     * @en Check changed attributes.
     * @ja 変更された属性値を持つか判定
     *
     * @param attribute
     *  - `en` checked attribute
     *  - `ja` 検証する属性
     */
    hasChanged(attribute?: keyof T): boolean;
    /**
     * @en Return an object containing all the attributes that have changed, or `undefined` if there are no changed attributes.
     * @ja 入力した attributes 値の差分に対して変更がある属性値を返却. 差分がない場合は `undefiend` を返却
     *
     * @param attributes
     *  - `en` checked attributes
     *  - `ja` 検証する属性
     */
    changed(attributes?: Partial<T>): Partial<T> | undefined;
    /**
     * @en Get the previous value of an attribute, recorded at the time the last `@change` event was fired.
     * @ja `@change` が発火された前の属性値を取得
     */
    previous<K extends keyof T>(attribute: K): T[K];
    /**
     * @en Check a [[Model]] is new if it has never been saved to the server, and lacks an id.
     * @ja [[Model]] がまだサーバーに存在しないかチェック. 既定では `idAttribute` の有無で判定
     */
    protected isNew(): boolean;
    /**
     * @en Converts a response into the hash of attributes to be `set` on the model. The default implementation is just to pass the response along.
     * @ja レスポンスの変換メソッド. 既定では何もしない
     *
     * @override
     */
    protected parse(response: ModelSeed | void, options?: ModelSetOptions): T | void;
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
    protected sync<K extends ModelSyncMethods>(method: K, context: Model<T>, options?: ModelDataSyncOptions): Promise<ModelSyncResult<K, T>>;
    /**
     * @en Fetch the [[Model]] from the server, merging the response with the model's local attributes.
     * @ja [[Model]] 属性のサーバー同期. レスポンスのマージを実行
     */
    fetch(options?: ModelFetchOptions): Promise<T>;
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
    save<K extends keyof T>(key?: keyof T, value?: T[K], options?: ModelSaveOptions): Promise<T | void>;
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
    save<A extends T>(attributes: ModelAttributeInput<A> | Nullish, options?: ModelSaveOptions): Promise<T | void>;
    /**
     * @en Destroy this [[Model]] on the server if it was already persisted.
     * @ja [[Model]] をサーバーから削除
     *
     * @param options
     *  - `en` destroy options
     *  - `ja` 破棄オプション
     */
    destroy(options?: ModelDestroyOptions): Promise<T | void>;
}
/**
 * @en Check the value-type is [[Model]].
 * @ja [[Model]] 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isModel(x: unknown): x is Model;
/**
 * @en Query [[Model]] `id-attribute`.
 * @ja [[Model]] の `id-attribute` を取得
 */
export declare function idAttribute(x: unknown, fallback?: string): string;
