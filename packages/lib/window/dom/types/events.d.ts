import { ElementBase } from './static';
import { DOMIterable } from './base';
export declare type DOMEventMap<T> = T extends Window ? WindowEventMap : T extends Document ? DocumentEventMap : T extends HTMLBodyElement ? HTMLBodyElementEventMap : T extends HTMLFrameSetElement ? HTMLFrameSetElementEventMap : T extends HTMLMarqueeElement ? HTMLMarqueeElementEventMap : T extends HTMLVideoElement ? HTMLVideoElementEventMap : T extends HTMLMediaElement ? HTMLMediaElementEventMap : T extends HTMLElement ? HTMLElementEventMap : T extends Element ? ElementEventMap : GlobalEventHandlersEventMap;
/**
 * @en Mixin base class which concentrated the event management of DOM class.
 * @ja DOM のイベント管理を集約した Mixin Base クラス
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
     */
    on<TEventMap extends DOMEventMap<TElement>>(type: keyof TEventMap | (keyof TEventMap)[], selector: string, listener: (event: TEventMap[keyof TEventMap], ...args: any[]) => void, options?: boolean | AddEventListenerOptions): this;
    on<TEventMap extends DOMEventMap<TElement>>(type: keyof TEventMap | (keyof TEventMap)[], listener: (event: TEventMap[keyof TEventMap], ...args: any[]) => void, options?: boolean | AddEventListenerOptions): this;
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
     */
    off<TEventMap extends DOMEventMap<TElement>>(type: keyof TEventMap | (keyof TEventMap)[], selector: string, listener?: (event: TEventMap[keyof TEventMap], ...args: any[]) => void, options?: boolean | AddEventListenerOptions): this;
    off<TEventMap extends DOMEventMap<TElement>>(type?: keyof TEventMap | (keyof TEventMap)[], listener?: (event: TEventMap[keyof TEventMap], ...args: any[]) => void, options?: boolean | AddEventListenerOptions): this;
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
     */
    once<TEventMap extends DOMEventMap<TElement>>(type: keyof TEventMap | (keyof TEventMap)[], selector: string, listener: (event: TEventMap[keyof TEventMap], ...args: any[]) => void, options?: boolean | AddEventListenerOptions): this;
    once<TEventMap extends DOMEventMap<TElement>>(type: keyof TEventMap | (keyof TEventMap)[], listener: (event: TEventMap[keyof TEventMap], ...args: any[]) => void, options?: boolean | AddEventListenerOptions): this;
    /**
     * @en Execute all handlers added to the matched elements for the specified event.
     * @ja 設定されているイベントハンドラに対してイベントを発行
     *
     * @param seed
     *  - `en` event name or event name array. / `Event` instance or `Event` instance array.
     *  - `ja` イベント名またはイベント名配列 / `Event` インスタンスまたは `Event` インスタンス配列
     * @param eventData
     *  - `en` optional sending data.
     *  - `ja` 送信する任意のデータ
     */
    trigger<TEventMap extends DOMEventMap<TElement>>(seed: keyof TEventMap | (keyof TEventMap)[] | Event | Event[] | (keyof TEventMap | Event)[], ...eventData: any[]): this;
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
    transitionEnd(callback: (event: TransitionEvent) => void, permanent?: boolean): this;
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
    animationEnd(callback: (event: AnimationEvent) => void, permanent?: boolean): this;
}
