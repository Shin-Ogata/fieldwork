import { type Subscription } from '@cdp/events';
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
export declare class CancelToken<T = unknown> {
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
    static source<T = unknown>(...linkedTokens: CancelToken[]): CancelTokenSource<T>;
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
    constructor(executor: (cancel: (reason: T) => void, close: () => void) => void, ...linkedTokens: CancelToken[]);
    /**
     * @en Cancellation reason accessor.
     * @ja キャンセルの原因取得
     */
    get reason(): T | undefined;
    /**
     * @en Enable cancellation state accessor.
     * @ja キャンセル可能か判定
     */
    get cancelable(): boolean;
    /**
     * @en Cancellation requested state accessor.
     * @ja キャンセルを受け付けているか判定
     */
    get requested(): boolean;
    /**
     * @en Cancellation closed state accessor.
     * @ja キャンセル受付を終了しているか判定
     */
    get closed(): boolean;
    /**
     * @en `toString` tag override.
     * @ja `toString` タグのオーバーライド
     */
    protected get [Symbol.toStringTag](): 'CancelToken';
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
    register(onCancel: (reason: T) => unknown): Subscription;
}
