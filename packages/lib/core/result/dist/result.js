/*!
 * @cdp/result 0.9.17
 *   result utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
})(this, (function (exports, coreUtils) { 'use strict';

    /* eslint-disable
        no-inner-declarations,
        @typescript-eslint/no-namespace,
        @typescript-eslint/no-unused-vars,
        @typescript-eslint/no-duplicate-enum-values,
     */
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
         * @en Assign declared {@link RESULT_CODE} to root enumeration.
         *     (It's enable to merge enum in the module system environment.)
         * @ja 拡張した {@link RESULT_CODE} を ルート enum にアサイン
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
         *  - `en` set base offset as {@link RESULT_CODE_BASE}
         *  - `ja` オフセット値を {@link RESULT_CODE_BASE} として指定
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
         *  - `en` set base offset as {@link RESULT_CODE_BASE}
         *  - `ja` オフセット値を {@link RESULT_CODE_BASE} として指定
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
        /** @internal register for {@link RESULT_CODE} */
        function declareResultCode(base, code, message, succeeded) {
            if (code < 0 || 1000 /* RESULT_CODE_RANGE.MAX */ <= code) {
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
     * @param code {@link RESULT_CODE}
     * @returns true: fail result / false: success result
     */
    function FAILED(code) {
        return code < 0;
    }
    /**
     * @en Judge success or not.
     * @ja 成功判定
     *
     * @param code {@link RESULT_CODE}
     * @returns true: success result / false: fail result
     */
    function SUCCEEDED(code) {
        return !FAILED(code);
    }
    /**
     * @en Convert to {@link RESULT_CODE} `name` string from {@link RESULT_CODE}.
     * @ja {@link RESULT_CODE} を {@link RESULT_CODE} 文字列に変換
     *
     * @param code {@link RESULT_CODE}
     * @param tag  custom tag if needed.
     * @returns name string ex) "[tag][NOT_SUPPORTED]"
     */
    function toNameString(code, tag) {
        const prefix = tag ? `[${tag}]` : '';
        if (RESULT_CODE[code]) {
            return `${prefix}[${RESULT_CODE[code]}]`;
        }
        else {
            return `${prefix}[${"UNKNOWN" /* Description.UNKNOWN_ERROR_NAME */}]`;
        }
    }
    /**
     * @en Convert to help string from {@link RESULT_CODE}.
     * @ja {@link RESULT_CODE} をヘルプストリングに変換
     *
     * @param code {@link RESULT_CODE}
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

    const { 
    /** @internal */ isFinite: isNumber } = Number;
    /** @internal */
    const desc = (value) => {
        return {
            configurable: false,
            writable: false,
            enumerable: true,
            value,
        };
    };
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
         * @param options
         *  - `en` error construction options
         *  - `ja` エラー構築オプション
         */
        constructor(code, message, options) {
            code = coreUtils.isNullish(code) ? RESULT_CODE.SUCCESS : isNumber(code) ? Math.trunc(code) : RESULT_CODE.FAIL;
            super(message ?? toHelpString(code), options);
            const cause = options?.cause;
            let time = isError(cause) ? cause.time : undefined;
            isNumber(time) || (time = Date.now());
            Object.defineProperties(this, { code: desc(code), time: desc(time), cause: desc(cause) });
        }
        /**
         * @en {@link RESULT_CODE} value.
         * @ja {@link RESULT_CODE} の値
         */
        code;
        /**
         * @en Generated time information.
         * @ja 生成された時刻情報
         */
        time;
        /**
         * @en Stock low-level error information.
         * @ja 下位のエラー情報を格納
         */
        cause;
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
         * @en Get formatted {@link RESULT_CODE} name string.
         * @ja フォーマットされた {@link RESULT_CODE} 名文字列を取得
         */
        get codeName() {
            return toNameString(this.code, this.name);
        }
        /**
         * @en Get {@link RESULT_CODE} help string.
         * @ja {@link RESULT_CODE} のヘルプストリングを取得
         */
        get help() {
            return toHelpString(this.code);
        }
        /** @internal */
        get [Symbol.toStringTag]() {
            return "Result" /* Tag.RESULT */;
        }
    }
    Result.prototype.name = "Result" /* Tag.RESULT */;
    /** @interna lReturns `true` if `x` is `Error`, `false` otherwise. */
    function isError(x) {
        return x instanceof Error || coreUtils.className(x) === "Error" /* Tag.ERROR */;
    }
    /** Returns `true` if `x` is `Result`, `false` otherwise. */
    function isResult(x) {
        return x instanceof Result || coreUtils.className(x) === "Result" /* Tag.RESULT */;
    }
    /**
     * @en Convert to {@link Result} object.
     * @ja {@link Result} オブジェクトに変換
     */
    function toResult(o) {
        if (o instanceof Result) {
            /* eslint-disable-next-line prefer-const */
            let { code, cause, time } = o;
            code = coreUtils.isNullish(code) ? RESULT_CODE.SUCCESS : isNumber(code) ? Math.trunc(code) : RESULT_CODE.FAIL;
            isNumber(time) || (time = Date.now());
            // Do nothing if already defined
            Reflect.defineProperty(o, 'code', desc(code));
            Reflect.defineProperty(o, 'time', desc(time));
            Reflect.defineProperty(o, 'cause', desc(cause));
            return o;
        }
        else {
            const e = Object(o);
            const message = coreUtils.isString(e.message) ? e.message : coreUtils.isString(o) ? o : undefined;
            const code = coreUtils.isCancelLikeError(message) ? RESULT_CODE.ABORT : isNumber(e.code) ? e.code : o;
            const cause = isError(e.cause) ? e.cause : isError(o) ? o : coreUtils.isString(o) ? new Error(o) : o;
            return new Result(code, message, { cause });
        }
    }
    /**
     * @en Create {@link Result} helper.
     * @ja {@link Result} オブジェクト構築ヘルパー
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
        return new Result(code, message, { cause });
    }
    /**
     * @en Create canceled {@link Result} helper.
     * @ja キャンセル情報格納 {@link Result} オブジェクト構築ヘルパー
     *
     * @param message
     *  - `en` result info message
     *  - `ja` 結果情報メッセージ
     * @param cause
     *  - `en` low-level error information
     *  - `ja` 下位のエラー情報
     */
    function makeCanceledResult(message, cause) {
        return new Result(RESULT_CODE.ABORT, message, { cause });
    }

    exports.ASSIGN_RESULT_CODE = ASSIGN_RESULT_CODE;
    exports.DECLARE_ERROR_CODE = DECLARE_ERROR_CODE;
    exports.DECLARE_SUCCESS_CODE = DECLARE_SUCCESS_CODE;
    exports.FAILED = FAILED;
    exports.RESULT_CODE = RESULT_CODE;
    exports.Result = Result;
    exports.SUCCEEDED = SUCCEEDED;
    exports.isResult = isResult;
    exports.makeCanceledResult = makeCanceledResult;
    exports.makeResult = makeResult;
    exports.toHelpString = toHelpString;
    exports.toNameString = toNameString;
    exports.toResult = toResult;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzdWx0LmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwicmVzdWx0LWNvZGUudHMiLCJyZXN1bHQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBuby1pbm5lci1kZWNsYXJhdGlvbnMsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWR1cGxpY2F0ZS1lbnVtLXZhbHVlcyxcbiAqL1xuXG4vKlxuICogTk9URTog5YaF6YOo44Oi44K444Ol44O844Or44GrIGBDRFBgIG5hbWVzcGFjZSDjgpLkvb/nlKjjgZfjgabjgZfjgb7jgYbjgagsIOWklumDqOODouOCuOODpeODvOODq+OBp+OBr+Wuo+iogOOBp+OBjeOBquOBj+OBquOCiy5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvOTYxMVxuICovXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgLyoqXG4gICAgICogQGVuIENvbnN0YW50IGRlZmluaXRpb24gYWJvdXQgcmFuZ2Ugb2YgdGhlIHJlc3VsdCBjb2RlLlxuICAgICAqIEBqYSDjg6rjgrbjg6vjg4jjgrPjg7zjg4njga7nr4Tlm7LjgavplqLjgZnjgovlrprmlbDlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgY29uc3QgZW51bSBSRVNVTFRfQ09ERV9SQU5HRSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gVGhlIGFzc2lnbmFibGUgcmFuZ2UgZm9yIHRoZSBjbGllbnQncyBsb2NhbCByZXN1bHQgY29yZCBieSB3aGljaCBleHBhbnNpb24gaXMgcG9zc2libGUuXG4gICAgICAgICAqIEBqYSDjgq/jg6njgqTjgqLjg7Pjg4jjgYzmi6HlvLXlj6/og73jgarjg63jg7zjgqvjg6vjg6rjgrbjg6vjg4jjgrPjg7zjg4njga7jgqLjgrXjgqTjg7Plj6/og73poJjln59cbiAgICAgICAgICovXG4gICAgICAgIE1BWCA9IDEwMDAsXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gUmVzZXJ2ZWQgcmFuZ2Ugb2YgZnJhbWV3b3JrLlxuICAgICAgICAgKiBAamEg44OV44Os44O844Og44Ov44O844Kv44Gu5LqI57SE6aCY5Z+fXG4gICAgICAgICAqL1xuICAgICAgICBSRVNFUlZFRCA9IDEwMDAsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBhc3NpZ25tZW50IHJhbmdlIGd1aWRlbGluZSBkZWZpbml0aW9uIHVzZWQgaW4gdGhlIG1vZHVsZS5cbiAgICAgKiBAamEg44Oi44K444Ol44O844Or5YaF44Gn5L2/55So44GZ44KL44Ki44K144Kk44Oz6aCY5Z+f44Ks44Kk44OJ44Op44Kk44Oz5a6a5pWw5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGNvbnN0IGVudW0gTE9DQUxfQ09ERV9SQU5HRV9HVUlERSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gVGhlIGFzc2lnbm1lbnQgcmFuZ2UgZ3VpZGVsaW5lIHBlciAxIG1vZHVsZS5cbiAgICAgICAgICogQGphIDHjg6Ljgrjjg6Xjg7zjg6vlvZPjgZ/jgorjgavlibLjgorlvZPjgabjgovjgqLjgrXjgqTjg7PpoJjln5/jgqzjgqTjg4njg6njgqTjg7NcbiAgICAgICAgICovXG4gICAgICAgIE1PRFVMRSA9IDEwMCxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBUaGUgYXNzaWdubWVudCByYW5nZSBndWlkZWxpbmUgcGVyIDEgZnVuY3Rpb24uXG4gICAgICAgICAqIEBqYSAx5qmf6IO95b2T44Gf44KK44Gr5Ymy44KK5b2T44Gm44KL44Ki44K144Kk44Oz6aCY5Z+f44Ks44Kk44OJ44Op44Kk44OzXG4gICAgICAgICAqL1xuICAgICAgICBGVU5DVElPTiA9IDIwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBPZmZzZXQgdmFsdWUgZW51bWVyYXRpb24gZm9yIHtAbGluayBSRVNVTFRfQ09ERX0uIDxicj5cbiAgICAgKiAgICAgVGhlIGNsaWVudCBjYW4gZXhwYW5kIGEgZGVmaW5pdGlvbiBpbiBvdGhlciBtb2R1bGUuXG4gICAgICogQGphIHtAbGluayBSRVNVTFRfQ09ERX0g44Gu44Kq44OV44K744OD44OI5YCkIDxicj5cbiAgICAgKiAgICAg44Ko44Op44O844Kz44O844OJ5a++5b+c44GZ44KL44Oi44K444Ol44O844Or5YaF44GnIOWumue+qeOCkuaLoeW8teOBmeOCiy5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgKiAgICAgIENPTU1PTiAgICAgID0gMCxcbiAgICAgKiAgICAgIFNPTUVNT0RVTEUgID0gMSAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgICogICAgICBTT01FTU9EVUxFMiA9IDIgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgICAqICB9XG4gICAgICpcbiAgICAgKiAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAqICAgICAgU09NRU1PRFVMRV9ERUNMQVJFICAgICAgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSwgLy8gZm9yIGF2b2lkIFRTMjQzMi5cbiAgICAgKiAgICAgIEVSUk9SX1NPTUVNT0RVTEVfVU5FWFBFQ1RFRCAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5TT01FTU9EVUxFLCBMT0NBTF9DT0RFX0JBU0UuU09NRU1PRFVMRSArIDEsIFwiZXJyb3IgdW5leHBlY3RlZC5cIiksXG4gICAgICogICAgICBFUlJPUl9TT01FTU9EVUxFX0lOVkFMSURfQVJHID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuU09NRU1PRFVMRSwgTE9DQUxfQ09ERV9CQVNFLlNPTUVNT0RVTEUgKyAyLCBcImludmFsaWQgYXJndW1lbnRzLlwiKSxcbiAgICAgKiAgfVxuICAgICAqICBBU1NJR05fUkVTVUxUX0NPREUoUkVTVUxUX0NPREUpO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGV4cG9ydCBjb25zdCBlbnVtIFJFU1VMVF9DT0RFX0JBU0Uge1xuICAgICAgICBERUNMQVJFID0gOTAwNzE5OTI1NDc0MDk5MSwgLy8gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVJcbiAgICAgICAgQ09NTU9OICA9IDAsXG4gICAgICAgIENEUCAgICAgPSAxICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5NT0RVTEUsIC8vIGNkcCByZXNlcnZlZC4gYWJzKDAg772eIDEwMDApXG4vLyAgICAgIE1PRFVMRV9BID0gMSAqIFJFU1VMVF9DT0RFX1JBTkdFLk1BWCwgICAgLy8gZXgpIG1vZHVsZUE6IGFicygxMDAxIO+9niAxOTk5KVxuLy8gICAgICBNT0RVTEVfQiA9IDIgKiBSRVNVTFRfQ09ERV9SQU5HRS5NQVgsICAgIC8vIGV4KSBtb2R1bGVCOiBhYnMoMjAwMSDvvZ4gMjk5OSlcbi8vICAgICAgTU9EVUxFX0MgPSAzICogUkVTVUxUX0NPREVfUkFOR0UuTUFYLCAgICAvLyBleCkgbW9kdWxlQzogYWJzKDMwMDEg772eIDM5OTkpXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEtub3duIENEUCBtb2R1bGUgb2ZmZXN0IGRlZmluaXRpb24uXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCiyBDRFAg44Oi44K444Ol44O844Or44Gu44Kq44OV44K744OD44OI5a6a576pXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgKiAgICBBSkFYID0gQ0RQX0tOT1dOX01PRFVMRS5BSkFYICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICogICBBSkFYX0RFQ0xBUkUgICAgICAgID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAqICAgRVJST1JfQUpBWF9SRVNQT05TRSA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkFKQVggKyAxLCAnbmV0d29yayBlcnJvci4nKSxcbiAgICAgKiAgIEVSUk9SX0FKQVhfVElNRU9VVCAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMiwgJ3JlcXVlc3QgdGltZW91dC4nKSxcbiAgICAgKiB9XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZXhwb3J0IGNvbnN0IGVudW0gQ0RQX0tOT1dOX01PRFVMRSB7XG4gICAgICAgIC8qKiBgQGNkcC9hamF4YCAqL1xuICAgICAgICBBSkFYID0gMSxcbiAgICAgICAgLyoqIGBAY2RwL2kxOG5gICovXG4gICAgICAgIEkxOE4gPSAyLFxuICAgICAgICAvKiogYEBjZHAvZGF0YS1zeW5jYCwgYEBjZHAvbW9kZWxgLCBgQGNkcC9jb2xsZWN0aW9uYCwgYEBjZHAvdmlld2AsIGBAY2RwL3JvdXRlcmAgKi9cbiAgICAgICAgTVZDICA9IDMsXG4gICAgICAgIC8qKiBgQGNkcC9hcHBgICovXG4gICAgICAgIEFQUCAgPSA0LFxuICAgICAgICAvKiogb2Zmc2V0IGZvciB1bmtub3duIG1vZHVsZSAqL1xuICAgICAgICBPRkZTRVQsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENvbW1vbiByZXN1bHQgY29kZSBmb3IgdGhlIGFwcGxpY2F0aW9uLlxuICAgICAqIEBqYSDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7PlhajkvZPjgafkvb/nlKjjgZnjgovlhbHpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIC8qKiBgZW5gIGdlbmVyYWwgc3VjY2VzcyBjb2RlICAgICAgICAgICAgIDxicj4gYGphYCDmsY7nlKjmiJDlip/jgrPjg7zjg4kgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgIFNVQ0NFU1MgPSAwLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIGNhbmNlbCBjb2RlICAgICAgICAgICAgICA8YnI+IGBqYWAg5rGO55So44Kt44Oj44Oz44K744Or44Kz44O844OJICAgICAgICAgICAgICAgICAqL1xuICAgICAgICBBQk9SVCA9IDEsXG4gICAgICAgIC8qKiBgZW5gIGdlbmVyYWwgcGVuZGluZyBjb2RlICAgICAgICAgICAgIDxicj4gYGphYCDmsY7nlKjjgqrjg5rjg6zjg7zjgrfjg6fjg7PmnKrlrp/ooYzjgqjjg6njg7zjgrPjg7zjg4kgKi9cbiAgICAgICAgUEVORElORyA9IDIsXG4gICAgICAgIC8qKiBgZW5gIGdlbmVyYWwgc3VjY2VzcyBidXQgbm9vcCBjb2RlICAgIDxicj4gYGphYCDmsY7nlKjlrp/ooYzkuI3opoHjgrPjg7zjg4kgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgTk9PUCA9IDMsXG4gICAgICAgIC8qKiBgZW5gIGdlbmVyYWwgZXJyb3IgY29kZSAgICAgICAgICAgICAgIDxicj4gYGphYCDmsY7nlKjjgqjjg6njg7zjgrPjg7zjg4kgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICBGQUlMID0gLTEsXG4gICAgICAgIC8qKiBgZW5gIGdlbmVyYWwgZmF0YWwgZXJyb3IgY29kZSAgICAgICAgIDxicj4gYGphYCDmsY7nlKjoh7Tlkb3nmoTjgqjjg6njg7zjgrPjg7zjg4kgICAgICAgICAgICAgICAqL1xuICAgICAgICBGQVRBTCA9IC0yLFxuICAgICAgICAvKiogYGVuYCBnZW5lcmFsIG5vdCBzdXBwb3J0ZWQgZXJyb3IgY29kZSA8YnI+IGBqYWAg5rGO55So44Kq44Oa44Os44O844K344On44Oz44Ko44Op44O844Kz44O844OJICAgICAgICovXG4gICAgICAgIE5PVF9TVVBQT1JURUQgPSAtMyxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXNzaWduIGRlY2xhcmVkIHtAbGluayBSRVNVTFRfQ09ERX0gdG8gcm9vdCBlbnVtZXJhdGlvbi5cbiAgICAgKiAgICAgKEl0J3MgZW5hYmxlIHRvIG1lcmdlIGVudW0gaW4gdGhlIG1vZHVsZSBzeXN0ZW0gZW52aXJvbm1lbnQuKVxuICAgICAqIEBqYSDmi6HlvLXjgZfjgZ8ge0BsaW5rIFJFU1VMVF9DT0RFfSDjgpIg44Or44O844OIIGVudW0g44Gr44Ki44K144Kk44OzXG4gICAgICogICAgIOODouOCuOODpeODvOODq+OCt+OCueODhuODoOeSsOWig+OBq+OBiuOBhOOBpuOCguOAgWVudW0g44KS44Oe44O844K444KS5Y+v6IO944Gr44GZ44KLXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIEFTU0lHTl9SRVNVTFRfQ09ERShleHRlbmQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24oUkVTVUxUX0NPREUsIGV4dGVuZCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIGNvbnN0IF9jb2RlMm1lc3NhZ2U6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAgICcwJzogJ29wZXJhdGlvbiBzdWNjZWVkZWQuJyxcbiAgICAgICAgJzEnOiAnb3BlcmF0aW9uIGFib3J0ZWQuJyxcbiAgICAgICAgJzInOiAnb3BlcmF0aW9uIHBlbmRpbmcuJyxcbiAgICAgICAgJzMnOiAnbm8gb3BlcmF0aW9uLicsXG4gICAgICAgICctMSc6ICdvcGVyYXRpb24gZmFpbGVkLicsXG4gICAgICAgICctMic6ICd1bmV4cGVjdGVkIGVycm9yIG9jY3VyZWQuJyxcbiAgICAgICAgJy0zJzogJ29wZXJhdGlvbiBub3Qgc3VwcG9ydGVkLicsXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gZXJyb3IgbWVzc2FnZSBtYXAuXG4gICAgICogQGphIOOCqOODqeODvOODoeODg+OCu+ODvOOCuOODnuODg+ODl+OBruWPluW+l1xuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBFUlJPUl9NRVNTQUdFX01BUCgpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHtcbiAgICAgICAgcmV0dXJuIF9jb2RlMm1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdlbmVyYXRlIHN1Y2Nlc3MgY29kZS5cbiAgICAgKiBAamEg5oiQ5Yqf44Kz44O844OJ44KS55Sf5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYmFzZVxuICAgICAqICAtIGBlbmAgc2V0IGJhc2Ugb2Zmc2V0IGFzIHtAbGluayBSRVNVTFRfQ09ERV9CQVNFfVxuICAgICAqICAtIGBqYWAg44Kq44OV44K744OD44OI5YCk44KSIHtAbGluayBSRVNVTFRfQ09ERV9CQVNFfSDjgajjgZfjgabmjIflrppcbiAgICAgKiBAcGFyYW0gY29kZVxuICAgICAqICAtIGBlbmAgc2V0IGxvY2FsIGNvZGUgZm9yIGRlY2xhcmF0aW9uLiBleCkgJzEnXG4gICAgICogIC0gYGphYCDlrqPoqIDnlKjjga7jg63jg7zjgqvjg6vjgrPjg7zjg4nlgKTjgpLmjIflrpogIOS+iykgJzEnXG4gICAgICogQHBhcmFtIG1lc3NhZ2VcbiAgICAgKiAgLSBgZW5gIHNldCBlcnJvciBtZXNzYWdlIGZvciBoZWxwIHN0cmluZy5cbiAgICAgKiAgLSBgamFgIOODmOODq+ODl+OCueODiOODquODs+OCsOeUqOOCqOODqeODvOODoeODg+OCu+ODvOOCuOOCkuaMh+WumlxuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBERUNMQVJFX1NVQ0NFU1NfQ09ERShiYXNlOiBSRVNVTFRfQ09ERV9CQVNFLCBjb2RlOiBudW1iZXIsIG1lc3NhZ2U/OiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gZGVjbGFyZVJlc3VsdENvZGUoYmFzZSwgY29kZSwgbWVzc2FnZSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdlbmVyYXRlIGVycm9yIGNvZGUuXG4gICAgICogQGphIOOCqOODqeODvOOCs+ODvOODieeUn+aIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGJhc2VcbiAgICAgKiAgLSBgZW5gIHNldCBiYXNlIG9mZnNldCBhcyB7QGxpbmsgUkVTVUxUX0NPREVfQkFTRX1cbiAgICAgKiAgLSBgamFgIOOCquODleOCu+ODg+ODiOWApOOCkiB7QGxpbmsgUkVTVUxUX0NPREVfQkFTRX0g44Go44GX44Gm5oyH5a6aXG4gICAgICogQHBhcmFtIGNvZGVcbiAgICAgKiAgLSBgZW5gIHNldCBsb2NhbCBjb2RlIGZvciBkZWNsYXJhdGlvbi4gZXgpICcxJ1xuICAgICAqICAtIGBqYWAg5a6j6KiA55So44Gu44Ot44O844Kr44Or44Kz44O844OJ5YCk44KS5oyH5a6aICDkvospICcxJ1xuICAgICAqIEBwYXJhbSBtZXNzYWdlXG4gICAgICogIC0gYGVuYCBzZXQgZXJyb3IgbWVzc2FnZSBmb3IgaGVscCBzdHJpbmcuXG4gICAgICogIC0gYGphYCDjg5jjg6vjg5fjgrnjg4jjg6rjg7PjgrDnlKjjgqjjg6njg7zjg6Hjg4Pjgrvjg7zjgrjjgpLmjIflrppcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gREVDTEFSRV9FUlJPUl9DT0RFKGJhc2U6IFJFU1VMVF9DT0RFX0JBU0UsIGNvZGU6IG51bWJlciwgbWVzc2FnZT86IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBkZWNsYXJlUmVzdWx0Q29kZShiYXNlLCBjb2RlLCBtZXNzYWdlLCBmYWxzZSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBzZWN0aW9uOlxuXG4gICAgLyoqIEBpbnRlcm5hbCByZWdpc3RlciBmb3Ige0BsaW5rIFJFU1VMVF9DT0RFfSAqL1xuICAgIGZ1bmN0aW9uIGRlY2xhcmVSZXN1bHRDb2RlKGJhc2U6IFJFU1VMVF9DT0RFX0JBU0UsIGNvZGU6IG51bWJlciwgbWVzc2FnZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBzdWNjZWVkZWQ6IGJvb2xlYW4pOiBudW1iZXIgfCBuZXZlciB7XG4gICAgICAgIGlmIChjb2RlIDwgMCB8fCBSRVNVTFRfQ09ERV9SQU5HRS5NQVggPD0gY29kZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYGRlY2xhcmVSZXN1bHRDb2RlKCksIGludmFsaWQgbG9jYWwtY29kZSByYW5nZS4gW2NvZGU6ICR7Y29kZX1dYCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2lnbmVkID0gc3VjY2VlZGVkID8gMSA6IC0xO1xuICAgICAgICBjb25zdCByZXN1bHRDb2RlID0gc2lnbmVkICogKGJhc2UgYXMgbnVtYmVyICsgY29kZSk7XG4gICAgICAgIF9jb2RlMm1lc3NhZ2VbcmVzdWx0Q29kZV0gPSBtZXNzYWdlID8gbWVzc2FnZSA6IChgW0NPREU6ICR7cmVzdWx0Q29kZX1dYCk7XG4gICAgICAgIHJldHVybiByZXN1bHRDb2RlO1xuICAgIH1cbn1cbiIsImltcG9ydCBSRVNVTFRfQ09ERSAgICAgICAgICAgICAgPSBDRFBfREVDTEFSRS5SRVNVTFRfQ09ERTtcbmltcG9ydCBSRVNVTFRfQ09ERV9CQVNFICAgICAgICAgPSBDRFBfREVDTEFSRS5SRVNVTFRfQ09ERV9CQVNFO1xuaW1wb3J0IFJFU1VMVF9DT0RFX1JBTkdFICAgICAgICA9IENEUF9ERUNMQVJFLlJFU1VMVF9DT0RFX1JBTkdFO1xuaW1wb3J0IExPQ0FMX0NPREVfUkFOR0VfR1VJREUgICA9IENEUF9ERUNMQVJFLkxPQ0FMX0NPREVfUkFOR0VfR1VJREU7XG5pbXBvcnQgREVDTEFSRV9TVUNDRVNTX0NPREUgICAgID0gQ0RQX0RFQ0xBUkUuREVDTEFSRV9TVUNDRVNTX0NPREU7XG5pbXBvcnQgREVDTEFSRV9FUlJPUl9DT0RFICAgICAgID0gQ0RQX0RFQ0xBUkUuREVDTEFSRV9FUlJPUl9DT0RFO1xuaW1wb3J0IEFTU0lHTl9SRVNVTFRfQ09ERSAgICAgICA9IENEUF9ERUNMQVJFLkFTU0lHTl9SRVNVTFRfQ09ERTtcbmltcG9ydCBFUlJPUl9NRVNTQUdFX01BUCAgICAgICAgPSBDRFBfREVDTEFSRS5FUlJPUl9NRVNTQUdFX01BUDtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBEZXNjcmlwdGlvbiB7XG4gICAgVU5LTk9XTl9FUlJPUl9OQU1FID0nVU5LTk9XTicsXG59XG5cbmV4cG9ydCB7XG4gICAgUkVTVUxUX0NPREUsXG4gICAgUkVTVUxUX0NPREVfQkFTRSxcbiAgICBSRVNVTFRfQ09ERV9SQU5HRSxcbiAgICBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLFxuICAgIERFQ0xBUkVfU1VDQ0VTU19DT0RFLFxuICAgIERFQ0xBUkVfRVJST1JfQ09ERSxcbiAgICBBU1NJR05fUkVTVUxUX0NPREUsXG59O1xuXG4vKipcbiAqIEBlbiBKdWRnZSBmYWlsIG9yIG5vdC5cbiAqIEBqYSDlpLHmlZfliKTlrppcbiAqXG4gKiBAcGFyYW0gY29kZSB7QGxpbmsgUkVTVUxUX0NPREV9XG4gKiBAcmV0dXJucyB0cnVlOiBmYWlsIHJlc3VsdCAvIGZhbHNlOiBzdWNjZXNzIHJlc3VsdFxuICovXG5leHBvcnQgZnVuY3Rpb24gRkFJTEVEKGNvZGU6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIHJldHVybiBjb2RlIDwgMDtcbn1cblxuLyoqXG4gKiBAZW4gSnVkZ2Ugc3VjY2VzcyBvciBub3QuXG4gKiBAamEg5oiQ5Yqf5Yik5a6aXG4gKlxuICogQHBhcmFtIGNvZGUge0BsaW5rIFJFU1VMVF9DT0RFfVxuICogQHJldHVybnMgdHJ1ZTogc3VjY2VzcyByZXN1bHQgLyBmYWxzZTogZmFpbCByZXN1bHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIFNVQ0NFRURFRChjb2RlOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gIUZBSUxFRChjb2RlKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byB7QGxpbmsgUkVTVUxUX0NPREV9IGBuYW1lYCBzdHJpbmcgZnJvbSB7QGxpbmsgUkVTVUxUX0NPREV9LlxuICogQGphIHtAbGluayBSRVNVTFRfQ09ERX0g44KSIHtAbGluayBSRVNVTFRfQ09ERX0g5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGNvZGUge0BsaW5rIFJFU1VMVF9DT0RFfVxuICogQHBhcmFtIHRhZyAgY3VzdG9tIHRhZyBpZiBuZWVkZWQuXG4gKiBAcmV0dXJucyBuYW1lIHN0cmluZyBleCkgXCJbdGFnXVtOT1RfU1VQUE9SVEVEXVwiXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b05hbWVTdHJpbmcoY29kZTogbnVtYmVyLCB0YWc/OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHByZWZpeCA9IHRhZyA/IGBbJHt0YWd9XWAgOiAnJztcbiAgICBpZiAoUkVTVUxUX0NPREVbY29kZV0pIHtcbiAgICAgICAgcmV0dXJuIGAke3ByZWZpeH1bJHtSRVNVTFRfQ09ERVtjb2RlXX1dYDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYCR7cHJlZml4fVske0Rlc2NyaXB0aW9uLlVOS05PV05fRVJST1JfTkFNRX1dYDtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gaGVscCBzdHJpbmcgZnJvbSB7QGxpbmsgUkVTVUxUX0NPREV9LlxuICogQGphIHtAbGluayBSRVNVTFRfQ09ERX0g44KS44OY44Or44OX44K544OI44Oq44Oz44Kw44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGNvZGUge0BsaW5rIFJFU1VMVF9DT0RFfVxuICogQHJldHVybnMgcmVnaXN0ZXJlZCBoZWxwIHN0cmluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9IZWxwU3RyaW5nKGNvZGU6IG51bWJlcik6IHN0cmluZyB7XG4gICAgY29uc3QgbWFwID0gRVJST1JfTUVTU0FHRV9NQVAoKTtcbiAgICBpZiAobWFwW2NvZGVdKSB7XG4gICAgICAgIHJldHVybiBtYXBbY29kZV07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGB1bnJlZ2lzdGVyZWQgcmVzdWx0IGNvZGUuIFtjb2RlOiAke2NvZGV9XWA7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBjbGFzc05hbWUsXG4gICAgaXNOdWxsaXNoLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQ2FuY2VsTGlrZUVycm9yLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBTVUNDRUVERUQsXG4gICAgRkFJTEVELFxuICAgIHRvTmFtZVN0cmluZyxcbiAgICB0b0hlbHBTdHJpbmcsXG59IGZyb20gJy4vcmVzdWx0LWNvZGUnO1xuXG5jb25zdCB7XG4gICAgLyoqIEBpbnRlcm5hbCAqLyBpc0Zpbml0ZTogaXNOdW1iZXJcbn0gPSBOdW1iZXI7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gVGFnIHtcbiAgICBFUlJPUiAgPSAnRXJyb3InLFxuICAgIFJFU1VMVCA9ICdSZXN1bHQnLFxufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBkZXNjID0gKHZhbHVlOiB1bmtub3duKTogUHJvcGVydHlEZXNjcmlwdG9yID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIHZhbHVlLFxuICAgIH07XG59O1xuXG4vKipcbiAqIEBlbiBBIHJlc3VsdCBob2xkZXIgY2xhc3MuIDxicj5cbiAqICAgICBEZXJpdmVkIG5hdGl2ZSBgRXJyb3JgIGNsYXNzLlxuICogQGphIOWHpueQhue1kOaenOS8nemBlOOCr+ODqeOCuSA8YnI+XG4gKiAgICAg44ON44Kk44OG44Kj44OWIGBFcnJvcmAg44Gu5rS+55Sf44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBSZXN1bHQgZXh0ZW5kcyBFcnJvciB7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGNvZGVcbiAgICAgKiAgLSBgZW5gIHJlc3VsdCBjb2RlXG4gICAgICogIC0gYGphYCDntZDmnpzjgrPjg7zjg4lcbiAgICAgKiBAcGFyYW0gbWVzc2FnZVxuICAgICAqICAtIGBlbmAgcmVzdWx0IGluZm8gbWVzc2FnZVxuICAgICAqICAtIGBqYWAg57WQ5p6c5oOF5aCx44Oh44OD44K744O844K4XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGVycm9yIGNvbnN0cnVjdGlvbiBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgqjjg6njg7zmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb2RlPzogbnVtYmVyLCBtZXNzYWdlPzogc3RyaW5nLCBvcHRpb25zPzogRXJyb3JPcHRpb25zKSB7XG4gICAgICAgIGNvZGUgPSBpc051bGxpc2goY29kZSkgPyBSRVNVTFRfQ09ERS5TVUNDRVNTIDogaXNOdW1iZXIoY29kZSkgPyBNYXRoLnRydW5jKGNvZGUpIDogUkVTVUxUX0NPREUuRkFJTDtcbiAgICAgICAgc3VwZXIobWVzc2FnZSA/PyB0b0hlbHBTdHJpbmcoY29kZSksIG9wdGlvbnMpO1xuICAgICAgICBjb25zdCBjYXVzZSA9IG9wdGlvbnM/LmNhdXNlO1xuICAgICAgICBsZXQgdGltZSA9IGlzRXJyb3IoY2F1c2UpID8gKGNhdXNlIGFzIFJlc3VsdCkudGltZSA6IHVuZGVmaW5lZDtcbiAgICAgICAgaXNOdW1iZXIodGltZSEpIHx8ICh0aW1lID0gRGF0ZS5ub3coKSk7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHsgY29kZTogZGVzYyhjb2RlKSwgdGltZTogZGVzYyh0aW1lKSwgY2F1c2U6IGRlc2MoY2F1c2UpIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgUkVTVUxUX0NPREV9IHZhbHVlLlxuICAgICAqIEBqYSB7QGxpbmsgUkVTVUxUX0NPREV9IOOBruWApFxuICAgICAqL1xuICAgIHJlYWRvbmx5IGNvZGUhOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2VuZXJhdGVkIHRpbWUgaW5mb3JtYXRpb24uXG4gICAgICogQGphIOeUn+aIkOOBleOCjOOBn+aZguWIu+aDheWgsVxuICAgICAqL1xuICAgIHJlYWRvbmx5IHRpbWUhOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3RvY2sgbG93LWxldmVsIGVycm9yIGluZm9ybWF0aW9uLlxuICAgICAqIEBqYSDkuIvkvY3jga7jgqjjg6njg7zmg4XloLHjgpLmoLzntI1cbiAgICAgKi9cbiAgICByZWFkb25seSBjYXVzZT86IHVua25vd247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2Ugc3VjY2VlZGVkIG9yIG5vdC5cbiAgICAgKiBAamEg5oiQ5Yqf5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzU3VjY2VlZGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gU1VDQ0VFREVEKHRoaXMuY29kZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEp1ZGdlIGZhaWxlZCBvciBub3QuXG4gICAgICogQGphIOWkseaVl+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0ZhaWxlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIEZBSUxFRCh0aGlzLmNvZGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBjYW5jZWxlZCBvciBub3QuXG4gICAgICogQGphIOOCreODo+ODs+OCu+ODq+OCqOODqeODvOWIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0NhbmNlbGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5jb2RlID09PSBSRVNVTFRfQ09ERS5BQk9SVDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGZvcm1hdHRlZCB7QGxpbmsgUkVTVUxUX0NPREV9IG5hbWUgc3RyaW5nLlxuICAgICAqIEBqYSDjg5Xjgqnjg7zjg57jg4Pjg4jjgZXjgozjgZ8ge0BsaW5rIFJFU1VMVF9DT0RFfSDlkI3mloflrZfliJfjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgY29kZU5hbWUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRvTmFtZVN0cmluZyh0aGlzLmNvZGUsIHRoaXMubmFtZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB7QGxpbmsgUkVTVUxUX0NPREV9IGhlbHAgc3RyaW5nLlxuICAgICAqIEBqYSB7QGxpbmsgUkVTVUxUX0NPREV9IOOBruODmOODq+ODl+OCueODiOODquODs+OCsOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBoZWxwKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0b0hlbHBTdHJpbmcodGhpcy5jb2RlKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKTogVGFnLlJFU1VMVCB7XG4gICAgICAgIHJldHVybiBUYWcuUkVTVUxUO1xuICAgIH1cbn1cblxuUmVzdWx0LnByb3RvdHlwZS5uYW1lID0gVGFnLlJFU1VMVDtcblxuLyoqIEBpbnRlcm5hIGxSZXR1cm5zIGB0cnVlYCBpZiBgeGAgaXMgYEVycm9yYCwgYGZhbHNlYCBvdGhlcndpc2UuICovXG5mdW5jdGlvbiBpc0Vycm9yKHg6IHVua25vd24pOiB4IGlzIEVycm9yIHtcbiAgICByZXR1cm4geCBpbnN0YW5jZW9mIEVycm9yIHx8IGNsYXNzTmFtZSh4KSA9PT0gVGFnLkVSUk9SO1xufVxuXG4vKiogUmV0dXJucyBgdHJ1ZWAgaWYgYHhgIGlzIGBSZXN1bHRgLCBgZmFsc2VgIG90aGVyd2lzZS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1Jlc3VsdCh4OiB1bmtub3duKTogeCBpcyBSZXN1bHQge1xuICAgIHJldHVybiB4IGluc3RhbmNlb2YgUmVzdWx0IHx8IGNsYXNzTmFtZSh4KSA9PT0gVGFnLlJFU1VMVDtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byB7QGxpbmsgUmVzdWx0fSBvYmplY3QuXG4gKiBAamEge0BsaW5rIFJlc3VsdH0g44Kq44OW44K444Kn44Kv44OI44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b1Jlc3VsdChvOiB1bmtub3duKTogUmVzdWx0IHtcbiAgICBpZiAobyBpbnN0YW5jZW9mIFJlc3VsdCkge1xuICAgICAgICAvKiBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcHJlZmVyLWNvbnN0ICovXG4gICAgICAgIGxldCB7IGNvZGUsIGNhdXNlLCB0aW1lIH0gPSBvO1xuICAgICAgICBjb2RlID0gaXNOdWxsaXNoKGNvZGUpID8gUkVTVUxUX0NPREUuU1VDQ0VTUyA6IGlzTnVtYmVyKGNvZGUpID8gTWF0aC50cnVuYyhjb2RlKSA6IFJFU1VMVF9DT0RFLkZBSUw7XG4gICAgICAgIGlzTnVtYmVyKHRpbWUpIHx8ICh0aW1lID0gRGF0ZS5ub3coKSk7XG4gICAgICAgIC8vIERvIG5vdGhpbmcgaWYgYWxyZWFkeSBkZWZpbmVkXG4gICAgICAgIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkobywgJ2NvZGUnLCAgZGVzYyhjb2RlKSk7XG4gICAgICAgIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkobywgJ3RpbWUnLCAgZGVzYyh0aW1lKSk7XG4gICAgICAgIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkobywgJ2NhdXNlJywgZGVzYyhjYXVzZSkpO1xuICAgICAgICByZXR1cm4gbztcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBlID0gT2JqZWN0KG8pIGFzIFJlc3VsdDtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGlzU3RyaW5nKGUubWVzc2FnZSkgPyBlLm1lc3NhZ2UgOiBpc1N0cmluZyhvKSA/IG8gOiB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBpc0NhbmNlbExpa2VFcnJvcihtZXNzYWdlKSA/IFJFU1VMVF9DT0RFLkFCT1JUIDogaXNOdW1iZXIoZS5jb2RlKSA/IGUuY29kZSA6IG8gYXMgbnVtYmVyO1xuICAgICAgICBjb25zdCBjYXVzZSA9IGlzRXJyb3IoZS5jYXVzZSkgPyBlLmNhdXNlIDogaXNFcnJvcihvKSA/IG8gOiBpc1N0cmluZyhvKSA/IG5ldyBFcnJvcihvKSA6IG87XG4gICAgICAgIHJldHVybiBuZXcgUmVzdWx0KGNvZGUsIG1lc3NhZ2UsIHsgY2F1c2UgfSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDcmVhdGUge0BsaW5rIFJlc3VsdH0gaGVscGVyLlxuICogQGphIHtAbGluayBSZXN1bHR9IOOCquODluOCuOOCp+OCr+ODiOani+evieODmOODq+ODkeODvFxuICpcbiAqIEBwYXJhbSBjb2RlXG4gKiAgLSBgZW5gIHJlc3VsdCBjb2RlXG4gKiAgLSBgamFgIOe1kOaenOOCs+ODvOODiVxuICogQHBhcmFtIG1lc3NhZ2VcbiAqICAtIGBlbmAgcmVzdWx0IGluZm8gbWVzc2FnZVxuICogIC0gYGphYCDntZDmnpzmg4XloLHjg6Hjg4Pjgrvjg7zjgrhcbiAqIEBwYXJhbSBjYXVzZVxuICogIC0gYGVuYCBsb3ctbGV2ZWwgZXJyb3IgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5LiL5L2N44Gu44Ko44Op44O85oOF5aCxXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlUmVzdWx0KGNvZGU6IG51bWJlciwgbWVzc2FnZT86IHN0cmluZywgY2F1c2U/OiB1bmtub3duKTogUmVzdWx0IHtcbiAgICByZXR1cm4gbmV3IFJlc3VsdChjb2RlLCBtZXNzYWdlLCB7IGNhdXNlIH0pO1xufVxuXG4vKipcbiAqIEBlbiBDcmVhdGUgY2FuY2VsZWQge0BsaW5rIFJlc3VsdH0gaGVscGVyLlxuICogQGphIOOCreODo+ODs+OCu+ODq+aDheWgseagvOe0jSB7QGxpbmsgUmVzdWx0fSDjgqrjg5bjgrjjgqfjgq/jg4jmp4vnr4njg5jjg6vjg5Hjg7xcbiAqXG4gKiBAcGFyYW0gbWVzc2FnZVxuICogIC0gYGVuYCByZXN1bHQgaW5mbyBtZXNzYWdlXG4gKiAgLSBgamFgIOe1kOaenOaDheWgseODoeODg+OCu+ODvOOCuFxuICogQHBhcmFtIGNhdXNlXG4gKiAgLSBgZW5gIGxvdy1sZXZlbCBlcnJvciBpbmZvcm1hdGlvblxuICogIC0gYGphYCDkuIvkvY3jga7jgqjjg6njg7zmg4XloLFcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1ha2VDYW5jZWxlZFJlc3VsdChtZXNzYWdlPzogc3RyaW5nLCBjYXVzZT86IHVua25vd24pOiBSZXN1bHQge1xuICAgIHJldHVybiBuZXcgUmVzdWx0KFJFU1VMVF9DT0RFLkFCT1JULCBtZXNzYWdlLCB7IGNhdXNlIH0pO1xufVxuIl0sIm5hbWVzIjpbImlzTnVsbGlzaCIsImNsYXNzTmFtZSIsImlzU3RyaW5nIiwiaXNDYW5jZWxMaWtlRXJyb3IiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7O0lBS0c7SUFFSDs7O0lBR0c7SUFDSCxVQXNNQyxDQUFBLFdBQUEsR0FBQSxVQUFBLENBQUEsV0FBQSxJQUFBLEVBQUEsQ0FBQTtJQXRNRCxDQUFBLFlBQXFCO0lBbUdqQjs7O0lBR0c7SUFDSCxJQUFBLElBQVksV0FlWCxDQUFBO0lBZkQsSUFBQSxDQUFBLFVBQVksV0FBVyxFQUFBOztJQUVuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsU0FBVyxDQUFBOztJQUVYLFFBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxPQUFTLENBQUE7O0lBRVQsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLFNBQVcsQ0FBQTs7SUFFWCxRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsTUFBQSxDQUFBLEdB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