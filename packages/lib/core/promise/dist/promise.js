/*!
 * @cdp/promise 0.9.5
 *   promise utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/events')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/events'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP));
}(this, (function (exports, coreUtils, events) { 'use strict';

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS5qcyIsInNvdXJjZXMiOlsiaW50ZXJuYWwudHMiLCJjYW5jZWwtdG9rZW4udHMiLCJjYW5jZWxhYmxlLXByb21pc2UudHMiLCJ1dGlscy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFdmVudEJyb2tlciwgU3Vic2NyaXB0aW9uIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgX2NhbmNlbCA9IFN5bWJvbCgnY2FuY2VsJyk7XG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgX2Nsb3NlID0gU3ltYm9sKCdjbG9zZScpO1xuXG4vKipcbiAqIEBlbiBDYW5jZWxUb2tlbiBzdGF0ZSBkZWZpbml0aW9ucy5cbiAqIEBqYSBDYW5jZWxUb2tlbiDjga7nirbmhYvlrprnvqlcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ2FuY2VsVG9rZW5TdGF0ZSB7XG4gICAgLyoqIOOCreODo+ODs+OCu+ODq+WPl+S7mOWPr+iDvSAqL1xuICAgIE9QRU4gICAgICAgID0gMHgwLFxuICAgIC8qKiDjgq3jg6Pjg7Pjgrvjg6vlj5fku5jmuIjjgb8gKi9cbiAgICBSRVFVRVNURUQgICA9IDB4MSxcbiAgICAvKiog44Kt44Oj44Oz44K744Or5Y+X5LuY5LiN5Y+vICovXG4gICAgQ0xPU0VEICAgICAgPSAweDIsXG59XG5cbi8qKlxuICogQGVuIENhbmNlbCBldmVudCBkZWZpbml0aW9ucy5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjgqTjg5njg7Pjg4jlrprnvqlcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5jZWxFdmVudDxUPiB7XG4gICAgY2FuY2VsOiBbVF07XG59XG5cbi8qKlxuICogQGVuIEludGVybmFsIENhbmNlbFRva2VuIGludGVyZmFjZS5cbiAqIEBqYSBDYW5jZWxUb2tlbiDjga7lhoXpg6jjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqlcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5jZWxUb2tlbkNvbnRleHQ8VCA9IHVua25vd24+IHtcbiAgICByZWFkb25seSBicm9rZXI6IEV2ZW50QnJva2VyPENhbmNlbEV2ZW50PFQ+PjtcbiAgICByZWFkb25seSBzdWJzY3JpcHRpb25zOiBTZXQ8U3Vic2NyaXB0aW9uPjtcbiAgICByZWFzb246IFQgfCB1bmRlZmluZWQ7XG4gICAgc3RhdHVzOiBDYW5jZWxUb2tlblN0YXRlO1xufVxuXG4vKipcbiAqIEBlbiBJbnZhbGlkIHN1YnNjcmlwdGlvbiBvYmplY3QgZGVjbGFyYXRpb24uXG4gKiBAamEg54Sh5Yq544GqIFN1YnNjcmlwdGlvbiDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGNvbnN0IGludmFsaWRTdWJzY3JpcHRpb24gPSBPYmplY3QuZnJlZXplKHtcbiAgICBlbmFibGU6IGZhbHNlLFxuICAgIHVuc3Vic2NyaWJlKCkgeyAvKiBub29wICovIH1cbn0pIGFzIFN1YnNjcmlwdGlvbjtcbiIsImltcG9ydCB7IHZlcmlmeSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudEJyb2tlciwgU3Vic2NyaXB0aW9uIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBfY2FuY2VsLFxuICAgIF9jbG9zZSxcbiAgICBDYW5jZWxUb2tlblN0YXRlLFxuICAgIENhbmNlbFRva2VuQ29udGV4dCxcbiAgICBpbnZhbGlkU3Vic2NyaXB0aW9uLFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gQ2FuY2VsbGF0aW9uIHNvdXJjZSBpbnRlcmZhY2UuXG4gKiBAamEg44Kt44Oj44Oz44K744Or566h55CG44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuY2VsVG9rZW5Tb3VyY2U8VCA9IHVua25vd24+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gW1tDYW5jZWxUb2tlbl1dIGdldHRlci5cbiAgICAgKiBAamEgW1tDYW5jZWxUb2tlbl1dIOWPluW+l1xuICAgICAqL1xuICAgIHJlYWRvbmx5IHRva2VuOiBDYW5jZWxUb2tlbjxUPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGNhbmNlbC5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVhc29uXG4gICAgICogIC0gYGVuYCBjYW5jZWxsYXRpb24gcmVhc29uLiB0aGlzIGFyZyBpcyB0cmFuc21pdHRlZCBpbiBwcm9taXNlIGNoYWluLlxuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744Or44Gu55CG55Sx44KS5oyH5a6aLiBgUHJvbWlzZWAg44OB44Kn44Kk44Oz44Gr5Lyd6YGU44GV44KM44KLLlxuICAgICAqL1xuICAgIGNhbmNlbChyZWFzb246IFQpOiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEJyZWFrIHVwIGNhbmNlbGxhdGlvbiByZWNlcHRpb24uXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+WPl+S7mOOCkue1guS6hlxuICAgICAqL1xuICAgIGNsb3NlKCk6IHZvaWQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF90b2tlbnMgPSBuZXcgV2Vha01hcDxDYW5jZWxUb2tlbiwgQ2FuY2VsVG9rZW5Db250ZXh0PigpO1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBnZXRDb250ZXh0PFQgPSB1bmtub3duPihpbnN0YW5jZTogQ2FuY2VsVG9rZW48VD4pOiBDYW5jZWxUb2tlbkNvbnRleHQ8VD4ge1xuICAgIGlmICghX3Rva2Vucy5oYXMoaW5zdGFuY2UpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBvYmplY3QgaXMgbm90IGEgdmFsaWQgQ2FuY2VsVG9rZW4uJyk7XG4gICAgfVxuICAgIHJldHVybiBfdG9rZW5zLmdldChpbnN0YW5jZSkgYXMgQ2FuY2VsVG9rZW5Db250ZXh0PFQ+O1xufVxuXG4vKipcbiAqIEBlbiBUaGUgdG9rZW4gb2JqZWN0IHRvIHdoaWNoIHVuaWZpY2F0aW9uIHByb2Nlc3NpbmcgZm9yIGFzeW5jaHJvbm91cyBwcm9jZXNzaW5nIGNhbmNlbGxhdGlvbiBpcyBvZmZlcmVkLiA8YnI+XG4gKiAgICAgT3JpZ2luIGlzIGBDYW5jZWxsYXRpb25Ub2tlbmAgb2YgYC5ORVQgRnJhbWV3b3JrYC5cbiAqIEBqYSDpnZ7lkIzmnJ/lh6bnkIbjgq3jg6Pjg7Pjgrvjg6vjga7jgZ/jgoHjga7ntbHkuIDlh6bnkIbjgpLmj5DkvpvjgZnjgovjg4jjg7zjgq/jg7Pjgqrjg5bjgrjjgqfjgq/jg4ggPGJyPlxuICogICAgIOOCquODquOCuOODiuODq+OBryBgLk5FVCBGcmFtZXdvcmtgIOOBriBgQ2FuY2VsbGF0aW9uVG9rZW5gXG4gKlxuICogQHNlZSBodHRwczovL2RvY3MubWljcm9zb2Z0LmNvbS9lbi11cy9kb3RuZXQvc3RhbmRhcmQvdGhyZWFkaW5nL2NhbmNlbGxhdGlvbi1pbi1tYW5hZ2VkLXRocmVhZHNcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbiAqIGBgYFxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgdG9rZW4gPSBuZXcgQ2FuY2VsVG9rZW4oKGNhbmNlbCwgY2xvc2UpID0+IHtcbiAqICAgYnV0dG9uMS5vbmNsaWNrID0gZXYgPT4gY2FuY2VsKG5ldyBFcnJvcignQ2FuY2VsJykpO1xuICogICBidXR0b24yLm9uY2xpY2sgPSBldiA9PiBjbG9zZSgpO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBvclxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB7IGNhbmNlbCwgY2xvc2UsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTtcbiAqIGJ1dHRvbjEub25jbGljayA9IGV2ID0+IGNhbmNlbChuZXcgRXJyb3IoJ0NhbmNlbCcpKTtcbiAqIGJ1dHRvbjIub25jbGljayA9IGV2ID0+IGNsb3NlKCk7XG4gKiBgYGBcbiAqXG4gKiAtIFVzZSB3aXRoIFByb21pc2VcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgeyBjYW5jZWwsIGNsb3NlLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7XG4gKiBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKG9rLCBuZykgPT4geyAuLi4gfSwgdG9rZW4pO1xuICogcHJvbWlzZVxuICogICAudGhlbiguLi4pXG4gKiAgIC50aGVuKC4uLilcbiAqICAgLnRoZW4oLi4uKVxuICogICAuY2F0Y2gocmVhc29uID0+IHtcbiAqICAgICAvLyBjaGVjayByZWFzb25cbiAqICAgfSk7XG4gKiBgYGBcbiAqXG4gKiAtIFJlZ2lzdGVyICYgVW5yZWdpc3RlciBjYWxsYmFjayhzKVxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB7IGNhbmNlbCwgY2xvc2UsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTtcbiAqIGNvbnN0IHN1YnNjcmlwdGlvbiA9IHRva2VuLnJlZ2lzdGVyKHJlYXNvbiA9PiB7XG4gKiAgIGNvbnNvbGUubG9nKHJlYXNvbi5tZXNzYWdlKTtcbiAqIH0pO1xuICogaWYgKHNvbWVDYXNlKSB7XG4gKiAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBDYW5jZWxUb2tlbjxUID0gdW5rbm93bj4ge1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBbW0NhbmNlbFRva2VuU291cmNlXV0gaW5zdGFuY2UuXG4gICAgICogQGphIFtbQ2FuY2VsVG9rZW5Tb3VyY2VdXSDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7lj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaW5rZWRUb2tlbnNcbiAgICAgKiAgLSBgZW5gIHJlbGF0aW5nIGFscmVhZHkgbWFkZSBbW0NhbmNlbFRva2VuXV0gaW5zdGFuY2UuXG4gICAgICogICAgICAgIFlvdSBjYW4gYXR0YWNoIHRvIHRoZSB0b2tlbiB0aGF0IHRvIGJlIGEgY2FuY2VsbGF0aW9uIHRhcmdldC5cbiAgICAgKiAgLSBgamFgIOOBmeOBp+OBq+S9nOaIkOOBleOCjOOBnyBbW0NhbmNlbFRva2VuXV0g6Zai6YCj5LuY44GR44KL5aC05ZCI44Gr5oyH5a6aXG4gICAgICogICAgICAgIOa4oeOBleOCjOOBnyB0b2tlbiDjga/jgq3jg6Pjg7Pjgrvjg6vlr77osaHjgajjgZfjgabntJDjgaXjgZHjgonjgozjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHNvdXJjZTxUID0gdW5rbm93bj4oLi4ubGlua2VkVG9rZW5zOiBDYW5jZWxUb2tlbltdKTogQ2FuY2VsVG9rZW5Tb3VyY2U8VD4ge1xuICAgICAgICBsZXQgY2FuY2VsITogKHJlYXNvbjogVCkgPT4gdm9pZDtcbiAgICAgICAgbGV0IGNsb3NlITogKCkgPT4gdm9pZDtcbiAgICAgICAgY29uc3QgdG9rZW4gPSBuZXcgQ2FuY2VsVG9rZW48VD4oKG9uQ2FuY2VsLCBvbkNsb3NlKSA9PiB7XG4gICAgICAgICAgICBjYW5jZWwgPSBvbkNhbmNlbDtcbiAgICAgICAgICAgIGNsb3NlID0gb25DbG9zZTtcbiAgICAgICAgfSwgLi4ubGlua2VkVG9rZW5zKTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5mcmVlemUoeyB0b2tlbiwgY2FuY2VsLCBjbG9zZSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGV4ZWN1dG9yXG4gICAgICogIC0gYGVuYCBleGVjdXRlciB0aGF0IGhhcyBgY2FuY2VsYCBhbmQgYGNsb3NlYCBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODqy/jgq/jg63jg7zjgrog5a6f6KGM44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGxpbmtlZFRva2Vuc1xuICAgICAqICAtIGBlbmAgcmVsYXRpbmcgYWxyZWFkeSBtYWRlIFtbQ2FuY2VsVG9rZW5dXSBpbnN0YW5jZS5cbiAgICAgKiAgICAgICAgWW91IGNhbiBhdHRhY2ggdG8gdGhlIHRva2VuIHRoYXQgdG8gYmUgYSBjYW5jZWxsYXRpb24gdGFyZ2V0LlxuICAgICAqICAtIGBqYWAg44GZ44Gn44Gr5L2c5oiQ44GV44KM44GfIFtbQ2FuY2VsVG9rZW5dXSDplqLpgKPku5jjgZHjgovloLTlkIjjgavmjIflrppcbiAgICAgKiAgICAgICAg5rih44GV44KM44GfIHRva2VuIOOBr+OCreODo+ODs+OCu+ODq+WvvuixoeOBqOOBl+OBpue0kOOBpeOBkeOCieOCjOOCi1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBleGVjdXRvcjogKGNhbmNlbDogKHJlYXNvbjogVCkgPT4gdm9pZCwgY2xvc2U6ICgpID0+IHZvaWQpID0+IHZvaWQsXG4gICAgICAgIC4uLmxpbmtlZFRva2VuczogQ2FuY2VsVG9rZW5bXVxuICAgICkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBDYW5jZWxUb2tlbiwgdGhpcyk7XG4gICAgICAgIHZlcmlmeSgndHlwZU9mJywgJ2Z1bmN0aW9uJywgZXhlY3V0b3IpO1xuXG4gICAgICAgIGNvbnN0IGxpbmtlZFRva2VuU2V0ID0gbmV3IFNldChsaW5rZWRUb2tlbnMuZmlsdGVyKHQgPT4gX3Rva2Vucy5oYXModCkpKTtcbiAgICAgICAgbGV0IHN0YXR1cyA9IENhbmNlbFRva2VuU3RhdGUuT1BFTjtcbiAgICAgICAgZm9yIChjb25zdCB0IG9mIGxpbmtlZFRva2VuU2V0KSB7XG4gICAgICAgICAgICBzdGF0dXMgfD0gZ2V0Q29udGV4dCh0KS5zdGF0dXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb250ZXh0OiBDYW5jZWxUb2tlbkNvbnRleHQ8VD4gPSB7XG4gICAgICAgICAgICBicm9rZXI6IG5ldyBFdmVudEJyb2tlcigpLFxuICAgICAgICAgICAgc3Vic2NyaXB0aW9uczogbmV3IFNldCgpLFxuICAgICAgICAgICAgcmVhc29uOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBzdGF0dXMsXG4gICAgICAgIH07XG4gICAgICAgIF90b2tlbnMuc2V0KHRoaXMsIE9iamVjdC5zZWFsKGNvbnRleHQpKTtcblxuICAgICAgICBjb25zdCBjYW5jZWwgPSB0aGlzW19jYW5jZWxdO1xuICAgICAgICBjb25zdCBjbG9zZSA9IHRoaXNbX2Nsb3NlXTtcbiAgICAgICAgaWYgKHN0YXR1cyA9PT0gQ2FuY2VsVG9rZW5TdGF0ZS5PUEVOKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHQgb2YgbGlua2VkVG9rZW5TZXQpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0LnN1YnNjcmlwdGlvbnMuYWRkKHQucmVnaXN0ZXIoY2FuY2VsLmJpbmQodGhpcykpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZ2lzdGVyKGNhbmNlbC5iaW5kKHQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4ZWN1dG9yKGNhbmNlbC5iaW5kKHRoaXMpLCBjbG9zZS5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FuY2VsbGF0aW9uIHJlYXNvbiBhY2Nlc3Nvci5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or44Gu5Y6f5Zug5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHJlYXNvbigpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIGdldENvbnRleHQodGhpcykucmVhc29uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFbmFibGUgY2FuY2VsbGF0aW9uIHN0YXRlIGFjY2Vzc29yLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vlj6/og73jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgY2FuY2VsYWJsZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIGdldENvbnRleHQodGhpcykuc3RhdHVzID09PSBDYW5jZWxUb2tlblN0YXRlLk9QRU47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbmNlbGxhdGlvbiByZXF1ZXN0ZWQgc3RhdGUgYWNjZXNzb3IuXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+OCkuWPl+OBkeS7mOOBkeOBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCByZXF1ZXN0ZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIShnZXRDb250ZXh0KHRoaXMpLnN0YXR1cyAmIENhbmNlbFRva2VuU3RhdGUuUkVRVUVTVEVEKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FuY2VsbGF0aW9uIGNsb3NlZCBzdGF0ZSBhY2Nlc3Nvci5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5Y+X5LuY44KS57WC5LqG44GX44Gm44GE44KL44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGNsb3NlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhKGdldENvbnRleHQodGhpcykuc3RhdHVzICYgQ2FuY2VsVG9rZW5TdGF0ZS5DTE9TRUQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBgdG9TdHJpbmdgIHRhZyBvdmVycmlkZS5cbiAgICAgKiBAamEgYHRvU3RyaW5nYCDjgr/jgrDjga7jgqrjg7zjg5Djg7zjg6njgqTjg4lcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6ICdDYW5jZWxUb2tlbicgeyByZXR1cm4gJ0NhbmNlbFRva2VuJzsgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIGN1c3RvbSBjYW5jZWxsYXRpb24gY2FsbGJhY2suXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+aZguOBruOCq+OCueOCv+ODoOWHpueQhuOBrueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIG9uQ2FuY2VsXG4gICAgICogIC0gYGVuYCBjYW5jZWwgb3BlcmF0aW9uIGNhbGxiYWNrXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6vjgrPjg7zjg6vjg5Djg4Pjgq9cbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYFN1YnNjcmlwdGlvbmAgaW5zdGFuY2UuXG4gICAgICogICAgICAgIFlvdSBjYW4gcmV2b2tlIGNhbmNlbGxhdGlvbiB0byBjYWxsIGB1bnN1YnNjcmliZWAgbWV0aG9kLlxuICAgICAqICAtIGBqYWAgYFN1YnNjcmlwdGlvbmAg44Kk44Oz44K544K/44Oz44K5XG4gICAgICogICAgICAgIGB1bnN1YnNjcmliZWAg44Oh44K944OD44OJ44KS5ZG844G244GT44Go44Gn44Kt44Oj44Oz44K744Or44KS54Sh5Yq544Gr44GZ44KL44GT44Go44GM5Y+v6IO9XG4gICAgICovXG4gICAgcHVibGljIHJlZ2lzdGVyKG9uQ2FuY2VsOiAocmVhc29uOiBUKSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGdldENvbnRleHQodGhpcyk7XG4gICAgICAgIGlmICghdGhpcy5jYW5jZWxhYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4gaW52YWxpZFN1YnNjcmlwdGlvbjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29udGV4dC5icm9rZXIub24oJ2NhbmNlbCcsIG9uQ2FuY2VsKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX2NhbmNlbF0ocmVhc29uOiBUKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBnZXRDb250ZXh0KHRoaXMpO1xuICAgICAgICB2ZXJpZnkoJ25vdE5pbCcsIHJlYXNvbik7XG4gICAgICAgIGlmICghdGhpcy5jYW5jZWxhYmxlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5yZWFzb24gPSByZWFzb247XG4gICAgICAgIGNvbnRleHQuc3RhdHVzIHw9IENhbmNlbFRva2VuU3RhdGUuUkVRVUVTVEVEO1xuICAgICAgICBmb3IgKGNvbnN0IHMgb2YgY29udGV4dC5zdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5icm9rZXIudHJpZ2dlcignY2FuY2VsJywgcmVhc29uKTtcbiAgICAgICAgdm9pZCBQcm9taXNlLnJlc29sdmUoKS50aGVuKCgpID0+IHRoaXNbX2Nsb3NlXSgpKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX2Nsb3NlXSgpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGdldENvbnRleHQodGhpcyk7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQuc3RhdHVzIHw9IENhbmNlbFRva2VuU3RhdGUuQ0xPU0VEO1xuICAgICAgICBmb3IgKGNvbnN0IHMgb2YgY29udGV4dC5zdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5zdWJzY3JpcHRpb25zLmNsZWFyKCk7XG4gICAgICAgIGNvbnRleHQuYnJva2VyLm9mZigpO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgbm8tZ2xvYmFsLWFzc2lnblxuICovXG5cbmltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICB2ZXJpZnksXG4gICAgZ2V0Q29uZmlnLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgQ2FuY2VsVG9rZW4gfSBmcm9tICcuL2NhbmNlbC10b2tlbic7XG5cbmRlY2xhcmUgZ2xvYmFsIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcblxuICAgIGludGVyZmFjZSBQcm9taXNlQ29uc3RydWN0b3Ige1xuICAgICAgICBuZXcgPFQ+KGV4ZWN1dG9yOiAocmVzb2x2ZTogKHZhbHVlPzogVCB8IFByb21pc2VMaWtlPFQ+KSA9PiB2b2lkLCByZWplY3Q6IChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkKSA9PiB2b2lkLCBjYW5jZWxUb2tlbj86IENhbmNlbFRva2VuIHwgbnVsbCk6IFByb21pc2U8VD47XG4gICAgICAgIHJlc29sdmU8VD4odmFsdWU/OiBUIHwgUHJvbWlzZUxpa2U8VD4sIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsKTogUHJvbWlzZTxUPjtcbiAgICB9XG5cbn1cblxuLyoqIGBOYXRpdmUgUHJvbWlzZWAgY29uc3RydWN0b3IgKi9cbmNvbnN0IE5hdGl2ZVByb21pc2UgPSBQcm9taXNlO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2NyZWF0ZSA9IFN5bWJvbCgnY3JlYXRlJyk7XG4vKiogQGludGVybmFsICovXG5jb25zdCBfdG9rZW5zID0gbmV3IFdlYWtNYXA8UHJvbWlzZTx1bmtub3duPiwgQ2FuY2VsVG9rZW4+KCk7XG5cbi8qKlxuICogQGVuIEV4dGVuZGVkIGBQcm9taXNlYCBjbGFzcyB3aGljaCBlbmFibGVkIGNhbmNlbGxhdGlvbi4gPGJyPlxuICogICAgIGBOYXRpdmUgUHJvbWlzZWAgY29uc3RydWN0b3IgaXMgb3ZlcnJpZGRlbiBieSBmcmFtZXdvcmsgZGVmYXVsdCBiZWhhdmlvdXIuXG4gKiBAamEg44Kt44Oj44Oz44K744Or44KS5Y+v6IO944Gr44GX44GfIGBQcm9taXNlYCDmi6HlvLXjgq/jg6njgrkgPGJyPlxuICogICAgIOaXouWumuOBpyBgTmF0aXZlIFByb21pc2VgIOOCkuOCquODvOODkOODvOODqeOCpOODieOBmeOCiy5cbiAqL1xuY2xhc3MgQ2FuY2VsYWJsZVByb21pc2U8VD4gZXh0ZW5kcyBOYXRpdmVQcm9taXNlPFQ+IHtcblxuICAgIC8qKlxuICAgICAqIEBlbiBPdmVycmlkaW5nIG9mIHRoZSBkZWZhdWx0IGNvbnN0cnVjdG9yIHVzZWQgZm9yIGdlbmVyYXRpb24gb2YgYW4gb2JqZWN0LlxuICAgICAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7nlJ/miJDjgavkvb/jgo/jgozjgovjg4fjg5Xjgqnjg6vjg4jjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7jgqrjg7zjg5Djg7zjg6njgqTjg4lcbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXQgW1N5bWJvbC5zcGVjaWVzXSgpOiBQcm9taXNlQ29uc3RydWN0b3IgeyByZXR1cm4gTmF0aXZlUHJvbWlzZTsgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZXMgYSBuZXcgcmVzb2x2ZWQgcHJvbWlzZSBmb3IgdGhlIHByb3ZpZGVkIHZhbHVlLlxuICAgICAqIEBqYSDmlrDopo/jgavop6PmsbrmuIjjgb8gcHJvbWlzZSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJBcbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB0aGUgdmFsdWUgdHJhbnNtaXR0ZWQgaW4gcHJvbWlzZSBjaGFpbi5cbiAgICAgKiAgLSBgamFgIGBQcm9taXNlYCDjgavkvJ3pgZTjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gY2FuY2VsVG9rZW5cbiAgICAgKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSBpbnN0YW5jZSBjcmVhdGUgZnJvbSBbW0NhbmNlbFRva2VuXV0uYHNvdXJjZSgpYC5cbiAgICAgKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXS5gc291cmNlKClgIOOCiOOCiuS9nOaIkOOBl+OBnyBbW0NhbmNlbFRva2VuXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gICAgICovXG4gICAgc3RhdGljIHJlc29sdmU8VD4odmFsdWU/OiBUIHwgUHJvbWlzZUxpa2U8VD4sIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsKTogQ2FuY2VsYWJsZVByb21pc2U8VD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlXShzdXBlci5yZXNvbHZlKHZhbHVlKSwgY2FuY2VsVG9rZW4pO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgcHJpdmF0ZSBjb25zdHJ1Y3Rpb24gKi9cbiAgICBwcml2YXRlIHN0YXRpYyBbX2NyZWF0ZV08VCwgVFJlc3VsdDEgPSBULCBUUmVzdWx0MiA9IG5ldmVyPihcbiAgICAgICAgc3JjOiBQcm9taXNlPFQ+LFxuICAgICAgICB0b2tlbj86IENhbmNlbFRva2VuIHwgbnVsbCxcbiAgICAgICAgdGhlbkFyZ3M/OiBbXG4gICAgICAgICAgICAoKHZhbHVlOiBUKSA9PiBUUmVzdWx0MSB8IFByb21pc2VMaWtlPFRSZXN1bHQxPikgfCBudWxsIHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgKChyZWFzb246IHVua25vd24pID0+IFRSZXN1bHQyIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDI+KSB8IG51bGwgfCB1bmRlZmluZWRcbiAgICAgICAgXSB8IG51bGxcbiAgICApOiBDYW5jZWxhYmxlUHJvbWlzZTxUUmVzdWx0MSB8IFRSZXN1bHQyPiB7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIE5hdGl2ZVByb21pc2UsIHNyYyk7XG5cbiAgICAgICAgbGV0IHA6IFByb21pc2U8VCB8IFRSZXN1bHQxIHwgVFJlc3VsdDI+O1xuICAgICAgICBpZiAoISh0b2tlbiBpbnN0YW5jZW9mIENhbmNlbFRva2VuKSkge1xuICAgICAgICAgICAgcCA9IHNyYztcbiAgICAgICAgfSBlbHNlIGlmICh0aGVuQXJncyAmJiAoIWlzRnVuY3Rpb24odGhlbkFyZ3NbMF0pIHx8IGlzRnVuY3Rpb24odGhlbkFyZ3NbMV0pKSkge1xuICAgICAgICAgICAgcCA9IHNyYztcbiAgICAgICAgfSBlbHNlIGlmICh0b2tlbi5jYW5jZWxhYmxlKSB7XG4gICAgICAgICAgICBsZXQgczogU3Vic2NyaXB0aW9uO1xuICAgICAgICAgICAgcCA9IG5ldyBOYXRpdmVQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBzID0gdG9rZW4ucmVnaXN0ZXIocmVqZWN0KTtcbiAgICAgICAgICAgICAgICBzdXBlci5wcm90b3R5cGUudGhlbi5jYWxsKHNyYywgcmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3QgZGlzcG9zZSA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgX3Rva2Vucy5kZWxldGUocCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcC50aGVuKGRpc3Bvc2UsIGRpc3Bvc2UpO1xuICAgICAgICB9IGVsc2UgaWYgKHRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgcCA9IHN1cGVyLnJlamVjdCh0b2tlbi5yZWFzb24pO1xuICAgICAgICB9IGVsc2UgaWYgKHRva2VuLmNsb3NlZCkge1xuICAgICAgICAgICAgcCA9IHNyYztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5leHBlY3RlZCBFeGNlcHRpb24nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGVuQXJncykge1xuICAgICAgICAgICAgcCA9IHN1cGVyLnByb3RvdHlwZS50aGVuLmFwcGx5KHAsIHRoZW5BcmdzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodG9rZW4gJiYgdG9rZW4uY2FuY2VsYWJsZSkge1xuICAgICAgICAgICAgX3Rva2Vucy5zZXQocCwgdG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgcCBpbnN0YW5jZW9mIHRoaXMgfHwgT2JqZWN0LnNldFByb3RvdHlwZU9mKHAsIHRoaXMucHJvdG90eXBlKTtcblxuICAgICAgICByZXR1cm4gcCBhcyBDYW5jZWxhYmxlUHJvbWlzZTxUUmVzdWx0MSB8IFRSZXN1bHQyPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGV4ZWN1dG9yXG4gICAgICogIC0gYGVuYCBBIGNhbGxiYWNrIHVzZWQgdG8gaW5pdGlhbGl6ZSB0aGUgcHJvbWlzZS4gVGhpcyBjYWxsYmFjayBpcyBwYXNzZWQgdHdvIGFyZ3VtZW50cyBgcmVzb2x2ZWAgYW5kIGByZWplY3RgLlxuICAgICAqICAtIGBqYWAgcHJvbWlzZSDjga7liJ3mnJ/ljJbjgavkvb/nlKjjgZnjgovjgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrpouIGByZXNvbHZlYCDjgaggYHJlamVjdGAg44GuMuOBpOOBruW8leaVsOOCkuaMgeOBpFxuICAgICAqIEBwYXJhbSBjYW5jZWxUb2tlblxuICAgICAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIGluc3RhbmNlIGNyZWF0ZSBmcm9tIFtbQ2FuY2VsVG9rZW5dXS5gc291cmNlKClgLlxuICAgICAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dLmBzb3VyY2UoKWAg44KI44KK5L2c5oiQ44GX44GfIFtbQ2FuY2VsVG9rZW5dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgZXhlY3V0b3I6IChyZXNvbHZlOiAodmFsdWU/OiBUIHwgUHJvbWlzZUxpa2U8VD4pID0+IHZvaWQsIHJlamVjdDogKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQpID0+IHZvaWQsXG4gICAgICAgIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsXG4gICAgKSB7XG4gICAgICAgIHN1cGVyKGV4ZWN1dG9yKTtcbiAgICAgICAgcmV0dXJuIENhbmNlbGFibGVQcm9taXNlW19jcmVhdGVdKHRoaXMsIGNhbmNlbFRva2VuKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBjYWxsYmFja3MgZm9yIHRoZSByZXNvbHV0aW9uIGFuZC9vciByZWplY3Rpb24gb2YgdGhlIFByb21pc2UuXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvbmZ1bGZpbGxlZCBUaGUgY2FsbGJhY2sgdG8gZXhlY3V0ZSB3aGVuIHRoZSBQcm9taXNlIGlzIHJlc29sdmVkLlxuICAgICAqIEBwYXJhbSBvbnJlamVjdGVkIFRoZSBjYWxsYmFjayB0byBleGVjdXRlIHdoZW4gdGhlIFByb21pc2UgaXMgcmVqZWN0ZWQuXG4gICAgICogQHJldHVybnMgQSBQcm9taXNlIGZvciB0aGUgY29tcGxldGlvbiBvZiB3aGljaCBldmVyIGNhbGxiYWNrIGlzIGV4ZWN1dGVkLlxuICAgICAqL1xuICAgIHRoZW48VFJlc3VsdDEgPSBULCBUUmVzdWx0MiA9IG5ldmVyPihcbiAgICAgICAgb25mdWxmaWxsZWQ/OiAoKHZhbHVlOiBUKSA9PiBUUmVzdWx0MSB8IFByb21pc2VMaWtlPFRSZXN1bHQxPikgfCBudWxsLFxuICAgICAgICBvbnJlamVjdGVkPzogKChyZWFzb246IHVua25vd24pID0+IFRSZXN1bHQyIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDI+KSB8IG51bGxcbiAgICApOiBQcm9taXNlPFRSZXN1bHQxIHwgVFJlc3VsdDI+IHtcbiAgICAgICAgcmV0dXJuIENhbmNlbGFibGVQcm9taXNlW19jcmVhdGVdKHRoaXMsIF90b2tlbnMuZ2V0KHRoaXMpLCBbb25mdWxmaWxsZWQsIG9ucmVqZWN0ZWRdKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBhIGNhbGxiYWNrIGZvciBvbmx5IHRoZSByZWplY3Rpb24gb2YgdGhlIFByb21pc2UuXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvbnJlamVjdGVkIFRoZSBjYWxsYmFjayB0byBleGVjdXRlIHdoZW4gdGhlIFByb21pc2UgaXMgcmVqZWN0ZWQuXG4gICAgICogQHJldHVybnMgQSBQcm9taXNlIGZvciB0aGUgY29tcGxldGlvbiBvZiB0aGUgY2FsbGJhY2suXG4gICAgICovXG4gICAgY2F0Y2g8VFJlc3VsdDIgPSBuZXZlcj4ob25yZWplY3RlZD86ICgocmVhc29uOiB1bmtub3duKSA9PiBUUmVzdWx0MiB8IFByb21pc2VMaWtlPFRSZXN1bHQyPikgfCBudWxsKTogUHJvbWlzZTxUIHwgVFJlc3VsdDI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGhlbih1bmRlZmluZWQsIG9ucmVqZWN0ZWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGEgY2FsbGJhY2sgdGhhdCBpcyBpbnZva2VkIHdoZW4gdGhlIFByb21pc2UgaXMgc2V0dGxlZCAoZnVsZmlsbGVkIG9yIHJlamVjdGVkKS4gPGJyPlxuICAgICAqIFRoZSByZXNvbHZlZCB2YWx1ZSBjYW5ub3QgYmUgbW9kaWZpZWQgZnJvbSB0aGUgY2FsbGJhY2suXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvbmZpbmFsbHkgVGhlIGNhbGxiYWNrIHRvIGV4ZWN1dGUgd2hlbiB0aGUgUHJvbWlzZSBpcyBzZXR0bGVkIChmdWxmaWxsZWQgb3IgcmVqZWN0ZWQpLlxuICAgICAqIEByZXR1cm5zIEEgUHJvbWlzZSBmb3IgdGhlIGNvbXBsZXRpb24gb2YgdGhlIGNhbGxiYWNrLlxuICAgICAqL1xuICAgIGZpbmFsbHkob25maW5hbGx5PzogKCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkIHwgbnVsbCk6IFByb21pc2U8VD4ge1xuICAgICAgICByZXR1cm4gQ2FuY2VsYWJsZVByb21pc2VbX2NyZWF0ZV0oc3VwZXIuZmluYWxseShvbmZpbmFsbHkpLCBfdG9rZW5zLmdldCh0aGlzKSk7XG4gICAgfVxuXG59XG5cbi8qKlxuICogQGVuIFN3aXRjaCB0aGUgZ2xvYmFsIGBQcm9taXNlYCBjb25zdHJ1Y3RvciBgTmF0aXZlIFByb21pc2VgIG9yIFtbQ2FuY2VsYWJsZVByb21pc2VdXS4gPGJyPlxuICogICAgIGBOYXRpdmUgUHJvbWlzZWAgY29uc3RydWN0b3IgaXMgb3ZlcnJpZGRlbiBieSBmcmFtZXdvcmsgZGVmYXVsdCBiZWhhdmlvdXIuXG4gKiBAamEg44Kw44Ot44O844OQ44OrIGBQcm9taXNlYCDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jgpIgYE5hdGl2ZSBQcm9taXNlYCDjgb7jgZ/jga8gW1tDYW5jZWxhYmxlUHJvbWlzZV1dIOOBq+WIh+OCiuabv+OBiCA8YnI+XG4gKiAgICAg5pei5a6a44GnIGBOYXRpdmUgUHJvbWlzZWAg44KS44Kq44O844OQ44O844Op44Kk44OJ44GZ44KLLlxuICpcbiAqIEBwYXJhbSBlbmFibGVcbiAqICAtIGBlbmAgYHRydWVgOiB1c2UgW1tDYW5jZWxhYmxlUHJvbWlzZV1dIC8gIGBmYWxzZWA6IHVzZSBgTmF0aXZlIFByb21pc2VgXG4gKiAgLSBgamFgIGB0cnVlYDogW1tDYW5jZWxhYmxlUHJvbWlzZV1dIOOCkuS9v+eUqCAvIGBmYWxzZWA6IGBOYXRpdmUgUHJvbWlzZWAg44KS5L2/55SoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRlbmRQcm9taXNlKGVuYWJsZTogYm9vbGVhbik6IFByb21pc2VDb25zdHJ1Y3RvciB7XG4gICAgaWYgKGVuYWJsZSkge1xuICAgICAgICBQcm9taXNlID0gQ2FuY2VsYWJsZVByb21pc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgUHJvbWlzZSA9IE5hdGl2ZVByb21pc2U7XG4gICAgfVxuICAgIHJldHVybiBQcm9taXNlO1xufVxuXG4vKiogQGludGVybmFsIGdsb2JhbCBjb25maWcgb3B0aW9ucyAqL1xuaW50ZXJmYWNlIEdsb2JhbENvbmZpZyB7XG4gICAgbm9BdXRvbWF0aWNOYXRpdmVFeHRlbmQ6IGJvb2xlYW47XG59XG5cbi8vIGRlZmF1bHQ6IGF1dG9tYXRpYyBuYXRpdmUgcHJvbWlzZSBvdmVycmlkZS5cbmV4dGVuZFByb21pc2UoIWdldENvbmZpZzxHbG9iYWxDb25maWc+KCkubm9BdXRvbWF0aWNOYXRpdmVFeHRlbmQpO1xuXG5leHBvcnQge1xuICAgIENhbmNlbGFibGVQcm9taXNlLFxuICAgIENhbmNlbGFibGVQcm9taXNlIGFzIFByb21pc2UsXG59O1xuIiwiaW1wb3J0IHsgQ2FuY2VsVG9rZW4sIENhbmNlbFRva2VuU291cmNlIH0gZnJvbSAnLi9jYW5jZWwtdG9rZW4nO1xuXG4vKipcbiAqIEBlbiBDYW5jZWxhYmxlIGJhc2Ugb3B0aW9uIGRlZmluaXRpb24uXG4gKiBAamEg44Kt44Oj44Oz44K744Or5Y+v6IO944Gq5Z+65bqV44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuY2VsYWJsZSB7XG4gICAgY2FuY2VsPzogQ2FuY2VsVG9rZW47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBXYWl0IGZvciBwcm9taXNlcyBkb25lLiA8YnI+XG4gKiAgICAgV2hpbGUgY29udHJvbCB3aWxsIGJlIHJldHVybmVkIGltbWVkaWF0ZWx5IHdoZW4gYFByb21pc2UuYWxsKClgIGZhaWxzLCBidXQgdGhpcyBtZWh0b2Qgd2FpdHMgZm9yIGluY2x1ZGluZyBmYWlsdXJlLlxuICogQGphIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4jjga7ntYLkuobjgb7jgaflvoXmqZ8gPGJyPlxuICogICAgIGBQcm9taXNlLmFsbCgpYCDjga/lpLHmlZfjgZnjgovjgajjgZnjgZDjgavliLblvqHjgpLov5TjgZnjga7jgavlr77jgZfjgIHlpLHmlZfjgoLlkKvjgoHjgablvoXjgaQgYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICpcbiAqIEBwYXJhbSBwcm9taXNlc1xuICogIC0gYGVuYCBQcm9taXNlIGluc3RhbmNlIGFycmF5XG4gKiAgLSBgamFgIFByb21pc2Ug44Kk44Oz44K544K/44Oz44K544Gu6YWN5YiX44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3YWl0KHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10pOiBQcm9taXNlPHVua25vd25bXT4ge1xuICAgIGNvbnN0IHNhZmVQcm9taXNlcyA9IHByb21pc2VzLm1hcCgocHJvbWlzZSkgPT4gcHJvbWlzZS5jYXRjaCgoZSkgPT4gZSkpO1xuICAgIHJldHVybiBQcm9taXNlLmFsbChzYWZlUHJvbWlzZXMpO1xufVxuXG4vKipcbiAqIEBlbiBDYW5jZWxsYXRpb24gY2hlY2tlciBtZXRob2QuIDxicj5cbiAqICAgICBJdCdzIHByYWN0aWNhYmxlIGJ5IGBhc3luYyBmdW5jdGlvbmAuXG4gKiBAamEg44Kt44Oj44Oz44K744Or44OB44Kn44OD44Kr44O8IDxicj5cbiAqICAgICBgYXN5bmMgZnVuY3Rpb25gIOOBp+S9v+eUqOWPr+iDvVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogIGFzeW5jIGZ1bmN0aW9uIHNvbWVGdW5jKHRva2VuOiBDYW5jZWxUb2tlbik6IFByb21pc2U8e30+IHtcbiAqICAgIGF3YWl0IGNoZWNrQ2FuY2VsZWQodG9rZW4pO1xuICogICAgcmV0dXJuIHt9O1xuICogIH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tDYW5jZWxlZCh0b2tlbjogQ2FuY2VsVG9rZW4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHVuZGVmaW5lZCwgdG9rZW4pO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIG1hbmFnZXMgbHVtcGluZyBtdWx0aXBsZSBgUHJvbWlzZWAgb2JqZWN0cy4gPGJyPlxuICogICAgIEl0J3MgcG9zc2libGUgdG8gbWFrZSB0aGVtIGNhbmNlbCBtb3JlIHRoYW4gb25lIGBQcm9taXNlYCB3aGljaCBoYW5kbGVzIGRpZmZlcmVudCBbW0NhbmNlbFRva2VuXV0gYnkgbHVtcGluZy5cbiAqIEBqYSDopIfmlbAgYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiOOCkuS4gOaLrOeuoeeQhuOBmeOCi+OCr+ODqeOCuSA8YnI+XG4gKiAgICAg55Ww44Gq44KLIFtbQ2FuY2VsVG9rZW5dXSDjgpLmibHjgYbopIfmlbDjga4gYFByb21pc2VgIOOCkuS4gOaLrOOBp+OCreODo+ODs+OCu+ODq+OBleOBm+OCi+OBk+OBqOOBjOWPr+iDvVxuICovXG5leHBvcnQgY2xhc3MgUHJvbWlzZU1hbmFnZXIge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBmdW5jLWNhbGwtc3BhY2luZ1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Bvb2wgPSBuZXcgTWFwPFByb21pc2U8dW5rbm93bj4sICgocmVhc29uOiB1bmtub3duKSA9PiB1bmtub3duKSB8IHVuZGVmaW5lZD4oKTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgYSBgUHJvbWlzZWAgb2JqZWN0IHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OI44KS566h55CG5LiL44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvbWlzZVxuICAgICAqICAtIGBlbmAgYW55IGBQcm9taXNlYCBpbnN0YW5jZSBpcyBhdmFpbGFibGUuXG4gICAgICogIC0gYGphYCDku7vmhI/jga4gYFByb21pc2VgIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEBwYXJhbSBjYW5jZWxTb3VyY2VcbiAgICAgKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5Tb3VyY2VdXSBpbnN0YW5jZSBtYWRlIGJ5IGBDYW5jZWxUb2tlbi5zb3VyY2UoKWAuXG4gICAgICogIC0gYGphYCBgQ2FuY2VsVG9rZW4uc291cmNlKClgIOOBp+eUn+aIkOOBleOCjOOCiyBbW0NhbmNlbFRva2VuU291cmNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJldHVybiB0aGUgc2FtZSBpbnN0YW5jZSBvZiBpbnB1dCBgcHJvbWlzZWAgaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDlhaXlipvjgZfjgZ8gYHByb21pc2VgIOOBqOWQjOS4gOOCpOODs+OCueOCv+ODs+OCueOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBhZGQ8VD4ocHJvbWlzZTogUHJvbWlzZTxUPiwgY2FuY2VsU291cmNlPzogQ2FuY2VsVG9rZW5Tb3VyY2UpOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgdGhpcy5fcG9vbC5zZXQocHJvbWlzZSwgY2FuY2VsU291cmNlICYmIGNhbmNlbFNvdXJjZS5jYW5jZWwpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuXG4gICAgICAgIGNvbnN0IGFsd2F5cyA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3Bvb2wuZGVsZXRlKHByb21pc2UpO1xuICAgICAgICAgICAgaWYgKGNhbmNlbFNvdXJjZSkge1xuICAgICAgICAgICAgICAgIGNhbmNlbFNvdXJjZS5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHByb21pc2VcbiAgICAgICAgICAgIC50aGVuKGFsd2F5cywgYWx3YXlzKTtcblxuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVsZWFzZWQgYWxsIGluc3RhbmNlcyB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44KS56C05qOEXG4gICAgICovXG4gICAgcHVibGljIHJlbGVhc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Bvb2wuY2xlYXIoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGBwcm9taXNlYCBhcnJheSBmcm9tIHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjga4gUHJvbWlzZSDjgpLphY3liJfjgaflj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJvbWlzZXMoKTogUHJvbWlzZTx1bmtub3duPltdIHtcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzLl9wb29sLmtleXMoKV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbGwgYFByb21pc2UuYWxsKClgIGZvciB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44Gr5a++44GX44GmIGBQcm9taXNlLmFsbCgpYFxuICAgICAqL1xuICAgIHB1YmxpYyBhbGwoKTogUHJvbWlzZTx1bmtub3duW10+IHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHRoaXMucHJvbWlzZXMoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbGwgYFByb21pc2UucmFjZSgpYCBmb3IgdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBq+WvvuOBl+OBpiBgUHJvbWlzZS5yYWNlKClgXG4gICAgICovXG4gICAgcHVibGljIHJhY2UoKTogUHJvbWlzZTx1bmtub3duPiB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJhY2UodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FsbCBbW3dhaXRdXSgpIGZvciB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44Gr5a++44GX44GmIFtbd2FpdF1dKClcbiAgICAgKi9cbiAgICBwdWJsaWMgd2FpdCgpOiBQcm9taXNlPHVua25vd25bXT4ge1xuICAgICAgICByZXR1cm4gd2FpdCh0aGlzLnByb21pc2VzKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnZva2UgYGNhbmNlbGAgbWVzc2FnZSBmb3IgdW5kZXIgdGhlIG1hbmFnZW1lbnQgcHJvbWlzZXMuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBriBgUHJvbWlzZWAg44Gr5a++44GX44Gm44Kt44Oj44Oz44K744Or44KS55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVhc29uXG4gICAgICogIC0gYGVuYCBhcmd1bWVudHMgZm9yIGBjYW5jZWxTb3VyY2VgXG4gICAgICogIC0gYGphYCBgY2FuY2VsU291cmNlYCDjgavmuKHjgZXjgozjgovlvJXmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYFByb21pc2VgIGluc3RhbmNlIHdoaWNoIHdhaXQgYnkgdW50aWwgY2FuY2VsbGF0aW9uIGNvbXBsZXRpb24uXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6vlrozkuobjgb7jgaflvoXmqZ/jgZnjgosgW1tQcm9taXNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGFib3J0PFQ+KHJlYXNvbj86IFQpOiBQcm9taXNlPHVua25vd25bXT4ge1xuICAgICAgICBmb3IgKGNvbnN0IGNhbmNlbGVyIG9mIHRoaXMuX3Bvb2wudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIGlmIChjYW5jZWxlcikge1xuICAgICAgICAgICAgICAgIGNhbmNlbGVyKFxuICAgICAgICAgICAgICAgICAgICAobnVsbCAhPSByZWFzb24pID8gcmVhc29uIDogbmV3IEVycm9yKCdhYm9ydCcpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd2FpdCh0aGlzLnByb21pc2VzKCkpO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJ2ZXJpZnkiLCJFdmVudEJyb2tlciIsIl90b2tlbnMiLCJpc0Z1bmN0aW9uIiwiZ2V0Q29uZmlnIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUVBO0lBQ08sTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3hDO0lBQ08sTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBd0N0Qzs7Ozs7O0lBTU8sTUFBTSxtQkFBbUIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQzdDLE1BQU0sRUFBRSxLQUFLO1FBQ2IsV0FBVyxNQUFpQjtLQUMvQixDQUFpQjs7SUNoQmxCO0lBQ0EsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLEVBQW1DLENBQUM7SUFFL0Q7SUFDQSxTQUFTLFVBQVUsQ0FBYyxRQUF3QjtRQUNyRCxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUN4QixNQUFNLElBQUksU0FBUyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7U0FDakU7UUFDRCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUEwQixDQUFDO0lBQzFELENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O1VBeURhLFdBQVc7Ozs7Ozs7Ozs7O1FBWWIsT0FBTyxNQUFNLENBQWMsR0FBRyxZQUEyQjtZQUM1RCxJQUFJLE1BQTRCLENBQUM7WUFDakMsSUFBSSxLQUFrQixDQUFDO1lBQ3ZCLE1BQU0sS0FBSyxHQUFHLElBQUksV0FBVyxDQUFJLENBQUMsUUFBUSxFQUFFLE9BQU87Z0JBQy9DLE1BQU0sR0FBRyxRQUFRLENBQUM7Z0JBQ2xCLEtBQUssR0FBRyxPQUFPLENBQUM7YUFDbkIsRUFBRSxHQUFHLFlBQVksQ0FBQyxDQUFDO1lBQ3BCLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFN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
