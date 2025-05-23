import { type Nullish, type PlainObject } from '@cdp/core-utils';
import { EventSource } from '@cdp/events';
import { type DOM, type DOMSelector, type DOMResult, type DOMEventListener, type DOMEventMap, type EventType, type EventTypeOrNamespace } from '@cdp/dom';
import type { ViewEventsHash, ViewConstructionOptions } from './interfaces';
export type ViewFindSelector = Node | string | Nullish;
/**
 * @en Core implementation of {@link View} without {@link EventSource} interface. <br>
 *     Can be specified as mixin source.
 * @ja {@link EventSource} インターフェイスを持たない {@link View} のコア実装 <br>
 *     Mixin source として指定可能
 */
export declare abstract class ViewCore<TElement extends Node = HTMLElement> {
    /**
     * constructor
     *
     * @param options
     *  - `en` construction options.
     *  - `ja` 構築オプション
     */
    constructor(options?: ViewConstructionOptions<TElement>);
    /**
     * @en Release all listeners.
     * @ja すべてのリスナーを解除
     */
    release(): this;
    /**
     * @en Remove this view by taking the element out of the DOM with release all listeners.
     * @ja View から DOM を切り離し, リスナーを解除
     */
    remove(): this;
    /**
     * @en Get content ID.
     * @ja コンテンツ ID を取得
     */
    get id(): string;
    /**
     * @en Get element.
     * @ja 要素を取得
     */
    get el(): TElement;
    /**
     * @en Get {@link DOM} object.
     * @ja {@link DOM} オブジェクトを取得
     */
    get $el(): DOM<TElement>;
    /**
     * @en Get internal content ID.
     * @ja 内部のコンテンツ ID を取得
     */
    protected get _cid(): string;
    /**
     * @en Get default tag name.
     * @ja 既定のタグ名を取得
     */
    protected get _tagName(): string;
    /**
     * @en Attributes instance
     * @ja 属性を格納するインスタンス
     */
    protected get _attrs(): PlainObject<string | number | boolean | null>;
    /**
     * @en Change the view's element (`this.el` property) and re-delegate the view's events on the new element.
     * @ja View が管轄する要素 (`this.el` property) の変更. イベント再設定も実行
     *
     * @param el
     *  - `en` Object or the selector string which becomes origin of element.
     *  - `ja` 要素のもとになるオブジェクトまたはセレクタ文字列
     */
    setElement(el: DOMSelector<TElement | string>): this;
    /**
     * @en Set DOM callbacks from {@link ViewEventsHash} object.
     * @ja {@link ViewEventsHash} オブジェクトから DOM コールバックを設定
     *
     * @param events
     *  - `en` {@link ViewEventsHash} object. `this.events()` is used by default.
     *  - `ja` {@link ViewEventsHash} オブジェクト. 既定値は `this.events()`
     */
    delegateEvents(events?: ViewEventsHash<TElement>): this;
    /**
     * @en Clears all callbacks previously bound to the view by `delegate`.
     * @ja `delegate` されたイベントをすべて削除
     */
    undelegateEvents(): this;
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
    delegate<TEventMap extends DOMEventMap<TElement>>(type: EventType<TEventMap> | (EventType<TEventMap>)[], selector: string, listener: DOMEventListener<TElement, TEventMap>, options?: boolean | AddEventListenerOptions): this;
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
    delegate<TEventMap extends DOMEventMap<TElement>>(type: EventType<TEventMap> | (EventType<TEventMap>)[], listener: DOMEventListener<TElement, TEventMap>, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Remove event handler. The handler designated at {@link DOMEvents.on} or {@link DOMEvents.once} and that same condition are released. <br>
     *     If the method receives no arguments, all handlers are released.
     * @ja 設定されているイベントハンドラの解除. {@link DOMEvents.on} または {@link DOMEvents.once} と同条件で指定したものが解除される <br>
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
    undelegate<TEventMap extends DOMEventMap<TElement>>(type: EventTypeOrNamespace<TEventMap> | (EventTypeOrNamespace<TEventMap>)[], selector: string, listener?: DOMEventListener<TElement, TEventMap>, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Remove event handler. The handler designated at {@link DOMEvents.on} or {@link DOMEvents.once} and that same condition are released. <br>
     *     If the method receives no arguments, all handlers are released.
     * @ja 設定されているイベントハンドラの解除. {@link DOMEvents.on} または {@link DOMEvents.once} と同条件で指定したものが解除される <br>
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
    undelegate<TEventMap extends DOMEventMap<TElement>>(type: EventTypeOrNamespace<TEventMap> | (EventTypeOrNamespace<TEventMap>)[], listener?: DOMEventListener<TElement, TEventMap>, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Get the descendants of each element in the current set of matched elements, filtered by a selector.
     * @ja 配下の要素に対して指定したセレクタに一致する要素を検索
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of DOM.
     *  - `ja` DOM のもとになるインスタンス(群)またはセレクタ文字列
     */
    $<T extends ViewFindSelector = ViewFindSelector>(selector: DOMSelector<T>): DOMResult<T>;
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
    protected events(): ViewEventsHash<TElement>;
    /**
     * @en Implement this function with your code that renders the view template from model data, and updates `this.el` with the new HTML.
     * @ja `this.el` 更新時の新しい HTML をレンダリングロジックの実装関数. モデル更新と View テンプレートを連動させる.
     *
     * @example <br>
     *
     * ```ts
     * import { TemplateEngine } from '@cdp/runtime';
     *
     * class SampleView extends View {
     *     private _template = TemplateEngine.compile('{{title}}');
     *     render(): void {
     *         this.$el.html(this._template(this.model));
     *     }
     * }
     * ```
     */
    abstract render(...args: unknown[]): any;
}
/**
 * @en Base class definition for view that manages the layout and a DOM events.
 * @ja レイアウト管理と DOM イベントの監視を行う View の基底クラス定義
 *
 * @example <br>
 *
 * ```ts
 * import {
 *     TemplateEngine,
 *     DOM, dom as $,
 *     View, ViewEventsHash,
 * } from '@cdp/rumtime';
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
export type _View<TElement extends Node = HTMLElement, TEvent extends object = object> = ViewCore<TElement> & EventSource<TEvent>;
/**
 * @en Constructor of {@link View}
 * @ja {@link View} のコンストラクタ実体
 */
declare const _View: {
    readonly prototype: _View<any, any>;
    new <TElement extends Node = HTMLElement, TEvent extends object = object>(options?: ViewConstructionOptions<TElement>): _View<TElement, TEvent>;
};
export { _View as View };
