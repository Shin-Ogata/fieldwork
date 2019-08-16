/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-unused-vars, @typescript-eslint/restrict-plus-operands */

namespace CDP {

    export const enum RESULT_CODE_BASE {
        TEST = 2 * LOCAL_CODE_RANGE_GUIDE.MODULE,
    }

    const enum LOCAL_CODE_BASE {
        TEST = 1 * LOCAL_CODE_RANGE_GUIDE.FUNCTION,
    }

    /**
     * 拡張通エラーコード定義
     */
    export enum ResultCode {
        ERROR_TEST_DECLARATION = 0, // TS2432 対策
        ERROR_TEST_01 = DECLARE_ERROR_CODE(RESULT_CODE_BASE.TEST, LOCAL_CODE_BASE.TEST + 1, 'test01 error.'),
        ERROR_TEST_02 = DECLARE_ERROR_CODE(RESULT_CODE_BASE.TEST, LOCAL_CODE_BASE.TEST + 2, 'test02 error.'),
    }
}
