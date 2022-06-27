/* eslint-disable
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-unused-vars,
    @typescript-eslint/restrict-plus-operands,
 */

namespace CDP_DECLARE {

    const enum LOCAL_CODE_BASE {
        COLLECTION = CDP_KNOWN_MODULE.MVC * LOCAL_CODE_RANGE_GUIDE.FUNCTION + 10,
    }

    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    export enum RESULT_CODE {
        MVC_COLLECTION_DECLARE = RESULT_CODE_BASE.DECLARE,
        ERROR_MVC_INVALID_ACCESS         = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.COLLECTION + 1, 'invalid access.'),
        ERROR_MVC_INVALID_COMPARATORS    = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.COLLECTION + 2, 'invalid comparators.'),
        ERROR_MVC_EDIT_PERMISSION_DENIED = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.COLLECTION + 3, 'editing permission denied.'),
    }
}
