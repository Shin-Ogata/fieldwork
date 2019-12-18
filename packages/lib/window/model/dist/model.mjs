/*!
 * @cdp/model 0.9.0
 *   generic model scheme
 */

import { luid, escapeHTML } from '@cdp/core-utils';
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
class Model {
    /**
     * constructor
     *
     * @param attributes
     *  - `en` initial attribute values
     *  - `ja` 属性の初期値を指定
     */
    constructor(attributes, options) {
        const opts = Object.assign({ idAttribute: 'id' }, options);
        const props = {
            attrs: ObservableObject.from(attributes),
            baseAttrs: { ...attributes },
            prevAttrs: { ...attributes },
            idAttribute: opts.idAttribute,
            cid: luid('model:', 8),
        };
        Object.defineProperty(this, _properties, { value: Object.seal(props) });
        for (const key of Object.keys(attributes)) {
            this[_defineAttributes](this, key);
        }
        this[_changeHandler] = () => {
            this.trigger('change', { ...this._attrs });
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
                    this._prevAttrs[name] = this._attrs[name];
                    this._attrs[name] = val;
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
     * @en Get internal content ID.
     * @ja 内部のコンテンツ ID を取得
     */
    get _cid() {
        return this[_properties].cid;
    }
    ///////////////////////////////////////////////////////////////////////
    // operations: events
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
        this._attrs.trigger(channel, ...args);
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
        if ('change' === channel) {
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
                    this.trigger('invalid', attrs, result);
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
}
/*
 PROGRESS:

● Events
☆ on
☆ off
☆ trigger
☆ once
★ listenTo
★ stopListening
★ listenToOnce

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
★ changed
△ defaults
★ toJSON
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
★ hasChanged
★ changedAttributes
△ previous
★ previousAttributes
 */

export { Model as ModelBase, RESULT_VALID_ATTRS };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwubWpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwiYmFzZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC1wbHVzLW9wZXJhbmRzICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIE1PREVMID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8temAmuOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfREFUQSA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLk1PREVMICsgMSwgJ2ludmFsaWQgZGF0YS4nKSxcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7XG4gICAgQXJndW1lbnRzLFxuICAgIGx1aWQsXG4gICAgZXNjYXBlSFRNTCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiwgU2lsZW5jZWFibGUgfSBmcm9tICdAY2RwL2V2ZW50LXB1Ymxpc2hlcic7XG5pbXBvcnQgeyBPYnNlcnZhYmxlT2JqZWN0IH0gZnJvbSAnQGNkcC9vYnNlcnZhYmxlJztcbmltcG9ydCB7XG4gICAgUkVTVUxUX0NPREUsXG4gICAgUmVzdWx0LFxuICAgIG1ha2VSZXN1bHQsXG4gICAgU1VDQ0VFREVELFxuICAgIEZBSUxFRCxcbn0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICBNb2RlbEV2ZW50LFxuICAgIE1vZGVsVmFsaWRhdGVBdHRyaWJ1dGVPcHRpb25zLFxuICAgIE1vZGVsQXR0cmlidXRlSW5wdXQsXG4gICAgTW9kZWxTZXRPcHRpb25zLFxuICAgIE1vZGVsQ29uc3RydWN0aW9uT3B0aW9ucyxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuY29uc3QgX2RlZmluZUF0dHJpYnV0ZXMgPSBTeW1ib2woJ2RlZmluZScpO1xuY29uc3QgX3ZhbGlkYXRlICAgICAgICAgPSBTeW1ib2woJ3ZhbGlkYXRlJyk7XG5jb25zdCBfY2hhbmdlSGFuZGxlciAgICA9IFN5bWJvbCgnb25jaGFuZ2UnKTtcbmNvbnN0IF9wcm9wZXJ0aWVzICAgICAgID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eTxUPiB7XG4gICAgYXR0cnM6IE9ic2VydmFibGVPYmplY3Q7XG4gICAgYmFzZUF0dHJzOiBUO1xuICAgIHByZXZBdHRyczogVDtcbiAgICByZWFkb25seSBpZEF0dHJpYnV0ZTogc3RyaW5nO1xuICAgIHJlYWRvbmx5IGNpZDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBlbiBWYWxpZCBhdHRyaWJ1dGVzIHJlc3VsdC5cbiAqIEBqYSDlsZ7mgKfmpJzoqLzjga7mnInlirnlgKRcbiAqL1xuZXhwb3J0IGNvbnN0IFJFU1VMVF9WQUxJRF9BVFRSUyA9IE9iamVjdC5mcmVlemUobWFrZVJlc3VsdChSRVNVTFRfQ09ERS5TVUNDRVNTLCAndmFsaWQgYXR0cmlidXRlLicpKTtcblxuLyoqXG4gKiBAZW4gW1tNb2RlbF1dIGJhc2UgY2xhc3MgZGVmaW5pdGlvbi5cbiAqIEBqYSBbW01vZGVsXV0g44Gu5Z+65bqV44Kv44Op44K55a6a576pXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBNb2RlbEJhc2UsIE1vZGVsQ29uc3RydWN0b3IgfSBmcm9tICdAY2RwL21vZGVsJztcbiAqXG4gKiBpbnRlcmZhY2UgQ29udGVudEF0dHJpYnV0ZSB7XG4gKiAgIHVyaTogc3RyaW5nO1xuICogICByZWFkb25seSBzaXplOiBudW1iZXI7XG4gKiAgIGNvb2tpZT86IHN0cmluZztcbiAqIH1cbiAqIGBgYFxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogLy8gZWFybHkgY2FzdFxuICogY29uc3QgTW9kZSA9IE1vZGVsQmFzZSBhcyBNb2RlbENvbnN0cnVjdG9yPE1vZGVsQmFzZTxDb250ZW50QXR0cmlidXRlPiwgQ29udGVudEF0dHJpYnV0ZT47XG4gKlxuICogY2xhc3MgQ29udGVudCBleHRlbmRzIE1vZGVsIHtcbiAqICAgY29uc3RydWN0b3IoYXR0cnM6IENvbnRlbnRBdHRyaWJ1dGUpIHtcbiAqICAgICBzdXBlcihhdHRycyk7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIG9yXG4gKlxuICogYGBgdHNcbiAqIGNsYXNzIENvbnRlbnRCYXNlIGV4dGVuZHMgTW9kZWxCYXNlPENvbnRlbnRBdHRyaWJ1dGU+IHtcbiAqICAgY29uc3RydWN0b3IoYXR0cnM6IENvbnRlbnRBdHRyaWJ1dGUpIHtcbiAqICAgICBzdXBlcihhdHRycyk7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiAvLyBsYXRlIGNhc3RcbiAqIGNvbnN0IENvbnRlbnQgPSBDb250ZW50QmFzZSBhcyBNb2RlbENvbnN0cnVjdG9yPENvbnRlbnQsIENvbnRlbnRBdHRyaWJ1dGU+O1xuICogYGBgXG4gKiB0aGVuXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGNvbnRlbnQgPSBuZXcgQ29udGVudCh7XG4gKiAgIHVyaTogJ2FhYS50eHQnLFxuICogICBzaXplOiAxMCxcbiAqICAgY29va2llOiB1bmRlZmluZWQsIC8vIG5lZWQgZXhwbGljaXQgYXNzaWduXG4gKiB9KTtcbiAqXG4gKiBjb25zb2xlLmxvZyhjb250ZW50LnVyaSk7ICAgIC8vICdhYWEudHh0J1xuICogY29uc29sZS5sb2coY29udGVudC5zaXplKTsgICAvLyAnMTAnXG4gKiBjb25zb2xlLmxvZyhjb250ZW50LmNvb2tpZSk7IC8vICd1bmRlZmluZWQnXG4gKiBgYGBcbiAqXG4gKiAtIFVzaW5nIEN1c3RvbSBFdmVudFxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBNb2RlbEV2ZW50IH0gZnJvbSAnQGNkcC9tb2RlbCc7XG4gKlxuICogaW50ZXJmYWNlIEN1c3RvbUV2ZW50IGV4dGVuZHMgTW9kZWxFdmVudDxDb250ZW50QXR0cmlidXRlPiB7XG4gKiAgIGZpcmU6IFtib29sZWFuLCBudW1iZXJdO1xuICogfVxuICogXG4gKiA6XG4gKlxuICogLy8gZWFybHkgY2FzdFxuICogY29uc3QgTW9kZSA9IE1vZGVsQmFzZSBhcyBNb2RlbENvbnN0cnVjdG9yPE1vZGVsQmFzZTxDb250ZW50QXR0cmlidXRlLCBDdXN0b21FdmVudD4sIENvbnRlbnRBdHRyaWJ1dGU+O1xuICpcbiAqIC8vIGxhdGUgY2FzdFxuICogY2xhc3MgQ29udGVudEJhc2UgZXh0ZW5kcyBNb2RlbEJhc2U8Q29udGVudEF0dHJpYnV0ZSwgQ3VzdG9tRXZlbnQ+IHtcbiAqICAgOlxuICogfVxuICpcbiAqIGNvbnN0IGNvbnRlbnQgPSBuZXcgQ29udGVudCh7IC4uLiB9KTtcbiAqIGNvbnRlbnQudHJpZ2dlcignZmlyZScsIHRydWUsIDEwMCk7XG4gKiBgYGBcbiAqL1xuYWJzdHJhY3QgY2xhc3MgTW9kZWw8VCBleHRlbmRzIHt9ID0ge30sIEV2ZW50IGV4dGVuZHMgTW9kZWxFdmVudDxUPiA9IE1vZGVsRXZlbnQ8VD4+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gQXR0cmlidXRlcyBwb29sXG4gICAgICogQGphIOWxnuaAp+agvOe0jemgmOWfn1xuICAgICAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXTogUHJvcGVydHk8VD47XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgYXR0cmlidXRlIHZhbHVlc1xuICAgICAqICAtIGBqYWAg5bGe5oCn44Gu5Yid5pyf5YCk44KS5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlczogUmVxdWlyZWQ8VD4sIG9wdGlvbnM/OiBNb2RlbENvbnN0cnVjdGlvbk9wdGlvbnM8VD4pIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBpZEF0dHJpYnV0ZTogJ2lkJyB9LCBvcHRpb25zKTtcblxuICAgICAgICBjb25zdCBwcm9wczogUHJvcGVydHk8VD4gPSB7XG4gICAgICAgICAgICBhdHRyczogT2JzZXJ2YWJsZU9iamVjdC5mcm9tKGF0dHJpYnV0ZXMpLFxuICAgICAgICAgICAgYmFzZUF0dHJzOiB7IC4uLmF0dHJpYnV0ZXMgfSxcbiAgICAgICAgICAgIHByZXZBdHRyczogeyAuLi5hdHRyaWJ1dGVzIH0sXG4gICAgICAgICAgICBpZEF0dHJpYnV0ZTogb3B0cy5pZEF0dHJpYnV0ZSxcbiAgICAgICAgICAgIGNpZDogbHVpZCgnbW9kZWw6JywgOCksXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBfcHJvcGVydGllcywgeyB2YWx1ZTogT2JqZWN0LnNlYWwocHJvcHMpIH0pO1xuXG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGF0dHJpYnV0ZXMpKSB7XG4gICAgICAgICAgICB0aGlzW19kZWZpbmVBdHRyaWJ1dGVzXSh0aGlzLCBrZXkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpc1tfY2hhbmdlSGFuZGxlcl0gPSAoKSA9PiB7XG4gICAgICAgICAgICAodGhpcyBhcyBhbnkpLnRyaWdnZXIoJ2NoYW5nZScsIHsgLi4udGhpcy5fYXR0cnMgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpc1tfdmFsaWRhdGVdKHt9LCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGF0dHJpYnV0ZSBicmlkZ2UgZGVmICovXG4gICAgcHJpdmF0ZSBbX2RlZmluZUF0dHJpYnV0ZXNdKGluc3RhbmNlOiBhbnksIG5hbWU6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb25zdCBwcm90byA9IGluc3RhbmNlLmNvbnN0cnVjdG9yLnByb3RvdHlwZTtcbiAgICAgICAgaWYgKCEobmFtZSBpbiBwcm90bykpIHtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgbmFtZSwge1xuICAgICAgICAgICAgICAgIGdldCgpOiB1bmtub3duIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2F0dHJzW25hbWVdO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2V0KHZhbDogdW5rbm93bik6IHZvaWQge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcmV2QXR0cnNbbmFtZV0gPSB0aGlzLl9hdHRyc1tuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYXR0cnNbbmFtZV0gICAgID0gdmFsO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBwdWJsaWMgcHJvcGVydGllc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjb250ZW50IElELlxuICAgICAqIEBqYSDjgrPjg7Pjg4bjg7Pjg4QgSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IHsgaWRBdHRyaWJ1dGUsIGNpZCwgYXR0cnMgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gKGlkQXR0cmlidXRlIGluIGF0dHJzKSA/IGF0dHJzW2lkQXR0cmlidXRlXSA6IGNpZDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogcHJvdGVjdGVkIHByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2F0dHJzKCk6IE9ic2VydmFibGVPYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uYXR0cnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlZmF1bHQgYXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDml6LlrprlgKTlsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9iYXNlQXR0cnMoKTogVCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5iYXNlQXR0cnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFByZXZpb3VzIGF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5aSJ5pu05YmN44Gu5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcHJldkF0dHJzKCk6IFQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucHJldkF0dHJzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgaW50ZXJuYWwgY29udGVudCBJRC5cbiAgICAgKiBAamEg5YaF6YOo44Gu44Kz44Oz44OG44Oz44OEIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2NpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY2lkO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IGV2ZW50c1xuXG4gICAgLyoqXG4gICAgICogQGVuIE5vdGlmeSBldmVudCB0byBjbGllbnRzLlxuICAgICAqIEBqYSBldmVudCDnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgavmuKHjgZnlvJXmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgdHJpZ2dlcjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwsIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj4pOiB2b2lkIHtcbiAgICAgICAgKHRoaXMuX2F0dHJzIGFzIGFueSkudHJpZ2dlcihjaGFubmVsLCAuLi5hcmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm6Kej6ZmkXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbD86IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYXR0cnMub2ZmKGNoYW5uZWwgYXMgYW55LCBsaXN0ZW5lciBhcyBhbnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBvbjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGlmICgnY2hhbmdlJyA9PT0gY2hhbm5lbCkge1xuICAgICAgICAgICAgdGhpcy5fYXR0cnMub24oJyonLCB0aGlzW19jaGFuZ2VIYW5kbGVyXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2F0dHJzLm9uKGNoYW5uZWwgYXMgYW55LCBsaXN0ZW5lciBhcyBhbnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykgYnV0IGl0IGNhdXNlcyB0aGUgYm91bmQgY2FsbGJhY2sgdG8gb25seSBmaXJlIG9uY2UgYmVmb3JlIGJlaW5nIHJlbW92ZWQuXG4gICAgICogQGphIOS4gOW6puOBoOOBkeODj+ODs+ODieODquODs+OCsOWPr+iDveOBquOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBvbmNlPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMub24oY2hhbm5lbCwgbGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBtYW5hZ2VkID0gdGhpcy5vbihjaGFubmVsLCAoKSA9PiB7XG4gICAgICAgICAgICBjb250ZXh0LnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICBtYW5hZ2VkLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiB2YWxpZGF0aW9uXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdmFsaWQgb3Igbm90LlxuICAgICAqIEBqYSDmpJzoqLzjga7miJDlkKbjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaXNWYWxpZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIFNVQ0NFRURFRCh0aGlzLnZhbGlkYXRlKHsgc2lsZW50OiB0cnVlIH0pLmNvZGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBWYWxpZGF0ZSByZXN1bHQgYWNjZXNzZXIuXG4gICAgICogQGphIOaknOiovOe1kOaenOOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyB2YWxpZGF0ZShvcHRpb25zPzogU2lsZW5jZWFibGUpOiBSZXN1bHQge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHZhbGlkYXRlOiB0cnVlLCBub1Rocm93OiB0cnVlLCBleHRlbmQ6IGZhbHNlIH0sIG9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gdGhpc1tfdmFsaWRhdGVdKHt9LCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuICAgIC8qKlxuICAgICAqIEBlbiBWYWxpZGF0ZSBkYXRhIG1ldGhvZC5cbiAgICAgKiBAamEg44OH44O844K/5qSc6Ki8XG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCB2YWxpZGF0ZWUgYXR0cmlidXRlc1xuICAgICAqICAtIGBqYWAg6KKr5qSc6Ki85bGe5oCnXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHZhbGlkYXRlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOaknOiovOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHByb3RlY3RlZCB2YWxpZGF0ZUF0dHJpYnV0ZXM8QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4sIG9wdGlvbnM/OiBNb2RlbFZhbGlkYXRlQXR0cmlidXRlT3B0aW9ucyk6IFJlc3VsdCB7XG4gICAgICAgIHJldHVybiBSRVNVTFRfVkFMSURfQVRUUlM7XG4gICAgfVxuXG4gICAgLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMgKi9cblxuICAgIC8qKiBAaW50ZXJuYWwgdmFsaWRhdGUgKi9cbiAgICBwcml2YXRlIFtfdmFsaWRhdGVdPEEgZXh0ZW5kcyBUPihhdHRyaWJ1dGVzOiBNb2RlbEF0dHJpYnV0ZUlucHV0PEE+LCBvcHRpb25zPzogTW9kZWxTZXRPcHRpb25zKTogUmVzdWx0IHwgbmV2ZXIge1xuICAgICAgICBjb25zdCB7IHZhbGlkYXRlLCBzaWxlbnQsIG5vVGhyb3cgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGlmICh2YWxpZGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgYXR0cnMgPSB7IC4uLnRoaXMuX2F0dHJzLCAuLi5hdHRyaWJ1dGVzIH07XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnZhbGlkYXRlQXR0cmlidXRlcyhhdHRycywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAoRkFJTEVEKHJlc3VsdC5jb2RlKSkge1xuICAgICAgICAgICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIGFueSkudHJpZ2dlcignaW52YWxpZCcsIGF0dHJzLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIW5vVGhyb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUkVTVUxUX1ZBTElEX0FUVFJTO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogYXR0cmlidXRlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBbW01vZGVsXV0gaGFzIHZhbGlkIHByb3BlcnR5LiAobm90IGBudWxsYCBvciBgdW5kZWZpbmVkYClcbiAgICAgKiBAamEgW1tNb2RlbF1dIOOBjOacieWKueOBquODl+ODreODkeODhuOCo+OCkuaMgeOBo+OBpuOBhOOCi+OBi+eiuuiqjSAoYG51bGxgIOOBvuOBn+OBryBgdW5kZWZpbmVkYCDjgafjgarjgYQpXG4gICAgICovXG4gICAgcHVibGljIGhhcyhhdHRyaWJ1dGU6IGtleW9mIFQpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gKHRoaXMuX2F0dHJzIGFzIGFueSlbYXR0cmlidXRlXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBIVE1MLWVzY2FwZWQgdmFsdWUgb2YgYW4gYXR0cmlidXRlLlxuICAgICAqIEBqYSBIVE1MIOOBp+S9v+eUqOOBmeOCi+aWh+Wtl+OCkuWItuW+oeaWh+Wtl+OBq+e9ruaPm+OBl+OBn+WxnuaAp+WApOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBlc2NhcGUoYXR0cmlidXRlOiBrZXlvZiBUKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIGVzY2FwZUhUTUwoKHRoaXMuX2F0dHJzIGFzIGFueSlbYXR0cmlidXRlXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVwZGF0ZSBhdHRyaWJ1dGVzIGZvciBiYXRjaCBpbnB1dCB3aXRoIG9wdGlvbnMuXG4gICAgICogQGphIOWxnuaAp+OBruS4gOaLrOioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIHVwZGF0ZSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGphYCDmm7TmlrDlsZ7mgKdcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2V0IGF0dHJpYnV0ZXMgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg5bGe5oCn5pu05paw55So44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldEF0dHJpYnV0ZXM8QSBleHRlbmRzIFQ+KGF0dHJpYnV0ZXM6IE1vZGVsQXR0cmlidXRlSW5wdXQ8QT4sIG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBzaWxlbnQsIGV4dGVuZCB9ID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHNpbGVudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzLnN1c3BlbmQodHJ1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXNbX3ZhbGlkYXRlXShhdHRyaWJ1dGVzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChGQUlMRUQocmVzdWx0LmNvZGUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgYXR0ciBvZiBPYmplY3Qua2V5cyhhdHRyaWJ1dGVzKSkge1xuICAgICAgICAgICAgICAgIGlmIChhdHRyIGluIHRoaXMuX2F0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2F0dHJzW2F0dHJdID0gYXR0cmlidXRlc1thdHRyXTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGV4dGVuZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW19kZWZpbmVBdHRyaWJ1dGVzXSh0aGlzLCBhdHRyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYXR0cnNbYXR0cl0gPSBhdHRyaWJ1dGVzW2F0dHJdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGlmIChzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hdHRycy5yZXN1bWUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBhbGwgYXR0cmlidXRlcyBvbiB0aGUgW1tNb2RlbF1dLiAoc2V0IGB1bmRlZmluZWRgKVxuICAgICAqIEBqYSBbW01vZGVsXV0g44GL44KJ44GZ44G544Gm44Gu5bGe5oCn44KS5YmK6ZmkIChgdW5kZWZpbmVkYCDjgpLoqK3lrpopXG4gICAgICovXG4gICAgcHVibGljIGNsZWFyKG9wdGlvbnM/OiBNb2RlbFNldE9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgY2xlYXJBdHRycyA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgT2JqZWN0LmtleXModGhpcy5fYmFzZUF0dHJzKSkge1xuICAgICAgICAgICAgY2xlYXJBdHRyc1thdHRyXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5zZXRBdHRyaWJ1dGVzKGNsZWFyQXR0cnMsIG9wdGlvbnMpO1xuICAgIH1cbn1cblxuZXhwb3J0IHsgTW9kZWwgYXMgTW9kZWxCYXNlIH07XG5cbi8qXG4gUFJPR1JFU1M6XG5cbuKXjyBFdmVudHNcbuKYhiBvblxu4piGIG9mZlxu4piGIHRyaWdnZXJcbuKYhiBvbmNlXG7imIUgbGlzdGVuVG9cbuKYhSBzdG9wTGlzdGVuaW5nXG7imIUgbGlzdGVuVG9PbmNlXG5cbuKXjyBNb2RlbFxu4piGIGV4dGVuZFxu4piGIHByZWluaXRpYWxpemVcbuKYhiBjb25zdHJ1Y3RvciAvIGluaXRpYWxpemVcbuKYhiBnZXRcbuKYhiBzZXRcbuKYhiBlc2NhcGVcbuKYhiBoYXNcbuKWsyB1bnNldFxu4piGIGNsZWFyXG7imIYgaWRcbuKYhiBpZEF0dHJpYnV0ZVxu4piGIGNpZFxu4pazIGF0dHJpYnV0ZXNcbuKYhSBjaGFuZ2VkXG7ilrMgZGVmYXVsdHNcbuKYhSB0b0pTT05cbuKYhSBzeW5jXG7imIUgZmV0Y2hcbuKYhSBzYXZlXG7imIUgZGVzdHJveVxuXG7il48gVW5kZXJzY29yZVxu4piGIHZhbGlkYXRlXG7ilrMgdmFsaWRhdGlvbkVycm9yXG7imIYgaXNWYWxpZFxu4piFIHVybFxu4piFIHVybFJvb3RcbuKYhSBwYXJzZVxu4piFIGNsb25lXG7imIUgaXNOZXdcbuKYhSBoYXNDaGFuZ2VkXG7imIUgY2hhbmdlZEF0dHJpYnV0ZXNcbuKWsyBwcmV2aW91c1xu4piFIHByZXZpb3VzQXR0cmlidXRlc1xuICovXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7QUFFQSxnREFhQztBQWJEOzs7OztJQVVJO0lBQUE7UUFDSSxvREFBeUIsWUFBQSxrQkFBa0IsZ0JBQXVCLGlCQUF3QixDQUFDLEVBQUUsZUFBZSxDQUFDLDRCQUFBLENBQUE7S0FDaEgsSUFBQTtDQUNKLElBQUE7O0FDZkQ7QUFFQSxBQXNCQSxNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMzQyxNQUFNLFNBQVMsR0FBVyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDN0MsTUFBTSxjQUFjLEdBQU0sTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzdDLE1BQU0sV0FBVyxHQUFTLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQzs7Ozs7QUFlL0MsTUFBYSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWdGckcsTUFBZSxLQUFLOzs7Ozs7OztJQWNoQixZQUFZLFVBQXVCLEVBQUUsT0FBcUM7UUFDdEUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUUzRCxNQUFNLEtBQUssR0FBZ0I7WUFDdkIsS0FBSyxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDeEMsU0FBUyxFQUFFLEVBQUUsR0FBRyxVQUFVLEVBQUU7WUFDNUIsU0FBUyxFQUFFLEVBQUUsR0FBRyxVQUFVLEVBQUU7WUFDNUIsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzdCLEdBQUcsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztTQUN6QixDQUFDO1FBQ0YsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXhFLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUN2QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDdEM7UUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUc7WUFDbEIsSUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1NBQ3ZELENBQUM7UUFFRixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQzdCOztJQUdPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxRQUFhLEVBQUUsSUFBWTtRQUNuRCxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQztRQUM3QyxJQUFJLEVBQUUsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFO1lBQ2xCLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRTtnQkFDL0IsR0FBRztvQkFDQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQzVCO2dCQUNELEdBQUcsQ0FBQyxHQUFZO29CQUNaLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBTyxHQUFHLENBQUM7aUJBQy9CO2dCQUNELFVBQVUsRUFBRSxJQUFJO2dCQUNoQixZQUFZLEVBQUUsSUFBSTthQUNyQixDQUFDLENBQUM7U0FDTjtLQUNKOzs7Ozs7O0lBU0QsSUFBSSxFQUFFO1FBQ0YsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3RELE9BQU8sQ0FBQyxXQUFXLElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxHQUFHLENBQUM7S0FDNUQ7Ozs7Ozs7SUFTRCxJQUFjLE1BQU07UUFDaEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQ2xDOzs7OztJQU1ELElBQWMsVUFBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLENBQUM7S0FDdEM7Ozs7O0lBTUQsSUFBYyxVQUFVO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsQ0FBQztLQUN0Qzs7Ozs7SUFNRCxJQUFjLElBQUk7UUFDZCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUM7S0FDaEM7Ozs7Ozs7Ozs7Ozs7O0lBZ0JNLE9BQU8sQ0FBOEIsT0FBZ0IsRUFBRSxHQUFHLElBQXdDO1FBQ3BHLElBQUksQ0FBQyxNQUFjLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0tBQ2xEOzs7Ozs7Ozs7Ozs7Ozs7O0lBaUJNLEdBQUcsQ0FBOEIsT0FBNkIsRUFBRSxRQUEwRDtRQUM3SCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFjLEVBQUUsUUFBZSxDQUFDLENBQUM7S0FDcEQ7Ozs7Ozs7Ozs7OztJQWFNLEVBQUUsQ0FBOEIsT0FBNEIsRUFBRSxRQUF5RDtRQUMxSCxJQUFJLFFBQVEsS0FBSyxPQUFPLEVBQUU7WUFDdEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1NBQzdDO1FBQ0QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFjLEVBQUUsUUFBZSxDQUFDLENBQUM7S0FDMUQ7Ozs7Ozs7Ozs7OztJQWFNLElBQUksQ0FBOEIsT0FBNEIsRUFBRSxRQUF5RDtRQUM1SCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMzQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRTtZQUM3QixPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO1NBQ3pCLENBQUMsQ0FBQztRQUNILE9BQU8sT0FBTyxDQUFDO0tBQ2xCOzs7Ozs7O0lBU0QsSUFBSSxPQUFPO1FBQ1AsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQzFEOzs7OztJQU1NLFFBQVEsQ0FBQyxPQUFxQjtRQUNqQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDcEM7Ozs7Ozs7Ozs7Ozs7OztJQWlCUyxrQkFBa0IsQ0FBYyxVQUFrQyxFQUFFLE9BQXVDO1FBQ2pILE9BQU8sa0JBQWtCLENBQUM7S0FDN0I7OztJQUtPLENBQUMsU0FBUyxDQUFDLENBQWMsVUFBa0MsRUFBRSxPQUF5QjtRQUMxRixNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO1FBQ3BELElBQUksUUFBUSxFQUFFO1lBQ1YsTUFBTSxLQUFLLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxVQUFVLEVBQUUsQ0FBQztZQUNoRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3ZELElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDckIsSUFBSSxDQUFDLE1BQU0sRUFBRTtvQkFDUixJQUFZLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7aUJBQ25EO2dCQUNELElBQUksQ0FBQyxPQUFPLEVBQUU7b0JBQ1YsTUFBTSxNQUFNLENBQUM7aUJBQ2hCO2FBQ0o7WUFDRCxPQUFPLE1BQU0sQ0FBQztTQUNqQjthQUFNO1lBQ0gsT0FBTyxrQkFBa0IsQ0FBQztTQUM3QjtLQUNKOzs7Ozs7O0lBU00sR0FBRyxDQUFDLFNBQWtCO1FBQ3pCLE9BQU8sSUFBSSxJQUFLLElBQUksQ0FBQyxNQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDbEQ7Ozs7O0lBTU0sTUFBTSxDQUFDLFNBQWtCO1FBQzVCLE9BQU8sVUFBVSxDQUFFLElBQUksQ0FBQyxNQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztLQUN0RDs7Ozs7Ozs7Ozs7O0lBYU0sYUFBYSxDQUFjLFVBQWtDLEVBQUUsT0FBeUI7UUFDM0YsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO1FBRXpDLElBQUk7WUFDQSxJQUFJLE1BQU0sRUFBRTtnQkFDUixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUM3QjtZQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDcEQsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNyQixPQUFPLElBQUksQ0FBQzthQUNmO1lBRUQsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUN4QyxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO29CQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDeEM7cUJBQU0sSUFBSSxNQUFNLEVBQUU7b0JBQ2YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUNwQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDeEM7YUFDSjtTQUNKO2dCQUFTO1lBQ04sSUFBSSxNQUFNLEVBQUU7Z0JBQ1IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUN4QjtTQUNKO1FBRUQsT0FBTyxJQUFJLENBQUM7S0FDZjs7Ozs7SUFNTSxLQUFLLENBQUMsT0FBeUI7UUFDbEMsTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDO1FBQ3RCLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDN0MsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQztTQUNoQztRQUNELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDbEQ7Q0FDSjtBQUVELEFBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBK0NHOzs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9tb2RlbC8ifQ==
