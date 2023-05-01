/*!
 * @cdp/view 0.9.17
 *   generic view scheme
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/events'), require('@cdp/dom')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/events', '@cdp/dom'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP));
})(this, (function (exports, coreUtils, events, dom) { 'use strict';

    /** @internal */ const document = coreUtils.safe(globalThis.document);

    /* eslint-disable
        @typescript-eslint/no-explicit-any,
     */
    /** @internal */ const _initialize = Symbol('init-internal');
    /** @internal */ const _properties = Symbol('properties');
    /** @internal */ const _ensureElement = Symbol('ensure-element');
    /**
     * @en Core implementation of [[View]] without [[EventSource]] interface. <br>
     *     Can be specified as mixin source.
     * @ja [[EventSource]] インターフェイスを持たない [[View]] のコア実装 <br>
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
            return id || cid;
        }
        /**
         * @en Get element.
         * @ja 要素を取得
         */
        get el() {
            return this[_properties].$el[0];
        }
        /**
         * @en Get [[DOM]] object.
         * @ja [[DOM]] オブジェクトを取得
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
            return Object.assign(coreUtils.drop({ id, class: className }), attributes);
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
            this[_properties].$el = dom.dom(el);
            this.delegateEvents();
            return this;
        }
        /**
         * @en Set DOM callbacks from [[ViewEventsHash]] object.
         * @ja [[ViewEventsHash]] オブジェクトから DOM コールバックを設定
         *
         * @param events
         *  - `en` [[ViewEventsHash]] object. `this.events()` is used by default.
         *  - `ja` [[ViewEventsHash]] オブジェクト. 既定値は `this.events()`
         */
        delegateEvents(events) {
            const hash = events || this.events();
            if (coreUtils.isEmptyObject(hash)) {
                return this;
            }
            this.undelegateEvents();
            for (const key of Object.keys(hash)) {
                let method = hash[key];
                if (!coreUtils.isFunction(method)) {
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
            this.$el && this.$el.off(`.${this._cid}`);
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
            const { el, tagName, id, attributes, className, events } = options || {};
            this[_properties] = {
                cid: coreUtils.luid('view:', 8),
                events,
                id,
                className,
                attributes,
                tagName: tagName || 'div',
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
    /** @internal [[View]] class */
    class View extends (coreUtils.mixins(events.EventSource, ViewCore)) {
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
     * @en Constructor of [[View]]
     * @ja [[View]] のコンストラクタ実体
     */
    const _View = View;

    exports.View = _View;
    exports.ViewCore = ViewCore;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlldy5qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwiYmFzZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGRvY3VtZW50ID0gc2FmZShnbG9iYWxUaGlzLmRvY3VtZW50KTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIENvbnN0cnVjdG9yLFxuICAgIFdyaXRhYmxlLFxuICAgIE51bGxpc2gsXG4gICAgUGxhaW5PYmplY3QsXG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNFbXB0eU9iamVjdCxcbiAgICBsdWlkLFxuICAgIGRyb3AsXG4gICAgbWl4aW5zLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRTb3VyY2UgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQge1xuICAgIERPTSxcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG4gICAgRE9NRXZlbnRMaXN0ZW5lcixcbiAgICBET01FdmVudE1hcCxcbiAgICBFdmVudFR5cGUsXG4gICAgRXZlbnRUeXBlT3JOYW1lc3BhY2UsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IFZpZXdFdmVudHNIYXNoLCBWaWV3Q29uc3RydWN0aW9uT3B0aW9ucyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfaW5pdGlhbGl6ZSAgICA9IFN5bWJvbCgnaW5pdC1pbnRlcm5hbCcpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyAgICA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfZW5zdXJlRWxlbWVudCA9IFN5bWJvbCgnZW5zdXJlLWVsZW1lbnQnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5PFQgZXh0ZW5kcyBOb2RlPiB7XG4gICAgcmVhZG9ubHkgY2lkOiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgZXZlbnRzPzogVmlld0V2ZW50c0hhc2g8VD47XG4gICAgcmVhZG9ubHkgaWQ/OiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgY2xhc3NOYW1lPzogc3RyaW5nO1xuICAgIHJlYWRvbmx5IGF0dHJpYnV0ZXM/OiBQbGFpbk9iamVjdDxzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbD47XG4gICAgcmVhZG9ubHkgdGFnTmFtZTogc3RyaW5nO1xuICAgICRlbDogRE9NPFQ+O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuZXhwb3J0IHR5cGUgVmlld0ZpbmRTZWxlY3RvciA9IE5vZGUgfCBzdHJpbmcgfCBOdWxsaXNoO1xuXG4vKipcbiAqIEBlbiBDb3JlIGltcGxlbWVudGF0aW9uIG9mIFtbVmlld11dIHdpdGhvdXQgW1tFdmVudFNvdXJjZV1dIGludGVyZmFjZS4gPGJyPlxuICogICAgIENhbiBiZSBzcGVjaWZpZWQgYXMgbWl4aW4gc291cmNlLlxuICogQGphIFtbRXZlbnRTb3VyY2VdXSDjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnjgpLmjIHjgZ/jgarjgYQgW1tWaWV3XV0g44Gu44Kz44Ki5a6f6KOFIDxicj5cbiAqICAgICBNaXhpbiBzb3VyY2Ug44Go44GX44Gm5oyH5a6a5Y+v6IO9XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBWaWV3Q29yZTxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudD4ge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXSE6IFByb3BlcnR5PFRFbGVtZW50PjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGNvbnN0cnVjdGlvbi9kZXN0cnVjdGlvbjpcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zPzogVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIGlmIChmYWxzZSAhPT0gb3B0aW9ucyBhcyB1bmtub3duIGFzIGJvb2xlYW4pIHtcbiAgICAgICAgICAgIHRoaXNbX2luaXRpYWxpemVdKG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbGVhc2UgYWxsIGxpc3RlbmVycy5cbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Oq44K544OK44O844KS6Kej6ZmkXG4gICAgICovXG4gICAgcHVibGljIHJlbGVhc2UoKTogdGhpcyB7XG4gICAgICAgIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHRoaXMgdmlldyBieSB0YWtpbmcgdGhlIGVsZW1lbnQgb3V0IG9mIHRoZSBET00gd2l0aCByZWxlYXNlIGFsbCBsaXN0ZW5lcnMuXG4gICAgICogQGphIFZpZXcg44GL44KJIERPTSDjgpLliIfjgorpm6LjgZcsIOODquOCueODiuODvOOCkuino+mZpFxuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmUoKTogdGhpcyB7XG4gICAgICAgIHRoaXMucmVsZWFzZSgpO1xuICAgICAgICB0aGlzLiRlbC5yZW1vdmUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IGF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29udGVudCBJRC5cbiAgICAgKiBAamEg44Kz44Oz44OG44Oz44OEIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCB7IGNpZCwgaWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gaWQgfHwgY2lkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZWxlbWVudC5cbiAgICAgKiBAamEg6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGVsKCk6IFRFbGVtZW50IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLiRlbFswXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IFtbRE9NXV0gb2JqZWN0LlxuICAgICAqIEBqYSBbW0RPTV1dIOOCquODluOCuOOCp+OCr+ODiOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCAkZWwoKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS4kZWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBpbnRlcm5hbCBjb250ZW50IElELlxuICAgICAqIEBqYSDlhoXpg6jjga7jgrPjg7Pjg4bjg7Pjg4QgSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY2lkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jaWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBkZWZhdWx0IHRhZyBuYW1lLlxuICAgICAqIEBqYSDml6Llrprjga7jgr/jgrDlkI3jgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF90YWdOYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS50YWdOYW1lO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2F0dHJzKCk6IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsPiB7XG4gICAgICAgIGNvbnN0IHsgYXR0cmlidXRlcywgaWQsIGNsYXNzTmFtZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKGRyb3AoeyBpZCwgY2xhc3M6IGNsYXNzTmFtZSB9KSwgYXR0cmlidXRlcyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uOlxuXG4gICAgLyoqXG4gICAgICogQGVuIENoYW5nZSB0aGUgdmlldydzIGVsZW1lbnQgKGB0aGlzLmVsYCBwcm9wZXJ0eSkgYW5kIHJlLWRlbGVnYXRlIHRoZSB2aWV3J3MgZXZlbnRzIG9uIHRoZSBuZXcgZWxlbWVudC5cbiAgICAgKiBAamEgVmlldyDjgYznrqHovYTjgZnjgovopoHntKAgKGB0aGlzLmVsYCBwcm9wZXJ0eSkg44Gu5aSJ5pu0LiDjgqTjg5njg7Pjg4jlho3oqK3lrprjgoLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlbFxuICAgICAqICAtIGBlbmAgT2JqZWN0IG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgZWxlbWVudC5cbiAgICAgKiAgLSBgamFgIOimgee0oOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiOOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXRFbGVtZW50KGVsOiBET01TZWxlY3RvcjxURWxlbWVudCB8IHN0cmluZz4pOiB0aGlzIHtcbiAgICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLiRlbCA9ICQoZWwpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIHRoaXMuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBET00gY2FsbGJhY2tzIGZyb20gW1tWaWV3RXZlbnRzSGFzaF1dIG9iamVjdC5cbiAgICAgKiBAamEgW1tWaWV3RXZlbnRzSGFzaF1dIOOCquODluOCuOOCp+OCr+ODiOOBi+OCiSBET00g44Kz44O844Or44OQ44OD44Kv44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZXZlbnRzXG4gICAgICogIC0gYGVuYCBbW1ZpZXdFdmVudHNIYXNoXV0gb2JqZWN0LiBgdGhpcy5ldmVudHMoKWAgaXMgdXNlZCBieSBkZWZhdWx0LlxuICAgICAqICAtIGBqYWAgW1tWaWV3RXZlbnRzSGFzaF1dIOOCquODluOCuOOCp+OCr+ODiC4g5pei5a6a5YCk44GvIGB0aGlzLmV2ZW50cygpYFxuICAgICAqL1xuICAgIHB1YmxpYyBkZWxlZ2F0ZUV2ZW50cyhldmVudHM/OiBWaWV3RXZlbnRzSGFzaDxURWxlbWVudD4pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgaGFzaCA9IGV2ZW50cyB8fCB0aGlzLmV2ZW50cygpO1xuICAgICAgICBpZiAoaXNFbXB0eU9iamVjdChoYXNoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnVuZGVsZWdhdGVFdmVudHMoKTtcblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhoYXNoKSkge1xuICAgICAgICAgICAgbGV0IG1ldGhvZCA9IGhhc2hba2V5XSBhcyBVbmtub3duRnVuY3Rpb247XG4gICAgICAgICAgICBpZiAoIWlzRnVuY3Rpb24obWV0aG9kKSkge1xuICAgICAgICAgICAgICAgIG1ldGhvZCA9IHRoaXNbbWV0aG9kXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghbWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IC9eKFxcUyspXFxzKiguKikkLy5leGVjKGtleSkgYXMgUmVnRXhwRXhlY0FycmF5O1xuICAgICAgICAgICAgdGhpcy5kZWxlZ2F0ZTxhbnk+KG1hdGNoWzFdLCBtYXRjaFsyXSwgbWV0aG9kLmJpbmQodGhpcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFycyBhbGwgY2FsbGJhY2tzIHByZXZpb3VzbHkgYm91bmQgdG8gdGhlIHZpZXcgYnkgYGRlbGVnYXRlYC5cbiAgICAgKiBAamEgYGRlbGVnYXRlYCDjgZXjgozjgZ/jgqTjg5njg7Pjg4jjgpLjgZnjgbnjgabliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgdW5kZWxlZ2F0ZUV2ZW50cygpOiB0aGlzIHtcbiAgICAgICAgdGhpcy4kZWwgJiYgdGhpcy4kZWwub2ZmPGFueT4oYC4ke3RoaXMuX2NpZH1gKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCAx44Gk44G+44Gf44Gv6KSH5pWw44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGRlbGVnYXRlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgICAgICBsaXN0ZW5lcjogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cy4gKGxpdmUgZXZlbnQgYXZhaWxhYmxlKVxuICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIDHjgaTjgb7jgZ/jga/opIfmlbDjga7jgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+OCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVsZWdhdGU8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyBkZWxlZ2F0ZSh0eXBlOiBzdHJpbmcsIC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICAodGhpcy4kZWwgYXMgYW55KS5vbihgJHt0eXBlfS4ke3RoaXMuX2NpZH1gLCAuLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBldmVudCBoYW5kbGVyLiBUaGUgaGFuZGxlciBkZXNpZ25hdGVkIGF0IFtbb25dXSBvciBbW29uY2VdXSBhbmQgdGhhdCBzYW1lIGNvbmRpdGlvbiBhcmUgcmVsZWFzZWQuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG1ldGhvZCByZWNlaXZlcyBubyBhcmd1bWVudHMsIGFsbCBoYW5kbGVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOBruino+mZpC4gW1tvbl1dIOOBvuOBn+OBryBbW29uY2VdXSDjgajlkIzmnaHku7bjgafmjIflrprjgZfjgZ/jgoLjga7jgYzop6PpmaTjgZXjgozjgosgPGJyPlxuICAgICAqICAgICDlvJXmlbDjgYznhKHjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg4/jg7Pjg4njg6njgYzop6PpmaTjgZXjgozjgosuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHVuZGVsZWdhdGU8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPiB8IChFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgICAgICBsaXN0ZW5lcj86IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBldmVudCBoYW5kbGVyLiBUaGUgaGFuZGxlciBkZXNpZ25hdGVkIGF0IFtbb25dXSBvciBbW29uY2VdXSBhbmQgdGhhdCBzYW1lIGNvbmRpdGlvbiBhcmUgcmVsZWFzZWQuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG1ldGhvZCByZWNlaXZlcyBubyBhcmd1bWVudHMsIGFsbCBoYW5kbGVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOBruino+mZpC4gW1tvbl1dIOOBvuOBn+OBryBbW29uY2VdXSDjgajlkIzmnaHku7bjgafmjIflrprjgZfjgZ/jgoLjga7jgYzop6PpmaTjgZXjgozjgosgPGJyPlxuICAgICAqICAgICDlvJXmlbDjgYznhKHjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg4/jg7Pjg4njg6njgYzop6PpmaTjgZXjgozjgosuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHVuZGVsZWdhdGU8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPiB8IChFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBsaXN0ZW5lcj86IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIHVuZGVsZWdhdGUodHlwZTogc3RyaW5nLCAuLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgKHRoaXMuJGVsIGFzIGFueSkub2ZmKGAke3R5cGV9LiR7dGhpcy5fY2lkfWAsIC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBkZXNjZW5kYW50cyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+OBq+S4gOiHtOOBmeOCi+imgee0oOOCkuaknOe0olxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBET00uXG4gICAgICogIC0gYGphYCBET00g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgJDxUIGV4dGVuZHMgVmlld0ZpbmRTZWxlY3RvciA9IFZpZXdGaW5kU2VsZWN0b3I+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLiRlbC5maW5kKHNlbGVjdG9yKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTpcblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgZXZlbnRzIGhhc2ggKG9yIG1ldGhvZCkgY2FuIGJlIHVzZWQgdG8gc3BlY2lmeSBhIHNldCBvZiBET00gZXZlbnRzIHRoYXQgd2lsbCBiZSBib3VuZCB0byBtZXRob2RzIG9uIHlvdXIgVmlldyB0aHJvdWdoIGRlbGVnYXRlRXZlbnRzLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jjgrvjg6zjgq/jgr/jgajjgrPjg7zjg6vjg5Djg4Pjgq/jga7jg4/jg4Pjgrfjg6XjgpLlrprnvqnjgZcsIOODq+ODvOODiOOCqOODs+ODhuOCo+ODhuOCo+OBp+aNleaNieOBmeOCiyBET00g44Kk44OZ44Oz44OI44KS5oyH5a6aXG4gICAgICpcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogY2xhc3MgU2FtcGxlVmlldyBleHRlbmRzIFZpZXcge1xuICAgICAqICAgICBwcm90ZWN0ZWQgZXZlbnRzKCk6IFZpZXdFdmVudHNIYXNoIHtcbiAgICAgKiAgICAgICAgIHJldHVybiB7XG4gICAgICogICAgICAgICAgICAgJ21vdXNlZG93biAudGl0bGUnOiAgJ2VkaXQnLFxuICAgICAqICAgICAgICAgICAgICdjbGljayAuYnV0dG9uJzogICAgICdzYXZlJyxcbiAgICAgKiAgICAgICAgICAgICAnY2xpY2sgLm9wZW4nOiAgICAgICBmdW5jdGlvbihlKSB7IC4uLiB9LFxuICAgICAqICAgICAgICAgICAgICdjbGljayAuY2xvc2UnOiAgICAgIHRoaXMub25DbG9zZSxcbiAgICAgKiAgICAgICAgIH07XG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZXZlbnRzKCk6IFZpZXdFdmVudHNIYXNoPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCB0aGlzW19wcm9wZXJ0aWVzXS5ldmVudHMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFic3RyYWN0OlxuXG4gICAgLyoqXG4gICAgICogQGVuIEltcGxlbWVudCB0aGlzIGZ1bmN0aW9uIHdpdGggeW91ciBjb2RlIHRoYXQgcmVuZGVycyB0aGUgdmlldyB0ZW1wbGF0ZSBmcm9tIG1vZGVsIGRhdGEsIGFuZCB1cGRhdGVzIGB0aGlzLmVsYCB3aXRoIHRoZSBuZXcgSFRNTC5cbiAgICAgKiBAamEgYHRoaXMuZWxgIOabtOaWsOaZguOBruaWsOOBl+OBhCBIVE1MIOOCkuODrOODs+ODgOODquODs+OCsOODreOCuOODg+OCr+OBruWun+ijhemWouaVsC4g44Oi44OH44Or5pu05paw44GoIFZpZXcg44OG44Oz44OX44Os44O844OI44KS6YCj5YuV44GV44Gb44KLLlxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBpbXBvcnQgeyBUZW1wbGF0ZUVuZ2luZSB9IGZyb20gJ0BjZHAvY29yZS10ZW1wbGF0ZSc7XG4gICAgICpcbiAgICAgKiBjbGFzcyBTYW1wbGVWaWV3IGV4dGVuZHMgVmlldyB7XG4gICAgICogICAgIHByaXZhdGUgX3RlbXBsYXRlID0gVGVtcGxhdGVFbmdpbmUuY29tcGlsZSgne3t0aXRsZX19Jyk7XG4gICAgICogICAgIHJlbmRlcigpOiB2b2lkIHtcbiAgICAgKiAgICAgICAgIHRoaXMuJGVsLmh0bWwodGhpcy5fdGVtcGxhdGUodGhpcy5tb2RlbCkpO1xuICAgICAqICAgICB9XG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGFic3RyYWN0IHJlbmRlciguLi5hcmdzOiB1bmtub3duW10pOiBQcm9taXNlPGFueSB8IHZvaWQ+IHwgYW55IHwgdm9pZDtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGludGVybmFsOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByb3RlY3RlZCBbX2luaXRpYWxpemVdKG9wdGlvbnM/OiBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBlbCwgdGFnTmFtZSwgaWQsIGF0dHJpYnV0ZXMsIGNsYXNzTmFtZSwgZXZlbnRzIH0gPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICAgICh0aGlzW19wcm9wZXJ0aWVzXSBhcyBXcml0YWJsZTxQcm9wZXJ0eTxURWxlbWVudD4+KSA9IHtcbiAgICAgICAgICAgIGNpZDogbHVpZCgndmlldzonLCA4KSxcbiAgICAgICAgICAgIGV2ZW50cyxcbiAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgY2xhc3NOYW1lLFxuICAgICAgICAgICAgYXR0cmlidXRlcyxcbiAgICAgICAgICAgIHRhZ05hbWU6IHRhZ05hbWUgfHwgJ2RpdicsXG4gICAgICAgIH0gYXMgUHJvcGVydHk8VEVsZW1lbnQ+O1xuXG4gICAgICAgIHRoaXNbX2Vuc3VyZUVsZW1lbnRdKGVsKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX2Vuc3VyZUVsZW1lbnRdKGVsPzogRE9NU2VsZWN0b3I8VEVsZW1lbnQgfCBzdHJpbmc+KTogdm9pZCB7XG4gICAgICAgIGlmICghZWwpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgX2F0dHJzLCBfdGFnTmFtZSB9ID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudChkb2N1bWVudC5jcmVhdGVFbGVtZW50KF90YWdOYW1lKSBhcyBOb2RlIGFzIFRFbGVtZW50KTtcbiAgICAgICAgICAgIHRoaXMuJGVsLmF0dHIoX2F0dHJzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudChlbCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgW1tWaWV3XV0gY2xhc3MgKi9cbmFic3RyYWN0IGNsYXNzIFZpZXcgZXh0ZW5kcyAobWl4aW5zKEV2ZW50U291cmNlLCBWaWV3Q29yZSBhcyBDb25zdHJ1Y3RvcjxWaWV3Q29yZT4pKSB7XG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBWaWV3Q29uc3RydWN0aW9uT3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLnN1cGVyKFZpZXdDb3JlIGFzIENvbnN0cnVjdG9yPFZpZXdDb3JlPiwgZmFsc2UpO1xuICAgICAgICB0aGlzW19pbml0aWFsaXplXShvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVsZWFzZSBhbGwgbGlzdGVuZXJzLlxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVsZWFzZSgpOiB0aGlzIHtcbiAgICAgICAgc3VwZXIucmVsZWFzZSgpO1xuICAgICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICAgICAgdGhpcy5vZmYoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gZm9yIHZpZXcgdGhhdCBtYW5hZ2VzIHRoZSBsYXlvdXQgYW5kIGEgRE9NIGV2ZW50cy5cbiAqIEBqYSDjg6zjgqTjgqLjgqbjg4jnrqHnkIbjgaggRE9NIOOCpOODmeODs+ODiOOBruebo+imluOCkuihjOOBhiBWaWV3IOOBruWfuuW6leOCr+ODqeOCueWumue+qVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgVGVtcGxhdGVFbmdpbmUgfSBmcm9tICdAY2RwL2NvcmUtdGVtcGxhdGUnO1xuICogaW1wb3J0IHsgRE9NLCBkb20gYXMgJCB9IGZyb20gJ0BjZHAvZG9tJztcbiAqIGltcG9ydCB7IFZpZXcsIFZpZXdFdmVudHNIYXNoIH0gZnJvbSAnQGNkcC92aWV3JztcbiAqIGltcG9ydCB7IFRvRG8sIFRvRG9FdmVudFNvdXJjZSB9IGZyb20gJy4vdG9kbyc7XG4gKlxuICogY29uc3QgX3RlbXBsYXRlID0gVGVtcGxhdGVFbmdpbmUuY29tcGlsZSgkKCcjaXRlbS10ZW1wbGF0ZScpLmh0bWwoKSk7XG4gKlxuICogZXhwb3J0IGNsYXNzIFRvRG9WaWV3IGV4dGVuZHMgVmlldyB7XG4gKiAgICAgcHJpdmF0ZSBfbW9kZWw6IFRvRG87XG4gKiAgICAgcHJpdmF0ZSBfJGlucHV0PzogRE9NPEhUTUxJbnB1dEVsZW1lbnQ+O1xuICpcbiAqICAgICBjb25zdHJ1Y3Rvcih0b2RvOiBUb0RvKSB7XG4gKiAgICAgICAgIHN1cGVyKHsgdGFnTmFtZTogJ2xpJyB9KTtcbiAqICAgICAgICAgdGhpcy5fbW9kZWwgPSB0b2RvO1xuICogICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuX21vZGVsIGFzIFRvRG9FdmVudFNvdXJjZSwgJ0BjaGFuZ2UnLCB0aGlzLnJlbmRlci5iaW5kKHRoaXMpKTtcbiAqICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLl9tb2RlbCBhcyBUb0RvRXZlbnRTb3VyY2UsICdAZGVzdHJveScsIHRoaXMucmVtb3ZlLmJpbmQodGhpcykpO1xuICogICAgIH1cbiAqXG4gKiAgICAgcHJvdGVjdGVkIGV2ZW50cygpOiBWaWV3RXZlbnRzSGFzaDxIVE1MRWxlbWVudD4ge1xuICogICAgICAgICByZXR1cm4ge1xuICogICAgICAgICAgICAgJ2NsaWNrIC50b2dnbGUnOiAgIHRoaXMudG9nZ2xlRG9uZSxcbiAqICAgICAgICAgICAgICdkYmxjbGljayAudmlldyc6ICB0aGlzLmVkaXQsXG4gKiAgICAgICAgICAgICAnY2xpY2sgYS5kZXN0cm95JzogdGhpcy5jbGVhcixcbiAqICAgICAgICAgICAgICdrZXlwcmVzcyAuZWRpdCc6ICB0aGlzLnVwZGF0ZU9uRW50ZXIsXG4gKiAgICAgICAgICAgICAnYmx1ciAuZWRpdCc6ICAgICAgdGhpcy5jbG9zZSxcbiAqICAgICAgICAgfTtcbiAqICAgICB9XG4gKlxuICogICAgIHJlbmRlcigpOiB0aGlzIHtcbiAqICAgICAgICAgdGhpcy4kZWwuaHRtbChfdGVtcGxhdGUodGhpcy5fbW9kZWwudG9KU09OKCkpKTtcbiAqICAgICAgICAgdGhpcy4kZWwudG9nZ2xlQ2xhc3MoJ2RvbmUnLCB0aGlzLl9tb2RlbC5kb25lKTtcbiAqICAgICAgICAgdGhpcy5fJGlucHV0ID0gdGhpcy4kKCcuZWRpdCcpIGFzIERPTTxIVE1MSW5wdXRFbGVtZW50PjtcbiAqICAgICAgICAgcmV0dXJuIHRoaXM7XG4gKiAgICAgfVxuICogICAgIDpcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBfVmlldzxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PiA9IFZpZXdDb3JlIDxURWxlbWVudD4gJiBFdmVudFNvdXJjZTxURXZlbnQ+O1xuXG4vKipcbiAqIEBlbiBDb25zdHJ1Y3RvciBvZiBbW1ZpZXddXVxuICogQGphIFtbVmlld11dIOOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wun+S9k1xuICovXG5jb25zdCBfVmlldzoge1xuICAgIHJlYWRvbmx5IHByb3RvdHlwZTogX1ZpZXc8YW55LCBhbnk+O1xuICAgIG5ldyA8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4ob3B0aW9ucz86IFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pik6IF9WaWV3PFRFbGVtZW50LCBURXZlbnQ+O1xufSA9IFZpZXcgYXMgYW55O1xuXG5leHBvcnQgeyBfVmlldyBhcyBWaWV3IH07XG4iXSwibmFtZXMiOlsic2FmZSIsImRyb3AiLCIkIiwiaXNFbXB0eU9iamVjdCIs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