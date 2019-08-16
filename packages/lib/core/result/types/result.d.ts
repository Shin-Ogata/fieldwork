import { ResultCode } from './result-code';
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
    constructor(code?: ResultCode, message?: string, cause?: any);
    /**
     * @en [[ResultCode]] value.
     * @ja [[ResultCode]] の値
     */
    readonly code: ResultCode;
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
    readonly isSucceeded: boolean;
    /**
     * @en Judge failed or not.
     * @ja 失敗判定
     */
    readonly isFailed: boolean;
    /**
     * @en Judge canceled or not.
     * @ja キャンセルエラー判定
     */
    readonly isCanceled: boolean;
    /**
     * @en Get formatted [[ResultCode]] name string.
     * @ja フォーマットされた [[ResultCode]] 名文字列を取得
     */
    readonly codeName: string;
    /**
     * @en Get [[ResultCode]] help string.
     * @ja [[ResultCode]] のヘルプストリングを取得
     */
    readonly help: string;
}
/** Returns `true` if `x` is `Result`, `false` otherwise. */
export declare function isResult(x: unknown): x is Result;
/**
 * @en Transfer [[Result]] object
 * @ja [[Result]] オブジェクトに変換
 */
export declare function toResult(o: unknown): Result;
/**
 * @en Create [[Result]] helper
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
export declare function makeResult(code: ResultCode, message?: string, cause?: any): Result;
/**
 * @en Create canceled [[Result]] helper
 * @ja キャンセル情報格納 [[Result]] オブジェクト構築ヘルパー
 *
 * @param message
 *  - `en` result info message
 *  - `ja` 結果情報メッセージ
 * @param cause
 *  - `en` low-level error information
 *  - `ja` 下位のエラー情報
 */
export declare function makeCanceledResult(message?: string, cause?: any): Result;
