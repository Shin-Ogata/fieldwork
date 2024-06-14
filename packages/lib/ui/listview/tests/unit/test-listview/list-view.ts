import {
    type IListContext,
    type IListOperation,
    type IListScrollable,
    type IListBackupRestore,
    type ListViewConstructOptions,
    ListView,
} from '@cdp/ui-listview';
import { TestListItemView } from './item-view';

export type TestListViewContext = IListContext & IListOperation & IListScrollable & IListBackupRestore;

export interface TestListViewConstructionOptions extends ListViewConstructOptions {
    itemNum?: number;
    itemHeight?: number;
}

export class TestListView extends ListView {

    private _ready: Promise<void>;

    constructor(options?: TestListViewConstructionOptions) {
        const opts = Object.assign({ itemTagName: 'div', itemNum: 1000, itemHeight: 100 }, options);
        super(opts);
        this._ready = this.fetch(opts.itemNum, opts.itemHeight);
    }

    get ready(): Promise<void> {
        return this._ready;
    }

///////////////////////////////////////////////////////////////////////
// implements: ListView

    render(): this {
        return this.update();
    }

///////////////////////////////////////////////////////////////////////
// internal:

    private async fetch(itemNum: number, itemHeight: number): Promise<void> {
        for (let i = 0; i < itemNum; i++) {
            this.addItem(itemHeight, TestListItemView, {
                devId: `test:${String(i).padStart(4, '0')}`,
            });
            if (0 === i % 5) {
                this.render();
                await Promise.resolve();
            }
        }
        this.render();
    }
}
