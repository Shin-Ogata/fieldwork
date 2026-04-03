/*!
 * @cdp/events 0.9.22
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRzLm1qcyIsInNvdXJjZXMiOlsicHVibGlzaGVyLnRzIiwiYnJva2VyLnRzIiwicmVjZWl2ZXIudHMiLCJzb3VyY2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgdHlwZSBBbnlGdW5jdGlvbixcbiAgICB0eXBlIEFyZ3VtZW50cyxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIGlzU3ltYm9sLFxuICAgIGNsYXNzTmFtZSxcbiAgICB2ZXJpZnksXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgRXZlbnRBbGwsXG4gICAgU3Vic2NyaXB0aW9uLFxuICAgIFN1YnNjcmliYWJsZSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBMaXNuZXIg5qC857SN5b2i5byPICovXG50eXBlIExpc3RlbmVyc01hcDxUPiA9IE1hcDxrZXlvZiBULCBTZXQ8QW55RnVuY3Rpb24+PjtcblxuLyoqIEBpbnRlcm5hbCBMaXNuZXIg44Gu5byx5Y+C54WnICovXG5jb25zdCBfbWFwTGlzdGVuZXJzID0gbmV3IFdlYWtNYXA8RXZlbnRQdWJsaXNoZXI8YW55PiwgTGlzdGVuZXJzTWFwPGFueT4+KCk7XG5cbi8qKiBAaW50ZXJuYWwgTGlzbmVyTWFwIOOBruWPluW+lyAqL1xuZnVuY3Rpb24gbGlzdGVuZXJzPFQgZXh0ZW5kcyBvYmplY3Q+KGluc3RhbmNlOiBFdmVudFB1Ymxpc2hlcjxUPik6IExpc3RlbmVyc01hcDxUPiB7XG4gICAgaWYgKCFfbWFwTGlzdGVuZXJzLmhhcyhpbnN0YW5jZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhpcyBpcyBub3QgYSB2YWxpZCBFdmVudFB1Ymxpc2hlci4nKTtcbiAgICB9XG4gICAgcmV0dXJuIF9tYXBMaXN0ZW5lcnMuZ2V0KGluc3RhbmNlKSBhcyBMaXN0ZW5lcnNNYXA8VD47XG59XG5cbi8qKiBAaW50ZXJuYWwgQ2hhbm5lbCDjga7lnovmpJzoqLwgKi9cbmZ1bmN0aW9uIHZhbGlkQ2hhbm5lbChjaGFubmVsOiB1bmtub3duKTogdm9pZCB8IG5ldmVyIHtcbiAgICBpZiAoaXNTdHJpbmcoY2hhbm5lbCkgfHwgaXNTeW1ib2woY2hhbm5lbCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBUeXBlIG9mICR7Y2xhc3NOYW1lKGNoYW5uZWwpfSBpcyBub3QgYSB2YWxpZCBjaGFubmVsLmApO1xufVxuXG4vKiogQGludGVybmFsIExpc3RlbmVyIOOBruWei+aknOiovCAqL1xuZnVuY3Rpb24gdmFsaWRMaXN0ZW5lcihsaXN0ZW5lcj86IEFueUZ1bmN0aW9uKTogYW55IHtcbiAgICBpZiAobnVsbCAhPSBsaXN0ZW5lcikge1xuICAgICAgICB2ZXJpZnkoJ3R5cGVPZicsICdmdW5jdGlvbicsIGxpc3RlbmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpc3RlbmVyO1xufVxuXG4vKiogQGludGVybmFsIGV2ZW50IOeZuuihjCAqL1xuZnVuY3Rpb24gdHJpZ2dlckV2ZW50PEV2ZW50LCBDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KFxuICAgIG1hcDogTGlzdGVuZXJzTWFwPEV2ZW50PixcbiAgICBjaGFubmVsOiBDaGFubmVsLFxuICAgIG9yaWdpbmFsOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgLi4uYXJnczogQXJndW1lbnRzPFBhcnRpYWw8RXZlbnRbQ2hhbm5lbF0+PlxuKTogdm9pZCB7XG4gICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2hhbm5lbCk7XG4gICAgaWYgKCFsaXN0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yIChjb25zdCBsaXN0ZW5lciBvZiBsaXN0KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBldmVudEFyZ3MgPSBvcmlnaW5hbCA/IFtvcmlnaW5hbCwgLi4uYXJnc10gOiBhcmdzO1xuICAgICAgICAgICAgY29uc3QgaGFuZGxlZCA9IGxpc3RlbmVyKC4uLmV2ZW50QXJncyk7XG4gICAgICAgICAgICAvLyBpZiByZWNlaXZlZCAndHJ1ZScsIHN0b3AgZGVsZWdhdGlvbi5cbiAgICAgICAgICAgIGlmICh0cnVlID09PSBoYW5kbGVkKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHZvaWQgUHJvbWlzZS5yZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBFdmVudGluZyBmcmFtZXdvcmsgY2xhc3Mgd2l0aCBlbnN1cmluZyB0eXBlLXNhZmUgZm9yIFR5cGVTY3JpcHQuIDxicj5cbiAqICAgICBUaGUgY2xpZW50IG9mIHRoaXMgY2xhc3MgY2FuIGltcGxlbWVudCBvcmlnaW5hbCBQdWItU3ViIChPYnNlcnZlcikgZGVzaWduIHBhdHRlcm4uXG4gKiBAamEg5Z6L5a6J5YWo44KS5L+d6Zqc44GZ44KL44Kk44OZ44Oz44OI55m76Yyy44O755m66KGM44Kv44Op44K5IDxicj5cbiAqICAgICDjgq/jg6njgqTjgqLjg7Pjg4jjga/mnKzjgq/jg6njgrnjgpLmtL7nlJ/jgZfjgabni6zoh6rjga4gUHViLVN1YiAoT2JzZXJ2ZXIpIOODkeOCv+ODvOODs+OCkuWun+ijheWPr+iDvVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIC8vIGRlY2xhcmUgZXZlbnQgaW50ZXJmYWNlXG4gKiBpbnRlcmZhY2UgU2FtcGxlRXZlbnQge1xuICogICBob2dlOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqICAgZm9vOiBbdm9pZF07ICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3NcbiAqICAgaG9vOiB2b2lkOyAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3MgKHNhbWUgdGhlIHVwb24pXG4gKiAgIGJhcjogW0Vycm9yXTsgICAgICAgICAgICAgICAgICAvLyBhbnkgY2xhc3MgaXMgYXZhaWxhYmxlLlxuICogICBiYXo6IEVycm9yIHwgTnVtYmVyOyAgICAgICAgICAgLy8gaWYgb25seSBvbmUgYXJndW1lbnQsIGBbXWAgaXMgbm90IHJlcXVpcmVkLlxuICogfVxuICpcbiAqIC8vIGRlY2xhcmUgY2xpZW50IGNsYXNzXG4gKiBjbGFzcyBTYW1wbGVQdWJsaXNoZXIgZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxTYW1wbGVFdmVudD4ge1xuICogICA6XG4gKiAgIHNvbWVNZXRob2QoKTogdm9pZCB7XG4gKiAgICAgdGhpcy5wdWJsaXNoKCdob2dlJywgMTAwLCAndGVzdCcpOyAgICAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiAgICAgdGhpcy5wdWJsaXNoKCdob2dlJywgMTAwLCB0cnVlKTsgICAgICAgICAvLyBORy4gYXJndW1lbnQgb2YgdHlwZSAndHJ1ZScgaXMgbm90IGFzc2lnbmFibGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBwYXJhbWV0ZXIgb2YgdHlwZSAnc3RyaW5nIHwgdW5kZWZpbmVkJy5cbiAqICAgICB0aGlzLnB1Ymxpc2goJ2hvZ2UnLCAxMDApOyAgICAgICAgICAgICAgIC8vIE9LLiBhbGwgYXJncyB0byBiZSBvcHRpb25hbCBhdXRvbWF0aWNhbGx5LlxuICogICAgIHRoaXMucHVibGlzaCgnZm9vJyk7ICAgICAgICAgICAgICAgICAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogICAgIHRoaXMucHVibGlzaCgnZm9vJywgMTAwKTsgICAgICAgICAgICAgICAgLy8gTkcuIGFyZ3VtZW50IG9mIHR5cGUgJzEwMCcgaXMgbm90IGFzc2lnbmFibGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBwYXJhbWV0ZXIgb2YgdHlwZSAndm9pZCB8IHVuZGVmaW5lZCcuXG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBzYW1wbGUgPSBuZXcgU2FtcGxlUHVibGlzaGVyKCk7XG4gKlxuICogc2FtcGxlLm9uKCdob2dlJywgKGE6IG51bWJlciwgYjogc3RyaW5nKSA9PiB7IC4uLiB9KTsgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogc2FtcGxlLm9uKCdob2dlJywgKGE6IG51bWJlciwgYjogYm9vbGVhbikgPT4geyAuLi4gfSk7ICAgLy8gTkcuIHR5cGVzIG9mIHBhcmFtZXRlcnMgJ2InXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgYW5kICdhcmdzXzEnIGFyZSBpbmNvbXBhdGlibGUuXG4gKiBzYW1wbGUub24oJ2hvZ2UnLCAoYSkgPT4geyAuLi4gfSk7ICAgICAgICAgICAgICAgICAgICAgICAvLyBPSy4gYWxsIGFyZ3NcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBiZSBvcHRpb25hbCBhdXRvbWF0aWNhbGx5LlxuICogc2FtcGxlLm9uKCdob2dlJywgKGEsIGIsIGMpID0+IHsgLi4uIH0pOyAgICAgICAgICAgICAgICAgLy8gTkcuIGV4cGVjdGVkIDEtMiBhcmd1bWVudHMsXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgYnV0IGdvdCAzLlxuICogYGBgXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBFdmVudFB1Ymxpc2hlcjxFdmVudCBleHRlbmRzIG9iamVjdD4gaW1wbGVtZW50cyBTdWJzY3JpYmFibGU8RXZlbnQ+IHtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBFdmVudFB1Ymxpc2hlciwgdGhpcyk7XG4gICAgICAgIF9tYXBMaXN0ZW5lcnMuc2V0KHRoaXMsIG5ldyBNYXAoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE5vdGlmeSBldmVudCB0byBjbGllbnRzLlxuICAgICAqIEBqYSBldmVudCDnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgavmuKHjgZnlvJXmlbBcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgcHVibGlzaDxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwsIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICB2YWxpZENoYW5uZWwoY2hhbm5lbCk7XG4gICAgICAgIHRyaWdnZXJFdmVudChtYXAsIGNoYW5uZWwsIHVuZGVmaW5lZCwgLi4uYXJncyk7XG4gICAgICAgIC8vIHRyaWdnZXIgZm9yIGFsbCBoYW5kbGVyXG4gICAgICAgIGlmICgnKicgIT09IGNoYW5uZWwpIHtcbiAgICAgICAgICAgIHRyaWdnZXJFdmVudChtYXAgYXMgdW5rbm93biBhcyBMaXN0ZW5lcnNNYXA8RXZlbnRBbGw+LCAnKicsIGNoYW5uZWwgYXMgc3RyaW5nLCAuLi5hcmdzKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFN1YnNjcmliYWJsZTxFdmVudD5cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIHRoaXMgb2JqZWN0IGhhcyBjbGllbnRzLlxuICAgICAqIEBqYSDjgq/jg6njgqTjgqLjg7Pjg4jjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIGhhc0xpc3RlbmVyPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbD86IENoYW5uZWwsIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICBpZiAobnVsbCA9PSBjaGFubmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFwLnNpemUgPiAwO1xuICAgICAgICB9XG4gICAgICAgIHZhbGlkQ2hhbm5lbChjaGFubmVsKTtcbiAgICAgICAgaWYgKG51bGwgPT0gbGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXAuaGFzKGNoYW5uZWwpO1xuICAgICAgICB9XG4gICAgICAgIHZhbGlkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaGFubmVsKTtcbiAgICAgICAgcmV0dXJuIGxpc3QgPyBsaXN0LmhhcyhsaXN0ZW5lcikgOiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyByZWdpc3RlcmVkIGNoYW5uZWwga2V5cy5cbiAgICAgKiBAamEg55m76Yyy44GV44KM44Gm44GE44KL44OB44Oj44ON44Or44Kt44O844KS6L+U5Y20XG4gICAgICovXG4gICAgY2hhbm5lbHMoKTogKGtleW9mIEV2ZW50KVtdIHtcbiAgICAgICAgcmV0dXJuIFsuLi5saXN0ZW5lcnModGhpcykua2V5cygpXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVycyh0aGlzKTtcbiAgICAgICAgdmFsaWRMaXN0ZW5lcihsaXN0ZW5lcik7XG5cbiAgICAgICAgY29uc3QgY2hhbm5lbHMgPSBpc0FycmF5KGNoYW5uZWwpID8gY2hhbm5lbCA6IFtjaGFubmVsXTtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgdmFsaWRDaGFubmVsKGNoKTtcbiAgICAgICAgICAgIG1hcC5oYXMoY2gpID8gbWFwLmdldChjaCkhLmFkZChsaXN0ZW5lcikgOiBtYXAuc2V0KGNoLCBuZXcgU2V0KFtsaXN0ZW5lcl0pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3QuZnJlZXplKHtcbiAgICAgICAgICAgIGdldCBlbmFibGUoKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbGlzdD8uaGFzKGxpc3RlbmVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVuc3Vic2NyaWJlKCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2gpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGlzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdC5kZWxldGUobGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdC5zaXplID4gMCB8fCBtYXAuZGVsZXRlKGNoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykgYnV0IGl0IGNhdXNlcyB0aGUgYm91bmQgY2FsbGJhY2sgdG8gb25seSBmaXJlIG9uY2UgYmVmb3JlIGJlaW5nIHJlbW92ZWQuXG4gICAgICogQGphIOS4gOW6puOBoOOBkeODj+ODs+ODieODquODs+OCsOWPr+iDveOBquOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uY2U8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5vbihjaGFubmVsLCBsaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IG1hbmFnZWQgPSB0aGlzLm9uKGNoYW5uZWwsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnRleHQudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIG1hbmFnZWQudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjb250ZXh0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBldmVyeXRoaW5nIGlzIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/jgZnjgbnjgabop6PpmaRcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgYWxsIHNhbWUgYGNoYW5uZWxgIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lkIzkuIAgYGNoYW5uZWxgIOOBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIG9mZjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw/OiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVycyh0aGlzKTtcbiAgICAgICAgaWYgKG51bGwgPT0gY2hhbm5lbCkge1xuICAgICAgICAgICAgbWFwLmNsZWFyKCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNoYW5uZWxzID0gaXNBcnJheShjaGFubmVsKSA/IGNoYW5uZWwgOiBbY2hhbm5lbF07XG4gICAgICAgIGNvbnN0IGNhbGxiYWNrID0gdmFsaWRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgIHZhbGlkQ2hhbm5lbChjaCk7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIG1hcC5kZWxldGUoY2gpO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaCk7XG4gICAgICAgICAgICAgICAgaWYgKGxpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdC5kZWxldGUoY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgICAgICBsaXN0LnNpemUgPiAwIHx8IG1hcC5kZWxldGUoY2gpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEFyZ3VtZW50cyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IFN1YnNjcmliYWJsZSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBFdmVudFB1Ymxpc2hlciB9IGZyb20gJy4vcHVibGlzaGVyJztcblxuLyoqIHJlLWV4cG9ydCAqL1xuZXhwb3J0IHR5cGUgRXZlbnRBcmd1bWVudHM8VD4gPSBBcmd1bWVudHM8VD47XG5cbi8qKlxuICogQGVuIEV2ZW50aW5nIGZyYW1ld29yayBvYmplY3QgYWJsZSB0byBjYWxsIGBwdWJsaXNoKClgIG1ldGhvZCBmcm9tIG91dHNpZGUuXG4gKiBAamEg5aSW6YOo44GL44KJ44GuIGBwdWJsaXNoKClgIOOCkuWPr+iDveOBq+OBl+OBn+OCpOODmeODs+ODiOeZu+mMsuODu+eZuuihjOOCr+ODqeOCuVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIC8vIGRlY2xhcmUgZXZlbnQgaW50ZXJmYWNlXG4gKiBpbnRlcmZhY2UgU2FtcGxlRXZlbnQge1xuICogICBob2dlOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqIH1cbiAqXG4gKiBjb25zdCBicm9rZXIgPSBuZXcgRXZlbnRCcm9rZXI8U2FtcGxlRXZlbnQ+KCk7XG4gKiBicm9rZXIudHJpZ2dlcignaG9nZScsIDEwMCwgJ3Rlc3QnKTsgICAgIC8vIE9LLiBzdGFuZGFyZCB1c2FnZS5cbiAqIGJyb2tlci50cmlnZ2VyKCdob2dlJywgMTAwLCB0cnVlKTsgICAgICAgLy8gTkcuIGFyZ3VtZW50IG9mIHR5cGUgJ3RydWUnIGlzIG5vdCBhc3NpZ25hYmxlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBwYXJhbWV0ZXIgb2YgdHlwZSAnc3RyaW5nIHwgdW5kZWZpbmVkJy5cbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEV2ZW50QnJva2VyPEV2ZW50IGV4dGVuZHMgb2JqZWN0PiBleHRlbmRzIFN1YnNjcmliYWJsZTxFdmVudD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBOb3RpZnkgZXZlbnQgdG8gY2xpZW50cy5cbiAgICAgKiBAamEgZXZlbnQg55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgYXJndW1lbnRzIGZvciBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWw44Gr5rih44GZ5byV5pWwXG4gICAgICovXG4gICAgdHJpZ2dlcjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwsIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj4pOiB2b2lkO1xufVxuXG4vKipcbiAqIEBlbiBDb25zdHJ1Y3RvciBvZiB7QGxpbmsgRXZlbnRCcm9rZXJ9XG4gKiBAamEge0BsaW5rIEV2ZW50QnJva2VyfSDjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/lrp/kvZNcbiAqL1xuZXhwb3J0IGNvbnN0IEV2ZW50QnJva2VyOiB7XG4gICAgcmVhZG9ubHkgcHJvdG90eXBlOiBFdmVudEJyb2tlcjxhbnk+O1xuICAgIG5ldyA8VCBleHRlbmRzIG9iamVjdD4oKTogRXZlbnRCcm9rZXI8VD47XG59ID0gRXZlbnRQdWJsaXNoZXIgYXMgYW55O1xuXG5FdmVudEJyb2tlci5wcm90b3R5cGUudHJpZ2dlciA9IChFdmVudFB1Ymxpc2hlci5wcm90b3R5cGUgYXMgYW55KS5wdWJsaXNoO1xuIiwiaW1wb3J0IHtcbiAgICB0eXBlIEFueUZ1bmN0aW9uLFxuICAgIHR5cGUgQXJndW1lbnRzLFxuICAgIGlzQXJyYXksXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgU3Vic2NyaWJhYmxlLFxuICAgIFN1YnNjcmlwdGlvbixcbiAgICBFdmVudFNjaGVtYSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY29udGV4dCA9IFN5bWJvbCgnY29udGV4dCcpO1xuLyoqIEBpbnRlcm5hbCAqLyB0eXBlIFN1YnNjcmlwdGlvbk1hcCA9IE1hcDxBbnlGdW5jdGlvbiwgU3Vic2NyaXB0aW9uPjtcbi8qKiBAaW50ZXJuYWwgKi8gdHlwZSBMaXN0ZXJNYXAgICAgICAgPSBNYXA8c3RyaW5nLCBTdWJzY3JpcHRpb25NYXA+O1xuLyoqIEBpbnRlcm5hbCAqLyB0eXBlIFN1YnNjcmlwdGlvblNldCA9IFNldDxTdWJzY3JpcHRpb24+O1xuLyoqIEBpbnRlcm5hbCAqLyB0eXBlIFN1YnNjcmliYWJsZU1hcCA9IFdlYWtNYXA8U3Vic2NyaWJhYmxlLCBMaXN0ZXJNYXA+O1xuXG4vKiogQGludGVybmFsIExpc25lciDmoLzntI3lvaLlvI8gKi9cbmludGVyZmFjZSBDb250ZXh0IHtcbiAgICBtYXA6IFN1YnNjcmliYWJsZU1hcDtcbiAgICBzZXQ6IFN1YnNjcmlwdGlvblNldDtcbn1cblxuLyoqIEBpbnRlcm5hbCByZWdpc3RlciBsaXN0ZW5lciBjb250ZXh0ICovXG5mdW5jdGlvbiByZWdpc3Rlcihjb250ZXh0OiBDb250ZXh0LCB0YXJnZXQ6IFN1YnNjcmliYWJsZSwgY2hhbm5lbDogc3RyaW5nIHwgc3RyaW5nW10sIGxpc3RlbmVyOiBBbnlGdW5jdGlvbik6IFN1YnNjcmlwdGlvbiB7XG4gICAgY29uc3Qgc3Vic2NyaXB0aW9uczogU3Vic2NyaXB0aW9uW10gPSBbXTtcblxuICAgIGNvbnN0IGNoYW5uZWxzID0gaXNBcnJheShjaGFubmVsKSA/IGNoYW5uZWwgOiBbY2hhbm5lbF07XG4gICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICBjb25zdCBzID0gdGFyZ2V0Lm9uKGNoLCBsaXN0ZW5lcik7XG4gICAgICAgIGNvbnRleHQuc2V0LmFkZChzKTtcbiAgICAgICAgc3Vic2NyaXB0aW9ucy5wdXNoKHMpO1xuXG4gICAgICAgIGNvbnN0IGxpc3RlbmVyTWFwID0gY29udGV4dC5tYXAuZ2V0KHRhcmdldCkgPz8gbmV3IE1hcDxzdHJpbmcsIE1hcDxBbnlGdW5jdGlvbiwgU3Vic2NyaXB0aW9uPj4oKTtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJNYXAuZ2V0KGNoKSA/PyBuZXcgTWFwPEFueUZ1bmN0aW9uLCBTdWJzY3JpcHRpb24+KCk7XG4gICAgICAgIG1hcC5zZXQobGlzdGVuZXIsIHMpO1xuXG4gICAgICAgIGlmICghbGlzdGVuZXJNYXAuaGFzKGNoKSkge1xuICAgICAgICAgICAgbGlzdGVuZXJNYXAuc2V0KGNoLCBtYXApO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY29udGV4dC5tYXAuaGFzKHRhcmdldCkpIHtcbiAgICAgICAgICAgIGNvbnRleHQubWFwLnNldCh0YXJnZXQsIGxpc3RlbmVyTWFwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBPYmplY3QuZnJlZXplKHtcbiAgICAgICAgZ2V0IGVuYWJsZSgpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBzdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKHMuZW5hYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgdW5zdWJzY3JpYmUoKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2Ygc3Vic2NyaXB0aW9ucykge1xuICAgICAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9KTtcbn1cblxuLyoqIEBpbnRlcm5hbCB1bnJlZ2lzdGVyIGxpc3RlbmVyIGNvbnRleHQgKi9cbmZ1bmN0aW9uIHVucmVnaXN0ZXIoY29udGV4dDogQ29udGV4dCwgdGFyZ2V0PzogU3Vic2NyaWJhYmxlLCBjaGFubmVsPzogc3RyaW5nIHwgc3RyaW5nW10sIGxpc3RlbmVyPzogQW55RnVuY3Rpb24pOiB2b2lkIHtcbiAgICBpZiAobnVsbCAhPSB0YXJnZXQpIHtcbiAgICAgICAgdGFyZ2V0Lm9mZihjaGFubmVsLCBsaXN0ZW5lcik7XG5cbiAgICAgICAgY29uc3QgbGlzdGVuZXJNYXAgPSBjb250ZXh0Lm1hcC5nZXQodGFyZ2V0KTtcbiAgICAgICAgaWYgKCFsaXN0ZW5lck1hcCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudWxsICE9IGNoYW5uZWwpIHtcbiAgICAgICAgICAgIGNvbnN0IGNoYW5uZWxzID0gaXNBcnJheShjaGFubmVsKSA/IGNoYW5uZWwgOiBbY2hhbm5lbF07XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJNYXAuZ2V0KGNoKTtcbiAgICAgICAgICAgICAgICBpZiAoIW1hcCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gbWFwLmdldChsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnNldC5kZWxldGUocyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbWFwLmRlbGV0ZShsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIG1hcC52YWx1ZXMoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5zZXQuZGVsZXRlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChjb25zdCBtYXAgb2YgbGlzdGVuZXJNYXAudmFsdWVzKCkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2YgbWFwLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5zZXQuZGVsZXRlKHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAoY29uc3QgcyBvZiBjb250ZXh0LnNldCkge1xuICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQubWFwID0gbmV3IFdlYWtNYXAoKTtcbiAgICAgICAgY29udGV4dC5zZXQuY2xlYXIoKTtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3MgdG8gd2hpY2ggdGhlIHNhZmUgZXZlbnQgcmVnaXN0ZXIvdW5yZWdpc3RlciBtZXRob2QgaXMgb2ZmZXJlZCBmb3IgdGhlIG9iamVjdCB3aGljaCBpcyBhIHNob3J0IGxpZmUgY3ljbGUgdGhhbiBzdWJzY3JpcHRpb24gdGFyZ2V0LiA8YnI+XG4gKiAgICAgVGhlIGFkdmFudGFnZSBvZiB1c2luZyB0aGlzIGZvcm0sIGluc3RlYWQgb2YgYG9uKClgLCBpcyB0aGF0IGBsaXN0ZW5UbygpYCBhbGxvd3MgdGhlIG9iamVjdCB0byBrZWVwIHRyYWNrIG9mIHRoZSBldmVudHMsXG4gKiAgICAgYW5kIHRoZXkgY2FuIGJlIHJlbW92ZWQgYWxsIGF0IG9uY2UgbGF0ZXIgY2FsbCBgc3RvcExpc3RlbmluZygpYC5cbiAqIEBqYSDos7zoqq3lr77osaHjgojjgorjgoLjg6njgqTjg5XjgrXjgqTjgq/jg6vjgYznn63jgYTjgqrjg5bjgrjjgqfjgq/jg4jjgavlr77jgZfjgaYsIOWuieWFqOOBquOCpOODmeODs+ODiOeZu+mMsi/op6PpmaTjg6Hjgr3jg4Pjg4njgpLmj5DkvpvjgZnjgovjgq/jg6njgrkgPGJyPlxuICogICAgIGBvbigpYCDjga7ku6Pjgo/jgorjgasgYGxpc3RlblRvKClgIOOCkuS9v+eUqOOBmeOCi+OBk+OBqOOBpywg5b6M44GrIGBzdG9wTGlzdGVuaW5nKClgIOOCkjHluqblkbzjgbbjgaDjgZHjgafjgZnjgbnjgabjga7jg6rjgrnjg4rjg7zjgpLop6PpmaTjgafjgY3jgovliKnngrnjgYzjgYLjgosuXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBFdmVudFJlY2VpdmVyLCBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogLy8gZGVjbGFyZSBldmVudCBpbnRlcmZhY2VcbiAqIGludGVyZmFjZSBTYW1wbGVFdmVudCB7XG4gKiAgIGhvZ2U6IFtudW1iZXIsIHN0cmluZ107ICAgICAgICAvLyBjYWxsYmFjayBmdW5jdGlvbidzIGFyZ3MgdHlwZSB0dXBsZVxuICogICBmb286IFt2b2lkXTsgICAgICAgICAgICAgICAgICAgLy8gbm8gYXJnc1xuICogICBob286IHZvaWQ7ICAgICAgICAgICAgICAgICAgICAgLy8gbm8gYXJncyAoc2FtZSB0aGUgdXBvbilcbiAqICAgYmFyOiBbRXJyb3JdOyAgICAgICAgICAgICAgICAgIC8vIGFueSBjbGFzcyBpcyBhdmFpbGFibGUuXG4gKiAgIGJhejogRXJyb3IgfCBOdW1iZXI7ICAgICAgICAgICAvLyBpZiBvbmx5IG9uZSBhcmd1bWVudCwgYFtdYCBpcyBub3QgcmVxdWlyZWQuXG4gKiB9XG4gKlxuICogLy8gZGVjbGFyZSBjbGllbnQgY2xhc3NcbiAqIGNsYXNzIFNhbXBsZVJlY2VpdmVyIGV4dGVuZHMgRXZlbnRSZWNlaXZlciB7XG4gKiAgIGNvbnN0cnVjdG9yKGJyb2tlcjogRXZlbnRCcm9rZXI8U2FtcGxlRXZlbnQ+KSB7XG4gKiAgICAgc3VwZXIoKTtcbiAqICAgICB0aGlzLmxpc3RlblRvKGJyb2tlciwgJ2hvZ2UnLCAobnVtOiBudW1iZXIsIHN0cjogc3RyaW5nKSA9PiB7IC4uLiB9KTtcbiAqICAgICB0aGlzLmxpc3RlblRvKGJyb2tlciwgJ2JhcicsIChlOiBFcnJvcikgPT4geyAuLi4gfSk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsIFsnZm9vJywgJ2hvbyddLCAoKSA9PiB7IC4uLiB9KTtcbiAqICAgfVxuICpcbiAqICAgcmVsZWFzZSgpOiB2b2lkIHtcbiAqICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICogb3JcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgYnJva2VyICAgPSBuZXcgRXZlbnRCcm9rZXI8U2FtcGxlRXZlbnQ+KCk7XG4gKiBjb25zdCByZWNlaXZlciA9IG5ldyBFdmVudFJlY2VpdmVyKCk7XG4gKlxuICogcmVjZWl2ZXIubGlzdGVuVG8oYnJva2VyLCAnaG9nZScsIChudW06IG51bWJlciwgc3RyOiBzdHJpbmcpID0+IHsgLi4uIH0pO1xuICogcmVjZWl2ZXIubGlzdGVuVG8oYnJva2VyLCAnYmFyJywgKGU6IEVycm9yKSA9PiB7IC4uLiB9KTtcbiAqIHJlY2VpdmVyLmxpc3RlblRvKGJyb2tlciwgWydmb28nLCAnaG9vJ10sICgpID0+IHsgLi4uIH0pO1xuICpcbiAqIHJlY2VpdmVyLnN0b3BMaXN0ZW5pbmcoKTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgRXZlbnRSZWNlaXZlciB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19jb250ZXh0XTogQ29udGV4dDtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzW19jb250ZXh0XSA9IHsgbWFwOiBuZXcgV2Vha01hcCgpLCBzZXQ6IG5ldyBTZXQoKSB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUZWxsIGFuIG9iamVjdCB0byBsaXN0ZW4gdG8gYSBwYXJ0aWN1bGFyIGV2ZW50IG9uIGFuIG90aGVyIG9iamVjdC5cbiAgICAgKiBAamEg5a++6LGh44Kq44OW44K444Kn44Kv44OI44Gu44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0XG4gICAgICogIC0gYGVuYCBldmVudCBsaXN0ZW5pbmcgdGFyZ2V0IG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOizvOiqreWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgbGlzdGVuVG88VCBleHRlbmRzIFN1YnNjcmliYWJsZSwgRXZlbnQgZXh0ZW5kcyBFdmVudFNjaGVtYTxUPiA9IEV2ZW50U2NoZW1hPFQ+LCBDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQgPSBrZXlvZiBFdmVudD4oXG4gICAgICAgIHRhcmdldDogVCxcbiAgICAgICAgY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSxcbiAgICAgICAgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duXG4gICAgKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgcmV0dXJuIHJlZ2lzdGVyKHRoaXNbX2NvbnRleHRdLCB0YXJnZXQsIGNoYW5uZWwgYXMgc3RyaW5nLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEp1c3QgbGlrZSBsaXN0ZW5UbywgYnV0IGNhdXNlcyB0aGUgYm91bmQgY2FsbGJhY2sgdG8gZmlyZSBvbmx5IG9uY2UgYmVmb3JlIGJlaW5nIHJlbW92ZWQuXG4gICAgICogQGphIOWvvuixoeOCquODluOCuOOCp+OCr+ODiOOBruS4gOW6puOBoOOBkeODj+ODs+ODieODquODs+OCsOWPr+iDveOBquOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHRhcmdldFxuICAgICAqICAtIGBlbmAgZXZlbnQgbGlzdGVuaW5nIHRhcmdldCBvYmplY3QuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jos7zoqq3lr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIGxpc3RlblRvT25jZTxUIGV4dGVuZHMgU3Vic2NyaWJhYmxlLCBFdmVudCBleHRlbmRzIEV2ZW50U2NoZW1hPFQ+ID0gRXZlbnRTY2hlbWE8VD4sIENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudCA9IGtleW9mIEV2ZW50PihcbiAgICAgICAgdGFyZ2V0OiBULFxuICAgICAgICBjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLFxuICAgICAgICBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd25cbiAgICApOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gcmVnaXN0ZXIodGhpc1tfY29udGV4dF0sIHRhcmdldCwgY2hhbm5lbCBhcyBzdHJpbmcsIGxpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgbWFuYWdlZCA9IHRhcmdldC5vbihjaGFubmVsLCAoKSA9PiB7XG4gICAgICAgICAgICB1bnJlZ2lzdGVyKHRoaXNbX2NvbnRleHRdLCB0YXJnZXQsIGNoYW5uZWwgYXMgc3RyaW5nLCBsaXN0ZW5lcik7XG4gICAgICAgICAgICBtYW5hZ2VkLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29udGV4dDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGVsbCBhbiBvYmplY3QgdG8gc3RvcCBsaXN0ZW5pbmcgdG8gZXZlbnRzLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXRcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGxpc3RlbmluZyB0YXJnZXQgb2JqZWN0LlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBldmVyeXRoaW5nIGlzIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI6LO86Kqt5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OIXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg6rjgrnjg4rjg7zjgpLop6PpmaRcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBldmVyeXRoaW5nIGlzIHJlbGVhc2VkIGxpc3RlbmVycyBmcm9tIGB0YXJnZXRgLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lr77osaEgYHRhcmdldGAg44Gu44Oq44K544OK44O844KS44GZ44G544Gm6Kej6ZmkXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RvcExpc3RlbmluZzxUIGV4dGVuZHMgU3Vic2NyaWJhYmxlLCBFdmVudCBleHRlbmRzIEV2ZW50U2NoZW1hPFQ+ID0gRXZlbnRTY2hlbWE8VD4sIENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudCA9IGtleW9mIEV2ZW50PihcbiAgICAgICAgdGFyZ2V0PzogVCxcbiAgICAgICAgY2hhbm5lbD86IENoYW5uZWwgfCBDaGFubmVsW10sXG4gICAgICAgIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd25cbiAgICApOiB0aGlzIHtcbiAgICAgICAgdW5yZWdpc3Rlcih0aGlzW19jb250ZXh0XSwgdGFyZ2V0LCBjaGFubmVsIGFzIHN0cmluZywgbGlzdGVuZXIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHsgbWl4aW5zIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50QnJva2VyIH0gZnJvbSAnLi9icm9rZXInO1xuaW1wb3J0IHsgRXZlbnRSZWNlaXZlciB9IGZyb20gJy4vcmVjZWl2ZXInO1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3Mgd2hpY2ggaGF2ZSBJL0Ygb2Yge0BsaW5rIEV2ZW50QnJva2VyfSBhbmQge0BsaW5rIEV2ZW50UmVjZWl2ZXJ9LiA8YnI+XG4gKiAgICAgYEV2ZW50c2AgY2xhc3Mgb2YgYEJhY2tib25lLmpzYCBlcXVpdmFsZW5jZS5cbiAqIEBqYSB7QGxpbmsgRXZlbnRCcm9rZXJ9IOOBqCB7QGxpbmsgRXZlbnRSZWNlaXZlcn0g44GuIEkvRiDjgpLjgYLjgo/jgZvmjIHjgaTjgq/jg6njgrkgPGJyPlxuICogICAgIGBCYWNrYm9uZS5qc2Ag44GuIGBFdmVudHNgIOOCr+ODqeOCueebuOW9k1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgRXZlbnRTb3VyY2UgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIC8vIGRlY2xhcmUgZXZlbnQgaW50ZXJmYWNlXG4gKiBpbnRlcmZhY2UgVGFyZ2V0RXZlbnQge1xuICogICBob2dlOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqICAgZm9vOiBbdm9pZF07ICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3NcbiAqICAgaG9vOiB2b2lkOyAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3MgKHNhbWUgdGhlIHVwb24pXG4gKiAgIGJhcjogW0Vycm9yXTsgICAgICAgICAgICAgICAgICAvLyBhbnkgY2xhc3MgaXMgYXZhaWxhYmxlLlxuICogICBiYXo6IEVycm9yIHwgTnVtYmVyOyAgICAgICAgICAgLy8gaWYgb25seSBvbmUgYXJndW1lbnQsIGBbXWAgaXMgbm90IHJlcXVpcmVkLlxuICogfVxuICpcbiAqIGludGVyZmFjZSBTYW1wbGVFdmVudCB7XG4gKiAgIGZ1Z2E6IFtudW1iZXIsIHN0cmluZ107ICAgICAgICAvLyBjYWxsYmFjayBmdW5jdGlvbidzIGFyZ3MgdHlwZSB0dXBsZVxuICogfVxuICpcbiAqIC8vIGRlY2xhcmUgY2xpZW50IGNsYXNzXG4gKiBjbGFzcyBTYW1wbGVTb3VyY2UgZXh0ZW5kcyBFdmVudFNvdXJjZTxTYW1wbGVFdmVudD4ge1xuICogICBjb25zdHJ1Y3Rvcih0YXJnZXQ6IEV2ZW50U291cmNlPFRhcmdldEV2ZW50Pikge1xuICogICAgIHN1cGVyKCk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsICdob2dlJywgKG51bTogbnVtYmVyLCBzdHI6IHN0cmluZykgPT4geyAuLi4gfSk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsICdiYXInLCAoZTogRXJyb3IpID0+IHsgLi4uIH0pO1xuICogICAgIHRoaXMubGlzdGVuVG8oYnJva2VyLCBbJ2ZvbycsICdob28nXSwgKCkgPT4geyAuLi4gfSk7XG4gKiAgIH1cbiAqXG4gKiAgIHJlbGVhc2UoKTogdm9pZCB7XG4gKiAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBzYW1wbGUgPSBuZXcgU2FtcGxlU291cmNlKCk7XG4gKlxuICogc2FtcGxlLm9uKCdmdWdhJywgKGE6IG51bWJlciwgYjogc3RyaW5nKSA9PiB7IC4uLiB9KTsgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogc2FtcGxlLnRyaWdnZXIoJ2Z1Z2EnLCAxMDAsICd0ZXN0Jyk7ICAgICAgICAgICAgICAgICAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogYGBgXG4gKi9cbmV4cG9ydCB0eXBlIF9FdmVudFNvdXJjZTxUIGV4dGVuZHMgb2JqZWN0PiA9IEV2ZW50QnJva2VyPFQ+ICYgRXZlbnRSZWNlaXZlcjtcblxuLyoqIEBpbnRlcm5hbCB7QGxpbmsgRXZlbnRTb3VyY2V9IGNsYXNzICovXG5jbGFzcyBFdmVudFNvdXJjZSBleHRlbmRzIG1peGlucyhFdmVudEJyb2tlciwgRXZlbnRSZWNlaXZlcikge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLnN1cGVyKEV2ZW50UmVjZWl2ZXIpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29uc3RydWN0b3Igb2Yge0BsaW5rIEV2ZW50U291cmNlfVxuICogQGphIHtAbGluayBFdmVudFNvdXJjZX0g44Gu44Kz44Oz44K544OI44Op44Kv44K/5a6f5L2TXG4gKi9cbmNvbnN0IF9FdmVudFNvdXJjZToge1xuICAgIHJlYWRvbmx5IHByb3RvdHlwZTogX0V2ZW50U291cmNlPGFueT47XG4gICAgbmV3IDxUIGV4dGVuZHMgb2JqZWN0PigpOiBfRXZlbnRTb3VyY2U8VD47XG59ID0gRXZlbnRTb3VyY2UgYXMgYW55O1xuXG5leHBvcnQgeyBfRXZlbnRTb3VyY2UgYXMgRXZlbnRTb3VyY2UgfTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBRUc7QUFvQkg7QUFDQSxNQUFNLGFBQWEsR0FBRyxJQUFJLE9BQU8sRUFBMEM7QUFFM0U7QUFDQSxTQUFTLFNBQVMsQ0FBbUIsUUFBMkIsRUFBQTtJQUM1RCxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtBQUM5QixRQUFBLE1BQU0sSUFBSSxTQUFTLENBQUMscUNBQXFDLENBQUM7SUFDOUQ7QUFDQSxJQUFBLE9BQU8sYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQW9CO0FBQ3pEO0FBRUE7QUFDQSxTQUFTLFlBQVksQ0FBQyxPQUFnQixFQUFBO0lBQ2xDLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUN4QztJQUNKO0lBQ0EsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFBLFFBQUEsRUFBVyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUEsd0JBQUEsQ0FBMEIsQ0FBQztBQUNoRjtBQUVBO0FBQ0EsU0FBUyxhQUFhLENBQUMsUUFBc0IsRUFBQTtBQUN6QyxJQUFBLElBQUksSUFBSSxJQUFJLFFBQVEsRUFBRTtBQUNsQixRQUFBLE1BQU0sQ0FBQyxRQUFRLEVBQUUsVUFB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