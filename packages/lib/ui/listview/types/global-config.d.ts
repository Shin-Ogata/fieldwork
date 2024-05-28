/**
 * @en Global configuration definition for list views.
 * @ja リストビューのグローバルコンフィグレーション定義
 */
export interface ListViewGlobalConfig {
    NAMESPACE: string;
    WRAPPER_CLASS: string;
    WRAPPER_SELECTOR: string;
    SCROLL_MAP_CLASS: string;
    SCROLL_MAP_SELECTOR: string;
    INACTIVE_CLASS: string;
    INACTIVE_CLASS_SELECTOR: string;
    RECYCLE_CLASS: string;
    RECYCLE_CLASS_SELECTOR: string;
    LISTITEM_BASE_CLASS: string;
    LISTITEM_BASE_CLASS_SELECTOR: string;
    DATA_PAGE_INDEX: string;
    DATA_CONTAINER_INDEX: string;
}
/**
 * @en Get/Update global configuration of list view.
 * @ja リストビューのグローバルコンフィグレーションの取得/更新
 */
export declare const ListViewGlobalConfig: (newConfig?: Partial<ListViewGlobalConfig>) => ListViewGlobalConfig;
