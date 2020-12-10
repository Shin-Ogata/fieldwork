import { Cancelable } from '@cdp/promise';
/**
 * @en Thread options
 * @en スレッドオプション
 */
export declare type ThreadOptions = Cancelable & WorkerOptions;
/**
 * @en Ensure execution in worker thread.
 * @ja ワーカースレッド内で実行を保証
 *
 * @example <br>
 *
 * ```ts
 * const exec = () => {
 *    // this scope is worker scope. you cannot use closure access.
 *    const param = {...};
 *    const method = (p) => {...};
 *    :
 *    return method(param);
 * };
 *
 * const result = await thread(exec);
 * ```
 *
 * @param executor
 *  - `en` implement as function scope.
 *  - `ja` 関数スコープとして実装
 * @param options
 *  - `en` thread options
 *  - `ja` スレッドオプション
 */
export declare function thread<T>(executor: () => T | Promise<T>, options?: ThreadOptions): Promise<T>;
