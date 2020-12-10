import {
    isFunction,
    isString,
    className,
    safe,
} from '@cdp/core-utils';

/**
 * @en [[InlineWorker]] source type definition.
 * @ja [[InlineWorker]] に指定可能なソース型定義
 */
export type InlienWorkerSource = ((self: Worker) => unknown) | string;

/** @internal */ const URL    = safe(globalThis.URL);
/** @internal */ const Worker = safe(globalThis.Worker);
/** @internal */ const Blob   = safe(globalThis.Blob);

/** @internal */
function createWorkerContext(src: InlienWorkerSource): string {
    if (!(isFunction(src) || isString(src))) {
        throw new TypeError(`${className(src)} is not a function or string.`);
    }
    return URL.createObjectURL(new Blob([isFunction(src) ? `(${src.toString()})(self);` : src], { type: 'application/javascript' }));
}

/**
 * @en Specified `Worker` class which doesn't require a script file.
 * @ja スクリプトファイルを必要としない `Worker` クラス
 */
export class InlineWorker extends Worker {
    /** @internal */
    private _context: string;

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
    constructor(src: InlienWorkerSource, options?: WorkerOptions) {
        const context = createWorkerContext(src);
        super(context, options);
        this._context = context;
    }

///////////////////////////////////////////////////////////////////////
// override: Worker

    terminate(): void {
        super.terminate();
        URL.revokeObjectURL(this._context);
    }
}
