import { UnknownFunction } from '@cdp/core-utils';
import { Cancelable } from '@cdp/promise';
/**
 * @en Thread options
 * @en スレッドオプション
 */
export interface ThreadOptions<T extends UnknownFunction> extends Cancelable, WorkerOptions {
    args?: Parameters<T>;
}
/**
 * @en Ensure execution in worker thread.
 * @ja ワーカースレッド内で実行を保証
 *
 * @example <br>
 *
 * ```ts
 * const exec = (arg1: number, arg2: string) => {
 *    // this scope is worker scope. you cannot use closure access.
 *    const param = {...};
 *    const method = (p) => {...};
 *    // you can access arguments from options.
 *    console.log(arg1); // '1'
 *    console.log(arg2); // 'test'
 *    :
 *    return method(param);
 * };
 *
 * const arg1 = 1;
 * const arg2 = 'test';
 * const result = await thread(exec, { args: [arg1, arg2] });
 * ```
 *
 * @param executor
 *  - `en` implement as function scope.
 *  - `ja` 関数スコープとして実装
 * @param options
 *  - `en` thread options
 *  - `ja` スレッドオプション
 */
export declare function thread<T, U>(executor: (...args: U[]) => T | Promise<T>, options?: ThreadOptions<typeof executor>): Promise<T>;
