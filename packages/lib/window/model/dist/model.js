/*!
 * @cdp/model 0.9.0
 *   generic model scheme
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/events'), require('@cdp/observable'), require('@cdp/result')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/events', '@cdp/observable', '@cdp/result'], factory) :
    (global = global || self, factory(global.CDP = global.CDP || {}, global.CDP.Utils, global.CDP, global.CDP, global.CDP));
}(this, (function (exports, coreUtils, events, observable, result) { 'use strict';

    /* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-unused-vars, @typescript-eslint/restrict-plus-operands */
    globalThis.CDP_DECLARE = globalThis.CDP_DECLARE;
    (function () {
        /**
         * @en Extends error code definitions.
         * @ja 拡張通エラーコード定義
         */
        let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
        (function () {
            RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_DATA"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 40 /* MODEL */ + 1, 'invalid data.')] = "ERROR_MVC_INVALID_DATA";
        })();
    })();

    /* eslint-disable @typescript-eslint/no-explicit-any */
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
    class Model extends events.EventRevceiver {
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
            const props = {
                attrs: observable.ObservableObject.from(attributes),
                baseAttrs: { ...attributes },
                prevAttrs: { ...attributes },
                idAttribute: opts.idAttribute,
                cid: coreUtils.luid('model:', 8),
            };
            Object.defineProperty(this, _properties, { value: props });
            for (const key of Object.keys(attributes)) {
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
            if ('@change' === channel) {
                this._attrs.on('*', this[_changeHandler]);
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
    }
    /*
     PROGRESS:

    ● Events
    ☆ on
    ☆ off
    ☆ trigger
    ☆ once
    ☆ listenTo
    ☆ stopListening
    ☆ listenToOnce

    ● Model
    ☆ extend
    ☆ preinitialize
    ☆ constructor / initialize
    ☆ get
    ☆ set
    ☆ escape
    ☆ has
    △ unset
    ☆ clear
    ☆ id
    ☆ idAttribute
    ☆ cid
    △ attributes
    △ changed
    △ defaults
    ☆ toJSON
    ★ sync
    ★ fetch
    ★ save
    ★ destroy

    ● Underscore
    ☆ validate
    △ validationError
    ☆ isValid
    ★ url
    ★ urlRoot
    ★ parse
    ★ clone
    ★ isNew
    ☆ hasChanged
    ☆ changedAttributes
    ☆ previous
    △ previousAttributes
     */

    exports.ModelBase = Model;
    exports.RESULT_VALID_ATTRS = RESULT_VALID_ATTRS;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwuanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJiYXNlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycywgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXBsdXMtb3BlcmFuZHMgKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgTU9ERUwgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by16YCa44Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9EQVRBID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuTU9ERUwgKyAxLCAnaW52YWxpZCBkYXRhLicpLFxuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuaW1wb3J0IHtcbiAgICBBcmd1bWVudHMsXG4gICAgaXNFbXB0eU9iamVjdCxcbiAgICBsdWlkLFxuICAgIGVzY2FwZUhUTUwsXG4gICAgZGVlcENvcHksXG4gICAgZGVlcEVxdWFsLFxuICAgIGRpZmYsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIFN1YnNjcmlwdGlvbixcbiAgICBTaWxlbmNlYWJsZSxcbiAgICBFdmVudEJyb2tlcixcbiAgICBFdmVudFJldmNlaXZlcixcbiAgICBFdmVudFNvdXJjZSxcbn0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBJT2JzZXJ2YWJsZSxcbiAgICBJT2JzZXJ2YWJsZUV2ZW50QnJva2VyQWNjZXNzLFxuICAgIE9ic2VydmFibGVPYmplY3QsXG59IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQge1xuICAgIFJFU1VMVF9DT0RFLFxuICAgIFJlc3VsdCxcbiAgICBtYWtlUmVzdWx0LFxuICAgIFNVQ0NFRURFRCxcbiAgICBGQUlMRUQsXG59IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgTW9kZWxFdmVudCxcbiAgICBNb2RlbFZhbGlkYXRlQXR0cmlidXRlT3B0aW9ucyxcbiAgICBNb2RlbEF0dHJpYnV0ZUlucHV0LFxuICAgIE1vZGVsU2V0T3B0aW9ucyxcbiAgICBNb2RlbENvbnN0cnVjdGlvbk9wdGlvbnMsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbmNvbnN0IF9kZWZpbmVBdHRyaWJ1dGVzID0gU3ltYm9sKCdkZWZpbmUnKTtcbmNvbnN0IF92YWxpZGF0ZSAgICAgICAgID0gU3ltYm9sKCd2YWxpZGF0ZScpO1xuY29uc3QgX2NoYW5nZUhhbmRsZXIgICAgPSBTeW1ib2woJ29uY2hhbmdlJyk7XG5jb25zdCBfYnJva2VyICAgICAgICAgICA9IFN5bWJvbCgnYnJva2VyJyk7XG5jb25zdCBfcHJvcGVydGllcyAgICAgICA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHk8VD4ge1xuICAgIGF0dHJzOiBPYnNlcnZhYmxlT2JqZWN0O1xuICAgIGJhc2VBdHRyczogVDtcbiAgICBwcmV2QXR0cnM6IFQ7XG4gICAgY2hhbmdlZEF0dHJzPzogUGFydGlhbDxUPjtcbiAgICByZWFkb25seSBpZEF0dHJpYnV0ZTogc3RyaW5nO1xuICAgIHJlYWRvbmx5IGNpZDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBlbiBWYWxpZCBhdHRyaWJ1dGVzIHJlc3VsdC5cbiAqIEBqYSDlsZ7mgKfmpJzoqLzjga7mnInlirnlgKRcbiAqL1xuZXhwb3J0IGNvbnN0IFJFU1VMVF9WQUxJRF9BVFRSUyA9IE9iamVjdC5mcmVlemUobWFrZVJlc3VsdChSRVNVTFRfQ09ERS5TVUNDRVNTLCAndmFsaWQgYXR0cmlidXRlLicpKTtcblxuLyoqXG4gKiBAZW4gW1tNb2RlbF1dIGJhc2UgY2xhc3MgZGVmaW5pdGlvbi5cbiAqIEBqYSBbW01vZGVsXV0g44Gu5Z+65bqV44Kv44Op44K55a6a576pXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBNb2RlbEJhc2UsIE1vZGVsQ29uc3RydWN0b3IgfSBmcm9tICdAY2RwL21vZGVsJztcbiAqXG4gKiBpbnRlcmZhY2UgQ29udGVudEF0dHJpYnV0ZSB7XG4gKiAgIHVyaTogc3RyaW5nO1xuICogICByZWFkb25seSBzaXplOiBudW1iZXI7XG4gKiAgIGNvb2tpZT86IHN0cmluZztcbiAqIH1cbiAqIGBgYFxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogLy8gZWFybHkgY2FzdFxuICogY29uc3QgTW9kZSA9IE1vZGVsQmFzZSBhcyBNb2RlbENvbnN0cnVjdG9yPE1vZGVsQmFzZTxDb250ZW50QXR0cmlidXRlPiwgQ29udGVudEF0dHJpYnV0ZT47XG4gKlxuICogY2xhc3MgQ29udGVudCBleHRlbmRzIE1vZGVsIHtcbiAqICAgY29uc3RydWN0b3IoYXR0cnM6IENvbnRlbnRBdHRyaWJ1dGUpIHtcbiAqICAgICBzdXBlcihhdHRycyk7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIG9yXG4gKlxuICogYGBgdHNcbiAqIGNsYXNzIENvbnRlbnRCYXNlIGV4dGVuZHMgTW9kZWxCYXNlPENvbnRlbnRBdHRyaWJ1dGU+IHtcbiAqICAgY29uc3RydWN0b3IoYXR0cnM6IENvbnRlbnRBdHRyaWJ1dGUpIHtcbiAqICAgICBzdXBlcihhdHRycyk7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiAvLyBsYXRlIGNhc3RcbiAqIGNvbnN0IENvbnRlbnQgPSBDb250ZW50QmFzZSBhcyBNb2RlbENvbnN0cnVjdG9yPENvbnRlbnQsIENvbnRlbnRBdHRyaWJ1dGU+O1xuICogYGBgXG4gKiB0aGVuXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGNvbnRlbnQgPSBuZXcgQ29udGVudCh7XG4gKiAgIHVyaTogJ2FhYS50eHQnLFxuICogICBzaXplOiAxMCxcbiAqICAgY29va2llOiB1bmRlZmluZWQsIC8vIG5lZWQgZXhwbGljaXQgYXNzaWduXG4gKiB9KTtcbiAqXG4gKiBjb25zb2xlLmxvZyhjb250ZW50LnVyaSk7ICAgIC8vICdhYWEudHh0J1xuICogY29uc29sZS5sb2coY29udGVudC5zaXplKTsgICAvLyAnMTAnXG4gKiBjb25zb2xlLmxvZyhjb250ZW50LmNvb2tpZSk7IC8vICd1bmRlZmluZWQnXG4gKiBgYGBcbiAqXG4gKiAtIFVzaW5nIEN1c3RvbSBFdmVudFxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBNb2RlbEV2ZW50IH0gZnJvbSAnQGNkcC9tb2RlbCc7XG4gKlxuICogaW50ZXJmYWNlIEN1c3RvbUV2ZW50IGV4dGVuZHMgTW9kZWxFdmVudDxDb250ZW50QXR0cmlidXRlPiB7XG4gKiAgIGZpcmU6IFtib29sZWFuLCBudW1iZXJdO1xuICogfVxuICogXG4gKiA6XG4gKlxuICogLy8gZWFybHkgY2FzdFxuICogY29uc3QgTW9kZSA9IE1vZGVsQmFzZSBhcyBNb2RlbENvbnN0cnVjdG9yPE1vZGVsQmFzZTxDb250ZW50QXR0cmlidXRlLCBDdXN0b21FdmVudD4sIENvbnRlbnRBdHRyaWJ1dGU+O1xuICpcbiAqIC8vIGxhdGUgY2FzdFxuICogY2xhc3MgQ29udGVudEJhc2UgZXh0ZW5kcyBNb2RlbEJhc2U8Q29udGVudEF0dHJpYnV0ZSwgQ3VzdG9tRXZlbnQ+IHtcbiAqICAgOlxuICogfVxuICpcbiAqIGNvbnN0IGNvbnRlbnQgPSBuZXcgQ29udGVudCh7IC4uLiB9KTtcbiAqIGNvbnRlbnQudHJpZ2dlcignZmlyZScsIHRydWUsIDEwMCk7XG4gKiBgYGBcbiAqL1xuYWJzdHJhY3QgY2xhc3MgTW9kZWw8VCBleHRlbmRzIHt9ID0ge30sIEV2ZW50IGV4dGVuZHMgTW9kZWxFdmVudDxUPiA9IE1vZGVsRXZlbnQ8VD4+IGV4dGVuZHMgRXZlbnRSZXZjZWl2ZXIgaW1wbGVtZW50cyBFdmVudFNvdXJjZTxFdmVudD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBBdHRyaWJ1dGVzIHBvb2xcbiAgICAgKiBAamEg5bGe5oCn5qC857SN6aCY5Z+fXG4gICAgICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdOiBQcm9wZXJ0eTxUPjtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgaW5pdGlhbCBhdHRyaWJ1dGUgdmFsdWVzXG4gICAgICogIC0gYGphYCDlsZ7mgKfjga7liJ3mnJ/lgKTjgpLmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhdHRyaWJ1dGVzOiBSZXF1aXJlZDxUPiwgb3B0aW9ucz86IE1vZGVsQ29uc3RydWN0aW9uT3B0aW9uczxUPikge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IGlkQXR0cmlidXRlOiAnaWQnIH0sIG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IHByb3BzOiBQcm9wZXJ0eTxUPiA9IHtcbiAgICAgICAgICAgIGF0dHJzOiBPYnNlcnZhYmxlT2JqZWN0LmZyb20oYXR0cmlidXRlcyksXG4gICAgICAgICAgICBiYXNlQXR0cnM6IHsgLi4uYXR0cmlidXRlcyB9LFxuICAgICAgICAgICAgcHJldkF0dHJzOiB7IC4uLmF0dHJpYnV0ZXMgfSxcbiAgICAgICAgICAgIGlkQXR0cmlidXRlOiBvcHRzLmlkQXR0cmlidXRlLFxuICAgICAgICAgICAgY2lkOiBsdWlkKCdtb2RlbDonLCA4KSxcbiAgICAgICAgfTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIF9wcm9wZXJ0aWVzLCB7IHZhbHVlOiBwcm9wcyB9KTtcblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhhdHRyaWJ1dGVzKSkge1xuICAgICAgICAgICAgdGhpc1tfZGVmaW5lQXR0cmlidXRlc10odGhpcywga2V5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXNbX2NoYW5nZUhhbmRsZXJdID0gKCkgPT4ge1xuICAgICAgICAgICAgKHRoaXMgYXMgYW55KS50cmlnZ2VyKCdAY2hhbmdlJywgdGhpcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpc1tfdmFsaWRhdGVdKHt9LCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGF0dHJpYnV0ZSBicmlkZ2UgZGVmICovXG4gICAgcHJpdmF0ZSBbX2RlZmluZUF0dHJpYnV0ZXNdKGluc3RhbmNlOiBhbnksIG5hbWU6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb25zdCBwcm90byA9IGluc3RhbmNlLmNvbnN0cnVjdG9yLnByb3RvdHlwZTtcbiAgICAgICAgaWYgKCEobmFtZSBpbiBwcm90bykpIHtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgbmFtZSwge1xuICAgICAgICAgICAgICAgIGdldCgpOiB1bmtub3duIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2F0dHJzW25hbWVdO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2V0KHZhbDogdW5rbm93bik6IHZvaWQge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWRlZXBFcXVhbCh0aGlzLl9hdHRyc1tuYW1lXSwgdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXNbX3Byb3BlcnRpZXNdLmNoYW5nZWRBdHRycztcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3ByZXZBdHRyc1tuYW1lXSA9IHRoaXMuX2F0dHJzW25hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fYXR0cnNbbmFtZV0gICAgID0gdmFsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IHB1YmxpYyBwcm9wZXJ0aWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNvbnRlbnQgSUQuXG4gICAgICogQGphIOOCs+ODs+ODhuODs+ODhCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgeyBpZEF0dHJpYnV0ZSwgY2lkLCBhdHRycyB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiAoaWRBdHRyaWJ1dGUgaW4gYXR0cnMpID8gYXR0cnNbaWRBdHRyaWJ1dGVdIDogY2lkO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBwcm90ZWN0ZWQgcHJvcGVydGllc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfYXR0cnMoKTogT2JzZXJ2YWJsZU9iamVjdCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5hdHRycztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVmYXVsdCBhdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOaXouWumuWApOWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2Jhc2VBdHRycygpOiBUIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmJhc2VBdHRycztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUHJldmlvdXMgYXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDlpInmm7TliY3jga7lsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9wcmV2QXR0cnMoKTogVCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5wcmV2QXR0cnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoYW5nZWQgYXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDlpInmm7Tjga7jgYLjgaPjgZ/lsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9jaGFuZ2VkQXR0cnMoKTogUGFydGlhbDxUPiB7XG4gICAgICAgIGlmIChudWxsID09IHRoaXNbX3Byb3BlcnRpZXNdLmNoYW5nZWRBdHRycykge1xuICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uY2hhbmdlZEF0dHJzID0gZGlmZih0aGlzLl9iYXNlQXR0cnMsIHRoaXMuX2F0dHJzIGFzIGFueSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNoYW5nZWRBdHRycyBhcyBQYXJ0aWFsPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgaW50ZXJuYWwgY29udGVudCBJRC5cbiAgICAgKiBAamEg5YaF6YOo44Gu44Kz44Oz44OG44Oz44OEIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2NpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY2lkO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IGV2ZW50c1xuXG4gICAgLyoqIEBpbnRlcm5hbCBicm9rZXIgYWNjZXNzICovXG4gICAgcHJpdmF0ZSBnZXQgW19icm9rZXJdKCk6IEV2ZW50QnJva2VyPGFueT4ge1xuICAgICAgICByZXR1cm4gKHRoaXMuX2F0dHJzIGFzIElPYnNlcnZhYmxlIGFzIElPYnNlcnZhYmxlRXZlbnRCcm9rZXJBY2Nlc3MpLmdldEJyb2tlcigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIHRoaXMgb2JqZWN0IGhhcyBjbGllbnRzLlxuICAgICAqIEBqYSDjgq/jg6njgqTjgqLjg7Pjg4jjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIGhhc0xpc3RlbmVyPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbD86IENoYW5uZWwsIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2Jyb2tlcl0uaGFzTGlzdGVuZXIoY2hhbm5lbCwgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHJlZ2lzdGVyZWQgY2hhbm5lbCBrZXlzLlxuICAgICAqIEBqYSDnmbvpjLLjgZXjgozjgabjgYTjgovjg4Hjg6Pjg43jg6vjgq3jg7zjgpLov5TljbRcbiAgICAgKi9cbiAgICBjaGFubmVscygpOiAoa2V5b2YgRXZlbnQpW10ge1xuICAgICAgICByZXR1cm4gdGhpc1tfYnJva2VyXS5jaGFubmVscygpIGFzIChrZXlvZiBFdmVudClbXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTm90aWZ5IGV2ZW50IHRvIGNsaWVudHMuXG4gICAgICogQGphIGV2ZW50IOeZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGFyZ3VtZW50cyBmb3IgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsOOBq+a4oeOBmeW8leaVsFxuICAgICAqL1xuICAgIHB1YmxpYyB0cmlnZ2VyPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCwgLi4uYXJnczogQXJndW1lbnRzPFBhcnRpYWw8RXZlbnRbQ2hhbm5lbF0+Pik6IHZvaWQge1xuICAgICAgICAodGhpc1tfYnJva2VyXSBhcyBhbnkpLnRyaWdnZXIoY2hhbm5lbCwgLi4uYXJncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGV2ZXJ5dGhpbmcgaXMgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuino+mZpFxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WQjOS4gCBgY2hhbm5lbGAg44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgcHVibGljIG9mZjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw/OiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2F0dHJzLm9mZihjaGFubmVsIGFzIGFueSwgbGlzdGVuZXIgYXMgYW55KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgb248Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBpZiAoJ0BjaGFuZ2UnID09PSBjaGFubmVsKSB7XG4gICAgICAgICAgICB0aGlzLl9hdHRycy5vbignKicsIHRoaXNbX2NoYW5nZUhhbmRsZXJdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fYXR0cnMub24oY2hhbm5lbCBhcyBhbnksIGxpc3RlbmVyIGFzIGFueSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKSBidXQgaXQgY2F1c2VzIHRoZSBib3VuZCBjYWxsYmFjayB0byBvbmx5IGZpcmUgb25jZSBiZWZvcmUgYmVpbmcgcmVtb3ZlZC5cbiAgICAgKiBAamEg5LiA5bqm44Gg44GR44OP44Oz44OJ44Oq44Oz44Kw5Y+v6IO944Gq44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIG9uY2U8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5vbihjaGFubmVsLCBsaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IG1hbmFnZWQgPSB0aGlzLm9uKGNoYW5uZWwsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnRleHQudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIG1hbmFnZWQudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjb250ZXh0O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IHZhbGlkYXRpb25cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB2YWxpZCBvciBub3QuXG4gICAgICogQGphIOaknOiovOOBruaIkOWQpuOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpc1ZhbGlkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gU1VDQ0VFREVEKHRoaXMudmFsaWRhdGUoeyBzaWxlbnQ6IHRydWUgfSkuY29kZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFZhbGlkYXRlIHJlc3VsdCBhY2Nlc3Nlci5cbiAgICAgKiBAamEg5qSc6Ki857WQ5p6c44Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcHVibGljIHZhbGlkYXRlKG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFJlc3VsdCB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgdmFsaWRhdGU6IHRydWUsIG5vVGhyb3c6IHRydWUsIGV4dGVuZDogZmFsc2UgfSwgb3B0aW9ucyk7XG4gICAgICAgIHJldHVybiB0aGlzW192YWxpZGF0ZV0oe30sIG9wdHMpO1xuICAgIH1cblxuICAgIC8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyAqL1xuXG4gICAgLyoqXG4gICAgICogQGVuIFZhbGlkYXRlIGRhdGEgbWV0aG9kLlxuICAgICAqIEBqYSDjg4fjg7zjgr/mpJzoqLxcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIHZhbGlkYXRlZSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGphYCDooqvmpJzoqLzlsZ7mgKdcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgdmFsaWRhdGUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5qSc6Ki844Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHZhbGlkYXRlQXR0cmlidXRlczxBIGV4dGVuZHMgVD4oYXR0cmlidXRlczogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPiwgb3B0aW9ucz86IE1vZGVsVmFsaWRhdGVBdHRyaWJ1dGVPcHRpb25zKTogUmVzdWx0IHtcbiAgICAgICAgcmV0dXJuIFJFU1VMVF9WQUxJRF9BVFRSUztcbiAgICB9XG5cbiAgICAvKiBlc2xpbnQtZW5hYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyAqL1xuXG4gICAgLyoqIEBpbnRlcm5hbCB2YWxpZGF0ZSAqL1xuICAgIHByaXZhdGUgW192YWxpZGF0ZV08QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4sIG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiBSZXN1bHQgfCBuZXZlciB7XG4gICAgICAgIGNvbnN0IHsgdmFsaWRhdGUsIHNpbGVudCwgbm9UaHJvdyB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgaWYgKHZhbGlkYXRlKSB7XG4gICAgICAgICAgICBjb25zdCBhdHRycyA9IHsgLi4udGhpcy5fYXR0cnMsIC4uLmF0dHJpYnV0ZXMgfTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMudmFsaWRhdGVBdHRyaWJ1dGVzKGF0dHJzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChGQUlMRUQocmVzdWx0LmNvZGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgYW55KS50cmlnZ2VyKCdAaW52YWxpZCcsIHRoaXMsIGF0dHJzLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIW5vVGhyb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUkVTVUxUX1ZBTElEX0FUVFJTO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogYXR0cmlidXRlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBbW01vZGVsXV0gaGFzIHZhbGlkIHByb3BlcnR5LiAobm90IGBudWxsYCBvciBgdW5kZWZpbmVkYClcbiAgICAgKiBAamEgW1tNb2RlbF1dIOOBjOacieWKueOBquODl+ODreODkeODhuOCo+OCkuaMgeOBo+OBpuOBhOOCi+OBi+eiuuiqjSAoYG51bGxgIOOBvuOBn+OBryBgdW5kZWZpbmVkYCDjgafjgarjgYQpXG4gICAgICovXG4gICAgcHVibGljIGhhcyhhdHRyaWJ1dGU6IGtleW9mIFQpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gKHRoaXMuX2F0dHJzIGFzIGFueSlbYXR0cmlidXRlXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBIVE1MLWVzY2FwZWQgdmFsdWUgb2YgYW4gYXR0cmlidXRlLlxuICAgICAqIEBqYSBIVE1MIOOBp+S9v+eUqOOBmeOCi+aWh+Wtl+OCkuWItuW+oeaWh+Wtl+OBq+e9ruaPm+OBl+OBn+WxnuaAp+WApOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBlc2NhcGUoYXR0cmlidXRlOiBrZXlvZiBUKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIGVzY2FwZUhUTUwoKHRoaXMuX2F0dHJzIGFzIGFueSlbYXR0cmlidXRlXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVwZGF0ZSBhdHRyaWJ1dGVzIGZvciBiYXRjaCBpbnB1dCB3aXRoIG9wdGlvbnMuXG4gICAgICogQGphIOWxnuaAp+OBruS4gOaLrOioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIHVwZGF0ZSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGphYCDmm7TmlrDlsZ7mgKdcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2V0IGF0dHJpYnV0ZXMgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5bGe5oCn5pu05paw55So44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldEF0dHJpYnV0ZXM8QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4sIG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBzaWxlbnQsIGV4dGVuZCB9ID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHNpbGVudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzLnN1c3BlbmQodHJ1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXNbX3ZhbGlkYXRlXShhdHRyaWJ1dGVzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChGQUlMRUQocmVzdWx0LmNvZGUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgYXR0ciBvZiBPYmplY3Qua2V5cyhhdHRyaWJ1dGVzKSkge1xuICAgICAgICAgICAgICAgIGlmIChhdHRyIGluIHRoaXMuX2F0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzW2F0dHJdID0gYXR0cmlidXRlc1thdHRyXTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGV4dGVuZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW19kZWZpbmVBdHRyaWJ1dGVzXSh0aGlzLCBhdHRyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYXR0cnNbYXR0cl0gPSBhdHRyaWJ1dGVzW2F0dHJdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGlmIChzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hdHRycy5yZXN1bWUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBhbGwgYXR0cmlidXRlcyBvbiB0aGUgW1tNb2RlbF1dLiAoc2V0IGB1bmRlZmluZWRgKVxuICAgICAqIEBqYSBbW01vZGVsXV0g44GL44KJ44GZ44G544Gm44Gu5bGe5oCn44KS5YmK6ZmkIChgdW5kZWZpbmVkYCDjgpLoqK3lrpopXG4gICAgICovXG4gICAgcHVibGljIGNsZWFyKG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgY2xlYXJBdHRycyA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgT2JqZWN0LmtleXModGhpcy5fYmFzZUF0dHJzKSkge1xuICAgICAgICAgICAgY2xlYXJBdHRyc1thdHRyXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5zZXRBdHRyaWJ1dGVzKGNsZWFyQXR0cnMsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBtb2RlbCdzIGBhdHRyaWJ1dGVzYCBvYmplY3QuXG4gICAgICogQGphIOODouODh+ODq+WxnuaAp+WApOOBruOCs+ODlOODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyB0b0pTT04oKTogVCB7XG4gICAgICAgIHJldHVybiBkZWVwQ29weSh7IC4uLnRoaXMuX2F0dHJzIH0gYXMgVCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGNoYW5nZWQgYXR0cmlidXRlcy5cbiAgICAgKiBAamEg5aSJ5pu044GV44KM44Gf5bGe5oCn5YCk44KS5oyB44Gk44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlXG4gICAgICogIC0gYGVuYCBjaGVja2VkIGF0dHJpYnV0ZVxuICAgICAqICAtIGBqYWAg5qSc6Ki844GZ44KL5bGe5oCnXG4gICAgICovXG4gICAgcHVibGljIGhhc0NoYW5nZWQoYXR0cmlidXRlPzoga2V5b2YgVCk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAobnVsbCA9PSBhdHRyaWJ1dGUpIHtcbiAgICAgICAgICAgIHJldHVybiAhaXNFbXB0eU9iamVjdCh0aGlzLl9jaGFuZ2VkQXR0cnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGF0dHJpYnV0ZSBpbiB0aGlzLl9jaGFuZ2VkQXR0cnM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGFuIG9iamVjdCBjb250YWluaW5nIGFsbCB0aGUgYXR0cmlidXRlcyB0aGF0IGhhdmUgY2hhbmdlZCwgb3IgYHVuZGVmaW5lZGAgaWYgdGhlcmUgYXJlIG5vIGNoYW5nZWQgYXR0cmlidXRlcy5cbiAgICAgKiBAamEg5YWl5Yqb44GX44GfIGF0dHJpYnV0ZXMg5YCk44Gu5beu5YiG44Gr5a++44GX44Gm5aSJ5pu044GM44GC44KL5bGe5oCn5YCk44KS6L+U5Y20LiDlt67liIbjgYzjgarjgYTloLTlkIjjga8gYHVuZGVmaWVuZGAg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgY2hlY2tlZCBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGphYCDmpJzoqLzjgZnjgovlsZ7mgKdcbiAgICAgKi9cbiAgICBwdWJsaWMgY2hhbmdlZChhdHRyaWJ1dGVzPzogUGFydGlhbDxUPik6IFBhcnRpYWw8VD4gfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAoIWF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhhc0NoYW5nZWQoKSA/IHsgLi4udGhpcy5fY2hhbmdlZEF0dHJzIH0gOiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBjaGFuZ2VkID0gZGlmZih0aGlzLl9hdHRycyBhcyBhbnksIGF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgcmV0dXJuICFpc0VtcHR5T2JqZWN0KGNoYW5nZWQpID8gY2hhbmdlZCA6IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHByZXZpb3VzIHZhbHVlIG9mIGFuIGF0dHJpYnV0ZSwgcmVjb3JkZWQgYXQgdGhlIHRpbWUgdGhlIGxhc3QgYEBjaGFuZ2VgIGV2ZW50IHdhcyBmaXJlZC5cbiAgICAgKiBAamEgYEBjaGFuZ2VgIOOBjOeZuueBq+OBleOCjOOBn+WJjeOBruWxnuaAp+WApOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2aW91czxLIGV4dGVuZHMga2V5b2YgVD4oYXR0cmlidXRlOiBLKTogVFtLXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wcmV2QXR0cnNbYXR0cmlidXRlXTtcbiAgICB9XG59XG5cbmV4cG9ydCB7IE1vZGVsIGFzIE1vZGVsQmFzZSB9O1xuXG4vKlxuIFBST0dSRVNTOlxuXG7il48gRXZlbnRzXG7imIYgb25cbuKYhiBvZmZcbuKYhiB0cmlnZ2VyXG7imIYgb25jZVxu4piGIGxpc3RlblRvXG7imIYgc3RvcExpc3RlbmluZ1xu4piGIGxpc3RlblRvT25jZVxuXG7il48gTW9kZWxcbuKYhiBleHRlbmRcbuKYhiBwcmVpbml0aWFsaXplXG7imIYgY29uc3RydWN0b3IgLyBpbml0aWFsaXplXG7imIYgZ2V0XG7imIYgc2V0XG7imIYgZXNjYXBlXG7imIYgaGFzXG7ilrMgdW5zZXRcbuKYhiBjbGVhclxu4piGIGlkXG7imIYgaWRBdHRyaWJ1dGVcbuKYhiBjaWRcbuKWsyBhdHRyaWJ1dGVzXG7ilrMgY2hhbmdlZFxu4pazIGRlZmF1bHRzXG7imIYgdG9KU09OXG7imIUgc3luY1xu4piFIGZldGNoXG7imIUgc2F2ZVxu4piFIGRlc3Ryb3lcblxu4pePIFVuZGVyc2NvcmVcbuKYhiB2YWxpZGF0ZVxu4pazIHZhbGlkYXRpb25FcnJvclxu4piGIGlzVmFsaWRcbuKYhSB1cmxcbuKYhSB1cmxSb290XG7imIUgcGFyc2VcbuKYhSBjbG9uZVxu4piFIGlzTmV3XG7imIYgaGFzQ2hhbmdlZFxu4piGIGNoYW5nZWRBdHRyaWJ1dGVzXG7imIYgcHJldmlvdXNcbuKWsyBwcmV2aW91c0F0dHJpYnV0ZXNcbiAqL1xuIl0sIm5hbWVzIjpbIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSIsIkV2ZW50UmV2Y2VpdmVyIiwiT2JzZXJ2YWJsZU9iamVjdCIsImx1aWQiLCJkZWVwRXF1YWwiLCJkaWZmIiwiU1VDQ0VFREVEIiwicmVzdWx0IiwiRkFJTEVEIiwiZXNjYXBlSFRNTCIsImRlZXBDb3B5IiwiaXNFbXB0eU9iamVjdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTtJQUVBLGdEQWFDO0lBYkQ7Ozs7O1FBVUk7UUFBQTtZQUNJLG9EQUF5QixZQUFBLGtCQUFrQixnQkFBdUIsaUJBQXdCLENBQUMsRUFBRSxlQUFlLENBQUMsNEJBQUEsQ0FBQTtTQUNoSCxJQUFBO0lBQ0wsQ0FBQyxJQUFBOztJQ2ZEO0FBRUEsSUFvQ0EsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDM0MsTUFBTSxTQUFTLEdBQVcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzdDLE1BQU0sY0FBYyxHQUFNLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM3QyxNQUFNLE9BQU8sR0FBYSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDM0MsTUFBTSxXQUFXLEdBQVMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBWS9DOzs7O0FBSUEsVUFBYSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDQSxpQkFBVSxDQUFDQyxrQkFBVyxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7SUFFckc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQThFQSxNQUFlLEtBQXNFLFNBQVFDLHFCQUFjOzs7Ozs7OztRQWN2RyxZQUFZLFVBQXVCLEVBQUUsT0FBcUM7WUFDdEUsS0FBSyxFQUFFLENBQUM7WUFDUixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRTNELE1BQU0sS0FBSyxHQUFnQjtnQkFDdkIsS0FBSyxFQUFFQywyQkFBZ0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO2dCQUN4QyxTQUFTLEVBQUUsRUFBRSxHQUFHLFVBQVUsRUFBRTtnQkFDNUIsU0FBUyxFQUFFLEVBQUUsR0FBRyxVQUFVLEVBQUU7Z0JBQzVCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztnQkFDN0IsR0FBRyxFQUFFQyxjQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQzthQUN6QixDQUFDO1lBQ0YsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFFM0QsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUN2QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDdEM7WUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUc7Z0JBQ2xCLElBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQzFDLENBQUM7WUFFRixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQzdCOztRQUdPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxRQUFhLEVBQUUsSUFBWTtZQUNuRCxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQztZQUM3QyxJQUFJLEVBQUUsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFO2dCQUNsQixNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUU7b0JBQy9CLEdBQUc7d0JBQ0MsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUM1QjtvQkFDRCxHQUFHLENBQUMsR0FBWTt3QkFDWixJQUFJLENBQUNDLG1CQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRTs0QkFDcEMsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsWUFBWSxDQUFDOzRCQUN0QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBQzFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQU8sR0FBRyxDQUFDO3lCQUMvQjtxQkFDSjtvQkFDRCxVQUFVLEVBQUUsSUFBSTtvQkFDaEIsWUFBWSxFQUFFLElBQUk7aUJBQ3JCLENBQUMsQ0FBQzthQUNOO1NBQ0o7Ozs7Ozs7UUFTRCxJQUFJLEVBQUU7WUFDRixNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdEQsT0FBTyxDQUFDLFdBQVcsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztTQUM1RDs7Ozs7OztRQVNELElBQWMsTUFBTTtZQUNoQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLENBQUM7U0FDbEM7Ozs7O1FBTUQsSUFBYyxVQUFVO1lBQ3BCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsQ0FBQztTQUN0Qzs7Ozs7UUFNRCxJQUFjLFVBQVU7WUFDcEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsU0FBUyxDQUFDO1NBQ3RDOzs7OztRQU1ELElBQWMsYUFBYTtZQUN2QixJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsWUFBWSxFQUFFO2dCQUN4QyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsWUFBWSxHQUFHQyxjQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBYSxDQUFDLENBQUM7YUFDOUU7WUFDRCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxZQUEwQixDQUFDO1NBQ3ZEOzs7OztRQU1ELElBQWMsSUFBSTtZQUNkLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztTQUNoQzs7OztRQU1ELEtBQWEsT0FBTyxDQUFDO1lBQ2pCLE9BQVEsSUFBSSxDQUFDLE1BQXNELENBQUMsU0FBUyxFQUFFLENBQUM7U0FDbkY7Ozs7Ozs7Ozs7OztRQWFELFdBQVcsQ0FBOEIsT0FBaUIsRUFBRSxRQUEwRDtZQUNsSCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ3ZEOzs7OztRQU1ELFFBQVE7WUFDSixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQXFCLENBQUM7U0FDdEQ7Ozs7Ozs7Ozs7OztRQWFNLE9BQU8sQ0FBOEIsT0FBZ0IsRUFBRSxHQUFHLElBQXdDO1lBQ3BHLElBQUksQ0FBQyxPQUFPLENBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7U0FDcEQ7Ozs7Ozs7Ozs7Ozs7Ozs7UUFpQk0sR0FBRyxDQUE4QixPQUE2QixFQUFFLFFBQTBEO1lBQzdILElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQWMsRUFBRSxRQUFlLENBQUMsQ0FBQztTQUNwRDs7Ozs7Ozs7Ozs7O1FBYU0sRUFBRSxDQUE4QixPQUE0QixFQUFFLFFBQXlEO1lBQzFILElBQUksU0FBUyxLQUFLLE9BQU8sRUFBRTtnQkFDdkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO2FBQzdDO1lBQ0QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFjLEVBQUUsUUFBZSxDQUFDLENBQUM7U0FDMUQ7Ozs7Ozs7Ozs7OztRQWFNLElBQUksQ0FBOEIsT0FBNEIsRUFBRSxRQUF5RDtZQUM1SCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztZQUMzQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRTtnQkFDN0IsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN0QixPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7YUFDekIsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxPQUFPLENBQUM7U0FDbEI7Ozs7Ozs7UUFTRCxJQUFJLE9BQU87WUFDUCxPQUFPQyxnQkFBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMxRDs7Ozs7UUFNTSxRQUFRLENBQUMsT0FBcUI7WUFDakMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDdEYsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ3BDOzs7Ozs7Ozs7Ozs7Ozs7UUFpQlMsa0JBQWtCLENBQWMsVUFBa0MsRUFBRSxPQUF1QztZQUNqSCxPQUFPLGtCQUFrQixDQUFDO1NBQzdCOzs7UUFLTyxDQUFDLFNBQVMsQ0FBQyxDQUFjLFVBQWtDLEVBQUUsT0FBeUI7WUFDMUYsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsT0FBTyxJQUFJLEVBQUUsQ0FBQztZQUNwRCxJQUFJLFFBQVEsRUFBRTtnQkFDVixNQUFNLEtBQUssR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLFVBQVUsRUFBRSxDQUFDO2dCQUNoRCxNQUFNQyxRQUFNLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDdkQsSUFBSUMsYUFBTSxDQUFDRCxRQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ3JCLElBQUksQ0FBQyxNQUFNLEVBQUU7d0JBQ1IsSUFBWSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRUEsUUFBTSxDQUFDLENBQUM7cUJBQzFEO29CQUNELElBQUksQ0FBQyxPQUFPLEVBQUU7d0JBQ1YsTUFBTUEsUUFBTSxDQUFDO3FCQUNoQjtpQkFDSjtnQkFDRCxPQUFPQSxRQUFNLENBQUM7YUFDakI7aUJBQU07Z0JBQ0gsT0FBTyxrQkFBa0IsQ0FBQzthQUM3QjtTQUNKOzs7Ozs7O1FBU00sR0FBRyxDQUFDLFNBQWtCO1lBQ3pCLE9BQU8sSUFBSSxJQUFLLElBQUksQ0FBQyxNQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDbEQ7Ozs7O1FBTU0sTUFBTSxDQUFDLFNBQWtCO1lBQzVCLE9BQU9FLG9CQUFVLENBQUUsSUFBSSxDQUFDLE1BQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1NBQ3REOzs7Ozs7Ozs7Ozs7UUFhTSxhQUFhLENBQWMsVUFBa0MsRUFBRSxPQUF5QjtZQUMzRixNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7WUFFekMsSUFBSTtnQkFDQSxJQUFJLE1BQU0sRUFBRTtvQkFDUixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDN0I7Z0JBRUQsTUFBTUYsUUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ3BELElBQUlDLGFBQU0sQ0FBQ0QsUUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUNyQixPQUFPLElBQUksQ0FBQztpQkFDZjtnQkFFRCxLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQ3hDLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7d0JBQ3JCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUN4Qzt5QkFBTSxJQUFJLE1BQU0sRUFBRTt3QkFDZixJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ3BDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUN4QztpQkFDSjthQUNKO29CQUFTO2dCQUNOLElBQUksTUFBTSxFQUFFO29CQUNSLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7aUJBQ3hCO2FBQ0o7WUFFRCxPQUFPLElBQUksQ0FBQztTQUNmOzs7OztRQU1NLEtBQUssQ0FBQyxPQUF5QjtZQUNsQyxNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUM7WUFDdEIsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDN0MsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQzthQUNoQztZQUNELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDbEQ7Ozs7O1FBTU0sTUFBTTtZQUNULE9BQU9HLGtCQUFRLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQU8sQ0FBQyxDQUFDO1NBQzVDOzs7Ozs7Ozs7UUFVTSxVQUFVLENBQUMsU0FBbUI7WUFDakMsSUFBSSxJQUFJLElBQUksU0FBUyxFQUFFO2dCQUNuQixPQUFPLENBQUNDLHVCQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2FBQzdDO2lCQUFNO2dCQUNILE9BQU8sU0FBUyxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUM7YUFDMUM7U0FDSjs7Ozs7Ozs7O1FBVU0sT0FBTyxDQUFDLFVBQXVCO1lBQ2xDLElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ2IsT0FBTyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxTQUFTLENBQUM7YUFDcEU7aUJBQU07Z0JBQ0gsTUFBTSxPQUFPLEdBQUdOLGNBQUksQ0FBQyxJQUFJLENBQUMsTUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUNyRCxPQUFPLENBQUNNLHVCQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsT0FBTyxHQUFHLFNBQVMsQ0FBQzthQUN4RDtTQUNKOzs7OztRQU1NLFFBQVEsQ0FBb0IsU0FBWTtZQUMzQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDckM7S0FDSjtBQUVELElBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09BK0NHOzs7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9tb2RlbC8ifQ==
