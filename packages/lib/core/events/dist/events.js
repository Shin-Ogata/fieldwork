/*!
 * @cdp/events 0.9.0
 *   pub/sub framework
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
}(this, (function (exports, coreUtils) { 'use strict';

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
        @typescript-eslint/no-explicit-any
     ,  @typescript-eslint/unbound-method
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
        const channels = coreUtils.isArray(channel) ? channel : [channel];
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
    class EventSource extends coreUtils.mixins(EventBroker, EventRevceiver) {
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

    exports.EventBroker = EventBroker;
    exports.EventPublisher = EventPublisher;
    exports.EventRevceiver = EventRevceiver;
    exports.EventSource = EventSourceBase;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRzLmpzIiwic291cmNlcyI6WyJwdWJsaXNoZXIudHMiLCJicm9rZXIudHMiLCJyZWNlaXZlci50cyIsInNvdXJjZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQge1xuICAgIEFyZ3VtZW50cyxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIGlzU3ltYm9sLFxuICAgIGNsYXNzTmFtZSxcbiAgICB2ZXJpZnksXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIEV2ZW50QWxsLFxuICAgIFN1YnNjcmlwdGlvbixcbiAgICBTdWJzY3JpYmFibGUsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgTGlzbmVyIOagvOe0jeW9ouW8jyAqL1xudHlwZSBMaXN0ZW5lcnNNYXA8VD4gPSBNYXA8a2V5b2YgVCwgU2V0PCguLi5hcmdzOiBUW2tleW9mIFRdW10pID0+IHVua25vd24+PjtcblxuLyoqIEBpbnRlcm5hbCBMaXNuZXIg44Gu5byx5Y+C54WnICovXG5jb25zdCBfbWFwTGlzdGVuZXJzID0gbmV3IFdlYWtNYXA8RXZlbnRQdWJsaXNoZXI8YW55PiwgTGlzdGVuZXJzTWFwPGFueT4+KCk7XG5cbi8qKiBAaW50ZXJuYWwgTGlzbmVyTWFwIOOBruWPluW+lyAqL1xuZnVuY3Rpb24gbGlzdGVuZXJzPFQgZXh0ZW5kcyBvYmplY3Q+KGluc3RhbmNlOiBFdmVudFB1Ymxpc2hlcjxUPik6IExpc3RlbmVyc01hcDxUPiB7XG4gICAgaWYgKCFfbWFwTGlzdGVuZXJzLmhhcyhpbnN0YW5jZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhpcyBpcyBub3QgYSB2YWxpZCBFdmVudFB1Ymxpc2hlci4nKTtcbiAgICB9XG4gICAgcmV0dXJuIF9tYXBMaXN0ZW5lcnMuZ2V0KGluc3RhbmNlKSBhcyBMaXN0ZW5lcnNNYXA8VD47XG59XG5cbi8qKiBAaW50ZXJuYWwgQ2hhbm5lbCDjga7lnovmpJzoqLwgKi9cbmZ1bmN0aW9uIHZhbGlkQ2hhbm5lbChjaGFubmVsOiB1bmtub3duKTogdm9pZCB8IG5ldmVyIHtcbiAgICBpZiAoaXNTdHJpbmcoY2hhbm5lbCkgfHwgaXNTeW1ib2woY2hhbm5lbCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBUeXBlIG9mICR7Y2xhc3NOYW1lKGNoYW5uZWwpfSBpcyBub3QgYSB2YWxpZCBjaGFubmVsLmApO1xufVxuXG4vKiogQGludGVybmFsIExpc3RlbmVyIOOBruWei+aknOiovCAqL1xuZnVuY3Rpb24gdmFsaWRMaXN0ZW5lcihsaXN0ZW5lcj86ICguLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd24pOiBhbnkgfCBuZXZlciB7XG4gICAgaWYgKG51bGwgIT0gbGlzdGVuZXIpIHtcbiAgICAgICAgdmVyaWZ5KCd0eXBlT2YnLCAnZnVuY3Rpb24nLCBsaXN0ZW5lcik7XG4gICAgfVxuICAgIHJldHVybiBsaXN0ZW5lcjtcbn1cblxuLyoqIEBpbnRlcm5hbCBldmVudCDnmbrooYwgKi9cbmZ1bmN0aW9uIHRyaWdnZXJFdmVudDxFdmVudCwgQ2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihcbiAgICBtYXA6IExpc3RlbmVyc01hcDxFdmVudD4sXG4gICAgY2hhbm5lbDogQ2hhbm5lbCxcbiAgICBvcmlnaW5hbDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj5cbik6IHZvaWQge1xuICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoYW5uZWwpO1xuICAgIGlmICghbGlzdCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAoY29uc3QgbGlzdGVuZXIgb2YgbGlzdCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZXZlbnRBcmdzID0gb3JpZ2luYWwgPyBbb3JpZ2luYWwsIC4uLmFyZ3NdIDogYXJncztcbiAgICAgICAgICAgIGNvbnN0IGhhbmRsZWQgPSBsaXN0ZW5lciguLi5ldmVudEFyZ3MpO1xuICAgICAgICAgICAgLy8gaWYgcmVjZWl2ZWQgJ3RydWUnLCBzdG9wIGRlbGVnYXRpb24uXG4gICAgICAgICAgICBpZiAodHJ1ZSA9PT0gaGFuZGxlZCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB2b2lkIFByb21pc2UucmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gRXZlbnRpbmcgZnJhbWV3b3JrIGNsYXNzIHdpdGggZW5zdXJpbmcgdHlwZS1zYWZlIGZvciBUeXBlU2NyaXB0LiA8YnI+XG4gKiAgICAgVGhlIGNsaWVudCBvZiB0aGlzIGNsYXNzIGNhbiBpbXBsZW1lbnQgb3JpZ2luYWwgUHViLVN1YiAoT2JzZXJ2ZXIpIGRlc2lnbiBwYXR0ZXJuLlxuICogQGphIOWei+WuieWFqOOCkuS/nemanOOBmeOCi+OCpOODmeODs+ODiOeZu+mMsuODu+eZuuihjOOCr+ODqeOCuSA8YnI+XG4gKiAgICAg44Kv44Op44Kk44Ki44Oz44OI44Gv5pys44Kv44Op44K544KS5rS+55Sf44GX44Gm54us6Ieq44GuIFB1Yi1TdWIgKE9ic2VydmVyKSDjg5Hjgr/jg7zjg7PjgpLlrp/oo4Xlj6/og71cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuICpcbiAqIC8vIGRlY2xhcmUgZXZlbnQgaW50ZXJmYWNlXG4gKiBpbnRlcmZhY2UgU2FtcGxlRXZlbnQge1xuICogICBob2dlOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqICAgZm9vOiBbdm9pZF07ICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3NcbiAqICAgaG9vOiB2b2lkOyAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3MgKHNhbWUgdGhlIHVwb24pXG4gKiAgIGJhcjogW0Vycm9yXTsgICAgICAgICAgICAgICAgICAvLyBhbnkgY2xhc3MgaXMgYXZhaWxhYmxlLlxuICogICBiYXo6IEVycm9yIHwgTnVtYmVyOyAgICAgICAgICAgLy8gaWYgb25seSBvbmUgYXJndW1lbnQsIGBbXWAgaXMgbm90IHJlcXVpcmVkLlxuICogfVxuICpcbiAqIC8vIGRlY2xhcmUgY2xpZW50IGNsYXNzXG4gKiBjbGFzcyBTYW1wbGVQdWJsaXNoZXIgZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxTYW1wbGVFdmVudD4ge1xuICogICA6XG4gKiAgIHNvbWVNZXRob2QoKTogdm9pZCB7XG4gKiAgICAgdGhpcy5wdWJsaXNoKCdob2dlJywgMTAwLCAndGVzdCcpOyAgICAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiAgICAgdGhpcy5wdWJsaXNoKCdob2dlJywgMTAwLCB0cnVlKTsgICAgICAgICAvLyBORy4gYXJndW1lbnQgb2YgdHlwZSAndHJ1ZScgaXMgbm90IGFzc2lnbmFibGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBwYXJhbWV0ZXIgb2YgdHlwZSAnc3RyaW5nIHwgdW5kZWZpbmVkJy5cbiAqICAgICB0aGlzLnB1Ymxpc2goJ2hvZ2UnLCAxMDApOyAgICAgICAgICAgICAgIC8vIE9LLiBhbGwgYXJncyB0byBiZSBvcHRpb25hbCBhdXRvbWF0aWNhbGx5LlxuICogICAgIHRoaXMucHVibGlzaCgnZm9vJyk7ICAgICAgICAgICAgICAgICAgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogICAgIHRoaXMucHVibGlzaCgnZm9vJywgMTAwKTsgICAgICAgICAgICAgICAgLy8gTkcuIGFyZ3VtZW50IG9mIHR5cGUgJzEwMCcgaXMgbm90IGFzc2lnbmFibGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBwYXJhbWV0ZXIgb2YgdHlwZSAndm9pZCB8IHVuZGVmaW5lZCcuXG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBjb25zdCBzYW1wbGUgPSBuZXcgU2FtcGxlUHVibGlzaGVyKCk7XG4gKlxuICogc2FtcGxlLm9uKCdob2dlJywgKGE6IG51bWJlciwgYjogc3RyaW5nKSA9PiB7IC4uLiB9KTsgICAgLy8gT0suIHN0YW5kYXJkIHVzYWdlLlxuICogc2FtcGxlLm9uKCdob2dlJywgKGE6IG51bWJlciwgYjogYm9vbGVhbikgPT4geyAuLi4gfSk7ICAgLy8gTkcuIHR5cGVzIG9mIHBhcmFtZXRlcnMgJ2InXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgYW5kICdhcmdzXzEnIGFyZSBpbmNvbXBhdGlibGUuXG4gKiBzYW1wbGUub24oJ2hvZ2UnLCAoYSkgPT4geyAuLi4gfSk7ICAgICAgICAgICAgICAgICAgICAgICAvLyBPSy4gYWxsIGFyZ3NcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBiZSBvcHRpb25hbCBhdXRvbWF0aWNhbGx5LlxuICogc2FtcGxlLm9uKCdob2dlJywgKGEsIGIsIGMpID0+IHsgLi4uIH0pOyAgICAgICAgICAgICAgICAgLy8gTkcuIGV4cGVjdGVkIDEtMiBhcmd1bWVudHMsXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgYnV0IGdvdCAzLlxuICogYGBgXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBFdmVudFB1Ymxpc2hlcjxFdmVudCBleHRlbmRzIG9iamVjdD4gaW1wbGVtZW50cyBTdWJzY3JpYmFibGU8RXZlbnQ+IHtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBFdmVudFB1Ymxpc2hlciwgdGhpcyk7XG4gICAgICAgIF9tYXBMaXN0ZW5lcnMuc2V0KHRoaXMsIG5ldyBNYXAoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE5vdGlmeSBldmVudCB0byBjbGllbnRzLlxuICAgICAqIEBqYSBldmVudCDnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgavmuKHjgZnlvJXmlbBcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgcHVibGlzaDxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwsIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICB2YWxpZENoYW5uZWwoY2hhbm5lbCk7XG4gICAgICAgIHRyaWdnZXJFdmVudChtYXAsIGNoYW5uZWwsIHVuZGVmaW5lZCwgLi4uYXJncyk7XG4gICAgICAgIC8vIHRyaWdnZXIgZm9yIGFsbCBoYW5kbGVyXG4gICAgICAgIGlmICgnKicgIT09IGNoYW5uZWwpIHtcbiAgICAgICAgICAgIHRyaWdnZXJFdmVudChtYXAgYXMgYW55IGFzIExpc3RlbmVyc01hcDxFdmVudEFsbD4sICcqJywgY2hhbm5lbCBhcyBzdHJpbmcsIC4uLmFyZ3MpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogU3Vic2NyaWJhYmxlPEV2ZW50PlxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHdoZXRoZXIgdGhpcyBvYmplY3QgaGFzIGNsaWVudHMuXG4gICAgICogQGphIOOCr+ODqeOCpOOCouODs+ODiOOBjOWtmOWcqOOBmeOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgaGFzTGlzdGVuZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsPzogQ2hhbm5lbCwgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lcnModGhpcyk7XG4gICAgICAgIGlmIChudWxsID09IGNoYW5uZWwpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXAuc2l6ZSA+IDA7XG4gICAgICAgIH1cbiAgICAgICAgdmFsaWRDaGFubmVsKGNoYW5uZWwpO1xuICAgICAgICBpZiAobnVsbCA9PSBsaXN0ZW5lcikge1xuICAgICAgICAgICAgcmV0dXJuIG1hcC5oYXMoY2hhbm5lbCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFsaWRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoYW5uZWwpO1xuICAgICAgICByZXR1cm4gbGlzdCA/IGxpc3QuaGFzKGxpc3RlbmVyKSA6IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHJlZ2lzdGVyZWQgY2hhbm5lbCBrZXlzLlxuICAgICAqIEBqYSDnmbvpjLLjgZXjgozjgabjgYTjgovjg4Hjg6Pjg43jg6vjgq3jg7zjgpLov5TljbRcbiAgICAgKi9cbiAgICBjaGFubmVscygpOiAoa2V5b2YgRXZlbnQpW10ge1xuICAgICAgICByZXR1cm4gWy4uLmxpc3RlbmVycyh0aGlzKS5rZXlzKCldO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICB2YWxpZExpc3RlbmVyKGxpc3RlbmVyKTtcblxuICAgICAgICBjb25zdCBjaGFubmVscyA9IGlzQXJyYXkoY2hhbm5lbCkgPyBjaGFubmVsIDogW2NoYW5uZWxdO1xuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgICAgICB2YWxpZENoYW5uZWwoY2gpO1xuICAgICAgICAgICAgbWFwLmhhcyhjaCkgPyBtYXAuZ2V0KGNoKSEuYWRkKGxpc3RlbmVyKSA6IG1hcC5zZXQoY2gsIG5ldyBTZXQoW2xpc3RlbmVyXSkpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3QuZnJlZXplKHtcbiAgICAgICAgICAgIGdldCBlbmFibGUoKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbGlzdCB8fCAhbGlzdC5oYXMobGlzdGVuZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdW5zdWJzY3JpYmUoKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsaXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0LmRlbGV0ZShsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0LnNpemUgPiAwIHx8IG1hcC5kZWxldGUoY2gpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKSBidXQgaXQgY2F1c2VzIHRoZSBib3VuZCBjYWxsYmFjayB0byBvbmx5IGZpcmUgb25jZSBiZWZvcmUgYmVpbmcgcmVtb3ZlZC5cbiAgICAgKiBAamEg5LiA5bqm44Gg44GR44OP44Oz44OJ44Oq44Oz44Kw5Y+v6IO944Gq44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb25jZTxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLm9uKGNoYW5uZWwsIGxpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgbWFuYWdlZCA9IHRoaXMub24oY2hhbm5lbCwgKCkgPT4ge1xuICAgICAgICAgICAgY29udGV4dC51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgbWFuYWdlZC51bnN1YnNjcmliZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGV2ZXJ5dGhpbmcgaXMgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuino+mZpFxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WQjOS4gCBgY2hhbm5lbGAg44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbD86IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICBpZiAobnVsbCA9PSBjaGFubmVsKSB7XG4gICAgICAgICAgICBtYXAuY2xlYXIoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2hhbm5lbHMgPSBpc0FycmF5KGNoYW5uZWwpID8gY2hhbm5lbCA6IFtjaGFubmVsXTtcbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSB2YWxpZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgdmFsaWRDaGFubmVsKGNoKTtcbiAgICAgICAgICAgIGlmIChudWxsID09IGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgbWFwLmRlbGV0ZShjaCk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoKTtcbiAgICAgICAgICAgICAgICBpZiAobGlzdCkge1xuICAgICAgICAgICAgICAgICAgICBsaXN0LmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgICAgIGxpc3Quc2l6ZSA+IDAgfHwgbWFwLmRlbGV0ZShjaCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gKi9cblxuaW1wb3J0IHsgQXJndW1lbnRzIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmliYWJsZSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBFdmVudFB1Ymxpc2hlciB9IGZyb20gJy4vcHVibGlzaGVyJztcblxuLy8gcmUtZXhwb3J0XG5leHBvcnQgeyBBcmd1bWVudHMgYXMgRXZlbnRBcmd1bWVudHMgfTtcblxuLyoqXG4gKiBAZW4gRXZlbnRpbmcgZnJhbWV3b3JrIG9iamVjdCBhYmxlIHRvIGNhbGwgYHB1Ymxpc2goKWAgbWV0aG9kIGZyb20gb3V0c2lkZS5cbiAqIEBqYSDlpJbpg6jjgYvjgonjga4gYHB1Ymxpc2goKWAg44KS5Y+v6IO944Gr44GX44Gf44Kk44OZ44Oz44OI55m76Yyy44O755m66KGM44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbiAqXG4gKiAvLyBkZWNsYXJlIGV2ZW50IGludGVyZmFjZVxuICogaW50ZXJmYWNlIFNhbXBsZUV2ZW50IHtcbiAqICAgaG9nZTogW251bWJlciwgc3RyaW5nXTsgICAgICAgIC8vIGNhbGxiYWNrIGZ1bmN0aW9uJ3MgYXJncyB0eXBlIHR1cGxlXG4gKiB9XG4gKlxuICogY29uc3QgYnJva2VyID0gbmV3IEV2ZW50QnJva2VyPFNhbXBsZUV2ZW50PigpO1xuICogYnJva2VyLnRyaWdnZXIoJ2hvZ2UnLCAxMDAsICd0ZXN0Jyk7ICAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiBicm9rZXIudHJpZ2dlcignaG9nZScsIDEwMCwgdHJ1ZSk7ICAgICAgIC8vIE5HLiBhcmd1bWVudCBvZiB0eXBlICd0cnVlJyBpcyBub3QgYXNzaWduYWJsZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdG8gcGFyYW1ldGVyIG9mIHR5cGUgJ3N0cmluZyB8IHVuZGVmaW5lZCcuXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFdmVudEJyb2tlcjxFdmVudCBleHRlbmRzIG9iamVjdD4gZXh0ZW5kcyBTdWJzY3JpYmFibGU8RXZlbnQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gTm90aWZ5IGV2ZW50IHRvIGNsaWVudHMuXG4gICAgICogQGphIGV2ZW50IOeZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGFyZ3VtZW50cyBmb3IgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsOOBq+a4oeOBmeW8leaVsFxuICAgICAqL1xuICAgIHRyaWdnZXI8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsLCAuLi5hcmdzOiBBcmd1bWVudHM8UGFydGlhbDxFdmVudFtDaGFubmVsXT4+KTogdm9pZDtcbn1cblxuLyoqXG4gKiBAZW4gQ29uc3RydWN0b3Igb2YgW1tFdmVudEJyb2tlcl1dXG4gKiBAamEgW1tFdmVudEJyb2tlcl1dIOOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wun+S9k1xuICovXG5leHBvcnQgY29uc3QgRXZlbnRCcm9rZXI6IHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IEV2ZW50QnJva2VyPGFueT47XG4gICAgbmV3IDxUIGV4dGVuZHMgb2JqZWN0PigpOiBFdmVudEJyb2tlcjxUPjtcbn0gPSBFdmVudFB1Ymxpc2hlciBhcyBhbnk7XG5cbkV2ZW50QnJva2VyLnByb3RvdHlwZS50cmlnZ2VyID0gKEV2ZW50UHVibGlzaGVyLnByb3RvdHlwZSBhcyBhbnkpLnB1Ymxpc2g7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBBcmd1bWVudHMsXG4gICAgaXNBcnJheSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgU3Vic2NyaWJhYmxlLFxuICAgIFN1YnNjcmlwdGlvbixcbiAgICBFdmVudFNjaGVtYSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2NvbnRleHQgPSBTeW1ib2woJ2NvbnRleHQnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBTdWJzY3JpcHRpb25NYXAgPSBNYXA8VW5rbm93bkZ1bmN0aW9uLCBTdWJzY3JpcHRpb24+O1xuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBMaXN0ZXJNYXAgICAgICAgPSBNYXA8c3RyaW5nLCBTdWJzY3JpcHRpb25NYXA+O1xuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBTdWJzY3JpcHRpb25TZXQgPSBTZXQ8U3Vic2NyaXB0aW9uPjtcbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgU3Vic2NyaWJhYmxlTWFwID0gV2Vha01hcDxTdWJzY3JpYmFibGUsIExpc3Rlck1hcD47XG5cbi8qKiBAaW50ZXJuYWwgTGlzbmVyIOagvOe0jeW9ouW8jyAqL1xuaW50ZXJmYWNlIENvbnRleHQge1xuICAgIG1hcDogU3Vic2NyaWJhYmxlTWFwO1xuICAgIHNldDogU3Vic2NyaXB0aW9uU2V0O1xufVxuXG4vKiogQGludGVybmFsIHJlZ2lzdGVyIGxpc3RlbmVyIGNvbnRleHQgKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyKGNvbnRleHQ6IENvbnRleHQsIHRhcmdldDogU3Vic2NyaWJhYmxlLCBjaGFubmVsOiBzdHJpbmcgfCBzdHJpbmdbXSwgbGlzdGVuZXI6IFVua25vd25GdW5jdGlvbik6IFN1YnNjcmlwdGlvbiB7XG4gICAgY29uc3Qgc3Vic2NyaXB0aW9uczogU3Vic2NyaXB0aW9uW10gPSBbXTtcblxuICAgIGNvbnN0IGNoYW5uZWxzID0gaXNBcnJheShjaGFubmVsKSA/IGNoYW5uZWwgOiBbY2hhbm5lbF07XG4gICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICBjb25zdCBzID0gdGFyZ2V0Lm9uKGNoLCBsaXN0ZW5lciBhcyBhbnkpO1xuICAgICAgICBjb250ZXh0LnNldC5hZGQocyk7XG4gICAgICAgIHN1YnNjcmlwdGlvbnMucHVzaChzKTtcblxuICAgICAgICBjb25zdCBsaXN0ZW5lck1hcCA9IGNvbnRleHQubWFwLmdldCh0YXJnZXQpIHx8IG5ldyBNYXA8c3RyaW5nLCBNYXA8VW5rbm93bkZ1bmN0aW9uLCBTdWJzY3JpcHRpb24+PigpO1xuICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lck1hcC5nZXQoY2gpIHx8IG5ldyBNYXA8VW5rbm93bkZ1bmN0aW9uLCBTdWJzY3JpcHRpb24+KCk7XG4gICAgICAgIG1hcC5zZXQobGlzdGVuZXIsIHMpO1xuXG4gICAgICAgIGlmICghbGlzdGVuZXJNYXAuaGFzKGNoKSkge1xuICAgICAgICAgICAgbGlzdGVuZXJNYXAuc2V0KGNoLCBtYXApO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY29udGV4dC5tYXAuaGFzKHRhcmdldCkpIHtcbiAgICAgICAgICAgIGNvbnRleHQubWFwLnNldCh0YXJnZXQsIGxpc3RlbmVyTWFwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBPYmplY3QuZnJlZXplKHtcbiAgICAgICAgZ2V0IGVuYWJsZSgpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBzdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKHMuZW5hYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgdW5zdWJzY3JpYmUoKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2Ygc3Vic2NyaXB0aW9ucykge1xuICAgICAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9KTtcbn1cblxuLyoqIEBpbnRlcm5hbCB1bnJlZ2lzdGVyIGxpc3RlbmVyIGNvbnRleHQgKi9cbmZ1bmN0aW9uIHVucmVnaXN0ZXIoY29udGV4dDogQ29udGV4dCwgdGFyZ2V0PzogU3Vic2NyaWJhYmxlLCBjaGFubmVsPzogc3RyaW5nIHwgc3RyaW5nW10sIGxpc3RlbmVyPzogVW5rbm93bkZ1bmN0aW9uKTogdm9pZCB7XG4gICAgaWYgKG51bGwgIT0gdGFyZ2V0KSB7XG4gICAgICAgIHRhcmdldC5vZmYoY2hhbm5lbCwgbGlzdGVuZXIgYXMgYW55KTtcblxuICAgICAgICBjb25zdCBsaXN0ZW5lck1hcCA9IGNvbnRleHQubWFwLmdldCh0YXJnZXQpO1xuICAgICAgICBpZiAoIWxpc3RlbmVyTWFwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bGwgIT0gY2hhbm5lbCkge1xuICAgICAgICAgICAgY29uc3QgY2hhbm5lbHMgPSBpc0FycmF5KGNoYW5uZWwpID8gY2hhbm5lbCA6IFtjaGFubmVsXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lck1hcC5nZXQoY2gpO1xuICAgICAgICAgICAgICAgIGlmICghbWFwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxpc3RlbmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHMgPSBtYXAuZ2V0KGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuc2V0LmRlbGV0ZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBtYXAuZGVsZXRlKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHMgb2YgbWFwLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnNldC5kZWxldGUocyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG1hcCBvZiBsaXN0ZW5lck1hcC52YWx1ZXMoKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcyBvZiBtYXAudmFsdWVzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnNldC5kZWxldGUocyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChjb25zdCBzIG9mIGNvbnRleHQuc2V0KSB7XG4gICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5tYXAgPSBuZXcgV2Vha01hcCgpO1xuICAgICAgICBjb250ZXh0LnNldC5jbGVhcigpO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyB0byB3aGljaCB0aGUgc2FmZSBldmVudCByZWdpc3Rlci91bnJlZ2lzdGVyIG1ldGhvZCBpcyBvZmZlcmVkIGZvciB0aGUgb2JqZWN0IHdoaWNoIGlzIGEgc2hvcnQgbGlmZSBjeWNsZSB0aGFuIHN1YnNjcmlwdGlvbiB0YXJnZXQuIDxicj5cbiAqICAgICBUaGUgYWR2YW50YWdlIG9mIHVzaW5nIHRoaXMgZm9ybSwgaW5zdGVhZCBvZiBgb24oKWAsIGlzIHRoYXQgYGxpc3RlblRvKClgIGFsbG93cyB0aGUgb2JqZWN0IHRvIGtlZXAgdHJhY2sgb2YgdGhlIGV2ZW50cyxcbiAqICAgICBhbmQgdGhleSBjYW4gYmUgcmVtb3ZlZCBhbGwgYXQgb25jZSBsYXRlciBjYWxsIGBzdG9wTGlzdGVuaW5nKClgLlxuICogQGphIOizvOiqreWvvuixoeOCiOOCiuOCguODqeOCpOODleOCteOCpOOCr+ODq+OBjOefreOBhOOCquODluOCuOOCp+OCr+ODiOOBq+WvvuOBl+OBpiwg5a6J5YWo44Gq44Kk44OZ44Oz44OI55m76YyyL+ino+mZpOODoeOCveODg+ODieOCkuaPkOS+m+OBmeOCi+OCr+ODqeOCuSA8YnI+XG4gKiAgICAgYG9uKClgIOOBruS7o+OCj+OCiuOBqyBgbGlzdGVuVG8oKWAg44KS5L2/55So44GZ44KL44GT44Go44GnLCDlvozjgasgYHN0b3BMaXN0ZW5pbmcoKWAg44KSMeW6puWRvOOBtuOBoOOBkeOBp+OBmeOBueOBpuOBruODquOCueODiuODvOOCkuino+mZpOOBp+OBjeOCi+WIqeeCueOBjOOBguOCiy5cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEV2ZW50UmVjZWl2ZXIsIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuICpcbiAqIC8vIGRlY2xhcmUgZXZlbnQgaW50ZXJmYWNlXG4gKiBpbnRlcmZhY2UgU2FtcGxlRXZlbnQge1xuICogICBob2dlOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqICAgZm9vOiBbdm9pZF07ICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3NcbiAqICAgaG9vOiB2b2lkOyAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGFyZ3MgKHNhbWUgdGhlIHVwb24pXG4gKiAgIGJhcjogW0Vycm9yXTsgICAgICAgICAgICAgICAgICAvLyBhbnkgY2xhc3MgaXMgYXZhaWxhYmxlLlxuICogICBiYXo6IEVycm9yIHwgTnVtYmVyOyAgICAgICAgICAgLy8gaWYgb25seSBvbmUgYXJndW1lbnQsIGBbXWAgaXMgbm90IHJlcXVpcmVkLlxuICogfVxuICpcbiAqIC8vIGRlY2xhcmUgY2xpZW50IGNsYXNzXG4gKiBjbGFzcyBTYW1wbGVSZWNlaXZlciBleHRlbmRzIEV2ZW50UmVjZWl2ZXIge1xuICogICBjb25zdHJ1Y3Rvcihicm9rZXI6IEV2ZW50QnJva2VyPFNhbXBsZUV2ZW50Pikge1xuICogICAgIHN1cGVyKCk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsICdob2dlJywgKG51bTogbnVtYmVyLCBzdHI6IHN0cmluZykgPT4geyAuLi4gfSk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsICdiYXInLCAoZTogRXJyb3IpID0+IHsgLi4uIH0pO1xuICogICAgIHRoaXMubGlzdGVuVG8oYnJva2VyLCBbJ2ZvbycsICdob28nXSwgKCkgPT4geyAuLi4gfSk7XG4gKiAgIH1cbiAqXG4gKiAgIHJlbGVhc2UoKTogdm9pZCB7XG4gKiAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIG9yXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGJyb2tlciAgID0gbmV3IEV2ZW50QnJva2VyPFNhbXBsZUV2ZW50PigpO1xuICogY29uc3QgcmVjZWl2ZXIgPSBuZXcgRXZlbnRSZWNlaXZlcigpO1xuICpcbiAqIHJlY2VpdmVyLmxpc3RlblRvKGJyb2tlciwgJ2hvZ2UnLCAobnVtOiBudW1iZXIsIHN0cjogc3RyaW5nKSA9PiB7IC4uLiB9KTtcbiAqIHJlY2VpdmVyLmxpc3RlblRvKGJyb2tlciwgJ2JhcicsIChlOiBFcnJvcikgPT4geyAuLi4gfSk7XG4gKiByZWNlaXZlci5saXN0ZW5Ubyhicm9rZXIsIFsnZm9vJywgJ2hvbyddLCAoKSA9PiB7IC4uLiB9KTtcbiAqXG4gKiByZWNlaXZlci5zdG9wTGlzdGVuaW5nKCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIEV2ZW50UmV2Y2VpdmVyIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX2NvbnRleHRdOiBDb250ZXh0O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXNbX2NvbnRleHRdID0geyBtYXA6IG5ldyBXZWFrTWFwKCksIHNldDogbmV3IFNldCgpIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRlbGwgYW4gb2JqZWN0IHRvIGxpc3RlbiB0byBhIHBhcnRpY3VsYXIgZXZlbnQgb24gYW4gb3RoZXIgb2JqZWN0LlxuICAgICAqIEBqYSDlr77osaHjgqrjg5bjgrjjgqfjgq/jg4jjga7jgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0YXJnZXRcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGxpc3RlbmluZyB0YXJnZXQgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI6LO86Kqt5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBsaXN0ZW5UbzxUIGV4dGVuZHMgU3Vic2NyaWJhYmxlLCBFdmVudCBleHRlbmRzIEV2ZW50U2NoZW1hPFQ+ID0gRXZlbnRTY2hlbWE8VD4sIENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudCA9IGtleW9mIEV2ZW50PihcbiAgICAgICAgdGFyZ2V0OiBULFxuICAgICAgICBjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLFxuICAgICAgICBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd25cbiAgICApOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICByZXR1cm4gcmVnaXN0ZXIodGhpc1tfY29udGV4dF0sIHRhcmdldCwgY2hhbm5lbCBhcyBzdHJpbmcsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVzdCBsaWtlIGxpc3RlblRvLCBidXQgY2F1c2VzIHRoZSBib3VuZCBjYWxsYmFjayB0byBmaXJlIG9ubHkgb25jZSBiZWZvcmUgYmVpbmcgcmVtb3ZlZC5cbiAgICAgKiBAamEg5a++6LGh44Kq44OW44K444Kn44Kv44OI44Gu5LiA5bqm44Gg44GR44OP44Oz44OJ44Oq44Oz44Kw5Y+v6IO944Gq44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0XG4gICAgICogIC0gYGVuYCBldmVudCBsaXN0ZW5pbmcgdGFyZ2V0IG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOizvOiqreWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgbGlzdGVuVG9PbmNlPFQgZXh0ZW5kcyBTdWJzY3JpYmFibGUsIEV2ZW50IGV4dGVuZHMgRXZlbnRTY2hlbWE8VD4gPSBFdmVudFNjaGVtYTxUPiwgQ2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50ID0ga2V5b2YgRXZlbnQ+KFxuICAgICAgICB0YXJnZXQ6IFQsXG4gICAgICAgIGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sXG4gICAgICAgIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93blxuICAgICk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSByZWdpc3Rlcih0aGlzW19jb250ZXh0XSwgdGFyZ2V0LCBjaGFubmVsIGFzIHN0cmluZywgbGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBtYW5hZ2VkID0gdGFyZ2V0Lm9uKGNoYW5uZWwsICgpID0+IHtcbiAgICAgICAgICAgIHVucmVnaXN0ZXIodGhpc1tfY29udGV4dF0sIHRhcmdldCwgY2hhbm5lbCBhcyBzdHJpbmcsIGxpc3RlbmVyKTtcbiAgICAgICAgICAgIG1hbmFnZWQudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjb250ZXh0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUZWxsIGFuIG9iamVjdCB0byBzdG9wIGxpc3RlbmluZyB0byBldmVudHMuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHRhcmdldFxuICAgICAqICAtIGBlbmAgZXZlbnQgbGlzdGVuaW5nIHRhcmdldCBvYmplY3QuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGV2ZXJ5dGhpbmcgaXMgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jos7zoqq3lr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuOBruODquOCueODiuODvOOCkuino+mZpFxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGV2ZXJ5dGhpbmcgaXMgcmVsZWFzZWQgbGlzdGVuZXJzIGZyb20gYHRhcmdldGAuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WvvuixoSBgdGFyZ2V0YCDjga7jg6rjgrnjg4rjg7zjgpLjgZnjgbnjgabop6PpmaRcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgYWxsIHNhbWUgYGNoYW5uZWxgIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/lkIzkuIAgYGNoYW5uZWxgIOOBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIHB1YmxpYyBzdG9wTGlzdGVuaW5nPFQgZXh0ZW5kcyBTdWJzY3JpYmFibGUsIEV2ZW50IGV4dGVuZHMgRXZlbnRTY2hlbWE8VD4gPSBFdmVudFNjaGVtYTxUPiwgQ2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50ID0ga2V5b2YgRXZlbnQ+KFxuICAgICAgICB0YXJnZXQ/OiBULFxuICAgICAgICBjaGFubmVsPzogQ2hhbm5lbCB8IENoYW5uZWxbXSxcbiAgICAgICAgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93blxuICAgICk6IHRoaXMge1xuICAgICAgICB1bnJlZ2lzdGVyKHRoaXNbX2NvbnRleHRdLCB0YXJnZXQsIGNoYW5uZWwgYXMgc3RyaW5nLCBsaXN0ZW5lcik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7IG1peGlucyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudEJyb2tlciB9IGZyb20gJy4vYnJva2VyJztcbmltcG9ydCB7IEV2ZW50UmV2Y2VpdmVyIH0gZnJvbSAnLi9yZWNlaXZlcic7XG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyB3aGljaCBoYXZlIEkvRiBvZiBbW0V2ZW50QnJva2VyXV0gYW5kIFtbRXZlbnRSZXZjZWl2ZXJdXS4gPGJyPlxuICogICAgIGBFdmVudHNgIGNsYXNzIG9mIGBCYWNrYm9uZS5qc2AgZXF1aXZhbGVuY2UuXG4gKiBAamEgW1tFdmVudEJyb2tlcl1dIOOBqCBbW0V2ZW50UmV2Y2VpdmVyXV0g44GuIEkvRiDjgpLjgYLjgo/jgZvmjIHjgaTjgq/jg6njgrkgPGJyPlxuICogICAgIGBCYWNrYm9uZS5qc2Ag44GuIGBFdmVudHNgIOOCr+ODqeOCueebuOW9k1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgRXZlbnRTb3VyY2UgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG4gKlxuICogLy8gZGVjbGFyZSBldmVudCBpbnRlcmZhY2VcbiAqIGludGVyZmFjZSBUYXJnZXRFdmVudCB7XG4gKiAgIGhvZ2U6IFtudW1iZXIsIHN0cmluZ107ICAgICAgICAvLyBjYWxsYmFjayBmdW5jdGlvbidzIGFyZ3MgdHlwZSB0dXBsZVxuICogICBmb286IFt2b2lkXTsgICAgICAgICAgICAgICAgICAgLy8gbm8gYXJnc1xuICogICBob286IHZvaWQ7ICAgICAgICAgICAgICAgICAgICAgLy8gbm8gYXJncyAoc2FtZSB0aGUgdXBvbilcbiAqICAgYmFyOiBbRXJyb3JdOyAgICAgICAgICAgICAgICAgIC8vIGFueSBjbGFzcyBpcyBhdmFpbGFibGUuXG4gKiAgIGJhejogRXJyb3IgfCBOdW1iZXI7ICAgICAgICAgICAvLyBpZiBvbmx5IG9uZSBhcmd1bWVudCwgYFtdYCBpcyBub3QgcmVxdWlyZWQuXG4gKiB9XG4gKlxuICogaW50ZXJmYWNlIFNhbXBsZUV2ZW50IHtcbiAqICAgZnVnYTogW251bWJlciwgc3RyaW5nXTsgICAgICAgIC8vIGNhbGxiYWNrIGZ1bmN0aW9uJ3MgYXJncyB0eXBlIHR1cGxlXG4gKiB9XG4gKlxuICogLy8gZGVjbGFyZSBjbGllbnQgY2xhc3NcbiAqIGNsYXNzIFNhbXBsZVNvdXJjZSBleHRlbmRzIEV2ZW50U291cmNlPFNhbXBsZUV2ZW50PiB7XG4gKiAgIGNvbnN0cnVjdG9yKHRhcmdldDogRXZlbnRTb3VyY2U8VGFyZ2V0RXZlbnQ+KSB7XG4gKiAgICAgc3VwZXIoKTtcbiAqICAgICB0aGlzLmxpc3RlblRvKGJyb2tlciwgJ2hvZ2UnLCAobnVtOiBudW1iZXIsIHN0cjogc3RyaW5nKSA9PiB7IC4uLiB9KTtcbiAqICAgICB0aGlzLmxpc3RlblRvKGJyb2tlciwgJ2JhcicsIChlOiBFcnJvcikgPT4geyAuLi4gfSk7XG4gKiAgICAgdGhpcy5saXN0ZW5Ubyhicm9rZXIsIFsnZm9vJywgJ2hvbyddLCAoKSA9PiB7IC4uLiB9KTtcbiAqICAgfVxuICpcbiAqICAgcmVsZWFzZSgpOiB2b2lkIHtcbiAqICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAqICAgfVxuICogfVxuICpcbiAqIGNvbnN0IHNhbXBsZSA9IG5ldyBTYW1wbGVTb3VyY2UoKTtcbiAqXG4gKiBzYW1wbGUub24oJ2Z1Z2EnLCAoYTogbnVtYmVyLCBiOiBzdHJpbmcpID0+IHsgLi4uIH0pOyAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiBzYW1wbGUudHJpZ2dlcignZnVnYScsIDEwMCwgJ3Rlc3QnKTsgICAgICAgICAgICAgICAgICAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiBgYGBcbiAqL1xudHlwZSBFdmVudFNvdXJjZUJhc2U8VCBleHRlbmRzIG9iamVjdD4gPSBFdmVudEJyb2tlcjxUPiAmIEV2ZW50UmV2Y2VpdmVyO1xuXG4vKiogQGludGVybmFsIFtbRXZlbnRTb3VyY2VdXSBjbGFzcyAqL1xuY2xhc3MgRXZlbnRTb3VyY2UgZXh0ZW5kcyBtaXhpbnMoRXZlbnRCcm9rZXIsIEV2ZW50UmV2Y2VpdmVyKSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuc3VwZXIoRXZlbnRSZXZjZWl2ZXIpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29uc3RydWN0b3Igb2YgW1tFdmVudFNvdXJjZV1dXG4gKiBAamEgW1tFdmVudFNvdXJjZV1dIOOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wun+S9k1xuICovXG5jb25zdCBFdmVudFNvdXJjZUJhc2U6IHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IEV2ZW50U291cmNlQmFzZTxhbnk+O1xuICAgIG5ldyA8VCBleHRlbmRzIG9iamVjdD4oKTogRXZlbnRTb3VyY2VCYXNlPFQ+O1xufSA9IEV2ZW50U291cmNlIGFzIGFueTtcblxuZXhwb3J0IHsgRXZlbnRTb3VyY2VCYXNlIGFzIEV2ZW50U291cmNlIH07XG4iXSwibmFtZXMiOlsiaXNTdHJpbmciLCJpc1N5bWJvbCIsImNsYXNzTmFtZSIsInZlcmlmeSIsImlzQXJyYXkiLCJtaXhpbnMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7OztJQXFCQTtJQUNBLE1BQU0sYUFBYSxHQUFHLElBQUksT0FBTyxFQUEwQyxDQUFDO0lBRTVFO0lBQ0EsU0FBUyxTQUFTLENBQW1CLFFBQTJCO1FBQzVELElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzlCLE1BQU0sSUFBSSxTQUFTLENBQUMscUNBQXFDLENBQUMsQ0FBQztTQUM5RDtRQUNELE9BQU8sYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQW9CLENBQUM7SUFDMUQsQ0FBQztJQUVEO0lBQ0EsU0FBUyxZQUFZLENBQUMsT0FBZ0I7UUFDbEMsSUFBSUEsa0JBQVEsQ0FBQyxPQUFPLENBQUMs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RyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7WUFDNUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztTQUN2QjtJQUNMLENBQUM7SUFFRDtJQUVBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O1VBaURhLGNBQWM7O1FBS3ZCO1lBQ0ksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksT0FBTyxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksR0FBRyxFQUFFLEVBQUUsQ0FBQztTQUMzRDs7Ozs7Ozs7Ozs7Ozs7O1FBZ0JNLFFBQVEsQ0FDWCxNQUFTLEVBQ1QsT0FBNEIsRUFDNUIsUUFBeUQ7WUFFekQsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFpQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ3hFOzs7Ozs7Ozs7Ozs7Ozs7UUFnQk0sWUFBWSxDQUNmLE1BQVMsRUFDVCxPQUE0QixFQUM1QixRQUF5RDtZQUV6RCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFpQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzlFLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFO2dCQUMvQixVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFpQixFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUNoRSxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7YUFDekIsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxPQUFPLENBQUM7U0FDbEI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztRQXNCTSxhQUFhLENBQ2hCLE1BQVUsRUFDVixPQUE2QixFQUM3QixRQUEwRDtZQUUxRCxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFpQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ2hFLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7OztJQzlQTDs7O0lBc0RBO0lBQ0EsTUFBTSxXQUFZLFNBQVFDLGdCQUFNLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQztRQUN6RDtZQUNJLEtBQUssRUFBRSxDQUFDO1lBQ1IsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztTQUM5QjtLQUNKO0lBRUQ7Ozs7VUFJTSxlQUFlLEdBR2pCOzs7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9ldmVudHMvIn0=
