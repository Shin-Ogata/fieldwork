/*!
 * @cdp/promise 0.9.0
 *   promise utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/events')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/events'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP));
}(this, (function (exports, coreUtils, events) { 'use strict';

    /* eslint-disable
        @typescript-eslint/ban-types
     */
    /** @internal */
    const _cancel = Symbol('cancel');
    /** @internal */
    const _close = Symbol('close');
    /**
     * @en Invalid subscription object declaration.
     * @ja 無効な Subscription オブジェクト
     *
     * @internal
     */
    const invalidSubscription = Object.freeze({
        enable: false,
        unsubscribe() { }
    });

    /* eslint-disable
        no-redeclare
     ,  @typescript-eslint/no-explicit-any
     ,  @typescript-eslint/ban-types
     */
    /** @internal */
    const _tokens = new WeakMap();
    /** @internal */
    function getContext(instance) {
        if (!_tokens.has(instance)) {
            throw new TypeError('The object is not a valid CancelToken.');
        }
        return _tokens.get(instance);
    }
    /**
     * @en The token object to which unification processing for asynchronous processing cancellation is offered. <br>
     *     Origin is `CancellationToken` of `.NET Framework`.
     * @ja 非同期処理キャンセルのための統一処理を提供するトークンオブジェクト <br>
     *     オリジナルは `.NET Framework` の `CancellationToken`
     *
     * @see https://docs.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads
     *
     * @example <br>
     *
     * ```ts
     * import { CancelToken } from '@cdp/promise';
     * ```
     *
     * - Basic Usage
     *
     * ```ts
     * const token = new CancelToken((cancel, close) => {
     *   button1.onclick = ev => cancel(new Error('Cancel'));
     *   button2.onclick = ev => close();
     * });
     * ```
     *
     * or
     *
     * ```ts
     * const { cancel, close, token } = CancelToken.source();
     * button1.onclick = ev => cancel(new Error('Cancel'));
     * button2.onclick = ev => close();
     * ```
     *
     * - Use with Promise
     *
     * ```ts
     * const { cancel, close, token } = CancelToken.source();
     * const promise = new Promise((ok, ng) => { ... }, token);
     * promise
     *   .then(...)
     *   .then(...)
     *   .then(...)
     *   .catch(reason => {
     *     // check reason
     *   });
     * ```
     *
     * - Register & Unregister callback(s)
     *
     * ```ts
     * const { cancel, close, token } = CancelToken.source();
     * const subscription = token.register(reason => {
     *   console.log(reason.message);
     * });
     * if (someCase) {
     *   subscription.unsubscribe();
     * }
     * ```
     */
    class CancelToken {
        /**
         * @en Create [[CancelTokenSource]] instance.
         * @ja [[CancelTokenSource]] インスタンスの取得
         *
         * @param linkedTokens
         *  - `en` relating already made [[CancelToken]] instance.
         *        You can attach to the token that to be a cancellation target.
         *  - `ja` すでに作成された [[CancelToken]] 関連付ける場合に指定
         *        渡された token はキャンセル対象として紐づけられる
         */
        static source(...linkedTokens) {
            let cancel;
            let close;
            const token = new CancelToken((onCancel, onClose) => {
                cancel = onCancel;
                close = onClose;
            }, ...linkedTokens);
            return Object.freeze({ token, cancel, close });
        }
        /**
         * constructor
         *
         * @param executor
         *  - `en` executer that has `cancel` and `close` callback.
         *  - `ja` キャンセル/クローズ 実行コールバックを指定
         * @param linkedTokens
         *  - `en` relating already made [[CancelToken]] instance.
         *        You can attach to the token that to be a cancellation target.
         *  - `ja` すでに作成された [[CancelToken]] 関連付ける場合に指定
         *        渡された token はキャンセル対象として紐づけられる
         */
        constructor(executor, ...linkedTokens) {
            coreUtils.verify('instanceOf', CancelToken, this);
            coreUtils.verify('typeOf', 'function', executor);
            const linkedTokenSet = new Set(linkedTokens.filter(t => _tokens.has(t)));
            let status = 0 /* OPEN */;
            for (const t of linkedTokenSet) {
                status |= getContext(t).status;
            }
            const context = {
                broker: new events.EventBroker(),
                subscriptions: new Set(),
                reason: undefined,
                status,
            };
            _tokens.set(this, Object.seal(context));
            const cancel = this[_cancel];
            const close = this[_close];
            if (status === 0 /* OPEN */) {
                for (const t of linkedTokenSet) {
                    context.subscriptions.add(t.register(cancel.bind(this)));
                    this.register(cancel.bind(t));
                }
            }
            executor(cancel.bind(this), close.bind(this));
        }
        /**
         * @en Cancellation reason accessor.
         * @ja キャンセルの原因取得
         */
        get reason() {
            return getContext(this).reason;
        }
        /**
         * @en Enable cancellation state accessor.
         * @ja キャンセル可能か判定
         */
        get cancelable() {
            return getContext(this).status === 0 /* OPEN */;
        }
        /**
         * @en Cancellation requested state accessor.
         * @ja キャンセルを受け付けているか判定
         */
        get requested() {
            return !!(getContext(this).status & 1 /* REQUESTED */);
        }
        /**
         * @en Cancellation closed state accessor.
         * @ja キャンセル受付を終了しているか判定
         */
        get closed() {
            return !!(getContext(this).status & 2 /* CLOSED */);
        }
        /**
         * @en `toString` tag override.
         * @ja `toString` タグのオーバーライド
         */
        get [Symbol.toStringTag]() { return 'CancelToken'; }
        /**
         * @en Register custom cancellation callback.
         * @ja キャンセル時のカスタム処理の登録
         *
         * @param onCancel
         *  - `en` cancel operation callback
         *  - `ja` キャンセルコールバック
         * @returns
         *  - `en` `Subscription` instance.
         *        You can revoke cancellation to call `unsubscribe` method.
         *  - `ja` `Subscription` インスタンス
         *        `unsubscribe` メソッドを呼ぶことでキャンセルを無効にすることが可能
         */
        register(onCancel) {
            const context = getContext(this);
            if (!this.cancelable) {
                return invalidSubscription;
            }
            return context.broker.on('cancel', onCancel);
        }
        /** @internal */
        [_cancel](reason) {
            const context = getContext(this);
            coreUtils.verify('notNil', reason);
            if (!this.cancelable) {
                return;
            }
            context.reason = reason;
            context.status |= 1 /* REQUESTED */;
            for (const s of context.subscriptions) {
                s.unsubscribe();
            }
            context.broker.trigger('cancel', reason);
            void Promise.resolve().then(() => this[_close]());
        }
        /** @internal */
        [_close]() {
            const context = getContext(this);
            if (this.closed) {
                return;
            }
            context.status |= 2 /* CLOSED */;
            for (const s of context.subscriptions) {
                s.unsubscribe();
            }
            context.subscriptions.clear();
            context.broker.off();
        }
    }

    /* eslint-disable
        no-global-assign
     ,  @typescript-eslint/no-explicit-any
     */
    /** `Native Promise` constructor */
    const NativePromise = Promise;
    /** @internal */
    const _create = Symbol('create');
    /** @internal */
    const _tokens$1 = new WeakMap();
    /**
     * @en Extended `Promise` class which enabled cancellation. <br>
     *     `Native Promise` constructor is overridden by framework default behaviour.
     * @ja キャンセルを可能にした `Promise` 拡張クラス <br>
     *     既定で `Native Promise` をオーバーライドする.
     */
    class CancelablePromise extends NativePromise {
        /**
         * @en Overriding of the default constructor used for generation of an object.
         * @ja オブジェクトの生成に使われるデフォルトコンストラクタのオーバーライド
         *
         * @internal
         */
        static get [Symbol.species]() { return NativePromise; }
        /**
         * @en Creates a new resolved promise for the provided value.
         * @ja 新規に解決済み promise インスタンスを作成
         *
         * @internal
         *
         * @param value
         *  - `en` the value transmitted in promise chain.
         *  - `ja` `Promise` に伝達する値
         * @param cancelToken
         *  - `en` [[CancelToken]] instance create from [[CancelToken]].`source()`.
         *  - `ja` [[CancelToken]].`source()` より作成した [[CancelToken]] インスタンスを指定
         */
        static resolve(value, cancelToken) {
            return this[_create](super.resolve(value), cancelToken);
        }
        /** @internal private construction */
        static [_create](src, token, thenArgs) {
            coreUtils.verify('instanceOf', NativePromise, src);
            let p;
            if (!(token instanceof CancelToken)) {
                p = src;
            }
            else if (thenArgs && (!coreUtils.isFunction(thenArgs[0]) || coreUtils.isFunction(thenArgs[1]))) {
                p = src;
            }
            else if (token.cancelable) {
                let s;
                p = new NativePromise((resolve, reject) => {
                    s = token.register(reject);
                    super.prototype.then.call(src, resolve, reject);
                });
                const dispose = () => {
                    s.unsubscribe();
                    _tokens$1.delete(p);
                };
                p.then(dispose, dispose);
            }
            else if (token.requested) {
                p = super.reject(token.reason);
            }
            else if (token.closed) {
                p = src;
            }
            else {
                throw new Error('Unexpected Exception');
            }
            if (thenArgs) {
                p = super.prototype.then.apply(p, thenArgs);
            }
            if (token && token.cancelable) {
                _tokens$1.set(p, token);
            }
            p instanceof this || Object.setPrototypeOf(p, this.prototype);
            return p;
        }
        /**
         * constructor
         *
         * @param executor
         *  - `en` A callback used to initialize the promise. This callback is passed two arguments `resolve` and `reject`.
         *  - `ja` promise の初期化に使用するコールバックを指定. `resolve` と `reject` の2つの引数を持つ
         * @param cancelToken
         *  - `en` [[CancelToken]] instance create from [[CancelToken]].`source()`.
         *  - `ja` [[CancelToken]].`source()` より作成した [[CancelToken]] インスタンスを指定
         */
        constructor(executor, cancelToken) {
            super(executor);
            return CancelablePromise[_create](this, cancelToken);
        }
        /**
         * Attaches callbacks for the resolution and/or rejection of the Promise.
         *
         * @internal
         *
         * @param onfulfilled The callback to execute when the Promise is resolved.
         * @param onrejected The callback to execute when the Promise is rejected.
         * @returns A Promise for the completion of which ever callback is executed.
         */
        then(onfulfilled, onrejected) {
            return CancelablePromise[_create](this, _tokens$1.get(this), [onfulfilled, onrejected]);
        }
        /**
         * Attaches a callback for only the rejection of the Promise.
         *
         * @internal
         *
         * @param onrejected The callback to execute when the Promise is rejected.
         * @returns A Promise for the completion of the callback.
         */
        catch(onrejected) {
            return this.then(undefined, onrejected);
        }
        /**
         * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). <br>
         * The resolved value cannot be modified from the callback.
         *
         * @internal
         *
         * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
         * @returns A Promise for the completion of the callback.
         */
        finally(onfinally) {
            return CancelablePromise[_create](super.finally(onfinally), _tokens$1.get(this));
        }
    }
    /**
     * @en Switch the global `Promise` constructor `Native Promise` or [[CancelablePromise]]. <br>
     *     `Native Promise` constructor is overridden by framework default behaviour.
     * @ja グローバル `Promise` コンストラクタを `Native Promise` または [[CancelablePromise]] に切り替え <br>
     *     既定で `Native Promise` をオーバーライドする.
     *
     * @param enable
     *  - `en` `true`: use [[CancelablePromise]] /  `false`: use `Native Promise`
     *  - `ja` `true`: [[CancelablePromise]] を使用 / `false`: `Native Promise` を使用
     */
    function extendPromise(enable) {
        if (enable) {
            Promise = CancelablePromise;
        }
        else {
            Promise = NativePromise;
        }
        return Promise;
    }
    // default: automatic native promise override.
    extendPromise(!coreUtils.getConfig().noAutomaticNativeExtend);

    /* eslint-disable
        @typescript-eslint/explicit-function-return-type
     ,  @typescript-eslint/explicit-module-boundary-types
     */
    //__________________________________________________________________________________________________//
    /**
     * @en Wait for promises done. <br>
     *     While control will be returned immediately when `Promise.all()` fails, but this mehtod waits for including failure.
     * @ja `Promise` オブジェクトの終了まで待機 <br>
     *     `Promise.all()` は失敗するとすぐに制御を返すのに対し、失敗も含めて待つ `Promise` オブジェクトを返却
     *
     * @param promises
     *  - `en` Promise instance array
     *  - `ja` Promise インスタンスの配列を指定
     */
    function wait(promises) {
        const safePromises = promises.map((promise) => promise.catch((e) => e));
        return Promise.all(safePromises);
    }
    /**
     * @en Cancellation checker method. <br>
     *     It's practicable by `async function`.
     * @ja キャンセルチェッカー <br>
     *     `async function` で使用可能
     *
     * @example <br>
     *
     * ```ts
     *  async function someFunc(token: CancelToken): Promise<{}> {
     *    await checkCanceled(token);
     *    return {};
     *  }
     * ```
     *
     * @param token
     *  - `en` [[CancelToken]] reference. (enable `undefined`)
     *  - `ja` [[CancelToken]] を指定 (undefined 可)
     */
    function checkCanceled(token) {
        return Promise.resolve(undefined, token);
    }
    //__________________________________________________________________________________________________//
    /**
     * @en The class manages lumping multiple `Promise` objects. <br>
     *     It's possible to make them cancel more than one `Promise` which handles different [[CancelToken]] by lumping.
     * @ja 複数 `Promise` オブジェクトを一括管理するクラス <br>
     *     異なる [[CancelToken]] を扱う複数の `Promise` を一括でキャンセルさせることが可能
     */
    class PromiseManager {
        constructor() {
            // eslint-disable-next-line func-call-spacing
            this._pool = new Map();
        }
        /**
         * @en Add a `Promise` object under the management.
         * @ja `Promise` オブジェクトを管理下に追加
         *
         * @param promise
         *  - `en` any `Promise` instance is available.
         *  - `ja` 任意の `Promise` インスタンス
         * @param cancelSource
         *  - `en` [[CancelTokenSource]] instance made by `CancelToken.source()`.
         *  - `ja` `CancelToken.source()` で生成される [[CancelTokenSource]] インスタンス
         * @returns
         *  - `en` return the same instance of input `promise` instance.
         *  - `ja` 入力した `promise` と同一インスタンスを返却
         */
        add(promise, cancelSource) {
            this._pool.set(promise, cancelSource && cancelSource.cancel); // eslint-disable-line @typescript-eslint/unbound-method
            const always = () => {
                this._pool.delete(promise);
                if (cancelSource) {
                    cancelSource.close();
                }
            };
            promise
                .then(always, always);
            return promise;
        }
        /**
         * @en Released all instances under the management.
         * @ja 管理対象を破棄
         */
        release() {
            this._pool.clear();
        }
        /**
         * @en Return `promise` array from under the management.
         * @ja 管理対象の Promise を配列で取得
         */
        promises() {
            return [...this._pool.keys()];
        }
        /**
         * @en Call `Promise.all()` for under the management.
         * @ja 管理対象に対して `Promise.all()`
         */
        all() {
            return Promise.all(this.promises());
        }
        /**
         * @en Call `Promise.race()` for under the management.
         * @ja 管理対象に対して `Promise.race()`
         */
        race() {
            return Promise.race(this.promises());
        }
        /**
         * @en Call [[wait]]() for under the management.
         * @ja 管理対象に対して [[wait]]()
         */
        wait() {
            return wait(this.promises());
        }
        /**
         * @en Invoke `cancel` message for under the management promises.
         * @ja 管理対象の `Promise` に対してキャンセルを発行
         *
         * @param reason
         *  - `en` arguments for `cancelSource`
         *  - `ja` `cancelSource` に渡される引数
         * @returns
         *  - `en` `Promise` instance which wait by until cancellation completion.
         *  - `ja` キャンセル完了まで待機する [[Promise]] インスタンス
         */
        abort(reason) {
            for (const canceler of this._pool.values()) {
                if (canceler) {
                    canceler((null != reason) ? reason : new Error('abort'));
                }
            }
            return wait(this.promises());
        }
    }

    exports.CancelToken = CancelToken;
    exports.CancelablePromise = CancelablePromise;
    exports.Promise = CancelablePromise;
    exports.PromiseManager = PromiseManager;
    exports.checkCanceled = checkCanceled;
    exports.extendPromise = extendPromise;
    exports.wait = wait;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS5qcyIsInNvdXJjZXMiOlsiaW50ZXJuYWwudHMiLCJjYW5jZWwtdG9rZW4udHMiLCJjYW5jZWxhYmxlLXByb21pc2UudHMiLCJ1dGlscy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9iYW4tdHlwZXNcbiAqL1xuXG5pbXBvcnQgeyBFdmVudEJyb2tlciwgU3Vic2NyaXB0aW9uIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgX2NhbmNlbCA9IFN5bWJvbCgnY2FuY2VsJyk7XG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgX2Nsb3NlID0gU3ltYm9sKCdjbG9zZScpO1xuXG4vKipcbiAqIEBlbiBDYW5jZWxUb2tlbiBzdGF0ZSBkZWZpbml0aW9ucy5cbiAqIEBqYSBDYW5jZWxUb2tlbiDjga7nirbmhYvlrprnvqlcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ2FuY2VsVG9rZW5TdGF0ZSB7XG4gICAgLyoqIOOCreODo+ODs+OCu+ODq+WPl+S7mOWPr+iDvSAqL1xuICAgIE9QRU4gICAgICAgID0gMHgwLFxuICAgIC8qKiDjgq3jg6Pjg7Pjgrvjg6vlj5fku5jmuIjjgb8gKi9cbiAgICBSRVFVRVNURUQgICA9IDB4MSxcbiAgICAvKiog44Kt44Oj44Oz44K744Or5Y+X5LuY5LiN5Y+vICovXG4gICAgQ0xPU0VEICAgICAgPSAweDIsXG59XG5cbi8qKlxuICogQGVuIENhbmNlbCBldmVudCBkZWZpbml0aW9ucy5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjgqTjg5njg7Pjg4jlrprnvqlcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5jZWxFdmVudDxUPiB7XG4gICAgY2FuY2VsOiBbVF07XG59XG5cbi8qKlxuICogQGVuIEludGVybmFsIENhbmNlbFRva2VuIGludGVyZmFjZS5cbiAqIEBqYSBDYW5jZWxUb2tlbiDjga7lhoXpg6jjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqlcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5jZWxUb2tlbkNvbnRleHQ8VCBleHRlbmRzIHt9PiB7XG4gICAgcmVhZG9ubHkgYnJva2VyOiBFdmVudEJyb2tlcjxDYW5jZWxFdmVudDxUPj47XG4gICAgcmVhZG9ubHkgc3Vic2NyaXB0aW9uczogU2V0PFN1YnNjcmlwdGlvbj47XG4gICAgcmVhc29uOiBUIHwgdW5kZWZpbmVkO1xuICAgIHN0YXR1czogQ2FuY2VsVG9rZW5TdGF0ZTtcbn1cblxuLyoqXG4gKiBAZW4gSW52YWxpZCBzdWJzY3JpcHRpb24gb2JqZWN0IGRlY2xhcmF0aW9uLlxuICogQGphIOeEoeWKueOBqiBTdWJzY3JpcHRpb24g44Kq44OW44K444Kn44Kv44OIXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBjb25zdCBpbnZhbGlkU3Vic2NyaXB0aW9uID0gT2JqZWN0LmZyZWV6ZSh7XG4gICAgZW5hYmxlOiBmYWxzZSxcbiAgICB1bnN1YnNjcmliZSgpIHsgLyogbm9vcCAqLyB9XG59KSBhcyBTdWJzY3JpcHRpb247XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIG5vLXJlZGVjbGFyZVxuICwgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAsICBAdHlwZXNjcmlwdC1lc2xpbnQvYmFuLXR5cGVzXG4gKi9cblxuaW1wb3J0IHsgdmVyaWZ5IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50QnJva2VyLCBTdWJzY3JpcHRpb24gfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQge1xuICAgIF9jYW5jZWwsXG4gICAgX2Nsb3NlLFxuICAgIENhbmNlbFRva2VuU3RhdGUsXG4gICAgQ2FuY2VsVG9rZW5Db250ZXh0LFxuICAgIGludmFsaWRTdWJzY3JpcHRpb24sXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKipcbiAqIEBlbiBDYW5jZWxsYXRpb24gc291cmNlIGludGVyZmFjZS5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vnrqHnkIbjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5jZWxUb2tlblNvdXJjZTxUIGV4dGVuZHMge30gPSB7fT4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBbW0NhbmNlbFRva2VuXV0gZ2V0dGVyLlxuICAgICAqIEBqYSBbW0NhbmNlbFRva2VuXV0g5Y+W5b6XXG4gICAgICovXG4gICAgcmVhZG9ubHkgdG9rZW46IENhbmNlbFRva2VuPFQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgY2FuY2VsLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSByZWFzb25cbiAgICAgKiAgLSBgZW5gIGNhbmNlbGxhdGlvbiByZWFzb24uIHRoaXMgYXJnIGlzIHRyYW5zbWl0dGVkIGluIHByb21pc2UgY2hhaW4uXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6vjga7nkIbnlLHjgpLmjIflrpouIGBQcm9taXNlYCDjg4HjgqfjgqTjg7PjgavkvJ3pgZTjgZXjgozjgosuXG4gICAgICovXG4gICAgY2FuY2VsKHJlYXNvbjogVCk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQnJlYWsgdXAgY2FuY2VsbGF0aW9uIHJlY2VwdGlvbi5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5Y+X5LuY44KS57WC5LqGXG4gICAgICovXG4gICAgY2xvc2UoKTogdm9pZDtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3Rva2VucyA9IG5ldyBXZWFrTWFwPENhbmNlbFRva2VuPGFueT4sIENhbmNlbFRva2VuQ29udGV4dDxhbnk+PigpO1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBnZXRDb250ZXh0PFQ+KGluc3RhbmNlOiBDYW5jZWxUb2tlbjxUPik6IENhbmNlbFRva2VuQ29udGV4dDxUPiB7XG4gICAgaWYgKCFfdG9rZW5zLmhhcyhpbnN0YW5jZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIG9iamVjdCBpcyBub3QgYSB2YWxpZCBDYW5jZWxUb2tlbi4nKTtcbiAgICB9XG4gICAgcmV0dXJuIF90b2tlbnMuZ2V0KGluc3RhbmNlKSBhcyBDYW5jZWxUb2tlbkNvbnRleHQ8VD47XG59XG5cbi8qKlxuICogQGVuIFRoZSB0b2tlbiBvYmplY3QgdG8gd2hpY2ggdW5pZmljYXRpb24gcHJvY2Vzc2luZyBmb3IgYXN5bmNocm9ub3VzIHByb2Nlc3NpbmcgY2FuY2VsbGF0aW9uIGlzIG9mZmVyZWQuIDxicj5cbiAqICAgICBPcmlnaW4gaXMgYENhbmNlbGxhdGlvblRva2VuYCBvZiBgLk5FVCBGcmFtZXdvcmtgLlxuICogQGphIOmdnuWQjOacn+WHpueQhuOCreODo+ODs+OCu+ODq+OBruOBn+OCgeOBrue1seS4gOWHpueQhuOCkuaPkOS+m+OBmeOCi+ODiOODvOOCr+ODs+OCquODluOCuOOCp+OCr+ODiCA8YnI+XG4gKiAgICAg44Kq44Oq44K444OK44Or44GvIGAuTkVUIEZyYW1ld29ya2Ag44GuIGBDYW5jZWxsYXRpb25Ub2tlbmBcbiAqXG4gKiBAc2VlIGh0dHBzOi8vZG9jcy5taWNyb3NvZnQuY29tL2VuLXVzL2RvdG5ldC9zdGFuZGFyZC90aHJlYWRpbmcvY2FuY2VsbGF0aW9uLWluLW1hbmFnZWQtdGhyZWFkc1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuICogYGBgXG4gKlxuICogLSBCYXNpYyBVc2FnZVxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB0b2tlbiA9IG5ldyBDYW5jZWxUb2tlbigoY2FuY2VsLCBjbG9zZSkgPT4ge1xuICogICBidXR0b24xLm9uY2xpY2sgPSBldiA9PiBjYW5jZWwobmV3IEVycm9yKCdDYW5jZWwnKSk7XG4gKiAgIGJ1dHRvbjIub25jbGljayA9IGV2ID0+IGNsb3NlKCk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIG9yXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHsgY2FuY2VsLCBjbG9zZSwgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZSgpO1xuICogYnV0dG9uMS5vbmNsaWNrID0gZXYgPT4gY2FuY2VsKG5ldyBFcnJvcignQ2FuY2VsJykpO1xuICogYnV0dG9uMi5vbmNsaWNrID0gZXYgPT4gY2xvc2UoKTtcbiAqIGBgYFxuICpcbiAqIC0gVXNlIHdpdGggUHJvbWlzZVxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB7IGNhbmNlbCwgY2xvc2UsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTtcbiAqIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgob2ssIG5nKSA9PiB7IC4uLiB9LCB0b2tlbik7XG4gKiBwcm9taXNlXG4gKiAgIC50aGVuKC4uLilcbiAqICAgLnRoZW4oLi4uKVxuICogICAudGhlbiguLi4pXG4gKiAgIC5jYXRjaChyZWFzb24gPT4ge1xuICogICAgIC8vIGNoZWNrIHJlYXNvblxuICogICB9KTtcbiAqIGBgYFxuICpcbiAqIC0gUmVnaXN0ZXIgJiBVbnJlZ2lzdGVyIGNhbGxiYWNrKHMpXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHsgY2FuY2VsLCBjbG9zZSwgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZSgpO1xuICogY29uc3Qgc3Vic2NyaXB0aW9uID0gdG9rZW4ucmVnaXN0ZXIocmVhc29uID0+IHtcbiAqICAgY29uc29sZS5sb2cocmVhc29uLm1lc3NhZ2UpO1xuICogfSk7XG4gKiBpZiAoc29tZUNhc2UpIHtcbiAqICAgc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIENhbmNlbFRva2VuPFQgZXh0ZW5kcyB7fSA9IHt9PiB7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIFtbQ2FuY2VsVG9rZW5Tb3VyY2VdXSBpbnN0YW5jZS5cbiAgICAgKiBAamEgW1tDYW5jZWxUb2tlblNvdXJjZV1dIOOCpOODs+OCueOCv+ODs+OCueOBruWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIGxpbmtlZFRva2Vuc1xuICAgICAqICAtIGBlbmAgcmVsYXRpbmcgYWxyZWFkeSBtYWRlIFtbQ2FuY2VsVG9rZW5dXSBpbnN0YW5jZS5cbiAgICAgKiAgICAgICAgWW91IGNhbiBhdHRhY2ggdG8gdGhlIHRva2VuIHRoYXQgdG8gYmUgYSBjYW5jZWxsYXRpb24gdGFyZ2V0LlxuICAgICAqICAtIGBqYWAg44GZ44Gn44Gr5L2c5oiQ44GV44KM44GfIFtbQ2FuY2VsVG9rZW5dXSDplqLpgKPku5jjgZHjgovloLTlkIjjgavmjIflrppcbiAgICAgKiAgICAgICAg5rih44GV44KM44GfIHRva2VuIOOBr+OCreODo+ODs+OCu+ODq+WvvuixoeOBqOOBl+OBpue0kOOBpeOBkeOCieOCjOOCi1xuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgc291cmNlPFQgZXh0ZW5kcyB7fSA9IHt9PiguLi5saW5rZWRUb2tlbnM6IENhbmNlbFRva2VuW10pOiBDYW5jZWxUb2tlblNvdXJjZTxUPiB7XG4gICAgICAgIGxldCBjYW5jZWwhOiAocmVhc29uOiBUKSA9PiB2b2lkO1xuICAgICAgICBsZXQgY2xvc2UhOiAoKSA9PiB2b2lkO1xuICAgICAgICBjb25zdCB0b2tlbiA9IG5ldyBDYW5jZWxUb2tlbjxUPigob25DYW5jZWwsIG9uQ2xvc2UpID0+IHtcbiAgICAgICAgICAgIGNhbmNlbCA9IG9uQ2FuY2VsO1xuICAgICAgICAgICAgY2xvc2UgPSBvbkNsb3NlO1xuICAgICAgICB9LCAuLi5saW5rZWRUb2tlbnMpO1xuICAgICAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7IHRva2VuLCBjYW5jZWwsIGNsb3NlIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZXhlY3V0b3JcbiAgICAgKiAgLSBgZW5gIGV4ZWN1dGVyIHRoYXQgaGFzIGBjYW5jZWxgIGFuZCBgY2xvc2VgIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744OrL+OCr+ODreODvOOCuiDlrp/ooYzjgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrppcbiAgICAgKiBAcGFyYW0gbGlua2VkVG9rZW5zXG4gICAgICogIC0gYGVuYCByZWxhdGluZyBhbHJlYWR5IG1hZGUgW1tDYW5jZWxUb2tlbl1dIGluc3RhbmNlLlxuICAgICAqICAgICAgICBZb3UgY2FuIGF0dGFjaCB0byB0aGUgdG9rZW4gdGhhdCB0byBiZSBhIGNhbmNlbGxhdGlvbiB0YXJnZXQuXG4gICAgICogIC0gYGphYCDjgZnjgafjgavkvZzmiJDjgZXjgozjgZ8gW1tDYW5jZWxUb2tlbl1dIOmWoumAo+S7mOOBkeOCi+WgtOWQiOOBq+aMh+WumlxuICAgICAqICAgICAgICDmuKHjgZXjgozjgZ8gdG9rZW4g44Gv44Kt44Oj44Oz44K744Or5a++6LGh44Go44GX44Gm57SQ44Gl44GR44KJ44KM44KLXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIGV4ZWN1dG9yOiAoY2FuY2VsOiAocmVhc29uOiBUKSA9PiB2b2lkLCBjbG9zZTogKCkgPT4gdm9pZCkgPT4gdm9pZCxcbiAgICAgICAgLi4ubGlua2VkVG9rZW5zOiBDYW5jZWxUb2tlbltdXG4gICAgKSB7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIENhbmNlbFRva2VuLCB0aGlzKTtcbiAgICAgICAgdmVyaWZ5KCd0eXBlT2YnLCAnZnVuY3Rpb24nLCBleGVjdXRvcik7XG5cbiAgICAgICAgY29uc3QgbGlua2VkVG9rZW5TZXQgPSBuZXcgU2V0KGxpbmtlZFRva2Vucy5maWx0ZXIodCA9PiBfdG9rZW5zLmhhcyh0KSkpO1xuICAgICAgICBsZXQgc3RhdHVzID0gQ2FuY2VsVG9rZW5TdGF0ZS5PUEVOO1xuICAgICAgICBmb3IgKGNvbnN0IHQgb2YgbGlua2VkVG9rZW5TZXQpIHtcbiAgICAgICAgICAgIHN0YXR1cyB8PSBnZXRDb250ZXh0KHQpLnN0YXR1cztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbnRleHQ6IENhbmNlbFRva2VuQ29udGV4dDxUPiA9IHtcbiAgICAgICAgICAgIGJyb2tlcjogbmV3IEV2ZW50QnJva2VyKCksXG4gICAgICAgICAgICBzdWJzY3JpcHRpb25zOiBuZXcgU2V0KCksXG4gICAgICAgICAgICByZWFzb246IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHN0YXR1cyxcbiAgICAgICAgfTtcbiAgICAgICAgX3Rva2Vucy5zZXQodGhpcywgT2JqZWN0LnNlYWwoY29udGV4dCkpO1xuXG4gICAgICAgIGNvbnN0IGNhbmNlbCA9IHRoaXNbX2NhbmNlbF07XG4gICAgICAgIGNvbnN0IGNsb3NlID0gdGhpc1tfY2xvc2VdO1xuICAgICAgICBpZiAoc3RhdHVzID09PSBDYW5jZWxUb2tlblN0YXRlLk9QRU4pIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgdCBvZiBsaW5rZWRUb2tlblNldCkge1xuICAgICAgICAgICAgICAgIGNvbnRleHQuc3Vic2NyaXB0aW9ucy5hZGQodC5yZWdpc3RlcihjYW5jZWwuYmluZCh0aGlzKSkpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVnaXN0ZXIoY2FuY2VsLmJpbmQodCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhlY3V0b3IoY2FuY2VsLmJpbmQodGhpcyksIGNsb3NlLmJpbmQodGhpcykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYW5jZWxsYXRpb24gcmVhc29uIGFjY2Vzc29yLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjga7ljp/lm6Dlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgcmVhc29uKCk6IFQgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gZ2V0Q29udGV4dCh0aGlzKS5yZWFzb247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEVuYWJsZSBjYW5jZWxsYXRpb24gc3RhdGUgYWNjZXNzb3IuXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+WPr+iDveOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBjYW5jZWxhYmxlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gZ2V0Q29udGV4dCh0aGlzKS5zdGF0dXMgPT09IENhbmNlbFRva2VuU3RhdGUuT1BFTjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FuY2VsbGF0aW9uIHJlcXVlc3RlZCBzdGF0ZSBhY2Nlc3Nvci5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or44KS5Y+X44GR5LuY44GR44Gm44GE44KL44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IHJlcXVlc3RlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhKGdldENvbnRleHQodGhpcykuc3RhdHVzICYgQ2FuY2VsVG9rZW5TdGF0ZS5SRVFVRVNURUQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYW5jZWxsYXRpb24gY2xvc2VkIHN0YXRlIGFjY2Vzc29yLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vlj5fku5jjgpLntYLkuobjgZfjgabjgYTjgovjgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgY2xvc2VkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISEoZ2V0Q29udGV4dCh0aGlzKS5zdGF0dXMgJiBDYW5jZWxUb2tlblN0YXRlLkNMT1NFRCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIGB0b1N0cmluZ2AgdGFnIG92ZXJyaWRlLlxuICAgICAqIEBqYSBgdG9TdHJpbmdgIOOCv+OCsOOBruOCquODvOODkOODvOODqeOCpOODiVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKTogJ0NhbmNlbFRva2VuJyB7IHJldHVybiAnQ2FuY2VsVG9rZW4nOyB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVnaXN0ZXIgY3VzdG9tIGNhbmNlbGxhdGlvbiBjYWxsYmFjay5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5pmC44Gu44Kr44K544K/44Og5Yem55CG44Gu55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb25DYW5jZWxcbiAgICAgKiAgLSBgZW5gIGNhbmNlbCBvcGVyYXRpb24gY2FsbGJhY2tcbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODq+OCs+ODvOODq+ODkOODg+OCr1xuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgU3Vic2NyaXB0aW9uYCBpbnN0YW5jZS5cbiAgICAgKiAgICAgICAgWW91IGNhbiByZXZva2UgY2FuY2VsbGF0aW9uIHRvIGNhbGwgYHVuc3Vic2NyaWJlYCBtZXRob2QuXG4gICAgICogIC0gYGphYCBgU3Vic2NyaXB0aW9uYCDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKiAgICAgICAgYHVuc3Vic2NyaWJlYCDjg6Hjgr3jg4Pjg4njgpLlkbzjgbbjgZPjgajjgafjgq3jg6Pjg7Pjgrvjg6vjgpLnhKHlirnjgavjgZnjgovjgZPjgajjgYzlj6/og71cbiAgICAgKi9cbiAgICBwdWJsaWMgcmVnaXN0ZXIob25DYW5jZWw6IChyZWFzb246IFQpID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gZ2V0Q29udGV4dCh0aGlzKTtcbiAgICAgICAgaWYgKCF0aGlzLmNhbmNlbGFibGUpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnZhbGlkU3Vic2NyaXB0aW9uO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb250ZXh0LmJyb2tlci5vbignY2FuY2VsJywgb25DYW5jZWwpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfY2FuY2VsXShyZWFzb246IFQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGdldENvbnRleHQodGhpcyk7XG4gICAgICAgIHZlcmlmeSgnbm90TmlsJywgcmVhc29uKTtcbiAgICAgICAgaWYgKCF0aGlzLmNhbmNlbGFibGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0LnJlYXNvbiA9IHJlYXNvbjtcbiAgICAgICAgY29udGV4dC5zdGF0dXMgfD0gQ2FuY2VsVG9rZW5TdGF0ZS5SRVFVRVNURUQ7XG4gICAgICAgIGZvciAoY29uc3QgcyBvZiBjb250ZXh0LnN1YnNjcmlwdGlvbnMpIHtcbiAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0LmJyb2tlci50cmlnZ2VyKCdjYW5jZWwnLCByZWFzb24pO1xuICAgICAgICB2b2lkIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oKCkgPT4gdGhpc1tfY2xvc2VdKCkpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfY2xvc2VdKCk6IHZvaWQge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gZ2V0Q29udGV4dCh0aGlzKTtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5zdGF0dXMgfD0gQ2FuY2VsVG9rZW5TdGF0ZS5DTE9TRUQ7XG4gICAgICAgIGZvciAoY29uc3QgcyBvZiBjb250ZXh0LnN1YnNjcmlwdGlvbnMpIHtcbiAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0LnN1YnNjcmlwdGlvbnMuY2xlYXIoKTtcbiAgICAgICAgY29udGV4dC5icm9rZXIub2ZmKCk7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBuby1nbG9iYWwtYXNzaWduXG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICB2ZXJpZnksXG4gICAgZ2V0Q29uZmlnLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgQ2FuY2VsVG9rZW4gfSBmcm9tICcuL2NhbmNlbC10b2tlbic7XG5cbmRlY2xhcmUgZ2xvYmFsIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcblxuICAgIGludGVyZmFjZSBQcm9taXNlQ29uc3RydWN0b3Ige1xuICAgICAgICBuZXcgPFQ+KGV4ZWN1dG9yOiAocmVzb2x2ZTogKHZhbHVlPzogVCB8IFByb21pc2VMaWtlPFQ+KSA9PiB2b2lkLCByZWplY3Q6IChyZWFzb24/OiBhbnkpID0+IHZvaWQpID0+IHZvaWQsIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsKTogUHJvbWlzZTxUPjtcbiAgICAgICAgcmVzb2x2ZTxUPih2YWx1ZT86IFQgfCBQcm9taXNlTGlrZTxUPiwgY2FuY2VsVG9rZW4/OiBDYW5jZWxUb2tlbiB8IG51bGwpOiBQcm9taXNlPFQ+O1xuICAgIH1cblxufVxuXG4vKiogYE5hdGl2ZSBQcm9taXNlYCBjb25zdHJ1Y3RvciAqL1xuY29uc3QgTmF0aXZlUHJvbWlzZSA9IFByb21pc2U7XG4vKiogQGludGVybmFsICovXG5jb25zdCBfY3JlYXRlID0gU3ltYm9sKCdjcmVhdGUnKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF90b2tlbnMgPSBuZXcgV2Vha01hcDxQcm9taXNlPHVua25vd24+LCBDYW5jZWxUb2tlbj4oKTtcblxuLyoqXG4gKiBAZW4gRXh0ZW5kZWQgYFByb21pc2VgIGNsYXNzIHdoaWNoIGVuYWJsZWQgY2FuY2VsbGF0aW9uLiA8YnI+XG4gKiAgICAgYE5hdGl2ZSBQcm9taXNlYCBjb25zdHJ1Y3RvciBpcyBvdmVycmlkZGVuIGJ5IGZyYW1ld29yayBkZWZhdWx0IGJlaGF2aW91ci5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjgpLlj6/og73jgavjgZfjgZ8gYFByb21pc2VgIOaLoeW8teOCr+ODqeOCuSA8YnI+XG4gKiAgICAg5pei5a6a44GnIGBOYXRpdmUgUHJvbWlzZWAg44KS44Kq44O844OQ44O844Op44Kk44OJ44GZ44KLLlxuICovXG5jbGFzcyBDYW5jZWxhYmxlUHJvbWlzZTxUPiBleHRlbmRzIE5hdGl2ZVByb21pc2U8VD4ge1xuXG4gICAgLyoqXG4gICAgICogQGVuIE92ZXJyaWRpbmcgb2YgdGhlIGRlZmF1bHQgY29uc3RydWN0b3IgdXNlZCBmb3IgZ2VuZXJhdGlvbiBvZiBhbiBvYmplY3QuXG4gICAgICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBrueUn+aIkOOBq+S9v+OCj+OCjOOCi+ODh+ODleOCqeODq+ODiOOCs+ODs+OCueODiOODqeOCr+OCv+OBruOCquODvOODkOODvOODqeOCpOODiVxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgc3RhdGljIGdldCBbU3ltYm9sLnNwZWNpZXNdKCk6IFByb21pc2VDb25zdHJ1Y3RvciB7IHJldHVybiBOYXRpdmVQcm9taXNlOyB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlcyBhIG5ldyByZXNvbHZlZCBwcm9taXNlIGZvciB0aGUgcHJvdmlkZWQgdmFsdWUuXG4gICAgICogQGphIOaWsOimj+OBq+ino+axuua4iOOBvyBwcm9taXNlIOOCpOODs+OCueOCv+ODs+OCueOCkuS9nOaIkFxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHRoZSB2YWx1ZSB0cmFuc21pdHRlZCBpbiBwcm9taXNlIGNoYWluLlxuICAgICAqICAtIGBqYWAgYFByb21pc2VgIOOBq+S8nemBlOOBmeOCi+WApFxuICAgICAqIEBwYXJhbSBjYW5jZWxUb2tlblxuICAgICAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIGluc3RhbmNlIGNyZWF0ZSBmcm9tIFtbQ2FuY2VsVG9rZW5dXS5gc291cmNlKClgLlxuICAgICAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dLmBzb3VyY2UoKWAg44KI44KK5L2c5oiQ44GX44GfIFtbQ2FuY2VsVG9rZW5dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAgICAgKi9cbiAgICBzdGF0aWMgcmVzb2x2ZTxUPih2YWx1ZT86IFQgfCBQcm9taXNlTGlrZTxUPiwgY2FuY2VsVG9rZW4/OiBDYW5jZWxUb2tlbiB8IG51bGwpOiBDYW5jZWxhYmxlUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVdKHN1cGVyLnJlc29sdmUodmFsdWUpLCBjYW5jZWxUb2tlbik7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBwcml2YXRlIGNvbnN0cnVjdGlvbiAqL1xuICAgIHByaXZhdGUgc3RhdGljIFtfY3JlYXRlXTxULCBUUmVzdWx0MSA9IFQsIFRSZXN1bHQyID0gbmV2ZXI+KFxuICAgICAgICBzcmM6IFByb21pc2U8VD4sXG4gICAgICAgIHRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsLFxuICAgICAgICB0aGVuQXJncz86IFtcbiAgICAgICAgICAgICgodmFsdWU6IFQpID0+IFRSZXN1bHQxIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDE+KSB8IG51bGwgfCB1bmRlZmluZWQsXG4gICAgICAgICAgICAoKHJlYXNvbjogYW55KSA9PiBUUmVzdWx0MiB8IFByb21pc2VMaWtlPFRSZXN1bHQyPikgfCBudWxsIHwgdW5kZWZpbmVkXG4gICAgICAgIF0gfCBudWxsXG4gICAgKTogQ2FuY2VsYWJsZVByb21pc2U8VFJlc3VsdDEgfCBUUmVzdWx0Mj4ge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBOYXRpdmVQcm9taXNlLCBzcmMpO1xuXG4gICAgICAgIGxldCBwOiBQcm9taXNlPFQgfCBUUmVzdWx0MSB8IFRSZXN1bHQyPjtcbiAgICAgICAgaWYgKCEodG9rZW4gaW5zdGFuY2VvZiBDYW5jZWxUb2tlbikpIHtcbiAgICAgICAgICAgIHAgPSBzcmM7XG4gICAgICAgIH0gZWxzZSBpZiAodGhlbkFyZ3MgJiYgKCFpc0Z1bmN0aW9uKHRoZW5BcmdzWzBdKSB8fCBpc0Z1bmN0aW9uKHRoZW5BcmdzWzFdKSkpIHtcbiAgICAgICAgICAgIHAgPSBzcmM7XG4gICAgICAgIH0gZWxzZSBpZiAodG9rZW4uY2FuY2VsYWJsZSkge1xuICAgICAgICAgICAgbGV0IHM6IFN1YnNjcmlwdGlvbjtcbiAgICAgICAgICAgIHAgPSBuZXcgTmF0aXZlUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgcyA9IHRva2VuLnJlZ2lzdGVyKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgc3VwZXIucHJvdG90eXBlLnRoZW4uY2FsbChzcmMsIHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnN0IGRpc3Bvc2UgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgIF90b2tlbnMuZGVsZXRlKHApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHAudGhlbihkaXNwb3NlLCBkaXNwb3NlKTtcbiAgICAgICAgfSBlbHNlIGlmICh0b2tlbi5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgIHAgPSBzdXBlci5yZWplY3QodG9rZW4ucmVhc29uKTtcbiAgICAgICAgfSBlbHNlIGlmICh0b2tlbi5jbG9zZWQpIHtcbiAgICAgICAgICAgIHAgPSBzcmM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgRXhjZXB0aW9uJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhlbkFyZ3MpIHtcbiAgICAgICAgICAgIHAgPSBzdXBlci5wcm90b3R5cGUudGhlbi5hcHBseShwLCB0aGVuQXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRva2VuICYmIHRva2VuLmNhbmNlbGFibGUpIHtcbiAgICAgICAgICAgIF90b2tlbnMuc2V0KHAsIHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHAgaW5zdGFuY2VvZiB0aGlzIHx8IE9iamVjdC5zZXRQcm90b3R5cGVPZihwLCB0aGlzLnByb3RvdHlwZSk7XG5cbiAgICAgICAgcmV0dXJuIHAgYXMgQ2FuY2VsYWJsZVByb21pc2U8VFJlc3VsdDEgfCBUUmVzdWx0Mj47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBleGVjdXRvclxuICAgICAqICAtIGBlbmAgQSBjYWxsYmFjayB1c2VkIHRvIGluaXRpYWxpemUgdGhlIHByb21pc2UuIFRoaXMgY2FsbGJhY2sgaXMgcGFzc2VkIHR3byBhcmd1bWVudHMgYHJlc29sdmVgIGFuZCBgcmVqZWN0YC5cbiAgICAgKiAgLSBgamFgIHByb21pc2Ug44Gu5Yid5pyf5YyW44Gr5L2/55So44GZ44KL44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6aLiBgcmVzb2x2ZWAg44GoIGByZWplY3RgIOOBrjLjgaTjga7lvJXmlbDjgpLmjIHjgaRcbiAgICAgKiBAcGFyYW0gY2FuY2VsVG9rZW5cbiAgICAgKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSBpbnN0YW5jZSBjcmVhdGUgZnJvbSBbW0NhbmNlbFRva2VuXV0uYHNvdXJjZSgpYC5cbiAgICAgKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXS5gc291cmNlKClgIOOCiOOCiuS9nOaIkOOBl+OBnyBbW0NhbmNlbFRva2VuXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIGV4ZWN1dG9yOiAocmVzb2x2ZTogKHZhbHVlPzogVCB8IFByb21pc2VMaWtlPFQ+KSA9PiB2b2lkLCByZWplY3Q6IChyZWFzb24/OiBhbnkpID0+IHZvaWQpID0+IHZvaWQsXG4gICAgICAgIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsXG4gICAgKSB7XG4gICAgICAgIHN1cGVyKGV4ZWN1dG9yKTtcbiAgICAgICAgcmV0dXJuIENhbmNlbGFibGVQcm9taXNlW19jcmVhdGVdKHRoaXMsIGNhbmNlbFRva2VuKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBjYWxsYmFja3MgZm9yIHRoZSByZXNvbHV0aW9uIGFuZC9vciByZWplY3Rpb24gb2YgdGhlIFByb21pc2UuXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvbmZ1bGZpbGxlZCBUaGUgY2FsbGJhY2sgdG8gZXhlY3V0ZSB3aGVuIHRoZSBQcm9taXNlIGlzIHJlc29sdmVkLlxuICAgICAqIEBwYXJhbSBvbnJlamVjdGVkIFRoZSBjYWxsYmFjayB0byBleGVjdXRlIHdoZW4gdGhlIFByb21pc2UgaXMgcmVqZWN0ZWQuXG4gICAgICogQHJldHVybnMgQSBQcm9taXNlIGZvciB0aGUgY29tcGxldGlvbiBvZiB3aGljaCBldmVyIGNhbGxiYWNrIGlzIGV4ZWN1dGVkLlxuICAgICAqL1xuICAgIHRoZW48VFJlc3VsdDEgPSBULCBUUmVzdWx0MiA9IG5ldmVyPihcbiAgICAgICAgb25mdWxmaWxsZWQ/OiAoKHZhbHVlOiBUKSA9PiBUUmVzdWx0MSB8IFByb21pc2VMaWtlPFRSZXN1bHQxPikgfCBudWxsLFxuICAgICAgICBvbnJlamVjdGVkPzogKChyZWFzb246IGFueSkgPT4gVFJlc3VsdDIgfCBQcm9taXNlTGlrZTxUUmVzdWx0Mj4pIHwgbnVsbFxuICAgICk6IFByb21pc2U8VFJlc3VsdDEgfCBUUmVzdWx0Mj4ge1xuICAgICAgICByZXR1cm4gQ2FuY2VsYWJsZVByb21pc2VbX2NyZWF0ZV0odGhpcywgX3Rva2Vucy5nZXQodGhpcyksIFtvbmZ1bGZpbGxlZCwgb25yZWplY3RlZF0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGEgY2FsbGJhY2sgZm9yIG9ubHkgdGhlIHJlamVjdGlvbiBvZiB0aGUgUHJvbWlzZS5cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIG9ucmVqZWN0ZWQgVGhlIGNhbGxiYWNrIHRvIGV4ZWN1dGUgd2hlbiB0aGUgUHJvbWlzZSBpcyByZWplY3RlZC5cbiAgICAgKiBAcmV0dXJucyBBIFByb21pc2UgZm9yIHRoZSBjb21wbGV0aW9uIG9mIHRoZSBjYWxsYmFjay5cbiAgICAgKi9cbiAgICBjYXRjaDxUUmVzdWx0MiA9IG5ldmVyPihvbnJlamVjdGVkPzogKChyZWFzb246IGFueSkgPT4gVFJlc3VsdDIgfCBQcm9taXNlTGlrZTxUUmVzdWx0Mj4pIHwgbnVsbCk6IFByb21pc2U8VCB8IFRSZXN1bHQyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnRoZW4odW5kZWZpbmVkLCBvbnJlamVjdGVkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBhIGNhbGxiYWNrIHRoYXQgaXMgaW52b2tlZCB3aGVuIHRoZSBQcm9taXNlIGlzIHNldHRsZWQgKGZ1bGZpbGxlZCBvciByZWplY3RlZCkuIDxicj5cbiAgICAgKiBUaGUgcmVzb2x2ZWQgdmFsdWUgY2Fubm90IGJlIG1vZGlmaWVkIGZyb20gdGhlIGNhbGxiYWNrLlxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb25maW5hbGx5IFRoZSBjYWxsYmFjayB0byBleGVjdXRlIHdoZW4gdGhlIFByb21pc2UgaXMgc2V0dGxlZCAoZnVsZmlsbGVkIG9yIHJlamVjdGVkKS5cbiAgICAgKiBAcmV0dXJucyBBIFByb21pc2UgZm9yIHRoZSBjb21wbGV0aW9uIG9mIHRoZSBjYWxsYmFjay5cbiAgICAgKi9cbiAgICBmaW5hbGx5KG9uZmluYWxseT86ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZCB8IG51bGwpOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgcmV0dXJuIENhbmNlbGFibGVQcm9taXNlW19jcmVhdGVdKHN1cGVyLmZpbmFsbHkob25maW5hbGx5KSwgX3Rva2Vucy5nZXQodGhpcykpO1xuICAgIH1cblxufVxuXG4vKipcbiAqIEBlbiBTd2l0Y2ggdGhlIGdsb2JhbCBgUHJvbWlzZWAgY29uc3RydWN0b3IgYE5hdGl2ZSBQcm9taXNlYCBvciBbW0NhbmNlbGFibGVQcm9taXNlXV0uIDxicj5cbiAqICAgICBgTmF0aXZlIFByb21pc2VgIGNvbnN0cnVjdG9yIGlzIG92ZXJyaWRkZW4gYnkgZnJhbWV3b3JrIGRlZmF1bHQgYmVoYXZpb3VyLlxuICogQGphIOOCsOODreODvOODkOODqyBgUHJvbWlzZWAg44Kz44Oz44K544OI44Op44Kv44K/44KSIGBOYXRpdmUgUHJvbWlzZWAg44G+44Gf44GvIFtbQ2FuY2VsYWJsZVByb21pc2VdXSDjgavliIfjgormm7/jgYggPGJyPlxuICogICAgIOaXouWumuOBpyBgTmF0aXZlIFByb21pc2VgIOOCkuOCquODvOODkOODvOODqeOCpOODieOBmeOCiy5cbiAqXG4gKiBAcGFyYW0gZW5hYmxlXG4gKiAgLSBgZW5gIGB0cnVlYDogdXNlIFtbQ2FuY2VsYWJsZVByb21pc2VdXSAvICBgZmFsc2VgOiB1c2UgYE5hdGl2ZSBQcm9taXNlYFxuICogIC0gYGphYCBgdHJ1ZWA6IFtbQ2FuY2VsYWJsZVByb21pc2VdXSDjgpLkvb/nlKggLyBgZmFsc2VgOiBgTmF0aXZlIFByb21pc2VgIOOCkuS9v+eUqFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0ZW5kUHJvbWlzZShlbmFibGU6IGJvb2xlYW4pOiBQcm9taXNlQ29uc3RydWN0b3Ige1xuICAgIGlmIChlbmFibGUpIHtcbiAgICAgICAgUHJvbWlzZSA9IENhbmNlbGFibGVQcm9taXNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIFByb21pc2UgPSBOYXRpdmVQcm9taXNlO1xuICAgIH1cbiAgICByZXR1cm4gUHJvbWlzZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBnbG9iYWwgY29uZmlnIG9wdGlvbnMgKi9cbmludGVyZmFjZSBHbG9iYWxDb25maWcge1xuICAgIG5vQXV0b21hdGljTmF0aXZlRXh0ZW5kOiBib29sZWFuO1xufVxuXG4vLyBkZWZhdWx0OiBhdXRvbWF0aWMgbmF0aXZlIHByb21pc2Ugb3ZlcnJpZGUuXG5leHRlbmRQcm9taXNlKCFnZXRDb25maWc8R2xvYmFsQ29uZmlnPigpLm5vQXV0b21hdGljTmF0aXZlRXh0ZW5kKTtcblxuZXhwb3J0IHtcbiAgICBDYW5jZWxhYmxlUHJvbWlzZSxcbiAgICBDYW5jZWxhYmxlUHJvbWlzZSBhcyBQcm9taXNlLFxufTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LWZ1bmN0aW9uLXJldHVybi10eXBlXG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LW1vZHVsZS1ib3VuZGFyeS10eXBlc1xuICovXG5cbmltcG9ydCB7IENhbmNlbFRva2VuLCBDYW5jZWxUb2tlblNvdXJjZSB9IGZyb20gJy4vY2FuY2VsLXRva2VuJztcblxuLyoqXG4gKiBAZW4gQ2FuY2VsYWJsZSBiYXNlIG9wdGlvbiBkZWZpbml0aW9uLlxuICogQGphIOOCreODo+ODs+OCu+ODq+WPr+iDveOBquWfuuW6leOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIENhbmNlbGFibGUge1xuICAgIGNhbmNlbD86IENhbmNlbFRva2VuO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gV2FpdCBmb3IgcHJvbWlzZXMgZG9uZS4gPGJyPlxuICogICAgIFdoaWxlIGNvbnRyb2wgd2lsbCBiZSByZXR1cm5lZCBpbW1lZGlhdGVseSB3aGVuIGBQcm9taXNlLmFsbCgpYCBmYWlscywgYnV0IHRoaXMgbWVodG9kIHdhaXRzIGZvciBpbmNsdWRpbmcgZmFpbHVyZS5cbiAqIEBqYSBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OI44Gu57WC5LqG44G+44Gn5b6F5qmfIDxicj5cbiAqICAgICBgUHJvbWlzZS5hbGwoKWAg44Gv5aSx5pWX44GZ44KL44Go44GZ44GQ44Gr5Yi25b6h44KS6L+U44GZ44Gu44Gr5a++44GX44CB5aSx5pWX44KC5ZCr44KB44Gm5b6F44GkIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gcHJvbWlzZXNcbiAqICAtIGBlbmAgUHJvbWlzZSBpbnN0YW5jZSBhcnJheVxuICogIC0gYGphYCBQcm9taXNlIOOCpOODs+OCueOCv+ODs+OCueOBrumFjeWIl+OCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2FpdChwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdKTogUHJvbWlzZTx1bmtub3duW10+IHtcbiAgICBjb25zdCBzYWZlUHJvbWlzZXMgPSBwcm9taXNlcy5tYXAoKHByb21pc2UpID0+IHByb21pc2UuY2F0Y2goKGUpID0+IGUpKTtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoc2FmZVByb21pc2VzKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2FuY2VsbGF0aW9uIGNoZWNrZXIgbWV0aG9kLiA8YnI+XG4gKiAgICAgSXQncyBwcmFjdGljYWJsZSBieSBgYXN5bmMgZnVuY3Rpb25gLlxuICogQGphIOOCreODo+ODs+OCu+ODq+ODgeOCp+ODg+OCq+ODvCA8YnI+XG4gKiAgICAgYGFzeW5jIGZ1bmN0aW9uYCDjgafkvb/nlKjlj6/og71cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICBhc3luYyBmdW5jdGlvbiBzb21lRnVuYyh0b2tlbjogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPHt9PiB7XG4gKiAgICBhd2FpdCBjaGVja0NhbmNlbGVkKHRva2VuKTtcbiAqICAgIHJldHVybiB7fTtcbiAqICB9XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrQ2FuY2VsZWQodG9rZW46IENhbmNlbFRva2VuIHwgdW5kZWZpbmVkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh1bmRlZmluZWQsIHRva2VuKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyBtYW5hZ2VzIGx1bXBpbmcgbXVsdGlwbGUgYFByb21pc2VgIG9iamVjdHMuIDxicj5cbiAqICAgICBJdCdzIHBvc3NpYmxlIHRvIG1ha2UgdGhlbSBjYW5jZWwgbW9yZSB0aGFuIG9uZSBgUHJvbWlzZWAgd2hpY2ggaGFuZGxlcyBkaWZmZXJlbnQgW1tDYW5jZWxUb2tlbl1dIGJ5IGx1bXBpbmcuXG4gKiBAamEg6KSH5pWwIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4jjgpLkuIDmi6znrqHnkIbjgZnjgovjgq/jg6njgrkgPGJyPlxuICogICAgIOeVsOOBquOCiyBbW0NhbmNlbFRva2VuXV0g44KS5omx44GG6KSH5pWw44GuIGBQcm9taXNlYCDjgpLkuIDmi6zjgafjgq3jg6Pjg7Pjgrvjg6vjgZXjgZvjgovjgZPjgajjgYzlj6/og71cbiAqL1xuZXhwb3J0IGNsYXNzIFByb21pc2VNYW5hZ2VyIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZnVuYy1jYWxsLXNwYWNpbmdcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wb29sID0gbmV3IE1hcDxQcm9taXNlPHVua25vd24+LCAoKHJlYXNvbjogdW5rbm93bikgPT4gdW5rbm93bikgfCB1bmRlZmluZWQ+KCk7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGEgYFByb21pc2VgIG9iamVjdCB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEgYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiOOCkueuoeeQhuS4i+OBq+i/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHByb21pc2VcbiAgICAgKiAgLSBgZW5gIGFueSBgUHJvbWlzZWAgaW5zdGFuY2UgaXMgYXZhaWxhYmxlLlxuICAgICAqICAtIGBqYWAg5Lu75oSP44GuIGBQcm9taXNlYCDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKiBAcGFyYW0gY2FuY2VsU291cmNlXG4gICAgICogIC0gYGVuYCBbW0NhbmNlbFRva2VuU291cmNlXV0gaW5zdGFuY2UgbWFkZSBieSBgQ2FuY2VsVG9rZW4uc291cmNlKClgLlxuICAgICAqICAtIGBqYWAgYENhbmNlbFRva2VuLnNvdXJjZSgpYCDjgafnlJ/miJDjgZXjgozjgosgW1tDYW5jZWxUb2tlblNvdXJjZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZXR1cm4gdGhlIHNhbWUgaW5zdGFuY2Ugb2YgaW5wdXQgYHByb21pc2VgIGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg5YWl5Yqb44GX44GfIGBwcm9taXNlYCDjgajlkIzkuIDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkPFQ+KHByb21pc2U6IFByb21pc2U8VD4sIGNhbmNlbFNvdXJjZT86IENhbmNlbFRva2VuU291cmNlKTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHRoaXMuX3Bvb2wuc2V0KHByb21pc2UsIGNhbmNlbFNvdXJjZSAmJiBjYW5jZWxTb3VyY2UuY2FuY2VsKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcblxuICAgICAgICBjb25zdCBhbHdheXMgPSAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9wb29sLmRlbGV0ZShwcm9taXNlKTtcbiAgICAgICAgICAgIGlmIChjYW5jZWxTb3VyY2UpIHtcbiAgICAgICAgICAgICAgICBjYW5jZWxTb3VyY2UuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBwcm9taXNlXG4gICAgICAgICAgICAudGhlbihhbHdheXMsIGFsd2F5cyk7XG5cbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbGVhc2VkIGFsbCBpbnN0YW5jZXMgdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOCkuegtOajhFxuICAgICAqL1xuICAgIHB1YmxpYyByZWxlYXNlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9wb29sLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBgcHJvbWlzZWAgYXJyYXkgZnJvbSB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44GuIFByb21pc2Ug44KS6YWN5YiX44Gn5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHByb21pc2VzKCk6IFByb21pc2U8dW5rbm93bj5bXSB7XG4gICAgICAgIHJldHVybiBbLi4udGhpcy5fcG9vbC5rZXlzKCldO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYWxsIGBQcm9taXNlLmFsbCgpYCBmb3IgdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBq+WvvuOBl+OBpiBgUHJvbWlzZS5hbGwoKWBcbiAgICAgKi9cbiAgICBwdWJsaWMgYWxsKCkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FsbCBgUHJvbWlzZS5yYWNlKClgIGZvciB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44Gr5a++44GX44GmIGBQcm9taXNlLnJhY2UoKWBcbiAgICAgKi9cbiAgICBwdWJsaWMgcmFjZSgpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmFjZSh0aGlzLnByb21pc2VzKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYWxsIFtbd2FpdF1dKCkgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgavlr77jgZfjgaYgW1t3YWl0XV0oKVxuICAgICAqL1xuICAgIHB1YmxpYyB3YWl0KCkge1xuICAgICAgICByZXR1cm4gd2FpdCh0aGlzLnByb21pc2VzKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnZva2UgYGNhbmNlbGAgbWVzc2FnZSBmb3IgdW5kZXIgdGhlIG1hbmFnZW1lbnQgcHJvbWlzZXMuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBriBgUHJvbWlzZWAg44Gr5a++44GX44Gm44Kt44Oj44Oz44K744Or44KS55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVhc29uXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGBjYW5jZWxTb3VyY2VgXG4gICAgICogIC0gYGphYCBgY2FuY2VsU291cmNlYCDjgavmuKHjgZXjgozjgovlvJXmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYFByb21pc2VgIGluc3RhbmNlIHdoaWNoIHdhaXQgYnkgdW50aWwgY2FuY2VsbGF0aW9uIGNvbXBsZXRpb24uXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6vlrozkuobjgb7jgaflvoXmqZ/jgZnjgosgW1tQcm9taXNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGFib3J0PFQ+KHJlYXNvbj86IFQpOiBQcm9taXNlPHVua25vd25bXT4ge1xuICAgICAgICBmb3IgKGNvbnN0IGNhbmNlbGVyIG9mIHRoaXMuX3Bvb2wudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIGlmIChjYW5jZWxlcikge1xuICAgICAgICAgICAgICAgIGNhbmNlbGVyKFxuICAgICAgICAgICAgICAgICAgICAobnVsbCAhPSByZWFzb24pID8gcmVhc29uIDogbmV3IEVycm9yKCdhYm9ydCcpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd2FpdCh0aGlzLnByb21pc2VzKCkpO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJ2ZXJpZnkiLCJFdmVudEJyb2tlciIsIl90b2tlbnMiLCJpc0Z1bmN0aW9uIiwiZ2V0Q29uZmlnIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7SUFNQTtJQUNPLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN4QztJQUNPLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQXdDdEM7Ozs7OztJQU1PLE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUM3QyxNQUFNLEVBQUUsS0FBSztRQUNiLFdBQVcsTUFBaUI7S0FDL0IsQ0FBaUI7O0lDMURsQjs7Ozs7SUE0Q0E7SUFDQSxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sRUFBNkMsQ0FBQztJQUV6RTtJQUNBLFNBQVMsVUFBVSxDQUFJLFFBQXdCO1FBQzNDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3hCLE1BQU0sSUFBSSxTQUFTLENBQUMsd0NBQXdDLENBQUMsQ0FBQztTQUNqRTtRQUNELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQTBCLENBQUM7SUFDMUQsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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QztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O2FBbUJnQixhQUFhLENBQUMsS0FBOEI7UUFDeEQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQ7SUFFQTs7Ozs7O1VBTWEsY0FBYztRQUEzQjs7WUFFcUIsVUFBSyxHQUFHLElBQUksR0FBRyxFQUFnRSxDQUFDO1NBNkZwRzs7Ozs7Ozs7Ozs7Ozs7O1FBN0VVLEdBQUcsQ0FBSSxPQUFtQixFQUFFLFlBQWdDO1lBQy9ELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxZQUFZLElBQUksWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRTdELE1BQU0sTUFBTSxHQUFHO2dCQUNYLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMzQixJQUFJLFlBQVksRUFBRTtvQkFDZCxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7aUJBQ3hCO2FBQ0osQ0FBQztZQUVGLE9BQU87aUJBQ0YsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUUxQixPQUFPLE9BQU8sQ0FBQztTQUNsQjs7Ozs7UUFNTSxPQUFPO1lBQ1YsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztTQUN0Qjs7Ozs7UUFNTSxRQUFRO1lBQ1gsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1NBQ2pDOzs7OztRQU1NLEdBQUc7WUFDTixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7U0FDdkM7Ozs7O1FBTU0sSUFBSTtZQUNQLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztTQUN4Qzs7Ozs7UUFNTSxJQUFJO1lBQ1AsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7U0FDaEM7Ozs7Ozs7Ozs7OztRQWFNLEtBQUssQ0FBSSxNQUFVO1lBQ3RCLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDeEMsSUFBSSxRQUFRLEVBQUU7b0JBQ1YsUUFBUSxDQUNKLENBQUMsSUFBSSxJQUFJLE1BQU0sSUFBSSxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQ2pELENBQUM7aUJBQ0w7YUFDSjtZQUNELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1NBQ2hDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9wcm9taXNlLyJ9
