/*!
 * @cdp/lib-web/result-code-defs 0.9.18
 *   Common result code definitions.
 *   - includes:
 *     - @cdp/i18n/result-code-defs
 *     - @cdp/data-sync/result-code-defs
 *     - @cdp/model/result-code-defs
 *     - @cdp/collection/result-code-defs
 *     - @cdp/router/result-code-defs
 *     - @cdp/app/result-code-defs
 */
declare namespace CDP_DECLARE {
    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    enum RESULT_CODE {
        I18N_DECLARE = 9007199254740991,
        ERROR_I18N_CORE_LAYER
    }
}
declare namespace CDP_DECLARE {
    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    enum RESULT_CODE {
        MVC_SYNC_DECLARE = 9007199254740991,
        ERROR_MVC_INVALID_SYNC_PARAMS,
        ERROR_MVC_INVALID_SYNC_STORAGE_ENTRY,
        ERROR_MVC_INVALID_SYNC_STORAGE_DATA_NOT_FOUND
    }
}
declare namespace CDP_DECLARE {
    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    enum RESULT_CODE {
        MVC_MODEL_DECLARE = 9007199254740991,
        ERROR_MVC_INVALID_DATA
    }
}
declare namespace CDP_DECLARE {
    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    enum RESULT_CODE {
        MVC_COLLECTION_DECLARE = 9007199254740991,
        ERROR_MVC_INVALID_ACCESS,
        ERROR_MVC_INVALID_COMPARATORS,
        ERROR_MVC_EDIT_PERMISSION_DENIED
    }
}
declare namespace CDP_DECLARE {
    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    enum RESULT_CODE {
        MVC_ROUTER_DECLARE = 9007199254740991,
        ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND,
        ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED,
        ERROR_MVC_ROUTER_NAVIGATE_FAILED,
        ERROR_MVC_ROUTER_INVALID_SUBFLOW_BASE_URL,
        ERROR_MVC_ROUTER_BUSY
    }
}
declare namespace CDP_DECLARE {
    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    enum RESULT_CODE {
        APP_DECLARE = 9007199254740991,
        ERROR_APP_CONTEXT_NEED_TO_BE_INITIALIZED
    }
}
