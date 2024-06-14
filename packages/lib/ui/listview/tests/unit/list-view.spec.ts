/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import {
    type ItemProfile,
    ListView,
    ListItemView,
} from '@cdp/ui-listview';
import {
    type UnknownObject,
    sleep,
    luid,
    dom as $,
} from '@cdp/runtime';
import {
    type TestListViewContext,
    TestListView,
    TestListItemView,
} from './test-listview';
import {
    prepareTestElements,
    cleanupTestElements,
    queryListViewItems,
} from './tools';

describe('ui-listview/list-view spec', () => {

    afterEach(() => {
        cleanupTestElements();
    });

    describe('ListView initialize spec', () => {
        it('check instance', async () => {
            expect(ListView).toBeDefined();
            expect(ListItemView).toBeDefined();

            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestListView({ el: $el[0], itemNum: 0 });
            await listview.ready;
            expect(listview.isInitialized).toBe(true);
            expect(listview).toBeDefined();
            const context = listview.context as TestListViewContext;
            expect(context).toBeDefined();
        });

        it('initialized multiple', async () => {
            prepareTestElements();

            let listview: TestListView;
            const $el0 = $('<div></div>');

            try {
                listview = new TestListView({ el: $el0, itemNum: 2 });
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e.message).toBe('listview given a invalid param. [base hight: 0]');
            }

            listview = new TestListView({ el: $el0, itemNum: 2, initialHeight: 300 });
            await listview.ready;

            const items = queryListViewItems(listview);
            expect(items.length).toBe(2);

            const $el = $('#d1');
            listview.setElement($el);
            expect(items.length).toBe(0);
        });
    });

    describe('ListView IListOperation spec', () => {
        it('check ListView#addItem basic', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestListView({ el: $el[0], itemNum: 100 });
            await listview.ready;

            const items = queryListViewItems(listview);
            expect(items.length).toBe(100);

            let devId = luid('test:', 4);
            listview.addItem(100, TestListItemView, { devId });
            expect(items.length).toBe(101);
            expect(items[100].info.devId).toBe(devId);

            devId = luid('test:', 4);
            listview.addItem(100, TestListItemView, { devId }, 0);
            expect(items.length).toBe(102);
            expect(items[0].info.devId).toBe(devId);

            devId = luid('test:', 4);
            listview.addItem(100, TestListItemView, { devId }, 100);
            expect(items.length).toBe(103);
            expect(items[100].info.devId).toBe(devId);

            devId = luid('test:', 4);
            listview.addItem(100, TestListItemView, { devId }, 101);
            expect(items.length).toBe(104);
            expect(items[101].info.devId).toBe(devId);
        });

        it('check ListView#removeItem basic', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestListView({ el: $el[0], itemNum: 100 });
            await listview.ready;

            const items = queryListViewItems(listview);
            expect(items.length).toBe(100);

            listview.removeItem(50);
            expect(items.length).toBe(99);

            listview.removeItem(1, 3);
            expect(items.length).toBe(96);

            listview.removeItem([0, 2, 79, 88], 20);
            await sleep(100);
            expect(items.length).toBe(92);

            listview.removeItem([22, 44]);
            await sleep(20);
            expect(items.length).toBe(90);
        });

        it('check ListView#removeItem advanced 1', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestListView({ el: $el[0], itemNum: 5 });
            await listview.ready;

            const items = queryListViewItems(listview);
            expect(items.length).toBe(5);

            try {
                listview.removeItem(50);
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e.message).toBe('listview given a invalid param. [removeItem(), invalid index: 50]');
            }

            expect(items.length).toBe(5);

            try {
                listview.removeItem([50]);
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e.message).toBe('listview given a invalid param. [removeItem(), invalid index: 50]');
            }

            expect(items.length).toBe(5);

            const context = listview.context as TestListViewContext;
            context.addItem(100, TestListItemView, { devId: 'dummy' });
            expect(items.length).toBe(6);
            listview.removeItem(5);
            expect(items.length).toBe(5);

            context.addItem(100, TestListItemView, { devId: 'dummy' });
            expect(items.length).toBe(6);
            listview.removeItem([5]);
            expect(items.length).toBe(5);
        });

        it('check ListView#removeItem advanced 2', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestListView({ el: $el[0], itemNum: 100 });
            await listview.ready;

            const items = queryListViewItems(listview);
            expect(items.length).toBe(100);

            await listview.ensureVisible(99);
            listview.removeItem([9, 99, 19, 89, 29, 79, 39, 69, 49, 59], 20);
            await sleep(100);
            expect(items.length).toBe(90);
        });

        it('check ListView IListOperation etc', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestListView({ el: $el[0], itemNum: 1 });
            await listview.ready;

            const info = listview.getItemInfo(0) as { devId: string; };
            expect(info.devId).toBe('test:0000');

            try {
                listview.refresh();
            } catch  {
                fail('UNEXPECTED FLOW');
            }

            try {
                listview.rebuild();
            } catch  {
                fail('UNEXPECTED FLOW');
            }
        });
    });

    describe('ListView IListScrollable spec', () => {
        it('check ListView scroll props', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestListView({ el: $el[0], itemNum: 10 });
            await listview.ready;

            expect(listview.scrollPos).toBe(0);
            expect(listview.scrollPosMax).toBe(900);

            const context = listview.context as TestListViewContext;
            expect(context.scrollerType).toBe('cdp:element-overflow-scroller');
        });

        it('check ListView scroll basic', async () => {
            let scrollCount = 0;
            const onScollHandler = (...args: any[]): void => {
                scrollCount++;
                console.log(`received: ${JSON.stringify([...args])} \n`);
            };
            let scrollStopCount = 0;
            const onScollStopHandler = (...args: any[]): void => {
                scrollStopCount++;
                console.log(`received: ${JSON.stringify([...args])} \n`);
            };

            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestListView({ el: $el[0], itemNum: 10 });
            await listview.ready;

            listview.setScrollHandler(onScollHandler, 'on');
            listview.setScrollStopHandler(onScollStopHandler, 'on');

            await listview.scrollTo(600);
            await sleep(100);
            expect(scrollCount).toBe(1);
            expect(scrollStopCount).toBe(1);

            listview.setScrollHandler(onScollHandler, 'off');
            listview.setScrollStopHandler(onScollStopHandler, 'off');

            await listview.scrollTo(600);
            await sleep(100);
            expect(scrollCount).toBe(1);
            expect(scrollStopCount).toBe(1);

            await listview.scrollTo(200, true, 100);
            await listview.scrollTo(100, false);
            expect(listview.scrollPos).toBe(100);
        });

        it('check ListView scroll w/ enableHiddenPage=true', async () => {
            let scrollCount = 0;
            const onScollHandler = (...args: any[]): void => {
                scrollCount++;
                console.log(`received: ${JSON.stringify([...args])} \n`);
            };
            let scrollStopCount = 0;
            const onScollStopHandler = (...args: any[]): void => {
                scrollStopCount++;
                console.log(`received: ${JSON.stringify([...args])} \n`);
            };

            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestListView({ el: $el[0], itemNum: 10, enableHiddenPage: true });
            await listview.ready;

            listview.setScrollHandler(onScollHandler, 'on');
            listview.setScrollStopHandler(onScollStopHandler, 'on');

            await listview.scrollTo(600);
            await sleep(300);
            expect(scrollCount).toBe(2); // hidden 要素 には scroll イベントが飛んでくる
            expect(scrollStopCount).toBe(1);

            listview.setScrollHandler(onScollHandler, 'off');
            listview.setScrollStopHandler(onScollStopHandler, 'off');

            await listview.scrollTo(600);
            await sleep(100);
            expect(scrollCount).toBe(2);
            expect(scrollStopCount).toBe(1);

            await listview.scrollTo(200, true, 100);
            await listview.scrollTo(100, false);
            expect(listview.scrollPos).toBe(100);
        });

        it('check ListView scroll [enableAnimation: false]', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestListView({ el: $el[0], itemNum: 10, enableAnimation: false });
            await listview.ready;

            await listview.scrollTo(600);
            expect(listview.scrollPos).toBe(600);
            await listview.scrollTo(200, true, 100);
            expect(listview.scrollPos).toBe(200);
            await listview.scrollTo(100, false);
            expect(listview.scrollPos).toBe(100);
        });

        it('check ListView ensureVisible', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(300);

            const listview = new TestListView({ el: $el[0], itemNum: 100 });
            await listview.ready;
            expect(listview.scrollPosMax).toBe(9700);

            await listview.ensureVisible(70);
            expect(listview.scrollPos).toBe(6900);

            await listview.ensureVisible(45, { setTop: true });
            expect(listview.scrollPos).toBe(4500);

            await listview.ensureVisible(70, { partialOK: false });
            expect(listview.scrollPos).toBe(6900);

            await listview.ensureVisible(71, { partialOK: true });
            expect(listview.scrollPos).toBe(6900);

            await listview.ensureVisible(65, { partialOK: false });
            expect(listview.scrollPos).toBe(6500);
            await listview.ensureVisible(65, { partialOK: true });
            expect(listview.scrollPos).toBe(6500);

            try {
                await listview.ensureVisible(100);
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e.message).toBe('listview given a invalid param. ensureVisible() [invalid index: 100]');
            }
        });

        it('check ListView scroll duration ajustment', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestListView({ el: $el[0], itemNum: 100 });
            await listview.ready;

            const promise = listview.scrollTo(7777, true, 300);
            void listview.scrollTo(200, false);
            await promise;
            expect(listview.scrollPos).toBe(7777);
        });
    });

    describe('ListView IListBackupRestore spec', () => {
        it('check basic', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestListView({ el: $el[0], itemNum: 5 });
            await listview.ready;

            // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
            type BackupDataSchema = { items: ItemProfile[]; };

            let backupData = listview.getBackupData('portlate');
            expect(backupData).toBeUndefined();

            let ret = listview.backup('portlate');
            expect(ret).toBe(true);
            backupData = listview.getBackupData('portlate');
            expect(backupData).toBeDefined();

            const { items } = backupData as BackupDataSchema;
            expect(items.length).toBe(5);

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
            const item3 = setup.items[2];

            ret = listview.clearBackup();
            expect(ret).toBe(true);
            backupData = listview.getBackupData('portlate');
            expect(backupData).not.toBeDefined();
            backupData = listview.getBackupData('landscape');
            expect(backupData).not.toBeDefined();

            ret = listview.setBackupData('set', setup as UnknownObject);
            expect(ret).toBe(true);

            const setData = listview.getBackupData('set') as BackupDataSchema;
            expect(setData.items[2]).toBe(item3);

            ret = listview.setBackupData('set', {});
            expect(ret).toBe(false);
        });
    });

    describe('ListItemView spec', () => {
        it('check ListItemView stuff', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(100);

            const listview = new TestListView({ el: $el[0], itemNum: 1 });
            await listview.ready;
            listview.backup('test');
            const items = queryListViewItems(listview);

            const itemview = new TestListItemView({ item: items[0], owner: listview, devId: 'dummy' });
            expect(itemview).toBeDefined();
            expect(itemview.owner).toBe(listview);
            expect(itemview.height).toBe(100);

            itemview.updateHeight(50, { reflectAll: true });
            expect(itemview.height).toBe(50);
            itemview.updateHeight(50);
            expect(itemview.height).toBe(50);
            listview.remove();
        });
    });
});
