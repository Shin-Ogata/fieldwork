/*!
 * @cdp/view 0.9.19
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
            const hash = events ?? this.events();
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
                cid: coreUtils.luid('view:', 8),
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlldy5qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwiYmFzZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGRvY3VtZW50ID0gc2FmZShnbG9iYWxUaGlzLmRvY3VtZW50KTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIHR5cGUgQ29uc3RydWN0b3IsXG4gICAgdHlwZSBXcml0YWJsZSxcbiAgICB0eXBlIE51bGxpc2gsXG4gICAgdHlwZSBQbGFpbk9iamVjdCxcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzRW1wdHlPYmplY3QsXG4gICAgbHVpZCxcbiAgICBkcm9wLFxuICAgIG1peGlucyxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50U291cmNlIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIERPTSxcbiAgICB0eXBlIERPTVNlbGVjdG9yLFxuICAgIHR5cGUgRE9NUmVzdWx0LFxuICAgIHR5cGUgRE9NRXZlbnRMaXN0ZW5lcixcbiAgICB0eXBlIERPTUV2ZW50TWFwLFxuICAgIHR5cGUgRXZlbnRUeXBlLFxuICAgIHR5cGUgRXZlbnRUeXBlT3JOYW1lc3BhY2UsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB0eXBlIHsgVmlld0V2ZW50c0hhc2gsIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9pbml0aWFsaXplICAgID0gU3ltYm9sKCdpbml0LWludGVybmFsJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzICAgID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9lbnN1cmVFbGVtZW50ID0gU3ltYm9sKCdlbnN1cmUtZWxlbWVudCcpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHk8VCBleHRlbmRzIE5vZGU+IHtcbiAgICByZWFkb25seSBjaWQ6IHN0cmluZztcbiAgICByZWFkb25seSBldmVudHM/OiBWaWV3RXZlbnRzSGFzaDxUPjtcbiAgICByZWFkb25seSBpZD86IHN0cmluZztcbiAgICByZWFkb25seSBjbGFzc05hbWU/OiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgYXR0cmlidXRlcz86IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsPjtcbiAgICByZWFkb25seSB0YWdOYW1lOiBzdHJpbmc7XG4gICAgJGVsOiBET008VD47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG5leHBvcnQgdHlwZSBWaWV3RmluZFNlbGVjdG9yID0gTm9kZSB8IHN0cmluZyB8IE51bGxpc2g7XG5cbi8qKlxuICogQGVuIENvcmUgaW1wbGVtZW50YXRpb24gb2Yge0BsaW5rIFZpZXd9IHdpdGhvdXQge0BsaW5rIEV2ZW50U291cmNlfSBpbnRlcmZhY2UuIDxicj5cbiAqICAgICBDYW4gYmUgc3BlY2lmaWVkIGFzIG1peGluIHNvdXJjZS5cbiAqIEBqYSB7QGxpbmsgRXZlbnRTb3VyY2V9IOOCpOODs+OCv+ODvOODleOCp+OCpOOCueOCkuaMgeOBn+OBquOBhCB7QGxpbmsgVmlld30g44Gu44Kz44Ki5a6f6KOFIDxicj5cbiAqICAgICBNaXhpbiBzb3VyY2Ug44Go44GX44Gm5oyH5a6a5Y+v6IO9XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBWaWV3Q29yZTxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudD4ge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXSE6IFByb3BlcnR5PFRFbGVtZW50PjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGNvbnN0cnVjdGlvbi9kZXN0cnVjdGlvbjpcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zPzogVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIGlmIChmYWxzZSAhPT0gb3B0aW9ucyBhcyB1bmtub3duIGFzIGJvb2xlYW4pIHtcbiAgICAgICAgICAgIHRoaXNbX2luaXRpYWxpemVdKG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbGVhc2UgYWxsIGxpc3RlbmVycy5cbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Oq44K544OK44O844KS6Kej6ZmkXG4gICAgICovXG4gICAgcHVibGljIHJlbGVhc2UoKTogdGhpcyB7XG4gICAgICAgIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHRoaXMgdmlldyBieSB0YWtpbmcgdGhlIGVsZW1lbnQgb3V0IG9mIHRoZSBET00gd2l0aCByZWxlYXNlIGFsbCBsaXN0ZW5lcnMuXG4gICAgICogQGphIFZpZXcg44GL44KJIERPTSDjgpLliIfjgorpm6LjgZcsIOODquOCueODiuODvOOCkuino+mZpFxuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmUoKTogdGhpcyB7XG4gICAgICAgIHRoaXMucmVsZWFzZSgpO1xuICAgICAgICB0aGlzLiRlbC5yZW1vdmUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IGF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29udGVudCBJRC5cbiAgICAgKiBAamEg44Kz44Oz44OG44Oz44OEIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCB7IGNpZCwgaWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gaWQgPz8gY2lkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZWxlbWVudC5cbiAgICAgKiBAamEg6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGVsKCk6IFRFbGVtZW50IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLiRlbFswXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHtAbGluayBET019IG9iamVjdC5cbiAgICAgKiBAamEge0BsaW5rIERPTX0g44Kq44OW44K444Kn44Kv44OI44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0ICRlbCgpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLiRlbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGludGVybmFsIGNvbnRlbnQgSUQuXG4gICAgICogQGphIOWGhemDqOOBruOCs+ODs+ODhuODs+ODhCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9jaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNpZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGRlZmF1bHQgdGFnIG5hbWUuXG4gICAgICogQGphIOaXouWumuOBruOCv+OCsOWQjeOCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3RhZ05hbWUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnRhZ05hbWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEF0dHJpYnV0ZXMgaW5zdGFuY2VcbiAgICAgKiBAamEg5bGe5oCn44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfYXR0cnMoKTogUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGw+IHtcbiAgICAgICAgY29uc3QgeyBhdHRyaWJ1dGVzLCBpZCwgY2xhc3NOYW1lIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oZHJvcCh7IGlkLCBjbGFzczogY2xhc3NOYW1lIH0pLCBhdHRyaWJ1dGVzKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb246XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hhbmdlIHRoZSB2aWV3J3MgZWxlbWVudCAoYHRoaXMuZWxgIHByb3BlcnR5KSBhbmQgcmUtZGVsZWdhdGUgdGhlIHZpZXcncyBldmVudHMgb24gdGhlIG5ldyBlbGVtZW50LlxuICAgICAqIEBqYSBWaWV3IOOBjOeuoei9hOOBmeOCi+imgee0oCAoYHRoaXMuZWxgIHByb3BlcnR5KSDjga7lpInmm7QuIOOCpOODmeODs+ODiOWGjeioreWumuOCguWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGVsXG4gICAgICogIC0gYGVuYCBPYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBlbGVtZW50LlxuICAgICAqICAtIGBqYWAg6KaB57Sg44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OI44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHNldEVsZW1lbnQoZWw6IERPTVNlbGVjdG9yPFRFbGVtZW50IHwgc3RyaW5nPik6IHRoaXMge1xuICAgICAgICB0aGlzLnVuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uJGVsID0gJChlbCkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgdGhpcy5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IERPTSBjYWxsYmFja3MgZnJvbSB7QGxpbmsgVmlld0V2ZW50c0hhc2h9IG9iamVjdC5cbiAgICAgKiBAamEge0BsaW5rIFZpZXdFdmVudHNIYXNofSDjgqrjg5bjgrjjgqfjgq/jg4jjgYvjgokgRE9NIOOCs+ODvOODq+ODkOODg+OCr+OCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGV2ZW50c1xuICAgICAqICAtIGBlbmAge0BsaW5rIFZpZXdFdmVudHNIYXNofSBvYmplY3QuIGB0aGlzLmV2ZW50cygpYCBpcyB1c2VkIGJ5IGRlZmF1bHQuXG4gICAgICogIC0gYGphYCB7QGxpbmsgVmlld0V2ZW50c0hhc2h9IOOCquODluOCuOOCp+OCr+ODiC4g5pei5a6a5YCk44GvIGB0aGlzLmV2ZW50cygpYFxuICAgICAqL1xuICAgIHB1YmxpYyBkZWxlZ2F0ZUV2ZW50cyhldmVudHM/OiBWaWV3RXZlbnRzSGFzaDxURWxlbWVudD4pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgaGFzaCA9IGV2ZW50cyA/PyB0aGlzLmV2ZW50cygpO1xuICAgICAgICBpZiAoaXNFbXB0eU9iamVjdChoYXNoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnVuZGVsZWdhdGVFdmVudHMoKTtcblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhoYXNoKSkge1xuICAgICAgICAgICAgbGV0IG1ldGhvZCA9IGhhc2hba2V5XSBhcyBVbmtub3duRnVuY3Rpb247XG4gICAgICAgICAgICBpZiAoIWlzRnVuY3Rpb24obWV0aG9kKSkge1xuICAgICAgICAgICAgICAgIG1ldGhvZCA9IHRoaXNbbWV0aG9kXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghbWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IC9eKFxcUyspXFxzKiguKikkLy5leGVjKGtleSkhO1xuICAgICAgICAgICAgdGhpcy5kZWxlZ2F0ZTxhbnk+KG1hdGNoWzFdLCBtYXRjaFsyXSwgbWV0aG9kLmJpbmQodGhpcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFycyBhbGwgY2FsbGJhY2tzIHByZXZpb3VzbHkgYm91bmQgdG8gdGhlIHZpZXcgYnkgYGRlbGVnYXRlYC5cbiAgICAgKiBAamEgYGRlbGVnYXRlYCDjgZXjgozjgZ/jgqTjg5njg7Pjg4jjgpLjgZnjgbnjgabliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgdW5kZWxlZ2F0ZUV2ZW50cygpOiB0aGlzIHtcbiAgICAgICAgdGhpcy4kZWw/Lm9mZjxhbnk+KGAuJHt0aGlzLl9jaWR9YCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwgMeOBpOOBvuOBn+OBr+ikh+aVsOOBruOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBkZWxlZ2F0ZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IChFdmVudFR5cGU8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI6IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCAx44Gk44G+44Gf44Gv6KSH5pWw44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGRlbGVnYXRlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBsaXN0ZW5lcjogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgZGVsZWdhdGUodHlwZTogc3RyaW5nLCAuLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgKHRoaXMuJGVsIGFzIGFueSkub24oYCR7dHlwZX0uJHt0aGlzLl9jaWR9YCwgLi4uYXJncyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZXZlbnQgaGFuZGxlci4gVGhlIGhhbmRsZXIgZGVzaWduYXRlZCBhdCB7QGxpbmsgRE9NRXZlbnRzLm9ufSBvciB7QGxpbmsgRE9NRXZlbnRzLm9uY2V9IGFuZCB0aGF0IHNhbWUgY29uZGl0aW9uIGFyZSByZWxlYXNlZC4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgbWV0aG9kIHJlY2VpdmVzIG5vIGFyZ3VtZW50cywgYWxsIGhhbmRsZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiBAamEg6Kit5a6a44GV44KM44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44Gu6Kej6ZmkLiB7QGxpbmsgRE9NRXZlbnRzLm9ufSDjgb7jgZ/jga8ge0BsaW5rIERPTUV2ZW50cy5vbmNlfSDjgajlkIzmnaHku7bjgafmjIflrprjgZfjgZ/jgoLjga7jgYzop6PpmaTjgZXjgozjgosgPGJyPlxuICAgICAqICAgICDlvJXmlbDjgYznhKHjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg4/jg7Pjg4njg6njgYzop6PpmaTjgZXjgozjgosuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHVuZGVsZWdhdGU8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPiB8IChFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgICAgICBsaXN0ZW5lcj86IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBldmVudCBoYW5kbGVyLiBUaGUgaGFuZGxlciBkZXNpZ25hdGVkIGF0IHtAbGluayBET01FdmVudHMub259IG9yIHtAbGluayBET01FdmVudHMub25jZX0gYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIHtAbGluayBET01FdmVudHMub259IOOBvuOBn+OBryB7QGxpbmsgRE9NRXZlbnRzLm9uY2V9IOOBqOWQjOadoeS7tuOBp+aMh+WumuOBl+OBn+OCguOBruOBjOino+mZpOOBleOCjOOCiyA8YnI+XG4gICAgICogICAgIOW8leaVsOOBjOeEoeOBhOWgtOWQiOOBr+OBmeOBueOBpuOBruODj+ODs+ODieODqeOBjOino+mZpOOBleOCjOOCiy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdW5kZWxlZ2F0ZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIGxpc3RlbmVyPzogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgdW5kZWxlZ2F0ZSh0eXBlOiBzdHJpbmcsIC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICAodGhpcy4kZWwgYXMgYW55KS5vZmYoYCR7dHlwZX0uJHt0aGlzLl9jaWR9YCwgLi4uYXJncyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGRlc2NlbmRhbnRzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5oyH5a6a44GX44Gf44K744Os44Kv44K/44Gr5LiA6Ie044GZ44KL6KaB57Sg44KS5qSc57SiXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIERPTS5cbiAgICAgKiAgLSBgamFgIERPTSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyAkPFQgZXh0ZW5kcyBWaWV3RmluZFNlbGVjdG9yID0gVmlld0ZpbmRTZWxlY3Rvcj4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuJGVsLmZpbmQoc2VsZWN0b3IpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG92ZXJyaWRlOlxuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBldmVudHMgaGFzaCAob3IgbWV0aG9kKSBjYW4gYmUgdXNlZCB0byBzcGVjaWZ5IGEgc2V0IG9mIERPTSBldmVudHMgdGhhdCB3aWxsIGJlIGJvdW5kIHRvIG1ldGhvZHMgb24geW91ciBWaWV3IHRocm91Z2ggZGVsZWdhdGVFdmVudHMuXG4gICAgICogQGphIOOCpOODmeODs+ODiOOCu+ODrOOCr+OCv+OBqOOCs+ODvOODq+ODkOODg+OCr+OBruODj+ODg+OCt+ODpeOCkuWumue+qeOBlywg44Or44O844OI44Ko44Oz44OG44Kj44OG44Kj44Gn5o2V5o2J44GZ44KLIERPTSDjgqTjg5njg7Pjg4jjgpLmjIflrppcbiAgICAgKlxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBjbGFzcyBTYW1wbGVWaWV3IGV4dGVuZHMgVmlldyB7XG4gICAgICogICAgIHByb3RlY3RlZCBldmVudHMoKTogVmlld0V2ZW50c0hhc2gge1xuICAgICAqICAgICAgICAgcmV0dXJuIHtcbiAgICAgKiAgICAgICAgICAgICAnbW91c2Vkb3duIC50aXRsZSc6ICAnZWRpdCcsXG4gICAgICogICAgICAgICAgICAgJ2NsaWNrIC5idXR0b24nOiAgICAgJ3NhdmUnLFxuICAgICAqICAgICAgICAgICAgICdjbGljayAub3Blbic6ICAgICAgIGZ1bmN0aW9uKGUpIHsgLi4uIH0sXG4gICAgICogICAgICAgICAgICAgJ2NsaWNrIC5jbG9zZSc6ICAgICAgdGhpcy5vbkNsb3NlLFxuICAgICAqICAgICAgICAgfTtcbiAgICAgKiAgICAgfVxuICAgICAqIH1cbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBldmVudHMoKTogVmlld0V2ZW50c0hhc2g8VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHRoaXNbX3Byb3BlcnRpZXNdLmV2ZW50cyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWJzdHJhY3Q6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW1wbGVtZW50IHRoaXMgZnVuY3Rpb24gd2l0aCB5b3VyIGNvZGUgdGhhdCByZW5kZXJzIHRoZSB2aWV3IHRlbXBsYXRlIGZyb20gbW9kZWwgZGF0YSwgYW5kIHVwZGF0ZXMgYHRoaXMuZWxgIHdpdGggdGhlIG5ldyBIVE1MLlxuICAgICAqIEBqYSBgdGhpcy5lbGAg5pu05paw5pmC44Gu5paw44GX44GEIEhUTUwg44KS44Os44Oz44OA44Oq44Oz44Kw44Ot44K444OD44Kv44Gu5a6f6KOF6Zai5pWwLiDjg6Ljg4fjg6vmm7TmlrDjgaggVmlldyDjg4bjg7Pjg5fjg6zjg7zjg4jjgpLpgKPli5XjgZXjgZvjgosuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGltcG9ydCB7IFRlbXBsYXRlRW5naW5lIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAgICAgKlxuICAgICAqIGNsYXNzIFNhbXBsZVZpZXcgZXh0ZW5kcyBWaWV3IHtcbiAgICAgKiAgICAgcHJpdmF0ZSBfdGVtcGxhdGUgPSBUZW1wbGF0ZUVuZ2luZS5jb21waWxlKCd7e3RpdGxlfX0nKTtcbiAgICAgKiAgICAgcmVuZGVyKCk6IHZvaWQge1xuICAgICAqICAgICAgICAgdGhpcy4kZWwuaHRtbCh0aGlzLl90ZW1wbGF0ZSh0aGlzLm1vZGVsKSk7XG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICogYGBgXG4gICAgICovXG4gICAgYWJzdHJhY3QgcmVuZGVyKC4uLmFyZ3M6IHVua25vd25bXSk6IGFueTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGludGVybmFsOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByb3RlY3RlZCBbX2luaXRpYWxpemVdKG9wdGlvbnM/OiBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBlbCwgdGFnTmFtZSwgaWQsIGF0dHJpYnV0ZXMsIGNsYXNzTmFtZSwgZXZlbnRzIH0gPSBvcHRpb25zID8/IHt9O1xuXG4gICAgICAgICh0aGlzW19wcm9wZXJ0aWVzXSBhcyBXcml0YWJsZTxQcm9wZXJ0eTxURWxlbWVudD4+KSA9IHtcbiAgICAgICAgICAgIGNpZDogbHVpZCgndmlldzonLCA4KSxcbiAgICAgICAgICAgIGV2ZW50cyxcbiAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgY2xhc3NOYW1lLFxuICAgICAgICAgICAgYXR0cmlidXRlcyxcbiAgICAgICAgICAgIHRhZ05hbWU6IHRhZ05hbWUgPz8gJ2RpdicsXG4gICAgICAgIH0gYXMgUHJvcGVydHk8VEVsZW1lbnQ+O1xuXG4gICAgICAgIHRoaXNbX2Vuc3VyZUVsZW1lbnRdKGVsKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX2Vuc3VyZUVsZW1lbnRdKGVsPzogRE9NU2VsZWN0b3I8VEVsZW1lbnQgfCBzdHJpbmc+KTogdm9pZCB7XG4gICAgICAgIGlmICghZWwpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgX2F0dHJzLCBfdGFnTmFtZSB9ID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudChkb2N1bWVudC5jcmVhdGVFbGVtZW50KF90YWdOYW1lKSBhcyBOb2RlIGFzIFRFbGVtZW50KTtcbiAgICAgICAgICAgIHRoaXMuJGVsLmF0dHIoX2F0dHJzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudChlbCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwge0BsaW5rIFZpZXd9IGNsYXNzICovXG5hYnN0cmFjdCBjbGFzcyBWaWV3IGV4dGVuZHMgKG1peGlucyhFdmVudFNvdXJjZSwgVmlld0NvcmUgYXMgQ29uc3RydWN0b3I8Vmlld0NvcmU+KSkge1xuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zPzogVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5zdXBlcihWaWV3Q29yZSBhcyBDb25zdHJ1Y3RvcjxWaWV3Q29yZT4sIGZhbHNlKTtcbiAgICAgICAgdGhpc1tfaW5pdGlhbGl6ZV0ob3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbGVhc2UgYWxsIGxpc3RlbmVycy5cbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Oq44K544OK44O844KS6Kej6ZmkXG4gICAgICovXG4gICAgcHVibGljIHJlbGVhc2UoKTogdGhpcyB7XG4gICAgICAgIHN1cGVyLnJlbGVhc2UoKTtcbiAgICAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gICAgICAgIHRoaXMub2ZmKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQmFzZSBjbGFzcyBkZWZpbml0aW9uIGZvciB2aWV3IHRoYXQgbWFuYWdlcyB0aGUgbGF5b3V0IGFuZCBhIERPTSBldmVudHMuXG4gKiBAamEg44Os44Kk44Ki44Km44OI566h55CG44GoIERPTSDjgqTjg5njg7Pjg4jjga7nm6PoppbjgpLooYzjgYYgVmlldyDjga7ln7rlupXjgq/jg6njgrnlrprnvqlcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7XG4gKiAgICAgVGVtcGxhdGVFbmdpbmUsXG4gKiAgICAgRE9NLCBkb20gYXMgJCxcbiAqICAgICBWaWV3LCBWaWV3RXZlbnRzSGFzaCxcbiAqIH0gZnJvbSAnQGNkcC9ydW10aW1lJztcbiAqIGltcG9ydCB7IFRvRG8sIFRvRG9FdmVudFNvdXJjZSB9IGZyb20gJy4vdG9kbyc7XG4gKlxuICogY29uc3QgX3RlbXBsYXRlID0gVGVtcGxhdGVFbmdpbmUuY29tcGlsZSgkKCcjaXRlbS10ZW1wbGF0ZScpLmh0bWwoKSk7XG4gKlxuICogZXhwb3J0IGNsYXNzIFRvRG9WaWV3IGV4dGVuZHMgVmlldyB7XG4gKiAgICAgcHJpdmF0ZSBfbW9kZWw6IFRvRG87XG4gKiAgICAgcHJpdmF0ZSBfJGlucHV0PzogRE9NPEhUTUxJbnB1dEVsZW1lbnQ+O1xuICpcbiAqICAgICBjb25zdHJ1Y3Rvcih0b2RvOiBUb0RvKSB7XG4gKiAgICAgICAgIHN1cGVyKHsgdGFnTmFtZTogJ2xpJyB9KTtcbiAqICAgICAgICAgdGhpcy5fbW9kZWwgPSB0b2RvO1xuICogICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuX21vZGVsIGFzIFRvRG9FdmVudFNvdXJjZSwgJ0BjaGFuZ2UnLCB0aGlzLnJlbmRlci5iaW5kKHRoaXMpKTtcbiAqICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLl9tb2RlbCBhcyBUb0RvRXZlbnRTb3VyY2UsICdAZGVzdHJveScsIHRoaXMucmVtb3ZlLmJpbmQodGhpcykpO1xuICogICAgIH1cbiAqXG4gKiAgICAgcHJvdGVjdGVkIGV2ZW50cygpOiBWaWV3RXZlbnRzSGFzaDxIVE1MRWxlbWVudD4ge1xuICogICAgICAgICByZXR1cm4ge1xuICogICAgICAgICAgICAgJ2NsaWNrIC50b2dnbGUnOiAgIHRoaXMudG9nZ2xlRG9uZSxcbiAqICAgICAgICAgICAgICdkYmxjbGljayAudmlldyc6ICB0aGlzLmVkaXQsXG4gKiAgICAgICAgICAgICAnY2xpY2sgYS5kZXN0cm95JzogdGhpcy5jbGVhcixcbiAqICAgICAgICAgICAgICdrZXlwcmVzcyAuZWRpdCc6ICB0aGlzLnVwZGF0ZU9uRW50ZXIsXG4gKiAgICAgICAgICAgICAnYmx1ciAuZWRpdCc6ICAgICAgdGhpcy5jbG9zZSxcbiAqICAgICAgICAgfTtcbiAqICAgICB9XG4gKlxuICogICAgIHJlbmRlcigpOiB0aGlzIHtcbiAqICAgICAgICAgdGhpcy4kZWwuaHRtbChfdGVtcGxhdGUodGhpcy5fbW9kZWwudG9KU09OKCkpKTtcbiAqICAgICAgICAgdGhpcy4kZWwudG9nZ2xlQ2xhc3MoJ2RvbmUnLCB0aGlzLl9tb2RlbC5kb25lKTtcbiAqICAgICAgICAgdGhpcy5fJGlucHV0ID0gdGhpcy4kKCcuZWRpdCcpIGFzIERPTTxIVE1MSW5wdXRFbGVtZW50PjtcbiAqICAgICAgICAgcmV0dXJuIHRoaXM7XG4gKiAgICAgfVxuICogICAgIDpcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBfVmlldzxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PiA9IFZpZXdDb3JlIDxURWxlbWVudD4gJiBFdmVudFNvdXJjZTxURXZlbnQ+O1xuXG4vKipcbiAqIEBlbiBDb25zdHJ1Y3RvciBvZiB7QGxpbmsgVmlld31cbiAqIEBqYSB7QGxpbmsgVmlld30g44Gu44Kz44Oz44K544OI44Op44Kv44K/5a6f5L2TXG4gKi9cbmNvbnN0IF9WaWV3OiB7XG4gICAgcmVhZG9ubHkgcHJvdG90eXBlOiBfVmlldzxhbnksIGFueT47XG4gICAgbmV3IDxURWxlbWVudCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVEV2ZW50IGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PihvcHRpb25zPzogVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQ+KTogX1ZpZXc8VEVsZW1lbnQsIFRFdmVudD47XG59ID0gVmlldyBhcyBhbnk7XG5cbmV4cG9ydCB7IF9WaWV3IGFzIFZpZXcgfTtcbiJdLCJuYW1lcyI6WyJzYWZlIiwiZHJvcCIsIiQiLCJpc0VtcHR5T2JqZWN0IiwiaXNGdW5jdGlvbiIsImx1aWQiLCJtaXhpbnMiLCJFdmVudFNvdXJjZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFDQSxpQkFBd0IsTUFBTSxRQUFRLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDOztJQ0RsRTs7SUFFRztJQTRCSCxpQkFBaUIsTUFBTSxXQUFXLEdBQU0sTUFBTSxDQUFDLGVBQWUsQ0FBQztJQUMvRCxpQkFBaUIsTUFBTSxXQUFXLEdBQU0sTUFBTSxDQUFDLFlBQVksQ0FBQztJQUM1RCxpQkFBaUIsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDO0lBaUJoRTs7Ozs7SUFLRztVQUNtQixRQUFRLENBQUE7O1FBR1QsQ0FBQyxXQUFXOzs7SUFLN0I7Ozs7OztJQU1HO0lBQ0gsSUFBQSxXQUFBLENBQVksT0FBMkMsRUFBQTtJQUNuRCxRQUFBLElBQUksS0FBSyxLQUFLLE9BQTZCLEVBQUU7SUFDekMsWUFBQSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDOzs7SUFJbEM7OztJQUdHO1FBQ0ksT0FBTyxHQUFBO1lBQ1YsSUFBSSxDQUFDLGdCQUFnQixFQUFFO0lBQ3ZCLFFBQUEsT0FBTyxJQUFJOztJQUdmOzs7SUFHRztRQUNJLE1BQU0sR0FBQTtZQUNULElBQUksQ0FBQyxPQUFPLEVBQUU7SUFDZCxRQUFBLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFO0lBQ2pCLFFBQUEsT0FBTyxJQUFJOzs7O0lBTWY7OztJQUdHO0lBQ0gsSUFBQSxJQUFJLEVBQUUsR0FBQTtZQUNGLE1BQU0sRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztZQUNyQyxPQUFPLEVBQUUsSUFB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