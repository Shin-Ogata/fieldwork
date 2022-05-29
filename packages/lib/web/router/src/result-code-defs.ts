/* eslint-disable
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-unused-vars,
    @typescript-eslint/restrict-plus-operands,
 */

namespace CDP_DECLARE {

    const enum LOCAL_CODE_BASE {
        ROUTER = CDP_KNOWN_MODULE.MVC * LOCAL_CODE_RANGE_GUIDE.FUNCTION + 15,
    }

    /**
     * @en Extends error code definitions.
     * @ja 拡張通エラーコード定義
     */
    export enum RESULT_CODE {
        MVC_ROUTER_DECLARE = RESULT_CODE_BASE.DECLARE,
        ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND        = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.ROUTER + 1, 'router element not found.'),
        ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.ROUTER + 2, 'Route cannot be resolved.'),
        ERROR_MVC_ROUTER_NAVIGATE_FAILED          = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.ROUTER + 3, 'Route navigate failed.'),
    }
}
