/*!
 * @cdp/model 0.9.5
 *   generic model scheme
 */

import { luid, deepEqual, isObject, diff, isArray, escapeHTML, deepCopy, isEmptyObject, setMixClassAttribute } from '@cdp/core-utils';
import { EventReceiver } from '@cdp/events';
import { checkCanceled } from '@cdp/promise';
import { ObservableObject } from '@cdp/observable';
import { makeResult, RESULT_CODE, SUCCEEDED, FAILED } from '@cdp/result';
import { defaultSync } from '@cdp/data-sync';

/* eslint-disable
    @typescript-eslint/no-namespace
 ,  @typescript-eslint/no-unused-vars
 ,  @typescript-eslint/restrict-plus-operands
 */
(function () {
    /**
     * @en Extends error code definitions.
     * @ja 拡張通エラーコード定義
     */
    let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
    (function () {
        RESULT_CODE[RESULT_CODE["MVC_MODEL_DECLARE"] = 9007199254740991] = "MVC_MODEL_DECLARE";
        RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_DATA"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 65 /* MODEL */ + 1, 'invalid data.')] = "ERROR_MVC_INVALID_DATA";
    })();
})();

/* eslint-disable
    @typescript-eslint/no-explicit-any
 */
/** @internal */ const _defineAttributes = Symbol('define');
/** @internal */ const _validate = Symbol('validate');
/** @internal */ const _changeHandler = Symbol('onchange');
/** @internal */ const _broker = Symbol('broker');
/** @internal */ const _properties = Symbol('properties');
/**
 * @en Valid attributes result.
 * @ja 属性検証の有効値
 */
