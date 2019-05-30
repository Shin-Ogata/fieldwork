/*!
 * @cdp/event-publisher 0.9.0
 *   pub/sub framework
 */
// Dependencies for this module:
//   ../@cdp/core-utils

declare module '@cdp/event-publisher' {
    export * from '@cdp/event-publisher/interfaces';
    export * from '@cdp/event-publisher/publisher';
    export * from '@cdp/event-publisher/broker';
}

declare module '@cdp/event-publisher/interfaces' {
    import { Arguments } from '@cdp/core-utils';
    export { Arguments };
    /**
        * @es Represents a disposable resource, such as the execution of an [[Observable]].
        * @ja [[Observable]] オブジェクトが返す購読情報コンテキストオブジェクト
        */
    export interface Subscription {
            /**
                * @es Status for receiving event
                * @ja 購読可否ステータス
                */
            readonly enable: boolean;
            /**
                * @es Disposes the resources held by the subscription
                * @ja 購読停止
                */
            unsubscribe(): void;
    }
    /**
        * @es Event supplyer interface definitions
        * @ja イベント供給を行うインターフェイス定義
        */
    export interface Observable<Event> {
            /**
                * @es Check whether this object has clients.
                * @ja クライアントが存在するか判定
                *
                * @param channel
                *  - `en` event channel key. (string | symbol)
                *  - `ja` イベントチャネルキー (string | symbol)
                * @param listener
                *  - `en` callback function of the `channel` corresponding.
                *  - `ja` `channel` に対応したコールバック関数
                */
            has<Channel extends keyof Event>(channel?: Channel, listener?: (...args: Arguments<Event[Channel]>) => any): boolean;
            /**
                * @es Returns registered channel keys.
                * @ja 登録されているチャネルキーを返却
                */
            channels(): (keyof Event)[];
            /**
                * @es Unsubscribe event(s).
                * @ja イベント購読解除
                *
                * @param channel
                *  - `en` target event channel key. (string | symbol)
                *         When not set this parameter, everything is released.
                *  - `ja` 対象のイベントチャネルキー (string | symbol)
                *         指定しない場合はすべて解除
                * @param listener
                *  - `en` callback function of the `channel` corresponding.
                *         When not set this parameter, all same `channel` listeners are released.
                *  - `ja` `channel` に対応したコールバック関数
                *         指定しない場合は同一 `channel` すべてを解除
                */
            off<Channel extends keyof Event>(channel?: Channel | Channel[], listener?: (...args: Arguments<Event[Channel]>) => any): void;
            /**
                * @es Subscrive event(s).
                * @ja イベント購読設定
                *
                * @param channel
                *  - `en` target event channel key. (string | symbol)
                *  - `ja` 対象のイベントチャネルキー (string | symbol)
                * @param listener
                *  - `en` callback function of the `channel` corresponding.
                *  - `ja` `channel` に対応したコールバック関数
                */
            on<Channel extends keyof Event>(channel: Channel | Channel[], listener: (...args: Arguments<Event[Channel]>) => any): Subscription;
            /**
                * @es Subscrive event(s) but it causes the bound callback to only fire once before being removed.
                * @ja 一度だけハンドリング可能なイベント購読設定
                *
                * @param channel
                *  - `en` target event channel key. (string | symbol)
                *  - `ja` 対象のイベントチャネルキー (string | symbol)
                * @param listener
                *  - `en` callback function of the `channel` corresponding.
                *  - `ja` `channel` に対応したコールバック関数
                */
            once<Channel extends keyof Event>(channel: Channel | Channel[], listener: (...args: Arguments<Event[Channel]>) => any): Subscription;
    }
}

