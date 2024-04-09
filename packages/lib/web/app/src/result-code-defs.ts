/* eslint-disable
    @stylistic:js/max-len,
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-unused-vars,
 */

namespace CDP_DECLARE {

    const enum LOCAL_CODE_BASE {
        APP = CDP_KNOWN_MODULE.APP * LOCAL_CODE_RANGE_GUIDE.FUNCTION,
    }

    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    export enum RESULT_CODE {
        APP_DECLARE = RESULT_CODE_BASE.DECLARE,
        ERROR_APP_CONTEXT_NEED_TO_BE_INITIALIZED = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.APP + 1, 'AppContext need to be initialized with options at least once.'),
    }
}
