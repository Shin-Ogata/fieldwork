/*!
 * @cdp/model 0.9.17
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwubWpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwiYmFzZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIE1PREVMID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgNSxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19NT0RFTF9ERUNMQVJFICAgICAgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX0RBVEEgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5NT0RFTCArIDEsICdpbnZhbGlkIGRhdGEuJyksXG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgUHJpbWl0aXZlLFxuICAgIE51bGxpc2gsXG4gICAgQWNjZXNzaWJsZSxcbiAgICBDb25zdHJ1Y3RvcixcbiAgICBDbGFzcyxcbiAgICBBcmd1bWVudHMsXG4gICAgaXNPYmplY3QsXG4gICAgaXNFbXB0eU9iamVjdCxcbiAgICBsdWlkLFxuICAgIGVzY2FwZUhUTUwsXG4gICAgYXNzaWduVmFsdWUsXG4gICAgZGVlcENvcHksXG4gICAgZGVlcEVxdWFsLFxuICAgIGRpZmYsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIFN1YnNjcmlwdGlvbixcbiAgICBTaWxlbmNlYWJsZSxcbiAgICBFdmVudEJyb2tlcixcbiAgICBFdmVudFJlY2VpdmVyLFxuICAgIEV2ZW50U291cmNlLFxufSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBjaGVja0NhbmNlbGVkIGFzIGNjIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7XG4gICAgSU9ic2VydmFibGUsXG4gICAgSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2VzcyxcbiAgICBPYnNlcnZhYmxlT2JqZWN0LFxufSBmcm9tICdAY2RwL29ic2VydmFibGUnO1xuaW1wb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBSZXN1bHQsXG4gICAgbWFrZVJlc3VsdCxcbiAgICBTVUNDRUVERUQsXG4gICAgRkFJTEVELFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBTeW5jQ29udGV4dCwgZGVmYXVsdFN5bmMgfSBmcm9tICdAY2RwL2RhdGEtc3luYyc7XG5pbXBvcnQge1xuICAgIE1vZGVsU2VlZCxcbiAgICBNb2RlbEV2ZW50LFxuICAgIE1vZGVsVmFsaWRhdGVBdHRyaWJ1dGVPcHRpb25zLFxuICAgIE1vZGVsQXR0cmlidXRlSW5wdXQsXG4gICAgTW9kZWxTZXRPcHRpb25zLFxuICAgIE1vZGVsQ29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBNb2RlbFN5bmNNZXRob2RzLFxuICAgIE1vZGVsU3luY1Jlc3VsdCxcbiAgICBNb2RlbERhdGFTeW5jT3B0aW9ucyxcbiAgICBNb2RlbEZldGNoT3B0aW9ucyxcbiAgICBNb2RlbFNhdmVPcHRpb25zLFxuICAgIE1vZGVsRGVzdHJveU9wdGlvbnMsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2RlZmluZUF0dHJpYnV0ZXMgPSBTeW1ib2woJ2RlZmluZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfdXBkYXRlQXR0cmlidXRlcyA9IFN5bWJvbCgndXBkYXRlJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF92YWxpZGF0ZSAgICAgICAgID0gU3ltYm9sKCd2YWxpZGF0ZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY2hhbmdlSGFuZGxlciAgICA9IFN5bWJvbCgnb25jaGFuZ2UnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2Jyb2tlciAgICAgICAgICAgPSBTeW1ib2woJ2Jyb2tlcicpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyAgICAgICA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHk8VD4ge1xuICAgIGF0dHJzOiBBY2Nlc3NpYmxlPE9ic2VydmFibGVPYmplY3Q+O1xuICAgIGJhc2VBdHRyczogVDtcbiAgICBwcmV2QXR0cnM6IFQ7XG4gICAgY2hhbmdlZEF0dHJzPzogUGFydGlhbDxUPjtcbiAgICByZWFkb25seSBjaWQ6IHN0cmluZztcbiAgICByZWFkb25seSBvcHRpb25zOiBNb2RlbFNldE9wdGlvbnM7XG4gICAgY2hhbmdlRmlyZWQ6IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGVuIFZhbGlkIGF0dHJpYnV0ZXMgcmVzdWx0LlxuICogQGphIOWxnuaAp+aknOiovOOBruacieWKueWApFxuICovXG5leHBvcnQgY29uc3QgUkVTVUxUX1ZBTElEX0FUVFJTID0gT2JqZWN0LmZyZWV6ZShtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLlNVQ0NFU1MsICd2YWxpZCBhdHRyaWJ1dGUuJykpO1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3Igc2F2ZSgpICovXG5mdW5jdGlvbiBwYXJzZVNhdmVBcmdzPEEgZXh0ZW5kcyBvYmplY3Q+KC4uLmFyZ3M6IGFueVtdKTogeyBhdHRycz86IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT47IG9wdGlvbnM/OiBNb2RlbFNhdmVPcHRpb25zOyB9IHtcbiAgICBsZXQgW2tleSwgdmFsdWUsIG9wdGlvbnNdID0gYXJnczsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBwcmVmZXItY29uc3RcbiAgICBsZXQgYXR0cnM6IGFueTtcblxuICAgIGlmIChudWxsID09IGtleSB8fCBpc09iamVjdChrZXkpKSB7XG4gICAgICAgIGF0dHJzID0ga2V5O1xuICAgICAgICBvcHRpb25zID0gdmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYXNzaWduVmFsdWUoYXR0cnMgPSB7fSwga2V5LCB2YWx1ZSk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5kYXRhKSB7XG4gICAgICAgIGF0dHJzID0gT2JqZWN0LmFzc2lnbihhdHRycyB8fCB7fSwgb3B0aW9ucy5kYXRhKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBhdHRycywgb3B0aW9ucyB9O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQmFzZSBjbGFzcyBkZWZpbml0aW9uIGZvciBtb2RlbCB0aGF0IHByb3ZpZGVzIGEgYmFzaWMgc2V0IG9mIGZ1bmN0aW9uYWxpdHkgZm9yIG1hbmFnaW5nIGludGVyYWN0aW9uLlxuICogQGphIOOCpOODs+OCv+ODqeOCr+OCt+ODp+ODs+OBruOBn+OCgeOBruWfuuacrOapn+iDveOCkuaPkOS+m+OBmeOCiyBNb2RlbCDjga7ln7rlupXjgq/jg6njgrnlrprnvqlcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IE1vZGVsLCBNb2RlbENvbnN0cnVjdG9yIH0gZnJvbSAnQGNkcC9tb2RlbCc7XG4gKlxuICogaW50ZXJmYWNlIENvbnRlbnRBdHRyaWJ1dGUge1xuICogICB1cmk6IHN0cmluZztcbiAqICAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyO1xuICogICBjb29raWU/OiBzdHJpbmc7XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiAtIEJhc2ljIFVzYWdlXG4gKlxuICogYGBgdHNcbiAqIC8vIGVhcmx5IGNhc3RcbiAqIGNvbnN0IENvbnRlbnRCYXNlID0gTW9kZWwgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbDxDb250ZW50QXR0cmlidXRlPiwgQ29udGVudEF0dHJpYnV0ZT47XG4gKlxuICogY2xhc3MgQ29udGVudCBleHRlbmRzIENvbnRlbnRCYXNlIHtcbiAqICAgY29uc3RydWN0b3IoYXR0cnM6IENvbnRlbnRBdHRyaWJ1dGUpIHtcbiAqICAgICBzdXBlcihhdHRycyk7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIG9yXG4gKlxuICogYGBgdHNcbiAqIC8vIGxhdGUgY2FzdFxuICogY2xhc3MgQ29udGVudENsYXNzIGV4dGVuZHMgTW9kZWw8Q29udGVudEF0dHJpYnV0ZT4ge1xuICogICBjb25zdHJ1Y3RvcihhdHRyczogQ29udGVudEF0dHJpYnV0ZSkge1xuICogICAgIHN1cGVyKGF0dHJzKTtcbiAqICAgfVxuICogfVxuICpcbiAqIGNvbnN0IENvbnRlbnQgPSBDb250ZW50Q2xhc3MgYXMgTW9kZWxDb25zdHJ1Y3RvcjxDb250ZW50Q2xhc3MsIENvbnRlbnRBdHRyaWJ1dGU+O1xuICogYGBgXG4gKiB0aGVuXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGNvbnRlbnQgPSBuZXcgQ29udGVudCh7XG4gKiAgIHVyaTogJ2FhYS50eHQnLFxuICogICBzaXplOiAxMCxcbiAqICAgY29va2llOiB1bmRlZmluZWQsIC8vIG5lZWQgZXhwbGljaXQgYXNzaWduXG4gKiB9KTtcbiAqXG4gKiBjb25zb2xlLmxvZyhjb250ZW50LnVyaSk7ICAgIC8vICdhYWEudHh0J1xuICogY29uc29sZS5sb2coY29udGVudC5zaXplKTsgICAvLyAnMTAnXG4gKiBjb25zb2xlLmxvZyhjb250ZW50LmNvb2tpZSk7IC8vICd1bmRlZmluZWQnXG4gKiBgYGBcbiAqXG4gKiAtIFVzaW5nIEN1c3RvbSBURXZlbnRcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgTW9kZWxFdmVudCB9IGZyb20gJ0BjZHAvbW9kZWwnO1xuICpcbiAqIGludGVyZmFjZSBDdXN0b21FdmVudCBleHRlbmRzIE1vZGVsRXZlbnQ8Q29udGVudEF0dHJpYnV0ZT4ge1xuICogICBmaXJlOiBbYm9vbGVhbiwgbnVtYmVyXTtcbiAqIH1cbiAqIFxuICogOlxuICpcbiAqIC8vIGVhcmx5IGNhc3RcbiAqIGNvbnN0IENvbnRlbnRCYXNlID0gTW9kZWwgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbDxDb250ZW50QXR0cmlidXRlLCBDdXN0b21FdmVudD4sIENvbnRlbnRBdHRyaWJ1dGU+O1xuICogY2xhc3MgQ29udGVudCBleHRlbmRzIENvbnRlbnRCYXNlIHtcbiAqICAgOlxuICogfVxuICpcbiAqIC8vIGxhdGUgY2FzdFxuICogY2xhc3MgQ29udGVudENsYXNzIGV4dGVuZHMgTW9kZWw8Q29udGVudEF0dHJpYnV0ZSwgQ3VzdG9tRXZlbnQ+IHtcbiAqICAgOlxuICogfVxuICogY29uc3QgQ29udGVudCA9IENvbnRlbnRDbGFzcyBhcyBNb2RlbENvbnN0cnVjdG9yPENvbnRlbnRDbGFzcywgQ29udGVudEF0dHJpYnV0ZT47XG4gKlxuICogY29uc3QgY29udGVudCA9IG5ldyBDb250ZW50KHsgLi4uIH0pO1xuICogY29udGVudC50cmlnZ2VyKCdmaXJlJywgdHJ1ZSwgMTAwKTtcbiAqIGBgYFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTW9kZWw8VCBleHRlbmRzIG9iamVjdCA9IGFueSwgVEV2ZW50IGV4dGVuZHMgTW9kZWxFdmVudDxUPiA9IE1vZGVsRXZlbnQ8VD4+IGV4dGVuZHMgRXZlbnRSZWNlaXZlciBpbXBsZW1lbnRzIEV2ZW50U291cmNlPFRFdmVudD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgSUQgYXR0cmlidXRlIG5hbWUuXG4gICAgICogQGphIElEIOOCouODiOODquODk+ODpeODvOODiOWQjeOBq+OCouOCr+OCu+OCuVxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgc3RhdGljIGlkQXR0cmlidXRlID0gJ2lkJztcblxuICAgIC8qKlxuICAgICAqIEBlbiBBdHRyaWJ1dGVzIHBvb2xcbiAgICAgKiBAamEg5bGe5oCn5qC857SN6aCY5Z+fXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTxUPjtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgaW5pdGlhbCBhdHRyaWJ1dGUgdmFsdWVzXG4gICAgICogIC0gYGphYCDlsZ7mgKfjga7liJ3mnJ/lgKTjgpLmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhdHRyaWJ1dGVzOiBSZXF1aXJlZDxUPiwgb3B0aW9ucz86IE1vZGVsQ29uc3RydWN0aW9uT3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IGF0dHJzID0gb3B0cy5wYXJzZSA/IHRoaXMucGFyc2UoYXR0cmlidXRlcywgb3B0cykgYXMgVCA6IGF0dHJpYnV0ZXM7XG4gICAgICAgIGNvbnN0IHByb3BzOiBQcm9wZXJ0eTxUPiA9IHtcbiAgICAgICAgICAgIGF0dHJzOiBPYnNlcnZhYmxlT2JqZWN0LmZyb20oYXR0cnMpIGFzIEFjY2Vzc2libGU8T2JzZXJ2YWJsZU9iamVjdD4sXG4gICAgICAgICAgICBiYXNlQXR0cnM6IHsgLi4uYXR0cnMgfSxcbiAgICAgICAgICAgIHByZXZBdHRyczogeyAuLi5hdHRycyB9LFxuICAgICAgICAgICAgY2lkOiBsdWlkKCdtb2RlbDonLCA4KSxcbiAgICAgICAgICAgIG9wdGlvbnM6IG9wdHMsXG4gICAgICAgICAgICBjaGFuZ2VGaXJlZDogZmFsc2UsXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBfcHJvcGVydGllcywgeyB2YWx1ZTogcHJvcHMgfSk7XG5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoYXR0cnMpKSB7XG4gICAgICAgICAgICB0aGlzW19kZWZpbmVBdHRyaWJ1dGVzXSh0aGlzLCBrZXkpO1xuICAgICAgICB9XG5cbiAgICAgICAgKHRoaXMgYXMgYW55KVtfY2hhbmdlSGFuZGxlcl0gPSAoKSA9PiB7XG4gICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGNoYW5nZScsIHRoaXMgYXMgTW9kZWwpO1xuXG4gICAgICAgICAgICBjb25zdCB7IF9wcmV2QXR0cnMsIF9hdHRycyB9ID0gdGhpcztcbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZWRLZXlzID0gT2JqZWN0LmtleXMoZGlmZihfcHJldkF0dHJzLCBfYXR0cnMgYXMgdW5rbm93biBhcyBQYXJ0aWFsPFQ+KSk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBjaGFuZ2VkS2V5cykge1xuICAgICAgICAgICAgICAgICh0aGlzIGFzIGFueSkudHJpZ2dlcihgQGNoYW5nZToke2tleX1gLCB0aGlzLCBfYXR0cnNba2V5XSwgX3ByZXZBdHRyc1trZXldLCBrZXkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VGaXJlZCA9IHRydWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpc1tfdmFsaWRhdGVdKHt9LCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGF0dHJpYnV0ZSB1cGRhdGUgY29yZSAqL1xuICAgIHByaXZhdGUgW191cGRhdGVBdHRyaWJ1dGVzXShuYW1lOiBzdHJpbmcsIHZhbDogdW5rbm93bik6IHZvaWQge1xuICAgICAgICBpZiAoIWRlZXBFcXVhbCh0aGlzLl9hdHRyc1tuYW1lXSwgdmFsKSkge1xuICAgICAgICAgICAgY29uc3QgeyBhdHRycywgY2hhbmdlRmlyZWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICAgICAgaWYgKGNoYW5nZUZpcmVkKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY2hhbmdlRmlyZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5wcmV2QXR0cnMgPSB7IC4uLmF0dHJzIH0gYXMgVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnM7XG4gICAgICAgICAgICBhc3NpZ25WYWx1ZSh0aGlzLl9wcmV2QXR0cnMsIG5hbWUsIGF0dHJzW25hbWVdKTtcbiAgICAgICAgICAgIGFzc2lnblZhbHVlKGF0dHJzLCBuYW1lLCB2YWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBhdHRyaWJ1dGUgYnJpZGdlIGRlZiAqL1xuICAgIHByaXZhdGUgW19kZWZpbmVBdHRyaWJ1dGVzXShpbnN0YW5jZTogb2JqZWN0LCBuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgcHJvdG8gPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG4gICAgICAgIGlmICghKG5hbWUgaW4gcHJvdG8pKSB7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sIG5hbWUsIHtcbiAgICAgICAgICAgICAgICBnZXQoKTogdW5rbm93biB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9hdHRyc1tuYW1lXTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldCh2YWw6IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfdXBkYXRlQXR0cmlidXRlc10obmFtZSwgdmFsKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogcHVibGljIHByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29udGVudCBJRC5cbiAgICAgKiBAamEg44Kz44Oz44OG44Oz44OEIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBpZEF0dHIgPSBpZEF0dHJpYnV0ZSh0aGlzLCAnaWQnKTtcbiAgICAgICAgY29uc3QgeyBjaWQsIGF0dHJzIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIChpZEF0dHIgaW4gYXR0cnMpID8gYXR0cnNbaWRBdHRyXSBhcyBzdHJpbmcgfHwgY2lkIDogY2lkO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBwcm90ZWN0ZWQgcHJvcGVydGllc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfYXR0cnMoKTogQWNjZXNzaWJsZTxPYnNlcnZhYmxlT2JqZWN0PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5hdHRycztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVmYXVsdCBhdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOaXouWumuWApOWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2Jhc2VBdHRycygpOiBUIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmJhc2VBdHRycztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUHJldmlvdXMgYXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDlpInmm7TliY3jga7lsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9wcmV2QXR0cnMoKTogQWNjZXNzaWJsZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5wcmV2QXR0cnMgYXMgQWNjZXNzaWJsZTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hhbmdlZCBhdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWkieabtOOBruOBguOBo+OBn+WxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2NoYW5nZWRBdHRycygpOiBQYXJ0aWFsPFQ+IHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpc1tfcHJvcGVydGllc10uY2hhbmdlZEF0dHJzKSB7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnMgPSBkaWZmKHRoaXMuX2Jhc2VBdHRycywgdGhpcy5fYXR0cnMgYXMgdW5rbm93biBhcyBQYXJ0aWFsPFQ+KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY2hhbmdlZEF0dHJzIGFzIFBhcnRpYWw8VD47IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVubmVjZXNzYXJ5LXR5cGUtYXNzZXJ0aW9uXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBpbnRlcm5hbCBjb250ZW50IElELlxuICAgICAqIEBqYSDlhoXpg6jjga7jgrPjg7Pjg4bjg7Pjg4QgSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY2lkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jaWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjcmVhdGluZyBvcHRpb25zLlxuICAgICAqIEBqYSDmp4vnr4nmmYLjga7jgqrjg5fjgrfjg6fjg7PjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9vcHRpb25zKCk6IE1vZGVsU2V0T3B0aW9ucyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5vcHRpb25zO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IGV2ZW50c1xuXG4gICAgLyoqXG4gICAgICogQGVuIEV2ZW50U291cmNlIHR5cGUgcmVzb2x2ZXIuXG4gICAgICogQGphIEV2ZW50U291cmNlIOWei+ino+axuueUqOODmOODq+ODkeODvOOCouOCr+OCu+ODg+OCtVxuICAgICAqL1xuICAgIGdldCAkKCk6IEV2ZW50U291cmNlPFRFdmVudD4ge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGJyb2tlciBhY2Nlc3MgKi9cbiAgICBwcml2YXRlIGdldCBbX2Jyb2tlcl0oKTogRXZlbnRCcm9rZXI8YW55PiB7XG4gICAgICAgIHJldHVybiAodGhpcy5fYXR0cnMgYXMgSU9ic2VydmFibGUgYXMgSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2VzcykuZ2V0QnJva2VyKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHdoZXRoZXIgdGhpcyBvYmplY3QgaGFzIGNsaWVudHMuXG4gICAgICogQGphIOOCr+ODqeOCpOOCouODs+ODiOOBjOWtmOWcqOOBmeOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgaGFzTGlzdGVuZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIFRFdmVudD4oY2hhbm5lbD86IENoYW5uZWwsIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxURXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19icm9rZXJdLmhhc0xpc3RlbmVyKGNoYW5uZWwsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyByZWdpc3RlcmVkIGNoYW5uZWwga2V5cy5cbiAgICAgKiBAamEg55m76Yyy44GV44KM44Gm44GE44KL44OB44Oj44ON44Or44Kt44O844KS6L+U5Y20XG4gICAgICovXG4gICAgY2hhbm5lbHMoKTogKGtleW9mIFRFdmVudClbXSB7XG4gICAgICAgIHJldHVybiB0aGlzW19icm9rZXJdLmNoYW5uZWxzKCkuZmlsdGVyKGMgPT4gJ0AnICE9PSBjKSBhcyAoa2V5b2YgVEV2ZW50KVtdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBOb3RpZnkgZXZlbnQgdG8gY2xpZW50cy5cbiAgICAgKiBAamEgZXZlbnQg55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgYXJndW1lbnRzIGZvciBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWw44Gr5rih44GZ5byV5pWwXG4gICAgICovXG4gICAgcHVibGljIHRyaWdnZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIFRFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCwgLi4uYXJnczogQXJndW1lbnRzPFBhcnRpYWw8VEV2ZW50W0NoYW5uZWxdPj4pOiB2b2lkIHtcbiAgICAgICAgKHRoaXNbX2Jyb2tlcl0gYXMgYW55KS50cmlnZ2VyKGNoYW5uZWwsIC4uLmFyZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBldmVyeXRoaW5nIGlzIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/jgZnjgbnjgabop6PpmaRcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgYWxsIHNhbWUgYGNoYW5uZWxgIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lkIzkuIAgYGNoYW5uZWxgIOOBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIHB1YmxpYyBvZmY8Q2hhbm5lbCBleHRlbmRzIGtleW9mIFRFdmVudD4oY2hhbm5lbD86IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxURXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2F0dHJzLm9mZihjaGFubmVsIGFzIGFueSwgbGlzdGVuZXIgYXMgYW55KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgb248Q2hhbm5lbCBleHRlbmRzIGtleW9mIFRFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8VEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHRoaXMuX2F0dHJzLm9uKCdAJywgKHRoaXMgYXMgYW55KVtfY2hhbmdlSGFuZGxlcl0pO1xuICAgICAgICByZXR1cm4gdGhpcy5fYXR0cnMub24oY2hhbm5lbCBhcyBhbnksIGxpc3RlbmVyIGFzIGFueSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKSBidXQgaXQgY2F1c2VzIHRoZSBib3VuZCBjYWxsYmFjayB0byBvbmx5IGZpcmUgb25jZSBiZWZvcmUgYmVpbmcgcmVtb3ZlZC5cbiAgICAgKiBAamEg5LiA5bqm44Gg44GR44OP44Oz44OJ44Oq44Oz44Kw5Y+v6IO944Gq44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIG9uY2U8Q2hhbm5lbCBleHRlbmRzIGtleW9mIFRFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8VEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLm9uKGNoYW5uZWwsIGxpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgbWFuYWdlZCA9IHRoaXMub24oY2hhbm5lbCwgKCkgPT4ge1xuICAgICAgICAgICAgY29udGV4dC51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgbWFuYWdlZC51bnN1YnNjcmliZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogdmFsaWRhdGlvblxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHZhbGlkIG9yIG5vdC5cbiAgICAgKiBAamEg5qSc6Ki844Gu5oiQ5ZCm44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGlzVmFsaWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBTVUNDRUVERUQodGhpcy52YWxpZGF0ZSh7IHNpbGVudDogdHJ1ZSB9KS5jb2RlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmFsaWRhdGUgcmVzdWx0IGFjY2Vzc2VyLlxuICAgICAqIEBqYSDmpJzoqLzntZDmnpzjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgdmFsaWRhdGUob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogUmVzdWx0IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyB2YWxpZGF0ZTogdHJ1ZSwgbm9UaHJvdzogdHJ1ZSwgZXh0ZW5kOiBmYWxzZSB9LCBvcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3ZhbGlkYXRlXSh7fSwgb3B0cyk7XG4gICAgfVxuXG4gICAgLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzICovXG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmFsaWRhdGUgZGF0YSBtZXRob2QuXG4gICAgICogQGphIOODh+ODvOOCv+aknOiovFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgdmFsaWRhdGVlIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgamFgIOiiq+aknOiovOWxnuaAp1xuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCB2YWxpZGF0ZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDmpJzoqLzjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgdmFsaWRhdGVBdHRyaWJ1dGVzPEEgZXh0ZW5kcyBUPihhdHRyaWJ1dGVzOiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+LCBvcHRpb25zPzogTW9kZWxWYWxpZGF0ZUF0dHJpYnV0ZU9wdGlvbnMpOiBSZXN1bHQge1xuICAgICAgICByZXR1cm4gUkVTVUxUX1ZBTElEX0FUVFJTO1xuICAgIH1cblxuICAgIC8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzICovXG5cbiAgICAvKiogQGludGVybmFsIHZhbGlkYXRlICovXG4gICAgcHJpdmF0ZSBbX3ZhbGlkYXRlXTxBIGV4dGVuZHMgVD4oYXR0cmlidXRlczogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPiwgb3B0aW9ucz86IE1vZGVsU2V0T3B0aW9ucyk6IFJlc3VsdCB8IG5ldmVyIHtcbiAgICAgICAgY29uc3QgeyB2YWxpZGF0ZSwgc2lsZW50LCBub1Rocm93IH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBpZiAodmFsaWRhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGF0dHJzID0geyAuLi50aGlzLl9hdHRycywgLi4uYXR0cmlidXRlcyB9O1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy52YWxpZGF0ZUF0dHJpYnV0ZXMoYXR0cnMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKEZBSUxFRChyZXN1bHQuY29kZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGludmFsaWQnLCB0aGlzIGFzIE1vZGVsLCBhdHRycywgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFub1Rocm93KSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFJFU1VMVF9WQUxJRF9BVFRSUztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IGF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgW1tNb2RlbF1dIGhhcyB2YWxpZCBwcm9wZXJ0eS4gKG5vdCBgbnVsbGAgb3IgYHVuZGVmaW5lZGApXG4gICAgICogQGphIFtbTW9kZWxdXSDjgYzmnInlirnjgarjg5fjg63jg5Hjg4bjgqPjgpLmjIHjgaPjgabjgYTjgovjgYvnorroqo0gKGBudWxsYCDjgb7jgZ/jga8gYHVuZGVmaW5lZGAg44Gn44Gq44GEKVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXMoYXR0cmlidXRlOiBrZXlvZiBUKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9ICh0aGlzLl9hdHRycyBhcyB1bmtub3duIGFzIFQpW2F0dHJpYnV0ZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgSFRNTC1lc2NhcGVkIHZhbHVlIG9mIGFuIGF0dHJpYnV0ZS5cbiAgICAgKiBAamEgSFRNTCDjgafkvb/nlKjjgZnjgovmloflrZfjgpLliLblvqHmloflrZfjgavnva7mj5vjgZfjgZ/lsZ7mgKflgKTjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZXNjYXBlKGF0dHJpYnV0ZToga2V5b2YgVCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBlc2NhcGVIVE1MKHRoaXMuX2F0dHJzW2F0dHJpYnV0ZV0gYXMgUHJpbWl0aXZlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGF0dHJpYnV0ZXMgZm9yIGJhdGNoIGlucHV0IHdpdGggb3B0aW9ucy5cbiAgICAgKiBAamEg5bGe5oCn44Gu5LiA5ous6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgdXBkYXRlIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgamFgIOabtOaWsOWxnuaAp1xuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzZXQgYXR0cmlidXRlcyBvcHRpb25zXG4gICAgICogIC0gYGphYCDlsZ7mgKfmm7TmlrDnlKjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0QXR0cmlidXRlczxBIGV4dGVuZHMgVD4oYXR0cmlidXRlczogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPiwgb3B0aW9ucz86IE1vZGVsU2V0T3B0aW9ucyk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHNpbGVudCwgZXh0ZW5kIH0gPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYXR0cnMuc3VzcGVuZCh0cnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpc1tfdmFsaWRhdGVdKGF0dHJpYnV0ZXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKEZBSUxFRChyZXN1bHQuY29kZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIE9iamVjdC5rZXlzKGF0dHJpYnV0ZXMpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGF0dHIgaW4gdGhpcy5fYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfdXBkYXRlQXR0cmlidXRlc10oYXR0ciwgYXR0cmlidXRlc1thdHRyXSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChleHRlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfZGVmaW5lQXR0cmlidXRlc10odGhpcywgYXR0cik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3VwZGF0ZUF0dHJpYnV0ZXNdKGF0dHIsIGF0dHJpYnV0ZXNbYXR0cl0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGlmIChzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hdHRycy5yZXN1bWUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBhbGwgYXR0cmlidXRlcyBvbiB0aGUgW1tNb2RlbF1dLiAoc2V0IGB1bmRlZmluZWRgKVxuICAgICAqIEBqYSBbW01vZGVsXV0g44GL44KJ44GZ44G544Gm44Gu5bGe5oCn44KS5YmK6ZmkIChgdW5kZWZpbmVkYCDjgpLoqK3lrpopXG4gICAgICovXG4gICAgcHVibGljIGNsZWFyKG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgY2xlYXJBdHRycyA9IHt9IGFzIEFjY2Vzc2libGU8b2JqZWN0PjtcbiAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIE9iamVjdC5rZXlzKHRoaXMuX2Jhc2VBdHRycykpIHtcbiAgICAgICAgICAgIGNsZWFyQXR0cnNbYXR0cl0gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0QXR0cmlidXRlcyhjbGVhckF0dHJzLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGEgY29weSBvZiB0aGUgbW9kZWwncyBgYXR0cmlidXRlc2Agb2JqZWN0LlxuICAgICAqIEBqYSBNb2RlbCDlsZ7mgKflgKTjga7jgrPjg5Tjg7zjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgdG9KU09OKCk6IFQge1xuICAgICAgICByZXR1cm4gZGVlcENvcHkoeyAuLi50aGlzLl9hdHRycyB9IGFzIFQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlcyBDbG9uZSB0aGlzIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7opIfoo73jgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHB1YmxpYyBjbG9uZSgpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBjb25zdHJ1Y3RvciwgX2F0dHJzLCBfb3B0aW9ucyB9ID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyAoY29uc3RydWN0b3IgYXMgQ29uc3RydWN0b3I8dGhpcz4pKF9hdHRycywgX29wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBjaGFuZ2VkIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIOWkieabtOOBleOCjOOBn+WxnuaAp+WApOOCkuaMgeOBpOOBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZVxuICAgICAqICAtIGBlbmAgY2hlY2tlZCBhdHRyaWJ1dGVcbiAgICAgKiAgLSBgamFgIOaknOiovOOBmeOCi+WxnuaAp1xuICAgICAqL1xuICAgIHB1YmxpYyBoYXNDaGFuZ2VkKGF0dHJpYnV0ZT86IGtleW9mIFQpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0gYXR0cmlidXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gIWlzRW1wdHlPYmplY3QodGhpcy5fY2hhbmdlZEF0dHJzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBhdHRyaWJ1dGUgaW4gdGhpcy5fY2hhbmdlZEF0dHJzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBhbiBvYmplY3QgY29udGFpbmluZyBhbGwgdGhlIGF0dHJpYnV0ZXMgdGhhdCBoYXZlIGNoYW5nZWQsIG9yIGB1bmRlZmluZWRgIGlmIHRoZXJlIGFyZSBubyBjaGFuZ2VkIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIOWFpeWKm+OBl+OBnyBhdHRyaWJ1dGVzIOWApOOBruW3ruWIhuOBq+WvvuOBl+OBpuWkieabtOOBjOOBguOCi+WxnuaAp+WApOOCkui/lOWNtC4g5beu5YiG44GM44Gq44GE5aC05ZCI44GvIGB1bmRlZmllbmRgIOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIGNoZWNrZWQgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg5qSc6Ki844GZ44KL5bGe5oCnXG4gICAgICovXG4gICAgcHVibGljIGNoYW5nZWQoYXR0cmlidXRlcz86IFBhcnRpYWw8VD4pOiBQYXJ0aWFsPFQ+IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKCFhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oYXNDaGFuZ2VkKCkgPyB7IC4uLnRoaXMuX2NoYW5nZWRBdHRycyB9IDogdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgY2hhbmdlZCA9IGRpZmYodGhpcy5fYXR0cnMsIGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgcmV0dXJuICFpc0VtcHR5T2JqZWN0KGNoYW5nZWQpID8gY2hhbmdlZCA6IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHByZXZpb3VzIHZhbHVlIG9mIGFuIGF0dHJpYnV0ZSwgcmVjb3JkZWQgYXQgdGhlIHRpbWUgdGhlIGxhc3QgYEBjaGFuZ2VgIGV2ZW50IHdhcyBmaXJlZC5cbiAgICAgKiBAamEgYEBjaGFuZ2VgIOOBjOeZuueBq+OBleOCjOOBn+WJjeOBruWxnuaAp+WApOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2aW91czxLIGV4dGVuZHMga2V5b2YgVD4oYXR0cmlidXRlOiBLKTogVFtLXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wcmV2QXR0cnNbYXR0cmlidXRlXTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBzeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgYSBbW01vZGVsXV0gaXMgbmV3IGlmIGl0IGhhcyBuZXZlciBiZWVuIHNhdmVkIHRvIHRoZSBzZXJ2ZXIsIGFuZCBsYWNrcyBhbiBpZC5cbiAgICAgKiBAamEgW1tNb2RlbF1dIOOBjOOBvuOBoOOCteODvOODkOODvOOBq+WtmOWcqOOBl+OBquOBhOOBi+ODgeOCp+ODg+OCry4g5pei5a6a44Gn44GvIGBpZEF0dHJpYnV0ZWAg44Gu5pyJ54Sh44Gn5Yik5a6aXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGlzTmV3KCk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBpZEF0dHIgPSBpZEF0dHJpYnV0ZSh0aGlzLCAnaWQnKTtcbiAgICAgICAgcmV0dXJuICF0aGlzLmhhcyhpZEF0dHIgYXMga2V5b2YgVCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENvbnZlcnRzIGEgcmVzcG9uc2UgaW50byB0aGUgaGFzaCBvZiBhdHRyaWJ1dGVzIHRvIGJlIGBzZXRgIG9uIHRoZSBtb2RlbC4gVGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gaXMganVzdCB0byBwYXNzIHRoZSByZXNwb25zZSBhbG9uZy5cbiAgICAgKiBAamEg44Os44K544Od44Oz44K544Gu5aSJ5o+b44Oh44K944OD44OJLiDml6Llrprjgafjga/kvZXjgoLjgZfjgarjgYRcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBwYXJzZShyZXNwb25zZTogTW9kZWxTZWVkIHwgdm9pZCwgb3B0aW9ucz86IE1vZGVsU2V0T3B0aW9ucyk6IFQgfCB2b2lkIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlIGFzIFQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFByb3h5IFtbSURhdGFTeW5jI3N5bmNdXSBieSBkZWZhdWx0IC0tIGJ1dCBvdmVycmlkZSB0aGlzIGlmIHlvdSBuZWVkIGN1c3RvbSBzeW5jaW5nIHNlbWFudGljcyBmb3IgKnRoaXMqIHBhcnRpY3VsYXIgbW9kZWwuXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacny4g5b+F6KaB44Gr5b+c44GY44Gm44Kq44O844OQ44O844Op44Kk44OJ5Y+v6IO9LlxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gc3RyaW5nXG4gICAgICogIC0gYGphYCDjgqrjg5rjg6zjg7zjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgc3luY2hyb25pemVkIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYCDlkIzmnJ/jgZnjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHN5bmM8SyBleHRlbmRzIE1vZGVsU3luY01ldGhvZHM+KG1ldGhvZDogSywgY29udGV4dDogTW9kZWw8VD4sIG9wdGlvbnM/OiBNb2RlbERhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8TW9kZWxTeW5jUmVzdWx0PEssIFQ+PiB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0U3luYygpLnN5bmMobWV0aG9kLCBjb250ZXh0IGFzIFN5bmNDb250ZXh0PFQ+LCBvcHRpb25zKSBhcyB1bmtub3duIGFzIFByb21pc2U8TW9kZWxTeW5jUmVzdWx0PEssIFQ+PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRmV0Y2ggdGhlIFtbTW9kZWxdXSBmcm9tIHRoZSBzZXJ2ZXIsIG1lcmdpbmcgdGhlIHJlc3BvbnNlIHdpdGggdGhlIG1vZGVsJ3MgbG9jYWwgYXR0cmlidXRlcy5cbiAgICAgKiBAamEgW1tNb2RlbF1dIOWxnuaAp+OBruOCteODvOODkOODvOWQjOacny4g44Os44K544Od44Oz44K544Gu44Oe44O844K444KS5a6f6KGMXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGZldGNoKG9wdGlvbnM/OiBNb2RlbEZldGNoT3B0aW9ucyk6IFByb21pc2U8VD4ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHBhcnNlOiB0cnVlIH0sIG9wdGlvbnMsIHsgc3luY01ldGhvZDogJ3JlYWQnIH0pO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwID0gYXdhaXQgdGhpcy5zeW5jKCdyZWFkJywgdGhpcyBhcyBNb2RlbDxUPiwgb3B0cyk7XG4gICAgICAgICAgICB0aGlzLnNldEF0dHJpYnV0ZXMob3B0cy5wYXJzZSA/IHRoaXMucGFyc2UocmVzcCBhcyBNb2RlbFNlZWQsIG9wdHMpIGFzIFQgOiByZXNwLCBvcHRzKTtcbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAc3luYycsIHRoaXMgYXMgTW9kZWwsIHJlc3AgYXMgTW9kZWxTZWVkLCBvcHRzKTtcbiAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGVycm9yJywgdGhpcyBhcyBNb2RlbCwgZSwgb3B0cyk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBhIGhhc2ggb2YgW1tNb2RlbF1dIGF0dHJpYnV0ZXMsIGFuZCBzeW5jIHRoZSBtb2RlbCB0byB0aGUgc2VydmVyLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBzZXJ2ZXIgcmV0dXJucyBhbiBhdHRyaWJ1dGVzIGhhc2ggdGhhdCBkaWZmZXJzLCB0aGUgbW9kZWwncyBzdGF0ZSB3aWxsIGJlIGBzZXRgIGFnYWluLlxuICAgICAqIEBqYSBbW01vZGVsXV0g5bGe5oCn44KS44K144O844OQ44O844Gr5L+d5a2YLiA8YnI+XG4gICAgICogICAgIOeVsOOBquOCi+WxnuaAp+OBjOi/lOWNtOOBleOCjOOCi+WgtOWQiOOBr+WGjeioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgdXBkYXRlIGF0dHJpYnV0ZSBrZXlcbiAgICAgKiAgLSBgamFgIOabtOaWsOWxnuaAp+OCreODvFxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgdXBkYXRlIGF0dHJpYnV0ZSB2YWx1ZVxuICAgICAqICAtIGBqYWAg5pu05paw5bGe5oCn5YCkXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNhdmUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5L+d5a2Y44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIHNhdmU8SyBleHRlbmRzIGtleW9mIFQ+KGtleT86IGtleW9mIFQsIHZhbHVlPzogVFtLXSwgb3B0aW9ucz86IE1vZGVsU2F2ZU9wdGlvbnMpOiBQcm9taXNlPFQgfCB2b2lkPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgYSBoYXNoIG9mIFtbTW9kZWxdXSBhdHRyaWJ1dGVzLCBhbmQgc3luYyB0aGUgbW9kZWwgdG8gdGhlIHNlcnZlci4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgc2VydmVyIHJldHVybnMgYW4gYXR0cmlidXRlcyBoYXNoIHRoYXQgZGlmZmVycywgdGhlIG1vZGVsJ3Mgc3RhdGUgd2lsbCBiZSBgc2V0YCBhZ2Fpbi5cbiAgICAgKiBAamEgW1tNb2RlbF1dIOWxnuaAp+OCkuOCteODvOODkOODvOOBq+S/neWtmC4gPGJyPlxuICAgICAqICAgICDnlbDjgarjgovlsZ7mgKfjgYzov5TljbTjgZXjgozjgovloLTlkIjjga/lho3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCB1cGRhdGUgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg5pu05paw5bGe5oCnXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNhdmUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5L+d5a2Y44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIHNhdmU8QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4gfCBOdWxsaXNoLCBvcHRpb25zPzogTW9kZWxTYXZlT3B0aW9ucyk6IFByb21pc2U8VCB8IHZvaWQ+O1xuXG4gICAgcHVibGljIGFzeW5jIHNhdmUoLi4uYXJnczogdW5rbm93bltdKTogUHJvbWlzZTxUIHwgdm9pZD4ge1xuICAgICAgICBjb25zdCB7IGF0dHJzLCBvcHRpb25zIH0gPSBwYXJzZVNhdmVBcmdzKC4uLmFyZ3MpO1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHZhbGlkYXRlOiB0cnVlLCBwYXJzZTogdHJ1ZSwgd2FpdDogdHJ1ZSwgZXh0ZW5kOiB0cnVlIH0sIG9wdGlvbnMpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IHdhaXQgfSA9IG9wdHM7XG5cbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZCA9IG9wdHMuc3luY01ldGhvZCA9IHRoaXMuaXNOZXcoKSA/ICdjcmVhdGUnIDogb3B0cy5wYXRjaCA/ICdwYXRjaCcgOiAndXBkYXRlJztcblxuICAgICAgICAgICAgaWYgKGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF3YWl0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlcyhhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmJhc2VBdHRycyA9IHsgLi4udGhpcy5fYXR0cnMgfSBhcyBUO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3ZhbGlkYXRlXShhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICgncGF0Y2gnID09PSBtZXRob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0cy5kYXRhID0gYXR0cnM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0cy5kYXRhID0gT2JqZWN0LmFzc2lnbih0aGlzLnRvSlNPTigpLCBhdHRycyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXNwID0gYXdhaXQgdGhpcy5zeW5jKG1ldGhvZCwgdGhpcyBhcyBNb2RlbDxUPiwgb3B0cyk7XG5cbiAgICAgICAgICAgIGxldCBzZXJ2ZXJBdHRycyA9IG9wdHMucGFyc2UgPyB0aGlzLnBhcnNlKHJlc3AsIG9wdHMpIDogcmVzcDtcbiAgICAgICAgICAgIGlmIChhdHRycyAmJiB3YWl0KSB7XG4gICAgICAgICAgICAgICAgc2VydmVyQXR0cnMgPSBPYmplY3QuYXNzaWduKHt9LCBhdHRycywgc2VydmVyQXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlzT2JqZWN0KHNlcnZlckF0dHJzKSAmJiAhaXNFbXB0eU9iamVjdChzZXJ2ZXJBdHRycykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEF0dHJpYnV0ZXMoc2VydmVyQXR0cnMgYXMgVCwgb3B0cyk7XG4gICAgICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uYmFzZUF0dHJzID0geyAuLi50aGlzLl9hdHRycyB9IGFzIFQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAc3luYycsIHRoaXMgYXMgTW9kZWwsIHJlc3AgYXMgTW9kZWxTZWVkLCBvcHRzKTtcbiAgICAgICAgICAgIHJldHVybiByZXNwIGFzIFQ7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAZXJyb3InLCB0aGlzIGFzIE1vZGVsLCBlLCBvcHRzKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVzdHJveSB0aGlzIFtbTW9kZWxdXSBvbiB0aGUgc2VydmVyIGlmIGl0IHdhcyBhbHJlYWR5IHBlcnNpc3RlZC5cbiAgICAgKiBAamEgW1tNb2RlbF1dIOOCkuOCteODvOODkOODvOOBi+OCieWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGRlc3Ryb3kgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg56C05qOE44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGRlc3Ryb3kob3B0aW9ucz86IE1vZGVsRGVzdHJveU9wdGlvbnMpOiBQcm9taXNlPFQgfCB2b2lkPiB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgd2FpdDogdHJ1ZSB9LCBvcHRpb25zLCB7IHN5bmNNZXRob2Q6ICdkZWxldGUnIH0pO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IHdhaXQsIGNhbmNlbCB9ID0gb3B0cztcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0cyA9ICF0aGlzLmlzTmV3KCk7XG4gICAgICAgICAgICBjb25zdCBkZXN0cnVjdCA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGRlc3Ryb3knLCB0aGlzIGFzIE1vZGVsLCBvcHRzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICF3YWl0ICYmIGRlc3RydWN0KCk7XG5cbiAgICAgICAgICAgIGxldCByZXNwOiBNb2RlbFNlZWQgfCB2b2lkO1xuICAgICAgICAgICAgaWYgKCFleGlzdHMpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBjYyhjYW5jZWwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNwID0gYXdhaXQgdGhpcy5zeW5jKCdkZWxldGUnLCB0aGlzIGFzIE1vZGVsPFQ+LCBvcHRzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgd2FpdCAmJiBkZXN0cnVjdCgpO1xuICAgICAgICAgICAgZXhpc3RzICYmICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAc3luYycsIHRoaXMgYXMgTW9kZWwsIHJlc3AgYXMgTW9kZWxTZWVkLCBvcHRzKTtcblxuICAgICAgICAgICAgcmV0dXJuIHJlc3AgYXMgVDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BlcnJvcicsIHRoaXMgYXMgTW9kZWwsIGUsIG9wdHMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gbWl4aW4g44Gr44KI44KLIGBpbnN0YW5jZW9mYCDjga/nhKHlirnjgavoqK3lrppcbnNldE1peENsYXNzQXR0cmlidXRlKE1vZGVsIGFzIHVua25vd24gYXMgQ2xhc3MsICdpbnN0YW5jZU9mJywgbnVsbCk7XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFtbTW9kZWxdXS5cbiAqIEBqYSBbW01vZGVsXV0g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNNb2RlbCh4OiB1bmtub3duKTogeCBpcyBNb2RlbCB7XG4gICAgcmV0dXJuIHggaW5zdGFuY2VvZiBNb2RlbDtcbn1cblxuLyoqXG4gKiBAZW4gUXVlcnkgW1tNb2RlbF1dIGBpZC1hdHRyaWJ1dGVgLlxuICogQGphIFtbTW9kZWxdXSDjga4gYGlkLWF0dHJpYnV0ZWAg44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpZEF0dHJpYnV0ZSh4OiB1bmtub3duLCBmYWxsYmFjayA9ICcnKTogc3RyaW5nIHtcbiAgICByZXR1cm4gaXNPYmplY3QoeCkgPyAoKHguY29uc3RydWN0b3IgYXMgYW55KVsnaWRBdHRyaWJ1dGUnXSB8fCBmYWxsYmFjaykgOiBmYWxsYmFjaztcbn1cbiJdLCJuYW1lcyI6WyJjYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUE7OztBQUdHO0FBRUgsQ0FBQSxZQUFxQjtBQU1q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