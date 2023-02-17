/*!
 * @cdp/model 0.9.15
 *   generic model scheme
 */

import { setMixClassAttribute, luid, diff, deepEqual, assignValue, escapeHTML, deepCopy, isEmptyObject, isObject } from '@cdp/core-utils';
import { EventReceiver } from '@cdp/events';
import { checkCanceled } from '@cdp/promise';
import { ObservableObject } from '@cdp/observable';
import { makeResult, RESULT_CODE, SUCCEEDED, FAILED } from '@cdp/result';
import { defaultSync } from '@cdp/data-sync';

/* eslint-disable
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-unused-vars,
    @typescript-eslint/restrict-plus-operands,
 */
(function () {
    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
    (function () {
        RESULT_CODE[RESULT_CODE["MVC_MODEL_DECLARE"] = 9007199254740991] = "MVC_MODEL_DECLARE";
        RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_DATA"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 65 /* LOCAL_CODE_BASE.MODEL */ + 1, 'invalid data.')] = "ERROR_MVC_INVALID_DATA";
    })();
})();

/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */
/** @internal */ const _defineAttributes = Symbol('define');
/** @internal */ const _updateAttributes = Symbol('update');
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
        assignValue(attrs = {}, key, value);
    }
    if (options && options.data) {
        attrs = Object.assign(attrs || {}, options.data);
    }
    return { attrs, options };
}
//__________________________________________________________________________________________________//
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
class Model extends EventReceiver {
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
    [_properties];
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
            changeFired: false,
        };
        Object.defineProperty(this, _properties, { value: props });
        for (const key of Object.keys(attrs)) {
            this[_defineAttributes](this, key);
        }
        this[_changeHandler] = () => {
            this.trigger('@change', this);
            const { _prevAttrs, _attrs } = this;
            const changedKeys = Object.keys(diff(_prevAttrs, _attrs));
            for (const key of changedKeys) {
                this.trigger(`@change:${key}`, this, _attrs[key], _prevAttrs[key], key);
            }
            this[_properties].changeFired = true;
        };
        this[_validate]({}, opts);
    }
    /** @internal attribute update core */
    [_updateAttributes](name, val) {
        if (!deepEqual(this._attrs[name], val)) {
            const { attrs, changeFired } = this[_properties];
            if (changeFired) {
                this[_properties].changeFired = false;
                this[_properties].prevAttrs = { ...attrs };
            }
            delete this[_properties].changedAttrs;
            assignValue(this._prevAttrs, name, attrs[name]);
            assignValue(attrs, name, val);
        }
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
                    this[_updateAttributes](name, val);
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
        return (idAttr in attrs) ? attrs[idAttr] || cid : cid;
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
        return this[_properties].changedAttrs; // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
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
    /**
     * @en EventSource type resolver.
     * @ja EventSource 型解決用ヘルパーアクセッサ
     */
    get $() {
        return this;
    }
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
        return this[_broker].channels().filter(c => '@' !== c);
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
        this._attrs.on('@', this[_changeHandler]);
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
                    this[_updateAttributes](attr, attributes[attr]);
                }
                else if (extend) {
                    this[_defineAttributes](this, attr);
                    this[_updateAttributes](attr, attributes[attr]);
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
     * @ja Model 属性値のコピーを返却
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
        const opts = Object.assign({ validate: true, parse: true, wait: true, extend: true }, options);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwubWpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwiYmFzZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC1wbHVzLW9wZXJhbmRzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIE1PREVMID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgNSxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19NT0RFTF9ERUNMQVJFICAgICAgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX0RBVEEgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5NT0RFTCArIDEsICdpbnZhbGlkIGRhdGEuJyksXG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgTnVsbGlzaCxcbiAgICBVbmtub3duT2JqZWN0LFxuICAgIENvbnN0cnVjdG9yLFxuICAgIENsYXNzLFxuICAgIEFyZ3VtZW50cyxcbiAgICBpc09iamVjdCxcbiAgICBpc0VtcHR5T2JqZWN0LFxuICAgIGx1aWQsXG4gICAgZXNjYXBlSFRNTCxcbiAgICBhc3NpZ25WYWx1ZSxcbiAgICBkZWVwQ29weSxcbiAgICBkZWVwRXF1YWwsXG4gICAgZGlmZixcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgU3Vic2NyaXB0aW9uLFxuICAgIFNpbGVuY2VhYmxlLFxuICAgIEV2ZW50QnJva2VyLFxuICAgIEV2ZW50UmVjZWl2ZXIsXG4gICAgRXZlbnRTb3VyY2UsXG59IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IGNoZWNrQ2FuY2VsZWQgYXMgY2MgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHtcbiAgICBJT2JzZXJ2YWJsZSxcbiAgICBJT2JzZXJ2YWJsZUV2ZW50QnJva2VyQWNjZXNzLFxuICAgIE9ic2VydmFibGVPYmplY3QsXG59IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQge1xuICAgIFJFU1VMVF9DT0RFLFxuICAgIFJlc3VsdCxcbiAgICBtYWtlUmVzdWx0LFxuICAgIFNVQ0NFRURFRCxcbiAgICBGQUlMRUQsXG59IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IFN5bmNDb250ZXh0LCBkZWZhdWx0U3luYyB9IGZyb20gJ0BjZHAvZGF0YS1zeW5jJztcbmltcG9ydCB7XG4gICAgTW9kZWxTZWVkLFxuICAgIE1vZGVsRXZlbnQsXG4gICAgTW9kZWxWYWxpZGF0ZUF0dHJpYnV0ZU9wdGlvbnMsXG4gICAgTW9kZWxBdHRyaWJ1dGVJbnB1dCxcbiAgICBNb2RlbFNldE9wdGlvbnMsXG4gICAgTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIE1vZGVsU3luY01ldGhvZHMsXG4gICAgTW9kZWxTeW5jUmVzdWx0LFxuICAgIE1vZGVsRGF0YVN5bmNPcHRpb25zLFxuICAgIE1vZGVsRmV0Y2hPcHRpb25zLFxuICAgIE1vZGVsU2F2ZU9wdGlvbnMsXG4gICAgTW9kZWxEZXN0cm95T3B0aW9ucyxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfZGVmaW5lQXR0cmlidXRlcyA9IFN5bWJvbCgnZGVmaW5lJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF91cGRhdGVBdHRyaWJ1dGVzID0gU3ltYm9sKCd1cGRhdGUnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3ZhbGlkYXRlICAgICAgICAgPSBTeW1ib2woJ3ZhbGlkYXRlJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9jaGFuZ2VIYW5kbGVyICAgID0gU3ltYm9sKCdvbmNoYW5nZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYnJva2VyICAgICAgICAgICA9IFN5bWJvbCgnYnJva2VyJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzICAgICAgID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eTxUPiB7XG4gICAgYXR0cnM6IE9ic2VydmFibGVPYmplY3Q7XG4gICAgYmFzZUF0dHJzOiBUO1xuICAgIHByZXZBdHRyczogVDtcbiAgICBjaGFuZ2VkQXR0cnM/OiBQYXJ0aWFsPFQ+O1xuICAgIHJlYWRvbmx5IGNpZDogc3RyaW5nO1xuICAgIHJlYWRvbmx5IG9wdGlvbnM6IE1vZGVsU2V0T3B0aW9ucztcbiAgICBjaGFuZ2VGaXJlZDogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZW4gVmFsaWQgYXR0cmlidXRlcyByZXN1bHQuXG4gKiBAamEg5bGe5oCn5qSc6Ki844Gu5pyJ5Yq55YCkXG4gKi9cbmV4cG9ydCBjb25zdCBSRVNVTFRfVkFMSURfQVRUUlMgPSBPYmplY3QuZnJlZXplKG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuU1VDQ0VTUywgJ3ZhbGlkIGF0dHJpYnV0ZS4nKSk7XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzYXZlKCkgKi9cbmZ1bmN0aW9uIHBhcnNlU2F2ZUFyZ3M8QSBleHRlbmRzIG9iamVjdD4oLi4uYXJnczogYW55W10pOiB7IGF0dHJzPzogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPjsgb3B0aW9ucz86IE1vZGVsU2F2ZU9wdGlvbnM7IH0ge1xuICAgIGxldCBba2V5LCB2YWx1ZSwgb3B0aW9uc10gPSBhcmdzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIHByZWZlci1jb25zdFxuICAgIGxldCBhdHRyczogYW55O1xuXG4gICAgaWYgKG51bGwgPT0ga2V5IHx8IGlzT2JqZWN0KGtleSkpIHtcbiAgICAgICAgYXR0cnMgPSBrZXk7XG4gICAgICAgIG9wdGlvbnMgPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBhc3NpZ25WYWx1ZShhdHRycyA9IHt9LCBrZXksIHZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRhdGEpIHtcbiAgICAgICAgYXR0cnMgPSBPYmplY3QuYXNzaWduKGF0dHJzIHx8IHt9LCBvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIHJldHVybiB7IGF0dHJzLCBvcHRpb25zIH07XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gZm9yIG1vZGVsIHRoYXQgcHJvdmlkZXMgYSBiYXNpYyBzZXQgb2YgZnVuY3Rpb25hbGl0eSBmb3IgbWFuYWdpbmcgaW50ZXJhY3Rpb24uXG4gKiBAamEg44Kk44Oz44K/44Op44Kv44K344On44Oz44Gu44Gf44KB44Gu5Z+65pys5qmf6IO944KS5o+Q5L6b44GZ44KLIE1vZGVsIOOBruWfuuW6leOCr+ODqeOCueWumue+qVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgTW9kZWwsIE1vZGVsQ29uc3RydWN0b3IgfSBmcm9tICdAY2RwL21vZGVsJztcbiAqXG4gKiBpbnRlcmZhY2UgQ29udGVudEF0dHJpYnV0ZSB7XG4gKiAgIHVyaTogc3RyaW5nO1xuICogICByZWFkb25seSBzaXplOiBudW1iZXI7XG4gKiAgIGNvb2tpZT86IHN0cmluZztcbiAqIH1cbiAqIGBgYFxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogLy8gZWFybHkgY2FzdFxuICogY29uc3QgQ29udGVudEJhc2UgPSBNb2RlbCBhcyBNb2RlbENvbnN0cnVjdG9yPE1vZGVsPENvbnRlbnRBdHRyaWJ1dGU+LCBDb250ZW50QXR0cmlidXRlPjtcbiAqXG4gKiBjbGFzcyBDb250ZW50IGV4dGVuZHMgQ29udGVudEJhc2Uge1xuICogICBjb25zdHJ1Y3RvcihhdHRyczogQ29udGVudEF0dHJpYnV0ZSkge1xuICogICAgIHN1cGVyKGF0dHJzKTtcbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICogb3JcbiAqXG4gKiBgYGB0c1xuICogLy8gbGF0ZSBjYXN0XG4gKiBjbGFzcyBDb250ZW50Q2xhc3MgZXh0ZW5kcyBNb2RlbDxDb250ZW50QXR0cmlidXRlPiB7XG4gKiAgIGNvbnN0cnVjdG9yKGF0dHJzOiBDb250ZW50QXR0cmlidXRlKSB7XG4gKiAgICAgc3VwZXIoYXR0cnMpO1xuICogICB9XG4gKiB9XG4gKlxuICogY29uc3QgQ29udGVudCA9IENvbnRlbnRDbGFzcyBhcyBNb2RlbENvbnN0cnVjdG9yPENvbnRlbnRDbGFzcywgQ29udGVudEF0dHJpYnV0ZT47XG4gKiBgYGBcbiAqIHRoZW5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgY29udGVudCA9IG5ldyBDb250ZW50KHtcbiAqICAgdXJpOiAnYWFhLnR4dCcsXG4gKiAgIHNpemU6IDEwLFxuICogICBjb29raWU6IHVuZGVmaW5lZCwgLy8gbmVlZCBleHBsaWNpdCBhc3NpZ25cbiAqIH0pO1xuICpcbiAqIGNvbnNvbGUubG9nKGNvbnRlbnQudXJpKTsgICAgLy8gJ2FhYS50eHQnXG4gKiBjb25zb2xlLmxvZyhjb250ZW50LnNpemUpOyAgIC8vICcxMCdcbiAqIGNvbnNvbGUubG9nKGNvbnRlbnQuY29va2llKTsgLy8gJ3VuZGVmaW5lZCdcbiAqIGBgYFxuICpcbiAqIC0gVXNpbmcgQ3VzdG9tIFRFdmVudFxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBNb2RlbEV2ZW50IH0gZnJvbSAnQGNkcC9tb2RlbCc7XG4gKlxuICogaW50ZXJmYWNlIEN1c3RvbUV2ZW50IGV4dGVuZHMgTW9kZWxFdmVudDxDb250ZW50QXR0cmlidXRlPiB7XG4gKiAgIGZpcmU6IFtib29sZWFuLCBudW1iZXJdO1xuICogfVxuICogXG4gKiA6XG4gKlxuICogLy8gZWFybHkgY2FzdFxuICogY29uc3QgQ29udGVudEJhc2UgPSBNb2RlbCBhcyBNb2RlbENvbnN0cnVjdG9yPE1vZGVsPENvbnRlbnRBdHRyaWJ1dGUsIEN1c3RvbUV2ZW50PiwgQ29udGVudEF0dHJpYnV0ZT47XG4gKiBjbGFzcyBDb250ZW50IGV4dGVuZHMgQ29udGVudEJhc2Uge1xuICogICA6XG4gKiB9XG4gKlxuICogLy8gbGF0ZSBjYXN0XG4gKiBjbGFzcyBDb250ZW50Q2xhc3MgZXh0ZW5kcyBNb2RlbDxDb250ZW50QXR0cmlidXRlLCBDdXN0b21FdmVudD4ge1xuICogICA6XG4gKiB9XG4gKiBjb25zdCBDb250ZW50ID0gQ29udGVudENsYXNzIGFzIE1vZGVsQ29uc3RydWN0b3I8Q29udGVudENsYXNzLCBDb250ZW50QXR0cmlidXRlPjtcbiAqXG4gKiBjb25zdCBjb250ZW50ID0gbmV3IENvbnRlbnQoeyAuLi4gfSk7XG4gKiBjb250ZW50LnRyaWdnZXIoJ2ZpcmUnLCB0cnVlLCAxMDApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBNb2RlbDxUIGV4dGVuZHMgb2JqZWN0ID0gYW55LCBURXZlbnQgZXh0ZW5kcyBNb2RlbEV2ZW50PFQ+ID0gTW9kZWxFdmVudDxUPj4gZXh0ZW5kcyBFdmVudFJlY2VpdmVyIGltcGxlbWVudHMgRXZlbnRTb3VyY2U8VEV2ZW50PiB7XG4gICAgLyoqXG4gICAgICogQGVuIEdldCBJRCBhdHRyaWJ1dGUgbmFtZS5cbiAgICAgKiBAamEgSUQg44Ki44OI44Oq44OT44Ol44O844OI5ZCN44Gr44Ki44Kv44K744K5XG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBzdGF0aWMgaWRBdHRyaWJ1dGUgPSAnaWQnO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEF0dHJpYnV0ZXMgcG9vbFxuICAgICAqIEBqYSDlsZ7mgKfmoLzntI3poJjln59cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXSE6IFByb3BlcnR5PFQ+O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCBpbml0aWFsIGF0dHJpYnV0ZSB2YWx1ZXNcbiAgICAgKiAgLSBgamFgIOWxnuaAp+OBruWIneacn+WApOOCkuaMh+WumlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGF0dHJpYnV0ZXM6IFJlcXVpcmVkPFQ+LCBvcHRpb25zPzogTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zKTtcbiAgICAgICAgY29uc3QgYXR0cnMgPSBvcHRzLnBhcnNlID8gdGhpcy5wYXJzZShhdHRyaWJ1dGVzLCBvcHRzKSBhcyBUIDogYXR0cmlidXRlcztcbiAgICAgICAgY29uc3QgcHJvcHM6IFByb3BlcnR5PFQ+ID0ge1xuICAgICAgICAgICAgYXR0cnM6IE9ic2VydmFibGVPYmplY3QuZnJvbShhdHRycyksXG4gICAgICAgICAgICBiYXNlQXR0cnM6IHsgLi4uYXR0cnMgfSxcbiAgICAgICAgICAgIHByZXZBdHRyczogeyAuLi5hdHRycyB9LFxuICAgICAgICAgICAgY2lkOiBsdWlkKCdtb2RlbDonLCA4KSxcbiAgICAgICAgICAgIG9wdGlvbnM6IG9wdHMsXG4gICAgICAgICAgICBjaGFuZ2VGaXJlZDogZmFsc2UsXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBfcHJvcGVydGllcywgeyB2YWx1ZTogcHJvcHMgfSk7XG5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoYXR0cnMpKSB7XG4gICAgICAgICAgICB0aGlzW19kZWZpbmVBdHRyaWJ1dGVzXSh0aGlzLCBrZXkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpc1tfY2hhbmdlSGFuZGxlcl0gPSAoKSA9PiB7XG4gICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGNoYW5nZScsIHRoaXMgYXMgTW9kZWwpO1xuXG4gICAgICAgICAgICBjb25zdCB7IF9wcmV2QXR0cnMsIF9hdHRycyB9ID0gdGhpcztcbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZWRLZXlzID0gT2JqZWN0LmtleXMoZGlmZihfcHJldkF0dHJzLCBfYXR0cnMgYXMgdW5rbm93biBhcyBQYXJ0aWFsPFQ+KSk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBjaGFuZ2VkS2V5cykge1xuICAgICAgICAgICAgICAgICh0aGlzIGFzIGFueSkudHJpZ2dlcihgQGNoYW5nZToke2tleX1gLCB0aGlzLCBfYXR0cnNba2V5XSwgX3ByZXZBdHRyc1trZXldLCBrZXkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VGaXJlZCA9IHRydWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpc1tfdmFsaWRhdGVdKHt9LCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGF0dHJpYnV0ZSB1cGRhdGUgY29yZSAqL1xuICAgIHByaXZhdGUgW191cGRhdGVBdHRyaWJ1dGVzXShuYW1lOiBzdHJpbmcsIHZhbDogdW5rbm93bik6IHZvaWQge1xuICAgICAgICBpZiAoIWRlZXBFcXVhbCh0aGlzLl9hdHRyc1tuYW1lXSwgdmFsKSkge1xuICAgICAgICAgICAgY29uc3QgeyBhdHRycywgY2hhbmdlRmlyZWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICAgICAgaWYgKGNoYW5nZUZpcmVkKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY2hhbmdlRmlyZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5wcmV2QXR0cnMgPSB7IC4uLmF0dHJzIH0gYXMgVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnM7XG4gICAgICAgICAgICBhc3NpZ25WYWx1ZSh0aGlzLl9wcmV2QXR0cnMgYXMgVW5rbm93bk9iamVjdCwgbmFtZSwgYXR0cnNbbmFtZV0pO1xuICAgICAgICAgICAgYXNzaWduVmFsdWUoYXR0cnMgYXMgdW5rbm93biBhcyBVbmtub3duT2JqZWN0LCBuYW1lLCB2YWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBhdHRyaWJ1dGUgYnJpZGdlIGRlZiAqL1xuICAgIHByaXZhdGUgW19kZWZpbmVBdHRyaWJ1dGVzXShpbnN0YW5jZTogb2JqZWN0LCBuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgcHJvdG8gPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG4gICAgICAgIGlmICghKG5hbWUgaW4gcHJvdG8pKSB7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sIG5hbWUsIHtcbiAgICAgICAgICAgICAgICBnZXQoKTogdW5rbm93biB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9hdHRyc1tuYW1lXTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldCh2YWw6IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfdXBkYXRlQXR0cmlidXRlc10obmFtZSwgdmFsKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogcHVibGljIHByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29udGVudCBJRC5cbiAgICAgKiBAamEg44Kz44Oz44OG44Oz44OEIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBpZEF0dHIgPSBpZEF0dHJpYnV0ZSh0aGlzLCAnaWQnKTtcbiAgICAgICAgY29uc3QgeyBjaWQsIGF0dHJzIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIChpZEF0dHIgaW4gYXR0cnMpID8gYXR0cnNbaWRBdHRyXSB8fCBjaWQgOiBjaWQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IHByb3RlY3RlZCBwcm9wZXJ0aWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDlsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9hdHRycygpOiBPYnNlcnZhYmxlT2JqZWN0IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmF0dHJzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWZhdWx0IGF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5pei5a6a5YCk5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfYmFzZUF0dHJzKCk6IFQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uYmFzZUF0dHJzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBQcmV2aW91cyBhdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWkieabtOWJjeOBruWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3ByZXZBdHRycygpOiBUIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnByZXZBdHRycztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hhbmdlZCBhdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWkieabtOOBruOBguOBo+OBn+WxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2NoYW5nZWRBdHRycygpOiBQYXJ0aWFsPFQ+IHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpc1tfcHJvcGVydGllc10uY2hhbmdlZEF0dHJzKSB7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnMgPSBkaWZmKHRoaXMuX2Jhc2VBdHRycywgdGhpcy5fYXR0cnMgYXMgdW5rbm93biBhcyBQYXJ0aWFsPFQ+KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY2hhbmdlZEF0dHJzIGFzIFBhcnRpYWw8VD47IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVubmVjZXNzYXJ5LXR5cGUtYXNzZXJ0aW9uXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBpbnRlcm5hbCBjb250ZW50IElELlxuICAgICAqIEBqYSDlhoXpg6jjga7jgrPjg7Pjg4bjg7Pjg4QgSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY2lkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jaWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjcmVhdGluZyBvcHRpb25zLlxuICAgICAqIEBqYSDmp4vnr4nmmYLjga7jgqrjg5fjgrfjg6fjg7PjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9vcHRpb25zKCk6IE1vZGVsU2V0T3B0aW9ucyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5vcHRpb25zO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IGV2ZW50c1xuXG4gICAgLyoqXG4gICAgICogQGVuIEV2ZW50U291cmNlIHR5cGUgcmVzb2x2ZXIuXG4gICAgICogQGphIEV2ZW50U291cmNlIOWei+ino+axuueUqOODmOODq+ODkeODvOOCouOCr+OCu+ODg+OCtVxuICAgICAqL1xuICAgIGdldCAkKCk6IEV2ZW50U291cmNlPFRFdmVudD4ge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGJyb2tlciBhY2Nlc3MgKi9cbiAgICBwcml2YXRlIGdldCBbX2Jyb2tlcl0oKTogRXZlbnRCcm9rZXI8YW55PiB7XG4gICAgICAgIHJldHVybiAodGhpcy5fYXR0cnMgYXMgSU9ic2VydmFibGUgYXMgSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2VzcykuZ2V0QnJva2VyKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHdoZXRoZXIgdGhpcyBvYmplY3QgaGFzIGNsaWVudHMuXG4gICAgICogQGphIOOCr+ODqeOCpOOCouODs+ODiOOBjOWtmOWcqOOBmeOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgaGFzTGlzdGVuZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIFRFdmVudD4oY2hhbm5lbD86IENoYW5uZWwsIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxURXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19icm9rZXJdLmhhc0xpc3RlbmVyKGNoYW5uZWwsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyByZWdpc3RlcmVkIGNoYW5uZWwga2V5cy5cbiAgICAgKiBAamEg55m76Yyy44GV44KM44Gm44GE44KL44OB44Oj44ON44Or44Kt44O844KS6L+U5Y20XG4gICAgICovXG4gICAgY2hhbm5lbHMoKTogKGtleW9mIFRFdmVudClbXSB7XG4gICAgICAgIHJldHVybiB0aGlzW19icm9rZXJdLmNoYW5uZWxzKCkuZmlsdGVyKGMgPT4gJ0AnICE9PSBjKSBhcyAoa2V5b2YgVEV2ZW50KVtdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBOb3RpZnkgZXZlbnQgdG8gY2xpZW50cy5cbiAgICAgKiBAamEgZXZlbnQg55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgYXJndW1lbnRzIGZvciBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWw44Gr5rih44GZ5byV5pWwXG4gICAgICovXG4gICAgcHVibGljIHRyaWdnZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIFRFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCwgLi4uYXJnczogQXJndW1lbnRzPFBhcnRpYWw8VEV2ZW50W0NoYW5uZWxdPj4pOiB2b2lkIHtcbiAgICAgICAgKHRoaXNbX2Jyb2tlcl0gYXMgYW55KS50cmlnZ2VyKGNoYW5uZWwsIC4uLmFyZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBldmVyeXRoaW5nIGlzIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/jgZnjgbnjgabop6PpmaRcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgYWxsIHNhbWUgYGNoYW5uZWxgIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lkIzkuIAgYGNoYW5uZWxgIOOBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIHB1YmxpYyBvZmY8Q2hhbm5lbCBleHRlbmRzIGtleW9mIFRFdmVudD4oY2hhbm5lbD86IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxURXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2F0dHJzLm9mZihjaGFubmVsIGFzIGFueSwgbGlzdGVuZXIgYXMgYW55KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgb248Q2hhbm5lbCBleHRlbmRzIGtleW9mIFRFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8VEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHRoaXMuX2F0dHJzLm9uKCdAJywgdGhpc1tfY2hhbmdlSGFuZGxlcl0pO1xuICAgICAgICByZXR1cm4gdGhpcy5fYXR0cnMub24oY2hhbm5lbCBhcyBhbnksIGxpc3RlbmVyIGFzIGFueSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKSBidXQgaXQgY2F1c2VzIHRoZSBib3VuZCBjYWxsYmFjayB0byBvbmx5IGZpcmUgb25jZSBiZWZvcmUgYmVpbmcgcmVtb3ZlZC5cbiAgICAgKiBAamEg5LiA5bqm44Gg44GR44OP44Oz44OJ44Oq44Oz44Kw5Y+v6IO944Gq44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIG9uY2U8Q2hhbm5lbCBleHRlbmRzIGtleW9mIFRFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8VEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLm9uKGNoYW5uZWwsIGxpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgbWFuYWdlZCA9IHRoaXMub24oY2hhbm5lbCwgKCkgPT4ge1xuICAgICAgICAgICAgY29udGV4dC51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgbWFuYWdlZC51bnN1YnNjcmliZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogdmFsaWRhdGlvblxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHZhbGlkIG9yIG5vdC5cbiAgICAgKiBAamEg5qSc6Ki844Gu5oiQ5ZCm44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGlzVmFsaWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBTVUNDRUVERUQodGhpcy52YWxpZGF0ZSh7IHNpbGVudDogdHJ1ZSB9KS5jb2RlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmFsaWRhdGUgcmVzdWx0IGFjY2Vzc2VyLlxuICAgICAqIEBqYSDmpJzoqLzntZDmnpzjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgdmFsaWRhdGUob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogUmVzdWx0IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyB2YWxpZGF0ZTogdHJ1ZSwgbm9UaHJvdzogdHJ1ZSwgZXh0ZW5kOiBmYWxzZSB9LCBvcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3ZhbGlkYXRlXSh7fSwgb3B0cyk7XG4gICAgfVxuXG4gICAgLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzICovXG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmFsaWRhdGUgZGF0YSBtZXRob2QuXG4gICAgICogQGphIOODh+ODvOOCv+aknOiovFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgdmFsaWRhdGVlIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgamFgIOiiq+aknOiovOWxnuaAp1xuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCB2YWxpZGF0ZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDmpJzoqLzjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgdmFsaWRhdGVBdHRyaWJ1dGVzPEEgZXh0ZW5kcyBUPihhdHRyaWJ1dGVzOiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+LCBvcHRpb25zPzogTW9kZWxWYWxpZGF0ZUF0dHJpYnV0ZU9wdGlvbnMpOiBSZXN1bHQge1xuICAgICAgICByZXR1cm4gUkVTVUxUX1ZBTElEX0FUVFJTO1xuICAgIH1cblxuICAgIC8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzICovXG5cbiAgICAvKiogQGludGVybmFsIHZhbGlkYXRlICovXG4gICAgcHJpdmF0ZSBbX3ZhbGlkYXRlXTxBIGV4dGVuZHMgVD4oYXR0cmlidXRlczogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPiwgb3B0aW9ucz86IE1vZGVsU2V0T3B0aW9ucyk6IFJlc3VsdCB8IG5ldmVyIHtcbiAgICAgICAgY29uc3QgeyB2YWxpZGF0ZSwgc2lsZW50LCBub1Rocm93IH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBpZiAodmFsaWRhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGF0dHJzID0geyAuLi50aGlzLl9hdHRycywgLi4uYXR0cmlidXRlcyB9O1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy52YWxpZGF0ZUF0dHJpYnV0ZXMoYXR0cnMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKEZBSUxFRChyZXN1bHQuY29kZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGludmFsaWQnLCB0aGlzIGFzIE1vZGVsLCBhdHRycywgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFub1Rocm93KSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFJFU1VMVF9WQUxJRF9BVFRSUztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IGF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgW1tNb2RlbF1dIGhhcyB2YWxpZCBwcm9wZXJ0eS4gKG5vdCBgbnVsbGAgb3IgYHVuZGVmaW5lZGApXG4gICAgICogQGphIFtbTW9kZWxdXSDjgYzmnInlirnjgarjg5fjg63jg5Hjg4bjgqPjgpLmjIHjgaPjgabjgYTjgovjgYvnorroqo0gKGBudWxsYCDjgb7jgZ/jga8gYHVuZGVmaW5lZGAg44Gn44Gq44GEKVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXMoYXR0cmlidXRlOiBrZXlvZiBUKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9ICh0aGlzLl9hdHRycyBhcyB1bmtub3duIGFzIFQpW2F0dHJpYnV0ZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgSFRNTC1lc2NhcGVkIHZhbHVlIG9mIGFuIGF0dHJpYnV0ZS5cbiAgICAgKiBAamEgSFRNTCDjgafkvb/nlKjjgZnjgovmloflrZfjgpLliLblvqHmloflrZfjgavnva7mj5vjgZfjgZ/lsZ7mgKflgKTjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZXNjYXBlKGF0dHJpYnV0ZToga2V5b2YgVCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBlc2NhcGVIVE1MKCh0aGlzLl9hdHRycyBhcyBhbnkpW2F0dHJpYnV0ZV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVcGRhdGUgYXR0cmlidXRlcyBmb3IgYmF0Y2ggaW5wdXQgd2l0aCBvcHRpb25zLlxuICAgICAqIEBqYSDlsZ7mgKfjga7kuIDmi6zoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCB1cGRhdGUgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg5pu05paw5bGe5oCnXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBhdHRyaWJ1dGVzIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOWxnuaAp+abtOaWsOeUqOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXRBdHRyaWJ1dGVzPEEgZXh0ZW5kcyBUPihhdHRyaWJ1dGVzOiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+LCBvcHRpb25zPzogTW9kZWxTZXRPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgc2lsZW50LCBleHRlbmQgfSA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hdHRycy5zdXNwZW5kKHRydWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzW192YWxpZGF0ZV0oYXR0cmlidXRlcywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoRkFJTEVEKHJlc3VsdC5jb2RlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgT2JqZWN0LmtleXMoYXR0cmlidXRlcykpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXR0ciBpbiB0aGlzLl9hdHRycykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW191cGRhdGVBdHRyaWJ1dGVzXShhdHRyLCBhdHRyaWJ1dGVzW2F0dHJdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGV4dGVuZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW19kZWZpbmVBdHRyaWJ1dGVzXSh0aGlzLCBhdHRyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfdXBkYXRlQXR0cmlidXRlc10oYXR0ciwgYXR0cmlidXRlc1thdHRyXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgaWYgKHNpbGVudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzLnJlc3VtZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGFsbCBhdHRyaWJ1dGVzIG9uIHRoZSBbW01vZGVsXV0uIChzZXQgYHVuZGVmaW5lZGApXG4gICAgICogQGphIFtbTW9kZWxdXSDjgYvjgonjgZnjgbnjgabjga7lsZ7mgKfjgpLliYrpmaQgKGB1bmRlZmluZWRgIOOCkuioreWumilcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xlYXIob3B0aW9ucz86IE1vZGVsU2V0T3B0aW9ucyk6IHRoaXMge1xuICAgICAgICBjb25zdCBjbGVhckF0dHJzID0ge307XG4gICAgICAgIGZvciAoY29uc3QgYXR0ciBvZiBPYmplY3Qua2V5cyh0aGlzLl9iYXNlQXR0cnMpKSB7XG4gICAgICAgICAgICBjbGVhckF0dHJzW2F0dHJdID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnNldEF0dHJpYnV0ZXMoY2xlYXJBdHRycywgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBhIGNvcHkgb2YgdGhlIG1vZGVsJ3MgYGF0dHJpYnV0ZXNgIG9iamVjdC5cbiAgICAgKiBAamEgTW9kZWwg5bGe5oCn5YCk44Gu44Kz44OU44O844KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHRvSlNPTigpOiBUIHtcbiAgICAgICAgcmV0dXJuIGRlZXBDb3B5KHsgLi4udGhpcy5fYXR0cnMgfSBhcyBUKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZXMgQ2xvbmUgdGhpcyBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544Gu6KSH6KO944KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xvbmUoKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgY29uc3RydWN0b3IsIF9hdHRycywgX29wdGlvbnMgfSA9IHRoaXM7XG4gICAgICAgIHJldHVybiBuZXcgKGNvbnN0cnVjdG9yIGFzIENvbnN0cnVjdG9yPHRoaXM+KShfYXR0cnMsIF9vcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgY2hhbmdlZCBhdHRyaWJ1dGVzLlxuICAgICAqIEBqYSDlpInmm7TjgZXjgozjgZ/lsZ7mgKflgKTjgpLmjIHjgaTjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVcbiAgICAgKiAgLSBgZW5gIGNoZWNrZWQgYXR0cmlidXRlXG4gICAgICogIC0gYGphYCDmpJzoqLzjgZnjgovlsZ7mgKdcbiAgICAgKi9cbiAgICBwdWJsaWMgaGFzQ2hhbmdlZChhdHRyaWJ1dGU/OiBrZXlvZiBUKTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChudWxsID09IGF0dHJpYnV0ZSkge1xuICAgICAgICAgICAgcmV0dXJuICFpc0VtcHR5T2JqZWN0KHRoaXMuX2NoYW5nZWRBdHRycyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYXR0cmlidXRlIGluIHRoaXMuX2NoYW5nZWRBdHRycztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYW4gb2JqZWN0IGNvbnRhaW5pbmcgYWxsIHRoZSBhdHRyaWJ1dGVzIHRoYXQgaGF2ZSBjaGFuZ2VkLCBvciBgdW5kZWZpbmVkYCBpZiB0aGVyZSBhcmUgbm8gY2hhbmdlZCBhdHRyaWJ1dGVzLlxuICAgICAqIEBqYSDlhaXlipvjgZfjgZ8gYXR0cmlidXRlcyDlgKTjga7lt67liIbjgavlr77jgZfjgablpInmm7TjgYzjgYLjgovlsZ7mgKflgKTjgpLov5TljbQuIOW3ruWIhuOBjOOBquOBhOWgtOWQiOOBryBgdW5kZWZpZW5kYCDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCBjaGVja2VkIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgamFgIOaknOiovOOBmeOCi+WxnuaAp1xuICAgICAqL1xuICAgIHB1YmxpYyBjaGFuZ2VkKGF0dHJpYnV0ZXM/OiBQYXJ0aWFsPFQ+KTogUGFydGlhbDxUPiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICghYXR0cmlidXRlcykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFzQ2hhbmdlZCgpID8geyAuLi50aGlzLl9jaGFuZ2VkQXR0cnMgfSA6IHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZWQgPSBkaWZmKHRoaXMuX2F0dHJzLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIHJldHVybiAhaXNFbXB0eU9iamVjdChjaGFuZ2VkKSA/IGNoYW5nZWQgOiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBwcmV2aW91cyB2YWx1ZSBvZiBhbiBhdHRyaWJ1dGUsIHJlY29yZGVkIGF0IHRoZSB0aW1lIHRoZSBsYXN0IGBAY2hhbmdlYCBldmVudCB3YXMgZmlyZWQuXG4gICAgICogQGphIGBAY2hhbmdlYCDjgYznmbrngavjgZXjgozjgZ/liY3jga7lsZ7mgKflgKTjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJldmlvdXM8SyBleHRlbmRzIGtleW9mIFQ+KGF0dHJpYnV0ZTogSyk6IFRbS10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcHJldkF0dHJzW2F0dHJpYnV0ZV07XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogc3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGEgW1tNb2RlbF1dIGlzIG5ldyBpZiBpdCBoYXMgbmV2ZXIgYmVlbiBzYXZlZCB0byB0aGUgc2VydmVyLCBhbmQgbGFja3MgYW4gaWQuXG4gICAgICogQGphIFtbTW9kZWxdXSDjgYzjgb7jgaDjgrXjg7zjg5Djg7zjgavlrZjlnKjjgZfjgarjgYTjgYvjg4Hjgqfjg4Pjgq8uIOaXouWumuOBp+OBryBgaWRBdHRyaWJ1dGVgIOOBruacieeEoeOBp+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBpc05ldygpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgaWRBdHRyID0gaWRBdHRyaWJ1dGUodGhpcywgJ2lkJyk7XG4gICAgICAgIHJldHVybiAhdGhpcy5oYXMoaWRBdHRyIGFzIGtleW9mIFQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDb252ZXJ0cyBhIHJlc3BvbnNlIGludG8gdGhlIGhhc2ggb2YgYXR0cmlidXRlcyB0byBiZSBgc2V0YCBvbiB0aGUgbW9kZWwuIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIGlzIGp1c3QgdG8gcGFzcyB0aGUgcmVzcG9uc2UgYWxvbmcuXG4gICAgICogQGphIOODrOOCueODneODs+OCueOBruWkieaPm+ODoeOCveODg+ODiS4g5pei5a6a44Gn44Gv5L2V44KC44GX44Gq44GEXG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgcGFyc2UocmVzcG9uc2U6IE1vZGVsU2VlZCB8IHZvaWQsIG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiBUIHwgdm9pZCB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHJldHVybiByZXNwb25zZSBhcyBUO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBQcm94eSBbW0lEYXRhU3luYyNzeW5jXV0gYnkgZGVmYXVsdCAtLSBidXQgb3ZlcnJpZGUgdGhpcyBpZiB5b3UgbmVlZCBjdXN0b20gc3luY2luZyBzZW1hbnRpY3MgZm9yICp0aGlzKiBwYXJ0aWN1bGFyIG1vZGVsLlxuICAgICAqIEBqYSDjg4fjg7zjgr/lkIzmnJ8uIOW/heimgeOBq+W/nOOBmOOBpuOCquODvOODkOODvOODqeOCpOODieWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBzeW5jPEsgZXh0ZW5kcyBNb2RlbFN5bmNNZXRob2RzPihtZXRob2Q6IEssIGNvbnRleHQ6IE1vZGVsPFQ+LCBvcHRpb25zPzogTW9kZWxEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPE1vZGVsU3luY1Jlc3VsdDxLLCBUPj4ge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFN5bmMoKS5zeW5jKG1ldGhvZCwgY29udGV4dCBhcyBTeW5jQ29udGV4dDxUPiwgb3B0aW9ucykgYXMgdW5rbm93biBhcyBQcm9taXNlPE1vZGVsU3luY1Jlc3VsdDxLLCBUPj47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZldGNoIHRoZSBbW01vZGVsXV0gZnJvbSB0aGUgc2VydmVyLCBtZXJnaW5nIHRoZSByZXNwb25zZSB3aXRoIHRoZSBtb2RlbCdzIGxvY2FsIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIFtbTW9kZWxdXSDlsZ7mgKfjga7jgrXjg7zjg5Djg7zlkIzmnJ8uIOODrOOCueODneODs+OCueOBruODnuODvOOCuOOCkuWun+ihjFxuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBmZXRjaChvcHRpb25zPzogTW9kZWxGZXRjaE9wdGlvbnMpOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBwYXJzZTogdHJ1ZSB9LCBvcHRpb25zLCB7IHN5bmNNZXRob2Q6ICdyZWFkJyB9KTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzcCA9IGF3YWl0IHRoaXMuc3luYygncmVhZCcsIHRoaXMgYXMgTW9kZWw8VD4sIG9wdHMpO1xuICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGVzKG9wdHMucGFyc2UgPyB0aGlzLnBhcnNlKHJlc3AgYXMgTW9kZWxTZWVkLCBvcHRzKSBhcyBUIDogcmVzcCwgb3B0cyk7XG4gICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQHN5bmMnLCB0aGlzIGFzIE1vZGVsLCByZXNwIGFzIE1vZGVsU2VlZCwgb3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BlcnJvcicsIHRoaXMgYXMgTW9kZWwsIGUsIG9wdHMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgYSBoYXNoIG9mIFtbTW9kZWxdXSBhdHRyaWJ1dGVzLCBhbmQgc3luYyB0aGUgbW9kZWwgdG8gdGhlIHNlcnZlci4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgc2VydmVyIHJldHVybnMgYW4gYXR0cmlidXRlcyBoYXNoIHRoYXQgZGlmZmVycywgdGhlIG1vZGVsJ3Mgc3RhdGUgd2lsbCBiZSBgc2V0YCBhZ2Fpbi5cbiAgICAgKiBAamEgW1tNb2RlbF1dIOWxnuaAp+OCkuOCteODvOODkOODvOOBq+S/neWtmC4gPGJyPlxuICAgICAqICAgICDnlbDjgarjgovlsZ7mgKfjgYzov5TljbTjgZXjgozjgovloLTlkIjjga/lho3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHVwZGF0ZSBhdHRyaWJ1dGUga2V5XG4gICAgICogIC0gYGphYCDmm7TmlrDlsZ7mgKfjgq3jg7xcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHVwZGF0ZSBhdHRyaWJ1dGUgdmFsdWVcbiAgICAgKiAgLSBgamFgIOabtOaWsOWxnuaAp+WApFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzYXZlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOS/neWtmOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBzYXZlPEsgZXh0ZW5kcyBrZXlvZiBUPihrZXk/OiBrZXlvZiBULCB2YWx1ZT86IFRbS10sIG9wdGlvbnM/OiBNb2RlbFNhdmVPcHRpb25zKTogUHJvbWlzZTxUIHwgdm9pZD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IGEgaGFzaCBvZiBbW01vZGVsXV0gYXR0cmlidXRlcywgYW5kIHN5bmMgdGhlIG1vZGVsIHRvIHRoZSBzZXJ2ZXIuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIHNlcnZlciByZXR1cm5zIGFuIGF0dHJpYnV0ZXMgaGFzaCB0aGF0IGRpZmZlcnMsIHRoZSBtb2RlbCdzIHN0YXRlIHdpbGwgYmUgYHNldGAgYWdhaW4uXG4gICAgICogQGphIFtbTW9kZWxdXSDlsZ7mgKfjgpLjgrXjg7zjg5Djg7zjgavkv53lrZguIDxicj5cbiAgICAgKiAgICAg55Ww44Gq44KL5bGe5oCn44GM6L+U5Y2044GV44KM44KL5aC05ZCI44Gv5YaN6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgdXBkYXRlIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgamFgIOabtOaWsOWxnuaAp1xuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzYXZlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOS/neWtmOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBzYXZlPEEgZXh0ZW5kcyBUPihhdHRyaWJ1dGVzOiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+IHwgTnVsbGlzaCwgb3B0aW9ucz86IE1vZGVsU2F2ZU9wdGlvbnMpOiBQcm9taXNlPFQgfCB2b2lkPjtcblxuICAgIHB1YmxpYyBhc3luYyBzYXZlKC4uLmFyZ3M6IHVua25vd25bXSk6IFByb21pc2U8VCB8IHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBhdHRycywgb3B0aW9ucyB9ID0gcGFyc2VTYXZlQXJncyguLi5hcmdzKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyB2YWxpZGF0ZTogdHJ1ZSwgcGFyc2U6IHRydWUsIHdhaXQ6IHRydWUsIGV4dGVuZDogdHJ1ZSB9LCBvcHRpb25zKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyB3YWl0IH0gPSBvcHRzO1xuXG4gICAgICAgICAgICBjb25zdCBtZXRob2QgPSBvcHRzLnN5bmNNZXRob2QgPSB0aGlzLmlzTmV3KCkgPyAnY3JlYXRlJyA6IG9wdHMucGF0Y2ggPyAncGF0Y2gnIDogJ3VwZGF0ZSc7XG5cbiAgICAgICAgICAgIGlmIChhdHRycykge1xuICAgICAgICAgICAgICAgIGlmICghd2FpdCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEF0dHJpYnV0ZXMoYXR0cnMsIG9wdHMpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5iYXNlQXR0cnMgPSB7IC4uLnRoaXMuX2F0dHJzIH0gYXMgVDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW192YWxpZGF0ZV0oYXR0cnMsIG9wdHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoJ3BhdGNoJyA9PT0gbWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdHMuZGF0YSA9IGF0dHJzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdHMuZGF0YSA9IE9iamVjdC5hc3NpZ24odGhpcy50b0pTT04oKSwgYXR0cnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzcCA9IGF3YWl0IHRoaXMuc3luYyhtZXRob2QsIHRoaXMgYXMgTW9kZWw8VD4sIG9wdHMpO1xuXG4gICAgICAgICAgICBsZXQgc2VydmVyQXR0cnMgPSBvcHRzLnBhcnNlID8gdGhpcy5wYXJzZShyZXNwLCBvcHRzKSA6IHJlc3A7XG4gICAgICAgICAgICBpZiAoYXR0cnMgJiYgd2FpdCkge1xuICAgICAgICAgICAgICAgIHNlcnZlckF0dHJzID0gT2JqZWN0LmFzc2lnbih7fSwgYXR0cnMsIHNlcnZlckF0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc09iamVjdChzZXJ2ZXJBdHRycykgJiYgIWlzRW1wdHlPYmplY3Qoc2VydmVyQXR0cnMpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGVzKHNlcnZlckF0dHJzIGFzIFQsIG9wdHMpO1xuICAgICAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmJhc2VBdHRycyA9IHsgLi4udGhpcy5fYXR0cnMgfSBhcyBUO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQHN5bmMnLCB0aGlzIGFzIE1vZGVsLCByZXNwIGFzIE1vZGVsU2VlZCwgb3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcCBhcyBUO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGVycm9yJywgdGhpcyBhcyBNb2RlbCwgZSwgb3B0cyk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlc3Ryb3kgdGhpcyBbW01vZGVsXV0gb24gdGhlIHNlcnZlciBpZiBpdCB3YXMgYWxyZWFkeSBwZXJzaXN0ZWQuXG4gICAgICogQGphIFtbTW9kZWxdXSDjgpLjgrXjg7zjg5Djg7zjgYvjgonliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBkZXN0cm95IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOegtOajhOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBkZXN0cm95KG9wdGlvbnM/OiBNb2RlbERlc3Ryb3lPcHRpb25zKTogUHJvbWlzZTxUIHwgdm9pZD4ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHdhaXQ6IHRydWUgfSwgb3B0aW9ucywgeyBzeW5jTWV0aG9kOiAnZGVsZXRlJyB9KTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyB3YWl0LCBjYW5jZWwgfSA9IG9wdHM7XG4gICAgICAgICAgICBjb25zdCBleGlzdHMgPSAhdGhpcy5pc05ldygpO1xuICAgICAgICAgICAgY29uc3QgZGVzdHJ1Y3QgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BkZXN0cm95JywgdGhpcyBhcyBNb2RlbCwgb3B0cyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAhd2FpdCAmJiBkZXN0cnVjdCgpO1xuXG4gICAgICAgICAgICBsZXQgcmVzcDogTW9kZWxTZWVkIHwgdm9pZDtcbiAgICAgICAgICAgIGlmICghZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgY2MoY2FuY2VsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzcCA9IGF3YWl0IHRoaXMuc3luYygnZGVsZXRlJywgdGhpcyBhcyBNb2RlbDxUPiwgb3B0cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHdhaXQgJiYgZGVzdHJ1Y3QoKTtcbiAgICAgICAgICAgIGV4aXN0cyAmJiAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQHN5bmMnLCB0aGlzIGFzIE1vZGVsLCByZXNwIGFzIE1vZGVsU2VlZCwgb3B0cyk7XG5cbiAgICAgICAgICAgIHJldHVybiByZXNwIGFzIFQ7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAZXJyb3InLCB0aGlzIGFzIE1vZGVsLCBlLCBvcHRzKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIG1peGluIOOBq+OCiOOCiyBgaW5zdGFuY2VvZmAg44Gv54Sh5Yq544Gr6Kit5a6aXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShNb2RlbCBhcyB1bmtub3duIGFzIENsYXNzLCAnaW5zdGFuY2VPZicsIG51bGwpO1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBbW01vZGVsXV0uXG4gKiBAamEgW1tNb2RlbF1dIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTW9kZWwoeDogdW5rbm93bik6IHggaXMgTW9kZWwge1xuICAgIHJldHVybiB4IGluc3RhbmNlb2YgTW9kZWw7XG59XG5cbi8qKlxuICogQGVuIFF1ZXJ5IFtbTW9kZWxdXSBgaWQtYXR0cmlidXRlYC5cbiAqIEBqYSBbW01vZGVsXV0g44GuIGBpZC1hdHRyaWJ1dGVgIOOCkuWPluW+l1xuICovXG5leHBvcnQgZnVuY3Rpb24gaWRBdHRyaWJ1dGUoeDogdW5rbm93biwgZmFsbGJhY2sgPSAnJyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGlzT2JqZWN0KHgpID8gKHguY29uc3RydWN0b3JbJ2lkQXR0cmlidXRlJ10gfHwgZmFsbGJhY2spIDogZmFsbGJhY2s7XG59XG4iXSwibmFtZXMiOlsiY2MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBOzs7O0FBSUc7QUFFSCxDQUFBLFlBQXFCO0FBTWpCOzs7QUFHRztBQUNILElBQUEsSUFHQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtBQUhELElBQUEsQ0FB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