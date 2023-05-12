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
         * @en Set DOM callbacks from {@link ViewEventsHash} object.
         * @ja {@link ViewEventsHash} オブジェクトから DOM コールバックを設定
         *
         * @param events
         *  - `en` {@link ViewEventsHash} object. `this.events()` is used by default.
         *  - `ja` {@link ViewEventsHash} オブジェクト. 既定値は `this.events()`
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
    /** @internal {@link View} class */
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
     * @en Constructor of {@link View}
     * @ja {@link View} のコンストラクタ実体
     */
    const _View = View;

    exports.View = _View;
    exports.ViewCore = ViewCore;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlldy5qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwiYmFzZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGRvY3VtZW50ID0gc2FmZShnbG9iYWxUaGlzLmRvY3VtZW50KTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIENvbnN0cnVjdG9yLFxuICAgIFdyaXRhYmxlLFxuICAgIE51bGxpc2gsXG4gICAgUGxhaW5PYmplY3QsXG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNFbXB0eU9iamVjdCxcbiAgICBsdWlkLFxuICAgIGRyb3AsXG4gICAgbWl4aW5zLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRTb3VyY2UgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQge1xuICAgIERPTSxcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG4gICAgRE9NRXZlbnRMaXN0ZW5lcixcbiAgICBET01FdmVudE1hcCxcbiAgICBFdmVudFR5cGUsXG4gICAgRXZlbnRUeXBlT3JOYW1lc3BhY2UsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IFZpZXdFdmVudHNIYXNoLCBWaWV3Q29uc3RydWN0aW9uT3B0aW9ucyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfaW5pdGlhbGl6ZSAgICA9IFN5bWJvbCgnaW5pdC1pbnRlcm5hbCcpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyAgICA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfZW5zdXJlRWxlbWVudCA9IFN5bWJvbCgnZW5zdXJlLWVsZW1lbnQnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5PFQgZXh0ZW5kcyBOb2RlPiB7XG4gICAgcmVhZG9ubHkgY2lkOiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgZXZlbnRzPzogVmlld0V2ZW50c0hhc2g8VD47XG4gICAgcmVhZG9ubHkgaWQ/OiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgY2xhc3NOYW1lPzogc3RyaW5nO1xuICAgIHJlYWRvbmx5IGF0dHJpYnV0ZXM/OiBQbGFpbk9iamVjdDxzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbD47XG4gICAgcmVhZG9ubHkgdGFnTmFtZTogc3RyaW5nO1xuICAgICRlbDogRE9NPFQ+O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuZXhwb3J0IHR5cGUgVmlld0ZpbmRTZWxlY3RvciA9IE5vZGUgfCBzdHJpbmcgfCBOdWxsaXNoO1xuXG4vKipcbiAqIEBlbiBDb3JlIGltcGxlbWVudGF0aW9uIG9mIHtAbGluayBWaWV3fSB3aXRob3V0IHtAbGluayBFdmVudFNvdXJjZX0gaW50ZXJmYWNlLiA8YnI+XG4gKiAgICAgQ2FuIGJlIHNwZWNpZmllZCBhcyBtaXhpbiBzb3VyY2UuXG4gKiBAamEge0BsaW5rIEV2ZW50U291cmNlfSDjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnjgpLmjIHjgZ/jgarjgYQge0BsaW5rIFZpZXd9IOOBruOCs+OCouWun+ijhSA8YnI+XG4gKiAgICAgTWl4aW4gc291cmNlIOOBqOOBl+OBpuaMh+WumuWPr+iDvVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgVmlld0NvcmU8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQ+IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc10hOiBQcm9wZXJ0eTxURWxlbWVudD47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBjb25zdHJ1Y3Rpb24vZGVzdHJ1Y3Rpb246XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucz86IFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBpZiAoZmFsc2UgIT09IG9wdGlvbnMgYXMgdW5rbm93biBhcyBib29sZWFuKSB7XG4gICAgICAgICAgICB0aGlzW19pbml0aWFsaXplXShvcHRpb25zKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWxlYXNlIGFsbCBsaXN0ZW5lcnMuXG4gICAgICogQGphIOOBmeOBueOBpuOBruODquOCueODiuODvOOCkuino+mZpFxuICAgICAqL1xuICAgIHB1YmxpYyByZWxlYXNlKCk6IHRoaXMge1xuICAgICAgICB0aGlzLnVuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSB0aGlzIHZpZXcgYnkgdGFraW5nIHRoZSBlbGVtZW50IG91dCBvZiB0aGUgRE9NIHdpdGggcmVsZWFzZSBhbGwgbGlzdGVuZXJzLlxuICAgICAqIEBqYSBWaWV3IOOBi+OCiSBET00g44KS5YiH44KK6Zui44GXLCDjg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlKCk6IHRoaXMge1xuICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgdGhpcy4kZWwucmVtb3ZlKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBhdHRyaWJ1dGVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNvbnRlbnQgSUQuXG4gICAgICogQGphIOOCs+ODs+ODhuODs+ODhCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgeyBjaWQsIGlkIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIGlkIHx8IGNpZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGVsZW1lbnQuXG4gICAgICogQGphIOimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBlbCgpOiBURWxlbWVudCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS4kZWxbMF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB7QGxpbmsgRE9NfSBvYmplY3QuXG4gICAgICogQGphIHtAbGluayBET019IOOCquODluOCuOOCp+OCr+ODiOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCAkZWwoKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS4kZWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBpbnRlcm5hbCBjb250ZW50IElELlxuICAgICAqIEBqYSDlhoXpg6jjga7jgrPjg7Pjg4bjg7Pjg4QgSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY2lkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jaWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBkZWZhdWx0IHRhZyBuYW1lLlxuICAgICAqIEBqYSDml6Llrprjga7jgr/jgrDlkI3jgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF90YWdOYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS50YWdOYW1lO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2F0dHJzKCk6IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsPiB7XG4gICAgICAgIGNvbnN0IHsgYXR0cmlidXRlcywgaWQsIGNsYXNzTmFtZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKGRyb3AoeyBpZCwgY2xhc3M6IGNsYXNzTmFtZSB9KSwgYXR0cmlidXRlcyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uOlxuXG4gICAgLyoqXG4gICAgICogQGVuIENoYW5nZSB0aGUgdmlldydzIGVsZW1lbnQgKGB0aGlzLmVsYCBwcm9wZXJ0eSkgYW5kIHJlLWRlbGVnYXRlIHRoZSB2aWV3J3MgZXZlbnRzIG9uIHRoZSBuZXcgZWxlbWVudC5cbiAgICAgKiBAamEgVmlldyDjgYznrqHovYTjgZnjgovopoHntKAgKGB0aGlzLmVsYCBwcm9wZXJ0eSkg44Gu5aSJ5pu0LiDjgqTjg5njg7Pjg4jlho3oqK3lrprjgoLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlbFxuICAgICAqICAtIGBlbmAgT2JqZWN0IG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgZWxlbWVudC5cbiAgICAgKiAgLSBgamFgIOimgee0oOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiOOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXRFbGVtZW50KGVsOiBET01TZWxlY3RvcjxURWxlbWVudCB8IHN0cmluZz4pOiB0aGlzIHtcbiAgICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLiRlbCA9ICQoZWwpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIHRoaXMuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBET00gY2FsbGJhY2tzIGZyb20ge0BsaW5rIFZpZXdFdmVudHNIYXNofSBvYmplY3QuXG4gICAgICogQGphIHtAbGluayBWaWV3RXZlbnRzSGFzaH0g44Kq44OW44K444Kn44Kv44OI44GL44KJIERPTSDjgrPjg7zjg6vjg5Djg4Pjgq/jgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBldmVudHNcbiAgICAgKiAgLSBgZW5gIHtAbGluayBWaWV3RXZlbnRzSGFzaH0gb2JqZWN0LiBgdGhpcy5ldmVudHMoKWAgaXMgdXNlZCBieSBkZWZhdWx0LlxuICAgICAqICAtIGBqYWAge0BsaW5rIFZpZXdFdmVudHNIYXNofSDjgqrjg5bjgrjjgqfjgq/jg4guIOaXouWumuWApOOBryBgdGhpcy5ldmVudHMoKWBcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVsZWdhdGVFdmVudHMoZXZlbnRzPzogVmlld0V2ZW50c0hhc2g8VEVsZW1lbnQ+KTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGhhc2ggPSBldmVudHMgfHwgdGhpcy5ldmVudHMoKTtcbiAgICAgICAgaWYgKGlzRW1wdHlPYmplY3QoaGFzaCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoaGFzaCkpIHtcbiAgICAgICAgICAgIGxldCBtZXRob2QgPSBoYXNoW2tleV0gYXMgVW5rbm93bkZ1bmN0aW9uO1xuICAgICAgICAgICAgaWYgKCFpc0Z1bmN0aW9uKG1ldGhvZCkpIHtcbiAgICAgICAgICAgICAgICBtZXRob2QgPSB0aGlzW21ldGhvZF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIW1ldGhvZCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSAvXihcXFMrKVxccyooLiopJC8uZXhlYyhrZXkpIGFzIFJlZ0V4cEV4ZWNBcnJheTtcbiAgICAgICAgICAgIHRoaXMuZGVsZWdhdGU8YW55PihtYXRjaFsxXSwgbWF0Y2hbMl0sIG1ldGhvZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhcnMgYWxsIGNhbGxiYWNrcyBwcmV2aW91c2x5IGJvdW5kIHRvIHRoZSB2aWV3IGJ5IGBkZWxlZ2F0ZWAuXG4gICAgICogQGphIGBkZWxlZ2F0ZWAg44GV44KM44Gf44Kk44OZ44Oz44OI44KS44GZ44G544Gm5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIHVuZGVsZWdhdGVFdmVudHMoKTogdGhpcyB7XG4gICAgICAgIHRoaXMuJGVsICYmIHRoaXMuJGVsLm9mZjxhbnk+KGAuJHt0aGlzLl9jaWR9YCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwgMeOBpOOBvuOBn+OBr+ikh+aVsOOBruOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBkZWxlZ2F0ZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IChFdmVudFR5cGU8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI6IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCAx44Gk44G+44Gf44Gv6KSH5pWw44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGRlbGVnYXRlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBsaXN0ZW5lcjogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgZGVsZWdhdGUodHlwZTogc3RyaW5nLCAuLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgKHRoaXMuJGVsIGFzIGFueSkub24oYCR7dHlwZX0uJHt0aGlzLl9jaWR9YCwgLi4uYXJncyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZXZlbnQgaGFuZGxlci4gVGhlIGhhbmRsZXIgZGVzaWduYXRlZCBhdCB7QGxpbmsgRE9NRXZlbnRzLm9ufSBvciB7QGxpbmsgRE9NRXZlbnRzLm9uY2V9IGFuZCB0aGF0IHNhbWUgY29uZGl0aW9uIGFyZSByZWxlYXNlZC4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgbWV0aG9kIHJlY2VpdmVzIG5vIGFyZ3VtZW50cywgYWxsIGhhbmRsZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiBAamEg6Kit5a6a44GV44KM44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44Gu6Kej6ZmkLiB7QGxpbmsgRE9NRXZlbnRzLm9ufSDjgb7jgZ/jga8ge0BsaW5rIERPTUV2ZW50cy5vbmNlfSDjgajlkIzmnaHku7bjgafmjIflrprjgZfjgZ/jgoLjga7jgYzop6PpmaTjgZXjgozjgosgPGJyPlxuICAgICAqICAgICDlvJXmlbDjgYznhKHjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg4/jg7Pjg4njg6njgYzop6PpmaTjgZXjgozjgosuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHVuZGVsZWdhdGU8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPiB8IChFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgICAgICBsaXN0ZW5lcj86IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBldmVudCBoYW5kbGVyLiBUaGUgaGFuZGxlciBkZXNpZ25hdGVkIGF0IHtAbGluayBET01FdmVudHMub259IG9yIHtAbGluayBET01FdmVudHMub25jZX0gYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIHtAbGluayBET01FdmVudHMub259IOOBvuOBn+OBryB7QGxpbmsgRE9NRXZlbnRzLm9uY2V9IOOBqOWQjOadoeS7tuOBp+aMh+WumuOBl+OBn+OCguOBruOBjOino+mZpOOBleOCjOOCiyA8YnI+XG4gICAgICogICAgIOW8leaVsOOBjOeEoeOBhOWgtOWQiOOBr+OBmeOBueOBpuOBruODj+ODs+ODieODqeOBjOino+mZpOOBleOCjOOCiy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdW5kZWxlZ2F0ZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIGxpc3RlbmVyPzogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgdW5kZWxlZ2F0ZSh0eXBlOiBzdHJpbmcsIC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICAodGhpcy4kZWwgYXMgYW55KS5vZmYoYCR7dHlwZX0uJHt0aGlzLl9jaWR9YCwgLi4uYXJncyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGRlc2NlbmRhbnRzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5oyH5a6a44GX44Gf44K744Os44Kv44K/44Gr5LiA6Ie044GZ44KL6KaB57Sg44KS5qSc57SiXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIERPTS5cbiAgICAgKiAgLSBgamFgIERPTSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyAkPFQgZXh0ZW5kcyBWaWV3RmluZFNlbGVjdG9yID0gVmlld0ZpbmRTZWxlY3Rvcj4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuJGVsLmZpbmQoc2VsZWN0b3IpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG92ZXJyaWRlOlxuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBldmVudHMgaGFzaCAob3IgbWV0aG9kKSBjYW4gYmUgdXNlZCB0byBzcGVjaWZ5IGEgc2V0IG9mIERPTSBldmVudHMgdGhhdCB3aWxsIGJlIGJvdW5kIHRvIG1ldGhvZHMgb24geW91ciBWaWV3IHRocm91Z2ggZGVsZWdhdGVFdmVudHMuXG4gICAgICogQGphIOOCpOODmeODs+ODiOOCu+ODrOOCr+OCv+OBqOOCs+ODvOODq+ODkOODg+OCr+OBruODj+ODg+OCt+ODpeOCkuWumue+qeOBlywg44Or44O844OI44Ko44Oz44OG44Kj44OG44Kj44Gn5o2V5o2J44GZ44KLIERPTSDjgqTjg5njg7Pjg4jjgpLmjIflrppcbiAgICAgKlxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBjbGFzcyBTYW1wbGVWaWV3IGV4dGVuZHMgVmlldyB7XG4gICAgICogICAgIHByb3RlY3RlZCBldmVudHMoKTogVmlld0V2ZW50c0hhc2gge1xuICAgICAqICAgICAgICAgcmV0dXJuIHtcbiAgICAgKiAgICAgICAgICAgICAnbW91c2Vkb3duIC50aXRsZSc6ICAnZWRpdCcsXG4gICAgICogICAgICAgICAgICAgJ2NsaWNrIC5idXR0b24nOiAgICAgJ3NhdmUnLFxuICAgICAqICAgICAgICAgICAgICdjbGljayAub3Blbic6ICAgICAgIGZ1bmN0aW9uKGUpIHsgLi4uIH0sXG4gICAgICogICAgICAgICAgICAgJ2NsaWNrIC5jbG9zZSc6ICAgICAgdGhpcy5vbkNsb3NlLFxuICAgICAqICAgICAgICAgfTtcbiAgICAgKiAgICAgfVxuICAgICAqIH1cbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBldmVudHMoKTogVmlld0V2ZW50c0hhc2g8VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHRoaXNbX3Byb3BlcnRpZXNdLmV2ZW50cyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWJzdHJhY3Q6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW1wbGVtZW50IHRoaXMgZnVuY3Rpb24gd2l0aCB5b3VyIGNvZGUgdGhhdCByZW5kZXJzIHRoZSB2aWV3IHRlbXBsYXRlIGZyb20gbW9kZWwgZGF0YSwgYW5kIHVwZGF0ZXMgYHRoaXMuZWxgIHdpdGggdGhlIG5ldyBIVE1MLlxuICAgICAqIEBqYSBgdGhpcy5lbGAg5pu05paw5pmC44Gu5paw44GX44GEIEhUTUwg44KS44Os44Oz44OA44Oq44Oz44Kw44Ot44K444OD44Kv44Gu5a6f6KOF6Zai5pWwLiDjg6Ljg4fjg6vmm7TmlrDjgaggVmlldyDjg4bjg7Pjg5fjg6zjg7zjg4jjgpLpgKPli5XjgZXjgZvjgosuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGltcG9ydCB7IFRlbXBsYXRlRW5naW5lIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAgICAgKlxuICAgICAqIGNsYXNzIFNhbXBsZVZpZXcgZXh0ZW5kcyBWaWV3IHtcbiAgICAgKiAgICAgcHJpdmF0ZSBfdGVtcGxhdGUgPSBUZW1wbGF0ZUVuZ2luZS5jb21waWxlKCd7e3RpdGxlfX0nKTtcbiAgICAgKiAgICAgcmVuZGVyKCk6IHZvaWQge1xuICAgICAqICAgICAgICAgdGhpcy4kZWwuaHRtbCh0aGlzLl90ZW1wbGF0ZSh0aGlzLm1vZGVsKSk7XG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICogYGBgXG4gICAgICovXG4gICAgYWJzdHJhY3QgcmVuZGVyKC4uLmFyZ3M6IHVua25vd25bXSk6IFByb21pc2U8YW55IHwgdm9pZD4gfCBhbnkgfCB2b2lkO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWw6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJvdGVjdGVkIFtfaW5pdGlhbGl6ZV0ob3B0aW9ucz86IFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pik6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGVsLCB0YWdOYW1lLCBpZCwgYXR0cmlidXRlcywgY2xhc3NOYW1lLCBldmVudHMgfSA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgKHRoaXNbX3Byb3BlcnRpZXNdIGFzIFdyaXRhYmxlPFByb3BlcnR5PFRFbGVtZW50Pj4pID0ge1xuICAgICAgICAgICAgY2lkOiBsdWlkKCd2aWV3OicsIDgpLFxuICAgICAgICAgICAgZXZlbnRzLFxuICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICBjbGFzc05hbWUsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzLFxuICAgICAgICAgICAgdGFnTmFtZTogdGFnTmFtZSB8fCAnZGl2JyxcbiAgICAgICAgfSBhcyBQcm9wZXJ0eTxURWxlbWVudD47XG5cbiAgICAgICAgdGhpc1tfZW5zdXJlRWxlbWVudF0oZWwpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfZW5zdXJlRWxlbWVudF0oZWw/OiBET01TZWxlY3RvcjxURWxlbWVudCB8IHN0cmluZz4pOiB2b2lkIHtcbiAgICAgICAgaWYgKCFlbCkge1xuICAgICAgICAgICAgY29uc3QgeyBfYXR0cnMsIF90YWdOYW1lIH0gPSB0aGlzO1xuICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoX3RhZ05hbWUpIGFzIE5vZGUgYXMgVEVsZW1lbnQpO1xuICAgICAgICAgICAgdGhpcy4kZWwuYXR0cihfYXR0cnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KGVsKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCB7QGxpbmsgVmlld30gY2xhc3MgKi9cbmFic3RyYWN0IGNsYXNzIFZpZXcgZXh0ZW5kcyAobWl4aW5zKEV2ZW50U291cmNlLCBWaWV3Q29yZSBhcyBDb25zdHJ1Y3RvcjxWaWV3Q29yZT4pKSB7XG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBWaWV3Q29uc3RydWN0aW9uT3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLnN1cGVyKFZpZXdDb3JlIGFzIENvbnN0cnVjdG9yPFZpZXdDb3JlPiwgZmFsc2UpO1xuICAgICAgICB0aGlzW19pbml0aWFsaXplXShvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVsZWFzZSBhbGwgbGlzdGVuZXJzLlxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVsZWFzZSgpOiB0aGlzIHtcbiAgICAgICAgc3VwZXIucmVsZWFzZSgpO1xuICAgICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICAgICAgdGhpcy5vZmYoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gZm9yIHZpZXcgdGhhdCBtYW5hZ2VzIHRoZSBsYXlvdXQgYW5kIGEgRE9NIGV2ZW50cy5cbiAqIEBqYSDjg6zjgqTjgqLjgqbjg4jnrqHnkIbjgaggRE9NIOOCpOODmeODs+ODiOOBruebo+imluOCkuihjOOBhiBWaWV3IOOBruWfuuW6leOCr+ODqeOCueWumue+qVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHtcbiAqICAgICBUZW1wbGF0ZUVuZ2luZSxcbiAqICAgICBET00sIGRvbSBhcyAkLFxuICogICAgIFZpZXcsIFZpZXdFdmVudHNIYXNoLFxuICogfSBmcm9tICdAY2RwL3J1bXRpbWUnO1xuICogaW1wb3J0IHsgVG9EbywgVG9Eb0V2ZW50U291cmNlIH0gZnJvbSAnLi90b2RvJztcbiAqXG4gKiBjb25zdCBfdGVtcGxhdGUgPSBUZW1wbGF0ZUVuZ2luZS5jb21waWxlKCQoJyNpdGVtLXRlbXBsYXRlJykuaHRtbCgpKTtcbiAqXG4gKiBleHBvcnQgY2xhc3MgVG9Eb1ZpZXcgZXh0ZW5kcyBWaWV3IHtcbiAqICAgICBwcml2YXRlIF9tb2RlbDogVG9EbztcbiAqICAgICBwcml2YXRlIF8kaW5wdXQ/OiBET008SFRNTElucHV0RWxlbWVudD47XG4gKlxuICogICAgIGNvbnN0cnVjdG9yKHRvZG86IFRvRG8pIHtcbiAqICAgICAgICAgc3VwZXIoeyB0YWdOYW1lOiAnbGknIH0pO1xuICogICAgICAgICB0aGlzLl9tb2RlbCA9IHRvZG87XG4gKiAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5fbW9kZWwgYXMgVG9Eb0V2ZW50U291cmNlLCAnQGNoYW5nZScsIHRoaXMucmVuZGVyLmJpbmQodGhpcykpO1xuICogICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuX21vZGVsIGFzIFRvRG9FdmVudFNvdXJjZSwgJ0BkZXN0cm95JywgdGhpcy5yZW1vdmUuYmluZCh0aGlzKSk7XG4gKiAgICAgfVxuICpcbiAqICAgICBwcm90ZWN0ZWQgZXZlbnRzKCk6IFZpZXdFdmVudHNIYXNoPEhUTUxFbGVtZW50PiB7XG4gKiAgICAgICAgIHJldHVybiB7XG4gKiAgICAgICAgICAgICAnY2xpY2sgLnRvZ2dsZSc6ICAgdGhpcy50b2dnbGVEb25lLFxuICogICAgICAgICAgICAgJ2RibGNsaWNrIC52aWV3JzogIHRoaXMuZWRpdCxcbiAqICAgICAgICAgICAgICdjbGljayBhLmRlc3Ryb3knOiB0aGlzLmNsZWFyLFxuICogICAgICAgICAgICAgJ2tleXByZXNzIC5lZGl0JzogIHRoaXMudXBkYXRlT25FbnRlcixcbiAqICAgICAgICAgICAgICdibHVyIC5lZGl0JzogICAgICB0aGlzLmNsb3NlLFxuICogICAgICAgICB9O1xuICogICAgIH1cbiAqXG4gKiAgICAgcmVuZGVyKCk6IHRoaXMge1xuICogICAgICAgICB0aGlzLiRlbC5odG1sKF90ZW1wbGF0ZSh0aGlzLl9tb2RlbC50b0pTT04oKSkpO1xuICogICAgICAgICB0aGlzLiRlbC50b2dnbGVDbGFzcygnZG9uZScsIHRoaXMuX21vZGVsLmRvbmUpO1xuICogICAgICAgICB0aGlzLl8kaW5wdXQgPSB0aGlzLiQoJy5lZGl0JykgYXMgRE9NPEhUTUxJbnB1dEVsZW1lbnQ+O1xuICogICAgICAgICByZXR1cm4gdGhpcztcbiAqICAgICB9XG4gKiAgICAgOlxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCB0eXBlIF9WaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+ID0gVmlld0NvcmUgPFRFbGVtZW50PiAmIEV2ZW50U291cmNlPFRFdmVudD47XG5cbi8qKlxuICogQGVuIENvbnN0cnVjdG9yIG9mIHtAbGluayBWaWV3fVxuICogQGphIHtAbGluayBWaWV3fSDjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/lrp/kvZNcbiAqL1xuY29uc3QgX1ZpZXc6IHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IF9WaWV3PGFueSwgYW55PjtcbiAgICBuZXcgPFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+KG9wdGlvbnM/OiBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pOiBfVmlldzxURWxlbWVudCwgVEV2ZW50Pjtcbn0gPSBWaWV3IGFzIGFueTtcblxuZXhwb3J0IHsgX1ZpZXcgYXMgVmlldyB9O1xuIl0sIm5hbWVzIjpbInNhZmUiLCJkcm9wIiwiJCIsImlzRW1wdHlPYmplY3QiLCJpc0Z1bmN0aW9uIiwibHVpZCIsIm1peGlucyIsIkV2ZW50U291cmNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUNBLGlCQUF3QixNQUFNLFFBQVEsR0FBR0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7O0lDRGxFOztJQUVHO0lBNEJILGlCQUFpQixNQUFNLFdBQVcsR0FBTSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDaEUsaUJBQWlCLE1BQU0sV0FBVyxHQUFNLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUM3RCxpQkFBaUIsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFpQmpFOzs7OztJQUtHO1VBQ21CLFFBQVEsQ0FBQTs7UUFHVCxDQUFDLFdBQVcsRUFBdUI7OztJQUtwRDs7Ozs7O0lBTUc7SUFDSCxJQUFBLFdBQUEsQ0FBWSxPQUEyQyxFQUFBO1lBQ25ELElBQUksS0FBSyxLQUFLLE9BQTZCLEVBQUU7SUFDekMsWUFBQSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDOUIsU0FBQTtTQUNKO0lBRUQ7OztJQUdHO1FBQ0ksT0FBTyxHQUFBO1lBQ1YsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDeEIsUUFBQSxPQUFPLElBQUksQ0FBQztTQUNmO0lBRUQ7OztJQUdHO1FBQ0ksTUFBTSxHQUFBO1lBQ1QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2YsUUFBQSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2xCLFFBQUEsT0FBTyxJQUFJLENBQUM7U0FDZjs7O0lBS0Q7OztJQUdHO0lBQ0gsSUFBQSxJQUFJLEVBQUUsR0FBQTtZQUNGLE1BQU0sRUFBRSxHQUFH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