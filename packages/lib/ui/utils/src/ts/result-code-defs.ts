/* eslint-disable
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-unused-vars,
 */

namespace CDP_DECLARE {

    const enum CDP_KNOWN_UI_MODULE {
        /** `@cdp/ui-utils` */
        UTILS  = 1,
        OFFSET = 2,
    }

    const enum LOCAL_CODE_BASE {
        UI_UTILS = (CDP_KNOWN_MODULE.OFFSET + CDP_KNOWN_UI_MODULE.UTILS) * LOCAL_CODE_RANGE_GUIDE.FUNCTION,
    }

    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    export enum RESULT_CODE {
        UI_UTILS_DECLARE = RESULT_CODE_BASE.DECLARE,
        ERROR_UI_UTILS_FATAL = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.UI_UTILS + 1, 'UI utils something wrong.'),
    }
}
