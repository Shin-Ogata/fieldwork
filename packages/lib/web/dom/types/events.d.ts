import { type ElementBase, type DOM } from './static';
import { type DOMIterable } from './base';
import type { ConnectEventMap } from './detection';
export type DOMEventMap<T> = T extends Window ? WindowEventMap : T extends Document ? DocumentEventMap : T extends HTMLBodyElement ? HTMLBodyElementEventMap & ConnectEventMap : T extends HTMLMediaElement ? HTMLMediaElementEventMap & ConnectEventMap : T extends HTMLElement ? HTMLElementEventMap & ConnectEventMap : T extends Element ? ElementEventMap & ConnectEventMap : GlobalEventHandlersEventMap;
export type DOMEventListener<T = HTMLElement, M extends DOMEventMap<T> = DOMEventMap<T>> = (event: M[keyof M], ...args: unknown[]) => unknown;
export type EventWithNamespace<T extends DOMEventMap<any>> = keyof T | `${string & keyof T}.${string}`;
export type MakeEventType<T, M> = T extends keyof M ? keyof M : (T extends `${string & keyof M}.${infer C}` ? `${string & keyof M}.${C}` : never);
export type EventType<T extends DOMEventMap<any>> = MakeEventType<EventWithNamespace<T>, T>;
export type EventTypeOrNamespace<T extends DOMEventMap<any>> = EventType<T> | `.${string}`;
/**
 * @en Mixin base class which concentrated the event managements.
 * @ja イベント管理を集約した Mixin Base クラス
 */
