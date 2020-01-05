/*!
 * @cdp/model 0.9.0
 *   generic model scheme
 */

import { luid, deepEqual, diff, isArray, escapeHTML, deepCopy, isEmptyObject } from '@cdp/core-utils';
import { EventRevceiver } from '@cdp/events';
import { ObservableObject } from '@cdp/observable';
import { makeResult, RESULT_CODE, SUCCEEDED, FAILED } from '@cdp/result';

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
const RESULT_VALID_ATTRS = Object.freeze(makeResult(RESULT_CODE.SUCCESS, 'valid attribute.'));
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
        const props = {
            attrs: ObservableObject.from(attributes),
            baseAttrs: { ...attributes },
            prevAttrs: { ...attributes },
            idAttribute: opts.idAttribute,
            cid: luid('model:', 8),
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

export { Model as ModelBase, RESULT_VALID_ATTRS };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwubWpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwiYmFzZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC1wbHVzLW9wZXJhbmRzICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIE1PREVMID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgNSxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19NT0RFTF9ERUNMQVJFICAgICAgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX0RBVEEgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5NT0RFTCArIDEsICdpbnZhbGlkIGRhdGEuJyksXG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5pbXBvcnQge1xuICAgIEFyZ3VtZW50cyxcbiAgICBpc0FycmF5LFxuICAgIGlzRW1wdHlPYmplY3QsXG4gICAgbHVpZCxcbiAgICBlc2NhcGVIVE1MLFxuICAgIGRlZXBDb3B5LFxuICAgIGRlZXBFcXVhbCxcbiAgICBkaWZmLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBTdWJzY3JpcHRpb24sXG4gICAgU2lsZW5jZWFibGUsXG4gICAgRXZlbnRCcm9rZXIsXG4gICAgRXZlbnRSZXZjZWl2ZXIsXG4gICAgRXZlbnRTb3VyY2UsXG59IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgSU9ic2VydmFibGUsXG4gICAgSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2VzcyxcbiAgICBPYnNlcnZhYmxlT2JqZWN0LFxufSBmcm9tICdAY2RwL29ic2VydmFibGUnO1xuaW1wb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBSZXN1bHQsXG4gICAgbWFrZVJlc3VsdCxcbiAgICBTVUNDRUVERUQsXG4gICAgRkFJTEVELFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIE1vZGVsRXZlbnQsXG4gICAgTW9kZWxWYWxpZGF0ZUF0dHJpYnV0ZU9wdGlvbnMsXG4gICAgTW9kZWxBdHRyaWJ1dGVJbnB1dCxcbiAgICBNb2RlbFNldE9wdGlvbnMsXG4gICAgTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG5jb25zdCBfZGVmaW5lQXR0cmlidXRlcyA9IFN5bWJvbCgnZGVmaW5lJyk7XG5jb25zdCBfdmFsaWRhdGUgICAgICAgICA9IFN5bWJvbCgndmFsaWRhdGUnKTtcbmNvbnN0IF9jaGFuZ2VIYW5kbGVyICAgID0gU3ltYm9sKCdvbmNoYW5nZScpO1xuY29uc3QgX2Jyb2tlciAgICAgICAgICAgPSBTeW1ib2woJ2Jyb2tlcicpO1xuY29uc3QgX3Byb3BlcnRpZXMgICAgICAgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5PFQ+IHtcbiAgICBhdHRyczogT2JzZXJ2YWJsZU9iamVjdDtcbiAgICBiYXNlQXR0cnM6IFQ7XG4gICAgcHJldkF0dHJzOiBUO1xuICAgIGNoYW5nZWRBdHRycz86IFBhcnRpYWw8VD47XG4gICAgcmVhZG9ubHkgaWRBdHRyaWJ1dGU6IHN0cmluZztcbiAgICByZWFkb25seSBjaWQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAZW4gVmFsaWQgYXR0cmlidXRlcyByZXN1bHQuXG4gKiBAamEg5bGe5oCn5qSc6Ki844Gu5pyJ5Yq55YCkXG4gKi9cbmV4cG9ydCBjb25zdCBSRVNVTFRfVkFMSURfQVRUUlMgPSBPYmplY3QuZnJlZXplKG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuU1VDQ0VTUywgJ3ZhbGlkIGF0dHJpYnV0ZS4nKSk7XG5cbi8qKlxuICogQGVuIFtbTW9kZWxdXSBiYXNlIGNsYXNzIGRlZmluaXRpb24uXG4gKiBAamEgW1tNb2RlbF1dIOOBruWfuuW6leOCr+ODqeOCueWumue+qVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgTW9kZWxCYXNlLCBNb2RlbENvbnN0cnVjdG9yIH0gZnJvbSAnQGNkcC9tb2RlbCc7XG4gKlxuICogaW50ZXJmYWNlIENvbnRlbnRBdHRyaWJ1dGUge1xuICogICB1cmk6IHN0cmluZztcbiAqICAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyO1xuICogICBjb29raWU/OiBzdHJpbmc7XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiAtIEJhc2ljIFVzYWdlXG4gKlxuICogYGBgdHNcbiAqIC8vIGVhcmx5IGNhc3RcbiAqIGNvbnN0IE1vZGUgPSBNb2RlbEJhc2UgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbEJhc2U8Q29udGVudEF0dHJpYnV0ZT4sIENvbnRlbnRBdHRyaWJ1dGU+O1xuICpcbiAqIGNsYXNzIENvbnRlbnQgZXh0ZW5kcyBNb2RlbCB7XG4gKiAgIGNvbnN0cnVjdG9yKGF0dHJzOiBDb250ZW50QXR0cmlidXRlKSB7XG4gKiAgICAgc3VwZXIoYXR0cnMpO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBvclxuICpcbiAqIGBgYHRzXG4gKiBjbGFzcyBDb250ZW50QmFzZSBleHRlbmRzIE1vZGVsQmFzZTxDb250ZW50QXR0cmlidXRlPiB7XG4gKiAgIGNvbnN0cnVjdG9yKGF0dHJzOiBDb250ZW50QXR0cmlidXRlKSB7XG4gKiAgICAgc3VwZXIoYXR0cnMpO1xuICogICB9XG4gKiB9XG4gKlxuICogLy8gbGF0ZSBjYXN0XG4gKiBjb25zdCBDb250ZW50ID0gQ29udGVudEJhc2UgYXMgTW9kZWxDb25zdHJ1Y3RvcjxDb250ZW50LCBDb250ZW50QXR0cmlidXRlPjtcbiAqIGBgYFxuICogdGhlblxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBjb250ZW50ID0gbmV3IENvbnRlbnQoe1xuICogICB1cmk6ICdhYWEudHh0JyxcbiAqICAgc2l6ZTogMTAsXG4gKiAgIGNvb2tpZTogdW5kZWZpbmVkLCAvLyBuZWVkIGV4cGxpY2l0IGFzc2lnblxuICogfSk7XG4gKlxuICogY29uc29sZS5sb2coY29udGVudC51cmkpOyAgICAvLyAnYWFhLnR4dCdcbiAqIGNvbnNvbGUubG9nKGNvbnRlbnQuc2l6ZSk7ICAgLy8gJzEwJ1xuICogY29uc29sZS5sb2coY29udGVudC5jb29raWUpOyAvLyAndW5kZWZpbmVkJ1xuICogYGBgXG4gKlxuICogLSBVc2luZyBDdXN0b20gRXZlbnRcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgTW9kZWxFdmVudCB9IGZyb20gJ0BjZHAvbW9kZWwnO1xuICpcbiAqIGludGVyZmFjZSBDdXN0b21FdmVudCBleHRlbmRzIE1vZGVsRXZlbnQ8Q29udGVudEF0dHJpYnV0ZT4ge1xuICogICBmaXJlOiBbYm9vbGVhbiwgbnVtYmVyXTtcbiAqIH1cbiAqIFxuICogOlxuICpcbiAqIC8vIGVhcmx5IGNhc3RcbiAqIGNvbnN0IE1vZGUgPSBNb2RlbEJhc2UgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbEJhc2U8Q29udGVudEF0dHJpYnV0ZSwgQ3VzdG9tRXZlbnQ+LCBDb250ZW50QXR0cmlidXRlPjtcbiAqXG4gKiAvLyBsYXRlIGNhc3RcbiAqIGNsYXNzIENvbnRlbnRCYXNlIGV4dGVuZHMgTW9kZWxCYXNlPENvbnRlbnRBdHRyaWJ1dGUsIEN1c3RvbUV2ZW50PiB7XG4gKiAgIDpcbiAqIH1cbiAqXG4gKiBjb25zdCBjb250ZW50ID0gbmV3IENvbnRlbnQoeyAuLi4gfSk7XG4gKiBjb250ZW50LnRyaWdnZXIoJ2ZpcmUnLCB0cnVlLCAxMDApO1xuICogYGBgXG4gKi9cbmFic3RyYWN0IGNsYXNzIE1vZGVsPFQgZXh0ZW5kcyB7fSA9IHt9LCBFdmVudCBleHRlbmRzIE1vZGVsRXZlbnQ8VD4gPSBNb2RlbEV2ZW50PFQ+PiBleHRlbmRzIEV2ZW50UmV2Y2VpdmVyIGltcGxlbWVudHMgRXZlbnRTb3VyY2U8RXZlbnQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gQXR0cmlidXRlcyBwb29sXG4gICAgICogQGphIOWxnuaAp+agvOe0jemgmOWfn1xuICAgICAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXTogUHJvcGVydHk8VD47XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgYXR0cmlidXRlIHZhbHVlc1xuICAgICAqICAtIGBqYWAg5bGe5oCn44Gu5Yid5pyf5YCk44KS5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlczogUmVxdWlyZWQ8VD4sIG9wdGlvbnM/OiBNb2RlbENvbnN0cnVjdGlvbk9wdGlvbnM8VD4pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBpZEF0dHJpYnV0ZTogJ2lkJyB9LCBvcHRpb25zKTtcblxuICAgICAgICBjb25zdCBwcm9wczogUHJvcGVydHk8VD4gPSB7XG4gICAgICAgICAgICBhdHRyczogT2JzZXJ2YWJsZU9iamVjdC5mcm9tKGF0dHJpYnV0ZXMpLFxuICAgICAgICAgICAgYmFzZUF0dHJzOiB7IC4uLmF0dHJpYnV0ZXMgfSxcbiAgICAgICAgICAgIHByZXZBdHRyczogeyAuLi5hdHRyaWJ1dGVzIH0sXG4gICAgICAgICAgICBpZEF0dHJpYnV0ZTogb3B0cy5pZEF0dHJpYnV0ZSxcbiAgICAgICAgICAgIGNpZDogbHVpZCgnbW9kZWw6JywgOCksXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBfcHJvcGVydGllcywgeyB2YWx1ZTogcHJvcHMgfSk7XG5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoYXR0cmlidXRlcykpIHtcbiAgICAgICAgICAgIHRoaXNbX2RlZmluZUF0dHJpYnV0ZXNdKHRoaXMsIGtleSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzW19jaGFuZ2VIYW5kbGVyXSA9ICgpID0+IHtcbiAgICAgICAgICAgICh0aGlzIGFzIGFueSkudHJpZ2dlcignQGNoYW5nZScsIHRoaXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXNbX3ZhbGlkYXRlXSh7fSwgb3B0cyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBhdHRyaWJ1dGUgYnJpZGdlIGRlZiAqL1xuICAgIHByaXZhdGUgW19kZWZpbmVBdHRyaWJ1dGVzXShpbnN0YW5jZTogYW55LCBuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgcHJvdG8gPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG4gICAgICAgIGlmICghKG5hbWUgaW4gcHJvdG8pKSB7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sIG5hbWUsIHtcbiAgICAgICAgICAgICAgICBnZXQoKTogdW5rbm93biB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9hdHRyc1tuYW1lXTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldCh2YWw6IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFkZWVwRXF1YWwodGhpcy5fYXR0cnNbbmFtZV0sIHZhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnM7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcmV2QXR0cnNbbmFtZV0gPSB0aGlzLl9hdHRyc1tuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzW25hbWVdICAgICA9IHZhbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBwdWJsaWMgcHJvcGVydGllc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjb250ZW50IElELlxuICAgICAqIEBqYSDjgrPjg7Pjg4bjg7Pjg4QgSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IHsgaWRBdHRyaWJ1dGUsIGNpZCwgYXR0cnMgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gKGlkQXR0cmlidXRlIGluIGF0dHJzKSA/IGF0dHJzW2lkQXR0cmlidXRlXSA6IGNpZDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogcHJvdGVjdGVkIHByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2F0dHJzKCk6IE9ic2VydmFibGVPYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uYXR0cnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlZmF1bHQgYXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDml6LlrprlgKTlsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9iYXNlQXR0cnMoKTogVCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5iYXNlQXR0cnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFByZXZpb3VzIGF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5aSJ5pu05YmN44Gu5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcHJldkF0dHJzKCk6IFQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucHJldkF0dHJzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGFuZ2VkIGF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5aSJ5pu044Gu44GC44Gj44Gf5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY2hhbmdlZEF0dHJzKCk6IFBhcnRpYWw8VD4ge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnMpIHtcbiAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNoYW5nZWRBdHRycyA9IGRpZmYodGhpcy5fYmFzZUF0dHJzLCB0aGlzLl9hdHRycyBhcyBhbnkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnMgYXMgUGFydGlhbDxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGludGVybmFsIGNvbnRlbnQgSUQuXG4gICAgICogQGphIOWGhemDqOOBruOCs+ODs+ODhuODs+ODhCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9jaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNpZDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBldmVudHNcblxuICAgIC8qKiBAaW50ZXJuYWwgYnJva2VyIGFjY2VzcyAqL1xuICAgIHByaXZhdGUgZ2V0IFtfYnJva2VyXSgpOiBFdmVudEJyb2tlcjxhbnk+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzLl9hdHRycyBhcyBJT2JzZXJ2YWJsZSBhcyBJT2JzZXJ2YWJsZUV2ZW50QnJva2VyQWNjZXNzKS5nZXRCcm9rZXIoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgd2hldGhlciB0aGlzIG9iamVjdCBoYXMgY2xpZW50cy5cbiAgICAgKiBAamEg44Kv44Op44Kk44Ki44Oz44OI44GM5a2Y5Zyo44GZ44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBoYXNMaXN0ZW5lcjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw/OiBDaGFubmVsLCBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19icm9rZXJdLmhhc0xpc3RlbmVyKGNoYW5uZWwsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyByZWdpc3RlcmVkIGNoYW5uZWwga2V5cy5cbiAgICAgKiBAamEg55m76Yyy44GV44KM44Gm44GE44KL44OB44Oj44ON44Or44Kt44O844KS6L+U5Y20XG4gICAgICovXG4gICAgY2hhbm5lbHMoKTogKGtleW9mIEV2ZW50KVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2Jyb2tlcl0uY2hhbm5lbHMoKSBhcyAoa2V5b2YgRXZlbnQpW107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE5vdGlmeSBldmVudCB0byBjbGllbnRzLlxuICAgICAqIEBqYSBldmVudCDnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgavmuKHjgZnlvJXmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgdHJpZ2dlcjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwsIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj4pOiB2b2lkIHtcbiAgICAgICAgKHRoaXNbX2Jyb2tlcl0gYXMgYW55KS50cmlnZ2VyKGNoYW5uZWwsIC4uLmFyZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBldmVyeXRoaW5nIGlzIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/jgZnjgbnjgabop6PpmaRcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgYWxsIHNhbWUgYGNoYW5uZWxgIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lkIzkuIAgYGNoYW5uZWxgIOOBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIHB1YmxpYyBvZmY8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsPzogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IHZvaWQge1xuICAgICAgICB0aGlzLl9hdHRycy5vZmYoY2hhbm5lbCBhcyBhbnksIGxpc3RlbmVyIGFzIGFueSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIG9uPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgaWYgKCdAY2hhbmdlJyA9PT0gY2hhbm5lbCB8fCAoaXNBcnJheShjaGFubmVsKSAmJiBjaGFubmVsLmluY2x1ZGVzKCdAY2hhbmdlJyBhcyBDaGFubmVsKSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2F0dHJzLm9uKCdAJywgdGhpc1tfY2hhbmdlSGFuZGxlcl0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9hdHRycy5vbihjaGFubmVsIGFzIGFueSwgbGlzdGVuZXIgYXMgYW55KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpIGJ1dCBpdCBjYXVzZXMgdGhlIGJvdW5kIGNhbGxiYWNrIHRvIG9ubHkgZmlyZSBvbmNlIGJlZm9yZSBiZWluZyByZW1vdmVkLlxuICAgICAqIEBqYSDkuIDluqbjgaDjgZHjg4/jg7Pjg4njg6rjg7PjgrDlj6/og73jgarjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgb25jZTxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLm9uKGNoYW5uZWwsIGxpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgbWFuYWdlZCA9IHRoaXMub24oY2hhbm5lbCwgKCkgPT4ge1xuICAgICAgICAgICAgY29udGV4dC51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgbWFuYWdlZC51bnN1YnNjcmliZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogdmFsaWRhdGlvblxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHZhbGlkIG9yIG5vdC5cbiAgICAgKiBAamEg5qSc6Ki844Gu5oiQ5ZCm44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGlzVmFsaWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBTVUNDRUVERUQodGhpcy52YWxpZGF0ZSh7IHNpbGVudDogdHJ1ZSB9KS5jb2RlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmFsaWRhdGUgcmVzdWx0IGFjY2Vzc2VyLlxuICAgICAqIEBqYSDmpJzoqLzntZDmnpzjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgdmFsaWRhdGUob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogUmVzdWx0IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyB2YWxpZGF0ZTogdHJ1ZSwgbm9UaHJvdzogdHJ1ZSwgZXh0ZW5kOiBmYWxzZSB9LCBvcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3ZhbGlkYXRlXSh7fSwgb3B0cyk7XG4gICAgfVxuXG4gICAgLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzICovXG5cbiAgICAvKipcbiAgICAgKiBAZW4gVmFsaWRhdGUgZGF0YSBtZXRob2QuXG4gICAgICogQGphIOODh+ODvOOCv+aknOiovFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgdmFsaWRhdGVlIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgamFgIOiiq+aknOiovOWxnuaAp1xuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCB2YWxpZGF0ZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDmpJzoqLzjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgdmFsaWRhdGVBdHRyaWJ1dGVzPEEgZXh0ZW5kcyBUPihhdHRyaWJ1dGVzOiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+LCBvcHRpb25zPzogTW9kZWxWYWxpZGF0ZUF0dHJpYnV0ZU9wdGlvbnMpOiBSZXN1bHQge1xuICAgICAgICByZXR1cm4gUkVTVUxUX1ZBTElEX0FUVFJTO1xuICAgIH1cblxuICAgIC8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzICovXG5cbiAgICAvKiogQGludGVybmFsIHZhbGlkYXRlICovXG4gICAgcHJpdmF0ZSBbX3ZhbGlkYXRlXTxBIGV4dGVuZHMgVD4oYXR0cmlidXRlczogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPiwgb3B0aW9ucz86IE1vZGVsU2V0T3B0aW9ucyk6IFJlc3VsdCB8IG5ldmVyIHtcbiAgICAgICAgY29uc3QgeyB2YWxpZGF0ZSwgc2lsZW50LCBub1Rocm93IH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBpZiAodmFsaWRhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGF0dHJzID0geyAuLi50aGlzLl9hdHRycywgLi4uYXR0cmlidXRlcyB9O1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy52YWxpZGF0ZUF0dHJpYnV0ZXMoYXR0cnMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKEZBSUxFRChyZXN1bHQuY29kZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBhbnkpLnRyaWdnZXIoJ0BpbnZhbGlkJywgdGhpcywgYXR0cnMsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghbm9UaHJvdykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBSRVNVTFRfVkFMSURfQVRUUlM7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBhdHRyaWJ1dGVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIFtbTW9kZWxdXSBoYXMgdmFsaWQgcHJvcGVydHkuIChub3QgYG51bGxgIG9yIGB1bmRlZmluZWRgKVxuICAgICAqIEBqYSBbW01vZGVsXV0g44GM5pyJ5Yq544Gq44OX44Ot44OR44OG44Kj44KS5oyB44Gj44Gm44GE44KL44GL56K66KqNIChgbnVsbGAg44G+44Gf44GvIGB1bmRlZmluZWRgIOOBp+OBquOBhClcbiAgICAgKi9cbiAgICBwdWJsaWMgaGFzKGF0dHJpYnV0ZToga2V5b2YgVCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSAodGhpcy5fYXR0cnMgYXMgYW55KVthdHRyaWJ1dGVdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIEhUTUwtZXNjYXBlZCB2YWx1ZSBvZiBhbiBhdHRyaWJ1dGUuXG4gICAgICogQGphIEhUTUwg44Gn5L2/55So44GZ44KL5paH5a2X44KS5Yi25b6h5paH5a2X44Gr572u5o+b44GX44Gf5bGe5oCn5YCk44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGVzY2FwZShhdHRyaWJ1dGU6IGtleW9mIFQpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gZXNjYXBlSFRNTCgodGhpcy5fYXR0cnMgYXMgYW55KVthdHRyaWJ1dGVdKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGF0dHJpYnV0ZXMgZm9yIGJhdGNoIGlucHV0IHdpdGggb3B0aW9ucy5cbiAgICAgKiBAamEg5bGe5oCn44Gu5LiA5ous6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgdXBkYXRlIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgamFgIOabtOaWsOWxnuaAp1xuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzZXQgYXR0cmlidXRlcyBvcHRpb25zXG4gICAgICogIC0gYGphYCDlsZ7mgKfmm7TmlrDnlKjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0QXR0cmlidXRlczxBIGV4dGVuZHMgVD4oYXR0cmlidXRlczogTW9kZWxBdHRyaWJ1dGVJbnB1dDxBPiwgb3B0aW9ucz86IE1vZGVsU2V0T3B0aW9ucyk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHNpbGVudCwgZXh0ZW5kIH0gPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYXR0cnMuc3VzcGVuZCh0cnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpc1tfdmFsaWRhdGVdKGF0dHJpYnV0ZXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKEZBSUxFRChyZXN1bHQuY29kZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIE9iamVjdC5rZXlzKGF0dHJpYnV0ZXMpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGF0dHIgaW4gdGhpcy5fYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYXR0cnNbYXR0cl0gPSBhdHRyaWJ1dGVzW2F0dHJdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXh0ZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX2RlZmluZUF0dHJpYnV0ZXNdKHRoaXMsIGF0dHIpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9hdHRyc1thdHRyXSA9IGF0dHJpYnV0ZXNbYXR0cl07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgaWYgKHNpbGVudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzLnJlc3VtZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGFsbCBhdHRyaWJ1dGVzIG9uIHRoZSBbW01vZGVsXV0uIChzZXQgYHVuZGVmaW5lZGApXG4gICAgICogQGphIFtbTW9kZWxdXSDjgYvjgonjgZnjgbnjgabjga7lsZ7mgKfjgpLliYrpmaQgKGB1bmRlZmluZWRgIOOCkuioreWumilcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xlYXIob3B0aW9ucz86IE1vZGVsU2V0T3B0aW9ucyk6IHRoaXMge1xuICAgICAgICBjb25zdCBjbGVhckF0dHJzID0ge307XG4gICAgICAgIGZvciAoY29uc3QgYXR0ciBvZiBPYmplY3Qua2V5cyh0aGlzLl9iYXNlQXR0cnMpKSB7XG4gICAgICAgICAgICBjbGVhckF0dHJzW2F0dHJdID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnNldEF0dHJpYnV0ZXMoY2xlYXJBdHRycywgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBhIGNvcHkgb2YgdGhlIG1vZGVsJ3MgYGF0dHJpYnV0ZXNgIG9iamVjdC5cbiAgICAgKiBAamEg44Oi44OH44Or5bGe5oCn5YCk44Gu44Kz44OU44O844KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHRvSlNPTigpOiBUIHtcbiAgICAgICAgcmV0dXJuIGRlZXBDb3B5KHsgLi4udGhpcy5fYXR0cnMgfSBhcyBUKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgY2hhbmdlZCBhdHRyaWJ1dGVzLlxuICAgICAqIEBqYSDlpInmm7TjgZXjgozjgZ/lsZ7mgKflgKTjgpLmjIHjgaTjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVcbiAgICAgKiAgLSBgZW5gIGNoZWNrZWQgYXR0cmlidXRlXG4gICAgICogIC0gYGphYCDmpJzoqLzjgZnjgovlsZ7mgKdcbiAgICAgKi9cbiAgICBwdWJsaWMgaGFzQ2hhbmdlZChhdHRyaWJ1dGU/OiBrZXlvZiBUKTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChudWxsID09IGF0dHJpYnV0ZSkge1xuICAgICAgICAgICAgcmV0dXJuICFpc0VtcHR5T2JqZWN0KHRoaXMuX2NoYW5nZWRBdHRycyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYXR0cmlidXRlIGluIHRoaXMuX2NoYW5nZWRBdHRycztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYW4gb2JqZWN0IGNvbnRhaW5pbmcgYWxsIHRoZSBhdHRyaWJ1dGVzIHRoYXQgaGF2ZSBjaGFuZ2VkLCBvciBgdW5kZWZpbmVkYCBpZiB0aGVyZSBhcmUgbm8gY2hhbmdlZCBhdHRyaWJ1dGVzLlxuICAgICAqIEBqYSDlhaXlipvjgZfjgZ8gYXR0cmlidXRlcyDlgKTjga7lt67liIbjgavlr77jgZfjgablpInmm7TjgYzjgYLjgovlsZ7mgKflgKTjgpLov5TljbQuIOW3ruWIhuOBjOOBquOBhOWgtOWQiOOBryBgdW5kZWZpZW5kYCDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCBjaGVja2VkIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgamFgIOaknOiovOOBmeOCi+WxnuaAp1xuICAgICAqL1xuICAgIHB1YmxpYyBjaGFuZ2VkKGF0dHJpYnV0ZXM/OiBQYXJ0aWFsPFQ+KTogUGFydGlhbDxUPiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICghYXR0cmlidXRlcykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFzQ2hhbmdlZCgpID8geyAuLi50aGlzLl9jaGFuZ2VkQXR0cnMgfSA6IHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZWQgPSBkaWZmKHRoaXMuX2F0dHJzIGFzIGFueSwgYXR0cmlidXRlcyk7XG4gICAgICAgICAgICByZXR1cm4gIWlzRW1wdHlPYmplY3QoY2hhbmdlZCkgPyBjaGFuZ2VkIDogdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgcHJldmlvdXMgdmFsdWUgb2YgYW4gYXR0cmlidXRlLCByZWNvcmRlZCBhdCB0aGUgdGltZSB0aGUgbGFzdCBgQGNoYW5nZWAgZXZlbnQgd2FzIGZpcmVkLlxuICAgICAqIEBqYSBgQGNoYW5nZWAg44GM55m654Gr44GV44KM44Gf5YmN44Gu5bGe5oCn5YCk44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHByZXZpb3VzPEsgZXh0ZW5kcyBrZXlvZiBUPihhdHRyaWJ1dGU6IEspOiBUW0tdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ByZXZBdHRyc1thdHRyaWJ1dGVdO1xuICAgIH1cbn1cblxuZXhwb3J0IHsgTW9kZWwgYXMgTW9kZWxCYXNlIH07XG5cbi8qXG4gUFJPR1JFU1M6XG5cbuKXjyBFdmVudHNcbuKYhiBvblxu4piGIG9mZlxu4piGIHRyaWdnZXJcbuKYhiBvbmNlXG7imIYgbGlzdGVuVG9cbuKYhiBzdG9wTGlzdGVuaW5nXG7imIYgbGlzdGVuVG9PbmNlXG5cbuKXjyBNb2RlbFxu4piGIGV4dGVuZFxu4piGIHByZWluaXRpYWxpemVcbuKYhiBjb25zdHJ1Y3RvciAvIGluaXRpYWxpemVcbuKYhiBnZXRcbuKYhiBzZXRcbuKYhiBlc2NhcGVcbuKYhiBoYXNcbuKWsyB1bnNldFxu4piGIGNsZWFyXG7imIYgaWRcbuKYhiBpZEF0dHJpYnV0ZVxu4piGIGNpZFxu4pazIGF0dHJpYnV0ZXNcbuKWsyBjaGFuZ2VkXG7ilrMgZGVmYXVsdHNcbuKYhiB0b0pTT05cbuKYhSBzeW5jXG7imIUgZmV0Y2hcbuKYhSBzYXZlXG7imIUgZGVzdHJveVxuXG7il48gVW5kZXJzY29yZVxu4piGIHZhbGlkYXRlXG7ilrMgdmFsaWRhdGlvbkVycm9yXG7imIYgaXNWYWxpZFxu4piFIHVybFxu4piFIHVybFJvb3RcbuKYhSBwYXJzZVxu4piFIGNsb25lXG7imIUgaXNOZXdcbuKYhiBoYXNDaGFuZ2VkXG7imIYgY2hhbmdlZEF0dHJpYnV0ZXNcbuKYhiBwcmV2aW91c1xu4pazIHByZXZpb3VzQXR0cmlidXRlc1xuICovXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBRUEsZ0RBY0M7QUFkRDs7Ozs7SUFVSTtJQUFBO1FBQ0ksc0ZBQWlELENBQUE7UUFDakQsb0RBQXlCLFlBQUEsa0JBQWtCLGdCQUF1QixpQkFBd0IsQ0FBQyxFQUFFLGVBQWUsQ0FBQyw0QkFBQSxDQUFBO0tBQ2hILElBQUE7QUFDTCxDQUFDOztBQ2hCRDtBQUVBLEFBcUNBLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzNDLE1BQU0sU0FBUyxHQUFXLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUM3QyxNQUFNLGNBQWMsR0FBTSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDN0MsTUFBTSxPQUFPLEdBQWEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzNDLE1BQU0sV0FBVyxHQUFTLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQVkvQzs7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
