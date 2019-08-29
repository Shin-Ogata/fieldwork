/* eslint-disable no-invalid-this, @typescript-eslint/no-explicit-any */
import { isFunction } from '@cdp/core-utils';
import { CustomEvent } from './ssr';
import {
    ElementBase,
    dom as $,
} from './static';
import {
    DOMIterable,
} from './base';

/** @internal */
interface DOMEventListner extends EventListener {
    origin?: EventListener;
}

/** @internal */
interface EventListenerHandler {
    listener: DOMEventListner;
    proxy: EventListener;
}

/** @internal */
interface BindInfo {
    registered: Set<EventListener>;
    handlers: EventListenerHandler[];
}

/** @internal */
interface BindEventContext {
    [cookie: string]: BindInfo;
}

/** @internal */
const enum Const {
    COOKIE_SEPARATOR = '|',
}

/** @internal */
const _manageContext = {
    eventDataMap: new WeakMap<Element, any[]>(),
    eventListeners: new WeakMap<Element, BindEventContext>(),
    liveEventListeners: new WeakMap<Element, BindEventContext>(),
};

/** @internal query event-data from element */
function queryEventData(elem: Element): Event[] {
    return _manageContext.eventDataMap.get(elem) || [];
}

/** @internal register event-data with element */
function registerEventData(elem: Element, eventData: any[]): void {
    _manageContext.eventDataMap.set(elem, eventData);
}

/** @internal delete event-data by element */
function deleteEventData(elem: Element): void {
    _manageContext.eventDataMap.delete(elem);
}

/** @internal convert event cookie from event name, selector, options */
function toCookie(event: string, selector: string, options: boolean | AddEventListenerOptions): string {
    return `${event}${Const.COOKIE_SEPARATOR}${JSON.stringify(options)}${Const.COOKIE_SEPARATOR}${selector}`;
}

/** @internal get listener handlers context by element and event */
function getEventListenersHandlers(elem: Element, event: string, selector: string, options: boolean | AddEventListenerOptions, ensure: boolean): BindInfo {
    const eventListeners = selector ? _manageContext.liveEventListeners : _manageContext.eventListeners;
    if (!eventListeners.has(elem)) {
        if (ensure) {
            eventListeners.set(elem, {});
        } else {
            return {
                registered: undefined!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
                handlers: [],
            };
        }
    }

    const context = eventListeners.get(elem) as BindEventContext;
    const cookie = toCookie(event, selector, options);
    if (!context[cookie]) {
        context[cookie] = {
            registered: new Set<EventListener>(),
            handlers: [],
        };
    }

    return context[cookie];
}

/** @internal register listener handlers context from element and event */
function registerEventListenerHandlers(
    elem: Element,
    events: string[],
    selector: string,
    listener: EventListener,
    proxy: EventListener,
    options: boolean | AddEventListenerOptions
): void {
    for (const event of events) {
        const { registered, handlers } = getEventListenersHandlers(elem, event, selector, options, true);
        if (registered && !registered.has(listener)) {
            registered.add(listener);
            handlers.push({
                listener,
                proxy,
            });
            elem.addEventListener && elem.addEventListener(event, proxy, options);
        }
    }
}

/** @internal query all event and handler by element, for all `off()` */
function extractAllHandlers(elem: Element): { event: string; handler: EventListener; options: any; }[] {
    const handlers: { event: string; handler: EventListener; options: any; }[] = [];

    const query = (context: BindEventContext | undefined): boolean => {
        if (context) {
            for (const cookie of Object.keys(context)) {
                const seed = cookie.split(Const.COOKIE_SEPARATOR);
                const event = seed[0];
                const options = JSON.parse(seed[1]);
                for (const handler of context[cookie].handlers) {
                    handlers.push({ event, handler: handler.proxy, options });
                }
            }
            return true;
        } else {
            return false;
        }
    };

    const { eventListeners, liveEventListeners } = _manageContext;
    query(eventListeners.get(elem)) && eventListeners.delete(elem);
    query(liveEventListeners.get(elem)) && liveEventListeners.delete(elem);

    return handlers;
}

//__________________________________________________________________________________________________//

/* eslint-disable @typescript-eslint/indent */
export type DOMEventMap<T>
    = T extends Window ? WindowEventMap
    : T extends Document ? DocumentEventMap
    : T extends HTMLBodyElement ? HTMLBodyElementEventMap
    : T extends HTMLFrameSetElement ? HTMLFrameSetElementEventMap
    : T extends HTMLMarqueeElement ? HTMLMarqueeElementEventMap
    : T extends HTMLVideoElement ? HTMLVideoElementEventMap
    : T extends HTMLMediaElement ? HTMLMediaElementEventMap
    : T extends HTMLElement ? HTMLElementEventMap
    : T extends Element ? ElementEventMap
    : GlobalEventHandlersEventMap;
/* eslint-enable @typescript-eslint/indent */

/**
 * @en Mixin base class which concentrated the event management of DOM class.
 * @ja DOM のイベント管理を集約した Mixin Base クラス
 */
