/**
 * @en [[InlineWorker]] source type definition.
 * @ja [[InlineWorker]] に指定可能なソース型定義
 */
export declare type InlienWorkerSource = ((self: Worker) => unknown) | string;
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
    terminate(): void;
}