declare module '@cdp/event-publisher/publisher' {
    import { Arguments } from '@cdp/core-utils';
    import { Subscription, Observable } from '@cdp/event-publisher/interfaces';
    /**
        * @es Eventing framework class with ensuring type-safe for TypeScript. <br>
        *     The client of this class can implement original Pub-Sub (Observer) design pattern.
        * @ja 型安全を保障するイベント登録・発行クラス <br>
        *     クライアントは本クラスを派生して独自の Pub-Sub (Observer) パターンを実装可能
        *
        * @example <br>
        *
        * ```ts
        * import { EventPublisher } from '@cdp/event-publisher';
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
        * class SamplePublisher extends EventPublisher<SampleEvent> {
        *   :
        *   someMethod(): void {
        *     this.publish('hoge', 100, 'test');       // OK. standard usage.
        *     this.publish('hoge', 100, true);         // NG. argument of type 'true' is not assignable
        *                                              //     to parameter of type 'string | undefined'.
        *     this.publish('hoge', 100);               // OK. all args to be optional automatically.
        *     this.publish('foo');                     // OK. standard usage.
        *     this.publish('foo', 100);                // NG. argument of type '100' is not assignable
        *                                              //     to parameter of type 'void | undefined'.
        *   }
        * }
        *
        * const sample = new SamplePublisher();
        *
        * sample.on('hoge', (a: number, b: string) => { ... });    // OK. standard usage.
        * sample.on('hoge', (a: number, b: boolean) => { ... });   // NG. types of parameters 'b'
        *                                                          //     and 'args_1' are incompatible.
        * sample.on('hoge', (a) => { ... });                       // OK. all args
        *                                                          //     to be optional automatically.
        * sample.on('hoge', (a, b, c) => { ... });                 // NG. expected 1-2 arguments,
        *                                                          //     but got 3.
        * ```
        */
    export abstract class EventPublisher<Event> implements Observable<Event> {
            /** constructor */
            constructor();
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
            protected publish<Channel extends keyof Event>(channel: Channel, ...args: Arguments<Partial<Event[Channel]>>): void;
            /**
                * @es Check whether this object has clients.
                * @ja クライアントが存在するか判定
                *
                * @param channel
                *  - `en` event channel key. (string | symbol)
                *  - `ja` イベントチャネルキー (string | symbol)
                * @param listener
                *  - `en` callback function of the `channel` corresponding.
                *  - `ja` `channel` に対応したコールバック関数
                */
            has<Channel extends keyof Event>(channel?: Channel, listener?: (...args: Arguments<Event[Channel]>) => any): boolean;
            /**
                * @es Returns registered channel keys.
                * @ja 登録されているチャネルキーを返却
                */
            channels(): (keyof Event)[];
            /**
                * @es Unsubscribe event(s).
                * @ja イベント購読解除
                *
                * @param channel
                *  - `en` target event channel key. (string | symbol)
                *         When not set this parameter, everything is released.
                *  - `ja` 対象のイベントチャネルキー (string | symbol)
                *         指定しない場合はすべて解除
                * @param listener
                *  - `en` callback function of the `channel` corresponding.
                *         When not set this parameter, all same `channel` listeners are released.
                *  - `ja` `channel` に対応したコールバック関数
                *         指定しない場合は同一 `channel` すべてを解除
                */
            off<Channel extends keyof Event>(channel?: Channel | Channel[], listener?: (...args: Arguments<Event[Channel]>) => any): void;
            /**
                * @es Subscrive event(s).
                * @ja イベント購読設定
                *
                * @param channel
                *  - `en` target event channel key. (string | symbol)
                *  - `ja` 対象のイベントチャネルキー (string | symbol)
                * @param listener
                *  - `en` callback function of the `channel` corresponding.
                *  - `ja` `channel` に対応したコールバック関数
                */
            on<Channel extends keyof Event>(channel: Channel | Channel[], listener: (...args: Arguments<Event[Channel]>) => any): Subscription;
            /**
                * @es Subscrive event(s) but it causes the bound callback to only fire once before being removed.
                * @ja 一度だけハンドリング可能なイベント購読設定
                *
                * @param channel
                *  - `en` target event channel key. (string | symbol)
                *  - `ja` 対象のイベントチャネルキー (string | symbol)
                * @param listener
                *  - `en` callback function of the `channel` corresponding.
                *  - `ja` `channel` に対応したコールバック関数
                */
            once<Channel extends keyof Event>(channel: Channel | Channel[], listener: (...args: Arguments<Event[Channel]>) => any): Subscription;
    }
}

declare module '@cdp/event-publisher/broker' {
    import { Arguments, Observable } from '@cdp/event-publisher/interfaces';
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
    export interface EventBroker<Event> extends Observable<Event> {
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
    };
}

