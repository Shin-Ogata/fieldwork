/**
 * @en {@link InlineWorker} source type definition.
 * @ja {@link InlineWorker} に指定可能なソース型定義
 */
export type InlienWorkerSource = ((self: Worker) => unknown) | string;
/**
 * @en Specified `Worker` class which doesn't require a script file.
 * @ja スクリプトファイルを必要としない `Worker` クラス
 */
export declare class InlineWorker extends Worker {
    /**
     * constructor
     *
     * @param src
     *  - `en` source function or script body.
     *  - `ja` 実行関数またはスクリプト実体
     * @param options
     *  - `en` worker options.
     *  - `ja` Worker オプション
     */
    constructor(src: InlienWorkerSource, options?: WorkerOptions);
    /**
     * @en For BLOB release. When calling `close ()` in the Worker, call this method as well.
     * @ja BLOB 解放用. Worker 内で `close()` を呼ぶ場合, 本メソッドもコールすること.
     */
    terminate(): void;
}
