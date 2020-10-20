import { CancelToken } from './cancel-token';
declare global {
    interface PromiseConstructor {
        new <T>(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void, cancelToken?: CancelToken | null): Promise<T>;
        resolve<T>(value?: T | PromiseLike<T>, cancelToken?: CancelToken | null): Promise<T>;
    }
}
/** `Native Promise` constructor */
declare const NativePromise: PromiseConstructor;
/**
 * @en Extended `Promise` class which enabled cancellation. <br>
 *     `Native Promise` constructor is overridden by framework default behaviour.
 * @ja キャンセルを可能にした `Promise` 拡張クラス <br>
 *     既定で `Native Promise` をオーバーライドする.
 */
declare class CancelablePromise<T> extends NativePromise<T> {
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
    constructor(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void, cancelToken?: CancelToken | null);
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
export declare function extendPromise(enable: boolean): PromiseConstructor;
export { CancelablePromise, CancelablePromise as Promise, };
