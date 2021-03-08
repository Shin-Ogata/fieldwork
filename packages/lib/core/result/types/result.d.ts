/**
 * @en A result holder class. <br>
 *     Derived native `Error` class.
 * @ja 処理結果伝達クラス <br>
 *     ネイティブ `Error` の派生クラス
 */
export declare class Result extends Error {
    /**
     * constructor
     *
     * @param code
     *  - `en` result code
     *  - `ja` 結果コード
     * @param message
     *  - `en` result info message
     *  - `ja` 結果情報メッセージ
     * @param cause
     *  - `en` low-level error information
     *  - `ja` 下位のエラー情報
     */
    constructor(code?: number, message?: string, cause?: unknown);
    /**
     * @en [[RESULT_CODE]] value.
     * @ja [[RESULT_CODE]] の値
     */
    readonly code: number;
    /**
     * @en Stock low-level error information.
     * @ja 下位のエラー情報を格納
     */
    readonly cause: any;
    /**
     * @en Generated time information.
     * @ja 生成された時刻情報
     */
    readonly time: number;
    /**
     * @en Judge succeeded or not.
     * @ja 成功判定
     */
    get isSucceeded(): boolean;
    /**
     * @en Judge failed or not.
     * @ja 失敗判定
     */
    get isFailed(): boolean;
    /**
     * @en Judge canceled or not.
     * @ja キャンセルエラー判定
     */
    get isCanceled(): boolean;
    /**
     * @en Get formatted [[RESULT_CODE]] name string.
     * @ja フォーマットされた [[RESULT_CODE]] 名文字列を取得
     */
    get codeName(): string;
    /**
     * @en Get [[RESULT_CODE]] help string.
     * @ja [[RESULT_CODE]] のヘルプストリングを取得
     */
    get help(): string;
}
/** Returns `true` if `x` is `Result`, `false` otherwise. */
export declare function isResult(x: unknown): x is Result;
/**
 * @en Convert to [[Result]] object.
 * @ja [[Result]] オブジェクトに変換
 */
export declare function toResult(o: unknown): Result;
/**
 * @en Create [[Result]] helper.
 * @ja [[Result]] オブジェクト構築ヘルパー
 *
 * @param code
 *  - `en` result code
 *  - `ja` 結果コード
 * @param message
 *  - `en` result info message
 *  - `ja` 結果情報メッセージ
 * @param cause
 *  - `en` low-level error information
 *  - `ja` 下位のエラー情報
 */
export declare function makeResult(code: number, message?: string, cause?: unknown): Result;
/**
 * @en Create canceled [[Result]] helper.
 * @ja キャンセル情報格納 [[Result]] オブジェクト構築ヘルパー
 *
 * @param message
 *  - `en` result info message
 *  - `ja` 結果情報メッセージ
 * @param cause
 *  - `en` low-level error information
 *  - `ja` 下位のエラー情報
 */
export declare function makeCanceledResult(message?: string, cause?: unknown): Result;
