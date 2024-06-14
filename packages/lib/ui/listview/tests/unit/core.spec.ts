import {
    luid,
    sleep,
    type DOM,
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

describe('ui-listview/core spec', () => {
    afterEach(() => {
        cleanupTestElements();
    });

    interface ListViewInternalMethod {
        destroy(): void;
    }

    describe('ListView internal context spec', () => {
        interface ListViewInternalMethod {
            initialize($root: DOM, height: number): void;
            setActiveState(active: boolean): Promise<void>;
            readonly active: boolean;
        }

        it('initialize', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(300);

            const listview = new TestListView({ el: $el[0], itemNum: 100, initialHeight: 200 });
            await listview.ready;

            let items = queryListViewItems(listview);
            expect(items.length).toBe(100);

            const context = listview.context as TestListViewContext & ListViewInternalMethod;
            context.initialize($el, 100);
            items = queryListViewItems(listview);
            expect(items.length).toBe(0);
        });

        it('setActiveState', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(300);

            const listview = new TestListView({ el: $el[0], itemNum: 100 });
            await listview.ready;

            await listview.scrollTo(600);
            expect(listview.scrollPos).toBe(600);

            const context = listview.context as TestListViewContext & ListViewInternalMethod;
            await context.setActiveState(true);
            expect(context.active).toBe(true);

            await context.setActiveState(false);
            expect(context.active).toBe(false);
        });

        it('setActiveState w/ useDummyInactiveScrollMap', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(300);

            const listview = new TestListView({ el: $el[0], itemNum: 100, useDummyInactiveScrollMap: true, pagePreloadCount: 2 });
            await listview.ready;

            await listview.scrollTo(3000);
            expect(listview.scrollPos).toBe(3000);

            interface ListViewInternalMethod {
                initialize($root: DOM, height: number): void;
                destroy(): void;
                setBaseHeight(height: number): void;
                setActiveState(active: boolean): Promise<void>;
                readonly active: boolean;
            }

            const context = listview.context as TestListViewContext & ListViewInternalMethod;
            await context.setActiveState(true);
            expect(context.active).toBe(true);

            void context.setActiveState(false);
            await context.setActiveState(false);
            expect(context.active).toBe(false);
        });

        it('getPageIndex', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(300);

            const listview = new TestListView({ el: $el[0], itemNum: 1 });
            await listview.ready;
            const context = listview.context as TestListViewContext & ListViewInternalMethod;

            context.addItem(100, TestListItemView, { devId: luid('test:', 4) }, 0);
            context.refresh();
            const items = queryListViewItems(listview);
            expect(items.length).toBe(2);
        });

        it('getPageIndex inside', async () => {
            interface ListViewInternalMethod {
                getPageIndex(): number;
                readonly _pages: { _index: number; _offset: number; _height: number; }[];
            }

            prepareTestElements();
            const $el = $('#d1');
            $el.height(300);

            const listview = new TestListView({ el: $el[0], itemNum: 15 });
            await listview.ready;
            const context = listview.context as TestListViewContext & ListViewInternalMethod;
            const { _pages } = context;
            /*
              [
                { _index: 0, _offset: 0,    _height: 300 }
                { _index: 1, _offset: 300,  _height: 300 }
                { _index: 2, _offset: 600,  _height: 300 }
                { _index: 3, _offset: 900,  _height: 300 }
                { _index: 4, _offset: 1200, _height: 300 }
                { _index: 5, _offset: 1500, _height: 300 }
              ]
             */
            expect(_pages.length).toBe(6);

            // to _index: 2
            await listview.scrollTo(450);
            await sleep(100);

            // hack:
            _pages[0]._offset = 600;
            _pages[2]._offset = 751;
            expect(context.getPageIndex()).toBe(0);

            // hack:
            _pages[2]._offset = NaN;
            _pages[4]._offset = 600;
            expect(context.getPageIndex()).toBe(4);
        });
    });

    describe('ListView IListContext spec', () => {
        it('scrollMapHeight', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(300);

            const listview = new TestListView({ el: $el[0], itemNum: 5, itemHeight: 100 });
            await listview.ready;

            const context = listview.context as TestListViewContext & ListViewInternalMethod;
            let height = context.scrollMapHeight;
            expect(height).toBe(500);

            context.updateScrollMapHeight(30);
            height = context.scrollMapHeight;
            expect(height).toBe(530);

            context.updateScrollMapHeight(-540);
            height = context.scrollMapHeight;
            expect(height).toBe(0);

            context.destroy();
            height = context.scrollMapHeight;
            expect(height).toBe(0);

            context.updateScrollMapHeight(30);
            height = context.scrollMapHeight;
            expect(height).toBe(0);
        });
    });

    describe('ListView IListView spec', () => {
        it('getItemInfo w/ index', async () => {
            prepareTestElements();
            const $el = $('#d1');
            $el.height(300);

            const listview = new TestListView({ el: $el[0], itemNum: 0 });
            await listview.ready;
            const context = listview.context as TestListViewContext;

            const devId = luid('test:', 4);
            context.addItem(100, TestListItemView, { devId });
            context.refresh();

            const { devId: id0 } = context.getItemInfo(0);
            expect(id0).toBe(devId);

            try {
                context.getItemInfo(1);
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e.message).toBe('listview given a invalid param. getItemInfo() [invalid index: 1]');
            }
        });

        it('getItemInfo w/ event', async () => {
            prepareTestElements($.utils.elementify(`
                <div id="d0" class="test-dom" style="visibility: hidden;">
                    <div class="cdp-ui-listview-scroll-map"></div>
                </div>
                <div id="d1" class="test-dom" style="visibility: hidden;">
                    <div class="receiver cdp-ui-listview-item-base" data-item-index="0"></div>
                </div>
                <div id="d2" class="test-dom" style="visibility: hidden;">
                    <div class="receiver"></div>
                </div>
            `));

            const $el = $('#d0');
            $el.height(300);

            const makeEvent = ($target: DOM): Promise<UIEvent> => {
                return new Promise<UIEvent>(resovle => {
                    $target.once('click', ev => resovle(ev as UIEvent));
                    $target.trigger(new CustomEvent('click', { bubbles: true, cancelable: true }));
                });
            };

            const listview = new TestListView({ el: $el[0], itemNum: 0 });
            await listview.ready;
            const context = listview.context as TestListViewContext;

            const devId = luid('test:', 4);
            context.addItem(100, TestListItemView, { devId });
            context.refresh();

            const $receiver1 = $('#d1').find('.receiver');
            const ev1 = await makeEvent($receiver1);
            expect(ev1.target).toBe($receiver1[0]);

            const { devId: id1 } = context.getItemInfo(ev1);
            expect(id1).toBe(devId);

            const $receiver2 = $('#d2').find('.receiver');
            const ev2 = await makeEvent($receiver2);
            expect(ev2.target).toBe($receiver2[0]);

            try {
                context.getItemInfo(ev2);
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e.message).toBe('listview given a invalid param. [unsupported type: object]');
            }
        });
    });

    describe('ListView IListScrollable spec', () => {
        interface ListViewInternalMethod {
            initialize($root: DOM, height: number): void;
            destroy(): void;
            setActiveState(active: boolean): Promise<void>;
            readonly active: boolean;
        }

        it('invalid scroller state operation', async () => {
            prepareTestElements();
            const $el = $('#d1');

            let listview = new TestListView({ el: $el[0], itemNum: 0, initialHeight: 100 });
            await listview.ready;
            let context = listview.context as TestListViewContext & ListViewInternalMethod;
            context.destroy();

            expect(context.scrollPos).toBe(0);
            expect(context.scrollPosMax).toBe(0);

            try {
                await context.scrollTo(20);
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e.message).toBe('listview has invalid initialization.');
            }

            $el.height(100);
            listview = new TestListView({ el: $el[0], itemNum: 5 });
            await listview.ready;
            context = listview.context as TestListViewContext & ListViewInternalMethod;

            await context.scrollTo(50);
            expect(context.scrollPos).toBe(50);
            expect(context.scrollPosMax).toBe(400);

            await context.scrollTo(-10);
            expect(context.scrollPos).toBe(0);
            await context.scrollTo(410);
            expect(context.scrollPos).toBe(400);
        });
    });
});
