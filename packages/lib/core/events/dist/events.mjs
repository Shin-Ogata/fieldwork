/*!
 * @cdp/events 0.9.0
 *   pub/sub framework
 */

import { verify, isArray, isString, isSymbol, className, mixins } from '@cdp/core-utils';

/* eslint-disable
   @typescript-eslint/no-explicit-any
 */
/** @internal Lisner の弱参照 */
const _mapListeners = new WeakMap();
/** @internal LisnerMap の取得 */
function listeners(instance) {
    if (!_mapListeners.has(instance)) {
        throw new TypeError('This is not a valid EventPublisher.');
    }
    return _mapListeners.get(instance);
}
/** @internal Channel の型検証 */
function validChannel(channel) {
    if (isString(channel) || isSymbol(channel)) {
        return;
    }
    throw new TypeError(`Type of ${className(channel)} is not a valid channel.`);
}
/** @internal Listener の型検証 */
function validListener(listener) {
    if (null != listener) {
        verify('typeOf', 'function', listener);
    }
    return listener;
}
/** @internal event 発行 */
function triggerEvent(map, channel, original, ...args) {
    const list = map.get(channel);
    if (!list) {
        return;
    }
    for (const listener of list) {
        try {
            const eventArgs = original ? [original, ...args] : args;
            const handled = listener(...eventArgs);
            // if received 'true', stop delegation.
            if (true === handled) {
                break;
            }
        }
        catch (e) {
            Promise.reject(e);
        }
    }
}
//__________________________________________________________________________________________________//
/**
 * @en Eventing framework class with ensuring type-safe for TypeScript. <br>
 *     The client of this class can implement original Pub-Sub (Observer) design pattern.
 * @ja 型安全を保障するイベント登録・発行クラス <br>
 *     クライアントは本クラスを派生して独自の Pub-Sub (Observer) パターンを実装可能
 *
 * @example <br>
 *
 * ```ts
 * import { EventPublisher } from '@cdp/events';
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
class EventPublisher {
    /** constructor */
    constructor() {
        verify('instanceOf', EventPublisher, this);
        _mapListeners.set(this, new Map());
    }
    /**
     * @en Notify event to clients.
     * @ja event 発行
     *
     * @param channel
     *  - `en` event channel key. (string | symbol)
     *  - `ja` イベントチャネルキー (string | symbol)
     * @param args
     *  - `en` arguments for callback function of the `channel` corresponding.
     *  - `ja` `channel` に対応したコールバック関数に渡す引数
     */
    publish(channel, ...args) {
        const map = listeners(this);
        validChannel(channel);
        triggerEvent(map, channel, undefined, ...args);
        // trigger for all handler
        if ('*' !== channel) {
            triggerEvent(map, '*', channel, ...args);
        }
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: Subscribable<Event>
    /**
     * @en Check whether this object has clients.
     * @ja クライアントが存在するか判定
     *
     * @param channel
     *  - `en` event channel key. (string | symbol)
     *  - `ja` イベントチャネルキー (string | symbol)
     * @param listener
     *  - `en` callback function of the `channel` corresponding.
     *  - `ja` `channel` に対応したコールバック関数
     */
    hasListener(channel, listener) {
        const map = listeners(this);
        if (null == channel) {
            return map.size > 0;
        }
        validChannel(channel);
        if (null == listener) {
            return map.has(channel);
        }
        validListener(listener);
        const list = map.get(channel);
        return list ? list.has(listener) : false;
    }
    /**
     * @en Returns registered channel keys.
     * @ja 登録されているチャネルキーを返却
     */
    channels() {
        return [...listeners(this).keys()];
    }
    /**
     * @en Subscrive event(s).
     * @ja イベント購読設定
     *
     * @param channel
     *  - `en` target event channel key. (string | symbol)
     *  - `ja` 対象のイベントチャネルキー (string | symbol)
     * @param listener
     *  - `en` callback function of the `channel` corresponding.
     *  - `ja` `channel` に対応したコールバック関数
     */
    on(channel, listener) {
        const map = listeners(this);
        validListener(listener);
        const channels = isArray(channel) ? channel : [channel];
        for (const ch of channels) {
            validChannel(ch);
            map.has(ch) ? map.get(ch).add(listener) : map.set(ch, new Set([listener])); // eslint-disable-line @typescript-eslint/no-non-null-assertion
        }
        return Object.freeze({
            get enable() {
                for (const ch of channels) {
                    const list = map.get(ch);
                    if (!list || !list.has(listener)) {
                        this.unsubscribe();
                        return false;
                    }
                }
                return true;
            },
            unsubscribe() {
                for (const ch of channels) {
                    const list = map.get(ch);
                    if (list) {
                        list.delete(listener);
                        list.size > 0 || map.delete(ch);
                    }
                }
            },
        });
    }
    /**
     * @en Subscrive event(s) but it causes the bound callback to only fire once before being removed.
     * @ja 一度だけハンドリング可能なイベント購読設定
     *
     * @param channel
     *  - `en` target event channel key. (string | symbol)
     *  - `ja` 対象のイベントチャネルキー (string | symbol)
     * @param listener
     *  - `en` callback function of the `channel` corresponding.
     *  - `ja` `channel` に対応したコールバック関数
     */
    once(channel, listener) {
        const context = this.on(channel, listener);
        const managed = this.on(channel, () => {
            context.unsubscribe();
            managed.unsubscribe();
        });
        return context;
    }
    /**
     * @en Unsubscribe event(s).
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
    off(channel, listener) {
        const map = listeners(this);
        if (null == channel) {
            map.clear();
            return this;
        }
        const channels = isArray(channel) ? channel : [channel];
        const callback = validListener(listener);
        for (const ch of channels) {
            validChannel(ch);
            if (null == callback) {
                map.delete(ch);
                continue;
            }
            else {
                const list = map.get(ch);
                if (list) {
                    list.delete(callback);
                    list.size > 0 || map.delete(ch);
                }
            }
        }
        return this;
    }
}

/* eslint-disable
   @typescript-eslint/no-explicit-any
 , @typescript-eslint/unbound-method
 */
/**
 * @en Constructor of [[EventBroker]]
 * @ja [[EventBroker]] のコンストラクタ実体
 */
const EventBroker = EventPublisher;
EventBroker.prototype.trigger = EventPublisher.prototype.publish;

/* eslint-disable
   @typescript-eslint/no-explicit-any
 */
/** @internal */
const _context = Symbol('context');
/** @internal register listener context */
function register(context, target, channel, listener) {
    const subscriptions = [];
    const channels = isArray(channel) ? channel : [channel];
    for (const ch of channels) {
        const s = target.on(ch, listener);
        context.set.add(s);
        subscriptions.push(s);
        const listenerMap = context.map.get(target) || new Map();
        const map = listenerMap.get(ch) || new Map();
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
function unregister(context, target, channel, listener) {
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
                }
                else if (listener) {
                    const s = map.get(listener);
                    if (s) {
                        s.unsubscribe();
                        context.set.delete(s);
                    }
                    map.delete(listener);
                }
                else {
                    for (const s of map.values()) {
                        s.unsubscribe();
                        context.set.delete(s);
                    }
                }
            }
        }
        else {
            for (const map of listenerMap.values()) {
                for (const s of map.values()) {
                    s.unsubscribe();
                    context.set.delete(s);
                }
            }
        }
    }
    else {
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
class EventRevceiver {
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
    listenTo(target, channel, listener) {
        return register(this[_context], target, channel, listener);
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
    listenToOnce(target, channel, listener) {
        const context = register(this[_context], target, channel, listener);
        const managed = target.on(channel, () => {
            unregister(this[_context], target, channel, listener);
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
    stopListening(target, channel, listener) {
        unregister(this[_context], target, channel, listener);
        return this;
    }
}

/* eslint-disable
   @typescript-eslint/no-explicit-any
 */
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
const EventSourceBase = EventSource;

export { EventBroker, EventPublisher, EventRevceiver, EventSourceBase as EventSource };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRzLm1qcyIsInNvdXJjZXMiOlsicHVibGlzaGVyLnRzIiwiYnJva2VyLnRzIiwicmVjZWl2ZXIudHMiLCJzb3VyY2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQge1xuICAgIEFyZ3VtZW50cyxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIGlzU3ltYm9sLFxuICAgIGNsYXNzTmFtZSxcbiAgICB2ZXJpZnksXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIEV2ZW50QWxsLFxuICAgIFN1YnNjcmlwdGlvbixcbiAgICBTdWJzY3JpYmFibGUsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgTGlzbmVyIOagvOe0jeW9ouW8jyAqL1xudHlwZSBMaXN0ZW5lcnNNYXA8VD4gPSBNYXA8a2V5b2YgVCwgU2V0PCguLi5hcmdzOiBUW2tleW9mIFRdW10pID0+IHVua25vd24+PjtcblxuLyoqIEBpbnRlcm5hbCBMaXNuZXIg44Gu5byx5Y+C54WnICovXG5jb25zdCBfbWFwTGlzdGVuZXJzID0gbmV3IFdlYWtNYXA8RXZlbnRQdWJsaXNoZXI8YW55PiwgTGlzdGVuZXJzTWFwPGFueT4+KCk7XG5cbi8qKiBAaW50ZXJuYWwgTGlzbmVyTWFwIOOBruWPluW+lyAqL1xuZnVuY3Rpb24gbGlzdGVuZXJzPFQ+KGluc3RhbmNlOiBFdmVudFB1Ymxpc2hlcjxUPik6IExpc3RlbmVyc01hcDxUPiB7XG4gICAgaWYgKCFfbWFwTGlzdGVuZXJzLmhhcyhpbnN0YW5jZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhpcyBpcyBub3QgYSB2YWxpZCBFdmVudFB1Ymxpc2hlci4nKTtcbiAgICB9XG4gICAgcmV0dXJuIF9tYXBMaXN0ZW5lcnMuZ2V0KGluc3RhbmNlKSBhcyBMaXN0ZW5lcnNNYXA8VD47XG59XG5cbi8qKiBAaW50ZXJuYWwgQ2hhbm5lbCDjga7lnovmpJzoqLwgKi9cbmZ1bmN0aW9uIHZhbGlkQ2hhbm5lbChjaGFubmVsOiB1bmtub3duKTogdm9pZCB8IG5ldmVyIHtcbiAgICBpZiAoaXNTdHJpbmcoY2hhbm5lbCkgfHwgaXNTeW1ib2woY2hhbm5lbCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBUeXBlIG9mICR7Y2xhc3NOYW1lKGNoYW5uZWwpfSBpcyBub3QgYSB2YWxpZCBjaGFubmVsLmApO1xufVxuXG4vKiogQGludGVybmFsIExpc3RlbmVyIOOBruWei+aknOiovCAqL1xuZnVuY3Rpb24gdmFsaWRMaXN0ZW5lcihsaXN0ZW5lcj86ICguLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd24pOiBhbnkgfCBuZXZlciB7XG4gICAgaWYgKG51bGwgIT0gbGlzdGVuZXIpIHtcbiAgICAgICAgdmVyaWZ5KCd0eXBlT2YnLCAnZnVuY3Rpb24nLCBsaXN0ZW5lcik7XG4gICAgfVxuICAgIHJldHVybiBsaXN0ZW5lcjtcbn1cblxuLyoqIEBpbnRlcm5hbCBldmVudCDnmbrooYwgKi9cbmZ1bmN0aW9uIHRyaWdnZXJFdmVudDxFdmVudCwgQ2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihcbiAgICBtYXA6IExpc3RlbmVyc01hcDxFdmVudD4sXG4gICAgY2hhbm5lbDogQ2hhbm5lbCxcbiAgICBvcmlnaW5hbDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj5cbik6IHZvaWQge1xuICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoYW5uZWwpO1xuICAgIGlmICghbGlzdCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAoY29uc3QgbGlzdGVuZXIgb2YgbGlzdCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZXZlbnRBcmdzID0gb3JpZ2luYWwgPyBbb3JpZ2luYWwsIC4uLmFyZ3NdIDogYXJncztcbiAgICAgICAgICAgIGNvbnN0IGhhbmRsZWQgPSBsaXN0ZW5lciguLi5ldmVudEFyZ3MpO1xuICAgICAgICAgICAgLy8gaWYgcmVjZWl2ZWQgJ3RydWUnLCBzdG9wIGRlbGVnYXRpb24uXG4gICAgICAgICAgICBpZiAodHJ1ZSA9PT0gaGFuZGxlZCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBQcm9taXNlLnJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEV2ZW50aW5nIGZyYW1ld29yayBjbGFzcyB3aXRoIGVuc3VyaW5nIHR5cGUtc2FmZSBmb3IgVHlwZVNjcmlwdC4gPGJyPlxuICogICAgIFRoZSBjbGllbnQgb2YgdGhpcyBjbGFzcyBjYW4gaW1wbGVtZW50IG9yaWdpbmFsIFB1Yi1TdWIgKE9ic2VydmVyKSBkZXNpZ24gcGF0dGVybi5cbiAqIEBqYSDlnovlronlhajjgpLkv53pmpzjgZnjgovjgqTjg5njg7Pjg4jnmbvpjLLjg7vnmbrooYzjgq/jg6njgrkgPGJyPlxuICogICAgIOOCr+ODqeOCpOOCouODs+ODiOOBr+acrOOCr+ODqeOCueOCkua0vueUn+OBl+OBpueLrOiHquOBriBQdWItU3ViIChPYnNlcnZlcikg44OR44K/44O844Oz44KS5a6f6KOF5Y+v6IO9XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbiAqXG4gKiAvLyBkZWNsYXJlIGV2ZW50IGludGVyZmFjZVxuICogaW50ZXJmYWNlIFNhbXBsZUV2ZW50IHtcbiAqICAgaG9nZTogW251bWJlciwgc3RyaW5nXTsgICAgICAgIC8vIGNhbGxiYWNrIGZ1bmN0aW9uJ3MgYXJncyB0eXBlIHR1cGxlXG4gKiAgIGZvbzogW3ZvaWRdOyAgICAgICAgICAgICAgICAgICAvLyBubyBhcmdzXG4gKiAgIGhvbzogdm9pZDsgICAgICAgICAgICAgICAgICAgICAvLyBubyBhcmdzIChzYW1lIHRoZSB1cG9uKVxuICogICBiYXI6IFtFcnJvcl07ICAgICAgICAgICAgICAgICAgLy8gYW55IGNsYXNzIGlzIGF2YWlsYWJsZS5cbiAqICAgYmF6OiBFcnJvciB8IE51bWJlcjsgICAgICAgICAgIC8vIGlmIG9ubHkgb25lIGFyZ3VtZW50LCBgW11gIGlzIG5vdCByZXF1aXJlZC5cbiAqIH1cbiAqXG4gKiAvLyBkZWNsYXJlIGNsaWVudCBjbGFzc1xuICogY2xhc3MgU2FtcGxlUHVibGlzaGVyIGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8U2FtcGxlRXZlbnQ+IHtcbiAqICAgOlxuICogICBzb21lTWV0aG9kKCk6IHZvaWQge1xuICogICAgIHRoaXMucHVibGlzaCgnaG9nZScsIDEwMCwgJ3Rlc3QnKTsgICAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogICAgIHRoaXMucHVibGlzaCgnaG9nZScsIDEwMCwgdHJ1ZSk7ICAgICAgICAgLy8gTkcuIGFyZ3VtZW50IG9mIHR5cGUgJ3RydWUnIGlzIG5vdCBhc3NpZ25hYmxlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdG8gcGFyYW1ldGVyIG9mIHR5cGUgJ3N0cmluZyB8IHVuZGVmaW5lZCcuXG4gKiAgICAgdGhpcy5wdWJsaXNoKCdob2dlJywgMTAwKTsgICAgICAgICAgICAgICAvLyBPSy4gYWxsIGFyZ3MgdG8gYmUgb3B0aW9uYWwgYXV0b21hdGljYWxseS5cbiAqICAgICB0aGlzLnB1Ymxpc2goJ2ZvbycpOyAgICAgICAgICAgICAgICAgICAgIC8vIE9LLiBzdGFuZGFyZCB1c2FnZS5cbiAqICAgICB0aGlzLnB1Ymxpc2goJ2ZvbycsIDEwMCk7ICAgICAgICAgICAgICAgIC8vIE5HLiBhcmd1bWVudCBvZiB0eXBlICcxMDAnIGlzIG5vdCBhc3NpZ25hYmxlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdG8gcGFyYW1ldGVyIG9mIHR5cGUgJ3ZvaWQgfCB1bmRlZmluZWQnLlxuICogICB9XG4gKiB9XG4gKlxuICogY29uc3Qgc2FtcGxlID0gbmV3IFNhbXBsZVB1Ymxpc2hlcigpO1xuICpcbiAqIHNhbXBsZS5vbignaG9nZScsIChhOiBudW1iZXIsIGI6IHN0cmluZykgPT4geyAuLi4gfSk7ICAgIC8vIE9LLiBzdGFuZGFyZCB1c2FnZS5cbiAqIHNhbXBsZS5vbignaG9nZScsIChhOiBudW1iZXIsIGI6IGJvb2xlYW4pID0+IHsgLi4uIH0pOyAgIC8vIE5HLiB0eXBlcyBvZiBwYXJhbWV0ZXJzICdiJ1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIGFuZCAnYXJnc18xJyBhcmUgaW5jb21wYXRpYmxlLlxuICogc2FtcGxlLm9uKCdob2dlJywgKGEpID0+IHsgLi4uIH0pOyAgICAgICAgICAgICAgICAgICAgICAgLy8gT0suIGFsbCBhcmdzXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdG8gYmUgb3B0aW9uYWwgYXV0b21hdGljYWxseS5cbiAqIHNhbXBsZS5vbignaG9nZScsIChhLCBiLCBjKSA9PiB7IC4uLiB9KTsgICAgICAgICAgICAgICAgIC8vIE5HLiBleHBlY3RlZCAxLTIgYXJndW1lbnRzLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIGJ1dCBnb3QgMy5cbiAqIGBgYFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRXZlbnRQdWJsaXNoZXI8RXZlbnQgZXh0ZW5kcyB7fT4gaW1wbGVtZW50cyBTdWJzY3JpYmFibGU8RXZlbnQ+IHtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBFdmVudFB1Ymxpc2hlciwgdGhpcyk7XG4gICAgICAgIF9tYXBMaXN0ZW5lcnMuc2V0KHRoaXMsIG5ldyBNYXAoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE5vdGlmeSBldmVudCB0byBjbGllbnRzLlxuICAgICAqIEBqYSBldmVudCDnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgavmuKHjgZnlvJXmlbBcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgcHVibGlzaDxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwsIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICB2YWxpZENoYW5uZWwoY2hhbm5lbCk7XG4gICAgICAgIHRyaWdnZXJFdmVudChtYXAsIGNoYW5uZWwsIHVuZGVmaW5lZCwgLi4uYXJncyk7XG4gICAgICAgIC8vIHRyaWdnZXIgZm9yIGFsbCBoYW5kbGVyXG4gICAgICAgIGlmICgnKicgIT09IGNoYW5uZWwpIHtcbiAgICAgICAgICAgIHRyaWdnZXJFdmVudChtYXAgYXMgYW55IGFzIExpc3RlbmVyc01hcDxFdmVudEFsbD4sICcqJywgY2hhbm5lbCBhcyBzdHJpbmcsIC4uLmFyZ3MpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogU3Vic2NyaWJhYmxlPEV2ZW50PlxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHdoZXRoZXIgdGhpcyBvYmplY3QgaGFzIGNsaWVudHMuXG4gICAgICogQGphIOOCr+ODqeOCpOOCouODs+ODiOOBjOWtmOWcqOOBmeOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgaGFzTGlzdGVuZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsPzogQ2hhbm5lbCwgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lcnModGhpcyk7XG4gICAgICAgIGlmIChudWxsID09IGNoYW5uZWwpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXAuc2l6ZSA+IDA7XG4gICAgICAgIH1cbiAgICAgICAgdmFsaWRDaGFubmVsKGNoYW5uZWwpO1xuICAgICAgICBpZiAobnVsbCA9PSBsaXN0ZW5lcikge1xuICAgICAgICAgICAgcmV0dXJuIG1hcC5oYXMoY2hhbm5lbCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFsaWRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoYW5uZWwpO1xuICAgICAgICByZXR1cm4gbGlzdCA/IGxpc3QuaGFzKGxpc3RlbmVyKSA6IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHJlZ2lzdGVyZWQgY2hhbm5lbCBrZXlzLlxuICAgICAqIEBqYSDnmbvpjLLjgZXjgozjgabjgYTjgovjg4Hjg6Pjg43jg6vjgq3jg7zjgpLov5TljbRcbiAgICAgKi9cbiAgICBjaGFubmVscygpOiAoa2V5b2YgRXZlbnQpW10ge1xuICAgICAgICByZXR1cm4gWy4uLmxpc3RlbmVycyh0aGlzKS5rZXlzKCldO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICB2YWxpZExpc3RlbmVyKGxpc3RlbmVyKTtcblxuICAgICAgICBjb25zdCBjaGFubmVscyA9IGlzQXJyYXkoY2hhbm5lbCkgPyBjaGFubmVsIDogW2NoYW5uZWxdO1xuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgICAgICB2YWxpZENoYW5uZWwoY2gpO1xuICAgICAgICAgICAgbWFwLmhhcyhjaCkgPyBtYXAuZ2V0KGNoKSEuYWRkKGxpc3RlbmVyKSA6IG1hcC5zZXQoY2gsIG5ldyBTZXQoW2xpc3RlbmVyXSkpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3QuZnJlZXplKHtcbiAgICAgICAgICAgIGdldCBlbmFibGUoKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbGlzdCB8fCAhbGlzdC5oYXMobGlzdGVuZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdW5zdWJzY3JpYmUoKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsaXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0LmRlbGV0ZShsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0LnNpemUgPiAwIHx8IG1hcC5kZWxldGUoY2gpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKSBidXQgaXQgY2F1c2VzIHRoZSBib3VuZCBjYWxsYmFjayB0byBvbmx5IGZpcmUgb25jZSBiZWZvcmUgYmVpbmcgcmVtb3ZlZC5cbiAgICAgKiBAamEg5LiA5bqm44Gg44GR44OP44Oz44OJ44Oq44Oz44Kw5Y+v6IO944Gq44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb25jZTxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLm9uKGNoYW5uZWwsIGxpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgbWFuYWdlZCA9IHRoaXMub24oY2hhbm5lbCwgKCkgPT4ge1xuICAgICAgICAgICAgY29udGV4dC51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgbWFuYWdlZC51bnN1YnNjcmliZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGV2ZXJ5dGhpbmcgaXMgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuino+mZpFxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WQjOS4gCBgY2hhbm5lbGAg44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbD86IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICBpZiAobnVsbCA9PSBjaGFubmVsKSB7XG4gICAgICAgICAgICBtYXAuY2xlYXIoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2hhbm5lbHMgPSBpc0FycmF5KGNoYW5uZWwpID8gY2hhbm5lbCA6IFtjaGFubmVsXTtcbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSB2YWxpZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgdmFsaWRDaGFubmVsKGNoKTtcbiAgICAgICAgICAgIGlmIChudWxsID09IGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgbWFwLmRlbGV0ZShjaCk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoKTtcbiAgICAgICAgICAgICAgICBpZiAobGlzdCkge1xuICAgICAgICAgICAgICAgICAgICBsaXN0LmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgICAgIGxpc3Quc2l6ZSA+IDAgfHwgbWFwLmRlbGV0ZShjaCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAsIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICovXG5cbmltcG9ydCB7IEFyZ3VtZW50cyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpYmFibGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICcuL3B1Ymxpc2hlcic7XG5cbi8vIHJlLWV4cG9ydFxuZXhwb3J0IHsgQXJndW1lbnRzIGFzIEV2ZW50QXJndW1lbnRzIH07XG5cbi8qKlxuICogQGVuIEV2ZW50aW5nIGZyYW1ld29yayBvYmplY3QgYWJsZSB0byBjYWxsIGBwdWJsaXNoKClgIG1ldGhvZCBmcm9tIG91dHNpZGUuXG4gKiBAamEg5aSW6YOo44GL44KJ44GuIGBwdWJsaXNoKClgIOOCkuWPr+iDveOBq+OBl+OBn+OCpOODmeODs+ODiOeZu+mMsuODu+eZuuihjOOCr+ODqeOCuVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG4gKlxuICogLy8gZGVjbGFyZSBldmVudCBpbnRlcmZhY2VcbiAqIGludGVyZmFjZSBTYW1wbGVFdmVudCB7XG4gKiAgIGhvZ2U6IFtudW1iZXIsIHN0cmluZ107ICAgICAgICAvLyBjYWxsYmFjayBmdW5jdGlvbidzIGFyZ3MgdHlwZSB0dXBsZVxuICogfVxuICpcbiAqIGNvbnN0IGJyb2tlciA9IG5ldyBFdmVudEJyb2tlcjxTYW1wbGVFdmVudD4oKTtcbiAqIGJyb2tlci50cmlnZ2VyKCdob2dlJywgMTAwLCAndGVzdCcpOyAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogYnJva2VyLnRyaWdnZXIoJ2hvZ2UnLCAxMDAsIHRydWUpOyAgICAgICAvLyBORy4gYXJndW1lbnQgb2YgdHlwZSAndHJ1ZScgaXMgbm90IGFzc2lnbmFibGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIHRvIHBhcmFtZXRlciBvZiB0eXBlICdzdHJpbmcgfCB1bmRlZmluZWQnLlxuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRCcm9rZXI8RXZlbnQgZXh0ZW5kcyB7fT4gZXh0ZW5kcyBTdWJzY3JpYmFibGU8RXZlbnQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gTm90aWZ5IGV2ZW50IHRvIGNsaWVudHMuXG4gICAgICogQGphIGV2ZW50IOeZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGFyZ3VtZW50cyBmb3IgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsOOBq+a4oeOBmeW8leaVsFxuICAgICAqL1xuICAgIHRyaWdnZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsLCAuLi5hcmdzOiBBcmd1bWVudHM8UGFydGlhbDxFdmVudFtDaGFubmVsXT4+KTogdm9pZDtcbn1cblxuLyoqXG4gKiBAZW4gQ29uc3RydWN0b3Igb2YgW1tFdmVudEJyb2tlcl1dXG4gKiBAamEgW1tFdmVudEJyb2tlcl1dIOOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wun+S9k1xuICovXG5leHBvcnQgY29uc3QgRXZlbnRCcm9rZXI6IHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IEV2ZW50QnJva2VyPGFueT47XG4gICAgbmV3IDxUPigpOiBFdmVudEJyb2tlcjxUPjtcbn0gPSBFdmVudFB1Ymxpc2hlciBhcyBhbnk7XG5cbkV2ZW50QnJva2VyLnByb3RvdHlwZS50cmlnZ2VyID0gKEV2ZW50UHVibGlzaGVyLnByb3RvdHlwZSBhcyBhbnkpLnB1Ymxpc2g7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7IEFyZ3VtZW50cywgaXNBcnJheSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIFN1YnNjcmliYWJsZSxcbiAgICBTdWJzY3JpcHRpb24sXG4gICAgRXZlbnRTY2hlbWEsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9jb250ZXh0ID0gU3ltYm9sKCdjb250ZXh0Jyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgU3Vic2NyaXB0aW9uTWFwID0gTWFwPEZ1bmN0aW9uLCBTdWJzY3JpcHRpb24+O1xuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBMaXN0ZXJNYXAgICAgICAgPSBNYXA8c3RyaW5nLCBTdWJzY3JpcHRpb25NYXA+O1xuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBTdWJzY3JpcHRpb25TZXQgPSBTZXQ8U3Vic2NyaXB0aW9uPjtcbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgU3Vic2NyaWJhYmxlTWFwID0gV2Vha01hcDxTdWJzY3JpYmFibGUsIExpc3Rlck1hcD47XG5cbi8qKiBAaW50ZXJuYWwgTGlzbmVyIOagvOe0jeW9ouW8jyAqL1xuaW50ZXJmYWNlIENvbnRleHQge1xuICAgIG1hcDogU3Vic2NyaWJhYmxlTWFwO1xuICAgIHNldDogU3Vic2NyaXB0aW9uU2V0O1xufVxuXG4vKiogQGludGVybmFsIHJlZ2lzdGVyIGxpc3RlbmVyIGNvbnRleHQgKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyKGNvbnRleHQ6IENvbnRleHQsIHRhcmdldDogU3Vic2NyaWJhYmxlLCBjaGFubmVsOiBzdHJpbmcgfCBzdHJpbmdbXSwgbGlzdGVuZXI6IEZ1bmN0aW9uKTogU3Vic2NyaXB0aW9uIHtcbiAgICBjb25zdCBzdWJzY3JpcHRpb25zOiBTdWJzY3JpcHRpb25bXSA9IFtdO1xuXG4gICAgY29uc3QgY2hhbm5lbHMgPSBpc0FycmF5KGNoYW5uZWwpID8gY2hhbm5lbCA6IFtjaGFubmVsXTtcbiAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgIGNvbnN0IHMgPSB0YXJnZXQub24oY2gsIGxpc3RlbmVyIGFzIGFueSk7XG4gICAgICAgIGNvbnRleHQuc2V0LmFkZChzKTtcbiAgICAgICAgc3Vic2NyaXB0aW9ucy5wdXNoKHMpO1xuXG4gICAgICAgIGNvbnN0IGxpc3RlbmVyTWFwID0gY29udGV4dC5tYXAuZ2V0KHRhcmdldCkgfHwgbmV3IE1hcDxzdHJpbmcsIE1hcDxGdW5jdGlvbiwgU3Vic2NyaXB0aW9uPj4oKTtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJNYXAuZ2V0KGNoKSB8fCBuZXcgTWFwPEZ1bmN0aW9uLCBTdWJzY3JpcHRpb24+KCk7XG4gICAgICAgIG1hcC5zZXQobGlzdGVuZXIsIHMpO1xuXG4gICAgICAgIGlmICghbGlzdGVuZXJNYXAuaGFzKGNoKSkge1xuICAgICAgICAgICAgbGlzdGVuZXJNYXAuc2V0KGNoLCBtYXApO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY29udGV4dC5tYXAuaGFzKHRhcmdldCkpIHtcbiAgICAgICAgICAgIGNvbnRleHQubWFwLnNldCh0YXJnZXQsIGxpc3RlbmVyTWFwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBPYmplY3QuZnJlZXplKHtcbiAgICAgICAgZ2V0IGVuYWJsZSgpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBzdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKHMuZW5hYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgdW5zdWJzY3JpYmUoKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2Ygc3Vic2NyaXB0aW9ucykge1xuICAgICAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9KTtcbn1cblxuLyoqIEBpbnRlcm5hbCB1bnJlZ2lzdGVyIGxpc3RlbmVyIGNvbnRleHQgKi9cbmZ1bmN0aW9uIHVucmVnaXN0ZXIoY29udGV4dDogQ29udGV4dCwgdGFyZ2V0PzogU3Vic2NyaWJhYmxlLCBjaGFubmVsPzogc3RyaW5nIHwgc3RyaW5nW10sIGxpc3RlbmVyPzogRnVuY3Rpb24pOiB2b2lkIHtcbiAgICBpZiAobnVsbCAhPSB0YXJnZXQpIHtcbiAgICAgICAgdGFyZ2V0Lm9mZihjaGFubmVsLCBsaXN0ZW5lciBhcyBhbnkpO1xuXG4gICAgICAgIGNvbnN0IGxpc3RlbmVyTWFwID0gY29udGV4dC5tYXAuZ2V0KHRhcmdldCk7XG4gICAgICAgIGlmICghbGlzdGVuZXJNYXApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAobnVsbCAhPSBjaGFubmVsKSB7XG4gICAgICAgICAgICBjb25zdCBjaGFubmVscyA9IGlzQXJyYXkoY2hhbm5lbCkgPyBjaGFubmVsIDogW2NoYW5uZWxdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVyTWFwLmdldChjaCk7XG4gICAgICAgICAgICAgICAgaWYgKCFtYXApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcyA9IG1hcC5nZXQobGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5zZXQuZGVsZXRlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG1hcC5kZWxldGUobGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBtYXAudmFsdWVzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuc2V0LmRlbGV0ZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbWFwIG9mIGxpc3RlbmVyTWFwLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIG1hcC52YWx1ZXMoKSkge1xuICAgICAgICAgICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQuc2V0LmRlbGV0ZShzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGNvbnN0IHMgb2YgY29udGV4dC5zZXQpIHtcbiAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0Lm1hcCA9IG5ldyBXZWFrTWFwKCk7XG4gICAgICAgIGNvbnRleHQuc2V0LmNsZWFyKCk7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIHRvIHdoaWNoIHRoZSBzYWZlIGV2ZW50IHJlZ2lzdGVyL3VucmVnaXN0ZXIgbWV0aG9kIGlzIG9mZmVyZWQgZm9yIHRoZSBvYmplY3Qgd2hpY2ggaXMgYSBzaG9ydCBsaWZlIGN5Y2xlIHRoYW4gc3Vic2NyaXB0aW9uIHRhcmdldC4gPGJyPlxuICogICAgIFRoZSBhZHZhbnRhZ2Ugb2YgdXNpbmcgdGhpcyBmb3JtLCBpbnN0ZWFkIG9mIGBvbigpYCwgaXMgdGhhdCBgbGlzdGVuVG8oKWAgYWxsb3dzIHRoZSBvYmplY3QgdG8ga2VlcCB0cmFjayBvZiB0aGUgZXZlbnRzLFxuICogICAgIGFuZCB0aGV5IGNhbiBiZSByZW1vdmVkIGFsbCBhdCBvbmNlIGxhdGVyIGNhbGwgYHN0b3BMaXN0ZW5pbmcoKWAuXG4gKiBAamEg6LO86Kqt5a++6LGh44KI44KK44KC44Op44Kk44OV44K144Kk44Kv44Or44GM55+t44GE44Kq44OW44K444Kn44Kv44OI44Gr5a++44GX44GmLCDlronlhajjgarjgqTjg5njg7Pjg4jnmbvpjLIv6Kej6Zmk44Oh44K944OD44OJ44KS5o+Q5L6b44GZ44KL44Kv44Op44K5IDxicj5cbiAqICAgICBgb24oKWAg44Gu5Luj44KP44KK44GrIGBsaXN0ZW5UbygpYCDjgpLkvb/nlKjjgZnjgovjgZPjgajjgacsIOW+jOOBqyBgc3RvcExpc3RlbmluZygpYCDjgpIx5bqm5ZG844G244Gg44GR44Gn44GZ44G544Gm44Gu44Oq44K544OK44O844KS6Kej6Zmk44Gn44GN44KL5Yip54K544GM44GC44KLLlxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgRXZlbnRSZWNlaXZlciwgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG4gKlxuICogLy8gZGVjbGFyZSBldmVudCBpbnRlcmZhY2VcbiAqIGludGVyZmFjZSBTYW1wbGVFdmVudCB7XG4gKiAgIGhvZ2U6IFtudW1iZXIsIHN0cmluZ107ICAgICAgICAvLyBjYWxsYmFjayBmdW5jdGlvbidzIGFyZ3MgdHlwZSB0dXBsZVxuICogICBmb286IFt2b2lkXTsgICAgICAgICAgICAgICAgICAgLy8gbm8gYXJnc1xuICogICBob286IHZvaWQ7ICAgICAgICAgICAgICAgICAgICAgLy8gbm8gYXJncyAoc2FtZSB0aGUgdXBvbilcbiAqICAgYmFyOiBbRXJyb3JdOyAgICAgICAgICAgICAgICAgIC8vIGFueSBjbGFzcyBpcyBhdmFpbGFibGUuXG4gKiAgIGJhejogRXJyb3IgfCBOdW1iZXI7ICAgICAgICAgICAvLyBpZiBvbmx5IG9uZSBhcmd1bWVudCwgYFtdYCBpcyBub3QgcmVxdWlyZWQuXG4gKiB9XG4gKlxuICogLy8gZGVjbGFyZSBjbGllbnQgY2xhc3NcbiAqIGNsYXNzIFNhbXBsZVJlY2VpdmVyIGV4dGVuZHMgRXZlbnRSZWNlaXZlciB7XG4gKiAgIGNvbnN0cnVjdG9yKGJyb2tlcjogRXZlbnRCcm9rZXI8U2FtcGxlRXZlbnQ+KSB7XG4gKiAgICAgc3VwZXIoKTtcbiAqICAgICB0aGlzLmxpc3RlblRvKGJyb2tlciwgJ2hvZ2UnLCAobnVtOiBudW1iZXIsIHN0cjogc3RyaW5nKSA9PiB7IC4uLiB9KTtcbiAqICAgICB0aGlzLmxpc3RlblRvKGJyb2tlciwgJ2JhcicsIChlOiBFcnJvcikgPT4geyAuLi4gfSk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsIFsnZm9vJywgJ2hvbyddLCAoKSA9PiB7IC4uLiB9KTtcbiAqICAgfVxuICpcbiAqICAgcmVsZWFzZSgpOiB2b2lkIHtcbiAqICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICogb3JcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgYnJva2VyICAgPSBuZXcgRXZlbnRCcm9rZXI8U2FtcGxlRXZlbnQ+KCk7XG4gKiBjb25zdCByZWNlaXZlciA9IG5ldyBFdmVudFJlY2VpdmVyKCk7XG4gKlxuICogcmVjZWl2ZXIubGlzdGVuVG8oYnJva2VyLCAnaG9nZScsIChudW06IG51bWJlciwgc3RyOiBzdHJpbmcpID0+IHsgLi4uIH0pO1xuICogcmVjZWl2ZXIubGlzdGVuVG8oYnJva2VyLCAnYmFyJywgKGU6IEVycm9yKSA9PiB7IC4uLiB9KTtcbiAqIHJlY2VpdmVyLmxpc3RlblRvKGJyb2tlciwgWydmb28nLCAnaG9vJ10sICgpID0+IHsgLi4uIH0pO1xuICpcbiAqIHJlY2VpdmVyLnN0b3BMaXN0ZW5pbmcoKTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgRXZlbnRSZXZjZWl2ZXIge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfY29udGV4dF06IENvbnRleHQ7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpc1tfY29udGV4dF0gPSB7IG1hcDogbmV3IFdlYWtNYXAoKSwgc2V0OiBuZXcgU2V0KCkgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGVsbCBhbiBvYmplY3QgdG8gbGlzdGVuIHRvIGEgcGFydGljdWxhciBldmVudCBvbiBhbiBvdGhlciBvYmplY3QuXG4gICAgICogQGphIOWvvuixoeOCquODluOCuOOCp+OCr+ODiOOBruOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHRhcmdldFxuICAgICAqICAtIGBlbmAgZXZlbnQgbGlzdGVuaW5nIHRhcmdldCBvYmplY3QuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jos7zoqq3lr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIGxpc3RlblRvPFQgZXh0ZW5kcyBTdWJzY3JpYmFibGUsIEV2ZW50IGV4dGVuZHMgRXZlbnRTY2hlbWE8VD4gPSBFdmVudFNjaGVtYTxUPiwgQ2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50ID0ga2V5b2YgRXZlbnQ+KFxuICAgICAgICB0YXJnZXQ6IFQsXG4gICAgICAgIGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sXG4gICAgICAgIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93blxuICAgICk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiByZWdpc3Rlcih0aGlzW19jb250ZXh0XSwgdGFyZ2V0LCBjaGFubmVsIGFzIHN0cmluZywgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdXN0IGxpa2UgbGlzdGVuVG8sIGJ1dCBjYXVzZXMgdGhlIGJvdW5kIGNhbGxiYWNrIHRvIGZpcmUgb25seSBvbmNlIGJlZm9yZSBiZWluZyByZW1vdmVkLlxuICAgICAqIEBqYSDlr77osaHjgqrjg5bjgrjjgqfjgq/jg4jjga7kuIDluqbjgaDjgZHjg4/jg7Pjg4njg6rjg7PjgrDlj6/og73jgarjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXRcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGxpc3RlbmluZyB0YXJnZXQgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI6LO86Kqt5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBsaXN0ZW5Ub09uY2U8VCBleHRlbmRzIFN1YnNjcmliYWJsZSwgRXZlbnQgZXh0ZW5kcyBFdmVudFNjaGVtYTxUPiA9IEV2ZW50U2NoZW1hPFQ+LCBDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQgPSBrZXlvZiBFdmVudD4oXG4gICAgICAgIHRhcmdldDogVCxcbiAgICAgICAgY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSxcbiAgICAgICAgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duXG4gICAgKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHJlZ2lzdGVyKHRoaXNbX2NvbnRleHRdLCB0YXJnZXQsIGNoYW5uZWwgYXMgc3RyaW5nLCBsaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IG1hbmFnZWQgPSB0YXJnZXQub24oY2hhbm5lbCwgKCkgPT4ge1xuICAgICAgICAgICAgdW5yZWdpc3Rlcih0aGlzW19jb250ZXh0XSwgdGFyZ2V0LCBjaGFubmVsIGFzIHN0cmluZywgbGlzdGVuZXIpO1xuICAgICAgICAgICAgbWFuYWdlZC51bnN1YnNjcmliZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRlbGwgYW4gb2JqZWN0IHRvIHN0b3AgbGlzdGVuaW5nIHRvIGV2ZW50cy5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0XG4gICAgICogIC0gYGVuYCBldmVudCBsaXN0ZW5pbmcgdGFyZ2V0IG9iamVjdC5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOizvOiqreWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm44Gu44Oq44K544OK44O844KS6Kej6ZmkXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZCBsaXN0ZW5lcnMgZnJvbSBgdGFyZ2V0YC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5a++6LGhIGB0YXJnZXRgIOOBruODquOCueODiuODvOOCkuOBmeOBueOBpuino+mZpFxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WQjOS4gCBgY2hhbm5lbGAg44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgcHVibGljIHN0b3BMaXN0ZW5pbmc8VCBleHRlbmRzIFN1YnNjcmliYWJsZSwgRXZlbnQgZXh0ZW5kcyBFdmVudFNjaGVtYTxUPiA9IEV2ZW50U2NoZW1hPFQ+LCBDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQgPSBrZXlvZiBFdmVudD4oXG4gICAgICAgIHRhcmdldD86IFQsXG4gICAgICAgIGNoYW5uZWw/OiBDaGFubmVsIHwgQ2hhbm5lbFtdLFxuICAgICAgICBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duXG4gICAgKTogdGhpcyB7XG4gICAgICAgIHVucmVnaXN0ZXIodGhpc1tfY29udGV4dF0sIHRhcmdldCwgY2hhbm5lbCBhcyBzdHJpbmcsIGxpc3RlbmVyKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQgeyBtaXhpbnMgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRCcm9rZXIgfSBmcm9tICcuL2Jyb2tlcic7XG5pbXBvcnQgeyBFdmVudFJldmNlaXZlciB9IGZyb20gJy4vcmVjZWl2ZXInO1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3Mgd2hpY2ggaGF2ZSBJL0Ygb2YgW1tFdmVudEJyb2tlcl1dIGFuZCBbW0V2ZW50UmV2Y2VpdmVyXV0uIDxicj5cbiAqICAgICBgRXZlbnRzYCBjbGFzcyBvZiBgQmFja2JvbmUuanNgIGVxdWl2YWxlbmNlLlxuICogQGphIFtbRXZlbnRCcm9rZXJdXSDjgaggW1tFdmVudFJldmNlaXZlcl1dIOOBriBJL0Yg44KS44GC44KP44Gb5oyB44Gk44Kv44Op44K5IDxicj5cbiAqICAgICBgQmFja2JvbmUuanNgIOOBriBgRXZlbnRzYCDjgq/jg6njgrnnm7jlvZNcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEV2ZW50U291cmNlIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuICpcbiAqIC8vIGRlY2xhcmUgZXZlbnQgaW50ZXJmYWNlXG4gKiBpbnRlcmZhY2UgVGFyZ2V0RXZlbnQge1xuICogICBob2dlOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqICAgZm9vOiBbdm9pZF07ICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3NcbiAqICAgaG9vOiB2b2lkOyAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3MgKHNhbWUgdGhlIHVwb24pXG4gKiAgIGJhcjogW0Vycm9yXTsgICAgICAgICAgICAgICAgICAvLyBhbnkgY2xhc3MgaXMgYXZhaWxhYmxlLlxuICogICBiYXo6IEVycm9yIHwgTnVtYmVyOyAgICAgICAgICAgLy8gaWYgb25seSBvbmUgYXJndW1lbnQsIGBbXWAgaXMgbm90IHJlcXVpcmVkLlxuICogfVxuICpcbiAqIGludGVyZmFjZSBTYW1wbGVFdmVudCB7XG4gKiAgIGZ1Z2E6IFtudW1iZXIsIHN0cmluZ107ICAgICAgICAvLyBjYWxsYmFjayBmdW5jdGlvbidzIGFyZ3MgdHlwZSB0dXBsZVxuICogfVxuICpcbiAqIC8vIGRlY2xhcmUgY2xpZW50IGNsYXNzXG4gKiBjbGFzcyBTYW1wbGVTb3VyY2UgZXh0ZW5kcyBFdmVudFNvdXJjZTxTYW1wbGVFdmVudD4ge1xuICogICBjb25zdHJ1Y3Rvcih0YXJnZXQ6IEV2ZW50U291cmNlPFRhcmdldEV2ZW50Pikge1xuICogICAgIHN1cGVyKCk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsICdob2dlJywgKG51bTogbnVtYmVyLCBzdHI6IHN0cmluZykgPT4geyAuLi4gfSk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsICdiYXInLCAoZTogRXJyb3IpID0+IHsgLi4uIH0pO1xuICogICAgIHRoaXMubGlzdGVuVG8oYnJva2VyLCBbJ2ZvbycsICdob28nXSwgKCkgPT4geyAuLi4gfSk7XG4gKiAgIH1cbiAqXG4gKiAgIHJlbGVhc2UoKTogdm9pZCB7XG4gKiAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBzYW1wbGUgPSBuZXcgU2FtcGxlU291cmNlKCk7XG4gKlxuICogc2FtcGxlLm9uKCdmdWdhJywgKGE6IG51bWJlciwgYjogc3RyaW5nKSA9PiB7IC4uLiB9KTsgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogc2FtcGxlLnRyaWdnZXIoJ2Z1Z2EnLCAxMDAsICd0ZXN0Jyk7ICAgICAgICAgICAgICAgICAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogYGBgXG4gKi9cbnR5cGUgRXZlbnRTb3VyY2VCYXNlPFQgZXh0ZW5kcyB7fT4gPSBFdmVudEJyb2tlcjxUPiAmIEV2ZW50UmV2Y2VpdmVyO1xuXG4vKiogQGludGVybmFsIFtbRXZlbnRTb3VyY2VdXSBjbGFzcyAqL1xuY2xhc3MgRXZlbnRTb3VyY2UgZXh0ZW5kcyBtaXhpbnMoRXZlbnRCcm9rZXIsIEV2ZW50UmV2Y2VpdmVyKSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuc3VwZXIoRXZlbnRSZXZjZWl2ZXIpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29uc3RydWN0b3Igb2YgW1tFdmVudFNvdXJjZV1dXG4gKiBAamEgW1tFdmVudFNvdXJjZV1dIOOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wun+S9k1xuICovXG5jb25zdCBFdmVudFNvdXJjZUJhc2U6IHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IEV2ZW50U291cmNlQmFzZTxhbnk+O1xuICAgIG5ldyA8VD4oKTogRXZlbnRTb3VyY2VCYXNlPFQ+O1xufSA9IEV2ZW50U291cmNlIGFzIGFueTtcblxuZXhwb3J0IHsgRXZlbnRTb3VyY2VCYXNlIGFzIEV2ZW50U291cmNlIH07XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOzs7QUFxQkE7QUFDQSxNQUFNLGFBQWEsR0FBRyxJQUFJLE9BQU8sRUFBMEMsQ0FBQztBQUU1RTtBQUNBLFNBQVMsU0FBUyxDQUFJLFFBQTJCO0lBQzdDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQzlCLE1BQU0sSUFBSSxTQUFTLENBQUMscUNBQXFDLENBQUMsQ0FBQztLQUM5RDtJQUNELE9BQU8sYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQW9CLENBQUM7QUFDMUQsQ0FBQztBQUVEO0FBQ0EsU0FBUyxZQUFZLENBQUMsT0FBZ0I7SUFDbEMsSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ3hDLE9BQU87S0FDVjtJQUNELE1BQU0sSUFBSSxTQUFTLENBQUMsV0FBVyxTQUFTLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDLENBQUM7QUFDakYsQ0FBQztBQUVEO0FBQ0EsU0FBUyxhQUFhLENBQUMsUUFBMEM7SUFDN0QsSUFBSSxJQUFJLElBQUksUUFBUSxFQUFFO1FBQ2xCLE1BQU0sQ0FBQyxR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
