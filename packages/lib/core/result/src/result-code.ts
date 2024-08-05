import RESULT_CODE              = CDP_DECLARE.RESULT_CODE;
import RESULT_CODE_BASE         = CDP_DECLARE.RESULT_CODE_BASE;
import RESULT_CODE_RANGE        = CDP_DECLARE.RESULT_CODE_RANGE;
import LOCAL_CODE_RANGE_GUIDE   = CDP_DECLARE.LOCAL_CODE_RANGE_GUIDE;
import DECLARE_SUCCESS_CODE     = CDP_DECLARE.DECLARE_SUCCESS_CODE;
import DECLARE_ERROR_CODE       = CDP_DECLARE.DECLARE_ERROR_CODE;
import ASSIGN_RESULT_CODE       = CDP_DECLARE.ASSIGN_RESULT_CODE;
import ERROR_MESSAGE_MAP        = CDP_DECLARE.ERROR_MESSAGE_MAP;

/** @internal */
const enum Description {
    UNKNOWN_ERROR_NAME = 'UNKNOWN',
}

export {
    RESULT_CODE,
    RESULT_CODE_BASE,
    RESULT_CODE_RANGE,
    LOCAL_CODE_RANGE_GUIDE,
    DECLARE_SUCCESS_CODE,
    DECLARE_ERROR_CODE,
    ASSIGN_RESULT_CODE,
};

/**
 * @en Judge fail or not.
 * @ja 失敗判定
 *
 * @param code {@link RESULT_CODE}
 * @returns true: fail result / false: success result
 */
export function FAILED(code: number): boolean {
    return code < 0;
}

/**
 * @en Judge success or not.
 * @ja 成功判定
 *
 * @param code {@link RESULT_CODE}
 * @returns true: success result / false: fail result
 */
export function SUCCEEDED(code: number): boolean {
    return !FAILED(code);
}

/**
 * @en Convert to {@link RESULT_CODE} `name` string from {@link RESULT_CODE}.
 * @ja {@link RESULT_CODE} を {@link RESULT_CODE} 文字列に変換
 *
 * @param code {@link RESULT_CODE}
 * @param tag  custom tag if needed.
 * @returns name string ex) "[tag][NOT_SUPPORTED]"
 */
export function toNameString(code: number, tag?: string): string {
    const prefix = tag ? `[${tag}]` : '';
    if (RESULT_CODE[code]) {
        return `${prefix}[${RESULT_CODE[code]}]`;
    } else {
        return `${prefix}[${Description.UNKNOWN_ERROR_NAME}]`;
    }
}

/**
 * @en Convert to help string from {@link RESULT_CODE}.
 * @ja {@link RESULT_CODE} をヘルプストリングに変換
 *
 * @param code {@link RESULT_CODE}
 * @returns registered help string
 */
export function toHelpString(code: number): string {
    const map = ERROR_MESSAGE_MAP();
    if (map[code]) {
        return map[code];
    } else {
        return `unregistered result code. [code: ${code}]`;
    }
}
