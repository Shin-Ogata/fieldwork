import { ListViewGlobalConfig } from '@cdp/ui-listview';

describe('ui-listview/global-config spec', () => {
    const defConfig = ListViewGlobalConfig();

    afterEach(() => {
        ListViewGlobalConfig(defConfig);
    });

    it('check default', () => {
        const config = ListViewGlobalConfig();
        expect(config.NAMESPACE).toBe('cdp-ui');
        expect(config.SCROLL_MAP_CLASS).toBe('cdp-ui-listview-scroll-map');
        expect(config.INACTIVE_CLASS).toBe('cdp-ui-inactive');
        expect(config.RECYCLE_CLASS).toBe('cdp-ui-listview-recycle');
        expect(config.LISTITEM_BASE_CLASS).toBe('cdp-ui-listview-item-base');
        expect(config.DATA_PAGE_INDEX).toBe('data-page-index');
        expect(config.DATA_ITEM_INDEX).toBe('data-item-index');
    });

    it('check change namespace', () => {
        ListViewGlobalConfig({ NAMESPACE: 'ui' });
        const config = ListViewGlobalConfig();
        expect(config.NAMESPACE).toBe('ui');
        expect(config.SCROLL_MAP_CLASS).toBe('ui-listview-scroll-map');
        expect(config.INACTIVE_CLASS).toBe('ui-inactive');
        expect(config.RECYCLE_CLASS).toBe('ui-listview-recycle');
        expect(config.LISTITEM_BASE_CLASS).toBe('ui-listview-item-base');
        expect(config.DATA_PAGE_INDEX).toBe('data-page-index');
        expect(config.DATA_ITEM_INDEX).toBe('data-item-index');
    });

    it('check change partial', () => {
        ListViewGlobalConfig({
            SCROLL_MAP_CLASS: 'scrollmap',
            INACTIVE_CLASS: 'inactive',
            DATA_PAGE_INDEX: 'data-pindex',
        });
        let config = ListViewGlobalConfig();
        expect(config.NAMESPACE).toBe('cdp-ui');
        expect(config.SCROLL_MAP_CLASS).toBe('scrollmap');
        expect(config.INACTIVE_CLASS).toBe('inactive');
        expect(config.RECYCLE_CLASS).toBe('cdp-ui-listview-recycle');
        expect(config.LISTITEM_BASE_CLASS).toBe('cdp-ui-listview-item-base');
        expect(config.DATA_PAGE_INDEX).toBe('data-pindex');
        expect(config.DATA_ITEM_INDEX).toBe('data-item-index');

        ListViewGlobalConfig({
            RECYCLE_CLASS: 'recycle',
            LISTITEM_BASE_CLASS: 'item-base',
            DATA_ITEM_INDEX: 'data-iindex',
        });
        config = ListViewGlobalConfig();
        expect(config.NAMESPACE).toBe('cdp-ui');
        expect(config.SCROLL_MAP_CLASS).toBe('scrollmap');
        expect(config.INACTIVE_CLASS).toBe('inactive');
        expect(config.RECYCLE_CLASS).toBe('recycle');
        expect(config.LISTITEM_BASE_CLASS).toBe('item-base');
        expect(config.DATA_PAGE_INDEX).toBe('data-pindex');
        expect(config.DATA_ITEM_INDEX).toBe('data-iindex');
    });
});
