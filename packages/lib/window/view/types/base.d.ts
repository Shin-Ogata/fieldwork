import { EventSource } from '@cdp/events';
/**
 * @en Base class definition for view that manages the layout and a DOM events.
 * @ja レイアウト管理と DOM イベントの監視を行う View の基底クラス定義
 *
 * TODO:
 */
export declare abstract class View<TElement extends Node = HTMLElement, TEvent extends object = object> extends EventSource<TEvent> {
}
