/*!
 * @cdp/model 0.9.5
 *   generic model scheme
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/events'), require('@cdp/promise'), require('@cdp/observable'), require('@cdp/result'), require('@cdp/data-sync')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/events', '@cdp/promise', '@cdp/observable', '@cdp/result', '@cdp/data-sync'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
}(this, (function (exports, coreUtils, events, promise, observable, result, dataSync) { 'use strict';

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
    const RESULT_VALID_ATTRS = Object.freeze(result.makeResult(result.RESULT_CODE.SUCCESS, 'valid attribute.'));
    /** @internal helper for save() */
    function parseSaveArgs(...args) {
        let [key, value, options] = args; // eslint-disable-line prefer-const
        let attrs;
        if (null == key || coreUtils.isObject(key)) {
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
    class Model extends events.EventReceiver {
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
                attrs: observable.ObservableObject.from(attrs),
                baseAttrs: { ...attrs },
                prevAttrs: { ...attrs },
                cid: coreUtils.luid('model:', 8),
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
                        if (!coreUtils.deepEqual(this._attrs[name], val)) {
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
                this[_properties].changedAttrs = coreUtils.diff(this._baseAttrs, this._attrs);
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
            if ('*' === channel || '@change' === channel || (coreUtils.isArray(channel) && channel.includes('@change'))) {
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
            return result.SUCCEEDED(this.validate({ silent: true }).code);
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
                const result$1 = this.validateAttributes(attrs, options);
                if (result.FAILED(result$1.code)) {
                    if (!silent) {
                        this.trigger('@invalid', this, attrs, result$1);
                    }
                    if (!noThrow) {
                        throw result$1;
                    }
                }
                return result$1;
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
            return coreUtils.escapeHTML(this._attrs[attribute]);
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
                const result$1 = this[_validate](attributes, options);
                if (result.FAILED(result$1.code)) {
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
            return coreUtils.deepCopy({ ...this._attrs });
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
                return !coreUtils.isEmptyObject(this._changedAttrs);
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
                const changed = coreUtils.diff(this._attrs, attributes);
                return !coreUtils.isEmptyObject(changed) ? changed : undefined;
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
            return dataSync.defaultSync().sync(method, context, options);
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
                if (coreUtils.isObject(serverAttrs) && !coreUtils.isEmptyObject(serverAttrs)) {
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
                    await promise.checkCanceled(cancel);
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
    coreUtils.setMixClassAttribute(Model, 'instanceOf', null);
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
        return coreUtils.isObject(x) ? (x.constructor['idAttribute'] || fallback) : fallback;
    }

    exports.Model = Model;
    exports.RESULT_VALID_ATTRS = RESULT_VALID_ATTRS;
    exports.idAttribute = idAttribute;
    exports.isModel = isModel;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwuanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJiYXNlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZVxuICwgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICwgIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC1wbHVzLW9wZXJhbmRzXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgTU9ERUwgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyA1LFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8temAmuOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX01PREVMX0RFQ0xBUkUgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfREFUQSA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLk1PREVMICsgMSwgJ2ludmFsaWQgZGF0YS4nKSxcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQge1xuICAgIE5pbCxcbiAgICBQbGFpbk9iamVjdCxcbiAgICBDb25zdHJ1Y3RvcixcbiAgICBDbGFzcyxcbiAgICBBcmd1bWVudHMsXG4gICAgaXNBcnJheSxcbiAgICBpc09iamVjdCxcbiAgICBpc0VtcHR5T2JqZWN0LFxuICAgIGx1aWQsXG4gICAgZXNjYXBlSFRNTCxcbiAgICBkZWVwQ29weSxcbiAgICBkZWVwRXF1YWwsXG4gICAgZGlmZixcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgU3Vic2NyaXB0aW9uLFxuICAgIFNpbGVuY2VhYmxlLFxuICAgIEV2ZW50QnJva2VyLFxuICAgIEV2ZW50UmVjZWl2ZXIsXG4gICAgRXZlbnRTb3VyY2UsXG59IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IGNoZWNrQ2FuY2VsZWQgYXMgY2MgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHtcbiAgICBJT2JzZXJ2YWJsZSxcbiAgICBJT2JzZXJ2YWJsZUV2ZW50QnJva2VyQWNjZXNzLFxuICAgIE9ic2VydmFibGVPYmplY3QsXG59IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQge1xuICAgIFJFU1VMVF9DT0RFLFxuICAgIFJlc3VsdCxcbiAgICBtYWtlUmVzdWx0LFxuICAgIFNVQ0NFRURFRCxcbiAgICBGQUlMRUQsXG59IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IFN5bmNDb250ZXh0LCBkZWZhdWx0U3luYyB9IGZyb20gJ0BjZHAvZGF0YS1zeW5jJztcbmltcG9ydCB7XG4gICAgTW9kZWxFdmVudCxcbiAgICBNb2RlbFZhbGlkYXRlQXR0cmlidXRlT3B0aW9ucyxcbiAgICBNb2RlbEF0dHJpYnV0ZUlucHV0LFxuICAgIE1vZGVsU2V0T3B0aW9ucyxcbiAgICBNb2RlbENvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgTW9kZWxTeW5jTWV0aG9kcyxcbiAgICBNb2RlbFN5bmNSZXN1bHQsXG4gICAgTW9kZWxEYXRhU3luY09wdGlvbnMsXG4gICAgTW9kZWxGZXRjaE9wdGlvbnMsXG4gICAgTW9kZWxTYXZlT3B0aW9ucyxcbiAgICBNb2RlbERlc3Ryb3lPcHRpb25zLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG5jb25zdCBfZGVmaW5lQXR0cmlidXRlcyA9IFN5bWJvbCgnZGVmaW5lJyk7XG5jb25zdCBfdmFsaWRhdGUgICAgICAgICA9IFN5bWJvbCgndmFsaWRhdGUnKTtcbmNvbnN0IF9jaGFuZ2VIYW5kbGVyICAgID0gU3ltYm9sKCdvbmNoYW5nZScpO1xuY29uc3QgX2Jyb2tlciAgICAgICAgICAgPSBTeW1ib2woJ2Jyb2tlcicpO1xuY29uc3QgX3Byb3BlcnRpZXMgICAgICAgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5PFQ+IHtcbiAgICBhdHRyczogT2JzZXJ2YWJsZU9iamVjdDtcbiAgICBiYXNlQXR0cnM6IFQ7XG4gICAgcHJldkF0dHJzOiBUO1xuICAgIGNoYW5nZWRBdHRycz86IFBhcnRpYWw8VD47XG4gICAgcmVhZG9ubHkgY2lkOiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgb3B0aW9uczogTW9kZWxTZXRPcHRpb25zO1xufVxuXG4vKipcbiAqIEBlbiBWYWxpZCBhdHRyaWJ1dGVzIHJlc3VsdC5cbiAqIEBqYSDlsZ7mgKfmpJzoqLzjga7mnInlirnlgKRcbiAqL1xuZXhwb3J0IGNvbnN0IFJFU1VMVF9WQUxJRF9BVFRSUyA9IE9iamVjdC5mcmVlemUobWFrZVJlc3VsdChSRVNVTFRfQ09ERS5TVUNDRVNTLCAndmFsaWQgYXR0cmlidXRlLicpKTtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNhdmUoKSAqL1xuZnVuY3Rpb24gcGFyc2VTYXZlQXJnczxBIGV4dGVuZHMgb2JqZWN0PiguLi5hcmdzOiBhbnlbXSk6IHsgYXR0cnM/OiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+OyBvcHRpb25zPzogTW9kZWxTYXZlT3B0aW9uczsgfSB7XG4gICAgbGV0IFtrZXksIHZhbHVlLCBvcHRpb25zXSA9IGFyZ3M7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgcHJlZmVyLWNvbnN0XG4gICAgbGV0IGF0dHJzOiBhbnk7XG5cbiAgICBpZiAobnVsbCA9PSBrZXkgfHwgaXNPYmplY3Qoa2V5KSkge1xuICAgICAgICBhdHRycyA9IGtleTtcbiAgICAgICAgb3B0aW9ucyA9IHZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIChhdHRycyA9IHt9KVtrZXldID0gdmFsdWU7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5kYXRhKSB7XG4gICAgICAgIGF0dHJzID0gT2JqZWN0LmFzc2lnbihhdHRycyB8fCB7fSwgb3B0aW9ucy5kYXRhKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBhdHRycywgb3B0aW9ucyB9O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gW1tNb2RlbF1dIGJhc2UgY2xhc3MgZGVmaW5pdGlvbi5cbiAqIEBqYSBbW01vZGVsXV0g44Gu5Z+65bqV44Kv44Op44K55a6a576pXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBNb2RlbCwgTW9kZWxDb25zdHJ1Y3RvciB9IGZyb20gJ0BjZHAvbW9kZWwnO1xuICpcbiAqIGludGVyZmFjZSBDb250ZW50QXR0cmlidXRlIHtcbiAqICAgdXJpOiBzdHJpbmc7XG4gKiAgIHJlYWRvbmx5IHNpemU6IG51bWJlcjtcbiAqICAgY29va2llPzogc3RyaW5nO1xuICogfVxuICogYGBgXG4gKlxuICogLSBCYXNpYyBVc2FnZVxuICpcbiAqIGBgYHRzXG4gKiAvLyBlYXJseSBjYXN0XG4gKiBjb25zdCBDb250ZW50QmFzZSA9IE1vZGVsIGFzIE1vZGVsQ29uc3RydWN0b3I8TW9kZWw8Q29udGVudEF0dHJpYnV0ZT4sIENvbnRlbnRBdHRyaWJ1dGU+O1xuICpcbiAqIGNsYXNzIENvbnRlbnQgZXh0ZW5kcyBDb250ZW50QmFzZSB7XG4gKiAgIGNvbnN0cnVjdG9yKGF0dHJzOiBDb250ZW50QXR0cmlidXRlKSB7XG4gKiAgICAgc3VwZXIoYXR0cnMpO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBvclxuICpcbiAqIGBgYHRzXG4gKiAvLyBsYXRlIGNhc3RcbiAqIGNsYXNzIENvbnRlbnRDbGFzcyBleHRlbmRzIE1vZGVsPENvbnRlbnRBdHRyaWJ1dGU+IHtcbiAqICAgY29uc3RydWN0b3IoYXR0cnM6IENvbnRlbnRBdHRyaWJ1dGUpIHtcbiAqICAgICBzdXBlcihhdHRycyk7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBDb250ZW50ID0gQ29udGVudENsYXNzIGFzIE1vZGVsQ29uc3RydWN0b3I8Q29udGVudENsYXNzLCBDb250ZW50QXR0cmlidXRlPjtcbiAqIGBgYFxuICogdGhlblxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBjb250ZW50ID0gbmV3IENvbnRlbnQoe1xuICogICB1cmk6ICdhYWEudHh0JyxcbiAqICAgc2l6ZTogMTAsXG4gKiAgIGNvb2tpZTogdW5kZWZpbmVkLCAvLyBuZWVkIGV4cGxpY2l0IGFzc2lnblxuICogfSk7XG4gKlxuICogY29uc29sZS5sb2coY29udGVudC51cmkpOyAgICAvLyAnYWFhLnR4dCdcbiAqIGNvbnNvbGUubG9nKGNvbnRlbnQuc2l6ZSk7ICAgLy8gJzEwJ1xuICogY29uc29sZS5sb2coY29udGVudC5jb29raWUpOyAvLyAndW5kZWZpbmVkJ1xuICogYGBgXG4gKlxuICogLSBVc2luZyBDdXN0b20gRXZlbnRcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgTW9kZWxFdmVudCB9IGZyb20gJ0BjZHAvbW9kZWwnO1xuICpcbiAqIGludGVyZmFjZSBDdXN0b21FdmVudCBleHRlbmRzIE1vZGVsRXZlbnQ8Q29udGVudEF0dHJpYnV0ZT4ge1xuICogICBmaXJlOiBbYm9vbGVhbiwgbnVtYmVyXTtcbiAqIH1cbiAqIFxuICogOlxuICpcbiAqIC8vIGVhcmx5IGNhc3RcbiAqIGNvbnN0IENvbnRlbnRCYXNlID0gTW9kZWwgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbDxDb250ZW50QXR0cmlidXRlLCBDdXN0b21FdmVudD4sIENvbnRlbnRBdHRyaWJ1dGU+O1xuICogY2xhc3MgQ29udGVudCBleHRlbmRzIENvbnRlbnRCYXNlIHtcbiAqICAgOlxuICogfVxuICpcbiAqIC8vIGxhdGUgY2FzdFxuICogY2xhc3MgQ29udGVudENsYXNzIGV4dGVuZHMgTW9kZWw8Q29udGVudEF0dHJpYnV0ZSwgQ3VzdG9tRXZlbnQ+IHtcbiAqICAgOlxuICogfVxuICogY29uc3QgQ29udGVudCA9IENvbnRlbnRDbGFzcyBhcyBNb2RlbENvbnN0cnVjdG9yPENvbnRlbnRDbGFzcywgQ29udGVudEF0dHJpYnV0ZT47XG4gKlxuICogY29uc3QgY29udGVudCA9IG5ldyBDb250ZW50KHsgLi4uIH0pO1xuICogY29udGVudC50cmlnZ2VyKCdmaXJlJywgdHJ1ZSwgMTAwKTtcbiAqIGBgYFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTW9kZWw8VCBleHRlbmRzIG9iamVjdCA9IG9iamVjdCwgRXZlbnQgZXh0ZW5kcyBNb2RlbEV2ZW50PFQ+ID0gTW9kZWxFdmVudDxUPj4gZXh0ZW5kcyBFdmVudFJlY2VpdmVyIGltcGxlbWVudHMgRXZlbnRTb3VyY2U8RXZlbnQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IElEIGF0dHJpYnV0ZSBuYW1lLlxuICAgICAqIEBqYSBJRCDjgqLjg4jjg6rjg5Pjg6Xjg7zjg4jlkI3jgavjgqLjgq/jgrvjgrlcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHN0YXRpYyBpZEF0dHJpYnV0ZSA9ICdpZCc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXR0cmlidXRlcyBwb29sXG4gICAgICogQGphIOWxnuaAp+agvOe0jemgmOWfn1xuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdOiBQcm9wZXJ0eTxUPjtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgaW5pdGlhbCBhdHRyaWJ1dGUgdmFsdWVzXG4gICAgICogIC0gYGphYCDlsZ7mgKfjga7liJ3mnJ/lgKTjgpLmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhdHRyaWJ1dGVzOiBSZXF1aXJlZDxUPiwgb3B0aW9ucz86IE1vZGVsQ29uc3RydWN0aW9uT3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IGF0dHJzID0gb3B0cy5wYXJzZSA/IHRoaXMucGFyc2UoYXR0cmlidXRlcywgb3B0cykgYXMgVCA6IGF0dHJpYnV0ZXM7XG4gICAgICAgIGNvbnN0IHByb3BzOiBQcm9wZXJ0eTxUPiA9IHtcbiAgICAgICAgICAgIGF0dHJzOiBPYnNlcnZhYmxlT2JqZWN0LmZyb20oYXR0cnMpLFxuICAgICAgICAgICAgYmFzZUF0dHJzOiB7IC4uLmF0dHJzIH0sXG4gICAgICAgICAgICBwcmV2QXR0cnM6IHsgLi4uYXR0cnMgfSxcbiAgICAgICAgICAgIGNpZDogbHVpZCgnbW9kZWw6JywgOCksXG4gICAgICAgICAgICBvcHRpb25zOiBvcHRzLFxuICAgICAgICB9O1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgX3Byb3BlcnRpZXMsIHsgdmFsdWU6IHByb3BzIH0pO1xuXG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGF0dHJzKSkge1xuICAgICAgICAgICAgdGhpc1tfZGVmaW5lQXR0cmlidXRlc10odGhpcywga2V5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXNbX2NoYW5nZUhhbmRsZXJdID0gKCkgPT4ge1xuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BjaGFuZ2UnLCB0aGlzIGFzIE1vZGVsKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzW192YWxpZGF0ZV0oe30sIG9wdHMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgYXR0cmlidXRlIGJyaWRnZSBkZWYgKi9cbiAgICBwcml2YXRlIFtfZGVmaW5lQXR0cmlidXRlc10oaW5zdGFuY2U6IG9iamVjdCwgbmFtZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHByb3RvID0gaW5zdGFuY2UuY29uc3RydWN0b3IucHJvdG90eXBlO1xuICAgICAgICBpZiAoIShuYW1lIGluIHByb3RvKSkge1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCBuYW1lLCB7XG4gICAgICAgICAgICAgICAgZ2V0KCk6IHVua25vd24ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fYXR0cnNbbmFtZV07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzZXQodmFsOiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZGVlcEVxdWFsKHRoaXMuX2F0dHJzW25hbWVdLCB2YWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpc1tfcHJvcGVydGllc10uY2hhbmdlZEF0dHJzO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcHJldkF0dHJzW25hbWVdID0gdGhpcy5fYXR0cnNbbmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hdHRyc1tuYW1lXSAgICAgPSB2YWw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogcHVibGljIHByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29udGVudCBJRC5cbiAgICAgKiBAamEg44Kz44Oz44OG44Oz44OEIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBpZEF0dHIgPSBpZEF0dHJpYnV0ZSh0aGlzLCAnaWQnKTtcbiAgICAgICAgY29uc3QgeyBjaWQsIGF0dHJzIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIChpZEF0dHIgaW4gYXR0cnMpID8gYXR0cnNbaWRBdHRyXSA6IGNpZDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogcHJvdGVjdGVkIHByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2F0dHJzKCk6IE9ic2VydmFibGVPYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uYXR0cnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlZmF1bHQgYXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDml6LlrprlgKTlsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9iYXNlQXR0cnMoKTogVCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5iYXNlQXR0cnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFByZXZpb3VzIGF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5aSJ5pu05YmN44Gu5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcHJldkF0dHJzKCk6IFQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucHJldkF0dHJzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGFuZ2VkIGF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5aSJ5pu044Gu44GC44Gj44Gf5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY2hhbmdlZEF0dHJzKCk6IFBhcnRpYWw8VD4ge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnMpIHtcbiAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNoYW5nZWRBdHRycyA9IGRpZmYodGhpcy5fYmFzZUF0dHJzLCB0aGlzLl9hdHRycyBhcyB1bmtub3duIGFzIFBhcnRpYWw8VD4pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnMgYXMgUGFydGlhbDxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGludGVybmFsIGNvbnRlbnQgSUQuXG4gICAgICogQGphIOWGhemDqOOBruOCs+ODs+ODhuODs+ODhCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9jaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNpZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNyZWF0aW5nIG9wdGlvbnMuXG4gICAgICogQGphIOani+evieaZguOBruOCquODl+OCt+ODp+ODs+OCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX29wdGlvbnMoKTogTW9kZWxTZXRPcHRpb25zIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLm9wdGlvbnM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogZXZlbnRzXG5cbiAgICAvKiogQGludGVybmFsIGJyb2tlciBhY2Nlc3MgKi9cbiAgICBwcml2YXRlIGdldCBbX2Jyb2tlcl0oKTogRXZlbnRCcm9rZXI8YW55PiB7XG4gICAgICAgIHJldHVybiAodGhpcy5fYXR0cnMgYXMgSU9ic2VydmFibGUgYXMgSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2VzcykuZ2V0QnJva2VyKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHdoZXRoZXIgdGhpcyBvYmplY3QgaGFzIGNsaWVudHMuXG4gICAgICogQGphIOOCr+ODqeOCpOOCouODs+ODiOOBjOWtmOWcqOOBmeOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgaGFzTGlzdGVuZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsPzogQ2hhbm5lbCwgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfYnJva2VyXS5oYXNMaXN0ZW5lcihjaGFubmVsLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgcmVnaXN0ZXJlZCBjaGFubmVsIGtleXMuXG4gICAgICogQGphIOeZu+mMsuOBleOCjOOBpuOBhOOCi+ODgeODo+ODjeODq+OCreODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNoYW5uZWxzKCk6IChrZXlvZiBFdmVudClbXSB7XG4gICAgICAgIHJldHVybiB0aGlzW19icm9rZXJdLmNoYW5uZWxzKCkgYXMgKGtleW9mIEV2ZW50KVtdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBOb3RpZnkgZXZlbnQgdG8gY2xpZW50cy5cbiAgICAgKiBAamEgZXZlbnQg55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgYXJndW1lbnRzIGZvciBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWw44Gr5rih44GZ5byV5pWwXG4gICAgICovXG4gICAgcHVibGljIHRyaWdnZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsLCAuLi5hcmdzOiBBcmd1bWVudHM8UGFydGlhbDxFdmVudFtDaGFubmVsXT4+KTogdm9pZCB7XG4gICAgICAgICh0aGlzW19icm9rZXJdIGFzIGFueSkudHJpZ2dlcihjaGFubmVsLCAuLi5hcmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm6Kej6ZmkXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbD86IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYXR0cnMub2ZmKGNoYW5uZWwgYXMgYW55LCBsaXN0ZW5lciBhcyBhbnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBvbjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGlmICgnKicgPT09IGNoYW5uZWwgfHwgJ0BjaGFuZ2UnID09PSBjaGFubmVsIHx8IChpc0FycmF5KGNoYW5uZWwpICYmIGNoYW5uZWwuaW5jbHVkZXMoJ0BjaGFuZ2UnIGFzIENoYW5uZWwpKSkge1xuICAgICAgICAgICAgdGhpcy5fYXR0cnMub24oJ0AnLCB0aGlzW19jaGFuZ2VIYW5kbGVyXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2F0dHJzLm9uKGNoYW5uZWwgYXMgYW55LCBsaXN0ZW5lciBhcyBhbnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykgYnV0IGl0IGNhdXNlcyB0aGUgYm91bmQgY2FsbGJhY2sgdG8gb25seSBmaXJlIG9uY2UgYmVmb3JlIGJlaW5nIHJlbW92ZWQuXG4gICAgICogQGphIOS4gOW6puOBoOOBkeODj+ODs+ODieODquODs+OCsOWPr+iDveOBquOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBvbmNlPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMub24oY2hhbm5lbCwgbGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBtYW5hZ2VkID0gdGhpcy5vbihjaGFubmVsLCAoKSA9PiB7XG4gICAgICAgICAgICBjb250ZXh0LnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICBtYW5hZ2VkLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiB2YWxpZGF0aW9uXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdmFsaWQgb3Igbm90LlxuICAgICAqIEBqYSDmpJzoqLzjga7miJDlkKbjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaXNWYWxpZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFNVQ0NFRURFRCh0aGlzLnZhbGlkYXRlKHsgc2lsZW50OiB0cnVlIH0pLmNvZGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBWYWxpZGF0ZSByZXN1bHQgYWNjZXNzZXIuXG4gICAgICogQGphIOaknOiovOe1kOaenOOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyB2YWxpZGF0ZShvcHRpb25zPzogU2lsZW5jZWFibGUpOiBSZXN1bHQge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHZhbGlkYXRlOiB0cnVlLCBub1Rocm93OiB0cnVlLCBleHRlbmQ6IGZhbHNlIH0sIG9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gdGhpc1tfdmFsaWRhdGVdKHt9LCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuICAgIC8qKlxuICAgICAqIEBlbiBWYWxpZGF0ZSBkYXRhIG1ldGhvZC5cbiAgICAgKiBAamEg44OH44O844K/5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCB2YWxpZGF0ZWUgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg6KKr5qSc6Ki85bGe5oCnXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHZhbGlkYXRlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOaknOiovOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHByb3RlY3RlZCB2YWxpZGF0ZUF0dHJpYnV0ZXM8QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4sIG9wdGlvbnM/OiBNb2RlbFZhbGlkYXRlQXR0cmlidXRlT3B0aW9ucyk6IFJlc3VsdCB7XG4gICAgICAgIHJldHVybiBSRVNVTFRfVkFMSURfQVRUUlM7XG4gICAgfVxuXG4gICAgLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuICAgIC8qKiBAaW50ZXJuYWwgdmFsaWRhdGUgKi9cbiAgICBwcml2YXRlIFtfdmFsaWRhdGVdPEEgZXh0ZW5kcyBUPihhdHRyaWJ1dGVzOiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+LCBvcHRpb25zPzogTW9kZWxTZXRPcHRpb25zKTogUmVzdWx0IHwgbmV2ZXIge1xuICAgICAgICBjb25zdCB7IHZhbGlkYXRlLCBzaWxlbnQsIG5vVGhyb3cgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGlmICh2YWxpZGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgYXR0cnMgPSB7IC4uLnRoaXMuX2F0dHJzLCAuLi5hdHRyaWJ1dGVzIH07XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnZhbGlkYXRlQXR0cmlidXRlcyhhdHRycywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoRkFJTEVEKHJlc3VsdC5jb2RlKSkge1xuICAgICAgICAgICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAaW52YWxpZCcsIHRoaXMgYXMgTW9kZWwsIGF0dHJzLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIW5vVGhyb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUkVTVUxUX1ZBTElEX0FUVFJTO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogYXR0cmlidXRlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBbW01vZGVsXV0gaGFzIHZhbGlkIHByb3BlcnR5LiAobm90IGBudWxsYCBvciBgdW5kZWZpbmVkYClcbiAgICAgKiBAamEgW1tNb2RlbF1dIOOBjOacieWKueOBquODl+ODreODkeODhuOCo+OCkuaMgeOBo+OBpuOBhOOCi+OBi+eiuuiqjSAoYG51bGxgIOOBvuOBn+OBryBgdW5kZWZpbmVkYCDjgafjgarjgYQpXG4gICAgICovXG4gICAgcHVibGljIGhhcyhhdHRyaWJ1dGU6IGtleW9mIFQpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gKHRoaXMuX2F0dHJzIGFzIHVua25vd24gYXMgVClbYXR0cmlidXRlXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBIVE1MLWVzY2FwZWQgdmFsdWUgb2YgYW4gYXR0cmlidXRlLlxuICAgICAqIEBqYSBIVE1MIOOBp+S9v+eUqOOBmeOCi+aWh+Wtl+OCkuWItuW+oeaWh+Wtl+OBq+e9ruaPm+OBl+OBn+WxnuaAp+WApOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBlc2NhcGUoYXR0cmlidXRlOiBrZXlvZiBUKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIGVzY2FwZUhUTUwoKHRoaXMuX2F0dHJzIGFzIGFueSlbYXR0cmlidXRlXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVwZGF0ZSBhdHRyaWJ1dGVzIGZvciBiYXRjaCBpbnB1dCB3aXRoIG9wdGlvbnMuXG4gICAgICogQGphIOWxnuaAp+OBruS4gOaLrOioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIHVwZGF0ZSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGphYCDmm7TmlrDlsZ7mgKdcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2V0IGF0dHJpYnV0ZXMgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5bGe5oCn5pu05paw55So44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldEF0dHJpYnV0ZXM8QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4sIG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBzaWxlbnQsIGV4dGVuZCB9ID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHNpbGVudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzLnN1c3BlbmQodHJ1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXNbX3ZhbGlkYXRlXShhdHRyaWJ1dGVzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChGQUlMRUQocmVzdWx0LmNvZGUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgYXR0ciBvZiBPYmplY3Qua2V5cyhhdHRyaWJ1dGVzKSkge1xuICAgICAgICAgICAgICAgIGlmIChhdHRyIGluIHRoaXMuX2F0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzW2F0dHJdID0gYXR0cmlidXRlc1thdHRyXTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGV4dGVuZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW19kZWZpbmVBdHRyaWJ1dGVzXSh0aGlzLCBhdHRyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYXR0cnNbYXR0cl0gPSBhdHRyaWJ1dGVzW2F0dHJdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGlmIChzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hdHRycy5yZXN1bWUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBhbGwgYXR0cmlidXRlcyBvbiB0aGUgW1tNb2RlbF1dLiAoc2V0IGB1bmRlZmluZWRgKVxuICAgICAqIEBqYSBbW01vZGVsXV0g44GL44KJ44GZ44G544Gm44Gu5bGe5oCn44KS5YmK6ZmkIChgdW5kZWZpbmVkYCDjgpLoqK3lrpopXG4gICAgICovXG4gICAgcHVibGljIGNsZWFyKG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgY2xlYXJBdHRycyA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgT2JqZWN0LmtleXModGhpcy5fYmFzZUF0dHJzKSkge1xuICAgICAgICAgICAgY2xlYXJBdHRyc1thdHRyXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5zZXRBdHRyaWJ1dGVzKGNsZWFyQXR0cnMsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBtb2RlbCdzIGBhdHRyaWJ1dGVzYCBvYmplY3QuXG4gICAgICogQGphIOODouODh+ODq+WxnuaAp+WApOOBruOCs+ODlOODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyB0b0pTT04oKTogVCB7XG4gICAgICAgIHJldHVybiBkZWVwQ29weSh7IC4uLnRoaXMuX2F0dHJzIH0gYXMgVCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVzIENsb25lIHRoaXMgaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOBruikh+ijveOCkui/lOWNtFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgcHVibGljIGNsb25lKCk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IGNvbnN0cnVjdG9yLCBfYXR0cnMsIF9vcHRpb25zIH0gPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IChjb25zdHJ1Y3RvciBhcyBDb25zdHJ1Y3Rvcjx0aGlzPikoX2F0dHJzLCBfb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGNoYW5nZWQgYXR0cmlidXRlcy5cbiAgICAgKiBAamEg5aSJ5pu044GV44KM44Gf5bGe5oCn5YCk44KS5oyB44Gk44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlXG4gICAgICogIC0gYGVuYCBjaGVja2VkIGF0dHJpYnV0ZVxuICAgICAqICAtIGBqYWAg5qSc6Ki844GZ44KL5bGe5oCnXG4gICAgICovXG4gICAgcHVibGljIGhhc0NoYW5nZWQoYXR0cmlidXRlPzoga2V5b2YgVCk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAobnVsbCA9PSBhdHRyaWJ1dGUpIHtcbiAgICAgICAgICAgIHJldHVybiAhaXNFbXB0eU9iamVjdCh0aGlzLl9jaGFuZ2VkQXR0cnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGF0dHJpYnV0ZSBpbiB0aGlzLl9jaGFuZ2VkQXR0cnM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGFuIG9iamVjdCBjb250YWluaW5nIGFsbCB0aGUgYXR0cmlidXRlcyB0aGF0IGhhdmUgY2hhbmdlZCwgb3IgYHVuZGVmaW5lZGAgaWYgdGhlcmUgYXJlIG5vIGNoYW5nZWQgYXR0cmlidXRlcy5cbiAgICAgKiBAamEg5YWl5Yqb44GX44GfIGF0dHJpYnV0ZXMg5YCk44Gu5beu5YiG44Gr5a++44GX44Gm5aSJ5pu044GM44GC44KL5bGe5oCn5YCk44KS6L+U5Y20LiDlt67liIbjgYzjgarjgYTloLTlkIjjga8gYHVuZGVmaWVuZGAg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgY2hlY2tlZCBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGphYCDmpJzoqLzjgZnjgovlsZ7mgKdcbiAgICAgKi9cbiAgICBwdWJsaWMgY2hhbmdlZChhdHRyaWJ1dGVzPzogUGFydGlhbDxUPik6IFBhcnRpYWw8VD4gfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAoIWF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhhc0NoYW5nZWQoKSA/IHsgLi4udGhpcy5fY2hhbmdlZEF0dHJzIH0gOiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBjaGFuZ2VkID0gZGlmZih0aGlzLl9hdHRycywgYXR0cmlidXRlcyk7XG4gICAgICAgICAgICByZXR1cm4gIWlzRW1wdHlPYmplY3QoY2hhbmdlZCkgPyBjaGFuZ2VkIDogdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgcHJldmlvdXMgdmFsdWUgb2YgYW4gYXR0cmlidXRlLCByZWNvcmRlZCBhdCB0aGUgdGltZSB0aGUgbGFzdCBgQGNoYW5nZWAgZXZlbnQgd2FzIGZpcmVkLlxuICAgICAqIEBqYSBgQGNoYW5nZWAg44GM55m654Gr44GV44KM44Gf5YmN44Gu5bGe5oCn5YCk44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHByZXZpb3VzPEsgZXh0ZW5kcyBrZXlvZiBUPihhdHRyaWJ1dGU6IEspOiBUW0tdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ByZXZBdHRyc1thdHRyaWJ1dGVdO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IHN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBhIFtbTW9kZWxdXSBpcyBuZXcgaWYgaXQgaGFzIG5ldmVyIGJlZW4gc2F2ZWQgdG8gdGhlIHNlcnZlciwgYW5kIGxhY2tzIGFuIGlkLlxuICAgICAqIEBqYSBbW01vZGVsXV0g44GM44G+44Gg44K144O844OQ44O844Gr5a2Y5Zyo44GX44Gq44GE44GL44OB44Kn44OD44KvLiDml6Llrprjgafjga8gYGlkQXR0cmlidXRlYCDjga7mnInnhKHjgafliKTlrppcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgaXNOZXcoKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGlkQXR0ciA9IGlkQXR0cmlidXRlKHRoaXMsICdpZCcpO1xuICAgICAgICByZXR1cm4gIXRoaXMuaGFzKGlkQXR0ciBhcyBrZXlvZiBUKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29udmVydHMgYSByZXNwb25zZSBpbnRvIHRoZSBoYXNoIG9mIGF0dHJpYnV0ZXMgdG8gYmUgYHNldGAgb24gdGhlIG1vZGVsLiBUaGUgZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiBpcyBqdXN0IHRvIHBhc3MgdGhlIHJlc3BvbnNlIGFsb25nLlxuICAgICAqIEBqYSDjg6zjgrnjg53jg7Pjgrnjga7lpInmj5vjg6Hjgr3jg4Pjg4kuIOaXouWumuOBp+OBr+S9leOCguOBl+OBquOBhFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHBhcnNlKHJlc3BvbnNlOiBQbGFpbk9iamVjdCB8IHZvaWQsIG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiBUIHwgdm9pZCB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHJldHVybiByZXNwb25zZSBhcyBUO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBQcm94eSBbW0lEYXRhU3luYyNzeW5jXV0gYnkgZGVmYXVsdCAtLSBidXQgb3ZlcnJpZGUgdGhpcyBpZiB5b3UgbmVlZCBjdXN0b20gc3luY2luZyBzZW1hbnRpY3MgZm9yICp0aGlzKiBwYXJ0aWN1bGFyIG1vZGVsLlxuICAgICAqIEBqYSDjg4fjg7zjgr/lkIzmnJ8uIOW/heimgeOBq+W/nOOBmOOBpuOCquODvOODkOODvOODqeOCpOODieWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBzeW5jPEsgZXh0ZW5kcyBNb2RlbFN5bmNNZXRob2RzPihtZXRob2Q6IEssIGNvbnRleHQ6IE1vZGVsPFQ+LCBvcHRpb25zPzogTW9kZWxEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPE1vZGVsU3luY1Jlc3VsdDxLLCBUPj4ge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFN5bmMoKS5zeW5jKG1ldGhvZCwgY29udGV4dCBhcyBTeW5jQ29udGV4dDxUPiwgb3B0aW9ucykgYXMgdW5rbm93biBhcyBQcm9taXNlPE1vZGVsU3luY1Jlc3VsdDxLLCBUPj47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZldGNoIHRoZSBbW01vZGVsXV0gZnJvbSB0aGUgc2VydmVyLCBtZXJnaW5nIHRoZSByZXNwb25zZSB3aXRoIHRoZSBtb2RlbCdzIGxvY2FsIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIFtbTW9kZWxdXSDlsZ7mgKfjga7jgrXjg7zjg5Djg7zlkIzmnJ8uIOODrOOCueODneODs+OCueOBruODnuODvOOCuOOCkuWun+ihjFxuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBmZXRjaChvcHRpb25zPzogTW9kZWxGZXRjaE9wdGlvbnMpOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBwYXJzZTogdHJ1ZSB9LCBvcHRpb25zLCB7IHN5bmNNZXRob2Q6ICdyZWFkJyB9KTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzcCA9IGF3YWl0IHRoaXMuc3luYygncmVhZCcsIHRoaXMgYXMgTW9kZWw8VD4sIG9wdHMpO1xuICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGVzKG9wdHMucGFyc2UgPyB0aGlzLnBhcnNlKHJlc3AsIG9wdHMpIGFzIFQgOiByZXNwLCBvcHRzKTtcbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAc3luYycsIHRoaXMgYXMgTW9kZWwsIHJlc3AsIG9wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAZXJyb3InLCB0aGlzIGFzIE1vZGVsLCBlLCBvcHRzKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IGEgaGFzaCBvZiBbW01vZGVsXV0gYXR0cmlidXRlcywgYW5kIHN5bmMgdGhlIG1vZGVsIHRvIHRoZSBzZXJ2ZXIuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIHNlcnZlciByZXR1cm5zIGFuIGF0dHJpYnV0ZXMgaGFzaCB0aGF0IGRpZmZlcnMsIHRoZSBtb2RlbCdzIHN0YXRlIHdpbGwgYmUgYHNldGAgYWdhaW4uXG4gICAgICogQGphIFtbTW9kZWxdXSDlsZ7mgKfjgpLjgrXjg7zjg5Djg7zjgavkv53lrZguIDxicj5cbiAgICAgKiAgICAg55Ww44Gq44KL5bGe5oCn44GM6L+U5Y2044GV44KM44KL5aC05ZCI44Gv5YaN6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCB1cGRhdGUgYXR0cmlidXRlIGtleVxuICAgICAqICAtIGBqYWAg5pu05paw5bGe5oCn44Kt44O8XG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB1cGRhdGUgYXR0cmlidXRlIHZhbHVlXG4gICAgICogIC0gYGphYCDmm7TmlrDlsZ7mgKflgKRcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2F2ZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDkv53lrZjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgc2F2ZTxLIGV4dGVuZHMga2V5b2YgVD4oa2V5Pzoga2V5b2YgVCwgdmFsdWU/OiBUW0tdLCBvcHRpb25zPzogTW9kZWxTYXZlT3B0aW9ucyk6IFByb21pc2U8UGxhaW5PYmplY3QgfCB2b2lkPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgYSBoYXNoIG9mIFtbTW9kZWxdXSBhdHRyaWJ1dGVzLCBhbmQgc3luYyB0aGUgbW9kZWwgdG8gdGhlIHNlcnZlci4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgc2VydmVyIHJldHVybnMgYW4gYXR0cmlidXRlcyBoYXNoIHRoYXQgZGlmZmVycywgdGhlIG1vZGVsJ3Mgc3RhdGUgd2lsbCBiZSBgc2V0YCBhZ2Fpbi5cbiAgICAgKiBAamEgW1tNb2RlbF1dIOWxnuaAp+OCkuOCteODvOODkOODvOOBq+S/neWtmC4gPGJyPlxuICAgICAqICAgICDnlbDjgarjgovlsZ7mgKfjgYzov5TljbTjgZXjgozjgovloLTlkIjjga/lho3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCB1cGRhdGUgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg5pu05paw5bGe5oCnXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNhdmUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5L+d5a2Y44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIHNhdmU8QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4gfCBOaWwsIG9wdGlvbnM/OiBNb2RlbFNhdmVPcHRpb25zKTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IHZvaWQ+O1xuXG4gICAgcHVibGljIGFzeW5jIHNhdmUoLi4uYXJnczogdW5rbm93bltdKTogUHJvbWlzZTxQbGFpbk9iamVjdCB8IHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBhdHRycywgb3B0aW9ucyB9ID0gcGFyc2VTYXZlQXJncyguLi5hcmdzKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyB2YWxpZGF0ZTogdHJ1ZSwgcGFyc2U6IHRydWUsIHdhaXQ6IHRydWUgfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgd2FpdCB9ID0gb3B0cztcblxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gb3B0cy5zeW5jTWV0aG9kID0gdGhpcy5pc05ldygpID8gJ2NyZWF0ZScgOiBvcHRzLnBhdGNoID8gJ3BhdGNoJyA6ICd1cGRhdGUnO1xuXG4gICAgICAgICAgICBpZiAoYXR0cnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXdhaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGVzKGF0dHJzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uYmFzZUF0dHJzID0geyAuLi50aGlzLl9hdHRycyB9IGFzIFQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfdmFsaWRhdGVdKGF0dHJzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCdwYXRjaCcgPT09IG1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICBvcHRzLmRhdGEgPSBhdHRycztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvcHRzLmRhdGEgPSBPYmplY3QuYXNzaWduKHRoaXMudG9KU09OKCksIGF0dHJzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCB0aGlzLnN5bmMobWV0aG9kLCB0aGlzIGFzIE1vZGVsPFQ+LCBvcHRzKTtcblxuICAgICAgICAgICAgbGV0IHNlcnZlckF0dHJzID0gb3B0cy5wYXJzZSA/IHRoaXMucGFyc2UocmVzcCwgb3B0cykgOiByZXNwO1xuICAgICAgICAgICAgaWYgKGF0dHJzICYmIHdhaXQpIHtcbiAgICAgICAgICAgICAgICBzZXJ2ZXJBdHRycyA9IE9iamVjdC5hc3NpZ24oe30sIGF0dHJzLCBzZXJ2ZXJBdHRycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXNPYmplY3Qoc2VydmVyQXR0cnMpICYmICFpc0VtcHR5T2JqZWN0KHNlcnZlckF0dHJzKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlcyhzZXJ2ZXJBdHRycyBhcyBULCBvcHRzKTtcbiAgICAgICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5iYXNlQXR0cnMgPSB7IC4uLnRoaXMuX2F0dHJzIH0gYXMgVDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BzeW5jJywgdGhpcyBhcyBNb2RlbCwgcmVzcCBhcyBQbGFpbk9iamVjdCwgb3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BlcnJvcicsIHRoaXMgYXMgTW9kZWwsIGUsIG9wdHMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXN0cm95IHRoaXMgW1tNb2RlbF1dIG9uIHRoZSBzZXJ2ZXIgaWYgaXQgd2FzIGFscmVhZHkgcGVyc2lzdGVkLlxuICAgICAqIEBqYSBbW01vZGVsXV0g44KS44K144O844OQ44O844GL44KJ5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgZGVzdHJveSBvcHRpb25zXG4gICAgICogIC0gYGphYCDnoLTmo4Tjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgZGVzdHJveShvcHRpb25zPzogTW9kZWxEZXN0cm95T3B0aW9ucyk6IFByb21pc2U8UGxhaW5PYmplY3QgfCB2b2lkPiB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgd2FpdDogdHJ1ZSB9LCBvcHRpb25zLCB7IHN5bmNNZXRob2Q6ICdkZWxldGUnIH0pO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IHdhaXQsIGNhbmNlbCB9ID0gb3B0cztcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0cyA9ICF0aGlzLmlzTmV3KCk7XG4gICAgICAgICAgICBjb25zdCBkZXN0cnVjdCA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGRlc3Ryb3knLCB0aGlzIGFzIE1vZGVsLCBvcHRzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICF3YWl0ICYmIGRlc3RydWN0KCk7XG5cbiAgICAgICAgICAgIGxldCByZXNwOiBQbGFpbk9iamVjdCB8IHZvaWQ7XG4gICAgICAgICAgICBpZiAoIWV4aXN0cykge1xuICAgICAgICAgICAgICAgIGF3YWl0IGNjKGNhbmNlbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3AgPSBhd2FpdCB0aGlzLnN5bmMoJ2RlbGV0ZScsIHRoaXMgYXMgTW9kZWw8VD4sIG9wdHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB3YWl0ICYmIGRlc3RydWN0KCk7XG4gICAgICAgICAgICBleGlzdHMgJiYgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BzeW5jJywgdGhpcyBhcyBNb2RlbCwgcmVzcCBhcyBQbGFpbk9iamVjdCwgb3B0cyk7XG5cbiAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGVycm9yJywgdGhpcyBhcyBNb2RlbCwgZSwgb3B0cyk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBtaXhpbiDjgavjgojjgosgYGluc3RhbmNlb2ZgIOOBr+eEoeWKueOBq+ioreWumlxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoTW9kZWwgYXMgdW5rbm93biBhcyBDbGFzcywgJ2luc3RhbmNlT2YnLCBudWxsKTtcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgW1tNb2RlbF1dLlxuICogQGphIFtbTW9kZWxdXSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc01vZGVsKHg6IHVua25vd24pOiB4IGlzIE1vZGVsIHtcbiAgICByZXR1cm4geCBpbnN0YW5jZW9mIE1vZGVsO1xufVxuXG4vKipcbiAqIEBlbiBRdWVyeSBbW01vZGVsXV0gYGlkLWF0dHJpYnV0ZWAuXG4gKiBAamEgW1tNb2RlbF1dIOOBriBgaWQtYXR0cmlidXRlYCDjgpLlj5blvpdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlkQXR0cmlidXRlKHg6IHVua25vd24sIGZhbGxiYWNrID0gJycpOiBzdHJpbmcge1xuICAgIHJldHVybiBpc09iamVjdCh4KSA/ICh4LmNvbnN0cnVjdG9yWydpZEF0dHJpYnV0ZSddIHx8IGZhbGxiYWNrKSA6IGZhbGxiYWNrO1xufVxuIl0sIm5hbWVzIjpbIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSIsImlzT2JqZWN0IiwiRXZlbnRSZWNlaXZlciIsIk9ic2VydmFibGVPYmplY3QiLCJsdWlkIiwiZGVlcEVxdWFsIiwiZGlmZiIsImlzQXJyYXkiLCJTVUNDRUVERUQiLCJyZXN1bHQiLCJGQUlMRUQiLCJlc2NhcGVIVE1MIiwiZGVlcENvcHkiLCJpc0VtcHR5T2JqZWN0IiwiZGVmYXVsdFN5bmMiLCJjYyIsInNldE1peENsYXNzQXR0cmlidXRlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7OztJQU1BOzs7OztRQVVJO1FBQUE7WUFDSSxzRkFBaUQsQ0FBQTtZQUNqRCxvREFBeUIsWUFBQSxrQkFBa0IsZ0JBQXVCLGlCQUF3QixDQUFDLEVBQUUsZUFBZSxDQUFDLDRCQUFBLENBQUE7U0FDaEgsSUFBQTtJQUNMLENBQUM7O0lDcEJEOzs7SUF1REEsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDM0MsTUFBTSxTQUFTLEdBQVcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzdDLE1BQU0sY0FBYyxHQUFNLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM3QyxNQUFNLE9BQU8sR0FBYSxNQUFNLENBQUMs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
