/* eslint-disable
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-unused-vars,
    @typescript-eslint/restrict-plus-operands,
 */

namespace CDP_DECLARE {

    const enum LOCAL_CODE_BASE {
        I18N = CDP_KNOWN_MODULE.I18N * LOCAL_CODE_RANGE_GUIDE.FUNCTION,
    }

    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    export enum RESULT_CODE {
        I18N_DECLARE    = RESULT_CODE_BASE.DECLARE,
        ERROR_I18N_CORE_LAYER = DECLARE_ERROR_CODE(RESULT_CODE_BASE.CDP, LOCAL_CODE_BASE.I18N + 1, 'i18next error'),
    }
}
