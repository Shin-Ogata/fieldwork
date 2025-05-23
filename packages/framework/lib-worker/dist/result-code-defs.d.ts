/*!
 * @cdp/lib-worker/result-code-defs 0.9.19
 *   Common result code definitions.
 *   - includes:
 *     - @cdp/ajax/result-code-defs
 */
declare namespace CDP_DECLARE {
    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    enum RESULT_CODE {
        AJAX_DECLARE = 9007199254740991,
        ERROR_AJAX_RESPONSE,
        ERROR_AJAX_TIMEOUT
    }
}
