/* eslint-disable
    no-invalid-this,
    @typescript-eslint/no-explicit-any,
 */

import {
    Accessible,
    isFunction,
    isString,
    isArray,
    combination,
    setMixClassAttribute,
} from '@cdp/core-utils';
import { CustomEvent } from './ssr';
import {
    ElementBase,
    DOM,
    dom as $,
} from './static';
import { DOMIterable, isTypeElement } from './base';
import type { ConnectEventMap } from './detection';

/** @internal */
interface InternalEventListener extends EventListener {
    origin?: EventListener;
}

/** @internal */
interface EventListenerHandler {
    listener: InternalEventListener;
    proxy: EventListener;
}

/** @internal */
interface BindInfo {
    registered: Set<EventListener>;
    handlers: EventListenerHandler[];
}

/** @internal */
type BindEventContext = Record<string, BindInfo>;

/** @internal */
const enum Const {
    COOKIE_SEPARATOR  = '|',
    ADDRESS_EVENT     = 0,
    ADDRESS_NAMESPACE = 1,
    ADDRESS_OPTIONS   = 2,
}

//__________________________________________________________________________________________________//

/** @internal */
const _eventContextMap = {
    eventData: new WeakMap<ElementBase, unknown[]>(),
    eventListeners: new WeakMap<ElementBase, BindEventContext>(),
    liveEventListeners: new WeakMap<ElementBase, BindEventContext>(),
};

/** @internal query event-data from element */
function queryEventData(event: Event): unknown[] {
    const data = _eventContextMap.eventData.get(event.target as Element) ?? [];
    data.unshift(event);
    return data;
}

/** @internal register event-data with element */
function registerEventData(elem: ElementBase, eventData: unknown[]): void {
    _eventContextMap.eventData.set(elem, eventData);
}

/** @internal delete event-data by element */
function deleteEventData(elem: ElementBase): void {
    _eventContextMap.eventData.delete(elem);
}

/** @internal normalize event namespace */
function normalizeEventNamespaces(event: string): string {
    const namespaces = event.split('.');
    const main = namespaces.shift()!;
    if (!namespaces.length) {
        return main;
    } else {
        namespaces.sort();
        return `${main}.${namespaces.join('.')}`;
    }
}

/** @internal split event namespaces */
function splitEventNamespaces(event: string): { type: string; namespace: string; }[] {
    const retval: { type: string; namespace: string; }[] = [];

    const namespaces = event.split('.');
    const main = namespaces.shift()!;

    if (!namespaces.length) {
        retval.push({ type: main, namespace: '' });
    } else {
        namespaces.sort();

        const combos: string[][] = [];
        for (let i = namespaces.length; i >= 1; i--) {
            combos.push(...combination(namespaces, i));
        }

        const signature = `.${namespaces.join('.')}.`;
        retval.push({ type: main, namespace: signature });
        for (const ns of combos) {
            retval.push({ type: `${main}.${ns.join('.')}`, namespace: signature });
        }
    }

    return retval;
}

/** @internal reverse resolution event namespaces */
function resolveEventNamespaces(elem: ElementBase, event: string): { type: string; namespace: string; }[] {
    const retval: { type: string; namespace: string; }[] = [];

    const namespaces = event.split('.');
    const main = namespaces.shift()!;
    const type = normalizeEventNamespaces(event);

    if (!namespaces.length) {
        retval.push({ type: main, namespace: '' });
    } else {
        const query = (context: BindEventContext | undefined): void => {
            if (context) {
                const cookies = Object.keys(context);

                const signatures = cookies.filter(cookie => {
                    return type === cookie.split(Const.COOKIE_SEPARATOR)[Const.ADDRESS_EVENT];
                }).map(cookie => {
                    return cookie.split(Const.COOKIE_SEPARATOR)[Const.ADDRESS_NAMESPACE];
                });

                const siblings = cookies.filter(cookie => {
                    for (const signature of signatures) {
                        if (signature === cookie.split(Const.COOKIE_SEPARATOR)[Const.ADDRESS_NAMESPACE]) {
                            return true;
                        }
                    }
                    return false;
                }).map(cookie => {
                    const seed = cookie.split(Const.COOKIE_SEPARATOR);
                    return { type: seed[Const.ADDRESS_EVENT], namespace: seed[Const.ADDRESS_NAMESPACE] };
                });

                retval.push(...siblings);
            }
        };

        const { eventListeners, liveEventListeners } = _eventContextMap;
        query(eventListeners.get(elem));
        query(liveEventListeners.get(elem));
    }

    return retval;
}

