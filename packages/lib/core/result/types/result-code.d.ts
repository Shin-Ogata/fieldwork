import ResultCode = CDP.ResultCode;
import RESULT_CODE_BASE = CDP.RESULT_CODE_BASE;
import RESULT_CODE_RANGE = CDP.RESULT_CODE_RANGE;
import LOCAL_CODE_RANGE_GUIDE = CDP.LOCAL_CODE_RANGE_GUIDE;
export { ResultCode, RESULT_CODE_BASE, RESULT_CODE_RANGE, LOCAL_CODE_RANGE_GUIDE, };
/**
 * @en Judge fail or not.
 * @ja 失敗判定
 *
 * @param code [[ResultCode]]
 * @returns true: fail result / false: success result
 */
export declare function FAILED(code: ResultCode): boolean;
/**
 * @en Judge success or not.
 * @ja 成功判定
 *
 * @param code [[ResultCode]]
 * @returns true: success result / false: fail result
 */
export declare function SUCCEEDED(code: ResultCode): boolean;
/**
 * @en Convert to [[ResultCode]] `name` string from [[ResultCode]].
 * @ja [[ResultCode]] を [[ResultCode]] 文字列に変換
 *
 * @param code [[ResultCode]]
 * @param tag  custom tag if needed.
 * @returns name string ex) "[tag][NOT_SUPPORTED]"
 */
export declare function toNameString(code: ResultCode, tag?: string): string;
/**
 * @en Convert to help string from [[ResultCode]].
 * @ja [[ResultCode]] をヘルプストリングに変換
 *
 * @param code [[ResultCode]]
 * @returns registered help string
 */
export declare function toHelpString(code: ResultCode): string;
