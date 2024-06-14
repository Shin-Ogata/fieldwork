import {
    type GroupProfile,
    ExpandableListView,
    ExpandableListItemView,
} from '@cdp/ui-listview';
import {
    type UnknownObject,
    luid,
    dom as $,
} from '@cdp/runtime';
import {
    TestExpandListView,
    TestExpandItemView,
    TestListItemView,
} from './test-listview';
import {
    prepareTestElements,
    cleanupTestElements,
    queryGroupItems,
} from './tools';

describe('ui-listview/expandable-list-view spec', () => {

    afterEach(() => {
        cleanupTestElements();
    });

    it('check instance', async () => {
        expect(ExpandableListView).toBeDefined();
        expect(ExpandableListItemView).toBeDefined();

        prepareTestElements();
        const $el = $('#d1');
        $el.height(100);

        const listview = new TestExpandListView({ el: $el[0], itemNum: 0 });
        await listview.ready;
        expect(listview.isInitialized).toBe(true);
        expect(listview).toBeDefined();
        const expandContext = listview.expandContext;
        expect(expandContext).toBeDefined();

        listview.release();
        expect($el.isConnected).toBe(true);

        listview.remove();
        expect($el.isConnected).toBe(false);
    });

    describe('ExpandableListView group operations', () => {
        it('group operation', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestExpandListView({ el: $el[0], itemNum: 1, childPerParent: 1 });
            await listview.ready;

            let parents = listview.getTopGroups();
            expect(parents.length).toBe(1);

            const newParentId = luid('test', 4);
            const newParent = listview.newGroup(newParentId);
            newParent.addItem(100, TestExpandItemView, { devId: newParentId, devIndex: NaN });
            const newChildId = luid('test', 4);
            const newChild = listview.newGroup(newChildId);
            newChild.addItem(100, TestListItemView, { devId: newChildId, devIndex: NaN });
            newParent.addChildren(newChild);

            // auto assign
            const autoGroup = listview.newGroup();
            expect(autoGroup).toBeDefined();

            listview.registerTopGroup(newParent);
            parents = listview.getTopGroups();
            expect(parents.length).toBe(2);

            let group = listview.getGroup(newParentId);
            expect(group?.id).toBe(newParentId);
            group = listview.getGroup(newChildId);
            expect(group?.id).toBe(newChildId);

            let b = listview.isExpanding;
            expect(b).toBe(false);

            let p = listview.expandAll();
            b = listview.isExpanding;
            expect(b).toBe(true);
            b = listview.isCollapsing;
            expect(b).toBe(false);
            b = listview.isSwitching;
            expect(b).toBe(true);
            await p;
            b = listview.isExpanding;
            expect(b).toBe(false);
            b = listview.isCollapsing;
            expect(b).toBe(false);
            b = listview.isSwitching;
            expect(b).toBe(false);

            p = listview.collapseAll();
            b = listview.isExpanding;
            expect(b).toBe(false);
            b = listview.isCollapsing;
            expect(b).toBe(true);
            b = listview.isSwitching;
            expect(b).toBe(true);
            await p;
            b = listview.isExpanding;
            expect(b).toBe(false);
            b = listview.isCollapsing;
            expect(b).toBe(false);
            b = listview.isSwitching;
            expect(b).toBe(false);
        });

        it('group operation advanced', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestExpandListView({ el: $el[0], itemNum: 50, childPerParent: 5, enableTransformOffset: true });
            await listview.ready;
            expect(listview.scrollPosMax).toBe(4900);

            const parents = listview.getTopGroups();
            expect(parents.length).toBe(50);

            await listview.scrollTo(4900);
            expect(listview.scrollPos).toBe(4900);

            await parents[49].expand();
            expect(listview.scrollPosMax).toBe(5400);

            await listview.scrollTo(5400);
            expect(listview.scrollPos).toBe(5400);

            await parents[49].collapse();
            expect(listview.scrollPosMax).toBe(4900);
        });

        it('status operation', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestExpandListView({ el: $el[0], itemNum: 1, childPerParent: 1 });
            await listview.ready;

            const status = 'test:status';
            let ret = listview.isStatusIn(status);
            expect(ret).toBe(false);

            let refcount = listview.statusAddRef(status);
            expect(refcount).toBe(1);
            try {
                ret = listview.isStatusIn(status);
                expect(ret).toBe(true);
            } finally {
                refcount = listview.statusRelease(status);
                expect(refcount).toBe(0);
            }
            ret = listview.isStatusIn(status);
            expect(ret).toBe(false);
        });

        it('backup / restore operation', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestExpandListView({ el: $el[0], itemNum: 2, childPerParent: 2 });
            await listview.ready;

            // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
            type BackupDataSchema = { map: Record<string, GroupProfile>; tops: GroupProfile[]; };

            let backupData = listview.getBackupData('portlate');
            expect(backupData).toBeUndefined();

            let ret = listview.backup('portlate');
            expect(ret).toBe(true);
            backupData = listview.getBackupData('portlate');
            expect(backupData).toBeDefined();

            const { tops } = backupData as BackupDataSchema;
            expect(tops.length).toBe(2);

            ret = listview.hasBackup('portlate');
            expect(ret).toBe(true);

            ret = listview.hasBackup('hoge');
            expect(ret).toBe(false);

            ret = listview.restore('hoge', false);
            expect(ret).toBe(false);

            ret = listview.restore('portlate', false);
            expect(ret).toBe(true);

            ret = listview.restore('portlate');
            expect(ret).toBe(true);

            ret = listview.backup('landscape');
            expect(ret).toBe(true);
            backupData = listview.getBackupData('portlate');
            expect(backupData).toBeDefined();

            ret = listview.clearBackup('hoge');
            expect(ret).toBe(false);

            ret = listview.clearBackup('portlate');
            expect(ret).toBe(true);
            backupData = listview.getBackupData('portlate');
            expect(backupData).not.toBeDefined();
            backupData = listview.getBackupData('landscape');
            expect(backupData).toBeDefined();

            listview.backup('portlate');
            listview.backup('landscape');
            backupData = listview.getBackupData('portlate');
            expect(backupData).toBeDefined();
            backupData = listview.getBackupData('landscape');
            expect(backupData).toBeDefined();

            const setup = backupData as BackupDataSchema;
            const map = setup.map;

            ret = listview.clearBackup();
            expect(ret).toBe(true);
            backupData = listview.getBackupData('portlate');
            expect(backupData).not.toBeDefined();
            backupData = listview.getBackupData('landscape');
            expect(backupData).not.toBeDefined();

            ret = listview.setBackupData('set', setup as UnknownObject);
            expect(ret).toBe(true);

            const setData = listview.getBackupData('set') as BackupDataSchema;
            expect(setData.map).toBe(map);

            ret = listview.setBackupData('set', {});
            expect(ret).toBe(false);
        });

        it('advanced operation', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestExpandListView({ el: $el[0], itemNum: 0, childPerParent: 0 });
            await listview.ready;

            let b = listview.backup('test');
            expect(b).toBe(true);
            b = listview.restore('test');
            expect(b).toBe(true);

            const group = listview.newGroup();
            expect(group).toBeDefined();

            listview.registerTopGroup(group);
            listview.registerTopGroup(group);

            const registered = listview.getTopGroups();
            expect(registered.length).toBe(1);
        });
    });

    describe('ExpandableListItemView spec', () => {
        it('check ExpandableListItemView stuff', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestExpandListView({ el: $el[0], itemNum: 1, childPerParent: 1 });
            await listview.ready;

            const group = listview.getTopGroups()[0];
            const itemview = new TestExpandItemView({
                owner: listview,
                group,
                devId: luid('test', 4),
                devIndex: 'NaN',
                item: queryGroupItems(group)[0],
            });
            expect(itemview).toBeDefined();

            let p = listview.expandAll();
            let b = itemview.is('Expanded');
            expect(b).toBe(false);
            b = itemview.is('Expanding');
            expect(b).toBe(true);
            b = itemview.is('Collapsing');
            expect(b).toBe(false);
            b = itemview.is('Switching');
            expect(b).toBe(true);
            await p;
            b = itemview.is('Expanded');
            expect(b).toBe(true);
            b = itemview.is('Expanding');
            expect(b).toBe(false);
            b = itemview.is('Collapsing');
            expect(b).toBe(false);
            b = itemview.is('Switching');
            expect(b).toBe(false);

            p = listview.collapseAll();
            b = itemview.is('Expanded');
            expect(b).toBe(true);
            b = itemview.is('Expanding');
            expect(b).toBe(false);
            b = itemview.is('Collapsing');
            expect(b).toBe(true);
            b = itemview.is('Switching');
            expect(b).toBe(true);
            await p;
            b = itemview.is('Expanded');
            expect(b).toBe(false);
            b = itemview.is('Expanding');
            expect(b).toBe(false);
            b = itemview.is('Collapsing');
            expect(b).toBe(false);
            b = itemview.is('Switching');
            expect(b).toBe(false);
        });
    });
});
