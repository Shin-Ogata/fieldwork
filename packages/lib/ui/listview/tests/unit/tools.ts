import {
    luid,
    dom,
    waitFrame as wf,
} from '@cdp/runtime';
import type {
    IListView,
    ItemProfile,
    GroupProfile,
} from '@cdp/ui-listview';

const body = document.body;

export function createTestElementsFromTemplate(): HTMLElement[] {
    const divs = dom.utils.elementify(`
        <div id="d1" class="test-dom" style="visibility: hidden;">
            <div class="cdp-ui-listview-scroll-map"></div>
        </div>
    `);
    return divs;
}

export function prepareTestElements(divs?: HTMLElement[]): HTMLElement[] {
    divs = divs ?? createTestElementsFromTemplate();

    const fragment = document.createDocumentFragment();
    for (const div of divs) {
        fragment.appendChild(div);
    }
    body.appendChild(fragment);

    return divs;
}

export function cleanupTestElements(): void {
    const divs = body.querySelectorAll('.test-dom');
    for (const div of divs) {
        body.removeChild(div);
    }
}

export function waitFrame(): Promise<void> {
    return wf(1, window.requestAnimationFrame);
}

export function queryListViewItems(listview: IListView): ItemProfile[] {
    const key = luid('test:', 4);
    listview.backup(key);
    const { items } = listview.getBackupData(key) as { items: ItemProfile[]; };
    return items;
}

export function queryExpandListViewBackupData(listview: IListView): { tops: GroupProfile[]; map: Record<string, GroupProfile>; } {
    const key = luid('test:', 4);
    listview.backup(key);
    const data = listview.getBackupData(key) as { tops: GroupProfile[]; map: Record<string, GroupProfile>; };
    return data;
}

export function queryGroupItems(group: GroupProfile): ItemProfile[] {
    return (group as unknown as { _items: ItemProfile[]; })._items;
}
