import RESULT_CODE = CDP_DECLARE.RESULT_CODE;
import RESULT_CODE_BASE = CDP_DECLARE.RESULT_CODE_BASE;
import RESULT_CODE_RANGE = CDP_DECLARE.RESULT_CODE_RANGE;
import LOCAL_CODE_RANGE_GUIDE = CDP_DECLARE.LOCAL_CODE_RANGE_GUIDE;
import DECLARE_SUCCESS_CODE = CDP_DECLARE.DECLARE_SUCCESS_CODE;
import DECLARE_ERROR_CODE = CDP_DECLARE.DECLARE_ERROR_CODE;
import ASSIGN_RESULT_CODE = CDP_DECLARE.ASSIGN_RESULT_CODE;
export { RESULT_CODE, RESULT_CODE_BASE, RESULT_CODE_RANGE, LOCAL_CODE_RANGE_GUIDE, DECLARE_SUCCESS_CODE, DECLARE_ERROR_CODE, ASSIGN_RESULT_CODE, };
/**
 * @en Judge fail or not.
 * @ja 失敗判定
 *
 * @param code [[RESULT_CODE]]
 * @returns true: fail result / false: success result
 */
export declare function FAILED(code: number): boolean;
/**
 * @en Judge success or not.
 * @ja 成功判定
 *
 * @param code [[RESULT_CODE]]
 * @returns true: success result / false: fail result
 */
export declare function SUCCEEDED(code: number): boolean;
/**
 * @en Convert to [[RESULT_CODE]] `name` string from [[RESULT_CODE]].
 * @ja [[RESULT_CODE]] を [[RESULT_CODE]] 文字列に変換
 *
 * @param code [[RESULT_CODE]]
 * @param tag  custom tag if needed.
 * @returns name string ex) "[tag][NOT_SUPPORTED]"
 */
export declare function toNameString(code: number, tag?: string): string;
/**
 * @en Convert to help string from [[RESULT_CODE]].
 * @ja [[RESULT_CODE]] をヘルプストリングに変換
 *
 * @param code [[RESULT_CODE]]
 * @returns registered help string
 */
export declare function toHelpString(code: number): string;