export declare class DOMEvents<TElement extends ElementBase> implements DOMIterable<TElement> {
    readonly [n: number]: TElement;
    readonly length: number;
    [Symbol.iterator]: () => Iterator<TElement>;
    entries: () => IterableIterator<[number, TElement]>;
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
    on<TEventMap extends DOMEventMap<TElement>>(type: EventType<TEventMap> | (EventType<TEventMap>)[], selector: string, listener: DOMEventListener<TElement, TEventMap>, options?: boolean | AddEventListenerOptions): this;
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
    on<TEventMap extends DOMEventMap<TElement>>(type: EventType<TEventMap> | (EventType<TEventMap>)[], listener: DOMEventListener<TElement, TEventMap>, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Remove event handler. The handler designated at {@link DOMEvents.on | on}() or {@link DOMEvents.once | once}() and that same condition are released. <br>
     *     If the method receives no arguments, all handlers are released.
     * @ja 設定されているイベントハンドラの解除. {@link DOMEvents.on | on}() または {@link DOMEvents.once | once}() と同条件で指定したものが解除される <br>
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
    off<TEventMap extends DOMEventMap<TElement>>(type: EventTypeOrNamespace<TEventMap> | (EventTypeOrNamespace<TEventMap>)[], selector: string, listener?: DOMEventListener<TElement, TEventMap>, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Remove event handler. The handler designated at {@link DOMEvents.on | on}() or {@link DOMEvents.once | once}() and that same condition are released. <br>
     *     If the method receives no arguments, all handlers are released.
     * @ja 設定されているイベントハンドラの解除. {@link DOMEvents.on | on}() または {@link DOMEvents.once | once}() と同条件で指定したものが解除される <br>
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
    off<TEventMap extends DOMEventMap<TElement>>(type: EventTypeOrNamespace<TEventMap> | (EventTypeOrNamespace<TEventMap>)[], listener?: DOMEventListener<TElement, TEventMap>, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Remove all event handler.
     * @ja 設定されているすべてのイベントハンドラの解除
     */
    off(): this;
    /**
     * @en Add event handler function to one or more events to the elements that will be executed only once. (live event available)
     * @ja 要素に対して, 一度だけ呼び出されるイベントハンドラを設定 (動的要素に対しても有効)
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
    once<TEventMap extends DOMEventMap<TElement>>(type: EventType<TEventMap> | (EventType<TEventMap>)[], selector: string, listener: DOMEventListener<TElement, TEventMap>, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Add event handler function to one or more events to the elements that will be executed only once. (live event available)
     * @ja 要素に対して, 一度だけ呼び出されるイベントハンドラを設定 (動的要素に対しても有効)
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
    once<TEventMap extends DOMEventMap<TElement>>(type: EventType<TEventMap> | (EventType<TEventMap>)[], listener: DOMEventListener<TElement, TEventMap>, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Execute all handlers added to the matched elements for the specified event.
     * @ja 設定されているイベントハンドラに対してイベントを発行
     *
     * @example <br>
     *
     * ```ts
     * // w/ event-namespace behaviour
     * $('.link').on('click.hoge.piyo', (e) => { ... });
     * $('.link').on('click.hoge',  (e) => { ... });
     *
     * $('.link').trigger('.hoge');           // compile error. (not fire)
     * $('.link').trigger('click.hoge');      // fire both.
     * $('.link').trigger('click.hoge.piyo'); // fire only first one
     * ```
     * @param seed
     *  - `en` event name or event name array. / `Event` instance or `Event` instance array.
     *  - `ja` イベント名またはイベント名配列 / `Event` インスタンスまたは `Event` インスタンス配列
     * @param eventData
     *  - `en` optional sending data.
     *  - `ja` 送信する任意のデータ
     */
    trigger<TEventMap extends DOMEventMap<TElement>>(seed: EventType<TEventMap> | (EventType<TEventMap>)[] | Event | Event[] | (EventType<TEventMap> | Event)[], ...eventData: unknown[]): this;
    /**
     * @en Shortcut for {@link DOMEvents.once | once}('transitionstart').
     * @ja {@link DOMEvents.once | once}('transitionstart') のユーティリティ
     *
     * @param callback
     *  - `en` `transitionstart` handler.
     *  - `ja` `transitionstart` ハンドラ
     * @param permanent
     *  - `en` if set `true`, callback keep living until elements removed.
     *  - `ja` `true` を設定した場合, 要素が削除されるまでコールバックが有効
     */
    transitionStart(callback: (event: TransitionEvent, ...args: unknown[]) => void, permanent?: boolean): this;
    /**
     * @en Shortcut for {@link DOMEvents.once | once}('transitionend').
     * @ja {@link DOMEvents.once | once}('transitionend') のユーティリティ
     *
     * @param callback
     *  - `en` `transitionend` handler.
     *  - `ja` `transitionend` ハンドラ
     * @param permanent
     *  - `en` if set `true`, callback keep living until elements removed.
     *  - `ja` `true` を設定した場合, 要素が削除されるまでコールバックが有効
     */
    transitionEnd(callback: (event: TransitionEvent, ...args: unknown[]) => void, permanent?: boolean): this;
    /**
     * @en Shortcut for {@link DOMEvents.once | once}('animationstart').
     * @ja {@link DOMEvents.once | once}('animationstart') のユーティリティ
     *
     * @param callback
     *  - `en` `animationstart` handler.
     *  - `ja` `animationstart` ハンドラ
     * @param permanent
     *  - `en` if set `true`, callback keep living until elements removed.
     *  - `ja` `true` を設定した場合, 要素が削除されるまでコールバックが有効
     */
    animationStart(callback: (event: AnimationEvent, ...args: unknown[]) => void, permanent?: boolean): this;
    /**
     * @en Shortcut for {@link DOMEvents.once | once}('animationend').
     * @ja {@link DOMEvents.once | once}('animationend') のユーティリティ
     *
     * @param callback
     *  - `en` `animationend` handler.
     *  - `ja` `animationend` ハンドラ
     * @param permanent
     *  - `en` if set `true`, callback keep living until elements removed.
     *  - `ja` `true` を設定した場合, 要素が削除されるまでコールバックが有効
     */
    animationEnd(callback: (event: AnimationEvent, ...args: unknown[]) => void, permanent?: boolean): this;
    /**
     * @en Bind one or two handlers to the matched elements, to be executed when the `mouseenter` and `mouseleave` the elements.
     * @ja 1つまたは2つのハンドラを指定し, 一致した要素の `mouseenter`, `mouseleave` を検知
     *
     * @param handlerIn(Out)
     *  - `en` A function to execute when the `mouseenter` the element. <br>
     *        If handler set only one, a function to execute when the `mouseleave` the element, too.
     *  - `ja` `mouseenter` イベントハンドラを指定. <br>
     *          引数が1つである場合, `mouseleave` ハンドラも兼ねる
     * @param handlerOut
     *  - `en` A function to execute when the `mouseleave` the element.
     *  - `ja` `mouseleave` ハンドラを指定
     */
    hover(handlerIn: DOMEventListener, handlerOut?: DOMEventListener): this;
    /**
     * @en Trigger or handle `click` event.
     * @ja `click` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    click(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `dblclick` event.
     * @ja `dblclick` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    dblclick(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `blur` event.
     * @ja `blur` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    blur(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `focus` event.
     * @ja `focus` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    focus(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `focusin` event.
     * @ja `focusin` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    focusin(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `focusout` event.
     * @ja `focusout` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    focusout(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `keyup` event.
     * @ja `keyup` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    keyup(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `keydown` event.
     * @ja `keydown` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    keydown(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `keypress` event.
     * @ja `keypress` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    keypress(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `submit` event.
     * @ja `submit` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    submit(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `contextmenu` event.
     * @ja `contextmenu` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    contextmenu(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `change` event.
     * @ja `change` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    change(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `mousedown` event.
     * @ja `mousedown` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    mousedown(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `mousemove` event.
     * @ja `mousemove` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    mousemove(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `mouseup` event.
     * @ja `mouseup` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    mouseup(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `mouseenter` event.
     * @ja `mouseenter` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    mouseenter(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `mouseleave` event.
     * @ja `mouseleave` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    mouseleave(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `mouseout` event.
     * @ja `mouseout` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    mouseout(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `mouseover` event.
     * @ja `mouseover` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    mouseover(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `touchstart` event.
     * @ja `touchstart` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    touchstart(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `touchend` event.
     * @ja `touchend` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    touchend(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `touchmove` event.
     * @ja `touchmove` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    touchmove(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `touchcancel` event.
     * @ja `touchcancel` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    touchcancel(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `resize` event.
     * @ja `resize` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    resize(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Trigger or handle `scroll` event.
     * @ja `scroll` イベントの発行または捕捉
     *
     * @param handler
     *  - `en` event handler is designated. when omitting, the event is triggered.
     *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
     * @param options
     *  - `en` options for `addEventLisntener`
     *  - `ja` `addEventLisntener` に指定するオプション
     */
    scroll(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Create a deep copy of the set of matched elements.
     * @ja 配下の要素のディープコピーを作成
     *
     * @param withEvents
     *  - `en` A Boolean indicating whether event handlers should be copied along with the elements.
     *  - `ja` イベントハンドラもコピーするかどうかを決定
     * @param deep
     *  - `en` A Boolean indicating whether event handlers for all children of the cloned element should be copied.
     *  - `ja` boolean値で、配下の要素のすべての子要素に対しても、付随しているイベントハンドラをコピーするかどうかを決定
     */
    clone(withEvents?: boolean, deep?: boolean): DOM<TElement>;
}
