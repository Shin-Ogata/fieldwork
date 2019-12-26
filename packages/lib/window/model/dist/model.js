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
            RESULT_CODE[RESULT_CODE["MVC_MODEL_DECLARE"] = 9007199254740991] = "MVC_MODEL_DECLARE";
            RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_DATA"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 45 /* MODEL */ + 1, 'invalid data.')] = "ERROR_MVC_INVALID_DATA";
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwuanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJiYXNlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycywgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXBsdXMtb3BlcmFuZHMgKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgTU9ERUwgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyA1LFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8temAmuOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX01PREVMX0RFQ0xBUkUgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfREFUQSA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLk1PREVMICsgMSwgJ2ludmFsaWQgZGF0YS4nKSxcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7XG4gICAgQXJndW1lbnRzLFxuICAgIGlzRW1wdHlPYmplY3QsXG4gICAgbHVpZCxcbiAgICBlc2NhcGVIVE1MLFxuICAgIGRlZXBDb3B5LFxuICAgIGRlZXBFcXVhbCxcbiAgICBkaWZmLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBTdWJzY3JpcHRpb24sXG4gICAgU2lsZW5jZWFibGUsXG4gICAgRXZlbnRCcm9rZXIsXG4gICAgRXZlbnRSZXZjZWl2ZXIsXG4gICAgRXZlbnRTb3VyY2UsXG59IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgSU9ic2VydmFibGUsXG4gICAgSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2VzcyxcbiAgICBPYnNlcnZhYmxlT2JqZWN0LFxufSBmcm9tICdAY2RwL29ic2VydmFibGUnO1xuaW1wb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBSZXN1bHQsXG4gICAgbWFrZVJlc3VsdCxcbiAgICBTVUNDRUVERUQsXG4gICAgRkFJTEVELFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIE1vZGVsRXZlbnQsXG4gICAgTW9kZWxWYWxpZGF0ZUF0dHJpYnV0ZU9wdGlvbnMsXG4gICAgTW9kZWxBdHRyaWJ1dGVJbnB1dCxcbiAgICBNb2RlbFNldE9wdGlvbnMsXG4gICAgTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG5jb25zdCBfZGVmaW5lQXR0cmlidXRlcyA9IFN5bWJvbCgnZGVmaW5lJyk7XG5jb25zdCBfdmFsaWRhdGUgICAgICAgICA9IFN5bWJvbCgndmFsaWRhdGUnKTtcbmNvbnN0IF9jaGFuZ2VIYW5kbGVyICAgID0gU3ltYm9sKCdvbmNoYW5nZScpO1xuY29uc3QgX2Jyb2tlciAgICAgICAgICAgPSBTeW1ib2woJ2Jyb2tlcicpO1xuY29uc3QgX3Byb3BlcnRpZXMgICAgICAgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5PFQ+IHtcbiAgICBhdHRyczogT2JzZXJ2YWJsZU9iamVjdDtcbiAgICBiYXNlQXR0cnM6IFQ7XG4gICAgcHJldkF0dHJzOiBUO1xuICAgIGNoYW5nZWRBdHRycz86IFBhcnRpYWw8VD47XG4gICAgcmVhZG9ubHkgaWRBdHRyaWJ1dGU6IHN0cmluZztcbiAgICByZWFkb25seSBjaWQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAZW4gVmFsaWQgYXR0cmlidXRlcyByZXN1bHQuXG4gKiBAamEg5bGe5oCn5qSc6Ki844Gu5pyJ5Yq55YCkXG4gKi9cbmV4cG9ydCBjb25zdCBSRVNVTFRfVkFMSURfQVRUUlMgPSBPYmplY3QuZnJlZXplKG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuU1VDQ0VTUywgJ3ZhbGlkIGF0dHJpYnV0ZS4nKSk7XG5cbi8qKlxuICogQGVuIFtbTW9kZWxdXSBiYXNlIGNsYXNzIGRlZmluaXRpb24uXG4gKiBAamEgW1tNb2RlbF1dIOOBruWfuuW6leOCr+ODqeOCueWumue+qVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgTW9kZWxCYXNlLCBNb2RlbENvbnN0cnVjdG9yIH0gZnJvbSAnQGNkcC9tb2RlbCc7XG4gKlxuICogaW50ZXJmYWNlIENvbnRlbnRBdHRyaWJ1dGUge1xuICogICB1cmk6IHN0cmluZztcbiAqICAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyO1xuICogICBjb29raWU/OiBzdHJpbmc7XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiAtIEJhc2ljIFVzYWdlXG4gKlxuICogYGBgdHNcbiAqIC8vIGVhcmx5IGNhc3RcbiAqIGNvbnN0IE1vZGUgPSBNb2RlbEJhc2UgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbEJhc2U8Q29udGVudEF0dHJpYnV0ZT4sIENvbnRlbnRBdHRyaWJ1dGU+O1xuICpcbiAqIGNsYXNzIENvbnRlbnQgZXh0ZW5kcyBNb2RlbCB7XG4gKiAgIGNvbnN0cnVjdG9yKGF0dHJzOiBDb250ZW50QXR0cmlidXRlKSB7XG4gKiAgICAgc3VwZXIoYXR0cnMpO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBvclxuICpcbiAqIGBgYHRzXG4gKiBjbGFzcyBDb250ZW50QmFzZSBleHRlbmRzIE1vZGVsQmFzZTxDb250ZW50QXR0cmlidXRlPiB7XG4gKiAgIGNvbnN0cnVjdG9yKGF0dHJzOiBDb250ZW50QXR0cmlidXRlKSB7XG4gKiAgICAgc3VwZXIoYXR0cnMpO1xuICogICB9XG4gKiB9XG4gKlxuICogLy8gbGF0ZSBjYXN0XG4gKiBjb25zdCBDb250ZW50ID0gQ29udGVudEJhc2UgYXMgTW9kZWxDb25zdHJ1Y3RvcjxDb250ZW50LCBDb250ZW50QXR0cmlidXRlPjtcbiAqIGBgYFxuICogdGhlblxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBjb250ZW50ID0gbmV3IENvbnRlbnQoe1xuICogICB1cmk6ICdhYWEudHh0JyxcbiAqICAgc2l6ZTogMTAsXG4gKiAgIGNvb2tpZTogdW5kZWZpbmVkLCAvLyBuZWVkIGV4cGxpY2l0IGFzc2lnblxuICogfSk7XG4gKlxuICogY29uc29sZS5sb2coY29udGVudC51cmkpOyAgICAvLyAnYWFhLnR4dCdcbiAqIGNvbnNvbGUubG9nKGNvbnRlbnQuc2l6ZSk7ICAgLy8gJzEwJ1xuICogY29uc29sZS5sb2coY29udGVudC5jb29raWUpOyAvLyAndW5kZWZpbmVkJ1xuICogYGBgXG4gKlxuICogLSBVc2luZyBDdXN0b20gRXZlbnRcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgTW9kZWxFdmVudCB9IGZyb20gJ0BjZHAvbW9kZWwnO1xuICpcbiAqIGludGVyZmFjZSBDdXN0b21FdmVudCBleHRlbmRzIE1vZGVsRXZlbnQ8Q29udGVudEF0dHJpYnV0ZT4ge1xuICogICBmaXJlOiBbYm9vbGVhbiwgbnVtYmVyXTtcbiAqIH1cbiAqIFxuICogOlxuICpcbiAqIC8vIGVhcmx5IGNhc3RcbiAqIGNvbnN0IE1vZGUgPSBNb2RlbEJhc2UgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbEJhc2U8Q29udGVudEF0dHJpYnV0ZSwgQ3VzdG9tRXZlbnQ+LCBDb250ZW50QXR0cmlidXRlPjtcbiAqXG4gKiAvLyBsYXRlIGNhc3RcbiAqIGNsYXNzIENvbnRlbnRCYXNlIGV4dGVuZHMgTW9kZWxCYXNlPENvbnRlbnRBdHRyaWJ1dGUsIEN1c3RvbUV2ZW50PiB7XG4gKiAgIDpcbiAqIH1cbiAqXG4gKiBjb25zdCBjb250ZW50ID0gbmV3IENvbnRlbnQoeyAuLi4gfSk7XG4gKiBjb250ZW50LnRyaWdnZXIoJ2ZpcmUnLCB0cnVlLCAxMDApO1xuICogYGBgXG4gKi9cbmFic3RyYWN0IGNsYXNzIE1vZGVsPFQgZXh0ZW5kcyB7fSA9IHt9LCBFdmVudCBleHRlbmRzIE1vZGVsRXZlbnQ8VD4gPSBNb2RlbEV2ZW50PFQ+PiBleHRlbmRzIEV2ZW50UmV2Y2VpdmVyIGltcGxlbWVudHMgRXZlbnRTb3VyY2U8RXZlbnQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gQXR0cmlidXRlcyBwb29sXG4gICAgICogQGphIOWxnuaAp+agvOe0jemgmOWfn1xuICAgICAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXTogUHJvcGVydHk8VD47XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgYXR0cmlidXRlIHZhbHVlc1xuICAgICAqICAtIGBqYWAg5bGe5oCn44Gu5Yid5pyf5YCk44KS5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlczogUmVxdWlyZWQ8VD4sIG9wdGlvbnM/OiBNb2RlbENvbnN0cnVjdGlvbk9wdGlvbnM8VD4pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBpZEF0dHJpYnV0ZTogJ2lkJyB9LCBvcHRpb25zKTtcblxuICAgICAgICBjb25zdCBwcm9wczogUHJvcGVydHk8VD4gPSB7XG4gICAgICAgICAgICBhdHRyczogT2JzZXJ2YWJsZU9iamVjdC5mcm9tKGF0dHJpYnV0ZXMpLFxuICAgICAgICAgICAgYmFzZUF0dHJzOiB7IC4uLmF0dHJpYnV0ZXMgfSxcbiAgICAgICAgICAgIHByZXZBdHRyczogeyAuLi5hdHRyaWJ1dGVzIH0sXG4gICAgICAgICAgICBpZEF0dHJpYnV0ZTogb3B0cy5pZEF0dHJpYnV0ZSxcbiAgICAgICAgICAgIGNpZDogbHVpZCgnbW9kZWw6JywgOCksXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBfcHJvcGVydGllcywgeyB2YWx1ZTogcHJvcHMgfSk7XG5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoYXR0cmlidXRlcykpIHtcbiAgICAgICAgICAgIHRoaXNbX2RlZmluZUF0dHJpYnV0ZXNdKHRoaXMsIGtleSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzW19jaGFuZ2VIYW5kbGVyXSA9ICgpID0+IHtcbiAgICAgICAgICAgICh0aGlzIGFzIGFueSkudHJpZ2dlcignQGNoYW5nZScsIHRoaXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXNbX3ZhbGlkYXRlXSh7fSwgb3B0cyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBhdHRyaWJ1dGUgYnJpZGdlIGRlZiAqL1xuICAgIHByaXZhdGUgW19kZWZpbmVBdHRyaWJ1dGVzXShpbnN0YW5jZTogYW55LCBuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgcHJvdG8gPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG4gICAgICAgIGlmICghKG5hbWUgaW4gcHJvdG8pKSB7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sIG5hbWUsIHtcbiAgICAgICAgICAgICAgICBnZXQoKTogdW5rbm93biB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9hdHRyc1tuYW1lXTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldCh2YWw6IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFkZWVwRXF1YWwodGhpcy5fYXR0cnNbbmFtZV0sIHZhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnM7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcmV2QXR0cnNbbmFtZV0gPSB0aGlzLl9hdHRyc1tuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzW25hbWVdICAgICA9IHZhbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBwdWJsaWMgcHJvcGVydGllc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjb250ZW50IElELlxuICAgICAqIEBqYSDjgrPjg7Pjg4bjg7Pjg4QgSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IHsgaWRBdHRyaWJ1dGUsIGNpZCwgYXR0cnMgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gKGlkQXR0cmlidXRlIGluIGF0dHJzKSA/IGF0dHJzW2lkQXR0cmlidXRlXSA6IGNpZDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogcHJvdGVjdGVkIHByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2F0dHJzKCk6IE9ic2VydmFibGVPYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uYXR0cnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlZmF1bHQgYXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDml6LlrprlgKTlsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9iYXNlQXR0cnMoKTogVCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5iYXNlQXR0cnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFByZXZpb3VzIGF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5aSJ5pu05YmN44Gu5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcHJldkF0dHJzKCk6IFQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucHJldkF0dHJzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGFuZ2VkIGF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5aSJ5pu044Gu44GC44Gj44Gf5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY2hhbmdlZEF0dHJzKCk6IFBhcnRpYWw8VD4ge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnMpIHtcbiAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNoYW5nZWRBdHRycyA9IGRpZmYodGhpcy5fYmFzZUF0dHJzLCB0aGlzLl9hdHRycyBhcyBhbnkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnMgYXMgUGFydGlhbDxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGludGVybmFsIGNvbnRlbnQgSUQuXG4gICAgICogQGphIOWGhemDqOOBruOCs+ODs+ODhuODs+ODhCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9jaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNpZDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBldmVudHNcblxuICAgIC8qKiBAaW50ZXJuYWwgYnJva2VyIGFjY2VzcyAqL1xuICAgIHByaXZhdGUgZ2V0IFtfYnJva2VyXSgpOiBFdmVudEJyb2tlcjxhbnk+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzLl9hdHRycyBhcyBJT2JzZXJ2YWJsZSBhcyBJT2JzZXJ2YWJsZUV2ZW50QnJva2VyQWNjZXNzKS5nZXRCcm9rZXIoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgd2hldGhlciB0aGlzIG9iamVjdCBoYXMgY2xpZW50cy5cbiAgICAgKiBAamEg44Kv44Op44Kk44Ki44Oz44OI44GM5a2Y5Zyo44GZ44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBoYXNMaXN0ZW5lcjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw/OiBDaGFubmVsLCBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19icm9rZXJdLmhhc0xpc3RlbmVyKGNoYW5uZWwsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyByZWdpc3RlcmVkIGNoYW5uZWwga2V5cy5cbiAgICAgKiBAamEg55m76Yyy44GV44KM44Gm44GE44KL44OB44Oj44ON44Or44Kt44O844KS6L+U5Y20XG4gICAgICovXG4gICAgY2hhbm5lbHMoKTogKGtleW9mIEV2ZW50KVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2Jyb2tlcl0uY2hhbm5lbHMoKSBhcyAoa2V5b2YgRXZlbnQpW107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE5vdGlmeSBldmVudCB0byBjbGllbnRzLlxuICAgICAqIEBqYSBldmVudCDnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgavmuKHjgZnlvJXmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgdHJpZ2dlcjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwsIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj4pOiB2b2lkIHtcbiAgICAgICAgKHRoaXNbX2Jyb2tlcl0gYXMgYW55KS50cmlnZ2VyKGNoYW5uZWwsIC4uLmFyZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBldmVyeXRoaW5nIGlzIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/jgZnjgbnjgabop6PpmaRcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgYWxsIHNhbWUgYGNoYW5uZWxgIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lkIzkuIAgYGNoYW5uZWxgIOOBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIHB1YmxpYyBvZmY8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsPzogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IHZvaWQge1xuICAgICAgICB0aGlzLl9hdHRycy5vZmYoY2hhbm5lbCBhcyBhbnksIGxpc3RlbmVyIGFzIGFueSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIG9uPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgaWYgKCdAY2hhbmdlJyA9PT0gY2hhbm5lbCkge1xuICAgICAgICAgICAgdGhpcy5fYXR0cnMub24oJyonLCB0aGlzW19jaGFuZ2VIYW5kbGVyXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2F0dHJzLm9uKGNoYW5uZWwgYXMgYW55LCBsaXN0ZW5lciBhcyBhbnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykgYnV0IGl0IGNhdXNlcyB0aGUgYm91bmQgY2FsbGJhY2sgdG8gb25seSBmaXJlIG9uY2UgYmVmb3JlIGJlaW5nIHJlbW92ZWQuXG4gICAgICogQGphIOS4gOW6puOBoOOBkeODj+ODs+ODieODquODs+OCsOWPr+iDveOBquOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBvbmNlPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMub24oY2hhbm5lbCwgbGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBtYW5hZ2VkID0gdGhpcy5vbihjaGFubmVsLCAoKSA9PiB7XG4gICAgICAgICAgICBjb250ZXh0LnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICBtYW5hZ2VkLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiB2YWxpZGF0aW9uXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdmFsaWQgb3Igbm90LlxuICAgICAqIEBqYSDmpJzoqLzjga7miJDlkKbjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaXNWYWxpZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFNVQ0NFRURFRCh0aGlzLnZhbGlkYXRlKHsgc2lsZW50OiB0cnVlIH0pLmNvZGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBWYWxpZGF0ZSByZXN1bHQgYWNjZXNzZXIuXG4gICAgICogQGphIOaknOiovOe1kOaenOOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyB2YWxpZGF0ZShvcHRpb25zPzogU2lsZW5jZWFibGUpOiBSZXN1bHQge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHZhbGlkYXRlOiB0cnVlLCBub1Rocm93OiB0cnVlLCBleHRlbmQ6IGZhbHNlIH0sIG9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gdGhpc1tfdmFsaWRhdGVdKHt9LCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuICAgIC8qKlxuICAgICAqIEBlbiBWYWxpZGF0ZSBkYXRhIG1ldGhvZC5cbiAgICAgKiBAamEg44OH44O844K/5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCB2YWxpZGF0ZWUgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg6KKr5qSc6Ki85bGe5oCnXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHZhbGlkYXRlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOaknOiovOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHByb3RlY3RlZCB2YWxpZGF0ZUF0dHJpYnV0ZXM8QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4sIG9wdGlvbnM/OiBNb2RlbFZhbGlkYXRlQXR0cmlidXRlT3B0aW9ucyk6IFJlc3VsdCB7XG4gICAgICAgIHJldHVybiBSRVNVTFRfVkFMSURfQVRUUlM7XG4gICAgfVxuXG4gICAgLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuICAgIC8qKiBAaW50ZXJuYWwgdmFsaWRhdGUgKi9cbiAgICBwcml2YXRlIFtfdmFsaWRhdGVdPEEgZXh0ZW5kcyBUPihhdHRyaWJ1dGVzOiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+LCBvcHRpb25zPzogTW9kZWxTZXRPcHRpb25zKTogUmVzdWx0IHwgbmV2ZXIge1xuICAgICAgICBjb25zdCB7IHZhbGlkYXRlLCBzaWxlbnQsIG5vVGhyb3cgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGlmICh2YWxpZGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgYXR0cnMgPSB7IC4uLnRoaXMuX2F0dHJzLCAuLi5hdHRyaWJ1dGVzIH07XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnZhbGlkYXRlQXR0cmlidXRlcyhhdHRycywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoRkFJTEVEKHJlc3VsdC5jb2RlKSkge1xuICAgICAgICAgICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIGFueSkudHJpZ2dlcignQGludmFsaWQnLCB0aGlzLCBhdHRycywgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFub1Rocm93KSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFJFU1VMVF9WQUxJRF9BVFRSUztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IGF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgW1tNb2RlbF1dIGhhcyB2YWxpZCBwcm9wZXJ0eS4gKG5vdCBgbnVsbGAgb3IgYHVuZGVmaW5lZGApXG4gICAgICogQGphIFtbTW9kZWxdXSDjgYzmnInlirnjgarjg5fjg63jg5Hjg4bjgqPjgpLmjIHjgaPjgabjgYTjgovjgYvnorroqo0gKGBudWxsYCDjgb7jgZ/jga8gYHVuZGVmaW5lZGAg44Gn44Gq44GEKVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXMoYXR0cmlidXRlOiBrZXlvZiBUKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9ICh0aGlzLl9hdHRycyBhcyBhbnkpW2F0dHJpYnV0ZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgSFRNTC1lc2NhcGVkIHZhbHVlIG9mIGFuIGF0dHJpYnV0ZS5cbiAgICAgKiBAamEgSFRNTCDjgafkvb/nlKjjgZnjgovmloflrZfjgpLliLblvqHmloflrZfjgavnva7mj5vjgZfjgZ/lsZ7mgKflgKTjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZXNjYXBlKGF0dHJpYnV0ZToga2V5b2YgVCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBlc2NhcGVIVE1MKCh0aGlzLl9hdHRycyBhcyBhbnkpW2F0dHJpYnV0ZV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVcGRhdGUgYXR0cmlidXRlcyBmb3IgYmF0Y2ggaW5wdXQgd2l0aCBvcHRpb25zLlxuICAgICAqIEBqYSDlsZ7mgKfjga7kuIDmi6zoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCB1cGRhdGUgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg5pu05paw5bGe5oCnXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBhdHRyaWJ1dGVzIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOWxnuaAp+abtOaWsOeUqOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXRBdHRyaWJ1dGVzPEEgZXh0ZW5kcyBUPihhdHRyaWJ1dGVzOiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+LCBvcHRpb25zPzogTW9kZWxTZXRPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgc2lsZW50LCBleHRlbmQgfSA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hdHRycy5zdXNwZW5kKHRydWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzW192YWxpZGF0ZV0oYXR0cmlidXRlcywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoRkFJTEVEKHJlc3VsdC5jb2RlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgT2JqZWN0LmtleXMoYXR0cmlidXRlcykpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXR0ciBpbiB0aGlzLl9hdHRycykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9hdHRyc1thdHRyXSA9IGF0dHJpYnV0ZXNbYXR0cl07XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChleHRlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfZGVmaW5lQXR0cmlidXRlc10odGhpcywgYXR0cik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzW2F0dHJdID0gYXR0cmlidXRlc1thdHRyXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBpZiAoc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYXR0cnMucmVzdW1lKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgYWxsIGF0dHJpYnV0ZXMgb24gdGhlIFtbTW9kZWxdXS4gKHNldCBgdW5kZWZpbmVkYClcbiAgICAgKiBAamEgW1tNb2RlbF1dIOOBi+OCieOBmeOBueOBpuOBruWxnuaAp+OCkuWJiumZpCAoYHVuZGVmaW5lZGAg44KS6Kit5a6aKVxuICAgICAqL1xuICAgIHB1YmxpYyBjbGVhcihvcHRpb25zPzogTW9kZWxTZXRPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGNsZWFyQXR0cnMgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIE9iamVjdC5rZXlzKHRoaXMuX2Jhc2VBdHRycykpIHtcbiAgICAgICAgICAgIGNsZWFyQXR0cnNbYXR0cl0gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0QXR0cmlidXRlcyhjbGVhckF0dHJzLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGEgY29weSBvZiB0aGUgbW9kZWwncyBgYXR0cmlidXRlc2Agb2JqZWN0LlxuICAgICAqIEBqYSDjg6Ljg4fjg6vlsZ7mgKflgKTjga7jgrPjg5Tjg7zjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgdG9KU09OKCk6IFQge1xuICAgICAgICByZXR1cm4gZGVlcENvcHkoeyAuLi50aGlzLl9hdHRycyB9IGFzIFQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBjaGFuZ2VkIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIOWkieabtOOBleOCjOOBn+WxnuaAp+WApOOCkuaMgeOBpOOBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZVxuICAgICAqICAtIGBlbmAgY2hlY2tlZCBhdHRyaWJ1dGVcbiAgICAgKiAgLSBgamFgIOaknOiovOOBmeOCi+WxnuaAp1xuICAgICAqL1xuICAgIHB1YmxpYyBoYXNDaGFuZ2VkKGF0dHJpYnV0ZT86IGtleW9mIFQpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0gYXR0cmlidXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gIWlzRW1wdHlPYmplY3QodGhpcy5fY2hhbmdlZEF0dHJzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBhdHRyaWJ1dGUgaW4gdGhpcy5fY2hhbmdlZEF0dHJzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBhbiBvYmplY3QgY29udGFpbmluZyBhbGwgdGhlIGF0dHJpYnV0ZXMgdGhhdCBoYXZlIGNoYW5nZWQsIG9yIGB1bmRlZmluZWRgIGlmIHRoZXJlIGFyZSBubyBjaGFuZ2VkIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIOWFpeWKm+OBl+OBnyBhdHRyaWJ1dGVzIOWApOOBruW3ruWIhuOBq+WvvuOBl+OBpuWkieabtOOBjOOBguOCi+WxnuaAp+WApOOCkui/lOWNtC4g5beu5YiG44GM44Gq44GE5aC05ZCI44GvIGB1bmRlZmllbmRgIOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIGNoZWNrZWQgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg5qSc6Ki844GZ44KL5bGe5oCnXG4gICAgICovXG4gICAgcHVibGljIGNoYW5nZWQoYXR0cmlidXRlcz86IFBhcnRpYWw8VD4pOiBQYXJ0aWFsPFQ+IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKCFhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oYXNDaGFuZ2VkKCkgPyB7IC4uLnRoaXMuX2NoYW5nZWRBdHRycyB9IDogdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgY2hhbmdlZCA9IGRpZmYodGhpcy5fYXR0cnMgYXMgYW55LCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIHJldHVybiAhaXNFbXB0eU9iamVjdChjaGFuZ2VkKSA/IGNoYW5nZWQgOiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBwcmV2aW91cyB2YWx1ZSBvZiBhbiBhdHRyaWJ1dGUsIHJlY29yZGVkIGF0IHRoZSB0aW1lIHRoZSBsYXN0IGBAY2hhbmdlYCBldmVudCB3YXMgZmlyZWQuXG4gICAgICogQGphIGBAY2hhbmdlYCDjgYznmbrngavjgZXjgozjgZ/liY3jga7lsZ7mgKflgKTjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJldmlvdXM8SyBleHRlbmRzIGtleW9mIFQ+KGF0dHJpYnV0ZTogSyk6IFRbS10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcHJldkF0dHJzW2F0dHJpYnV0ZV07XG4gICAgfVxufVxuXG5leHBvcnQgeyBNb2RlbCBhcyBNb2RlbEJhc2UgfTtcblxuLypcbiBQUk9HUkVTUzpcblxu4pePIEV2ZW50c1xu4piGIG9uXG7imIYgb2ZmXG7imIYgdHJpZ2dlclxu4piGIG9uY2VcbuKYhiBsaXN0ZW5Ub1xu4piGIHN0b3BMaXN0ZW5pbmdcbuKYhiBsaXN0ZW5Ub09uY2Vcblxu4pePIE1vZGVsXG7imIYgZXh0ZW5kXG7imIYgcHJlaW5pdGlhbGl6ZVxu4piGIGNvbnN0cnVjdG9yIC8gaW5pdGlhbGl6ZVxu4piGIGdldFxu4piGIHNldFxu4piGIGVzY2FwZVxu4piGIGhhc1xu4pazIHVuc2V0XG7imIYgY2xlYXJcbuKYhiBpZFxu4piGIGlkQXR0cmlidXRlXG7imIYgY2lkXG7ilrMgYXR0cmlidXRlc1xu4pazIGNoYW5nZWRcbuKWsyBkZWZhdWx0c1xu4piGIHRvSlNPTlxu4piFIHN5bmNcbuKYhSBmZXRjaFxu4piFIHNhdmVcbuKYhSBkZXN0cm95XG5cbuKXjyBVbmRlcnNjb3JlXG7imIYgdmFsaWRhdGVcbuKWsyB2YWxpZGF0aW9uRXJyb3JcbuKYhiBpc1ZhbGlkXG7imIUgdXJsXG7imIUgdXJsUm9vdFxu4piFIHBhcnNlXG7imIUgY2xvbmVcbuKYhSBpc05ld1xu4piGIGhhc0NoYW5nZWRcbuKYhiBjaGFuZ2VkQXR0cmlidXRlc1xu4piGIHByZXZpb3VzXG7ilrMgcHJldmlvdXNBdHRyaWJ1dGVzXG4gKi9cbiJdLCJuYW1lcyI6WyJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJFdmVudFJldmNlaXZlciIsIk9ic2VydmFibGVPYmplY3QiLCJsdWlkIiwiZGVlcEVxdWFsIiwiZGlmZiIsIlNVQ0NFRURFRCIsInJlc3VsdCIsIkZBSUxFRCIsImVzY2FwZUhUTUwiLCJkZWVwQ29weSIsImlzRW1wdHlPYmplY3QiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7SUFFQSxnREFjQztJQWREOzs7OztRQVVJO1FBQUE7WUFDSSxzRkFBaUQsQ0FBQTtZQUNqRCxvREFBeUIsWUFBQSxrQkFBa0IsZ0JBQXVCLGlCQUF3QixDQUFDLEVBQUUsZUFBZSxDQUFDLDRCQUFBLENBQUE7U0FDaEgsSUFBQTtJQUNMLENBQUMsSUFBQTs7SUNoQkQ7QUFFQSxJQW9DQSxNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMzQyxNQUFNLFNBQVMsR0FBVyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDN0MsTUFBTSxjQUFjLEdBQU0sTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzdDLE1BQU0sT0FB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
