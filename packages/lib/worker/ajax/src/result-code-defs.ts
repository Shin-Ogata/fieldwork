/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-unused-vars, @typescript-eslint/restrict-plus-operands */

namespace CDP_DECLARE {

    const enum LOCAL_CODE_BASE {
        AJAX = 1 * LOCAL_CODE_RANGE_GUIDE.FUNCTION,
    }

    /**
     * 拡張通エラーコード定義
     */
    export enum RESULT_CODE {
        ERROR_AJAX_RESPONSE = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.AJAX + 1, 'network error.'),
        ERROR_AJAX_TIMEOUT  = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.AJAX + 2, 'request timeout.'),
    }
}