export class DOMEvents<TElement extends ElementBase> implements DOMIterable<TElement> {

///////////////////////////////////////////////////////////////////////
// imprements: DOMIterable<T>

    readonly [n: number]: TElement;
    readonly length!: number;
    [Symbol.iterator]: () => Iterator<TElement>;
    entries!: () => IterableIterator<[number, TElement]>;

///////////////////////////////////////////////////////////////////////
// public:

    /**
     * @en Add event handler function to one or more events to the elements. (live event available)
     * @ja 要素に対して, 1つまたは複数のイベントハンドラを設定 (動的要素にも有効)
     *
     * @param type
     *  - `en` event name of event name array.
     *  - `ja` イベント名またはイベント名配列
     * @param selector
     *  - `en` A selector string to filter the descendants of the selected elements that trigger the event.
     *  - `ja` イベント発行元をフィルタリングするセレクタ文字列
     * @param listener
     *  - `en` callback function
     *  - `ja` コールバック関数
     * @param options
     */
    public on<TEventMap extends DOMEventMap<TElement>>(
        type: keyof TEventMap | (keyof TEventMap)[],
        selector: string,
        listener: (event: TEventMap[keyof TEventMap], ...args: any[]) => void,
        options?: boolean | AddEventListenerOptions
    ): this;
    public on<TEventMap extends DOMEventMap<TElement>>(
        type: keyof TEventMap | (keyof TEventMap)[],
        listener: (event: TEventMap[keyof TEventMap], ...args: any[]) => void,
        options?: boolean | AddEventListenerOptions
    ): this;
    public on<TEventMap extends DOMEventMap<TElement>>(...args: any[]): this {
        let [type, selector, listener, options] = args;
        if (isFunction(args[1])) {
            [type, listener, options] = args;
            selector = '';
        }
        if (!options) {
            options = false;
        }

        function handleLiveEvent(e: Event): void {
            const target = e.target as Element | null;
            if (!target) {
                return;
            }

            const eventData = queryEventData(target);
            if (!eventData.includes(e)) {
                eventData.unshift(e);
            }

            const $target = $(target);
            if ($target.is(selector)) {
                listener.apply(target, eventData);
            } else {
                for (const parent of $target.parents()) {
                    if ($(parent).is(selector)) {
                        listener.apply(parent, eventData);
                    }
                }
            }
        }

        function handleEvent(this: DOMEvents<TElement>, e: Event): void {
            const eventData = e && e.target ? queryEventData(e.target as Element) : [];
            if (!eventData.includes(e)) {
                eventData.unshift(e);
            }
            listener.apply(this, eventData);
        }

        const events: string[] = Array.isArray(type) ? type : [type];
        const handler = selector ? handleLiveEvent : handleEvent;

        for (const el of this as DOMEvents<Node> as DOMEvents<Element>) {
            registerEventListenerHandlers(el, events, selector, listener, handler, options);
        }

        return this;
    }

