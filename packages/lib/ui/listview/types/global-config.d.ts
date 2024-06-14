/**
 * @en Global configuration definition for list views.
 * @ja リストビューのグローバルコンフィグレーション定義
 */
export interface ListViewGlobalConfig {
    NAMESPACE: string;
    SCROLL_MAP_CLASS: string;
    INACTIVE_CLASS: string;
    RECYCLE_CLASS: string;
    LISTITEM_BASE_CLASS: string;
    DATA_PAGE_INDEX: string;
    DATA_ITEM_INDEX: string;
}
export type ListViewGlobalConfigArg = Partial<Pick<ListViewGlobalConfig, 'NAMESPACE' | 'SCROLL_MAP_CLASS' | 'INACTIVE_CLASS' | 'RECYCLE_CLASS' | 'LISTITEM_BASE_CLASS' | 'DATA_PAGE_INDEX' | 'DATA_ITEM_INDEX'>>;
/**
 * @en Get/Update global configuration of list view.
 * @ja リストビューのグローバルコンフィグレーションの取得/更新
 */
export declare const ListViewGlobalConfig: (newConfig?: ListViewGlobalConfigArg) => ListViewGlobalConfig;
