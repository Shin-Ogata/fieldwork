/*!
 * @cdp/ui-components/result-code-defs 0.9.20
 *   Common result code definitions.
 *   - includes:
 *     - @cdp/ui-utils/result-code-defs
 *     - @cdp/ui-listview/result-code-defs
 */
declare namespace CDP_DECLARE {
    const enum CDP_KNOWN_UI_MODULE {
        /** `@cdp/ui-utils` */
        UTILS = 1,
        /** `@cdp/ui-listview` */
        LISTVIEW = 2,
        /** offset for unknown ui-module */
        OFFSET = 3
    }
    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    enum RESULT_CODE {
        UI_UTILS_DECLARE = 9007199254740991,
        ERROR_UI_UTILS_FATAL
    }
}
declare namespace CDP_DECLARE {
    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    enum RESULT_CODE {
        UI_LISTVIEW_DECLARE = 9007199254740991,
        ERROR_UI_LISTVIEW_INVALID_INITIALIZATION,
        ERROR_UI_LISTVIEW_INVALID_PARAM,
        ERROR_UI_LISTVIEW_INVALID_OPERATION
    }
}
