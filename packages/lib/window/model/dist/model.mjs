/*!
 * @cdp/model 0.9.0
 *   generic model scheme
 */

import { luid, deepEqual, diff, escapeHTML, deepCopy, isEmptyObject } from '@cdp/core-utils';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwubWpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwiYmFzZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC1wbHVzLW9wZXJhbmRzICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIE1PREVMID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8temAmuOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfREFUQSA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLk1PREVMICsgMSwgJ2ludmFsaWQgZGF0YS4nKSxcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7XG4gICAgQXJndW1lbnRzLFxuICAgIGlzRW1wdHlPYmplY3QsXG4gICAgbHVpZCxcbiAgICBlc2NhcGVIVE1MLFxuICAgIGRlZXBDb3B5LFxuICAgIGRlZXBFcXVhbCxcbiAgICBkaWZmLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBTdWJzY3JpcHRpb24sXG4gICAgU2lsZW5jZWFibGUsXG4gICAgRXZlbnRCcm9rZXIsXG4gICAgRXZlbnRSZXZjZWl2ZXIsXG4gICAgRXZlbnRTb3VyY2UsXG59IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgSU9ic2VydmFibGUsXG4gICAgSU9ic2VydmFibGVFdmVudEJyb2tlckFjY2VzcyxcbiAgICBPYnNlcnZhYmxlT2JqZWN0LFxufSBmcm9tICdAY2RwL29ic2VydmFibGUnO1xuaW1wb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBSZXN1bHQsXG4gICAgbWFrZVJlc3VsdCxcbiAgICBTVUNDRUVERUQsXG4gICAgRkFJTEVELFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIE1vZGVsRXZlbnQsXG4gICAgTW9kZWxWYWxpZGF0ZUF0dHJpYnV0ZU9wdGlvbnMsXG4gICAgTW9kZWxBdHRyaWJ1dGVJbnB1dCxcbiAgICBNb2RlbFNldE9wdGlvbnMsXG4gICAgTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG5jb25zdCBfZGVmaW5lQXR0cmlidXRlcyA9IFN5bWJvbCgnZGVmaW5lJyk7XG5jb25zdCBfdmFsaWRhdGUgICAgICAgICA9IFN5bWJvbCgndmFsaWRhdGUnKTtcbmNvbnN0IF9jaGFuZ2VIYW5kbGVyICAgID0gU3ltYm9sKCdvbmNoYW5nZScpO1xuY29uc3QgX2Jyb2tlciAgICAgICAgICAgPSBTeW1ib2woJ2Jyb2tlcicpO1xuY29uc3QgX3Byb3BlcnRpZXMgICAgICAgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5PFQ+IHtcbiAgICBhdHRyczogT2JzZXJ2YWJsZU9iamVjdDtcbiAgICBiYXNlQXR0cnM6IFQ7XG4gICAgcHJldkF0dHJzOiBUO1xuICAgIGNoYW5nZWRBdHRycz86IFBhcnRpYWw8VD47XG4gICAgcmVhZG9ubHkgaWRBdHRyaWJ1dGU6IHN0cmluZztcbiAgICByZWFkb25seSBjaWQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAZW4gVmFsaWQgYXR0cmlidXRlcyByZXN1bHQuXG4gKiBAamEg5bGe5oCn5qSc6Ki844Gu5pyJ5Yq55YCkXG4gKi9cbmV4cG9ydCBjb25zdCBSRVNVTFRfVkFMSURfQVRUUlMgPSBPYmplY3QuZnJlZXplKG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuU1VDQ0VTUywgJ3ZhbGlkIGF0dHJpYnV0ZS4nKSk7XG5cbi8qKlxuICogQGVuIFtbTW9kZWxdXSBiYXNlIGNsYXNzIGRlZmluaXRpb24uXG4gKiBAamEgW1tNb2RlbF1dIOOBruWfuuW6leOCr+ODqeOCueWumue+qVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgTW9kZWxCYXNlLCBNb2RlbENvbnN0cnVjdG9yIH0gZnJvbSAnQGNkcC9tb2RlbCc7XG4gKlxuICogaW50ZXJmYWNlIENvbnRlbnRBdHRyaWJ1dGUge1xuICogICB1cmk6IHN0cmluZztcbiAqICAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyO1xuICogICBjb29raWU/OiBzdHJpbmc7XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiAtIEJhc2ljIFVzYWdlXG4gKlxuICogYGBgdHNcbiAqIC8vIGVhcmx5IGNhc3RcbiAqIGNvbnN0IE1vZGUgPSBNb2RlbEJhc2UgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbEJhc2U8Q29udGVudEF0dHJpYnV0ZT4sIENvbnRlbnRBdHRyaWJ1dGU+O1xuICpcbiAqIGNsYXNzIENvbnRlbnQgZXh0ZW5kcyBNb2RlbCB7XG4gKiAgIGNvbnN0cnVjdG9yKGF0dHJzOiBDb250ZW50QXR0cmlidXRlKSB7XG4gKiAgICAgc3VwZXIoYXR0cnMpO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBvclxuICpcbiAqIGBgYHRzXG4gKiBjbGFzcyBDb250ZW50QmFzZSBleHRlbmRzIE1vZGVsQmFzZTxDb250ZW50QXR0cmlidXRlPiB7XG4gKiAgIGNvbnN0cnVjdG9yKGF0dHJzOiBDb250ZW50QXR0cmlidXRlKSB7XG4gKiAgICAgc3VwZXIoYXR0cnMpO1xuICogICB9XG4gKiB9XG4gKlxuICogLy8gbGF0ZSBjYXN0XG4gKiBjb25zdCBDb250ZW50ID0gQ29udGVudEJhc2UgYXMgTW9kZWxDb25zdHJ1Y3RvcjxDb250ZW50LCBDb250ZW50QXR0cmlidXRlPjtcbiAqIGBgYFxuICogdGhlblxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBjb250ZW50ID0gbmV3IENvbnRlbnQoe1xuICogICB1cmk6ICdhYWEudHh0JyxcbiAqICAgc2l6ZTogMTAsXG4gKiAgIGNvb2tpZTogdW5kZWZpbmVkLCAvLyBuZWVkIGV4cGxpY2l0IGFzc2lnblxuICogfSk7XG4gKlxuICogY29uc29sZS5sb2coY29udGVudC51cmkpOyAgICAvLyAnYWFhLnR4dCdcbiAqIGNvbnNvbGUubG9nKGNvbnRlbnQuc2l6ZSk7ICAgLy8gJzEwJ1xuICogY29uc29sZS5sb2coY29udGVudC5jb29raWUpOyAvLyAndW5kZWZpbmVkJ1xuICogYGBgXG4gKlxuICogLSBVc2luZyBDdXN0b20gRXZlbnRcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgTW9kZWxFdmVudCB9IGZyb20gJ0BjZHAvbW9kZWwnO1xuICpcbiAqIGludGVyZmFjZSBDdXN0b21FdmVudCBleHRlbmRzIE1vZGVsRXZlbnQ8Q29udGVudEF0dHJpYnV0ZT4ge1xuICogICBmaXJlOiBbYm9vbGVhbiwgbnVtYmVyXTtcbiAqIH1cbiAqIFxuICogOlxuICpcbiAqIC8vIGVhcmx5IGNhc3RcbiAqIGNvbnN0IE1vZGUgPSBNb2RlbEJhc2UgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbEJhc2U8Q29udGVudEF0dHJpYnV0ZSwgQ3VzdG9tRXZlbnQ+LCBDb250ZW50QXR0cmlidXRlPjtcbiAqXG4gKiAvLyBsYXRlIGNhc3RcbiAqIGNsYXNzIENvbnRlbnRCYXNlIGV4dGVuZHMgTW9kZWxCYXNlPENvbnRlbnRBdHRyaWJ1dGUsIEN1c3RvbUV2ZW50PiB7XG4gKiAgIDpcbiAqIH1cbiAqXG4gKiBjb25zdCBjb250ZW50ID0gbmV3IENvbnRlbnQoeyAuLi4gfSk7XG4gKiBjb250ZW50LnRyaWdnZXIoJ2ZpcmUnLCB0cnVlLCAxMDApO1xuICogYGBgXG4gKi9cbmFic3RyYWN0IGNsYXNzIE1vZGVsPFQgZXh0ZW5kcyB7fSA9IHt9LCBFdmVudCBleHRlbmRzIE1vZGVsRXZlbnQ8VD4gPSBNb2RlbEV2ZW50PFQ+PiBleHRlbmRzIEV2ZW50UmV2Y2VpdmVyIGltcGxlbWVudHMgRXZlbnRTb3VyY2U8RXZlbnQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gQXR0cmlidXRlcyBwb29sXG4gICAgICogQGphIOWxnuaAp+agvOe0jemgmOWfn1xuICAgICAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXTogUHJvcGVydHk8VD47XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgYXR0cmlidXRlIHZhbHVlc1xuICAgICAqICAtIGBqYWAg5bGe5oCn44Gu5Yid5pyf5YCk44KS5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlczogUmVxdWlyZWQ8VD4sIG9wdGlvbnM/OiBNb2RlbENvbnN0cnVjdGlvbk9wdGlvbnM8VD4pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBpZEF0dHJpYnV0ZTogJ2lkJyB9LCBvcHRpb25zKTtcblxuICAgICAgICBjb25zdCBwcm9wczogUHJvcGVydHk8VD4gPSB7XG4gICAgICAgICAgICBhdHRyczogT2JzZXJ2YWJsZU9iamVjdC5mcm9tKGF0dHJpYnV0ZXMpLFxuICAgICAgICAgICAgYmFzZUF0dHJzOiB7IC4uLmF0dHJpYnV0ZXMgfSxcbiAgICAgICAgICAgIHByZXZBdHRyczogeyAuLi5hdHRyaWJ1dGVzIH0sXG4gICAgICAgICAgICBpZEF0dHJpYnV0ZTogb3B0cy5pZEF0dHJpYnV0ZSxcbiAgICAgICAgICAgIGNpZDogbHVpZCgnbW9kZWw6JywgOCksXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBfcHJvcGVydGllcywgeyB2YWx1ZTogcHJvcHMgfSk7XG5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoYXR0cmlidXRlcykpIHtcbiAgICAgICAgICAgIHRoaXNbX2RlZmluZUF0dHJpYnV0ZXNdKHRoaXMsIGtleSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzW19jaGFuZ2VIYW5kbGVyXSA9ICgpID0+IHtcbiAgICAgICAgICAgICh0aGlzIGFzIGFueSkudHJpZ2dlcignQGNoYW5nZScsIHRoaXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXNbX3ZhbGlkYXRlXSh7fSwgb3B0cyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBhdHRyaWJ1dGUgYnJpZGdlIGRlZiAqL1xuICAgIHByaXZhdGUgW19kZWZpbmVBdHRyaWJ1dGVzXShpbnN0YW5jZTogYW55LCBuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgcHJvdG8gPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG4gICAgICAgIGlmICghKG5hbWUgaW4gcHJvdG8pKSB7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sIG5hbWUsIHtcbiAgICAgICAgICAgICAgICBnZXQoKTogdW5rbm93biB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9hdHRyc1tuYW1lXTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldCh2YWw6IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFkZWVwRXF1YWwodGhpcy5fYXR0cnNbbmFtZV0sIHZhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnM7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcmV2QXR0cnNbbmFtZV0gPSB0aGlzLl9hdHRyc1tuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzW25hbWVdICAgICA9IHZhbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBwdWJsaWMgcHJvcGVydGllc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjb250ZW50IElELlxuICAgICAqIEBqYSDjgrPjg7Pjg4bjg7Pjg4QgSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IHsgaWRBdHRyaWJ1dGUsIGNpZCwgYXR0cnMgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gKGlkQXR0cmlidXRlIGluIGF0dHJzKSA/IGF0dHJzW2lkQXR0cmlidXRlXSA6IGNpZDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogcHJvdGVjdGVkIHByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2F0dHJzKCk6IE9ic2VydmFibGVPYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uYXR0cnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlZmF1bHQgYXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDml6LlrprlgKTlsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9iYXNlQXR0cnMoKTogVCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5iYXNlQXR0cnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFByZXZpb3VzIGF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5aSJ5pu05YmN44Gu5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcHJldkF0dHJzKCk6IFQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucHJldkF0dHJzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGFuZ2VkIGF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5aSJ5pu044Gu44GC44Gj44Gf5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY2hhbmdlZEF0dHJzKCk6IFBhcnRpYWw8VD4ge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnMpIHtcbiAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmNoYW5nZWRBdHRycyA9IGRpZmYodGhpcy5fYmFzZUF0dHJzLCB0aGlzLl9hdHRycyBhcyBhbnkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jaGFuZ2VkQXR0cnMgYXMgUGFydGlhbDxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGludGVybmFsIGNvbnRlbnQgSUQuXG4gICAgICogQGphIOWGhemDqOOBruOCs+ODs+ODhuODs+ODhCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9jaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNpZDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBldmVudHNcblxuICAgIC8qKiBAaW50ZXJuYWwgYnJva2VyIGFjY2VzcyAqL1xuICAgIHByaXZhdGUgZ2V0IFtfYnJva2VyXSgpOiBFdmVudEJyb2tlcjxhbnk+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzLl9hdHRycyBhcyBJT2JzZXJ2YWJsZSBhcyBJT2JzZXJ2YWJsZUV2ZW50QnJva2VyQWNjZXNzKS5nZXRCcm9rZXIoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgd2hldGhlciB0aGlzIG9iamVjdCBoYXMgY2xpZW50cy5cbiAgICAgKiBAamEg44Kv44Op44Kk44Ki44Oz44OI44GM5a2Y5Zyo44GZ44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBoYXNMaXN0ZW5lcjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw/OiBDaGFubmVsLCBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzW19icm9rZXJdLmhhc0xpc3RlbmVyKGNoYW5uZWwsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyByZWdpc3RlcmVkIGNoYW5uZWwga2V5cy5cbiAgICAgKiBAamEg55m76Yyy44GV44KM44Gm44GE44KL44OB44Oj44ON44Or44Kt44O844KS6L+U5Y20XG4gICAgICovXG4gICAgY2hhbm5lbHMoKTogKGtleW9mIEV2ZW50KVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2Jyb2tlcl0uY2hhbm5lbHMoKSBhcyAoa2V5b2YgRXZlbnQpW107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE5vdGlmeSBldmVudCB0byBjbGllbnRzLlxuICAgICAqIEBqYSBldmVudCDnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgavmuKHjgZnlvJXmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgdHJpZ2dlcjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwsIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj4pOiB2b2lkIHtcbiAgICAgICAgKHRoaXNbX2Jyb2tlcl0gYXMgYW55KS50cmlnZ2VyKGNoYW5uZWwsIC4uLmFyZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBldmVyeXRoaW5nIGlzIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/jgZnjgbnjgabop6PpmaRcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgYWxsIHNhbWUgYGNoYW5uZWxgIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lkIzkuIAgYGNoYW5uZWxgIOOBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIHB1YmxpYyBvZmY8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsPzogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IHZvaWQge1xuICAgICAgICB0aGlzLl9hdHRycy5vZmYoY2hhbm5lbCBhcyBhbnksIGxpc3RlbmVyIGFzIGFueSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIG9uPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgaWYgKCdAY2hhbmdlJyA9PT0gY2hhbm5lbCkge1xuICAgICAgICAgICAgdGhpcy5fYXR0cnMub24oJyonLCB0aGlzW19jaGFuZ2VIYW5kbGVyXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2F0dHJzLm9uKGNoYW5uZWwgYXMgYW55LCBsaXN0ZW5lciBhcyBhbnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykgYnV0IGl0IGNhdXNlcyB0aGUgYm91bmQgY2FsbGJhY2sgdG8gb25seSBmaXJlIG9uY2UgYmVmb3JlIGJlaW5nIHJlbW92ZWQuXG4gICAgICogQGphIOS4gOW6puOBoOOBkeODj+ODs+ODieODquODs+OCsOWPr+iDveOBquOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBvbmNlPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMub24oY2hhbm5lbCwgbGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBtYW5hZ2VkID0gdGhpcy5vbihjaGFubmVsLCAoKSA9PiB7XG4gICAgICAgICAgICBjb250ZXh0LnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICBtYW5hZ2VkLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiB2YWxpZGF0aW9uXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdmFsaWQgb3Igbm90LlxuICAgICAqIEBqYSDmpJzoqLzjga7miJDlkKbjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaXNWYWxpZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFNVQ0NFRURFRCh0aGlzLnZhbGlkYXRlKHsgc2lsZW50OiB0cnVlIH0pLmNvZGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBWYWxpZGF0ZSByZXN1bHQgYWNjZXNzZXIuXG4gICAgICogQGphIOaknOiovOe1kOaenOOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyB2YWxpZGF0ZShvcHRpb25zPzogU2lsZW5jZWFibGUpOiBSZXN1bHQge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHZhbGlkYXRlOiB0cnVlLCBub1Rocm93OiB0cnVlLCBleHRlbmQ6IGZhbHNlIH0sIG9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gdGhpc1tfdmFsaWRhdGVdKHt9LCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuICAgIC8qKlxuICAgICAqIEBlbiBWYWxpZGF0ZSBkYXRhIG1ldGhvZC5cbiAgICAgKiBAamEg44OH44O844K/5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCB2YWxpZGF0ZWUgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg6KKr5qSc6Ki85bGe5oCnXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHZhbGlkYXRlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOaknOiovOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHByb3RlY3RlZCB2YWxpZGF0ZUF0dHJpYnV0ZXM8QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4sIG9wdGlvbnM/OiBNb2RlbFZhbGlkYXRlQXR0cmlidXRlT3B0aW9ucyk6IFJlc3VsdCB7XG4gICAgICAgIHJldHVybiBSRVNVTFRfVkFMSURfQVRUUlM7XG4gICAgfVxuXG4gICAgLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuICAgIC8qKiBAaW50ZXJuYWwgdmFsaWRhdGUgKi9cbiAgICBwcml2YXRlIFtfdmFsaWRhdGVdPEEgZXh0ZW5kcyBUPihhdHRyaWJ1dGVzOiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+LCBvcHRpb25zPzogTW9kZWxTZXRPcHRpb25zKTogUmVzdWx0IHwgbmV2ZXIge1xuICAgICAgICBjb25zdCB7IHZhbGlkYXRlLCBzaWxlbnQsIG5vVGhyb3cgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGlmICh2YWxpZGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgYXR0cnMgPSB7IC4uLnRoaXMuX2F0dHJzLCAuLi5hdHRyaWJ1dGVzIH07XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnZhbGlkYXRlQXR0cmlidXRlcyhhdHRycywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoRkFJTEVEKHJlc3VsdC5jb2RlKSkge1xuICAgICAgICAgICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIGFueSkudHJpZ2dlcignQGludmFsaWQnLCB0aGlzLCBhdHRycywgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFub1Rocm93KSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFJFU1VMVF9WQUxJRF9BVFRSUztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IGF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgW1tNb2RlbF1dIGhhcyB2YWxpZCBwcm9wZXJ0eS4gKG5vdCBgbnVsbGAgb3IgYHVuZGVmaW5lZGApXG4gICAgICogQGphIFtbTW9kZWxdXSDjgYzmnInlirnjgarjg5fjg63jg5Hjg4bjgqPjgpLmjIHjgaPjgabjgYTjgovjgYvnorroqo0gKGBudWxsYCDjgb7jgZ/jga8gYHVuZGVmaW5lZGAg44Gn44Gq44GEKVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXMoYXR0cmlidXRlOiBrZXlvZiBUKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9ICh0aGlzLl9hdHRycyBhcyBhbnkpW2F0dHJpYnV0ZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgSFRNTC1lc2NhcGVkIHZhbHVlIG9mIGFuIGF0dHJpYnV0ZS5cbiAgICAgKiBAamEgSFRNTCDjgafkvb/nlKjjgZnjgovmloflrZfjgpLliLblvqHmloflrZfjgavnva7mj5vjgZfjgZ/lsZ7mgKflgKTjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZXNjYXBlKGF0dHJpYnV0ZToga2V5b2YgVCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBlc2NhcGVIVE1MKCh0aGlzLl9hdHRycyBhcyBhbnkpW2F0dHJpYnV0ZV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVcGRhdGUgYXR0cmlidXRlcyBmb3IgYmF0Y2ggaW5wdXQgd2l0aCBvcHRpb25zLlxuICAgICAqIEBqYSDlsZ7mgKfjga7kuIDmi6zoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCB1cGRhdGUgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg5pu05paw5bGe5oCnXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBhdHRyaWJ1dGVzIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOWxnuaAp+abtOaWsOeUqOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXRBdHRyaWJ1dGVzPEEgZXh0ZW5kcyBUPihhdHRyaWJ1dGVzOiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+LCBvcHRpb25zPzogTW9kZWxTZXRPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgc2lsZW50LCBleHRlbmQgfSA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hdHRycy5zdXNwZW5kKHRydWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzW192YWxpZGF0ZV0oYXR0cmlidXRlcywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoRkFJTEVEKHJlc3VsdC5jb2RlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgT2JqZWN0LmtleXMoYXR0cmlidXRlcykpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXR0ciBpbiB0aGlzLl9hdHRycykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9hdHRyc1thdHRyXSA9IGF0dHJpYnV0ZXNbYXR0cl07XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChleHRlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfZGVmaW5lQXR0cmlidXRlc10odGhpcywgYXR0cik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzW2F0dHJdID0gYXR0cmlidXRlc1thdHRyXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBpZiAoc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYXR0cnMucmVzdW1lKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgYWxsIGF0dHJpYnV0ZXMgb24gdGhlIFtbTW9kZWxdXS4gKHNldCBgdW5kZWZpbmVkYClcbiAgICAgKiBAamEgW1tNb2RlbF1dIOOBi+OCieOBmeOBueOBpuOBruWxnuaAp+OCkuWJiumZpCAoYHVuZGVmaW5lZGAg44KS6Kit5a6aKVxuICAgICAqL1xuICAgIHB1YmxpYyBjbGVhcihvcHRpb25zPzogTW9kZWxTZXRPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGNsZWFyQXR0cnMgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIE9iamVjdC5rZXlzKHRoaXMuX2Jhc2VBdHRycykpIHtcbiAgICAgICAgICAgIGNsZWFyQXR0cnNbYXR0cl0gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0QXR0cmlidXRlcyhjbGVhckF0dHJzLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGEgY29weSBvZiB0aGUgbW9kZWwncyBgYXR0cmlidXRlc2Agb2JqZWN0LlxuICAgICAqIEBqYSDjg6Ljg4fjg6vlsZ7mgKflgKTjga7jgrPjg5Tjg7zjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgdG9KU09OKCk6IFQge1xuICAgICAgICByZXR1cm4gZGVlcENvcHkoeyAuLi50aGlzLl9hdHRycyB9IGFzIFQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBjaGFuZ2VkIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIOWkieabtOOBleOCjOOBn+WxnuaAp+WApOOCkuaMgeOBpOOBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZVxuICAgICAqICAtIGBlbmAgY2hlY2tlZCBhdHRyaWJ1dGVcbiAgICAgKiAgLSBgamFgIOaknOiovOOBmeOCi+WxnuaAp1xuICAgICAqL1xuICAgIHB1YmxpYyBoYXNDaGFuZ2VkKGF0dHJpYnV0ZT86IGtleW9mIFQpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKG51bGwgPT0gYXR0cmlidXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gIWlzRW1wdHlPYmplY3QodGhpcy5fY2hhbmdlZEF0dHJzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBhdHRyaWJ1dGUgaW4gdGhpcy5fY2hhbmdlZEF0dHJzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBhbiBvYmplY3QgY29udGFpbmluZyBhbGwgdGhlIGF0dHJpYnV0ZXMgdGhhdCBoYXZlIGNoYW5nZWQsIG9yIGB1bmRlZmluZWRgIGlmIHRoZXJlIGFyZSBubyBjaGFuZ2VkIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIOWFpeWKm+OBl+OBnyBhdHRyaWJ1dGVzIOWApOOBruW3ruWIhuOBq+WvvuOBl+OBpuWkieabtOOBjOOBguOCi+WxnuaAp+WApOOCkui/lOWNtC4g5beu5YiG44GM44Gq44GE5aC05ZCI44GvIGB1bmRlZmllbmRgIOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIGNoZWNrZWQgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg5qSc6Ki844GZ44KL5bGe5oCnXG4gICAgICovXG4gICAgcHVibGljIGNoYW5nZWQoYXR0cmlidXRlcz86IFBhcnRpYWw8VD4pOiBQYXJ0aWFsPFQ+IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKCFhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oYXNDaGFuZ2VkKCkgPyB7IC4uLnRoaXMuX2NoYW5nZWRBdHRycyB9IDogdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgY2hhbmdlZCA9IGRpZmYodGhpcy5fYXR0cnMgYXMgYW55LCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIHJldHVybiAhaXNFbXB0eU9iamVjdChjaGFuZ2VkKSA/IGNoYW5nZWQgOiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBwcmV2aW91cyB2YWx1ZSBvZiBhbiBhdHRyaWJ1dGUsIHJlY29yZGVkIGF0IHRoZSB0aW1lIHRoZSBsYXN0IGBAY2hhbmdlYCBldmVudCB3YXMgZmlyZWQuXG4gICAgICogQGphIGBAY2hhbmdlYCDjgYznmbrngavjgZXjgozjgZ/liY3jga7lsZ7mgKflgKTjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJldmlvdXM8SyBleHRlbmRzIGtleW9mIFQ+KGF0dHJpYnV0ZTogSyk6IFRbS10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcHJldkF0dHJzW2F0dHJpYnV0ZV07XG4gICAgfVxufVxuXG5leHBvcnQgeyBNb2RlbCBhcyBNb2RlbEJhc2UgfTtcblxuLypcbiBQUk9HUkVTUzpcblxu4pePIEV2ZW50c1xu4piGIG9uXG7imIYgb2ZmXG7imIYgdHJpZ2dlclxu4piGIG9uY2VcbuKYhiBsaXN0ZW5Ub1xu4piGIHN0b3BMaXN0ZW5pbmdcbuKYhiBsaXN0ZW5Ub09uY2Vcblxu4pePIE1vZGVsXG7imIYgZXh0ZW5kXG7imIYgcHJlaW5pdGlhbGl6ZVxu4piGIGNvbnN0cnVjdG9yIC8gaW5pdGlhbGl6ZVxu4piGIGdldFxu4piGIHNldFxu4piGIGVzY2FwZVxu4piGIGhhc1xu4pazIHVuc2V0XG7imIYgY2xlYXJcbuKYhiBpZFxu4piGIGlkQXR0cmlidXRlXG7imIYgY2lkXG7ilrMgYXR0cmlidXRlc1xu4pazIGNoYW5nZWRcbuKWsyBkZWZhdWx0c1xu4piGIHRvSlNPTlxu4piFIHN5bmNcbuKYhSBmZXRjaFxu4piFIHNhdmVcbuKYhSBkZXN0cm95XG5cbuKXjyBVbmRlcnNjb3JlXG7imIYgdmFsaWRhdGVcbuKWsyB2YWxpZGF0aW9uRXJyb3JcbuKYhiBpc1ZhbGlkXG7imIUgdXJsXG7imIUgdXJsUm9vdFxu4piFIHBhcnNlXG7imIUgY2xvbmVcbuKYhSBpc05ld1xu4piGIGhhc0NoYW5nZWRcbuKYhiBjaGFuZ2VkQXR0cmlidXRlc1xu4piGIHByZXZpb3VzXG7ilrMgcHJldmlvdXNBdHRyaWJ1dGVzXG4gKi9cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7QUFFQSxnREFhQztBQWJEOzs7OztJQVVJO0lBQUE7UUFDSSxvREFBeUIsWUFBQSxrQkFBa0IsZ0JBQXVCLGlCQUF3QixDQUFDLEVBQUUsZUFBZSxDQUFDLDRCQUFBLENBQUE7S0FDaEgsSUFBQTtDQUNKLElBQUE7O0FDZkQ7QUFFQSxBQW9DQSxNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMzQyxNQUFNLFNBQVMsR0FBVyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDN0MsTUFBTSxjQUFjLEdBQU0sTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzdDLE1BQU0sT0FBTyxHQUFhLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMzQyxNQUFNLFdBQVcsR0FBUyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7Ozs7O0FBZ0IvQyxNQUFhLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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
