import {
    type GroupProfile,
    type ListViewConstructOptions,
    ExpandableListView,
} from '@cdp/ui-listview';
import { TestListItemView } from './item-view';
import { TestExpandItemView } from './expand-item-view';

export interface TestExpandListViewConstructionOptions extends ListViewConstructOptions {
    itemNum?: number;
    childPerParent?: number;
    itemHeight?: number;
}

export class TestExpandListView extends ExpandableListView {

    private _ready: Promise<void>;
    private _mapParentId = new Map<number, string>();

    constructor(options?: TestExpandListViewConstructionOptions) {
        const opts = Object.assign({ itemNum: 1000, childPerParent: 5, itemHeight: 100 }, options);
        super(opts);
        this._ready = this.fetch(opts.itemNum, opts.childPerParent, opts.itemHeight);
    }

    get ready(): Promise<void> {
        return this._ready;
    }

///////////////////////////////////////////////////////////////////////
// implements: ExpandableListView

    render(): this {
        return this.update();
    }

///////////////////////////////////////////////////////////////////////
// implements: ListView event handler

    async onExpand(index: number): Promise<void> {
        const devId = this._mapParentId.get(index);
        const status  = `operation:${devId}`;
        if (!this.isStatusIn(status)) {
            await this.statusScope(status, async () => {
                const group = this.getGroup(devId!);
                await group?.expand();
            });
        }
    }

    async onCollapse(index: number): Promise<void> {
        const devId = this._mapParentId.get(index);
        const status  = `operation:${devId}`;
        if (!this.isStatusIn(status)) {
            await this.statusScope(status, async () => {
                const group = this.getGroup(devId!);
                await group?.collapse();
            });
        }
    }

///////////////////////////////////////////////////////////////////////
// internal:

    private async fetch(itemNum: number, childPerParent: number, itemHeight: number): Promise<void> {
        for (let i = 0; i < itemNum; i++) {
            const parentId = `test:parent:${String(i).padStart(4, '0')}`;
            const parent = this.newGroup(parentId);
            parent.addItem(itemHeight, TestExpandItemView, {
                devId: parent,
                devIndex: i,
            });

            const children: GroupProfile[] = [];
            for (let j = 0; j < childPerParent; j++) {
                const childId = `test:child:${String(i).padStart(4, '0')}`;
                const child = this.newGroup(childId);
                child.addItem(itemHeight, TestListItemView, {
                    devId: childId,
                    devIndex: j,
                });
                children.push(child);
            }

            parent.addChildren(children);
            this.registerTopGroup(parent);

            if (0 === i % 5) {
                this.render();
                await Promise.resolve();
            }
        }
        this.render();
    }
}
