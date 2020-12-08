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
 * const result = await thread(() => exec(arg));
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
