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
                listener(...args);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQtcHVibGlzaGVyLm1qcyIsInNvdXJjZXMiOlsicHVibGlzaGVyLnRzIiwiYnJva2VyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuaW1wb3J0IHtcbiAgICBBcmd1bWVudHMsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBpc1N5bWJvbCxcbiAgICBjbGFzc05hbWUsXG4gICAgdmVyaWZ5LFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uLCBTdWJzY3JpYmFibGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIExpc25lciDmoLzntI3lvaLlvI8gKi9cbnR5cGUgTGlzdGVuZXJzTWFwPFQ+ID0gTWFwPGtleW9mIFQsIFNldDwoLi4uYXJnczogVFtrZXlvZiBUXVtdKSA9PiB1bmtub3duPj47XG5cbi8qKiBAaW50ZXJuYWwgTGlzbmVyIOOBruW8seWPgueFpyAqL1xuY29uc3QgX21hcExpc3RlbmVycyA9IG5ldyBXZWFrTWFwPEV2ZW50UHVibGlzaGVyPGFueT4sIExpc3RlbmVyc01hcDxhbnk+PigpO1xuXG4vKiogQGludGVybmFsIExpc25lck1hcCDjga7lj5blvpcgKi9cbmZ1bmN0aW9uIGxpc3RlbmVyczxUPihpbnN0YW5jZTogRXZlbnRQdWJsaXNoZXI8VD4pOiBMaXN0ZW5lcnNNYXA8VD4ge1xuICAgIGlmICghX21hcExpc3RlbmVycy5oYXMoaW5zdGFuY2UpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoaXMgaXMgbm90IGEgdmFsaWQgRXZlbnRQdWJsaXNoZXIuJyk7XG4gICAgfVxuICAgIHJldHVybiBfbWFwTGlzdGVuZXJzLmdldChpbnN0YW5jZSkgYXMgTGlzdGVuZXJzTWFwPFQ+O1xufVxuXG4vKiogQGludGVybmFsIENoYW5uZWwg44Gu5Z6L5qSc6Ki8ICovXG5mdW5jdGlvbiB2YWxpZENoYW5uZWwoY2hhbm5lbDogdW5rbm93bik6IHZvaWQgfCBuZXZlciB7XG4gICAgaWYgKGlzU3RyaW5nKGNoYW5uZWwpIHx8IGlzU3ltYm9sKGNoYW5uZWwpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVHlwZSBvZiAke2NsYXNzTmFtZShjaGFubmVsKX0gaXMgbm90IGEgdmFsaWQgY2hhbm5lbC5gKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBMaXN0ZW5lciDjga7lnovmpJzoqLwgKi9cbmZ1bmN0aW9uIHZhbGlkTGlzdGVuZXIobGlzdGVuZXI/OiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB1bmtub3duKTogYW55IHwgbmV2ZXIge1xuICAgIGlmIChudWxsICE9IGxpc3RlbmVyKSB7XG4gICAgICAgIHZlcmlmeSgndHlwZU9mJywgJ2Z1bmN0aW9uJywgbGlzdGVuZXIpO1xuICAgIH1cbiAgICByZXR1cm4gbGlzdGVuZXI7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBFdmVudGluZyBmcmFtZXdvcmsgY2xhc3Mgd2l0aCBlbnN1cmluZyB0eXBlLXNhZmUgZm9yIFR5cGVTY3JpcHQuIDxicj5cbiAqICAgICBUaGUgY2xpZW50IG9mIHRoaXMgY2xhc3MgY2FuIGltcGxlbWVudCBvcmlnaW5hbCBQdWItU3ViIChPYnNlcnZlcikgZGVzaWduIHBhdHRlcm4uXG4gKiBAamEg5Z6L5a6J5YWo44KS5L+d6Zqc44GZ44KL44Kk44OZ44Oz44OI55m76Yyy44O755m66KGM44Kv44Op44K5IDxicj5cbiAqICAgICDjgq/jg6njgqTjgqLjg7Pjg4jjga/mnKzjgq/jg6njgrnjgpLmtL7nlJ/jgZfjgabni6zoh6rjga4gUHViLVN1YiAoT2JzZXJ2ZXIpIOODkeOCv+ODvOODs+OCkuWun+ijheWPr+iDvVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50LXB1Ymxpc2hlcic7XG4gKlxuICogLy8gZGVjbGFyZSBldmVudCBpbnRlcmZhY2VcbiAqIGludGVyZmFjZSBTYW1wbGVFdmVudCB7XG4gKiAgIGhvZ2U6IFtudW1iZXIsIHN0cmluZ107ICAgICAgICAvLyBjYWxsYmFjayBmdW5jdGlvbidzIGFyZ3MgdHlwZSB0dXBsZVxuICogICBmb286IFt2b2lkXTsgICAgICAgICAgICAgICAgICAgLy8gbm8gYXJnc1xuICogICBob286IHZvaWQ7ICAgICAgICAgICAgICAgICAgICAgLy8gbm8gYXJncyAoc2FtZSB0aGUgdXBvbilcbiAqICAgYmFyOiBbRXJyb3JdOyAgICAgICAgICAgICAgICAgIC8vIGFueSBjbGFzcyBpcyBhdmFpbGFibGUuXG4gKiAgIGJhejogRXJyb3IgfCBOdW1iZXI7ICAgICAgICAgICAvLyBpZiBvbmx5IG9uZSBhcmd1bWVudCwgYFtdYCBpcyBub3QgcmVxdWlyZWQuXG4gKiB9XG4gKlxuICogLy8gZGVjbGFyZSBjbGllbnQgY2xhc3NcbiAqIGNsYXNzIFNhbXBsZVB1Ymxpc2hlciBleHRlbmRzIEV2ZW50UHVibGlzaGVyPFNhbXBsZUV2ZW50PiB7XG4gKiAgIDpcbiAqICAgc29tZU1ldGhvZCgpOiB2b2lkIHtcbiAqICAgICB0aGlzLnB1Ymxpc2goJ2hvZ2UnLCAxMDAsICd0ZXN0Jyk7ICAgICAgIC8vIE9LLiBzdGFuZGFyZCB1c2FnZS5cbiAqICAgICB0aGlzLnB1Ymxpc2goJ2hvZ2UnLCAxMDAsIHRydWUpOyAgICAgICAgIC8vIE5HLiBhcmd1bWVudCBvZiB0eXBlICd0cnVlJyBpcyBub3QgYXNzaWduYWJsZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIHRvIHBhcmFtZXRlciBvZiB0eXBlICdzdHJpbmcgfCB1bmRlZmluZWQnLlxuICogICAgIHRoaXMucHVibGlzaCgnaG9nZScsIDEwMCk7ICAgICAgICAgICAgICAgLy8gT0suIGFsbCBhcmdzIHRvIGJlIG9wdGlvbmFsIGF1dG9tYXRpY2FsbHkuXG4gKiAgICAgdGhpcy5wdWJsaXNoKCdmb28nKTsgICAgICAgICAgICAgICAgICAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiAgICAgdGhpcy5wdWJsaXNoKCdmb28nLCAxMDApOyAgICAgICAgICAgICAgICAvLyBORy4gYXJndW1lbnQgb2YgdHlwZSAnMTAwJyBpcyBub3QgYXNzaWduYWJsZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIHRvIHBhcmFtZXRlciBvZiB0eXBlICd2b2lkIHwgdW5kZWZpbmVkJy5cbiAqICAgfVxuICogfVxuICpcbiAqIGNvbnN0IHNhbXBsZSA9IG5ldyBTYW1wbGVQdWJsaXNoZXIoKTtcbiAqXG4gKiBzYW1wbGUub24oJ2hvZ2UnLCAoYTogbnVtYmVyLCBiOiBzdHJpbmcpID0+IHsgLi4uIH0pOyAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiBzYW1wbGUub24oJ2hvZ2UnLCAoYTogbnVtYmVyLCBiOiBib29sZWFuKSA9PiB7IC4uLiB9KTsgICAvLyBORy4gdHlwZXMgb2YgcGFyYW1ldGVycyAnYidcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICBhbmQgJ2FyZ3NfMScgYXJlIGluY29tcGF0aWJsZS5cbiAqIHNhbXBsZS5vbignaG9nZScsIChhKSA9PiB7IC4uLiB9KTsgICAgICAgICAgICAgICAgICAgICAgIC8vIE9LLiBhbGwgYXJnc1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIHRvIGJlIG9wdGlvbmFsIGF1dG9tYXRpY2FsbHkuXG4gKiBzYW1wbGUub24oJ2hvZ2UnLCAoYSwgYiwgYykgPT4geyAuLi4gfSk7ICAgICAgICAgICAgICAgICAvLyBORy4gZXhwZWN0ZWQgMS0yIGFyZ3VtZW50cyxcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICBidXQgZ290IDMuXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEV2ZW50UHVibGlzaGVyPEV2ZW50PiBpbXBsZW1lbnRzIFN1YnNjcmliYWJsZTxFdmVudD4ge1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIEV2ZW50UHVibGlzaGVyLCB0aGlzKTtcbiAgICAgICAgX21hcExpc3RlbmVycy5zZXQodGhpcywgbmV3IE1hcCgpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTm90aWZ5IGV2ZW50IHRvIGNsaWVudHMuXG4gICAgICogQGphIGV2ZW50IOeZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIGFyZ3VtZW50cyBmb3IgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsOOBq+a4oeOBmeW8leaVsFxuICAgICAqL1xuICAgIHByb3RlY3RlZCBwdWJsaXNoPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCwgLi4uYXJnczogQXJndW1lbnRzPFBhcnRpYWw8RXZlbnRbQ2hhbm5lbF0+Pik6IHZvaWQge1xuICAgICAgICBjb25zdCBtYXAgPSBsaXN0ZW5lcnModGhpcyk7XG4gICAgICAgIHZhbGlkQ2hhbm5lbChjaGFubmVsKTtcbiAgICAgICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2hhbm5lbCk7XG4gICAgICAgIGlmICghbGlzdCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgbGlzdGVuZXIgb2YgbGlzdCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lciguLi5hcmdzKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBQcm9taXNlLnJlamVjdChlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFN1YnNjcmliYWJsZTxFdmVudD5cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB3aGV0aGVyIHRoaXMgb2JqZWN0IGhhcyBjbGllbnRzLlxuICAgICAqIEBqYSDjgq/jg6njgqTjgqLjg7Pjg4jjgYzlrZjlnKjjgZnjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIGhhczxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw/OiBDaGFubmVsLCBsaXN0ZW5lcj86ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IG1hcCA9IGxpc3RlbmVycyh0aGlzKTtcbiAgICAgICAgaWYgKG51bGwgPT0gY2hhbm5lbCkge1xuICAgICAgICAgICAgcmV0dXJuIG1hcC5zaXplID4gMDtcbiAgICAgICAgfVxuICAgICAgICB2YWxpZENoYW5uZWwoY2hhbm5lbCk7XG4gICAgICAgIGlmIChudWxsID09IGxpc3RlbmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFwLmhhcyhjaGFubmVsKTtcbiAgICAgICAgfVxuICAgICAgICB2YWxpZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgbGlzdCA9IG1hcC5nZXQoY2hhbm5lbCk7XG4gICAgICAgIHJldHVybiBsaXN0ID8gbGlzdC5oYXMobGlzdGVuZXIpIDogZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgcmVnaXN0ZXJlZCBjaGFubmVsIGtleXMuXG4gICAgICogQGphIOeZu+mMsuOBleOCjOOBpuOBhOOCi+ODgeODo+ODjeODq+OCreODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNoYW5uZWxzKCk6IChrZXlvZiBFdmVudClbXSB7XG4gICAgICAgIHJldHVybiBbLi4ubGlzdGVuZXJzKHRoaXMpLmtleXMoKV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjaGFubmVsXG4gICAgICogIC0gYGVuYCB0YXJnZXQgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGV2ZXJ5dGhpbmcgaXMgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuino+mZpFxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBhbGwgc2FtZSBgY2hhbm5lbGAgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIGBjaGFubmVsYCDjgavlr77lv5zjgZfjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WQjOS4gCBgY2hhbm5lbGAg44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbD86IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyPzogKC4uLmFyZ3M6IEFyZ3VtZW50czxFdmVudFtDaGFubmVsXT4pID0+IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICBpZiAobnVsbCA9PSBjaGFubmVsKSB7XG4gICAgICAgICAgICBtYXAuY2xlYXIoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNoYW5uZWxzID0gaXNBcnJheShjaGFubmVsKSA/IGNoYW5uZWwgOiBbY2hhbm5lbF07XG4gICAgICAgIGNvbnN0IGNhbGxiYWNrID0gdmFsaWRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgIGZvciAoY29uc3QgY2ggb2YgY2hhbm5lbHMpIHtcbiAgICAgICAgICAgIHZhbGlkQ2hhbm5lbChjaCk7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIG1hcC5kZWxldGUoY2gpO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaCk7XG4gICAgICAgICAgICAgICAgaWYgKGxpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdC5kZWxldGUoY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgICAgICBsaXN0LnNpemUgPiAwIHx8IG1hcC5kZWxldGUoY2gpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNoYW5uZWxcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBldmVudCBjaGFubmVsIGtleS4gKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruOCpOODmeODs+ODiOODgeODo+ODjeODq+OCreODvCAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2YgdGhlIGBjaGFubmVsYCBjb3JyZXNwb25kaW5nLlxuICAgICAqICAtIGBqYWAgYGNoYW5uZWxgIOOBq+WvvuW/nOOBl+OBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uPENoYW5uZWwgZXh0ZW5kcyBrZXlvZiBFdmVudD4oY2hhbm5lbDogQ2hhbm5lbCB8IENoYW5uZWxbXSwgbGlzdGVuZXI6ICguLi5hcmdzOiBBcmd1bWVudHM8RXZlbnRbQ2hhbm5lbF0+KSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgbWFwID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICB2YWxpZExpc3RlbmVyKGxpc3RlbmVyKTtcblxuICAgICAgICBjb25zdCBjaGFubmVscyA9IGlzQXJyYXkoY2hhbm5lbCkgPyBjaGFubmVsIDogW2NoYW5uZWxdO1xuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGNoYW5uZWxzKSB7XG4gICAgICAgICAgICB2YWxpZENoYW5uZWwoY2gpO1xuICAgICAgICAgICAgbWFwLmhhcyhjaCkgPyBtYXAuZ2V0KGNoKSEuYWRkKGxpc3RlbmVyKSA6IG1hcC5zZXQoY2gsIG5ldyBTZXQoW2xpc3RlbmVyXSkpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3QuZnJlZXplKHtcbiAgICAgICAgICAgIGdldCBlbmFibGUoKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbGlzdCB8fCAhbGlzdC5oYXMobGlzdGVuZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdW5zdWJzY3JpYmUoKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaCBvZiBjaGFubmVscykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gbWFwLmdldChjaCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsaXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0LmRlbGV0ZShsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0LnNpemUgPiAwIHx8IG1hcC5kZWxldGUoY2gpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKSBidXQgaXQgY2F1c2VzIHRoZSBib3VuZCBjYWxsYmFjayB0byBvbmx5IGZpcmUgb25jZSBiZWZvcmUgYmVpbmcgcmVtb3ZlZC5cbiAgICAgKiBAamEg5LiA5bqm44Gg44GR44OP44Oz44OJ44Oq44Oz44Kw5Y+v6IO944Gq44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGV2ZW50IGNoYW5uZWwga2V5LiAoc3RyaW5nIHwgc3ltYm9sKVxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Kk44OZ44Oz44OI44OB44Oj44ON44Or44Kt44O8IChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb25jZTxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwgfCBDaGFubmVsW10sIGxpc3RlbmVyOiAoLi4uYXJnczogQXJndW1lbnRzPEV2ZW50W0NoYW5uZWxdPikgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLm9uKGNoYW5uZWwsIGxpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgbWFuYWdlZCA9IHRoaXMub24oY2hhbm5lbCwgKCkgPT4ge1xuICAgICAgICAgICAgY29udGV4dC51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgbWFuYWdlZC51bnN1YnNjcmliZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5pbXBvcnQgeyBBcmd1bWVudHMsIFN1YnNjcmliYWJsZSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBFdmVudFB1Ymxpc2hlciB9IGZyb20gJy4vcHVibGlzaGVyJztcblxuLyoqXG4gKiBAZW4gRXZlbnRpbmcgZnJhbWV3b3JrIG9iamVjdCBhYmxlIHRvIGNhbGwgYHB1Ymxpc2goKWAgbWV0aG9kIGZyb20gb3V0c2lkZS5cbiAqIEBqYSDlpJbpg6jjgYvjgonjga4gYHB1Ymxpc2goKWAg44KS5Y+v6IO944Gr44GX44Gf44Kk44OZ44Oz44OI55m76Yyy44O755m66KGM44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnQtcHVibGlzaGVyJztcbiAqXG4gKiAvLyBkZWNsYXJlIGV2ZW50IGludGVyZmFjZVxuICogaW50ZXJmYWNlIFNhbXBsZUV2ZW50IHtcbiAqICAgaG9nZTogW251bWJlciwgc3RyaW5nXTsgICAgICAgIC8vIGNhbGxiYWNrIGZ1bmN0aW9uJ3MgYXJncyB0eXBlIHR1cGxlXG4gKiB9XG4gKlxuICogY29uc3QgYnJva2VyID0gbmV3IEV2ZW50QnJva2VyPFNhbXBsZUV2ZW50PigpO1xuICogYnJva2VyLnB1Ymxpc2goJ2hvZ2UnLCAxMDAsICd0ZXN0Jyk7ICAgICAvLyBPSy4gc3RhbmRhcmQgdXNhZ2UuXG4gKiBicm9rZXIucHVibGlzaCgnaG9nZScsIDEwMCwgdHJ1ZSk7ICAgICAgIC8vIE5HLiBhcmd1bWVudCBvZiB0eXBlICd0cnVlJyBpcyBub3QgYXNzaWduYWJsZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdG8gcGFyYW1ldGVyIG9mIHR5cGUgJ3N0cmluZyB8IHVuZGVmaW5lZCcuXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFdmVudEJyb2tlcjxFdmVudCBleHRlbmRzIHt9PiBleHRlbmRzIFN1YnNjcmliYWJsZTxFdmVudD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBOb3RpZnkgZXZlbnQgdG8gY2xpZW50cy5cbiAgICAgKiBAamEgZXZlbnQg55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2hhbm5lbFxuICAgICAqICAtIGBlbmAgZXZlbnQgY2hhbm5lbCBrZXkuIChzdHJpbmcgfCBzeW1ib2wpXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4Hjg6Pjg43jg6vjgq3jg7wgKHN0cmluZyB8IHN5bWJvbClcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgYXJndW1lbnRzIGZvciBjYWxsYmFjayBmdW5jdGlvbiBvZiB0aGUgYGNoYW5uZWxgIGNvcnJlc3BvbmRpbmcuXG4gICAgICogIC0gYGphYCBgY2hhbm5lbGAg44Gr5a++5b+c44GX44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWw44Gr5rih44GZ5byV5pWwXG4gICAgICovXG4gICAgcHVibGlzaDxDaGFubmVsIGV4dGVuZHMga2V5b2YgRXZlbnQ+KGNoYW5uZWw6IENoYW5uZWwsIC4uLmFyZ3M6IEFyZ3VtZW50czxQYXJ0aWFsPEV2ZW50W0NoYW5uZWxdPj4pOiB2b2lkO1xufVxuXG4vKipcbiAqIEBlbiBDb25zdHJ1Y3RvciBvZiBFdmVudEJyb2tlclxuICogQGphIEV2ZW50QnJva2VyIOOBruOCs+ODs+OCueODiOODqeOCr+OCv+Wun+S9k1xuICovXG5leHBvcnQgY29uc3QgRXZlbnRCcm9rZXI6IHtcbiAgICByZWFkb25seSBwcm90b3R5cGU6IEV2ZW50QnJva2VyPGFueT47XG4gICAgbmV3IDxUPigpOiBFdmVudEJyb2tlcjxUPjtcbn0gPSBFdmVudFB1Ymxpc2hlciBhcyBhbnk7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBO0FBRUEsQUFhQTtBQUNBLE1BQU0sYUFBYSxHQUFHLElBQUksT0FBTyxFQUEwQyxDQUFDOztBQUc1RSxTQUFTLFNBQVMsQ0FBSSxRQUEyQjtJQUM3QyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUM5QixNQUFNLElBQUksU0FBUyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7S0FDOUQ7SUFDRCxPQUFPLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFvQixDQUFDO0NBQ3pEOztBQUdELFNBQVMsWUFBWSxDQUFDLE9BQWdCO0lBQ2xDLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUN4QyxPQUFPO0tBQ1Y7SUFDRCxNQUFNLElBQUksU0FBUyxDQUFDLFdBQVcsU0FBUyxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0NBQ2hGOztBQUdELFNBQVMsYUFBYSxDQUFDLFFBQTBDO0lBQzdELElBQUksSUFBSSxJQUFJLFFBQVEsRUFBRTtRQUNsQixNQUFNLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztLQUMxQztJQUNELE9BQU8sUUFBUSxDQUFDO0NBQ25COzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWlERCxNQUFzQixjQUFjOztJQUdoQztRQUNJLE1BQU0sQ0FB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QUMsQ0FBQztRQUV4QixNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEQsS0FBSyxNQUFNLEVBQUUsSUFBSSxRQUFRLEVBQUU7WUFDdkIsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pCLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDL0U7UUFFRCxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDakIsSUFBSSxNQUFNO2dCQUNOLEtBQUssTUFBTSxFQUFFLElBQUksUUFBUSxFQUFFO29CQUN2QixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUN6QixJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTt3QkFDOUIsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO3dCQUNuQixPQUFPLEtBQUssQ0FBQztxQkFDaEI7aUJBQ0o7Z0JBQ0QsT0FBTyxJQUFJLENBQUM7YUFDZjtZQUNELFdBQVc7Z0JBQ1AsS0FBSyxNQUFNLEVBQUUsSUFBSSxRQUFRLEVBQUU7b0JBQ3ZCLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3pCLElBQUksSUFBSSxFQUFFO3dCQUNOLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQ3RCLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7cUJBQ25DO2lCQUNKO2FBQ0o7U0FDSixDQUFDLENBQUM7S0FDTjs7Ozs7Ozs7Ozs7O0lBYUQsSUFBSSxDQUE4QixPQUE0QixFQUFFLFFBQXlEO1FBQ3JILE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFO1lBQzdCLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7U0FDekIsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxPQUFPLENBQUM7S0FDbEI7Q0FDSjs7QUN0UUQ7QUFHQSxBQXFDQTs7OztBQUlBLE1BQWEsV0FBVyxHQUdwQixjQUFxQjs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXZlbnQtcHVibGlzaGVyLyJ9
