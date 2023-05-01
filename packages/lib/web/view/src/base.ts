/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import {
    Constructor,
    Writable,
    Nullish,
    PlainObject,
    UnknownFunction,
    isFunction,
    isEmptyObject,
    luid,
    drop,
    mixins,
} from '@cdp/core-utils';
import { EventSource } from '@cdp/events';
import {
    DOM,
    DOMSelector,
    DOMResult,
    DOMEventListener,
    DOMEventMap,
    EventType,
    EventTypeOrNamespace,
    dom as $,
} from '@cdp/dom';
import { ViewEventsHash, ViewConstructionOptions } from './interfaces';
import { document } from './ssr';

/** @internal */ const _initialize    = Symbol('init-internal');
/** @internal */ const _properties    = Symbol('properties');
/** @internal */ const _ensureElement = Symbol('ensure-element');

/** @internal */
interface Property<T extends Node> {
    readonly cid: string;
    readonly events?: ViewEventsHash<T>;
    readonly id?: string;
    readonly className?: string;
    readonly attributes?: PlainObject<string | number | boolean | null>;
    readonly tagName: string;
    $el: DOM<T>;
}

//__________________________________________________________________________________________________//

export type ViewFindSelector = Node | string | Nullish;

/**
 * @en Core implementation of [[View]] without [[EventSource]] interface. <br>
 *     Can be specified as mixin source.
 * @ja [[EventSource]] インターフェイスを持たない [[View]] のコア実装 <br>
 *     Mixin source として指定可能
 */
export abstract class ViewCore<TElement extends Node = HTMLElement> {

    /** @internal */
    private readonly [_properties]!: Property<TElement>;

///////////////////////////////////////////////////////////////////////
// construction/destruction:

    /**
     * constructor
     *
     * @param options
     *  - `en` construction options.
     *  - `ja` 構築オプション
     */
    constructor(options?: ViewConstructionOptions<TElement>) {
        if (false !== options as unknown as boolean) {
            this[_initialize](options);
        }
    }

    /**
     * @en Release all listeners.
     * @ja すべてのリスナーを解除
     */
    public release(): this {
        this.undelegateEvents();
        return this;
    }

