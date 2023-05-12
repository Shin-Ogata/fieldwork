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
}
