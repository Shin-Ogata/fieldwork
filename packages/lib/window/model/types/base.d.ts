import { Arguments } from '@cdp/core-utils';
import { Subscription, Silenceable } from '@cdp/event-publisher';
import { ObservableObject } from '@cdp/observable';
import { Result } from '@cdp/result';
import { ModelEvent, ModelValidateAttributeOptions, ModelAttributeInput, ModelSetOptions, ModelConstructionOptions } from './interfaces';
declare const _properties: unique symbol;
/**
 * @en Valid attributes result.
 * @ja 属性検証の有効値
 */
export declare const RESULT_VALID_ATTRS: Readonly<Result>;
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
declare abstract class Model<T extends {} = {}, Event extends ModelEvent<T> = ModelEvent<T>> {
    /**
     * @en Attributes pool
     * @ja 属性格納領域
     */
    private readonly [_properties];
    /**
     * constructor
     *
     * @param attributes
     *  - `en` initial attribute values
     *  - `ja` 属性の初期値を指定
     */
    constructor(attributes: Required<T>, options?: ModelConstructionOptions<T>);
    /**
     * @en Get content ID.
     * @ja コンテンツ ID を取得
     */
    get id(): string;
    /**
     * @en Attributes instance
     * @ja 属性を格納するインスタンス
     */
    protected get _attrs(): ObservableObject;
    /**
     * @en Default attributes instance
     * @ja 既定値属性を格納するインスタンス
     */
    protected get _baseAttrs(): T;
    /**
     * @en Previous attributes instance
     * @ja 変更前の属性を格納するインスタンス
     */
    protected get _prevAttrs(): T;
    /**
     * @en Get internal content ID.
     * @ja 内部のコンテンツ ID を取得
     */
    protected get _cid(): string;
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
    trigger<Channel extends keyof Event>(channel: Channel, ...args: Arguments<Partial<Event[Channel]>>): void;
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
    off<Channel extends keyof Event>(channel?: Channel | Channel[], listener?: (...args: Arguments<Event[Channel]>) => unknown): void;
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
    on<Channel extends keyof Event>(channel: Channel | Channel[], listener: (...args: Arguments<Event[Channel]>) => unknown): Subscription;
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
    once<Channel extends keyof Event>(channel: Channel | Channel[], listener: (...args: Arguments<Event[Channel]>) => unknown): Subscription;
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
}
export { Model as ModelBase };
