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
        if (options?.data) {
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
            const { validate, silent, noThrow } = options ?? {};
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
            const { silent, extend } = options ?? {};
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
        return coreUtils.isObject(x) ? (x.constructor.idAttribute || fallback) : fallback;
    }

    exports.Model = Model;
    exports.RESULT_VALID_ATTRS = RESULT_VALID_ATTRS;
    exports.idAttribute = idAttribute;
    exports.isModel = isModel;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwuanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJiYXNlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgTU9ERUwgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyA1LFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX01PREVMX0RFQ0xBUkUgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfREFUQSA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLk1PREVMICsgMSwgJ2ludmFsaWQgZGF0YS4nKSxcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBQcmltaXRpdmUsXG4gICAgTnVsbGlzaCxcbiAgICBBY2Nlc3NpYmxlLFxuICAgIENvbnN0cnVjdG9yLFxuICAgIENsYXNzLFxuICAgIEFyZ3VtZW50cyxcbiAgICBpc09iamVjdCxcbiAgICBpc0VtcHR5T2JqZWN0LFxuICAgIGx1aWQsXG4gICAgZXNjYXBlSFRNTCxcbiAgICBhc3NpZ25WYWx1ZSxcbiAgICBkZWVwQ29weSxcbiAgICBkZWVwRXF1YWwsXG4gICAgZGlmZixcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgU3Vic2NyaXB0aW9uLFxuICAgIFNpbGVuY2VhYmxlLFxuICAgIEV2ZW50QnJva2VyLFxuICAgIEV2ZW50UmVjZWl2ZXIsXG4gICAgRXZlbnRTb3VyY2UsXG59IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IGNoZWNrQ2FuY2VsZWQgYXMgY2MgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHtcbiAgICBJT2JzZXJ2YWJsZSxcbiAgICBJT2JzZXJ2YWJsZUV2ZW50QnJva2VyQWNjZXNzLFxuICAgIE9ic2VydmFibGVPYmplY3QsXG59IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQge1xuICAgIFJFU1VMVF9DT0RFLFxuICAgIFJlc3VsdCxcbiAgICBtYWtlUmVzdWx0LFxuICAgIFNVQ0NFRURFRCxcbiAgICBGQUlMRUQsXG59IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IFN5bmNDb250ZXh0LCBkZWZhdWx0U3luYyB9IGZyb20gJ0BjZHAvZGF0YS1zeW5jJztcbmltcG9ydCB7XG4gICAgTW9kZWxTZWVkLFxuICAgIE1vZGVsRXZlbnQsXG4gICAgTW9kZWxWYWxpZGF0ZUF0dHJpYnV0ZU9wdGlvbnMsXG4gICAgTW9kZWxBdHRyaWJ1dGVJbnB1dCxcbiAgICBNb2RlbFNldE9wdGlvbnMsXG4gICAgTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIE1vZGVsU3luY01ldGhvZHMsXG4gICAgTW9kZWxTeW5jUmVzdWx0LFxuICAgIE1vZGVsRGF0YVN5bmNPcHRpb25zLFxuICAgIE1vZGVsRmV0Y2hPcHRpb25zLFxuICAgIE1vZGVsU2F2ZU9wdGlvbnMsXG4gICAgTW9kZWxEZXN0cm95T3B0aW9ucyxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfZGVmaW5lQXR0cmlidXRlcyA9IFN5bWJvbCgnZGVmaW5lJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF91cGRhdGVBdHRyaWJ1dGVzID0gU3ltYm9sKCd1cGRhdGUnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3ZhbGlkYXRlICAgICAgICAgPSBTeW1ib2woJ3ZhbGlkYXRlJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9jaGFuZ2VIYW5kbGVyICAgID0gU3ltYm9sKCdvbmNoYW5nZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYnJva2VyICAgICAgICAgICA9IFN5bWJvbCgnYnJva2VyJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzICAgICAgID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eTxUPiB7XG4gICAgYXR0cnM6IEFjY2Vzc2libGU8T2JzZXJ2YWJsZU9iamVjdD47XG4gICAgYmFzZUF0dHJzOiBUO1xuICAgIHByZXZBdHRyczogVDtcbiAgICBjaGFuZ2VkQXR0cnM/OiBQYXJ0aWFsPFQ+O1xuICAgIHJlYWRvbmx5IGNpZDogc3RyaW5nO1xuICAgIHJlYWRvbmx5IG9wdGlvbnM6IE1vZGVsU2V0T3B0aW9ucztcbiAgICBjaGFuZ2VGaXJlZDogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZW4gVmFsaWQgYXR0cmlidXRlcyByZXN1bHQuXG4gKiBAamEg5bGe5oCn5qSc6Ki844Gu5pyJ5Yq55YCkXG4gKi9cbmV4cG9ydCBjb25zdCBSRVNVTFRfVkFMSURfQVRUUlMgPSBPYmplY3QuZnJlZXplKG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuU1VDQ0VTUywgJ3ZhbGlkIGF0dHJpYnV0ZS4nKSk7XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzYXZlKCkgKi9cbmZ1bmN0aW9uIHBhcnNlU2F2ZUFyZ3M8QSBleHRlbmRzIG9iamVjdD4oLi4uYXJnczogYW55W10pOiB7IGF0dHJzPzogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPjsgb3B0aW9ucz86IE1vZGVsU2F2ZU9wdGlvbnM7IH0ge1xuICAgIGxldCBba2V5LCB2YWx1ZSwgb3B0aW9uc10gPSBhcmdzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIHByZWZlci1jb25zdFxuICAgIGxldCBhdHRyczogYW55O1xuXG4gICAgaWYgKG51bGwgPT0ga2V5IHx8IGlzT2JqZWN0KGtleSkpIHtcbiAgICAgICAgYXR0cnMgPSBrZXk7XG4gICAgICAgIG9wdGlvbnMgPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBhc3NpZ25WYWx1ZShhdHRycyA9IHt9LCBrZXksIHZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucz8uZGF0YSkge1xuICAgICAgICBhdHRycyA9IE9iamVjdC5hc3NpZ24oYXR0cnMgfHwge30sIG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgYXR0cnMsIG9wdGlvbnMgfTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEJhc2UgY2xhc3MgZGVmaW5pdGlvbiBmb3IgbW9kZWwgdGhhdCBwcm92aWRlcyBhIGJhc2ljIHNldCBvZiBmdW5jdGlvbmFsaXR5IGZvciBtYW5hZ2luZyBpbnRlcmFjdGlvbi5cbiAqIEBqYSDjgqTjg7Pjgr/jg6njgq/jgrfjg6fjg7Pjga7jgZ/jgoHjga7ln7rmnKzmqZ/og73jgpLmj5DkvpvjgZnjgosgTW9kZWwg44Gu5Z+65bqV44Kv44Op44K55a6a576pXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBNb2RlbCwgTW9kZWxDb25zdHJ1Y3RvciB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogaW50ZXJmYWNlIENvbnRlbnRBdHRyaWJ1dGUge1xuICogICB1cmk6IHN0cmluZztcbiAqICAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyO1xuICogICBjb29raWU/OiBzdHJpbmc7XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiAtIEJhc2ljIFVzYWdlXG4gKlxuICogYGBgdHNcbiAqIC8vIGVhcmx5IGNhc3RcbiAqIGNvbnN0IENvbnRlbnRCYXNlID0gTW9kZWwgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbDxDb250ZW50QXR0cmlidXRlPiwgQ29udGVudEF0dHJpYnV0ZT47XG4gKlxuICogY2xhc3MgQ29udGVudCBleHRlbmRzIENvbnRlbnRCYXNlIHtcbiAqICAgY29uc3RydWN0b3IoYXR0cnM6IENvbnRlbnRBdHRyaWJ1dGUpIHtcbiAqICAgICBzdXBlcihhdHRycyk7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIG9yXG4gKlxuICogYGBgdHNcbiAqIC8vIGxhdGUgY2FzdFxuICogY2xhc3MgQ29udGVudENsYXNzIGV4dGVuZHMgTW9kZWw8Q29udGVudEF0dHJpYnV0ZT4ge1xuICogICBjb25zdHJ1Y3RvcihhdHRyczogQ29udGVudEF0dHJpYnV0ZSkge1xuICogICAgIHN1cGVyKGF0dHJzKTtcbiAqICAgfVxuICogfVxuICpcbiAqIGNvbnN0IENvbnRlbnQgPSBDb250ZW50Q2xhc3MgYXMgTW9kZWxDb25zdHJ1Y3RvcjxDb250ZW50Q2xhc3MsIENvbnRlbnRBdHRyaWJ1dGU+O1xuICogYGBgXG4gKiB0aGVuXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGNvbnRlbnQgPSBuZXcgQ29udGVudCh7XG4gKiAgIHVyaTogJ2FhYS50eHQnLFxuICogICBzaXplOiAxMCxcbiAqICAgY29va2llOiB1bmRlZmluZWQsIC8vIG5lZWQgZXhwbGljaXQgYXNzaWduXG4gKiB9KTtcbiAqXG4gKiBjb25zb2xlLmxvZyhjb250ZW50LnVyaSk7ICAgIC8vICdhYWEudHh0J1xuICogY29uc29sZS5sb2coY29udGVudC5zaXplKTsgICAvLyAnMTAnXG4gKiBjb25zb2xlLmxvZyhjb250ZW50LmNvb2tpZSk7IC8vICd1bmRlZmluZWQnXG4gKiBgYGBcbiAqXG4gKiAtIFVzaW5nIEN1c3RvbSBURXZlbnRcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgTW9kZWxFdmVudCB9IGZyb20gJ0BjZHAvbW9kZWwnO1xuICpcbiAqIGludGVyZmFjZSBDdXN0b21FdmVudCBleHRlbmRzIE1vZGVsRXZlbnQ8Q29udGVudEF0dHJpYnV0ZT4ge1xuICogICBmaXJlOiBbYm9vbGVhbiwgbnVtYmVyXTtcbiAqIH1cbiAqIFxuICogOlxuICpcbiAqIC8vIGVhcmx5IGNhc3RcbiAqIGNvbnN0IENvbnRlbnRCYXNlID0gTW9kZWwgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbDxDb250ZW50QXR0cmlidXRlLCBDdXN0b21FdmVudD4sIENvbnRlbnRBdHRyaWJ1dGU+O1xuICogY2xhc3MgQ29udGVudCBleHRlbmRzIENvbnRlbnRCYXNlIHtcbiAqICAgOlxuICogfVxuICpcbiAqIC8vIGxhdGUgY2FzdFxuICogY2xhc3MgQ29udGVudENsYXNzIGV4dGVuZHMgTW9kZWw8Q29udGVudEF0dHJpYnV0ZSwgQ3VzdG9tRXZlbnQ+IHtcbiAqICAgOlxuICogfVxuICogY29uc3QgQ29udGVudCA9IENvbnRlbnRDbGFzcyBhcyBNb2RlbENvbnN0cnVjdG9yPENvbnRlbnRDbGFzcywgQ29udGVudEF0dHJpYnV0ZT47XG4gKlxuICogY29uc3QgY29udGVudCA9IG5ldyBDb250ZW50KHsgLi4uIH0pO1xuICogY29udGVudC50cmlnZ2VyKCdmaXJlJywgdHJ1ZSwgMTAwKTtcbiAqIGBgYFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTW9kZWw8VCBleHRlbmRzIG9iamVjdCA9IGFueSwgVEV2ZW50IGV4dGVuZHMgTW9kZWxFdmVudDxUPiA9IE1vZGVsRXZlbnQ8VD4+IGV4dGVuZHMgRXZlbnRSZWNlaXZlciBpbXBsZW1lbnRzIEV2ZW50U291cmNlPFRFdmVudD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgSUQgYXR0cmlidXRlIG5hbWUuXG4gICAgICogQGphIElEIOOCouODiOODquODk+ODpeODvOODiOWQjeOBq+OCouOCr+OCu+OCuVxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgc3RhdGljIGlkQXR0cmlidXRlID0gJ2lkJztcblxuICAgIC8qKlxuICAgICAqIEBlbiBBdHRyaWJ1dGVzIHBvb2xcbiAgICAgKiBAamEg5bGe5oCn5qC857SN6aCY5Z+fXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTxUPjtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgaW5pdGlhbCBhdHRyaWJ1dGUgdmFsdWVzXG4gICAgICogIC0gYGphYCDlsZ7mgKfjga7liJ3mnJ/lgKTjgpLmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhdHRyaWJ1dGVzOiBSZXF1aXJlZDxUPiwgb3B0aW9ucz86IE1vZGVsQ29uc3RydWN0aW9uT3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IGF0dHJzID0gb3B0cy5wYXJzZSA/IHRoaXMucGFyc2UoYXR0cmlidXRlcywgb3B0cykgYXMgVCA6IGF0dHJpYnV0ZXM7XG4gICAgICAgIGNvbnN0IHByb3BzOiBQcm9wZXJ0eTxUPiA9IHtcbiAgICAgICAgICAgIGF0dHJzOiBPYnNlcnZhYmxlT2JqZWN0LmZyb20oYXR0cnMpIGFzIEFjY2Vzc2libGU8T2JzZXJ2YWJsZU9iamVjdD4sXG4gICAgICAgICAgICBiYXNlQXR0cnM6IHsgLi4uYXR0cnMgfSxcbiAgICAgICAgICAgIHByZXZBdHRyczogeyAuLi5hdHRycyB9LFxuICAgICAgICAgICAgY2lkOiBsdWlkKCdtb2RlbDonLCA4KSxcbiAgICAgICAgICAgIG9wdGlvbnM6IG9wdHMsXG4gICAgICAgICAgICBjaGFuZ2VGaXJlZDogZmFsc2UsXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBfcHJvcGVydGllcywgeyB2YWx1ZTogcHJvcHMgfSk7XG5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoYXR0cnMpKSB7XG4gICAgICAgICAgICB0aGlzW19kZWZpbmVBdHRyaWJ1dGVzXSh0aGlzLCBrZXkpO1xuICAgICAgICB9XG5cbiAgICAgICAgKHRoaXMgYXMgYW55KVtfY2hhbmdlSGFuZGxlcl0gPSAoKSA9PiB7XG4gICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGNoYW5nZScsIHRoaXMgYXMgTW9kZWwpO1xuXG4gICAgICAgICAgICBjb25zdCB7IF9wcmV2QXR0cnMsIF9hdHRycyB9ID0gdGhpcztcbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZWRLZXlzID0gT2JqZWN0LmtleXMoZGlmZihfcHJldkF0dHJzLCBfYXR0cnMgYXMgdW5rbm93biBhcyBQYXJ0aWFsPFQ+KSk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBjaGFuZ2VkS2V5cykge1xuICAgICAgICAgICAgICAgICh0aGlzIGFzIGFueSkudHJpZ2dlcihgQGNoYW5nZToke2tleX1gLCB0aGlzLCBfYXR0cnNba2V5XSwgX3ByZXZBdHRyc1trZXldLCBrZXkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VGaXJlZCA9IHRydWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpc1tfdmFsaWRhdGVdKHt9LCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGF0dHJpYnV0ZSB1cGRhdGUgY29yZSAqL1xuICAgIHByaXZhdGUgW191cGRhdGVBdHRyaWJ1dGVzXShuYW1lOiBzdHJpbmcsIHZhbDogdW5rbm93bik6IHZvaWQge1xuICAgICAgICBpZiAoIWRlZXBFcXVhbCh0aGlzLl9hdHRyc1tuYW1lXSwgdmFsKSkge1xuICAgICAgICAgICAgY29uc3QgeyBhdHRycywgY2hhbmdlRmlyZWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICAgICAgaWYgKGNoYW5nZUZpcmVkKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY2hhbmdlRmlyZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5wcmV2QXR0cnMgPSB7IC4uLmF0dHJzIH0gYXMgVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnM7XG4gICAgICAgICAgICBhc3NpZ25WYWx1ZSh0aGlzLl9wcmV2QXR0cnMsIG5hbWUsIGF0dHJzW25hbWVdKTtcbiAgICAgICAgICAgIGFzc2lnblZhbHVlKGF0dHJzLCBuYW1lLCB2YWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBhdHRyaWJ1dGUgYnJpZGdlIGRlZiAqL1xuICAgIHByaXZhdGUgW19kZWZpbmVBdHRyaWJ1dGVzXShpbnN0YW5jZTogb2JqZWN0LCBuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgcHJvdG8gPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG4gICAgICAgIGlmICghKG5hbWUgaW4gcHJvdG8pKSB7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sIG5hbWUsIHtcbiAgICAgICAgICAgICAgICBnZXQoKTogdW5rbm93biB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9hdHRyc1tuYW1lXTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldCh2YWw6IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfdXBkYXRlQXR0cmlidXRlc10obmFtZSwgdmFsKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogcHVibGljIHByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29udGVudCBJRC5cbiAgICAgKiBAamEg44Kz44Oz44OG44Oz44OEIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBpZEF0dHIgPSBpZEF0dHJpYnV0ZSh0aGlzLCAnaWQnKTtcbiAgICAgICAgY29uc3QgeyBjaWQsIGF0dHJzIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIChpZEF0dHIgaW4gYXR0cnMpID8gYXR0cnNbaWRBdHRyXSBhcyBzdHJpbmcgfHwgY2lkIDogY2lkO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBwcm90ZWN0ZWQgcHJvcGVydGllc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfYXR0cnMoKTogQWNjZXNzaWJsZTxPYnNlcnZhYmxlT2JqZWN0PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5hdHRycztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVmYXVsdCBhdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOaXouWumuWApOWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2Jhc2VBdHRycygpOiBUIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmJhc2VBdHRycztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUHJldmlvdXMgYXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDlpInmm7TliY3jga7lsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9wcmV2QXR0cnMoKTogQWNjZXNzaWJsZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5wcmV2QXR0cnMgYXMgQWNjZXNzaWJsZTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hhbmdlZCBhdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWkieabtOOBruOBguOBo+OBn+WxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2NoYW5nZWRBdHRycygpOiBQYXJ0aWFsPFQ+IHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpc1tfcHJvcGVydGllc10uY2hhbmdlZEF0dHJzKSB7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnMgPSBkaWZmKHRoaXMuX2Jhc2VBdHRycywgdGhpcy5fYXR0cnMgYXMgdW5rbm93biBhcyBQYXJ0aWFsPFQ+KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY2hhbmdlZEF0dHJzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgaW50ZXJuYWwgY29udGVudCBJRC5cbiAgICAgKiBAamEg5YaF6YOo44Gu44Kz44Oz44OG44Oz44OEIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2NpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY2lkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3JlYXRpbmcgb3B0aW9ucy5cbiAgICAgKiBAamEg5qeL56+J5pmC44Gu44Kq44OX44K344On44Oz44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfb3B0aW9ucygpOiBNb2RlbFNldE9wdGlvbnMge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ub3B0aW9ucztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBldmVudHNcblxuICAgIC8qKlxuICAgICAqIEBlbiBFdmVudFNvdXJjZSB0eXBlIHJlc29sdmVyLlxuICAgICAqIEBqYSBFdmVudFNvdXJjZSDlnovop6PmsbrnlKjjg5jjg6vjg5Hjg7zjgqLjgq/jgrvjg4PjgrVcbiAgICAgKi9cbiAgICBnZXQgJCgpOiBFdmVudFNvdXJjZTxURXZlbnQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBicm9rZXIgYWNjZXNzICovXG4gICAgcHJpdmF0ZSBnZXQgW19icm9rZXJdKCk6IEV2ZW50QnJva2VyPGFueT4ge1xuICAgICAgICByZXR1cm4gKHRoaXMuX2F0dHJzIGFzIElPYnNlcnZhYmxlIGFzIElPYnNlcnZhYmxlRXZlbnRCcm9rZXJBY2Nlc3MpLmdldEJyb2tlcigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIHRoaXMgb2JqZWN0IGhhcyBjbGllbnRzLlxuICAgICAqIEBqYSDjgq/jg6njgqTjgqLjg7Pjg4jjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIGhhc0xpc3RlbmVyPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBURXZlbnQ+KGNoYW5uZWw/OiBDaGFubmVsLCBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8VEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfYnJva2VyXS5oYXNMaXN0ZW5lcihjaGFubmVsLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgcmVnaXN0ZXJlZCBjaGFubmVsIGtleXMuXG4gICAgICogQGphIOeZu+mMsuOBleOCjOOBpuOBhOOCi+ODgeODo+ODjeODq+OCreODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNoYW5uZWxzKCk6IChrZXlvZiBURXZlbnQpW10ge1xuICAgICAgICByZXR1cm4gdGhpc1tfYnJva2VyXS5jaGFubmVscygpLmZpbHRlcihjID0+ICdAJyAhPT0gYykgYXMgKGtleW9mIFRFdmVudClbXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTm90aWZ5IGV2ZW50IHRvIGNsaWVudHMuXG4gICAgICogQGphIGV2ZW50IOeZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGFyZ3VtZW50cyBmb3IgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsOOBq+a4oeOBmeW8leaVsFxuICAgICAqL1xuICAgIHB1YmxpYyB0cmlnZ2VyPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBURXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwsIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPFRFdmVudFtDaGFubmVsXT4+KTogdm9pZCB7XG4gICAgICAgICh0aGlzW19icm9rZXJdIGFzIGFueSkudHJpZ2dlcihjaGFubmVsLCAuLi5hcmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm6Kej6ZmkXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBURXZlbnQ+KGNoYW5uZWw/OiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8VEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IHZvaWQge1xuICAgICAgICB0aGlzLl9hdHRycy5vZmYoY2hhbm5lbCBhcyBhbnksIGxpc3RlbmVyIGFzIGFueSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIG9uPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBURXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPFRFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICB0aGlzLl9hdHRycy5vbignQCcsICh0aGlzIGFzIGFueSlbX2NoYW5nZUhhbmRsZXJdKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2F0dHJzLm9uKGNoYW5uZWwgYXMgYW55LCBsaXN0ZW5lciBhcyBhbnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykgYnV0IGl0IGNhdXNlcyB0aGUgYm91bmQgY2FsbGJhY2sgdG8gb25seSBmaXJlIG9uY2UgYmVmb3JlIGJlaW5nIHJlbW92ZWQuXG4gICAgICogQGphIOS4gOW6puOBoOOBkeODj+ODs+ODieODquODs+OCsOWPr+iDveOBquOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBvbmNlPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBURXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPFRFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5vbihjaGFubmVsLCBsaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IG1hbmFnZWQgPSB0aGlzLm9uKGNoYW5uZWwsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnRleHQudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIG1hbmFnZWQudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjb250ZXh0O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IHZhbGlkYXRpb25cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB2YWxpZCBvciBub3QuXG4gICAgICogQGphIOaknOiovOOBruaIkOWQpuOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpc1ZhbGlkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gU1VDQ0VFREVEKHRoaXMudmFsaWRhdGUoeyBzaWxlbnQ6IHRydWUgfSkuY29kZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFZhbGlkYXRlIHJlc3VsdCBhY2Nlc3Nlci5cbiAgICAgKiBAamEg5qSc6Ki857WQ5p6c44Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcHVibGljIHZhbGlkYXRlKG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFJlc3VsdCB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgdmFsaWRhdGU6IHRydWUsIG5vVGhyb3c6IHRydWUsIGV4dGVuZDogZmFsc2UgfSwgb3B0aW9ucyk7XG4gICAgICAgIHJldHVybiB0aGlzW192YWxpZGF0ZV0oe30sIG9wdHMpO1xuICAgIH1cblxuICAgIC8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyAqL1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZhbGlkYXRlIGRhdGEgbWV0aG9kLlxuICAgICAqIEBqYSDjg4fjg7zjgr/mpJzoqLxcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIHZhbGlkYXRlZSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGphYCDooqvmpJzoqLzlsZ7mgKdcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgdmFsaWRhdGUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5qSc6Ki844Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHZhbGlkYXRlQXR0cmlidXRlczxBIGV4dGVuZHMgVD4oYXR0cmlidXRlczogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPiwgb3B0aW9ucz86IE1vZGVsVmFsaWRhdGVBdHRyaWJ1dGVPcHRpb25zKTogUmVzdWx0IHtcbiAgICAgICAgcmV0dXJuIFJFU1VMVF9WQUxJRF9BVFRSUztcbiAgICB9XG5cbiAgICAvKiBlc2xpbnQtZW5hYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyAqL1xuXG4gICAgLyoqIEBpbnRlcm5hbCB2YWxpZGF0ZSAqL1xuICAgIHByaXZhdGUgW192YWxpZGF0ZV08QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4sIG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiBSZXN1bHQgfCBuZXZlciB7XG4gICAgICAgIGNvbnN0IHsgdmFsaWRhdGUsIHNpbGVudCwgbm9UaHJvdyB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgaWYgKHZhbGlkYXRlKSB7XG4gICAgICAgICAgICBjb25zdCBhdHRycyA9IHsgLi4udGhpcy5fYXR0cnMsIC4uLmF0dHJpYnV0ZXMgfTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMudmFsaWRhdGVBdHRyaWJ1dGVzKGF0dHJzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChGQUlMRUQocmVzdWx0LmNvZGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BpbnZhbGlkJywgdGhpcyBhcyBNb2RlbCwgYXR0cnMsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghbm9UaHJvdykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBSRVNVTFRfVkFMSURfQVRUUlM7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBhdHRyaWJ1dGVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIHtAbGluayBNb2RlbH0gaGFzIHZhbGlkIHByb3BlcnR5LiAobm90IGBudWxsYCBvciBgdW5kZWZpbmVkYClcbiAgICAgKiBAamEge0BsaW5rIE1vZGVsfSDjgYzmnInlirnjgarjg5fjg63jg5Hjg4bjgqPjgpLmjIHjgaPjgabjgYTjgovjgYvnorroqo0gKGBudWxsYCDjgb7jgZ/jga8gYHVuZGVmaW5lZGAg44Gn44Gq44GEKVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXMoYXR0cmlidXRlOiBrZXlvZiBUKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9ICh0aGlzLl9hdHRycyBhcyB1bmtub3duIGFzIFQpW2F0dHJpYnV0ZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgSFRNTC1lc2NhcGVkIHZhbHVlIG9mIGFuIGF0dHJpYnV0ZS5cbiAgICAgKiBAamEgSFRNTCDjgafkvb/nlKjjgZnjgovmloflrZfjgpLliLblvqHmloflrZfjgavnva7mj5vjgZfjgZ/lsZ7mgKflgKTjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZXNjYXBlKGF0dHJpYnV0ZToga2V5b2YgVCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBlc2NhcGVIVE1MKHRoaXMuX2F0dHJzW2F0dHJpYnV0ZV0gYXMgUHJpbWl0aXZlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGF0dHJpYnV0ZXMgZm9yIGJhdGNoIGlucHV0IHdpdGggb3B0aW9ucy5cbiAgICAgKiBAamEg5bGe5oCn44Gu5LiA5ous6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgdXBkYXRlIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgamFgIOabtOaWsOWxnuaAp1xuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzZXQgYXR0cmlidXRlcyBvcHRpb25zXG4gICAgICogIC0gYGphYCDlsZ7mgKfmm7TmlrDnlKjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0QXR0cmlidXRlczxBIGV4dGVuZHMgVD4oYXR0cmlidXRlczogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPiwgb3B0aW9ucz86IE1vZGVsU2V0T3B0aW9ucyk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHNpbGVudCwgZXh0ZW5kIH0gPSBvcHRpb25zID8/IHt9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYXR0cnMuc3VzcGVuZCh0cnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpc1tfdmFsaWRhdGVdKGF0dHJpYnV0ZXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKEZBSUxFRChyZXN1bHQuY29kZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIE9iamVjdC5rZXlzKGF0dHJpYnV0ZXMpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGF0dHIgaW4gdGhpcy5fYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfdXBkYXRlQXR0cmlidXRlc10oYXR0ciwgYXR0cmlidXRlc1thdHRyXSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChleHRlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfZGVmaW5lQXR0cmlidXRlc10odGhpcywgYXR0cik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3VwZGF0ZUF0dHJpYnV0ZXNdKGF0dHIsIGF0dHJpYnV0ZXNbYXR0cl0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGlmIChzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hdHRycy5yZXN1bWUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBhbGwgYXR0cmlidXRlcyBvbiB0aGUge0BsaW5rIE1vZGVsfS4gKHNldCBgdW5kZWZpbmVkYClcbiAgICAgKiBAamEge0BsaW5rIE1vZGVsfSDjgYvjgonjgZnjgbnjgabjga7lsZ7mgKfjgpLliYrpmaQgKGB1bmRlZmluZWRgIOOCkuioreWumilcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xlYXIob3B0aW9ucz86IE1vZGVsU2V0T3B0aW9ucyk6IHRoaXMge1xuICAgICAgICBjb25zdCBjbGVhckF0dHJzID0ge30gYXMgQWNjZXNzaWJsZTxvYmplY3Q+O1xuICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgT2JqZWN0LmtleXModGhpcy5fYmFzZUF0dHJzKSkge1xuICAgICAgICAgICAgY2xlYXJBdHRyc1thdHRyXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5zZXRBdHRyaWJ1dGVzKGNsZWFyQXR0cnMsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBtb2RlbCdzIGBhdHRyaWJ1dGVzYCBvYmplY3QuXG4gICAgICogQGphIE1vZGVsIOWxnuaAp+WApOOBruOCs+ODlOODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyB0b0pTT04oKTogVCB7XG4gICAgICAgIHJldHVybiBkZWVwQ29weSh7IC4uLnRoaXMuX2F0dHJzIH0gYXMgVCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVzIENsb25lIHRoaXMgaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOBruikh+ijveOCkui/lOWNtFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgcHVibGljIGNsb25lKCk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IGNvbnN0cnVjdG9yLCBfYXR0cnMsIF9vcHRpb25zIH0gPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IChjb25zdHJ1Y3RvciBhcyBDb25zdHJ1Y3Rvcjx0aGlzPikoX2F0dHJzLCBfb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGNoYW5nZWQgYXR0cmlidXRlcy5cbiAgICAgKiBAamEg5aSJ5pu044GV44KM44Gf5bGe5oCn5YCk44KS5oyB44Gk44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlXG4gICAgICogIC0gYGVuYCBjaGVja2VkIGF0dHJpYnV0ZVxuICAgICAqICAtIGBqYWAg5qSc6Ki844GZ44KL5bGe5oCnXG4gICAgICovXG4gICAgcHVibGljIGhhc0NoYW5nZWQoYXR0cmlidXRlPzoga2V5b2YgVCk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAobnVsbCA9PSBhdHRyaWJ1dGUpIHtcbiAgICAgICAgICAgIHJldHVybiAhaXNFbXB0eU9iamVjdCh0aGlzLl9jaGFuZ2VkQXR0cnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGF0dHJpYnV0ZSBpbiB0aGlzLl9jaGFuZ2VkQXR0cnM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGFuIG9iamVjdCBjb250YWluaW5nIGFsbCB0aGUgYXR0cmlidXRlcyB0aGF0IGhhdmUgY2hhbmdlZCwgb3IgYHVuZGVmaW5lZGAgaWYgdGhlcmUgYXJlIG5vIGNoYW5nZWQgYXR0cmlidXRlcy5cbiAgICAgKiBAamEg5YWl5Yqb44GX44GfIGF0dHJpYnV0ZXMg5YCk44Gu5beu5YiG44Gr5a++44GX44Gm5aSJ5pu044GM44GC44KL5bGe5oCn5YCk44KS6L+U5Y20LiDlt67liIbjgYzjgarjgYTloLTlkIjjga8gYHVuZGVmaWVuZGAg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgY2hlY2tlZCBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGphYCDmpJzoqLzjgZnjgovlsZ7mgKdcbiAgICAgKi9cbiAgICBwdWJsaWMgY2hhbmdlZChhdHRyaWJ1dGVzPzogUGFydGlhbDxUPik6IFBhcnRpYWw8VD4gfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAoIWF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhhc0NoYW5nZWQoKSA/IHsgLi4udGhpcy5fY2hhbmdlZEF0dHJzIH0gOiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBjaGFuZ2VkID0gZGlmZih0aGlzLl9hdHRycywgYXR0cmlidXRlcyk7XG4gICAgICAgICAgICByZXR1cm4gIWlzRW1wdHlPYmplY3QoY2hhbmdlZCkgPyBjaGFuZ2VkIDogdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgcHJldmlvdXMgdmFsdWUgb2YgYW4gYXR0cmlidXRlLCByZWNvcmRlZCBhdCB0aGUgdGltZSB0aGUgbGFzdCBgQGNoYW5nZWAgZXZlbnQgd2FzIGZpcmVkLlxuICAgICAqIEBqYSBgQGNoYW5nZWAg44GM55m654Gr44GV44KM44Gf5YmN44Gu5bGe5oCn5YCk44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHByZXZpb3VzPEsgZXh0ZW5kcyBrZXlvZiBUPihhdHRyaWJ1dGU6IEspOiBUW0tdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ByZXZBdHRyc1thdHRyaWJ1dGVdO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IHN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBhIHtAbGluayBNb2RlbH0gaXMgbmV3IGlmIGl0IGhhcyBuZXZlciBiZWVuIHNhdmVkIHRvIHRoZSBzZXJ2ZXIsIGFuZCBsYWNrcyBhbiBpZC5cbiAgICAgKiBAamEge0BsaW5rIE1vZGVsfSDjgYzjgb7jgaDjgrXjg7zjg5Djg7zjgavlrZjlnKjjgZfjgarjgYTjgYvjg4Hjgqfjg4Pjgq8uIOaXouWumuOBp+OBryBgaWRBdHRyaWJ1dGVgIOOBruacieeEoeOBp+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBpc05ldygpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgaWRBdHRyID0gaWRBdHRyaWJ1dGUodGhpcywgJ2lkJyk7XG4gICAgICAgIHJldHVybiAhdGhpcy5oYXMoaWRBdHRyIGFzIGtleW9mIFQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDb252ZXJ0cyBhIHJlc3BvbnNlIGludG8gdGhlIGhhc2ggb2YgYXR0cmlidXRlcyB0byBiZSBgc2V0YCBvbiB0aGUgbW9kZWwuIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIGlzIGp1c3QgdG8gcGFzcyB0aGUgcmVzcG9uc2UgYWxvbmcuXG4gICAgICogQGphIOODrOOCueODneODs+OCueOBruWkieaPm+ODoeOCveODg+ODiS4g5pei5a6a44Gn44Gv5L2V44KC44GX44Gq44GEXG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgcGFyc2UocmVzcG9uc2U6IE1vZGVsU2VlZCB8IHZvaWQsIG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiBUIHwgdm9pZCB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHJldHVybiByZXNwb25zZSBhcyBUO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBQcm94eSB7QGxpbmsgSURhdGFTeW5jLnN5bmMgfCBJRGF0YVN5bmMuc3luY30oKSBieSBkZWZhdWx0IC0tIGJ1dCBvdmVycmlkZSB0aGlzIGlmIHlvdSBuZWVkIGN1c3RvbSBzeW5jaW5nIHNlbWFudGljcyBmb3IgKnRoaXMqIHBhcnRpY3VsYXIgbW9kZWwuXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacny4g5b+F6KaB44Gr5b+c44GY44Gm44Kq44O844OQ44O844Op44Kk44OJ5Y+v6IO9LlxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gc3RyaW5nXG4gICAgICogIC0gYGphYCDjgqrjg5rjg6zjg7zjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgc3luY2hyb25pemVkIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYCDlkIzmnJ/jgZnjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHN5bmM8SyBleHRlbmRzIE1vZGVsU3luY01ldGhvZHM+KG1ldGhvZDogSywgY29udGV4dDogTW9kZWw8VD4sIG9wdGlvbnM/OiBNb2RlbERhdGFTeW5jT3B0aW9ucyk6IFByb21pc2U8TW9kZWxTeW5jUmVzdWx0PEssIFQ+PiB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0U3luYygpLnN5bmMobWV0aG9kLCBjb250ZXh0IGFzIFN5bmNDb250ZXh0PFQ+LCBvcHRpb25zKSBhcyB1bmtub3duIGFzIFByb21pc2U8TW9kZWxTeW5jUmVzdWx0PEssIFQ+PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRmV0Y2ggdGhlIHtAbGluayBNb2RlbH0gZnJvbSB0aGUgc2VydmVyLCBtZXJnaW5nIHRoZSByZXNwb25zZSB3aXRoIHRoZSBtb2RlbCdzIGxvY2FsIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIHtAbGluayBNb2RlbH0g5bGe5oCn44Gu44K144O844OQ44O85ZCM5pyfLiDjg6zjgrnjg53jg7Pjgrnjga7jg57jg7zjgrjjgpLlrp/ooYxcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgZmV0Y2gob3B0aW9ucz86IE1vZGVsRmV0Y2hPcHRpb25zKTogUHJvbWlzZTxUPiB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgcGFyc2U6IHRydWUgfSwgb3B0aW9ucywgeyBzeW5jTWV0aG9kOiAncmVhZCcgfSk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCB0aGlzLnN5bmMoJ3JlYWQnLCB0aGlzIGFzIE1vZGVsPFQ+LCBvcHRzKTtcbiAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlcyhvcHRzLnBhcnNlID8gdGhpcy5wYXJzZShyZXNwIGFzIE1vZGVsU2VlZCwgb3B0cykgYXMgVCA6IHJlc3AsIG9wdHMpO1xuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BzeW5jJywgdGhpcyBhcyBNb2RlbCwgcmVzcCBhcyBNb2RlbFNlZWQsIG9wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAZXJyb3InLCB0aGlzIGFzIE1vZGVsLCBlLCBvcHRzKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IGEgaGFzaCBvZiB7QGxpbmsgTW9kZWx9IGF0dHJpYnV0ZXMsIGFuZCBzeW5jIHRoZSBtb2RlbCB0byB0aGUgc2VydmVyLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBzZXJ2ZXIgcmV0dXJucyBhbiBhdHRyaWJ1dGVzIGhhc2ggdGhhdCBkaWZmZXJzLCB0aGUgbW9kZWwncyBzdGF0ZSB3aWxsIGJlIGBzZXRgIGFnYWluLlxuICAgICAqIEBqYSB7QGxpbmsgTW9kZWx9IOWxnuaAp+OCkuOCteODvOODkOODvOOBq+S/neWtmC4gPGJyPlxuICAgICAqICAgICDnlbDjgarjgovlsZ7mgKfjgYzov5TljbTjgZXjgozjgovloLTlkIjjga/lho3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHVwZGF0ZSBhdHRyaWJ1dGUga2V5XG4gICAgICogIC0gYGphYCDmm7TmlrDlsZ7mgKfjgq3jg7xcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHVwZGF0ZSBhdHRyaWJ1dGUgdmFsdWVcbiAgICAgKiAgLSBgamFgIOabtOaWsOWxnuaAp+WApFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzYXZlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOS/neWtmOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBzYXZlPEsgZXh0ZW5kcyBrZXlvZiBUPihrZXk/OiBrZXlvZiBULCB2YWx1ZT86IFRbS10sIG9wdGlvbnM/OiBNb2RlbFNhdmVPcHRpb25zKTogUHJvbWlzZTxUIHwgdm9pZD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IGEgaGFzaCBvZiB7QGxpbmsgTW9kZWx9IGF0dHJpYnV0ZXMsIGFuZCBzeW5jIHRoZSBtb2RlbCB0byB0aGUgc2VydmVyLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBzZXJ2ZXIgcmV0dXJucyBhbiBhdHRyaWJ1dGVzIGhhc2ggdGhhdCBkaWZmZXJzLCB0aGUgbW9kZWwncyBzdGF0ZSB3aWxsIGJlIGBzZXRgIGFnYWluLlxuICAgICAqIEBqYSB7QGxpbmsgTW9kZWx9IOWxnuaAp+OCkuOCteODvOODkOODvOOBq+S/neWtmC4gPGJyPlxuICAgICAqICAgICDnlbDjgarjgovlsZ7mgKfjgYzov5TljbTjgZXjgozjgovloLTlkIjjga/lho3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCB1cGRhdGUgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg5pu05paw5bGe5oCnXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNhdmUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5L+d5a2Y44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIHNhdmU8QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4gfCBOdWxsaXNoLCBvcHRpb25zPzogTW9kZWxTYXZlT3B0aW9ucyk6IFByb21pc2U8VCB8IHZvaWQ+O1xuXG4gICAgcHVibGljIGFzeW5jIHNhdmUoLi4uYXJnczogdW5rbm93bltdKTogUHJvbWlzZTxUIHwgdm9pZD4ge1xuICAgICAgICBjb25zdCB7IGF0dHJzLCBvcHRpb25zIH0gPSBwYXJzZVNhdmVBcmdzKC4uLmFyZ3MpO1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHZhbGlkYXRlOiB0cnVlLCBwYXJzZTogdHJ1ZSwgd2FpdDogdHJ1ZSwgZXh0ZW5kOiB0cnVlIH0sIG9wdGlvbnMpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IHdhaXQgfSA9IG9wdHM7XG5cbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZCA9IG9wdHMuc3luY01ldGhvZCA9IHRoaXMuaXNOZXcoKSA/ICdjcmVhdGUnIDogb3B0cy5wYXRjaCA/ICdwYXRjaCcgOiAndXBkYXRlJztcblxuICAgICAgICAgICAgaWYgKGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF3YWl0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlcyhhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmJhc2VBdHRycyA9IHsgLi4udGhpcy5fYXR0cnMgfSBhcyBUO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3ZhbGlkYXRlXShhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICgncGF0Y2gnID09PSBtZXRob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0cy5kYXRhID0gYXR0cnM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0cy5kYXRhID0gT2JqZWN0LmFzc2lnbih0aGlzLnRvSlNPTigpLCBhdHRycyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXNwID0gYXdhaXQgdGhpcy5zeW5jKG1ldGhvZCwgdGhpcyBhcyBNb2RlbDxUPiwgb3B0cyk7XG5cbiAgICAgICAgICAgIGxldCBzZXJ2ZXJBdHRycyA9IG9wdHMucGFyc2UgPyB0aGlzLnBhcnNlKHJlc3AsIG9wdHMpIDogcmVzcDtcbiAgICAgICAgICAgIGlmIChhdHRycyAmJiB3YWl0KSB7XG4gICAgICAgICAgICAgICAgc2VydmVyQXR0cnMgPSBPYmplY3QuYXNzaWduKHt9LCBhdHRycywgc2VydmVyQXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlzT2JqZWN0KHNlcnZlckF0dHJzKSAmJiAhaXNFbXB0eU9iamVjdChzZXJ2ZXJBdHRycykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEF0dHJpYnV0ZXMoc2VydmVyQXR0cnMgYXMgVCwgb3B0cyk7XG4gICAgICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uYmFzZUF0dHJzID0geyAuLi50aGlzLl9hdHRycyB9IGFzIFQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAc3luYycsIHRoaXMgYXMgTW9kZWwsIHJlc3AgYXMgTW9kZWxTZWVkLCBvcHRzKTtcbiAgICAgICAgICAgIHJldHVybiByZXNwIGFzIFQ7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAZXJyb3InLCB0aGlzIGFzIE1vZGVsLCBlLCBvcHRzKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVzdHJveSB0aGlzIHtAbGluayBNb2RlbH0gb24gdGhlIHNlcnZlciBpZiBpdCB3YXMgYWxyZWFkeSBwZXJzaXN0ZWQuXG4gICAgICogQGphIHtAbGluayBNb2RlbH0g44KS44K144O844OQ44O844GL44KJ5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgZGVzdHJveSBvcHRpb25zXG4gICAgICogIC0gYGphYCDnoLTmo4Tjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgZGVzdHJveShvcHRpb25zPzogTW9kZWxEZXN0cm95T3B0aW9ucyk6IFByb21pc2U8VCB8IHZvaWQ+IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyB3YWl0OiB0cnVlIH0sIG9wdGlvbnMsIHsgc3luY01ldGhvZDogJ2RlbGV0ZScgfSk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgd2FpdCwgY2FuY2VsIH0gPSBvcHRzO1xuICAgICAgICAgICAgY29uc3QgZXhpc3RzID0gIXRoaXMuaXNOZXcoKTtcbiAgICAgICAgICAgIGNvbnN0IGRlc3RydWN0ID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgICAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAZGVzdHJveScsIHRoaXMgYXMgTW9kZWwsIG9wdHMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgIXdhaXQgJiYgZGVzdHJ1Y3QoKTtcblxuICAgICAgICAgICAgbGV0IHJlc3A6IE1vZGVsU2VlZCB8IHZvaWQgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAoIWV4aXN0cykge1xuICAgICAgICAgICAgICAgIGF3YWl0IGNjKGNhbmNlbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3AgPSBhd2FpdCB0aGlzLnN5bmMoJ2RlbGV0ZScsIHRoaXMgYXMgTW9kZWw8VD4sIG9wdHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB3YWl0ICYmIGRlc3RydWN0KCk7XG4gICAgICAgICAgICBleGlzdHMgJiYgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BzeW5jJywgdGhpcyBhcyBNb2RlbCwgcmVzcCBhcyBNb2RlbFNlZWQsIG9wdHMpO1xuXG4gICAgICAgICAgICByZXR1cm4gcmVzcCBhcyBUO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGVycm9yJywgdGhpcyBhcyBNb2RlbCwgZSwgb3B0cyk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBtaXhpbiDjgavjgojjgosgYGluc3RhbmNlb2ZgIOOBr+eEoeWKueOBq+ioreWumlxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoTW9kZWwgYXMgdW5rbm93biBhcyBDbGFzcywgJ2luc3RhbmNlT2YnLCBudWxsKTtcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMge0BsaW5rIE1vZGVsfS5cbiAqIEBqYSB7QGxpbmsgTW9kZWx9IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTW9kZWwoeDogdW5rbm93bik6IHggaXMgTW9kZWwge1xuICAgIHJldHVybiB4IGluc3RhbmNlb2YgTW9kZWw7XG59XG5cbi8qKlxuICogQGVuIFF1ZXJ5IHtAbGluayBNb2RlbH0gYGlkLWF0dHJpYnV0ZWAuXG4gKiBAamEge0BsaW5rIE1vZGVsfSDjga4gYGlkLWF0dHJpYnV0ZWAg44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpZEF0dHJpYnV0ZSh4OiB1bmtub3duLCBmYWxsYmFjayA9ICcnKTogc3RyaW5nIHtcbiAgICByZXR1cm4gaXNPYmplY3QoeCkgPyAoKHguY29uc3RydWN0b3IgYXMgYW55KS5pZEF0dHJpYnV0ZSB8fCBmYWxsYmFjaykgOiBmYWxsYmFjaztcbn1cbiJdLCJuYW1lcyI6WyJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJpc09iamVjdCIsImFzc2lnblZhbHVlIiwiRXZlbnRSZWNlaXZlciIsIk9ic2VydmFibGVPYmplY3QiLCJsdWlkIiwiZGlmZiIsImRlZXBFcXVhbCIsIlNVQ0NFRURFRCIsInJlc3VsdCIsIkZBSUxFRCIsImVzY2FwZUhUTUwiLCJkZWVwQ29weSIsImlzRW1wdHlPYmplY3QiLCJkZWZhdWx0U3luYyIsImNjIiwic2V0TWl4Q2xhc3NBdHRyaWJ1dGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7OztJQUdHO0lBRUgsQ0FBQSxZQUFxQjtJQU1qQjs7O0lBR0c7SUFDSCxJQUFBLElBR0MsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7SUFIRCxJQUFBLENBQUEsWUFBdUI7SUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLG1CQUFBLENBQUEsR0FBQSxnQkFBQSxDQUFBLEdBQUEsbUJBQWlELENBQUE7WUFDakQsV0FBeUIsQ0FBQSxXQUFBLENBQUEsd0JBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLCtCQUF3QixDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUEsR0FBQSx3QkFBQSxDQUFBO0lBQ2pILEtBQUMsR0FBQSxDQUFBO0lBQ0wsQ0FBQyxHQUFBOztJQ25CRDs7SUFFRztJQXVESCxpQkFBaUIsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDNUQsaUJBQWlCLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVELGlCQUFpQixNQUFNLFNBQVMsR0FBVyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDOUQsaUJBQWlCLE1BQU0sY0FBYyxHQUFNLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM5RCxpQkFBaUIsTUFBTSxPQUFPLEdBQWEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVELGlCQUFpQixNQUFNLFdBQVcsR0FBUyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7SUFhaEU7OztJQUdHO0FBQ1UsVUFBQSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDQSxpQkFBVSxDQUFDQyxrQkFBVyxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxFQUFFO0lBRXJHO0lBQ0EsU0FBUyxhQUFhLENBQW1CLEdBQUcsSUFBVyxFQUFBO1FBQ25ELElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNqQyxJQUFBLElBQUksS0FBVSxDQUFDO1FBRWYsSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJQyxrQkFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzlCLEtBQUssR0FBRyxHQUFHLENBQUM7WUFDWixPQUFPLEdBQUcsS0FBSyxDQUFDO0lBQ25CLEtBQUE7SUFBTSxTQUFBO1lBQ0hDLHFCQUFXLENBQUMsS0FBSyxHQUFHLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdkMsS0FBQTtRQUVELElBQUksT0FBTyxFQUFFLElBQUksRUFBRTtJQUNmLFFBQUEsS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEQsS0FBQTtJQUVELElBQUEsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBRUQ7SUFFQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBaUZHO0lBQ0csTUFBZ0IsS0FBNEUsU0FBUUMsb0JBQWEsQ0FBQTtJQUNuSDs7Ozs7SUFLRztJQUNILElBQUEsT0FBTyxXQUFXLEdBQUcsSUFBSSxDQUFDO0lBRTFCOzs7OztJQUtHO1FBQ2MsQ0FBQyxXQUFXLEVBQWdCO0lBRTdDOzs7Ozs7SUFNRztRQUNILFdBQVksQ0FBQSxVQUF1QixFQUFFLE9BQWtDLEVBQUE7SUFDbkUsUUFBQSxLQUFLLEVBQUUsQ0FBQztZQUNSLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3hDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFNLEdBQUcsVUFBVSxDQUFDO0lBQzFFLFFBQUEsTUFBTSxLQUFLLEdBQWdCO0lBQ3ZCLFlBQUEsS0FBSyxFQUFFQywyQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFpQztJQUNuRSxZQUFBLFNBQVMsRUFBRSxFQUFFLEdBQUcsS0FBSyxFQUFFO0lBQ3ZCLFlBQUEsU0FBUyxFQUFFLEVBQUUsR0FBRyxLQUFLLEVBQUU7SUFDdkIsWUFBQSxHQUFHLEVBQUVDLGNBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQ3RCLFlBQUEsT0FBTyxFQUFFLElBQUk7SUFDYixZQUFBLFdBQVcsRUFBRSxLQUFLO2FBQ3JCLENBQUM7SUFDRixRQUFBLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBRTNELEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDbEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3RDLFNBQUE7SUFFQSxRQUFBLElBQVksQ0FBQyxjQUFjLENBQUMsR0FBRyxNQUFLO0lBQ2hDLFlBQUEsSUFBYyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBYSxDQUFDLENBQUM7SUFFbEQsWUFBQSxNQUFNLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQztJQUNwQyxZQUFBLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUNDLGNBQUksQ0FBQyxVQUFVLEVBQUUsTUFBK0IsQ0FBQyxDQUFDLENBQUM7SUFDbkYsWUFBQSxLQUFLLE1BQU0sR0FBRyxJQUFJLFdBQVcsRUFBRTtvQkFDMUIsSUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFBLFFBQUEsRUFBVyxHQUFHLENBQUUsQ0FBQSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3BGLGFBQUE7SUFFRCxZQUFBLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO0lBQ3pDLFNBQUMsQ0FBQztZQUVGLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDN0I7O0lBR08sSUFBQSxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBWSxFQUFFLEdBQVksRUFBQTtJQUNsRCxRQUFBLElBQUksQ0FBQ0MsbUJBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFO2dCQUNwQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNqRCxZQUFBLElBQUksV0FBVyxFQUFFO0lBQ2IsZ0JBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7b0JBQ3RDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLEdBQUcsRUFBRSxHQUFHLEtBQUssRUFBTyxDQUFDO0lBQ25ELGFBQUE7SUFDRCxZQUFBLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFlBQVksQ0FBQztJQUN0QyxZQUFBTCxxQkFBVyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2hELFlBQUFBLHFCQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqQyxTQUFBO1NBQ0o7O0lBR08sSUFBQSxDQUFDLGlCQUFpQixDQUFDLENBQUMsUUFBZ0IsRUFBRSxJQUFZLEVBQUE7SUFDdEQsUUFBQSxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQztJQUM3QyxRQUFBLElBQUksRUFBRSxJQUFJLElBQUksS0FBSyxDQUFDLEVBQUU7SUFDbEIsWUFBQSxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUU7b0JBQy9CLEdBQUcsR0FBQTtJQUNDLG9CQUFBLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDNUI7SUFDRCxnQkFBQSxHQUFHLENBQUMsR0FBWSxFQUFBO3dCQUNaLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztxQkFDdEM7SUFDRCxnQkFBQSxVQUFVLEVBQUUsSUFBSTtJQUNoQixnQkFBQSxZQUFZLEVBQUUsSUFBSTtJQUNyQixhQUFBLENBQUMsQ0FBQztJQUNOLFNBQUE7U0FDSjs7O0lBS0Q7OztJQUdHO0lBQ0gsSUFBQSxJQUFJLEVBQUUsR0FBQTtZQUNGLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdkMsTUFBTSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDekMsUUFBQSxPQUFPLENBQUMsTUFBTSxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFXLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQztTQUNuRTs7O0lBS0Q7OztJQUdHO0lBQ0gsSUFBQSxJQUFjLE1BQU0sR0FBQTtJQUNoQixRQUFBLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQztTQUNsQztJQUVEOzs7SUFHRztJQUNILElBQUEsSUFBYyxVQUFVLEdBQUE7SUFDcEIsUUFBQSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLENBQUM7U0FDdEM7SUFFRDs7O0lBR0c7SUFDSCxJQUFBLElBQWMsVUFBVSxHQUFBO0lBQ3BCLFFBQUEsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsU0FBMEIsQ0FBQztTQUN2RDtJQUVEOzs7SUFHRztJQUNILElBQUEsSUFBYyxhQUFhLEdBQUE7WUFDdkIsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFlBQVksRUFBRTtJQUN4QyxZQUFBLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxZQUFZLEdBQUdJLGNBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUErQixDQUFDLENBQUM7SUFDaEcsU0FBQTtJQUNELFFBQUEsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsWUFBWSxDQUFDO1NBQ3pDO0lBRUQ7OztJQUdHO0lBQ0gsSUFBQSxJQUFjLElBQUksR0FBQTtJQUNkLFFBQUEsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDO1NBQ2hDO0lBRUQ7OztJQUdHO0lBQ0gsSUFBQSxJQUFjLFFBQVEsR0FBQTtJQUNsQixRQUFBLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQztTQUNwQzs7O0lBS0Q7OztJQUdHO0lBQ0gsSUFBQSxJQUFJLENBQUMsR0FBQTtJQUNELFFBQUEsT0FBTyxJQUFJLENBQUM7U0FDZjs7UUFHRCxLQUFhLE9BQU8sQ0FBQyxHQUFBO0lBQ2pCLFFBQUEsT0FBUSxJQUFJLENBQUMsTUFBc0QsQ0FBQyxTQUFTLEVBQUUsQ0FBQztTQUNuRjtJQUVEOzs7Ozs7Ozs7O0lBVUc7UUFDSCxXQUFXLENBQStCLE9BQWlCLEVBQUUsUUFBMkQsRUFBQTtZQUNwSCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ3ZEO0lBRUQ7OztJQUdHO1FBQ0gsUUFBUSxHQUFBO0lBQ0osUUFBQSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQXFCLENBQUM7U0FDOUU7SUFFRDs7Ozs7Ozs7OztJQVVHO0lBQ0ksSUFBQSxPQUFPLENBQStCLE9BQWdCLEVBQUUsR0FBRyxJQUF5QyxFQUFBO1lBQ3RHLElBQUksQ0FBQyxPQUFPLENBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7U0FDcEQ7SUFFRDs7Ozs7Ozs7Ozs7Ozs7SUFjRztRQUNJLEdBQUcsQ0FBK0IsT0FBNkIsRUFBRSxRQUEyRCxFQUFBO1lBQy9ILElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQWMsRUFBRSxRQUFlLENBQUMsQ0FBQztTQUNwRDtJQUVEOzs7Ozs7Ozs7O0lBVUc7UUFDSSxFQUFFLENBQStCLE9BQTRCLEVBQUUsUUFBMEQsRUFBQTtJQUM1SCxRQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRyxJQUFZLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUNuRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQWMsRUFBRSxRQUFlLENBQUMsQ0FBQztTQUMxRDtJQUVEOzs7Ozs7Ozs7O0lBVUc7UUFDSSxJQUFJLENBQStCLE9BQTRCLEVBQUUsUUFBMEQsRUFBQTtZQUM5SCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztZQUMzQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFLO2dCQUNsQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3RCLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUMxQixTQUFDLENBQUMsQ0FBQztJQUNILFFBQUEsT0FBTyxPQUFPLENBQUM7U0FDbEI7OztJQUtEOzs7SUFHRztJQUNILElBQUEsSUFBSSxPQUFPLEdBQUE7SUFDUCxRQUFBLE9BQU9FLGdCQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzFEO0lBRUQ7OztJQUdHO0lBQ0ksSUFBQSxRQUFRLENBQUMsT0FBcUIsRUFBQTtZQUNqQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN0RixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDcEM7O0lBSUQ7Ozs7Ozs7Ozs7OztJQVlHO1FBQ08sa0JBQWtCLENBQWMsVUFBa0MsRUFBRSxPQUF1QyxFQUFBO0lBQ2pILFFBQUEsT0FBTyxrQkFBa0IsQ0FBQztTQUM3Qjs7O0lBS08sSUFBQSxDQUFDLFNBQVMsQ0FBQyxDQUFjLFVBQWtDLEVBQUUsT0FBeUIsRUFBQTtZQUMxRixNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO0lBQ3BELFFBQUEsSUFBSSxRQUFRLEVBQUU7Z0JBQ1YsTUFBTSxLQUFLLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxVQUFVLEVBQUUsQ0FBQztnQkFDaEQsTUFBTUMsUUFBTSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDdkQsWUFBQSxJQUFJQyxhQUFNLENBQUNELFFBQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDckIsSUFBSSxDQUFDLE1BQU0sRUFBRTt3QkFDUixJQUFjLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxJQUFhLEVBQUUsS0FBSyxFQUFFQSxRQUFNLENBQUMsQ0FBQztJQUNyRSxpQkFBQTtvQkFDRCxJQUFJLENBQUMsT0FBTyxFQUFFO0lBQ1Ysb0JBQUEsTUFBTUEsUUFBTSxDQUFDO0lBQ2hCLGlCQUFBO0lBQ0osYUFBQTtJQUNELFlBQUEsT0FBT0EsUUFBTSxDQUFDO0lBQ2pCLFNBQUE7SUFBTSxhQUFBO0lBQ0gsWUFBQSxPQUFPLGtCQUFrQixDQUFDO0lBQzdCLFNBQUE7U0FDSjs7O0lBS0Q7OztJQUdHO0lBQ0ksSUFBQSxHQUFHLENBQUMsU0FBa0IsRUFBQTtZQUN6QixPQUFPLElBQUksSUFBSyxJQUFJLENBQUMsTUFBdUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUMzRDtJQUVEOzs7SUFHRztJQUNJLElBQUEsTUFBTSxDQUFDLFNBQWtCLEVBQUE7WUFDNUIsT0FBT0Usb0JBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBYyxDQUFDLENBQUM7U0FDMUQ7SUFFRDs7Ozs7Ozs7OztJQVVHO1FBQ0ksYUFBYSxDQUFjLFVBQWtDLEVBQUUsT0FBeUIsRUFBQTtZQUMzRixNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7WUFFekMsSUFBSTtJQUNBLFlBQUEsSUFBSSxNQUFNLEVBQUU7SUFDUixnQkFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM3QixhQUFBO2dCQUVELE1BQU1GLFFBQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3BELFlBQUEsSUFBSUMsYUFBTSxDQUFDRCxRQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7SUFDckIsZ0JBQUEsT0FBTyxJQUFJLENBQUM7SUFDZixhQUFBO2dCQUVELEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRTtJQUN4QyxnQkFBQSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO3dCQUNyQixJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbkQsaUJBQUE7SUFBTSxxQkFBQSxJQUFJLE1BQU0sRUFBRTt3QkFDZixJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ3BDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNuRCxpQkFBQTtJQUNKLGFBQUE7SUFDSixTQUFBO0lBQVMsZ0JBQUE7SUFDTixZQUFBLElBQUksTUFBTSxFQUFFO0lBQ1IsZ0JBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUN4QixhQUFBO0lBQ0osU0FBQTtJQUVELFFBQUEsT0FBTyxJQUFJLENBQUM7U0FDZjtJQUVEOzs7SUFHRztJQUNJLElBQUEsS0FBSyxDQUFDLE9BQXlCLEVBQUE7WUFDbEMsTUFBTSxVQUFVLEdBQUcsRUFBd0IsQ0FBQztZQUM1QyxLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFO0lBQzdDLFlBQUEsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQztJQUNoQyxTQUFBO1lBQ0QsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztTQUNsRDtJQUVEOzs7SUFHRztRQUNJLE1BQU0sR0FBQTtZQUNULE9BQU9HLGtCQUFRLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQU8sQ0FBQyxDQUFDO1NBQzVDO0lBRUQ7Ozs7O0lBS0c7UUFDSSxLQUFLLEdBQUE7WUFDUixNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDL0MsUUFBQSxPQUFPLElBQUssV0FBaUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDbkU7SUFFRDs7Ozs7OztJQU9HO0lBQ0ksSUFBQSxVQUFVLENBQUMsU0FBbUIsRUFBQTtZQUNqQyxJQUFJLElBQUksSUFBSSxTQUFTLEVBQUU7SUFDbkIsWUFBQSxPQUFPLENBQUNDLHVCQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzdDLFNBQUE7SUFBTSxhQUFBO0lBQ0gsWUFBQSxPQUFPLFNBQVMsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzFDLFNBQUE7U0FDSjtJQUVEOzs7Ozs7O0lBT0c7SUFDSSxJQUFBLE9BQU8sQ0FBQyxVQUF1QixFQUFBO1lBQ2xDLElBQUksQ0FBQyxVQUFVLEVBQUU7SUFDYixZQUFBLE9BQU8sSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsU0FBUyxDQUFDO0lBQ3BFLFNBQUE7SUFBTSxhQUFBO2dCQUNILE1BQU0sT0FBTyxHQUFHUCxjQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztJQUM5QyxZQUFBLE9BQU8sQ0FBQ08sdUJBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxPQUFPLEdBQUcsU0FBUyxDQUFDO0lBQ3hELFNBQUE7U0FDSjtJQUVEOzs7SUFHRztJQUNJLElBQUEsUUFBUSxDQUFvQixTQUFZLEVBQUE7SUFDM0MsUUFBQSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDckM7OztJQUtEOzs7SUFHRztRQUNPLEtBQUssR0FBQTtZQUNYLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdkMsUUFBQSxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFpQixDQUFDLENBQUM7U0FDdkM7SUFFRDs7Ozs7SUFLRztRQUNPLEtBQUssQ0FBQyxRQUEwQixFQUFFLE9BQXlCLEVBQUE7SUFDakUsUUFBQSxPQUFPLFFBQWEsQ0FBQztTQUN4QjtJQUVEOzs7Ozs7Ozs7Ozs7Ozs7SUFlRztJQUNPLElBQUEsSUFBSSxDQUE2QixNQUFTLEVBQUUsT0FBaUIsRUFBRSxPQUE4QixFQUFBO1lBQ25HLE9BQU9DLG9CQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQXlCLEVBQUUsT0FBTyxDQUE4QyxDQUFDO1NBQ3RIO0lBRUQ7OztJQUdHO1FBQ0ksTUFBTSxLQUFLLENBQUMsT0FBMkIsRUFBQTtZQUMxQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBRTdFLElBQUk7SUFDQSxZQUFBLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDN0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBaUIsRUFBRSxJQUFJLENBQU0sR0FBRyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3RGLElBQWMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQWEsRUFBRSxJQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3pFLFlBQUEsT0FBTyxJQUFJLENBQUM7SUFDZixTQUFBO0lBQUMsUUFBQSxPQUFPLENBQUMsRUFBRTtnQkFDUCxJQUFjLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFhLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFELFlBQUEsTUFBTSxDQUFDLENBQUM7SUFDWCxTQUFBO1NBQ0o7SUFtQ00sSUFBQSxNQUFNLElBQUksQ0FBQyxHQUFHLElBQWUsRUFBQTtZQUNoQyxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxHQUFHLGFBQWEsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ2xELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFFL0YsSUFBSTtJQUNBLFlBQUEsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQztJQUV0QixZQUFBLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFHLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sR0FBRyxRQUFRLENBQUM7SUFFM0YsWUFBQSxJQUFJLEtBQUssRUFBRTtvQkFDUCxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQ1Asb0JBQUEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDaEMsb0JBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBTyxDQUFDO0lBQ3pELGlCQUFBO0lBQU0scUJBQUE7d0JBQ0gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoQyxpQkFBQTtvQkFDRCxJQUFJLE9BQU8sS0FBSyxNQUFNLEVBQUU7SUFDcEIsb0JBQUEsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7SUFDckIsaUJBQUE7SUFBTSxxQkFBQTtJQUNILG9CQUFBLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDbkQsaUJBQUE7SUFDSixhQUFBO0lBRUQsWUFBQSxNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBRTdELElBQUksV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO2dCQUM3RCxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7b0JBQ2YsV0FBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQztJQUN2RCxhQUFBO2dCQUNELElBQUliLGtCQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQ1ksdUJBQWEsQ0FBQyxXQUFXLENBQUMsRUFBRTtJQUN0RCxnQkFBQSxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDM0MsZ0JBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBTyxDQUFDO0lBQ3pELGFBQUE7Z0JBRUEsSUFBYyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBYSxFQUFFLElBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDekUsWUFBQSxPQUFPLElBQVMsQ0FBQztJQUNwQixTQUFBO0lBQUMsUUFBQSxPQUFPLENBQUMsRUFBRTtnQkFDUCxJQUFjLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFhLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFELFlBQUEsTUFBTSxDQUFDLENBQUM7SUFDWCxTQUFBO1NBQ0o7SUFFRDs7Ozs7OztJQU9HO1FBQ0ksTUFBTSxPQUFPLENBQUMsT0FBNkIsRUFBQTtZQUM5QyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBRTlFLElBQUk7SUFDQSxZQUFBLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQzlCLFlBQUEsTUFBTSxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzdCLE1BQU0sUUFBUSxHQUFHLE1BQVc7b0JBQ3hCLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDcEIsSUFBYyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsSUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdELGFBQUMsQ0FBQztJQUVGLFlBQUEsQ0FBQyxJQUFJLElBQUksUUFBUSxFQUFFLENBQUM7SUFFcEIsWUFBQSxJQUFJLElBQWtDLENBQUM7Z0JBQ3ZDLElBQUksQ0FBQyxNQUFNLEVBQUU7SUFDVCxnQkFBQSxNQUFNRSxxQkFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3BCLGFBQUE7SUFBTSxpQkFBQTtJQUNILGdCQUFBLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUQsYUFBQTtnQkFFRCxJQUFJLElBQUksUUFBUSxFQUFFLENBQUM7SUFDbkIsWUFBQSxNQUFNLElBQUssSUFBYyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBYSxFQUFFLElBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFbkYsWUFBQSxPQUFPLElBQVMsQ0FBQztJQUNwQixTQUFBO0lBQUMsUUFBQSxPQUFPLENBQUMsRUFBRTtnQkFDUCxJQUFjLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFhLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFELFlBQUEsTUFBTSxDQUFDLENBQUM7SUFDWCxTQUFBO1NBQ0o7O0lBR0w7QUFDQUMsa0NBQW9CLENBQUMsS0FBeUIsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFcEU7Ozs7Ozs7SUFPRztJQUNHLFNBQVUsT0FBTyxDQUFDLENBQVUsRUFBQTtRQUM5QixPQUFPLENBQUMsWUFBWSxLQUFLLENBQUM7SUFDOUIsQ0FBQztJQUVEOzs7SUFHRzthQUNhLFdBQVcsQ0FBQyxDQUFVLEVBQUUsUUFBUSxHQUFHLEVBQUUsRUFBQTtRQUNqRCxPQUFPZixrQkFBUSxDQUFDLENBQUMsQ0FBQyxJQUFLLENBQUMsQ0FBQyxXQUFtQixDQUFDLFdBQVcsSUFBSSxRQUFRLElBQUksUUFBUSxDQUFDO0lBQ3JGOzs7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9tb2RlbC8ifQ==