import { Arguments } from '@cdp/core-utils';
import { Subscribable, Subscription, EventSchema } from './interfaces';
/**
 * @en The class to which the safe event register/unregister method is offered for the object which is a short life cycle than subscription target. <br>
 *     The advantage of using this form, instead of `on()`, is that `listenTo()` allows the object to keep track of the events,
 *     and they can be removed all at once later call `stopListening()`.
 * @ja 購読対象よりもライフサイクルが短いオブジェクトに対して, 安全なイベント登録/解除メソッドを提供するクラス <br>
 *     `on()` の代わりに `listenTo()` を使用することで, 後に `stopListening()` を1度呼ぶだけですべてのリスナーを解除できる利点がある.
 *
 * @example <br>
 *
 * ```ts
 * import { EventReceiver, EventBroker } from '@cdp/events';
 *
 * // declare event interface
 * interface SampleEvent {
 *   hoge: [number, string];        // callback function's args type tuple
 *   foo: [void];                   // no args
 *   hoo: void;                     // no args (same the upon)
 *   bar: [Error];                  // any class is available.
 *   baz: Error | Number;           // if only one argument, `[]` is not required.
 * }
 *
 * // declare client class
 * class SampleReceiver extends EventReceiver {
 *   constructor(broker: EventBroker<SampleEvent>) {
 *     super();
 *     this.listenTo(broker, 'hoge', (num: number, str: string) => { ... });
 *     this.listenTo(broker, 'bar', (e: Error) => { ... });
 *     this.listenTo(broker, ['foo', 'hoo'], () => { ... });
 *   }
 *
 *   release(): void {
 *     this.stopListening();
 *   }
 * }
 * ```
 *
 * or
 *
 * ```ts
 * const broker   = new EventBroker<SampleEvent>();
 * const receiver = new EventReceiver();
 *
 * receiver.listenTo(broker, 'hoge', (num: number, str: string) => { ... });
 * receiver.listenTo(broker, 'bar', (e: Error) => { ... });
 * receiver.listenTo(broker, ['foo', 'hoo'], () => { ... });
 *
 * receiver.stopListening();
 * ```
 */
export declare class EventReceiver {
    /** constructor */
    constructor();
    /**
     * @en Tell an object to listen to a particular event on an other object.
     * @ja 対象オブジェクトのイベント購読設定
     *
     * @param target
     *  - `en` event listening target object.
     *  - `ja` イベント購読対象のオブジェクト
     * @param channel
     *  - `en` target event channel key. (string | symbol)
     *  - `ja` 対象のイベントチャネルキー (string | symbol)
     * @param listener
     *  - `en` callback function of the `channel` corresponding.
     *  - `ja` `channel` に対応したコールバック関数
     */
    listenTo<T extends Subscribable, Event extends EventSchema<T> = EventSchema<T>, Channel extends keyof Event = keyof Event>(target: T, channel: Channel | Channel[], listener: (...args: Arguments<Event[Channel]>) => unknown): Subscription;
    /**
     * @en Just like listenTo, but causes the bound callback to fire only once before being removed.
     * @ja 対象オブジェクトの一度だけハンドリング可能なイベント購読設定
     *
     * @param target
     *  - `en` event listening target object.
     *  - `ja` イベント購読対象のオブジェクト
     * @param channel
     *  - `en` target event channel key. (string | symbol)
     *  - `ja` 対象のイベントチャネルキー (string | symbol)
     * @param listener
     *  - `en` callback function of the `channel` corresponding.
     *  - `ja` `channel` に対応したコールバック関数
     */
    listenToOnce<T extends Subscribable, Event extends EventSchema<T> = EventSchema<T>, Channel extends keyof Event = keyof Event>(target: T, channel: Channel | Channel[], listener: (...args: Arguments<Event[Channel]>) => unknown): Subscription;
    /**
     * @en Tell an object to stop listening to events.
     * @ja イベント購読解除
     *
     * @param target
     *  - `en` event listening target object.
     *         When not set this parameter, everything is released.
     *  - `ja` イベント購読対象のオブジェクト
     *         指定しない場合はすべてのリスナーを解除
     * @param channel
     *  - `en` target event channel key. (string | symbol)
     *         When not set this parameter, everything is released listeners from `target`.
     *  - `ja` 対象のイベントチャネルキー (string | symbol)
     *         指定しない場合は対象 `target` のリスナーをすべて解除
     * @param listener
     *  - `en` callback function of the `channel` corresponding.
     *         When not set this parameter, all same `channel` listeners are released.
     *  - `ja` `channel` に対応したコールバック関数
     *         指定しない場合は同一 `channel` すべてを解除
     */
    stopListening<T extends Subscribable, Event extends EventSchema<T> = EventSchema<T>, Channel extends keyof Event = keyof Event>(target?: T, channel?: Channel | Channel[], listener?: (...args: Arguments<Event[Channel]>) => unknown): this;
}
