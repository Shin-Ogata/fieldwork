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
export class Deferred<T = void> extends CancelablePromise<T> {
    readonly resolve!: (arg: T | PromiseLike<T>) => void;
    readonly reject!: (reason?: unknown) => void;

    /**
     * constructor
     *
     * @param cancelToken
     *  - `en` [[CancelToken]] instance create from [[CancelToken]].`source()`.
     *  - `ja` [[CancelToken]].`source()` より作成した [[CancelToken]] インスタンスを指定
     */
    constructor(cancelToken?: CancelToken | null) {
        const publications = {};
        super((resolve, reject) => {
            Object.assign(publications, { resolve, reject });
        }, cancelToken);
        Object.assign(this, publications); // eslint-disable-line @typescript-eslint/no-floating-promises
    }

    /** @internal */
    get [Symbol.toStringTag](): 'Deferred' { return 'Deferred'; }
}