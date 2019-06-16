/* eslint-disable @typescript-eslint/no-explicit-any */

import { Arguments, Observable } from './interfaces';
import { EventPublisher } from './publisher';

/**
 * @es Eventing framework object able to call `publish()` method from outside.
 * @ja 外部からの `publish()` を可能にしたイベント登録・発行クラス
 *
 * @example <br>
 *
 * ```ts
 * import { EventBroker } from '@cdp/event-publisher';
 *
 * // declare event interface
 * interface SampleEvent {
 *   hoge: [number, string];        // callback function's args type tuple
 * }
 *
 * const broker = new EventBroker<SampleEvent>();
 * broker.publish('hoge', 100, 'test');     // OK. standard usage.
 * broker.publish('hoge', 100, true);       // NG. argument of type 'true' is not assignable
 *                                          //     to parameter of type 'string | undefined'.
 * ```
 */
export interface EventBroker<Event extends {}> extends Observable<Event> {
    /**
     * @es Notify event to clients.
     * @ja event 発行
     *
     * @param channel
     *  - `en` event channel key. (string | symbol)
     *  - `ja` イベントチャネルキー (string | symbol)
     * @param args
     *  - `en` arguments for callback function of the `channel` corresponding.
     *  - `ja` `channel` に対応したコールバック関数に渡す引数
     */
    publish<Channel extends keyof Event>(channel: Channel, ...args: Arguments<Partial<Event[Channel]>>): void;
}

/**
 * @es Constructor of EventBroker
 * @ja EventBroker のコンストラクタ実体
 */
export const EventBroker: {
    readonly prototype: EventBroker<any>;
    new <T>(): EventBroker<T>;
} = EventPublisher as any;
