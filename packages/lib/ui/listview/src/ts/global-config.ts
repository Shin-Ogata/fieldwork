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

/** @internal */
const enum DefaultV {
    NAMESPACE                    = 'cdp-ui',
    SCROLL_MAP_CLASS             = `${NAMESPACE}-listview-scroll-map`,
    INACTIVE_CLASS               = `${NAMESPACE}-inactive`,
    RECYCLE_CLASS                = `${NAMESPACE}-listview-recycle`,
    LISTITEM_BASE_CLASS          = `${NAMESPACE}-listview-item-base`,
    DATA_PAGE_INDEX              = 'data-page-index',
    DATA_ITEM_INDEX              = 'data-item-index',
}

const _config = {
    NAMESPACE: DefaultV.NAMESPACE,
    SCROLL_MAP_CLASS: DefaultV.SCROLL_MAP_CLASS,
    INACTIVE_CLASS: DefaultV.INACTIVE_CLASS,
    RECYCLE_CLASS: DefaultV.RECYCLE_CLASS,
    LISTITEM_BASE_CLASS: DefaultV.LISTITEM_BASE_CLASS,
    DATA_PAGE_INDEX: DefaultV.DATA_PAGE_INDEX,
    DATA_ITEM_INDEX: DefaultV.DATA_ITEM_INDEX,
};

export type ListViewGlobalConfigArg = Partial<
Pick<ListViewGlobalConfig
, 'NAMESPACE'
| 'SCROLL_MAP_CLASS'
| 'INACTIVE_CLASS'
| 'RECYCLE_CLASS'
| 'LISTITEM_BASE_CLASS'
| 'DATA_PAGE_INDEX'
| 'DATA_ITEM_INDEX'
>>;

const ensureNewConfig = (newConfig: ListViewGlobalConfigArg): Partial<ListViewGlobalConfig> => {
    const {
        NAMESPACE: ns,
        SCROLL_MAP_CLASS: scrollmap,
        INACTIVE_CLASS: inactive,
        RECYCLE_CLASS: recycle,
        LISTITEM_BASE_CLASS: itembase,
        DATA_PAGE_INDEX: datapage,
        DATA_ITEM_INDEX: dataitem,
    } = newConfig;

    const NAMESPACE = ns;
    const SCROLL_MAP_CLASS = scrollmap ?? (ns ? `${ns}-listview-scroll-map` : undefined);
    const INACTIVE_CLASS = inactive ?? (ns ? `${ns}-inactive` : undefined);
    const RECYCLE_CLASS = recycle ?? (ns ? `${ns}-listview-recycle` : undefined);
    const LISTITEM_BASE_CLASS = itembase ?? (ns ? `${ns}-listview-item-base` : undefined);

    return Object.assign(newConfig, {
        NAMESPACE,
        SCROLL_MAP_CLASS,
        INACTIVE_CLASS,
        RECYCLE_CLASS,
        LISTITEM_BASE_CLASS,
        DATA_PAGE_INDEX: datapage,
        DATA_ITEM_INDEX: dataitem,
    });
};

/**
 * @en Get/Update global configuration of list view.
 * @ja リストビューのグローバルコンフィグレーションの取得/更新
 */
export const ListViewGlobalConfig = (newConfig?: ListViewGlobalConfigArg): ListViewGlobalConfig => {
    if (newConfig) {
        ensureNewConfig(newConfig);
        for (const key of Object.keys(newConfig)) {
            if (undefined === newConfig[key as keyof ListViewGlobalConfigArg]) {
                delete newConfig[key as keyof ListViewGlobalConfigArg];
            }
        }
    }
    return Object.assign({}, Object.assign(_config, newConfig));
};
