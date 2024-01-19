import { CancelToken } from './cancel-token';
import { CancelablePromise } from './cancelable-promise';
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
export declare class Deferred<T = void> extends CancelablePromise<T> {
    readonly resolve: (arg: T | PromiseLike<T>) => void;
    readonly reject: (reason?: unknown) => void;
    /**
     * constructor
     *
     * @param cancelToken
     *  - `en` {@link CancelToken} instance create from {@link CancelToken.source | CancelToken.source}().
     *  - `ja` {@link CancelToken.source | CancelToken.source}() より作成した {@link CancelToken} インスタンスを指定
     */
    constructor(cancelToken?: CancelToken | null);
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
    constructor(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void, cancelToken?: CancelToken | null);
    /**
     * @en Check the status of this instance. <br>
     *     It's practicable by `async function`.
     * @ja Deferred インスタンスの状態を確認 <br>
     *     `async function` で使用可能
     */
    status(): Promise<'pending' | 'fulfilled' | 'rejected'>;
}
