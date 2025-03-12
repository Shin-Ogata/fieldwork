import { verify } from '@cdp/core-utils';
import { EventBroker, type Subscription } from '@cdp/events';
import {
    type CancelTokenContext,
    _cancel,
    _close,
    CancelTokenState,
    invalidSubscription,
} from './internal';

/**
 * @en Cancellation source interface.
 * @ja キャンセル管理インターフェイス
 */
export interface CancelTokenSource<T = unknown> {
    /**
     * @en {@link CancelToken} getter.
     * @ja {@link CancelToken} 取得
     */
    readonly token: CancelToken<T>;

    /**
     * @en Execute cancel.
     * @ja キャンセル実行
     *
     * @param reason
     *  - `en` cancellation reason. this arg is transmitted in promise chain.
     *  - `ja` キャンセルの理由を指定. `Promise` チェインに伝達される.
     */
    cancel(reason: T): void;

    /**
     * @en Break up cancellation reception.
     * @ja キャンセル受付を終了
     */
    close(): void;
}

/** @internal */ const _tokens = new WeakMap<CancelToken, CancelTokenContext>();

/** @internal */
function getContext<T = unknown>(instance: CancelToken<T>): CancelTokenContext<T> {
    if (!_tokens.has(instance)) {
        throw new TypeError('The object is not a valid CancelToken.');
    }
    return _tokens.get(instance) as CancelTokenContext<T>;
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
export class CancelToken<T = unknown> {

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
    public static source<T = unknown>(...linkedTokens: CancelToken[]): CancelTokenSource<T> {
        let cancel!: (reason: T) => void;
        let close!: () => void;
        const token = new CancelToken<T>((onCancel, onClose) => {
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
    constructor(
        executor: (cancel: (reason: T) => void, close: () => void) => void,
        ...linkedTokens: CancelToken[]
    ) {
        verify('instanceOf', CancelToken, this);
        verify('typeOf', 'function', executor);

        const linkedTokenSet = new Set(linkedTokens.filter(t => _tokens.has(t)));
        let status = CancelTokenState.OPEN;
        for (const t of linkedTokenSet) {
            status |= getContext(t).status;
        }

        const context: CancelTokenContext<T> = {
            broker: new EventBroker(),
            subscriptions: new Set(),
            reason: undefined,
            status,
        };
        _tokens.set(this, Object.seal(context));

        const cancel = this[_cancel];
        const close = this[_close];
        if (status === CancelTokenState.OPEN) {
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
    get reason(): T | undefined {
        return getContext(this).reason;
    }

    /**
     * @en Enable cancellation state accessor.
     * @ja キャンセル可能か判定
     */
    get cancelable(): boolean {
        return getContext(this).status === CancelTokenState.OPEN;
    }

    /**
     * @en Cancellation requested state accessor.
     * @ja キャンセルを受け付けているか判定
     */
    get requested(): boolean {
        return !!(getContext(this).status & CancelTokenState.REQUESTED);
    }

    /**
     * @en Cancellation closed state accessor.
     * @ja キャンセル受付を終了しているか判定
     */
    get closed(): boolean {
        return !!(getContext(this).status & CancelTokenState.CLOSED);
    }

    /**
     * @en `toString` tag override.
     * @ja `toString` タグのオーバーライド
     */
    protected get [Symbol.toStringTag](): 'CancelToken' { return 'CancelToken'; }

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
    public register(onCancel: (reason: T) => unknown): Subscription {
        const context = getContext(this);
        if (!this.cancelable) {
            return invalidSubscription;
        }
        return context.broker.on('cancel', onCancel);
    }

    /** @internal */
    private [_cancel](reason: T): void {
        const context = getContext(this);
        verify('notNullish', reason);
        if (!this.cancelable) {
            return;
        }
        context.reason = reason;
        context.status |= CancelTokenState.REQUESTED;
        for (const s of context.subscriptions) {
            s.unsubscribe();
        }
        context.broker.trigger('cancel', reason);
        void Promise.resolve().then(() => this[_close]());
    }

    /** @internal */
    private [_close](): void {
        const context = getContext(this);
        if (this.closed) {
            return;
        }
        context.status |= CancelTokenState.CLOSED;
        for (const s of context.subscriptions) {
            s.unsubscribe();
        }
        context.subscriptions.clear();
        context.broker.off();
    }
}
