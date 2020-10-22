/*!
 * @cdp/model 0.9.5
 *   generic model scheme
 */

import { luid, deepEqual, diff, isArray, escapeHTML, deepCopy, isEmptyObject, isObject } from '@cdp/core-utils';
import { EventRevceiver } from '@cdp/events';
import { checkCanceled } from '@cdp/promise';
import { ObservableObject } from '@cdp/observable';
import { makeResult, RESULT_CODE, SUCCEEDED, FAILED } from '@cdp/result';
import { defaultSync } from '@cdp/data-sync';

/* eslint-disable
    @typescript-eslint/no-namespace
 ,  @typescript-eslint/no-unused-vars
 ,  @typescript-eslint/restrict-plus-operands
 */
globalThis.CDP_DECLARE = globalThis.CDP_DECLARE;
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
 * const Model = ModelBase as ModelConstructor<ModelBase<ContentAttribute>, ContentAttribute>;
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
 * // late cast
 * class ContentBase extends ModelBase<ContentAttribute> {
 *   constructor(attrs: ContentAttribute) {
 *     super(attrs);
 *   }
 * }
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
 * const Model = ModelBase as ModelConstructor<ModelBase<ContentAttribute, CustomEvent>, ContentAttribute>;
 * class Content extends Model {
 *   :
 * }
 *
 * // late cast
 * class ContentBase extends ModelBase<ContentAttribute, CustomEvent> {
 *   :
 * }
 * const Content = ContentBase as ModelConstructor<Content, ContentAttribute>;
 *
 * const content = new Content({ ... });
 * content.trigger('fire', true, 100);
 * ```
 */
class Model extends EventRevceiver {
    /**
     * constructor
     *
     * @param attributes
     *  - `en` initial attribute values
     *  - `ja` 属性の初期値を指定
     */
    constructor(attributes, options) {
        super();
        const opts = Object.assign({ idAttribute: 'id' }, options);
        const attrs = opts.parse ? this.parse(attributes, opts) : attributes;
        const props = {
            attrs: ObservableObject.from(attrs),
            baseAttrs: { ...attrs },
            prevAttrs: { ...attrs },
            idAttribute: opts.idAttribute,
            cid: luid('model:', 8),
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
        const { idAttribute, cid, attrs } = this[_properties];
        return (idAttribute in attrs) ? attrs[idAttribute] : cid;
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
        if ('@change' === channel || (isArray(channel) && channel.includes('@change'))) {
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
        const { idAttribute } = this[_properties];
        return !this.has(idAttribute);
    }
    /**
     * @en Converts a response into the hash of attributes to be `set` on the model. The default implementation is just to pass the response along.
     * @ja レスポンスの変換メソッド. 既定では何もしない
     */
    parse(response, options) {
        return response;
    }
    /**
     * @en Proxy [[IDataSync#sync]] by default -- but override this if you need custom syncing semantics for *this* particular model.
     * @ja データ同期. 必要に応じてオーバーライド可能.
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
        const opts = Object.assign({ parse: true }, options);
        try {
            const resp = await this.sync('read', this, opts);
            this.setAttributes(opts.parse ? this.parse(resp, options) : resp, opts);
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
            const method = this.isNew() ? 'create' : opts.patch ? 'patch' : 'update';
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
        const opts = Object.assign({ wait: true }, options);
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

export { Model as ModelBase, RESULT_VALID_ATTRS };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwubWpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwiYmFzZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAsICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAsICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kc1xuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIE1PREVMID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgNSxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19NT0RFTF9ERUNMQVJFICAgICAgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX0RBVEEgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5NT0RFTCArIDEsICdpbnZhbGlkIGRhdGEuJyksXG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICBOaWwsXG4gICAgUGxhaW5PYmplY3QsXG4gICAgQXJndW1lbnRzLFxuICAgIGlzQXJyYXksXG4gICAgaXNPYmplY3QsXG4gICAgaXNFbXB0eU9iamVjdCxcbiAgICBsdWlkLFxuICAgIGVzY2FwZUhUTUwsXG4gICAgZGVlcENvcHksXG4gICAgZGVlcEVxdWFsLFxuICAgIGRpZmYsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIFN1YnNjcmlwdGlvbixcbiAgICBTaWxlbmNlYWJsZSxcbiAgICBFdmVudEJyb2tlcixcbiAgICBFdmVudFJldmNlaXZlcixcbiAgICBFdmVudFNvdXJjZSxcbn0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgY2hlY2tDYW5jZWxlZCBhcyBjYyB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQge1xuICAgIElPYnNlcnZhYmxlLFxuICAgIElPYnNlcnZhYmxlRXZlbnRCcm9rZXJBY2Nlc3MsXG4gICAgT2JzZXJ2YWJsZU9iamVjdCxcbn0gZnJvbSAnQGNkcC9vYnNlcnZhYmxlJztcbmltcG9ydCB7XG4gICAgUkVTVUxUX0NPREUsXG4gICAgUmVzdWx0LFxuICAgIG1ha2VSZXN1bHQsXG4gICAgU1VDQ0VFREVELFxuICAgIEZBSUxFRCxcbn0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgU3luY0NvbnRleHQsIGRlZmF1bHRTeW5jIH0gZnJvbSAnQGNkcC9kYXRhLXN5bmMnO1xuaW1wb3J0IHtcbiAgICBNb2RlbEV2ZW50LFxuICAgIE1vZGVsVmFsaWRhdGVBdHRyaWJ1dGVPcHRpb25zLFxuICAgIE1vZGVsQXR0cmlidXRlSW5wdXQsXG4gICAgTW9kZWxTZXRPcHRpb25zLFxuICAgIE1vZGVsQ29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBNb2RlbFN5bmNNZXRob2RzLFxuICAgIE1vZGVsU3luY1Jlc3VsdCxcbiAgICBNb2RlbERhdGFTeW5jT3B0aW9ucyxcbiAgICBNb2RlbEZldGNoT3B0aW9ucyxcbiAgICBNb2RlbFNhdmVPcHRpb25zLFxuICAgIE1vZGVsRGVzdHJveU9wdGlvbnMsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbmNvbnN0IF9kZWZpbmVBdHRyaWJ1dGVzID0gU3ltYm9sKCdkZWZpbmUnKTtcbmNvbnN0IF92YWxpZGF0ZSAgICAgICAgID0gU3ltYm9sKCd2YWxpZGF0ZScpO1xuY29uc3QgX2NoYW5nZUhhbmRsZXIgICAgPSBTeW1ib2woJ29uY2hhbmdlJyk7XG5jb25zdCBfYnJva2VyICAgICAgICAgICA9IFN5bWJvbCgnYnJva2VyJyk7XG5jb25zdCBfcHJvcGVydGllcyAgICAgICA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHk8VD4ge1xuICAgIGF0dHJzOiBPYnNlcnZhYmxlT2JqZWN0O1xuICAgIGJhc2VBdHRyczogVDtcbiAgICBwcmV2QXR0cnM6IFQ7XG4gICAgY2hhbmdlZEF0dHJzPzogUGFydGlhbDxUPjtcbiAgICByZWFkb25seSBpZEF0dHJpYnV0ZTogc3RyaW5nO1xuICAgIHJlYWRvbmx5IGNpZDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBlbiBWYWxpZCBhdHRyaWJ1dGVzIHJlc3VsdC5cbiAqIEBqYSDlsZ7mgKfmpJzoqLzjga7mnInlirnlgKRcbiAqL1xuZXhwb3J0IGNvbnN0IFJFU1VMVF9WQUxJRF9BVFRSUyA9IE9iamVjdC5mcmVlemUobWFrZVJlc3VsdChSRVNVTFRfQ09ERS5TVUNDRVNTLCAndmFsaWQgYXR0cmlidXRlLicpKTtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNhdmUoKSAqL1xuZnVuY3Rpb24gcGFyc2VTYXZlQXJnczxBIGV4dGVuZHMgb2JqZWN0PiguLi5hcmdzOiBhbnlbXSk6IHsgYXR0cnM/OiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+OyBvcHRpb25zPzogTW9kZWxTYXZlT3B0aW9uczsgfSB7XG4gICAgbGV0IFtrZXksIHZhbHVlLCBvcHRpb25zXSA9IGFyZ3M7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgcHJlZmVyLWNvbnN0XG4gICAgbGV0IGF0dHJzOiBhbnk7XG5cbiAgICBpZiAobnVsbCA9PSBrZXkgfHwgaXNPYmplY3Qoa2V5KSkge1xuICAgICAgICBhdHRycyA9IGtleTtcbiAgICAgICAgb3B0aW9ucyA9IHZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIChhdHRycyA9IHt9KVtrZXldID0gdmFsdWU7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5kYXRhKSB7XG4gICAgICAgIGF0dHJzID0gT2JqZWN0LmFzc2lnbihhdHRycyB8fCB7fSwgb3B0aW9ucy5kYXRhKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBhdHRycywgb3B0aW9ucyB9O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gW1tNb2RlbF1dIGJhc2UgY2xhc3MgZGVmaW5pdGlvbi5cbiAqIEBqYSBbW01vZGVsXV0g44Gu5Z+65bqV44Kv44Op44K55a6a576pXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBNb2RlbEJhc2UsIE1vZGVsQ29uc3RydWN0b3IgfSBmcm9tICdAY2RwL21vZGVsJztcbiAqXG4gKiBpbnRlcmZhY2UgQ29udGVudEF0dHJpYnV0ZSB7XG4gKiAgIHVyaTogc3RyaW5nO1xuICogICByZWFkb25seSBzaXplOiBudW1iZXI7XG4gKiAgIGNvb2tpZT86IHN0cmluZztcbiAqIH1cbiAqIGBgYFxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogLy8gZWFybHkgY2FzdFxuICogY29uc3QgTW9kZWwgPSBNb2RlbEJhc2UgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbEJhc2U8Q29udGVudEF0dHJpYnV0ZT4sIENvbnRlbnRBdHRyaWJ1dGU+O1xuICpcbiAqIGNsYXNzIENvbnRlbnQgZXh0ZW5kcyBNb2RlbCB7XG4gKiAgIGNvbnN0cnVjdG9yKGF0dHJzOiBDb250ZW50QXR0cmlidXRlKSB7XG4gKiAgICAgc3VwZXIoYXR0cnMpO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBvclxuICpcbiAqIGBgYHRzXG4gKiAvLyBsYXRlIGNhc3RcbiAqIGNsYXNzIENvbnRlbnRCYXNlIGV4dGVuZHMgTW9kZWxCYXNlPENvbnRlbnRBdHRyaWJ1dGU+IHtcbiAqICAgY29uc3RydWN0b3IoYXR0cnM6IENvbnRlbnRBdHRyaWJ1dGUpIHtcbiAqICAgICBzdXBlcihhdHRycyk7XG4gKiAgIH1cbiAqIH1cbiAqIGNvbnN0IENvbnRlbnQgPSBDb250ZW50QmFzZSBhcyBNb2RlbENvbnN0cnVjdG9yPENvbnRlbnQsIENvbnRlbnRBdHRyaWJ1dGU+O1xuICogYGBgXG4gKiB0aGVuXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGNvbnRlbnQgPSBuZXcgQ29udGVudCh7XG4gKiAgIHVyaTogJ2FhYS50eHQnLFxuICogICBzaXplOiAxMCxcbiAqICAgY29va2llOiB1bmRlZmluZWQsIC8vIG5lZWQgZXhwbGljaXQgYXNzaWduXG4gKiB9KTtcbiAqXG4gKiBjb25zb2xlLmxvZyhjb250ZW50LnVyaSk7ICAgIC8vICdhYWEudHh0J1xuICogY29uc29sZS5sb2coY29udGVudC5zaXplKTsgICAvLyAnMTAnXG4gKiBjb25zb2xlLmxvZyhjb250ZW50LmNvb2tpZSk7IC8vICd1bmRlZmluZWQnXG4gKiBgYGBcbiAqXG4gKiAtIFVzaW5nIEN1c3RvbSBFdmVudFxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBNb2RlbEV2ZW50IH0gZnJvbSAnQGNkcC9tb2RlbCc7XG4gKlxuICogaW50ZXJmYWNlIEN1c3RvbUV2ZW50IGV4dGVuZHMgTW9kZWxFdmVudDxDb250ZW50QXR0cmlidXRlPiB7XG4gKiAgIGZpcmU6IFtib29sZWFuLCBudW1iZXJdO1xuICogfVxuICogXG4gKiA6XG4gKlxuICogLy8gZWFybHkgY2FzdFxuICogY29uc3QgTW9kZWwgPSBNb2RlbEJhc2UgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbEJhc2U8Q29udGVudEF0dHJpYnV0ZSwgQ3VzdG9tRXZlbnQ+LCBDb250ZW50QXR0cmlidXRlPjtcbiAqIGNsYXNzIENvbnRlbnQgZXh0ZW5kcyBNb2RlbCB7XG4gKiAgIDpcbiAqIH1cbiAqXG4gKiAvLyBsYXRlIGNhc3RcbiAqIGNsYXNzIENvbnRlbnRCYXNlIGV4dGVuZHMgTW9kZWxCYXNlPENvbnRlbnRBdHRyaWJ1dGUsIEN1c3RvbUV2ZW50PiB7XG4gKiAgIDpcbiAqIH1cbiAqIGNvbnN0IENvbnRlbnQgPSBDb250ZW50QmFzZSBhcyBNb2RlbENvbnN0cnVjdG9yPENvbnRlbnQsIENvbnRlbnRBdHRyaWJ1dGU+O1xuICpcbiAqIGNvbnN0IGNvbnRlbnQgPSBuZXcgQ29udGVudCh7IC4uLiB9KTtcbiAqIGNvbnRlbnQudHJpZ2dlcignZmlyZScsIHRydWUsIDEwMCk7XG4gKiBgYGBcbiAqL1xuYWJzdHJhY3QgY2xhc3MgTW9kZWw8VCBleHRlbmRzIG9iamVjdCA9IG9iamVjdCwgRXZlbnQgZXh0ZW5kcyBNb2RlbEV2ZW50PFQ+ID0gTW9kZWxFdmVudDxUPj4gZXh0ZW5kcyBFdmVudFJldmNlaXZlciBpbXBsZW1lbnRzIEV2ZW50U291cmNlPEV2ZW50PiB7XG4gICAgLyoqXG4gICAgICogQGVuIEF0dHJpYnV0ZXMgcG9vbFxuICAgICAqIEBqYSDlsZ7mgKfmoLzntI3poJjln59cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXTogUHJvcGVydHk8VD47XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgYXR0cmlidXRlIHZhbHVlc1xuICAgICAqICAtIGBqYWAg5bGe5oCn44Gu5Yid5pyf5YCk44KS5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlczogUmVxdWlyZWQ8VD4sIG9wdGlvbnM/OiBNb2RlbENvbnN0cnVjdGlvbk9wdGlvbnM8VD4pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBpZEF0dHJpYnV0ZTogJ2lkJyB9LCBvcHRpb25zKTtcbiAgICAgICAgY29uc3QgYXR0cnMgPSBvcHRzLnBhcnNlID8gdGhpcy5wYXJzZShhdHRyaWJ1dGVzLCBvcHRzKSBhcyBUIDogYXR0cmlidXRlcztcbiAgICAgICAgY29uc3QgcHJvcHM6IFByb3BlcnR5PFQ+ID0ge1xuICAgICAgICAgICAgYXR0cnM6IE9ic2VydmFibGVPYmplY3QuZnJvbShhdHRycyksXG4gICAgICAgICAgICBiYXNlQXR0cnM6IHsgLi4uYXR0cnMgfSxcbiAgICAgICAgICAgIHByZXZBdHRyczogeyAuLi5hdHRycyB9LFxuICAgICAgICAgICAgaWRBdHRyaWJ1dGU6IG9wdHMuaWRBdHRyaWJ1dGUsXG4gICAgICAgICAgICBjaWQ6IGx1aWQoJ21vZGVsOicsIDgpLFxuICAgICAgICB9O1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgX3Byb3BlcnRpZXMsIHsgdmFsdWU6IHByb3BzIH0pO1xuXG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGF0dHJzKSkge1xuICAgICAgICAgICAgdGhpc1tfZGVmaW5lQXR0cmlidXRlc10odGhpcywga2V5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXNbX2NoYW5nZUhhbmRsZXJdID0gKCkgPT4ge1xuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BjaGFuZ2UnLCB0aGlzIGFzIE1vZGVsKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzW192YWxpZGF0ZV0oe30sIG9wdHMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgYXR0cmlidXRlIGJyaWRnZSBkZWYgKi9cbiAgICBwcml2YXRlIFtfZGVmaW5lQXR0cmlidXRlc10oaW5zdGFuY2U6IG9iamVjdCwgbmFtZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHByb3RvID0gaW5zdGFuY2UuY29uc3RydWN0b3IucHJvdG90eXBlO1xuICAgICAgICBpZiAoIShuYW1lIGluIHByb3RvKSkge1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCBuYW1lLCB7XG4gICAgICAgICAgICAgICAgZ2V0KCk6IHVua25vd24ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fYXR0cnNbbmFtZV07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzZXQodmFsOiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZGVlcEVxdWFsKHRoaXMuX2F0dHJzW25hbWVdLCB2YWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpc1tfcHJvcGVydGllc10uY2hhbmdlZEF0dHJzO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcHJldkF0dHJzW25hbWVdID0gdGhpcy5fYXR0cnNbbmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hdHRyc1tuYW1lXSAgICAgPSB2YWw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogcHVibGljIHByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29udGVudCBJRC5cbiAgICAgKiBAamEg44Kz44Oz44OG44Oz44OEIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCB7IGlkQXR0cmlidXRlLCBjaWQsIGF0dHJzIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIChpZEF0dHJpYnV0ZSBpbiBhdHRycykgPyBhdHRyc1tpZEF0dHJpYnV0ZV0gOiBjaWQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IHByb3RlY3RlZCBwcm9wZXJ0aWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDlsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9hdHRycygpOiBPYnNlcnZhYmxlT2JqZWN0IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmF0dHJzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWZhdWx0IGF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5pei5a6a5YCk5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfYmFzZUF0dHJzKCk6IFQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uYmFzZUF0dHJzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBQcmV2aW91cyBhdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWkieabtOWJjeOBruWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3ByZXZBdHRycygpOiBUIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnByZXZBdHRycztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hhbmdlZCBhdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWkieabtOOBruOBguOBo+OBn+WxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2NoYW5nZWRBdHRycygpOiBQYXJ0aWFsPFQ+IHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpc1tfcHJvcGVydGllc10uY2hhbmdlZEF0dHJzKSB7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnMgPSBkaWZmKHRoaXMuX2Jhc2VBdHRycywgdGhpcy5fYXR0cnMgYXMgdW5rbm93biBhcyBQYXJ0aWFsPFQ+KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY2hhbmdlZEF0dHJzIGFzIFBhcnRpYWw8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBpbnRlcm5hbCBjb250ZW50IElELlxuICAgICAqIEBqYSDlhoXpg6jjga7jgrPjg7Pjg4bjg7Pjg4QgSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY2lkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jaWQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogZXZlbnRzXG5cbiAgICAvKiogQGludGVybmFsIGJyb2tlciBhY2Nlc3MgKi9cbiAgICBwcml2YXRlIGdldCBbX2Jyb2tlcl0oKTogRXZlbnRCcm9rZXI8YW55PiB7XG4gICAgICAgIHJldHVybiAodGhpcy5fYXR0cnMgYXMgSU9ic2VydmFibGUgYXMgSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2VzcykuZ2V0QnJva2VyKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHdoZXRoZXIgdGhpcyBvYmplY3QgaGFzIGNsaWVudHMuXG4gICAgICogQGphIOOCr+ODqeOCpOOCouODs+ODiOOBjOWtmOWcqOOBmeOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgaGFzTGlzdGVuZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsPzogQ2hhbm5lbCwgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfYnJva2VyXS5oYXNMaXN0ZW5lcihjaGFubmVsLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgcmVnaXN0ZXJlZCBjaGFubmVsIGtleXMuXG4gICAgICogQGphIOeZu+mMsuOBleOCjOOBpuOBhOOCi+ODgeODo+ODjeODq+OCreODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNoYW5uZWxzKCk6IChrZXlvZiBFdmVudClbXSB7XG4gICAgICAgIHJldHVybiB0aGlzW19icm9rZXJdLmNoYW5uZWxzKCkgYXMgKGtleW9mIEV2ZW50KVtdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBOb3RpZnkgZXZlbnQgdG8gY2xpZW50cy5cbiAgICAgKiBAamEgZXZlbnQg55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgYXJndW1lbnRzIGZvciBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWw44Gr5rih44GZ5byV5pWwXG4gICAgICovXG4gICAgcHVibGljIHRyaWdnZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsLCAuLi5hcmdzOiBBcmd1bWVudHM8UGFydGlhbDxFdmVudFtDaGFubmVsXT4+KTogdm9pZCB7XG4gICAgICAgICh0aGlzW19icm9rZXJdIGFzIGFueSkudHJpZ2dlcihjaGFubmVsLCAuLi5hcmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm6Kej6ZmkXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbD86IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYXR0cnMub2ZmKGNoYW5uZWwgYXMgYW55LCBsaXN0ZW5lciBhcyBhbnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBvbjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGlmICgnQGNoYW5nZScgPT09IGNoYW5uZWwgfHwgKGlzQXJyYXkoY2hhbm5lbCkgJiYgY2hhbm5lbC5pbmNsdWRlcygnQGNoYW5nZScgYXMgQ2hhbm5lbCkpKSB7XG4gICAgICAgICAgICB0aGlzLl9hdHRycy5vbignQCcsIHRoaXNbX2NoYW5nZUhhbmRsZXJdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fYXR0cnMub24oY2hhbm5lbCBhcyBhbnksIGxpc3RlbmVyIGFzIGFueSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKSBidXQgaXQgY2F1c2VzIHRoZSBib3VuZCBjYWxsYmFjayB0byBvbmx5IGZpcmUgb25jZSBiZWZvcmUgYmVpbmcgcmVtb3ZlZC5cbiAgICAgKiBAamEg5LiA5bqm44Gg44GR44OP44Oz44OJ44Oq44Oz44Kw5Y+v6IO944Gq44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIG9uY2U8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5vbihjaGFubmVsLCBsaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IG1hbmFnZWQgPSB0aGlzLm9uKGNoYW5uZWwsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnRleHQudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIG1hbmFnZWQudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjb250ZXh0O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IHZhbGlkYXRpb25cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB2YWxpZCBvciBub3QuXG4gICAgICogQGphIOaknOiovOOBruaIkOWQpuOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpc1ZhbGlkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gU1VDQ0VFREVEKHRoaXMudmFsaWRhdGUoeyBzaWxlbnQ6IHRydWUgfSkuY29kZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFZhbGlkYXRlIHJlc3VsdCBhY2Nlc3Nlci5cbiAgICAgKiBAamEg5qSc6Ki857WQ5p6c44Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcHVibGljIHZhbGlkYXRlKG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFJlc3VsdCB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgdmFsaWRhdGU6IHRydWUsIG5vVGhyb3c6IHRydWUsIGV4dGVuZDogZmFsc2UgfSwgb3B0aW9ucyk7XG4gICAgICAgIHJldHVybiB0aGlzW192YWxpZGF0ZV0oe30sIG9wdHMpO1xuICAgIH1cblxuICAgIC8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyAqL1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZhbGlkYXRlIGRhdGEgbWV0aG9kLlxuICAgICAqIEBqYSDjg4fjg7zjgr/mpJzoqLxcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIHZhbGlkYXRlZSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGphYCDooqvmpJzoqLzlsZ7mgKdcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgdmFsaWRhdGUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5qSc6Ki844Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHZhbGlkYXRlQXR0cmlidXRlczxBIGV4dGVuZHMgVD4oYXR0cmlidXRlczogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPiwgb3B0aW9ucz86IE1vZGVsVmFsaWRhdGVBdHRyaWJ1dGVPcHRpb25zKTogUmVzdWx0IHtcbiAgICAgICAgcmV0dXJuIFJFU1VMVF9WQUxJRF9BVFRSUztcbiAgICB9XG5cbiAgICAvKiBlc2xpbnQtZW5hYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyAqL1xuXG4gICAgLyoqIEBpbnRlcm5hbCB2YWxpZGF0ZSAqL1xuICAgIHByaXZhdGUgW192YWxpZGF0ZV08QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4sIG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiBSZXN1bHQgfCBuZXZlciB7XG4gICAgICAgIGNvbnN0IHsgdmFsaWRhdGUsIHNpbGVudCwgbm9UaHJvdyB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgaWYgKHZhbGlkYXRlKSB7XG4gICAgICAgICAgICBjb25zdCBhdHRycyA9IHsgLi4udGhpcy5fYXR0cnMsIC4uLmF0dHJpYnV0ZXMgfTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMudmFsaWRhdGVBdHRyaWJ1dGVzKGF0dHJzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChGQUlMRUQocmVzdWx0LmNvZGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BpbnZhbGlkJywgdGhpcyBhcyBNb2RlbCwgYXR0cnMsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghbm9UaHJvdykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBSRVNVTFRfVkFMSURfQVRUUlM7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBhdHRyaWJ1dGVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIFtbTW9kZWxdXSBoYXMgdmFsaWQgcHJvcGVydHkuIChub3QgYG51bGxgIG9yIGB1bmRlZmluZWRgKVxuICAgICAqIEBqYSBbW01vZGVsXV0g44GM5pyJ5Yq544Gq44OX44Ot44OR44OG44Kj44KS5oyB44Gj44Gm44GE44KL44GL56K66KqNIChgbnVsbGAg44G+44Gf44GvIGB1bmRlZmluZWRgIOOBp+OBquOBhClcbiAgICAgKi9cbiAgICBwdWJsaWMgaGFzKGF0dHJpYnV0ZToga2V5b2YgVCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSAodGhpcy5fYXR0cnMgYXMgdW5rbm93biBhcyBUKVthdHRyaWJ1dGVdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIEhUTUwtZXNjYXBlZCB2YWx1ZSBvZiBhbiBhdHRyaWJ1dGUuXG4gICAgICogQGphIEhUTUwg44Gn5L2/55So44GZ44KL5paH5a2X44KS5Yi25b6h5paH5a2X44Gr572u5o+b44GX44Gf5bGe5oCn5YCk44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGVzY2FwZShhdHRyaWJ1dGU6IGtleW9mIFQpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gZXNjYXBlSFRNTCgodGhpcy5fYXR0cnMgYXMgYW55KVthdHRyaWJ1dGVdKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGF0dHJpYnV0ZXMgZm9yIGJhdGNoIGlucHV0IHdpdGggb3B0aW9ucy5cbiAgICAgKiBAamEg5bGe5oCn44Gu5LiA5ous6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgdXBkYXRlIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgamFgIOabtOaWsOWxnuaAp1xuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzZXQgYXR0cmlidXRlcyBvcHRpb25zXG4gICAgICogIC0gYGphYCDlsZ7mgKfmm7TmlrDnlKjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0QXR0cmlidXRlczxBIGV4dGVuZHMgVD4oYXR0cmlidXRlczogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPiwgb3B0aW9ucz86IE1vZGVsU2V0T3B0aW9ucyk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHNpbGVudCwgZXh0ZW5kIH0gPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYXR0cnMuc3VzcGVuZCh0cnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpc1tfdmFsaWRhdGVdKGF0dHJpYnV0ZXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKEZBSUxFRChyZXN1bHQuY29kZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIE9iamVjdC5rZXlzKGF0dHJpYnV0ZXMpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGF0dHIgaW4gdGhpcy5fYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYXR0cnNbYXR0cl0gPSBhdHRyaWJ1dGVzW2F0dHJdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXh0ZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX2RlZmluZUF0dHJpYnV0ZXNdKHRoaXMsIGF0dHIpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9hdHRyc1thdHRyXSA9IGF0dHJpYnV0ZXNbYXR0cl07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgaWYgKHNpbGVudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzLnJlc3VtZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGFsbCBhdHRyaWJ1dGVzIG9uIHRoZSBbW01vZGVsXV0uIChzZXQgYHVuZGVmaW5lZGApXG4gICAgICogQGphIFtbTW9kZWxdXSDjgYvjgonjgZnjgbnjgabjga7lsZ7mgKfjgpLliYrpmaQgKGB1bmRlZmluZWRgIOOCkuioreWumilcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xlYXIob3B0aW9ucz86IE1vZGVsU2V0T3B0aW9ucyk6IHRoaXMge1xuICAgICAgICBjb25zdCBjbGVhckF0dHJzID0ge307XG4gICAgICAgIGZvciAoY29uc3QgYXR0ciBvZiBPYmplY3Qua2V5cyh0aGlzLl9iYXNlQXR0cnMpKSB7XG4gICAgICAgICAgICBjbGVhckF0dHJzW2F0dHJdID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnNldEF0dHJpYnV0ZXMoY2xlYXJBdHRycywgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBhIGNvcHkgb2YgdGhlIG1vZGVsJ3MgYGF0dHJpYnV0ZXNgIG9iamVjdC5cbiAgICAgKiBAamEg44Oi44OH44Or5bGe5oCn5YCk44Gu44Kz44OU44O844KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHRvSlNPTigpOiBUIHtcbiAgICAgICAgcmV0dXJuIGRlZXBDb3B5KHsgLi4udGhpcy5fYXR0cnMgfSBhcyBUKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgY2hhbmdlZCBhdHRyaWJ1dGVzLlxuICAgICAqIEBqYSDlpInmm7TjgZXjgozjgZ/lsZ7mgKflgKTjgpLmjIHjgaTjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVcbiAgICAgKiAgLSBgZW5gIGNoZWNrZWQgYXR0cmlidXRlXG4gICAgICogIC0gYGphYCDmpJzoqLzjgZnjgovlsZ7mgKdcbiAgICAgKi9cbiAgICBwdWJsaWMgaGFzQ2hhbmdlZChhdHRyaWJ1dGU/OiBrZXlvZiBUKTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChudWxsID09IGF0dHJpYnV0ZSkge1xuICAgICAgICAgICAgcmV0dXJuICFpc0VtcHR5T2JqZWN0KHRoaXMuX2NoYW5nZWRBdHRycyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYXR0cmlidXRlIGluIHRoaXMuX2NoYW5nZWRBdHRycztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYW4gb2JqZWN0IGNvbnRhaW5pbmcgYWxsIHRoZSBhdHRyaWJ1dGVzIHRoYXQgaGF2ZSBjaGFuZ2VkLCBvciBgdW5kZWZpbmVkYCBpZiB0aGVyZSBhcmUgbm8gY2hhbmdlZCBhdHRyaWJ1dGVzLlxuICAgICAqIEBqYSDlhaXlipvjgZfjgZ8gYXR0cmlidXRlcyDlgKTjga7lt67liIbjgavlr77jgZfjgablpInmm7TjgYzjgYLjgovlsZ7mgKflgKTjgpLov5TljbQuIOW3ruWIhuOBjOOBquOBhOWgtOWQiOOBryBgdW5kZWZpZW5kYCDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCBjaGVja2VkIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgamFgIOaknOiovOOBmeOCi+WxnuaAp1xuICAgICAqL1xuICAgIHB1YmxpYyBjaGFuZ2VkKGF0dHJpYnV0ZXM/OiBQYXJ0aWFsPFQ+KTogUGFydGlhbDxUPiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICghYXR0cmlidXRlcykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFzQ2hhbmdlZCgpID8geyAuLi50aGlzLl9jaGFuZ2VkQXR0cnMgfSA6IHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZWQgPSBkaWZmKHRoaXMuX2F0dHJzLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIHJldHVybiAhaXNFbXB0eU9iamVjdChjaGFuZ2VkKSA/IGNoYW5nZWQgOiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBwcmV2aW91cyB2YWx1ZSBvZiBhbiBhdHRyaWJ1dGUsIHJlY29yZGVkIGF0IHRoZSB0aW1lIHRoZSBsYXN0IGBAY2hhbmdlYCBldmVudCB3YXMgZmlyZWQuXG4gICAgICogQGphIGBAY2hhbmdlYCDjgYznmbrngavjgZXjgozjgZ/liY3jga7lsZ7mgKflgKTjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJldmlvdXM8SyBleHRlbmRzIGtleW9mIFQ+KGF0dHJpYnV0ZTogSyk6IFRbS10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcHJldkF0dHJzW2F0dHJpYnV0ZV07XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogc3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGEgW1tNb2RlbF1dIGlzIG5ldyBpZiBpdCBoYXMgbmV2ZXIgYmVlbiBzYXZlZCB0byB0aGUgc2VydmVyLCBhbmQgbGFja3MgYW4gaWQuXG4gICAgICogQGphIFtbTW9kZWxdXSDjgYzjgb7jgaDjgrXjg7zjg5Djg7zjgavlrZjlnKjjgZfjgarjgYTjgYvjg4Hjgqfjg4Pjgq8uIOaXouWumuOBp+OBryBgaWRBdHRyaWJ1dGVgIOOBruacieeEoeOBp+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBpc05ldygpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgeyBpZEF0dHJpYnV0ZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiAhdGhpcy5oYXMoaWRBdHRyaWJ1dGUgYXMga2V5b2YgVCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENvbnZlcnRzIGEgcmVzcG9uc2UgaW50byB0aGUgaGFzaCBvZiBhdHRyaWJ1dGVzIHRvIGJlIGBzZXRgIG9uIHRoZSBtb2RlbC4gVGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gaXMganVzdCB0byBwYXNzIHRoZSByZXNwb25zZSBhbG9uZy5cbiAgICAgKiBAamEg44Os44K544Od44Oz44K544Gu5aSJ5o+b44Oh44K944OD44OJLiDml6Llrprjgafjga/kvZXjgoLjgZfjgarjgYRcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgcGFyc2UocmVzcG9uc2U6IFBsYWluT2JqZWN0IHwgdm9pZCwgb3B0aW9ucz86IE1vZGVsU2V0T3B0aW9ucyk6IFQgfCB2b2lkIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlIGFzIFQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFByb3h5IFtbSURhdGFTeW5jI3N5bmNdXSBieSBkZWZhdWx0IC0tIGJ1dCBvdmVycmlkZSB0aGlzIGlmIHlvdSBuZWVkIGN1c3RvbSBzeW5jaW5nIHNlbWFudGljcyBmb3IgKnRoaXMqIHBhcnRpY3VsYXIgbW9kZWwuXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacny4g5b+F6KaB44Gr5b+c44GY44Gm44Kq44O844OQ44O844Op44Kk44OJ5Y+v6IO9LlxuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBzeW5jPEsgZXh0ZW5kcyBNb2RlbFN5bmNNZXRob2RzPihtZXRob2Q6IEssIGNvbnRleHQ6IE1vZGVsPFQ+LCBvcHRpb25zPzogTW9kZWxEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPE1vZGVsU3luY1Jlc3VsdDxLLCBUPj4ge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFN5bmMoKS5zeW5jKG1ldGhvZCwgY29udGV4dCBhcyBTeW5jQ29udGV4dDxUPiwgb3B0aW9ucykgYXMgdW5rbm93biBhcyBQcm9taXNlPE1vZGVsU3luY1Jlc3VsdDxLLCBUPj47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZldGNoIHRoZSBbW01vZGVsXV0gZnJvbSB0aGUgc2VydmVyLCBtZXJnaW5nIHRoZSByZXNwb25zZSB3aXRoIHRoZSBtb2RlbCdzIGxvY2FsIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIFtbTW9kZWxdXSDlsZ7mgKfjga7jgrXjg7zjg5Djg7zlkIzmnJ8uIOODrOOCueODneODs+OCueOBruODnuODvOOCuOOCkuWun+ihjFxuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBmZXRjaChvcHRpb25zPzogTW9kZWxGZXRjaE9wdGlvbnMpOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBwYXJzZTogdHJ1ZSB9LCBvcHRpb25zKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzcCA9IGF3YWl0IHRoaXMuc3luYygncmVhZCcsIHRoaXMgYXMgTW9kZWw8VD4sIG9wdHMpO1xuICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGVzKG9wdHMucGFyc2UgPyB0aGlzLnBhcnNlKHJlc3AsIG9wdGlvbnMpIGFzIFQgOiByZXNwLCBvcHRzKTtcbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAc3luYycsIHRoaXMgYXMgTW9kZWwsIHJlc3AsIG9wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAZXJyb3InLCB0aGlzIGFzIE1vZGVsLCBlLCBvcHRzKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IGEgaGFzaCBvZiBbW01vZGVsXV0gYXR0cmlidXRlcywgYW5kIHN5bmMgdGhlIG1vZGVsIHRvIHRoZSBzZXJ2ZXIuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIHNlcnZlciByZXR1cm5zIGFuIGF0dHJpYnV0ZXMgaGFzaCB0aGF0IGRpZmZlcnMsIHRoZSBtb2RlbCdzIHN0YXRlIHdpbGwgYmUgYHNldGAgYWdhaW4uXG4gICAgICogQGphIFtbTW9kZWxdXSDlsZ7mgKfjgpLjgrXjg7zjg5Djg7zjgavkv53lrZguIDxicj5cbiAgICAgKiAgICAg55Ww44Gq44KL5bGe5oCn44GM6L+U5Y2044GV44KM44KL5aC05ZCI44Gv5YaN6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCB1cGRhdGUgYXR0cmlidXRlIGtleVxuICAgICAqICAtIGBqYWAg5pu05paw5bGe5oCn44Kt44O8XG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB1cGRhdGUgYXR0cmlidXRlIHZhbHVlXG4gICAgICogIC0gYGphYCDmm7TmlrDlsZ7mgKflgKRcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2F2ZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDkv53lrZjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgc2F2ZTxLIGV4dGVuZHMga2V5b2YgVD4oa2V5Pzoga2V5b2YgVCwgdmFsdWU/OiBUW0tdLCBvcHRpb25zPzogTW9kZWxTYXZlT3B0aW9ucyk6IFByb21pc2U8UGxhaW5PYmplY3QgfCB2b2lkPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgYSBoYXNoIG9mIFtbTW9kZWxdXSBhdHRyaWJ1dGVzLCBhbmQgc3luYyB0aGUgbW9kZWwgdG8gdGhlIHNlcnZlci4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgc2VydmVyIHJldHVybnMgYW4gYXR0cmlidXRlcyBoYXNoIHRoYXQgZGlmZmVycywgdGhlIG1vZGVsJ3Mgc3RhdGUgd2lsbCBiZSBgc2V0YCBhZ2Fpbi5cbiAgICAgKiBAamEgW1tNb2RlbF1dIOWxnuaAp+OCkuOCteODvOODkOODvOOBq+S/neWtmC4gPGJyPlxuICAgICAqICAgICDnlbDjgarjgovlsZ7mgKfjgYzov5TljbTjgZXjgozjgovloLTlkIjjga/lho3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCB1cGRhdGUgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg5pu05paw5bGe5oCnXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNhdmUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5L+d5a2Y44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIHNhdmU8QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4gfCBOaWwsIG9wdGlvbnM/OiBNb2RlbFNhdmVPcHRpb25zKTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IHZvaWQ+O1xuXG4gICAgcHVibGljIGFzeW5jIHNhdmUoLi4uYXJnczogdW5rbm93bltdKTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBhdHRycywgb3B0aW9ucyB9ID0gcGFyc2VTYXZlQXJncyguLi5hcmdzKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyB2YWxpZGF0ZTogdHJ1ZSwgcGFyc2U6IHRydWUsIHdhaXQ6IHRydWUgfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgd2FpdCB9ID0gb3B0cztcblxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gdGhpcy5pc05ldygpID8gJ2NyZWF0ZScgOiBvcHRzLnBhdGNoID8gJ3BhdGNoJyA6ICd1cGRhdGUnO1xuXG4gICAgICAgICAgICBpZiAoYXR0cnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXdhaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGVzKGF0dHJzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uYmFzZUF0dHJzID0geyAuLi50aGlzLl9hdHRycyB9IGFzIFQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfdmFsaWRhdGVdKGF0dHJzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCdwYXRjaCcgPT09IG1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICBvcHRzLmRhdGEgPSBhdHRycztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvcHRzLmRhdGEgPSBPYmplY3QuYXNzaWduKHRoaXMudG9KU09OKCksIGF0dHJzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCB0aGlzLnN5bmMobWV0aG9kLCB0aGlzIGFzIE1vZGVsPFQ+LCBvcHRzKTtcblxuICAgICAgICAgICAgbGV0IHNlcnZlckF0dHJzID0gb3B0cy5wYXJzZSA/IHRoaXMucGFyc2UocmVzcCwgb3B0cykgOiByZXNwO1xuICAgICAgICAgICAgaWYgKGF0dHJzICYmIHdhaXQpIHtcbiAgICAgICAgICAgICAgICBzZXJ2ZXJBdHRycyA9IE9iamVjdC5hc3NpZ24oe30sIGF0dHJzLCBzZXJ2ZXJBdHRycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXNPYmplY3Qoc2VydmVyQXR0cnMpICYmICFpc0VtcHR5T2JqZWN0KHNlcnZlckF0dHJzKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlcyhzZXJ2ZXJBdHRycyBhcyBULCBvcHRzKTtcbiAgICAgICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5iYXNlQXR0cnMgPSB7IC4uLnRoaXMuX2F0dHJzIH0gYXMgVDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BzeW5jJywgdGhpcyBhcyBNb2RlbCwgcmVzcCBhcyBQbGFpbk9iamVjdCwgb3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BlcnJvcicsIHRoaXMgYXMgTW9kZWwsIGUsIG9wdHMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXN0cm95IHRoaXMgW1tNb2RlbF1dIG9uIHRoZSBzZXJ2ZXIgaWYgaXQgd2FzIGFscmVhZHkgcGVyc2lzdGVkLlxuICAgICAqIEBqYSBbW01vZGVsXV0g44KS44K144O844OQ44O844GL44KJ5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgZGVzdHJveSBvcHRpb25zXG4gICAgICogIC0gYGphYCDnoLTmo4Tjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgZGVzdHJveShvcHRpb25zPzogTW9kZWxEZXN0cm95T3B0aW9ucyk6IFByb21pc2U8UGxhaW5PYmplY3QgfCB2b2lkPiB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgd2FpdDogdHJ1ZSB9LCBvcHRpb25zKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyB3YWl0LCBjYW5jZWwgfSA9IG9wdHM7XG4gICAgICAgICAgICBjb25zdCBleGlzdHMgPSAhdGhpcy5pc05ldygpO1xuICAgICAgICAgICAgY29uc3QgZGVzdHJ1Y3QgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BkZXN0cm95JywgdGhpcyBhcyBNb2RlbCwgb3B0cyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAhd2FpdCAmJiBkZXN0cnVjdCgpO1xuXG4gICAgICAgICAgICBsZXQgcmVzcDogUGxhaW5PYmplY3QgfCB2b2lkO1xuICAgICAgICAgICAgaWYgKCFleGlzdHMpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBjYyhjYW5jZWwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNwID0gYXdhaXQgdGhpcy5zeW5jKCdkZWxldGUnLCB0aGlzIGFzIE1vZGVsPFQ+LCBvcHRzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgd2FpdCAmJiBkZXN0cnVjdCgpO1xuICAgICAgICAgICAgZXhpc3RzICYmICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAc3luYycsIHRoaXMgYXMgTW9kZWwsIHJlc3AgYXMgUGxhaW5PYmplY3QsIG9wdHMpO1xuXG4gICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BlcnJvcicsIHRoaXMgYXMgTW9kZWwsIGUsIG9wdHMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IHsgTW9kZWwgYXMgTW9kZWxCYXNlIH07XG4iXSwibmFtZXMiOlsiY2MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBOzs7OztBQU1BLGdEQWNDO0FBZEQ7Ozs7O0lBVUk7SUFBQTtRQUNJLHNGQUFpRCxDQUFBO1FBQ2pELG9EQUF5QixZQUFBLGtCQUFrQixnQkFBdUIsaUJBQXdCLENBQUMsRUFBRSxlQUFlLENBQUMsNEJBQUEsQ0FBQTtLQUNoSCxJQUFBO0FBQ0wsQ0FBQzs7QUNwQkQ7OztBQW9EQSxNQUFNLGlCQUFpQixHQUFHLE1BQU0s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Q3pEO1lBRUEsSUFBYyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBYSxFQUFFLElBQW1CLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDM0UsT0FBTyxJQUFJLENBQUM7U0FDZjtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1AsSUFBYyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBYSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMxRCxNQUFNLENBQUMsQ0FBQztTQUNYO0tBQ0o7Ozs7Ozs7OztJQVVNLE1BQU0sT0FBTyxDQUFDLE9BQTZCO1FBQzlDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFcEQsSUFBSTtZQUNBLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDO1lBQzlCLE1BQU0sTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzdCLE1BQU0sUUFBUSxHQUFHO2dCQUNiLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDcEIsSUFBYyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsSUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQzVELENBQUM7WUFFRixDQUFDLElBQUksSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUVwQixJQUFJLElBQXdCLENBQUM7WUFDN0IsSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDVCxNQUFNQSxhQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDcEI7aUJBQU07Z0JBQ0gsSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQzthQUM1RDtZQUVELElBQUksSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNuQixNQUFNLElBQUssSUFBYyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBYSxFQUFFLElBQW1CLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFckYsT0FBTyxJQUFJLENBQUM7U0FDZjtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1AsSUFBYyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBYSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMxRCxNQUFNLENBQUMsQ0FBQztTQUNYO0tBQ0o7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9tb2RlbC8ifQ==
