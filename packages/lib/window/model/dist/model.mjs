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
const _defineAttributes = Symbol('define');
const _validate = Symbol('validate');
const _changeHandler = Symbol('onchange');
const _broker = Symbol('broker');
const _properties = Symbol('properties');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwubWpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwiYmFzZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAsICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAsICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kc1xuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIE1PREVMID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgNSxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19NT0RFTF9ERUNMQVJFICAgICAgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX0RBVEEgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5NT0RFTCArIDEsICdpbnZhbGlkIGRhdGEuJyksXG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICBOaWwsXG4gICAgUGxhaW5PYmplY3QsXG4gICAgQ29uc3RydWN0b3IsXG4gICAgQ2xhc3MsXG4gICAgQXJndW1lbnRzLFxuICAgIGlzQXJyYXksXG4gICAgaXNPYmplY3QsXG4gICAgaXNFbXB0eU9iamVjdCxcbiAgICBsdWlkLFxuICAgIGVzY2FwZUhUTUwsXG4gICAgZGVlcENvcHksXG4gICAgZGVlcEVxdWFsLFxuICAgIGRpZmYsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIFN1YnNjcmlwdGlvbixcbiAgICBTaWxlbmNlYWJsZSxcbiAgICBFdmVudEJyb2tlcixcbiAgICBFdmVudFJlY2VpdmVyLFxuICAgIEV2ZW50U291cmNlLFxufSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBjaGVja0NhbmNlbGVkIGFzIGNjIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7XG4gICAgSU9ic2VydmFibGUsXG4gICAgSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2VzcyxcbiAgICBPYnNlcnZhYmxlT2JqZWN0LFxufSBmcm9tICdAY2RwL29ic2VydmFibGUnO1xuaW1wb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBSZXN1bHQsXG4gICAgbWFrZVJlc3VsdCxcbiAgICBTVUNDRUVERUQsXG4gICAgRkFJTEVELFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBTeW5jQ29udGV4dCwgZGVmYXVsdFN5bmMgfSBmcm9tICdAY2RwL2RhdGEtc3luYyc7XG5pbXBvcnQge1xuICAgIE1vZGVsRXZlbnQsXG4gICAgTW9kZWxWYWxpZGF0ZUF0dHJpYnV0ZU9wdGlvbnMsXG4gICAgTW9kZWxBdHRyaWJ1dGVJbnB1dCxcbiAgICBNb2RlbFNldE9wdGlvbnMsXG4gICAgTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIE1vZGVsU3luY01ldGhvZHMsXG4gICAgTW9kZWxTeW5jUmVzdWx0LFxuICAgIE1vZGVsRGF0YVN5bmNPcHRpb25zLFxuICAgIE1vZGVsRmV0Y2hPcHRpb25zLFxuICAgIE1vZGVsU2F2ZU9wdGlvbnMsXG4gICAgTW9kZWxEZXN0cm95T3B0aW9ucyxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuY29uc3QgX2RlZmluZUF0dHJpYnV0ZXMgPSBTeW1ib2woJ2RlZmluZScpO1xuY29uc3QgX3ZhbGlkYXRlICAgICAgICAgPSBTeW1ib2woJ3ZhbGlkYXRlJyk7XG5jb25zdCBfY2hhbmdlSGFuZGxlciAgICA9IFN5bWJvbCgnb25jaGFuZ2UnKTtcbmNvbnN0IF9icm9rZXIgICAgICAgICAgID0gU3ltYm9sKCdicm9rZXInKTtcbmNvbnN0IF9wcm9wZXJ0aWVzICAgICAgID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eTxUPiB7XG4gICAgYXR0cnM6IE9ic2VydmFibGVPYmplY3Q7XG4gICAgYmFzZUF0dHJzOiBUO1xuICAgIHByZXZBdHRyczogVDtcbiAgICBjaGFuZ2VkQXR0cnM/OiBQYXJ0aWFsPFQ+O1xuICAgIHJlYWRvbmx5IGNpZDogc3RyaW5nO1xuICAgIHJlYWRvbmx5IG9wdGlvbnM6IE1vZGVsU2V0T3B0aW9ucztcbn1cblxuLyoqXG4gKiBAZW4gVmFsaWQgYXR0cmlidXRlcyByZXN1bHQuXG4gKiBAamEg5bGe5oCn5qSc6Ki844Gu5pyJ5Yq55YCkXG4gKi9cbmV4cG9ydCBjb25zdCBSRVNVTFRfVkFMSURfQVRUUlMgPSBPYmplY3QuZnJlZXplKG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuU1VDQ0VTUywgJ3ZhbGlkIGF0dHJpYnV0ZS4nKSk7XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzYXZlKCkgKi9cbmZ1bmN0aW9uIHBhcnNlU2F2ZUFyZ3M8QSBleHRlbmRzIG9iamVjdD4oLi4uYXJnczogYW55W10pOiB7IGF0dHJzPzogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPjsgb3B0aW9ucz86IE1vZGVsU2F2ZU9wdGlvbnM7IH0ge1xuICAgIGxldCBba2V5LCB2YWx1ZSwgb3B0aW9uc10gPSBhcmdzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIHByZWZlci1jb25zdFxuICAgIGxldCBhdHRyczogYW55O1xuXG4gICAgaWYgKG51bGwgPT0ga2V5IHx8IGlzT2JqZWN0KGtleSkpIHtcbiAgICAgICAgYXR0cnMgPSBrZXk7XG4gICAgICAgIG9wdGlvbnMgPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAoYXR0cnMgPSB7fSlba2V5XSA9IHZhbHVlO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZGF0YSkge1xuICAgICAgICBhdHRycyA9IE9iamVjdC5hc3NpZ24oYXR0cnMgfHwge30sIG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgYXR0cnMsIG9wdGlvbnMgfTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFtbTW9kZWxdXSBiYXNlIGNsYXNzIGRlZmluaXRpb24uXG4gKiBAamEgW1tNb2RlbF1dIOOBruWfuuW6leOCr+ODqeOCueWumue+qVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgTW9kZWwsIE1vZGVsQ29uc3RydWN0b3IgfSBmcm9tICdAY2RwL21vZGVsJztcbiAqXG4gKiBpbnRlcmZhY2UgQ29udGVudEF0dHJpYnV0ZSB7XG4gKiAgIHVyaTogc3RyaW5nO1xuICogICByZWFkb25seSBzaXplOiBudW1iZXI7XG4gKiAgIGNvb2tpZT86IHN0cmluZztcbiAqIH1cbiAqIGBgYFxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogLy8gZWFybHkgY2FzdFxuICogY29uc3QgQ29udGVudEJhc2UgPSBNb2RlbCBhcyBNb2RlbENvbnN0cnVjdG9yPE1vZGVsPENvbnRlbnRBdHRyaWJ1dGU+LCBDb250ZW50QXR0cmlidXRlPjtcbiAqXG4gKiBjbGFzcyBDb250ZW50IGV4dGVuZHMgQ29udGVudEJhc2Uge1xuICogICBjb25zdHJ1Y3RvcihhdHRyczogQ29udGVudEF0dHJpYnV0ZSkge1xuICogICAgIHN1cGVyKGF0dHJzKTtcbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICogb3JcbiAqXG4gKiBgYGB0c1xuICogLy8gbGF0ZSBjYXN0XG4gKiBjbGFzcyBDb250ZW50Q2xhc3MgZXh0ZW5kcyBNb2RlbDxDb250ZW50QXR0cmlidXRlPiB7XG4gKiAgIGNvbnN0cnVjdG9yKGF0dHJzOiBDb250ZW50QXR0cmlidXRlKSB7XG4gKiAgICAgc3VwZXIoYXR0cnMpO1xuICogICB9XG4gKiB9XG4gKlxuICogY29uc3QgQ29udGVudCA9IENvbnRlbnRDbGFzcyBhcyBNb2RlbENvbnN0cnVjdG9yPENvbnRlbnRDbGFzcywgQ29udGVudEF0dHJpYnV0ZT47XG4gKiBgYGBcbiAqIHRoZW5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgY29udGVudCA9IG5ldyBDb250ZW50KHtcbiAqICAgdXJpOiAnYWFhLnR4dCcsXG4gKiAgIHNpemU6IDEwLFxuICogICBjb29raWU6IHVuZGVmaW5lZCwgLy8gbmVlZCBleHBsaWNpdCBhc3NpZ25cbiAqIH0pO1xuICpcbiAqIGNvbnNvbGUubG9nKGNvbnRlbnQudXJpKTsgICAgLy8gJ2FhYS50eHQnXG4gKiBjb25zb2xlLmxvZyhjb250ZW50LnNpemUpOyAgIC8vICcxMCdcbiAqIGNvbnNvbGUubG9nKGNvbnRlbnQuY29va2llKTsgLy8gJ3VuZGVmaW5lZCdcbiAqIGBgYFxuICpcbiAqIC0gVXNpbmcgQ3VzdG9tIEV2ZW50XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IE1vZGVsRXZlbnQgfSBmcm9tICdAY2RwL21vZGVsJztcbiAqXG4gKiBpbnRlcmZhY2UgQ3VzdG9tRXZlbnQgZXh0ZW5kcyBNb2RlbEV2ZW50PENvbnRlbnRBdHRyaWJ1dGU+IHtcbiAqICAgZmlyZTogW2Jvb2xlYW4sIG51bWJlcl07XG4gKiB9XG4gKiBcbiAqIDpcbiAqXG4gKiAvLyBlYXJseSBjYXN0XG4gKiBjb25zdCBDb250ZW50QmFzZSA9IE1vZGVsIGFzIE1vZGVsQ29uc3RydWN0b3I8TW9kZWw8Q29udGVudEF0dHJpYnV0ZSwgQ3VzdG9tRXZlbnQ+LCBDb250ZW50QXR0cmlidXRlPjtcbiAqIGNsYXNzIENvbnRlbnQgZXh0ZW5kcyBDb250ZW50QmFzZSB7XG4gKiAgIDpcbiAqIH1cbiAqXG4gKiAvLyBsYXRlIGNhc3RcbiAqIGNsYXNzIENvbnRlbnRDbGFzcyBleHRlbmRzIE1vZGVsPENvbnRlbnRBdHRyaWJ1dGUsIEN1c3RvbUV2ZW50PiB7XG4gKiAgIDpcbiAqIH1cbiAqIGNvbnN0IENvbnRlbnQgPSBDb250ZW50Q2xhc3MgYXMgTW9kZWxDb25zdHJ1Y3RvcjxDb250ZW50Q2xhc3MsIENvbnRlbnRBdHRyaWJ1dGU+O1xuICpcbiAqIGNvbnN0IGNvbnRlbnQgPSBuZXcgQ29udGVudCh7IC4uLiB9KTtcbiAqIGNvbnRlbnQudHJpZ2dlcignZmlyZScsIHRydWUsIDEwMCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIE1vZGVsPFQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3QsIEV2ZW50IGV4dGVuZHMgTW9kZWxFdmVudDxUPiA9IE1vZGVsRXZlbnQ8VD4+IGV4dGVuZHMgRXZlbnRSZWNlaXZlciBpbXBsZW1lbnRzIEV2ZW50U291cmNlPEV2ZW50PiB7XG4gICAgLyoqXG4gICAgICogQGVuIEdldCBJRCBhdHRyaWJ1dGUgbmFtZS5cbiAgICAgKiBAamEgSUQg44Ki44OI44Oq44OT44Ol44O844OI5ZCN44Gr44Ki44Kv44K744K5XG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBzdGF0aWMgaWRBdHRyaWJ1dGUgPSAnaWQnO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEF0dHJpYnV0ZXMgcG9vbFxuICAgICAqIEBqYSDlsZ7mgKfmoLzntI3poJjln59cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXTogUHJvcGVydHk8VD47XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgYXR0cmlidXRlIHZhbHVlc1xuICAgICAqICAtIGBqYWAg5bGe5oCn44Gu5Yid5pyf5YCk44KS5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlczogUmVxdWlyZWQ8VD4sIG9wdGlvbnM/OiBNb2RlbENvbnN0cnVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpO1xuICAgICAgICBjb25zdCBhdHRycyA9IG9wdHMucGFyc2UgPyB0aGlzLnBhcnNlKGF0dHJpYnV0ZXMsIG9wdHMpIGFzIFQgOiBhdHRyaWJ1dGVzO1xuICAgICAgICBjb25zdCBwcm9wczogUHJvcGVydHk8VD4gPSB7XG4gICAgICAgICAgICBhdHRyczogT2JzZXJ2YWJsZU9iamVjdC5mcm9tKGF0dHJzKSxcbiAgICAgICAgICAgIGJhc2VBdHRyczogeyAuLi5hdHRycyB9LFxuICAgICAgICAgICAgcHJldkF0dHJzOiB7IC4uLmF0dHJzIH0sXG4gICAgICAgICAgICBjaWQ6IGx1aWQoJ21vZGVsOicsIDgpLFxuICAgICAgICAgICAgb3B0aW9uczogb3B0cyxcbiAgICAgICAgfTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIF9wcm9wZXJ0aWVzLCB7IHZhbHVlOiBwcm9wcyB9KTtcblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhhdHRycykpIHtcbiAgICAgICAgICAgIHRoaXNbX2RlZmluZUF0dHJpYnV0ZXNdKHRoaXMsIGtleSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzW19jaGFuZ2VIYW5kbGVyXSA9ICgpID0+IHtcbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAY2hhbmdlJywgdGhpcyBhcyBNb2RlbCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpc1tfdmFsaWRhdGVdKHt9LCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGF0dHJpYnV0ZSBicmlkZ2UgZGVmICovXG4gICAgcHJpdmF0ZSBbX2RlZmluZUF0dHJpYnV0ZXNdKGluc3RhbmNlOiBvYmplY3QsIG5hbWU6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb25zdCBwcm90byA9IGluc3RhbmNlLmNvbnN0cnVjdG9yLnByb3RvdHlwZTtcbiAgICAgICAgaWYgKCEobmFtZSBpbiBwcm90bykpIHtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgbmFtZSwge1xuICAgICAgICAgICAgICAgIGdldCgpOiB1bmtub3duIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2F0dHJzW25hbWVdO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2V0KHZhbDogdW5rbm93bik6IHZvaWQge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWRlZXBFcXVhbCh0aGlzLl9hdHRyc1tuYW1lXSwgdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXNbX3Byb3BlcnRpZXNdLmNoYW5nZWRBdHRycztcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3ByZXZBdHRyc1tuYW1lXSA9IHRoaXMuX2F0dHJzW25hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fYXR0cnNbbmFtZV0gICAgID0gdmFsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IHB1YmxpYyBwcm9wZXJ0aWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNvbnRlbnQgSUQuXG4gICAgICogQGphIOOCs+ODs+ODhuODs+ODhCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgaWRBdHRyID0gaWRBdHRyaWJ1dGUodGhpcywgJ2lkJyk7XG4gICAgICAgIGNvbnN0IHsgY2lkLCBhdHRycyB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiAoaWRBdHRyIGluIGF0dHJzKSA/IGF0dHJzW2lkQXR0cl0gOiBjaWQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IHByb3RlY3RlZCBwcm9wZXJ0aWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDlsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9hdHRycygpOiBPYnNlcnZhYmxlT2JqZWN0IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmF0dHJzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWZhdWx0IGF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5pei5a6a5YCk5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfYmFzZUF0dHJzKCk6IFQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uYmFzZUF0dHJzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBQcmV2aW91cyBhdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWkieabtOWJjeOBruWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3ByZXZBdHRycygpOiBUIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnByZXZBdHRycztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hhbmdlZCBhdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWkieabtOOBruOBguOBo+OBn+WxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2NoYW5nZWRBdHRycygpOiBQYXJ0aWFsPFQ+IHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpc1tfcHJvcGVydGllc10uY2hhbmdlZEF0dHJzKSB7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnMgPSBkaWZmKHRoaXMuX2Jhc2VBdHRycywgdGhpcy5fYXR0cnMgYXMgdW5rbm93biBhcyBQYXJ0aWFsPFQ+KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY2hhbmdlZEF0dHJzIGFzIFBhcnRpYWw8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBpbnRlcm5hbCBjb250ZW50IElELlxuICAgICAqIEBqYSDlhoXpg6jjga7jgrPjg7Pjg4bjg7Pjg4QgSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY2lkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jaWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjcmVhdGluZyBvcHRpb25zLlxuICAgICAqIEBqYSDmp4vnr4nmmYLjga7jgqrjg5fjgrfjg6fjg7PjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9vcHRpb25zKCk6IE1vZGVsU2V0T3B0aW9ucyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5vcHRpb25zO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IGV2ZW50c1xuXG4gICAgLyoqIEBpbnRlcm5hbCBicm9rZXIgYWNjZXNzICovXG4gICAgcHJpdmF0ZSBnZXQgW19icm9rZXJdKCk6IEV2ZW50QnJva2VyPGFueT4ge1xuICAgICAgICByZXR1cm4gKHRoaXMuX2F0dHJzIGFzIElPYnNlcnZhYmxlIGFzIElPYnNlcnZhYmxlRXZlbnRCcm9rZXJBY2Nlc3MpLmdldEJyb2tlcigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIHRoaXMgb2JqZWN0IGhhcyBjbGllbnRzLlxuICAgICAqIEBqYSDjgq/jg6njgqTjgqLjg7Pjg4jjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIGhhc0xpc3RlbmVyPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbD86IENoYW5uZWwsIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2Jyb2tlcl0uaGFzTGlzdGVuZXIoY2hhbm5lbCwgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHJlZ2lzdGVyZWQgY2hhbm5lbCBrZXlzLlxuICAgICAqIEBqYSDnmbvpjLLjgZXjgozjgabjgYTjgovjg4Hjg6Pjg43jg6vjgq3jg7zjgpLov5TljbRcbiAgICAgKi9cbiAgICBjaGFubmVscygpOiAoa2V5b2YgRXZlbnQpW10ge1xuICAgICAgICByZXR1cm4gdGhpc1tfYnJva2VyXS5jaGFubmVscygpIGFzIChrZXlvZiBFdmVudClbXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTm90aWZ5IGV2ZW50IHRvIGNsaWVudHMuXG4gICAgICogQGphIGV2ZW50IOeZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGFyZ3VtZW50cyBmb3IgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsOOBq+a4oeOBmeW8leaVsFxuICAgICAqL1xuICAgIHB1YmxpYyB0cmlnZ2VyPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCwgLi4uYXJnczogQXJndW1lbnRzPFBhcnRpYWw8RXZlbnRbQ2hhbm5lbF0+Pik6IHZvaWQge1xuICAgICAgICAodGhpc1tfYnJva2VyXSBhcyBhbnkpLnRyaWdnZXIoY2hhbm5lbCwgLi4uYXJncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGV2ZXJ5dGhpbmcgaXMgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuino+mZpFxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WQjOS4gCBgY2hhbm5lbGAg44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgcHVibGljIG9mZjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw/OiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2F0dHJzLm9mZihjaGFubmVsIGFzIGFueSwgbGlzdGVuZXIgYXMgYW55KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgb248Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBpZiAoJyonID09PSBjaGFubmVsIHx8ICdAY2hhbmdlJyA9PT0gY2hhbm5lbCB8fCAoaXNBcnJheShjaGFubmVsKSAmJiBjaGFubmVsLmluY2x1ZGVzKCdAY2hhbmdlJyBhcyBDaGFubmVsKSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2F0dHJzLm9uKCdAJywgdGhpc1tfY2hhbmdlSGFuZGxlcl0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9hdHRycy5vbihjaGFubmVsIGFzIGFueSwgbGlzdGVuZXIgYXMgYW55KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpIGJ1dCBpdCBjYXVzZXMgdGhlIGJvdW5kIGNhbGxiYWNrIHRvIG9ubHkgZmlyZSBvbmNlIGJlZm9yZSBiZWluZyByZW1vdmVkLlxuICAgICAqIEBqYSDkuIDluqbjgaDjgZHjg4/jg7Pjg4njg6rjg7PjgrDlj6/og73jgarjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgb25jZTxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLm9uKGNoYW5uZWwsIGxpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgbWFuYWdlZCA9IHRoaXMub24oY2hhbm5lbCwgKCkgPT4ge1xuICAgICAgICAgICAgY29udGV4dC51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgbWFuYWdlZC51bnN1YnNjcmliZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogdmFsaWRhdGlvblxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHZhbGlkIG9yIG5vdC5cbiAgICAgKiBAamEg5qSc6Ki844Gu5oiQ5ZCm44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGlzVmFsaWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBTVUNDRUVERUQodGhpcy52YWxpZGF0ZSh7IHNpbGVudDogdHJ1ZSB9KS5jb2RlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmFsaWRhdGUgcmVzdWx0IGFjY2Vzc2VyLlxuICAgICAqIEBqYSDmpJzoqLzntZDmnpzjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgdmFsaWRhdGUob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogUmVzdWx0IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyB2YWxpZGF0ZTogdHJ1ZSwgbm9UaHJvdzogdHJ1ZSwgZXh0ZW5kOiBmYWxzZSB9LCBvcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3ZhbGlkYXRlXSh7fSwgb3B0cyk7XG4gICAgfVxuXG4gICAgLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzICovXG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmFsaWRhdGUgZGF0YSBtZXRob2QuXG4gICAgICogQGphIOODh+ODvOOCv+aknOiovFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgdmFsaWRhdGVlIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgamFgIOiiq+aknOiovOWxnuaAp1xuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCB2YWxpZGF0ZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDmpJzoqLzjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgdmFsaWRhdGVBdHRyaWJ1dGVzPEEgZXh0ZW5kcyBUPihhdHRyaWJ1dGVzOiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+LCBvcHRpb25zPzogTW9kZWxWYWxpZGF0ZUF0dHJpYnV0ZU9wdGlvbnMpOiBSZXN1bHQge1xuICAgICAgICByZXR1cm4gUkVTVUxUX1ZBTElEX0FUVFJTO1xuICAgIH1cblxuICAgIC8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzICovXG5cbiAgICAvKiogQGludGVybmFsIHZhbGlkYXRlICovXG4gICAgcHJpdmF0ZSBbX3ZhbGlkYXRlXTxBIGV4dGVuZHMgVD4oYXR0cmlidXRlczogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPiwgb3B0aW9ucz86IE1vZGVsU2V0T3B0aW9ucyk6IFJlc3VsdCB8IG5ldmVyIHtcbiAgICAgICAgY29uc3QgeyB2YWxpZGF0ZSwgc2lsZW50LCBub1Rocm93IH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBpZiAodmFsaWRhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGF0dHJzID0geyAuLi50aGlzLl9hdHRycywgLi4uYXR0cmlidXRlcyB9O1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy52YWxpZGF0ZUF0dHJpYnV0ZXMoYXR0cnMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKEZBSUxFRChyZXN1bHQuY29kZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGludmFsaWQnLCB0aGlzIGFzIE1vZGVsLCBhdHRycywgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFub1Rocm93KSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFJFU1VMVF9WQUxJRF9BVFRSUztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IGF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgW1tNb2RlbF1dIGhhcyB2YWxpZCBwcm9wZXJ0eS4gKG5vdCBgbnVsbGAgb3IgYHVuZGVmaW5lZGApXG4gICAgICogQGphIFtbTW9kZWxdXSDjgYzmnInlirnjgarjg5fjg63jg5Hjg4bjgqPjgpLmjIHjgaPjgabjgYTjgovjgYvnorroqo0gKGBudWxsYCDjgb7jgZ/jga8gYHVuZGVmaW5lZGAg44Gn44Gq44GEKVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXMoYXR0cmlidXRlOiBrZXlvZiBUKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9ICh0aGlzLl9hdHRycyBhcyB1bmtub3duIGFzIFQpW2F0dHJpYnV0ZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgSFRNTC1lc2NhcGVkIHZhbHVlIG9mIGFuIGF0dHJpYnV0ZS5cbiAgICAgKiBAamEgSFRNTCDjgafkvb/nlKjjgZnjgovmloflrZfjgpLliLblvqHmloflrZfjgavnva7mj5vjgZfjgZ/lsZ7mgKflgKTjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZXNjYXBlKGF0dHJpYnV0ZToga2V5b2YgVCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBlc2NhcGVIVE1MKCh0aGlzLl9hdHRycyBhcyBhbnkpW2F0dHJpYnV0ZV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVcGRhdGUgYXR0cmlidXRlcyBmb3IgYmF0Y2ggaW5wdXQgd2l0aCBvcHRpb25zLlxuICAgICAqIEBqYSDlsZ7mgKfjga7kuIDmi6zoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCB1cGRhdGUgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg5pu05paw5bGe5oCnXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBhdHRyaWJ1dGVzIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOWxnuaAp+abtOaWsOeUqOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXRBdHRyaWJ1dGVzPEEgZXh0ZW5kcyBUPihhdHRyaWJ1dGVzOiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+LCBvcHRpb25zPzogTW9kZWxTZXRPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgc2lsZW50LCBleHRlbmQgfSA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hdHRycy5zdXNwZW5kKHRydWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzW192YWxpZGF0ZV0oYXR0cmlidXRlcywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoRkFJTEVEKHJlc3VsdC5jb2RlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgT2JqZWN0LmtleXMoYXR0cmlidXRlcykpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXR0ciBpbiB0aGlzLl9hdHRycykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9hdHRyc1thdHRyXSA9IGF0dHJpYnV0ZXNbYXR0cl07XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChleHRlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfZGVmaW5lQXR0cmlidXRlc10odGhpcywgYXR0cik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzW2F0dHJdID0gYXR0cmlidXRlc1thdHRyXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBpZiAoc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYXR0cnMucmVzdW1lKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgYWxsIGF0dHJpYnV0ZXMgb24gdGhlIFtbTW9kZWxdXS4gKHNldCBgdW5kZWZpbmVkYClcbiAgICAgKiBAamEgW1tNb2RlbF1dIOOBi+OCieOBmeOBueOBpuOBruWxnuaAp+OCkuWJiumZpCAoYHVuZGVmaW5lZGAg44KS6Kit5a6aKVxuICAgICAqL1xuICAgIHB1YmxpYyBjbGVhcihvcHRpb25zPzogTW9kZWxTZXRPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGNsZWFyQXR0cnMgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIE9iamVjdC5rZXlzKHRoaXMuX2Jhc2VBdHRycykpIHtcbiAgICAgICAgICAgIGNsZWFyQXR0cnNbYXR0cl0gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0QXR0cmlidXRlcyhjbGVhckF0dHJzLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGEgY29weSBvZiB0aGUgbW9kZWwncyBgYXR0cmlidXRlc2Agb2JqZWN0LlxuICAgICAqIEBqYSDjg6Ljg4fjg6vlsZ7mgKflgKTjga7jgrPjg5Tjg7zjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgdG9KU09OKCk6IFQge1xuICAgICAgICByZXR1cm4gZGVlcENvcHkoeyAuLi50aGlzLl9hdHRycyB9IGFzIFQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlcyBDbG9uZSB0aGlzIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7opIfoo73jgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHB1YmxpYyBjbG9uZSgpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBjb25zdHJ1Y3RvciwgX2F0dHJzLCBfb3B0aW9ucyB9ID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyAoY29uc3RydWN0b3IgYXMgQ29uc3RydWN0b3I8dGhpcz4pKF9hdHRycywgX29wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBjaGFuZ2VkIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIOWkieabtOOBleOCjOOBn+WxnuaAp+WApOOCkuaMgeOBpOOBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZVxuICAgICAqICAtIGBlbmAgY2hlY2tlZCBhdHRyaWJ1dGVcbiAgICAgKiAgLSBgamFgIOaknOiovOOBmeOCi+WxnuaAp1xuICAgICAqL1xuICAgIHB1YmxpYyBoYXNDaGFuZ2VkKGF0dHJpYnV0ZT86IGtleW9mIFQpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0gYXR0cmlidXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gIWlzRW1wdHlPYmplY3QodGhpcy5fY2hhbmdlZEF0dHJzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBhdHRyaWJ1dGUgaW4gdGhpcy5fY2hhbmdlZEF0dHJzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBhbiBvYmplY3QgY29udGFpbmluZyBhbGwgdGhlIGF0dHJpYnV0ZXMgdGhhdCBoYXZlIGNoYW5nZWQsIG9yIGB1bmRlZmluZWRgIGlmIHRoZXJlIGFyZSBubyBjaGFuZ2VkIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIOWFpeWKm+OBl+OBnyBhdHRyaWJ1dGVzIOWApOOBruW3ruWIhuOBq+WvvuOBl+OBpuWkieabtOOBjOOBguOCi+WxnuaAp+WApOOCkui/lOWNtC4g5beu5YiG44GM44Gq44GE5aC05ZCI44GvIGB1bmRlZmllbmRgIOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIGNoZWNrZWQgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg5qSc6Ki844GZ44KL5bGe5oCnXG4gICAgICovXG4gICAgcHVibGljIGNoYW5nZWQoYXR0cmlidXRlcz86IFBhcnRpYWw8VD4pOiBQYXJ0aWFsPFQ+IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKCFhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oYXNDaGFuZ2VkKCkgPyB7IC4uLnRoaXMuX2NoYW5nZWRBdHRycyB9IDogdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgY2hhbmdlZCA9IGRpZmYodGhpcy5fYXR0cnMsIGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgcmV0dXJuICFpc0VtcHR5T2JqZWN0KGNoYW5nZWQpID8gY2hhbmdlZCA6IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHByZXZpb3VzIHZhbHVlIG9mIGFuIGF0dHJpYnV0ZSwgcmVjb3JkZWQgYXQgdGhlIHRpbWUgdGhlIGxhc3QgYEBjaGFuZ2VgIGV2ZW50IHdhcyBmaXJlZC5cbiAgICAgKiBAamEgYEBjaGFuZ2VgIOOBjOeZuueBq+OBleOCjOOBn+WJjeOBruWxnuaAp+WApOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2aW91czxLIGV4dGVuZHMga2V5b2YgVD4oYXR0cmlidXRlOiBLKTogVFtLXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wcmV2QXR0cnNbYXR0cmlidXRlXTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBzeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgYSBbW01vZGVsXV0gaXMgbmV3IGlmIGl0IGhhcyBuZXZlciBiZWVuIHNhdmVkIHRvIHRoZSBzZXJ2ZXIsIGFuZCBsYWNrcyBhbiBpZC5cbiAgICAgKiBAamEgW1tNb2RlbF1dIOOBjOOBvuOBoOOCteODvOODkOODvOOBq+WtmOWcqOOBl+OBquOBhOOBi+ODgeOCp+ODg+OCry4g5pei5a6a44Gn44GvIGBpZEF0dHJpYnV0ZWAg44Gu5pyJ54Sh44Gn5Yik5a6aXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGlzTmV3KCk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBpZEF0dHIgPSBpZEF0dHJpYnV0ZSh0aGlzLCAnaWQnKTtcbiAgICAgICAgcmV0dXJuICF0aGlzLmhhcyhpZEF0dHIgYXMga2V5b2YgVCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENvbnZlcnRzIGEgcmVzcG9uc2UgaW50byB0aGUgaGFzaCBvZiBhdHRyaWJ1dGVzIHRvIGJlIGBzZXRgIG9uIHRoZSBtb2RlbC4gVGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gaXMganVzdCB0byBwYXNzIHRoZSByZXNwb25zZSBhbG9uZy5cbiAgICAgKiBAamEg44Os44K544Od44Oz44K544Gu5aSJ5o+b44Oh44K944OD44OJLiDml6Llrprjgafjga/kvZXjgoLjgZfjgarjgYRcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBwYXJzZShyZXNwb25zZTogUGxhaW5PYmplY3QgfCB2b2lkLCBvcHRpb25zPzogTW9kZWxTZXRPcHRpb25zKTogVCB8IHZvaWQgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UgYXMgVDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUHJveHkgW1tJRGF0YVN5bmMjc3luY11dIGJ5IGRlZmF1bHQgLS0gYnV0IG92ZXJyaWRlIHRoaXMgaWYgeW91IG5lZWQgY3VzdG9tIHN5bmNpbmcgc2VtYW50aWNzIGZvciAqdGhpcyogcGFydGljdWxhciBtb2RlbC5cbiAgICAgKiBAamEg44OH44O844K/5ZCM5pyfLiDlv4XopoHjgavlv5zjgZjjgabjgqrjg7zjg5Djg7zjg6njgqTjg4nlj6/og70uXG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOOCquODmuODrOODvOOCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBzeW5jaHJvbml6ZWQgY29udGV4dCBvYmplY3RcbiAgICAgKiAgLSBgamFgIOWQjOacn+OBmeOCi+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb24gb2JqZWN0XG4gICAgICogIC0gYGphYCDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgc3luYzxLIGV4dGVuZHMgTW9kZWxTeW5jTWV0aG9kcz4obWV0aG9kOiBLLCBjb250ZXh0OiBNb2RlbDxUPiwgb3B0aW9ucz86IE1vZGVsRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxNb2RlbFN5bmNSZXN1bHQ8SywgVD4+IHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRTeW5jKCkuc3luYyhtZXRob2QsIGNvbnRleHQgYXMgU3luY0NvbnRleHQ8VD4sIG9wdGlvbnMpIGFzIHVua25vd24gYXMgUHJvbWlzZTxNb2RlbFN5bmNSZXN1bHQ8SywgVD4+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGZXRjaCB0aGUgW1tNb2RlbF1dIGZyb20gdGhlIHNlcnZlciwgbWVyZ2luZyB0aGUgcmVzcG9uc2Ugd2l0aCB0aGUgbW9kZWwncyBsb2NhbCBhdHRyaWJ1dGVzLlxuICAgICAqIEBqYSBbW01vZGVsXV0g5bGe5oCn44Gu44K144O844OQ44O85ZCM5pyfLiDjg6zjgrnjg53jg7Pjgrnjga7jg57jg7zjgrjjgpLlrp/ooYxcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgZmV0Y2gob3B0aW9ucz86IE1vZGVsRmV0Y2hPcHRpb25zKTogUHJvbWlzZTxUPiB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgcGFyc2U6IHRydWUgfSwgb3B0aW9ucywgeyBzeW5jTWV0aG9kOiAncmVhZCcgfSk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCB0aGlzLnN5bmMoJ3JlYWQnLCB0aGlzIGFzIE1vZGVsPFQ+LCBvcHRzKTtcbiAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlcyhvcHRzLnBhcnNlID8gdGhpcy5wYXJzZShyZXNwLCBvcHRzKSBhcyBUIDogcmVzcCwgb3B0cyk7XG4gICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQHN5bmMnLCB0aGlzIGFzIE1vZGVsLCByZXNwLCBvcHRzKTtcbiAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGVycm9yJywgdGhpcyBhcyBNb2RlbCwgZSwgb3B0cyk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBhIGhhc2ggb2YgW1tNb2RlbF1dIGF0dHJpYnV0ZXMsIGFuZCBzeW5jIHRoZSBtb2RlbCB0byB0aGUgc2VydmVyLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBzZXJ2ZXIgcmV0dXJucyBhbiBhdHRyaWJ1dGVzIGhhc2ggdGhhdCBkaWZmZXJzLCB0aGUgbW9kZWwncyBzdGF0ZSB3aWxsIGJlIGBzZXRgIGFnYWluLlxuICAgICAqIEBqYSBbW01vZGVsXV0g5bGe5oCn44KS44K144O844OQ44O844Gr5L+d5a2YLiA8YnI+XG4gICAgICogICAgIOeVsOOBquOCi+WxnuaAp+OBjOi/lOWNtOOBleOCjOOCi+WgtOWQiOOBr+WGjeioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgdXBkYXRlIGF0dHJpYnV0ZSBrZXlcbiAgICAgKiAgLSBgamFgIOabtOaWsOWxnuaAp+OCreODvFxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgdXBkYXRlIGF0dHJpYnV0ZSB2YWx1ZVxuICAgICAqICAtIGBqYWAg5pu05paw5bGe5oCn5YCkXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNhdmUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5L+d5a2Y44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIHNhdmU8SyBleHRlbmRzIGtleW9mIFQ+KGtleT86IGtleW9mIFQsIHZhbHVlPzogVFtLXSwgb3B0aW9ucz86IE1vZGVsU2F2ZU9wdGlvbnMpOiBQcm9taXNlPFBsYWluT2JqZWN0IHwgdm9pZD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IGEgaGFzaCBvZiBbW01vZGVsXV0gYXR0cmlidXRlcywgYW5kIHN5bmMgdGhlIG1vZGVsIHRvIHRoZSBzZXJ2ZXIuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIHNlcnZlciByZXR1cm5zIGFuIGF0dHJpYnV0ZXMgaGFzaCB0aGF0IGRpZmZlcnMsIHRoZSBtb2RlbCdzIHN0YXRlIHdpbGwgYmUgYHNldGAgYWdhaW4uXG4gICAgICogQGphIFtbTW9kZWxdXSDlsZ7mgKfjgpLjgrXjg7zjg5Djg7zjgavkv53lrZguIDxicj5cbiAgICAgKiAgICAg55Ww44Gq44KL5bGe5oCn44GM6L+U5Y2044GV44KM44KL5aC05ZCI44Gv5YaN6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgdXBkYXRlIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgamFgIOabtOaWsOWxnuaAp1xuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzYXZlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOS/neWtmOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBzYXZlPEEgZXh0ZW5kcyBUPihhdHRyaWJ1dGVzOiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+IHwgTmlsLCBvcHRpb25zPzogTW9kZWxTYXZlT3B0aW9ucyk6IFByb21pc2U8UGxhaW5PYmplY3QgfCB2b2lkPjtcblxuICAgIHB1YmxpYyBhc3luYyBzYXZlKC4uLmFyZ3M6IHVua25vd25bXSk6IFByb21pc2U8UGxhaW5PYmplY3QgfCB2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgYXR0cnMsIG9wdGlvbnMgfSA9IHBhcnNlU2F2ZUFyZ3MoLi4uYXJncyk7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgdmFsaWRhdGU6IHRydWUsIHBhcnNlOiB0cnVlLCB3YWl0OiB0cnVlIH0sIG9wdGlvbnMpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IHdhaXQgfSA9IG9wdHM7XG5cbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZCA9IG9wdHMuc3luY01ldGhvZCA9IHRoaXMuaXNOZXcoKSA/ICdjcmVhdGUnIDogb3B0cy5wYXRjaCA/ICdwYXRjaCcgOiAndXBkYXRlJztcblxuICAgICAgICAgICAgaWYgKGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF3YWl0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlcyhhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmJhc2VBdHRycyA9IHsgLi4udGhpcy5fYXR0cnMgfSBhcyBUO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3ZhbGlkYXRlXShhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICgncGF0Y2gnID09PSBtZXRob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0cy5kYXRhID0gYXR0cnM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0cy5kYXRhID0gT2JqZWN0LmFzc2lnbih0aGlzLnRvSlNPTigpLCBhdHRycyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXNwID0gYXdhaXQgdGhpcy5zeW5jKG1ldGhvZCwgdGhpcyBhcyBNb2RlbDxUPiwgb3B0cyk7XG5cbiAgICAgICAgICAgIGxldCBzZXJ2ZXJBdHRycyA9IG9wdHMucGFyc2UgPyB0aGlzLnBhcnNlKHJlc3AsIG9wdHMpIDogcmVzcDtcbiAgICAgICAgICAgIGlmIChhdHRycyAmJiB3YWl0KSB7XG4gICAgICAgICAgICAgICAgc2VydmVyQXR0cnMgPSBPYmplY3QuYXNzaWduKHt9LCBhdHRycywgc2VydmVyQXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlzT2JqZWN0KHNlcnZlckF0dHJzKSAmJiAhaXNFbXB0eU9iamVjdChzZXJ2ZXJBdHRycykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEF0dHJpYnV0ZXMoc2VydmVyQXR0cnMgYXMgVCwgb3B0cyk7XG4gICAgICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uYmFzZUF0dHJzID0geyAuLi50aGlzLl9hdHRycyB9IGFzIFQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAc3luYycsIHRoaXMgYXMgTW9kZWwsIHJlc3AgYXMgUGxhaW5PYmplY3QsIG9wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAZXJyb3InLCB0aGlzIGFzIE1vZGVsLCBlLCBvcHRzKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVzdHJveSB0aGlzIFtbTW9kZWxdXSBvbiB0aGUgc2VydmVyIGlmIGl0IHdhcyBhbHJlYWR5IHBlcnNpc3RlZC5cbiAgICAgKiBAamEgW1tNb2RlbF1dIOOCkuOCteODvOODkOODvOOBi+OCieWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGRlc3Ryb3kgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg56C05qOE44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGRlc3Ryb3kob3B0aW9ucz86IE1vZGVsRGVzdHJveU9wdGlvbnMpOiBQcm9taXNlPFBsYWluT2JqZWN0IHwgdm9pZD4ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHdhaXQ6IHRydWUgfSwgb3B0aW9ucywgeyBzeW5jTWV0aG9kOiAnZGVsZXRlJyB9KTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyB3YWl0LCBjYW5jZWwgfSA9IG9wdHM7XG4gICAgICAgICAgICBjb25zdCBleGlzdHMgPSAhdGhpcy5pc05ldygpO1xuICAgICAgICAgICAgY29uc3QgZGVzdHJ1Y3QgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BkZXN0cm95JywgdGhpcyBhcyBNb2RlbCwgb3B0cyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAhd2FpdCAmJiBkZXN0cnVjdCgpO1xuXG4gICAgICAgICAgICBsZXQgcmVzcDogUGxhaW5PYmplY3QgfCB2b2lkO1xuICAgICAgICAgICAgaWYgKCFleGlzdHMpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBjYyhjYW5jZWwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNwID0gYXdhaXQgdGhpcy5zeW5jKCdkZWxldGUnLCB0aGlzIGFzIE1vZGVsPFQ+LCBvcHRzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgd2FpdCAmJiBkZXN0cnVjdCgpO1xuICAgICAgICAgICAgZXhpc3RzICYmICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAc3luYycsIHRoaXMgYXMgTW9kZWwsIHJlc3AgYXMgUGxhaW5PYmplY3QsIG9wdHMpO1xuXG4gICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BlcnJvcicsIHRoaXMgYXMgTW9kZWwsIGUsIG9wdHMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gbWl4aW4g44Gr44KI44KLIGBpbnN0YW5jZW9mYCDjga/nhKHlirnjgavoqK3lrppcbnNldE1peENsYXNzQXR0cmlidXRlKE1vZGVsIGFzIHVua25vd24gYXMgQ2xhc3MsICdpbnN0YW5jZU9mJywgbnVsbCk7XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFtbTW9kZWxdXS5cbiAqIEBqYSBbW01vZGVsXV0g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNNb2RlbCh4OiB1bmtub3duKTogeCBpcyBNb2RlbCB7XG4gICAgcmV0dXJuIHggaW5zdGFuY2VvZiBNb2RlbDtcbn1cblxuLyoqXG4gKiBAZW4gUXVlcnkgW1tNb2RlbF1dIGBpZC1hdHRyaWJ1dGVgLlxuICogQGphIFtbTW9kZWxdXSDjga4gYGlkLWF0dHJpYnV0ZWAg44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpZEF0dHJpYnV0ZSh4OiB1bmtub3duLCBmYWxsYmFjayA9ICcnKTogc3RyaW5nIHtcbiAgICByZXR1cm4gaXNPYmplY3QoeCkgPyAoeC5jb25zdHJ1Y3RvclsnaWRBdHRyaWJ1dGUnXSB8fCBmYWxsYmFjaykgOiBmYWxsYmFjaztcbn1cbiJdLCJuYW1lcyI6WyJjYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUE7Ozs7O0FBTUE7Ozs7O0lBVUk7SUFBQTtRQUNJLHNGQUFpRCxDQUFBO1FBQ2pELG9EQUF5QixZQUFBLGtCQUFrQixnQkFBdUIsaUJBQXdCLENBQUMsRUFBRSxlQUFlLENBQUMsNEJBQUEsQ0FBQTtLQUNoSCxJQUFBO0FBQ0wsQ0FBQzs7QUNwQkQ7OztBQXVEQSxNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMzQyxNQUFNLFNBQVMsR0FBVyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDN0MsTUFBTSxjQUFjLEdBQU0sTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzdDLE1BQU0sT0FBTyxHQUFhLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMzQyxNQUFNLFdBQVcsR0FBUyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7QUFZL0M7Ozs7TUFJYSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLEVBQUU7QUFFckc7QUFDQSxTQUFTLGFBQWEsQ0FBbUIsR0FBRyxJQUFXO0lBQ25ELElBQUksQ0FBQyxHQUFHLEVB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
