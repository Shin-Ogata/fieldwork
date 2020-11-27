/*!
 * @cdp/view 0.9.5
 *   generic view scheme
 */

import { safe, luid, drop, isEmptyObject, isFunction } from '@cdp/core-utils';
import { EventSource } from '@cdp/events';
import { dom } from '@cdp/dom';

/** @internal */ const document = safe(globalThis.document);

/* eslint-disable
    @typescript-eslint/no-explicit-any
 */
/** @internal */ const _properties = Symbol('properties');
/** @internal */ const _ensureElement = Symbol('ensure-element');
/**
 * @en Base class definition for view that manages the layout and a DOM events.
 * @ja レイアウト管理と DOM イベントの監視を行う View の基底クラス定義
 *
 * TODO:
 */
class View extends EventSource {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlldy5tanMiLCJzb3VyY2VzIjpbInNzci50cyIsImJhc2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBkb2N1bWVudCA9IHNhZmUoZ2xvYmFsVGhpcy5kb2N1bWVudCk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQge1xuICAgIE5pbCxcbiAgICBQbGFpbk9iamVjdCxcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgaXNGdW5jdGlvbixcbiAgICBpc0VtcHR5T2JqZWN0LFxuICAgIGx1aWQsXG4gICAgZHJvcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50U291cmNlIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTUV2ZW50TGlzdGVuZXIsXG4gICAgRE9NRXZlbnRNYXAsXG4gICAgRXZlbnRUeXBlLFxuICAgIEV2ZW50VHlwZU9yTmFtZXNwYWNlLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQgeyBWaWV3RXZlbnRzSGFzaCwgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgICAgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2Vuc3VyZUVsZW1lbnQgPSBTeW1ib2woJ2Vuc3VyZS1lbGVtZW50Jyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eTxUIGV4dGVuZHMgTm9kZT4ge1xuICAgIHJlYWRvbmx5IGNpZDogc3RyaW5nO1xuICAgIHJlYWRvbmx5IGV2ZW50cz86IFZpZXdFdmVudHNIYXNoPFQ+O1xuICAgIHJlYWRvbmx5IGlkPzogc3RyaW5nO1xuICAgIHJlYWRvbmx5IGNsYXNzTmFtZT86IHN0cmluZztcbiAgICByZWFkb25seSBhdHRyaWJ1dGVzPzogUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGw+O1xuICAgIHJlYWRvbmx5IHRhZ05hbWU6IHN0cmluZztcbiAgICAkZWw6IERPTTxUPjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbmV4cG9ydCB0eXBlIFZpZXdGaW5kU2VsZWN0b3IgPSBOb2RlIHwgc3RyaW5nIHwgTmlsO1xuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gZm9yIHZpZXcgdGhhdCBtYW5hZ2VzIHRoZSBsYXlvdXQgYW5kIGEgRE9NIGV2ZW50cy5cbiAqIEBqYSDjg6zjgqTjgqLjgqbjg4jnrqHnkIbjgaggRE9NIOOCpOODmeODs+ODiOOBruebo+imluOCkuihjOOBhiBWaWV3IOOBruWfuuW6leOCr+ODqeOCueWumue+qVxuICpcbiAqIFRPRE86XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBWaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+IGV4dGVuZHMgRXZlbnRTb3VyY2U8VEV2ZW50PiB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdOiBQcm9wZXJ0eTxURWxlbWVudD47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBjb25zdHJ1Y3Rpb24vZGVzdHJ1Y3Rpb246XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucz86IFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pikge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIGNvbnN0IHsgZWwsIHRhZ05hbWUsIGlkLCBhdHRyaWJ1dGVzLCBjbGFzc05hbWUsIGV2ZW50cyB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10gPSB7XG4gICAgICAgICAgICBjaWQ6IGx1aWQoJ3ZpZXc6JywgOCksXG4gICAgICAgICAgICBldmVudHMsXG4gICAgICAgICAgICBpZCxcbiAgICAgICAgICAgIGNsYXNzTmFtZSxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMsXG4gICAgICAgICAgICB0YWdOYW1lOiB0YWdOYW1lIHx8ICdkaXYnLFxuICAgICAgICB9IGFzIFByb3BlcnR5PFRFbGVtZW50PjtcblxuICAgICAgICB0aGlzW19lbnN1cmVFbGVtZW50XShlbCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbGVhc2UgYWxsIGxpc3RlbmVycy5cbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Oq44K544OK44O844KS6Kej6ZmkXG4gICAgICovXG4gICAgcHVibGljIHJlbGVhc2UoKTogdGhpcyB7XG4gICAgICAgIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICAgICAgdGhpcy5vZmYoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSB0aGlzIHZpZXcgYnkgdGFraW5nIHRoZSBlbGVtZW50IG91dCBvZiB0aGUgRE9NIHdpdGggcmVsZWFzZSBhbGwgbGlzdGVuZXJzLlxuICAgICAqIEBqYSBWaWV3IOOBi+OCiSBET00g44KS5YiH44KK6Zui44GXLCDjg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlKCk6IHRoaXMge1xuICAgICAgICB0aGlzLnJlbGVhc2UoKTtcbiAgICAgICAgdGhpcy4kZWwucmVtb3ZlKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBhdHRyaWJ1dGVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNvbnRlbnQgSUQuXG4gICAgICogQGphIOOCs+ODs+ODhuODs+ODhCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgeyBjaWQsIGlkIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIGlkIHx8IGNpZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGVsZW1lbnQuXG4gICAgICogQGphIOimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBlbCgpOiBURWxlbWVudCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS4kZWxbMF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBbW0RPTV1dIG9iamVjdC5cbiAgICAgKiBAamEgW1tET01dXSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgJGVsKCk6IERPTTxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uJGVsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgaW50ZXJuYWwgY29udGVudCBJRC5cbiAgICAgKiBAamEg5YaF6YOo44Gu44Kz44Oz44OG44Oz44OEIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2NpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY2lkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZGVmYXVsdCB0YWcgbmFtZS5cbiAgICAgKiBAamEg5pei5a6a44Gu44K/44Kw5ZCN44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfdGFnTmFtZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10udGFnTmFtZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDlsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9hdHRycygpOiBQbGFpbk9iamVjdDxzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbD4ge1xuICAgICAgICBjb25zdCB7IGF0dHJpYnV0ZXMsIGlkLCBjbGFzc05hbWUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihkcm9wKHsgaWQsIGNsYXNzOiBjbGFzc05hbWUgfSksIGF0dHJpYnV0ZXMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbjpcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGFuZ2UgdGhlIHZpZXcncyBlbGVtZW50IChgdGhpcy5lbGAgcHJvcGVydHkpIGFuZCByZS1kZWxlZ2F0ZSB0aGUgdmlldydzIGV2ZW50cyBvbiB0aGUgbmV3IGVsZW1lbnQuXG4gICAgICogQGphIFZpZXcg44GM566h6L2E44GZ44KL6KaB57SgIChgdGhpcy5lbGAgcHJvcGVydHkpIOOBruWkieabtC4g44Kk44OZ44Oz44OI5YaN6Kit5a6a44KC5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWxcbiAgICAgKiAgLSBgZW5gIE9iamVjdCBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCDopoHntKDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4jjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0RWxlbWVudChlbDogRE9NU2VsZWN0b3I8VEVsZW1lbnQgfCBzdHJpbmc+KTogdGhpcyB7XG4gICAgICAgIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS4kZWwgPSAkKGVsKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB0aGlzLmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgRE9NIGNhbGxiYWNrcyBmcm9tIFtbVmlld0V2ZW50c0hhc2hdXSBvYmplY3QuXG4gICAgICogQGphIFtbVmlld0V2ZW50c0hhc2hdXSDjgqrjg5bjgrjjgqfjgq/jg4jjgYvjgokgRE9NIOOCs+ODvOODq+ODkOODg+OCr+OCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGV2ZW50c1xuICAgICAqICAtIGBlbmAgW1tWaWV3RXZlbnRzSGFzaF1dIG9iamVjdC4gYHRoaXMuZXZlbnRzKClgIGlzIHVzZWQgYnkgZGVmYXVsdC5cbiAgICAgKiAgLSBgamFgIFtbVmlld0V2ZW50c0hhc2hdXSDjgqrjg5bjgrjjgqfjgq/jg4guIOaXouWumuWApOOBryBgdGhpcy5ldmVudHMoKWBcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVsZWdhdGVFdmVudHMoZXZlbnRzPzogVmlld0V2ZW50c0hhc2g8VEVsZW1lbnQ+KTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGhhc2ggPSBldmVudHMgfHwgdGhpcy5ldmVudHMoKTtcbiAgICAgICAgaWYgKGlzRW1wdHlPYmplY3QoaGFzaCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoaGFzaCkpIHtcbiAgICAgICAgICAgIGxldCBtZXRob2QgPSBoYXNoW2tleV0gYXMgVW5rbm93bkZ1bmN0aW9uO1xuICAgICAgICAgICAgaWYgKCFpc0Z1bmN0aW9uKG1ldGhvZCkpIHtcbiAgICAgICAgICAgICAgICBtZXRob2QgPSB0aGlzW21ldGhvZF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIW1ldGhvZCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSAvXihcXFMrKVxccyooLiopJC8uZXhlYyhrZXkpIGFzIFJlZ0V4cEV4ZWNBcnJheTtcbiAgICAgICAgICAgIHRoaXMuZGVsZWdhdGU8YW55PihtYXRjaFsxXSwgbWF0Y2hbMl0sIG1ldGhvZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhcnMgYWxsIGNhbGxiYWNrcyBwcmV2aW91c2x5IGJvdW5kIHRvIHRoZSB2aWV3IGJ5IGBkZWxlZ2F0ZWAuXG4gICAgICogQGphIGBkZWxlZ2F0ZWAg44GV44KM44Gf44Kk44OZ44Oz44OI44KS44GZ44G544Gm5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIHVuZGVsZWdhdGVFdmVudHMoKTogdGhpcyB7XG4gICAgICAgIHRoaXMuJGVsICYmIHRoaXMuJGVsLm9mZjxhbnk+KGAuJHt0aGlzLl9jaWR9YCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwgMeOBpOOBvuOBn+OBr+ikh+aVsOOBruOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBkZWxlZ2F0ZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IChFdmVudFR5cGU8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI6IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCAx44Gk44G+44Gf44Gv6KSH5pWw44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGRlbGVnYXRlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBsaXN0ZW5lcjogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgZGVsZWdhdGUodHlwZTogc3RyaW5nLCAuLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgKHRoaXMuJGVsIGFzIGFueSkub24oYCR7dHlwZX0uJHt0aGlzLl9jaWR9YCwgLi4uYXJncyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZXZlbnQgaGFuZGxlci4gVGhlIGhhbmRsZXIgZGVzaWduYXRlZCBhdCBbW29uXV0gb3IgW1tvbmNlXV0gYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIFtbb25dXSDjgb7jgZ/jga8gW1tvbmNlXV0g44Go5ZCM5p2h5Lu244Gn5oyH5a6a44GX44Gf44KC44Gu44GM6Kej6Zmk44GV44KM44KLIDxicj5cbiAgICAgKiAgICAg5byV5pWw44GM54Sh44GE5aC05ZCI44Gv44GZ44G544Gm44Gu44OP44Oz44OJ44Op44GM6Kej6Zmk44GV44KM44KLLlxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB1bmRlbGVnYXRlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI/OiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZXZlbnQgaGFuZGxlci4gVGhlIGhhbmRsZXIgZGVzaWduYXRlZCBhdCBbW29uXV0gb3IgW1tvbmNlXV0gYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIFtbb25dXSDjgb7jgZ/jga8gW1tvbmNlXV0g44Go5ZCM5p2h5Lu244Gn5oyH5a6a44GX44Gf44KC44Gu44GM6Kej6Zmk44GV44KM44KLIDxicj5cbiAgICAgKiAgICAg5byV5pWw44GM54Sh44GE5aC05ZCI44Gv44GZ44G544Gm44Gu44OP44Oz44OJ44Op44GM6Kej6Zmk44GV44KM44KLLlxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB1bmRlbGVnYXRlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgbGlzdGVuZXI/OiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyB1bmRlbGVnYXRlKHR5cGU6IHN0cmluZywgLi4uYXJnczogdW5rbm93bltdKTogdGhpcyB7XG4gICAgICAgICh0aGlzLiRlbCBhcyBhbnkpLm9mZihgJHt0eXBlfS4ke3RoaXMuX2NpZH1gLCAuLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgZGVzY2VuZGFudHMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgavkuIDoh7TjgZnjgovopoHntKDjgpLmpJzntKJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgRE9NLlxuICAgICAqICAtIGBqYWAgRE9NIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljICQ8VCBleHRlbmRzIFZpZXdGaW5kU2VsZWN0b3IgPSBWaWV3RmluZFNlbGVjdG9yPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy4kZWwuZmluZChzZWxlY3Rvcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3ZlcnJpZGU6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIGV2ZW50cyBoYXNoIChvciBtZXRob2QpIGNhbiBiZSB1c2VkIHRvIHNwZWNpZnkgYSBzZXQgb2YgRE9NIGV2ZW50cyB0aGF0IHdpbGwgYmUgYm91bmQgdG8gbWV0aG9kcyBvbiB5b3VyIFZpZXcgdGhyb3VnaCBkZWxlZ2F0ZUV2ZW50cy5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI44K744Os44Kv44K/44Go44Kz44O844Or44OQ44OD44Kv44Gu44OP44OD44K344Ol44KS5a6a576p44GXLCDjg6vjg7zjg4jjgqjjg7Pjg4bjgqPjg4bjgqPjgafmjZXmjYnjgZnjgosgRE9NIOOCpOODmeODs+ODiOOCkuaMh+WumlxuICAgICAqXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNsYXNzIFNhbXBsZVZpZXcgZXh0ZW5kcyBWaWV3IHtcbiAgICAgKiAgICAgcHJvdGVjdGVkIGV2ZW50cygpOiBWaWV3RXZlbnRzSGFzaCB7XG4gICAgICogICAgICAgICByZXR1cm4ge1xuICAgICAqICAgICAgICAgICAgICdtb3VzZWRvd24gLnRpdGxlJzogICdlZGl0JyxcbiAgICAgKiAgICAgICAgICAgICAnY2xpY2sgLmJ1dHRvbic6ICAgICAnc2F2ZScsXG4gICAgICogICAgICAgICAgICAgJ2NsaWNrIC5vcGVuJzogICAgICAgZnVuY3Rpb24oZSkgeyAuLi4gfSxcbiAgICAgKiAgICAgICAgICAgICAnY2xpY2sgLmNsb3NlJzogICAgICB0aGlzLm9uQ2xvc2UsXG4gICAgICogICAgICAgICB9O1xuICAgICAqICAgICB9XG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGV2ZW50cygpOiBWaWV3RXZlbnRzSGFzaDxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgdGhpc1tfcHJvcGVydGllc10uZXZlbnRzKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhYnN0cmFjdDpcblxuICAgIC8qKlxuICAgICAqIEBlbiBJbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiB3aXRoIHlvdXIgY29kZSB0aGF0IHJlbmRlcnMgdGhlIHZpZXcgdGVtcGxhdGUgZnJvbSBtb2RlbCBkYXRhLCBhbmQgdXBkYXRlcyBgdGhpcy5lbGAgd2l0aCB0aGUgbmV3IEhUTUwuXG4gICAgICogQGphIGB0aGlzLmVsYCDmm7TmlrDmmYLjga7mlrDjgZfjgYQgSFRNTCDjgpLjg6zjg7Pjg4Djg6rjg7PjgrDjg63jgrjjg4Pjgq/jga7lrp/oo4XplqLmlbAuIOODouODh+ODq+abtOaWsOOBqCBWaWV3IOODhuODs+ODl+ODrOODvOODiOOCkumAo+WLleOBleOBm+OCiy5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogaW1wb3J0IHsgVGVtcGxhdGVFbmdpbmUgfSBmcm9tICdAY2RwL2NvcmUtdGVtcGxhdGUnO1xuICAgICAqXG4gICAgICogY2xhc3MgU2FtcGxlVmlldyBleHRlbmRzIFZpZXcge1xuICAgICAqICAgICBwcml2YXRlIF90ZW1wbGF0ZSA9IFRlbXBsYXRlRW5naW5lLmNvbXBpbGUoJ3t7dGl0bGV9fScpO1xuICAgICAqICAgICByZW5kZXIoKTogdm9pZCB7XG4gICAgICogICAgICAgICB0aGlzLiRlbC5odG1sKHRoaXMuX3RlbXBsYXRlKHRoaXMubW9kZWwpKTtcbiAgICAgKiAgICAgfVxuICAgICAqIH1cbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBhYnN0cmFjdCByZW5kZXIoLi4uYXJnczogdW5rbm93bltdKTogUHJvbWlzZTx2b2lkPiB8IHZvaWQ7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbDpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfZW5zdXJlRWxlbWVudF0oZWw/OiBET01TZWxlY3RvcjxURWxlbWVudCB8IHN0cmluZz4pOiB2b2lkIHtcbiAgICAgICAgaWYgKCFlbCkge1xuICAgICAgICAgICAgY29uc3QgeyBfYXR0cnMsIF90YWdOYW1lIH0gPSB0aGlzO1xuICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoX3RhZ05hbWUpIGFzIE5vZGUgYXMgVEVsZW1lbnQpO1xuICAgICAgICAgICAgdGhpcy4kZWwuYXR0cihfYXR0cnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KGVsKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyIkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQSxpQkFBd0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7O0FDRGxFOzs7QUEyQkEsaUJBQWlCLE1BQU0sV0FBVyxHQUFNLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUM3RCxpQkFBaUIsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFpQmpFOzs7Ozs7TUFNc0IsSUFBMEUsU0FBUSxXQUFtQjs7Ozs7Ozs7OztJQWV2SCxZQUFZLE9BQTJDO1FBQ25ELEtBQUssRUFBRSxDQUFDO1FBRVIsTUFBTSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEdBQUcsT0FBTyxJQUFJLEVBQUUsQ0FBQztRQUN6RSxJQUFJLENB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LE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUM3RDtRQUVELE9BQU8sSUFBSSxDQUFDO0tBQ2Y7Ozs7O0lBTU0sZ0JBQWdCO1FBQ25CLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMvQyxPQUFPLElBQUksQ0FBQztLQUNmO0lBOENNLFFBQVEsQ0FBQyxJQUFZLEVBQUUsR0FBRyxJQUFlO1FBQzNDLElBQUksQ0FBQyxHQUFXLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ3RELE9BQU8sSUFBSSxDQUFDO0tBQ2Y7SUFrRE0sVUFBVSxDQUFDLElBQVksRUFBRSxHQUFHLElBQWU7UUFDN0MsSUFBSSxDQUFDLEdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDdkQsT0FBTyxJQUFJLENBQUM7S0FDZjs7Ozs7Ozs7O0lBVU0sQ0FBQyxDQUFnRCxRQUF3QjtRQUM1RSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ2xDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBMkJTLE1BQU07UUFDWixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUN0RDs7OztJQTRCTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQW1DO1FBQ3hELElBQUksQ0FBQyxFQUFFLEVBQUU7WUFDTCxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQztZQUNsQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFxQixDQUFDLENBQUM7WUFDdEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDekI7YUFBTTtZQUNILElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDdkI7S0FDSjs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL3ZpZXcvIn0=
