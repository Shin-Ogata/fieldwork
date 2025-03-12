import {
    type UnknownFunction,
    isFunction,
    noop,
} from '@cdp/core-utils';
import type { CancelToken } from './cancel-token';
import { CancelablePromise, NativePromise } from './cancelable-promise';
import { checkStatus } from './utils';

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
const resolveArgs = (arg1?: UnknownFunction | CancelToken | null, arg2?: CancelToken | null): [UnknownFunction, CancelToken | null | undefined] => {
    if (isFunction(arg1)) {
        return [arg1, arg2];
    } else {
        return [noop, arg1];
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
export class Deferred<T = void> extends CancelablePromise<T> {
    readonly resolve!: (arg: T | PromiseLike<T>) => void;
    readonly reject!: (reason?: unknown) => void;

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
    constructor(
        executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void,
        cancelToken?: CancelToken | null
    );

    constructor(arg1?: UnknownFunction | CancelToken | null, arg2?: CancelToken | null) {
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
    status(): Promise<'pending' | 'fulfilled' | 'rejected'> {
        return checkStatus(this);
    }

    /** @internal */
    get [Symbol.toStringTag](): 'Deferred' { return 'Deferred'; }
    /** @internal */
    static get [Symbol.species](): PromiseConstructor { return NativePromise; }
}
