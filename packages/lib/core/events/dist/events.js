/*!
 * @cdp/events 0.9.19
 *   pub/sub framework
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
})(this, (function (exports, coreUtils) { 'use strict';

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
        if (coreUtils.isString(channel) || coreUtils.isSymbol(channel)) {
            return;
        }
        throw new TypeError(`Type of ${coreUtils.className(channel)} is not a valid channel.`);
    }
    /** @internal Listener の型検証 */
    function validListener(listener) {
        if (null != listener) {
            coreUtils.verify('typeOf', 'function', listener);
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
            coreUtils.verify('instanceOf', EventPublisher, this);
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
            const channels = coreUtils.isArray(channel) ? channel : [channel];
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
            const channels = coreUtils.isArray(channel) ? channel : [channel];
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
        const channels = coreUtils.isArray(channel) ? channel : [channel];
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
                const channels = coreUtils.isArray(channel) ? channel : [channel];
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
    class EventSource extends coreUtils.mixins(EventBroker, EventReceiver) {
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

    exports.EventBroker = EventBroker;
    exports.EventPublisher = EventPublisher;
    exports.EventReceiver = EventReceiver;
    exports.EventSource = _EventSource;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRzLmpzIiwic291cmNlcyI6WyJwdWJsaXNoZXIudHMiLCJicm9rZXIudHMiLCJyZWNlaXZlci50cyIsInNvdXJjZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBBcmd1bWVudHMsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBpc1N5bWJvbCxcbiAgICBjbGFzc05hbWUsXG4gICAgdmVyaWZ5LFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFdmVudEFsbCxcbiAgICBTdWJzY3JpcHRpb24sXG4gICAgU3Vic2NyaWJhYmxlLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIExpc25lciDmoLzntI3lvaLlvI8gKi9cbnR5cGUgTGlzdGVuZXJzTWFwPFQ+ID0gTWFwPGtleW9mIFQsIFNldDwoLi4uYXJnczogVFtrZXlvZiBUXVtdKSA9PiB1bmtub3duPj47XG5cbi8qKiBAaW50ZXJuYWwgTGlzbmVyIOOBruW8seWPgueFpyAqL1xuY29uc3QgX21hcExpc3RlbmVycyA9IG5ldyBXZWFrTWFwPEV2ZW50UHVibGlzaGVyPGFueT4sIExpc3RlbmVyc01hcDxhbnk+PigpO1xuXG4vKiogQGludGVybmFsIExpc25lck1hcCDjga7lj5blvpcgKi9cbmZ1bmN0aW9uIGxpc3RlbmVyczxUIGV4dGVuZHMgb2JqZWN0PihpbnN0YW5jZTogRXZlbnRQdWJsaXNoZXI8VD4pOiBMaXN0ZW5lcnNNYXA8VD4ge1xuICAgIGlmICghX21hcExpc3RlbmVycy5oYXMoaW5zdGFuY2UpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoaXMgaXMgbm90IGEgdmFsaWQgRXZlbnRQdWJsaXNoZXIuJyk7XG4gICAgfVxuICAgIHJldHVybiBfbWFwTGlzdGVuZXJzLmdldChpbnN0YW5jZSkgYXMgTGlzdGVuZXJzTWFwPFQ+O1xufVxuXG4vKiogQGludGVybmFsIENoYW5uZWwg44Gu5Z6L5qSc6Ki8ICovXG5mdW5jdGlvbiB2YWxpZENoYW5uZWwoY2hhbm5lbDogdW5rbm93bik6IHZvaWQgfCBuZXZlciB7XG4gICAgaWYgKGlzU3RyaW5nKGNoYW5uZWwpIHx8IGlzU3ltYm9sKGNoYW5uZWwpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVHlwZSBvZiAke2NsYXNzTmFtZShjaGFubmVsKX0gaXMgbm90IGEgdmFsaWQgY2hhbm5lbC5gKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBMaXN0ZW5lciDjga7lnovmpJzoqLwgKi9cbmZ1bmN0aW9uIHZhbGlkTGlzdGVuZXIobGlzdGVuZXI/OiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB1bmtub3duKTogYW55IHtcbiAgICBpZiAobnVsbCAhPSBsaXN0ZW5lcikge1xuICAgICAgICB2ZXJpZnkoJ3R5cGVPZicsICdmdW5jdGlvbicsIGxpc3RlbmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpc3RlbmVyO1xufVxuXG4vKiogQGludGVybmFsIGV2ZW50IOeZuuihjCAqL1xuZnVuY3Rpb24gdHJpZ2dlckV2ZW50PEV2ZW50LCBDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KFxuICAgIG1hcDogTGlzdGVuZXJzTWFwPEV2ZW50PixcbiAgICBjaGFubmVsOiBDaGFubmVsLFxuICAgIG9yaWdpbmFsOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgLi4uYXJnczogQXJndW1lbnRzPFBhcnRpYWw8RXZlbnRbQ2hhbm5lbF0+PlxuKTogdm9pZCB7XG4gICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2hhbm5lbCk7XG4gICAgaWYgKCFsaXN0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yIChjb25zdCBsaXN0ZW5lciBvZiBsaXN0KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBldmVudEFyZ3MgPSBvcmlnaW5hbCA/IFtvcmlnaW5hbCwgLi4uYXJnc10gOiBhcmdzO1xuICAgICAgICAgICAgY29uc3QgaGFuZGxlZCA9IGxpc3RlbmVyKC4uLmV2ZW50QXJncyk7XG4gICAgICAgICAgICAvLyBpZiByZWNlaXZlZCAndHJ1ZScsIHN0b3AgZGVsZWdhdGlvbi5cbiAgICAgICAgICAgIGlmICh0cnVlID09PSBoYW5kbGVkKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHZvaWQgUHJvbWlzZS5yZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBFdmVudGluZyBmcmFtZXdvcmsgY2xhc3Mgd2l0aCBlbnN1cmluZyB0eXBlLXNhZmUgZm9yIFR5cGVTY3JpcHQuIDxicj5cbiAqICAgICBUaGUgY2xpZW50IG9mIHRoaXMgY2xhc3MgY2FuIGltcGxlbWVudCBvcmlnaW5hbCBQdWItU3ViIChPYnNlcnZlcikgZGVzaWduIHBhdHRlcm4uXG4gKiBAamEg5Z6L5a6J5YWo44KS5L+d6Zqc44GZ44KL44Kk44OZ44Oz44OI55m76Yyy44O755m66KGM44Kv44Op44K5IDxicj5cbiAqICAgICDjgq/jg6njgqTjgqLjg7Pjg4jjga/mnKzjgq/jg6njgrnjgpLmtL7nlJ/jgZfjgabni6zoh6rjga4gUHViLVN1YiAoT2JzZXJ2ZXIpIOODkeOCv+ODvOODs+OCkuWun+ijheWPr+iDvVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIC8vIGRlY2xhcmUgZXZlbnQgaW50ZXJmYWNlXG4gKiBpbnRlcmZhY2UgU2FtcGxlRXZlbnQge1xuICogICBob2dlOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqICAgZm9vOiBbdm9pZF07ICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3NcbiAqICAgaG9vOiB2b2lkOyAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3MgKHNhbWUgdGhlIHVwb24pXG4gKiAgIGJhcjogW0Vycm9yXTsgICAgICAgICAgICAgICAgICAvLyBhbnkgY2xhc3MgaXMgYXZhaWxhYmxlLlxuICogICBiYXo6IEVycm9yIHwgTnVtYmVyOyAgICAgICAgICAgLy8gaWYgb25seSBvbmUgYXJndW1lbnQsIGBbXWAgaXMgbm90IHJlcXVpcmVkLlxuICogfVxuICpcbiAqIC8vIGRlY2xhcmUgY2xpZW50IGNsYXNzXG4gKiBjbGFzcyBTYW1wbGVQdWJsaXNoZXIgZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxTYW1wbGVFdmVudD4ge1xuICogICA6XG4gKiAgIHNvbWVNZXRob2QoKTogdm9pZCB7XG4gKiAgICAgdGhpcy5wdWJsaXNoKCdob2dlJywgMTAwLCAndGVzdCcpOyAgICAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiAgICAgdGhpcy5wdWJsaXNoKCdob2dlJywgMTAwLCB0cnVlKTsgICAgICAgICAvLyBORy4gYXJndW1lbnQgb2YgdHlwZSAndHJ1ZScgaXMgbm90IGFzc2lnbmFibGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBwYXJhbWV0ZXIgb2YgdHlwZSAnc3RyaW5nIHwgdW5kZWZpbmVkJy5cbiAqICAgICB0aGlzLnB1Ymxpc2goJ2hvZ2UnLCAxMDApOyAgICAgICAgICAgICAgIC8vIE9LLiBhbGwgYXJncyB0byBiZSBvcHRpb25hbCBhdXRvbWF0aWNhbGx5LlxuICogICAgIHRoaXMucHVibGlzaCgnZm9vJyk7ICAgICAgICAgICAgICAgICAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogICAgIHRoaXMucHVibGlzaCgnZm9vJywgMTAwKTsgICAgICAgICAgICAgICAgLy8gTkcuIGFyZ3VtZW50IG9mIHR5cGUgJzEwMCcgaXMgbm90IGFzc2lnbmFibGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBwYXJhbWV0ZXIgb2YgdHlwZSAndm9pZCB8IHVuZGVmaW5lZCcuXG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBzYW1wbGUgPSBuZXcgU2FtcGxlUHVibGlzaGVyKCk7XG4gKlxuICogc2FtcGxlLm9uKCdob2dlJywgKGE6IG51bWJlciwgYjogc3RyaW5nKSA9PiB7IC4uLiB9KTsgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogc2FtcGxlLm9uKCdob2dlJywgKGE6IG51bWJlciwgYjogYm9vbGVhbikgPT4geyAuLi4gfSk7ICAgLy8gTkcuIHR5cGVzIG9mIHBhcmFtZXRlcnMgJ2InXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgYW5kICdhcmdzXzEnIGFyZSBpbmNvbXBhdGlibGUuXG4gKiBzYW1wbGUub24oJ2hvZ2UnLCAoYSkgPT4geyAuLi4gfSk7ICAgICAgICAgICAgICAgICAgICAgICAvLyBPSy4gYWxsIGFyZ3NcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBiZSBvcHRpb25hbCBhdXRvbWF0aWNhbGx5LlxuICogc2FtcGxlLm9uKCdob2dlJywgKGEsIGIsIGMpID0+IHsgLi4uIH0pOyAgICAgICAgICAgICAgICAgLy8gTkcuIGV4cGVjdGVkIDEtMiBhcmd1bWVudHMsXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgYnV0IGdvdCAzLlxuICogYGBgXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBFdmVudFB1Ymxpc2hlcjxFdmVudCBleHRlbmRzIG9iamVjdD4gaW1wbGVtZW50cyBTdWJzY3JpYmFibGU8RXZlbnQ+IHtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBFdmVudFB1Ymxpc2hlciwgdGhpcyk7XG4gICAgICAgIF9tYXBMaXN0ZW5lcnMuc2V0KHRoaXMsIG5ldyBNYXAoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE5vdGlmeSBldmVudCB0byBjbGllbnRzLlxuICAgICAqIEBqYSBldmVudCDnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgavmuKHjgZnlvJXmlbBcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgcHVibGlzaDxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwsIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICB2YWxpZENoYW5uZWwoY2hhbm5lbCk7XG4gICAgICAgIHRyaWdnZXJFdmVudChtYXAsIGNoYW5uZWwsIHVuZGVmaW5lZCwgLi4uYXJncyk7XG4gICAgICAgIC8vIHRyaWdnZXIgZm9yIGFsbCBoYW5kbGVyXG4gICAgICAgIGlmICgnKicgIT09IGNoYW5uZWwpIHtcbiAgICAgICAgICAgIHRyaWdnZXJFdmVudChtYXAgYXMgdW5rbm93biBhcyBMaXN0ZW5lcnNNYXA8RXZlbnRBbGw+LCAnKicsIGNoYW5uZWwgYXMgc3RyaW5nLCAuLi5hcmdzKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFN1YnNjcmliYWJsZTxFdmVudD5cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIHRoaXMgb2JqZWN0IGhhcyBjbGllbnRzLlxuICAgICAqIEBqYSDjgq/jg6njgqTjgqLjg7Pjg4jjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIGhhc0xpc3RlbmVyPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbD86IENoYW5uZWwsIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICBpZiAobnVsbCA9PSBjaGFubmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFwLnNpemUgPiAwO1xuICAgICAgICB9XG4gICAgICAgIHZhbGlkQ2hhbm5lbChjaGFubmVsKTtcbiAgICAgICAgaWYgKG51bGwgPT0gbGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXAuaGFzKGNoYW5uZWwpO1xuICAgICAgICB9XG4gICAgICAgIHZhbGlkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaGFubmVsKTtcbiAgICAgICAgcmV0dXJuIGxpc3QgPyBsaXN0LmhhcyhsaXN0ZW5lcikgOiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyByZWdpc3RlcmVkIGNoYW5uZWwga2V5cy5cbiAgICAgKiBAamEg55m76Yyy44GV44KM44Gm44GE44KL44OB44Oj44ON44Or44Kt44O844KS6L+U5Y20XG4gICAgICovXG4gICAgY2hhbm5lbHMoKTogKGtleW9mIEV2ZW50KVtdIHtcbiAgICAgICAgcmV0dXJuIFsuLi5saXN0ZW5lcnModGhpcykua2V5cygpXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVycyh0aGlzKTtcbiAgICAgICAgdmFsaWRMaXN0ZW5lcihsaXN0ZW5lcik7XG5cbiAgICAgICAgY29uc3QgY2hhbm5lbHMgPSBpc0FycmF5KGNoYW5uZWwpID8gY2hhbm5lbCA6IFtjaGFubmVsXTtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgdmFsaWRDaGFubmVsKGNoKTtcbiAgICAgICAgICAgIG1hcC5oYXMoY2gpID8gbWFwLmdldChjaCkhLmFkZChsaXN0ZW5lcikgOiBtYXAuc2V0KGNoLCBuZXcgU2V0KFtsaXN0ZW5lcl0pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3QuZnJlZXplKHtcbiAgICAgICAgICAgIGdldCBlbmFibGUoKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbGlzdD8uaGFzKGxpc3RlbmVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVuc3Vic2NyaWJlKCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2gpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGlzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdC5kZWxldGUobGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdC5zaXplID4gMCB8fCBtYXAuZGVsZXRlKGNoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykgYnV0IGl0IGNhdXNlcyB0aGUgYm91bmQgY2FsbGJhY2sgdG8gb25seSBmaXJlIG9uY2UgYmVmb3JlIGJlaW5nIHJlbW92ZWQuXG4gICAgICogQGphIOS4gOW6puOBoOOBkeODj+ODs+ODieODquODs+OCsOWPr+iDveOBquOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uY2U8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5vbihjaGFubmVsLCBsaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IG1hbmFnZWQgPSB0aGlzLm9uKGNoYW5uZWwsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnRleHQudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIG1hbmFnZWQudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjb250ZXh0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBldmVyeXRoaW5nIGlzIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/jgZnjgbnjgabop6PpmaRcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgYWxsIHNhbWUgYGNoYW5uZWxgIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lkIzkuIAgYGNoYW5uZWxgIOOBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIG9mZjxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw/OiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVycyh0aGlzKTtcbiAgICAgICAgaWYgKG51bGwgPT0gY2hhbm5lbCkge1xuICAgICAgICAgICAgbWFwLmNsZWFyKCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNoYW5uZWxzID0gaXNBcnJheShjaGFubmVsKSA/IGNoYW5uZWwgOiBbY2hhbm5lbF07XG4gICAgICAgIGNvbnN0IGNhbGxiYWNrID0gdmFsaWRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgIHZhbGlkQ2hhbm5lbChjaCk7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIG1hcC5kZWxldGUoY2gpO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaCk7XG4gICAgICAgICAgICAgICAgaWYgKGxpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdC5kZWxldGUoY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgICAgICBsaXN0LnNpemUgPiAwIHx8IG1hcC5kZWxldGUoY2gpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQgeyBBcmd1bWVudHMgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaWJhYmxlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnLi9wdWJsaXNoZXInO1xuXG4vKiogcmUtZXhwb3J0ICovXG5leHBvcnQgdHlwZSBFdmVudEFyZ3VtZW50czxUPiA9IEFyZ3VtZW50czxUPjtcblxuLyoqXG4gKiBAZW4gRXZlbnRpbmcgZnJhbWV3b3JrIG9iamVjdCBhYmxlIHRvIGNhbGwgYHB1Ymxpc2goKWAgbWV0aG9kIGZyb20gb3V0c2lkZS5cbiAqIEBqYSDlpJbpg6jjgYvjgonjga4gYHB1Ymxpc2goKWAg44KS5Y+v6IO944Gr44GX44Gf44Kk44OZ44Oz44OI55m76Yyy44O755m66KGM44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogLy8gZGVjbGFyZSBldmVudCBpbnRlcmZhY2VcbiAqIGludGVyZmFjZSBTYW1wbGVFdmVudCB7XG4gKiAgIGhvZ2U6IFtudW1iZXIsIHN0cmluZ107ICAgICAgICAvLyBjYWxsYmFjayBmdW5jdGlvbidzIGFyZ3MgdHlwZSB0dXBsZVxuICogfVxuICpcbiAqIGNvbnN0IGJyb2tlciA9IG5ldyBFdmVudEJyb2tlcjxTYW1wbGVFdmVudD4oKTtcbiAqIGJyb2tlci50cmlnZ2VyKCdob2dlJywgMTAwLCAndGVzdCcpOyAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogYnJva2VyLnRyaWdnZXIoJ2hvZ2UnLCAxMDAsIHRydWUpOyAgICAgICAvLyBORy4gYXJndW1lbnQgb2YgdHlwZSAndHJ1ZScgaXMgbm90IGFzc2lnbmFibGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIHRvIHBhcmFtZXRlciBvZiB0eXBlICdzdHJpbmcgfCB1bmRlZmluZWQnLlxuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRCcm9rZXI8RXZlbnQgZXh0ZW5kcyBvYmplY3Q+IGV4dGVuZHMgU3Vic2NyaWJhYmxlPEV2ZW50PiB7XG4gICAgLyoqXG4gICAgICogQGVuIE5vdGlmeSBldmVudCB0byBjbGllbnRzLlxuICAgICAqIEBqYSBldmVudCDnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgavmuKHjgZnlvJXmlbBcbiAgICAgKi9cbiAgICB0cmlnZ2VyPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCwgLi4uYXJnczogQXJndW1lbnRzPFBhcnRpYWw8RXZlbnRbQ2hhbm5lbF0+Pik6IHZvaWQ7XG59XG5cbi8qKlxuICogQGVuIENvbnN0cnVjdG9yIG9mIHtAbGluayBFdmVudEJyb2tlcn1cbiAqIEBqYSB7QGxpbmsgRXZlbnRCcm9rZXJ9IOOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wun+S9k1xuICovXG5leHBvcnQgY29uc3QgRXZlbnRCcm9rZXI6IHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IEV2ZW50QnJva2VyPGFueT47XG4gICAgbmV3IDxUIGV4dGVuZHMgb2JqZWN0PigpOiBFdmVudEJyb2tlcjxUPjtcbn0gPSBFdmVudFB1Ymxpc2hlciBhcyBhbnk7XG5cbkV2ZW50QnJva2VyLnByb3RvdHlwZS50cmlnZ2VyID0gKEV2ZW50UHVibGlzaGVyLnByb3RvdHlwZSBhcyBhbnkpLnB1Ymxpc2g7XG4iLCJpbXBvcnQge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBBcmd1bWVudHMsXG4gICAgaXNBcnJheSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgU3Vic2NyaWJhYmxlLFxuICAgIFN1YnNjcmlwdGlvbixcbiAgICBFdmVudFNjaGVtYSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY29udGV4dCA9IFN5bWJvbCgnY29udGV4dCcpO1xuLyoqIEBpbnRlcm5hbCAqLyB0eXBlIFN1YnNjcmlwdGlvbk1hcCA9IE1hcDxVbmtub3duRnVuY3Rpb24sIFN1YnNjcmlwdGlvbj47XG4vKiogQGludGVybmFsICovIHR5cGUgTGlzdGVyTWFwICAgICAgID0gTWFwPHN0cmluZywgU3Vic2NyaXB0aW9uTWFwPjtcbi8qKiBAaW50ZXJuYWwgKi8gdHlwZSBTdWJzY3JpcHRpb25TZXQgPSBTZXQ8U3Vic2NyaXB0aW9uPjtcbi8qKiBAaW50ZXJuYWwgKi8gdHlwZSBTdWJzY3JpYmFibGVNYXAgPSBXZWFrTWFwPFN1YnNjcmliYWJsZSwgTGlzdGVyTWFwPjtcblxuLyoqIEBpbnRlcm5hbCBMaXNuZXIg5qC857SN5b2i5byPICovXG5pbnRlcmZhY2UgQ29udGV4dCB7XG4gICAgbWFwOiBTdWJzY3JpYmFibGVNYXA7XG4gICAgc2V0OiBTdWJzY3JpcHRpb25TZXQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgcmVnaXN0ZXIgbGlzdGVuZXIgY29udGV4dCAqL1xuZnVuY3Rpb24gcmVnaXN0ZXIoY29udGV4dDogQ29udGV4dCwgdGFyZ2V0OiBTdWJzY3JpYmFibGUsIGNoYW5uZWw6IHN0cmluZyB8IHN0cmluZ1tdLCBsaXN0ZW5lcjogVW5rbm93bkZ1bmN0aW9uKTogU3Vic2NyaXB0aW9uIHtcbiAgICBjb25zdCBzdWJzY3JpcHRpb25zOiBTdWJzY3JpcHRpb25bXSA9IFtdO1xuXG4gICAgY29uc3QgY2hhbm5lbHMgPSBpc0FycmF5KGNoYW5uZWwpID8gY2hhbm5lbCA6IFtjaGFubmVsXTtcbiAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgIGNvbnN0IHMgPSB0YXJnZXQub24oY2gsIGxpc3RlbmVyKTtcbiAgICAgICAgY29udGV4dC5zZXQuYWRkKHMpO1xuICAgICAgICBzdWJzY3JpcHRpb25zLnB1c2gocyk7XG5cbiAgICAgICAgY29uc3QgbGlzdGVuZXJNYXAgPSBjb250ZXh0Lm1hcC5nZXQodGFyZ2V0KSA/PyBuZXcgTWFwPHN0cmluZywgTWFwPFVua25vd25GdW5jdGlvbiwgU3Vic2NyaXB0aW9uPj4oKTtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJNYXAuZ2V0KGNoKSA/PyBuZXcgTWFwPFVua25vd25GdW5jdGlvbiwgU3Vic2NyaXB0aW9uPigpO1xuICAgICAgICBtYXAuc2V0KGxpc3RlbmVyLCBzKTtcblxuICAgICAgICBpZiAoIWxpc3RlbmVyTWFwLmhhcyhjaCkpIHtcbiAgICAgICAgICAgIGxpc3RlbmVyTWFwLnNldChjaCwgbWFwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNvbnRleHQubWFwLmhhcyh0YXJnZXQpKSB7XG4gICAgICAgICAgICBjb250ZXh0Lm1hcC5zZXQodGFyZ2V0LCBsaXN0ZW5lck1hcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgIGdldCBlbmFibGUoKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2Ygc3Vic2NyaXB0aW9ucykge1xuICAgICAgICAgICAgICAgIGlmIChzLmVuYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc3Vic2NyaWJlKCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBzIG9mIHN1YnNjcmlwdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgdW5yZWdpc3RlciBsaXN0ZW5lciBjb250ZXh0ICovXG5mdW5jdGlvbiB1bnJlZ2lzdGVyKGNvbnRleHQ6IENvbnRleHQsIHRhcmdldD86IFN1YnNjcmliYWJsZSwgY2hhbm5lbD86IHN0cmluZyB8IHN0cmluZ1tdLCBsaXN0ZW5lcj86IFVua25vd25GdW5jdGlvbik6IHZvaWQge1xuICAgIGlmIChudWxsICE9IHRhcmdldCkge1xuICAgICAgICB0YXJnZXQub2ZmKGNoYW5uZWwsIGxpc3RlbmVyKTtcblxuICAgICAgICBjb25zdCBsaXN0ZW5lck1hcCA9IGNvbnRleHQubWFwLmdldCh0YXJnZXQpO1xuICAgICAgICBpZiAoIWxpc3RlbmVyTWFwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bGwgIT0gY2hhbm5lbCkge1xuICAgICAgICAgICAgY29uc3QgY2hhbm5lbHMgPSBpc0FycmF5KGNoYW5uZWwpID8gY2hhbm5lbCA6IFtjaGFubmVsXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lck1hcC5nZXQoY2gpO1xuICAgICAgICAgICAgICAgIGlmICghbWFwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxpc3RlbmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHMgPSBtYXAuZ2V0KGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuc2V0LmRlbGV0ZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBtYXAuZGVsZXRlKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2YgbWFwLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnNldC5kZWxldGUocyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG1hcCBvZiBsaXN0ZW5lck1hcC52YWx1ZXMoKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBtYXAudmFsdWVzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnNldC5kZWxldGUocyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChjb25zdCBzIG9mIGNvbnRleHQuc2V0KSB7XG4gICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5tYXAgPSBuZXcgV2Vha01hcCgpO1xuICAgICAgICBjb250ZXh0LnNldC5jbGVhcigpO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyB0byB3aGljaCB0aGUgc2FmZSBldmVudCByZWdpc3Rlci91bnJlZ2lzdGVyIG1ldGhvZCBpcyBvZmZlcmVkIGZvciB0aGUgb2JqZWN0IHdoaWNoIGlzIGEgc2hvcnQgbGlmZSBjeWNsZSB0aGFuIHN1YnNjcmlwdGlvbiB0YXJnZXQuIDxicj5cbiAqICAgICBUaGUgYWR2YW50YWdlIG9mIHVzaW5nIHRoaXMgZm9ybSwgaW5zdGVhZCBvZiBgb24oKWAsIGlzIHRoYXQgYGxpc3RlblRvKClgIGFsbG93cyB0aGUgb2JqZWN0IHRvIGtlZXAgdHJhY2sgb2YgdGhlIGV2ZW50cyxcbiAqICAgICBhbmQgdGhleSBjYW4gYmUgcmVtb3ZlZCBhbGwgYXQgb25jZSBsYXRlciBjYWxsIGBzdG9wTGlzdGVuaW5nKClgLlxuICogQGphIOizvOiqreWvvuixoeOCiOOCiuOCguODqeOCpOODleOCteOCpOOCr+ODq+OBjOefreOBhOOCquODluOCuOOCp+OCr+ODiOOBq+WvvuOBl+OBpiwg5a6J5YWo44Gq44Kk44OZ44Oz44OI55m76YyyL+ino+mZpOODoeOCveODg+ODieOCkuaPkOS+m+OBmeOCi+OCr+ODqeOCuSA8YnI+XG4gKiAgICAgYG9uKClgIOOBruS7o+OCj+OCiuOBqyBgbGlzdGVuVG8oKWAg44KS5L2/55So44GZ44KL44GT44Go44GnLCDlvozjgasgYHN0b3BMaXN0ZW5pbmcoKWAg44KSMeW6puWRvOOBtuOBoOOBkeOBp+OBmeOBueOBpuOBruODquOCueODiuODvOOCkuino+mZpOOBp+OBjeOCi+WIqeeCueOBjOOBguOCiy5cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEV2ZW50UmVjZWl2ZXIsIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiAvLyBkZWNsYXJlIGV2ZW50IGludGVyZmFjZVxuICogaW50ZXJmYWNlIFNhbXBsZUV2ZW50IHtcbiAqICAgaG9nZTogW251bWJlciwgc3RyaW5nXTsgICAgICAgIC8vIGNhbGxiYWNrIGZ1bmN0aW9uJ3MgYXJncyB0eXBlIHR1cGxlXG4gKiAgIGZvbzogW3ZvaWRdOyAgICAgICAgICAgICAgICAgICAvLyBubyBhcmdzXG4gKiAgIGhvbzogdm9pZDsgICAgICAgICAgICAgICAgICAgICAvLyBubyBhcmdzIChzYW1lIHRoZSB1cG9uKVxuICogICBiYXI6IFtFcnJvcl07ICAgICAgICAgICAgICAgICAgLy8gYW55IGNsYXNzIGlzIGF2YWlsYWJsZS5cbiAqICAgYmF6OiBFcnJvciB8IE51bWJlcjsgICAgICAgICAgIC8vIGlmIG9ubHkgb25lIGFyZ3VtZW50LCBgW11gIGlzIG5vdCByZXF1aXJlZC5cbiAqIH1cbiAqXG4gKiAvLyBkZWNsYXJlIGNsaWVudCBjbGFzc1xuICogY2xhc3MgU2FtcGxlUmVjZWl2ZXIgZXh0ZW5kcyBFdmVudFJlY2VpdmVyIHtcbiAqICAgY29uc3RydWN0b3IoYnJva2VyOiBFdmVudEJyb2tlcjxTYW1wbGVFdmVudD4pIHtcbiAqICAgICBzdXBlcigpO1xuICogICAgIHRoaXMubGlzdGVuVG8oYnJva2VyLCAnaG9nZScsIChudW06IG51bWJlciwgc3RyOiBzdHJpbmcpID0+IHsgLi4uIH0pO1xuICogICAgIHRoaXMubGlzdGVuVG8oYnJva2VyLCAnYmFyJywgKGU6IEVycm9yKSA9PiB7IC4uLiB9KTtcbiAqICAgICB0aGlzLmxpc3RlblRvKGJyb2tlciwgWydmb28nLCAnaG9vJ10sICgpID0+IHsgLi4uIH0pO1xuICogICB9XG4gKlxuICogICByZWxlYXNlKCk6IHZvaWQge1xuICogICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBvclxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBicm9rZXIgICA9IG5ldyBFdmVudEJyb2tlcjxTYW1wbGVFdmVudD4oKTtcbiAqIGNvbnN0IHJlY2VpdmVyID0gbmV3IEV2ZW50UmVjZWl2ZXIoKTtcbiAqXG4gKiByZWNlaXZlci5saXN0ZW5Ubyhicm9rZXIsICdob2dlJywgKG51bTogbnVtYmVyLCBzdHI6IHN0cmluZykgPT4geyAuLi4gfSk7XG4gKiByZWNlaXZlci5saXN0ZW5Ubyhicm9rZXIsICdiYXInLCAoZTogRXJyb3IpID0+IHsgLi4uIH0pO1xuICogcmVjZWl2ZXIubGlzdGVuVG8oYnJva2VyLCBbJ2ZvbycsICdob28nXSwgKCkgPT4geyAuLi4gfSk7XG4gKlxuICogcmVjZWl2ZXIuc3RvcExpc3RlbmluZygpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBFdmVudFJlY2VpdmVyIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX2NvbnRleHRdOiBDb250ZXh0O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXNbX2NvbnRleHRdID0geyBtYXA6IG5ldyBXZWFrTWFwKCksIHNldDogbmV3IFNldCgpIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRlbGwgYW4gb2JqZWN0IHRvIGxpc3RlbiB0byBhIHBhcnRpY3VsYXIgZXZlbnQgb24gYW4gb3RoZXIgb2JqZWN0LlxuICAgICAqIEBqYSDlr77osaHjgqrjg5bjgrjjgqfjgq/jg4jjga7jgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXRcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGxpc3RlbmluZyB0YXJnZXQgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI6LO86Kqt5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBsaXN0ZW5UbzxUIGV4dGVuZHMgU3Vic2NyaWJhYmxlLCBFdmVudCBleHRlbmRzIEV2ZW50U2NoZW1hPFQ+ID0gRXZlbnRTY2hlbWE8VD4sIENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudCA9IGtleW9mIEV2ZW50PihcbiAgICAgICAgdGFyZ2V0OiBULFxuICAgICAgICBjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLFxuICAgICAgICBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd25cbiAgICApOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICByZXR1cm4gcmVnaXN0ZXIodGhpc1tfY29udGV4dF0sIHRhcmdldCwgY2hhbm5lbCBhcyBzdHJpbmcsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVzdCBsaWtlIGxpc3RlblRvLCBidXQgY2F1c2VzIHRoZSBib3VuZCBjYWxsYmFjayB0byBmaXJlIG9ubHkgb25jZSBiZWZvcmUgYmVpbmcgcmVtb3ZlZC5cbiAgICAgKiBAamEg5a++6LGh44Kq44OW44K444Kn44Kv44OI44Gu5LiA5bqm44Gg44GR44OP44Oz44OJ44Oq44Oz44Kw5Y+v6IO944Gq44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0XG4gICAgICogIC0gYGVuYCBldmVudCBsaXN0ZW5pbmcgdGFyZ2V0IG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOizvOiqreWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgbGlzdGVuVG9PbmNlPFQgZXh0ZW5kcyBTdWJzY3JpYmFibGUsIEV2ZW50IGV4dGVuZHMgRXZlbnRTY2hlbWE8VD4gPSBFdmVudFNjaGVtYTxUPiwgQ2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50ID0ga2V5b2YgRXZlbnQ+KFxuICAgICAgICB0YXJnZXQ6IFQsXG4gICAgICAgIGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sXG4gICAgICAgIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93blxuICAgICk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSByZWdpc3Rlcih0aGlzW19jb250ZXh0XSwgdGFyZ2V0LCBjaGFubmVsIGFzIHN0cmluZywgbGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBtYW5hZ2VkID0gdGFyZ2V0Lm9uKGNoYW5uZWwsICgpID0+IHtcbiAgICAgICAgICAgIHVucmVnaXN0ZXIodGhpc1tfY29udGV4dF0sIHRhcmdldCwgY2hhbm5lbCBhcyBzdHJpbmcsIGxpc3RlbmVyKTtcbiAgICAgICAgICAgIG1hbmFnZWQudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjb250ZXh0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUZWxsIGFuIG9iamVjdCB0byBzdG9wIGxpc3RlbmluZyB0byBldmVudHMuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHRhcmdldFxuICAgICAqICAtIGBlbmAgZXZlbnQgbGlzdGVuaW5nIHRhcmdldCBvYmplY3QuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGV2ZXJ5dGhpbmcgaXMgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jos7zoqq3lr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuOBruODquOCueODiuODvOOCkuino+mZpFxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGV2ZXJ5dGhpbmcgaXMgcmVsZWFzZWQgbGlzdGVuZXJzIGZyb20gYHRhcmdldGAuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WvvuixoSBgdGFyZ2V0YCDjga7jg6rjgrnjg4rjg7zjgpLjgZnjgbnjgabop6PpmaRcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgYWxsIHNhbWUgYGNoYW5uZWxgIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lkIzkuIAgYGNoYW5uZWxgIOOBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIHB1YmxpYyBzdG9wTGlzdGVuaW5nPFQgZXh0ZW5kcyBTdWJzY3JpYmFibGUsIEV2ZW50IGV4dGVuZHMgRXZlbnRTY2hlbWE8VD4gPSBFdmVudFNjaGVtYTxUPiwgQ2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50ID0ga2V5b2YgRXZlbnQ+KFxuICAgICAgICB0YXJnZXQ/OiBULFxuICAgICAgICBjaGFubmVsPzogQ2hhbm5lbCB8IENoYW5uZWxbXSxcbiAgICAgICAgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93blxuICAgICk6IHRoaXMge1xuICAgICAgICB1bnJlZ2lzdGVyKHRoaXNbX2NvbnRleHRdLCB0YXJnZXQsIGNoYW5uZWwgYXMgc3RyaW5nLCBsaXN0ZW5lcik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQgeyBtaXhpbnMgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRCcm9rZXIgfSBmcm9tICcuL2Jyb2tlcic7XG5pbXBvcnQgeyBFdmVudFJlY2VpdmVyIH0gZnJvbSAnLi9yZWNlaXZlcic7XG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyB3aGljaCBoYXZlIEkvRiBvZiB7QGxpbmsgRXZlbnRCcm9rZXJ9IGFuZCB7QGxpbmsgRXZlbnRSZWNlaXZlcn0uIDxicj5cbiAqICAgICBgRXZlbnRzYCBjbGFzcyBvZiBgQmFja2JvbmUuanNgIGVxdWl2YWxlbmNlLlxuICogQGphIHtAbGluayBFdmVudEJyb2tlcn0g44GoIHtAbGluayBFdmVudFJlY2VpdmVyfSDjga4gSS9GIOOCkuOBguOCj+OBm+aMgeOBpOOCr+ODqeOCuSA8YnI+XG4gKiAgICAgYEJhY2tib25lLmpzYCDjga4gYEV2ZW50c2Ag44Kv44Op44K555u45b2TXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBFdmVudFNvdXJjZSB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogLy8gZGVjbGFyZSBldmVudCBpbnRlcmZhY2VcbiAqIGludGVyZmFjZSBUYXJnZXRFdmVudCB7XG4gKiAgIGhvZ2U6IFtudW1iZXIsIHN0cmluZ107ICAgICAgICAvLyBjYWxsYmFjayBmdW5jdGlvbidzIGFyZ3MgdHlwZSB0dXBsZVxuICogICBmb286IFt2b2lkXTsgICAgICAgICAgICAgICAgICAgLy8gbm8gYXJnc1xuICogICBob286IHZvaWQ7ICAgICAgICAgICAgICAgICAgICAgLy8gbm8gYXJncyAoc2FtZSB0aGUgdXBvbilcbiAqICAgYmFyOiBbRXJyb3JdOyAgICAgICAgICAgICAgICAgIC8vIGFueSBjbGFzcyBpcyBhdmFpbGFibGUuXG4gKiAgIGJhejogRXJyb3IgfCBOdW1iZXI7ICAgICAgICAgICAvLyBpZiBvbmx5IG9uZSBhcmd1bWVudCwgYFtdYCBpcyBub3QgcmVxdWlyZWQuXG4gKiB9XG4gKlxuICogaW50ZXJmYWNlIFNhbXBsZUV2ZW50IHtcbiAqICAgZnVnYTogW251bWJlciwgc3RyaW5nXTsgICAgICAgIC8vIGNhbGxiYWNrIGZ1bmN0aW9uJ3MgYXJncyB0eXBlIHR1cGxlXG4gKiB9XG4gKlxuICogLy8gZGVjbGFyZSBjbGllbnQgY2xhc3NcbiAqIGNsYXNzIFNhbXBsZVNvdXJjZSBleHRlbmRzIEV2ZW50U291cmNlPFNhbXBsZUV2ZW50PiB7XG4gKiAgIGNvbnN0cnVjdG9yKHRhcmdldDogRXZlbnRTb3VyY2U8VGFyZ2V0RXZlbnQ+KSB7XG4gKiAgICAgc3VwZXIoKTtcbiAqICAgICB0aGlzLmxpc3RlblRvKGJyb2tlciwgJ2hvZ2UnLCAobnVtOiBudW1iZXIsIHN0cjogc3RyaW5nKSA9PiB7IC4uLiB9KTtcbiAqICAgICB0aGlzLmxpc3RlblRvKGJyb2tlciwgJ2JhcicsIChlOiBFcnJvcikgPT4geyAuLi4gfSk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsIFsnZm9vJywgJ2hvbyddLCAoKSA9PiB7IC4uLiB9KTtcbiAqICAgfVxuICpcbiAqICAgcmVsZWFzZSgpOiB2b2lkIHtcbiAqICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAqICAgfVxuICogfVxuICpcbiAqIGNvbnN0IHNhbXBsZSA9IG5ldyBTYW1wbGVTb3VyY2UoKTtcbiAqXG4gKiBzYW1wbGUub24oJ2Z1Z2EnLCAoYTogbnVtYmVyLCBiOiBzdHJpbmcpID0+IHsgLi4uIH0pOyAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiBzYW1wbGUudHJpZ2dlcignZnVnYScsIDEwMCwgJ3Rlc3QnKTsgICAgICAgICAgICAgICAgICAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgX0V2ZW50U291cmNlPFQgZXh0ZW5kcyBvYmplY3Q+ID0gRXZlbnRCcm9rZXI8VD4gJiBFdmVudFJlY2VpdmVyO1xuXG4vKiogQGludGVybmFsIHtAbGluayBFdmVudFNvdXJjZX0gY2xhc3MgKi9cbmNsYXNzIEV2ZW50U291cmNlIGV4dGVuZHMgbWl4aW5zKEV2ZW50QnJva2VyLCBFdmVudFJlY2VpdmVyKSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuc3VwZXIoRXZlbnRSZWNlaXZlcik7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb25zdHJ1Y3RvciBvZiB7QGxpbmsgRXZlbnRTb3VyY2V9XG4gKiBAamEge0BsaW5rIEV2ZW50U291cmNlfSDjga7jgrPjg7Pjgrnjg4jjg6njgq/jgr/lrp/kvZNcbiAqL1xuY29uc3QgX0V2ZW50U291cmNlOiB7XG4gICAgcmVhZG9ubHkgcHJvdG90eXBlOiBfRXZlbnRTb3VyY2U8YW55PjtcbiAgICBuZXcgPFQgZXh0ZW5kcyBvYmplY3Q+KCk6IF9FdmVudFNvdXJjZTxUPjtcbn0gPSBFdmVudFNvdXJjZSBhcyBhbnk7XG5cbmV4cG9ydCB7IF9FdmVudFNvdXJjZSBhcyBFdmVudFNvdXJjZSB9O1xuIl0sIm5hbWVzIjpbImlzU3RyaW5nIiwiaXNTeW1ib2wiLCJjbGFzc05hbWUiLCJ2ZXJpZnkiLCJpc0FycmF5IiwibWl4aW5zIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOztJQUVHO0lBbUJIO0lBQ0EsTUFBTSxhQUFhLEdBQUcsSUFBSSxPQUFPLEVBQTBDO0lBRTNFO0lBQ0EsU0FBUyxTQUFTLENBQW1CLFFBQTJCLEVBQUE7UUFDNUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7SUFDOUIsUUFBQSxNQUFNLElBQUksU0FBUyxDQUFDLHFDQUFxQyxDQUFDOztJQUU5RCxJQUFBLE9BQU8sYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQW9CO0lBQ3pEO0lBRUE7SUFDQSxTQUFTLFlBQVksQ0FBQyxPQUFnQixFQUFBO1FBQ2xDLElBQUlBLGtCQUFRLENBQUMsT0FBTyxDQUFDLElBQUlDLGtCQUFRLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDeEM7O1FBRUosTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFXLFFBQUEsRUFBQUMsbUJBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBMEIsd0JBQUEsQ0FBQSxDQUFDO0lBQ2hGO0lBRUE7SUFDQSxTQUFTLGFBQWEsQ0FBQyxRQUEwQyxFQUFB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