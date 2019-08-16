/* eslint-disable no-inner-declarations, @typescript-eslint/no-namespace, @typescript-eslint/no-unused-vars */

namespace CDP {

    /**
     * @en Constant definition about range of the result code.
     * @ja リザルトコードの範囲に関する定数定義
     */
    export const enum RESULT_CODE_RANGE {
        /**
         * @en The assignable range for the client's local result cord by which expansion is possible.
         * @ja クライアントが拡張可能なローカルリザルトコードのアサイン可能領域
         */
        MAX = 1000,
        /**
         * @en Reserved range of framework.
         * @ja フレームワークの予約領域
         */
        RESERVED = 1000,
    }

    /**
     * @en The assignment range guideline definition used in the module.
     * @ja モジュール内で使用するアサイン領域ガイドライン定数定義
     */
    export const enum LOCAL_CODE_RANGE_GUIDE {
        /**
         * @en The assignment range guideline per 1 module.
         * @ja 1モジュール当たりに割り当てるアサイン領域ガイドライン
         */
        MODULE = 100,
        /**
         * @en The assignment range guideline per 1 function.
         * @ja 1機能当たりに割り当てるアサイン領域ガイドライン
         */
        FUNCTION = 20,
    }

    /**
     * @en Offset value enumeration for [[ResultCode]]. <br>
     *     The client can expand a definition in other module.
     * @ja [[ResultCode]] のオフセット値 <br>
     *     エラーコード対応するモジュール内で 定義を拡張する.
     *
     * @example <br>
     *
     * ```ts
     *  const enum LOCAL_CODE_BASE {
     *      COMMON      = 0,
     *      SOMEMODULE  = 1 * LOCAL_CODE_RANGE_GUIDE.FUNCTION,
     *      SOMEMODULE2 = 2 * LOCAL_CODE_RANGE_GUIDE.FUNCTION,
     *  }
     *
     *  export enum ResultCode {
     *      ERROR_SOMEMODULE_UNEXPECTED  = DECLARE_ERROR_CODE(RESULT_CODE_BASE.SOMEMODULE, LOCAL_CODE_BASE.SOMEMODULE + 1, "error unexpected."),
     *      ERROR_SOMEMODULE_INVALID_ARG = DECLARE_ERROR_CODE(RESULT_CODE_BASE.SOMEMODULE, LOCAL_CODE_BASE.SOMEMODULE + 2, "invalid arguments."),
     *  }
     *  ASSIGN_RESULT_CODE(ResultCode);
     * ```
     */
    export const enum RESULT_CODE_BASE {
        COMMON = 0,
        CDP = 1 * LOCAL_CODE_RANGE_GUIDE.MODULE, // cdp reserved. abs(0 ～ 1000)
//      MODULE_A = 1 * RESULT_CODE_RANGE.MAX,    // ex) moduleA: abs(1001 ～ 1999)
//      MODULE_B = 2 * RESULT_CODE_RANGE.MAX,    // ex) moduleB: abs(2001 ～ 2999)
//      MODULE_C = 3 * RESULT_CODE_RANGE.MAX,    // ex) moduleC: abs(3001 ～ 3999)
    }

    /**
     * @en Common error code for the application.
     * @ja アプリケーション全体で使用する共通エラーコード定義
     */
    export enum ResultCode {
        /** `en` general success code             <br> `ja` 汎用成功コード                       */
        SUCCEEDED = 0,
        /** `en` general cancel code              <br> `ja` 汎用キャンセルコード                 */
        ABORTED = 1,
        /** `en` general pending error code       <br> `ja` 汎用オペレーション未実行エラーコード */
        PENDING = 2,
        /** `en` general error code               <br> `ja` 汎用エラーコード                     */
        FAILED = -1,
        /** `en` general fatal error code         <br> `ja` 汎用致命的エラーコード               */
        FATAL = -2,
        /** `en` general not supported error code <br> `ja` 汎用オペレーションエラーコード       */
        NOT_SUPPORTED = -3,
    }

    /**
     * @en Assign declared [[ResultCode]] to root enumeration.
     *     (It's enable to merge enum in the module system environment.)
     * @ja 拡張した [[ResultCode]] を ルート enum にアサイン
     *     モジュールシステム環境においても、enum をマージを可能にする
     */
    export function ASSIGN_RESULT_CODE(extend: typeof ResultCode): void {
        Object.assign(ResultCode, extend);
    }

    /** @internal */
    const _code2message: { [code: string]: string; } = {
        '0': 'operation succeeded.',
        '1': 'operation aborted.',
        '2': 'operation pending.',
        '-1': 'operation failed.',
        '-2': 'unexpected error occured.',
        '-3': 'operation not supported.',
    };

    /**
     * @en Access to error message map.
     * @ja エラーメッセージマップの取得
     *
     * @internal
     */
    export function ERROR_MESSAGE_MAP(): { [code: string]: string; } {
        return _code2message;
    }

    /**
     * @en Generate success code.
     * @ja 成功コードを生成
     *
     * @param base
     *  - `en` set base offset as [[RESULT_CODE_BASE]]
     *  - `ja` オフセット値を [[RESULT_CODE_BASE]] として指定
     * @param code
     *  - `en` set local code for declaration. ex) '1'
     *  - `ja` 宣言用のローカルコード値を指定  例) '1'
     * @param message
     *  - `en` set error message for help string.
     *  - `ja` ヘルプストリング用エラーメッセージを指定
     */
    export function DECLARE_SUCCESS_CODE(base: RESULT_CODE_BASE, code: number, message?: string): number {
        return declareResultCode(base, code, message, true);
    }

    /**
     * @en Generate error code.
     * @ja エラーコード生成
     *
     * @param base
     *  - `en` set base offset as [[RESULT_CODE_BASE]]
     *  - `ja` オフセット値を [[RESULT_CODE_BASE]] として指定
     * @param code
     *  - `en` set local code for declaration. ex) '1'
     *  - `ja` 宣言用のローカルコード値を指定  例) '1'
     * @param message
     *  - `en` set error message for help string.
     *  - `ja` ヘルプストリング用エラーメッセージを指定
     */
    export function DECLARE_ERROR_CODE(base: RESULT_CODE_BASE, code: number, message?: string): number {
        return declareResultCode(base, code, message, false);
    }

///////////////////////////////////////////////////////////////////////
// private section:

    /** @internal register for [[ResultCode]] */
    function declareResultCode(base: RESULT_CODE_BASE, code: number, message?: string, succeeded = false): number | never {
        if (code <= 0 || RESULT_CODE_RANGE.MAX < code) {
            throw new RangeError(`declareResultCode(), invalid local-code range. [code: ${code}]`);
        }
        const signed = succeeded ? 1 : -1;
        const resultCode = signed * (base as number + code);
        _code2message[resultCode] = message ? message : (`[CODE: ${resultCode}]`);
        return resultCode;
    }
}
