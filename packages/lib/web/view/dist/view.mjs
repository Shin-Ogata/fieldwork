/*!
 * @cdp/view 0.9.13
 *   generic view scheme
 */

import { safe, luid, drop, isEmptyObject, isFunction } from '@cdp/core-utils';
import { EventSource } from '@cdp/events';
import { dom } from '@cdp/dom';

/** @internal */ const document = safe(globalThis.document);

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
class View extends EventSource {
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
            cid: luid('view:', 8),
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
     * @en Set DOM callbacks from [[ViewEventsHash]] object.
     * @ja [[ViewEventsHash]] オブジェクトから DOM コールバックを設定
     *
     * @param events
     *  - `en` [[ViewEventsHash]] object. `this.events()` is used by default.
     *  - `ja` [[ViewEventsHash]] オブジェクト. 既定値は `this.events()`
     */
    delegateEvents(events) {
        const hash = events || this.events();
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

export { View };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlldy5tanMiLCJzb3VyY2VzIjpbInNzci50cyIsImJhc2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBkb2N1bWVudCA9IHNhZmUoZ2xvYmFsVGhpcy5kb2N1bWVudCk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBOaWwsXG4gICAgUGxhaW5PYmplY3QsXG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNFbXB0eU9iamVjdCxcbiAgICBsdWlkLFxuICAgIGRyb3AsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudFNvdXJjZSB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgRE9NLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET01FdmVudExpc3RlbmVyLFxuICAgIERPTUV2ZW50TWFwLFxuICAgIEV2ZW50VHlwZSxcbiAgICBFdmVudFR5cGVPck5hbWVzcGFjZSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHsgVmlld0V2ZW50c0hhc2gsIFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzICAgID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9lbnN1cmVFbGVtZW50ID0gU3ltYm9sKCdlbnN1cmUtZWxlbWVudCcpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHk8VCBleHRlbmRzIE5vZGU+IHtcbiAgICByZWFkb25seSBjaWQ6IHN0cmluZztcbiAgICByZWFkb25seSBldmVudHM/OiBWaWV3RXZlbnRzSGFzaDxUPjtcbiAgICByZWFkb25seSBpZD86IHN0cmluZztcbiAgICByZWFkb25seSBjbGFzc05hbWU/OiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgYXR0cmlidXRlcz86IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsPjtcbiAgICByZWFkb25seSB0YWdOYW1lOiBzdHJpbmc7XG4gICAgJGVsOiBET008VD47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG5leHBvcnQgdHlwZSBWaWV3RmluZFNlbGVjdG9yID0gTm9kZSB8IHN0cmluZyB8IE5pbDtcblxuLyoqXG4gKiBAZW4gQmFzZSBjbGFzcyBkZWZpbml0aW9uIGZvciB2aWV3IHRoYXQgbWFuYWdlcyB0aGUgbGF5b3V0IGFuZCBhIERPTSBldmVudHMuXG4gKiBAamEg44Os44Kk44Ki44Km44OI566h55CG44GoIERPTSDjgqTjg5njg7Pjg4jjga7nm6PoppbjgpLooYzjgYYgVmlldyDjga7ln7rlupXjgq/jg6njgrnlrprnvqlcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IFRlbXBsYXRlRW5naW5lIH0gZnJvbSAnQGNkcC9jb3JlLXRlbXBsYXRlJztcbiAqIGltcG9ydCB7IERPTSwgZG9tIGFzICQgfSBmcm9tICdAY2RwL2RvbSc7XG4gKiBpbXBvcnQgeyBWaWV3LCBWaWV3RXZlbnRzSGFzaCB9IGZyb20gJ0BjZHAvdmlldyc7XG4gKiBpbXBvcnQgeyBUb0RvLCBUb0RvRXZlbnRTb3VyY2UgfSBmcm9tICcuL3RvZG8nO1xuICpcbiAqIGNvbnN0IF90ZW1wbGF0ZSA9IFRlbXBsYXRlRW5naW5lLmNvbXBpbGUoJCgnI2l0ZW0tdGVtcGxhdGUnKS5odG1sKCkpO1xuICpcbiAqIGV4cG9ydCBjbGFzcyBUb0RvVmlldyBleHRlbmRzIFZpZXcge1xuICogICAgIHByaXZhdGUgX21vZGVsOiBUb0RvO1xuICogICAgIHByaXZhdGUgXyRpbnB1dD86IERPTTxIVE1MSW5wdXRFbGVtZW50PjtcbiAqXG4gKiAgICAgY29uc3RydWN0b3IodG9kbzogVG9Ebykge1xuICogICAgICAgICBzdXBlcih7IHRhZ05hbWU6ICdsaScgfSk7XG4gKiAgICAgICAgIHRoaXMuX21vZGVsID0gdG9kbztcbiAqICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLl9tb2RlbCBhcyBUb0RvRXZlbnRTb3VyY2UsICdAY2hhbmdlJywgdGhpcy5yZW5kZXIuYmluZCh0aGlzKSk7XG4gKiAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5fbW9kZWwgYXMgVG9Eb0V2ZW50U291cmNlLCAnQGRlc3Ryb3knLCB0aGlzLnJlbW92ZS5iaW5kKHRoaXMpKTtcbiAqICAgICB9XG4gKlxuICogICAgIHByb3RlY3RlZCBldmVudHMoKTogVmlld0V2ZW50c0hhc2g8SFRNTEVsZW1lbnQ+IHtcbiAqICAgICAgICAgcmV0dXJuIHtcbiAqICAgICAgICAgICAgICdjbGljayAudG9nZ2xlJzogICB0aGlzLnRvZ2dsZURvbmUsXG4gKiAgICAgICAgICAgICAnZGJsY2xpY2sgLnZpZXcnOiAgdGhpcy5lZGl0LFxuICogICAgICAgICAgICAgJ2NsaWNrIGEuZGVzdHJveSc6IHRoaXMuY2xlYXIsXG4gKiAgICAgICAgICAgICAna2V5cHJlc3MgLmVkaXQnOiAgdGhpcy51cGRhdGVPbkVudGVyLFxuICogICAgICAgICAgICAgJ2JsdXIgLmVkaXQnOiAgICAgIHRoaXMuY2xvc2UsXG4gKiAgICAgICAgIH07XG4gKiAgICAgfVxuICpcbiAqICAgICByZW5kZXIoKTogdGhpcyB7XG4gKiAgICAgICAgIHRoaXMuJGVsLmh0bWwoX3RlbXBsYXRlKHRoaXMuX21vZGVsLnRvSlNPTigpKSk7XG4gKiAgICAgICAgIHRoaXMuJGVsLnRvZ2dsZUNsYXNzKCdkb25lJywgdGhpcy5fbW9kZWwuZG9uZSk7XG4gKiAgICAgICAgIHRoaXMuXyRpbnB1dCA9IHRoaXMuJCgnLmVkaXQnKSBhcyBET008SFRNTElucHV0RWxlbWVudD47XG4gKiAgICAgICAgIHJldHVybiB0aGlzO1xuICogICAgIH1cbiAqICAgICA6XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4gZXh0ZW5kcyBFdmVudFNvdXJjZTxURXZlbnQ+IHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc106IFByb3BlcnR5PFRFbGVtZW50PjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGNvbnN0cnVjdGlvbi9kZXN0cnVjdGlvbjpcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zPzogVmlld0NvbnN0cnVjdGlvbk9wdGlvbnM8VEVsZW1lbnQ+KSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgY29uc3QgeyBlbCwgdGFnTmFtZSwgaWQsIGF0dHJpYnV0ZXMsIGNsYXNzTmFtZSwgZXZlbnRzIH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXSA9IHtcbiAgICAgICAgICAgIGNpZDogbHVpZCgndmlldzonLCA4KSxcbiAgICAgICAgICAgIGV2ZW50cyxcbiAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgY2xhc3NOYW1lLFxuICAgICAgICAgICAgYXR0cmlidXRlcyxcbiAgICAgICAgICAgIHRhZ05hbWU6IHRhZ05hbWUgfHwgJ2RpdicsXG4gICAgICAgIH0gYXMgUHJvcGVydHk8VEVsZW1lbnQ+O1xuXG4gICAgICAgIHRoaXNbX2Vuc3VyZUVsZW1lbnRdKGVsKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVsZWFzZSBhbGwgbGlzdGVuZXJzLlxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVsZWFzZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgICAgICB0aGlzLm9mZigpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHRoaXMgdmlldyBieSB0YWtpbmcgdGhlIGVsZW1lbnQgb3V0IG9mIHRoZSBET00gd2l0aCByZWxlYXNlIGFsbCBsaXN0ZW5lcnMuXG4gICAgICogQGphIFZpZXcg44GL44KJIERPTSDjgpLliIfjgorpm6LjgZcsIOODquOCueODiuODvOOCkuino+mZpFxuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmUoKTogdGhpcyB7XG4gICAgICAgIHRoaXMucmVsZWFzZSgpO1xuICAgICAgICB0aGlzLiRlbC5yZW1vdmUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IGF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29udGVudCBJRC5cbiAgICAgKiBAamEg44Kz44Oz44OG44Oz44OEIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCB7IGNpZCwgaWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gaWQgfHwgY2lkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZWxlbWVudC5cbiAgICAgKiBAamEg6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGVsKCk6IFRFbGVtZW50IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLiRlbFswXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IFtbRE9NXV0gb2JqZWN0LlxuICAgICAqIEBqYSBbW0RPTV1dIOOCquODluOCuOOCp+OCr+ODiOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCAkZWwoKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS4kZWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBpbnRlcm5hbCBjb250ZW50IElELlxuICAgICAqIEBqYSDlhoXpg6jjga7jgrPjg7Pjg4bjg7Pjg4QgSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY2lkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jaWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBkZWZhdWx0IHRhZyBuYW1lLlxuICAgICAqIEBqYSDml6Llrprjga7jgr/jgrDlkI3jgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF90YWdOYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS50YWdOYW1lO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBdHRyaWJ1dGVzIGluc3RhbmNlXG4gICAgICogQGphIOWxnuaAp+OCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2F0dHJzKCk6IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsPiB7XG4gICAgICAgIGNvbnN0IHsgYXR0cmlidXRlcywgaWQsIGNsYXNzTmFtZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKGRyb3AoeyBpZCwgY2xhc3M6IGNsYXNzTmFtZSB9KSwgYXR0cmlidXRlcyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uOlxuXG4gICAgLyoqXG4gICAgICogQGVuIENoYW5nZSB0aGUgdmlldydzIGVsZW1lbnQgKGB0aGlzLmVsYCBwcm9wZXJ0eSkgYW5kIHJlLWRlbGVnYXRlIHRoZSB2aWV3J3MgZXZlbnRzIG9uIHRoZSBuZXcgZWxlbWVudC5cbiAgICAgKiBAamEgVmlldyDjgYznrqHovYTjgZnjgovopoHntKAgKGB0aGlzLmVsYCBwcm9wZXJ0eSkg44Gu5aSJ5pu0LiDjgqTjg5njg7Pjg4jlho3oqK3lrprjgoLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlbFxuICAgICAqICAtIGBlbmAgT2JqZWN0IG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgZWxlbWVudC5cbiAgICAgKiAgLSBgamFgIOimgee0oOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiOOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXRFbGVtZW50KGVsOiBET01TZWxlY3RvcjxURWxlbWVudCB8IHN0cmluZz4pOiB0aGlzIHtcbiAgICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLiRlbCA9ICQoZWwpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIHRoaXMuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBET00gY2FsbGJhY2tzIGZyb20gW1tWaWV3RXZlbnRzSGFzaF1dIG9iamVjdC5cbiAgICAgKiBAamEgW1tWaWV3RXZlbnRzSGFzaF1dIOOCquODluOCuOOCp+OCr+ODiOOBi+OCiSBET00g44Kz44O844Or44OQ44OD44Kv44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZXZlbnRzXG4gICAgICogIC0gYGVuYCBbW1ZpZXdFdmVudHNIYXNoXV0gb2JqZWN0LiBgdGhpcy5ldmVudHMoKWAgaXMgdXNlZCBieSBkZWZhdWx0LlxuICAgICAqICAtIGBqYWAgW1tWaWV3RXZlbnRzSGFzaF1dIOOCquODluOCuOOCp+OCr+ODiC4g5pei5a6a5YCk44GvIGB0aGlzLmV2ZW50cygpYFxuICAgICAqL1xuICAgIHB1YmxpYyBkZWxlZ2F0ZUV2ZW50cyhldmVudHM/OiBWaWV3RXZlbnRzSGFzaDxURWxlbWVudD4pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgaGFzaCA9IGV2ZW50cyB8fCB0aGlzLmV2ZW50cygpO1xuICAgICAgICBpZiAoaXNFbXB0eU9iamVjdChoYXNoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnVuZGVsZWdhdGVFdmVudHMoKTtcblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhoYXNoKSkge1xuICAgICAgICAgICAgbGV0IG1ldGhvZCA9IGhhc2hba2V5XSBhcyBVbmtub3duRnVuY3Rpb247XG4gICAgICAgICAgICBpZiAoIWlzRnVuY3Rpb24obWV0aG9kKSkge1xuICAgICAgICAgICAgICAgIG1ldGhvZCA9IHRoaXNbbWV0aG9kXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghbWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IC9eKFxcUyspXFxzKiguKikkLy5leGVjKGtleSkgYXMgUmVnRXhwRXhlY0FycmF5O1xuICAgICAgICAgICAgdGhpcy5kZWxlZ2F0ZTxhbnk+KG1hdGNoWzFdLCBtYXRjaFsyXSwgbWV0aG9kLmJpbmQodGhpcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFycyBhbGwgY2FsbGJhY2tzIHByZXZpb3VzbHkgYm91bmQgdG8gdGhlIHZpZXcgYnkgYGRlbGVnYXRlYC5cbiAgICAgKiBAamEgYGRlbGVnYXRlYCDjgZXjgozjgZ/jgqTjg5njg7Pjg4jjgpLjgZnjgbnjgabliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgdW5kZWxlZ2F0ZUV2ZW50cygpOiB0aGlzIHtcbiAgICAgICAgdGhpcy4kZWwgJiYgdGhpcy4kZWwub2ZmPGFueT4oYC4ke3RoaXMuX2NpZH1gKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCAx44Gk44G+44Gf44Gv6KSH5pWw44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGRlbGVnYXRlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgICAgICBsaXN0ZW5lcjogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cy4gKGxpdmUgZXZlbnQgYXZhaWxhYmxlKVxuICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIDHjgaTjgb7jgZ/jga/opIfmlbDjga7jgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+OCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVsZWdhdGU8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyBkZWxlZ2F0ZSh0eXBlOiBzdHJpbmcsIC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICAodGhpcy4kZWwgYXMgYW55KS5vbihgJHt0eXBlfS4ke3RoaXMuX2NpZH1gLCAuLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBldmVudCBoYW5kbGVyLiBUaGUgaGFuZGxlciBkZXNpZ25hdGVkIGF0IFtbb25dXSBvciBbW29uY2VdXSBhbmQgdGhhdCBzYW1lIGNvbmRpdGlvbiBhcmUgcmVsZWFzZWQuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG1ldGhvZCByZWNlaXZlcyBubyBhcmd1bWVudHMsIGFsbCBoYW5kbGVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOBruino+mZpC4gW1tvbl1dIOOBvuOBn+OBryBbW29uY2VdXSDjgajlkIzmnaHku7bjgafmjIflrprjgZfjgZ/jgoLjga7jgYzop6PpmaTjgZXjgozjgosgPGJyPlxuICAgICAqICAgICDlvJXmlbDjgYznhKHjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg4/jg7Pjg4njg6njgYzop6PpmaTjgZXjgozjgosuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHVuZGVsZWdhdGU8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPiB8IChFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgICAgICBsaXN0ZW5lcj86IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBldmVudCBoYW5kbGVyLiBUaGUgaGFuZGxlciBkZXNpZ25hdGVkIGF0IFtbb25dXSBvciBbW29uY2VdXSBhbmQgdGhhdCBzYW1lIGNvbmRpdGlvbiBhcmUgcmVsZWFzZWQuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG1ldGhvZCByZWNlaXZlcyBubyBhcmd1bWVudHMsIGFsbCBoYW5kbGVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOBruino+mZpC4gW1tvbl1dIOOBvuOBn+OBryBbW29uY2VdXSDjgajlkIzmnaHku7bjgafmjIflrprjgZfjgZ/jgoLjga7jgYzop6PpmaTjgZXjgozjgosgPGJyPlxuICAgICAqICAgICDlvJXmlbDjgYznhKHjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg4/jg7Pjg4njg6njgYzop6PpmaTjgZXjgozjgosuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHVuZGVsZWdhdGU8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPiB8IChFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBsaXN0ZW5lcj86IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIHVuZGVsZWdhdGUodHlwZTogc3RyaW5nLCAuLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgKHRoaXMuJGVsIGFzIGFueSkub2ZmKGAke3R5cGV9LiR7dGhpcy5fY2lkfWAsIC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBkZXNjZW5kYW50cyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+OBq+S4gOiHtOOBmeOCi+imgee0oOOCkuaknOe0olxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBET00uXG4gICAgICogIC0gYGphYCBET00g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgJDxUIGV4dGVuZHMgVmlld0ZpbmRTZWxlY3RvciA9IFZpZXdGaW5kU2VsZWN0b3I+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLiRlbC5maW5kKHNlbGVjdG9yKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTpcblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgZXZlbnRzIGhhc2ggKG9yIG1ldGhvZCkgY2FuIGJlIHVzZWQgdG8gc3BlY2lmeSBhIHNldCBvZiBET00gZXZlbnRzIHRoYXQgd2lsbCBiZSBib3VuZCB0byBtZXRob2RzIG9uIHlvdXIgVmlldyB0aHJvdWdoIGRlbGVnYXRlRXZlbnRzLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jjgrvjg6zjgq/jgr/jgajjgrPjg7zjg6vjg5Djg4Pjgq/jga7jg4/jg4Pjgrfjg6XjgpLlrprnvqnjgZcsIOODq+ODvOODiOOCqOODs+ODhuOCo+ODhuOCo+OBp+aNleaNieOBmeOCiyBET00g44Kk44OZ44Oz44OI44KS5oyH5a6aXG4gICAgICpcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogY2xhc3MgU2FtcGxlVmlldyBleHRlbmRzIFZpZXcge1xuICAgICAqICAgICBwcm90ZWN0ZWQgZXZlbnRzKCk6IFZpZXdFdmVudHNIYXNoIHtcbiAgICAgKiAgICAgICAgIHJldHVybiB7XG4gICAgICogICAgICAgICAgICAgJ21vdXNlZG93biAudGl0bGUnOiAgJ2VkaXQnLFxuICAgICAqICAgICAgICAgICAgICdjbGljayAuYnV0dG9uJzogICAgICdzYXZlJyxcbiAgICAgKiAgICAgICAgICAgICAnY2xpY2sgLm9wZW4nOiAgICAgICBmdW5jdGlvbihlKSB7IC4uLiB9LFxuICAgICAqICAgICAgICAgICAgICdjbGljayAuY2xvc2UnOiAgICAgIHRoaXMub25DbG9zZSxcbiAgICAgKiAgICAgICAgIH07XG4gICAgICogICAgIH1cbiAgICAgKiB9XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZXZlbnRzKCk6IFZpZXdFdmVudHNIYXNoPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCB0aGlzW19wcm9wZXJ0aWVzXS5ldmVudHMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFic3RyYWN0OlxuXG4gICAgLyoqXG4gICAgICogQGVuIEltcGxlbWVudCB0aGlzIGZ1bmN0aW9uIHdpdGggeW91ciBjb2RlIHRoYXQgcmVuZGVycyB0aGUgdmlldyB0ZW1wbGF0ZSBmcm9tIG1vZGVsIGRhdGEsIGFuZCB1cGRhdGVzIGB0aGlzLmVsYCB3aXRoIHRoZSBuZXcgSFRNTC5cbiAgICAgKiBAamEgYHRoaXMuZWxgIOabtOaWsOaZguOBruaWsOOBl+OBhCBIVE1MIOOCkuODrOODs+ODgOODquODs+OCsOODreOCuOODg+OCr+OBruWun+ijhemWouaVsC4g44Oi44OH44Or5pu05paw44GoIFZpZXcg44OG44Oz44OX44Os44O844OI44KS6YCj5YuV44GV44Gb44KLLlxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBpbXBvcnQgeyBUZW1wbGF0ZUVuZ2luZSB9IGZyb20gJ0BjZHAvY29yZS10ZW1wbGF0ZSc7XG4gICAgICpcbiAgICAgKiBjbGFzcyBTYW1wbGVWaWV3IGV4dGVuZHMgVmlldyB7XG4gICAgICogICAgIHByaXZhdGUgX3RlbXBsYXRlID0gVGVtcGxhdGVFbmdpbmUuY29tcGlsZSgne3t0aXRsZX19Jyk7XG4gICAgICogICAgIHJlbmRlcigpOiB2b2lkIHtcbiAgICAgKiAgICAgICAgIHRoaXMuJGVsLmh0bWwodGhpcy5fdGVtcGxhdGUodGhpcy5tb2RlbCkpO1xuICAgICAqICAgICB9XG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGFic3RyYWN0IHJlbmRlciguLi5hcmdzOiB1bmtub3duW10pOiBQcm9taXNlPHRoaXMgfCB2b2lkPiB8IHRoaXMgfCB2b2lkO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWw6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX2Vuc3VyZUVsZW1lbnRdKGVsPzogRE9NU2VsZWN0b3I8VEVsZW1lbnQgfCBzdHJpbmc+KTogdm9pZCB7XG4gICAgICAgIGlmICghZWwpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgX2F0dHJzLCBfdGFnTmFtZSB9ID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudChkb2N1bWVudC5jcmVhdGVFbGVtZW50KF90YWdOYW1lKSBhcyBOb2RlIGFzIFRFbGVtZW50KTtcbiAgICAgICAgICAgIHRoaXMuJGVsLmF0dHIoX2F0dHJzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0RWxlbWVudChlbCk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iXSwibmFtZXMiOlsiJCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQ0EsaUJBQXdCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDOztBQ0RsRTs7QUFFRztBQXlCSCxpQkFBaUIsTUFBTSxXQUFXLEdBQU0sTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzdELGlCQUFpQixNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQWlCakU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBNENHO0FBQ0csTUFBZ0IsSUFBMEUsU0FBUSxXQUFtQixDQUFBOztJQUd0RyxDQUFDLFdBQVcsRUFBc0I7OztBQUtuRDs7Ozs7O0FBTUc7QUFDSCxJQUFBLFdBQUEsQ0FBWSxPQUEyQyxFQUFBO0FBQ25ELFFBQUEsS0FBSyxFQUFFLENBQUM7QUFFUixRQUFBLE1BQU0sRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7UUFDekUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHO0FBQ2hCLFlBQUEsR0FBRyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ3JCLE1BQU07WUFDTixFQUFFO1lBQ0YsU0FBUztZQUNULFVBQVU7WUFDVixPQUFPLEVBQUUsT0FBTyxJQUFJLEtBQUs7U0FDTixDQUFDO0FBRXhCLFFBQUEsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQzVCO0FBRUQ7OztBQUdHO0lBQ0ksT0FBTyxHQUFBO1FBQ1YsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDeEIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FB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QyxDQUFDO0FBQzdELFNBQUE7QUFFRCxRQUFBLE9BQU8sSUFBSSxDQUFDO0tBQ2Y7QUFFRDs7O0FBR0c7SUFDSSxnQkFBZ0IsR0FBQTtBQUNuQixRQUFBLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFBLENBQUUsQ0FBQyxDQUFDO0FBQy9DLFFBQUEsT0FBTyxJQUFJLENBQUM7S0FDZjtBQThDTSxJQUFBLFFBQVEsQ0FBQyxJQUFZLEVBQUUsR0FBRyxJQUFlLEVBQUE7QUFDM0MsUUFBQSxJQUFJLENBQUMsR0FBVyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQSxDQUFBLEVBQUksSUFBSSxDQUFDLElBQUksQ0FBRSxDQUFBLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztBQUN0RCxRQUFBLE9BQU8sSUFBSSxDQUFDO0tBQ2Y7QUFrRE0sSUFBQSxVQUFVLENBQUMsSUFBWSxFQUFFLEdBQUcsSUFBZSxFQUFBO0FBQzdDLFFBQUEsSUFBSSxDQUFDLEdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUEsQ0FBQSxFQUFJLElBQUksQ0FBQyxJQUFJLENBQUUsQ0FBQSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFDdkQsUUFBQSxPQUFPLElBQUksQ0FBQztLQUNmO0FBRUQ7Ozs7Ozs7QUFPRztBQUNJLElBQUEsQ0FBQyxDQUFnRCxRQUF3QixFQUFBO1FBQzVFLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDbEM7OztBQUtEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFxQkc7SUFDTyxNQUFNLEdBQUE7QUFDWixRQUFBLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQ3REOzs7O0lBNEJPLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBbUMsRUFBQTtRQUN4RCxJQUFJLENBQUMsRUFBRSxFQUFFO0FBQ0wsWUFBQSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQztZQUNsQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFxQixDQUFDLENBQUM7QUFDdEUsWUFBQSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN6QixTQUFBO0FBQU0sYUFBQTtBQUNILFlBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN2QixTQUFBO0tBQ0o7QUFDSjs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvdmlldy8ifQ==
