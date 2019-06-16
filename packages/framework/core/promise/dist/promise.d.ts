/*!
 * @cdp/promise 0.9.0
 *   promise utility module
 */
// Dependencies for this module:
//   ../@cdp/event-publisher

declare module '@cdp/promise' {
    export * from '@cdp/promise/cancel-token';
    export * from '@cdp/promise/cancelable-promise';
    export * from '@cdp/promise/utils';
}

declare module '@cdp/promise/cancel-token' {
    import { Subscription } from '@cdp/event-publisher';
    /**
        * @en Cancellation source interface.
        * @ja キャンセル管理インターフェイス
        */
    export interface CancelTokenSource<T extends {} = {}> {
            /**
                * @en [[CancelToken]] getter.
                * @ja [[CancelToken]] 取得
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
    export class CancelToken<T extends {} = {}> {
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
            static source<T extends {} = {}>(...linkedTokens: CancelToken[]): CancelTokenSource<T>;
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
            constructor(executor: (cancel: (reason: T) => void, close: () => void) => void, ...linkedTokens: CancelToken[]);
            /**
                * @en Cancellation reason accessor.
                * @ja キャンセルの原因取得
                */
            readonly reason: T | undefined;
            /**
                * @en Enable cancellation state accessor.
                * @ja キャンセル可能か判定
                */
            readonly cancelable: boolean;
            /**
                * @en Cancellation requested state accessor.
                * @ja キャンセルを受け付けているか判定
                */
            readonly requested: boolean;
            /**
                * @en Cancellation closed state accessor.
                * @ja キャンセル受付を終了しているか判定
                */
            readonly closed: boolean;
            /**
                * @en `toString` tag override.
                * @ja `toString` タグのオーバーライド
                */
            protected readonly [Symbol.toStringTag]: 'CancelToken';
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
}

declare module '@cdp/promise/cancelable-promise' {
    import { CancelToken } from '@cdp/promise/cancel-token';
    global {
            interface PromiseConstructor {
                    new <T>(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void, cancelToken?: CancelToken | null): Promise<T>;
                    resolve<T>(value?: T | PromiseLike<T>, cancelToken?: CancelToken | null): Promise<T>;
            }
    }
    /** `Native Promise` constructor */
    const NativePromise: PromiseConstructor;
    /**
        * @en Extended `Promise` class which enabled cancellation. <br>
        *     `Native Promise` constructor is overridden by framework default behaviour.
        * @ja キャンセルを可能にした `Promise` 拡張クラス <br>
        *     既定で `Native Promise` をオーバーライドする.
        */
    class CancelablePromise<T> extends NativePromise<T> {
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
            constructor(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void, cancelToken?: CancelToken | null);
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
    export function extendPromise(enable: boolean): PromiseConstructor;
    export { CancelablePromise, CancelablePromise as Promise, };
}

declare module '@cdp/promise/utils' {
    import { CancelToken, CancelTokenSource } from '@cdp/promise/cancel-token';
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
    export function wait(promises: Promise<unknown>[]): Promise<unknown[]>;
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
    export function checkCanceled(token: CancelToken | undefined): Promise<void>;
    /**
        * @en Presume whether it's a canceled error.
        * @ja キャンセルされたエラーであるか推定
        *
        * @param error
        *  - `en` an error object handled in `catch` block.
        *  - `ja` `catch` 節などで補足したエラーを指定
        */
    export function isChancelLikeError(error: unknown): boolean;
    /**
        * @en The class manages lumping multiple `Promise` objects. <br>
        *     It's possible to make them cancel more than one `Promise` which handles different [[CancelToken]] by lumping.
        * @ja 複数 `Promise` オブジェクトを一括管理するクラス <br>
        *     異なる [[CancelToken]] を扱う複数の `Promise` を一括でキャンセルさせることが可能
        */
    export class PromiseManager {
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
            add<T>(promise: Promise<T>, cancelSource?: CancelTokenSource): Promise<T>;
            /**
                * @en Released all instances under the management.
                * @ja 管理対象を破棄
                */
            release(): void;
            /**
                * @en Return `promise` array from under the management.
                * @ja 管理対象の Promise を配列で取得
                */
            promises(): Promise<unknown>[];
            /**
                * @en Call `Promise.all()` for under the management.
                * @ja 管理対象に対して `Promise.all()`
                */
            all(): Promise<unknown[]>;
            /**
                * @en Call `Promise.race()` for under the management.
                * @ja 管理対象に対して `Promise.race()`
                */
            race(): Promise<unknown>;
            /**
                * @en Call [[wait]]() for under the management.
                * @ja 管理対象に対して [[wait]]()
                */
            wait(): Promise<unknown[]>;
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
            abort<T>(reason?: T): Promise<unknown[]>;
    }
}

