import {
    type UnknownFunction,
    type Arguments,
    isArray,
} from '@cdp/core-utils';
import type {
    Subscribable,
    Subscription,
    EventSchema,
} from './interfaces';

/** @internal */ const _context = Symbol('context');
/** @internal */ type SubscriptionMap = Map<UnknownFunction, Subscription>;
/** @internal */ type ListerMap       = Map<string, SubscriptionMap>;
/** @internal */ type SubscriptionSet = Set<Subscription>;
/** @internal */ type SubscribableMap = WeakMap<Subscribable, ListerMap>;

/** @internal Lisner 格納形式 */
interface Context {
    map: SubscribableMap;
    set: SubscriptionSet;
}

/** @internal register listener context */
function register(context: Context, target: Subscribable, channel: string | string[], listener: UnknownFunction): Subscription {
    const subscriptions: Subscription[] = [];

    const channels = isArray(channel) ? channel : [channel];
    for (const ch of channels) {
        const s = target.on(ch, listener);
        context.set.add(s);
        subscriptions.push(s);

        const listenerMap = context.map.get(target) ?? new Map<string, Map<UnknownFunction, Subscription>>();
        const map = listenerMap.get(ch) ?? new Map<UnknownFunction, Subscription>();
        map.set(listener, s);

        if (!listenerMap.has(ch)) {
            listenerMap.set(ch, map);
        }
        if (!context.map.has(target)) {
            context.map.set(target, listenerMap);
        }
    }

    return Object.freeze({
        get enable() {
            for (const s of subscriptions) {
                if (s.enable) {
                    return true;
                }
            }
            return false;
        },
        unsubscribe() {
            for (const s of subscriptions) {
                s.unsubscribe();
            }
        },
    });
}

/** @internal unregister listener context */
function unregister(context: Context, target?: Subscribable, channel?: string | string[], listener?: UnknownFunction): void {
    if (null != target) {
        target.off(channel, listener);

        const listenerMap = context.map.get(target);
        if (!listenerMap) {
            return;
        }
        if (null != channel) {
            const channels = isArray(channel) ? channel : [channel];
            for (const ch of channels) {
                const map = listenerMap.get(ch);
                if (!map) {
                    return;
                } else if (listener) {
                    const s = map.get(listener);
                    if (s) {
                        s.unsubscribe();
                        context.set.delete(s);
                    }
                    map.delete(listener);
                } else {
                    for (const s of map.values()) {
                        s.unsubscribe();
                        context.set.delete(s);
                    }
                }
            }
        } else {
            for (const map of listenerMap.values()) {
                for (const s of map.values()) {
                    s.unsubscribe();
                    context.set.delete(s);
                }
            }
        }
    } else {
        for (const s of context.set) {
            s.unsubscribe();
        }
        context.map = new WeakMap();
        context.set.clear();
    }
}

//__________________________________________________________________________________________________//

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
 * import { EventReceiver, EventBroker } from '@cdp/runtime';
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
export class EventReceiver {
    /** @internal */
    private readonly [_context]: Context;

    /** constructor */
    constructor() {
        this[_context] = { map: new WeakMap(), set: new Set() };
    }

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
    public listenTo<T extends Subscribable, Event extends EventSchema<T> = EventSchema<T>, Channel extends keyof Event = keyof Event>(
        target: T,
        channel: Channel | Channel[],
        listener: (...args: Arguments<Event[Channel]>) => unknown
    ): Subscription {
        return register(this[_context], target, channel as string, listener);
    }

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
    public listenToOnce<T extends Subscribable, Event extends EventSchema<T> = EventSchema<T>, Channel extends keyof Event = keyof Event>(
        target: T,
        channel: Channel | Channel[],
        listener: (...args: Arguments<Event[Channel]>) => unknown
    ): Subscription {
        const context = register(this[_context], target, channel as string, listener);
        const managed = target.on(channel, () => {
            unregister(this[_context], target, channel as string, listener);
            managed.unsubscribe();
        });
        return context;
    }

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
    public stopListening<T extends Subscribable, Event extends EventSchema<T> = EventSchema<T>, Channel extends keyof Event = keyof Event>(
        target?: T,
        channel?: Channel | Channel[],
        listener?: (...args: Arguments<Event[Channel]>) => unknown
    ): this {
        unregister(this[_context], target, channel as string, listener);
        return this;
    }
}
