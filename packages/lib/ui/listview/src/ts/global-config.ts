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

/** @internal */
const enum DefaultV {
    NAMESPACE                    = 'cdp-ui',
    WRAPPER_CLASS                = `${NAMESPACE}-listview-wrapper`,
    WRAPPER_SELECTOR             = `.${WRAPPER_CLASS}`,
    SCROLL_MAP_CLASS             = `${NAMESPACE}-listview-scroll-map`,
    SCROLL_MAP_SELECTOR          = `.${SCROLL_MAP_CLASS}`,
    INACTIVE_CLASS               = 'inactive',
    INACTIVE_CLASS_SELECTOR      = `.${INACTIVE_CLASS}`,
    RECYCLE_CLASS                = `${NAMESPACE}-listview-recycle`,
    RECYCLE_CLASS_SELECTOR       = `.${RECYCLE_CLASS}`,
    LISTITEM_BASE_CLASS          = `${NAMESPACE}-listview-item-base`,
    LISTITEM_BASE_CLASS_SELECTOR = `.${LISTITEM_BASE_CLASS}`,
    DATA_PAGE_INDEX              = `data-${NAMESPACE}-page-index`,
    DATA_CONTAINER_INDEX         = `data-${NAMESPACE}-container-index`,
}

const _config = {
    NAMESPACE: DefaultV.NAMESPACE,
    WRAPPER_CLASS: DefaultV.WRAPPER_CLASS,
    WRAPPER_SELECTOR: DefaultV.WRAPPER_SELECTOR,
    SCROLL_MAP_CLASS: DefaultV.SCROLL_MAP_CLASS,
    SCROLL_MAP_SELECTOR: DefaultV.SCROLL_MAP_SELECTOR,
    INACTIVE_CLASS: DefaultV.INACTIVE_CLASS,
    INACTIVE_CLASS_SELECTOR: DefaultV.INACTIVE_CLASS_SELECTOR,
    RECYCLE_CLASS: DefaultV.RECYCLE_CLASS,
    RECYCLE_CLASS_SELECTOR: DefaultV.RECYCLE_CLASS_SELECTOR,
    LISTITEM_BASE_CLASS: DefaultV.LISTITEM_BASE_CLASS,
    LISTITEM_BASE_CLASS_SELECTOR: DefaultV.LISTITEM_BASE_CLASS_SELECTOR,
    DATA_PAGE_INDEX: DefaultV.DATA_PAGE_INDEX,
    DATA_CONTAINER_INDEX: DefaultV.DATA_CONTAINER_INDEX,
};

/**
 * @en Get/Update global configuration of list view.
 * @ja リストビューのグローバルコンフィグレーションの取得/更新
 */
export const ListViewGlobalConfig = (newConfig?: Partial<ListViewGlobalConfig>): ListViewGlobalConfig => {
    if (newConfig) {
        for (const key of Object.keys(newConfig)) {
            if (undefined === newConfig[key as keyof ListViewGlobalConfig]) {
                delete newConfig[key as keyof ListViewGlobalConfig];
            }
        }
    }
    return Object.assign({}, _config, newConfig);
};
