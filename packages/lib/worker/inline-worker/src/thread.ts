import { Cancelable, CancelToken } from '@cdp/promise';
import { InlineWorker } from './inine-worker';

/**
 * @en Thread options
 * @en スレッドオプション
 */
export type ThreadOptions = Cancelable & WorkerOptions;

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
export function thread<T>(executor: () => T | Promise<T>, options?: ThreadOptions): Promise<T> {
    const { cancel: originalToken } = options || {};

    // already cancel
    if (originalToken?.requested) {
        throw originalToken.reason;
    }

    const exec = `(async (self) => {
        try {
            const result = await (${executor.toString()})();
            self.postMessage(result);
        } catch (e) {
            setTimeout(function() { throw e; });
        }
    })(self);`;

    const worker = new InlineWorker(exec, options);

    const abort = (): void => worker.terminate();
    originalToken?.register(abort);
    const { token } = CancelToken.source(originalToken as CancelToken);

    return new Promise((resolve, reject) => {
        worker.onerror = ev => {
            ev.preventDefault();
            reject(ev);
            worker.terminate();
        };
        worker.onmessage = ev => {
            resolve(ev.data);
            worker.terminate();
        };
    }, token);
}
