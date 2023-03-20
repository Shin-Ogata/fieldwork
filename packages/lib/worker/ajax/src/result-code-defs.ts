/* eslint-disable
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-unused-vars,
 */

namespace CDP_DECLARE {

    const enum LOCAL_CODE_BASE {
        AJAX = CDP_KNOWN_MODULE.AJAX * LOCAL_CODE_RANGE_GUIDE.FUNCTION,
    }

    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    export enum RESULT_CODE {
        AJAX_DECLARE        = RESULT_CODE_BASE.DECLARE,
        ERROR_AJAX_RESPONSE = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.AJAX + 1, 'network error.'),
        ERROR_AJAX_TIMEOUT  = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.AJAX + 2, 'request timeout.'),
    }
}
