import { CancelTokenSource } from './cancel-token';
import { wait } from './utils';

/**
 * @en The class manages lumping multiple `Promise` objects. <br>
 *     It's possible to make them cancel more than one `Promise` which handles different [[CancelToken]] by lumping.
 * @ja 複数 `Promise` オブジェクトを一括管理するクラス <br>
 *     異なる [[CancelToken]] を扱う複数の `Promise` を一括でキャンセルさせることが可能
 */
export class PromiseManager {
    // eslint-disable-next-line func-call-spacing
    private readonly _pool = new Map<Promise<unknown>, ((reason: unknown) => unknown) | undefined>();

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
    public add<T>(promise: Promise<T>, cancelSource?: CancelTokenSource): Promise<T> {
        this._pool.set(promise, cancelSource && cancelSource.cancel); // eslint-disable-line @typescript-eslint/unbound-method

        const always = (): void => {
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
    public release(): void {
        this._pool.clear();
    }

    /**
     * @en Return `promise` array from under the management.
     * @ja 管理対象の Promise を配列で取得
     */
    public promises(): Promise<unknown>[] {
        return [...this._pool.keys()];
    }

    /**
     * @en Call `Promise.all()` for under the management. <br>
     *     Wait for all `fullfilled`.
     * @ja 管理対象に対して `Promise.all()` <br>
     *     すべてが `fullfilled` になるまで待機
     */
    public all(): Promise<unknown[]> {
        return Promise.all(this.promises());
    }

    /**
     * @en Call `Promise.race()` for under the management. <br>
     *     Wait for any `settled`.
     * @ja 管理対象に対して `Promise.race()` <br>
     *     いずれかが `settled` になるまで待機
     */
    public race(): Promise<unknown> {
        return Promise.race(this.promises());
    }

    /**
     * @en Call [[wait]]() for under the management. <br>
     *     Wait for all `settled`. (simplified version)
     * @ja 管理対象に対して [[wait]]() <br>
     *     すべてが `settled` になるまで待機 (簡易バージョン)
     */
    public wait(): Promise<unknown[]> {
        return wait(this.promises());
    }

    /**
     * @en Call `Promise.allSettled()` for under the management. <br>
     *     Wait for all `settled`.
     * @ja 管理対象に対して `Promise.allSettled()` <br>
     *     すべてが `settled` になるまで待機
     */
    public allSettled(): Promise<PromiseSettledResult<unknown>[]> {
        return Promise.allSettled(this.promises());
    }

    /**
     * @en Call `Promise.any()` for under the management. <br>
     *     Wait for any `fullfilled`.
     * @ja 管理対象に対して `Promise.any()` <br>
     *     いずれかが `fullfilled` になるまで待機
     */
    public any(): Promise<unknown> {
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
     *  - `ja` キャンセル完了まで待機する [[Promise]] インスタンス
     */
    public abort<T>(reason?: T): Promise<unknown[]> {
        for (const canceler of this._pool.values()) {
            if (canceler) {
                canceler(
                    (null != reason) ? reason : new Error('abort')
                );
            }
        }
        return wait(this.promises());
    }
}
