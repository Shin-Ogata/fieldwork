import { CancelToken, CancelTokenSource } from './cancel-token';
/**
 * @en Cancelable base option definition.
 * @ja キャンセル可能な基底オプション
 */
export interface Cancelable {
    cancel?: CancelToken;
}
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
export declare function wait(promises: Promise<unknown>[]): Promise<unknown[]>;
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
export declare function checkCanceled(token: CancelToken | undefined): Promise<void>;
/**
 * @en Presume whether it's a canceled error.
 * @ja キャンセルされたエラーであるか推定
 *
 * @param error
 *  - `en` an error object handled in `catch` block.
 *  - `ja` `catch` 節などで補足したエラーを指定
 */
export declare function isChancelLikeError(error: unknown): boolean;
/**
 * @en The class manages lumping multiple `Promise` objects. <br>
 *     It's possible to make them cancel more than one `Promise` which handles different [[CancelToken]] by lumping.
 * @ja 複数 `Promise` オブジェクトを一括管理するクラス <br>
 *     異なる [[CancelToken]] を扱う複数の `Promise` を一括でキャンセルさせることが可能
 */
export declare class PromiseManager {
    private readonly _pool;
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
