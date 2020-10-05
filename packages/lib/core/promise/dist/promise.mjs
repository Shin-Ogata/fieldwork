/*!
 * @cdp/promise 0.9.0
 *   promise utility module
 */

import { verify, isFunction, getConfig } from '@cdp/core-utils';
import { EventBroker } from '@cdp/events';

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
        verify('instanceOf', CancelToken, this);
        verify('typeOf', 'function', executor);
        const linkedTokenSet = new Set(linkedTokens.filter(t => _tokens.has(t)));
        let status = 0 /* OPEN */;
        for (const t of linkedTokenSet) {
            status |= getContext(t).status;
        }
        const context = {
            broker: new EventBroker(),
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
        verify('notNil', reason);
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
        verify('instanceOf', NativePromise, src);
        let p;
        if (!(token instanceof CancelToken)) {
            p = src;
        }
        else if (thenArgs && (!isFunction(thenArgs[0]) || isFunction(thenArgs[1]))) {
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
extendPromise(!getConfig().noAutomaticNativeExtend);

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

export { CancelToken, CancelablePromise, CancelablePromise as Promise, PromiseManager, checkCanceled, extendPromise, wait };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS5tanMiLCJzb3VyY2VzIjpbImludGVybmFsLnRzIiwiY2FuY2VsLXRva2VuLnRzIiwiY2FuY2VsYWJsZS1wcm9taXNlLnRzIiwidXRpbHMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvYmFuLXR5cGVzXG4gKi9cblxuaW1wb3J0IHsgRXZlbnRCcm9rZXIsIFN1YnNjcmlwdGlvbiB9IGZyb20gJ0BjZHAvZXZlbnRzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IF9jYW5jZWwgPSBTeW1ib2woJ2NhbmNlbCcpO1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IF9jbG9zZSA9IFN5bWJvbCgnY2xvc2UnKTtcblxuLyoqXG4gKiBAZW4gQ2FuY2VsVG9rZW4gc3RhdGUgZGVmaW5pdGlvbnMuXG4gKiBAamEgQ2FuY2VsVG9rZW4g44Gu54q25oWL5a6a576pXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIENhbmNlbFRva2VuU3RhdGUge1xuICAgIC8qKiDjgq3jg6Pjg7Pjgrvjg6vlj5fku5jlj6/og70gKi9cbiAgICBPUEVOICAgICAgICA9IDB4MCxcbiAgICAvKiog44Kt44Oj44Oz44K744Or5Y+X5LuY5riI44G/ICovXG4gICAgUkVRVUVTVEVEICAgPSAweDEsXG4gICAgLyoqIOOCreODo+ODs+OCu+ODq+WPl+S7mOS4jeWPryAqL1xuICAgIENMT1NFRCAgICAgID0gMHgyLFxufVxuXG4vKipcbiAqIEBlbiBDYW5jZWwgZXZlbnQgZGVmaW5pdGlvbnMuXG4gKiBAamEg44Kt44Oj44Oz44K744Or44Kk44OZ44Oz44OI5a6a576pXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuY2VsRXZlbnQ8VD4ge1xuICAgIGNhbmNlbDogW1RdO1xufVxuXG4vKipcbiAqIEBlbiBJbnRlcm5hbCBDYW5jZWxUb2tlbiBpbnRlcmZhY2UuXG4gKiBAamEgQ2FuY2VsVG9rZW4g44Gu5YaF6YOo44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuY2VsVG9rZW5Db250ZXh0PFQgZXh0ZW5kcyB7fT4ge1xuICAgIHJlYWRvbmx5IGJyb2tlcjogRXZlbnRCcm9rZXI8Q2FuY2VsRXZlbnQ8VD4+O1xuICAgIHJlYWRvbmx5IHN1YnNjcmlwdGlvbnM6IFNldDxTdWJzY3JpcHRpb24+O1xuICAgIHJlYXNvbjogVCB8IHVuZGVmaW5lZDtcbiAgICBzdGF0dXM6IENhbmNlbFRva2VuU3RhdGU7XG59XG5cbi8qKlxuICogQGVuIEludmFsaWQgc3Vic2NyaXB0aW9uIG9iamVjdCBkZWNsYXJhdGlvbi5cbiAqIEBqYSDnhKHlirnjgaogU3Vic2NyaXB0aW9uIOOCquODluOCuOOCp+OCr+ODiFxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY29uc3QgaW52YWxpZFN1YnNjcmlwdGlvbiA9IE9iamVjdC5mcmVlemUoe1xuICAgIGVuYWJsZTogZmFsc2UsXG4gICAgdW5zdWJzY3JpYmUoKSB7IC8qIG5vb3AgKi8gfVxufSkgYXMgU3Vic2NyaXB0aW9uO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBuby1yZWRlY2xhcmVcbiAsICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L2Jhbi10eXBlc1xuICovXG5cbmltcG9ydCB7IHZlcmlmeSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudEJyb2tlciwgU3Vic2NyaXB0aW9uIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBfY2FuY2VsLFxuICAgIF9jbG9zZSxcbiAgICBDYW5jZWxUb2tlblN0YXRlLFxuICAgIENhbmNlbFRva2VuQ29udGV4dCxcbiAgICBpbnZhbGlkU3Vic2NyaXB0aW9uLFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqXG4gKiBAZW4gQ2FuY2VsbGF0aW9uIHNvdXJjZSBpbnRlcmZhY2UuXG4gKiBAamEg44Kt44Oj44Oz44K744Or566h55CG44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuY2VsVG9rZW5Tb3VyY2U8VCBleHRlbmRzIHt9ID0ge30+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gW1tDYW5jZWxUb2tlbl1dIGdldHRlci5cbiAgICAgKiBAamEgW1tDYW5jZWxUb2tlbl1dIOWPluW+l1xuICAgICAqL1xuICAgIHJlYWRvbmx5IHRva2VuOiBDYW5jZWxUb2tlbjxUPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGNhbmNlbC5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVhc29uXG4gICAgICogIC0gYGVuYCBjYW5jZWxsYXRpb24gcmVhc29uLiB0aGlzIGFyZyBpcyB0cmFuc21pdHRlZCBpbiBwcm9taXNlIGNoYWluLlxuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744Or44Gu55CG55Sx44KS5oyH5a6aLiBgUHJvbWlzZWAg44OB44Kn44Kk44Oz44Gr5Lyd6YGU44GV44KM44KLLlxuICAgICAqL1xuICAgIGNhbmNlbChyZWFzb246IFQpOiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEJyZWFrIHVwIGNhbmNlbGxhdGlvbiByZWNlcHRpb24uXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+WPl+S7mOOCkue1guS6hlxuICAgICAqL1xuICAgIGNsb3NlKCk6IHZvaWQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF90b2tlbnMgPSBuZXcgV2Vha01hcDxDYW5jZWxUb2tlbjxhbnk+LCBDYW5jZWxUb2tlbkNvbnRleHQ8YW55Pj4oKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gZ2V0Q29udGV4dDxUPihpbnN0YW5jZTogQ2FuY2VsVG9rZW48VD4pOiBDYW5jZWxUb2tlbkNvbnRleHQ8VD4ge1xuICAgIGlmICghX3Rva2Vucy5oYXMoaW5zdGFuY2UpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBvYmplY3QgaXMgbm90IGEgdmFsaWQgQ2FuY2VsVG9rZW4uJyk7XG4gICAgfVxuICAgIHJldHVybiBfdG9rZW5zLmdldChpbnN0YW5jZSkgYXMgQ2FuY2VsVG9rZW5Db250ZXh0PFQ+O1xufVxuXG4vKipcbiAqIEBlbiBUaGUgdG9rZW4gb2JqZWN0IHRvIHdoaWNoIHVuaWZpY2F0aW9uIHByb2Nlc3NpbmcgZm9yIGFzeW5jaHJvbm91cyBwcm9jZXNzaW5nIGNhbmNlbGxhdGlvbiBpcyBvZmZlcmVkLiA8YnI+XG4gKiAgICAgT3JpZ2luIGlzIGBDYW5jZWxsYXRpb25Ub2tlbmAgb2YgYC5ORVQgRnJhbWV3b3JrYC5cbiAqIEBqYSDpnZ7lkIzmnJ/lh6bnkIbjgq3jg6Pjg7Pjgrvjg6vjga7jgZ/jgoHjga7ntbHkuIDlh6bnkIbjgpLmj5DkvpvjgZnjgovjg4jjg7zjgq/jg7Pjgqrjg5bjgrjjgqfjgq/jg4ggPGJyPlxuICogICAgIOOCquODquOCuOODiuODq+OBryBgLk5FVCBGcmFtZXdvcmtgIOOBriBgQ2FuY2VsbGF0aW9uVG9rZW5gXG4gKlxuICogQHNlZSBodHRwczovL2RvY3MubWljcm9zb2Z0LmNvbS9lbi11cy9kb3RuZXQvc3RhbmRhcmQvdGhyZWFkaW5nL2NhbmNlbGxhdGlvbi1pbi1tYW5hZ2VkLXRocmVhZHNcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbiAqIGBgYFxuICpcbiAqIC0gQmFzaWMgVXNhZ2VcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgdG9rZW4gPSBuZXcgQ2FuY2VsVG9rZW4oKGNhbmNlbCwgY2xvc2UpID0+IHtcbiAqICAgYnV0dG9uMS5vbmNsaWNrID0gZXYgPT4gY2FuY2VsKG5ldyBFcnJvcignQ2FuY2VsJykpO1xuICogICBidXR0b24yLm9uY2xpY2sgPSBldiA9PiBjbG9zZSgpO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBvclxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB7IGNhbmNlbCwgY2xvc2UsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTtcbiAqIGJ1dHRvbjEub25jbGljayA9IGV2ID0+IGNhbmNlbChuZXcgRXJyb3IoJ0NhbmNlbCcpKTtcbiAqIGJ1dHRvbjIub25jbGljayA9IGV2ID0+IGNsb3NlKCk7XG4gKiBgYGBcbiAqXG4gKiAtIFVzZSB3aXRoIFByb21pc2VcbiAqXG4gKiBgYGB0c1xuICogY29uc3QgeyBjYW5jZWwsIGNsb3NlLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7XG4gKiBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKG9rLCBuZykgPT4geyAuLi4gfSwgdG9rZW4pO1xuICogcHJvbWlzZVxuICogICAudGhlbiguLi4pXG4gKiAgIC50aGVuKC4uLilcbiAqICAgLnRoZW4oLi4uKVxuICogICAuY2F0Y2gocmVhc29uID0+IHtcbiAqICAgICAvLyBjaGVjayByZWFzb25cbiAqICAgfSk7XG4gKiBgYGBcbiAqXG4gKiAtIFJlZ2lzdGVyICYgVW5yZWdpc3RlciBjYWxsYmFjayhzKVxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB7IGNhbmNlbCwgY2xvc2UsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTtcbiAqIGNvbnN0IHN1YnNjcmlwdGlvbiA9IHRva2VuLnJlZ2lzdGVyKHJlYXNvbiA9PiB7XG4gKiAgIGNvbnNvbGUubG9nKHJlYXNvbi5tZXNzYWdlKTtcbiAqIH0pO1xuICogaWYgKHNvbWVDYXNlKSB7XG4gKiAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBDYW5jZWxUb2tlbjxUIGV4dGVuZHMge30gPSB7fT4ge1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBbW0NhbmNlbFRva2VuU291cmNlXV0gaW5zdGFuY2UuXG4gICAgICogQGphIFtbQ2FuY2VsVG9rZW5Tb3VyY2VdXSDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7lj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaW5rZWRUb2tlbnNcbiAgICAgKiAgLSBgZW5gIHJlbGF0aW5nIGFscmVhZHkgbWFkZSBbW0NhbmNlbFRva2VuXV0gaW5zdGFuY2UuXG4gICAgICogICAgICAgIFlvdSBjYW4gYXR0YWNoIHRvIHRoZSB0b2tlbiB0aGF0IHRvIGJlIGEgY2FuY2VsbGF0aW9uIHRhcmdldC5cbiAgICAgKiAgLSBgamFgIOOBmeOBp+OBq+S9nOaIkOOBleOCjOOBnyBbW0NhbmNlbFRva2VuXV0g6Zai6YCj5LuY44GR44KL5aC05ZCI44Gr5oyH5a6aXG4gICAgICogICAgICAgIOa4oeOBleOCjOOBnyB0b2tlbiDjga/jgq3jg6Pjg7Pjgrvjg6vlr77osaHjgajjgZfjgabntJDjgaXjgZHjgonjgozjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHNvdXJjZTxUIGV4dGVuZHMge30gPSB7fT4oLi4ubGlua2VkVG9rZW5zOiBDYW5jZWxUb2tlbltdKTogQ2FuY2VsVG9rZW5Tb3VyY2U8VD4ge1xuICAgICAgICBsZXQgY2FuY2VsITogKHJlYXNvbjogVCkgPT4gdm9pZDtcbiAgICAgICAgbGV0IGNsb3NlITogKCkgPT4gdm9pZDtcbiAgICAgICAgY29uc3QgdG9rZW4gPSBuZXcgQ2FuY2VsVG9rZW48VD4oKG9uQ2FuY2VsLCBvbkNsb3NlKSA9PiB7XG4gICAgICAgICAgICBjYW5jZWwgPSBvbkNhbmNlbDtcbiAgICAgICAgICAgIGNsb3NlID0gb25DbG9zZTtcbiAgICAgICAgfSwgLi4ubGlua2VkVG9rZW5zKTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5mcmVlemUoeyB0b2tlbiwgY2FuY2VsLCBjbG9zZSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGV4ZWN1dG9yXG4gICAgICogIC0gYGVuYCBleGVjdXRlciB0aGF0IGhhcyBgY2FuY2VsYCBhbmQgYGNsb3NlYCBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODqy/jgq/jg63jg7zjgrog5a6f6KGM44Kz44O844Or44OQ44OD44Kv44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGxpbmtlZFRva2Vuc1xuICAgICAqICAtIGBlbmAgcmVsYXRpbmcgYWxyZWFkeSBtYWRlIFtbQ2FuY2VsVG9rZW5dXSBpbnN0YW5jZS5cbiAgICAgKiAgICAgICAgWW91IGNhbiBhdHRhY2ggdG8gdGhlIHRva2VuIHRoYXQgdG8gYmUgYSBjYW5jZWxsYXRpb24gdGFyZ2V0LlxuICAgICAqICAtIGBqYWAg44GZ44Gn44Gr5L2c5oiQ44GV44KM44GfIFtbQ2FuY2VsVG9rZW5dXSDplqLpgKPku5jjgZHjgovloLTlkIjjgavmjIflrppcbiAgICAgKiAgICAgICAg5rih44GV44KM44GfIHRva2VuIOOBr+OCreODo+ODs+OCu+ODq+WvvuixoeOBqOOBl+OBpue0kOOBpeOBkeOCieOCjOOCi1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBleGVjdXRvcjogKGNhbmNlbDogKHJlYXNvbjogVCkgPT4gdm9pZCwgY2xvc2U6ICgpID0+IHZvaWQpID0+IHZvaWQsXG4gICAgICAgIC4uLmxpbmtlZFRva2VuczogQ2FuY2VsVG9rZW5bXVxuICAgICkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBDYW5jZWxUb2tlbiwgdGhpcyk7XG4gICAgICAgIHZlcmlmeSgndHlwZU9mJywgJ2Z1bmN0aW9uJywgZXhlY3V0b3IpO1xuXG4gICAgICAgIGNvbnN0IGxpbmtlZFRva2VuU2V0ID0gbmV3IFNldChsaW5rZWRUb2tlbnMuZmlsdGVyKHQgPT4gX3Rva2Vucy5oYXModCkpKTtcbiAgICAgICAgbGV0IHN0YXR1cyA9IENhbmNlbFRva2VuU3RhdGUuT1BFTjtcbiAgICAgICAgZm9yIChjb25zdCB0IG9mIGxpbmtlZFRva2VuU2V0KSB7XG4gICAgICAgICAgICBzdGF0dXMgfD0gZ2V0Q29udGV4dCh0KS5zdGF0dXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb250ZXh0OiBDYW5jZWxUb2tlbkNvbnRleHQ8VD4gPSB7XG4gICAgICAgICAgICBicm9rZXI6IG5ldyBFdmVudEJyb2tlcigpLFxuICAgICAgICAgICAgc3Vic2NyaXB0aW9uczogbmV3IFNldCgpLFxuICAgICAgICAgICAgcmVhc29uOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBzdGF0dXMsXG4gICAgICAgIH07XG4gICAgICAgIF90b2tlbnMuc2V0KHRoaXMsIE9iamVjdC5zZWFsKGNvbnRleHQpKTtcblxuICAgICAgICBjb25zdCBjYW5jZWwgPSB0aGlzW19jYW5jZWxdO1xuICAgICAgICBjb25zdCBjbG9zZSA9IHRoaXNbX2Nsb3NlXTtcbiAgICAgICAgaWYgKHN0YXR1cyA9PT0gQ2FuY2VsVG9rZW5TdGF0ZS5PUEVOKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHQgb2YgbGlua2VkVG9rZW5TZXQpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0LnN1YnNjcmlwdGlvbnMuYWRkKHQucmVnaXN0ZXIoY2FuY2VsLmJpbmQodGhpcykpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZ2lzdGVyKGNhbmNlbC5iaW5kKHQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4ZWN1dG9yKGNhbmNlbC5iaW5kKHRoaXMpLCBjbG9zZS5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FuY2VsbGF0aW9uIHJlYXNvbiBhY2Nlc3Nvci5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or44Gu5Y6f5Zug5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHJlYXNvbigpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIGdldENvbnRleHQodGhpcykucmVhc29uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFbmFibGUgY2FuY2VsbGF0aW9uIHN0YXRlIGFjY2Vzc29yLlxuICAgICAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vlj6/og73jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgY2FuY2VsYWJsZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIGdldENvbnRleHQodGhpcykuc3RhdHVzID09PSBDYW5jZWxUb2tlblN0YXRlLk9QRU47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbmNlbGxhdGlvbiByZXF1ZXN0ZWQgc3RhdGUgYWNjZXNzb3IuXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+OCkuWPl+OBkeS7mOOBkeOBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCByZXF1ZXN0ZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIShnZXRDb250ZXh0KHRoaXMpLnN0YXR1cyAmIENhbmNlbFRva2VuU3RhdGUuUkVRVUVTVEVEKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FuY2VsbGF0aW9uIGNsb3NlZCBzdGF0ZSBhY2Nlc3Nvci5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or5Y+X5LuY44KS57WC5LqG44GX44Gm44GE44KL44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGNsb3NlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhKGdldENvbnRleHQodGhpcykuc3RhdHVzICYgQ2FuY2VsVG9rZW5TdGF0ZS5DTE9TRUQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBgdG9TdHJpbmdgIHRhZyBvdmVycmlkZS5cbiAgICAgKiBAamEgYHRvU3RyaW5nYCDjgr/jgrDjga7jgqrjg7zjg5Djg7zjg6njgqTjg4lcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6ICdDYW5jZWxUb2tlbicgeyByZXR1cm4gJ0NhbmNlbFRva2VuJzsgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIGN1c3RvbSBjYW5jZWxsYXRpb24gY2FsbGJhY2suXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+aZguOBruOCq+OCueOCv+ODoOWHpueQhuOBrueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIG9uQ2FuY2VsXG4gICAgICogIC0gYGVuYCBjYW5jZWwgb3BlcmF0aW9uIGNhbGxiYWNrXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6vjgrPjg7zjg6vjg5Djg4Pjgq9cbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYFN1YnNjcmlwdGlvbmAgaW5zdGFuY2UuXG4gICAgICogICAgICAgIFlvdSBjYW4gcmV2b2tlIGNhbmNlbGxhdGlvbiB0byBjYWxsIGB1bnN1YnNjcmliZWAgbWV0aG9kLlxuICAgICAqICAtIGBqYWAgYFN1YnNjcmlwdGlvbmAg44Kk44Oz44K544K/44Oz44K5XG4gICAgICogICAgICAgIGB1bnN1YnNjcmliZWAg44Oh44K944OD44OJ44KS5ZG844G244GT44Go44Gn44Kt44Oj44Oz44K744Or44KS54Sh5Yq544Gr44GZ44KL44GT44Go44GM5Y+v6IO9XG4gICAgICovXG4gICAgcHVibGljIHJlZ2lzdGVyKG9uQ2FuY2VsOiAocmVhc29uOiBUKSA9PiB1bmtub3duKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGdldENvbnRleHQodGhpcyk7XG4gICAgICAgIGlmICghdGhpcy5jYW5jZWxhYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4gaW52YWxpZFN1YnNjcmlwdGlvbjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29udGV4dC5icm9rZXIub24oJ2NhbmNlbCcsIG9uQ2FuY2VsKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX2NhbmNlbF0ocmVhc29uOiBUKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBnZXRDb250ZXh0KHRoaXMpO1xuICAgICAgICB2ZXJpZnkoJ25vdE5pbCcsIHJlYXNvbik7XG4gICAgICAgIGlmICghdGhpcy5jYW5jZWxhYmxlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5yZWFzb24gPSByZWFzb247XG4gICAgICAgIGNvbnRleHQuc3RhdHVzIHw9IENhbmNlbFRva2VuU3RhdGUuUkVRVUVTVEVEO1xuICAgICAgICBmb3IgKGNvbnN0IHMgb2YgY29udGV4dC5zdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5icm9rZXIudHJpZ2dlcignY2FuY2VsJywgcmVhc29uKTtcbiAgICAgICAgdm9pZCBQcm9taXNlLnJlc29sdmUoKS50aGVuKCgpID0+IHRoaXNbX2Nsb3NlXSgpKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBbX2Nsb3NlXSgpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGdldENvbnRleHQodGhpcyk7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQuc3RhdHVzIHw9IENhbmNlbFRva2VuU3RhdGUuQ0xPU0VEO1xuICAgICAgICBmb3IgKGNvbnN0IHMgb2YgY29udGV4dC5zdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICBzLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5zdWJzY3JpcHRpb25zLmNsZWFyKCk7XG4gICAgICAgIGNvbnRleHQuYnJva2VyLm9mZigpO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgbm8tZ2xvYmFsLWFzc2lnblxuICwgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQge1xuICAgIGlzRnVuY3Rpb24sXG4gICAgdmVyaWZ5LFxuICAgIGdldENvbmZpZyxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IENhbmNlbFRva2VuIH0gZnJvbSAnLi9jYW5jZWwtdG9rZW4nO1xuXG5kZWNsYXJlIGdsb2JhbCB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG5cbiAgICBpbnRlcmZhY2UgUHJvbWlzZUNvbnN0cnVjdG9yIHtcbiAgICAgICAgbmV3IDxUPihleGVjdXRvcjogKHJlc29sdmU6ICh2YWx1ZT86IFQgfCBQcm9taXNlTGlrZTxUPikgPT4gdm9pZCwgcmVqZWN0OiAocmVhc29uPzogYW55KSA9PiB2b2lkKSA9PiB2b2lkLCBjYW5jZWxUb2tlbj86IENhbmNlbFRva2VuIHwgbnVsbCk6IFByb21pc2U8VD47XG4gICAgICAgIHJlc29sdmU8VD4odmFsdWU/OiBUIHwgUHJvbWlzZUxpa2U8VD4sIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsKTogUHJvbWlzZTxUPjtcbiAgICB9XG5cbn1cblxuLyoqIGBOYXRpdmUgUHJvbWlzZWAgY29uc3RydWN0b3IgKi9cbmNvbnN0IE5hdGl2ZVByb21pc2UgPSBQcm9taXNlO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2NyZWF0ZSA9IFN5bWJvbCgnY3JlYXRlJyk7XG4vKiogQGludGVybmFsICovXG5jb25zdCBfdG9rZW5zID0gbmV3IFdlYWtNYXA8UHJvbWlzZTx1bmtub3duPiwgQ2FuY2VsVG9rZW4+KCk7XG5cbi8qKlxuICogQGVuIEV4dGVuZGVkIGBQcm9taXNlYCBjbGFzcyB3aGljaCBlbmFibGVkIGNhbmNlbGxhdGlvbi4gPGJyPlxuICogICAgIGBOYXRpdmUgUHJvbWlzZWAgY29uc3RydWN0b3IgaXMgb3ZlcnJpZGRlbiBieSBmcmFtZXdvcmsgZGVmYXVsdCBiZWhhdmlvdXIuXG4gKiBAamEg44Kt44Oj44Oz44K744Or44KS5Y+v6IO944Gr44GX44GfIGBQcm9taXNlYCDmi6HlvLXjgq/jg6njgrkgPGJyPlxuICogICAgIOaXouWumuOBpyBgTmF0aXZlIFByb21pc2VgIOOCkuOCquODvOODkOODvOODqeOCpOODieOBmeOCiy5cbiAqL1xuY2xhc3MgQ2FuY2VsYWJsZVByb21pc2U8VD4gZXh0ZW5kcyBOYXRpdmVQcm9taXNlPFQ+IHtcblxuICAgIC8qKlxuICAgICAqIEBlbiBPdmVycmlkaW5nIG9mIHRoZSBkZWZhdWx0IGNvbnN0cnVjdG9yIHVzZWQgZm9yIGdlbmVyYXRpb24gb2YgYW4gb2JqZWN0LlxuICAgICAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7nlJ/miJDjgavkvb/jgo/jgozjgovjg4fjg5Xjgqnjg6vjg4jjgrPjg7Pjgrnjg4jjg6njgq/jgr/jga7jgqrjg7zjg5Djg7zjg6njgqTjg4lcbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXQgW1N5bWJvbC5zcGVjaWVzXSgpOiBQcm9taXNlQ29uc3RydWN0b3IgeyByZXR1cm4gTmF0aXZlUHJvbWlzZTsgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZXMgYSBuZXcgcmVzb2x2ZWQgcHJvbWlzZSBmb3IgdGhlIHByb3ZpZGVkIHZhbHVlLlxuICAgICAqIEBqYSDmlrDopo/jgavop6PmsbrmuIjjgb8gcHJvbWlzZSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJBcbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB0aGUgdmFsdWUgdHJhbnNtaXR0ZWQgaW4gcHJvbWlzZSBjaGFpbi5cbiAgICAgKiAgLSBgamFgIGBQcm9taXNlYCDjgavkvJ3pgZTjgZnjgovlgKRcbiAgICAgKiBAcGFyYW0gY2FuY2VsVG9rZW5cbiAgICAgKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSBpbnN0YW5jZSBjcmVhdGUgZnJvbSBbW0NhbmNlbFRva2VuXV0uYHNvdXJjZSgpYC5cbiAgICAgKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXS5gc291cmNlKClgIOOCiOOCiuS9nOaIkOOBl+OBnyBbW0NhbmNlbFRva2VuXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gICAgICovXG4gICAgc3RhdGljIHJlc29sdmU8VD4odmFsdWU/OiBUIHwgUHJvbWlzZUxpa2U8VD4sIGNhbmNlbFRva2VuPzogQ2FuY2VsVG9rZW4gfCBudWxsKTogQ2FuY2VsYWJsZVByb21pc2U8VD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlXShzdXBlci5yZXNvbHZlKHZhbHVlKSwgY2FuY2VsVG9rZW4pO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgcHJpdmF0ZSBjb25zdHJ1Y3Rpb24gKi9cbiAgICBwcml2YXRlIHN0YXRpYyBbX2NyZWF0ZV08VCwgVFJlc3VsdDEgPSBULCBUUmVzdWx0MiA9IG5ldmVyPihcbiAgICAgICAgc3JjOiBQcm9taXNlPFQ+LFxuICAgICAgICB0b2tlbj86IENhbmNlbFRva2VuIHwgbnVsbCxcbiAgICAgICAgdGhlbkFyZ3M/OiBbXG4gICAgICAgICAgICAoKHZhbHVlOiBUKSA9PiBUUmVzdWx0MSB8IFByb21pc2VMaWtlPFRSZXN1bHQxPikgfCBudWxsIHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgKChyZWFzb246IGFueSkgPT4gVFJlc3VsdDIgfCBQcm9taXNlTGlrZTxUUmVzdWx0Mj4pIHwgbnVsbCB8IHVuZGVmaW5lZFxuICAgICAgICBdIHwgbnVsbFxuICAgICk6IENhbmNlbGFibGVQcm9taXNlPFRSZXN1bHQxIHwgVFJlc3VsdDI+IHtcbiAgICAgICAgdmVyaWZ5KCdpbnN0YW5jZU9mJywgTmF0aXZlUHJvbWlzZSwgc3JjKTtcblxuICAgICAgICBsZXQgcDogUHJvbWlzZTxUIHwgVFJlc3VsdDEgfCBUUmVzdWx0Mj47XG4gICAgICAgIGlmICghKHRva2VuIGluc3RhbmNlb2YgQ2FuY2VsVG9rZW4pKSB7XG4gICAgICAgICAgICBwID0gc3JjO1xuICAgICAgICB9IGVsc2UgaWYgKHRoZW5BcmdzICYmICghaXNGdW5jdGlvbih0aGVuQXJnc1swXSkgfHwgaXNGdW5jdGlvbih0aGVuQXJnc1sxXSkpKSB7XG4gICAgICAgICAgICBwID0gc3JjO1xuICAgICAgICB9IGVsc2UgaWYgKHRva2VuLmNhbmNlbGFibGUpIHtcbiAgICAgICAgICAgIGxldCBzOiBTdWJzY3JpcHRpb247XG4gICAgICAgICAgICBwID0gbmV3IE5hdGl2ZVByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIHMgPSB0b2tlbi5yZWdpc3RlcihyZWplY3QpO1xuICAgICAgICAgICAgICAgIHN1cGVyLnByb3RvdHlwZS50aGVuLmNhbGwoc3JjLCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCBkaXNwb3NlID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgICAgIHMudW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICBfdG9rZW5zLmRlbGV0ZShwKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBwLnRoZW4oZGlzcG9zZSwgZGlzcG9zZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodG9rZW4ucmVxdWVzdGVkKSB7XG4gICAgICAgICAgICBwID0gc3VwZXIucmVqZWN0KHRva2VuLnJlYXNvbik7XG4gICAgICAgIH0gZWxzZSBpZiAodG9rZW4uY2xvc2VkKSB7XG4gICAgICAgICAgICBwID0gc3JjO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIEV4Y2VwdGlvbicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoZW5BcmdzKSB7XG4gICAgICAgICAgICBwID0gc3VwZXIucHJvdG90eXBlLnRoZW4uYXBwbHkocCwgdGhlbkFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0b2tlbiAmJiB0b2tlbi5jYW5jZWxhYmxlKSB7XG4gICAgICAgICAgICBfdG9rZW5zLnNldChwLCB0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBwIGluc3RhbmNlb2YgdGhpcyB8fCBPYmplY3Quc2V0UHJvdG90eXBlT2YocCwgdGhpcy5wcm90b3R5cGUpO1xuXG4gICAgICAgIHJldHVybiBwIGFzIENhbmNlbGFibGVQcm9taXNlPFRSZXN1bHQxIHwgVFJlc3VsdDI+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZXhlY3V0b3JcbiAgICAgKiAgLSBgZW5gIEEgY2FsbGJhY2sgdXNlZCB0byBpbml0aWFsaXplIHRoZSBwcm9taXNlLiBUaGlzIGNhbGxiYWNrIGlzIHBhc3NlZCB0d28gYXJndW1lbnRzIGByZXNvbHZlYCBhbmQgYHJlamVjdGAuXG4gICAgICogIC0gYGphYCBwcm9taXNlIOOBruWIneacn+WMluOBq+S9v+eUqOOBmeOCi+OCs+ODvOODq+ODkOODg+OCr+OCkuaMh+Wumi4gYHJlc29sdmVgIOOBqCBgcmVqZWN0YCDjga4y44Gk44Gu5byV5pWw44KS5oyB44GkXG4gICAgICogQHBhcmFtIGNhbmNlbFRva2VuXG4gICAgICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gaW5zdGFuY2UgY3JlYXRlIGZyb20gW1tDYW5jZWxUb2tlbl1dLmBzb3VyY2UoKWAuXG4gICAgICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0uYHNvdXJjZSgpYCDjgojjgorkvZzmiJDjgZfjgZ8gW1tDYW5jZWxUb2tlbl1dIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBleGVjdXRvcjogKHJlc29sdmU6ICh2YWx1ZT86IFQgfCBQcm9taXNlTGlrZTxUPikgPT4gdm9pZCwgcmVqZWN0OiAocmVhc29uPzogYW55KSA9PiB2b2lkKSA9PiB2b2lkLFxuICAgICAgICBjYW5jZWxUb2tlbj86IENhbmNlbFRva2VuIHwgbnVsbFxuICAgICkge1xuICAgICAgICBzdXBlcihleGVjdXRvcik7XG4gICAgICAgIHJldHVybiBDYW5jZWxhYmxlUHJvbWlzZVtfY3JlYXRlXSh0aGlzLCBjYW5jZWxUb2tlbik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXR0YWNoZXMgY2FsbGJhY2tzIGZvciB0aGUgcmVzb2x1dGlvbiBhbmQvb3IgcmVqZWN0aW9uIG9mIHRoZSBQcm9taXNlLlxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb25mdWxmaWxsZWQgVGhlIGNhbGxiYWNrIHRvIGV4ZWN1dGUgd2hlbiB0aGUgUHJvbWlzZSBpcyByZXNvbHZlZC5cbiAgICAgKiBAcGFyYW0gb25yZWplY3RlZCBUaGUgY2FsbGJhY2sgdG8gZXhlY3V0ZSB3aGVuIHRoZSBQcm9taXNlIGlzIHJlamVjdGVkLlxuICAgICAqIEByZXR1cm5zIEEgUHJvbWlzZSBmb3IgdGhlIGNvbXBsZXRpb24gb2Ygd2hpY2ggZXZlciBjYWxsYmFjayBpcyBleGVjdXRlZC5cbiAgICAgKi9cbiAgICB0aGVuPFRSZXN1bHQxID0gVCwgVFJlc3VsdDIgPSBuZXZlcj4oXG4gICAgICAgIG9uZnVsZmlsbGVkPzogKCh2YWx1ZTogVCkgPT4gVFJlc3VsdDEgfCBQcm9taXNlTGlrZTxUUmVzdWx0MT4pIHwgbnVsbCxcbiAgICAgICAgb25yZWplY3RlZD86ICgocmVhc29uOiBhbnkpID0+IFRSZXN1bHQyIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDI+KSB8IG51bGxcbiAgICApOiBQcm9taXNlPFRSZXN1bHQxIHwgVFJlc3VsdDI+IHtcbiAgICAgICAgcmV0dXJuIENhbmNlbGFibGVQcm9taXNlW19jcmVhdGVdKHRoaXMsIF90b2tlbnMuZ2V0KHRoaXMpLCBbb25mdWxmaWxsZWQsIG9ucmVqZWN0ZWRdKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBhIGNhbGxiYWNrIGZvciBvbmx5IHRoZSByZWplY3Rpb24gb2YgdGhlIFByb21pc2UuXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvbnJlamVjdGVkIFRoZSBjYWxsYmFjayB0byBleGVjdXRlIHdoZW4gdGhlIFByb21pc2UgaXMgcmVqZWN0ZWQuXG4gICAgICogQHJldHVybnMgQSBQcm9taXNlIGZvciB0aGUgY29tcGxldGlvbiBvZiB0aGUgY2FsbGJhY2suXG4gICAgICovXG4gICAgY2F0Y2g8VFJlc3VsdDIgPSBuZXZlcj4ob25yZWplY3RlZD86ICgocmVhc29uOiBhbnkpID0+IFRSZXN1bHQyIHwgUHJvbWlzZUxpa2U8VFJlc3VsdDI+KSB8IG51bGwpOiBQcm9taXNlPFQgfCBUUmVzdWx0Mj4ge1xuICAgICAgICByZXR1cm4gdGhpcy50aGVuKHVuZGVmaW5lZCwgb25yZWplY3RlZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXR0YWNoZXMgYSBjYWxsYmFjayB0aGF0IGlzIGludm9rZWQgd2hlbiB0aGUgUHJvbWlzZSBpcyBzZXR0bGVkIChmdWxmaWxsZWQgb3IgcmVqZWN0ZWQpLiA8YnI+XG4gICAgICogVGhlIHJlc29sdmVkIHZhbHVlIGNhbm5vdCBiZSBtb2RpZmllZCBmcm9tIHRoZSBjYWxsYmFjay5cbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIG9uZmluYWxseSBUaGUgY2FsbGJhY2sgdG8gZXhlY3V0ZSB3aGVuIHRoZSBQcm9taXNlIGlzIHNldHRsZWQgKGZ1bGZpbGxlZCBvciByZWplY3RlZCkuXG4gICAgICogQHJldHVybnMgQSBQcm9taXNlIGZvciB0aGUgY29tcGxldGlvbiBvZiB0aGUgY2FsbGJhY2suXG4gICAgICovXG4gICAgZmluYWxseShvbmZpbmFsbHk/OiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQgfCBudWxsKTogUHJvbWlzZTxUPiB7XG4gICAgICAgIHJldHVybiBDYW5jZWxhYmxlUHJvbWlzZVtfY3JlYXRlXShzdXBlci5maW5hbGx5KG9uZmluYWxseSksIF90b2tlbnMuZ2V0KHRoaXMpKTtcbiAgICB9XG5cbn1cblxuLyoqXG4gKiBAZW4gU3dpdGNoIHRoZSBnbG9iYWwgYFByb21pc2VgIGNvbnN0cnVjdG9yIGBOYXRpdmUgUHJvbWlzZWAgb3IgW1tDYW5jZWxhYmxlUHJvbWlzZV1dLiA8YnI+XG4gKiAgICAgYE5hdGl2ZSBQcm9taXNlYCBjb25zdHJ1Y3RvciBpcyBvdmVycmlkZGVuIGJ5IGZyYW1ld29yayBkZWZhdWx0IGJlaGF2aW91ci5cbiAqIEBqYSDjgrDjg63jg7zjg5Djg6sgYFByb21pc2VgIOOCs+ODs+OCueODiOODqeOCr+OCv+OCkiBgTmF0aXZlIFByb21pc2VgIOOBvuOBn+OBryBbW0NhbmNlbGFibGVQcm9taXNlXV0g44Gr5YiH44KK5pu/44GIIDxicj5cbiAqICAgICDml6LlrprjgacgYE5hdGl2ZSBQcm9taXNlYCDjgpLjgqrjg7zjg5Djg7zjg6njgqTjg4njgZnjgosuXG4gKlxuICogQHBhcmFtIGVuYWJsZVxuICogIC0gYGVuYCBgdHJ1ZWA6IHVzZSBbW0NhbmNlbGFibGVQcm9taXNlXV0gLyAgYGZhbHNlYDogdXNlIGBOYXRpdmUgUHJvbWlzZWBcbiAqICAtIGBqYWAgYHRydWVgOiBbW0NhbmNlbGFibGVQcm9taXNlXV0g44KS5L2/55SoIC8gYGZhbHNlYDogYE5hdGl2ZSBQcm9taXNlYCDjgpLkvb/nlKhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dGVuZFByb21pc2UoZW5hYmxlOiBib29sZWFuKTogUHJvbWlzZUNvbnN0cnVjdG9yIHtcbiAgICBpZiAoZW5hYmxlKSB7XG4gICAgICAgIFByb21pc2UgPSBDYW5jZWxhYmxlUHJvbWlzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBQcm9taXNlID0gTmF0aXZlUHJvbWlzZTtcbiAgICB9XG4gICAgcmV0dXJuIFByb21pc2U7XG59XG5cbi8qKiBAaW50ZXJuYWwgZ2xvYmFsIGNvbmZpZyBvcHRpb25zICovXG5pbnRlcmZhY2UgR2xvYmFsQ29uZmlnIHtcbiAgICBub0F1dG9tYXRpY05hdGl2ZUV4dGVuZDogYm9vbGVhbjtcbn1cblxuLy8gZGVmYXVsdDogYXV0b21hdGljIG5hdGl2ZSBwcm9taXNlIG92ZXJyaWRlLlxuZXh0ZW5kUHJvbWlzZSghZ2V0Q29uZmlnPEdsb2JhbENvbmZpZz4oKS5ub0F1dG9tYXRpY05hdGl2ZUV4dGVuZCk7XG5cbmV4cG9ydCB7XG4gICAgQ2FuY2VsYWJsZVByb21pc2UsXG4gICAgQ2FuY2VsYWJsZVByb21pc2UgYXMgUHJvbWlzZSxcbn07XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1mdW5jdGlvbi1yZXR1cm4tdHlwZVxuICwgIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1tb2R1bGUtYm91bmRhcnktdHlwZXNcbiAqL1xuXG5pbXBvcnQgeyBDYW5jZWxUb2tlbiwgQ2FuY2VsVG9rZW5Tb3VyY2UgfSBmcm9tICcuL2NhbmNlbC10b2tlbic7XG5cbi8qKlxuICogQGVuIENhbmNlbGFibGUgYmFzZSBvcHRpb24gZGVmaW5pdGlvbi5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vlj6/og73jgarln7rlupXjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5jZWxhYmxlIHtcbiAgICBjYW5jZWw/OiBDYW5jZWxUb2tlbjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFdhaXQgZm9yIHByb21pc2VzIGRvbmUuIDxicj5cbiAqICAgICBXaGlsZSBjb250cm9sIHdpbGwgYmUgcmV0dXJuZWQgaW1tZWRpYXRlbHkgd2hlbiBgUHJvbWlzZS5hbGwoKWAgZmFpbHMsIGJ1dCB0aGlzIG1laHRvZCB3YWl0cyBmb3IgaW5jbHVkaW5nIGZhaWx1cmUuXG4gKiBAamEgYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiOOBrue1guS6huOBvuOBp+W+heapnyA8YnI+XG4gKiAgICAgYFByb21pc2UuYWxsKClgIOOBr+WkseaVl+OBmeOCi+OBqOOBmeOBkOOBq+WItuW+oeOCkui/lOOBmeOBruOBq+WvvuOBl+OAgeWkseaVl+OCguWQq+OCgeOBpuW+heOBpCBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gKlxuICogQHBhcmFtIHByb21pc2VzXG4gKiAgLSBgZW5gIFByb21pc2UgaW5zdGFuY2UgYXJyYXlcbiAqICAtIGBqYWAgUHJvbWlzZSDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7phY3liJfjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdhaXQocHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSk6IFByb21pc2U8dW5rbm93bltdPiB7XG4gICAgY29uc3Qgc2FmZVByb21pc2VzID0gcHJvbWlzZXMubWFwKChwcm9taXNlKSA9PiBwcm9taXNlLmNhdGNoKChlKSA9PiBlKSk7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHNhZmVQcm9taXNlcyk7XG59XG5cbi8qKlxuICogQGVuIENhbmNlbGxhdGlvbiBjaGVja2VyIG1ldGhvZC4gPGJyPlxuICogICAgIEl0J3MgcHJhY3RpY2FibGUgYnkgYGFzeW5jIGZ1bmN0aW9uYC5cbiAqIEBqYSDjgq3jg6Pjg7Pjgrvjg6vjg4Hjgqfjg4Pjgqvjg7wgPGJyPlxuICogICAgIGBhc3luYyBmdW5jdGlvbmAg44Gn5L2/55So5Y+v6IO9XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAgYXN5bmMgZnVuY3Rpb24gc29tZUZ1bmModG9rZW46IENhbmNlbFRva2VuKTogUHJvbWlzZTx7fT4ge1xuICogICAgYXdhaXQgY2hlY2tDYW5jZWxlZCh0b2tlbik7XG4gKiAgICByZXR1cm4ge307XG4gKiAgfVxuICogYGBgXG4gKlxuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjaGVja0NhbmNlbGVkKHRva2VuOiBDYW5jZWxUb2tlbiB8IHVuZGVmaW5lZCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodW5kZWZpbmVkLCB0b2tlbik7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3MgbWFuYWdlcyBsdW1waW5nIG11bHRpcGxlIGBQcm9taXNlYCBvYmplY3RzLiA8YnI+XG4gKiAgICAgSXQncyBwb3NzaWJsZSB0byBtYWtlIHRoZW0gY2FuY2VsIG1vcmUgdGhhbiBvbmUgYFByb21pc2VgIHdoaWNoIGhhbmRsZXMgZGlmZmVyZW50IFtbQ2FuY2VsVG9rZW5dXSBieSBsdW1waW5nLlxuICogQGphIOikh+aVsCBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OI44KS5LiA5ous566h55CG44GZ44KL44Kv44Op44K5IDxicj5cbiAqICAgICDnlbDjgarjgosgW1tDYW5jZWxUb2tlbl1dIOOCkuaJseOBhuikh+aVsOOBriBgUHJvbWlzZWAg44KS5LiA5ous44Gn44Kt44Oj44Oz44K744Or44GV44Gb44KL44GT44Go44GM5Y+v6IO9XG4gKi9cbmV4cG9ydCBjbGFzcyBQcm9taXNlTWFuYWdlciB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGZ1bmMtY2FsbC1zcGFjaW5nXG4gICAgcHJpdmF0ZSByZWFkb25seSBfcG9vbCA9IG5ldyBNYXA8UHJvbWlzZTx1bmtub3duPiwgKChyZWFzb246IHVua25vd24pID0+IHVua25vd24pIHwgdW5kZWZpbmVkPigpO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBhIGBQcm9taXNlYCBvYmplY3QgdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4jjgpLnrqHnkIbkuIvjgavov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9taXNlXG4gICAgICogIC0gYGVuYCBhbnkgYFByb21pc2VgIGluc3RhbmNlIGlzIGF2YWlsYWJsZS5cbiAgICAgKiAgLSBgamFgIOS7u+aEj+OBriBgUHJvbWlzZWAg44Kk44Oz44K544K/44Oz44K5XG4gICAgICogQHBhcmFtIGNhbmNlbFNvdXJjZVxuICAgICAqICAtIGBlbmAgW1tDYW5jZWxUb2tlblNvdXJjZV1dIGluc3RhbmNlIG1hZGUgYnkgYENhbmNlbFRva2VuLnNvdXJjZSgpYC5cbiAgICAgKiAgLSBgamFgIGBDYW5jZWxUb2tlbi5zb3VyY2UoKWAg44Gn55Sf5oiQ44GV44KM44KLIFtbQ2FuY2VsVG9rZW5Tb3VyY2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmV0dXJuIHRoZSBzYW1lIGluc3RhbmNlIG9mIGlucHV0IGBwcm9taXNlYCBpbnN0YW5jZS5cbiAgICAgKiAgLSBgamFgIOWFpeWKm+OBl+OBnyBgcHJvbWlzZWAg44Go5ZCM5LiA44Kk44Oz44K544K/44Oz44K544KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGFkZDxUPihwcm9taXNlOiBQcm9taXNlPFQ+LCBjYW5jZWxTb3VyY2U/OiBDYW5jZWxUb2tlblNvdXJjZSk6IFByb21pc2U8VD4ge1xuICAgICAgICB0aGlzLl9wb29sLnNldChwcm9taXNlLCBjYW5jZWxTb3VyY2UgJiYgY2FuY2VsU291cmNlLmNhbmNlbCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG5cbiAgICAgICAgY29uc3QgYWx3YXlzID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fcG9vbC5kZWxldGUocHJvbWlzZSk7XG4gICAgICAgICAgICBpZiAoY2FuY2VsU291cmNlKSB7XG4gICAgICAgICAgICAgICAgY2FuY2VsU291cmNlLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcHJvbWlzZVxuICAgICAgICAgICAgLnRoZW4oYWx3YXlzLCBhbHdheXMpO1xuXG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWxlYXNlZCBhbGwgaW5zdGFuY2VzIHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgpLnoLTmo4RcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVsZWFzZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcG9vbC5jbGVhcigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYHByb21pc2VgIGFycmF5IGZyb20gdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBriBQcm9taXNlIOOCkumFjeWIl+OBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBwcm9taXNlcygpOiBQcm9taXNlPHVua25vd24+W10ge1xuICAgICAgICByZXR1cm4gWy4uLnRoaXMuX3Bvb2wua2V5cygpXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FsbCBgUHJvbWlzZS5hbGwoKWAgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgavlr77jgZfjgaYgYFByb21pc2UuYWxsKClgXG4gICAgICovXG4gICAgcHVibGljIGFsbCgpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHRoaXMucHJvbWlzZXMoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbGwgYFByb21pc2UucmFjZSgpYCBmb3IgdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOBq+WvvuOBl+OBpiBgUHJvbWlzZS5yYWNlKClgXG4gICAgICovXG4gICAgcHVibGljIHJhY2UoKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJhY2UodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FsbCBbW3dhaXRdXSgpIGZvciB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44Gr5a++44GX44GmIFtbd2FpdF1dKClcbiAgICAgKi9cbiAgICBwdWJsaWMgd2FpdCgpIHtcbiAgICAgICAgcmV0dXJuIHdhaXQodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW52b2tlIGBjYW5jZWxgIG1lc3NhZ2UgZm9yIHVuZGVyIHRoZSBtYW5hZ2VtZW50IHByb21pc2VzLlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjga4gYFByb21pc2VgIOOBq+WvvuOBl+OBpuOCreODo+ODs+OCu+ODq+OCkueZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIHJlYXNvblxuICAgICAqICAtIGBlbmAgYXJndW1lbnRzIGZvciBgY2FuY2VsU291cmNlYFxuICAgICAqICAtIGBqYWAgYGNhbmNlbFNvdXJjZWAg44Gr5rih44GV44KM44KL5byV5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIGBQcm9taXNlYCBpbnN0YW5jZSB3aGljaCB3YWl0IGJ5IHVudGlsIGNhbmNlbGxhdGlvbiBjb21wbGV0aW9uLlxuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744Or5a6M5LqG44G+44Gn5b6F5qmf44GZ44KLIFtbUHJvbWlzZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBhYm9ydDxUPihyZWFzb24/OiBUKTogUHJvbWlzZTx1bmtub3duW10+IHtcbiAgICAgICAgZm9yIChjb25zdCBjYW5jZWxlciBvZiB0aGlzLl9wb29sLnZhbHVlcygpKSB7XG4gICAgICAgICAgICBpZiAoY2FuY2VsZXIpIHtcbiAgICAgICAgICAgICAgICBjYW5jZWxlcihcbiAgICAgICAgICAgICAgICAgICAgKG51bGwgIT0gcmVhc29uKSA/IHJlYXNvbiA6IG5ldyBFcnJvcignYWJvcnQnKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHdhaXQodGhpcy5wcm9taXNlcygpKTtcbiAgICB9XG59XG4iXSwibmFtZXMiOlsiX3Rva2VucyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7O0FBTUE7QUFDTyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDeEM7QUFDTyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7QUF3Q3RDOzs7Ozs7QUFNTyxNQUFNLG1CQUFtQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDN0MsTUFBTSxFQUFFLEtBQUs7SUFDYixXQUFXLE1BQWlCO0NBQy9CLENBQWlCOztBQzFEbEI7Ozs7O0FBNENBO0FBQ0EsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLEVBQTZDLENBQUM7QUFFekU7QUFDQSxTQUFTLFVBQVUsQ0FBSSxRQUF3QjtJQUMzQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUN4QixNQUFNLElBQUksU0FBUyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7S0FDakU7SUFDRCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUEwQixDQUFDO0FBQzFELENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O01BeURhLFdBQVc7Ozs7Ozs7Ozs7O0lBWWIsT0FBTyxNQUFNLENBQW9CLEdBQUcsWUFBMkI7UUFDbEUsSUFBSSxNQUE0QixDQUFDO1FBQ2pDLElBQUksS0FBa0IsQ0FBQztRQUN2QixNQUFNLEtBQUssR0FBRyxJQUFJLFdBQVcsQ0FBSSxDQUFDLFFBQVEsRUFBRSxPQUFPO1lBQy9DLE1BQU0sR0FBRyxRQUFRLENBQUM7WUFDbEIsS0FBSyxHQUFHLE9BQU8sQ0FBQztTQUNuQixFQUFFLEdBQUcsWUFBWSxDQUFDLENBQUM7UUFDcEIsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0tBQ2xEOzs7Ozs7Ozs7Ozs7O0lBY0QsWUFDSSxRQUFrRSxFQUNsRSxHQUFHLFlBQTJCO1FBRTlCLE1BQU0sQ0FBQyxZQUFZLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRXZDLE1BQU0sY0FBYyxHQUFHLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLElBQUksTUFBTSxnQkFBeUI7UUFDbkMsS0FBSyxNQUFNLENBQUMsSUFBSSxjQUFjLEVBQUU7WUFDNUIsTUFBTSxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7U0FDbEM7UUFFRCxNQUFNLE9BQU8sR0FBMEI7WUFDbkMsTUFBTSxFQUFFLElBQUksV0FBVyxFQUFFO1lBQ3pCLGFBQWEsRUFBRSxJQUFJLEdBQUcsRUFBRTtZQUN4QixNQUFNLEVBQUUsU0FBUztZQUNqQixNQUFNO1NBQ1QsQ0FBQztRQUNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUV4QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDN0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNCLElBQUksTUFBTSxtQkFBNEI7WUFDbEMsS0FBSyxNQUFNLENBQUMsSUFBSSxjQUFjLEVBQUU7Z0JBQzVCLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pELElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2pDO1NBQ0o7UUFFRCxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDakQ7Ozs7O0lBTUQsSUFBSSxNQUFNO1FBQ04sT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDO0tBQ2xDOzs7OztJQU1ELElBQUksVUFBVTtRQUNWLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sa0JBQTJCO0tBQzVEOzs7OztJQU1ELElBQUksU0FBUztRQUNULE9BQU8sQ0FBQyxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLHFCQUE4QixDQUFDO0tBQ25FOzs7OztJQU1ELElBQUksTUFBTTtRQUNOLE9BQU8sQ0FBQyxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLGtCQUEyQixDQUFDO0tBQ2hFOzs7OztJQU1ELEtBQWUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFvQixPQUFPLGFBQWEsQ0FBQyxFQUFFOzs7Ozs7Ozs7Ozs7OztJQWV0RSxRQUFRLENBQUMsUUFBZ0M7UUFDNUMsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2xCLE9BQU8sbUJBQW1CLENBQUM7U0FDOUI7UUFDRCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztLQUNoRDs7SUFHTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQVM7UUFDdkIsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDbEIsT0FBTztTQUNWO1FBQ0QsT0FBTyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDeEIsT0FBTyxDQUFDLE1BQU0sc0JBQStCO1FBQzdDLEtBQUssTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLGFBQWEsRUFBRTtZQUNuQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7U0FDbkI7UUFDRCxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDekMsS0FBSyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNyRDs7SUFHTyxDQUFDLE1BQU0sQ0FBQztRQUNaLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDYixPQUFPO1NBQ1Y7UUFDRCxPQUFPLENBQUMsTUFBTSxtQkFBNEI7UUFDMUMsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsYUFBYSxFQUFFO1lBQ25DLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztTQUNuQjtRQUNELE9BQU8sQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDOUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztLQUN4Qjs7O0FDMVFMOzs7O0FBc0JBO0FBQ0EsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDO0FBQzlCO0FBQ0EsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDO0FBQ0EsTUFBTUEsU0FBTyxHQUFHLElBQUksT0FBTyxFQUFpQyxDQUFDO0FBRTdEOzs7Ozs7QUFNQSxNQUFNLGlCQUFxQixTQUFRLGFBQWdCOzs7Ozs7O0lBUS9DLFlBQVksTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUF5QixPQUFPLGFBQWEsQ0FBQyxFQUFFOzs7Ozs7Ozs7Ozs7OztJQWUzRSxPQUFPLE9BQU8sQ0FBSSxLQUEwQixFQUFFLFdBQWdDO1FBQzFFLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUM7S0FDM0Q7O0lBR08sUUFBUSxPQUFPLENBQUMsQ0FDcEIsR0FBZSxFQUNmLEtBQTBCLEVBQzFCLFFBR1E7UUFFUixNQUFNLENBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUV6QyxJQUFJLENBQW1DLENBQUM7UUFDeEMsSUFBSSxFQUFFLEtBQUssWUFBWSxXQUFXLENBQUMsRUFBRTtZQUNqQyxDQUFDLEdBQUcsR0FBRyxDQUFDO1NBQ1g7YUFBTSxJQUFJLFFBQVEsS0FBSyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMxRSxDQUFDLEdBQUcsR0FBRyxDQUFDO1NBQ1g7YUFBTSxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUU7WUFDekIsSUFBSSxDQUFlLENBQUM7WUFDcEIsQ0FBQyxHQUFHLElBQUksYUFBYSxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU07Z0JBQ2xDLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUMzQixLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQzthQUNuRCxDQUFDLENBQUM7WUFDSCxNQUFNLE9BQU8sR0FBRztnQkFDWixDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ2hCQSxTQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3JCLENBQUM7WUFDRixDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztTQUM1QjthQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsRUFBRTtZQUN4QixDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDbEM7YUFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDckIsQ0FBQyxHQUFHLEdBQUcsQ0FBQztTQUNYO2FBQU07WUFDSCxNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7U0FDM0M7UUFFRCxJQUFJLFFBQVEsRUFBRTtZQUNWLENBQUMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQy9DO1FBQ0QsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRTtZQUMzQkEsU0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDekI7UUFFRCxDQUFDLFlBQVksSUFBSSxJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUU5RCxPQUFPLENBQTJDLENBQUM7S0FDdEQ7Ozs7Ozs7Ozs7O0lBWUQsWUFDSSxRQUFpRyxFQUNqRyxXQUFnQztRQUVoQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDaEIsT0FBTyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7S0FDeEQ7Ozs7Ozs7Ozs7SUFXRCxJQUFJLENBQ0EsV0FBcUUsRUFDckUsVUFBdUU7UUFFdkUsT0FBTyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUVBLFNBQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztLQUN6Rjs7Ozs7Ozs7O0lBVUQsS0FBSyxDQUFtQixVQUF1RTtRQUMzRixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0tBQzNDOzs7Ozs7Ozs7O0lBV0QsT0FBTyxDQUFDLFNBQTJDO1FBQy9DLE9BQU8saUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRUEsU0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ2xGO0NBRUo7QUFFRDs7Ozs7Ozs7OztTQVVnQixhQUFhLENBQUMsTUFBZTtJQUN6QyxJQUFJLE1BQU0sRUFBRTtRQUNSLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQztLQUMvQjtTQUFNO1FBQ0gsT0FBTyxHQUFHLGFBQWEsQ0FBQztLQUMzQjtJQUNELE9BQU8sT0FBTyxDQUFDO0FBQ25CLENBQUM7QUFPRDtBQUNBLGFBQWEsQ0FBQyxDQUFDLFNBQVMsRUFBZ0IsQ0FBQyx1QkFBdUIsQ0FBQzs7QUNuTWpFOzs7O0FBZUE7QUFFQTs7Ozs7Ozs7OztTQVVnQixJQUFJLENBQUMsUUFBNEI7SUFDN0MsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDeEUsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3JDLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztTQW1CZ0IsYUFBYSxDQUFDLEtBQThCO0lBQ3hELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDN0MsQ0FBQztBQUVEO0FBRUE7Ozs7OztNQU1hLGNBQWM7SUFBM0I7O1FBRXFCLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBZ0UsQ0FBQztLQTZGcEc7Ozs7Ozs7Ozs7Ozs7OztJQTdFVSxHQUFHLENBQUksT0FBbUIsRUFBRSxZQUFnQztRQUMvRCxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsWUFBWSxJQUFJLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUU3RCxNQUFNLE1BQU0sR0FBRztZQUNYLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzNCLElBQUksWUFBWSxFQUFFO2dCQUNkLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQzthQUN4QjtTQUNKLENBQUM7UUFFRixPQUFPO2FBQ0YsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUUxQixPQUFPLE9BQU8sQ0FBQztLQUNsQjs7Ozs7SUFNTSxPQUFPO1FBQ1YsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztLQUN0Qjs7Ozs7SUFNTSxRQUFRO1FBQ1gsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0tBQ2pDOzs7OztJQU1NLEdBQUc7UUFDTixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7S0FDdkM7Ozs7O0lBTU0sSUFBSTtRQUNQLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztLQUN4Qzs7Ozs7SUFNTSxJQUFJO1FBQ1AsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7S0FDaEM7Ozs7Ozs7Ozs7OztJQWFNLEtBQUssQ0FBSSxNQUFVO1FBQ3RCLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUN4QyxJQUFJLFFBQVEsRUFBRTtnQkFDVixRQUFRLENBQ0osQ0FBQyxJQUFJLElBQUksTUFBTSxJQUFJLE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FDakQsQ0FBQzthQUNMO1NBQ0o7UUFDRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztLQUNoQzs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL3Byb21pc2UvIn0=