/** @internal convert event cookie from event name, selector, options */
function toCookie(event: string, namespace: string, selector: string, options: AddEventListenerOptions): string {
    const opts = { ...options };
    delete opts.once;
    return `${event}${Const.COOKIE_SEPARATOR}${namespace}${Const.COOKIE_SEPARATOR}${JSON.stringify(opts)}${Const.COOKIE_SEPARATOR}${selector}`;
}

/** @internal get listener handlers context by element and event */
function getEventListenersHandlers(elem: ElementBase, event: string, namespace: string, selector: string, options: AddEventListenerOptions, ensure: boolean): BindInfo {
    const eventListeners = selector ? _eventContextMap.liveEventListeners : _eventContextMap.eventListeners;
    if (!eventListeners.has(elem)) {
        if (ensure) {
            eventListeners.set(elem, {});
        } else {
            return {
                registered: undefined!,
                handlers: [],
            };
        }
    }

    const context = eventListeners.get(elem)!;
    const cookie = toCookie(event, namespace, selector, options);
    if (!context[cookie]) {
        context[cookie] = {
            registered: new Set<EventListener>(),
            handlers: [],
        };
    }

    return context[cookie];
}

/** @internal query all event and handler by element, for all `off()` and `clone(true)` */
function extractAllHandlers(elem: ElementBase, remove = true): { event: string; handler: EventListener; options: object; }[] {
    const handlers: { event: string; handler: EventListener; options: object; }[] = [];

    const query = (context: BindEventContext | undefined): boolean => {
        if (context) {
            for (const cookie of Object.keys(context)) {
                const seed = cookie.split(Const.COOKIE_SEPARATOR);
                const event = seed[Const.ADDRESS_EVENT];
                const options = JSON.parse(seed[Const.ADDRESS_OPTIONS]);
                for (const handler of context[cookie].handlers) {
                    handlers.push({ event, handler: handler.proxy, options });
                }
            }
            return true;
        } else {
            return false;
        }
    };

    const { eventListeners, liveEventListeners } = _eventContextMap;
    query(eventListeners.get(elem)) && remove && eventListeners.delete(elem);
    query(liveEventListeners.get(elem)) && remove && liveEventListeners.delete(elem);

    return handlers;
}

/** @internal query namespace event and handler by element, for `off(`.${namespace}`)` */
function extractNamespaceHandlers(elem: ElementBase, namespaces: string): { event: string; handler: EventListener; options: object; }[] {
    const handlers: { event: string; handler: EventListener; options: object; }[] = [];

    const names = namespaces.split('.').filter(n => !!n);
    const namespaceFilter = (cookie: string): boolean => {
        for (const namespace of names) {
            if (cookie.includes(`.${namespace}.`)) {
                return true;
            }
        }
        return false;
    };

    const query = (context: BindEventContext | undefined): void => {
        if (context) {
            const cookies = Object.keys(context).filter(namespaceFilter);
            for (const cookie of cookies) {
                const seed = cookie.split(Const.COOKIE_SEPARATOR);
                const event = seed[Const.ADDRESS_EVENT];
                const options = JSON.parse(seed[Const.ADDRESS_OPTIONS]);
                const { registered, handlers: _handlers } = context[cookie];
                for (const handler of _handlers) {
                    handlers.push({ event, handler: handler.proxy, options });
                    registered.delete(handler.listener);
                }
            }
        }
    };

    const { eventListeners, liveEventListeners } = _eventContextMap;
    query(eventListeners.get(elem));
    query(liveEventListeners.get(elem));

    return handlers;
}

/** @internal */
interface ParseEventArgsResult {
    type: string[];
    selector: string;
    listener: InternalEventListener;
    options: AddEventListenerOptions;
}

/** @internal parse event args */
function parseEventArgs(...args: unknown[]): ParseEventArgsResult {
    let [type, selector, listener, options] = args;
    if (isFunction(selector)) {
        [type, listener, options] = args;
        selector = undefined;
    }

    type = !type ? [] : (isArray(type) ? type : [type]);
    selector = selector || '';
    if (!options) {
        options = {};
    } else if (true === options) {
        options = { capture: true };
    }

    return { type, selector, listener, options } as ParseEventArgsResult;
}

