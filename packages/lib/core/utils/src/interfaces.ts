/**
 * @en Common interface for notification restraint.
 * @ja 通知抑止に使用する共通インターフェイス
 */
export interface Silenceable {
    /** true: restraint notification / false: fire notification (default) */
    silent?: boolean;
}
