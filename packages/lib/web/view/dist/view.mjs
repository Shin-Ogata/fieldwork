/*!
 * @cdp/view 0.9.19
 *   generic view scheme
 */

import { safe, mixins, drop, isEmptyObject, isFunction, luid } from '@cdp/core-utils';
import { EventSource } from '@cdp/events';
import { dom } from '@cdp/dom';

/** @internal */ const document = safe(globalThis.document);

/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */
/** @internal */ const _initialize = Symbol('init-internal');
/** @internal */ const _properties = Symbol('properties');
/** @internal */ const _ensureElement = Symbol('ensure-element');
/**
 * @en Core implementation of {@link View} without {@link EventSource} interface. <br>
 *     Can be specified as mixin source.
 * @ja {@link EventSource} インターフェイスを持たない {@link View} のコア実装 <br>
 *     Mixin source として指定可能
 */
class ViewCore {
    /** @internal */
    [_properties];
    ///////////////////////////////////////////////////////////////////////
    // construction/destruction:
    /**
     * constructor
     *
     * @param options
     *  - `en` construction options.
     *  - `ja` 構築オプション
     */
    constructor(options) {
        if (false !== options) {
            this[_initialize](options);
        }
    }
    /**
     * @en Release all listeners.
     * @ja すべてのリスナーを解除
     */
    release() {
        this.undelegateEvents();
        return this;
    }
    /**
     * @en Remove this view by taking the element out of the DOM with release all listeners.
     * @ja View から DOM を切り離し, リスナーを解除
     */
    remove() {
        this.release();
        this.$el.remove();
        return this;
    }
    ///////////////////////////////////////////////////////////////////////
    // accessor: attributes
    /**
     * @en Get content ID.
     * @ja コンテンツ ID を取得
     */
    get id() {
        const { cid, id } = this[_properties];
        return id ?? cid;
    }
    /**
     * @en Get element.
     * @ja 要素を取得
     */
    get el() {
        return this[_properties].$el[0];
    }
    /**
     * @en Get {@link DOM} object.
     * @ja {@link DOM} オブジェクトを取得
     */
    get $el() {
        return this[_properties].$el;
    }
    /**
     * @en Get internal content ID.
     * @ja 内部のコンテンツ ID を取得
     */
    get _cid() {
        return this[_properties].cid;
    }
    /**
     * @en Get default tag name.
     * @ja 既定のタグ名を取得
     */
    get _tagName() {
        return this[_properties].tagName;
    }
    /**
     * @en Attributes instance
     * @ja 属性を格納するインスタンス
     */
    get _attrs() {
        const { attributes, id, className } = this[_properties];
        return Object.assign(drop({ id, class: className }), attributes);
    }
    ///////////////////////////////////////////////////////////////////////
    // operation:
    /**
     * @en Change the view's element (`this.el` property) and re-delegate the view's events on the new element.
     * @ja View が管轄する要素 (`this.el` property) の変更. イベント再設定も実行
     *
     * @param el
     *  - `en` Object or the selector string which becomes origin of element.
     *  - `ja` 要素のもとになるオブジェクトまたはセレクタ文字列
     */
    setElement(el) {
        this.undelegateEvents();
        this[_properties].$el = dom(el);
        this.delegateEvents();
        return this;
    }
    /**
     * @en Set DOM callbacks from {@link ViewEventsHash} object.
     * @ja {@link ViewEventsHash} オブジェクトから DOM コールバックを設定
     *
     * @param events
     *  - `en` {@link ViewEventsHash} object. `this.events()` is used by default.
     *  - `ja` {@link ViewEventsHash} オブジェクト. 既定値は `this.events()`
     */
    delegateEvents(events) {
        const hash = events ?? this.events();
        if (isEmptyObject(hash)) {
            return this;
        }
        this.undelegateEvents();
        for (const key of Object.keys(hash)) {
            let method = hash[key];
            if (!isFunction(method)) {
                method = this[method];
            }
            if (!method) {
                continue;
            }
            const match = /^(\S+)\s*(.*)$/.exec(key);
            this.delegate(match[1], match[2], method.bind(this));
        }
        return this;
    }
    /**
     * @en Clears all callbacks previously bound to the view by `delegate`.
     * @ja `delegate` されたイベントをすべて削除
     */
    undelegateEvents() {
        this.$el?.off(`.${this._cid}`);
        return this;
    }
    delegate(type, ...args) {
        this.$el.on(`${type}.${this._cid}`, ...args);
        return this;
    }
    undelegate(type, ...args) {
        this.$el.off(`${type}.${this._cid}`, ...args);
        return this;
    }
    /**
     * @en Get the descendants of each element in the current set of matched elements, filtered by a selector.
     * @ja 配下の要素に対して指定したセレクタに一致する要素を検索
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of DOM.
     *  - `ja` DOM のもとになるインスタンス(群)またはセレクタ文字列
     */
    $(selector) {
        return this.$el.find(selector);
    }
    ///////////////////////////////////////////////////////////////////////
    // override:
    /**
     * @en The events hash (or method) can be used to specify a set of DOM events that will be bound to methods on your View through delegateEvents.
     * @ja イベントセレクタとコールバックのハッシュを定義し, ルートエンティティで捕捉する DOM イベントを指定
     *
     *
     * @example <br>
     *
     * ```ts
     * class SampleView extends View {
     *     protected events(): ViewEventsHash {
     *         return {
     *             'mousedown .title':  'edit',
     *             'click .button':     'save',
     *             'click .open':       function(e) { ... },
     *             'click .close':      this.onClose,
     *         };
     *     }
     * }
     * ```
     *
     * @override
     */
    events() {
        return Object.assign({}, this[_properties].events);
    }
    ///////////////////////////////////////////////////////////////////////
    // internal:
    /** @internal */
    [_initialize](options) {
        const { el, tagName, id, attributes, className, events } = options ?? {};
        this[_properties] = {
            cid: luid('view:', 8),
            events,
            id,
            className,
            attributes,
            tagName: tagName ?? 'div',
        };
        this[_ensureElement](el);
    }
    /** @internal */
    [_ensureElement](el) {
        if (!el) {
            const { _attrs, _tagName } = this;
            this.setElement(document.createElement(_tagName));
            this.$el.attr(_attrs);
        }
        else {
            this.setElement(el);
        }
    }
}
/** @internal {@link View} class */
class View extends (mixins(EventSource, ViewCore)) {
    /**
     * constructor
     *
     * @param options
     *  - `en` construction options.
     *  - `ja` 構築オプション
     */
    constructor(options) {
        super();
        this.super(ViewCore, false);
        this[_initialize](options);
    }
    /**
     * @en Release all listeners.
     * @ja すべてのリスナーを解除
     */
    release() {
        super.release();
        this.stopListening();
        this.off();
        return this;
    }
}
/**
 * @en Constructor of {@link View}
 * @ja {@link View} のコンストラクタ実体
 */
