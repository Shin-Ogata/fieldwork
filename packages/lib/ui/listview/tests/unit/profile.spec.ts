import {
    PageProfile,
    ItemProfile,
    GroupProfile,
} from '@cdp/ui-listview';
import {
    luid,
    type DOM,
    dom as $,
} from '@cdp/runtime';
import {
    TestListView,
    TestExpandListView,
    TestExpandItemView,
} from './test-listview';
import {
    prepareTestElements,
    cleanupTestElements,
    queryExpandListViewBackupData,
    queryGroupItems,
} from './tools';

describe('ui-listview/profile spec', () => {
    afterEach(() => {
        cleanupTestElements();
    });

    it('check instance', () => {
        expect(PageProfile).toBeDefined();
        expect(GroupProfile).toBeDefined();
        expect(ItemProfile).toBeDefined();
    });

    describe('PageProfile spec', () => {
        const getPageProfile = (listview: TestListView): PageProfile => {
            const context = listview.context as unknown as { _pages: PageProfile[]; };
            return context._pages[0];
        };

        const preparePageProfile = async (itemHeight: number, itemNum: number): Promise<PageProfile> => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(itemHeight);
            const listview = new TestListView({ el: $el[0], itemNum });
            await listview.ready;
            return getPageProfile(listview);
        };

        it('PageProfile#getItem', async () => {
            const page = await preparePageProfile(300, 5);
            expect(page.height).toBe(300);
            const item = page.getItem(1);
            expect(item.index).toBe(1);
        });
    });

    describe('GroupProfile spec', () => {
        const getGroupProfile = (listview: TestExpandListView): GroupProfile => {
            const { tops } = queryExpandListViewBackupData(listview);
            return tops[0];
        };

        const prepareGroupProfile = async (itemHeight: number, itemNum: number, childPerParent: number): Promise<GroupProfile> => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(itemHeight);
            const listview = new TestExpandListView({ el: $el[0], itemNum, childPerParent });
            await listview.ready;
            return getGroupProfile(listview);
        };

        const queryListView = (seed: GroupProfile): TestExpandListView => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (seed as any)._owner as TestExpandListView;
        };

        const newGroupProfile = (seed: GroupProfile): GroupProfile => {
            return queryListView(seed).newGroup(luid('test:new:', 4));
        };

        it('GroupProfile properties', async () => {
            const group = await prepareGroupProfile(300, 50, 5);
            expect(group.id).toBeDefined();
            expect(group.status).toBe('registered');
            expect(group.parent).toBeUndefined();
            expect(group.children).toBeDefined();

            const items = queryGroupItems(group);
            expect(items.length).toBe(1);

            const childItems = queryGroupItems(group.children[0]);
            expect(childItems.length).toBe(5);

            expect(group.isExpanded).toBe(false);
            await group.expand();
            expect(group.isExpanded).toBe(true);
        });

        it('GroupProfile public methods coverage', async () => {
            const group = await prepareGroupProfile(300, 50, 5);
            expect(group.status).toBe('registered');
            let items = queryGroupItems(group);
            expect(items.length).toBe(1);

            group.addItem(100, TestExpandItemView, { devId: luid('test:', 4), devIndex: group.getNextItemIndex() });
            items = queryGroupItems(group);
            expect(items.length).toBe(2);
            expect(items[1].info.devIndex).toBe(1);

            expect(group.isExpanded).toBe(false);
            await group.toggle();
            expect(group.isExpanded).toBe(true);
            group.addItem(100, TestExpandItemView, { devId: luid('test:', 4), devIndex: group.getNextItemIndex() });
            items = queryGroupItems(group);
            expect(items.length).toBe(3);
            expect(items[2].info.devIndex).toBe(2);

            for (const child of group.children) {
                await child.expand();
            }

            const listview = queryListView(group);
            let retval = listview.backup('test');
            expect(retval).toBe(true);
            retval = listview.restore('test');
            expect(retval).toBe(true);

            try {
                await group.ensureVisible({ partialOK: true });
                const newGp = newGroupProfile(group);
                await newGp.ensureVisible();
            } catch {
                fail('UNEXPECTED FLOW');
            }

            await group.toggle(100);
            expect(group.isExpanded).toBe(false);
        });

        it('GroupProfile error case coverage', async () => {
            const group = await prepareGroupProfile(300, 50, 5);
            const newGp = newGroupProfile(group);
            group.addChildren(newGp);

            try {
                newGp.register(0);
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e.message).toBe(`listview given a invalid param. 'GroupProfile#register' method is acceptable only 1st layer group.`);
            }

            try {
                newGp.restore();
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e.message).toBe(`listview given a invalid param. 'GroupProfile#restore' method is acceptable only 1st layer group.`);
            }

            // invalid internal operation
            interface PrivateGroup extends GroupProfile {
                queryOperationTarget(operation: 'invalid'): ItemProfile[];
            }

            try {
                // no throw
                (group as PrivateGroup).queryOperationTarget('invalid');
            } catch {
                fail('UNEXPECTED FLOW');
            }
        });
    });
    describe('ItemProfile spec', () => {
        const prepareListView = async (itemHeight: number): Promise<TestExpandListView> => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(itemHeight);
            const listview = new TestExpandListView({ el: $el[0], itemNum: 1, childPerParent: 1 });
            await listview.ready;
            return listview;
        };

        const prepareItemProfile = async (itemHeight: number): Promise<ItemProfile> => {
            const listview = await prepareListView(itemHeight);
            const { tops } = queryExpandListViewBackupData(listview);
            const group = tops[0];
            group.addItem(itemHeight, TestExpandItemView, { devId: luid('test:', 4), devIndex: group.getNextItemIndex() });
            const items = queryGroupItems(group);
            return items[0];
        };

        const prepareDanglingItemProfile = async (itemHeight: number): Promise<ItemProfile> => {
            const listview = await prepareListView(itemHeight);
            const group = listview.newGroup();
            group.addItem(itemHeight, TestExpandItemView, { devId: luid('test:', 4), devIndex: group.getNextItemIndex() });
            const items = queryGroupItems(group);
            return items[0];
        };

        it('ItemProfile dangling item', async () => {
            const item = await prepareDanglingItemProfile(100);
            expect(item.index).toBeUndefined();

            try {
                item.updateHeight(120, { reflectAll: true });
            } catch {
                fail('UNEXPECTED FLOW');
            }
        });

        it('ItemProfile internal coverage', async () => {
            // internal operation
            interface PrivateItem extends ItemProfile {
                prepareBaseElement(): DOM;
                _$base: DOM;
            }

            const item = await prepareItemProfile(100) as PrivateItem;
            expect(item.index).toBeDefined();
            expect(item._$base).toBeDefined();

            try {
                // no throw
                item.prepareBaseElement();
            } catch {
                fail('UNEXPECTED FLOW');
            }
        });
    });
});
