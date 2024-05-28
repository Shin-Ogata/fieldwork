/* eslint-disable
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-unused-vars,
 */

namespace CDP_DECLARE {

    const enum LOCAL_CODE_BASE {
        UI_LISTVIEW = (CDP_KNOWN_MODULE.OFFSET + CDP_KNOWN_UI_MODULE.LISTVIEW) * LOCAL_CODE_RANGE_GUIDE.FUNCTION,
    }

    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    export enum RESULT_CODE {
        UI_LISTVIEW_DECLARE = RESULT_CODE_BASE.DECLARE,
        ERROR_UI_LISTVIEW_INVALID_INITIALIZATION = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.UI_LISTVIEW + 1, 'listview has invalid initialization.'),
        ERROR_UI_LISTVIEW_INVALID_PARAM          = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.UI_LISTVIEW + 2, 'listview given a invalid param.'),
        ERROR_UI_LISTVIEW_INVALID_OPERATION      = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.UI_LISTVIEW + 3, 'listview invalid operation.'),
    }
}