const _View = View;

export { _View as View, ViewCore };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlldy5tanMiLCJzb3VyY2VzIjpbInNzci50cyIsImJhc2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBkb2N1bWVudCA9IHNhZmUoZ2xvYmFsVGhpcy5kb2N1bWVudCk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICB0eXBlIENvbnN0cnVjdG9yLFxuICAgIHR5cGUgV3JpdGFibGUsXG4gICAgdHlwZSBOdWxsaXNoLFxuICAgIHR5cGUgUGxhaW5PYmplY3QsXG4gICAgdHlwZSBVbmtub3duRnVuY3Rpb24sXG4gICAgaXNGdW5jdGlvbixcbiAgICBpc0VtcHR5T2JqZWN0LFxuICAgIGx1aWQsXG4gICAgZHJvcCxcbiAgICBtaXhpbnMsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudFNvdXJjZSB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgdHlwZSBET00sXG4gICAgdHlwZSBET01TZWxlY3RvcixcbiAgICB0eXBlIERPTVJlc3VsdCxcbiAgICB0eXBlIERPTUV2ZW50TGlzdGVuZXIsXG4gICAgdHlwZSBET01FdmVudE1hcCxcbiAgICB0eXBlIEV2ZW50VHlwZSxcbiAgICB0eXBlIEV2ZW50VHlwZU9yTmFtZXNwYWNlLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQgdHlwZSB7IFZpZXdFdmVudHNIYXNoLCBWaWV3Q29uc3RydWN0aW9uT3B0aW9ucyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfaW5pdGlhbGl6ZSAgICA9IFN5bWJvbCgnaW5pdC1pbnRlcm5hbCcpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyAgICA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfZW5zdXJlRWxlbWVudCA9IFN5bWJvbCgnZW5zdXJlLWVsZW1lbnQnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5PFQgZXh0ZW5kcyBOb2RlPiB7XG4gICAgcmVhZG9ubHkgY2lkOiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgZXZlbnRzPzogVmlld0V2ZW50c0hhc2g8VD47XG4gICAgcmVhZG9ubHkgaWQ/OiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgY2xhc3NOYW1lPzogc3RyaW5nO1xuICAgIHJlYWRvbmx5IGF0dHJpYnV0ZXM/OiBQbGFpbk9iamVjdDxzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbD47XG4gICAgcmVhZG9ubHkgdGFnTmFtZTogc3RyaW5nO1xuICAgICRlbDogRE9NPFQ+O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuZXhwb3J0IHR5cGUgVmlld0ZpbmRTZWxlY3RvciA9IE5vZGUgfCBzdHJpbmcgfCBOdWxsaXNoO1xuXG4vKipcbiAqIEBlbiBDb3JlIGltcGxlbWVudGF0aW9uIG9mIHtAbGluayBWaWV3fSB3aXRob3V0IHtAbGluayBFdmVudFNvdXJjZX0gaW50ZXJmYWNlLiA8YnI+XG4gKiAgICAgQ2FuIGJlIHNwZWNpZmllZCBhcyBtaXhpbiBzb3VyY2UuXG4gKiBAamEge0BsaW5rIEV2ZW50U291cmNlfSDjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnjgpLmjIHjgZ/jgarjgYQge0BsaW5rIFZpZXd9IOOBruOCs+OCouWun+ijhSA8YnI+XG4gKiAgICAgTWl4aW4gc291cmNlIOOBqOOBl+OBpuaMh+WumuWPr+iDvVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgVmlld0NvcmU8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQ+IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTxURWxlbWVudD47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBjb25zdHJ1Y3Rpb24vZGVzdHJ1Y3Rpb246XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucz86IFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBpZiAoZmFsc2UgIT09IG9wdGlvbnMgYXMgdW5rbm93biBhcyBib29sZWFuKSB7XG4gICAgICAgICAgICB0aGlzW19pbml0aWFsaXplXShvcHRpb25zKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWxlYXNlIGFsbCBsaXN0ZW5lcnMuXG4gICAgICogQGphIOOBmeOBueOBpuOBruODquOCueODiuODvOOCkuino+mZpFxuICAgICAqL1xuICAgIHB1YmxpYyByZWxlYXNlKCk6IHRoaXMge1xuICAgICAgICB0aGlzLnVuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSB0aGlzIHZpZXcgYnkgdGFraW5nIHRoZSBlbGVtZW50IG91dCBvZiB0aGUgRE9NIHdpdGggcmVsZWFzZSBhbGwgbGlzdGVuZXJzLlxuICAgICAqIEBqYSBWaWV3IOOBi+OCiSBET00g44KS5YiH44KK6Zui44GXLCDjg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlKCk6IHRoaXMge1xuICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgdGhpcy4kZWwucmVtb3ZlKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBhdHRyaWJ1dGVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNvbnRlbnQgSUQuXG4gICAgICogQGphIOOCs+ODs+ODhuODs+ODhCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgeyBjaWQsIGlkIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIGlkID8/IGNpZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGVsZW1lbnQuXG4gICAgICogQGphIOimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBlbCgpOiBURWxlbWVudCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS4kZWxbMF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB7QGxpbmsgRE9NfSBvYmplY3QuXG4gICAgICogQGphIHtAbGluayBET019IOOCquODluOCuOOCp+OCr+ODiOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCAkZWwoKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS4kZWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBpbnRlcm5hbCBjb250ZW50IElELlxuICAgICAqIEBqYSDlhoXpg6jjga7jgrPjg7Pjg4bjg7Pjg4QgSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY2lkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jaWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBkZWZhdWx0IHRhZyBuYW1lLlxuICAgICAqIEBqYSDml6Llrprjga7jgr/jgrDlkI3jgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF90YWdOYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS50YWdOYW1lO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2F0dHJzKCk6IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsPiB7XG4gICAgICAgIGNvbnN0IHsgYXR0cmlidXRlcywgaWQsIGNsYXNzTmFtZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKGRyb3AoeyBpZCwgY2xhc3M6IGNsYXNzTmFtZSB9KSwgYXR0cmlidXRlcyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uOlxuXG4gICAgLyoqXG4gICAgICogQGVuIENoYW5nZSB0aGUgdmlldydzIGVsZW1lbnQgKGB0aGlzLmVsYCBwcm9wZXJ0eSkgYW5kIHJlLWRlbGVnYXRlIHRoZSB2aWV3J3MgZXZlbnRzIG9uIHRoZSBuZXcgZWxlbWVudC5cbiAgICAgKiBAamEgVmlldyDjgYznrqHovYTjgZnjgovopoHntKAgKGB0aGlzLmVsYCBwcm9wZXJ0eSkg44Gu5aSJ5pu0LiDjgqTjg5njg7Pjg4jlho3oqK3lrprjgoLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlbFxuICAgICAqICAtIGBlbmAgT2JqZWN0IG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgZWxlbWVudC5cbiAgICAgKiAgLSBgamFgIOimgee0oOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiOOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXRFbGVtZW50KGVsOiBET01TZWxlY3RvcjxURWxlbWVudCB8IHN0cmluZz4pOiB0aGlzIHtcbiAgICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLiRlbCA9ICQoZWwpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIHRoaXMuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBET00gY2FsbGJhY2tzIGZyb20ge0BsaW5rIFZpZXdFdmVudHNIYXNofSBvYmplY3QuXG4gICAgICogQGphIHtAbGluayBWaWV3RXZlbnRzSGFzaH0g44Kq44OW44K444Kn44Kv44OI44GL44KJIERPTSDjgrPjg7zjg6vjg5Djg4Pjgq/jgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBldmVudHNcbiAgICAgKiAgLSBgZW5gIHtAbGluayBWaWV3RXZlbnRzSGFzaH0gb2JqZWN0LiBgdGhpcy5ldmVudHMoKWAgaXMgdXNlZCBieSBkZWZhdWx0LlxuICAgICAqICAtIGBqYWAge0BsaW5rIFZpZXdFdmVudHNIYXNofSDjgqrjg5bjgrjjgqfjgq/jg4guIOaXouWumuWApOOBryBgdGhpcy5ldmVudHMoKWBcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVsZWdhdGVFdmVudHMoZXZlbnRzPzogVmlld0V2ZW50c0hhc2g8VEVsZW1lbnQ+KTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGhhc2ggPSBldmVudHMgPz8gdGhpcy5ldmVudHMoKTtcbiAgICAgICAgaWYgKGlzRW1wdHlPYmplY3QoaGFzaCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoaGFzaCkpIHtcbiAgICAgICAgICAgIGxldCBtZXRob2QgPSBoYXNoW2tleV0gYXMgVW5rbm93bkZ1bmN0aW9uO1xuICAgICAgICAgICAgaWYgKCFpc0Z1bmN0aW9uKG1ldGhvZCkpIHtcbiAgICAgICAgICAgICAgICBtZXRob2QgPSB0aGlzW21ldGhvZF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIW1ldGhvZCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSAvXihcXFMrKVxccyooLiopJC8uZXhlYyhrZXkpITtcbiAgICAgICAgICAgIHRoaXMuZGVsZWdhdGU8YW55PihtYXRjaFsxXSwgbWF0Y2hbMl0sIG1ldGhvZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhcnMgYWxsIGNhbGxiYWNrcyBwcmV2aW91c2x5IGJvdW5kIHRvIHRoZSB2aWV3IGJ5IGBkZWxlZ2F0ZWAuXG4gICAgICogQGphIGBkZWxlZ2F0ZWAg44GV44KM44Gf44Kk44OZ44Oz44OI44KS44GZ44G544Gm5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIHVuZGVsZWdhdGVFdmVudHMoKTogdGhpcyB7XG4gICAgICAgIHRoaXMuJGVsPy5vZmY8YW55PihgLiR7dGhpcy5fY2lkfWApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cy4gKGxpdmUgZXZlbnQgYXZhaWxhYmxlKVxuICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIDHjgaTjgb7jgZ/jga/opIfmlbDjga7jgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+OCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIEEgc2VsZWN0b3Igc3RyaW5nIHRvIGZpbHRlciB0aGUgZGVzY2VuZGFudHMgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRzIHRoYXQgdHJpZ2dlciB0aGUgZXZlbnQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jnmbrooYzlhYPjgpLjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVsZWdhdGU8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwgMeOBpOOBvuOBn+OBr+ikh+aVsOOBruOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBkZWxlZ2F0ZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IChFdmVudFR5cGU8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgbGlzdGVuZXI6IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIGRlbGVnYXRlKHR5cGU6IHN0cmluZywgLi4uYXJnczogdW5rbm93bltdKTogdGhpcyB7XG4gICAgICAgICh0aGlzLiRlbCBhcyBhbnkpLm9uKGAke3R5cGV9LiR7dGhpcy5fY2lkfWAsIC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuIFRoZSBoYW5kbGVyIGRlc2lnbmF0ZWQgYXQge0BsaW5rIERPTUV2ZW50cy5vbn0gb3Ige0BsaW5rIERPTUV2ZW50cy5vbmNlfSBhbmQgdGhhdCBzYW1lIGNvbmRpdGlvbiBhcmUgcmVsZWFzZWQuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG1ldGhvZCByZWNlaXZlcyBubyBhcmd1bWVudHMsIGFsbCBoYW5kbGVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOBruino+mZpC4ge0BsaW5rIERPTUV2ZW50cy5vbn0g44G+44Gf44GvIHtAbGluayBET01FdmVudHMub25jZX0g44Go5ZCM5p2h5Lu244Gn5oyH5a6a44GX44Gf44KC44Gu44GM6Kej6Zmk44GV44KM44KLIDxicj5cbiAgICAgKiAgICAg5byV5pWw44GM54Sh44GE5aC05ZCI44Gv44GZ44G544Gm44Gu44OP44Oz44OJ44Op44GM6Kej6Zmk44GV44KM44KLLlxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB1bmRlbGVnYXRlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI/OiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZXZlbnQgaGFuZGxlci4gVGhlIGhhbmRsZXIgZGVzaWduYXRlZCBhdCB7QGxpbmsgRE9NRXZlbnRzLm9ufSBvciB7QGxpbmsgRE9NRXZlbnRzLm9uY2V9IGFuZCB0aGF0IHNhbWUgY29uZGl0aW9uIGFyZSByZWxlYXNlZC4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgbWV0aG9kIHJlY2VpdmVzIG5vIGFyZ3VtZW50cywgYWxsIGhhbmRsZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiBAamEg6Kit5a6a44GV44KM44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44Gu6Kej6ZmkLiB7QGxpbmsgRE9NRXZlbnRzLm9ufSDjgb7jgZ/jga8ge0BsaW5rIERPTUV2ZW50cy5vbmNlfSDjgajlkIzmnaHku7bjgafmjIflrprjgZfjgZ/jgoLjga7jgYzop6PpmaTjgZXjgozjgosgPGJyPlxuICAgICAqICAgICDlvJXmlbDjgYznhKHjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg4/jg7Pjg4njg6njgYzop6PpmaTjgZXjgozjgosuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHVuZGVsZWdhdGU8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPiB8IChFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBsaXN0ZW5lcj86IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIHVuZGVsZWdhdGUodHlwZTogc3RyaW5nLCAuLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgKHRoaXMuJGVsIGFzIGFueSkub2ZmKGAke3R5cGV9LiR7dGhpcy5fY2lkfWAsIC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBkZXNjZW5kYW50cyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+OBq+S4gOiHtOOBmeOCi+imgee0oOOCkuaknOe0olxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBET00uXG4gICAgICogIC0gYGphYCBET00g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgJDxUIGV4dGVuZHMgVmlld0ZpbmRTZWxlY3RvciA9IFZpZXdGaW5kU2VsZWN0b3I+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLiRlbC5maW5kKHNlbGVjdG9yKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTpcblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgZXZlbnRzIGhhc2ggKG9yIG1ldGhvZCkgY2FuIGJlIHVzZWQgdG8gc3BlY2lmeSBhIHNldCBvZiBET00gZXZlbnRzIHRoYXQgd2lsbCBiZSBib3VuZCB0byBtZXRob2RzIG9uIHlvdXIgVmlldyB0aHJvdWdoIGRlbGVnYXRlRXZlbnRzLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jjgrvjg6zjgq/jgr/jgajjgrPjg7zjg6vjg5Djg4Pjgq/jga7jg4/jg4Pjgrfjg6XjgpLlrprnvqnjgZcsIOODq+ODvOODiOOCqOODs+ODhuOCo+ODhuOCo+OBp+aNleaNieOBmeOCiyBET00g44Kk44OZ44Oz44OI44KS5oyH5a6aXG4gICAgICpcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogY2xhc3MgU2FtcGxlVmlldyBleHRlbmRzIFZpZXcge1xuICAgICAqICAgICBwcm90ZWN0ZWQgZXZlbnRzKCk6IFZpZXdFdmVudHNIYXNoIHtcbiAgICAgKiAgICAgICAgIHJldHVybiB7XG4gICAgICogICAgICAgICAgICAgJ21vdXNlZG93biAudGl0bGUnOiAgJ2VkaXQnLFxuICAgICAqICAgICAgICAgICAgICdjbGljayAuYnV0dG9uJzogICAgICdzYXZlJyxcbiAgICAgKiAgICAgICAgICAgICAnY2xpY2sgLm9wZW4nOiAgICAgICBmdW5jdGlvbihlKSB7IC4uLiB9LFxuICAgICAqICAgICAgICAgICAgICdjbGljayAuY2xvc2UnOiAgICAgIHRoaXMub25DbG9zZSxcbiAgICAgKiAgICAgICAgIH07XG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZXZlbnRzKCk6IFZpZXdFdmVudHNIYXNoPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCB0aGlzW19wcm9wZXJ0aWVzXS5ldmVudHMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFic3RyYWN0OlxuXG4gICAgLyoqXG4gICAgICogQGVuIEltcGxlbWVudCB0aGlzIGZ1bmN0aW9uIHdpdGggeW91ciBjb2RlIHRoYXQgcmVuZGVycyB0aGUgdmlldyB0ZW1wbGF0ZSBmcm9tIG1vZGVsIGRhdGEsIGFuZCB1cGRhdGVzIGB0aGlzLmVsYCB3aXRoIHRoZSBuZXcgSFRNTC5cbiAgICAgKiBAamEgYHRoaXMuZWxgIOabtOaWsOaZguOBruaWsOOBl+OBhCBIVE1MIOOCkuODrOODs+ODgOODquODs+OCsOODreOCuOODg+OCr+OBruWun+ijhemWouaVsC4g44Oi44OH44Or5pu05paw44GoIFZpZXcg44OG44Oz44OX44Os44O844OI44KS6YCj5YuV44GV44Gb44KLLlxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBpbXBvcnQgeyBUZW1wbGF0ZUVuZ2luZSB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gICAgICpcbiAgICAgKiBjbGFzcyBTYW1wbGVWaWV3IGV4dGVuZHMgVmlldyB7XG4gICAgICogICAgIHByaXZhdGUgX3RlbXBsYXRlID0gVGVtcGxhdGVFbmdpbmUuY29tcGlsZSgne3t0aXRsZX19Jyk7XG4gICAgICogICAgIHJlbmRlcigpOiB2b2lkIHtcbiAgICAgKiAgICAgICAgIHRoaXMuJGVsLmh0bWwodGhpcy5fdGVtcGxhdGUodGhpcy5tb2RlbCkpO1xuICAgICAqICAgICB9XG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGFic3RyYWN0IHJlbmRlciguLi5hcmdzOiB1bmtub3duW10pOiBhbnk7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcm90ZWN0ZWQgW19pbml0aWFsaXplXShvcHRpb25zPzogVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQ+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgZWwsIHRhZ05hbWUsIGlkLCBhdHRyaWJ1dGVzLCBjbGFzc05hbWUsIGV2ZW50cyB9ID0gb3B0aW9ucyA/PyB7fTtcblxuICAgICAgICAodGhpc1tfcHJvcGVydGllc10gYXMgV3JpdGFibGU8UHJvcGVydHk8VEVsZW1lbnQ+PikgPSB7XG4gICAgICAgICAgICBjaWQ6IGx1aWQoJ3ZpZXc6JywgOCksXG4gICAgICAgICAgICBldmVudHMsXG4gICAgICAgICAgICBpZCxcbiAgICAgICAgICAgIGNsYXNzTmFtZSxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMsXG4gICAgICAgICAgICB0YWdOYW1lOiB0YWdOYW1lID8/ICdkaXYnLFxuICAgICAgICB9IGFzIFByb3BlcnR5PFRFbGVtZW50PjtcblxuICAgICAgICB0aGlzW19lbnN1cmVFbGVtZW50XShlbCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19lbnN1cmVFbGVtZW50XShlbD86IERPTVNlbGVjdG9yPFRFbGVtZW50IHwgc3RyaW5nPik6IHZvaWQge1xuICAgICAgICBpZiAoIWVsKSB7XG4gICAgICAgICAgICBjb25zdCB7IF9hdHRycywgX3RhZ05hbWUgfSA9IHRoaXM7XG4gICAgICAgICAgICB0aGlzLnNldEVsZW1lbnQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudChfdGFnTmFtZSkgYXMgTm9kZSBhcyBURWxlbWVudCk7XG4gICAgICAgICAgICB0aGlzLiRlbC5hdHRyKF9hdHRycyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldEVsZW1lbnQoZWwpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIHtAbGluayBWaWV3fSBjbGFzcyAqL1xuYWJzdHJhY3QgY2xhc3MgVmlldyBleHRlbmRzIChtaXhpbnMoRXZlbnRTb3VyY2UsIFZpZXdDb3JlIGFzIENvbnN0cnVjdG9yPFZpZXdDb3JlPikpIHtcbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucz86IFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuc3VwZXIoVmlld0NvcmUgYXMgQ29uc3RydWN0b3I8Vmlld0NvcmU+LCBmYWxzZSk7XG4gICAgICAgIHRoaXNbX2luaXRpYWxpemVdKG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWxlYXNlIGFsbCBsaXN0ZW5lcnMuXG4gICAgICogQGphIOOBmeOBueOBpuOBruODquOCueODiuODvOOCkuino+mZpFxuICAgICAqL1xuICAgIHB1YmxpYyByZWxlYXNlKCk6IHRoaXMge1xuICAgICAgICBzdXBlci5yZWxlYXNlKCk7XG4gICAgICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgICAgICB0aGlzLm9mZigpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIEJhc2UgY2xhc3MgZGVmaW5pdGlvbiBmb3IgdmlldyB0aGF0IG1hbmFnZXMgdGhlIGxheW91dCBhbmQgYSBET00gZXZlbnRzLlxuICogQGphIOODrOOCpOOCouOCpuODiOeuoeeQhuOBqCBET00g44Kk44OZ44Oz44OI44Gu55uj6KaW44KS6KGM44GGIFZpZXcg44Gu5Z+65bqV44Kv44Op44K55a6a576pXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQge1xuICogICAgIFRlbXBsYXRlRW5naW5lLFxuICogICAgIERPTSwgZG9tIGFzICQsXG4gKiAgICAgVmlldywgVmlld0V2ZW50c0hhc2gsXG4gKiB9IGZyb20gJ0BjZHAvcnVtdGltZSc7XG4gKiBpbXBvcnQgeyBUb0RvLCBUb0RvRXZlbnRTb3VyY2UgfSBmcm9tICcuL3RvZG8nO1xuICpcbiAqIGNvbnN0IF90ZW1wbGF0ZSA9IFRlbXBsYXRlRW5naW5lLmNvbXBpbGUoJCgnI2l0ZW0tdGVtcGxhdGUnKS5odG1sKCkpO1xuICpcbiAqIGV4cG9ydCBjbGFzcyBUb0RvVmlldyBleHRlbmRzIFZpZXcge1xuICogICAgIHByaXZhdGUgX21vZGVsOiBUb0RvO1xuICogICAgIHByaXZhdGUgXyRpbnB1dD86IERPTTxIVE1MSW5wdXRFbGVtZW50PjtcbiAqXG4gKiAgICAgY29uc3RydWN0b3IodG9kbzogVG9Ebykge1xuICogICAgICAgICBzdXBlcih7IHRhZ05hbWU6ICdsaScgfSk7XG4gKiAgICAgICAgIHRoaXMuX21vZGVsID0gdG9kbztcbiAqICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLl9tb2RlbCBhcyBUb0RvRXZlbnRTb3VyY2UsICdAY2hhbmdlJywgdGhpcy5yZW5kZXIuYmluZCh0aGlzKSk7XG4gKiAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5fbW9kZWwgYXMgVG9Eb0V2ZW50U291cmNlLCAnQGRlc3Ryb3knLCB0aGlzLnJlbW92ZS5iaW5kKHRoaXMpKTtcbiAqICAgICB9XG4gKlxuICogICAgIHByb3RlY3RlZCBldmVudHMoKTogVmlld0V2ZW50c0hhc2g8SFRNTEVsZW1lbnQ+IHtcbiAqICAgICAgICAgcmV0dXJuIHtcbiAqICAgICAgICAgICAgICdjbGljayAudG9nZ2xlJzogICB0aGlzLnRvZ2dsZURvbmUsXG4gKiAgICAgICAgICAgICAnZGJsY2xpY2sgLnZpZXcnOiAgdGhpcy5lZGl0LFxuICogICAgICAgICAgICAgJ2NsaWNrIGEuZGVzdHJveSc6IHRoaXMuY2xlYXIsXG4gKiAgICAgICAgICAgICAna2V5cHJlc3MgLmVkaXQnOiAgdGhpcy51cGRhdGVPbkVudGVyLFxuICogICAgICAgICAgICAgJ2JsdXIgLmVkaXQnOiAgICAgIHRoaXMuY2xvc2UsXG4gKiAgICAgICAgIH07XG4gKiAgICAgfVxuICpcbiAqICAgICByZW5kZXIoKTogdGhpcyB7XG4gKiAgICAgICAgIHRoaXMuJGVsLmh0bWwoX3RlbXBsYXRlKHRoaXMuX21vZGVsLnRvSlNPTigpKSk7XG4gKiAgICAgICAgIHRoaXMuJGVsLnRvZ2dsZUNsYXNzKCdkb25lJywgdGhpcy5fbW9kZWwuZG9uZSk7XG4gKiAgICAgICAgIHRoaXMuXyRpbnB1dCA9IHRoaXMuJCgnLmVkaXQnKSBhcyBET008SFRNTElucHV0RWxlbWVudD47XG4gKiAgICAgICAgIHJldHVybiB0aGlzO1xuICogICAgIH1cbiAqICAgICA6XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgX1ZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4gPSBWaWV3Q29yZSA8VEVsZW1lbnQ+ICYgRXZlbnRTb3VyY2U8VEV2ZW50PjtcblxuLyoqXG4gKiBAZW4gQ29uc3RydWN0b3Igb2Yge0BsaW5rIFZpZXd9XG4gKiBAamEge0BsaW5rIFZpZXd9IOOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wun+S9k1xuICovXG5jb25zdCBfVmlldzoge1xuICAgIHJlYWRvbmx5IHByb3RvdHlwZTogX1ZpZXc8YW55LCBhbnk+O1xuICAgIG5ldyA8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4ob3B0aW9ucz86IFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pik6IF9WaWV3PFRFbGVtZW50LCBURXZlbnQ+O1xufSA9IFZpZXcgYXMgYW55O1xuXG5leHBvcnQgeyBfVmlldyBhcyBWaWV3IH07XG4iXSwibmFtZXMiOlsiJCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQ0EsaUJBQXdCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDOztBQ0RsRTs7QUFFRztBQTRCSCxpQkFBaUIsTUFBTSxXQUFXLEdBQU0sTUFBTSxDQUFDLGVBQWUsQ0FBQztBQUMvRCxpQkFBaUIsTUFBTSxXQUFXLEdBQU0sTUFBTSxDQUFDLFlBQVksQ0FBQztBQUM1RCxpQkFBaUIsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDO0FBaUJoRTs7Ozs7QUFLRztNQUNtQixRQUFRLENBQUE7O0lBR1QsQ0FBQyxXQUFXOzs7QUFLN0I7Ozs7OztBQU1HO0FBQ0gsSUFBQSxXQUFBLENBQVksT0FBMkMsRUFBQTtBQUNuRCxRQUFBLElBQUksS0FBSyxLQUFLLE9BQTZCLEVBQUU7QUFDekMsWUFBQSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDOzs7QUFJbEM7OztBQUdHO0lBQ0ksT0FBTyxHQUFBO1FBQ1YsSUFBSSxDQUFDLGdCQUFnQixFQUFFO0FBQ3ZCLFFBQUEsT0FBTyxJQUFJOztBQUdmOzs7QUFHRztJQUNJLE1BQU0sR0FBQTtRQUNULElBQUksQ0FBQyxPQUFPLEVBQUU7QUFDZCxRQUFBLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFO0FBQ2pCLFFBQUEsT0FBTyxJQUFJOzs7O0FBTWY7OztBQUdHO0FBQ0gsSUFBQSxJQUFJLEVBQUUsR0FBQTtRQUNGLE1BQU0sRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUNyQyxPQUFPLEVBQUUsSUFBSSxHQUFHOztBQUdwQjs7O0FBR0c7QUFDSCxJQUFBLElBQUksRUFBRSxHQUFBO1FBQ0YsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFD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SUFBQSxDQUFDLENBQWdELFFBQXdCLEVBQUE7UUFDNUUsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7Ozs7QUFNbEM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXFCRztJQUNPLE1BQU0sR0FBQTtBQUNaLFFBQUEsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxDQUFDOzs7OztJQTZCNUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUEyQyxFQUFBO0FBQy9ELFFBQUEsTUFBTSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEdBQUcsT0FBTyxJQUFJLEVBQUU7UUFFdkUsSUFBSSxDQUFDLFdBQVcsQ0FBa0MsR0FBRztBQUNsRCxZQUFBLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUNyQixNQUFNO1lBQ04sRUFBRTtZQUNGLFNBQVM7WUFDVCxVQUFVO1lBQ1YsT0FBTyxFQUFFLE9BQU8sSUFBSSxLQUFLO1NBQ047QUFFdkIsUUFBQSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxDQUFDOzs7SUFJcEIsQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFtQyxFQUFBO1FBQ3hELElBQUksQ0FBQyxFQUFFLEVBQUU7QUFDTCxZQUFBLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsSUFBSTtZQUNqQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFxQixDQUFDO0FBQ3JFLFlBQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDOzthQUNsQjtBQUNILFlBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7OztBQUc5QjtBQUVEO0FBQ0EsTUFBZSxJQUFLLFVBQVMsTUFBTSxDQUFDLFdBQVcsRUFBRSxRQUFpQyxDQUFDLEVBQUM7QUFDaEY7Ozs7OztBQU1HO0FBQ0gsSUFBQSxXQUFBLENBQVksT0FBaUMsRUFBQTtBQUN6QyxRQUFBLEtBQUssRUFBRTtBQUNQLFFBQUEsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFpQyxFQUFFLEtBQUssQ0FBQztBQUNwRCxRQUFBLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUM7O0FBRzlCOzs7QUFHRztJQUNJLE9BQU8sR0FBQTtRQUNWLEtBQUssQ0FBQyxPQUFPLEVBQUU7UUFDZixJQUFJLENBQUMsYUFBYSxFQUFFO1FBQ3BCLElBQUksQ0FBQyxHQUFHLEVBQUU7QUFDVixRQUFBLE9BQU8sSUFBSTs7QUFFbEI7QUFtREQ7OztBQUdHO0FBQ0csTUFBQSxLQUFLLEdBR1A7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL3ZpZXcvIn0=