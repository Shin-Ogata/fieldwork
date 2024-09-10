/*!
 * @cdp/promise 0.9.18
 *   promise utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/events')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/events'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP));
})(this, (function (exports, coreUtils, events) { 'use strict';

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
     * import { CancelToken } from '@cdp/runtime';
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
         * @en Create {@link CancelTokenSource} instance.
         * @ja {@link CancelTokenSource} インスタンスの取得
         *
         * @param linkedTokens
         *  - `en` relating already made {@link CancelToken} instance.
         *        You can attach to the token that to be a cancellation target.
         *  - `ja` すでに作成された {@link CancelToken} 関連付ける場合に指定
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
         *  - `en` relating already made {@link CancelToken} instance.
         *        You can attach to the token that to be a cancellation target.
         *  - `ja` すでに作成された {@link CancelToken} 関連付ける場合に指定
         *        渡された token はキャンセル対象として紐づけられる
         */
        constructor(executor, ...linkedTokens) {
            coreUtils.verify('instanceOf', CancelToken, this);
            coreUtils.verify('typeOf', 'function', executor);
            const linkedTokenSet = new Set(linkedTokens.filter(t => _tokens$1.has(t)));
            let status = 0 /* CancelTokenState.OPEN */;
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
            if (status === 0 /* CancelTokenState.OPEN */) {
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
            return getContext(this).status === 0 /* CancelTokenState.OPEN */;
        }
        /**
         * @en Cancellation requested state accessor.
         * @ja キャンセルを受け付けているか判定
         */
        get requested() {
            return !!(getContext(this).status & 1 /* CancelTokenState.REQUESTED */);
        }
        /**
         * @en Cancellation closed state accessor.
         * @ja キャンセル受付を終了しているか判定
         */
        get closed() {
            return !!(getContext(this).status & 2 /* CancelTokenState.CLOSED */);
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
            coreUtils.verify('notNullish', reason);
            if (!this.cancelable) {
                return;
            }
            context.reason = reason;
            context.status |= 1 /* CancelTokenState.REQUESTED */;
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
            context.status |= 2 /* CancelTokenState.CLOSED */;
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
    /**
     * @en `Native Promise` constructor <br>
     *     Can be used as an alias for `Native Promise`.
     * @ja `Native Promise` コンストラクタ <br>
     *     `Native Promise` のエイリアスとして使用可能
     */
    const NativePromise = Promise;
    /** @internal */ const nativeThen = NativePromise.prototype.then;
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
         *  - `en` {@link CancelToken} instance create from {@link CancelToken.source | CancelToken.source}().
         *  - `ja` {@link CancelToken.source | CancelToken.source}() より作成した {@link CancelToken} インスタンスを指定
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
            if (token?.cancelable) {
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
         *  - `en` {@link CancelToken} instance create from {@link CancelToken.source | CancelToken.source}().
         *  - `ja` {@link CancelToken.source | CancelToken.source}() より作成した {@link CancelToken} インスタンスを指定
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
     * @en Switch the global `Promise` constructor `Native Promise` or {@link CancelablePromise}. <br>
     *     `Native Promise` constructor is overridden by framework default behaviour.
     * @ja グローバル `Promise` コンストラクタを `Native Promise` または {@link CancelablePromise} に切り替え <br>
     *     既定で `Native Promise` をオーバーライドする.
     *
     * @param enable
     *  - `en` `true`: use {@link CancelablePromise} /  `false`: use `Native Promise`
     *  - `ja` `true`: {@link CancelablePromise} を使用 / `false`: `Native Promise` を使用
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
     *  - `en` {@link CancelToken} reference. (enable `undefined`)
     *  - `ja` {@link CancelToken} を指定 (undefined 可)
     */
    function checkCanceled(token) {
        return Promise.resolve(undefined, token);
    }
    /**
     * @en Check the status of the promise instance. <br>
     *     It's practicable by `async function`.
     * @ja Promise インスタンスの状態を確認 <br>
     *     `async function` で使用可能
     *
     * @example <br>
     *
     * ```ts
     * import { checkStatus } from '@cdp/runtime';
     *
     * let promise: Promise<unknown>; // some promise instance
     * :
     * const status = await checkStatus(promise);
     * console.log(status);
     * // 'pending' or 'fulfilled' or 'rejected'
     * ```
     *
     * @param promise
     *  - `en` Promise instance
     *  - `ja` Promise インスタンスを指定
     */
    function checkStatus(promise) {
        const pending = {};
        /*
         * Promise 派生クラスでも使用するためには, `instance.constructor.race` でアクセスする必要がある
         * promise が派生クラスである場合, Promise.race() を使用すると必ず `pending` object が返されてしまう
         */
        return promise.constructor.race([promise, pending])
            .then(v => (v === pending) ? 'pending' : 'fulfilled', () => 'rejected');
    }

    /**
     * @internal
     * Promise のクラス拡張は then chain を適切に管理するための作法が存在し、基本的には以下の3つの方針がある
     * - 1. executor を引数にとる constructor を提供する
     * - 2. static get [Symbol.species]() { return NativePromise; } を提供する
     * - 3. Deferred.prototype.constructor = NativePromise のように prototype.constructor を上書きする (Hacking)
     *
     * `Deferred` クラスでは以下の理由により, `1`, `2` の対応を行う.
     * - checkStatus() を Promise 派生クラスでも使用するためには, `instance.constructor.race` でアクセスする必要がある
     *   - `TypeError: Promise resolve or reject function is not callable` 対策のための `1`
     * - `then`, `catch`, `finaly` 時に生成されるインスタンスは `Deferred` である必要は無いため `2`
     *
     * @see https://stackoverflow.com/questions/48158730/extend-javascript-promise-and-resolve-or-reject-it-inside-constructor
     */
    const resolveArgs = (arg1, arg2) => {
        if (coreUtils.isFunction(arg1)) {
            return [arg1, arg2];
        }
        else {
            return [coreUtils.noop, arg1];
        }
    };
    /**
     * @en `Deferred` object class that can operate `reject` and` resolve` from the outside.
     * @ja `reject`, ` resolve` を外部より操作可能な `Deferred` オブジェクトクラス
     *
     * @example <br>
     *
     * ```ts
     * const df = new Deferred();
     * df.resolve();
     * df.reject('reason');
     *
     * await df;
     * ```
     */
    class Deferred extends CancelablePromise {
        resolve;
        reject;
        constructor(arg1, arg2) {
            const [executor, cancelToken] = resolveArgs(arg1, arg2);
            const publications = {};
            super((resolve, reject) => {
                Object.assign(publications, { resolve, reject });
                executor(resolve, reject);
            }, cancelToken);
            Object.assign(this, publications); // eslint-disable-line @typescript-eslint/no-floating-promises
        }
        /**
         * @en Check the status of this instance. <br>
         *     It's practicable by `async function`.
         * @ja Deferred インスタンスの状態を確認 <br>
         *     `async function` で使用可能
         */
        status() {
            return checkStatus(this);
        }
        /** @internal */
        get [Symbol.toStringTag]() { return 'Deferred'; }
        /** @internal */
        static get [Symbol.species]() { return NativePromise; }
    }

    /**
     * @en The class manages lumping multiple `Promise` objects. <br>
     *     It's possible to make them cancel more than one `Promise` which handles different {@link CancelToken} by lumping.
     * @ja 複数 `Promise` オブジェクトを一括管理するクラス <br>
     *     異なる {@link CancelToken} を扱う複数の `Promise` を一括でキャンセルさせることが可能
     */
    class PromiseManager {
        _pool = new Map();
        /**
         * @en Add a `Promise` object under the management.
         * @ja `Promise` オブジェクトを管理下に追加
         *
         * @param promise
         *  - `en` any `Promise` instance is available.
         *  - `ja` 任意の `Promise` インスタンス
         * @param cancelSource
         *  - `en` {@link CancelTokenSource} instance made by {@link CancelToken.source | CancelToken.source}().
         *  - `ja` {@link CancelToken.source | CancelToken.source}() で生成される {@link CancelTokenSource} インスタンス
         * @returns
         *  - `en` return the same instance of input `promise` instance.
         *  - `ja` 入力した `promise` と同一インスタンスを返却
         */
        add(promise, cancelSource) {
            this._pool.set(promise, cancelSource?.cancel); // eslint-disable-line @typescript-eslint/unbound-method
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
         * @en Call `Promise.all()` for under the management. <br>
         *     Wait for all `fulfilled`.
         * @ja 管理対象に対して `Promise.all()` <br>
         *     すべてが `fulfilled` になるまで待機
         */
        all() {
            return Promise.all(this.promises());
        }
        /**
         * @en Call `Promise.race()` for under the management. <br>
         *     Wait for any `settled`.
         * @ja 管理対象に対して `Promise.race()` <br>
         *     いずれかが `settled` になるまで待機
         */
        race() {
            return Promise.race(this.promises());
        }
        /**
         * @en Call {@link wait}() for under the management. <br>
         *     Wait for all `settled`. (simplified version)
         * @ja 管理対象に対して {@link wait}() <br>
         *     すべてが `settled` になるまで待機 (簡易バージョン)
         */
        wait() {
            return wait(this.promises());
        }
        /**
         * @en Call `Promise.allSettled()` for under the management. <br>
         *     Wait for all `settled`.
         * @ja 管理対象に対して `Promise.allSettled()` <br>
         *     すべてが `settled` になるまで待機
         */
        allSettled() {
            return Promise.allSettled(this.promises());
        }
        /**
         * @en Call `Promise.any()` for under the management. <br>
         *     Wait for any `fulfilled`.
         * @ja 管理対象に対して `Promise.any()` <br>
         *     いずれかが `fulfilled` になるまで待機
         */
        any() {
            return Promise.any(this.promises());
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
         *  - `ja` キャンセル完了まで待機する `Promise` インスタンス
         */
        abort(reason) {
            for (const canceler of this._pool.values()) {
                if (canceler) {
                    canceler(reason ?? new Error('abort'));
                }
            }
            return wait(this.promises());
        }
    }

    exports.CancelToken = CancelToken;
    exports.CancelablePromise = CancelablePromise;
    exports.Deferred = Deferred;
    exports.NativePromise = NativePromise;
    exports.Promise = CancelablePromise;
    exports.PromiseManager = PromiseManager;
    exports.checkCanceled = checkCanceled;
    exports.checkStatus = checkStatus;
    exports.extendPromise = extendPromise;
    exports.wait = wait;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS5qcyIsInNvdXJjZXMiOlsiaW50ZXJuYWwudHMiLCJjYW5jZWwtdG9rZW4udHMiLCJjYW5jZWxhYmxlLXByb21pc2UudHMiLCJ1dGlscy50cyIsImRlZmVycmVkLnRzIiwicHJvbWlzZS1tYW5hZ2VyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEV2ZW50QnJva2VyLCBTdWJzY3JpcHRpb24gfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IF9jYW5jZWwgPSBTeW1ib2woJ2NhbmNlbCcpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgX2Nsb3NlICA9IFN5bWJvbCgnY2xvc2UnKTtcblxuLyoqXG4gKiBAZW4gQ2FuY2VsVG9rZW4gc3RhdGUgZGVmaW5pdGlvbnMuXG4gKiBAamEgQ2FuY2VsVG9rZW4g44Gu54q25oWL5a6a576pXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIENhbmNlbFRva2VuU3RhdGUge1xuICAgIC8qKiDjgq3jg6Pjg7Pjgrvjg6vlj5fku5jlj6/og70gKi9cbiAgICBPUEVOICAgICAgICA9IDB4MCxcbiAgICAvKiog44Kt44Oj44Oz44K744Or5Y+X5LuY5riI44G/ICovXG4gICAgUkVRVUVTVEVEICAgPSAweDEsXG4gICAgLyoqIOOCreODo+ODs+OCu+ODq+WPl+S7mOS4jeWPryAqL1xuICAgIENMT1NFRCAgICAgID0gMHgyLFxufVxuXG4vKipcbiAqIEBlbiBDYW5jZWwgZXZlbnQgZGVmaW5pdGlvbnMuXG4gKiBAamEg44Kt44Oj44Oz44K744Or44Kk44OZ44Oz44OI5a6a576pXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuY2VsRXZlbnQ8VD4ge1xuICAgIGNhbmNlbDogW1RdO1xufVxuXG4vKipcbiAqIEBlbiBJbnRlcm5hbCBDYW5jZWxUb2tlbiBpbnRlcmZhY2UuXG4gKiBAamEgQ2FuY2VsVG9rZW4g44Gu5YaF6YOo44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuY2VsVG9rZW5Db250ZXh0PFQgPSB1bmtub3duPiB7XG4gICAgcmVhZG9ubHkgYnJva2VyOiBFdmVudEJyb2tlcjxDYW5jZWxFdmVudDxUPj47XG4gICAgcmVhZG9ubHkgc3Vic2NyaXB0aW9uczogU2V0PFN1YnNjcmlwdGlvbj47XG4gICAgcmVhc29uOiBUIHwgdW5kZWZpbmVkO1xuICAgIHN0YXR1czogQ2FuY2VsVG9rZW5TdGF0ZTtcbn1cblxuLyoqXG4gKiBAZW4gSW52YWxpZCBzdWJzY3JpcHRpb24gb2JqZWN0IGRlY2xhcmF0aW9uLlxuICogQGphIOeEoeWKueOBqiBTdWJzY3JpcHRpb24g44Kq44OW44K444Kn44Kv44OIXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBjb25zdCBpbnZhbGlkU3Vic2NyaXB0aW9uID0gT2JqZWN0LmZyZWV6ZSh7XG4gICAgZW5hYmxlOiBmYWxzZSxcbiAgICB1bnN1YnNjcmliZSgpIHsgLyogbm9vcCAqLyB9XG59KSBhcyBTdWJzY3JpcHRpb247XG4iLCJpbXBvcnQgeyB2ZXJpZnkgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRCcm9rZXIsIFN1YnNjcmlwdGlvbiB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgX2NhbmNlbCxcbiAgICBfY2xvc2UsXG4gICAgQ2FuY2VsVG9rZW5TdGF0ZSxcbiAgICBDYW5jZWxUb2tlbkNvbnRleHQsXG4gICAgaW52YWxpZFN1YnNjcmlwdGlvbixcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKlxuICogQGVuIENhbmNlbGxhdGlvbiBzb3VyY2UgaW50ZXJmYWNlLlxuICogQGphIOOCreODo+ODs+OCu+ODq+euoeeQhuOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIENhbmNlbFRva2VuU291cmNlPFQgPSB1bmtub3duPiB7XG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBDYW5jZWxUb2tlbn0gZ2V0dGVyLlxuICAgICAqIEBqYSB7QGxpbmsgQ2FuY2VsVG9rZW59IOWPluW+l1xuICAgICAqL1xuICAgIHJlYWRvbmx5IHRva2VuOiBDYW5jZWxUb2tlbjxUPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGNhbmNlbC5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVhc29uXG4gICAgICogIC0gYGVuYCBjYW5jZWxsYXRpb24gcmVhc29uLiB0aGlzIGFyZyBpcyB0cmFuc21pdHRlZCBpbiBwcm9taXNlIGNoYWluLlxuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744Or44Gu55CG55Sx44KS5oyH5a6aLiBgUHJvbWlzZWAg44OB44Kn44Kk44Oz44Gr5Lyd6YGU44GV44KM44KLLlxuICAgICAqL1xuICAgIGNhbmNlbChyZWFzb246IFQpOiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEJyZWFrIHVwIGNhbmNlbGxhdGlvbiByZWNlcHRpb24uXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+WPl+S7mOOCkue1guS6hlxuICAgICAqL1xuICAgIGNsb3NlKCk6IHZvaWQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Rva2VucyA9IG5ldyBXZWFrTWFwPENhbmNlbFRva2VuLCBDYW5jZWxUb2tlbkNvbnRleHQ+KCk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIGdldENvbnRleHQ8VCA9IHVua25vd24+KGluc3RhbmNlOiBDYW5jZWxUb2tlbjxUPik6IENhbmNlbFRva2VuQ29udGV4dDxUPiB7XG4gICAgaWYgKCFfdG9rZW5zLmhhcyhpbnN0YW5jZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIG9iamVjdCBpcyBub3QgYSB2YWxpZCBDYW5jZWxUb2tlbi4nKTtcbiAgICB9XG4gICAgcmV0dXJuIF90b2tlbnMuZ2V0KGluc3RhbmNlKSBhcyBDYW5jZWxUb2tlbkNvbnRleHQ8VD47XG59XG5cbi8qKlxuICogQGVuIFRoZSB0b2tlbiBvYmplY3QgdG8gd2hpY2ggdW5pZmljYXRpb24gcHJvY2Vzc2luZyBmb3IgYXN5bmNocm9ub3VzIHByb2Nlc3NpbmcgY2FuY2VsbGF0aW9uIGlzIG9mZmVyZWQuIDxicj5cbiAqICAgICBPcmlnaW4gaXMgYENhbmNlbGxhdGlvblRva2VuYCBvZiBgLk5FVCBGcmFtZXdvcmtgLlxuICogQGphIOmdnuWQjOacn+WHpueQhuOCreODo+ODs+OCu+ODq+OBruOBn+OCgeOBrue1seS4gOWHpueQhuOCkuaPkOS+m+OBmeOCi+ODiOODvOOCr+ODs+OCquODluOCuOOCp+OCr+ODiCA8YnI+XG4gKiAgICAg44Kq44Oq44K444OK44Or44GvIGAuTkVUIEZyYW1ld29ya2Ag44GuIGBDYW5jZWxsYXRpb25Ub2tlbmBcbiAqXG4gKiBAc2VlIGh0dHBzOi8vZG9jcy5taWNyb3NvZnQuY29tL2VuLXVzL2RvdG5ldC9zdGFuZGFyZC90aHJlYWRpbmcvY2FuY2VsbGF0aW9uLWluLW1hbmFnZWQtdGhyZWFkc1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICogYGBgXG4gKlxuICogLSBCYXNpYyBVc2FnZVxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB0b2tlbiA9IG5ldyBDYW5jZWxUb2tlbigoY2FuY2VsLCBjbG9zZSkgPT4ge1xuICogICBidXR0b24xLm9uY2xpY2sgPSBldiA9PiBjYW5jZWwobmV3IEVycm9yKCdDYW5jZWwnKSk7XG4gKiAgIGJ1dHRvbjIub25jbGljayA9IGV2ID0+IGNsb3NlKCk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIG9yXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHsgY2FuY2VsLCBjbG9zZSwgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZSgpO1xuICogYnV0dG9uMS5vbmNsaWNrID0gZXYgPT4gY2FuY2VsKG5ldyBFcnJvcignQ2FuY2VsJykpO1xuICogYnV0dG9uMi5vbmNsaWNrID0gZXYgPT4gY2xvc2UoKTtcbiAqIGBgYFxuICpcbiAqIC0gVXNlIHdpdGggUHJvbWlzZVxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB7IGNhbmNlbCwgY2xvc2UsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTtcbiAqIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgob2ssIG5nKSA9PiB7IC4uLiB9LCB0b2tlbik7XG4gKiBwcm9taXNlXG4gKiAgIC50aGVuKC4uLilcbiAqICAgLnRoZW4oLi4uKVxuICogICAudGhlbiguLi4pXG4gKiAgIC5jYXRjaChyZWFzb24gPT4ge1xuICogICAgIC8vIGNoZWNrIHJlYXNvblxuICogICB9KTtcbiAqIGBgYFxuICpcbiAqIC0gUmVnaXN0ZXIgJiBVbnJlZ2lzdGVyIGNhbGxiYWNrKHMpXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHsgY2FuY2VsLCBjbG9zZSwgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZSgpO1xuICogY29uc3Qgc3Vic2NyaXB0aW9uID0gdG9rZW4ucmVnaXN0ZXIocmVhc29uID0+IHtcbiAqICAgY29uc29sZS5sb2cocmVhc29uLm1lc3NhZ2UpO1xuICogfSk7XG4gKiBpZiAoc29tZUNhc2UpIHtcbiAqICAgc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIENhbmNlbFRva2VuPFQgPSB1bmtub3duPiB7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIHtAbGluayBDYW5jZWxUb2tlblNvdXJjZX0gaW5zdGFuY2UuXG4gICAgICogQGphIHtAbGluayBDYW5jZWxUb2tlblNvdXJjZX0g44Kk44Oz44K544K/44Oz44K544Gu5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlua2VkVG9rZW5zXG4gICAgICogIC0gYGVuYCByZWxhdGluZyBhbHJlYWR5IG1hZGUge0BsaW5rIENhbmNlbFRva2VufSBpbnN0YW5jZS5cbiAgICAgKiAgICAgICAgWW91IGNhbiBhdHRhY2ggdG8gdGhlIHRva2VuIHRoYXQgdG8gYmUgYSBjYW5jZWxsYXRpb24gdGFyZ2V0LlxuICAgICAqICAtIGBqYWAg44GZ44Gn44Gr5L2c5oiQ44GV44KM44GfIHtAbGluayBDYW5jZWxUb2tlbn0g6Zai6YCj5LuY44GR44KL5aC05ZCI44Gr5oyH5a6aXG4gICAgICogICAgICAgIOa4oeOBleOCjOOBnyB0b2tlbiDjga/jgq3jg6Pjg7Pjgrvjg6vlr77osaHjgajjgZfjgabntJDjgaXjgZHjgonjgozjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHNvdXJjZTxUID0gdW5rbm93bj4oLi4ubGlua2VkVG9rZW5zOiBDYW5jZWxUb2tlbltdKTogQ2FuY2VsVG9rZW5Tb3VyY2U8VD4ge1xuICAgICAgICBsZXQgY2FuY2VsITogKHJlYXNvbjogVCkgPT4gdm9pZDtcbiAgICAgICAgbGV0IGNsb3NlITogKCkgPT4gdm9pZDtcbiAgICAgICAgY29uc3QgdG9rZW4gPSBuZXcgQ2FuY2VsVG9rZW48VD4oKG9uQ2FuY2VsLCBvbkNsb3NlKSA9PiB7XG4gICAgICAgICAgICBjYW5jZWwgPSBvbkNhbmNlbDtcbiAgICAgICAgICAgIGNsb3NlID0gb25DbG9zZTtcbiAgICAgICAgfSwgLi4ubGlua2VkVG9rZW5zKTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5mcmVlemUoeyB0b2tlbiwgY2FuY2VsLCBjbG9zZSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGV4ZWN1dG9yXG4gICAgICogIC0gYGVuYCBleGVjdXRlciB0aGF0IGhhcyBgY2FuY2VsYCBhbmQgYGNsb3NlYCBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODqy/jgq/jg63jg7zjgrog5a6f6KGM44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGxpbmtlZFRva2Vuc1xuICAgICAqICAtIGBlbmAgcmVsYXRpbmcgYWxyZWFkeSBtYWRlIHtAbGluayBDYW5jZWxUb2tlbn0gaW5zdGFuY2UuXG4gICAgICogICAgICAgIFlvdSBjYW4gYXR0YWNoIHRvIHRoZSB0b2tlbiB0aGF0IHRvIGJlIGEgY2FuY2VsbGF0aW9uIHRhcmdldC5cbiAgICAgKiAgLSBgamFgIOOBmeOBp+OBq+S9nOaIkOOBleOCjOOBnyB7QGxpbmsgQ2FuY2VsVG9rZW59IOmWoumAo+S7mOOBkeOCi+WgtOWQiOOBq+aMh+WumlxuICAgICAqICAgICAgICDmuKHjgZXjgozjgZ8gdG9rZW4g44Gv44Kt44Oj44Oz44K744Or5a++6LGh44Go44GX44Gm57SQ44Gl44GR44KJ44KM44KLXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIGV4ZWN1dG9yOiAoY2FuY2VsOiAocmVhc29uOiBUKSA9PiB2b2lkLCBjbG9zZTogKCkgPT4gdm9pZCkgPT4gdm9pZCxcbiAgICAgICAgLi4ubGlua2VkVG9rZW5zOiBDYW5jZWxUb2tlbltdXG4gICAgKSB7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIENhbmNlbFRva2VuLCB0aGlzKTtcbiAgICAgICAgdmVyaWZ5KCd0eXBlT2YnLCAnZnVuY3Rpb24nLCBleGVjdXRvcik7XG5cbiAgICAgICAgY29uc3QgbGlua2VkVG9rZW5TZXQgPSBuZXcgU2V0KGxpbmtlZFRva2Vucy5maWx0ZXIodCA9PiBfdG9rZW5zLmhhcyh0KSkpO1xuICAgICAgICBsZXQgc3RhdHVzID0gQ2FuY2VsVG9rZW5TdGF0ZS5PUEVOO1xuICAgICAgICBmb3IgKGNvbnN0IHQgb2YgbGlua2VkVG9rZW5TZXQpIHtcbiAgICAgICAgICAgIHN0YXR1cyB8PSBnZXRDb250ZXh0KHQpLnN0YXR1cztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbnRleHQ6IENhbmNlbFRva2VuQ29udGV4dDxUPiA9IHtcbiAgICAgICAgICAgIGJyb2tlcjogbmV3IEV2ZW50QnJva2VyKCksXG4gICAgICAgICAgICBzdWJzY3JpcHRpb25zOiBuZXcgU2V0KCksXG4gICAgICAgICAgICByZWFzb246IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHN0YXR1cyxcbiAgICAgICAgfTtcbiAgICAgICAgX3Rva2Vucy5zZXQodGhpcywgT2JqZWN0LnNlYWwoY29udGV4dCkpO1xuXG4gICAgICAgIGNvbnN0IGNhbmNlbCA9IHRoaXNbX2NhbmNlbF07XG4gICAgICAgIGNvbnN0IGNsb3NlID0gdGhpc1tfY2xvc2VdO1xuICAgICAgICBpZiAoc3RhdHVzID09PSBDYW5jZWxUb2tlblN0YXRlLk9QRU4pIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgdCBvZiBsaW5rZWRUb2tlblNldCkge1xuICAgICAgICAgICAgICAgIGNvbnRleHQuc3Vic2NyaXB0aW9ucy5hZGQodC5yZWdpc3RlcihjYW5jZWwuYmluZCh0aGlzKSkpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVnaXN0ZXIoY2FuY2VsLmJpbmQodCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhlY3V0b3IoY2FuY2VsLmJpbmQodGhpcyksIGNsb3NlLmJpbmQodGhpcykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYW5jZWxsYXRpb24gcmVhc29uIGFjY2Vzc29yLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjga7ljp/lm6Dlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgcmVhc29uKCk6IFQgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gZ2V0Q29udGV4dCh0aGlzKS5yZWFzb247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEVuYWJsZSBjYW5jZWxsYXRpb24gc3RhdGUgYWNjZXNzb3IuXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+WPr+iDveOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBjYW5jZWxhYmxlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gZ2V0Q29udGV4dCh0aGlzKS5zdGF0dXMgPT09IENhbmNlbFRva2VuU3RhdGUuT1BFTjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FuY2VsbGF0aW9uIHJlcXVlc3RlZCBzdGF0ZSBhY2Nlc3Nvci5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or44KS5Y+X44GR5LuY44GR44Gm44GE44KL44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IHJlcXVlc3RlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhKGdldENvbnRleHQodGhpcykuc3RhdHVzICYgQ2FuY2VsVG9rZW5TdGF0ZS5SRVFVRVNURUQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYW5jZWxsYXRpb24gY2xvc2VkIHN0YXRlIGFjY2Vzc29yLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vlj5fku5jjgpLntYLkuobjgZfjgabjgYTjgovjgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgY2xvc2VkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISEoZ2V0Q29udGV4dCh0aGlzKS5zdGF0dXMgJiBDYW5jZWxUb2tlblN0YXRlLkNMT1NFRCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIGB0b1N0cmluZ2AgdGFnIG92ZXJyaWRlLlxuICAgICAqIEBqYSBgdG9TdHJpbmdgIOOCv+OCsOOBruOCquODvOODkOODvOODqeOCpOODiVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKTogJ0NhbmNlbFRva2VuJyB7IHJldHVybiAnQ2FuY2VsVG9rZW4nOyB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVnaXN0ZXIgY3VzdG9tIGNhbmNlbGxhdGlvbiBjYWxsYmFjay5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5pmC44Gu44Kr44K544K/44Og5Yem55CG44Gu55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb25DYW5jZWxcbiAgICAgKiAgLSBgZW5gIGNhbmNlbCBvcGVyYXRpb24gY2FsbGJhY2tcbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODq+OCs+ODvOODq+ODkOODg+OCr1xuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgU3Vic2NyaXB0aW9uYCBpbnN0YW5jZS5cbiAgICAgKiAgICAgICAgWW91IGNhbiByZXZva2UgY2FuY2VsbGF0aW9uIHRvIGNhbGwgYHVuc3Vic2NyaWJlYCBtZXRob2QuXG4gICAgICogIC0gYGphYCBgU3Vic2NyaXB0aW9uYCDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKiAgICAgICAgYHVuc3Vic2NyaWJlYCDjg6Hjgr3jg4Pjg4njgpLlkbzjgbbjgZPjgajjgafjgq3jg6Pjg7Pjgrvjg6vjgpLnhKHlirnjgavjgZnjgovjgZPjgajjgYzlj6/og71cbiAgICAgKi9cbiAgICBwdWJsaWMgcmVnaXN0ZXIob25DYW5jZWw6IChyZWFzb246IFQpID0+IHVua25vd24pOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gZ2V0Q29udGV4dCh0aGlzKTtcbiAgICAgICAgaWYgKCF0aGlzLmNhbmNlbGFibGUpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnZhbGlkU3Vic2NyaXB0aW9uO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb250ZXh0LmJyb2tlci5vbignY2FuY2VsJywgb25DYW5jZWwpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIFtfY2FuY2VsXShyZWFzb246IFQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGdldENvbnRleHQodGhpcyk7XG4gICAgICAgIHZlcmlmeSgnbm90TnVsbGlzaCcsIHJlYXNvbik7XG4gICAgICAgIGlmICghdGhpcy5jYW5jZWxhYmxlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5yZWFzb24gPSByZWFzb247XG4gICAgICAgIGNvbnRleHQuc3RhdHVzIHw9IENhbmNlbFRva2VuU3RhdGUuUkVRVUVTVEVEO1xuICAgICAgICBmb3IgKGNvbnN0IHMgb2YgY29udGV4dC5zdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5icm9rZXIudHJpZ2dlcignY2FuY2VsJywgcmVhc29uKTtcbiAgICAgICAgdm9pZCBQcm9taXNlLnJlc29sdmUoKS50aGVuKCgpID0+IHRoaXNbX2Nsb3NlXSgpKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX2Nsb3NlXSgpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGdldENvbnRleHQodGhpcyk7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQuc3RhdHVzIHw9IENhbmNlbFRva2VuU3RhdGUuQ0xPU0VEO1xuICAgICAgICBmb3IgKGNvbnN0IHMgb2YgY29udGV4dC5zdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5zdWJzY3JpcHRpb25zLmNsZWFyKCk7XG4gICAgICAgIGNvbnRleHQuYnJva2VyLm9mZigpO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgbm8tZ2xvYmFsLWFzc2lnbixcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2QsXG4gKi9cblxuaW1wb3J0IHtcbiAgICBpc0Z1bmN0aW9uLFxuICAgIHZlcmlmeSxcbiAgICBnZXRDb25maWcsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24gfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBDYW5jZWxUb2tlbiB9IGZyb20gJy4vY2FuY2VsLXRva2VuJztcblxuZGVjbGFyZSBnbG9iYWwge1xuXG4gICAgaW50ZXJmYWNlIFByb21pc2VDb25zdHJ1Y3RvciB7XG4gICAgICAgIG5ldyA8VD4oZXhlY3V0b3I6IChyZXNvbHZlOiAodmFsdWU/OiBUIHwgUHJvbWlzZUxpa2U8VD4pID0+IHZvaWQsIHJlamVjdDogKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQpID0+IHZvaWQsIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsKTogUHJvbWlzZTxUPjtcbiAgICAgICAgcmVzb2x2ZTxUPih2YWx1ZT86IFQgfCBQcm9taXNlTGlrZTxUPiwgY2FuY2VsVG9rZW4/OiBDYW5jZWxUb2tlbiB8IG51bGwpOiBQcm9taXNlPFQ+O1xuICAgIH1cblxufVxuXG4vKipcbiAqIEBlbiBgTmF0aXZlIFByb21pc2VgIGNvbnN0cnVjdG9yIDxicj5cbiAqICAgICBDYW4gYmUgdXNlZCBhcyBhbiBhbGlhcyBmb3IgYE5hdGl2ZSBQcm9taXNlYC5cbiAqIEBqYSBgTmF0aXZlIFByb21pc2VgIOOCs+ODs+OCueODiOODqeOCr+OCvyA8YnI+XG4gKiAgICAgYE5hdGl2ZSBQcm9taXNlYCDjga7jgqjjgqTjg6rjgqLjgrnjgajjgZfjgabkvb/nlKjlj6/og71cbiAqL1xuY29uc3QgTmF0aXZlUHJvbWlzZSA9IFByb21pc2U7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgbmF0aXZlVGhlbiA9IE5hdGl2ZVByb21pc2UucHJvdG90eXBlLnRoZW47XG4vKiogQGludGVybmFsICovIGNvbnN0IF9jcmVhdGUgPSBTeW1ib2woJ2NyZWF0ZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfdG9rZW5zID0gbmV3IFdlYWtNYXA8UHJvbWlzZTx1bmtub3duPiwgQ2FuY2VsVG9rZW4+KCk7XG5cbi8qKlxuICogQGVuIEV4dGVuZGVkIGBQcm9taXNlYCBjbGFzcyB3aGljaCBlbmFibGVkIGNhbmNlbGxhdGlvbi4gPGJyPlxuICogICAgIGBOYXRpdmUgUHJvbWlzZWAgY29uc3RydWN0b3IgaXMgb3ZlcnJpZGRlbiBieSBmcmFtZXdvcmsgZGVmYXVsdCBiZWhhdmlvdXIuXG4gKiBAamEg44Kt44Oj44Oz44K744Or44KS5Y+v6IO944Gr44GX44GfIGBQcm9taXNlYCDmi6HlvLXjgq/jg6njgrkgPGJyPlxuICogICAgIOaXouWumuOBpyBgTmF0aXZlIFByb21pc2VgIOOCkuOCquODvOODkOODvOODqeOCpOODieOBmeOCiy5cbiAqL1xuY2xhc3MgQ2FuY2VsYWJsZVByb21pc2U8VD4gZXh0ZW5kcyBQcm9taXNlPFQ+IHtcblxuICAgIC8qKlxuICAgICAqIEBlbiBPdmVycmlkaW5nIG9mIHRoZSBkZWZhdWx0IGNvbnN0cnVjdG9yIHVzZWQgZm9yIGdlbmVyYXRpb24gb2YgYW4gb2JqZWN0LlxuICAgICAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7nlJ/miJDjgavkvb/jgo/jgozjgovjg4fjg5Xjgqnjg6vjg4jjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7jgqrjg7zjg5Djg7zjg6njgqTjg4lcbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXQgW1N5bWJvbC5zcGVjaWVzXSgpOiBQcm9taXNlQ29uc3RydWN0b3IgeyByZXR1cm4gTmF0aXZlUHJvbWlzZTsgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZXMgYSBuZXcgcmVzb2x2ZWQgcHJvbWlzZSBmb3IgdGhlIHByb3ZpZGVkIHZhbHVlLlxuICAgICAqIEBqYSDmlrDopo/jgavop6PmsbrmuIjjgb8gcHJvbWlzZSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJBcbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB0aGUgdmFsdWUgdHJhbnNtaXR0ZWQgaW4gcHJvbWlzZSBjaGFpbi5cbiAgICAgKiAgLSBgamFgIGBQcm9taXNlYCDjgavkvJ3pgZTjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gY2FuY2VsVG9rZW5cbiAgICAgKiAgLSBgZW5gIHtAbGluayBDYW5jZWxUb2tlbn0gaW5zdGFuY2UgY3JlYXRlIGZyb20ge0BsaW5rIENhbmNlbFRva2VuLnNvdXJjZSB8IENhbmNlbFRva2VuLnNvdXJjZX0oKS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBDYW5jZWxUb2tlbi5zb3VyY2UgfCBDYW5jZWxUb2tlbi5zb3VyY2V9KCkg44KI44KK5L2c5oiQ44GX44GfIHtAbGluayBDYW5jZWxUb2tlbn0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gICAgICovXG4gICAgc3RhdGljIHJlc29sdmU8VD4odmFsdWU/OiBUIHwgUHJvbWlzZUxpa2U8VD4sIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsKTogQ2FuY2VsYWJsZVByb21pc2U8VD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlXShzdXBlci5yZXNvbHZlKHZhbHVlKSwgY2FuY2VsVG9rZW4pO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgcHJpdmF0ZSBjb25zdHJ1Y3Rpb24gKi9cbiAgICBwcml2YXRlIHN0YXRpYyBbX2NyZWF0ZV08VCwgVFJlc3VsdDEgPSBULCBUUmVzdWx0MiA9IG5ldmVyPihcbiAgICAgICAgc3JjOiBQcm9taXNlPFQ+LFxuICAgICAgICB0b2tlbj86IENhbmNlbFRva2VuIHwgbnVsbCxcbiAgICAgICAgdGhlbkFyZ3M/OiBbXG4gICAgICAgICAgICAoKHZhbHVlOiBUKSA9PiBUUmVzdWx0MSB8IFByb21pc2VMaWtlPFRSZXN1bHQxPikgfCBudWxsIHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgKChyZWFzb246IHVua25vd24pID0+IFRSZXN1bHQyIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDI+KSB8IG51bGwgfCB1bmRlZmluZWRcbiAgICAgICAgXSB8IG51bGxcbiAgICApOiBDYW5jZWxhYmxlUHJvbWlzZTxUUmVzdWx0MSB8IFRSZXN1bHQyPiB7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIE5hdGl2ZVByb21pc2UsIHNyYyk7XG5cbiAgICAgICAgbGV0IHA6IFByb21pc2U8VCB8IFRSZXN1bHQxIHwgVFJlc3VsdDI+O1xuICAgICAgICBpZiAoISh0b2tlbiBpbnN0YW5jZW9mIENhbmNlbFRva2VuKSkge1xuICAgICAgICAgICAgcCA9IHNyYztcbiAgICAgICAgfSBlbHNlIGlmICh0aGVuQXJncyAmJiAoIWlzRnVuY3Rpb24odGhlbkFyZ3NbMF0pIHx8IGlzRnVuY3Rpb24odGhlbkFyZ3NbMV0pKSkge1xuICAgICAgICAgICAgcCA9IHNyYztcbiAgICAgICAgfSBlbHNlIGlmICh0b2tlbi5jYW5jZWxhYmxlKSB7XG4gICAgICAgICAgICBsZXQgczogU3Vic2NyaXB0aW9uO1xuICAgICAgICAgICAgcCA9IG5ldyBOYXRpdmVQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBzID0gdG9rZW4ucmVnaXN0ZXIocmVqZWN0KTtcbiAgICAgICAgICAgICAgICBuYXRpdmVUaGVuLmNhbGwoc3JjLCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCBkaXNwb3NlID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICBfdG9rZW5zLmRlbGV0ZShwKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBwLnRoZW4oZGlzcG9zZSwgZGlzcG9zZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodG9rZW4ucmVxdWVzdGVkKSB7XG4gICAgICAgICAgICBwID0gc3VwZXIucmVqZWN0KHRva2VuLnJlYXNvbik7XG4gICAgICAgIH0gZWxzZSBpZiAodG9rZW4uY2xvc2VkKSB7XG4gICAgICAgICAgICBwID0gc3JjO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIEV4Y2VwdGlvbicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoZW5BcmdzKSB7XG4gICAgICAgICAgICBwID0gbmF0aXZlVGhlbi5hcHBseShwLCB0aGVuQXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRva2VuPy5jYW5jZWxhYmxlKSB7XG4gICAgICAgICAgICBfdG9rZW5zLnNldChwLCB0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBwIGluc3RhbmNlb2YgdGhpcyB8fCBPYmplY3Quc2V0UHJvdG90eXBlT2YocCwgdGhpcy5wcm90b3R5cGUpO1xuXG4gICAgICAgIHJldHVybiBwIGFzIENhbmNlbGFibGVQcm9taXNlPFRSZXN1bHQxIHwgVFJlc3VsdDI+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZXhlY3V0b3JcbiAgICAgKiAgLSBgZW5gIEEgY2FsbGJhY2sgdXNlZCB0byBpbml0aWFsaXplIHRoZSBwcm9taXNlLiBUaGlzIGNhbGxiYWNrIGlzIHBhc3NlZCB0d28gYXJndW1lbnRzIGByZXNvbHZlYCBhbmQgYHJlamVjdGAuXG4gICAgICogIC0gYGphYCBwcm9taXNlIOOBruWIneacn+WMluOBq+S9v+eUqOOBmeOCi+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+Wumi4gYHJlc29sdmVgIOOBqCBgcmVqZWN0YCDjga4y44Gk44Gu5byV5pWw44KS5oyB44GkXG4gICAgICogQHBhcmFtIGNhbmNlbFRva2VuXG4gICAgICogIC0gYGVuYCB7QGxpbmsgQ2FuY2VsVG9rZW59IGluc3RhbmNlIGNyZWF0ZSBmcm9tIHtAbGluayBDYW5jZWxUb2tlbi5zb3VyY2UgfCBDYW5jZWxUb2tlbi5zb3VyY2V9KCkuXG4gICAgICogIC0gYGphYCB7QGxpbmsgQ2FuY2VsVG9rZW4uc291cmNlIHwgQ2FuY2VsVG9rZW4uc291cmNlfSgpIOOCiOOCiuS9nOaIkOOBl+OBnyB7QGxpbmsgQ2FuY2VsVG9rZW59IOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBleGVjdXRvcjogKHJlc29sdmU6ICh2YWx1ZT86IFQgfCBQcm9taXNlTGlrZTxUPikgPT4gdm9pZCwgcmVqZWN0OiAocmVhc29uPzogdW5rbm93bikgPT4gdm9pZCkgPT4gdm9pZCxcbiAgICAgICAgY2FuY2VsVG9rZW4/OiBDYW5jZWxUb2tlbiB8IG51bGxcbiAgICApIHtcbiAgICAgICAgc3VwZXIoZXhlY3V0b3IpO1xuICAgICAgICByZXR1cm4gQ2FuY2VsYWJsZVByb21pc2VbX2NyZWF0ZV0odGhpcywgY2FuY2VsVG9rZW4pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGNhbGxiYWNrcyBmb3IgdGhlIHJlc29sdXRpb24gYW5kL29yIHJlamVjdGlvbiBvZiB0aGUgUHJvbWlzZS5cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIG9uZnVsZmlsbGVkIFRoZSBjYWxsYmFjayB0byBleGVjdXRlIHdoZW4gdGhlIFByb21pc2UgaXMgcmVzb2x2ZWQuXG4gICAgICogQHBhcmFtIG9ucmVqZWN0ZWQgVGhlIGNhbGxiYWNrIHRvIGV4ZWN1dGUgd2hlbiB0aGUgUHJvbWlzZSBpcyByZWplY3RlZC5cbiAgICAgKiBAcmV0dXJucyBBIFByb21pc2UgZm9yIHRoZSBjb21wbGV0aW9uIG9mIHdoaWNoIGV2ZXIgY2FsbGJhY2sgaXMgZXhlY3V0ZWQuXG4gICAgICovXG4gICAgdGhlbjxUUmVzdWx0MSA9IFQsIFRSZXN1bHQyID0gbmV2ZXI+KFxuICAgICAgICBvbmZ1bGZpbGxlZD86ICgodmFsdWU6IFQpID0+IFRSZXN1bHQxIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDE+KSB8IG51bGwsXG4gICAgICAgIG9ucmVqZWN0ZWQ/OiAoKHJlYXNvbjogdW5rbm93bikgPT4gVFJlc3VsdDIgfCBQcm9taXNlTGlrZTxUUmVzdWx0Mj4pIHwgbnVsbFxuICAgICk6IFByb21pc2U8VFJlc3VsdDEgfCBUUmVzdWx0Mj4ge1xuICAgICAgICByZXR1cm4gQ2FuY2VsYWJsZVByb21pc2VbX2NyZWF0ZV0odGhpcywgX3Rva2Vucy5nZXQodGhpcyksIFtvbmZ1bGZpbGxlZCwgb25yZWplY3RlZF0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGEgY2FsbGJhY2sgZm9yIG9ubHkgdGhlIHJlamVjdGlvbiBvZiB0aGUgUHJvbWlzZS5cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIG9ucmVqZWN0ZWQgVGhlIGNhbGxiYWNrIHRvIGV4ZWN1dGUgd2hlbiB0aGUgUHJvbWlzZSBpcyByZWplY3RlZC5cbiAgICAgKiBAcmV0dXJucyBBIFByb21pc2UgZm9yIHRoZSBjb21wbGV0aW9uIG9mIHRoZSBjYWxsYmFjay5cbiAgICAgKi9cbiAgICBjYXRjaDxUUmVzdWx0MiA9IG5ldmVyPihvbnJlamVjdGVkPzogKChyZWFzb246IHVua25vd24pID0+IFRSZXN1bHQyIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDI+KSB8IG51bGwpOiBQcm9taXNlPFQgfCBUUmVzdWx0Mj4ge1xuICAgICAgICByZXR1cm4gdGhpcy50aGVuKHVuZGVmaW5lZCwgb25yZWplY3RlZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXR0YWNoZXMgYSBjYWxsYmFjayB0aGF0IGlzIGludm9rZWQgd2hlbiB0aGUgUHJvbWlzZSBpcyBzZXR0bGVkIChmdWxmaWxsZWQgb3IgcmVqZWN0ZWQpLiA8YnI+XG4gICAgICogVGhlIHJlc29sdmVkIHZhbHVlIGNhbm5vdCBiZSBtb2RpZmllZCBmcm9tIHRoZSBjYWxsYmFjay5cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIG9uZmluYWxseSBUaGUgY2FsbGJhY2sgdG8gZXhlY3V0ZSB3aGVuIHRoZSBQcm9taXNlIGlzIHNldHRsZWQgKGZ1bGZpbGxlZCBvciByZWplY3RlZCkuXG4gICAgICogQHJldHVybnMgQSBQcm9taXNlIGZvciB0aGUgY29tcGxldGlvbiBvZiB0aGUgY2FsbGJhY2suXG4gICAgICovXG4gICAgZmluYWxseShvbmZpbmFsbHk/OiAoKCkgPT4gdm9pZCkgfCBudWxsKTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiBDYW5jZWxhYmxlUHJvbWlzZVtfY3JlYXRlXShzdXBlci5maW5hbGx5KG9uZmluYWxseSksIF90b2tlbnMuZ2V0KHRoaXMpKTtcbiAgICB9XG5cbn1cblxuLyoqXG4gKiBAZW4gU3dpdGNoIHRoZSBnbG9iYWwgYFByb21pc2VgIGNvbnN0cnVjdG9yIGBOYXRpdmUgUHJvbWlzZWAgb3Ige0BsaW5rIENhbmNlbGFibGVQcm9taXNlfS4gPGJyPlxuICogICAgIGBOYXRpdmUgUHJvbWlzZWAgY29uc3RydWN0b3IgaXMgb3ZlcnJpZGRlbiBieSBmcmFtZXdvcmsgZGVmYXVsdCBiZWhhdmlvdXIuXG4gKiBAamEg44Kw44Ot44O844OQ44OrIGBQcm9taXNlYCDjgrPjg7Pjgrnjg4jjg6njgq/jgr/jgpIgYE5hdGl2ZSBQcm9taXNlYCDjgb7jgZ/jga8ge0BsaW5rIENhbmNlbGFibGVQcm9taXNlfSDjgavliIfjgormm7/jgYggPGJyPlxuICogICAgIOaXouWumuOBpyBgTmF0aXZlIFByb21pc2VgIOOCkuOCquODvOODkOODvOODqeOCpOODieOBmeOCiy5cbiAqXG4gKiBAcGFyYW0gZW5hYmxlXG4gKiAgLSBgZW5gIGB0cnVlYDogdXNlIHtAbGluayBDYW5jZWxhYmxlUHJvbWlzZX0gLyAgYGZhbHNlYDogdXNlIGBOYXRpdmUgUHJvbWlzZWBcbiAqICAtIGBqYWAgYHRydWVgOiB7QGxpbmsgQ2FuY2VsYWJsZVByb21pc2V9IOOCkuS9v+eUqCAvIGBmYWxzZWA6IGBOYXRpdmUgUHJvbWlzZWAg44KS5L2/55SoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRlbmRQcm9taXNlKGVuYWJsZTogYm9vbGVhbik6IFByb21pc2VDb25zdHJ1Y3RvciB7XG4gICAgaWYgKGVuYWJsZSkge1xuICAgICAgICBQcm9taXNlID0gQ2FuY2VsYWJsZVByb21pc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgUHJvbWlzZSA9IE5hdGl2ZVByb21pc2U7XG4gICAgfVxuICAgIHJldHVybiBQcm9taXNlO1xufVxuXG4vKiogQGludGVybmFsIGdsb2JhbCBjb25maWcgb3B0aW9ucyAqL1xuaW50ZXJmYWNlIEdsb2JhbENvbmZpZyB7XG4gICAgbm9BdXRvbWF0aWNOYXRpdmVFeHRlbmQ6IGJvb2xlYW47XG59XG5cbi8vIGRlZmF1bHQ6IGF1dG9tYXRpYyBuYXRpdmUgcHJvbWlzZSBvdmVycmlkZS5cbmV4dGVuZFByb21pc2UoIWdldENvbmZpZzxHbG9iYWxDb25maWc+KCkubm9BdXRvbWF0aWNOYXRpdmVFeHRlbmQpO1xuXG5leHBvcnQge1xuICAgIE5hdGl2ZVByb21pc2UsXG4gICAgQ2FuY2VsYWJsZVByb21pc2UsXG4gICAgQ2FuY2VsYWJsZVByb21pc2UgYXMgUHJvbWlzZSxcbn07XG4iLCJpbXBvcnQgeyBDYW5jZWxUb2tlbiB9IGZyb20gJy4vY2FuY2VsLXRva2VuJztcblxuLyoqXG4gKiBAZW4gQ2FuY2VsYWJsZSBiYXNlIG9wdGlvbiBkZWZpbml0aW9uLlxuICogQGphIOOCreODo+ODs+OCu+ODq+WPr+iDveOBquWfuuW6leOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIENhbmNlbGFibGUge1xuICAgIGNhbmNlbD86IENhbmNlbFRva2VuO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gV2FpdCBmb3IgcHJvbWlzZXMgZG9uZS4gPGJyPlxuICogICAgIFdoaWxlIGNvbnRyb2wgd2lsbCBiZSByZXR1cm5lZCBpbW1lZGlhdGVseSB3aGVuIGBQcm9taXNlLmFsbCgpYCBmYWlscywgYnV0IHRoaXMgbWVodG9kIHdhaXRzIGZvciBpbmNsdWRpbmcgZmFpbHVyZS5cbiAqIEBqYSBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OI44Gu57WC5LqG44G+44Gn5b6F5qmfIDxicj5cbiAqICAgICBgUHJvbWlzZS5hbGwoKWAg44Gv5aSx5pWX44GZ44KL44Go44GZ44GQ44Gr5Yi25b6h44KS6L+U44GZ44Gu44Gr5a++44GX44CB5aSx5pWX44KC5ZCr44KB44Gm5b6F44GkIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAqXG4gKiBAcGFyYW0gcHJvbWlzZXNcbiAqICAtIGBlbmAgUHJvbWlzZSBpbnN0YW5jZSBhcnJheVxuICogIC0gYGphYCBQcm9taXNlIOOCpOODs+OCueOCv+ODs+OCueOBrumFjeWIl+OCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2FpdChwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdKTogUHJvbWlzZTx1bmtub3duW10+IHtcbiAgICBjb25zdCBzYWZlUHJvbWlzZXMgPSBwcm9taXNlcy5tYXAoKHByb21pc2UpID0+IHByb21pc2UuY2F0Y2goKGUpID0+IGUpKTtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoc2FmZVByb21pc2VzKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2FuY2VsbGF0aW9uIGNoZWNrZXIgbWV0aG9kLiA8YnI+XG4gKiAgICAgSXQncyBwcmFjdGljYWJsZSBieSBgYXN5bmMgZnVuY3Rpb25gLlxuICogQGphIOOCreODo+ODs+OCu+ODq+ODgeOCp+ODg+OCq+ODvCA8YnI+XG4gKiAgICAgYGFzeW5jIGZ1bmN0aW9uYCDjgafkvb/nlKjlj6/og71cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICBhc3luYyBmdW5jdGlvbiBzb21lRnVuYyh0b2tlbjogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPHt9PiB7XG4gKiAgICBhd2FpdCBjaGVja0NhbmNlbGVkKHRva2VuKTtcbiAqICAgIHJldHVybiB7fTtcbiAqICB9XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAge0BsaW5rIENhbmNlbFRva2VufSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIHtAbGluayBDYW5jZWxUb2tlbn0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tDYW5jZWxlZCh0b2tlbjogQ2FuY2VsVG9rZW4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHVuZGVmaW5lZCwgdG9rZW4pO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc3RhdHVzIG9mIHRoZSBwcm9taXNlIGluc3RhbmNlLiA8YnI+XG4gKiAgICAgSXQncyBwcmFjdGljYWJsZSBieSBgYXN5bmMgZnVuY3Rpb25gLlxuICogQGphIFByb21pc2Ug44Kk44Oz44K544K/44Oz44K544Gu54q25oWL44KS56K66KqNIDxicj5cbiAqICAgICBgYXN5bmMgZnVuY3Rpb25gIOOBp+S9v+eUqOWPr+iDvVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgY2hlY2tTdGF0dXMgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIGxldCBwcm9taXNlOiBQcm9taXNlPHVua25vd24+OyAvLyBzb21lIHByb21pc2UgaW5zdGFuY2VcbiAqIDpcbiAqIGNvbnN0IHN0YXR1cyA9IGF3YWl0IGNoZWNrU3RhdHVzKHByb21pc2UpO1xuICogY29uc29sZS5sb2coc3RhdHVzKTtcbiAqIC8vICdwZW5kaW5nJyBvciAnZnVsZmlsbGVkJyBvciAncmVqZWN0ZWQnXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gcHJvbWlzZVxuICogIC0gYGVuYCBQcm9taXNlIGluc3RhbmNlXG4gKiAgLSBgamFgIFByb21pc2Ug44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjaGVja1N0YXR1cyhwcm9taXNlOiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTwncGVuZGluZycgfCAnZnVsZmlsbGVkJyB8ICdyZWplY3RlZCc+IHtcbiAgICBjb25zdCBwZW5kaW5nID0ge307XG4gICAgLypcbiAgICAgKiBQcm9taXNlIOa0vueUn+OCr+ODqeOCueOBp+OCguS9v+eUqOOBmeOCi+OBn+OCgeOBq+OBrywgYGluc3RhbmNlLmNvbnN0cnVjdG9yLnJhY2VgIOOBp+OCouOCr+OCu+OCueOBmeOCi+W/heimgeOBjOOBguOCi1xuICAgICAqIHByb21pc2Ug44GM5rS+55Sf44Kv44Op44K544Gn44GC44KL5aC05ZCILCBQcm9taXNlLnJhY2UoKSDjgpLkvb/nlKjjgZnjgovjgajlv4XjgZogYHBlbmRpbmdgIG9iamVjdCDjgYzov5TjgZXjgozjgabjgZfjgb7jgYZcbiAgICAgKi9cbiAgICByZXR1cm4gKHByb21pc2UuY29uc3RydWN0b3IgYXMgUHJvbWlzZUNvbnN0cnVjdG9yKS5yYWNlKFtwcm9taXNlLCBwZW5kaW5nXSlcbiAgICAgICAgLnRoZW4odiA9PiAodiA9PT0gcGVuZGluZykgPyAncGVuZGluZycgOiAnZnVsZmlsbGVkJywgKCkgPT4gJ3JlamVjdGVkJyk7XG59XG4iLCJpbXBvcnQge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBpc0Z1bmN0aW9uLFxuICAgIG5vb3AsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBDYW5jZWxUb2tlbiB9IGZyb20gJy4vY2FuY2VsLXRva2VuJztcbmltcG9ydCB7IENhbmNlbGFibGVQcm9taXNlLCBOYXRpdmVQcm9taXNlIH0gZnJvbSAnLi9jYW5jZWxhYmxlLXByb21pc2UnO1xuaW1wb3J0IHsgY2hlY2tTdGF0dXMgfSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIFByb21pc2Ug44Gu44Kv44Op44K55ouh5by144GvIHRoZW4gY2hhaW4g44KS6YGp5YiH44Gr566h55CG44GZ44KL44Gf44KB44Gu5L2c5rOV44GM5a2Y5Zyo44GX44CB5Z+65pys55qE44Gr44Gv5Lul5LiL44GuM+OBpOOBruaWuemHneOBjOOBguOCi1xuICogLSAxLiBleGVjdXRvciDjgpLlvJXmlbDjgavjgajjgosgY29uc3RydWN0b3Ig44KS5o+Q5L6b44GZ44KLXG4gKiAtIDIuIHN0YXRpYyBnZXQgW1N5bWJvbC5zcGVjaWVzXSgpIHsgcmV0dXJuIE5hdGl2ZVByb21pc2U7IH0g44KS5o+Q5L6b44GZ44KLXG4gKiAtIDMuIERlZmVycmVkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE5hdGl2ZVByb21pc2Ug44Gu44KI44GG44GrIHByb3RvdHlwZS5jb25zdHJ1Y3RvciDjgpLkuIrmm7jjgY3jgZnjgosgKEhhY2tpbmcpXG4gKlxuICogYERlZmVycmVkYCDjgq/jg6njgrnjgafjga/ku6XkuIvjga7nkIbnlLHjgavjgojjgoosIGAxYCwgYDJgIOOBruWvvuW/nOOCkuihjOOBhi4gXG4gKiAtIGNoZWNrU3RhdHVzKCkg44KSIFByb21pc2Ug5rS+55Sf44Kv44Op44K544Gn44KC5L2/55So44GZ44KL44Gf44KB44Gr44GvLCBgaW5zdGFuY2UuY29uc3RydWN0b3IucmFjZWAg44Gn44Ki44Kv44K744K544GZ44KL5b+F6KaB44GM44GC44KLXG4gKiAgIC0gYFR5cGVFcnJvcjogUHJvbWlzZSByZXNvbHZlIG9yIHJlamVjdCBmdW5jdGlvbiBpcyBub3QgY2FsbGFibGVgIOWvvuetluOBruOBn+OCgeOBriBgMWBcbiAqIC0gYHRoZW5gLCBgY2F0Y2hgLCBgZmluYWx5YCDmmYLjgavnlJ/miJDjgZXjgozjgovjgqTjg7Pjgrnjgr/jg7Pjgrnjga8gYERlZmVycmVkYCDjgafjgYLjgovlv4XopoHjga/nhKHjgYTjgZ/jgoEgYDJgXG4gKlxuICogQHNlZSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy80ODE1ODczMC9leHRlbmQtamF2YXNjcmlwdC1wcm9taXNlLWFuZC1yZXNvbHZlLW9yLXJlamVjdC1pdC1pbnNpZGUtY29uc3RydWN0b3JcbiAqL1xuY29uc3QgcmVzb2x2ZUFyZ3MgPSAoYXJnMT86IFVua25vd25GdW5jdGlvbiB8IENhbmNlbFRva2VuIHwgbnVsbCwgYXJnMj86IENhbmNlbFRva2VuIHwgbnVsbCk6IFtVbmtub3duRnVuY3Rpb24sIENhbmNlbFRva2VuIHwgbnVsbCB8IHVuZGVmaW5lZF0gPT4ge1xuICAgIGlmIChpc0Z1bmN0aW9uKGFyZzEpKSB7XG4gICAgICAgIHJldHVybiBbYXJnMSwgYXJnMl07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFtub29wLCBhcmcxXTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEBlbiBgRGVmZXJyZWRgIG9iamVjdCBjbGFzcyB0aGF0IGNhbiBvcGVyYXRlIGByZWplY3RgIGFuZGAgcmVzb2x2ZWAgZnJvbSB0aGUgb3V0c2lkZS5cbiAqIEBqYSBgcmVqZWN0YCwgYCByZXNvbHZlYCDjgpLlpJbpg6jjgojjgormk43kvZzlj6/og73jgaogYERlZmVycmVkYCDjgqrjg5bjgrjjgqfjgq/jg4jjgq/jg6njgrlcbiAqIFxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBkZiA9IG5ldyBEZWZlcnJlZCgpO1xuICogZGYucmVzb2x2ZSgpO1xuICogZGYucmVqZWN0KCdyZWFzb24nKTtcbiAqIFxuICogYXdhaXQgZGY7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIERlZmVycmVkPFQgPSB2b2lkPiBleHRlbmRzIENhbmNlbGFibGVQcm9taXNlPFQ+IHtcbiAgICByZWFkb25seSByZXNvbHZlITogKGFyZzogVCB8IFByb21pc2VMaWtlPFQ+KSA9PiB2b2lkO1xuICAgIHJlYWRvbmx5IHJlamVjdCE6IChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYW5jZWxUb2tlblxuICAgICAqICAtIGBlbmAge0BsaW5rIENhbmNlbFRva2VufSBpbnN0YW5jZSBjcmVhdGUgZnJvbSB7QGxpbmsgQ2FuY2VsVG9rZW4uc291cmNlIHwgQ2FuY2VsVG9rZW4uc291cmNlfSgpLlxuICAgICAqICAtIGBqYWAge0BsaW5rIENhbmNlbFRva2VuLnNvdXJjZSB8IENhbmNlbFRva2VuLnNvdXJjZX0oKSDjgojjgorkvZzmiJDjgZfjgZ8ge0BsaW5rIENhbmNlbFRva2VufSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihjYW5jZWxUb2tlbj86IENhbmNlbFRva2VuIHwgbnVsbCk7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGV4ZWN1dG9yXG4gICAgICogIC0gYGVuYCBBIGNhbGxiYWNrIHVzZWQgdG8gaW5pdGlhbGl6ZSB0aGUgcHJvbWlzZS4gVGhpcyBjYWxsYmFjayBpcyBwYXNzZWQgdHdvIGFyZ3VtZW50cyBgcmVzb2x2ZWAgYW5kIGByZWplY3RgLlxuICAgICAqICAtIGBqYWAgcHJvbWlzZSDjga7liJ3mnJ/ljJbjgavkvb/nlKjjgZnjgovjgrPjg7zjg6vjg5Djg4Pjgq/jgpLmjIflrpouIGByZXNvbHZlYCDjgaggYHJlamVjdGAg44GuMuOBpOOBruW8leaVsOOCkuaMgeOBpFxuICAgICAqIEBwYXJhbSBjYW5jZWxUb2tlblxuICAgICAqICAtIGBlbmAge0BsaW5rIENhbmNlbFRva2VufSBpbnN0YW5jZSBjcmVhdGUgZnJvbSB7QGxpbmsgQ2FuY2VsVG9rZW4uc291cmNlIHwgQ2FuY2VsVG9rZW4uc291cmNlfSgpLlxuICAgICAqICAtIGBqYWAge0BsaW5rIENhbmNlbFRva2VuLnNvdXJjZSB8IENhbmNlbFRva2VuLnNvdXJjZX0oKSDjgojjgorkvZzmiJDjgZfjgZ8ge0BsaW5rIENhbmNlbFRva2VufSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgZXhlY3V0b3I6IChyZXNvbHZlOiAodmFsdWU/OiBUIHwgUHJvbWlzZUxpa2U8VD4pID0+IHZvaWQsIHJlamVjdDogKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQpID0+IHZvaWQsXG4gICAgICAgIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsXG4gICAgKTtcblxuICAgIGNvbnN0cnVjdG9yKGFyZzE/OiBVbmtub3duRnVuY3Rpb24gfCBDYW5jZWxUb2tlbiB8IG51bGwsIGFyZzI/OiBDYW5jZWxUb2tlbiB8IG51bGwpIHtcbiAgICAgICAgY29uc3QgW2V4ZWN1dG9yLCBjYW5jZWxUb2tlbl0gPSByZXNvbHZlQXJncyhhcmcxLCBhcmcyKTtcbiAgICAgICAgY29uc3QgcHVibGljYXRpb25zID0ge307XG4gICAgICAgIHN1cGVyKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24ocHVibGljYXRpb25zLCB7IHJlc29sdmUsIHJlamVjdCB9KTtcbiAgICAgICAgICAgIGV4ZWN1dG9yKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgIH0sIGNhbmNlbFRva2VuKTtcbiAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLCBwdWJsaWNhdGlvbnMpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1mbG9hdGluZy1wcm9taXNlc1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgc3RhdHVzIG9mIHRoaXMgaW5zdGFuY2UuIDxicj5cbiAgICAgKiAgICAgSXQncyBwcmFjdGljYWJsZSBieSBgYXN5bmMgZnVuY3Rpb25gLlxuICAgICAqIEBqYSBEZWZlcnJlZCDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7nirbmhYvjgpLnorroqo0gPGJyPlxuICAgICAqICAgICBgYXN5bmMgZnVuY3Rpb25gIOOBp+S9v+eUqOWPr+iDvVxuICAgICAqL1xuICAgIHN0YXR1cygpOiBQcm9taXNlPCdwZW5kaW5nJyB8ICdmdWxmaWxsZWQnIHwgJ3JlamVjdGVkJz4ge1xuICAgICAgICByZXR1cm4gY2hlY2tTdGF0dXModGhpcyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpOiAnRGVmZXJyZWQnIHsgcmV0dXJuICdEZWZlcnJlZCc7IH1cbiAgICAvKiogQGludGVybmFsICovXG4gICAgc3RhdGljIGdldCBbU3ltYm9sLnNwZWNpZXNdKCk6IFByb21pc2VDb25zdHJ1Y3RvciB7IHJldHVybiBOYXRpdmVQcm9taXNlOyB9XG59XG4iLCJpbXBvcnQgeyBDYW5jZWxUb2tlblNvdXJjZSB9IGZyb20gJy4vY2FuY2VsLXRva2VuJztcbmltcG9ydCB7IHdhaXQgfSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIG1hbmFnZXMgbHVtcGluZyBtdWx0aXBsZSBgUHJvbWlzZWAgb2JqZWN0cy4gPGJyPlxuICogICAgIEl0J3MgcG9zc2libGUgdG8gbWFrZSB0aGVtIGNhbmNlbCBtb3JlIHRoYW4gb25lIGBQcm9taXNlYCB3aGljaCBoYW5kbGVzIGRpZmZlcmVudCB7QGxpbmsgQ2FuY2VsVG9rZW59IGJ5IGx1bXBpbmcuXG4gKiBAamEg6KSH5pWwIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4jjgpLkuIDmi6znrqHnkIbjgZnjgovjgq/jg6njgrkgPGJyPlxuICogICAgIOeVsOOBquOCiyB7QGxpbmsgQ2FuY2VsVG9rZW59IOOCkuaJseOBhuikh+aVsOOBriBgUHJvbWlzZWAg44KS5LiA5ous44Gn44Kt44Oj44Oz44K744Or44GV44Gb44KL44GT44Go44GM5Y+v6IO9XG4gKi9cbmV4cG9ydCBjbGFzcyBQcm9taXNlTWFuYWdlciB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcG9vbCA9IG5ldyBNYXA8UHJvbWlzZTx1bmtub3duPiwgKChyZWFzb246IHVua25vd24pID0+IHVua25vd24pIHwgdW5kZWZpbmVkPigpO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBhIGBQcm9taXNlYCBvYmplY3QgdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4jjgpLnrqHnkIbkuIvjgavov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9taXNlXG4gICAgICogIC0gYGVuYCBhbnkgYFByb21pc2VgIGluc3RhbmNlIGlzIGF2YWlsYWJsZS5cbiAgICAgKiAgLSBgamFgIOS7u+aEj+OBriBgUHJvbWlzZWAg44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIGNhbmNlbFNvdXJjZVxuICAgICAqICAtIGBlbmAge0BsaW5rIENhbmNlbFRva2VuU291cmNlfSBpbnN0YW5jZSBtYWRlIGJ5IHtAbGluayBDYW5jZWxUb2tlbi5zb3VyY2UgfCBDYW5jZWxUb2tlbi5zb3VyY2V9KCkuXG4gICAgICogIC0gYGphYCB7QGxpbmsgQ2FuY2VsVG9rZW4uc291cmNlIHwgQ2FuY2VsVG9rZW4uc291cmNlfSgpIOOBp+eUn+aIkOOBleOCjOOCiyB7QGxpbmsgQ2FuY2VsVG9rZW5Tb3VyY2V9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZXR1cm4gdGhlIHNhbWUgaW5zdGFuY2Ugb2YgaW5wdXQgYHByb21pc2VgIGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg5YWl5Yqb44GX44GfIGBwcm9taXNlYCDjgajlkIzkuIDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkPFQ+KHByb21pc2U6IFByb21pc2U8VD4sIGNhbmNlbFNvdXJjZT86IENhbmNlbFRva2VuU291cmNlKTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHRoaXMuX3Bvb2wuc2V0KHByb21pc2UsIGNhbmNlbFNvdXJjZT8uY2FuY2VsKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcblxuICAgICAgICBjb25zdCBhbHdheXMgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgICAgICB0aGlzLl9wb29sLmRlbGV0ZShwcm9taXNlKTtcbiAgICAgICAgICAgIGlmIChjYW5jZWxTb3VyY2UpIHtcbiAgICAgICAgICAgICAgICBjYW5jZWxTb3VyY2UuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBwcm9taXNlXG4gICAgICAgICAgICAudGhlbihhbHdheXMsIGFsd2F5cyk7XG5cbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbGVhc2VkIGFsbCBpbnN0YW5jZXMgdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOCkuegtOajhFxuICAgICAqL1xuICAgIHB1YmxpYyByZWxlYXNlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9wb29sLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBgcHJvbWlzZWAgYXJyYXkgZnJvbSB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44GuIFByb21pc2Ug44KS6YWN5YiX44Gn5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHByb21pc2VzKCk6IFByb21pc2U8dW5rbm93bj5bXSB7XG4gICAgICAgIHJldHVybiBbLi4udGhpcy5fcG9vbC5rZXlzKCldO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYWxsIGBQcm9taXNlLmFsbCgpYCBmb3IgdW5kZXIgdGhlIG1hbmFnZW1lbnQuIDxicj5cbiAgICAgKiAgICAgV2FpdCBmb3IgYWxsIGBmdWxmaWxsZWRgLlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgavlr77jgZfjgaYgYFByb21pc2UuYWxsKClgIDxicj5cbiAgICAgKiAgICAg44GZ44G544Gm44GMIGBmdWxmaWxsZWRgIOOBq+OBquOCi+OBvuOBp+W+heapn1xuICAgICAqL1xuICAgIHB1YmxpYyBhbGwoKTogUHJvbWlzZTx1bmtub3duW10+IHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHRoaXMucHJvbWlzZXMoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbGwgYFByb21pc2UucmFjZSgpYCBmb3IgdW5kZXIgdGhlIG1hbmFnZW1lbnQuIDxicj5cbiAgICAgKiAgICAgV2FpdCBmb3IgYW55IGBzZXR0bGVkYC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44Gr5a++44GX44GmIGBQcm9taXNlLnJhY2UoKWAgPGJyPlxuICAgICAqICAgICDjgYTjgZrjgozjgYvjgYwgYHNldHRsZWRgIOOBq+OBquOCi+OBvuOBp+W+heapn1xuICAgICAqL1xuICAgIHB1YmxpYyByYWNlKCk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yYWNlKHRoaXMucHJvbWlzZXMoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbGwge0BsaW5rIHdhaXR9KCkgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50LiA8YnI+XG4gICAgICogICAgIFdhaXQgZm9yIGFsbCBgc2V0dGxlZGAuIChzaW1wbGlmaWVkIHZlcnNpb24pXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBq+WvvuOBl+OBpiB7QGxpbmsgd2FpdH0oKSA8YnI+XG4gICAgICogICAgIOOBmeOBueOBpuOBjCBgc2V0dGxlZGAg44Gr44Gq44KL44G+44Gn5b6F5qmfICjnsKHmmJPjg5Djg7zjgrjjg6fjg7MpXG4gICAgICovXG4gICAgcHVibGljIHdhaXQoKTogUHJvbWlzZTx1bmtub3duW10+IHtcbiAgICAgICAgcmV0dXJuIHdhaXQodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FsbCBgUHJvbWlzZS5hbGxTZXR0bGVkKClgIGZvciB1bmRlciB0aGUgbWFuYWdlbWVudC4gPGJyPlxuICAgICAqICAgICBXYWl0IGZvciBhbGwgYHNldHRsZWRgLlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgavlr77jgZfjgaYgYFByb21pc2UuYWxsU2V0dGxlZCgpYCA8YnI+XG4gICAgICogICAgIOOBmeOBueOBpuOBjCBgc2V0dGxlZGAg44Gr44Gq44KL44G+44Gn5b6F5qmfXG4gICAgICovXG4gICAgcHVibGljIGFsbFNldHRsZWQoKTogUHJvbWlzZTxQcm9taXNlU2V0dGxlZFJlc3VsdDx1bmtub3duPltdPiB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbFNldHRsZWQodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FsbCBgUHJvbWlzZS5hbnkoKWAgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50LiA8YnI+XG4gICAgICogICAgIFdhaXQgZm9yIGFueSBgZnVsZmlsbGVkYC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44Gr5a++44GX44GmIGBQcm9taXNlLmFueSgpYCA8YnI+XG4gICAgICogICAgIOOBhOOBmuOCjOOBi+OBjCBgZnVsZmlsbGVkYCDjgavjgarjgovjgb7jgaflvoXmqZ9cbiAgICAgKi9cbiAgICBwdWJsaWMgYW55KCk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbnkodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW52b2tlIGBjYW5jZWxgIG1lc3NhZ2UgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50IHByb21pc2VzLlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjga4gYFByb21pc2VgIOOBq+WvvuOBl+OBpuOCreODo+ODs+OCu+ODq+OCkueZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIHJlYXNvblxuICAgICAqICAtIGBlbmAgYXJndW1lbnRzIGZvciBgY2FuY2VsU291cmNlYFxuICAgICAqICAtIGBqYWAgYGNhbmNlbFNvdXJjZWAg44Gr5rih44GV44KM44KL5byV5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIGBQcm9taXNlYCBpbnN0YW5jZSB3aGljaCB3YWl0IGJ5IHVudGlsIGNhbmNlbGxhdGlvbiBjb21wbGV0aW9uLlxuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744Or5a6M5LqG44G+44Gn5b6F5qmf44GZ44KLIGBQcm9taXNlYCDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgYWJvcnQ8VD4ocmVhc29uPzogVCk6IFByb21pc2U8dW5rbm93bltdPiB7XG4gICAgICAgIGZvciAoY29uc3QgY2FuY2VsZXIgb2YgdGhpcy5fcG9vbC52YWx1ZXMoKSkge1xuICAgICAgICAgICAgaWYgKGNhbmNlbGVyKSB7XG4gICAgICAgICAgICAgICAgY2FuY2VsZXIoXG4gICAgICAgICAgICAgICAgICAgIHJlYXNvbiA/PyBuZXcgRXJyb3IoJ2Fib3J0JylcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3YWl0KHRoaXMucHJvbWlzZXMoKSk7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbIl90b2tlbnMiLCJ2ZXJpZnkiLCJFdmVudEJyb2tlciIsImlzRnVuY3Rpb24iLCJnZXRDb25maWciLCJub29wIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUVBLGlCQUF3QixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDekQsaUJBQXdCLE1BQU0sTUFBTSxHQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQXdDeEQ7Ozs7O0lBS0c7SUFDSSxNQUFNLG1CQUFtQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDN0MsSUFBQSxNQUFNLEVBQUUsS0FBSztJQUNiLElBQUEsV0FBVyxNQUFpQjtJQUMvQixDQUFBLENBQWlCOztJQ2RsQixpQkFBaUIsTUFBTUEsU0FBTyxHQUFHLElBQUksT0FBTyxFQUFtQyxDQUFDO0lBRWhGO0lBQ0Es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