/** @internal */ const _noTrigger = ['resize', 'scroll'];

/** @internal event-shortcut impl */
function eventShortcut<T extends ElementBase>(
    this: DOMEvents<Accessible<T, () => void>>,
    name: string,
    handler?: EventListener,
    options?: boolean | AddEventListenerOptions
): DOMEvents<T> {
    if (null == handler) {
        for (const el of this) {
            if (!_noTrigger.includes(name)) {
                if (isFunction(el[name])) {
                    el[name]();
                } else {
                    $(el as any).trigger(name as any);
                }
            }
        }
        return this;
    } else {
        return this.on(name as any, handler as any, options);
    }
}

/** @internal helper for `clone()` */
function cloneEvent(src: Element, dst: Element): void {
    const contexts = extractAllHandlers(src, false);
    for (const context of contexts) {
        dst.addEventListener(context.event, context.handler, context.options);
    }
}

/** @internal helper for `clone()` */
function cloneElement(elem: Element, withEvents: boolean, deep: boolean): Element {
    const clone = elem.cloneNode(true) as Element;

    if (withEvents) {
        if (deep) {
            const srcElements = elem.querySelectorAll('*');
            const dstElements = clone.querySelectorAll('*');
            for (const [index] of srcElements.entries()) {
                cloneEvent(srcElements[index], dstElements[index]);
            }
        } else {
            cloneEvent(elem, clone);
        }
    }

    return clone;
}

/** @internal helper for self event manage */
function handleSelfEvent<TElement extends ElementBase>(
    self: DOMEvents<TElement>,
    callback: (event: Event, ...args: unknown[]) => void,
    eventName: EventTypeOrNamespace<DOMEventMap<HTMLElement | Window>>,
    permanent: boolean,
): DOMEvents<TElement> {
    function fireCallBack(this: Element, e: Event): void {
        if (e.target !== this) {
            return;
        }
        callback.call(this, e);
        if (!permanent) {
            (self as DOMEvents<Node>).off(eventName, fireCallBack);
        }
    }
    isFunction(callback) && (self as DOMEvents<Node>).on(eventName, fireCallBack);
    return self;
}

//__________________________________________________________________________________________________//

/* eslint-disable @typescript-eslint/indent */
export type DOMEventMap<T>
    = T extends Window ? WindowEventMap
    : T extends Document ? DocumentEventMap
    : T extends HTMLBodyElement ? HTMLBodyElementEventMap & ConnectEventMap
    : T extends HTMLMediaElement ? HTMLMediaElementEventMap & ConnectEventMap
    : T extends HTMLElement ? HTMLElementEventMap & ConnectEventMap
    : T extends Element ? ElementEventMap & ConnectEventMap
    : GlobalEventHandlersEventMap;
/* eslint-enable @typescript-eslint/indent */

export type DOMEventListener<T = HTMLElement, M extends DOMEventMap<T> = DOMEventMap<T>> = (event: M[keyof M], ...args: unknown[]) => unknown

export type EventWithNamespace<T extends DOMEventMap<unknown>> = keyof T | `${string & keyof T}.${string}`;
export type MakeEventType<T, M> = T extends keyof M ? keyof M : (T extends `${string & keyof M}.${infer C}` ? `${string & keyof M}.${C}` : never);
export type EventType<T extends DOMEventMap<unknown>> = MakeEventType<EventWithNamespace<T>, T>;
export type EventTypeOrNamespace<T extends DOMEventMap<unknown>> = EventType<T> | `.${string}`;

//__________________________________________________________________________________________________//

/**
 * @en Mixin base class which concentrated the event managements.
 * @ja イベント管理を集約した Mixin Base クラス
 */
export class DOMEvents<TElement extends ElementBase> implements DOMIterable<TElement> {

///////////////////////////////////////////////////////////////////////
// imprements: DOMIterable<T>

