/*!
 * @cdp/result 0.9.0
 *   result utility module
 */

import { isNil, className, isString } from '@cdp/core-utils';

/* eslint-disable no-inner-declarations, @typescript-eslint/no-namespace, @typescript-eslint/no-unused-vars */
/*
 * NOTE: 内部モジュールに `CDP` namespace を使用してしまうと, 外部モジュールでは宣言できなくなる.
 * https://github.com/Microsoft/TypeScript/issues/9611
 */
globalThis.CDP_DECLARE = globalThis.CDP_DECLARE || {};
(function () {
    /**
     * @en Common result code for the application.
     * @ja アプリケーション全体で使用する共通エラーコード定義
     */
    let RESULT_CODE;
    (function (RESULT_CODE) {
        /** `en` general success code             <br> `ja` 汎用成功コード                       */
        RESULT_CODE[RESULT_CODE["SUCCESS"] = 0] = "SUCCESS";
        /** `en` general cancel code              <br> `ja` 汎用キャンセルコード                 */
        RESULT_CODE[RESULT_CODE["ABORT"] = 1] = "ABORT";
        /** `en` general pending code             <br> `ja` 汎用オペレーション未実行エラーコード */
        RESULT_CODE[RESULT_CODE["PENDING"] = 2] = "PENDING";
        /** `en` general success but noop code    <br> `ja` 汎用実行不要コード                   */
        RESULT_CODE[RESULT_CODE["NOOP"] = 3] = "NOOP";
        /** `en` general error code               <br> `ja` 汎用エラーコード                     */
        RESULT_CODE[RESULT_CODE["FAIL"] = -1] = "FAIL";
        /** `en` general fatal error code         <br> `ja` 汎用致命的エラーコード               */
        RESULT_CODE[RESULT_CODE["FATAL"] = -2] = "FATAL";
        /** `en` general not supported error code <br> `ja` 汎用オペレーションエラーコード       */
        RESULT_CODE[RESULT_CODE["NOT_SUPPORTED"] = -3] = "NOT_SUPPORTED";
    })(RESULT_CODE = CDP_DECLARE.RESULT_CODE || (CDP_DECLARE.RESULT_CODE = {}));
    /**
     * @en Assign declared [[RESULT_CODE]] to root enumeration.
     *     (It's enable to merge enum in the module system environment.)
     * @ja 拡張した [[RESULT_CODE]] を ルート enum にアサイン
     *     モジュールシステム環境においても、enum をマージを可能にする
     */
    function ASSIGN_RESULT_CODE(extend) {
        Object.assign(RESULT_CODE, extend);
    }
    CDP_DECLARE.ASSIGN_RESULT_CODE = ASSIGN_RESULT_CODE;
    /** @internal */
    const _code2message = {
        '0': 'operation succeeded.',
        '1': 'operation aborted.',
        '2': 'operation pending.',
        '3': 'no operation.',
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
    function ERROR_MESSAGE_MAP() {
        return _code2message;
    }
    CDP_DECLARE.ERROR_MESSAGE_MAP = ERROR_MESSAGE_MAP;
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
    function DECLARE_SUCCESS_CODE(base, code, message) {
        return declareResultCode(base, code, message, true);
    }
    CDP_DECLARE.DECLARE_SUCCESS_CODE = DECLARE_SUCCESS_CODE;
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
    function DECLARE_ERROR_CODE(base, code, message) {
        return declareResultCode(base, code, message, false);
    }
    CDP_DECLARE.DECLARE_ERROR_CODE = DECLARE_ERROR_CODE;
    ///////////////////////////////////////////////////////////////////////
    // private section:
    /** @internal register for [[RESULT_CODE]] */
    function declareResultCode(base, code, message, succeeded) {
        if (code < 0 || 1000 /* MAX */ <= code) {
            throw new RangeError(`declareResultCode(), invalid local-code range. [code: ${code}]`);
        }
        const signed = succeeded ? 1 : -1;
        const resultCode = signed * (base + code);
        _code2message[resultCode] = message ? message : (`[CODE: ${resultCode}]`);
        return resultCode;
    }
})();

var RESULT_CODE = CDP_DECLARE.RESULT_CODE;
var DECLARE_SUCCESS_CODE = CDP_DECLARE.DECLARE_SUCCESS_CODE;
var DECLARE_ERROR_CODE = CDP_DECLARE.DECLARE_ERROR_CODE;
var ASSIGN_RESULT_CODE = CDP_DECLARE.ASSIGN_RESULT_CODE;
var ERROR_MESSAGE_MAP = CDP_DECLARE.ERROR_MESSAGE_MAP;
/**
 * @en Judge fail or not.
 * @ja 失敗判定
 *
 * @param code [[RESULT_CODE]]
 * @returns true: fail result / false: success result
 */
function FAILED(code) {
    return code < 0;
}
/**
 * @en Judge success or not.
 * @ja 成功判定
 *
 * @param code [[RESULT_CODE]]
 * @returns true: success result / false: fail result
 */
function SUCCEEDED(code) {
    return !FAILED(code);
}
/**
 * @en Convert to [[RESULT_CODE]] `name` string from [[RESULT_CODE]].
 * @ja [[RESULT_CODE]] を [[RESULT_CODE]] 文字列に変換
 *
 * @param code [[RESULT_CODE]]
 * @param tag  custom tag if needed.
 * @returns name string ex) "[tag][NOT_SUPPORTED]"
 */
function toNameString(code, tag) {
    const prefix = tag ? `[${tag}]` : '';
    if (RESULT_CODE[code]) {
        return `${prefix}[${RESULT_CODE[code]}]`;
    }
    else {
        return `${prefix}[${"UNKNOWN" /* UNKNOWN_ERROR_NAME */}]`;
    }
}
/**
 * @en Convert to help string from [[RESULT_CODE]].
 * @ja [[RESULT_CODE]] をヘルプストリングに変換
 *
 * @param code [[RESULT_CODE]]
 * @returns registered help string
 */
function toHelpString(code) {
    const map = ERROR_MESSAGE_MAP();
    if (map[code]) {
        return map[code];
    }
    else {
        return `unregistered result code. [code: ${code}]`;
    }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable-next-line @typescript-eslint/unbound-method */
const isNumber = Number.isFinite;
/**
 * @en A result holder class. <br>
 *     Derived native `Error` class.
 * @ja 処理結果伝達クラス <br>
 *     ネイティブ `Error` の派生クラス
 */
class Result extends Error {
    /**
     * constructor
     *
     * @param code
     *  - `en` result code
     *  - `ja` 結果コード
     * @param message
     *  - `en` result info message
     *  - `ja` 結果情報メッセージ
     * @param cause
     *  - `en` low-level error information
     *  - `ja` 下位のエラー情報
     */
    constructor(code, message, cause) {
        code = isNil(code) ? RESULT_CODE.SUCCESS : isNumber(code) ? Math.trunc(code) : RESULT_CODE.FAIL;
        super(message || toHelpString(code));
        let time = isError(cause) ? cause.time : undefined;
        isNumber(time) || (time = Date.now());
        const descriptors = {
            code: { enumerable: true, value: code },
            cause: { enumerable: true, value: cause },
            time: { enumerable: true, value: time },
        };
        Object.defineProperties(this, descriptors);
    }
    /**
     * @en Judge succeeded or not.
     * @ja 成功判定
     */
    get isSucceeded() {
        return SUCCEEDED(this.code);
    }
    /**
     * @en Judge failed or not.
     * @ja 失敗判定
     */
    get isFailed() {
        return FAILED(this.code);
    }
    /**
     * @en Judge canceled or not.
     * @ja キャンセルエラー判定
     */
    get isCanceled() {
        return this.code === RESULT_CODE.ABORT;
    }
    /**
     * @en Get formatted [[RESULT_CODE]] name string.
     * @ja フォーマットされた [[RESULT_CODE]] 名文字列を取得
     */
    get codeName() {
        return toNameString(this.code, this.name);
    }
    /**
     * @en Get [[RESULT_CODE]] help string.
     * @ja [[RESULT_CODE]] のヘルプストリングを取得
     */
    get help() {
        return toHelpString(this.code);
    }
    /** @internal */
    get [Symbol.toStringTag]() {
        return "Result" /* RESULT */;
    }
}
Result.prototype.name = "Result" /* RESULT */;
/** @interna lReturns `true` if `x` is `Error`, `false` otherwise. */
function isError(x) {
    return x instanceof Error || className(x) === "Error" /* ERROR */;
}
/** Returns `true` if `x` is `Result`, `false` otherwise. */
function isResult(x) {
    return x instanceof Result || className(x) === "Result" /* RESULT */;
}
/**
 * @en Convert to [[Result]] object.
 * @ja [[Result]] オブジェクトに変換
 */
function toResult(o) {
    if (o instanceof Result) {
        /* eslint-disable-next-line prefer-const */
        let { code, cause, time } = o;
        code = isNil(code) ? RESULT_CODE.SUCCESS : isNumber(code) ? Math.trunc(code) : RESULT_CODE.FAIL;
        isNumber(time) || (time = Date.now());
        // Do nothing if already defined
        Reflect.defineProperty(o, 'code', { enumerable: true, value: code });
        Reflect.defineProperty(o, 'cause', { enumerable: true, value: cause });
        Reflect.defineProperty(o, 'time', { enumerable: true, value: time });
        return o;
    }
    else {
        const e = Object(o);
        const code = isNumber(e.code) ? e.code : o;
        const message = isString(e.message) ? e.message : isString(o) ? o : undefined;
        const cause = isError(e.cause) ? e.cause : isError(o) ? o : isString(o) ? new Error(o) : o;
        return new Result(code, message, cause);
    }
}
/**
 * @en Create [[Result]] helper.
 * @ja [[Result]] オブジェクト構築ヘルパー
 *
 * @param code
 *  - `en` result code
 *  - `ja` 結果コード
 * @param message
 *  - `en` result info message
 *  - `ja` 結果情報メッセージ
 * @param cause
 *  - `en` low-level error information
 *  - `ja` 下位のエラー情報
 */
function makeResult(code, message, cause) {
    return new Result(code, message, cause);
}
/**
 * @en Create canceled [[Result]] helper.
 * @ja キャンセル情報格納 [[Result]] オブジェクト構築ヘルパー
 *
 * @param message
 *  - `en` result info message
 *  - `ja` 結果情報メッセージ
 * @param cause
 *  - `en` low-level error information
 *  - `ja` 下位のエラー情報
 */
function makeCanceledResult(message, cause) {
    return new Result(RESULT_CODE.ABORT, message, cause);
}

export { ASSIGN_RESULT_CODE, DECLARE_ERROR_CODE, DECLARE_SUCCESS_CODE, FAILED, RESULT_CODE, Result, SUCCEEDED, isResult, makeCanceledResult, makeResult, toHelpString, toNameString, toResult };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzdWx0Lm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInJlc3VsdC1jb2RlLnRzIiwicmVzdWx0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLWlubmVyLWRlY2xhcmF0aW9ucywgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzICovXG5cbi8qXG4gKiBOT1RFOiDlhoXpg6jjg6Ljgrjjg6Xjg7zjg6vjgasgYENEUGAgbmFtZXNwYWNlIOOCkuS9v+eUqOOBl+OBpuOBl+OBvuOBhuOBqCwg5aSW6YOo44Oi44K444Ol44O844Or44Gn44Gv5a6j6KiA44Gn44GN44Gq44GP44Gq44KLLlxuICogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy85NjExXG4gKi9cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29uc3RhbnQgZGVmaW5pdGlvbiBhYm91dCByYW5nZSBvZiB0aGUgcmVzdWx0IGNvZGUuXG4gICAgICogQGphIOODquOCtuODq+ODiOOCs+ODvOODieOBruevhOWbsuOBq+mWouOBmeOCi+WumuaVsOWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBjb25zdCBlbnVtIFJFU1VMVF9DT0RFX1JBTkdFIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBUaGUgYXNzaWduYWJsZSByYW5nZSBmb3IgdGhlIGNsaWVudCdzIGxvY2FsIHJlc3VsdCBjb3JkIGJ5IHdoaWNoIGV4cGFuc2lvbiBpcyBwb3NzaWJsZS5cbiAgICAgICAgICogQGphIOOCr+ODqeOCpOOCouODs+ODiOOBjOaLoeW8teWPr+iDveOBquODreODvOOCq+ODq+ODquOCtuODq+ODiOOCs+ODvOODieOBruOCouOCteOCpOODs+WPr+iDvemgmOWfn1xuICAgICAgICAgKi9cbiAgICAgICAgTUFYID0gMTAwMCxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBSZXNlcnZlZCByYW5nZSBvZiBmcmFtZXdvcmsuXG4gICAgICAgICAqIEBqYSDjg5Xjg6zjg7zjg6Djg6/jg7zjgq/jga7kuojntITpoJjln59cbiAgICAgICAgICovXG4gICAgICAgIFJFU0VSVkVEID0gMTAwMCxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIGFzc2lnbm1lbnQgcmFuZ2UgZ3VpZGVsaW5lIGRlZmluaXRpb24gdXNlZCBpbiB0aGUgbW9kdWxlLlxuICAgICAqIEBqYSDjg6Ljgrjjg6Xjg7zjg6vlhoXjgafkvb/nlKjjgZnjgovjgqLjgrXjgqTjg7PpoJjln5/jgqzjgqTjg4njg6njgqTjg7PlrprmlbDlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgY29uc3QgZW51bSBMT0NBTF9DT0RFX1JBTkdFX0dVSURFIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBUaGUgYXNzaWdubWVudCByYW5nZSBndWlkZWxpbmUgcGVyIDEgbW9kdWxlLlxuICAgICAgICAgKiBAamEgMeODouOCuOODpeODvOODq+W9k+OBn+OCiuOBq+WJsuOCiuW9k+OBpuOCi+OCouOCteOCpOODs+mgmOWfn+OCrOOCpOODieODqeOCpOODs1xuICAgICAgICAgKi9cbiAgICAgICAgTU9EVUxFID0gMTAwLFxuICAgICAgICAvKipcbiAgICAgICAgICogQGVuIFRoZSBhc3NpZ25tZW50IHJhbmdlIGd1aWRlbGluZSBwZXIgMSBmdW5jdGlvbi5cbiAgICAgICAgICogQGphIDHmqZ/og73lvZPjgZ/jgorjgavlibLjgorlvZPjgabjgovjgqLjgrXjgqTjg7PpoJjln5/jgqzjgqTjg4njg6njgqTjg7NcbiAgICAgICAgICovXG4gICAgICAgIEZVTkNUSU9OID0gMjAsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE9mZnNldCB2YWx1ZSBlbnVtZXJhdGlvbiBmb3IgW1tSRVNVTFRfQ09ERV1dLiA8YnI+XG4gICAgICogICAgIFRoZSBjbGllbnQgY2FuIGV4cGFuZCBhIGRlZmluaXRpb24gaW4gb3RoZXIgbW9kdWxlLlxuICAgICAqIEBqYSBbW1JFU1VMVF9DT0RFXV0g44Gu44Kq44OV44K744OD44OI5YCkIDxicj5cbiAgICAgKiAgICAg44Ko44Op44O844Kz44O844OJ5a++5b+c44GZ44KL44Oi44K444Ol44O844Or5YaF44GnIOWumue+qeOCkuaLoeW8teOBmeOCiy5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgKiAgICAgIENPTU1PTiAgICAgID0gMCxcbiAgICAgKiAgICAgIFNPTUVNT0RVTEUgID0gMSAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgICogICAgICBTT01FTU9EVUxFMiA9IDIgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgICAqICB9XG4gICAgICpcbiAgICAgKiAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAqICAgICAgU09NRU1PRFVMRV9ERUNMQVJFICAgICAgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSwgLy8gZm9yIGF2b2lkIFRTMjQzMi5cbiAgICAgKiAgICAgIEVSUk9SX1NPTUVNT0RVTEVfVU5FWFBFQ1RFRCAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5TT01FTU9EVUxFLCBMT0NBTF9DT0RFX0JBU0UuU09NRU1PRFVMRSArIDEsIFwiZXJyb3IgdW5leHBlY3RlZC5cIiksXG4gICAgICogICAgICBFUlJPUl9TT01FTU9EVUxFX0lOVkFMSURfQVJHID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuU09NRU1PRFVMRSwgTE9DQUxfQ09ERV9CQVNFLlNPTUVNT0RVTEUgKyAyLCBcImludmFsaWQgYXJndW1lbnRzLlwiKSxcbiAgICAgKiAgfVxuICAgICAqICBBU1NJR05fUkVTVUxUX0NPREUoUkVTVUxUX0NPREUpO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGV4cG9ydCBjb25zdCBlbnVtIFJFU1VMVF9DT0RFX0JBU0Uge1xuICAgICAgICBERUNMQVJFID0gOTAwNzE5OTI1NDc0MDk5MSwgLy8gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVJcbiAgICAgICAgQ09NTU9OICA9IDAsXG4gICAgICAgIENEUCAgICAgPSAxICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5NT0RVTEUsIC8vIGNkcCByZXNlcnZlZC4gYWJzKDAg772eIDEwMDApXG4vLyAgICAgIE1PRFVMRV9BID0gMSAqIFJFU1VMVF9DT0RFX1JBTkdFLk1BWCwgICAgLy8gZXgpIG1vZHVsZUE6IGFicygxMDAxIO+9niAxOTk5KVxuLy8gICAgICBNT0RVTEVfQiA9IDIgKiBSRVNVTFRfQ09ERV9SQU5HRS5NQVgsICAgIC8vIGV4KSBtb2R1bGVCOiBhYnMoMjAwMSDvvZ4gMjk5OSlcbi8vICAgICAgTU9EVUxFX0MgPSAzICogUkVTVUxUX0NPREVfUkFOR0UuTUFYLCAgICAvLyBleCkgbW9kdWxlQzogYWJzKDMwMDEg772eIDM5OTkpXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEtub3duIENEUCBtb2R1bGUgb2ZmZXN0IGRlZmluaXRpb24uXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCiyBDRFAg44Oi44K444Ol44O844Or44Gu44Kq44OV44K744OD44OI5a6a576pXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgKiAgICBBSkFYID0gQ0RQX0tOT1dOX01PRFVMRS5BSkFYICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICogICBBSkFYX0RFQ0xBUkUgICAgICAgID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAqICAgRVJST1JfQUpBWF9SRVNQT05TRSA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkFKQVggKyAxLCAnbmV0d29yayBlcnJvci4nKSxcbiAgICAgKiAgIEVSUk9SX0FKQVhfVElNRU9VVCAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMiwgJ3JlcXVlc3QgdGltZW91dC4nKSxcbiAgICAgKiB9XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZXhwb3J0IGNvbnN0IGVudW0gQ0RQX0tOT1dOX01PRFVMRSB7XG4gICAgICAgIC8qKiBgQGNkcC9hamF4YCAqL1xuICAgICAgICBBSkFYID0gMSxcbiAgICAgICAgLyoqIGBAY2RwL2RhdGEtc3luY2AsIGBAY2RwL21vZGVsYCAqL1xuICAgICAgICBNVkMgID0gMixcbiAgICAgICAgLyoqIG9mZnNldCBmb3IgdW5rbm93biBtb2R1bGUgKi9cbiAgICAgICAgT0ZGU0VULFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDb21tb24gcmVzdWx0IGNvZGUgZm9yIHRoZSBhcHBsaWNhdGlvbi5cbiAgICAgKiBAamEg44Ki44OX44Oq44Kx44O844K344On44Oz5YWo5L2T44Gn5L2/55So44GZ44KL5YWx6YCa44Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIHN1Y2Nlc3MgY29kZSAgICAgICAgICAgICA8YnI+IGBqYWAg5rGO55So5oiQ5Yqf44Kz44O844OJICAgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICBTVUNDRVNTID0gMCxcbiAgICAgICAgLyoqIGBlbmAgZ2VuZXJhbCBjYW5jZWwgY29kZSAgICAgICAgICAgICAgPGJyPiBgamFgIOaxjueUqOOCreODo+ODs+OCu+ODq+OCs+ODvOODiSAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgQUJPUlQgPSAxLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIHBlbmRpbmcgY29kZSAgICAgICAgICAgICA8YnI+IGBqYWAg5rGO55So44Kq44Oa44Os44O844K344On44Oz5pyq5a6f6KGM44Ko44Op44O844Kz44O844OJICovXG4gICAgICAgIFBFTkRJTkcgPSAyLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIHN1Y2Nlc3MgYnV0IG5vb3AgY29kZSAgICA8YnI+IGBqYWAg5rGO55So5a6f6KGM5LiN6KaB44Kz44O844OJICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgIE5PT1AgPSAzLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIGVycm9yIGNvZGUgICAgICAgICAgICAgICA8YnI+IGBqYWAg5rGO55So44Ko44Op44O844Kz44O844OJICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgRkFJTCA9IC0xLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIGZhdGFsIGVycm9yIGNvZGUgICAgICAgICA8YnI+IGBqYWAg5rGO55So6Ie05ZG955qE44Ko44Op44O844Kz44O844OJICAgICAgICAgICAgICAgKi9cbiAgICAgICAgRkFUQUwgPSAtMixcbiAgICAgICAgLyoqIGBlbmAgZ2VuZXJhbCBub3Qgc3VwcG9ydGVkIGVycm9yIGNvZGUgPGJyPiBgamFgIOaxjueUqOOCquODmuODrOODvOOCt+ODp+ODs+OCqOODqeODvOOCs+ODvOODiSAgICAgICAqL1xuICAgICAgICBOT1RfU1VQUE9SVEVEID0gLTMsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFzc2lnbiBkZWNsYXJlZCBbW1JFU1VMVF9DT0RFXV0gdG8gcm9vdCBlbnVtZXJhdGlvbi5cbiAgICAgKiAgICAgKEl0J3MgZW5hYmxlIHRvIG1lcmdlIGVudW0gaW4gdGhlIG1vZHVsZSBzeXN0ZW0gZW52aXJvbm1lbnQuKVxuICAgICAqIEBqYSDmi6HlvLXjgZfjgZ8gW1tSRVNVTFRfQ09ERV1dIOOCkiDjg6vjg7zjg4ggZW51bSDjgavjgqLjgrXjgqTjg7NcbiAgICAgKiAgICAg44Oi44K444Ol44O844Or44K344K544OG44Og55Kw5aKD44Gr44GK44GE44Gm44KC44CBZW51bSDjgpLjg57jg7zjgrjjgpLlj6/og73jgavjgZnjgotcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gQVNTSUdOX1JFU1VMVF9DT0RFKGV4dGVuZDogb2JqZWN0KTogdm9pZCB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24oUkVTVUxUX0NPREUsIGV4dGVuZCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIGNvbnN0IF9jb2RlMm1lc3NhZ2U6IHsgW2NvZGU6IHN0cmluZ106IHN0cmluZzsgfSA9IHtcbiAgICAgICAgJzAnOiAnb3BlcmF0aW9uIHN1Y2NlZWRlZC4nLFxuICAgICAgICAnMSc6ICdvcGVyYXRpb24gYWJvcnRlZC4nLFxuICAgICAgICAnMic6ICdvcGVyYXRpb24gcGVuZGluZy4nLFxuICAgICAgICAnMyc6ICdubyBvcGVyYXRpb24uJyxcbiAgICAgICAgJy0xJzogJ29wZXJhdGlvbiBmYWlsZWQuJyxcbiAgICAgICAgJy0yJzogJ3VuZXhwZWN0ZWQgZXJyb3Igb2NjdXJlZC4nLFxuICAgICAgICAnLTMnOiAnb3BlcmF0aW9uIG5vdCBzdXBwb3J0ZWQuJyxcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBlcnJvciBtZXNzYWdlIG1hcC5cbiAgICAgKiBAamEg44Ko44Op44O844Oh44OD44K744O844K444Oe44OD44OX44Gu5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gRVJST1JfTUVTU0FHRV9NQVAoKTogeyBbY29kZTogc3RyaW5nXTogc3RyaW5nOyB9IHtcbiAgICAgICAgcmV0dXJuIF9jb2RlMm1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdlbmVyYXRlIHN1Y2Nlc3MgY29kZS5cbiAgICAgKiBAamEg5oiQ5Yqf44Kz44O844OJ44KS55Sf5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYmFzZVxuICAgICAqICAtIGBlbmAgc2V0IGJhc2Ugb2Zmc2V0IGFzIFtbUkVTVUxUX0NPREVfQkFTRV1dXG4gICAgICogIC0gYGphYCDjgqrjg5Xjgrvjg4Pjg4jlgKTjgpIgW1tSRVNVTFRfQ09ERV9CQVNFXV0g44Go44GX44Gm5oyH5a6aXG4gICAgICogQHBhcmFtIGNvZGVcbiAgICAgKiAgLSBgZW5gIHNldCBsb2NhbCBjb2RlIGZvciBkZWNsYXJhdGlvbi4gZXgpICcxJ1xuICAgICAqICAtIGBqYWAg5a6j6KiA55So44Gu44Ot44O844Kr44Or44Kz44O844OJ5YCk44KS5oyH5a6aICDkvospICcxJ1xuICAgICAqIEBwYXJhbSBtZXNzYWdlXG4gICAgICogIC0gYGVuYCBzZXQgZXJyb3IgbWVzc2FnZSBmb3IgaGVscCBzdHJpbmcuXG4gICAgICogIC0gYGphYCDjg5jjg6vjg5fjgrnjg4jjg6rjg7PjgrDnlKjjgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrjjgpLmjIflrppcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gREVDTEFSRV9TVUNDRVNTX0NPREUoYmFzZTogUkVTVUxUX0NPREVfQkFTRSwgY29kZTogbnVtYmVyLCBtZXNzYWdlPzogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIGRlY2xhcmVSZXN1bHRDb2RlKGJhc2UsIGNvZGUsIG1lc3NhZ2UsIHRydWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZW5lcmF0ZSBlcnJvciBjb2RlLlxuICAgICAqIEBqYSDjgqjjg6njg7zjgrPjg7zjg4nnlJ/miJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBiYXNlXG4gICAgICogIC0gYGVuYCBzZXQgYmFzZSBvZmZzZXQgYXMgW1tSRVNVTFRfQ09ERV9CQVNFXV1cbiAgICAgKiAgLSBgamFgIOOCquODleOCu+ODg+ODiOWApOOCkiBbW1JFU1VMVF9DT0RFX0JBU0VdXSDjgajjgZfjgabmjIflrppcbiAgICAgKiBAcGFyYW0gY29kZVxuICAgICAqICAtIGBlbmAgc2V0IGxvY2FsIGNvZGUgZm9yIGRlY2xhcmF0aW9uLiBleCkgJzEnXG4gICAgICogIC0gYGphYCDlrqPoqIDnlKjjga7jg63jg7zjgqvjg6vjgrPjg7zjg4nlgKTjgpLmjIflrpogIOS+iykgJzEnXG4gICAgICogQHBhcmFtIG1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIHNldCBlcnJvciBtZXNzYWdlIGZvciBoZWxwIHN0cmluZy5cbiAgICAgKiAgLSBgamFgIOODmOODq+ODl+OCueODiOODquODs+OCsOeUqOOCqOODqeODvOODoeODg+OCu+ODvOOCuOOCkuaMh+WumlxuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBERUNMQVJFX0VSUk9SX0NPREUoYmFzZTogUkVTVUxUX0NPREVfQkFTRSwgY29kZTogbnVtYmVyLCBtZXNzYWdlPzogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIGRlY2xhcmVSZXN1bHRDb2RlKGJhc2UsIGNvZGUsIG1lc3NhZ2UsIGZhbHNlKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIHNlY3Rpb246XG5cbiAgICAvKiogQGludGVybmFsIHJlZ2lzdGVyIGZvciBbW1JFU1VMVF9DT0RFXV0gKi9cbiAgICBmdW5jdGlvbiBkZWNsYXJlUmVzdWx0Q29kZShiYXNlOiBSRVNVTFRfQ09ERV9CQVNFLCBjb2RlOiBudW1iZXIsIG1lc3NhZ2U6IHN0cmluZyB8IHVuZGVmaW5lZCwgc3VjY2VlZGVkOiBib29sZWFuKTogbnVtYmVyIHwgbmV2ZXIge1xuICAgICAgICBpZiAoY29kZSA8IDAgfHwgUkVTVUxUX0NPREVfUkFOR0UuTUFYIDw9IGNvZGUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKGBkZWNsYXJlUmVzdWx0Q29kZSgpLCBpbnZhbGlkIGxvY2FsLWNvZGUgcmFuZ2UuIFtjb2RlOiAke2NvZGV9XWApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNpZ25lZCA9IHN1Y2NlZWRlZCA/IDEgOiAtMTtcbiAgICAgICAgY29uc3QgcmVzdWx0Q29kZSA9IHNpZ25lZCAqIChiYXNlIGFzIG51bWJlciArIGNvZGUpO1xuICAgICAgICBfY29kZTJtZXNzYWdlW3Jlc3VsdENvZGVdID0gbWVzc2FnZSA/IG1lc3NhZ2UgOiAoYFtDT0RFOiAke3Jlc3VsdENvZGV9XWApO1xuICAgICAgICByZXR1cm4gcmVzdWx0Q29kZTtcbiAgICB9XG59XG4iLCJpbXBvcnQgUkVTVUxUX0NPREUgICAgICAgICAgICAgID0gQ0RQX0RFQ0xBUkUuUkVTVUxUX0NPREU7XG5pbXBvcnQgUkVTVUxUX0NPREVfQkFTRSAgICAgICAgID0gQ0RQX0RFQ0xBUkUuUkVTVUxUX0NPREVfQkFTRTtcbmltcG9ydCBSRVNVTFRfQ09ERV9SQU5HRSAgICAgICAgPSBDRFBfREVDTEFSRS5SRVNVTFRfQ09ERV9SQU5HRTtcbmltcG9ydCBMT0NBTF9DT0RFX1JBTkdFX0dVSURFICAgPSBDRFBfREVDTEFSRS5MT0NBTF9DT0RFX1JBTkdFX0dVSURFO1xuaW1wb3J0IERFQ0xBUkVfU1VDQ0VTU19DT0RFICAgICA9IENEUF9ERUNMQVJFLkRFQ0xBUkVfU1VDQ0VTU19DT0RFO1xuaW1wb3J0IERFQ0xBUkVfRVJST1JfQ09ERSAgICAgICA9IENEUF9ERUNMQVJFLkRFQ0xBUkVfRVJST1JfQ09ERTtcbmltcG9ydCBBU1NJR05fUkVTVUxUX0NPREUgICAgICAgPSBDRFBfREVDTEFSRS5BU1NJR05fUkVTVUxUX0NPREU7XG5pbXBvcnQgRVJST1JfTUVTU0FHRV9NQVAgICAgICAgID0gQ0RQX0RFQ0xBUkUuRVJST1JfTUVTU0FHRV9NQVA7XG5cbmNvbnN0IGVudW0gRGVzY3JpcHRpb24ge1xuICAgIFVOS05PV05fRVJST1JfTkFNRSA9J1VOS05PV04nLFxufVxuXG5leHBvcnQge1xuICAgIFJFU1VMVF9DT0RFLFxuICAgIFJFU1VMVF9DT0RFX0JBU0UsXG4gICAgUkVTVUxUX0NPREVfUkFOR0UsXG4gICAgTE9DQUxfQ09ERV9SQU5HRV9HVUlERSxcbiAgICBERUNMQVJFX1NVQ0NFU1NfQ09ERSxcbiAgICBERUNMQVJFX0VSUk9SX0NPREUsXG4gICAgQVNTSUdOX1JFU1VMVF9DT0RFLFxufTtcblxuLyoqXG4gKiBAZW4gSnVkZ2UgZmFpbCBvciBub3QuXG4gKiBAamEg5aSx5pWX5Yik5a6aXG4gKlxuICogQHBhcmFtIGNvZGUgW1tSRVNVTFRfQ09ERV1dXG4gKiBAcmV0dXJucyB0cnVlOiBmYWlsIHJlc3VsdCAvIGZhbHNlOiBzdWNjZXNzIHJlc3VsdFxuICovXG5leHBvcnQgZnVuY3Rpb24gRkFJTEVEKGNvZGU6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIHJldHVybiBjb2RlIDwgMDtcbn1cblxuLyoqXG4gKiBAZW4gSnVkZ2Ugc3VjY2VzcyBvciBub3QuXG4gKiBAamEg5oiQ5Yqf5Yik5a6aXG4gKlxuICogQHBhcmFtIGNvZGUgW1tSRVNVTFRfQ09ERV1dXG4gKiBAcmV0dXJucyB0cnVlOiBzdWNjZXNzIHJlc3VsdCAvIGZhbHNlOiBmYWlsIHJlc3VsdFxuICovXG5leHBvcnQgZnVuY3Rpb24gU1VDQ0VFREVEKGNvZGU6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhRkFJTEVEKGNvZGUpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIFtbUkVTVUxUX0NPREVdXSBgbmFtZWAgc3RyaW5nIGZyb20gW1tSRVNVTFRfQ09ERV1dLlxuICogQGphIFtbUkVTVUxUX0NPREVdXSDjgpIgW1tSRVNVTFRfQ09ERV1dIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBjb2RlIFtbUkVTVUxUX0NPREVdXVxuICogQHBhcmFtIHRhZyAgY3VzdG9tIHRhZyBpZiBuZWVkZWQuXG4gKiBAcmV0dXJucyBuYW1lIHN0cmluZyBleCkgXCJbdGFnXVtOT1RfU1VQUE9SVEVEXVwiXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b05hbWVTdHJpbmcoY29kZTogbnVtYmVyLCB0YWc/OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHByZWZpeCA9IHRhZyA/IGBbJHt0YWd9XWAgOiAnJztcbiAgICBpZiAoUkVTVUxUX0NPREVbY29kZV0pIHtcbiAgICAgICAgcmV0dXJuIGAke3ByZWZpeH1bJHtSRVNVTFRfQ09ERVtjb2RlXX1dYDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYCR7cHJlZml4fVske0Rlc2NyaXB0aW9uLlVOS05PV05fRVJST1JfTkFNRX1dYDtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gaGVscCBzdHJpbmcgZnJvbSBbW1JFU1VMVF9DT0RFXV0uXG4gKiBAamEgW1tSRVNVTFRfQ09ERV1dIOOCkuODmOODq+ODl+OCueODiOODquODs+OCsOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBjb2RlIFtbUkVTVUxUX0NPREVdXVxuICogQHJldHVybnMgcmVnaXN0ZXJlZCBoZWxwIHN0cmluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9IZWxwU3RyaW5nKGNvZGU6IG51bWJlcik6IHN0cmluZyB7XG4gICAgY29uc3QgbWFwID0gRVJST1JfTUVTU0FHRV9NQVAoKTtcbiAgICBpZiAobWFwW2NvZGVdKSB7XG4gICAgICAgIHJldHVybiBtYXBbY29kZV07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGB1bnJlZ2lzdGVyZWQgcmVzdWx0IGNvZGUuIFtjb2RlOiAke2NvZGV9XWA7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5pbXBvcnQge1xuICAgIGNsYXNzTmFtZSxcbiAgICBpc05pbCxcbiAgICBpc1N0cmluZyxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgUkVTVUxUX0NPREUsXG4gICAgU1VDQ0VFREVELFxuICAgIEZBSUxFRCxcbiAgICB0b05hbWVTdHJpbmcsXG4gICAgdG9IZWxwU3RyaW5nLFxufSBmcm9tICcuL3Jlc3VsdC1jb2RlJztcblxuLyogZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZCAqL1xuY29uc3QgaXNOdW1iZXIgPSBOdW1iZXIuaXNGaW5pdGU7XG5cbmNvbnN0IGVudW0gVGFnIHtcbiAgICBFUlJPUiAgPSAnRXJyb3InLFxuICAgIFJFU1VMVCA9ICdSZXN1bHQnLFxufVxuXG4vKipcbiAqIEBlbiBBIHJlc3VsdCBob2xkZXIgY2xhc3MuIDxicj5cbiAqICAgICBEZXJpdmVkIG5hdGl2ZSBgRXJyb3JgIGNsYXNzLlxuICogQGphIOWHpueQhue1kOaenOS8nemBlOOCr+ODqeOCuSA8YnI+XG4gKiAgICAg44ON44Kk44OG44Kj44OWIGBFcnJvcmAg44Gu5rS+55Sf44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBSZXN1bHQgZXh0ZW5kcyBFcnJvciB7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGNvZGVcbiAgICAgKiAgLSBgZW5gIHJlc3VsdCBjb2RlXG4gICAgICogIC0gYGphYCDntZDmnpzjgrPjg7zjg4lcbiAgICAgKiBAcGFyYW0gbWVzc2FnZVxuICAgICAqICAtIGBlbmAgcmVzdWx0IGluZm8gbWVzc2FnZVxuICAgICAqICAtIGBqYWAg57WQ5p6c5oOF5aCx44Oh44OD44K744O844K4XG4gICAgICogQHBhcmFtIGNhdXNlXG4gICAgICogIC0gYGVuYCBsb3ctbGV2ZWwgZXJyb3IgaW5mb3JtYXRpb25cbiAgICAgKiAgLSBgamFgIOS4i+S9jeOBruOCqOODqeODvOaDheWgsVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvZGU/OiBudW1iZXIsIG1lc3NhZ2U/OiBzdHJpbmcsIGNhdXNlPzogYW55KSB7XG4gICAgICAgIGNvZGUgPSBpc05pbChjb2RlKSA/IFJFU1VMVF9DT0RFLlNVQ0NFU1MgOiBpc051bWJlcihjb2RlKSA/IE1hdGgudHJ1bmMoY29kZSkgOiBSRVNVTFRfQ09ERS5GQUlMO1xuICAgICAgICBzdXBlcihtZXNzYWdlIHx8IHRvSGVscFN0cmluZyhjb2RlKSk7XG4gICAgICAgIGxldCB0aW1lID0gaXNFcnJvcihjYXVzZSkgPyAoY2F1c2UgYXMgUmVzdWx0KS50aW1lIDogdW5kZWZpbmVkO1xuICAgICAgICBpc051bWJlcih0aW1lIGFzIG51bWJlcikgfHwgKHRpbWUgPSBEYXRlLm5vdygpKTtcbiAgICAgICAgY29uc3QgZGVzY3JpcHRvcnM6IFByb3BlcnR5RGVzY3JpcHRvck1hcCA9IHtcbiAgICAgICAgICAgIGNvZGU6ICB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiBjb2RlICB9LFxuICAgICAgICAgICAgY2F1c2U6IHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IGNhdXNlIH0sXG4gICAgICAgICAgICB0aW1lOiAgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdGltZSAgfSxcbiAgICAgICAgfTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywgZGVzY3JpcHRvcnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBbW1JFU1VMVF9DT0RFXV0gdmFsdWUuXG4gICAgICogQGphIFtbUkVTVUxUX0NPREVdXSDjga7lgKRcbiAgICAgKi9cbiAgICByZWFkb25seSBjb2RlITogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFN0b2NrIGxvdy1sZXZlbCBlcnJvciBpbmZvcm1hdGlvbi5cbiAgICAgKiBAamEg5LiL5L2N44Gu44Ko44Op44O85oOF5aCx44KS5qC857SNXG4gICAgICovXG4gICAgcmVhZG9ubHkgY2F1c2U6IGFueTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZW5lcmF0ZWQgdGltZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAamEg55Sf5oiQ44GV44KM44Gf5pmC5Yi75oOF5aCxXG4gICAgICovXG4gICAgcmVhZG9ubHkgdGltZSE6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBzdWNjZWVkZWQgb3Igbm90LlxuICAgICAqIEBqYSDmiJDlip/liKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNTdWNjZWVkZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBTVUNDRUVERUQodGhpcy5jb2RlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2UgZmFpbGVkIG9yIG5vdC5cbiAgICAgKiBAamEg5aSx5pWX5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzRmFpbGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gRkFJTEVEKHRoaXMuY29kZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEp1ZGdlIGNhbmNlbGVkIG9yIG5vdC5cbiAgICAgKiBAamEg44Kt44Oj44Oz44K744Or44Ko44Op44O85Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzQ2FuY2VsZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvZGUgPT09IFJFU1VMVF9DT0RFLkFCT1JUO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZm9ybWF0dGVkIFtbUkVTVUxUX0NPREVdXSBuYW1lIHN0cmluZy5cbiAgICAgKiBAamEg44OV44Kp44O844Oe44OD44OI44GV44KM44GfIFtbUkVTVUxUX0NPREVdXSDlkI3mloflrZfliJfjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgY29kZU5hbWUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRvTmFtZVN0cmluZyh0aGlzLmNvZGUsIHRoaXMubmFtZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBbW1JFU1VMVF9DT0RFXV0gaGVscCBzdHJpbmcuXG4gICAgICogQGphIFtbUkVTVUxUX0NPREVdXSDjga7jg5jjg6vjg5fjgrnjg4jjg6rjg7PjgrDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaGVscCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdG9IZWxwU3RyaW5nKHRoaXMuY29kZSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6IFRhZy5SRVNVTFQge1xuICAgICAgICByZXR1cm4gVGFnLlJFU1VMVDtcbiAgICB9XG59XG5cblJlc3VsdC5wcm90b3R5cGUubmFtZSA9IFRhZy5SRVNVTFQ7XG5cbi8qKiBAaW50ZXJuYSBsUmV0dXJucyBgdHJ1ZWAgaWYgYHhgIGlzIGBFcnJvcmAsIGBmYWxzZWAgb3RoZXJ3aXNlLiAqL1xuZnVuY3Rpb24gaXNFcnJvcih4OiB1bmtub3duKTogeCBpcyBFcnJvciB7XG4gICAgcmV0dXJuIHggaW5zdGFuY2VvZiBFcnJvciB8fCBjbGFzc05hbWUoeCkgPT09IFRhZy5FUlJPUjtcbn1cblxuLyoqIFJldHVybnMgYHRydWVgIGlmIGB4YCBpcyBgUmVzdWx0YCwgYGZhbHNlYCBvdGhlcndpc2UuICovXG5leHBvcnQgZnVuY3Rpb24gaXNSZXN1bHQoeDogdW5rbm93bik6IHggaXMgUmVzdWx0IHtcbiAgICByZXR1cm4geCBpbnN0YW5jZW9mIFJlc3VsdCB8fCBjbGFzc05hbWUoeCkgPT09IFRhZy5SRVNVTFQ7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gW1tSZXN1bHRdXSBvYmplY3QuXG4gKiBAamEgW1tSZXN1bHRdXSDjgqrjg5bjgrjjgqfjgq/jg4jjgavlpInmj5tcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvUmVzdWx0KG86IHVua25vd24pOiBSZXN1bHQge1xuICAgIGlmIChvIGluc3RhbmNlb2YgUmVzdWx0KSB7XG4gICAgICAgIC8qIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBwcmVmZXItY29uc3QgKi9cbiAgICAgICAgbGV0IHsgY29kZSwgY2F1c2UsIHRpbWUgfSA9IG87XG4gICAgICAgIGNvZGUgPSBpc05pbChjb2RlKSA/IFJFU1VMVF9DT0RFLlNVQ0NFU1MgOiBpc051bWJlcihjb2RlKSA/IE1hdGgudHJ1bmMoY29kZSkgOiBSRVNVTFRfQ09ERS5GQUlMO1xuICAgICAgICBpc051bWJlcih0aW1lKSB8fCAodGltZSA9IERhdGUubm93KCkpO1xuICAgICAgICAvLyBEbyBub3RoaW5nIGlmIGFscmVhZHkgZGVmaW5lZFxuICAgICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KG8sICdjb2RlJywgIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IGNvZGUgIH0pO1xuICAgICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KG8sICdjYXVzZScsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IGNhdXNlIH0pO1xuICAgICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KG8sICd0aW1lJywgIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHRpbWUgIH0pO1xuICAgICAgICByZXR1cm4gbztcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBlID0gT2JqZWN0KG8pIGFzIFJlc3VsdDtcbiAgICAgICAgY29uc3QgY29kZSA9IGlzTnVtYmVyKGUuY29kZSkgPyBlLmNvZGUgOiBvIGFzIGFueTtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGlzU3RyaW5nKGUubWVzc2FnZSkgPyBlLm1lc3NhZ2UgOiBpc1N0cmluZyhvKSA/IG8gOiB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGNhdXNlID0gaXNFcnJvcihlLmNhdXNlKSA/IGUuY2F1c2UgOiBpc0Vycm9yKG8pID8gbyA6IGlzU3RyaW5nKG8pID8gbmV3IEVycm9yKG8pIDogbztcbiAgICAgICAgcmV0dXJuIG5ldyBSZXN1bHQoY29kZSwgbWVzc2FnZSwgY2F1c2UpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIFtbUmVzdWx0XV0gaGVscGVyLlxuICogQGphIFtbUmVzdWx0XV0g44Kq44OW44K444Kn44Kv44OI5qeL56+J44OY44Or44OR44O8XG4gKlxuICogQHBhcmFtIGNvZGVcbiAqICAtIGBlbmAgcmVzdWx0IGNvZGVcbiAqICAtIGBqYWAg57WQ5p6c44Kz44O844OJXG4gKiBAcGFyYW0gbWVzc2FnZVxuICogIC0gYGVuYCByZXN1bHQgaW5mbyBtZXNzYWdlXG4gKiAgLSBgamFgIOe1kOaenOaDheWgseODoeODg+OCu+ODvOOCuFxuICogQHBhcmFtIGNhdXNlXG4gKiAgLSBgZW5gIGxvdy1sZXZlbCBlcnJvciBpbmZvcm1hdGlvblxuICogIC0gYGphYCDkuIvkvY3jga7jgqjjg6njg7zmg4XloLFcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1ha2VSZXN1bHQoY29kZTogbnVtYmVyLCBtZXNzYWdlPzogc3RyaW5nLCBjYXVzZT86IGFueSk6IFJlc3VsdCB7XG4gICAgcmV0dXJuIG5ldyBSZXN1bHQoY29kZSwgbWVzc2FnZSwgY2F1c2UpO1xufVxuXG4vKipcbiAqIEBlbiBDcmVhdGUgY2FuY2VsZWQgW1tSZXN1bHRdXSBoZWxwZXIuXG4gKiBAamEg44Kt44Oj44Oz44K744Or5oOF5aCx5qC857SNIFtbUmVzdWx0XV0g44Kq44OW44K444Kn44Kv44OI5qeL56+J44OY44Or44OR44O8XG4gKlxuICogQHBhcmFtIG1lc3NhZ2VcbiAqICAtIGBlbmAgcmVzdWx0IGluZm8gbWVzc2FnZVxuICogIC0gYGphYCDntZDmnpzmg4XloLHjg6Hjg4Pjgrvjg7zjgrhcbiAqIEBwYXJhbSBjYXVzZVxuICogIC0gYGVuYCBsb3ctbGV2ZWwgZXJyb3IgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5LiL5L2N44Gu44Ko44Op44O85oOF5aCxXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlQ2FuY2VsZWRSZXN1bHQobWVzc2FnZT86IHN0cmluZywgY2F1c2U/OiBhbnkpOiBSZXN1bHQge1xuICAgIHJldHVybiBuZXcgUmVzdWx0KFJFU1VMVF9DT0RFLkFCT1JULCBt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
