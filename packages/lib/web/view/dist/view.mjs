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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlldy5tanMiLCJzb3VyY2VzIjpbInNzci50cyIsImJhc2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBkb2N1bWVudCA9IHNhZmUoZ2xvYmFsVGhpcy5kb2N1bWVudCk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBDb25zdHJ1Y3RvcixcbiAgICBXcml0YWJsZSxcbiAgICBOdWxsaXNoLFxuICAgIFBsYWluT2JqZWN0LFxuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzRW1wdHlPYmplY3QsXG4gICAgbHVpZCxcbiAgICBkcm9wLFxuICAgIG1peGlucyxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50U291cmNlIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTUV2ZW50TGlzdGVuZXIsXG4gICAgRE9NRXZlbnRNYXAsXG4gICAgRXZlbnRUeXBlLFxuICAgIEV2ZW50VHlwZU9yTmFtZXNwYWNlLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQgeyBWaWV3RXZlbnRzSGFzaCwgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2luaXRpYWxpemUgICAgPSBTeW1ib2woJ2luaXQtaW50ZXJuYWwnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgICAgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2Vuc3VyZUVsZW1lbnQgPSBTeW1ib2woJ2Vuc3VyZS1lbGVtZW50Jyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eTxUIGV4dGVuZHMgTm9kZT4ge1xuICAgIHJlYWRvbmx5IGNpZDogc3RyaW5nO1xuICAgIHJlYWRvbmx5IGV2ZW50cz86IFZpZXdFdmVudHNIYXNoPFQ+O1xuICAgIHJlYWRvbmx5IGlkPzogc3RyaW5nO1xuICAgIHJlYWRvbmx5IGNsYXNzTmFtZT86IHN0cmluZztcbiAgICByZWFkb25seSBhdHRyaWJ1dGVzPzogUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGw+O1xuICAgIHJlYWRvbmx5IHRhZ05hbWU6IHN0cmluZztcbiAgICAkZWw6IERPTTxUPjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbmV4cG9ydCB0eXBlIFZpZXdGaW5kU2VsZWN0b3IgPSBOb2RlIHwgc3RyaW5nIHwgTnVsbGlzaDtcblxuLyoqXG4gKiBAZW4gQ29yZSBpbXBsZW1lbnRhdGlvbiBvZiB7QGxpbmsgVmlld30gd2l0aG91dCB7QGxpbmsgRXZlbnRTb3VyY2V9IGludGVyZmFjZS4gPGJyPlxuICogICAgIENhbiBiZSBzcGVjaWZpZWQgYXMgbWl4aW4gc291cmNlLlxuICogQGphIHtAbGluayBFdmVudFNvdXJjZX0g44Kk44Oz44K/44O844OV44Kn44Kk44K544KS5oyB44Gf44Gq44GEIHtAbGluayBWaWV3fSDjga7jgrPjgqLlrp/oo4UgPGJyPlxuICogICAgIE1peGluIHNvdXJjZSDjgajjgZfjgabmjIflrprlj6/og71cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFZpZXdDb3JlPFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50PiB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdITogUHJvcGVydHk8VEVsZW1lbnQ+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gY29uc3RydWN0aW9uL2Rlc3RydWN0aW9uOlxuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pIHtcbiAgICAgICAgaWYgKGZhbHNlICE9PSBvcHRpb25zIGFzIHVua25vd24gYXMgYm9vbGVhbikge1xuICAgICAgICAgICAgdGhpc1tfaW5pdGlhbGl6ZV0ob3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVsZWFzZSBhbGwgbGlzdGVuZXJzLlxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVsZWFzZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhpcyB2aWV3IGJ5IHRha2luZyB0aGUgZWxlbWVudCBvdXQgb2YgdGhlIERPTSB3aXRoIHJlbGVhc2UgYWxsIGxpc3RlbmVycy5cbiAgICAgKiBAamEgVmlldyDjgYvjgokgRE9NIOOCkuWIh+OCiumbouOBlywg44Oq44K544OK44O844KS6Kej6ZmkXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZSgpOiB0aGlzIHtcbiAgICAgICAgdGhpcy5yZWxlYXNlKCk7XG4gICAgICAgIHRoaXMuJGVsLnJlbW92ZSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogYXR0cmlidXRlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjb250ZW50IElELlxuICAgICAqIEBqYSDjgrPjg7Pjg4bjg7Pjg4QgSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IHsgY2lkLCBpZCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiBpZCA/PyBjaWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBlbGVtZW50LlxuICAgICAqIEBqYSDopoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgZWwoKTogVEVsZW1lbnQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uJGVsWzBdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQge0BsaW5rIERPTX0gb2JqZWN0LlxuICAgICAqIEBqYSB7QGxpbmsgRE9NfSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgJGVsKCk6IERPTTxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uJGVsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgaW50ZXJuYWwgY29udGVudCBJRC5cbiAgICAgKiBAamEg5YaF6YOo44Gu44Kz44Oz44OG44Oz44OEIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2NpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY2lkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZGVmYXVsdCB0YWcgbmFtZS5cbiAgICAgKiBAamEg5pei5a6a44Gu44K/44Kw5ZCN44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfdGFnTmFtZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10udGFnTmFtZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXR0cmlidXRlcyBpbnN0YW5jZVxuICAgICAqIEBqYSDlsZ7mgKfjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9hdHRycygpOiBQbGFpbk9iamVjdDxzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbD4ge1xuICAgICAgICBjb25zdCB7IGF0dHJpYnV0ZXMsIGlkLCBjbGFzc05hbWUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihkcm9wKHsgaWQsIGNsYXNzOiBjbGFzc05hbWUgfSksIGF0dHJpYnV0ZXMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbjpcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGFuZ2UgdGhlIHZpZXcncyBlbGVtZW50IChgdGhpcy5lbGAgcHJvcGVydHkpIGFuZCByZS1kZWxlZ2F0ZSB0aGUgdmlldydzIGV2ZW50cyBvbiB0aGUgbmV3IGVsZW1lbnQuXG4gICAgICogQGphIFZpZXcg44GM566h6L2E44GZ44KL6KaB57SgIChgdGhpcy5lbGAgcHJvcGVydHkpIOOBruWkieabtC4g44Kk44OZ44Oz44OI5YaN6Kit5a6a44KC5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWxcbiAgICAgKiAgLSBgZW5gIE9iamVjdCBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCDopoHntKDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4jjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0RWxlbWVudChlbDogRE9NU2VsZWN0b3I8VEVsZW1lbnQgfCBzdHJpbmc+KTogdGhpcyB7XG4gICAgICAgIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS4kZWwgPSAkKGVsKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB0aGlzLmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgRE9NIGNhbGxiYWNrcyBmcm9tIHtAbGluayBWaWV3RXZlbnRzSGFzaH0gb2JqZWN0LlxuICAgICAqIEBqYSB7QGxpbmsgVmlld0V2ZW50c0hhc2h9IOOCquODluOCuOOCp+OCr+ODiOOBi+OCiSBET00g44Kz44O844Or44OQ44OD44Kv44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZXZlbnRzXG4gICAgICogIC0gYGVuYCB7QGxpbmsgVmlld0V2ZW50c0hhc2h9IG9iamVjdC4gYHRoaXMuZXZlbnRzKClgIGlzIHVzZWQgYnkgZGVmYXVsdC5cbiAgICAgKiAgLSBgamFgIHtAbGluayBWaWV3RXZlbnRzSGFzaH0g44Kq44OW44K444Kn44Kv44OILiDml6LlrprlgKTjga8gYHRoaXMuZXZlbnRzKClgXG4gICAgICovXG4gICAgcHVibGljIGRlbGVnYXRlRXZlbnRzKGV2ZW50cz86IFZpZXdFdmVudHNIYXNoPFRFbGVtZW50Pik6IHRoaXMge1xuICAgICAgICBjb25zdCBoYXNoID0gZXZlbnRzID8/IHRoaXMuZXZlbnRzKCk7XG4gICAgICAgIGlmIChpc0VtcHR5T2JqZWN0KGhhc2gpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuXG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGhhc2gpKSB7XG4gICAgICAgICAgICBsZXQgbWV0aG9kID0gaGFzaFtrZXldIGFzIFVua25vd25GdW5jdGlvbjtcbiAgICAgICAgICAgIGlmICghaXNGdW5jdGlvbihtZXRob2QpKSB7XG4gICAgICAgICAgICAgICAgbWV0aG9kID0gdGhpc1ttZXRob2RdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFtZXRob2QpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gL14oXFxTKylcXHMqKC4qKSQvLmV4ZWMoa2V5KSE7XG4gICAgICAgICAgICB0aGlzLmRlbGVnYXRlPGFueT4obWF0Y2hbMV0sIG1hdGNoWzJdLCBtZXRob2QuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXJzIGFsbCBjYWxsYmFja3MgcHJldmlvdXNseSBib3VuZCB0byB0aGUgdmlldyBieSBgZGVsZWdhdGVgLlxuICAgICAqIEBqYSBgZGVsZWdhdGVgIOOBleOCjOOBn+OCpOODmeODs+ODiOOCkuOBmeOBueOBpuWJiumZpFxuICAgICAqL1xuICAgIHB1YmxpYyB1bmRlbGVnYXRlRXZlbnRzKCk6IHRoaXMge1xuICAgICAgICB0aGlzLiRlbD8ub2ZmPGFueT4oYC4ke3RoaXMuX2NpZH1gKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCAx44Gk44G+44Gf44Gv6KSH5pWw44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGRlbGVnYXRlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgICAgICBsaXN0ZW5lcjogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cy4gKGxpdmUgZXZlbnQgYXZhaWxhYmxlKVxuICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIDHjgaTjgb7jgZ/jga/opIfmlbDjga7jgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+OCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVsZWdhdGU8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyBkZWxlZ2F0ZSh0eXBlOiBzdHJpbmcsIC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICAodGhpcy4kZWwgYXMgYW55KS5vbihgJHt0eXBlfS4ke3RoaXMuX2NpZH1gLCAuLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBldmVudCBoYW5kbGVyLiBUaGUgaGFuZGxlciBkZXNpZ25hdGVkIGF0IHtAbGluayBET01FdmVudHMub259IG9yIHtAbGluayBET01FdmVudHMub25jZX0gYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIHtAbGluayBET01FdmVudHMub259IOOBvuOBn+OBryB7QGxpbmsgRE9NRXZlbnRzLm9uY2V9IOOBqOWQjOadoeS7tuOBp+aMh+WumuOBl+OBn+OCguOBruOBjOino+mZpOOBleOCjOOCiyA8YnI+XG4gICAgICogICAgIOW8leaVsOOBjOeEoeOBhOWgtOWQiOOBr+OBmeOBueOBpuOBruODj+ODs+ODieODqeOBjOino+mZpOOBleOCjOOCiy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIEEgc2VsZWN0b3Igc3RyaW5nIHRvIGZpbHRlciB0aGUgZGVzY2VuZGFudHMgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRzIHRoYXQgdHJpZ2dlciB0aGUgZXZlbnQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jnmbrooYzlhYPjgpLjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdW5kZWxlZ2F0ZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgICAgIGxpc3RlbmVyPzogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuIFRoZSBoYW5kbGVyIGRlc2lnbmF0ZWQgYXQge0BsaW5rIERPTUV2ZW50cy5vbn0gb3Ige0BsaW5rIERPTUV2ZW50cy5vbmNlfSBhbmQgdGhhdCBzYW1lIGNvbmRpdGlvbiBhcmUgcmVsZWFzZWQuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG1ldGhvZCByZWNlaXZlcyBubyBhcmd1bWVudHMsIGFsbCBoYW5kbGVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOBruino+mZpC4ge0BsaW5rIERPTUV2ZW50cy5vbn0g44G+44Gf44GvIHtAbGluayBET01FdmVudHMub25jZX0g44Go5ZCM5p2h5Lu244Gn5oyH5a6a44GX44Gf44KC44Gu44GM6Kej6Zmk44GV44KM44KLIDxicj5cbiAgICAgKiAgICAg5byV5pWw44GM54Sh44GE5aC05ZCI44Gv44GZ44G544Gm44Gu44OP44Oz44OJ44Op44GM6Kej6Zmk44GV44KM44KLLlxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB1bmRlbGVnYXRlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgbGlzdGVuZXI/OiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyB1bmRlbGVnYXRlKHR5cGU6IHN0cmluZywgLi4uYXJnczogdW5rbm93bltdKTogdGhpcyB7XG4gICAgICAgICh0aGlzLiRlbCBhcyBhbnkpLm9mZihgJHt0eXBlfS4ke3RoaXMuX2NpZH1gLCAuLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgZGVzY2VuZGFudHMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgavkuIDoh7TjgZnjgovopoHntKDjgpLmpJzntKJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgRE9NLlxuICAgICAqICAtIGBqYWAgRE9NIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljICQ8VCBleHRlbmRzIFZpZXdGaW5kU2VsZWN0b3IgPSBWaWV3RmluZFNlbGVjdG9yPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy4kZWwuZmluZChzZWxlY3Rvcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3ZlcnJpZGU6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIGV2ZW50cyBoYXNoIChvciBtZXRob2QpIGNhbiBiZSB1c2VkIHRvIHNwZWNpZnkgYSBzZXQgb2YgRE9NIGV2ZW50cyB0aGF0IHdpbGwgYmUgYm91bmQgdG8gbWV0aG9kcyBvbiB5b3VyIFZpZXcgdGhyb3VnaCBkZWxlZ2F0ZUV2ZW50cy5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI44K744Os44Kv44K/44Go44Kz44O844Or44OQ44OD44Kv44Gu44OP44OD44K344Ol44KS5a6a576p44GXLCDjg6vjg7zjg4jjgqjjg7Pjg4bjgqPjg4bjgqPjgafmjZXmjYnjgZnjgosgRE9NIOOCpOODmeODs+ODiOOCkuaMh+WumlxuICAgICAqXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNsYXNzIFNhbXBsZVZpZXcgZXh0ZW5kcyBWaWV3IHtcbiAgICAgKiAgICAgcHJvdGVjdGVkIGV2ZW50cygpOiBWaWV3RXZlbnRzSGFzaCB7XG4gICAgICogICAgICAgICByZXR1cm4ge1xuICAgICAqICAgICAgICAgICAgICdtb3VzZWRvd24gLnRpdGxlJzogICdlZGl0JyxcbiAgICAgKiAgICAgICAgICAgICAnY2xpY2sgLmJ1dHRvbic6ICAgICAnc2F2ZScsXG4gICAgICogICAgICAgICAgICAgJ2NsaWNrIC5vcGVuJzogICAgICAgZnVuY3Rpb24oZSkgeyAuLi4gfSxcbiAgICAgKiAgICAgICAgICAgICAnY2xpY2sgLmNsb3NlJzogICAgICB0aGlzLm9uQ2xvc2UsXG4gICAgICogICAgICAgICB9O1xuICAgICAqICAgICB9XG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGV2ZW50cygpOiBWaWV3RXZlbnRzSGFzaDxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgdGhpc1tfcHJvcGVydGllc10uZXZlbnRzKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhYnN0cmFjdDpcblxuICAgIC8qKlxuICAgICAqIEBlbiBJbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiB3aXRoIHlvdXIgY29kZSB0aGF0IHJlbmRlcnMgdGhlIHZpZXcgdGVtcGxhdGUgZnJvbSBtb2RlbCBkYXRhLCBhbmQgdXBkYXRlcyBgdGhpcy5lbGAgd2l0aCB0aGUgbmV3IEhUTUwuXG4gICAgICogQGphIGB0aGlzLmVsYCDmm7TmlrDmmYLjga7mlrDjgZfjgYQgSFRNTCDjgpLjg6zjg7Pjg4Djg6rjg7PjgrDjg63jgrjjg4Pjgq/jga7lrp/oo4XplqLmlbAuIOODouODh+ODq+abtOaWsOOBqCBWaWV3IOODhuODs+ODl+ODrOODvOODiOOCkumAo+WLleOBleOBm+OCiy5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogaW1wb3J0IHsgVGVtcGxhdGVFbmdpbmUgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICAgICAqXG4gICAgICogY2xhc3MgU2FtcGxlVmlldyBleHRlbmRzIFZpZXcge1xuICAgICAqICAgICBwcml2YXRlIF90ZW1wbGF0ZSA9IFRlbXBsYXRlRW5naW5lLmNvbXBpbGUoJ3t7dGl0bGV9fScpO1xuICAgICAqICAgICByZW5kZXIoKTogdm9pZCB7XG4gICAgICogICAgICAgICB0aGlzLiRlbC5odG1sKHRoaXMuX3RlbXBsYXRlKHRoaXMubW9kZWwpKTtcbiAgICAgKiAgICAgfVxuICAgICAqIH1cbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBhYnN0cmFjdCByZW5kZXIoLi4uYXJnczogdW5rbm93bltdKTogYW55O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWw6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJvdGVjdGVkIFtfaW5pdGlhbGl6ZV0ob3B0aW9ucz86IFZpZXdDb25zdHJ1Y3Rpb25PcHRpb25zPFRFbGVtZW50Pik6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGVsLCB0YWdOYW1lLCBpZCwgYXR0cmlidXRlcywgY2xhc3NOYW1lLCBldmVudHMgfSA9IG9wdGlvbnMgPz8ge307XG5cbiAgICAgICAgKHRoaXNbX3Byb3BlcnRpZXNdIGFzIFdyaXRhYmxlPFByb3BlcnR5PFRFbGVtZW50Pj4pID0ge1xuICAgICAgICAgICAgY2lkOiBsdWlkKCd2aWV3OicsIDgpLFxuICAgICAgICAgICAgZXZlbnRzLFxuICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICBjbGFzc05hbWUsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzLFxuICAgICAgICAgICAgdGFnTmFtZTogdGFnTmFtZSA/PyAnZGl2JyxcbiAgICAgICAgfSBhcyBQcm9wZXJ0eTxURWxlbWVudD47XG5cbiAgICAgICAgdGhpc1tfZW5zdXJlRWxlbWVudF0oZWwpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfZW5zdXJlRWxlbWVudF0oZWw/OiBET01TZWxlY3RvcjxURWxlbWVudCB8IHN0cmluZz4pOiB2b2lkIHtcbiAgICAgICAgaWYgKCFlbCkge1xuICAgICAgICAgICAgY29uc3QgeyBfYXR0cnMsIF90YWdOYW1lIH0gPSB0aGlzO1xuICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoX3RhZ05hbWUpIGFzIE5vZGUgYXMgVEVsZW1lbnQpO1xuICAgICAgICAgICAgdGhpcy4kZWwuYXR0cihfYXR0cnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXRFbGVtZW50KGVsKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCB7QGxpbmsgVmlld30gY2xhc3MgKi9cbmFic3RyYWN0IGNsYXNzIFZpZXcgZXh0ZW5kcyAobWl4aW5zKEV2ZW50U291cmNlLCBWaWV3Q29yZSBhcyBDb25zdHJ1Y3RvcjxWaWV3Q29yZT4pKSB7XG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBWaWV3Q29uc3RydWN0aW9uT3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLnN1cGVyKFZpZXdDb3JlIGFzIENvbnN0cnVjdG9yPFZpZXdDb3JlPiwgZmFsc2UpO1xuICAgICAgICB0aGlzW19pbml0aWFsaXplXShvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVsZWFzZSBhbGwgbGlzdGVuZXJzLlxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVsZWFzZSgpOiB0aGlzIHtcbiAgICAgICAgc3VwZXIucmVsZWFzZSgpO1xuICAgICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICAgICAgdGhpcy5vZmYoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gZm9yIHZpZXcgdGhhdCBtYW5hZ2VzIHRoZSBsYXlvdXQgYW5kIGEgRE9NIGV2ZW50cy5cbiAqIEBqYSDjg6zjgqTjgqLjgqbjg4jnrqHnkIbjgaggRE9NIOOCpOODmeODs+ODiOOBruebo+imluOCkuihjOOBhiBWaWV3IOOBruWfuuW6leOCr+ODqeOCueWumue+qVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHtcbiAqICAgICBUZW1wbGF0ZUVuZ2luZSxcbiAqICAgICBET00sIGRvbSBhcyAkLFxuICogICAgIFZpZXcsIFZpZXdFdmVudHNIYXNoLFxuICogfSBmcm9tICdAY2RwL3J1bXRpbWUnO1xuICogaW1wb3J0IHsgVG9EbywgVG9Eb0V2ZW50U291cmNlIH0gZnJvbSAnLi90b2RvJztcbiAqXG4gKiBjb25zdCBfdGVtcGxhdGUgPSBUZW1wbGF0ZUVuZ2luZS5jb21waWxlKCQoJyNpdGVtLXRlbXBsYXRlJykuaHRtbCgpKTtcbiAqXG4gKiBleHBvcnQgY2xhc3MgVG9Eb1ZpZXcgZXh0ZW5kcyBWaWV3IHtcbiAqICAgICBwcml2YXRlIF9tb2RlbDogVG9EbztcbiAqICAgICBwcml2YXRlIF8kaW5wdXQ/OiBET008SFRNTElucHV0RWxlbWVudD47XG4gKlxuICogICAgIGNvbnN0cnVjdG9yKHRvZG86IFRvRG8pIHtcbiAqICAgICAgICAgc3VwZXIoeyB0YWdOYW1lOiAnbGknIH0pO1xuICogICAgICAgICB0aGlzLl9tb2RlbCA9IHRvZG87XG4gKiAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5fbW9kZWwgYXMgVG9Eb0V2ZW50U291cmNlLCAnQGNoYW5nZScsIHRoaXMucmVuZGVyLmJpbmQodGhpcykpO1xuICogICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuX21vZGVsIGFzIFRvRG9FdmVudFNvdXJjZSwgJ0BkZXN0cm95JywgdGhpcy5yZW1vdmUuYmluZCh0aGlzKSk7XG4gKiAgICAgfVxuICpcbiAqICAgICBwcm90ZWN0ZWQgZXZlbnRzKCk6IFZpZXdFdmVudHNIYXNoPEhUTUxFbGVtZW50PiB7XG4gKiAgICAgICAgIHJldHVybiB7XG4gKiAgICAgICAgICAgICAnY2xpY2sgLnRvZ2dsZSc6ICAgdGhpcy50b2dnbGVEb25lLFxuICogICAgICAgICAgICAgJ2RibGNsaWNrIC52aWV3JzogIHRoaXMuZWRpdCxcbiAqICAgICAgICAgICAgICdjbGljayBhLmRlc3Ryb3knOiB0aGlzLmNsZWFyLFxuICogICAgICAgICAgICAgJ2tleXByZXNzIC5lZGl0JzogIHRoaXMudXBkYXRlT25FbnRlcixcbiAqICAgICAgICAgICAgICdibHVyIC5lZGl0JzogICAgICB0aGlzLmNsb3NlLFxuICogICAgICAgICB9O1xuICogICAgIH1cbiAqXG4gKiAgICAgcmVuZGVyKCk6IHRoaXMge1xuICogICAgICAgICB0aGlzLiRlbC5odG1sKF90ZW1wbGF0ZSh0aGlzLl9tb2RlbC50b0pTT04oKSkpO1xuICogICAgICAgICB0aGlzLiRlbC50b2dnbGVDbGFzcygnZG9uZScsIHRoaXMuX21vZGVsLmRvbmUpO1xuICogICAgICAgICB0aGlzLl8kaW5wdXQgPSB0aGlzLiQoJy5lZGl0JykgYXMgRE9NPEhUTUxJbnB1dEVsZW1lbnQ+O1xuICogICAgICAgICByZXR1cm4gdGhpcztcbiAqICAgICB9XG4gKiAgICAgOlxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCB0eXBlIF9WaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+ID0gVmlld0NvcmUgPFRFbGVtZW50PiAmIEV2ZW50U291cmNlPFRFdmVudD47XG5cbi8qKlxuICogQGVuIENvbnN0cnVjdG9yIG9mIHtAbGluayBWaWV3fVxuICogQGphIHtAbGluayBWaWV3fSDjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/lrp/kvZNcbiAqL1xuY29uc3QgX1ZpZXc6IHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IF9WaWV3PGFueSwgYW55PjtcbiAgICBuZXcgPFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+KG9wdGlvbnM/OiBWaWV3Q29uc3RydWN0aW9uT3B0aW9uczxURWxlbWVudD4pOiBfVmlldzxURWxlbWVudCwgVEV2ZW50Pjtcbn0gPSBWaWV3IGFzIGFueTtcblxuZXhwb3J0IHsgX1Zp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QUMsUUFBUSxDQUFDOzs7O0FBTWxDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFxQkc7SUFDTyxNQUFNLEdBQUE7QUFDWixRQUFBLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQzs7Ozs7SUE2QjVDLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBMkMsRUFBQTtBQUMvRCxRQUFBLE1BQU0sRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxHQUFHLE9BQU8sSUFBSSxFQUFFO1FBRXZFLElBQUksQ0FBQyxXQUFXLENBQWtDLEdBQUc7QUFDbEQsWUFBQSxHQUFHLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDckIsTUFBTTtZQUNOLEVBQUU7WUFDRixTQUFTO1lBQ1QsVUFBVTtZQUNWLE9BQU8sRUFBRSxPQUFPLElBQUksS0FBSztTQUNOO0FBRXZCLFFBQUEsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzs7O0lBSXBCLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBbUMsRUFBQTtRQUN4RCxJQUFJLENBQUMsRUFBRSxFQUFFO0FBQ0wsWUFBQSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUk7WUFDakMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBcUIsQ0FBQztBQUNyRSxZQUFBLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQzs7YUFDbEI7QUFDSCxZQUFBLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDOzs7QUFHOUI7QUFFRDtBQUNBLE1BQWUsSUFBSyxVQUFTLE1BQU0sQ0FBQyxXQUFXLEVBQUUsUUFBaUMsQ0FBQyxFQUFDO0FBQ2hGOzs7Ozs7QUFNRztBQUNILElBQUEsV0FBQSxDQUFZLE9BQWlDLEVBQUE7QUFDekMsUUFBQSxLQUFLLEVBQUU7QUFDUCxRQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBaUMsRUFBRSxLQUFLLENBQUM7QUFDcEQsUUFBQSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDOztBQUc5Qjs7O0FBR0c7SUFDSSxPQUFPLEdBQUE7UUFDVixLQUFLLENBQUMsT0FBTyxFQUFFO1FBQ2YsSUFBSSxDQUFDLGFBQWEsRUFBRTtRQUNwQixJQUFJLENBQUMsR0FBRyxFQUFFO0FBQ1YsUUFBQSxPQUFPLElBQUk7O0FBRWxCO0FBbUREOzs7QUFHRztBQUNHLE1BQUEsS0FBSyxHQUdQOzs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC92aWV3LyJ9