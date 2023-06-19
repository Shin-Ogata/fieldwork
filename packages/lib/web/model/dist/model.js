/*!
 * @cdp/model 0.9.17
 *   generic model scheme
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/events'), require('@cdp/promise'), require('@cdp/observable'), require('@cdp/result'), require('@cdp/data-sync')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/events', '@cdp/promise', '@cdp/observable', '@cdp/result', '@cdp/data-sync'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
})(this, (function (exports, coreUtils, events, promise, observable, result, dataSync) { 'use strict';

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
            coreUtils.assignValue(attrs = {}, key, value);
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
     * import { Model, ModelConstructor } from '@cdp/runtime';
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
    class Model extends events.EventReceiver {
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
                attrs: observable.ObservableObject.from(attrs),
                baseAttrs: { ...attrs },
                prevAttrs: { ...attrs },
                cid: coreUtils.luid('model:', 8),
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
                const changedKeys = Object.keys(coreUtils.diff(_prevAttrs, _attrs));
                for (const key of changedKeys) {
                    this.trigger(`@change:${key}`, this, _attrs[key], _prevAttrs[key], key);
                }
                this[_properties].changeFired = true;
            };
            this[_validate]({}, opts);
        }
        /** @internal attribute update core */
        [_updateAttributes](name, val) {
            if (!coreUtils.deepEqual(this._attrs[name], val)) {
                const { attrs, changeFired } = this[_properties];
                if (changeFired) {
                    this[_properties].changeFired = false;
                    this[_properties].prevAttrs = { ...attrs };
                }
                delete this[_properties].changedAttrs;
                coreUtils.assignValue(this._prevAttrs, name, attrs[name]);
                coreUtils.assignValue(attrs, name, val);
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
         * @en Check the {@link Model} has valid property. (not `null` or `undefined`)
         * @ja {@link Model} が有効なプロパティを持っているか確認 (`null` または `undefined` でない)
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
         * @en Clear all attributes on the {@link Model}. (set `undefined`)
         * @ja {@link Model} からすべての属性を削除 (`undefined` を設定)
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
         * @en Check a {@link Model} is new if it has never been saved to the server, and lacks an id.
         * @ja {@link Model} がまだサーバーに存在しないかチェック. 既定では `idAttribute` の有無で判定
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
         * @en Proxy {@link IDataSync.sync | IDataSync.sync}() by default -- but override this if you need custom syncing semantics for *this* particular model.
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
         * @en Fetch the {@link Model} from the server, merging the response with the model's local attributes.
         * @ja {@link Model} 属性のサーバー同期. レスポンスのマージを実行
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
         * @en Destroy this {@link Model} on the server if it was already persisted.
         * @ja {@link Model} をサーバーから削除
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
    // mixin による `instanceof` は無効に設定
    coreUtils.setMixClassAttribute(Model, 'instanceOf', null);
    /**
     * @en Check the value-type is {@link Model}.
     * @ja {@link Model} 型であるか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isModel(x) {
        return x instanceof Model;
    }
    /**
     * @en Query {@link Model} `id-attribute`.
     * @ja {@link Model} の `id-attribute` を取得
     */
    function idAttribute(x, fallback = '') {
        return coreUtils.isObject(x) ? (x.constructor['idAttribute'] || fallback) : fallback;
    }

    exports.Model = Model;
    exports.RESULT_VALID_ATTRS = RESULT_VALID_ATTRS;
    exports.idAttribute = idAttribute;
    exports.isModel = isModel;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwuanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJiYXNlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgTU9ERUwgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyA1LFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX01PREVMX0RFQ0xBUkUgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfREFUQSA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLk1PREVMICsgMSwgJ2ludmFsaWQgZGF0YS4nKSxcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBQcmltaXRpdmUsXG4gICAgTnVsbGlzaCxcbiAgICBBY2Nlc3NpYmxlLFxuICAgIENvbnN0cnVjdG9yLFxuICAgIENsYXNzLFxuICAgIEFyZ3VtZW50cyxcbiAgICBpc09iamVjdCxcbiAgICBpc0VtcHR5T2JqZWN0LFxuICAgIGx1aWQsXG4gICAgZXNjYXBlSFRNTCxcbiAgICBhc3NpZ25WYWx1ZSxcbiAgICBkZWVwQ29weSxcbiAgICBkZWVwRXF1YWwsXG4gICAgZGlmZixcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgU3Vic2NyaXB0aW9uLFxuICAgIFNpbGVuY2VhYmxlLFxuICAgIEV2ZW50QnJva2VyLFxuICAgIEV2ZW50UmVjZWl2ZXIsXG4gICAgRXZlbnRTb3VyY2UsXG59IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IGNoZWNrQ2FuY2VsZWQgYXMgY2MgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHtcbiAgICBJT2JzZXJ2YWJsZSxcbiAgICBJT2JzZXJ2YWJsZUV2ZW50QnJva2VyQWNjZXNzLFxuICAgIE9ic2VydmFibGVPYmplY3QsXG59IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQge1xuICAgIFJFU1VMVF9DT0RFLFxuICAgIFJlc3VsdCxcbiAgICBtYWtlUmVzdWx0LFxuICAgIFNVQ0NFRURFRCxcbiAgICBGQUlMRUQsXG59IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IFN5bmNDb250ZXh0LCBkZWZhdWx0U3luYyB9IGZyb20gJ0BjZHAvZGF0YS1zeW5jJztcbmltcG9ydCB7XG4gICAgTW9kZWxTZWVkLFxuICAgIE1vZGVsRXZlbnQsXG4gICAgTW9kZWxWYWxpZGF0ZUF0dHJpYnV0ZU9wdGlvbnMsXG4gICAgTW9kZWxBdHRyaWJ1dGVJbnB1dCxcbiAgICBNb2RlbFNldE9wdGlvbnMsXG4gICAgTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIE1vZGVsU3luY01ldGhvZHMsXG4gICAgTW9kZWxTeW5jUmVzdWx0LFxuICAgIE1vZGVsRGF0YVN5bmNPcHRpb25zLFxuICAgIE1vZGVsRmV0Y2hPcHRpb25zLFxuICAgIE1vZGVsU2F2ZU9wdGlvbnMsXG4gICAgTW9kZWxEZXN0cm95T3B0aW9ucyxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfZGVmaW5lQXR0cmlidXRlcyA9IFN5bWJvbCgnZGVmaW5lJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF91cGRhdGVBdHRyaWJ1dGVzID0gU3ltYm9sKCd1cGRhdGUnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3ZhbGlkYXRlICAgICAgICAgPSBTeW1ib2woJ3ZhbGlkYXRlJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9jaGFuZ2VIYW5kbGVyICAgID0gU3ltYm9sKCdvbmNoYW5nZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYnJva2VyICAgICAgICAgICA9IFN5bWJvbCgnYnJva2VyJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzICAgICAgID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eTxUPiB7XG4gICAgYXR0cnM6IEFjY2Vzc2libGU8T2JzZXJ2YWJsZU9iamVjdD47XG4gICAgYmFzZUF0dHJzOiBUO1xuICAgIHByZXZBdHRyczogVDtcbiAgICBjaGFuZ2VkQXR0cnM/OiBQYXJ0aWFsPFQ+O1xuICAgIHJlYWRvbmx5IGNpZDogc3RyaW5nO1xuICAgIHJlYWRvbmx5IG9wdGlvbnM6IE1vZGVsU2V0T3B0aW9ucztcbiAgICBjaGFuZ2VGaXJlZDogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZW4gVmFsaWQgYXR0cmlidXRlcyByZXN1bHQuXG4gKiBAamEg5bGe5oCn5qSc6Ki844Gu5pyJ5Yq55YCkXG4gKi9cbmV4cG9ydCBjb25zdCBSRVNVTFRfVkFMSURfQVRUUlMgPSBPYmplY3QuZnJlZXplKG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuU1VDQ0VTUywgJ3ZhbGlkIGF0dHJpYnV0ZS4nKSk7XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzYXZlKCkgKi9cbmZ1bmN0aW9uIHBhcnNlU2F2ZUFyZ3M8QSBleHRlbmRzIG9iamVjdD4oLi4uYXJnczogYW55W10pOiB7IGF0dHJzPzogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPjsgb3B0aW9ucz86IE1vZGVsU2F2ZU9wdGlvbnM7IH0ge1xuICAgIGxldCBba2V5LCB2YWx1ZSwgb3B0aW9uc10gPSBhcmdzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIHByZWZlci1jb25zdFxuICAgIGxldCBhdHRyczogYW55O1xuXG4gICAgaWYgKG51bGwgPT0ga2V5IHx8IGlzT2JqZWN0KGtleSkpIHtcbiAgICAgICAgYXR0cnMgPSBrZXk7XG4gICAgICAgIG9wdGlvbnMgPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBhc3NpZ25WYWx1ZShhdHRycyA9IHt9LCBrZXksIHZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRhdGEpIHtcbiAgICAgICAgYXR0cnMgPSBPYmplY3QuYXNzaWduKGF0dHJzIHx8IHt9LCBvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIHJldHVybiB7IGF0dHJzLCBvcHRpb25zIH07XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gZm9yIG1vZGVsIHRoYXQgcHJvdmlkZXMgYSBiYXNpYyBzZXQgb2YgZnVuY3Rpb25hbGl0eSBmb3IgbWFuYWdpbmcgaW50ZXJhY3Rpb24uXG4gKiBAamEg44Kk44Oz44K/44Op44Kv44K344On44Oz44Gu44Gf44KB44Gu5Z+65pys5qmf6IO944KS5o+Q5L6b44GZ44KLIE1vZGVsIOOBruWfuuW6leOCr+ODqeOCueWumue+qVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgTW9kZWwsIE1vZGVsQ29uc3RydWN0b3IgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIGludGVyZmFjZSBDb250ZW50QXR0cmlidXRlIHtcbiAqICAgdXJpOiBzdHJpbmc7XG4gKiAgIHJlYWRvbmx5IHNpemU6IG51bWJlcjtcbiAqICAgY29va2llPzogc3RyaW5nO1xuICogfVxuICogYGBgXG4gKlxuICogLSBCYXNpYyBVc2FnZVxuICpcbiAqIGBgYHRzXG4gKiAvLyBlYXJseSBjYXN0XG4gKiBjb25zdCBDb250ZW50QmFzZSA9IE1vZGVsIGFzIE1vZGVsQ29uc3RydWN0b3I8TW9kZWw8Q29udGVudEF0dHJpYnV0ZT4sIENvbnRlbnRBdHRyaWJ1dGU+O1xuICpcbiAqIGNsYXNzIENvbnRlbnQgZXh0ZW5kcyBDb250ZW50QmFzZSB7XG4gKiAgIGNvbnN0cnVjdG9yKGF0dHJzOiBDb250ZW50QXR0cmlidXRlKSB7XG4gKiAgICAgc3VwZXIoYXR0cnMpO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBvclxuICpcbiAqIGBgYHRzXG4gKiAvLyBsYXRlIGNhc3RcbiAqIGNsYXNzIENvbnRlbnRDbGFzcyBleHRlbmRzIE1vZGVsPENvbnRlbnRBdHRyaWJ1dGU+IHtcbiAqICAgY29uc3RydWN0b3IoYXR0cnM6IENvbnRlbnRBdHRyaWJ1dGUpIHtcbiAqICAgICBzdXBlcihhdHRycyk7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBDb250ZW50ID0gQ29udGVudENsYXNzIGFzIE1vZGVsQ29uc3RydWN0b3I8Q29udGVudENsYXNzLCBDb250ZW50QXR0cmlidXRlPjtcbiAqIGBgYFxuICogdGhlblxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBjb250ZW50ID0gbmV3IENvbnRlbnQoe1xuICogICB1cmk6ICdhYWEudHh0JyxcbiAqICAgc2l6ZTogMTAsXG4gKiAgIGNvb2tpZTogdW5kZWZpbmVkLCAvLyBuZWVkIGV4cGxpY2l0IGFzc2lnblxuICogfSk7XG4gKlxuICogY29uc29sZS5sb2coY29udGVudC51cmkpOyAgICAvLyAnYWFhLnR4dCdcbiAqIGNvbnNvbGUubG9nKGNvbnRlbnQuc2l6ZSk7ICAgLy8gJzEwJ1xuICogY29uc29sZS5sb2coY29udGVudC5jb29raWUpOyAvLyAndW5kZWZpbmVkJ1xuICogYGBgXG4gKlxuICogLSBVc2luZyBDdXN0b20gVEV2ZW50XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IE1vZGVsRXZlbnQgfSBmcm9tICdAY2RwL21vZGVsJztcbiAqXG4gKiBpbnRlcmZhY2UgQ3VzdG9tRXZlbnQgZXh0ZW5kcyBNb2RlbEV2ZW50PENvbnRlbnRBdHRyaWJ1dGU+IHtcbiAqICAgZmlyZTogW2Jvb2xlYW4sIG51bWJlcl07XG4gKiB9XG4gKiBcbiAqIDpcbiAqXG4gKiAvLyBlYXJseSBjYXN0XG4gKiBjb25zdCBDb250ZW50QmFzZSA9IE1vZGVsIGFzIE1vZGVsQ29uc3RydWN0b3I8TW9kZWw8Q29udGVudEF0dHJpYnV0ZSwgQ3VzdG9tRXZlbnQ+LCBDb250ZW50QXR0cmlidXRlPjtcbiAqIGNsYXNzIENvbnRlbnQgZXh0ZW5kcyBDb250ZW50QmFzZSB7XG4gKiAgIDpcbiAqIH1cbiAqXG4gKiAvLyBsYXRlIGNhc3RcbiAqIGNsYXNzIENvbnRlbnRDbGFzcyBleHRlbmRzIE1vZGVsPENvbnRlbnRBdHRyaWJ1dGUsIEN1c3RvbUV2ZW50PiB7XG4gKiAgIDpcbiAqIH1cbiAqIGNvbnN0IENvbnRlbnQgPSBDb250ZW50Q2xhc3MgYXMgTW9kZWxDb25zdHJ1Y3RvcjxDb250ZW50Q2xhc3MsIENvbnRlbnRBdHRyaWJ1dGU+O1xuICpcbiAqIGNvbnN0IGNvbnRlbnQgPSBuZXcgQ29udGVudCh7IC4uLiB9KTtcbiAqIGNvbnRlbnQudHJpZ2dlcignZmlyZScsIHRydWUsIDEwMCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIE1vZGVsPFQgZXh0ZW5kcyBvYmplY3QgPSBhbnksIFRFdmVudCBleHRlbmRzIE1vZGVsRXZlbnQ8VD4gPSBNb2RlbEV2ZW50PFQ+PiBleHRlbmRzIEV2ZW50UmVjZWl2ZXIgaW1wbGVtZW50cyBFdmVudFNvdXJjZTxURXZlbnQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IElEIGF0dHJpYnV0ZSBuYW1lLlxuICAgICAqIEBqYSBJRCDjgqLjg4jjg6rjg5Pjg6Xjg7zjg4jlkI3jgavjgqLjgq/jgrvjgrlcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHN0YXRpYyBpZEF0dHJpYnV0ZSA9ICdpZCc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXR0cmlidXRlcyBwb29sXG4gICAgICogQGphIOWxnuaAp+agvOe0jemgmOWfn1xuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk8VD47XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgYXR0cmlidXRlIHZhbHVlc1xuICAgICAqICAtIGBqYWAg5bGe5oCn44Gu5Yid5pyf5YCk44KS5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlczogUmVxdWlyZWQ8VD4sIG9wdGlvbnM/OiBNb2RlbENvbnN0cnVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpO1xuICAgICAgICBjb25zdCBhdHRycyA9IG9wdHMucGFyc2UgPyB0aGlzLnBhcnNlKGF0dHJpYnV0ZXMsIG9wdHMpIGFzIFQgOiBhdHRyaWJ1dGVzO1xuICAgICAgICBjb25zdCBwcm9wczogUHJvcGVydHk8VD4gPSB7XG4gICAgICAgICAgICBhdHRyczogT2JzZXJ2YWJsZU9iamVjdC5mcm9tKGF0dHJzKSBhcyBBY2Nlc3NpYmxlPE9ic2VydmFibGVPYmplY3Q+LFxuICAgICAgICAgICAgYmFzZUF0dHJzOiB7IC4uLmF0dHJzIH0sXG4gICAgICAgICAgICBwcmV2QXR0cnM6IHsgLi4uYXR0cnMgfSxcbiAgICAgICAgICAgIGNpZDogbHVpZCgnbW9kZWw6JywgOCksXG4gICAgICAgICAgICBvcHRpb25zOiBvcHRzLFxuICAgICAgICAgICAgY2hhbmdlRmlyZWQ6IGZhbHNlLFxuICAgICAgICB9O1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgX3Byb3BlcnRpZXMsIHsgdmFsdWU6IHByb3BzIH0pO1xuXG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGF0dHJzKSkge1xuICAgICAgICAgICAgdGhpc1tfZGVmaW5lQXR0cmlidXRlc10odGhpcywga2V5KTtcbiAgICAgICAgfVxuXG4gICAgICAgICh0aGlzIGFzIGFueSlbX2NoYW5nZUhhbmRsZXJdID0gKCkgPT4ge1xuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BjaGFuZ2UnLCB0aGlzIGFzIE1vZGVsKTtcblxuICAgICAgICAgICAgY29uc3QgeyBfcHJldkF0dHJzLCBfYXR0cnMgfSA9IHRoaXM7XG4gICAgICAgICAgICBjb25zdCBjaGFuZ2VkS2V5cyA9IE9iamVjdC5rZXlzKGRpZmYoX3ByZXZBdHRycywgX2F0dHJzIGFzIHVua25vd24gYXMgUGFydGlhbDxUPikpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgY2hhbmdlZEtleXMpIHtcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBhbnkpLnRyaWdnZXIoYEBjaGFuZ2U6JHtrZXl9YCwgdGhpcywgX2F0dHJzW2tleV0sIF9wcmV2QXR0cnNba2V5XSwga2V5KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY2hhbmdlRmlyZWQgPSB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXNbX3ZhbGlkYXRlXSh7fSwgb3B0cyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBhdHRyaWJ1dGUgdXBkYXRlIGNvcmUgKi9cbiAgICBwcml2YXRlIFtfdXBkYXRlQXR0cmlidXRlc10obmFtZTogc3RyaW5nLCB2YWw6IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgaWYgKCFkZWVwRXF1YWwodGhpcy5fYXR0cnNbbmFtZV0sIHZhbCkpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgYXR0cnMsIGNoYW5nZUZpcmVkIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgICAgIGlmIChjaGFuZ2VGaXJlZCkge1xuICAgICAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNoYW5nZUZpcmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucHJldkF0dHJzID0geyAuLi5hdHRycyB9IGFzIFQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWxldGUgdGhpc1tfcHJvcGVydGllc10uY2hhbmdlZEF0dHJzO1xuICAgICAgICAgICAgYXNzaWduVmFsdWUodGhpcy5fcHJldkF0dHJzLCBuYW1lLCBhdHRyc1tuYW1lXSk7XG4gICAgICAgICAgICBhc3NpZ25WYWx1ZShhdHRycywgbmFtZSwgdmFsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgYXR0cmlidXRlIGJyaWRnZSBkZWYgKi9cbiAgICBwcml2YXRlIFtfZGVmaW5lQXR0cmlidXRlc10oaW5zdGFuY2U6IG9iamVjdCwgbmFtZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHByb3RvID0gaW5zdGFuY2UuY29uc3RydWN0b3IucHJvdG90eXBlO1xuICAgICAgICBpZiAoIShuYW1lIGluIHByb3RvKSkge1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCBuYW1lLCB7XG4gICAgICAgICAgICAgICAgZ2V0KCk6IHVua25vd24ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fYXR0cnNbbmFtZV07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzZXQodmFsOiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3VwZGF0ZUF0dHJpYnV0ZXNdKG5hbWUsIHZhbCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IHB1YmxpYyBwcm9wZXJ0aWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNvbnRlbnQgSUQuXG4gICAgICogQGphIOOCs+ODs+ODhuODs+ODhCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgaWRBdHRyID0gaWRBdHRyaWJ1dGUodGhpcywgJ2lkJyk7XG4gICAgICAgIGNvbnN0IHsgY2lkLCBhdHRycyB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiAoaWRBdHRyIGluIGF0dHJzKSA/IGF0dHJzW2lkQXR0cl0gYXMgc3RyaW5nIHx8IGNpZCA6IGNpZDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogcHJvdGVjdGVkIHByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2F0dHJzKCk6IEFjY2Vzc2libGU8T2JzZXJ2YWJsZU9iamVjdD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uYXR0cnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlZmF1bHQgYXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDml6LlrprlgKTlsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9iYXNlQXR0cnMoKTogVCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5iYXNlQXR0cnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFByZXZpb3VzIGF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5aSJ5pu05YmN44Gu5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcHJldkF0dHJzKCk6IEFjY2Vzc2libGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucHJldkF0dHJzIGFzIEFjY2Vzc2libGU8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoYW5nZWQgYXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDlpInmm7Tjga7jgYLjgaPjgZ/lsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9jaGFuZ2VkQXR0cnMoKTogUGFydGlhbDxUPiB7XG4gICAgICAgIGlmIChudWxsID09IHRoaXNbX3Byb3BlcnRpZXNdLmNoYW5nZWRBdHRycykge1xuICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY2hhbmdlZEF0dHJzID0gZGlmZih0aGlzLl9iYXNlQXR0cnMsIHRoaXMuX2F0dHJzIGFzIHVua25vd24gYXMgUGFydGlhbDxUPik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNoYW5nZWRBdHRycztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGludGVybmFsIGNvbnRlbnQgSUQuXG4gICAgICogQGphIOWGhemDqOOBruOCs+ODs+ODhuODs+ODhCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9jaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNpZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNyZWF0aW5nIG9wdGlvbnMuXG4gICAgICogQGphIOani+evieaZguOBruOCquODl+OCt+ODp+ODs+OCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX29wdGlvbnMoKTogTW9kZWxTZXRPcHRpb25zIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLm9wdGlvbnM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogZXZlbnRzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXZlbnRTb3VyY2UgdHlwZSByZXNvbHZlci5cbiAgICAgKiBAamEgRXZlbnRTb3VyY2Ug5Z6L6Kej5rG655So44OY44Or44OR44O844Ki44Kv44K744OD44K1XG4gICAgICovXG4gICAgZ2V0ICQoKTogRXZlbnRTb3VyY2U8VEV2ZW50PiB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgYnJva2VyIGFjY2VzcyAqL1xuICAgIHByaXZhdGUgZ2V0IFtfYnJva2VyXSgpOiBFdmVudEJyb2tlcjxhbnk+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzLl9hdHRycyBhcyBJT2JzZXJ2YWJsZSBhcyBJT2JzZXJ2YWJsZUV2ZW50QnJva2VyQWNjZXNzKS5nZXRCcm9rZXIoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgd2hldGhlciB0aGlzIG9iamVjdCBoYXMgY2xpZW50cy5cbiAgICAgKiBAamEg44Kv44Op44Kk44Ki44Oz44OI44GM5a2Y5Zyo44GZ44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBoYXNMaXN0ZW5lcjxDaGFubmVsIGV4dGVuZHMga2V5b2YgVEV2ZW50PihjaGFubmVsPzogQ2hhbm5lbCwgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPFRFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2Jyb2tlcl0uaGFzTGlzdGVuZXIoY2hhbm5lbCwgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHJlZ2lzdGVyZWQgY2hhbm5lbCBrZXlzLlxuICAgICAqIEBqYSDnmbvpjLLjgZXjgozjgabjgYTjgovjg4Hjg6Pjg43jg6vjgq3jg7zjgpLov5TljbRcbiAgICAgKi9cbiAgICBjaGFubmVscygpOiAoa2V5b2YgVEV2ZW50KVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2Jyb2tlcl0uY2hhbm5lbHMoKS5maWx0ZXIoYyA9PiAnQCcgIT09IGMpIGFzIChrZXlvZiBURXZlbnQpW107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE5vdGlmeSBldmVudCB0byBjbGllbnRzLlxuICAgICAqIEBqYSBldmVudCDnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgavmuKHjgZnlvJXmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgdHJpZ2dlcjxDaGFubmVsIGV4dGVuZHMga2V5b2YgVEV2ZW50PihjaGFubmVsOiBDaGFubmVsLCAuLi5hcmdzOiBBcmd1bWVudHM8UGFydGlhbDxURXZlbnRbQ2hhbm5lbF0+Pik6IHZvaWQge1xuICAgICAgICAodGhpc1tfYnJva2VyXSBhcyBhbnkpLnRyaWdnZXIoY2hhbm5lbCwgLi4uYXJncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGV2ZXJ5dGhpbmcgaXMgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuino+mZpFxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WQjOS4gCBgY2hhbm5lbGAg44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgcHVibGljIG9mZjxDaGFubmVsIGV4dGVuZHMga2V5b2YgVEV2ZW50PihjaGFubmVsPzogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPFRFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYXR0cnMub2ZmKGNoYW5uZWwgYXMgYW55LCBsaXN0ZW5lciBhcyBhbnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBvbjxDaGFubmVsIGV4dGVuZHMga2V5b2YgVEV2ZW50PihjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxURXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgdGhpcy5fYXR0cnMub24oJ0AnLCAodGhpcyBhcyBhbnkpW19jaGFuZ2VIYW5kbGVyXSk7XG4gICAgICAgIHJldHVybiB0aGlzLl9hdHRycy5vbihjaGFubmVsIGFzIGFueSwgbGlzdGVuZXIgYXMgYW55KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpIGJ1dCBpdCBjYXVzZXMgdGhlIGJvdW5kIGNhbGxiYWNrIHRvIG9ubHkgZmlyZSBvbmNlIGJlZm9yZSBiZWluZyByZW1vdmVkLlxuICAgICAqIEBqYSDkuIDluqbjgaDjgZHjg4/jg7Pjg4njg6rjg7PjgrDlj6/og73jgarjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgb25jZTxDaGFubmVsIGV4dGVuZHMga2V5b2YgVEV2ZW50PihjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxURXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMub24oY2hhbm5lbCwgbGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBtYW5hZ2VkID0gdGhpcy5vbihjaGFubmVsLCAoKSA9PiB7XG4gICAgICAgICAgICBjb250ZXh0LnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICBtYW5hZ2VkLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiB2YWxpZGF0aW9uXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdmFsaWQgb3Igbm90LlxuICAgICAqIEBqYSDmpJzoqLzjga7miJDlkKbjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaXNWYWxpZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFNVQ0NFRURFRCh0aGlzLnZhbGlkYXRlKHsgc2lsZW50OiB0cnVlIH0pLmNvZGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBWYWxpZGF0ZSByZXN1bHQgYWNjZXNzZXIuXG4gICAgICogQGphIOaknOiovOe1kOaenOOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyB2YWxpZGF0ZShvcHRpb25zPzogU2lsZW5jZWFibGUpOiBSZXN1bHQge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHZhbGlkYXRlOiB0cnVlLCBub1Rocm93OiB0cnVlLCBleHRlbmQ6IGZhbHNlIH0sIG9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gdGhpc1tfdmFsaWRhdGVdKHt9LCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuICAgIC8qKlxuICAgICAqIEBlbiBWYWxpZGF0ZSBkYXRhIG1ldGhvZC5cbiAgICAgKiBAamEg44OH44O844K/5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCB2YWxpZGF0ZWUgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg6KKr5qSc6Ki85bGe5oCnXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHZhbGlkYXRlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOaknOiovOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHByb3RlY3RlZCB2YWxpZGF0ZUF0dHJpYnV0ZXM8QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4sIG9wdGlvbnM/OiBNb2RlbFZhbGlkYXRlQXR0cmlidXRlT3B0aW9ucyk6IFJlc3VsdCB7XG4gICAgICAgIHJldHVybiBSRVNVTFRfVkFMSURfQVRUUlM7XG4gICAgfVxuXG4gICAgLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuICAgIC8qKiBAaW50ZXJuYWwgdmFsaWRhdGUgKi9cbiAgICBwcml2YXRlIFtfdmFsaWRhdGVdPEEgZXh0ZW5kcyBUPihhdHRyaWJ1dGVzOiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+LCBvcHRpb25zPzogTW9kZWxTZXRPcHRpb25zKTogUmVzdWx0IHwgbmV2ZXIge1xuICAgICAgICBjb25zdCB7IHZhbGlkYXRlLCBzaWxlbnQsIG5vVGhyb3cgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGlmICh2YWxpZGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgYXR0cnMgPSB7IC4uLnRoaXMuX2F0dHJzLCAuLi5hdHRyaWJ1dGVzIH07XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnZhbGlkYXRlQXR0cmlidXRlcyhhdHRycywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoRkFJTEVEKHJlc3VsdC5jb2RlKSkge1xuICAgICAgICAgICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAaW52YWxpZCcsIHRoaXMgYXMgTW9kZWwsIGF0dHJzLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIW5vVGhyb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUkVTVUxUX1ZBTElEX0FUVFJTO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogYXR0cmlidXRlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSB7QGxpbmsgTW9kZWx9IGhhcyB2YWxpZCBwcm9wZXJ0eS4gKG5vdCBgbnVsbGAgb3IgYHVuZGVmaW5lZGApXG4gICAgICogQGphIHtAbGluayBNb2RlbH0g44GM5pyJ5Yq544Gq44OX44Ot44OR44OG44Kj44KS5oyB44Gj44Gm44GE44KL44GL56K66KqNIChgbnVsbGAg44G+44Gf44GvIGB1bmRlZmluZWRgIOOBp+OBquOBhClcbiAgICAgKi9cbiAgICBwdWJsaWMgaGFzKGF0dHJpYnV0ZToga2V5b2YgVCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSAodGhpcy5fYXR0cnMgYXMgdW5rbm93biBhcyBUKVthdHRyaWJ1dGVdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIEhUTUwtZXNjYXBlZCB2YWx1ZSBvZiBhbiBhdHRyaWJ1dGUuXG4gICAgICogQGphIEhUTUwg44Gn5L2/55So44GZ44KL5paH5a2X44KS5Yi25b6h5paH5a2X44Gr572u5o+b44GX44Gf5bGe5oCn5YCk44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGVzY2FwZShhdHRyaWJ1dGU6IGtleW9mIFQpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gZXNjYXBlSFRNTCh0aGlzLl9hdHRyc1thdHRyaWJ1dGVdIGFzIFByaW1pdGl2ZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVwZGF0ZSBhdHRyaWJ1dGVzIGZvciBiYXRjaCBpbnB1dCB3aXRoIG9wdGlvbnMuXG4gICAgICogQGphIOWxnuaAp+OBruS4gOaLrOioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIHVwZGF0ZSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGphYCDmm7TmlrDlsZ7mgKdcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2V0IGF0dHJpYnV0ZXMgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5bGe5oCn5pu05paw55So44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldEF0dHJpYnV0ZXM8QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4sIG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBzaWxlbnQsIGV4dGVuZCB9ID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHNpbGVudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzLnN1c3BlbmQodHJ1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXNbX3ZhbGlkYXRlXShhdHRyaWJ1dGVzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChGQUlMRUQocmVzdWx0LmNvZGUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgYXR0ciBvZiBPYmplY3Qua2V5cyhhdHRyaWJ1dGVzKSkge1xuICAgICAgICAgICAgICAgIGlmIChhdHRyIGluIHRoaXMuX2F0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3VwZGF0ZUF0dHJpYnV0ZXNdKGF0dHIsIGF0dHJpYnV0ZXNbYXR0cl0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXh0ZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX2RlZmluZUF0dHJpYnV0ZXNdKHRoaXMsIGF0dHIpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzW191cGRhdGVBdHRyaWJ1dGVzXShhdHRyLCBhdHRyaWJ1dGVzW2F0dHJdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBpZiAoc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYXR0cnMucmVzdW1lKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgYWxsIGF0dHJpYnV0ZXMgb24gdGhlIHtAbGluayBNb2RlbH0uIChzZXQgYHVuZGVmaW5lZGApXG4gICAgICogQGphIHtAbGluayBNb2RlbH0g44GL44KJ44GZ44G544Gm44Gu5bGe5oCn44KS5YmK6ZmkIChgdW5kZWZpbmVkYCDjgpLoqK3lrpopXG4gICAgICovXG4gICAgcHVibGljIGNsZWFyKG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgY2xlYXJBdHRycyA9IHt9IGFzIEFjY2Vzc2libGU8b2JqZWN0PjtcbiAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIE9iamVjdC5rZXlzKHRoaXMuX2Jhc2VBdHRycykpIHtcbiAgICAgICAgICAgIGNsZWFyQXR0cnNbYXR0cl0gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0QXR0cmlidXRlcyhjbGVhckF0dHJzLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGEgY29weSBvZiB0aGUgbW9kZWwncyBgYXR0cmlidXRlc2Agb2JqZWN0LlxuICAgICAqIEBqYSBNb2RlbCDlsZ7mgKflgKTjga7jgrPjg5Tjg7zjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgdG9KU09OKCk6IFQge1xuICAgICAgICByZXR1cm4gZGVlcENvcHkoeyAuLi50aGlzLl9hdHRycyB9IGFzIFQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlcyBDbG9uZSB0aGlzIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7opIfoo73jgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHB1YmxpYyBjbG9uZSgpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBjb25zdHJ1Y3RvciwgX2F0dHJzLCBfb3B0aW9ucyB9ID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyAoY29uc3RydWN0b3IgYXMgQ29uc3RydWN0b3I8dGhpcz4pKF9hdHRycywgX29wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBjaGFuZ2VkIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIOWkieabtOOBleOCjOOBn+WxnuaAp+WApOOCkuaMgeOBpOOBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZVxuICAgICAqICAtIGBlbmAgY2hlY2tlZCBhdHRyaWJ1dGVcbiAgICAgKiAgLSBgamFgIOaknOiovOOBmeOCi+WxnuaAp1xuICAgICAqL1xuICAgIHB1YmxpYyBoYXNDaGFuZ2VkKGF0dHJpYnV0ZT86IGtleW9mIFQpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0gYXR0cmlidXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gIWlzRW1wdHlPYmplY3QodGhpcy5fY2hhbmdlZEF0dHJzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBhdHRyaWJ1dGUgaW4gdGhpcy5fY2hhbmdlZEF0dHJzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBhbiBvYmplY3QgY29udGFpbmluZyBhbGwgdGhlIGF0dHJpYnV0ZXMgdGhhdCBoYXZlIGNoYW5nZWQsIG9yIGB1bmRlZmluZWRgIGlmIHRoZXJlIGFyZSBubyBjaGFuZ2VkIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIOWFpeWKm+OBl+OBnyBhdHRyaWJ1dGVzIOWApOOBruW3ruWIhuOBq+WvvuOBl+OBpuWkieabtOOBjOOBguOCi+WxnuaAp+WApOOCkui/lOWNtC4g5beu5YiG44GM44Gq44GE5aC05ZCI44GvIGB1bmRlZmllbmRgIOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIGNoZWNrZWQgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg5qSc6Ki844GZ44KL5bGe5oCnXG4gICAgICovXG4gICAgcHVibGljIGNoYW5nZWQoYXR0cmlidXRlcz86IFBhcnRpYWw8VD4pOiBQYXJ0aWFsPFQ+IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKCFhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oYXNDaGFuZ2VkKCkgPyB7IC4uLnRoaXMuX2NoYW5nZWRBdHRycyB9IDogdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgY2hhbmdlZCA9IGRpZmYodGhpcy5fYXR0cnMsIGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgcmV0dXJuICFpc0VtcHR5T2JqZWN0KGNoYW5nZWQpID8gY2hhbmdlZCA6IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHByZXZpb3VzIHZhbHVlIG9mIGFuIGF0dHJpYnV0ZSwgcmVjb3JkZWQgYXQgdGhlIHRpbWUgdGhlIGxhc3QgYEBjaGFuZ2VgIGV2ZW50IHdhcyBmaXJlZC5cbiAgICAgKiBAamEgYEBjaGFuZ2VgIOOBjOeZuueBq+OBleOCjOOBn+WJjeOBruWxnuaAp+WApOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2aW91czxLIGV4dGVuZHMga2V5b2YgVD4oYXR0cmlidXRlOiBLKTogVFtLXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wcmV2QXR0cnNbYXR0cmlidXRlXTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBzeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgYSB7QGxpbmsgTW9kZWx9IGlzIG5ldyBpZiBpdCBoYXMgbmV2ZXIgYmVlbiBzYXZlZCB0byB0aGUgc2VydmVyLCBhbmQgbGFja3MgYW4gaWQuXG4gICAgICogQGphIHtAbGluayBNb2RlbH0g44GM44G+44Gg44K144O844OQ44O844Gr5a2Y5Zyo44GX44Gq44GE44GL44OB44Kn44OD44KvLiDml6Llrprjgafjga8gYGlkQXR0cmlidXRlYCDjga7mnInnhKHjgafliKTlrppcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgaXNOZXcoKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGlkQXR0ciA9IGlkQXR0cmlidXRlKHRoaXMsICdpZCcpO1xuICAgICAgICByZXR1cm4gIXRoaXMuaGFzKGlkQXR0ciBhcyBrZXlvZiBUKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29udmVydHMgYSByZXNwb25zZSBpbnRvIHRoZSBoYXNoIG9mIGF0dHJpYnV0ZXMgdG8gYmUgYHNldGAgb24gdGhlIG1vZGVsLiBUaGUgZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiBpcyBqdXN0IHRvIHBhc3MgdGhlIHJlc3BvbnNlIGFsb25nLlxuICAgICAqIEBqYSDjg6zjgrnjg53jg7Pjgrnjga7lpInmj5vjg6Hjgr3jg4Pjg4kuIOaXouWumuOBp+OBr+S9leOCguOBl+OBquOBhFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHBhcnNlKHJlc3BvbnNlOiBNb2RlbFNlZWQgfCB2b2lkLCBvcHRpb25zPzogTW9kZWxTZXRPcHRpb25zKTogVCB8IHZvaWQgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UgYXMgVDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUHJveHkge0BsaW5rIElEYXRhU3luYy5zeW5jIHwgSURhdGFTeW5jLnN5bmN9KCkgYnkgZGVmYXVsdCAtLSBidXQgb3ZlcnJpZGUgdGhpcyBpZiB5b3UgbmVlZCBjdXN0b20gc3luY2luZyBzZW1hbnRpY3MgZm9yICp0aGlzKiBwYXJ0aWN1bGFyIG1vZGVsLlxuICAgICAqIEBqYSDjg4fjg7zjgr/lkIzmnJ8uIOW/heimgeOBq+W/nOOBmOOBpuOCquODvOODkOODvOODqeOCpOODieWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44Kq44Oa44Os44O844K344On44Oz44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIHN5bmNocm9uaXplZCBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWAg5ZCM5pyf44GZ44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBzeW5jPEsgZXh0ZW5kcyBNb2RlbFN5bmNNZXRob2RzPihtZXRob2Q6IEssIGNvbnRleHQ6IE1vZGVsPFQ+LCBvcHRpb25zPzogTW9kZWxEYXRhU3luY09wdGlvbnMpOiBQcm9taXNlPE1vZGVsU3luY1Jlc3VsdDxLLCBUPj4ge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFN5bmMoKS5zeW5jKG1ldGhvZCwgY29udGV4dCBhcyBTeW5jQ29udGV4dDxUPiwgb3B0aW9ucykgYXMgdW5rbm93biBhcyBQcm9taXNlPE1vZGVsU3luY1Jlc3VsdDxLLCBUPj47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZldGNoIHRoZSB7QGxpbmsgTW9kZWx9IGZyb20gdGhlIHNlcnZlciwgbWVyZ2luZyB0aGUgcmVzcG9uc2Ugd2l0aCB0aGUgbW9kZWwncyBsb2NhbCBhdHRyaWJ1dGVzLlxuICAgICAqIEBqYSB7QGxpbmsgTW9kZWx9IOWxnuaAp+OBruOCteODvOODkOODvOWQjOacny4g44Os44K544Od44Oz44K544Gu44Oe44O844K444KS5a6f6KGMXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGZldGNoKG9wdGlvbnM/OiBNb2RlbEZldGNoT3B0aW9ucyk6IFByb21pc2U8VD4ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHBhcnNlOiB0cnVlIH0sIG9wdGlvbnMsIHsgc3luY01ldGhvZDogJ3JlYWQnIH0pO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwID0gYXdhaXQgdGhpcy5zeW5jKCdyZWFkJywgdGhpcyBhcyBNb2RlbDxUPiwgb3B0cyk7XG4gICAgICAgICAgICB0aGlzLnNldEF0dHJpYnV0ZXMob3B0cy5wYXJzZSA/IHRoaXMucGFyc2UocmVzcCBhcyBNb2RlbFNlZWQsIG9wdHMpIGFzIFQgOiByZXNwLCBvcHRzKTtcbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAc3luYycsIHRoaXMgYXMgTW9kZWwsIHJlc3AgYXMgTW9kZWxTZWVkLCBvcHRzKTtcbiAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGVycm9yJywgdGhpcyBhcyBNb2RlbCwgZSwgb3B0cyk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBhIGhhc2ggb2Yge0BsaW5rIE1vZGVsfSBhdHRyaWJ1dGVzLCBhbmQgc3luYyB0aGUgbW9kZWwgdG8gdGhlIHNlcnZlci4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgc2VydmVyIHJldHVybnMgYW4gYXR0cmlidXRlcyBoYXNoIHRoYXQgZGlmZmVycywgdGhlIG1vZGVsJ3Mgc3RhdGUgd2lsbCBiZSBgc2V0YCBhZ2Fpbi5cbiAgICAgKiBAamEge0BsaW5rIE1vZGVsfSDlsZ7mgKfjgpLjgrXjg7zjg5Djg7zjgavkv53lrZguIDxicj5cbiAgICAgKiAgICAg55Ww44Gq44KL5bGe5oCn44GM6L+U5Y2044GV44KM44KL5aC05ZCI44Gv5YaN6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCB1cGRhdGUgYXR0cmlidXRlIGtleVxuICAgICAqICAtIGBqYWAg5pu05paw5bGe5oCn44Kt44O8XG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB1cGRhdGUgYXR0cmlidXRlIHZhbHVlXG4gICAgICogIC0gYGphYCDmm7TmlrDlsZ7mgKflgKRcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2F2ZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDkv53lrZjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgc2F2ZTxLIGV4dGVuZHMga2V5b2YgVD4oa2V5Pzoga2V5b2YgVCwgdmFsdWU/OiBUW0tdLCBvcHRpb25zPzogTW9kZWxTYXZlT3B0aW9ucyk6IFByb21pc2U8VCB8IHZvaWQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBhIGhhc2ggb2Yge0BsaW5rIE1vZGVsfSBhdHRyaWJ1dGVzLCBhbmQgc3luYyB0aGUgbW9kZWwgdG8gdGhlIHNlcnZlci4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgc2VydmVyIHJldHVybnMgYW4gYXR0cmlidXRlcyBoYXNoIHRoYXQgZGlmZmVycywgdGhlIG1vZGVsJ3Mgc3RhdGUgd2lsbCBiZSBgc2V0YCBhZ2Fpbi5cbiAgICAgKiBAamEge0BsaW5rIE1vZGVsfSDlsZ7mgKfjgpLjgrXjg7zjg5Djg7zjgavkv53lrZguIDxicj5cbiAgICAgKiAgICAg55Ww44Gq44KL5bGe5oCn44GM6L+U5Y2044GV44KM44KL5aC05ZCI44Gv5YaN6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgdXBkYXRlIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgamFgIOabtOaWsOWxnuaAp1xuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzYXZlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOS/neWtmOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBzYXZlPEEgZXh0ZW5kcyBUPihhdHRyaWJ1dGVzOiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+IHwgTnVsbGlzaCwgb3B0aW9ucz86IE1vZGVsU2F2ZU9wdGlvbnMpOiBQcm9taXNlPFQgfCB2b2lkPjtcblxuICAgIHB1YmxpYyBhc3luYyBzYXZlKC4uLmFyZ3M6IHVua25vd25bXSk6IFByb21pc2U8VCB8IHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBhdHRycywgb3B0aW9ucyB9ID0gcGFyc2VTYXZlQXJncyguLi5hcmdzKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyB2YWxpZGF0ZTogdHJ1ZSwgcGFyc2U6IHRydWUsIHdhaXQ6IHRydWUsIGV4dGVuZDogdHJ1ZSB9LCBvcHRpb25zKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyB3YWl0IH0gPSBvcHRzO1xuXG4gICAgICAgICAgICBjb25zdCBtZXRob2QgPSBvcHRzLnN5bmNNZXRob2QgPSB0aGlzLmlzTmV3KCkgPyAnY3JlYXRlJyA6IG9wdHMucGF0Y2ggPyAncGF0Y2gnIDogJ3VwZGF0ZSc7XG5cbiAgICAgICAgICAgIGlmIChhdHRycykge1xuICAgICAgICAgICAgICAgIGlmICghd2FpdCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEF0dHJpYnV0ZXMoYXR0cnMsIG9wdHMpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5iYXNlQXR0cnMgPSB7IC4uLnRoaXMuX2F0dHJzIH0gYXMgVDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW192YWxpZGF0ZV0oYXR0cnMsIG9wdHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoJ3BhdGNoJyA9PT0gbWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdHMuZGF0YSA9IGF0dHJzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdHMuZGF0YSA9IE9iamVjdC5hc3NpZ24odGhpcy50b0pTT04oKSwgYXR0cnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzcCA9IGF3YWl0IHRoaXMuc3luYyhtZXRob2QsIHRoaXMgYXMgTW9kZWw8VD4sIG9wdHMpO1xuXG4gICAgICAgICAgICBsZXQgc2VydmVyQXR0cnMgPSBvcHRzLnBhcnNlID8gdGhpcy5wYXJzZShyZXNwLCBvcHRzKSA6IHJlc3A7XG4gICAgICAgICAgICBpZiAoYXR0cnMgJiYgd2FpdCkge1xuICAgICAgICAgICAgICAgIHNlcnZlckF0dHJzID0gT2JqZWN0LmFzc2lnbih7fSwgYXR0cnMsIHNlcnZlckF0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc09iamVjdChzZXJ2ZXJBdHRycykgJiYgIWlzRW1wdHlPYmplY3Qoc2VydmVyQXR0cnMpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGVzKHNlcnZlckF0dHJzIGFzIFQsIG9wdHMpO1xuICAgICAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmJhc2VBdHRycyA9IHsgLi4udGhpcy5fYXR0cnMgfSBhcyBUO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQHN5bmMnLCB0aGlzIGFzIE1vZGVsLCByZXNwIGFzIE1vZGVsU2VlZCwgb3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcCBhcyBUO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGVycm9yJywgdGhpcyBhcyBNb2RlbCwgZSwgb3B0cyk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlc3Ryb3kgdGhpcyB7QGxpbmsgTW9kZWx9IG9uIHRoZSBzZXJ2ZXIgaWYgaXQgd2FzIGFscmVhZHkgcGVyc2lzdGVkLlxuICAgICAqIEBqYSB7QGxpbmsgTW9kZWx9IOOCkuOCteODvOODkOODvOOBi+OCieWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGRlc3Ryb3kgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg56C05qOE44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGRlc3Ryb3kob3B0aW9ucz86IE1vZGVsRGVzdHJveU9wdGlvbnMpOiBQcm9taXNlPFQgfCB2b2lkPiB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgd2FpdDogdHJ1ZSB9LCBvcHRpb25zLCB7IHN5bmNNZXRob2Q6ICdkZWxldGUnIH0pO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IHdhaXQsIGNhbmNlbCB9ID0gb3B0cztcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0cyA9ICF0aGlzLmlzTmV3KCk7XG4gICAgICAgICAgICBjb25zdCBkZXN0cnVjdCA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGRlc3Ryb3knLCB0aGlzIGFzIE1vZGVsLCBvcHRzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICF3YWl0ICYmIGRlc3RydWN0KCk7XG5cbiAgICAgICAgICAgIGxldCByZXNwOiBNb2RlbFNlZWQgfCB2b2lkIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKCFleGlzdHMpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBjYyhjYW5jZWwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNwID0gYXdhaXQgdGhpcy5zeW5jKCdkZWxldGUnLCB0aGlzIGFzIE1vZGVsPFQ+LCBvcHRzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgd2FpdCAmJiBkZXN0cnVjdCgpO1xuICAgICAgICAgICAgZXhpc3RzICYmICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAc3luYycsIHRoaXMgYXMgTW9kZWwsIHJlc3AgYXMgTW9kZWxTZWVkLCBvcHRzKTtcblxuICAgICAgICAgICAgcmV0dXJuIHJlc3AgYXMgVDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BlcnJvcicsIHRoaXMgYXMgTW9kZWwsIGUsIG9wdHMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gbWl4aW4g44Gr44KI44KLIGBpbnN0YW5jZW9mYCDjga/nhKHlirnjgavoqK3lrppcbnNldE1peENsYXNzQXR0cmlidXRlKE1vZGVsIGFzIHVua25vd24gYXMgQ2xhc3MsICdpbnN0YW5jZU9mJywgbnVsbCk7XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIHtAbGluayBNb2RlbH0uXG4gKiBAamEge0BsaW5rIE1vZGVsfSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc01vZGVsKHg6IHVua25vd24pOiB4IGlzIE1vZGVsIHtcbiAgICByZXR1cm4geCBpbnN0YW5jZW9mIE1vZGVsO1xufVxuXG4vKipcbiAqIEBlbiBRdWVyeSB7QGxpbmsgTW9kZWx9IGBpZC1hdHRyaWJ1dGVgLlxuICogQGphIHtAbGluayBNb2RlbH0g44GuIGBpZC1hdHRyaWJ1dGVgIOOCkuWPluW+l1xuICovXG5leHBvcnQgZnVuY3Rpb24gaWRBdHRyaWJ1dGUoeDogdW5rbm93biwgZmFsbGJhY2sgPSAnJyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGlzT2JqZWN0KHgpID8gKCh4LmNvbnN0cnVjdG9yIGFzIGFueSlbJ2lkQXR0cmlidXRlJ10gfHwgZmFsbGJhY2spIDogZmFsbGJhY2s7XG59XG4iXSwibmFtZXMiOlsibWFrZVJlc3VsdCIsIlJFU1VMVF9DT0RFIiwiaXNPYmplY3QiLCJhc3NpZ25WYWx1ZSIsIkV2ZW50UmVjZWl2ZXIiLCJPYnNlcnZhYmxlT2JqZWN0IiwibHVpZCIsImRpZmYiLCJkZWVwRXF1YWwiLCJTVUNDRUVERUQiLCJyZXN1bHQiLCJGQUlMRUQiLCJlc2NhcGVIVE1MIiwiZGVlcENvcHkiLCJpc0VtcHR5T2JqZWN0IiwiZGVmYXVsdFN5bmMiLCJjYyIsInNldE1peENsYXNzQXR0cmlidXRlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7SUFHRztJQUVILENBQUEsWUFBcUI7SUFNakI7OztJQUdHO0lBQ0gsSUFBQSxJQUdDLFdBQUEsR0FBQSxXQUFBLENBQUEsV0FBQSxDQUFBO0lBSEQsSUFBQSxDQUFBLFlBQXVCO0lBQ25CLFFBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQSxtQkFBQSxDQUFBLEdBQUEsZ0JBQUEsQ0FBQSxHQUFBLG1CQUFpRCxDQUFBO1lBQ2pELFdBQXlCLENBQUEsV0FBQSxDQUFBLHdCQUFBLENBQUEsR0FBQSxXQUFBLENBQUEsa0JBQWtCLENBQXVCLEdBQUEsNkJBQUEsRUFBQSwrQkFBd0IsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFBLEdBQUEsd0JBQUEsQ0FBQTtJQUNqSCxLQUFDLEdBQUEsQ0FBQTtJQUNMLENBQUMsR0FBQTs7SUNuQkQ7O0lBRUc7SUF1REgsaUJBQWlCLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVELGlCQUFpQixNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM1RCxpQkFBaUIsTUFBTSxTQUFTLEdBQVcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzlELGlCQUFpQixNQUFNLGNBQWMsR0FBTSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDOUQsaUJBQWlCLE1BQU0sT0FBTyxHQUFhLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM1RCxpQkFBaUIsTUFBTSxXQUFXLEdBQVMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBYWhFOzs7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