    /**
     * @en Remove event handler. The handler designated at [[on]] or [[once]] and that same condition are released. <br>
     *     If the method receives no arguments, all handlers are released.
     * @ja 設定されているイベントハンドラの解除. [[on]] または [[once]] と同条件で指定したものが解除される <br>
     *     引数が無い場合はすべてのハンドラが解除される.
     *
     * @param type
     *  - `en` event name of event name array.
     *  - `ja` イベント名またはイベント名配列
     * @param selector
     *  - `en` A selector string to filter the descendants of the selected elements that trigger the event.
     *  - `ja` イベント発行元をフィルタリングするセレクタ文字列
     * @param listener
     *  - `en` callback function
     *  - `ja` コールバック関数
     * @param options
     */
    public off<TEventMap extends DOMEventMap<TElement>>(
        type: keyof TEventMap | (keyof TEventMap)[],
        selector: string,
        listener?: (event: TEventMap[keyof TEventMap], ...args: any[]) => void,
        options?: boolean | AddEventListenerOptions
    ): this;
    public off<TEventMap extends DOMEventMap<TElement>>(
        type?: keyof TEventMap | (keyof TEventMap)[],
        listener?: (event: TEventMap[keyof TEventMap], ...args: any[]) => void,
        options?: boolean | AddEventListenerOptions
    ): this;
    public off<TEventMap extends DOMEventMap<TElement>>(...args: any[]): this {
        let [type, selector, listener, options] = args;
        if (isFunction(args[1])) {
            [type, listener, options] = args;
            selector = '';
        }
        if (!options) {
            options = false;
        }

        if (null == type) {
            for (const el of this as DOMEvents<Node> as DOMEvents<Element>) {
                const contexts = extractAllHandlers(el);
                for (const context of contexts) {
                    el.removeEventListener(context.event, context.handler, context.options);
                }
            }
        } else {
            const events: string[] = Array.isArray(type) ? type : [type];
            for (const event of events) {
                for (const el of this as DOMEvents<Node> as DOMEvents<Element>) {
                    const { registered, handlers } = getEventListenersHandlers(el, event, selector, options, false);
                    if (0 < handlers.length) {
                        for (let i = handlers.length - 1; i >= 0; i--) { // backward operation
                            const handler = handlers[i];
                            if (
                                (listener && handler.listener === listener) ||
                                (listener && handler.listener && handler.listener.origin && handler.listener.origin === listener) ||
                                (!listener)
                            ) {
                                el.removeEventListener(event, handler.proxy, options);
                                handlers.splice(i, 1);
                                registered.delete(handler.listener);
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
     *  - `en` event name of event name array.
     *  - `ja` イベント名またはイベント名配列
     * @param selector
     *  - `en` A selector string to filter the descendants of the selected elements that trigger the event.
     *  - `ja` イベント発行元をフィルタリングするセレクタ文字列
     * @param listener
     *  - `en` callback function
     *  - `ja` コールバック関数
     * @param options
     */
    public once<TEventMap extends DOMEventMap<TElement>>(
        type: keyof TEventMap | (keyof TEventMap)[],
        selector: string,
        listener: (event: TEventMap[keyof TEventMap], ...args: any[]) => void,
        options?: boolean | AddEventListenerOptions
    ): this;
    public once<TEventMap extends DOMEventMap<TElement>>(
        type: keyof TEventMap | (keyof TEventMap)[],
        listener: (event: TEventMap[keyof TEventMap], ...args: any[]) => void,
        options?: boolean | AddEventListenerOptions
    ): this;
    public once<TEventMap extends DOMEventMap<TElement>>(...args: any[]): this {
        let [type, selector, listener, options] = args;
        if (isFunction(args[1])) {
            [type, listener, options] = args;
            selector = '';
        }

        options = options || {};
        if (true === options) {
            options = { capture: true };
        }
        Object.assign(options, { once: true });

        const self = this;
        function onceHandler(this: DOMEvents<TElement>, ...eventArgs: any[]): void {
            listener.apply(this, eventArgs);
            self.off(type, selector, onceHandler, options);
            if (onceHandler.origin) {
                delete onceHandler.origin;
            }
        }
        onceHandler.origin = listener;
        return this.on(type, selector, onceHandler, options);
    }

    /**
     * @en Execute all handlers added to the matched elements for the specified event.
     * @ja 設定されているイベントハンドラに対してイベントを発行
     *
     * @param type
     *  - `en` event name of event name array.
     *  - `ja` イベント名またはイベント名配列
     * @param eventData
     *  - `en` optional sending data.
     *  - `ja` 送信する任意のデータ
     */
    public trigger<TEventMap extends DOMEventMap<TElement>>(type: keyof TEventMap | (keyof TEventMap)[], ...eventData: any[]): this {
        const events = Array.isArray(type) ? type : [type];
        for (const event of events) {
            for (const el of this as DOMEvents<Node> as DOMEvents<Element>) {
                const e = new CustomEvent(event as string, {
                    detail: eventData,
                    bubbles: true,
                    cancelable: true,
                });
                registerEventData(el, eventData);
                el.dispatchEvent(e);
                deleteEventData(el);
            }
        }
        return this;
    }

    /**
     * @en Short cut for [[once]]('transitionend').
     * @ja [[once]]('transitionend') のユーティリティ
     *
     * @param callback
     *  - `en` `transitionend` handler.
     *  - `ja` `transitionend` ハンドラ
     * @param permanent
     *  - `en` if set `true`, callback keep living until elements removed.
     *  - `ja` `true` を設定した場合, 要素が削除されるまでコールバックが有効
     */
    public transitionEnd(callback: (event: TransitionEvent) => void, permanent = false): this {
        const self = this as DOMEvents<Node> as DOMEvents<HTMLElement>;
        function fireCallBack(this: Element, e: TransitionEvent): void {
            if (e.target !== this) {
                return;
            }
            callback.call(this, e);
            if (!permanent) {
                self.off('transitionend', fireCallBack);
            }
        }
        if (callback) {
            self.on('transitionend', fireCallBack);
        }
        return this;
    }

    /**
     * @en Short cut for [[once]]('animationend').
     * @ja [[once]]('animationend') のユーティリティ
     *
     * @param callback
     *  - `en` `animationend` handler.
     *  - `ja` `animationend` ハンドラ
     * @param permanent
     *  - `en` if set `true`, callback keep living until elements removed.
     *  - `ja` `true` を設定した場合, 要素が削除されるまでコールバックが有効
     */
    public animationEnd(callback: (event: AnimationEvent) => void, permanent = false): this {
        const self = this as DOMEvents<Node> as DOMEvents<HTMLElement>;
        function fireCallBack(this: Element, e: AnimationEvent): void {
            if (e.target !== this) {
                return;
            }
            callback.call(this, e);
            if (!permanent) {
                self.off('animationend', fireCallBack);
            }
        }
        if (callback) {
            self.on('animationend', fireCallBack);
        }
        return this;
    }
}

/*
const handler = (e: UIEvent) => { };
const p = new DOMEvents<HTMLElement>();
p.on('abort', handler);
p.on(['abort', 'animationend'], 'div', handler);
p.on('fuga', handler);

interface Hoge extends DOMEventMap<HTMLElement> {
    hoge: number;
}

p.on<Hoge>('hoge', handler);
p.on<Hoge>('hoge', '.child', handler);
*/
