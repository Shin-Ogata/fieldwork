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
