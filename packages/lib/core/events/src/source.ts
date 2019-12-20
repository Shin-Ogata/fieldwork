/* eslint-disable @typescript-eslint/no-explicit-any */

import { mixins } from '@cdp/core-utils';
import { EventBroker } from './broker';
import { EventRevceiver } from './receiver';

/**
 * @en The class which have I/F of [[EventBroker]] and [[EventRevceiver]]. <br>
 *     `Events` class of `Backbone.js` equivalence.
 * @ja [[EventBroker]] と [[EventRevceiver]] の I/F をあわせ持つクラス <br>
 *     `Backbone.js` の `Events` クラス相当
 *
 * @example <br>
 *
 * ```ts
 * import { EventSource } from '@cdp/events';
 *
 * // declare event interface
 * interface TargetEvent {
 *   hoge: [number, string];        // callback function's args type tuple
 *   foo: [void];                   // no args
 *   hoo: void;                     // no args (same the upon)
 *   bar: [Error];                  // any class is available.
 *   baz: Error | Number;           // if only one argument, `[]` is not required.
 * }
 *
 * interface SampleEvent {
 *   fuga: [number, string];        // callback function's args type tuple
 * }
 *
 * // declare client class
 * class SampleSource extends EventSource<SampleEvent> {
 *   constructor(target: EventSource<TargetEvent>) {
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
 *
 * const sample = new SampleSource();
 *
 * sample.on('fuga', (a: number, b: string) => { ... });    // OK. standard usage.
 * sample.trigger('fuga', 100, 'test');                     // OK. standard usage.
 * ```
 */
type EventSourceBase<T extends {}> = EventBroker<T> & EventRevceiver;

/** @internal [[EventSource]] class */
class EventSource extends mixins(EventBroker, EventRevceiver) {
    constructor() {
        super();
        this.super(EventRevceiver);
    }
}

/**
 * @en Constructor of [[EventSource]]
 * @ja [[EventSource]] のコンストラクタ実体
 */
const EventSourceBase: {
    readonly prototype: EventSourceBase<any>;
    new <T>(): EventSourceBase<T>;
} = EventSource as any;

export { EventSourceBase as EventSource };