    readonly [n: number]: TElement;
    readonly length!: number;
    [Symbol.iterator]!: () => Iterator<TElement>;
    entries!: () => IterableIterator<[number, TElement]>;

///////////////////////////////////////////////////////////////////////
// public: Events basic

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
    public on<TEventMap extends DOMEventMap<TElement>>(
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
    public on<TEventMap extends DOMEventMap<TElement>>(
        type: EventType<TEventMap> | (EventType<TEventMap>)[],
        listener: DOMEventListener<TElement, TEventMap>,
        options?: boolean | AddEventListenerOptions
    ): this;

    public on(...args: unknown[]): this {
        const { type: events, selector, listener, options } = parseEventArgs(...args);

        function handleLiveEvent(e: Event): void {
            const eventData = queryEventData(e);
            const $target = $(e.target as Element | null) as DOM<Element>;
            if ($target.is(selector)) {
                listener.apply($target[0], eventData);
            } else {
                for (const parent of $target.parents()) {
                    if ($(parent).is(selector)) {
                        listener.apply(parent, eventData);
                    }
                }
            }
        }

        function handleEvent(this: DOMEvents<TElement>, e: Event): void {
            listener.apply(this, queryEventData(e));
        }

        const proxy = selector ? handleLiveEvent : handleEvent;

        for (const el of this) {
            for (const event of events) {
                const combos = splitEventNamespaces(event);
                for (const combo of combos) {
                    const { type, namespace } = combo;
                    const { registered, handlers } = getEventListenersHandlers(el, type, namespace, selector, options, true);
                    if (registered && !registered.has(listener)) {
                        registered.add(listener);
                        handlers.push({
                            listener,
                            proxy,
                        });
                        el.addEventListener(type, proxy, options);
                    }
                }
            }
        }

        return this;
    }

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
    public off<TEventMap extends DOMEventMap<TElement>>(
        type: EventTypeOrNamespace<TEventMap> | (EventTypeOrNamespace<TEventMap>)[],
        selector: string,
        listener?: DOMEventListener<TElement, TEventMap>,
        options?: boolean | AddEventListenerOptions
    ): this;

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
    public off<TEventMap extends DOMEventMap<TElement>>(
        type: EventTypeOrNamespace<TEventMap> | (EventTypeOrNamespace<TEventMap>)[],
        listener?: DOMEventListener<TElement, TEventMap>,
        options?: boolean | AddEventListenerOptions
    ): this;

    /**
     * @en Remove all event handler.
     * @ja 設定されているすべてのイベントハンドラの解除
     */
    public off(): this;

    public off(...args: unknown[]): this {
        const { type: events, selector, listener, options } = parseEventArgs(...args);

        if (events.length <= 0) {
            for (const el of this) {
                const contexts = extractAllHandlers(el);
                for (const context of contexts) {
                    el.removeEventListener(context.event, context.handler, context.options);
                }
            }
        } else {
            for (const el of this) {
                for (const event of events) {
                    if (event.startsWith('.')) {
                        const contexts = extractNamespaceHandlers(el, event);
                        for (const context of contexts) {
                            el.removeEventListener(context.event, context.handler, context.options);
                        }
                    } else {
                        const combos = resolveEventNamespaces(el, event);
                        for (const combo of combos) {
                            const { type, namespace } = combo;
                            const { registered, handlers } = getEventListenersHandlers(el, type, namespace, selector, options, false);
                            if (0 < handlers.length) {
                                for (let i = handlers.length - 1; i >= 0; i--) { // backward operation
                                    const handler = handlers[i];
                                    if (
                                        (listener && handler.listener === listener) ||
                                        (handler?.listener?.origin === listener) ||
                                        (!listener)
                                    ) {
                                        el.removeEventListener(type, handler.proxy, options);
                                        handlers.splice(i, 1);
                                        registered.delete(handler.listener);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return this;
    }

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
    public once<TEventMap extends DOMEventMap<TElement>>(
        type: EventType<TEventMap> | (EventType<TEventMap>)[],
        selector: string,
        listener: DOMEventListener<TElement, TEventMap>,
        options?: boolean | AddEventListenerOptions
    ): this;

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
    public once<TEventMap extends DOMEventMap<TElement>>(
        type: EventType<TEventMap> | (EventType<TEventMap>)[],
        listener: DOMEventListener<TElement, TEventMap>,
        options?: boolean | AddEventListenerOptions
    ): this;

    public once(...args: unknown[]): this {
        const { type, selector, listener, options } = parseEventArgs(...args);
        const opts = { ...options, ...{ once: true } };

        const self = this;
        function onceHandler(this: DOMEvents<TElement>, ...eventArgs: unknown[]): void {
            listener.apply(this, eventArgs);
            self.off(type as any, selector, onceHandler, opts);
            delete onceHandler.origin;
        }
        onceHandler.origin = listener as InternalEventListener | undefined;
        return this.on(type as any, selector, onceHandler, opts);
    }

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
    public trigger<TEventMap extends DOMEventMap<TElement>>(
        seed: EventType<TEventMap> | (EventType<TEventMap>)[] | Event | Event[] | (EventType<TEventMap> | Event)[],
        ...eventData: unknown[]
    ): this {
        const convert = (arg: EventType<TEventMap> | Event): Event => {
            if (isString(arg)) {
                return new CustomEvent(normalizeEventNamespaces(arg), {
                    detail: eventData,
                    bubbles: true,
                    cancelable: true,
                });
            } else {
                return arg as Event;
            }
        };

        const events = isArray(seed) ? seed : [seed];

        for (const event of events) {
            const e = convert(event);
            for (const el of this) {
                registerEventData(el, eventData);
                el.dispatchEvent(e);
                deleteEventData(el);
            }
        }
        return this;
    }

///////////////////////////////////////////////////////////////////////
// public: Events utility

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
    public transitionStart(callback: (event: TransitionEvent, ...args: unknown[]) => void, permanent = false): this {
        return handleSelfEvent(this, callback, 'transitionstart', permanent) as this;
    }

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
    public transitionEnd(callback: (event: TransitionEvent, ...args: unknown[]) => void, permanent = false): this {
        return handleSelfEvent(this, callback, 'transitionend', permanent) as this;
    }

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
    public animationStart(callback: (event: AnimationEvent, ...args: unknown[]) => void, permanent = false): this {
        return handleSelfEvent(this, callback, 'animationstart', permanent) as this;
    }

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
    public animationEnd(callback: (event: AnimationEvent, ...args: unknown[]) => void, permanent = false): this {
        return handleSelfEvent(this, callback, 'animationend', permanent) as this;
    }

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
    public hover(handlerIn: DOMEventListener, handlerOut?: DOMEventListener): this {
        handlerOut = handlerOut ?? handlerIn;
        return this.mouseenter(handlerIn).mouseleave(handlerOut);
    }

///////////////////////////////////////////////////////////////////////
// public: Events shortcut

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
    public click(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('click', handler, options);
    }

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
    public dblclick(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('dblclick', handler, options);
    }

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
    public blur(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('blur', handler, options);
    }

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
    public focus(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('focus', handler, options);
    }

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
    public focusin(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('focusin', handler, options);
    }

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
    public focusout(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('focusout', handler, options);
    }

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
    public keyup(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('keyup', handler, options);
    }

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
    public keydown(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('keydown', handler, options);
    }

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
    public keypress(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('keypress', handler, options);
    }

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
    public submit(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('submit', handler, options);
    }

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
    public contextmenu(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('contextmenu', handler, options);
    }

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
    public change(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('change', handler, options);
    }

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
    public mousedown(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('mousedown', handler, options);
    }

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
    public mousemove(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('mousemove', handler, options);
    }

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
    public mouseup(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('mouseup', handler, options);
    }

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
    public mouseenter(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('mouseenter', handler, options);
    }

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
    public mouseleave(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('mouseleave', handler, options);
    }

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
    public mouseout(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('mouseout', handler, options);
    }

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
    public mouseover(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('mouseover', handler, options);
    }

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
    public touchstart(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('touchstart', handler, options);
    }

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
    public touchend(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('touchend', handler, options);
    }

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
    public touchmove(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('touchmove', handler, options);
    }

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
    public touchcancel(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('touchcancel', handler, options);
    }

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
    public resize(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('resize', handler, options);
    }

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
    public scroll(handler?: DOMEventListener, options?: boolean | AddEventListenerOptions): this {
        return eventShortcut.bind(this)('scroll', handler, options);
    }

///////////////////////////////////////////////////////////////////////
// public: Copying

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
    public clone(withEvents = false, deep = false): DOM<TElement> {
        const self = this as DOMIterable<TElement> as DOM<TElement>;
        if (!isTypeElement(self)) {
            return self;
        }
        return self.map((index: number, el: TElement) => {
            return cloneElement(el as Node as Element, withEvents, deep) as Node as TElement;
        });
    }
}

setMixClassAttribute(DOMEvents, 'protoExtendsOnly');
