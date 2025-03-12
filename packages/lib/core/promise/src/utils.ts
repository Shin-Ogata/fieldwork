import type { CancelToken } from './cancel-token';

/**
 * @en Cancelable base option definition.
 * @ja キャンセル可能な基底オプション
 */
export interface Cancelable {
    cancel?: CancelToken;
}

//__________________________________________________________________________________________________//

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
export function wait(promises: Promise<unknown>[]): Promise<unknown[]> {
    const safePromises = promises.map((promise) => promise.catch((e) => e));
    return Promise.all(safePromises);
}

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
 *  - `en` {@link CancelToken} reference. (enable `undefined`)
 *  - `ja` {@link CancelToken} を指定 (undefined 可)
 */
export function checkCanceled(token: CancelToken | undefined): Promise<void> {
    return Promise.resolve(undefined, token);
}

/**
 * @en Check the status of the promise instance. <br>
 *     It's practicable by `async function`.
 * @ja Promise インスタンスの状態を確認 <br>
 *     `async function` で使用可能
 *
 * @example <br>
 *
 * ```ts
 * import { checkStatus } from '@cdp/runtime';
 *
 * let promise: Promise<unknown>; // some promise instance
 * :
 * const status = await checkStatus(promise);
 * console.log(status);
 * // 'pending' or 'fulfilled' or 'rejected'
 * ```
 *
 * @param promise
 *  - `en` Promise instance
 *  - `ja` Promise インスタンスを指定
 */
export function checkStatus(promise: Promise<unknown>): Promise<'pending' | 'fulfilled' | 'rejected'> {
    const pending = {};
    /*
     * Promise 派生クラスでも使用するためには, `instance.constructor.race` でアクセスする必要がある
     * promise が派生クラスである場合, Promise.race() を使用すると必ず `pending` object が返されてしまう
     */
    return (promise.constructor as PromiseConstructor).race([promise, pending])
        .then(v => (v === pending) ? 'pending' : 'fulfilled', () => 'rejected');
}
