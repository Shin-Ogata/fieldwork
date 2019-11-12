/*!
 * @cdp/event-publisher 0.9.0
 *   pub/sub framework
 */

import { verify, isArray, isString, isSymbol, className } from '@cdp/core-utils';

/* eslint-disable @typescript-eslint/no-explicit-any */
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
        const list = map.get(channel);
        if (!list) {
            return;
        }
        for (const listener of list) {
            try {
                const handled = listener(...args);
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
    has(channel, listener) {
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
            return;
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
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @en Constructor of EventBroker
 * @ja EventBroker のコンストラクタ実体
 */
const EventBroker = EventPublisher;

export { EventBroker, EventPublisher };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQtcHVibGlzaGVyLm1qcyIsInNvdXJjZXMiOlsicHVibGlzaGVyLnRzIiwiYnJva2VyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuaW1wb3J0IHtcbiAgICBBcmd1bWVudHMsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBpc1N5bWJvbCxcbiAgICBjbGFzc05hbWUsXG4gICAgdmVyaWZ5LFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uLCBTdWJzY3JpYmFibGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIExpc25lciDmoLzntI3lvaLlvI8gKi9cbnR5cGUgTGlzdGVuZXJzTWFwPFQ+ID0gTWFwPGtleW9mIFQsIFNldDwoLi4uYXJnczogVFtrZXlvZiBUXVtdKSA9PiB1bmtub3duPj47XG5cbi8qKiBAaW50ZXJuYWwgTGlzbmVyIOOBruW8seWPgueFpyAqL1xuY29uc3QgX21hcExpc3RlbmVycyA9IG5ldyBXZWFrTWFwPEV2ZW50UHVibGlzaGVyPGFueT4sIExpc3RlbmVyc01hcDxhbnk+PigpO1xuXG4vKiogQGludGVybmFsIExpc25lck1hcCDjga7lj5blvpcgKi9cbmZ1bmN0aW9uIGxpc3RlbmVyczxUPihpbnN0YW5jZTogRXZlbnRQdWJsaXNoZXI8VD4pOiBMaXN0ZW5lcnNNYXA8VD4ge1xuICAgIGlmICghX21hcExpc3RlbmVycy5oYXMoaW5zdGFuY2UpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoaXMgaXMgbm90IGEgdmFsaWQgRXZlbnRQdWJsaXNoZXIuJyk7XG4gICAgfVxuICAgIHJldHVybiBfbWFwTGlzdGVuZXJzLmdldChpbnN0YW5jZSkgYXMgTGlzdGVuZXJzTWFwPFQ+O1xufVxuXG4vKiogQGludGVybmFsIENoYW5uZWwg44Gu5Z6L5qSc6Ki8ICovXG5mdW5jdGlvbiB2YWxpZENoYW5uZWwoY2hhbm5lbDogdW5rbm93bik6IHZvaWQgfCBuZXZlciB7XG4gICAgaWYgKGlzU3RyaW5nKGNoYW5uZWwpIHx8IGlzU3ltYm9sKGNoYW5uZWwpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVHlwZSBvZiAke2NsYXNzTmFtZShjaGFubmVsKX0gaXMgbm90IGEgdmFsaWQgY2hhbm5lbC5gKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBMaXN0ZW5lciDjga7lnovmpJzoqLwgKi9cbmZ1bmN0aW9uIHZhbGlkTGlzdGVuZXIobGlzdGVuZXI/OiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB1bmtub3duKTogYW55IHwgbmV2ZXIge1xuICAgIGlmIChudWxsICE9IGxpc3RlbmVyKSB7XG4gICAgICAgIHZlcmlmeSgndHlwZU9mJywgJ2Z1bmN0aW9uJywgbGlzdGVuZXIpO1xuICAgIH1cbiAgICByZXR1cm4gbGlzdGVuZXI7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBFdmVudGluZyBmcmFtZXdvcmsgY2xhc3Mgd2l0aCBlbnN1cmluZyB0eXBlLXNhZmUgZm9yIFR5cGVTY3JpcHQuIDxicj5cbiAqICAgICBUaGUgY2xpZW50IG9mIHRoaXMgY2xhc3MgY2FuIGltcGxlbWVudCBvcmlnaW5hbCBQdWItU3ViIChPYnNlcnZlcikgZGVzaWduIHBhdHRlcm4uXG4gKiBAamEg5Z6L5a6J5YWo44KS5L+d6Zqc44GZ44KL44Kk44OZ44Oz44OI55m76Yyy44O755m66KGM44Kv44Op44K5IDxicj5cbiAqICAgICDjgq/jg6njgqTjgqLjg7Pjg4jjga/mnKzjgq/jg6njgrnjgpLmtL7nlJ/jgZfjgabni6zoh6rjga4gUHViLVN1YiAoT2JzZXJ2ZXIpIOODkeOCv+ODvOODs+OCkuWun+ijheWPr+iDvVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50LXB1Ymxpc2hlcic7XG4gKlxuICogLy8gZGVjbGFyZSBldmVudCBpbnRlcmZhY2VcbiAqIGludGVyZmFjZSBTYW1wbGVFdmVudCB7XG4gKiAgIGhvZ2U6IFtudW1iZXIsIHN0cmluZ107ICAgICAgICAvLyBjYWxsYmFjayBmdW5jdGlvbidzIGFyZ3MgdHlwZSB0dXBsZVxuICogICBmb286IFt2b2lkXTsgICAgICAgICAgICAgICAgICAgLy8gbm8gYXJnc1xuICogICBob286IHZvaWQ7ICAgICAgICAgICAgICAgICAgICAgLy8gbm8gYXJncyAoc2FtZSB0aGUgdXBvbilcbiAqICAgYmFyOiBbRXJyb3JdOyAgICAgICAgICAgICAgICAgIC8vIGFueSBjbGFzcyBpcyBhdmFpbGFibGUuXG4gKiAgIGJhejogRXJyb3IgfCBOdW1iZXI7ICAgICAgICAgICAvLyBpZiBvbmx5IG9uZSBhcmd1bWVudCwgYFtdYCBpcyBub3QgcmVxdWlyZWQuXG4gKiB9XG4gKlxuICogLy8gZGVjbGFyZSBjbGllbnQgY2xhc3NcbiAqIGNsYXNzIFNhbXBsZVB1Ymxpc2hlciBleHRlbmRzIEV2ZW50UHVibGlzaGVyPFNhbXBsZUV2ZW50PiB7XG4gKiAgIDpcbiAqICAgc29tZU1ldGhvZCgpOiB2b2lkIHtcbiAqICAgICB0aGlzLnB1Ymxpc2goJ2hvZ2UnLCAxMDAsICd0ZXN0Jyk7ICAgICAgIC8vIE9LLiBzdGFuZGFyZCB1c2FnZS5cbiAqICAgICB0aGlzLnB1Ymxpc2goJ2hvZ2UnLCAxMDAsIHRydWUpOyAgICAgICAgIC8vIE5HLiBhcmd1bWVudCBvZiB0eXBlICd0cnVlJyBpcyBub3QgYXNzaWduYWJsZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIHRvIHBhcmFtZXRlciBvZiB0eXBlICdzdHJpbmcgfCB1bmRlZmluZWQnLlxuICogICAgIHRoaXMucHVibGlzaCgnaG9nZScsIDEwMCk7ICAgICAgICAgICAgICAgLy8gT0suIGFsbCBhcmdzIHRvIGJlIG9wdGlvbmFsIGF1dG9tYXRpY2FsbHkuXG4gKiAgICAgdGhpcy5wdWJsaXNoKCdmb28nKTsgICAgICAgICAgICAgICAgICAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiAgICAgdGhpcy5wdWJsaXNoKCdmb28nLCAxMDApOyAgICAgICAgICAgICAgICAvLyBORy4gYXJndW1lbnQgb2YgdHlwZSAnMTAwJyBpcyBub3QgYXNzaWduYWJsZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIHRvIHBhcmFtZXRlciBvZiB0eXBlICd2b2lkIHwgdW5kZWZpbmVkJy5cbiAqICAgfVxuICogfVxuICpcbiAqIGNvbnN0IHNhbXBsZSA9IG5ldyBTYW1wbGVQdWJsaXNoZXIoKTtcbiAqXG4gKiBzYW1wbGUub24oJ2hvZ2UnLCAoYTogbnVtYmVyLCBiOiBzdHJpbmcpID0+IHsgLi4uIH0pOyAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiBzYW1wbGUub24oJ2hvZ2UnLCAoYTogbnVtYmVyLCBiOiBib29sZWFuKSA9PiB7IC4uLiB9KTsgICAvLyBORy4gdHlwZXMgb2YgcGFyYW1ldGVycyAnYidcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICBhbmQgJ2FyZ3NfMScgYXJlIGluY29tcGF0aWJsZS5cbiAqIHNhbXBsZS5vbignaG9nZScsIChhKSA9PiB7IC4uLiB9KTsgICAgICAgICAgICAgICAgICAgICAgIC8vIE9LLiBhbGwgYXJnc1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIHRvIGJlIG9wdGlvbmFsIGF1dG9tYXRpY2FsbHkuXG4gKiBzYW1wbGUub24oJ2hvZ2UnLCAoYSwgYiwgYykgPT4geyAuLi4gfSk7ICAgICAgICAgICAgICAgICAvLyBORy4gZXhwZWN0ZWQgMS0yIGFyZ3VtZW50cyxcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICBidXQgZ290IDMuXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEV2ZW50UHVibGlzaGVyPEV2ZW50PiBpbXBsZW1lbnRzIFN1YnNjcmliYWJsZTxFdmVudD4ge1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIEV2ZW50UHVibGlzaGVyLCB0aGlzKTtcbiAgICAgICAgX21hcExpc3RlbmVycy5zZXQodGhpcywgbmV3IE1hcCgpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTm90aWZ5IGV2ZW50IHRvIGNsaWVudHMuXG4gICAgICogQGphIGV2ZW50IOeZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGFyZ3VtZW50cyBmb3IgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsOOBq+a4oeOBmeW8leaVsFxuICAgICAqL1xuICAgIHByb3RlY3RlZCBwdWJsaXNoPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCwgLi4uYXJnczogQXJndW1lbnRzPFBhcnRpYWw8RXZlbnRbQ2hhbm5lbF0+Pik6IHZvaWQge1xuICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lcnModGhpcyk7XG4gICAgICAgIHZhbGlkQ2hhbm5lbChjaGFubmVsKTtcbiAgICAgICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2hhbm5lbCk7XG4gICAgICAgIGlmICghbGlzdCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgbGlzdGVuZXIgb2YgbGlzdCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBoYW5kbGVkID0gbGlzdGVuZXIoLi4uYXJncyk7XG4gICAgICAgICAgICAgICAgLy8gaWYgcmVjZWl2ZWQgJ3RydWUnLCBzdG9wIGRlbGVnYXRpb24uXG4gICAgICAgICAgICAgICAgaWYgKHRydWUgPT09IGhhbmRsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIFByb21pc2UucmVqZWN0KGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogU3Vic2NyaWJhYmxlPEV2ZW50PlxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHdoZXRoZXIgdGhpcyBvYmplY3QgaGFzIGNsaWVudHMuXG4gICAgICogQGphIOOCr+ODqeOCpOOCouODs+ODiOOBjOWtmOWcqOOBmeOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgaGFzPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbD86IENoYW5uZWwsIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICBpZiAobnVsbCA9PSBjaGFubmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFwLnNpemUgPiAwO1xuICAgICAgICB9XG4gICAgICAgIHZhbGlkQ2hhbm5lbChjaGFubmVsKTtcbiAgICAgICAgaWYgKG51bGwgPT0gbGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXAuaGFzKGNoYW5uZWwpO1xuICAgICAgICB9XG4gICAgICAgIHZhbGlkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaGFubmVsKTtcbiAgICAgICAgcmV0dXJuIGxpc3QgPyBsaXN0LmhhcyhsaXN0ZW5lcikgOiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyByZWdpc3RlcmVkIGNoYW5uZWwga2V5cy5cbiAgICAgKiBAamEg55m76Yyy44GV44KM44Gm44GE44KL44OB44Oj44ON44Or44Kt44O844KS6L+U5Y20XG4gICAgICovXG4gICAgY2hhbm5lbHMoKTogKGtleW9mIEV2ZW50KVtdIHtcbiAgICAgICAgcmV0dXJuIFsuLi5saXN0ZW5lcnModGhpcykua2V5cygpXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgZXZlcnl0aGluZyBpcyByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm6Kej6ZmkXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGFsbCBzYW1lIGBjaGFubmVsYCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5ZCM5LiAIGBjaGFubmVsYCDjgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvZmY8Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsPzogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI/OiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IHZvaWQge1xuICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lcnModGhpcyk7XG4gICAgICAgIGlmIChudWxsID09IGNoYW5uZWwpIHtcbiAgICAgICAgICAgIG1hcC5jbGVhcigpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2hhbm5lbHMgPSBpc0FycmF5KGNoYW5uZWwpID8gY2hhbm5lbCA6IFtjaGFubmVsXTtcbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSB2YWxpZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgdmFsaWRDaGFubmVsKGNoKTtcbiAgICAgICAgICAgIGlmIChudWxsID09IGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgbWFwLmRlbGV0ZShjaCk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoKTtcbiAgICAgICAgICAgICAgICBpZiAobGlzdCkge1xuICAgICAgICAgICAgICAgICAgICBsaXN0LmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgICAgIGxpc3Quc2l6ZSA+IDAgfHwgbWFwLmRlbGV0ZShjaCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb248Q2hhbm5lbCBleHRlbmRzIGtleW9mIEV2ZW50PihjaGFubmVsOiBDaGFubmVsIHwgQ2hhbm5lbFtdLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lcnModGhpcyk7XG4gICAgICAgIHZhbGlkTGlzdGVuZXIobGlzdGVuZXIpO1xuXG4gICAgICAgIGNvbnN0IGNoYW5uZWxzID0gaXNBcnJheShjaGFubmVsKSA/IGNoYW5uZWwgOiBbY2hhbm5lbF07XG4gICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgIHZhbGlkQ2hhbm5lbChjaCk7XG4gICAgICAgICAgICBtYXAuaGFzKGNoKSA/IG1hcC5nZXQoY2gpIS5hZGQobGlzdGVuZXIpIDogbWFwLnNldChjaCwgbmV3IFNldChbbGlzdGVuZXJdKSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5mcmVlemUoe1xuICAgICAgICAgICAgZ2V0IGVuYWJsZSgpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFsaXN0IHx8ICFsaXN0LmhhcyhsaXN0ZW5lcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1bnN1YnNjcmliZSgpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBtYXAuZ2V0KGNoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3QuZGVsZXRlKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3Quc2l6ZSA+IDAgfHwgbWFwLmRlbGV0ZShjaCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpIGJ1dCBpdCBjYXVzZXMgdGhlIGJvdW5kIGNhbGxiYWNrIHRvIG9ubHkgZmlyZSBvbmNlIGJlZm9yZSBiZWluZyByZW1vdmVkLlxuICAgICAqIEBqYSDkuIDluqbjgaDjgZHjg4/jg7Pjg4njg6rjg7PjgrDlj6/og73jgarjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbmNlPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMub24oY2hhbm5lbCwgbGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBtYW5hZ2VkID0gdGhpcy5vbihjaGFubmVsLCAoKSA9PiB7XG4gICAgICAgICAgICBjb250ZXh0LnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICBtYW5hZ2VkLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29udGV4dDtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7IEFyZ3VtZW50cywgU3Vic2NyaWJhYmxlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnLi9wdWJsaXNoZXInO1xuXG4vKipcbiAqIEBlbiBFdmVudGluZyBmcmFtZXdvcmsgb2JqZWN0IGFibGUgdG8gY2FsbCBgcHVibGlzaCgpYCBtZXRob2QgZnJvbSBvdXRzaWRlLlxuICogQGphIOWklumDqOOBi+OCieOBriBgcHVibGlzaCgpYCDjgpLlj6/og73jgavjgZfjgZ/jgqTjg5njg7Pjg4jnmbvpjLLjg7vnmbrooYzjgq/jg6njgrlcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudC1wdWJsaXNoZXInO1xuICpcbiAqIC8vIGRlY2xhcmUgZXZlbnQgaW50ZXJmYWNlXG4gKiBpbnRlcmZhY2UgU2FtcGxlRXZlbnQge1xuICogICBob2dlOiBbbnVtYmVyLCBzdHJpbmddOyAgICAgICAgLy8gY2FsbGJhY2sgZnVuY3Rpb24ncyBhcmdzIHR5cGUgdHVwbGVcbiAqIH1cbiAqXG4gKiBjb25zdCBicm9rZXIgPSBuZXcgRXZlbnRCcm9rZXI8U2FtcGxlRXZlbnQ+KCk7XG4gKiBicm9rZXIucHVibGlzaCgnaG9nZScsIDEwMCwgJ3Rlc3QnKTsgICAgIC8vIE9LLiBzdGFuZGFyZCB1c2FnZS5cbiAqIGJyb2tlci5wdWJsaXNoKCdob2dlJywgMTAwLCB0cnVlKTsgICAgICAgLy8gTkcuIGFyZ3VtZW50IG9mIHR5cGUgJ3RydWUnIGlzIG5vdCBhc3NpZ25hYmxlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0byBwYXJhbWV0ZXIgb2YgdHlwZSAnc3RyaW5nIHwgdW5kZWZpbmVkJy5cbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEV2ZW50QnJva2VyPEV2ZW50IGV4dGVuZHMge30+IGV4dGVuZHMgU3Vic2NyaWJhYmxlPEV2ZW50PiB7XG4gICAgLyoqXG4gICAgICogQGVuIE5vdGlmeSBldmVudCB0byBjbGllbnRzLlxuICAgICAqIEBqYSBldmVudCDnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uIG9mIHRoZSBgY2hhbm5lbGAgY29ycmVzcG9uZGluZy5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgavmuKHjgZnlvJXmlbBcbiAgICAgKi9cbiAgICBwdWJsaXNoPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCwgLi4uYXJnczogQXJndW1lbnRzPFBhcnRpYWw8RXZlbnRbQ2hhbm5lbF0+Pik6IHZvaWQ7XG59XG5cbi8qKlxuICogQGVuIENvbnN0cnVjdG9yIG9mIEV2ZW50QnJva2VyXG4gKiBAamEgRXZlbnRCcm9rZXIg44Gu44Kz44Oz44K544OI44Op44Kv44K/5a6f5L2TXG4gKi9cbmV4cG9ydCBjb25zdCBFdmVudEJyb2tlcjoge1xuICAgIHJlYWRvbmx5IHByb3RvdHlwZTogRXZlbnRCcm9rZXI8YW55PjtcbiAgICBuZXcgPFQ+KCk6IEV2ZW50QnJva2VyPFQ+O1xufSA9IEV2ZW50UHVibGlzaGVyIGFzIGFueTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7QUFFQSxBQWFBO0FBQ0EsTUFBTSxhQUFhLEdBQUcsSUFBSSxPQUFPLEVBQTBDLENBQUM7O0FBRzVFLFNBQVMsU0FBUyxDQUFJLFFBQTJCO0lBQzdDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQzlCLE1BQU0sSUFBSSxTQUFTLENBQUMscUNBQXFDLENBQUMsQ0FBQztLQUM5RDtJQUNELE9BQU8sYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQW9CLENBQUM7Q0FDekQ7O0FBR0QsU0FBUyxZQUFZLENBQUMsT0FBZ0I7SUFDbEMsSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ3hDLE9BQU87S0FDVjtJQUNELE1BQU0sSUFBSSxTQUFTLENBQUMsV0FBVyxTQUFTLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDLENBQUM7Q0FDaEY7O0FBR0QsU0FBUyxhQUFhLENBQUMsUUFBMEM7SUFDN0QsSUFBSSxJQUFJLElBQUksUUFBUSxFQUFFO1FBQ2xC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
