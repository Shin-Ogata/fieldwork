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
    /** @internal */ const _properties = Symbol('properties');
    /** @internal */ const _ensureElement = Symbol('ensure-element');
    /**
     * @en Base class definition for view that manages the layout and a DOM events.
     * @ja レイアウト管理と DOM イベントの監視を行う View の基底クラス定義
     *
     * @example <br>
     *
     * ```ts
     * import { TemplateEngine } from '@cdp/core-template';
     * import { DOM, dom as $ } from '@cdp/dom';
     * import { View, ViewEventsHash } from '@cdp/view';
     * import { ToDo, ToDoEventSource } from './todo';
     *
     * const _template = TemplateEngine.compile($('#item-template').html());
     *
     * export class ToDoView extends View {
     *     private _model: ToDo;
     *     private _$input?: DOM<HTMLInputElement>;
     *
     *     constructor(todo: ToDo) {
     *         super({ tagName: 'li' });
     *         this._model = todo;
     *         this.listenTo(this._model as ToDoEventSource, '@change', this.render.bind(this));
     *         this.listenTo(this._model as ToDoEventSource, '@destroy', this.remove.bind(this));
     *     }
     *
     *     protected events(): ViewEventsHash<HTMLElement> {
     *         return {
     *             'click .toggle':   this.toggleDone,
     *             'dblclick .view':  this.edit,
     *             'click a.destroy': this.clear,
     *             'keypress .edit':  this.updateOnEnter,
     *             'blur .edit':      this.close,
     *         };
     *     }
     *
     *     render(): this {
     *         this.$el.html(_template(this._model.toJSON()));
     *         this.$el.toggleClass('done', this._model.done);
     *         this._$input = this.$('.edit') as DOM<HTMLInputElement>;
     *         return this;
     *     }
     *     :
     * }
     * ```
     */
    class View extends events.EventSource {
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
            super();
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
        /**
         * @en Release all listeners.
         * @ja すべてのリスナーを解除
         */
        release() {
            this.undelegateEvents();
            this.stopListening();
            this.off();
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

    exports.View = View;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlldy5qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwiYmFzZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGRvY3VtZW50ID0gc2FmZShnbG9iYWxUaGlzLmRvY3VtZW50KTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIE51bGxpc2gsXG4gICAgUGxhaW5PYmplY3QsXG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNFbXB0eU9iamVjdCxcbiAgICBsdWlkLFxuICAgIGRyb3AsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudFNvdXJjZSB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgRE9NLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET01FdmVudExpc3RlbmVyLFxuICAgIERPTUV2ZW50TWFwLFxuICAgIEV2ZW50VHlwZSxcbiAgICBFdmVudFR5cGVPck5hbWVzcGFjZSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHsgVmlld0V2ZW50c0hhc2gsIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzICAgID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9lbnN1cmVFbGVtZW50ID0gU3ltYm9sKCdlbnN1cmUtZWxlbWVudCcpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHk8VCBleHRlbmRzIE5vZGU+IHtcbiAgICByZWFkb25seSBjaWQ6IHN0cmluZztcbiAgICByZWFkb25seSBldmVudHM/OiBWaWV3RXZlbnRzSGFzaDxUPjtcbiAgICByZWFkb25seSBpZD86IHN0cmluZztcbiAgICByZWFkb25seSBjbGFzc05hbWU/OiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgYXR0cmlidXRlcz86IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsPjtcbiAgICByZWFkb25seSB0YWdOYW1lOiBzdHJpbmc7XG4gICAgJGVsOiBET008VD47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG5leHBvcnQgdHlwZSBWaWV3RmluZFNlbGVjdG9yID0gTm9kZSB8IHN0cmluZyB8IE51bGxpc2g7XG5cbi8qKlxuICogQGVuIEJhc2UgY2xhc3MgZGVmaW5pdGlvbiBmb3IgdmlldyB0aGF0IG1hbmFnZXMgdGhlIGxheW91dCBhbmQgYSBET00gZXZlbnRzLlxuICogQGphIOODrOOCpOOCouOCpuODiOeuoeeQhuOBqCBET00g44Kk44OZ44Oz44OI44Gu55uj6KaW44KS6KGM44GGIFZpZXcg44Gu5Z+65bqV44Kv44Op44K55a6a576pXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBUZW1wbGF0ZUVuZ2luZSB9IGZyb20gJ0BjZHAvY29yZS10ZW1wbGF0ZSc7XG4gKiBpbXBvcnQgeyBET00sIGRvbSBhcyAkIH0gZnJvbSAnQGNkcC9kb20nO1xuICogaW1wb3J0IHsgVmlldywgVmlld0V2ZW50c0hhc2ggfSBmcm9tICdAY2RwL3ZpZXcnO1xuICogaW1wb3J0IHsgVG9EbywgVG9Eb0V2ZW50U291cmNlIH0gZnJvbSAnLi90b2RvJztcbiAqXG4gKiBjb25zdCBfdGVtcGxhdGUgPSBUZW1wbGF0ZUVuZ2luZS5jb21waWxlKCQoJyNpdGVtLXRlbXBsYXRlJykuaHRtbCgpKTtcbiAqXG4gKiBleHBvcnQgY2xhc3MgVG9Eb1ZpZXcgZXh0ZW5kcyBWaWV3IHtcbiAqICAgICBwcml2YXRlIF9tb2RlbDogVG9EbztcbiAqICAgICBwcml2YXRlIF8kaW5wdXQ/OiBET008SFRNTElucHV0RWxlbWVudD47XG4gKlxuICogICAgIGNvbnN0cnVjdG9yKHRvZG86IFRvRG8pIHtcbiAqICAgICAgICAgc3VwZXIoeyB0YWdOYW1lOiAnbGknIH0pO1xuICogICAgICAgICB0aGlzLl9tb2RlbCA9IHRvZG87XG4gKiAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5fbW9kZWwgYXMgVG9Eb0V2ZW50U291cmNlLCAnQGNoYW5nZScsIHRoaXMucmVuZGVyLmJpbmQodGhpcykpO1xuICogICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuX21vZGVsIGFzIFRvRG9FdmVudFNvdXJjZSwgJ0BkZXN0cm95JywgdGhpcy5yZW1vdmUuYmluZCh0aGlzKSk7XG4gKiAgICAgfVxuICpcbiAqICAgICBwcm90ZWN0ZWQgZXZlbnRzKCk6IFZpZXdFdmVudHNIYXNoPEhUTUxFbGVtZW50PiB7XG4gKiAgICAgICAgIHJldHVybiB7XG4gKiAgICAgICAgICAgICAnY2xpY2sgLnRvZ2dsZSc6ICAgdGhpcy50b2dnbGVEb25lLFxuICogICAgICAgICAgICAgJ2RibGNsaWNrIC52aWV3JzogIHRoaXMuZWRpdCxcbiAqICAgICAgICAgICAgICdjbGljayBhLmRlc3Ryb3knOiB0aGlzLmNsZWFyLFxuICogICAgICAgICAgICAgJ2tleXByZXNzIC5lZGl0JzogIHRoaXMudXBkYXRlT25FbnRlcixcbiAqICAgICAgICAgICAgICdibHVyIC5lZGl0JzogICAgICB0aGlzLmNsb3NlLFxuICogICAgICAgICB9O1xuICogICAgIH1cbiAqXG4gKiAgICAgcmVuZGVyKCk6IHRoaXMge1xuICogICAgICAgICB0aGlzLiRlbC5odG1sKF90ZW1wbGF0ZSh0aGlzLl9tb2RlbC50b0pTT04oKSkpO1xuICogICAgICAgICB0aGlzLiRlbC50b2dnbGVDbGFzcygnZG9uZScsIHRoaXMuX21vZGVsLmRvbmUpO1xuICogICAgICAgICB0aGlzLl8kaW5wdXQgPSB0aGlzLiQoJy5lZGl0JykgYXMgRE9NPEhUTUxJbnB1dEVsZW1lbnQ+O1xuICogICAgICAgICByZXR1cm4gdGhpcztcbiAqICAgICB9XG4gKiAgICAgOlxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBWaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+IGV4dGVuZHMgRXZlbnRTb3VyY2U8VEV2ZW50PiB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdOiBQcm9wZXJ0eTxURWxlbWVudD47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBjb25zdHJ1Y3Rpb24vZGVzdHJ1Y3Rpb246XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucz86IFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIGNvbnN0IHsgZWwsIHRhZ05hbWUsIGlkLCBhdHRyaWJ1dGVzLCBjbGFzc05hbWUsIGV2ZW50cyB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10gPSB7XG4gICAgICAgICAgICBjaWQ6IGx1aWQoJ3ZpZXc6JywgOCksXG4gICAgICAgICAgICBldmVudHMsXG4gICAgICAgICAgICBpZCxcbiAgICAgICAgICAgIGNsYXNzTmFtZSxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMsXG4gICAgICAgICAgICB0YWdOYW1lOiB0YWdOYW1lIHx8ICdkaXYnLFxuICAgICAgICB9IGFzIFByb3BlcnR5PFRFbGVtZW50PjtcblxuICAgICAgICB0aGlzW19lbnN1cmVFbGVtZW50XShlbCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbGVhc2UgYWxsIGxpc3RlbmVycy5cbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Oq44K544OK44O844KS6Kej6ZmkXG4gICAgICovXG4gICAgcHVibGljIHJlbGVhc2UoKTogdGhpcyB7XG4gICAgICAgIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICAgICAgdGhpcy5vZmYoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSB0aGlzIHZpZXcgYnkgdGFraW5nIHRoZSBlbGVtZW50IG91dCBvZiB0aGUgRE9NIHdpdGggcmVsZWFzZSBhbGwgbGlzdGVuZXJzLlxuICAgICAqIEBqYSBWaWV3IOOBi+OCiSBET00g44KS5YiH44KK6Zui44GXLCDjg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlKCk6IHRoaXMge1xuICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgdGhpcy4kZWwucmVtb3ZlKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBhdHRyaWJ1dGVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNvbnRlbnQgSUQuXG4gICAgICogQGphIOOCs+ODs+ODhuODs+ODhCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgeyBjaWQsIGlkIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIGlkIHx8IGNpZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGVsZW1lbnQuXG4gICAgICogQGphIOimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBlbCgpOiBURWxlbWVudCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS4kZWxbMF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBbW0RPTV1dIG9iamVjdC5cbiAgICAgKiBAamEgW1tET01dXSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgJGVsKCk6IERPTTxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uJGVsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgaW50ZXJuYWwgY29udGVudCBJRC5cbiAgICAgKiBAamEg5YaF6YOo44Gu44Kz44Oz44OG44Oz44OEIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2NpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY2lkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZGVmYXVsdCB0YWcgbmFtZS5cbiAgICAgKiBAamEg5pei5a6a44Gu44K/44Kw5ZCN44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfdGFnTmFtZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10udGFnTmFtZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDlsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9hdHRycygpOiBQbGFpbk9iamVjdDxzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbD4ge1xuICAgICAgICBjb25zdCB7IGF0dHJpYnV0ZXMsIGlkLCBjbGFzc05hbWUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihkcm9wKHsgaWQsIGNsYXNzOiBjbGFzc05hbWUgfSksIGF0dHJpYnV0ZXMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbjpcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGFuZ2UgdGhlIHZpZXcncyBlbGVtZW50IChgdGhpcy5lbGAgcHJvcGVydHkpIGFuZCByZS1kZWxlZ2F0ZSB0aGUgdmlldydzIGV2ZW50cyBvbiB0aGUgbmV3IGVsZW1lbnQuXG4gICAgICogQGphIFZpZXcg44GM566h6L2E44GZ44KL6KaB57SgIChgdGhpcy5lbGAgcHJvcGVydHkpIOOBruWkieabtC4g44Kk44OZ44Oz44OI5YaN6Kit5a6a44KC5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWxcbiAgICAgKiAgLSBgZW5gIE9iamVjdCBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCDopoHntKDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4jjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0RWxlbWVudChlbDogRE9NU2VsZWN0b3I8VEVsZW1lbnQgfCBzdHJpbmc+KTogdGhpcyB7XG4gICAgICAgIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS4kZWwgPSAkKGVsKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB0aGlzLmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgRE9NIGNhbGxiYWNrcyBmcm9tIFtbVmlld0V2ZW50c0hhc2hdXSBvYmplY3QuXG4gICAgICogQGphIFtbVmlld0V2ZW50c0hhc2hdXSDjgqrjg5bjgrjjgqfjgq/jg4jjgYvjgokgRE9NIOOCs+ODvOODq+ODkOODg+OCr+OCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGV2ZW50c1xuICAgICAqICAtIGBlbmAgW1tWaWV3RXZlbnRzSGFzaF1dIG9iamVjdC4gYHRoaXMuZXZlbnRzKClgIGlzIHVzZWQgYnkgZGVmYXVsdC5cbiAgICAgKiAgLSBgamFgIFtbVmlld0V2ZW50c0hhc2hdXSDjgqrjg5bjgrjjgqfjgq/jg4guIOaXouWumuWApOOBryBgdGhpcy5ldmVudHMoKWBcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVsZWdhdGVFdmVudHMoZXZlbnRzPzogVmlld0V2ZW50c0hhc2g8VEVsZW1lbnQ+KTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGhhc2ggPSBldmVudHMgfHwgdGhpcy5ldmVudHMoKTtcbiAgICAgICAgaWYgKGlzRW1wdHlPYmplY3QoaGFzaCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoaGFzaCkpIHtcbiAgICAgICAgICAgIGxldCBtZXRob2QgPSBoYXNoW2tleV0gYXMgVW5rbm93bkZ1bmN0aW9uO1xuICAgICAgICAgICAgaWYgKCFpc0Z1bmN0aW9uKG1ldGhvZCkpIHtcbiAgICAgICAgICAgICAgICBtZXRob2QgPSB0aGlzW21ldGhvZF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIW1ldGhvZCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSAvXihcXFMrKVxccyooLiopJC8uZXhlYyhrZXkpIGFzIFJlZ0V4cEV4ZWNBcnJheTtcbiAgICAgICAgICAgIHRoaXMuZGVsZWdhdGU8YW55PihtYXRjaFsxXSwgbWF0Y2hbMl0sIG1ldGhvZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhcnMgYWxsIGNhbGxiYWNrcyBwcmV2aW91c2x5IGJvdW5kIHRvIHRoZSB2aWV3IGJ5IGBkZWxlZ2F0ZWAuXG4gICAgICogQGphIGBkZWxlZ2F0ZWAg44GV44KM44Gf44Kk44OZ44Oz44OI44KS44GZ44G544Gm5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIHVuZGVsZWdhdGVFdmVudHMoKTogdGhpcyB7XG4gICAgICAgIHRoaXMuJGVsICYmIHRoaXMuJGVsLm9mZjxhbnk+KGAuJHt0aGlzLl9jaWR9YCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwgMeOBpOOBvuOBn+OBr+ikh+aVsOOBruOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBkZWxlZ2F0ZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IChFdmVudFR5cGU8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI6IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCAx44Gk44G+44Gf44Gv6KSH5pWw44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGRlbGVnYXRlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBsaXN0ZW5lcjogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgZGVsZWdhdGUodHlwZTogc3RyaW5nLCAuLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgKHRoaXMuJGVsIGFzIGFueSkub24oYCR7dHlwZX0uJHt0aGlzLl9jaWR9YCwgLi4uYXJncyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZXZlbnQgaGFuZGxlci4gVGhlIGhhbmRsZXIgZGVzaWduYXRlZCBhdCBbW29uXV0gb3IgW1tvbmNlXV0gYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIFtbb25dXSDjgb7jgZ/jga8gW1tvbmNlXV0g44Go5ZCM5p2h5Lu244Gn5oyH5a6a44GX44Gf44KC44Gu44GM6Kej6Zmk44GV44KM44KLIDxicj5cbiAgICAgKiAgICAg5byV5pWw44GM54Sh44GE5aC05ZCI44Gv44GZ44G544Gm44Gu44OP44Oz44OJ44Op44GM6Kej6Zmk44GV44KM44KLLlxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB1bmRlbGVnYXRlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI/OiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZXZlbnQgaGFuZGxlci4gVGhlIGhhbmRsZXIgZGVzaWduYXRlZCBhdCBbW29uXV0gb3IgW1tvbmNlXV0gYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIFtbb25dXSDjgb7jgZ/jga8gW1tvbmNlXV0g44Go5ZCM5p2h5Lu244Gn5oyH5a6a44GX44Gf44KC44Gu44GM6Kej6Zmk44GV44KM44KLIDxicj5cbiAgICAgKiAgICAg5byV5pWw44GM54Sh44GE5aC05ZCI44Gv44GZ44G544Gm44Gu44OP44Oz44OJ44Op44GM6Kej6Zmk44GV44KM44KLLlxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB1bmRlbGVnYXRlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgbGlzdGVuZXI/OiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyB1bmRlbGVnYXRlKHR5cGU6IHN0cmluZywgLi4uYXJnczogdW5rbm93bltdKTogdGhpcyB7XG4gICAgICAgICh0aGlzLiRlbCBhcyBhbnkpLm9mZihgJHt0eXBlfS4ke3RoaXMuX2NpZH1gLCAuLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgZGVzY2VuZGFudHMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgavkuIDoh7TjgZnjgovopoHntKDjgpLmpJzntKJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgRE9NLlxuICAgICAqICAtIGBqYWAgRE9NIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljICQ8VCBleHRlbmRzIFZpZXdGaW5kU2VsZWN0b3IgPSBWaWV3RmluZFNlbGVjdG9yPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy4kZWwuZmluZChzZWxlY3Rvcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3ZlcnJpZGU6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIGV2ZW50cyBoYXNoIChvciBtZXRob2QpIGNhbiBiZSB1c2VkIHRvIHNwZWNpZnkgYSBzZXQgb2YgRE9NIGV2ZW50cyB0aGF0IHdpbGwgYmUgYm91bmQgdG8gbWV0aG9kcyBvbiB5b3VyIFZpZXcgdGhyb3VnaCBkZWxlZ2F0ZUV2ZW50cy5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI44K744Os44Kv44K/44Go44Kz44O844Or44OQ44OD44Kv44Gu44OP44OD44K344Ol44KS5a6a576p44GXLCDjg6vjg7zjg4jjgqjjg7Pjg4bjgqPjg4bjgqPjgafmjZXmjYnjgZnjgosgRE9NIOOCpOODmeODs+ODiOOCkuaMh+WumlxuICAgICAqXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNsYXNzIFNhbXBsZVZpZXcgZXh0ZW5kcyBWaWV3IHtcbiAgICAgKiAgICAgcHJvdGVjdGVkIGV2ZW50cygpOiBWaWV3RXZlbnRzSGFzaCB7XG4gICAgICogICAgICAgICByZXR1cm4ge1xuICAgICAqICAgICAgICAgICAgICdtb3VzZWRvd24gLnRpdGxlJzogICdlZGl0JyxcbiAgICAgKiAgICAgICAgICAgICAnY2xpY2sgLmJ1dHRvbic6ICAgICAnc2F2ZScsXG4gICAgICogICAgICAgICAgICAgJ2NsaWNrIC5vcGVuJzogICAgICAgZnVuY3Rpb24oZSkgeyAuLi4gfSxcbiAgICAgKiAgICAgICAgICAgICAnY2xpY2sgLmNsb3NlJzogICAgICB0aGlzLm9uQ2xvc2UsXG4gICAgICogICAgICAgICB9O1xuICAgICAqICAgICB9XG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGV2ZW50cygpOiBWaWV3RXZlbnRzSGFzaDxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgdGhpc1tfcHJvcGVydGllc10uZXZlbnRzKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhYnN0cmFjdDpcblxuICAgIC8qKlxuICAgICAqIEBlbiBJbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiB3aXRoIHlvdXIgY29kZSB0aGF0IHJlbmRlcnMgdGhlIHZpZXcgdGVtcGxhdGUgZnJvbSBtb2RlbCBkYXRhLCBhbmQgdXBkYXRlcyBgdGhpcy5lbGAgd2l0aCB0aGUgbmV3IEhUTUwuXG4gICAgICogQGphIGB0aGlzLmVsYCDmm7TmlrDmmYLjga7mlrDjgZfjgYQgSFRNTCDjgpLjg6zjg7Pjg4Djg6rjg7PjgrDjg63jgrjjg4Pjgq/jga7lrp/oo4XplqLmlbAuIOODouODh+ODq+abtOaWsOOBqCBWaWV3IOODhuODs+ODl+ODrOODvOODiOOCkumAo+WLleOBleOBm+OCiy5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogaW1wb3J0IHsgVGVtcGxhdGVFbmdpbmUgfSBmcm9tICdAY2RwL2NvcmUtdGVtcGxhdGUnO1xuICAgICAqXG4gICAgICogY2xhc3MgU2FtcGxlVmlldyBleHRlbmRzIFZpZXcge1xuICAgICAqICAgICBwcml2YXRlIF90ZW1wbGF0ZSA9IFRlbXBsYXRlRW5naW5lLmNvbXBpbGUoJ3t7dGl0bGV9fScpO1xuICAgICAqICAgICByZW5kZXIoKTogdm9pZCB7XG4gICAgICogICAgICAgICB0aGlzLiRlbC5odG1sKHRoaXMuX3RlbXBsYXRlKHRoaXMubW9kZWwpKTtcbiAgICAgKiAgICAgfVxuICAgICAqIH1cbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBhYnN0cmFjdCByZW5kZXIoLi4uYXJnczogdW5rbm93bltdKTogUHJvbWlzZTx0aGlzIHwgdm9pZD4gfCB0aGlzIHwgdm9pZDtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGludGVybmFsOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19lbnN1cmVFbGVtZW50XShlbD86IERPTVNlbGVjdG9yPFRFbGVtZW50IHwgc3RyaW5nPik6IHZvaWQge1xuICAgICAgICBpZiAoIWVsKSB7XG4gICAgICAgICAgICBjb25zdCB7IF9hdHRycywgX3RhZ05hbWUgfSA9IHRoaXM7XG4gICAgICAgICAgICB0aGlzLnNldEVsZW1lbnQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudChfdGFnTmFtZSkgYXMgTm9kZSBhcyBURWxlbWVudCk7XG4gICAgICAgICAgICB0aGlzLiRlbC5hdHRyKF9hdHRycyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldEVsZW1lbnQoZWwpO1xuICAgICAgICB9XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbInNhZmUiLCJFdmVudFNvdXJjZSIsImx1aWQiLCJkcm9wIiwiJCIsImlzRW1wdHlPYmplY3QiLCJpc0Z1bmN0aW9uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUNBLGlCQUF3QixNQUFNLFFBQVEsR0FBR0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7O0lDRGxFOztJQUVHO0lBeUJILGlCQUFpQixNQUFNLFdBQVcsR0FBTSxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDN0QsaUJBQWlCLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBaUJqRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUE0Q0c7SUFDRyxNQUFnQixJQUEwRSxTQUFRQyxrQkFBbUIsQ0FBQTs7UUFHdEcsQ0FBQyxXQUFXLEVBQXNCOzs7SUFLbkQ7Ozs7OztJQU1HO0lBQ0gsSUFBQSxXQUFBLENBQVksT0FBMkMsRUFBQTtJQUNuRCxRQUFBLEtBQUssRUFBRSxDQUFDO0lBRVIsUUFBQSxNQUFNLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO1lBQ3pFLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRztJQUNoQixZQUFBLEdBQUcsRUFBRUMsY0FBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7Z0JBQ3JCLE1BQU07Z0JBQ04sRUFBRTtnQkFDRixTQUFTO2dCQUNULFVBQVU7Z0JBQ1YsT0FBTyxFQUFFLE9BQU8sSUFBSSxLQUFLO2FBQ04sQ0FBQztJQUV4QixRQUFBLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUM1QjtJQUVEOzs7SUFHRztRQUNJLE9BQU8s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Q0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzdELFNBQUE7SUFFRCxRQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7SUFFRDs7O0lBR0c7UUFDSSxnQkFBZ0IsR0FBQTtJQUNuQixRQUFBLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFBLENBQUUsQ0FBQyxDQUFDO0lBQy9DLFFBQUEsT0FBTyxJQUFJLENBQUM7U0FDZjtJQThDTSxJQUFBLFFBQVEsQ0FBQyxJQUFZLEVBQUUsR0FBRyxJQUFlLEVBQUE7SUFDM0MsUUFBQSxJQUFJLENBQUMsR0FBVyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQSxDQUFBLEVBQUksSUFBSSxDQUFDLElBQUksQ0FBRSxDQUFBLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUN0RCxRQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7SUFrRE0sSUFBQSxVQUFVLENBQUMsSUFBWSxFQUFFLEdBQUcsSUFBZSxFQUFBO0lBQzdDLFFBQUEsSUFBSSxDQUFDLEdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUEsQ0FBQSxFQUFJLElBQUksQ0FBQyxJQUFJLENBQUUsQ0FBQSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDdkQsUUFBQSxPQUFPLElBQUksQ0FBQztTQUNmO0lBRUQ7Ozs7Ozs7SUFPRztJQUNJLElBQUEsQ0FBQyxDQUFnRCxRQUF3QixFQUFBO1lBQzVFLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDbEM7OztJQUtEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFxQkc7UUFDTyxNQUFNLEdBQUE7SUFDWixRQUFBLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3REOzs7O1FBNEJPLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBbUMsRUFBQTtZQUN4RCxJQUFJLENBQUMsRUFBRSxFQUFFO0lBQ0wsWUFBQSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQztnQkFDbEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBcUIsQ0FBQyxDQUFDO0lBQ3RFLFlBQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDekIsU0FBQTtJQUFNLGFBQUE7SUFDSCxZQUFBLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDdkIsU0FBQTtTQUNKO0lBQ0o7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL3ZpZXcvIn0=