/**
 * @en Ensure asynchronous execution.
 * @ja 非同期実行を保証
 *
 * @example <br>
 *
 * ```ts
 * post(() => exec(arg));
 * ```
 *
 * @param executor
 *  - `en` implement as function scope.
 *  - `ja` 関数スコープとして実装
*/
export declare function post<T>(executor: () => T): Promise<T>;
/**
 * @en Generic No-Operation.
 * @ja 汎用 No-Operation
 */
export declare function noop(...args: any[]): void;
