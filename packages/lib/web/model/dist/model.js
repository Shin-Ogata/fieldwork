/*!
 * @cdp/model 0.9.19
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
            attrs = Object.assign(attrs ?? {}, options.data);
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
            this[_properties].changedAttrs ??= coreUtils.diff(this._baseAttrs, this._attrs);
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
        return coreUtils.isObject(x) ? (x.constructor.idAttribute ?? fallback) : fallback;
    }

    exports.Model = Model;
    exports.RESULT_VALID_ATTRS = RESULT_VALID_ATTRS;
    exports.idAttribute = idAttribute;
    exports.isModel = isModel;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwuanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJiYXNlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgTU9ERUwgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyA1LFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX01PREVMX0RFQ0xBUkUgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfREFUQSA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLk1PREVMICsgMSwgJ2ludmFsaWQgZGF0YS4nKSxcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICB0eXBlIFByaW1pdGl2ZSxcbiAgICB0eXBlIE51bGxpc2gsXG4gICAgdHlwZSBBY2Nlc3NpYmxlLFxuICAgIHR5cGUgQ29uc3RydWN0b3IsXG4gICAgdHlwZSBDbGFzcyxcbiAgICB0eXBlIEFyZ3VtZW50cyxcbiAgICBpc09iamVjdCxcbiAgICBpc0VtcHR5T2JqZWN0LFxuICAgIGx1aWQsXG4gICAgZXNjYXBlSFRNTCxcbiAgICBhc3NpZ25WYWx1ZSxcbiAgICBkZWVwQ29weSxcbiAgICBkZWVwRXF1YWwsXG4gICAgZGlmZixcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgdHlwZSBTdWJzY3JpcHRpb24sXG4gICAgdHlwZSBTaWxlbmNlYWJsZSxcbiAgICB0eXBlIEV2ZW50QnJva2VyLFxuICAgIHR5cGUgRXZlbnRTb3VyY2UsXG4gICAgRXZlbnRSZWNlaXZlcixcbn0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgY2hlY2tDYW5jZWxlZCBhcyBjYyB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQge1xuICAgIHR5cGUgSU9ic2VydmFibGUsXG4gICAgdHlwZSBJT2JzZXJ2YWJsZUV2ZW50QnJva2VyQWNjZXNzLFxuICAgIE9ic2VydmFibGVPYmplY3QsXG59IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQge1xuICAgIHR5cGUgUmVzdWx0LFxuICAgIFJFU1VMVF9DT0RFLFxuICAgIG1ha2VSZXN1bHQsXG4gICAgU1VDQ0VFREVELFxuICAgIEZBSUxFRCxcbn0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgdHlwZSBTeW5jQ29udGV4dCwgZGVmYXVsdFN5bmMgfSBmcm9tICdAY2RwL2RhdGEtc3luYyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTW9kZWxTZWVkLFxuICAgIE1vZGVsRXZlbnQsXG4gICAgTW9kZWxWYWxpZGF0ZUF0dHJpYnV0ZU9wdGlvbnMsXG4gICAgTW9kZWxBdHRyaWJ1dGVJbnB1dCxcbiAgICBNb2RlbFNldE9wdGlvbnMsXG4gICAgTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIE1vZGVsU3luY01ldGhvZHMsXG4gICAgTW9kZWxTeW5jUmVzdWx0LFxuICAgIE1vZGVsRGF0YVN5bmNPcHRpb25zLFxuICAgIE1vZGVsRmV0Y2hPcHRpb25zLFxuICAgIE1vZGVsU2F2ZU9wdGlvbnMsXG4gICAgTW9kZWxEZXN0cm95T3B0aW9ucyxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfZGVmaW5lQXR0cmlidXRlcyA9IFN5bWJvbCgnZGVmaW5lJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF91cGRhdGVBdHRyaWJ1dGVzID0gU3ltYm9sKCd1cGRhdGUnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3ZhbGlkYXRlICAgICAgICAgPSBTeW1ib2woJ3ZhbGlkYXRlJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9jaGFuZ2VIYW5kbGVyICAgID0gU3ltYm9sKCdvbmNoYW5nZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYnJva2VyICAgICAgICAgICA9IFN5bWJvbCgnYnJva2VyJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzICAgICAgID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eTxUPiB7XG4gICAgYXR0cnM6IEFjY2Vzc2libGU8T2JzZXJ2YWJsZU9iamVjdD47XG4gICAgYmFzZUF0dHJzOiBUO1xuICAgIHByZXZBdHRyczogVDtcbiAgICBjaGFuZ2VkQXR0cnM/OiBQYXJ0aWFsPFQ+O1xuICAgIHJlYWRvbmx5IGNpZDogc3RyaW5nO1xuICAgIHJlYWRvbmx5IG9wdGlvbnM6IE1vZGVsU2V0T3B0aW9ucztcbiAgICBjaGFuZ2VGaXJlZDogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZW4gVmFsaWQgYXR0cmlidXRlcyByZXN1bHQuXG4gKiBAamEg5bGe5oCn5qSc6Ki844Gu5pyJ5Yq55YCkXG4gKi9cbmV4cG9ydCBjb25zdCBSRVNVTFRfVkFMSURfQVRUUlMgPSBPYmplY3QuZnJlZXplKG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuU1VDQ0VTUywgJ3ZhbGlkIGF0dHJpYnV0ZS4nKSk7XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzYXZlKCkgKi9cbmZ1bmN0aW9uIHBhcnNlU2F2ZUFyZ3M8QSBleHRlbmRzIG9iamVjdD4oLi4uYXJnczogYW55W10pOiB7IGF0dHJzPzogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPjsgb3B0aW9ucz86IE1vZGVsU2F2ZU9wdGlvbnM7IH0ge1xuICAgIGxldCBba2V5LCB2YWx1ZSwgb3B0aW9uc10gPSBhcmdzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIHByZWZlci1jb25zdFxuICAgIGxldCBhdHRyczogYW55O1xuXG4gICAgaWYgKG51bGwgPT0ga2V5IHx8IGlzT2JqZWN0KGtleSkpIHtcbiAgICAgICAgYXR0cnMgPSBrZXk7XG4gICAgICAgIG9wdGlvbnMgPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBhc3NpZ25WYWx1ZShhdHRycyA9IHt9LCBrZXksIHZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucz8uZGF0YSkge1xuICAgICAgICBhdHRycyA9IE9iamVjdC5hc3NpZ24oYXR0cnMgPz8ge30sIG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgYXR0cnMsIG9wdGlvbnMgfTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEJhc2UgY2xhc3MgZGVmaW5pdGlvbiBmb3IgbW9kZWwgdGhhdCBwcm92aWRlcyBhIGJhc2ljIHNldCBvZiBmdW5jdGlvbmFsaXR5IGZvciBtYW5hZ2luZyBpbnRlcmFjdGlvbi5cbiAqIEBqYSDjgqTjg7Pjgr/jg6njgq/jgrfjg6fjg7Pjga7jgZ/jgoHjga7ln7rmnKzmqZ/og73jgpLmj5DkvpvjgZnjgosgTW9kZWwg44Gu5Z+65bqV44Kv44Op44K55a6a576pXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBNb2RlbCwgTW9kZWxDb25zdHJ1Y3RvciB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogaW50ZXJmYWNlIENvbnRlbnRBdHRyaWJ1dGUge1xuICogICB1cmk6IHN0cmluZztcbiAqICAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyO1xuICogICBjb29raWU/OiBzdHJpbmc7XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiAtIEJhc2ljIFVzYWdlXG4gKlxuICogYGBgdHNcbiAqIC8vIGVhcmx5IGNhc3RcbiAqIGNvbnN0IENvbnRlbnRCYXNlID0gTW9kZWwgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbDxDb250ZW50QXR0cmlidXRlPiwgQ29udGVudEF0dHJpYnV0ZT47XG4gKlxuICogY2xhc3MgQ29udGVudCBleHRlbmRzIENvbnRlbnRCYXNlIHtcbiAqICAgY29uc3RydWN0b3IoYXR0cnM6IENvbnRlbnRBdHRyaWJ1dGUpIHtcbiAqICAgICBzdXBlcihhdHRycyk7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIG9yXG4gKlxuICogYGBgdHNcbiAqIC8vIGxhdGUgY2FzdFxuICogY2xhc3MgQ29udGVudENsYXNzIGV4dGVuZHMgTW9kZWw8Q29udGVudEF0dHJpYnV0ZT4ge1xuICogICBjb25zdHJ1Y3RvcihhdHRyczogQ29udGVudEF0dHJpYnV0ZSkge1xuICogICAgIHN1cGVyKGF0dHJzKTtcbiAqICAgfVxuICogfVxuICpcbiAqIGNvbnN0IENvbnRlbnQgPSBDb250ZW50Q2xhc3MgYXMgTW9kZWxDb25zdHJ1Y3RvcjxDb250ZW50Q2xhc3MsIENvbnRlbnRBdHRyaWJ1dGU+O1xuICogYGBgXG4gKiB0aGVuXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGNvbnRlbnQgPSBuZXcgQ29udGVudCh7XG4gKiAgIHVyaTogJ2FhYS50eHQnLFxuICogICBzaXplOiAxMCxcbiAqICAgY29va2llOiB1bmRlZmluZWQsIC8vIG5lZWQgZXhwbGljaXQgYXNzaWduXG4gKiB9KTtcbiAqXG4gKiBjb25zb2xlLmxvZyhjb250ZW50LnVyaSk7ICAgIC8vICdhYWEudHh0J1xuICogY29uc29sZS5sb2coY29udGVudC5zaXplKTsgICAvLyAnMTAnXG4gKiBjb25zb2xlLmxvZyhjb250ZW50LmNvb2tpZSk7IC8vICd1bmRlZmluZWQnXG4gKiBgYGBcbiAqXG4gKiAtIFVzaW5nIEN1c3RvbSBURXZlbnRcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgTW9kZWxFdmVudCB9IGZyb20gJ0BjZHAvbW9kZWwnO1xuICpcbiAqIGludGVyZmFjZSBDdXN0b21FdmVudCBleHRlbmRzIE1vZGVsRXZlbnQ8Q29udGVudEF0dHJpYnV0ZT4ge1xuICogICBmaXJlOiBbYm9vbGVhbiwgbnVtYmVyXTtcbiAqIH1cbiAqXG4gKiA6XG4gKlxuICogLy8gZWFybHkgY2FzdFxuICogY29uc3QgQ29udGVudEJhc2UgPSBNb2RlbCBhcyBNb2RlbENvbnN0cnVjdG9yPE1vZGVsPENvbnRlbnRBdHRyaWJ1dGUsIEN1c3RvbUV2ZW50PiwgQ29udGVudEF0dHJpYnV0ZT47XG4gKiBjbGFzcyBDb250ZW50IGV4dGVuZHMgQ29udGVudEJhc2Uge1xuICogICA6XG4gKiB9XG4gKlxuICogLy8gbGF0ZSBjYXN0XG4gKiBjbGFzcyBDb250ZW50Q2xhc3MgZXh0ZW5kcyBNb2RlbDxDb250ZW50QXR0cmlidXRlLCBDdXN0b21FdmVudD4ge1xuICogICA6XG4gKiB9XG4gKiBjb25zdCBDb250ZW50ID0gQ29udGVudENsYXNzIGFzIE1vZGVsQ29uc3RydWN0b3I8Q29udGVudENsYXNzLCBDb250ZW50QXR0cmlidXRlPjtcbiAqXG4gKiBjb25zdCBjb250ZW50ID0gbmV3IENvbnRlbnQoeyAuLi4gfSk7XG4gKiBjb250ZW50LnRyaWdnZXIoJ2ZpcmUnLCB0cnVlLCAxMDApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBNb2RlbDxUIGV4dGVuZHMgb2JqZWN0ID0gYW55LCBURXZlbnQgZXh0ZW5kcyBNb2RlbEV2ZW50PFQ+ID0gTW9kZWxFdmVudDxUPj4gZXh0ZW5kcyBFdmVudFJlY2VpdmVyIGltcGxlbWVudHMgRXZlbnRTb3VyY2U8VEV2ZW50PiB7XG4gICAgLyoqXG4gICAgICogQGVuIEdldCBJRCBhdHRyaWJ1dGUgbmFtZS5cbiAgICAgKiBAamEgSUQg44Ki44OI44Oq44OT44Ol44O844OI5ZCN44Gr44Ki44Kv44K744K5XG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBzdGF0aWMgaWRBdHRyaWJ1dGUgPSAnaWQnO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEF0dHJpYnV0ZXMgcG9vbFxuICAgICAqIEBqYSDlsZ7mgKfmoLzntI3poJjln59cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXSE6IFByb3BlcnR5PFQ+O1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCBpbml0aWFsIGF0dHJpYnV0ZSB2YWx1ZXNcbiAgICAgKiAgLSBgamFgIOWxnuaAp+OBruWIneacn+WApOOCkuaMh+WumlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGF0dHJpYnV0ZXM6IFJlcXVpcmVkPFQ+LCBvcHRpb25zPzogTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zKTtcbiAgICAgICAgY29uc3QgYXR0cnMgPSBvcHRzLnBhcnNlID8gdGhpcy5wYXJzZShhdHRyaWJ1dGVzLCBvcHRzKSBhcyBUIDogYXR0cmlidXRlcztcbiAgICAgICAgY29uc3QgcHJvcHM6IFByb3BlcnR5PFQ+ID0ge1xuICAgICAgICAgICAgYXR0cnM6IE9ic2VydmFibGVPYmplY3QuZnJvbShhdHRycykgYXMgQWNjZXNzaWJsZTxPYnNlcnZhYmxlT2JqZWN0PixcbiAgICAgICAgICAgIGJhc2VBdHRyczogeyAuLi5hdHRycyB9LFxuICAgICAgICAgICAgcHJldkF0dHJzOiB7IC4uLmF0dHJzIH0sXG4gICAgICAgICAgICBjaWQ6IGx1aWQoJ21vZGVsOicsIDgpLFxuICAgICAgICAgICAgb3B0aW9uczogb3B0cyxcbiAgICAgICAgICAgIGNoYW5nZUZpcmVkOiBmYWxzZSxcbiAgICAgICAgfTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIF9wcm9wZXJ0aWVzLCB7IHZhbHVlOiBwcm9wcyB9KTtcblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhhdHRycykpIHtcbiAgICAgICAgICAgIHRoaXNbX2RlZmluZUF0dHJpYnV0ZXNdKHRoaXMsIGtleSk7XG4gICAgICAgIH1cblxuICAgICAgICAodGhpcyBhcyBhbnkpW19jaGFuZ2VIYW5kbGVyXSA9ICgpID0+IHtcbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAY2hhbmdlJywgdGhpcyBhcyBNb2RlbCk7XG5cbiAgICAgICAgICAgIGNvbnN0IHsgX3ByZXZBdHRycywgX2F0dHJzIH0gPSB0aGlzO1xuICAgICAgICAgICAgY29uc3QgY2hhbmdlZEtleXMgPSBPYmplY3Qua2V5cyhkaWZmKF9wcmV2QXR0cnMsIF9hdHRycyBhcyB1bmtub3duIGFzIFBhcnRpYWw8VD4pKTtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGNoYW5nZWRLZXlzKSB7XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgYW55KS50cmlnZ2VyKGBAY2hhbmdlOiR7a2V5fWAsIHRoaXMsIF9hdHRyc1trZXldLCBfcHJldkF0dHJzW2tleV0sIGtleSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNoYW5nZUZpcmVkID0gdHJ1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzW192YWxpZGF0ZV0oe30sIG9wdHMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgYXR0cmlidXRlIHVwZGF0ZSBjb3JlICovXG4gICAgcHJpdmF0ZSBbX3VwZGF0ZUF0dHJpYnV0ZXNdKG5hbWU6IHN0cmluZywgdmFsOiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgIGlmICghZGVlcEVxdWFsKHRoaXMuX2F0dHJzW25hbWVdLCB2YWwpKSB7XG4gICAgICAgICAgICBjb25zdCB7IGF0dHJzLCBjaGFuZ2VGaXJlZCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgICAgICBpZiAoY2hhbmdlRmlyZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VGaXJlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnByZXZBdHRycyA9IHsgLi4uYXR0cnMgfSBhcyBUO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVsZXRlIHRoaXNbX3Byb3BlcnRpZXNdLmNoYW5nZWRBdHRycztcbiAgICAgICAgICAgIGFzc2lnblZhbHVlKHRoaXMuX3ByZXZBdHRycywgbmFtZSwgYXR0cnNbbmFtZV0pO1xuICAgICAgICAgICAgYXNzaWduVmFsdWUoYXR0cnMsIG5hbWUsIHZhbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGF0dHJpYnV0ZSBicmlkZ2UgZGVmICovXG4gICAgcHJpdmF0ZSBbX2RlZmluZUF0dHJpYnV0ZXNdKGluc3RhbmNlOiBvYmplY3QsIG5hbWU6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb25zdCBwcm90byA9IGluc3RhbmNlLmNvbnN0cnVjdG9yLnByb3RvdHlwZTtcbiAgICAgICAgaWYgKCEobmFtZSBpbiBwcm90bykpIHtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgbmFtZSwge1xuICAgICAgICAgICAgICAgIGdldCgpOiB1bmtub3duIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2F0dHJzW25hbWVdO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2V0KHZhbDogdW5rbm93bik6IHZvaWQge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW191cGRhdGVBdHRyaWJ1dGVzXShuYW1lLCB2YWwpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBwdWJsaWMgcHJvcGVydGllc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjb250ZW50IElELlxuICAgICAqIEBqYSDjgrPjg7Pjg4bjg7Pjg4QgSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGlkQXR0ciA9IGlkQXR0cmlidXRlKHRoaXMsICdpZCcpO1xuICAgICAgICBjb25zdCB7IGNpZCwgYXR0cnMgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gKGlkQXR0ciBpbiBhdHRycykgPyBhdHRyc1tpZEF0dHJdIGFzIHN0cmluZyB8fCBjaWQgOiBjaWQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IHByb3RlY3RlZCBwcm9wZXJ0aWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDlsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9hdHRycygpOiBBY2Nlc3NpYmxlPE9ic2VydmFibGVPYmplY3Q+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmF0dHJzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWZhdWx0IGF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5pei5a6a5YCk5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfYmFzZUF0dHJzKCk6IFQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uYmFzZUF0dHJzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBQcmV2aW91cyBhdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWkieabtOWJjeOBruWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3ByZXZBdHRycygpOiBBY2Nlc3NpYmxlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnByZXZBdHRycyBhcyBBY2Nlc3NpYmxlPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGFuZ2VkIGF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5aSJ5pu044Gu44GC44Gj44Gf5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY2hhbmdlZEF0dHJzKCk6IFBhcnRpYWw8VD4ge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnMgPz89IGRpZmYodGhpcy5fYmFzZUF0dHJzLCB0aGlzLl9hdHRycyBhcyB1bmtub3duIGFzIFBhcnRpYWw8VD4pO1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY2hhbmdlZEF0dHJzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgaW50ZXJuYWwgY29udGVudCBJRC5cbiAgICAgKiBAamEg5YaF6YOo44Gu44Kz44Oz44OG44Oz44OEIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2NpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY2lkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3JlYXRpbmcgb3B0aW9ucy5cbiAgICAgKiBAamEg5qeL56+J5pmC44Gu44Kq44OX44K344On44Oz44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfb3B0aW9ucygpOiBNb2RlbFNldE9wdGlvbnMge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ub3B0aW9ucztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBldmVudHNcblxuICAgIC8qKlxuICAgICAqIEBlbiBFdmVudFNvdXJjZSB0eXBlIHJlc29sdmVyLlxuICAgICAqIEBqYSBFdmVudFNvdXJjZSDlnovop6PmsbrnlKjjg5jjg6vjg5Hjg7zjgqLjgq/jgrvjg4PjgrVcbiAgICAgKi9cbiAgICBnZXQgJCgpOiBFdmVudFNvdXJjZTxURXZlbnQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBicm9rZXIgYWNjZXNzICovXG4gICAgcHJpdmF0ZSBnZXQgW19icm9rZXJdKCk6IEV2ZW50QnJva2VyPGFueT4ge1xuICAgICAgICByZXR1cm4gKHRoaXMuX2F0dHJzIGFzIElPYnNlcnZhYmxlIGFzIElPYnNlcnZhYmxlRXZlbnRCcm9rZXJBY2Nlc3MpLmdldEJyb2tlcigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIHRoaXMgb2JqZWN0IGhhcyBjbGllbnRzLlxuICAgICAqIEBqYSDjgq/jg6njgqTjgqLjg7Pjg4jjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIGhhc0xpc3RlbmVyPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBURXZlbnQ+KGNoYW5uZWw/OiBDaGFubmVsLCBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8VEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfYnJva2VyXS5oYXNMaXN0ZW5lcihjaGFubmVsLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgcmVnaXN0ZXJlZCBjaGFubmVsIGtleXMuXG4gICAgICogQGphIOeZu+mMsuOBleOCjOOBpuOBhOOCi+ODgeODo+ODjeODq+OCreODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNoYW5uZWxzKCk6IChrZXlvZiBURXZlbnQpW10ge1xuICAgICAgICByZXR1cm4gdGhpc1tfYnJva2VyXS5jaGFubmVscygpLmZpbHRlcihjID0+ICdAJyAhPT0gYykgYXMgKGtleW9mIFRFdmVudClbXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTm90aWZ5IGV2ZW50IHRvIGNsaWVudHMuXG4gICAgICogQGphIGV2ZW50IOeZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGFyZ3VtZW50cyBmb3IgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsOOBq+a4oeOBmeW8leaVsFxuICAgICAqL1xuICAgIHB1YmxpYyB0cmlnZ2VyPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBURXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwsIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPFRFdmVudFtDaGFubmVsXT4+KTogdm9pZCB7XG4gICAgICAgICh0aGlzW19icm9rZXJdIGFzIGFueSkudHJpZ2dlcihjaGFubmVsLCAuLi5hcmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm6Kej6ZmkXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBURXZlbnQ+KGNoYW5uZWw/OiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8VEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IHZvaWQge1xuICAgICAgICB0aGlzLl9hdHRycy5vZmYoY2hhbm5lbCBhcyBhbnksIGxpc3RlbmVyIGFzIGFueSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIG9uPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBURXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPFRFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICB0aGlzLl9hdHRycy5vbignQCcsICh0aGlzIGFzIGFueSlbX2NoYW5nZUhhbmRsZXJdKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2F0dHJzLm9uKGNoYW5uZWwgYXMgYW55LCBsaXN0ZW5lciBhcyBhbnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykgYnV0IGl0IGNhdXNlcyB0aGUgYm91bmQgY2FsbGJhY2sgdG8gb25seSBmaXJlIG9uY2UgYmVmb3JlIGJlaW5nIHJlbW92ZWQuXG4gICAgICogQGphIOS4gOW6puOBoOOBkeODj+ODs+ODieODquODs+OCsOWPr+iDveOBquOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBvbmNlPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBURXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPFRFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5vbihjaGFubmVsLCBsaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IG1hbmFnZWQgPSB0aGlzLm9uKGNoYW5uZWwsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnRleHQudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIG1hbmFnZWQudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjb250ZXh0O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IHZhbGlkYXRpb25cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB2YWxpZCBvciBub3QuXG4gICAgICogQGphIOaknOiovOOBruaIkOWQpuOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpc1ZhbGlkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gU1VDQ0VFREVEKHRoaXMudmFsaWRhdGUoeyBzaWxlbnQ6IHRydWUgfSkuY29kZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFZhbGlkYXRlIHJlc3VsdCBhY2Nlc3Nlci5cbiAgICAgKiBAamEg5qSc6Ki857WQ5p6c44Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcHVibGljIHZhbGlkYXRlKG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFJlc3VsdCB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgdmFsaWRhdGU6IHRydWUsIG5vVGhyb3c6IHRydWUsIGV4dGVuZDogZmFsc2UgfSwgb3B0aW9ucyk7XG4gICAgICAgIHJldHVybiB0aGlzW192YWxpZGF0ZV0oe30sIG9wdHMpO1xuICAgIH1cblxuICAgIC8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyAqL1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZhbGlkYXRlIGRhdGEgbWV0aG9kLlxuICAgICAqIEBqYSDjg4fjg7zjgr/mpJzoqLxcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIHZhbGlkYXRlZSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGphYCDooqvmpJzoqLzlsZ7mgKdcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgdmFsaWRhdGUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5qSc6Ki844Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHZhbGlkYXRlQXR0cmlidXRlczxBIGV4dGVuZHMgVD4oYXR0cmlidXRlczogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPiwgb3B0aW9ucz86IE1vZGVsVmFsaWRhdGVBdHRyaWJ1dGVPcHRpb25zKTogUmVzdWx0IHtcbiAgICAgICAgcmV0dXJuIFJFU1VMVF9WQUxJRF9BVFRSUztcbiAgICB9XG5cbiAgICAvKiBlc2xpbnQtZW5hYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyAqL1xuXG4gICAgLyoqIEBpbnRlcm5hbCB2YWxpZGF0ZSAqL1xuICAgIHByaXZhdGUgW192YWxpZGF0ZV08QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4sIG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiBSZXN1bHQgfCBuZXZlciB7XG4gICAgICAgIGNvbnN0IHsgdmFsaWRhdGUsIHNpbGVudCwgbm9UaHJvdyB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgaWYgKHZhbGlkYXRlKSB7XG4gICAgICAgICAgICBjb25zdCBhdHRycyA9IHsgLi4udGhpcy5fYXR0cnMsIC4uLmF0dHJpYnV0ZXMgfTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMudmFsaWRhdGVBdHRyaWJ1dGVzKGF0dHJzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChGQUlMRUQocmVzdWx0LmNvZGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BpbnZhbGlkJywgdGhpcyBhcyBNb2RlbCwgYXR0cnMsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghbm9UaHJvdykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBSRVNVTFRfVkFMSURfQVRUUlM7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBhdHRyaWJ1dGVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIHtAbGluayBNb2RlbH0gaGFzIHZhbGlkIHByb3BlcnR5LiAobm90IGBudWxsYCBvciBgdW5kZWZpbmVkYClcbiAgICAgKiBAamEge0BsaW5rIE1vZGVsfSDjgYzmnInlirnjgarjg5fjg63jg5Hjg4bjgqPjgpLmjIHjgaPjgabjgYTjgovjgYvnorroqo0gKGBudWxsYCDjgb7jgZ/jga8gYHVuZGVmaW5lZGAg44Gn44Gq44GEKVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXMoYXR0cmlidXRlOiBrZXlvZiBUKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9ICh0aGlzLl9hdHRycyBhcyB1bmtub3duIGFzIFQpW2F0dHJpYnV0ZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgSFRNTC1lc2NhcGVkIHZhbHVlIG9mIGFuIGF0dHJpYnV0ZS5cbiAgICAgKiBAamEgSFRNTCDjgafkvb/nlKjjgZnjgovmloflrZfjgpLliLblvqHmloflrZfjgavnva7mj5vjgZfjgZ/lsZ7mgKflgKTjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZXNjYXBlKGF0dHJpYnV0ZToga2V5b2YgVCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBlc2NhcGVIVE1MKHRoaXMuX2F0dHJzW2F0dHJpYnV0ZV0gYXMgUHJpbWl0aXZlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGF0dHJpYnV0ZXMgZm9yIGJhdGNoIGlucHV0IHdpdGggb3B0aW9ucy5cbiAgICAgKiBAamEg5bGe5oCn44Gu5LiA5ous6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgdXBkYXRlIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgamFgIOabtOaWsOWxnuaAp1xuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzZXQgYXR0cmlidXRlcyBvcHRpb25zXG4gICAgICogIC0gYGphYCDlsZ7mgKfmm7TmlrDnlKjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0QXR0cmlidXRlczxBIGV4dGVuZHMgVD4oYXR0cmlidXRlczogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPiwgb3B0aW9ucz86IE1vZGVsU2V0T3B0aW9ucyk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHNpbGVudCwgZXh0ZW5kIH0gPSBvcHRpb25zID8/IHt9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYXR0cnMuc3VzcGVuZCh0cnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpc1tfdmFsaWRhdGVdKGF0dHJpYnV0ZXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKEZBSUxFRChyZXN1bHQuY29kZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIE9iamVjdC5rZXlzKGF0dHJpYnV0ZXMpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGF0dHIgaW4gdGhpcy5fYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfdXBkYXRlQXR0cmlidXRlc10oYXR0ciwgYXR0cmlidXRlc1thdHRyXSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChleHRlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfZGVmaW5lQXR0cmlidXRlc10odGhpcywgYXR0cik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX3VwZGF0ZUF0dHJpYnV0ZXNdKGF0dHIsIGF0dHJpYnV0ZXNbYXR0cl0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGlmIChzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hdHRycy5yZXN1bWUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBhbGwgYXR0cmlidXRlcyBvbiB0aGUge0BsaW5rIE1vZGVsfS4gKHNldCBgdW5kZWZpbmVkYClcbiAgICAgKiBAamEge0BsaW5rIE1vZGVsfSDjgYvjgonjgZnjgbnjgabjga7lsZ7mgKfjgpLliYrpmaQgKGB1bmRlZmluZWRgIOOCkuioreWumilcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xlYXIob3B0aW9ucz86IE1vZGVsU2V0T3B0aW9ucyk6IHRoaXMge1xuICAgICAgICBjb25zdCBjbGVhckF0dHJzID0ge30gYXMgQWNjZXNzaWJsZTxvYmplY3Q+O1xuICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgT2JqZWN0LmtleXModGhpcy5fYmFzZUF0dHJzKSkge1xuICAgICAgICAgICAgY2xlYXJBdHRyc1thdHRyXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5zZXRBdHRyaWJ1dGVzKGNsZWFyQXR0cnMsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBtb2RlbCdzIGBhdHRyaWJ1dGVzYCBvYmplY3QuXG4gICAgICogQGphIE1vZGVsIOWxnuaAp+WApOOBruOCs+ODlOODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyB0b0pTT04oKTogVCB7XG4gICAgICAgIHJldHVybiBkZWVwQ29weSh7IC4uLnRoaXMuX2F0dHJzIH0gYXMgVCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVzIENsb25lIHRoaXMgaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOBruikh+ijveOCkui/lOWNtFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgcHVibGljIGNsb25lKCk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IGNvbnN0cnVjdG9yLCBfYXR0cnMsIF9vcHRpb25zIH0gPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IChjb25zdHJ1Y3RvciBhcyBDb25zdHJ1Y3Rvcjx0aGlzPikoX2F0dHJzLCBfb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGNoYW5nZWQgYXR0cmlidXRlcy5cbiAgICAgKiBAamEg5aSJ5pu044GV44KM44Gf5bGe5oCn5YCk44KS5oyB44Gk44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlXG4gICAgICogIC0gYGVuYCBjaGVja2VkIGF0dHJpYnV0ZVxuICAgICAqICAtIGBqYWAg5qSc6Ki844GZ44KL5bGe5oCnXG4gICAgICovXG4gICAgcHVibGljIGhhc0NoYW5nZWQoYXR0cmlidXRlPzoga2V5b2YgVCk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAobnVsbCA9PSBhdHRyaWJ1dGUpIHtcbiAgICAgICAgICAgIHJldHVybiAhaXNFbXB0eU9iamVjdCh0aGlzLl9jaGFuZ2VkQXR0cnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGF0dHJpYnV0ZSBpbiB0aGlzLl9jaGFuZ2VkQXR0cnM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGFuIG9iamVjdCBjb250YWluaW5nIGFsbCB0aGUgYXR0cmlidXRlcyB0aGF0IGhhdmUgY2hhbmdlZCwgb3IgYHVuZGVmaW5lZGAgaWYgdGhlcmUgYXJlIG5vIGNoYW5nZWQgYXR0cmlidXRlcy5cbiAgICAgKiBAamEg5YWl5Yqb44GX44GfIGF0dHJpYnV0ZXMg5YCk44Gu5beu5YiG44Gr5a++44GX44Gm5aSJ5pu044GM44GC44KL5bGe5oCn5YCk44KS6L+U5Y20LiDlt67liIbjgYzjgarjgYTloLTlkIjjga8gYHVuZGVmaWVuZGAg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgY2hlY2tlZCBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGphYCDmpJzoqLzjgZnjgovlsZ7mgKdcbiAgICAgKi9cbiAgICBwdWJsaWMgY2hhbmdlZChhdHRyaWJ1dGVzPzogUGFydGlhbDxUPik6IFBhcnRpYWw8VD4gfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAoIWF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhhc0NoYW5nZWQoKSA/IHsgLi4udGhpcy5fY2hhbmdlZEF0dHJzIH0gOiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBjaGFuZ2VkID0gZGlmZih0aGlzLl9hdHRycywgYXR0cmlidXRlcyk7XG4gICAgICAgICAgICByZXR1cm4gIWlzRW1wdHlPYmplY3QoY2hhbmdlZCkgPyBjaGFuZ2VkIDogdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgcHJldmlvdXMgdmFsdWUgb2YgYW4gYXR0cmlidXRlLCByZWNvcmRlZCBhdCB0aGUgdGltZSB0aGUgbGFzdCBgQGNoYW5nZWAgZXZlbnQgd2FzIGZpcmVkLlxuICAgICAqIEBqYSBgQGNoYW5nZWAg44GM55m654Gr44GV44KM44Gf5YmN44Gu5bGe5oCn5YCk44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHByZXZpb3VzPEsgZXh0ZW5kcyBrZXlvZiBUPihhdHRyaWJ1dGU6IEspOiBUW0tdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ByZXZBdHRyc1thdHRyaWJ1dGVdO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IHN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBhIHtAbGluayBNb2RlbH0gaXMgbmV3IGlmIGl0IGhhcyBuZXZlciBiZWVuIHNhdmVkIHRvIHRoZSBzZXJ2ZXIsIGFuZCBsYWNrcyBhbiBpZC5cbiAgICAgKiBAamEge0BsaW5rIE1vZGVsfSDjgYzjgb7jgaDjgrXjg7zjg5Djg7zjgavlrZjlnKjjgZfjgarjgYTjgYvjg4Hjgqfjg4Pjgq8uIOaXouWumuOBp+OBryBgaWRBdHRyaWJ1dGVgIOOBruacieeEoeOBp+WIpOWumlxuICAgICAqL1xuICAgIHByb3RlY3RlZCBpc05ldygpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgaWRBdHRyID0gaWRBdHRyaWJ1dGUodGhpcywgJ2lkJyk7XG4gICAgICAgIHJldHVybiAhdGhpcy5oYXMoaWRBdHRyIGFzIGtleW9mIFQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDb252ZXJ0cyBhIHJlc3BvbnNlIGludG8gdGhlIGhhc2ggb2YgYXR0cmlidXRlcyB0byBiZSBgc2V0YCBvbiB0aGUgbW9kZWwuIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIGlzIGp1c3QgdG8gcGFzcyB0aGUgcmVzcG9uc2UgYWxvbmcuXG4gICAgICogQGphIOODrOOCueODneODs+OCueOBruWkieaPm+ODoeOCveODg+ODiS4g5pei5a6a44Gn44Gv5L2V44KC44GX44Gq44GEXG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgcGFyc2UocmVzcG9uc2U6IE1vZGVsU2VlZCB8IHZvaWQsIG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiBUIHwgdm9pZCB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHJldHVybiByZXNwb25zZSBhcyBUO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBQcm94eSB7QGxpbmsgSURhdGFTeW5jLnN5bmMgfCBJRGF0YVN5bmMuc3luY30oKSBieSBkZWZhdWx0IC0tIGJ1dCBvdmVycmlkZSB0aGlzIGlmIHlvdSBuZWVkIGN1c3RvbSBzeW5jaW5nIHNlbWFudGljcyBmb3IgKnRoaXMqIHBhcnRpY3VsYXIgbW9kZWwuXG4gICAgICogQGphIOODh+ODvOOCv+WQjOacny4g5b+F6KaB44Gr5b+c44GY44Gm44Kq44O844OQ44O844Op44Kk44OJ5Y+v6IO9LlxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gc3RyaW5nXG4gICAgICogIC0gYGphYCDjgqrjg5rjg6zjg7zjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgc3luY2hyb25pemVkIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYCDlkIzmnJ/jgZnjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHN5bmMobWV0aG9kOiBNb2RlbFN5bmNNZXRob2RzLCBjb250ZXh0OiBNb2RlbDxUPiwgb3B0aW9ucz86IE1vZGVsRGF0YVN5bmNPcHRpb25zKTogUHJvbWlzZTxNb2RlbFN5bmNSZXN1bHQ8VD4+IHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRTeW5jKCkuc3luYyhtZXRob2QsIGNvbnRleHQgYXMgU3luY0NvbnRleHQ8VD4sIG9wdGlvbnMpIGFzIFByb21pc2U8TW9kZWxTeW5jUmVzdWx0PFQ+PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRmV0Y2ggdGhlIHtAbGluayBNb2RlbH0gZnJvbSB0aGUgc2VydmVyLCBtZXJnaW5nIHRoZSByZXNwb25zZSB3aXRoIHRoZSBtb2RlbCdzIGxvY2FsIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIHtAbGluayBNb2RlbH0g5bGe5oCn44Gu44K144O844OQ44O85ZCM5pyfLiDjg6zjgrnjg53jg7Pjgrnjga7jg57jg7zjgrjjgpLlrp/ooYxcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgZmV0Y2gob3B0aW9ucz86IE1vZGVsRmV0Y2hPcHRpb25zKTogUHJvbWlzZTxUPiB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgcGFyc2U6IHRydWUgfSwgb3B0aW9ucywgeyBzeW5jTWV0aG9kOiAncmVhZCcgfSk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCB0aGlzLnN5bmMoJ3JlYWQnLCB0aGlzIGFzIE1vZGVsPFQ+LCBvcHRzKSBhcyBUO1xuICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGVzKG9wdHMucGFyc2UgPyB0aGlzLnBhcnNlKHJlc3AgYXMgTW9kZWxTZWVkLCBvcHRzKSBhcyBUIDogcmVzcCwgb3B0cyk7XG4gICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQHN5bmMnLCB0aGlzIGFzIE1vZGVsLCByZXNwIGFzIE1vZGVsU2VlZCwgb3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BlcnJvcicsIHRoaXMgYXMgTW9kZWwsIGUsIG9wdHMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgYSBoYXNoIG9mIHtAbGluayBNb2RlbH0gYXR0cmlidXRlcywgYW5kIHN5bmMgdGhlIG1vZGVsIHRvIHRoZSBzZXJ2ZXIuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIHNlcnZlciByZXR1cm5zIGFuIGF0dHJpYnV0ZXMgaGFzaCB0aGF0IGRpZmZlcnMsIHRoZSBtb2RlbCdzIHN0YXRlIHdpbGwgYmUgYHNldGAgYWdhaW4uXG4gICAgICogQGphIHtAbGluayBNb2RlbH0g5bGe5oCn44KS44K144O844OQ44O844Gr5L+d5a2YLiA8YnI+XG4gICAgICogICAgIOeVsOOBquOCi+WxnuaAp+OBjOi/lOWNtOOBleOCjOOCi+WgtOWQiOOBr+WGjeioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgdXBkYXRlIGF0dHJpYnV0ZSBrZXlcbiAgICAgKiAgLSBgamFgIOabtOaWsOWxnuaAp+OCreODvFxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgdXBkYXRlIGF0dHJpYnV0ZSB2YWx1ZVxuICAgICAqICAtIGBqYWAg5pu05paw5bGe5oCn5YCkXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNhdmUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5L+d5a2Y44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIHNhdmU8SyBleHRlbmRzIGtleW9mIFQ+KGtleT86IGtleW9mIFQsIHZhbHVlPzogVFtLXSwgb3B0aW9ucz86IE1vZGVsU2F2ZU9wdGlvbnMpOiBQcm9taXNlPFQgfCB2b2lkPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgYSBoYXNoIG9mIHtAbGluayBNb2RlbH0gYXR0cmlidXRlcywgYW5kIHN5bmMgdGhlIG1vZGVsIHRvIHRoZSBzZXJ2ZXIuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIHNlcnZlciByZXR1cm5zIGFuIGF0dHJpYnV0ZXMgaGFzaCB0aGF0IGRpZmZlcnMsIHRoZSBtb2RlbCdzIHN0YXRlIHdpbGwgYmUgYHNldGAgYWdhaW4uXG4gICAgICogQGphIHtAbGluayBNb2RlbH0g5bGe5oCn44KS44K144O844OQ44O844Gr5L+d5a2YLiA8YnI+XG4gICAgICogICAgIOeVsOOBquOCi+WxnuaAp+OBjOi/lOWNtOOBleOCjOOCi+WgtOWQiOOBr+WGjeioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIHVwZGF0ZSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGphYCDmm7TmlrDlsZ7mgKdcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2F2ZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDkv53lrZjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgc2F2ZTxBIGV4dGVuZHMgVD4oYXR0cmlidXRlczogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPiB8IE51bGxpc2gsIG9wdGlvbnM/OiBNb2RlbFNhdmVPcHRpb25zKTogUHJvbWlzZTxUIHwgdm9pZD47XG5cbiAgICBwdWJsaWMgYXN5bmMgc2F2ZSguLi5hcmdzOiB1bmtub3duW10pOiBQcm9taXNlPFQgfCB2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgYXR0cnMsIG9wdGlvbnMgfSA9IHBhcnNlU2F2ZUFyZ3MoLi4uYXJncyk7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgdmFsaWRhdGU6IHRydWUsIHBhcnNlOiB0cnVlLCB3YWl0OiB0cnVlLCBleHRlbmQ6IHRydWUgfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgd2FpdCB9ID0gb3B0cztcblxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gb3B0cy5zeW5jTWV0aG9kID0gdGhpcy5pc05ldygpID8gJ2NyZWF0ZScgOiBvcHRzLnBhdGNoID8gJ3BhdGNoJyA6ICd1cGRhdGUnO1xuXG4gICAgICAgICAgICBpZiAoYXR0cnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXdhaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGVzKGF0dHJzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uYmFzZUF0dHJzID0geyAuLi50aGlzLl9hdHRycyB9IGFzIFQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfdmFsaWRhdGVdKGF0dHJzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCdwYXRjaCcgPT09IG1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICBvcHRzLmRhdGEgPSBhdHRycztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvcHRzLmRhdGEgPSBPYmplY3QuYXNzaWduKHRoaXMudG9KU09OKCksIGF0dHJzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCB0aGlzLnN5bmMobWV0aG9kLCB0aGlzIGFzIE1vZGVsPFQ+LCBvcHRzKSBhcyBNb2RlbFNlZWQ7XG5cbiAgICAgICAgICAgIGxldCBzZXJ2ZXJBdHRycyA9IG9wdHMucGFyc2UgPyB0aGlzLnBhcnNlKHJlc3AsIG9wdHMpIDogcmVzcDtcbiAgICAgICAgICAgIGlmIChhdHRycyAmJiB3YWl0KSB7XG4gICAgICAgICAgICAgICAgc2VydmVyQXR0cnMgPSBPYmplY3QuYXNzaWduKHt9LCBhdHRycywgc2VydmVyQXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlzT2JqZWN0KHNlcnZlckF0dHJzKSAmJiAhaXNFbXB0eU9iamVjdChzZXJ2ZXJBdHRycykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEF0dHJpYnV0ZXMoc2VydmVyQXR0cnMgYXMgVCwgb3B0cyk7XG4gICAgICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uYmFzZUF0dHJzID0geyAuLi50aGlzLl9hdHRycyB9IGFzIFQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICh0aGlzIGFzIE1vZGVsKS50cmlnZ2VyKCdAc3luYycsIHRoaXMgYXMgTW9kZWwsIHJlc3AsIG9wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3AgYXMgVDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BlcnJvcicsIHRoaXMgYXMgTW9kZWwsIGUsIG9wdHMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXN0cm95IHRoaXMge0BsaW5rIE1vZGVsfSBvbiB0aGUgc2VydmVyIGlmIGl0IHdhcyBhbHJlYWR5IHBlcnNpc3RlZC5cbiAgICAgKiBAamEge0BsaW5rIE1vZGVsfSDjgpLjgrXjg7zjg5Djg7zjgYvjgonliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBkZXN0cm95IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOegtOajhOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBkZXN0cm95KG9wdGlvbnM/OiBNb2RlbERlc3Ryb3lPcHRpb25zKTogUHJvbWlzZTxUIHwgdm9pZD4ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHdhaXQ6IHRydWUgfSwgb3B0aW9ucywgeyBzeW5jTWV0aG9kOiAnZGVsZXRlJyB9KTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyB3YWl0LCBjYW5jZWwgfSA9IG9wdHM7XG4gICAgICAgICAgICBjb25zdCBleGlzdHMgPSAhdGhpcy5pc05ldygpO1xuICAgICAgICAgICAgY29uc3QgZGVzdHJ1Y3QgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgTW9kZWwpLnRyaWdnZXIoJ0BkZXN0cm95JywgdGhpcyBhcyBNb2RlbCwgb3B0cyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAhd2FpdCAmJiBkZXN0cnVjdCgpO1xuXG4gICAgICAgICAgICBsZXQgcmVzcDogVCB8IHZvaWQgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAoIWV4aXN0cykge1xuICAgICAgICAgICAgICAgIGF3YWl0IGNjKGNhbmNlbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3AgPSBhd2FpdCB0aGlzLnN5bmMoJ2RlbGV0ZScsIHRoaXMgYXMgTW9kZWw8VD4sIG9wdHMpIGFzIFQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHdhaXQgJiYgZGVzdHJ1Y3QoKTtcbiAgICAgICAgICAgIGV4aXN0cyAmJiAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQHN5bmMnLCB0aGlzIGFzIE1vZGVsLCByZXNwIGFzIE1vZGVsU2VlZCwgb3B0cyk7XG5cbiAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAodGhpcyBhcyBNb2RlbCkudHJpZ2dlcignQGVycm9yJywgdGhpcyBhcyBNb2RlbCwgZSwgb3B0cyk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBtaXhpbiDjgavjgojjgosgYGluc3RhbmNlb2ZgIOOBr+eEoeWKueOBq+ioreWumlxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoTW9kZWwgYXMgdW5rbm93biBhcyBDbGFzcywgJ2luc3RhbmNlT2YnLCBudWxsKTtcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMge0BsaW5rIE1vZGVsfS5cbiAqIEBqYSB7QGxpbmsgTW9kZWx9IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTW9kZWwoeDogdW5rbm93bik6IHggaXMgTW9kZWwge1xuICAgIHJldHVybiB4IGluc3RhbmNlb2YgTW9kZWw7XG59XG5cbi8qKlxuICogQGVuIFF1ZXJ5IHtAbGluayBNb2RlbH0gYGlkLWF0dHJpYnV0ZWAuXG4gKiBAamEge0BsaW5rIE1vZGVsfSDjga4gYGlkLWF0dHJpYnV0ZWAg44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpZEF0dHJpYnV0ZSh4OiB1bmtub3duLCBmYWxsYmFjayA9ICcnKTogc3RyaW5nIHtcbiAgICByZXR1cm4gaXNPYmplY3QoeCkgPyAoKHguY29uc3RydWN0b3IgYXMgYW55KS5pZEF0dHJpYnV0ZSA/PyBmYWxsYmFjaykgOiBmYWxsYmFjaztcbn1cbiJdLCJuYW1lcyI6WyJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJpc09iamVjdCIsImFzc2lnblZhbHVlIiwiRXZlbnRSZWNlaXZlciIsIk9ic2VydmFibGVPYmplY3QiLCJsdWlkIiwiZGlmZiIsImRlZXBFcXVhbCIsIlNVQ0NFRURFRCIsInJlc3VsdCIsIkZBSUxFRCIsImVzY2FwZUhUTUwiLCJkZWVwQ29weSIsImlzRW1wdHlPYmplY3QiLCJkZWZhdWx0U3luYyIsImNjIiwic2V0TWl4Q2xhc3NBdHRyaWJ1dGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7OztJQUdHO0lBRUgsQ0FBQSxZQUFxQjtJQU1qQjs7O0lBR0c7SUFDSCxJQUFBLElBQUEsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBO0lBQUEsSUFBQSxDQUFBLFlBQXVCO0lBQ25CLFFBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQSxtQkFBQSxDQUFBLEdBQUEsZ0JBQUEsQ0FBQSxHQUFBLG1CQUFpRDtZQUNqRCxXQUF5QixDQUFBLFdBQUEsQ0FBQSx3QkFBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsK0JBQXdCLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQSxHQUFBLHdCQUFBO0lBQ2pILEtBQUMsR0FBQTtJQUNMLENBQUMsR0FBQTs7SUNuQkQ7O0lBRUc7SUF1REgsaUJBQWlCLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQztJQUMzRCxpQkFBaUIsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDO0lBQzNELGlCQUFpQixNQUFNLFNBQVMsR0FBVyxNQUFNLENBQUMsVUFBVSxDQUFDO0lBQzdELGlCQUFpQixNQUFNLGNBQWMsR0FBTSxNQUFNLENBQUMsVUFBVSxDQUFDO0lBQzdELGlCQUFpQixNQUFNLE9BQU8sR0FBYSxNQUFNLENBQUMsUUFBUSxDQUFDO0lBQzNELGlCQUFpQixNQUFNLFdBQVcsR0FBUyxNQUFNLENBQUMsWUFBWSxDQUFDO0lBYS9EOzs7SUFHRztBQUNVLFVBQUEsa0JBQWtCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQ0EsaUJBQVUsQ0FBQ0Msa0JBQVcsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLENB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