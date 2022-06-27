/* eslint-disable
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-unused-vars,
    @typescript-eslint/restrict-plus-operands,
 */

namespace CDP_DECLARE {

    const enum LOCAL_CODE_BASE {
        SYNC = CDP_KNOWN_MODULE.MVC * LOCAL_CODE_RANGE_GUIDE.FUNCTION + 0,
    }

    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    export enum RESULT_CODE {
        MVC_SYNC_DECLARE                              = RESULT_CODE_BASE.DECLARE,
        ERROR_MVC_INVALID_SYNC_PARAMS                 = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.SYNC + 1, 'invalid sync params.'),
        ERROR_MVC_INVALID_SYNC_STORAGE_ENTRY          = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.SYNC + 2, 'invalid sync storage entires.'),
        ERROR_MVC_INVALID_SYNC_STORAGE_DATA_NOT_FOUND = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.SYNC + 3, 'data not found.'),
    }
}
