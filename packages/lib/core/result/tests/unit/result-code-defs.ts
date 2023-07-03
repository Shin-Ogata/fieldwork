/* eslint-disable
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-unused-vars,
 */

namespace CDP_DECLARE {

    export const enum RESULT_CODE_BASE {
        TEST = 2 * LOCAL_CODE_RANGE_GUIDE.MODULE,
    }

    const enum LOCAL_CODE_BASE {
        TEST = 1 * LOCAL_CODE_RANGE_GUIDE.FUNCTION,
    }

    /**
     * 拡張エラーコード定義
     */
    export enum RESULT_CODE {
        TEST_DECLARE         = RESULT_CODE_BASE.DECLARE,
        ERROR_TEST_SUCCEEDED = DECLARE_SUCCESS_CODE(RESULT_CODE_BASE.TEST, LOCAL_CODE_BASE.TEST + 1, 'test succeess result.'),
        ERROR_TEST_FAILED    = DECLARE_ERROR_CODE(RESULT_CODE_BASE.TEST, LOCAL_CODE_BASE.TEST + 2, 'test failed result.'),
    }
}