    /**
     * @en Remove this view by taking the element out of the DOM with release all listeners.
     * @ja View から DOM を切り離し, リスナーを解除
     */
    public remove(): this {
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
    get id(): string {
        const { cid, id } = this[_properties];
        return id || cid;
    }

    /**
     * @en Get element.
     * @ja 要素を取得
     */
    get el(): TElement {
        return this[_properties].$el[0];
    }

    /**
     * @en Get [[DOM]] object.
     * @ja [[DOM]] オブジェクトを取得
     */
    get $el(): DOM<TElement> {
        return this[_properties].$el;
    }

    /**
     * @en Get internal content ID.
     * @ja 内部のコンテンツ ID を取得
     */
    protected get _cid(): string {
        return this[_properties].cid;
    }

    /**
     * @en Get default tag name.
     * @ja 既定のタグ名を取得
     */
    protected get _tagName(): string {
        return this[_properties].tagName;
    }

    /**
     * @en Attributes instance
     * @ja 属性を格納するインスタンス
     */
    protected get _attrs(): PlainObject<string | number | boolean | null> {
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
    public setElement(el: DOMSelector<TElement | string>): this {
        this.undelegateEvents();
        this[_properties].$el = $(el) as DOM<TElement>;
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
    public delegateEvents(events?: ViewEventsHash<TElement>): this {
        const hash = events || this.events();
        if (isEmptyObject(hash)) {
            return this;
        }

        this.undelegateEvents();

        for (const key of Object.keys(hash)) {
            let method = hash[key] as UnknownFunction;
            if (!isFunction(method)) {
                method = this[method];
            }
            if (!method) {
                continue;
            }
            const match = /^(\S+)\s*(.*)$/.exec(key) as RegExpExecArray;
            this.delegate<any>(match[1], match[2], method.bind(this));
        }

        return this;
    }

    /**
     * @en Clears all callbacks previously bound to the view by `delegate`.
     * @ja `delegate` されたイベントをすべて削除
     */
    public undelegateEvents(): this {
        this.$el && this.$el.off<any>(`.${this._cid}`);
        return this;
    }

    /**
     * @en Add event handler function to one or more events to the elements. (live event available)
     * @ja 要素に対して, 1つまたは複数のイベントハンドラを設定 (動的要素にも有効)
     *
     * @param type
     *  - `en` event name or event name array.
     *  - `ja` イベント名またはイベント名配列
     * @param selector
     *  - `en` A selector string to filter the descendants of the selected elements that trigger the event.
     *  - `ja` イベント発行元をフィルタリングするセレクタ文字列
     * @param listener
     *  - `en` callback function
     *  - `ja` コールバック関数
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    public delegate<TEventMap extends DOMEventMap<TElement>>(
        type: EventType<TEventMap> | (EventType<TEventMap>)[],
        selector: string,
        listener: DOMEventListener<TElement, TEventMap>,
        options?: boolean | AddEventListenerOptions
    ): this;

    /**
     * @en Add event handler function to one or more events to the elements. (live event available)
     * @ja 要素に対して, 1つまたは複数のイベントハンドラを設定 (動的要素にも有効)
     *
     * @param type
     *  - `en` event name or event name array.
     *  - `ja` イベント名またはイベント名配列
     * @param listener
     *  - `en` callback function
     *  - `ja` コールバック関数
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    public delegate<TEventMap extends DOMEventMap<TElement>>(
        type: EventType<TEventMap> | (EventType<TEventMap>)[],
        listener: DOMEventListener<TElement, TEventMap>,
        options?: boolean | AddEventListenerOptions
    ): this;

    public delegate(type: string, ...args: unknown[]): this {
        (this.$el as any).on(`${type}.${this._cid}`, ...args);
        return this;
    }

    /**
     * @en Remove event handler. The handler designated at [[on]] or [[once]] and that same condition are released. <br>
     *     If the method receives no arguments, all handlers are released.
     * @ja 設定されているイベントハンドラの解除. [[on]] または [[once]] と同条件で指定したものが解除される <br>
     *     引数が無い場合はすべてのハンドラが解除される.
     *
     * @param type
     *  - `en` event name or event name array.
     *  - `ja` イベント名またはイベント名配列
     * @param selector
     *  - `en` A selector string to filter the descendants of the selected elements that trigger the event.
     *  - `ja` イベント発行元をフィルタリングするセレクタ文字列
     * @param listener
     *  - `en` callback function
     *  - `ja` コールバック関数
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    public undelegate<TEventMap extends DOMEventMap<TElement>>(
        type: EventTypeOrNamespace<TEventMap> | (EventTypeOrNamespace<TEventMap>)[],
        selector: string,
        listener?: DOMEventListener<TElement, TEventMap>,
        options?: boolean | AddEventListenerOptions
    ): this;

    /**
     * @en Remove event handler. The handler designated at [[on]] or [[once]] and that same condition are released. <br>
     *     If the method receives no arguments, all handlers are released.
     * @ja 設定されているイベントハンドラの解除. [[on]] または [[once]] と同条件で指定したものが解除される <br>
     *     引数が無い場合はすべてのハンドラが解除される.
     *
     * @param type
     *  - `en` event name or event name array.
     *  - `ja` イベント名またはイベント名配列
     * @param listener
     *  - `en` callback function
     *  - `ja` コールバック関数
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    public undelegate<TEventMap extends DOMEventMap<TElement>>(
        type: EventTypeOrNamespace<TEventMap> | (EventTypeOrNamespace<TEventMap>)[],
        listener?: DOMEventListener<TElement, TEventMap>,
        options?: boolean | AddEventListenerOptions
    ): this;

    public undelegate(type: string, ...args: unknown[]): this {
        (this.$el as any).off(`${type}.${this._cid}`, ...args);
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
    public $<T extends ViewFindSelector = ViewFindSelector>(selector: DOMSelector<T>): DOMResult<T> {
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
    protected events(): ViewEventsHash<TElement> {
        return Object.assign({}, this[_properties].events);
    }

///////////////////////////////////////////////////////////////////////
// abstract:

    /**
     * @en Implement this function with your code that renders the view template from model data, and updates `this.el` with the new HTML.
     * @ja `this.el` 更新時の新しい HTML をレンダリングロジックの実装関数. モデル更新と View テンプレートを連動させる.
     *
     * @example <br>
     *
     * ```ts
     * import { TemplateEngine } from '@cdp/core-template';
     *
     * class SampleView extends View {
     *     private _template = TemplateEngine.compile('{{title}}');
     *     render(): void {
     *         this.$el.html(this._template(this.model));
     *     }
     * }
     * ```
     */
    abstract render(...args: unknown[]): Promise<any | void> | any | void;

///////////////////////////////////////////////////////////////////////
// internal:

    /** @internal */
    protected [_initialize](options?: ViewConstructionOptions<TElement>): void {
        const { el, tagName, id, attributes, className, events } = options || {};

        (this[_properties] as Writable<Property<TElement>>) = {
            cid: luid('view:', 8),
            events,
            id,
            className,
            attributes,
            tagName: tagName || 'div',
        } as Property<TElement>;

        this[_ensureElement](el);
    }

    /** @internal */
    private [_ensureElement](el?: DOMSelector<TElement | string>): void {
        if (!el) {
            const { _attrs, _tagName } = this;
            this.setElement(document.createElement(_tagName) as Node as TElement);
            this.$el.attr(_attrs);
        } else {
            this.setElement(el);
        }
    }
}

/** @internal [[View]] class */
abstract class View extends (mixins(EventSource, ViewCore as Constructor<ViewCore>)) {
    /**
     * constructor
     *
     * @param options
     *  - `en` construction options.
     *  - `ja` 構築オプション
     */
    constructor(options?: ViewConstructionOptions) {
        super();
        this.super(ViewCore as Constructor<ViewCore>, false);
        this[_initialize](options);
    }

    /**
     * @en Release all listeners.
     * @ja すべてのリスナーを解除
     */
    public release(): this {
        super.release();
        this.stopListening();
        this.off();
        return this;
    }
}

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
export type _View<TElement extends Node = HTMLElement, TEvent extends object = object> = ViewCore <TElement> & EventSource<TEvent>;

/**
 * @en Constructor of [[View]]
 * @ja [[View]] のコンストラクタ実体
 */
const _View: {
    readonly prototype: _View<any, any>;
    new <TElement extends Node = HTMLElement, TEvent extends object = object>(options?: ViewConstructionOptions<TElement>): _View<TElement, TEvent>;
} = View as any;

export { _View as View };