const RESULT_VALID_ATTRS = Object.freeze(makeResult(RESULT_CODE.SUCCESS, 'valid attribute.'));
/** @internal helper for save() */
function parseSaveArgs(...args) {
    let [key, value, options] = args; // eslint-disable-line prefer-const
    let attrs;
    if (null == key || isObject(key)) {
        attrs = key;
        options = value;
    }
    else {
        (attrs = {})[key] = value;
    }
    if (options && options.data) {
        attrs = Object.assign(attrs || {}, options.data);
    }
    return { attrs, options };
}
//__________________________________________________________________________________________________//
/**
 * @en Base class definition for model that provides a basic set of functionality for managing interaction.
 * @ja インタラクションのための基本機能を提供するモデルの基底クラス定義
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
class Model extends EventReceiver {
    /**
     * constructor
     *
     * @param attributes
     *  - `en` initial attribute values
     *  - `ja` 属性の初期値を指定
     */
    constructor(attributes, options) {
        super();
        const opts = Object.assign({}, options);
        const attrs = opts.parse ? this.parse(attributes, opts) : attributes;
        const props = {
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
            this.trigger('@change', this);
        };
        this[_validate]({}, opts);
    }
    /** @internal attribute bridge def */
    [_defineAttributes](instance, name) {
        const proto = instance.constructor.prototype;
        if (!(name in proto)) {
            Object.defineProperty(proto, name, {
                get() {
                    return this._attrs[name];
                },
                set(val) {
                    if (!deepEqual(this._attrs[name], val)) {
                        delete this[_properties].changedAttrs;
                        this._prevAttrs[name] = this._attrs[name];
                        this._attrs[name] = val;
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
    get id() {
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
    get _attrs() {
        return this[_properties].attrs;
    }
    /**
     * @en Default attributes instance
     * @ja 既定値属性を格納するインスタンス
     */
    get _baseAttrs() {
        return this[_properties].baseAttrs;
    }
    /**
     * @en Previous attributes instance
     * @ja 変更前の属性を格納するインスタンス
     */
    get _prevAttrs() {
        return this[_properties].prevAttrs;
    }
    /**
     * @en Changed attributes instance
     * @ja 変更のあった属性を格納するインスタンス
     */
    get _changedAttrs() {
        if (null == this[_properties].changedAttrs) {
            this[_properties].changedAttrs = diff(this._baseAttrs, this._attrs);
        }
        return this[_properties].changedAttrs;
    }
    /**
     * @en Get internal content ID.
     * @ja 内部のコンテンツ ID を取得
     */
    get _cid() {
        return this[_properties].cid;
    }
    /**
     * @en Get creating options.
     * @ja 構築時のオプションを取得
     */
    get _options() {
        return this[_properties].options;
    }
    ///////////////////////////////////////////////////////////////////////
    // operations: events
    /** @internal broker access */
    get [_broker]() {
        return this._attrs.getBroker();
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
    hasListener(channel, listener) {
        return this[_broker].hasListener(channel, listener);
    }
    /**
     * @en Returns registered channel keys.
     * @ja 登録されているチャネルキーを返却
     */
    channels() {
        return this[_broker].channels();
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
    trigger(channel, ...args) {
        this[_broker].trigger(channel, ...args);
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
    off(channel, listener) {
        this._attrs.off(channel, listener);
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
    on(channel, listener) {
        if ('*' === channel || '@change' === channel || (isArray(channel) && channel.includes('@change'))) {
            this._attrs.on('@', this[_changeHandler]);
        }
        return this._attrs.on(channel, listener);
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
    once(channel, listener) {
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
    get isValid() {
        return SUCCEEDED(this.validate({ silent: true }).code);
    }
    /**
     * @en Validate result accesser.
     * @ja 検証結果にアクセス
     */
    validate(options) {
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
    validateAttributes(attributes, options) {
        return RESULT_VALID_ATTRS;
    }
    /* eslint-enable @typescript-eslint/no-unused-vars */
    /** @internal validate */
    [_validate](attributes, options) {
        const { validate, silent, noThrow } = options || {};
        if (validate) {
            const attrs = { ...this._attrs, ...attributes };
            const result = this.validateAttributes(attrs, options);
            if (FAILED(result.code)) {
                if (!silent) {
                    this.trigger('@invalid', this, attrs, result);
                }
                if (!noThrow) {
                    throw result;
                }
            }
            return result;
        }
        else {
            return RESULT_VALID_ATTRS;
        }
    }
    ///////////////////////////////////////////////////////////////////////
    // operations: attributes
    /**
     * @en Check the [[Model]] has valid property. (not `null` or `undefined`)
     * @ja [[Model]] が有効なプロパティを持っているか確認 (`null` または `undefined` でない)
     */
    has(attribute) {
        return null != this._attrs[attribute];
    }
    /**
     * @en Get the HTML-escaped value of an attribute.
     * @ja HTML で使用する文字を制御文字に置換した属性値を取得
     */
    escape(attribute) {
        return escapeHTML(this._attrs[attribute]);
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
    setAttributes(attributes, options) {
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
                }
                else if (extend) {
                    this[_defineAttributes](this, attr);
                    this._attrs[attr] = attributes[attr];
                }
            }
        }
        finally {
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
    clear(options) {
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
    toJSON() {
        return deepCopy({ ...this._attrs });
    }
    /**
     * @es Clone this instance.
     * @ja インスタンスの複製を返却
     *
     * @override
     */
    clone() {
        const { constructor, _attrs, _options } = this;
        return new constructor(_attrs, _options);
    }
    /**
     * @en Check changed attributes.
     * @ja 変更された属性値を持つか判定
     *
     * @param attribute
     *  - `en` checked attribute
     *  - `ja` 検証する属性
     */
    hasChanged(attribute) {
        if (null == attribute) {
            return !isEmptyObject(this._changedAttrs);
        }
        else {
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
    changed(attributes) {
        if (!attributes) {
            return this.hasChanged() ? { ...this._changedAttrs } : undefined;
        }
        else {
            const changed = diff(this._attrs, attributes);
            return !isEmptyObject(changed) ? changed : undefined;
        }
    }
    /**
     * @en Get the previous value of an attribute, recorded at the time the last `@change` event was fired.
     * @ja `@change` が発火された前の属性値を取得
     */
    previous(attribute) {
        return this._prevAttrs[attribute];
    }
    ///////////////////////////////////////////////////////////////////////
    // operations: sync
    /**
     * @en Check a [[Model]] is new if it has never been saved to the server, and lacks an id.
     * @ja [[Model]] がまだサーバーに存在しないかチェック. 既定では `idAttribute` の有無で判定
     */
    isNew() {
        const idAttr = idAttribute(this, 'id');
        return !this.has(idAttr);
    }
    /**
     * @en Converts a response into the hash of attributes to be `set` on the model. The default implementation is just to pass the response along.
     * @ja レスポンスの変換メソッド. 既定では何もしない
     *
     * @override
     */
    parse(response, options) {
        return response;
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
    sync(method, context, options) {
        return defaultSync().sync(method, context, options);
    }
    /**
     * @en Fetch the [[Model]] from the server, merging the response with the model's local attributes.
     * @ja [[Model]] 属性のサーバー同期. レスポンスのマージを実行
     */
    async fetch(options) {
        const opts = Object.assign({ parse: true }, options, { syncMethod: 'read' });
        try {
            const resp = await this.sync('read', this, opts);
            this.setAttributes(opts.parse ? this.parse(resp, opts) : resp, opts);
            this.trigger('@sync', this, resp, opts);
            return resp;
        }
        catch (e) {
            this.trigger('@error', this, e, opts);
            throw e;
        }
    }
    async save(...args) {
        const { attrs, options } = parseSaveArgs(...args);
        const opts = Object.assign({ validate: true, parse: true, wait: true }, options);
        try {
            const { wait } = opts;
            const method = opts.syncMethod = this.isNew() ? 'create' : opts.patch ? 'patch' : 'update';
            if (attrs) {
                if (!wait) {
                    this.setAttributes(attrs, opts);
                    this[_properties].baseAttrs = { ...this._attrs };
                }
                else {
                    this[_validate](attrs, opts);
                }
                if ('patch' === method) {
                    opts.data = attrs;
                }
                else {
                    opts.data = Object.assign(this.toJSON(), attrs);
                }
            }
            const resp = await this.sync(method, this, opts);
            let serverAttrs = opts.parse ? this.parse(resp, opts) : resp;
            if (attrs && wait) {
                serverAttrs = Object.assign({}, attrs, serverAttrs);
            }
            if (isObject(serverAttrs) && !isEmptyObject(serverAttrs)) {
                this.setAttributes(serverAttrs, opts);
                this[_properties].baseAttrs = { ...this._attrs };
            }
            this.trigger('@sync', this, resp, opts);
            return resp;
        }
        catch (e) {
            this.trigger('@error', this, e, opts);
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
    async destroy(options) {
        const opts = Object.assign({ wait: true }, options, { syncMethod: 'delete' });
        try {
            const { wait, cancel } = opts;
            const exists = !this.isNew();
            const destruct = () => {
                this.stopListening();
                this.trigger('@destroy', this, opts);
            };
            !wait && destruct();
            let resp;
            if (!exists) {
                await checkCanceled(cancel);
            }
            else {
                resp = await this.sync('delete', this, opts);
            }
            wait && destruct();
            exists && this.trigger('@sync', this, resp, opts);
            return resp;
        }
        catch (e) {
            this.trigger('@error', this, e, opts);
            throw e;
        }
    }
}
/**
 * @en Get ID attribute name.
 * @ja ID アトリビュート名にアクセス
 *
 * @override
 */
Model.idAttribute = 'id';
// mixin による `instanceof` は無効に設定
setMixClassAttribute(Model, 'instanceOf', null);
/**
 * @en Check the value-type is [[Model]].
 * @ja [[Model]] 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
function isModel(x) {
    return x instanceof Model;
}
/**
 * @en Query [[Model]] `id-attribute`.
 * @ja [[Model]] の `id-attribute` を取得
 */
function idAttribute(x, fallback = '') {
    return isObject(x) ? (x.constructor['idAttribute'] || fallback) : fallback;
}

export { Model, RESULT_VALID_ATTRS, idAttribute, isModel };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwubWpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwiYmFzZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAsICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAsICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kc1xuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIE1PREVMID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgNSxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19NT0RFTF9ERUNMQVJFICAgICAgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX0RBVEEgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5NT0RFTCArIDEsICdpbnZhbGlkIGRhdGEuJyksXG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICBOaWwsXG4gICAgUGxhaW5PYmplY3QsXG4gICAgQ29uc3RydWN0b3IsXG4gICAgQ2xhc3MsXG4gICAgQXJndW1lbnRzLFxuICAgIGlzQXJyYXksXG4gICAgaXNPYmplY3QsXG4gICAgaXNFbXB0eU9iamVjdCxcbiAgICBsdWlkLFxuICAgIGVzY2FwZUhUTUwsXG4gICAgZGVlcENvcHksXG4gICAgZGVlcEVxdWFsLFxuICAgIGRpZmYsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIFN1YnNjcmlwdGlvbixcbiAgICBTaWxlbmNlYWJsZSxcbiAgICBFdmVudEJyb2tlcixcbiAgICBFdmVudFJlY2VpdmVyLFxuICAgIEV2ZW50U291cmNlLFxufSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBjaGVja0NhbmNlbGVkIGFzIGNjIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7XG4gICAgSU9ic2VydmFibGUsXG4gICAgSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2VzcyxcbiAgICBPYnNlcnZhYmxlT2JqZWN0LFxufSBmcm9tICdAY2RwL29ic2VydmFibGUnO1xuaW1wb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBSZXN1bHQsXG4gICAgbWFrZVJlc3VsdCxcbiAgICBTVUNDRUVERUQsXG4gICAgRkFJTEVELFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBTeW5jQ29udGV4dCwgZGVmYXVsdFN5bmMgfSBmcm9tICdAY2RwL2RhdGEtc3luYyc7XG5pbXBvcnQge1xuICAgIE1vZGVsRXZlbnQsXG4gICAgTW9kZWxWYWxpZGF0ZUF0dHJpYnV0ZU9wdGlvbnMsXG4gICAgTW9kZWxBdHRyaWJ1dGVJbnB1dCxcbiAgICBNb2RlbFNldE9wdGlvbnMsXG4gICAgTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIE1vZGVsU3luY01ldGhvZHMsXG4gICAgTW9kZWxTeW5jUmVzdWx0LFxuICAgIE1vZGVsRGF0YVN5bmNPcHRpb25zLFxuICAgIE1vZGVsRmV0Y2hPcHRpb25zLFxuICAgIE1vZGVsU2F2ZU9wdGlvbnMsXG4gICAgTW9kZWxEZXN0cm95T3B0aW9ucyxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfZGVmaW5lQXR0cmlidXRlcyA9IFN5bWJvbCgnZGVmaW5lJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF92YWxpZGF0ZSAgICAgICAgID0gU3ltYm9sKCd2YWxpZGF0ZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY2hhbmdlSGFuZGxlciAgICA9IFN5bWJvbCgnb25jaGFuZ2UnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2Jyb2tlciAgICAgICAgICAgPSBTeW1ib2woJ2Jyb2tlcicpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyAgICAgICA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHk8VD4ge1xuICAgIGF0dHJzOiBPYnNlcnZhYmxlT2JqZWN0O1xuICAgIGJhc2VBdHRyczogVDtcbiAgICBwcmV2QXR0cnM6IFQ7XG4gICAgY2hhbmdlZEF0dHJzPzogUGFydGlhbDxUPjtcbiAgICByZWFkb25seSBjaWQ6IHN0cmluZztcbiAgICByZWFkb25seSBvcHRpb25zOiBNb2RlbFNldE9wdGlvbnM7XG59XG5cbi8qKlxuICogQGVuIFZhbGlkIGF0dHJpYnV0ZXMgcmVzdWx0LlxuICogQGphIOWxnuaAp+aknOiovOOBruacieWKueWApFxuICovXG5leHBvcnQgY29uc3QgUkVTVUxUX1ZBTElEX0FUVFJTID0gT2JqZWN0LmZyZWV6ZShtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLlNVQ0NFU1MsICd2YWxpZCBhdHRyaWJ1dGUuJykpO1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3Igc2F2ZSgpICovXG5mdW5jdGlvbiBwYXJzZVNhdmVBcmdzPEEgZXh0ZW5kcyBvYmplY3Q+KC4uLmFyZ3M6IGFueVtdKTogeyBhdHRycz86IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT47IG9wdGlvbnM/OiBNb2RlbFNhdmVPcHRpb25zOyB9IHtcbiAgICBsZXQgW2tleSwgdmFsdWUsIG9wdGlvbnNdID0gYXJnczsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBwcmVmZXItY29uc3RcbiAgICBsZXQgYXR0cnM6IGFueTtcblxuICAgIGlmIChudWxsID09IGtleSB8fCBpc09iamVjdChrZXkpKSB7XG4gICAgICAgIGF0dHJzID0ga2V5O1xuICAgICAgICBvcHRpb25zID0gdmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgKGF0dHJzID0ge30pW2tleV0gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRhdGEpIHtcbiAgICAgICAgYXR0cnMgPSBPYmplY3QuYXNzaWduKGF0dHJzIHx8IHt9LCBvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIHJldHVybiB7IGF0dHJzLCBvcHRpb25zIH07XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gZm9yIG1vZGVsIHRoYXQgcHJvdmlkZXMgYSBiYXNpYyBzZXQgb2YgZnVuY3Rpb25hbGl0eSBmb3IgbWFuYWdpbmcgaW50ZXJhY3Rpb24uXG4gKiBAamEg44Kk44Oz44K/44Op44Kv44K344On44Oz44Gu44Gf44KB44Gu5Z+65pys5qmf6IO944KS5o+Q5L6b44GZ44KL44Oi44OH44Or44Gu5Z+65bqV44Kv44Op44K55a6a576pXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBNb2RlbCwgTW9kZWxDb25zdHJ1Y3RvciB9IGZyb20gJ0BjZHAvbW9kZWwnO1xuICpcbiAqIGludGVyZmFjZSBDb250ZW50QXR0cmlidXRlIHtcbiAqICAgdXJpOiBzdHJpbmc7XG4gKiAgIHJlYWRvbmx5IHNpemU6IG51bWJlcjtcbiAqICAgY29va2llPzogc3RyaW5nO1xuICogfVxuICogYGBgXG4gKlxuICogLSBCYXNpYyBVc2FnZVxuICpcbiAqIGBgYHRzXG4gKiAvLyBlYXJseSBjYXN0XG4gKiBjb25zdCBDb250ZW50QmFzZSA9IE1vZGVsIGFzIE1vZGVsQ29uc3RydWN0b3I8TW9kZWw8Q29udGVudEF0dHJpYnV0ZT4sIENvbnRlbnRBdHRyaWJ1dGU+O1xuICpcbiAqIGNsYXNzIENvbnRlbnQgZXh0ZW5kcyBDb250ZW50QmFzZSB7XG4gKiAgIGNvbnN0cnVjdG9yKGF0dHJzOiBDb250ZW50QXR0cmlidXRlKSB7XG4gKiAgICAgc3VwZXIoYXR0cnMpO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBvclxuICpcbiAqIGBgYHRzXG4gKiAvLyBsYXRlIGNhc3RcbiAqIGNsYXNzIENvbnRlbnRDbGFzcyBleHRlbmRzIE1vZGVsPENvbnRlbnRBdHRyaWJ1dGU+IHtcbiAqICAgY29uc3RydWN0b3IoYXR0cnM6IENvbnRlbnRBdHRyaWJ1dGUpIHtcbiAqICAgICBzdXBlcihhdHRycyk7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBDb250ZW50ID0gQ29udGVudENsYXNzIGFzIE1vZGVsQ29uc3RydWN0b3I8Q29udGVudENsYXNzLCBDb250ZW50QXR0cmlidXRlPjtcbiAqIGBgYFxuICogdGhlblxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBjb250ZW50ID0gbmV3IENvbnRlbnQoe1xuICogICB1cmk6ICdhYWEudHh0JyxcbiAqICAgc2l6ZTogMTAsXG4gKiAgIGNvb2tpZTogdW5kZWZpbmVkLCAvLyBuZWVkIGV4cGxpY2l0IGFzc2lnblxuICogfSk7XG4gKlxuICogY29uc29sZS5sb2coY29udGVudC51cmkpOyAgICAvLyAnYWFhLnR4dCdcbiAqIGNvbnNvbGUubG9nKGNvbnRlbnQuc2l6ZSk7ICAgLy8gJzEwJ1xuICogY29uc29sZS5sb2coY29udGVudC5jb29raWUpOyAvLyAndW5kZWZpbmVkJ1xuICogYGBgXG4gKlxuICogLSBVc2luZyBDdXN0b20gRXZlbnRcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgTW9kZWxFdmVudCB9IGZyb20gJ0BjZHAvbW9kZWwnO1xuICpcbiAqIGludGVyZmFjZSBDdXN0b21FdmVudCBleHRlbmRzIE1vZGVsRXZlbnQ8Q29udGVudEF0dHJpYnV0ZT4ge1xuICogICBmaXJlOiBbYm9vbGVhbiwgbnVtYmVyXTtcbiAqIH1cbiAqIFxuICogOlxuICpcbiAqIC8vIGVhcmx5IGNhc3RcbiAqIGNvbnN0IENvbnRlbnRCYXNlID0gTW9kZWwgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbDxDb250ZW50QXR0cmlidXRlLCBDdXN0b21FdmVudD4sIENvbnRlbnRBdHRyaWJ1dGU+O1xuICogY2xhc3MgQ29udGVudCBleHRlbmRzIENvbnRlbnRCYXNlIHtcbiAqICAgOlxuICogfVxuICpcbiAqIC8vIGxhdGUgY2FzdFxuICogY2xhc3MgQ29udGVudENsYXNzIGV4dGVuZHMgTW9kZWw8Q29udGVudEF0dHJpYnV0ZSwgQ3VzdG9tRXZlbnQ+IHtcbiAqICAgOlxuICogfVxuICogY29uc3QgQ29udGVudCA9IENvbnRlbnRDbGFzcyBhcyBNb2RlbENvbnN0cnVjdG9yPENvbnRlbnRDbGFzcywgQ29udGVudEF0dHJpYnV0ZT47XG4gKlxuICogY29uc3QgY29udGVudCA9IG5ldyBDb250ZW50KHsgLi4uIH0pO1xuICogY29udGVudC50cmlnZ2VyKCdmaXJlJywgdHJ1ZSwgMTAwKTtcbiAqIGBgYFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTW9kZWw8VCBleHRlbmRzIG9iamVjdCA9IGFueSwgRXZlbnQgZXh0ZW5kcyBNb2RlbEV2ZW50PFQ+ID0gTW9kZWxFdmVudDxUPj4gZXh0ZW5kcyBFdmVudFJlY2VpdmVyIGltcGxlbWVudHMgRXZlbnRTb3VyY2U8RXZlbnQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IElEIGF0dHJpYnV0ZSBuYW1lLlxuICAgICAqIEBqYSBJRCDjgqLjg4jjg6rjg5Pjg6Xjg7zjg4jlkI3jgavjgqLjgq/jgrvjgrlcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHN0YXRpYyBpZEF0dHJpYnV0ZSA9ICdpZCc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXR0cmlidXRlcyBwb29sXG4gICAgICogQGphIOWxnuaAp+agvOe0jemgmOWfn1xuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdOiBQcm9wZXJ0eTxUPjtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgaW5pdGlhbCBhdHRyaWJ1dGUgdmFsdWVzXG4gICAgICogIC0gYGphYCDlsZ7mgKfjga7liJ3mnJ/lgKTjgpLmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhdHRyaWJ1dGVzOiBSZXF1aXJlZDxUPiwgb3B0aW9ucz86IE1vZGVsQ29uc3RydWN0aW9uT3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IGF0dHJzID0gb3B0cy5wYXJzZSA/IHRoaXMucGFyc2UoYXR0cmlidXRlcywgb3B0cykgYXMgVCA6IGF0dHJpYnV0ZXM7XG4gICAgICAgIGNvbnN0IHByb3BzOiBQcm9wZXJ0eTxUPiA9IHtcbiAgICAgICAgICAgIGF0dHJzOiBPYnNlcnZhYmxlT2JqZWN0LmZyb20oYXR0cnMpLFxuICAgICAgICAgICAgYmFzZUF0dHJzOiB7IC4uLmF0dHJzIH0sXG4gICAgICAgICAgICBwcmV2QXR0cnM6IHsgLi4uYXR0cnMgfSxcbiAgICAgICAgICAgIGNpZDogbHVpZCgnbW9kZWw6JywgOCksXG4gICAgICAgICAgICBvcHRpb25zOiBvcHRzLFxuICAgICAgICB9O1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgX3Byb3BlcnRpZXMsIHsgdmFsdWU6IHByb3BzIH0pO1xuXG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGF0dHJzKSkge1xuICAgICAgICAgICAgdGhpc1tfZGVmaW5lQXR0cmlidXRlc10odGhpcywga2V5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXNbX2NoYW5nZUhhbmRsZXJdID0gKCkgPT4ge1xuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BjaGFuZ2UnLCB0aGlzIGFzIE1vZGVsKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzW192YWxpZGF0ZV0oe30sIG9wdHMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgYXR0cmlidXRlIGJyaWRnZSBkZWYgKi9cbiAgICBwcml2YXRlIFtfZGVmaW5lQXR0cmlidXRlc10oaW5zdGFuY2U6IG9iamVjdCwgbmFtZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHByb3RvID0gaW5zdGFuY2UuY29uc3RydWN0b3IucHJvdG90eXBlO1xuICAgICAgICBpZiAoIShuYW1lIGluIHByb3RvKSkge1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCBuYW1lLCB7XG4gICAgICAgICAgICAgICAgZ2V0KCk6IHVua25vd24ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fYXR0cnNbbmFtZV07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzZXQodmFsOiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZGVlcEVxdWFsKHRoaXMuX2F0dHJzW25hbWVdLCB2YWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpc1tfcHJvcGVydGllc10uY2hhbmdlZEF0dHJzO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcHJldkF0dHJzW25hbWVdID0gdGhpcy5fYXR0cnNbbmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hdHRyc1tuYW1lXSAgICAgPSB2YWw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogcHVibGljIHByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29udGVudCBJRC5cbiAgICAgKiBAamEg44Kz44Oz44OG44Oz44OEIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBpZEF0dHIgPSBpZEF0dHJpYnV0ZSh0aGlzLCAnaWQnKTtcbiAgICAgICAgY29uc3QgeyBjaWQsIGF0dHJzIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIChpZEF0dHIgaW4gYXR0cnMpID8gYXR0cnNbaWRBdHRyXSA6IGNpZDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogcHJvdGVjdGVkIHByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2F0dHJzKCk6IE9ic2VydmFibGVPYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uYXR0cnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlZmF1bHQgYXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDml6LlrprlgKTlsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9iYXNlQXR0cnMoKTogVCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5iYXNlQXR0cnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFByZXZpb3VzIGF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5aSJ5pu05YmN44Gu5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcHJldkF0dHJzKCk6IFQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucHJldkF0dHJzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGFuZ2VkIGF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5aSJ5pu044Gu44GC44Gj44Gf5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY2hhbmdlZEF0dHJzKCk6IFBhcnRpYWw8VD4ge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnMpIHtcbiAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNoYW5nZWRBdHRycyA9IGRpZmYodGhpcy5fYmFzZUF0dHJzLCB0aGlzLl9hdHRycyBhcyB1bmtub3duIGFzIFBhcnRpYWw8VD4pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnMgYXMgUGFydGlhbDxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGludGVybmFsIGNvbnRlbnQgSUQuXG4gICAgICogQGphIOWGhemDqOOBruOCs+ODs+ODhuODs+ODhCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9jaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNpZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNyZWF0aW5nIG9wdGlvbnMuXG4gICAgICogQGphIOani+evieaZguOBruOCquODl+OCt+ODp+ODs+OCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX29wdGlvbnMoKTogTW9kZWxTZXRPcHRpb25zIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLm9wdGlvbnM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogZXZlbnRzXG5cbiAgICAvKiogQGludGVybmFsIGJyb2tlciBhY2Nlc3MgKi9cbiAgICBwcml2YXRlIGdldCBbX2Jyb2tlcl0oKTogRXZlbnRCcm9rZXI8YW55PiB7XG4gICAgICAgIHJldHVybiAodGhpcy5fYXR0cnMgYXMgSU9ic2VydmFibGUgYXMgSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2VzcykuZ2V0QnJva2VyKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHdoZXRoZXIgdGhpcyBvYmplY3QgaGFzIGNsaWVudHMuXG4gICAgICogQGphIOOCr+ODqeOCpOOCouODs+ODiOOBjOWtmOWcqOOBmeOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgaGFzTGlzdGVuZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsPzogQ2hhbm5lbCwgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfYnJva2VyXS5oYXNMaXN0ZW5lcihjaGFubmVsLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgcmVnaXN0ZXJlZCBjaGFubmVsIGtleXMuXG4gICAgICogQGphIOeZu+mMsuOBleOCjOOBpuOBhOOCi+ODgeODo+ODjeODq+OCreODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNoYW5uZWxzKCk6IChrZXlvZiBFdmVudClbXSB7XG4gICAgICAgIHJldHVybiB0aGlzW19icm9rZXJdLmNoYW5uZWxzKCkgYXMgKGtleW9mIEV2ZW50KVtdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBOb3RpZnkgZXZlbnQgdG8gY2xpZW50cy5cbiAgICAgKiBAamEgZXZlbnQg55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgYXJndW1lbnRzIGZvciBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWw44Gr5rih44GZ5byV5pWwXG4gICAgICovXG4gICAgcHVibGljIHRyaWdnZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsLCAuLi5hcmdzOiBBcmd1bWVudHM8UGFydGlhbDxFdmVudFtDaGFubmVsXT4+KTogdm9pZCB7XG4gICAgICAgICh0aGlzW19icm9rZXJdIGFzIGFueSkudHJpZ2dlcihjaGFubmVsLCAuLi5hcmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm6Kej6ZmkXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbD86IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYXR0cnMub2ZmKGNoYW5uZWwgYXMgYW55LCBsaXN0ZW5lciBhcyBhbnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBvbjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGlmICgnKicgPT09IGNoYW5uZWwgfHwgJ0BjaGFuZ2UnID09PSBjaGFubmVsIHx8IChpc0FycmF5KGNoYW5uZWwpICYmIGNoYW5uZWwuaW5jbHVkZXMoJ0BjaGFuZ2UnIGFzIENoYW5uZWwpKSkge1xuICAgICAgICAgICAgdGhpcy5fYXR0cnMub24oJ0AnLCB0aGlzW19jaGFuZ2VIYW5kbGVyXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2F0dHJzLm9uKGNoYW5uZWwgYXMgYW55LCBsaXN0ZW5lciBhcyBhbnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykgYnV0IGl0IGNhdXNlcyB0aGUgYm91bmQgY2FsbGJhY2sgdG8gb25seSBmaXJlIG9uY2UgYmVmb3JlIGJlaW5nIHJlbW92ZWQuXG4gICAgICogQGphIOS4gOW6puOBoOOBkeODj+ODs+ODieODquODs+OCsOWPr+iDveOBquOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBvbmNlPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMub24oY2hhbm5lbCwgbGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBtYW5hZ2VkID0gdGhpcy5vbihjaGFubmVsLCAoKSA9PiB7XG4gICAgICAgICAgICBjb250ZXh0LnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICBtYW5hZ2VkLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiB2YWxpZGF0aW9uXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdmFsaWQgb3Igbm90LlxuICAgICAqIEBqYSDmpJzoqLzjga7miJDlkKbjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaXNWYWxpZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFNVQ0NFRURFRCh0aGlzLnZhbGlkYXRlKHsgc2lsZW50OiB0cnVlIH0pLmNvZGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBWYWxpZGF0ZSByZXN1bHQgYWNjZXNzZXIuXG4gICAgICogQGphIOaknOiovOe1kOaenOOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyB2YWxpZGF0ZShvcHRpb25zPzogU2lsZW5jZWFibGUpOiBSZXN1bHQge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHZhbGlkYXRlOiB0cnVlLCBub1Rocm93OiB0cnVlLCBleHRlbmQ6IGZhbHNlIH0sIG9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gdGhpc1tfdmFsaWRhdGVdKHt9LCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuICAgIC8qKlxuICAgICAqIEBlbiBWYWxpZGF0ZSBkYXRhIG1ldGhvZC5cbiAgICAgKiBAamEg44OH44O844K/5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCB2YWxpZGF0ZWUgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg6KKr5qSc6Ki85bGe5oCnXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHZhbGlkYXRlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOaknOiovOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHByb3RlY3RlZCB2YWxpZGF0ZUF0dHJpYnV0ZXM8QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4sIG9wdGlvbnM/OiBNb2RlbFZhbGlkYXRlQXR0cmlidXRlT3B0aW9ucyk6IFJlc3VsdCB7XG4gICAgICAgIHJldHVybiBSRVNVTFRfVkFMSURfQVRUUlM7XG4gICAgfVxuXG4gICAgLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuICAgIC8qKiBAaW50ZXJuYWwgdmFsaWRhdGUgKi9cbiAgICBwcml2YXRlIFtfdmFsaWRhdGVdPEEgZXh0ZW5kcyBUPihhdHRyaWJ1dGVzOiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+LCBvcHRpb25zPzogTW9kZWxTZXRPcHRpb25zKTogUmVzdWx0IHwgbmV2ZXIge1xuICAgICAgICBjb25zdCB7IHZhbGlkYXRlLCBzaWxlbnQsIG5vVGhyb3cgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGlmICh2YWxpZGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgYXR0cnMgPSB7IC4uLnRoaXMuX2F0dHJzLCAuLi5hdHRyaWJ1dGVzIH07XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnZhbGlkYXRlQXR0cmlidXRlcyhhdHRycywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoRkFJTEVEKHJlc3VsdC5jb2RlKSkge1xuICAgICAgICAgICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAaW52YWxpZCcsIHRoaXMgYXMgTW9kZWwsIGF0dHJzLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIW5vVGhyb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUkVTVUxUX1ZBTElEX0FUVFJTO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogYXR0cmlidXRlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBbW01vZGVsXV0gaGFzIHZhbGlkIHByb3BlcnR5LiAobm90IGBudWxsYCBvciBgdW5kZWZpbmVkYClcbiAgICAgKiBAamEgW1tNb2RlbF1dIOOBjOacieWKueOBquODl+ODreODkeODhuOCo+OCkuaMgeOBo+OBpuOBhOOCi+OBi+eiuuiqjSAoYG51bGxgIOOBvuOBn+OBryBgdW5kZWZpbmVkYCDjgafjgarjgYQpXG4gICAgICovXG4gICAgcHVibGljIGhhcyhhdHRyaWJ1dGU6IGtleW9mIFQpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gKHRoaXMuX2F0dHJzIGFzIHVua25vd24gYXMgVClbYXR0cmlidXRlXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBIVE1MLWVzY2FwZWQgdmFsdWUgb2YgYW4gYXR0cmlidXRlLlxuICAgICAqIEBqYSBIVE1MIOOBp+S9v+eUqOOBmeOCi+aWh+Wtl+OCkuWItuW+oeaWh+Wtl+OBq+e9ruaPm+OBl+OBn+WxnuaAp+WApOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBlc2NhcGUoYXR0cmlidXRlOiBrZXlvZiBUKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIGVzY2FwZUhUTUwoKHRoaXMuX2F0dHJzIGFzIGFueSlbYXR0cmlidXRlXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVwZGF0ZSBhdHRyaWJ1dGVzIGZvciBiYXRjaCBpbnB1dCB3aXRoIG9wdGlvbnMuXG4gICAgICogQGphIOWxnuaAp+OBruS4gOaLrOioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIHVwZGF0ZSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGphYCDmm7TmlrDlsZ7mgKdcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2V0IGF0dHJpYnV0ZXMgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5bGe5oCn5pu05paw55So44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldEF0dHJpYnV0ZXM8QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4sIG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBzaWxlbnQsIGV4dGVuZCB9ID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHNpbGVudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzLnN1c3BlbmQodHJ1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXNbX3ZhbGlkYXRlXShhdHRyaWJ1dGVzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChGQUlMRUQocmVzdWx0LmNvZGUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgYXR0ciBvZiBPYmplY3Qua2V5cyhhdHRyaWJ1dGVzKSkge1xuICAgICAgICAgICAgICAgIGlmIChhdHRyIGluIHRoaXMuX2F0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzW2F0dHJdID0gYXR0cmlidXRlc1thdHRyXTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGV4dGVuZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW19kZWZpbmVBdHRyaWJ1dGVzXSh0aGlzLCBhdHRyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYXR0cnNbYXR0cl0gPSBhdHRyaWJ1dGVzW2F0dHJdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGlmIChzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hdHRycy5yZXN1bWUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBhbGwgYXR0cmlidXRlcyBvbiB0aGUgW1tNb2RlbF1dLiAoc2V0IGB1bmRlZmluZWRgKVxuICAgICAqIEBqYSBbW01vZGVsXV0g44GL44KJ44GZ44G544Gm44Gu5bGe5oCn44KS5YmK6ZmkIChgdW5kZWZpbmVkYCDjgpLoqK3lrpopXG4gICAgICovXG4gICAgcHVibGljIGNsZWFyKG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgY2xlYXJBdHRycyA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgT2JqZWN0LmtleXModGhpcy5fYmFzZUF0dHJzKSkge1xuICAgICAgICAgICAgY2xlYXJBdHRyc1thdHRyXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5zZXRBdHRyaWJ1dGVzKGNsZWFyQXR0cnMsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBtb2RlbCdzIGBhdHRyaWJ1dGVzYCBvYmplY3QuXG4gICAgICogQGphIOODouODh+ODq+WxnuaAp+WApOOBruOCs+ODlOODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyB0b0pTT04oKTogVCB7XG4gICAgICAgIHJldHVybiBkZWVwQ29weSh7IC4uLnRoaXMuX2F0dHJzIH0gYXMgVCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVzIENsb25lIHRoaXMgaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOBruikh+ijveOCkui/lOWNtFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgcHVibGljIGNsb25lKCk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IGNvbnN0cnVjdG9yLCBfYXR0cnMsIF9vcHRpb25zIH0gPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IChjb25zdHJ1Y3RvciBhcyBDb25zdHJ1Y3Rvcjx0aGlzPikoX2F0dHJzLCBfb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGNoYW5nZWQgYXR0cmlidXRlcy5cbiAgICAgKiBAamEg5aSJ5pu044GV44KM44Gf5bGe5oCn5YCk44KS5oyB44Gk44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlXG4gICAgICogIC0gYGVuYCBjaGVja2VkIGF0dHJpYnV0ZVxuICAgICAqICAtIGBqYWAg5qSc6Ki844GZ44KL5bGe5oCnXG4gICAgICovXG4gICAgcHVibGljIGhhc0NoYW5nZWQoYXR0cmlidXRlPzoga2V5b2YgVCk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAobnVsbCA9PSBhdHRyaWJ1dGUpIHtcbiAgICAgICAgICAgIHJldHVybiAhaXNFbXB0eU9iamVjdCh0aGlzLl9jaGFuZ2VkQXR0cnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGF0dHJpYnV0ZSBpbiB0aGlzLl9jaGFuZ2VkQXR0cnM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGFuIG9iamVjdCBjb250YWluaW5nIGFsbCB0aGUgYXR0cmlidXRlcyB0aGF0IGhhdmUgY2hhbmdlZCwgb3IgYHVuZGVmaW5lZGAgaWYgdGhlcmUgYXJlIG5vIGNoYW5nZWQgYXR0cmlidXRlcy5cbiAgICAgKiBAamEg5YWl5Yqb44GX44GfIGF0dHJpYnV0ZXMg5YCk44Gu5beu5YiG44Gr5a++44GX44Gm5aSJ5pu044GM44GC44KL5bGe5oCn5YCk44KS6L+U5Y20LiDlt67liIbjgYzjgarjgYTloLTlkIjjga8gYHVuZGVmaWVuZGAg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgY2hlY2tlZCBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGphYCDmpJzoqLzjgZnjgovlsZ7mgKdcbiAgICAgKi9cbiAgICBwdWJsaWMgY2hhbmdlZChhdHRyaWJ1dGVzPzogUGFydGlhbDxUPik6IFBhcnRpYWw8VD4gfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAoIWF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhhc0NoYW5nZWQoKSA/IHsgLi4udGhpcy5fY2hhbmdlZEF0dHJzIH0gOiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBjaGFuZ2VkID0gZGlmZih0aGlzLl9hdHRycywgYXR0cmlidXRlcyk7XG4gICAgICAgICAgICByZXR1cm4gIWlzRW1wdHlPYmplY3QoY2hhbmdlZCkgPyBjaGFuZ2VkIDogdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgcHJldmlvdXMgdmFsdWUgb2YgYW4gYXR0cmlidXRlLCByZWNvcmRlZCBhdCB0aGUgdGltZSB0aGUgbGFzdCBgQGNoYW5nZWAgZXZlbnQgd2FzIGZpcmVkLlxuICAgICAqIEBqYSBgQGNoYW5nZWAg44GM55m654Gr44GV44KM44Gf5YmN44Gu5bGe5oCn5YCk44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHByZXZpb3VzPEsgZXh0ZW5kcyBrZXlvZiBUPihhdHRyaWJ1dGU6IEspOiBUW0tdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ByZXZBdHRyc1thdHRyaWJ1dGVdO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IHN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBhIFtbTW9kZWxdXSBpcyBuZXcgaWYgaXQgaGFzIG5ldmVyIGJlZW4gc2F2ZWQgdG8gdGhlIHNlcnZlciwgYW5kIGxhY2tzIGFuIGlkLlxuICAgICAqIEBqYSBbW01vZGVsXV0g44GM44G+44Gg44K144O844OQ44O844Gr5a2Y5Zyo44GX44Gq44GE44GL44OB44Kn44OD44KvLiDml6Llrprjgafjga8gYGlkQXR0cmlidXRlYCDjga7mnInnhKHjgafliKTlrppcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgaXNOZXcoKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGlkQXR0ciA9IGlkQXR0cmlidXRlKHRoaXMsICdpZCcpO1xuICAgICAgICByZXR1cm4gIXRoaXMuaGFzKGlkQXR0ciBhcyBrZXlvZiBUKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29udmVydHMgYSByZXNwb25zZSBpbnRvIHRoZSBoYXNoIG9mIGF0dHJpYnV0ZXMgdG8gYmUgYHNldGAgb24gdGhlIG1vZGVsLiBUaGUgZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiBpcyBqdXN0IHRvIHBhc3MgdGhlIHJlc3BvbnNlIGFsb25nLlxuICAgICAqIEBqYSDjg6zjgrnjg53jg7Pjgrnjga7lpInmj5vjg6Hjgr3jg4Pjg4kuIOaXouWumuOBp+OBr+S9leOCguOBl+OBquOBhFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHBhcnNlKHJlc3BvbnNlOiBQbGFpbk9iamVjdCB8IHZvaWQsIG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiBUIHwgdm9pZCB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHJldHVybiByZXNwb25zZSBhcyBUO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBQcm94eSBbW0lEYXRhU3luYyNzeW5jXV0gYnkgZGVmYXVsdCAtLSBidXQgb3ZlcnJpZGUgdGhpcyBpZiB5b3UgbmVlZCBjdXN0b20gc3luY2luZyBzZW1hbnRpY3MgZm9yICp0aGlzKiBwYXJ0aWN1bGFyIG1vZGVsLlxuICAgICAqIEBqYSDjg4fjg7zjgr/lkIzmnJ8uIOW/heimgeOBq+W/nOOBmOOBpuOCquODvOODkOODvOODqeOCpOODieWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBzeW5jPEsgZXh0ZW5kcyBNb2RlbFN5bmNNZXRob2RzPihtZXRob2Q6IEssIGNvbnRleHQ6IE1vZGVsPFQ+LCBvcHRpb25zPzogTW9kZWxEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPE1vZGVsU3luY1Jlc3VsdDxLLCBUPj4ge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFN5bmMoKS5zeW5jKG1ldGhvZCwgY29udGV4dCBhcyBTeW5jQ29udGV4dDxUPiwgb3B0aW9ucykgYXMgdW5rbm93biBhcyBQcm9taXNlPE1vZGVsU3luY1Jlc3VsdDxLLCBUPj47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZldGNoIHRoZSBbW01vZGVsXV0gZnJvbSB0aGUgc2VydmVyLCBtZXJnaW5nIHRoZSByZXNwb25zZSB3aXRoIHRoZSBtb2RlbCdzIGxvY2FsIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIFtbTW9kZWxdXSDlsZ7mgKfjga7jgrXjg7zjg5Djg7zlkIzmnJ8uIOODrOOCueODneODs+OCueOBruODnuODvOOCuOOCkuWun+ihjFxuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBmZXRjaChvcHRpb25zPzogTW9kZWxGZXRjaE9wdGlvbnMpOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBwYXJzZTogdHJ1ZSB9LCBvcHRpb25zLCB7IHN5bmNNZXRob2Q6ICdyZWFkJyB9KTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzcCA9IGF3YWl0IHRoaXMuc3luYygncmVhZCcsIHRoaXMgYXMgTW9kZWw8VD4sIG9wdHMpO1xuICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGVzKG9wdHMucGFyc2UgPyB0aGlzLnBhcnNlKHJlc3AsIG9wdHMpIGFzIFQgOiByZXNwLCBvcHRzKTtcbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAc3luYycsIHRoaXMgYXMgTW9kZWwsIHJlc3AsIG9wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAZXJyb3InLCB0aGlzIGFzIE1vZGVsLCBlLCBvcHRzKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IGEgaGFzaCBvZiBbW01vZGVsXV0gYXR0cmlidXRlcywgYW5kIHN5bmMgdGhlIG1vZGVsIHRvIHRoZSBzZXJ2ZXIuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIHNlcnZlciByZXR1cm5zIGFuIGF0dHJpYnV0ZXMgaGFzaCB0aGF0IGRpZmZlcnMsIHRoZSBtb2RlbCdzIHN0YXRlIHdpbGwgYmUgYHNldGAgYWdhaW4uXG4gICAgICogQGphIFtbTW9kZWxdXSDlsZ7mgKfjgpLjgrXjg7zjg5Djg7zjgavkv53lrZguIDxicj5cbiAgICAgKiAgICAg55Ww44Gq44KL5bGe5oCn44GM6L+U5Y2044GV44KM44KL5aC05ZCI44Gv5YaN6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCB1cGRhdGUgYXR0cmlidXRlIGtleVxuICAgICAqICAtIGBqYWAg5pu05paw5bGe5oCn44Kt44O8XG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB1cGRhdGUgYXR0cmlidXRlIHZhbHVlXG4gICAgICogIC0gYGphYCDmm7TmlrDlsZ7mgKflgKRcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2F2ZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDkv53lrZjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgc2F2ZTxLIGV4dGVuZHMga2V5b2YgVD4oa2V5Pzoga2V5b2YgVCwgdmFsdWU/OiBUW0tdLCBvcHRpb25zPzogTW9kZWxTYXZlT3B0aW9ucyk6IFByb21pc2U8UGxhaW5PYmplY3QgfCB2b2lkPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgYSBoYXNoIG9mIFtbTW9kZWxdXSBhdHRyaWJ1dGVzLCBhbmQgc3luYyB0aGUgbW9kZWwgdG8gdGhlIHNlcnZlci4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgc2VydmVyIHJldHVybnMgYW4gYXR0cmlidXRlcyBoYXNoIHRoYXQgZGlmZmVycywgdGhlIG1vZGVsJ3Mgc3RhdGUgd2lsbCBiZSBgc2V0YCBhZ2Fpbi5cbiAgICAgKiBAamEgW1tNb2RlbF1dIOWxnuaAp+OCkuOCteODvOODkOODvOOBq+S/neWtmC4gPGJyPlxuICAgICAqICAgICDnlbDjgarjgovlsZ7mgKfjgYzov5TljbTjgZXjgozjgovloLTlkIjjga/lho3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCB1cGRhdGUgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg5pu05paw5bGe5oCnXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNhdmUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5L+d5a2Y44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIHNhdmU8QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4gfCBOaWwsIG9wdGlvbnM/OiBNb2RlbFNhdmVPcHRpb25zKTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IHZvaWQ+O1xuXG4gICAgcHVibGljIGFzeW5jIHNhdmUoLi4uYXJnczogdW5rbm93bltdKTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBhdHRycywgb3B0aW9ucyB9ID0gcGFyc2VTYXZlQXJncyguLi5hcmdzKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyB2YWxpZGF0ZTogdHJ1ZSwgcGFyc2U6IHRydWUsIHdhaXQ6IHRydWUgfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgd2FpdCB9ID0gb3B0cztcblxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gb3B0cy5zeW5jTWV0aG9kID0gdGhpcy5pc05ldygpID8gJ2NyZWF0ZScgOiBvcHRzLnBhdGNoID8gJ3BhdGNoJyA6ICd1cGRhdGUnO1xuXG4gICAgICAgICAgICBpZiAoYXR0cnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXdhaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGVzKGF0dHJzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uYmFzZUF0dHJzID0geyAuLi50aGlzLl9hdHRycyB9IGFzIFQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfdmFsaWRhdGVdKGF0dHJzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCdwYXRjaCcgPT09IG1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICBvcHRzLmRhdGEgPSBhdHRycztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvcHRzLmRhdGEgPSBPYmplY3QuYXNzaWduKHRoaXMudG9KU09OKCksIGF0dHJzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCB0aGlzLnN5bmMobWV0aG9kLCB0aGlzIGFzIE1vZGVsPFQ+LCBvcHRzKTtcblxuICAgICAgICAgICAgbGV0IHNlcnZlckF0dHJzID0gb3B0cy5wYXJzZSA/IHRoaXMucGFyc2UocmVzcCwgb3B0cykgOiByZXNwO1xuICAgICAgICAgICAgaWYgKGF0dHJzICYmIHdhaXQpIHtcbiAgICAgICAgICAgICAgICBzZXJ2ZXJBdHRycyA9IE9iamVjdC5hc3NpZ24oe30sIGF0dHJzLCBzZXJ2ZXJBdHRycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXNPYmplY3Qoc2VydmVyQXR0cnMpICYmICFpc0VtcHR5T2JqZWN0KHNlcnZlckF0dHJzKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlcyhzZXJ2ZXJBdHRycyBhcyBULCBvcHRzKTtcbiAgICAgICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5iYXNlQXR0cnMgPSB7IC4uLnRoaXMuX2F0dHJzIH0gYXMgVDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BzeW5jJywgdGhpcyBhcyBNb2RlbCwgcmVzcCBhcyBQbGFpbk9iamVjdCwgb3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BlcnJvcicsIHRoaXMgYXMgTW9kZWwsIGUsIG9wdHMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXN0cm95IHRoaXMgW1tNb2RlbF1dIG9uIHRoZSBzZXJ2ZXIgaWYgaXQgd2FzIGFscmVhZHkgcGVyc2lzdGVkLlxuICAgICAqIEBqYSBbW01vZGVsXV0g44KS44K144O844OQ44O844GL44KJ5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgZGVzdHJveSBvcHRpb25zXG4gICAgICogIC0gYGphYCDnoLTmo4Tjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgZGVzdHJveShvcHRpb25zPzogTW9kZWxEZXN0cm95T3B0aW9ucyk6IFByb21pc2U8UGxhaW5PYmplY3QgfCB2b2lkPiB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgd2FpdDogdHJ1ZSB9LCBvcHRpb25zLCB7IHN5bmNNZXRob2Q6ICdkZWxldGUnIH0pO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IHdhaXQsIGNhbmNlbCB9ID0gb3B0cztcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0cyA9ICF0aGlzLmlzTmV3KCk7XG4gICAgICAgICAgICBjb25zdCBkZXN0cnVjdCA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGRlc3Ryb3knLCB0aGlzIGFzIE1vZGVsLCBvcHRzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICF3YWl0ICYmIGRlc3RydWN0KCk7XG5cbiAgICAgICAgICAgIGxldCByZXNwOiBQbGFpbk9iamVjdCB8IHZvaWQ7XG4gICAgICAgICAgICBpZiAoIWV4aXN0cykge1xuICAgICAgICAgICAgICAgIGF3YWl0IGNjKGNhbmNlbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3AgPSBhd2FpdCB0aGlzLnN5bmMoJ2RlbGV0ZScsIHRoaXMgYXMgTW9kZWw8VD4sIG9wdHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB3YWl0ICYmIGRlc3RydWN0KCk7XG4gICAgICAgICAgICBleGlzdHMgJiYgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BzeW5jJywgdGhpcyBhcyBNb2RlbCwgcmVzcCBhcyBQbGFpbk9iamVjdCwgb3B0cyk7XG5cbiAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGVycm9yJywgdGhpcyBhcyBNb2RlbCwgZSwgb3B0cyk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBtaXhpbiDjgavjgojjgosgYGluc3RhbmNlb2ZgIOOBr+eEoeWKueOBq+ioreWumlxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoTW9kZWwgYXMgdW5rbm93biBhcyBDbGFzcywgJ2luc3RhbmNlT2YnLCBudWxsKTtcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgW1tNb2RlbF1dLlxuICogQGphIFtbTW9kZWxdXSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc01vZGVsKHg6IHVua25vd24pOiB4IGlzIE1vZGVsIHtcbiAgICByZXR1cm4geCBpbnN0YW5jZW9mIE1vZGVsO1xufVxuXG4vKipcbiAqIEBlbiBRdWVyeSBbW01vZGVsXV0gYGlkLWF0dHJpYnV0ZWAuXG4gKiBAamEgW1tNb2RlbF1dIOOBriBgaWQtYXR0cmlidXRlYCDjgpLlj5blvpdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlkQXR0cmlidXRlKHg6IHVua25vd24sIGZhbGxiYWNrID0gJycpOiBzdHJpbmcge1xuICAgIHJldHVybiBpc09iamVjdCh4KSA/ICh4LmNvbnN0cnVjdG9yWydpZEF0dHJpYnV0ZSddIHx8IGZhbGxiYWNrKSA6IGZhbGxiYWNrO1xufVxuIl0sIm5hbWVzIjpbImNjIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQTs7Ozs7QUFNQTs7Ozs7SUFVSTtJQUFBO1FBQ0ksc0ZBQWlELENBQUE7UUFDakQsb0RBQXlCLFlBQUEsa0JBQWtCLGdCQUF1QixpQkFBd0IsQ0FBQyxFQUFFLGVBQWUsQ0FBQyw0QkFBQSxDQUFBO0tBQ2hILElBQUE7QUFDTCxDQUFDOztBQ3BCRDs7O0FBdURBLGlCQUFpQixNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM1RCxpQkFBaUIsTUFBTSxTQUFTLEdBQVcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzlELGlCQUFpQixNQUFNLGNBQWMsR0FBTSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDOUQsaUJBQWlC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
