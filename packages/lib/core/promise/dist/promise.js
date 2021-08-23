/*!
 * @cdp/promise 0.9.9
 *   promise utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/events')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/events'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP));
}(this, (function (exports, coreUtils, events) { 'use strict';

    /** @internal */ const _cancel = Symbol('cancel');
    /** @internal */ const _close = Symbol('close');
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

    /** @internal */ const _tokens$1 = new WeakMap();
    /** @internal */
    function getContext(instance) {
        if (!_tokens$1.has(instance)) {
            throw new TypeError('The object is not a valid CancelToken.');
        }
        return _tokens$1.get(instance);
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
            const linkedTokenSet = new Set(linkedTokens.filter(t => _tokens$1.has(t)));
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
            _tokens$1.set(this, Object.seal(context));
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
        no-global-assign,
        @typescript-eslint/unbound-method,
     */
    /** @internal `Native Promise` constructor */
    const NativePromise = Promise;
    /** @internal `Native then` method */
    const nativeThen = NativePromise.prototype.then;
    /** @internal */ const _create = Symbol('create');
    /** @internal */ const _tokens = new WeakMap();
    /**
     * @en Extended `Promise` class which enabled cancellation. <br>
     *     `Native Promise` constructor is overridden by framework default behaviour.
     * @ja キャンセルを可能にした `Promise` 拡張クラス <br>
     *     既定で `Native Promise` をオーバーライドする.
     */
    class CancelablePromise extends Promise {
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
                    nativeThen.call(src, resolve, reject);
                });
                const dispose = () => {
                    s.unsubscribe();
                    _tokens.delete(p);
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
                p = nativeThen.apply(p, thenArgs);
            }
            if (token && token.cancelable) {
                _tokens.set(p, token);
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
            return CancelablePromise[_create](this, _tokens.get(this), [onfulfilled, onrejected]);
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
            return CancelablePromise[_create](super.finally(onfinally), _tokens.get(this));
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
         * @en Call `Promise.allSettled()` for under the management.
         * @ja 管理対象に対して `Promise.allSettled()`
         */
        allSettled() {
            return Promise.allSettled(this.promises());
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS5qcyIsInNvdXJjZXMiOlsiaW50ZXJuYWwudHMiLCJjYW5jZWwtdG9rZW4udHMiLCJjYW5jZWxhYmxlLXByb21pc2UudHMiLCJ1dGlscy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFdmVudEJyb2tlciwgU3Vic2NyaXB0aW9uIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuXG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBfY2FuY2VsID0gU3ltYm9sKCdjYW5jZWwnKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IF9jbG9zZSAgPSBTeW1ib2woJ2Nsb3NlJyk7XG5cbi8qKlxuICogQGVuIENhbmNlbFRva2VuIHN0YXRlIGRlZmluaXRpb25zLlxuICogQGphIENhbmNlbFRva2VuIOOBrueKtuaFi+Wumue+qVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY29uc3QgZW51bSBDYW5jZWxUb2tlblN0YXRlIHtcbiAgICAvKiog44Kt44Oj44Oz44K744Or5Y+X5LuY5Y+v6IO9ICovXG4gICAgT1BFTiAgICAgICAgPSAweDAsXG4gICAgLyoqIOOCreODo+ODs+OCu+ODq+WPl+S7mOa4iOOBvyAqL1xuICAgIFJFUVVFU1RFRCAgID0gMHgxLFxuICAgIC8qKiDjgq3jg6Pjg7Pjgrvjg6vlj5fku5jkuI3lj68gKi9cbiAgICBDTE9TRUQgICAgICA9IDB4Mixcbn1cblxuLyoqXG4gKiBAZW4gQ2FuY2VsIGV2ZW50IGRlZmluaXRpb25zLlxuICogQGphIOOCreODo+ODs+OCu+ODq+OCpOODmeODs+ODiOWumue+qVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgaW50ZXJmYWNlIENhbmNlbEV2ZW50PFQ+IHtcbiAgICBjYW5jZWw6IFtUXTtcbn1cblxuLyoqXG4gKiBAZW4gSW50ZXJuYWwgQ2FuY2VsVG9rZW4gaW50ZXJmYWNlLlxuICogQGphIENhbmNlbFRva2VuIOOBruWGhemDqOOCpOODs+OCv+ODvOODleOCp+OCpOOCueWumue+qVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgaW50ZXJmYWNlIENhbmNlbFRva2VuQ29udGV4dDxUID0gdW5rbm93bj4ge1xuICAgIHJlYWRvbmx5IGJyb2tlcjogRXZlbnRCcm9rZXI8Q2FuY2VsRXZlbnQ8VD4+O1xuICAgIHJlYWRvbmx5IHN1YnNjcmlwdGlvbnM6IFNldDxTdWJzY3JpcHRpb24+O1xuICAgIHJlYXNvbjogVCB8IHVuZGVmaW5lZDtcbiAgICBzdGF0dXM6IENhbmNlbFRva2VuU3RhdGU7XG59XG5cbi8qKlxuICogQGVuIEludmFsaWQgc3Vic2NyaXB0aW9uIG9iamVjdCBkZWNsYXJhdGlvbi5cbiAqIEBqYSDnhKHlirnjgaogU3Vic2NyaXB0aW9uIOOCquODluOCuOOCp+OCr+ODiFxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY29uc3QgaW52YWxpZFN1YnNjcmlwdGlvbiA9IE9iamVjdC5mcmVlemUoe1xuICAgIGVuYWJsZTogZmFsc2UsXG4gICAgdW5zdWJzY3JpYmUoKSB7IC8qIG5vb3AgKi8gfVxufSkgYXMgU3Vic2NyaXB0aW9uO1xuIiwiaW1wb3J0IHsgdmVyaWZ5IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50QnJva2VyLCBTdWJzY3JpcHRpb24gfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQge1xuICAgIF9jYW5jZWwsXG4gICAgX2Nsb3NlLFxuICAgIENhbmNlbFRva2VuU3RhdGUsXG4gICAgQ2FuY2VsVG9rZW5Db250ZXh0LFxuICAgIGludmFsaWRTdWJzY3JpcHRpb24sXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKipcbiAqIEBlbiBDYW5jZWxsYXRpb24gc291cmNlIGludGVyZmFjZS5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vnrqHnkIbjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5jZWxUb2tlblNvdXJjZTxUID0gdW5rbm93bj4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBbW0NhbmNlbFRva2VuXV0gZ2V0dGVyLlxuICAgICAqIEBqYSBbW0NhbmNlbFRva2VuXV0g5Y+W5b6XXG4gICAgICovXG4gICAgcmVhZG9ubHkgdG9rZW46IENhbmNlbFRva2VuPFQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgY2FuY2VsLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSByZWFzb25cbiAgICAgKiAgLSBgZW5gIGNhbmNlbGxhdGlvbiByZWFzb24uIHRoaXMgYXJnIGlzIHRyYW5zbWl0dGVkIGluIHByb21pc2UgY2hhaW4uXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6vjga7nkIbnlLHjgpLmjIflrpouIGBQcm9taXNlYCDjg4HjgqfjgqTjg7PjgavkvJ3pgZTjgZXjgozjgosuXG4gICAgICovXG4gICAgY2FuY2VsKHJlYXNvbjogVCk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQnJlYWsgdXAgY2FuY2VsbGF0aW9uIHJlY2VwdGlvbi5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5Y+X5LuY44KS57WC5LqGXG4gICAgICovXG4gICAgY2xvc2UoKTogdm9pZDtcbn1cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfdG9rZW5zID0gbmV3IFdlYWtNYXA8Q2FuY2VsVG9rZW4sIENhbmNlbFRva2VuQ29udGV4dD4oKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gZ2V0Q29udGV4dDxUID0gdW5rbm93bj4oaW5zdGFuY2U6IENhbmNlbFRva2VuPFQ+KTogQ2FuY2VsVG9rZW5Db250ZXh0PFQ+IHtcbiAgICBpZiAoIV90b2tlbnMuaGFzKGluc3RhbmNlKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgb2JqZWN0IGlzIG5vdCBhIHZhbGlkIENhbmNlbFRva2VuLicpO1xuICAgIH1cbiAgICByZXR1cm4gX3Rva2Vucy5nZXQoaW5zdGFuY2UpIGFzIENhbmNlbFRva2VuQ29udGV4dDxUPjtcbn1cblxuLyoqXG4gKiBAZW4gVGhlIHRva2VuIG9iamVjdCB0byB3aGljaCB1bmlmaWNhdGlvbiBwcm9jZXNzaW5nIGZvciBhc3luY2hyb25vdXMgcHJvY2Vzc2luZyBjYW5jZWxsYXRpb24gaXMgb2ZmZXJlZC4gPGJyPlxuICogICAgIE9yaWdpbiBpcyBgQ2FuY2VsbGF0aW9uVG9rZW5gIG9mIGAuTkVUIEZyYW1ld29ya2AuXG4gKiBAamEg6Z2e5ZCM5pyf5Yem55CG44Kt44Oj44Oz44K744Or44Gu44Gf44KB44Gu57Wx5LiA5Yem55CG44KS5o+Q5L6b44GZ44KL44OI44O844Kv44Oz44Kq44OW44K444Kn44Kv44OIIDxicj5cbiAqICAgICDjgqrjg6rjgrjjg4rjg6vjga8gYC5ORVQgRnJhbWV3b3JrYCDjga4gYENhbmNlbGxhdGlvblRva2VuYFxuICpcbiAqIEBzZWUgaHR0cHM6Ly9kb2NzLm1pY3Jvc29mdC5jb20vZW4tdXMvZG90bmV0L3N0YW5kYXJkL3RocmVhZGluZy9jYW5jZWxsYXRpb24taW4tbWFuYWdlZC10aHJlYWRzXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG4gKiBgYGBcbiAqXG4gKiAtIEJhc2ljIFVzYWdlXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHRva2VuID0gbmV3IENhbmNlbFRva2VuKChjYW5jZWwsIGNsb3NlKSA9PiB7XG4gKiAgIGJ1dHRvbjEub25jbGljayA9IGV2ID0+IGNhbmNlbChuZXcgRXJyb3IoJ0NhbmNlbCcpKTtcbiAqICAgYnV0dG9uMi5vbmNsaWNrID0gZXYgPT4gY2xvc2UoKTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogb3JcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgeyBjYW5jZWwsIGNsb3NlLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7XG4gKiBidXR0b24xLm9uY2xpY2sgPSBldiA9PiBjYW5jZWwobmV3IEVycm9yKCdDYW5jZWwnKSk7XG4gKiBidXR0b24yLm9uY2xpY2sgPSBldiA9PiBjbG9zZSgpO1xuICogYGBgXG4gKlxuICogLSBVc2Ugd2l0aCBQcm9taXNlXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHsgY2FuY2VsLCBjbG9zZSwgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZSgpO1xuICogY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChvaywgbmcpID0+IHsgLi4uIH0sIHRva2VuKTtcbiAqIHByb21pc2VcbiAqICAgLnRoZW4oLi4uKVxuICogICAudGhlbiguLi4pXG4gKiAgIC50aGVuKC4uLilcbiAqICAgLmNhdGNoKHJlYXNvbiA9PiB7XG4gKiAgICAgLy8gY2hlY2sgcmVhc29uXG4gKiAgIH0pO1xuICogYGBgXG4gKlxuICogLSBSZWdpc3RlciAmIFVucmVnaXN0ZXIgY2FsbGJhY2socylcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgeyBjYW5jZWwsIGNsb3NlLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7XG4gKiBjb25zdCBzdWJzY3JpcHRpb24gPSB0b2tlbi5yZWdpc3RlcihyZWFzb24gPT4ge1xuICogICBjb25zb2xlLmxvZyhyZWFzb24ubWVzc2FnZSk7XG4gKiB9KTtcbiAqIGlmIChzb21lQ2FzZSkge1xuICogICBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgQ2FuY2VsVG9rZW48VCA9IHVua25vd24+IHtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgW1tDYW5jZWxUb2tlblNvdXJjZV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSBbW0NhbmNlbFRva2VuU291cmNlXV0g44Kk44Oz44K544K/44Oz44K544Gu5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlua2VkVG9rZW5zXG4gICAgICogIC0gYGVuYCByZWxhdGluZyBhbHJlYWR5IG1hZGUgW1tDYW5jZWxUb2tlbl1dIGluc3RhbmNlLlxuICAgICAqICAgICAgICBZb3UgY2FuIGF0dGFjaCB0byB0aGUgdG9rZW4gdGhhdCB0byBiZSBhIGNhbmNlbGxhdGlvbiB0YXJnZXQuXG4gICAgICogIC0gYGphYCDjgZnjgafjgavkvZzmiJDjgZXjgozjgZ8gW1tDYW5jZWxUb2tlbl1dIOmWoumAo+S7mOOBkeOCi+WgtOWQiOOBq+aMh+WumlxuICAgICAqICAgICAgICDmuKHjgZXjgozjgZ8gdG9rZW4g44Gv44Kt44Oj44Oz44K744Or5a++6LGh44Go44GX44Gm57SQ44Gl44GR44KJ44KM44KLXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBzb3VyY2U8VCA9IHVua25vd24+KC4uLmxpbmtlZFRva2VuczogQ2FuY2VsVG9rZW5bXSk6IENhbmNlbFRva2VuU291cmNlPFQ+IHtcbiAgICAgICAgbGV0IGNhbmNlbCE6IChyZWFzb246IFQpID0+IHZvaWQ7XG4gICAgICAgIGxldCBjbG9zZSE6ICgpID0+IHZvaWQ7XG4gICAgICAgIGNvbnN0IHRva2VuID0gbmV3IENhbmNlbFRva2VuPFQ+KChvbkNhbmNlbCwgb25DbG9zZSkgPT4ge1xuICAgICAgICAgICAgY2FuY2VsID0gb25DYW5jZWw7XG4gICAgICAgICAgICBjbG9zZSA9IG9uQ2xvc2U7XG4gICAgICAgIH0sIC4uLmxpbmtlZFRva2Vucyk7XG4gICAgICAgIHJldHVybiBPYmplY3QuZnJlZXplKHsgdG9rZW4sIGNhbmNlbCwgY2xvc2UgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBleGVjdXRvclxuICAgICAqICAtIGBlbmAgZXhlY3V0ZXIgdGhhdCBoYXMgYGNhbmNlbGAgYW5kIGBjbG9zZWAgY2FsbGJhY2suXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6sv44Kv44Ot44O844K6IOWun+ihjOOCs+ODvOODq+ODkOODg+OCr+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBsaW5rZWRUb2tlbnNcbiAgICAgKiAgLSBgZW5gIHJlbGF0aW5nIGFscmVhZHkgbWFkZSBbW0NhbmNlbFRva2VuXV0gaW5zdGFuY2UuXG4gICAgICogICAgICAgIFlvdSBjYW4gYXR0YWNoIHRvIHRoZSB0b2tlbiB0aGF0IHRvIGJlIGEgY2FuY2VsbGF0aW9uIHRhcmdldC5cbiAgICAgKiAgLSBgamFgIOOBmeOBp+OBq+S9nOaIkOOBleOCjOOBnyBbW0NhbmNlbFRva2VuXV0g6Zai6YCj5LuY44GR44KL5aC05ZCI44Gr5oyH5a6aXG4gICAgICogICAgICAgIOa4oeOBleOCjOOBnyB0b2tlbiDjga/jgq3jg6Pjg7Pjgrvjg6vlr77osaHjgajjgZfjgabntJDjgaXjgZHjgonjgozjgotcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgZXhlY3V0b3I6IChjYW5jZWw6IChyZWFzb246IFQpID0+IHZvaWQsIGNsb3NlOiAoKSA9PiB2b2lkKSA9PiB2b2lkLFxuICAgICAgICAuLi5saW5rZWRUb2tlbnM6IENhbmNlbFRva2VuW11cbiAgICApIHtcbiAgICAgICAgdmVyaWZ5KCdpbnN0YW5jZU9mJywgQ2FuY2VsVG9rZW4sIHRoaXMpO1xuICAgICAgICB2ZXJpZnkoJ3R5cGVPZicsICdmdW5jdGlvbicsIGV4ZWN1dG9yKTtcblxuICAgICAgICBjb25zdCBsaW5rZWRUb2tlblNldCA9IG5ldyBTZXQobGlua2VkVG9rZW5zLmZpbHRlcih0ID0+IF90b2tlbnMuaGFzKHQpKSk7XG4gICAgICAgIGxldCBzdGF0dXMgPSBDYW5jZWxUb2tlblN0YXRlLk9QRU47XG4gICAgICAgIGZvciAoY29uc3QgdCBvZiBsaW5rZWRUb2tlblNldCkge1xuICAgICAgICAgICAgc3RhdHVzIHw9IGdldENvbnRleHQodCkuc3RhdHVzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29udGV4dDogQ2FuY2VsVG9rZW5Db250ZXh0PFQ+ID0ge1xuICAgICAgICAgICAgYnJva2VyOiBuZXcgRXZlbnRCcm9rZXIoKSxcbiAgICAgICAgICAgIHN1YnNjcmlwdGlvbnM6IG5ldyBTZXQoKSxcbiAgICAgICAgICAgIHJlYXNvbjogdW5kZWZpbmVkLFxuICAgICAgICAgICAgc3RhdHVzLFxuICAgICAgICB9O1xuICAgICAgICBfdG9rZW5zLnNldCh0aGlzLCBPYmplY3Quc2VhbChjb250ZXh0KSk7XG5cbiAgICAgICAgY29uc3QgY2FuY2VsID0gdGhpc1tfY2FuY2VsXTtcbiAgICAgICAgY29uc3QgY2xvc2UgPSB0aGlzW19jbG9zZV07XG4gICAgICAgIGlmIChzdGF0dXMgPT09IENhbmNlbFRva2VuU3RhdGUuT1BFTikge1xuICAgICAgICAgICAgZm9yIChjb25zdCB0IG9mIGxpbmtlZFRva2VuU2V0KSB7XG4gICAgICAgICAgICAgICAgY29udGV4dC5zdWJzY3JpcHRpb25zLmFkZCh0LnJlZ2lzdGVyKGNhbmNlbC5iaW5kKHRoaXMpKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWdpc3RlcihjYW5jZWwuYmluZCh0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleGVjdXRvcihjYW5jZWwuYmluZCh0aGlzKSwgY2xvc2UuYmluZCh0aGlzKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbmNlbGxhdGlvbiByZWFzb24gYWNjZXNzb3IuXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+OBruWOn+WboOWPluW+l1xuICAgICAqL1xuICAgIGdldCByZWFzb24oKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiBnZXRDb250ZXh0KHRoaXMpLnJlYXNvbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRW5hYmxlIGNhbmNlbGxhdGlvbiBzdGF0ZSBhY2Nlc3Nvci5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5Y+v6IO944GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGNhbmNlbGFibGUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBnZXRDb250ZXh0KHRoaXMpLnN0YXR1cyA9PT0gQ2FuY2VsVG9rZW5TdGF0ZS5PUEVOO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYW5jZWxsYXRpb24gcmVxdWVzdGVkIHN0YXRlIGFjY2Vzc29yLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjgpLlj5fjgZHku5jjgZHjgabjgYTjgovjgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgcmVxdWVzdGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISEoZ2V0Q29udGV4dCh0aGlzKS5zdGF0dXMgJiBDYW5jZWxUb2tlblN0YXRlLlJFUVVFU1RFRCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbmNlbGxhdGlvbiBjbG9zZWQgc3RhdGUgYWNjZXNzb3IuXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+WPl+S7mOOCkue1guS6huOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBjbG9zZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIShnZXRDb250ZXh0KHRoaXMpLnN0YXR1cyAmIENhbmNlbFRva2VuU3RhdGUuQ0xPU0VEKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gYHRvU3RyaW5nYCB0YWcgb3ZlcnJpZGUuXG4gICAgICogQGphIGB0b1N0cmluZ2Ag44K/44Kw44Gu44Kq44O844OQ44O844Op44Kk44OJXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpOiAnQ2FuY2VsVG9rZW4nIHsgcmV0dXJuICdDYW5jZWxUb2tlbic7IH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWdpc3RlciBjdXN0b20gY2FuY2VsbGF0aW9uIGNhbGxiYWNrLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vmmYLjga7jgqvjgrnjgr/jg6Dlh6bnkIbjga7nmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvbkNhbmNlbFxuICAgICAqICAtIGBlbmAgY2FuY2VsIG9wZXJhdGlvbiBjYWxsYmFja1xuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744Or44Kz44O844Or44OQ44OD44KvXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIGBTdWJzY3JpcHRpb25gIGluc3RhbmNlLlxuICAgICAqICAgICAgICBZb3UgY2FuIHJldm9rZSBjYW5jZWxsYXRpb24gdG8gY2FsbCBgdW5zdWJzY3JpYmVgIG1ldGhvZC5cbiAgICAgKiAgLSBgamFgIGBTdWJzY3JpcHRpb25gIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqICAgICAgICBgdW5zdWJzY3JpYmVgIOODoeOCveODg+ODieOCkuWRvOOBtuOBk+OBqOOBp+OCreODo+ODs+OCu+ODq+OCkueEoeWKueOBq+OBmeOCi+OBk+OBqOOBjOWPr+iDvVxuICAgICAqL1xuICAgIHB1YmxpYyByZWdpc3RlcihvbkNhbmNlbDogKHJlYXNvbjogVCkgPT4gdW5rbm93bik6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBnZXRDb250ZXh0KHRoaXMpO1xuICAgICAgICBpZiAoIXRoaXMuY2FuY2VsYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIGludmFsaWRTdWJzY3JpcHRpb247XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnRleHQuYnJva2VyLm9uKCdjYW5jZWwnLCBvbkNhbmNlbCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19jYW5jZWxdKHJlYXNvbjogVCk6IHZvaWQge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gZ2V0Q29udGV4dCh0aGlzKTtcbiAgICAgICAgdmVyaWZ5KCdub3ROaWwnLCByZWFzb24pO1xuICAgICAgICBpZiAoIXRoaXMuY2FuY2VsYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQucmVhc29uID0gcmVhc29uO1xuICAgICAgICBjb250ZXh0LnN0YXR1cyB8PSBDYW5jZWxUb2tlblN0YXRlLlJFUVVFU1RFRDtcbiAgICAgICAgZm9yIChjb25zdCBzIG9mIGNvbnRleHQuc3Vic2NyaXB0aW9ucykge1xuICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQuYnJva2VyLnRyaWdnZXIoJ2NhbmNlbCcsIHJlYXNvbik7XG4gICAgICAgIHZvaWQgUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB0aGlzW19jbG9zZV0oKSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgW19jbG9zZV0oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBnZXRDb250ZXh0KHRoaXMpO1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0LnN0YXR1cyB8PSBDYW5jZWxUb2tlblN0YXRlLkNMT1NFRDtcbiAgICAgICAgZm9yIChjb25zdCBzIG9mIGNvbnRleHQuc3Vic2NyaXB0aW9ucykge1xuICAgICAgICAgICAgcy51bnN1YnNjcmliZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQuc3Vic2NyaXB0aW9ucy5jbGVhcigpO1xuICAgICAgICBjb250ZXh0LmJyb2tlci5vZmYoKTtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIG5vLWdsb2JhbC1hc3NpZ24sXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kLFxuICovXG5cbmltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICB2ZXJpZnksXG4gICAgZ2V0Q29uZmlnLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgQ2FuY2VsVG9rZW4gfSBmcm9tICcuL2NhbmNlbC10b2tlbic7XG5cbmRlY2xhcmUgZ2xvYmFsIHtcblxuICAgIGludGVyZmFjZSBQcm9taXNlQ29uc3RydWN0b3Ige1xuICAgICAgICBuZXcgPFQ+KGV4ZWN1dG9yOiAocmVzb2x2ZTogKHZhbHVlPzogVCB8IFByb21pc2VMaWtlPFQ+KSA9PiB2b2lkLCByZWplY3Q6IChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkKSA9PiB2b2lkLCBjYW5jZWxUb2tlbj86IENhbmNlbFRva2VuIHwgbnVsbCk6IFByb21pc2U8VD47XG4gICAgICAgIHJlc29sdmU8VD4odmFsdWU/OiBUIHwgUHJvbWlzZUxpa2U8VD4sIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsKTogUHJvbWlzZTxUPjtcbiAgICB9XG5cbn1cblxuLyoqIEBpbnRlcm5hbCBgTmF0aXZlIFByb21pc2VgIGNvbnN0cnVjdG9yICovXG5jb25zdCBOYXRpdmVQcm9taXNlID0gUHJvbWlzZTtcbi8qKiBAaW50ZXJuYWwgYE5hdGl2ZSB0aGVuYCBtZXRob2QgKi9cbmNvbnN0IG5hdGl2ZVRoZW4gPSBOYXRpdmVQcm9taXNlLnByb3RvdHlwZS50aGVuO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY3JlYXRlID0gU3ltYm9sKCdjcmVhdGUnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Rva2VucyA9IG5ldyBXZWFrTWFwPFByb21pc2U8dW5rbm93bj4sIENhbmNlbFRva2VuPigpO1xuXG4vKipcbiAqIEBlbiBFeHRlbmRlZCBgUHJvbWlzZWAgY2xhc3Mgd2hpY2ggZW5hYmxlZCBjYW5jZWxsYXRpb24uIDxicj5cbiAqICAgICBgTmF0aXZlIFByb21pc2VgIGNvbnN0cnVjdG9yIGlzIG92ZXJyaWRkZW4gYnkgZnJhbWV3b3JrIGRlZmF1bHQgYmVoYXZpb3VyLlxuICogQGphIOOCreODo+ODs+OCu+ODq+OCkuWPr+iDveOBq+OBl+OBnyBgUHJvbWlzZWAg5ouh5by144Kv44Op44K5IDxicj5cbiAqICAgICDml6LlrprjgacgYE5hdGl2ZSBQcm9taXNlYCDjgpLjgqrjg7zjg5Djg7zjg6njgqTjg4njgZnjgosuXG4gKi9cbmNsYXNzIENhbmNlbGFibGVQcm9taXNlPFQ+IGV4dGVuZHMgUHJvbWlzZTxUPiB7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gT3ZlcnJpZGluZyBvZiB0aGUgZGVmYXVsdCBjb25zdHJ1Y3RvciB1c2VkIGZvciBnZW5lcmF0aW9uIG9mIGFuIG9iamVjdC5cbiAgICAgKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu55Sf5oiQ44Gr5L2/44KP44KM44KL44OH44OV44Kp44Or44OI44Kz44Oz44K544OI44Op44Kv44K/44Gu44Kq44O844OQ44O844Op44Kk44OJXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0IFtTeW1ib2wuc3BlY2llc10oKTogUHJvbWlzZUNvbnN0cnVjdG9yIHsgcmV0dXJuIE5hdGl2ZVByb21pc2U7IH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGVzIGEgbmV3IHJlc29sdmVkIHByb21pc2UgZm9yIHRoZSBwcm92aWRlZCB2YWx1ZS5cbiAgICAgKiBAamEg5paw6KaP44Gr6Kej5rG65riI44G/IHByb21pc2Ug44Kk44Oz44K544K/44Oz44K544KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgdGhlIHZhbHVlIHRyYW5zbWl0dGVkIGluIHByb21pc2UgY2hhaW4uXG4gICAgICogIC0gYGphYCBgUHJvbWlzZWAg44Gr5Lyd6YGU44GZ44KL5YCkXG4gICAgICogQHBhcmFtIGNhbmNlbFRva2VuXG4gICAgICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gaW5zdGFuY2UgY3JlYXRlIGZyb20gW1tDYW5jZWxUb2tlbl1dLmBzb3VyY2UoKWAuXG4gICAgICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0uYHNvdXJjZSgpYCDjgojjgorkvZzmiJDjgZfjgZ8gW1tDYW5jZWxUb2tlbl1dIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICAgICAqL1xuICAgIHN0YXRpYyByZXNvbHZlPFQ+KHZhbHVlPzogVCB8IFByb21pc2VMaWtlPFQ+LCBjYW5jZWxUb2tlbj86IENhbmNlbFRva2VuIHwgbnVsbCk6IENhbmNlbGFibGVQcm9taXNlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZV0oc3VwZXIucmVzb2x2ZSh2YWx1ZSksIGNhbmNlbFRva2VuKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHByaXZhdGUgY29uc3RydWN0aW9uICovXG4gICAgcHJpdmF0ZSBzdGF0aWMgW19jcmVhdGVdPFQsIFRSZXN1bHQxID0gVCwgVFJlc3VsdDIgPSBuZXZlcj4oXG4gICAgICAgIHNyYzogUHJvbWlzZTxUPixcbiAgICAgICAgdG9rZW4/OiBDYW5jZWxUb2tlbiB8IG51bGwsXG4gICAgICAgIHRoZW5BcmdzPzogW1xuICAgICAgICAgICAgKCh2YWx1ZTogVCkgPT4gVFJlc3VsdDEgfCBQcm9taXNlTGlrZTxUUmVzdWx0MT4pIHwgbnVsbCB8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICgocmVhc29uOiB1bmtub3duKSA9PiBUUmVzdWx0MiB8IFByb21pc2VMaWtlPFRSZXN1bHQyPikgfCBudWxsIHwgdW5kZWZpbmVkXG4gICAgICAgIF0gfCBudWxsXG4gICAgKTogQ2FuY2VsYWJsZVByb21pc2U8VFJlc3VsdDEgfCBUUmVzdWx0Mj4ge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBOYXRpdmVQcm9taXNlLCBzcmMpO1xuXG4gICAgICAgIGxldCBwOiBQcm9taXNlPFQgfCBUUmVzdWx0MSB8IFRSZXN1bHQyPjtcbiAgICAgICAgaWYgKCEodG9rZW4gaW5zdGFuY2VvZiBDYW5jZWxUb2tlbikpIHtcbiAgICAgICAgICAgIHAgPSBzcmM7XG4gICAgICAgIH0gZWxzZSBpZiAodGhlbkFyZ3MgJiYgKCFpc0Z1bmN0aW9uKHRoZW5BcmdzWzBdKSB8fCBpc0Z1bmN0aW9uKHRoZW5BcmdzWzFdKSkpIHtcbiAgICAgICAgICAgIHAgPSBzcmM7XG4gICAgICAgIH0gZWxzZSBpZiAodG9rZW4uY2FuY2VsYWJsZSkge1xuICAgICAgICAgICAgbGV0IHM6IFN1YnNjcmlwdGlvbjtcbiAgICAgICAgICAgIHAgPSBuZXcgTmF0aXZlUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgcyA9IHRva2VuLnJlZ2lzdGVyKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgbmF0aXZlVGhlbi5jYWxsKHNyYywgcmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3QgZGlzcG9zZSA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgX3Rva2Vucy5kZWxldGUocCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcC50aGVuKGRpc3Bvc2UsIGRpc3Bvc2UpO1xuICAgICAgICB9IGVsc2UgaWYgKHRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgcCA9IHN1cGVyLnJlamVjdCh0b2tlbi5yZWFzb24pO1xuICAgICAgICB9IGVsc2UgaWYgKHRva2VuLmNsb3NlZCkge1xuICAgICAgICAgICAgcCA9IHNyYztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5leHBlY3RlZCBFeGNlcHRpb24nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGVuQXJncykge1xuICAgICAgICAgICAgcCA9IG5hdGl2ZVRoZW4uYXBwbHkocCwgdGhlbkFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0b2tlbiAmJiB0b2tlbi5jYW5jZWxhYmxlKSB7XG4gICAgICAgICAgICBfdG9rZW5zLnNldChwLCB0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBwIGluc3RhbmNlb2YgdGhpcyB8fCBPYmplY3Quc2V0UHJvdG90eXBlT2YocCwgdGhpcy5wcm90b3R5cGUpO1xuXG4gICAgICAgIHJldHVybiBwIGFzIENhbmNlbGFibGVQcm9taXNlPFRSZXN1bHQxIHwgVFJlc3VsdDI+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZXhlY3V0b3JcbiAgICAgKiAgLSBgZW5gIEEgY2FsbGJhY2sgdXNlZCB0byBpbml0aWFsaXplIHRoZSBwcm9taXNlLiBUaGlzIGNhbGxiYWNrIGlzIHBhc3NlZCB0d28gYXJndW1lbnRzIGByZXNvbHZlYCBhbmQgYHJlamVjdGAuXG4gICAgICogIC0gYGphYCBwcm9taXNlIOOBruWIneacn+WMluOBq+S9v+eUqOOBmeOCi+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+Wumi4gYHJlc29sdmVgIOOBqCBgcmVqZWN0YCDjga4y44Gk44Gu5byV5pWw44KS5oyB44GkXG4gICAgICogQHBhcmFtIGNhbmNlbFRva2VuXG4gICAgICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gaW5zdGFuY2UgY3JlYXRlIGZyb20gW1tDYW5jZWxUb2tlbl1dLmBzb3VyY2UoKWAuXG4gICAgICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0uYHNvdXJjZSgpYCDjgojjgorkvZzmiJDjgZfjgZ8gW1tDYW5jZWxUb2tlbl1dIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBleGVjdXRvcjogKHJlc29sdmU6ICh2YWx1ZT86IFQgfCBQcm9taXNlTGlrZTxUPikgPT4gdm9pZCwgcmVqZWN0OiAocmVhc29uPzogdW5rbm93bikgPT4gdm9pZCkgPT4gdm9pZCxcbiAgICAgICAgY2FuY2VsVG9rZW4/OiBDYW5jZWxUb2tlbiB8IG51bGxcbiAgICApIHtcbiAgICAgICAgc3VwZXIoZXhlY3V0b3IpO1xuICAgICAgICByZXR1cm4gQ2FuY2VsYWJsZVByb21pc2VbX2NyZWF0ZV0odGhpcywgY2FuY2VsVG9rZW4pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGNhbGxiYWNrcyBmb3IgdGhlIHJlc29sdXRpb24gYW5kL29yIHJlamVjdGlvbiBvZiB0aGUgUHJvbWlzZS5cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIG9uZnVsZmlsbGVkIFRoZSBjYWxsYmFjayB0byBleGVjdXRlIHdoZW4gdGhlIFByb21pc2UgaXMgcmVzb2x2ZWQuXG4gICAgICogQHBhcmFtIG9ucmVqZWN0ZWQgVGhlIGNhbGxiYWNrIHRvIGV4ZWN1dGUgd2hlbiB0aGUgUHJvbWlzZSBpcyByZWplY3RlZC5cbiAgICAgKiBAcmV0dXJucyBBIFByb21pc2UgZm9yIHRoZSBjb21wbGV0aW9uIG9mIHdoaWNoIGV2ZXIgY2FsbGJhY2sgaXMgZXhlY3V0ZWQuXG4gICAgICovXG4gICAgdGhlbjxUUmVzdWx0MSA9IFQsIFRSZXN1bHQyID0gbmV2ZXI+KFxuICAgICAgICBvbmZ1bGZpbGxlZD86ICgodmFsdWU6IFQpID0+IFRSZXN1bHQxIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDE+KSB8IG51bGwsXG4gICAgICAgIG9ucmVqZWN0ZWQ/OiAoKHJlYXNvbjogdW5rbm93bikgPT4gVFJlc3VsdDIgfCBQcm9taXNlTGlrZTxUUmVzdWx0Mj4pIHwgbnVsbFxuICAgICk6IFByb21pc2U8VFJlc3VsdDEgfCBUUmVzdWx0Mj4ge1xuICAgICAgICByZXR1cm4gQ2FuY2VsYWJsZVByb21pc2VbX2NyZWF0ZV0odGhpcywgX3Rva2Vucy5nZXQodGhpcyksIFtvbmZ1bGZpbGxlZCwgb25yZWplY3RlZF0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGEgY2FsbGJhY2sgZm9yIG9ubHkgdGhlIHJlamVjdGlvbiBvZiB0aGUgUHJvbWlzZS5cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIG9ucmVqZWN0ZWQgVGhlIGNhbGxiYWNrIHRvIGV4ZWN1dGUgd2hlbiB0aGUgUHJvbWlzZSBpcyByZWplY3RlZC5cbiAgICAgKiBAcmV0dXJucyBBIFByb21pc2UgZm9yIHRoZSBjb21wbGV0aW9uIG9mIHRoZSBjYWxsYmFjay5cbiAgICAgKi9cbiAgICBjYXRjaDxUUmVzdWx0MiA9IG5ldmVyPihvbnJlamVjdGVkPzogKChyZWFzb246IHVua25vd24pID0+IFRSZXN1bHQyIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDI+KSB8IG51bGwpOiBQcm9taXNlPFQgfCBUUmVzdWx0Mj4ge1xuICAgICAgICByZXR1cm4gdGhpcy50aGVuKHVuZGVmaW5lZCwgb25yZWplY3RlZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXR0YWNoZXMgYSBjYWxsYmFjayB0aGF0IGlzIGludm9rZWQgd2hlbiB0aGUgUHJvbWlzZSBpcyBzZXR0bGVkIChmdWxmaWxsZWQgb3IgcmVqZWN0ZWQpLiA8YnI+XG4gICAgICogVGhlIHJlc29sdmVkIHZhbHVlIGNhbm5vdCBiZSBtb2RpZmllZCBmcm9tIHRoZSBjYWxsYmFjay5cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIG9uZmluYWxseSBUaGUgY2FsbGJhY2sgdG8gZXhlY3V0ZSB3aGVuIHRoZSBQcm9taXNlIGlzIHNldHRsZWQgKGZ1bGZpbGxlZCBvciByZWplY3RlZCkuXG4gICAgICogQHJldHVybnMgQSBQcm9taXNlIGZvciB0aGUgY29tcGxldGlvbiBvZiB0aGUgY2FsbGJhY2suXG4gICAgICovXG4gICAgZmluYWxseShvbmZpbmFsbHk/OiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQgfCBudWxsKTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiBDYW5jZWxhYmxlUHJvbWlzZVtfY3JlYXRlXShzdXBlci5maW5hbGx5KG9uZmluYWxseSksIF90b2tlbnMuZ2V0KHRoaXMpKTtcbiAgICB9XG5cbn1cblxuLyoqXG4gKiBAZW4gU3dpdGNoIHRoZSBnbG9iYWwgYFByb21pc2VgIGNvbnN0cnVjdG9yIGBOYXRpdmUgUHJvbWlzZWAgb3IgW1tDYW5jZWxhYmxlUHJvbWlzZV1dLiA8YnI+XG4gKiAgICAgYE5hdGl2ZSBQcm9taXNlYCBjb25zdHJ1Y3RvciBpcyBvdmVycmlkZGVuIGJ5IGZyYW1ld29yayBkZWZhdWx0IGJlaGF2aW91ci5cbiAqIEBqYSDjgrDjg63jg7zjg5Djg6sgYFByb21pc2VgIOOCs+ODs+OCueODiOODqeOCr+OCv+OCkiBgTmF0aXZlIFByb21pc2VgIOOBvuOBn+OBryBbW0NhbmNlbGFibGVQcm9taXNlXV0g44Gr5YiH44KK5pu/44GIIDxicj5cbiAqICAgICDml6LlrprjgacgYE5hdGl2ZSBQcm9taXNlYCDjgpLjgqrjg7zjg5Djg7zjg6njgqTjg4njgZnjgosuXG4gKlxuICogQHBhcmFtIGVuYWJsZVxuICogIC0gYGVuYCBgdHJ1ZWA6IHVzZSBbW0NhbmNlbGFibGVQcm9taXNlXV0gLyAgYGZhbHNlYDogdXNlIGBOYXRpdmUgUHJvbWlzZWBcbiAqICAtIGBqYWAgYHRydWVgOiBbW0NhbmNlbGFibGVQcm9taXNlXV0g44KS5L2/55SoIC8gYGZhbHNlYDogYE5hdGl2ZSBQcm9taXNlYCDjgpLkvb/nlKhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dGVuZFByb21pc2UoZW5hYmxlOiBib29sZWFuKTogUHJvbWlzZUNvbnN0cnVjdG9yIHtcbiAgICBpZiAoZW5hYmxlKSB7XG4gICAgICAgIFByb21pc2UgPSBDYW5jZWxhYmxlUHJvbWlzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBQcm9taXNlID0gTmF0aXZlUHJvbWlzZTtcbiAgICB9XG4gICAgcmV0dXJuIFByb21pc2U7XG59XG5cbi8qKiBAaW50ZXJuYWwgZ2xvYmFsIGNvbmZpZyBvcHRpb25zICovXG5pbnRlcmZhY2UgR2xvYmFsQ29uZmlnIHtcbiAgICBub0F1dG9tYXRpY05hdGl2ZUV4dGVuZDogYm9vbGVhbjtcbn1cblxuLy8gZGVmYXVsdDogYXV0b21hdGljIG5hdGl2ZSBwcm9taXNlIG92ZXJyaWRlLlxuZXh0ZW5kUHJvbWlzZSghZ2V0Q29uZmlnPEdsb2JhbENvbmZpZz4oKS5ub0F1dG9tYXRpY05hdGl2ZUV4dGVuZCk7XG5cbmV4cG9ydCB7XG4gICAgQ2FuY2VsYWJsZVByb21pc2UsXG4gICAgQ2FuY2VsYWJsZVByb21pc2UgYXMgUHJvbWlzZSxcbn07XG4iLCJpbXBvcnQgeyBDYW5jZWxUb2tlbiwgQ2FuY2VsVG9rZW5Tb3VyY2UgfSBmcm9tICcuL2NhbmNlbC10b2tlbic7XG5cbi8qKlxuICogQGVuIENhbmNlbGFibGUgYmFzZSBvcHRpb24gZGVmaW5pdGlvbi5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vlj6/og73jgarln7rlupXjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5jZWxhYmxlIHtcbiAgICBjYW5jZWw/OiBDYW5jZWxUb2tlbjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFdhaXQgZm9yIHByb21pc2VzIGRvbmUuIDxicj5cbiAqICAgICBXaGlsZSBjb250cm9sIHdpbGwgYmUgcmV0dXJuZWQgaW1tZWRpYXRlbHkgd2hlbiBgUHJvbWlzZS5hbGwoKWAgZmFpbHMsIGJ1dCB0aGlzIG1laHRvZCB3YWl0cyBmb3IgaW5jbHVkaW5nIGZhaWx1cmUuXG4gKiBAamEgYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiOOBrue1guS6huOBvuOBp+W+heapnyA8YnI+XG4gKiAgICAgYFByb21pc2UuYWxsKClgIOOBr+WkseaVl+OBmeOCi+OBqOOBmeOBkOOBq+WItuW+oeOCkui/lOOBmeOBruOBq+WvvuOBl+OAgeWkseaVl+OCguWQq+OCgeOBpuW+heOBpCBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIHByb21pc2VzXG4gKiAgLSBgZW5gIFByb21pc2UgaW5zdGFuY2UgYXJyYXlcbiAqICAtIGBqYWAgUHJvbWlzZSDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7phY3liJfjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdhaXQocHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSk6IFByb21pc2U8dW5rbm93bltdPiB7XG4gICAgY29uc3Qgc2FmZVByb21pc2VzID0gcHJvbWlzZXMubWFwKChwcm9taXNlKSA9PiBwcm9taXNlLmNhdGNoKChlKSA9PiBlKSk7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHNhZmVQcm9taXNlcyk7XG59XG5cbi8qKlxuICogQGVuIENhbmNlbGxhdGlvbiBjaGVja2VyIG1ldGhvZC4gPGJyPlxuICogICAgIEl0J3MgcHJhY3RpY2FibGUgYnkgYGFzeW5jIGZ1bmN0aW9uYC5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjg4Hjgqfjg4Pjgqvjg7wgPGJyPlxuICogICAgIGBhc3luYyBmdW5jdGlvbmAg44Gn5L2/55So5Y+v6IO9XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAgYXN5bmMgZnVuY3Rpb24gc29tZUZ1bmModG9rZW46IENhbmNlbFRva2VuKTogUHJvbWlzZTx7fT4ge1xuICogICAgYXdhaXQgY2hlY2tDYW5jZWxlZCh0b2tlbik7XG4gKiAgICByZXR1cm4ge307XG4gKiAgfVxuICogYGBgXG4gKlxuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjaGVja0NhbmNlbGVkKHRva2VuOiBDYW5jZWxUb2tlbiB8IHVuZGVmaW5lZCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodW5kZWZpbmVkLCB0b2tlbik7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3MgbWFuYWdlcyBsdW1waW5nIG11bHRpcGxlIGBQcm9taXNlYCBvYmplY3RzLiA8YnI+XG4gKiAgICAgSXQncyBwb3NzaWJsZSB0byBtYWtlIHRoZW0gY2FuY2VsIG1vcmUgdGhhbiBvbmUgYFByb21pc2VgIHdoaWNoIGhhbmRsZXMgZGlmZmVyZW50IFtbQ2FuY2VsVG9rZW5dXSBieSBsdW1waW5nLlxuICogQGphIOikh+aVsCBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OI44KS5LiA5ous566h55CG44GZ44KL44Kv44Op44K5IDxicj5cbiAqICAgICDnlbDjgarjgosgW1tDYW5jZWxUb2tlbl1dIOOCkuaJseOBhuikh+aVsOOBriBgUHJvbWlzZWAg44KS5LiA5ous44Gn44Kt44Oj44Oz44K744Or44GV44Gb44KL44GT44Go44GM5Y+v6IO9XG4gKi9cbmV4cG9ydCBjbGFzcyBQcm9taXNlTWFuYWdlciB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGZ1bmMtY2FsbC1zcGFjaW5nXG4gICAgcHJpdmF0ZSByZWFkb25seSBfcG9vbCA9IG5ldyBNYXA8UHJvbWlzZTx1bmtub3duPiwgKChyZWFzb246IHVua25vd24pID0+IHVua25vd24pIHwgdW5kZWZpbmVkPigpO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBhIGBQcm9taXNlYCBvYmplY3QgdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4jjgpLnrqHnkIbkuIvjgavov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9taXNlXG4gICAgICogIC0gYGVuYCBhbnkgYFByb21pc2VgIGluc3RhbmNlIGlzIGF2YWlsYWJsZS5cbiAgICAgKiAgLSBgamFgIOS7u+aEj+OBriBgUHJvbWlzZWAg44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIGNhbmNlbFNvdXJjZVxuICAgICAqICAtIGBlbmAgW1tDYW5jZWxUb2tlblNvdXJjZV1dIGluc3RhbmNlIG1hZGUgYnkgYENhbmNlbFRva2VuLnNvdXJjZSgpYC5cbiAgICAgKiAgLSBgamFgIGBDYW5jZWxUb2tlbi5zb3VyY2UoKWAg44Gn55Sf5oiQ44GV44KM44KLIFtbQ2FuY2VsVG9rZW5Tb3VyY2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmV0dXJuIHRoZSBzYW1lIGluc3RhbmNlIG9mIGlucHV0IGBwcm9taXNlYCBpbnN0YW5jZS5cbiAgICAgKiAgLSBgamFgIOWFpeWKm+OBl+OBnyBgcHJvbWlzZWAg44Go5ZCM5LiA44Kk44Oz44K544K/44Oz44K544KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGFkZDxUPihwcm9taXNlOiBQcm9taXNlPFQ+LCBjYW5jZWxTb3VyY2U/OiBDYW5jZWxUb2tlblNvdXJjZSk6IFByb21pc2U8VD4ge1xuICAgICAgICB0aGlzLl9wb29sLnNldChwcm9taXNlLCBjYW5jZWxTb3VyY2UgJiYgY2FuY2VsU291cmNlLmNhbmNlbCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG5cbiAgICAgICAgY29uc3QgYWx3YXlzID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgdGhpcy5fcG9vbC5kZWxldGUocHJvbWlzZSk7XG4gICAgICAgICAgICBpZiAoY2FuY2VsU291cmNlKSB7XG4gICAgICAgICAgICAgICAgY2FuY2VsU291cmNlLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcHJvbWlzZVxuICAgICAgICAgICAgLnRoZW4oYWx3YXlzLCBhbHdheXMpO1xuXG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWxlYXNlZCBhbGwgaW5zdGFuY2VzIHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgpLnoLTmo4RcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVsZWFzZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcG9vbC5jbGVhcigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYHByb21pc2VgIGFycmF5IGZyb20gdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBriBQcm9taXNlIOOCkumFjeWIl+OBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBwcm9taXNlcygpOiBQcm9taXNlPHVua25vd24+W10ge1xuICAgICAgICByZXR1cm4gWy4uLnRoaXMuX3Bvb2wua2V5cygpXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FsbCBgUHJvbWlzZS5hbGwoKWAgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgavlr77jgZfjgaYgYFByb21pc2UuYWxsKClgXG4gICAgICovXG4gICAgcHVibGljIGFsbCgpOiBQcm9taXNlPHVua25vd25bXT4ge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FsbCBgUHJvbWlzZS5yYWNlKClgIGZvciB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44Gr5a++44GX44GmIGBQcm9taXNlLnJhY2UoKWBcbiAgICAgKi9cbiAgICBwdWJsaWMgcmFjZSgpOiBQcm9taXNlPHVua25vd24+IHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmFjZSh0aGlzLnByb21pc2VzKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYWxsIFtbd2FpdF1dKCkgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgavlr77jgZfjgaYgW1t3YWl0XV0oKVxuICAgICAqL1xuICAgIHB1YmxpYyB3YWl0KCk6IFByb21pc2U8dW5rbm93bltdPiB7XG4gICAgICAgIHJldHVybiB3YWl0KHRoaXMucHJvbWlzZXMoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbGwgYFByb21pc2UuYWxsU2V0dGxlZCgpYCBmb3IgdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBq+WvvuOBl+OBpiBgUHJvbWlzZS5hbGxTZXR0bGVkKClgXG4gICAgICovXG4gICAgcHVibGljIGFsbFNldHRsZWQoKTogUHJvbWlzZTxQcm9taXNlU2V0dGxlZFJlc3VsdDx1bmtub3duPltdPiB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbFNldHRsZWQodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW52b2tlIGBjYW5jZWxgIG1lc3NhZ2UgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50IHByb21pc2VzLlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjga4gYFByb21pc2VgIOOBq+WvvuOBl+OBpuOCreODo+ODs+OCu+ODq+OCkueZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIHJlYXNvblxuICAgICAqICAtIGBlbmAgYXJndW1lbnRzIGZvciBgY2FuY2VsU291cmNlYFxuICAgICAqICAtIGBqYWAgYGNhbmNlbFNvdXJjZWAg44Gr5rih44GV44KM44KL5byV5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIGBQcm9taXNlYCBpbnN0YW5jZSB3aGljaCB3YWl0IGJ5IHVudGlsIGNhbmNlbGxhdGlvbiBjb21wbGV0aW9uLlxuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744Or5a6M5LqG44G+44Gn5b6F5qmf44GZ44KLIFtbUHJvbWlzZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBhYm9ydDxUPihyZWFzb24/OiBUKTogUHJvbWlzZTx1bmtub3duW10+IHtcbiAgICAgICAgZm9yIChjb25zdCBjYW5jZWxlciBvZiB0aGlzLl9wb29sLnZhbHVlcygpKSB7XG4gICAgICAgICAgICBpZiAoY2FuY2VsZXIpIHtcbiAgICAgICAgICAgICAgICBjYW5jZWxlcihcbiAgICAgICAgICAgICAgICAgICAgKG51bGwgIT0gcmVhc29uKSA/IHJlYXNvbiA6IG5ldyBFcnJvcignYWJvcnQnKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHdhaXQodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG59XG4iXSwibmFtZXMiOlsiX3Rva2VucyIsInZlcmlmeSIsIkV2ZW50QnJva2VyIiwiaXNGdW5jdGlvbiIsImdldENvbmZpZyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFFQSxpQkFBd0IsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3pELGlCQUF3QixNQUFNLE1BQU0sR0FBSSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7SUF3Q3hEOzs7Ozs7SUFNTyxNQUFNLG1CQUFtQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDN0MsTUFBTSxFQUFFLEtBQUs7UUFDYixXQUFXLE1BQWlCO0tBQy9CLENBQWlCOztJQ2RsQixpQkFBaUIsTUFBTUEsU0FBTyxHQUFHLElBQUksT0FBTyxFQUFtQyxDQUFDO0lBRWhGO0lBQ0EsU0FBUyxVQUFVLENBQWMsUUFBd0I7UUFDckQsSUFBSSxDQUFDQSxTQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3hCLE1BQU0sSUFBSSxTQUFTLENBQUMsd0NBQXdDLENBQUMsQ0FBQztTQUNqRTtRQUNELE9BQU9BLFNBQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUEwQixDQUFDO0lBQzFELENBQUM7SUFFRDs7Ozs7Ozs7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LElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztTQUNoQzs7Ozs7UUFNTSxVQUFVO1lBQ2IsT0FBTyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1NBQzlDOzs7Ozs7Ozs7Ozs7UUFhTSxLQUFLLENBQUksTUFBVTtZQUN0QixLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ3hDLElBQUksUUFBUSxFQUFFO29CQUNWLFFBQVEsQ0FDSixDQUFDLElBQUksSUFBSSxNQUFNLElBQUksTUFBTSxHQUFHLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUNqRCxDQUFDO2lCQUNMO2FBQ0o7WUFDRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztTQUNoQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL3Byb21pc2UvIn0=
