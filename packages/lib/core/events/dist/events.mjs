/*!
 * @cdp/events 0.9.19
 *   pub/sub framework
 */

import { verify, isArray, isString, isSymbol, className, mixins } from '@cdp/core-utils';

/* eslint-disable
    @typescript-eslint/no-explicit-any,
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
            void Promise.reject(e);
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
 * import { EventPublisher } from '@cdp/runtime';
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
            map.has(ch) ? map.get(ch).add(listener) : map.set(ch, new Set([listener]));
        }
        return Object.freeze({
            get enable() {
                for (const ch of channels) {
                    const list = map.get(ch);
                    if (!list?.has(listener)) {
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
    @typescript-eslint/no-explicit-any,
 */
/**
 * @en Constructor of {@link EventBroker}
 * @ja {@link EventBroker} のコンストラクタ実体
 */
const EventBroker = EventPublisher;
EventBroker.prototype.trigger = EventPublisher.prototype.publish;

/** @internal */ const _context = Symbol('context');
/** @internal register listener context */
function register(context, target, channel, listener) {
    const subscriptions = [];
    const channels = isArray(channel) ? channel : [channel];
    for (const ch of channels) {
        const s = target.on(ch, listener);
        context.set.add(s);
        subscriptions.push(s);
        const listenerMap = context.map.get(target) ?? new Map();
        const map = listenerMap.get(ch) ?? new Map();
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
class EventReceiver {
    /** @internal */
    [_context];
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
    @typescript-eslint/no-explicit-any,
 */
/** @internal {@link EventSource} class */
class EventSource extends mixins(EventBroker, EventReceiver) {
    constructor() {
        super();
        this.super(EventReceiver);
    }
}
/**
 * @en Constructor of {@link EventSource}
 * @ja {@link EventSource} のコンストラクタ実体
 */
const _EventSource = EventSource;

export { EventBroker, EventPublisher, EventReceiver, _EventSource as EventSource };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRzLm1qcyIsInNvdXJjZXMiOlsicHVibGlzaGVyLnRzIiwiYnJva2VyLnRzIiwicmVjZWl2ZXIudHMiLCJzb3VyY2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgQXJndW1lbnRzLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgaXNTeW1ib2wsXG4gICAgY2xhc3NOYW1lLFxuICAgIHZlcmlmeSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgRXZlbnRBbGwsXG4gICAgU3Vic2NyaXB0aW9uLFxuICAgIFN1YnNjcmliYWJsZSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBMaXNuZXIg5qC857SN5b2i5byPICovXG50eXBlIExpc3RlbmVyc01hcDxUPiA9IE1hcDxrZXlvZiBULCBTZXQ8KC4uLmFyZ3M6IFRba2V5b2YgVF1bXSkgPT4gdW5rbm93bj4+O1xuXG4vKiogQGludGVybmFsIExpc25lciDjga7lvLHlj4LnhacgKi9cbmNvbnN0IF9tYXBMaXN0ZW5lcnMgPSBuZXcgV2Vha01hcDxFdmVudFB1Ymxpc2hlcjxhbnk+LCBMaXN0ZW5lcnNNYXA8YW55Pj4oKTtcblxuLyoqIEBpbnRlcm5hbCBMaXNuZXJNYXAg44Gu5Y+W5b6XICovXG5mdW5jdGlvbiBsaXN0ZW5lcnM8VCBleHRlbmRzIG9iamVjdD4oaW5zdGFuY2U6IEV2ZW50UHVibGlzaGVyPFQ+KTogTGlzdGVuZXJzTWFwPFQ+IHtcbiAgICBpZiAoIV9tYXBMaXN0ZW5lcnMuaGFzKGluc3RhbmNlKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGlzIGlzIG5vdCBhIHZhbGlkIEV2ZW50UHVibGlzaGVyLicpO1xuICAgIH1cbiAgICByZXR1cm4gX21hcExpc3RlbmVycy5nZXQoaW5zdGFuY2UpIGFzIExpc3RlbmVyc01hcDxUPjtcbn1cblxuLyoqIEBpbnRlcm5hbCBDaGFubmVsIOOBruWei+aknOiovCAqL1xuZnVuY3Rpb24gdmFsaWRDaGFubmVsKGNoYW5uZWw6IHVua25vd24pOiB2b2lkIHwgbmV2ZXIge1xuICAgIGlmIChpc1N0cmluZyhjaGFubmVsKSB8fCBpc1N5bWJvbChjaGFubmVsKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFR5cGUgb2YgJHtjbGFzc05hbWUoY2hhbm5lbCl9IGlzIG5vdCBhIHZhbGlkIGNoYW5uZWwuYCk7XG59XG5cbi8qKiBAaW50ZXJuYWwgTGlzdGVuZXIg44Gu5Z6L5qSc6Ki8ICovXG5mdW5jdGlvbiB2YWxpZExpc3RlbmVyKGxpc3RlbmVyPzogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bik6IGFueSB7XG4gICAgaWYgKG51bGwgIT0gbGlzdGVuZXIpIHtcbiAgICAgICAgdmVyaWZ5KCd0eXBlT2YnLCAnZnVuY3Rpb24nLCBsaXN0ZW5lcik7XG4gICAgfVxuICAgIHJldHVybiBsaXN0ZW5lcjtcbn1cblxuLyoqIEBpbnRlcm5hbCBldmVudCDnmbrooYwgKi9cbmZ1bmN0aW9uIHRyaWdnZXJFdmVudDxFdmVudCwgQ2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihcbiAgICBtYXA6IExpc3RlbmVyc01hcDxFdmVudD4sXG4gICAgY2hhbm5lbDogQ2hhbm5lbCxcbiAgICBvcmlnaW5hbDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj5cbik6IHZvaWQge1xuICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoYW5uZWwpO1xuICAgIGlmICghbGlzdCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAoY29uc3QgbGlzdGVuZXIgb2YgbGlzdCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZXZlbnRBcmdzID0gb3JpZ2luYWwgPyBbb3JpZ2luYWwsIC4uLmFyZ3NdIDogYXJncztcbiAgICAgICAgICAgIGNvbnN0IGhhbmRsZWQgPSBsaXN0ZW5lciguLi5ldmVudEFyZ3MpO1xuICAgICAgICAgICAgLy8gaWYgcmVjZWl2ZWQgJ3RydWUnLCBzdG9wIGRlbGVnYXRpb24uXG4gICAgICAgICAgICBpZiAodHJ1ZSA9PT0gaGFuZGxlZCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB2b2lkIFByb21pc2UucmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gRXZlbnRpbmcgZnJhbWV3b3JrIGNsYXNzIHdpdGggZW5zdXJpbmcgdHlwZS1zYWZlIGZvciBUeXBlU2NyaXB0LiA8YnI+XG4gKiAgICAgVGhlIGNsaWVudCBvZiB0aGlzIGNsYXNzIGNhbiBpbXBsZW1lbnQgb3JpZ2luYWwgUHViLVN1YiAoT2JzZXJ2ZXIpIGRlc2lnbiBwYXR0ZXJuLlxuICogQGphIOWei+WuieWFqOOCkuS/nemanOOBmeOCi+OCpOODmeODs+ODiOeZu+mMsuODu+eZuuihjOOCr+ODqeOCuSA8YnI+XG4gKiAgICAg44Kv44Op44Kk44Ki44Oz44OI44Gv5pys44Kv44Op44K544KS5rS+55Sf44GX44Gm54us6Ieq44GuIFB1Yi1TdWIgKE9ic2VydmVyKSDjg5Hjgr/jg7zjg7PjgpLlrp/oo4Xlj6/og71cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiAvLyBkZWNsYXJlIGV2ZW50IGludGVyZmFjZVxuICogaW50ZXJmYWNlIFNhbXBsZUV2ZW50IHtcbiAqICAgaG9nZTogW251bWJlciwgc3RyaW5nXTsgICAgICAgIC8vIGNhbGxiYWNrIGZ1bmN0aW9uJ3MgYXJncyB0eXBlIHR1cGxlXG4gKiAgIGZvbzogW3ZvaWRdOyAgICAgICAgICAgICAgICAgICAvLyBubyBhcmdzXG4gKiAgIGhvbzogdm9pZDsgICAgICAgICAgICAgICAgICAgICAvLyBubyBhcmdzIChzYW1lIHRoZSB1cG9uKVxuICogICBiYXI6IFtFcnJvcl07ICAgICAgICAgICAgICAgICAgLy8gYW55IGNsYXNzIGlzIGF2YWlsYWJsZS5cbiAqICAgYmF6OiBFcnJvciB8IE51bWJlcjsgICAgICAgICAgIC8vIGlmIG9ubHkgb25lIGFyZ3VtZW50LCBgW11gIGlzIG5vdCByZXF1aXJlZC5cbiAqIH1cbiAqXG4gKiAvLyBkZWNsYXJlIGNsaWVudCBjbGFzc1xuICogY2xhc3MgU2FtcGxlUHVibGlzaGVyIGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8U2FtcGxlRXZlbnQ+IHtcbiAqICAgOlxuICogICBzb21lTWV0aG9kKCk6IHZvaWQge1xuICogICAgIHRoaXMucHVibGlzaCgnaG9nZScsIDEwMCwgJ3Rlc3QnKTsgICAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogICAgIHRoaXMucHVibGlzaCgnaG9nZScsIDEwMCwgdHJ1ZSk7ICAgICAgICAgLy8gTkcuIGFyZ3VtZW50IG9mIHR5cGUgJ3RydWUnIGlzIG5vdCBhc3NpZ25hYmxlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdG8gcGFyYW1ldGVyIG9mIHR5cGUgJ3N0cmluZyB8IHVuZGVmaW5lZCcuXG4gKiAgICAgdGhpcy5wdWJsaXNoKCdob2dlJywgMTAwKTsgICAgICAgICAgICAgICAvLyBPSy4gYWxsIGFyZ3MgdG8gYmUgb3B0aW9uYWwgYXV0b21hdGljYWxseS5cbiAqICAgICB0aGlzLnB1Ymxpc2goJ2ZvbycpOyAgICAgICAgICAgICAgICAgICAgIC8vIE9LLiBzdGFuZGFyZCB1c2FnZS5cbiAqICAgICB0aGlzLnB1Ymxpc2goJ2ZvbycsIDEwMCk7ICAgICAgICAgICAgICAgIC8vIE5HLiBhcmd1bWVudCBvZiB0eXBlICcxMDAnIGlzIG5vdCBhc3NpZ25hYmxlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdG8gcGFyYW1ldGVyIG9mIHR5cGUgJ3ZvaWQgfCB1bmRlZmluZWQnLlxuICogICB9XG4gKiB9XG4gKlxuICogY29uc3Qgc2FtcGxlID0gbmV3IFNhbXBsZVB1Ymxpc2hlcigpO1xuICpcbiAqIHNhbXBsZS5vbignaG9nZScsIChhOiBudW1iZXIsIGI6IHN0cmluZykgPT4geyAuLi4gfSk7ICAgIC8vIE9LLiBzdGFuZGFyZCB1c2FnZS5cbiAqIHNhbXBsZS5vbignaG9nZScsIChhOiBudW1iZXIsIGI6IGJvb2xlYW4pID0+IHsgLi4uIH0pOyAgIC8vIE5HLiB0eXBlcyBvZiBwYXJhbWV0ZXJzICdiJ1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIGFuZCAnYXJnc18xJyBhcmUgaW5jb21wYXRpYmxlLlxuICogc2FtcGxlLm9uKCdob2dlJywgKGEpID0+IHsgLi4uIH0pOyAgICAgICAgICAgICAgICAgICAgICAgLy8gT0suIGFsbCBhcmdzXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdG8gYmUgb3B0aW9uYWwgYXV0b21hdGljYWxseS5cbiAqIHNhbXBsZS5vbignaG9nZScsIChhLCBiLCBjKSA9PiB7IC4uLiB9KTsgICAgICAgICAgICAgICAgIC8vIE5HLiBleHBlY3RlZCAxLTIgYXJndW1lbnRzLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIGJ1dCBnb3QgMy5cbiAqIGBgYFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRXZlbnRQdWJsaXNoZXI8RXZlbnQgZXh0ZW5kcyBvYmplY3Q+IGltcGxlbWVudHMgU3Vic2NyaWJhYmxlPEV2ZW50PiB7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdmVyaWZ5KCdpbnN0YW5jZU9mJywgRXZlbnRQdWJsaXNoZXIsIHRoaXMpO1xuICAgICAgICBfbWFwTGlzdGVuZXJzLnNldCh0aGlzLCBuZXcgTWFwKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBOb3RpZnkgZXZlbnQgdG8gY2xpZW50cy5cbiAgICAgKiBAamEgZXZlbnQg55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgYXJndW1lbnRzIGZvciBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWw44Gr5rih44GZ5byV5pWwXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHB1Ymxpc2g8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsLCAuLi5hcmdzOiBBcmd1bWVudHM8UGFydGlhbDxFdmVudFtDaGFubmVsXT4+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVycyh0aGlzKTtcbiAgICAgICAgdmFsaWRDaGFubmVsKGNoYW5uZWwpO1xuICAgICAgICB0cmlnZ2VyRXZlbnQobWFwLCBjaGFubmVsLCB1bmRlZmluZWQsIC4uLmFyZ3MpO1xuICAgICAgICAvLyB0cmlnZ2VyIGZvciBhbGwgaGFuZGxlclxuICAgICAgICBpZiAoJyonICE9PSBjaGFubmVsKSB7XG4gICAgICAgICAgICB0cmlnZ2VyRXZlbnQobWFwIGFzIHVua25vd24gYXMgTGlzdGVuZXJzTWFwPEV2ZW50QWxsPiwgJyonLCBjaGFubmVsIGFzIHN0cmluZywgLi4uYXJncyk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBTdWJzY3JpYmFibGU8RXZlbnQ+XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgd2hldGhlciB0aGlzIG9iamVjdCBoYXMgY2xpZW50cy5cbiAgICAgKiBAamEg44Kv44Op44Kk44Ki44Oz44OI44GM5a2Y5Zyo44GZ44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBoYXNMaXN0ZW5lcjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw/OiBDaGFubmVsLCBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVycyh0aGlzKTtcbiAgICAgICAgaWYgKG51bGwgPT0gY2hhbm5lbCkge1xuICAgICAgICAgICAgcmV0dXJuIG1hcC5zaXplID4gMDtcbiAgICAgICAgfVxuICAgICAgICB2YWxpZENoYW5uZWwoY2hhbm5lbCk7XG4gICAgICAgIGlmIChudWxsID09IGxpc3RlbmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFwLmhhcyhjaGFubmVsKTtcbiAgICAgICAgfVxuICAgICAgICB2YWxpZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2hhbm5lbCk7XG4gICAgICAgIHJldHVybiBsaXN0ID8gbGlzdC5oYXMobGlzdGVuZXIpIDogZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgcmVnaXN0ZXJlZCBjaGFubmVsIGtleXMuXG4gICAgICogQGphIOeZu+mMsuOBleOCjOOBpuOBhOOCi+ODgeODo+ODjeODq+OCreODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNoYW5uZWxzKCk6IChrZXlvZiBFdmVudClbXSB7XG4gICAgICAgIHJldHVybiBbLi4ubGlzdGVuZXJzKHRoaXMpLmtleXMoKV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb248Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lcnModGhpcyk7XG4gICAgICAgIHZhbGlkTGlzdGVuZXIobGlzdGVuZXIpO1xuXG4gICAgICAgIGNvbnN0IGNoYW5uZWxzID0gaXNBcnJheShjaGFubmVsKSA/IGNoYW5uZWwgOiBbY2hhbm5lbF07XG4gICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgIHZhbGlkQ2hhbm5lbChjaCk7XG4gICAgICAgICAgICBtYXAuaGFzKGNoKSA/IG1hcC5nZXQoY2gpIS5hZGQobGlzdGVuZXIpIDogbWFwLnNldChjaCwgbmV3IFNldChbbGlzdGVuZXJdKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgICAgICBnZXQgZW5hYmxlKCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2gpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWxpc3Q/LmhhcyhsaXN0ZW5lcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1bnN1YnNjcmliZSgpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3QuZGVsZXRlKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3Quc2l6ZSA+IDAgfHwgbWFwLmRlbGV0ZShjaCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpIGJ1dCBpdCBjYXVzZXMgdGhlIGJvdW5kIGNhbGxiYWNrIHRvIG9ubHkgZmlyZSBvbmNlIGJlZm9yZSBiZWluZyByZW1vdmVkLlxuICAgICAqIEBqYSDkuIDluqbjgaDjgZHjg4/jg7Pjg4njg6rjg7PjgrDlj6/og73jgarjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbmNlPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMub24oY2hhbm5lbCwgbGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBtYW5hZ2VkID0gdGhpcy5vbihjaGFubmVsLCAoKSA9PiB7XG4gICAgICAgICAgICBjb250ZXh0LnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICBtYW5hZ2VkLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29udGV4dDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm6Kej6ZmkXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvZmY8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsPzogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IHRoaXMge1xuICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lcnModGhpcyk7XG4gICAgICAgIGlmIChudWxsID09IGNoYW5uZWwpIHtcbiAgICAgICAgICAgIG1hcC5jbGVhcigpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjaGFubmVscyA9IGlzQXJyYXkoY2hhbm5lbCkgPyBjaGFubmVsIDogW2NoYW5uZWxdO1xuICAgICAgICBjb25zdCBjYWxsYmFjayA9IHZhbGlkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgICAgICB2YWxpZENoYW5uZWwoY2gpO1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBtYXAuZGVsZXRlKGNoKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2gpO1xuICAgICAgICAgICAgICAgIGlmIChsaXN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3QuZGVsZXRlKGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgbGlzdC5zaXplID4gMCB8fCBtYXAuZGVsZXRlKGNoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHsgQXJndW1lbnRzIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmliYWJsZSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBFdmVudFB1Ymxpc2hlciB9IGZyb20gJy4vcHVibGlzaGVyJztcblxuLyoqIHJlLWV4cG9ydCAqL1xuZXhwb3J0IHR5cGUgRXZlbnRBcmd1bWVudHM8VD4gPSBBcmd1bWVudHM8VD47XG5cbi8qKlxuICogQGVuIEV2ZW50aW5nIGZyYW1ld29yayBvYmplY3QgYWJsZSB0byBjYWxsIGBwdWJsaXNoKClgIG1ldGhvZCBmcm9tIG91dHNpZGUuXG4gKiBAamEg5aSW6YOo44GL44KJ44GuIGBwdWJsaXNoKClgIOOCkuWPr+iDveOBq+OBl+OBn+OCpOODmeODs+ODiOeZu+mMsuODu+eZuuihjOOCr+ODqeOCuVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIC8vIGRlY2xhcmUgZXZlbnQgaW50ZXJmYWNlXG4gKiBpbnRlcmZhY2UgU2FtcGxlRXZlbnQge1xuICogICBob2dlOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqIH1cbiAqXG4gKiBjb25zdCBicm9rZXIgPSBuZXcgRXZlbnRCcm9rZXI8U2FtcGxlRXZlbnQ+KCk7XG4gKiBicm9rZXIudHJpZ2dlcignaG9nZScsIDEwMCwgJ3Rlc3QnKTsgICAgIC8vIE9LLiBzdGFuZGFyZCB1c2FnZS5cbiAqIGJyb2tlci50cmlnZ2VyKCdob2dlJywgMTAwLCB0cnVlKTsgICAgICAgLy8gTkcuIGFyZ3VtZW50IG9mIHR5cGUgJ3RydWUnIGlzIG5vdCBhc3NpZ25hYmxlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBwYXJhbWV0ZXIgb2YgdHlwZSAnc3RyaW5nIHwgdW5kZWZpbmVkJy5cbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEV2ZW50QnJva2VyPEV2ZW50IGV4dGVuZHMgb2JqZWN0PiBleHRlbmRzIFN1YnNjcmliYWJsZTxFdmVudD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBOb3RpZnkgZXZlbnQgdG8gY2xpZW50cy5cbiAgICAgKiBAamEgZXZlbnQg55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgYXJndW1lbnRzIGZvciBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWw44Gr5rih44GZ5byV5pWwXG4gICAgICovXG4gICAgdHJpZ2dlcjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwsIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj4pOiB2b2lkO1xufVxuXG4vKipcbiAqIEBlbiBDb25zdHJ1Y3RvciBvZiB7QGxpbmsgRXZlbnRCcm9rZXJ9XG4gKiBAamEge0BsaW5rIEV2ZW50QnJva2VyfSDjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/lrp/kvZNcbiAqL1xuZXhwb3J0IGNvbnN0IEV2ZW50QnJva2VyOiB7XG4gICAgcmVhZG9ubHkgcHJvdG90eXBlOiBFdmVudEJyb2tlcjxhbnk+O1xuICAgIG5ldyA8VCBleHRlbmRzIG9iamVjdD4oKTogRXZlbnRCcm9rZXI8VD47XG59ID0gRXZlbnRQdWJsaXNoZXIgYXMgYW55O1xuXG5FdmVudEJyb2tlci5wcm90b3R5cGUudHJpZ2dlciA9IChFdmVudFB1Ymxpc2hlci5wcm90b3R5cGUgYXMgYW55KS5wdWJsaXNoO1xuIiwiaW1wb3J0IHtcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgQXJndW1lbnRzLFxuICAgIGlzQXJyYXksXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIFN1YnNjcmliYWJsZSxcbiAgICBTdWJzY3JpcHRpb24sXG4gICAgRXZlbnRTY2hlbWEsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NvbnRleHQgPSBTeW1ib2woJ2NvbnRleHQnKTtcbi8qKiBAaW50ZXJuYWwgKi8gdHlwZSBTdWJzY3JpcHRpb25NYXAgPSBNYXA8VW5rbm93bkZ1bmN0aW9uLCBTdWJzY3JpcHRpb24+O1xuLyoqIEBpbnRlcm5hbCAqLyB0eXBlIExpc3Rlck1hcCAgICAgICA9IE1hcDxzdHJpbmcsIFN1YnNjcmlwdGlvbk1hcD47XG4vKiogQGludGVybmFsICovIHR5cGUgU3Vic2NyaXB0aW9uU2V0ID0gU2V0PFN1YnNjcmlwdGlvbj47XG4vKiogQGludGVybmFsICovIHR5cGUgU3Vic2NyaWJhYmxlTWFwID0gV2Vha01hcDxTdWJzY3JpYmFibGUsIExpc3Rlck1hcD47XG5cbi8qKiBAaW50ZXJuYWwgTGlzbmVyIOagvOe0jeW9ouW8jyAqL1xuaW50ZXJmYWNlIENvbnRleHQge1xuICAgIG1hcDogU3Vic2NyaWJhYmxlTWFwO1xuICAgIHNldDogU3Vic2NyaXB0aW9uU2V0O1xufVxuXG4vKiogQGludGVybmFsIHJlZ2lzdGVyIGxpc3RlbmVyIGNvbnRleHQgKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyKGNvbnRleHQ6IENvbnRleHQsIHRhcmdldDogU3Vic2NyaWJhYmxlLCBjaGFubmVsOiBzdHJpbmcgfCBzdHJpbmdbXSwgbGlzdGVuZXI6IFVua25vd25GdW5jdGlvbik6IFN1YnNjcmlwdGlvbiB7XG4gICAgY29uc3Qgc3Vic2NyaXB0aW9uczogU3Vic2NyaXB0aW9uW10gPSBbXTtcblxuICAgIGNvbnN0IGNoYW5uZWxzID0gaXNBcnJheShjaGFubmVsKSA/IGNoYW5uZWwgOiBbY2hhbm5lbF07XG4gICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICBjb25zdCBzID0gdGFyZ2V0Lm9uKGNoLCBsaXN0ZW5lcik7XG4gICAgICAgIGNvbnRleHQuc2V0LmFkZChzKTtcbiAgICAgICAgc3Vic2NyaXB0aW9ucy5wdXNoKHMpO1xuXG4gICAgICAgIGNvbnN0IGxpc3RlbmVyTWFwID0gY29udGV4dC5tYXAuZ2V0KHRhcmdldCkgPz8gbmV3IE1hcDxzdHJpbmcsIE1hcDxVbmtub3duRnVuY3Rpb24sIFN1YnNjcmlwdGlvbj4+KCk7XG4gICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVyTWFwLmdldChjaCkgPz8gbmV3IE1hcDxVbmtub3duRnVuY3Rpb24sIFN1YnNjcmlwdGlvbj4oKTtcbiAgICAgICAgbWFwLnNldChsaXN0ZW5lciwgcyk7XG5cbiAgICAgICAgaWYgKCFsaXN0ZW5lck1hcC5oYXMoY2gpKSB7XG4gICAgICAgICAgICBsaXN0ZW5lck1hcC5zZXQoY2gsIG1hcCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjb250ZXh0Lm1hcC5oYXModGFyZ2V0KSkge1xuICAgICAgICAgICAgY29udGV4dC5tYXAuc2V0KHRhcmdldCwgbGlzdGVuZXJNYXApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIE9iamVjdC5mcmVlemUoe1xuICAgICAgICBnZXQgZW5hYmxlKCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIHN1YnNjcmlwdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBpZiAocy5lbmFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuICAgICAgICB1bnN1YnNjcmliZSgpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBzdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH0pO1xufVxuXG4vKiogQGludGVybmFsIHVucmVnaXN0ZXIgbGlzdGVuZXIgY29udGV4dCAqL1xuZnVuY3Rpb24gdW5yZWdpc3Rlcihjb250ZXh0OiBDb250ZXh0LCB0YXJnZXQ/OiBTdWJzY3JpYmFibGUsIGNoYW5uZWw/OiBzdHJpbmcgfCBzdHJpbmdbXSwgbGlzdGVuZXI/OiBVbmtub3duRnVuY3Rpb24pOiB2b2lkIHtcbiAgICBpZiAobnVsbCAhPSB0YXJnZXQpIHtcbiAgICAgICAgdGFyZ2V0Lm9mZihjaGFubmVsLCBsaXN0ZW5lcik7XG5cbiAgICAgICAgY29uc3QgbGlzdGVuZXJNYXAgPSBjb250ZXh0Lm1hcC5nZXQodGFyZ2V0KTtcbiAgICAgICAgaWYgKCFsaXN0ZW5lck1hcCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudWxsICE9IGNoYW5uZWwpIHtcbiAgICAgICAgICAgIGNvbnN0IGNoYW5uZWxzID0gaXNBcnJheShjaGFubmVsKSA/IGNoYW5uZWwgOiBbY2hhbm5lbF07XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJNYXAuZ2V0KGNoKTtcbiAgICAgICAgICAgICAgICBpZiAoIW1hcCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gbWFwLmdldChsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnNldC5kZWxldGUocyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbWFwLmRlbGV0ZShsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIG1hcC52YWx1ZXMoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5zZXQuZGVsZXRlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChjb25zdCBtYXAgb2YgbGlzdGVuZXJNYXAudmFsdWVzKCkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2YgbWFwLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5zZXQuZGVsZXRlKHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAoY29uc3QgcyBvZiBjb250ZXh0LnNldCkge1xuICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQubWFwID0gbmV3IFdlYWtNYXAoKTtcbiAgICAgICAgY29udGV4dC5zZXQuY2xlYXIoKTtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3MgdG8gd2hpY2ggdGhlIHNhZmUgZXZlbnQgcmVnaXN0ZXIvdW5yZWdpc3RlciBtZXRob2QgaXMgb2ZmZXJlZCBmb3IgdGhlIG9iamVjdCB3aGljaCBpcyBhIHNob3J0IGxpZmUgY3ljbGUgdGhhbiBzdWJzY3JpcHRpb24gdGFyZ2V0LiA8YnI+XG4gKiAgICAgVGhlIGFkdmFudGFnZSBvZiB1c2luZyB0aGlzIGZvcm0sIGluc3RlYWQgb2YgYG9uKClgLCBpcyB0aGF0IGBsaXN0ZW5UbygpYCBhbGxvd3MgdGhlIG9iamVjdCB0byBrZWVwIHRyYWNrIG9mIHRoZSBldmVudHMsXG4gKiAgICAgYW5kIHRoZXkgY2FuIGJlIHJlbW92ZWQgYWxsIGF0IG9uY2UgbGF0ZXIgY2FsbCBgc3RvcExpc3RlbmluZygpYC5cbiAqIEBqYSDos7zoqq3lr77osaHjgojjgorjgoLjg6njgqTjg5XjgrXjgqTjgq/jg6vjgYznn63jgYTjgqrjg5bjgrjjgqfjgq/jg4jjgavlr77jgZfjgaYsIOWuieWFqOOBquOCpOODmeODs+ODiOeZu+mMsi/op6PpmaTjg6Hjgr3jg4Pjg4njgpLmj5DkvpvjgZnjgovjgq/jg6njgrkgPGJyPlxuICogICAgIGBvbigpYCDjga7ku6Pjgo/jgorjgasgYGxpc3RlblRvKClgIOOCkuS9v+eUqOOBmeOCi+OBk+OBqOOBpywg5b6M44GrIGBzdG9wTGlzdGVuaW5nKClgIOOCkjHluqblkbzjgbbjgaDjgZHjgafjgZnjgbnjgabjga7jg6rjgrnjg4rjg7zjgpLop6PpmaTjgafjgY3jgovliKnngrnjgYzjgYLjgosuXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBFdmVudFJlY2VpdmVyLCBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogLy8gZGVjbGFyZSBldmVudCBpbnRlcmZhY2VcbiAqIGludGVyZmFjZSBTYW1wbGVFdmVudCB7XG4gKiAgIGhvZ2U6IFtudW1iZXIsIHN0cmluZ107ICAgICAgICAvLyBjYWxsYmFjayBmdW5jdGlvbidzIGFyZ3MgdHlwZSB0dXBsZVxuICogICBmb286IFt2b2lkXTsgICAgICAgICAgICAgICAgICAgLy8gbm8gYXJnc1xuICogICBob286IHZvaWQ7ICAgICAgICAgICAgICAgICAgICAgLy8gbm8gYXJncyAoc2FtZSB0aGUgdXBvbilcbiAqICAgYmFyOiBbRXJyb3JdOyAgICAgICAgICAgICAgICAgIC8vIGFueSBjbGFzcyBpcyBhdmFpbGFibGUuXG4gKiAgIGJhejogRXJyb3IgfCBOdW1iZXI7ICAgICAgICAgICAvLyBpZiBvbmx5IG9uZSBhcmd1bWVudCwgYFtdYCBpcyBub3QgcmVxdWlyZWQuXG4gKiB9XG4gKlxuICogLy8gZGVjbGFyZSBjbGllbnQgY2xhc3NcbiAqIGNsYXNzIFNhbXBsZVJlY2VpdmVyIGV4dGVuZHMgRXZlbnRSZWNlaXZlciB7XG4gKiAgIGNvbnN0cnVjdG9yKGJyb2tlcjogRXZlbnRCcm9rZXI8U2FtcGxlRXZlbnQ+KSB7XG4gKiAgICAgc3VwZXIoKTtcbiAqICAgICB0aGlzLmxpc3RlblRvKGJyb2tlciwgJ2hvZ2UnLCAobnVtOiBudW1iZXIsIHN0cjogc3RyaW5nKSA9PiB7IC4uLiB9KTtcbiAqICAgICB0aGlzLmxpc3RlblRvKGJyb2tlciwgJ2JhcicsIChlOiBFcnJvcikgPT4geyAuLi4gfSk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsIFsnZm9vJywgJ2hvbyddLCAoKSA9PiB7IC4uLiB9KTtcbiAqICAgfVxuICpcbiAqICAgcmVsZWFzZSgpOiB2b2lkIHtcbiAqICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICogb3JcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgYnJva2VyICAgPSBuZXcgRXZlbnRCcm9rZXI8U2FtcGxlRXZlbnQ+KCk7XG4gKiBjb25zdCByZWNlaXZlciA9IG5ldyBFdmVudFJlY2VpdmVyKCk7XG4gKlxuICogcmVjZWl2ZXIubGlzdGVuVG8oYnJva2VyLCAnaG9nZScsIChudW06IG51bWJlciwgc3RyOiBzdHJpbmcpID0+IHsgLi4uIH0pO1xuICogcmVjZWl2ZXIubGlzdGVuVG8oYnJva2VyLCAnYmFyJywgKGU6IEVycm9yKSA9PiB7IC4uLiB9KTtcbiAqIHJlY2VpdmVyLmxpc3RlblRvKGJyb2tlciwgWydmb28nLCAnaG9vJ10sICgpID0+IHsgLi4uIH0pO1xuICpcbiAqIHJlY2VpdmVyLnN0b3BMaXN0ZW5pbmcoKTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgRXZlbnRSZWNlaXZlciB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19jb250ZXh0XTogQ29udGV4dDtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzW19jb250ZXh0XSA9IHsgbWFwOiBuZXcgV2Vha01hcCgpLCBzZXQ6IG5ldyBTZXQoKSB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUZWxsIGFuIG9iamVjdCB0byBsaXN0ZW4gdG8gYSBwYXJ0aWN1bGFyIGV2ZW50IG9uIGFuIG90aGVyIG9iamVjdC5cbiAgICAgKiBAamEg5a++6LGh44Kq44OW44K444Kn44Kv44OI44Gu44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0XG4gICAgICogIC0gYGVuYCBldmVudCBsaXN0ZW5pbmcgdGFyZ2V0IG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOizvOiqreWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgbGlzdGVuVG88VCBleHRlbmRzIFN1YnNjcmliYWJsZSwgRXZlbnQgZXh0ZW5kcyBFdmVudFNjaGVtYTxUPiA9IEV2ZW50U2NoZW1hPFQ+LCBDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQgPSBrZXlvZiBFdmVudD4oXG4gICAgICAgIHRhcmdldDogVCxcbiAgICAgICAgY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSxcbiAgICAgICAgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duXG4gICAgKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgcmV0dXJuIHJlZ2lzdGVyKHRoaXNbX2NvbnRleHRdLCB0YXJnZXQsIGNoYW5uZWwgYXMgc3RyaW5nLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEp1c3QgbGlrZSBsaXN0ZW5UbywgYnV0IGNhdXNlcyB0aGUgYm91bmQgY2FsbGJhY2sgdG8gZmlyZSBvbmx5IG9uY2UgYmVmb3JlIGJlaW5nIHJlbW92ZWQuXG4gICAgICogQGphIOWvvuixoeOCquODluOCuOOCp+OCr+ODiOOBruS4gOW6puOBoOOBkeODj+ODs+ODieODquODs+OCsOWPr+iDveOBquOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHRhcmdldFxuICAgICAqICAtIGBlbmAgZXZlbnQgbGlzdGVuaW5nIHRhcmdldCBvYmplY3QuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jos7zoqq3lr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIGxpc3RlblRvT25jZTxUIGV4dGVuZHMgU3Vic2NyaWJhYmxlLCBFdmVudCBleHRlbmRzIEV2ZW50U2NoZW1hPFQ+ID0gRXZlbnRTY2hlbWE8VD4sIENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudCA9IGtleW9mIEV2ZW50PihcbiAgICAgICAgdGFyZ2V0OiBULFxuICAgICAgICBjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLFxuICAgICAgICBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd25cbiAgICApOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gcmVnaXN0ZXIodGhpc1tfY29udGV4dF0sIHRhcmdldCwgY2hhbm5lbCBhcyBzdHJpbmcsIGxpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgbWFuYWdlZCA9IHRhcmdldC5vbihjaGFubmVsLCAoKSA9PiB7XG4gICAgICAgICAgICB1bnJlZ2lzdGVyKHRoaXNbX2NvbnRleHRdLCB0YXJnZXQsIGNoYW5uZWwgYXMgc3RyaW5nLCBsaXN0ZW5lcik7XG4gICAgICAgICAgICBtYW5hZ2VkLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29udGV4dDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGVsbCBhbiBvYmplY3QgdG8gc3RvcCBsaXN0ZW5pbmcgdG8gZXZlbnRzLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXRcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGxpc3RlbmluZyB0YXJnZXQgb2JqZWN0LlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBldmVyeXRoaW5nIGlzIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI6LO86Kqt5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OIXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBldmVyeXRoaW5nIGlzIHJlbGVhc2VkIGxpc3RlbmVycyBmcm9tIGB0YXJnZXRgLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lr77osaEgYHRhcmdldGAg44Gu44Oq44K544OK44O844KS44GZ44G544Gm6Kej6ZmkXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RvcExpc3RlbmluZzxUIGV4dGVuZHMgU3Vic2NyaWJhYmxlLCBFdmVudCBleHRlbmRzIEV2ZW50U2NoZW1hPFQ+ID0gRXZlbnRTY2hlbWE8VD4sIENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudCA9IGtleW9mIEV2ZW50PihcbiAgICAgICAgdGFyZ2V0PzogVCxcbiAgICAgICAgY2hhbm5lbD86IENoYW5uZWwgfCBDaGFubmVsW10sXG4gICAgICAgIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd25cbiAgICApOiB0aGlzIHtcbiAgICAgICAgdW5yZWdpc3Rlcih0aGlzW19jb250ZXh0XSwgdGFyZ2V0LCBjaGFubmVsIGFzIHN0cmluZywgbGlzdGVuZXIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHsgbWl4aW5zIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50QnJva2VyIH0gZnJvbSAnLi9icm9rZXInO1xuaW1wb3J0IHsgRXZlbnRSZWNlaXZlciB9IGZyb20gJy4vcmVjZWl2ZXInO1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3Mgd2hpY2ggaGF2ZSBJL0Ygb2Yge0BsaW5rIEV2ZW50QnJva2VyfSBhbmQge0BsaW5rIEV2ZW50UmVjZWl2ZXJ9LiA8YnI+XG4gKiAgICAgYEV2ZW50c2AgY2xhc3Mgb2YgYEJhY2tib25lLmpzYCBlcXVpdmFsZW5jZS5cbiAqIEBqYSB7QGxpbmsgRXZlbnRCcm9rZXJ9IOOBqCB7QGxpbmsgRXZlbnRSZWNlaXZlcn0g44GuIEkvRiDjgpLjgYLjgo/jgZvmjIHjgaTjgq/jg6njgrkgPGJyPlxuICogICAgIGBCYWNrYm9uZS5qc2Ag44GuIGBFdmVudHNgIOOCr+ODqeOCueebuOW9k1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgRXZlbnRTb3VyY2UgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIC8vIGRlY2xhcmUgZXZlbnQgaW50ZXJmYWNlXG4gKiBpbnRlcmZhY2UgVGFyZ2V0RXZlbnQge1xuICogICBob2dlOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqICAgZm9vOiBbdm9pZF07ICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3NcbiAqICAgaG9vOiB2b2lkOyAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3MgKHNhbWUgdGhlIHVwb24pXG4gKiAgIGJhcjogW0Vycm9yXTsgICAgICAgICAgICAgICAgICAvLyBhbnkgY2xhc3MgaXMgYXZhaWxhYmxlLlxuICogICBiYXo6IEVycm9yIHwgTnVtYmVyOyAgICAgICAgICAgLy8gaWYgb25seSBvbmUgYXJndW1lbnQsIGBbXWAgaXMgbm90IHJlcXVpcmVkLlxuICogfVxuICpcbiAqIGludGVyZmFjZSBTYW1wbGVFdmVudCB7XG4gKiAgIGZ1Z2E6IFtudW1iZXIsIHN0cmluZ107ICAgICAgICAvLyBjYWxsYmFjayBmdW5jdGlvbidzIGFyZ3MgdHlwZSB0dXBsZVxuICogfVxuICpcbiAqIC8vIGRlY2xhcmUgY2xpZW50IGNsYXNzXG4gKiBjbGFzcyBTYW1wbGVTb3VyY2UgZXh0ZW5kcyBFdmVudFNvdXJjZTxTYW1wbGVFdmVudD4ge1xuICogICBjb25zdHJ1Y3Rvcih0YXJnZXQ6IEV2ZW50U291cmNlPFRhcmdldEV2ZW50Pikge1xuICogICAgIHN1cGVyKCk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsICdob2dlJywgKG51bTogbnVtYmVyLCBzdHI6IHN0cmluZykgPT4geyAuLi4gfSk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsICdiYXInLCAoZTogRXJyb3IpID0+IHsgLi4uIH0pO1xuICogICAgIHRoaXMubGlzdGVuVG8oYnJva2VyLCBbJ2ZvbycsICdob28nXSwgKCkgPT4geyAuLi4gfSk7XG4gKiAgIH1cbiAqXG4gKiAgIHJlbGVhc2UoKTogdm9pZCB7XG4gKiAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBzYW1wbGUgPSBuZXcgU2FtcGxlU291cmNlKCk7XG4gKlxuICogc2FtcGxlLm9uKCdmdWdhJywgKGE6IG51bWJlciwgYjogc3RyaW5nKSA9PiB7IC4uLiB9KTsgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogc2FtcGxlLnRyaWdnZXIoJ2Z1Z2EnLCAxMDAsICd0ZXN0Jyk7ICAgICAgICAgICAgICAgICAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogYGBgXG4gKi9cbmV4cG9ydCB0eXBlIF9FdmVudFNvdXJjZTxUIGV4dGVuZHMgb2JqZWN0PiA9IEV2ZW50QnJva2VyPFQ+ICYgRXZlbnRSZWNlaXZlcjtcblxuLyoqIEBpbnRlcm5hbCB7QGxpbmsgRXZlbnRTb3VyY2V9IGNsYXNzICovXG5jbGFzcyBFdmVudFNvdXJjZSBleHRlbmRzIG1peGlucyhFdmVudEJyb2tlciwgRXZlbnRSZWNlaXZlcikge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLnN1cGVyKEV2ZW50UmVjZWl2ZXIpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29uc3RydWN0b3Igb2Yge0BsaW5rIEV2ZW50U291cmNlfVxuICogQGphIHtAbGluayBFdmVudFNvdXJjZX0g44Gu44Kz44Oz44K544OI44Op44Kv44K/5a6f5L2TXG4gKi9cbmNvbnN0IF9FdmVudFNvdXJjZToge1xuICAgIHJlYWRvbmx5IHByb3RvdHlwZTogX0V2ZW50U291cmNlPGFueT47XG4gICAgbmV3IDxUIGV4dGVuZHMgb2JqZWN0PigpOiBfRXZlbnRTb3VyY2U8VD47XG59ID0gRXZlbnRTb3VyY2UgYXMgYW55O1xuXG5leHBvcnQgeyBfRXZlbnRTb3VyY2UgYXMgRXZlbnRTb3VyY2UgfTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBRUc7QUFtQkg7QUFDQSxNQUFNLGFBQWEsR0FBRyxJQUFJLE9BQU8sRUFBMEM7QUFFM0U7QUFDQSxTQUFTLFNBQVMsQ0FBbUIsUUFBMkIsRUFBQTtJQUM1RCxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtBQUM5QixRQUFBLE1BQU0sSUFBSSxTQUFTLENBQUMscUNBQXFDLENBQUM7O0FBRTlELElBQUEsT0FBTyxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBb0I7QUFDekQ7QUFFQTtBQUNBLFNBQVMsWUFBWSxDQUFDLE9BQWdCLEVBQUE7SUFDbEMsSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ3hDOztJQUVKLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBVyxRQUFBLEVBQUEsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUEwQix3QkFBQSxDQUFBLENBQUM7QUFDaEY7QUFFQTtBQUNBLFNBQVMsYUFBYSxDQUFDLFFBQTBDLEVBQUE7QUFDN0QsSUFBQSxJQUFJLElBQUksSUFBSSxRQUFRLEVBQUU7QUFDbEIsUUFBQSxNQUFNLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUM7O0FBRTFDLElBQUEsT0FBTyxRQUFRO0FBQ25CO0FBRUE7QUFDQSxTQUFTLFlBQVksQ0FDakIsR0FBd0IsRUFDeEIsT0FBZ0IsRUFDaEIsUUFBNEIsRUFDNUIsR0FBRyxJQUF3QyxFQUFBO0lBRTNDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO0lBQzdCLElBQUksQ0FBQyxJQUFJLEVBQUU7UUFDUDs7QUFFSixJQUFBLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxFQUFFO0FBQ3pCLFFBQUEsSUFBSTtBQUNBLFlBQUEsTUFBTSxTQUFTLEdBQUcsUUFBUSxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBSTtBQUN2RCxZQUFBLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxHQUFHLFNBQVMsQ0FBQzs7QUFFdEMsWUFBQSxJQUFJLElBQUksS0FBSyxPQUFPLEVBQUU7Z0JBQ2xCOzs7UUFFTixPQUFPLENBQUMsRUFBRTtBQUNSLFlBQUEsS0FBSyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzs7O0FBR2xDO0FBRUE7QUFFQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUE0Q0c7TUFDbUIsY0FBYyxDQUFBOztBQUdoQyxJQUFBLFdBQUEsR0FBQTtBQUNJLFFBQUEsTUFBTSxDQUFDLFlBQVksRUFBRSxjQUFjLEVBQUUsSUFBSSxDQUFDO1FBQzFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksR0FBRyxFQUFFLENBQUM7O0FBR3RDOzs7Ozs7Ozs7O0FBVUc7QUFDTyxJQUFBLE9BQU8sQ0FBOEIsT0FBZ0IsRUFBRSxHQUFHLElBQXdDLEVBQUE7QUFDeEcsUUFBQSxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQzNCLFlBQVksQ0FBQyxPQUFPLENBQUM7UUFDckIsWUFBWSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDOztBQUU5QyxRQUFBLElBQUksR0FBRyxLQUFLLE9BQU8sRUFBRTtZQUNqQixZQUFZLENBQUMsR0FBd0MsRUFBRSxHQUFHLEVBQUUsT0FBaUIsRUFBRSxHQUFHLElBQUksQ0FBQzs7Ozs7QUFPL0Y7Ozs7Ozs7Ozs7QUFVRztJQUNILFdBQVcsQ0FBOEIsT0FBaUIsRUFBRSxRQUEwRCxFQUFBO0FBQ2xILFFBQUEsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQztBQUMzQixRQUFBLElBQUksSUFBSSxJQUFJLE9BQU8sRUFBRTtBQUNqQixZQUFBLE9BQU8sR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDOztRQUV2QixZQUFZLENBQUMsT0FBTyxDQUFDO0FBQ3JCLFFBQUEsSUFBSSxJQUFJLElBQUksUUFBUSxFQUFFO0FBQ2xCLFlBQUEsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQzs7UUFFM0IsYUFBYSxDQUFDLFFBQVEsQ0FBQztRQUN2QixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQztBQUM3QixRQUFBLE9BQU8sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsS0FBSzs7QUFHNUM7OztBQUdHO0lBQ0gsUUFBUSxHQUFBO1FBQ0osT0FBTyxDQUFDLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDOztBQUd0Qzs7Ozs7Ozs7OztBQVVHO0lBQ0gsRUFBRSxDQUE4QixPQUE0QixFQUFFLFFBQXlELEVBQUE7QUFDbkgsUUFBQSxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQzNCLGFBQWEsQ0FBQyxRQUFRLENBQUM7QUFFdkIsUUFBQSxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDO0FBQ3ZELFFBQUEsS0FBSyxNQUFNLEVBQUUsSUFBSSxRQUFRLEVBQUU7WUFDdkIsWUFBWSxDQUFDLEVBQUUsQ0FBQztBQUNoQixZQUFBLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDOztRQUcvRSxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDakIsWUFBQSxJQUFJLE1BQU0sR0FBQTtBQUNOLGdCQUFBLEtBQUssTUFBTSxFQUFFLElBQUksUUFBUSxFQUFFO29CQUN2QixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7d0JBQ3RCLElBQUksQ0FBQyxXQUFXLEVBQUU7QUFDbEIsd0JBQUEsT0FBTyxLQUFLOzs7QUFHcEIsZ0JBQUEsT0FBTyxJQUFJO2FBQ2Q7WUFDRCxXQUFXLEdBQUE7QUFDUCxnQkFBQSxLQUFLLE1BQU0sRUFBRSxJQUFJLFFBQVEsRUFBRTtvQkFDdkIsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ3hCLElBQUksSUFBSSxFQUFFO0FBQ04sd0JBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7d0JBQ3JCLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDOzs7YUFHMUM7QUFDSixTQUFBLENBQUM7O0FBR047Ozs7Ozs7Ozs7QUFVRztJQUNILElBQUksQ0FBOEIsT0FBNEIsRUFBRSxRQUF5RCxFQUFBO1FBQ3JILE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQztRQUMxQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFLO1lBQ2xDLE9BQU8sQ0FBQyxXQUFXLEVBQUU7WUFDckIsT0FBTyxDQUFDLFdBQVcsRUFBRTtBQUN6QixTQUFDLENBQUM7QUFDRixRQUFBLE9BQU8sT0FBTzs7QUFHbEI7Ozs7Ozs7Ozs7Ozs7O0FBY0c7SUFDSCxHQUFHLENBQThCLE9BQTZCLEVBQUUsUUFBMEQsRUFBQTtBQUN0SCxRQUFBLE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUM7QUFDM0IsUUFBQSxJQUFJLElBQUksSUFBSSxPQUFPLEVBQUU7WUFDakIsR0FBRyxDQUFDLEtBQUssRUFBRTtBQUNYLFlBQUEsT0FBTyxJQUFJOztBQUdmLFFBQUEsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQztBQUN2RCxRQUFBLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUM7QUFDeEMsUUFBQSxLQUFLLE1BQU0sRUFBRSxJQUFJLFFBQVEsRUFBRTtZQUN2QixZQUFZLENBQUMsRUFBRSxDQUFDO0FBQ2hCLFlBQUEsSUFBSSxJQUFJLElBQUksUUFBUSxFQUFFO0FBQ2xCLGdCQUFBLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUNkOztpQkFDRztnQkFDSCxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxJQUFJLEVBQUU7QUFDTixvQkFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztvQkFDckIsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Ozs7QUFLM0MsUUFBQSxPQUFPLElBQUk7O0FBRWxCOztBQ2pTRDs7QUFFRztBQTRDSDs7O0FBR0c7QUFDSSxNQUFNLFdBQVcsR0FHcEI7QUFFSixXQUFXLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBSSxjQUFjLENBQUMsU0FBaUIsQ0FBQyxPQUFPOztBQzVDekUsaUJBQWlCLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7QUFZbkQ7QUFDQSxTQUFTLFFBQVEsQ0FBQyxPQUFnQixFQUFFLE1BQW9CLEVBQUUsT0FBMEIsRUFBRSxRQUF5QixFQUFBO0lBQzNHLE1BQU0sYUFBYSxHQUFtQixFQUFFO0FBRXhDLElBQUEsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQztBQUN2RCxJQUFBLEtBQUssTUFBTSxFQUFFLElBQUksUUFBUSxFQUFFO1FBQ3ZCLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQztBQUNqQyxRQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNsQixRQUFBLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBRXJCLFFBQUEsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxHQUFHLEVBQThDO0FBQ3BHLFFBQUEsTUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLEdBQUcsRUFBaUM7QUFDM0UsUUFBQSxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFFcEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDdEIsWUFBQSxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUM7O1FBRTVCLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMxQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDOzs7SUFJNUMsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQ2pCLFFBQUEsSUFBSSxNQUFNLEdBQUE7QUFDTixZQUFBLEtBQUssTUFBTSxDQUFDLElBQUksYUFBYSxFQUFFO0FBQzNCLGdCQUFBLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRTtBQUNWLG9CQUFBLE9BQU8sSUFBSTs7O0FBR25CLFlBQUEsT0FBTyxLQUFLO1NBQ2Y7UUFDRCxXQUFXLEdBQUE7QUFDUCxZQUFBLEtBQUssTUFBTSxDQUFDLElBQUksYUFBYSxFQUFFO2dCQUMzQixDQUFDLENBQUMsV0FBVyxFQUFFOztTQUV0QjtBQUNKLEtBQUEsQ0FBQztBQUNOO0FBRUE7QUFDQSxTQUFTLFVBQVUsQ0FBQyxPQUFnQixFQUFFLE1BQXFCLEVBQUUsT0FBMkIsRUFBRSxRQUEwQixFQUFBO0FBQ2hILElBQUEsSUFBSSxJQUFJLElBQUksTUFBTSxFQUFFO0FBQ2hCLFFBQUEsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDO1FBRTdCLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUMzQyxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ2Q7O0FBRUosUUFBQSxJQUFJLElBQUksSUFBSSxPQUFPLEVBQUU7QUFDakIsWUFBQSxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDO0FBQ3ZELFlBQUEsS0FBSyxNQUFNLEVBQUUsSUFBSSxRQUFRLEVBQUU7Z0JBQ3ZCLE1BQU0sR0FBRyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMvQixJQUFJLENBQUMsR0FBRyxFQUFFO29CQUNOOztxQkFDRyxJQUFJLFFBQVEsRUFBRTtvQkFDakIsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUM7b0JBQzNCLElBQUksQ0FBQyxFQUFFO3dCQUNILENBQUMsQ0FBQyxXQUFXLEVBQUU7QUFDZix3QkFBQSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7O0FBRXpCLG9CQUFBLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDOztxQkFDakI7b0JBQ0gsS0FBSyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUU7d0JBQzFCLENBQUMsQ0FBQyxXQUFXLEVBQUU7QUFDZix3QkFBQSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Ozs7O2FBSTlCO1lBQ0gsS0FBSyxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ3BDLEtBQUssTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFO29CQUMxQixDQUFDLENBQUMsV0FBVyxFQUFFO0FBQ2Ysb0JBQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDOzs7OztTQUk5QjtBQUNILFFBQUEsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsR0FBRyxFQUFFO1lBQ3pCLENBQUMsQ0FBQyxXQUFXLEVBQUU7O0FBRW5CLFFBQUEsT0FBTyxDQUFDLEdBQUcsR0FBRyxJQUFJLE9BQU8sRUFBRTtBQUMzQixRQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFOztBQUUzQjtBQUVBO0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWdERztNQUNVLGFBQWEsQ0FBQTs7SUFFTCxDQUFDLFFBQVE7O0FBRzFCLElBQUEsV0FBQSxHQUFBO0FBQ0ksUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxPQUFPLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxHQUFHLEVBQUUsRUFBRTs7QUFHM0Q7Ozs7Ozs7Ozs7Ozs7QUFhRztBQUNJLElBQUEsUUFBUSxDQUNYLE1BQVMsRUFDVCxPQUE0QixFQUM1QixRQUF5RCxFQUFBO0FBRXpELFFBQUEsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFpQixFQUFFLFFBQVEsQ0FBQzs7QUFHeEU7Ozs7Ozs7Ozs7Ozs7QUFhRztBQUNJLElBQUEsWUFBWSxDQUNmLE1BQVMsRUFDVCxPQUE0QixFQUM1QixRQUF5RCxFQUFBO0FBRXpELFFBQUEsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBaUIsRUFBRSxRQUFRLENBQUM7UUFDN0UsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBSztBQUNwQyxZQUFBLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQWlCLEVBQUUsUUFBUSxDQUFDO1lBQy9ELE9BQU8sQ0FBQyxXQUFXLEVBQUU7QUFDekIsU0FBQyxDQUFDO0FBQ0YsUUFBQSxPQUFPLE9BQU87O0FBR2xCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBbUJHO0FBQ0ksSUFBQSxhQUFhLENBQ2hCLE1BQVUsRUFDVixPQUE2QixFQUM3QixRQUEwRCxFQUFBO0FBRTFELFFBQUEsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBaUIsRUFBRSxRQUFRLENBQUM7QUFDL0QsUUFBQSxPQUFPLElBQUk7O0FBRWxCOztBQ3JQRDs7QUFFRztBQW9ESDtBQUNBLE1BQU0sV0FBWSxTQUFRLE1BQU0sQ0FBQyxXQUFXLEVBQUUsYUFBYSxDQUFDLENBQUE7QUFDeEQsSUFBQSxXQUFBLEdBQUE7QUFDSSxRQUFBLEtBQUssRUFBRTtBQUNQLFFBQUEsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUM7O0FBRWhDO0FBRUQ7OztBQUdHO0FBQ0csTUFBQSxZQUFZLEdBR2Q7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2V2ZW50cy8ifQ==