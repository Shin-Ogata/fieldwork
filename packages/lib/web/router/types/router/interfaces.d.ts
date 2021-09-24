import { Subscribable } from '@cdp/events';
/**
 * @en The event definition fired in [[IRouter]].
 * @ja [[IRouter]] 内から発行されるイベント定義
 */
export interface RouterEvent {
    'will-change': [void];
    'changed': [void];
}
/**
 * @en Router common interface.
 * @ja Router 共通インターフェイス
 */
export interface IRouter<Event extends RouterEvent> extends Subscribable<Event> {
}
